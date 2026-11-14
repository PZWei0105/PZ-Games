/* ==========================================================================
   01 數學：常用函式、亂數、雜訊、緩動、空間格網、碰撞
   ========================================================================== */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
const remap = (v, a0, a1, b0, b1, clampIt) => { let t = invLerp(a0, a1, v); if (clampIt) t = clamp01(t); return b0 + (b1 - b0) * t; };
const smoothstep = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
/** 與幀率無關的平滑追趕：每秒剩下 e^(-k) 的距離。k 越大越快（相機跟隨常用 6～12） */
const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
const approach = (a, b, step) => (a < b ? Math.min(a + step, b) : Math.max(a - step, b));
const wrapAngle = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const angleDiff = (a, b) => wrapAngle(b - a);
const lerpAngle = (a, b, t) => a + angleDiff(a, b) * t;
const dampAngle = (a, b, k, dt) => a + angleDiff(a, b) * (1 - Math.exp(-k * dt));
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const dist2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };
const angleTo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const fract = (v) => v - Math.floor(v);

PZ.math = { TAU, clamp, clamp01, lerp, invLerp, remap, smoothstep, damp, approach, wrapAngle, angleDiff, lerpAngle, dampAngle, dist, dist2, angleTo, sign, fract };
Object.assign(PZ, { clamp, lerp, damp, approach, TAU });

/* ---------- 亂數：mulberry32（快、可重現）---------- */
function makeRng(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  const r = {
    get seed() { return s; },
    reseed(v) { s = (v >>> 0) || 0x9e3779b9; return r; },
    next() { s = (s + 0x6D2B79F5) | 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
    /** [a, b) 的小數；只給一個參數就是 [0, a) */
    range(a, b) { if (b === undefined) { b = a; a = 0; } return a + (b - a) * r.next(); },
    /** [a, b] 的整數 */
    int(a, b) { if (b === undefined) { b = a; a = 0; } return a + Math.floor(r.next() * (b - a + 1)); },
    chance(p) { return r.next() < p; },
    pick(arr) { return arr[Math.floor(r.next() * arr.length)]; },
    /** 照權重挑：items 是陣列、weight(item) 回傳權重 */
    weighted(items, weight) { let tot = 0; for (const it of items) tot += Math.max(0, weight(it)); let x = r.next() * tot; for (const it of items) { x -= Math.max(0, weight(it)); if (x < 0) return it; } return items[items.length - 1]; },
    sign() { return r.next() < 0.5 ? -1 : 1; },
    angle() { return r.next() * TAU; },
    /** 常態分布（平均 0、標準差 1） */
    gauss() { let u = 0, v = 0; while (u === 0) u = r.next(); v = r.next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); },
    /** 在 [-v, v] 之間 */
    spread(v) { return (r.next() * 2 - 1) * v; },
    shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; },
  };
  return r;
}
PZ.rng = makeRng;
const Rand = PZ.rand = makeRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
/** 給測試用：讓全域亂數可重現 */
PZ.seed = (v) => Rand.reseed(v);

