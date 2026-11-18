'use strict';
/* 補番 BINGE — 核心：設定、片庫資料、追番同步、觀看紀錄、清單 */

const VERSION = '1.0.0';
const NAME = '痞子葳';
const RAW = 'https://raw.githubusercontent.com/PZWei0105/PZ-Games';
const QS = new URLSearchParams(location.search);
const DATA_URL = QS.get('data') || RAW + '/binge-data/';
const MAIN_URL = QS.get('main') || RAW + '/main/apps/binge/data/';
const RELAY = 'https://ntfy.sh/pz-binge-7e3572039bf2097cf2bf';
const PFX = 'binge.v1.';
const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_IPHONE = /iPhone|iPod/.test(navigator.userAgent);
// 手機、平板（主要用手指點）：全螢幕改用「橫放全螢幕」；電腦照舊
const TOUCH = matchMedia('(hover: none) and (pointer: coarse)').matches;

const store = {
  get(k, d) { try { const v = localStorage.getItem(PFX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) { /* 空間滿了就算了 */ } },
  del(k) { try { localStorage.removeItem(PFX + k); } catch (e) { /* */ } },
};

const DEFAULT_SET = {
  bgm: true, sfx: true, vol: 0.7, intro: 'daily', fx: 'full', sky: 'auto', zhFirst: true, zhSubs: true,
  auto: true, skipOp: 85, rate: 1, play: 'app', kids: false, west: true, autoLand: true, landDir: 90,
};
const SET = Object.assign({}, DEFAULT_SET, store.get('set', {}));
function saveSet() { store.set('set', SET); }

let DEV = store.get('dev');
if (!DEV || !/^d[a-z0-9]{3,10}$/.test(DEV)) { DEV = 'd' + Math.random().toString(36).slice(2, 8).replace(/[^a-z0-9]/g, 'x').padEnd(6, '0'); store.set('dev', DEV); }

/* ------------------------------------------------------------ 小工具 */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const nowS = () => Date.now() / 1000;
function hash32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function seeded(seed) { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; }

function ago(p) {
  if (!p) return '';
  const s = nowS() - p;
  if (s < 0) return '即將';
  if (s < 90) return '剛剛';
  if (s < 3600) return Math.floor(s / 60) + ' 分鐘前';
  if (s < 86400) return Math.floor(s / 3600) + ' 小時前';
  if (s < 2 * 86400) return '昨天';
  if (s < 7 * 86400) return Math.floor(s / 86400) + ' 天前';
  if (s < 60 * 86400) return Math.floor(s / 86400 / 7) + ' 週前';
  const d = new Date(p * 1000);
  return d.getFullYear() + '/' + (d.getMonth() + 1);
}
function num(n) {
  if (n == null) return '';
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '億';
  if (n >= 1e4) return (n / 1e4).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + '萬';
  return n.toLocaleString('en-US');
}
/* 片長：7:06:12 */
function clock(s) {
  if (!s && s !== 0) return '';
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
}
/* 長度的口語：7 小時 06 分、42 分鐘 */
function span(s) {
  if (!s) return '';
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  if (h >= 1) return h + ' 小時' + (m ? ' ' + String(m).padStart(2, '0') + ' 分' : '');
  return Math.max(1, m) + ' 分鐘';
}
function hm(s) { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? h + 'h' + String(m).padStart(2, '0') : m + 'm'; }
function dayKey(t = Date.now()) {
  const d = new Date(t);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function greet() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return '早安';
  if (h >= 11 && h < 14) return '午安';
  if (h >= 14 && h < 18) return '午後好';
  if (h >= 18 && h < 23) return '晚上好';
  return '夜深了';
}
const thumb = (id, q) => 'https://i.ytimg.com/vi/' + id + '/' + (q || 'mqdefault') + '.jpg';
const ytUrl = (id, t) => 'https://www.youtube.com/watch?v=' + id + (t ? '&t=' + Math.floor(t) + 's' : '');
const chUrl = (c) => 'https://www.youtube.com/channel/' + c;
const plUrl = (p) => 'https://www.youtube.com/playlist?list=' + p;

/* ------------------------------------------------------------ 類別 */
/* 頻道的類別：ai＝AI 漫劇、sd＝沙雕動畫、mc＝動態漫畫、jp＝日本動畫、cn＝國漫、toon＝卡通 */
const KINDS = {
  ai: { zh: 'AI 漫劇', short: 'AI', en: 'AI DRAMA', c: 'var(--k-ai)', tab: 'ai' },
  sd: { zh: '沙雕動畫', short: '沙雕', en: 'SHADIAO', c: 'var(--k-sd)', tab: 'ai' },
  mc: { zh: '動態漫畫', short: '動漫', en: 'MOTION COMIC', c: 'var(--k-mc)', tab: 'ai' },
  jp: { zh: '日本動畫', short: '日', en: 'ANIME', c: 'var(--k-jp)', tab: 'ani' },
  cn: { zh: '國漫', short: '國漫', en: 'DONGHUA', c: 'var(--k-cn)', tab: 'ani' },
  toon: { zh: '卡通', short: '卡通', en: 'CARTOON', c: 'var(--k-toon)', tab: 'ani' },
};
/* 影片格式 */
const FMTS = {
  c: { zh: '合輯', en: 'MARATHON' }, e: { zh: '單集', en: 'EPISODE' }, m: { zh: '劇場版', en: 'MOVIE' },
  s: { zh: '短劇', en: 'SHORT' }, p: { zh: '預告', en: 'PV' }, l: { zh: '直播', en: 'LIVE' }, x: { zh: '片段', en: 'CLIP' },
};
/* 題材（看標題猜，給 AI 分頁的篩選用） */
const GENRES = [
  ['修仙', /修仙|仙尊|仙帝|渡劫|築基|筑基|元嬰|元婴|靈根|灵根|宗門|宗门|飛升|飞升|仙門|仙门|洪荒/],
  ['玄幻', /玄幻|神帝|魔神|武神|斗氣|斗气|異世|异世|帝尊|神尊|諸天|诸天|萬界|万界|龍|龙/],
  ['末世', /末世|末日|喪屍|丧尸|天災|天灾|囤貨|囤货|廢土|废土|詭異|诡异|求生/],
  ['都市', /都市|總裁|总裁|豪門|豪门|神豪|首富|校花|公司|職場|职场|贅婿|赘婿/],
  ['重生', /重生|回到|重回|再活/],
  ['穿越', /穿越|穿書|穿书|穿成|魂穿|穿到/],
  ['系統', /系統|系统|金手指|簽到|签到|外掛|外挂|面板/],
  ['古風', /古風|古风|王爺|王爷|皇帝|皇子|公主|太子|將軍|将军|宮|宫|朝|侯府|嫡女|庶/],
  ['甜寵', /甜寵|甜宠|寵妻|宠妻|戀|恋|嫁|老公|老婆|夫人|王妃|萌寶|萌宝|團寵|团宠/],
  ['爆笑', /搞笑|沙雕|爆笑|整活|離譜|离谱|鬼畜|蝦仁|虾仁/],
  ['懸疑', /懸疑|悬疑|推理|探案|規則怪談|规则怪谈|驚悚|惊悚|恐怖/],
  ['科幻', /科幻|星際|星际|機甲|机甲|宇宙|賽博|赛博|未來|未来/],
  ['歷史', /大明|大唐|大宋|大秦|三國|三国|貞觀|贞观|崇禎|崇祯|洪武|歷史|历史/],
];
const genreOf = memoize((t) => GENRES.filter(([, rx]) => rx.test(t)).map(([g]) => g).slice(0, 3));
function memoize(fn) { const m = new Map(); return (x) => { if (!m.has(x)) { if (m.size > 6000) m.clear(); m.set(x, fn(x)); } return m.get(x); }; }

/* ------------------------------------------------------------ 片庫 */
const D = { cat: null, me: null, at: 0, ok: false, err: null, busy: false };
const IDX = { vids: [], byId: new Map(), ch: {}, chs: [], shows: [], showById: new Map(), ext: [], rev: 0 };
/* 播放器回報「頻道不允許嵌入」的影片：記在這台裝置，下次直接標出來 */
const NE = store.get('ne', {});
function markNoEmbed(id) {
  if (!id || NE[id]) return;
  NE[id] = Date.now();
  const keys = Object.keys(NE);
  if (keys.length > 800) keys.sort((a, b) => NE[a] - NE[b]).slice(0, keys.length - 800).forEach((k) => delete NE[k]);
  store.set('ne', NE);
  const v = IDX.byId.get(id);
  if (v) v.ne = true;
  MEMO.clear();
}

async function getJSON(base, name, fresh) {
  const bust = fresh ? Date.now() : Math.floor(Date.now() / 60000);
  const r = await fetch(base + name + '?t=' + bust, { cache: 'no-store' });
  if (!r.ok) throw new Error(name + ' ' + r.status);
  return r.json();
}

async function loadAll(fresh) {
  if (D.busy) return false;
  D.busy = true;
  const [cat, me] = await Promise.allSettled([getJSON(DATA_URL, 'catalog.json', fresh), getJSON(MAIN_URL, 'me.json', fresh)]);
  D.busy = false;
  let changed = false;
  if (cat.status === 'fulfilled' && cat.value && cat.value.vids) {
    if (!D.cat || D.cat.at !== cat.value.at) { D.cat = cat.value; changed = true; }
    D.ok = true; D.err = null;
  } else if (!D.cat) {
    D.err = '片庫還沒送到：' + ((cat.reason && cat.reason.message) || '連不上');
  }
  if (me.status === 'fulfilled' && me.value) takeMe(me.value);
  D.at = Date.now();
  if (changed) indexCat();
  return changed;
}

/* catalog.json 的影片是壓縮過的陣列：[id, 頻道序號, 標題, 片長, 時間, 觀看, 格式, 旗標, 作品序號, 集數, 範圍起, 範圍迄] */
const F_AI = 1, F_ZH = 2, F_CHAP = 4, F_UP = 8, F_LIVE = 16, F_SIMP = 32, F_NEWEP = 64, F_NE = 128;
function indexCat() {
  const c = D.cat || {};
  IDX.chs = c.chs || [];
  IDX.ch = {};
  (c.ch || []).forEach((x, i) => { IDX.ch[IDX.chs[i]] = Object.assign({ id: IDX.chs[i] }, x); });
  const chap = c.chap || {}, orig = c.orig || {};
  IDX.vids = (c.vids || []).map((a) => {
    const fl = a[7] | 0;
    return {
      i: a[0], c: IDX.chs[a[1]], t: a[2], d: a[3] || 0, p: a[4] || 0, v: a[5] || 0, f: a[6] || 'e',
      ai: !!(fl & F_AI), zh: !!(fl & F_ZH), up: !!(fl & F_UP), live: !!(fl & F_LIVE), ne: !!(fl & F_NE) || !!NE[a[0]],
      s: a[8] == null || a[8] < 0 ? -1 : a[8], e: a[9] || 0, r: a[10] && a[11] ? [a[10], a[11]] : null,
      chap: chap[a[0]] || null, t0: orig[a[0]] || null,
    };
  });
  IDX.byId = new Map(IDX.vids.map((v) => [v.i, v]));
  // 名單外（金鑰）：全天放送、全網熱補——跟片庫分開，只在自己那兩排出現
  const x = c.ext || {};
  (x.ch || []).forEach((o, i) => { const id = (x.chs || [])[i]; if (id && !IDX.ch[id]) IDX.ch[id] = Object.assign({ id, k: 'jp', l: 'zh' }, o); });
  IDX.ext = (x.vids || []).map((a) => {
    const fl = a[7] | 0;
    return { i: a[0], c: (x.chs || [])[a[1]], t: a[2], d: a[3] || 0, p: a[4] || 0, v: a[5] || 0, f: a[6] || 'c', ai: !!(fl & F_AI), zh: true,
      live: !!(fl & F_LIVE), up: false, ne: !!(fl & F_NE) || !!NE[a[0]], s: -1, e: 0, r: a[10] && a[11] ? [a[10], a[11]] : null, cv: a[12] || 0, chap: null, t0: null, ext: 1 };
  }).filter((v) => v.c && !IDX.byId.has(v.i));
  IDX.ext.forEach((v) => IDX.byId.set(v.i, v));
  IDX.shows = (c.shows || []).map((s, k) => {
    const eps = (s.eps || []).map((x) => IDX.vids[x]).filter(Boolean);
    eps.forEach((v) => { v.show = k; });
    const dur = eps.reduce((t, v) => t + (v.d || 0), 0);
    const ch = IDX.chs[s.c];
    return Object.assign({}, s, { k, c: ch, kind: s.k || (IDX.ch[ch] || {}).k || 'jp', eps, dur, n_eps: eps.length });
  });
  IDX.showById = new Map(IDX.shows.map((s) => [s.id, s]));
  IDX.rev++;
  MEMO.clear();
}

/* 「【1~5季合集】《作品名》劇情簡介」→ { name: 作品名, rest: 1~5季合集 · 劇情簡介 } */
function titleParts(t) {
  const m = /《([^《》]{2,40})》/.exec(t || '') || /^【([^【】]{2,20})】(?=\s*(?:EP|E\d|第|\d))/.exec(t || '');
  if (!m) return { name: '', rest: t || '' };
  const rest = (t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length))
    .replace(/[【\[]([^】\]]{1,16})[】\]]/g, '$1 ').replace(/^[\s｜|:：,，、!！]+|[\s｜|:：,，、]+$/g, '').replace(/\s{2,}/g, ' ');
  return { name: m[1].trim(), rest };
}
const chOf = (c) => IDX.ch[c] || { n: '頻道', k: 'jp' };
const kindOf = (v) => (v && IDX.ch[v.c] ? IDX.ch[v.c].k : 'jp');
const showOf = (v) => (v && v.show != null && v.show >= 0 ? IDX.shows[v.show] : null);
const isZh = (v) => v.zh;

