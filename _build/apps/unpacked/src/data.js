/* 解包 — 資料：目錄、專題、Steam 即時資料（GitHub Actions 每小時更新） */
const DATA = (() => {
  const q = new URLSearchParams(location.search);
  const local = !/github\.io$/.test(location.hostname);
  return (local && q.get('data')) || 'data/';
})();

async function getJSON(path, fresh = true) {
  const r = await fetch(DATA + path + (fresh ? (path.includes('?') ? '&' : '?') + 't=' + Math.floor(Date.now() / 60000) : ''), { cache: 'no-store' });
  if (!r.ok) throw new Error(path + ' HTTP ' + r.status);
  return r.json();
}
async function loadIndex() {
  // 全部一起發出去（以前分三批排隊，手機網路每批多等一趟）；行情板、免費補給站、活動時程、TGA、點播台讀不到都不影響主畫面
  const [idx, live, picks, wish, weekly, skip, board, free, events, tga, qa, inbox] = await Promise.all([getJSON('index.json'), getJSON('live.json').catch(() => ({ apps: {} })),
    getJSON('picks.json').catch(() => ({ items: [] })), getJSON('wish.json').catch(() => null), getJSON('weekly.json').catch(() => ({ items: [] })), getJSON('wish-skip.json').catch(() => ({})),
    ...['board.json', 'free.json', 'events.json', 'tga.json', 'qa.json', 'inbox.json'].map((p) => getJSON(p).catch(() => null))]);
  S.wishSkip = skip || {};
  if (board && board.rows) S.board = board;
  if (free && free.items) S.free = free;
  if (events && events.items) S.events = events;
  if (tga && tga.cats) S.tgaD = tga;
  if (qa && qa.items) S.qa = qa;
  if (inbox && inbox.events) { S.inbox = inbox; if (typeof askAck === 'function') askAck(); }
  S.index = idx; S.live = live || { apps: {} }; S.picks = picks || { items: [] };
  for (const id of Object.keys(LIVEX.got)) liveMerge(id);     // 重新讀 live.json 之後，載過的預告、截圖併回去
  S.wish = wish && wish.items ? wish : null; S.weekly = weekly && weekly.items ? weekly : { items: [] };
  return idx;
}
const INFLIGHT = {};
function once(key, fn) { return INFLIGHT[key] || (INFLIGHT[key] = fn().finally(() => { delete INFLIGHT[key]; })); }
async function loadPick(id) {
  if (S.pickF[id]) return S.pickF[id];
  const f = await once('p:' + id, () => getJSON('picks/' + id + '.json'));
  S.pickF[id] = f; return f;
}
/* 目錄裡找一款（專題或推坑） */
const findItem = (id) => (S.index && S.index.items.find((x) => x.id === id)) || (S.picks && S.picks.items.find((x) => x.id === id)) || null;
/* 「首通約 7 小時」「主線 60～70 小時」→ 取第一個數字 */
const hoursOf = (t) => { const m = /(\d+(?:\.\d+)?)/.exec(t || ''); return m ? +m[1] : null; };
async function loadFeature(id) {
  if (S.feats[id]) return S.feats[id];
  const f = await once('f:' + id, () => getJSON('features/' + id + '.json'));
  S.feats[id] = f; return f;
}
async function loadHist(appid) {
  if (!appid) return null;
  if (S.hist[appid]) return S.hist[appid];
  try { S.hist[appid] = await once('h:' + appid, () => getJSON('hist/' + appid + '.json')); } catch (e) { S.hist[appid] = null; }
  return S.hist[appid];
}
async function loadBoardD() {
  if (S.boardD) return S.boardD;
  try { S.boardD = await getJSON('board-d.json'); } catch (e) { S.boardD = null; }
  return S.boardD;
}
/* 點播台：問答與收件（開著點播台時每 2 分鐘重讀一次） */
async function loadAsk() {
  const [qa, inbox] = await Promise.all([getJSON('qa.json').catch(() => null), getJSON('inbox.json').catch(() => null)]);
  if (qa && qa.items) S.qa = qa;
  if (inbox && inbox.events) { S.inbox = inbox; askAck(); }
}
const liveOf = (steam) => (steam && S.live && S.live.apps) ? S.live.apps[String(steam)] || null : null;
/* 即時資料分兩層（典藏升級）：live.json 只有清單用的（價格、同上、評價、語言、主視覺、動態預告），每次開 App 都載；
   預告清單、截圖、介紹、開發商在 live/<appid>.json，點開那一款才載，載好直接併進 live.json 那一筆（之後 liveOf 就是完整的）。
   舊格式（全部都在 live.json）也能用：有預告或截圖欄位就當作已經載好。 */
