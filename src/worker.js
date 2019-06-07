import MsgTypes from "./message";
import { logger } from './logger';
import { cacheBackend } from './cache_backend';
import {
  isString,
  isObject,
  ensureStr,
  ensureStr2,
  ensureInt,
  ensureIntOrNeg,
  ab2str
} from "./utils";

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

// parse repo id in uri
function parseRepoIdInUri(uri) {
  const search = /^zbox:\/\/\w+@(\w+)/.exec(uri);
  if (!search) {
    throw 'Invalid Uri';
  }
  const repoId = search[1];
  return repoId;
}

// parse cache type in uri
function parseCacheType(uri) {
  const search = /^zbox:\/\/\w+@\w+\?.*cache_type=(\w+).*/.exec(uri);
  return search ? search[1] : undefined;
}

function zboxMsgHandler(msg, msgTypes) {
  switch (msg.type) {
    case msgTypes.initEnv.name: {
      let level = logger.setLevel(msg.params ? msg.params.logLevel : 'warn');
      import('./wasm/zbox')
        .then(wasm => {
          zbox = wasm;
          zbox.init_env(level);
        })
        .catch(err => {
          logger.error(`Load ZboxFS wasm failed: ${err}`);
          msg.error =  err;
        })
        .finally(() => postMessage(msg));
      return;
    }

    case msgTypes.version.name: {
      msg.result = zbox.zbox_version();
      postMessage(msg);
      break;
    }

    case msgTypes.exists.name: {
      ensureStr(msg.params);
      msg.result = zbox.Repo.exists(msg.params);
      postMessage(msg);
      return;
    }

    case msgTypes.openRepo.name: {
      ensureStr2(msg.params.uri, msg.params.pwd);

      // find repo id in uri
      const repoId = parseRepoIdInUri(msg.params.uri);

      // load local cache backend and then open repo
      let loadCache;
      if (parseCacheType(msg.params.uri) === 'mem') {
        // no need to load cache for memory backend
        loadCache = Promise.resolve();
      } else {
        loadCache = cacheBackend.open(repoId);
      }
      loadCache
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

          // open zbox
          repo = opener.open(msg.params.uri, msg.params.pwd);
        })
        .catch(err => {
          msg.error = err.toString();
          cacheBackend.immediateClose();
        })
        .finally(() => postMessage(msg));

      return;
    }

    case msgTypes.repairSuperBlock.name: {
      ensureStr2(msg.params.uri, msg.params.pwd);
      zbox.Repo.repairSuperBlock(msg.params.uri,
          msg.params.pwd);
      postMessage(msg);
      return;
    }
  }
}

