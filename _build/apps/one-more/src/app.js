'use strict';
/* 一集就好 ONE MORE — AI 動漫劇集播放器（給朋友用的精簡版）
   片庫：讀《補番》整理好的片庫，只取 AI 漫劇、沙雕動畫、動態漫畫（不另外花 YouTube 金鑰）。
   置頂：站長的頻道「遊戲狂想曲」（讀《觀戰》管線輸出的 mine.json）。
   每個人的收藏、看到哪、設定只存在自己的手機（localStorage），不上傳、不同步。 */

const VERSION = '1.0.0';
const BUILD = 'dev';
const RAW = 'https://raw.githubusercontent.com/PZWei0105/PZ-Games';
const QS = new URLSearchParams(location.search);
const CAT_URL = QS.get('cat') || RAW + '/binge-data/catalog.json';
const MINE_URL = QS.get('mine') || RAW + '/spectate-data/mine.json';
const MY_CH = { c: 'UC8qZlMVw7C6FAh2eQtffbIw', n: '遊戲狂想曲', h: '@Gaming-Rhapsody' };
const PFX = 'onemore.v1.';
const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const AI_KINDS = { ai: 'AI 漫劇', sd: '沙雕動畫', mc: '動態漫畫' };
const F_NE = 128;

const store = {
  get(k, d) { try { const v = localStorage.getItem(PFX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) { /* 空間滿了就算了 */ } },
};
const SET = Object.assign({ skin: 'matcha', music: true, vol: 0.35, sfx: true, play: null, asked: false }, store.get('set', {}));
function saveSet() { store.set('set', SET); }
const HIST = store.get('hist', {});      // vid: [最後看的時間 ms, 看到第幾秒, 片長, 看完 0/1]
const FAV = store.get('fav', {});        // 's:作品 id' 或 'v:影片 id' → 收藏時間
const CNT = store.get('cnt', { day: '', n: 0, ids: [] });

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nowS = () => Date.now() / 1000;
const thumb = (id, q) => 'https://i.ytimg.com/vi/' + id + '/' + (q || 'mqdefault') + '.jpg';
const ytUrl = (id, t) => 'https://www.youtube.com/watch?v=' + id + (t > 30 ? '&t=' + Math.floor(t) + 's' : '');
const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
function hash32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function len(s) {
  if (!s) return '';
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  if (h) return h + ' 小時' + (m ? ' ' + m + ' 分' : '');
  return Math.max(1, m) + ' 分鐘';
}
function clock(s) {
  s = Math.round(s || 0);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
}
function ago(p) {
  const d = nowS() - p;
  if (d < 3600) return Math.max(1, Math.round(d / 60)) + ' 分鐘前';
  if (d < 86400) return Math.round(d / 3600) + ' 小時前';
  if (d < 86400 * 30) return Math.round(d / 86400) + ' 天前';
  const t = new Date(p * 1000);
  return (t.getMonth() + 1) + '/' + t.getDate();
}
function num(n) { return n >= 1e8 ? (n / 1e8).toFixed(1).replace(/\.0$/, '') + ' 億' : n >= 1e4 ? (n / 1e4).toFixed(1).replace(/\.0$/, '') + ' 萬' : String(n || 0); }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2200); }

/* ------------------------------------------------------------ 題材 */
const GENRES = [
  ['甜寵', /甜寵|甜宠|寵妻|宠妻|戀|恋|嫁|老公|老婆|夫人|王妃|萌寶|萌宝|團寵|团宠|閃婚|闪婚|追妻/],
  ['古風', /古風|古风|王爺|王爷|皇帝|皇子|公主|太子|將軍|将军|宮|宫|侯府|嫡女|庶女|皇后/],
  ['穿越', /穿越|穿書|穿书|穿成|魂穿|穿到/],
  ['重生', /重生|回到|重回|再活/],
  ['爆笑', /搞笑|沙雕|爆笑|整活|離譜|离谱|鬼畜/],
  ['懸疑', /懸疑|悬疑|推理|探案|規則怪談|规则怪谈|驚悚|惊悚|恐怖|詭異|诡异/],
  ['修仙', /修仙|仙尊|仙帝|渡劫|築基|筑基|元嬰|元婴|靈根|灵根|宗門|宗门|飛升|飞升|仙門|仙门/],
  ['玄幻', /玄幻|神帝|魔神|武神|異世|异世|帝尊|神尊|諸天|诸天|萬界|万界/],
  ['都市', /都市|總裁|总裁|豪門|豪门|神豪|首富|校花|公司|職場|职场/],
  ['末世', /末世|末日|喪屍|丧尸|天災|天灾|囤貨|囤货|廢土|废土|求生/],
  ['系統', /系統|系统|金手指|簽到|签到|外掛|外挂/],
  ['科幻', /科幻|星際|星际|機甲|机甲|宇宙|賽博|赛博|未來|未来/],
];
const genreMemo = new Map();
function genreOf(t) {
  if (!genreMemo.has(t)) genreMemo.set(t, GENRES.filter(([, rx]) => rx.test(t || '')).map(([g]) => g).slice(0, 2));
  return genreMemo.get(t);
}

/* ------------------------------------------------------------ 片庫 */
const D = { cat: null, mine: null, err: null };
const IDX = { vids: [], byId: new Map(), ch: {}, shows: [], showById: new Map() };

