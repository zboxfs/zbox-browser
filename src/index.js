import msgTypes from "./message.js";

/*
 * Message Resolver
 */
class Resolver {
    constructor() {
        this.map = Object.keys(msgTypes).reduce((accum, curr) => {
            return accum[curr] = { resolve: null, reject: null };
        }, {});
    }

    add(msgType, resolve, reject) {
        this.map[msgType] = { resolve, reject };
    }

    resolve(event) {
        const msg = event.data;
        console.log(`msg received from worker: ${JSON.stringify(msg.result)}`);
        if (msg.error) {
            this.map[msg.type].reject(msg.error);
        } else {
            this.map[msg.type].resolve(msg.result);
        }
    }
}

/*
 * Zbox
 */
class Zbox {
    constructor() {
        this.resolver = new Resolver();
        this.worker = new Worker('./worker.js', { name: 'ZboxWorker' });
        this.worker.onmessage = this.resolver.resolve.bind(this.resolver);
        this.worker.onerror = this.worker.onmessage;

        // dynamically add methods from message type
        Object.keys(msgTypes).forEach(msgType => {
            Zbox.prototype[msgType] = this._bindMsg.bind(this, msgType);
        });
    }

    exit() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }

    // bind message resolver and post message to worker
    _bindMsg(msgType, params) {
        const self = this;
        return new Promise((resolve, reject) => {
            self.resolver.add(msgType, resolve, reject);
            self.worker.postMessage({ type: msgType, params });
        });
    }
}

let zbox = new Zbox();
zbox.init()
    .then((result) => {
        console.log(`init done`);
        return zbox.open({
            uri: "accessKey456@repo456?cache_type=mem&cache_size=1",
            pwd: "pwd"
        });
    })
    .then((result) => {
        console.log(`open done`);
        return zbox.close();
    })
    .then((result) => {
        console.log(`close done`);
        zbox.exit();
    })
    .catch((err) => {
        console.log(`err: ${err}`);
    });