/* ------------------------------------------------------------ 追番同步（轉發站：手機、電腦共用片單） */
const SYNC = { out: store.get('out', []), base: store.get('base', null), fail: 0 };
let VIEW = null;

function emptyMe() { return { follow: {}, later: {}, blocks: {}, hides: {}, prog: {}, adds: [], seen: [] }; }
function applyEv(v, e) {
  switch (e.type) {
    case 'follow': v.follow[e.s] = { t: e.t, n: e.n }; delete v.hides[e.s]; break;
    case 'unfollow': delete v.follow[e.s]; break;
    case 'later': if (e.on === false) delete v.later[e.v]; else v.later[e.v] = e.t; break;
    case 'block': v.blocks[e.ch] = e.t; break;
    case 'unblock': delete v.blocks[e.ch]; break;
    case 'hide': v.hides[e.s] = e.t; delete v.follow[e.s]; break;
    case 'unhide': delete v.hides[e.s]; break;
    case 'prog': { const o = v.prog[e.v]; if (!o || o[2] < e.t) v.prog[e.v] = [e.pos, e.len, e.t, e.dev || '']; break; }
    case 'add': v.adds.push({ id: e.id, q: e.q, t: e.t, st: 'send' }); break;
    default: break;
  }
}
function rebuildView() {
  const b = SYNC.base || emptyMe();
  const v = {
    follow: Object.assign({}, b.follow), later: Object.assign({}, b.later), blocks: Object.assign({}, b.blocks),
    hides: Object.assign({}, b.hides), prog: Object.assign({}, b.prog), adds: (b.adds || []).slice(),
  };
  const seen = new Set(b.seen || []);
  SYNC.out.filter((e) => !seen.has(e.id)).sort((a, z) => a.t - z.t).forEach((e) => applyEv(v, e));
  VIEW = v;
  MEMO.clear();
  return v;
}
function takeMe(me) {
  if (!me || typeof me !== 'object') return;
  SYNC.base = { follow: me.follow || {}, later: me.later || {}, blocks: me.blocks || {}, hides: me.hides || {}, prog: me.prog || {}, adds: me.adds || [], seen: me.seen || [], at: me.at };
  store.set('base', SYNC.base);
  const seen = new Set(SYNC.base.seen);
  const before = SYNC.out.length;
  SYNC.out = SYNC.out.filter((e) => !seen.has(e.id));
  if (SYNC.out.length !== before) store.set('out', SYNC.out);
  rebuildView();
  mergeRemoteProgress();
  if (typeof syncLight === 'function') syncLight();
}
function newEv(type, fields, quiet) {
  const seq = (store.get('seq', 0) | 0) + 1;
  store.set('seq', seq);
  const ev = Object.assign({ id: DEV + '-' + seq, type, t: Date.now() }, fields);
  // 進度只留最新一筆（同一支影片）
  if (type === 'prog') SYNC.out = SYNC.out.filter((e) => !(e.type === 'prog' && e.v === fields.v));
  SYNC.out.push(ev);
  store.set('out', SYNC.out);
  rebuildView();
  scheduleSend(quiet ? 8000 : 1500);
  if (typeof syncLight === 'function') syncLight();
  return ev;
}
let sendTimer = 0;
function scheduleSend(ms) { clearTimeout(sendTimer); sendTimer = setTimeout(sendNow, ms == null ? 1500 : ms); }
async function sendNow() {
  const now = Date.now();
  const todo = SYNC.out.filter((e) => !e.sent || now - e.sent > 3 * 3600e3);
  if (!todo.length) return;
  for (let i = 0; i < todo.length; i += 14) {
    const chunk = todo.slice(i, i + 14);
    const evs = chunk.map((e) => { const c = Object.assign({}, e); delete c.sent; return c; });
    try {
      await fetch(RELAY, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ v: 1, dev: DEV, evs }) });
      chunk.forEach((e) => { e.sent = now; });
      SYNC.fail = 0;
    } catch (err) {
      SYNC.fail = now;
      break;
    }
  }
  store.set('out', SYNC.out);
  if (typeof syncLight === 'function') syncLight();
}
function syncState() {
  if (SYNC.fail && SYNC.out.length) return 'bad';
  if (SYNC.out.some((e) => e.type !== 'prog')) return 'wait';
  return 'ok';
}

