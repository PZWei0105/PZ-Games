/* 解包 — 資料：目錄、專題、Steam 即時資料（GitHub Actions 每 3 小時更新） */
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
  const [idx, live] = await Promise.all([getJSON('index.json'), getJSON('live.json').catch(() => ({ apps: {} }))]);
  S.index = idx; S.live = live || { apps: {} };
  return idx;
}
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
/* 圖片壞掉時：maxres → hq；再壞就換成塗鴉底 */
function imgFail(img) {
  const s = img.getAttribute('src') || '';
  if (s.includes('/maxresdefault.jpg')) { img.src = s.replace('maxresdefault', 'hqdefault'); return; }
  img.style.display = 'none';
  const ph = img.parentElement && img.parentElement.querySelector('.ph'); if (ph) ph.style.display = 'grid';
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
