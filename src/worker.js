import MsgTypes from "./message.js";
import { logger } from './logger';
import { cacheBackend } from './cache_backend';

// global zbox and repo object
let zbox = null;
let repo = null;

// opened objects
// key: ptr integer number
// value: opened object
let opened = {
  files: {},      // files
  vrdrs: {}       // version readers
};

// add wasm cache type paramter to uri
function appendCacheTypeToUri(uri) {
  const cacheType = 'cache_type=browser';
  if (uri.includes('cache_size')) {
    uri += '&' + cacheType;
  } else if (!uri.includes('?')) {
    uri += '?' + cacheType;
  }
  return uri;
}

// ensure one parameter is string
function ensureStr(s) {
  if (typeof s !== 'string') {
    throw 'Wrong argument';
  }
}

// ensure two parameters are string
function ensureStr2(s, s2) {
  if (typeof s !== 'string' || typeof s2 !== 'string') {
    throw 'Wrong argument';
  }
}

function zboxMsgHandler(msg, msgTypes) {
  switch (msg.type) {
    case msgTypes.initEnv: {
      let debugOn = msg.params ? msg.params.debug : false;
      logger.enable(debugOn);
      import('./wasm/zbox')
        .then(wasm => {
          zbox = wasm;
          zbox.init_env(debugOn);
        })
        .catch(err => msg.error =  err)
        .finally(() => postMessage(msg));
      break;
    }

    case msgTypes.exists: {
      zbox.Repo.exists(appendCacheTypeToUri(msg.params.uri));
      postMessage(msg);
      break;
    }

    case msgTypes.openRepo: {
      // load local cache backend and then open repo
      cacheBackend.open()
        .then(() => {
          // create and config opener
          let opener = new zbox.RepoOpener();
          let opts = msg.params.opts || {};

          if (opts.hasOwnProperty('create'))
            opener.create(opts.create);
          if (opts.hasOwnProperty('createNew'))
            opener.createNew(opts.createNew);
          if (opts.hasOwnProperty('compress'))
            opener.compress(opts.compress);
          if (opts.hasOwnProperty('versionLimit'))
            opener.versionLimit(opts.versionLimit);
          if (opts.hasOwnProperty('dedupChunk'))
            opener.dedupChunk(opts.dedupChunk);
          if (opts.hasOwnProperty('readOnly'))
            opener.readOnly(opts.readOnly);

          let uri = appendCacheTypeToUri(msg.params.uri);

          // open zbox
          repo = opener.open(uri, msg.params.pwd);
        })
        .catch(err => {
          msg.error = err.toString();
          cacheBackend.immediateClose();
        })
        .finally(() => postMessage(msg));

      break;
    }

    case msgTypes.repairSuperBlock: {
      ensureStr2(msg.params.uri, msg.params.pwd);
      zbox.Repo.repairSuperBlock(appendCacheTypeToUri(msg.params.uri),
          msg.params.pwd);
      postMessage(msg);
      break;
    }
  }
}

function repoMsgHandler(msg, msgTypes) {
  switch (msg.type) {
    case msgTypes.close: {
      let cnt = Object.keys(opened.files).length;
      if (cnt > 0) { logger.warn(`${cnt} file(s) still opened`); }
      cnt = Object.keys(opened.vrdrs).length;
      if (cnt > 0) {
        logger.warn(`${cnt} version reader(s) still opened`);
      }
      repo.close();
      cacheBackend.close()
        .catch(err => msg.error = err)
        .finally(() => postMessage(msg));
      return;
    }

    case msgTypes.info: {
      msg.result = repo.info();
      break;
    }

    case msgTypes.resetPassword: {
      ensureStr2(msg.params.oldPwd, msg.params.newPwd);
      repo.resetPassword(msg.params.oldPwd, msg.params.newPwd);
      break;
    }

    case msgTypes.pathExists: {
      ensureStr(msg.params);
      msg.result = repo.pathExists(msg.params);
      break;
    }

    case msgTypes.isFile: {
      ensureStr(msg.params);
      msg.result = repo.isFile(msg.params);
      break;
    }

    case msgTypes.isDir: {
      ensureStr(msg.params);
      msg.result = repo.isDir(msg.params);
      break;
    }

    case msgTypes.createFile: {
      ensureStr(msg.params);
      let file = repo.createFile(msg.params);
      opened.files[file.ptr] = file;
      msg.result = file.ptr;
      break;
    }

    case msgTypes.openFile: {
      let file;

      if (typeof msg.params === 'string') {
        file = repo.openFile(msg.params);
      } else if (typeof msg.params === 'object') {
        let opener = new zbox.OpenOptions();
        let opts = msg.params.opts || {};
        if (opts.hasOwnProperty('read')) opener.read(opts.read);
        if (opts.hasOwnProperty('write')) opener.write(opts.write);
        if (opts.hasOwnProperty('append')) opener.append(opts.append);
        if (opts.hasOwnProperty('truncate')) opener.truncate(opts.truncate);
        if (opts.hasOwnProperty('create')) opener.create(opts.create);
        if (opts.hasOwnProperty('createNew')) opener.createNew(opts.createNew);
        if (opts.hasOwnProperty('versionLimit')) opener.versionLimit(opts.versionLimit);
        if (opts.hasOwnProperty('dedupChunk')) opener.dedupChunk(opts.dedupChunk);
        file = opener.open(repo, msg.params.path);
      } else {
        throw 'Wrong argument';
      }

      opened.files[file.ptr] = file;
      msg.result = file.ptr;

      break;
    }

    case msgTypes.createDir: {
      ensureStr(msg.params);
      repo.createDir(msg.params);
      break;
    }

    case msgTypes.createDirAll: {
      ensureStr(msg.params);
      repo.createDirAll(msg.params);
      break;
    }

    case msgTypes.readDir: {
      ensureStr(msg.params);
      msg.result = repo.readDir(msg.params);
      break;
    }

    case msgTypes.metadata: {
      ensureStr(msg.params);
      msg.result = repo.metadata(msg.params);
      break;
    }

    case msgTypes.history: {
      ensureStr(msg.params);
      msg.result = repo.history(msg.params);
      break;
    }

    case msgTypes.copy: {
      ensureStr2(msg.params.from, msg.params.to);
      repo.copy(msg.params.from, msg.params.to);
      break;
    }

    case msgTypes.removeFile: {
      ensureStr(msg.params);
      repo.removeFile(msg.params);
      break;
    }

    case msgTypes.removeDir: {
      ensureStr(msg.params);
      repo.removeDir(msg.params);
      break;
    }

    case msgTypes.removeDirAll: {
      ensureStr(msg.params);
      repo.removeDirAll(msg.params);
      break;
    }

    case msgTypes.rename: {
      ensureStr2(msg.params.from, msg.params.to);
      repo.rename(msg.params.from, msg.params.to);
      break;
    }
  }

  // send message back to main thread
  postMessage(msg);
}

