/* 解包 — 導覽（2026-11-20 整理）：
   頂端列＝萬用搜尋、VS、點播台、換裝、全部功能；底下六個分頁不變（庫存改名「資料庫」）。
   藏在各頁角落的入口（行情板、出擊日曆、週報、TGA、VS、點播台、免費補給站…）統一收進「全部功能」，
   頂端 ⊞ 打開、首頁最下面也有一份；每格帶著現在的數字（大盤漲跌、倒數、新回覆）。
   第一次打開（或改版後第一次）有一段 30 秒的導覽，全部功能裡可以重看。 */
const TOUR_REV = 1;

function topBarHtml() {
  return `<div class="logo" data-go="home"><b>解包</b><i>UNPACKED</i></div><span class="sp"></span>
    <button class="ib srb" data-act="search" aria-label="萬用搜尋">${ICON.search}</button><button class="ib vsb-top" data-go="vs" aria-label="VS 擂台"><b>VS</b></button><button class="ib askb" data-go="ask" aria-label="點播台">${ICON.radio}<i class="dot hide"></i></button><button class="ib skb" data-act="skinsheet" aria-label="換裝">${ICON.shirt}</button><button class="ib hubb" data-act="hub" aria-label="全部功能">${ICON.grid}</button>`;
}

/* 全部功能：每一格帶現在的狀態 */
function hubTiles() {
  const T = [];
  const nDb = S.db ? S.db.n : 0;
  T.push({ go: 'lib', ic: ICON.box, t: '資料庫', s: nDb ? `${nDb} 款遊戲一起搜` : '全部遊戲一起搜', c: 'y' });
  let st = ''; try { st = stormHubLine(); } catch (e) { /* */ }
  T.push({ go: 'storm', ic: ICON.storm, t: '風暴眼', s: st, c: 'p' });
  try {
    const ix = S.board && S.board.idx;
    T.push({ go: 'board', ic: ICON.chart, t: '行情板', s: ix && ix.d1 != null ? `大盤 ${ix.d1 > 0 ? '▲' : ix.d1 < 0 ? '▼' : ''}${Math.abs(ix.d1).toFixed(1)}%` : 'Steam 線上人數看盤', c: ix && ix.d1 > 0 ? 'up' : ix && ix.d1 < 0 ? 'dn' : 'w' });
  } catch (e) { T.push({ go: 'board', ic: ICON.chart, t: '行情板', s: 'Steam 線上人數看盤', c: 'w' }); }
  let sl = null; try { sl = saleHubLine(); } catch (e) { /* */ }
  if (sl) T.push({ go: 'sale', ic: ICON.cart, t: '特賣作戰室', s: sl.s, c: sl.ph === 'on' ? 'p' : 'y', hot: sl.hot });
  let sh = ''; try { sh = starHubLine(); } catch (e) { /* */ }
  T.push({ go: 'stars', ic: ICON.cons, t: '遊戲星圖', s: sh, c: 'p' });
  T.push({ go: 'recap', ic: ICON.recap, t: '年度回顧', s: `${recapYear()} 解包年鑑・統計到今天`, c: 'y' });
  T.push({ go: 'cal', ic: ICON.cal, t: '出擊日曆', s: hubNextCal(), c: 'w' });
  const wk = (S.weekly && S.weekly.items || [])[0];
  T.push({ go: 'week', ic: ICON.trophy, t: '每週懶人包', s: wk ? `${wk.id.replace(/^\d{4}-W/, 'WEEK ')} 結算` : '每週日晚上結算', c: 'p' });
  try { const ms = Date.parse((S.tgaD && S.tgaD.show) || '2026-12-11T00:30:00Z') - Date.now(); T.push({ go: 'tga', ic: ICON.star, t: 'TGA 預測戰', s: ms > 0 ? `D-${Math.ceil(ms / 864e5)}・跟 Claude 比準` : '開獎了！看比分', c: 'y' }); } catch (e) { /* */ }
  T.push({ go: 'vs', ic: '<b class="hvs">VS</b>', t: 'VS 擂台', s: '兩款上擂台比數據', c: 'p' });
  let unread = 0; try { unread = askUnread(); } catch (e) { /* */ }
  T.push({ go: 'ask', ic: ICON.radio, t: '點播台', s: unread ? `${unread} 則新回覆` : '點播解包・你問我答', c: unread ? 'p' : 'w', hot: unread });
  let fr = 0; try { fr = freeNow().length; } catch (e) { /* */ }
  T.push({ act: 'hubfree', ic: ICON.gift, t: '免費補給站', s: fr ? `${fr} 款限時免費` : 'Epic／Steam／GOG 限免', c: fr ? 'y' : 'w', hot: fr });
  T.push({ go: 'shorts', ic: ICON.shorts, t: '短影音', s: '預告直式滑著看', c: 'w' });
  T.push({ go: 'fan', ic: ICON.mega, t: '粉專作戰台', s: '遊戲狂想曲發文排程', c: 'w' });
  T.push({ act: 'skinsheet', ic: ICON.shirt, t: '換裝', s: `現在：${SKIN_BY[skinId()].name}`, c: 'p' });
  T.push({ act: 'tour', ic: '<b class="hq">?</b>', t: '看導覽', s: '30 秒認識解包', c: 'w' });
  T.push({ act: 'settings', ic: ICON.gear, t: '設定', s: '開場、特效、聲音', c: 'w' });
  return T;
}
function hubNextCal() {
  try {
    const t = todayTW(); const L = (typeof calEvents === 'function' ? calEvents() : []).filter((e) => e.d >= t).sort((a, b) => a.d.localeCompare(b.d));
    const n = L[0]; if (!n) return '上市日、特價截止';
    const dd = dayDiff(t, n.d); return `${dd ? `D-${dd}` : '今天'}・${n.name || ''}`.slice(0, 22);
  } catch (e) { return '上市日、特價截止'; }
}
function hubGrid() {
  return `<div class="hub">${hubTiles().map((x) => `<button class="hubt c-${x.c}${x.hot ? ' hot' : ''}" ${x.go ? `data-go="${x.go}"` : `data-act="${x.act}"`}><span class="hi">${x.ic}</span><b>${esc(x.t)}</b><small>${esc(x.s)}</small></button>`).join('')}</div>`;
}
function hubSheetHtml() {
  const on = (k) => S.settings[k] && !S.muted;
  return `<div class="sh-in hubsh"><div class="sk-h"><b>全部功能</b><i>ALL</i></div>
    <div class="hub-q"><button class="${on('sfx') ? 'on' : ''}" data-act="sfx">${on('sfx') ? ICON.can : ICON.canoff}<span>音效</span><em>${on('sfx') ? '開' : '關'}</em></button>
      <button class="${on('bgm') ? 'on' : ''}" data-act="bgm">${ICON.boom}<span>配樂</span><em>${on('bgm') ? '開' : '關'}</em></button>
      <button class="${S.settings.fx === 'full' ? 'on' : ''}" data-act="hubfx">${ICON.star}<span>特效</span><em>${S.settings.fx === 'full' ? '全開' : '收斂'}</em></button>
      <button class="on" data-act="skinsheet">${ICON.shirt}<span>換裝</span><em>${esc(SKIN_BY[skinId()].name)}</em></button></div>
    ${hubGrid()}</div>`;
}
function openHub() { openSheet(hubSheetHtml()); }
function hubSync() { const h = $('#sheet.on .hubsh'); if (h) h.parentElement.innerHTML = `<button class="ib sclose" data-act="close" aria-label="關閉">${ICON.x}</button>` + hubSheetHtml(); }

