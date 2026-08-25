// ---------------------------------------------------------------------------
// deepMerge: safe recursive merge for PLAIN objects only.
//   - Skips __proto__ / constructor / prototype keys (prototype pollution).
//   - Only recurses into plain objects (Object.getPrototypeOf === Object.prototype
//     or Object.create(null)). Dates, Maps, Sets, RegExp, class instances, etc.
//     are copied by reference instead of being spread into {} and destroyed.
// ---------------------------------------------------------------------------
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isPlainObject(val) {
  if (val === null || typeof val !== "object" || Array.isArray(val)) return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

function deepMerge(target, source) {
  const output = isPlainObject(target) ? { ...target } : {};

  if (isPlainObject(target) && isPlainObject(source)) {
    for (const key of Object.keys(source)) {
      if (DANGEROUS_KEYS.has(key)) continue; // fix #4: prototype pollution

      const sourceVal = source[key];

      if (isPlainObject(sourceVal)) {
        // fix #5: only recurse when both sides are plain objects;
        // otherwise take the source value as-is (no destructive spreading).
        output[key] = isPlainObject(target[key])
          ? deepMerge(target[key], sourceVal)
          : sourceVal;
      } else {
        output[key] = sourceVal;
      }
    }
  }

  return output;
}

// ---------------------------------------------------------------------------
// IndexedDBManager
// ---------------------------------------------------------------------------
class IndexedDBManager {
  constructor(dbName, version, storeName, keyPath = "id") {
    this.dbName = dbName;
    this.version = version;
    this.storeName = storeName;
    this.keyPath = keyPath;

    // fix #1: cache the connection (as a Promise so concurrent callers share it)
    this._dbPromise = null;
  }

  /**
   * Opens the database once and caches the connection for reuse.
   * Handles multi-tab upgrade blocking (fix #7) and invalidates the cache
   * if the connection is closed by a version change elsewhere.
   * @returns {Promise<IDBDatabase>}
   */
  _getDB() {
    if (this._dbPromise) return this._dbPromise;

    this._dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: this.keyPath });
        }
      };

      // fix #7: if another tab holds an open connection, this fires instead
      // of the upgrade hanging forever.
      request.onblocked = () => {
        console.warn(
          `[IndexedDBManager] Open of "${this.dbName}" is blocked by another ` +
          `open connection (likely another tab). Ask the user to close other ` +
          `tabs, or listen for "onversionchange" there to auto-close.`
        );
      };

      request.onsuccess = () => {
        const db = request.result;

        // fix #7: if a DIFFERENT tab/context requests a version upgrade,
        // close our connection so that tab isn't blocked, and drop the cache
        // so the next call to this manager reopens a fresh connection.
        db.onversionchange = () => {
          db.close();
          this._dbPromise = null;
        };

        // If the connection is closed for any other reason, don't keep
        // serving a dead handle from the cache.
        db.onclose = () => {
          this._dbPromise = null;
        };

        resolve(db);
      };

      request.onerror = () => {
        this._dbPromise = null;
        reject(request.error);
      };
    });

    return this._dbPromise;
  }

  /** Manually close the cached connection (e.g. on app teardown). */
  close() {
    if (this._dbPromise) {
      this._dbPromise.then((db) => db.close()).catch(() => {});
      this._dbPromise = null;
    }
  }

  /** Wraps a transaction so its completion/error/abort resolve or reject a Promise. */
  _txDone(transaction, value) {
    // fix #1: no longer closes the shared db connection here.
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Transaction aborted"));
    });
  }

  /** Wraps a single IDBRequest as a Promise. */
  _reqDone(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Normalizes a value so it always satisfies the store's inline keyPath.
   * fix #3: primitives can't be stored directly in a keyPath store, so they
   * get wrapped. Plain objects get the key merged in directly.
   */
  _toRecord(key, value) {
    if (isPlainObject(value)) {
      return { ...value, [this.keyPath]: key };
    }
    // Primitive (or non-plain object like a Date/array): wrap it.
    return { [this.keyPath]: key, value };
  }

  // --- SINGLE ARTIFACT OPERATIONS ---

  async set(key, value) {
    const db = await this._getDB();
    const transaction = db.transaction(this.storeName, "readwrite");
    const store = transaction.objectStore(this.storeName);
    const data = this._toRecord(key, value);

    store.put(data);
    return this._txDone(transaction, data);
  }

  async get(key) {
    const db = await this._getDB();
    const transaction = db.transaction(this.storeName, "readonly");
    const store = transaction.objectStore(this.storeName);
    const result = await this._reqDone(store.get(key));
    return result;
  }

  async update(key, updates) {
    const db = await this._getDB();

    // fix #2: single readwrite transaction for both the read and the write,
    // so no other writer can slip in between get() and put().
    const transaction = db.transaction(this.storeName, "readwrite");
    const store = transaction.objectStore(this.storeName);

    const existing = await this._reqDone(store.get(key));

    if (!existing || typeof existing !== "object") {
      transaction.abort();
      throw new Error(`Record ${key} not found or not an object.`);
    }

    const merged = deepMerge(existing, updates);
    store.put(merged); // same transaction, no yield to the event loop in between

    return this._txDone(transaction, merged);
  }

  async append(key, arrayPath, newItem) {
    const db = await this._getDB();

    // fix #2: single readwrite transaction, as above.
    const transaction = db.transaction(this.storeName, "readwrite");
    const store = transaction.objectStore(this.storeName);

    const existing = await this._reqDone(store.get(key));

    if (!existing) {
      transaction.abort();
      throw new Error(`Record ${key} not found.`);
    }

    const keys = arrayPath.split(".");
    let current = existing;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }

    const finalKey = keys[keys.length - 1];
    if (!current[finalKey]) current[finalKey] = [];
    if (!Array.isArray(current[finalKey])) {
      transaction.abort();
      throw new Error(`Path "${arrayPath}" is not an array.`);
    }

    current[finalKey].push(newItem);
    store.put(existing);

    return this._txDone(transaction, existing);
  }

  // --- BATCH OPERATIONS ---

  async setMany(entries) {
    const db = await this._getDB();

    // fix #6: validate synchronously BEFORE opening the transaction, so the
    // "missing keyPath" throw doesn't need to race a real DB error. Real DB
    // errors (quota, constraints, etc.) are surfaced via transaction.onerror
    // inside _txDone, not a try/catch around put().
    for (const entry of entries) {
      if (!entry || entry[this.keyPath] === undefined || entry[this.keyPath] === null) {
        throw new Error(`Missing keyPath: ${this.keyPath}`);
      }
    }

    const transaction = db.transaction(this.storeName, "readwrite");
    const store = transaction.objectStore(this.storeName);

    for (const entry of entries) {
      store.put(entry);
    }

    return this._txDone(transaction, entries);
  }

  async getAll() {
    const db = await this._getDB();
    const transaction = db.transaction(this.storeName, "readonly");
    const store = transaction.objectStore(this.storeName);
    return this._reqDone(store.getAll());
  }

  // --- REMOVAL OPERATIONS ---

  async delete(key) {
    const db = await this._getDB();
    const transaction = db.transaction(this.storeName, "readwrite");
    const store = transaction.objectStore(this.storeName);
    store.delete(key);
    return this._txDone(transaction, key);
  }

  async deleteMany(keys) {
    const db = await this._getDB();
    const transaction = db.transaction(this.storeName, "readwrite");
    const store = transaction.objectStore(this.storeName);
    for (const key of keys) store.delete(key);
    return this._txDone(transaction, keys);
  }

  async clear() {
    const db = await this._getDB();
    const transaction = db.transaction(this.storeName, "readwrite");
    const store = transaction.objectStore(this.storeName);
    store.clear();
    return this._txDone(transaction, undefined);
  }

  async count() {
    const db = await this._getDB();
    const transaction = db.transaction(this.storeName, "readonly");
    const store = transaction.objectStore(this.storeName);
    return this._reqDone(store.count());
  }
}

/**
 * Runs an async operation while toggling a loading flag before/after,
 * as a drop-in replacement for the old isPending()/isSuccess()/isFail() hooks.
 *
 * @example
 * const [data, error] = await withLoading(
 *   () => manager.get("user-1"),
 *   (isLoading) => { spinner.hidden = !isLoading; }
 * );
 * if (error) console.error(error);
 * else console.log(data);
 *
 * @param {() => Promise<any>} task
 * @param {(isLoading: boolean) => void} [onLoadingChange]
 * @returns {Promise<[any, Error|null]>} tuple of [result, error]
 */
async function withLoading(task, onLoadingChange) {
  onLoadingChange?.(true);
  try {
    const result = await task();
    return [result, null];
  } catch (err) {
    return [null, err];
  } finally {
    onLoadingChange?.(false);
  }
}