/* 動作 */
function follow(sid) { const s = IDX.showById.get(sid); if (!s || VIEW.follow[sid]) return; newEv('follow', { s: sid, n: (s.n || '').slice(0, 80) }); }
function unfollow(sid) { if (VIEW.follow[sid]) newEv('unfollow', { s: sid }); }
function setLater(v, on) { if (!!VIEW.later[v] === on) return; newEv('later', { v, on }); }
function block(c) { newEv('block', { ch: c }); }
function unblock(c) { newEv('unblock', { ch: c }); }
function hideShow(sid) { newEv('hide', { s: sid }); }
function unhideShow(sid) { newEv('unhide', { s: sid }); }
function addChannel(q) { newEv('add', { q: q.slice(0, 300) }); }
const following = (sid) => !!VIEW.follow[sid];

/* ------------------------------------------------------------ 觀看紀錄（這台裝置；長片的進度另外同步到別台） */
const HIST = store.get('hist', {});      // vid: [最後看的時間 ms, 看到第幾秒, 片長, 看完 0/1, 累積毫秒, 頻道, 作品 id]
const WT = store.get('wt', {});          // 'YYYY-MM-DD': { 類別: 毫秒 }
const SHOWSEEN = store.get('showseen', {});   // 作品 id: 上次打開作品頁的時間（秒）
let histDirty = 0;
function histOf(v) { return HIST[v] || null; }
function noteWatch(v, pos, len, addMs) {
  const h = HIST[v.i] || [0, 0, 0, 0, 0, v.c, ''];
  h[0] = Date.now(); h[1] = Math.round(pos || 0); h[2] = Math.round(len || h[2] || v.d || 0); h[5] = v.c;
  const s = showOf(v); if (s) h[6] = s.id;
  if (h[2] && h[1] / h[2] > 0.93) h[3] = 1;
  h[4] = (h[4] || 0) + (addMs || 0);
  HIST[v.i] = h;
  if (addMs) {
    const k = dayKey();
    WT[k] = WT[k] || {};
    const kd = kindOf(v);
    WT[k][kd] = (WT[k][kd] || 0) + addMs;
    const hr = 'h' + new Date().getHours();
    WT[k][hr] = (WT[k][hr] || 0) + addMs;
  }
  if (!histDirty) histDirty = setTimeout(flushHist, 4000);
}
function flushHist() {
  histDirty = 0;
  const keys = Object.keys(HIST);
  if (keys.length > 1500) keys.sort((a, b) => HIST[a][0] - HIST[b][0]).slice(0, keys.length - 1500).forEach((k) => delete HIST[k]);
  const days = Object.keys(WT).sort();
  days.slice(0, Math.max(0, days.length - 120)).forEach((k) => delete WT[k]);
  store.set('hist', HIST);
  store.set('wt', WT);
  store.set('showseen', SHOWSEEN);
}
function clearHistory() { Object.keys(HIST).forEach((k) => delete HIST[k]); Object.keys(WT).forEach((k) => delete WT[k]); flushHist(); }
/* 長片看到哪：送一筆進度到轉發站（別台裝置打開時接著看） */
function pushProgress(v, pos, len) {
  if (!v || !len || len < 20 * 60 || pos < 60) return;
  const done = pos / len > 0.93;
  newEv('prog', { v: v.i, pos: Math.round(done ? len : pos), len: Math.round(len), dev: DEV }, true);
}
/* 別台裝置看得比較新：用那邊的進度 */
const REMOTE = {};   // vid: [pos, len, t, dev]
function mergeRemoteProgress() {
  for (const [vid, p] of Object.entries(VIEW.prog || {})) {
    if (!Array.isArray(p) || p[3] === DEV) continue;
    const h = HIST[vid];
    if (!h || h[0] < p[2] - 30e3) {
      REMOTE[vid] = p;
      const nh = h || [0, 0, 0, 0, 0, (IDX.byId.get(vid) || {}).c || '', ''];
      nh[0] = p[2]; nh[1] = p[0]; nh[2] = p[1]; if (p[1] && p[0] / p[1] > 0.93) nh[3] = 1;
      HIST[vid] = nh;
    }
  }
}

