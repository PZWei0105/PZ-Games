/* 解包 — 畫面：今日牆、庫存、專題、粉專出稿台、比較、設定 */
const PLAT_SHORT = (p) => p.replace(/（.*?）/g, '').replace('Xbox Series X|S', 'Xbox').replace('Netflix', 'Netflix');

function chipsFor(it, lv) {
  const out = [];
  const pr = priceLabel(it, lv);
  if (pr) out.push(`<span class="chip y">${esc(pr.length > 14 ? pr.slice(0, 14) + '…' : pr)}</span>`);
  if (lv && lv.price && lv.price.disc > 0) out.push(`<span class="chip p">-${lv.price.disc}%</span>`);
  const z = liveZh(lv, it.zhs);
  const zl = z === 'tc' ? '繁中' : z === 'sc' ? '只有簡中' : z === 'none' ? '無中文' : '中文未知';
  out.push(`<span class="chip ${z === 'tc' ? '' : 'n'}">${zl}</span>`);
  if (lv && lv.players && lv.players.n != null) out.push(`<span class="chip">同上<b>${esc(fmtN(lv.players.n))}</b></span>`);
  if (it.tw === false) out.push('<span class="chip p">台灣未開放</span>');
  out.push(`<span class="chip n">${esc((it.platforms || []).map(PLAT_SHORT).filter((v, i, a) => a.indexOf(v) === i).join('／'))}</span>`);
  return out.join('');
}
function sealHtml(stamp, label, cls = 'seal') {
  return `<div class="${cls} ${STAMP_CLS[stamp] || ''}">${esc(stamp)}${stamp === '推薦' ? '!!' : ''}${label && cls === 'seal' ? `<small>${esc(label)}</small>` : ''}</div>`;
}
function posterHtml(it, i) {
  const lv = liveOf(it.steam);
  const img = heroOf(it, lv);
  const mc = (lv && lv.micro) || {}; const micro = mc.mp4 || mc.webm;
  return `<article class="poster k-${esc(it.kind)}" data-go="f/${esc(it.id)}" data-id="${esc(it.id)}"${micro ? ` data-mp4="${esc(mc.mp4 || '')}" data-webm="${esc(mc.webm || '')}"` : ''} style="--rot:${rot(it.id, i, 1.3)}deg">
    <div class="pimg"><div class="kb">${img ? `<img class="kbi on" src="${esc(img)}" alt="" loading="${i ? 'lazy' : 'eager'}" decoding="async" onerror="imgFail(this)" onload="ytCheck(this)"><img class="kbi" alt="" decoding="async">` : ''}</div><div class="ph" style="${img ? 'display:none' : ''}">UNPACKED</div><div class="ht"></div>${micro ? '<span class="pv-tag">▶ 動態</span>' : ''}</div>
    <span class="kind-stk">${esc(it.kind_label)}</span>
    <div class="pbody"><h3 class="ptitle">${esc(it.zh)}</h3>${it.en && it.en !== it.zh ? `<div class="pen">${esc(it.en)}</div>` : ''}
      <p class="phead">${esc(it.headline)}</p><div class="chips">${chipsFor(it, lv)}</div></div>
    ${sealHtml(it.stamp, it.label)}<i class="tp tp1"></i><i class="tp tp2"></i></article>`;
}
function miniHtml(it, i, cmp = false) {
  const lv = liveOf(it.steam); const img = headerOf(it, lv);
  const mk = S.marks[it.id]; const MK = { want: '想玩', playing: '在玩', done: '玩過', no: '沒興趣' };
  return `<div class="mini" data-go="f/${esc(it.id)}" style="--rot:${rot(it.id, i, 1.2)}deg">
    <div class="pimg">${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async" onerror="imgFail(this)" onload="ytCheck(this)">` : ''}<div class="ph" style="${img ? 'display:none' : ''}">UNPACKED</div>${afterChip('f', it.id)}</div>
    ${mk ? `<span class="mk">${MK[mk]}</span>` : ''}<span class="mstamp ${STAMP_CLS[it.stamp] || ''}">${esc(it.stamp)}</span>
    <div class="mb"><h4>${esc(it.zh)}</h4><div class="md">${esc(it.date.slice(5).replace('-', '.'))} · ${esc(it.kind_label)}</div></div>
    ${cmp ? `<button class="cmpbtn ${S.cmp.includes(it.id) ? 'on' : ''}" data-act="cmp" data-id="${esc(it.id)}" aria-label="加入比較">${S.cmp.includes(it.id) ? '✓' : '+'}</button>` : ''}</div>`;
}

/* ---------- 追蹤牆：從即時資料和專題自動長出便利貼 ---------- */
function watchNotes() {
  const notes = []; const today = todayTW();
  for (const it of S.index.items) {
    const lv = liveOf(it.steam);
    if (it.release && /^\d{4}-\d{2}-\d{2}$/.test(it.release)) {
      const dd = dayDiff(today, it.release);
      if (dd >= 0 && dd <= 30) notes.push({ w: 100 - dd, id: it.id, t: it.zh, v: dd === 0 ? '今天' : dd, unit: dd === 0 ? '' : '天', d: dd === 0 ? '今天上市！' : `倒數 ${dd} 天上市（${mdDay(it.release)}）`, c: 'p' });
    }
    if (!lv) continue;
    const p = lv.players;
    if (p && p.n != null) {
      const d24 = p.d24;
      notes.push({ w: 40 + Math.min(40, Math.abs(d24 || 0)), id: it.id, t: it.zh, v: fmtN(p.n).replace(' 萬', ''), unit: p.n >= 10000 ? '萬人' : '人', d: d24 != null ? `同上 ${d24 >= 0 ? '▲' : '▼'}${Math.abs(d24)}%（比 24 小時前）` : `目前同上人數 · ${ago(p.at)}`, c: '' });
    }
    const pr = lv.price;
    if (pr && pr.disc > 0) notes.push({ w: 70, id: it.id, t: it.zh, v: '-' + pr.disc, unit: '%', d: `特價 ${fmtNT(pr.final)}${pr.low && pr.final <= pr.low.v ? '，追蹤以來最低！' : ''}`, c: 'p' });
    const rv = lv.rv;
    if (rv && rv.recent && rv.pct != null && Math.abs(rv.recent.pct - rv.pct) >= 5) notes.push({ w: 60, id: it.id, t: it.zh, v: rv.recent.pct, unit: '%', d: `近 ${rv.recent.days} 天好評率（整體 ${rv.pct}%）`, c: 'w' });
  }
  notes.push(...afterNotes());
  return notes.sort((a, b) => b.w - a.w).slice(0, 8);
}

/* ---------- 今日牆 ---------- */
function renderHome() {
  const items = S.index.items;
  if (!items.length) return `<div class="empty">還沒有專題。每天清晨會自動解包 2～3 款遊戲，晚點再來看看。</div>`;
  const today = todayTW();
  const lastDate = items[0].date;
  const todays = items.filter((x) => x.date === lastDate).sort((a, b) => a.rank - b.rank);
  const earlier = items.filter((x) => x.date !== lastDate).slice(0, 12);
  const d = new Date(lastDate + 'T00:00:00+08:00');
  const notes = watchNotes();
  return `<div class="sec-h"><h2 class="spray-h">${lastDate === today ? '今日解包' : '最新解包'}</h2>
      <span class="date-stk">${esc(lastDate.slice(5).replace('-', '.'))} ${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]}</span></div>
    ${lastDate !== today ? `<p class="sub-note">今天的專題還在寫，先看 ${mdDay(lastDate)} 這批。</p>` : ''}
    ${weekBanner()}${tgaBanner()}${huntStrip()}
    <div class="posters">${todays.slice(0, 2).map(posterHtml).join('')}${vsStrip(todays)}${todays.slice(2).map((it, i) => posterHtml(it, i + 2)).join('')}</div>
    ${picksTeaser()}
    ${marketStrip()}
    <h3 class="tape-h">追蹤牆</h3>
    ${notes.length ? `<div class="notes">${notes.map((n, i) => `<div class="note ${n.c}" data-go="${esc(n.go || 'f/' + n.id)}" style="--rot:${rot(n.id + n.d, i, 2.4)}deg"><div class="nt">${esc(n.t)}</div><div class="nv">${esc(String(n.v))}<small>${esc(n.unit)}</small></div><div class="nd">${esc(n.d)}</div></div>`).join('')}</div>`
      : '<div class="empty">Steam 即時資料每小時更新一次：同上人數、特價、評價變化和倒數會自動貼在這面牆上。</div>'}
    ${earlier.length ? `<h3 class="tape-h p">之前解包</h3><div class="hscroll">${earlier.map((x, i) => miniHtml(x, i)).join('')}</div>` : ''}
    <h3 class="tape-h">全部功能</h3>${hubGrid()}`;
}
/* 首頁：願望單有特價就貼一條警示膠帶 */
function huntStrip() {
  const sale = huntTargets().filter((t) => t.onSale || t.giveaway || t.hit).sort((a, b) => b.score - a.score);
  const free = freeNow().filter((x) => !S.freeGot[x.id]); const big = saleLine();
  if (!sale.length && !free.length && !big) return '';
  const lows = sale.filter((t) => t.lowState === 'low').length; const hits = sale.filter((t) => t.hit).length; const on = sale.filter((t) => t.onSale || t.giveaway).length;
  const parts = [];
  if (hits) parts.push(`<b>${hits}</b> 款到了 Claude 的目標價`);
  if (on) parts.push(`獵物 <b>${on}</b> 款特價${lows ? `（<b>${lows}</b> 款史低）` : ''}`);
  if (free.length) parts.push(`<b>${free.length}</b> 款限時免費${free.some((x) => !S.freeSeen[x.id]) ? '（有新的）' : ''}`);
  if (big) parts.push(big);
  const names = sale.slice(0, free.length ? 1 : 2).map((t) => `${esc(t.name)} ${t.giveaway ? '免費' : t.hit && !t.onSale ? '到價' : '-' + t.disc + '%'}`).concat(free.slice(0, sale.length ? 1 : 2).map((x) => `${esc(x.mystery ? '神秘遊戲' : x.title)} 免費領`));
  return `<div class="hstrip" data-go="hunt"><span class="hs-k">${ICON.target}獵價</span><span class="hs-t">${parts.join('，')}${names.length ? '：' + names.join('、') + (sale.length + free.length > names.length ? '…' : '') : ''}</span><span class="hs-a">→</span></div>`;
}

function picksTeaser() {
  const items = (S.picks && S.picks.items) || []; if (!items.length) return '';
  const last = items[0].date; const nw = items.filter((x) => x.date === last);
  return `<div class="pk-tease"><h3 class="tape-h y">${last === todayTW() ? '今日推坑' : '最新推坑'} <small>${esc(mdDay(last))}・Claude 私房推薦</small></h3>
    <div class="hscroll">${nw.map(pickMini).join('')}<div class="mini pkm more" data-go="picks"><div class="mm">${ICON.gem}<b>整面推坑牆</b><span>${items.length} 款</span></div></div></div></div>`;
}

/* ---------- 庫存 ---------- */
const LIBF = { q: '', stamp: '', genre: '', plat: '', zh: '', money: '', mark: '', sort: 'new' };
function renderLib() {
  const items = S.index.items;
  const genres = [...new Set(items.flatMap((x) => x.genres || []))].slice(0, 14);
  const plats = [...new Set(items.flatMap((x) => (x.platforms || []).map(PLAT_SHORT)))];
  const fl = (k, v, label) => `<button class="fl ${LIBF[k] === v ? 'on' : ''}" data-act="lf" data-k="${k}" data-v="${esc(v)}">${esc(label || v)}</button>`;
  return `<div class="sec-h"><h2 class="spray-h y">資料庫</h2><span class="date-stk">${items.length} 篇專題</span></div>
    <div class="db-seg"><button data-act="dbmode" data-v="all">全部遊戲 <b>${S.db ? S.db.n : ''}</b></button><button class="on" data-act="dbmode" data-v="feat">解包專題 <b>${items.length}</b></button></div>
    <label class="search">${ICON.search}<input id="libq" type="search" placeholder="搜尋遊戲、類型、工作室…" value="${esc(LIBF.q)}" autocomplete="off"></label>
    <div class="fgroup">結論</div><div class="filters">${fl('stamp', '', '全部')}${['推薦', '觀望', '不推薦'].map((s) => fl('stamp', s)).join('')}</div>
    <div class="fgroup">平台</div><div class="filters">${fl('plat', '', '全部')}${plats.map((p) => fl('plat', p)).join('')}</div>
    <div class="fgroup">類型</div><div class="filters">${fl('genre', '', '全部')}${genres.map((g) => fl('genre', g)).join('')}</div>
    <div class="fgroup">中文／課金／我的標記</div><div class="filters">${fl('zh', '', '不限中文')}${fl('zh', 'tc', '有繁中')}${fl('money', '', '不限課金')}${fl('money', 'clean', '無內購或只賣選購')}${fl('mark', '', '不限')}${fl('mark', 'want', '想玩')}${fl('mark', 'playing', '在玩')}${fl('mark', 'done', '玩過')}</div>
    <div class="sortrow">排序 ${fl('sort', 'new', '最新')}${fl('sort', 'go', '推薦優先')}${fl('sort', 'hot', '同上人數')}</div>
    ${libGridHtml()}`;
}
/* 清單很長時一次只畫一批（庫存 48 張、推坑牆 24 張），捲到快底就接著畫下一批；回到這一頁照上次畫到的數量畫，捲動位置才回得去 */
const MORE_STEP = { lib: 48, pk: 24, fan: 40 };
const MORE_N = { lib: 48, pk: 24, fan: 40 };
const moreS = (key, n, total) => (n < total ? `<div class="more-s" data-more="${key}"></div>` : '');
function libGridHtml(reset) {
  if (reset) MORE_N.lib = MORE_STEP.lib;
  const list = libItems(); const n = Math.min(list.length, MORE_N.lib);
  return `<div class="grid" id="libgrid">${list.slice(0, n).map((x, i) => miniHtml(x, i, true)).join('') || '<div class="empty">沒有符合的遊戲，換個篩選試試。</div>'}</div>${moreS('lib', n, list.length)}`;
}
function libMore() {
  const g = $('#libgrid'); if (!g) return false;
  const list = libItems(); const n0 = g.querySelectorAll('.mini').length; const n1 = Math.min(list.length, n0 + MORE_STEP.lib);
  if (n1 > n0) g.insertAdjacentHTML('beforeend', list.slice(n0, n1).map((x, i) => miniHtml(x, n0 + i, true)).join(''));
  MORE_N.lib = Math.max(MORE_STEP.lib, n1);
  if (n1 >= list.length) { const s = $('.more-s[data-more="lib"]'); if (s) s.remove(); }
  return n1 > n0;
}
function pkMore() {
  const g = $('.pks'); if (!g) return false;
  const list = picksItems(); const n0 = g.querySelectorAll('.pk').length; const n1 = Math.min(list.length, n0 + MORE_STEP.pk);
  if (n1 > n0) {
    g.insertAdjacentHTML('beforeend', list.slice(n0, n1).map((x, i) => pickCard(x, n0 + i)).join(''));
    if (typeof PIO !== 'undefined' && PIO) [...g.querySelectorAll('.pk')].slice(n0).forEach((el) => PIO.observe(el));
  }
  MORE_N.pk = Math.max(MORE_STEP.pk, n1);
  if (n1 >= list.length) { const s = $('.more-s[data-more="pk"]'); if (s) s.remove(); }
  return n1 > n0;
}
function libItems() {
  const q = LIBF.q.trim().toLowerCase();
  let a = S.index.items.filter((x) => {
    if (LIBF.stamp && x.stamp !== LIBF.stamp) return false;
    if (LIBF.genre && !(x.genres || []).includes(LIBF.genre)) return false;
    if (LIBF.plat && !(x.platforms || []).map(PLAT_SHORT).includes(LIBF.plat)) return false;
    if (LIBF.zh === 'tc' && liveZh(liveOf(x.steam), x.zhs) !== 'tc') return false;
    if (LIBF.money === 'clean' && !(x.money === 0 || x.money === 1)) return false;
    if (LIBF.mark && S.marks[x.id] !== LIBF.mark) return false;
    if (q) { const hay = [x.zh, x.en, x.headline, ...(x.genres || []), ...(x.platforms || []), x.kind_label].join(' ').toLowerCase(); if (!hay.includes(q)) return false; }
    return true;
  });
  if (LIBF.sort === 'go') { const o = { '推薦': 0, '觀望': 1, '不推薦': 2 }; a = a.slice().sort((p, q2) => (o[p.stamp] - o[q2.stamp]) || (p.date < q2.date ? 1 : -1)); }
  if (LIBF.sort === 'hot') a = a.slice().sort((p, q2) => (((liveOf(q2.steam) || {}).players || {}).n || 0) - (((liveOf(p.steam) || {}).players || {}).n || 0));
  return a;
}
function trayHtml() {
  const names = S.cmp.map((id) => (S.index.items.find((x) => x.id === id) || {}).zh).filter(Boolean);
  return `<div class="tl">比較：${esc(names.join('、') || '最多 3 款')}</div><button class="btn sm y" data-act="cmpgo" ${names.length < 2 ? 'disabled style="opacity:.5"' : ''}>開始比較</button><button class="btn sm" data-act="cmpclear">清空</button>`;
}

/* ---------- 專題頁 ---------- */
function sparkSvg(rows, days = 7) {
  if (!rows || rows.length < 2) return '';
  const tmax = rows[rows.length - 1][0], tmin = tmax - days * 1440;
  const r = rows.filter((x) => x[0] >= tmin); if (r.length < 2) return '';
  const vs = r.map((x) => x[1]); const lo = Math.min(...vs), hi = Math.max(...vs) || 1;
  const pts = r.map((x) => [((x[0] - r[0][0]) / Math.max(1, tmax - r[0][0])) * 100, 40 - ((x[1] - lo) / Math.max(1, hi - lo)) * 36 - 2]);
  const line = pts.map((p) => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' ');
  return `<svg class="spark" viewBox="0 0 100 42" preserveAspectRatio="none"><polygon class="area" points="0,42 ${line} 100,42"/><polyline pathLength="100" points="${line}"/></svg>`;
}
function liveHtml(f, lv, h) {
  if (!f.game.steam) return '';
  if (!lv) return `<div class="live"><div class="lh"><span>STEAM 即時數據</span><small>資料管線每小時更新</small></div><div class="empty" style="padding:6px 2px">這款剛加入追蹤，台灣區價格、同上人數、評價會在下一輪更新後出現。</div></div>`;
  const pr = lv.price || {}, rv = lv.rv || {}, tc = lv.rv_tc, p = lv.players || {};
  const priceV = lv.free ? '免費' : fmtNT(pr.final);
  const low = pr.low && !lv.free ? `<div class="ld">追蹤以來最低 ${fmtNT(pr.low.v)}（${mdDay(pr.low.at.slice(0, 10))}）${pr.final <= pr.low.v && pr.disc > 0 ? '<span class="lowtag">史低</span>' : ''}</div>` : '';
  const d24 = p.d24 != null ? `<span class="${p.d24 >= 0 ? 'up' : 'dn'}">${p.d24 >= 0 ? '▲' : '▼'}${Math.abs(p.d24)}%</span> 比 24 小時前` : '';
  return `<div class="live"><div class="lh"><span>STEAM 即時數據 · 台灣區</span><small>更新於 ${esc(ago(lv.at))}</small></div><div class="lgrid">
    <div class="lc"><div class="ll">台灣售價</div><div class="lv">${esc(priceV)}${pr.disc > 0 ? `<span class="disc">-${pr.disc}%</span>` : ''}</div>${pr.disc > 0 && pr.orig ? `<div class="ld">原價 ${fmtNT(pr.orig)}${pr.end && Date.parse(pr.end) > Date.now() ? `・特價到 ${esc(endDate(pr.end))}（${esc(leftTxt(Date.parse(pr.end) - Date.now()))}）` : ''}</div>` : ''}${low}</div>
    <div class="lc"><div class="ll">Steam 評價</div><div class="lv">${rv.pct != null ? `<span class="cu" data-n="${rv.pct}" data-f="i">${rv.pct}</span><small>%</small>` : '—'}</div><div class="ld">${esc(rv.label || '評論還不夠')} · ${fmtN(rv.n)} 則${rv.recent ? `<br>近 ${rv.recent.days} 天 ${rv.recent.pct}%（${fmtN(rv.recent.n)} 則）` : ''}</div></div>
    <div class="lc wide"><div class="ll">目前同上人數</div><div class="lv">${p.n != null ? `<span class="cu" data-n="${p.n}">${esc(fmtN(p.n))}</span>` : '—'}<small>${p.peak ? `追蹤以來最高 ${esc(fmtN(p.peak.n))}` : ''}</small></div><div class="ld">${d24}</div>${h ? sparkSvg(h.pl, 7) : ''}</div>
    <div class="lc"><div class="ll">繁中玩家評價</div><div class="lv">${tc && tc.pct != null ? `<span class="cu" data-n="${tc.pct}" data-f="i">${tc.pct}</span><small>%</small>` : '—'}</div><div class="ld">${!tc ? '這一輪沒抓到，下次更新再補' : tc.n ? `${fmtN(tc.n)} 則繁中評論` : '還沒有繁中評論'}</div></div>
    <div class="lc"><div class="ll">語言（Steam）</div><div class="lv" style="font-size:24px">${lv.langs && lv.langs.tc ? '有繁中' : lv.langs && lv.langs.sc ? '只有簡中' : '無中文'}</div><div class="ld">${lv.langs && lv.langs.tc ? (lv.langs.tc.audio ? '含中文語音' : '介面／字幕') : ''}</div></div>
  </div>${lv.ws ? '<div class="lfl"><b>MOD</b><span>有 Steam 工作坊：玩家做的 Mod 一鍵訂閱就能裝</span></div>' : ''}</div>`;
}
/* ---------- 寫稿之後：寫完以後 Steam 上變了什麼、官方發了什麼（資料管線每小時比對，連兩輪看到才算數） ---------- */
const CHG_RANK = { zh: 0, rel: 1, ea: 1, free: 2, ws: 3, orig: 4, rv: 5 };
const twOf = (ms) => new Date(ms + 8 * 3600e3).toISOString().slice(0, 10);
const twDay = (iso) => twOf(Date.parse(iso));
function chgText(c) {   // [短標、一句話、補充]
  const pc = (a, b) => Math.round(Math.abs(b - a) / a * 100);
  switch (c.k) {
    case 'zh': return c.b === 'tc' ? ['加了繁中', '加了繁體中文', c.a === 'sc' ? '原本只有簡中' : '原本沒有中文'] : ['加了簡中', '加了簡體中文', '還沒有繁中'];
    case 'rel': return ['上市了', c.b === 'ea' ? '開賣了（搶先體驗）' : '正式上市', ''];
    case 'ea': return ['正式版', '結束搶先體驗，推出正式版', ''];
    case 'free': return ['改免費', '改成免費遊玩', ''];
    case 'orig': return [`${c.b < c.a ? '降價' : '漲價'} ${pc(c.a, c.b)}%`, `原價${c.b < c.a ? '調降' : '調漲'}：${fmtNT(c.a)} → ${fmtNT(c.b)}`, '不是特價，是定價改了'];
    case 'rv': return [c.b > c.a ? '好評回升' : '評價下滑', `Steam 好評率 ${c.a}% → ${c.b}%`, c.b > c.a ? '玩家口碑變好了' : '玩家最近不太買單'];
    case 'ws': return ['開放 Mod', '開放 Steam 工作坊', '玩家做的 Mod 一鍵訂閱就能裝'];
  }
  return ['有變化', '有變化', ''];
}
const chgSort = (a) => a.slice().sort((x, y) => (CHG_RANK[x.k] ?? 9) - (CHG_RANK[y.k] ?? 9) || (x.d < y.d ? 1 : -1));
/* 這篇最後一次對過資料的時間：updated 有時間就用；只有日期就當那天結束（跟資料管線 _since 一樣） */
function sinceTs(f) {
  const u = String(f.updated || f.date || '');
  if (u.includes('T')) { const t = Date.parse(u); if (!isNaN(t)) return t; }
  return Date.parse(u.slice(0, 10) + 'T23:59:59+08:00');
}
function afterOf(kind, f, lv) {
  const t = sinceTs(f); const e = (S.stale || {})[kind + ':' + f.id];
  const ch = ((lv && lv.chg) || (e && e.ch) || []).filter((c) => Date.parse(c.d) > t);
  const nw = ((lv && lv.news) || []).filter((n) => Date.parse(n.d) > t);
  return { t, day: twOf(t), ch, nw, np: nw.filter((n) => n.k === 'patch').length };
}
function afterBanner(kind, f, lv) {
  if (!f.game.steam) return '';
  const A = afterOf(kind, f, lv); const rv = (f.rev || []).slice(-1)[0];
  const ch = chgSort(A.ch);
  if (!ch.length && !A.np) return rv ? `<div class="after ok" data-act="jump" data-to="s-after"><div class="af-h"><b>✓ 回訪改寫</b><span>${esc(mdDay(rv.d))}：${esc(rv.t)}</span></div></div>` : '';
  return `<div class="after" data-act="jump" data-to="s-after"><div class="af-h"><b>寫稿之後</b><span>${esc(mdDay(A.day))} ${rv ? '改寫' : '寫完'}之後，Steam 上有新動態</span></div>
    <div class="af-c">${ch.slice(0, 4).map((c) => `<span class="af-k">${esc(chgText(c)[0])}</span>`).join('')}${A.np ? `<span class="af-k p">${A.np} 則官方更新</span>` : ''}<i class="af-go">看詳情 ↓</i></div>
    ${rv ? `<div class="af-rev">✎ ${esc(mdDay(rv.d))} 回訪改寫：${esc(rv.t)}</div>` : ''}</div>`;
}
function afterHtml(kind, f, lv) {
  if (!f.game.steam) return '';
  const A = afterOf(kind, f, lv); const days = Math.max(0, dayDiff(A.day, todayTW()));
  const ch = A.ch.slice().sort((x, y) => (x.d < y.d ? 1 : -1));
  const rows = ch.map((c) => { const [, l, s] = chgText(c); return `<div class="ac"><span class="ad">${esc(mdDay(twDay(c.d)))}</span><div><b>${esc(l)}</b>${s ? `<small>${esc(s)}</small>` : ''}</div></div>`; }).join('');
  const news = A.nw.map((n) => `<a class="an"${n.u ? ` href="${esc(n.u)}" target="_blank" rel="noopener noreferrer"` : ''}><span class="ad">${esc(mdDay(twDay(n.d)))}</span><div><span class="ak ${n.k === 'patch' ? 'p' : ''}">${n.k === 'patch' ? '更新' : '公告'}</span><b>${esc(n.t)}</b>${n.x ? `<p>${esc(n.x)}</p>` : ''}</div></a>`).join('');
  const revs = (f.rev || []).slice().reverse().map((r) => `<div class="af-rev">✎ ${esc(mdDay(r.d))} 回訪改寫：${esc(r.t)}</div>`).join('');
  const none = !lv ? '這款剛加入追蹤，下一輪更新後開始比對。'
    : !liveReady(f.game.steam) ? '追蹤紀錄還沒載完（網路慢的時候會這樣），重新整理就會出現。'
    : lv.base === undefined && lv.news === undefined ? '剛開始追蹤：之後 Steam 上的變化和官方公告會自動記在這裡。'
    : `${(f.rev || []).length ? '上次改寫' : '寫稿'}到現在${days ? ` ${days} 天` : ''}，Steam 上沒有新變化${lv.news !== undefined ? '，官方也還沒發新公告' : ''}。這篇的資訊還是最新的。`;
  return `<div class="live aft" id="s-after"><div class="lh"><span>寫稿之後 · 自動追蹤</span><small>${esc(mdDay(A.day))} 到現在${days ? ` · ${days} 天` : ''}</small></div>
    ${revs}${rows ? `<div class="aft-ch">${rows}</div>` : ''}
    ${news ? `<h4 class="aft-h">官方公告<small>Steam 社群公告・點開看全文</small></h4><div class="aft-nw">${news}</div>` : ''}
    ${!rows && !news ? `<div class="empty aft-0">${none}</div>` : ''}
    <p class="aft-f">每小時比對 Steam 商店：中文、上市、正式版、免費、原價、評價大轉向、工作坊有變就記下；官方公告每 6 小時收一次。</p></div>`;
}
function afterTag(kind, id) {   // 列表用：寫稿之後最重要的那個變化 [字, +幾項, 樣式]；只有官方更新的話，7 天內標「剛更新」
  const e = S.stale && S.stale[kind + ':' + id]; if (!e) return null;
  const ch = chgSort(e.ch || []);
  if (ch.length) return [chgText(ch[0])[0], ch.length > 1 ? `+${ch.length - 1}` : '', ''];
  return e.lp && Date.now() - Date.parse(e.lp.d) < 7 * 864e5 ? ['剛更新', '', 'k'] : null;
}
function afterChip(kind, id) { const a = afterTag(kind, id); return a ? `<span class="mchg ${a[2]}">${esc(a[0])}${a[1] ? `<small>${a[1]}</small>` : ''}</span>` : ''; }
const IDX = new WeakMap();
function byId(list) {   // 目錄的 id 索引：建一次就好（資料重新載入換了陣列就重建）
  let m = IDX.get(list);
  if (!m || m.size !== list.length) { m = new Map(list.map((x) => [x.id, x])); IDX.set(list, m); }
  return m;
}
function afterNotes() {   // 追蹤牆：最近 7 天的變化（同一款一張）、最近 3 天的官方更新（最多兩張）。只看有動態的那幾篇，不掃整個目錄
  const out = []; const pt = []; const now = Date.now(); const st = S.stale || {};
  const F = byId(S.index.items); const P = byId((S.picks && S.picks.items) || []);
  for (const ref in st) {
    const e = st[ref]; if (!e.ch && !(e.lp && e.lp.t)) continue;
    const k = ref[0]; const it = (k === 'p' ? P : F).get(ref.slice(2)); if (!it) continue;
    const ch = chgSort((e.ch || []).filter((c) => { const age = (now - Date.parse(c.d)) / 864e5; return age >= 0 && age < 7; }));
    if (ch.length) {      // 最重要的變化當大字，其他的接在後面
      const c = ch[0]; const age = (now - Date.parse(c.d)) / 864e5;
      const V = { zh: [c.b === 'tc' ? '繁中' : '簡中', ''], rel: ['上市', ''], ea: ['1.0', ''], free: ['免費', ''], ws: ['MOD', ''],
        orig: [(c.b < c.a ? '-' : '+') + Math.round(Math.abs(c.b - c.a) / c.a * 100), '%'], rv: [c.b, '%'] }[c.k] || [chgText(c)[0], ''];
      out.push({ w: 90 - age, id: it.id, go: `${k}/${it.id}`, t: it.zh, v: V[0], unit: V[1], d: `${mdDay(twDay(c.d))} ${chgText(c)[1]}${ch.length > 1 ? '・還有' + ch.slice(1).map((x) => chgText(x)[0]).join('、') : ''}`, c: 'k' });
    }
    if (e.lp && e.lp.t && now - Date.parse(e.lp.d) < 3 * 864e5) pt.push({ w: 56 - (now - Date.parse(e.lp.d)) / 864e5, id: it.id, go: `${k}/${it.id}`, t: it.zh, v: '更新', unit: '', d: `${mdDay(twDay(e.lp.d))} 官方更新：${e.lp.t.length > 42 ? e.lp.t.slice(0, 41) + '…' : e.lp.t}`, c: 'w' });
  }
  return out.concat(pt.sort((a, b) => b.w - a.w).slice(0, 2));
}
function moneyHtml(m) {
  const L = m.level;
  const labels = ['無內購', '可選內購', '季票', '付費加速', '抽卡'];
  return `<div class="ic"><h4>課金雷達 <span class="tagx ${L == null ? 'k' : L <= 1 ? 'g' : L === 2 ? 'y' : ''}">${esc(L == null ? '未確認' : moneyLabel(L))}</span></h4>
    <div class="meter">${[0, 1, 2, 3, 4].map((k) => `<i class="${L != null && k <= L ? 'on l' + L : ''}"></i>`).join('')}</div>
    <div class="mlabels">${labels.map((x) => `<span>${x}</span>`).join('')}</div>
    <p class="mdl-n">${esc(m.model)}</p><ul>${(m.notes || []).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    ${(m.flags || []).length ? `<div class="flags">${m.flags.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}</div>`;
}
function zhText(f, lv) {
  const z = f.zh || {}; const lz = lv && lv.langs;
  if (lz) return lz.tc ? '有繁中' : lz.sc ? '只有簡中' : '沒有中文';
  return z.sub || z.ui ? '有繁中' : z.ui === false ? '沒有中文' : '未知';
}
/* 一眼看懂的平台：三個以內照寫，太多就收成「PC／PS／Xbox／Switch／手機」 */
function platsShort(list) {
  /* 回傳 [格子大字, 小字]：平台多的時候主機收成「主機」，細項放小字，免得格子裡斷成「手／機」 */
  const short = [...new Set((list || []).map((p) => PLAT_SHORT(p).replace(/（.*$/, '').trim()))];
  if (short.length <= 3) return [short.join('／') || '—', ''];
  const fam = []; const add = (x) => { if (!fam.includes(x)) fam.push(x); };
  for (const p of short) {
    if (/^PC|Steam|Windows/i.test(p)) add('PC'); else if (/^PS/i.test(p)) add('PS'); else if (/Xbox/i.test(p)) add('Xbox');
    else if (/Switch/i.test(p)) add('Switch'); else if (/手機|iOS|Android/i.test(p)) add('手機'); else add(p);
  }
  if (fam.length <= 3) return [fam.join('／'), ''];
  const cons = fam.filter((x) => ['PS', 'Xbox', 'Switch'].includes(x));
  const main = [fam.includes('PC') ? 'PC' : '', cons.length ? '主機' : '', fam.includes('手機') ? '手機' : '', ...fam.filter((x) => !['PC', '手機', 'PS', 'Xbox', 'Switch'].includes(x))].filter(Boolean);
  return [main.join('／'), cons.join('・')];
}
/* 一眼看懂的格子：字多就縮小，能一行放完就一行；數字和單位不拆開 */
function glanceTiles(T, key) {
  const units = (v) => { let u = 0; for (const ch of String(v).replace(/<[^>]+>/g, '')) u += /[⺀-￿]/.test(ch) ? 1 : 0.55; return u; };
  const fs = (v) => { const u = units(v); for (const z of [19, 17, 16, 15]) if (u * z <= 90) return z; return 16; };
  const nw = (v) => String(v).replace(/(\d[\d.,～~\-]*\s*(?:小時|天|年|萬|%|分鐘))/g, '<span class="nw">$1</span>');
  return `<div class="glance">${T.map(([k, v, sm, c], i) => `<div class="gl-t c-${c}" style="--i:${i};--rot:${rot(key + k, i, 1.6)}deg"><span class="gk">${k}</span><b class="gv" style="font-size:${fs(v)}px">${nw(v)}</b>${sm ? `<span class="gs">${esc(sm)}</span>` : ''}</div>`).join('')}</div>`;
}
/* 一眼看懂：上市、售價、平台、中文、課金、你的筆電 */
function glanceHtml(f, it, lv) {
  const g = f.game; const today = todayTW();
  const rel = /^\d{4}-\d{2}-\d{2}$/.test(g.release || '') ? g.release : null;
  let rv = '待公告', rs = g.release_text ? '' : '日期未定', rc = 'w';
  if (rel) {
    const dd = dayDiff(today, rel);
    if (dd > 0) { rv = `${dd}<small>天</small>`; rs = `倒數・${mdDay(rel)} 上市`; rc = 'p'; }
    else if (dd === 0) { rv = '今天'; rs = '上市日'; rc = 'p'; }
    else { rv = esc(mdDay(rel)); rs = `${rel.slice(0, 4)}${it.kind === 'ea' || f.kind === 'ea' ? '・搶先體驗' : ' 年'}`; }
  }
  const price = priceLabel(it, lv) || '—';
  const plats = platsShort(g.platforms);
  const zt = zhText(f, lv); const m = (f.money || {}).level;
  const T = [
    ['上市', rv, rs, rc],
    ['台灣售價', esc(price), lv && lv.price && lv.price.disc > 0 ? `特價 -${lv.price.disc}%` : (lv && !lv.free ? 'Steam 台灣區' : ''), 'y'],
    ['平台', esc(plats[0]), plats[1], 'w'],
    ['中文', esc(zt), '', zt === '有繁中' ? 'g' : zt === '未知' ? 'w' : 'p'],
    ['課金', m == null ? '未確認' : esc(moneyLabel(m)), m == null ? '內購內容還沒公開' : '', m == null ? 'w' : m <= 1 ? 'g' : m === 2 ? 'y' : 'p'],
    ['你的 SCAR 18', esc(f.rig.verdict), '', 'k'],
  ];
  return glanceTiles(T, f.id);
}
function infoCards(f, lv) {
  const z = f.zh || {}; const tw = f.tw || {};
  const zt = zhText(f, lv);
  const twT = tw.ok === true ? '可以玩' : tw.ok === 'partial' ? '能玩，但…' : '還不行';
  return `<div class="cards2">${moneyHtml(f.money || {})}
    <div class="ic"><h4>中文 <span class="tagx ${zt === '有繁中' ? 'g' : zt === '未知' ? 'k' : ''}">${zt}</span></h4><p>${esc(z.note || '')}</p>
      <h4 style="margin-top:12px">台灣 <span class="tagx ${tw.ok === true ? 'g' : tw.ok === 'partial' ? 'y' : ''}">${twT}</span></h4><p>${esc(tw.note || '')}</p></div>
    <div class="ic"><h4>你的 SCAR 18 <span class="tagx y">${esc(f.rig.verdict)}</span></h4><p>${esc(f.rig.note)}</p></div>
    <div class="ic"><h4>遊玩時間 <span class="tagx k">${esc((f.time || {}).text || '—')}</span></h4><p>${esc((f.time || {}).note || '')}</p>
      ${(f.watch || []).length ? `<h4 style="margin-top:12px">接下來盯這些</h4><ul>${f.watch.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}</div></div>`;
}
function mediaList(f, lv) {
  const vids = []; const shots = [];
  for (const y of (f.media && f.media.yt) || []) vids.push({ kind: 'yt', id: y.id, title: y.title, poster: ytThumb(y.id) });
  for (const t of (lv && lv.trailers) || []) { const src = t.hls || t.mp4 || t.webm; if (src) vids.push({ kind: 'steam', src, title: 'Steam：' + (t.name || '預告').slice(0, 24), poster: t.poster }); }
  shots.push(...galleryOf(f, lv));
  return { vids: vids.slice(0, 6), shots };
}
function trailerBox(v, i) {
  if (!v) return '<div class="empty">這款目前沒有可以播的預告。</div>';
  return `<div class="tv" data-act="play" data-i="${i}">${v.poster ? `<img src="${esc(v.poster)}" alt="" onerror="imgFail(this)" onload="ytCheck(this)">` : ''}<div class="ph" style="display:none">▶</div>
    <button class="playb" aria-label="播放預告">${ICON.play}</button><span class="tvt">${esc(v.title || '預告')}</span></div>`;
}
function sec(id, path, title, body) { return `<section class="fsec" id="${id}"><h2><span class="path">/${path}</span><span class="ttl">${esc(title)}</span></h2>${body}</section>`; }

async function renderFeature(id) {
  const it0 = findItem(id); if (it0 && it0.steam) { liveLoad([it0.steam]); loadHist(it0.steam); }   // 跟專題同時載，不用排隊
  const f = await loadFeature(id);
  await liveLoad([f.game.steam], 4000);
  const it = S.index.items.find((x) => x.id === id) || { id, kind: f.kind, kind_label: f.kind_label };
  const lv = liveOf(f.game.steam);
  const h = lv ? await loadHist(f.game.steam) : null;
  const M = mediaList(f, lv); S.curMedia = M; S.curId = id;
  const hero = heroOf(Object.assign({}, it, { media: f.media }), lv);
  const HL = heroList(f, lv, hero); S.curHero = HL;
  const mc = (lv && lv.micro) || {}; const micro = mc.mp4 || mc.webm;
  const V = f.verdict; const Sx = f.sections;
  const mk = S.marks[id] || '';
  const facts = f.facts.map((x, i) => {
    const srcs = (x.s || []).map((j) => f.sources[j]).filter(Boolean);
    return `<div class="fact ${x.p ? 'pd' : ''}" data-act="fact" data-i="${i}"><span class="fk">${esc(x.k)}</span><span class="fv">${esc(x.v)}</span><span class="fs">${x.p ? '?' : '✓'}</span>
      <div class="fsrc">來源：${srcs.map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a>`).join('、')}</div></div>`;
  }).join('');
  const story = Sx.story && ((Sx.story.safe || []).length || (Sx.story.spoiler || []).length);
  const tabs = [['s-info', '資訊'], ['s-media', '影像'], ['s-play', '玩法'], story ? ['s-story', '劇情'] : null, ['s-studio', '幕後'], ['s-voice', '風向'], ['s-talk', '討論'], ['s-src', '來源']].filter(Boolean);
  const today = todayTW();
  return `<div class="f-top"><div class="f-hero" id="fhero"><div class="kb">${hero ? `<img class="kbi on" src="${esc(hero)}" alt="" onerror="heroFail(this)" onload="if(this.naturalWidth<=120)heroFail(this)"><img class="kbi" alt="" decoding="async">` : ''}</div>
      ${micro ? `<video class="hv" muted loop playsinline preload="none" disablepictureinpicture aria-hidden="true" data-mp4="${esc(mc.mp4 || '')}" data-webm="${esc(mc.webm || '')}"></video>` : ''}
      <div class="ph" style="${hero ? 'display:none' : ''}">UNPACKED</div><div class="ht"></div>
      ${micro ? '<span class="hv-tag">● 動態預告</span>' : HL.length > 1 ? `<span class="hv-tag k">◎ ${HL.length} 張精彩畫面</span>` : ''}</div>
      <button class="back" data-act="back">← 回牆上</button></div>
    <div class="f-head"><span class="kind-stk">${esc(f.kind_label || it.kind_label)}</span>
      <h1 class="f-title">${esc(f.game.zh)}</h1>
      <div class="f-en">${esc(f.game.en)}${f.game.zh_note ? `<span class="f-zhnote">（${esc(f.game.zh_note)}）</span>` : ''}</div>
      <p class="f-headline">${esc(f.headline)}</p></div>
    ${glanceHtml(f, it, lv)}
    ${afterBanner('f', f, lv)}
    <p class="hook">${esc(f.hook)}</p>
    <div class="verdict"><div class="vl">三秒結論 · ${esc(V.label)}</div><div class="vt">${esc(V.stamp === '推薦' ? '值得玩' : V.stamp === '觀望' ? '先觀望' : '先跳過')}</div>
      <p class="vs">${esc(V.summary)}</p>${sealHtml(V.stamp, V.label, 'seal wait')}
      <div class="fa"><div class="st"><h4>適合你，如果…</h4><ul>${V.for.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="st p"><h4>不適合，如果…</h4><ul>${V.against.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div></div>
    ${buyHtml(f, lv)}
    <div class="btnrow"><button class="btn y sm" data-act="speak">${ICON.speak}<span>語音導讀</span></button><button class="btn sm askthis" data-act="askthis" data-k="feature">${ICON.radio}<span>問 Claude</span></button><button class="btn sm vsb" data-act="vspick" data-r="f:${esc(id)}" data-side="r">⚔<span>VS 對決</span></button><button class="btn p sm" data-go="fan/${esc(id)}">${ICON.mega}<span>出成粉專貼文</span></button>${f.game.site ? `<a class="btn sm" href="${esc(f.game.site)}" target="_blank" rel="noopener noreferrer">官方頁面</a>` : ''}${f.game.steam ? `<a class="btn sm" href="https://store.steampowered.com/app/${esc(f.game.steam)}/" target="_blank" rel="noopener noreferrer">Steam 商店</a>` : ''}</div>
    ${askBoxFor('f:' + id)}
    <nav class="ftabs">${tabs.map(([a, l], i) => `<button class="ftab ${i ? '' : 'on'}" data-act="jump" data-to="${a}"><b>/</b>${l}</button>`).join('')}</nav>
    ${sec('s-info', 'INFO', '資訊卡', `<p class="sub-note" style="margin-top:8px">點任何一項看來源；粉紅色問號是還沒查證的。</p><div class="facts">${facts}</div>${liveHtml(f, lv, h)}${afterHtml('f', f, lv)}${infoCards(f, lv)}`)}
    ${sec('s-media', 'MEDIA', '影像', `<div class="trailer"><div id="tvbox">${trailerBox(M.vids[0], 0)}</div>${M.vids.length > 1 ? `<div class="vtabs">${M.vids.map((v, i) => `<button class="vtab ${i ? '' : 'on'}" data-act="vt" data-i="${i}">${esc(v.title || '預告')}</button>`).join('')}</div>` : ''}</div>${M.vids.length ? `<div class="btnrow"><button class="btn sm k" data-go="shorts/f:${esc(id)}">${ICON.shorts}<span>用短影音直式滑著看</span></button></div>` : ''}
      ${M.shots.length ? `<h3 class="tape-h">相簿 <small class="shot-n">${M.shots.length} 張・點開可以左右滑</small></h3><div class="shots">${M.shots.map((s, i) => `<div class="shot" data-act="lb" data-i="${i}" style="--rot:${rot(id + s, i, 1)}deg"><img src="${esc(s)}" alt="" loading="lazy" decoding="async" onerror="shotFail(this)" onload="if(this.naturalWidth<=120)shotFail(this)"></div>`).join('')}</div>` : ''}`)}
    ${sec('s-play', 'PLAY', '玩法拆解', `<div class="loop">${Sx.gameplay.loop.map((x, i) => `${i ? '<span class="ar">→</span>' : ''}<span class="lp" style="--rot:${rot(id + x, i, 2)}deg">${esc(x)}</span>`).join('')}<span class="back2">↺ 再來一輪</span></div>
      ${Sx.gameplay.body.map((p) => `<p class="para">${esc(p)}</p>`).join('')}
      <h3 class="tape-h">你的第一個小時</h3><div class="steps">${Sx.hour.map((p) => `<div class="stp">${esc(p)}</div>`).join('')}</div>
      <h3 class="tape-h p">跟誰像、差在哪</h3><div class="cmp">${Sx.compare.map((c, i) => `<div class="cmpc" data-act="gameinfo" data-k="cmp:${esc(String(c.steam || ''))}|${esc(c.name)}" role="button" style="--rot:${rot(id + c.name, i, 1.2)}deg"><h4>${esc(c.name)}<i class="gi-i">ⓘ</i></h4><div class="row"><b>像</b><span>${esc(c.same)}</span></div><div class="row d"><b>不同</b><span>${esc(c.diff)}</span></div></div>`).join('')}</div>`)}
    ${story ? sec('s-story', 'STORY', '劇情與世界觀', `${(Sx.story.safe || []).map((p) => `<p class="para">${esc(p)}</p>`).join('')}${(Sx.story.spoiler || []).length ? `<div class="spoil"><div class="inner">${Sx.story.spoiler.map((p) => `<p class="para">${esc(p)}</p>`).join('')}</div><div class="cover" data-act="spoil"><b>⚠ 有雷，撕開才看</b><span>tap to rip!</span></div></div>` : '<p class="sub-note">（這款還沒有可以聊的劇透，上市或玩過後再補。）</p>'}`) : ''}
    ${sec('s-studio', 'STUDIO', '幕後：誰做的', `${Sx.studio.map((p) => `<p class="para">${esc(p)}</p>`).join('')}<h3 class="tape-h">時間軸</h3><div class="tl">${Sx.timeline.map((t) => `<div class="tli ${t.d > today ? 'fut' : ''}"><div class="td">${esc(t.d.replace(/-/g, '.'))}</div><div class="tt">${esc(t.t)}</div></div>`).join('')}</div>`)}
    ${sec('s-voice', 'VOICES', '玩家風向', `<div class="voices"><div class="vc pro"><h4>誇的</h4><ul>${Sx.voices.pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="vc con"><h4>罵的</h4><ul>${Sx.voices.cons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
      ${(Sx.voices.debate || []).length ? `<div class="debate"><h4>吵最兇的</h4>${Sx.voices.debate.map((x) => `<p>${esc(x)}</p>`).join('')}</div>` : ''}`)}
    ${sec('s-talk', 'TALK', '值得聊的', `<div class="qs">${Sx.discuss.map((q, i) => `<div class="q" style="--rot:${rot(id + q.q, i, 0.9)}deg"><h4>${esc(q.q)}</h4><p>${esc(q.why)}</p><textarea data-act="thought" data-k="${esc(id)}#${i}" placeholder="我的想法（只存在這台裝置）">${esc(S.thoughts[id + '#' + i] || '')}</textarea></div>`).join('')}</div>
      <h3 class="tape-h">我的標記</h3><div class="marks">${[['want', '想玩'], ['playing', '在玩'], ['done', '玩過'], ['no', '沒興趣']].map(([k, l], i) => `<button class="mkb ${mk === k ? 'on' : ''}" data-act="mark" data-k="${k}" style="--rot:${rot(id + k, i, 2)}deg">${l}</button>`).join('')}</div>
      <textarea class="mynote" data-act="note" placeholder="筆記：例如要不要拍影片、想等特價…">${esc(S.notes[id] || '')}</textarea>`)}
    ${sec('s-src', 'SOURCE', '來源', `<ol class="srcs">${f.sources.map((s, i) => `<li><b>${i + 1}</b><a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a>${s.d ? `（${esc(s.d)}）` : ''}</li>`).join('')}</ol>
      ${(f.pending || []).length ? `<div class="pend"><h4>還沒查證、先不當真</h4><ul>${f.pending.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}
      <p class="sub-note" style="margin-top:12px">專題寫於 ${esc(f.date)}${f.updated ? ' · 最後更新 ' + esc(f.updated.slice(0, 16).replace('T', ' ')) : ''}。硬資訊都附來源；Steam 即時數據每小時自動更新。</p>`)}
    <div class="endcta"><button class="btn p" data-go="fan/${esc(id)}">${ICON.mega}<span>出成粉專貼文</span></button><button class="btn k" data-act="back">回牆上</button></div>`;
}

/* ---------- 買不買：願望單解包一定有（其他專題可選），目標價對上即時價格 ---------- */
const BUY_CLS = { '現在買': 'b-go', '等特價': 'b-wait', '等史低': 'b-wait', '等上市後評價': 'b-mid', '先觀望': 'b-mid', '別買': 'b-no' };
function priceNow(steam, lv) {
  lv = lv || liveOf(steam);
  if (lv && lv.price && lv.price.final != null) return { final: lv.price.final, orig: lv.price.orig, low: lv.price.low && lv.price.low.v };
  const w = ((S.wish && S.wish.items) || []).find((x) => String(x.appid) === String(steam));
  if (w && w.p && w.p[0] != null) return { final: w.p[0], orig: w.p[1], low: w.low && w.low[0] };
  return null;
}
function buyHtml(f, lv) {
  const b = f.buy; if (!b) return '';
  const p = priceNow(f.game.steam, lv); const fin = p && p.final;
  const hit = b.target != null && fin != null && fin <= b.target;
  let now = '';
  if (fin != null && b.call !== '別買') {
    now = hit ? `<b class="bc-hit">到價了！</b>現在 ${fmtNT(fin)}，比目標還便宜 ${fmtNT(b.target - fin)}`
      : b.target != null ? `現在 ${fmtNT(fin)}，還差 ${fmtNT(fin - b.target)}（再便宜 ${Math.round((1 - b.target / fin) * 100)}% 就到價）` : `現在 ${fmtNT(fin)}`;
  }
  let bar = '';
  if (p && p.orig && fin != null && b.target != null) {
    const cur = Math.max(2, Math.min(100, fin / p.orig * 100)), tg = Math.max(0, Math.min(100, b.target / p.orig * 100));
    bar = `<div class="hp big ${hit ? 'crit' : cur <= 50 ? 'low' : cur < 100 ? 'mid' : ''}" style="--cur:${cur.toFixed(1)}%"><i class="hpf"></i><i class="hpt" style="left:${tg.toFixed(1)}%"></i></div><div class="hpk"><span>價格血條 ${Math.round(cur)}%</span><span class="tg">▲ 目標價 ${fmtNT(b.target)}</span></div>`;
  }
  return `<div class="buycard ${BUY_CLS[b.call] || ''} ${hit ? 'hit' : ''}"><div class="bc-k">Claude 判定・買不買</div><div class="bc-call">${esc(hit ? '到價，可以買' : b.call)}</div>
    ${b.target != null ? `<div class="bc-t">目標價 <b>${fmtNT(b.target)}</b> 以下出手</div>` : ''}${now ? `<div class="bc-now">${now}</div>` : ''}${bar}${hit ? '' : saleHint(b)}
    <p>${esc(b.why)}</p>${b.watch ? `<p class="bc-w">什麼情況會改判：${esc(b.watch)}</p>` : ''}${hit ? '<i class="bc-stamp">到價</i>' : ''}</div>`;
}

/* ---------- 推坑：已上市、不分新舊，查過評價才推的私房遊戲 ---------- */
const PICK_CLS = { '必玩': 'pk-must', '閉眼入': 'pk-blind', '特價入': 'pk-sale', '冷門神作': 'pk-gem' };
const PICKF = { f: 'all' };
function pickChips(it, lv) {
  const out = [];
  const pr = lv && lv.price;
  if (lv && lv.free) out.push('<span class="chip y">免費</span>');
  else if (pr && pr.final != null) out.push(`<span class="chip y">${esc(fmtNT(pr.final))}${pr.disc > 0 ? ` <b class="dsc">-${pr.disc}%</b>` : ''}</span>`);
  const z = liveZh(lv, it.zhs);
  out.push(`<span class="chip ${z === 'tc' ? '' : 'n'}">${z === 'tc' ? '繁中' : z === 'sc' ? '只有簡中' : z === 'none' ? '無中文' : '中文未知'}</span>`);
  if (it.hours) out.push(`<span class="chip n">${esc(it.hours)}</span>`);
  if (lv && lv.rv && lv.rv.pct != null) out.push(`<span class="chip">Steam ${lv.rv.pct}%</span>`);
  return out.join('');
}
function pickCard(it, i) {
  const lv = liveOf(it.steam); const img = heroOf(it, lv);
  const mc = (lv && lv.micro) || {}; const disc = lv && lv.price && lv.price.disc > 0 ? lv.price.disc : 0;
  return `<article class="pk ${PICK_CLS[it.stamp] || ''}" data-go="p/${esc(it.id)}" data-id="${esc(it.id)}"${mc.mp4 || mc.webm ? ` data-mp4="${esc(mc.mp4 || '')}" data-webm="${esc(mc.webm || '')}"` : ''} style="--rot:${rot(it.id, i, 1.2)}deg">
    <div class="pimg"><div class="kb">${img ? `<img class="kbi on" src="${esc(img)}" alt="" loading="${i > 1 ? 'lazy' : 'eager'}" decoding="async" onerror="imgFail(this)" onload="ytCheck(this)"><img class="kbi" alt="" decoding="async">` : ''}</div><div class="ph" style="${img ? 'display:none' : ''}">UNPACKED</div><div class="ht"></div>
      <span class="pk-year">${esc(it.year || (it.release || '').slice(0, 4))}</span>${disc ? `<span class="pk-off">特價 -${disc}%</span>` : ''}${mc.mp4 || mc.webm ? '<span class="pv-tag">▶ 動態</span>' : ''}</div>
    <div class="pk-b"><div class="pk-lbl">${esc(it.label)}</div><h3 class="ptitle">${esc(it.zh)}</h3>${it.en && it.en !== it.zh ? `<div class="pen">${esc(it.en)}</div>` : ''}
      <p class="phead">${esc(it.pitch)}</p><div class="chips">${((a) => a ? `<span class="chip af${a[2]}">寫稿後・${esc(a[0])}${a[1] ? ' ' + a[1] : ''}</span>` : '')(afterTag('p', it.id))}${pickChips(it, lv)}</div></div>
    <div class="pk-stamp">${esc(it.stamp)}</div><i class="tp tp1"></i></article>`;
}
function pickMini(it, i) {
  const lv = liveOf(it.steam); const img = headerOf(it, lv) || heroOf(it, lv);
  return `<div class="mini pkm ${PICK_CLS[it.stamp] || ''}" data-go="p/${esc(it.id)}" style="--rot:${rot(it.id, i, 1.2)}deg">
    <div class="pimg">${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async" onerror="imgFail(this)" onload="ytCheck(this)">` : ''}<div class="ph" style="${img ? 'display:none' : ''}">UNPACKED</div>${afterChip('p', it.id)}</div>
    <span class="mstamp pks">${esc(it.stamp)}</span>
    <div class="mb"><h4>${esc(it.zh)}</h4><div class="md">${esc(it.year || '')} · ${esc((it.genres || []).slice(0, 2).join('／'))}</div></div></div>`;
}
function picksItems() {
  const items = (S.picks && S.picks.items) || [];
  return items.filter((it) => {
    const lv = liveOf(it.steam); const h = hoursOf(it.hours);
    if (PICKF.f === 'tc') return liveZh(lv, it.zhs) === 'tc';
    if (PICKF.f === 'sale') return !!(lv && lv.price && lv.price.disc > 0);
    if (PICKF.f === 'short') return h != null && h <= 15;
    if (PICKF.f === 'long') return h != null && h >= 40;
    if (PICKF.f === 'want') return S.marks[it.id] === 'want';
    return true;
  });
}
function renderPicks() {
  const items = (S.picks && S.picks.items) || [];
  if (!items.length) return `<div class="sec-h"><h2 class="spray-h y">推坑</h2></div><div class="empty">還沒有推坑。每天會加 2～3 款已經上市、評價好又合你口味的遊戲。</div>`;
  const last = items[0].date; const nNew = items.filter((x) => x.date === last).length;
  const fl = (v, label) => `<button class="fl ${PICKF.f === v ? 'on' : ''}" data-act="pf" data-v="${v}">${label}</button>`;
  const sale = items.filter((it) => { const lv = liveOf(it.steam); return lv && lv.price && lv.price.disc > 0; }).length;
  const list = picksItems(); const n = Math.min(list.length, MORE_N.pk);
  return `<div class="sec-h"><h2 class="spray-h y">推坑</h2><span class="date-stk">${esc(last.slice(5).replace('-', '.'))} 新增 ${nNew} 款</span></div>
    <p class="pk-intro"><b>Claude 私房推薦</b>：不分新舊、已經上市，查過評價、挑過才推你的遊戲。每天加 2～3 款，${items.length} 款在坑裡等你${sale ? `，<span class="hl">${sale} 款正在特價</span>` : ''}。</p>
    <div class="filters pkf">${fl('all', '全部')}${fl('tc', '有繁中')}${fl('sale', '特價中')}${fl('short', '15 小時內')}${fl('long', '40 小時以上')}${fl('want', '我想玩')}</div>
    <div class="pks">${list.slice(0, n).map(pickCard).join('') || '<div class="empty">沒有符合的推坑，換個篩選試試。</div>'}</div>${moreS('pk', n, list.length)}`;
}
function pickGlance(f, it, lv) {
  const g = f.game; const today = todayTW();
  const yrs = g.release ? Math.floor(dayDiff(g.release, today) / 365.25) : null;
  const zt = zhText(f, lv);
  const plats = platsShort(g.platforms);
  const pr = lv && lv.price; const price = priceLabel(it, lv) || '—';
  const T = [
    ['上市', esc(String(g.year || (g.release || '').slice(0, 4))), yrs != null ? (yrs >= 1 ? `已上市 ${yrs} 年` : '上市不到一年') : '', 'w'],
    ['台灣售價', esc(price), pr && pr.disc > 0 ? `特價 -${pr.disc}%` : lv && !lv.free ? 'Steam 台灣區' : '', pr && pr.disc > 0 ? 'p' : 'y'],
    ['平台', esc(plats[0]), plats[1], 'w'],
    ['中文', esc(zt), '', zt === '有繁中' ? 'g' : zt === '未知' ? 'w' : 'p'],
    ['遊玩時間', esc((f.time || {}).text || '—'), '', 'y'],
    ['你的 SCAR 18', esc(f.rig.verdict), '', 'k'],
  ];
  return glanceTiles(T, f.id);
}
function factsHtml(f) {
  return f.facts.map((x, i) => {
    const srcs = (x.s || []).map((j) => f.sources[j]).filter(Boolean);
    return `<div class="fact ${x.p ? 'pd' : ''}" data-act="fact" data-i="${i}"><span class="fk">${esc(x.k)}</span><span class="fv">${esc(x.v)}</span><span class="fs">${x.p ? '?' : '✓'}</span>
      <div class="fsrc">來源：${srcs.map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a>`).join('、')}</div></div>`;
  }).join('');
}
async function renderPick(id) {
  const it0 = findItem(id); if (it0 && it0.steam) { liveLoad([it0.steam]); loadHist(it0.steam); }
  const f = await loadPick(id);
  await liveLoad([f.game.steam], 4000);
  const it = (S.picks && S.picks.items.find((x) => x.id === id)) || { id, stamp: f.stamp, label: f.label, zhs: '?', price_text: f.game.price_text };
  const lv = liveOf(f.game.steam);
  const h = lv ? await loadHist(f.game.steam) : null;
  const M = mediaList(f, lv); S.curMedia = M; S.curId = id; S.curKind = 'pick';
  const hero = heroOf(Object.assign({}, it, { media: f.media }), lv);
  const HL = heroList(f, lv, hero); S.curHero = HL;
  const mc = (lv && lv.micro) || {}; const micro = mc.mp4 || mc.webm;
  const mk = S.marks[id] || '';
  const tc = lv && lv.rv_tc; const rv = lv && lv.rv;
  const scores = [...(f.scores || []).map((x) => [x.k, x.v, (x.s || []).map((j) => f.sources[j]).filter(Boolean)[0]]),
    ...(rv && rv.pct != null ? [['Steam 評價', `${rv.pct}%`, null, `${rv.label || ''} · ${fmtN(rv.n)} 則`]] : []),
    ...(tc && tc.pct != null && tc.n ? [['繁中玩家', `${tc.pct}%`, null, `${tc.label || ''} · ${fmtN(tc.n)} 則`]] : [])];
  const Sx = f.sections || {};
  const story = Sx.story && ((Sx.story.safe || []).length || (Sx.story.spoiler || []).length);
  const today = todayTW();
  const tabs = [Sx.gameplay ? ['s-play', '玩法'] : null, ['s-rate', '評價'], ['s-how', '怎麼玩'], story ? ['s-story', '劇情'] : null, ['s-media', '影像'], ['s-info', '資訊'], (Sx.studio || []).length ? ['s-studio', '幕後'] : null, ['s-talk', '討論'], ['s-src', '來源']].filter(Boolean);
  const MULTI = { true: ['可以一起玩', 'g'], partial: ['部分可以', 'y'], false: ['單人遊戲', 'k'] };
  const mu = f.multi && MULTI[String(f.multi.ok)];
  return `<div class="f-top"><div class="f-hero" id="fhero"><div class="kb">${hero ? `<img class="kbi on" src="${esc(hero)}" alt="" onerror="heroFail(this)" onload="if(this.naturalWidth<=120)heroFail(this)"><img class="kbi" alt="" decoding="async">` : ''}</div>
      ${micro ? `<video class="hv" muted loop playsinline preload="none" disablepictureinpicture aria-hidden="true" data-mp4="${esc(mc.mp4 || '')}" data-webm="${esc(mc.webm || '')}"></video>` : ''}
      <div class="ph" style="${hero ? 'display:none' : ''}">UNPACKED</div><div class="ht"></div>
      ${micro ? '<span class="hv-tag">● 動態預告</span>' : HL.length > 1 ? `<span class="hv-tag k">◎ ${HL.length} 張精彩畫面</span>` : ''}</div>
      <button class="back" data-act="back">← 推坑牆</button></div>
    <div class="f-head"><span class="kind-stk pk-kind">Claude 推坑 · ${esc(String(f.game.year || ''))}</span>
      <h1 class="f-title">${esc(f.game.zh)}</h1>
      <div class="f-en">${esc(f.game.en)}${f.game.zh_note ? `<span class="f-zhnote">（${esc(f.game.zh_note)}）</span>` : ''}</div>
      <p class="f-headline">${esc(f.pitch)}</p></div>
    ${pickGlance(f, it, lv)}
    ${afterBanner('p', f, lv)}
    <div class="letter"><i class="tp tp1"></i><div class="lt-h">為什麼推你</div><p>${esc(f.why)}</p><div class="lt-sign">— Claude</div>
      <div class="seal wait pk-seal ${PICK_CLS[f.stamp] || ''}">${esc(f.stamp)}</div></div>
    <div class="rsns">${f.reasons.map((r, i) => `<div class="rsn" style="--i:${i};--rot:${rot(id + r.h, i, 1.4)}deg"><b class="rn">${i + 1}</b><h4>${esc(r.h)}</h4><p>${esc(r.t)}</p></div>`).join('')}</div>
    <div class="btnrow"><button class="btn y sm" data-act="speak">${ICON.speak}<span>語音導讀</span></button><button class="btn sm askthis" data-act="askthis" data-k="pick">${ICON.radio}<span>問 Claude</span></button><button class="btn sm vsb" data-act="vspick" data-r="p:${esc(id)}" data-side="r">⚔<span>VS 對決</span></button>${f.game.site ? `<a class="btn sm" href="${esc(f.game.site)}" target="_blank" rel="noopener noreferrer">官方頁面</a>` : ''}${f.game.steam ? `<a class="btn sm" href="https://store.steampowered.com/app/${esc(f.game.steam)}/" target="_blank" rel="noopener noreferrer">Steam 商店</a>` : ''}</div>
    ${askBoxFor('p:' + id)}
    <nav class="ftabs">${tabs.map(([a, l], i) => `<button class="ftab ${i ? '' : 'on'}" data-act="jump" data-to="${a}"><b>/</b>${l}</button>`).join('')}</nav>
    ${Sx.gameplay ? sec('s-play', 'PLAY', '玩法拆解', `<div class="loop">${Sx.gameplay.loop.map((x, i) => `${i ? '<span class="ar">→</span>' : ''}<span class="lp" style="--rot:${rot(id + x, i, 2)}deg">${esc(x)}</span>`).join('')}<span class="back2">↺ 再來一輪</span></div>
      ${Sx.gameplay.body.map((p) => `<p class="para">${esc(p)}</p>`).join('')}
      ${(Sx.compare || []).length ? `<h3 class="tape-h p">跟誰像、差在哪</h3><div class="cmp">${Sx.compare.map((c, i) => `<div class="cmpc" data-act="gameinfo" data-k="cmp:${esc(String(c.steam || ''))}|${esc(c.name)}" role="button" style="--rot:${rot(id + c.name, i, 1.2)}deg"><h4>${esc(c.name)}<i class="gi-i">ⓘ</i></h4><div class="row"><b>像</b><span>${esc(c.same)}</span></div><div class="row d"><b>不同</b><span>${esc(c.diff)}</span></div></div>`).join('')}</div>` : ''}`) : ''}
    ${sec('s-rate', 'RATE', '評價怎麼說', `${scores.length ? `<div class="scores">${scores.map(([k, v, s2, sub], i) => `<div class="sc" style="--rot:${rot(id + k, i, 1.4)}deg"><span class="sk">${esc(k)}</span><b class="sv ${String(v).length > 6 ? 'long' : ''}">${esc(v)}</b>${sub ? `<span class="ss">${esc(sub)}</span>` : s2 ? `<a class="ss" href="${esc(s2.u)}" target="_blank" rel="noopener noreferrer">來源</a>` : ''}</div>`).join('')}</div>` : ''}
      <div class="fa"><div class="st"><h4>適合你，如果…</h4><ul>${f.fit.for.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="st p"><h4>先別買，如果…</h4><ul>${f.fit.against.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
      ${Sx.voices ? `<h3 class="tape-h">玩家和媒體怎麼說</h3><div class="voices"><div class="vc pro"><h4>誇的</h4><ul>${Sx.voices.pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="vc con"><h4>罵的</h4><ul>${Sx.voices.cons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
      ${(Sx.voices.debate || []).length ? `<div class="debate"><h4>吵最兇的</h4>${Sx.voices.debate.map((x) => `<p>${esc(x)}</p>`).join('')}</div>` : ''}` : ''}`)}
    ${sec('s-how', 'HOW', '怎麼玩最好玩', `<div class="steps">${f.howto.map((p) => `<div class="stp">${esc(p)}</div>`).join('')}</div>
      ${mu ? `<div class="multi m-${mu[1]}"><span class="mk">跟朋友玩？</span><b>${mu[0]}</b><p>${esc(f.multi.text)}</p></div>` : ''}
      ${(f.editions || []).length ? `<h3 class="tape-h y">版本怎麼選</h3><div class="eds">${f.editions.map((e, i) => `<div class="ed ${e.best ? 'best' : ''}" style="--rot:${rot(id + e.name, i, 1.1)}deg">${e.best ? '<span class="ed-b">建議買這個</span>' : ''}<h4>${esc(e.name)}</h4><p>${esc(e.what)}</p>${e.tip ? `<p class="ed-t">${esc(e.tip)}</p>` : ''}</div>`).join('')}</div>` : ''}
      <div class="deal"><b>怎麼買最划算</b><p>${esc(f.deals)}</p></div>`)}
    ${story ? sec('s-story', 'STORY', '劇情與世界觀', `${(Sx.story.safe || []).map((p) => `<p class="para">${esc(p)}</p>`).join('')}${(Sx.story.spoiler || []).length ? `<div class="spoil"><div class="inner">${Sx.story.spoiler.map((p) => `<p class="para">${esc(p)}</p>`).join('')}</div><div class="cover" data-act="spoil"><b>⚠ 有雷，撕開才看</b><span>tap to rip!</span></div></div>` : ''}`) : ''}
    ${sec('s-media', 'MEDIA', '影像', `<div class="trailer"><div id="tvbox">${trailerBox(M.vids[0], 0)}</div>${M.vids.length > 1 ? `<div class="vtabs">${M.vids.map((v, i) => `<button class="vtab ${i ? '' : 'on'}" data-act="vt" data-i="${i}">${esc(v.title || '預告')}</button>`).join('')}</div>` : ''}</div>${M.vids.length ? `<div class="btnrow"><button class="btn sm k" data-go="shorts/p:${esc(id)}">${ICON.shorts}<span>用短影音直式滑著看</span></button></div>` : ''}
      ${M.shots.length ? `<h3 class="tape-h">相簿 <small class="shot-n">${M.shots.length} 張・點開可以左右滑</small></h3><div class="shots">${M.shots.map((s2, i) => `<div class="shot" data-act="lb" data-i="${i}" style="--rot:${rot(id + s2, i, 1)}deg"><img src="${esc(s2)}" alt="" loading="lazy" decoding="async" onerror="shotFail(this)" onload="if(this.naturalWidth<=120)shotFail(this)"></div>`).join('')}</div>` : ''}`)}
    ${sec('s-info', 'INFO', '資訊卡', `<p class="sub-note" style="margin-top:8px">點任何一項看來源。</p><div class="facts">${factsHtml(f)}</div>${liveHtml(f, lv, h)}${afterHtml('p', f, lv)}${infoCards(f, lv)}`)}
    ${(Sx.studio || []).length ? sec('s-studio', 'STUDIO', '幕後：誰做的', `${Sx.studio.map((p) => `<p class="para">${esc(p)}</p>`).join('')}${(Sx.timeline || []).length ? `<h3 class="tape-h">時間軸</h3><div class="tl">${Sx.timeline.map((t) => `<div class="tli ${t.d > today ? 'fut' : ''}"><div class="td">${esc(t.d.replace(/-/g, '.'))}</div><div class="tt">${esc(t.t)}</div></div>`).join('')}</div>` : ''}`) : ''}
    ${sec('s-talk', 'TALK', '玩完可以聊', `${(f.talk || []).length ? `<div class="qs">${f.talk.map((q, i) => `<div class="q" style="--rot:${rot(id + q.q, i, 0.9)}deg"><h4>${esc(q.q)}</h4><p>${esc(q.why)}</p><textarea data-act="thought" data-k="${esc(id)}#${i}" placeholder="我的想法（只存在這台裝置）">${esc(S.thoughts[id + '#' + i] || '')}</textarea></div>`).join('')}</div>` : ''}
      <h3 class="tape-h">我的標記</h3><div class="marks">${[['want', '想玩'], ['playing', '在玩'], ['done', '玩過'], ['no', '沒興趣']].map(([k, l], i) => `<button class="mkb ${mk === k ? 'on' : ''}" data-act="mark" data-k="${k}" style="--rot:${rot(id + k, i, 2)}deg">${l}</button>`).join('')}</div>
      <textarea class="mynote" data-act="note" placeholder="筆記：例如玩到哪、要不要等特價、適不適合拍影片…">${esc(S.notes[id] || '')}</textarea>`)}
    ${sec('s-src', 'SOURCE', '來源', `<ol class="srcs">${f.sources.map((s2, i) => `<li><b>${i + 1}</b><a href="${esc(s2.u)}" target="_blank" rel="noopener noreferrer">${esc(s2.t)}</a>${s2.d ? `（${esc(s2.d)}）` : ''}</li>`).join('')}</ol>
      ${(f.pending || []).length ? `<div class="pend"><h4>還沒查證、先不當真</h4><ul>${f.pending.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}
      <p class="sub-note" style="margin-top:12px">推坑寫於 ${esc(f.date)}${f.updated ? ' · 最後更新 ' + esc(f.updated.slice(0, 16).replace('T', ' ')) : ''}。硬資訊都附來源；Steam 價格與評價每小時自動更新。</p>`)}
    <div class="endcta"><button class="btn y" data-go="picks">${ICON.gem}<span>回推坑牆</span></button><button class="btn k" data-go="home">回今日</button></div>`;
}

/* ---------- 粉專出稿台 ---------- */
function renderFanList() {
  const items = S.index.items;
  const wait = fanWait(); const n = Math.min(items.length, MORE_N.fan);
  const pf0 = opsPfs()[0]; const doGo = (ref) => 'fan/~do:' + encodeURIComponent(ref) + '|' + pf0;
  const frees = freeNow(); const picks = ((S.picks && S.picks.items) || []).filter((x) => x.stamp !== '特價入' || x.date >= addD(todayTW(), -1)).slice(0, 9);
  return `<div class="brandbar"><h2 class="spray-h">出稿台</h2><div class="brandstk"><b>遊戲狂想曲</b><i>GAME RHAPSODY</i></div></div>
    <p class="sub-note">${thOnly() ? '每篇專題、推坑、週報都配好 Threads 版（第 1 則讓人停下來、後面幾則串文講深入）和塗鴉圖卡；限時免費一出來也能直接發快訊。排程每天會自動挑一篇；想多發一篇、換別篇，從這裡挑。' : '每篇專題和每週懶人包都配好粉專貼文、各平台的版本、塗鴉圖卡和 60 秒口播稿；推坑和限免快訊也能直接發。排程每天會自動挑一篇；想多發一篇、換別篇，從這裡挑。'}</p>
    ${frees.length ? `<h3 class="tape-h p" style="margin-top:6px">限免快訊 <small>今天就能發</small></h3><div class="drafts">${frees.slice(0, 4).map((x) => `<div class="draft" data-go="${doGo('x:' + x.id)}"><div class="di" style="background-image:url('${esc(x.img || '')}')"></div><div><h4>${esc(x.title)}</h4><p>${esc(STORE_N[x.store] || x.store)} 限時免費${x.end ? '・領到 ' + esc(freeEndTW(x)) : ''}</p>${pfChips('x:' + x.id)}</div></div>`).join('')}</div>` : ''}
    ${picks.length ? `<h3 class="tape-h" style="margin-top:10px">推坑 <small>已上市的私房好遊戲</small></h3><div class="drafts">${picks.map((x) => `<div class="draft" data-go="${doGo('p:' + x.id)}"><div class="di" style="background-image:url('${esc(headerOf(x))}')"></div><div><h4>${esc(x.zh)}</h4><p>${esc(x.stamp ? '【' + x.stamp + '】' : '')}${esc(x.pitch || '')}</p>${pfChips('p:' + x.id)}</div></div>`).join('')}</div>` : ''}
    ${((S.weekly && S.weekly.items) || []).length ? `<h3 class="tape-h y" style="margin-top:6px">每週懶人包</h3><div class="drafts">${S.weekly.items.slice(0, 6).map((w) => `<div class="draft wkd" data-go="fan/w:${esc(w.id)}"><div class="di wk-no sm"><span>WEEK</span><b>${wkNo(w.id)}</b></div><div><h4>${esc(w.title)}</h4><p>${esc(dotDay(w.from))}–${esc(dotDay(w.to))}・封面／Tier 表／下週出擊三張圖卡</p>${pfChips('w:' + w.id, S.posted['w:' + w.id])}</div></div>`).join('')}</div><h3 class="tape-h" style="margin-top:10px">每日專題</h3>` : ''}
    <div class="drafts" id="fandrafts">${items.slice(0, n).map(draftHtml).join('')}</div>${moreS('fan', n, items.length)}`;
}
const draftHtml = (x) => { const img = headerOf(x); return `<div class="draft" data-go="fan/${esc(x.id)}"><div class="di" style="background-image:url('${esc(img)}')"></div><div><h4>${esc(x.zh)}</h4><p>${esc(x.headline)}</p>${pfChips('f:' + x.id, S.posted[x.id])}</div></div>`; };
/* 出稿台的提示：最近兩週一個平台都還沒發的（更早的就算了，不然累積幾百篇數字會一直掛著） */
function fanWait() { const t = todayTW(); const done = new Set(S.ops.log.map((l) => l.ref)); return ((S.index && S.index.items) || []).filter((x) => !done.has('f:' + x.id) && !S.posted[x.id] && dayDiff(x.date, t) <= 14).length; }
function fanMore() {
  const g = $('#fandrafts'); if (!g) return false;
  const items = S.index.items; const n0 = g.querySelectorAll('.draft').length; const n1 = Math.min(items.length, n0 + MORE_STEP.fan);
  if (n1 > n0) g.insertAdjacentHTML('beforeend', items.slice(n0, n1).map(draftHtml).join(''));
  MORE_N.fan = Math.max(MORE_STEP.fan, n1);
  if (n1 >= items.length) { const s2 = $('.more-s[data-more="fan"]'); if (s2) s2.remove(); }
  return n1 > n0;
}
const CARD = { layout: 'A', ratio: '45', seed: 1 };
async function renderFanDetail(id) {
  const f = await loadFeature(id); const fp = f.fanpage;
  const post = S.edits[id] != null ? S.edits[id] : fp.post;
  const full = post + '\n\n' + fp.tags.join(' ');
  const pfs = await opsPfSection('f:' + id);
  return `<div class="ops">${opsNav('drafts')}<div class="fan-detail"><div class="btnrow" style="margin-top:14px"><button class="btn sm k" data-go="fan/~drafts">← 出稿台</button><button class="btn sm" data-go="f/${esc(id)}">看完整專題</button></div>
    <h2 class="spray-h" style="margin:16px 0 18px">${esc(f.game.zh)}</h2><p class="sub-note">${esc(f.headline)}</p>
    ${f.date < todayTW() && /倒數|今天|明天|本週|這週|這個禮拜/.test([fp.post, fp.script, fp.card.kicker, ...fp.titles].join('')) ? `<div class="stale">這篇稿寫於 ${esc(mdDay(f.date))}，裡面有「倒數幾天」「這個禮拜」這類會過期的說法，發文前記得改成今天的。</div>` : ''}
    <div class="cardwrap"><canvas id="cardcv" width="1080" height="1350"></canvas><div class="cardbusy" id="cardbusy">噴漆中…</div></div>
    <div class="btnrow" style="justify-content:center"><button class="btn sm ${CARD.layout === 'A' ? 'y' : ''}" data-act="cl" data-v="A">版型 A 黃牆</button><button class="btn sm ${CARD.layout === 'B' ? 'y' : ''}" data-act="cl" data-v="B">版型 B 黑牆</button><button class="btn sm ${CARD.ratio === '45' ? 'y' : ''}" data-act="cr" data-v="45">4:5 直式</button><button class="btn sm ${CARD.ratio === '11' ? 'y' : ''}" data-act="cr" data-v="11">1:1 方形</button></div>
    <div class="btnrow" style="justify-content:center"><button class="btn p" data-act="respray">${ICON.can}<span>重噴一張</span></button><button class="btn y" data-act="cdl">${ICON.dl}<span>下載圖卡</span></button>${navigator.share ? `<button class="btn" data-act="cshare">${ICON.share}<span>分享圖卡</span></button>` : ''}</div>
    ${pfs}
    <h3 class="tape-h" style="margin-top:24px">原稿與素材 <small>${fp.threads ? 'IG、FB 用這份；Threads 版在上面另外改' : '改這裡，各平台一起改'}</small></h3>
    <div class="copybox"><h4>粉專貼文（原稿） <span class="cnt" id="postcnt">${post.length} 字</span></h4><textarea id="posttxt" data-act="postedit">${esc(post)}</textarea>
      <div class="btnrow"><button class="btn y sm" data-act="copy" data-what="post">${ICON.copy}<span>複製貼文</span></button><button class="btn p sm" data-act="copy" data-what="full">${ICON.copy}<span>貼文＋hashtag</span></button>${S.edits[id] != null ? '<button class="btn sm" data-act="postreset">還原原稿</button>' : ''}</div></div>
    <div class="copybox"><h4>三個標題（A/B 測試用）</h4>${fp.titles.map((t, i) => `<div class="tline"><b>${'ABC'[i]}</b><span>${esc(t)}</span><button class="btn sm" data-act="copy" data-what="title" data-i="${i}">複製</button></div>`).join('')}</div>
    <div class="copybox"><h4>Hashtag</h4><div class="htags">${fp.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div><div class="btnrow"><button class="btn sm" data-act="copy" data-what="tags">${ICON.copy}<span>複製 hashtag</span></button></div></div>
    <div class="copybox"><h4>60 秒口播稿（Shorts／Reels）</h4><div class="txt">${esc(fp.script)}</div><div class="btnrow"><button class="btn sm" data-act="copy" data-what="script">${ICON.copy}<span>複製口播稿</span></button></div></div>
    <div class="copybox"><h4>素材標註</h4><div class="txt">${esc(fp.credit || '')}</div></div>
    ${(f.pending || []).length ? `<div class="pend"><h4>這些還沒查證，貼文裡已經避開</h4><ul>${f.pending.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}
    <textarea class="hide" id="fullpost">${esc(full)}</textarea></div></div>`;
}

/* ---------- 比較 ---------- */
async function compareHtml() {
  const fs = await Promise.all(S.cmp.map((id) => loadFeature(id).catch(() => null)));
  const ok = fs.filter(Boolean);
  const row = (k, fn) => `<tr><td class="k">${k}</td>${ok.map((f) => `<td>${fn(f, liveOf(f.game.steam))}</td>`).join('')}</tr>`;
  return `<h3>三款比一比</h3><div class="ctwrap"><table class="ctable"><tr><th></th>${ok.map((f) => `<th>${esc(f.game.zh)}</th>`).join('')}</tr>
    ${row('結論', (f) => `<b class="vd-${f.verdict.stamp === '推薦' ? 'ok' : f.verdict.stamp === '觀望' ? 'wait' : 'no'}">${esc(f.verdict.stamp)}</b>｜${esc(f.verdict.label)}`)}
    ${row('價格', (f, lv) => esc(priceLabel({ price_text: f.game.price_text }, lv)))}
    ${row('平台', (f) => esc(f.game.platforms.join('、')))}
    ${row('中文', (f, lv) => { const z = liveZh(lv, f.zh && (f.zh.sub || f.zh.ui) ? 'tc' : f.zh && f.zh.ui === false ? 'none' : '?'); return z === 'tc' ? '有繁中' : z === 'sc' ? '只有簡中' : z === 'none' ? '無中文' : '未知'; })}
    ${row('台灣', (f) => esc(f.tw.ok === true ? '可以玩' : f.tw.ok === 'partial' ? '能玩但有限制' : '還不行'))}
    ${row('課金', (f) => esc(moneyLabel(f.money.level)))}
    ${row('Steam 評價', (f, lv) => lv && lv.rv && lv.rv.pct != null ? `${lv.rv.pct}%（${esc(lv.rv.label || '')}）` : '—')}
    ${row('同上', (f, lv) => lv && lv.players && lv.players.n != null ? esc(fmtN(lv.players.n)) : '—')}
    ${row('遊玩時間', (f) => esc((f.time || {}).text || '—'))}
    ${row('你的 SCAR 18', (f) => esc(f.rig.verdict))}
    ${row('上市', (f) => esc(f.game.release_text))}
    ${row('一句話', (f) => esc(f.headline))}</table></div>`;
}

/* ---------- 設定 ---------- */
function settingsHtml() {
  const st = S.settings;
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${st[k] === v ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  return `<h3>設定</h3>
    <div class="setrow"><div class="st"><b>換裝</b><small>現在：${esc(SKIN_BY[skinId()].name)}。畫面、字型、音效、配樂、開場一起換</small></div><button class="btn sm y" data-act="skinsheet">${ICON.shirt}<span>換裝</span></button></div>
    <div class="setrow"><div class="st"><b>音效</b><small>${esc(SKIN_BY[skinId()].snd.split('・')[0])}這些聲音（跟著換裝）</small></div>${seg('sfx', [[true, '開'], [false, '關']])}</div>
    <div class="setrow"><div class="st"><b>音效音量</b></div><input type="range" min="0" max="1" step="0.05" value="${st.vol}" data-act="vol" data-k="vol"></div>
    <div class="setrow"><div class="st"><b>背景配樂</b><small>${esc(SKIN_BY[skinId()].snd.split('・').slice(-1)[0])}（跟著換裝）；看預告、滑短影音、語音導讀時會自動停下來</small></div>${seg('bgm', [[true, '開'], [false, '關']])}</div>
    <div class="setrow"><div class="st"><b>配樂音量</b></div><input type="range" min="0" max="0.8" step="0.02" value="${st.bgmVol}" data-act="vol" data-k="bgmVol"></div>
    <div class="setrow"><div class="st"><b>開場動畫</b><small>每天第一次完整噴漆，其他時候短版</small></div>${seg('intro', [['daily', '每天一次'], ['always', '每次'], ['short', '短版'], ['off', '關']])}</div>
    <div class="setrow"><div class="st"><b>特效</b><small>收斂：不震動、不閃光、少噴濺</small></div>${seg('fx', [['full', '全開'], ['calm', '收斂']])}</div>
    <div class="setrow"><div class="st"><b>短影音連播</b><small>開：一支播完自動滑到下一款；關：同一支重複播</small></div>${seg('shAuto', [[true, '開'], [false, '關']])}</div>
    <div class="setrow"><div class="st"><b>短影音聲音</b><small>預告預設要不要出聲（「靜音進入」時一律先靜音）</small></div>${seg('shSound', [[true, '有聲'], [false, '靜音']])}</div>
    <div class="setrow"><div class="st"><b>獵物出現警報</b><small>願望單或想玩的遊戲開始特價時，打開 App 跳出警報（一天最多一次）</small></div>${seg('huntAlert', [[true, '開'], [false, '關']])}</div>
    <div class="setrow"><div class="st"><b>我的標記與筆記</b><small>想玩／玩過、筆記、討論想法、已發佈紀錄，只存在這台裝置</small></div><button class="btn sm" data-act="wipe">清除</button></div>
    <p class="sub-note" style="margin-top:14px">解包 UNPACKED v${VERSION} · 專題 ${S.index ? S.index.n : 0} 篇 · 目錄更新 ${esc(ago(S.index && S.index.at))} · Steam 資料 ${esc(ago(S.live && S.live.at)) || '還沒有'}</p>`;
}