function indexCat() {
  const c = D.cat || {};
  const chs = c.chs || [];
  const keep = new Set();
  IDX.ch = {};
  (c.ch || []).forEach((x, i) => {
    const k = x.k === 'auto' ? 'ai' : x.k;
    if (AI_KINDS[k]) { keep.add(i); IDX.ch[chs[i]] = { id: chs[i], n: x.n, a: x.a, k }; }
  });
  const all = c.vids || [];
  const pos = new Map();
  IDX.vids = [];
  all.forEach((a, n) => {
    if (!keep.has(a[1])) return;
    const f = a[6] || 'e';
    if (f !== 'c' && f !== 'e' && f !== 'm' && f !== 's') return;
    const v = { i: a[0], c: chs[a[1]], t: a[2], d: a[3] || 0, p: a[4] || 0, v: a[5] || 0, f, ne: !!((a[7] | 0) & F_NE), show: -1, e: a[9] || 0, r: a[10] && a[11] ? [a[10], a[11]] : null };
    pos.set(n, v);
    IDX.vids.push(v);
  });
  IDX.byId = new Map(IDX.vids.map((v) => [v.i, v]));
  IDX.shows = [];
  for (const s of c.shows || []) {
    const ch = chs[s.c];
    if (!IDX.ch[ch]) continue;
    const eps = (s.eps || []).map((x) => pos.get(x)).filter(Boolean);
    if (!eps.length) continue;
    const k = IDX.shows.length;
    const o = { id: s.id, n: s.n, c: ch, eps, t: s.t || 0, cover: pos.get(s.cv) || eps[0], k };
    eps.forEach((v) => { if (v.show < 0) v.show = k; });
    IDX.shows.push(o);
  }
  IDX.showById = new Map(IDX.shows.map((s) => [s.id, s]));
  MEMO.clear();
}
const showOf = (v) => (v && v.show >= 0 ? IDX.shows[v.show] : null);
const chOf = (c) => IDX.ch[c] || { n: '' };
function epLabel(v) {
  if (v.r) return '第 ' + v.r[0] + '–' + v.r[1] + ' 集';
  const s = showOf(v);
  if (v.e) return '第 ' + v.e + ' 集';
  if (s && s.eps.length > 1) { const k = s.eps.indexOf(v); if (k >= 0) return '第 ' + (k + 1) + ' 集'; }
  return '';
}
function titleParts(v) {
  const s = showOf(v);
  if (s) return { name: s.n, rest: v.t && v.t !== s.n ? v.t : '' };
  const m = /《([^《》]{2,40})》/.exec(v.t || '');
  if (m) return { name: m[1], rest: (v.t.slice(0, m.index) + ' ' + v.t.slice(m.index + m[0].length)).replace(/^[\s｜|:：,，、]+|[\s｜|:：,，、]+$/g, '').replace(/\s{2,}/g, ' ') };
  return { name: v.t, rest: '' };
}

