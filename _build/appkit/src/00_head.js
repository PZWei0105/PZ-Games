/* ==========================================================================
   00 開頭：命名空間、環境、小工具
   整個 App 引擎包在一個 IIFE 裡，只對外公開 window.PZA（PZ App）。
   模組之間共用這個閉包裡的變數，不必互相 import；Node 測試時沒有 DOM，畫面相關的函式不要在載入時就碰 document。
   ========================================================================== */
const PZA = { version: '__PZA_VERSION__', build: '__PZA_BUILD__' };
const HAS_DOM = typeof document !== 'undefined' && typeof window !== 'undefined';
const noop = () => { };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 裝置與環境（Node 測試時都是 false） */
const Env = PZA.env = (() => {
  const e = { ios: false, android: false, mobile: false, touch: false, standalone: false, reduced: false };
  if (!HAS_DOM) return e;
  const ua = navigator.userAgent || '';
  const mt = navigator.maxTouchPoints || 0;
  e.ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && mt > 1);   // iPadOS 會假裝成 Mac
  e.android = /Android/.test(ua);
  e.touch = mt > 0 || 'ontouchstart' in window;
  e.mobile = e.ios || e.android;
  try { e.standalone = !!(navigator.standalone || matchMedia('(display-mode: standalone)').matches); } catch (er) { /* 舊瀏覽器 */ }
  try { e.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (er) { /* 舊瀏覽器 */ }
  return e;
})();
PZA.util = { esc, sleep, noop };
