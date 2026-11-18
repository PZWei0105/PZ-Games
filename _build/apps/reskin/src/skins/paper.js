/* ===================== skin: 立體紙雕 PAPER STAGE — a pop-up book made of cut paper =====================
   Layers of cut paper — sky, far mountains, hills, a village, the grass in front — each throwing a soft shadow on the
   one behind. Tilt the phone (or move the mouse) and the layers slide apart, so the page has real depth. The sun or
   the moon is the song's cover in a paper frame. On every bar one more paper piece stands up out of the page — trees,
   a house, a windmill, a balloon — with a little spring; on the beat they bob and the paper birds flap. Every eight
   bars the page turns to a new scene (dawn, day, dusk, night). In the chorus a paper castle rises out of the book. */
R.skins.def({
  id: 'paper', name: '立體紙雕', group: '雅致', en: 'PAPER STAGE',
  desc: '一層層的紙雕立體書：歪手機時前後層會錯開；每小節立起一個紙雕、拍子讓紙鳥拍翅；每八小節翻一頁，副歌紙城堡從書裡立起來',
  bloom: { s: 0.18, th: 0.86 }, hero: '.pp-art', trans: 'classic', hype: false,
  theme: { bg: '#f4ead8', fg: '#2d2433', accent: '#e0567a', accent2: '#f2b84b', ui: 'rgba(250,244,232,.98)', dock: 'rgba(60,44,60,.78)', dockfg: '#fff1dc', line: 'rgba(60,40,50,.18)' },
  enterMs: 2000, swapMs: 1200, punch: 0.12,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><filter id="pps"><feDropShadow dx="1.5" dy="2.5" stdDeviation="1.6" flood-color="#2a1a30" flood-opacity=".45"/></filter><clipPath id="ppc"><circle cx="82" cy="34" r="13"/></clipPath></defs><rect width="116" height="150" fill="#ffd6c2"/><rect width="116" height="150" fill="#f7a8b8" opacity=".35"/><g filter="url(#pps)"><circle cx="82" cy="34" r="16" fill="#fff3dc"/><g clip-path="url(#ppc)"><rect x="66" y="18" width="32" height="32" fill="#e0567a"/><circle cx="82" cy="34" r="7" fill="#f2b84b"/></g><path d="M0 92L20 64l16 18 20-30 22 28 14-14 24 26V150H0z" fill="#e08aa6"/><path d="M0 106c18-10 30-6 46 0s34 8 70-4V150H0z" fill="#c46a94"/><path d="M34 104l8-22 8 22z" fill="#5a8a5e"/><path d="M44 106l7-18 7 18z" fill="#4f7a55"/><path d="M70 96h18v14H70z" fill="#fff3dc"/><path d="M68 97l11-9 11 9z" fill="#d6577a"/><rect x="76" y="101" width="5" height="6" fill="#f2b84b"/><path d="M0 124c20-8 40-4 58 2s38 4 58-4V150H0z" fill="#8e4f86"/><path d="M0 138c26-6 50-2 70 2s30 2 46-2V150H0z" fill="#5a3a6e"/><path d="M22 40l6 3 6-3-6 1z" fill="#fff"/><path d="M40 30l5 2 5-2-5 1z" fill="#fff"/></g></svg>`,
  sfx: {
    tap(s, t) { s.noise(t, { f: 2600, dur: 0.04, v: 0.04, q: 1.5 }); },
    tick(s, t) { s.noise(t, { f: 3600, dur: 0.02, v: 0.03, q: 2 }); },
    toggle(s, t) { s.noise(t, { f: 1800, f2: 3200, dur: 0.07, v: 0.05, q: 1.2 }); },
    play(s, t) { s.noise(t, { f: 1200, f2: 4200, dur: 0.18, v: 0.05, q: 0.9 }); s.notes(t + 0.1, [s.hz(72), s.hz(79), s.hz(84)], { dur: 0.35, v: 0.035, type: 'triangle', gap: 0.08 }); },
    pause(s, t) { s.noise(t, { f: 4200, f2: 1200, dur: 0.18, v: 0.05, q: 0.9 }); },
    next(s, t) { s.noise(t, { f: 800, f2: 5000, dur: 0.32, v: 0.06, q: 0.8 }); },
    prev(s, t) { s.noise(t, { f: 5000, f2: 800, dur: 0.32, v: 0.06, q: 0.8 }); },
    enter(s, t) { s.noise(t, { f: 700, f2: 4800, dur: 0.6, v: 0.06, q: 0.7 }); s.notes(t + 0.5, [s.hz(67), s.hz(72), s.hz(76), s.hz(79), s.hz(84)], { dur: 0.4, v: 0.035, type: 'triangle', gap: 0.1 }); },
    open(s, t) { s.noise(t, { f: 2200, f2: 3600, dur: 0.06, v: 0.035, q: 1.2 }); },
    close(s, t) { s.noise(t, { f: 3600, f2: 2200, dur: 0.06, v: 0.035, q: 1.2 }); },
    ok(s, t) { s.notes(t, [s.hz(79), s.hz(84)], { dur: 0.3, v: 0.035, type: 'triangle', gap: 0.08 }); },
    pop(s, t) { s.noise(t, { f: 2400, f2: 900, dur: 0.06, v: 0.035, q: 1.4 }); s.tone(t + 0.01, { f: 520, f2: 880, dur: 0.07, v: 0.02, type: 'triangle' }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="pp-cv"></canvas>
      <div class="pp-hud" data-ui><b data-pp="pg">第 1 頁</b><span data-pp="tm">黎明</span></div>
      <div class="pp-panel">
        <div class="pp-card" data-ui>
          <div class="pp-row">
            <div class="pp-art"><img data-bind="cover" alt="" draggable="false"></div>
            <div class="pp-tx"><div class="pp-t" data-bind="title"></div><div class="pp-a" data-bind="artist"></div></div>
          </div>
          ${R.ui.seek('pp-seek')}
          ${R.ui.ctrl('pp-ctrl')}
        </div>
      </div>`;
    const cvEl = root.querySelector('.pp-cv'), cv = api.canvas(cvEl, { dprMax: 2 }), panelEl = root.querySelector('.pp-panel');
    const pgEl = root.querySelector('[data-pp="pg"]'), tmEl = root.querySelector('[data-pp="tm"]');
    const TAU = R.TAU;
    const THEMES = [
      { name: '黎明', sky: ['#f7a8b8', '#ffe0c8'], L: ['#e08aa6', '#c46a94', '#8e4f86', '#5a3a6e'], tree: ['#6d9a74', '#4f7a5c'], roof: '#d6577a', wall: '#fff3dc', win: '#f2b84b', bird: '#fff8ee', stars: 0, sun: 1 },
      { name: '白晝', sky: ['#9fd3f5', '#e6f6ff'], L: ['#8fc1e3', '#7cc493', '#56a874', '#2f7a52'], tree: ['#3f8f5a', '#2e6e45'], roof: '#e0567a', wall: '#fffaf0', win: '#9fd3f5', bird: '#ffffff', stars: 0, sun: 1 },
      { name: '黃昏', sky: ['#7a55c9', '#ffb36b'], L: ['#b0659e', '#7a4a8e', '#4e3470', '#2c2150'], tree: ['#3c3a6a', '#2c2a55'], roof: '#ff8a5c', wall: '#ffe8cc', win: '#ffd27a', bird: '#2c2150', stars: 0.3, sun: 1 },
      { name: '深夜', sky: ['#0f1d3d', '#2d5288'], L: ['#2c4f7a', '#1e3a60', '#142a48', '#0b1a30'], tree: ['#173554', '#0f2640'], roof: '#3b6aa0', wall: '#26466e', win: '#ffd98a', bird: '#cfe3ff', stars: 1, sun: 0 },
    ];
    let W = 1, H = 1, S = 1, B = { x: 0, y: 0, w: 1, h: 1, ground: 1 };
    let fiber = null, cover = null, coverTok = 0;
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(2, Math.ceil(w)); c.height = Math.max(2, Math.ceil(h)); return c; };
    // paper fibre: a faint noise to lay over every cut shape
    { fiber = mk(160, 160); const x = fiber.getContext('2d'), im = x.createImageData(160, 160), r = R.rng(9);
      for (let i = 0; i < 160 * 160; i++) { const v = 120 + r() * 70; im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } x.putImageData(im, 0, 0);
      x.globalAlpha = 0.25; x.strokeStyle = '#fff'; for (let i = 0; i < 60; i++) { x.beginPath(); const y = r() * 160; x.moveTo(r() * 160, y); x.lineTo(r() * 160, y + (r() - 0.5) * 20); x.stroke(); } }
    const dpr = () => Math.min(2, cv.dpr);
    // cut a shape out of coloured paper: fill, fibre, a soft shadow falling on whatever is behind
    function cut(x, path, col, sh) {
      x.save(); x.shadowColor = 'rgba(40,20,40,.38)'; x.shadowBlur = (sh || 10) * S * dpr(); x.shadowOffsetX = 3 * S * dpr(); x.shadowOffsetY = 5 * S * dpr();
      path(x); x.fillStyle = col; x.fill(); x.restore();
      x.save(); path(x); x.clip(); x.globalAlpha = 0.09; x.globalCompositeOperation = 'multiply'; const p = x.createPattern(fiber, 'repeat'); x.fillStyle = p; x.fillRect(-1e4, -1e4, 2e4, 2e4); x.restore();
      x.save(); path(x); x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 1.2 * S; x.stroke(); x.restore();
    }

    /* ---------- a page: the layers (pre-cut) and the pieces that stand up ---------- */
    let page = null, oldPage = null, turnT = 1, pageNo = 0;
    function buildPage(themeIdx) {
      const th = THEMES[themeIdx % THEMES.length], r = R.rng(themeIdx * 131 + pageNo * 17 + 5), pad = 40 * S;
      const LW = W + pad * 2, d = dpr(), gy = B.ground;
      const layer = (fn) => { const c = mk(LW * d, H * d), x = c.getContext('2d'); x.scale(d, d); x.translate(pad, 0); fn(x); return c; };
      const sky = mk(W * d, H * d); { const x = sky.getContext('2d'); x.scale(d, d); const g = x.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); x.fillStyle = g; x.fillRect(0, 0, W, H);
        x.globalAlpha = 0.08; x.globalCompositeOperation = 'multiply'; x.fillStyle = x.createPattern(fiber, 'repeat'); x.fillRect(0, 0, W, H); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
        if (th.stars) for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,248,220,${(0.3 + r() * 0.6) * th.stars})`; const s = (0.8 + r() * 1.8) * S; x.beginPath(); x.arc(r() * W, r() * gy * 0.8, s, 0, TAU); x.fill(); } }
      const hill = (yb, amp, n, ph) => (x) => { x.beginPath(); x.moveTo(-pad, H); x.lineTo(-pad, yb); for (let i = 0; i <= n; i++) { const xx = -pad + (LW / n) * i, yy = yb - amp * (0.5 + 0.5 * Math.sin(i * 1.7 + ph)) * (0.6 + 0.4 * Math.sin(i * 0.9 + ph * 2)); x.quadraticCurveTo(xx - LW / n / 2, yy - amp * 0.3, xx, yy); } x.lineTo(W + pad, H); x.closePath(); };
      // mountains: broad peaks with softened tops, like torn paper
      const peaks = (yb, amp, n, ph) => (x) => { x.beginPath(); x.moveTo(-pad, H); x.lineTo(-pad, yb); for (let i = 0; i < n; i++) { const x0 = -pad + (LW / n) * i, x1 = x0 + LW / n, xm = x0 + (x1 - x0) * (0.4 + 0.2 * r()), pk = yb - amp * (0.5 + 0.5 * Math.abs(Math.sin(i * 2.3 + ph))); x.lineTo(xm - (x1 - x0) * 0.08, pk + amp * 0.06); x.quadraticCurveTo(xm, pk - amp * 0.02, xm + (x1 - x0) * 0.08, pk + amp * 0.06); x.lineTo(x1, yb - amp * 0.12 * r()); } x.lineTo(W + pad, H); x.closePath(); };
      const L = [
        { c: layer((x) => cut(x, peaks(gy - B.h * 0.18, B.h * 0.26, 4, r() * 9), th.L[0], 14)), z: 0.25 },
        { c: layer((x) => cut(x, hill(gy - B.h * 0.12, B.h * 0.12, 6, r() * 9), th.L[1], 12)), z: 0.5 },
        { c: layer((x) => cut(x, hill(gy - B.h * 0.02, B.h * 0.09, 5, r() * 9), th.L[2], 12)), z: 0.75 },
        { c: layer((x) => { cut(x, hill(gy + B.h * 0.1, B.h * 0.07, 4, r() * 9), th.L[3], 14);
          // a row of round paper bushes and a few flowers along the front edge
          const bushes = []; for (let xx = -pad; xx < W + pad; xx += (26 + r() * 30) * S) bushes.push([xx, (16 + r() * 16) * S]);
          cut(x, (q) => { q.beginPath(); q.moveTo(-pad, H); for (const [bx, br] of bushes) q.arc(bx, gy + B.h * 0.09, br, Math.PI, 0); q.lineTo(W + pad, H); q.closePath(); }, R.color.mix(th.L[3], th.tree[1], 0.35), 10);
          for (let i = 0; i < 7; i++) { const fx = -pad + r() * (W + pad * 2), fy = gy + B.h * 0.07 - r() * 10 * S, fr = (4 + r() * 3) * S; cut(x, (q) => { q.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; q.moveTo(fx + Math.cos(a) * fr * 1.6 + fr * 0.9, fy + Math.sin(a) * fr * 1.6); q.arc(fx + Math.cos(a) * fr * 1.6, fy + Math.sin(a) * fr * 1.6, fr * 0.9, 0, TAU); } }, i % 2 ? th.wall : th.win, 4); }
        }), z: 1.15 },
      ];
      // the pieces that stand up, one per bar
      const pieces = [], slots = [0.12, 0.3, 0.5, 0.7, 0.88].sort(() => r() - 0.5);
      const kinds = ['pines', 'house', 'windmill', 'round', 'house2'];
      kinds.forEach((k, i) => pieces.push(makePiece(k, th, r, B.x + B.w * slots[i % slots.length], gy - B.h * (0.02 + r() * 0.05), i % 2 ? 0.75 : 0.6)));
      pieces.push(makePiece('balloon', th, r, B.x + B.w * (0.2 + r() * 0.25), gy - B.h * 0.62, 0.45));
      return { th, sky, L, pieces, pad, idx: themeIdx, up: 0 };
    }
    function makePiece(kind, th, r, x, y, z) {
      const s = S * (z > 0.7 ? 1.05 : 0.85), w = 120 * s, h = 150 * s, d = dpr(), c = mk((w + 40 * s) * d, (h + 30 * s) * d), q = c.getContext('2d');
      q.scale(d, d); q.translate(20 * s + w / 2, h + 6 * s);   // origin: the bottom centre (where it is hinged to the page)
      if (kind === 'pines') for (const [dx, sc, col] of [[-28, 0.8, th.tree[1]], [8, 1.05, th.tree[0]], [34, 0.7, th.tree[1]]]) {
        const tw = 26 * s * sc, tht = 92 * s * sc;
        cut(q, (p) => { p.beginPath(); p.moveTo(dx * s, -tht); for (let k = 0; k < 3; k++) { const yy = -tht + (tht * 0.85) * (k + 1) / 3; p.lineTo(dx * s + tw * (0.55 + k * 0.22), yy); p.lineTo(dx * s + tw * 0.25, yy); } p.lineTo(dx * s + 4 * s, 0); p.lineTo(dx * s - 4 * s, 0); for (let k = 2; k >= 0; k--) { const yy = -tht + (tht * 0.85) * (k + 1) / 3; p.lineTo(dx * s - tw * 0.25, yy); p.lineTo(dx * s - tw * (0.55 + k * 0.22), yy); } p.closePath(); }, col, 8);
      }
      if (kind === 'round') for (const [dx, sc] of [[-20, 0.9], [22, 1.1]]) {
        cut(q, (p) => { p.beginPath(); p.rect(dx * s - 3 * s, -40 * s * sc, 6 * s, 40 * s * sc); }, '#7a5a48', 4);
        cut(q, (p) => { p.beginPath(); p.arc(dx * s, -58 * s * sc, 26 * s * sc, 0, TAU); }, dx < 0 ? th.tree[1] : th.tree[0], 8);
      }
      if (kind === 'house' || kind === 'house2') {
        const hw = (kind === 'house' ? 62 : 48) * s, hh = (kind === 'house' ? 48 : 64) * s;
        cut(q, (p) => { p.beginPath(); p.rect(-hw / 2, -hh, hw, hh); }, th.wall, 8);
        cut(q, (p) => { p.beginPath(); p.moveTo(-hw / 2 - 8 * s, -hh + 2 * s); p.lineTo(0, -hh - hw * 0.55); p.lineTo(hw / 2 + 8 * s, -hh + 2 * s); p.closePath(); }, th.roof, 8);
        q.fillStyle = th.win; for (const [wx, wy] of [[-0.26, 0.55], [0.12, 0.55], [-0.26, 0.25]].slice(0, kind === 'house' ? 2 : 3)) q.fillRect(wx * hw, -hh * wy - 9 * s, 12 * s, 12 * s);
        q.fillStyle = 'rgba(60,40,50,.55)'; q.fillRect(hw * 0.12, -20 * s, 12 * s, 20 * s);
      }
      if (kind === 'windmill') {
        cut(q, (p) => { p.beginPath(); p.moveTo(-18 * s, 0); p.lineTo(-11 * s, -88 * s); p.lineTo(11 * s, -88 * s); p.lineTo(18 * s, 0); p.closePath(); }, th.wall, 8);
        cut(q, (p) => { p.beginPath(); p.moveTo(-15 * s, -86 * s); p.lineTo(0, -104 * s); p.lineTo(15 * s, -86 * s); p.closePath(); }, th.roof, 6);
      }
      if (kind === 'balloon') {
        cut(q, (p) => { p.beginPath(); p.moveTo(0, -36 * s); p.bezierCurveTo(-46 * s, -70 * s, -40 * s, -130 * s, 0, -132 * s); p.bezierCurveTo(40 * s, -130 * s, 46 * s, -70 * s, 0, -36 * s); }, th.roof, 10);
        q.save(); q.beginPath(); q.moveTo(0, -36 * s); q.bezierCurveTo(-46 * s, -70 * s, -40 * s, -130 * s, 0, -132 * s); q.bezierCurveTo(40 * s, -130 * s, 46 * s, -70 * s, 0, -36 * s); q.clip();
        q.fillStyle = th.wall; for (const dx of [-24, 8]) q.fillRect(dx * s, -140 * s, 12 * s, 110 * s); q.restore();
        q.strokeStyle = 'rgba(60,40,50,.6)'; q.lineWidth = 1.2 * s; q.beginPath(); q.moveTo(-8 * s, -38 * s); q.lineTo(-7 * s, -14 * s); q.moveTo(8 * s, -38 * s); q.lineTo(7 * s, -14 * s); q.stroke();
        cut(q, (p) => { p.beginPath(); p.rect(-9 * s, -14 * s, 18 * s, 14 * s); }, '#a5744f', 4);
      }
      return { kind, c, w: c.width / d, h: c.height / d, ox: 20 * s + w / 2, oy: h + 6 * s, x, y, z, up: 0, v: 0, target: 0, bob: 0, ph: r() * 10, s };
    }
    // the castle that rises in the chorus
    let castle = null;
    function buildCastle(th) {
      const s = S * 1.1, w = 260 * s, h = 260 * s, d = dpr(), c = mk((w + 40 * s) * d, (h + 40 * s) * d), q = c.getContext('2d');
      q.scale(d, d); q.translate(20 * s + w / 2, h + 10 * s);
      const tower = (x, tw, thh, roofH) => {
        cut(q, (p) => { p.beginPath(); p.rect(x - tw / 2, -thh, tw, thh); }, th.wall, 10);
        cut(q, (p) => { p.beginPath(); p.moveTo(x - tw / 2 - 6 * s, -thh + 2 * s); p.lineTo(x, -thh - roofH); p.lineTo(x + tw / 2 + 6 * s, -thh + 2 * s); p.closePath(); }, th.roof, 10);
        q.fillStyle = th.win; q.fillRect(x - 5 * s, -thh * 0.7, 10 * s, 14 * s);
        q.strokeStyle = 'rgba(60,40,50,.6)'; q.lineWidth = 1.5 * s; q.beginPath(); q.moveTo(x, -thh - roofH); q.lineTo(x, -thh - roofH - 18 * s); q.stroke();
        cut(q, (p) => { p.beginPath(); p.moveTo(x, -thh - roofH - 18 * s); p.lineTo(x + 16 * s, -thh - roofH - 13 * s); p.lineTo(x, -thh - roofH - 8 * s); p.closePath(); }, '#e0567a', 3);
      };
      tower(-100 * s, 40 * s, 150 * s, 50 * s); tower(100 * s, 40 * s, 150 * s, 50 * s);
      cut(q, (p) => { p.beginPath(); p.moveTo(-90 * s, 0); p.lineTo(-90 * s, -96 * s); for (let k = 0; k < 9; k++) { const x0 = -90 * s + k * 20 * s; p.lineTo(x0, -108 * s); p.lineTo(x0 + 10 * s, -108 * s); p.lineTo(x0 + 10 * s, -96 * s); p.lineTo(x0 + 20 * s, -96 * s); } p.lineTo(90 * s, 0); p.closePath(); }, th.wall, 12);
      tower(-46 * s, 46 * s, 190 * s, 60 * s); tower(46 * s, 46 * s, 190 * s, 60 * s); tower(0, 60 * s, 236 * s, 74 * s);
      cut(q, (p) => { p.beginPath(); p.moveTo(-22 * s, 0); p.lineTo(-22 * s, -40 * s); p.arc(0, -40 * s, 22 * s, Math.PI, 0); p.lineTo(22 * s, 0); p.closePath(); }, 'rgba(60,40,50,.85)', 4);
      castle = { c, w: c.width / d, h: c.height / d, ox: 20 * s + w / 2, oy: h + 10 * s, up: 0, v: 0 };
    }

    /* ---------- birds ---------- */
    const birds = []; let birdT = 2;
    function flock() { const dir = Math.random() < 0.5 ? 1 : -1, y = B.y + B.h * (0.15 + Math.random() * 0.3), n = 4 + ((Math.random() * 3) | 0); for (let i = 0; i < n; i++) birds.push({ x: dir > 0 ? -40 - i * 26 * S : W + 40 + i * 26 * S, y: y + (i % 2 ? 10 : -6) * S * i * 0.6, dir, sp: (40 + Math.random() * 15) * S, ph: i * 0.4, flap: 0 }); }

    /* ---------- layout ---------- */
    function layout() {
      W = cv.w; H = cv.h;
      const r0 = root.getBoundingClientRect(), pr = panelEl.getBoundingClientRect(), st = parseFloat(getComputedStyle(root).getPropertyValue('--st')) || 0;
      const land = W > H * 1.12;
      B = land ? { x: 0, y: st, w: Math.max(240, pr.left - r0.left), h: H - st } : { x: 0, y: st + 40, w: W, h: Math.max(240, pr.top - r0.top - st - 40) };
      B.ground = B.y + B.h * (land ? 0.8 : 0.9);
      S = Math.max(0.7, Math.min(1.6, Math.min(B.w / 390, B.h / 480)));
      const idx = page ? page.idx : 0, n = page ? page.pieces.filter((p) => p.target).length : 2;
      page = buildPage(idx); oldPage = null; turnT = 1; buildCastle(page.th);
      page.pieces.forEach((p, i) => { if (i < n) { p.target = 1; p.up = 1; } });
    }

    async function loadCover() { const my = ++coverTok; const c = await R.glk.coverCanvas(api.track(), 256); if (my === coverTok) cover = c; }

    /* ---------- the beat ---------- */
    let barSeen = -1, bars = 0;
    function onBar(n) {
      bars++;
      if (bars % 8 === 0) { turnPage(); return; }
      const p = page.pieces.find((q) => q.target === 0);
      if (p) { p.target = 1; p.v = 0; api.sfx('pop'); }
      else { const q = page.pieces[(Math.random() * page.pieces.length) | 0]; q.v -= 3.5; }
    }
    function turnPage() {
      oldPage = page; page = buildPage((oldPage.idx + 1) % THEMES.length); turnT = 0; pageNo++; api.sfx('next');
      // the castle stays up across a turn in the chorus (re-cut in the new page's colours)
      const k = castle; buildCastle(page.th); if (k) { castle.up = k.up; castle.v = k.v; }
      page.pieces[0].target = 1;
    }
    api.beat((s, info) => { if (!page) return; for (const p of page.pieces) if (p.target) p.bob = Math.max(p.bob, 0.6 + 0.4 * s); for (const b of birds) b.flap = 1; });

    let enterT = 0;
    layout(); loadCover();

    function drawLayerSet(c, pg, tx, ty, v, now, hot) {
      c.drawImage(pg.sky, 0, 0, W, H);
      // the sun or the moon: the cover in a paper frame
      const sr = Math.min(B.w, B.h) * 0.13, sx = B.x + B.w * 0.74 + tx * 6 * S, sy = B.y + B.h * 0.2 + ty * 4 * S;
      c.save(); c.shadowColor = 'rgba(40,20,40,.35)'; c.shadowBlur = 12 * S * dpr(); c.shadowOffsetX = 3 * S * dpr(); c.shadowOffsetY = 5 * S * dpr();
      c.fillStyle = pg.th.sun ? '#fff6dc' : '#f4f0ff'; c.beginPath();
      if (pg.th.sun) for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU + now * 0.05, rr = sr * (k % 2 ? 1.18 : 1.36) * (1 + (v.playing ? v.pump * 0.03 : 0)); (k ? c.lineTo : c.moveTo).call(c, sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
      else c.arc(sx, sy, sr * 1.12, 0, TAU);
      c.closePath(); c.fill(); c.restore();
      c.save(); c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.clip(); if (cover) c.drawImage(cover, sx - sr, sy - sr, sr * 2, sr * 2); else { c.fillStyle = pg.th.roof; c.fill(); } c.restore();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2 * S; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.stroke();
      const order = [];
      pg.L.forEach((l, i) => order.push({ z: l.z, f: () => c.drawImage(l.c, -pg.pad + tx * l.z * 22 * S, ty * l.z * 14 * S + Math.sin(now * 0.4 + i) * 1.5 * S, W + pg.pad * 2, H) }));
      for (const p of pg.pieces) order.push({ z: p.z + 0.01, f: () => drawPiece(c, p, tx, ty, now, v) });
      if (castle && pg === page && castle.up > 0.01) order.push({ z: 0.62, f: () => drawCastle(c, tx, ty) });
      order.sort((a, b) => a.z - b.z); for (const o of order) o.f();
    }
    function drawPiece(c, p, tx, ty, now, v) {
      if (p.up < 0.02) return;
      const fly = p.kind === 'balloon' ? Math.sin(now * 0.6 + p.ph) * 10 * S : 0;
      c.save(); c.translate(p.x + tx * p.z * 22 * S, p.y + ty * p.z * 14 * S + fly);
      c.scale(1 + p.bob * 0.02, Math.max(0.02, p.up) * (1 + p.bob * 0.04));
      c.drawImage(p.c, -p.ox, -p.oy, p.w, p.h);
      if (p.kind === 'windmill') {
        // the sails turn; faster when the song is loud
        c.translate(0, -88 * p.s); c.rotate(p.rot || 0); c.fillStyle = page.th.wall; c.strokeStyle = 'rgba(60,40,50,.5)'; c.lineWidth = 1;
        for (let k = 0; k < 4; k++) { c.rotate(TAU / 4); c.beginPath(); c.rect(-4 * p.s, 4 * p.s, 8 * p.s, 44 * p.s); c.fill(); c.stroke(); }
        c.fillStyle = page.th.roof; c.beginPath(); c.arc(0, 0, 5 * p.s, 0, TAU); c.fill();
      }
      c.restore();
    }
    function drawCastle(c, tx, ty) {
      const k = castle, e = Math.max(0, Math.min(1.1, k.up)), x = B.x + B.w * 0.5 + tx * 0.62 * 22 * S, y = B.ground - B.h * 0.03 + ty * 0.62 * 14 * S;
      c.save(); c.translate(x, y); c.scale(1, e); c.drawImage(k.c, -k.ox, -k.oy, k.w, k.h); c.restore();
    }

    return {
      enter() { enterT = 0; },
      swap() { loadCover(); },
      resize() { cv.resize(); layout(); },
      frame(dt, now, v) {
        enterT += dt;
        const { ctx, w, h } = cv;
        if (Math.abs(w - W) > 2 || Math.abs(h - H) > 2) layout();
        const hot = R.reduced ? 0 : v.hot, playing = v.playing;
        const tx = (R.tilt.x || 0) + Math.sin(now * 0.23) * 0.15, ty = (R.tilt.y || 0) + Math.cos(now * 0.19) * 0.1;
        // a bar has gone by: one more piece stands up (every eighth bar the page turns)
        const bar = Math.floor((v.beatT || 0) / 4);
        if (playing && bar !== barSeen) { if (barSeen >= 0 && bar > barSeen && bar - barSeen < 3) onBar(bar); barSeen = bar; }
        // springs: pieces standing up, bobbing on the beat; the castle in the chorus
        for (const pg of [page, oldPage]) if (pg) for (const p of pg.pieces) {
          const tgt = enterT < 0.4 ? 0 : p.target;
          p.v += ((tgt - p.up) * 140 - p.v * 11) * Math.min(0.05, dt); p.up += p.v * Math.min(0.05, dt);
          p.bob *= Math.exp(-dt * 7);
          if (p.kind === 'windmill') p.rot = (p.rot || 0) + dt * (0.4 + (playing ? v.level * 2.5 : 0));
        }
        if (castle) { const tgt = hot > 0.5 && playing ? 1 : 0; castle.v += ((tgt - castle.up) * 60 - castle.v * 7) * Math.min(0.05, dt); castle.up += castle.v * Math.min(0.05, dt); }
        // birds cross now and then, flapping on the beat
        birdT -= dt; if (birdT < 0) { birdT = 9 + Math.random() * 10; flock(); }
        // draw: the new page, the old one turning away over it
        ctx.clearRect(0, 0, w, h);
        drawLayerSet(ctx, page, tx, ty, v, now, hot);
        if (oldPage && turnT < 1) {
          turnT = Math.min(1, turnT + dt / 1.1);
          const e = turnT < 0.5 ? 2 * turnT * turnT : 1 - Math.pow(-2 * turnT + 2, 2) / 2, fold = w * (1 - e), flap = Math.min(fold, w - fold) * 0.45;
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, fold, h); ctx.clip(); drawLayerSet(ctx, oldPage, tx, ty, v, now, hot); ctx.restore();
          // the back of the turning page, curling over, and its shadow on the new page
          let g = ctx.createLinearGradient(fold, 0, fold + 40 * S, 0); g.addColorStop(0, 'rgba(40,20,40,.35)'); g.addColorStop(1, 'rgba(40,20,40,0)'); ctx.fillStyle = g; ctx.fillRect(fold, 0, 40 * S, h);
          g = ctx.createLinearGradient(fold - flap, 0, fold, 0); g.addColorStop(0, '#efe3cc'); g.addColorStop(0.7, '#fbf4e6'); g.addColorStop(1, '#d9c9ab');
          ctx.fillStyle = g; ctx.fillRect(fold - flap, 0, flap, h);
          if (turnT >= 1) oldPage = null;
        } else oldPage = null;
        // birds
        for (let i = birds.length - 1; i >= 0; i--) {
          const b = birds[i]; b.x += b.dir * b.sp * dt; b.flap *= Math.exp(-dt * 5); if (b.x < -80 || b.x > w + 80) { birds.splice(i, 1); continue; }
          const wing = (Math.sin(now * 6 + b.ph) * 0.3 + b.flap) * 9 * S, bx = b.x + tx * 30 * S, by = b.y + Math.sin(now * 1.5 + b.ph) * 4 * S;
          ctx.save(); ctx.shadowColor = 'rgba(40,20,40,.3)'; ctx.shadowBlur = 4 * S * dpr(); ctx.shadowOffsetY = 4 * S * dpr(); ctx.fillStyle = page.th.bird;
          ctx.beginPath(); ctx.moveTo(bx - 11 * S, by - wing); ctx.lineTo(bx, by + 2 * S); ctx.lineTo(bx + 11 * S, by - wing); ctx.lineTo(bx, by - 2 * S); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        // the night page: the windows glow, stronger in the chorus
        if (page.th.stars && hot > 0.05) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = hot * 0.25; ctx.drawImage(api.glow('#ffd98a', 64), -w * 0.2, B.ground - B.h * 0.6, w * 1.4, B.h * 0.8); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        if (enterT < 1.2) { ctx.fillStyle = `rgba(244,234,216,${(1 - enterT / 1.2).toFixed(3)})`; ctx.fillRect(0, 0, w, h); }
        if (pgEl.dataset.n !== String(pageNo)) { pgEl.dataset.n = String(pageNo); pgEl.textContent = `第 ${pageNo + 1} 頁`; tmEl.textContent = page.th.name; }
      },
    };
  },
});