function repoMsgHandler(msg, msgTypes) {
  switch (msg.type) {
    case msgTypes.close.name: {
      let cnt = Object.keys(opened.files).length;
      if (cnt > 0) {
        logger.warn(`${cnt} file(s) still opened when close repo`);
      }
      cnt = Object.keys(opened.vrdrs).length;
      if (cnt > 0) {
        logger.warn(`${cnt} version reader(s) still opened when close repo`);
      }
      repo.close();
      cacheBackend.close()
        .catch(err => msg.error = err)
        .finally(() => postMessage(msg));
      return;
    }

    case msgTypes.info.name: {
      msg.result = repo.info();
      break;
    }

    case msgTypes.resetPassword.name: {
      ensureStr2(msg.params.oldPwd, msg.params.newPwd);
      repo.resetPassword(msg.params.oldPwd, msg.params.newPwd);
      break;
    }

    case msgTypes.pathExists.name: {
      ensureStr(msg.params);
      msg.result = repo.pathExists(msg.params);
      break;
    }

    case msgTypes.isFile.name: {
      ensureStr(msg.params);
      msg.result = repo.isFile(msg.params);
      break;
    }

    case msgTypes.isDir.name: {
      ensureStr(msg.params);
      msg.result = repo.isDir(msg.params);
      break;
    }

    case msgTypes.createFile.name: {
      ensureStr(msg.params);
      let file = repo.createFile(msg.params);
      opened.files[file.ptr] = file;
      msg.result = file.ptr;
      break;
    }

    case msgTypes.openFile.name: {
      let file;

      if (isString(msg.params)) {
        file = repo.openFile(msg.params);

      } else if (isObject(msg.params)) {
        ensureStr(msg.params.path);

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
        throw 'Wrong argument, string or Object required';
      }

      opened.files[file.ptr] = file;
      msg.result = file.ptr;

      break;
    }

    case msgTypes.createDir.name: {
      ensureStr(msg.params);
      repo.createDir(msg.params);
      break;
    }

    case msgTypes.createDirAll.name: {
      ensureStr(msg.params);
      repo.createDirAll(msg.params);
      break;
    }

    case msgTypes.readDir.name: {
      ensureStr(msg.params);
      msg.result = repo.readDir(msg.params);
      break;
    }

    case msgTypes.metadata.name: {
      ensureStr(msg.params);
      msg.result = repo.metadata(msg.params);
      break;
    }

    case msgTypes.history.name: {
      ensureStr(msg.params);
      msg.result = repo.history(msg.params);
      break;
    }

    case msgTypes.copy.name: {
      ensureStr2(msg.params.from, msg.params.to);
      repo.copy(msg.params.from, msg.params.to);
      break;
    }

    case msgTypes.removeFile.name: {
      ensureStr(msg.params);
      repo.removeFile(msg.params);
      break;
    }

    case msgTypes.removeDir.name: {
      ensureStr(msg.params);
      repo.removeDir(msg.params);
      break;
    }

    case msgTypes.removeDirAll.name: {
      ensureStr(msg.params);
      repo.removeDirAll(msg.params);
      break;
    }

    case msgTypes.rename.name: {
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
    throw 'File not opened';
  }

  // data bytes transfer buffer
  let transBuf = null;

  switch (msg.type) {
    case msgTypes.close.name: {
      file.close();
      delete opened.files[msg.object];
      break;
    }

    case msgTypes.read.name: {
      let buf = new Uint8Array(msg.params.buf, msg.params.offset, msg.params.len);
      const read = file.read(buf);
      msg.result = {
        buf: msg.params.buf,
        offset: msg.params.offset,
        len: read
      };
      transBuf = [msg.params.buf];
      break;
    }

    case msgTypes.readAll.name: {
      let dst = file.readAll();
      msg.result = dst.buffer;
      transBuf = [dst.buffer];
      break;
    }

    case msgTypes.readAllString.name: {
      let dst = file.readAll();
      msg.result = ab2str(dst.buffer);
      break;
    }

    case msgTypes.write.name: {
      const buf = new Uint8Array(msg.params.buf, msg.params.offset, msg.params.len);
      msg.result = file.write(buf);
      break;
    }

    case msgTypes.finish.name: {
      file.finish();
      break;
    }

    case msgTypes.writeOnce.name: {
      const buf = new Uint8Array(msg.params.buf, msg.params.offset, msg.params.len);
      msg.result = file.writeOnce(buf);
      break;
    }

    case msgTypes.seek.name: {
      ensureInt(msg.params.from);
      ensureIntOrNeg(msg.params.offset);
      msg.result = file.seek(msg.params.from, msg.params.offset);
      break;
    }

    case msgTypes.setLen.name: {
      ensureInt(msg.params);
      file.setLen(msg.params);
      break;
    }

    case msgTypes.currVersion.name: {
      msg.result = file.currVersion();
      break;
    }

    case msgTypes.metadata.name: {
      msg.result = file.metadata();
      break;
    }

    case msgTypes.history.name: {
      msg.result = file.history();
      break;
    }

    case msgTypes.versionReader.name: {
      ensureInt(msg.params);
      const vrdr = file.versionReader(msg.params);
      opened.vrdrs[vrdr.ptr] = vrdr;
      msg.result = vrdr.ptr;
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
    case msgTypes.close.name: {
      vrdr.close();
      delete opened.vrdrs[msg.object];
      break;
    }

    case msgTypes.read.name: {
      let buf = new Uint8Array(msg.params.buf, msg.params.offset, msg.params.len);
      const read = vrdr.read(buf);
      msg.result = {
        buf: msg.params.buf,
        offset: msg.params.offset,
        len: read
      };
      transBuf = [msg.params.buf];
      break;
    }

    case msgTypes.readAll.name: {
      let dst = vrdr.readAll();
      msg.result = dst.buffer;
      transBuf = [dst.buffer];
      break;
    }

    case msgTypes.readAllString.name: {
      let dst = vrdr.readAll();
      msg.result = ab2str(dst.buffer);
      break;
    }

    case msgTypes.seek.name: {
      ensureInt(msg.params.from);
      ensureIntOrNeg(msg.params.offset);
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
  // console.log(`main -> worker: ${JSON.stringify(msg)}`);

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
