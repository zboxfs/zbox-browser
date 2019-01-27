import MsgTypes from "./message.js";

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
        return new Promise((resolve, reject) => {
            ctx.resolver.add(self.scope, msgType, resolve, reject);
            ctx.worker.postMessage({ scope: self.scope, type: msgType, object, params });
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
        console.log(`msg received from worker: ${JSON.stringify(msg)}`);

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
                        result = new File(msg.result);
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

let uri = "zbox://accessKey456@repo456?cache_type=mem&cache_size=1";
let pwd = "pwd";

let zbox = new Zbox();

async function run() {
    let result;

    try {
        await zbox.init();
        console.log(`init done`);

        let repo = await zbox.open({ uri, pwd, opts: {
            create: true
        }});
        console.log(`repo opened`);

        //let file = await repo.openFile({
            //path: "/file",
            //opts: { create: true }
        //});
        //let buf = new Uint8Array([4, 5, 6]);
        //await file.writeOnce(buf);

        let file = await repo.openFile("/file");
        let buf = await file.readAll();
        console.log(buf);

        await file.close();
        console.log(`file closed`);

        await repo.close();
        console.log(`repo closed`);

        zbox.exit();
        console.log(`zbox worker exited`);

    } catch (err) {
        console.error(`${err}`);
    }
}

run();

