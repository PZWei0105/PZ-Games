/* 解包 — 大特賣倒數＋免費補給站。
   data/events.json：官方公布的 Steam 大特賣、新品節、TGA（日期照官方；時間照 Steam 慣例的太平洋時間上午 10 點）。
   data/free.json：Epic、Steam、GOG 現在限時免費領的遊戲（GitHub Actions 每小時更新；Epic 還有下週預告）。 */
const DEAL = { cd: 0 };
S.freeGot = LS.get('freeGot', {});     // 領過的（只存在這台裝置）
S.freeSeen = LS.get('freeSeen', {});   // 看過的（分頁上的數字）
const STORE = { epic: ['Epic', 'ep'], steam: ['Steam', 'st'], gog: ['GOG', 'gg'] };

const evList = () => (S.events && S.events.items) || [];
function evState(e, now = Date.now()) { const s = Date.parse(e.start), en = e.end ? Date.parse(e.end) : s + 36e5; return now < s ? 'soon' : now < en ? 'on' : 'past'; }
/* 下一波（或正在進行的）大特賣 */
function nextSale() { return evList().filter((e) => e.kind === 'sale' && evState(e) !== 'past').sort((a, b) => (a.start < b.start ? -1 : 1))[0] || null; }
function cdTxt(ms, sec = true) {
  if (ms <= 0) return '00:00:00';
  const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
  return `${d ? d + ' 天 ' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${sec ? ':' + String(s).padStart(2, '0') : ''}`;
}
function twWhen(iso) { const d = new Date(Date.parse(iso) + 8 * 3600e3); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WK[d.getUTCDay()]}）${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; }
function daysTo(iso) { return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 864e5)); }

/* 判定是「等特價／等史低」的獵物：照 Claude 的目標價全部入手要多少 */
function warChest() {
  const t = huntTargets().filter((x) => x.buy && (x.buy.call === '等特價' || x.buy.call === '等史低') && x.buy.target != null && !x.hit);
  return { n: t.length, sum: t.reduce((a, x) => a + x.buy.target, 0), list: t };
}
/* 買不買卡：等特價的，順便告訴你下一波大特賣還有幾天 */
function saleHint(b) {
  if (!b || (b.call !== '等特價' && b.call !== '等史低')) return '';
  const e = nextSale(); if (!e) return '';
  const st = evState(e);
  return `<div class="bc-sale">${st === 'on' ? `🔥 ${esc(e.name)}進行中，到 ${esc(twWhen(e.end))}：現在正是等的那一波` : `⏳ 下一波大特賣：${esc(e.name)} ${esc(twWhen(e.start))} 開打（還有 ${daysTo(e.start)} 天）`}</div>`;
}
/* 獵價頁：大特賣倒數 */
function saleHtml() {
  const e = nextSale(); if (!e) return '';
  const st = evState(e); const ms = Date.parse(st === 'on' ? e.end : e.start) - Date.now();
  if (st !== 'on' && ms > 7 * 864e5) {   // 還早：一條就好，不擋住雷達
    const wc0 = warChest();
    return `<section class="dl-sale mini"><div class="dl-k">NEXT BIG SALE</div><div class="dl-row"><h3>${esc(e.name)}</h3><b id="dlcd" data-to="${esc(e.start)}">${esc(cdTxt(ms))}</b></div><div class="dl-cd"><span>${esc(twWhen(e.start))} 開打（台灣時間），連 ${Math.round((Date.parse(e.end) - Date.parse(e.start)) / 864e5)} 天${wc0.n ? `・備戰：${wc0.n} 款等特價，照目標價全收約 ${esc(fmtNT(wc0.sum))}` : ''}</span></div><button class="btn sm k dl-war-go" data-go="sale">${ICON.cart}<span>進作戰室：設預算、排清單</span></button></section>`;
  }
  const wc = warChest(); const nx = evList().filter((x) => x.id !== e.id && evState(x) !== 'past' && (x.big || x.kind === 'sale')).sort((a, b) => (a.start < b.start ? -1 : 1)).slice(0, 3);
  return `<section class="dl-sale ${st}"><div class="dl-k">${st === 'on' ? '● 進行中' : 'NEXT BIG SALE'}</div><h3>${esc(e.name)}</h3>
    <div class="dl-cd"><b id="dlcd" data-to="${esc(st === 'on' ? e.end : e.start)}">${esc(cdTxt(ms))}</b><span>${st === 'on' ? `到 ${esc(twWhen(e.end))} 結束` : `${esc(twWhen(e.start))} 開打（台灣時間）`}${e.end && st !== 'on' ? `，連 ${Math.round((Date.parse(e.end) - Date.parse(e.start)) / 864e5)} 天` : ''}</span></div>
    ${wc.n ? `<div class="dl-war"><b>${ICON.target}備戰清單</b><span>${wc.n} 款 Claude 判定「等特價／等史低」：照目標價全收約 <em>${esc(fmtNT(wc.sum))}</em></span></div>` : ''}
    <button class="btn sm y dl-war-go" data-go="sale">${ICON.cart}<span>${st === 'on' ? '進作戰室：今天該下手哪幾款' : '進作戰室：設預算、排清單'}</span></button>
    ${nx.length ? `<div class="dl-next">${nx.map((x) => `<span><b>${esc(mdDay(twDate(Date.parse(x.start))))}</b>${esc(x.name)}</span>`).join('')}</div>` : ''}
    <a class="dl-src" href="${esc((e.src || {}).u || '#')}" target="_blank" rel="noopener noreferrer">日期來源：${esc((e.src || {}).t || '')}</a></section>`;
}
/* 首頁的獵價膠帶：大特賣前 7 天、進行中才提 */
function saleLine() {
  const e = nextSale(); if (!e) return '';
  const st = evState(e); const d = daysTo(e.start);
  if (st !== 'on' && d > 7) return '';
  return st === 'on' ? `${esc(e.name)}進行中（${esc(twWhen(e.end))} 結束）` : `${esc(e.name)}${d <= 1 ? '明天' : ` ${d} 天後`}開打`;
}