function fileMsgHandler(msg, msgTypes) {
  let file = opened.files[msg.object];

  if (file === undefined) {
    throw 'File is closed';
  }

  // data bytes transfer buffer
  let transBuf = null;

  switch (msg.type) {
    case msgTypes.close: {
      file.close();
      delete opened.files[msg.object];
      break;
    }

    case msgTypes.read: {
      let dst = new Uint8Array(msg.params);
      const read = file.read(dst);
      msg.result = { read, data: dst.buffer };
      transBuf = [dst.buffer];
      break;
    }

    case msgTypes.readAll: {
      let dst = file.readAll();
      msg.result = dst.buffer;
      transBuf = [dst.buffer];
      break;
    }

    case msgTypes.write: {
      const buf = new Uint8Array(msg.params);
      msg.result = file.write(buf);
      break;
    }

    case msgTypes.finish: {
      file.finish();
      break;
    }

    case msgTypes.writeOnce: {
      msg.result = file.writeOnce(msg.params);
      break;
    }

    case msgTypes.seek: {
      msg.result = file.seek(msg.params.from, msg.params.offset);
      break;
    }

    case msgTypes.setLen: {
      file.setLen(msg.params);
      break;
    }

    case msgTypes.currVersion: {
      msg.result = file.currVersion();
      break;
    }

    case msgTypes.versionReader: {
      const vrdr = file.versionReader(msg.params);
      opened.vrdrs[vrdr.ptr] = vrdr;
      msg.result = vrdr.ptr;
      break;
    }

    case msgTypes.metadata: {
      msg.result = file.metadata();
      break;
    }

    case msgTypes.history: {
      msg.result = file.history();
      break;
    }
  }

  // send message back to main thread
  if (transBuf) {
    postMessage(msg, transBuf);
  } else {
    postMessage(msg);
  }
}

function versionReaderMsgHandler(msg, msgTypes) {
  let vrdr = opened.vrdrs[msg.object];

  if (vrdr == undefined) {
    throw 'Version reader is closed';
  }

  // data bytes transfer buffer
  let transBuf = null;

  switch (msg.type) {
    case msgTypes.close: {
      vrdr.close();
      delete opened.vrdrs[msg.object];
      break;
    }

    case msgTypes.read: {
      let dst = new Uint8Array(msg.params);
      const read = vrdr.read(dst);
      msg.result = { read, data: dst.buffer };
      transBuf = [dst.buffer];
      break;
    }

    case msgTypes.readAll: {
      let dst = vrdr.readAll();
      msg.result = dst.buffer;
      transBuf = [dst.buffer];
      break;
    }

    case msgTypes.seek: {
      msg.result = vrdr.seek(msg.params.from, msg.params.offset);
      break;
    }
  }

  // send message back to main thread
  if (transBuf) {
    postMessage(msg, transBuf);
  } else {
    postMessage(msg);
  }
}

onmessage = function(event) {
  let msg = event.data;
  console.log(`main -> worker: ${JSON.stringify(msg)}`);

  // reset message result and error
  msg.result = null;
  msg.error = null;

  // dispatch message
  const msgTypes = MsgTypes[msg.scope];
  try {
    switch (msg.scope) {
      case 'zbox': {
        zboxMsgHandler(msg, msgTypes);
        break;
      }

      case 'repo': {
        repoMsgHandler(msg, msgTypes);
        break;
      }

      case 'file': {
        fileMsgHandler(msg, msgTypes);
        break;
      }

      case 'versionReader': {
        versionReaderMsgHandler(msg, msgTypes);
        break;
      }
    }
  } catch (err) {
    msg.error = err;
    postMessage(msg);
  }
};
