'use strict';
/* ───────────── 寸土 EVERY INCH — 共用工具 ───────────── */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const rndi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const sgn = (v) => (v < 0 ? -1 : 1);
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const angNorm = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const approachAng = (v, t, d) => { const df = angNorm(t - v); return Math.abs(df) <= d ? t : v + Math.sign(df) * d; };
const damp = (v, t, k, dt) => lerp(v, t, 1 - Math.exp(-k * dt));
const E = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inQuad: (t) => t * t,
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* 兩段 IK：從 (ax,ay) 到目標 (tx,ty)，長度 l1、l2，bend=+1/-1 決定關節往哪邊彎。回傳中間關節。 */
function ik2(ax, ay, tx, ty, l1, l2, bend) {
  let dx = tx - ax, dy = ty - ay;
  let d = Math.hypot(dx, dy);
  const maxd = l1 + l2 - 0.001;
  if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
  if (d < 0.001) d = 0.001;
  const a = Math.atan2(dy, dx);
  const c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const b = a + bend * Math.acos(c);
  return [ax + Math.cos(b) * l1, ay + Math.sin(b) * l1];
}

/* 顏色 */
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHex(r, g, b) { return '#' + ((1 << 24) | (clamp(r | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(b | 0, 0, 255)).toString(16).slice(1); }
function shade(h, k) { const [r, g, b] = hexToRgb(h); return k < 0 ? rgbToHex(r * (1 + k), g * (1 + k), b * (1 + k)) : rgbToHex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k); }
function mix(h1, h2, t) { const a = hexToRgb(h1), b = hexToRgb(h2); return rgbToHex(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)); }
function rgba(h, a) { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; }

/* DOM */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* 存檔：localStorage，失敗時退回記憶體 */
const store = (() => {
  const P = 'everyinch.v1.';
  const mem = {};
  let ok = true;
  try { const k = P + '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); } catch (e) { ok = false; }
  return {
    get(k, d) { try { if (ok) { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } } catch (e) { /* 壞掉就用預設 */ } return k in mem ? mem[k] : d; },
    set(k, v) { mem[k] = v; if (!ok) return; try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* 空間滿了 */ } },
    del(k) { delete mem[k]; try { if (ok) localStorage.removeItem(P + k); } catch (e) { /* 忽略 */ } },
    get ok() { return ok; },
  };
})();

/* 物件池：粒子、子彈都從這裡拿，避免一直配置記憶體 */
class Pool {
  constructor(make, cap) { this.make = make; this.cap = cap; this.items = []; this.free = []; }
  get() {
    let o;
    if (this.free.length) o = this.free.pop();
    else if (this.items.length < this.cap) { o = this.make(); this.items.push(o); }
    else return null;
    o.alive = true;
    return o;
  }
  kill(o) { if (o.alive) { o.alive = false; this.free.push(o); } }
  each(fn) { const a = this.items; for (let i = 0; i < a.length; i++) if (a[i].alive) fn(a[i]); }
  clear() { this.free.length = 0; for (const o of this.items) { o.alive = false; this.free.push(o); } }
  get count() { return this.items.length - this.free.length; }
}

/* 全域狀態 */
const G = {
  t: 0,            // 遊戲時間（秒，會被慢動作影響）
  rt: 0,           // 真實時間
  dt: 0,
  timeScale: 1,
  slowTarget: 1,
  hitStop: 0,
  scene: 'title',
  debug: false,
};
const SCENES = {};
const VIEW = { w: 844, h: 390, dpr: 2, rot: false, cw: 0, ch: 0, quality: 1 };
