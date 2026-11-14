/* ==========================================================================
   00 開頭：命名空間、環境偵測、小工具
   整個引擎包在一個 IIFE 裡，只對外公開 window.PZ。
   模組之間共用這個閉包裡的變數（例如 Screen、Input、R），不必互相 import。
   ========================================================================== */
const PZ = { version: '__PZ_VERSION__', build: '__PZ_BUILD__' };
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
