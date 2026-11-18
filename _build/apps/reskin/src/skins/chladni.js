/* ===================== skin: 音紋 CYMATICS — sand on a singing steel plate =====================
   A Chladni plate: a square of steel driven at its centre, covered in fine sand. Where the plate vibrates the sand is
   thrown about; where it stands still (the nodal lines) the sand comes to rest, so the sound draws its own figure.
   Each grain is kicked in proportion to how hard the plate moves under it (cos(nπx)cos(mπy) ∓ cos(mπx)cos(nπy)) and
   drifts down the slope towards the nearest still line. Every two bars, on the bar's first beat, the plate is driven at
   a new mode, simpler in quiet passages and more intricate when the song is loud; the kick drum makes the sand jump,
   the chorus changes the figure every bar and tints the sand with the cover's colour. Tap the plate to strike it. */
R.skins.def({
  id: 'chladni', name: '音紋', group: '科技', en: 'CYMATICS',
  desc: '克拉尼振動板：細沙被音樂震出幾何圖紋，每兩小節換一種振動模式；大鼓一下沙子跳起來，點一下板子也會響',
  bloom: { s: 0.55, th: 0.55, tint: '#ffe9c2' }, hero: '.cy-art', trans: 'portal', hype: false,
  theme: { bg: '#08090b', fg: '#f1efe9', accent: '#f4d29a', accent2: '#7fd8ff', ui: 'rgba(12,13,16,.97)', dock: 'rgba(20,21,26,.5)', dockfg: '#f4d29a' },
  enterMs: 1800, swapMs: 1400, punch: 0.4,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="cyp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3d44"/><stop offset="1" stop-color="#17181c"/></linearGradient></defs><rect width="116" height="150" fill="#08090b"/><rect x="10" y="22" width="96" height="96" rx="3" fill="url(#cyp)"/><g fill="#f4ead8">${(() => { let s = '', seed = 9; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; for (let i = 0; i < 900; i++) { const x = r(), y = r(); const z = Math.cos(3 * Math.PI * x) * Math.cos(5 * Math.PI * y) - Math.cos(5 * Math.PI * x) * Math.cos(3 * Math.PI * y); if (Math.abs(z) < 0.16) s += `<rect x="${(10 + x * 96).toFixed(1)}" y="${(22 + y * 96).toFixed(1)}" width=".9" height=".9"/>`; } return s; })()}</g><circle cx="58" cy="70" r="3.4" fill="#c9a463"/><text x="58" y="138" text-anchor="middle" font-family="Orbitron, sans-serif" font-weight="700" font-size="8" fill="#f4d29a" letter-spacing="2">MODE 3·5</text></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 1318, dur: 0.25, v: 0.035, type: 'sine' }); },
    tick(s, t) { s.tone(t, { f: 2637, dur: 0.05, v: 0.02, type: 'sine' }); },
    toggle(s, t) { s.tone(t, { f: 880, dur: 0.3, v: 0.035, type: 'sine' }); s.tone(t, { f: 1320, dur: 0.25, v: 0.02, type: 'sine' }); },
    play(s, t) { s.notes(t, [s.hz(76), s.hz(83), s.hz(88)], { dur: 0.9, v: 0.03, type: 'sine', gap: 0.06 }); },
    pause(s, t) { s.notes(t, [s.hz(88), s.hz(83), s.hz(76)], { dur: 0.6, v: 0.025, type: 'sine', gap: 0.05 }); },
    next(s, t) { s.tone(t, { f: 660, f2: 1320, dur: 0.3, v: 0.03, type: 'sine' }); s.noise(t, { f: 6000, dur: 0.25, v: 0.015, q: 0.8 }); },
    prev(s, t) { s.tone(t, { f: 1320, f2: 660, dur: 0.3, v: 0.03, type: 'sine' }); s.noise(t, { f: 6000, dur: 0.25, v: 0.015, q: 0.8 }); },
    enter(s, t) { s.tone(t, { f: 110, f2: 880, dur: 1.4, v: 0.04, type: 'sine', glide: 1.2 }); s.notes(t + 1.2, [s.hz(64), s.hz(71), s.hz(76), s.hz(83)], { dur: 1.2, v: 0.025, type: 'sine', gap: 0.1 }); },
    open(s, t) { s.tone(t, { f: 1046, dur: 0.18, v: 0.03, type: 'sine' }); },
    close(s, t) { s.tone(t, { f: 784, dur: 0.18, v: 0.03, type: 'sine' }); },
    ok(s, t) { s.notes(t, [s.hz(79), s.hz(84), s.hz(91)], { dur: 0.6, v: 0.03, type: 'sine', gap: 0.07 }); },
    strike(s, t) { s.tone(t, { f: 523, dur: 1.6, v: 0.05, type: 'sine' }); s.tone(t, { f: 1246, dur: 1.1, v: 0.025, type: 'sine' }); s.tone(t, { f: 2093, dur: 0.6, v: 0.012, type: 'sine' }); s.noise(t, { f: 4000, dur: 0.03, v: 0.03, q: 2 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="cy-cv"></canvas>
      <div class="cy-hud" data-ui><b>CYMATICS</b><span>MODE <em data-cy="mode">1·2</em> · <em data-cy="hz">--- Hz</em></span></div>
      <div class="cy-panel">
        <div class="cy-row" data-ui>
          <div class="cy-art"><img data-bind="cover" alt="" draggable="false"></div>
          <div class="cy-tx"><div class="cy-t" data-bind="title"></div><div class="cy-a" data-bind="artist"></div></div>
        </div>
        <div class="seek cy-seek" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div><div class="seek-times"><span data-bind="time">0:00</span><span data-bind="dur">0:00</span></div></div>
        ${R.ui.ctrl('cy-ctrl')}
      </div>`;
    const cv = api.canvas(root.querySelector('.cy-cv'), { dprMax: 2 });
    const cvEl = root.querySelector('.cy-cv'), panel = root.querySelector('.cy-panel');
    const modeEl = root.querySelector('[data-cy="mode"]'), hzEl = root.querySelector('[data-cy="hz"]');
    // plate modes from simple to intricate: [n, m, sign]
    const MODES = [[1, 2, -1], [1, 3, 1], [2, 3, -1], [1, 4, -1], [2, 3, 1], [1, 5, 1], [3, 4, -1], [2, 5, -1], [1, 6, -1], [3, 5, -1], [2, 5, 1], [4, 5, 1], [3, 7, -1], [2, 7, 1], [4, 7, -1], [5, 6, 1], [3, 8, -1], [5, 7, -1], [4, 9, 1], [6, 7, -1]];
    const N = R.quality() < 0.7 ? 4200 : 7200, X = new Float32Array(N), Y = new Float32Array(N), C = new Uint8Array(N), rnd = R.rng(4321);
    for (let i = 0; i < N; i++) { X[i] = rnd(); Y[i] = rnd(); C[i] = rnd() < 0.24 ? 1 : 0; }
    // lookup tables for the current and the previous mode: cos and sin of kπx on [0, 1]
    const T = 1024, mk = () => ({ ca: new Float32Array(T + 1), sa: new Float32Array(T + 1), cb: new Float32Array(T + 1), sb: new Float32Array(T + 1), n: 1, m: 2, s: -1 });
    let cur = mk(), mi = 0;
    function setMode(k) {
      mi = Math.max(0, Math.min(MODES.length - 1, k));
      const [n, m, s] = MODES[mi]; cur = mk(); cur.n = n; cur.m = m; cur.s = s;
      for (let i = 0; i <= T; i++) { const x = (i / T) * Math.PI; cur.ca[i] = Math.cos(n * x); cur.sa[i] = Math.sin(n * x); cur.cb[i] = Math.cos(m * x); cur.sb[i] = Math.sin(m * x); }
      modeEl.textContent = n + '·' + m;
    }
    setMode(0);

    let L = null, back = null;
    function layout() {
      const { w, h } = cv, r0 = root.getBoundingClientRect(), pt = panel.getBoundingClientRect().top - r0.top;
      const land = w > h * 1.15, st = parseFloat(getComputedStyle(root).getPropertyValue('--st')) || 0;
      const top = (land ? 12 : 64) + st, bot = Math.max(top + 160, pt - 10);
      const S = Math.max(120, Math.min(w - (land ? 300 : 30), bot - top, 620));
      L = { S, x: (w - S) / 2, y: top + Math.max(0, (bot - top - S) / 2) };
      build(w, h);
    }
    // the room and the plate (brushed steel, bevelled, a brass bolt in the middle)
    function build(w, h) {
      back = document.createElement('canvas'); const d = Math.min(2, cv.dpr);
      back.width = Math.max(2, Math.round(w * d)); back.height = Math.max(2, Math.round(h * d));
      const x = back.getContext('2d'); x.scale(d, d);
      const bg = x.createRadialGradient(w / 2, L.y + L.S / 2, L.S * 0.2, w / 2, L.y + L.S / 2, Math.max(w, h) * 0.75);
      bg.addColorStop(0, '#1a1c21'); bg.addColorStop(1, '#050506'); x.fillStyle = bg; x.fillRect(0, 0, w, h);
      const { x: px, y: py, S } = L;
      x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(px + 6, py + 12, S, S);
      const pg = x.createLinearGradient(px, py, px + S, py + S); pg.addColorStop(0, '#3b3e46'); pg.addColorStop(0.5, '#25272d'); pg.addColorStop(1, '#16171b');
      x.fillStyle = pg; x.fillRect(px, py, S, S);
      const rnd2 = R.rng(9);
      for (let k = 0; k < 220; k++) { x.strokeStyle = `rgba(255,255,255,${(0.012 + rnd2() * 0.02).toFixed(3)})`; x.lineWidth = 0.6; const r = rnd2() * S * 0.75 + 4, a = rnd2() * R.TAU; x.beginPath(); x.arc(px + S / 2, py + S / 2, r, a, a + 0.4 + rnd2() * 1.2); x.stroke(); }
      x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 1; x.strokeRect(px + 0.5, py + 0.5, S - 1, S - 1);
      x.strokeStyle = 'rgba(0,0,0,.6)'; x.strokeRect(px + 2.5, py + 2.5, S - 5, S - 5);
      const bx = px + S / 2, by = py + S / 2, br = Math.max(4, S * 0.022);
      const bgr = x.createRadialGradient(bx - br * 0.3, by - br * 0.3, 0, bx, by, br); bgr.addColorStop(0, '#f6dc9e'); bgr.addColorStop(0.6, '#b08a45'); bgr.addColorStop(1, '#5a4220');
      x.fillStyle = bgr; x.beginPath(); x.arc(bx, by, br, 0, R.TAU); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.5)'; x.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * R.TAU; x.lineTo(bx + Math.cos(a) * br * 0.55, by + Math.sin(a) * br * 0.55); } x.closePath(); x.stroke();
    }

    /* ---------- the plate's motion ---------- */
    let jump = 0, ring = 0, lastBar = -1, enterT = 0, lastHz = 0, pal = api.colors(), strikes = [];
    const tint = '#f2e6cf';
    function nextMode(v) {
      // quiet → simple figures, loud → intricate; a little of the song's own sequence on top
      const e = Math.min(1, Math.max(0, (v.local - 0.3) / 0.55)), base = Math.round(e * 11 + v.hot * 6);
      const t = api.track(), seed = t ? R.hashStr(t.id) : 1;
      const pick = base + ((seed + lastBar * 7) % 5) - 2;
      setMode(pick === mi ? pick + 1 : pick);
    }
    api.hit((k, s) => { if (k === 'kick') jump = Math.max(jump, s); });
    api.beat((s, i) => {
      if (!i.down) return;
      ring = Math.max(ring, s);
      const bar = Math.floor((Math.floor(R.viz.beatT) - (R.viz.bpos || 0)) / 4 + 0.01);
      if (bar !== lastBar && (bar % (R.viz.hot > 0.5 ? 1 : 2) === 0 || lastBar < 0)) { lastBar = bar; nextMode(R.viz); }
    });
    cvEl.addEventListener('pointerdown', (e) => {
      if (!L) return;
      const r = cvEl.getBoundingClientRect(), u = (e.clientX - r.left - L.x) / L.S, q = (e.clientY - r.top - L.y) / L.S;
      if (u < 0 || u > 1 || q < 0 || q > 1) return;
      strikes.push({ u, q, a: 1 }); api.sfx('strike');
    });
    const ix = (x) => { const i = (x * T) | 0; return i < 0 ? 0 : i > T ? T : i; };
    layout();
    return {
      // the sand is poured on: spread over the plate, it finds the figure as the music starts
      enter() { enterT = 0; for (let i = 0; i < N; i++) { const a = rnd() * R.TAU, r = Math.sqrt(rnd()) * 0.48; X[i] = 0.5 + Math.cos(a) * r; Y[i] = 0.5 + Math.sin(a) * r; } },
      swap() { pal = api.colors(); for (let i = 0; i < N; i++) { X[i] = rnd(); Y[i] = rnd(); } lastBar = -1; },
      onTrack() { pal = api.colors(); },
      resize() { cv.resize(); layout(); },
      frame(dt, now, v) {
        enterT += dt;
        const { ctx, w, h } = cv;
        if (!L || Math.abs(back.width / Math.min(2, cv.dpr) - w) > 1) layout();
        const playing = v.playing, step = Math.min(0.05, dt) * 60;
        jump *= Math.exp(-dt * 9); ring *= Math.exp(-dt * 2.4);
        // how hard the plate is driven: the loudness, the beat, the kick
        const drive = playing ? (0.25 + 0.75 * Math.min(1, v.level * 1.2)) * (0.85 + v.pump * 0.3) + jump * 1.4 : 0.06 * Math.max(0, 1 - enterT / 3);
        const kick = 0.018 * drive * step, drift = (0.0027 * step) / (cur.n + cur.m);
        const { ca, sa, cb, sb, n, m, s } = cur, kn = Math.PI * n, km = Math.PI * m;
        for (let i = 0; i < N; i++) {
          let x = X[i], y = Y[i];
          const xi = ix(x), yi = ix(y);
          const z = ca[xi] * cb[yi] - s * cb[xi] * ca[yi];
          const az = z < 0 ? -z : z;
          // thrown about where the plate moves, sliding down towards the still lines
          const dx = (-kn * sa[xi] * cb[yi] + s * km * sb[xi] * ca[yi]), dy = (-km * ca[xi] * sb[yi] + s * kn * cb[xi] * sa[yi]);
          x += (rnd() - 0.5) * kick * az * 2 - drift * z * dx;
          y += (rnd() - 0.5) * kick * az * 2 - drift * z * dy;
          if (x < 0.002) x = 0.002 + rnd() * 0.01; else if (x > 0.998) x = 0.998 - rnd() * 0.01;
          if (y < 0.002) y = 0.002 + rnd() * 0.01; else if (y > 0.998) y = 0.998 - rnd() * 0.01;
          X[i] = x; Y[i] = y;
        }
        // a strike: the sand near it is thrown outwards
        for (let k = strikes.length - 1; k >= 0; k--) {
          const sk = strikes[k];
          if (sk.a > 0.95) for (let i = 0; i < N; i++) { const ddx = X[i] - sk.u, ddy = Y[i] - sk.q, d2 = ddx * ddx + ddy * ddy; if (d2 < 0.03) { const f = (0.03 - d2) * 2.4; X[i] = Math.min(0.998, Math.max(0.002, X[i] + ddx * f + (rnd() - 0.5) * 0.02)); Y[i] = Math.min(0.998, Math.max(0.002, Y[i] + ddy * f + (rnd() - 0.5) * 0.02)); } }
          sk.a -= dt * 1.4; if (sk.a <= 0) strikes.splice(k, 1);
        }
        ctx.drawImage(back, 0, 0, w, h);
        const { x: px, y: py, S } = L;
        // the plate rings: a soft light from the bolt on the bar's first beat, and where it was struck
        ctx.globalCompositeOperation = 'lighter';
        if (ring > 0.02) { ctx.globalAlpha = ring * 0.35; ctx.drawImage(api.glow(pal.light, 64), px + S / 2 - S * 0.45, py + S / 2 - S * 0.45, S * 0.9, S * 0.9); }
        for (const sk of strikes) { ctx.globalAlpha = sk.a * 0.5; const r = S * (0.1 + (1 - sk.a) * 0.5); ctx.drawImage(api.glow('#ffffff', 64), px + sk.u * S - r, py + sk.q * S - r, r * 2, r * 2); }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        // the sand: two batches, plain and tinted with the cover's colour (more of it in the chorus)
        const g = Math.max(1, S / 340) * (1 + jump * 0.5), on = Math.min(1, enterT / 0.6);
        const tc = v.hot > 0.5 ? pal.vibrant : pal.light;
        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          for (let i = 0; i < N; i++) { if (C[i] !== pass) continue; ctx.rect(px + X[i] * S - g / 2, py + Y[i] * S - g / 2, g, g); }
          ctx.globalAlpha = on * (pass ? 0.85 : 0.92); ctx.fillStyle = pass ? tc : tint; ctx.fill();
        }
        ctx.globalAlpha = 1;
        // the edge light, warmer as the song gets louder
        ctx.strokeStyle = R.color.rgba(v.hot > 0.5 ? pal.vibrant : '#f4d29a', 0.12 + v.pump * 0.2 + v.hot * 0.15); ctx.lineWidth = 1.5; ctx.strokeRect(px - 1, py - 1, S + 2, S + 2);
        if (now - lastHz > 0.25) {
          lastHz = now;
          // how much of the sand rests on a still line (shown to the tests)
          let calm = 0; for (let i = 0; i < N; i += 7) { const xi = ix(X[i]), yi = ix(Y[i]), z = ca[xi] * cb[yi] - s * cb[xi] * ca[yi]; if (z > -0.15 && z < 0.15) calm++; }
          root.dataset.calm = (calm / Math.ceil(N / 7)).toFixed(3);
          let bi = 0, bm = -1; for (let k = 0; k < 24; k++) if (v.bands[k] > bm) { bm = v.bands[k]; bi = k; }
          hzEl.textContent = (playing ? Math.round(35 * Math.pow(11000 / 35, (bi + 0.5) / 32)) : '---') + ' Hz';
        }
      },
    };
  },
});
