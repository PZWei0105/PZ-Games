/* ───────── 說書：有預錄音軌就放音軌（鎖屏、背景都能聽），沒有就用這台裝置的語音逐句唸 ───────── */
const Narrator = (() => {
  const audio = new Audio(); audio.preload = 'auto';
  const synth = window.speechSynthesis || null;
  let st = null;             // { book, ci, mode, units, blocks, ui, playing, ready, tok }
  let sess = 0, utok = 0, tickId = 0, sleepAt = 0, sleepCh = false, wake = null, voices = [], lastSave = 0, artCache = {};
  const STRIP = /[「」『』“”‘’《》〈〉【】〔〕]/g;

  /* ── 語音清單（裝置語音模式用） ── */
  function loadVoices() {
    if (!synth) return [];
    const score = (v) => (/natural|neural|online/i.test(v.name) ? 60 : 0) + (/premium|enhanced|高音質|優化|加強|siri/i.test(v.name) ? 30 : 0) + (/zh[-_]TW|Taiwan|臺灣|台灣/i.test(v.lang + v.name) ? 20 : /zh[-_]CN|cmn/i.test(v.lang) ? 8 : 0) + (v.default ? 2 : 0);
    voices = synth.getVoices().filter((v) => /^(zh|cmn)/i.test(v.lang) && !/HK|yue|粵|粤|Cantonese/i.test(v.lang + ' ' + v.name)).map((v) => ({ v, score: score(v) })).sort((a, b) => b.score - a.score).map((x) => x.v);
    return voices;
  }
  if (synth) { loadVoices(); if (synth.addEventListener) synth.addEventListener('voiceschanged', () => { loadVoices(); emit(); }); }
  const pickVoice = () => voices.find((v) => v.voiceURI === Settings.voice) || voices[0] || null;
  const hasTrack = (book, i) => { const c = book.chapters[i]; return !!(book.remote && c && c.au && (!c.au.text || c.au.text === c.v)); };
  const canSpeak = () => !!synth && (voices.length > 0 || loadVoices().length > 0);

  /* 沒有時間軸時自己切：短句併一併，唸起來比較順 */
  function buildUnits(blocks) {
    const out = [];
    blocks.forEach((b, bi) => {
      if (b.t === 'br') { if (out.length) out[out.length - 1].gap = 900; return; }
      if (b.t !== 'p' && b.t !== 'q' && b.t !== 'h') return;
      const ss = sentences(b.x); let i = 0;
      while (i < ss.length) {
        let a = ss[i][0], e = ss[i][1];
        while (e - a < 12 && i + 1 < ss.length && ss[i + 1][1] - a <= 90) { i++; e = ss[i][1]; }
        out.push({ b: bi, s: a, e, gap: 0 }); i++;
      }
      if (out.length) out[out.length - 1].gap = Math.max(out[out.length - 1].gap, b.t === 'h' ? 500 : 180);
    });
    return out;
  }
  function unitAt(a) {
    if (!a || a.b < 0) return 0;
    const u = st.units; for (let i = 0; i < u.length; i++) if (u[i].b > a.b || (u[i].b === a.b && u[i].e > (a.s || 0))) return i;
    return Math.max(0, u.length - 1);
  }
  const textOf = (i) => { const u = st && st.units[i]; if (!u) return ''; const b = st.blocks[u.b]; return b && b.x ? b.x.slice(u.s, u.e) : ''; };

  /* ── 開始 ── */
  async function start(book, ci, anchor) {
    if (!hasTrack(book, ci) && !canSpeak()) { toast('這台裝置沒有中文語音可以朗讀；有預錄音軌的章節才能聽', { kind: 'bad' }); return false; }
    halt();
    const my = ++sess, track = hasTrack(book, ci);
    st = { book, ci, mode: track ? 'track' : 'speech', units: [], blocks: [], ui: 0, playing: true, ready: false, tok: ++utok, head: !anchor || anchor.b < 0 };
    // 這一步要在手指點下去的當下做，手機才准許之後自己接著播
    if (track) { audio.muted = true; audio.src = Lib.audioURL(book, ci); audio.playbackRate = Settings.rate; audio.play().catch(() => {}); }
    else if (synth) { try { synth.cancel(); const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) {} }
    emit();
    let data, tl = null;
    try { [data, tl] = await Promise.all([Lib.chapter(book, ci), track ? Lib.timeline(book, ci) : null]); } catch (e) { if (my === sess) { toast(esc(e.message || '讀不到這一章'), { kind: 'bad' }); stop(); } return false; }
    if (my !== sess) return false;
    st.blocks = data.blocks;
    if (track && tl && tl.units && tl.units.length) st.units = tl.units.map((u) => ({ b: u[0], s: u[1], e: u[2], t0: u[3], t1: u[4] }));
    else {
      st.units = buildUnits(data.blocks);
      if (track) { st.mode = 'speech'; audio.pause(); audio.removeAttribute('src'); if (!canSpeak()) { toast('音軌的時間軸載入失敗', { kind: 'bad' }); stop(); return false; } }
    }
    if (!st.units.length) { toast('這一章沒有可以唸的文字'); stop(); return false; }
    st.ui = unitAt(anchor); st.ready = true;
    if (st.mode === 'track') {
      const seek = () => { if (my !== sess) return; const to = st.head && st.ui === 0 ? 0 : st.units[st.ui].t0; jump(to); audio.muted = false; if (st.playing) audio.play().catch(() => { st.playing = false; emit(); }); };
      if (audio.readyState >= 1) seek(); else audio.addEventListener('loadedmetadata', seek, { once: true });
      session();
    } else { Sound.knock(); keepAwake(true); setTimeout(() => { if (my === sess && st && st.playing) speak(st.head && st.ui === 0); }, 380); session(); }
    setMark(); ticker(true); emit();
    return true;
  }

  /* ── 裝置語音 ── */
  function clean(s) { return s.replace(STRIP, '').replace(/[—─－]{2,}/g, '，').replace(/[…⋯]{2,}/g, '…'); }
  function speak(withHead) {
    if (!st || st.mode !== 'speech' || !synth) return;
    const my = st.tok, u = st.units[st.ui];
    if (!u) return finished();
    const ch = st.book.chapters[st.ci];
    const text = withHead ? (ch.label || '') + '，' + (ch.name || '') + '。' : clean(textOf(st.ui));
    if (!/[一-鿿A-Za-z0-9]/.test(text)) { st.ui++; return speak(); }
    const ut = new SpeechSynthesisUtterance(text), v = pickVoice();
    if (v) { ut.voice = v; ut.lang = v.lang; } else ut.lang = 'zh-TW';
    ut.rate = clamp(Settings.rate, .5, 2);
    let doneOnce = false;
    const next = () => { if (doneOnce || !st || st.tok !== my || !st.playing) return; doneOnce = true; const gap = withHead ? 600 : (u.gap || 0); if (!withHead) st.ui++; if (st.ui >= st.units.length) return finished(); if (!withHead) { setMark(); emit(); } setTimeout(() => { if (st && st.tok === my && st.playing) speak(); }, gap); };
    ut.onend = next;
    ut.onerror = (e) => { if (e.error === 'interrupted' || e.error === 'canceled') return; next(); };
    st.utt = ut;        // 留著參考，不然有些瀏覽器唸完不會通知
    try { synth.speak(ut); } catch (e) { next(); }
    if (!withHead) setMark();
  }

  /* ── 目前唸到哪 ── */
  function setMark() {
    if (!st || !st.ready) return;
    const u = st.units[st.ui]; if (!u) return;
    Reader.mark({ bookId: st.book.id, ci: st.ci, b: u.b, s: u.s, e: u.e });
    const now = Date.now();
    if (now - lastSave > 4000 && !(Reader.isOpen() && Reader.book && Reader.book.id === st.book.id && Reader.following)) {
      lastSave = now; const ch = st.book.chapters[st.ci];
      Prog.set(st.book.id, { ck: Lib.ck(st.book, ch, st.ci), b: u.b, s: u.s, x: textOf(st.ui).slice(0, 44), f: st.units.length > 1 ? st.ui / (st.units.length - 1) : 1 });
    }
  }
  /* 跳到某個時間。有些手機要等音檔載一點才肯跳，所以記住目標，沒跳成就再跳一次 */
  function jump(to) { if (!st) return; st.want = to > .3 ? { t: to, n: 0 } : null; try { audio.currentTime = to; } catch (e) {} }
  function syncTrack() {
    if (!st || st.mode !== 'track' || !st.ready) return;
    if (st.want) { if (Math.abs(audio.currentTime - st.want.t) < 4 || st.want.n > 12) st.want = null; else { st.want.n++; try { audio.currentTime = st.want.t; } catch (e) {} return; } }
    const t = audio.currentTime + .06, u = st.units; let lo = 0, hi = u.length - 1, k = 0;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (u[m].t0 <= t) { k = m; lo = m + 1; } else hi = m - 1; }
    if (t < u[0].t0) { if (st.ui !== 0 || !st.inHead) { st.inHead = true; emit(); } return; }
    if (k !== st.ui || st.inHead) { st.ui = k; st.inHead = false; setMark(); emit(); }
  }
  function ticker(on) {
    clearInterval(tickId); tickId = 0;
    if (!on) return;
    tickId = setInterval(() => {
      if (!st) return;
      if (st.mode === 'track') { syncTrack(); if (navigator.mediaSession && navigator.mediaSession.setPositionState && isFinite(audio.duration) && audio.duration > 0) { try { navigator.mediaSession.setPositionState({ duration: audio.duration, playbackRate: audio.playbackRate, position: Math.min(audio.currentTime, audio.duration) }); } catch (e) {} } }
      if (sleepAt && Date.now() >= sleepAt) { sleepAt = 0; pause(); toast('睡眠定時到了，說書先停在這裡'); }
      Bus.emit('narr:tick', state());
    }, 250);
  }

  /* ── 一回唸完 ── */
  function finished() {
    if (!st) return;
    const book = st.book, ci = st.ci, ch = book.chapters[ci];
    Prog.markDone(book.id, Lib.ck(book, ch, ci));
    if (sleepCh) { sleepCh = false; stop(); toast('這一回說完了，說書先停在這裡'); return; }
    if (ci + 1 < book.chapters.length) { start(book, ci + 1, null); return; }
    stop();
    toast(book.remote && book.status === '連載中' ? '欲知後事如何，且聽下回分解。' : '全書說完了');
  }
  audio.addEventListener('ended', () => { if (st && st.mode === 'track') finished(); });
  audio.addEventListener('timeupdate', syncTrack);
  audio.addEventListener('pause', () => { if (st && st.mode === 'track' && st.ready && st.playing && !audio.ended && document.visibilityState !== 'hidden') { st.playing = false; emit(); } });
  audio.addEventListener('play', () => { if (st && st.mode === 'track' && !st.playing) { st.playing = true; emit(); } });
  audio.addEventListener('waiting', () => { if (st) { st.buffering = true; emit(); } });
  audio.addEventListener('playing', () => { if (st) { st.buffering = false; emit(); } });
  audio.addEventListener('error', () => {
    if (!st || st.mode !== 'track' || !audio.getAttribute('src')) return;
    const b = st.book, i = st.ci, u = st.units[st.ui];
    if (canSpeak() && st.ready) { toast('音軌載入失敗，先改用裝置語音'); st.mode = 'speech'; st.units = buildUnits(st.blocks); st.ui = unitAt(u ? { b: u.b, s: u.s } : null); audio.removeAttribute('src'); keepAwake(true); if (st.playing) speak(); emit(); }
    else { toast('音軌載入失敗，檢查一下網路', { kind: 'bad' }); stop(); }
    void b; void i;
  });

  /* ── 控制 ── */
  function pause() {
    if (!st || !st.playing) return;
    st.playing = false;
    if (st.mode === 'track') audio.pause(); else { st.tok = ++utok; try { synth.cancel(); } catch (e) {} keepAwake(false); }
    emit();
  }
  function resume() {
    if (!st || st.playing) return;
    st.playing = true;
    if (st.mode === 'track') audio.play().catch(() => { st.playing = false; emit(); }); else { st.tok = ++utok; keepAwake(true); setTimeout(() => speak(), 60); }
    emit();
  }
  const toggle = () => (st && st.playing ? pause() : resume());
  function halt() { sess++; utok++; ticker(false); try { audio.pause(); } catch (e) {} if (synth) { try { synth.cancel(); } catch (e) {} } keepAwake(false); }
  function stop() {
    halt(); if (audio.getAttribute('src')) { audio.removeAttribute('src'); try { audio.load(); } catch (e) {} }
    st = null; sleepAt = 0; sleepCh = false; Reader.unmark();
    if (navigator.mediaSession) { try { navigator.mediaSession.playbackState = 'none'; } catch (e) {} }
    emit();
  }
  function seekUnit(i) {
    if (!st || !st.ready) return;
    st.ui = clamp(i, 0, st.units.length - 1); st.inHead = false;
    if (st.mode === 'track') jump(st.units[st.ui].t0);
    else if (st.playing) { st.tok = ++utok; try { synth.cancel(); } catch (e) {} setTimeout(() => speak(), 80); }
    setMark(); emit();
  }
  function skip(sec) {
    if (!st || !st.ready) return;
    if (st.mode === 'track') { jump(clamp(audio.currentTime + sec, 0, (audio.duration || 1e9) - .5)); syncTrack(); }
    else seekUnit(st.ui + (sec < 0 ? -2 : 3));
  }
  function seekFrac(f) {
    if (!st || !st.ready) return;
    if (st.mode === 'track' && isFinite(audio.duration)) { jump(clamp(f, 0, .999) * audio.duration); syncTrack(); }
    else seekUnit(Math.round(f * (st.units.length - 1)));
  }
  function chapter(d) {
    if (!st) return;
    const n = st.ci + d;
    if (n < 0) return seekUnit(0);
    if (n >= st.book.chapters.length) return toast('後面還沒有下一回');
    start(st.book, n, null);
  }
  function setRate(r) { Settings.rate = r; saveSettings(); if (st && st.mode === 'track') audio.playbackRate = r; else if (st && st.playing) seekUnit(st.ui); emit(); }
  function setVoice(uri) { Settings.voice = uri; saveSettings(); if (st && st.mode === 'speech' && st.playing) seekUnit(st.ui); emit(); }
  function setSleep(v) { sleepCh = v === 'ch'; sleepAt = typeof v === 'number' && v > 0 ? Date.now() + v * 60000 : 0; emit(); }

  async function keepAwake(on) {
    try {
      if (on && Settings.keepAwake && navigator.wakeLock && !wake && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
      else if (!on && wake) { const w = wake; wake = null; await w.release(); }
    } catch (e) { wake = null; }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && st && st.mode === 'speech' && st.playing) keepAwake(true); });

  /* ── 鎖屏與耳機按鍵 ── */
  async function session() {
    const ms = navigator.mediaSession; if (!ms || !st) return;
    const b = st.book, ch = b.chapters[st.ci], my = sess;
    const art = [{ src: new URL('icons/icon-512.png', location.href).href, sizes: '512x512', type: 'image/png' }];
    if (!IS_IOS) { if (!artCache[b.id]) artCache[b.id] = await Cover.png(b, 512); if (!st || sess !== my) return; if (artCache[b.id]) art.unshift({ src: artCache[b.id], sizes: '512x512', type: 'image/png' }); }
    try {
      ms.metadata = new MediaMetadata({ title: (ch.label ? ch.label + '　' : '') + (ch.name || ''), artist: b.title, album: '下回分解', artwork: art });
      const h = { play: resume, pause, seekbackward: () => skip(-15), seekforward: () => skip(30), previoustrack: () => chapter(-1), nexttrack: () => chapter(1), seekto: (e) => { if (st && st.mode === 'track' && e.seekTime != null) { audio.currentTime = e.seekTime; syncTrack(); } }, stop };
      Object.keys(h).forEach((k) => { try { ms.setActionHandler(k, h[k]); } catch (e) {} });
    } catch (e) {}
  }

  function state() {
    if (!st) return { active: false };
    const track = st.mode === 'track', dur = track ? (isFinite(audio.duration) && audio.duration ? audio.duration : (st.book.chapters[st.ci].au || {}).dur || 0) : 0;
    const head = st.inHead || (st.head && !st.ready);
    return { active: true, playing: st.playing, ready: st.ready, buffering: !!st.buffering && track, mode: st.mode, book: st.book, ci: st.ci, ui: st.ui, n: st.units.length,
      text: st.ready ? textOf(st.ui) : '', prevText: st.ready && st.ui > 0 ? textOf(st.ui - 1) : '', nextText: st.ready ? textOf(st.ui + 1) : '', head,
      time: track ? audio.currentTime : 0, dur, f: track ? (dur ? audio.currentTime / dur : 0) : (st.units.length > 1 ? st.ui / (st.units.length - 1) : 0),
      rate: Settings.rate, sleepLeft: sleepAt ? Math.max(0, sleepAt - Date.now()) : 0, sleepCh, voices, voice: pickVoice() };
  }
  function emit() { if (navigator.mediaSession && st) { try { navigator.mediaSession.playbackState = st.playing ? 'playing' : 'paused'; } catch (e) {} } Bus.emit('narr', state()); }

  return { start, stop, pause, resume, toggle, skip, seekUnit, seekFrac, chapter, setRate, setVoice, setSleep, state, hasTrack, canSpeak, get active() { return !!st; }, get voices() { return voices.length ? voices : loadVoices(); } };
})();
