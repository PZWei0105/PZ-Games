/* ===================== skin: 水墨山水 — the song as an ink-wash landscape: misty peaks, a boat on the river, ink blooming on the beat; the chorus brings the colour (and the plum blossom) back ===================== */
R.skins.def({
  id: 'ink', name: '水墨山水', group: '雅致', en: 'INK & MIST',
  desc: '宣紙上的遠山雲霧，墨隨節拍暈開；副歌時梅花紛飛、封面染回彩色',
  bloom: 0, hero: '.ik-art', glare: false, trans: 'portal',
  theme: { bg: '#efe6d2', fg: '#1c1a17', accent: '#c8312b', accent2: '#3e5c5a', ui: 'rgba(30,27,23,.97)', dock: 'rgba(255,250,238,.62)', dockfg: '#1c1a17' },
  enterMs: 2000, swapMs: 1350, hype: false,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="ikf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5560" stop-opacity=".75"/><stop offset="1" stop-color="#4a5560" stop-opacity="0"/></linearGradient><linearGradient id="ikn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1a17" stop-opacity=".95"/><stop offset="1" stop-color="#1c1a17" stop-opacity="0"/></linearGradient></defs><rect width="116" height="150" fill="#efe6d2"/><circle cx="74" cy="66" r="9" fill="#c8312b" opacity=".85"/><path d="M-2 98Q12 52 26 70Q36 30 52 66Q62 52 72 74Q86 44 102 70Q110 62 118 70V112H-2Z" fill="url(#ikf)"/><path d="M-4 116Q10 82 24 98Q34 70 50 100Q58 90 66 106V122H-4Z" fill="url(#ikn)"/><path d="M14 104c4-14 2-22 8-30M16 86c-6-2-10 0-12 2m14-6c6-4 10-4 14-2" stroke="#1c1a17" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M8 128h36m14 0h48M24 136h30m16 0h34" stroke="#1c1a17" stroke-width="1" opacity=".4"/><path d="M68 121q11 7 24 0q-12 3-24 0z" fill="#1c1a17"/><path d="M76 120l3-6 3 6z" fill="#1c1a17"/><path d="M80 116l14-10" stroke="#1c1a17" stroke-width=".8"/><path d="M104 12v40" stroke="#1c1a17" stroke-width="3.2" stroke-linecap="round" opacity=".85"/><path d="M96 20v22" stroke="#1c1a17" stroke-width="2" stroke-linecap="round" opacity=".6"/><rect x="92" y="48" width="10" height="10" rx="1.2" fill="#c8312b" transform="rotate(-6 97 53)"/></svg>`,
  sfx: {
    // plucked guzheng in D major pentatonic, a woodblock for taps
    tap(s, t) { s.tone(t, { f: 1150, f2: 880, dur: 0.06, v: 0.12 }); s.noise(t, { f: 2600, dur: 0.025, v: 0.04, q: 4 }); },
    tick(s, t) { s.tone(t, { f: 1760, dur: 0.035, v: 0.04 }); },
    toggle(s, t) { s.notes(t, [s.hz(81), s.hz(86)], { dur: 0.35, v: 0.07, type: 'triangle', lp: 3200, gap: 0.06 }); },
    play(s, t) { s.notes(t, [74, 76, 78, 81, 83, 86].map(s.hz), { dur: 0.7, v: 0.06, type: 'triangle', lp: 3400, gap: 0.04 }); },
    pause(s, t) { s.notes(t, [s.hz(81), s.hz(74)], { dur: 0.6, v: 0.07, type: 'triangle', lp: 2400, gap: 0.09 }); },
    next(s, t) { s.notes(t, [s.hz(78), s.hz(81), s.hz(86)], { dur: 0.45, v: 0.06, type: 'triangle', lp: 3200, gap: 0.05 }); },
    prev(s, t) { s.notes(t, [s.hz(86), s.hz(81), s.hz(78)], { dur: 0.45, v: 0.06, type: 'triangle', lp: 3200, gap: 0.05 }); },
    enter(s, t) { s.tone(t, { f: 98, f2: 94, dur: 2.4, v: 0.16, a: 0.01 }); s.tone(t, { f: 196 * 1.5, dur: 1.6, v: 0.03, a: 0.02 }); s.notes(t + 0.35, [62, 64, 66, 69, 71, 74, 76, 78, 81].map(s.hz), { dur: 0.9, v: 0.05, type: 'triangle', lp: 3000, gap: 0.05 }); },
    open(s, t) { s.noise(t, { f: 1800, f2: 3600, dur: 0.18, v: 0.035, q: 0.6, a: 0.04 }); },
    close(s, t) { s.noise(t, { f: 3600, f2: 1600, dur: 0.18, v: 0.035, q: 0.6, a: 0.04 }); },
    ok(s, t) { s.notes(t, [s.hz(81), s.hz(86), s.hz(90)], { dur: 0.5, v: 0.06, type: 'triangle', lp: 3600, gap: 0.06 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="ik-cv"></canvas>
      <div class="ik-moon"><div class="ik-art"><img data-bind="cover" alt="" draggable="false"></div><i class="ik-blot"></i></div>
      <div class="ik-ins" data-ui><div class="ik-t" data-bind="title"></div><div class="ik-col"><div class="ik-a" data-bind="artist"></div><div class="ik-seal"></div></div></div>
      <div class="ik-dock">${R.ui.seek('ik-seek')}${R.ui.ctrl('ik-ctrl')}</div>`;
    const cv = api.canvas(root.querySelector('.ik-cv'), { dprMax: 2 });
    const moonEl = root.querySelector('.ik-moon'), sealEl = root.querySelector('.ik-seal');
    const low = api.low(), rnd = R.rng(808);
    const INK = '#1c1a17';
    let M = { x: 0, y: 0, r: 50 }, G = null, layers = [], enso = null, mist = [], skyB = 200;
    const measure = () => { M = { x: moonEl.offsetLeft + moonEl.offsetWidth / 2, y: moonEl.offsetTop + moonEl.offsetHeight / 2, r: moonEl.offsetWidth / 2 }; };
    // the seal: the artist's first two characters (or initials), carved white on red
    const sealOf = (tk) => {
      const a = ((tk && (tk.artist || tk.title)) || '').trim();
      const han = a.match(/[㐀-鿿豈-﫿]/g);
      if (han) return han.slice(0, 2).join('');
      const w = a.split(/[^A-Za-z0-9]+/).filter(Boolean);
      return w.length ? w.slice(0, 2).map((x) => x[0].toUpperCase()).join('') : '一新';
    };
    // brush circle (ensō) around the window: heavy start, a tail that thins out; the song paints it as it plays
    function ensoPath(cx, cy, rr) {
      const r = R.rng(5), p = new Path2D(), N = 140, a0 = -Math.PI * 0.62, span = Math.PI * 1.88, out = [], inn = [];
      for (let i = 0; i <= N; i++) {
        const f = i / N, a = a0 + f * span;
        const wd = rr * (0.1 * Math.pow(1 - f, 0.55) * (0.78 + 0.22 * Math.sin(f * 11 + 1)) + 0.012);
        const rad = rr * (1 + 0.025 * Math.sin(f * 5 + 2) + 0.008 * (r() - 0.5));
        out.push(cx + Math.cos(a) * (rad + wd / 2), cy + Math.sin(a) * (rad + wd / 2));
        inn.push(cx + Math.cos(a) * (rad - wd / 2), cy + Math.sin(a) * (rad - wd / 2));
      }
      p.moveTo(out[0], out[1]);
      for (let i = 2; i < out.length; i += 2) p.lineTo(out[i], out[i + 1]);
      for (let i = inn.length - 2; i >= 0; i -= 2) p.lineTo(inn[i], inn[i + 1]);
      p.closePath();
      return { p, a0, span };
    }
    // where things sit, as fractions of the screen
    const geo = (w, h) => h > w * 1.15
      ? { far: [0.6, 0.25], mid: [0.67, 0.2], near: [0.755, 0.11], river: [0.745, 0.835], sun: [0.66, 0.45], pine: 0.07 }
      : { far: [0.6, 0.3], mid: [0.7, 0.22], near: [0.8, 0.12], river: [0.795, 0.915], sun: [0.72, 0.37], pine: 0.44 };
    // a pine on the near bank, its branches reaching out over the water, each ending in a flat pad of needles
    function pine(x, px, py, s, col) {
      x.strokeStyle = col(0.95); x.lineCap = 'round'; x.lineJoin = 'round';
      const P = [px, py + 6, px + s * 0.12, py - s * 0.34, px - s * 0.08, py - s * 0.62, px + s * 0.1, py - s * 0.92];
      const at = (u) => { const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3; return [a * P[0] + b * P[2] + c * P[4] + d * P[6], a * P[1] + b * P[3] + c * P[5] + d * P[7]]; };
      x.lineWidth = s * 0.05; x.beginPath(); x.moveTo(P[0], P[1]); x.bezierCurveTo(P[2], P[3], P[4], P[5], P[6], P[7]); x.stroke();
      x.lineWidth = 1; x.strokeStyle = col(0.5);
      for (let u = 0.1; u < 0.8; u += 0.12) { const [bx, by] = at(u); x.beginPath(); x.moveTo(bx - s * 0.018, by); x.lineTo(bx + s * 0.012, by - s * 0.03); x.stroke(); }
      const pads = [];
      for (const [u, dx, k, dy] of [[0.36, 0.5, 0.21, -0.03], [0.55, -0.32, 0.17, 0.02], [0.66, 0.6, 0.24, -0.06], [0.84, 0.34, 0.2, -0.05], [1, 0.06, 0.22, -0.02]]) {
        const [bx, by] = at(u), ex = bx + dx * s, ey = by + dy * s;
        x.strokeStyle = col(0.92); x.lineWidth = s * 0.02;
        x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo((bx + ex) / 2, Math.min(by, ey) - s * 0.06, ex, ey); x.stroke();
        pads.push([ex, ey, k * s]);
      }
      for (const [cx, cy, r0] of pads) {
        x.fillStyle = col(0.85); x.beginPath(); x.ellipse(cx, cy + r0 * 0.05, r0, r0 * 0.26, 0, 0, R.TAU); x.fill();
        x.strokeStyle = col(0.9); x.lineWidth = 0.9;
        for (let i = 0; i <= 26; i++) {
          const a = Math.PI * (1.02 + (i / 26) * 0.96), L = r0 * (0.85 + 0.22 * Math.sin(i * 2.3));
          x.beginPath(); x.moveTo(cx, cy + r0 * 0.1); x.lineTo(cx + Math.cos(a) * L, cy + r0 * 0.1 + Math.sin(a) * L * 0.5); x.stroke();
        }
      }
    }
    // one range of mountains, painted once into its own canvas: wash fading into mist, brush texture, a contour on the near ones
    function range(w, h, base, amp, o) {
      const d = Math.min(1.25, cv.dpr), r = R.rng(o.seed * 131 + Math.round(w));
      const pk = [];
      for (let i = 0; i < o.n; i++) pk.push({ x: -30 + r() * (w + 60), hg: amp * (0.42 + r() * 0.5), wd: w * o.wid * (0.7 + r() * 0.9) + amp * 0.25 });
      pk[0].hg = amp; pk[0].x = w * o.peak;
      const ry = (px) => { let m = 0; for (const k of pk) { const q = Math.abs(px - k.x) / k.wd; m = Math.max(m, k.hg * Math.exp(-Math.pow(q, 1.6))); } return base - m - amp * 0.06 * R.noise1(px * 0.045, o.seed); };
      const pineX = w * (o.pine || 0), pineS = Math.min(amp * 1.5, h * 0.2);
      const top = Math.max(0, Math.min(base - amp * 1.2, o.pine ? ry(pineX) - pineS * 1.15 : 1e9)), bot = Math.min(h, base + h * 0.1), W = w + 60, H = bot - top;
      const c = document.createElement('canvas'); c.width = Math.ceil(W * d); c.height = Math.ceil(H * d);
      const x = c.getContext('2d'); x.scale(d, d); x.translate(30, -top);
      const pts = []; for (let px = -30; px <= w + 30; px += 3) pts.push(px, ry(px));
      const [cr, cg, cb] = o.ink, col = (a) => `rgba(${cr},${cg},${cb},${a})`;
      const g = x.createLinearGradient(0, base - amp, 0, bot);
      g.addColorStop(0, col(o.a)); g.addColorStop(0.55, col(o.a * 0.42)); g.addColorStop(1, col(0));
      x.fillStyle = g; x.beginPath(); x.moveTo(-30, bot); for (let i = 0; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.lineTo(w + 30, bot); x.closePath(); x.fill();
      x.lineCap = 'round';
      for (let i = 0; i < pts.length; i += 2) {
        if (r() > o.tex * (low ? 0.5 : 1)) continue;
        const px = pts[i], py = pts[i + 1], L = 4 + r() * amp * 0.22;
        x.strokeStyle = col(0.06 + r() * 0.16 * o.a); x.lineWidth = 0.8 + r() * 1.6;
        x.beginPath(); x.moveTo(px, py + 1); x.quadraticCurveTo(px + (r() - 0.5) * 6, py + L * 0.5, px + (r() - 0.5) * 10, py + L); x.stroke();
      }
      if (o.contour) {
        x.strokeStyle = col(o.contour);
        for (let i = 2; i < pts.length; i += 2) { x.lineWidth = 0.5 + 1.9 * R.noise1(i * 0.05, o.seed + 3); x.beginPath(); x.moveTo(pts[i - 2], pts[i - 1]); x.lineTo(pts[i], pts[i + 1]); x.stroke(); }
      }
      for (const k of pk) if (k.hg > amp * 0.6) for (let j = 0; j < 7; j++) { const px = k.x + (r() - 0.5) * k.wd * 0.6; x.fillStyle = col(0.3 * o.a + 0.25); x.beginPath(); x.arc(px, ry(px) + 2 + r() * 5, 0.7 + r() * 1.5, 0, R.TAU); x.fill(); }
      if (o.pine) pine(x, pineX, ry(pineX), pineS, col);
      return { c, top, W, H, minY: Math.min(...pts.filter((_, i) => i % 2)) };
    }
    function build() {
      const { w, h } = cv; G = geo(w, h); measure();
      layers = [
        range(w, h, G.far[0] * h, G.far[1] * h, { n: 7, wid: 0.07, peak: 0.78, ink: [74, 86, 96], a: 0.5, contour: 0, tex: 0.45, seed: 11 }),
        range(w, h, G.mid[0] * h, G.mid[1] * h, { n: 5, wid: 0.09, peak: 0.3, ink: [44, 47, 50], a: 0.72, contour: 0.32, tex: 0.75, seed: 23 }),
        range(w, h, G.near[0] * h, G.near[1] * h, { n: 4, wid: 0.11, peak: 0.86, ink: [24, 23, 21], a: 0.92, contour: 0.7, tex: 1, seed: 37, pine: G.pine }),
      ];
      skyB = layers[0].minY;
      enso = ensoPath(M.x, M.y, M.r * 1.12);
      const mr = R.rng(9); mist = [];
      for (let b = 0; b < 2; b++) for (let i = 0; i < 5; i++) mist.push({ b, x: mr(), s: (0.35 + mr() * 0.4) * w, sp: 4 + mr() * 8, a: 0.4 + mr() * 0.35 });
    }
    build();
    // ink blot sprites: soft overlapping washes with a feathered rim
    const blots = [0, 1, 2].map((i) => {
      const n = 128, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), r = R.rng(100 + i);
      for (let k = 0; k < 24; k++) {
        const a = r() * R.TAU, d = r() * n * 0.15, rr = n * (0.08 + r() * 0.15), cx = n / 2 + Math.cos(a) * d, cy = n / 2 + Math.sin(a) * d;
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, 'rgba(22,20,18,.45)'); g.addColorStop(0.7, 'rgba(22,20,18,.2)'); g.addColorStop(1, 'rgba(22,20,18,0)');
        x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rr, 0, R.TAU); x.fill();
      }
      x.strokeStyle = 'rgba(22,20,18,.16)'; x.lineWidth = 0.7;
      for (let k = 0; k < 70; k++) { const a = r() * R.TAU, d0 = n * (0.2 + r() * 0.08), d1 = d0 + n * (0.03 + r() * 0.09); x.beginPath(); x.moveTo(n / 2 + Math.cos(a) * d0, n / 2 + Math.sin(a) * d0); x.lineTo(n / 2 + Math.cos(a + (r() - 0.5) * 0.2) * d1, n / 2 + Math.sin(a + (r() - 0.5) * 0.2) * d1); x.stroke(); }
      return c;
    });
    // plum blossom: a whole flower and a single petal
    const flower = (() => {
      const n = 40, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d');
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * R.TAU) / 5; x.fillStyle = i % 2 ? '#e2566a' : '#d8394f'; x.beginPath(); x.ellipse(n / 2 + Math.cos(a) * n * 0.2, n / 2 + Math.sin(a) * n * 0.2, n * 0.17, n * 0.14, a, 0, R.TAU); x.fill(); }
      x.fillStyle = '#f3d36b'; x.beginPath(); x.arc(n / 2, n / 2, n * 0.08, 0, R.TAU); x.fill();
      x.strokeStyle = '#8e1f2c'; x.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = (i * R.TAU) / 6; x.beginPath(); x.moveTo(n / 2, n / 2); x.lineTo(n / 2 + Math.cos(a) * n * 0.14, n / 2 + Math.sin(a) * n * 0.14); x.stroke(); }
      return c;
    })();
    const petalImg = (() => { const c = document.createElement('canvas'); c.width = 20; c.height = 14; const x = c.getContext('2d'); x.fillStyle = '#dc4258'; x.beginPath(); x.ellipse(10, 7, 9, 6, 0, 0, R.TAU); x.fill(); x.fillStyle = 'rgba(255,220,225,.45)'; x.beginPath(); x.ellipse(8, 5.5, 4, 2.5, 0, 0, R.TAU); x.fill(); return c; })();
    const blooms = [], petals = [], birds = [], spatter = [];
    let enterT = 9;
    const bloom = (x, y, s, a, k) => { blooms.push({ x, y, s, a, k: k == null ? Math.floor(rnd() * 3) : k, age: 0, life: 3.4 + rnd() * 1.2, rot: rnd() * R.TAU }); if (blooms.length > 14) blooms.shift(); };
    const flock = (n, y) => { for (let i = 0; i < n; i++) birds.push({ x: -20 - i * 16 - rnd() * 20, y: y + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 8 + rnd() * 4, vx: 38 + rnd() * 10, vy: -4 - rnd() * 4, s: 5 + rnd() * 2.5, ph: rnd() * 6 }); };
    const blow = (n) => { const { w, h } = cv; for (let i = 0; i < n; i++) petals.push({ x: -20 - rnd() * w * 0.4, y: rnd() * h * 0.7 - h * 0.1, vx: 50 + rnd() * 80, vy: 18 + rnd() * 40, rot: rnd() * R.TAU, vr: (rnd() - 0.5) * 3, fl: rnd() * 6, s: 0.6 + rnd() * 0.7, whole: rnd() < 0.3, ph: rnd() * 6 }); if (petals.length > 260) petals.splice(0, petals.length - 260); };
    flock(3, cv.h * 0.16);
    for (const b of birds) b.x = cv.w * (0.2 + rnd() * 0.5);
    api.on('hot', (on) => {
      if (!on) return;
      const { w } = cv;
      blow(low ? 50 : 110);
      for (let i = 0; i < 3; i++) bloom(w * (0.12 + rnd() * 0.76), skyB * (0.25 + rnd() * 0.6), Math.min(w, cv.h) * (0.22 + rnd() * 0.16), 0.48);
      const sx = w * (0.2 + rnd() * 0.6), sy = skyB * (0.3 + rnd() * 0.4);
      for (let i = 0; i < 26; i++) { const a = rnd() * R.TAU, sp = 80 + rnd() * 260; spatter.push({ x: sx, y: sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 1 + rnd() * 3.2, life: 1 }); }
      flock(7, cv.h * 0.2);
    });
    api.beat((s) => {
      const { w } = cv;
      if (s > 0.62 && blooms.length < 8) bloom(w * rnd(), skyB * (0.15 + rnd() * 0.75), Math.min(w, cv.h) * (0.1 + s * 0.16), 0.22 + s * 0.16);
      if (R.viz.hot > 0.5) blow(low ? 2 : 4);
      if (R.viz.beatN % 32 === 16) flock(2 + Math.floor(rnd() * 3), cv.h * (0.12 + rnd() * 0.12));
    });
    let lastHot = -1;
    return {
      enter() { enterT = 0; },
      swap() { bloom(M.x, M.y, M.r * 3.2, 0.5, 0); flock(5, Math.max(30, M.y - M.r * 0.6)); },
      onTrack(tk) { sealEl.textContent = sealOf(tk); },
      onMeta(tk) { sealEl.textContent = sealOf(tk); },
      resize() { cv.resize(); build(); },
      frame(dt, t, v) {
        const { ctx, w, h } = cv;
        enterT += dt;
        const fin = (d) => Math.min(1, Math.max(0, (enterT - d) / 0.8));
        cv.clear();
        // sun sinking behind the far range
        const sr = Math.max(13, Math.min(w, h) * 0.055), sx = G.sun[0] * w, sy = G.sun[1] * h;
        ctx.globalAlpha = fin(0.1) * (0.35 + v.hot * 0.4 + v.level * 0.2);
        ctx.drawImage(api.glow('#e0623f', 64), sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
        ctx.globalAlpha = fin(0.1) * 0.88; ctx.fillStyle = '#c8392b'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, R.TAU); ctx.fill();
        // ink soaking into the paper
        for (let i = blooms.length - 1; i >= 0; i--) {
          const b = blooms[i]; b.age += dt; if (b.age > b.life) { blooms.splice(i, 1); continue; }
          const g = 1 - Math.exp(-b.age * 2.4), s = b.s * (0.3 + 0.7 * g);
          ctx.globalAlpha = b.a * Math.pow(1 - b.age / b.life, 1.3);
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.drawImage(blots[b.k], -s / 2, -s / 2, s, s); ctx.restore();
        }
        // three ranges with mist between them, drifting a little apart
        const drift = [Math.sin(t * 0.05) * 6, Math.sin(t * 0.07 + 1) * 10, Math.sin(t * 0.09 + 2) * 14];
        const mistA = (1 - v.hot * 0.6) * fin(0.3);
        for (let l = 0; l < 3; l++) {
          const L = layers[l];
          ctx.globalAlpha = fin(0.2 + l * 0.25);
          ctx.drawImage(L.c, -30 + drift[l], L.top + (l === 2 ? -v.bass * 2 : 0), L.W, L.H);
          if (l < 2) {
            const my = (l ? G.mid[0] : G.far[0]) * h - h * 0.03;
            for (const m of mist) {
              if (m.b !== l) continue;
              const x = ((m.x * (w + m.s * 2) + t * m.sp) % (w + m.s * 2)) - m.s;
              ctx.globalAlpha = m.a * mistA; ctx.drawImage(api.glow('#f4ecdb', 64), x - m.s, my - m.s * 0.16, m.s * 2, m.s * 0.32);
            }
          }
        }
        // river: broken ripple strokes that run with the music, a fisherman drifting
        const rt = G.river[0] * h, rb = G.river[1] * h, fr = fin(0.9);
        ctx.strokeStyle = INK; ctx.lineCap = 'round';
        for (let j = 0; j < 7; j++) {
          const f = j / 6, y = rt + (rb - rt) * f, sp = 6 + f * 16, len = 10 + f * 24, gw = 46 + f * 42, amp = v.bands[(j * 4 + 2) % 32];
          ctx.globalAlpha = (0.12 + f * 0.24) * fr; ctx.lineWidth = 0.8 + f * 1.1 + amp * 1.4;
          ctx.beginPath();
          const off = (t * sp + j * 37) % gw;
          for (let x0 = -gw + off; x0 < w + gw; x0 += gw) {
            const xs = x0 + Math.sin(x0 * 0.13 + j) * 12, L = len * (0.6 + 0.8 * R.noise1(x0 * 0.02 + j * 5, 9)) * (1 + amp * 0.8);
            ctx.moveTo(xs, y); ctx.quadraticCurveTo(xs + L / 2, y - 1.5 - amp * 3, xs + L, y);
          }
          ctx.stroke();
        }
        const bs = Math.max(15, Math.min(32, h * 0.034)), bx = w * (0.6 + 0.2 * Math.sin(t * 0.035)), by = rt + (rb - rt) * 0.36 + Math.sin(t * 1.7) * 1.4;
        ctx.globalAlpha = 0.9 * fr; ctx.fillStyle = INK;
        ctx.beginPath(); ctx.moveTo(bx - bs, by - bs * 0.14); ctx.quadraticCurveTo(bx, by + bs * 0.34, bx + bs, by - bs * 0.18); ctx.quadraticCurveTo(bx, by + bs * 0.1, bx - bs, by - bs * 0.14); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx - bs * 0.22, by); ctx.lineTo(bx - bs * 0.12, by - bs * 0.42); ctx.lineTo(bx + bs * 0.05, by - bs * 0.42); ctx.lineTo(bx + bs * 0.12, by); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx - bs * 0.34, by - bs * 0.38); ctx.lineTo(bx - bs * 0.04, by - bs * 0.62); ctx.lineTo(bx + bs * 0.26, by - bs * 0.38); ctx.closePath(); ctx.fill();
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx + bs * 0.05, by - bs * 0.3); ctx.lineTo(bx + bs * 1.15, by - bs * 0.98); ctx.stroke();
        ctx.globalAlpha = 0.4 * fr; ctx.beginPath(); ctx.moveTo(bx + bs * 1.15, by - bs * 0.98); ctx.lineTo(bx + bs * 1.2, by + bs * 0.24); ctx.stroke();
        ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(bx + bs * 1.2, by + bs * 0.26, bs * 0.25 + (t * 6 % 6), 1.6, 0, 0, R.TAU); ctx.stroke();
        // the ensō: a faint guide, painted solid as the song plays
        ctx.globalAlpha = fin(0.6) * 0.1; ctx.fillStyle = INK; ctx.fill(enso.p);
        if (v.progress > 0.002) {
          ctx.save(); ctx.beginPath(); ctx.moveTo(M.x, M.y); ctx.arc(M.x, M.y, M.r * 1.8, enso.a0 - 0.05, enso.a0 + v.progress * enso.span); ctx.closePath(); ctx.clip();
          ctx.globalAlpha = fin(0.6) * 0.88; ctx.fill(enso.p); ctx.restore();
        }
        // birds
        ctx.globalAlpha = fin(0.8) * 0.85; ctx.strokeStyle = INK; ctx.lineWidth = 1.3;
        ctx.beginPath();
        for (let i = birds.length - 1; i >= 0; i--) {
          const b = birds[i]; b.x += b.vx * dt; b.y += b.vy * dt + Math.sin(t * 0.8 + b.ph) * 0.15;
          if (b.x > w + 30 || b.y < -30) { birds.splice(i, 1); continue; }
          const f = Math.sin(t * 7 + b.ph);
          ctx.moveTo(b.x - b.s, b.y - b.s * 0.45 * f); ctx.quadraticCurveTo(b.x - b.s * 0.45, b.y - b.s * 0.55 * f - 1, b.x, b.y);
          ctx.quadraticCurveTo(b.x + b.s * 0.45, b.y - b.s * 0.55 * f - 1, b.x + b.s, b.y - b.s * 0.45 * f);
        }
        ctx.stroke();
        if (birds.length < 2 && rnd() < dt * 0.05) flock(2, h * (0.1 + rnd() * 0.15));
        // spatter from the chorus splash
        ctx.fillStyle = INK;
        for (let i = spatter.length - 1; i >= 0; i--) {
          const p = spatter[i]; p.life -= dt * 0.25; if (p.life <= 0) { spatter.splice(i, 1); continue; }
          const k = Math.exp(-(1 - p.life) * 9); p.x += p.vx * dt * k; p.y += p.vy * dt * k;
          ctx.globalAlpha = Math.min(1, p.life * 1.5) * 0.8; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, R.TAU); ctx.fill();
        }
        // plum blossom on the wind
        for (let i = petals.length - 1; i >= 0; i--) {
          const p = petals[i]; p.x += (p.vx + Math.sin(t * 2 + p.ph) * 26) * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.fl += dt * 3;
          if (p.x > w + 30 || p.y > h + 30) { petals.splice(i, 1); continue; }
          ctx.globalAlpha = 0.92; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          if (p.whole) { const s = 22 * p.s; ctx.drawImage(flower, -s / 2, -s / 2, s, s); }
          else { ctx.scale(1, 0.25 + 0.75 * Math.abs(Math.cos(p.fl))); const s = 12 * p.s; ctx.drawImage(petalImg, -s / 2, -s * 0.35, s, s * 0.7); }
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        const hv = Math.round(v.hot * 40) / 40;
        if (hv !== lastHot) { lastHot = hv; root.style.setProperty('--hot', hv); }
      },
    };
  },
});
