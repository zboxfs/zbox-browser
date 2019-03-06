import MsgTypes from "./message.js";
import { backend } from './cache_backend';

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
    const cacheType = 'cache_type=wasm';
    if (uri.includes('cache_size')) {
        uri += '&' + cacheType;
    } else if (!uri.includes('?')) {
        uri += '?' + cacheType;
    }
    return uri;
}

function zboxMsgHandler(msg, msgTypes) {
    switch (msg.type) {
        case msgTypes.init: {
            backend.init()
                .then(() => import('./wasm/zbox'))
                .then(wasm => {
                    zbox = wasm;
                    zbox.init_env();
                })
                .catch(err => msg.error = `init failed: ${err}`)
                .finally(() => postMessage(msg));
            break;
        }

        case msgTypes.exists: {
            zbox.Repo.exists(appendCacheTypeToUri(msg.params.uri));
            postMessage(msg);
            break;
        }

        case msgTypes.open: {
            // load local cache backend and then open zbox
            backend.open()
                .then(() => {
                    // open zbox
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
                    repo = opener.open(uri, msg.params.pwd);
                })
                .catch(err => msg.error = `open failed: ${err}`)
                .finally(() => postMessage(msg));

            break;
        }
    }
}

function repoMsgHandler(msg, msgTypes) {
    switch (msg.type) {
        case msgTypes.close:
            {
                let cnt = Object.keys(opened.files).length;
                if (cnt > 0) { console.warn(`${cnt} file(s) still opened`); }
                cnt = Object.keys(opened.vrdrs).length;
                if (cnt > 0) {
                    console.warn(`${cnt} version reader(s) still opened`);
                }
                repo.close();
                backend.close()
                    .catch(err => msg.error = `close failed: ${err}`)
                    .finally(() => postMessage(msg));
            }
            return;

        case msgTypes.info:
            msg.result = repo.info();
            break;

        case msgTypes.resetPassword:
            repo.resetPassword(msg.params.oldPwd, msg.params.newPwd);
            break;

        case msgTypes.pathExists:
            msg.result = repo.pathExists(msg.params);
            break;

        case msgTypes.isFile:
            msg.result = repo.isFile(msg.params);
            break;

        case msgTypes.isDir:
            msg.result = repo.isDir(msg.params);
            break;

        case msgTypes.createFile:
            {
                let file = repo.createFile(msg.params.path);
                opened.files[file.ptr] = file;
                msg.result = file.ptr;
            }
            break;

        case msgTypes.openFile:
            {
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
                    throw 'Wrong arguments for opening file';
                }

                opened.files[file.ptr] = file;
                msg.result = file.ptr;
            }
            break;

        case msgTypes.createDir:
            repo.creaetDir(msg.params);
            break;

        case msgTypes.createDirAll:
            repo.creaetDirAll(msg.params);
            break;

        case msgTypes.readDir:
            msg.result = repo.readDir(msg.params);
            break;

        case msgTypes.metadata:
            msg.result = repo.metadata(msg.params);
            break;

        case msgTypes.history:
            msg.result = repo.history(msg.params);
            break;

        case msgTypes.copy:
            repo.copy(msg.params.from, msg.params.to);
            break;

        case msgTypes.removeFile:
            repo.removeFile(msg.params);
            break;

        case msgTypes.removeDir:
            repo.removeDir(msg.params);
            break;

        case msgTypes.removeDirAll:
            repo.removeDirAll(msg.params);
            break;

        case msgTypes.rename:
            repo.rename(msg.params.from, msg.params.to);
            break;
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
        case msgTypes.close:
            file.close();
            delete opened.files[msg.object];
            break;

        case msgTypes.read:
            {
                let dst = new Uint8Array(msg.params);
                const read = file.read(dst);
                msg.result = { read, data: dst.buffer };
                transBuf = [dst.buffer];
            }
            break;

        case msgTypes.readAll:
            {
                let dst = file.readAll();
                msg.result = dst.buffer;
                transBuf = [dst.buffer];
            }
            break;

        case msgTypes.write:
            {
                const buf = new Uint8Array(msg.params);
                msg.result = file.write(buf);
            }
            break;

        case msgTypes.finish:
            file.finish();
            break;

        case msgTypes.writeOnce:
            msg.result = file.writeOnce(msg.params);
            break;

        case msgTypes.seek:
            msg.result = file.seek(msg.params.from, msg.params.offset);
            break;

        case msgTypes.setLen:
            file.setLen(msg.params);
            break;

        case msgTypes.currVersion:
            msg.result = file.currVersion();
            break;

        case msgTypes.versionReader:
            {
                const vrdr = file.versionReader(msg.params);
                opened.vrdrs[vrdr.ptr] = vrdr;
                msg.result = vrdr.ptr;
            }
            break;

        case msgTypes.metadata:
            msg.result = file.metadata();
            break;

        case msgTypes.history:
            msg.result = file.history();
            break;
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
        case msgTypes.close:
            vrdr.close();
            delete opened.vrdrs[msg.object];
            break;

        case msgTypes.read:
            {
                let dst = new Uint8Array(msg.params);
                const read = vrdr.read(dst);
                msg.result = { read, data: dst.buffer };
                transBuf = [dst.buffer];
            }
            break;

        case msgTypes.readAll:
            {
                let dst = vrdr.readAll();
                msg.result = dst.buffer;
                transBuf = [dst.buffer];
            }
            break;

        case msgTypes.seek:
            msg.result = vrdr.seek(msg.params.from, msg.params.offset);
            break;
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
    //console.log(`main -> worker: ${JSON.stringify(msg)}`);

    // reset message result and error
    msg.result = null;
    msg.error = null;

    // dispatch message
    const msgTypes = MsgTypes[msg.scope];
    try {
        switch (msg.scope) {
            case 'zbox':
                zboxMsgHandler(msg, msgTypes);
                break;

            case 'repo':
                repoMsgHandler(msg, msgTypes);
                break;

            case 'file':
                fileMsgHandler(msg, msgTypes);
                break;

            case 'versionReader':
                versionReaderMsgHandler(msg, msgTypes);
                break;
        }
    } catch (err) {
        msg.error = err;
        postMessage(msg);
    }
};
