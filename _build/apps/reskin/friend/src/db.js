/* ===================== IndexedDB ===================== */
R.db = (() => {
  const NAME = 'pz-reskin', VER = 1;
  const STORES = { tracks: { keyPath: 'id' }, playlists: { keyPath: 'id' }, audio: null, covers: null, analysis: null, images: null, kv: null };
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      let rq;
      try { rq = indexedDB.open(NAME, VER); } catch (e) { dbp = null; rej(e); return; }
      rq.onupgradeneeded = () => {
        const db = rq.result;
        for (const [n, o] of Object.entries(STORES)) if (!db.objectStoreNames.contains(n)) db.createObjectStore(n, o || undefined);
      };
      rq.onsuccess = () => {
        const db = rq.result;
        db.onclose = () => { dbp = null; };
        db.onversionchange = () => { try { db.close(); } catch (e) { /* ignore */ } dbp = null; };
        res(db);
      };
      rq.onerror = () => { dbp = null; rej(rq.error); };
    });
    return dbp;
  }

  async function run(store, mode, fn, retry) {
    try {
      const db = await open();
      return await new Promise((res, rej) => {
        let tx;
        try { tx = db.transaction(store, mode); } catch (e) { rej(e); return; }
        let out;
        tx.oncomplete = () => res(out);
        tx.onerror = () => rej(tx.error);
        tx.onabort = () => rej(tx.error || new Error('transaction aborted'));
        const r = fn(tx.objectStore(store));
        if (r && 'onsuccess' in r) r.onsuccess = () => { out = r.result; };
        else out = r;
      });
    } catch (e) {
      // iOS sometimes drops the connection while the app sleeps in the background: reopen once
      if (retry !== false && e && (e.name === 'InvalidStateError' || e.name === 'UnknownError' || /connection|closing|closed/i.test(e.message || ''))) {
        dbp = null;
        return run(store, mode, fn, false);
      }
      throw e;
    }
  }

  const api = {
    open,
    get: (s, k) => run(s, 'readonly', (os) => os.get(k)),
    put: (s, v, k) => run(s, 'readwrite', (os) => (k === undefined ? os.put(v) : os.put(v, k))),
    del: (s, k) => run(s, 'readwrite', (os) => os.delete(k)),
    all: (s) => run(s, 'readonly', (os) => os.getAll()),
    keys: (s) => run(s, 'readonly', (os) => os.getAllKeys()),
    clear: (s) => run(s, 'readwrite', (os) => os.clear()),
    // the device ran out of room for the app's storage (each browser words it differently)
    isFull: (e) => !!e && (e.name === 'QuotaExceededError' || e.code === 22 || /quota|disk is full|no space/i.test(String(e.message || ''))),
    // Song files, covers and photos are stored as plain bytes ({ buf, type }), never as Blobs. WebKit keeps
    // IndexedDB Blobs as separate files, and some iPhone web views (the Claude app among them) cannot read those
    // back: every song then fails to play and every cover turns into a broken picture.
    async putBytes(store, key, data, type) {
      const buf = data instanceof ArrayBuffer ? data : await data.arrayBuffer();
      await api.put(store, { buf, type: type || data.type || '' }, key);
    },
    // { buf, type } or null. A Blob stored by an older version is read once and kept as bytes from then on;
    // if it can no longer be read, the error carries .lost = true (importing the song again brings it back).
    async getRaw(store, key) {
      const v = await api.get(store, key);
      if (!v) return null;
      if (v.buf) return { buf: v.buf, type: v.type || '' };
      if (v instanceof Blob) {
        let buf;
        try { buf = await v.arrayBuffer(); } catch (e) { const err = new Error('stored file cannot be read'); err.lost = true; throw err; }
        api.put(store, { buf, type: v.type || '' }, key).catch(() => {});
        return { buf, type: v.type || '' };
      }
      return null;
    },
    async getBytes(store, key) { const r = await api.getRaw(store, key); return r ? new Blob([r.buf], { type: r.type }) : null; },
    putAudio: (id, data, type) => api.putBytes('audio', id, data, type),
    getAudio: (id) => api.getBytes('audio', id),
    getAudioRaw: (id) => api.getRaw('audio', id),
    async estimate() {
      try { if (navigator.storage && navigator.storage.estimate) return await navigator.storage.estimate(); } catch (e) { /* ignore */ }
      return null;
    },
    async persisted() {
      try { if (navigator.storage && navigator.storage.persisted) return await navigator.storage.persisted(); } catch (e) { /* ignore */ }
      return false;
    },
    async persist() {
      try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { /* ignore */ }
      return false;
    },
    async wipe() {
      for (const s of Object.keys(STORES)) { try { await api.clear(s); } catch (e) { /* ignore */ } }
    },
  };
  return api;
})();
