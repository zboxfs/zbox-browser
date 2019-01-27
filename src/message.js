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
        createFile: "createFile",
        openFile: "openFile",
        readDir: "readDir"
    },
    file: {
        close: "close",
        readAll: "readAll",
        writeOnce: "writeOnce",
        metadata: "metadata"
    }
};

export default MsgTypes;
