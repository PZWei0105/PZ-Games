/* ───────── 下回分解：基礎工具、設定、儲存 ───────── */
const VERSION = '1.0.0';
const PFX = 'pznc.v1.';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const raf = () => new Promise((r) => requestAnimationFrame(r));
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function el(tag, attrs, html) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else if (attrs[k] != null) e.setAttribute(k, attrs[k]); }
  if (html != null) e.innerHTML = html;
  return e;
}
function hash32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function fmtCount(n) { return n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + ' 萬字' : n + ' 字'; }
function fmtMin(chars) { const m = Math.max(1, Math.round(chars / 450)); return m >= 60 ? Math.floor(m / 60) + ' 小時 ' + (m % 60 ? (m % 60) + ' 分' : '') : m + ' 分鐘'; }
function fmtClock(sec) { sec = Math.max(0, Math.floor(sec || 0)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); }
function fmtDate(iso) { if (!iso) return ''; const d = new Date(iso + (iso.length <= 10 ? 'T00:00:00+08:00' : '')); const now = Date.now(), days = Math.floor((now - d.getTime()) / 864e5); return days <= 0 ? '今天' : days === 1 ? '昨天' : days < 7 ? days + ' 天前' : (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日'; }

/* ── 小東西存 localStorage（設定、進度、看過哪些章） ── */
const Store = {
  get(k, d) { try { const v = localStorage.getItem(PFX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(PFX + k); } catch (e) {} },
};

const DEFAULTS = { theme: 'night', mode: 'page', font: 'song', size: 19, lh: 1.9, margin: 1, sfx: true, rate: 1, voice: '', follow: true, keepAwake: true };
const Settings = Object.assign({}, DEFAULTS, Store.get('settings', {}));
function saveSettings() { Store.set('settings', Settings); }

/* ── 大東西存 IndexedDB（匯入的書、章節、圖片） ── */
const DB = (() => {
  let p = null;
  const open = () => p || (p = new Promise((res, rej) => {
    let rq;
    try { rq = indexedDB.open('pznc', 1); } catch (e) { return rej(e); }
    rq.onupgradeneeded = () => { const db = rq.result; ['books', 'chaps', 'assets'].forEach((n) => { if (!db.objectStoreNames.contains(n)) db.createObjectStore(n); }); };
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
    rq.onblocked = () => rej(new Error('blocked'));
  }));
  const tx = (store, mode, fn) => open().then((db) => new Promise((res, rej) => {
    const t = db.transaction(store, mode); let out;
    t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('abort'));
    out = fn(t);
  }));
  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return {
    get: (s, k) => open().then((db) => req(db.transaction(s).objectStore(s).get(k))),
    all: (s) => open().then((db) => req(db.transaction(s).objectStore(s).getAll())),
    put: (s, k, v) => tx(s, 'readwrite', (t) => { t.objectStore(s).put(v, k); }),
    putMany: (items) => tx(Array.from(new Set(items.map((i) => i[0]))), 'readwrite', (t) => { items.forEach(([s, k, v]) => t.objectStore(s).put(v, k)); }),
    delPrefix: (s, prefix) => tx(s, 'readwrite', (t) => { t.objectStore(s).delete(IDBKeyRange.bound(prefix, prefix + '￿')); }),
    del: (s, k) => tx(s, 'readwrite', (t) => { t.objectStore(s).delete(k); }),
  };
})();

/* ── 事件匯流排 ── */
const Bus = (() => { const m = {}; return { on(e, f) { (m[e] = m[e] || []).push(f); }, emit(e, a) { (m[e] || []).forEach((f) => { try { f(a); } catch (x) { console.error(x); } }); } }; })();

/* ── 提示泡泡 ── */
function toast(msg, opt) {
  opt = opt || {};
  const box = $('#toasts');
  const t = el('div', { class: 'toast' + (opt.kind ? ' ' + opt.kind : ''), role: 'status' });
  t.innerHTML = '<span>' + msg + '</span>' + (opt.action ? '<button type="button">' + esc(opt.action) + '</button>' : '');
  if (opt.action) t.querySelector('button').onclick = () => { opt.onAction && opt.onAction(); t.remove(); };
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('on'));
  setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 350); }, opt.ms || (opt.action ? 6500 : 3200));
}

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  toc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h9"/></svg>',
  aa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18l4.5-11h1L13 18M4.6 14.5h6.8M15 18l3-7.5h.6l3 7.5M16 15.8h4.8" /></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M8 5.5v13l11-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M7 6h2v12H7zM19 6v12l-9-6z"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M15 6h2v12h-2zM5 6v12l9-6z"/></svg>',
  back15: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7.5 7.5 0 1 1-7.2 5.4M12 5L9 2.4M12 5L9 7.8"/><text x="12" y="15.6" text-anchor="middle">15</text></svg>',
  fwd30: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7.5 7.5 0 1 0 7.2 5.4M12 5l3-2.6M12 5l3 2.8"/><text x="12" y="15.6" text-anchor="middle">30</text></svg>',
  ear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14.5c0-1 .8-1.5 1.8-1.5H7v6H5.8C4.800 19 4 18.300 4 17.300zM20 14.5c0-1-.8-1.5-1.8-1.5H17v6h1.200c1 0 1.800-.7 1.800-1.700z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 14.500A7.500 7.500 0 0 1 9.500 5a7.500 7.500 0 1 0 9.500 9.500z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10 11v5M14 11v5"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.500l4.500 4.500L19 7.500"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v2.500M12 18.500V21M3 12h2.500M18.500 12H21M5.600 5.600l1.800 1.800M16.600 16.600l1.800 1.800M5.600 18.400l1.800-1.800M16.600 7.400l1.800-1.800"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2" class="fill"/></svg>',
};