async function getJSON(url) {
  const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Math.floor(Date.now() / 300000), { cache: 'no-cache' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function load() {
  const cached = store.get('catAt', null);
  const [cat, mine] = await Promise.allSettled([getJSON(CAT_URL), getJSON(MINE_URL)]);
  if (cat.status === 'fulfilled') { D.cat = cat.value; store.set('catAt', D.cat.at); D.err = null; } else D.err = cached ? null : '片單暫時讀不到，等一下再試試看。';
  if (mine.status === 'fulfilled') D.mine = mine.value;
  indexCat();
}

/* ------------------------------------------------------------ 清單 */
const MEMO = new Map();
const memo = (k, fn) => { if (!MEMO.has(k)) MEMO.set(k, fn()); return MEMO.get(k); };
function heat(v) {
  const age = Math.max(0, nowS() - (v.p || nowS())) / 86400;
  return Math.log10(10 + (v.v || 0)) + (age < 3 ? 1 : age < 14 ? 0.5 : age < 60 ? 0.15 : 0);
}
const byHeat = (a, b) => heat(b) - heat(a);
/* 同一部作品只放一支、同一台不要連續 */
function tidy(list, perShow = 1) {
  const seen = new Map(), out = [];
  for (const v of list) {
    const key = v.show >= 0 ? 's' + v.show : v.i;
    const n = seen.get(key) || 0;
    if (n >= perShow) continue;
    seen.set(key, n + 1);
    out.push(v);
  }
  const res = [];
  while (out.length) {
    let k = out.findIndex((x) => res.slice(-3).filter((o) => o.c === x.c).length < 2);
    if (k < 0) k = 0;
    res.push(out.splice(k, 1)[0]);
  }
  return res;
}
const L = {
  comps: () => memo('comps', () => tidy(IDX.vids.filter((v) => (v.f === 'c' || v.f === 'm') && v.d >= 40 * 60).sort(byHeat))),
  fresh: () => memo('fresh', () => tidy(IDX.vids.filter((v) => v.f !== 's' && nowS() - v.p < 14 * 86400).sort((a, b) => b.p - a.p), 2)),
  shorts: () => memo('shorts', () => tidy(IDX.vids.filter((v) => v.f === 's').sort(byHeat), 2)),
  shows: () => memo('shows', () => IDX.shows.filter((s) => s.eps.length >= 3).map((s) => [s, Math.log10(10 + s.eps.reduce((t, v) => t + (v.v || 0), 0)) + (nowS() - s.t < 7 * 86400 ? 0.8 : 0)]).sort((a, b) => b[1] - a[1]).map((x) => x[0])),
  cont: () => Object.entries(HIST).filter(([v, h]) => !h[3] && h[1] > 30 && IDX.byId.get(v)).sort((a, b) => b[1][0] - a[1][0]).map(([v]) => IDX.byId.get(v)).slice(0, 20),
  history: () => Object.entries(HIST).sort((a, b) => b[1][0] - a[1][0]).map(([v]) => IDX.byId.get(v)).filter(Boolean),
  favs: () => Object.entries(FAV).sort((a, b) => b[1] - a[1]).map(([k]) => (k[0] === 's' ? IDX.showById.get(k.slice(2)) : IDX.byId.get(k.slice(2)))).filter(Boolean),
};
function heroPick(shift) {
  const pool = L.comps().filter((v) => !v.ne && !(HIST[v.i] && HIST[v.i][3])).slice(0, 60);
  if (!pool.length) return null;
  const k = (hash32(dayKey()) + (shift || 0) * 7919) % pool.length;
  return pool[k];
}

/* ------------------------------------------------------------ 看了幾集（一集就好？） */
function countToday(id) {
  const d = dayKey();
  if (CNT.day !== d) { CNT.day = d; CNT.n = 0; CNT.ids = []; }
  if (CNT.ids.includes(id)) return;
  CNT.ids.push(id);
  if (CNT.ids.length > 80) CNT.ids.shift();
  CNT.n++;
  store.set('cnt', CNT);
}
function todayN() { return CNT.day === dayKey() ? CNT.n : 0; }
function helloLine() {
  const n = todayN();
  if (!n) return '今天想看什麼？說好，一集就好。';
  if (n === 1) return '今天看了 <b class="cnt">1 集</b>，很好，很克制。';
  if (n <= 3) return '今天第 <b class="cnt">' + n + ' 集</b>了……說好的一集呢？';
  if (n <= 6) return '第 <b class="cnt">' + n + ' 集</b>。沒關係，今天就放縱一下。';
  return '第 <b class="cnt">' + n + ' 集</b>！明天記得說「一集就好」。';
}
function greet() {
  const h = new Date().getHours();
  return h < 5 ? '夜深了' : h < 11 ? '早安' : h < 14 ? '午安' : h < 18 ? '午後好' : h < 23 ? '晚上好' : '夜深了';
}

/* ------------------------------------------------------------ 卡片 */
function progOf(v) { const h = HIST[v.i]; return h && !h[3] && h[2] ? Math.max(0.03, Math.min(1, h[1] / h[2])) : 0; }
function vcard(v, ctx, opt = {}) {
  const tp = titleParts(v), ch = chOf(v.c), ep = epLabel(v), pg = progOf(v), h = HIST[v.i];
  const g = genreOf(v.t + ' ' + tp.name)[0];
  const isNew = nowS() - v.p < 3 * 86400 && !h;
  return `<a class="vc${opt.wide ? ' wide' : ''}" href="#w/${v.i}" data-v="${v.i}" data-ctx="${ctx || ''}">
    <span class="vc-th"><img loading="lazy" src="${thumb(v.i)}" alt="">
      ${v.d ? `<i class="vc-len">${esc(v.f === 'e' || v.d < 3600 ? clock(v.d) : len(v.d))}</i>` : ''}
      ${ep ? `<i class="vc-ep">${esc(ep)}</i>` : ''}
      ${v.ne ? '<i class="vc-ne">到 YouTube 看 ↗</i>' : isNew ? '<i class="vc-new">NEW</i>' : ''}
      ${pg ? `<i class="vc-pg" style="--p:${(pg * 100).toFixed(0)}%"></i>` : ''}
      ${h && h[3] ? '<i class="vc-seen">看過了</i>' : ''}
    </span>
    <span class="vc-t"><span class="nm${tp.rest ? ' one' : ''}">${esc(tp.name)}</span>${tp.rest ? `<small>${esc(tp.rest)}</small>` : ''}</span>
    <span class="vc-m">${g ? `<i class="tag">${g}</i>` : ''}<b>${esc(ch.n)}</b>${v.v ? '<span>· ' + num(v.v) + ' 次</span>' : ''}</span>
  </a>`;
}
function scard(s) {
  const done = s.eps.filter((v) => HIST[v.i] && HIST[v.i][3]).length;
  const g = genreOf(s.n + ' ' + s.eps[0].t)[0];
  return `<a class="vc" href="#s/${encodeURIComponent(s.id)}" data-s="${esc(s.id)}">
    <span class="vc-th"><img loading="lazy" src="${thumb(s.cover.i)}" alt=""><i class="vc-ep">共 ${s.eps.length} 集</i>${done ? `<i class="vc-len">看到第 ${done} 集</i>` : ''}</span>
    <span class="vc-t">${esc(s.n)}</span>
    <span class="vc-m">${g ? `<i class="tag">${g}</i>` : ''}<b>${esc(chOf(s.c).n)}</b></span>
  </a>`;
}
function vsCard(v, ctx) {
  return `<a class="vs" href="#w/${v.i}" data-v="${v.i}" data-ctx="${ctx}"><span class="vs-th"><img loading="lazy" src="${thumb(v.i, 'hqdefault')}" alt=""></span><b>${esc(titleParts(v).name)}</b></a>`;
}
const CTX = new Map();
function ctxOf(name, items) { CTX.set(name, items.map((x) => x.i)); return name; }
function row(name, items, title, opt = {}) {
  if (!items.length) return '';
  const ctx = ctxOf(name, items);
  const fn = opt.fn || ((v) => vcard(v, ctx));
  return `<section class="sec"><div class="sh"><h2>${esc(title)}</h2>${opt.note ? `<small>${esc(opt.note)}</small>` : ''}${opt.more ? `<a class="more" href="${opt.more}">全部 ›</a>` : ''}</div>
    <div class="row">${items.slice(0, opt.max || 14).map(fn).join('')}</div></section>`;
}

/* ------------------------------------------------------------ 畫面 */
let heroShift = 0;
function pinHtml() {
  const m = ((D.mine && D.mine.ch) || [])[0] || {};
  const n = m.n || MY_CH.n, a = m.a, v = (m.items || [])[0];
  const chUrl = 'https://www.youtube.com/' + (m.h || MY_CH.h);
  return `<section class="pin">
    <div class="pin-h"><span class="pin-av">${a ? `<img src="${esc(a)}" alt="" referrerpolicy="no-referrer">` : esc(n.charAt(0))}</span>
      <span><span class="pin-k">站長的頻道</span><div class="pin-n">${esc(n)}</div><div class="pin-s">新遊戲推薦、好不好玩一次講清楚${m.subs >= 1000 ? ' · ' + num(m.subs) + ' 位訂閱' : ''}</div></span>
      <a class="pin-go" href="${esc(chUrl)}" target="_blank" rel="noopener">去頻道看看</a></div>
    ${v ? `<a class="pin-v" href="#w/${v.i}" data-mine="${v.i}"><span class="th"><img src="${thumb(v.i)}" alt=""><i></i></span>
      <span><b>${esc(v.tz || v.t)}</b><span>最新影片 · ${esc(ago(v.p))}${v.d ? ' · ' + esc(clock(v.d)) : ''}</span></span></a>` : ''}
  </section>`;
}
function heroHtml() {
  const v = heroPick(heroShift);
  if (!v) return '';
  const tp = titleParts(v), g = genreOf(v.t + ' ' + tp.name);
  const ctx = ctxOf('hero', [v]);
  return `<section class="hero" id="hero">
    <a class="hero-th" href="#w/${v.i}" data-v="${v.i}" data-ctx="${ctx}"><img src="${thumb(v.i, 'hqdefault')}" alt=""><i class="stamp">今天就這部</i></a>
    <div class="hero-in"><div class="hero-t">${esc(tp.name)}</div>
      <div class="hero-s">${[g.join('・'), len(v.d), v.r ? v.r[0] + '–' + v.r[1] + ' 集' : '', chOf(v.c).n].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="hero-b"><a class="btn" href="#w/${v.i}" data-v="${v.i}" data-ctx="${ctx}">▶ 開始看</a><button class="btn ghost" data-act="reroll"><span class="spin">↻</span> 換一部</button></div></div>
  </section>`;
}
function vHome() {
  let h = `<div class="hello"><h1>${greet()}</h1><p>${helloLine()}</p></div>`;
  h += pinHtml();
  if (!D.cat) return h + (D.err ? `<div class="empty"><b>片單還沒到</b>${esc(D.err)}</div>` : '<div class="empty"><b>正在泡茶、整理片單…</b>馬上好。</div>');
  const cont = L.cont();
  h += row('cont', cont, '繼續看', { note: '從上次停的地方接著看' });
  h += heroHtml();
  h += row('comps', L.comps(), '一口氣看完', { note: '整套合輯，一次幾個小時', more: '#browse/c' });
  h += row('shows', L.shows(), '一集一集追', { fn: scard, note: '照集數排好的系列', more: '#browse/shows' });
  const sh = L.shorts();
  if (sh.length) { const ctx = ctxOf('shorts', sh); h += row('shorts', sh, '短短一集', { fn: (v) => vsCard(v, ctx), note: '直式短劇，幾分鐘一集', more: '#browse/s', max: 16 }); }
  h += row('fresh', L.fresh(), '新上架', { more: '#browse/new' });
  h += `<div class="foot">片單每 30 分鐘自動更新 · ${IDX.vids.length.toLocaleString()} 支影片 · ${IDX.shows.length} 部作品<br>一集就好 v${VERSION}</div>`;
  return h;
}

const BF = { g: '', len: '', fmt: 'all', limit: 40 };
function browseList() {
  return memo('b:' + BF.g + ':' + BF.len + ':' + BF.fmt, () => {
    let l;
    if (BF.fmt === 'new') l = L.fresh().slice();
    else if (BF.fmt === 's') l = IDX.vids.filter((v) => v.f === 's').sort(byHeat);
    else if (BF.fmt === 'c') l = L.comps().slice();
    else l = tidy(IDX.vids.filter((v) => v.f !== 's').sort(byHeat), 2);
    if (BF.g) { const rx = GENRES.find(([g]) => g === BF.g)[1]; l = l.filter((v) => rx.test(v.t + ' ' + titleParts(v).name)); }
    if (BF.len) { const [a, b] = { 1: [0, 3600], 3: [3600, 3 * 3600], 9: [3 * 3600, 1e9] }[BF.len]; l = l.filter((v) => v.d >= a && v.d < b); }
    return l;
  });
}
function vBrowse(sub) {
  if (sub && sub !== BF.fmt && ['all', 'c', 's', 'new', 'shows'].includes(sub)) { BF.fmt = sub; BF.limit = 40; }
  let h = `<div class="ph"><h1>分類</h1><p>挑個題材，今天就看這種。</p></div>`;
  const chip = (act, k, label, cur) => `<button class="${cur === k ? 'on' : ''}" data-act="${act}" data-k="${k}">${label}</button>`;
  h += `<div class="chips">${[['all', '全部'], ['c', '一口氣看完'], ['shows', '一集一集追'], ['s', '短短一集'], ['new', '新上架']].map(([k, t]) => chip('fmt', k, t, BF.fmt)).join('')}</div>`;
  h += `<div class="chips">${[['', '全部題材']].concat(GENRES.map(([g]) => [g, g])).map(([k, t]) => chip('genre', k, t, BF.g)).join('')}</div>`;
  if (BF.fmt !== 's' && BF.fmt !== 'shows') h += `<div class="chips">${[['', '不限長度'], ['1', '1 小時內'], ['3', '1～3 小時'], ['9', '3 小時以上']].map(([k, t]) => chip('len', k, t, BF.len)).join('')}</div>`;
  if (!D.cat) return h + '<div class="empty"><b>正在整理片單…</b></div>';
  if (BF.fmt === 'shows') {
    let s = L.shows();
    if (BF.g) { const rx = GENRES.find(([g]) => g === BF.g)[1]; s = s.filter((x) => rx.test(x.n + ' ' + x.eps[0].t)); }
    return h + (s.length ? `<div class="grid" style="margin-top:10px">${s.slice(0, BF.limit).map(scard).join('')}</div>${s.length > BF.limit ? '<button class="btn ghost loadmore" data-act="more">再看更多</button>' : ''}` : '<div class="empty"><b>這個題材還沒有系列</b>換個標籤看看。</div>');
  }
  const l = browseList();
  const ctx = ctxOf('browse', l.slice(0, 120));
  const fn = BF.fmt === 's' ? (v) => vsCard(v, ctx) : (v) => vcard(v, ctx);
  h += l.length ? `<div class="grid" style="margin-top:10px">${l.slice(0, BF.limit).map(fn).join('')}</div>${l.length > BF.limit ? '<button class="btn ghost loadmore" data-act="more">再看更多</button>' : ''}`
    : '<div class="empty"><b>這個組合還沒有片</b>換個標籤或長度看看。</div>';
  return h;
}
function vSaved() {
  let h = `<div class="ph"><h1>收藏</h1><p>只存在這支手機裡，不用登入。</p></div>`;
  const favs = L.favs();
  if (favs.length) {
    const vids = favs.filter((x) => x.i), ctx = ctxOf('favs', vids);
    h += `<div class="grid">${favs.map((x) => (x.i ? vcard(x, ctx) : scard(x))).join('')}</div>`;
  } else h += '<div class="empty"><b>還沒有收藏</b>看到喜歡的，在播放畫面按「♡ 收藏」。</div>';
  const hist = L.history().slice(0, 30);
  h += row('hist', hist, '看過的', { note: '最近 30 支' });
  const seg = (k, opts) => `<span class="seg">${opts.map(([v, t]) => `<button class="${SET[k] === v ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${v}">${t}</button>`).join('')}</span>`;
  h += `<section class="sec"><div class="sh"><h2>設定</h2></div><div class="set">
    <div class="set-r"><span>顏色<small>抹茶綠、乾燥玫瑰，隨時換</small></span>${seg('skin', [['matcha', '抹茶綠'], ['rose', '乾燥玫瑰']])}</div>
    <div class="set-r"><span>點影片時<small>${IS_IOS ? 'iPhone 有 YouTube Premium 的話，選「YouTube App」就沒有廣告' : '有 YouTube Premium 的話，在這裡看也一樣沒廣告（瀏覽器要先登入 YouTube）'}</small></span>${seg('play', [['app', '在這裡看'], ['yt', 'YouTube App']])}</div>
    <div class="set-r"><span>背景音樂<small>開始看影片就會自動停</small></span>${seg('music', [[true, '開'], [false, '關']])}</div>
    <div class="set-r"><span>音樂音量</span><input type="range" min="0" max="100" value="${Math.round(SET.vol * 100)}" data-act="vol"></div>
    <div class="set-r"><span>按鈕音效</span>${seg('sfx', [[true, '開'], [false, '關']])}</div>
    <div class="set-r"><span>清除看過的紀錄<small>收藏不會被清掉</small></span><button class="btn ghost sm" data-act="clear">清除</button></div>
  </div></section>`;
  h += `<div class="foot">一集就好 v${VERSION}</div>`;
  return h;
}

/* ------------------------------------------------------------ 播放器 */
const Player = (() => {
  let yt = null, ready = false, cur = null, list = [], tickT = 0, nextT = 0, apiP = null, open_ = false;
  function loadAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (apiP) return apiP;
    apiP = new Promise((res, rej) => {
      window.onYouTubeIframeAPIReady = () => res();
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => rej(new Error('播放器載入失敗'));
      document.head.appendChild(s);
      setTimeout(() => rej(new Error('播放器載入逾時')), 15000);
    });
    return apiP;
  }
  function startPos(v) { const h = HIST[v.i]; return h && !h[3] && h[1] > 20 && (!h[2] || h[1] < h[2] - 25) ? h[1] : 0; }
  function note(pos, dur, done) {
    if (!cur || cur.ghost) return;
    const h = HIST[cur.i] || [0, 0, 0, 0];
    HIST[cur.i] = [Date.now(), Math.round(pos || h[1]), Math.round(dur || h[2] || cur.d), done ? 1 : h[3]];
    const keys = Object.keys(HIST);
    if (keys.length > 400) keys.sort((a, b) => HIST[a][0] - HIST[b][0]).slice(0, keys.length - 400).forEach((k) => delete HIST[k]);
    store.set('hist', HIST);
  }
  function upNext() {
    if (!cur) return null;
    const s = showOf(cur);
    if (s) { const k = s.eps.indexOf(cur); for (let i = k + 1; i < s.eps.length; i++) if (!s.eps[i].ne) return s.eps[i]; }
    const k = list.indexOf(cur.i);
    for (let i = k + 1; i < list.length; i++) { const v = IDX.byId.get(list[i]); if (v && !v.ne) return v; }
    return null;
  }
  function prevOf() {
    if (!cur) return null;
    const s = showOf(cur);
    if (s) { const k = s.eps.indexOf(cur); return k > 0 ? s.eps[k - 1] : null; }
    const k = list.indexOf(cur.i);
    return k > 0 ? IDX.byId.get(list[k - 1]) : null;
  }
  function body() {
    const v = cur, tp = titleParts(v), s = showOf(v), g = genreOf(v.t + ' ' + tp.name);
    const fk = s ? 's:' + s.id : 'v:' + v.i;
    const nx = upNext(), pv = prevOf();
    let h = `<div class="pl-h">${esc(tp.name)}</div><div class="pl-sub">${[epLabel(v), tp.rest, len(v.d), chOf(v.c).n].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="pl-acts"><button class="btn ghost sm${FAV[fk] ? ' on' : ''}" data-act="fav" data-k="${esc(fk)}">${FAV[fk] ? '♥ 已收藏' : '♡ 收藏'}</button>
      ${pv ? `<button class="btn ghost sm" data-act="take" data-v="${pv.i}">‹ 上一集</button>` : ''}
      ${nx ? `<button class="btn sm" data-act="take" data-v="${nx.i}">下一集 ›</button>` : ''}
      ${g.map((x) => `<span class="tag" style="align-self:center">${x}</span>`).join('')}</div>`;
    const eps = s ? s.eps : list.map((x) => IDX.byId.get(x)).filter(Boolean).slice(0, 40);
    if (eps.length > 1) {
      h += `<div class="eps"><h3>${s ? '全部集數（共 ' + s.eps.length + ' 集）' : '接著看'}</h3><div class="ep-list">${eps.map((e, i) => {
        const hh = HIST[e.i];
        return `<a class="ep${e === v ? ' cur' : ''}${hh && hh[3] ? ' seen' : ''}" href="#w/${e.i}" data-act="take" data-v="${e.i}"><img loading="lazy" src="${thumb(e.i)}" alt="">
          <span><b>${e === v ? '正在看' : hh && hh[3] ? '看過了' : s ? '第 ' + (i + 1) + ' 集' : esc(len(e.d))}</b><i>${esc(s ? e.t : titleParts(e).name)}</i></span></a>`;
      }).join('')}</div></div>`;
    }
    $('#plBody').innerHTML = h;
    const c = $('#plBody .ep.cur'), pb = $('#plBody');
    const k = c ? $$('#plBody .ep').indexOf(c) : -1;
    pb.scrollTop = k > 2 ? Math.max(0, c.getBoundingClientRect().top - pb.getBoundingClientRect().top + pb.scrollTop - 140) : 0;
  }
  function msg(title, why) {
    const m = $('#plMsg');
    m.hidden = false;
    const nx = upNext();
    m.innerHTML = `<div><b>${esc(title)}</b><p>${esc(why)}</p><a class="btn" href="${ytUrl(cur.i, startPos(cur))}" target="_blank" rel="noopener">到 YouTube 看</a>${nx ? ` <button class="btn ghost" data-act="take" data-v="${nx.i}">下一集</button>` : ''}</div>`;
  }
  function play(v) {
    cur = v;
    $('#plMsg').hidden = true;
    hideNext();
    $('#plTitle').textContent = titleParts(v).name;
    $('#plYt').href = ytUrl(v.i, startPos(v));
    $('#plFrame').classList.toggle('tall', v.f === 's');
    body();
    countToday(v.i);
    if (v.ne) { try { if (yt && ready) yt.stopVideo(); } catch (e) { /* */ } msg('這支要到 YouTube 看', '頻道沒有開放在其他 App 播。'); return; }
    const start = Math.floor(startPos(v));
    loadAPI().then(() => {
      if (cur !== v) return;
      if (!yt) {
        yt = new YT.Player('ytp', {
          videoId: v.i, width: '100%', height: '100%',
          playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, start: start || undefined, hl: 'zh-TW', origin: location.origin },
          events: {
            onReady: () => { ready = true; try { yt.playVideo(); } catch (e) { /* */ } },
            onStateChange: onState,
            onError: (e) => { msg('這支要到 YouTube 看', e.data === 100 ? '這支影片已經被刪除或設成私人。' : '頻道沒有開放在其他 App 播，或有年齡、地區限制。'); },
          },
        });
      } else if (ready) {
        try { yt.loadVideoById({ videoId: v.i, startSeconds: start }); } catch (e) { /* */ }
      }
    }).catch((e) => msg('播放器打不開', e.message + '，可以直接到 YouTube 看。'));
  }
  function onState(e) {
    if (e.data === 1) { Snd.duck(true); clearInterval(tickT); tickT = setInterval(() => { try { note(yt.getCurrentTime(), yt.getDuration()); } catch (er) { /* */ } }, 5000); }
    else if (e.data === 2) { clearInterval(tickT); try { note(yt.getCurrentTime(), yt.getDuration()); } catch (er) { /* */ } }
    else if (e.data === 0) {
      clearInterval(tickT);
      try { note(yt.getDuration(), yt.getDuration(), true); } catch (er) { /* */ }
      body();
      const nx = upNext();
      if (nx) showNext(nx);
    }
  }
  function showNext(nx) {
    const box = $('#plNext');
    let left = 6;
    const draw = () => { box.innerHTML = `<img src="${thumb(nx.i)}" alt=""><span><small>${left} 秒後播下一集</small><b>${esc(titleParts(nx).name)}${epLabel(nx) ? ' · ' + esc(epLabel(nx)) : ''}</b></span><button class="btn sm" data-act="take" data-v="${nx.i}">現在看</button><button class="btn ghost sm" data-act="nx-x">先不要</button>`; };
    box.hidden = false;
    draw();
    clearInterval(nextT);
    nextT = setInterval(() => { left--; if (left <= 0) { clearInterval(nextT); take(nx.i); } else { const s = box.querySelector('small'); if (s) s.textContent = left + ' 秒後播下一集'; } }, 1000);
  }
  function hideNext() { clearInterval(nextT); $('#plNext').hidden = true; }
  function take(id) {
    const v = IDX.byId.get(id) || mineVideo(id);
    if (!v) return;
    try { if (yt && ready && cur) note(yt.getCurrentTime(), yt.getDuration()); } catch (e) { /* */ }
    if (!list.includes(id) && !showOf(v)) list = [id];
    history.replaceState(null, '', '#w/' + id);
    Snd.tap();
    play(v);
  }
  return {
    get isOpen() { return open_; },
    get cur() { return cur; },
    open(id, ctx) {
      const v = IDX.byId.get(id) || mineVideo(id);
      if (!v) return false;
      list = (ctx && ctx.length ? ctx : [id]).slice(0, 120);
      if (!list.includes(id)) list.unshift(id);
      if (!open_) {
        open_ = true;
        const p = $('#player');
        p.hidden = false;
        document.documentElement.classList.add('watching');
        requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('in')));
        Snd.duck(true);
      }
      play(v);
      return true;
    },
    close() {
      if (!open_) return;
      try { if (yt && ready) { note(yt.getCurrentTime(), yt.getDuration()); yt.pauseVideo(); } } catch (e) { /* */ }
      clearInterval(tickT); hideNext();
      open_ = false;
      const p = $('#player');
      p.classList.remove('in');
      document.documentElement.classList.remove('watching');
      setTimeout(() => { if (!open_) p.hidden = true; }, 400);
      Snd.duck(false);
      render();
    },
    take, hideNext, body: () => cur && body(),
  };
})();
/* 站長頻道的影片（不在 AI 片庫裡） */
function mineVideo(id) {
  for (const ch of (D.mine && D.mine.ch) || []) {
    const it = (ch.items || []).find((x) => x.i === id);
    if (it) return { i: it.i, c: '_mine', t: it.tz || it.t, d: it.d || 0, p: it.p || 0, v: it.v || 0, f: 'e', ne: !!it.ne, show: -1, e: 0, r: null, mine: 1 };
  }
  return null;
}
IDX.ch._mine = { n: MY_CH.n };

