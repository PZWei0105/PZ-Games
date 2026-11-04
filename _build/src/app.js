/* PZ 遊戲收藏 — app script. Plain JS, no framework. */
(() => {
'use strict';

const MODE = window.PZ_MODE === 'claude' ? 'claude' : 'web';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DAY = 864e5;
const isTouch = matchMedia('(hover: none)').matches || 'ontouchstart' in window;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const vib = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* no haptics */ } };

function hexRgb(hex) {
  const h = String(hex || '#8fd3ff').replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function hueOf([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hh *= 60; return hh < 0 ? hh + 360 : hh;
}
function fmtDur(ms) {
  const m = Math.round((ms || 0) / 6e4);
  if (m < 1) return ms > 0 ? '不到 1 分鐘' : '還沒玩過';
  if (m < 60) return m + ' 分鐘';
  const h = Math.floor(m / 60), r = m % 60;
  return h + ' 小時' + (r ? ' ' + r + ' 分' : '');
}
const spacedDur = (ms) => (Math.round((ms || 0) / 6e4) >= 1 ? ' ' : '') + fmtDur(ms);
function fmtDurShort(ms) {
  const m = Math.round((ms || 0) / 6e4);
  if (m < 60) return m + '<small>分</small>';
  return (m / 60).toFixed(m < 600 ? 1 : 0) + '<small>小時</small>';
}
function relTime(ts) {
  if (!ts) return '還沒玩過';
  const d = Date.now() - ts;
  if (d < 6e4) return '剛剛';
  if (d < 36e5) return Math.floor(d / 6e4) + ' 分鐘前';
  if (d < DAY) return Math.floor(d / 36e5) + ' 小時前';
  const days = Math.floor(d / DAY);
  if (days === 1) return '昨天';
  if (days < 7) return days + ' 天前';
  const t = new Date(ts); return (t.getMonth() + 1) + '/' + t.getDate();
}
function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return y + ' 年 ' + m + ' 月 ' + d + ' 日';
}

/* ───────────── icons ───────────── */
const I = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>',
  sndOn: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  sndOff: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 3.2 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/></svg>',
  out: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.1A8 8 0 1 1 20 12z"/></svg>',
  doc: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  cloud: '<svg viewBox="0 0 24 24"><path d="M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.6A3.8 3.8 0 0 1 17.5 18z"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.9 5.8 3.9 9s-1.3 6.2-3.9 9c-2.6-2.8-3.9-5.8-3.9-9S9.4 5.8 12 3z"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.2A9.7 9.7 0 0 1 12 5c5 0 8.7 4.3 9.7 7-.4 1.1-1.2 2.4-2.3 3.6M6.2 6.2C4.4 7.5 3 9.4 2.3 12c1 2.7 4.7 7 9.7 7 1.6 0 3.1-.4 4.4-1.1"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8"/></svg>',
  expand: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>',
  pad: '<svg viewBox="0 0 24 24"><path d="M7.5 7h9a5 5 0 0 1 4.9 6l-.8 4a2.4 2.4 0 0 1-4.2 1L14.5 16h-5l-1.9 2a2.4 2.4 0 0 1-4.2-1l-.8-4a5 5 0 0 1 4.9-6z"/><path d="M8 10v3M6.5 11.5h3M15.5 11h.01M17.5 12.5h.01"/></svg>',
  touch: '<svg viewBox="0 0 24 24"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11M12 10.5V9.2a1.5 1.5 0 0 1 3 0v1.8M15 11v-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.8-2.4L4.2 15.3a1.6 1.6 0 0 1 2.4-2.1L9 15.5"/></svg>',
  mouse: '<svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 7v3"/></svg>',
  kb: '<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7.5 14h9"/></svg>',
  rotate: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="11" rx="2.2"/><path d="M8 3.5A9 9 0 0 1 19 5l.5-2.4M19.5 5.2 17 5.6"/></svg>',
  laptop: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="11" rx="1.6"/><path d="M2 19h20"/></svg>',
  bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  apps: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="7" rx="2.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="3.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="3.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="2.2"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
  film: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 9.5h18M3 14.5h18M8 5v4.5M8 14.5V19M16 5v4.5M16 14.5V19"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm1.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM8.5 14a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>',
  games: '<svg viewBox="0 0 24 24"><path d="M7.5 7h9a5 5 0 0 1 4.9 6l-.8 4a2.4 2.4 0 0 1-4.2 1L14.5 16h-5l-1.9 2a2.4 2.4 0 0 1-4.2-1l-.8-4a5 5 0 0 1 4.9-6z"/><path d="M8 10v3M6.5 11.5h3"/></svg>',
};
const MARK = (id = 'm') => `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe7a8"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#8fd3ff"/></linearGradient></defs><rect x="3" y="3" width="58" height="58" rx="16" fill="rgba(10,13,26,.85)" stroke="url(#${id}g)" stroke-width="2.4"/><path d="M25 18.5 46 32 25 45.5z" fill="none" stroke="url(#${id}g)" stroke-width="4.6" stroke-linejoin="round"/></svg>`;

/* ───────────── storage ───────────── */
const Store = {
  k: 'pzgc.v1.',
  get(n, d) { try { const v = localStorage.getItem(this.k + n); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(n, v) { try { localStorage.setItem(this.k + n, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};
const S = {
  cat: null, games: [], archive: [], apps: [], byId: {}, byBuild: {}, genres: {},
  settings: Object.assign({ sfx: true, music: true, vol: 0.8, boot: true }, Store.get('settings', {})),
  favs: new Set(Store.get('favs', [])),
  hidden: new Set(Store.get('hidden', [])),
  stats: Store.get('stats', {}),
  builds: Store.get('builds', {}),
  seen: Store.get('seen', null),
  base: 'home',
  lib: { q: '', genre: 'all', status: 'all', sort: 'new', fav: false },
  current: null,
};
const save = {
  settings: () => Store.set('settings', S.settings),
  favs: () => Store.set('favs', [...S.favs]),
  hidden: () => Store.set('hidden', [...S.hidden]),
  stats: () => Store.set('stats', S.stats),
  builds: () => Store.set('builds', S.builds),
};
const STATUS = { shipped: '已完成', dev: '製作中', failed: '試作失敗', paused: '停工', idea: '構想中', archived: '未上架' };
const GENRE_ORDER = ['survivor', 'card', 'tactics', 'action', 'sim', 'party', 'duel', 'story', 'arcade'];
const FEATURED = ['tideline', 'off-script', 'counterspin', 'whalefall-2', 'dead-mens-wares', 'night-for-ages', 'echoline'];

/* ───────────── sound ───────────── */
const Sound = (() => {
  let ctx = null, master, sfx, mus, verb, comp;
  let root = 57, unlocked = false;
  const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { return null; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 3.2; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = S.settings.vol;
    master.connect(comp); comp.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master);
    mus = ctx.createGain(); mus.gain.value = 0; mus.connect(master);
    verb = ctx.createConvolver(); verb.buffer = impulse(2.8, 2.4);
    const vg = ctx.createGain(); vg.gain.value = 0.4; verb.connect(vg); vg.connect(master);
    return ctx;
  }
  function impulse(sec, decay) {
    const r = ctx.sampleRate, n = Math.floor(r * sec), b = ctx.createBuffer(2, n, r);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  function unlock() {
    const c = init(); if (!c) return;
    if (c.state !== 'running') c.resume().catch(() => {});
    if (!unlocked) {
      try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) { /* ignore */ }
      unlocked = true;
    }
  }
  const on = () => ctx && unlocked && S.settings.sfx && ctx.state !== 'closed';
  function tone({ f = 440, f1 = 0, t = 0, d = 0.15, type = 'sine', g = 0.2, a = 0.005, wet = 0, lp = 0, q = 0.7, det = 0, dest }) {
    const now = ctx.currentTime + t;
    const o = ctx.createOscillator(); o.type = type; o.detune.value = det;
    o.frequency.setValueAtTime(f, now);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, now + d);
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.0001, now);
    gn.gain.exponentialRampToValueAtTime(g, now + a);
    gn.gain.exponentialRampToValueAtTime(0.0001, now + d);
    let n = o;
    if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; fl.Q.value = q; o.connect(fl); n = fl; }
    n.connect(gn); gn.connect(dest || sfx);
    if (wet) { const w = ctx.createGain(); w.gain.value = wet; gn.connect(w); w.connect(verb); }
    o.start(now); o.stop(now + d + 0.05);
  }
  let nbuf = null;
  function noise({ t = 0, d = 0.3, g = 0.12, f = 1200, f1 = 0, type = 'bandpass', q = 0.9, a = 0.01, wet = 0.2 }) {
    if (!nbuf) { nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const dd = nbuf.getChannelData(0); for (let i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1; }
    const now = ctx.currentTime + t;
    const s = ctx.createBufferSource(); s.buffer = nbuf;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, now);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, now + d);
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0.0001, now); gn.gain.exponentialRampToValueAtTime(g, now + a); gn.gain.exponentialRampToValueAtTime(0.0001, now + d);
    s.connect(fl); fl.connect(gn); gn.connect(sfx);
    if (wet) { const w = ctx.createGain(); w.gain.value = wet; gn.connect(w); w.connect(verb); }
    s.start(now, Math.random()); s.stop(now + d + 0.05);
  }
  const play = {
    tick() { if (!on()) return; tone({ f: 2300 + Math.random() * 300, d: 0.035, g: 0.022, type: 'sine' }); },
    tap() { if (!on()) return; tone({ f: 540, f1: 820, d: 0.09, g: 0.07, type: 'triangle' }); tone({ f: 1640, d: 0.05, g: 0.018, t: 0.01 }); vib(6); },
    open() { if (!on()) return; tone({ f: N(root + 19), d: 0.26, g: 0.08, wet: 0.35 }); tone({ f: N(root + 26), t: 0.07, d: 0.34, g: 0.07, wet: 0.45 }); noise({ f: 6000, type: 'highpass', d: 0.22, g: 0.018, wet: 0.3 }); vib(8); },
    back() { if (!on()) return; tone({ f: N(root + 24), d: 0.12, g: 0.06, type: 'triangle' }); tone({ f: N(root + 17), t: 0.06, d: 0.18, g: 0.05, type: 'triangle', wet: 0.2 }); },
    swipe() { if (!on()) return; noise({ f: 700, f1: 2600, d: 0.2, g: 0.045, q: 1.4, wet: 0.25 }); tone({ f: N(root + 31), t: 0.06, d: 0.3, g: 0.025, wet: 0.6 }); },
    fav(onOff) {
      if (!on()) return;
      if (onOff) [0, 4, 7, 12, 16].forEach((s, i) => tone({ f: N(root + 24 + s), t: i * 0.045, d: 0.32, g: 0.055, type: 'triangle', wet: 0.5 }));
      else tone({ f: N(root + 19), f1: N(root + 12), d: 0.2, g: 0.06, type: 'triangle' });
      vib(10);
    },
    toggle(v) { if (!on()) return; tone({ f: v ? 980 : 620, d: 0.05, g: 0.05, type: 'square', lp: 2400 }); vib(5); },
    err() { if (!on()) return; tone({ f: 150, d: 0.22, g: 0.08, type: 'sawtooth', lp: 700 }); },
    launch(r) {
      if (!on()) return; const k = r || root;
      tone({ f: 120, f1: 34, d: 0.9, g: 0.42, type: 'sine' });
      noise({ f: 260, f1: 6200, d: 0.62, g: 0.14, q: 1.1, a: 0.5, wet: 0.3 });
      noise({ t: 0.58, f: 900, f1: 120, type: 'lowpass', d: 0.7, g: 0.32, q: 0.6, a: 0.005, wet: 0.5 });
      tone({ t: 0.58, f: 58, f1: 40, d: 1.1, g: 0.34 });
      [0, 7, 12, 16, 19, 24].forEach((s, i) => {
        tone({ t: 0.58 + i * 0.012, f: N(k + 12 + s), d: 1.9, g: 0.045, type: 'sawtooth', lp: 2600, wet: 0.65 });
        tone({ t: 0.62 + i * 0.07, f: N(k + 36 + s), d: 0.9, g: 0.022, type: 'triangle', wet: 0.8 });
      });
      vib([12, 40, 30]);
    },
    reel(p = 0) {
      if (!on()) return;
      tone({ f: 1350 + p * 900, d: 0.03, g: 0.055 - p * 0.015, type: 'triangle', lp: 4800 });
      noise({ f: 5400, type: 'highpass', d: 0.016, g: 0.018, wet: 0 });
      if (p > 0.82) vib(4);
    },
    spinStart() {
      if (!on()) return;
      noise({ f: 280, f1: 3400, d: 0.6, a: 0.16, g: 0.07, q: 1.2, wet: 0.35 });
      tone({ f: 96, f1: 52, d: 0.55, g: 0.18 });
      tone({ t: 0.04, f: N(root + 19), f1: N(root + 31), d: 0.5, g: 0.03, type: 'sawtooth', lp: 2200, wet: 0.5 });
    },
    win() {
      if (!on()) return;
      tone({ f: 82, f1: 38, d: 0.8, g: 0.36 });
      noise({ f: 900, f1: 160, type: 'lowpass', d: 0.5, g: 0.2, q: 0.6, a: 0.004, wet: 0.4 });
      [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone({ t: i * 0.045, f: N(root + 12 + s), d: 1.0, g: 0.05, type: 'triangle', wet: 0.6 }));
      [0, 7, 12, 16].forEach((s, i) => tone({ t: 0.02, f: N(root + s), d: 1.8, g: 0.03, type: 'sawtooth', lp: 1800, wet: 0.7, det: i * 4 }));
      [24, 28, 31, 36, 40].forEach((s, i) => tone({ t: 0.34 + i * 0.07, f: N(root + 12 + s), d: 1.5, g: 0.026, type: 'sine', wet: 0.9 }));
      noise({ t: 0.3, f: 7600, type: 'highpass', d: 1.1, g: 0.026, a: 0.2, wet: 0.7 });
    },
    trIntro() {
      if (!on()) return;
      noise({ f: 180, f1: 5200, d: 1.9, a: 1.6, g: 0.07, q: 1.0, wet: 0.5 });
      tone({ f: N(root - 12), f1: N(root), d: 1.9, g: 0.05, type: 'sawtooth', lp: 900, a: 1.2, wet: 0.5 });
      tone({ t: 1.85, f: 64, f1: 36, d: 1.3, g: 0.42 });
      noise({ t: 1.85, f: 1200, f1: 140, type: 'lowpass', d: 0.9, g: 0.22, q: 0.6, a: 0.004, wet: 0.6 });
      [0, 7, 12, 19].forEach((s, i) => tone({ t: 1.86 + i * 0.015, f: N(root + s), d: 2.6, g: 0.035, type: 'sawtooth', lp: 1500, wet: 0.8, det: i * 5 }));
    },
    cut(i = 0) {
      if (!on()) return;
      tone({ f: 58, f1: 34, d: 0.75, g: 0.3 });
      noise({ f: 2400, f1: 300, d: 0.5, g: 0.05, q: 0.8, a: 0.004, wet: 0.5 });
      const pent = [0, 2, 4, 7, 9];
      const n = pent[i % pent.length];
      tone({ t: 0.03, f: N(root + 24 + n), d: 1.6, g: 0.04, type: 'triangle', wet: 0.85 });
      tone({ t: 0.11, f: N(root + 31 + n), d: 1.4, g: 0.02, type: 'sine', wet: 0.9 });
    },
    trEnd() {
      if (!on()) return;
      tone({ f: 70, f1: 40, d: 1.2, g: 0.3 });
      [0, 4, 7, 11, 14, 19].forEach((s, i) => tone({ t: i * 0.06, f: N(root + 12 + s), d: 2.4, g: 0.04, type: 'triangle', wet: 0.8 }));
      [0, 7, 12].forEach((s, i) => tone({ f: N(root + s), d: 3.0, g: 0.03, type: 'sawtooth', lp: 1400, wet: 0.8, det: i * 4 }));
    },
    boot() {
      if (!on()) return;
      noise({ f: 200, f1: 3600, d: 1.0, a: 0.8, g: 0.08, wet: 0.5 });
      tone({ t: 0.85, f: 46, f1: 38, d: 1.4, g: 0.38 });
      [0, 7, 12, 16, 19].forEach((s, i) => tone({ t: 0.85, f: N(45 + 12 + s), d: 2.6, g: 0.04, type: 'sawtooth', lp: 1800, wet: 0.7, det: i * 3 }));
      [12, 19, 24, 28, 31, 36].forEach((s, i) => tone({ t: 1.0 + i * 0.09, f: N(57 + s), d: 1.2, g: 0.04, type: 'sine', wet: 0.8 }));
    },
  };
  /* lobby music: a bright, bouncy chiptune-pop loop (major key, 112 BPM, light swing).
     Section A carries the tune, section B lets an arpeggio breathe; the key follows the game in focus,
     changing only at phrase boundaries so it never lurches mid-bar. */
  const BPM = 112, STEP = 60 / BPM / 4, SWING = 0.1;
  const PROG = [0, 7, 9, 5, 0, 7, 5, 7];                      // I V vi IV | I V IV V
  const TRI = { 0: [0, 4, 7], 7: [7, 11, 14], 9: [9, 12, 16], 5: [5, 9, 12] };
  const MEL = [                                                // per bar: [16th step, semitone above key, length]
    [[0, 4, 2], [2, 7, 2], [4, 9, 2], [6, 7, 2], [8, 4, 2], [10, 0, 2], [12, 2, 4]],
    [[0, 2, 2], [2, 7, 2], [4, 11, 2], [6, 14, 2], [8, 12, 4], [12, 11, 4]],
    [[0, 9, 2], [2, 12, 2], [4, 16, 2], [6, 14, 2], [8, 12, 2], [10, 9, 2], [12, 7, 4]],
    [[0, 5, 2], [2, 9, 2], [4, 12, 4], [8, 9, 2], [10, 7, 2], [12, 4, 2], [14, 2, 2]],
    [[0, 4, 2], [2, 7, 2], [4, 9, 2], [6, 12, 2], [8, 16, 4], [12, 14, 2], [14, 12, 2]],
    [[0, 14, 4], [4, 11, 2], [6, 7, 2], [8, 11, 2], [10, 14, 2], [12, 19, 4]],
    [[0, 17, 2], [2, 16, 2], [4, 12, 2], [6, 9, 2], [8, 12, 2], [10, 14, 2], [12, 16, 4]],
    [[0, 14, 2], [2, 12, 2], [4, 11, 2], [6, 7, 2], [8, 7, 2], [10, 11, 2], [12, 14, 4]],
  ];
  const ARP = [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 2, 1, 0, 1];
  const MUS_LEVEL = 0.5;
  let mOn = false, mTimer = 0, mStep = 0, mNext = 0, mKey = 60, mPendingKey = null, mBus = null, mDucked = false;
  function mVoice(type, f, t, d, g, o = {}) {
    const a = o.a || 0.006, rel = o.rel || 0.07;
    const osc = ctx.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(f, t); if (o.det) osc.detune.value = o.det;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g, t + a);
    gn.gain.setTargetAtTime(g * (o.sus || 0.6), t + a, Math.max(0.02, d * 0.35));
    gn.gain.setTargetAtTime(0.0001, t + d, rel / 3);
    let n = osc;
    if (o.lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; fl.Q.value = 0.5; osc.connect(fl); n = fl; }
    n.connect(gn); gn.connect(mBus);
    osc.start(t); osc.stop(t + d + rel + 0.12);
  }
  function mNoise(t, d, g, f, type = 'highpass', q = 0.7) {
    if (!nbuf) { nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const dd = nbuf.getChannelData(0); for (let i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1; }
    const src = ctx.createBufferSource(); src.buffer = nbuf;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const gn = ctx.createGain(); gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(fl); fl.connect(gn); gn.connect(mBus);
    src.start(t, Math.random() * 1.5); src.stop(t + d + 0.02);
  }
  function mKick(t) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(mBus); o.start(t); o.stop(t + 0.24);
  }
  function mPlay(s, t) {
    const sec = s >= 128 ? 1 : 0, bar = Math.floor((s % 128) / 16), st = s % 16;
    if (st === 0 && bar % 4 === 0 && mPendingKey != null) { mKey = mPendingKey; mPendingKey = null; }
    const K = mKey, R = PROG[bar], tri = TRI[R];
    // drums
    if (st === 0 || st === 8 || (st === 14 && bar % 2 === 1)) mKick(t);
    if (st === 4 || st === 12) { mNoise(t, 0.11, 0.07, 1700, 'bandpass', 0.9); mNoise(t + 0.012, 0.09, 0.05, 2200, 'bandpass', 0.9); }
    if (st % 2 === 0) mNoise(t, 0.03, st % 4 === 2 ? 0.04 : 0.022, 7800);
    if (st === 14 && bar % 4 === 3) mNoise(t, 0.18, 0.03, 6800);
    // bass: octave bounce on the eighths
    if (st % 2 === 0) mVoice('triangle', N(K - 24 + R + (st % 4 === 2 ? 12 : 0)), t, STEP * 1.5, 0.12, { lp: 1100, sus: 0.5 });
    // offbeat chord stabs give it the skip
    if (st === 2 || st === 6 || st === 10 || st === 14) tri.forEach((x, i) => mVoice('triangle', N(K - 12 + x), t, STEP * 1.1, 0.028, { det: i * 3, sus: 0.4 }));
    if (!sec) {
      // section A: the tune — a soft square lead doubled by a triangle an octave down for body
      for (const [ms, n, len] of MEL[bar]) {
        if (ms !== st) continue;
        mVoice('square', N(K + n), t, STEP * len * 0.9, 0.045, { lp: 3000, sus: 0.65 });
        mVoice('triangle', N(K + n - 12), t, STEP * len * 0.9, 0.04, { sus: 0.6 });
      }
    } else {
      // section B: a bell arpeggio over the same changes
      mVoice('sine', N(K + 12 + tri[ARP[st]] + (st >= 8 && bar % 2 ? 12 : 0)), t, STEP * 0.9, 0.03, { sus: 0.3, rel: 0.12 });
    }
    // a little chime opens every phrase
    if (st === 0 && bar % 4 === 0) { mVoice('sine', N(K + 24), t, 0.5, 0.025, { sus: 0.2, rel: 0.4 }); mVoice('sine', N(K + 31), t + 0.07, 0.5, 0.018, { sus: 0.2, rel: 0.4 }); }
  }
  function mTick() {
    if (!mOn || !ctx) return;
    while (mNext < ctx.currentTime + 0.15) {
      mPlay(mStep, mNext + (mStep % 2 ? STEP * SWING : 0));
      mNext += STEP; mStep = (mStep + 1) % 256;
    }
  }
  function musGain(v, sec) {
    const now = ctx.currentTime;
    mus.gain.cancelScheduledValues(now); mus.gain.setValueAtTime(Math.max(0.0001, mus.gain.value), now);
    mus.gain.linearRampToValueAtTime(v, now + sec);
  }
  function startMusic() {
    if (!ctx || !unlocked || !S.settings.music || mOn) return;
    if (!mBus) {
      mBus = ctx.createGain(); mBus.gain.value = 1;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 38;
      mBus.connect(hp); hp.connect(mus);
      const send = ctx.createGain(); send.gain.value = 0.12; mBus.connect(send); send.connect(verb);
    }
    if (mPendingKey != null) { mKey = mPendingKey; mPendingKey = null; }
    mOn = true; mStep = 0; mNext = ctx.currentTime + 0.12;
    musGain(mDucked ? 0.08 : MUS_LEVEL, 1.4);
    clearInterval(mTimer); mTimer = setInterval(mTick, 25); mTick();
  }
  function stopMusic(fade = 1.0) {
    if (!mOn || !ctx) return;
    mOn = false; clearInterval(mTimer);
    musGain(0.0001, fade);
  }
  function duck(on) { mDucked = on; if (ctx && mOn) musGain(on ? 0.08 : MUS_LEVEL, 0.6); }
  function setRoot(hex) {                          // UI sounds follow the colour in focus at once
    const semi = Math.round(hueOf(hexRgb(hex)) / 30) % 12;
    root = 52 + ((semi * 7) % 12);
  }
  function musicKey(hex) {                         // on a game's page the music moves to that game's key (at the next phrase)
    const k = hex ? 57 + (((Math.round(hueOf(hexRgb(hex)) / 30) % 12) * 7) % 12) % 8 : 60;
    if (k !== mKey) mPendingKey = k; else mPendingKey = null;
  }
  function setVol(v) { if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05); }
  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); }
  function resume() { if (ctx && unlocked && ctx.state !== 'running') ctx.resume().catch(() => {}); }
  return { unlock, play, startMusic, stopMusic, duck, setRoot, musicKey, setVol, suspend, resume, get unlocked() { return unlocked; }, get root() { return root; } };
})();

