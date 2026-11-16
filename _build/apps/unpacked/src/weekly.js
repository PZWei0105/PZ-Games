/* 解包 — 每週懶人包：每週日晚上由排程寫好（data/weekly/<YYYY-Www>.json；目錄 data/weekly.json），
   App 做成遊戲的「本週結算」畫面（MVP、Tier 表、本週大事、下週出擊、特價戰利品、數據王）＋粉專出稿（貼文、標題、口播稿、三種圖卡）。
   還沒結算的這一週：用目錄資料即時算出「進行中」面板與結算倒數。 */
const WEEK = { cd: 0, card: { kind: 'cover', ratio: '45', seed: 1 } };
const TIERS = ['S', 'A', 'B', 'C', 'D'];
const TIER_COL = { S: '#FF2E88', A: '#FFE600', B: '#7dff9a', C: '#6cc6ff', D: '#9a9a9a' };

/* ISO 週（週一到週日） */
function isoWeekOf(ds) {
  const d = new Date(ds + 'T00:00:00Z'); const day = (d.getUTCDay() + 6) % 7;
  const mon = new Date(+d - day * 864e5); const thu = new Date(+mon + 3 * 864e5);
  const y = thu.getUTCFullYear(); const jan4 = new Date(Date.UTC(y, 0, 4));
  const w1 = new Date(+jan4 - ((jan4.getUTCDay() + 6) % 7) * 864e5);
  const w = Math.round((mon - w1) / (7 * 864e5)) + 1;
  const iso = (x) => x.toISOString().slice(0, 10);
  return { id: `${y}-W${String(w).padStart(2, '0')}`, y, w, from: iso(mon), to: iso(new Date(+mon + 6 * 864e5)) };
}
const wkNo = (id) => +String(id).split('-W')[1];
const dotDay = (d) => d.slice(5).replace('-', '.');
async function loadWeek(id) {
  S.weekF = S.weekF || {};
  if (S.weekF[id]) return S.weekF[id];
  S.weekF[id] = await getJSON('weekly/' + id + '.json');
  return S.weekF[id];
}
function wkRef(ref) {
  const [k, id] = String(ref || '').split(':');
  const it = k === 'f' ? (S.index.items || []).find((x) => x.id === id) : k === 'p' ? ((S.picks && S.picks.items) || []).find((x) => x.id === id) : null;
  return it ? { it, route: (k === 'f' ? 'f/' : 'p/') + id, kind: k } : null;
}
function weekItems(from, to) {
  const f = (S.index.items || []).filter((x) => x.date >= from && x.date <= to).map((it) => ({ it, ref: 'f:' + it.id, route: 'f/' + it.id }));
  const p = ((S.picks && S.picks.items) || []).filter((x) => x.date >= from && x.date <= to).map((it) => ({ it, ref: 'p:' + it.id, route: 'p/' + it.id }));
  return [...f, ...p].sort((a, b) => (a.it.date < b.it.date ? 1 : -1));
}
function latestWeek() { return ((S.weekly && S.weekly.items) || [])[0] || null; }
function weekFresh() { const w = latestWeek(); return w && dayDiff(w.to, todayTW()) <= 3 ? w : null; }
function weekUnposted() { return ((S.weekly && S.weekly.items) || []).filter((w) => !S.posted['w:' + w.id]).length; }

/* ---- 現在正在特價（獵物＋解包過、推坑過的） ---- */
function dealsNow() {
  const out = new Map(); const refs = steamRefs();
  for (const t of huntTargets()) if ((t.onSale || t.giveaway) && t.appid) out.set(String(t.appid), { key: t.key, name: t.name, img: t.img, disc: t.disc, final: t.final, low: t.lowState, act: 'hinfo' });
  for (const [a, lv] of Object.entries((S.live && S.live.apps) || {})) {
    if (out.has(a) || !lv.price || !(lv.price.disc > 0)) continue;
    const r = refs[a]; if (!r) continue;
    out.set(a, { name: r.it.zh, img: headerOf(r.it, lv), disc: lv.price.disc, final: lv.price.final, route: r.route });
  }
  return [...out.values()].sort((a, b) => b.disc - a.disc).slice(0, 8);
}
/* ---- 數據王（目前的 Steam 即時數據，不是週末快照） ---- */
function statKings(list) {
  const rows = list.map((x) => ({ x, lv: liveOf(x.it.steam) })).filter((r) => r.lv);
  const best = (fn) => rows.filter((r) => fn(r) != null).sort((a, b) => fn(b) - fn(a))[0];
  const out = [];
  const pl = best((r) => r.lv.players && r.lv.players.n); if (pl) out.push(['同上人數王', pl, fmtN(pl.lv.players.n), '人在玩']);
  const rv = best((r) => (r.lv.rv && r.lv.rv.n >= 100 ? r.lv.rv.pct : null)); if (rv) out.push(['好評率王', rv, rv.lv.rv.pct + '%', `${fmtN(rv.lv.rv.n)} 則評價`]);
  const up = best((r) => (r.lv.players && r.lv.players.d24 > 0 ? r.lv.players.d24 : null)); if (up) out.push(['24 小時暴漲', up, '▲' + up.lv.players.d24 + '%', '同上人數']);
  return out;
}

