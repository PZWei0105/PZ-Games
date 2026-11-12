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
    async putAudio(id, blob) {
      try { await api.put('audio', blob, id); }
      catch (e) {
        // very old Safari could not keep Blobs in IndexedDB: keep the bytes instead
        const buf = await blob.arrayBuffer();
        await api.put('audio', { buf, type: blob.type }, id);
      }
    },
    async getAudio(id) {
      const v = await api.get('audio', id);
      if (!v) return null;
      if (v instanceof Blob) return v;
      if (v.buf) return new Blob([v.buf], { type: v.type || 'audio/mpeg' });
      return null;
    },
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
