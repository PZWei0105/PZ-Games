/* ===================== skin framework: registry, stage, bindings, seek bars, canvases, loop ===================== */
R.skins = (() => {
  const defs = new Map(), order = [];
  function def(d) { d.theme = Object.assign({ bg: '#0a0a12', fg: '#f2f4ff', accent: '#7c8cff', accent2: '#ff7ad9', ui: 'rgba(16,16,26,.92)', line: 'rgba(255,255,255,.12)', dock: 'rgba(0,0,0,.35)', dockfg: '#ffffff' }, d.theme || {}); defs.set(d.id, d); order.push(d.id); return d; }
  const diy = () => (R.settings.get('diy') || []).map((c) => R.diySkin(c)).filter(Boolean);
  function get(id) {
    if (defs.has(id)) return defs.get(id);
    const c = (R.settings.get('diy') || []).find((x) => x.id === id);
    return c ? R.diySkin(c) : null;
  }
  const builtin = () => order.map((id) => defs.get(id));
  const list = () => builtin().concat(diy());
  return { def, get, list, builtin, diy };
})();

R.kit = (() => {
  const { clamp } = R;
  function canvas(cv, opt) {
    opt = opt || {};
    const ctx = cv.getContext('2d', { alpha: opt.alpha !== false });
    const k = {
      cv, ctx, w: 1, h: 1, dpr: 1,
      resize() {
        const r = cv.getBoundingClientRect();
        const d = Math.max(0.5, Math.min(window.devicePixelRatio || 1, opt.dprMax || R.dprMax()) * (opt.scale || 1) * R.quality());
        k.dpr = d; k.w = Math.max(1, r.width); k.h = Math.max(1, r.height);
        const W = Math.max(1, Math.round(k.w * d)), H = Math.max(1, Math.round(k.h * d));
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        ctx.setTransform(d, 0, 0, d, 0, 0);
        return k;
      },
      clear() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(k.dpr, 0, 0, k.dpr, 0, 0); },
    };
    return k.resize();
  }
  // cached soft glow dot, drawn with 'lighter' for cheap neon light
  const glows = new Map();
  function glow(col, size) {
    const key = col + '|' + (size || 64);
    if (glows.has(key)) return glows.get(key);
    const n = size || 64, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d');
    const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    g.addColorStop(0, R.color.rgba(col, 1)); g.addColorStop(0.25, R.color.rgba(col, 0.55)); g.addColorStop(1, R.color.rgba(col, 0));
    x.fillStyle = g; x.fillRect(0, 0, n, n);
    glows.set(key, c);
    if (glows.size > 80) glows.delete(glows.keys().next().value);
    return c;
  }
  function seekBar(el) {
    const track = el.querySelector('[data-seek-track]') || el;
    const fill = el.querySelector('[data-seek-fill]'), knob = el.querySelector('[data-seek-knob]');
    const vert = el.dataset.seek === 'v';
    let drag = null;
    const frac = (e) => { const r = track.getBoundingClientRect(); return vert ? clamp(1 - (e.clientY - r.top) / r.height, 0, 1) : clamp((e.clientX - r.left) / r.width, 0, 1); };
    const show = (f) => {
      if (fill) fill.style.transform = vert ? `scaleY(${f})` : `scaleX(${f})`;
      if (knob) knob.style[vert ? 'bottom' : 'left'] = (f * 100).toFixed(3) + '%';
      el.style.setProperty('--p', f.toFixed(4));
    };
    el.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || !R.player.current()) return;
      drag = { f: frac(e) }; try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      el.classList.add('dragging'); show(drag.f); R.bus.emit('scrub', drag.f); e.preventDefault(); e.stopPropagation();
    });
    el.addEventListener('pointermove', (e) => { if (!drag) return; drag.f = frac(e); show(drag.f); R.bus.emit('scrub', drag.f); });
    const end = (commit) => { if (!drag) return; const f = drag.f; drag = null; el.classList.remove('dragging'); if (commit) { const d = R.player.duration(); if (d) R.player.seek(f * d); R.stage.sfx('tick'); } R.bus.emit('scrub', null); };
    el.addEventListener('pointerup', () => end(true));
    el.addEventListener('pointercancel', () => end(false));
    el.addEventListener('lostpointercapture', () => end(true));
    return { set(f) { if (!drag) show(f); }, dragging: () => !!drag };
  }
  return { canvas, glow, seekBar };
})();

