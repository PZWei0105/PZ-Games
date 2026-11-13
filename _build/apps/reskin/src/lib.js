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
    extra = extra || {};
    const key = await fingerprint(f);
    // already in the library: skip it, unless its stored copy could not be read back (then store it again, same song)
    const old = byKey.has(key) ? tracks.get(byKey.get(key)) : null;
    const lrc = extra.lrcFile ? String(await R.lyrics.readFile(extra.lrcFile).catch(() => '')).slice(0, 60000) : '';
    if (old && !old.lost) {
      // already here: only bring in a lyric file it did not have yet
      if (lrc && !old.lrc) { await update(old.id, { lrc }); return { dup: true, id: old.id, lyr: true }; }
      return { dup: true, id: old.id };
    }
    const meta = await R.meta.read(f);
    if (extra.trackNo) {
      // "02 夜行.wav" in a folder where every song starts with its number: the number is the order, not the title
      const base = f.name.replace(/\.[^.]+$/, '');
      const fn = R.meta.fromName(f.name), fn2 = R.meta.fromName(base.replace(TRACK_NO, '') + f.name.slice(base.length));
      if (meta.title === fn.title && fn2.title !== '未命名') {
        meta.title = fn2.title;
        if (fn.artist && meta.artist === fn.artist) meta.artist = fn2.artist || '';
      }
    }
    const id = old ? old.id : R.uid();
    const type = extra.type || mimeOf(f);
    await R.db.putAudio(id, await f.arrayBuffer(), type);
    try {
      let cover = 0, colors = null, c = null;
      const pic = extra.picture || meta.picture;
      if (pic && pic.data && pic.data.size !== 0 && (pic.data.length || pic.data.size) > 64) {
        try { c = await R.art.processCover(pic.data instanceof Blob ? pic.data : new Blob([pic.data], { type: pic.mime || 'image/jpeg' })); } catch (e) { console.warn('cover', e); }
      }
      if (!c && extra.folderArt) c = await extra.folderArt(); // no picture inside the song: the album picture next to it
      if (c) {
        try { await R.db.putBytes('covers', id, c.full); await R.db.putBytes('covers', id + ':t', c.thumb); cover = 1; colors = c.colors; }
        catch (e) { if (R.db.isFull(e)) throw e; console.warn('cover', e); }
      }
      const t = {
        id, key, title: meta.title, artist: meta.artist || '', album: meta.album || '', year: meta.year || '', genre: meta.genre || '',
        duration: meta.duration || 0, size: f.size, type, name: f.name || '', added, cover, colors,
        lyrics: meta.lyrics ? String(meta.lyrics).slice(0, 20000) : '', bpm: 0, energy: 0, an: 0, plays: 0,
      };
      if (lrc) t.lrc = lrc;
      if (extra.patch) Object.assign(t, extra.patch);
      if (!playable(type)) t.warn = 1;
      // a repaired song keeps its place in the library, its play count and its rhythm analysis
      if (old) for (const k of ['added', 'plays', 'an', 'bpm', 'energy', 'fav', 'lrc']) if (old[k] != null && !(k === 'lrc' && t.lrc)) t[k] = old[k];
      await R.db.put('tracks', t);
      tracks.set(id, t); byKey.set(key, id);
      if (old) { R.art.forget(id); bus.emit('track:update', t); }
      return { id, t, fixed: !!old };
    } catch (e) {
      // never leave the song's bytes behind without the song (they would only eat space)
      if (!old) await Promise.all([R.db.del('audio', id), R.db.del('covers', id), R.db.del('covers', id + ':t')]).catch(() => {});
      throw e;
    }
  }

  /* ---------- import ---------- */
  // a picked folder carries webkitRelativePath ("Album/CD1/01.mp3"); dropped folders come as { f, path }
  const junk = (p) => p.split('/').some((s) => s[0] === '.' || s === '__MACOSX'); // macOS "._" twins, .DS_Store, hidden folders, zip leftovers
  const extOf = (n) => (String(n || '').split('.').pop() || '').toUpperCase();
  const TRACK_NO = /^(\d{1,2}-)?\d{1,3}[\s._-]+(?=\S)/; // "02 ", "1-03 ", "07. "
  const OTHER = /\.(wma|ape|dsf|dff|wv|mka|tta|ac3|dts|mpc|ra|rm|amr|mid|midi)$/i; // music formats browsers cannot play at all
  const dirOf = (p) => (p.lastIndexOf('/') > 0 ? p.slice(0, p.lastIndexOf('/')) : '');

  // album pictures kept next to the songs (cover.jpg, folder.jpg, AlbumArt_…_Large.jpg …), for songs without a picture inside.
  // Looks in the song's folder, then one level up (Album/CD1 and Album/CD2 share Album/cover.jpg).
  function folderArt(items) {
    const IMG = /\.(jpe?g|png|webp)$/i;
    const rank = (name) => {
      const b = name.replace(/\.[^.]+$/, '').toLowerCase();
      if (/^(cover|folder|front)$/.test(b)) return 0;
      if (/^(album|albumart|artwork|art)$/.test(b) || /^albumart.*large$/.test(b)) return 1;
      if (/cover|front|folder/.test(b)) return 2;
      if (/^albumart.*small$/.test(b)) return 4;
      return 3;
    };
    const by = new Map();
    for (const x of items) {
      if (!IMG.test(x.f.name) || x.f.size < 1024 || x.f.size > 25e6) continue;
      const d = dirOf(x.path); if (!d) continue;
      if (!by.has(d)) by.set(d, []);
      by.get(d).push(x.f);
    }
    const best = new Map();
    for (const [d, fs] of by) {
      const r = fs.map((f) => [rank(f.name), f]).sort((a, b) => a[0] - b[0]);
      if (r[0][0] !== 3 || fs.length === 1) best.set(d, r[0][1]); // an unnamed picture only counts when it is the only one
    }
    const made = new Map(); // a few folders at a time: songs arrive folder by folder
    return (path) => {
      for (let d = dirOf(path), up = 0; d && up < 2; d = dirOf(d), up++) {
        if (!best.has(d)) continue;
        return () => {
          if (!made.has(d)) {
            made.set(d, R.art.processCover(best.get(d)).catch(() => null));
            while (made.size > 6) made.delete(made.keys().next().value);
          }
          return made.get(d);
        };
      }
      return null;
    };
  }

  let importing = false;
  // opts.signal.stop = true stops before the next song; running out of storage stops too (res.full = songs left)
  async function importFiles(files, onProgress, opts) {
    opts = opts || {};
    const items = Array.from(files || []).filter(Boolean).map((x) => (x.f ? x : { f: x, path: x.webkitRelativePath || x.name || '' }));
    const vis = items.filter((x) => !junk(x.path || x.f.name || ''));
    // inside a folder, video files (music videos, clips) are not songs even when they end in .mp4/.webm
    const audio = vis.filter((x) => (isAudio(x.f) || OTHER.test(x.f.name || '')) && !(x.path.includes('/') && /^video\//.test(x.f.type || '')));
    const cantPlay = (f) => OTHER.test(f.name || '') || !playable(mimeOf(f)); // formats this device cannot play: not worth the space
    const cant = audio.filter((x) => cantPlay(x.f));
    const list = audio.filter((x) => !cantPlay(x.f));
    if (list.some((x) => x.path.includes('/'))) list.sort((a, b) => coll.compare(a.path, b.path)); // folder order: 01, 02 … 10
    const res = { added: [], ids: [], paths: [], dup: 0, fixed: 0, lyr: 0, failed: [], warn: 0, total: list.length, cant: cant.length, cantExt: Array.from(new Set(cant.map((x) => extOf(x.f.name)))), stopped: 0, full: 0 };
    if (!list.length) return res;
    const art = folderArt(vis);
    // .lrc lyric files beside the songs: same folder, same name
    const lrcs = new Map();
    for (const x of vis) if (/\.lrc$/i.test(x.f.name) && x.f.size < 600e3) lrcs.set(x.path.replace(/\.lrc$/i, '').toLowerCase(), x.f);
    const lrcOf = (path) => lrcs.get(path.replace(/\.[^./]+$/, '').toLowerCase()) || null;
    // folders whose songs are all named "01 …", "02 …": those numbers come off the titles
    const names = new Map();
    for (const x of list) { const d = dirOf(x.path); if (d) { if (!names.has(d)) names.set(d, []); names.get(d).push(x.f.name); } }
    const numbered = new Set(Array.from(names).filter(([, ns]) => ns.length >= 2 && ns.every((n) => /^(\d{1,2}-)?\d{1,3}[\s._-]+\S/.test(n.replace(/\.[^.]+$/, '')))).map(([d]) => d));
    const t0 = Date.now() + list.length;
    let shown = 0;
    importing = true;
    try {
      for (let k = 0; k < list.length; k++) {
        if (opts.signal && opts.signal.stop) { res.stopped = list.length - k; break; }
        const { f, path } = list[k];
        if (onProgress) onProgress({ i: k, n: list.length, name: f.name });
        try {
          const r = await addOne(f, t0 - k, { folderArt: art(path), trackNo: numbered.has(dirOf(path)), lrcFile: lrcOf(path) });
          res.ids.push(r.id); res.paths.push(path);
          if (r.lyr) res.lyr++;
          if (r.dup) { res.dup++; continue; }
          if (r.fixed) { res.fixed++; continue; }
          res.added.push(r.id);
          if (r.t.warn) res.warn++;
          R.analysis.enqueue(r.id);
          if (Date.now() - shown > 800) { shown = Date.now(); bus.emit('library'); }
        } catch (e) {
          if (R.db.isFull(e)) { res.full = list.length - k; break; }
          console.error('import failed', f.name, e); res.failed.push(f.name);
        }
      }
    } finally { importing = false; }
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

  /* ---------- 我的最愛: every song with a heart, newest heart first; behaves like a playlist ---------- */
  const favIds = () => Array.from(tracks.values()).filter((t) => t.fav).sort((a, b) => b.fav - a.fav).map((t) => t.id);
  const favPL = () => ({ id: 'fav', name: '我的最愛', ids: favIds(), skin: R.settings.get('favSkin') || null, created: 0, virtual: true });
  async function setFav(id, on) {
    const t = tracks.get(id); if (!t) return;
    await update(id, { fav: on ? Date.now() : 0 });
    bus.emit('fav', t); bus.emit('playlists');
  }

  const pl = {
    all: () => playlists.slice(),
    get: (id) => (id === 'fav' ? favPL() : playlists.find((p) => p.id === id) || null),
    async create(name, ids) {
      const p = { id: R.uid(), name: (name || '').trim() || '新歌單', ids: (ids || []).slice(), skin: null, created: Date.now() };
      playlists.push(p); await R.db.put('playlists', p); bus.emit('playlists'); return p;
    },
    async save(p) {
      if (p.id === 'fav') { R.settings.set('favSkin', p.skin || null); bus.emit('playlists'); return; }
      await R.db.put('playlists', p); bus.emit('playlists');
    },
    async remove(id) { if (id === 'fav') return; playlists = playlists.filter((p) => p.id !== id); await R.db.del('playlists', id).catch(() => {}); bus.emit('playlists'); },
    async add(id, trackIds) {
      if (id === 'fav') { let n = 0; for (const t of trackIds) { const x = tracks.get(t); if (x && !x.fav) { await setFav(t, true); n++; } } return n; }
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

  return { load, get, count, list, update, importFiles, addDemo, remove, pl, isAudio, wipe, setFav, importing: () => importing, all: () => Array.from(tracks.values()) };
})();
