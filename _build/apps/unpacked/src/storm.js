/* 解包 — 風暴眼（2026-11-21）
   一次只盯「現在最熱的那一款」：颱風眼主視覺（遊戲在正中間，官方、媒體、玩家、主播四圈消息繞著轉）、風暴儀表、
   熱度時間軸、Claude 的風暴日報（一天兩次，可出成粉專貼文）、官方動態、媒體（評分、繁中與國外新聞）、玩家風向（PTT、Reddit）、
   主播怎麼說（YouTube 直播中、熱門實況，片在《觀戰》的特別轉播播）、PC 版雷達、換一場風暴（自己指定或交給自動判斷）。
   資料：data/storm.json（摘要，開 App 就讀）、data/storm/<key>.json（每小時的明細）、data/storm/<key>.digest.json（風暴日報）；
   YouTube 數字另外直接讀《觀戰》的 storm.json（比解包的每小時新）。 */
const SPX = 'https://raw.githubusercontent.com/PZWei0105/PZ-Games/spectate-data/';
const SE = { key: null, det: null, dg: null, yt: null, at: 0, dgI: 0, nl: 'zh', yl: 'live' };

const stormCur = () => (S.storm && S.storm.cur) || null;
function stormNew() {   // 分頁上的小紅點：新的風暴日報（或還沒進來看過）
  const h = S.storm && S.storm.head; const seen = LS.get('stormSeen', '');
  return S.storm && S.storm.cur ? (!seen || (h && h.at && Date.parse(h.at) > Date.parse(seen))) : false;   // 日報是 +08:00、看過的是 UTC：比時間不比字串
}
function stormYt(s) {   // 《觀戰》storm.json → 風暴眼用的精簡格式（跟 storm.py 的 spectate() 一樣）
  const items = s.items || {}, ch = s.ch || {};
  const pack = (ids, n) => (ids || []).slice(0, n).map((v) => { const it = items[v]; if (!it) return null; const c = ch[it.c] || {}; return { i: v, t: it.t, cn: c.n, p: it.p, v: it.v, cv: it.cv, l: it.l, z: it.z, lv: it.lv, ne: it.ne }; }).filter(Boolean);
  return { at: s.at, n24: s.n24 || 0, n72: s.n72 || 0, lv: s.lv || 0, lc: s.lc || 0, zl: s.zl || 0, live: pack(s.live, 12), cz: pack(s.cz, 16), top: pack(s.top, 12), lanes: Object.fromEntries(Object.entries(s.lanes || {}).map(([k, v]) => [k, v.length])) };
}
async function stormLoad(key, force) {
  if (!force && SE.key === key && Date.now() - SE.at < 5 * 6e4) return;
  const [det, dg] = await Promise.all([getJSON('storm/' + key + '.json').catch(() => null), getJSON('storm/' + key + '.digest.json').catch(() => null)]);
  if (SE.key !== key) { SE.dgI = 0; SE.yt = null; }
  SE.key = key; SE.det = det; SE.dg = dg; SE.at = Date.now();
  if (stormCur() && key === stormCur().key) {
    try {   // 《觀戰》每 20 分鐘更新：直接讀它的（4 秒內沒回來就用解包每小時存的那份）
      const r = await Promise.race([fetch(SPX + 'storm.json?t=' + Math.floor(Date.now() / 3e5), { cache: 'no-store' }).then((x) => (x.ok ? x.json() : null)), sleep(4000)]);
      if (r && r.key === key) SE.yt = stormYt(r);
    } catch (e) { /* 用存的 */ }
  }
}
const seYt = () => SE.yt || (SE.det && SE.det.yt) || null;
const SE_CAT = ['', '輕颱', '中颱', '強颱', '超強颱', '史詩級'];
function seAgoTl(tl, h) {   // h 小時前那一點
  if (!tl || !tl.length) return null;
  const t = tl[tl.length - 1][0] - h * 60; let best = null;
  for (const p of tl) if (p[0] <= t + 30) best = p;
  return best;
}
function seDelta(cur, old, unit) {
  if (old == null || cur == null) return '';
  const d = cur - old; if (!d) return '<em class="se-d">持平</em>';
  return `<em class="se-d ${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'}${esc(fmtN(Math.abs(d)))}${unit || ''}</em>`;
}
function seDay(c) {
  if (!c.rel) return '';
  const d = dayDiff(c.rel, todayTW());
  return d >= 0 ? `上市第 ${d + 1} 天` : `倒數 ${-d} 天`;
}
const seLink = (u, body, cls) => `<a class="${cls || ''}" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${body}</a>`;
const seSrc = (dg, ids) => (ids || []).filter((n) => dg.sources && dg.sources[n - 1]).map((n) => seLink(dg.sources[n - 1].u, `<sup>${n}</sup>`, 'se-sup')).join('');
const seVid = (id) => '../spectate/#watch/' + encodeURIComponent(id);