/* ───────────── ambient light ───────────── */
const Ambient = (() => {
  let flip = false, cur = null;
  function set(item) {
    if (!item || item === cur) return;
    cur = item;
    const c = item.accent || '#8fd3ff', rgb = hexRgb(c);
    const root = document.documentElement.style;
    root.setProperty('--acc', c);
    root.setProperty('--acc-rgb', rgb.join(','));
    const meta = $('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', '#05060c');
    Motes.color(rgb);
    Sound.setRoot(c);
    const a = $('#ambient .amb.a'), b = $('#ambient .amb.b');
    const next = flip ? a : b, prev = flip ? b : a;
    flip = !flip;
    const src = item.media && item.media.blur;
    next.style.backgroundImage = src ? `url("${src}")` : `radial-gradient(60% 50% at 50% 30%, ${c}, ${item.c1 || '#05060c'})`;
    next.classList.add('on'); prev.classList.remove('on');
  }
  return { set };
})();

const Motes = (() => {
  let cv, cx, w = 0, h = 0, dpr = 1, ps = [], rgb = [143, 211, 255], raf = 0, last = 0, running = false;
  const count = () => (innerWidth > 1000 ? 64 : 38);
  function resize() {
    if (!cv) return;
    dpr = Math.min(1.5, devicePixelRatio || 1);
    w = innerWidth; h = innerHeight;
    cv.width = w * dpr; cv.height = h * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const mk = (y) => ({ x: Math.random() * w, y: y == null ? h + Math.random() * 40 : y, r: 0.5 + Math.random() * 1.9, vy: -(5 + Math.random() * 18), vx: (Math.random() - 0.5) * 7, a: 0, ta: 0.18 + Math.random() * 0.5, tw: Math.random() * 6.3, sp: 0.6 + Math.random() * 1.6 });
  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    cx.clearRect(0, 0, w, h);
    const [r, g, b] = rgb;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.tw += dt * p.sp;
      p.a += (p.ta - p.a) * dt * 0.8;
      if (p.y < -20 || p.x < -20 || p.x > w + 20) { ps[i] = mk(); continue; }
      const al = p.a * (0.55 + 0.45 * Math.sin(p.tw));
      cx.fillStyle = `rgba(${r},${g},${b},${(al * 0.22).toFixed(3)})`;
      cx.beginPath(); cx.arc(p.x, p.y, p.r * 4, 0, 6.283); cx.fill();
      cx.fillStyle = `rgba(255,255,255,${(al * 0.85).toFixed(3)})`;
      cx.beginPath(); cx.arc(p.x, p.y, p.r * 0.7, 0, 6.283); cx.fill();
    }
  }
  function start() {
    if (reduced || running) return;
    cv = cv || $('#motes'); if (!cv) return;
    cx = cx || cv.getContext('2d');
    resize();
    if (!ps.length) for (let i = 0; i < count(); i++) ps.push(mk(Math.random() * h));
    running = true; last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  addEventListener('resize', () => resize());
  return { start, stop, color(c) { rgb = c; } };
})();

/* ───────────── catalog ───────────── */
function prep(cat) {
  S.cat = cat;
  S.genres = cat.genres || {};
  const fixColor = (o) => {
    const p = o.palette || ['#222632', '#0a0b10', '#8fd3ff'];
    o.accent = o.accent || p[2];
    o.c0 = p[0]; o.c1 = p[1];
    o.rgb = hexRgb(o.accent).join(',');
  };
  S.games = (cat.games || []).map((g) => { fixColor(g); g.kind = 'game'; return g; });
  S.archive = (cat.archive || []).map((g) => { fixColor(g); g.kind = 'archive'; return g; });
  S.apps = (cat.apps || []).map((a) => { fixColor(a); a.type = a.type || a.kind; a.kind = 'app'; return a; });
  S.byId = {}; S.byBuild = {};
  for (const g of [...S.games, ...S.archive, ...S.apps]) S.byId[g.id] = g;
  for (const g of S.games) for (const b of g.builds || []) S.byBuild[b.id] = { game: g, build: b };
}
const visible = () => S.games.filter((g) => !S.hidden.has(g.id));
const isNew = (g) => g.created && (Date.now() - new Date(g.created + 'T00:00:00+08:00').getTime()) < 7 * DAY;
const statOf = (id) => S.stats[id] || { plays: 0, ms: 0, last: 0 };
const buildOf = (g) => (g.builds || []).find((b) => b.id === S.builds[g.id]) || (g.builds || [])[0];
const cssVars = (o) => `--c:${o.accent};--c-rgb:${o.rgb};--c0:${o.c0};--c1:${o.c1}`;
const gameUrl = (b) => (MODE === 'claude' ? b.artifact : 'games/' + b.id + '/index.html');

