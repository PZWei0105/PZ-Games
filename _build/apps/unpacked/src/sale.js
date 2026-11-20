/* 解包 — 大特賣作戰室（2026-11-20，先為 Steam 冬季特賣 12/18 做）
   備戰（開打前）：設預算、從獵物（Steam 願望單＋App 裡標「想玩」的）勾要買的，每款看目標價——Claude 願望單解包定的優先，
   沒有就用自己定的；追蹤以來的最低價當參考。
   開打：「今天該下手」每天照現在的價格挑：到了目標價、追蹤以來最低、快結束、送的，勾了要買的排前面；買了按「買了」記下實付。
   戰果：花了多少、比原價省多少、收了幾款，一鍵做成遊戲狂想曲的戰果圖卡（1080×1350，不放痞子葳的名字）。
   資料只在這台裝置（localStorage `sale`，照每一場特賣分開記）。價格是 live.py 每小時抓的 Steam 台灣區價格。 */
const SALE = { cd: 0, edit: '' };
S.saleSt = LS.get('sale', {});

/* 現在要看哪一場：進行中的 > 剛結束 14 天內、有戰果的 > 下一場 */
function saleFocus() {
  const now = Date.now(); const L = evList().filter((e) => e.kind === 'sale');
  const on = L.find((e) => evState(e, now) === 'on'); if (on) return on;
  const past = L.filter((e) => evState(e, now) === 'past' && now - Date.parse(e.end || e.start) < 14 * 864e5 && Object.keys(saleSt(e).got || {}).length)
    .sort((a, b) => (a.end < b.end ? 1 : -1))[0];
  return past || nextSale();
}
function saleSt(e) { const k = e ? e.id : '_'; if (!S.saleSt[k]) S.saleSt[k] = { b: null, pick: {}, my: {}, got: {} }; return S.saleSt[k]; }
const saleSave = () => LS.set('sale', S.saleSt);
function salePhase(e) { const st = evState(e); return st === 'on' ? 'on' : st === 'past' ? 'post' : 'prep'; }

/* 每一款的目標價：Claude 定的 > 自己定的；參考：追蹤以來最低 */
function saleTarget(t, st) {
  if (t.buy && t.buy.target != null && t.buy.call !== '別買') return { v: t.buy.target, by: 'claude', call: t.buy.call };
  if (st.my[t.key] != null) return { v: st.my[t.key], by: 'me' };
  return null;
}
function saleRows(e) {
  const st = saleSt(e); let L = [];
  try { L = huntTargets(); } catch (x) { L = []; }
  return L.map((t) => {
    const tg = saleTarget(t, st); const got = st.got[t.key];
    const atTarget = !!(tg && t.final != null && t.final <= tg.v);
    const r = Object.assign({}, t, { tg, got, pick: !!st.pick[t.key], atTarget });
    // 今天值不值得下手：送的、到價、史低、快結束（48 小時內）
    r.why = t.giveaway ? '限時送' : atTarget ? '到了目標價' : t.lowState === 'low' ? '追蹤以來最低' : t.lowState === 'near' ? '接近最低價' : t.onSale && t.endMs != null && t.endMs < 48 * 36e5 ? '特價快結束' : '';
    r.go = !got && t.onSale && !!r.why;
    r.rank = (r.pick ? 1000 : 0) + (r.go ? 500 : 0) + (t.score || 0);
    return r;
  }).sort((a, b) => b.rank - a.rank);
}
/* 預計要花：勾了的、還沒買的，照「現在特價就用現價、不然用目標價、都沒有用原價」估 */
function saleBudget(e, rows) {
  const st = saleSt(e); rows = rows || saleRows(e);
  const spent = Object.values(st.got).reduce((a, g) => a + (g.p || 0), 0);
  const plan = rows.filter((r) => r.pick && !r.got && !r.free).reduce((a, r) => a + (r.onSale ? r.final : r.tg ? r.tg.v : (r.orig || r.final || 0)), 0);
  return { b: st.b, spent, plan, left: st.b != null ? st.b - spent - plan : null };
}
function saleLoot(e) {
  const g = Object.values(saleSt(e).got);
  const paid = g.reduce((a, x) => a + (x.p || 0), 0), orig = g.reduce((a, x) => a + (x.o || x.p || 0), 0);
  return { n: g.length, paid, orig, saved: Math.max(0, orig - paid), pct: orig ? Math.round((1 - paid / orig) * 100) : 0, list: g.sort((a, b) => (b.o - b.p) - (a.o - a.p)) };
}

