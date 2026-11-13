/* ===================== player: queue, two playback engines, lock screen =====================
   Music always plays from a plain <audio> element (never through Web Audio), which is what iPhone keeps
   alive on the lock screen. Moving to the next song while the phone is locked is the fragile part on
   iPhone, so there are two ways of doing it:
     single — one <audio>; when a song ends its source is swapped for the next one
     dual   — two <audio>; the next song is loaded in the spare one ahead of time and started just before
              the current one ends, so the audio session never goes quiet
   "auto" starts with single and switches to dual by itself if a locked-screen hand-over is seen to fail. */
R.player = (() => {
  const { bus, settings } = R;
  const S = { base: [], ids: [], i: -1, tid: null, playing: false, shuffle: !!settings.get('shuffle'), repeat: settings.get('repeat') || 'all', source: { type: 'library' }, dur: 0 };
  const box = document.getElementById('decks');
  const mk = () => { const a = document.createElement('audio'); a.preload = 'auto'; a.setAttribute('playsinline', ''); a.setAttribute('webkit-playsinline', ''); box.appendChild(a); return a; };
  const els = [mk(), mk()];
  let act = 0, tok = 0, switching = 0, userPauseAt = 0, unlocked = false, lastSave = 0, countedFor = null;
  const cur = () => els[act];
  const idle = () => els[1 - act];
  const urls = new Map();
  const engine = () => { const e = settings.get('engine'); return e === 'auto' ? settings.get('engineAuto') || 'single' : e; };

  /* ---------- silent clip used to unlock both decks on the first tap ---------- */
  const SILENT = (() => {
    const n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) b[44 + i] = 128;
    let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return 'data:audio/wav;base64,' + btoa(s);
  })();
  // iPhone only lets a deck start by itself (next song, lock screen) after it has once been started
  // from a tap. On the first tap anywhere both empty decks play a moment of silence; a deck that
  // already holds a restored song is unlocked when it is played, or primed when a new song is picked.
  function blessSilently(el) {
    clearSeek(el); delete el.dataset.tid;
    el.src = SILENT;
    const p = el.play();
    const back = () => { if (el.src === SILENT) { el.pause(); el.removeAttribute('src'); try { el.load(); } catch (e) { /* ignore */ } } };
    if (p && p.then) p.then(() => { el._blessed = true; back(); }, back); else back();
  }
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    for (const el of els) if (!el.getAttribute('src')) blessSilently(el);
  }
  // call synchronously inside a tap handler, before an async song change
  function prime() { const el = cur(); if (!el._blessed && el.paused) blessSilently(el); }
  function clearSeek(el) { if (el._seekFn) { el.removeEventListener('loadedmetadata', el._seekFn); el._seekFn = null; } }

  /* ---------- links for the current, next and previous songs ----------
     blob: links normally; data: links once a blob: link has failed and the same song then played (some iPhone
     web views, the Claude app among them, refuse blob: links for music) */
  const srcMode = () => settings.get('srcMode') || 'blob';
  async function urlFor(id) {
    if (urls.has(id)) return urls.get(id);
    const blob = await R.db.getAudio(id);
    if (!blob) throw new Error('missing audio');
    const u = srcMode() === 'data' ? await R.dataURL(blob) : URL.createObjectURL(blob);
    if (urls.has(id)) { R.dropURL(u); return urls.get(id); }
    urls.set(id, u);
    return u;
  }
  function trimUrls() {
    const keep = new Set([S.tid, S.ids[nextIndex(true)], S.ids[prevIndex()], els[0].dataset.tid, els[1].dataset.tid]);
    for (const [id, u] of urls) if (!keep.has(id)) { R.dropURL(u); urls.delete(id); }
  }

  /* ---------- sleep timer: minutes from now, or 'end' (stop when this song ends); 0 turns it off ---------- */
  let sleepAt = 0, sleepEnd = false;
  const sleepInfo = () => ({ at: sleepAt, end: sleepEnd });
  function setSleep(v) {
    sleepAt = typeof v === 'number' && v > 0 ? Date.now() + v * 60000 : 0;
    sleepEnd = v === 'end';
    if (sleepEnd) for (const el of els) el.loop = false;
    bus.emit('sleep', sleepInfo());
  }
  function sleepNow() {
    sleepAt = 0; sleepEnd = false;
    S.playing = false; for (const el of els) el.pause(); emitState(); saveSession();
    bus.emit('sleep', sleepInfo());
    R.toast('睡眠定時到了，晚安 🌙', { ms: 5000 });
  }

  /* ---------- songs that will not play ----------
     A song that fails is skipped, but three failures in a row stop the music and explain, instead of running
     through the whole library. auto: the player moved on by itself (true) or the song was picked (false). */
  let fails = 0, explained = false;
  const viaData = new Set();
  function failed(id, err, auto) {
    const t = R.lib.get(id), name = `《${(t && t.title) || '這首'}》`;
    const lost = !!(err && err.lost);
    if (t) R.lib.update(id, lost ? { lost: 1 } : { warn: 1 });
    fails++;
    const goOn = auto && fails < 3 && S.ids.length > 1;
    if (!goOn) { S.playing = false; for (const el of els) el.pause(); emitState(); }
    if (fails >= 3 && !explained) { explained = true; explain(lost); }
    else R.toast(lost ? `${name}的檔案讀不到了${goOn ? '，跳下一首' : '：把它重新匯入一次就會補回'}` : `${name}這台裝置播不了${goOn ? '，跳下一首' : ''}`, { ms: goOn ? 3000 : 4500 });
    return goOn;
  }
  function explain(lost) {
    if (R.CLAUDE) {
      R.ui.notice({
        title: '這裡播不了存進來的歌',
        sub: '連續好幾首都打不開。Claude App 裡的這一份常常讀不到存進來的音樂檔，也不能鎖屏一直聽。請改用網頁版：用 Safari 打開下面的網址，按「分享 → 加入主畫面」，再從主畫面打開、把資料夾匯入一次。',
        link: { href: R.WEB_URL, label: '打開網頁版' },
      });
    } else if (lost) {
      R.ui.notice({ title: '這些歌的檔案讀不到了', sub: '可能是系統清掉了一部分儲存空間。把同一個資料夾（或同幾首歌）再匯入一次就會補回來，原本好好的歌會自動跳過。' });
    } else {
      R.ui.notice({ title: '連續好幾首都播不了', sub: '可能是這台裝置不支援這些檔案的格式，或檔案本身壞了。可以換幾首試試，或先轉成 MP3、M4A 再匯入。' });
    }
  }
  // a blob: link that would not play: open the same song as a data: link; if it plays, use data: links from now on
  async function retryAsData(el, id) {
    let du;
    try { du = await R.dataURL(await R.db.getAudio(id)); } catch (e) { if (failed(id, e, S.playing)) setTimeout(() => advance('error'), 800); return; }
    if (el.dataset.tid !== id || el !== cur()) return;
    const ok = () => {
      el.removeEventListener('loadedmetadata', ok);
      if (el.dataset.tid !== id || srcMode() === 'data') return;
      settings.set('srcMode', 'data');
      for (const [k2, u] of urls) if (u.startsWith('blob:')) { R.dropURL(u); urls.delete(k2); }
      const b = idle(); if (b.paused && b.dataset.tid && b.dataset.tid !== id) { b.removeAttribute('src'); delete b.dataset.tid; }
      prepare();
    };
    el.addEventListener('loadedmetadata', ok);
    const old = urls.get(id); urls.set(id, du); R.dropURL(old);
    el.src = du;
    if (S.playing) tryPlay(el);
  }

  /* ---------- queue ---------- */
  function shuffled(arr, first) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (first) { const k = a.indexOf(first); if (k > 0) { a.splice(k, 1); a.unshift(first); } }
    return a;
  }
  function setQueue(base, startId, source) {
    S.base = base.slice(); S.source = source || { type: 'library' };
    S.ids = S.shuffle ? shuffled(S.base, startId) : S.base.slice();
    S.i = Math.max(0, S.ids.indexOf(startId));
    bus.emit('queue'); bus.emit('source', S.source);
  }
  function nextIndex(auto) {
    if (!S.ids.length) return null;
    if (S.i + 1 < S.ids.length) return S.i + 1;
    if (S.repeat === 'all' || !auto) return 0;
    return null;
  }
  function prevIndex() { if (!S.ids.length) return null; return S.i > 0 ? S.i - 1 : S.ids.length - 1; }

  /* ---------- core playback ---------- */
  function tryPlay(el) {
    const p = el.play();
    if (p && p.catch) p.catch((err) => {
      if (err && err.name === 'NotAllowedError') { S.playing = false; emitState(); R.toast('點一下播放鍵就能開始'); }
      else if (err && err.name !== 'AbortError') console.warn('play()', err);
    });
  }
  function markSwitch() { switching = performance.now(); }
  const isSwitching = () => performance.now() - switching < 1500;

  async function setTrack(id) {
    S.tid = id;
    const t = R.lib.get(id);
    S.dur = (t && t.duration) || 0;
    bus.emit('track', t);
    msMeta(t);
    saveSession();
    // the song being played is measured first (also when it was measured by an older version: the new beat grid)
    if (t && (!t.an || R.analysis.stale(t))) R.analysis.enqueue(id, true);
  }

  async function playIndex(i, opts) {
    opts = opts || {};
    if (i == null || i < 0 || i >= S.ids.length) return;
    const id = S.ids[i]; const my = ++tok;
    S.i = i;
    const wasOther = idle();
    setTrack(id);
    let u;
    try { u = await urlFor(id); } catch (e) { if (my === tok) failed(id, e, false); return; }
    if (my !== tok) return;
    if (!wasOther.paused) wasOther.pause();
    const el = cur();
    markSwitch();
    el.loop = S.repeat === 'one' && !sleepEnd;
    if (el.dataset.tid !== id || !el.getAttribute('src') || el.src !== u) { clearSeek(el); el.src = u; el.dataset.tid = id; }
    if (opts.at > 0) seekWhenReady(el, opts.at);
    else if (el.currentTime > 0.05 && opts.restart !== false) { try { el.currentTime = 0; } catch (e) { /* ignore */ } }
    if (opts.autoplay === false) { S.playing = false; emitState(); }
    else { S.playing = true; emitState(); tryPlay(el); }
    prepare();
  }
  function seekWhenReady(el, at) {
    clearSeek(el);
    if (el.readyState >= 1 && el.src !== SILENT) { try { el.currentTime = at; } catch (e) { /* ignore */ } return; }
    const f = () => { if (el.src === SILENT) return; clearSeek(el); try { el.currentTime = at; } catch (e) { /* ignore */ } };
    el._seekFn = f; el.addEventListener('loadedmetadata', f);
  }

  // automatic move to the next song (song ended, or about to end while the screen is off)
  function advance(why) {
    const j = nextIndex(true);
    if (j == null) { S.playing = false; emitState(); bus.emit('ended'); return; }
    const id = S.ids[j];
    const hidden = document.hidden;
    if (hidden) diag.begin(id, engine(), why);
    S.i = j;
    const u = urls.get(id);
    if (!u) { urlFor(id).then((x) => handoff(id, x)).catch((e) => { if (failed(id, e, true)) advance('skip'); }); setTrack(id); return; }
    setTrack(id);
    handoff(id, u);
  }
  function handoff(id, u) {
    markSwitch();
    if (engine() === 'dual') {
      const a = cur(), b = idle();
      clearSeek(b);
      if (b.dataset.tid !== id || b.src !== u) { b.src = u; b.dataset.tid = id; }
      else { try { b.currentTime = 0; } catch (e) { /* ignore */ } }
      b.loop = S.repeat === 'one' && !sleepEnd;
      act = 1 - act;
      S.playing = true;
      tryPlay(b);
      setTimeout(() => { if (cur() !== a) a.pause(); }, 120);
    } else {
      const el = cur();
      clearSeek(el);
      el.src = u; el.dataset.tid = id; el.loop = S.repeat === 'one' && !sleepEnd;
      S.playing = true;
      tryPlay(el);
    }
    emitState();
    prepare();
  }

  // get the neighbours ready: URLs always; in dual mode the next song is loaded into the spare deck
  async function prepare() {
    const ids = [S.ids[nextIndex(true)], S.ids[prevIndex()]].filter(Boolean);
    for (const id of ids) { try { await urlFor(id); } catch (e) { /* ignore */ } }
    if (engine() === 'dual') {
      const j = nextIndex(true);
      if (j != null) {
        const id = S.ids[j]; const b = idle();
        if (b.dataset.tid !== id && urls.has(id) && b.paused) { b.src = urls.get(id); b.dataset.tid = id; b.preload = 'auto'; try { b.load(); } catch (e) { /* ignore */ } }
      }
    }
    trimUrls();
  }

  function play() {
    const el = cur();
    if (!el.getAttribute('src') || !S.tid) {
      if (S.ids.length) return playIndex(Math.max(0, S.i));
      const all = R.lib.list(); if (all.length) { setQueue(all.map((t) => t.id), all[0].id, { type: 'library' }); return playIndex(0); }
      return;
    }
    S.playing = true; emitState(); tryPlay(el);
  }
  function pause() { userPauseAt = Date.now(); S.playing = false; cur().pause(); emitState(); saveSession(); }
  function toggle() { if (S.playing && !cur().paused) pause(); else if (S.playing && cur().paused) { tryPlay(cur()); } else play(); }
  function next() { const j = nextIndex(false); if (j != null) playIndex(j); }
  function prev() { if (cur().currentTime > 3.5) { seek(0); return; } const j = prevIndex(); if (j != null) playIndex(j); }
  function seek(t) {
    const el = cur(); const d = el.duration || S.dur;
    if (!isFinite(t)) return;
    t = Math.max(0, d ? Math.min(t, d - 0.05) : t);
    try { el.currentTime = t; } catch (e) { /* ignore */ }
    bus.emit('seek', t); updatePos();
  }
  function setShuffle(on) {
    S.shuffle = !!on; settings.set('shuffle', S.shuffle);
    const id = S.tid;
    S.ids = S.shuffle ? shuffled(S.base, id) : S.base.slice();
    S.i = Math.max(0, S.ids.indexOf(id));
    bus.emit('queue'); emitState(); prepare();
  }
  function cycleRepeat() {
    S.repeat = S.repeat === 'all' ? 'one' : S.repeat === 'one' ? 'off' : 'all';
    settings.set('repeat', S.repeat);
    for (const el of els) el.loop = false;
    cur().loop = S.repeat === 'one' && !sleepEnd;
    emitState(); prepare();
    return S.repeat;
  }
  function playFrom(base, startId, source, opts) { setQueue(base, startId, source); return playIndex(S.i, opts); }
  function playNext(id) {
    if (!S.ids.length) { playFrom([id], id, { type: 'library' }); return; }
    const rm = (a, k) => { const x = a.indexOf(id); if (x >= 0 && x !== k) a.splice(x, 1); };
    rm(S.ids, S.i); S.i = S.ids.indexOf(S.tid);
    S.ids.splice(S.i + 1, 0, id);
    if (!S.base.includes(id)) S.base.push(id);
    bus.emit('queue'); prepare(); saveSession();
  }
  function jump(k) { if (k >= 0 && k < S.ids.length) playIndex(k); }
  function removed(ids) {
    const gone = new Set(ids);
    const wasCur = gone.has(S.tid);
    S.base = S.base.filter((x) => !gone.has(x));
    const before = S.ids.slice(0, S.i).filter((x) => !gone.has(x)).length;
    S.ids = S.ids.filter((x) => !gone.has(x));
    for (const id of ids) if (urls.has(id)) { const u = urls.get(id); urls.delete(id); setTimeout(() => R.dropURL(u), 3000); }
    if (wasCur) {
      for (const el of els) { el.pause(); el.removeAttribute('src'); delete el.dataset.tid; try { el.load(); } catch (e) { /* ignore */ } }
      S.tid = null; S.playing = false;
      if (S.ids.length) playIndex(Math.min(before, S.ids.length - 1), { autoplay: false });
      else { S.i = -1; bus.emit('track', null); emitState(); }
    } else S.i = Math.max(0, S.ids.indexOf(S.tid));
    bus.emit('queue'); saveSession();
  }

  /* ---------- events from both decks ---------- */
  els.forEach((el, k) => {
    el.addEventListener('playing', () => {
      if (el.src === SILENT) return;
      el._blessed = true;
      if (k !== act) return;
      S.playing = true; diag.ok(el.dataset.tid); emitState(); updatePos();
      fails = 0;
      { const t = R.lib.get(el.dataset.tid); if (t && (t.warn || t.lost)) R.lib.update(t.id, { warn: 0, lost: 0 }); }
      if (countedFor !== el.dataset.tid) { countedFor = el.dataset.tid; const t = R.lib.get(countedFor); if (t) R.lib.update(t.id, { plays: (t.plays || 0) + 1, last: Date.now() }); }
      prepare();
    });
    el.addEventListener('pause', () => {
      if (k !== act || el.ended || isSwitching() || el.src === SILENT) return;
      if (S.playing && document.hidden && Date.now() - userPauseAt > 1500) diag.note('bgpause');
      S.playing = false; emitState(); updatePos(); saveSession();
    });
    el.addEventListener('ended', () => { if (k !== act || el.src === SILENT) return; if (sleepEnd) { sleepNow(); return; } if (S.repeat === 'one') { el.currentTime = 0; tryPlay(el); return; } advance('ended'); });
    el.addEventListener('timeupdate', () => {
      if (k !== act || el.src === SILENT) return;
      // the sleep timer is checked here: timeupdate keeps coming while the screen is locked, timers may not
      if (sleepAt && Date.now() >= sleepAt) { sleepNow(); return; }
      const d = el.duration;
      if (d && isFinite(d)) {
        if (Math.abs(d - S.dur) > 0.5) { S.dur = d; bus.emit('duration', d); }
        // with the screen off, the dual engine starts the next song a hair before this one ends
        if (document.hidden && engine() === 'dual' && S.repeat !== 'one' && !isSwitching() && !sleepEnd) {
          const rem = d - el.currentTime;
          if (rem > 0 && rem < 0.42 && nextIndex(true) != null) advance('near-end');
        }
      }
      const now = Date.now();
      if (now - lastSave > 5000) { lastSave = now; saveSession(); }
    });
    el.addEventListener('loadedmetadata', () => { if (k !== act || el.src === SILENT) return; if (isFinite(el.duration)) { S.dur = el.duration; bus.emit('duration', S.dur); const t = R.lib.get(el.dataset.tid); if (t && Math.abs((t.duration || 0) - el.duration) > 2 && el.duration > 1) R.lib.update(t.id, { duration: el.duration }); } updatePos(); });
    el.addEventListener('error', () => {
      if (k !== act || !el.dataset.tid || el.src === SILENT || !el.getAttribute('src')) return;
      const id = el.dataset.tid;
      if (el.src.startsWith('blob:') && !viaData.has(id)) { viaData.add(id); retryAsData(el, id); return; }
      if (!S.playing) { failed(id, el.error, false); return; }
      if (failed(id, el.error, true)) setTimeout(() => advance('error'), 800);
    });
  });

  /* ---------- lock screen (Media Session) ---------- */
  const ms = 'mediaSession' in navigator ? navigator.mediaSession : null;
  if (ms) {
    const h = (a, f) => { try { ms.setActionHandler(a, f); } catch (e) { /* unsupported action */ } };
    h('play', () => { play(); });
    h('pause', () => { pause(); });
    h('previoustrack', () => prev());
    h('nexttrack', () => next());
    h('seekto', (d) => { if (d && isFinite(d.seekTime)) seek(d.seekTime); });
    h('stop', () => pause());
    // no seekbackward/seekforward: on iPhone they would replace the previous/next buttons
  }
  let artTok = 0;
  async function msMeta(t) {
    if (!ms || !t) return;
    const my = ++artTok;
    const meta = (art) => new MediaMetadata(Object.assign({ title: t.title, artist: t.artist || '耳目一新', album: t.album || '' }, art ? { artwork: [art] } : {}));
    try {
      ms.metadata = meta(null);
      const u = await R.art.coverUrl(t, 'full');
      if (u && S.tid === t.id && my === artTok) ms.metadata = meta({ src: u, sizes: '512x512', type: 'image/jpeg' });
      // a moment later the cover is swapped for a card in the style of the skin being worn
      if (R.poster && settings.get('lockArt') !== false) {
        setTimeout(async () => {
          if (my !== artTok || S.tid !== t.id) return;
          const c = await R.poster.lock(t).catch(() => null);
          if (c && my === artTok && S.tid === t.id) ms.metadata = meta({ src: c, sizes: '600x600', type: 'image/jpeg' });
        }, document.hidden ? 50 : 1900);
      }
    } catch (e) { /* ignore */ }
  }
  function updatePos() {
    if (!ms) return;
    try {
      ms.playbackState = S.playing ? 'playing' : 'paused';
      const d = cur().duration || S.dur;
      if (d && isFinite(d) && ms.setPositionState) ms.setPositionState({ duration: d, playbackRate: 1, position: Math.max(0, Math.min(cur().currentTime || 0, d)) });
    } catch (e) { /* ignore */ }
  }

  /* ---------- diagnostics for locked-screen hand-overs ---------- */
  const diag = {
    pend: null,
    log: [],
    async load() { try { const l = await R.db.get('kv', 'diag'); if (Array.isArray(l)) this.log = l; } catch (e) { /* ignore */ } },
    save() { R.db.put('kv', this.log.slice(-30), 'diag').catch(() => {}); },
    begin(to, eng, why) { this.pend = { at: Date.now(), to, eng, why, ok: null }; this.log.push(this.pend); if (this.log.length > 30) this.log.shift(); },
    ok(tid) { if (this.pend && this.pend.to === tid) { this.pend.ok = true; this.pend.ms = Date.now() - this.pend.at; this.pend = null; this.save(); } },
    note(kind) { this.log.push({ at: Date.now(), kind, eng: engine() }); if (this.log.length > 30) this.log.shift(); this.save(); },
    check() {
      const p = this.pend;
      if (!p || Date.now() - p.at < 3500) return;
      if (!cur().paused && cur().dataset.tid === p.to) { this.ok(p.to); return; }
      p.ok = false; this.pend = null; this.save();
      failover(p);
    },
    stats() {
      const tr = this.log.filter((x) => x.to);
      return { total: tr.length, ok: tr.filter((x) => x.ok).length, fail: tr.filter((x) => x.ok === false).length, bgpause: this.log.filter((x) => x.kind === 'bgpause').length, recent: this.log.slice(-8).reverse() };
    },
  };
  function failover(p) {
    const resume = { label: '繼續播放', fn: () => { const k = S.ids.indexOf(p.to); playIndex(k >= 0 ? k : S.i); } };
    if (settings.get('engine') === 'auto' && settings.get('engineAuto') !== 'dual') {
      settings.set('engineAuto', 'dual');
      R.toast('剛剛鎖屏時沒接上下一首，已自動改用「雙軌接力」連播', { action: resume, ms: 9000 });
    } else if (!settings.get('engineWarned')) {
      settings.set('engineWarned', true);
      R.toast('這台手機鎖屏時換歌不太穩：可以先用單曲循環，或在設定裡換連播方式', { action: resume, ms: 9000 });
    } else R.toast('鎖屏時沒接上下一首', { action: resume });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { saveSession.flush && saveSession.flush(); return; }
    setTimeout(() => diag.check(), 600);
    // the system may have paused us while we were away (call, Siri, another app)
    setTimeout(() => {
      if (S.playing && cur().paused && !isSwitching()) { S.playing = false; emitState(); }
      updatePos();
    }, 900);
  });

  /* ---------- state out ---------- */
  function emitState() {
    bus.emit('state', { playing: S.playing, shuffle: S.shuffle, repeat: S.repeat });
    updatePos();
  }
  const saveSession = R.debounce(() => {
    R.db.put('kv', { base: S.base, ids: S.ids, i: S.i, tid: S.tid, t: cur().currentTime || 0, source: S.source, shuffle: S.shuffle }, 'session').catch(() => {});
  }, 600);
  window.addEventListener('pagehide', () => saveSession.flush());

  async function restore() {
    await diag.load();
    let s = null;
    try { s = await R.db.get('kv', 'session'); } catch (e) { /* ignore */ }
    if (!s || !s.tid || !R.lib.get(s.tid)) return false;
    const ok = (id) => !!R.lib.get(id);
    S.base = (s.base || []).filter(ok); S.ids = (s.ids || []).filter(ok);
    if (!S.ids.includes(s.tid)) { S.ids.unshift(s.tid); S.base.unshift(s.tid); }
    S.source = s.source || { type: 'library' };
    S.i = S.ids.indexOf(s.tid);
    await playIndex(S.i, { autoplay: false, at: s.t || 0 });
    bus.emit('queue'); bus.emit('source', S.source);
    return true;
  }

  function setVolume(v) { for (const el of els) el.volume = v; }
  setVolume(settings.get('volume') == null ? 1 : settings.get('volume'));

  return {
    S, els, unlock, prime, play, pause, toggle, next, prev, seek, setShuffle, cycleRepeat, playFrom, playIndex, playNext, jump, removed, restore, setVolume, setSleep, sleep: sleepInfo,
    refreshMeta: () => msMeta(R.lib.get(S.tid)),
    engine, diag, SILENT,
    current: () => R.lib.get(S.tid),
    time: () => cur().currentTime || 0,
    duration: () => { const d = cur().duration; return d && isFinite(d) ? d : S.dur || 0; },
    isPlaying: () => S.playing && !cur().paused,
    wants: () => S.playing,
    queue: () => S.ids.slice(), index: () => S.i, source: () => S.source,
    upNext: () => { const j = nextIndex(true); return j == null ? null : R.lib.get(S.ids[j]); },
  };
})();