/* ---- 第一次導覽：一個一個框出來講（點哪都可以下一步） ---- */
const TOUR = [
  { el: '#tabs', t: '底下六個分頁', d: '今日的專題、風暴眼（現在最熱的那一款，全部消息都在這）、Claude 推坑、短影音、獵價、粉專作戰台。資料庫在右上角的放大鏡。' },
  { el: '[data-act="search"]', t: '萬用搜尋', d: 'App 裡出現過的每一款遊戲（專題、推坑、願望單、百大、限免、TGA…）一起搜，中英文都行。搜不到就「加進資料庫」，一小時內補上情報卡。' },
  { el: '[data-act="hub"]', t: '全部功能', d: '行情板、出擊日曆、每週懶人包、TGA 預測戰、VS 擂台、點播台、免費補給站都在這裡，還有音效、配樂開關。' },
  { el: '[data-act="skinsheet"]', t: '換裝', d: '一按整套換：畫面、字型、音效、配樂、開場全部換，內容不變。塗鴉街頭、像素掌機、霓虹賽博、紙本雜誌四套。' },
  { el: '.askb', t: '點播台', d: '想看哪一款的完整解包、有遊戲問題想問，丟這裡，排程的編輯會回答。' },
];
let TOURI = -1;
function tourStart(force) {
  if (!force && (+LS.get('tourDone', 0) || 0) >= TOUR_REV) return;
  if ($('#tour')) return;
  TOURI = -1; const w = document.createElement('div'); w.id = 'tour';
  w.innerHTML = '<div class="tr-hole"></div><div class="tr-card"><div class="tr-n"></div><b></b><p></p><div class="tr-b"><button class="tr-skip" data-tour="skip">跳過</button><button class="btn y sm" data-tour="next">下一步</button></div></div>';
  document.body.appendChild(w);
  w.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); const b = e.target.closest('[data-tour]'); if (b && b.dataset.tour === 'skip') tourEnd(); else tourNext(); });
  tourNext();
}
function tourNext() {
  const w = $('#tour'); if (!w) return;
  TOURI++;
  while (TOURI < TOUR.length && !$(TOUR[TOURI].el)) TOURI++;
  if (TOURI >= TOUR.length) { tourEnd(true); return; }
  const st = TOUR[TOURI], el = $(st.el), r = el.getBoundingClientRect(), pad = 6;
  const hole = $('.tr-hole', w), card = $('.tr-card', w);
  Object.assign(hole.style, { left: (r.left - pad) + 'px', top: (r.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
  $('.tr-n', w).textContent = `${TOURI + 1} / ${TOUR.length}`; $('b', card).textContent = st.t; $('p', card).textContent = st.d;
  $('[data-tour="next"]', w).textContent = TOURI === TOUR.length - 1 ? '開始逛！' : '下一步';
  const below = r.top < innerHeight / 2; const cw = Math.min(340, innerWidth - 24);
  card.style.width = cw + 'px'; card.style.left = Math.max(12, Math.min(innerWidth - cw - 12, r.left + r.width / 2 - cw / 2)) + 'px';
  card.style.top = below ? (r.bottom + 16) + 'px' : ''; card.style.bottom = below ? '' : (innerHeight - r.top + 16) + 'px';
  card.classList.remove('go'); void card.offsetWidth; card.classList.add('go');
  sfx.pop(); haptic(10);
}
function tourEnd(done) {
  const w = $('#tour'); if (w) w.remove();
  LS.set('tourDone', TOUR_REV); if (done) { sfx.stamp(); toast('導覽完成！想再看一次：全部功能 →「看導覽」'); }
}
