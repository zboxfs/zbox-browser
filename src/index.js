import MsgTypes from "./message.js";

// global context
const ctx = {
    resolver: null,
    worker: null
};

const SeekFrom = {
    START: 0,
    END: 1,
    CURRENT: 2
};

// check browser for functionality support
function checkBrowserSupport() {
    if (!window.indexedDB) {
        console.error("Your browser doesn't support IndexedDB");
        return false;
    }
    return true;
}

class Base {
    constructor(scope) {
        this.scope = scope;
    }

    // bind message resolver and post message to worker
    _bindMsg(msgType, object, params) {
        const self = this;
        return new Promise((resolve, reject) => {
            ctx.resolver.add(self.scope, msgType, resolve, reject);
            const msg = { scope: self.scope, type: msgType, object, params };
            if (msgType == 'read' || msgType == 'write') {
                msg.params = params.buffer;
                ctx.worker.postMessage(msg, [params.buffer]);
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
            this.map[msg.scope][msg.type].reject(msg.error);
            return;
        }

        const msgTypes = MsgTypes[msg.scope];
        let result = msg.result;

        switch (msg.scope) {
            case 'zbox':
                switch (msg.type) {
                    case msgTypes.open:
                        result = new Repo();
                        break;
                }
                break;

            case 'repo':
                switch (msg.type) {
                    case msgTypes.openFile:
                        result = new File(result);
                        break;
                }
                break;

            case 'file':
                switch (msg.type) {
                    case msgTypes.read:
                        result.data = new Uint8Array(result.data);
                        break;

                    case msgTypes.readAll:
                        result = new Uint8Array(result);
                        break;

                    case msgTypes.versionReader:
                        result = new VersionReader(result);
                        break;
                }
                break;

            case 'versionReader':
                switch (msg.type) {
                    case msgTypes.read:
                        result.data = new Uint8Array(result.data);
                        break;

                    case msgTypes.readAll:
                        result = new Uint8Array(result);
                        break;
                }
                break;
        }

        this.map[msg.scope][msg.type].resolve(result);
    }
}

class Zbox extends Base {
    constructor() {
        super('zbox');

        // initialise global context objects
        ctx.resolver = new Resolver();
        ctx.worker = new Worker('./worker.js', { name: 'ZboxWorker' });
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

let uri = "zbox://accessKey456@repo456?cache_size=1mb";
let pwd = "pwd";

let zbox = new Zbox();

async function run() {
    let result;

    try {
        await zbox.init();

        let repo = await zbox.open({ uri, pwd, opts: {
            create: false
        }});

        /*let file = await repo.openFile({
            path: "/file3",
            opts: { create: true }
        });
        let buf = new Uint8Array([44, 55, 66]);
        await file.writeOnce(buf);
        await file.close();*/

        //let file2 = await repo.openFile("/file");
        //let newPos = await file.seek({ from: SeekFrom.START, offset: 1 });
        //console.log(newPos);
        //let dst = new Uint8Array(2);
        //let result = await file.read(dst);
        //let result = await file2.readAll();
        //await file2.close();
        //console.log(`file2 closed`);

        let dirs = await repo.readDir("/");
        console.log(dirs);

        await repo.close();

        zbox.exit();
        console.log(`zbox worker exited`);

    } catch (err) {
        console.error(`${err}`);
    }
}

run();

