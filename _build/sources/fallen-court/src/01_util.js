'use strict';
// ============ 工具 ============
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sign = v => v > 0 ? 1 : v < 0 ? -1 : 0;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const easeBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const md = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);      // 曼哈頓距離
const cd8 = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by)); // 八方向距離
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
let rnd = Math.random;
const R = {
  f: (a = 0, b = 1) => a + rnd() * (b - a),
  i: (a, b) => Math.floor(a + rnd() * (b - a + 1)),
  pick: arr => arr[Math.floor(rnd() * arr.length)],
  chance: p => rnd() < p,
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
  weighted(list, wkey = 'w') { let s = 0; for (const o of list) s += o[wkey]; let r = rnd() * s; for (const o of list) { r -= o[wkey]; if (r <= 0) return o; } return list[list.length - 1]; },
};
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(a, b, t) { const x = hexRgb(a), y = hexRgb(b); return '#' + [0, 1, 2].map(k => Math.round(lerp(x[k], y[k], t)).toString(16).padStart(2, '0')).join(''); }
function shade(hex, k) { return k >= 0 ? mix(hex, '#ffffff', k) : mix(hex, '#000000', -k); }
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const DIR8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const HAS_DOM = typeof document !== 'undefined';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  mem: {},
  get(k) { try { const v = localStorage.getItem(k); return v == null ? (this.mem[k] ?? null) : v; } catch (e) { return this.mem[k] ?? null; } },
  set(k, v) { this.mem[k] = v; try { localStorage.setItem(k, v); } catch (e) { /* 存不進去就留在記憶體 */ } },
  del(k) { delete this.mem[k]; try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};
function deep(o) { return JSON.parse(JSON.stringify(o)); }
// 全域狀態：S＝介面與設定，G＝存檔，Z＝目前區域，B＝目前戰鬥
const S = { mode: 'boot', set: { music: .7, sfx: 1, speed: 1, shake: true, flash: true, easy: false, hints: true, gfx: 'auto' }, t: 0, dt: 0 };
let G = null, Z = null, B = null;