function renderSale() {
  const e = saleFocus();
  if (!e) return `<div class="sec-h"><h2 class="spray-h y">特賣作戰室</h2></div><div class="empty">活動表裡還沒有下一場 Steam 大特賣，官方一公布寫稿排程就會補上。</div>`;
  const ph = salePhase(e); const st = saleSt(e); const rows = saleRows(e); const bud = saleBudget(e, rows); const loot = saleLoot(e);
  const ms = Date.parse(ph === 'on' ? e.end : e.start) - Date.now();
  const days = Math.round((Date.parse(e.end) - Date.parse(e.start)) / 864e5);
  const today = rows.filter((r) => r.go);
  const hero = `<section class="sw-hero ph-${ph}"><div class="sw-k">${ph === 'on' ? '● 開打中' : ph === 'post' ? 'GAME OVER' : 'NEXT BIG SALE'}・作戰室</div>
    <h2>${esc(e.name)}</h2>
    ${ph === 'post' ? `<div class="sw-cd"><b>結束了</b><span>${esc(twWhen(e.start))} ～ ${esc(twWhen(e.end))}</span></div>` : `<div class="sw-cd"><b id="swcd" data-to="${esc(ph === 'on' ? e.end : e.start)}">${esc(cdTxt(ms))}</b><span>${ph === 'on' ? `到 ${esc(twWhen(e.end))} 結束（台灣時間）` : `${esc(twWhen(e.start))} 開打（台灣時間），連 ${days} 天`}</span></div>`}
    <div class="sw-ph"><i class="${ph === 'prep' ? 'on' : 'done'}">1 備戰</i><i class="${ph === 'on' ? 'on' : ph === 'post' ? 'done' : ''}">2 開打</i><i class="${ph === 'post' ? 'on' : ''}">3 戰果</i></div></section>`;
  const pct = (v) => bud.b ? Math.max(0, Math.min(100, v / bud.b * 100)) : 0;
  const budget = `<section class="sw-bud"><div class="sw-bh"><b>預算</b>${bud.b != null ? `<em class="${bud.left < 0 ? 'over' : ''}">${bud.left < 0 ? `超支 ${esc(fmtNT(-bud.left))}` : `還剩 ${esc(fmtNT(bud.left))}`}</em>` : '<em>還沒設</em>'}</div>
    <div class="sw-bin"><button data-act="swb" data-d="-50000" aria-label="少 500">−</button><b>${bud.b != null ? esc(fmtNT(bud.b)) : '沒設'}</b><button data-act="swb" data-d="50000" aria-label="多 500">＋</button>
      ${[100000, 200000, 300000, 500000].map((v) => `<button class="sw-bq${bud.b === v ? ' on' : ''}" data-act="swbq" data-v="${v}">${v / 100}</button>`).join('')}<button class="sw-bq" data-act="swbset">自己打</button></div>
    ${bud.b ? `<div class="sw-bar"><i class="g" style="width:${pct(bud.spent)}%"></i><i class="p" style="width:${pct(bud.plan)}%"></i></div>` : ''}
    <div class="sw-bl"><span><i class="g"></i>已經買 ${esc(fmtNT(bud.spent))}</span><span><i class="p"></i>勾了還沒買 ${esc(fmtNT(bud.plan))}</span></div></section>`;
  const todayHtml = ph === 'on'
    ? `<h3 class="tape-h">今天該下手 <small>${today.length ? `${today.length} 款` : '今天沒有'}</small></h3>${today.length ? `<div class="sw-today">${today.slice(0, 8).map((r, i) => saleCard(r, i)).join('')}</div>` : '<div class="empty">今天清單裡沒有到價、最低價或快結束的。特價每小時更新，晚點再來看。</div>'}`
    : ph === 'prep' ? `<div class="sw-tip"><b>開打後這裡每天告訴你該下手哪幾款</b><span>到了目標價、追蹤以來最低、48 小時內就結束、限時送的，勾了「要買」的排最前面。現在先設預算、把清單勾好。</span></div>` : '';
  const list = rows.filter((r) => !r.got);
  const listHtml = `<h3 class="tape-h">購物清單 <small>${list.length} 款・勾了 ${list.filter((r) => r.pick).length} 款</small></h3>
    <p class="sw-note">清單＝Steam 願望單＋App 裡標「想玩」的。目標價：有 Claude 願望單解包的用 Claude 定的，沒有的可以自己定；「最低」是這個 App 追蹤以來的最低價。</p>
    ${list.length ? `<div class="sw-list">${list.map((r, i) => saleRow(r, i, ph)).join('')}</div>` : '<div class="empty">還沒有獵物：到 Steam 願望單加幾款，或在專題、推坑按「想玩」。</div>'}`;
  const lootHtml = loot.n ? `<h3 class="tape-h p">戰果</h3><section class="sw-loot"><div class="sw-lt"><div><small>收了</small><b>${loot.n}</b><i>款</i></div><div><small>花了</small><b>${esc(fmtNT(loot.paid).replace('NT$', ''))}</b><i>NT$</i></div><div class="big"><small>比原價省</small><b>${esc(fmtNT(loot.saved).replace('NT$', ''))}</b><i>NT$・-${loot.pct}%</i></div></div>
    <div class="sw-ll">${loot.list.map((g) => `<div class="sw-li"><span class="sw-lim">${g.img ? `<img src="${esc(g.img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span><b>${esc(g.name)}</b><em>${esc(fmtNT(g.p))}</em>${g.o > g.p ? `<s>${esc(fmtNT(g.o))}</s>` : ''}<button data-act="swgot" data-k="${esc(g.key)}" title="記錯了，取消">↩</button></div>`).join('')}</div>
    <div class="btnrow"><button class="btn y" data-act="swcard">${ICON.dl}<span>做成戰果圖卡</span></button></div><div id="swcardbox"></div></section>` : '';
  return `<div class="sec-h"><h2 class="spray-h y">特賣作戰室</h2><span class="date-stk">WAR ROOM</span></div>${hero}${budget}${todayHtml}${ph === 'post' ? lootHtml + listHtml : listHtml + lootHtml}`;
}
function saleStatus(r) {
  if (r.free) return ['free', '免費'];
  if (r.soon) return ['soon', r.relDays != null ? `${r.relDays} 天後上市` : '未上市'];
  if (r.giveaway) return ['hit', '限時送'];
  if (r.atTarget) return ['hit', '到價'];
  if (r.lowState === 'low') return ['low', '最低價'];
  if (r.onSale && r.tg) return ['wait', `差 ${fmtNT(r.final - r.tg.v)}`];
  if (r.onSale) return ['sale', `-${r.disc}%`];
  return ['idle', '還沒打折'];
}
function saleRow(r, i, ph) {
  const [sc, stx] = saleStatus(r);
  const tg = r.tg ? `<span class="sw-tg ${r.tg.by}"><small>${r.tg.by === 'claude' ? `Claude・${esc(r.tg.call || '')}` : '我的目標'}</small>${esc(fmtNT(r.tg.v))}</span>` : `<span class="sw-tg none"><small>目標價</small>${r.queue ? `解包排隊 #${r.queue}` : '還沒定'}</span>`;
  const editing = SALE.edit === r.key;
  return `<div class="sw-row${r.pick ? ' pk' : ''}" style="--i:${Math.min(i, 14)}">
    <button class="sw-pick${r.pick ? ' on' : ''}" data-act="swpick" data-k="${esc(r.key)}" aria-label="要買">${r.pick ? '✓' : ''}</button>
    <button class="sw-im" data-act="hinfo" data-k="${esc(r.key)}">${r.cap ? `<img src="${esc(r.cap)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</button>
    <div class="sw-b"><b data-act="hinfo" data-k="${esc(r.key)}">${esc(r.name)}</b>
      <div class="sw-p">${r.free ? '<em>免費</em>' : r.final != null ? `<em class="${r.onSale ? 'sale' : ''}">${esc(fmtNT(r.final))}</em>${r.onSale ? `<s>${esc(fmtNT(r.orig))}</s><i>-${r.disc}%</i>` : ''}` : '<em>—</em>'}${r.low != null && r.trackDays >= 1 ? `<small>最低 ${esc(fmtNT(r.low))}</small>` : ''}</div>
      <div class="sw-t">${tg}${r.tg && r.tg.by === 'claude' ? '' : editing ? `<span class="sw-edit"><input id="swmy" type="number" inputmode="numeric" placeholder="NT$" value="${r.tg ? Math.round(r.tg.v / 100) : ''}"><button data-act="swmyok" data-k="${esc(r.key)}">好</button></span>` : `<button class="sw-e" data-act="swmy" data-k="${esc(r.key)}">${r.tg ? '改' : '自己定'}</button>`}</div></div>
    <div class="sw-r"><span class="sw-st ${sc}">${esc(stx)}</span>${ph !== 'prep' && !r.free && r.onSale ? `<button class="btn sm ${r.atTarget || r.giveaway ? 'y' : ''}" data-act="swbuy" data-k="${esc(r.key)}">買了</button>` : ''}</div></div>`;
}
function saleCard(r, i) {
  return `<div class="sw-card" style="--i:${i}"><div class="sw-ci" data-act="hinfo" data-k="${esc(r.key)}">${r.cap ? `<img src="${esc(r.cap)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span class="sw-why">${esc(r.why)}</span></div>
    <b>${esc(r.name)}</b><div class="sw-p"><em class="sale">${esc(fmtNT(r.final))}</em><s>${esc(fmtNT(r.orig))}</s><i>-${r.disc}%</i></div>
    <small>${r.tg ? `目標 ${esc(fmtNT(r.tg.v))}・` : ''}${r.endMs != null ? `特價${esc(leftTxt(r.endMs))}` : ''}</small>
    <div class="sw-cb"><button class="btn sm y" data-act="swbuy" data-k="${esc(r.key)}">買了</button>${r.appid ? `<a class="btn sm" href="https://store.steampowered.com/app/${r.appid}/" target="_blank" rel="noopener">Steam</a>` : ''}</div></div>`;
}

function saleFx() {
  clearInterval(SALE.cd);
  const el = $('#swcd'); if (!el) return;
  SALE.cd = setInterval(() => { const b = $('#swcd'); if (!b) { clearInterval(SALE.cd); return; } const ms = Date.parse(b.dataset.to) - Date.now(); b.textContent = ms > 0 ? cdTxt(ms) : '開打了！'; }, 1000);
  if (fxOn()) { const h = $('.sw-hero'); if (h) setTimeout(() => { burstAt(h, [YEL, PINK], 18, 9); sfx.slap(); }, 260); }
}
function saleStop() { clearInterval(SALE.cd); }
function saleRerender(keep) { const y = scrollY; VIEW().innerHTML = renderSale(); scrollTo(0, y); if (keep) { const i = $('#swmy'); if (i) i.focus(); } }
function saleAct(a, act) {
  const e = saleFocus(); if (!e) return false; const st = saleSt(e);
  if (a === 'swb') { st.b = Math.max(0, (st.b || 0) + (+act.dataset.d)); saleSave(); sfx.tick(); saleRerender(); return true; }
  if (a === 'swbq') { st.b = +act.dataset.v; saleSave(); sfx.stamp(); saleRerender(); return true; }
  if (a === 'swbset') { const v = prompt('這次特賣的預算（新台幣）', st.b ? String(st.b / 100) : ''); if (v != null) { const n = Math.round(parseFloat(String(v).replace(/[^\d.]/g, '')) || 0); st.b = n > 0 ? n * 100 : null; saleSave(); sfx.stamp(); saleRerender(); } return true; }
  if (a === 'swpick') { const k = act.dataset.k; if (st.pick[k]) delete st.pick[k]; else { st.pick[k] = 1; burstAt(act, [YEL, PINK], 10, 6); } saleSave(); sfx.pop(); saleRerender(); return true; }
  if (a === 'swmy') { SALE.edit = act.dataset.k; sfx.click(); saleRerender(true); return true; }
  if (a === 'swmyok') { const v = ($('#swmy') || {}).value; const n = Math.round(parseFloat(v) || 0); if (n > 0) st.my[act.dataset.k] = n * 100; else delete st.my[act.dataset.k]; SALE.edit = ''; saleSave(); sfx.stamp(); saleRerender(); return true; }
  if (a === 'swbuy') {
    const r = saleRows(e).find((x) => x.key === act.dataset.k); if (!r) return true;
    st.got[r.key] = { key: r.key, name: r.name, img: r.cap, p: r.final || 0, o: r.orig || r.final || 0, at: todayTW() }; delete st.pick[r.key]; saleSave();
    sfx.coin(); haptic(20); burstAt(act, [YEL, PINK, BLK], 24, 11); toast(r.orig > r.final ? `收進戰果：比原價省 ${fmtNT(r.orig - r.final)}` : '收進戰果'); saleRerender(); return true;
  }
  if (a === 'swgot') { delete st.got[act.dataset.k]; saleSave(); sfx.scratch(); saleRerender(); return true; }
  if (a === 'swcard') { saleCardRender(e); return true; }
  return false;
}

/* ---- 戰果圖卡：遊戲狂想曲的塗鴉樣式（不跟著換裝、不放痞子葳的名字） ---- */
async function drawLootCard(cv, e) {
  const L = saleLoot(e); const W = 1080, H = 1350; cv.width = W; cv.height = H; const c = cv.getContext('2d');
  c.fillStyle = '#FFE600'; c.fillRect(0, 0, W, H); halftone(c, W, H, 'rgba(17,17,17,.10)', 22, 3.4);
  c.fillStyle = '#111'; c.beginPath(); c.moveTo(0, H * 0.55); c.lineTo(W, H * 0.47); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
  c.textBaseline = 'top'; c.fillStyle = '#111'; c.font = `900 40px ${CFONT}`; c.fillText(e.name + '・戰果', 64, 64);
  stepText(c, '省下', 64, 130, 110, '#fff', '#111');
  const big = fmtNT(L.saved); c.font = `400 230px "Bebas Neue",sans-serif`; c.fillStyle = '#FF2E88'; c.fillText(big, 70, 262); c.fillStyle = '#111'; c.fillText(big, 60, 252);
  sticker(c, `收了 ${L.n} 款`, 64, 520, '#fff', '#111', -0.04, 46);
  sticker(c, `花 ${fmtNT(L.paid)}`, 420, 512, '#FF2E88', '#fff', 0.03, 46);
  if (L.pct) sticker(c, `平均 -${L.pct}%`, 760, 524, '#111', '#FFE600', -0.05, 40);
  const grid = L.list.slice(0, 6); const gw = 296, gh = Math.round(gw * 215 / 460), gx = 64, gy = 700;
  for (let i = 0; i < grid.length; i++) {
    const g = grid[i]; const x = gx + (i % 3) * (gw + 32), y = gy + Math.floor(i / 3) * (gh + 92);
    c.save(); c.translate(x + gw / 2, y + gh / 2); c.rotate((i % 2 ? 1 : -1) * 0.025); c.translate(-gw / 2, -gh / 2);
    c.fillStyle = '#FF2E88'; c.fillRect(8, 8, gw, gh); c.fillStyle = '#fff'; c.fillRect(-6, -6, gw + 12, gh + 12);
    const im = await loadImgCors(g.img); if (im) coverDraw(c, im, 0, 0, gw, gh); else { c.fillStyle = '#333'; c.fillRect(0, 0, gw, gh); }
    c.restore();
    c.fillStyle = '#fff'; c.font = `900 26px ${CFONT}`; c.textBaseline = 'top';
    let nm = g.name; while (c.measureText(nm).width > gw && nm.length > 2) nm = nm.slice(0, -2) + '…';
    c.fillText(nm, x, y + gh + 14);
    c.fillStyle = '#FFE600'; c.font = `400 34px "Bebas Neue",sans-serif`; c.fillText(fmtNT(g.p) + (g.o > g.p ? `  -${Math.round((1 - g.p / g.o) * 100)}%` : ''), x, y + gh + 46);
  }
  if (L.list.length > 6) { c.fillStyle = '#fff'; c.font = `900 30px ${CFONT}`; c.fillText(`還有 ${L.list.length - 6} 款…`, 64, 1240); }
  brandSticker(c, W - 230, H - 110, -0.06);
}
async function saleCardRender(e) {
  const box = $('#swcardbox'); if (!box) return;
  box.innerHTML = '<canvas id="swcv" class="cardcv"></canvas><div class="btnrow" style="justify-content:center"><button class="btn y" data-act="swcdl">' + ICON.dl + '<span>下載</span></button>' + (navigator.share ? '<button class="btn" data-act="swcshare">' + ICON.share + '<span>分享</span></button>' : '') + '</div>';
  sfx.hiss(0.6); await drawLootCard($('#swcv'), e); sfx.stamp(); box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function saleCardOut(share) {
  const cv = $('#swcv'); if (!cv) return;
  const b = await new Promise((res) => { try { cv.toBlob(res, 'image/png'); } catch (e) { res(null); } });
  if (!b) { toast('圖卡裡有圖片不能匯出，換張網路好一點的時候再試', 'warn'); return; }
  const f = new File([b], 'rhapsody-sale-loot.png', { type: 'image/png' });
  if (share && navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: '遊戲狂想曲' }); sfx.ding(); } catch (e) { /* 取消 */ } return; }
  const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000); sfx.ding();
}

/* 全部功能、首頁、獵價頁用：一句話的狀態 */
function saleHubLine() {
  const e = saleFocus(); if (!e) return null;
  const ph = salePhase(e); const st = saleSt(e);
  if (ph === 'post') { const L = saleLoot(e); return { e, ph, s: `戰果：省下 ${fmtNT(L.saved)}` }; }
  if (ph === 'on') { const n = saleRows(e).filter((r) => r.go).length; return { e, ph, s: n ? `開打中・今天 ${n} 款該下手` : '開打中・今天沒有該下手的', hot: n }; }
  const d = daysTo(e.start); if (d > 45) return null;
  const np = Object.keys(st.pick).length;
  return { e, ph, s: `D-${d}・${st.b != null ? `預算 ${fmtNT(st.b)}` : '預算還沒設'}${np ? `・勾了 ${np} 款` : ''}` };
}
function saleBanner() {
  const h = saleHubLine(); if (!h || (h.ph === 'prep' && daysTo(h.e.start) > 7)) return '';
  return `<div class="sw-ban ph-${h.ph}" data-go="sale"><span class="sw-bk">${h.ph === 'on' ? '● SALE' : h.ph === 'post' ? 'LOOT' : 'D-' + daysTo(h.e.start)}</span><div><b>${esc(h.e.name)}作戰室</b><small>${esc(h.s)}</small></div><i>→</i></div>`;
}
