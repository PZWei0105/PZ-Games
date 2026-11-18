/* ===================== skin: 深海 ABYSS — the deep sea, lit only by the things that live there =====================
   Glowing jellyfish swim by pulsing their bells, and they pulse on the beat (read ahead, so the bell is fully closed
   exactly on it); the big one keeps to the bar's first beat. A school of lantern fish turns all at once on the kick
   drum, the turn running through the school like a wave. Marine snow drifts down past you in three layers that slide
   apart as you tilt the phone. The depth gauge sinks as the song goes on. In the chorus a whale covered in light
   passes slowly behind everything. Tap the water and the plankton flare in a ring of blue light. */
R.skins.def({
  id: 'abyss', name: '深海', group: '夢幻', en: 'ABYSS',
  desc: '深海裡會發光的水母跟著拍子收縮游動、魚群在大鼓上一起轉向；副歌一隻發光的鯨魚緩緩游過；點一下水會散出螢光',
  bloom: { s: 0.62, th: 0.56, tint: '#5fe8ff' }, hero: '.ab-art', trans: 'portal', hype: false,
  theme: { bg: '#010811', fg: '#dff8ff', accent: '#4fe3ff', accent2: '#c77dff', ui: 'rgba(3,12,20,.97)', dock: 'rgba(6,20,32,.45)', dockfg: '#c9f4ff' },
  enterMs: 2400, swapMs: 1400, punch: 0.15,
  depth: [['.ab-hud', 0.6]],
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="abb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03213a"/><stop offset="1" stop-color="#000306"/></linearGradient><radialGradient id="abj" cx=".5" cy=".35" r=".65"><stop offset="0" stop-color="#e9b8ff" stop-opacity=".95"/><stop offset=".5" stop-color="#b06cff" stop-opacity=".45"/><stop offset="1" stop-color="#5a2a9a" stop-opacity=".05"/></radialGradient><radialGradient id="abg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#7ff0ff" stop-opacity=".6"/><stop offset="1" stop-color="#7ff0ff" stop-opacity="0"/></radialGradient></defs><rect width="116" height="150" fill="url(#abb)"/><circle cx="58" cy="58" r="44" fill="url(#abg)" opacity=".35"/><path d="M30 62c0-20 12-32 28-32s28 12 28 32c-4 3-8-2-12 1s-8-2-12 1-8-2-12 1-8-3-12 0z" fill="url(#abj)" stroke="#f0d6ff" stroke-opacity=".7"/><g fill="none" stroke="#d7a8ff" stroke-opacity=".55" stroke-width="1.4"><path d="M36 64c-2 14 4 24 0 40"/><path d="M46 66c2 16-4 26 2 44"/><path d="M58 66c-2 18 4 30-2 50"/><path d="M70 66c2 16-4 24 2 42"/><path d="M80 64c-2 12 3 22-1 34"/></g><g fill="#bfefff"><path d="M14 118l8-3-8-3 2 3z"/><path d="M24 126l8-3-8-3 2 3z"/><path d="M12 132l8-3-8-3 2 3z"/><path d="M90 30l8-3-8-3 2 3z"/><path d="M98 40l8-3-8-3 2 3z"/></g><g fill="#7ff0ff"><circle cx="20" cy="40" r="1"/><circle cx="96" cy="96" r="1.2"/><circle cx="74" cy="132" r=".9"/><circle cx="44" cy="20" r=".8"/><circle cx="104" cy="70" r=".7"/></g></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 520, f2: 780, dur: 0.12, v: 0.04, type: 'sine' }); },
    tick(s, t) { s.tone(t, { f: 1200, f2: 1500, dur: 0.04, v: 0.02, type: 'sine' }); },
    toggle(s, t) { s.tone(t, { f: 300, f2: 600, dur: 0.14, v: 0.05, type: 'sine' }); },
    play(s, t) { s.tone(t, { f: 110, f2: 220, dur: 0.6, v: 0.06, type: 'sine' }); s.notes(t + 0.1, [s.hz(62), s.hz(69), s.hz(74)], { dur: 0.9, v: 0.03, type: 'sine', gap: 0.12 }); },
    pause(s, t) { s.tone(t, { f: 220, f2: 90, dur: 0.6, v: 0.06, type: 'sine' }); },
    next(s, t) { s.tone(t, { f: 400, f2: 900, dur: 0.18, v: 0.045, type: 'sine' }); s.noise(t, { f: 900, dur: 0.3, v: 0.02, q: 1.2 }); },
    prev(s, t) { s.tone(t, { f: 900, f2: 400, dur: 0.18, v: 0.045, type: 'sine' }); s.noise(t, { f: 900, dur: 0.3, v: 0.02, q: 1.2 }); },
    enter(s, t) { s.noise(t, { f: 700, f2: 180, dur: 2, v: 0.05, q: 0.8 }); s.tone(t + 0.4, { f: 60, f2: 48, dur: 2.2, v: 0.07, type: 'sine' }); s.notes(t + 0.9, [s.hz(50), s.hz(57), s.hz(62), s.hz(69)], { dur: 1.4, v: 0.03, type: 'sine', gap: 0.22 }); },
    open(s, t) { s.tone(t, { f: 600, f2: 900, dur: 0.1, v: 0.03, type: 'sine' }); },
    close(s, t) { s.tone(t, { f: 900, f2: 600, dur: 0.1, v: 0.03, type: 'sine' }); },
    ok(s, t) { s.notes(t, [s.hz(74), s.hz(81)], { dur: 0.5, v: 0.03, type: 'sine', gap: 0.1 }); },
    glow(s, t) { s.tone(t, { f: 880, f2: 1320, dur: 0.5, v: 0.03, type: 'sine' }); s.tone(t + 0.04, { f: 1760, dur: 0.6, v: 0.012, type: 'sine' }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="ab-cv"></canvas>
      <div class="ab-hud" data-ui><b>DEPTH <em data-ab="d">0</em> m</b><span>ABYSSAL ZONE · <i data-ab="t">2.4</i>°C</span></div>
      <div class="ab-panel">
        <div class="ab-row" data-ui>
          <div class="ab-art"><img data-bind="cover" alt="" draggable="false"></div>
          <div class="ab-tx"><div class="ab-t" data-bind="title"></div><div class="ab-a" data-bind="artist"></div></div>
        </div>
        ${R.ui.seek('ab-seek')}
        ${R.ui.ctrl('ab-ctrl')}
      </div>`;
    const cvEl = root.querySelector('.ab-cv'), cv = api.canvas(cvEl, { dprMax: 2 });
    const dEl = root.querySelector('[data-ab="d"]'), tEl = root.querySelector('[data-ab="t"]');
    const rnd = R.rng(4401), TAU = R.TAU, low = () => api.low();
    let W = cv.w, H = cv.h, S = Math.min(W, H) / 390;
    let pal = ['#c77dff', '#4fe3ff', '#ff6fd8', '#7dffcf'];
    function palette() {
      const c = api.colors(), v = R.color.hexToRgb(c.vibrant), hsl = R.color.rgbToHsl(v[0], v[1], v[2]);
      const h = hsl[0];
      pal = [R.color.hsl(h, 0.9, 0.72), '#4fe3ff', R.color.hsl(h + 60, 0.85, 0.7), R.color.hsl(h + 300, 0.8, 0.72)];
    }

    /* ---------- the living things ---------- */
    const jellies = [], fish = [], snow = [], sparks = [];
    function makeJelly(i, n) {
      const big = i === 0, R0 = (big ? 62 : 26 + rnd() * 24) * S;
      const j = { big, R: R0, x: W * (0.15 + 0.7 * ((i + 0.5) / n)) + (rnd() - 0.5) * 40 * S, y: H * (0.2 + rnd() * 0.5), vx: 0, vy: 0, a: (rnd() - 0.5) * 0.4, c: 0, col: i % pal.length, ph: rnd() * 10, period: big ? 4 : 1 + (i % 2), off: i % 2, strands: [], arms: [], seed: rnd() * 100 };
      const nS = big ? 14 : 9, nP = big ? 18 : 13, seg = R0 * (big ? 0.2 : 0.17);
      for (let k = 0; k < nS; k++) { const pts = []; for (let p = 0; p < nP; p++) pts.push({ x: j.x, y: j.y + p * seg, px: j.x, py: j.y + p * seg }); j.strands.push({ pts, seg, u: (k + 0.5) / nS }); }
      for (let k = 0; k < 4; k++) { const pts = []; const nA = big ? 11 : 8; for (let p = 0; p < nA; p++) pts.push({ x: j.x, y: j.y + p * seg * 1.1, px: j.x, py: j.y + p * seg * 1.1 }); j.arms.push({ pts, seg: seg * 1.1, u: 0.3 + k * 0.13 }); }
      return j;
    }
    function populate() {
      W = cv.w; H = cv.h; S = Math.min(W, H) / 390 * (Math.max(W, H) > 1000 ? 1.25 : 1);
      jellies.length = 0; fish.length = 0; snow.length = 0;
      const nJ = low() ? 4 : 5; for (let i = 0; i < nJ; i++) jellies.push(makeJelly(i, nJ));
      const nF = low() ? 36 : 64, fx = W * 0.5, fy = H * 0.62;
      school.x = fx; school.y = fy;
      for (let i = 0; i < nF; i++) {
        // each fish keeps its own place in the school (an elongated cloud), the ones at the back turn last
        const a = rnd() * TAU, r = Math.sqrt(rnd()), ox = Math.cos(a) * r * 95 * S, oy = Math.sin(a) * r * 38 * S;
        fish.push({ x: fx + ox, y: fy + oy, ox, oy, h: Math.PI, dir: Math.PI, lag: 0.05 + (1 - (ox / (95 * S) + 1) / 2) * 0.22 + rnd() * 0.03, len: (8 + rnd() * 5) * S, ph: rnd() * 10 });
      }
      for (let i = 0; i < (low() ? 90 : 170); i++) snow.push({ x: rnd() * W, y: rnd() * H, z: (i % 3), s: 0.5 + rnd() * 1.5, sw: rnd() * 10 });
    }
    let school = { h: Math.PI, want: Math.PI, sp: 34, x: 0, y: 0 };

    /* ---------- the beat: jelly pulses read ahead, fish turn on the kick ---------- */
    const tmpB = [], tmpK = [];
    function pulseOf(j, t, beats) {
      // the bell closes over 0.12 s up to the beat, then opens again slowly
      let c = 0;
      for (let i = 0; i < beats.length; i += 3) {
        const bt = beats[i], bp = beats[i + 2], st = beats[i + 1];
        if (j.big ? bp !== 0 : j.period === 2 && bp % 2 !== j.off) continue;
        const d = t - bt, amp = j.big ? 1 : 0.65 + 0.4 * st;
        let v = 0;
        if (d < 0 && d > -0.12) { const p = 1 + d / 0.12; v = p * p * (3 - 2 * p); }
        else if (d >= 0 && d < 0.9) v = Math.exp(-d * 4.2);
        if (v * amp > c) c = v * amp;
      }
      return c;
    }
    let lastT = -1, flashW = 0;
    api.hit((kind, s) => {
      if (kind !== 'kick' || !R.player.isPlaying()) return;
      const cx = school.x, cy = school.y;
      // turn back toward the middle when the school is near an edge, otherwise a sharp swerve either way
      const toMid = Math.atan2(H * 0.58 - cy, W * 0.5 - cx), near = Math.min(cx, W - cx) < W * 0.22 || Math.min(cy, H - cy) < H * 0.2;
      school.want = near ? toMid + (rnd() - 0.5) * 0.6 : school.want + (rnd() < 0.5 ? -1 : 1) * (0.9 + rnd() * 0.9) * (0.7 + s * 0.4);
      school.sp = 34 + 50 * s; flashW = 1;
    });
    api.hit((kind, s) => { if (kind === 'snare' && R.player.isPlaying() && !low()) for (let i = 0; i < 6; i++) sparks.push({ x: rnd() * W, y: rnd() * H * 0.8, vx: 0, vy: 0, life: 0, max: 0.6 + rnd() * 0.6, c: '#9ff4ff', r: 1.5 * S }); });

    /* ---------- the whale ---------- */
    let whale = null;
    api.on('hot', (on) => { if (on && !whale) whale = { t: 0, dir: rnd() < 0.5 ? 1 : -1, y: H * (0.32 + rnd() * 0.18) }; });
    function drawWhale(c, now) {
      const w = whale, dur = 17, f = w.t / dur; if (f > 1) { whale = null; return; }
      const len = Math.max(W, H) * 0.95, x = w.dir > 0 ? -len * 0.6 + (W + len * 1.2) * f : W + len * 0.6 - (W + len * 1.2) * f;
      const y = w.y + Math.sin(f * Math.PI * 2) * 20 * S, sway = Math.sin(now * 1.1) * 0.12, a = Math.min(1, f * 6, (1 - f) * 6);
      c.save(); c.translate(x, y); c.scale(w.dir, 1); c.globalAlpha = a;
      // body: head at +x, tail flukes at -x
      const L = len, Hh = L * 0.13;
      c.beginPath(); c.moveTo(L * 0.42, 0); c.bezierCurveTo(L * 0.42, -Hh * 0.9, L * 0.1, -Hh, -L * 0.15, -Hh * 0.7);
      c.bezierCurveTo(-L * 0.35, -Hh * 0.4, -L * 0.45, -Hh * 0.08 + sway * L * 0.04, -L * 0.5, sway * L * 0.05);
      c.bezierCurveTo(-L * 0.45, Hh * 0.15 + sway * L * 0.04, -L * 0.3, Hh * 0.55, -L * 0.1, Hh * 0.75);
      c.bezierCurveTo(L * 0.15, Hh * 0.95, L * 0.4, Hh * 0.7, L * 0.42, 0); c.closePath();
      const g = c.createLinearGradient(0, -Hh, 0, Hh); g.addColorStop(0, '#0b3352'); g.addColorStop(0.55, '#05192b'); g.addColorStop(1, '#020a14');
      c.fillStyle = g; c.fill();
      c.strokeStyle = 'rgba(95,232,255,.22)'; c.lineWidth = 2 * S; c.stroke();
      // flukes and a pectoral fin
      c.fillStyle = '#03121f'; const tx = -L * 0.5, ty = sway * L * 0.05;
      c.beginPath(); c.moveTo(tx + L * 0.02, ty); c.quadraticCurveTo(tx - L * 0.06, ty - Hh * 0.9, tx - L * 0.14, ty - Hh * 1.1 + sway * 40 * S); c.quadraticCurveTo(tx - L * 0.07, ty - Hh * 0.2, tx - L * 0.02, ty); c.quadraticCurveTo(tx - L * 0.07, ty + Hh * 0.2, tx - L * 0.14, ty + Hh * 1.1 - sway * 40 * S); c.quadraticCurveTo(tx - L * 0.06, ty + Hh * 0.9, tx + L * 0.02, ty); c.fill();
      c.beginPath(); c.moveTo(L * 0.18, Hh * 0.55); c.quadraticCurveTo(L * 0.1, Hh * 1.5, -L * 0.02, Hh * 1.6 + sway * 30 * S); c.quadraticCurveTo(L * 0.08, Hh * 1.0, L * 0.06, Hh * 0.6); c.fill();
      // rows of light along the flank
      c.globalCompositeOperation = 'lighter';
      for (let row = 0; row < 3; row++) for (let k = 0; k < 26; k++) {
        const u = k / 25, px = L * (0.36 - u * 0.78), py = (-0.35 + row * 0.32) * Hh * (1 - u * 0.6) + Math.sin(u * 9) * Hh * 0.05;
        const tw = 0.5 + 0.5 * Math.sin(now * 3 + k * 0.7 + row * 2), s = (3 + row) * S * (1 - u * 0.4);
        c.globalAlpha = a * (0.35 + 0.55 * tw); c.drawImage(api.glow(row === 1 ? '#7ff0ff' : '#4fa8ff', 32), px - s * 2, py - s * 2, s * 4, s * 4);
      }
      c.globalAlpha = a * 0.9; c.drawImage(api.glow('#bff8ff', 32), L * 0.3 - 6 * S, -Hh * 0.25 - 6 * S, 12 * S, 12 * S);
      c.restore(); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }

    /* ---------- drawing a jellyfish ---------- */
    function rim(j, u) {
      // a point on the bell's rim, u 0..1 left to right, in world space
      const bw = j.R * (1 - 0.24 * j.c), bh = j.R * 0.82 * (1 + 0.16 * j.c), ca = Math.cos(j.a), sa = Math.sin(j.a);
      const lx = (u - 0.5) * 2 * bw * 0.96, ly = bh * 0.06 + Math.sin(u * Math.PI * 8 + j.ph) * j.R * 0.03;
      return [j.x + lx * ca - ly * sa, j.y + lx * sa + ly * ca];
    }
    function stepStrand(st, j, dt, now, k) {
      const p = st.pts, a0 = rim(j, st.u); p[0].x = a0[0]; p[0].y = a0[1];
      const drag = Math.exp(-dt * 2.6);
      for (let i = 1; i < p.length; i++) {
        const q = p[i], vx = (q.x - q.px) * drag, vy = (q.y - q.py) * drag;
        q.px = q.x; q.py = q.y;
        q.x += vx + (R.noise1(now * 0.7 + i * 0.3 + k * 3.1 + j.seed, 5) - 0.5) * 18 * S * dt; q.y += vy + 26 * S * dt * dt * 60;
      }
      for (let it = 0; it < 2; it++) for (let i = 1; i < p.length; i++) {
        const a = p[i - 1], b = p[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - st.seg) / d;
        if (i === 1) { b.x -= dx * f; b.y -= dy * f; } else { a.x += dx * f * 0.5; a.y += dy * f * 0.5; b.x -= dx * f * 0.5; b.y -= dy * f * 0.5; }
      }
    }
    function drawJelly(c, j, now) {
      const col = pal[j.col], bw = j.R * (1 - 0.24 * j.c), bh = j.R * 0.82 * (1 + 0.16 * j.c), lum = 0.55 + 0.45 * j.c;
      c.globalCompositeOperation = 'lighter';
      // tentacles and frilly oral arms
      c.lineCap = 'round';
      for (const st of j.strands) {
        c.strokeStyle = R.color.rgba(col, 0.32 * lum); c.lineWidth = Math.max(0.6, 1.1 * S);
        c.beginPath(); c.moveTo(st.pts[0].x, st.pts[0].y); for (let i = 1; i < st.pts.length; i++) c.lineTo(st.pts[i].x, st.pts[i].y); c.stroke();
      }
      for (const st of j.arms) {
        c.strokeStyle = R.color.rgba(col, 0.22 * lum); c.lineWidth = Math.max(1.5, 4.5 * S * (j.big ? 1.4 : 1));
        c.beginPath(); c.moveTo(st.pts[0].x, st.pts[0].y);
        for (let i = 1; i < st.pts.length; i++) { const q = st.pts[i], w = Math.sin(i * 1.3 + now * 2) * 2.5 * S; c.lineTo(q.x + w, q.y); }
        c.stroke();
      }
      // the bell
      c.save(); c.translate(j.x, j.y); c.rotate(j.a);
      c.globalAlpha = 0.28 + 0.42 * lum; c.drawImage(api.glow(col, 64), -bw * 2.2, -bh * 1.8, bw * 4.4, bh * 3.2);
      c.globalAlpha = 1;
      c.beginPath(); c.moveTo(-bw, bh * 0.06);
      c.bezierCurveTo(-bw, -bh * 0.75, -bw * 0.55, -bh, 0, -bh); c.bezierCurveTo(bw * 0.55, -bh, bw, -bh * 0.75, bw, bh * 0.06);
      for (let k = 8; k > 0; k--) { const x0 = bw - (2 * bw) * (9 - k) / 8 + bw * 2 / 8, xm = x0 - bw / 8; c.quadraticCurveTo(xm, bh * 0.2, x0 - bw / 4, bh * 0.06); }
      c.closePath();
      const g = c.createRadialGradient(0, -bh * 0.55, bh * 0.05, 0, -bh * 0.2, bw * 1.15);
      g.addColorStop(0, R.color.rgba('#ffffff', 0.2 * lum)); g.addColorStop(0.35, R.color.rgba(col, 0.32 * lum)); g.addColorStop(1, R.color.rgba(col, 0.06));
      c.fillStyle = g; c.fill();
      c.strokeStyle = R.color.rgba(col, 0.7 * lum); c.lineWidth = Math.max(1, 1.6 * S); c.stroke();
      // the four rings inside the bell
      c.strokeStyle = R.color.rgba('#ffffff', 0.16 * lum); c.lineWidth = Math.max(0.8, 1.3 * S);
      for (let k = 0; k < 4; k++) { const ox = (k - 1.5) * bw * 0.26, sc = 1 - Math.abs(k - 1.5) * 0.25; c.beginPath(); c.arc(ox, -bh * 0.36, bw * 0.1 * sc, Math.PI * 0.15, Math.PI * 1.85); c.stroke(); }
      // the light running round the rim on the beat
      c.globalAlpha = j.c; c.drawImage(api.glow('#ffffff', 32), -bw * 1.1, -bh * 0.12, bw * 2.2, bh * 0.36);
      c.restore(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }

    /* ---------- tapping the water ---------- */
    cvEl.addEventListener('pointerdown', (e) => {
      const r = cvEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, n = low() ? 40 : 80;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rnd() * 0.1, sp = (90 + rnd() * 140) * S; sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 1.1 + rnd() * 0.9, c: rnd() < 0.8 ? '#7ff0ff' : '#c9a8ff', r: (1.4 + rnd() * 1.8) * S }); }
      sparks.push({ x, y, vx: 0, vy: 0, life: 0, max: 0.8, c: '#9ff4ff', r: 40 * S, ring: 1 });
      api.sfx('glow');
      // the fish dart away from it
      for (const f of fish) { const dx = f.x - x, dy = f.y - y, d = Math.hypot(dx, dy); if (d < 160 * S) { f.x += dx / d * 18 * S; f.y += dy / d * 18 * S; } }
    });

    let enterT = 0, depthShown = -1, lastBeatT = -1;
    palette(); populate();
    return {
      enter() { enterT = 0; },
      swap() { palette(); jellies.forEach((j, i) => { j.col = i % pal.length; }); },
      resize() { cv.resize(); populate(); },
      frame(dt, now, v) {
        enterT += dt;
        const { ctx, w, h } = cv;
        if (Math.abs(w - W) > 2 || Math.abs(h - H) > 2) populate();
        const t = v.t, playing = v.playing, hot = R.reduced ? 0 : v.hot, tx = R.tilt.x || 0, ty = R.tilt.y || 0;
        // the water: darker the deeper the song goes
        const prog = v.dur ? Math.min(1, t / v.dur) : 0;
        const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, R.color.mix('#05304d', '#021a2c', prog)); g.addColorStop(0.5, '#020f1c'); g.addColorStop(1, '#000306');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        // faint light from far above
        ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 4; k++) {
          const x0 = w * (0.15 + k * 0.25) + Math.sin(now * 0.12 + k * 2) * w * 0.08, a = (0.035 + 0.02 * Math.sin(now * 0.3 + k)) * (1 - prog * 0.6);
          const rg = ctx.createLinearGradient(0, 0, 0, h * 0.8); rg.addColorStop(0, `rgba(120,210,255,${a.toFixed(3)})`); rg.addColorStop(1, 'rgba(120,210,255,0)');
          ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x0 - 18 * S, 0); ctx.lineTo(x0 + 18 * S, 0); ctx.lineTo(x0 + 110 * S + tx * 30, h * 0.8); ctx.lineTo(x0 + 10 * S + tx * 30, h * 0.8); ctx.closePath(); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        // far marine snow, then the whale, then the near snow
        const drawSnow = (layer) => {
          for (const p of snow) {
            if (p.z !== layer) continue;
            const sp = (6 + p.z * 7) * S; p.y += sp * dt; p.x += Math.sin(now * 0.4 + p.sw) * 3 * S * dt;
            if (p.y > h + 4) { p.y = -4; p.x = rnd() * w; }
            const px = p.x + tx * (p.z + 1) * 8 * S, py = p.y + ty * (p.z + 1) * 6 * S;
            ctx.globalAlpha = 0.18 + p.z * 0.14; ctx.fillStyle = '#bfe6ff'; ctx.fillRect(px, py, p.s * (0.6 + p.z * 0.4), p.s * (0.6 + p.z * 0.4));
          }
          ctx.globalAlpha = 1;
        };
        drawSnow(0);
        if (whale) { whale.t += dt; drawWhale(ctx, now); }
        drawSnow(1);
        // the beats around now (for the pulses), the jellies swim
        if (playing) v.upcomingBeats(t - 1, t + 0.2, tmpB); else tmpB.length = 0;
        for (const j of jellies) {
          const c = playing ? pulseOf(j, t, tmpB) : 0.15 + 0.15 * Math.sin(now * 1.4 + j.ph);
          // thrust while the bell closes
          if (c > j.c + 0.01) { const push = (c - j.c) * (j.big ? 70 : 55) * S; j.vx += Math.sin(j.a) * push; j.vy -= Math.cos(j.a) * push; }
          j.c = c;
          j.vx *= Math.exp(-dt * 1.1); j.vy *= Math.exp(-dt * 1.1); j.vy += 5 * S * dt;
          j.x += j.vx * dt; j.y += j.vy * dt;
          // drift heading, steer back from the sides
          const wantA = (R.noise1(now * 0.05 + j.seed, 7) - 0.5) * 0.9 + (j.x < w * 0.12 ? 0.35 : j.x > w * 0.88 ? -0.35 : 0);
          j.a += (wantA - j.a) * (1 - Math.exp(-dt * 0.6));
          if (j.y < -j.R * 3.5) { j.y = h + j.R * 1.2; j.x = w * (0.15 + rnd() * 0.7); for (const st of j.strands.concat(j.arms)) for (const q of st.pts) { q.x = q.px = j.x; q.y = q.py = j.y + 2; } }
          if (j.y > h + j.R * 3) j.y = -j.R;
          for (let k = 0; k < j.strands.length; k++) stepStrand(j.strands[k], j, dt, now, k);
          for (let k = 0; k < j.arms.length; k++) stepStrand(j.arms[k], j, dt, now, k + 50);
        }
        jellies.sort((a, b) => a.R - b.R);
        for (const j of jellies) if (!j.big) drawJelly(ctx, j, now);
        // the school: each fish turns a moment after the one in front of it
        school.h += Math.atan2(Math.sin(school.want - school.h), Math.cos(school.want - school.h)) * (1 - Math.exp(-dt * 7));
        school.sp += (34 * S - school.sp) * (1 - Math.exp(-dt * 0.8)); flashW *= Math.exp(-dt * 3);
        const ssp = playing ? school.sp : 14 * S;
        school.x += Math.cos(school.h) * ssp * dt; school.y += Math.sin(school.h) * ssp * dt;
        // never let the school leave the water you can see
        if (school.x < -w * 0.1 || school.x > w * 1.1 || school.y < h * 0.12 || school.y > h * 0.78) school.want = Math.atan2(h * 0.55 - school.y, w * 0.5 - school.x);
        ctx.globalCompositeOperation = 'source-over';
        for (const f of fish) {
          const d = Math.atan2(Math.sin(school.h - f.h), Math.cos(school.h - f.h)); f.h += d * (1 - Math.exp(-dt / f.lag));
          const ca = Math.cos(f.h), sa = Math.sin(f.h), wob = Math.sin(now * 1.3 + f.ph) * 4 * S;
          const gx = school.x + f.ox * ca - (f.oy + wob) * sa, gy = school.y + f.ox * sa + (f.oy + wob) * ca;
          const k = 1 - Math.exp(-dt * 3.2), ox = f.x, oy = f.y;
          f.x += (gx - f.x) * k + ca * ssp * 0.15 * dt; f.y += (gy - f.y) * k + sa * ssp * 0.15 * dt;
          const vx = f.x - ox, vy = f.y - oy; if (vx * vx + vy * vy > 1e-4) { const want = Math.atan2(vy, vx); f.dir += Math.atan2(Math.sin(want - f.dir), Math.cos(want - f.dir)) * (1 - Math.exp(-dt * 10)); }
          const px = f.x + tx * 14 * S, py = f.y + ty * 10 * S, ang = f.dir;
          const shine = 0.25 + 0.75 * Math.pow(Math.abs(Math.sin(ang - 0.6)), 2) * (0.6 + 0.4 * flashW);
          ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
          const L = f.len, tail = Math.sin(now * 14 + f.ph) * L * 0.18;
          ctx.fillStyle = `rgba(${Math.round(70 + 150 * shine)},${Math.round(120 + 120 * shine)},${Math.round(160 + 90 * shine)},${(0.45 + 0.4 * shine).toFixed(2)})`;
          ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, L * 0.16, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-L * 0.42, 0); ctx.lineTo(-L * 0.72, -L * 0.18 + tail); ctx.lineTo(-L * 0.72, L * 0.18 + tail); ctx.closePath(); ctx.fill();
          ctx.restore();
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.5 * flashW; ctx.drawImage(api.glow('#5fe8ff', 32), px - 2.5 * S, py - 2.5 * S, 5 * S, 5 * S); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
        for (const j of jellies) if (j.big) drawJelly(ctx, j, now);
        drawSnow(2);
        // plankton sparks
        ctx.globalCompositeOperation = 'lighter';
        for (let i = sparks.length - 1; i >= 0; i--) {
          const p = sparks[i]; p.life += dt; if (p.life > p.max) { sparks.splice(i, 1); continue; }
          const f = p.life / p.max;
          if (p.ring) { ctx.globalAlpha = (1 - f) * 0.6; ctx.strokeStyle = p.c; ctx.lineWidth = 3 * S * (1 - f); ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.3 + f * 4), 0, TAU); ctx.stroke(); continue; }
          p.vx *= Math.exp(-dt * 2.2); p.vy *= Math.exp(-dt * 2.2); p.x += p.vx * dt; p.y += p.vy * dt;
          ctx.globalAlpha = Math.sin(f * Math.PI) * 0.95; ctx.drawImage(api.glow(p.c, 32), p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        // the chorus: the whole sea glows a little
        if (hot > 0.02) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = hot * 0.08 * (0.7 + 0.6 * v.pump); ctx.drawImage(api.glow('#3fb8ff', 64), -w * 0.3, h * 0.05, w * 1.6, h * 0.9); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        if (enterT < 2) { ctx.fillStyle = `rgba(0,2,5,${(1 - enterT / 2).toFixed(3)})`; ctx.fillRect(0, 0, w, h); }
        // depth gauge: you sink as the song plays
        const depth = Math.round((420 + prog * 3600) / 10) * 10;
        if (depth !== depthShown) { depthShown = depth; dEl.textContent = depth.toLocaleString('en-US'); tEl.textContent = (4 - prog * 2.6).toFixed(1); }
      },
    };
  },
});