/* ------------------------------------------------------------ 第一次在 iPhone 點影片：問有沒有 Premium */
function sheet(html) {
  const s = $('#sheet');
  $('#sheetIn').innerHTML = html;
  s.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('in')));
}
function closeSheet() { const s = $('#sheet'); s.classList.remove('in'); setTimeout(() => { s.hidden = true; }, 320); }
let pendingWatch = null;
function askPremium(id, ctx) {
  pendingWatch = [id, ctx];
  sheet(`<h2>先問一件小事</h2><p>你有 YouTube Premium 嗎？iPhone 的關係，有 Premium 的話交給 YouTube App 播才不會有廣告。</p>
    <div class="ask"><button data-act="ask" data-v="yt"><b>有，交給 YouTube App</b><span>沒廣告、可以背景播放；這裡會記得你看過哪幾集</span></button>
    <button data-act="ask" data-v="app"><b>沒有，在這裡看就好</b><span>會記住看到第幾分鐘，下次接著看</span></button></div>
    <p style="margin:14px 0 0;font-size:12.5px">之後可以在「收藏」頁的設定隨時改。</p>`);
}
function watch(id, ctx) {
  const v = IDX.byId.get(id) || mineVideo(id);
  if (!v) return;
  if (IS_IOS && !SET.asked && !v.ne) { askPremium(id, ctx); return; }
  if (SET.play === 'yt' || v.ne) {
    window.open(ytUrl(id, (HIST[id] || [])[1]), '_blank');
    countToday(id);
    HIST[id] = [Date.now(), (HIST[id] || [])[1] || 0, v.d, (HIST[id] || [])[3] || 0];
    store.set('hist', HIST);
    Snd.tap();
    setTimeout(render, 300);
    return;
  }
  history.pushState({ om: 1 }, '', '#w/' + id);
  Player.open(id, ctx);
}