R.stage = (() => {
  const { $, $$, fmtTime, bus } = R;
  const host = $('#stage');
  let layers = [], tok = 0, scrubF = null, lastTxt = 0;
  const top = () => layers[layers.length - 1] || null;

  const NO_TRACK = () => (R.lib.count() ? { title: '選一首歌', artist: '打開歌庫挑一首開始' } : { title: '耳目一新', artist: '痞子葳的換膚音樂播放器' });

  function binder(root) {
    const q = (k) => $$(`[data-bind="${k}"]`, root);
    const B = {};
    for (const k of ['title', 'artist', 'album', 'time', 'dur', 'rem', 'idx', 'bpm', 'cover', 'coverbg', 'next', 'titleart']) B[k] = q(k);
    const seeks = $$('[data-seek]', root).map((el) => R.kit.seekBar(el));
    let tid = undefined;
    const b = {
      track(t) {
        const n = t ? { title: t.title, artist: t.artist || '未知歌手' } : NO_TRACK();
        for (const e of B.title) e.textContent = n.title;
        for (const e of B.artist) e.textContent = n.artist;
        for (const e of B.album) e.textContent = t ? t.album || '' : '';
        for (const e of B.titleart) e.textContent = t ? (t.artist ? t.artist + ' — ' : '') + t.title : n.title;
        for (const e of B.bpm) e.textContent = t && t.bpm ? Math.round(t.bpm) : '--';
        root.classList.toggle('no-track', !t);
        const key = t ? t.id + ':' + (t.coverRev || 0) : null; // coverRev changes when the cover is replaced
        if (t !== undefined && key === tid && t && (B.cover.length || B.coverbg.length)) return;
        tid = key;
        if (!t) { for (const e of B.cover) { e.removeAttribute('src'); e.classList.add('blank'); } for (const e of B.coverbg) e.style.backgroundImage = ''; return; }
        if (B.cover.length || B.coverbg.length) R.art.coverUrl(t, 'full').then((u) => {
          if (!u || tid !== key) return;
          for (const e of B.cover) { e.classList.remove('blank'); if (e.src !== u) e.src = u; }
          for (const e of B.coverbg) e.style.backgroundImage = `url("${u}")`;
        });
      },
      queue() {
        const n = R.player.queue().length, i = R.player.index();
        for (const e of B.idx) e.textContent = n ? String(i + 1).padStart(2, '0') + '/' + String(n).padStart(2, '0') : '00/00';
        const nx = R.player.upNext();
        for (const e of B.next) e.textContent = nx ? nx.title : '—';
      },
      state(st) {
        root.classList.toggle('is-playing', !!st.playing);
        root.classList.toggle('is-shuffle', !!st.shuffle);
        root.dataset.repeat = st.repeat;
      },
      tick(force) {
        const d = R.player.duration(), t = R.player.time();
        const shown = scrubF != null && d ? scrubF * d : t;
        for (const s of seeks) s.set(d ? Math.min(1, t / d) : 0);
        const now = performance.now();
        if (!force && now - lastTxt < 200 && scrubF == null) return;
        for (const e of B.time) e.textContent = fmtTime(shown);
        for (const e of B.dur) e.textContent = fmtTime(d);
        for (const e of B.rem) e.textContent = '-' + fmtTime(Math.max(0, d - shown));
      },
      seeks,
    };
    return b;
  }

  function apiFor(def, root, offs) {
    return {
      root, def,
      on(e, f) { const off = bus.on(e, f); offs.push(off); return off; },
      beat(f) { const off = R.viz.onBeat(f); offs.push(off); return off; },
      hit(f) { const off = R.viz.onHit(f); offs.push(off); return off; },
      canvas: (cv, o) => R.kit.canvas(cv, o),
      glow: R.kit.glow,
      sfx: (n) => R.sfx.play(n, def.sfx),
      track: () => R.player.current(),
      colors: (t) => R.art.colorsOf(t === undefined ? R.player.current() : t),
      cover: (t, s) => R.art.coverUrl(t || R.player.current(), s),
      coverImage: (t) => R.art.coverImage(t || R.player.current()),
      setTheme: (p) => { if (top() && top().def === def) theme(Object.assign({}, def.theme, p)); },
      flash: () => R.settings.get('flash') && !R.reduced,
      low: () => R.quality() < 0.7,
      later(fn, ms) { const id = setTimeout(fn, ms); offs.push(() => clearTimeout(id)); return id; },
      every(fn, ms) { const id = setInterval(fn, ms); offs.push(() => clearInterval(id)); return id; },
      I: R.I,
    };
  }

  function theme(t) {
    const s = document.documentElement.style;
    s.setProperty('--accent', t.accent); s.setProperty('--accent2', t.accent2); s.setProperty('--fg', t.fg); s.setProperty('--bg', t.bg);
    s.setProperty('--ui', t.ui); s.setProperty('--line', t.line); s.setProperty('--dock', t.dock); s.setProperty('--dockfg', t.dockfg);
    s.setProperty('--accent-rgb', R.color.hexToRgb(t.accent).join(','));
    s.setProperty('--onaccent', R.color.lum(t.accent) > 0.45 ? '#111' : '#fff');
    document.body.style.background = t.bg;
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t.bg);
  }

  function kill(L) {
    if (!L || L.dead) return;
    L.dead = true;
    try { L.inst.destroy && L.inst.destroy(); } catch (e) { console.error(e); }
    for (const off of L.offs) { try { off(); } catch (e) { /* ignore */ } }
    L.root.remove();
  }

  async function show(id, opts) {
    opts = opts || {};
    const def = R.skins.get(id) || R.skins.builtin()[0];
    const prev = top();
    if (prev && prev.def.id === def.id && !opts.force) return prev;
    const my = ++tok;
    // more than one transition in flight: drop everything but the newest old layer
    while (layers.length > 1) kill(layers.shift());
    const root = document.createElement('div');
    root.className = 'skin skin-' + (def.base || def.id);
    root.dataset.skin = def.id;
    host.appendChild(root);
    theme(def.theme);
    const offs = [];
    let inst;
    try { inst = def.mount(root, apiFor(def, root, offs)) || {}; }
    catch (e) {
      console.error('skin mount failed', def.id, e);
      for (const off of offs) off();
      root.remove();
      if (def.id !== 'glass') return show('glass', opts);
      return null;
    }
    const L = { def, root, inst, offs, b: binder(root), dead: false };
    layers.push(L);
    const t = R.player.current();
    L.b.track(t); L.b.queue(); L.b.state({ playing: R.player.isPlaying() || R.player.wants(), shuffle: R.player.S.shuffle, repeat: R.player.S.repeat }); L.b.tick(true);
    try { inst.onTrack && inst.onTrack(t); inst.onState && inst.onState({ playing: R.player.wants() }); } catch (e) { console.error(e); }
    bus.emit('skin', def);
    if (prev && !opts.instant) {
      root.style.setProperty('--rx', opts.x || '50%'); root.style.setProperty('--ry', opts.y || '50%');
      root.classList.add(opts.fast ? 'reveal-fast' : 'reveal');
    }
    root.classList.add('enter');
    try { inst.enter && inst.enter(!!opts.fast); } catch (e) { console.error(e); }
    if (!opts.silent) R.sfx.play('enter', def.sfx);
    const wait = prev && !opts.instant ? (opts.fast ? 460 : 820) : 0;
    setTimeout(() => { if (layers.includes(prev)) { kill(prev); layers = layers.filter((x) => x !== prev); } root.classList.remove('reveal', 'reveal-fast'); }, wait);
    setTimeout(() => { if (!L.dead) root.classList.remove('enter'); }, Math.max(wait, def.enterMs || 1300));
    if (my !== tok) return L;
    return L;
  }

  function frame(dt, t) {
    for (const L of layers) {
      if (L.dead) continue;
      try { L.inst.frame && L.inst.frame(dt, t, R.viz); } catch (e) { console.error('frame', L.def.id, e); L.inst.frame = null; }
      L.b.tick(false);
    }
    punch(dt);
  }
  // the whole skin gives a small push on every beat, a bigger one on the bar's first (def.punch scales it, 0 = none)
  let pk = 0;
  function punch(dt) {
    const L = top(); if (!L || L.dead) return;
    const v = R.viz, b = document.body.classList;
    const amt = L.def.punch === undefined ? 1 : +L.def.punch || 0;
    const want = R.reduced || !v.playing || amt <= 0 || b.contains('deep') || b.contains('ly-open') ? 0 : amt * (0.0055 * Math.min(1.2, v.beat) + 0.0045 * v.down);
    pk = want > pk ? want : pk + (want - pk) * Math.min(1, dt * 12);
    const s = pk > 0.0003 ? (1 + pk).toFixed(4) : '';
    if (L.root.style.scale !== s) L.root.style.scale = s;
    // the beat for stylesheets: every skin's hero (def.hero) pumps with --rp / --rd; skins use the rest as they like
    const st = L.root.style, q = (x) => (x < 0.004 ? '0' : x.toFixed(3));
    const on = v.playing && !R.reduced;
    st.setProperty('--rp', on ? q(v.pump) : '0'); st.setProperty('--rd', on ? q(v.down) : '0');
    st.setProperty('--rk', on ? q(v.kickE) : '0'); st.setProperty('--rs', on ? q(v.snareE) : '0'); st.setProperty('--rh', on ? q(v.hatE) : '0');
  }

  // song change: every skin gets a .swap class for its own change animation (CSS), and inst.swap(t) for canvas effects
  let lastTid = null;
  function swap(L, t) {
    const r = L.root;
    r.classList.remove('swap'); void r.offsetWidth; r.classList.add('swap');
    clearTimeout(L.swapT); L.swapT = setTimeout(() => r.classList.remove('swap'), L.def.swapMs || 1100);
    try { L.inst.swap && L.inst.swap(t); } catch (e) { console.error(e); }
  }
  bus.on('track', (t) => {
    const id = t ? t.id : null, changed = !!(id && lastTid && id !== lastTid);
    lastTid = id;
    for (const L of layers) { L.b.track(t); L.b.queue(); L.b.tick(true); try { L.inst.onTrack && L.inst.onTrack(t); } catch (e) { console.error(e); } if (changed && !L.dead) swap(L, t); }
  });
  // title / artist edited (or play counts etc. changed): bound text updates; skins that draw the text themselves get onMeta
  bus.on('track:update', (t) => { const c = R.player.current(); if (c && t.id === c.id) for (const L of layers) { L.b.track(t); try { L.inst.onMeta && L.inst.onMeta(t); } catch (e) { console.error(e); } } });
  bus.on('state', (st) => { for (const L of layers) { L.b.state(st); try { L.inst.onState && L.inst.onState(st); } catch (e) { console.error(e); } } });
  bus.on('queue', () => { for (const L of layers) L.b.queue(); });
  bus.on('library', () => { if (!R.player.current()) for (const L of layers) L.b.track(null); });
  bus.on('duration', () => { for (const L of layers) L.b.tick(true); });
  bus.on('scrub', (f) => { scrubF = f; for (const L of layers) L.b.tick(true); });
  let rz = 0;
  const onResize = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { for (const L of layers) { try { L.inst.resize && L.inst.resize(); } catch (e) { console.error(e); } } }); };
  window.addEventListener('resize', onResize);
  bus.on('quality', onResize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

  return {
    show, frame, theme,
    current: () => (top() ? top().def : null),
    root: () => (top() ? top().root : null),
    sfx: (n) => { const L = top(); R.sfx.play(n, L ? L.def.sfx : null); },
    refreshTheme: () => { const L = top(); if (L) theme(L.def.theme); },
  };
})();

