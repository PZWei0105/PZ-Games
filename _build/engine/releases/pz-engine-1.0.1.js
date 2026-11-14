/*! PZ Engine v1.0.1 (2026-11-14.5e258b65) — 痞子葳 × Claude 的 2D 遊戲引擎。
    說明書：PZ-Games repo 的 _build/engine/HANDBOOK.md */
(function (global) {
'use strict';
/* ---- 00_head.js ---- */
/* ==========================================================================
   00 開頭：命名空間、環境偵測、小工具
   整個引擎包在一個 IIFE 裡，只對外公開 window.PZ。
   模組之間共用這個閉包裡的變數（例如 Screen、Input、R），不必互相 import。
   ========================================================================== */
const PZ = { version: '1.0.1', build: '2026-11-14.5e258b65' };
const HAS_DOM = typeof document !== 'undefined' && typeof window !== 'undefined';
const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
const noop = () => { };

/** 裝置與環境（只在有 DOM 的時候才有意義；Node 測試時都是 false） */
const Env = PZ.env = (() => {
  const e = { ios: false, android: false, mobile: false, touch: false, safari: false, standalone: false, inFrame: false, claude: false, webkit: false, desktop: true };
  if (!HAS_DOM) return e;
  const ua = navigator.userAgent || '';
  const mt = navigator.maxTouchPoints || 0;
  e.ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && mt > 1); // iPadOS 會假裝成 Mac
  e.android = /Android/.test(ua);
  e.touch = mt > 0 || 'ontouchstart' in window;
  e.mobile = e.ios || e.android || (e.touch && Math.min(screen.width, screen.height) < 820);
  e.desktop = !e.mobile;
  e.webkit = /AppleWebKit/.test(ua) && !/Chrome|CriOS|Edg|OPR|Android/.test(ua);
  e.safari = e.webkit;
  try { e.standalone = !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)); } catch (er) { /* 舊瀏覽器 */ }
  try { e.inFrame = window.top !== window; } catch (er) { e.inFrame = true; }
  e.claude = !!(window.claude && typeof window.claude.use === 'function');
  e.lowMemory = !!(navigator.deviceMemory && navigator.deviceMemory <= 3);
  return e;
})();

/** 安全地執行使用者（遊戲）的回呼：出錯時交給除錯面板，不讓整個迴圈停掉 */
function safeCall(fn, self, a, b, c) {
  try { return fn.call(self, a, b, c); } catch (err) { reportError(err, 'callback'); return undefined; }
}
let reportError = (err) => { if (typeof console !== 'undefined') console.error(err); }; // 22_debug 會換掉

/** 只警告一次 */
const _warned = new Set();
function warnOnce(key, msg) { if (_warned.has(key)) return; _warned.add(key); if (typeof console !== 'undefined') console.warn('[PZ] ' + msg); }

/** 簡單的 DOM 小工具（UI 模組會大量用到） */
function el(tag, cls, html) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (html != null) d.innerHTML = html;
  return d;
}
PZ.el = el;

/** 安全的 localStorage（被擋住或滿了就退回記憶體） */
const Store = PZ.store = (() => {
  const mem = new Map();
  let ok = null;
  const test = () => {
    if (ok !== null) return ok;
    try { const k = '__pz_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); ok = true; } catch (e) { ok = false; }
    return ok;
  };
  return {
    get available() { return test(); },
    get(k) { if (test()) { try { const v = localStorage.getItem(k); if (v !== null) return v; } catch (e) { /* 讀不到就看記憶體 */ } } return mem.has(k) ? mem.get(k) : null; },
    set(k, v) {
      v = String(v);
      mem.set(k, v);
      if (!test()) return false;
      try { localStorage.setItem(k, v); return true; } catch (e) { return false; } // 空間滿了：記憶體裡仍有一份
    },
    remove(k) { mem.delete(k); if (test()) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } } },
    getJSON(k, d) { const s = this.get(k); if (s == null) return d; try { return JSON.parse(s); } catch (e) { return d; } },
    setJSON(k, v) { return this.set(k, JSON.stringify(v)); },
    keys(prefix) {
      const out = new Set();
      if (test()) { try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(prefix)) out.add(k); } } catch (e) { /* ignore */ } }
      for (const k of mem.keys()) if (k.startsWith(prefix)) out.add(k);
      return [...out];
    },
    _reset() { ok = null; mem.clear(); }, // 測試用
  };
})();

/* ---- 01_math.js ---- */
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

/* ---- 02_color.js ---- */
/* ==========================================================================
   02 顏色
   畫圖時顏色可以寫 CSS 字串（'#ff8800'、'rgba(…)'、'hsl(…)'），
   或用 PZ.rgb()/PZ.hsl()/PZ.color() 先轉好的「打包數字」（熱迴圈裡比較快）。
   打包格式是 0xAABBGGRR（直接寫進 WebGL 頂點，小端序）。
   注意：直接寫 0xff8800 這種數字會被當成打包值（會變成透明），請用字串。
   ========================================================================== */
const WHITE = 0xffffffff;
const _colorCache = new Map();
const pack = (r, g, b, a) => (((clamp(Math.round(a * 255), 0, 255) << 24) | (clamp(Math.round(b), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(r), 0, 255)) >>> 0);
const cR = (c) => c & 255, cG = (c) => (c >>> 8) & 255, cB = (c) => (c >>> 16) & 255, cA = (c) => ((c >>> 24) & 255) / 255;

const NAMED = { white: '#fff', black: '#000', red: '#f33', green: '#3d5', blue: '#38f', yellow: '#fd3', orange: '#f93', cyan: '#3ef', magenta: '#f3e', gray: '#888', grey: '#888', transparent: 'rgba(0,0,0,0)', gold: '#ffd24a', purple: '#a5f', pink: '#f8b' };

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

function parseColor(s) {
  s = String(s).trim().toLowerCase();
  if (NAMED[s]) s = NAMED[s];
  if (s[0] === '#') {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    if (h.length === 6) return pack((n >> 16) & 255, (n >> 8) & 255, n & 255, 1);
    if (h.length === 8) return pack((n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, (n & 255) / 255);
  }
  let m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return pack(p[0], p[1], p[2], p.length > 3 ? p[3] : 1); }
  m = s.match(/^hsla?\(([^)]+)\)$/);
  if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); const [r, g, b] = hslToRgb(p[0], p[1] / 100, p[2] / 100); return pack(r, g, b, p.length > 3 ? p[3] : 1); }
  warnOnce('color:' + s, '看不懂的顏色：' + s);
  return WHITE;
}

/** 任何顏色寫法 → 打包數字 */
function toColor(c) {
  if (typeof c === 'number') return c >>> 0;
  if (c == null) return WHITE;
  if (typeof c === 'string') { let v = _colorCache.get(c); if (v === undefined) { v = parseColor(c); if (_colorCache.size > 4096) _colorCache.clear(); _colorCache.set(c, v); } return v; }
  if (Array.isArray(c)) return pack(c[0], c[1], c[2], c.length > 3 ? c[3] : 1);
  return WHITE;
}

const Color = PZ.color = function color(c) { return toColor(c); };
Object.assign(Color, {
  WHITE, BLACK: 0xff000000, CLEAR: 0,
  rgb: (r, g, b, a = 1) => pack(r, g, b, a),
  hsl: (h, s, l, a = 1) => { const [r, g, b] = hslToRgb(h, s, l); return pack(r, g, b, a); },
  r: (c) => cR(toColor(c)), g: (c) => cG(toColor(c)), b: (c) => cB(toColor(c)), a: (c) => cA(toColor(c)),
  /** 換透明度（a 是 0～1） */
  alpha: (c, a) => { c = toColor(c); return pack(cR(c), cG(c), cB(c), a); },
  /** 兩色混合 */
  mix: (a, b, t) => { a = toColor(a); b = toColor(b); return pack(lerp(cR(a), cR(b), t), lerp(cG(a), cG(b), t), lerp(cB(a), cB(b), t), lerp(cA(a), cA(b), t)); },
  lighten: (c, t) => Color.mix(c, Color.alpha(WHITE, cA(toColor(c))), t),
  darken: (c, t) => Color.mix(c, pack(0, 0, 0, cA(toColor(c))), t),
  /** 打包數字 → CSS 字串（給 DOM、Canvas2D 用） */
  css: (c) => { c = toColor(c); const a = cA(c); return a >= 1 ? '#' + ((1 << 24) | (cR(c) << 16) | (cG(c) << 8) | cB(c)).toString(16).slice(1) : `rgba(${cR(c)},${cG(c)},${cB(c)},${+a.toFixed(3)})`; },
  /** 漸層取樣表：粒子顏色隨生命週期變化用；回傳 n 格的 Uint32Array */
  ramp: (stops, n = 32) => {
    const cs = stops.map(toColor), out = new Uint32Array(n);
    if (cs.length === 1) { out.fill(cs[0]); return out; }
    for (let i = 0; i < n; i++) { const t = (i / (n - 1)) * (cs.length - 1), k = Math.min(cs.length - 2, Math.floor(t)); out[i] = Color.mix(cs[k], cs[k + 1], t - k); }
    return out;
  },
  /** 亮度 0～1（感知亮度） */
  luma: (c) => { c = toColor(c); return (0.2126 * cR(c) + 0.7152 * cG(c) + 0.0722 * cB(c)) / 255; },
});
PZ.rgb = Color.rgb;
PZ.hsl = Color.hsl;

/* ---- 03_events.js ---- */
/* ==========================================================================
   03 事件
   PZ.on('pause', fn) / PZ.off / PZ.once / PZ.emit
   引擎會發出的事件見說明書「事件」一節（resize、pause、resume、hidden、visible、
   device、quality、contextlost、contextrestored、scene、save…）。
   ========================================================================== */
function makeEmitter(target) {
  const map = new Map();
  target.on = (name, fn) => { let a = map.get(name); if (!a) map.set(name, (a = [])); a.push(fn); return () => target.off(name, fn); };
  target.off = (name, fn) => { const a = map.get(name); if (!a) return; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); };
  target.once = (name, fn) => { const off = target.on(name, (...x) => { off(); fn(...x); }); return off; };
  target.emit = (name, a, b, c) => { const arr = map.get(name); if (!arr || !arr.length) return; for (const fn of arr.slice()) safeCall(fn, target, a, b, c); };
  return target;
}
makeEmitter(PZ);
PZ.emitter = () => makeEmitter({});

/* ---- 04_time.js ---- */
/* ==========================================================================
   04 時間與主迴圈
   - 預設「可變步長」：每畫一格就更新一次，dt 是這格經過的秒數（長的格子會切成
     不超過 1/60 秒的小段），在 60／120／240Hz 螢幕上都順。要可重現的物理就設
     config.step = 1/60（固定步長），畫面用 PZ.time.alpha 插值。
   - 打擊停頓 PZ.freeze(ms)、慢動作 PZ.slowmo(倍率, 秒數)、暫停 PZ.pause()。
   - 計時器 PZ.after / PZ.every / await PZ.wait(秒)，跟著遊戲時間走（暫停、停頓時不動）；
     要跟著真實時間走就加 { real: true }。
   - 自動畫質：連續卡頓就降一階（解析度、泛光、粒子量），夠順再升回去。
   ========================================================================== */
const Time = PZ.time = {
  t: 0, real: 0, dt: 0, rdt: 1 / 60, frame: 0,
  scale: 1, paused: false, alpha: 1,
  step: 0, maxStep: 1 / 60, maxSub: 6,
  fps: 60, refresh: 60,
  _freeze: 0, _slow: null, _pauseWhy: new Set(),
};

/** 目前實際套用的時間倍率（含慢動作與停頓） */
Time.effScale = () => {
  if (Time._freeze > 0) return 0;
  let s = Time.scale;
  const sm = Time._slow;
  if (sm) s *= sm.cur;
  return s;
};

/** 打擊停頓：世界停住 ms 毫秒（多次呼叫取最長的那個，不會累加） */
PZ.freeze = (ms) => { Time._freeze = Math.max(Time._freeze, ms / 1000); };
/** 慢動作：倍率 scale（例如 0.25）維持 sec 秒，最後 back 秒平滑回到 1 */
PZ.slowmo = (scale, sec = 0.6, back = 0.25) => { Time._slow = { to: scale, cur: Math.min(scale, Time._slow ? Time._slow.cur : 1), hold: sec, back, t: 0 }; };

/** 暫停：可以帶原因（'menu'、'hidden'、'rotate'…），全部原因解除才會恢復 */
PZ.pause = (why = 'game') => {
  const was = Time.paused; Time._pauseWhy.add(why); Time.paused = true;
  if (!was) PZ.emit('pause', why);
};
PZ.resume = (why = 'game') => {
  Time._pauseWhy.delete(why);
  if (why === '*') Time._pauseWhy.clear();
  if (Time.paused && Time._pauseWhy.size === 0) { Time.paused = false; Loop.last = 0; PZ.emit('resume', why); }
};
PZ.isPaused = (why) => (why ? Time._pauseWhy.has(why) : Time.paused);

/* ---------- 計時器 ---------- */
const Timers = { list: [], real: [] };
function addTimer(sec, fn, every, real) {
  const t = { at: (real ? Time.real : Time.t) + Math.max(0, sec), fn, every: every ? Math.max(0.001, sec) : 0, real: !!real, dead: false, cancel() { this.dead = true; } };
  (real ? Timers.real : Timers.list).push(t);
  return t;
}
function runTimers(list, now) {
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (t.dead) { list.splice(i--, 1); continue; }
    if (now >= t.at) {
      safeCall(t.fn, null);
      if (t.every && !t.dead) { t.at += t.every; if (t.at < now) t.at = now + t.every; } else { t.dead = true; list.splice(i--, 1); }
    }
  }
}
PZ.after = (sec, fn, o) => addTimer(sec, fn, false, o && o.real);
PZ.every = (sec, fn, o) => addTimer(sec, fn, true, o && o.real);
PZ.wait = (sec, o) => new Promise((res) => addTimer(sec, res, false, o && o.real));
PZ.waitReal = (sec) => PZ.wait(sec, { real: true });
PZ.nextFrame = () => new Promise((res) => Loop.once.push(res));
/** 換場景時清掉遊戲時間的計時器（不影響 real 的） */
PZ.clearTimers = () => { for (const t of Timers.list) t.dead = true; Timers.list.length = 0; };

/* ---------- 系統登記：各模組把每格要做的事掛上來，依 order 排序 ---------- */
const Systems = [];
/** sys = { name, order, frame(rdt) 每畫面一次（真實時間）, update(dt) 每次遊戲更新, render(g) } */
function addSystem(sys) { Systems.push(sys); Systems.sort((a, b) => (a.order || 0) - (b.order || 0)); return sys; }
PZ.addSystem = addSystem;

/* ---------- 效能監測與自動畫質 ---------- */
const Quality = PZ.quality = {
  tier: 3, start: 3, auto: true, ups: 0,
  // 每一階：解析度倍率、泛光、後製、粒子量
  tiers: [
    { name: '流暢', res: 0.6, bloom: 0, post: false, particles: 0.45 },
    { name: '平衡', res: 0.75, bloom: 0, post: true, particles: 0.65 },
    { name: '精細', res: 0.88, bloom: 1, post: true, particles: 0.85 },
    { name: '極致', res: 1.0, bloom: 2, post: true, particles: 1.0 },
  ],
  get cur() { return Quality.tiers[Quality.tier]; },
  set(t, why) {
    t = clamp(t | 0, 0, Quality.tiers.length - 1);
    if (t === Quality.tier) return;
    Quality.tier = t; Perf.reset();
    PZ.emit('quality', t, why);
  },
};
const Perf = PZ.perf = {
  ema: 1 / 60, slowT: 0, fastT: 0, work: 0, workEma: 0, upd: 0, ren: 0, hold: 1.5,
  samples: [],
  reset() { this.slowT = 0; this.fastT = 0; this.hold = 1.5; },
  frame(rdt) {
    // 剛開始、剛恢復時前幾秒不算（載入、編譯著色器都會卡）
    if (this.hold > 0) { this.hold -= rdt; return; }
    this.ema = this.ema * 0.92 + rdt * 0.08;
    // 估算螢幕更新率
    if (this.samples.length < 120) { this.samples.push(rdt); if (this.samples.length === 120) { const s = this.samples.slice().sort((a, b) => a - b); const m = s[60]; Time.refresh = m > 0 ? Math.round(1 / m) : 60; } }
    if (!Quality.auto || Time.paused) return;
    if (this.ema > 1 / 48) { this.slowT += rdt; this.fastT = 0; } else { this.slowT = Math.max(0, this.slowT - rdt * 0.5); }
    if (this.ema < 1 / 57) this.fastT += rdt; else this.fastT = 0;
    if (this.slowT > 2.5 && Quality.tier > 0) { Quality.set(Quality.tier - 1, 'slow'); }
    else if (this.fastT > 18 && Quality.tier < Quality.start && Quality.ups < 2) { Quality.ups++; Quality.set(Quality.tier + 1, 'fast'); }
  },
};

/* ---------- 主迴圈 ---------- */
const Loop = PZ.loop = { running: false, last: 0, raf: 0, acc: 0, once: [], fpsCap: 0, _skip: 0, onUpdate: null, onRender: null };

function stepUpdate(dt, first) {
  Time.dt = dt; Time.t += dt;
  runTimers(Timers.list, Time.t);
  for (const s of Systems) if (s.update) { try { s.update(dt, first); } catch (e) { reportError(e, s.name + '.update'); } }
}

function tick(rdt) {
  const t0 = nowMs();
  Time.rdt = rdt; Time.real += rdt; Time.frame++;
  if (rdt > 0) Time.fps = Time.fps * 0.9 + (1 / rdt) * 0.1;
  Perf.frame(rdt);
  // 慢動作與停頓用真實時間倒數
  if (Time._freeze > 0) Time._freeze = Math.max(0, Time._freeze - rdt);
  const sm = Time._slow;
  if (sm) {
    sm.t += rdt;
    if (sm.t < 0.06) sm.cur = lerp(sm.cur, sm.to, clamp01(sm.t / 0.06));
    else if (sm.t < sm.hold) sm.cur = sm.to;
    else if (sm.t < sm.hold + sm.back) sm.cur = lerp(sm.to, 1, Ease.inOutQuad((sm.t - sm.hold) / sm.back));
    else Time._slow = null;
  }
  runTimers(Timers.real, Time.real);
  for (const s of Systems) if (s.frame) { try { s.frame(rdt); } catch (e) { reportError(e, s.name + '.frame'); } }
  const t1 = nowMs();
  if (!Time.paused) {
    const gdt = rdt * Time.effScale();
    if (Time.step > 0) {
      Loop.acc += gdt; let n = 0;
      while (Loop.acc >= Time.step && n < Time.maxSub) { stepUpdate(Time.step, n === 0); Loop.acc -= Time.step; n++; }
      if (n >= Time.maxSub) Loop.acc = 0;
      Time.alpha = Loop.acc / Time.step;
    } else if (gdt > 0) {
      const n = Math.min(Time.maxSub, Math.ceil(gdt / Time.maxStep - 1e-6));
      const sub = gdt / n;
      for (let i = 0; i < n; i++) stepUpdate(sub, i === 0);
      Time.alpha = 1;
    } else {
      Time.dt = 0;
    }
  }
  const t2 = nowMs();
  for (const s of Systems) if (s.render) { try { s.render(); } catch (e) { reportError(e, s.name + '.render'); } }
  const t3 = nowMs();
  Perf.upd = Perf.upd * 0.9 + (t2 - t1) * 0.1; Perf.ren = Perf.ren * 0.9 + (t3 - t2) * 0.1; Perf.work = Perf.work * 0.9 + (t3 - t0) * 0.1;
  if (Loop.once.length) { const a = Loop.once; Loop.once = []; for (const f of a) f(); }
}

function frame(ts) {
  if (!Loop.running) return;
  Loop.raf = requestAnimationFrame(frame);
  const t = ts / 1000;
  let rdt = Loop.last ? t - Loop.last : 1 / 60;
  // 鎖幀（省電）：太早到的格子先跳過
  if (Loop.fpsCap > 0 && Loop.last && rdt < 1 / Loop.fpsCap - 0.002) return;
  Loop.last = t;
  if (rdt < 0) rdt = 0;
  if (rdt > 0.1) rdt = 0.1; // 切回來、卡很久：最多算 0.1 秒，不讓世界一次跳太遠
  tick(rdt);
}

Loop.start = () => {
  if (Loop.running) return;
  Loop.running = true; Loop.last = 0;
  if (HAS_DOM && typeof requestAnimationFrame === 'function') Loop.raf = requestAnimationFrame(frame);
};
Loop.stop = () => { Loop.running = false; if (HAS_DOM) cancelAnimationFrame(Loop.raf); };
/** 測試用：不經過 requestAnimationFrame，直接跑 n 格（每格 dt 秒） */
Loop.step = (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) tick(dt); };
Loop.tick = tick;

/* 頁面被收起來／切回來 */
if (HAS_DOM) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { PZ.emit('hidden'); }
    else { Loop.last = 0; Perf.reset(); PZ.emit('visible'); }
  });
  window.addEventListener('pagehide', () => PZ.emit('hidden', 'pagehide'));
  window.addEventListener('pageshow', (e) => { if (e.persisted) { Loop.last = 0; PZ.emit('visible', 'pageshow'); } });
}

/* ---- 05_screen.js ---- */
/* ==========================================================================
   05 螢幕
   建立 #pz-root（整個遊戲）、#pz-canvas（畫布）、#pz-ui（介面層，放 DOM 介面），
   處理大小、裝置像素比（DPR）、iPhone 瀏海安全區、直橫、全螢幕、螢幕常亮。
   畫布解析度 = min(DPR, 2) × 畫質倍率，並限制總像素（手機 320 萬、電腦 840 萬），
   避免 iPhone 的畫布記憶體上限與發燙。
   ========================================================================== */
const Screen = PZ.screen = {
  w: 0, h: 0, dpr: 1, res: 1, pw: 0, ph: 0,
  portrait: true, landscape: false, short: 0, long: 0,
  safe: { t: 0, r: 0, b: 0, l: 0 },
  root: null, canvas: null, ui: null, touch: null,
  resCap: 2, pixelCap: Env.mobile ? 3.2e6 : 8.4e6, resScale: 1,
  orientation: 'any', bg: '#000',
  _probe: null, _dirty: true, _rotating: false,
};

/** 取得或建立 DOM 結構 */
Screen.init = (cfg = {}) => {
  if (!HAS_DOM) return;
  Screen.orientation = cfg.orientation || 'any';
  if (cfg.background) Screen.bg = cfg.background;
  let root = document.getElementById('pz-root');
  if (!root) { root = el('div'); root.id = 'pz-root'; document.body.appendChild(root); }
  Screen.root = root;
  let cv = document.getElementById('pz-canvas');
  if (!cv) { cv = document.createElement('canvas'); cv.id = 'pz-canvas'; root.insertBefore(cv, root.firstChild); }
  Screen.canvas = cv;
  let touch = document.getElementById('pz-touch');
  if (!touch) { touch = el('div'); touch.id = 'pz-touch'; root.appendChild(touch); }
  Screen.touch = touch;
  let ui = document.getElementById('pz-ui');
  if (!ui) { ui = el('div'); ui.id = 'pz-ui'; root.appendChild(ui); }
  else root.appendChild(ui); // 確保介面層在觸控層上面
  Screen.ui = ui;
  root.style.background = Screen.bg;
  document.documentElement.style.background = Screen.bg;
  // 安全區探針
  const p = el('div'); p.id = 'pz-safe-probe';
  p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(p); Screen._probe = p;
  const mark = () => { Screen._dirty = true; };
  window.addEventListener('resize', mark);
  window.addEventListener('orientationchange', () => { mark(); setTimeout(mark, 250); setTimeout(mark, 700); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', mark);
  if (typeof ResizeObserver === 'function') new ResizeObserver(mark).observe(root);
  PZ.on('quality', () => { Screen._dirty = true; });
  // DPR 變了（視窗拖到另一個螢幕）
  const watchDpr = () => {
    if (!window.matchMedia) return;
    const mq = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    const on = () => { mark(); watchDpr(); };
    if (mq.addEventListener) mq.addEventListener('change', on, { once: true });
  };
  watchDpr();
  Screen.measure(true);
};

/** 量大小；有變動才發 resize */
Screen.measure = (force) => {
  if (!HAS_DOM || !Screen.root) return false;
  if (!Screen._dirty && !force) return false;
  Screen._dirty = false;
  const r = Screen.root.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cs = getComputedStyle(Screen._probe);
  const safe = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  let res = Math.min(dpr, Screen.resCap) * Quality.cur.res * Screen.resScale;
  res = Math.max(0.5, res);
  if (w * h * res * res > Screen.pixelCap) res = Math.sqrt(Screen.pixelCap / (w * h));
  const pw = Math.max(1, Math.round(w * res)), ph = Math.max(1, Math.round(h * res));
  const changed = w !== Screen.w || h !== Screen.h || pw !== Screen.pw || ph !== Screen.ph || dpr !== Screen.dpr;
  Object.assign(Screen, { w, h, dpr, res: pw / w, pw, ph, safe, portrait: h >= w, landscape: w > h, short: Math.min(w, h), long: Math.max(w, h) });
  if (Screen.canvas && (Screen.canvas.width !== pw || Screen.canvas.height !== ph)) { Screen.canvas.width = pw; Screen.canvas.height = ph; }
  const st = Screen.root.style;
  st.setProperty('--pz-safe-t', safe.t + 'px'); st.setProperty('--pz-safe-r', safe.r + 'px'); st.setProperty('--pz-safe-b', safe.b + 'px'); st.setProperty('--pz-safe-l', safe.l + 'px');
  Screen.root.classList.toggle('pz-portrait', Screen.portrait);
  Screen.root.classList.toggle('pz-landscape', Screen.landscape);
  Screen.root.classList.toggle('pz-mobile', Env.mobile);
  Screen.checkRotate();
  if (changed) PZ.emit('resize', w, h);
  return changed;
};

/* 收藏庫的 PZ 圓鈕選單打開時：引擎暫停（原因 'hub'）、放開所有輸入，並發出 PZ.on('hub', open)。
   遊戲想在這時候叫出自己的暫停選單，就聽 'hub'。 */
if (HAS_DOM) window.addEventListener('pzhub', (e) => {
  const open = !!(e && e.detail && e.detail.open);
  if (open) { PZ.pause('hub'); if (PZ.input && PZ.input.releaseAll) PZ.input.releaseAll(); } else PZ.resume('hub');
  PZ.emit('hub', open);
});
/** 收藏庫的 PZ 圓鈕位置（遊戲在 PZ 遊戲收藏裡開時才有）；HUD 不要放在這裡 */
Screen.hub = () => {
  if (!HAS_DOM || !document.querySelector('script[data-game][src*="hub.js"]') || Env.inFrame) return null;
  const p = Store.getJSON('pzgc.v1.handle', null), W = Screen.w, H = Screen.h;
  let x = p ? clamp(p.x * W, 6, W - 50) : W - 52;
  const y = p ? clamp(p.y * H, 50, H - 104) : H * 0.42;
  x = x + 22 < W / 2 ? 6 : W - 50;
  return { x, y, w: 44, h: 44, side: x < W / 2 ? 'left' : 'right' };
};

/* ---------- 直橫限制：手機拿錯方向時蓋一層提示並暫停 ---------- */
Screen.checkRotate = () => {
  if (!Env.mobile || Screen.orientation === 'any') return;
  const wrong = (Screen.orientation === 'portrait' && Screen.landscape) || (Screen.orientation === 'landscape' && Screen.portrait);
  if (wrong === Screen._rotating) return;
  Screen._rotating = wrong;
  let ov = document.getElementById('pz-rotate');
  if (wrong) {
    if (!ov) {
      ov = el('div', 'pz-rotate', `<div class="pz-rotate-icon"></div><div>${Screen.orientation === 'portrait' ? '請把手機轉成直的' : '請把手機轉成橫的'}</div>`);
      ov.id = 'pz-rotate'; Screen.root.appendChild(ov);
    }
    ov.classList.add('on'); PZ.pause('rotate');
  } else {
    if (ov) ov.classList.remove('on');
    PZ.resume('rotate');
  }
};

/* ---------- 全螢幕（iPhone 不支援，會回傳 false）---------- */
Screen.canFullscreen = () => HAS_DOM && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
Screen.isFullscreen = () => HAS_DOM && !!(document.fullscreenElement || document.webkitFullscreenElement);
Screen.fullscreen = async (on = !Screen.isFullscreen()) => {
  if (!Screen.canFullscreen()) return false;
  try {
    if (on) {
      const d = document.documentElement;
      await (d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : d.webkitRequestFullscreen());
      if (Screen.orientation !== 'any' && screen.orientation && screen.orientation.lock) { try { await screen.orientation.lock(Screen.orientation); } catch (e) { /* 不支援 */ } }
    } else await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen());
    return true;
  } catch (e) { return false; }
};

/* ---------- 螢幕常亮（玩的時候不要自己暗掉）---------- */
const Wake = { want: false, lock: null };
Screen.keepAwake = async (on = true) => {
  Wake.want = on;
  if (!HAS_DOM || !('wakeLock' in navigator)) return false;
  try {
    if (on && !Wake.lock) { Wake.lock = await navigator.wakeLock.request('screen'); Wake.lock.addEventListener('release', () => { Wake.lock = null; }); }
    else if (!on && Wake.lock) { await Wake.lock.release(); Wake.lock = null; }
    return true;
  } catch (e) { return false; }
};
PZ.on('visible', () => { if (Wake.want) Screen.keepAwake(true); });

addSystem({ name: 'screen', order: -100, frame() { Screen.measure(); } });

/* ---- 06_input.js ---- */
/* ==========================================================================
   06 輸入：鍵盤、滑鼠／觸控、手把、手勢、虛擬搖桿與按鈕
   遊戲裡只要問「動作」：
     PZ.input.bind({ fire: ['Space', 'KeyJ', 'PadA', 'PadRT'], dash: ['ShiftLeft', 'PadB'] });
     if (PZ.input.pressed('fire')) …    // 這一格剛按下
     if (PZ.input.down('fire')) …       // 按住中
     const m = PZ.input.move;           // 移動向量 {x, y, mag}：WASD／方向鍵／左類比／虛擬搖桿合併
   手機：PZ.input.stick({ target: 'move' }) 浮動搖桿；PZ.input.button({ action: 'fire', label: '開火' }) 按鈕。
   手勢：PZ.input.gesture（雙指縮放旋轉、拖曳、滾輪）＋ PZ.input.tap（點一下）。
   視窗失焦、切到背景時會自動放開所有按鍵，不會「卡住一直走」。
   ========================================================================== */
const PAD_BTN = ['PadA', 'PadB', 'PadX', 'PadY', 'PadLB', 'PadRB', 'PadLT', 'PadRT', 'PadBack', 'PadStart', 'PadLS', 'PadRS', 'PadUp', 'PadDown', 'PadLeft', 'PadRight', 'PadHome'];
const DEFAULT_BINDS = {
  up: ['KeyW', 'ArrowUp', 'PadUp'], down: ['KeyS', 'ArrowDown', 'PadDown'], left: ['KeyA', 'ArrowLeft', 'PadLeft'], right: ['KeyD', 'ArrowRight', 'PadRight'],
  confirm: ['Enter', 'Space', 'PadA'], cancel: ['Escape', 'Backspace', 'PadB'], pause: ['Escape', 'KeyP', 'PadStart'],
};
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);

class Action {
  constructor(name) { this.name = name; this.binds = []; this.down = false; this.pressed = false; this.released = false; this._lp = false; this._lr = false; this._prev = false; this.time = 0; }
}

const Input = PZ.input = {
  enabled: true, device: Env.mobile ? 'touch' : 'mouse',
  keys: new Set(), mouse: new Set(), padDown: new Set(), virtDown: new Map(),
  actions: new Map(),
  move: { x: 0, y: 0, mag: 0 }, aim: { x: 0, y: 0, mag: 0, active: false },
  pointers: new Map(),
  pointer: { id: -1, x: 0, y: 0, down: false, pressed: false, released: false, type: 'mouse', sx: 0, sy: 0, t0: 0, moved: false, get wx() { return PZ.cam ? PZ.cam.toWorldX(this.x, this.y) : this.x; }, get wy() { return PZ.cam ? PZ.cam.toWorldY(this.x, this.y) : this.y; } },
  gesture: { active: false, panX: 0, panY: 0, zoom: 1, rotate: 0, cx: 0, cy: 0, fingers: 0 },
  wheel: 0, tap: null, doubleTap: null, longPress: null,
  pad: null, padId: -1, deadzone: 0.2,
  virt: { move: { x: 0, y: 0, on: false }, aim: { x: 0, y: 0, on: false } },
  _updated: false, _edgeAge: 0, _lastTap: null, _handlers: new Map(),
};

/** 綁定動作：bind('fire', 'Space', 'PadA') 或 bind({ fire: [...], jump: [...] }) */
Input.bind = (name, ...codes) => {
  if (typeof name === 'object') { for (const k in name) Input.bind(k, ...[].concat(name[k])); return; }
  let a = Input.actions.get(name); if (!a) { a = new Action(name); Input.actions.set(name, a); }
  a.binds = codes.flat();
  return a;
};
Input.unbind = (name) => Input.actions.delete(name);
for (const k in DEFAULT_BINDS) Input.bind(k, DEFAULT_BINDS[k]);
const _act = (n) => Input.actions.get(n);
Input.down = (n) => { const a = _act(n); return !!(a && a.down); };
Input.pressed = (n) => { const a = _act(n); return !!(a && a.pressed); };
Input.released = (n) => { const a = _act(n); return !!(a && a.released); };
/** 按住多久了（秒） */
Input.held = (n) => { const a = _act(n); return a && a.down ? Time.real - a.time : 0; };
/** 立即回呼（暫停中也會觸發，適合「暫停」「開選單」）：onPress('pause', fn) */
Input.onPress = (n, fn) => { let arr = Input._handlers.get(n); if (!arr) Input._handlers.set(n, (arr = [])); arr.push(fn); return () => { const i = arr.indexOf(fn); if (i >= 0) arr.splice(i, 1); }; };
function firePress(code) {
  for (const a of Input.actions.values()) if (a.binds.includes(code)) { a._lp = true; const hs = Input._handlers.get(a.name); if (hs) for (const f of hs.slice()) safeCall(f, null, a.name); }
}
function fireRelease(code) { for (const a of Input.actions.values()) if (a.binds.includes(code)) a._lr = true; }
function setDevice(d) { if (Input.device !== d) { Input.device = d; if (Screen.root) Screen.root.dataset.input = d; PZ.emit('device', d); } }

/** 放開所有輸入（失焦、切背景、開選單時） */
Input.releaseAll = () => {
  for (const c of Input.keys) fireRelease(c);
  Input.keys.clear(); Input.mouse.clear(); Input.padDown.clear(); Input.virtDown.clear();
  for (const p of Input.pointers.values()) p.dead = true;
  Input.pointers.clear();
  Input.pointer.down = false;
  Input.virt.move.x = Input.virt.move.y = 0; Input.virt.move.on = false;
  Input.virt.aim.x = Input.virt.aim.y = 0; Input.virt.aim.on = false;
  for (const s of Sticks) s.reset();
  for (const b of TButtons) b._up();
  Input.gesture.active = false; Input.gesture.fingers = 0;
};

/* ---------- 鍵盤 ---------- */
const typing = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
function onKeyDown(e) {
  if (!Input.enabled || typing(e.target)) return;
  setDevice('keyboard');
  if (GAME_KEYS.has(e.code) && !e.ctrlKey && !e.metaKey) e.preventDefault();
  if (e.repeat) return;
  Input.keys.add(e.code); firePress(e.code);
}
function onKeyUp(e) { if (Input.keys.delete(e.code)) fireRelease(e.code); }

/* ---------- 指標（滑鼠、觸控、筆）---------- */
const UI_SEL = 'button,a,input,select,textarea,label,[data-ui],.pz-block,.pz-tbtn,.pz-stick-zone';
function isUiTarget(t) { return t && t.closest && t !== Screen.canvas && !!t.closest(UI_SEL); }
function ptrInfo(e) { return { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, px: e.clientX, py: e.clientY, t0: Time.real, type: e.pointerType || 'mouse', button: e.button, moved: false, long: false }; }
function onPointerDown(e) {
  if (!Input.enabled) return;
  const wasTouch = Input.device === 'touch';
  setDevice(e.pointerType === 'touch' ? 'touch' : 'mouse');
  if (isUiTarget(e.target)) return;
  // 剛從鍵盤／滑鼠／手把換回手指：觸控層原本是藏著的，這一下落在畫布上——交給底下那支搖桿，不要吃掉
  if (e.pointerType === 'touch' && !wasTouch && Screen.touch && !Screen.touch.classList.contains('pz-ui-open')) {
    for (const st of Sticks) if (st.contains(e.clientX, e.clientY) && st.begin(e)) return;
  }
  const p = ptrInfo(e);
  Input.pointers.set(e.pointerId, p);
  try { Screen.root.setPointerCapture(e.pointerId); } catch (er) { /* 合成事件 */ }
  if (e.pointerType === 'mouse') { const code = 'Mouse' + e.button; Input.mouse.add(code); firePress(code); }
  const P = Input.pointer;
  if (!P.down || e.isPrimary) { Object.assign(P, { id: e.pointerId, x: p.x, y: p.y, sx: p.x, sy: p.y, t0: p.t0, type: p.type, down: true, pressed: true, moved: false }); }
  gestureStart();
}
function onPointerMove(e) {
  if (e.pointerType === 'mouse' && !Input.pointers.size) { Input.pointer.x = e.clientX; Input.pointer.y = e.clientY; return; }
  const p = Input.pointers.get(e.pointerId); if (!p) return;
  p.px = p.x; p.py = p.y; p.x = e.clientX; p.y = e.clientY;
  if (!p.moved && Math.hypot(p.x - p.sx, p.y - p.sy) > (p.type === 'touch' ? 10 : 5)) p.moved = true;
  if (e.pointerId === Input.pointer.id) { Input.pointer.x = p.x; Input.pointer.y = p.y; Input.pointer.moved = p.moved; }
  gestureMove();
}
function onPointerUp(e) {
  if (e.pointerType === 'mouse') { const code = 'Mouse' + e.button; if (Input.mouse.delete(code)) fireRelease(code); }
  const p = Input.pointers.get(e.pointerId); if (!p) return;
  Input.pointers.delete(e.pointerId);
  const dur = Time.real - p.t0;
  if (e.type === 'pointerup' && !p.moved && dur < 0.35 && !p.long && Input.gesture.fingers <= 1) {
    const tap = { x: p.x, y: p.y, type: p.type, get wx() { return PZ.cam ? PZ.cam.toWorldX(this.x, this.y) : this.x; }, get wy() { return PZ.cam ? PZ.cam.toWorldY(this.x, this.y) : this.y; } };
    Input.tap = tap;
    const lt = Input._lastTap;
    if (lt && Time.real - lt.t < 0.3 && Math.hypot(lt.x - p.x, lt.y - p.y) < 30) { Input.doubleTap = tap; Input._lastTap = null; } else Input._lastTap = { x: p.x, y: p.y, t: Time.real };
    PZ.emit('tap', tap);
  }
  if (e.pointerId === Input.pointer.id) {
    Input.pointer.down = false; Input.pointer.released = true; Input.pointer.x = p.x; Input.pointer.y = p.y;
    // 換另一根手指當主要指標
    for (const q of Input.pointers.values()) { Object.assign(Input.pointer, { id: q.id, x: q.x, y: q.y, down: true }); break; }
  }
  gestureStart();
}
function onWheel(e) {
  if (!Input.enabled || isUiTarget(e.target)) return;
  e.preventDefault();
  let d = e.deltaY; if (e.deltaMode === 1) d *= 32; else if (e.deltaMode === 2) d *= 400;
  Input.wheel += d;
  Input.gesture.zoom *= Math.exp(-d * (e.ctrlKey ? 0.01 : 0.0015)); // 觸控板雙指縮放會帶 ctrlKey
  Input.gesture.cx = e.clientX; Input.gesture.cy = e.clientY;
}

/* ---------- 手勢：雙指縮放／旋轉／平移 ---------- */
const G0 = { d: 0, a: 0, cx: 0, cy: 0 };
function twoFingers() { const arr = [...Input.pointers.values()]; return arr.length >= 2 ? [arr[0], arr[1]] : null; }
function gestureStart() {
  const g = Input.gesture; g.fingers = Input.pointers.size;
  const tf = twoFingers();
  if (tf) { const [a, b] = tf; G0.d = Math.hypot(b.x - a.x, b.y - a.y) || 1; G0.a = Math.atan2(b.y - a.y, b.x - a.x); G0.cx = (a.x + b.x) / 2; G0.cy = (a.y + b.y) / 2; g.active = true; }
  else if (Input.pointers.size === 1) { const p = Input.pointers.values().next().value; G0.cx = p.x; G0.cy = p.y; g.active = false; }
  else g.active = false;
}
function gestureMove() {
  const g = Input.gesture, tf = twoFingers();
  if (tf) {
    const [a, b] = tf, d = Math.hypot(b.x - a.x, b.y - a.y) || 1, ang = Math.atan2(b.y - a.y, b.x - a.x), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    g.zoom *= d / G0.d; g.rotate += wrapAngle(ang - G0.a); g.panX += cx - G0.cx; g.panY += cy - G0.cy; g.cx = cx; g.cy = cy;
    G0.d = d; G0.a = ang; G0.cx = cx; G0.cy = cy; g.active = true;
  } else if (Input.pointers.size === 1) {
    const p = Input.pointers.values().next().value;
    if (p.moved) { g.panX += p.x - G0.cx; g.panY += p.y - G0.cy; }
    G0.cx = p.x; G0.cy = p.y; g.cx = p.x; g.cy = p.y;
  }
}

/* ---------- 手把 ---------- */
function pollPads() {
  if (!HAS_DOM || !navigator.getGamepads) return;
  let pads; try { pads = navigator.getGamepads(); } catch (e) { return; }
  let best = null;
  for (const gp of pads) { if (!gp || !gp.connected) continue; if (!best || gp.timestamp > best.timestamp) best = gp; }
  Input.pad = best;
  const was = new Set(Input.padDown);
  Input.padDown.clear();
  if (!best) { for (const c of was) fireRelease(c); return; }
  const std = best.mapping === 'standard' || best.buttons.length >= 16;
  let any = false;
  if (std) {
    for (let i = 0; i < PAD_BTN.length && i < best.buttons.length; i++) {
      const b = best.buttons[i], on = b.pressed || b.value > (i === 6 || i === 7 ? 0.35 : 0.5);
      if (on) { Input.padDown.add(PAD_BTN[i]); any = true; if (!was.has(PAD_BTN[i])) firePress(PAD_BTN[i]); }
    }
  }
  for (const c of was) if (!Input.padDown.has(c)) fireRelease(c);
  const dz = (x, y) => { const m = Math.hypot(x, y); if (m < Input.deadzone) return [0, 0, 0]; const k = Math.min(1, (m - Input.deadzone) / (1 - Input.deadzone)) / m; return [x * k, y * k, Math.min(1, m)]; };
  const ax = best.axes || [];
  const L = dz(ax[0] || 0, ax[1] || 0), R = dz(ax[2] || 0, ax[3] || 0);
  Input._padL = L; Input._padR = R;
  if (any || L[2] > 0 || R[2] > 0) setDevice('gamepad');
}
/** 手把震動（Chrome、Edge 支援；不支援就安靜跳過） */
Input.rumble = (strong = 0.6, weak = 0.4, ms = 120) => {
  const p = Input.pad; if (!p || !p.vibrationActuator || !Settings.get('haptics')) return;
  try { p.vibrationActuator.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: clamp01(strong), weakMagnitude: clamp01(weak) }); } catch (e) { /* ignore */ }
};

/* ---------- 每格計算動作與搖桿 ---------- */
function codeDown(c) {
  if (c.startsWith('Pad')) return Input.padDown.has(c);
  if (c.startsWith('Mouse')) return Input.mouse.has(c);
  return Input.keys.has(c);
}
function computeActions() {
  for (const a of Input.actions.values()) {
    let d = Input.virtDown.get(a.name) > 0;
    if (!d) for (const c of a.binds) if (codeDown(c)) { d = true; break; }
    if (d && !a._prev) { a._lp = true; a.time = Time.real; }
    if (!d && a._prev) a._lr = true;
    a.down = d; a._prev = d;
    a.pressed = a._lp; a.released = a._lr;
  }
}
function computeAxes() {
  const kx = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0), ky = (Input.down('down') ? 1 : 0) - (Input.down('up') ? 1 : 0);
  const cands = [];
  if (kx || ky) { const m = Math.hypot(kx, ky); cands.push([kx / m, ky / m, 1]); }
  if (Input._padL && Input._padL[2] > 0) cands.push(Input._padL);
  const vm = Input.virt.move; if (vm.on) { const m = Math.min(1, Math.hypot(vm.x, vm.y)); cands.push([vm.x, vm.y, m]); }
  let best = null; for (const c of cands) if (!best || c[2] > best[2]) best = c;
  const M = Input.move; if (best) { M.x = best[0]; M.y = best[1]; M.mag = best[2]; } else { M.x = M.y = M.mag = 0; }
  const A = Input.aim, va = Input.virt.aim;
  if (va.on) { A.x = va.x; A.y = va.y; A.mag = Math.min(1, Math.hypot(va.x, va.y)); A.active = A.mag > 0.15; }
  else if (Input._padR && Input._padR[2] > 0) { A.x = Input._padR[0]; A.y = Input._padR[1]; A.mag = Input._padR[2]; A.active = A.mag > 0.3; }
  else { A.x = A.y = A.mag = 0; A.active = false; }
}
function checkLongPress() {
  for (const p of Input.pointers.values()) if (!p.long && !p.moved && Time.real - p.t0 > 0.5 && Input.pointers.size === 1) {
    p.long = true; const lp = { x: p.x, y: p.y, get wx() { return PZ.cam ? PZ.cam.toWorldX(this.x, this.y) : this.x; }, get wy() { return PZ.cam ? PZ.cam.toWorldY(this.x, this.y) : this.y; } };
    Input.longPress = lp; PZ.emit('longpress', lp);
  }
}
function consumeEdges() {
  for (const a of Input.actions.values()) { a._lp = a._lr = false; a.pressed = a.released = false; }
  Input.pointer.pressed = Input.pointer.released = false;
  Input._edgeAge = 0;
}
addSystem({
  name: 'input', order: -90,
  frame(rdt) { pollPads(); computeActions(); computeAxes(); checkLongPress(); Input._updated = false; Input._edgeAge += rdt; },
  update(dt, first) { /* 動作的「剛按下」只在這格第一次更新看得到 */ },
});
addSystem({ name: 'input-consume', order: 1000, update(dt, first) { if (first) { Input._updated = true; } } });
addSystem({
  name: 'input-end', order: 1000,
  render() {
    // 更新過、或暫停中、或停頓太久（超過 0.2 秒就不再緩衝）→ 清掉這格的「剛按下」
    if (Input._updated || Time.paused || Input._edgeAge > 0.2) consumeEdges();
    Input.tap = Input.doubleTap = Input.longPress = null;
    const g = Input.gesture; g.panX = g.panY = 0; g.zoom = 1; g.rotate = 0; Input.wheel = 0;
  },
});

/* ---------- 虛擬搖桿（DOM，畫在 #pz-touch）---------- */
const Sticks = [];
/**
 * PZ.input.stick({ target: 'move'|'aim', zone: {l,t,r,b}（0～1，畫面比例）, radius: 56, fixed: false, x, y, cls, keep })
 * 在場景裡建的搖桿，離開那個場景時自動拿掉；在 load 裡建、或 keep: true 的會一直留著。
 * 浮動式：手指在區域裡按下的地方出現搖桿；固定式（fixed:true）：永遠在 x,y（距左／下的 px）。
 */
Input.stick = (o = {}) => {
  const s = { target: o.target || 'move', zone: Object.assign({ l: 0, t: 0.3, r: 0.55, b: 1 }, o.zone || {}), radius: o.radius || 56, fixed: !!o.fixed, x: o.x || 96, y: o.y || 120, id: null, ox: 0, oy: 0, visible: true };
  const zoneEl = el('div', 'pz-stick-zone'), base = el('div', 'pz-stick' + (s.fixed ? ' fixed' : '')), knob = el('div', 'pz-stick-knob');
  base.appendChild(knob); zoneEl.appendChild(base);
  if (o.cls) base.classList.add(o.cls);
  s.el = zoneEl; s.base = base; s.knob = knob;
  const V = () => Input.virt[s.target];
  const layout = () => {
    const z = s.zone; Object.assign(zoneEl.style, { left: z.l * 100 + '%', top: z.t * 100 + '%', width: (z.r - z.l) * 100 + '%', height: (z.b - z.t) * 100 + '%' });
    base.style.width = base.style.height = s.radius * 2 + 'px';
    if (s.fixed) { base.style.left = s.x + 'px'; base.style.bottom = s.y + 'px'; base.style.top = 'auto'; }
  };
  const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px,${dy}px)`; };
  s.reset = () => { s.id = null; const v = V(); v.x = v.y = 0; v.on = false; base.classList.remove('on'); setKnob(0, 0); };
  /** 開始拖：一般由區域自己的 pointerdown 呼叫；剛從鍵盤／滑鼠換回觸控的第一下由 onPointerDown 轉過來 */
  s.begin = (e) => {
    if (!Input.enabled || s.id !== null) return false;
    e.preventDefault(); setDevice('touch');
    s.id = e.pointerId; try { zoneEl.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    const r = zoneEl.getBoundingClientRect();
    if (s.fixed) { const br = base.getBoundingClientRect(); s.ox = br.left + br.width / 2; s.oy = br.top + br.height / 2; }
    else { s.ox = e.clientX; s.oy = e.clientY; base.style.left = (e.clientX - r.left) + 'px'; base.style.top = (e.clientY - r.top) + 'px'; }
    base.classList.add('on'); move(e);
    return true;
  };
  zoneEl.addEventListener('pointerdown', s.begin);
  s.contains = (x, y) => { if (!s.visible || zoneEl.style.display === 'none') return false; const r = zoneEl.getBoundingClientRect(); return r.width > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
  const move = (e) => {
    if (e.pointerId !== s.id) return;
    let dx = e.clientX - s.ox, dy = e.clientY - s.oy; const m = Math.hypot(dx, dy), R = s.radius;
    // 浮動式：拉超過半徑時底座跟著手指走（不會「拉不動」）
    if (!s.fixed && m > R * 1.35) { const k = (m - R * 1.35) / m; s.ox += dx * k; s.oy += dy * k; const r = zoneEl.getBoundingClientRect(); base.style.left = (s.ox - r.left) + 'px'; base.style.top = (s.oy - r.top) + 'px'; dx = e.clientX - s.ox; dy = e.clientY - s.oy; }
    const mm = Math.hypot(dx, dy), k = mm > R ? R / mm : 1;
    setKnob(dx * k, dy * k);
    const v = V(), dzr = 0.12, nm = Math.min(1, mm / R);
    if (nm < dzr) { v.x = v.y = 0; } else { const sc = (nm - dzr) / (1 - dzr) / (mm || 1); v.x = dx * sc; v.y = dy * sc; }
    v.on = true;
  };
  zoneEl.addEventListener('pointermove', move);
  const up = (e) => { if (e.pointerId === s.id) s.reset(); };
  zoneEl.addEventListener('pointerup', up); zoneEl.addEventListener('pointercancel', up); zoneEl.addEventListener('lostpointercapture', up);
  s.show = (on) => { s.visible = on; zoneEl.style.display = on ? '' : 'none'; if (!on) s.reset(); };
  s.remove = () => { s.reset(); zoneEl.remove(); const i = Sticks.indexOf(s); if (i >= 0) Sticks.splice(i, 1); };
  s.layout = layout;
  layout();
  if (Screen.touch) Screen.touch.appendChild(zoneEl);
  s.scene = o.keep ? null : (typeof Scenes !== 'undefined' && Scenes.name) || null; // 在場景裡建的：離開場景時自動拿掉（o.keep 不拿）
  Sticks.push(s);
  return s;
};

/* ---------- 觸控按鈕 ---------- */
const TButtons = [];
/**
 * PZ.input.button({ action: 'fire', label: '開火', icon: '<svg…>', right: 24, bottom: 110, size: 76, cls, keep })（跟搖桿一樣：場景裡建的離開場景自動拿掉）
 * 按住就是 down(action)；b.cooldown(0～1) 顯示冷卻圈、b.badge(n) 顯示數量、b.disable(true)。
 */
Input.button = (o = {}) => {
  const b = { action: o.action || 'fire', ids: new Set(), disabled: false };
  const e = el('button', 'pz-tbtn' + (o.cls ? ' ' + o.cls : ''), (o.icon || '') + (o.label ? `<span class="pz-tbtn-label">${o.label}</span>` : ''));
  e.type = 'button'; e.setAttribute('aria-label', o.label || o.action);
  const size = o.size || 72; e.style.width = e.style.height = size + 'px';
  for (const k of ['left', 'right', 'top', 'bottom']) if (o[k] != null) e.style[k] = typeof o[k] === 'number' ? `calc(${o[k]}px + var(--pz-safe-${k[0]}, 0px))` : o[k];
  b.el = e;
  const down = (ev) => {
    ev.preventDefault(); ev.stopPropagation(); setDevice('touch');
    if (b.disabled || !Input.enabled) return;
    b.ids.add(ev.pointerId); try { e.setPointerCapture(ev.pointerId); } catch (er) { /* ignore */ }
    Input.virtDown.set(b.action, (Input.virtDown.get(b.action) || 0) + 1);
    e.classList.add('on');
    const hs = Input._handlers.get(b.action); if (hs) for (const f of hs.slice()) safeCall(f, null, b.action);
    if (o.haptic !== false) Haptics.tap('light');
  };
  const up = (ev) => { if (!b.ids.delete(ev.pointerId)) return; Input.virtDown.set(b.action, Math.max(0, (Input.virtDown.get(b.action) || 1) - 1)); if (!b.ids.size) e.classList.remove('on'); };
  b._up = () => { if (b.ids.size) Input.virtDown.set(b.action, Math.max(0, (Input.virtDown.get(b.action) || 0) - b.ids.size)); b.ids.clear(); e.classList.remove('on'); };
  e.addEventListener('pointerdown', down);
  e.addEventListener('pointerup', up); e.addEventListener('pointercancel', up); e.addEventListener('lostpointercapture', up);
  e.addEventListener('contextmenu', (ev) => ev.preventDefault());
  b.cooldown = (f) => { e.style.setProperty('--pz-cd', clamp01(f).toFixed(3)); e.classList.toggle('cd', f > 0.001); };
  b.badge = (n) => { e.dataset.badge = n == null || n === '' ? '' : String(n); };
  b.disable = (on) => { b.disabled = on; e.classList.toggle('off', on); if (on) b._up(); };
  b.label = (t) => { const s = e.querySelector('.pz-tbtn-label'); if (s) s.textContent = t; };
  b.show = (on) => { e.style.display = on ? '' : 'none'; if (!on) b._up(); };
  b.remove = () => { b._up(); e.remove(); const i = TButtons.indexOf(b); if (i >= 0) TButtons.splice(i, 1); };
  if (Screen.touch) Screen.touch.appendChild(e);
  b.scene = o.keep ? null : (typeof Scenes !== 'undefined' && Scenes.name) || null;
  TButtons.push(b);
  return b;
};
/** 虛擬按鈕／搖桿要不要顯示：'auto'（觸控時才出現）、true、false */
Input.touchMode = 'auto';
PZ.on('device', (d) => { if (Screen.touch && Input.touchMode === 'auto') Screen.touch.classList.toggle('pz-hide', d !== 'touch'); });
Input.showTouch = (mode) => { Input.touchMode = mode; if (!Screen.touch) return; Screen.touch.classList.toggle('pz-hide', mode === false || (mode === 'auto' && Input.device !== 'touch')); };
Input.clearTouch = () => { for (const s of Sticks.slice()) s.remove(); for (const b of TButtons.slice()) b.remove(); };

/* ---------- 觸覺回饋：Android 用震動；iPhone（iOS 18+）用 switch 開關的系統觸感 ---------- */
const Haptics = PZ.haptic = (() => {
  let lbl = null, inp = null, last = 0;
  const ios = () => {
    if (!HAS_DOM) return;
    if (!lbl) { lbl = el('label'); lbl.setAttribute('aria-hidden', 'true'); lbl.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'; inp = document.createElement('input'); inp.type = 'checkbox'; inp.setAttribute('switch', ''); inp.tabIndex = -1; lbl.appendChild(inp); document.body.appendChild(lbl); }
    try { lbl.click(); } catch (e) { /* ignore */ }
  };
  const PAT = { light: [8], medium: [16], heavy: [30], success: [12, 60, 18], error: [24, 50, 24, 50, 24], tick: [5] };
  const h = {
    tap(kind = 'light') {
      if (!HAS_DOM || !Settings.get('haptics')) return;
      const t = nowMs(); if (t - last < 30) return; last = t;
      const pat = PAT[kind] || PAT.light;
      const act = navigator.userActivation; if (act && !act.hasBeenActive) return; // 使用者還沒碰過畫面：瀏覽器不准震
      if (navigator.vibrate) { try { navigator.vibrate(pat); } catch (e) { /* ignore */ } return; }
      if (Env.ios) { ios(); if (pat.length > 1) for (let i = 2; i < pat.length; i += 2) setTimeout(ios, pat.slice(0, i).reduce((a, b) => a + b, 0)); }
    },
  };
  return h;
})();

/* ---------- 安裝事件 ---------- */
Input.init = () => {
  if (!HAS_DOM) return;
  const R = Screen.root;
  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  R.addEventListener('pointerdown', onPointerDown);
  R.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !Input.pointers.size) { Input.pointer.x = e.clientX; Input.pointer.y = e.clientY; } });
  R.addEventListener('pointerup', onPointerUp); R.addEventListener('pointercancel', onPointerUp);
  R.addEventListener('lostpointercapture', (e) => { if (Input.pointers.has(e.pointerId)) onPointerUp(e); });
  R.addEventListener('wheel', onWheel, { passive: false });
  R.addEventListener('contextmenu', (e) => { if (!typing(e.target)) e.preventDefault(); });
  // iPhone Safari：擋掉整頁雙指縮放、雙擊放大
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => { if (!typing(e.target)) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', (e) => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  window.addEventListener('blur', Input.releaseAll);
  PZ.on('hidden', Input.releaseAll);
  window.addEventListener('gamepadconnected', () => { setDevice('gamepad'); PZ.emit('pad', true); });
  window.addEventListener('gamepaddisconnected', () => PZ.emit('pad', false));
  // 在 Claude 的頁面框裡，要先點一下畫面鍵盤才收得到：點畫面時把焦點拿回來
  R.tabIndex = -1; R.style.outline = 'none';
  R.addEventListener('pointerdown', () => { if (document.activeElement === document.body || !document.activeElement) { try { R.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } });
  R.dataset.input = Input.device;
  Screen.touch.classList.toggle('pz-hide', Input.device !== 'touch');
};

/* ---- 07_gl.js ---- */
/* ==========================================================================
   07 WebGL2 繪圖器
   - 所有東西都是「四邊形」：貼圖、圓、光暈、線、文字都走同一個批次，一次畫完。
   - 一般混合與「加亮（發光）」可以在同一批裡混著畫（預乘透明度的技巧），粒子不會打斷批次。
   - 同一批最多 8 張貼圖；換貼圖不必重送資料。
   - 後製：場景先畫到離屏畫布，再一次做泛光、衝擊波扭曲、色差、調色、暗角、閃白、顆粒。
   - iPhone 切到背景可能弄丟 WebGL（context lost）：會自動重建；一直救不回來就換成 Canvas2D。
   ========================================================================== */
const MAX_QUADS = 8192, VERT_WORDS = 6, QUAD_WORDS = VERT_WORDS * 4;
const BLEND = { normal: 0, multiply: 1, screen: 2, erase: 3, add: 4 };
const MODE = { sprite: 0, solid: 1, circle: 2, ring: 3, glow: 4, line: 5, silhouette: 6 };

const SPRITE_VS = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in vec4 aCol;
layout(location=3) in vec4 aExt;
uniform vec2 uView;
uniform vec2 uOff;
out vec2 vUV; out vec4 vCol; flat out int vTex; flat out int vMode; out float vAdd; out float vParam;
void main(){
  gl_Position = vec4(aPos * uView + uOff, 0.0, 1.0);
  vUV = aUV; vCol = aCol;
  vTex = int(aExt.x * 255.0 + 0.5); vMode = int(aExt.y * 255.0 + 0.5); vAdd = aExt.z; vParam = aExt.w;
}`;
const SPRITE_FS = `#version 300 es
precision mediump float;
uniform sampler2D uT[8];
in vec2 vUV; in vec4 vCol; flat in int vTex; flat in int vMode; in float vAdd; in float vParam;
out vec4 o;
vec4 tx(int i, vec2 uv){
  if(i==0) return texture(uT[0],uv); if(i==1) return texture(uT[1],uv); if(i==2) return texture(uT[2],uv); if(i==3) return texture(uT[3],uv);
  if(i==4) return texture(uT[4],uv); if(i==5) return texture(uT[5],uv); if(i==6) return texture(uT[6],uv); return texture(uT[7],uv);
}
void main(){
  vec4 col = vec4(vCol.rgb * vCol.a, vCol.a);
  vec4 c;
  if (vMode == 0) {
    c = tx(vTex, vUV) * col;
    if (vParam > 0.0) c.rgb = mix(c.rgb, vec3(c.a), vParam);
  } else if (vMode == 1) {
    c = col;
  } else if (vMode == 2) {
    float d = length(vUV); float aa = max(fwidth(d), 1e-4);
    c = col * (1.0 - smoothstep(1.0 - aa, 1.0, d));
  } else if (vMode == 3) {
    float d = length(vUV); float aa = max(fwidth(d), 1e-4); float inner = 1.0 - max(vParam, aa * 1.5);
    c = col * (smoothstep(inner - aa, inner, d) * (1.0 - smoothstep(1.0 - aa, 1.0, d)));
  } else if (vMode == 4) {
    float d = length(vUV); float a = max(0.0, 1.0 - d); a = a * a * (1.0 + vParam * 3.0 * a);
    c = col * a;
  } else if (vMode == 5) {
    float d = abs(vUV.y); float aa = max(fwidth(d), 1e-4);
    c = col * (1.0 - smoothstep(1.0 - aa, 1.0, d));
  } else {
    c = col * tx(vTex, vUV).a;
  }
  c.a *= (1.0 - vAdd);
  o = c;
}`;
const FULL_VS = `#version 300 es
out vec2 vUV;
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUV = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
const BRIGHT_FS = `#version 300 es
precision mediump float;
uniform sampler2D uTex; uniform vec2 uTexel; uniform float uThresh; in vec2 vUV; out vec4 o;
void main(){
  vec3 c = texture(uTex, vUV + uTexel * vec2(-0.5,-0.5)).rgb + texture(uTex, vUV + uTexel * vec2(0.5,-0.5)).rgb
         + texture(uTex, vUV + uTexel * vec2(-0.5,0.5)).rgb + texture(uTex, vUV + uTexel * vec2(0.5,0.5)).rgb;
  c *= 0.25;
  // 亮度：以人眼亮度為主（飽和的橘、紅這類「顏色很鮮但不是光」的美術不會整片發光），
  // 再參考最亮的通道（霓虹、火光這種純色光還是會微微發光）；疊加發光（add）疊出來的白光照樣強烈泛光
  float l = max(dot(c, vec3(0.2126, 0.7152, 0.0722)), max(c.r, max(c.g, c.b)) * 0.85);
  float k = smoothstep(uThresh, uThresh + 0.3, l) * (0.35 + 0.65 * min(l, 1.0));
  o = vec4(c * k, 1.0);
}`;
const DOWN_FS = `#version 300 es
precision mediump float;
uniform sampler2D uTex; uniform vec2 uTexel; in vec2 vUV; out vec4 o;
void main(){
  vec3 s = texture(uTex, vUV).rgb * 4.0;
  s += texture(uTex, vUV - uTexel).rgb; s += texture(uTex, vUV + uTexel).rgb;
  s += texture(uTex, vUV + vec2(uTexel.x, -uTexel.y)).rgb; s += texture(uTex, vUV - vec2(uTexel.x, -uTexel.y)).rgb;
  o = vec4(s / 8.0, 1.0);
}`;
const UP_FS = `#version 300 es
precision mediump float;
uniform sampler2D uTex; uniform vec2 uTexel; in vec2 vUV; out vec4 o;
void main(){
  vec2 h = uTexel * 0.5; vec3 s = vec3(0.0);
  s += texture(uTex, vUV + vec2(-h.x * 2.0, 0.0)).rgb; s += texture(uTex, vUV + vec2(-h.x, h.y)).rgb * 2.0;
  s += texture(uTex, vUV + vec2(0.0, h.y * 2.0)).rgb; s += texture(uTex, vUV + vec2(h.x, h.y)).rgb * 2.0;
  s += texture(uTex, vUV + vec2(h.x * 2.0, 0.0)).rgb; s += texture(uTex, vUV + vec2(h.x, -h.y)).rgb * 2.0;
  s += texture(uTex, vUV + vec2(0.0, -h.y * 2.0)).rgb; s += texture(uTex, vUV + vec2(-h.x, -h.y)).rgb * 2.0;
  o = vec4(s / 12.0, 1.0);
}`;
const COMP_FS = `#version 300 es
precision mediump float;
uniform sampler2D uScene; uniform sampler2D uBloom;
uniform vec2 uRes; uniform float uTime; uniform float uAspect;
uniform vec4 uWave[4]; uniform vec4 uWaveP[4]; uniform int uWaves;
uniform float uChroma; uniform float uBloomAmt; uniform float uVig; uniform vec3 uVigCol; uniform float uGrain;
uniform float uSat; uniform float uContrast; uniform float uBright; uniform vec3 uTint; uniform vec4 uFlash; uniform float uScan; uniform float uWarp;
in vec2 vUV; out vec4 o;
void main(){
  vec2 uv = vUV;
  if (uWarp > 0.0) { vec2 c = uv - 0.5; uv = 0.5 + c * (1.0 + dot(c, c) * uWarp); }
  for (int i = 0; i < 4; i++) {
    if (i >= uWaves) break;
    vec4 w = uWave[i]; vec2 d = uv - w.xy; d.x *= uAspect; float dist = length(d);
    float th = uWaveP[i].x; float k = 1.0 - smoothstep(0.0, th, abs(dist - w.z));
    if (dist > 0.0001) { vec2 n = d / dist; n.x /= uAspect; uv -= n * k * w.w; }
  }
  vec3 col;
  if (uChroma > 0.0) { vec2 off = (uv - 0.5) * uChroma; col = vec3(texture(uScene, uv + off).r, texture(uScene, uv).g, texture(uScene, uv - off).b); }
  else col = texture(uScene, uv).rgb;
  if (uBloomAmt > 0.0) col += texture(uBloom, uv).rgb * uBloomAmt;
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSat);
  col = (col - 0.5) * uContrast + 0.5 + uBright;
  col *= uTint;
  if (uVig > 0.0) { vec2 q = vUV - 0.5; q.x *= mix(1.0, uAspect, 0.5); float v = 1.0 - smoothstep(0.2, 0.85, length(q) * 1.15); col = mix(uVigCol, col, mix(1.0, v, uVig)); }
  if (uScan > 0.0) col *= 1.0 - uScan * (0.5 + 0.5 * sin(vUV.y * uRes.y * 3.14159));
  col = mix(col, uFlash.rgb, uFlash.a);
  if (uGrain > 0.0) { float n = fract(sin(dot(vUV * uRes + fract(uTime) * 91.7, vec2(12.9898, 78.233))) * 43758.5453); col += (n - 0.5) * uGrain; }
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

/** 後製參數（PZ.post）：特效模組會去動它們；遊戲也可以直接設 */
const Post = PZ.post = {
  enabled: true,
  bloom: { on: true, strength: 0.6, threshold: 0.78 },
  vignette: 0.35, vignetteColor: '#000', chroma: 0, grain: 0.035, scan: 0, warp: 0,
  sat: 1, contrast: 1, bright: 0, tint: [1, 1, 1],
  flash: [1, 1, 1, 0],
  waves: [], // {x, y（螢幕 px）, r, strength, thick}
};

function compile(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) { const log = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error('著色器編譯失敗：' + log); }
  return s;
}
function program(gl, vs, fs, names) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error('著色器連結失敗：' + gl.getProgramInfoLog(p));
  const u = {}; for (const n of names) u[n] = gl.getUniformLocation(p, n);
  return { p, u };
}

class GLRenderer {
  constructor(canvas) {
    this.kind = 'webgl2'; this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance', desynchronized: false });
    if (!gl) throw new Error('這台裝置不支援 WebGL2');
    this.gl = gl;
    this.textures = new Set();
    this.stats = { draws: 0, quads: 0, flushes: 0, tex: 0 };
    this.buf = new ArrayBuffer(MAX_QUADS * QUAD_WORDS * 4);
    this.f32 = new Float32Array(this.buf); this.u32 = new Uint32Array(this.buf);
    this.n = 0; this.slots = []; this.blend = 0; this.target = null; this.inScene = false; this.lost = false;
    this.w = canvas.width; this.h = canvas.height;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; this.lostAt = Time.real; PZ.emit('contextlost'); }, false);
    canvas.addEventListener('webglcontextrestored', () => { try { this.lost = false; this.setup(); for (const t of [...this.textures]) { t.gl = null; t.fb = null; if (t.restore) t.restore(t); else this.texAlloc(t); } PZ.emit('contextrestored'); } catch (e) { reportError(e, 'contextrestored'); } }, false);
    this.setup();
  }
  setup() {
    const gl = this.gl;
    this.maxSlots = Math.min(8, gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) || 8);
    this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
    this.sp = program(gl, SPRITE_VS, SPRITE_FS, ['uView', 'uOff', 'uT']);
    gl.useProgram(this.sp.p); gl.uniform1iv(this.sp.u.uT, [0, 1, 2, 3, 4, 5, 6, 7]);
    this.pBright = program(gl, FULL_VS, BRIGHT_FS, ['uTex', 'uTexel', 'uThresh']);
    this.pDown = program(gl, FULL_VS, DOWN_FS, ['uTex', 'uTexel']);
    this.pUp = program(gl, FULL_VS, UP_FS, ['uTex', 'uTexel']);
    this.pComp = program(gl, FULL_VS, COMP_FS, ['uScene', 'uBloom', 'uRes', 'uTime', 'uAspect', 'uWave', 'uWaveP', 'uWaves', 'uChroma', 'uBloomAmt', 'uVig', 'uVigCol', 'uGrain', 'uSat', 'uContrast', 'uBright', 'uTint', 'uFlash', 'uScan', 'uWarp']);
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    this.vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferData(gl.ARRAY_BUFFER, this.buf.byteLength, gl.DYNAMIC_DRAW);
    const stride = VERT_WORDS * 4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, stride, 16);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, stride, 20);
    const idx = new Uint16Array(MAX_QUADS * 6);
    for (let i = 0, v = 0; i < idx.length; i += 6, v += 4) { idx[i] = v; idx[i + 1] = v + 1; idx[i + 2] = v + 2; idx[i + 3] = v; idx[i + 4] = v + 2; idx[i + 5] = v + 3; }
    this.ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.emptyVao = gl.createVertexArray();
    // 1×1 白色貼圖：形狀用、沒用到的貼圖槽也綁它
    this.white = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.white);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND);
    this.applyBlend(0);
    this.fbo = {}; // 場景、泛光鏈
    this.fboSize = '';
  }
  /* ---- 貼圖 ---- */
  texCreate(w, h, o = {}) {
    const t = { id: ++TexId, w, h, gl: null, nearest: !!o.nearest, rt: !!o.rt, restore: o.restore || null, fb: null };
    this.texAlloc(t); this.textures.add(t); return t;
  }
  texAlloc(t) {
    const gl = this.gl; t.gl = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t.gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, t.w, t.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const f = t.nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (t.rt) { t.fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.gl, 0); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
  }
  /** 把 canvas／圖片貼到貼圖的 (x, y)（整張來源） */
  texUpload(t, src, x = 0, y = 0) {
    if (this.lost) return;
    const gl = this.gl; this.flush();
    if (!t.gl) this.texAlloc(t);
    gl.bindTexture(gl.TEXTURE_2D, t.gl);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  }
  texClear(t) { if (this.lost || !t.gl) return; this.flush(); const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, t.gl); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, t.w, t.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); }
  texDelete(t) { if (t.gl && !this.lost) { this.flush(); this.gl.deleteTexture(t.gl); if (t.fb) this.gl.deleteFramebuffer(t.fb); } t.gl = null; t.fb = null; this.textures.delete(t); }
  /* ---- 離屏畫布（場景、泛光）---- */
  ensureFbos() {
    const key = this.w + 'x' + this.h + ':' + (Quality.cur.bloom || 0);
    if (key === this.fboSize) return;
    this.fboSize = key;
    const gl = this.gl;
    for (const k in this.fbo) { const f = this.fbo[k]; gl.deleteTexture(f.tex); gl.deleteFramebuffer(f.fb); }
    this.fbo = {};
    const mk = (name, w, h) => {
      w = Math.max(1, w | 0); h = Math.max(1, h | 0);
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      this.fbo[name] = { tex, fb, w, h };
    };
    mk('scene', this.w, this.h);
    const b = Quality.cur.bloom || 0;
    if (b) { const d = b >= 2 ? 2 : 4; mk('b0', this.w / d, this.h / d); mk('b1', this.w / d / 2, this.h / d / 2); mk('b2', this.w / d / 4, this.h / d / 4); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  /* ---- 一格的開始與結束 ---- */
  usePost() { return Post.enabled && Quality.cur.post && !this.lost; }
  begin(clear) {
    if (this.lost) return;
    const gl = this.gl;
    this.w = this.canvas.width; this.h = this.canvas.height;
    this.stats.draws = this.stats.quads = this.stats.flushes = 0;
    this.n = 0; this.slots.length = 0;
    this.inScene = this.usePost();
    if (this.inScene) { this.ensureFbos(); this.bindTarget(this.fbo.scene.fb, this.w, this.h, false); }
    else this.bindTarget(null, this.w, this.h, false);
    const c = toColor(clear == null ? '#000' : clear);
    gl.clearColor(cR(c) / 255, cG(c) / 255, cB(c) / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  }
  bindTarget(fb, w, h, rt) {
    const gl = this.gl; this.flush();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, w, h);
    gl.useProgram(this.sp.p); gl.bindVertexArray(this.vao);
    // 畫到貼圖（rt）時 y 不翻：貼圖第 0 列在下面，之後當貼圖用時 UV 翻一下
    gl.uniform2f(this.sp.u.uView, 2 / w, rt ? 2 / h : -2 / h); gl.uniform2f(this.sp.u.uOff, -1, rt ? -1 : 1);
    this.curW = w; this.curH = h;
    this.applyBlend(this.blend, true);
  }
  /** 開始畫到某張貼圖（rt：用 texCreate(w, h, {rt:true}) 建的）；endTarget() 回到原本的地方 */
  beginTarget(t, clear) {
    if (this.lost) return;
    this.flush(); this._prevTarget = this.inScene ? this.fbo.scene : null;
    if (!t.gl) this.texAlloc(t);
    this.bindTarget(t.fb, t.w, t.h, true);
    if (clear !== undefined) { const gl = this.gl, c = toColor(clear); gl.clearColor(cR(c) / 255 * cA(c), cG(c) / 255 * cA(c), cB(c) / 255 * cA(c), cA(c)); gl.clear(gl.COLOR_BUFFER_BIT); }
  }
  endTarget() { if (this.lost) return; const p = this._prevTarget; this.bindTarget(p ? p.fb : null, this.w, this.h, false); }
  applyBlend(b, force) {
    if (b === this.blend && !force) return;
    this.flush(); this.blend = b; const gl = this.gl;
    if (b === 1) gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA);
    else if (b === 2) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    else if (b === 3) gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
    else if (b === 4) gl.blendFunc(gl.ONE, gl.ONE);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  setBlend(name) { this.applyBlend(BLEND[name] || 0); }
  slotOf(t) {
    if (!t) return 0;
    const s = this.slots; for (let i = 0; i < s.length; i++) if (s[i] === t) return i;
    if (s.length >= this.maxSlots) this.flush();
    s.push(t); return s.length - 1;
  }
  /**
   * 畫一個四邊形：單位正方形 (0,0)-(1,1) 經過仿射矩陣 [a c e; b d f] 變成畫面上的位置（畫布像素）。
   * u0,v0,u1,v1：貼圖座標；形狀模式時是 -1～1。color：打包顏色；mode：MODE；add：0～1 發光；param：模式參數（閃白、環的粗細…）
   */
  quad(t, a, b, c, d, e, f, u0, v0, u1, v1, color, mode, add, param) {
    if (this.lost) return;
    if (t && !t.gl) { if (t.restore) t.restore(t); if (!t.gl) return; }
    if (this.n >= MAX_QUADS) this.flush();
    const slot = this.slotOf(t);
    const ext = ((((param * 255) & 255) << 24) | (((add * 255) & 255) << 16) | ((mode & 255) << 8) | slot) >>> 0;
    const F = this.f32, U = this.u32; let i = this.n * QUAD_WORDS;
    F[i] = e; F[i + 1] = f; F[i + 2] = u0; F[i + 3] = v0; U[i + 4] = color; U[i + 5] = ext; i += 6;
    F[i] = a + e; F[i + 1] = b + f; F[i + 2] = u1; F[i + 3] = v0; U[i + 4] = color; U[i + 5] = ext; i += 6;
    F[i] = a + c + e; F[i + 1] = b + d + f; F[i + 2] = u1; F[i + 3] = v1; U[i + 4] = color; U[i + 5] = ext; i += 6;
    F[i] = c + e; F[i + 1] = d + f; F[i + 2] = u0; F[i + 3] = v1; U[i + 4] = color; U[i + 5] = ext;
    this.n++;
  }
  /** 任意四個角的四邊形（拖尾、梯形光束）：0→1→2→3 順時針；c0 給 0、3 角，c1 給 1、2 角（可以一頭濃一頭淡） */
  quad4(t, x0, y0, x1, y1, x2, y2, x3, y3, u0, v0, u1, v1, c0, c1, mode, add, param) {
    if (this.lost) return;
    if (t && !t.gl) { if (t.restore) t.restore(t); if (!t.gl) return; }
    if (this.n >= MAX_QUADS) this.flush();
    const slot = this.slotOf(t);
    const ext = ((((param * 255) & 255) << 24) | (((add * 255) & 255) << 16) | ((mode & 255) << 8) | slot) >>> 0;
    const F = this.f32, U = this.u32; let i = this.n * QUAD_WORDS;
    F[i] = x0; F[i + 1] = y0; F[i + 2] = u0; F[i + 3] = v0; U[i + 4] = c0; U[i + 5] = ext; i += 6;
    F[i] = x1; F[i + 1] = y1; F[i + 2] = u1; F[i + 3] = v0; U[i + 4] = c1; U[i + 5] = ext; i += 6;
    F[i] = x2; F[i + 1] = y2; F[i + 2] = u1; F[i + 3] = v1; U[i + 4] = c1; U[i + 5] = ext; i += 6;
    F[i] = x3; F[i + 1] = y3; F[i + 2] = u0; F[i + 3] = v1; U[i + 4] = c0; U[i + 5] = ext;
    this.n++;
  }
  /** 實心三角形（多邊形拆成三角形用）：第二個三角形退化 */
  tri(x1, y1, x2, y2, x3, y3, color, add) {
    if (this.lost) return;
    if (this.n >= MAX_QUADS) this.flush();
    const ext = ((((add * 255) & 255) << 16) | (MODE.solid << 8)) >>> 0;
    const F = this.f32, U = this.u32; let i = this.n * QUAD_WORDS;
    const put = (x, y) => { F[i] = x; F[i + 1] = y; F[i + 2] = 0; F[i + 3] = 0; U[i + 4] = color; U[i + 5] = ext; i += 6; };
    put(x1, y1); put(x2, y2); put(x3, y3); put(x3, y3);
    this.n++;
  }
  flush() {
    if (!this.n || this.lost) { this.n = 0; return; }
    const gl = this.gl;
    for (let i = 0; i < this.maxSlots; i++) { gl.activeTexture(gl.TEXTURE0 + i); const t = this.slots[i]; gl.bindTexture(gl.TEXTURE_2D, t && t.gl ? t.gl : this.white); }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.f32, 0, this.n * QUAD_WORDS);
    gl.drawElements(gl.TRIANGLES, this.n * 6, gl.UNSIGNED_SHORT, 0);
    this.stats.draws++; this.stats.quads += this.n;
    this.n = 0; this.slots.length = 0;
  }
  /** 場景畫完：做後製並換到螢幕；之後畫的東西（HUD）不受震動、色差影響 */
  hud() {
    if (this.lost) return;
    if (!this.inScene) { this.flashOverlay(); return; }
    this.flush(); this.inScene = false;
    const gl = this.gl, S = this.fbo.scene;
    gl.bindVertexArray(this.emptyVao); gl.disable(gl.BLEND);
    let bloomTex = null;
    const bq = Quality.cur.bloom || 0;
    if (bq && Post.bloom.on && Post.bloom.strength > 0 && this.fbo.b0) {
      const pass = (prog, src, dst, uni) => { gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, dst.w, dst.h); gl.useProgram(prog.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tex); gl.uniform1i(prog.u.uTex, 0); gl.uniform2f(prog.u.uTexel, 1 / src.w, 1 / src.h); if (uni) uni(prog); gl.drawArrays(gl.TRIANGLES, 0, 3); };
      const { b0, b1, b2 } = this.fbo;
      pass(this.pBright, S, b0, (p) => gl.uniform1f(p.u.uThresh, Post.bloom.threshold));
      pass(this.pDown, b0, b1); pass(this.pDown, b1, b2);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      pass(this.pUp, b2, b1); pass(this.pUp, b1, b0);
      gl.disable(gl.BLEND);
      bloomTex = b0.tex;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.w, this.h);
    const P = this.pComp, u = P.u; gl.useProgram(P.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.tex); gl.uniform1i(u.uScene, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bloomTex || this.white); gl.uniform1i(u.uBloom, 1);
    gl.uniform2f(u.uRes, this.w, this.h); gl.uniform1f(u.uTime, Time.real); gl.uniform1f(u.uAspect, this.w / this.h);
    const ws = Post.waves, n = Math.min(4, ws.length), W = this._W || (this._W = new Float32Array(16)), WP = this._WP || (this._WP = new Float32Array(16)), sw = Screen.w || 1, sh = Screen.h || 1;
    for (let i = 0; i < n; i++) { const w = ws[i]; W[i * 4] = w.x / sw; W[i * 4 + 1] = 1 - w.y / sh; W[i * 4 + 2] = w.r / sh; W[i * 4 + 3] = w.strength; WP[i * 4] = Math.max(0.002, w.thick / sh); }
    gl.uniform4fv(u.uWave, W); gl.uniform4fv(u.uWaveP, WP); gl.uniform1i(u.uWaves, n);
    gl.uniform1f(u.uChroma, Post.chroma * Settings.flashScale()); gl.uniform1f(u.uBloomAmt, bloomTex ? Post.bloom.strength : 0);
    const vc = toColor(Post.vignetteColor);
    gl.uniform1f(u.uVig, Post.vignette); gl.uniform3f(u.uVigCol, cR(vc) / 255, cG(vc) / 255, cB(vc) / 255); gl.uniform1f(u.uGrain, Post.grain);
    gl.uniform1f(u.uSat, Post.sat); gl.uniform1f(u.uContrast, Post.contrast); gl.uniform1f(u.uBright, Post.bright);
    gl.uniform3f(u.uTint, Post.tint[0], Post.tint[1], Post.tint[2]);
    const fl = Post.flash; gl.uniform4f(u.uFlash, fl[0], fl[1], fl[2], fl[3] * Settings.flashScale());
    gl.uniform1f(u.uScan, Post.scan); gl.uniform1f(u.uWarp, Post.warp);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.BLEND);
    this.bindTarget(null, this.w, this.h, false);
  }
  /** 沒有後製時：閃白用一個全螢幕方塊蓋上去 */
  flashOverlay() {
    const fl = Post.flash, a = fl[3] * Settings.flashScale();
    if (a <= 0.001) return;
    this.quad(null, this.w, 0, 0, this.h, 0, 0, 0, 0, 1, 1, pack(fl[0] * 255, fl[1] * 255, fl[2] * 255, a), MODE.solid, 0, 0);
  }
  end() { if (this.lost) return; if (this.inScene) this.hud(); this.flush(); }
  destroy() { const ext = this.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }
}
let TexId = 0;

/* ---- 08_c2d.js ---- */
/* ==========================================================================
   08 Canvas2D 後備繪圖器
   沒有 WebGL2、或 WebGL 一直救不回來時用。介面跟 GLRenderer 一樣，遊戲不用改。
   做不到的：後製（泛光、扭曲、色差、調色）、上色（tint）。閃白、暗角、加亮照常。
   ========================================================================== */
class C2DRenderer {
  constructor(canvas) {
    this.kind = 'canvas2d'; this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    if (!this.ctx) throw new Error('沒有 Canvas2D');
    this.cur = this.ctx; this.textures = new Set();
    this.stats = { draws: 0, quads: 0, flushes: 0, tex: 0 };
    this.blendOp = 'source-over'; this.lost = false; this.inScene = false;
    this.w = canvas.width; this.h = canvas.height;
    this._glow = new Map(); this._vig = null; this._vigKey = '';
  }
  texCreate(w, h, o = {}) {
    const t = { id: ++TexId, w, h, canvas: document.createElement('canvas'), nearest: !!o.nearest, rt: !!o.rt, restore: o.restore || null };
    t.canvas.width = w; t.canvas.height = h; t.ctx = t.canvas.getContext('2d');
    this.textures.add(t); return t;
  }
  texUpload(t, src, x = 0, y = 0) { t.ctx.drawImage(src, x, y); t._white = null; t._sil = null; }
  texClear(t) { t.ctx.clearRect(0, 0, t.w, t.h); t._white = null; }
  texDelete(t) { if (t.canvas && !t.live) { t.canvas.width = t.canvas.height = 0; } t.canvas = null; this.textures.delete(t); } // live＝遊戲自己的畫布，不清
  begin(clear) {
    this.w = this.canvas.width; this.h = this.canvas.height;
    this.stats.draws = this.stats.quads = 0;
    const c = this.ctx; this.cur = c;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.fillStyle = Color.css(Color.alpha(clear == null ? '#000' : clear, 1)); c.fillRect(0, 0, this.w, this.h);
    this.inScene = true;
  }
  beginTarget(t, clear) {
    this._prev = this.cur; this.cur = t.ctx; t._white = null;
    if (clear !== undefined) { t.ctx.setTransform(1, 0, 0, 1, 0, 0); t.ctx.clearRect(0, 0, t.w, t.h); const cc = toColor(clear); if (cA(cc) > 0) { t.ctx.fillStyle = Color.css(cc); t.ctx.fillRect(0, 0, t.w, t.h); } }
  }
  endTarget() { this.cur = this._prev || this.ctx; }
  setBlend(name) { this.blendOp = name === 'multiply' ? 'multiply' : name === 'screen' ? 'screen' : name === 'erase' ? 'destination-out' : name === 'add' ? 'lighter' : 'source-over'; }
  whiteOf(t) {
    if (t._white) return t._white;
    const w = document.createElement('canvas'); w.width = t.w; w.height = t.h; const x = w.getContext('2d');
    x.drawImage(t.canvas, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, t.w, t.h);
    t._white = w; return w;
  }
  glowOf(color) {
    const key = color & 0xffffff; let g = this._glow.get(key);
    if (g) return g;
    g = document.createElement('canvas'); g.width = g.height = 64; const x = g.getContext('2d');
    const r = cR(color), gg = cG(color), b = cB(color), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${r},${gg},${b},1)`); gr.addColorStop(0.35, `rgba(${r},${gg},${b},0.45)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    if (this._glow.size > 64) this._glow.clear();
    this._glow.set(key, g); return g;
  }
  quad(t, a, b, c, d, e, f, u0, v0, u1, v1, color, mode, add, param) {
    const x = this.cur; this.stats.quads++;
    const al = cA(color); if (al <= 0.002) return;
    x.setTransform(a, b, c, d, e, f);
    x.globalAlpha = al;
    x.globalCompositeOperation = add > 0.5 ? 'lighter' : this.blendOp;
    if (mode === MODE.sprite || mode === MODE.silhouette) {
      if (!t || !t.canvas) return;
      let sx = u0 * t.w, sy = v0 * t.h, sw = (u1 - u0) * t.w, sh = (v1 - v0) * t.h;
      if (sw < 0) { x.transform(-1, 0, 0, 1, 1, 0); sx += sw; sw = -sw; }
      if (sh < 0) { x.transform(1, 0, 0, -1, 0, 1); sy += sh; sh = -sh; }
      if (sw <= 0 || sh <= 0) return;
      if (mode === MODE.silhouette) { x.drawImage(this.whiteOf(t), sx, sy, sw, sh, 0, 0, 1, 1); return; }
      x.drawImage(t.canvas, sx, sy, sw, sh, 0, 0, 1, 1);
      if (param > 0.01) { x.globalAlpha = al * param; x.drawImage(this.whiteOf(t), sx, sy, sw, sh, 0, 0, 1, 1); }
    } else if (mode === MODE.solid || mode === MODE.line) {
      x.fillStyle = Color.css(color | 0xff000000); x.fillRect(0, 0, 1, 1);
    } else if (mode === MODE.circle) {
      x.fillStyle = Color.css(color | 0xff000000); x.beginPath(); x.arc(0.5, 0.5, 0.5, 0, TAU); x.fill();
    } else if (mode === MODE.ring) {
      const th = Math.max(0.02, param) * 0.5; x.strokeStyle = Color.css(color | 0xff000000); x.lineWidth = th; x.beginPath(); x.arc(0.5, 0.5, 0.5 - th / 2, 0, TAU); x.stroke();
    } else if (mode === MODE.glow) {
      x.drawImage(this.glowOf(color), 0, 0, 1, 1);
    }
  }
  quad4(t, x0, y0, x1, y1, x2, y2, x3, y3, u0, v0, u1, v1, c0, c1, mode, add) {
    const x = this.cur; x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = (cA(c0) + cA(c1)) / 2; if (x.globalAlpha <= 0.002) return;
    x.globalCompositeOperation = add > 0.5 ? 'lighter' : this.blendOp;
    x.fillStyle = Color.css(Color.mix(c0, c1, 0.5) | 0xff000000);
    x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.lineTo(x2, y2); x.lineTo(x3, y3); x.closePath(); x.fill();
  }
  tri(x1, y1, x2, y2, x3, y3, color, add) {
    const x = this.cur; x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = cA(color);
    x.globalCompositeOperation = add > 0.5 ? 'lighter' : this.blendOp;
    x.fillStyle = Color.css(color | 0xff000000); x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.lineTo(x3, y3); x.closePath(); x.fill();
  }
  flush() { }
  hud() {
    if (!this.inScene) return; this.inScene = false;
    const x = this.ctx; x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over';
    if (Post.vignette > 0.01) {
      const key = this.w + 'x' + this.h + ':' + Post.vignette.toFixed(2) + Post.vignetteColor;
      if (key !== this._vigKey) {
        this._vigKey = key; const v = this._vig || (this._vig = document.createElement('canvas')); v.width = Math.max(1, this.w / 4 | 0); v.height = Math.max(1, this.h / 4 | 0);
        const vx = v.getContext('2d'), cx = v.width / 2, cy = v.height / 2, R = Math.hypot(cx, cy), g = vx.createRadialGradient(cx, cy, R * 0.25, cx, cy, R);
        const vc = toColor(Post.vignetteColor); g.addColorStop(0, `rgba(${cR(vc)},${cG(vc)},${cB(vc)},0)`); g.addColorStop(1, `rgba(${cR(vc)},${cG(vc)},${cB(vc)},${Math.min(0.9, Post.vignette * 1.6)})`);
        vx.fillStyle = g; vx.fillRect(0, 0, v.width, v.height);
      }
      x.globalAlpha = 1; x.drawImage(this._vig, 0, 0, this.w, this.h);
    }
    const fl = Post.flash, a = fl[3] * Settings.flashScale();
    if (a > 0.002) { x.globalAlpha = a; x.fillStyle = `rgb(${fl[0] * 255 | 0},${fl[1] * 255 | 0},${fl[2] * 255 | 0})`; x.fillRect(0, 0, this.w, this.h); }
    x.globalAlpha = 1;
  }
  end() { if (this.inScene) this.hud(); }
  destroy() { }
}

/* ---------- 選擇繪圖器、處理 WebGL 遺失 ---------- */
const Gfx = PZ.gfx = { r: null, kind: '', forced: null };
Gfx.create = (prefer) => {
  const cv = Screen.canvas;
  if (prefer !== 'canvas2d') {
    try { Gfx.r = new GLRenderer(cv); Gfx.kind = 'webgl2'; return Gfx.r; }
    catch (e) { warnOnce('gl', 'WebGL2 用不了，改用 Canvas2D：' + e.message); }
  }
  // 已經拿過 WebGL context 的畫布不能再拿 2D：換一張新的
  const fresh = document.createElement('canvas'); fresh.id = 'pz-canvas'; fresh.width = cv.width; fresh.height = cv.height;
  cv.replaceWith(fresh); Screen.canvas = fresh;
  Gfx.r = new C2DRenderer(fresh); Gfx.kind = 'canvas2d';
  return Gfx.r;
};
/** 換成 Canvas2D（WebGL 救不回來時自動呼叫；也可以手動測試） */
Gfx.fallback = () => {
  if (Gfx.kind === 'canvas2d') return;
  const old = Gfx.r, texs = old ? [...old.textures] : [];
  try { if (old) old.destroy(); } catch (e) { /* ignore */ }
  const r = Gfx.create('canvas2d');
  for (const t of texs) { // 把貼圖搬到新的繪圖器：由各自的 restore 重畫
    t.gl = null; t.fb = null; t.canvas = document.createElement('canvas'); t.canvas.width = t.w; t.canvas.height = t.h; t.ctx = t.canvas.getContext('2d');
    r.textures.add(t); if (t.restore) safeCall(t.restore, null, t);
  }
  PZ.emit('renderer', 'canvas2d');
};
// WebGL 遺失超過 4 秒（畫面看得到的狀態下）還沒恢復：換 Canvas2D
addSystem({ name: 'gfx-watch', order: -80, frame() { const r = Gfx.r; if (r && r.lost && !document.hidden && Time.real - (r.lostAt || Time.real) > 4) Gfx.fallback(); } });
PZ.on('visible', () => { if (Gfx.r && Gfx.r.lost) Gfx.r.lostAt = Time.real; });

/* ---- 09_art.js ---- */
/* ==========================================================================
   09 美術：用程式畫的圖收進圖集（atlas）
     PZ.art.make('zombie', 48, 64, (ctx, w, h) => { …用 Canvas2D 畫… }, { anchor: [0.5, 0.9] });
     g.sprite('zombie', x, y);           // 之後用名字畫
   - 在 w×h 的「邏輯大小」裡畫，實際以 scale 倍（預設 2）的像素存，放大也清楚。
   - 很多小圖會擠在同一張 2048 的大貼圖裡：同一批畫完，iPhone 的記憶體也省。
   - WebGL 模式下 CPU 端不留畫布（畫完就上傳），WebGL 遺失時用原本的畫法重畫。
   - 外部圖片：await PZ.art.image('hero', 'data:image/png;base64,…')。
   - 要在 DOM 裡用（立繪、頭像）：PZ.art.canvas('portrait') 回傳一張新畫布。
   ========================================================================== */
class Skyline {
  constructor(w, h) { this.w = w; this.h = h; this.nodes = [{ x: 0, y: 0, w }]; this.used = 0; }
  fit(i, w, h) {
    const n = this.nodes[i]; if (n.x + w > this.w) return -1;
    let y = n.y, left = w, j = i;
    while (left > 0) { if (j >= this.nodes.length) return -1; y = Math.max(y, this.nodes[j].y); if (y + h > this.h) return -1; left -= this.nodes[j].w; j++; }
    return y;
  }
  insert(w, h) {
    let best = -1, by = Infinity, bw = Infinity, bx = 0;
    for (let i = 0; i < this.nodes.length; i++) { const y = this.fit(i, w, h); if (y >= 0 && (y + h < by || (y + h === by && this.nodes[i].w < bw))) { best = i; by = y + h; bw = this.nodes[i].w; bx = this.nodes[i].x; } }
    if (best < 0) return null;
    const y = by - h;
    this.nodes.splice(best, 0, { x: bx, y: by, w });
    for (let i = best + 1; i < this.nodes.length; i++) {
      const n = this.nodes[i], p = this.nodes[i - 1];
      if (n.x < p.x + p.w) { const shrink = p.x + p.w - n.x; n.x += shrink; n.w -= shrink; if (n.w <= 0) { this.nodes.splice(i, 1); i--; } else break; } else break;
    }
    for (let i = 0; i < this.nodes.length - 1; i++) { if (this.nodes[i].y === this.nodes[i + 1].y) { this.nodes[i].w += this.nodes[i + 1].w; this.nodes.splice(i + 1, 1); i--; } }
    this.used += w * h;
    return { x: bx, y };
  }
}
PZ.Skyline = Skyline;

class Frame {
  constructor(name) { this.name = name; this.tex = null; this.sx = 0; this.sy = 0; this.sw = 0; this.sh = 0; this.w = 0; this.h = 0; this.ax = 0.5; this.ay = 0.5; this.u0 = 0; this.v0 = 0; this.u1 = 1; this.v1 = 1; this.entry = null; }
  setRect(tex, sx, sy, sw, sh) { this.tex = tex; this.sx = sx; this.sy = sy; this.sw = sw; this.sh = sh; this.u0 = sx / tex.w; this.v0 = sy / tex.h; this.u1 = (sx + sw) / tex.w; this.v1 = (sy + sh) / tex.h; }
}
PZ.Frame = Frame;

const Art = PZ.art = {
  scale: 2, pageSize: 2048, pad: 2,
  frames: new Map(), pages: [], pending: [], entries: [],
  _scratch: null, _sctx: null,
};
function scratch(w, h) {
  if (!Art._scratch) { Art._scratch = document.createElement('canvas'); Art._sctx = Art._scratch.getContext('2d', { willReadFrequently: false }); }
  const c = Art._scratch; if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } else Art._sctx.clearRect(0, 0, w, h);
  const x = Art._sctx; x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.imageSmoothingEnabled = true;
  return x;
}
/** 依條目的畫法畫到 ctx（左上角＝(ox, oy)，已經含 pad） */
function paintEntry(ctx, en, ox, oy) {
  ctx.save();
  ctx.translate(ox + en.pad, oy + en.pad);
  ctx.beginPath(); ctx.rect(0, 0, en.pw - en.pad * 2, en.ph - en.pad * 2); ctx.clip();
  ctx.scale(en.scale, en.scale);
  if (en.nearest) ctx.imageSmoothingEnabled = false;
  try { en.draw(ctx, en.w, en.h, en.arg); } catch (e) { reportError(e, 'art:' + en.name); }
  ctx.restore();
}
function newPage(nearest, w = Art.pageSize, h = Art.pageSize, solo = false) {
  const r = Gfx.r;
  const page = { nearest, w, h, sky: solo ? null : new Skyline(w, h), entries: [], tex: null, solo };
  page.tex = r.texCreate(w, h, { nearest, restore: () => restorePage(page) });
  Art.pages.push(page);
  return page;
}
function uploadEntry(en) {
  const r = Gfx.r, page = en.page;
  if (r.kind === 'canvas2d') { paintEntry(page.tex.ctx, en, en.x, en.y); page.tex._white = null; return; }
  const ctx = scratch(en.pw, en.ph); paintEntry(ctx, en, 0, 0);
  r.texUpload(page.tex, Art._scratch, en.x, en.y);
}
function restorePage(page) {
  const r = Gfx.r;
  if (r.kind !== 'canvas2d') { page.tex.gl = null; r.texAlloc(page.tex); }
  else page.tex.ctx.clearRect(0, 0, page.w, page.h);
  for (const en of page.entries) uploadEntry(en);
}
function place(en) {
  const ps = Art.pageSize;
  if (en.pw > ps || en.ph > ps) {
    const maxT = (Gfx.r && Gfx.r.maxTex) || 4096;
    if (en.pw > maxT || en.ph > maxT) { warnOnce('big:' + en.name, `圖「${en.name}」太大（${en.pw}×${en.ph}），自動縮小`); const k = Math.min(maxT / en.pw, maxT / en.ph) * 0.98; en.scale *= k; en.pw = Math.ceil(en.w * en.scale) + en.pad * 2; en.ph = Math.ceil(en.h * en.scale) + en.pad * 2; }
    const pg = newPage(en.nearest, en.pw, en.ph, true); en.page = pg; en.x = 0; en.y = 0; pg.entries.push(en); return;
  }
  for (const pg of Art.pages) {
    if (pg.solo || pg.nearest !== en.nearest) continue;
    const p = pg.sky.insert(en.pw, en.ph);
    if (p) { en.page = pg; en.x = p.x; en.y = p.y; pg.entries.push(en); return; }
  }
  const pg = newPage(en.nearest); const p = pg.sky.insert(en.pw, en.ph);
  en.page = pg; en.x = p.x; en.y = p.y; pg.entries.push(en);
}
function realize(en) {
  place(en); uploadEntry(en);
  const f = en.frame; f.setRect(en.page.tex, en.x + en.pad, en.y + en.pad, en.pw - en.pad * 2, en.ph - en.pad * 2);
}

/**
 * 畫一張圖收進圖集。
 * o: { scale（像素密度，預設 2）, anchor: [ax, ay]（0～1，預設置中）, pixel: true（像素風、不模糊）, pad, arg（傳給 draw 的第 4 個參數） }
 * 同名會覆蓋（舊的位置不回收）。
 */
Art.make = (name, w, h, draw, o = {}) => {
  let f = Art.frames.get(name);
  if (!f) { f = new Frame(name); Art.frames.set(name, f); }
  const scale = o.scale || (o.pixel ? 1 : Art.scale), pad = o.pad != null ? o.pad : Art.pad;
  const en = { name, w, h, draw, scale, pad, nearest: !!o.pixel, arg: o.arg, pw: Math.ceil(w * scale) + pad * 2, ph: Math.ceil(h * scale) + pad * 2, page: null, x: 0, y: 0, frame: f };
  f.w = w; f.h = h; const an = o.anchor || [0.5, 0.5]; f.ax = an[0]; f.ay = an[1]; f.entry = en;
  if (Gfx.r) realize(en); else Art.pending.push(en);
  return f;
};
/** 一整排動畫格：回傳 frames 陣列（名字是 name:0、name:1…） */
Art.sheet = (name, count, w, h, draw, o = {}) => {
  const out = [];
  for (let i = 0; i < count; i++) out.push(Art.make(`${name}:${i}`, w, h, (ctx, ww, hh) => draw(ctx, ww, hh, i), o));
  return out;
};
/** 載入圖片（網址或 data URL）。o: { w, h（邏輯大小，預設＝原圖大小 ÷ density）, density（預設 1）, anchor, pixel } */
Art.image = (name, src, o = {}) => new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => {
    const d = o.density || 1, w = o.w || img.naturalWidth / d, h = o.h || img.naturalHeight / d;
    res(Art.make(name, w, h, (ctx, ww, hh) => ctx.drawImage(img, 0, 0, ww, hh), Object.assign({ scale: img.naturalWidth / w }, o)));
  };
  img.onerror = () => rej(new Error('圖片載入失敗：' + name));
  img.src = src;
});
const MISSING = new Frame('missing');
Art.get = (name) => {
  if (typeof name !== 'string') return name;
  const f = Art.frames.get(name);
  if (f) return f;
  warnOnce('missing:' + name, '找不到圖：' + name);
  return MISSING;
};
Art.has = (name) => Art.frames.has(name);
/** 把一張圖重畫成新的 DOM 畫布（立繪、頭像、按鈕圖示用）。scale 預設跟裝置像素比一樣清楚 */
Art.canvas = (name, scale) => {
  const f = Art.get(name), en = f.entry; if (!en) return document.createElement('canvas');
  const s = scale || Math.min(3, (HAS_DOM && window.devicePixelRatio) || 2);
  const c = document.createElement('canvas'); c.width = Math.ceil(en.w * s); c.height = Math.ceil(en.h * s);
  const x = c.getContext('2d'); x.scale(s, s); if (en.nearest) x.imageSmoothingEnabled = false;
  try { en.draw(x, en.w, en.h, en.arg); } catch (e) { reportError(e, 'art.canvas:' + name); }
  return c;
};
Art.url = (name, scale) => Art.canvas(name, scale).toDataURL('image/png');

/** 畫布貼圖（render target）：可以把東西「畫進去」留著（地上的血跡、彈孔、迷你地圖）。用 g.into(name, () => {...}) 畫 */
Art.target = (name, w, h, o = {}) => {
  const r = Gfx.r; let f = Art.frames.get(name);
  if (!f) { f = new Frame(name); Art.frames.set(name, f); }
  const res = o.res || 1, pw = Math.ceil(w * res), ph = Math.ceil(h * res);
  const tex = r.texCreate(pw, ph, { rt: true, nearest: !!o.pixel, restore: (t) => { if (Gfx.r.kind !== 'canvas2d') { t.gl = null; Gfx.r.texAlloc(t); } } });
  f.setRect(tex, 0, 0, pw, ph); f.w = w; f.h = h; f.ax = 0; f.ay = 0; f.rt = true; f.res = res;
  return f;
};

/**
 * 把一張「一直在變的畫布」當成貼圖（舊遊戲遷移、小地圖、動態文字面板）：
 *   const f = PZ.art.live('world', canvas, { pixel: true });  每次畫布畫完呼叫 f.refresh()
 * 畫布大小變了會自動重新配置。Canvas2D 模式下直接用那張畫布，不複製。
 */
Art.live = (name, canvas, o = {}) => {
  let f = Art.frames.get(name);
  if (!f) { f = new Frame(name); Art.frames.set(name, f); }
  f.live = canvas; f.ax = o.anchor ? o.anchor[0] : 0; f.ay = o.anchor ? o.anchor[1] : 0;
  const alloc = () => {
    const r = Gfx.r, w = canvas.width, h = canvas.height;
    // 舊貼圖：Canvas2D 模式下只拿掉包裝（canvas 是遊戲自己的，不能被清掉）；WebGL 才真的刪貼圖
    if (f.tex && r.textures.has(f.tex)) { if (f.tex.canvas === canvas) r.textures.delete(f.tex); else r.texDelete(f.tex); }
    if (r.kind === 'canvas2d') { f.tex = { id: ++TexId, w, h, canvas, ctx: canvas.getContext('2d'), nearest: !!o.pixel, restore: null, live: true }; r.textures.add(f.tex); }
    else f.tex = r.texCreate(w, h, { nearest: !!o.pixel, restore: (t) => { if (Gfx.r.texAlloc) Gfx.r.texAlloc(t); if (Gfx.r.texUpload) Gfx.r.texUpload(t, canvas, 0, 0); } });
    f.setRect(f.tex, 0, 0, w, h); f.w = w / (o.density || 1); f.h = h / (o.density || 1); f._w = w; f._h = h;
  };
  f.refresh = () => {
    const r = Gfx.r; if (!r) return f;
    if (!f.tex || f._w !== canvas.width || f._h !== canvas.height || (r.kind === 'canvas2d') !== !!f.tex.canvas) alloc();
    if (r.kind !== 'canvas2d') r.texUpload(f.tex, canvas, 0, 0); else f.tex._white = null;
    return f;
  };
  if (Gfx.r) f.refresh();
  return f;
};
PZ.on('renderer', () => { for (const f of Art.frames.values()) if (f.live) { f.tex = null; f.refresh(); } });

/** 動畫：PZ.anim(frames, fps, loop) → 回傳函式 (t秒) => frame */
PZ.anim = (frames, fps = 10, loop = true) => {
  const fr = frames.map((f) => Art.get(f));
  return (t) => { let i = Math.floor(t * fps); i = loop ? ((i % fr.length) + fr.length) % fr.length : Math.min(fr.length - 1, Math.max(0, i)); return fr[i]; };
};

/* ---------- 內建圖：粒子與特效常用 ---------- */
function makeBuiltins() {
  const soft = (ctx, w, h) => { const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, '#fff'); g.addColorStop(0.4, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); };
  Art.make('pz.soft', 32, 32, soft);
  Art.make('pz.spark', 32, 8, (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,.9)'); g.addColorStop(1, '#fff'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.quadraticCurveTo(w * 0.7, 0, w, h / 2); ctx.quadraticCurveTo(w * 0.7, h, 0, h / 2); ctx.fill(); });
  Art.make('pz.star', 32, 32, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2); ctx.fillStyle = '#fff';
    for (const [l, t] of [[w / 2, 2.2], [w / 3.2, 2.2]]) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, r = i % 2 ? t : l; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.rotate(Math.PI / 4); ctx.globalAlpha = 0.6; }
    ctx.globalAlpha = 1; const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 4); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
  });
  Art.make('pz.smoke', 48, 48, (ctx, w, h) => {
    const r = makeRng(7);
    for (let i = 0; i < 14; i++) { const x = w / 2 + r.spread(w * 0.18), y = h / 2 + r.spread(h * 0.18), rad = w * r.range(0.16, 0.3), g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  });
  Art.make('pz.shard', 16, 16, (ctx, w, h) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.2); ctx.lineTo(w * 0.95, h * 0.45); ctx.lineTo(w * 0.3, h * 0.95); ctx.closePath(); ctx.fill(); });
  Art.make('pz.drop', 16, 24, (ctx, w, h) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.quadraticCurveTo(w, h * 0.6, w / 2, h); ctx.quadraticCurveTo(0, h * 0.6, w / 2, 0); ctx.fill(); });
  Art.make('pz.ring', 64, 64, (ctx, w, h) => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 3, 0, TAU); ctx.stroke(); });
  Art.make('pz.square', 8, 8, (ctx, w, h) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }, { pad: 1 });
  Art.make('pz.flare', 64, 64, (ctx, w, h) => {
    soft(ctx, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, h / 2 - 1.5, w, 3); ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(Math.PI / 2); ctx.translate(-w / 2, -h / 2); ctx.fillRect(0, h / 2 - 1.5, w, 3); ctx.restore();
  });
}
Art.init = () => {
  for (const en of Art.pending.splice(0)) realize(en);
  if (!Art.frames.has('pz.soft')) makeBuiltins();
};

/* ---- 10_text.js ---- */
/* ==========================================================================
   10 文字：中文字型圖集
   每個字第一次出現時用瀏覽器畫一次、收進字型貼圖，之後跟圖片一樣一批畫完。
   會依實際顯示大小挑最接近的光柵大小，放大縮小都清楚。
   斷行照中文習慣：逗號句號不放行首、左括號不放行尾，英文整個單字一起換行。
   g.text('第一章 最後一單', x, y, { size: 24, color: '#fff', weight: 900, outline: 3, outlineColor: '#000', align: 'center' })
   ========================================================================== */
const Text = PZ.text = {
  font: '"PZ Sans","Noto Sans TC","PingFang TC","Heiti TC","Microsoft JhengHei","Noto Sans CJK TC",system-ui,sans-serif',
  sizes: [12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160],
  pageSize: 1024, maxPages: 8,
  pages: [], glyphs: new Map(), _measure: new Map(), _ctx: null,
};
const NO_START = new Set('，。、；：！？）」』】》〉…—～,.;:!?)]}’”%·．'.split(''));
const NO_END = new Set('（「『【《〈([{‘“'.split(''));
const isWide = (c) => { const k = c.codePointAt(0); return k >= 0x2e80 || (k >= 0x1100 && k <= 0x11ff); };
const EMOJI = /\p{Extended_Pictographic}/u;

function textCtx() {
  if (!Text._ctx) { const c = document.createElement('canvas'); c.width = c.height = 4; Text._ctx = c.getContext('2d'); }
  return Text._ctx;
}
function fontSpec(st, px) { return `${st.italic ? 'italic ' : ''}${st.weight || 400} ${px}px ${st.font || Text.font}`; }
function rasterSize(need) { for (const s of Text.sizes) if (s >= need) return s; return Text.sizes[Text.sizes.length - 1]; }

function newGlyphPage() {
  const r = Gfx.r, S = Text.pageSize;
  const pg = { sky: new Skyline(S, S), tex: null };
  pg.tex = r.texCreate(S, S, { restore: () => Text.reset() });
  Text.pages.push(pg); return pg;
}
/** 字型圖集滿了或繪圖器換了：全部清掉，之後要用時再畫 */
Text.reset = () => {
  const r = Gfx.r;
  for (const pg of Text.pages) { if (r && r.textures.has(pg.tex)) r.texDelete(pg.tex); }
  Text.pages.length = 0; Text.glyphs.clear();
};
function glyph(ch, st, R, stroke) {
  const fam = st.font || Text.font, key = `${fam}|${st.weight || 400}|${st.italic ? 1 : 0}|${R}|${stroke}|${ch}`;
  let g = Text.glyphs.get(key);
  if (g) return g;
  const r = Gfx.r;
  const mc = textCtx(); mc.font = fontSpec(st, R);
  const m = mc.measureText(ch);
  const asc = m.fontBoundingBoxAscent || R * 0.95, desc = m.fontBoundingBoxDescent || R * 0.28;
  const left = Math.max(0, m.actualBoundingBoxLeft || 0), right = Math.max(m.width, m.actualBoundingBoxRight || m.width);
  const pad = 2 + Math.ceil(stroke), cw = Math.ceil(left + right) + pad * 2, chh = Math.ceil(asc + desc) + pad * 2;
  g = { page: null, sx: 0, sy: 0, sw: cw, sh: chh, ox: -(pad + left), oy: -(pad + asc), adv: m.width, R, color: EMOJI.test(ch), empty: ch === ' ' || ch === '　' };
  if (g.empty || !r) { Text.glyphs.set(key, g); return g; }
  let pg = null, p = null;
  for (const q of Text.pages) { p = q.sky.insert(cw, chh); if (p) { pg = q; break; } }
  if (!p) {
    if (Text.pages.length >= Text.maxPages) { Text.reset(); return glyph(ch, st, R, stroke); }
    pg = newGlyphPage(); p = pg.sky.insert(cw, chh);
    if (!p) { Text.glyphs.set(key, g); g.empty = true; return g; }
  }
  g.page = pg; g.sx = p.x; g.sy = p.y;
  const draw = (ctx, ox, oy) => {
    ctx.save(); ctx.font = fontSpec(st, R); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const bx = ox + pad + left, by = oy + pad + asc;
    if (stroke > 0) { ctx.lineJoin = 'round'; ctx.miterLimit = 2; ctx.lineWidth = stroke * 2; ctx.strokeStyle = '#fff'; ctx.strokeText(ch, bx, by); }
    ctx.fillStyle = '#fff'; ctx.fillText(ch, bx, by);
    ctx.restore();
  };
  if (r.kind === 'canvas2d') { draw(pg.tex.ctx, p.x, p.y); pg.tex._white = null; }
  else { const ctx = scratch(cw, chh); draw(ctx, 0, 0); r.texUpload(pg.tex, Art._scratch, p.x, p.y); }
  Text.glyphs.set(key, g);
  return g;
}

/** 把字串切成「斷行單位」：中文一字一個、英文一個單字一個、空白獨立 */
function tokens(str) {
  const out = []; let cur = '';
  for (const ch of str) {
    if (ch === '\n') { if (cur) out.push(cur); cur = ''; out.push('\n'); continue; }
    if (ch === ' ' || ch === '\t') { if (cur) out.push(cur); cur = ''; out.push(' '); continue; }
    if (isWide(ch) || EMOJI.test(ch)) { if (cur) out.push(cur); cur = ''; out.push(ch); continue; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
/** 量寬度（邏輯 px） */
Text.measure = (str, st = {}) => {
  const size = st.size || 16, ls = st.letterSpacing || 0;
  const key = (st.font || '') + '|' + (st.weight || 400) + '|' + (st.italic ? 1 : 0) + '|' + size + '|' + ls + '|' + str;
  let w = Text._measure.get(key);
  if (w !== undefined) return w;
  const mc = textCtx(); mc.font = fontSpec(st, 64);
  w = 0; for (const ch of str) w += mc.measureText(ch).width * size / 64 + ls;
  if (str.length) w -= ls;
  if (Text._measure.size > 4000) Text._measure.clear();
  Text._measure.set(key, w);
  return w;
};
/** 斷行：回傳每一行的字串 */
Text.wrap = (str, st = {}) => {
  str = String(str);
  const maxW = st.maxWidth || 0;
  if (!maxW) return str.split('\n');
  const lines = []; let line = '', lw = 0;
  const sp = Text.measure(' ', st);
  const toks = tokens(str);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t === '\n') { lines.push(line); line = ''; lw = 0; continue; }
    const tw = t === ' ' ? sp : Text.measure(t, st);
    if (line && lw + tw > maxW && t !== ' ') {
      if (NO_START.has(t[0]) && t.length === 1) { line += t; lw += tw; continue; } // 標點掛在行尾
      // 行尾是左括號：把它一起帶到下一行
      let carry = '';
      while (line && NO_END.has(line[line.length - 1])) { carry = line[line.length - 1] + carry; line = line.slice(0, -1); }
      lines.push(line.replace(/\s+$/, '')); line = carry + t; lw = Text.measure(line, st);
      continue;
    }
    if (!line && t === ' ') continue;
    line += t; lw += tw;
  }
  lines.push(line.replace(/\s+$/, ''));
  return lines;
};

/**
 * 把字畫出來（由 g.text 呼叫）。m：目前矩陣 [a,b,c,d,e,f]（邏輯座標 → 畫布像素）
 * 回傳 {w, h}（邏輯大小）
 */
Text.draw = (r, m, str, x, y, st, alphaMul) => {
  if (r.kind === 'canvas2d') return drawNative(r, m, str, x, y, st, alphaMul);
  const size = st.size || 16, lh = (st.lineHeight || 1.25) * size, ls = st.letterSpacing || 0;
  const lines = Text.wrap(str, st);
  const msc = Math.hypot(m[0], m[1]);
  const R = rasterSize(size * msc * (st.sharp || 1)), k = size / R;
  const align = st.align || 'left', base = st.baseline || 'top';
  const totalH = lines.length * lh;
  let y0 = y;
  if (base === 'middle') y0 = y - totalH / 2; else if (base === 'bottom') y0 = y - totalH; else if (base === 'alphabetic') y0 = y - size * 0.95;
  const asc = size * 0.95 + (lh - size * 1.23) / 2; // 第一行基線離頂端的距離
  let maxW = 0;
  const widths = lines.map((l) => { const w = Text.measure(l, st); if (w > maxW) maxW = w; return w; });
  const color = toColor(st.color || '#fff'), a = alphaMul;
  const passes = [];
  if (st.shadow) { const s = st.shadow === true ? {} : st.shadow; passes.push({ stroke: st.outline || 0, color: toColor(s.color || 'rgba(0,0,0,.55)'), dx: s.x != null ? s.x : size * 0.06, dy: s.y != null ? s.y : size * 0.08 }); }
  if (st.outline) passes.push({ stroke: st.outline, color: toColor(st.outlineColor || '#000'), dx: 0, dy: 0 });
  passes.push({ stroke: 0, color, dx: 0, dy: 0, fill: true });
  const [ma, mb, mc, md, me, mf] = m;
  for (const ps of passes) {
    const strokeR = ps.stroke / k;
    const col = Color.alpha(ps.color, cA(ps.color) * a), add = st.add || 0;
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li]; let px = x + ps.dx;
      if (align === 'center') px -= widths[li] / 2; else if (align === 'right') px -= widths[li];
      const by = y0 + li * lh + asc + ps.dy;
      for (const ch of line) {
        const g = glyph(ch, st, R, Math.round(strokeR));
        if (!g.empty && g.page) {
          const gx = px + g.ox * k, gy = by + g.oy * k, gw = g.sw * k, gh = g.sh * k;
          // 單位正方形 → 字的格子
          const a1 = ma * gw, b1 = mb * gw, c1 = mc * gh, d1 = md * gh, e1 = ma * gx + mc * gy + me, f1 = mb * gx + md * gy + mf;
          const tex = g.page.tex, cc = g.color && ps.fill ? Color.alpha(WHITE, cA(col)) : col;
          r.quad(tex, a1, b1, c1, d1, e1, f1, g.sx / tex.w, g.sy / tex.h, (g.sx + g.sw) / tex.w, (g.sy + g.sh) / tex.h, cc, MODE.sprite, add, 0);
        }
        px += g.adv * k + ls;
      }
    }
  }
  return { w: maxW, h: totalH, lines: lines.length };
};

/** Canvas2D 模式：直接用瀏覽器畫字（不經過字型圖集，才能上色、描邊） */
function drawNative(r, m, str, x, y, st, alphaMul) {
  const ctx = r.cur, size = st.size || 16, lh = (st.lineHeight || 1.25) * size, ls = st.letterSpacing || 0;
  const lines = Text.wrap(str, st), totalH = lines.length * lh, base = st.baseline || 'top', align = st.align || 'left';
  let y0 = y; if (base === 'middle') y0 = y - totalH / 2; else if (base === 'bottom') y0 = y - totalH; else if (base === 'alphabetic') y0 = y - size * 0.95;
  const asc = size * 0.95 + (lh - size * 1.23) / 2;
  ctx.save(); ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ctx.font = fontSpec(st, size); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.globalCompositeOperation = st.add ? 'lighter' : 'source-over'; ctx.lineJoin = 'round';
  if ('letterSpacing' in ctx && ls) ctx.letterSpacing = ls + 'px';
  let maxW = 0;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li], w = Text.measure(line, st); maxW = Math.max(maxW, w);
    let px = x; if (align === 'center') px -= w / 2; else if (align === 'right') px -= w;
    const by = y0 + li * lh + asc;
    if (st.shadow) { const sh = st.shadow === true ? {} : st.shadow, sc = toColor(sh.color || 'rgba(0,0,0,.55)'); ctx.globalAlpha = cA(sc) * alphaMul; ctx.fillStyle = ctx.strokeStyle = Color.css(sc | 0xff000000); const dx = sh.x != null ? sh.x : size * 0.06, dy = sh.y != null ? sh.y : size * 0.08; if (st.outline) { ctx.lineWidth = st.outline * 2; ctx.strokeText(line, px + dx, by + dy); } ctx.fillText(line, px + dx, by + dy); }
    if (st.outline) { const oc = toColor(st.outlineColor || '#000'); ctx.globalAlpha = cA(oc) * alphaMul; ctx.strokeStyle = Color.css(oc | 0xff000000); ctx.lineWidth = st.outline * 2; ctx.strokeText(line, px, by); }
    const fc = toColor(st.color || '#fff'); ctx.globalAlpha = cA(fc) * alphaMul; ctx.fillStyle = Color.css(fc | 0xff000000); ctx.fillText(line, px, by);
  }
  ctx.restore();
  return { w: maxW, h: totalH, lines: lines.length };
}
/** 等字型載好（嵌入字型、網路字型）再畫字，不然會先用到替代字型 */
Text.ready = async (families = [], timeout = 2500) => {
  if (!HAS_DOM || !document.fonts) return;
  const loads = families.map((f) => document.fonts.load(`700 32px "${f}"`, '測試字ABC').catch(() => null));
  await Promise.race([Promise.all(loads).then(() => document.fonts.ready), new Promise((r) => setTimeout(r, timeout))]);
};
if (HAS_DOM && document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { if (Gfx.r) Text.reset(); Text._measure.clear(); });

/* ---- 11_draw.js ---- */
/* ==========================================================================
   11 畫圖 API（場景的 render(g) 拿到的 g）
   座標空間：
     g.world()   世界座標（跟著相機：位移、縮放、旋轉、震動）← render 一開始就是這個
     g.screen()  螢幕座標（CSS px，左上角 0,0），不跟相機
     g.hud()     場景畫完：做後製（泛光、扭曲…），之後畫的 HUD 不受震動與後製影響；自動切到 screen
   變形跟 Canvas2D 一樣：g.save() / g.translate() / g.rotate() / g.scale() / g.restore() / g.alpha(a)
   常用：
     g.sprite('hero', x, y, { r: 角度, s: 縮放, sx, sy, a: 透明度, color: 上色, add: 發光 0～1, flash: 閃白 0～1, ax, ay })
     g.spr(frame, x, y, r, sx, sy, a, color, add, flash)    ← 熱迴圈用，不產生物件
     g.rect(x, y, w, h, color, { a, add, r, ax, ay })
     g.circle(x, y, r, color, { a, add })    g.ring(x, y, r, 粗細, color)    g.glow(x, y, r, color, { a, core })
     g.line(x1, y1, x2, y2, 粗細, color, { a, add, cap: 'round' })
     g.poly([x0,y0, x1,y1, …], color)         g.trail(點陣列, 頭寬, 尾寬, 頭色, 尾色, { add })
     g.text('字', x, y, { size, color, weight, outline, outlineColor, shadow, align, baseline, maxWidth })
     g.bar(x, y, w, h, 比例, { bg, fg, back })  血條
     g.into('decals', () => { …畫進畫布貼圖… })
   ========================================================================== */
const M_ID = [1, 0, 0, 1, 0, 0];
class Graphics {
  constructor() {
    this.m = new Float64Array(6); this.m.set(M_ID);
    this.stack = []; this.al = 1; this.space = 'world'; this.blendName = 'normal';
    this._opt = {};
  }
  get r() { return Gfx.r; }
  /* ---- 座標空間 ---- */
  _base(space) {
    const res = Screen.res, m = this.m;
    if (space === 'world') { const v = Cam.mat; m[0] = v[0] * res; m[1] = v[1] * res; m[2] = v[2] * res; m[3] = v[3] * res; m[4] = v[4] * res; m[5] = v[5] * res; }
    else { m[0] = res; m[1] = 0; m[2] = 0; m[3] = res; m[4] = 0; m[5] = 0; }
    this.space = space; this.stack.length = 0; this.al = 1;
  }
  world() { this._base('world'); return this; }
  screen() { this._base('screen'); return this; }
  hud() { if (this._hudDone) { this._base('screen'); return this; } Fx._drawAuto(this); this.r.hud(); this._base('screen'); this._hudDone = true; return this; }
  /* ---- 變形 ---- */
  save() { this.stack.push([this.m[0], this.m[1], this.m[2], this.m[3], this.m[4], this.m[5], this.al, this.blendName]); return this; }
  restore() { const s = this.stack.pop(); if (s) { this.m.set(s.slice(0, 6)); this.al = s[6]; if (s[7] !== this.blendName) this.blend(s[7]); } return this; }
  translate(x, y) { const m = this.m; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; return this; }
  scale(sx, sy = sx) { const m = this.m; m[0] *= sx; m[1] *= sx; m[2] *= sy; m[3] *= sy; return this; }
  rotate(a) { if (!a) return this; const m = this.m, c = Math.cos(a), s = Math.sin(a), a0 = m[0], b0 = m[1], c0 = m[2], d0 = m[3]; m[0] = a0 * c + c0 * s; m[1] = b0 * c + d0 * s; m[2] = c0 * c - a0 * s; m[3] = d0 * c - b0 * s; return this; }
  transform(a, b, c, d, e, f) { const m = this.m, a0 = m[0], b0 = m[1], c0 = m[2], d0 = m[3]; m[0] = a0 * a + c0 * b; m[1] = b0 * a + d0 * b; m[2] = a0 * c + c0 * d; m[3] = b0 * c + d0 * d; m[4] += a0 * e + c0 * f; m[5] += b0 * e + d0 * f; return this; }
  /** 乘上透明度（save/restore 會記住） */
  alpha(a) { this.al *= a; return this; }
  /** 混合模式：'normal' | 'add' | 'multiply' | 'screen' | 'erase' */
  blend(name = 'normal') { this.blendName = name; this.r.setBlend(name); return this; }
  /* ---- 內部：把單位正方形經過 L 再經過目前矩陣送出去 ---- */
  _emit(t, la, lb, lc, ld, le, lf, u0, v0, u1, v1, color, mode, add, param) {
    const m = this.m;
    this.r.quad(t, m[0] * la + m[2] * lb, m[1] * la + m[3] * lb, m[0] * lc + m[2] * ld, m[1] * lc + m[3] * ld, m[0] * le + m[2] * lf + m[4], m[1] * le + m[3] * lf + m[5], u0, v0, u1, v1, color, mode, add > 1 ? 1 : add < 0 ? 0 : add, param > 1 ? 1 : param < 0 ? 0 : param);
  }
  _col(color, a) { const c = color == null ? WHITE : typeof color === 'number' ? color : toColor(color); const al = cA(c) * a * this.al; return al >= 0.999 ? (c | 0xff000000) >>> 0 : (((Math.round(clamp01(al) * 255) << 24) | (c & 0xffffff)) >>> 0); }
  /* ---- 貼圖 ---- */
  spr(f, x, y, r = 0, sx = 1, sy = sx, a = 1, color, add = 0, flash = 0, ax, ay) {
    if (typeof f === 'string') f = Art.get(f);
    if (!f.tex) return this;
    const W = f.w * sx, H = f.h * sy, axx = ax == null ? f.ax : ax, ayy = ay == null ? f.ay : ay;
    let la, lb, lc, ld;
    if (r) { const c = Math.cos(r), s = Math.sin(r); la = c * W; lb = s * W; lc = -s * H; ld = c * H; } else { la = W; lb = 0; lc = 0; ld = H; }
    this._emit(f.tex, la, lb, lc, ld, x - axx * la - ayy * lc, y - axx * lb - ayy * ld, f.u0, f.v0, f.u1, f.v1, this._col(color, a), MODE.sprite, add, flash);
    return this;
  }
  sprite(f, x, y, o) {
    if (!o) return this.spr(f, x, y);
    const s = o.s != null ? o.s : 1;
    let sx = o.sx != null ? o.sx * s : s, sy = o.sy != null ? o.sy * s : s;
    if (o.flipX) sx = -sx; if (o.flipY) sy = -sy;
    if (o.silhouette) { // 純色剪影（上色受擊、陰影）
      if (typeof f === 'string') f = Art.get(f); if (!f.tex) return this;
      const W = f.w * sx, H = f.h * sy, r = o.r || 0, c = Math.cos(r), sn = Math.sin(r), la = c * W, lb = sn * W, lc = -sn * H, ld = c * H, ax = o.ax == null ? f.ax : o.ax, ay = o.ay == null ? f.ay : o.ay;
      this._emit(f.tex, la, lb, lc, ld, x - ax * la - ay * lc, y - ax * lb - ay * ld, f.u0, f.v0, f.u1, f.v1, this._col(o.color || '#000', o.a == null ? 1 : o.a), MODE.silhouette, o.add || 0, 0);
      return this;
    }
    return this.spr(f, x, y, o.r || 0, sx, sy, o.a == null ? 1 : o.a, o.color, o.add || 0, o.flash || 0, o.ax, o.ay);
  }
  /** 把一張圖鋪滿一個矩形（背景、地板）；u/v 可以平移（捲動） */
  tile(f, x, y, w, h, o = {}) {
    if (typeof f === 'string') f = Art.get(f); if (!f.tex) return this;
    const tw = f.w * (o.s || 1), th = f.h * (o.s || 1), ox = ((o.ox || 0) % tw + tw) % tw, oy = ((o.oy || 0) % th + th) % th;
    const col = this._col(o.color, o.a == null ? 1 : o.a);
    for (let ty = y - oy; ty < y + h; ty += th) for (let tx = x - ox; tx < x + w; tx += tw) {
      const x0 = Math.max(tx, x), y0 = Math.max(ty, y), x1 = Math.min(tx + tw, x + w), y1 = Math.min(ty + th, y + h);
      if (x1 <= x0 || y1 <= y0) continue;
      const fu0 = (x0 - tx) / tw, fv0 = (y0 - ty) / th, fu1 = (x1 - tx) / tw, fv1 = (y1 - ty) / th, du = f.u1 - f.u0, dv = f.v1 - f.v0;
      this._emit(f.tex, x1 - x0, 0, 0, y1 - y0, x0, y0, f.u0 + du * fu0, f.v0 + dv * fv0, f.u0 + du * fu1, f.v0 + dv * fv1, col, MODE.sprite, o.add || 0, 0);
    }
    return this;
  }
  /* ---- 形狀 ---- */
  rect(x, y, w, h, color, o) {
    const a = o && o.a != null ? o.a : 1, add = (o && o.add) || 0, r = (o && o.r) || 0;
    if (r) { const ax = o.ax == null ? 0.5 : o.ax, ay = o.ay == null ? 0.5 : o.ay, c = Math.cos(r), s = Math.sin(r), la = c * w, lb = s * w, lc = -s * h, ld = c * h; this._emit(null, la, lb, lc, ld, x - ax * la - ay * lc, y - ax * lb - ay * ld, 0, 0, 1, 1, this._col(color, a), MODE.solid, add, 0); }
    else this._emit(null, w, 0, 0, h, x, y, 0, 0, 1, 1, this._col(color, a), MODE.solid, add, 0);
    return this;
  }
  /** 整個畫面填色（不管相機） */
  fill(color, a = 1) { this.save(); this._base('screen'); this.rect(0, 0, Screen.w, Screen.h, color, { a }); this.restore(); return this; }
  circle(x, y, r, color, o) { this._emit(null, r * 2, 0, 0, r * 2, x - r, y - r, -1, -1, 1, 1, this._col(color, o && o.a != null ? o.a : 1), MODE.circle, (o && o.add) || 0, 0); return this; }
  /** 橢圓（影子很好用） */
  ellipse(x, y, rx, ry, color, o) { this._emit(null, rx * 2, 0, 0, ry * 2, x - rx, y - ry, -1, -1, 1, 1, this._col(color, o && o.a != null ? o.a : 1), MODE.circle, (o && o.add) || 0, 0); return this; }
  ring(x, y, r, thick, color, o) { this._emit(null, r * 2, 0, 0, r * 2, x - r, y - r, -1, -1, 1, 1, this._col(color, o && o.a != null ? o.a : 1), MODE.ring, (o && o.add) || 0, clamp01(thick / r)); return this; }
  /** 柔光：預設加亮（add=1）；core 0～1 讓中心更亮 */
  glow(x, y, r, color, o) { this._emit(null, r * 2, 0, 0, r * 2, x - r, y - r, -1, -1, 1, 1, this._col(color, o && o.a != null ? o.a : 1), MODE.glow, o && o.add != null ? o.add : 1, (o && o.core) || 0); return this; }
  line(x1, y1, x2, y2, w, color, o) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy); if (len < 1e-6) return this;
    const nx = -dy / len, ny = dx / len, col = this._col(color, o && o.a != null ? o.a : 1), add = (o && o.add) || 0;
    this._emit(null, dx, dy, nx * w, ny * w, x1 - nx * w / 2, y1 - ny * w / 2, -1, -1, 1, 1, col, MODE.line, add, 0);
    if (o && o.cap === 'round') { const r = w / 2; this._emit(null, w, 0, 0, w, x1 - r, y1 - r, -1, -1, 1, 1, col, MODE.circle, add, 0); this._emit(null, w, 0, 0, w, x2 - r, y2 - r, -1, -1, 1, 1, col, MODE.circle, add, 0); }
    return this;
  }
  /** 凸多邊形：[x0,y0, x1,y1, …] */
  poly(pts, color, o) {
    const n = pts.length / 2; if (n < 3) return this;
    const m = this.m, col = this._col(color, o && o.a != null ? o.a : 1), add = (o && o.add) || 0;
    const X = (i) => m[0] * pts[i * 2] + m[2] * pts[i * 2 + 1] + m[4], Y = (i) => m[1] * pts[i * 2] + m[3] * pts[i * 2 + 1] + m[5];
    const x0 = X(0), y0 = Y(0);
    for (let i = 1; i < n - 1; i++) this.r.tri(x0, y0, X(i), Y(i), X(i + 1), Y(i + 1), col, add);
    return this;
  }
  /** 拖尾／光帶：pts 是 [{x,y}…]（頭在前面），寬度與顏色從頭漸變到尾 */
  trail(pts, w0, w1, c0, c1, o) {
    const n = pts.length; if (n < 2) return this;
    const m = this.m, add = o && o.add != null ? o.add : 0, a = o && o.a != null ? o.a : 1;
    const A = this._col(c0, a), B = this._col(c1 == null ? Color.alpha(c0, 0) : c1, a);
    let px = 0, py = 0, pl = 0, pr = 0, plx = 0, ply = 0, prx = 0, pry = 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[Math.min(n - 1, i + 1)], o2 = pts[Math.max(0, i - 1)];
      let dx = q.x - o2.x, dy = q.y - o2.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const t = i / (n - 1), w = lerp(w0, w1, t) / 2, nx = -dy * w, ny = dx * w;
      const lx = p.x + nx, ly = p.y + ny, rx = p.x - nx, ry = p.y - ny;
      const LX = m[0] * lx + m[2] * ly + m[4], LY = m[1] * lx + m[3] * ly + m[5], RX = m[0] * rx + m[2] * ry + m[4], RY = m[1] * rx + m[3] * ry + m[5];
      if (i > 0) { const ca = Color.mix(A, B, (i - 1) / (n - 1)), cb = Color.mix(A, B, t); this.r.quad4(null, plx, ply, LX, LY, RX, RY, prx, pry, -1, -1, 1, 1, ca, cb, MODE.line, add, 0); }
      plx = LX; ply = LY; prx = RX; pry = RY; px = p.x; py = p.y; pl = w; pr = w;
    }
    return this;
  }
  /** 血條：frac 0～1；back 是「剛被扣掉、慢慢追上」的那一截 */
  bar(x, y, w, h, frac, o = {}) {
    this.rect(x, y, w, h, o.bg || 'rgba(0,0,0,.55)');
    if (o.back != null && o.back > frac) this.rect(x, y, w * clamp01(o.back), h, o.backColor || '#fff', { a: 0.85 });
    this.rect(x, y, w * clamp01(frac), h, o.fg || '#e33');
    return this;
  }
  /* ---- 文字 ---- */
  text(str, x, y, st) {
    if (str == null || str === '') return { w: 0, h: 0 };
    st = st || this._opt;
    return Text.draw(this.r, this.m, String(str), x, y, st, (st.a == null ? 1 : st.a) * this.al);
  }
  measure(str, st) { return Text.measure(String(str), st || {}); }
  /* ---- 畫進畫布貼圖 ---- */
  into(target, fn, clear) {
    const f = typeof target === 'string' ? Art.get(target) : target; if (!f.rt) { warnOnce('into', 'g.into 只能畫進 PZ.art.target() 建的貼圖'); return this; }
    const r = this.r; this.save();
    r.beginTarget(f.tex, clear);
    const m = this.m; m[0] = f.res; m[1] = 0; m[2] = 0; m[3] = f.res; m[4] = 0; m[5] = 0; this.al = 1;
    try { fn(this); } catch (e) { reportError(e, 'g.into'); }
    r.flush(); r.endTarget();
    this.restore();
    return this;
  }
  /** 這個點在不在畫面裡（世界座標、加邊界），畫之前先問可以省很多 */
  visible(x, y, margin = 64) { return Cam.inView(x, y, margin); }
}
const G = PZ.g = new Graphics();

/* ---- 12_camera.js ---- */
/* ==========================================================================
   12 相機
     PZ.cam.follow(player, { lerp: 8, lead: 0.25 })   跟著目標（lead＝往移動方向多看一點）
     PZ.cam.fit(420)        讓畫面短邊至少看得到 420 個世界單位（手機、平板、電腦看到的範圍一致）
     PZ.cam.shake(0.4)      震動（trauma 模型：疊加、會自己消退，強度是平方，小震很輕、大震很猛）
     PZ.cam.kick(角度, 12)  往某方向頓一下（後座力、被打）
     PZ.cam.punch(0.06)     鏡頭瞬間推近再彈回
     PZ.cam.controls({ pan: true, zoom: [0.5, 3], rotate: true })   戰略／模擬類：拖曳平移、雙指縮放旋轉、滾輪縮放
     PZ.cam.toWorldX/Y(螢幕x, 螢幕y)、toScreenX/Y(世界x, 世界y)、inView(x, y, 邊界)
   ========================================================================== */
const Cam = PZ.cam = {
  x: 0, y: 0, zoom: 1, rot: 0, fitSize: 0, userZoom: 1,
  target: null, lerpK: 8, lead: 0, dead: 0, offX: 0, offY: 0, bounds: null,
  trauma: 0, decay: 1.15, maxX: 16, maxY: 12, maxR: 0.03, freq: 22,
  kx: 0, ky: 0, kvx: 0, kvy: 0, pz: 0, pv: 0,
  sx: 0, sy: 0, sr: 0, ez: 1, er: 0,
  mat: new Float64Array([1, 0, 0, 1, 0, 0]), inv: new Float64Array([1, 0, 0, 1, 0, 0]),
  view: { x: 0, y: 0, w: 0, h: 0 },
  ctl: null, external: false,
};
Cam.follow = (t, o = {}) => { Cam.target = t; if (o.lerp != null) Cam.lerpK = o.lerp; if (o.lead != null) Cam.lead = o.lead; if (o.dead != null) Cam.dead = o.dead; if (o.snap !== false && t) Cam.snap(); return Cam; };
Cam.snap = () => { if (Cam.target) { Cam.x = Cam.target.x + Cam.offX; Cam.y = Cam.target.y + Cam.offY; } Cam.clampBounds(); Cam.compute(); return Cam; };
Cam.fit = (size) => { Cam.fitSize = size; Cam.compute(); return Cam; };
Cam.baseZoom = () => (Cam.fitSize > 0 ? Math.max(0.05, Math.min(Screen.w, Screen.h) / Cam.fitSize) : 1);
Cam.shake = (amount) => { Cam.trauma = Math.min(1, Cam.trauma + amount); return Cam; };
Cam.kick = (angle, px) => { const s = Settings.get('shake'); Cam.kvx += Math.cos(angle) * px * 22 * s; Cam.kvy += Math.sin(angle) * px * 22 * s; return Cam; };
Cam.punch = (amount) => { Cam.pv += amount * 26 * Settings.get('shake'); return Cam; };
Cam.reset = () => { Object.assign(Cam, { x: 0, y: 0, zoom: 1, rot: 0, userZoom: 1, target: null, bounds: null, trauma: 0, external: false, kx: 0, ky: 0, kvx: 0, kvy: 0, pz: 0, pv: 0, offX: 0, offY: 0, ctl: null }); Cam.compute(); };

Cam.clampBounds = () => {
  const b = Cam.bounds; if (!b) return;
  const z = Cam.ez || 1, hw = Screen.w / z / 2, hh = Screen.h / z / 2;
  if (b.w <= hw * 2) Cam.x = b.x + b.w / 2; else Cam.x = clamp(Cam.x, b.x + hw, b.x + b.w - hw);
  if (b.h <= hh * 2) Cam.y = b.y + b.h / 2; else Cam.y = clamp(Cam.y, b.y + hh, b.y + b.h - hh);
};
/** 算出世界 → 螢幕（CSS px）的矩陣 */
Cam.compute = () => {
  // external：相機由遊戲自己控制（舊遊戲遷移），震動與後座力的位移不套進矩陣，遊戲自己讀 Cam.offsetX/Y
  const ext = Cam.external;
  const z = Cam.baseZoom() * Cam.zoom * Cam.userZoom * (ext ? 1 : 1 + Cam.pz);
  const r = Cam.rot + (ext ? 0 : Cam.sr);
  Cam.ez = z; Cam.er = r;
  const c = Math.cos(-r) * z, s = Math.sin(-r) * z;
  const cx = Screen.w / 2 + (ext ? 0 : Cam.sx + Cam.kx), cy = Screen.h / 2 + (ext ? 0 : Cam.sy + Cam.ky);
  const m = Cam.mat; m[0] = c; m[1] = s; m[2] = -s; m[3] = c; m[4] = cx - (c * Cam.x - s * Cam.y); m[5] = cy - (s * Cam.x + c * Cam.y);
  const det = m[0] * m[3] - m[1] * m[2] || 1, iv = Cam.inv;
  iv[0] = m[3] / det; iv[1] = -m[1] / det; iv[2] = -m[2] / det; iv[3] = m[0] / det; iv[4] = (m[2] * m[5] - m[3] * m[4]) / det; iv[5] = (m[1] * m[4] - m[0] * m[5]) / det;
  // 看得到的世界範圍（旋轉時取外接框）
  const hw = Screen.w / z / 2, hh = Screen.h / z / 2, ac = Math.abs(Math.cos(r)), as = Math.abs(Math.sin(r));
  const ew = hw * ac + hh * as, eh = hw * as + hh * ac;
  const v = Cam.view; v.x = Cam.x - ew; v.y = Cam.y - eh; v.w = ew * 2; v.h = eh * 2;
};
/** 目前震動＋後座力造成的畫面位移（CSS px）；external 模式的遊戲自己加到鏡頭上 */
Object.defineProperty(Cam, 'offsetX', { get: () => Cam.sx + Cam.kx });
Object.defineProperty(Cam, 'offsetY', { get: () => Cam.sy + Cam.ky });
Cam.toWorldX = (sx, sy) => Cam.inv[0] * sx + Cam.inv[2] * sy + Cam.inv[4];
Cam.toWorldY = (sx, sy) => Cam.inv[1] * sx + Cam.inv[3] * sy + Cam.inv[5];
Cam.toScreenX = (wx, wy) => Cam.mat[0] * wx + Cam.mat[2] * wy + Cam.mat[4];
Cam.toScreenY = (wx, wy) => Cam.mat[1] * wx + Cam.mat[3] * wy + Cam.mat[5];
Cam.inView = (x, y, m = 0) => { const v = Cam.view; return x >= v.x - m && x <= v.x + v.w + m && y >= v.y - m && y <= v.y + v.h + m; };

/** 戰略／模擬類的鏡頭操作 */
Cam.controls = (o = {}) => {
  if (o === false) { Cam.ctl = null; return Cam; }
  Cam.ctl = Object.assign({ pan: true, zoom: [0.4, 3], rotate: false, inertia: true, vx: 0, vy: 0, drag: true, keys: true }, o);
  return Cam;
};
function camControls(dt) {
  const c = Cam.ctl; if (!c) return;
  const g = Input.gesture, z = Cam.ez || 1;
  const panning = c.pan && (Input.pointers.size >= 2 || (c.drag && Input.pointers.size === 1));
  if (panning && (g.panX || g.panY)) {
    const cr = Math.cos(Cam.er), sr = Math.sin(Cam.er), wx = (g.panX * cr - g.panY * sr) / z, wy = (g.panX * sr + g.panY * cr) / z;
    Cam.x -= wx; Cam.y -= wy;
    if (dt > 0) { c.vx = lerp(c.vx, -wx / dt, 0.5); c.vy = lerp(c.vy, -wy / dt, 0.5); }
  } else if (c.inertia && !Input.pointers.size) {
    Cam.x += c.vx * dt; Cam.y += c.vy * dt; const k = Math.exp(-5 * dt); c.vx *= k; c.vy *= k;
  } else { c.vx = c.vy = 0; }
  if (c.keys && c.pan) {
    const m = Input.move; if (m.mag > 0 && !Cam.target) { const sp = 600 / z * dt; Cam.x += (m.x * Math.cos(Cam.er) - m.y * Math.sin(Cam.er)) * sp; Cam.y += (m.x * Math.sin(Cam.er) + m.y * Math.cos(Cam.er)) * sp; }
  }
  const zoomBy = g.zoom, rot = c.rotate ? g.rotate : 0;
  if (zoomBy !== 1 || rot) {
    // 讓手指（游標）下面那一點保持不動
    const cx = g.cx || Screen.w / 2, cy = g.cy || Screen.h / 2, wx = Cam.toWorldX(cx, cy), wy = Cam.toWorldY(cx, cy);
    if (zoomBy !== 1) { const zr = c.zoom || [0.4, 3]; Cam.userZoom = clamp(Cam.userZoom * zoomBy, zr[0], zr[1]); }
    if (rot) Cam.rot += rot;
    Cam.compute();
    const nx = Cam.toWorldX(cx, cy), ny = Cam.toWorldY(cx, cy); Cam.x += wx - nx; Cam.y += wy - ny;
  }
}

addSystem({
  name: 'camera', order: 50,
  update(dt) {
    const t = Cam.target;
    if (t) {
      let tx = t.x + Cam.offX, ty = t.y + Cam.offY;
      if (Cam.lead && (t.vx || t.vy)) { tx += (t.vx || 0) * Cam.lead; ty += (t.vy || 0) * Cam.lead; }
      if (Cam.dead > 0) { const dx = tx - Cam.x, dy = ty - Cam.y, d = Math.hypot(dx, dy); if (d > Cam.dead) { const k = (d - Cam.dead) / d; tx = Cam.x + dx * k; ty = Cam.y + dy * k; } else { tx = Cam.x; ty = Cam.y; } }
      Cam.x = damp(Cam.x, tx, Cam.lerpK, dt); Cam.y = damp(Cam.y, ty, Cam.lerpK, dt);
    }
    camControls(dt);
    Cam.clampBounds();
  },
  frame(rdt) {
    // 震動、後座力、推近用真實時間（打擊停頓時還在晃，才有「定格」的力道）
    const s = Settings.get('shake');
    Cam.trauma = Math.max(0, Cam.trauma - Cam.decay * rdt);
    const sh = Cam.trauma * Cam.trauma * s, t = Time.real * Cam.freq;
    Cam.sx = Cam.maxX * sh * noise1(t); Cam.sy = Cam.maxY * sh * noise1(t + 37.1); Cam.sr = Cam.maxR * sh * noise1(t + 71.9);
    // 彈簧：切成小步算（低幀率時一大步會發散）
    const k = 260, d = 22, n = Math.max(1, Math.ceil(rdt / 0.006)), h = rdt / n;
    for (let i = 0; i < n; i++) {
      Cam.kvx += (-k * Cam.kx - d * Cam.kvx) * h; Cam.kvy += (-k * Cam.ky - d * Cam.kvy) * h; Cam.kx += Cam.kvx * h; Cam.ky += Cam.kvy * h;
      Cam.pv += (-200 * Cam.pz - 18 * Cam.pv) * h; Cam.pz += Cam.pv * h;
    }
    Cam.pz = clamp(Cam.pz, -0.5, 1); Cam.kx = clamp(Cam.kx, -200, 200); Cam.ky = clamp(Cam.ky, -200, 200);
    if (Math.abs(Cam.kx) < 0.01 && Math.abs(Cam.kvx) < 0.01) Cam.kx = Cam.kvx = 0;
    if (Math.abs(Cam.ky) < 0.01 && Math.abs(Cam.kvy) < 0.01) Cam.ky = Cam.kvy = 0;
  },
  render() { Cam.compute(); },
});

/* ---- 13_tween.js ---- */
/* ==========================================================================
   13 補間與彈簧
     PZ.tween(obj, { x: 100, alpha: 0 }, 0.4, 'outBack').then(() => …)
     o: { delay, yoyo, repeat（-1＝無限）, real（跟真實時間，暫停中也會動）, from: {…}, onUpdate, onDone }
     await PZ.tween(…)        // 可以直接 await
     PZ.tweens.killOf(obj)    // 停掉某物件的所有補間
     const sp = PZ.spring(1, { k: 320, d: 16 }); sp.target = 1.3; …每格讀 sp.value（UI 彈跳、縮放回彈）
   ========================================================================== */
class Tween {
  constructor(target, to, dur, ease, o) {
    this.target = target; this.to = to; this.dur = Math.max(0.0001, dur); this.ease = easeOf(ease);
    this.delay = o.delay || 0; this.yoyo = !!o.yoyo; this.repeat = o.repeat || 0; this.real = !!o.real;
    this.onUpdate = o.onUpdate || null; this.onDone = o.onDone || null; this.from = o.from || null;
    this.t = 0; this.started = false; this.dead = false; this.dir = 1; this.props = null; this._p = null; this._res = null;
  }
  _start() {
    this.started = true; this.props = [];
    for (const k in this.to) {
      const from = this.from && this.from[k] != null ? this.from[k] : this.target[k];
      if (this.from && this.from[k] != null) this.target[k] = from;
      this.props.push(k, +from || 0, +this.to[k]);
    }
  }
  step(dt) {
    if (this.dead) return true;
    if (this.delay > 0) { this.delay -= dt; if (this.delay > 0) return false; dt = -this.delay; this.delay = 0; }
    if (!this.started) this._start();
    this.t += dt;
    let k = clamp01(this.t / this.dur); const e = this.ease(this.dir > 0 ? k : 1 - k);
    const P = this.props, T = this.target;
    for (let i = 0; i < P.length; i += 3) T[P[i]] = P[i + 1] + (P[i + 2] - P[i + 1]) * e;
    if (this.onUpdate) safeCall(this.onUpdate, null, T, e);
    if (k >= 1) {
      if (this.yoyo && this.dir > 0) { this.dir = -1; this.t = 0; return false; }
      if (this.repeat !== 0) { if (this.repeat > 0) this.repeat--; this.t = 0; this.dir = 1; return false; }
      this.finish(); return true;
    }
    return false;
  }
  finish() { if (this.dead) return; this.dead = true; if (this.onDone) safeCall(this.onDone, null, this.target); if (this._res) this._res(this.target); }
  /** 停掉；complete=true 直接跳到終點 */
  kill(complete) { if (this.dead) return; if (complete) { if (!this.started) this._start(); const P = this.props; for (let i = 0; i < P.length; i += 3) this.target[P[i]] = this.yoyo ? P[i + 1] : P[i + 2]; this.finish(); } else { this.dead = true; if (this._res) this._res(this.target); } }
  then(a, b) { if (!this._p) this._p = new Promise((res) => { this._res = res; if (this.dead) res(this.target); }); return this._p.then(a, b); }
}
const Tweens = PZ.tweens = { list: [], real: [] };
PZ.tween = (target, to, dur = 0.3, ease = 'outQuad', o = {}) => { const t = new Tween(target, to, dur, ease, o); (t.real ? Tweens.real : Tweens.list).push(t); return t; };
Tweens.killOf = (target, complete) => { for (const t of Tweens.list) if (t.target === target) t.kill(complete); for (const t of Tweens.real) if (t.target === target) t.kill(complete); };
Tweens.clear = () => { for (const t of Tweens.list) t.dead = true; Tweens.list.length = 0; };
function stepTweens(list, dt) { for (let i = 0; i < list.length; i++) { const t = list[i]; if (t.step(dt)) { list[i] = list[list.length - 1]; list.pop(); i--; } } }

class Spring {
  constructor(v, o = {}) { this.value = v; this.target = v; this.v = 0; this.k = o.k || 300; this.d = o.d || 18; this.real = o.real !== false; this.dead = false; }
  /** 往某方向踢一下（不改目標） */
  kick(vel) { this.v += vel; return this; }
  set(v) { this.value = this.target = v; this.v = 0; return this; }
  step(dt) { const a = -this.k * (this.value - this.target) - this.d * this.v; this.v += a * dt; this.value += this.v * dt; }
  kill() { this.dead = true; }
}
const Springs = [];
PZ.spring = (v, o) => { const s = new Spring(v, o); s.scene = typeof Scenes !== 'undefined' && o && o.keep ? null : (typeof Scenes !== 'undefined' ? Scenes.name : null); Springs.push(s); return s; };
PZ.springs = Springs;

addSystem({
  name: 'tween', order: 20,
  frame(rdt) {
    stepTweens(Tweens.real, rdt);
    for (let i = 0; i < Springs.length; i++) { const s = Springs[i]; if (s.dead) { Springs.splice(i--, 1); continue; } if (s.real) { const n = Math.ceil(rdt / 0.008); for (let k = 0; k < n; k++) s.step(rdt / n); } }
  },
  update(dt) {
    stepTweens(Tweens.list, dt);
    for (const s of Springs) if (!s.real && !s.dead) { const n = Math.ceil(dt / 0.008); for (let k = 0; k < n; k++) s.step(dt / n); }
  },
});

/* ---- 14_particles.js ---- */
/* ==========================================================================
   14 粒子
     PZ.particles.emit('sparks', x, y, { angle: 方向, spread: 0.8, count: 12, scale: 1.2, colors: [...] })
     PZ.particles.define('myDust', { …同下面的格式… })
   格式（全部可省略）：
     count: [8,14]  life: [0.3,0.6]  speed: [80,300]  angle: 0  spread: TAU  drag: 2  grav: 0（正數往下）
     size: [3,6]  end: 0（結束時是開始大小的幾倍）  colors: ['#fff', '#fc6', 'rgba(255,80,0,0)']
     shape: 'glow' | 'circle' | 'ring' | 'square' | 圖名（例如 'pz.spark'、自己畫的圖）
     add: 1（發光，0～1）  stretch: 0（沿速度拉長，火花用 0.02～0.05）  spin: [-4,4]  rot: 'random'|'dir'
     layer: 'over'|'under'  flicker: 0（閃爍）  offset: 0（出生點隨機偏移半徑）  ease: 'outQuad'（大小變化曲線）
     inherit: { vx, vy }（加上發射者速度的比例）
   預設粒子層：'under' 畫在角色下面（血跡、塵土），'over' 畫在上面（火花、爆炸）。
   場景沒自己畫的話，引擎會在 g.hud() 前自動畫 over 層；under 層要在 render 裡呼叫 PZ.particles.draw(g, 'under')。
   ========================================================================== */
const PF = { X: 0, Y: 1, VX: 2, VY: 3, LIFE: 4, MAX: 5, S0: 6, S1: 7, R: 8, VR: 9, DRAG: 10, GRAV: 11, ADD: 12, STR: 13, FLK: 14, SEED: 15 };
const PSTRIDE = 16;
const Particles = PZ.particles = {
  cap: 8000, n: 0,
  f: new Float32Array(8000 * PSTRIDE),
  ramp: new Array(8000), shape: new Uint8Array(8000), frame: new Array(8000), layer: new Uint8Array(8000), ease: new Array(8000),
  presets: {}, _ramps: new Map(), drawn: { 0: false, 1: false },
};
const SHAPE = { glow: 0, circle: 1, ring: 2, square: 3, sprite: 4 };
const rangeOf = (v, r) => (Array.isArray(v) ? r.range(v[0], v[1]) : v);
function rampOf(colors) {
  const key = Array.isArray(colors) ? colors.join('|') : String(colors);
  let r = Particles._ramps.get(key);
  if (!r) { r = Color.ramp(Array.isArray(colors) ? colors : [colors, Color.alpha(colors, 0)], 32); Particles._ramps.set(key, r); }
  return r;
}
Particles.define = (name, spec) => { Particles.presets[name] = spec; return spec; };

/** 發射：preset 可以是名字或格式物件；o 覆蓋 preset 的欄位，另外有 scale（大小與速度倍率）、angle、count */
Particles.emit = (preset, x, y, o) => {
  const p = typeof preset === 'string' ? Particles.presets[preset] : preset;
  if (!p) { warnOnce('pfx:' + preset, '沒有這種粒子：' + preset); return; }
  if (o) { if (o.burst) { for (const b of o.burst) Particles.emit(b, x, y, Object.assign({}, o, { burst: null })); return; } }
  if (p.burst) { for (const b of p.burst) Particles.emit(b, x, y, o); return; }
  const r = Rand, sc = (o && o.scale) || 1, q = Quality.cur.particles * ((o && o.density) || 1);
  let count = Math.round(rangeOf(o && o.count != null ? o.count : p.count != null ? p.count : 10, r) * q);
  if (count <= 0) return;
  const colors = (o && o.colors) || (o && o.color ? [o.color, Color.alpha(o.color, 0)] : null) || p.colors || ['#fff', 'rgba(255,255,255,0)'];
  const ramp = rampOf(colors);
  let shapeName = (o && o.shape) || p.shape || 'glow', shape = SHAPE[shapeName], frame = null;
  if (shape === undefined) { shape = SHAPE.sprite; frame = Art.get(shapeName); }
  const ang = o && o.angle != null ? o.angle : p.angle || 0, spread = o && o.spread != null ? o.spread : p.spread != null ? p.spread : TAU;
  const speed = (o && o.speed) || p.speed || [60, 200], life = (o && o.life) || p.life || [0.3, 0.6], size = (o && o.size) || p.size || [3, 6];
  const end = p.end != null ? p.end : 0, drag = p.drag != null ? p.drag : 2, grav = (p.grav || 0) * sc, add = o && o.add != null ? o.add : p.add != null ? p.add : 1;
  const stretch = p.stretch || 0, spin = p.spin || 0, rotMode = p.rot != null ? p.rot : 'random', flk = p.flicker || 0, off = ((o && o.offset) || p.offset || 0) * sc;
  const layer = ((o && o.layer) || p.layer) === 'under' ? 0 : 1, ease = easeOf(p.ease || 'outQuad');
  const ivx = o && o.vx ? o.vx * (p.inherit || 0.5) : 0, ivy = o && o.vy ? o.vy * (p.inherit || 0.5) : 0;
  const F = Particles.f;
  for (let k = 0; k < count; k++) {
    if (Particles.n >= Particles.cap) break;
    const i = Particles.n++, b = i * PSTRIDE;
    const a = ang + (spread >= TAU - 0.001 ? r.next() * TAU : (r.next() - 0.5) * spread), sp = rangeOf(speed, r) * sc;
    const oa = r.next() * TAU, orr = off * Math.sqrt(r.next());
    F[b] = x + Math.cos(oa) * orr; F[b + 1] = y + Math.sin(oa) * orr;
    F[b + 2] = Math.cos(a) * sp + ivx; F[b + 3] = Math.sin(a) * sp + ivy;
    const lf = rangeOf(life, r); F[b + 4] = lf; F[b + 5] = lf;
    const s0 = rangeOf(size, r) * sc; F[b + 6] = s0; F[b + 7] = s0 * end;
    F[b + 8] = rotMode === 'dir' ? a : typeof rotMode === 'number' ? rotMode : r.next() * TAU; F[b + 9] = rangeOf(spin, r);
    F[b + 10] = drag; F[b + 11] = grav; F[b + 12] = add; F[b + 13] = stretch; F[b + 14] = flk; F[b + 15] = r.next() * 100;
    Particles.ramp[i] = ramp; Particles.shape[i] = shape; Particles.frame[i] = frame; Particles.layer[i] = layer; Particles.ease[i] = ease;
  }
};
Particles.clear = () => { Particles.n = 0; };
function moveParticle(from, to) {
  const F = Particles.f; F.copyWithin(to * PSTRIDE, from * PSTRIDE, from * PSTRIDE + PSTRIDE);
  Particles.ramp[to] = Particles.ramp[from]; Particles.shape[to] = Particles.shape[from]; Particles.frame[to] = Particles.frame[from]; Particles.layer[to] = Particles.layer[from]; Particles.ease[to] = Particles.ease[from];
}
Particles.update = (dt) => {
  const F = Particles.f;
  for (let i = 0; i < Particles.n; i++) {
    const b = i * PSTRIDE;
    F[b + 4] -= dt;
    if (F[b + 4] <= 0) { Particles.n--; if (i !== Particles.n) moveParticle(Particles.n, i); i--; continue; }
    const k = Math.exp(-F[b + 10] * dt);
    F[b + 2] *= k; F[b + 3] = F[b + 3] * k + F[b + 11] * dt;
    F[b] += F[b + 2] * dt; F[b + 1] += F[b + 3] * dt; F[b + 8] += F[b + 9] * dt;
  }
};
/** 畫某一層（'under'｜'over'）。在 world() 空間裡呼叫 */
Particles.draw = (g, layerName = 'over') => {
  const L = layerName === 'under' ? 0 : 1; Particles.drawn[L] = true;
  const F = Particles.f, m = g.m, rr = g.r, al = g.al, v = Cam.view, mg = 40;
  for (let i = 0; i < Particles.n; i++) {
    if (Particles.layer[i] !== L) continue;
    const b = i * PSTRIDE, x = F[b], y = F[b + 1];
    if (x < v.x - mg || x > v.x + v.w + mg || y < v.y - mg || y > v.y + v.h + mg) continue;
    const t = 1 - F[b + 4] / F[b + 5], e = Particles.ease[i](t);
    let s = F[b + 6] + (F[b + 7] - F[b + 6]) * e; if (s <= 0.05) continue;
    const ramp = Particles.ramp[i]; let col = ramp[Math.min(31, (t * 31.999) | 0)];
    let a = cA(col) * al; if (F[b + 14] > 0) a *= 1 - F[b + 14] * (0.5 + 0.5 * Math.sin(F[b + 15] + Time.real * 40));
    if (a <= 0.01) continue;
    col = ((Math.round(clamp01(a) * 255) << 24) | (col & 0xffffff)) >>> 0;
    const shape = Particles.shape[i], add = F[b + 12];
    let w = s * 2, h = s * 2, rot = F[b + 8];
    const st = F[b + 13];
    if (st > 0) { const vx = F[b + 2], vy = F[b + 3], sp = Math.hypot(vx, vy); w = s * 2 + sp * st * 2; rot = Math.atan2(vy, vx); }
    let tex = null, u0 = -1, v0 = -1, u1 = 1, v1 = 1, mode;
    if (shape === SHAPE.sprite) { const f = Particles.frame[i]; if (!f.tex) continue; tex = f.tex; u0 = f.u0; v0 = f.v0; u1 = f.u1; v1 = f.v1; mode = MODE.sprite; if (st <= 0) { w = s * 2 * (f.w / Math.max(f.w, f.h)); h = s * 2 * (f.h / Math.max(f.w, f.h)); } }
    else mode = shape === SHAPE.glow ? MODE.glow : shape === SHAPE.circle ? MODE.circle : shape === SHAPE.ring ? MODE.ring : MODE.solid;
    const c = Math.cos(rot), sn = Math.sin(rot), la = c * w, lb = sn * w, lc = -sn * h, ld = c * h, le = x - 0.5 * la - 0.5 * lc, lf = y - 0.5 * lb - 0.5 * ld;
    rr.quad(tex, m[0] * la + m[2] * lb, m[1] * la + m[3] * lb, m[0] * lc + m[2] * ld, m[1] * lc + m[3] * ld, m[0] * le + m[2] * lf + m[4], m[1] * le + m[3] * lf + m[5], u0, v0, u1, v1, col, mode, add, shape === SHAPE.ring ? 0.18 : 0);
  }
};
addSystem({ name: 'particles', order: 60, update(dt) { Particles.update(dt); } });
PZ.on('quality', () => { Particles.cap = Math.min(8000, Math.round(8000 * Math.max(0.4, Quality.cur.particles))); if (Particles.n > Particles.cap) Particles.n = Particles.cap; });

/* ---------- 內建粒子 ---------- */
const D = Particles.define;
D('sparks', { count: [8, 14], life: [0.15, 0.4], speed: [180, 520], spread: 1.1, drag: 5, size: [1.6, 3], end: 0.2, colors: ['#fff', '#ffe08a', '#ff8a2b', 'rgba(255,60,0,0)'], shape: 'pz.spark', stretch: 0.035, add: 1 });
D('hit', { count: [5, 9], life: [0.08, 0.22], speed: [120, 360], spread: 1.4, drag: 6, size: [2, 4], end: 0, colors: ['#fff', '#fff6c8', 'rgba(255,200,120,0)'], shape: 'pz.spark', stretch: 0.03, add: 1 });
D('flare', { count: 1, life: [0.12, 0.16], speed: 0, size: [22, 28], end: 1.6, colors: ['#fff', 'rgba(255,240,200,0)'], shape: 'pz.flare', add: 1, rot: 0, ease: 'outCubic' });
D('ring', { count: 1, life: [0.25, 0.3], speed: 0, size: [6, 6], end: 6, colors: ['rgba(255,255,255,.9)', 'rgba(255,255,255,0)'], shape: 'ring', add: 1, ease: 'outCubic' });
D('blood', { count: [6, 12], life: [0.3, 0.6], speed: [60, 260], spread: 1.3, drag: 4, grav: 420, size: [1.6, 3.4], end: 0.5, colors: ['#c4162a', '#7d0b18', 'rgba(70,0,10,0)'], shape: 'circle', add: 0 });
D('smoke', { count: [4, 7], life: [0.6, 1.2], speed: [10, 60], drag: 1.2, grav: -18, size: [10, 18], end: 2.2, colors: ['rgba(70,70,76,.55)', 'rgba(40,40,46,.3)', 'rgba(20,20,24,0)'], shape: 'pz.smoke', add: 0, spin: [-1, 1], ease: 'outQuad', layer: 'over' });
D('dust', { count: [4, 8], life: [0.3, 0.6], speed: [20, 90], spread: TAU, drag: 3, grav: -10, size: [4, 8], end: 1.8, colors: ['rgba(210,190,160,.45)', 'rgba(160,140,110,0)'], shape: 'pz.smoke', add: 0, layer: 'under' });
D('fire', { count: [10, 16], life: [0.25, 0.55], speed: [40, 240], drag: 3.2, grav: -60, size: [7, 14], end: 0.2, colors: ['#fff6d0', '#ffc24a', '#ff5a1f', 'rgba(120,20,0,0)'], shape: 'glow', add: 1, offset: 6 });
D('debris', { count: [5, 9], life: [0.5, 0.9], speed: [120, 380], drag: 1.5, grav: 700, size: [1.5, 3.5], end: 1, colors: ['#5b4a3a', '#3a2e24', 'rgba(30,24,18,0)'], shape: 'pz.shard', spin: [-14, 14], add: 0 });
D('core', { count: 1, life: [0.12, 0.16], speed: 0, size: [26, 30], end: 2, colors: ['#fff', '#ffe9a8', 'rgba(255,170,60,0)'], shape: 'glow', add: 1, ease: 'outCubic' });
D('explosion', { burst: ['core', 'fire', 'sparks', 'smoke', 'debris', 'ring'] });
D('magic', { count: [10, 16], life: [0.4, 0.8], speed: [30, 140], drag: 2, grav: -40, size: [2, 4], end: 0, colors: ['#fff', '#b9a4ff', '#6a5cff', 'rgba(80,60,255,0)'], shape: 'pz.star', spin: [-6, 6], add: 1, flicker: 0.5 });
D('heal', { count: [8, 12], life: [0.6, 1], speed: [10, 50], spread: TAU, drag: 1, grav: -90, size: [2.5, 4.5], end: 0, colors: ['#fff', '#8dffb0', 'rgba(40,220,120,0)'], shape: 'pz.star', add: 1, offset: 14 });
D('pickup', { count: [6, 9], life: [0.25, 0.45], speed: [60, 180], drag: 4, size: [1.5, 3], end: 0, colors: ['#fff', '#ffe58a', 'rgba(255,200,40,0)'], shape: 'pz.star', add: 1, spin: [-8, 8] });
D('confetti', { count: [30, 44], life: [1.2, 2], speed: [200, 520], angle: -Math.PI / 2, spread: 1.4, drag: 1.6, grav: 380, size: [2.5, 4.5], end: 1, colors: ['#ff5a7a', '#ffd54a', '#4ad8ff', '#8cff6a', '#c78bff'], shape: 'square', spin: [-12, 12], add: 0 });
D('ember', { count: [1, 2], life: [0.8, 1.6], speed: [10, 40], angle: -Math.PI / 2, spread: 1.2, drag: 0.6, grav: -30, size: [1, 2.2], end: 0, colors: ['#ffd27a', '#ff7a2a', 'rgba(255,60,0,0)'], shape: 'glow', add: 1, flicker: 0.6, offset: 30 });
D('muzzle', { count: [3, 5], life: [0.04, 0.08], speed: [60, 200], spread: 0.5, drag: 8, size: [3, 6], end: 0.2, colors: ['#fff', '#ffe18a', 'rgba(255,160,40,0)'], shape: 'pz.spark', stretch: 0.03, add: 1 });
D('shockring', { count: 1, life: [0.35, 0.4], speed: 0, size: [10, 10], end: 9, colors: ['rgba(255,255,255,.8)', 'rgba(255,255,255,0)'], shape: 'ring', add: 1, ease: 'outQuart' });

/* ---- 15_fx.js ---- */
/* ==========================================================================
   15 手感特效（打擊感）
   一行就有完整的打擊感：
     PZ.fx.hit(x, y, { power: 0.6, dir: 角度, crit: true, kill: false, sound: 'hit' })
       → 打擊停頓 + 震屏 + 鏡頭頓一下 + 火花 + （爆擊）閃光、色差、星芒 + 手機震動 + 音效
     PZ.fx.explode(x, y, { power: 1, radius: 120 })   爆炸：衝擊波扭曲、閃白、火球、碎片、煙
     PZ.fx.number(x, y, 128, { crit: true })          傷害數字（跳出來、彈一下、淡出）
     PZ.fx.hurt(0.5)    主角受傷：紅色暗角、色差、震動
   單項：shake / kick / punch / freeze / slowmo / flash / shockwave / chroma / vignette / text / haptic / rumble
   設定裡「畫面震動」「閃光」「傷害數字」會自動套用（照顧怕暈、怕閃的人）。
   ========================================================================== */
const Fx = PZ.fx = {
  nums: [], _vig: null, _chroma: 0, _chromaT: 0, _chromaD: 0, _flashT: 0, _flashD: 0, _flashA: 0, _waves: [],
  numStyle: { size: 18, weight: 900, color: '#fff', outline: 3, outlineColor: 'rgba(0,0,0,.85)', align: 'center', baseline: 'middle' },
  critStyle: { size: 26, weight: 900, color: '#ffd84a', outline: 4, outlineColor: '#3a0a00', align: 'center', baseline: 'middle' },
  healStyle: { size: 18, weight: 900, color: '#7dffa8', outline: 3, outlineColor: 'rgba(0,40,20,.9)', align: 'center', baseline: 'middle' },
};
Fx.shake = (t) => Cam.shake(t);
Fx.kick = (angle, px) => Cam.kick(angle, px);
Fx.punch = (z) => Cam.punch(z);
Fx.freeze = (ms) => PZ.freeze(ms);
Fx.slowmo = (s, sec, back) => PZ.slowmo(s, sec, back);
Fx.haptic = (k) => Haptics.tap(k);
Fx.rumble = (s, w, ms) => Input.rumble(s, w, ms);
/** 全畫面閃一下：color、強度 a（0～1）、秒數 */
Fx.flash = (color = '#fff', a = 0.5, dur = 0.12) => {
  const c = toColor(color); Post.flash[0] = cR(c) / 255; Post.flash[1] = cG(c) / 255; Post.flash[2] = cB(c) / 255;
  Fx._flashA = Math.max(Fx._flashA * (Fx._flashD > 0 ? 1 - Fx._flashT / Fx._flashD : 0), a); Fx._flashT = 0; Fx._flashD = dur;
};
/** 色差（爆擊、受傷）：amount 約 0.006～0.02 */
Fx.chroma = (amount = 0.012, dur = 0.25) => { Fx._chroma = Math.max(Fx._chroma, amount); Fx._chromaT = 0; Fx._chromaD = dur; };
/** 暗角脈衝：受傷變紅、低血量 */
Fx.vignette = (color = '#a00010', amount = 0.6, dur = 0.5) => { const base = Fx._vig ? Fx._vig.base : null; Fx._vig = { color: toColor(color), amount, dur, t: 0, base }; };
/** 衝擊波扭曲（世界座標）：strength 0.01～0.05、radius 擴散到多大（世界單位） */
Fx.shockwave = (x, y, o = {}) => {
  if (!Post.enabled) return;
  Fx._waves.push({ x, y, t: 0, dur: o.dur || 0.55, radius: o.radius || 260, strength: o.strength != null ? o.strength : 0.03, thick: o.thick || 50 });
  if (Fx._waves.length > 4) Fx._waves.shift();
};
/** 跳出文字（世界座標） */
Fx.text = (x, y, str, style, o = {}) => {
  const n = { x, y, vx: o.vx != null ? o.vx : Rand.spread(20), vy: o.vy != null ? o.vy : -70, t: 0, life: o.life || 0.9, str: String(str), st: style || Fx.numStyle, pop: o.pop != null ? o.pop : 1, grav: o.grav != null ? o.grav : 120 };
  Fx.nums.push(n); if (Fx.nums.length > 160) Fx.nums.shift();
  return n;
};
/** 傷害數字：o { crit, heal, color, size, miss } */
Fx.number = (x, y, value, o = {}) => {
  if (!Settings.get('numbers')) return null;
  const st = o.heal ? Fx.healStyle : o.crit ? Fx.critStyle : Fx.numStyle;
  const style = (o.color || o.size) ? Object.assign({}, st, o.color ? { color: o.color } : null, o.size ? { size: o.size } : null) : st;
  const txt = o.miss ? 'MISS' : (o.heal ? '+' : '') + (typeof value === 'number' ? Math.round(value) : value) + (o.crit ? '!' : '');
  return Fx.text(x, y, txt, style, { vy: o.crit ? -110 : -80, life: o.crit ? 1.05 : 0.8, pop: o.crit ? 1.6 : 1.15 });
};

/** 一次完整的「打中了」 */
Fx.hit = (x, y, o = {}) => {
  const p = clamp01(o.power != null ? o.power : 0.4), dir = o.dir != null ? o.dir : Rand.angle(), crit = !!o.crit, kill = !!o.kill;
  const fz = o.freeze != null ? o.freeze : Math.min(140, 18 + p * 50 + (crit ? 40 : 0) + (kill ? 45 : 0));
  if (fz > 0) PZ.freeze(fz);
  Cam.shake(o.shake != null ? o.shake : 0.06 + p * 0.22 + (crit ? 0.14 : 0) + (kill ? 0.1 : 0));
  Cam.kick(dir, 2 + p * 7 + (crit ? 4 : 0));
  const col = o.color;
  Particles.emit('hit', x, y, { angle: dir, scale: 0.8 + p * 0.6, colors: col ? ['#fff', col, Color.alpha(col, 0)] : undefined });
  if (p > 0.45 || crit) Particles.emit('sparks', x, y, { angle: dir, count: Math.round(4 + p * 10), scale: 0.8 + p * 0.5 });
  if (crit) { Particles.emit('flare', x, y, { scale: 1 + p }); Particles.emit('ring', x, y, { scale: 0.8 + p }); Fx.chroma(0.008 + p * 0.008, 0.22); Cam.punch(0.025 + p * 0.02); }
  if (kill) { Particles.emit('ring', x, y, { scale: 0.7 + p * 0.6 }); }
  if (o.blood) Particles.emit('blood', x, y, { angle: dir, scale: 0.8 + p * 0.5, colors: o.blood === true ? undefined : [o.blood, Color.darken(o.blood, 0.5), Color.alpha(o.blood, 0)] });
  if (crit || kill || p > 0.7) Fx.flash('#fff', 0.06 + p * 0.08 + (crit ? 0.06 : 0), 0.07);
  Haptics.tap(crit || kill ? 'medium' : p > 0.6 ? 'medium' : 'light');
  Input.rumble(0.2 + p * 0.6, 0.3 + p * 0.4, 60 + p * 80);
  if (o.sound !== false) { const s = o.sound || 'hit'; if (Sfx.has(s)) Sfx.at(s, x, y, { pitch: 1.08 - p * 0.18 + Rand.spread(0.06), vol: 0.75 + p * 0.35 }); if (crit && Sfx.has('crit')) Sfx.at('crit', x, y); if (kill && Sfx.has('kill')) Sfx.at('kill', x, y, { vol: 0.8 }); }
};
/** 爆炸 */
Fx.explode = (x, y, o = {}) => {
  const p = clamp01(o.power != null ? o.power : 0.8), rad = o.radius || 120;
  PZ.freeze(o.freeze != null ? o.freeze : 40 + p * 70);
  Cam.shake(0.3 + p * 0.5); Cam.punch(0.03 + p * 0.04);
  Fx.shockwave(x, y, { radius: rad * 2.4, strength: 0.018 + p * 0.025, dur: 0.5 + p * 0.2 });
  Fx.flash(o.flashColor || '#fff2d8', 0.18 + p * 0.25, 0.1 + p * 0.06);
  Fx.chroma(0.008 + p * 0.01, 0.3);
  Particles.emit('explosion', x, y, { scale: (0.6 + p * 0.8) * (rad / 120), colors: o.colors });
  Haptics.tap('heavy'); Input.rumble(1, 0.8, 220);
  if (o.sound !== false) { const s = o.sound || 'explosion'; if (Sfx.has(s)) Sfx.at(s, x, y, { vol: 0.8 + p * 0.3, pitch: 1.1 - p * 0.25 }); }
};
/** 主角受傷 */
Fx.hurt = (amount = 0.5, o = {}) => {
  const a = clamp01(amount);
  // 紅暗角要短、要淡：被一群怪連續咬時才不會整個畫面一直是紅的（o.vignette: false 不要暗角）
  if (o.vignette !== false) Fx.vignette(o.color || '#b0001a', 0.28 + a * 0.3, 0.25 + a * 0.25);
  Fx.chroma(0.006 + a * 0.012, 0.25); Cam.shake(0.18 + a * 0.35);
  if (o.dir != null) Cam.kick(o.dir, 4 + a * 8);
  PZ.freeze(o.freeze != null ? o.freeze : 25 + a * 50);
  Haptics.tap(a > 0.5 ? 'heavy' : 'medium'); Input.rumble(0.6 + a * 0.4, 0.5, 140);
  if (o.sound !== false) { const s = o.sound || 'hurt'; if (Sfx.has(s)) Sfx.play(s, { pitch: 1 - a * 0.15 }); }
};
/** 撿到東西 */
Fx.pickup = (x, y, o = {}) => { Particles.emit('pickup', x, y, { colors: o.color ? ['#fff', o.color, Color.alpha(o.color, 0)] : undefined }); if (o.sound !== false) { const s = o.sound || 'pickup'; if (Sfx.has(s)) Sfx.at(s, x, y, { pitch: o.pitch || 1 }); } };
/** 升級、過關的慶祝 */
Fx.celebrate = (x, y, o = {}) => {
  Particles.emit('confetti', x, y, { scale: o.scale || 1 }); Particles.emit('flare', x, y, { scale: 2 }); Particles.emit('shockring', x, y, { scale: 1.5 });
  Fx.flash('#fff', 0.35, 0.18); Cam.punch(0.05); Haptics.tap('success');
  if (o.sound !== false) { const s = o.sound || 'levelup'; if (Sfx.has(s)) Sfx.play(s); }
};

/** 畫傷害數字與跳字（世界座標）；場景沒畫的話 g.hud() 前會自動畫 */
Fx.drawNumbers = (g) => {
  Fx._numsDrawn = true;
  for (const n of Fx.nums) {
    const k = n.t / n.life, popT = Math.min(1, n.t / 0.16);
    const s = (n.pop > 1 ? lerp(n.pop, 1, Ease.outBack(popT)) : 1) * (k > 0.75 ? lerp(1, 0.7, (k - 0.75) / 0.25) : 1);
    const a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    g.save(); g.translate(n.x, n.y); g.scale(s, s); g.alpha(a);
    g.text(n.str, 0, 0, n.st);
    g.restore();
  }
};
/** g.hud() 會呼叫：場景沒自己畫的粒子（over 層）與數字，在這裡補畫 */
Fx._drawAuto = (g) => {
  if (g.space !== 'world') g.world();
  if (!Particles.drawn[1]) Particles.draw(g, 'over');
  if (!Fx._numsDrawn) Fx.drawNumbers(g);
};
addSystem({
  name: 'fx', order: 70,
  update(dt) {
    for (let i = 0; i < Fx.nums.length; i++) { const n = Fx.nums[i]; n.t += dt; n.vy += n.grav * dt; n.x += n.vx * dt; n.y += n.vy * dt; n.vx *= Math.exp(-3 * dt); if (n.t >= n.life) { Fx.nums.splice(i--, 1); } }
  },
  frame(rdt) {
    // 閃光、色差、暗角、衝擊波用真實時間：打擊停頓時照樣在變化
    if (Fx._flashD > 0) { Fx._flashT += rdt; const k = clamp01(Fx._flashT / Fx._flashD); Post.flash[3] = Fx._flashA * (1 - Ease.outQuad(k)); if (k >= 1) { Fx._flashD = 0; Fx._flashA = 0; Post.flash[3] = 0; } }
    if (Fx._chromaD > 0) { Fx._chromaT += rdt; const k = clamp01(Fx._chromaT / Fx._chromaD); Post.chroma = Fx._chroma * (1 - k); if (k >= 1) { Fx._chromaD = 0; Fx._chroma = 0; Post.chroma = 0; } }
    const v = Fx._vig;
    if (v) {
      if (!v.base) v.base = { vig: Post.vignette, col: Post.vignetteColor };
      v.t += rdt; const k = clamp01(v.t / v.dur), e = Math.sin(Math.min(1, k * 4) * Math.PI / 2) * (1 - Ease.inQuad(k));
      Post.vignette = lerp(v.base.vig, Math.max(v.base.vig, v.amount), e); Post.vignetteColor = Color.css(Color.mix(toColor(v.base.col), v.color, e));
      if (k >= 1) { Post.vignette = v.base.vig; Post.vignetteColor = v.base.col; Fx._vig = null; }
    }
    Post.waves.length = 0;
    for (let i = 0; i < Fx._waves.length; i++) {
      const w = Fx._waves[i]; w.t += rdt; const k = w.t / w.dur;
      if (k >= 1) { Fx._waves.splice(i--, 1); continue; }
      const z = Cam.ez || 1;
      Post.waves.push({ x: Cam.toScreenX(w.x, w.y), y: Cam.toScreenY(w.x, w.y), r: w.radius * Ease.outCubic(k) * z, strength: w.strength * (1 - k) * Settings.get('shake'), thick: w.thick * z * (1 - k * 0.5) });
    }
  },
  render() { Particles.drawn[0] = Particles.drawn[1] = false; Fx._numsDrawn = false; },
});

/* ---- 16_audio.js ---- */
/* ==========================================================================
   16 聲音：音訊核心＋合成音效
   - 第一次點擊／按鍵時「同步」建立 AudioContext（放在 await 後面會被瀏覽器擋）。
   - iPhone 側邊靜音鍵打開時網頁遊戲會沒聲音：設 navigator.audioSession.type = 'playback' 解決
     （設定裡「跟其他 App 的音樂一起播」打開時改成 'ambient'：會跟著靜音鍵）。
   - 音效全部用純 JavaScript 合成成聲音片段（可重現、不用檔案、手機也省電），播的時候只是放片段：
       PZ.sfx.play('hit', { vol, pitch, pan })     PZ.sfx.at('explosion', x, y)（依畫面位置左右聲道、遠近音量）
       PZ.sfx.define('myShot', { layers: [...], vol: 0.8, pitchVar: 0.06, max: 4, gap: 0.03 })
   - 同一個音效同時最多幾個聲部（max）、最短間隔（gap），機槍不會疊成爆音；總輸出有限幅器。
   - 匯流排：sfx（音效）、music（配樂）、ui（介面）、amb（環境）；設定裡的音量直接套用。
   ========================================================================== */
const Aud = PZ.audio = { ctx: null, ready: false, failed: false, bus: {}, duckV: 1, _duckT: 0, _unlockers: [], sampleRate: 44100 };

function setSession() {
  try { if (HAS_DOM && navigator.audioSession) navigator.audioSession.type = Settings.get('mixOthers') ? 'ambient' : 'playback'; } catch (e) { /* 不支援 */ }
}
/** 建立音訊（一定要在使用者手勢裡同步呼叫；引擎已經自動掛好了） */
Aud.unlock = () => {
  if (!HAS_DOM || Aud.failed) return false;
  if (Aud.ctx) { if (Aud.ctx.state !== 'running') { try { Aud.ctx.resume(); } catch (e) { /* ignore */ } } return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { Aud.failed = true; return false; }
  setSession();
  let c;
  try { c = new AC({ latencyHint: 'interactive' }); } catch (e) { try { c = new AC(); } catch (er) { Aud.failed = true; return false; } }
  Aud.ctx = c; Aud.sampleRate = c.sampleRate;
  const master = c.createGain(), comp = c.createDynamicsCompressor();
  comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 12; comp.attack.value = 0.002; comp.release.value = 0.18;
  master.connect(comp); comp.connect(c.destination);
  Aud.master = master; Aud.comp = comp;
  for (const k of ['sfx', 'music', 'ui', 'amb']) { const g = c.createGain(); g.connect(master); Aud.bus[k] = g; }
  // 殘響（短的房間感，給需要的音效加一點空間）
  Aud.rev = c.createConvolver(); Aud.rev.buffer = makeIR(c, 1.6, 2.6); Aud.revIn = c.createGain(); Aud.revIn.gain.value = 1;
  Aud.revIn.connect(Aud.rev); Aud.rev.connect(Aud.bus.sfx);
  // iOS：先放一段無聲，正式解鎖
  try { const b = c.createBuffer(1, 1, c.sampleRate), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) { /* ignore */ }
  try { c.resume(); } catch (e) { /* ignore */ }
  c.onstatechange = () => PZ.emit('audiostate', c.state);
  Aud.ready = true;
  Aud.applyVolumes();
  Sfx.prewarm();
  PZ.emit('audio', c);
  return true;
};
function makeIR(c, sec, decay) {
  const len = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, len, c.sampleRate), r = makeRng(99);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0; for (let i = 0; i < len; i++) { lp += ((r.next() * 2 - 1) - lp) * 0.35; d[i] = lp * Math.pow(1 - i / len, decay) * 0.6; } }
  return b;
}
Aud.applyVolumes = () => {
  if (!Aud.ctx) return;
  const t = Aud.ctx.currentTime, set = (g, v) => { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(v, t, 0.03); };
  const mute = Settings.get('mute') ? 0 : 1;
  set(Aud.master, mute * Settings.get('master'));
  set(Aud.bus.sfx, Settings.get('sfx')); set(Aud.bus.ui, Settings.get('sfx') * 0.9); set(Aud.bus.amb, Settings.get('sfx') * 0.85);
  set(Aud.bus.music, Settings.get('music') * Aud.duckV);
};
/** 頻譜分析（音樂視覺化）：回傳 AnalyserNode，接在總輸出上；沒有音訊時回傳 null */
Aud.analyser = (size = 256) => {
  if (!Aud.ctx) return null;
  if (!Aud._an) { Aud._an = Aud.ctx.createAnalyser(); Aud._an.fftSize = size; Aud._an.smoothingTimeConstant = 0.78; Aud.comp.connect(Aud._an); }
  return Aud._an;
};
/** 讓配樂暫時變小聲（大爆炸、劇情對話）：amount 降到幾成、sec 秒後恢復 */
Aud.duck = (amount = 0.45, sec = 0.6) => { Aud.duckV = Math.min(Aud.duckV, amount); Aud._duckT = Math.max(Aud._duckT, sec); Aud.applyVolumes(); };
Aud.now = () => (Aud.ctx ? Aud.ctx.currentTime : 0);
if (HAS_DOM) {
  const unlock = () => { Aud.unlock(); };
  for (const ev of ['pointerdown', 'touchend', 'keydown', 'mousedown']) window.addEventListener(ev, unlock, { capture: true, passive: true });
  PZ.on('hidden', () => { if (Aud.ctx && Aud.ctx.state === 'running') { try { Aud.ctx.suspend(); } catch (e) { /* ignore */ } } });
  PZ.on('visible', () => { if (Aud.ctx && Aud.ctx.state !== 'running') { try { Aud.ctx.resume(); } catch (e) { /* ignore */ } } });
}
addSystem({ name: 'audio', order: 30, frame(rdt) { if (Aud._duckT > 0) { Aud._duckT -= rdt; if (Aud._duckT <= 0) { Aud.duckV = 1; Aud.applyVolumes(); } } } });

/* ==========================================================================
   合成：純 JS 的小型合成器（每一層是一個聲音元件，疊起來就是一個音效）
   一層的欄位（全部可省略）：
     w: 'sine'|'tri'|'square'|'saw'|'noise'|'pink'|'brown'  波形（預設 sine）
     f: 起始頻率 Hz、f1: 結束頻率（滑音）、fc: 'exp'|'lin'
     t: 長度（秒）、a: 起音（秒）、h: 持續（秒）、p: 衰減曲線（越大越快，預設 2）
     v: 音量、d: 延遲開始（秒）、duty: 方波佔空比
     vib: [速度 Hz, 深度半音]、jump: [[時間, 頻率倍率], …]（琶音）
     fm: [頻率比, 調變量, 調變衰減速度]（金屬、鐘聲、電子琴）
     lp/hp/bp: [截止頻率, 結束頻率, Q]（濾波，可以掃）
     dist: 0～1（失真）、crush: 位元數（8-bit 味）、hold: 降取樣倍數
   ========================================================================== */
function bq(type, f, q, sr) {
  f = clamp(f, 10, sr * 0.45); const w = TAU * f / sr, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * Math.max(0.05, q));
  let b0, b1, b2; const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
  if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; } else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; } else { b0 = al; b1 = 0; b2 = -al; }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function polyblep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

function renderLayer(L, sr, out, rng) {
  const t = L.t != null ? L.t : 0.2, start = Math.floor((L.d || 0) * sr), n = Math.min(out.length - start, Math.floor(t * sr));
  if (n <= 0) return;
  const w = L.w || 'sine', f0 = Math.max(1, L.f || 440), f1 = Math.max(1, L.f1 != null ? L.f1 : f0), expo = (L.fc || 'exp') === 'exp';
  const a = L.a != null ? L.a : 0.002, h = L.h || 0, pw = L.p != null ? L.p : 2, vol = L.v != null ? L.v : 0.7, duty = L.duty || 0.5;
  const fils = []; for (const k of ['lp', 'hp', 'bp']) if (L[k]) { const s = L[k]; fils.push({ type: k, f0: s[0], f1: s[1] != null ? s[1] : s[0], q: s[2] || 0.8, c: bq(k, s[0], s[2] || 0.8, sr), x1: 0, x2: 0, y1: 0, y2: 0 }); }
  const drive = L.dist ? 1 + L.dist * 9 : 0, dn = drive ? Math.tanh(drive) : 1, crush = L.crush ? Math.pow(2, L.crush - 1) : 0, hold = L.hold || 1;
  const jumps = L.jump || null, vib = L.vib || null, fm = L.fm || null;
  let ph = 0, mph = 0, pink = [0, 0, 0, 0, 0, 0, 0], brown = 0, held = 0;
  const decayLen = Math.max(1e-4, t - a - h);
  for (let i = 0; i < n; i++) {
    const tau = i / sr, x = tau / t;
    let fr = expo ? f0 * Math.pow(f1 / f0, x) : f0 + (f1 - f0) * x;
    if (jumps) for (const j of jumps) if (tau >= j[0]) fr *= j[1];
    if (vib) fr *= Math.pow(2, (vib[1] * Math.sin(TAU * vib[0] * tau)) / 12);
    const dt = fr / sr;
    let s;
    if (i % hold === 0) {
      switch (w) {
        case 'noise': s = rng.next() * 2 - 1; break;
        case 'pink': { const wn = rng.next() * 2 - 1; pink[0] = 0.99886 * pink[0] + wn * 0.0555179; pink[1] = 0.99332 * pink[1] + wn * 0.0750759; pink[2] = 0.969 * pink[2] + wn * 0.153852; pink[3] = 0.8665 * pink[3] + wn * 0.3104856; pink[4] = 0.55 * pink[4] + wn * 0.5329522; pink[5] = -0.7616 * pink[5] - wn * 0.016898; s = (pink[0] + pink[1] + pink[2] + pink[3] + pink[4] + pink[5] + pink[6] + wn * 0.5362) * 0.11; pink[6] = wn * 0.115926; break; }
        case 'brown': { brown = (brown + 0.02 * (rng.next() * 2 - 1)) / 1.02; s = brown * 3.5; break; }
        case 'square': s = (ph < duty ? 1 : -1) + polyblep(ph, dt) - polyblep((ph + 1 - duty) % 1, dt); break;
        case 'saw': s = 2 * ph - 1 - polyblep(ph, dt); break;
        case 'tri': s = 1 - 4 * Math.abs(ph - 0.5); break;
        default: {
          let pm = 0;
          if (fm) { const idx = fm[1] * (fm[2] ? Math.exp(-tau * fm[2]) : 1); pm = idx * Math.sin(TAU * mph); mph += fr * fm[0] / sr; mph -= Math.floor(mph); }
          s = Math.sin(TAU * ph + pm);
        }
      }
      held = s;
    } else s = held;
    ph += dt; ph -= Math.floor(ph);
    for (const F of fils) {
      if (F.f1 !== F.f0 && (i & 15) === 0) F.c = bq(F.type, F.f0 * Math.pow(F.f1 / F.f0, x), F.q, sr);
      const c = F.c, y = c[0] * s + c[1] * F.x1 + c[2] * F.x2 - c[3] * F.y1 - c[4] * F.y2;
      F.x2 = F.x1; F.x1 = s; F.y2 = F.y1; F.y1 = y; s = y;
    }
    if (drive) s = Math.tanh(s * drive) / dn;
    if (crush) s = Math.round(s * crush) / crush;
    const env = tau < a ? tau / a : tau < a + h ? 1 : Math.pow(Math.max(0, 1 - (tau - a - h) / decayLen), pw);
    out[start + i] += s * env * vol;
  }
}
/** 把一個音效規格算成取樣（Float32Array）；Node 測試也能跑 */
function synth(spec, sr, seed = 1) {
  const layers = spec.layers || [spec];
  let len = 0; for (const L of layers) len = Math.max(len, (L.d || 0) + (L.t != null ? L.t : 0.2));
  len += spec.tail || 0.01;
  const out = new Float32Array(Math.ceil(len * sr)), rng = makeRng(seed);
  for (const L of layers) renderLayer(L, sr, out, rng);
  // 去直流、正規化、尾端淡出
  let px = 0, py = 0, peak = 0;
  for (let i = 0; i < out.length; i++) { const x = out[i], y = x - px + 0.997 * py; px = x; py = y; out[i] = y; const ab = y < 0 ? -y : y; if (ab > peak) peak = ab; }
  const g = peak > 1e-6 ? (spec.norm === false ? 1 : 0.95 / peak) * (spec.vol != null ? spec.vol : 0.8) : 0;
  const fade = Math.min(out.length, Math.floor(sr * 0.004));
  for (let i = 0; i < out.length; i++) out[i] *= g;
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  return out;
}

const Sfx = PZ.sfx = { defs: {}, bufs: new Map(), voices: [], last: new Map(), maxVoices: 28, _warm: [] };
Sfx.define = (name, spec) => { Sfx.defs[name] = spec; Sfx.bufs.delete(name); if (Aud.ctx) Sfx.prewarm(); return spec; };
Sfx.has = (name) => !!Sfx.defs[name] || Sfx.bufs.has(name);
/** 純取樣（不需要音訊）：測試、匯出用 */
Sfx.render = (name, sr = 44100) => { const sp = Sfx.defs[name]; return sp ? synth(sp, sr, hashStr(name)) : null; };
Sfx.buffer = (name) => {
  let b = Sfx.bufs.get(name);
  if (b) return b;
  const sp = Sfx.defs[name]; if (!sp || !Aud.ctx) return null;
  const data = synth(sp, Aud.ctx.sampleRate, hashStr(name));
  b = Aud.ctx.createBuffer(1, data.length, Aud.ctx.sampleRate); b.getChannelData(0).set(data);
  Sfx.bufs.set(name, b);
  return b;
};
/** 載入外部音效檔（筆電素材工廠做的 mp3/ogg/wav，或 data URL） */
Sfx.load = async (name, url, o = {}) => {
  if (!Aud.ctx) await new Promise((r) => PZ.once('audio', r));
  const res = await fetch(url), ab = await res.arrayBuffer();
  const b = await new Promise((ok, no) => Aud.ctx.decodeAudioData(ab, ok, no));
  Sfx.bufs.set(name, b); Sfx.defs[name] = Sfx.defs[name] || Object.assign({ file: url }, o);
  return b;
};
/* 解鎖後先把所有音效算好：優先丟給背景執行緒（Worker）算，畫面完全不卡；
   不能用 Worker 的環境（某些內嵌頁面）退回主執行緒、每格最多算一個。 */
let synthWorker = null, workerTried = false;
const pendingW = new Set();
function makeWorker() {
  if (workerTried) return synthWorker; workerTried = true;
  try {
    const src = `const TAU=${TAU};const clamp=${clamp.toString()};${makeRng.toString()}${bq.toString()}${polyblep.toString()}${renderLayer.toString()}${synth.toString()}
onmessage=(e)=>{const m=e.data;try{const d=synth(m.spec,m.sr,m.seed);postMessage({name:m.name,d},[d.buffer]);}catch(err){postMessage({name:m.name,err:String(err)});}};`;
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    synthWorker = new Worker(url);
    synthWorker.onmessage = (e) => {
      const { name, d, err } = e.data; pendingW.delete(name);
      if (err || !d || !Aud.ctx || Sfx.bufs.has(name)) return;
      const b = Aud.ctx.createBuffer(1, d.length, Aud.ctx.sampleRate); b.getChannelData(0).set(d); Sfx.bufs.set(name, b);
    };
    synthWorker.onerror = () => { synthWorker = null; for (const n of pendingW) Sfx._warm.push(n); pendingW.clear(); };
  } catch (e) { synthWorker = null; }
  return synthWorker;
}
Sfx.prewarm = () => {
  const w = HAS_DOM && typeof Worker === 'function' ? makeWorker() : null;
  for (const k in Sfx.defs) {
    if (Sfx.bufs.has(k) || pendingW.has(k) || Sfx.defs[k].file) continue;
    if (w) { pendingW.add(k); try { w.postMessage({ name: k, spec: Sfx.defs[k], sr: Aud.ctx.sampleRate, seed: hashStr(k) }); } catch (e) { pendingW.delete(k); Sfx._warm.push(k); } }
    else Sfx._warm.push(k);
  }
};
addSystem({ name: 'sfx-warm', order: 31, frame() { if (!Aud.ctx || !Sfx._warm.length) return; const k = Sfx._warm.shift(); if (!Sfx.bufs.has(k)) Sfx.buffer(k); } });

/**
 * 播放：o { vol, pitch（倍率）, pan（-1～1）, bus, rev（殘響量）, delay（秒）, loop }
 * 回傳一個可以 stop() 的聲部（播不了回傳 null）
 */
Sfx.play = (name, o = {}) => {
  if (!Aud.ctx || Aud.ctx.state === 'closed') return null;
  const sp = Sfx.defs[name] || {}, buf = Sfx.buffer(name); if (!buf) return null;
  const c = Aud.ctx, now = c.currentTime;
  const gap = sp.gap != null ? sp.gap : 0.025, lt = Sfx.last.get(name) || -1;
  if (now - lt < gap && !o.force) return null;
  Sfx.last.set(name, now);
  // 同一音效的聲部上限：停掉最舊的
  const max = sp.max || 6, mine = Sfx.voices.filter((v) => v.name === name);
  if (mine.length >= max) mine[0].stop(0.02);
  if (Sfx.voices.length >= Sfx.maxVoices) Sfx.voices[0].stop(0.02);
  const src = c.createBufferSource(); src.buffer = buf;
  const pv = sp.pitchVar != null ? sp.pitchVar : 0.05;
  src.playbackRate.value = Math.max(0.1, (o.pitch || 1) * (1 + Rand.spread(pv)));
  if (o.loop) src.loop = true;
  const g = c.createGain(); g.gain.value = (o.vol != null ? o.vol : 1);
  src.connect(g);
  let node = g;
  if (o.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); g.connect(p); node = p; }
  node.connect(Aud.bus[o.bus || sp.bus || 'sfx'] || Aud.bus.sfx);
  const rv = o.rev != null ? o.rev : sp.rev || 0;
  if (rv > 0) { const rg = c.createGain(); rg.gain.value = rv; node.connect(rg); rg.connect(Aud.revIn); }
  const at = now + (o.delay || 0);
  src.start(at);
  const v = { name, src, g, end: at + buf.duration / src.playbackRate.value, stop(fade = 0.03) { try { const t = c.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade); src.stop(t + fade + 0.01); } catch (e) { /* 已經停了 */ } rm(); } };
  const rm = () => { const i = Sfx.voices.indexOf(v); if (i >= 0) Sfx.voices.splice(i, 1); };
  src.onended = rm;
  Sfx.voices.push(v);
  return v;
};
/** 依世界座標播放：左右聲道跟著畫面位置，離畫面越遠越小聲 */
Sfx.at = (name, x, y, o = {}) => {
  const sx = Cam.toScreenX(x, y), sy = Cam.toScreenY(x, y), w = Screen.w || 1, h = Screen.h || 1;
  const pan = clamp((sx - w / 2) / (w / 2), -1, 1) * 0.55;
  const dx = Math.max(0, Math.abs(sx - w / 2) - w / 2), dy = Math.max(0, Math.abs(sy - h / 2) - h / 2), off = Math.hypot(dx, dy) / Math.max(w, h);
  const vol = (o.vol != null ? o.vol : 1) * clamp(1 - off * 1.6, 0.12, 1);
  return Sfx.play(name, Object.assign({}, o, { pan, vol }));
};
Sfx.stopAll = (name) => { for (const v of Sfx.voices.slice()) if (!name || v.name === name) v.stop(); };
/** 介面音效（走 ui 匯流排） */
PZ.uiSound = (name, o) => Sfx.play(name, Object.assign({ bus: 'ui' }, o));

/* ---------- 內建音效庫 ---------- */
const S = Sfx.define;
// 打擊
S('hit', { vol: 0.75, pitchVar: 0.08, max: 6, gap: 0.02, layers: [
  { w: 'noise', t: 0.018, a: 0.0005, p: 1.5, v: 0.55, hp: [1800, 1800, 0.7] },
  { w: 'tri', f: 240, f1: 70, t: 0.11, a: 0.001, p: 2.2, v: 1, dist: 0.35 },
  { w: 'noise', t: 0.08, a: 0.001, p: 2.5, v: 0.45, lp: [3200, 500, 0.8] }] });
S('hitHeavy', { vol: 0.9, pitchVar: 0.06, max: 4, layers: [
  { w: 'noise', t: 0.025, a: 0.0005, p: 1.5, v: 0.6, hp: [1400, 1400, 0.7] },
  { w: 'sine', f: 170, f1: 42, t: 0.22, a: 0.001, p: 2, v: 1, dist: 0.5 },
  { w: 'brown', t: 0.18, a: 0.002, p: 2, v: 0.8, lp: [1800, 250, 0.7] }] });
S('crit', { vol: 0.65, pitchVar: 0.04, max: 3, layers: [
  { w: 'sine', f: 1900, t: 0.32, a: 0.001, p: 3, v: 0.5, fm: [3.51, 2.4, 9] },
  { w: 'sine', f: 2850, t: 0.18, a: 0.001, p: 3, v: 0.25, fm: [2.01, 1.5, 12] },
  { w: 'noise', t: 0.05, a: 0.0005, p: 2, v: 0.35, hp: [5000, 5000, 0.7] }] });
S('kill', { vol: 0.7, pitchVar: 0.1, max: 5, layers: [
  { w: 'noise', t: 0.13, a: 0.001, p: 1.8, v: 0.8, bp: [1100, 260, 1.1] },
  { w: 'sine', f: 330, f1: 70, t: 0.14, a: 0.001, p: 2, v: 0.8, dist: 0.2 }] });
S('slash', { vol: 0.6, pitchVar: 0.08, max: 4, layers: [
  { w: 'noise', t: 0.16, a: 0.04, p: 2, v: 1, bp: [600, 3800, 1.4] },
  { w: 'noise', t: 0.05, d: 0.06, a: 0.002, p: 2, v: 0.4, hp: [4000, 4000, 0.7] }] });
S('clang', { vol: 0.6, pitchVar: 0.05, max: 3, layers: [
  { w: 'sine', f: 760, t: 0.55, a: 0.001, p: 2.6, v: 0.6, fm: [1.41, 4.5, 6] },
  { w: 'sine', f: 1520, t: 0.3, a: 0.001, p: 3, v: 0.3, fm: [2.73, 2, 8] },
  { w: 'noise', t: 0.04, a: 0.0005, p: 2, v: 0.5, hp: [3000, 3000, 0.7] }] });
S('block', { vol: 0.55, pitchVar: 0.05, max: 3, layers: [
  { w: 'sine', f: 520, t: 0.18, a: 0.001, p: 2.5, v: 0.6, fm: [1.7, 3, 14] },
  { w: 'noise', t: 0.06, a: 0.001, p: 2, v: 0.5, bp: [2400, 1200, 1] }] });
// 射擊
S('shoot', { vol: 0.55, pitchVar: 0.07, max: 5, gap: 0.03, layers: [
  { w: 'noise', t: 0.09, a: 0.0005, p: 2.2, v: 1, lp: [7000, 1400, 0.7], dist: 0.35 },
  { w: 'sine', f: 980, f1: 130, t: 0.06, a: 0.0005, p: 2, v: 0.5 },
  { w: 'sine', f: 120, f1: 55, t: 0.08, a: 0.001, p: 2, v: 0.6 }] });
S('rifle', { vol: 0.5, pitchVar: 0.06, max: 6, gap: 0.04, layers: [
  { w: 'noise', t: 0.07, a: 0.0005, p: 2.4, v: 1, hp: [700, 700, 0.6], dist: 0.45 },
  { w: 'square', f: 420, f1: 140, t: 0.04, a: 0.0005, p: 2, v: 0.25 },
  { w: 'sine', f: 140, f1: 60, t: 0.06, a: 0.001, p: 2, v: 0.5 }] });
S('shotgun', { vol: 0.7, pitchVar: 0.05, max: 3, gap: 0.08, layers: [
  { w: 'noise', t: 0.26, a: 0.001, p: 2.2, v: 1, lp: [4500, 500, 0.7], dist: 0.6 },
  { w: 'sine', f: 120, f1: 38, t: 0.22, a: 0.001, p: 2, v: 0.9 }] });
S('laser', { vol: 0.45, pitchVar: 0.06, max: 5, gap: 0.03, layers: [
  { w: 'square', f: 1500, f1: 260, t: 0.16, a: 0.001, p: 1.6, v: 0.6, lp: [6000, 1500, 0.8], duty: 0.35 },
  { w: 'sine', f: 2200, f1: 500, t: 0.12, a: 0.001, p: 2, v: 0.4 }] });
S('reload', { vol: 0.45, layers: [
  { w: 'noise', t: 0.02, a: 0.0005, p: 2, v: 0.8, bp: [3200, 3200, 2] },
  { w: 'noise', t: 0.12, d: 0.05, a: 0.02, p: 1.5, v: 0.35, bp: [1400, 2600, 1.2] },
  { w: 'noise', t: 0.025, d: 0.2, a: 0.0005, p: 2, v: 0.9, bp: [2600, 2600, 2] },
  { w: 'sine', f: 900, t: 0.03, d: 0.2, a: 0.0005, p: 2, v: 0.3 }] });
S('empty', { vol: 0.35, layers: [{ w: 'noise', t: 0.015, a: 0.0005, p: 2, v: 1, bp: [4200, 4200, 3] }, { w: 'sine', f: 1400, t: 0.02, p: 2, v: 0.4 }] });
// 爆炸、環境
S('explosion', { vol: 0.95, pitchVar: 0.06, max: 3, gap: 0.05, rev: 0.25, layers: [
  { w: 'noise', t: 0.05, a: 0.0005, p: 1.5, v: 0.7, hp: [1500, 1500, 0.6], dist: 0.4 },
  { w: 'brown', t: 1.2, a: 0.003, p: 2.2, v: 1, lp: [1600, 90, 0.7], dist: 0.35 },
  { w: 'sine', f: 75, f1: 26, t: 0.9, a: 0.002, p: 1.8, v: 0.9 },
  { w: 'noise', t: 0.6, d: 0.04, a: 0.01, p: 2.5, v: 0.25, bp: [900, 300, 0.7] }] });
S('thunder', { vol: 0.9, max: 2, rev: 0.4, layers: [
  { w: 'noise', t: 0.08, a: 0.001, p: 1.5, v: 0.9, hp: [1200, 1200, 0.6], dist: 0.5 },
  { w: 'brown', t: 2.4, a: 0.05, p: 1.6, v: 1, lp: [900, 60, 0.7] }] });
S('splash', { vol: 0.6, pitchVar: 0.08, max: 3, layers: [
  { w: 'noise', t: 0.35, a: 0.005, p: 2, v: 1, bp: [1800, 400, 0.9] },
  { w: 'sine', f: 600, f1: 1200, t: 0.06, d: 0.08, p: 2, v: 0.25 },
  { w: 'sine', f: 800, f1: 1600, t: 0.05, d: 0.16, p: 2, v: 0.2 }] });
S('glass', { vol: 0.55, max: 3, layers: [
  { w: 'sine', f: 2600, t: 0.6, a: 0.001, p: 3, v: 0.4, fm: [2.76, 2.5, 6] },
  { w: 'sine', f: 3700, t: 0.4, d: 0.03, a: 0.001, p: 3, v: 0.3, fm: [1.93, 2, 8] },
  { w: 'noise', t: 0.25, a: 0.001, p: 2.5, v: 0.5, hp: [5500, 3000, 0.8] }] });
// 拾取、獎勵
S('pickup', { vol: 0.42, pitchVar: 0.03, max: 4, gap: 0.03, bus: 'sfx', layers: [
  { w: 'sine', f: 1046, f1: 1568, t: 0.07, a: 0.001, p: 1.6, v: 0.8 },
  { w: 'sine', f: 1568, f1: 2093, t: 0.09, d: 0.045, a: 0.001, p: 1.8, v: 0.6 }] });
S('xp', { vol: 0.32, pitchVar: 0.02, max: 6, gap: 0.015, layers: [{ w: 'sine', f: 1318, t: 0.06, a: 0.001, p: 2, v: 0.9, fm: [2, 0.6, 20] }] });
S('coin', { vol: 0.4, pitchVar: 0.01, max: 4, layers: [{ w: 'square', f: 988, t: 0.32, a: 0.001, h: 0.05, p: 2.2, v: 0.5, jump: [[0.06, 1.335]], lp: [6000, 3000, 0.7], duty: 0.5 }] });
S('powerup', { vol: 0.45, max: 2, layers: [{ w: 'square', f: 523, t: 0.42, a: 0.002, h: 0.2, p: 1.6, v: 0.45, jump: [[0.07, 1.26], [0.14, 1.19], [0.21, 1.335]], vib: [8, 0.15], lp: [5000, 2500, 0.7] }, { w: 'sine', f: 1046, t: 0.42, a: 0.002, h: 0.2, p: 1.6, v: 0.3, jump: [[0.07, 1.26], [0.14, 1.19], [0.21, 1.335]] }] });
S('levelup', { vol: 0.55, max: 1, rev: 0.3, layers: [
  { w: 'sine', f: 523, t: 0.5, a: 0.002, p: 2.4, v: 0.5, fm: [2, 1.2, 4] },
  { w: 'sine', f: 659, t: 0.5, d: 0.08, a: 0.002, p: 2.4, v: 0.5, fm: [2, 1.2, 4] },
  { w: 'sine', f: 784, t: 0.55, d: 0.16, a: 0.002, p: 2.4, v: 0.5, fm: [2, 1.2, 4] },
  { w: 'sine', f: 1046, t: 0.9, d: 0.24, a: 0.002, p: 2.2, v: 0.55, fm: [3.5, 1.4, 3] },
  { w: 'noise', t: 0.8, d: 0.2, a: 0.1, p: 2, v: 0.12, hp: [7000, 9000, 0.7] }] });
S('heal', { vol: 0.4, max: 2, rev: 0.3, layers: [
  { w: 'sine', f: 660, f1: 990, t: 0.5, a: 0.05, p: 2, v: 0.5, vib: [6, 0.2] },
  { w: 'sine', f: 1320, f1: 1980, t: 0.5, d: 0.05, a: 0.05, p: 2, v: 0.25 },
  { w: 'noise', t: 0.5, a: 0.1, p: 2, v: 0.1, hp: [6000, 8000, 0.7] }] });
S('magic', { vol: 0.5, pitchVar: 0.05, max: 3, rev: 0.35, layers: [
  { w: 'sine', f: 400, f1: 1600, t: 0.45, a: 0.03, p: 1.8, v: 0.5, fm: [1.5, 2, 3] },
  { w: 'noise', t: 0.45, a: 0.05, p: 2, v: 0.25, bp: [2000, 7000, 2] }] });
S('charge', { vol: 0.4, max: 1, layers: [{ w: 'saw', f: 140, f1: 620, t: 0.9, a: 0.3, p: 0.8, v: 0.4, lp: [600, 4000, 1.5], vib: [9, 0.3] }, { w: 'sine', f: 280, f1: 1240, t: 0.9, a: 0.3, p: 0.8, v: 0.3 }] });
// 動作
S('whoosh', { vol: 0.5, pitchVar: 0.1, max: 4, layers: [{ w: 'noise', t: 0.2, a: 0.07, p: 1.6, v: 1, bp: [400, 2400, 1.2] }] });
S('dash', { vol: 0.5, pitchVar: 0.06, max: 2, layers: [{ w: 'noise', t: 0.22, a: 0.01, p: 1.8, v: 1, bp: [2600, 500, 1] }, { w: 'sine', f: 320, f1: 140, t: 0.15, a: 0.002, p: 2, v: 0.4 }] });
S('jump', { vol: 0.4, pitchVar: 0.04, max: 2, layers: [{ w: 'square', f: 300, f1: 640, t: 0.13, a: 0.002, p: 1.6, v: 0.4, lp: [3000, 3000, 0.7] }] });
S('land', { vol: 0.5, pitchVar: 0.08, max: 2, layers: [{ w: 'noise', t: 0.09, a: 0.001, p: 2, v: 0.8, lp: [700, 200, 0.7] }, { w: 'sine', f: 95, f1: 50, t: 0.1, a: 0.001, p: 2, v: 0.7 }] });
S('step', { vol: 0.22, pitchVar: 0.15, max: 3, gap: 0.08, layers: [{ w: 'noise', t: 0.045, a: 0.001, p: 2, v: 1, lp: [900, 300, 0.7] }] });
S('hurt', { vol: 0.6, pitchVar: 0.06, max: 2, gap: 0.08, layers: [
  { w: 'saw', f: 320, f1: 110, t: 0.22, a: 0.002, p: 1.8, v: 0.5, lp: [2400, 600, 0.8], dist: 0.3 },
  { w: 'noise', t: 0.1, a: 0.001, p: 2, v: 0.5, bp: [1200, 500, 0.9] }] });
S('death', { vol: 0.7, max: 1, rev: 0.4, layers: [
  { w: 'saw', f: 420, f1: 55, t: 0.9, a: 0.005, p: 1.4, v: 0.5, lp: [2200, 200, 0.8], vib: [7, 0.6] },
  { w: 'brown', t: 0.9, a: 0.01, p: 1.6, v: 0.6, lp: [800, 100, 0.7] }] });
S('growl', { vol: 0.45, pitchVar: 0.15, max: 3, gap: 0.25, layers: [{ w: 'saw', f: 95, f1: 70, t: 0.5, a: 0.06, p: 1.2, v: 0.6, lp: [700, 400, 2], vib: [13, 1.2] }, { w: 'noise', t: 0.5, a: 0.08, p: 1.4, v: 0.35, bp: [500, 350, 2] }] });
S('heartbeat', { vol: 0.6, max: 1, gap: 0.5, layers: [{ w: 'sine', f: 70, f1: 42, t: 0.14, a: 0.003, p: 2, v: 1 }, { w: 'sine', f: 65, f1: 40, t: 0.16, d: 0.2, a: 0.003, p: 2, v: 0.8 }] });
// 介面
S('click', { vol: 0.3, pitchVar: 0.02, bus: 'ui', max: 3, layers: [{ w: 'sine', f: 1250, t: 0.035, a: 0.0005, p: 2, v: 0.8 }, { w: 'noise', t: 0.008, a: 0.0002, p: 1, v: 0.4, hp: [4000, 4000, 0.7] }] });
S('hover', { vol: 0.12, pitchVar: 0.02, bus: 'ui', max: 2, gap: 0.04, layers: [{ w: 'sine', f: 2100, t: 0.02, a: 0.001, p: 2, v: 1 }] });
S('confirm', { vol: 0.35, bus: 'ui', max: 2, layers: [{ w: 'tri', f: 660, t: 0.07, a: 0.002, p: 1.5, v: 0.7 }, { w: 'tri', f: 990, t: 0.12, d: 0.06, a: 0.002, p: 2, v: 0.7 }] });
S('cancel', { vol: 0.3, bus: 'ui', max: 2, layers: [{ w: 'tri', f: 660, t: 0.07, a: 0.002, p: 1.5, v: 0.7 }, { w: 'tri', f: 440, t: 0.12, d: 0.06, a: 0.002, p: 2, v: 0.7 }] });
S('error', { vol: 0.3, bus: 'ui', max: 1, layers: [{ w: 'square', f: 196, t: 0.08, a: 0.001, h: 0.04, p: 1, v: 0.5, lp: [1800, 1800, 0.7] }, { w: 'square', f: 185, t: 0.1, d: 0.11, a: 0.001, h: 0.04, p: 1, v: 0.5, lp: [1800, 1800, 0.7] }] });
S('open', { vol: 0.3, bus: 'ui', max: 2, layers: [{ w: 'noise', t: 0.12, a: 0.02, p: 2, v: 0.6, bp: [900, 3000, 1.2] }, { w: 'sine', f: 520, f1: 880, t: 0.1, a: 0.005, p: 2, v: 0.4 }] });
S('close', { vol: 0.28, bus: 'ui', max: 2, layers: [{ w: 'noise', t: 0.1, a: 0.01, p: 2, v: 0.6, bp: [2600, 800, 1.2] }, { w: 'sine', f: 760, f1: 480, t: 0.09, a: 0.005, p: 2, v: 0.4 }] });
S('tick', { vol: 0.18, bus: 'ui', max: 4, gap: 0.03, layers: [{ w: 'sine', f: 1600, t: 0.014, a: 0.0005, p: 1.5, v: 1 }] });
S('type', { vol: 0.1, bus: 'ui', pitchVar: 0.12, max: 2, gap: 0.035, layers: [{ w: 'noise', t: 0.012, a: 0.0005, p: 2, v: 1, bp: [3200, 3200, 1.5] }, { w: 'sine', f: 1700, t: 0.012, p: 2, v: 0.3 }] });
S('notify', { vol: 0.35, bus: 'ui', max: 1, rev: 0.2, layers: [{ w: 'sine', f: 880, t: 0.2, a: 0.002, p: 2, v: 0.6, fm: [2, 0.8, 8] }, { w: 'sine', f: 1320, t: 0.3, d: 0.1, a: 0.002, p: 2, v: 0.5, fm: [2, 0.8, 8] }] });
S('card', { vol: 0.35, pitchVar: 0.1, max: 4, gap: 0.03, layers: [{ w: 'noise', t: 0.07, a: 0.01, p: 2, v: 1, bp: [2600, 4200, 1.2] }] });
S('alarm', { vol: 0.35, max: 1, layers: [{ w: 'square', f: 880, t: 0.7, a: 0.002, h: 0.65, p: 1, v: 0.35, jump: [[0.175, 0.75], [0.35, 1.333], [0.525, 0.75]], lp: [2500, 2500, 0.7] }] });
S('bell', { vol: 0.5, max: 2, rev: 0.4, layers: [{ w: 'sine', f: 660, t: 1.6, a: 0.001, p: 2.6, v: 0.7, fm: [3.5, 2.2, 2.2] }, { w: 'sine', f: 1320, t: 1.1, a: 0.001, p: 3, v: 0.25, fm: [2.4, 1, 3] }] });

/* ---- 17_music.js ---- */
/* ==========================================================================
   17 配樂：用文字寫譜、引擎即時演奏
     PZ.music.define('battle', {
       bpm: 128, swing: 0,                   // steps：每小節幾格（預設 16）
       tracks: [
         { inst: 'kick',  pat: 'x...x...x...x...' },
         { inst: 'snare', pat: '....x.......x...' },
         { inst: 'hat',   pat: 'x.x.x.x.x.x.x.x.', vol: 0.35, min: 0.4 },   // 緊張度 ≥ 0.4 才出現
         { inst: 'bass',  notes: 'A1 . A1 . . . G1 . F1 - - . F1 . G1 .' },  // 一格一個字：音名、. 休止、- 延長
         { inst: 'pad',   chords: 'Am F C G', vol: 0.3 },                     // 一小節一個和弦
         { inst: 'pluck', notes: 'A4 . C5 . E5 . C5 . …', min: 0.7 },
       ],
     });
     PZ.music.play('battle', { fade: 1.5 });   PZ.music.intensity(0.8);   PZ.music.stop({ fade: 2 });
     PZ.music.stinger('win')（播一次、自動壓低主配樂）   PZ.music.file('theme', 'music.mp3')（用音檔）
   鼓的字：x 一般、X 重音、o 輕；數字 1～9 是力度。音名：C4＝中央 Do，可寫 C#4、Eb3。
   和弦：A、Am、A7、Am7、Amaj7、Asus2、Asus4、Adim、Aaug、A6、Am6、A9、Aadd9，可加 /E 指定低音。
   樂器（取樣式，便宜）：kick snare hat ohat clap tom crash shaker rim bass sub pluck harp zither keys bell marimba arp stab
   樂器（即時合成，長音）：pad strings lead choir flute organ
   ========================================================================== */
const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteToMidi(tok) {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(tok); if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE_IDX[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CHORD_Q = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus2: [0, 2, 7], sus4: [0, 5, 7], dim: [0, 3, 6], aug: [0, 4, 8], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], 9: [0, 4, 7, 10, 14], add9: [0, 4, 7, 14], m9: [0, 3, 7, 10, 14] };
function chordNotes(name, base = 52) {
  const m = /^([A-G])([#b]?)([a-z0-9]*)(?:\/([A-G][#b]?))?$/.exec(name); if (!m) return null;
  const root = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0), q = CHORD_Q[m[3]] || CHORD_Q[''];
  // 把根音放在 base 附近（聲部不要一直跳）
  let r = base - ((base - root) % 12 + 12) % 12; if (r < base - 6) r += 12;
  const notes = q.map((iv) => r + iv);
  if (m[4]) { const b = NOTE_IDX[m[4][0]] + (m[4][1] === '#' ? 1 : m[4][1] === 'b' ? -1 : 0); notes.unshift(r - 12 + ((b - root + 12) % 12)); }
  return notes;
}
PZ.noteToMidi = noteToMidi; PZ.chordNotes = chordNotes;

/* ---------- 樂器 ---------- */
const INST = {};
const buf = (name, render) => { INST[name] = { kind: 'buf', render }; };
const node = (name, play) => { INST[name] = { kind: 'node', play }; };
function ks(f, dur, sr, bright = 0.5, damp = 0.996, seed = 1) {
  const N = Math.max(2, Math.round(sr / f)), d = new Float32Array(N), r = makeRng(seed);
  let lp = 0; for (let i = 0; i < N; i++) { lp += ((r.next() * 2 - 1) - lp) * (0.15 + bright * 0.85); d[i] = lp; }
  const len = Math.ceil(dur * sr), out = new Float32Array(len); let idx = 0;
  for (let i = 0; i < len; i++) { const a = d[idx], b = d[(idx + 1) % N]; out[i] = a; d[idx] = (a + b) * 0.5 * damp; idx = (idx + 1) % N; }
  return out;
}
buf('kick', (m, dur, sr) => synth({ vol: 1, layers: [{ w: 'sine', f: 160, f1: 44, t: 0.42, a: 0.001, p: 1.6, v: 1, dist: 0.15 }, { w: 'noise', t: 0.012, a: 0.0003, p: 1, v: 0.35, hp: [2500, 2500, 0.7] }] }, sr, 11));
buf('snare', (m, dur, sr) => synth({ vol: 0.85, layers: [{ w: 'noise', t: 0.2, a: 0.001, p: 2, v: 1, bp: [1900, 1500, 0.8] }, { w: 'tri', f: 200, f1: 160, t: 0.09, a: 0.001, p: 2, v: 0.7 }] }, sr, 12));
buf('hat', (m, dur, sr) => synth({ vol: 0.5, layers: [{ w: 'noise', t: 0.045, a: 0.0005, p: 2.5, v: 1, hp: [7500, 7500, 0.8] }] }, sr, 13));
buf('ohat', (m, dur, sr) => synth({ vol: 0.5, layers: [{ w: 'noise', t: 0.32, a: 0.001, p: 1.6, v: 1, hp: [6800, 6800, 0.8] }] }, sr, 14));
buf('clap', (m, dur, sr) => synth({ vol: 0.75, layers: [0, 0.011, 0.022].map((d) => ({ w: 'noise', d, t: d === 0.022 ? 0.18 : 0.012, a: 0.0005, p: 2, v: 1, bp: [1300, 1100, 1.4] })) }, sr, 15));
buf('tom', (m, dur, sr) => synth({ vol: 0.85, layers: [{ w: 'sine', f: midiHz(m || 48) * 1.6, f1: midiHz(m || 48), t: 0.35, a: 0.001, p: 1.8, v: 1 }, { w: 'noise', t: 0.02, p: 1, v: 0.2, lp: [3000, 3000, 0.7] }] }, sr, 16));
buf('crash', (m, dur, sr) => synth({ vol: 0.5, layers: [{ w: 'noise', t: 1.8, a: 0.002, p: 2.2, v: 1, hp: [4200, 6000, 0.6] }] }, sr, 17));
buf('shaker', (m, dur, sr) => synth({ vol: 0.35, layers: [{ w: 'noise', t: 0.07, a: 0.02, p: 2, v: 1, bp: [6500, 6500, 1.2] }] }, sr, 18));
buf('rim', (m, dur, sr) => synth({ vol: 0.5, layers: [{ w: 'noise', t: 0.02, a: 0.0005, p: 2, v: 1, bp: [2400, 2400, 3] }, { w: 'sine', f: 1700, t: 0.03, p: 2, v: 0.6 }] }, sr, 19));
buf('bass', (m, dur, sr) => { const f = midiHz(m), t = Math.min(2, dur + 0.08); return synth({ vol: 0.8, layers: [{ w: 'saw', f, t, a: 0.004, h: dur * 0.6, p: 1.4, v: 0.6, lp: [f * 7, f * 2.2, 1.1] }, { w: 'sine', f, t, a: 0.004, h: dur * 0.6, p: 1.2, v: 0.8 }] }, sr, 20); });
buf('sub', (m, dur, sr) => { const f = midiHz(m), t = Math.min(3, dur + 0.1); return synth({ vol: 0.85, layers: [{ w: 'sine', f, t, a: 0.01, h: dur * 0.7, p: 1.2, v: 1 }, { w: 'tri', f: f * 2, t, a: 0.01, h: dur * 0.5, p: 1.5, v: 0.15 }] }, sr, 21); });
buf('pluck', (m, dur, sr) => { const o = ks(midiHz(m), Math.min(2.4, dur + 0.6), sr, 0.45, 0.995, m); return normalizeBuf(o, 0.7); });
buf('harp', (m, dur, sr) => { const o = ks(midiHz(m), 2.4, sr, 0.75, 0.998, m + 3); return normalizeBuf(o, 0.65); });
buf('zither', (m, dur, sr) => { // 古箏味：亮的撥弦＋開頭往下滑一點
  const f = midiHz(m), o = ks(f * 1.012, 2.2, sr, 0.85, 0.997, m + 7);
  const t = synth({ vol: 1, norm: false, layers: [{ w: 'sine', f: f * 1.02, f1: f, t: 0.12, a: 0.001, p: 2, v: 0.15 }] }, sr, 1);
  for (let i = 0; i < t.length && i < o.length; i++) o[i] += t[i];
  return normalizeBuf(o, 0.7);
});
buf('keys', (m, dur, sr) => { const f = midiHz(m), t = Math.min(3, dur + 0.5); return synth({ vol: 0.6, layers: [{ w: 'sine', f, t, a: 0.002, h: dur * 0.3, p: 2.4, v: 0.8, fm: [1, 1.6, 2.5] }, { w: 'sine', f: f * 2, t: Math.min(t, 0.6), a: 0.001, p: 3, v: 0.2, fm: [7, 1.4, 9] }] }, sr, 22); });
buf('bell', (m, dur, sr) => { const f = midiHz(m); return synth({ vol: 0.55, layers: [{ w: 'sine', f, t: 2.2, a: 0.001, p: 2.8, v: 0.7, fm: [3.5, 2, 1.8] }, { w: 'sine', f: f * 2.01, t: 1.2, a: 0.001, p: 3, v: 0.2 }] }, sr, 23); });
buf('marimba', (m, dur, sr) => { const f = midiHz(m); return synth({ vol: 0.65, layers: [{ w: 'sine', f, t: 0.6, a: 0.001, p: 3, v: 0.9, fm: [4, 1.2, 18] }, { w: 'sine', f: f * 4, t: 0.08, a: 0.001, p: 3, v: 0.15 }] }, sr, 24); });
buf('arp', (m, dur, sr) => { const f = midiHz(m); return synth({ vol: 0.45, layers: [{ w: 'square', f, t: Math.min(0.5, dur + 0.12), a: 0.002, p: 2.2, v: 0.5, duty: 0.3, lp: [f * 10, f * 3, 1.2] }] }, sr, 25); });
buf('stab', (m, dur, sr) => { const f = midiHz(m), t = Math.min(1, dur + 0.1); return synth({ vol: 0.5, layers: [-8, 0, 8].map((c) => ({ w: 'saw', f: f * Math.pow(2, c / 1200), t, a: 0.003, h: dur * 0.3, p: 2, v: 0.35, lp: [f * 12, f * 2, 1] })) }, sr, 26); });
function normalizeBuf(o, target) { let pk = 0; for (let i = 0; i < o.length; i++) pk = Math.max(pk, Math.abs(o[i])); if (pk > 0) { const g = target / pk; for (let i = 0; i < o.length; i++) o[i] *= g; } const fd = Math.min(o.length, 400); for (let i = 0; i < fd; i++) o[o.length - 1 - i] *= i / fd; return o; }

/** 即時合成的長音樂器：c＝AudioContext、out＝輸出節點 */
function envGain(c, t0, dur, peak, a, rel, sus = 0.8) {
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.setTargetAtTime(peak * sus, t0 + a, Math.max(0.05, dur * 0.4));
  g.gain.setTargetAtTime(0.0001, t0 + Math.max(a, dur), rel / 3);
  return g;
}
function oscs(c, type, f, detunes, t0, end, dest) { for (const d of detunes) { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = d; o.connect(dest); o.start(t0); o.stop(end); } }
node('pad', (c, m, t0, dur, vel, out) => { const f = midiHz(m), rel = 1.4, g = envGain(c, t0, dur, 0.16 * vel, 0.5, rel), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(4000, f * 4); lp.Q.value = 0.5; lp.connect(g); g.connect(out); oscs(c, 'sawtooth', f, [-9, 0, 9], t0, t0 + dur + rel * 1.5, lp); });
node('strings', (c, m, t0, dur, vel, out) => { const f = midiHz(m), rel = 0.9, g = envGain(c, t0, dur, 0.14 * vel, 0.25, rel, 0.9), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(5000, f * 6); lp.connect(g); g.connect(out); oscs(c, 'sawtooth', f, [-12, -4, 5, 12], t0, t0 + dur + rel * 1.5, lp); });
node('lead', (c, m, t0, dur, vel, out) => {
  const f = midiHz(m), rel = 0.25, g = envGain(c, t0, dur, 0.13 * vel, 0.01, rel, 0.85), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(6000, f * 8); lp.Q.value = 2; lp.connect(g); g.connect(out);
  const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f; const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t0); lg.gain.linearRampToValueAtTime(f * 0.012, t0 + Math.min(0.4, dur)); lfo.connect(lg); lg.connect(o.frequency);
  o.connect(lp); o.start(t0); o.stop(t0 + dur + rel * 2); lfo.start(t0); lfo.stop(t0 + dur + rel * 2);
});
node('flute', (c, m, t0, dur, vel, out) => {
  const f = midiHz(m), rel = 0.3, g = envGain(c, t0, dur, 0.16 * vel, 0.06, rel, 0.85); g.connect(out);
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 4.8; lg.gain.value = f * 0.006; lfo.connect(lg); lg.connect(o.frequency); o.connect(g); o.start(t0); o.stop(t0 + dur + rel * 2); lfo.start(t0); lfo.stop(t0 + dur + rel * 2);
  const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2; const g2 = c.createGain(); g2.gain.value = 0.12; o2.connect(g2); g2.connect(g); o2.start(t0); o2.stop(t0 + dur + rel * 2);
});
node('choir', (c, m, t0, dur, vel, out) => {
  const f = midiHz(m), rel = 1, g = envGain(c, t0, dur, 0.22 * vel, 0.35, rel, 0.9); g.connect(out);
  const mix = c.createGain(); mix.gain.value = 1;
  for (const [ff, q, a] of [[700, 6, 1], [1150, 8, 0.6], [2600, 10, 0.25]]) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = ff; b.Q.value = q; const bg = c.createGain(); bg.gain.value = a; mix.connect(b); b.connect(bg); bg.connect(g); }
  oscs(c, 'sawtooth', f, [-7, 0, 7], t0, t0 + dur + rel * 1.5, mix);
});
node('organ', (c, m, t0, dur, vel, out) => { const f = midiHz(m), rel = 0.12, g = envGain(c, t0, dur, 0.1 * vel, 0.01, rel, 1); g.connect(out); for (const [k, a] of [[1, 1], [2, 0.5], [3, 0.3], [4, 0.2]]) { const o = c.createOscillator(); o.frequency.value = f * k; const og = c.createGain(); og.gain.value = a; o.connect(og); og.connect(g); o.start(t0); o.stop(t0 + dur + rel * 3); } });
const DRUMS = new Set(['kick', 'snare', 'hat', 'ohat', 'clap', 'crash', 'shaker', 'rim']);

/* ---------- 編曲器 ---------- */
const Music = PZ.music = { songs: {}, cur: null, level: 0.5, _bufs: new Map(), _beats: [], _beatFns: [], _timer: 0, look: 0.18 };
Music.define = (name, song) => { Music.songs[name] = song; return song; };
Music.instrument = (name, def) => { INST[name] = def; };
function tokensOf(tr, steps) {
  if (tr.chords) {
    const out = []; for (const ch of tr.chords.trim().split(/\s+/)) { out.push(ch === '.' ? '.' : ch); for (let i = 1; i < (tr.per || steps); i++) out.push('-'); }
    return out;
  }
  const src = (tr.pat || tr.notes || '').replace(/\|/g, ' ').trim();
  if (tr.pat && !/\s/.test(src)) return src.split('');
  return src.split(/\s+/).filter(Boolean);
}
function instBuf(inst, midi, dur) {
  const sr = Aud.ctx.sampleRate, key = inst + '|' + midi + '|' + (DRUMS.has(inst) ? 0 : Math.round(dur * 8));
  let b = Music._bufs.get(key);
  if (!b) {
    const data = INST[inst].render(midi, dur, sr);
    b = Aud.ctx.createBuffer(1, data.length, sr); b.getChannelData(0).set(data);
    if (Music._bufs.size > 400) Music._bufs.clear();
    Music._bufs.set(key, b);
  }
  return b;
}
function playNote(rt, tr, midi, t0, dur, vel) {
  const c = Aud.ctx, I = INST[tr.inst]; if (!I) { warnOnce('inst:' + tr.inst, '沒有這個樂器：' + tr.inst); return; }
  if (I.kind === 'node') { I.play(c, midi, t0, dur, vel, tr.out); return; }
  const s = c.createBufferSource(); s.buffer = instBuf(tr.inst, midi, dur);
  const g = c.createGain(); g.gain.value = vel; s.connect(g); g.connect(tr.out); s.start(t0);
  if (!DRUMS.has(tr.inst) && tr.inst !== 'tom') { const end = t0 + dur + 0.6; try { g.gain.setValueAtTime(vel, end - 0.08); g.gain.linearRampToValueAtTime(0, end); s.stop(end + 0.02); } catch (e) { /* ignore */ } }
}
function scheduleStep(rt, step, time) {
  const def = rt.def, sd = rt.stepDur;
  for (const tr of rt.tracks) {
    if (!tr.on) continue;
    const tok = tr.toks[step % tr.toks.length];
    if (!tok || tok === '.' || tok === '-') continue;
    let n = 1; while (n < tr.toks.length && tr.toks[(step + n) % tr.toks.length] === '-') n++;
    const dur = n * sd * (tr.gate || 0.95);
    const sw = (step % 2 === 1 ? (def.swing || 0) * sd * 0.5 : 0);
    const t = time + sw + (tr.humanize ? Rand.spread(tr.humanize) : 0);
    if (DRUMS.has(tr.inst) || tr.pat) {
      const vel = tok === 'X' ? 1.25 : tok === 'o' ? 0.45 : /^[1-9]$/.test(tok) ? +tok / 6 : 1;
      if (/^[xXo1-9]$/.test(tok)) { const mm = tr.inst === 'tom' ? (tr.note ? noteToMidi(tr.note) : 45) : 0; playNote(rt, tr, mm, t, dur, vel * (tr.vel || 1)); }
      continue;
    }
    if (tr.chords) { const ns = chordNotes(tok, tr.base || 52); if (ns) for (const m of ns) playNote(rt, tr, m + (tr.shift || 0), t, dur, (tr.vel || 1) * 0.8); continue; }
    const midi = noteToMidi(tok); if (midi != null) playNote(rt, tr, midi + (tr.shift || 0), t, dur, tr.vel || 1);
  }
  if (step % (def.steps || 16) === 0) PZ.emit('bar', step / (def.steps || 16));
  if (step % ((def.steps || 16) / 4) === 0) Music._beats.push({ t: time, n: step / ((def.steps || 16) / 4) });
}
function trackActive(tr, lv) { return lv >= (tr.def.min || 0) && lv <= (tr.def.max != null ? tr.def.max : 1); }
function runSong(rt) {
  const c = Aud.ctx; if (!c || rt.stopped) return;
  if (rt.file) return;
  while (rt.next < c.currentTime + Music.look) {
    if (rt.once && rt.step >= rt.len) { rt.stopped = true; PZ.after(rt.stepDur * 8, () => { try { rt.gain.disconnect(); } catch (e) { /* ignore */ } }, { real: true }); return; }
    scheduleStep(rt, rt.step, rt.next);
    rt.next += rt.stepDur; rt.step++;
  }
}
function makeRuntime(name, o = {}) {
  const def = Music.songs[name]; if (!def) { warnOnce('song:' + name, '沒有這首配樂：' + name); return null; }
  const c = Aud.ctx, steps = def.steps || 16, stepDur = 60 / (def.bpm || 110) / (steps / 4);
  const gain = c.createGain(); gain.gain.value = 0.0001; gain.connect(o.bus || Aud.bus.music);
  const rt = { name, def, stepDur, step: 0, next: c.currentTime + 0.06, gain, tracks: [], stopped: false, once: !!o.once || !!def.once, len: 0 };
  if (def.file) { rt.file = true; return rt; }
  for (const td of def.tracks || []) {
    const out = c.createGain(), on = trackActive({ def: td }, Music.level);
    out.gain.value = on ? (td.vol != null ? td.vol : 0.7) : 0.0001;
    let dst = out; if (td.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = td.pan; out.connect(p); dst = p; }
    dst.connect(gain);
    if (td.rev) { const rg = c.createGain(); rg.gain.value = td.rev; out.connect(rg); rg.connect(Aud.revIn); }
    const tr = Object.assign({}, td, { def: td, out, on, toks: tokensOf(td, steps) });
    rt.len = Math.max(rt.len, tr.toks.length);
    rt.tracks.push(tr);
  }
  return rt;
}
/** 播一首（同一首正在播就只調整）；o: { fade（淡入秒數）, intensity } */
Music.play = (name, o = {}) => {
  if (o.intensity != null) Music.level = o.intensity;
  Music._want = { name, o };
  if (!Aud.ctx) return; // 還沒解鎖：解鎖後自動開始
  if (Music.cur && Music.cur.name === name && !Music.cur.stopped) { Music.intensity(Music.level); return; }
  const old = Music.cur, fade = o.fade != null ? o.fade : 1.2, c = Aud.ctx;
  if (old) fadeOut(old, fade);
  const def = Music.songs[name];
  const rt = makeRuntime(name, o); if (!rt) return;
  if (def && def.file) { startFile(rt, def); }
  rt.gain.gain.setValueAtTime(0.0001, c.currentTime); rt.gain.gain.exponentialRampToValueAtTime(def && def.vol != null ? def.vol : 1, c.currentTime + Math.max(0.05, fade));
  Music.cur = rt;
  runSong(rt);
};
function fadeOut(rt, fade) {
  rt.stopped = true; const c = Aud.ctx, t = c.currentTime;
  try { rt.gain.gain.cancelScheduledValues(t); rt.gain.gain.setValueAtTime(Math.max(0.0001, rt.gain.gain.value), t); rt.gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, fade)); } catch (e) { /* ignore */ }
  if (rt.src) { try { rt.src.stop(t + fade + 0.05); } catch (e) { /* ignore */ } }
  PZ.after(fade + 0.3, () => { try { rt.gain.disconnect(); } catch (e) { /* ignore */ } }, { real: true });
}
Music.stop = (o = {}) => { Music._want = null; if (Music.cur) { fadeOut(Music.cur, o.fade != null ? o.fade : 1); Music.cur = null; } };
/** 緊張度 0～1：決定哪些聲部出現（track 的 min/max） */
Music.intensity = (v, fade = 1.2) => {
  Music.level = clamp01(v); const rt = Music.cur; if (!rt || !Aud.ctx || rt.file) return Music.level;
  const t = Aud.ctx.currentTime;
  for (const tr of rt.tracks) {
    const on = trackActive(tr, Music.level); if (on === tr.on) continue;
    tr.on = on; const target = on ? (tr.def.vol != null ? tr.def.vol : 0.7) : 0.0001;
    tr.out.gain.cancelScheduledValues(t); tr.out.gain.setValueAtTime(Math.max(0.0001, tr.out.gain.value), t); tr.out.gain.exponentialRampToValueAtTime(target, t + fade);
    if (!on) { tr.on = true; PZ.after(fade, () => { if (!trackActive(tr, Music.level)) tr.on = false; }, { real: true }); }
  }
  return Music.level;
};
/** 短樂句（過關、升級）：播一次，主配樂暫時壓低 */
Music.stinger = (name, o = {}) => {
  if (!Aud.ctx) return;
  if (Sfx.has(name) && !Music.songs[name]) { Aud.duck(0.35, o.duck || 1.2); Sfx.play(name, o); return; }
  const rt = makeRuntime(name, { once: true, bus: Aud.bus.sfx }); if (!rt) return;
  Aud.duck(0.3, rt.len * rt.stepDur + 0.5);
  rt.gain.gain.setValueAtTime(o.vol || 1, Aud.ctx.currentTime);
  (Music._stingers || (Music._stingers = [])).push(rt);
  runSong(rt);
};
/** 用音檔當配樂：PZ.music.file('theme', 'data:audio/mp3;base64,…', { vol: 0.8 }) */
Music.file = (name, url, o = {}) => { Music.songs[name] = Object.assign({ file: url, loop: true }, o); };
async function startFile(rt, def) {
  try {
    let b = Music._bufs.get('file:' + def.file);
    if (!b) { const res = await fetch(def.file), ab = await res.arrayBuffer(); b = await new Promise((ok, no) => Aud.ctx.decodeAudioData(ab, ok, no)); Music._bufs.set('file:' + def.file, b); }
    if (rt.stopped) return;
    const s = Aud.ctx.createBufferSource(); s.buffer = b; s.loop = def.loop !== false; if (def.loopStart != null) { s.loopStart = def.loopStart; s.loopEnd = def.loopEnd || b.duration; }
    s.connect(rt.gain); s.start(); rt.src = s;
  } catch (e) { reportError(e, 'music.file'); }
}
/** 每一拍呼叫（跟音樂對拍：UI 脈動、燈光閃爍） */
Music.onBeat = (fn) => { Music._beatFns.push(fn); return () => { const i = Music._beatFns.indexOf(fn); if (i >= 0) Music._beatFns.splice(i, 1); }; };
PZ.on('audio', () => { if (Music._want) Music.play(Music._want.name, Object.assign({}, Music._want.o, { fade: 1.5 })); });
addSystem({
  name: 'music', order: 32,
  frame() {
    if (!Aud.ctx) return;
    if (Music.cur) runSong(Music.cur);
    if (Music._stingers) for (let i = 0; i < Music._stingers.length; i++) { const s = Music._stingers[i]; runSong(s); if (s.stopped) Music._stingers.splice(i--, 1); }
    const t = Aud.ctx.currentTime;
    while (Music._beats.length && Music._beats[0].t <= t) { const b = Music._beats.shift(); for (const f of Music._beatFns) safeCall(f, null, b.n); }
    if (Music._beats.length > 64) Music._beats.splice(0, Music._beats.length - 64);
  },
});
// 背景時 requestAnimationFrame 會停：用計時器補排程（避免切回來時斷拍）
if (HAS_DOM) setInterval(() => { if (Aud.ctx && Aud.ctx.state === 'running' && Music.cur && document.hidden === false) runSong(Music.cur); }, 50);

/* ---- 18_save.js ---- */
/* ==========================================================================
   18 設定與存檔
   設定（PZ.settings）：音量、畫面震動、閃光、觸覺、傷害數字、畫質、鎖幀…
     每款遊戲各自記；新遊戲會沿用你上次在別款遊戲調好的偏好。
     PZ.settings.get('sfx')、PZ.settings.set('shake', 0.5)、PZ.on('setting', (k, v) => …)
   存檔（PZ.save.open）：
     const save = PZ.save.open('last-order', { version: 2, defaults: () => ({ chapter: 1, gold: 0 }), migrate(d, from) { … return d; } });
     save.data.gold += 10; save.write();        // 寫入（太頻繁會自動合併）
     save.code() → 存檔碼字串；save.load(code) → 讀存檔碼（換手機、Claude 版↔網頁版）
   保護：
     - 寫入失敗（空間滿、被擋）會退回記憶體，save.persistent 變 false（UI 可以提醒）
     - 每兩分鐘留一份備份；主存檔壞掉時自動用備份
     - 頁面被收起來（切 App、鎖螢幕）時自動寫一次
     - 版本號變了會跑 migrate，舊存檔不會壞
   ========================================================================== */
const SET_DEFAULTS = { master: 1, music: 0.7, sfx: 0.9, mute: false, shake: 1, flash: true, haptics: true, numbers: true, quality: 'auto', fpsCap: 0, mixOthers: false, textSpeed: 1, touchSize: 1 };
const SHARED_KEYS = ['master', 'music', 'sfx', 'shake', 'flash', 'haptics', 'numbers', 'mixOthers', 'textSpeed', 'touchSize'];
const Settings = PZ.settings = {
  values: Object.assign({}, SET_DEFAULTS), defaults: Object.assign({}, SET_DEFAULTS), id: 'game',
  get(k) { const v = this.values[k]; return v === undefined ? this.defaults[k] : v; },
  /** o.local：只改這款，不沿用到別款（例如把舊版的「音效：關」搬過來） */
  set(k, v, o) {
    if (this.values[k] === v) return;
    this.values[k] = v; this.apply(k);
    Store.setJSON(`pz.${this.id}.settings`, this.values);
    if (SHARED_KEYS.includes(k) && !(o && o.local)) { const g = Store.getJSON('pz.settings.last', {}); g[k] = v; Store.setJSON('pz.settings.last', g); }
    PZ.emit('setting', k, v);
  },
  /** 閃光倍率：關掉「閃光」時剩兩成五 */
  flashScale() { return this.get('flash') ? 1 : 0.25; },
  load(id, extra) {
    this.id = id || 'game';
    if (extra) Object.assign(this.defaults, extra);
    const shared = Store.getJSON('pz.settings.last', {}), mine = Store.getJSON(`pz.${this.id}.settings`, null);
    this.values = Object.assign({}, this.defaults, mine ? {} : pick(shared, SHARED_KEYS), mine || {});
    for (const k in this.values) this.apply(k);
  },
  reset() { this.values = Object.assign({}, this.defaults); Store.setJSON(`pz.${this.id}.settings`, this.values); for (const k in this.values) this.apply(k); PZ.emit('setting', '*'); },
  apply(k) {
    const v = this.get(k);
    if (k === 'music' || k === 'sfx' || k === 'master' || k === 'mute') Aud.applyVolumes();
    else if (k === 'quality') { if (v === 'auto') Quality.auto = true; else { Quality.auto = false; Quality.set(v === 'high' ? Quality.tiers.length - 1 : v === 'low' ? 0 : v === 'mid' ? 1 : +v || Quality.tier, 'setting'); } }
    else if (k === 'fpsCap') Loop.fpsCap = +v || 0;
    else if (k === 'mixOthers') setSession();
    else if (k === 'touchSize' && Screen.root) Screen.root.style.setProperty('--pz-touch-scale', String(v));
  },
};
function pick(o, keys) { const r = {}; for (const k of keys) if (o[k] !== undefined) r[k] = o[k]; return r; }

/* ---------- 存檔 ---------- */
function b64enc(s) { try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return ''; } }
function b64dec(s) { return decodeURIComponent(escape(atob(s))); }
function hash8(s) { return (hashStr(s) >>> 0).toString(36).padStart(7, '0').slice(-7); }
const clone = (o) => JSON.parse(JSON.stringify(o));

class SaveStore {
  constructor(id, o) {
    this.id = id; this.o = o; this.version = o.version || 1; this.slot = o.slot || 'main';
    this.prefix = (o.code || id.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase() || 'PZ') + this.version;
    this.data = null; this.persistent = Store.available; this.dirty = false; this._t = 0; this._bakAt = 0; this.loadedFrom = 'new';
    this.cloud = null; this.ready = Promise.resolve();
  }
  key(slot = this.slot) { return `pz.${this.id}.save.${slot}`; }
  fresh() { const d = typeof this.o.defaults === 'function' ? this.o.defaults() : clone(this.o.defaults || {}); d._v = this.version; d._ts = 0; return d; }
  /** 把讀到的資料整理成現在版本：補上新欄位、跑 migrate */
  normalize(d) {
    if (!d || typeof d !== 'object') return null;
    let v = d._v || 1;
    if (v < this.version && this.o.migrate) { try { d = this.o.migrate(d, v) || d; } catch (e) { reportError(e, 'save.migrate'); return null; } }
    if (v > this.version) warnOnce('savever', '存檔是比較新的版本做的');
    const base = this.fresh();
    for (const k in base) if (d[k] === undefined) d[k] = base[k];
    d._v = this.version;
    return d;
  }
  read(slot = this.slot) {
    for (const k of [this.key(slot), this.key(slot) + '.bak']) {
      const s = Store.get(k); if (!s) continue;
      try { const d = this.normalize(JSON.parse(s)); if (d) { this.loadedFrom = k.endsWith('.bak') ? 'backup' : 'local'; if (this.loadedFrom === 'backup') warnOnce('bak', '主存檔讀不出來，已改用備份'); return d; } } catch (e) { /* 壞掉：試下一份 */ }
    }
    return null;
  }
  /** 讀檔（沒有就用預設值）；回傳 data */
  open() { const d = this.read(); this.data = d || this.fresh(); if (!d) this.loadedFrom = 'new'; return this.data; }
  get exists() { return !!(Store.get(this.key()) || Store.get(this.key() + '.bak')); }
  /** 寫入；預設會合併 0.4 秒內的多次呼叫，now=true 立刻寫 */
  write(now) {
    this.dirty = true;
    if (now) return this.flush();
    if (!this._t) this._t = setTimeout(() => this.flush(), 400);
    return true;
  }
  flush() {
    clearTimeout(this._t); this._t = 0;
    if (!this.dirty || !this.data) return true;
    this.dirty = false;
    if (this.o.canSave && !safeCall(this.o.canSave, null, this.data)) { this.dirty = true; this._t = setTimeout(() => this.flush(), 1000); return false; } // 劇情演到一半等不能存的時候：一秒後再試
    this.data._ts = Date.now(); this.data._v = this.version;
    let s; try { s = JSON.stringify(this.data); } catch (e) { reportError(e, 'save.stringify'); return false; }
    const k = this.key(), prev = Store.get(k);
    if (prev && Date.now() - this._bakAt > 120000) { Store.set(k + '.bak', prev); this._bakAt = Date.now(); }
    const ok = Store.set(k, s);
    this.persistent = ok;
    if (!ok) warnOnce('savefail', '存檔寫不進瀏覽器（空間滿了或被擋），這次先記在記憶體裡');
    PZ.emit('save', this, ok);
    if (this.cloud) this.cloud.push();
    return ok;
  }
  /** 從頭開始（舊的留一份備份） */
  reset() { const k = this.key(), prev = Store.get(k); if (prev) Store.set(k + '.bak', prev); this.data = this.fresh(); this.loadedFrom = 'new'; this.write(true); return this.data; }
  /** 存檔碼 */
  code() { const s = JSON.stringify(Object.assign({}, this.data, { _ts: this.data._ts || Date.now() })); return `${this.prefix}.${b64enc(s)}.${hash8(s)}`; }
  decode(code) {
    try {
      code = String(code).trim().replace(/\s+/g, '');
      const parts = code.split('.'); if (parts.length < 3) return null;
      const s = b64dec(parts[1]); if (hash8(s) !== parts[2]) return null;
      return this.normalize(JSON.parse(s));
    } catch (e) { return null; }
  }
  /** 讀存檔碼：成功回傳 true（會立刻寫入這台裝置） */
  load(code) { const d = this.decode(code); if (!d) return false; this.data = d; this.loadedFrom = 'code'; this.write(true); PZ.emit('saveload', this); return true; }
  /** 多存檔欄：列出、切換、刪除 */
  slots() { return Store.keys(`pz.${this.id}.save.`).filter((k) => !k.endsWith('.bak')).map((k) => { const slot = k.slice(`pz.${this.id}.save.`.length); const d = Store.getJSON(k, null); return { slot, ts: d && d._ts, data: d }; }); }
  use(slot) { this.flush(); this.slot = slot; return this.open(); }
  remove(slot = this.slot) { Store.remove(this.key(slot)); Store.remove(this.key(slot) + '.bak'); if (slot === this.slot) this.data = this.fresh(); }
}
const Saves = [];
PZ.save = {
  open(id, o = {}) {
    const s = new SaveStore(id, o); s.open(); Saves.push(s);
    if (o.cloud !== false && Env.claude) s.cloud = Cloud.attach(s, o);
    return s;
  },
};
// 頁面要被收起來：所有存檔立刻寫
PZ.on('hidden', () => { for (const s of Saves) { s.flush(); if (s.cloud) s.cloud.now(); } });
// 加到主畫面的 App：請瀏覽器不要清掉資料
if (HAS_DOM && Env.standalone && navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) { /* ignore */ } }

/* ---- 19_cloud.js ---- */
/* ==========================================================================
   19 雲端存檔（只有 Claude 版會動）
   Claude 版的頁面可以把每個人自己的存檔放在頁面外面（db 的 data/users/<自己>/<存檔欄>）：
   換裝置、清掉瀏覽器資料都接得回來。網頁版沒有 window.claude，這段完全不動——兩個版本同一份程式。
   ※ 發布到 Claude 之後要宣告能力 { db: {}, user: {} } 才會動（見說明書「發布」）。
   規則（沿用《墜庭》驗證過的做法）：
   - 本機存檔照舊立刻寫；雲端內容真的變了才寫、隔幾秒寫一次、一次一筆。
   - 開機比兩邊的時間：雲端比較新而且這台同步過 → 直接接上；這台有沒同步的進度 → 問玩家要哪份。
   - save.ready：雲端回話前（最多 5 秒）讓標題畫面的「開始」先等一下，免得新遊戲蓋掉另一台的進度。
   - 頁面收起來時，等著寫的那一筆馬上送。
   - 暫時的錯誤自己重試（先隔幾秒、再不行每半分鐘）；沒權限、被收回這類就當「這次沒有雲端」。
   ========================================================================== */
const CLOUD_END = { invalid_argument: 1, quota_exceeded: 1, revoked: 1, not_granted: 1, capability_disabled: 1, capability_removed: 1, transform_error: 1, permission_denied: 1 };
const Cloud = PZ.cloud = {
  attach(save, o) {
    const c = { state: 'wait', doc: null, remote: null, busy: false, dirty: false, timer: 0, failAt: 0, wait: 0, fails: 0, okAt: 0, sig: '', asked: false };
    const syncKey = `pz.${save.id}.sync.${save.slot}`;
    const sigOf = (d) => { try { const x = Object.assign({}, d); delete x._ts; if (o.volatile) for (const k of o.volatile) delete x[k]; return JSON.stringify(x); } catch (e) { return String(Math.random()); } };
    const describe = (d) => (o.describe ? safeCall(o.describe, null, d) : '') || new Date(d._ts || 0).toLocaleString('zh-TW');
    c.push = (now) => {
      if (c.state !== 'on' || c.asking) return; c.dirty = true;
      if (c.busy || c.timer || Date.now() - c.failAt < c.wait) return;
      c.timer = setTimeout(flush, now ? 50 : 4000);
    };
    c.now = () => { if (c.state !== 'on' || !c.dirty || c.busy || Date.now() - c.failAt < c.wait) return; clearTimeout(c.timer); c.timer = 0; flush(); };
    async function flush() {
      c.timer = 0; if (c.state !== 'on' || c.busy || !c.dirty) return;
      const d = save.data; if (!d) return;
      const sig = sigOf(d); c.dirty = false;
      if (sig === c.sig) return;
      c.busy = true;
      try {
        await c.doc.set({ v: 1, code: save.code(), ts: d._ts || Date.now(), note: String(describe(d)).slice(0, 120) });
        c.sig = sig; c.okAt = Date.now(); c.fails = 0; c.wait = 0; Store.set(syncKey, String(d._ts || 0));
        PZ.emit('cloud', 'saved', save);
      } catch (e) {
        const code = e && e.code;
        if (CLOUD_END[code]) { c.state = 'off'; PZ.emit('cloud', 'off', save); }
        else { c.dirty = true; c.failAt = Date.now(); c.wait = code === 'resource_exhausted' || c.fails++ ? 30000 : 2000 + Math.random() * 3000; setTimeout(() => c.push(true), c.wait + 80); }
      }
      c.busy = false; if (c.dirty) c.push();
    }
    c.adopt = (d) => { save.data = d; save.loadedFrom = 'cloud'; Store.set(save.key(), JSON.stringify(d)); Store.set(syncKey, String(d._ts || 0)); c.sig = sigOf(d); PZ.emit('saveload', save); };
    async function settle() {
      const R = c.remote, local = save.read(), synced = +(Store.get(syncKey) || 0);
      if (R) c.sig = sigOf(R.d);
      if (!R) { if (local) c.push(true); return; }
      const lts = local ? local._ts || 0 : -1;
      if (lts === R.ts) { Store.set(syncKey, String(R.ts)); return; }
      if (local && lts > R.ts && lts !== synced) { c.push(true); return; }            // 這台比較新
      if (!local || lts === synced) { c.adopt(R.d); return; }                          // 雲端比較新、這台沒有別的進度
      // 兩邊都有沒同步過的進度：問玩家
      c.asking = true;
      const yes = await UI.confirm({ title: '有兩份進度', body: `<div class="pz-two">這台裝置：${describe(local)}<br>另一台裝置：${describe(R.d)}</div><div class="pz-hint">只能留一份，沒選的那份會被蓋掉。</div>`, ok: '接另一台的', cancel: '留這台的' });
      c.asking = false;
      if (yes) c.adopt(R.d); else c.push(true);
    }
    save.ready = (async () => {
      try {
        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        if (!db || !user) throw new Error('none');
        const uid = await user.id(); if (!uid) throw new Error('no id');
        c.doc = db.doc(`data/users/${uid}/${save.slot === 'main' ? 'save' : 'save-' + save.slot}`);
        const snap = await Promise.race([c.doc.get(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 9000))]);
        const x = snap && snap.exists ? snap.data() : null, d = x && typeof x.code === 'string' ? save.decode(x.code) : null;
        c.remote = d ? { d, ts: d._ts || +x.ts || 0 } : null;
        c.state = 'on';
      } catch (e) { c.state = 'off'; }
      try { if (c.state === 'on') await settle(); } catch (e) { reportError(e, 'cloud.settle'); }
      PZ.emit('cloud', c.state, save);
    })();
    // 最多等 5 秒
    const raw = save.ready; save.ready = Promise.race([raw, new Promise((r) => setTimeout(r, 5000))]);
    /** 設定頁的一行說明 */
    c.note = () => {
      if (c.state === 'wait') return '正在連上你的帳號……';
      if (c.state !== 'on') return '這次沒連上你的帳號：進度先只存在這台裝置。';
      const m = c.okAt ? Math.floor((Date.now() - c.okAt) / 60000) : -1;
      return '進度也跟著你的 Claude 帳號走：換一台裝置打開會自己接上。' + (m >= 0 ? `（${m < 1 ? '剛剛' : m + ' 分鐘前'}同步過）` : '');
    };
    return c;
  },
};

/* ---- 20_scene.js ---- */
/* ==========================================================================
   20 場景
     PZ.scene('play', {
       enter(params) { … },          // 進場（可以是 async：載入中會蓋著轉場）
       exit() { … },
       update(dt) { … },             // 遊戲邏輯（暫停、停頓時不會被呼叫）
       render(g) { … },              // 畫圖：一開始是世界座標；g.hud() 之後畫 HUD
       bg: '#101418',                // 底色
       ui: () => '<div class="hud">…</div>',   // 這個場景的 DOM 介面（進場放進 #pz-ui，離場拿掉）
       keepCamera: false,            // 換場景時要不要保留相機
     });
     await PZ.go('play', { stage: 2 }, { type: 'fade', time: 0.35, color: '#000' });   // 轉場：fade｜iris｜wipe｜none
   換場景時會清掉：遊戲時間的計時器與補間、粒子、跳字、震動、按住的按鍵。
   ========================================================================== */
const Scenes = PZ.scenes = { defs: {}, cur: null, name: '', trans: null, busy: false, uiEl: null };
PZ.scene = (name, def) => { def.name = name; Scenes.defs[name] = def; return def; };
PZ.go = async (name, params, o = {}) => {
  const def = Scenes.defs[name]; if (!def) throw new Error('沒有這個場景：' + name);
  if (Scenes.busy) { Scenes._queued = [name, params, o]; return; }
  Scenes.busy = true;
  const type = o.type || (Scenes.cur ? 'fade' : 'none'), time = o.time != null ? o.time : 0.35;
  const T = { type, t: 0, time, phase: 'out', color: toColor(o.color || '#000'), cx: o.cx, cy: o.cy };
  if (type !== 'none' && Scenes.cur) { Scenes.trans = T; await waitPhase(T); }
  // 離開舊場景
  const old = Scenes.cur;
  if (old) {
    if (old.exit) safeCall(old.exit, old);
    for (const sp of Springs) if (sp.scene === Scenes.name) sp.dead = true;
    // 這個場景建的虛擬搖桿、按鈕一起拿掉（在 load 裡、或加了 keep:true 建的會留著）
    for (const s of Sticks.slice()) if (s.scene && s.scene === Scenes.name) s.remove();
    for (const b of TButtons.slice()) if (b.scene && b.scene === Scenes.name) b.remove();
  }
  if (Scenes.uiEl) { Scenes.uiEl.remove(); Scenes.uiEl = null; }
  PZ.clearTimers(); Tweens.clear(); Particles.clear(); Fx.nums.length = 0; Input.releaseAll();
  Cam.trauma = 0; if (!def.keepCamera) Cam.reset();
  Post.waves.length = 0; Fx._waves.length = 0; Post.flash[3] = 0; PZ.resume('*');
  Scenes.cur = def; Scenes.name = name;
  if (def.ui) {
    const u = typeof def.ui === 'function' ? def.ui(params) : def.ui;
    const box = el('div', 'pz-scene-ui pz-scene-' + name);
    if (typeof u === 'string') box.innerHTML = u; else if (u) box.appendChild(u);
    Screen.ui.appendChild(box); Scenes.uiEl = box; UI.enhance(box);
  }
  if (def.enter) { try { await def.enter(params); } catch (e) { reportError(e, name + '.enter'); } }
  PZ.emit('scene', name, params);
  if (type !== 'none') { T.phase = 'in'; T.t = 0; if (!Scenes.trans) Scenes.trans = T; await waitPhase(T); }
  Scenes.trans = null; Scenes.busy = false;
  if (Scenes._queued) { const q = Scenes._queued; Scenes._queued = null; PZ.go(q[0], q[1], q[2]); }
};
function waitPhase(T) { return new Promise((res) => { T.done = res; }); }
PZ.restartScene = (params, o) => PZ.go(Scenes.name, params, o);

function drawTransition(g) {
  const T = Scenes.trans; if (!T) return;
  T.t += Time.rdt;
  let k = clamp01(T.t / Math.max(0.001, T.time));
  const cover = T.phase === 'out' ? Ease.inOutQuad(k) : 1 - Ease.inOutQuad(k);
  const W = Screen.w, H = Screen.h, col = T.color;
  if (T.type === 'iris') {
    const cx = T.cx != null ? T.cx : W / 2, cy = T.cy != null ? T.cy : H / 2, R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 4, r = R * (1 - cover);
    if (cover > 0.001) g.ring(cx, cy, R + 2, R + 2 - r, col);
  } else if (T.type === 'wipe') {
    const w = (W + H * 0.6) * cover;
    g.save(); g.translate(-H * 0.3, 0); g.poly([0, 0, w, 0, w - H * 0.3, H, -H * 0.3, H], col); g.restore();
  } else if (cover > 0.001) g.rect(0, 0, W, H, col, { a: cover });
  if (k >= 1 && T.done) { const d = T.done; T.done = null; d(); }
}

addSystem({
  name: 'scene', order: 0,
  update(dt) { const s = Scenes.cur; if (s && s.update && !Scenes.busy) { try { s.update(dt); } catch (e) { reportError(e, Scenes.name + '.update'); } } else if (s && s.update && Scenes.trans && Scenes.trans.phase === 'in') { try { s.update(dt); } catch (e) { reportError(e, Scenes.name + '.update'); } } },
});
addSystem({
  name: 'draw', order: 100,
  render() {
    const r = Gfx.r; if (!r) return;
    const s = Scenes.cur;
    r.begin(s && s.bg != null ? s.bg : Screen.bg);
    G._hudDone = false; G.world();
    if (s && s.render) { try { s.render(G); } catch (e) { reportError(e, Scenes.name + '.render'); } }
    if (!G._hudDone) G.hud();
    drawTransition(G);
    r.end();
  },
});

/* ---- 21_ui.js ---- */
/* ==========================================================================
   21 介面元件（DOM，疊在畫布上）
   外觀用 CSS 變數決定，每款遊戲自己定：PZ.ui.theme({ accent: '#e33', panel: '…', font: '…' })
   內建主題：PZ.ui.theme('night' | 'ink' | 'neon' | 'steel' | 'paper')
   元件：
     await PZ.ui.alert('標題', '內容')                 await PZ.ui.confirm({ title, body, ok, cancel }) → true/false
     await PZ.ui.choose({ title, body, options: [{ label, value, desc, disabled }] }) → value
     await PZ.ui.modal({ title, body, buttons: [{ label, value, primary }], wide }) → value
     PZ.ui.toast('撿到 金幣 ×3', { kind: 'good' })   PZ.ui.banner('BOSS 來襲', { sub: '屍王', style: 'boss' })
     PZ.ui.settings({ save })   標準設定頁（音量、震動、閃光、觸覺、數字、畫質、存檔碼、雲端）
     PZ.ui.pause({ items: [{ label, onClick }] })   標準暫停選單
   所有 .pz-btn 自動有按下音效、觸覺、按壓動畫；鍵盤方向鍵／手把十字鍵可以移動焦點，A／Enter 按、B／Esc 返回。
   ========================================================================== */
const ENGINE_CSS = "html,body{margin:0;padding:0;height:100%;overflow:hidden;overscroll-behavior:none;background:#000}body{-webkit-text-size-adjust:100%;text-size-adjust:100%}#pz-root{--pz-font:\"PZ Sans\",\"Noto Sans TC\",\"PingFang TC\",\"Heiti TC\",\"Microsoft JhengHei\",system-ui,sans-serif;--pz-font-display:var(--pz-font);--pz-text:#eef2f8;--pz-dim:rgba(238,242,248,.6);--pz-faint:rgba(238,242,248,.32);--pz-bg:rgba(6,8,14,.6);--pz-panel:rgba(16,20,30,.92);--pz-panel2:rgba(255,255,255,.05);--pz-line:rgba(255,255,255,.12);--pz-accent:#ffb547;--pz-accent2:#46d4ff;--pz-good:#5fe39a;--pz-bad:#ff4d5e;--pz-on-accent:#1a1206;--pz-radius:16px;--pz-radius-s:10px;--pz-shadow:0 24px 60px rgba(0,0,0,.55),0 2px 0 rgba(255,255,255,.04) inset;--pz-blur:10px;--pz-ease:cubic-bezier(.2,.9,.25,1.15);--pz-touch-scale:1;position:fixed;inset:0;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;font-family:var(--pz-font);color:var(--pz-text);line-height:1.5;font-feature-settings:\"palt\" 0;text-rendering:optimizeLegibility;contain:strict}#pz-canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;image-rendering:auto}#pz-touch{position:absolute;inset:0;pointer-events:none;z-index:5}#pz-touch.pz-hide{display:none}#pz-ui{position:absolute;inset:0;pointer-events:none;z-index:10}#pz-ui button,#pz-ui a,#pz-ui input,#pz-ui select,#pz-ui textarea,#pz-ui label,#pz-ui [data-ui],#pz-ui .pz-block{pointer-events:auto}.pz-scene-ui{position:absolute;inset:0;pointer-events:none}.pz-stick-zone{position:absolute;pointer-events:auto;touch-action:none}.pz-stick{position:absolute;transform:translate(-50%,-50%) scale(var(--pz-touch-scale));border-radius:50%;opacity:0;transition:opacity .18s;background:radial-gradient(circle,rgba(255,255,255,.06) 0 55%,rgba(255,255,255,.14) 56% 58%,rgba(255,255,255,.03) 59%);box-shadow:0 0 0 1px rgba(255,255,255,.1) inset;pointer-events:none}.pz-stick.on,.pz-stick.fixed{opacity:1}.pz-stick.fixed{transform:translate(-50%,50%) scale(var(--pz-touch-scale));opacity:.55}.pz-stick.fixed.on{opacity:1}.pz-stick-knob{position:absolute;left:50%;top:50%;width:42%;height:42%;margin:-21% 0 0 -21%;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.95),rgba(220,230,245,.75) 60%,rgba(160,175,200,.7));box-shadow:0 4px 14px rgba(0,0,0,.45),0 0 0 2px rgba(255,255,255,.25);transition:transform .03s linear}.pz-tbtn{position:absolute;pointer-events:auto;touch-action:none;border:0;padding:0;border-radius:50%;display:grid;place-items:center;color:#fff;font:900 15px/1 var(--pz-font);letter-spacing:.04em;background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.22),rgba(255,255,255,.06) 62%),rgba(10,14,22,.42);box-shadow:0 0 0 1.5px rgba(255,255,255,.28) inset,0 8px 22px rgba(0,0,0,.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transform:scale(var(--pz-touch-scale));transition:transform .08s,background .12s}.pz-tbtn svg{width:46%;height:46%}.pz-tbtn.on{transform:scale(calc(var(--pz-touch-scale) * .9));background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.4),rgba(255,255,255,.12) 62%),rgba(10,14,22,.5)}.pz-tbtn.off{opacity:.4}.pz-tbtn.cd::after{content:\"\";position:absolute;inset:0;border-radius:50%;background:conic-gradient(rgba(0,0,0,.62) calc(var(--pz-cd,0) * 360deg),transparent 0)}.pz-tbtn[data-badge]:not([data-badge=\"\"])::before{content:attr(data-badge);position:absolute;right:-2px;top:-2px;min-width:20px;height:20px;padding:0 5px;box-sizing:border-box;border-radius:10px;background:var(--pz-accent);color:var(--pz-on-accent);font:900 12px/20px var(--pz-font);text-align:center;z-index:1}.pz-tbtn-label{position:relative;z-index:1;text-shadow:0 1px 2px rgba(0,0,0,.6)}.pz-btn{-webkit-appearance:none;appearance:none;border:0;cursor:pointer;font:800 16px/1.2 var(--pz-font);letter-spacing:.06em;color:var(--pz-text);padding:14px 22px;min-height:48px;min-width:48px;border-radius:var(--pz-radius-s);background:var(--pz-panel2);box-shadow:0 0 0 1px var(--pz-line) inset;transition:transform .12s var(--pz-ease),background .15s,box-shadow .15s,opacity .15s;position:relative;outline:none}.pz-btn:hover{background:rgba(255,255,255,.1)}.pz-btn:active,.pz-btn.pz-press{transform:scale(.95)}.pz-btn.primary{background:linear-gradient(180deg,color-mix(in srgb,var(--pz-accent) 92%,#fff),var(--pz-accent));color:var(--pz-on-accent);box-shadow:0 8px 24px color-mix(in srgb,var(--pz-accent) 35%,transparent),0 -2px 0 rgba(0,0,0,.2) inset}.pz-btn.danger{background:color-mix(in srgb,var(--pz-bad) 22%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--pz-bad) 60%,transparent) inset}.pz-btn.ghost{background:transparent;box-shadow:none;color:var(--pz-dim)}.pz-btn[disabled],.pz-btn.disabled{opacity:.38;pointer-events:none}.pz-btn.pz-focus,.pz-focusable.pz-focus{box-shadow:0 0 0 2px var(--pz-accent2),0 0 22px color-mix(in srgb,var(--pz-accent2) 45%,transparent)}.pz-btn.wide{width:100%}.pz-modal-wrap{position:absolute;inset:0;display:grid;place-items:center;padding:max(16px,var(--pz-safe-t,0px)) max(16px,var(--pz-safe-r,0px)) max(16px,var(--pz-safe-b,0px)) max(16px,var(--pz-safe-l,0px));background:var(--pz-bg);pointer-events:auto;z-index:50;opacity:0;transition:opacity .2s;backdrop-filter:blur(var(--pz-blur));-webkit-backdrop-filter:blur(var(--pz-blur))}#pz-touch{transition:opacity .2s}#pz-touch.pz-ui-open{opacity:0;pointer-events:none}#pz-touch.pz-ui-open *{pointer-events:none !important}.pz-modal-wrap.on{opacity:1}.pz-modal{width:min(440px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;padding:22px 20px 18px;border-radius:var(--pz-radius);background:var(--pz-panel);box-shadow:var(--pz-shadow),0 0 0 1px var(--pz-line) inset;transform:translateY(14px) scale(.96);transition:transform .32s var(--pz-ease)}.pz-modal-wrap.on .pz-modal{transform:none}.pz-modal.wide{width:min(640px,100%)}.pz-modal h2{margin:0 0 10px;font:900 21px/1.3 var(--pz-font-display);letter-spacing:.06em}.pz-modal .pz-body{color:var(--pz-dim);font-size:15px;line-height:1.75;overflow:auto;overscroll-behavior:contain;touch-action:pan-y;min-height:0;flex:0 1 auto;margin:0 -6px;padding:0 6px}.pz-modal h2,.pz-modal .pz-actions{flex:none}.pz-modal .pz-list{overflow:auto;min-height:0;touch-action:pan-y}.pz-modal .pz-body b,.pz-modal .pz-body strong{color:var(--pz-text)}.pz-modal .pz-actions{display:flex;gap:10px;margin-top:18px}.pz-modal .pz-actions .pz-btn{flex:1}.pz-modal .pz-list{display:grid;gap:8px;margin-top:14px}.pz-modal .pz-list .pz-btn{text-align:left;display:flex;flex-direction:column;gap:3px;align-items:flex-start}.pz-modal .pz-list .pz-btn small{font-weight:500;color:var(--pz-dim);letter-spacing:.02em;font-size:13px}.pz-hint{color:var(--pz-faint);font-size:13px;margin-top:8px}.pz-two{text-align:left;line-height:1.9}.pz-set{display:grid;gap:4px;margin-top:6px}.pz-set-row{display:flex;align-items:center;gap:12px;padding:10px 2px;border-bottom:1px solid var(--pz-line)}.pz-set-row:last-child{border-bottom:0}.pz-set-row>span{flex:1;font-weight:700;font-size:15px}.pz-set-row>span small{display:block;font-weight:400;color:var(--pz-faint);font-size:12px}.pz-set h3{margin:14px 0 2px;font-size:12px;letter-spacing:.2em;color:var(--pz-accent);font-weight:900}.pz-range{-webkit-appearance:none;appearance:none;width:46%;height:30px;background:transparent;touch-action:pan-x}.pz-range::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:linear-gradient(90deg,var(--pz-accent) var(--v,50%),rgba(255,255,255,.14) var(--v,50%))}.pz-range::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;margin-top:-9px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.5)}.pz-range::-moz-range-track{height:6px;border-radius:3px;background:rgba(255,255,255,.14)}.pz-range::-moz-range-progress{height:6px;border-radius:3px;background:var(--pz-accent)}.pz-range::-moz-range-thumb{width:22px;height:22px;border:0;border-radius:50%;background:#fff}.pz-toggle{position:relative;width:52px;height:30px;border-radius:15px;border:0;padding:0;background:rgba(255,255,255,.16);transition:background .2s;cursor:pointer}.pz-toggle::after{content:\"\";position:absolute;left:3px;top:3px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.4);transition:transform .25s var(--pz-ease)}.pz-toggle.on{background:var(--pz-accent)}.pz-toggle.on::after{transform:translateX(22px)}.pz-seg{display:flex;border-radius:10px;overflow:hidden;box-shadow:0 0 0 1px var(--pz-line) inset}.pz-seg button{border:0;background:transparent;color:var(--pz-dim);font:700 13px/1 var(--pz-font);padding:9px 10px;cursor:pointer}.pz-seg button.on{background:var(--pz-accent);color:var(--pz-on-accent)}.pz-code{width:100%;box-sizing:border-box;min-height:74px;resize:none;border-radius:10px;border:0;padding:10px;font:12px/1.4 ui-monospace,monospace;color:var(--pz-text);background:rgba(0,0,0,.35);box-shadow:0 0 0 1px var(--pz-line) inset;user-select:text;-webkit-user-select:text;touch-action:auto}.pz-toasts{position:absolute;left:50%;top:calc(14px + var(--pz-safe-t,0px));transform:translateX(-50%);display:grid;gap:8px;justify-items:center;z-index:60;pointer-events:none;width:min(92vw,420px)}.pz-toast{padding:10px 16px;border-radius:999px;background:rgba(12,16,26,.88);box-shadow:0 10px 30px rgba(0,0,0,.4),0 0 0 1px var(--pz-line) inset;font-weight:700;font-size:14px;display:flex;gap:8px;align-items:center;animation:pz-toast-in .38s var(--pz-ease) both;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.pz-toast.good{box-shadow:0 10px 30px rgba(0,0,0,.4),0 0 0 1px color-mix(in srgb,var(--pz-good) 70%,transparent) inset}.pz-toast.bad{box-shadow:0 10px 30px rgba(0,0,0,.4),0 0 0 1px color-mix(in srgb,var(--pz-bad) 70%,transparent) inset}.pz-toast.out{animation:pz-toast-out .3s ease-in both}@keyframes pz-toast-in{from{opacity:0;transform:translateY(-14px) scale(.9)}}@keyframes pz-toast-out{to{opacity:0;transform:translateY(-10px) scale(.96)}}.pz-banner{position:absolute;left:0;right:0;top:38%;transform:translateY(-50%);text-align:center;z-index:55;pointer-events:none}.pz-banner .pz-b-main{display:inline-block;font:900 clamp(30px,8vw,64px)/1.1 var(--pz-font-display);letter-spacing:.12em;padding:6px 26px;color:#fff;text-shadow:0 0 24px color-mix(in srgb,var(--pz-accent) 70%,transparent),0 4px 0 rgba(0,0,0,.35);animation:pz-ban-in .55s var(--pz-ease) both}.pz-banner .pz-b-sub{font:700 clamp(13px,3.4vw,17px)/1.4 var(--pz-font);letter-spacing:.3em;color:var(--pz-accent);margin-top:6px;animation:pz-fade-up .5s .12s both}.pz-banner::before{content:\"\";position:absolute;left:0;right:0;top:50%;height:120%;transform:translateY(-50%) scaleY(var(--s,1));background:linear-gradient(90deg,transparent,rgba(0,0,0,.55) 20%,rgba(0,0,0,.55) 80%,transparent);z-index:-1;animation:pz-ban-bar .5s var(--pz-ease) both}.pz-banner.boss .pz-b-main{color:#ffe1e1;text-shadow:0 0 30px rgba(255,40,60,.85),0 4px 0 rgba(0,0,0,.4)}.pz-banner.boss .pz-b-sub{color:#ff6b7a}.pz-banner.out{animation:pz-ban-out .35s ease-in both}@keyframes pz-ban-in{from{opacity:0;transform:scale(1.6);letter-spacing:.5em;filter:blur(6px)}}@keyframes pz-ban-bar{from{transform:translateY(-50%) scaleY(0)}}@keyframes pz-ban-out{to{opacity:0;transform:translateY(-50%) scale(.96)}}@keyframes pz-fade-up{from{opacity:0;transform:translateY(10px)}}.pz-say{position:absolute;left:0;right:0;bottom:0;padding:0 max(12px,var(--pz-safe-r,0px)) max(14px,calc(var(--pz-safe-b,0px) + 8px)) max(12px,var(--pz-safe-l,0px));z-index:40;pointer-events:auto;display:flex;justify-content:center}.pz-say-box{position:relative;width:min(760px,100%);min-height:132px;box-sizing:border-box;padding:22px 20px 18px;border-radius:var(--pz-radius);background:var(--pz-panel);box-shadow:var(--pz-shadow),0 0 0 1px var(--pz-line) inset;animation:pz-fade-up .3s var(--pz-ease) both;cursor:pointer}.pz-say-name{position:absolute;left:18px;top:-15px;padding:5px 14px;border-radius:8px;background:var(--pz-accent);color:var(--pz-on-accent);font:900 14px/1.2 var(--pz-font);letter-spacing:.12em}.pz-say-text{font-size:17px;line-height:1.85;letter-spacing:.03em;min-height:3.6em}.pz-say.narr .pz-say-text{color:var(--pz-dim);font-style:normal}.pz-say-more{position:absolute;right:16px;bottom:10px;width:10px;height:10px;border-right:2px solid var(--pz-accent);border-bottom:2px solid var(--pz-accent);transform:rotate(45deg);animation:pz-bob .9s ease-in-out infinite;opacity:0}.pz-say.done .pz-say-more{opacity:1}@keyframes pz-bob{50%{transform:translateY(4px) rotate(45deg)}}.pz-say-face{position:absolute;bottom:calc(100% - 24px);left:6px;width:min(36vw,220px);pointer-events:none;animation:pz-fade-up .35s var(--pz-ease) both;filter:drop-shadow(0 10px 20px rgba(0,0,0,.5))}.pz-say-face img,.pz-say-face canvas{width:100%;height:auto;display:block}.pz-say.right .pz-say-face{left:auto;right:6px}.pz-say-tools{position:absolute;right:14px;top:-16px;display:flex;gap:6px}.pz-say-tools button{border:0;border-radius:8px;padding:5px 10px;font:700 12px/1 var(--pz-font);color:var(--pz-dim);background:rgba(20,24,34,.9);box-shadow:0 0 0 1px var(--pz-line) inset;cursor:pointer}.pz-say-tools button.on{color:var(--pz-on-accent);background:var(--pz-accent)}.pz-choices{display:grid;gap:8px;margin-top:12px}.pz-choices .pz-btn{text-align:left}.pz-log{max-height:60vh;overflow:auto;text-align:left;touch-action:pan-y}.pz-log p{margin:0 0 10px;color:var(--pz-dim)}.pz-log b{color:var(--pz-accent);margin-right:6px}.pz-loading{position:absolute;inset:0;display:grid;place-items:center;z-index:90;background:#000;pointer-events:auto;transition:opacity .4s}.pz-loading.out{opacity:0;pointer-events:none}.pz-loading-box{width:min(260px,70vw);text-align:center}.pz-loading-title{font:900 22px/1.3 var(--pz-font-display);letter-spacing:.14em;margin-bottom:16px}.pz-loading-bar{height:3px;border-radius:2px;background:rgba(255,255,255,.12);overflow:hidden}.pz-loading-bar i{display:block;height:100%;width:0;background:var(--pz-accent);box-shadow:0 0 12px var(--pz-accent);transition:width .2s}.pz-loading-note{margin-top:10px;font-size:12px;color:var(--pz-faint);letter-spacing:.1em}.pz-rotate{position:absolute;inset:0;z-index:200;background:#05070b;display:none;place-items:center;text-align:center;font-weight:800;letter-spacing:.1em;pointer-events:auto}.pz-rotate.on{display:grid}.pz-rotate-icon{width:54px;height:86px;margin:0 auto 18px;border:3px solid var(--pz-text);border-radius:10px;animation:pz-rot 1.6s ease-in-out infinite}@keyframes pz-rot{40%,70%{transform:rotate(90deg)}}.pz-err{position:fixed;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(560px,calc(100vw - 24px));z-index:2147483000;box-sizing:border-box;padding:14px 14px 12px;border-radius:14px;background:rgba(28,10,14,.96);color:#ffe8ea;font:13px/1.5 var(--pz-font);box-shadow:0 20px 50px rgba(0,0,0,.6),0 0 0 1px rgba(255,90,110,.5) inset;pointer-events:auto}.pz-err b{display:block;font-size:15px;margin-bottom:4px}.pz-err pre{margin:6px 0 10px;max-height:30vh;overflow:auto;white-space:pre-wrap;word-break:break-all;font:11px/1.45 ui-monospace,monospace;color:#ffc7cd;background:rgba(0,0,0,.3);padding:8px;border-radius:8px;user-select:text;-webkit-user-select:text}.pz-err .pz-err-b{display:flex;gap:8px}.pz-err button{flex:1;border:0;border-radius:9px;padding:9px;font:800 13px/1 var(--pz-font);color:#fff;background:rgba(255,255,255,.12);cursor:pointer}.pz-stats{position:fixed;left:max(6px,env(safe-area-inset-left));top:max(6px,env(safe-area-inset-top));z-index:2147482000;pointer-events:none;padding:6px 8px;border-radius:8px;background:rgba(0,0,0,.66);color:#b9ffcf;font:11px/1.35 ui-monospace,monospace;white-space:pre}@media (prefers-reduced-motion:reduce){.pz-banner .pz-b-main,.pz-toast,.pz-modal{animation-duration:.01s !important;transition-duration:.01s !important}}";
const THEMES = {
  night: {},
  ink: { text: '#1c1712', dim: 'rgba(28,23,18,.68)', faint: 'rgba(28,23,18,.4)', bg: 'rgba(236,228,212,.72)', panel: 'rgba(246,240,228,.97)', panel2: 'rgba(28,23,18,.06)', line: 'rgba(28,23,18,.18)', accent: '#b8232f', accent2: '#2c5d8a', 'on-accent': '#fff8ee', radius: '6px', 'radius-s': '4px', shadow: '0 18px 44px rgba(40,24,10,.35)', font: '"PZ Serif","Noto Serif TC","Songti TC","PMingLiU",serif' },
  neon: { text: '#e9f6ff', dim: 'rgba(200,235,255,.65)', bg: 'rgba(4,2,16,.78)', panel: 'rgba(12,8,30,.92)', line: 'rgba(120,220,255,.25)', accent: '#ff2bd6', accent2: '#2bf3ff', 'on-accent': '#18001a', radius: '4px', 'radius-s': '3px', shadow: '0 0 40px rgba(255,43,214,.25), 0 20px 50px rgba(0,0,0,.6)' },
  steel: { text: '#e8ece4', dim: 'rgba(220,228,214,.62)', bg: 'rgba(10,12,8,.8)', panel: 'rgba(28,32,26,.95)', line: 'rgba(200,214,180,.18)', accent: '#c9d94a', accent2: '#ff9a2e', 'on-accent': '#151a05', radius: '2px', 'radius-s': '2px' },
  paper: { text: '#2a2620', dim: 'rgba(42,38,32,.66)', bg: 'rgba(250,246,238,.7)', panel: '#fffdf8', panel2: 'rgba(42,38,32,.05)', line: 'rgba(42,38,32,.14)', accent: '#ff7a3d', accent2: '#3d8bff', 'on-accent': '#fff', shadow: '0 18px 40px rgba(60,40,20,.18)' },
};
const UI = PZ.ui = { stack: [], focus: null, _toasts: null, _say: null };

UI.init = (cfg = {}) => {
  if (!HAS_DOM) return;
  if (!document.getElementById('pz-css')) { const st = document.createElement('style'); st.id = 'pz-css'; st.textContent = ENGINE_CSS; document.head.insertBefore(st, document.head.firstChild); }
  if (cfg.theme) UI.theme(cfg.theme);
  UI.enhance(Screen.ui);
  // 介面導覽：鍵盤、手把
  const navKey = (dir) => () => { if (UI.top()) UI.move(dir); };
  Input.onPress('up', navKey('up')); Input.onPress('down', navKey('down')); Input.onPress('left', navKey('left')); Input.onPress('right', navKey('right'));
  Input.onPress('confirm', () => { const t = UI.top(); if (t && UI.focus && document.body.contains(UI.focus)) { UI.focus.click(); } });
  Input.onPress('cancel', () => { const t = UI.top(); if (t && t.back) t.back(); });
};
/** 換主題：名字或變數物件（key 不用寫 --pz-） */
UI.theme = (t) => {
  const vars = typeof t === 'string' ? THEMES[t] || {} : t;
  const st = Screen.root && Screen.root.style; if (!st) return;
  if (typeof t === 'string') for (const k of ['text', 'dim', 'faint', 'bg', 'panel', 'panel2', 'line', 'accent', 'accent2', 'on-accent', 'radius', 'radius-s', 'shadow', 'font']) st.removeProperty('--pz-' + k);
  for (const k in vars) st.setProperty('--pz-' + k, vars[k]);
};
UI.themes = THEMES;

/** 幫一個 DOM 區塊裡的按鈕加上音效、觸覺、按壓感 */
UI.enhance = (root) => {
  if (!root || root._pzEnh) return; root._pzEnh = true;
  root.addEventListener('pointerdown', (e) => {
    const b = e.target.closest && e.target.closest('.pz-btn,.pz-toggle,[data-sfx]'); if (!b || b.disabled) return;
    b.classList.add('pz-press'); const up = () => { b.classList.remove('pz-press'); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    const s = b.dataset.sfx; if (s !== 'none') PZ.uiSound(s || 'click');
    Haptics.tap('light');
  });
  root.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse') return; const b = e.target.closest && e.target.closest('.pz-btn'); if (b && b !== UI._hover) { UI._hover = b; PZ.uiSound('hover'); } });
};

/* ---------- 焦點導覽（手把、鍵盤）---------- */
UI.top = () => UI.stack[UI.stack.length - 1] || null;
function focusables(root) { return [...root.querySelectorAll('.pz-btn,.pz-toggle,.pz-focusable,.pz-range,.pz-seg button')].filter((e) => !e.disabled && e.offsetParent !== null); }
UI.setFocus = (elx) => { if (UI.focus) UI.focus.classList.remove('pz-focus'); UI.focus = elx; if (elx) { elx.classList.add('pz-focus'); try { elx.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ } } };
UI.move = (dir) => {
  const t = UI.top(); if (!t) return;
  const list = focusables(t.el); if (!list.length) return;
  const cur = UI.focus && list.includes(UI.focus) ? UI.focus : null;
  if (!cur) { UI.setFocus(list[0]); PZ.uiSound('hover'); return; }
  if (cur.classList.contains('pz-range') && (dir === 'left' || dir === 'right')) { cur.value = clamp(+cur.value + (dir === 'right' ? 0.1 : -0.1), +cur.min, +cur.max); cur.dispatchEvent(new Event('input', { bubbles: true })); return; }
  const r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  let best = null, bs = Infinity;
  for (const e of list) {
    if (e === cur) continue; const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, dx = x - cx, dy = y - cy;
    const ok = dir === 'up' ? dy < -4 : dir === 'down' ? dy > 4 : dir === 'left' ? dx < -4 : dx > 4; if (!ok) continue;
    const main = dir === 'up' || dir === 'down' ? Math.abs(dy) : Math.abs(dx), side = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy), s = main + side * 2.2;
    if (s < bs) { bs = s; best = e; }
  }
  if (best) { UI.setFocus(best); PZ.uiSound('hover'); }
};
/** 推一層（對話框、選單）：Esc／B 會呼叫 back */
const syncTouch = () => { if (Screen.touch) Screen.touch.classList.toggle('pz-ui-open', UI.stack.length > 0); };
UI.push = (elx, back) => { const layer = { el: elx, back }; UI.stack.push(layer); syncTouch(); if (Input.device === 'gamepad' || Input.device === 'keyboard') setTimeout(() => { const f = focusables(elx); const p = elx.querySelector('.primary') || f[0]; if (p) UI.setFocus(p); }, 30); return layer; };
UI.pop = (layer) => { const i = UI.stack.indexOf(layer); if (i >= 0) UI.stack.splice(i, 1); UI.setFocus(null); syncTouch(); };

/* ---------- 對話框 ---------- */
UI.modal = (o = {}) => new Promise((resolve) => {
  const wrap = el('div', 'pz-modal-wrap' + (o.cls ? ' ' + o.cls : ''));
  const box = el('div', 'pz-modal' + (o.wide ? ' wide' : ''));
  if (o.title) box.appendChild(el('h2', '', o.title));
  if (o.body != null) { const b = el('div', 'pz-body'); if (typeof o.body === 'string') b.innerHTML = o.body; else b.appendChild(o.body); box.appendChild(b); }
  let done = false;
  const close = (v) => { if (done) return; done = true; UI.pop(layer); wrap.classList.remove('on'); setTimeout(() => wrap.remove(), 220); if (o.pause !== false) PZ.resume('modal'); if (o.onClose) safeCall(o.onClose, null, v); resolve(v); };
  if (o.options) {
    const list = el('div', 'pz-list');
    for (const op of o.options) {
      const b = el('button', 'pz-btn' + (op.primary ? ' primary' : ''), op.label + (op.desc ? `<small>${op.desc}</small>` : '')); b.type = 'button';
      if (op.disabled) b.disabled = true;
      b.onclick = () => close(op.value !== undefined ? op.value : op.label);
      list.appendChild(b);
    }
    box.appendChild(list);
  }
  if (o.buttons && o.buttons.length) {
    const acts = el('div', 'pz-actions');
    for (const bt of o.buttons) { const b = el('button', 'pz-btn' + (bt.primary ? ' primary' : '') + (bt.danger ? ' danger' : '') + (bt.ghost ? ' ghost' : ''), bt.label); b.type = 'button'; if (bt.sfx) b.dataset.sfx = bt.sfx; b.onclick = () => { if (bt.onClick && safeCall(bt.onClick, null, close) === false) return; close(bt.value); }; acts.appendChild(b); }
    box.appendChild(acts);
  }
  wrap.appendChild(box);
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap && o.closable !== false && o.backdrop !== false) close(o.cancelValue); });
  Screen.ui.appendChild(wrap); UI.enhance(wrap);
  if (o.pause !== false) PZ.pause('modal');
  Input.releaseAll();
  const layer = UI.push(wrap, o.closable === false ? null : () => close(o.cancelValue));
  if (o.onOpen) safeCall(o.onOpen, null, box, close);
  requestAnimationFrame(() => wrap.classList.add('on'));
  if (o.sound !== false) PZ.uiSound('open');
});
UI.alert = (title, body, ok = '好') => UI.modal({ title, body, buttons: [{ label: ok, value: true, primary: true }], cancelValue: true });
UI.confirm = (o) => UI.modal({ title: o.title, body: o.body, buttons: [{ label: o.cancel || '取消', value: false, sfx: 'cancel' }, { label: o.ok || '確定', value: true, primary: true, danger: o.danger, sfx: 'confirm' }], cancelValue: false, pause: o.pause });
UI.choose = (o) => UI.modal({ title: o.title, body: o.body, options: o.options, cancelValue: o.cancelValue != null ? o.cancelValue : null, closable: o.closable, pause: o.pause });

/* ---------- 提示泡泡、大標題 ---------- */
UI.toast = (text, o = {}) => {
  if (!UI._toasts) { UI._toasts = el('div', 'pz-toasts'); Screen.ui.appendChild(UI._toasts); }
  const t = el('div', 'pz-toast' + (o.kind ? ' ' + o.kind : ''), (o.icon ? `<span>${o.icon}</span>` : '') + `<span>${text}</span>`);
  UI._toasts.appendChild(t);
  while (UI._toasts.children.length > 4) UI._toasts.firstChild.remove();
  if (o.sound) PZ.uiSound(o.sound === true ? 'notify' : o.sound);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, o.ms || 2200);
  return t;
};
UI.banner = (text, o = {}) => new Promise((res) => {
  const b = el('div', 'pz-banner' + (o.style ? ' ' + o.style : ''), `<div class="pz-b-main">${text}</div>${o.sub ? `<div class="pz-b-sub">${o.sub}</div>` : ''}`);
  Screen.ui.appendChild(b);
  if (o.sound !== false) { const s = o.sound || (o.style === 'boss' ? 'alarm' : 'notify'); if (Sfx.has(s)) Sfx.play(s, { bus: 'ui' }); }
  setTimeout(() => { b.classList.add('out'); setTimeout(() => { b.remove(); res(); }, 360); }, o.ms || 1900);
});

/* ---------- 載入畫面 ---------- */
UI.loading = (title, note) => {
  let L = document.getElementById('pz-loading');
  if (!L) { L = el('div', 'pz-loading', `<div class="pz-loading-box"><div class="pz-loading-title"></div><div class="pz-loading-bar"><i></i></div><div class="pz-loading-note"></div></div>`); L.id = 'pz-loading'; Screen.ui.appendChild(L); }
  L.classList.remove('out');
  L.querySelector('.pz-loading-title').textContent = title || '';
  L.querySelector('.pz-loading-note').textContent = note || '';
  return { progress(p, n) { L.querySelector('i').style.width = clamp01(p) * 100 + '%'; if (n != null) L.querySelector('.pz-loading-note').textContent = n; }, done() { L.classList.add('out'); setTimeout(() => L.remove(), 450); } };
};

/* ---------- 設定頁 ---------- */
UI.settings = (o = {}) => {
  const box = el('div', 'pz-set');
  const row = (label, sub, ctl) => { const r = el('div', 'pz-set-row'); r.appendChild(el('span', '', label + (sub ? `<small>${sub}</small>` : ''))); r.appendChild(ctl); box.appendChild(r); return r; };
  const head = (t) => box.appendChild(el('h3', '', t));
  const slider = (k, onInput) => { const s = el('input', 'pz-range'); s.type = 'range'; s.min = 0; s.max = 1; s.step = 0.05; s.value = Settings.get(k); const paint = () => s.style.setProperty('--v', s.value * 100 + '%'); paint(); s.oninput = () => { Settings.set(k, +s.value); paint(); if (onInput) onInput(+s.value); }; return s; };
  const toggle = (k, inv) => { const b = el('button', 'pz-toggle'); b.type = 'button'; const sync = () => b.classList.toggle('on', inv ? !Settings.get(k) : !!Settings.get(k)); sync(); b.onclick = () => { Settings.set(k, !Settings.get(k)); sync(); }; return b; };
  const seg = (k, opts) => { const s = el('div', 'pz-seg'); for (const [v, l] of opts) { const b = el('button', String(Settings.get(k)) === String(v) ? 'on' : '', l); b.type = 'button'; b.onclick = () => { Settings.set(k, v); for (const x of s.children) x.classList.toggle('on', x === b); PZ.uiSound('click'); }; s.appendChild(b); } return s; };
  head('聲音');
  row('音樂', '', slider('music'));
  row('音效', '', slider('sfx', () => PZ.uiSound('click', { force: true })));
  if (Env.ios) row('跟其他 App 的音樂一起播', '打開後會跟著側邊靜音鍵', toggle('mixOthers'));
  head('畫面與手感');
  row('畫面震動', '怕暈可以調小', slider('shake'));
  row('閃光', '怕閃可以關掉', toggle('flash'));
  row('震動回饋', Env.ios ? 'iPhone 只有按按鈕時會震' : '', toggle('haptics'));
  row('傷害數字', '', toggle('numbers'));
  row('畫質', '自動：卡頓時會自己調低', seg('quality', [['auto', '自動'], ['high', '精細'], ['mid', '平衡'], ['low', '流暢']]));
  if (!Env.mobile) row('省電', '鎖在 60 幀', seg('fpsCap', [[0, '不鎖'], [60, '60 幀']]));
  if (Env.touch) row('觸控按鈕大小', '', slider('touchSize'));
  if (o.extra) for (const x of o.extra) { if (x.head) head(x.head); else row(x.label, x.sub, x.control); }
  if (o.save) {
    const sv = o.save; head('存檔');
    if (!sv.persistent) box.appendChild(el('div', 'pz-hint', '這個瀏覽器不讓遊戲存資料，進度只會留到關掉為止。可以用下面的存檔碼帶走。'));
    if (sv.cloud) box.appendChild(el('div', 'pz-hint', sv.cloud.note()));
    const r = el('div', 'pz-set-row'); const b1 = el('button', 'pz-btn', '複製存檔碼'), b2 = el('button', 'pz-btn', '貼上存檔碼'); b1.type = b2.type = 'button';
    r.appendChild(b1); r.appendChild(b2); box.appendChild(r);
    b1.onclick = async () => { const code = sv.code(); let ok = false; try { await navigator.clipboard.writeText(code); ok = true; } catch (e) { /* 不給用剪貼簿 */ } if (ok) UI.toast('存檔碼已複製', { kind: 'good' }); else { const ta = el('textarea', 'pz-code'); ta.value = code; ta.readOnly = true; UI.modal({ title: '存檔碼', body: ta, buttons: [{ label: '好', primary: true }], pause: false, onOpen: () => { ta.focus(); ta.select(); } }); } };
    b2.onclick = async () => {
      const ta = el('textarea', 'pz-code'); ta.placeholder = '把存檔碼貼在這裡';
      const v = await UI.modal({ title: '讀取存檔碼', body: ta, buttons: [{ label: '取消', value: false }, { label: '讀取', value: true, primary: true }], pause: false, onOpen: () => setTimeout(() => ta.focus(), 50) });
      if (!v) return;
      if (sv.load(ta.value)) { UI.toast('讀取成功', { kind: 'good' }); if (o.onLoad) o.onLoad(); } else UI.toast('存檔碼不對，請整段複製再貼一次', { kind: 'bad' });
    };
  }
  return UI.modal({ title: o.title || '設定', body: box, wide: false, buttons: [{ label: '重設', ghost: true, onClick: () => { Settings.reset(); UI.toast('已恢復預設'); return true; } }, { label: '完成', primary: true, value: true }], pause: o.pause });
};

/* ---------- 標準暫停選單 ---------- */
UI.pause = (o = {}) => {
  const items = [{ label: '繼續', value: 'resume', primary: true }].concat(o.items || []).concat(o.settings === false ? [] : [{ label: '設定', value: 'settings' }]);
  return UI.choose({ title: o.title || '暫停', body: o.body, options: items, cancelValue: 'resume' }).then(async (v) => {
    const it = items.find((x) => x.value === v || x.label === v);
    if (v === 'settings') { await UI.settings({ save: o.save }); return UI.pause(o); }
    if (it && it.onClick) safeCall(it.onClick, null);
    return v;
  });
};

/* ---- 22_dialogue.js ---- */
/* ==========================================================================
   22 劇情對話
     await PZ.ui.say([
       ['魏子葳', '……又是凌晨三點。'],
       [null, '巷口的路燈閃了兩下。'],                 // 沒有名字＝旁白
       ['老闆', '這單送完就收工。', { face: 'boss_face', side: 'right' }],
     ], { faces: { 魏子葳: 'face_wei' }, voices: { 魏子葳: 0.9, 老闆: 0.75 } });
     const i = await PZ.ui.ask('要怎麼做？', ['衝進去', '先觀察']);   // 回傳選了第幾個
   點一下（或 A／Enter／空白）：字還在跑就一次顯示完，跑完就下一句；按住會快轉。
   右上角：自動、快轉、紀錄（看前面說過的話）。對話時遊戲自動暫停。
   ========================================================================== */
const Say = { log: [], faceCache: new Map() };
function faceEl(face) {
  if (!face) return null;
  if (face instanceof HTMLElement) return face;
  let url = Say.faceCache.get(face);
  if (!url) { url = Art.has(face) ? Art.url(face) : face; Say.faceCache.set(face, url); }
  const img = new Image(); img.src = url; img.alt = ''; return img;
}
function sayBox() {
  if (UI._say) return UI._say;
  const wrap = el('div', 'pz-say', `<div class="pz-say-face"></div><div class="pz-say-box"><div class="pz-say-name"></div><div class="pz-say-text"></div><div class="pz-say-more"></div>
    <div class="pz-say-tools"><button data-t="auto" data-sfx="click">自動</button><button data-t="skip" data-sfx="click">快轉</button><button data-t="log" data-sfx="click">紀錄</button></div></div>`);
  Screen.ui.appendChild(wrap); UI.enhance(wrap);
  const S = UI._say = { wrap, box: wrap.querySelector('.pz-say-box'), name: wrap.querySelector('.pz-say-name'), text: wrap.querySelector('.pz-say-text'), face: wrap.querySelector('.pz-say-face'), auto: false, skip: false, onAdv: null, holdT: 0 };
  wrap.querySelectorAll('.pz-say-tools button').forEach((b) => b.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const t = b.dataset.t;
    if (t === 'auto') { S.auto = !S.auto; b.classList.toggle('on', S.auto); if (S.auto && S.onAdv && S.wrap.classList.contains('done')) S.onAdv(); }
    else if (t === 'skip') { S.skip = !S.skip; b.classList.toggle('on', S.skip); if (S.onAdv) S.onAdv(); }
    else if (t === 'log') { const lg = el('div', 'pz-log', Say.log.slice(-80).map((l) => `<p>${l[0] ? `<b>${l[0]}</b>` : ''}${l[1]}</p>`).join('') || '<p>還沒有對話。</p>'); UI.modal({ title: '對話紀錄', body: lg, buttons: [{ label: '關閉', primary: true }], pause: false, onOpen: () => { lg.scrollTop = lg.scrollHeight; } }); }
  }));
  wrap.addEventListener('pointerdown', (e) => { if (e.target.closest('.pz-say-tools,.pz-choices')) return; S.holdT = Time.real; if (S.onAdv) S.onAdv(); });
  return S;
}
function closeSay() { const S = UI._say; if (!S) return; S.wrap.remove(); UI._say = null; }

/** 一句一句播（回傳 Promise）；每句可以是 [名字, 文字, {face, side, voice}] 或字串（旁白） */
UI.say = async (lines, o = {}) => {
  if (!Array.isArray(lines)) lines = [lines];
  const S = sayBox(); S.skip = false;
  if (o.pause !== false) PZ.pause('say');
  Input.releaseAll();
  const layer = UI.push(S.wrap, null);
  const advKey = Input.onPress('confirm', () => { S.holdT = Time.real; if (UI.top() === layer && S.onAdv) S.onAdv(); });
  try {
    for (const ln of lines) {
      const L = typeof ln === 'string' ? [null, ln, {}] : Array.isArray(ln) ? [ln[0], ln[1], ln[2] || {}] : [ln.name, ln.text, ln];
      const [name, text, lo] = L;
      if (lo.do) { await lo.do(); continue; }
      S.wrap.classList.toggle('narr', !name); S.wrap.classList.toggle('right', lo.side === 'right');
      S.name.style.display = name ? '' : 'none'; S.name.textContent = name || '';
      const face = lo.face || (o.faces && name && o.faces[name]) || null;
      S.face.innerHTML = ''; const fe = faceEl(face); if (fe) S.face.appendChild(fe);
      S.wrap.classList.remove('done');
      Say.log.push([name, text]); if (Say.log.length > 300) Say.log.shift();
      await typeLine(S, String(text), (o.voices && name && o.voices[name]) || lo.voice || 1, o);
      S.wrap.classList.add('done');
      await waitAdvance(S, String(text));
    }
  } finally {
    advKey(); UI.pop(layer);
    if (!o.keep) closeSay();
    if (o.pause !== false) PZ.resume('say');
  }
};
function typeLine(S, text, voice, o) {
  return new Promise((res) => {
    const chars = [...text]; let i = 0, wait = 0, last = nowMs();
    S.text.textContent = '';
    const span = document.createTextNode(''); S.text.appendChild(span);
    const speed = 36 * (Settings.get('textSpeed') || 1) * (o.speed || 1);
    let finished = false;
    const finish = () => { if (finished) return; finished = true; clearInterval(timer); span.data = text; S.onAdv = null; res(); };
    S.onAdv = finish;
    const timer = setInterval(() => {
      const now = nowMs(), dt = (now - last) / 1000; last = now;
      const fast = S.skip || (Input.down('confirm') && Time.real - S.holdT > 0.35) || (Input.pointer.down && Time.real - S.holdT > 0.35);
      if (fast) { finish(); return; }
      wait -= dt; if (wait > 0) return;
      let n = Math.max(1, Math.round(speed * dt));
      while (n-- > 0 && i < chars.length) {
        const c = chars[i++]; span.data += c;
        if (o.blip !== false && i % 2 === 1 && c.trim() && Sfx.has('type')) Sfx.play('type', { pitch: voice, bus: 'ui' });
        if ('。！？!?'.includes(c)) { wait = 0.22; break; } if ('，、；：,;:'.includes(c)) { wait = 0.1; break; } if (c === '…') { wait = 0.08; break; }
      }
      if (i >= chars.length) finish();
    }, 16);
  });
}
function waitAdvance(S, text) {
  return new Promise((res) => {
    let t = 0;
    const go = () => { clearTimeout(t); S.onAdv = null; res(); };
    S.onAdv = go;
    if (S.skip) t = setTimeout(go, 60);
    else if (S.auto) t = setTimeout(go, 900 + [...text].length * 45 / (Settings.get('textSpeed') || 1));
  });
}
/** 對話中的選擇：回傳選了第幾個（0 起算）。options 可以是字串或 { label, desc, disabled } */
UI.ask = (prompt, options, o = {}) => new Promise((res) => {
  const S = sayBox();
  if (o.pause !== false) PZ.pause('say');
  S.wrap.classList.add('done'); S.wrap.classList.toggle('narr', !o.name);
  S.name.style.display = o.name ? '' : 'none'; S.name.textContent = o.name || '';
  S.text.textContent = prompt || '';
  const box = el('div', 'pz-choices');
  options.forEach((op, i) => {
    const d = typeof op === 'string' ? { label: op } : op;
    const b = el('button', 'pz-btn', d.label + (d.desc ? `<small style="display:block;color:var(--pz-dim);font-weight:500">${d.desc}</small>` : '')); b.type = 'button';
    if (d.disabled) b.disabled = true;
    b.onclick = (e) => { e.stopPropagation(); Say.log.push([null, '→ ' + d.label]); box.remove(); UI.pop(layer); if (!o.keep) closeSay(); if (o.pause !== false) PZ.resume('say'); PZ.uiSound('confirm'); res(i); };
    box.appendChild(b);
  });
  S.box.appendChild(box); UI.enhance(box);
  const layer = UI.push(S.wrap, null);
  S.onAdv = null;
});
UI.closeSay = closeSay;

/* ---- 23_debug.js ---- */
/* ==========================================================================
   23 除錯
   - 遊戲出錯時畫面下方跳出紅色面板（不會整個當掉）：錯誤訊息、出錯位置、裝置資訊，
     可以「複製錯誤」貼給 Claude、「繼續玩」或「重新載入」。
   - 效能面板：網址加 ?debug、按 F3 或 `、或三指同時點一下：幀數、每格時間、繪圖次數、粒子、畫質。
   - 測試掛鉤 window.__pz：step(n)、pause()、resume()、seed(n)、state()、errors（Playwright 用）。
   ========================================================================== */
const Debug = PZ.debug = { errors: [], shown: new Set(), statsOn: false, statsEl: null, cfg: {}, quiet: false };
const BENIGN = [/ResizeObserver loop/i, /^Script error\.?$/i, /AbortError/i, /play\(\) request was interrupted/i, /The play\(\) request/i];
reportError = (err, where) => {
  const msg = (err && (err.message || err.reason)) || String(err);
  if (BENIGN.some((r) => r.test(msg))) return;
  const stack = (err && err.stack) || '';
  Debug.errors.push({ msg, where, stack, t: Date.now() });
  if (Debug.errors.length > 50) Debug.errors.shift();
  if (typeof console !== 'undefined') console.error('[PZ]' + (where ? ' ' + where + '：' : ''), err);
  if (HAS_DOM && !Debug.quiet) showError(msg, where, stack);
  PZ.emit('error', err, where);
};
function deviceLine() {
  return `${PZ.cfg && PZ.cfg.title ? PZ.cfg.title + ' ' + (PZ.cfg.version || '') + '｜' : ''}PZ ${PZ.version}｜${Gfx.kind || '—'}｜${Screen.w}×${Screen.h}@${(Screen.dpr || 1).toFixed(2)}｜${Env.ios ? 'iOS' : Env.android ? 'Android' : 'Desktop'}${Env.standalone ? '・主畫面' : ''}${Env.inFrame ? '・框內' : ''}｜${HAS_DOM ? navigator.userAgent.replace(/\s*\(KHTML.*$/, '').slice(0, 90) : ''}`;
}
function showError(msg, where, stack) {
  const key = msg + '|' + where; if (Debug.shown.has(key)) return; Debug.shown.add(key);
  let p = document.getElementById('pz-err');
  const top = String(stack).split('\n').slice(0, 6).join('\n');
  const text = `${msg}\n位置：${where || '—'}\n${top}\n${deviceLine()}`;
  if (!p) { p = el('div', 'pz-err'); p.id = 'pz-err'; document.body.appendChild(p); }
  p.innerHTML = `<b>遊戲出了點問題</b>可以先按「繼續玩」；如果一直出現，按「複製錯誤」貼給 Claude。<pre></pre><div class="pz-err-b"><button data-a="copy">複製錯誤</button><button data-a="go">繼續玩</button><button data-a="reload">重新載入</button></div>`;
  p.querySelector('pre').textContent = text;
  p.onclick = async (e) => {
    const a = e.target.dataset && e.target.dataset.a; if (!a) return;
    if (a === 'copy') { try { await navigator.clipboard.writeText(text); e.target.textContent = '已複製'; } catch (er) { const r = document.createRange(); r.selectNodeContents(p.querySelector('pre')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); e.target.textContent = '已選取，請按複製'; } }
    else if (a === 'go') { p.remove(); }
    else if (a === 'reload') { location.reload(); }
  };
}
Debug.stats = (on = !Debug.statsOn) => {
  Debug.statsOn = on;
  if (on && !Debug.statsEl) { Debug.statsEl = el('div', 'pz-stats'); document.body.appendChild(Debug.statsEl); }
  if (Debug.statsEl) Debug.statsEl.style.display = on ? '' : 'none';
};
addSystem({
  name: 'debug', order: 2000,
  render() {
    if (!Debug.statsOn || !Debug.statsEl || Time.frame % 10) return;
    const r = Gfx.r, st = r ? r.stats : {};
    Debug.statsEl.textContent = `${Time.fps.toFixed(0)} fps  ${(Time.rdt * 1000).toFixed(1)} ms  (${Time.refresh}Hz)\n更新 ${Perf.upd.toFixed(2)} ms  繪圖 ${Perf.ren.toFixed(2)} ms\n${Gfx.kind}  批次 ${st.draws || 0}  方塊 ${st.quads || 0}\n粒子 ${Particles.n}  畫質 ${Quality.cur.name}${Quality.auto ? '(自動)' : ''}  ${Screen.pw}×${Screen.ph}\n音訊 ${Aud.ctx ? Aud.ctx.state : '未啟動'}  聲部 ${Sfx.voices.length}${Debug.errors.length ? '  錯誤 ' + Debug.errors.length : ''}`;
  },
});
Debug.init = (cfg) => {
  Debug.cfg = cfg || {};
  if (!HAS_DOM) return;
  window.addEventListener('error', (e) => reportError(e.error || e.message, e.filename ? `${e.filename.split('/').pop()}:${e.lineno}` : 'window'));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason || 'Promise 失敗', 'promise'));
  if (/[?&#]debug\b/.test(location.href) || cfg.debug) Debug.stats(true);
  window.addEventListener('keydown', (e) => { if (e.code === 'F3' || e.code === 'Backquote') { e.preventDefault(); Debug.stats(); } });
  let three = 0; window.addEventListener('touchstart', (e) => { if (e.touches.length === 3) { three++; setTimeout(() => (three = 0), 400); if (three === 1) Debug.stats(); } }, { passive: true });
};
if (HAS_DOM) {
  window.__pz = {
    get PZ() { return PZ; },
    step: (n = 1, dt = 1 / 60) => Loop.step(n, dt),
    pause: () => { Loop.stop(); }, resume: () => { Loop.start(); },
    seed: (n) => PZ.seed(n),
    get errors() { return Debug.errors.map((e) => e.msg + ' @' + e.where); },
    state: () => ({ scene: Scenes.name, fps: Math.round(Time.fps), renderer: Gfx.kind, tier: Quality.tier, particles: Particles.n, quads: Gfx.r ? Gfx.r.stats.quads : 0, draws: Gfx.r ? Gfx.r.stats.draws : 0, w: Screen.w, h: Screen.h, res: Screen.res, audio: Aud.ctx ? Aud.ctx.state : 'none', errors: Debug.errors.length }),
  };
}

/* ---- 24_boot.js ---- */
/* ==========================================================================
   24 啟動
     PZ.start({
       id: 'last-order', title: '最後一單', version: '2.0.0',
       orientation: 'any',               // 'portrait' | 'landscape' | 'any'
       background: '#07090d',
       fit: 420,                         // 畫面短邊看得到的世界單位（相機自動縮放）
       step: 0,                          // 0＝可變步長；1/60＝固定步長
       theme: 'night' 或 { accent: '#f5a', … },
       fonts: ['PZ Sans'],               // 嵌入字型：等它載好才畫字
       settings: { music: 0.6 },         // 這款遊戲的預設設定
       binds: { fire: ['Space', 'PadA'] },
       async load(progress) { … 畫圖、定義音效 … progress(0.5) },
       scenes: { title: {...}, play: {...} },   // 也可以另外用 PZ.scene() 定義
       first: 'title',
     });
   ========================================================================== */
PZ.cfg = null;
PZ.start = async (cfg = {}) => {
  if (!HAS_DOM) throw new Error('PZ.start 需要瀏覽器');
  PZ.cfg = cfg;
  if (document.readyState === 'loading') await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
  Screen.init(cfg);
  Debug.init(cfg);
  UI.init(cfg);
  Input.init();
  if (cfg.binds) Input.bind(cfg.binds);
  // 畫質起點：手機「精細」、電腦「極致」、記憶體小的手機「平衡」；之前在這台自動降過就從那一階開始
  const start = cfg.quality != null ? cfg.quality : Env.lowMemory ? 1 : Env.mobile ? 2 : 3;
  const dev = Store.getJSON('pz.device.tier', null);
  Quality.start = start; Quality.tier = dev != null ? Math.min(start, dev + 1) : start;
  PZ.on('quality', (t, why) => { if (why === 'slow' || why === 'fast') Store.setJSON('pz.device.tier', t); });
  Settings.load(cfg.id || 'game', cfg.settings);
  if (cfg.step) Time.step = cfg.step;
  if (cfg.fit) Cam.fitSize = cfg.fit;
  if (cfg.post === false) Post.enabled = false;
  if (cfg.post && typeof cfg.post === 'object') { const p = cfg.post; for (const k in p) { if (k === 'bloom' && typeof p.bloom === 'object') Object.assign(Post.bloom, p.bloom); else Post[k] = p[k]; } }
  if (cfg.title && !document.title) document.title = cfg.title;
  Screen.measure(true);
  Gfx.create(cfg.renderer || (/[?&]c2d\b/.test(location.href) ? 'canvas2d' : 'webgl2'));
  Art.init();
  if (cfg.scenes) for (const k in cfg.scenes) PZ.scene(k, cfg.scenes[k]);
  Loop.start();
  let L = null;
  if (cfg.load) {
    L = cfg.loading === false ? null : UI.loading(cfg.title || '', '載入中');
    const progress = (p, note) => { if (L) L.progress(p, note); };
    await Text.ready(cfg.fonts || []);
    try { await cfg.load(progress); } catch (e) { reportError(e, 'load'); }
    progress(1);
  } else await Text.ready(cfg.fonts || []);
  PZ.emit('ready');
  if (L) L.done();
  if (cfg.first) await PZ.go(cfg.first, cfg.firstParams, { type: cfg.firstTransition || 'fade', time: 0.5 });
  return PZ;
};

global.PZ = PZ;
})(typeof window !== 'undefined' ? window : globalThis);
