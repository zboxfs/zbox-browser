// local cache db and store name
const LOCAL_CACHE_DB = 'zbox_local_cache';
const LOCAL_CACHE_STORE = 'cache';

// local cache update sequence number key
const LOCAL_CACHE_SEQ = '_seq';

// local cache backend
class CacheBackend {
    constructor() {
        this.db = null;
        this._seq = 0;
        this.map= new Map();
    }

    get seq() {
        return this._seq;
    }

    set seq(s) {
        this._seq = s;
    }

    init() {
        let self = this;

        return new Promise((resolve, reject) => {
            let req = indexedDB.open(LOCAL_CACHE_DB, 1);

            req.onerror = (event) => {
                reject('IndexedDB is forbidden to use');
            };

            req.onupgradeneeded = (event) => {
                let db = event.target.result;
                if (!db.objectStoreNames.contains(LOCAL_CACHE_STORE)) {
                    db.createObjectStore(LOCAL_CACHE_STORE, {
                        keyPath: 'relPath'
                    });
                }
            };

            req.onsuccess = (event) => {
                self.db = event.target.result;
                resolve();
            };
        });
    }

    open() {
        let self = this;

        return new Promise((resolve, reject) => {
            // load all items in local cache db into memory map
            let req = self.db.transaction(LOCAL_CACHE_STORE)
                .objectStore(LOCAL_CACHE_STORE)
                .getAll();
            req.onerror = (event) => {
                reject('Database error: ' + event.target.errorCode);
            };
            req.onsuccess = (event) => {
                let items = event.target.result;
                items.forEach(item => {
                    self.map.set(item.relPath, item.data);
                });
                resolve();
            };
        });
    }

    close() {
        this.db.close();
        this.map.clear();
    }

    contains(relPath) {
        return this.map.has(relPath);
    }

    get(relPath) {
        return this.map.get(relPath);
    }

    insert(relPath, data) {
        console.log("=== backend.insert: " + relPath + ","+ this._seq);
        let self = this;

        this.map.set(relPath, data);

        let tx = this.db.transaction(LOCAL_CACHE_STORE, 'readwrite');
        tx.onerror = (event) => {
            console.error('Insert local cache item failed ' + event.target.errorCode);
        };
        tx.oncomplete = (event) => {
            console.log('---> tx completed');
            self._seq += 1;
        };

        let store = tx.objectStore(LOCAL_CACHE_STORE);
        let req = store.put({ relPath, data });
        req.onsuccess = (event) => {
            console.log('---> req onsuccess');
        };
        let req2= store.put({ relPath: LOCAL_CACHE_SEQ, data: this._seq });
        req2.onsuccess = (event) => {
            console.log('---> req2 onsuccess');
        };
    }

    remove(relPath) {
        console.log("=== backend.remove: " + relPath +"," +this._seq);
        let self = this;

        this.map.delete(relPath);

        let tx = this.db.transaction(LOCAL_CACHE_STORE, 'readwrite');
        tx.onerror = (event) => {
            console.error('Remove local cache item failed ' + event.target.errorCode);
        };
        tx.oncomplete = (event) => {
            console.log('--->tx completed');
            self._seq += 1;
        };

        let store = tx.objectStore(LOCAL_CACHE_STORE);
        store.delete(relPath);
        store.put({ relPath: LOCAL_CACHE_SEQ, data: this._seq });
    }

    clear() {
        this.map.clear();
        this._seq = 0;

        let req = this.db.transaction(LOCAL_CACHE_STORE, "readwrite")
            .objectStore(LOCAL_CACHE_STORE)
            .clear();
        req.onerror = (event) => {
            console.error('Clear local cache failed ' + event.target.errorCode);
        };
    }
}

export let backend = new CacheBackend();

export function getUpdateSeq() {
    return backend.seq;
}

export function setUpdateSeq(seq) {
    backend.seq = seq;
}

export function contains(relPath) {
    return backend.contains(relPath);
}

export function get(relPath) {
    return backend.get(relPath);
}

export function insert(relPath, data) {
    backend.insert(relPath, data.slice());
}

export function remove(relPath) {
    backend.remove(relPath);
}

export function clear() {
    backend.clear();
}