/* ───────────── templates ───────────── */
function cover(g, cls = '') {
  const m = g.media || {};
  const tags = [];
  if (g.status === 'dev') tags.push(`<span class="chip st-dev">製作中</span>`);
  if (g.status === 'failed') tags.push(`<span class="chip st-failed">試作失敗</span>`);
  if (isNew(g) && g.kind === 'game') tags.push(`<span class="chip new">新</span>`);
  const img = m.cover ? `<img src="${esc(m.cover)}" alt="" loading="lazy" decoding="async">` : `<div class="glyph">${esc((g.glyph || g.title || '?').slice(0, 1))}${g.kind === 'archive' ? `<small>${esc(STATUS[g.status] || '')}</small>` : ''}</div>`;
  return `<div class="cv ${cls}">${img}${g.pick ? `<span class="star" title="PZ 推薦">${I.star}</span>` : ''}<div class="tags">${tags.join('')}</div></div>`;
}
function card(g, sub) {
  const s = sub != null ? sub : (S.genres[g.genre] ? S.genres[g.genre].label : '');
  const dim = g.kind === 'archive' || g.status === 'failed' ? ' dim' : '';
  return `<button class="card${dim}" style="${cssVars(g)}" data-act="${g.kind === 'archive' ? 'arch' : 'open'}" data-id="${esc(g.id)}" aria-label="${esc(g.title)}">${cover(g)}<div class="t">${esc(g.title)}</div><div class="s">${esc(s)}</div></button>`;
}
function contCard(g) {
  const st = statOf(g.id), m = g.media || {};
  const src = m.wide || m.hero, f = m.wide ? (m.wideFocus || [50, 50]) : (m.heroFocus || [50, 30]);
  return `<button class="card cont" style="${cssVars(g)};--fx:${f[0]}%;--fy:${f[1]}%" data-act="open" data-id="${esc(g.id)}">
    <div class="cv">${src ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async">` : ''}
      <span class="go" data-act="play" data-id="${esc(g.id)}" aria-label="開始遊戲">${I.play}</span>
      <div class="meta"><b>${esc(g.title)}</b><span>${esc(relTime(st.last))}・共 ${esc(fmtDur(st.ms))}</span></div></div></button>`;
}
function shelf(title, items, opts = {}) {
  if (!items.length) return '';
  const more = opts.more ? `<button class="more" data-act="${opts.more.act}" data-arg="${esc(opts.more.arg || '')}">全部${I.chev}</button>` : '';
  const body = items.map((g) => (opts.cont ? contCard(g) : card(g, opts.sub ? opts.sub(g) : undefined))).join('');
  return `<section class="shelf"><div class="shelf-h"><h2>${esc(title)}</h2>${opts.more ? '' : `<span class="n">${items.length}</span>`}${more}${opts.desc ? `<p>${esc(opts.desc)}</p>` : ''}</div><div class="row">${body}</div></section>`;
}
function splitChars(t) {
  return [...t].map((ch, i) => `<span class="ch" style="animation-delay:${(0.08 + i * 0.07).toFixed(2)}s">${esc(ch)}</span>`).join('');
}

/* ───────────── home ───────────── */
const Hero = { list: [], ix: 0, timer: 0, dur: 8000, el: null, paused: false };
function heroList() {
  const out = [], seen = new Set();
  const recent = visible().filter((g) => statOf(g.id).last && Date.now() - statOf(g.id).last < 14 * DAY)
    .sort((a, b) => statOf(b.id).last - statOf(a.id).last);
  if (recent[0]) { out.push({ g: recent[0], resume: true }); seen.add(recent[0].id); }
  for (const id of FEATURED) { const g = S.byId[id]; if (g && !seen.has(id) && !S.hidden.has(id)) { out.push({ g }); seen.add(id); } }
  return out;
}
function heroSlide({ g, resume }, i) {
  const m = g.media || {}, f = m.heroFocus || [50, 35];
  const genre = S.genres[g.genre] ? S.genres[g.genre].label : '';
  const kick = [
    resume ? `<span class="chip resume-tag">${I.clock.replace('<svg', '<svg width="13" height="13" style="stroke:currentColor;fill:none;stroke-width:2"')}上次玩到這裡</span>` : '',
    g.pick ? `<span class="chip pick">${I.star}PZ 推薦</span>` : '',
    isNew(g) ? `<span class="chip new">新入庫</span>` : '',
    `<span class="chip">${esc(genre)}</span>`,
  ].join('');
  const img = m.hero ? `<img src="${esc(m.hero)}" alt="" decoding="async" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} style="object-position:${f[0]}% ${f[1]}%">` : '';
  const land = m.orient === 'l' || m.orient === 'd';
  return `<div class="slide${m.orient === 'p' ? ' portrait' : ''}${land ? ' landscape' : ''}" data-i="${i}" style="${cssVars(g)}">
    <div class="art">${img}</div>
    ${m.hero && m.orient === 'p' ? `<div class="stage"><img src="${esc(m.hero)}" alt="" loading="lazy" decoding="async"></div>` : ''}
    ${m.hero && land ? `<div class="stage-l"><img src="${esc(m.hero)}" alt="" ${i ? 'loading="lazy"' : ''} decoding="async"></div>` : ''}
    <div class="info">
      <div class="kicker">${kick}</div>
      <h1>${splitChars(g.title)}</h1>
      ${g.en ? `<div class="en">${esc(g.en)}</div>` : ''}
      <p class="tag">${esc(g.tagline || g.summary || '')}</p>
      <div class="acts">${playBtn(g, '開始遊戲')}<button class="ghost" data-act="open" data-id="${esc(g.id)}">${I.info}介紹</button>${(m.shots || []).length >= 2 ? `<button class="ghost round" data-act="trailer" data-id="${esc(g.id)}" aria-label="看預告" title="看預告">${I.film}</button>` : ''}</div>
    </div></div>`;
}
function playBtn(g, label, cls = '') {
  const b = buildOf(g);
  if (!b) return '';
  if (MODE === 'claude') return `<a class="play ${cls}" href="${esc(b.artifact)}" target="_blank" rel="noopener" data-act="ext" style="${cssVars(g)}">${I.play}${esc(label)}</a>`;
  return `<button class="play ${cls}" data-act="play" data-id="${esc(g.id)}" style="${cssVars(g)}">${I.play}${esc(label)}</button>`;
}
function renderHome() {
  const v = $('#view-home');
  Hero.list = heroList();
  const vis = visible();
  const live = vis.filter((g) => g.status !== 'failed');
  const recent = vis.filter((g) => statOf(g.id).last).sort((a, b) => statOf(b.id).last - statOf(a.id).last).slice(0, 10);
  const favs = vis.filter((g) => S.favs.has(g.id));
  const picks = live.filter((g) => g.pick);
  const fresh = [...live].sort((a, b) => (b.created || '').localeCompare(a.created || '')).slice(0, 10);
  let shelves = '';
  shelves += shelf('繼續遊玩', recent, { cont: true });
  shelves += shelf('我的最愛', favs);
  shelves += shelf('PZ 推薦', picks, { desc: '你玩過、親口說好的那幾款。' });
  shelves += shelf('最新入庫', fresh, { sub: (g) => fmtDate(g.created).replace(/^\d+ 年 /, '') + '入庫' });
  for (const k of GENRE_ORDER) {
    const items = live.filter((g) => g.genre === k);
    shelves += shelf(S.genres[k] ? S.genres[k].label : k, items, { more: { act: 'lib-genre', arg: k } });
  }
  shelves += shelf('試作失敗的原型', vis.filter((g) => g.status === 'failed'), { desc: '沒有成功，但留著當紀念，也當借鏡。', sub: () => '試作失敗' });
  const totalMs = Object.values(S.stats).reduce((a, s) => a + (s.ms || 0), 0);
  const played = Object.values(S.stats).filter((s) => s.plays).length;
  const stats = `<div class="stat-strip">
    <div class="stat"><b>${vis.length}</b><span>款可以玩</span></div>
    <div class="stat"><b>${played}</b><span>款玩過</span></div>
    <div class="stat"><b>${fmtDurShort(totalMs)}</b><span>總遊玩時間</span></div>
    <div class="stat"><b>${S.favs.size}</b><span>款最愛</span></div></div>`;
  const fanPool = live.filter((g) => (g.builds || []).length && g.media && g.media.cover), fan = [];
  for (let k = 0; k < 3 && fanPool.length; k++) fan.push(fanPool.splice((Math.random() * fanPool.length) | 0, 1)[0]);
  const lucky = fan.length ? `<button class="lucky" data-act="spin"><span class="lk-fan">${fan.map((g) => `<img src="${esc(g.media.cover)}" alt="" loading="lazy">`).join('')}</span><span class="lk-txt"><small>手氣不錯</small><b>今天玩什麼？</b><span>不知道玩哪款，就讓收藏庫替你轉一款</span></span><span class="lk-go">${I.dice}</span></button>` : '';
  v.innerHTML = `<section class="hero" id="hero">${Hero.list.map(heroSlide).join('')}</section>
    <div class="shelves">${stats}${lucky}${shelves}
      <button class="browse-all" data-act="tab" data-arg="library"><div><b>瀏覽全部 ${vis.length} 款遊戲</b><span>依類型、狀態篩選，或直接搜尋</span></div>${I.chev}</button>
    </div>`;
  Hero.el = $('#hero');
  const dots = `<div class="dots">${Hero.list.map((_, i) => `<button data-act="hero-dot" data-arg="${i}" aria-label="第 ${i + 1} 款"><i></i></button>`).join('')}</div>`;
  $$('.slide .info', Hero.el).forEach((n) => n.insertAdjacentHTML('beforeend', dots));
  heroGo(0, false);
  bindHeroGestures();
  if (!reduced) {
    let raf = 0;
    v.onscroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = v.scrollTop;
        if (y < 900 && Hero.el) { const sl = $('.slides', Hero.el) || Hero.el; Hero.el.style.setProperty('--py', (y * 0.38).toFixed(1) + 'px'); Hero.el.style.setProperty('--po', Math.max(0, 1 - y / 520).toFixed(3)); }
      });
    };
  }
}
function heroGo(i, user = true) {
  if (!Hero.list.length || !Hero.el) return;
  Hero.ix = (i + Hero.list.length) % Hero.list.length;
  // only the slide on screen, and the one fading out, are drawn; the rest stay off the page so
  // their big pictures and layers don't sit in memory
  const slides = $$('.slide', Hero.el), any = slides.some((s) => s.classList.contains('on'));
  slides.forEach((s, k) => {
    if (k === Hero.ix) {
      if (s.classList.contains('on')) return;
      clearTimeout(s._out); s.classList.remove('out');
      if (any) { s.classList.add('pre'); void s.offsetWidth; }
      s.classList.add('on'); s.classList.remove('pre');
    } else if (s.classList.contains('on')) {
      s.classList.remove('on'); s.classList.add('out');
      clearTimeout(s._out); s._out = setTimeout(() => s.classList.remove('out'), 1000);
    } else s.classList.remove('pre');
  });
  clearTimeout(Hero.warm);
  if (!Hero.paused) Hero.warm = setTimeout(heroWarm, Math.max(0, Hero.dur - 1500));
  const nx = Hero.list[(Hero.ix + 1) % Hero.list.length], nsrc = nx && nx.g.media && nx.g.media.hero;
  if (nsrc && nsrc !== Hero.pre) { Hero.pre = nsrc; const im = new Image(); im.decoding = 'async'; im.src = nsrc; }
  $$('.slide.on .dots button', Hero.el).forEach((d, k) => {
    d.classList.toggle('on', k === Hero.ix); d.classList.toggle('done', k < Hero.ix);
    d.style.setProperty('--dur', Hero.dur + 'ms');
  });
  if (S.base === 'home' && !S.current && !SP.el) Ambient.set(Hero.list[Hero.ix].g);
  if (user) Sound.play.swipe();
  clearTimeout(Hero.timer);
  if (!Hero.paused) Hero.timer = setTimeout(() => heroGo(Hero.ix + 1, false), Hero.dur);
}
// the next slide is put on the page (still invisible) a moment before it fades in, so its picture
// is decoded and drawn by then and the crossfade doesn't stutter
function heroWarm() {
  if (!Hero.el || Hero.paused) return;
  const n = $$('.slide', Hero.el)[(Hero.ix + 1) % Hero.list.length];
  if (n && !n.classList.contains('on')) n.classList.add('pre');
}
function heroPause(p) {
  Hero.paused = p; if (!Hero.el) return;
  Hero.el.classList.toggle('paused', p);
  clearTimeout(Hero.timer); clearTimeout(Hero.warm);
  if (p) $$('.slide.pre', Hero.el).forEach((s) => s.classList.remove('pre'));
  if (!p) { Hero.timer = setTimeout(() => heroGo(Hero.ix + 1, false), Hero.dur * 0.6); Hero.warm = setTimeout(heroWarm, Math.max(0, Hero.dur * 0.6 - 1500)); }
}
function bindHeroGestures() {
  const el = Hero.el; if (!el) return;
  let x0 = 0, y0 = 0, t0 = 0, active = false;
  el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button) return; x0 = e.clientX; y0 = e.clientY; t0 = Date.now(); active = true; }, { passive: true });
  el.addEventListener('pointerup', (e) => {
    if (!active) return; active = false;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - t0 < 700) { S.swallowClick = true; setTimeout(() => (S.swallowClick = false), 60); heroGo(Hero.ix + (dx < 0 ? 1 : -1)); }
  }, { passive: true });
  el.addEventListener('pointercancel', () => (active = false));
  if (!isTouch) { el.addEventListener('mouseenter', () => heroPause(true)); el.addEventListener('mouseleave', () => heroPause(false)); }
}

/* ───────────── library ───────────── */
function renderLibrary() {
  const v = $('#view-library');
  const L = S.lib;
  const vis = visible();
  const counts = {}; vis.forEach((g) => { counts[g.genre] = (counts[g.genre] || 0) + 1; });
  const gchips = [`<button class="fchip${L.genre === 'all' && !L.fav ? ' on' : ''}" data-act="f-genre" data-arg="all">全部<span class="n">${vis.length}</span></button>`,
    `<button class="fchip${L.fav ? ' on' : ''}" data-act="f-fav">我的最愛<span class="n">${vis.filter((g) => S.favs.has(g.id)).length}</span></button>`,
    ...GENRE_ORDER.filter((k) => counts[k]).map((k) => `<button class="fchip${L.genre === k ? ' on' : ''}" data-act="f-genre" data-arg="${k}">${esc(S.genres[k].label)}<span class="n">${counts[k]}</span></button>`)].join('');
  const sts = [['all', '全部狀態'], ['shipped', '已完成'], ['dev', '製作中'], ['failed', '試作失敗']];
  const sorts = { new: '最新入庫', recent: '最近玩過', time: '玩最久', name: '名稱' };
  const schips = sts.map(([k, t]) => `<button class="fchip${L.status === k ? ' on' : ''}" data-act="f-status" data-arg="${k}">${t}</button>`).join('')
    + `<button class="fchip sel" data-act="f-sort">排序：${sorts[L.sort]}${I.down}</button>`;
  v.innerHTML = `<header class="phead"><h1>全部遊戲</h1><p>${vis.length} 款收在這裡，點進去就能玩。</p></header>
    <div class="lib-tools">
      <label class="searchbox">${I.search}<input type="search" id="lib-q" placeholder="找遊戲：名稱、類型、關鍵字" value="${esc(L.q)}" enterkeyhint="search" autocomplete="off"></label>
      <div class="filters">${gchips}</div><div class="filters">${schips}</div>
    </div>
    <div id="lib-grid"></div>
    <div id="lib-arch"><div class="sec-title"><h2>還沒上架的作品</h2><p>早期在對話裡做的、或還在構想中的，先收在這裡。</p></div>
    <div class="grid">${S.archive.map((a) => card(a, STATUS[a.status] || '')).join('')}</div></div>`;
  renderLibGrid();
  const inp = $('#lib-q');
  inp.addEventListener('input', () => { L.q = inp.value.trim(); renderLibGrid(); });
  // keep the selected chip in view (a chip far to the right would otherwise hide that a filter is on)
  requestAnimationFrame(() => $$('.lib-tools .filters', v).forEach((row) => {
    const on = $('.fchip.on', row);
    if (on && (on.offsetLeft + on.offsetWidth > row.clientWidth + row.scrollLeft || on.offsetLeft < row.scrollLeft)) row.scrollLeft = on.offsetLeft - 18;
  }));
}
const libFiltering = () => S.lib.fav || S.lib.genre !== 'all' || S.lib.status !== 'all';
function searchScore(g, q) {
  const t = g.title.toLowerCase();
  if (t.startsWith(q)) return 4;
  if (t.includes(q)) return 3;
  if ((g.en || '').toLowerCase().includes(q) || ((S.genres[g.genre] || {}).label || '').toLowerCase().includes(q)) return 2;
  return searchText(g).includes(q) ? 1 : 0;
}
function libFiltered() {
  const L = S.lib, q = L.q.toLowerCase();
  let list = visible();
  if (q) {
    // a search looks through every game, whatever filter is selected; title matches come first
    return list.map((g) => [g, searchScore(g, q)]).filter(([, sc]) => sc).sort((a, b) => b[1] - a[1] || (b[0].created || '').localeCompare(a[0].created || '')).map(([g]) => g);
  }
  if (L.fav) list = list.filter((g) => S.favs.has(g.id));
  if (L.genre !== 'all') list = list.filter((g) => g.genre === L.genre);
  if (L.status !== 'all') list = list.filter((g) => g.status === L.status);
  const by = {
    new: (a, b) => (b.created || '').localeCompare(a.created || ''),
    recent: (a, b) => statOf(b.id).last - statOf(a.id).last || (b.created || '').localeCompare(a.created || ''),
    time: (a, b) => statOf(b.id).ms - statOf(a.id).ms || (b.created || '').localeCompare(a.created || ''),
    name: (a, b) => a.title.localeCompare(b.title, 'zh-Hant'),
  };
  return list.sort(by[L.sort]);
}
function renderLibGrid() {
  const list = libFiltered();
  const sub = (g) => {
    if (S.lib.sort === 'recent' && statOf(g.id).last) return relTime(statOf(g.id).last);
    if (S.lib.sort === 'time' && statOf(g.id).ms) return fmtDur(statOf(g.id).ms);
    return g.status !== 'shipped' ? STATUS[g.status] : (S.genres[g.genre] || {}).label;
  };
  const q = S.lib.q;
  const head = q ? `<div class="lib-note">搜尋「${esc(q)}」：${list.length ? `找到 ${list.length} 款` : '沒有找到'}${libFiltering() ? '（搜尋時不套用上面的篩選）' : ''}</div>` : '';
  $('#lib-grid').innerHTML = head + (list.length ? `<div class="grid">${list.map((g) => card(g, sub(g))).join('')}</div>`
    : `<div class="empty"><b>沒有符合的遊戲</b>${q ? '換個關鍵字試試，例如遊戲名稱的其中一個字。' : '把篩選條件放寬一點試試。'}</div>`);
  const arch = $('#lib-arch'); if (arch) arch.hidden = !!q || libFiltering();
}
function searchText(g) {
  if (!g._st) g._st = [g.title, g.en, g.tagline, g.summary, (S.genres[g.genre] || {}).label, STATUS[g.status], (g.highlights || []).join(' '), g.inspired].join(' ').toLowerCase();
  return g._st;
}

/* ───────────── apps ───────────── */
function renderApps() {
  const v = $('#view-apps');
  const web = S.apps.filter((a) => a.kind === 'app' && a.type === 'web');
  const tools = S.apps.filter((a) => a.type === 'claude');
  const tile = (a) => {
    const long = (a.glyph || '').length > 1;
    const open = MODE === 'claude'
      ? `<a class="app-tile" style="${cssVars(a)}" href="${esc(a.url)}" target="_blank" rel="noopener" data-act="ext">`
      : `<button class="app-tile" style="${cssVars(a)}" data-act="app" data-id="${esc(a.id)}">`;
    const close = MODE === 'claude' ? '</a>' : '</button>';
    return `${open}<span class="ic${long ? ' long' : ''}">${esc(a.glyph || a.title.slice(0, 1))}</span>
      ${MODE === 'web' ? `<a class="out" href="${esc(a.url)}" target="_blank" rel="noopener" data-act="ext" aria-label="用瀏覽器開啟">${I.out}</a>` : ''}
      <b>${esc(a.title)}</b>${a.en ? `<div class="en">${esc(a.en)}</div>` : ''}<p>${esc(a.tagline)}</p>${close}`;
  };
  const tool = (a) => `<a class="tool" style="${cssVars(a)}" href="${esc(a.url)}" target="_blank" rel="noopener" data-act="ext"><span class="ic">${esc((a.glyph || a.title).slice(0, 2))}</span><div><b>${esc(a.title)}</b><span>${esc(a.tagline)}</span></div>${I.out}</a>`;
  v.innerHTML = `<header class="phead"><h1>專屬 App</h1><p>每天會打開的工具，都收在這一頁。</p></header>
    <div class="apps-grid">${web.map(tile).join('')}</div>
    <div class="sec-title"><h2>在 Claude 裡的工具</h2><p>這些要登入 Claude 才能開，會在新視窗打開。</p></div>
    <div class="tool-list">${tools.map(tool).join('')}</div>`;
}

/* ───────────── game page ───────────── */
const DEV_ICON = { '觸控': 'touch', '滑鼠': 'mouse', '鍵盤': 'kb', '手把': 'pad' };
function deviceText(h) {
  if (!h) return '';
  if (h.device === 'desktop') return '電腦（鍵盤滑鼠）';
  if (h.orientation === 'landscape') return h.device === 'both' ? '手機橫拿或電腦' : '手機橫拿';
  if (h.orientation === 'any') return h.device === 'both' ? '手機或電腦都行（直拿橫拿皆可）' : '手機（直拿橫拿皆可）';
  return h.device === 'both' ? '手機直拿或電腦' : '手機直拿';
}
function inputText(arr) {
  const m = { touch: '觸控', mouse: '滑鼠', keyboard: '鍵盤', gamepad: '手把' };
  return (arr || []).map((x) => m[x] || x).join('、');
}
function actionChips(s, input) {
  const t = String(s || '');
  if (input === '鍵盤' || input === '手把') {
    const parts = t.split(/\s*[／/]\s*|\s*、\s*/).filter(Boolean);
    if (parts.every((p) => p.length <= 14)) return parts.map((p) => `<span class="kbd">${esc(p)}</span>`).join('');
  }
  return `<span class="gest">${esc(t)}</span>`;
}
function noteFor(g) {
  const h = g.how || {};
  const out = [];
  if (h.orientation === 'landscape' && h.device !== 'desktop') out.push([I.rotate, '這款要把手機橫過來玩，在電腦上玩也很順。']);
  if (h.device === 'desktop') out.push([I.laptop, '這款是為電腦設計的，建議用筆電接鍵盤滑鼠或手把來玩。']);
  if (g.status === 'failed') out.push([I.info, '這是沒有成功的試作版，留著當紀錄。']);
  return out.map(([ic, t]) => `<div class="gp-note">${ic}<span>${esc(t)}</span></div>`).join('');
}
function renderGame(g) {
  const p = $('#gamepage');
  const m = g.media || {}, h = g.how || {}, st = statOf(g.id), b = buildOf(g);
  const f = m.heroFocus || [50, 35];
  const genre = (S.genres[g.genre] || {}).label || '';
  const chips = [
    g.pick ? `<span class="chip pick">${I.star}PZ 推薦</span>` : '',
    isNew(g) ? `<span class="chip new">新入庫</span>` : '',
    `<span class="chip">${esc(genre)}</span>`,
    `<span class="chip st-${g.status}"><span class="dot"></span>${esc(STATUS[g.status])}</span>`,
  ].join('');
  const shots = (m.shots || []);
  const shotsHtml = shots.length ? `<div class="shots ${m.orient || 'p'}">${shots.map((s, i) => `<button data-act="shot" data-arg="${i}" aria-label="看大圖"><img src="${esc(s.src)}" alt="${esc(s.cap || '')}" loading="lazy" decoding="async">${s.cap ? `<figcaption>${esc(s.cap)}</figcaption>` : ''}</button>`).join('')}</div>` : '';
  const builds = (g.builds || []).length > 1 ? `<div class="builds">${g.builds.map((x) => `<button class="fchip${x.id === b.id ? ' on' : ''}" data-act="build" data-arg="${esc(x.id)}">${esc(x.label)}</button>`).join('')}</div>` : '';
  const ctl = (h.controls || []).length ? `<div class="ctl">${h.controls.map((c) => `<div class="r"><div class="dev">${I[DEV_ICON[c.input] || 'touch']}${esc(c.input)}</div><div class="act">${actionChips(c.action, c.input)}<div class="eff">${esc(c.effect)}</div></div></div>`).join('')}</div>` : '';
  const sys = (h.systems || []).length ? `<div class="sec"><h2>核心玩法</h2><div class="sys">${h.systems.map((s) => `<div class="it"><b>${esc(s.name)}</b><span>${esc(s.desc)}</span></div>`).join('')}</div></div>` : '';
  const tips = (h.tips || []).length ? `<div class="sec"><h2>新手提示</h2><ul class="tips">${h.tips.map((t) => `<li>${I.bulb}${esc(t)}</li>`).join('')}</ul></div>` : '';
  const how = (h.goal || ctl) ? `<div class="sec" id="how"><h2>怎麼玩</h2>${h.goal ? `<div class="goal"><small>你的目標</small>${esc(h.goal)}</div>` : ''}${ctl}${h.note ? `<div class="hnote">${I.info}<span><b>小提醒</b>${esc(h.note)}</span></div>` : ''}</div>` : '';
  const hl = (g.highlights || []).length ? `<div class="sec"><h2>特色</h2><div class="hl">${g.highlights.map((x) => `<span>${esc(x)}</span>`).join('')}</div></div>` : '';
  const facts = [
    ['類型', genre], ['狀態', STATUS[g.status]], ['遊玩時間', h.playtime], ['建議裝置', deviceText(h)],
    ['操作方式', inputText(h.input)], ['存檔', h.save], ['版本', (g.builds || []).map((x) => x.label).join('、')],
    ['入庫', fmtDate(g.created)], ['最近更新', fmtDate(g.updated)],
  ].filter(([, v]) => v);
  if (g.inspired) facts.push(['靈感來源', g.inspired, true]);
  // long values take a full row; a lone half-width cell before a full row (or at the end) stretches too
  const full = facts.map(([, v, f]) => !!f || String(v).length > 18);
  for (let i = 0, run = 0; i <= facts.length; i++) {
    if (i === facts.length || full[i]) { if (run % 2) full[i - 1] = true; run = 0; } else run++;
  }
  const factsHtml = `<div class="sec"><h2>遊戲資訊</h2><dl class="facts">${facts.map(([k, v], i) => `<div${full[i] ? ' class="full"' : ''}><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>`;
  const mine = `<div class="sec"><h2>我的紀錄</h2><div class="mine"><div><b>${st.plays || 0}</b><span>次開啟</span></div><div><b>${fmtDurShort(st.ms)}</b><span>遊玩時間</span></div><div><b style="font-size:17px;line-height:1.75">${esc(relTime(st.last))}</b><span>上次遊玩</span></div></div></div>`;
  const notes = (g.verdict || g.next) ? `<div class="sec"><h2>製作筆記</h2><dl class="notes">${g.verdict ? `<dt>你上次的評語</dt><dd>${esc(g.verdict)}</dd>` : ''}${g.next ? `<dt>下一步</dt><dd>${esc(g.next)}</dd>` : ''}</dl></div>` : '';
  const links = [];
  if (b && b.artifact && MODE === 'web') links.push(`<a href="${esc(b.artifact)}" target="_blank" rel="noopener" data-act="ext">${I.cloud}<div>在 Claude 開啟這一版<small>Claude 裡的版本會把存檔同步到雲端</small></div>${I.out.replace('<svg', '<svg class="arr"')}</a>`);
  if (g.online) links.push(`<a href="${esc(g.online.url)}" target="_blank" rel="noopener" data-act="ext">${I.globe}<div>${esc(g.online.label)}<small>${esc(g.online.url.replace(/^https?:\/\//, ''))}</small></div>${I.out.replace('<svg', '<svg class="arr"')}</a>`);
  (g.docs || []).forEach((d) => links.push(`<a href="${esc(d.url)}" target="_blank" rel="noopener" data-act="ext">${I.doc}<div>${esc(d.label)}<small>在 Claude 開啟</small></div>${I.out.replace('<svg', '<svg class="arr"')}</a>`));
  if (g.chat) links.push(`<a href="${esc(g.chat)}" target="_blank" rel="noopener" data-act="ext">${I.chat}<div>回到製作這款的對話<small>想改什麼，直接在那邊說</small></div>${I.out.replace('<svg', '<svg class="arr"')}</a>`);
  links.push(`<button data-act="hide" data-id="${esc(g.id)}" class="danger">${I.eyeOff}<div>${S.hidden.has(g.id) ? '取消隱藏' : '從收藏庫隱藏'}<small>${S.hidden.has(g.id) ? '讓它重新出現在首頁和全部遊戲' : '不會刪除，之後可以在設定裡找回來'}</small></div></button>`);
  const like = visible().filter((x) => x.id !== g.id && x.genre === g.genre && x.status !== 'failed')
    .sort((x, y) => (y.pick ? 1 : 0) - (x.pick ? 1 : 0) || (y.created || '').localeCompare(x.created || '')).slice(0, 10);
  const likeHtml = like.length ? `<div class="sec more-like"><h2>同類型的遊戲<span class="n">${esc(genre)}</span></h2><div class="row">${like.map((x) => card(x)).join('')}</div></div>` : '';
  // the page already shows the title, so the hero reel skips the title-screen shot
  const reelPool = shots.length >= 3 ? shots.slice(1) : shots;
  const reel = m.hero ? [m.hero, ...reelPool.map((x) => x.src).filter((x) => x !== m.hero)].slice(0, 5) : [];
  const ss = (cls) => `<div class="ss ${cls}">${reel.map((src, i) => `<img class="${i ? '' : 'on'}" src="${esc(src)}" alt="" ${i ? 'loading="lazy"' : ''} decoding="async" style="object-position:${i ? '50% 38%' : f[0] + '% ' + f[1] + '%'}">`).join('')}</div>`;
  const heroImg = m.hero ? ss('bg') : `<div class="glyph">${esc(g.title.slice(0, 1))}</div>`;
  const trBtn = shots.length >= 2 ? `<button class="tr-btn" data-act="trailer" aria-label="觀看預告"><span class="ring"></span><span class="core">${I.play}</span><small>看預告</small></button>` : '';
  p.style.cssText = cssVars(g);
  p.innerHTML = `<div class="gp-bg"><div style="background-image:url('${esc(m.blur || '')}')"></div></div>
    <div class="gp-top" id="gp-top"><button class="ibtn" data-act="close-game" aria-label="返回">${I.back}</button><div class="ttl">${esc(g.title)}</div>
      <button class="ibtn fav${S.favs.has(g.id) ? ' on' : ''}" data-act="fav" data-id="${esc(g.id)}" aria-label="加入最愛">${I.star}</button></div>
    <div class="gp-hero${m.orient === 'p' ? ' portrait' : ''}${m.orient === 'l' || m.orient === 'd' ? ' landscape' : ''}"><div class="art">${heroImg}</div>${trBtn ? trBtn.replace('tr-btn', 'tr-btn o') : ''}${m.hero && m.orient === 'p' ? `<div class="stage">${ss('')}${trBtn ? trBtn.replace('tr-btn', 'tr-btn in') : ''}</div>` : ''}${m.hero && (m.orient === 'l' || m.orient === 'd') ? `<div class="stage-l">${ss('')}${trBtn ? trBtn.replace('tr-btn', 'tr-btn in') : ''}</div>` : ''}
      <div class="info"><div class="kicker" style="display:flex;gap:6px;flex-wrap:wrap">${chips}</div><h1>${esc(g.title)}</h1>${g.en ? `<div class="en">${esc(g.en)}</div>` : ''}</div></div>
    <div class="gp-body"><div class="gp-cols"><div class="main">
      ${g.tagline ? `<p class="gp-tagline">${esc(g.tagline)}</p>` : ''}
      <div class="gp-actions" id="gp-actions">${playBtn(g, '開始遊戲', 'big')}${how ? `<button class="ghost howbtn" data-act="to-how">${I.bulb}怎麼玩</button>` : ''}</div>
      ${builds}${noteFor(g)}
      ${shotsHtml}
      <div class="sec"><h2>遊戲簡介</h2><p>${esc(g.summary)}</p></div>
      ${how}${sys}${tips}${hl}
    </div><div class="side">${factsHtml}${mine}${notes}<div class="sec"><h2>相關連結</h2><div class="links">${links.join('')}</div></div></div></div>${likeHtml}</div>
    <div class="gp-bar" id="gp-bar">${playBtn(g, '開始遊戲', 'big')}</div>`;
  p.scrollTop = 0;
  reelStart();
  const top = $('#gp-top'), bar = $('#gp-bar'), acts = $('#gp-actions');
  p.onscroll = () => {
    top.classList.toggle('solid', p.scrollTop > 220);
    if (acts) { const r = acts.getBoundingClientRect(); bar.classList.toggle('on', r.bottom < 60); }
  };
}
let reelT = 0;
function reelStart() {
  clearInterval(reelT);
  if (reduced) return;
  let i = 0;
  reelT = setInterval(() => {
    const boxes = $$('#gamepage .ss');
    if (!boxes.length || !$('#gamepage').classList.contains('on')) return;
    if (L.item || document.hidden) return;
    i++;
    boxes.forEach((b) => { const im = $$('img', b); if (im.length < 2) return; im.forEach((x, k) => x.classList.toggle('on', k === i % im.length)); });
  }, 5200);
}
function openGame(id, push = true) {
  const g = S.byId[id];
  if (!g || g.kind !== 'game') return;
  if (push) { S.pushedGame = true; location.hash = 'game-' + id; return; }
  S.current = g;
  renderGame(g);
  $('#gamepage').classList.add('on');
  $('#tabbar').classList.add('hide');
  Ambient.set(g);
  Sound.musicKey(g.accent);
  heroPause(true);
}
function closeGame(viaHistory = true) {
  if (viaHistory && S.pushedGame) { S.pushedGame = false; history.back(); return; }
  hideGame();
  setHash(baseHash(), true);
}
function hideGame() {
  closeTrailer(true);
  const p = $('#gamepage');
  if (!p.classList.contains('on')) return;
  p.classList.remove('on');
  clearInterval(reelT);
  $('#tabbar').classList.remove('hide');
  S.current = null;
  Sound.musicKey(null);
  if (S.dirtyBase) { S.dirtyBase = false; refreshBase(); }
  if (S.base === 'home' && Hero.list[Hero.ix]) Ambient.set(Hero.list[Hero.ix].g);
  heroPause(false);
}

/* ───────────── lightbox ───────────── */
function openShot(i) {
  const g = S.current; if (!g) return;
  const shots = (g.media || {}).shots || [];
  const lb = $('#lightbox');
  lb.innerHTML = `<div class="track">${shots.map((s) => `<div class="pg"><img src="${esc(s.src)}" alt="${esc(s.cap || '')}"></div>`).join('')}</div><div class="cap" id="lb-cap"></div><button class="ibtn x" data-act="lb-close" aria-label="關閉">${I.x}</button>`;
  lb.classList.add('on');
  const tr = $('.track', lb);
  const cap = (k) => { $('#lb-cap').textContent = (shots[k] && shots[k].cap ? shots[k].cap + '　' : '') + (k + 1) + ' / ' + shots.length; };
  requestAnimationFrame(() => { tr.scrollLeft = i * tr.clientWidth; cap(i); });
  tr.onscroll = () => cap(Math.round(tr.scrollLeft / tr.clientWidth));
  Sound.play.open();
}
function closeShot() { $('#lightbox').classList.remove('on'); $('#lightbox').innerHTML = ''; }

/* ───────────── launcher ───────────── */
const L = { el: null, frame: null, item: null, build: null, t0: 0, acc: 0, visT: 0, timer: 0, loaded: false, kind: 'game' };
function launch(id, from) {
  const g = S.byId[id]; if (!g) return;
  const b = buildOf(g); if (!b) return;
  if (MODE === 'claude') return;
  Sound.unlock();
  // offline: only go if this game is already saved on the device, otherwise say so instead of a browser error page
  if (navigator.onLine === false && window.caches) {
    caches.match(new URL(gameUrl(b), location.href).href)
      .then((hit) => { if (hit) ignite(g, b); else { Sound.play.err(); toast('現在沒有網路，這款還沒存進這台裝置；連上網再開就好'); } })
      .catch(() => ignite(g, b));
    return;
  }
  ignite(g, b);
}
/* A game is opened as its own page, not inside the collection: the collection (its covers, blurs
   and animations) is left behind entirely, so the game gets the phone's whole memory, exactly as
   if it had been opened on its own. The launch animation plays first, then the page switches.
   Inside the game a small button (hub.js) leads back here. */
function ignite(g, b) {
  if (S.igniting) return;
  const el = $('#launcher');
  closeShot(); closeSheet(); closeSearch();
  const m = g.media || {}, h = g.how || {};
  let hint = '';
  const portraitScreen = innerHeight > innerWidth;
  if (h.orientation === 'landscape' && portraitScreen && isTouch) hint = `<div class="hint">${I.rotate}這款請把手機橫過來玩</div>`;
  else if (h.device === 'desktop' && isTouch) hint = `<div class="hint">${I.laptop}這款建議用電腦玩</div>`;
  el.style.cssText = cssVars(g);
  el.innerHTML = `<div class="ign"><div class="art" style="background-image:url('${esc(m.hero || m.blur || '')}')"></div><div class="rays"></div><div class="burst"></div><div class="ring"></div>
      <div class="ttl"><b>${esc(g.title)}</b>${g.en ? `<small>${esc(g.en)}</small>` : ''}</div>${hint}
      <div class="load"><div class="bar"><i></i></div><span>遊戲載入中</span></div></div>`;
  el.classList.remove('ready', 'failed', 'full', 'settled'); el.classList.add('on');
  void el.offsetWidth; el.classList.add('go');
  Sound.stopMusic(0.5);
  Sound.play.launch(Sound.root);
  Motes.stop();
  heroPause(true);
  try {
    sessionStorage.setItem('pzgc.from', b.id);
    sessionStorage.setItem('pzgc.ms0', JSON.stringify({ id: g.id, ms: statOf(g.id).ms || 0 }));
  } catch (e) { /* ignore */ }
  const url = gameUrl(b);
  S.igniting = setTimeout(() => {
    shed();
    location.assign(url);
    // if the page is somehow still here much later (the switch was blocked), put the collection back
    clearTimeout(S.igniteWatch);
    S.igniteWatch = setTimeout(() => { if (!S.left && !document.hidden) { settleAfterGame(); toast('遊戲沒有打開，再按一次「開始遊戲」試試'); } }, 25000);
  }, hint ? 1700 : 1150);
}
// The collection we leave behind may sit in the browser's page cache while the game runs; it keeps
// as little as possible there (no pages full of covers). settleAfterGame() draws it again on return.
function shed() {
  S.shedGp = $('#gamepage').scrollTop;
  S.shedViews = $$('.view').map((v) => v.scrollTop);
  $$('.view').forEach((v) => { v.innerHTML = ''; });
  $('#gamepage').innerHTML = '';
  clearTimeout(Hero.timer); clearTimeout(Hero.warm); Hero.el = null;
  S.shed = true;
}
// back from a game through the browser's page cache: tidy the launch screen and pick up the new play time
// back from a game: say how long this session was (the game's button records the time)
function welcomeBack(sound) {
  let m0 = null;
  try { m0 = JSON.parse(sessionStorage.getItem('pzgc.ms0') || 'null'); sessionStorage.removeItem('pzgc.ms0'); } catch (e) { /* ignore */ }
  if (!m0 || !S.byId[m0.id]) return;
  const d = (statOf(m0.id).ms || 0) - (m0.ms || 0);
  if (sound) Sound.play.back();
  if (d >= 60000) setTimeout(() => toast(`《${S.byId[m0.id].title}》這次玩了 ${fmtDur(d)}`), 500);
}
function settleAfterGame() {
  clearTimeout(S.igniting); S.igniting = 0; clearTimeout(S.igniteWatch); S.left = false;
  const el = $('#launcher');
  if (el.classList.contains('on') && !L.frame) { el.classList.remove('on', 'go', 'ready', 'failed', 'full', 'settled'); el.innerHTML = ''; }
  S.stats = Store.get('stats', {});
  if (S.shed) {
    S.shed = false;
    const v = $('#view-' + S.base);
    setBase(S.base);
    if (v) v.scrollTop = (S.shedViews || [])[$$('.view').indexOf(v)] || 0;
    if (S.current) { renderGame(S.current); $('#gamepage').scrollTop = S.shedGp || 0; S.dirtyBase = true; }
  } else {
    S.dirtyBase = true;
    if (S.current) { const gp = $('#gamepage'), sc = gp.scrollTop; renderGame(S.current); gp.scrollTop = sc; } else refreshBase();
  }
  if (!L.item) {
    Motes.start();
    if (S.base === 'home' && !S.current) heroPause(false);
    Sound.resume(); if (S.settings.music) Sound.startMusic();
  }
  welcomeBack(true);
}
function openLauncher(item, url, kind) {
  const el = $('#launcher');
  closeShot(); closeSheet(); closeSearch();
  L.item = item; L.kind = kind; L.loaded = false;
  el.style.cssText = cssVars(item);
  const m = item.media || {};
  const h = item.how || {};
  let hint = '';
  const portraitScreen = innerHeight > innerWidth;
  if (h.orientation === 'landscape' && portraitScreen && isTouch) hint = `<div class="hint">${I.rotate}這款請把手機橫過來玩</div>`;
  else if (h.device === 'desktop' && isTouch) hint = `<div class="hint">${I.laptop}這款建議用電腦玩</div>`;
  el.innerHTML = `<div class="ign"><div class="art" style="background-image:url('${esc(m.hero || m.blur || '')}')"></div><div class="rays"></div><div class="burst"></div><div class="ring"></div>
      <div class="ttl"><b>${esc(item.title)}</b>${item.en ? `<small>${esc(item.en)}</small>` : ''}</div>${hint}
      <div class="load"><div class="bar"><i></i></div><span>${kind === 'app' ? '開啟中' : '遊戲載入中'}</span></div></div>
    <div class="fail"><div><b>${kind === 'app' ? '這個 App 沒有開起來' : '遊戲沒有載入成功'}</b><p>可能是網路斷了。可以再試一次，或先回收藏庫。</p><div class="row2"><button class="play" data-act="l-retry">${I.refresh}再試一次</button><button class="ghost" data-act="l-close">${I.home}回收藏庫</button></div></div></div>`;
  el.classList.remove('ready', 'failed', 'full'); el.classList.add('on');
  void el.offsetWidth; el.classList.add('go');
  Sound.stopMusic(0.6);
  Sound.play.launch(Sound.root);
  Motes.stop();
  heroPause(true);
  const t0 = performance.now();
  setTimeout(() => {
    const fr = document.createElement('iframe');
    fr.setAttribute('allow', 'autoplay; fullscreen; gamepad; clipboard-write; screen-wake-lock; accelerometer; gyroscope; web-share');
    fr.setAttribute('allowfullscreen', '');
    fr.title = item.title;
    fr.addEventListener('load', () => {
      if (!L.frame) return;
      L.loaded = true;
      el.classList.remove('failed');
      const wait = Math.max(0, 1650 - (performance.now() - t0));
      setTimeout(() => {
        el.classList.add('ready'); try { fr.focus(); fr.contentWindow.focus(); } catch (e) { /* cross-origin */ } showHandle();
        // once the intro has faded, the collection behind the game goes to sleep
        setTimeout(() => { if (L.frame === fr && el.classList.contains('ready')) shellSleep(true); }, 700);
      }, wait);
    });
    fr.src = url;
    el.appendChild(fr);
    L.frame = fr;
    clearTimeout(L.timer);
    L.timer = setTimeout(() => { if (!L.loaded) { el.classList.add('failed'); Sound.play.err(); } }, 45000);
    L.histLen = history.length;
  }, 380);
  if (kind === 'game') {
    const st = S.stats[item.id] || { plays: 0, ms: 0, last: 0 };
    st.plays = (st.plays || 0) + 1; st.last = Date.now();
    S.stats[item.id] = st; save.stats();
  }
  L.t0 = Date.now(); L.acc = 0; L.visT = Date.now();
  try { sessionStorage.setItem('pzgc.playing', item.id); } catch (e) { /* ignore */ }
}
/* While a game runs, everything behind it is taken off the page (display:none). Its pictures,
   blurs and layers would otherwise stay in memory, and on a phone the game plus the collection can
   be more than the browser allows: the page crashes and reloads. Scroll positions are kept. */
const ZZ = { on: false, gp: 0, views: [] };
function shellSleep(on) {
  if (on === ZZ.on) return;
  const root = document.documentElement;
  if (on) {
    ZZ.gp = $('#gamepage').scrollTop; ZZ.views = $$('.view').map((v) => v.scrollTop);
    ZZ.on = true; root.classList.add('in-game'); $('#launcher').classList.add('settled');
  } else {
    ZZ.on = false; root.classList.remove('in-game'); $('#launcher').classList.remove('settled');
    $('#gamepage').scrollTop = ZZ.gp; $$('.view').forEach((v, k) => { v.scrollTop = ZZ.views[k] || 0; });
  }
}
function closeLauncher(viaHistory = true) {
  if (viaHistory && S.pushedPlay && history.length === L.histLen) { S.pushedPlay = false; history.back(); return; }
  S.pushedPlay = false;
  const it = L.item;
  endLauncher();
  setHash(it && it.kind === 'game' ? 'game-' + it.id : baseHash(), true);
}
function endLauncher() {
  const el = $('#launcher');
  if (!el.classList.contains('on')) return;
  shellSleep(false);
  try { sessionStorage.removeItem('pzgc.playing'); } catch (e) { /* ignore */ }
  if (L.item && L.kind === 'game') {
    const now = Date.now();
    if (!document.hidden && L.visT) L.acc += now - L.visT;
    const st = S.stats[L.item.id] || { plays: 1, ms: 0, last: now };
    st.ms = (st.ms || 0) + Math.min(L.acc, 6 * 36e5); st.last = now;
    S.stats[L.item.id] = st; save.stats();
  }
  clearTimeout(L.timer);
  if (L.frame) { L.frame.remove(); L.frame = null; }
  el.classList.remove('on', 'go', 'ready', 'failed', 'full'); el.innerHTML = '';
  hideHandle();
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* ignore */ }
  Sound.play.back();
  Motes.start();
  if (S.settings.music) Sound.startMusic();
  const it = L.item; L.item = null;
  S.dirtyBase = true;
  if (S.current) { const sc = $('#gamepage').scrollTop; renderGame(S.current); $('#gamepage').scrollTop = sc; } else { refreshBase(); }
  if (it && it.kind === 'game') Ambient.set(it);
}