/* ---------- 雜訊（震屏、地形、紋理）---------- */
const _perm = new Uint8Array(512);
const _grad = new Float32Array(256);
function noiseSeed(seed) {
  const r = makeRng(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  r.shuffle(p);
  for (let i = 0; i < 512; i++) _perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) _grad[i] = r.next() * 2 - 1;
}
noiseSeed(1337);
const _fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
/** 一維梯度雜訊，回傳約 -1～1，平滑連續（震屏用） */
function noise1(x) {
  const i = Math.floor(x), f = x - i, a = _grad[_perm[i & 255]] * f, b = _grad[_perm[(i + 1) & 255]] * (f - 1);
  return lerp(a, b, _fade(f)) * 2;
}
/** 二維 Perlin 雜訊，約 -1～1 */
function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const X = xi & 255, Y = yi & 255;
  const g = (h, dx, dy) => { switch (h & 7) { case 0: return dx + dy; case 1: return -dx + dy; case 2: return dx - dy; case 3: return -dx - dy; case 4: return dx; case 5: return -dx; case 6: return dy; default: return -dy; } };
  const aa = _perm[_perm[X] + Y], ab = _perm[_perm[X] + Y + 1], ba = _perm[_perm[X + 1] + Y], bb = _perm[_perm[X + 1] + Y + 1];
  const u = _fade(xf), v = _fade(yf);
  const x1 = lerp(g(aa, xf, yf), g(ba, xf - 1, yf), u), x2 = lerp(g(ab, xf, yf - 1), g(bb, xf - 1, yf - 1), u);
  return lerp(x1, x2, v) * 0.7071 * 1.414;
}
/** 疊幾層的雜訊（fbm） */
function fbm2(x, y, oct = 4, lac = 2, gain = 0.5) { let s = 0, a = 1, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * noise2(x * f, y * f); n += a; a *= gain; f *= lac; } return s / n; }
PZ.noise = { seed: noiseSeed, n1: noise1, n2: noise2, fbm: fbm2 };

/* ---------- 緩動 ---------- */
const Ease = PZ.ease = (() => {
  const c1 = 1.70158, c2 = c1 * 1.525, c3 = c1 + 1, c4 = TAU / 3, c5 = TAU / 4.5;
  const outBounce = (t) => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; };
  return {
    linear: (t) => t,
    inQuad: (t) => t * t, outQuad: (t) => 1 - (1 - t) * (1 - t), inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inCubic: (t) => t * t * t, outCubic: (t) => 1 - Math.pow(1 - t, 3), inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inQuart: (t) => t * t * t * t, outQuart: (t) => 1 - Math.pow(1 - t, 4), inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    inQuint: (t) => t * t * t * t * t, outQuint: (t) => 1 - Math.pow(1 - t, 5),
    inSine: (t) => 1 - Math.cos((t * Math.PI) / 2), outSine: (t) => Math.sin((t * Math.PI) / 2), inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    inExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)), outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOutExpo: (t) => (t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
    inCirc: (t) => 1 - Math.sqrt(1 - t * t), outCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
    inBack: (t) => c3 * t * t * t - c1 * t * t, outBack: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
    inOutBack: (t) => (t < 0.5 ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2),
    inElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4)),
    outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1),
    inOutElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2 : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1),
    outBounce, inBounce: (t) => 1 - outBounce(1 - t),
    /** 先衝過頭再回來的小彈跳（UI 彈出、數字跳出） */
    pop: (t) => { const s = 2.4; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
    /** 0→1→0（閃一下） */
    blip: (t) => Math.sin(t * Math.PI),
  };
})();
const easeOf = (e) => (typeof e === 'function' ? e : Ease[e] || Ease.outQuad);
PZ.easeOf = easeOf;

/* ---------- 排序：幾乎排好的陣列用插入排序（Y 軸前後遮擋每幀排一次很划算）---------- */
PZ.sortBy = function sortBy(arr, key) {
  for (let i = 1; i < arr.length; i++) {
    const it = arr[i], k = key(it);
    let j = i - 1;
    while (j >= 0 && key(arr[j]) > k) { arr[j + 1] = arr[j]; j--; }
    arr[j + 1] = it;
  }
  return arr;
};