/* ---------- 主視覺 ---------- */
function seHero(c, sm, det, yt, past, d) {   // 衛星的數字：官方＝日報整理的＋這一輪抓到的
  const img = c.img || (c.yt_id ? ytThumb(c.yt_id) : '');
  const fb = c.yt_id ? ytThumb(c.yt_id, 'hqdefault') : '';
  const s = (sm && sm.s) || {};
  const n = { off: ((det && det.off) || []).length + ((d && d.off) || []).length, med: det ? (det.news.zh.length + det.news.en.length) : 0, ply: det ? det.ptt.length + ((det.reddit && det.reddit.items) || []).length : 0, str: yt ? yt.lc : 0 };
  const feat = (sm && sm.feats || [])[0];
  return `<section class="se-hero${past ? ' past' : ''}">
    <div class="se-eye" aria-hidden="true"><i class="se-ring r1"></i><i class="se-ring r2"></i><i class="se-ring r3"></i>
      <div class="se-core">${img ? `<img src="${esc(img)}" alt="" ${fb ? `onerror="if(this.src!=='${esc(fb)}')this.src='${esc(fb)}';else this.remove()"` : 'onerror="this.remove()"'}>` : ''}<span class="se-coreb">${esc(c.short || c.zh)}</span></div>
      <span class="se-sat a"><b>官方</b><i>${n.off}</i></span><span class="se-sat b"><b>媒體</b><i>${n.med}</i></span>
      <span class="se-sat c"><b>玩家</b><i>${n.ply}</i></span><span class="se-sat d"><b>主播</b><i>${n.str}</i></span></div>
    <div class="se-id"><span class="se-kick">STORM EYE・風暴眼${past ? '・過去的風暴' : ''}</span>
      <h1 class="se-name">${esc(c.zh)}</h1><div class="se-en">${esc(c.en || '')}</div>
      <div class="se-sub">${esc([seDay(c), c.plat].filter(Boolean).join('・'))}</div>
      ${past ? '' : `<div class="se-cat c${s.cat || 1}"><b>CAT ${s.cat || 1}</b><span>${SE_CAT[s.cat || 1]}</span><i>熱度 <span class="cu" data-n="${s.heat || 0}" data-f="i">0</span></i>${s.d24 != null ? seDelta(s.heat, s.heat - s.d24) : ''}</div>`}
      <p class="se-why">${c.pin ? '<b class="se-pin">你指定的</b>' : '<b class="se-auto">自動判斷</b>'}${esc(c.why || '')}</p>
      <div class="btnrow">${feat ? `<button class="btn y sm" data-go="${feat.k}/${esc(feat.id)}">${ICON.search}<span>看解包專題</span></button>` : ''}<a class="btn p sm" href="../spectate/#storm">${ICON.shorts}<span>觀戰：所有影片</span></a><button class="btn sm" data-act="sepick">${ICON.storm}<span>換一場風暴</span></button></div></div>
  </section>`;
}

