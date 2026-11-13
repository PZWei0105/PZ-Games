/* 全知 OMNISCIENT — 卡片裡的小圖（Canvas 2D，霓虹發光）。只有資料變了才重畫。 */
const NEON = {
  cyan: '#00e5ff', mag: '#ff3df0', yel: '#ffd23d', vio: '#8f6dff', ora: '#ff8a3d', sky: '#4db8ff', pink: '#ff5c9a', teal: '#2ef2d0',
  up: '#ff4d6d', dn: '#19e39b', flat: '#c8d2e6', ink3: '#64739a', grid: 'rgba(120,160,255,.10)',
};
const NEON_LIST = [NEON.cyan, NEON.mag, NEON.yel, NEON.vio, NEON.ora, NEON.sky, NEON.pink, NEON.teal];

const CH = {
  prep(cv) {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, r.width, r.height);
    c.lineJoin = 'round'; c.lineCap = 'round';
    return { c, w: r.width, h: r.height };
  },
  grid(c, w, h, nx = 6, ny = 3) {
    c.save();
    c.strokeStyle = NEON.grid; c.lineWidth = 1;
    c.setLineDash([2, 4]);
    for (let i = 1; i < ny; i++) { const y = Math.round(h * i / ny) + 0.5; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    for (let i = 1; i < nx; i++) { const x = Math.round(w * i / nx) + 0.5; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    c.restore();
  },
  /** 霓虹線：先畫一層粗而淡的光暈，再畫細而亮的線芯 */
  neonPath(c, pts, col, width = 1.6, glow = 10) {
    if (pts.length < 2) return;
    const path = () => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); };
    c.save();
    c.shadowColor = col; c.shadowBlur = glow;
    c.strokeStyle = hexA(col, 0.35); c.lineWidth = width * 3; path(); c.stroke();
    c.shadowBlur = glow * 0.6;
    c.strokeStyle = col; c.lineWidth = width; path(); c.stroke();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = Math.max(0.6, width * 0.35); path(); c.stroke();
    c.restore();
  },
  area(c, pts, col, h, a0 = 0.32) {
    if (pts.length < 2) return;
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, hexA(col, a0)); g.addColorStop(1, hexA(col, 0));
    c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.lineTo(pts[pts.length - 1][0], h); c.lineTo(pts[0][0], h); c.closePath();
    c.fillStyle = g; c.fill();
  },
  dot(c, x, y, col, r = 3) {
    c.save();
    c.shadowColor = col; c.shadowBlur = 14;
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
    c.fillStyle = hexA(col, 0.35); c.beginPath(); c.arc(x, y, r * 2.6, 0, 6.283); c.fill();
    c.restore();
  },
  dashLine(c, y, w, col = 'rgba(255,255,255,.3)') {
    c.save(); c.strokeStyle = col; c.setLineDash([3, 3]); c.lineWidth = 1; c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(w, y + 0.5); c.stroke(); c.restore();
  },

  /** K 線（最近 n 根）＋月線 */
  candles(cv, k, n = 30) {
    const { c, w, h } = this.prep(cv);
    if (!k || !k.d || k.d.length < 2) return;
    const L = k.d.length, i0 = Math.max(0, L - n);
    const C = k.c_ || k.c;
    const rows = [];
    for (let i = i0; i < L; i++) if (isNum(k.o[i]) && isNum(C[i])) rows.push({ o: k.o[i], h: k.h[i], l: k.l[i], c: C[i], i });
    if (!rows.length) return;
    const ma = rows.map((r) => { const a = Math.max(0, r.i - 19); let s = 0, m = 0; for (let j = a; j <= r.i; j++) if (isNum(C[j])) { s += C[j]; m++; } return m ? s / m : null; });
    const lo = Math.min(...rows.map((r) => r.l), ...ma.filter(isNum)), hi = Math.max(...rows.map((r) => r.h), ...ma.filter(isNum));
    const pad = 6, Y = (v) => pad + (hi - v) / (hi - lo || 1) * (h - pad * 2);
    this.grid(c, w, h, 6, 4);
    const bw = w / rows.length;
    rows.forEach((r, j) => {
      const x = j * bw + bw / 2;
      const up = r.c >= r.o;
      const col = up ? NEON.up : NEON.dn;
      c.save();
      c.shadowColor = col; c.shadowBlur = 8;
      c.strokeStyle = col; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, Y(r.h)); c.lineTo(x, Y(r.l)); c.stroke();
      const y0 = Y(Math.max(r.o, r.c)), y1 = Y(Math.min(r.o, r.c));
      c.fillStyle = up ? hexA(col, 0.9) : hexA(col, 0.85);
      c.fillRect(x - bw * 0.32, y0, bw * 0.64, Math.max(1, y1 - y0));
      c.restore();
    });
    const mpts = ma.map((v, j) => (isNum(v) ? [j * bw + bw / 2, Y(v)] : null)).filter(Boolean);
    this.neonPath(c, mpts, NEON.yel, 1.2, 6);
  },

  /** 走勢（點：[[x, y], …]；x 範圍 0..xmax） */
  wave(cv, pts, { xmax, ref, col, head = true, all = null, fill = true } = {}) {
    const { c, w, h } = this.prep(cv);
    const base = all || pts;
    if (!base.length) return;
    const ys = base.map((p) => p[1]).concat(isNum(ref) ? [ref] : []);
    const lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
    const pad = 5;
    const X = (x) => (x / xmax) * w, Y = (v) => pad + (hi - v) / span * (h - pad * 2);
    this.grid(c, w, h, 4, 3);
    if (isNum(ref)) this.dashLine(c, Y(ref), w);
    const P = pts.map((p) => [X(p[0]), Y(p[1])]);
    const last = pts[pts.length - 1];
    const cc = col || (last && isNum(ref) ? (last[1] > ref ? NEON.up : last[1] < ref ? NEON.dn : NEON.flat) : NEON.cyan);
    if (fill) this.area(c, P, cc, h);
    this.neonPath(c, P, cc, 1.5, 9);
    if (head && P.length) this.dot(c, P[P.length - 1][0], P[P.length - 1][1], cc, 2.4);
    return cc;
  },
  /** 等距的一串值（例如近 60 日收盤） */
  series(cv, vals, { col = NEON.cyan, ref = null, fill = true } = {}) {
    const v = (vals || []).filter(isNum);
    if (v.length < 2) { this.prep(cv); return; }
    return this.wave(cv, v.map((y, i) => [i, y]), { xmax: v.length - 1, ref, col, fill });
  },
  /** 正負長條（例如外資＋投信每天的買賣超） */
  bars(cv, vals, { pos = NEON.up, neg = NEON.dn } = {}) {
    const { c, w, h } = this.prep(cv);
    const v = vals.map((x) => (isNum(x) ? x : 0));
    if (!v.length) return;
    const mx = Math.max(...v.map(Math.abs), 1e-9);
    const mid = h / 2, bw = w / v.length;
    this.grid(c, w, h, 5, 2);
    v.forEach((x, i) => {
      const hh = Math.abs(x) / mx * (h / 2 - 3);
      const col = x >= 0 ? pos : neg;
      c.save(); c.shadowColor = col; c.shadowBlur = 8; c.fillStyle = hexA(col, 0.85);
      c.fillRect(i * bw + bw * 0.18, x >= 0 ? mid - hh : mid, bw * 0.64, Math.max(1, hh));
      c.restore();
    });
  },
  /** 盤中：價格線＋成交量長條 */
  tape(cv, snaps, { xmax = SESSION_MIN, ref, upto = Infinity } = {}) {
    const { c, w, h } = this.prep(cv);
    if (!snaps.length) return;
    const vis = snaps.filter((s) => s.m <= upto);
    const ph = h * 0.68, vh = h - ph - 4;
    const ys = snaps.map((s) => s.p).concat(isNum(ref) ? [ref] : []);
    const lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
    const X = (m) => (m / xmax) * w, Y = (v) => 4 + (hi - v) / span * (ph - 8);
    this.grid(c, w, ph, 9, 3);
    [60, 120, 180, 240].forEach((m) => { c.fillStyle = NEON.ink3; c.font = '10px "JetBrains Mono", monospace'; c.fillText(['10:00', '11:00', '12:00', '13:00'][[60, 120, 180, 240].indexOf(m)], X(m) + 3, ph - 3); });
    if (isNum(ref)) this.dashLine(c, Y(ref), w);
    const mv = Math.max(...snaps.map((s) => s.dv || 0), 1);
    vis.forEach((s, i) => {
      const x0 = i ? X(vis[i - 1].m) : X(0), x1 = X(s.m);
      const col = isNum(ref) && s.p >= ref ? NEON.up : NEON.dn;
      const bh = (s.dv || 0) / mv * vh;
      c.fillStyle = hexA(col, 0.55); c.fillRect(x0 + 0.5, h - bh, Math.max(1, x1 - x0 - 1), bh);
    });
    const P = vis.map((s) => [X(s.m), Y(s.p)]);
    const last = vis[vis.length - 1];
    const col = last && isNum(ref) ? (last.p >= ref ? NEON.up : NEON.dn) : NEON.cyan;
    this.area(c, P, col, ph, 0.25);
    this.neonPath(c, P, col, 1.8, 10);
    if (P.length) this.dot(c, P[P.length - 1][0], P[P.length - 1][1], col, 3);
  },
};