/* ------------------------------------------------------------ 搜尋 */
function openSearch() {
  sheet(`<div class="search"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.3 4.3-1.4 1.4-4.3-4.3A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"/></svg><input id="q" type="search" placeholder="找片名，例如：重生、王妃、修仙" autocomplete="off"></div><div class="sr" id="sr"><p>輸入片名或關鍵字。</p></div>`);
  setTimeout(() => { const q = $('#q'); if (q) q.focus(); }, 350);
}
function runSearch(q) {
  q = q.trim().toLowerCase();
  const box = $('#sr');
  if (!box) return;
  if (!q) { box.innerHTML = '<p>輸入片名或關鍵字。</p>'; return; }
  const shows = IDX.shows.filter((s) => s.eps.length > 1 && s.n.toLowerCase().includes(q)).slice(0, 6);
  const vids = tidy(IDX.vids.filter((v) => v.f !== 's' && (v.t || '').toLowerCase().includes(q)).sort(byHeat)).slice(0, 18);
  const ctx = ctxOf('search', vids);
  box.innerHTML = (shows.length || vids.length) ? `<div class="grid" style="padding:0">${shows.map(scard).join('')}${vids.map((v) => vcard(v, ctx)).join('')}</div>` : '<p>找不到，換個關鍵字試試。</p>';
}

