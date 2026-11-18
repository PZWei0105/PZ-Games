/* ===================== skin: 美漫分鏡 COMIC PANEL — the song as an American comic book page =====================
   The cover is redrawn as comic art (flat posterised colour, black ink lines, Ben-Day dots) and the page is cut into
   panels that change every bar: close-ups of the cover that push in on the beat, speed-line panels, a skyline at
   sunset, an equaliser drawn in ink, the title in big lettering. The kick drum throws BOOM! / POW! bursts across the
   panels, the snare a smaller SNAP!; one panel pops on every beat; if the song has synced lyrics, the line being sung
   sits in a speech balloon. In the chorus the page becomes one full splash panel. */
R.skins.def({
  id: 'comic', name: '美漫分鏡', group: '酷炫', en: 'COMIC PANEL',
  desc: '美漫賽璐璐風：封面變成漫畫，畫面切成分格每小節換頁；大鼓跳出 BOOM! POW!，歌詞變對話框，副歌整頁變跨頁大圖',
  bloom: false, hero: '.cm-art', trans: 'pixel', hype: false,
  theme: { bg: '#f3ead3', fg: '#141414', accent: '#ff3b30', accent2: '#ffe14d', ui: 'rgba(250,245,232,.98)', dock: 'rgba(20,20,20,.88)', dockfg: '#ffe14d', line: 'rgba(0,0,0,.2)' },
  enterMs: 1600, swapMs: 1000, punch: 0.25,
  emblem: `<svg class="em" viewBox="0 0 116 150"><rect width="116" height="150" fill="#f3ead3"/><g stroke="#111" stroke-width="3.2"><path d="M6 6h104v54l-104 8z" fill="#2ad4ff"/><path d="M6 74l50-4-4 74H6z" fill="#ff3b30"/><path d="M62 70l48-4v78H58z" fill="#ffe14d"/></g><g fill="#111" opacity=".35"><circle cx="16" cy="88" r="2"/><circle cx="26" cy="88" r="2"/><circle cx="36" cy="88" r="2"/><circle cx="21" cy="96" r="2"/><circle cx="31" cy="96" r="2"/><circle cx="16" cy="104" r="2"/><circle cx="26" cy="104" r="2"/><circle cx="36" cy="104" r="2"/></g><g stroke="#111" stroke-width="1.2" opacity=".6"><path d="M58 33L14 14M58 33L100 12M58 33L104 44M58 33L12 50M58 33L60 8"/></g><path d="M58 12l7 12 13-6-4 13 14 4-12 8 8 11-14-2-2 14-9-10-10 9-1-14-14 2 8-11-12-8 14-4-4-13 13 6z" fill="#ffe14d" stroke="#111" stroke-width="2.4"/><text x="58" y="40" text-anchor="middle" font-family="Bungee, Impact, sans-serif" font-size="13" fill="#ff3b30" stroke="#111" stroke-width=".8">POW!</text><rect x="64" y="96" width="38" height="26" rx="13" fill="#fff" stroke="#111" stroke-width="2"/><path d="M72 120l-6 10 12-8z" fill="#fff" stroke="#111" stroke-width="2"/><g fill="#111"><rect x="70" y="104" width="26" height="2.4"/><rect x="70" y="110" width="18" height="2.4"/></g></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 700, f2: 1100, dur: 0.05, v: 0.05, type: 'square', lp: 3000 }); },
    tick(s, t) { s.noise(t, { f: 3000, dur: 0.02, v: 0.04, q: 4 }); },
    toggle(s, t) { s.tone(t, { f: 500, f2: 900, dur: 0.08, v: 0.05, type: 'square', lp: 2500 }); },
    play(s, t) { s.tone(t, { f: 220, f2: 660, dur: 0.12, v: 0.07, type: 'square', lp: 2200 }); s.noise(t + 0.08, { f: 1800, f2: 400, dur: 0.25, v: 0.06, q: 1 }); },
    pause(s, t) { s.tone(t, { f: 660, f2: 220, dur: 0.14, v: 0.06, type: 'square', lp: 2200 }); },
    next(s, t) { s.noise(t, { f: 900, f2: 4000, dur: 0.18, v: 0.07, q: 1 }); s.tone(t, { f: 300, f2: 900, dur: 0.1, v: 0.05, type: 'square', lp: 2600 }); },
    prev(s, t) { s.noise(t, { f: 4000, f2: 900, dur: 0.18, v: 0.07, q: 1 }); s.tone(t, { f: 900, f2: 300, dur: 0.1, v: 0.05, type: 'square', lp: 2600 }); },
    enter(s, t) { s.noise(t, { f: 600, f2: 5000, dur: 0.3, v: 0.08, q: 0.8 }); s.tone(t + 0.25, { f: 90, f2: 45, dur: 0.4, v: 0.14, type: 'sine' }); s.noise(t + 0.25, { f: 2000, dur: 0.3, v: 0.08, q: 0.7 }); s.notes(t + 0.5, [s.hz(72), s.hz(76), s.hz(79), s.hz(84)], { dur: 0.12, v: 0.05, type: 'square', gap: 0.07, lp: 3000 }); },
    open(s, t) { s.tone(t, { f: 600, f2: 900, dur: 0.06, v: 0.045, type: 'square', lp: 2600 }); },
    close(s, t) { s.tone(t, { f: 900, f2: 600, dur: 0.06, v: 0.045, type: 'square', lp: 2600 }); },
    ok(s, t) { s.notes(t, [s.hz(79), s.hz(84)], { dur: 0.14, v: 0.05, type: 'square', gap: 0.08, lp: 3000 }); },
    flip(s, t) { s.noise(t, { f: 1500, f2: 5000, dur: 0.12, v: 0.035, q: 0.9 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="cm-cv"></canvas>
      <div class="cm-hud" data-ui><b data-cm="ep">第 1 話</b></div>
      <div class="cm-panel">
        <div class="cm-box" data-ui>
          <div class="cm-row">
            <div class="cm-art"><img data-bind="cover" alt="" draggable="false"></div>
            <div class="cm-tx"><div class="cm-t" data-bind="title"></div><div class="cm-a" data-bind="artist"></div></div>
          </div>
          ${R.ui.seek('cm-seek')}
        </div>
        ${R.ui.ctrl('cm-ctrl')}
      </div>`;
    const cvEl = root.querySelector('.cm-cv'), cv = api.canvas(cvEl, { dprMax: 2 }), panelEl = root.querySelector('.cm-panel'), epEl = root.querySelector('[data-cm="ep"]');
    const rnd = Math.random, TAU = R.TAU, INK = '#141414', PAPER = '#f3ead3';
    const POP = ['#ff3b30', '#ffe14d', '#2ad4ff', '#ff5ab4', '#46e07a', '#ff9f1c'];
    let cols = POP.slice();

    /* ---------- the cover as comic art: flat colour, ink lines, Ben-Day dots ---------- */
    let art = null, artTok = 0;
    async function comicify() {
      const my = ++artTok, t = api.track();
      const n = 512, c = await R.glk.coverCanvas(t, n); if (my !== artTok) return;
      const x = c.getContext('2d'); let d;
      try { d = x.getImageData(0, 0, n, n); } catch (e) { art = c; return; }
      const p = d.data, L = new Float32Array(n * n);
      for (let i = 0; i < n * n; i++) L[i] = (0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2]) / 255;
      const q = (v) => Math.round(Math.max(0, Math.min(1, v)) * 3) / 3 * 255;
      for (let i = 0; i < n * n; i++) {
        const l = L[i], o = i * 4;
        p[o] = q(l + (p[o] / 255 - l) * 1.7 + 0.06); p[o + 1] = q(l + (p[o + 1] / 255 - l) * 1.7 + 0.06); p[o + 2] = q(l + (p[o + 2] / 255 - l) * 1.7 + 0.06);
      }
      for (let y = 1; y < n - 1; y++) for (let xx = 1; xx < n - 1; xx++) {
        const i = y * n + xx;
        const gx = L[i - n + 1] + 2 * L[i + 1] + L[i + n + 1] - L[i - n - 1] - 2 * L[i - 1] - L[i + n - 1];
        const gy = L[i + n - 1] + 2 * L[i + n] + L[i + n + 1] - L[i - n - 1] - 2 * L[i - n] - L[i - n + 1];
        if (gx * gx + gy * gy > 0.16 || L[i] < 0.12) { const o = i * 4; p[o] = 20; p[o + 1] = 20; p[o + 2] = 20; }
      }
      x.putImageData(d, 0, 0);
      x.fillStyle = 'rgba(20,20,20,.5)'; const st = 8;
      for (let y = st / 2; y < n; y += st) for (let xx = (Math.floor(y / st) % 2) * st / 2; xx < n; xx += st) {
        const l = L[Math.floor(y) * n + Math.floor(xx)];
        if (l > 0.12 && l < 0.62) { const r = st * 0.5 * Math.min(1, (0.62 - l) / 0.5) * 1.05; x.beginPath(); x.arc(xx, y, r, 0, TAU); x.fill(); }
      }
      art = c;
      const cl = api.colors(); cols = [cl.vibrant, '#ffe14d', '#2ad4ff', '#ff3b30', '#ff5ab4', cl.muted || '#46e07a'];
    }
    // a halftone dot pattern for skies and shadows
    const dotC = document.createElement('canvas'); dotC.width = dotC.height = 10;
    { const x = dotC.getContext('2d'); x.fillStyle = 'rgba(20,20,20,.28)'; x.beginPath(); x.arc(2.5, 2.5, 1.6, 0, TAU); x.arc(7.5, 7.5, 1.6, 0, TAU); x.fill(); }
    let dots = null;

    /* ---------- page layouts (portrait; landscape uses them turned on their side) ---------- */
    const LAYOUTS = [
      [[0, 0, 1, 0, 1, 0.33, 0, 0.4], [0, 0.43, 0.56, 0.425, 0.48, 1, 0, 1], [0.59, 0.42, 1, 0.36, 1, 1, 0.51, 1]],
      [[0, 0, 1, 0, 1, 0.52, 0, 0.62], [0, 0.65, 1, 0.55, 1, 1, 0, 1]],
      [[0, 0, 0.6, 0, 0.55, 0.47, 0, 0.47], [0.63, 0, 1, 0, 1, 0.47, 0.58, 0.47], [0, 0.5, 0.42, 0.5, 0.47, 1, 0, 1], [0.45, 0.5, 1, 0.5, 1, 1, 0.5, 1]],
      [[0, 0, 1, 0, 1, 0.62, 0, 0.62], [0, 0.65, 0.48, 0.65, 0.48, 1, 0, 1], [0.51, 0.65, 1, 0.65, 1, 1, 0.51, 1]],
      [[0, 0, 1, 0, 1, 0.28, 0, 0.32], [0, 0.35, 1, 0.31, 1, 0.64, 0, 0.68], [0, 0.71, 1, 0.67, 1, 1, 0, 1]],
      [[0, 0, 0.5, 0, 0.44, 1, 0, 1], [0.53, 0, 1, 0, 1, 0.5, 0.5, 0.5], [0.5, 0.53, 1, 0.53, 1, 1, 0.47, 1]],
    ];
    const KINDS = ['zoom', 'burst', 'city', 'eq', 'title', 'zoom'];
    const CAPS = ['此時——', '與此同時……', '下一秒——', '然而……', '就在這時！', '那一夜，', '沒有人想到……', '轟——！'];
    let page = null, pageN = 0, nextBarAt = 0, lastLayout = -1, splash = false, epNo = 1;
    function newPage(isSplash) {
      let li = (Math.random() * LAYOUTS.length) | 0; if (li === lastLayout) li = (li + 1) % LAYOUTS.length; lastLayout = li;
      const kinds = KINDS.slice().sort(() => rnd() - 0.5), shapes = isSplash ? [[0, 0, 1, 0, 1, 1, 0, 1]] : LAYOUTS[li];
      const panels = shapes.map((q, i) => ({
        q, kind: isSplash ? 'splash' : i === 0 && rnd() < 0.5 ? 'zoom' : kinds[i % kinds.length],
        col: cols[(i + pageN) % cols.length], cx: 0.25 + rnd() * 0.5, cy: 0.25 + rnd() * 0.5, z: 1.2 + rnd() * 1.0, dz: (rnd() - 0.5) * 0.2, ang: (rnd() - 0.5) * 0.08, t0: i * 0.075, pop: 0,
      }));
      if (!isSplash && !panels.some((p) => p.kind === 'zoom')) panels[0].kind = 'zoom';
      page = { panels, t: 0, cap: CAPS[(rnd() * CAPS.length) | 0], splash: isSplash };
      pageN++; api.sfx('flip');
    }

    /* ---------- the panels ---------- */
    let PG = { x: 0, y: 0, w: 1, h: 1, land: false };
    function layout() {
      const { w, h } = cv, r0 = root.getBoundingClientRect(), pr = panelEl.getBoundingClientRect(), st = parseFloat(getComputedStyle(root).getPropertyValue('--st')) || 0;
      const land = w > h * 1.12, m = Math.max(10, Math.min(w, h) * 0.03);
      PG = land ? { x: m + (parseFloat(getComputedStyle(root).getPropertyValue('--sl')) || 0), y: st + (h > 520 ? 56 : m), w: Math.max(200, pr.left - r0.left - 2 * m), h: h - st - (h > 520 ? 56 : m) - m, land }
        : { x: m, y: st + 58, w: w - 2 * m, h: Math.max(200, pr.top - r0.top - st - 58 - m * 0.6), land };
      dots = cv.ctx.createPattern(dotC, 'repeat');
    }
    function pt(q, i) { const u = PG.land ? q[i * 2 + 1] : q[i * 2], v = PG.land ? q[i * 2] : q[i * 2 + 1]; return [PG.x + u * PG.w, PG.y + v * PG.h]; }
    function quad(c, q, inset) {
      const P = [0, 1, 2, 3].map((i) => pt(q, i)); const cx = (P[0][0] + P[1][0] + P[2][0] + P[3][0]) / 4, cy = (P[0][1] + P[1][1] + P[2][1] + P[3][1]) / 4;
      c.beginPath(); P.forEach(([x, y], i) => { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, k = inset / d; (i ? c.lineTo : c.moveTo).call(c, x - dx * k * 1.2, y - dy * k * 1.2); }); c.closePath();
      return { cx, cy, P };
    }
    function bbox(P) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
    function speedLines(c, fx, fy, b, n, a, rot) {
      c.fillStyle = `rgba(20,20,20,${a})`; const R0 = Math.hypot(b.w, b.h);
      for (let i = 0; i < n; i++) { const an = (i / n) * TAU + rot + Math.sin(i * 12.9898) * 0.05, wd = 0.012 + (Math.sin(i * 78.233) * 0.5 + 0.5) * 0.02, r0 = R0 * (0.22 + (Math.sin(i * 3.7) * 0.5 + 0.5) * 0.18);
        c.beginPath(); c.moveTo(fx + Math.cos(an) * r0, fy + Math.sin(an) * r0); c.lineTo(fx + Math.cos(an - wd) * R0, fy + Math.sin(an - wd) * R0); c.lineTo(fx + Math.cos(an + wd) * R0, fy + Math.sin(an + wd) * R0); c.closePath(); c.fill(); }
    }
    function drawArt(c, b, cx, cy, z) {
      const s = Math.max(b.w, b.h) * z, x = b.x + b.w / 2 - cx * s, y = b.y + b.h / 2 - cy * s;
      if (art) c.drawImage(art, x, y, s, s); else { c.fillStyle = cols[0]; c.fillRect(b.x, b.y, b.w, b.h); }
    }
    function lettering(c, text, x, y, size, fill, rot, maxW) {
      c.save(); c.translate(x, y); c.rotate(rot || 0);
      c.font = `400 ${size}px "Bungee", "Arial Black", ${R.SANS || 'sans-serif'}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      let s = size; if (maxW) { const mw = c.measureText(text).width; if (mw > maxW) { s = size * maxW / mw; c.font = `400 ${s}px "Bungee", "Arial Black", sans-serif`; } }
      c.lineJoin = 'round'; c.fillStyle = INK; for (let k = 1; k <= 4; k++) c.fillText(text, k * s * 0.025, k * s * 0.025);
      c.strokeStyle = INK; c.lineWidth = s * 0.16; c.strokeText(text, 0, 0); c.fillStyle = fill; c.fillText(text, 0, 0);
      c.restore();
    }
    function drawPanel(c, p, now, v, lyric) {
      const e = Math.max(0, Math.min(1, (page.t - p.t0) / 0.32)); if (e <= 0) return;
      const ez = 1 + 1.7 * Math.pow(e - 1, 3) + 0.7 * Math.pow(e - 1, 2), s = (0.7 + 0.3 * ez) * (1 + p.pop * 0.035);
      const P0 = [0, 1, 2, 3].map((i) => pt(p.q, i)), cx = (P0[0][0] + P0[2][0]) / 2, cy = (P0[0][1] + P0[2][1]) / 2;
      c.save(); c.translate(cx, cy); c.scale(s, s); c.rotate((1 - e) * p.ang * 3); c.translate(-cx, -cy); c.globalAlpha = Math.min(1, e * 2.5);
      const gut = Math.max(4, Math.min(PG.w, PG.h) * 0.012), { P } = quad(c, p.q, gut);
      c.save(); c.clip(); const b = bbox(P);
      const z = p.z + p.dz * page.t + (v.playing ? v.pump * 0.03 : 0);
      if (p.kind === 'zoom') {
        drawArt(c, b, p.cx, p.cy, z);
      } else if (p.kind === 'burst' || p.kind === 'splash') {
        c.fillStyle = p.col; c.fillRect(b.x, b.y, b.w, b.h); c.fillStyle = dots; c.fillRect(b.x, b.y, b.w, b.h);
        const fx = b.x + b.w / 2, fy = b.y + b.h * (p.kind === 'splash' ? 0.42 : 0.5);
        speedLines(c, fx, fy, b, p.kind === 'splash' ? 70 : 46, 0.85, now * (p.kind === 'splash' ? 0.25 : 0.05));
        const r = Math.min(b.w, b.h) * (p.kind === 'splash' ? 0.36 : 0.32) * (1 + (v.playing ? v.pump * 0.05 : 0));
        c.save(); c.beginPath(); c.arc(fx, fy, r, 0, TAU); c.clip(); drawArt(c, { x: fx - r, y: fy - r, w: r * 2, h: r * 2 }, 0.5, 0.5, 1.02); c.restore();
        c.strokeStyle = INK; c.lineWidth = Math.max(3, r * 0.05); c.beginPath(); c.arc(fx, fy, r, 0, TAU); c.stroke();
        if (p.kind === 'splash') { const tt = ((api.track() || {}).title || 'RESKIN'); lettering(c, tt.length > 14 ? tt.slice(0, 13) + '…' : tt, fx, b.y + b.h * 0.86, Math.min(b.w * 0.14, 64), '#ffe14d', -0.05, b.w * 0.9); }
      } else if (p.kind === 'city') {
        const g = c.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, '#ff5ab4'); g.addColorStop(0.55, '#ff9f1c'); g.addColorStop(1, '#ffe14d');
        c.fillStyle = g; c.fillRect(b.x, b.y, b.w, b.h); c.fillStyle = dots; c.fillRect(b.x, b.y, b.w, b.h);
        const sr = Math.min(b.w, b.h) * 0.24, sx = b.x + b.w * 0.62, sy = b.y + b.h * 0.42;
        c.save(); c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.clip(); drawArt(c, { x: sx - sr, y: sy - sr, w: sr * 2, h: sr * 2 }, 0.5, 0.5, 1); c.restore();
        c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.stroke();
        c.fillStyle = INK; const base = b.y + b.h, sd = R.rng(pageN * 7 + 3);
        for (let xx = b.x - 10; xx < b.x + b.w + 10;) { const bw = b.w * (0.06 + sd() * 0.1), bh = b.h * (0.18 + sd() * 0.42); c.fillRect(xx, base - bh, bw + 1, bh); if (sd() < 0.4) c.fillRect(xx + bw * 0.4, base - bh - b.h * 0.06, bw * 0.12, b.h * 0.06); xx += bw; }
      } else if (p.kind === 'eq') {
        c.fillStyle = '#2ad4ff'; c.fillRect(b.x, b.y, b.w, b.h); c.fillStyle = dots; c.fillRect(b.x, b.y, b.w, b.h);
        const bands = v.bands || [], n = 9, bw = b.w / (n + 1);
        for (let i = 0; i < n; i++) {
          const val = Math.min(1, (bands[Math.floor(i / n * Math.min(bands.length, 24))] || 0) * 1.2 + 0.05), bh = (b.h * 0.82) * val, x = b.x + bw * (i + 0.5), y = b.y + b.h - bh - b.h * 0.06;
          c.fillStyle = POP[i % POP.length]; c.fillRect(x, y, bw * 0.78, bh); c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(x, y, bw * 0.78, bh);
          c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(x + bw * 0.1, y + 3, bw * 0.12, Math.max(0, bh - 6));
        }
      } else if (p.kind === 'title') {
        c.fillStyle = '#ffe14d'; c.fillRect(b.x, b.y, b.w, b.h); speedLines(c, b.x + b.w / 2, b.y + b.h / 2, b, 40, 0.18, 0);
        const t = api.track() || {}, tt = t.title || 'RESKIN';
        lettering(c, tt.length > 12 ? tt.slice(0, 11) + '…' : tt, b.x + b.w / 2, b.y + b.h * 0.46, Math.min(b.h * 0.3, b.w * 0.16), '#ff3b30', -0.06, b.w * 0.86);
        c.font = `400 ${Math.max(11, Math.min(18, b.h * 0.1))}px "Permanent Marker", sans-serif`; c.fillStyle = INK; c.textAlign = 'center'; c.fillText((t.artist || '').toUpperCase().slice(0, 24), b.x + b.w / 2, b.y + b.h * 0.78);
      }
      c.restore();
      c.strokeStyle = INK; c.lineWidth = Math.max(3, Math.min(PG.w, PG.h) * 0.009); c.lineJoin = 'miter'; quad(c, p.q, gut); c.stroke();
      // the narration box on the first panel
      if (p === page.panels[0] && !page.splash) {
        c.font = `800 ${Math.max(12, Math.min(16, PG.w * 0.035))}px ${'-apple-system, "PingFang TC", "Noto Sans TC", sans-serif'}`;
        const tw = c.measureText(page.cap).width + 18, th = Math.max(24, Math.min(30, PG.w * 0.065)), x0 = P[0][0] + 10, y0 = P[0][1] + 10;
        c.fillStyle = '#ffe14d'; c.fillRect(x0, y0, tw, th); c.strokeStyle = INK; c.lineWidth = 2.5; c.strokeRect(x0, y0, tw, th);
        c.fillStyle = INK; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(page.cap, x0 + 9, y0 + th / 2 + 1);
      }
      // the line being sung, in a speech balloon on the first close-up
      if (lyric && p === page.panels.find((q) => q.kind === 'zoom' || q.kind === 'splash')) balloon(c, b, lyric);
      c.restore();
    }
    function balloon(c, b, text) {
      const fs = Math.max(13, Math.min(19, b.w * 0.05)); c.font = `800 ${fs}px -apple-system, "PingFang TC", "Noto Sans TC", sans-serif`;
      const maxW = b.w * 0.62, lines = []; let cur = '';
      for (const ch of Array.from(text)) { if (c.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; if (lines.length === 2) break; } else cur += ch; }
      if (lines.length < 2 && cur) lines.push(cur);
      const tw = Math.max(...lines.map((l) => c.measureText(l).width)), bw = tw + fs * 1.6, bh = lines.length * fs * 1.3 + fs * 1.1;
      const x = b.x + b.w - bw - b.w * 0.06, y = b.y + b.h - bh - b.h * 0.14;
      c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 2.5;
      c.beginPath(); c.ellipse(x + bw / 2, y + bh / 2, bw / 2 + fs * 0.4, bh / 2 + fs * 0.2, 0, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x + bw * 0.3, y + bh * 0.9); c.lineTo(x + bw * 0.12, y + bh + fs * 1.4); c.lineTo(x + bw * 0.48, y + bh * 0.96); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(x + bw / 2, y + bh / 2, bw / 2 + fs * 0.4 - 1.5, bh / 2 + fs * 0.2 - 1.5, 0, 0, TAU); c.fill();
      c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle'; lines.forEach((l, i) => c.fillText(l, x + bw / 2, y + fs * 0.55 + fs * 0.65 + i * fs * 1.3));
    }

    /* ---------- sound effects in letters ---------- */
    const KICK = ['BOOM!', 'POW!', 'BAM!', 'WHAM!', 'KRAK!', 'BLAM!', 'THOOM!', 'KA-POW!'], SNARE = ['SNAP!', 'TSK!', 'CLAP!', 'ZAP!', 'CRACK!'];
    const fx = [];
    function sfxWord(words, s, big) {
      if (fx.length > 3) fx.shift();
      const p = page && page.panels[(Math.random() * page.panels.length) | 0], P = p ? [0, 1, 2, 3].map((i) => pt(p.q, i)) : null, b = P ? bbox(P) : { x: PG.x, y: PG.y, w: PG.w, h: PG.h };
      fx.push({ text: words[(Math.random() * words.length) | 0], x: b.x + b.w * (0.25 + rnd() * 0.5), y: b.y + b.h * (0.25 + rnd() * 0.5), rot: (rnd() - 0.5) * 0.5, size: Math.min(PG.w, PG.h) * (big ? 0.15 : 0.085) * (0.75 + 0.4 * s), t: 0, col: big ? POP[(rnd() * 3) | 0] : '#ffffff', burst: big, seed: rnd() * 100 });
    }
    api.hit((kind, s) => {
      if (!R.player.isPlaying() || !page) return;
      if (kind === 'kick' && s > 0.35 && rnd() < (page.splash ? 0.9 : 0.55)) sfxWord(KICK, s * (page.splash ? 1.3 : 1), true);
      else if (kind === 'snare' && s > 0.45 && rnd() < 0.3) sfxWord(SNARE, s, false);
    });
    let beatN = 0;
    api.beat((s, info) => {
      if (!page) return;
      beatN++; const p = page.panels[beatN % page.panels.length]; if (p) { p.pop = 1; p.z += 0.06 * s; }
    });
    function drawFx(c, dt) {
      for (let i = fx.length - 1; i >= 0; i--) {
        const f = fx[i]; f.t += dt; if (f.t > 0.75) { fx.splice(i, 1); continue; }
        const e = Math.min(1, f.t / 0.14), sc = f.t < 0.14 ? 0.4 + 0.8 * e + Math.sin(e * Math.PI) * 0.25 : 1 + (f.t - 0.14) * 0.15, a = f.t > 0.55 ? 1 - (f.t - 0.55) / 0.2 : 1;
        c.save(); c.globalAlpha = Math.max(0, a); c.translate(f.x, f.y); c.rotate(f.rot); c.scale(sc, sc);
        if (f.burst) {
          const n = 14, R1 = f.size * 1.5, R2 = f.size * 0.95, sd = R.rng(f.seed | 0);
          c.beginPath(); for (let k = 0; k < n * 2; k++) { const an = (k / (n * 2)) * TAU, r = (k % 2 ? R2 : R1) * (0.85 + sd() * 0.3); (k ? c.lineTo : c.moveTo).call(c, Math.cos(an) * r * 1.35, Math.sin(an) * r * 0.8); } c.closePath();
          c.fillStyle = f.col === '#ffe14d' ? '#ff3b30' : '#ffe14d'; c.fill(); c.strokeStyle = INK; c.lineWidth = Math.max(2.5, f.size * 0.06); c.stroke();
        }
        lettering(c, f.text, 0, 0, f.size, f.burst ? f.col === '#ffe14d' ? '#ffe14d' : f.col : '#ffffff', 0);
        c.restore();
      }
    }

    /* ---------- lyrics ---------- */
    let lyr = null, lyrId = null;
    function lyricAt(t) {
      const tr = api.track(); if (!tr) return '';
      if (lyrId !== tr.id) { lyrId = tr.id; const L = R.lyrics && R.lyrics.of(tr); lyr = L && L.synced ? L.synced : null; }
      if (!lyr) return '';
      let lo = 0, hi = lyr.length - 1, k = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (lyr[m][0] <= t) { k = m; lo = m + 1; } else hi = m - 1; }
      if (k < 0) return '';
      return (lyr[k][1] || '').trim();
    }

    let enterT = 0, wasHot = false, lastBar = -1;
    function episode() { const t = api.track(); epNo = t ? (R.hashStr(t.id || t.title || 'x') % 98) + 1 : 1; epEl.textContent = `第 ${epNo} 話`; }
    comicify(); episode(); layout(); newPage(false);
    return {
      enter() { enterT = 0; newPage(false); },
      swap() { comicify(); episode(); newPage(false); },
      resize() { cv.resize(); layout(); },
      frame(dt, now, v) {
        enterT += dt;
        const { ctx, w, h } = cv;
        if (!dots) layout();
        // a new page every bar (every two on slow songs); the chorus is one splash panel
        const hot = !R.reduced && v.hot > 0.5 && v.playing;
        if (hot !== wasHot) { wasHot = hot; newPage(hot); }
        const bars = Math.floor((v.beatT || 0) / ((v.bpm || 120) < 92 ? 8 : 4));
        if (v.playing && !hot && bars !== lastBar) { if (lastBar >= 0 && bars > lastBar) newPage(false); lastBar = bars; }
        page.t += dt;
        for (const p of page.panels) { p.pop *= Math.exp(-dt * 9); }
        ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(120,90,40,.06)'; for (let i = 0; i < 3; i++) ctx.fillRect(0, (now * 7 + i * 97) % h, w, 1);
        // the whole page shakes a little on a strong kick
        const shake = R.reduced ? 0 : (v.playing ? v.kickE || 0 : 0) * 3;
        ctx.save(); ctx.translate((rnd() - 0.5) * shake, (rnd() - 0.5) * shake);
        const lyric = v.playing ? lyricAt(v.t) : '';
        for (const p of page.panels) drawPanel(ctx, p, now, v, lyric);
        drawFx(ctx, dt);
        ctx.restore();
        if (page.t < 0.12) { ctx.fillStyle = `rgba(255,255,255,${(1 - page.t / 0.12) * 0.5})`; ctx.fillRect(0, 0, w, h); }
      },
      destroy() { artTok++; },
    };
  },
});