/* floating handle */
const HD = { x: null, y: null };
function showHandle() {
  const h = $('#handle');
  const pos = Store.get('handle', null);
  const W = innerWidth, H = innerHeight;
  HD.x = pos ? clamp(pos.x * W, 6, W - 52) : W - 54;
  HD.y = pos ? clamp(pos.y * H, 60, H - 110) : H * 0.42;
  placeHandle();
  h.classList.add('on', 'awake');
  setTimeout(() => h.classList.remove('awake'), 2600);
  if (!Store.get('handleTip', false)) { toast('想回收藏庫，點這顆圓鈕；可以拖到不擋畫面的地方'); Store.set('handleTip', true); }
}
function hideHandle() { $('#handle').classList.remove('on', 'awake', 'drag'); }
function placeHandle() { const h = $('#handle'); h.style.left = HD.x + 'px'; h.style.top = HD.y + 'px'; }
function bindHandle() {
  const h = $('#handle');
  h.innerHTML = MARK('hd');
  let sx = 0, sy = 0, ox = 0, oy = 0, moved = false, down = false;
  h.addEventListener('pointerdown', (e) => { down = true; moved = false; sx = e.clientX; sy = e.clientY; ox = HD.x; oy = HD.y; try { h.setPointerCapture(e.pointerId); } catch (er) { /* synthetic */ } h.classList.add('awake'); });
  h.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.hypot(dx, dy) > 6) { moved = true; h.classList.add('drag'); }
    if (moved) { HD.x = clamp(ox + dx, 4, innerWidth - 50); HD.y = clamp(oy + dy, 4, innerHeight - 50); placeHandle(); }
  });
  const up = () => {
    if (!down) return; down = false; h.classList.remove('drag');
    if (moved) {
      HD.x = HD.x + 23 < innerWidth / 2 ? 6 : innerWidth - 52; placeHandle();
      Store.set('handle', { x: HD.x / innerWidth, y: HD.y / innerHeight });
    } else { Sound.unlock(); Sound.play.tap(); openPlayMenu(); }
    setTimeout(() => h.classList.remove('awake'), 1800);
  };
  h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
}
function openPlayMenu() {
  const it = L.item; if (!it) return;
  const canFull = !!(document.documentElement.requestFullscreen) && !isTouch;
  const elapsed = L.kind === 'game' ? Math.max(0, L.acc + (L.visT ? Date.now() - L.visT : 0)) : 0;
  openSheet(`<h3>${esc(it.title)}</h3><p class="sub">${L.kind === 'game' ? '這次玩了' + esc(spacedDur(elapsed)) : '專屬 App'}</p>
    <div class="menu-list">
      <button class="pri" data-act="l-close">${I.home}回到收藏庫</button>
      <button data-act="sheet-close">${I.play.replace('<svg', '<svg style="fill:currentColor;stroke:none"')}繼續${L.kind === 'game' ? '玩' : '使用'}</button>
      <button data-act="l-retry">${I.refresh}重新載入</button>
      ${canFull ? `<button data-act="l-full">${I.expand}全螢幕</button>` : ''}
    </div>`);
}