const LIVEX = { got: {}, wait: {} };
function liveReady(id) {
  id = String(id || ''); const a = S.live && S.live.apps && S.live.apps[id];
  return !a || !!LIVEX.got[id] || ['shots', 'trailers', 'short', 'dev'].some((k) => a[k] !== undefined);
}
function liveMerge(id) {
  const a = S.live && S.live.apps && S.live.apps[id]; const x = LIVEX.got[id]; if (!a || !x) return;
  for (const k of Object.keys(x)) {
    if ((k === 'img' || k === 'micro') && x[k] && typeof x[k] === 'object') a[k] = Object.assign({}, x[k], a[k] || {});
    else if (a[k] === undefined) a[k] = x[k];
  }
}
/* 載一批（已經有的直接略過）；ms：最多等多久（網路太慢就先用手上的） */
function liveLoad(ids, ms) {
  const ps = [];
  for (const raw of ids || []) {
    const id = String(raw || ''); if (!id || liveReady(id)) continue;
    if (!LIVEX.wait[id]) {
      LIVEX.wait[id] = fetch(DATA + 'live/' + id + '.json').then((r) => (r.ok ? r.json() : r.status === 404 ? {} : null)).catch(() => null)
        .then((x) => { delete LIVEX.wait[id]; if (x) { LIVEX.got[id] = x; liveMerge(id); } });
    }
    ps.push(LIVEX.wait[id]);
  }
  if (!ps.length) return Promise.resolve();
  const all = Promise.all(ps);
  return ms ? Promise.race([all, new Promise((r) => setTimeout(r, ms))]) : all;
}

/* ---- 圖片 ---- */
const ytThumb = (id, q = 'maxresdefault') => `https://i.ytimg.com/vi/${id}/${q}.jpg`;
function heroOf(it, lv) {
  lv = lv || liveOf(it.steam || (it.game && it.game.steam));
  const yt = it.yt || (it.media && it.media.yt && it.media.yt[0] && it.media.yt[0].id);
  return (lv && lv.img && (lv.img.hero || lv.img.wide || lv.img.header)) || it.img || (it.media && it.media.images && it.media.images[0]) || (yt ? ytThumb(yt) : '');
}
function headerOf(it, lv) {
  lv = lv || liveOf(it.steam);
  const yt = it.yt;
  return (lv && lv.img && (lv.img.header || lv.img.wide || lv.img.hero)) || it.img || (yt ? ytThumb(yt, 'hqdefault') : '');
}
/* YouTube 自動截的預告畫面（影片 1/4、1/2、3/4 處），每支預告多 3 張圖 */
const ytFrame = (id, n) => `https://i.ytimg.com/vi/${id}/maxres${n}.jpg`;
const ytLow = (s) => { const m = /\/maxres(default|\d)\.jpg/.exec(s || ''); return m ? s.replace(m[0], `/${m[1] === 'default' ? 'hqdefault' : 'hq' + m[1]}.jpg`) : ''; };
/* 圖片壞掉時：maxres → hq；再壞就換成塗鴉底 */
function imgFail(img) {
  const low = ytLow(img.getAttribute('src'));
  if (low) { img.src = low; return; }
  img.style.display = 'none';
  const ph = img.parentElement && img.parentElement.querySelector('.ph'); if (ph) ph.style.display = 'grid';
}
/* 相簿：Steam 截圖 → 專題附的官方圖 → 每支預告的畫面 */
function galleryOf(f, lv) {
  const out = [];
  for (const s of (lv && lv.shots) || []) out.push(s);
  for (const s of (f.media && f.media.images) || []) out.push(s);
  for (const y of (f.media && f.media.yt) || []) for (const n of [1, 2, 3]) out.push(ytFrame(y.id, n));
  return [...new Set(out)].slice(0, 18);
}
/* 動態主視覺輪播用的圖：主視覺打頭，再來是截圖和預告封面 */
function heroList(f, lv, hero) {
  const out = [hero];
  for (const s of (lv && lv.shots) || []) out.push(s);
  for (const s of (f.media && f.media.images) || []) out.push(s);
  for (const y of (f.media && f.media.yt) || []) { out.push(ytThumb(y.id)); out.push(ytFrame(y.id, 2)); }
  return [...new Set(out.filter(Boolean))].slice(0, 12);
}
/* 首頁海報輪播用（只有目錄資料：Steam 截圖、官方圖、第一支預告） */
function posterList(it, lv, first) {
  const out = [first];
  for (const s of ((lv && lv.shots) || []).slice(0, 5)) out.push(s);
  for (const s of it.gal || []) out.push(s);
  if (it.yt) { out.push(ytThumb(it.yt)); for (const n of [1, 2, 3]) out.push(ytFrame(it.yt, n)); }
  return [...new Set(out.filter(Boolean))].slice(0, 8);
}
/* YouTube 不存在的影片會回 120×90 的灰圖 */
function ytCheck(img) { if (img.naturalWidth && img.naturalWidth <= 120) imgFail(img); }

/* ---- 顯示用 ---- */
const STAMP_CLS = { '推薦': 's-go', '觀望': 's-mid', '不推薦': 's-no' };
function zhLabel(z) { return z === 'tc' ? '繁中' : z === 'none' ? '無中文' : '中文未知'; }
function liveZh(lv, z) {
  if (lv && lv.langs) { if (lv.langs.tc) return 'tc'; if (lv.langs.sc) return 'sc'; return 'none'; }
  return z;
}
function priceLabel(it, lv) {
  if (lv && lv.free) return '免費';
  if (lv && lv.price && lv.price.final != null) return fmtNT(lv.price.final);
  return (it.price_text || '').split(/[／（(]/)[0].trim();
}
function moneyLabel(l) {
  return l == null ? '課金未確認' : ['無內購', '可選內購', '季票／通行證', '付費加速', '抽卡／付費變強'][l] || '';
}
