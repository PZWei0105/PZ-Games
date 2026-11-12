/* ===================== 耳目一新 RESKIN — core ===================== */
const VERSION = '1.0.0';
const R = { VERSION };
window.RESKIN = R;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
R.$ = $; R.$$ = $$; R.clamp = clamp; R.lerp = lerp;

const ease = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  elastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};
R.ease = ease;

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
R.esc = esc;

function fmtTime(s) {
  if (!isFinite(s) || s < 0) s = 0;
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
}
R.fmtTime = fmtTime;

function hashStr(s) {
  let h = 2166136261 >>> 0;
  s = String(s || '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function noise1(x, seed) {
  const i = Math.floor(x), f = x - i, s = (seed || 0) * 7919;
  const r = (n) => { let h = Math.imul((n + s) ^ 0x5bd1e995, 0x27d4eb2d); h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
  const u = f * f * (3 - 2 * f);
  return lerp(r(i), r(i + 1), u);
}
function debounce(fn, ms) { let t = 0; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = (...a) => { clearTimeout(t); fn(...a); }; return d; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
Object.assign(R, { hashStr, rng, uid, noise1, debounce, sleep, raf2, TAU });

/* ---------- event bus ---------- */
const bus = {
  m: new Map(),
  on(e, f) { if (!this.m.has(e)) this.m.set(e, new Set()); this.m.get(e).add(f); return () => this.m.get(e).delete(f); },
  emit(e, ...a) { const s = this.m.get(e); if (!s) return; for (const f of Array.from(s)) { try { f(...a); } catch (err) { console.error('[bus]', e, err); } } },
};
R.bus = bus;

/* ---------- platform ---------- */
const UA = navigator.userAgent;
R.isIOS = /iP(hone|ad|od)/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
R.isAndroid = /Android/.test(UA);
R.isTouch = matchMedia('(pointer: coarse)').matches;
R.standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
R.embedded = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
R.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
R.CLAUDE = !!window.RESKIN_NO_SW; // the copy published on Claude (no service worker, storage may not last)
R.WEB_URL = 'https://pzwei0105.github.io/PZ-Games/apps/reskin/';

/* ---------- colors ---------- */
function hexToRgb(h) {
  h = String(h || '#000').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) { return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
  }
  return [h * 360, s, l];
}
function hslToRgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  const f = (n) => { const k = (n + h * 12) % 12; const a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
const hsl = (h, s, l) => rgbToHex(...hslToRgb(h, s, l));
const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
const mix = (a, b, t) => { const x = hexToRgb(a), y = hexToRgb(b); return rgbToHex(lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)); };
const lum = (hex) => { const c = hexToRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
R.color = { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hsl, rgba, mix, lum };

/* ---------- icons ---------- */
const sv = (p, fill) => `<svg viewBox="0 0 24 24" aria-hidden="true"${fill ? ' class="fi"' : ''}>${p}</svg>`;
const I = {
  play: sv('<path d="M7.5 4.8v14.4c0 .8.9 1.3 1.6.9l11.3-7.2c.6-.4.6-1.3 0-1.7L9.1 3.9c-.7-.4-1.6.1-1.6.9z"/>', 1),
  pause: sv('<rect x="5.5" y="4" width="4.6" height="16" rx="1.4"/><rect x="13.9" y="4" width="4.6" height="16" rx="1.4"/>', 1),
  next: sv('<path d="M4.5 5.6v12.8c0 .7.8 1.2 1.4.8l9.2-6.4c.5-.4.5-1.2 0-1.6L5.9 4.8c-.6-.4-1.4.1-1.4.8z"/><rect x="16.6" y="4.6" width="3.2" height="14.8" rx="1.2"/>', 1),
  prev: sv('<path d="M19.5 5.6v12.8c0 .7-.8 1.2-1.4.8l-9.2-6.4c-.5-.4-.5-1.2 0-1.6l9.2-6.4c.6-.4 1.4.1 1.4.8z"/><rect x="4.2" y="4.6" width="3.2" height="14.8" rx="1.2"/>', 1),
  shuffle: sv('<path d="M3 7h3.5c2.2 0 3.6 1 4.8 3l2.4 4c1.2 2 2.6 3 4.8 3H21M3 17h3.5c1.6 0 2.8-.6 3.8-1.7M21 7h-2.5c-1.6 0-2.8.6-3.8 1.7M18 4l3 3-3 3M18 14l3 3-3 3"/>'),
  repeat: sv('<path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19M16 3l3 3-3 3M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5M8 21l-3-3 3-3"/>'),
  repeat1: sv('<path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19M16 3l3 3-3 3M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5M8 21l-3-3 3-3"/><path d="M11 10.2l1.5-1v5.6" stroke-width="1.8"/>'),
  list: sv('<path d="M9 6h11M9 12h11M9 18h7M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="2.4"/>'),
  lib: sv('<path d="M9 18.5V6.2l10-2.2v12.2"/><circle cx="6.5" cy="18.5" r="2.5"/><circle cx="16.5" cy="16.2" r="2.5"/>'),
  hanger: sv('<path d="M12 7.6a2.2 2.2 0 1 1 2.2-2.2c0 1.2-.8 1.7-1.6 2.2-.4.3-.6.7-.6 1.2v.6l8.6 5.6c.9.6.5 2-.6 2H4c-1.1 0-1.5-1.4-.6-2L12 9.4"/>'),
  party: sv('<path d="M5 20l3.6-10.4L14.4 15.4z"/><path d="M14 4.5c.6 1.6-.2 2.6-1.4 3M19.5 9.5c-1.6-.4-2.7.4-3 1.6M17 3.5l.01.01M20.5 13.5l.01.01M10.5 3l.01.01"/>'),
  gear: sv('<circle cx="12" cy="12" r="3.1"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h0a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v0a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>'),
  close: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: sv('<path d="M4.5 12.5l5 5L19.5 7"/>'),
  more: sv('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>', 1),
  search: sv('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/>'),
  upload: sv('<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15"/>'),
  folder: sv('<path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2.2h8a1.5 1.5 0 0 1 1.5 1.5v8.3A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z"/>'),
  trash: sv('<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2c.1.8.7 1.3 1.5 1.3h6.2c.8 0 1.4-.5 1.5-1.3L17.5 7M10 11v6M14 11v6"/>'),
  back: sv('<path d="M15 5l-7 7 7 7"/>'),
  chev: sv('<path d="M9 5l7 7-7 7"/>'),
  grip: sv('<path d="M8 7h.01M8 12h.01M8 17h.01M16 7h.01M16 12h.01M16 17h.01" stroke-width="3"/>'),
  sparkle: sv('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>'),
  edit: sv('<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>'),
  image: sv('<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-4.5L6 19"/>'),
  next2: sv('<path d="M5 12h12M13 7l5 5-5 5"/>'),
  queue: sv('<path d="M4 6h12M4 11h12M4 16h7M15 15v5l4.5-2.5z"/>'),
  playlist: sv('<path d="M4 6h10M4 11h10M4 16h6"/><path d="M17.5 18V8.5l3-1" /><circle cx="15.8" cy="18" r="1.9"/>'),
  heart: sv('<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/>'),
  info: sv('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.01"/>'),
  fullscreen: sv('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  exit: sv('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
  volume: sv('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11"/>'),
  sort: sv('<path d="M7 4v16M3.5 16.5L7 20l3.5-3.5M14 6h7M14 11h5M14 16h3"/>'),
  link: sv('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
};
I.pp = `<span class="i-play">${I.play}</span><span class="i-pause">${I.pause}</span>`;
I.rep = `<span class="i-rep">${I.repeat}</span><span class="i-rep1">${I.repeat1}</span>`;
R.I = I;

/* ---------- settings (saved in IndexedDB) ---------- */
const DEFAULTS = {
  skin: 'neon', skinMode: 'fixed',
  sfx: true, sfxVol: 0.55, flash: true, quality: 'auto', latency: 0,
  engine: 'auto', engineAuto: 'single', engineWarned: false,
  shuffle: false, repeat: 'all', sort: 'added', volume: 1,
  diy: [], vinylCrackle: false, scopeMode: 0, embedHint: false, homeHint: false,
  seenWardrobe: false, demoAdded: false,
};
const settings = {
  v: JSON.parse(JSON.stringify(DEFAULTS)),
  async load() {
    try { const s = await R.db.get('kv', 'settings'); if (s && typeof s === 'object') Object.assign(this.v, s); } catch (e) { console.warn('settings', e); }
  },
  get(k) { return this.v[k]; },
  set(k, val) { this.v[k] = val; this.save(); bus.emit('setting', k, val); },
  save: debounce(() => { R.db.put('kv', JSON.parse(JSON.stringify(settings.v)), 'settings').catch(() => {}); }, 250),
};
R.settings = settings;
window.addEventListener('pagehide', () => settings.save.flush());

/* ---------- toasts ---------- */
function toast(msg, opts) {
  opts = opts || {};
  const box = $('#toasts');
  if (!box) return () => {};
  const el = document.createElement('div');
  el.className = 'toast' + (opts.kind ? ' ' + opts.kind : '');
  el.innerHTML = `<span>${esc(msg)}</span>`;
  let done = false;
  const close = () => { if (done) return; done = true; el.classList.remove('on'); setTimeout(() => el.remove(), 380); };
  if (opts.action) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = opts.action.label;
    b.addEventListener('click', () => { try { opts.action.fn(); } finally { close(); } });
    el.appendChild(b);
  }
  while (box.children.length > 2) box.firstChild.remove();
  box.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
  setTimeout(close, opts.ms || (opts.action ? 6500 : 3200));
  return close;
}
R.toast = toast;

/* ---------- quality ---------- */
const Q = { scale: 1, slow: 0 };
R.quality = () => {
  const q = settings.get('quality');
  if (q === 'low') return 0.62;
  if (q === 'high') return 1;
  return Q.scale;
};
R.dprMax = () => (settings.get('quality') === 'low' ? 1.25 : 2);
R.qualityMonitor = (dt) => {
  // auto mode: if frames keep running slow, lower the canvas resolution once or twice
  if (settings.get('quality') !== 'auto' || document.hidden) return;
  if (dt > 0.026 && dt < 0.25) Q.slow += dt; else Q.slow = Math.max(0, Q.slow - dt * 0.5);
  if (Q.slow > 2.5 && Q.scale > 0.66) { Q.scale = Q.scale > 0.85 ? 0.8 : 0.66; Q.slow = 0; bus.emit('quality'); }
};
