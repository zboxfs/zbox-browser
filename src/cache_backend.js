import { logger } from './logger';

// local cache db and store name
const LOCAL_CACHE_DB = 'zbox_local_cache';
const LOCAL_CACHE_STORE = 'cache';

// open cache backend database
function openDb() {
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
      resolve(event.target.result);
    };
  });
}

// local cache backend
class CacheBackend {
  constructor() {
    this.db = null;
    this.map= new Map();
    this.dbClosed = true;
  }

  open() {
    let self = this;

    return openDb()
      .then(db => self.db = db)
      .then(() => {
        return new Promise((resolve, reject) => {
          // load all items in local cache db into memory map
          let req = self.db.transaction(LOCAL_CACHE_STORE, 'readwrite')
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
            logger.log(`Cache backend opened: ${items.length} cache items loaded`);
            self.dbClosed = false;
            resolve();
          };
        });
      });
  }

  // immediate close database withouth saving data
  immediateClose() {
    if (!self.dbClosed) {
      this.db.close();
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
      let tx = self.db.transaction(LOCAL_CACHE_STORE, 'readwrite');

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

      let store = tx.objectStore(LOCAL_CACHE_STORE);

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

    let req = this.db.transaction(LOCAL_CACHE_STORE, "readwrite")
      .objectStore(LOCAL_CACHE_STORE)
      .clear();
    req.onerror = (event) => {
      logger.error('Clear local cache failed ' + event.target.errorCode);
    };
  }
}

export let cacheBackend = new CacheBackend();

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
