'use strict';
/* 觀戰 SPECTATE — 特別轉播（2026-11-21）
   《解包》的風暴眼選出「現在最熱的那一款」，這裡把那款遊戲的影片全收在一頁：直播中、中文最新、全球最熱、評測、攻略、實況、新聞。
   名單外的頻道也收（管線另外用關鍵字搜，見 pipeline.py 的 storm_extras），但不會混進轉播台的主清單——只在這一頁出現。
   資料：spectate-data 分支的 storm.json（管線每 20 分鐘寫）；颱風等級、熱度讀《解包》的 data/storm.json（同一個網站）。 */

const ST = { zh: !!store.get('stZh', false), unp: null, unpAt: 0, unpBusy: false };
const ST_CAT = ['', '輕颱', '中颱', '強颱', '超強颱', '史詩級'];

/* 特別轉播的影片併進 IDX.byId（導播台、連播找得到），頻道併進 IDX.ch；不進 IDX.items，所以不會混進轉播台的各排 */
function indexStorm() {
  const s = D.storm;
  if (!s || !s.items) return;
  for (const [id, it] of Object.entries(s.items)) {
    if (IDX.byId.has(id)) continue;
    const x = Object.assign({ so: 1 }, it);   // so：只在特別轉播出現
    if (NE[id] && !x.ne) x.ne = 'embed';
    IDX.byId.set(id, x);
  }
  for (const [c, ch] of Object.entries(s.ch || {})) if (!IDX.ch[c]) IDX.ch[c] = ch;
  MEMO.clear();
}
const stormOn = () => !!(D.storm && D.storm.key);
function stIds(ids) {
  return (ids || []).map((v) => IDX.byId.get(v)).filter((it) => it && !VIEW.blocks[it.c] && (!ST.zh || zf(it)));
}
function stormAll() {   // 連播的順序：直播中 → 中文最新 → 全球最熱 → 其他新片
  const s = D.storm || {}, seen = new Set(), out = [];
  for (const it of stIds([].concat(s.live || [], s.cz || [], s.top || [], s.new || []))) {
    if (seen.has(it.i) || it.lv === 'upcoming') continue;
    seen.add(it.i); out.push(it);
  }
  return out;
}
const stormHas = (id) => { const s = D.storm; return !!(s && s.items && s.items[id]); };
function stormName() {
  const s = D.storm || {}, u = stUnp();
  return (u && (u.cur.short || u.cur.zh)) || (s.g && (s.g.zh || s.g.en)) || '';
}
function stUnp() {   // 《解包》的風暴眼（同一款才用）
  const u = ST.unp, s = D.storm;
  return u && u.cur && s && u.cur.key === s.key ? u : null;
}
function loadUnpStorm(force) {
  if (ST.unpBusy || (!force && Date.now() - ST.unpAt < 10 * 60e3)) return;
  ST.unpBusy = true;
  fetch('../unpacked/data/storm.json?t=' + Math.floor(Date.now() / 6e5), { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null)
    .then((j) => {
      ST.unpBusy = false; ST.unpAt = Date.now();
      const was = JSON.stringify(ST.unp && ST.unp.s);
      if (j && j.cur) ST.unp = j;
      if (j && was !== JSON.stringify(j.s) && ROUTE === 'storm' && !Player.isOpen()) softRefresh();
    });
}

function stSpark(tl) {   // 直播觀看人數（最近 48 小時）
  const pts = (tl || []).filter((p) => p[0] > Date.now() / 6e4 - 48 * 60);
  if (pts.length < 3) return '';
  const W = 300, H = 46, t0 = pts[0][0], t1 = pts[pts.length - 1][0], span = Math.max(60, t1 - t0);
  const mx = Math.max(1, ...pts.map((p) => p[1]));
  const xy = pts.map((p) => `${(((p[0] - t0) / span) * W).toFixed(1)},${(H - 3 - (p[1] / mx) * (H - 8)).toFixed(1)}`);
  const pk = pts.reduce((a, b) => (b[1] > a[1] ? b : a));
  const d = new Date(pk[0] * 6e4);
  return `<div class="stv-spark"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="M0,${H} L${xy.join(' L')} L${W},${H} Z"/><polyline points="${xy.join(' ')}"/></svg>
    <span>直播觀看人數・48 小時　最高 <b>${num(pk[1])}</b>（${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:00）</span></div>`;
}

function vStorm() {
  if (!D.feed && !D.storm) return loadingView();
  loadUnpStorm();
  const s = D.storm;
  if (!stormOn()) {
    return pageHead('特別轉播', 'SPECIAL COVERAGE') + empty('現在沒有特別轉播', '《解包》的風暴眼一選出「現在最熱的那一款」，這裡就開播：那款遊戲的直播、中文最新、全球最熱、評測、攻略、實況，全收在一頁。', '<a class="btn" href="../unpacked/#storm">去《解包》看風暴眼</a>');
  }
  const u = stUnp(), c = u ? u.cur : {}, sm = u ? u.s || {} : {};
  const live = stIds(s.live), cz = stIds(s.cz), top = stIds(s.top), all = stormAll();
  const name = c.zh || (s.g && (s.g.zh || s.g.en)) || '';
  const en = c.en || (s.g && s.g.en) || '';
  const coverVid = (top[0] || cz[0] || live[0] || {}).i;
  const cover = c.img || (c.yt_id ? thumb(c.yt_id, 'maxresdefault') : coverVid ? thumb(coverVid, 'maxresdefault') : '');
  const coverFb = c.yt_id ? thumb(c.yt_id, 'hqdefault') : coverVid ? thumb(coverVid, 'hqdefault') : '';
  const day = c.rel ? Math.floor((Date.now() - Date.parse(c.rel + 'T00:00:00+08:00')) / 864e5) : null;
  const sub = [day != null ? (day >= 0 ? `上市第 ${day + 1} 天` : `倒數 ${-day} 天`) : '', c.plat || ''].filter(Boolean).join('・');
  const cat = sm.cat || 0;
  let h = `<section class="stv">
    <div class="stv-img">${cover ? `<img src="${esc(cover)}" ${coverFb && coverFb !== cover ? `data-fb="${esc(coverFb)}"` : ''} alt="">` : ''}<span class="stv-shade"></span>
      <div class="stv-bar"><span class="stv-sc"><i></i>SPECIAL COVERAGE</span><em>特別轉播</em></div></div>
    <div class="stv-txt">
      ${cat ? `<a class="stv-cat c${cat}" href="../unpacked/#storm"><b>CAT ${cat}</b><span>${ST_CAT[cat]}</span><i>熱度 ${sm.heat || 0}</i></a>` : ''}
      <h1>${esc(name)}</h1>${en && en !== name ? `<div class="stv-en">${esc(en)}</div>` : ''}${sub ? `<div class="stv-sub">${esc(sub)}</div>` : ''}
      <div class="stv-stats">
        <span class="${s.lc ? 'on' : ''}"><b>${s.lc || 0}</b>台直播中</span>
        <span><b>${s.lv ? num(s.lv) : 0}</b>人在看</span>
        <span><b>${s.n24 || 0}</b>支 24 小時新片</span>
        <span><b>${s.zl || 0}</b>台中文直播</span>
      </div>
      ${stSpark(s.tl)}
      <div class="stv-acts">${all.length ? `<button class="go-btn sm" data-act="play-list" data-ctx="${ctxOf('st:all', all)}"><b>▶</b>連播特別轉播</button>` : ''}<a class="chip unp" href="../unpacked/#storm">《解包》風暴眼 ›</a></div>
    </div></section>`;
  h += `<div class="chips">${[[false, '全部語言'], [true, '只看中文']].map(([k, t]) => `<button class="${ST.zh === k ? 'on' : ''}" data-act="st-zh" data-k="${k ? 1 : 0}">${t}</button>`).join('')}</div>`;
  let body = '';
  if (live.length) {
    const ctx = ctxOf('st:live', live);
    body += `<section class="sec live-sec">${secHead('直播中', 'ON AIR', '', `<span class="sh-note">${live.length} 台・照觀看人數排</span>`)}<div class="row big">${live.slice(0, 12).map((it) => card(it, ctx, { big: 1 })).join('')}</div></section>`;
  }
  body += row('st:cz', cz, { zh: '中文最新', en: 'LATEST・中文', max: 20, extra: '<span class="sh-note">台灣、香港的頻道優先</span>' });
  body += row('st:top', top, { zh: '全球最熱', en: 'MOST WATCHED', max: 20, ranked: 1, extra: '<span class="sh-note">七天內、照觀看數</span>' });
  const LN = [['review', '評測', 'REVIEWS'], ['guide', '攻略', 'GUIDES'], ['play', '實況反應', 'LET\'S PLAY'], ['news', '新聞', 'NEWS'], ['trailer', '預告', 'TRAILERS'], ['deep', '深度與幕後', 'DEEP DIVE']];
  for (const [l, zh, en2] of LN) body += row('st:' + l, stIds((s.lanes || {})[l]), { zh, en: en2, max: 20 });
  const rest = stIds(s.new).filter((it) => it.lv !== 'live');
  if (rest.length) body += `<section class="sec">${secHead('全部新片', 'ALL NEW', '', '<span class="sh-note">最新的在前面</span>')}${grid('st:new', rest, { limit: LF.limit })}</section>`;
  h += body || empty(ST.zh ? '還沒有中文的片' : '這款還沒有影片', ST.zh ? '換成「全部語言」看看國外的。' : '管線下一輪（20 分鐘內）會去搜。');
  const age = s.at ? Math.round((Date.now() - Date.parse(s.at)) / 60000) : null;
  h += `<div class="foot">特別轉播 ${age == null ? '' : age < 2 ? '剛剛' : age + ' 分鐘前'}更新・名單外的頻道也收，只放在這一頁・換一款由《解包》的風暴眼決定</div>`;
  return h;
}
