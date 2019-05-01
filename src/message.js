/*
 * Message types
 */
const MsgTypes = {
  zbox: {
    initEnv: 'initEnv',
    exists: 'exists',
    openRepo: 'openRepo',
    repairSuperBlock: 'repairSuperBlock'
  },
  repo: {
    close: 'close',
    info: 'info',
    resetPassword: 'resetPassword',
    pathExists: 'pathExists',
    isFile: 'isFile',
    isDir: 'isDir',
    createFile: 'createFile',
    openFile: 'openFile',
    createDir: 'createDir',
    createDirAll: 'createDirAll',
    readDir: 'readDir',
    metadata: 'metadata',
    history: 'history',
    copy: 'copy',
    removeFile: 'removeFile',
    removeDir: 'removeDir',
    removeDirAll: 'removeDirAll',
    rename: 'rename'
  },
  file: {
    close: 'close',
    read: 'read',
    readAll: 'readAll',
    readAllString: 'readAllString',
    write: 'write',
    finish: 'finish',
    writeOnce: 'writeOnce',
    seek: 'seek',
    setLen: 'setLen',
    currVersion: 'currVersion',
    metadata: 'metadata',
    history: 'history',
    versionReader: 'versionReader'
  },
  versionReader: {
    close: 'close',
    read: 'read',
    readAll: 'readAll',
    readAllString: 'readAllString',
    seek: 'seek'
  }
};

export default MsgTypes;