/* ------------------------------------------------------------ 路由 */
let ROUTE = 'home';
function parse() { return (location.hash || '#home').slice(1); }
function render() {
  const r = ROUTE, [base, sub] = r.split('/');
  const v = $('#view');
  let h;
  if (base === 'browse') h = vBrowse(sub);
  else if (base === 'saved') h = vSaved();
  else h = vHome();
  v.innerHTML = h;
  $$('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === (base === 'browse' || base === 'saved' ? base : 'home')));
}
function route() {
  const r = parse();
  if (r.startsWith('w/')) {
    const id = r.slice(2);
    if (!Player.isOpen || !Player.cur || Player.cur.i !== id) {
      if (!Player.open(id, CTX.get(PENDING_CTX) || [id])) { history.replaceState(null, '', '#' + ROUTE); }
    }
    return;
  }
  if (r.startsWith('s/')) {
    const s = IDX.showById.get(decodeURIComponent(r.slice(2)));
    history.replaceState(null, '', '#' + ROUTE);
    if (s) { const v = s.eps.find((e) => !(HIST[e.i] && HIST[e.i][3])) || s.eps[0]; watch(v.i, s.eps.map((e) => e.i)); }
    return;
  }
  if (Player.isOpen) Player.close();
  const changed = r !== ROUTE;
  ROUTE = r;
  render();
  if (changed) window.scrollTo(0, 0);
}
let PENDING_CTX = '';

/* ------------------------------------------------------------ 換色 */
function applySkin(s, x, y) {
  document.documentElement.dataset.skin = s;
  Snd.setSkin(s);
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = s === 'rose' ? '#f7efe9' : '#f3efe4';
  if (x != null) {
    let w = $('#swirl');
    if (!w) { w = document.createElement('i'); w.id = 'swirl'; document.body.appendChild(w); }
    w.style.left = (x - 20) + 'px'; w.style.top = (y - 20) + 'px';
    w.style.background = s === 'rose' ? '#f2d9d8' : '#d7e5d4';
    w.classList.remove('go'); void w.offsetWidth; w.classList.add('go');
  }
}

/* ------------------------------------------------------------ 事件 */
function firstTouch() {
  if (SET.music) { Snd.setVol(SET.vol); Snd.start(); if (Player.isOpen) Snd.duck(true); }
  $('#btnMusic').classList.toggle('on', SET.music);
}
document.addEventListener('pointerdown', function once() { document.removeEventListener('pointerdown', once, true); firstTouch(); }, true);
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]');
  const link = e.target.closest('a[href]');
  if (!a && link) {
    const href = link.getAttribute('href');
    if (href.startsWith('#w/')) {
      e.preventDefault();
      if ($('#sheet').classList.contains('in')) closeSheet();
      const id = href.slice(3);
      const ctx = link.dataset.mine ? [id] : (CTX.get(link.dataset.ctx || '') || [id]);
      watch(id, ctx);
      return;
    }
    if (href.startsWith('#s/') && $('#sheet').classList.contains('in')) closeSheet();
    if (link.target === '_blank') Snd.tap();
    return;
  }
  if (!a) { if (e.target.id === 'sheet') closeSheet(); return; }
  const act = a.dataset.act;
  switch (act) {
    case 'close':
      if (history.state && history.state.om) history.back();
      else { history.replaceState(null, '', '#' + ROUTE); route(); }
      break;
    case 'take': e.preventDefault(); Player.take(a.dataset.v); break;
    case 'nx-x': Player.hideNext(); break;
    case 'fav': {
      const k = a.dataset.k;
      if (FAV[k]) delete FAV[k]; else { FAV[k] = Date.now(); Snd.pop(); toast('收進收藏了'); }
      store.set('fav', FAV);
      Player.body();
      break;
    }
    case 'reroll': {
      heroShift++;
      const h = $('#hero');
      if (h) { const tmp = document.createElement('div'); tmp.innerHTML = heroHtml(); h.replaceWith(tmp.firstElementChild); $('#hero').classList.add('spinning'); }
      Snd.pop();
      break;
    }
    case 'fmt': BF.fmt = a.dataset.k; BF.limit = 40; history.replaceState(null, '', '#browse/' + BF.fmt); ROUTE = 'browse/' + BF.fmt; Snd.tap(); render(); break;
    case 'genre': BF.g = a.dataset.k; BF.limit = 40; Snd.tap(); render(); break;
    case 'len': BF.len = a.dataset.k; BF.limit = 40; Snd.tap(); render(); break;
    case 'more': BF.limit += 40; render(); break;
    case 'set': {
      const k = a.dataset.k;
      let v = a.dataset.v;
      if (v === 'true') v = true; else if (v === 'false') v = false;
      SET[k] = v;
      if (k === 'play') SET.asked = true;
      saveSet();
      if (k === 'skin') { applySkin(v, e.clientX, e.clientY); Snd.chime(); }
      if (k === 'music') { if (v) { Snd.setVol(SET.vol); Snd.start(); } else Snd.stop(); $('#btnMusic').classList.toggle('on', v); }
      if (k !== 'skin') Snd.tap();
      render();
      break;
    }
    case 'clear': Object.keys(HIST).forEach((k) => delete HIST[k]); store.set('hist', HIST); CNT.n = 0; CNT.ids = []; store.set('cnt', CNT); toast('紀錄清掉了'); render(); break;
    case 'ask': {
      SET.play = a.dataset.v; SET.asked = true; saveSet();
      closeSheet();
      const p = pendingWatch; pendingWatch = null;
      if (p) setTimeout(() => watch(p[0], p[1]), 50);
      break;
    }
    default: break;
  }
});
document.addEventListener('input', (e) => {
  if (e.target.dataset.act === 'vol') { SET.vol = e.target.value / 100; saveSet(); Snd.setVol(SET.vol); }
  if (e.target.id === 'q') { clearTimeout(runSearch._t); runSearch._t = setTimeout(() => runSearch(e.target.value), 180); }
});
$('#btnSearch').addEventListener('click', () => { Snd.tap(); openSearch(); });
$('#btnSkin').addEventListener('click', (e) => { SET.skin = SET.skin === 'rose' ? 'matcha' : 'rose'; saveSet(); applySkin(SET.skin, e.clientX, e.clientY); Snd.chime(); toast(SET.skin === 'rose' ? '換成乾燥玫瑰' : '換成抹茶綠'); if (ROUTE.startsWith('saved')) render(); });
$('#btnMusic').addEventListener('click', () => {
  SET.music = !SET.music; saveSet();
  if (SET.music) { Snd.setVol(SET.vol); Snd.start(); toast('音樂開了'); } else { Snd.stop(); toast('音樂關了'); }
  $('#btnMusic').classList.toggle('on', SET.music);
  if (ROUTE.startsWith('saved')) render();
});
window.addEventListener('hashchange', route);
window.addEventListener('scroll', () => { document.documentElement.classList.toggle('scrolled', window.scrollY > 8); }, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) Snd.duck(true);
  else { if (!Player.isOpen) Snd.duck(false); if (Date.now() - (D.loadedAt || 0) > 20 * 60e3) refresh(); }
});
async function refresh() {
  await load();
  D.loadedAt = Date.now();
  if (!Player.isOpen) render();
}

/* ------------------------------------------------------------ 開始 */
applySkin(SET.skin);
if (SET.play == null) SET.play = 'app';
ROUTE = parse().startsWith('w/') || parse().startsWith('s/') ? 'home' : parse();
render();
refresh().then(() => { if (parse().startsWith('w/') || parse().startsWith('s/')) route(); });
if (window.OM_WEB && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