/* 這週補了多少：時數、類別、時段、連續天數 */
function weekStats() {
  let total = 0;
  const kinds = {}, hours = new Array(24).fill(0);
  for (let i = 0; i < 7; i++) {
    const day = WT[dayKey(Date.now() - i * 86400e3)] || {};
    for (const [k, ms] of Object.entries(day)) {
      if (k[0] === 'h') hours[+k.slice(1)] += ms;
      else { kinds[k] = (kinds[k] || 0) + ms; total += ms; }
    }
  }
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const day = WT[dayKey(Date.now() - i * 86400e3)];
    const ms = day ? Object.entries(day).filter(([k]) => k[0] !== 'h').reduce((s, [, x]) => s + x, 0) : 0;
    if (ms > 60e3) streak++; else if (i > 0) break;
  }
  const night = hours.slice(0, 5).reduce((a, b) => a + b, 0) + hours[23];
  const done = Object.values(HIST).filter((h) => h[3]).length;
  let hoursAll = 0;
  for (const day of Object.values(WT)) for (const [k, ms] of Object.entries(day)) if (k[0] !== 'h') hoursAll += ms;
  return { total, kinds, hours, streak, night, done, all: hoursAll };
}

/* ------------------------------------------------------------ 清單 */
const MEMO = new Map();
function memo(key, fn) { if (!MEMO.has(key)) MEMO.set(key, fn()); return MEMO.get(key); }

