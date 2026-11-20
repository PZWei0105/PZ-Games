'use strict';
/* 解包 UNPACKED — 共用工具、設定、儲存 */
const VERSION = '1.0.0';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl2br = (s) => esc(s).replace(/\n/g, '<br>');
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LS = {
  k: (n) => 'unpacked.v1.' + n,
  get(n, d) { try { const v = localStorage.getItem(this.k(n)); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(n, v) { try { localStorage.setItem(this.k(n), JSON.stringify(v)); } catch (e) { /* 空間滿了就算了 */ } },
};

const S = {
  settings: Object.assign({ sfx: true, bgm: true, vol: 0.8, bgmVol: 0.32, intro: 'daily', fx: 'full', shAuto: true, shSound: true, huntAlert: true, skin: 'graffiti' }, LS.get('settings', {})),
  marks: LS.get('marks', {}),        // id → want/playing/done/no
  notes: LS.get('notes', {}),        // id → 我的筆記
  thoughts: LS.get('thoughts', {}),  // id#i → 我對討論題的想法
  posted: LS.get('posted', {}),      // id → 發佈日期
  edits: LS.get('edits', {}),        // id → 改過的貼文
  cmp: LS.get('cmp', []),            // 比較中的 id
  seen: LS.get('seen', {}),          // id → 看過
  muted: false,                      // 這一次「靜音進入」
  index: null, live: null, feats: {}, hist: {},
  wish: null, weekly: null, weekF: {}, wishSkip: {},   // Steam 願望單（獵價）、每週懶人包、願望單裡不寫解包的
  huntSeen: LS.get('huntSeen', {}),  // 看過的特價（appid:價格）
  picks: null, pickF: {},           // 推坑目錄、推坑稿
  board: null, boardD: null,        // 行情板（Steam 線上人數前百名）、每日高峰
  free: null, events: null,         // 免費補給站、大特賣與活動時程
  tgaD: null, qa: null, inbox: null, // TGA 預測戰、點播台的回答與收件
  scroll: {},
};
const save = (k) => LS.set(k, S[k]);
const fxOn = () => S.settings.fx === 'full' && !REDUCED;

let hapT = 0;
function haptic(ms = 12) {
  try {
    if (navigator.vibrate) { navigator.vibrate(ms); return; }
    if (!IOS || !S.settings.sfx) return;
    const now = performance.now(); if (now - hapT < 60) return; hapT = now;
    const l = document.createElement('label'); l.className = 'hap hide'; l.setAttribute('aria-hidden', 'true');
    const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1;
    l.appendChild(i); document.head.appendChild(l); l.click(); l.remove();
  } catch (e) { /* 沒有觸覺 */ }
}

/* ---- 時間與數字 ---- */
function todayTW() { return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); }
function dayDiff(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400e3); }
function ago(iso) {
  if (!iso) return '';
  const m = Math.max(0, (Date.now() - Date.parse(iso)) / 60000);
  if (m < 2) return '剛剛';
  if (m < 60) return Math.round(m) + ' 分鐘前';
  if (m < 60 * 24) return Math.round(m / 60) + ' 小時前';
  return Math.round(m / 1440) + ' 天前';
}
function mdDay(d) { if (!d) return ''; const [y, m, dd] = d.split('-'); return dd ? `${+m}/${+dd}` : (m ? `${y}/${+m}` : y); }
const WK = ['日', '一', '二', '三', '四', '五', '六'];
function fmtN(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 100000) return (n / 10000).toFixed(n >= 1e6 ? 0 : 1).replace(/\.0$/, '') + ' 萬';
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + ' 萬';
  return Number(n).toLocaleString('zh-TW');
}
function fmtNT(cents) { if (cents == null) return '—'; return 'NT$' + Math.round(cents / 100).toLocaleString('zh-TW'); }
function rnd(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rot(id, i = 0, amp = 1.6) { const r = rnd(hashStr(id) + i * 97)(); return ((r * 2 - 1) * amp).toFixed(2); }

/* ---- 提示 ---- */
let toastT = 0;
function toast(msg, kind = '') {
  const t = $('#toast'); if (!t) return;
  t.className = kind; t.textContent = msg;
  requestAnimationFrame(() => t.classList.add('on'));
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) {
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e2) { return false; }
  }
}