/* ---------- 風暴儀表 ---------- */
function seGauges(sm, det, yt) {
  const s = (sm && sm.s) || {}; const tl = det && det.tl; const o = seAgoTl(tl, 24);
  const g = [
    ['heat', '熱度指數', s.heat, '／100', o ? seDelta(s.heat, o[1]) : '', 'i'],
    ['news', '24 小時新聞', s.news24, '則', o ? seDelta(s.news24, o[2]) : '', 'i'],
    ['live', 'YouTube 直播中', yt ? yt.lv : s.lv, '人在看', `<em class="se-d">${yt ? yt.lc : s.lc || 0} 台${yt && yt.zl ? `・中文 ${yt.zl}` : ''}</em>`, ''],
    ['vid', '24 小時新影片', yt ? yt.n24 : s.n24, '支', o ? seDelta(yt ? yt.n24 : s.n24, o[4]) : '', 'i'],
    ['ptt', 'PTT 24 小時', s.ptt24, '篇', o ? seDelta(s.ptt24, o[5]) : '', 'i'],
  ];
  return `<div class="se-gauges">${g.map(([k, t, v, u, d, f]) => `<div class="se-g g-${k}"><small>${t}</small><b><span class="cu" data-n="${v || 0}"${f ? ' data-f="i"' : ''}>0</span><i>${u}</i></b>${d}</div>`).join('')}</div>`;
}