function visible(v) {
  if (VIEW.blocks[v.c]) return false;
  const ch = IDX.ch[v.c];
  if (!ch) return false;
  if (ch.k === 'toon' && ch.kids && !SET.kids) return false;
  if (ch.l === 'en' && !SET.west) return false;
  const s = showOf(v);
  if (s && VIEW.hides[s.id]) return false;
  if (v.up && v.p && v.p < nowS() - 6 * 3600) return false;
  return true;
}
const base = () => memo('base', () => IDX.vids.filter(visible));
const inTab = (v, tab) => (KINDS[kindOf(v)] || KINDS.jp).tab === tab;

/* 熱度：觀看數相對這個頻道平常的表現＋新舊；中文優先時中文片加分 */
function heat(v) {
  const ch = IDX.ch[v.c] || {};
  const med = ch.vm || 3000;
  const rel = Math.log2(1 + (v.v || 0) / Math.max(200, med));
  const age = Math.max(0, nowS() - (v.p || nowS())) / 86400;
  const fresh = age < 2 ? 1.2 : age < 7 ? 0.7 : age < 30 ? 0.25 : 0;
  const zh = SET.zhFirst && !v.zh ? -0.8 : 0;
  return rel + fresh + zh + Math.log10(10 + (v.v || 0)) * 0.35;
}
function hot(list) { return list.map((v) => [v, heat(v)]).sort((a, b) => b[1] - a[1]).map((x) => x[0]); }
function newest(list) { return list.slice().sort((a, b) => b.p - a.p); }
/* 同一個頻道不要連續洗版 */
function spread(list, maxRun = 2, win = 6, cap = 240) {
  const head = list.slice(0, cap), tail = list.slice(cap), out = [];
  while (head.length) {
    let k = head.findIndex((it) => out.slice(-win).filter((o) => o.c === it.c).length < maxRun);
    if (k < 0) k = 0;
    out.push(head.splice(k, 1)[0]);
  }
  return out.concat(tail);
}
/* 同一部作品的多支合輯（不同頻道搬同一部）：只留一支 */
function onePerShow(list, n = 1) {
  const seen = new Map(), out = [];
  for (const v of list) {
    const key = v.show >= 0 && v.show != null ? 's' + v.show : (v.nk || v.i);
    const c = seen.get(key) || 0;
    if (c >= n) continue;
    seen.set(key, c + 1);
    out.push(v);
  }
  return out;
}