/* ---- 免費補給站 ---- */
function freeNow() { const now = new Date().toISOString(); return ((S.free && S.free.items) || []).filter((x) => !x.up && (!x.end || x.end > now) && !x.dlc); }
function freeSoon() { return ((S.free && S.free.items) || []).filter((x) => x.up); }
function freeNewCount() { return freeNow().filter((x) => !S.freeSeen[x.id] && !S.freeGot[x.id]).length; }
function freeCard(x, i) {
  const [sn, sc] = STORE[x.store] || [x.store, ''];
  const left = x.end ? Date.parse(x.end) - Date.now() : null; const got = !!S.freeGot[x.id];
  const info = !x.mystery;      // 神秘遊戲還沒揭曉，沒有東西可看
  return `<article class="fr ${got ? 'got' : ''} ${x.up ? 'up' : ''}" ${info ? `data-act="gameinfo" data-k="free:${esc(x.id)}" role="button"` : ''} style="--i:${i};--rot:${rot(x.id, i, 1.2)}deg">
    <div class="fr-im">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" decoding="async" onerror="imgFail(this)">` : ''}<div class="ph" style="${x.img ? 'display:none' : ''}">FREE</div><span class="fr-st ${sc}">${esc(sn)}</span>${!x.up && !S.freeSeen[x.id] && !got ? '<span class="bnew">NEW</span>' : ''}${info ? '<span class="gi-tag">ⓘ 看介紹</span>' : ''}</div>
    <div class="fr-b"><h4>${x.mystery ? '神秘遊戲（開放時才揭曉）' : esc(x.title)}</h4>
      <div class="fr-p">${x.orig_t || x.orig ? `<s>${esc(x.orig_t || fmtNT(x.orig))}</s>` : ''}<b>${x.up ? '下週免費' : '免費領'}</b></div>
      <div class="fr-t">${x.up ? `${esc(twWhen(x.start))} 開放` : left != null ? `⏱ ${esc(leftTxt(left))}・${esc(twWhen(x.end))} 截止` : '限時，截止時間看商店頁'}</div>
      ${x.rv && x.rv[0] != null ? `<div class="fr-t">Steam 評價 ${x.rv[0]}%（${esc(fmtN(x.rv[1]))} 則）${x.zh === 'tc' ? '・繁中' : x.zh === 'sc' ? '・只有簡中' : ''}</div>` : x.zh === 'tc' ? '<div class="fr-t">有繁中</div>' : ''}
      <div class="btnrow">${x.up ? '' : `<a class="btn sm ${got ? '' : 'y'}" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" data-act="frgo" data-id="${esc(x.id)}">${ICON.gift}<span>${got ? '再看一次' : '去領'}</span></a><button class="btn sm ${got ? 'k' : ''}" data-act="frgot" data-id="${esc(x.id)}">${got ? '✓ 領過了' : '標記領過'}</button>`}</div></div>
    ${got ? '<i class="fr-stamp">GET!</i>' : ''}</article>`;
}
function freeHtml() {
  const now = freeNow(), soon = freeSoon(); if (!now.length && !soon.length) return '';
  const left = now.filter((x) => !S.freeGot[x.id]).length;
  return `<section class="dl-free"><h3 class="tape-h y">${ICON.gift}免費補給站 <small>${now.length ? `${now.length} 款能領${left < now.length ? `・還沒領 ${left}` : ''}` : '下週預告'}</small></h3>
    <p class="sub-note">Epic、Steam、GOG 現在限時免費、領了就永久留在帳號裡的遊戲（不含本來就免費的）。每小時更新。</p>
    <div class="frs">${now.map(freeCard).join('')}${soon.map((x, i) => freeCard(x, now.length + i)).join('')}</div></section>`;
}

function freeSeenAll() { let ch = 0; for (const x of freeNow()) if (!S.freeSeen[x.id]) { S.freeSeen[x.id] = 1; ch = 1; } if (ch) LS.set('freeSeen', S.freeSeen); }

/* 倒數每秒跳 */
function dealsFx() {
  clearInterval(DEAL.cd);
  const el = $('#dlcd'); if (!el) return;
  DEAL.cd = setInterval(() => { if (!el.isConnected) { clearInterval(DEAL.cd); return; } el.textContent = cdTxt(Date.parse(el.dataset.to) - Date.now()); }, 1000);
}
function dealsStop() { clearInterval(DEAL.cd); }
