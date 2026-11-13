/* 全知 OMNISCIENT — 共用：設定、台灣時間、格式、小工具 */
'use strict';
const VERSION = '1.0.0';
const PROD_HOST = 'pzwei0105.github.io';
const IS_PROD = location.hostname === PROD_HOST;
const QS = new URLSearchParams(location.search);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isNum = (x) => typeof x === 'number' && isFinite(x);

// ---------------------------------------------------------------- 設定（只存這幾個小東西；前綴 omni.v1.，不碰冷眼的資料）
const STORE_KEY = 'omni.v1.settings';
const DEFAULTS = {
  watchMode: 'coldeye',      // coldeye＝跟這台裝置上冷眼的自選；custom＝自己挑
  watch: ['0050', '00878', '00662', '0056', '00919', '00679B'],
  sound: true, music: true, musicVol: 0.55, sfxVol: 0.8,
  fx: 'full',                // full / std / low
  speed: 1,                  // 回放速度（1＝整個交易時段約 3 分鐘）
  loop: true,                // 回放完自動重播
  boot: 'always',            // always / daily / off
  wake: true,                // 保持螢幕常亮
};
const settings = Object.assign({}, DEFAULTS, (() => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch { return {}; } })());
function saveSettings() { try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch { /* 存不了就算了 */ } }
function lsGet(k, d) { try { const v = localStorage.getItem('omni.v1.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }
function lsSet(k, v) { try { localStorage.setItem('omni.v1.' + k, JSON.stringify(v)); } catch { /* ignore */ } }

/** 冷眼的自選（同一個網域、同一個瀏覽器才讀得到；只讀，不寫） */
function coldeyeWatch() {
  try {
    const s = JSON.parse(localStorage.getItem('coldeye.settings') || 'null');
    if (s && Array.isArray(s.watch) && s.watch.length) return s.watch.filter((c) => typeof c === 'string').slice(0, 12);
  } catch { /* 讀不到 */ }
  return null;
}
function coldeyeName() {
  try { const s = JSON.parse(localStorage.getItem('coldeye.settings') || 'null'); if (s && typeof s.name === 'string' && s.name.trim()) return s.name.trim().slice(0, 12); } catch { /* */ }
  return '痞子葳';
}

// ---------------------------------------------------------------- 台灣時間（沒有日光節約，直接 +8）
// 測試用：只在不是正式網址時接受 ?now=2026-11-13T10:30（模擬某個時間點）
let CLOCK_SHIFT = 0;
(() => {
  const n = QS.get('now');
  if (n && !IS_PROD) { const t = Date.parse(n.length <= 16 ? n + ':00+08:00' : n); if (isFinite(t)) CLOCK_SHIFT = t - Date.now(); }
})();
const now = () => Date.now() + CLOCK_SHIFT;
function tw(ms = now()) {
  const d = new Date(ms + 8 * 3600e3);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate();
  const hh = d.getUTCHours(), mi = d.getUTCMinutes(), ss = d.getUTCSeconds();
  return { y, m, d: dd, hh, mi, ss, wd: d.getUTCDay(), ymd: y * 10000 + m * 100 + dd, hm: hh * 100 + mi, min: hh * 60 + mi + ss / 60 };
}
/** 'YYYY-MM-DDTHH:MM[:SS]'（沒有時區的當作台灣時間）或帶時區的 ISO → 毫秒 */
function parseTs(s) {
  if (!s) return NaN;
  if (typeof s === 'number') return s;
  const hasZone = /[zZ]|[+-]\d\d:?\d\d$/.test(s);
  return Date.parse(hasZone ? s : s + '+08:00');
}
const ymdOf = (ms) => tw(ms).ymd;
const pad2 = (n) => String(n).padStart(2, '0');
function hmText(ms) { if (!isFinite(ms)) return '—'; const t = tw(ms); return `${pad2(t.hh)}:${pad2(t.mi)}`; }
function hmsText(ms) { const t = tw(ms); return `${pad2(t.hh)}:${pad2(t.mi)}:${pad2(t.ss)}`; }
function dateText(ymd) { if (!ymd) return '—'; return `${Math.floor(ymd / 100) % 100}/${ymd % 100}`; }
function stampText(ms) {
  if (!isFinite(ms)) return '—';
  const t = tw(ms), today = tw().ymd;
  return t.ymd === today ? hmText(ms) : `${t.m}/${t.d} ${hmText(ms)}`;
}
function ageText(ms) {
  if (!isFinite(ms)) return '—';
  const s = Math.max(0, (now() - ms) / 1000);
  if (s < 90) return '剛剛';
  if (s < 3600) return `${Math.round(s / 60)} 分鐘前`;
  if (s < 86400 * 2) return `${Math.round(s / 3600)} 小時前`;
  return `${Math.round(s / 86400)} 天前`;
}
/** 交易時段分鐘（09:00＝0，13:30＝270） */
const SESSION_MIN = 270;
function ymdToMs(ymd, hh = 0, mi = 0) {
  const y = Math.floor(ymd / 10000), m = Math.floor(ymd / 100) % 100, d = ymd % 100;
  return Date.UTC(y, m - 1, d, hh - 8, mi);
}
function addDays(ymd, n) { const ms = ymdToMs(ymd, 12) + n * 86400e3; return tw(ms).ymd; }
function weekday(ymd) { return new Date(ymdToMs(ymd, 12) + 8 * 3600e3).getUTCDay(); }
const WD = ['日', '一', '二', '三', '四', '五', '六'];

// ---------------------------------------------------------------- 數字格式（台灣習慣：漲紅跌綠）
function fmtPx(x, dp) {
  if (!isNum(x)) return '—';
  const d = dp != null ? dp : (Math.abs(x) >= 1000 ? 2 : 2);
  return x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtPct(x, dp = 2) { if (!isNum(x)) return '—'; return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(dp) + '%'; }
function fmtChg(x, dp = 2) { if (!isNum(x)) return '—'; return (x > 0 ? '▲' : x < 0 ? '▼' : '■') + Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }); }
function fmtMoney(x) {
  if (!isNum(x)) return '—';
  const a = Math.abs(x), s = x < 0 ? '−' : '';
  if (a >= 1e12) return s + (a / 1e12).toFixed(2) + ' 兆';
  if (a >= 1e8) return s + (a / 1e8).toFixed(a >= 1e10 ? 0 : 1) + ' 億';
  if (a >= 1e4) return s + (a / 1e4).toFixed(0) + ' 萬';
  return s + a.toFixed(0);
}
function fmtSignedMoney(x) { if (!isNum(x)) return '—'; return (x > 0 ? '+' : '') + fmtMoney(x); }
const dirCls = (x) => (!isNum(x) || x === 0 ? 'flat' : x > 0 ? 'up' : 'dn');

// ---------------------------------------------------------------- 小型事件匯流排
const bus = {
  h: {},
  on(e, f) { (this.h[e] = this.h[e] || []).push(f); },
  emit(e, a) { (this.h[e] || []).forEach((f) => { try { f(a); } catch (err) { console.error(e, err); } }); },
};

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
const reducedMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