const L = {
  comps: (tab) => memo('comps:' + tab, () => spread(onePerShow(hot(base().filter((v) => (v.f === 'c' || v.f === 'm') && v.d >= 40 * 60 && (!tab || inTab(v, tab))))))),
  fresh: (tab) => memo('fresh:' + tab, () => spread(newest(base().filter((v) => v.f !== 'p' && v.f !== 'x' && v.f !== 's' && !v.up && (!tab || inTab(v, tab)) && nowS() - v.p < 14 * 86400)))),
  eps: (kind) => memo('eps:' + kind, () => spread(newest(base().filter((v) => v.f === 'e' && kindOf(v) === kind && nowS() - v.p < 30 * 86400)))),
  kind: (kind) => memo('kind:' + kind, () => spread(onePerShow(hot(base().filter((v) => kindOf(v) === kind && v.f !== 'p' && v.f !== 'x' && v.f !== 's' && !v.up)), 2))),
  movies: () => memo('movies', () => hot(base().filter((v) => v.f === 'm'))),
  live: () => memo('live', () => base().filter((v) => v.live || (v.f === 'l' && nowS() - v.p < 2 * 86400)).sort((a, b) => (b.live - a.live) || (a.ne - b.ne) || (b.p - a.p))),
  xlive: () => memo('xlive', () => IDX.ext.filter((v) => v.live && !VIEW.blocks[v.c]).sort((a, b) => (a.ne - b.ne) || (b.cv - a.cv))),
  xcomps: () => memo('xcomps', () => IDX.ext.filter((v) => !v.live && !VIEW.blocks[v.c]).sort((a, b) => (a.ne - b.ne) || (b.v - a.v))),
  shorts: () => memo('shorts', () => spread(hot(base().filter((v) => v.f === 's' && !v.ne && inTab(v, 'ai'))), 1, 4)),
  genre: (g, tab) => memo('g:' + g + ':' + tab, () => spread(onePerShow(hot(base().filter((v) => (v.f === 'c' || v.f === 'm' || v.f === 'e') && v.d >= 10 * 60 && inTab(v, tab || 'ai') && genreOf(v.t).includes(g)))))),
  channel: (c) => memo('c:' + c, () => IDX.vids.filter((v) => v.c === c && v.f !== 's').sort((a, b) => b.p - a.p)),
  later: () => Object.entries(VIEW.later).sort((a, b) => b[1] - a[1]).map(([v]) => IDX.byId.get(v)).filter(Boolean),
  cont: () => memo('cont', () => Object.entries(HIST).filter(([v, h]) => !h[3] && h[1] > 30 && Date.now() - h[0] < 45 * 86400e3 && IDX.byId.get(v)).sort((a, b) => b[1][0] - a[1][0]).map(([v]) => IDX.byId.get(v))),
  history: () => Object.entries(HIST).sort((a, b) => b[1][0] - a[1][0]).map(([v]) => IDX.byId.get(v)).filter(Boolean),
  all: (tab) => memo('all:' + tab, () => spread(hot(base().filter((v) => v.f !== 'p' && v.f !== 'x' && v.f !== 's' && !v.up && (!tab || inTab(v, tab)))))),
};

