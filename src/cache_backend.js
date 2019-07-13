import { logger } from './logger';

// local cache db name
const LOCAL_CACHE_DB = 'zbox_local_cache';

// open cache backend database
function openDb(storeName) {
  return new Promise((resolve, reject) => {
    const ver = Math.floor(Date.now() / 1000);
    let req = indexedDB.open(LOCAL_CACHE_DB, ver);

    req.onerror = (event) => {
      reject('IndexedDB is forbidden to use');
    };

    req.onupgradeneeded = (event) => {
      let db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, {
          keyPath: 'relPath'
        });
      }
    };

    req.onsuccess = (event) => {
      resolve(event.target.result);
    };
  });
}

// delete store in database
function deleteStore(storeName) {
  return new Promise((resolve, reject) => {
    const ver = Math.floor(Date.now() / 1000);
    let req = indexedDB.open(LOCAL_CACHE_DB, ver);

    req.onerror = (event) => {
      reject('IndexedDB is forbidden to use');
    };

    req.onupgradeneeded = (event) => {
      let db = event.target.result;
      if (db.objectStoreNames.contains(storeName)) {
        db.deleteObjectStore(storeName);
      }
      resolve();
    };

    req.onsuccess = (event) => {
      let db = event.target.result;
      db.close();
    };
  });
}

// local cache backend
class CacheBackend {
  constructor() {
    this.db = null;
    this.storeName = null;
    this.map= new Map();
    this.dbClosed = true;
  }

  open(storeName) {
    let self = this;

    return openDb(storeName)
      .then(db => {
        self.db = db;
        self.storeName = storeName;

        return new Promise((resolve, reject) => {
          // load all items in local cache db into memory map
          let req = self.db.transaction(storeName, 'readonly')
            .objectStore(storeName)
            .getAll();
          req.onerror = (event) => {
            reject('Database error: ' + event.target.errorCode);
          };
          req.onsuccess = (event) => {
            let items = event.target.result;
            items.forEach(item => {
              self.map.set(item.relPath, item.data);
            });
            logger.debug(`Cache backend opened: ${items.length} cache items loaded`);
            self.dbClosed = false;
            resolve();
          };
        });
      });
  }

  // immediate close database withouth saving data
  immediateClose() {
    if (!this.dbClosed) {
      this.db.close();
      this.storeName = null;
      this.map.clear();
      this.dbClosed = true;
    }
  }

  close() {
    let self = this;

    if (self.dbClosed) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      let tx = self.db.transaction(self.storeName, 'readwrite');

      tx.onabort = (event) => {
        self.map.clear();
        reject('Database tx aborted: ' + event.target.errorCode);
      };
      tx.onerror = (event) => {
        self.map.clear();
        reject('Database tx error: ' + event.target.errorCode);
      };
      tx.oncomplete = (event) => {
        self.map.clear();
        self.dbClosed = true;
        resolve();
      };

      let store = tx.objectStore(self.storeName);

      // clear all store then save all items from memory map
      store.clear();
      self.map.forEach((value, key) => {
        store.put({ relPath: key, data: value });
      });

      self.db.close();
    });
  }

  contains(relPath) {
    return this.map.has(relPath);
  }

  get(relPath) {
    return this.map.get(relPath);
  }

  insert(relPath, data) {
    this.map.set(relPath, data);
  }

  remove(relPath) {
    this.map.delete(relPath);
  }

  clear() {
    this.map.clear();

    let req = this.db.transaction(this.storeName, "readwrite")
      .objectStore(this.storeName)
      .clear();
    req.onerror = (event) => {
      logger.error('Clear local cache failed ' + event.target.errorCode);
    };
  }

  destroy(storeName) {
    return deleteStore(storeName);
  }
}

export let cacheBackend = new CacheBackend();

// --------------------------
// export functions for wasm
// --------------------------
export function contains(relPath) {
  return cacheBackend.contains(relPath);
}

export function get(relPath) {
  return cacheBackend.get(relPath);
}

export function insert(relPath, data) {
  cacheBackend.insert(relPath, data.slice());
}

export function remove(relPath) {
  cacheBackend.remove(relPath);
}

export function clear() {
  cacheBackend.clear();
}
