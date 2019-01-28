/*
 * Message types
 */
const MsgTypes = {
    zbox: {
        init: "init",
        exists: "exists",
        open: "open"
    },
    repo: {
        close: "close",
        info: "info",
        resetPassword: "resetPassword",
        pathExists: "pathExists",
        isFile: "isFile",
        isDir: "isDir",
        createFile: "createFile",
        openFile: "openFile",
        createDir: "createDir",
        createDirAll: "createDirAll",
        readDir: "readDir",
        metadata: "metadata",
        history: "history",
        copy: "copy",
        removeFile: "removeFile",
        removeDir: "removeDir",
        removeDirAll: "removeDirAll",
        rename: "rename"
    },
    file: {
        close: "close",
        read: "read",
        readAll: "readAll",
        write: "write",
        finish: "finish",
        writeOnce: "writeOnce",
        seek: "seek",
        setLen: "setLen",
        currVersion: "currVersion",
        versionReader: "versionReader",
        metadata: "metadata",
        history: "history"
    },
    versionReader: {
        close: "close",
        read: "read",
        readAll: "readAll",
        seek: "seek"
    }
};

export default MsgTypes;