/* 作品 */
function showVisible(s) {
  if (!s || !s.eps.length || VIEW.hides[s.id] || VIEW.blocks[s.c]) return false;
  const ch = IDX.ch[s.c];
  if (!ch) return false;
  if (ch.k === 'toon' && ch.kids && !SET.kids) return false;
  if (ch.l === 'en' && !SET.west) return false;
  return true;
}
function showHeat(s) {
  const best = s.eps.reduce((m, v) => Math.max(m, heat(v)), -9);
  const age = Math.max(0, nowS() - (s.t || 0)) / 86400;
  return best + (age < 7 ? 0.8 : age < 30 ? 0.3 : 0) + Math.min(1, s.n_eps / 24) * 0.4;
}
const SL = {
  all: (tab, kind) => memo('shows:' + tab + ':' + kind, () => IDX.shows.filter((s) => showVisible(s) && (!kind || s.kind === kind) && (!tab || (KINDS[s.kind] || KINDS.jp).tab === tab)).map((s) => [s, showHeat(s)]).sort((a, b) => b[1] - a[1]).map((x) => x[0])),
  updated: (tab) => memo('upd:' + tab, () => IDX.shows.filter((s) => showVisible(s) && (!tab || (KINDS[s.kind] || KINDS.jp).tab === tab) && nowS() - (s.t || 0) < 10 * 86400).sort((a, b) => b.t - a.t)),
  followed: () => memo('fol', () => Object.entries(VIEW.follow).map(([id, f]) => [IDX.showById.get(id), f]).filter(([s]) => s).sort((a, b) => (b[0].t || 0) - (a[0].t || 0)).map(([s]) => s)),
  /* 追番更新：追的作品有我還沒看過、在上次打開之後才上架的集數 */
  news: () => memo('news', () => SL.followed().map((s) => {
    const since = SHOWSEEN[s.id] || (VIEW.follow[s.id] ? VIEW.follow[s.id].t / 1000 : 0);
    const fresh = s.eps.filter((v) => v.p > since && !histOf(v.i));
    return fresh.length ? { s, n: fresh.length, v: fresh.sort((a, b) => a.p - b.p)[0] } : null;
  }).filter(Boolean)),
};

