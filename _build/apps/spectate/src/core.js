'use strict';
/* 觀戰 SPECTATE — 核心：設定、資料、同步、清單 */

const VERSION = '1.0.0';
const BUILD = 'dev';   // 每次組建不一樣（build.py 填）：回到 App 時跟網站上的 ver.json 比，看有沒有新版
const NAME = '痞子葳';
const RAW = 'https://raw.githubusercontent.com/PZWei0105/PZ-Games';
const QS = new URLSearchParams(location.search);
const DATA_URL = QS.get('data') || RAW + '/spectate-data/';
const MAIN_URL = QS.get('main') || RAW + '/main/apps/spectate/data/';
const RELAY = 'https://ntfy.sh/pz-spectate-e4431fca8fc4498df14a';
const PFX = 'spectate.v1.';
const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const IS_IPHONE = /iPhone|iPod/.test(navigator.userAgent);
// 手機、平板（主要用手指點）：全螢幕改用「橫放全螢幕」；電腦照舊
const TOUCH = matchMedia('(hover: none) and (pointer: coarse)').matches;

const store = {
  get(k, d) { try { const v = localStorage.getItem(PFX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) { /* 空間滿了就算了 */ } },
  del(k) { try { localStorage.removeItem(PFX + k); } catch (e) { /* */ } },
};

const DEFAULT_SET = { bgm: true, sfx: true, vol: 0.7, intro: 'daily', fx: 'full', zhFirst: true, zhSubs: true, shorts: false, filtered: false, auto: true, play: 'app', gacha: false, autoLand: true, landDir: 90 };
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

function ago(p) {
  if (!p) return '';
  const s = nowS() - p;
  if (s < 0) return '即將';
  if (s < 90) return '剛剛';
  if (s < 3600) return Math.floor(s / 60) + ' 分鐘前';
  if (s < 86400) return Math.floor(s / 3600) + ' 小時前';
  if (s < 2 * 86400) return '昨天';
  if (s < 7 * 86400) return Math.floor(s / 86400) + ' 天前';
  const d = new Date(p * 1000);
  return (d.getMonth() + 1) + '/' + d.getDate();
}
function until(p) {
  const s = p - nowS();
  if (s <= 0) return '開播中';
  if (s < 3600) return Math.ceil(s / 60) + ' 分鐘後';
  if (s < 86400) return Math.floor(s / 3600) + ' 小時 ' + Math.floor((s % 3600) / 60) + ' 分後';
  const d = new Date(p * 1000);
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function num(n) {
  if (n == null) return '';
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '億';
  if (n >= 1e4) return (n / 1e4).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + '萬';
  return n.toLocaleString('en-US');
}
function dur(s) {
  if (!s && s !== 0) return '';
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
}
function dayKey(t = Date.now()) {
  const d = new Date(t);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function greet() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return '早安';
  if (h >= 11 && h < 14) return '午安';
  if (h >= 14 && h < 18) return '下午好';
  if (h >= 18 && h < 23) return '晚上好';
  return '夜深了';
}
function hash32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function seeded(seed) { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; }

const thumb = (id, q) => 'https://i.ytimg.com/vi/' + id + '/' + (q || 'mqdefault') + '.jpg';
const ytUrl = (id) => 'https://www.youtube.com/watch?v=' + id;
const chUrl = (c) => 'https://www.youtube.com/channel/' + c;

/* ------------------------------------------------------------ 車道（節目類型） */
const LANES = {
  live: { zh: '直播', en: 'LIVE', c: 'var(--red)' },
  trailer: { zh: '預告', en: 'TRAILER', c: 'var(--gold)' },
  review: { zh: '評測', en: 'REVIEW', c: 'var(--cyan)' },
  guide: { zh: '攻略', en: 'GUIDE', c: 'var(--green)' },
  news: { zh: '新聞', en: 'NEWS', c: 'var(--ice)' },
  deep: { zh: '深度', en: 'DEEP', c: 'var(--violet)' },
  play: { zh: '實況', en: 'PLAY', c: 'var(--orange)' },
};
const KINDS = { official: '官方', media: '媒體', creator: '創作者', stream: '實況主' };
const LANGS = { zh: '中', en: 'EN', ja: '日', ko: '韓' };

/* ------------------------------------------------------------ 資料 */
const D = { feed: null, games: null, disc: null, me: null, status: null, at: 0, ok: false, err: null, busy: false };
const IDX = { items: [], byId: new Map(), ch: {}, games: {}, gameList: [], gameMap: new Map(), hot: [], rev: 0 };
/* 播放器回報「頻道不允許嵌入」的影片：記在這台裝置，下次直接標出來（金鑰沒查到的也補上） */
const NE = store.get('ne', {});
function markNoEmbed(v) {
  if (!v || NE[v]) return;
  NE[v] = Date.now();
  const keys = Object.keys(NE);
  if (keys.length > 600) keys.sort((a, b) => NE[a] - NE[b]).slice(0, keys.length - 600).forEach((k) => delete NE[k]);
  store.set('ne', NE);
  const it = IDX.byId.get(v);
  if (it) it.ne = 'embed';
  MEMO.clear();
}
const NE_WHY = { embed: '頻道不開放在其他 App 播', age: '有年齡限制', region: '台灣看不到' };

async function getJSON(base, name, fresh) {
  const bust = fresh ? Date.now() : Math.floor(Date.now() / 60000);
  const r = await fetch(base + name + '?t=' + bust, { cache: 'no-store' });
  if (!r.ok) throw new Error(name + ' ' + r.status);
  return r.json();
}

async function loadAll(fresh) {
  if (D.busy) return false;
  D.busy = true;
  const [feed, games, disc, status, me] = await Promise.allSettled([
    getJSON(DATA_URL, 'feed.json', fresh), getJSON(DATA_URL, 'games.json', fresh), getJSON(DATA_URL, 'discover.json', fresh),
    getJSON(DATA_URL, 'status.json', fresh), getJSON(MAIN_URL, 'me.json', fresh),
  ]);
  D.busy = false;
  let changed = false;
  if (feed.status === 'fulfilled' && feed.value && feed.value.items) {
    if (!D.feed || D.feed.at !== feed.value.at) { D.feed = feed.value; changed = true; }
    D.ok = true; D.err = null;
  } else if (!D.feed) {
    D.err = '轉播資料還沒到：' + ((feed.reason && feed.reason.message) || '連不上');
  }
  if (games.status === 'fulfilled' && games.value) { const was = D.games && D.games.at; D.games = games.value; if (was !== D.games.at) changed = true; }
  if (disc.status === 'fulfilled') D.disc = disc.value;
  if (status.status === 'fulfilled') D.status = status.value;
  if (me.status === 'fulfilled' && me.value) takeMe(me.value);
  D.at = Date.now();
  if (changed) indexFeed();
  return changed;
}

function indexFeed() {
  const f = D.feed || {};
  IDX.items = f.items || [];
  IDX.byId = new Map(IDX.items.map((it) => [it.i, it]));
  IDX.ch = f.ch || {};
  IDX.games = f.games || {};
  IDX.gameList = (D.games && D.games.games) || [];
  IDX.gameMap = new Map(IDX.gameList.map((g) => [g.k, g]));
  IDX.hot = (f.hot || []).filter((v) => IDX.byId.has(v));
  for (const v of Object.keys(NE)) { const it = IDX.byId.get(v); if (it && !it.ne) it.ne = 'embed'; }
  IDX.rev++;
  MEMO.clear();
}

/* ------------------------------------------------------------ 訂閱同步（轉發站） */
const SYNC = { out: store.get('out', []), base: store.get('base', null), fail: 0, sentAt: 0 };
let VIEW = null;

function emptyMe() { return { subs: {}, blocks: {}, passes: {}, later: {}, adds: [], seen: [] }; }
function applyEv(v, e) {
  switch (e.type) {
    case 'sub': v.subs[e.ch] = { t: e.t, n: e.n, src: e.src }; delete v.blocks[e.ch]; delete v.passes[e.ch]; break;
    case 'unsub': delete v.subs[e.ch]; break;
    case 'block': v.blocks[e.ch] = e.t; delete v.subs[e.ch]; break;
    case 'unblock': delete v.blocks[e.ch]; break;
    case 'pass': v.passes[e.ch] = e.t; break;
    case 'unpass': delete v.passes[e.ch]; break;
    case 'later': if (e.on === false) delete v.later[e.v]; else v.later[e.v] = e.t; break;
    case 'add': v.adds.push({ id: e.id, q: e.q, t: e.t, st: 'send' }); break;
    default: break;
  }
}
function rebuildView() {
  const b = SYNC.base || emptyMe();
  const v = { subs: Object.assign({}, b.subs), blocks: Object.assign({}, b.blocks), passes: Object.assign({}, b.passes), later: Object.assign({}, b.later), adds: (b.adds || []).slice() };
  const seen = new Set(b.seen || []);
  SYNC.out.filter((e) => !seen.has(e.id)).sort((a, z) => a.t - z.t).forEach((e) => applyEv(v, e));
  VIEW = v;
  MEMO.clear();
  return v;
}
function takeMe(me) {
  if (!me || typeof me !== 'object') return;
  SYNC.base = { subs: me.subs || {}, blocks: me.blocks || {}, passes: me.passes || {}, later: me.later || {}, adds: me.adds || [], seen: me.seen || [], at: me.at };
  store.set('base', SYNC.base);
  const seen = new Set(SYNC.base.seen);
  const before = SYNC.out.length;
  SYNC.out = SYNC.out.filter((e) => !seen.has(e.id));
  if (SYNC.out.length !== before) store.set('out', SYNC.out);
  rebuildView();
  if (typeof syncLight === 'function') syncLight();
}
function newEv(type, fields) {
  const seq = (store.get('seq', 0) | 0) + 1;
  store.set('seq', seq);
  const ev = Object.assign({ id: DEV + '-' + seq, type, t: Date.now() }, fields);
  SYNC.out.push(ev);
  store.set('out', SYNC.out);
  rebuildView();
  scheduleSend();
  if (typeof syncLight === 'function') syncLight();
  return ev;
}
let sendTimer = 0;
function scheduleSend(ms) { clearTimeout(sendTimer); sendTimer = setTimeout(sendNow, ms == null ? 1500 : ms); }
async function sendNow() {
  const now = Date.now();
  const todo = SYNC.out.filter((e) => !e.sent || now - e.sent > 3 * 3600e3);
  if (!todo.length) return;
  for (let i = 0; i < todo.length; i += 12) {
    const chunk = todo.slice(i, i + 12);
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
  SYNC.sentAt = now;
  store.set('out', SYNC.out);
  if (typeof syncLight === 'function') syncLight();
}
function syncState() {
  if (SYNC.fail && SYNC.out.length) return 'bad';
  if (SYNC.out.length) return 'wait';
  return 'ok';
}

/* 動作 */
function subscribe(c, src) { if (!c || VIEW.subs[c]) return; const ch = IDX.ch[c] || {}; newEv('sub', { ch: c, n: (ch.n || '').slice(0, 80), src: src || 'app' }); }
function unsubscribe(c) { if (VIEW.subs[c]) newEv('unsub', { ch: c }); }
function block(c) { const ch = IDX.ch[c] || {}; newEv('block', { ch: c, n: (ch.n || '').slice(0, 80) }); }
function unblock(c) { newEv('unblock', { ch: c }); }
function pass(c) { newEv('pass', { ch: c }); }
function unpass(c) { newEv('unpass', { ch: c }); }
function setLater(v, on) { if (!!VIEW.later[v] === on) return; newEv('later', { v, on }); }
function addChannel(q) { newEv('add', { q: q.slice(0, 300) }); }

/* ------------------------------------------------------------ 觀看紀錄（只在這台裝置） */
const HIST = store.get('hist', {});      // vid: [最後看的時間 ms, 看到第幾秒, 片長, 看完 0/1, 累積毫秒, 頻道]
const WT = store.get('wt', {});          // 'YYYY-MM-DD': {頻道: 毫秒}
let histDirty = 0;
function histOf(v) { return HIST[v] || null; }
function noteWatch(it, pos, len, addMs) {
  const h = HIST[it.i] || [0, 0, 0, 0, 0, it.c];
  h[0] = Date.now(); h[1] = Math.round(pos || 0); h[2] = Math.round(len || h[2] || 0); h[5] = it.c;
  if (len && pos / len > 0.9) h[3] = 1;
  h[4] = (h[4] || 0) + (addMs || 0);
  HIST[it.i] = h;
  if (addMs) {
    const k = dayKey();
    WT[k] = WT[k] || {};
    WT[k][it.c] = (WT[k][it.c] || 0) + addMs;
  }
  if (!histDirty) histDirty = setTimeout(flushHist, 4000);
}
function flushHist() {
  histDirty = 0;
  const keys = Object.keys(HIST);
  if (keys.length > 900) keys.sort((a, b) => HIST[a][0] - HIST[b][0]).slice(0, keys.length - 900).forEach((k) => delete HIST[k]);
  const days = Object.keys(WT).sort();
  days.slice(0, Math.max(0, days.length - 35)).forEach((k) => delete WT[k]);
  store.set('hist', HIST);
  store.set('wt', WT);
}
function clearHistory() { Object.keys(HIST).forEach((k) => delete HIST[k]); Object.keys(WT).forEach((k) => delete WT[k]); flushHist(); }

/* 這週的觀戰數據：看了幾個頻道、前三名佔多少、有幾個是最近才選進來的 */
function weekStats() {
  const per = {};
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const k = dayKey(Date.now() - i * 86400e3);
    for (const [c, ms] of Object.entries(WT[k] || {})) { per[c] = (per[c] || 0) + ms; total += ms; }
  }
  const rows = Object.entries(per).sort((a, b) => b[1] - a[1]);
  const top3 = rows.slice(0, 3).reduce((s, r) => s + r[1], 0);
  const fresh = rows.filter(([c]) => VIEW.subs[c] && Date.now() - (VIEW.subs[c].t || 0) < 30 * 86400e3).length;
  const explore = total ? Math.round(100 * (1 - top3 / total)) : 0;
  return { total, chans: rows.length, rows, top3: total ? top3 / total : 0, fresh, explore };
}

/* ------------------------------------------------------------ 清單 */
const MEMO = new Map();
function memo(key, fn) { if (!MEMO.has(key)) MEMO.set(key, fn()); return MEMO.get(key); }
const zf = (it) => it.z === 'zh' || !!it.tz;
const chOf = (c) => IDX.ch[c] || { n: '頻道', k: 'creator' };
const titleOf = (it) => it.tz || it.t || '';

function visible(it) {
  if (VIEW.blocks[it.c]) return false;
  if (it.s && !SET.shorts) return false;
  if (it.x && !SET.filtered) return false;
  if (it.lv === 'upcoming' && it.st && it.st < nowS() - 2 * 3600) return false;
  if (it.g && !SET.gacha && gameOf(it.g) && gameOf(it.g).gacha) return false;
  return true;
}
function baseList() {
  return memo('base', () => dedupeLang(IDX.items.filter(visible)));
}
/* 同一支預告的多語版本：有中文版就收掉外文版 */
function dedupeLang(list) {
  if (!SET.zhFirst) return list;
  const byCh = new Map(), byGame = new Map();
  for (const it of list) {
    if (!zf(it)) continue;
    if (!byCh.has(it.c)) byCh.set(it.c, []);
    byCh.get(it.c).push(it.p);
    if (it.g && it.l === 'trailer') { if (!byGame.has(it.g)) byGame.set(it.g, []); byGame.get(it.g).push(it.p); }
  }
  // 不同官方頻道（例如 PlayStation 台灣、PlayStation Asia）兩天內都發了同一款的中文預告：只留觀看最多的
  const zhOff = new Map();
  for (const it of list) {
    if (!zf(it) || !it.g || it.l !== 'trailer' || chOf(it.c).k !== 'official') continue;
    const best = zhOff.get(it.g);
    if (!best || (it.v || 0) > (best.v || 0)) zhOff.set(it.g, it);
  }
  return list.filter((it) => {
    if (zf(it)) {
      if (it.g && it.l === 'trailer' && chOf(it.c).k === 'official') {
        const best = zhOff.get(it.g);
        if (best && best !== it && best.c !== it.c && Math.abs(best.p - it.p) < 2 * 86400) return false;
      }
      return true;
    }
    const a = byCh.get(it.c);
    if (a && a.some((p) => Math.abs(p - it.p) < 3 * 3600)) return false;
    if (it.g && it.l === 'trailer') { const b = byGame.get(it.g); if (b && b.some((p) => Math.abs(p - it.p) < 3 * 86400)) return false; }
    return true;
  });
}
/* 中文優先：三支中文配一支外語；外語片比下一支中文片新兩天以上，就先排外語，免得舊片壓新片 */
function rank(list) {
  const t = list.slice().sort((a, b) => b.p - a.p);
  if (!SET.zhFirst) return t;
  const zh = t.filter(zf), xx = t.filter((x) => !zf(x)), out = [];
  let i = 0, j = 0;
  while (i < zh.length || j < xx.length) {
    for (let k = 0; k < 3 && i < zh.length; k++) {
      if (j < xx.length && xx[j].p - zh[i].p > 2 * 86400) break;
      out.push(zh[i++]);
    }
    if (j < xx.length) out.push(xx[j++]);
  }
  return out;
}
/* 同一個頻道不要連續洗版 */
function spread(list, maxRun = 2, win = 6, cap = 260) {
  const head = list.slice(0, cap), tail = list.slice(cap), out = [];
  while (head.length) {
    let k = head.findIndex((it) => out.slice(-win).filter((o) => o.c === it.c).length < maxRun);
    if (k < 0) k = 0;
    out.push(head.splice(k, 1)[0]);
  }
  return out.concat(tail);
}
const subsOn = () => Object.keys(VIEW.subs).length > 0;
const L = {
  subs: () => memo('subs', () => spread(rank(baseList().filter((it) => VIEW.subs[it.c] && it.lv !== 'upcoming')))),
  pool: () => memo('pool', () => spread(rank(baseList().filter((it) => chOf(it.c).seed && it.lv !== 'upcoming')))),
  main: () => (subsOn() ? L.subs() : L.pool()),
  all: () => memo('all', () => spread(rank(baseList().filter((it) => it.lv !== 'upcoming')))),
  lane: (l) => memo('lane:' + l, () => spread(rank(baseList().filter((it) => it.l === l && it.lv !== 'upcoming' && nowS() - it.p < 14 * 86400)))),
  dark: () => memo('dark', () => baseList().filter((it) => it.dh && nowS() - it.p < 14 * 86400).sort((a, b) => (b.dh + (zf(b) ? 1.2 : 0)) - (a.dh + (zf(a) ? 1.2 : 0)))),
  live: () => memo('live', () => baseList().filter((it) => it.lv === 'live').sort((a, b) => (!!a.ne - !!b.ne) || (!!a.ext - !!b.ext) || (b.cv || 0) - (a.cv || 0))),
  liveMine: () => memo('liveM', () => L.live().filter((it) => !it.ext)),
  liveWeb: () => memo('liveW', () => L.live().filter((it) => it.ext).sort((a, b) => (!!a.ne - !!b.ne) || (b.cv || 0) - (a.cv || 0))),
  hot: () => memo('hot', () => IDX.hot.map((v) => IDX.byId.get(v)).filter((it) => it && visible(it))),
  upcoming: () => memo('up', () => baseList().filter((it) => it.lv === 'upcoming' && it.st).sort((a, b) => a.st - b.st)),
  replays: () => memo('rp', () => baseList().filter((it) => it.rp && nowS() - it.p < 4 * 86400).sort((a, b) => b.p - a.p)),
  game: (k) => memo('g:' + k, () => rank(baseList().filter((it) => it.g === k))),
  channel: (c) => memo('c:' + c, () => IDX.items.filter((it) => it.c === c && (SET.shorts || !it.s)).sort((a, b) => b.p - a.p)),
  later: () => Object.entries(VIEW.later).sort((a, b) => b[1] - a[1]).map(([v]) => IDX.byId.get(v) || { i: v, c: '', t: 'YouTube 影片', p: 0, l: 'play', ghost: 1 }),
  cont: () => Object.entries(HIST).filter(([v, h]) => !h[3] && h[1] > 30 && Date.now() - h[0] < 10 * 86400e3 && IDX.byId.get(v)).sort((a, b) => b[1][0] - a[1][0]).map(([v]) => IDX.byId.get(v)),
  history: () => Object.entries(HIST).sort((a, b) => b[1][0] - a[1][0]).map(([v]) => IDX.byId.get(v) || { i: v, c: HIST[v][5] || '', t: 'YouTube 影片', p: 0, l: 'play', ghost: 1 }),
  hero: () => memo('hero', () => {
    const live = L.liveMine().filter((it) => !it.ne).slice(0, 2);
    const fresh = baseList().filter((it) => it.l === 'trailer' && nowS() - it.p < 4 * 86400 && it.lv !== 'upcoming' && !it.s && !it.ne);
    const byViews = (a, b) => (b.v || 0) - (a.v || 0);
    // 中文優先：先排中文預告，外文的只補在後面
    const zh = fresh.filter(zf).sort(byViews), xx = fresh.filter((x) => !zf(x)).sort(byViews);
    const mix = SET.zhFirst ? zh.slice(0, 4).concat(xx.slice(0, 1), zh.slice(4), xx.slice(1)) : fresh.sort(byViews);
    const seen = new Set(), out = [];
    for (const it of live.concat(mix, L.main())) {
      if (it.ne) continue;
      const key = it.g || it.i;
      if (seen.has(key) || seen.has(it.i)) continue;
      seen.add(key); seen.add(it.i);
      out.push(it);
      if (out.length >= 6) break;
    }
    return out;
  }),
  newCount: () => memo('newc', () => { const since = (store.get('visit', 0) || 0) / 1000; return L.main().filter((it) => it.p > since).length; }),
};

function gameOf(k) {
  if (!k) return null;
  const g = IDX.gameMap.get(k);
  const m = IDX.games[k] || {};
  if (!g && !m.zh && !m.en) return null;
  return Object.assign({ k, zh: m.zh, en: m.en, id: m.id, img: m.img }, g || {});
}
const gameName = (g) => (g ? g.zh || g.en || '' : '');
function gamesList() {
  return memo('games', () => {
    const per = new Map();
    for (const it of baseList()) {
      if (!it.g || nowS() - it.p > 14 * 86400) continue;
      if (!per.has(it.g)) per.set(it.g, { n: 0, chs: new Set(), lanes: {} });
      const x = per.get(it.g);
      x.n++; x.chs.add(it.c); x.lanes[it.l] = (x.lanes[it.l] || 0) + 1;
    }
    return IDX.gameList.filter((g) => (SET.gacha || !g.gacha) && per.has(g.k)).map((g) => {
      const x = per.get(g.k);
      return Object.assign({}, g, IDX.games[g.k] || {}, { k: g.k, zh: g.zh || (IDX.games[g.k] || {}).zh, en: g.en || (IDX.games[g.k] || {}).en, n: x.n, chs: x.chs.size, lanes: x.lanes });
    }).sort((a, b) => (b.chs * 3 + b.n) - (a.chs * 3 + a.n) || b.hot - a.hot);
  });
}

/* 新秀：探勘到的＋精選名單裡還沒選的（每天換一批） */
function rookies() {
  return memo('rook', () => {
    const out = [];
    const used = new Set();
    for (const p of (D.disc && D.disc.picks) || []) {
      if (VIEW.subs[p.c] || VIEW.passes[p.c] || VIEW.blocks[p.c] || used.has(p.c)) continue;
      used.add(p.c);
      out.push({ c: p.c, n: p.n, a: p.a, subs: p.subs, vids: p.vids, ds: p.ds, why: p.why || [], sample: p.sample, day: p.day, scout: 1 });
    }
    const rnd = seeded(hash32(dayKey() + DEV));
    const pool = Object.entries(IDX.ch).filter(([c, ch]) => ch.seed && !VIEW.subs[c] && !VIEW.passes[c] && !VIEW.blocks[c] && !used.has(c))
      .map(([c, ch]) => ({ c, ch, r: rnd() + (ch.l === 'zh' ? 0.35 : 0) })).sort((a, b) => b.r - a.r);
    for (const { c, ch } of pool) {
      if (out.length >= 8) break;
      let vids = baseList().filter((it) => it.c === c && !it.lv);
      if (SET.zhFirst && vids.some(zf)) vids = vids.filter(zf);
      if (!vids.length) continue;
      const best = vids.slice().sort((a, b) => (Math.log2(1 + (b.dh || 0)) * 2 + Math.log10((b.v || 0) + 10) - (nowS() - b.p) / 86400 / 7) - (Math.log2(1 + (a.dh || 0)) * 2 + Math.log10((a.v || 0) + 10) - (nowS() - a.p) / 86400 / 7))[0];
      const lanes = {};
      vids.forEach((v) => { lanes[v.l] = (lanes[v.l] || 0) + 1; });
      const main = Object.entries(lanes).sort((a, b) => b[1] - a[1])[0];
      const why = ['精選名單裡你還沒選的'];
      if (main) why.push('多半在做' + LANES[main[0]].zh);
      if (best.dh) why.push(best.dh >= 50 ? '最近有支影片爆了：觀看是平常的 50 倍以上' : '最近有支觀看是平常的 ' + best.dh + ' 倍');
      out.push({ c, n: ch.n, a: ch.a, subs: ch.subs, ds: ch.ds, why, sample: { i: best.i, t: titleOf(best), p: best.p, v: best.v, d: best.d }, pool: 1 });
    }
    return out;
  });
}

/* 搜尋：遊戲、頻道、影片 */
function search(q) {
  q = (q || '').trim().toLowerCase();
  if (!q) return { games: [], chans: [], vids: [] };
  const has = (s) => (s || '').toLowerCase().includes(q);
  const chans = Object.entries(IDX.ch).filter(([, ch]) => has(ch.n) || has(ch.h)).slice(0, 12).map(([c, ch]) => Object.assign({ c }, ch));
  const vids = baseList().filter((it) => has(it.t) || has(it.tz) || has(it.t0) || has(gameName(gameOf(it.g)))).slice(0, 60);
  const all = gamesList();
  const games = all.filter((g) => has(g.zh) || has(g.en));
  const fromVids = {};
  vids.forEach((it) => { if (it.g) fromVids[it.g] = (fromVids[it.g] || 0) + 1; });
  Object.entries(fromVids).sort((a, b) => b[1] - a[1]).forEach(([k]) => { const g = all.find((x) => x.k === k); if (g && !games.includes(g)) games.push(g); });
  return { games: games.slice(0, 8), chans, vids };
}

rebuildView();