R.loop = (() => {
  let last = 0, on = false;
  function frame(now) {
    if (!on) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, Math.max(0.001, (now - (last || now - 16)) / 1000)); last = now;
    R.qualityMonitor(dt);
    R.viz.update(dt);
    R.stage.frame(dt, now / 1000);
    if (R.hype) R.hype.frame(dt);
  }
  const start = () => { if (on) return; on = true; last = 0; requestAnimationFrame(frame); };
  const stop = () => { on = false; };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  return { start, stop };
})();

/* shared control-row markup (skins restyle it) */
R.ui = R.ui || {};
R.ui.ctrl = (cls) => {
  const I = R.I;
  return `<div class="ctrl ${cls || ''}" data-ui>
    <button type="button" class="c-shuf" data-act="shuffle" aria-label="隨機播放">${I.shuffle}</button>
    <button type="button" class="c-prev" data-act="prev" aria-label="上一首">${I.prev}</button>
    <button type="button" class="c-play" data-act="toggle" aria-label="播放／暫停">${I.pp}</button>
    <button type="button" class="c-next" data-act="next" aria-label="下一首">${I.next}</button>
    <button type="button" class="c-rep" data-act="repeat" aria-label="循環播放">${I.rep}</button>
  </div>`;
};
R.ui.seek = (cls) => `<div class="seek ${cls || ''}" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div><div class="seek-times"><span data-bind="time">0:00</span><span data-bind="dur">0:00</span></div></div>`;