/* 作品的進度：看到第幾集、下一集是哪一支 */
function showProgress(s) {
  let last = -1, watched = 0, lastT = 0;
  s.eps.forEach((v, i) => {
    const h = histOf(v.i);
    if (!h) return;
    if (h[3] || h[1] > 60) watched++;
    if (h[0] > lastT) { lastT = h[0]; last = i; }
  });
  let next = s.eps[0], resume = false;
  if (last >= 0) {
    const h = histOf(s.eps[last].i);
    if (h && !h[3]) { next = s.eps[last]; resume = true; } else next = s.eps[last + 1] || null;
  }
  return { watched, last, next, resume, done: s.eps.length > 0 && watched >= s.eps.length };
}
/* 這支片在作品裡是第幾集（作品清單的位置，或標題寫的集數） */
function epLabel(v) {
  if (v.r) return '第 ' + v.r[0] + '–' + v.r[1] + ' 集';
  if (v.e) return (kindOf(v) === 'jp' ? '第 ' + v.e + ' 話' : '第 ' + v.e + ' 集');
  const s = showOf(v);
  if (s && s.eps.length > 1) { const k = s.eps.indexOf(v); if (k >= 0) return '第 ' + (k + 1) + ' 集'; }
  return '';
}
/* 合輯看到大約第幾集：有章節用章節，沒有就照 1-80 集的比例估 */
function approxEp(v, pos) {
  if (v.chap && v.chap.length) {
    let k = 0;
    for (let i = 0; i < v.chap.length; i++) if (v.chap[i][0] <= pos + 1) k = i;
    return { label: v.chap[k][1] || '第 ' + (k + 1) + ' 段', exact: true, k };
  }
  if (v.r && v.d) {
    const n = v.r[1] - v.r[0] + 1;
    const e = v.r[0] + Math.min(n - 1, Math.floor((pos / v.d) * n));
    return { label: '約第 ' + e + ' 集', exact: false, e, n };
  }
  return null;
}

/* 抽一部：從夠好的作品／合輯裡抽 */
function gachaPool() {
  const comps = L.comps('').slice(0, 120);
  const shows = SL.all('', '').slice(0, 120).filter((s) => !showProgress(s).done);
  return { comps, shows };
}

/* 搜尋：作品、頻道、影片 */
function search(q) {
  q = (q || '').trim().toLowerCase();
  if (!q) return { shows: [], chans: [], vids: [] };
  const has = (s) => (s || '').toLowerCase().includes(q);
  const shows = IDX.shows.filter((s) => showVisible(s) && has(s.n)).slice(0, 12);
  const chans = Object.values(IDX.ch).filter((c) => has(c.n) || has(c.h)).slice(0, 10);
  const vids = base().filter((v) => v.f !== 's' && (has(v.t) || has(v.t0))).sort((a, b) => heat(b) - heat(a)).slice(0, 60);
  return { shows, chans, vids };
}

rebuildView();
