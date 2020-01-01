/*
 * Message types
 */
const MsgTypes = {
  zbox: {
    initEnv: {
      name: 'initEnv',
      arg: [{ debug: { type: 'boolean', optional: true } }],
      optional: true
    },
    version: {
      name: 'version',
      arg: []
    },
    exists: {
      name: 'exists',
      arg: ['string']
    },
    destroy: {
      name: 'destroy',
      arg: ['string']
    },
    openRepo: {
      name: 'openRepo',
      arg: [{
        uri: { type: 'string' },
        pwd: { type: 'string' },
        opts: { type: 'object', optional: true }
      }]
    },
    repairSuperBlock: {
      name: 'repairSuperBlock',
      arg: [{
        uri: { type: 'string' },
        pwd: { type: 'string' }
      }]
    }
  },

  repo: {
    close: {
      name: 'close',
      arg: []
    },
    info: {
      name: 'info',
      arg: []
    },
    resetPassword: {
      name: 'resetPassword',
      arg: [
        { oldPwd: { type: 'string' } },
        { newPwd: { type: 'string' } }
      ]
    },
    pathExists: {
      name: 'pathExists',
      arg: ['string']
    },
    isFile: {
      name: 'isFile',
      arg: ['string']
    },
    isDir: {
      name: 'isDir',
      arg: ['string']
    },
    createFile: {
      name: 'createFile',
      arg: ['string']
    },
    openFile: {
      name: 'openFile',
      arg: [
        'string',
        {
          path: { type: 'boolean' },
          opts: { type: 'object', optional: true }
        }
      ]
    },
    createDir: {
      name: 'createDir',
      arg: ['string']
    },
    createDirAll: {
      name: 'createDirAll',
      arg: ['string']
    },
    readDir: {
      name: 'readDir',
      arg: ['string']
    },
    metadata: {
      name: 'metadata',
      arg: ['string']
    },
    history: {
      name: 'history',
      arg: ['string']
    },
    copy: {
      name: 'copy',
      arg: [
        { from: { type: 'string' } },
        { to: { type: 'string' } }
      ]
    },
    copyDirAll: {
      name: 'copyDirAll',
      arg: [
        { from: { type: 'string' } },
        { to: { type: 'string' } }
      ]
    },
    removeFile: {
      name: 'removeFile',
      arg: ['string']
    },
    removeDir: {
      name: 'removeDir',
      arg: ['string']
    },
    removeDirAll: {
      name: 'removeDirAll',
      arg: ['string']
    },
    rename: {
      name: 'rename',
      arg: [
        { from: { type: 'string' } },
        { to: { type: 'string' } }
      ]
    }
  },

  file: {
    close: {
      name: 'close',
      arg: []
    },
    read: {
      name: 'read',
      arg: ['buffer']
    },
    readAll: {
      name: 'readAll',
      arg: []
    },
    readAllString: {
      name: 'readAllString',
      arg: []
    },
    write: {
      name: 'write',
      arg: ['string', 'buffer']
    },
    finish: {
      name: 'finish',
      arg: []
    },
    writeOnce: {
      name: 'writeOnce',
      arg: ['string', 'buffer']
    },
    seek: {
      name: 'seek',
      arg: [ {
        from: { type: 'number' },
        offset: { type: 'number' }
      }]
    },
    setLen: {
      name: 'setLen',
      arg: ['number']
    },
    currVersion: {
      name: 'currVersion',
      arg: []
    },
    metadata: {
      name: 'metadata',
      arg: []
    },
    history: {
      name: 'history',
      arg: []
    },
    versionReader: {
      name: 'versionReader',
      arg: ['number']
    }
  },

  versionReader: {
    close: {
      name: 'close',
      arg: []
    },
    version: {
      name: 'version',
      arg: []
    },
    read: {
      name: 'read',
      arg: ['buffer']
    },
    readAll: {
      name: 'readAll',
      arg: []
    },
    readAllString: {
      name: 'readAllString',
      arg: []
    },
    seek: {
      name: 'seek',
      arg: [{
        from: { type: 'number' },
        offset: { type: 'number' }
      }]
    }
  }
};

export default MsgTypes;