/* ───────────── sheets, search, toast ───────────── */
function openSheet(html) {
  closeSheet(true);
  const scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.dataset.act = 'sheet-close';
  const sh = document.createElement('div'); sh.className = 'sheet'; sh.innerHTML = '<div class="grab"></div>' + html;
  document.body.append(scrim, sh);
  requestAnimationFrame(() => { scrim.classList.add('on'); sh.classList.add('on'); });
  S.sheet = { scrim, sh };
  return sh;
}
function closeSheet(instant) {
  const s = S.sheet; if (!s) return; S.sheet = null;
  s.scrim.classList.remove('on'); s.sh.classList.remove('on');
  setTimeout(() => { s.scrim.remove(); s.sh.remove(); }, instant ? 0 : 420);
}
function openSettings() {
  const st = S.settings;
  const hidden = [...S.hidden].map((id) => S.byId[id]).filter(Boolean);
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const totalMs = Object.values(S.stats).reduce((a, s) => a + (s.ms || 0), 0);
  openSheet(`<h3>設定</h3><p class="sub">聲音、開機動畫和收藏庫的整理。</p>
    <div class="opt"><div><b>音效</b><span>點按、切換、啟動遊戲的聲音</span></div><button class="sw${st.sfx ? ' on' : ''}" data-act="set" data-arg="sfx" aria-label="音效"></button></div>
    <div class="opt"><div><b>背景音樂</b><span>輕快的大廳配樂，調性會跟著你正在看的遊戲變換</span></div><button class="sw${st.music ? ' on' : ''}" data-act="set" data-arg="music" aria-label="背景音樂"></button></div>
    <div class="opt"><div><b>音量</b></div><input class="range" type="range" min="0" max="1" step="0.05" value="${st.vol}" id="vol"></div>
    <div class="opt"><div><b>開機動畫</b><span>每次打開收藏庫時播放</span></div><button class="sw${st.boot ? ' on' : ''}" data-act="set" data-arg="boot" aria-label="開機動畫"></button></div>
    <div class="opt" style="display:block"><b>隱藏的遊戲</b><span>${hidden.length ? '點一下就會回到收藏庫' : '目前沒有隱藏任何遊戲'}</span>
      ${hidden.length ? `<div class="hidden-list">${hidden.map((g) => `<button data-act="unhide" data-id="${esc(g.id)}">${esc(g.title)}<em>取消隱藏</em></button>`).join('')}</div>` : ''}</div>
    <div class="opt"><div><b>遊玩紀錄</b><span>${totalMs ? `總共玩了${esc(spacedDur(totalMs))}，只記在這台裝置` : '還沒有遊玩紀錄，只會記在這台裝置'}</span></div><button class="ghost sm" data-act="clear-stats">清除</button></div>
    ${MODE === 'web' && !standalone ? `<div class="add-home">${isIOS ? '<b>加到主畫面：</b>用 Safari 打開這頁，點下方的「分享」按鈕，選「加入主畫面」。之後就能像 App 一樣從主畫面打開。' : (S.installEvt ? '<b>安裝成 App：</b><button class="ghost sm" data-act="install" style="margin-top:8px">安裝到這台裝置</button>' : '<b>加到主畫面：</b>在瀏覽器選單裡選「加到主畫面」或「安裝應用程式」。')}</div>` : ''}
    <div class="about">PZ 遊戲收藏　版本 ${esc(S.cat.version || '')}<br>${S.games.length} 款遊戲、${S.apps.length} 個 App，資料更新於 ${esc(fmtDate(S.cat.updated))}。${MODE === 'web' ? '<br>新遊戲做好後會直接放上來，重新打開收藏庫就會看到。' : ''}</div>`);
  const vol = $('#vol');
  if (vol) vol.addEventListener('input', () => { st.vol = +vol.value; Sound.setVol(st.vol); save.settings(); });
}
function openArchive(id) {
  const a = S.byId[id]; if (!a) return;
  openSheet(`<div style="${cssVars(a)}"><h3>${esc(a.title)}</h3><p class="sub"><span class="chip st-${a.status}"><span class="dot"></span>${esc(STATUS[a.status])}</span></p>
    ${a.tagline ? `<p class="gp-tagline" style="margin:4px 0 10px;font-size:17px">${esc(a.tagline)}</p>` : ''}
    <p style="color:var(--text2);line-height:1.8;margin:0 0 12px">${esc(a.summary)}</p>
    <div class="gp-note">${I.info}<span>${esc(a.where ? '目前在：' + a.where + '。' : '')}${a.status === 'idea' ? '還沒開工，想做的時候跟 Claude 說「開工」。' : '想重新做出來玩，回到那段對話跟 Claude 說就好。'}</span></div></div>`);
}
function openSort() {
  const sorts = [['new', '最新入庫'], ['recent', '最近玩過'], ['time', '玩最久'], ['name', '名稱']];
  openSheet(`<h3>排序方式</h3><div class="menu-list" style="margin-top:12px">${sorts.map(([k, t]) => `<button class="${S.lib.sort === k ? 'pri' : ''}" data-act="sort" data-arg="${k}">${t}</button>`).join('')}</div>`);
}
function openSearch() {
  const s = $('#search');
  s.innerHTML = `<div class="bar"><label class="searchbox">${I.search}<input type="search" id="sq" placeholder="搜尋遊戲或 App" enterkeyhint="search" autocomplete="off"></label><button class="ghost sm" data-act="search-close">取消</button></div><div class="res" id="sres"></div>`;
  s.classList.add('on');
  const q = $('#sq');
  const run = () => {
    const t = q.value.trim().toLowerCase();
    const all = [...visible(), ...S.apps, ...S.archive];
    let res = t ? all.map((g) => [g, searchScore(g, t)]).filter(([, sc]) => sc).sort((a, b) => b[1] - a[1]).map(([g]) => g)
      : visible().filter((g) => statOf(g.id).last).sort((a, b) => statOf(b.id).last - statOf(a.id).last).slice(0, 6);
    $('#sres').innerHTML = (t ? '' : `<div class="sr-hint">${res.length ? '最近玩過' : '輸入遊戲名稱、類型或關鍵字，例如「卡牌」「颱風」「魏子葳」。'}</div>`)
      + res.slice(0, 40).map((g) => {
        const m = g.media || {};
        const act = g.kind === 'game' ? 'open' : g.kind === 'archive' ? 'arch' : 'app';
        const sub = g.kind === 'app' ? '專屬 App　' + (g.tagline || '') : g.kind === 'archive' ? STATUS[g.status] + '　' + (g.tagline || '') : ((S.genres[g.genre] || {}).label || '') + '　' + (g.tagline || '');
        return `<button class="sr-item" style="${cssVars(g)}" data-act="${act}" data-id="${esc(g.id)}"><span class="th">${m.cover ? `<img src="${esc(m.cover)}" alt="" loading="lazy">` : esc((g.glyph || g.title).slice(0, 1))}</span><div><b>${esc(g.title)}</b><span>${esc(sub)}</span></div></button>`;
      }).join('')
      + (t && !res.length ? `<div class="sr-hint">找不到「${esc(q.value)}」，換個關鍵字試試。</div>` : '');
  };
  q.addEventListener('input', run);
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const f = $('#sres .sr-item'); if (f) f.click(); } });
  run();
  setTimeout(() => q.focus(), 60);
}
function closeSearch() { const s = $('#search'); s.classList.remove('on'); s.innerHTML = ''; }

