/* 解包 — 行情板：Steam 線上人數前百名（data/board.json，GitHub Actions 每小時更新）。
   用看盤的方式看遊戲人氣：大盤（百大總線上）、漲跌家數、題材熱度、每一款的 24 小時漲跌與七天走勢。
   台股習慣：紅漲綠跌。漲跌比的是 24 小時前同一時間的線上人數；「爆量」＝比 24 小時前多 40% 以上（至少 3,000 人）。 */
const MK = { f: 'all', sort: 'n', tag: '', bellDay: LS.get('mkBell', '') };
const MK_F = { surge: '爆量', new: '新進榜', ath: '創新高', crash: '急跌', jump: '排名飆升' };

const bd = () => (S.board && S.board.rows && S.board.rows.length ? S.board : null);
function mkPct(v, d = 1) { return v == null ? '—' : (v > 0 ? '▲' : v < 0 ? '▼' : '') + Math.abs(v).toFixed(d) + '%'; }
function mkCls(v) { return v == null ? 'eq' : v > 0.05 ? 'up' : v < -0.05 ? 'dn' : 'eq'; }
function mkNum(n) {
  if (n == null) return '—';
  if (n >= 1e6) return (n / 10000).toFixed(0) + '萬';
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '萬';
  return Number(n).toLocaleString('zh-TW');
}
/* 解包過、推坑過的用 App 裡的台灣中文名 */
function mkName(r) { const x = r.cov && wkRef(r.cov); return x ? x.it.zh : r.nm; }
function mkHours() { const b = bd(); return b && b.t && b.t.length > 1 ? (b.t[b.t.length - 1] - b.t[0]) / 60 : 0; }

/* 折線：空值跳過；cls 決定顏色 */
function mkPts(vals, w = 100, h = 30, pad = 2) {
  const pts = (vals || []).map((v, i) => [i, v]).filter((p) => p[1] != null);
  if (pts.length < 2) return null;
  const n = vals.length - 1 || 1; const vs = pts.map((p) => p[1]); const lo = Math.min(...vs), hi = Math.max(...vs);
  return pts.map(([i, v]) => [(i / n) * w, h - pad - ((v - lo) / Math.max(1, hi - lo)) * (h - pad * 2)]);
}
function mkSpark(vals, cls, w = 100, h = 30) {
  const p = mkPts(vals, w, h); if (!p) return `<span class="mk-sp none">累積中</span>`;
  const line = p.map((x) => x[0].toFixed(1) + ',' + x[1].toFixed(1)).join(' ');
  return `<svg class="mk-sp ${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polygon class="a" points="${p[0][0].toFixed(1)},${h} ${line} ${p[p.length - 1][0].toFixed(1)},${h}"/><polyline points="${line}"/></svg>`;
}

