'use strict';
/* ====== 墜星 LANDFALL — 工具 ====== */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// 可重現亂數（mulberry32）
function RNG(seed) {
  let s = seed >>> 0;
  const f = () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  f.int = (a, b) => a + Math.floor(f() * (b - a + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.chance = p => f() < p;
  f.state = () => s;
  f.setState = v => { s = v >>> 0; };
  return f;
}
// 全域亂數（存檔時記住狀態）
let R = RNG(Date.now() & 0xffffffff);

// 平滑雜訊（value noise）
function makeNoise(seed) {
  const r = RNG(seed);
  const P = new Float32Array(256);
  for (let i = 0; i < 256; i++) P[i] = r();
  const h = (x, y) => P[((x * 73856093) ^ (y * 19349663)) & 255];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return lerp(lerp(a, b, xf), lerp(c, d, xf), yf);
  };
}
function fbm(noise, x, y, oct = 3) {
  let v = 0, amp = 1, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) { v += noise(x * f, y * f) * amp; tot += amp; amp *= .5; f *= 2; }
  return v / tot;
}

// 顏色
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function rgba(h, a) { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; }
function mix(h1, h2, t) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  const c = a.map((v, i) => Math.round(lerp(v, b[i], t)));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
function shade(h, amt) { return amt >= 0 ? mix(h, '#ffffff', amt) : mix(h, '#000000', -amt); }

// 時間格式
const DAY = 1440;
function dayOf(min) { return Math.floor(min / DAY) + 1; }
function hourOf(min) { return (min % DAY) / 60; }
function clockStr(min) {
  const m = Math.floor(min % DAY);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

function uid() { return (uid.n = (uid.n || 0) + 1); }
function shuffle(arr, r = R) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
function weighted(list, wf, r = R) {
  let tot = 0; for (const x of list) tot += Math.max(0, wf(x));
  let v = r() * tot;
  for (const x of list) { v -= Math.max(0, wf(x)); if (v <= 0) return x; }
  return list[list.length - 1];
}
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
