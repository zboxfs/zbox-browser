import MsgTypes from "./message.js";

let zbox = null;
let repo = null;

// opened file map
// key: file ptr integer number
// value: opened file object
let opened = {};

function zboxMsgHandler(msg, msgTypes) {
    switch (msg.type) {
        case msgTypes.init:
            import("./wasm/zbox")
                .then(wasm => {
                    zbox = wasm;
                    zbox.init_env();
                    postMessage(msg);
                })
                .catch(err => {
                    msg.error = err;
                    console.error(`init env failed: ${err}`);
                });
            return;

        case msgTypes.exists:
            zbox.Repo.exists(msg.params.uri);
            break;

        case msgTypes.open:
            let opener = new zbox.RepoOpener();
            let opts = msg.params.opts || {};
            if (opts.hasOwnProperty('create')) opener.create(opts.create);
            if (opts.hasOwnProperty('createNew')) opener.createNew(opts.createNew);
            if (opts.hasOwnProperty('compress')) opener.compress(opts.compress);
            if (opts.hasOwnProperty('versionLimit')) opener.versionLimit(opts.versionLimit);
            if (opts.hasOwnProperty('dedupChunk')) opener.dedupChunk(opts.dedupChunk);
            if (opts.hasOwnProperty('readOnly')) opener.readOnly(opts.readOnly);
            repo = opener.open(msg.params.uri, msg.params.pwd);
            break;
    }

    // send message back to main thread
    postMessage(msg);
}

function repoMsgHandler(msg, msgTypes) {
    switch (msg.type) {
        case msgTypes.close:
            {
                let openedCnt = Object.keys(opened).length;
                if (openedCnt > 0) {
                    console.warn(`${openedCnt} file(s) still opened`);
                }
                repo.close();
            }
            break;

        case msgTypes.info:
            msg.result = { info: repo.info() };
            break;

        case msgTypes.createFile:
            {
                let file = repo.createFile(msg.params.path);
                opened[file.ptr] = file;
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

                opened[file.ptr] = file;
                msg.result = file.ptr;
            }
            break;

        case msgTypes.readDir:
            msg.result = repo.readDir(msg.params.path);
            break;
    }

    // send message back to main thread
    postMessage(msg);
}

function fileMsgHandler(msg, msgTypes) {
    let file = opened[msg.object];

    if (file == undefined) {
        throw 'File is not opened';
    }

    switch (msg.type) {
        case msgTypes.close:
            file.close();
            delete opened[msg.object];
            break;

        case msgTypes.readAll:
            msg.result = file.readAll();
            break;

        case msgTypes.writeOnce:
            msg.result = file.writeOnce(msg.params);
            break;
    }

    // send message back to main thread
    postMessage(msg);
}

onmessage = function(event) {
    let msg = event.data;
    console.log(`Message received from main thread: ${JSON.stringify(msg)}`);

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
        }
    } catch (err) {
        //console.error(`${err}`);
        msg.error = err;
        postMessage(msg);
    }
};
