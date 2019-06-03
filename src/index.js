import MsgTypes from "./message";
import { isObject, isNumber, isString, isArrayBufferView, str2ab } from "./utils";

// global context
const ctx = {
  resolver: null,
  worker: null
};

function getParamsType(params) {
  if (isString(params)) {
    return 'string';
  } else if (isNumber(params)) {
    return 'number';
  } else if (isArrayBufferView(params)) {
    return 'buffer';
  } else if (params instanceof ArrayBuffer) {
    return 'buffer';
  } else if (isObject(params)) {
    return 'object';
  } else if (params === undefined) {
    return 'undefined'
  }
  return 'other';
}

class Base {
  constructor(scope) {
    this.scope = scope;
  }

  // bind message resolver and post message to worker
  _bindMsg(msgType, object, params) {
    const msg = {
      scope: this.scope,
      type: msgType,
      object,
      params
    };

    // check parameters type
    const paramsType = getParamsType(params);
    const arg = MsgTypes[this.scope][msgType].arg;
    const argIsOptional = MsgTypes[this.scope][msgType].optional;
    const decl = arg.find(arg => {
      const argType = isObject(arg) ? 'object' : arg;
      return paramsType === argType;
    });
    if (decl === undefined && arg.length > 0 && !argIsOptional) {
      return Promise.reject(new Error('Wrong argument'));
    }

    // check required keys if params is object
    if (paramsType === 'object' && isObject(decl)) {
      const notMatched = Object.keys(decl).some(key => {
        const required = !decl[key].optional;
        return required && !params.hasOwnProperty(key);
      });
      if (notMatched) {
        return Promise.reject(new Error('Wrong argument'));
      }
    }

    // deal with array buffer transfer
    let transBuf = undefined;
    if (msgType === 'read' || msgType === 'write' || msgType === 'writeOnce') {
      let buf = params.buffer || params;

      if (paramsType === 'string') {
        buf = str2ab(params);
      }

      msg.params = {
        buf,
        offset: params.byteOffset || 0,
        len: params.byteLength
      };

      transBuf = [buf];
    }

    const self = this;

    return new Promise((resolve, reject) => {
      ctx.resolver.add(self.scope, msgType, resolve, reject);
      ctx.worker.postMessage(msg, transBuf);
    });
  }
}

class Repo extends Base {
  constructor() {
    super('repo');

    // add methods based on message types
    Object.keys(MsgTypes[this.scope]).forEach(msgType => {
      Repo.prototype[msgType] = this._bindMsg.bind(this, msgType, null);
    });
  }
}

class File extends Base {
  constructor(fd) {
    super('file');
    this.fd = fd;

    // add methods based on message types
    Object.keys(MsgTypes[this.scope]).forEach(msgType => {
      File.prototype[msgType] = this._bindMsg.bind(this, msgType, this.fd);
    });
  }
}

class VersionReader extends Base {
  constructor(vrdr) {
    super('versionReader');
    this.vrdr = vrdr;

    // add methods based on message types
    Object.keys(MsgTypes[this.scope]).forEach(msgType => {
      VersionReader.prototype[msgType] = this._bindMsg.bind(this, msgType, this.vrdr);
    });
  }
}

class Resolver {
  constructor() {
    this.map = Object.keys(MsgTypes).reduce((accum, curr) => {
      accum[curr] = Object.keys(MsgTypes[curr]).reduce((a, c) => {
        a[c] = { resolve: null, reject: null };
        return a;
      }, {});
      return accum;
    }, {});
  }

  add(scope, msgType, resolve, reject) {
    this.map[scope][msgType] = { resolve, reject };
  }

  resolve(event) {
    const msg = event.data;
    //console.log(`worker -> main: ${JSON.stringify(msg)}`);

    if (msg.error) {
      const err = new Error(msg.error);
      this.map[msg.scope][msg.type].reject(err);
      return;
    }

    const msgTypes = MsgTypes[msg.scope];
    let result = msg.result;

    switch (msg.scope) {
      case 'zbox': {
        switch (msg.type) {
          case msgTypes.openRepo.name:
            result = new Repo();
            break;
        }
        break;
      }

      case 'repo': {
        switch (msg.type) {
          case msgTypes.openFile.name:
          case msgTypes.createFile.name:
            result = new File(result);
            break;
        }
        break;
      }

      case 'file': {
        switch (msg.type) {
          case msgTypes.read.name:
            result = new Uint8Array(result.buf, result.offset, result.len);
            break;

          case msgTypes.readAll.name:
            result = new Uint8Array(result);
            break;

          case msgTypes.versionReader.name:
            result = new VersionReader(result);
            break;
        }
        break;
      }

      case 'versionReader': {
        switch (msg.type) {
          case msgTypes.read.name:
            result = new Uint8Array(result.buf, result.offset, result.len);
            break;

          case msgTypes.readAll.name:
            result = new Uint8Array(result);
            break;
        }
        break;
      }
    }

    this.map[msg.scope][msg.type].resolve(result);
  }
}

// get worker script path
const workerPath = document.currentScript.src.replace(/index.js$/, 'worker.js');

// detect WebAssembly support
const wasmSupported = (() => {
  try {
    if (typeof WebAssembly === "object"
      && typeof WebAssembly.instantiate === "function")
    {
      const module = new WebAssembly.Module(Uint8Array.of(
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00
      ));
      if (module instanceof WebAssembly.Module)
        return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
    }
  } catch (e) {
  }
  return false;
})();

export class Zbox extends Base {
  constructor() {
    super('zbox');

    // check browser support
    if (!wasmSupported) {
      throw "Your browser doesn't support WebAssembly";
    }
    if (!window.Worker) {
      throw "Your browser doesn't support Worker";
    }
    if (!window.indexedDB) {
      throw "Your browser doesn't support IndexedDB";
    }

    // initialise global context objects
    ctx.resolver = new Resolver();
    ctx.worker = new Worker(workerPath, { name: 'ZboxWorker' });
    ctx.worker.onmessage = ctx.resolver.resolve.bind(ctx.resolver);
    ctx.worker.onerror = (err) => {
      console.error(`zbox worker error: ${JSON.stringify(err)}`);
    };

    // add methods based on message types
    Object.keys(MsgTypes[this.scope]).forEach(msgType => {
      Zbox.prototype[msgType] = this._bindMsg.bind(this, msgType, null);
    });
  }

  static get SeekFrom() {
    return {
      Start: 0,
      End: 1,
      Current: 2
    };
  }

  exit() {
    if (ctx.worker) {
      ctx.worker.terminate();
      ctx.worker = null;
    }
    return Promise.resolve();
  }
}
