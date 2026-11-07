'use strict';
/* ====== 共用工具 ====== */
const TAU = Math.PI * 2;
const T = 48;                       // 一格的世界座標寬度
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const approach = (v, t, s) => v < t ? Math.min(t, v + s) : Math.max(t, v - s);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const smooth = t => t * t * (3 - 2 * t);
const now = () => performance.now() / 1000;

/* 可重現的亂數（地圖靠種子生成，連線時大家生成一樣的夢） */
function RNG(seed) {
  let s = (seed >>> 0) || 1;
  const r = {
    seed,
    next() { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; },
    range(a, b) { return a + (b - a) * r.next(); },
    int(a, b) { return a + Math.floor(r.next() * (b - a + 1)); },
    pick(arr) { return arr[Math.floor(r.next() * arr.length)]; },
    chance(p) { return r.next() < p; },
    shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
    weighted(list, wf) { let tot = 0; for (const x of list) tot += wf(x); let k = r.next() * tot; for (const x of list) { k -= wf(x); if (k <= 0) return x; } return list[list.length - 1]; },
    state() { return s; }, setState(v) { s = v; },
  };
  return r;
}
const rnd = RNG((Date.now() ^ (Math.random() * 1e9)) >>> 0);   // 表演用（粒子、音效），不影響地圖
const fx = (a, b) => a + (b - a) * Math.random();

/* 顏色 */
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
function mixHex(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); }
function shade(h, k) { return k >= 0 ? mixHex(h, '#ffffff', k) : mixHex(h, '#000000', -k); }

/* DOM */
const $ = (q, r = document) => r.querySelector(q);
const $$ = (q, r = document) => Array.from(r.querySelectorAll(q));
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const fmt = n => Math.round(n).toLocaleString('en-US');
let _uid = 1; const uid = () => _uid++;

/* 本機儲存（任何錯誤都吞掉：有些瀏覽器不給存） */
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

/* 連線預留：目前只有本機一位玩家。之後接 WebRTC／WebSocket 時，從這裡同步種子與輸入。 */
const Net = { online: false, isHost: true, peers: [], send() {}, on() {} };
