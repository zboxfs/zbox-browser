import MsgTypes from "./message";
import { isString, isArrayBufferView, str2ab } from "./utils";

// global context
const ctx = {
  resolver: null,
  worker: null
};

class Base {
  constructor(scope) {
    this.scope = scope;
  }

  // bind message resolver and post message to worker
  _bindMsg(msgType, object, params) {
    const self = this;

    const msg = {
      scope: self.scope,
      type: msgType,
      object, params
    };

    // deal with array buffer transfer
    let hasArrayBuf = false;
    if (msgType === 'read') {
      if (!isArrayBufferView(params)) {
        return Promise.reject('Wrong argument, Uint8Array required');
      }
      msg.params = params.buffer;
      hasArrayBuf = true;
    }
    if (msgType === 'write' || msgType === 'writeOnce') {
      if (isArrayBufferView(params)) {
        msg.params = params.buffer;
      } else if (isString(params)) {
        msg.params = str2ab(params);
      } else {
        return Promise.reject('Wrong argument, Uint8Array or String required');
      }
      hasArrayBuf = true;
    }

    return new Promise((resolve, reject) => {
      ctx.resolver.add(self.scope, msgType, resolve, reject);
      if (hasArrayBuf) {
        ctx.worker.postMessage(msg, [msg.params]);
      } else {
        ctx.worker.postMessage(msg);
      }
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
          case msgTypes.openRepo:
            result = new Repo();
            break;
        }
        break;
      }

      case 'repo': {
        switch (msg.type) {
          case msgTypes.openFile:
          case msgTypes.createFile:
            result = new File(result);
            break;
        }
        break;
      }

      case 'file': {
        switch (msg.type) {
          case msgTypes.read:
            result.data = new Uint8Array(result.data, 0, result.read);
            break;

          case msgTypes.readAll:
            result = new Uint8Array(result);
            break;

          case msgTypes.versionReader:
            result = new VersionReader(result);
            break;
        }
        break;
      }

      case 'versionReader': {
        switch (msg.type) {
          case msgTypes.read:
            result.data = new Uint8Array(result.data, 0, result.read);
            break;

          case msgTypes.readAll:
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

export const SeekFrom = {
  START: 0,
  END: 1,
  CURRENT: 2
};

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
    ctx.worker.onerror = ctx.worker.onmessage;

    // add methods based on message types
    Object.keys(MsgTypes[this.scope]).forEach(msgType => {
      Zbox.prototype[msgType] = this._bindMsg.bind(this, msgType, null);
    });
  }

  exit() {
    if (ctx.worker) {
      ctx.worker.terminate();
      ctx.worker = null;
    }
  }
}