/* ---------- 空間格網：大量敵人、子彈的鄰近查詢 ---------- */
class Grid {
  constructor(cell = 64) { this.cell = cell; this.inv = 1 / cell; this.map = new Map(); this.pool = []; this.count = 0; }
  _key(cx, cy) { return (cx + 32768) * 65536 + (cy + 32768); }
  clear() { for (const arr of this.map.values()) { arr.length = 0; this.pool.push(arr); } this.map.clear(); this.count = 0; }
  /** 物件需要有 x、y；r 是半徑（會放進所有碰到的格子） */
  insert(o, r = 0) {
    const inv = this.inv, x0 = Math.floor((o.x - r) * inv), x1 = Math.floor((o.x + r) * inv), y0 = Math.floor((o.y - r) * inv), y1 = Math.floor((o.y + r) * inv);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const k = this._key(cx, cy); let arr = this.map.get(k);
      if (!arr) { arr = this.pool.pop() || []; this.map.set(k, arr); }
      arr.push(o);
    }
    this.count++;
  }
  /** 找出圓形範圍內的物件（距離用物件中心＋自己的 r 判斷）；回傳 out 陣列（不重複） */
  query(x, y, r, out = [], filter) {
    out.length = 0;
    const inv = this.inv, x0 = Math.floor((x - r) * inv), x1 = Math.floor((x + r) * inv), y0 = Math.floor((y - r) * inv), y1 = Math.floor((y + r) * inv);
    const stamp = (this._stamp = (this._stamp || 0) + 1);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const arr = this.map.get(this._key(cx, cy)); if (!arr) continue;
      for (let i = 0; i < arr.length; i++) {
        const o = arr[i]; if (o._gq === stamp) continue; o._gq = stamp;
        const rr = r + (o.r || 0), dx = o.x - x, dy = o.y - y;
        if (dx * dx + dy * dy <= rr * rr && (!filter || filter(o))) out.push(o);
      }
    }
    return out;
  }
  /** 最近的一個（maxR 內），可加條件 */
  nearest(x, y, maxR, filter) {
    let best = null, bd = maxR * maxR;
    const tmp = this.query(x, y, maxR, this._tmp || (this._tmp = []), filter);
    for (const o of tmp) { const d = dist2(x, y, o.x, o.y); if (d < bd) { bd = d; best = o; } }
    return best;
  }
}
PZ.Grid = Grid;

/* ---------- 碰撞小工具 ---------- */
PZ.hit = {
  circle(ax, ay, ar, bx, by, br) { const dx = bx - ax, dy = by - ay, r = ar + br; return dx * dx + dy * dy <= r * r; },
  rect(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; },
  point(px, py, x, y, w, h) { return px >= x && px <= x + w && py >= y && py <= y + h; },
  circleRect(cx, cy, r, x, y, w, h) { const nx = clamp(cx, x, x + w), ny = clamp(cy, y, y + h), dx = cx - nx, dy = cy - ny; return dx * dx + dy * dy <= r * r; },
  /** 線段 (x1,y1)-(x2,y2) 與圓：回傳最近的碰撞比例 t（0～1），沒有碰到回傳 -1 */
  segCircle(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1, dy = y2 - y1, fx = x1 - cx, fy = y1 - cy;
    const a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - r * r;
    if (c <= 0) return 0;
    let disc = b * b - 4 * a * c; if (disc < 0 || a === 0) return -1;
    disc = Math.sqrt(disc);
    const t = (-b - disc) / (2 * a);
    return t >= 0 && t <= 1 ? t : -1;
  },
  /** 把圓推出矩形，回傳 {x,y} 修正量（沒重疊就是 null） */
  pushCircleRect(cx, cy, r, x, y, w, h) {
    const nx = clamp(cx, x, x + w), ny = clamp(cy, y, y + h); let dx = cx - nx, dy = cy - ny; const d2 = dx * dx + dy * dy;
    if (d2 > r * r) return null;
    if (d2 === 0) { // 圓心在矩形裡：從最近的邊推出去
      const l = cx - x, rr = x + w - cx, t = cy - y, b = y + h - cy, m = Math.min(l, rr, t, b);
      if (m === l) return { x: -(l + r), y: 0 }; if (m === rr) return { x: rr + r, y: 0 }; if (m === t) return { x: 0, y: -(t + r) }; return { x: 0, y: b + r };
    }
    const d = Math.sqrt(d2), k = (r - d) / d; return { x: dx * k, y: dy * k };
  },
};

/* ---------- 物件池 ---------- */
PZ.pool = function pool(make, reset) {
  const free = [];
  return {
    get(...a) { const o = free.length ? free.pop() : make(); if (reset) reset(o, ...a); return o; },
    put(o) { free.push(o); },
    get size() { return free.length; },
  };
};