/* ---------- 熱度時間軸 ---------- */
function seTimeline(det, dg) {
  const tl = (det && det.tl) || []; if (tl.length < 2) return '<p class="sub-note">時間軸每小時記一點，再過幾個小時就畫得出來。</p>';
  const W = 600, H = 120, t0 = tl[0][0], t1 = tl[tl.length - 1][0], span = Math.max(60, t1 - t0);
  const X = (t) => ((t - t0) / span) * W, Y = (h) => H - 6 - (h / 100) * (H - 14);
  const pts = tl.map((p) => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`);
  const pk = tl.reduce((a, b) => (b[1] > a[1] ? b : a));
  const marks = ((dg && dg.items) || []).map((d, i) => { const t = Date.parse(d.at) / 6e4; return t >= t0 && t <= t1 ? `<button class="se-mk" style="left:${(X(t) / W * 100).toFixed(1)}%" data-act="sedg" data-i="${i}" aria-label="${esc(d.title)}"></button>` : ''; }).join('');
  const days = []; for (let t = Math.ceil(t0 / 1440) * 1440 - 480; t <= t1; t += 1440) if (t >= t0) days.push(t);
  const th = [[80, 5], [62, 4], [45, 3], [28, 2]];   // 颱風等級的門檻（跟 storm.py 的 cat() 一樣）
  return `<div class="se-tl"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${th.map(([v]) => `<line class="th" x1="0" x2="${W}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/>`).join('')}<path class="ar" d="M${X(tl[0][0]).toFixed(1)},${H} L${pts.join(' L')} L${X(t1).toFixed(1)},${H} Z"/><polyline points="${pts.join(' ')}"/></svg>
    ${th.map(([v, c]) => `<em class="se-th" style="top:${(Y(v) / H * 100).toFixed(1)}%">CAT ${c}</em>`).join('')}${marks}<i class="se-tlpk" style="left:${(X(pk[0]) / W * 100).toFixed(1)}%;top:${(Y(pk[1]) / H * 100).toFixed(1)}%"></i>
    <div class="se-tlx">${days.slice(-8).map((t) => `<span style="left:${(X(t) / W * 100).toFixed(1)}%">${mdDay(new Date((t + 480) * 6e4).toISOString().slice(0, 10))}</span>`).join('')}</div></div>
    <p class="sub-note">最高 ${pk[1]}（${esc(mdDay(new Date((pk[0] + 480) * 6e4).toISOString().slice(0, 10)))} ${new Date((pk[0] + 480) * 6e4).toISOString().slice(11, 13)} 點）・圓點是風暴日報，點了看那一則</p>`;
}

/* ---------- 風暴日報 ---------- */
function seDigest(dg) {
  const L = (dg && dg.items) || [];
  if (!L.length) return '<div class="se-empty">第一份風暴日報還在寫（每天早上 8:42、晚上 6:42 各一份）。</div>';
  const i = Math.min(SE.dgI, L.length - 1); const d = L[i];
  const when = (x) => { const t = new Date(Date.parse(x.at) + 8 * 3600e3).toISOString(); return `${mdDay(t.slice(0, 10))} ${+t.slice(11, 13) < 15 ? '早' : '晚'}`; };
  return `<div class="se-dgtabs">${L.slice(0, 8).map((x, k) => `<button class="${k === i ? 'on' : ''}" data-act="sedg" data-i="${k}">${esc(when(x))}</button>`).join('')}</div>
    <article class="se-dgc"><div class="se-dgh"><b>${esc(d.title)}</b><small>${esc(when(d))}報・${esc(ago(d.at))}・Claude 整理</small></div>
      <p class="se-tldr">${esc(d.tldr || '')}</p>
      <ol class="se-pts">${(d.points || []).map((p) => `<li><b>${esc(p.h)}</b><span>${esc(p.t)}${seSrc(d, p.s)}</span></li>`).join('')}</ol>
      ${(d.next || []).length ? `<div class="se-next"><b>接下來要注意</b>${d.next.map((x) => `<p>${esc(x)}</p>`).join('')}</div>` : ''}
      ${(d.sources || []).length ? `<details class="se-srcs"><summary>來源 ${d.sources.length} 個</summary><ol>${d.sources.map((x) => `<li>${seLink(x.u, esc(x.t))}${x.p ? `<small>${esc(x.p)}</small>` : ''}</li>`).join('')}</ol></details>` : ''}
      ${d.fan && d.fan.post ? `<div class="btnrow"><button class="btn p sm" data-act="secopy">${ICON.mega}<span>複製 Threads 貼文</span></button><button class="btn sm" data-act="secard">${ICON.dl}<span>做成圖卡</span></button></div><div id="secardbox"></div>` : ''}
    </article>`;
}

/* ---------- 官方、媒體 ---------- */
function seOfficial(det, d) {
  const a = ((d && d.off) || []).map((x) => `<li><b>${esc(x.t)}</b>${x.d ? `<small>${esc(mdDay(x.d))}</small>` : ''}${seSrc(d, x.s)}</li>`);
  const b = ((det && det.off) || []).slice(0, 6).map((x) => `<li>${seLink(x.u, esc(x.t))}<small>${esc(x.s)}・${esc(ago(new Date(x.ts * 1000).toISOString()))}</small></li>`);
  return a.length || b.length ? `<ul class="se-list off">${a.join('')}${b.join('')}</ul>` : '<p class="sub-note">這兩天官方沒有新的消息。</p>';
}
function seMedia(det, d) {
  const sc = ((d && d.media && d.media.scores) || []).map((x) => `<span class="se-score"><b>${esc(x.v)}</b><i>${esc(x.n)}</i>${seSrc(d, x.s)}</span>`).join('');
  const notes = ((d && d.media && d.media.notes) || []).map((x) => `<li>${esc(x.t)}${seSrc(d, x.s)}</li>`).join('');
  const L = det ? det.news[SE.nl] || [] : [];
  return `${sc ? `<div class="se-scores">${sc}</div>` : ''}${notes ? `<ul class="se-notes">${notes}</ul>` : ''}
    <div class="seg se-nseg"><button class="${SE.nl === 'zh' ? 'on' : ''}" data-act="senl" data-v="zh">繁中新聞 ${det ? det.news.zh.length : 0}</button><button class="${SE.nl === 'en' ? 'on' : ''}" data-act="senl" data-v="en">國外新聞 ${det ? det.news.en.length : 0}</button></div>
    ${L.length ? `<ul class="se-list news">${L.slice(0, 12).map((x) => `<li>${seLink(x.u, esc(x.t))}<small>${esc(x.s)}・${esc(ago(new Date(x.ts * 1000).toISOString()))}</small></li>`).join('')}</ul>` : '<p class="sub-note">這一輪沒有抓到新聞。</p>'}`;
}

/* ---------- 玩家風向 ---------- */
// PTT 標題標了雷（結局雷、劇情雷、有雷、(雷)、劇透）：先貼「有雷」，點之前知道裡面有劇透（「踩雷」「雷作」不算）
const SE_SPOIL = /有雷|結局雷|劇情雷|全破雷|[（(]雷[)）]|\s雷$|劇透|spoiler/i;
function sePlayers(det, d) {
  const P = (d && d.players) || {};
  const box = (k, t, L) => (L && L.length ? `<div class="vc ${k}"><h4>${t}</h4><ul>${L.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '');
  const v = box('pro', '誇的', P.pos) + box('con', '罵的', P.neg);
  const pt = ((det && det.ptt) || []).filter((x) => Date.now() / 1000 - x.ts < 3 * 86400).sort((a, b) => b.n - a.n || b.ts - a.ts).slice(0, 10);
  const rd = det && det.reddit;
  return `${v ? `<div class="voices">${v}</div>` : ''}${(P.debate || []).length ? `<div class="debate"><h4>吵最兇的</h4>${P.debate.map((x) => `<p>${esc(x)}</p>`).join('')}${seSrc(d, P.s)}</div>` : ''}
    <h4 class="se-h4">PTT 熱門（三天內，照推文數）</h4>
    ${pt.length ? `<ul class="se-list ptt">${pt.map((x) => `<li>${seLink(x.u, `<span class="se-push ${x.n >= 100 ? 'boom' : x.n < 0 ? 'neg' : ''}">${x.n >= 100 ? '爆' : x.n < 0 ? 'X' : x.n}</span>${SE_SPOIL.test(x.t) ? '<em class="se-spoil">有雷</em>' : ''}${esc(x.t)}`)}<small>${esc(x.b)}・${esc(ago(new Date(x.ts * 1000).toISOString()))}</small></li>`).join('')}</ul>` : '<p class="sub-note">PTT 這三天還沒有相關的文章。</p>'}
    ${rd && rd.ok && rd.items.length ? `<h4 class="se-h4">Reddit r/${esc(rd.sub)} 熱門${rd.stale ? '（上一份）' : ''}</h4><ul class="se-list rd">${rd.items.slice(0, 6).map((x) => `<li>${seLink(x.u, `<span class="se-push">${esc(fmtN(x.n))}</span>${esc(x.t)}`)}<small>${esc(fmtN(x.c))} 則留言${x.f ? `・${esc(x.f)}` : ''}</small></li>`).join('')}</ul>` : ''}`;
}

/* ---------- 主播怎麼說 ---------- */
function seVidCard(x, live) {
  return `<a class="se-v${live ? ' live' : ''}" href="${seVid(x.i)}"><span class="se-vt"><img src="${esc(ytThumb(x.i, 'mqdefault'))}" alt="" loading="lazy" onerror="this.remove()">${live ? `<em class="se-onair">● ${esc(fmtN(x.cv || 0))} 人在看</em>` : x.v ? `<em>${esc(fmtN(x.v))} 次觀看</em>` : ''}</span><b>${esc(x.t)}</b><small>${esc(x.cn || '')}${x.p && !live ? `・${esc(ago(new Date(x.p * 1000).toISOString()))}` : ''}</small></a>`;
}
function seStreamers(yt, d) {
  const S2 = (d && d.streamers) || [];
  const q = S2.length ? `<div class="se-quotes">${S2.map((x) => `<blockquote class="se-q"><p>${esc(x.t)}</p><footer><b>${esc(x.who)}</b>${x.where ? `・${esc(x.where)}` : ''}${seSrc(d, x.s)}</footer></blockquote>`).join('')}</div>` : '';
  const L = yt ? (SE.yl === 'live' ? yt.live : SE.yl === 'cz' ? yt.cz : yt.top) : [];
  return `${q}<div class="seg se-yseg"><button class="${SE.yl === 'live' ? 'on' : ''}" data-act="seyl" data-v="live">直播中 ${yt ? yt.lc : 0}</button><button class="${SE.yl === 'cz' ? 'on' : ''}" data-act="seyl" data-v="cz">中文最新</button><button class="${SE.yl === 'top' ? 'on' : ''}" data-act="seyl" data-v="top">全球最熱</button></div>
    ${L && L.length ? `<div class="se-vids">${L.slice(0, 8).map((x) => seVidCard(x, SE.yl === 'live')).join('')}</div>` : `<p class="sub-note">${yt ? (SE.yl === 'live' ? '現在沒有人在播（YouTube 直播每 3 小時搜一次）。' : '這一排還沒有影片。') : '《觀戰》還在收這一款的影片，晚一點再來。'}</p>`}
    <a class="btn y wide se-go" href="../spectate/#storm">${ICON.shorts}<span>到《觀戰》特別轉播看全部影片</span></a>`;
}

/* ---------- PC 版雷達、換一場風暴 ---------- */
function sePc(d) {
  const p = d && d.pc; if (!p) return '';
  return `<div class="se-pc"><span class="se-pcst">${esc(p.st || '未公布')}</span><p>${esc(p.t || '')}${seSrc(d, p.s)}</p></div>`;
}
function sePast(sm) {
  const h = (sm && sm.hist) || []; if (!h.length) return '';
  return `<h4 class="se-h4">過去的風暴</h4><div class="se-hist">${h.map((x) => `<button data-go="storm/${esc(x.key)}"><b>${esc(x.zh || x.key)}</b><small>${esc(mdDay(x.from || ''))}～${esc(mdDay(x.to || ''))}${x.peak ? `・最高 ${x.peak}` : ''}</small></button>`).join('')}</div>`;
}

async function renderStorm(arg) {
  const sm = S.storm; const cur = stormCur();
  if (!cur) return `<div class="sec-h"><h2 class="spray-h">風暴眼</h2></div><div class="empty">風暴眼還在暖機：第一份資料一小時內會到。</div>`;
  const key = arg || cur.key; const past = key !== cur.key;
  await stormLoad(key);
  const det = SE.det, dg = SE.dg; const d = ((dg && dg.items) || [])[Math.min(SE.dgI, ((dg && dg.items) || [1]).length - 1)];
  const c = past ? Object.assign({ key, zh: ((sm.hist || []).find((x) => x.key === key) || {}).zh || key }, (d && d.game) || {}) : cur;
  const yt = past ? (det && det.yt) : seYt();
  if (!past) LS.set('stormSeen', new Date().toISOString());
  return `${past ? `<div class="se-pastbar"><span>這是過去的風暴</span><button class="btn sm" data-go="storm">回到現在的風暴 ›</button></div>` : ''}
    ${seHero(c, past ? null : sm, det, yt, past, d)}
    ${past ? '' : seGauges(sm, det, yt)}
    ${sec('se-tl', 'TIMELINE', '熱度時間軸', seTimeline(det, dg))}
    ${sec('se-dg', 'DIGEST', '風暴日報', seDigest(dg))}
    ${sec('se-off', 'OFFICIAL', '官方動態', seOfficial(det, d))}
    ${sec('se-med', 'MEDIA', '媒體怎麼說', seMedia(det, d))}
    ${sec('se-ply', 'PLAYERS', '玩家風向', sePlayers(det, d))}
    ${sec('se-str', 'STREAMERS', '主播怎麼說', seStreamers(yt, d))}
    ${d && d.pc ? sec('se-pc', 'PC', 'PC 版雷達', sePc(d)) : ''}
    ${past ? '' : sec('se-more', 'NEXT', '下一場風暴', `<p class="sub-note">風暴眼一次只盯一款。自動判斷會在別款真的更熱的時候換過去；你也可以自己指定。</p><button class="btn y" data-act="sepick">${ICON.storm}<span>換一場風暴</span></button>${sePast(sm)}`)}
    <p class="sub-note se-foot">資料：新聞與 PTT 每小時更新、YouTube 每 20 分鐘（《觀戰》）、風暴日報每天早晚各一份。${det ? `最後更新 ${esc(ago(det.at))}。` : ''}</p>`;
}
function stormFx() {
  const v = VIEW(); const h = $('.se-hero', v); if (!h) return;
  requestAnimationFrame(() => h.classList.add('in'));
  const g = $('.se-gauges', v); if (g) countUp(g);
  const hc = $('.se-cat', v); if (hc) countUp(hc);
  sfx.riser && sfx.riser();
}
function stormRefresh(part) {   // 只重畫某一段，不整頁重來
  const v = VIEW(); const det = SE.det, dg = SE.dg; const d = ((dg && dg.items) || [])[SE.dgI];
  const map = { 'se-dg': () => seDigest(dg), 'se-med': () => seMedia(det, d), 'se-str': () => seStreamers(seYt(), d), 'se-off': () => seOfficial(det, d), 'se-ply': () => sePlayers(det, d) };
  for (const id of part) { const el = $('#' + id, v); if (el && map[id]) { const h2 = el.querySelector('h2'); el.innerHTML = ''; el.appendChild(h2); el.insertAdjacentHTML('beforeend', map[id]()); } }
}

/* ---------- 換一場風暴 ---------- */
function stormPickHtml() {
  const sm = S.storm || {}; const cur = sm.cur || {}; const pend = LS.get('stormPend', null);
  const cands = sm.cands || [];
  return `<div class="sh-in sepick"><div class="sk-h"><b>換一場風暴</b><i>NEXT STORM</i></div>
    <p class="sub-note">現在：<b>${esc(cur.zh || '—')}</b>（${cur.pin ? '你指定的' : '自動判斷'}）。換了之後，下一輪更新（一小時內）風暴眼和《觀戰》的特別轉播就會轉過去。</p>
    ${pend ? `<p class="se-pend">已送出：${pend.mode === 'auto' ? '換回自動判斷' : `指定「${esc(pend.q)}」`}，等下一輪更新。</p>` : ''}
    ${cands.length ? `<h4 class="se-h4">《觀戰》這兩週大家在聊的</h4><div class="se-cands">${cands.map((x) => `<button data-act="sepin" data-q="${esc(x.zh || x.en)}"><b>${esc(x.zh || x.en)}</b><small>${x.n ? `${x.n} 支影片` : ''}${x.chs ? `・${x.chs} 台在聊` : ''}</small></button>`).join('')}</div>` : ''}
    <h4 class="se-h4">自己指定一款</h4>
    <div class="se-pinf"><input id="sepq" type="search" maxlength="60" placeholder="輸入遊戲名稱（中英文都可以）" autocomplete="off"><button class="btn y" data-act="sepin">指定</button></div>
    ${cur.pin ? `<button class="btn wide" data-act="seauto">換回自動判斷</button>` : ''}</div>`;
}
function stormAct(a, el) {
  if (a === 'sepick') { openSheet(stormPickHtml()); sfx.click(); return true; }
  if (a === 'sepin') {
    const q = (el.dataset.q || ($('#sepq') && $('#sepq').value) || '').trim();
    if (!q) { toast('先輸入遊戲名稱', 'warn'); return true; }
    askEmit('storm', { q: q.slice(0, 60), mode: 'pin' }); LS.set('stormPend', { q, mode: 'pin', t: Date.now() });
    sfx.stamp(); closeSheet(); toast(`指定「${q}」：一小時內風暴眼就會轉過去`); return true;
  }
  if (a === 'seauto') { askEmit('storm', { mode: 'auto' }); LS.set('stormPend', { mode: 'auto', t: Date.now() }); sfx.click(); closeSheet(); toast('換回自動判斷：一小時內生效'); return true; }
  if (a === 'sedg') { SE.dgI = +el.dataset.i || 0; sfx.click(); stormRefresh(['se-dg', 'se-off', 'se-med', 'se-ply', 'se-str']); const t = $('#se-dg'); if (t && el.classList.contains('se-mk')) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; }
  if (a === 'senl') { SE.nl = el.dataset.v; sfx.click(); stormRefresh(['se-med']); return true; }
  if (a === 'seyl') { SE.yl = el.dataset.v; sfx.click(); stormRefresh(['se-str']); return true; }
  if (a === 'secopy') { const d = ((SE.dg && SE.dg.items) || [])[SE.dgI]; if (d && d.fan) copyText(d.fan.post + (d.fan.topic ? '\n\n#' + d.fan.topic : '')).then((ok) => { toast(ok ? '貼文複製好了，到 Threads 貼上' : '複製不了，長按文字自己選', ok ? '' : 'warn'); if (ok) sfx.ding(); }); return true; }
  if (a === 'secard') { stormCardRender(); return true; }
  if (a === 'secdl' || a === 'secshare') { stormCardOut(a === 'secshare'); return true; }
  return false;
}
/* 收件後：指定的已經生效就把「已送出」拿掉 */
function stormPendSync() {
  const p = LS.get('stormPend', null); const cur = stormCur(); if (!p || !cur) return;
  if ((p.mode === 'auto' && !cur.pin) || (p.mode === 'pin' && cur.pin) || Date.now() - p.t > 6 * 3600e3) LS.set('stormPend', null);
}

/* ---------- 粉專圖卡（1080×1350，遊戲狂想曲；不放痞子葳） ---------- */
async function drawStormCard(cv, c, s, d) {
  const W = 1080, H = 1350; cv.width = W; cv.height = H; const x = cv.getContext('2d');
  x.fillStyle = '#111'; x.fillRect(0, 0, W, H); halftone(x, W, H, 'rgba(255,46,136,.10)', 26, 3.4);
  const im = await loadImgCors(c.img || (c.yt_id ? ytThumb(c.yt_id) : ''));
  if (im) { x.save(); x.beginPath(); x.arc(W / 2, 420, 300, 0, 7); x.clip(); coverDraw(x, im, W / 2 - 300, 120, 600, 600); x.restore(); }
  x.strokeStyle = '#FFE600'; x.lineWidth = 14; x.setLineDash([46, 28]); x.beginPath(); x.arc(W / 2, 420, 330, 0, 7); x.stroke();
  x.strokeStyle = '#FF2E88'; x.lineWidth = 8; x.setLineDash([14, 22]); x.beginPath(); x.arc(W / 2, 420, 372, 0, 7); x.stroke(); x.setLineDash([]);
  sticker(x, `CAT ${s.cat || 1}・熱度 ${s.heat || 0}`, 70, 70, '#FFE600', '#111', -0.05, 44);
  x.textBaseline = 'top'; x.fillStyle = '#fff'; x.font = `900 40px ${CFONT}`; x.fillText(`風暴眼・${c.zh}`, 70, 820);
  stepText(x, (d.title || '').slice(0, 18), 70, 880, 64, '#fff', '#111');
  x.font = `700 34px ${CFONT}`; let y = 1000;
  for (const p of (d.points || []).slice(0, 3)) {
    let t = `・${p.h}`; while (x.measureText(t).width > 920 && t.length > 4) t = t.slice(0, -2) + '…';
    x.fillStyle = '#FFE600'; x.fillText(t, 70, y); y += 58;
  }
  brandSticker(x, W - 230, H - 110, -0.06);
}
async function stormCardRender() {
  const box = $('#secardbox'); const d = ((SE.dg && SE.dg.items) || [])[SE.dgI]; const c = stormCur(); if (!box || !d || !c) return;
  box.innerHTML = `<canvas id="secv" class="cardcv"></canvas><div class="btnrow" style="justify-content:center"><button class="btn y" data-act="secdl">${ICON.dl}<span>下載</span></button>${navigator.share ? '<button class="btn p" data-act="secshare"><span>分享</span></button>' : ''}</div>`;
  sfx.hiss && sfx.hiss(0.6); await drawStormCard($('#secv'), c, (S.storm && S.storm.s) || {}, d); sfx.stamp(); box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function stormCardOut(share) {
  const cv = $('#secv'); if (!cv) return;
  const b = await new Promise((res) => { try { cv.toBlob(res, 'image/png'); } catch (e) { res(null); } });
  if (!b) { toast('圖卡裡有圖片不能匯出，換張網路好一點的時候再試', 'warn'); return; }
  const f = new File([b], 'rhapsody-storm.png', { type: 'image/png' });
  if (share && navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: '遊戲狂想曲' }); sfx.ding(); } catch (e) { /* 取消 */ } return; }
  const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000); sfx.ding();
}
/* 全部功能、跑馬燈用 */
function stormHubLine() { const c = stormCur(); const s = S.storm && S.storm.s; return c ? `${c.short || c.zh}・CAT ${(s && s.cat) || 1}` : '現在最熱的那一款'; }