/* ---- 圖示（SVG） ---- */
const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>',
  mega: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M3 10v4h3l7 5V5L6 10H3z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  can: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="7" y="8" width="10" height="14" rx="2"/><path d="M9 8V5h6v3M11 5V3h3"/><path d="M17 4l2-1M17 6h3M17 8l2 1" stroke-linecap="round"/></svg>',
  canoff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="7" y="8" width="10" height="14" rx="2"/><path d="M9 8V5h6v3"/><path d="M4 4l16 16" stroke-linecap="round"/></svg>',
  boom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="8" width="20" height="12" rx="2"/><circle cx="7.5" cy="14" r="3"/><circle cx="16.5" cy="14" r="3"/><path d="M7 8V5h10v3"/></svg>',
  cons: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 18.5 9 9.5l5.5 3.5 5-8"/><circle cx="4.5" cy="18.5" r="2" fill="currentColor"/><circle cx="9" cy="9.5" r="2.3" fill="currentColor"/><circle cx="14.5" cy="13" r="1.8" fill="currentColor"/><circle cx="19.5" cy="5" r="2.5" fill="currentColor"/></svg>',
  recap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M3 6.5v11M21 6.5v11"/><path d="M10.5 9v6l5-3z" fill="currentColor"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.2"/></svg>',
  shirt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"><path d="M8.2 3.2 3.4 6.1l2.1 4.1 2.4-1v11.6h8.2V9.2l2.4 1 2.1-4.1-4.8-2.9c-.5 1.6-2 2.7-3.8 2.7s-3.3-1.1-3.8-2.7z"/><path d="M9.5 14.5h5" stroke-width="1.6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l15 8-15 8z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21" stroke-linecap="round"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M5 5l14 14M19 5 5 19"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V4H3v13h5"/></svg>',
  dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M6 10l6 6 6-6M4 21h16"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 12v8h14v-8"/></svg>',
  gem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3 7 9l5 12 5-12-2-6"/></svg>',
  speak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg>',
  shorts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"><rect x="5.5" y="2" width="13" height="20" rx="3"/><path d="M10 8.5v7l5.5-3.5z" fill="currentColor"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"><path d="M12 20.5s-7.6-4.7-9.4-9.4C1.3 7.6 3.5 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.5 0 5.7 3.6 4.4 7.1-1.8 4.7-9.4 9.4-9.4 9.4z"/></svg>',
  vol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
  film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M7.5 4.5v15M16.5 4.5v15M3 9h4.5M3 15h4.5M16.5 9H21M16.5 15H21"/></svg>',
  page: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"><path d="M6 2.5h9l4 4v15H6z"/><path d="M15 2.5v4h4M9 12h7M9 16h5"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"><path d="M2.5 4h2.6l2.3 11h11l2.3-8H6.2"/><circle cx="9.5" cy="19.5" r="1.6"/><circle cx="17" cy="19.5" r="1.6"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 14h3v3H8z" fill="currentColor"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"><path d="M7 3.5h10v5a5 5 0 0 1-10 0z"/><path d="M7 5.5H3.5a3.5 3.5 0 0 0 4 4M17 5.5h3.5a3.5 3.5 0 0 1-4 4M12 13.5v3.5M8 21h8l-1-4H9z"/></svg>',
  radio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="11" r="2.2" fill="currentColor"/><path d="M8.2 7.2a5.4 5.4 0 0 0 0 7.6M15.8 7.2a5.4 5.4 0 0 1 0 7.6M5.4 4.4a9.4 9.4 0 0 0 0 13.2M18.6 4.4a9.4 9.4 0 0 1 0 13.2M12 13.2 9 22h6z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M6.5 15.5 11 11l3 3 6.5-7"/><path d="M15.5 7h5v5"/></svg>',
  gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13"/><path d="M12 8C10.5 4.5 6.5 4 6.5 6.5S11 8 12 8zM12 8c1.5-3.5 5.5-4 5.5-1.5S13 8 12 8z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>',
  full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
};