/* ---- 畫面 ---- */
function weekLiveHtml(cur) {
  const list = weekItems(cur.from, cur.to);
  const nf = list.filter((x) => x.ref[0] === 'f').length, np = list.length - nf;
  const sale = huntTargets().filter((t) => t.onSale || t.giveaway).length;
  return `<section class="wk-live"><div class="wkl-h"><span class="wk-no sm">WEEK<b>${cur.w}</b></span><span class="wkl-s">進行中</span>
      <span class="wkl-cd">結算倒數<b id="wkcd">${esc(wkCountdown(cur))}</b></span></div>
    <div class="wkl-r">${esc(dotDay(cur.from))} – ${esc(dotDay(cur.to))}・週日晚上結算：排 Tier 表、選 MVP、整理本週大事和下週上市，粉專貼文和圖卡一起寫好</div>
    <div class="wk-stats sm"><div><b>${nf}</b><span>解包</span></div><div><b>${np}</b><span>推坑</span></div><div><b>${sale}</b><span>特價獵物</span></div></div>
    ${list.length ? `<div class="hscroll">${list.map((x, i) => (x.ref[0] === 'f' ? miniHtml(x.it, i) : pickMini(x.it, i))).join('')}</div>` : '<div class="empty" style="padding:8px 2px">這週還沒有新的專題和推坑。</div>'}</section>`;
}
function wkCountdown(cur) {
  const end = Date.parse(cur.to + 'T21:00:00+08:00') - Date.now();
  if (end <= 0) return '結算中…';
  const d = Math.floor(end / 864e5), h = Math.floor(end % 864e5 / 36e5), m = Math.floor(end % 36e5 / 6e4), s = Math.floor(end % 6e4 / 1e3);
  return `${d ? d + ' 天 ' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function weekArchive(curId) {
  const items = (S.weekly && S.weekly.items) || []; if (items.length < 2 && (!items.length || items[0].id === curId)) return '';
  return `<h3 class="tape-h">歷屆週報</h3><div class="wk-arch">${items.map((w) => `<button class="wka ${w.id === curId ? 'on' : ''}" data-go="week/${esc(w.id)}"><b>W${wkNo(w.id)}</b><span>${esc(dotDay(w.from))}–${esc(dotDay(w.to))}</span><i>${esc(w.title)}</i></button>`).join('')}</div>`;
}
async function renderWeek(arg) {
  const cur = isoWeekOf(todayTW());
  const items = (S.weekly && S.weekly.items) || [];
  const id = arg || (items[0] && items[0].id);
  let html = `<div class="sec-h"><h2 class="spray-h">每週懶人包</h2><span class="date-stk">WEEKLY</span></div>`;
  if (!arg && (!items[0] || items[0].id !== cur.id)) html += weekLiveHtml(cur);
  if (!id) {
    return html + `<div class="empty">第一份週報會在 ${esc(mdDay(cur.to))}（日）晚上結算出爐：這一週解包和推坑的遊戲排成 Tier 表、選出本週 MVP，加上本週大事、下週上市，粉專貼文和三張圖卡也會一起準備好。</div>`;
  }
  const wk = await loadWeek(id);
  S.curWeek = wk;
  return html + weekSettleHtml(wk) + weekArchive(id);
}
function weekSettleHtml(wk) {
  const list = weekItems(wk.from, wk.to);
  const nf = list.filter((x) => x.ref[0] === 'f').length, np = list.length - nf;
  const mvp = wkRef(wk.mvp && wk.mvp.ref);
  const mlv = mvp && liveOf(mvp.it.steam);
  const mimg = mvp ? heroOf(mvp.it, mlv) : '';
  const tiers = TIERS.map((t) => [t, (wk.tiers || []).filter((x) => x.tier === t)]).filter(([, a]) => a.length);
  const deals = dealsNow(); const kings = statKings(list.length ? list : weekItems('0000', '9999'));
  const srcs = wk.sources || [];
  const sl = (ss) => (ss || []).map((j) => srcs[j]).filter(Boolean).map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a>`).join('、');
  return `<section class="wk-hero" id="wkhero"><div class="wk-rays"></div>
      <div class="wk-no"><span>WEEK</span><b>${wkNo(wk.id)}</b></div><div class="wk-range">${esc(dotDay(wk.from))} – ${esc(dotDay(wk.to))}</div>
      <h1 class="wk-title">${esc(wk.title)}</h1>
      <div class="wk-bar"><i></i><span>本週結算 COMPLETE</span></div>
      <div class="wk-stats"><div><b class="cu" data-n="${nf}" data-f="i">${nf}</b><span>解包</span></div><div><b class="cu" data-n="${np}" data-f="i">${np}</b><span>推坑</span></div><div><b class="cu" data-n="${(wk.news || []).length}" data-f="i">${(wk.news || []).length}</b><span>大事</span></div><div><b class="cu" data-n="${(wk.next || []).length}" data-f="i">${(wk.next || []).length}</b><span>下週上市</span></div></div></section>
    <p class="wk-intro">${esc(wk.intro)}<span class="lt-sign">— Claude</span></p>
    ${mvp ? `<section class="mvp" data-go="${esc(mvp.route)}"><div class="mvp-rays"></div><div class="mvp-img">${mimg ? `<img src="${esc(mimg)}" alt="" onerror="imgFail(this)">` : ''}<div class="ph" style="${mimg ? 'display:none' : ''}">MVP</div><div class="ht"></div></div>
      <svg class="mvp-crown" viewBox="0 0 120 70"><path d="M8 62 4 14l30 22L60 4l26 32 30-22-4 48z" fill="#FFE600" stroke="#111" stroke-width="5" stroke-linejoin="round"/><circle cx="60" cy="40" r="7" fill="#FF2E88" stroke="#111" stroke-width="3"/></svg>
      <span class="mvp-tag">本週 MVP</span><div class="mvp-b"><h2>${esc(mvp.it.zh)}</h2><p>${esc(wk.mvp.why)}</p></div><div class="mvp-seal wait">MVP</div></section>` : ''}
    ${tiers.length ? `<h3 class="tape-h p">本週 TIER 表</h3>
    <div class="tiers" id="tiers">${tiers.map(([t, a]) => `<div class="tier"><b class="tl" style="background:${TIER_COL[t]}">${t}</b><div class="tt">${a.map((x, i) => { const r = wkRef(x.ref); if (!r) return ''; const img = headerOf(r.it, liveOf(r.it.steam)) || heroOf(r.it); return `<button class="tile" data-go="${esc(r.route)}" style="--i:${i}"><span class="ti">${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="imgFail(this)">` : ''}<span class="ph" style="${img ? 'display:none' : ''}">?</span></span><span class="tn">${esc(r.it.zh)}</span>${r.kind === 'p' ? '<i class="tk">推坑</i>' : ''}</button>`; }).join('')}</div></div>`).join('')}</div>` : ''}
    <div class="tlines">${(wk.tiers || []).map((x) => { const r = wkRef(x.ref); return r ? `<div class="tlr" data-go="${esc(r.route)}"><b style="background:${TIER_COL[x.tier] || '#999'}">${esc(x.tier)}</b><div><h4>${esc(r.it.zh)}</h4><p>${esc(x.line)}</p></div></div>` : ''; }).join('')}</div>
    ${(wk.news || []).length ? `<h3 class="tape-h">本週大事</h3><div class="wnews">${wk.news.map((n, i) => `<div class="wn" style="--rot:${rot(wk.id + n.h, i, 1)}deg"><b class="wn-i">${String(i + 1).padStart(2, '0')}</b><h4>${esc(n.h)}</h4><p>${esc(n.t)}</p>${(n.s || []).length ? `<div class="wn-s">來源：${sl(n.s)}</div>` : ''}</div>`).join('')}</div>` : ''}
    ${(wk.next || []).length ? `<h3 class="tape-h y">下週出擊 <button class="btn sm k" data-go="cal" style="margin-left:8px;vertical-align:2px">${ICON.cal}<span>出擊日曆</span></button></h3><div class="wnext">${wk.next.map((n) => { const r = n.ref && wkRef(n.ref); const d = new Date(n.d + 'T00:00:00Z'); return `<div class="wx" ${r ? `data-go="${esc(r.route)}"` : ''}><div class="wx-d"><b>${esc(n.d.length > 7 ? mdDay(n.d) : n.d.slice(0, 7).replace('-', '/'))}</b><span>${n.d.length > 7 ? '週' + WK[d.getUTCDay()] : '日期未定'}</span></div><div class="wx-b"><h4>${esc(n.name)}${r ? ' <i>已解包</i>' : ''}</h4><p>${esc(n.t)}</p>${(n.s || []).length ? `<div class="wn-s">來源：${sl(n.s)}</div>` : ''}</div></div>`; }).join('')}</div>` : ''}
    ${deals.length ? `<h3 class="tape-h p">特價戰利品 <small>現在正在特價</small></h3><div class="hscroll">${deals.map((d, i) => `<div class="mini dl" ${d.route ? `data-go="${esc(d.route)}"` : `data-act="hinfo" data-k="${esc(d.key)}"`} style="--rot:${rot(d.name, i, 1.2)}deg"><div class="pimg">${d.img ? `<img src="${esc(d.img)}" alt="" loading="lazy" onerror="imgFail(this)">` : ''}<div class="ph" style="${d.img ? 'display:none' : ''}">SALE</div></div><span class="dl-d">-${d.disc}%</span><div class="mb"><h4>${esc(d.name)}</h4><div class="md">${d.final === 0 ? '免費領' : esc(fmtNT(d.final))}${d.low === 'low' && d.final ? ' · 史低' : ''}</div></div></div>`).join('')}<div class="mini pkm more" data-go="hunt"><div class="mm">${ICON.target}<b>去獵價</b><span>全部獵物</span></div></div></div>` : ''}
    ${kings.length ? `<h3 class="tape-h">數據王 <small>Steam 即時</small></h3><div class="kings">${kings.map(([k, r, v, s], i) => `<div class="king" data-go="${esc(r.x.route)}" style="--rot:${rot(k, i, 1.6)}deg"><span class="kk">${esc(k)}</span><b>${esc(v)}</b><span class="ks">${esc(s)}</span><h4>${esc(r.x.it.zh)}</h4></div>`).join('')}</div>` : ''}
    ${wk.deals ? `<div class="deal" style="margin-top:16px"><b>這週買遊戲的重點</b><p>${esc(wk.deals)}</p></div>` : ''}
    <div class="endcta"><button class="btn p" data-go="fan/w:${esc(wk.id)}">${ICON.mega}<span>出成粉專貼文</span></button><button class="btn k" data-go="home">回今日</button></div>
    ${srcs.length ? `<details class="wsrc"><summary>這份週報的 ${srcs.length} 個來源</summary><ol class="srcs">${srcs.map((s, i) => `<li><b>${i + 1}</b><a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a>${s.d ? `（${esc(s.d)}）` : ''}</li>`).join('')}</ol></details>` : ''}
    <p class="sub-note" style="margin-top:12px">週報寫於 ${esc(wk.date)}。Tier 表與 MVP 是 Claude 這週玩過資料、看過評價後的排法；特價和數據王是現在的 Steam 即時資料。</p>`;
}
/* 進場：WEEK 數字砸下、結算條跑完、數字跳上來、Tier 方塊一個個拍上去、MVP 印章蓋下 */
function weekFx() {
  clearInterval(WEEK.cd);
  const cd = $('#wkcd');
  if (cd) { const cur = isoWeekOf(todayTW()); WEEK.cd = setInterval(() => { if (!cd.isConnected) { clearInterval(WEEK.cd); return; } cd.textContent = wkCountdown(cur); }, 1000); }
  const hero = $('#wkhero');
  if (hero) {
    hero.classList.add('go');
    if (fxOn()) {
      setTimeout(() => { sfx.drop(); haptic(25); burstAt($('.wk-no b', hero), [YEL, PINK, BLK], 30, 14); shake(8, 260); }, 260);
      setTimeout(() => sfx.riser(), 420);
      setTimeout(() => { sfx.ding(); countUp($('.wk-stats', hero)); }, 1150);
    } else countUp($('.wk-stats', hero));
  }
  const tiers = $('#tiers');
  if (tiers) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const tiles = $$('.tile', tiers);
      tiers.classList.add('go');
      tiles.forEach((t, i) => setTimeout(() => { t.classList.add('in'); sfx.slap(); if (i === 0) burstAt(t, [PINK, YEL], 14, 8); }, 120 + i * 120));
    }, { threshold: 0.35 });
    io.observe(tiers); FIO.push(io);
  }
  const seal = $('.mvp-seal');
  if (seal) {
    const io2 = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io2.disconnect();
      seal.classList.remove('wait'); seal.classList.add('go');
      setTimeout(() => { sfx.stamp(); impact(seal, [YEL, PINK, BLK], false); }, 240);
    }, { threshold: 0.6 });
    io2.observe(seal); FIO.push(io2);
  }
}
function weekStop() { clearInterval(WEEK.cd); }

/* 首頁：剛結算的週報橫幅 */
function weekBanner() {
  const w = weekFresh(); if (!w) return '';
  const tops = (w.top || []).map(wkRef).filter(Boolean).slice(0, 4);
  return `<div class="wk-ban" data-go="week/${esc(w.id)}"><div class="wb-l"><span class="wk-no sm">WEEK<b>${wkNo(w.id)}</b></span><span class="wb-k">結算出爐</span></div>
    <div class="wb-b"><b>${esc(w.title)}</b>${w.mvp_name ? `<span>MVP：${esc(w.mvp_name)}</span>` : ''}</div>
    ${tops.length ? `<div class="wb-t">${tops.map((r) => { const img = headerOf(r.it, liveOf(r.it.steam)); return img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : ''; }).join('')}</div>` : ''}</div>`;
}

/* ---------- 粉專出稿：週報 ---------- */
async function renderWeekFan(id) {
  const wk = await loadWeek(id); const fp = wk.fanpage || {}; const key = 'w:' + id;
  const post = S.edits[key] != null ? S.edits[key] : fp.post || '';
  const C = WEEK.card;
  return `<div class="fan-detail"><div class="btnrow" style="margin-top:14px"><button class="btn sm k" data-go="fan">← 出稿台</button><button class="btn sm" data-go="week/${esc(id)}">看週報</button></div>
    <h2 class="spray-h" style="margin:16px 0 18px">WEEK ${wkNo(id)} 懶人包</h2><p class="sub-note">${esc(wk.title)}</p>
    <div class="cardwrap"><canvas id="cardcv" width="1080" height="1350"></canvas><div class="cardbusy" id="cardbusy">噴漆中…</div></div>
    <div class="btnrow" style="justify-content:center">${[['cover', '封面'], ['tier', 'Tier 表'], ['next', '下週出擊']].map(([k, l]) => `<button class="btn sm ${C.kind === k ? 'y' : ''}" data-act="wkk" data-v="${k}">${l}</button>`).join('')}<button class="btn sm ${C.ratio === '45' ? 'y' : ''}" data-act="cr" data-v="45">4:5 直式</button><button class="btn sm ${C.ratio === '11' ? 'y' : ''}" data-act="cr" data-v="11">1:1 方形</button></div>
    <div class="btnrow" style="justify-content:center"><button class="btn p" data-act="respray">${ICON.can}<span>重噴一張</span></button><button class="btn y" data-act="cdl">${ICON.dl}<span>下載這張</span></button>${navigator.share ? `<button class="btn" data-act="cshare">${ICON.share}<span>分享這張</span></button>` : ''}<button class="btn" data-act="wkall">${ICON.dl}<span>三張一起下載</span></button></div>
    <p class="sub-note" style="text-align:center">三張依序是封面、Tier 表、下週出擊，適合發成一則多圖貼文。</p>
    <div class="copybox"><h4>粉專貼文 <span class="cnt" id="postcnt">${post.length} 字</span></h4><textarea id="posttxt" data-act="postedit">${esc(post)}</textarea>
      <div class="btnrow"><button class="btn y sm" data-act="copy" data-what="post">${ICON.copy}<span>複製貼文</span></button><button class="btn p sm" data-act="copy" data-what="full">${ICON.copy}<span>貼文＋hashtag</span></button>${S.edits[key] != null ? '<button class="btn sm" data-act="postreset">還原原稿</button>' : ''}</div></div>
    <div class="copybox"><h4>三個標題（A/B 測試用）</h4>${(fp.titles || []).map((t, i) => `<div class="tline"><b>${'ABC'[i]}</b><span>${esc(t)}</span><button class="btn sm" data-act="copy" data-what="title" data-i="${i}">複製</button></div>`).join('')}</div>
    <div class="copybox"><h4>Hashtag</h4><div class="htags">${(fp.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div><div class="btnrow"><button class="btn sm" data-act="copy" data-what="tags">${ICON.copy}<span>複製 hashtag</span></button></div></div>
    <div class="copybox"><h4>60 秒口播稿（Shorts／Reels）</h4><div class="txt">${esc(fp.script || '')}</div><div class="btnrow"><button class="btn sm" data-act="copy" data-what="script">${ICON.copy}<span>複製口播稿</span></button></div></div>
    <div class="copybox"><h4>素材標註</h4><div class="txt">${esc(fp.credit || '')}</div></div>
    <div class="endcta"><button class="btn ${S.posted[key] ? '' : 'p'}" data-act="posted">${S.posted[key] ? '已發佈（點一下取消）' : '標記為已發佈'}</button></div></div>`;
}
async function weekCardRender() {
  const cv = $('#cardcv'); if (!cv || !S.curWeek) return;
  const busy = $('#cardbusy'); if (busy) busy.style.display = 'grid';
  try { await drawWeekCard(cv, S.curWeek, WEEK.card); } catch (e) { console.warn(e); toast('圖卡畫不出來：' + e.message, 'warn'); }
  if (busy) busy.style.display = 'none';
}
/* 粉專出稿台上的週報按鈕；處理了就回傳 true */
async function weekFanAct(a, act, id) {
  const key = 'w:' + id; const wk = await loadWeek(id); S.curWeek = wk; const fp = wk.fanpage || {}; const C = WEEK.card;
  if (a === 'wkk' || a === 'cr' || a === 'respray') {
    if (a === 'wkk') C.kind = act.dataset.v; if (a === 'cr') C.ratio = act.dataset.v;
    if (a === 'respray') { C.seed++; sfx.rattle(); setTimeout(() => sfx.hiss(0.6), 200); } else sfx.click();
    $$('[data-act="wkk"]').forEach((b) => b.classList.toggle('y', b.dataset.v === C.kind)); $$('[data-act="cr"]').forEach((b) => b.classList.toggle('y', b.dataset.v === C.ratio));
    await weekCardRender(); if (a === 'respray') burstAt($('#cardcv'), [PINK, YEL, BLK], 26, 12); return true;
  }
  if (a === 'cdl' || a === 'cshare' || a === 'wkall') {
    const kinds = a === 'wkall' ? ['cover', 'tier', 'next'] : [C.kind];
    const files = [];
    for (const k of kinds) {
      let b;
      if (a === 'wkall' && k !== C.kind) { const off = document.createElement('canvas'); await drawWeekCard(off, wk, Object.assign({}, C, { kind: k })); b = await new Promise((res) => { try { off.toBlob(res, 'image/png'); } catch (e) { res(null); } }); }
      else b = await cardBlob();
      if (!b) { toast('這張圖卡含有外部圖片，裝置不讓存。換「重噴一張」再試，或直接截圖。', 'warn'); return true; }
      files.push(new File([b], `unpacked-${id}-${['cover', 'tier', 'next'].indexOf(k) + 1}-${k}.png`, { type: 'image/png' }));
    }
    if ((a === 'cshare' || a === 'wkall') && navigator.canShare && navigator.canShare({ files })) { try { await navigator.share({ files, title: '遊戲狂想曲' }); sfx.ding(); } catch (e) { /* 取消 */ } return true; }
    for (const f of files) { const u = URL.createObjectURL(f); const l = document.createElement('a'); l.href = u; l.download = f.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); await sleep(300); }
    sfx.stamp(); impact($('#cardcv'), [PINK, YEL], false); toast(files.length > 1 ? '三張圖卡已下載' : '圖卡已下載'); return true;
  }
  if (a === 'copy') {
    const post = $('#posttxt') ? $('#posttxt').value : fp.post; const w = act.dataset.what;
    const text = w === 'post' ? post : w === 'full' ? post + '\n\n' + (fp.tags || []).join(' ') : w === 'title' ? fp.titles[+act.dataset.i] : w === 'tags' ? (fp.tags || []).join(' ') : fp.script;
    if (await copyText(text)) { sfx.stamp(); haptic(); burstAt(act, [YEL, PINK, BLK], 14, 8); toast('已複製'); } else toast('複製失敗，請長按文字自己複製', 'warn');
    return true;
  }
  if (a === 'postreset') { delete S.edits[key]; save('edits'); route(); return true; }
  if (a === 'posted') {
    if (S.posted[key]) delete S.posted[key]; else S.posted[key] = todayTW(); save('posted');
    act.textContent = S.posted[key] ? '已發佈（點一下取消）' : '標記為已發佈'; act.classList.toggle('p', !S.posted[key]);
    if (S.posted[key]) { sfx.ding(); impact(act, [RED, YEL, BLK], true); toast('蓋章！已發佈'); } else sfx.scratch();
    setTabs('fan'); return true;
  }
  return false;
}

/* ---------- 週報圖卡：封面／Tier 表／下週出擊（1080×1350 或 1080×1080） ---------- */
async function drawWeekCard(cv, wk, opt) {
  const W = 1080, H = opt.ratio === '11' ? 1080 : 1350; cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); const R = rnd(opt.seed * 7919 + hashStr(wk.id + opt.kind)); const sq = opt.ratio === '11';
  const fp = wk.fanpage || {}; const cover = fp.cover || {};
  const names = (wk.tiers || []).map((x) => (wkRef(x.ref) || {}).it).filter(Boolean).map((x) => x.zh);
  const allText = [cover.kicker, cover.title, cover.sub, wk.title, ...names, ...(wk.next || []).map((n) => n.name + n.t), '遊戲狂想曲本週下週出擊上市MVPTIER表日一二三四五六', fp.credit].join('');
  try { await Promise.race([Promise.all([document.fonts.load(`900 80px ${CFONT}`, allText), document.fonts.load(`700 40px ${CFONT}`, allText), document.fonts.load('400 40px "Bebas Neue"', 'WEEK 0123456789 GAME RHAPSODY')]), sleep(4000)]); } catch (e) { /* 系統字 */ }
  c.textAlign = 'left'; c.textBaseline = 'top';
  const dark = opt.kind === 'tier';
  if (dark) { c.fillStyle = '#111'; c.fillRect(0, 0, W, H); halftone(c, W, H, 'rgba(255,255,255,.07)', 16, 2.6); }
  else {
    c.fillStyle = '#FFE600'; c.fillRect(0, 0, W, H);
    c.save(); c.translate(W * 0.82, H * 0.16); c.fillStyle = 'rgba(0,0,0,.045)';
    for (let i = 0; i < 24; i++) { c.rotate(Math.PI / 12); c.beginPath(); c.moveTo(0, 0); c.lineTo(1800, -120); c.lineTo(1800, 120); c.closePath(); c.fill(); }
    c.restore(); halftone(c, W, H, 'rgba(0,0,0,.09)', 18, 3.2);
  }
  [[W * 0.05, H * 0.1], [W * 0.95, H * 0.06], [W * 0.94, H * 0.62], [W * 0.05, H * 0.7], [W * 0.6, H * 0.985]].forEach(([x, y], i) => blobAt(c, x + (R() - 0.5) * 60, y + (R() - 0.5) * 60, 22 + R() * 34, i % 2 ? (dark ? '#FFE600' : '#111') : '#FF2E88', R));
  const weekNoTag = (x, y, ang, inv) => { c.save(); c.translate(x, y); c.rotate(ang); c.font = '400 64px "Bebas Neue",sans-serif'; const t = `WEEK ${wkNo(wk.id)}  ·  ${dotDay(wk.from)}–${dotDay(wk.to)}`; const tw = c.measureText(t).width + 50; c.fillStyle = '#111'; c.fillRect(8, 8, tw, 82); c.fillStyle = inv ? '#FFE600' : '#FF2E88'; c.fillRect(0, 0, tw, 82); c.strokeStyle = '#111'; c.lineWidth = 4; c.strokeRect(0, 0, tw, 82); c.fillStyle = inv ? '#111' : '#fff'; c.textBaseline = 'middle'; c.fillText(t, 25, 46); c.restore(); };
  if (opt.kind === 'cover') {
    // 膠帶標語
    c.font = `900 40px ${CFONT}`; const kick = cover.kicker || '每週遊戲懶人包'; const kw = Math.min(W - 90, c.measureText(kick).width + 56);
    c.save(); c.translate(44 + kw / 2, 84); c.rotate(-0.035); c.fillStyle = '#111'; c.fillRect(-kw / 2, -32, kw, 64); c.fillStyle = '#FFE600'; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText(kick, 0, 3, kw - 30); c.restore();
    c.textAlign = 'left'; c.textBaseline = 'top';
    // 巨大週數
    c.save(); c.translate(52, sq ? 132 : 150); c.rotate(-0.03);
    c.font = `400 ${sq ? 200 : 236}px "Bebas Neue",sans-serif`; const wt = 'WEEK ' + wkNo(wk.id);
    for (let k = 4; k >= 1; k--) { c.fillStyle = k === 4 ? '#111' : '#FF2E88'; c.fillText(wt, k * 7, k * 7); }
    c.fillStyle = '#fff'; c.lineWidth = 12; c.strokeStyle = '#111'; c.lineJoin = 'round'; c.strokeText(wt, 0, 0); c.fillText(wt, 0, 0); c.restore();
    let y = sq ? 340 : 400;
    c.save(); c.translate(W - 60, y - 34); c.rotate(0.05); c.font = '400 48px "Bebas Neue",sans-serif'; const dr = `${dotDay(wk.from)} – ${dotDay(wk.to)}`; const dw = c.measureText(dr).width + 40; c.fillStyle = '#111'; c.fillRect(-dw, 0, dw, 64); c.fillStyle = '#FFE600'; c.textBaseline = 'middle'; c.fillText(dr, -dw + 20, 34); c.restore();
    y += 46;
    const tl = String(cover.title || wk.title).split('\n').slice(0, 2);
    const ts = fitSize(c, tl, W - 120, sq ? 74 : 86, 48);
    tl.forEach((ln, i) => stepText(c, ln, 54, y + i * ts * 1.18, ts, '#111', '#fff'));
    y += tl.length * ts * 1.18 + 30;
    // MVP 撕紙框
    const mvp = wkRef(wk.mvp && wk.mvp.ref);
    const im = mvp ? await loadImgCors(heroOf(mvp.it, liveOf(mvp.it.steam))) : null;
    const bottom = H - (sq ? 170 : 230); const ih = Math.max(200, bottom - y - 20); const iw = W - 120, ix = 60, iy = y;
    c.save(); c.translate(W / 2, iy + ih / 2); c.rotate(-0.018); c.translate(-W / 2, -(iy + ih / 2));
    tornPath(c, ix - 16, iy - 16, iw + 32, ih + 32, R, 10); c.fillStyle = '#111'; c.save(); c.translate(10, 10); c.fill(); c.restore();
    tornPath(c, ix - 16, iy - 16, iw + 32, ih + 32, R, 10); c.fillStyle = '#fff'; c.fill();
    c.save(); c.beginPath(); c.rect(ix, iy, iw, ih); c.clip();
    if (im) coverDraw(c, im, ix, iy, iw, ih); else { c.fillStyle = '#222'; c.fillRect(ix, iy, iw, ih); }
    const g = c.createLinearGradient(0, iy + ih * 0.55, 0, iy + ih); g.addColorStop(0, 'rgba(17,17,17,0)'); g.addColorStop(1, 'rgba(17,17,17,.88)'); c.fillStyle = g; c.fillRect(ix, iy, iw, ih);
    if (mvp) { c.font = `900 ${sq ? 46 : 54}px ${CFONT}`; c.fillStyle = '#FFE600'; c.textBaseline = 'alphabetic'; c.fillText(mvp.it.zh, ix + 28, iy + ih - 30, iw - 220); c.textBaseline = 'top'; }
    else { c.fillStyle = '#FFE600'; c.font = `900 ${sq ? 40 : 46}px ${CFONT}`; (wk.news || []).slice(0, 3).forEach((n, i) => c.fillText(`${String(i + 1).padStart(2, '0')}  ${n.h}`, ix + 28, iy + 34 + i * (sq ? 62 : 74), iw - 56)); }
    c.restore(); c.restore();
    tape(c, ix + 40, iy - 10, 170, 46, -0.5); tape(c, ix + iw - 40, iy - 6, 170, 46, 0.45);
    // MVP 皇冠章
    if (mvp) {
    c.save(); c.translate(W - 170, iy + 70); c.rotate(-0.22);
    c.fillStyle = '#FF2E88'; c.beginPath(); c.arc(6, 6, 92, 0, 7); c.fillStyle = '#111'; c.fill();
    c.beginPath(); c.arc(0, 0, 92, 0, 7); c.fillStyle = '#FF2E88'; c.fill(); c.lineWidth = 6; c.strokeStyle = '#111'; c.stroke();
    c.fillStyle = '#FFE600'; c.strokeStyle = '#111'; c.lineWidth = 5; c.beginPath(); c.moveTo(-44, -6); c.lineTo(-50, -52); c.lineTo(-22, -30); c.lineTo(0, -62); c.lineTo(22, -30); c.lineTo(50, -52); c.lineTo(44, -6); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.font = '400 66px "Bebas Neue",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MVP', 0, 34); c.restore();
    }
    c.textAlign = 'left'; c.textBaseline = 'top';
    // 這週還有
    const others = names.filter((n) => !mvp || n !== mvp.it.zh);
    if (others.length) {
      c.font = `900 ${sq ? 30 : 34}px ${CFONT}`; c.fillStyle = '#111';
      let line = '本週還有：', k = 0;
      for (; k < others.length; k++) { const t = line + (k ? '、' : '') + others[k]; const rest = others.length - k - 1; if (c.measureText(t + (rest ? ` 等 ${others.length} 款` : '')).width > W - 400) break; line = t; }
      if (!k) line += others[0].slice(0, 8) + '…';
      if (k && k < others.length) line += ` 等 ${others.length} 款`;
      c.fillText(line, 56, bottom + 10);
    }
  } else if (opt.kind === 'tier') {
    stepText(c, '本週遊戲 TIER 表', 54, 56, sq ? 72 : 84, '#FFE600', '#111');
    weekNoTag(56, sq ? 158 : 176, -0.02, true);
    const rows = TIERS.map((t) => [t, (wk.tiers || []).filter((x) => x.tier === t).map((x) => wkRef(x.ref)).filter(Boolean)]).filter(([, a]) => a.length);
    const top = sq ? 270 : 300, bottom = H - (sq ? 150 : 190), perLine = 3;
    const lines = rows.reduce((n, [, a]) => n + Math.ceil(a.length / perLine), 0) || 1;
    const gap = 16; const lineH = Math.min(260, (bottom - top - gap * (rows.length - 1)) / lines);
    const lx = 50, lw = 130, tx0 = lx + lw + 16, tw = (W - tx0 - 50 - (perLine - 1) * 14) / perLine;
    let y = top;
    for (const [t, a] of rows) {
      const n = Math.ceil(a.length / perLine); const rh = n * lineH;
      c.fillStyle = '#111'; c.fillRect(lx + 6, y + 6, lw, rh - 8); c.fillStyle = TIER_COL[t]; c.fillRect(lx, y, lw, rh - 8); c.strokeStyle = '#111'; c.lineWidth = 4; c.strokeRect(lx, y, lw, rh - 8);
      c.fillStyle = '#111'; c.font = `400 ${Math.min(120, rh * 0.6)}px "Bebas Neue",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, lx + lw / 2, y + (rh - 8) / 2 + 6); c.textAlign = 'left'; c.textBaseline = 'top';
      const imgs = await Promise.all(a.map((r) => loadImgCors(headerOf(r.it, liveOf(r.it.steam)) || heroOf(r.it))));
      a.forEach((r, i) => {
        const col = i % perLine, ln = Math.floor(i / perLine); const x = tx0 + col * (tw + 14), yy = y + ln * lineH; const ih = lineH - 8 - 46;
        c.fillStyle = '#000'; c.fillRect(x + 5, yy + 5, tw, lineH - 8);
        c.save(); c.beginPath(); c.rect(x, yy, tw, ih); c.clip(); if (imgs[i]) coverDraw(c, imgs[i], x, yy, tw, ih); else { c.fillStyle = '#2a2a2a'; c.fillRect(x, yy, tw, ih); } c.restore();
        c.fillStyle = '#fff'; c.fillRect(x, yy + ih, tw, 46); c.strokeStyle = '#111'; c.lineWidth = 3; c.strokeRect(x, yy, tw, lineH - 8);
        c.fillStyle = '#111'; c.font = `900 26px ${CFONT}`; c.textBaseline = 'middle'; let nm = r.it.zh; while (c.measureText(nm).width > tw - 20 && nm.length > 2) nm = nm.slice(0, -1); c.fillText(nm === r.it.zh ? nm : nm + '…', x + 10, yy + ih + 24); c.textBaseline = 'top';
      });
      y += rh + gap;
    }
  } else {
    stepText(c, '下週出擊', 54, 56, sq ? 96 : 112, '#111', '#fff');
    const nf = isoWeekOf(new Date(Date.parse(wk.to + 'T00:00:00Z') + 864e5).toISOString().slice(0, 10));
    c.save(); c.translate(60, sq ? 186 : 206); c.rotate(-0.02); c.font = '400 58px "Bebas Neue",sans-serif'; const t2 = `NEXT WEEK  ${dotDay(nf.from)}–${dotDay(nf.to)}`; const w2 = c.measureText(t2).width + 46; c.fillStyle = '#111'; c.fillRect(0, 0, w2, 76); c.fillStyle = '#FFE600'; c.textBaseline = 'middle'; c.fillText(t2, 23, 42); c.restore();
    const list = (wk.next || []).slice(0, sq ? 5 : 6);
    let y = sq ? 300 : 330; const bottom = H - (sq ? 150 : 190); const rh = Math.min(list.length <= 3 ? 236 : 170, (bottom - y) / Math.max(1, list.length));
    list.forEach((n, i) => {
      const d = new Date(n.d + 'T00:00:00Z'); const ds = n.d.length > 7 ? mdDay(n.d) : n.d.slice(0, 7).replace('-', '/'); const wd = n.d.length > 7 ? '週' + WK[d.getUTCDay()] : '未定';
      c.save(); c.translate(56, y); c.rotate((R() - 0.5) * 0.02);
      c.fillStyle = '#111'; c.fillRect(6, 6, W - 112, rh - 16); c.fillStyle = '#fff'; c.fillRect(0, 0, W - 112, rh - 16); c.strokeStyle = '#111'; c.lineWidth = 4; c.strokeRect(0, 0, W - 112, rh - 16);
      c.fillStyle = i % 2 ? '#111' : '#FF2E88'; c.fillRect(0, 0, 190, rh - 16);
      c.fillStyle = i % 2 ? '#FFE600' : '#fff'; c.font = `400 ${Math.min(64, rh * 0.48)}px "Bebas Neue",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ds, 95, (rh - 16) * 0.42);
      c.font = `900 ${Math.min(28, rh * 0.2)}px ${CFONT}`; c.fillText(wd, 95, (rh - 16) * 0.78); c.textAlign = 'left';
      const big = rh > 190;
      c.fillStyle = '#111'; c.font = `900 ${Math.min(big ? 48 : 42, rh * 0.3)}px ${CFONT}`; let nm = n.name; while (c.measureText(nm).width > W - 112 - 230 && nm.length > 2) nm = nm.slice(0, -1); c.fillText(nm === n.name ? nm : nm + '…', 214, (rh - 16) * (big ? 0.27 : 0.36));
      c.fillStyle = '#444'; c.font = `700 ${Math.min(big ? 30 : 27, rh * 0.19)}px ${CFONT}`; const lns = wrapText(c, n.t || '', W - 112 - 240).slice(0, big ? 2 : 1); lns.forEach((ln, j) => c.fillText(ln, 214, (rh - 16) * (big ? 0.6 + j * 0.2 : 0.72)));
      c.restore(); y += rh;
    });
    if (!list.length) { c.fillStyle = '#111'; c.font = `900 40px ${CFONT}`; c.fillText('下週沒有大作上市，正好清遊戲庫存！', 60, 380); }
  }
  brandSticker(c, W - 200, H - 82, -0.05);
  c.fillStyle = dark ? 'rgba(255,255,255,.75)' : 'rgba(17,17,17,.75)'; c.font = `700 22px ${CFONT}`; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  wrapText(c, fp.credit || '', 600).slice(0, 2).forEach((ln, i, a) => c.fillText(ln, 52, H - 34 - (a.length - 1 - i) * 30));
}
