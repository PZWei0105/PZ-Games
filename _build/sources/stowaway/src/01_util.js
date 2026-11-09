'use strict';
// ============ 工具 ============
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const now = () => performance.now() / 1000;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rnd = Math.random;
const R = {
  f: (a = 0, b = 1) => a + rnd() * (b - a),
  i: (a, b) => Math.floor(a + rnd() * (b - a + 1)),
  pick: arr => arr[Math.floor(rnd() * arr.length)],
  chance: p => rnd() < p,
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
  weighted(list, wkey = 'w') { let s = 0; for (const o of list) s += o[wkey]; let r = rnd() * s; for (const o of list) { r -= o[wkey]; if (r <= 0) return o; } return list[list.length - 1]; },
};
function seedRng(s) { rnd = mulberry32(s >>> 0); }
function unseedRng() { rnd = Math.random; }
const fmtT = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function mixHex(a, b, t) { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); const c = k => Math.round(lerp(x >> k & 255, y >> k & 255, t)); return `rgb(${c(16)},${c(8)},${c(0)})`; }
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function pointInPoly(x, y, pts) { let ins = false; for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) { const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins; } return ins; }
const store = {
  mem: {},
  get(k) { try { const v = localStorage.getItem(k); return v == null ? (this.mem[k] ?? null) : v; } catch (e) { return this.mem[k] ?? null; } },
  set(k, v) { this.mem[k] = v; try { localStorage.setItem(k, v); } catch (e) { } },
  del(k) { delete this.mem[k]; try { localStorage.removeItem(k); } catch (e) { } },
};
function vibrate(p) { try { if (S.set && S.set.haptic && navigator.vibrate) navigator.vibrate(p); } catch (e) { } }
// 全域狀態（S＝介面／設定，G＝長期存檔，W＝本局世界）
const S = { mode: 'boot', set: null, timeScale: 1, paused: false };
let G = null, W = null;