/** 頂列的小波浪（SVG，給 stat 用） */
function squiggle(vals, col) {
  const v = (vals || []).filter(isNum);
  if (v.length < 2) return '<svg class="sq" viewBox="0 0 100 16" preserveAspectRatio="none"></svg>';
  const lo = Math.min(...v), hi = Math.max(...v), sp = hi - lo || 1;
  const d = v.map((y, i) => `${i ? 'L' : 'M'}${(i / (v.length - 1) * 100).toFixed(2)} ${(14 - (y - lo) / sp * 12).toFixed(2)}`).join('');
  return `<svg class="sq" viewBox="0 0 100 16" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${col}" stroke-width="1.3" vector-effect="non-scaling-stroke" style="filter:drop-shadow(0 0 2px ${col}) drop-shadow(0 0 5px ${col})"/></svg>`;
}

function hexA(hex, a) {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function hexRGB(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** 滾動數字：數字一位一位地轉到新的值 */
function odo(el, text) {
  if (!el) return;
  text = String(text);
  el.classList.add('odo');
  if (el.dataset.v === text && el.querySelector('.d, .s')) return;
  const prev = el.dataset.v;
  el.dataset.v = text;
  const sameShape = prev && prev.length === text.length && Array.from(text).every((ch, i) => /\d/.test(ch) === /\d/.test(prev[i]));
  if (!sameShape || !el.querySelector('.d, .s') || reducedMotion()) {
    el.innerHTML = Array.from(text).map((ch) => (/\d/.test(ch) ? `<span class="d"><span style="transform:translateY(-${ch}em)">${'0123456789'.split('').map((d) => `<i>${d}</i>`).join('')}</span></span>` : `<span class="s">${esc(ch)}</span>`)).join('');
    return;
  }
  const cells = el.children;
  Array.from(text).forEach((ch, i) => {
    const cell = cells[i];
    if (!cell) return;
    if (/\d/.test(ch) && cell.classList.contains('d')) cell.firstElementChild.style.transform = `translateY(-${ch}em)`;
    else if (!cell.classList.contains('d')) cell.textContent = ch;
  });
}