/* ───────────── 今天玩什麼？ (roulette reel) ───────────── */
const SP = { el: null, strip: null, cards: [], x: 0, cw: 128, raf: 0, spinning: false, win: null, mode: 'all', hot: -1, lastTick: 0 };
const spinEligible = () => visible().filter((g) => g.status !== 'failed' && (g.builds || []).length);
function spinPool() {
  const all = spinEligible();
  if (SP.mode === 'fresh') return all.filter((g) => !statOf(g.id).plays);
  if (SP.mode === 'fav') return all.filter((g) => S.favs.has(g.id));
  return all;
}
const pickOne = (arr, not) => { let g; for (let i = 0; i < 6; i++) { g = arr[(Math.random() * arr.length) | 0]; if (!not || g.id !== not) break; } return g; };
function spinCard(g) {
  const m = g.media || {};
  return `<div class="sp-card" style="${cssVars(g)}">${m.cover ? `<img src="${esc(m.cover)}" alt="" decoding="async">` : `<span class="gl">${esc(g.title.slice(0, 1))}</span>`}<b>${esc(g.title)}</b></div>`;
}
function spinFill(n, pool, after) {
  let prev = after, html = '';
  for (let i = 0; i < n; i++) { const g = pickOne(pool, prev && prev.id); html += spinCard(g); prev = g; SP.cards.push(g); }
  return html;
}
function openSpin() {
  if (SP.el) return;
  const all = spinEligible();
  if (!all.length) { toast('目前沒有可以玩的遊戲'); return; }
  const anyFav = all.some((g) => S.favs.has(g.id)), anyFresh = all.some((g) => !statOf(g.id).plays);
  if ((SP.mode === 'fav' && !anyFav) || (SP.mode === 'fresh' && !anyFresh)) SP.mode = 'all';
  const el = document.createElement('div');
  el.id = 'spin';
  el.innerHTML = `<div class="sp-bg"></div><div class="sp-lines"></div>
    <button class="ibtn sp-x" data-act="spin-close" aria-label="關閉">${I.x}</button>
    <div class="sp-head"><small>手氣不錯・${all.length} 款裡抽一款</small><h2>今天玩什麼？</h2>
      <div class="sp-filters">${[['all', '全部'], ['fresh', '還沒玩過'], ['fav', '我的最愛']].map(([k, t]) => `<button class="fchip${SP.mode === k ? ' on' : ''}" data-act="spin-mode" data-arg="${k}" ${(k === 'fav' && !anyFav) || (k === 'fresh' && !anyFresh) ? 'disabled' : ''}>${t}</button>`).join('')}</div></div>
    <div class="sp-reel"><div class="sp-strip"></div><div class="sp-marker"><i></i></div><div class="sp-burst"></div></div>
    <div class="sp-result" id="sp-result"><p class="sp-hint">按下面的按鈕，讓收藏庫替你挑</p></div>
    <div class="sp-foot"><button class="play big sp-go" data-act="spin-go">${I.dice}<span>轉一下</span></button></div>`;
  document.body.appendChild(el);
  SP.el = el; SP.strip = $('.sp-strip', el); SP.cards = []; SP.win = null; SP.hot = -1;
  const pool = all;
  SP.strip.innerHTML = spinFill(14, pool);
  requestAnimationFrame(() => {
    measureSpin();
    SP.x = spinXFor(6); setStrip(SP.x); markHot(true);
    el.classList.add('on');
  });
  heroPause(true);
  Sound.play.open();
  SP.onResize = () => { if (!SP.el || SP.spinning) return; measureSpin(); SP.x = spinXFor(Math.max(0, SP.hot)); setStrip(SP.x); };
  addEventListener('resize', SP.onResize);
}
function measureSpin() {
  const c = SP.strip.children;
  SP.cw = c.length > 1 ? c[1].offsetLeft - c[0].offsetLeft : 128;
  SP.card = c[0] ? c[0].offsetWidth : 116;
  SP.mid = $('.sp-reel', SP.el).clientWidth / 2;
}
const spinXFor = (i, j = 0) => SP.mid - (i * SP.cw + SP.card / 2) - j;
function setStrip(x) { SP.strip.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`; }
function markHot(silent) {
  const i = Math.round((SP.mid - SP.x - SP.card / 2) / SP.cw);
  if (i === SP.hot) return;
  const c = SP.strip.children;
  if (c[SP.hot]) c[SP.hot].classList.remove('hot');
  if (c[i]) c[i].classList.add('hot');
  SP.hot = i;
  if (silent) return;
  const now = performance.now();
  if (now - SP.lastTick > 26) { SP.lastTick = now; Sound.play.reel(SP.prog || 0); }
}
function spinGo() {
  if (!SP.el || SP.spinning) return;
  let pool = spinPool();
  if (!pool.length) { pool = spinEligible(); SP.mode = 'all'; }
  const winner = pickOne(pool, SP.win && pool.length > 1 ? SP.win.id : null);
  const filler = pool.length >= 5 ? pool : spinEligible();
  // trim cards far to the left so the strip never grows without bound
  const cur = Math.max(0, SP.hot);
  const cut = Math.max(0, cur - 8);
  if (cut) {
    for (let k = 0; k < cut; k++) SP.strip.firstElementChild.remove();
    SP.cards.splice(0, cut); SP.x += cut * SP.cw; SP.hot -= cut; setStrip(SP.x);
  }
  const extra = SP.cards.length - (SP.hot + 1);
  const run = (reduced ? 14 : 46) - Math.max(0, extra);
  SP.strip.insertAdjacentHTML('beforeend', spinFill(Math.max(4, run), filler, SP.cards[SP.cards.length - 1]));
  const target = SP.cards.length;
  SP.cards.push(winner);
  SP.strip.insertAdjacentHTML('beforeend', spinCard(winner) + spinFill(8, filler, winner));
  $$('.sp-card.win', SP.strip).forEach((c) => c.classList.remove('win'));
  SP.el.classList.remove('done'); SP.el.classList.add('spinning');
  $('#sp-result').innerHTML = `<p class="sp-hint">命運轉動中…</p>`;
  $('.sp-foot', SP.el).innerHTML = `<button class="play big sp-go" disabled>${I.dice}<span>轉動中…</span></button>`;
  SP.spinning = true; SP.win = null;
  const x0 = SP.x, jitter = (Math.random() - 0.5) * SP.card * 0.7;
  const x1 = spinXFor(target, jitter), xEnd = spinXFor(target);
  const D = reduced ? 900 : 5200 + Math.random() * 900;
  const t0 = performance.now();
  Sound.play.spinStart();
  let lastX = x0, lastT = t0;
  const ease = (t) => 1 - Math.pow(1 - t, 4.4);
  const step = (now) => {
    const t = Math.min(1, (now - t0) / D);
    SP.x = x0 + (x1 - x0) * ease(t);
    SP.prog = t;
    setStrip(SP.x); markHot();
    const v = Math.abs(SP.x - lastX) / Math.max(1, now - lastT);
    lastX = SP.x; lastT = now;
    SP.el.style.setProperty('--v', Math.min(1, v / 3).toFixed(3));
    if (t < 1) { SP.raf = requestAnimationFrame(step); return; }
    // settle onto the centre
    const s0 = performance.now(), from = SP.x;
    const settle = (n) => {
      const u = Math.min(1, (n - s0) / 420), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      SP.x = from + (xEnd - from) * e; setStrip(SP.x);
      if (u < 1) { SP.raf = requestAnimationFrame(settle); return; }
      spinLand(winner, target);
    };
    SP.el.style.setProperty('--v', 0);
    SP.raf = requestAnimationFrame(settle);
  };
  SP.raf = requestAnimationFrame(step);
}
function spinLand(g, ix) {
  SP.spinning = false; SP.win = g; SP.hot = ix;
  const c = SP.strip.children[ix];
  $$('.sp-card.hot', SP.strip).forEach((n) => n.classList.remove('hot'));
  if (c) c.classList.add('win', 'hot');
  SP.el.classList.remove('spinning'); SP.el.classList.add('done');
  SP.el.setAttribute('style', cssVars(g));
  Ambient.set(g);
  Sound.play.win(g);
  vib([16, 50, 24]);
  const b = $('.sp-burst', SP.el);
  if (!reduced) {
    let h = '<i class="ring"></i>';
    for (let k = 0; k < 30; k++) {
      const a = (k / 30) * Math.PI * 2 + Math.random() * 0.3, r = 90 + Math.random() * 150;
      h += `<i class="pt" style="--dx:${(Math.cos(a) * r).toFixed(0)}px;--dy:${(Math.sin(a) * r * 0.7).toFixed(0)}px;--d:${(Math.random() * 0.25).toFixed(2)}s;--s:${(0.5 + Math.random()).toFixed(2)}"></i>`;
    }
    b.innerHTML = h;
    setTimeout(() => { if (b.isConnected) b.innerHTML = ''; }, 1600);
  }
  const genre = S.genres[g.genre] ? S.genres[g.genre].label : '';
  const st = statOf(g.id);
  $('#sp-result').innerHTML = `<div class="sp-win">
      <div class="sp-kick">${g.pick ? `<span class="chip pick">${I.star}PZ 推薦</span>` : ''}<span class="chip">${esc(genre)}</span>${st.plays ? `<span class="chip">玩過 ${st.plays} 次</span>` : '<span class="chip new">還沒玩過</span>'}</div>
      <h3>${splitChars(g.title)}</h3>
      <p>${esc(g.tagline || g.summary || '')}</p></div>`;
  $('.sp-foot', SP.el).innerHTML = `${playBtn(g, '就玩這款', 'big sp-play')}<button class="ghost" data-act="spin-info" data-id="${esc(g.id)}">${I.info}介紹</button><button class="ghost" data-act="spin-go" aria-label="再轉一次">${I.refresh}再轉</button>`;
}
function closeSpin(instant) {
  if (!SP.el) return;
  cancelAnimationFrame(SP.raf);
  const el = SP.el; SP.el = null; SP.spinning = false;
  removeEventListener('resize', SP.onResize);
  el.classList.remove('on'); el.classList.add('out');
  setTimeout(() => el.remove(), instant ? 0 : 380);
  heroPause(false);
  if (S.base === 'home' && !S.current && Hero.list[Hero.ix]) Ambient.set(Hero.list[Hero.ix].g);
}
/* ───────────── 預告 (cinematic trailer built from the screenshots) ───────────── */
const TR = { el: null, g: null, steps: [], i: 0, t: 0, last: 0, raf: 0, paused: false };
function openTrailer(g) {
  const m = g.media || {}, all = m.shots || [];
  // the intro already shows the title, so the reel starts from the gameplay shots
  const shots = (all.length >= 3 ? all.slice(1) : all).slice(0, 6);
  if (!shots.length || TR.el) return;
  TR.g = g; TR.paused = false;
  TR.steps = [{ k: 'intro', d: 2400 }, ...shots.map((sh, i) => ({ k: 'shot', sh, i, n: shots.length, d: 4000 })), { k: 'end', d: 0 }];
  const el = document.createElement('div');
  el.id = 'trailer'; el.style.cssText = cssVars(g);
  el.innerHTML = `<div class="tr-stage"></div><div class="tr-vig"></div><div class="tr-bar t"></div><div class="tr-bar b"></div>
    <div class="tr-top"><div class="tr-seg">${TR.steps.slice(0, -1).map(() => '<i><b></b></i>').join('')}</div>
      <div class="tr-head"><span class="tr-name">${esc(g.title)}<small>預告</small></span>
        <button class="ibtn" data-act="tr-pause" aria-label="暫停">${I.pause}</button><button class="ibtn" data-act="tr-close" aria-label="關閉">${I.x}</button></div></div>
    <div class="tr-cap" id="tr-cap"></div>
    <button class="tr-tap l" data-act="tr-prev" aria-label="上一個畫面"></button><button class="tr-tap r" data-act="tr-next" aria-label="下一個畫面"></button>`;
  document.body.appendChild(el);
  TR.el = el;
  requestAnimationFrame(() => el.classList.add('on'));
  heroPause(true);
  Sound.duck(true);
  trGo(0);
  TR.last = performance.now();
  TR.raf = requestAnimationFrame(trTick);
}
function trFit(sh) {
  const va = innerWidth / innerHeight, ia = (sh.w || 1) / (sh.h || 1);
  return (va < 1) === (ia < 1) && Math.abs(Math.log(va / ia)) < 0.2 ? 'cover' : 'contain';
}
function trLayer(html, cls) {
  const st = $('.tr-stage', TR.el);
  const L = document.createElement('div');
  L.className = 'tr-l ' + cls; L.innerHTML = html;
  st.appendChild(L);
  requestAnimationFrame(() => requestAnimationFrame(() => L.classList.add('on')));
  const old = $$('.tr-l', st).slice(0, -1);
  old.forEach((o) => { o.classList.add('off'); setTimeout(() => o.remove(), 1100); });
}
function trGo(i) {
  if (!TR.el) return;
  TR.i = clamp(i, 0, TR.steps.length - 1); TR.t = 0;
  const g = TR.g, m = g.media || {}, st = TR.steps[TR.i];
  $$('.tr-seg i', TR.el).forEach((n, k) => { n.firstElementChild.style.width = k < TR.i ? '100%' : '0%'; });
  TR.el.classList.toggle('ending', st.k === 'end');
  const cap = $('#tr-cap');
  if (st.k === 'intro') {
    const genre = (S.genres[g.genre] || {}).label || '';
    trLayer(`<div class="bgimg" style="background-image:url('${esc(m.hero || m.cover || '')}')"></div>
      <div class="tr-intro"><small>${esc(genre)}</small><h2>${splitChars(g.title)}</h2>${g.en ? `<div class="en">${esc(g.en)}</div>` : ''}<i class="ln"></i></div>`, 'intro');
    cap.innerHTML = '';
    Sound.play.trIntro();
  } else if (st.k === 'shot') {
    const fit = trFit(st.sh);
    trLayer(`<div class="bgimg" style="background-image:url('${esc(st.sh.src)}')"></div><img class="fg ${fit} kb${st.i % 4}" src="${esc(st.sh.src)}" alt="">`, 'shot ' + fit);
    cap.innerHTML = st.sh.cap ? `<div class="in"><small>${String(st.i + 1).padStart(2, '0')}<em>/ ${String(st.n).padStart(2, '0')}</em></small><b>${esc(st.sh.cap)}</b><i></i></div>` : '';
    Sound.play.cut(st.i);
    vib(8);
  } else {
    trLayer(`<div class="bgimg" style="background-image:url('${esc(m.hero || m.cover || '')}')"></div>
      <div class="tr-end">${m.cover ? `<img class="cv" src="${esc(m.cover)}" alt="">` : ''}
        <div class="tx"><h2>${esc(g.title)}</h2>${g.en ? `<div class="en">${esc(g.en)}</div>` : ''}<p>${esc(g.tagline || g.summary || '')}</p>
        <div class="acts">${playBtn(g, '開始遊戲', 'big')}<button class="ghost" data-act="tr-replay">${I.refresh}再看一次</button></div></div></div>`, 'end');
    cap.innerHTML = '';
    Sound.play.trEnd();
  }
}
function trTick(now) {
  if (!TR.el) return;
  const dt = Math.min(1000, now - TR.last); TR.last = now; // slow devices still advance in real time
  const st = TR.steps[TR.i];
  if (!TR.paused && st.d) {
    TR.t += dt;
    const b = $$('.tr-seg i b', TR.el)[TR.i];
    if (b) b.style.width = Math.min(100, (TR.t / st.d) * 100).toFixed(2) + '%';
    if (TR.t >= st.d) trGo(TR.i + 1);
  }
  TR.raf = requestAnimationFrame(trTick);
}
function trPause(p) {
  if (!TR.el) return;
  TR.paused = p == null ? !TR.paused : p;
  TR.el.classList.toggle('paused', TR.paused);
  const b = $('[data-act="tr-pause"]', TR.el); if (b) b.innerHTML = TR.paused ? I.play : I.pause;
}
function closeTrailer(instant) {
  if (!TR.el) return;
  cancelAnimationFrame(TR.raf);
  const el = TR.el; TR.el = null;
  el.classList.remove('on');
  Sound.duck(false);
  if (!S.current) heroPause(false);
  setTimeout(() => el.remove(), instant ? 0 : 420);
}
let toastT = 0;
function toast(msg, ms = 3200) {
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('long', [...msg].length > 22); t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms);
}

/* ───────────── routing ───────────── */
function baseHash() { return S.base === 'home' ? '' : S.base; }
function setHash(h, replace) {
  const url = location.pathname + location.search + (h ? '#' + h : '');
  if (replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
  applyRoute();
}
function setBase(name) {
  const changed = S.base !== name || !$('#view-' + name).innerHTML;
  S.base = name;
  $$('.view').forEach((v) => v.classList.toggle('on', v.id === 'view-' + name));
  $$('#tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.arg === (name === 'apps' ? 'apps' : 'home') ));
  if (changed) {
    if (name === 'home') renderHome();
    if (name === 'library') renderLibrary();
    if (name === 'apps') renderApps();
  }
  $('#topbar').classList.toggle('solid', name !== 'home' || $('#view-' + name).scrollTop > 40);
  if (name === 'home') { heroPause(!!S.current); if (Hero.list[Hero.ix] && !S.current) Ambient.set(Hero.list[Hero.ix].g); } else heroPause(true);
  if (name === 'apps' && S.apps[0] && !S.current) Ambient.set(S.apps[0]);
}
function refreshBase() {
  const v = $('#view-' + S.base), sc = v ? v.scrollTop : 0;
  if (S.base === 'home') renderHome();
  else if (S.base === 'library') { renderLibrary(); }
  else if (S.base === 'apps') renderApps();
  if (v) v.scrollTop = sc;
}
function applyRoute() {
  // navigating (incl. the phone's back button) dismisses the full-screen overlays
  if (SP.el) closeSpin(true);
  if (TR.el) closeTrailer(true);
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  let base = S.base, game = null, play = null;
  if (!h) base = 'home';
  else if (h === 'library') base = 'library';
  else if (h.startsWith('library-')) { base = 'library'; S.lib.genre = h.slice(8); S.lib.fav = false; }
  else if (h === 'apps') base = 'apps';
  else if (h.startsWith('game-')) game = h.slice(5);
  else if (h.startsWith('play-')) play = h.slice(5);
  else if (h.startsWith('app-')) play = 'app:' + h.slice(4);
  if (!game && !play) setBase(base);
  else if (!$('#view-' + S.base).innerHTML) setBase(S.base);
  if (play) {
    if (play.startsWith('app:')) {
      const a = S.byId[play.slice(4)];
      if (a && MODE === 'web') { if (!L.item) openLauncher(a, a.url, 'app'); return; }
    } else {
      const ref = S.byBuild[play];
      if (ref && MODE === 'web') {
        if ($('#launcher').classList.contains('on')) endLauncher();
        if (!S.current || S.current.id !== ref.game.id) openGame(ref.game.id, false);
        setHash('game-' + ref.game.id, true);
        return;
      }
    }
  }
  if ($('#launcher').classList.contains('on')) endLauncher();
  if (game && S.byId[game]) { if (!S.current || S.current.id !== game) openGame(game, false); }
  else hideGame();
}

/* ───────────── events ───────────── */
function onClick(e) {
  if (S.swallowClick) { e.preventDefault(); return; }
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act, id = t.dataset.id, arg = t.dataset.arg;
  Sound.unlock();
  switch (act) {
    case 'ext': Sound.play.tap(); return; // let the link open
    case 'open': e.preventDefault(); Sound.play.open(); openGame(id); break;
    case 'play': e.preventDefault(); e.stopPropagation(); if (SP.el) closeSpin(true); if (TR.el) closeTrailer(true); launch(id || (S.current && S.current.id), t); break;
    case 'spin': Sound.play.tap(); openSpin(); break;
    case 'trailer': { const g = (id && S.byId[id]) || S.current; if (g) { Sound.play.open(); openTrailer(g); } break; }
    case 'tr-close': Sound.play.back(); closeTrailer(); break;
    case 'tr-pause': Sound.play.tick(); trPause(); break;
    case 'tr-prev': trGo(TR.i - 1); break;
    case 'tr-next': if (TR.steps[TR.i] && TR.steps[TR.i].k !== 'end') trGo(TR.i + 1); break;
    case 'tr-replay': trPause(false); trGo(0); break;
    case 'spin-go': spinGo(); break;
    case 'spin-close': Sound.play.back(); closeSpin(); break;
    case 'spin-info': Sound.play.open(); closeSpin(true); openGame(id); break;
    case 'spin-mode': {
      if (SP.spinning) return;
      SP.mode = arg; Sound.play.tick();
      $$('.sp-filters .fchip', SP.el).forEach((b) => b.classList.toggle('on', b.dataset.arg === arg));
      break;
    }
    case 'arch': Sound.play.open(); openArchive(id); break;
    case 'app': {
      e.preventDefault(); const a = S.byId[id];
      if (a && MODE === 'web') { S.pushedPlay = true; location.hash = 'app-' + a.id; }
      break;
    }
    case 'tab': {
      Sound.play.tap();
      const name = arg === 'library' ? 'library' : arg === 'apps' ? 'apps' : 'home';
      if (S.current) hideGame();
      if (name === S.base) { $('#view-' + name).scrollTo({ top: 0, behavior: 'smooth' }); break; }
      setHash(name === 'home' ? '' : name, true);
      break;
    }
    case 'lib-genre': Sound.play.tap(); S.lib.genre = arg; S.lib.fav = false; S.lib.status = 'all'; setHash('library-' + arg, true); renderLibrary(); $('#view-library').scrollTop = 0; break;
    case 'f-genre': Sound.play.tick(); S.lib.genre = arg; S.lib.fav = false; renderLibrary(); break;
    case 'f-fav': Sound.play.tick(); S.lib.fav = !S.lib.fav; if (S.lib.fav) S.lib.genre = 'all'; renderLibrary(); break;
    case 'f-status': Sound.play.tick(); S.lib.status = arg; renderLibrary(); break;
    case 'f-sort': Sound.play.tap(); openSort(); break;
    case 'sort': Sound.play.tick(); S.lib.sort = arg; closeSheet(); renderLibrary(); break;
    case 'hero-dot': e.stopPropagation(); heroGo(+arg); break;
    case 'close-game': Sound.play.back(); closeGame(); break;
    case 'fav': {
      const on = !S.favs.has(id); on ? S.favs.add(id) : S.favs.delete(id); save.favs();
      t.classList.toggle('on', on); Sound.play.fav(on); toast(on ? '已加入我的最愛' : '已從最愛移除');
      break;
    }
    case 'hide': {
      const g = S.byId[id];
      if (S.hidden.has(id)) { S.hidden.delete(id); toast('《' + g.title + '》回到收藏庫了'); }
      else { S.hidden.add(id); toast('已隱藏《' + g.title + '》，可以在設定裡找回來'); }
      save.hidden(); Sound.play.toggle(S.hidden.has(id)); renderGame(g); S.dirtyBase = true;
      break;
    }
    case 'unhide': S.hidden.delete(id); save.hidden(); Sound.play.toggle(true); openSettings(); refreshBase(); break;
    case 'build': S.builds[S.current.id] = arg; save.builds(); Sound.play.tick(); renderGame(S.current); break;
    case 'shot': openShot(+arg); break;
    case 'to-how': { Sound.play.tap(); const h = $('#how'), p = $('#gamepage'); if (h) p.scrollTo({ top: p.scrollTop + h.getBoundingClientRect().top - 72, behavior: 'smooth' }); break; }
    case 'lb-close': Sound.play.back(); closeShot(); break;
    case 'search': Sound.play.tap(); openSearch(); break;
    case 'search-close': Sound.play.back(); closeSearch(); break;
    case 'settings': Sound.play.tap(); openSettings(); break;
    case 'sheet-close': closeSheet(); break;
    case 'set': {
      const k = arg; S.settings[k] = !S.settings[k]; save.settings(); t.classList.toggle('on', S.settings[k]);
      Sound.play.toggle(S.settings[k]);
      if (k === 'music') { if (S.settings.music) Sound.startMusic(); else Sound.stopMusic(); }
      if (k === 'sfx') updateSndBtn();
      break;
    }
    case 'snd': {
      const on = !(S.settings.sfx || S.settings.music);
      S.settings.sfx = on; S.settings.music = on; save.settings(); updateSndBtn();
      if (on) { Sound.play.toggle(true); Sound.startMusic(); } else Sound.stopMusic(0.4);
      toast(on ? '聲音已開啟' : '聲音已關閉', 1600);
      break;
    }
    case 'clear-stats': {
      // two taps: the first one arms the button, so a stray tap can't wipe the history
      if (!S.clearArm) {
        S.clearArm = true; Sound.play.err(); t.textContent = '再按一次確定'; t.classList.add('armed');
        setTimeout(() => { S.clearArm = false; if (t.isConnected) { t.textContent = '清除'; t.classList.remove('armed'); } }, 3000);
        break;
      }
      S.clearArm = false; S.stats = {}; save.stats(); Sound.play.toggle(false); closeSheet(); refreshBase(); toast('遊玩紀錄已清除'); break;
    }
    case 'install': if (S.installEvt) { S.installEvt.prompt(); S.installEvt = null; closeSheet(); } break;
    case 'l-close': closeSheet(true); closeLauncher(); break;
    case 'l-retry': {
      closeSheet(true);
      const el = $('#launcher'); el.classList.remove('failed', 'ready', 'settled');
      if (L.frame) {
        L.loaded = false;
        try { L.frame.contentWindow.location.reload(); } catch (er) { const src = L.frame.src; const nf = L.frame.cloneNode(); L.frame.replaceWith(nf); L.frame = nf; nf.src = src; }
        clearTimeout(L.timer); L.timer = setTimeout(() => { if (!L.loaded) el.classList.add('failed'); }, 45000);
      }
      break;
    }
    case 'l-full': closeSheet(true); try { $('#launcher').requestFullscreen(); $('#launcher').classList.add('full'); } catch (er) { toast('這台裝置不支援全螢幕'); } break;
    default: break;
  }
}
function updateSndBtn() {
  const b = $('#snd-btn'); if (!b) return;
  const on = S.settings.sfx || S.settings.music;
  b.innerHTML = on ? I.sndOn : I.sndOff; b.classList.toggle('off', !on);
}
function onKey(e) {
  if (e.target && /input|textarea/i.test(e.target.tagName)) { if (e.key === 'Escape') closeSearch(); return; }
  if (e.key === '/' && !S.current) { e.preventDefault(); openSearch(); return; }
  if (TR.el) {
    if (e.key === 'Escape') { Sound.play.back(); closeTrailer(); }
    else if (e.key === 'ArrowRight') { if (TR.steps[TR.i].k !== 'end') trGo(TR.i + 1); }
    else if (e.key === 'ArrowLeft') trGo(TR.i - 1);
    else if (e.key === ' ') { e.preventDefault(); trPause(); }
    return;
  }
  if (SP.el) {
    if (e.key === 'Escape') { Sound.play.back(); closeSpin(); }
    else if ((e.key === 'Enter' || e.key === ' ') && !SP.spinning && !(e.target && e.target.closest && e.target.closest('button,a'))) { e.preventDefault(); spinGo(); }
    return;
  }
  if (e.key === 'Escape') {
    if ($('#lightbox').classList.contains('on')) return closeShot();
    if (S.sheet) return closeSheet();
    if ($('#search').classList.contains('on')) return closeSearch();
    if (S.current) return closeGame();
  }
  if (S.base === 'home' && !S.current && Hero.el) {
    if (e.key === 'ArrowRight') heroGo(Hero.ix + 1);
    if (e.key === 'ArrowLeft') heroGo(Hero.ix - 1);
  }
}

/* ───────────── shell & boot ───────────── */
function shell() {
  document.body.insertAdjacentHTML('afterbegin', `
    <div id="ambient"><div class="amb a"></div><div class="amb b"></div><div class="veil"></div><canvas id="motes"></canvas><div class="grain"></div></div>
    <header id="topbar"><div class="brand"><span class="mark">${MARK('tb')}</span><div class="wm">遊戲收藏<small>PZ COLLECTION</small></div></div>
      <button class="ibtn" data-act="spin" aria-label="今天玩什麼">${I.dice}</button>
      <button class="ibtn" data-act="search" aria-label="搜尋">${I.search}</button>
      <button class="ibtn" id="snd-btn" data-act="snd" aria-label="聲音"></button>
      <button class="ibtn" data-act="settings" aria-label="設定">${I.gear}</button></header>
    <main id="app"><div class="view" id="view-home"></div><div class="view" id="view-library"></div><div class="view" id="view-apps"></div></main>
    <nav id="tabbar"><button data-act="tab" data-arg="home">${I.games}遊戲</button><button data-act="tab" data-arg="apps">${I.apps}App</button></nav>
    <section id="gamepage" aria-label="遊戲介紹"></section>
    <div id="lightbox"></div><div id="search"></div>
    <div id="launcher"></div><button id="handle" aria-label="收藏庫選單"></button>
    <div id="toast" role="status"></div>`);
  updateSndBtn();
  bindHandle();
  const top = $('#topbar');
  $$('.view').forEach((v) => v.addEventListener('scroll', () => { if (v.classList.contains('on')) top.classList.toggle('solid', v.scrollTop > 40 || S.base !== 'home'); }, { passive: true }));
  document.addEventListener('click', onClick);
  if (!reduced) document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.card, .play, .ghost, .app-tile, .fchip, .tool, .sr-item, .menu-list button, .links a, .links button, #tabbar button, .lucky');
    if (!t) return;
    const sp = document.createElement('span');
    sp.className = 'spark';
    const c = getComputedStyle(t).getPropertyValue('--c-rgb').trim() || getComputedStyle(document.documentElement).getPropertyValue('--acc-rgb').trim();
    sp.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--s-rgb:${c}`;
    document.body.appendChild(sp);
    setTimeout(() => sp.remove(), 650);
  }, { passive: true });
  document.addEventListener('keydown', onKey);
  if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    // cards lean toward the mouse and catch a little light
    let tc = null, raf = 0, ev = null;
    const apply = () => {
      raf = 0; if (!tc || !ev) return;
      const cv = tc.querySelector('.cv'); if (!cv) return;
      const r = cv.getBoundingClientRect();
      const px = clamp((ev.clientX - r.left) / r.width, 0, 1), py = clamp((ev.clientY - r.top) / r.height, 0, 1);
      tc.style.setProperty('--ry', ((px - 0.5) * 16).toFixed(2) + 'deg');
      tc.style.setProperty('--rx', ((0.5 - py) * 12).toFixed(2) + 'deg');
      tc.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
      tc.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
    };
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const c = e.target.closest ? e.target.closest('.card') : null;
      if (c !== tc) {
        if (tc) { tc.classList.remove('tilt'); ['--rx', '--ry'].forEach((k) => tc.style.removeProperty(k)); }
        tc = c; if (tc) tc.classList.add('tilt');
      }
      ev = e; if (tc && !raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
  }
  document.addEventListener('load', (e) => { if (e.target && e.target.tagName === 'IMG') e.target.classList.add('ld'); }, true);
  const wake = () => { Sound.unlock(); if (S.settings.music && !L.item && !S.igniting && !$('#boot')) Sound.startMusic(); };
  document.addEventListener('pointerup', wake, { passive: true });
  document.addEventListener('keydown', wake);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { Sound.suspend(); Motes.stop(); if (L.item && L.visT) { L.acc += Date.now() - L.visT; L.visT = 0; } }
    else { Sound.resume(); if (!L.item) Motes.start(); if (L.item) L.visT = Date.now(); }
  });
  addEventListener('hashchange', applyRoute);
  // leaving for a game: stop the lobby's animation and music; coming back from the page cache: settle down again
  addEventListener('pagehide', () => { S.left = true; Motes.stop(); Sound.stopMusic(0.1); });
  // An unload listener keeps the browser from parking this page in its page cache while a game runs:
  // the collection is let go completely, so the game has the memory to itself. Coming back reloads it.
  addEventListener('unload', () => {});
  addEventListener('pageshow', (e) => { if (e.persisted) settleAfterGame(); });
  addEventListener('popstate', () => {});
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; });
  setInterval(() => { $$('img:not(.ld)').forEach((im) => { if (im.complete && im.naturalWidth) im.classList.add('ld'); }); }, 700);
}
function boot(done) {
  let booted = false;
  try { booted = sessionStorage.getItem('pzgc.booted') === '1'; } catch (e) { /* ignore */ }
  if (!S.settings.boot || booted || reduced) { done(); return; }
  const b = document.createElement('div');
  b.id = 'boot';
  // a tilted wall of every cover drifts behind the emblem
  const covers = S.games.filter((g) => g.media && g.media.cover && g.status !== 'failed').map((g) => g.media.cover);
  let wall = '';
  if (covers.length >= 6) {
    const cells = [];
    for (let k = 0; k < 72; k++) cells.push(covers[(k * 7 + Math.floor(k / 9) * 3) % covers.length]);
    wall = `<div class="wall"><div class="plane">${cells.map((c, k) => `<img src="${esc(c)}" alt="" decoding="async" style="--d:${((k % 9) * 0.06 + Math.floor(k / 9) * 0.05).toFixed(2)}s">`).join('')}</div></div>`;
  }
  b.innerHTML = `${wall}<div class="beam"></div><div style="text-align:center;position:relative;z-index:2">
    <svg class="em" viewBox="0 0 64 64"><defs><linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe7a8"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#8fd3ff"/></linearGradient><radialGradient id="bgl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8fd3ff" stop-opacity=".5"/><stop offset="1" stop-color="#8fd3ff" stop-opacity="0"/></radialGradient></defs>
      <circle class="fillg" cx="32" cy="32" r="30" fill="url(#bgl)"/>
      <rect class="stroke" x="5" y="5" width="54" height="54" rx="15" fill="none" stroke="url(#bg2)" stroke-width="2"/>
      <path class="stroke" d="M25 19 45 32 25 45z" fill="none" stroke="url(#bg2)" stroke-width="3.6" stroke-linejoin="round"/></svg>
    <div class="wm">遊戲收藏<small>PZ COLLECTION</small></div>
    <div class="count">${S.games.length} 款遊戲・${S.apps.length} 個 App</div>
    <div class="cta">輕觸任意處進入</div></div>`;
  document.body.appendChild(b);
  let gone = false;
  const go = () => {
    if (gone) return; gone = true;
    // the tap that dismisses the boot screen must not also land on whatever sits underneath it
    S.swallowClick = true; setTimeout(() => { S.swallowClick = false; }, 450);
    Sound.unlock(); Sound.play.boot();
    try { sessionStorage.setItem('pzgc.booted', '1'); } catch (e) { /* ignore */ }
    b.classList.add('out');
    setTimeout(() => { b.remove(); if (S.settings.music) Sound.startMusic(); }, 700);
    done(true);
  };
  b.addEventListener('click', go);
  b.addEventListener('pointerup', go);
  addEventListener('keydown', function k(e) { if (e.key === 'Enter' || e.key === ' ') { removeEventListener('keydown', k); go(); } });
}
function checkNew() {
  const ids = S.games.map((g) => g.id);
  if (!S.seen) { Store.set('seen', ids); return; }
  const fresh = S.games.filter((g) => !S.seen.includes(g.id));
  if (fresh.length) {
    setTimeout(() => toast(fresh.length === 1 ? '新遊戲入庫：《' + fresh[0].title + '》' : fresh.length + ' 款新遊戲入庫：《' + fresh[0].title + '》等'), 1800);
    Store.set('seen', ids);
  }
}
async function loadCatalog() {
  if (window.PZ_CATALOG) return window.PZ_CATALOG;
  const r = await fetch('catalog.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('catalog ' + r.status);
  return r.json();
}
async function start() {
  shell();
  let cat;
  try { cat = await loadCatalog(); } catch (e) {
    $('#view-home').innerHTML = `<div class="empty" style="padding-top:40vh"><b>收藏庫沒有載入成功</b>請確認網路連線後重新打開。</div>`;
    $('#view-home').classList.add('on'); return;
  }
  prep(cat);
  // A page that opens on #play-… has usually just been reloaded, often because the phone ran out
  // of memory mid-game. Going straight back into the game can crash it again and again, so land on
  // the game's page instead and let the player press play.
  let wasPlaying = null, back = null;
  try { wasPlaying = sessionStorage.getItem('pzgc.playing'); sessionStorage.removeItem('pzgc.playing'); } catch (e) { /* ignore */ }
  const h0 = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (h0.startsWith('play-')) {
    const ref = S.byBuild[h0.slice(5)]; back = ref ? ref.game : null;
    history.replaceState(null, '', back ? '#game-' + back.id : location.pathname + location.search);
  } else if (h0.startsWith('app-')) {
    back = S.byId[h0.slice(4)] || null;
    history.replaceState(null, '', '#apps');
  }
  // the hero starts from its first slide the moment the boot screen is dismissed
  boot((tapped) => { if (tapped && Hero.el && S.base === 'home' && !S.current) heroGo(0, false); });
  applyRoute();
  if (!back) welcomeBack(false);
  if (back && wasPlaying) {
    setTimeout(() => toast(back.kind === 'app' ? `《${back.title}》剛剛被重新載入了，先回到 App 頁；點它就能再打開` : `《${back.title}》剛剛被重新載入了，先停在遊戲頁；按「開始遊戲」就能接著玩`, 6000), 900);
  }
  Motes.start();
  checkNew();
  if (MODE === 'web' && 'serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
window.__pz = { S, Sound, Hero, heroGo, heroPause, openGame, renderHome, setBase, launch, openSettings, openSearch, toast };
start();
})();
