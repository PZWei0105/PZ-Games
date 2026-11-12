/* ===================== library: tracks, playlists, import ===================== */
R.lib = (() => {
  const { bus } = R;
  const tracks = new Map();
  const byKey = new Map();
  let playlists = [];
  const coll = (() => { try { return new Intl.Collator('zh-Hant-TW', { numeric: true, sensitivity: 'base' }); } catch (e) { return { compare: (a, b) => String(a).localeCompare(String(b)) }; } })();

  async function load() {
    const all = await R.db.all('tracks').catch(() => []);
    tracks.clear(); byKey.clear();
    for (const t of all) { tracks.set(t.id, t); if (t.key) byKey.set(t.key, t.id); }
    playlists = (await R.db.all('playlists').catch(() => [])).sort((a, b) => a.created - b.created);
  }
  const get = (id) => tracks.get(id) || null;
  const count = () => tracks.size;

  function list(sort, filter) {
    let a = Array.from(tracks.values());
    if (filter) {
      const q = filter.trim().toLowerCase();
      if (q) a = a.filter((t) => (t.title + ' ' + t.artist + ' ' + t.album + ' ' + t.name).toLowerCase().includes(q));
    }
    sort = sort || R.settings.get('sort');
    if (sort === 'title') a.sort((x, y) => coll.compare(x.title, y.title));
    else if (sort === 'artist') a.sort((x, y) => coll.compare(x.artist || '￿', y.artist || '￿') || coll.compare(x.album || '', y.album || '') || coll.compare(x.title, y.title));
    else if (sort === 'plays') a.sort((x, y) => (y.plays || 0) - (x.plays || 0) || y.added - x.added);
    else a.sort((x, y) => y.added - x.added);
    return a;
  }

  async function update(id, patch) {
    const t = tracks.get(id); if (!t) return null;
    Object.assign(t, patch);
    await R.db.put('tracks', t).catch(() => {});
    bus.emit('track:update', t);
    return t;
  }

  const AUDIO_EXT = /\.(mp3|m4a|m4b|aac|flac|wav|wave|aif|aiff|aifc|ogg|oga|opus|webm|caf|mp4)$/i;
  const isAudio = (f) => !!f && ((f.type && f.type.indexOf('audio/') === 0) || AUDIO_EXT.test(f.name || ''));
  const MIME = { mp3: 'audio/mpeg', m4a: 'audio/mp4', m4b: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', wav: 'audio/wav', wave: 'audio/wav', aif: 'audio/aiff', aiff: 'audio/aiff', aifc: 'audio/aiff', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', webm: 'audio/webm', caf: 'audio/x-caf' };
  const mimeOf = (f) => MIME[(String(f.name || '').split('.').pop() || '').toLowerCase()] || f.type || 'audio/mpeg';
  const tester = document.createElement('audio');
  const playable = (type) => !!(tester.canPlayType(type) || (type === 'audio/flac' && tester.canPlayType('audio/x-flac')) || (type === 'audio/mp4' && tester.canPlayType('audio/x-m4a')));

  async function fingerprint(f) {
    const a = new Uint8Array(await f.slice(0, 131072).arrayBuffer());
    const b = new Uint8Array(await f.slice(Math.max(0, f.size - 65536)).arrayBuffer());
    const buf = new Uint8Array(a.length + b.length + 8);
    buf.set(a, 0); buf.set(b, a.length);
    new DataView(buf.buffer).setFloat64(a.length + b.length, f.size);
    if (window.crypto && crypto.subtle) {
      try { const h = await crypto.subtle.digest('SHA-1', buf); return Array.from(new Uint8Array(h)).slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join(''); } catch (e) { /* fall back */ }
    }
    let h = 2166136261;
    for (let i = 0; i < buf.length; i++) { h ^= buf[i]; h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16) + '-' + f.size;
  }

  async function addOne(f, added, extra) {
    const key = await fingerprint(f);
    if (byKey.has(key) && tracks.has(byKey.get(key))) return { dup: true, id: byKey.get(key) };
    const meta = await R.meta.read(f);
    const id = R.uid();
    const type = (extra && extra.type) || mimeOf(f);
    const data = new Blob([await f.arrayBuffer()], { type });
    await R.db.putAudio(id, data);
    let cover = 0, colors = null;
    const pic = (extra && extra.picture) || meta.picture;
    if (pic && pic.data && pic.data.size !== 0 && (pic.data.length || pic.data.size) > 64) {
      try {
        const c = await R.art.processCover(pic.data instanceof Blob ? pic.data : new Blob([pic.data], { type: pic.mime || 'image/jpeg' }));
        await R.db.put('covers', c.full, id); await R.db.put('covers', c.thumb, id + ':t');
        cover = 1; colors = c.colors;
      } catch (e) { console.warn('cover', e); }
    }
    const t = {
      id, key, title: meta.title, artist: meta.artist || '', album: meta.album || '', year: meta.year || '', genre: meta.genre || '',
      duration: meta.duration || 0, size: f.size, type, name: f.name || '', added, cover, colors,
      lyrics: meta.lyrics ? String(meta.lyrics).slice(0, 20000) : '', bpm: 0, energy: 0, an: 0, plays: 0,
    };
    if (extra && extra.patch) Object.assign(t, extra.patch);
    if (!playable(type)) t.warn = 1;
    await R.db.put('tracks', t);
    tracks.set(id, t); byKey.set(key, id);
    return { id, t };
  }

  async function importFiles(files, onProgress) {
    const list = Array.from(files || []).filter(isAudio);
    const res = { added: [], dup: 0, failed: [], warn: 0, skipped: Array.from(files || []).length - list.length };
    const t0 = Date.now() + list.length;
    for (let k = 0; k < list.length; k++) {
      const f = list[k];
      if (onProgress) onProgress({ i: k, n: list.length, name: f.name });
      try {
        const r = await addOne(f, t0 - k);
        if (r.dup) { res.dup++; continue; }
        res.added.push(r.id);
        if (r.t.warn) res.warn++;
        R.analysis.enqueue(r.id);
        if (k % 3 === 2) bus.emit('library');
      } catch (e) { console.error('import failed', f.name, e); res.failed.push(f.name); }
    }
    if (res.added.length) { R.db.persist(); bus.emit('library'); }
    return res;
  }

  async function addDemo(onProgress) {
    if (onProgress) onProgress({ i: 0, n: 1, name: '示範曲' });
    const wav = await R.demo.render();
    const file = new File([wav], 'RESKIN-demo.wav', { type: 'audio/wav' });
    const art = await R.demo.cover();
    const r = await addOne(file, Date.now(), { type: 'audio/wav', picture: art ? { data: art, mime: 'image/png' } : null, patch: { title: '耳目一新．示範曲', artist: 'RESKIN', album: '換膚測試帶', demo: 1 } });
    if (!r.dup) { R.analysis.enqueue(r.id, true); bus.emit('library'); }
    R.settings.set('demoAdded', true);
    return r.id;
  }

  async function remove(ids) {
    ids = Array.from(ids);
    for (const id of ids) {
      const t = tracks.get(id); if (!t) continue;
      tracks.delete(id); if (t.key) byKey.delete(t.key);
      await Promise.all([R.db.del('tracks', id), R.db.del('audio', id), R.db.del('covers', id), R.db.del('covers', id + ':t'), R.db.del('analysis', id)]).catch(() => {});
      R.art.forget(id);
    }
    for (const p of playlists) {
      const n = p.ids.filter((x) => !ids.includes(x));
      if (n.length !== p.ids.length) { p.ids = n; await R.db.put('playlists', p).catch(() => {}); }
    }
    R.player.removed(ids);
    bus.emit('library'); bus.emit('playlists');
  }

  const pl = {
    all: () => playlists.slice(),
    get: (id) => playlists.find((p) => p.id === id) || null,
    async create(name, ids) {
      const p = { id: R.uid(), name: (name || '').trim() || '新歌單', ids: (ids || []).slice(), skin: null, created: Date.now() };
      playlists.push(p); await R.db.put('playlists', p); bus.emit('playlists'); return p;
    },
    async save(p) { await R.db.put('playlists', p); bus.emit('playlists'); },
    async remove(id) { playlists = playlists.filter((p) => p.id !== id); await R.db.del('playlists', id).catch(() => {}); bus.emit('playlists'); },
    async add(id, trackIds) {
      const p = pl.get(id); if (!p) return 0;
      let n = 0;
      for (const t of trackIds) if (tracks.has(t) && !p.ids.includes(t)) { p.ids.push(t); n++; }
      await pl.save(p); return n;
    },
    tracks: (id) => { const p = pl.get(id); return p ? p.ids.map(get).filter(Boolean) : []; },
    duration: (id) => pl.tracks(id).reduce((s, t) => s + (t.duration || 0), 0),
  };

  async function wipe() {
    await R.db.wipe();
    for (const id of tracks.keys()) R.art.forget(id);
    tracks.clear(); byKey.clear(); playlists = [];
    bus.emit('library'); bus.emit('playlists');
  }

  return { load, get, count, list, update, importFiles, addDemo, remove, pl, isAudio, wipe, all: () => Array.from(tracks.values()) };
})();