function mkRows() {
  const b = bd(); if (!b) return [];
  let a = b.rows.filter((r) => !r.adult);
  if (MK.f === 'cov') a = a.filter((r) => r.cov);
  else if (MK.f !== 'all') a = a.filter((r) => (r.f || []).includes(MK.f));
  if (MK.tag) a = a.filter((r) => (r.tags || []).includes(MK.tag));
  const s = MK.sort;
  const key = { n: (r) => -r.n, up: (r) => -(r.d1 ?? -1e9), dn: (r) => (r.d1 ?? 1e9), wk: (r) => -((r.lw && r.rp) ? r.lw - r.rp : -1e9) }[s] || ((r) => -r.n);
  return a.slice().sort((x, y) => key(x) - key(y));
}
function mkRow(r, i) {
  const c = mkCls(r.d1); const wk = r.lw && r.rp ? r.lw - r.rp : null;
  return `<div class="mk-row ${c}" data-act="mkinfo" data-a="${r.a}" style="--i:${Math.min(i, 24)}">
    <div class="mk-r"><b>${r.r}</b>${wk ? `<i class="${wk > 0 ? 'up' : 'dn'}">${wk > 0 ? '↑' : '↓'}${Math.abs(wk)}</i>` : (r.f || []).includes('new') ? '<i class="nw">NEW</i>' : ''}</div>
    <div class="mk-im">${r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy" decoding="async" onerror="imgFail(this)">` : ''}<div class="ph" style="${r.img ? 'display:none' : ''}">STEAM</div></div>
    <div class="mk-b"><h4>${esc(mkName(r))}</h4><div class="mk-m">${(r.f || []).filter((f) => f !== 'new').map((f) => `<i class="mkf f-${f}">${MK_F[f]}</i>`).join('')}${r.cov ? `<i class="mkf f-cov">${r.cov[0] === 'f' ? '解包過' : '推坑過'}</i>` : ''}${r.notw ? '<i class="mkf f-notw">台灣沒上架</i>' : ''}<span>${esc((r.tags || []).slice(0, 2).join('・'))}</span></div></div>
    ${mkSpark(r.sp && r.sp.filter((v) => v != null).length > 2 ? r.sp : r.h, c)}
    <div class="mk-v"><b>${mkNum(r.n)}</b><span class="${c}">${mkPct(r.d1)}</span></div></div>`;
}
/* 大盤：百大總線上＋30 小時走勢＋漲跌家數 */
function mkIndexHtml(b, big) {
  const ix = b.idx || {}; const c = mkCls(ix.d1); const hrs = mkHours();
  const p = mkPts(ix.h, 300, 70, 4);
  const line = p ? p.map((x) => x[0].toFixed(1) + ',' + x[1].toFixed(1)).join(' ') : '';
  const tot = (ix.up || 0) + (ix.dn || 0) + (ix.fl || 0);
  return `<section class="mk-ix ${c} ${big ? 'big' : ''}"><div class="mk-ixh"><span class="mk-k">STEAM 百大</span><span class="mk-live"><i></i>LIVE</span><small>更新於 ${esc(ago(b.at))}</small></div>
    <div class="mk-ixv"><b data-w="${ix.n || 0}">${ix.n >= 10000 ? (ix.n / 10000).toFixed(1) : ix.n || 0}</b><i>${ix.n >= 10000 ? '萬' : ''}</i><span>人正在玩</span></div>
    <div class="mk-ixd ${c}">${ix.d1 != null ? `${mkPct(ix.d1, 2)} <small>比 24 小時前</small>` : `<small>24 小時漲跌累積中（還要 ${Math.max(1, Math.ceil(24 - hrs))} 小時）</small>`}</div>
    ${p ? `<svg class="mk-ixc" viewBox="0 0 300 70" preserveAspectRatio="none"><polygon class="a" points="0,70 ${line} 300,70"/><polyline points="${line}"/></svg><div class="mk-ixl"><span>${Math.round(hrs)} 小時前</span><span>現在</span></div>` : ''}
    ${tot ? `<div class="mk-br"><div class="bar"><i class="u" style="flex:${ix.up}"></i><i class="f" style="flex:${ix.fl}"></i><i class="d" style="flex:${ix.dn}"></i></div><div class="mk-brl"><span class="up">上漲 ${ix.up}</span><span>平盤 ${ix.fl}</span><span class="dn">下跌 ${ix.dn}</span></div></div>` : ''}</section>`;
}
function mkTicker(b) {
  const rows = b.rows.filter((r) => !r.adult);
  const mv = rows.filter((r) => r.d1 != null).sort((x, y) => Math.abs(y.d1) - Math.abs(x.d1)).slice(0, 12);
  const list = (mv.length >= 4 ? mv : rows.slice(0, 12));
  const one = list.map((r) => `<b>${esc(mkName(r))}</b> ${esc(mkNum(r.n))} <em class="${mkCls(r.d1)}">${mkPct(r.d1)}</em>`).join('<i>◆</i>');
  return `<div class="mk-tk"><div class="in">${one}<i>◆</i>${one}<i>◆</i></div></div>`;
}
function mkHeat(b) {
  const tags = b.tags || []; if (!tags.length) return '';
  const tot = (b.idx && b.idx.n) || 1;
  return `<h3 class="tape-h">題材熱度 <small>同一款最多算三個標籤</small></h3><div class="mk-heat">${tags.map((t) => {
    const a = t.d1 == null ? 0 : Math.min(1, Math.abs(t.d1) / 12);
    const bg = t.d1 == null ? '#262626' : t.d1 >= 0 ? `rgba(255,75,75,${(0.2 + a * 0.7).toFixed(2)})` : `rgba(47,227,154,${(0.2 + a * 0.7).toFixed(2)})`;
    return `<button class="mk-ht ${MK.tag === t.t ? 'on' : ''}" data-act="mktag" data-v="${esc(t.t)}" style="flex-grow:${Math.max(1, Math.round(t.n / tot * 100))};background:${bg}"><b>${esc(t.t)}</b><span>${esc(mkNum(t.n))}・${t.k} 款</span><em>${mkPct(t.d1)}</em></button>`;
  }).join('')}</div>`;
}
function renderBoard() {
  const b = bd();
  const head = `<div class="sec-h"><h2 class="spray-h y">行情板</h2><span class="date-stk">STEAM LIVE</span></div>`;
  if (!b) return head + `<div class="empty">行情資料還沒進來：GitHub 每小時抓一次 Steam 線上人數前百名，第一筆進來就會出現在這裡。</div>`;
  const rows = mkRows();
  const cnt = (f) => b.rows.filter((r) => (r.f || []).includes(f)).length;
  const fl = (v, label, n) => `<button class="fl ${MK.f === v ? 'on' : ''}" data-act="mkf" data-v="${v}">${label}${n != null ? ` <b>${n}</b>` : ''}</button>`;
  const so = (v, label) => `<button class="fl ${MK.sort === v ? 'on' : ''}" data-act="mks" data-v="${v}">${label}</button>`;
  const hrs = mkHours();
  return head + `<p class="sub-note">Steam 線上人數前百名，每小時更新。紅漲綠跌，比的是 24 小時前同一時間；爆量＝多 40% 以上。${hrs < 24 ? `<b class="mk-acc">剛開始追蹤 ${Math.max(1, Math.round(hrs))} 小時，漲跌要滿 24 小時才算得出來，排名變化先看 Steam 的上週名次。</b>` : ''}</p>
    ${mkIndexHtml(b, true)}${mkTicker(b)}${mkHeat(b)}
    <div class="filters">${fl('all', '全部')}${fl('surge', '爆量', cnt('surge'))}${fl('new', '新進榜', cnt('new'))}${fl('ath', '創新高', cnt('ath'))}${fl('jump', '排名飆升', cnt('jump'))}${fl('crash', '急跌', cnt('crash'))}${fl('cov', '解包過', b.rows.filter((r) => r.cov).length)}</div>
    ${MK.tag ? `<div class="mk-tagon">題材：<b>${esc(MK.tag)}</b><button class="btn sm" data-act="mktag" data-v="">清除</button></div>` : ''}
    <div class="sortrow">排序 ${so('n', '線上人數')}${so('up', '漲幅')}${so('dn', '跌幅')}${so('wk', '週排名')}</div>
    <div class="mk-list">${rows.map(mkRow).join('') || '<div class="empty">沒有符合的遊戲，換個篩選試試。</div>'}</div>
    <p class="sub-note" style="margin-top:14px">資料：Steam 官方的線上人數（${b.src === 'concurrent' ? '線上人數排行' : '每款遊戲的線上人數'}）。週排名是 Steam 每日高峰排行跟上週比；「創新高」是這個 App 開始追蹤以來的最高（追蹤滿 3 天才算）。</p>`;
}
/* 個股：30 小時走勢、7 天走勢、每日高峰 */
function mkChart(vals, ts, label) {
  const p = mkPts(vals, 300, 90, 6); if (!p) return '';
  const line = p.map((x) => x[0].toFixed(1) + ',' + x[1].toFixed(1)).join(' ');
  const v = vals.filter((x) => x != null); const hi = Math.max(...v), lo = Math.min(...v);
  const hrs = ts && ts.length > 1 ? (ts[ts.length - 1] - ts[0]) / 60 : 0;
  return `<div class="mk-ch"><div class="mk-chh"><b>${esc(label)}</b><span>最高 ${esc(mkNum(hi))}・最低 ${esc(mkNum(lo))}</span></div>
    <svg viewBox="0 0 300 90" preserveAspectRatio="none"><path class="g" d="M0,30H300M0,60H300"/><polygon class="a" points="${p[0][0].toFixed(1)},90 ${line} ${p[p.length - 1][0].toFixed(1)},90"/><polyline points="${line}"/></svg>
    <div class="mk-ixl"><span>${hrs >= 48 ? Math.round(hrs / 24) + ' 天前' : Math.round(hrs) + ' 小時前'}</span><span>現在</span></div></div>`;
}
async function mkInfo(a) {
  const b = bd(); const r = b && b.rows.find((x) => x.a === +a); if (!r) return;
  const nm = mkName(r); const c = mkCls(r.d1); const ref = r.cov && wkRef(r.cov);
  const wk = r.lw && r.rp ? r.lw - r.rp : null;
  const why = r.d1 != null && r.d1 >= 15 ? `為什麼最近玩的人變多？` : r.d1 != null && r.d1 <= -15 ? `為什麼最近玩的人變少？` : `現在值得玩嗎？`;
  openSheet(`<div class="hinfo mk-info"><div class="hi-img">${r.img ? `<img src="${esc(r.img)}" alt="" onerror="imgFail(this)">` : ''}<span class="bn ${c}">${mkPct(r.d1)}</span></div>
    <h3>${esc(nm)}</h3>${nm !== r.nm ? `<div class="ben">${esc(r.nm)}</div>` : ''}
    <div class="chips" style="padding:0;margin-top:8px">${(r.f || []).map((f) => `<span class="chip ${f === 'crash' ? 'n' : 'p'}">${MK_F[f]}</span>`).join('')}${(r.tags || []).map((t) => `<span class="chip n">${esc(t)}</span>`).join('')}${r.zh === 'tc' ? '<span class="chip">繁中</span>' : r.zh === 'sc' ? '<span class="chip n">只有簡中</span>' : ''}</div>
    <div class="mk-st">
      <div><span>現在線上</span><b>${esc(mkNum(r.n))}</b><em class="${c}">${mkPct(r.d1)}</em></div>
      <div><span>24 小時最高</span><b>${esc(mkNum(r.pk))}</b><em>${r.d7 != null ? `7 天 <i class="${mkCls(r.d7)}">${mkPct(r.d7)}</i>` : '7 天累積中'}</em></div>
      <div><span>線上排名</span><b>#${r.r}</b><em>${r.rp ? `每日高峰 #${r.rp}` : ''}${wk ? `・上週 #${r.lw}` : ''}</em></div>
      <div><span>追蹤以來最高</span><b>${r.ath ? esc(mkNum(r.ath[0])) : '—'}</b><em>${r.ath ? esc(mdDay(r.ath[1])) : '追蹤滿 3 天才算'}</em></div>
      <div><span>Steam 評價</span><b>${r.rv && r.rv[0] != null ? r.rv[0] + '%' : '—'}</b><em>${r.rv ? esc(fmtN(r.rv[1])) + ' 則' : ''}</em></div>
      <div><span>台灣售價</span><b>${r.notw ? '沒上架' : r.free ? '免費' : r.p ? esc(fmtNT(r.p[0])) : '—'}</b><em>${r.notw ? 'Steam 台灣區買不到' : r.p && r.p[1] ? '-' + r.p[1] + '% 特價中' : ''}</em></div>
    </div>
    ${mkChart(r.h, b.t, '30 小時線上人數')}${mkChart(r.sp, b.s, '7 天走勢')}<div id="mkdays"></div>
    <div class="btnrow">${ref ? `<button class="btn y" data-go="${esc(ref.route)}">${ref.kind === 'f' ? ICON.page : ICON.gem}<span>${ref.kind === 'f' ? '看解包' : '看推坑'}</span></button>` : `<button class="btn y" data-act="askreq" data-g="${esc(nm)}" data-a="${r.a}">${ICON.radio}<span>點播解包這款</span></button>`}
      <button class="btn p" data-act="askq" data-q="${esc(nm + '：' + why)}" data-ref="${ref ? esc(r.cov) : 'a:' + r.a}" data-ctx="${esc(nm)}">${ICON.radio}<span>問 Claude：${esc(why.replace('？', ''))}</span></button>
      <a class="btn" href="https://store.steampowered.com/app/${r.a}/" target="_blank" rel="noopener noreferrer">${ICON.cart}<span>Steam 商店頁</span></a></div>
    <p class="sub-note" style="margin-top:10px">線上人數來自 Steam 官方，每小時一筆；排程偶爾會晚，24 小時漲跌找前後 90 分鐘內最接近的一筆來比。</p></div>`, 'hsheet');
  sfx.lock();
  const d = await loadBoardD(); const box = $('#mkdays'); if (!box || !d) return;
  const k = String(r.a); const pk = (d.pk || {})[k];
  if (!pk || pk.filter((v) => v != null).length < 2) return;
  const days = d.days || []; const hi = Math.max(...pk.filter((v) => v != null));
  const show = pk.map((v, i) => [days[i], v]).slice(-30);
  box.innerHTML = `<div class="mk-ch"><div class="mk-chh"><b>每日高峰</b><span>最近 ${show.length} 天・最高 ${esc(mkNum(hi))}</span></div><div class="mk-days">${show.map(([dd, v]) => `<i style="height:${v == null ? 0 : Math.max(4, v / hi * 100).toFixed(1)}%" title="${esc(dd + ' ' + (v || ''))}"></i>`).join('')}</div><div class="mk-ixl"><span>${esc(mdDay(show[0][0]))}</span><span>${esc(mdDay(show[show.length - 1][0]))}</span></div></div>`;
}
function boardFx() {
  const w = $('.mk-ixv b[data-w]');
  if (w && fxOn()) {   // 大盤數字從 0 跳上來（萬、一位小數）
    const n = +w.dataset.w, t0 = performance.now(), D = 1100, big = n >= 10000; let last = 0;
    const step = (now) => { const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3); const v = n * e; w.textContent = big ? (v / 10000).toFixed(1) : String(Math.round(v)); if (k < 1) { if (now - last > 90) { last = now; sfx.tick(); } requestAnimationFrame(step); } else sfx.pop(); };
    requestAnimationFrame(step);
  }
  if (!fxOn()) return;
  const today = todayTW();
  if (MK.bellDay !== today) { MK.bellDay = today; LS.set('mkBell', today); setTimeout(() => sfx.bell(), 250); }
  $$('.mk-row').slice(0, 14).forEach((r, i) => setTimeout(() => { if (r.isConnected && i % 3 === 0) sfx.tickUp(!r.classList.contains('dn')); }, 300 + i * 55));
}

/* 首頁：行情小看板 */
function marketStrip() {
  const b = bd(); if (!b) return '';
  const ix = b.idx || {}; const c = mkCls(ix.d1);
  const rows = b.rows.filter((r) => !r.adult);
  const mv = rows.filter((r) => r.d1 != null).sort((x, y) => y.d1 - x.d1);
  const hot = (mv.length >= 3 ? mv.slice(0, 3) : rows.filter((r) => (r.f || []).length).slice(0, 3)).concat(rows).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
  const p = mkPts(ix.h, 120, 36, 3);
  return `<section class="mk-home ${c}" data-go="board"><div class="mkh-l"><span class="mk-k">${ICON.chart}STEAM 行情</span><b>${esc(mkNum(ix.n))}</b><em class="${c}">${ix.d1 != null ? mkPct(ix.d1, 2) : '累積中'}</em><small>百大線上・${esc(ago(b.at))}</small></div>
    ${p ? `<svg class="mkh-c" viewBox="0 0 120 36" preserveAspectRatio="none"><polyline points="${p.map((x) => x[0].toFixed(1) + ',' + x[1].toFixed(1)).join(' ')}"/></svg>` : ''}
    <div class="mkh-r">${hot.map((r) => `<div><b>${esc(mkName(r))}</b><span class="${mkCls(r.d1)}">${r.d1 != null ? mkPct(r.d1) : mkNum(r.n)}</span></div>`).join('')}</div><span class="hs-a">→</span></section>`;
}
