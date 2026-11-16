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
  const [idx, live, picks] = await Promise.all([getJSON('index.json'), getJSON('live.json').catch(() => ({ apps: {} })), getJSON('picks.json').catch(() => ({ items: [] }))]);
  S.index = idx; S.live = live || { apps: {} }; S.picks = picks || { items: [] };
  return idx;
}
async function loadPick(id) {
  if (S.pickF[id]) return S.pickF[id];
  const f = await getJSON('picks/' + id + '.json');
  S.pickF[id] = f; return f;
}
/* 目錄裡找一款（專題或推坑） */
const findItem = (id) => (S.index && S.index.items.find((x) => x.id === id)) || (S.picks && S.picks.items.find((x) => x.id === id)) || null;
/* 「首通約 7 小時」「主線 60～70 小時」→ 取第一個數字 */
const hoursOf = (t) => { const m = /(\d+(?:\.\d+)?)/.exec(t || ''); return m ? +m[1] : null; };
async function loadFeature(id) {
  if (S.feats[id]) return S.feats[id];
  const f = await getJSON('features/' + id + '.json');
  S.feats[id] = f; return f;
}
async function loadHist(appid) {
  if (!appid) return null;
  if (S.hist[appid]) return S.hist[appid];
  try { S.hist[appid] = await getJSON('hist/' + appid + '.json'); } catch (e) { S.hist[appid] = null; }
  return S.hist[appid];
}
const liveOf = (steam) => (steam && S.live && S.live.apps) ? S.live.apps[String(steam)] || null : null;

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
