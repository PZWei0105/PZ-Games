/* 全知 OMNISCIENT v2 — 戰情牆：六個處理階段的卡片、頂列、下排三塊、光纜路線 */

const COLS = [
  { no: '01', zh: '蒐集', en: 'INGEST', c: 'var(--n-sky)' },
  { no: '02', zh: '查證', en: 'VERIFY', c: 'var(--n-teal)' },
  { no: '03', zh: '過濾', en: 'FILTER', c: 'var(--n-mag)' },
  { no: '04', zh: '判斷', en: 'JUDGE', c: 'var(--n-yel)' },
  { no: '05', zh: '結論', en: 'VERDICT', c: 'var(--n-cyan)' },
  { no: '06', zh: '全局', en: 'GLOBAL', c: 'var(--n-vio)' },
];
const TAGS = { ingest: 'INGEST', verify: 'VERIFY', filter: 'FILTER', judge: 'JUDGE', core: 'CORE' };
const TAG_CLS = { ingest: 'ag-owl', verify: 'ag-libra', filter: 'ag-medusa', judge: 'ag-judge', core: 'ag-core' };
const CHK_LABEL = { pass: 'PASS', warn: 'CHECK', fail: 'FAIL', wait: 'WAIT' };

const UI = {
  view: { mode: 'live', minute: null, day: null },
  shownNews: new Set(), newsReady: false,
  focus: null, focusPinnedUntil: 0,
  lastPx: {},

  build() {
    $('#tabs').innerHTML = COLS.map((c, i) => `<div class="tab" id="tab${i}" style="--c:${c.c}"><span class="n">${c.no} /</span><b>${c.zh}</b><span class="e">${c.en}</span><span class="pg" id="tp${i}"></span><i class="pr" id="tr${i}"></i></div>`).join('');
    // 手機直式沒有上面那排分頁：每一欄自己帶標題
    COLS.forEach((c, i) => { const col = $('#c' + i); if (col) { col.dataset.t = `${c.no} / ${c.zh}  ${c.en}`; col.style.setProperty('--c', c.c); } });
    $('#pLog').innerHTML = '<div class="ph"><b>一則決策的一生</b><span class="e">LIFE OF A DECISION</span><span class="r" id="mLog"></span></div><div class="pb"><div class="lg"><ol class="log" id="log"></ol><pre class="code" id="code"></pre></div></div>';
    $('#pBook').innerHTML = '<div class="ph"><b>最佳五檔</b><span class="e">ORDER BOOK</span><span class="r" id="mBook"></span></div><div class="pb"><div class="book" id="book"></div></div>';
    $('#pTape').innerHTML = '<div class="ph"><b>盤面脈動</b><span class="e">MARKET TAPE</span><span class="r" id="mTape"></span></div><div class="pb"><div class="tape"><canvas id="tapeCv"></canvas><div class="il" id="tapeInfo"></div></div></div>';
    $('#fnote').innerHTML = `所有數字都來自冷眼的公開資料（證交所、櫃買中心、集保、投信投顧公會、央行、金管會、中央社）· 不補、不猜、不造假 · 個人研究用途，不是投資建議 · v${VERSION}`;
  },

  // ================================================================ 頂列
  renderTop() {
    const g = D.global, temp = g && g.temp;
    const br = breadth();
    const h = sourceHealth();
    const fl = freshness('live');
    const liveAge = D.live ? now() - parseTs(D.live.at) : NaN;
    const ph = marketPhase();
    const lv = temp ? temp.level : null;
    const rings = [
      { v: lv === '晴' ? 1 : lv === '陰' ? 0.55 : lv === '雨' ? 0.22 : 0, txt: lv || '—', l: 'TEMP 市場溫度', c: lv === '晴' ? '#2ef2d0' : lv === '陰' ? '#ffb02e' : lv === '雨' ? '#ff4d4d' : '#64739a' },
      { v: br.n ? br.bull / br.n : 0, txt: br.n ? Math.round(br.bull / br.n * 100) + '%' : '—', l: 'BULL 偏多比例', c: '#ff4d6d' },
      { v: h.total ? h.ok / h.total : 0, txt: h.total ? `${h.ok}/${h.total}` : '—', l: 'SRC 官方來源', c: h.err ? '#ffb02e' : '#00e5ff' },
      D.link === 'down' ? { v: 0.08, txt: 'OFF', l: 'LINK 斷線', c: '#ff4d4d' }
        : { v: ph.phase === 'open' ? clamp(1 - liveAge / 1800e3, 0.04, 1) : (fl.level === 'ok' ? 1 : 0.4), txt: ph.phase === 'open' && isFinite(liveAge) ? Math.max(0, Math.round(liveAge / 60e3)) + 'm' : fl.level === 'ok' ? 'OK' : 'OLD', l: 'SYNC 資料新鮮', c: fl.level === 'ok' ? '#ffd23d' : fl.level === 'warn' ? '#ffb02e' : '#ff4d4d' },
    ];
    const C = 2 * Math.PI * 26;
    const r = $('#rings');
    if (!r.children.length) r.innerHTML = rings.map(() => `<div class="ring"><svg viewBox="0 0 60 60"><circle class="tk" cx="30" cy="30" r="29"/><circle class="trk" cx="30" cy="30" r="26"/><circle class="val" cx="30" cy="30" r="26" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}"/></svg><div class="rv"></div><div class="rl"></div></div>`).join('');
    rings.forEach((x, i) => {
      const n = r.children[i];
      const v = n.querySelector('.val');
      v.style.strokeDashoffset = String(C * (1 - clamp(x.v, 0, 1)));
      v.style.stroke = x.c; v.style.color = x.c;
      const rv = n.querySelector('.rv'); rv.textContent = x.txt; rv.style.color = x.c;
      n.querySelector('.rl').textContent = x.l;
    });
    this.renderStats();
    this.renderHeat();
    this.renderMode();
  },
  renderStats() {
    const s = $('#stats');
    if (!s.children.length) s.innerHTML = '<div class="stat" id="st0"></div><div class="stat" id="st1"></div><div class="stat" id="st2"></div><div class="stat" id="st3"></div>';
    const M = D.summary && D.summary.market;
    const tx = taiex();
    const rep = this.view.mode === 'replay';
    // 0 加權指數
    {
      const el = $('#st0');
      let lab, val, chg, cls;
      if (rep && tx && this.view.day && (tx.date !== this.view.day || this.view.minute < SESSION_MIN)) {
        const ref = tx.date === this.view.day ? tx.v - tx.chg : tx.v;
        lab = 'TAIEX <em>加權指數</em> · 昨收'; val = fmtPx(ref); chg = '13:30 揭曉收盤'; cls = 'flat';
      } else if (tx) {
        lab = `TAIEX <em>加權指數</em> · ${tx.src === 'live' ? '盤中 ' + esc((tx.time || '').slice(0, 5)) : '收盤 ' + dateText(tx.date)}`;
        val = fmtPx(tx.v); chg = `${fmtChg(tx.chg)}  ${fmtPct(tx.pct)}`; cls = dirCls(tx.chg);
      } else { lab = 'TAIEX <em>加權指數</em>'; val = '—'; chg = ''; cls = 'flat'; }
      if (!el.dataset.b) { el.innerHTML = `<div class="sl"></div><div class="sqw"></div><div class="sv"></div><div class="ss"></div>`; el.dataset.b = 1; }
      el.querySelector('.sl').innerHTML = lab;
      const sq = squiggle(M && M.spark, cls === 'dn' ? NEON.dn : NEON.up);
      if (el.querySelector('.sqw').dataset.h !== sq) { el.querySelector('.sqw').innerHTML = sq; el.querySelector('.sqw').dataset.h = sq; }
      const sv = el.querySelector('.sv'); sv.className = 'sv ' + cls; odo(sv, val);
      const ss = el.querySelector('.ss'); ss.className = 'ss ' + cls; ss.textContent = chg;
    }
    // 1 成交值
    {
      const el = $('#st1');
      el.innerHTML = `<div class="sl">VALUE <em>成交值</em> · ${dateText(M && M.d)}</div>${squiggle(M && M.spark && M.spark.slice(-20), NEON.cyan)}<div class="sv" style="color:#cfe9ff">${M ? fmtMoney(M.val).replace(' ', '<small style="font-size:.5em"> ') + '</small>' : '—'}</div><div class="ss" style="color:var(--ink3)">TWSE 集中市場</div>`;
    }
    // 2 三大法人
    {
      const el = $('#st2');
      const ins = M && M.insti;
      const tot = ins ? (ins.f || 0) + (ins.t || 0) + (ins.d || 0) : null;
      const mx = ins ? Math.max(Math.abs(ins.f), Math.abs(ins.t), Math.abs(ins.d), 1) : 1;
      const bar = (v, l) => `<span style="display:inline-flex;align-items:center;gap:.3rem;margin-right:.6rem"><span style="color:var(--ink3)">${l}</span><i style="display:inline-block;width:${(Math.abs(v) / mx * 3.2 + 0.2).toFixed(2)}rem;height:.6rem;background:${v >= 0 ? NEON.up : NEON.dn};box-shadow:0 0 .6rem ${v >= 0 ? NEON.up : NEON.dn}"></i></span>`;
      el.innerHTML = `<div class="sl">INSTI <em>三大法人</em> · ${dateText(ins && ins.date)}</div><div style="height:1.6rem;margin:.2rem 0 .1rem;font:400 .9rem var(--f-mono);display:flex;align-items:center">${ins ? bar(ins.f, '外') + bar(ins.t, '投') + bar(ins.d, '自') : ''}</div><div class="sv ${dirCls(tot)}">${ins ? fmtSignedMoney(tot).replace(' ', '<small style="font-size:.5em"> ') + '</small>' : '—'}</div><div class="ss">${ins ? `<span class="${dirCls(ins.f)}">外 ${fmtSignedMoney(ins.f)}</span>　<span class="${dirCls(ins.t)}">投 ${fmtSignedMoney(ins.t)}</span>` : ''}</div>`;
    }
    // 3 台指期
    {
      const el = $('#st3');
      const g = D.global;
      const txf = g && g.txf && g.txf.txf_day;
      const ngt = g && g.txf && g.txf.txf_night;
      el.innerHTML = `<div class="sl">TXF <em>台指期</em> · ${txf ? esc(txf.t || '') + ' ' + dateText(txf.d) : '—'}</div>${squiggle(txf && ngt ? [ngt.ref, ngt.px, txf.ref, txf.px] : null, NEON.yel)}<div class="sv ${dirCls(txf && txf.pct)}">${txf ? fmtPx(txf.px, 0) : '—'}</div><div class="ss ${dirCls(txf && txf.pct)}">${txf ? fmtPct(txf.pct) : ''}${ngt ? `<span style="color:var(--ink3)">　夜盤 ${fmtPct(ngt.pct)}</span>` : ''}</div>`;
    }
  },
  /** 全市場熱力格：每一格是一檔 ETF 今天的漲跌（回放時跟著時間變） */
  renderHeat() {
    const el = $('#heat');
    const etfs = ((D.summary && D.summary.etfs) || []).filter((e) => !e.young).slice().sort((a, b) => (a.k > b.k ? 1 : a.k < b.k ? -1 : (b.val || 0) - (a.val || 0)));
    const list = etfs.slice().sort((a, b) => (b.val || 0) - (a.val || 0)).slice(0, 26 * 8).sort((a, b) => (a.k > b.k ? 1 : a.k < b.k ? -1 : (b.val || 0) - (a.val || 0)));
    if (el.dataset.n !== String(list.length)) {
      el.innerHTML = `<div class="hl"><span>MARKET <span style="font-family:var(--f-ui)">成交值前 ${list.length} 檔</span></span><span id="heatT"></span></div>` + list.map((e) => `<i title="${esc(e.c + ' ' + e.n)}"></i>`).join('');
      el.dataset.n = String(list.length);
    }
    const rep = this.view.mode === 'replay';
    const cells = el.querySelectorAll('i');
    let up = 0, dn = 0;
    list.forEach((e, i) => {
      const q = rep ? quoteAt(e.c, this.view.minute) : quote(e.c);
      const p = q && isNum(q.pct) ? q.pct : null;
      if (p > 0) up++; else if (p < 0) dn++;
      const a = p == null ? 0 : clamp(Math.abs(p) / 3, 0.12, 1);
      cells[i].style.backgroundColor = p == null ? '#141b2e' : p > 0 ? `rgba(255,77,109,${a})` : p < 0 ? `rgba(25,227,155,${a})` : 'rgba(200,210,230,.25)';
      cells[i].style.boxShadow = p != null && Math.abs(p) > 2 ? `0 0 .5rem ${p > 0 ? NEON.up : NEON.dn}` : 'none';
    });
    const t = $('#heatT'); if (t) t.innerHTML = `<span class="up">▲${up}</span> <span class="dn">▼${dn}</span>`;
  },
  renderMode() {
    const ph = marketPhase();
    let badge;
    if (D.link === 'down') badge = '<span class="badge down"><i class="dot"></i>OFFLINE 斷線</span>';
    else if (this.view.mode === 'replay') badge = `<span class="badge replay"><i class="dot"></i>REPLAY ${dateText(this.view.day)}（${WD[weekday(this.view.day || ph.today)]}）</span>`;
    else if (ph.phase === 'open') badge = '<span class="badge live"><i class="dot"></i>LIVE 盤中</span>';
    else badge = `<span class="badge closed"><i class="dot"></i>${ph.phase === 'pre' ? 'PRE 開盤前' : ph.phase === 'post' ? 'CLOSED 已收盤' : 'HOLIDAY 休市'}</span>`;
    const t = tw();
    const lastData = D.version && D.version.built ? parseTs(D.version.built) : (D.live ? parseTs(D.live.at) : NaN);
    const html = `${badge}<div class="clock">${pad2(t.hh)}:${pad2(t.mi)}<small>:${pad2(t.ss)}　${t.m}/${t.d}（${WD[t.wd]}）</small></div><div class="age">COLDEYE ${stampText(lastData)} · ${ageText(lastData)}${ph.phase !== 'open' ? ` · 下次開盤 ${dateText(ph.next)}` : ''}</div>`;
    const m = $('#mode');
    if (m.innerHTML !== html) m.innerHTML = html;
  },

  // ================================================================ 01 蒐集
  renderSources() {
    const L = sourcesList().filter((s) => s.st !== 'idle');
    const b = $('#c0');
    const html = L.map((s, i) => {
      const age = isFinite(s.ok) ? now() - s.ok : Infinity;
      const w = isFinite(age) ? clamp(1 - age / (4 * 86400e3), 0.04, 1) : 0;
      const col = NEON_LIST[i % NEON_LIST.length];
      return `<a class="cd src ${s.st}" id="src-${s.key}" href="${esc(s.url)}" target="_blank" rel="noopener" style="--c:${col}" title="${esc(s.name)}"><div class="hd"><span class="lamp ${s.st}"></span><span class="t">${esc(s.org)}</span><span class="r">${s.st === 'err' ? 'ERR' : stampText(s.ok)}</span></div><div class="sb"><span class="w">${esc(s.what)}</span><span>${s.st === 'err' ? '抓取失敗' : ageText(s.ok)}</span><span class="bar"><i style="width:${(w * 100).toFixed(0)}%"></i></span></div></a>`;
    }).join('');
    if (b.dataset.h !== html) { b.innerHTML = html; b.dataset.h = html; this.layoutDirty = true; }
    const h = sourceHealth();
    this.tab(0, `${h.ok}/${h.total} OK`, h.total ? h.ok / h.total : 0);
  },

  // ================================================================ 02 查證
  renderVerify() {
    const C = verifyChecks();
    const b = $('#c1');
    const html = C.map((c) => {
      const rows = (c.rows || []).slice(0, 4).map((r) => `<div class="row"><span class="k${r.zh ? ' zh' : ''}">${esc(r.k)}</span><span class="bar"><i style="width:${(clamp(r.f, 0, 1) * 100).toFixed(0)}%;${r.bad ? '--bc:var(--warn)' : r.wait ? '--bc:var(--n-vio)' : ''}"></i></span><span class="v"${r.bad ? ' style="color:var(--warn)"' : ''}>${esc(r.v)}</span></div>`).join('');
      return `<div class="cd chk ${c.st}" id="chk-${c.id}"><div class="hd"><span class="t"><em>${esc(c.title)}</em></span><span class="r big">${esc(c.big)}</span></div>${rows}<div class="cd2">${esc(c.detail)}</div><div class="ft"><span>${esc(c.org)}</span><span class="${c.st === 'pass' ? 'ok' : c.st === 'wait' ? '' : c.st === 'fail' ? 'bd' : 'wr'}" style="margin-left:auto">● ${CHK_LABEL[c.st]}</span></div></div>`;
    }).join('');
    if (b.dataset.h !== html) { b.innerHTML = html; b.dataset.h = html; this.layoutDirty = true; }
    const pass = C.filter((c) => c.st === 'pass').length;
    this.tab(1, `${pass}/${C.length} PASS`, pass / C.length);
    return C;
  },

  // ================================================================ 03 過濾
  renderNews(list, day) {
    const b = $('#c2');
    const fresh = [];
    const counts = kindCounts(list);
    const top = list.slice(0, 12);
    const head = `<div class="cd nsum" id="nsum"><div class="hd"><span class="t">news.filter · <em>${day ? dateText(day) + ' 公告與新聞' : '最新公告與新聞'}</em></span><span class="r">${list.length} 則</span></div><div class="ks"><div class="k-off"><b>${counts.official}</b>官方 OFFICIAL</div><div class="k-fact"><b>${counts.fact}</b>事實 FACT</div><div class="k-op"><b>${counts.opinion}</b>觀點 OPINION</div></div></div>`;
    const rows = top.map((x) => {
      const isNew = !this.shownNews.has(x.url);
      if (isNew) fresh.push(x);
      const k = KIND_INFO[x.kind] || KIND_INFO.fact;
      let t = esc(x.t);
      if (x.trig) t = t.replace(esc(x.trig), `<mark>${esc(x.trig)}</mark>`);
      return `<a class="cd news ${k.cls}${isNew && this.newsReady ? ' new' : ''}" id="nw-${x.i}" href="${esc(x.url)}" target="_blank" rel="noopener"><div class="hd"><span class="t">${x.timed ? hmText(x.ms) : dateText(x.day)} · ${esc(x.srcName)}${x.trig ? ` · <span style="color:var(--warn)">因「${esc(x.trig)}」標為觀點</span>` : ''}</span></div><div class="nt">${t}</div><span class="stp">${k.short}</span></a>`;
    });
    const html = head + (rows.length ? rows.join('') : `<div class="empty">${day ? dateText(day) + ' 這天到這個時間為止<br>還沒有官方公告或新聞' : '還沒有新聞'}</div>`);
    if (b.dataset.h !== html.replace(/ new"/g, '"')) { b.innerHTML = html; b.dataset.h = html.replace(/ new"/g, '"'); this.layoutDirty = true; }
    top.forEach((x) => this.shownNews.add(x.url));
    this.newsReady = true;
    this.tab(2, `OPINION ${counts.opinion}`, list.length ? 1 - counts.opinion / list.length : 0);
    return fresh;
  },

  // ================================================================ 04 判斷（焦點那一檔）
  async renderJudge(code) {
    if (!code) return;
    const e = D.map[code];
    const [x, k] = await Promise.all([loadEtf(code), loadK(code)]);
    if (code !== this.focus) return;
    const b = $('#c3');
    const v = x && x.view;
    const stance = STANCE[String(e ? e.st : 0)] || STANCE[0];
    const score = v ? v.score : e && e.sc;
    const comps = (v && v.components) || [];
    const lv = v && v.levels;
    const sim = (v && v.similar) || (e && e.sim);
    const ang = clamp((isNum(score) ? score : 0) / 2, -1, 1) * 100;
    const arc = (a0, a1, r) => { const p = (a) => [60 + r * Math.sin(a * Math.PI / 180), 62 - r * Math.cos(a * Math.PI / 180)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
    const fl = x && x.flows;
    const flv = fl ? fl.d.map((_, i) => ((fl.f[i] || 0) + (fl.t[i] || 0)) / 1000).slice(-20) : [];
    const flSum = flv.reduce((a, c) => a + c, 0);
    const lastK = k && k.d ? k.d.length - 1 : -1;
    const kc = k && (k.c_ || k.c);
    const html = `
      <div class="cd jk" id="j-k"><div class="hd"><span class="t">${esc(code)} · <em>${esc(e ? e.n : code)}</em> · K 線</span><span class="r">${lastK >= 0 ? '收 ' + fmtPx(kc[lastK]) : ''}</span></div><canvas class="ch" style="height:12.5rem"></canvas><div class="ft"><span>MA20 <b>${e && isNum(e.m20) ? fmtPx(e.m20) : '—'}</b></span><span>RSI <b>${e && isNum(e.rsi) ? e.rsi.toFixed(0) : '—'}</b></span><span>波動 <b>${e && isNum(e.vol) ? (e.vol * 100).toFixed(0) + '%' : '—'}</b></span><span style="margin-left:auto">${lastK >= 0 ? dateText(k.d[lastK]) : ''}</span></div></div>
      <div class="cd jr" id="j-r"><div class="hd"><span class="t">rule.table · <em>規則六面向</em></span><span class="r">v${esc((D.summary && D.summary.engine) || '')}</span></div>
        ${comps.map((c) => { const s = isNum(c.score) ? clamp(c.score / 2, -1, 1) : 0; return `<div class="row" title="${esc(c.text)}"><span class="k zh">${esc(c.name)} <span style="color:var(--ink3);font-size:.85rem">${Math.round((c.weight || 0) * 100)}%</span></span><span class="bar mid"><i style="${s >= 0 ? 'left:50%' : 'left:' + (50 + s * 50).toFixed(1) + '%'};width:${(Math.abs(s) * 50).toFixed(1)}%;--bc:${s >= 0 ? NEON.up : NEON.dn}"></i></span><span class="v ${dirCls(c.score)}">${isNum(c.score) ? (c.score > 0 ? '+' : '') + c.score.toFixed(2) : '—'}</span></div>`; }).join('') || '<div class="empty">這一檔還沒有足夠的歷史資料</div>'}
        <div class="ft"><span>Σ w·s = <b class="${dirCls(score)}">${isNum(score) ? (score > 0 ? '+' : '') + score.toFixed(3) : '—'}</b></span><span>門檻 ±0.5</span><span style="margin-left:auto">依 ${dateText(D.summary && D.summary.asof)} 收盤</span></div></div>
      <div class="cd jv" id="j-v"><div class="hd"><span class="t">verdict · <em>判決</em></span><span class="r">信心 ${e && isNum(e.cf) ? e.cf : '—'}</span></div>
        <div class="vb"><div class="dial"><svg viewBox="0 0 120 80"><path d="${arc(-100, 100, 48)}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="6" stroke-linecap="round"/>
          <path d="${arc(-100, -25, 48)}" fill="none" stroke="${NEON.dn}" stroke-width="6" stroke-linecap="round" style="filter:drop-shadow(0 0 4px ${NEON.dn})"/>
          <path d="${arc(25, 100, 48)}" fill="none" stroke="${NEON.up}" stroke-width="6" stroke-linecap="round" style="filter:drop-shadow(0 0 4px ${NEON.up})"/>
          <g style="transform:rotate(${ang.toFixed(1)}deg);transform-origin:60px 62px;transition:transform 1.4s cubic-bezier(.2,1.4,.4,1)"><path d="M60 62L60 18" stroke="#fff" stroke-width="2.6" stroke-linecap="round" style="filter:drop-shadow(0 0 4px #fff) drop-shadow(0 0 8px ${NEON.yel})"/></g>
          <circle cx="60" cy="62" r="4.5" fill="${NEON.yel}" style="filter:drop-shadow(0 0 6px ${NEON.yel})"/></svg>
          <div class="dt"><b class="${stance.cls}">${stance.t}</b><span>${isNum(score) ? (score > 0 ? '+' : '') + score.toFixed(2) : '—'}</span></div></div>
          <div><div class="va">${esc((v && v.advice && v.advice.action) || (e && e.a) || '—')}</div>
          <div class="vm">部位 <b>${esc(POS_NAMES[e && e.ps] || '—')}</b>${e && isNum(e.dl) ? ` · 防守線 <b>${fmtPx(e.dl)}</b>` : ''}<br>${lv && lv.turn_bull ? `站上 <b>${fmtPx(lv.turn_bull.price)}</b> 轉多` : ''}${lv && lv.turn_bear ? ` · 跌破 <b>${fmtPx(lv.turn_bear.price)}</b> 轉空` : ''}</div></div></div>
        <div class="ft"><span>${sim && isNum(sim.hit) ? `同類同方向命中 <b>${(sim.hit * 100).toFixed(1)}%</b> vs 任一天 <b>${(sim.base * 100).toFixed(1)}%</b>` : '回測樣本不足'}</span><span style="margin-left:auto">${sim && sim.n ? 'n=' + sim.n : ''}</span></div></div>
      <div class="cd jf" id="j-f"><div class="hd"><span class="t">flows · <em>外資＋投信 近 20 日</em></span><span class="r ${dirCls(flSum)}">${flv.length ? (flSum >= 0 ? '+' : '') + Math.round(flSum).toLocaleString() + ' 張' : '—'}</span></div><canvas class="ch" style="height:7rem"></canvas><div class="ft"><span>${fl ? dateText(fl.d[Math.max(0, fl.d.length - 20)]) + ' – ' + dateText(fl.d[fl.d.length - 1]) : ''}</span><span style="margin-left:auto">TWSE 三大法人</span></div></div>`;
    b.innerHTML = html;
    if (k) CH.candles($('#j-k canvas'), k, 34);
    CH.bars($('#j-f canvas'), flv);
    this.tab(3, `${code} ${stance.t}`, isNum(score) ? clamp(Math.abs(score) / 2, 0, 1) : 0);
    this.layoutDirty = true;
    this.renderCode(code);
  },
  nextFocus(force) {
    const codes = watchCodes();
    if (!codes.length) return;
    if (!force && Date.now() < this.focusPinnedUntil && codes.includes(this.focus)) return;
    const i = (codes.indexOf(this.focus) + 1) % codes.length;
    this.setFocus(codes[i]);
  },
  setFocus(code, pin) {
    this.focus = code;
    if (pin) this.focusPinnedUntil = Date.now() + 60e3;
    $$('.tile').forEach((t) => t.classList.toggle('focus', t.dataset.code === code));
    this.renderJudge(code);
    loadTape(code).then(() => { if (code === this.focus) { this.renderBook(); this.renderTape(); } });
    bus.emit('focus', code);
  },

  // ================================================================ 05 結論：自選
  renderTiles(force) {
    const codes = watchCodes();
    const b = $('#c4');
    if (b.dataset.codes !== codes.join(',')) {
      b.innerHTML = `<div class="tiles">${codes.map((c) => `<div class="cd tile" data-code="${c}" id="tile-${c}"><div class="hd"><span class="t">${c} · <em>${esc(etfName(c))}</em></span><span class="r st"></span></div><div class="pxr"><span class="px"></span><span class="cg"></span></div><canvas class="ch"></canvas><div class="tg"></div><div class="ft"></div></div>`).join('')}</div>`;
      b.dataset.codes = codes.join(',');
      $$('.tile', b).forEach((t) => t.addEventListener('click', () => { AU.sfx('click', { gain: 0.8 }); this.setFocus(t.dataset.code, true); }));
      this.layoutDirty = true;
    }
    const rep = this.view.mode === 'replay';
    for (const c of codes) {
      const t = $('#tile-' + c);
      if (!t) continue;
      const e = D.map[c];
      const noTape = rep && !sparkOf(c).length;
      const q = noTape ? quoteClose(c) : rep ? quoteAt(c, this.view.minute) : quote(c);
      const pxEl = t.querySelector('.px');
      if (q && isNum(q.px)) {
        pxEl.classList.remove('na');
        pxEl.className = 'px ' + dirCls(q.chg);
        odo(pxEl, fmtPx(q.px));
      } else { pxEl.className = 'px na'; pxEl.dataset.v = ''; pxEl.textContent = rep ? (this.view.minute < 0 ? '開盤前' : '還沒成交') : '—'; }
      const cg = t.querySelector('.cg');
      const cgh = q && isNum(q.chg) ? `<span class="${dirCls(q.chg)}">${fmtChg(q.chg)}　${fmtPct(q.pct)}</span>` : '';
      if (cg.innerHTML !== cgh) cg.innerHTML = cgh;
      const stance = STANCE[String(e ? e.st : 0)] || STANCE[0];
      const st = t.querySelector('.st'); st.className = 'r st ' + stance.cls; st.textContent = stance.t;
      // 走勢
      const pts = sparkOf(c);
      const cv = t.querySelector('canvas');
      const minute = rep ? this.view.minute : Infinity;
      const key = (pts.length ? pts.filter((p) => p[0] <= minute).length : -1) + ':' + cv.clientWidth + 'x' + cv.clientHeight + (force ? Math.random() : '');
      let src;
      if (pts.length && D.spark && !noTape) {
        if (cv.dataset.k !== key) { CH.wave(cv, pts.filter((p) => p[0] <= minute), { xmax: SESSION_MIN, ref: refClose(c, D.spark.d), all: pts }); cv.dataset.k = key; }
        src = rep ? `REPLAY ${isNum(q && q.m) ? hmText(ymdToMs(this.view.day, 9, 0) + q.m * 60e3) : '09:00'}` : q && q.src === 'live' ? `LIVE ${esc((q.time || '').slice(0, 5))}` : `CLOSE ${dateText(q && q.date)}`;
      } else if (e && Array.isArray(e.sp)) {
        if (cv.dataset.k !== 'sp' + cv.clientWidth) { CH.series(cv, e.sp, { col: NEON.sky }); cv.dataset.k = 'sp' + cv.clientWidth; }
        src = `近 ${e.sp.length} 日 · 收盤 ${dateText(e.d)}`;
      }
      const tg = `<span class="tag zh" style="color:var(--ink2)">${esc(POS_NAMES[e && e.ps] || '—')}</span>${e && isNum(e.cf) ? `<span class="tag" style="color:var(--ink3)">CF ${e.cf}</span>` : ''}${q && isNum(q.prem) && !rep ? `<span class="tag zh" style="color:${Math.abs(q.prem) >= 1 ? 'var(--warn)' : 'var(--ink3)'}">${q.prem >= 0 ? '溢' : '折'} ${Math.abs(q.prem).toFixed(2)}%</span>` : ''}`;
      const tge = t.querySelector('.tg'); if (tge.innerHTML !== tg) tge.innerHTML = tg;
      const ft = `<span>${src || ''}</span><span style="margin-left:auto">${e && isNum(e.y) ? '殖利率 ' + e.y.toFixed(2) + '%' : ''}</span>`;
      const fte = t.querySelector('.ft'); if (fte.innerHTML !== ft) fte.innerHTML = ft;
      t.classList.toggle('focus', c === this.focus);
    }
    const br = breadth();
    this.tab(4, `${codes.length} WATCH`, 1);
  },

  // ================================================================ 06 全局
  renderGlobal() {
    const b = $('#c5');
    const g = D.global || {};
    const M = D.summary && D.summary.market;
    const idx = g.idx || {};
    const temp = g.temp;
    const br = breadth();
    const tx = taiex();
    const usRow = (k, lab) => { const x = idx[k]; if (!x) return ''; const pc = x.live && isNum(x.live.pct) ? x.live.pct : x.chg; const px = x.live ? x.live.px : x.c; const s = clamp(pc / 3, -1, 1); return `<div class="row"><span class="k">${lab}</span><span class="bar mid"><i style="${s >= 0 ? 'left:50%' : 'left:' + (50 + s * 50).toFixed(1) + '%'};width:${(Math.abs(s) * 50).toFixed(1)}%;--bc:${s >= 0 ? NEON.up : NEON.dn}"></i></span><span class="v ${dirCls(pc)}">${fmtPct(pc)}</span></div>`; };
    const cats = {};
    for (const e of (D.summary && D.summary.etfs) || []) { if (e.young || !isNum(e.st)) continue; const o = cats[e.k] || (cats[e.k] = { b: 0, n: 0 }); o.n++; if (e.st > 0) o.b++; }
    const catRows = Object.entries(cats).sort((a, b) => b[1].n - a[1].n).slice(0, 5).map(([k, o]) => `<div class="row"><span class="k zh">${esc(CAT_NAMES()[k] || k)}</span><span class="bar"><i style="width:${(o.b / o.n * 100).toFixed(0)}%;--bc:${NEON.up}"></i></span><span class="v">${o.b}/${o.n}</span></div>`).join('');
    const tcol = temp ? (temp.level === '晴' ? NEON.teal : temp.level === '陰' ? '#ffb02e' : '#ff4d4d') : NEON.flat;
    const html = `
      <div class="cd g1" id="g-tx"><div class="hd"><span class="t">TAIEX · <em>加權 60 日</em></span><span class="r">${dateText(M && M.d)}</span></div><div class="gidx"><div class="gv"><span class="${dirCls(M && M.chg)}">${M ? fmtPx(M.close, 0) : '—'}</span><small class="${dirCls(M && M.chg)}">${M ? fmtPct(M.pct) : ''}</small></div></div><canvas class="ch" style="height:6.4rem"></canvas><div class="ft"><span>季線 <b>${M && isNum(M.ma60) ? fmtPx(M.ma60, 0) : '—'}</b></span><span style="margin-left:auto">${M && M.close < M.ma60 ? '<span class="wr">季線之下</span>' : '<span class="ok">季線之上</span>'}</span></div></div>
      <div class="cd g2" id="g-us"><div class="hd"><span class="t">GLOBAL · <em>美股與避險</em></span><span class="r">${idx.spx ? dateText((idx.spx.live || idx.spx).d) : ''}</span></div>${usRow('spx', 'S&P500')}${usRow('ndx', 'NDX100')}${usRow('sox', 'SOX')}${usRow('vix', 'VIX')}${usRow('twd', 'USD/TWD')}<div class="ft"><span>Cboe · Nasdaq · 央行</span></div></div>
      <div class="cd g4 gtemp" id="g-temp"><div class="hd"><span class="t">TEMP · <em>市場溫度</em></span><span class="r">${temp && temp.n != null ? temp.n + ' 警訊' : ''}</span></div><div class="tv" style="color:${tcol}">${temp ? esc(temp.level) : '—'}</div><ul>${((temp && temp.flags) || []).slice(0, 3).map((f) => `<li>${esc(f.t)}</li>`).join('') || '<li>沒有警訊</li>'}</ul></div>
      <div class="cd g5" id="g-br"><div class="hd"><span class="t">BREADTH · <em>規則分布</em></span><span class="r">${br.n} 檔</span></div><div class="split"><i style="flex-grow:${br.bull};background:${NEON.up};box-shadow:0 0 .8rem ${NEON.up}"></i><i style="flex-grow:${br.neutral};background:#6b7896"></i><i style="flex-grow:${br.bear};background:${NEON.dn};box-shadow:0 0 .8rem ${NEON.dn}"></i></div>${catRows}<div class="ft"><span class="up">多 ${br.bull}</span><span>中 ${br.neutral}</span><span class="dn">空 ${br.bear}</span><span style="margin-left:auto">依 ${dateText(D.summary && D.summary.asof)}</span></div></div>`;
    if (b.dataset.h !== html) {
      b.innerHTML = html; b.dataset.h = html;
      CH.series($('#g-tx canvas'), M && M.spark, { col: M && M.chg >= 0 ? NEON.up : NEON.dn, ref: M && M.ma60 });
      this.layoutDirty = true;
    }
    this.tab(5, temp ? `TEMP ${temp.level}` : '', temp ? (temp.level === '晴' ? 1 : temp.level === '陰' ? 0.55 : 0.22) : 0);
  },

  // ================================================================ 下排：決策程式碼（真的把焦點那一檔的規則算給你看）
  renderCode(code) {
    const el = $('#code');
    const x = D.etf[code], e = D.map[code];
    if (!el || !x || !x.view || !e) return;
    const v = x.view;
    const pad = (s, n) => s + ' '.repeat(Math.max(0, n - Array.from(s).reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)));
    const lines = [];
    lines.push(`<span class="hdr">judge.py · ${esc(code)} · 依 ${dateText(D.summary.asof)} 收盤 · 規則 v${esc(D.summary.engine)}</span>`);
    lines.push(`<span class="kw">def</span> <span class="fn">judge</span>(<span class="st">"${esc(code)}"</span>):`);
    for (const c of v.components) {
      const sc = isNum(c.score) ? (c.score >= 0 ? ' ' : '') + c.score.toFixed(2) : ' None';
      const note = (c.text || '').split(/[；。]/)[0].slice(0, 22);
      lines.push(`    ${pad(esc(c.name), 7)}= <span class="nb">${sc}</span>  <span class="cm"># ${esc(note)}</span>`);
    }
    lines.push(`    score  = Σ w·s = <span class="nb">${(v.score >= 0 ? '+' : '') + v.score.toFixed(3)}</span>`);
    lines.push(`    <span class="kw">return</span> <span class="st">"${esc((STANCE[String(e.st)] || STANCE[0]).t)}"</span>  <span class="cm"># 門檻 ±0.5 · 信心 ${e.cf}</span>`);
    this.typeCode(el, lines);
  },
  typeCode(el, lines) {
    clearTimeout(this._typeT);
    const full = lines;
    let i = 0;
    const step = () => {
      i++;
      el.innerHTML = full.slice(0, i).join('\n') + (i < full.length ? '\n<span class="cur"></span>' : '<span class="cur"></span>');
      if (i < full.length) this._typeT = setTimeout(step, reducedMotion() ? 0 : 120);
    };
    el.innerHTML = '';
    step();
  },

  // ================================================================ 下排：最佳五檔、盤面脈動
  snapNow(code) {
    const day = (D.spark && D.spark.d) || (D.live && D.live.date);
    const snaps = tapeSnaps(code, day);
    if (!snaps.length) return { snaps, cur: null, day };
    const lim = this.view.mode === 'replay' ? this.view.minute : Infinity;
    let cur = null;
    for (const s of snaps) if (s.m <= lim) cur = s;
    return { snaps, cur, day };
  },
  renderBook() {
    const code = this.focus;
    const el = $('#book');
    if (!el || !code) return;
    const { snaps, cur, day } = this.snapNow(code);
    $('#mBook').textContent = `${code} · ${cur ? hmText(cur.q * 1000) : '—'}`;
    if (!cur || !cur.a || !cur.b) { el.innerHTML = `<div class="empty" style="grid-column:1/3">${snaps.length ? '開盤前，還沒有五檔' : '這一檔沒有盤中五檔紀錄'}</div>`; return; }
    const mx = Math.max(...cur.a.map((x) => x[1]), ...cur.b.map((x) => x[1]), 1);
    const lv = (x) => `<div class="lv"><i style="width:${(x[1] / mx * 100).toFixed(0)}%"></i><span>${fmtPx(x[0])}</span><span>${Math.round(x[1] / 1000).toLocaleString()}</span></div>`;
    const recent = snaps.filter((s) => s.m <= (this.view.mode === 'replay' ? this.view.minute : Infinity)).slice(-7).reverse();
    const ref = tapeRef(code, day);
    el.innerHTML = `<div><div class="bk ask"><div class="bh"><span>ASK 賣價</span><span>張</span></div>${cur.a.slice(0, 5).reverse().map(lv).join('')}</div><div class="bk bid" style="margin-top:.3rem"><div class="bh"><span>BID 買價</span><span>張</span></div>${cur.b.slice(0, 5).map(lv).join('')}</div></div>
      <div class="bk"><div class="bh"><span>TIME</span><span>PRICE</span><span>Δ 張</span></div><div class="tsl">${recent.map((s) => `<div><span>${hmText(s.q * 1000)}</span><span class="${dirCls(isNum(ref) ? s.p - ref : 0)}">${fmtPx(s.p)}</span><span>${Math.round((s.dv || 0) / 1000).toLocaleString()}</span></div>`).join('')}</div></div>`;
  },
  renderTape() {
    const code = this.focus;
    const cv = $('#tapeCv');
    if (!cv || !code) return;
    const { snaps, cur, day } = this.snapNow(code);
    const ref = tapeRef(code, day);
    const lim = this.view.mode === 'replay' ? this.view.minute : Infinity;
    CH.tape(cv, snaps, { ref, upto: lim });
    $('#mTape').textContent = `${code} ${etfName(code)} · ${dateText(day)}`;
    const vis = snaps.filter((s) => s.m <= lim);
    const hi = vis.length ? Math.max(...vis.map((s) => s.p)) : null, lo = vis.length ? Math.min(...vis.map((s) => s.p)) : null;
    const vol = cur && isNum(cur.v) ? cur.v / 1000 : null;
    $('#tapeInfo').innerHTML = `<div>OPEN 開盤<b>${vis.length ? fmtPx(vis[0].p) : '—'}</b></div><div>HIGH / LOW<b><span class="up">${fmtPx(hi)}</span> <span class="dn">${fmtPx(lo)}</span></b></div><div>VOL 累積量<b>${vol != null ? Math.round(vol).toLocaleString() + ' 張' : '—'}</b></div>`;
  },

  // ================================================================ 事件紀錄
  log(tag, text, { time = now(), hl = false } = {}) {
    const ul = $('#log');
    if (!ul) return;
    const li = el('li', hl ? 'hl' : '', `<span class="lt">${hmText(time)}</span><span class="${TAG_CLS[tag] || 'ag-core'}">[${TAGS[tag] || 'CORE'}]</span><span class="lx">${esc(text)}</span>`);
    ul.prepend(li);
    while (ul.children.length > 30) ul.lastChild.remove();
    $('#mLog').textContent = this.view.mode === 'replay' ? `REPLAY ${dateText(this.view.day)}` : 'LIVE';
  },
  clearLog() { const ul = $('#log'); if (ul) ul.innerHTML = ''; },

  // ================================================================ 光纜路線
  cardsIn(i) {
    const box = $('#c' + i);
    if (!box) return [];
    const br = box.getBoundingClientRect();
    return $$('#c' + i + ' .cd').filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.top >= br.top - 2 && r.bottom <= br.bottom + 2; });
  },
  computeCables() {
    if (document.documentElement.classList.contains('stack')) { GLX.ok && GLX.setCables([]); return; }
    const cols = [0, 1, 2, 3, 4, 5].map((i) => this.cardsIn(i));
    const list = [];
    const seen = new Set();
    const port = (el, side, k, n) => { const r = el.getBoundingClientRect(); return [side === 'r' ? r.right : r.left, r.top + r.height * (0.28 + 0.44 * (n > 1 ? k / (n - 1) : 0.5))]; };
    const link = (a, b, ci, col) => {
      if (!a || !b) return;
      const key = a.id + '>' + b.id;
      if (seen.has(key)) return; seen.add(key);
      list.push({ a: a.id, b: b.id, col, col0: ci, x0: 0, y0: 0, x1: 0, y1: 0, ea: a, eb: b });
    };
    const colorOf = (el, i) => { const c = getComputedStyle(el).getPropertyValue('--c').trim(); return c && c.startsWith('#') ? c : NEON_LIST[i % NEON_LIST.length]; };
    // 01 → 02：照真的資料流向（哪個來源餵哪一項核對）
    const SRC_LINKS = { mis_etf: ['dual', 'prem'], twse_daily: ['close', 'taiex'], tpex_daily: ['close'], twse_flows: ['taiex'], twse_mflows: ['taiex'], sitca: ['prem'], twse_margin: ['src'], tpex_flows: ['src'], tpex_margin: ['src'], tdcc: ['src'], ust: ['ver'], twse_div: ['ver'], tpex_div: ['ver'], twse_risk: ['src'], tpex_risk: ['src'], stocks: ['ver'] };
    const NEWS_SRC = ['twse_news', 'cna', 'fsc', 'cbc'];
    cols[0].forEach((el, i) => {
      const key = el.id.replace('src-', '');
      const col = colorOf(el, i);
      if (NEWS_SRC.includes(key)) { link(el, $('#nsum'), 0, col); return; }
      (SRC_LINKS[key] || ['src']).forEach((t) => link(el, $('#chk-' + t), 0, col));
    });
    // 其他相鄰兩欄：平均交錯地接起來
    const weave = (a, b, per) => {
      const L = cols[a], R = cols[b];
      if (!L.length || !R.length) return;
      L.forEach((el, i) => {
        const col = colorOf(el, i);
        const j0 = Math.floor(i * R.length / L.length);
        for (let k = 0; k < per; k++) link(el, R[(j0 + k * Math.max(1, Math.ceil(R.length / 3))) % R.length], a, col);
      });
    };
    weave(1, 2, 2); weave(2, 3, 2); weave(3, 4, 2); weave(4, 5, 2);
    // 算座標（同一張卡片的多條線錯開）
    const outs = {}, ins = {};
    list.forEach((c) => { (outs[c.a] = outs[c.a] || []).push(c); (ins[c.b] = ins[c.b] || []).push(c); });
    Object.values(outs).forEach((arr) => arr.forEach((c, k) => { [c.x0, c.y0] = port(c.ea, 'r', k, arr.length); }));
    Object.values(ins).forEach((arr) => arr.forEach((c, k) => { [c.x1, c.y1] = port(c.eb, 'l', k, arr.length); }));
    const out = list.map((c) => ({ a: c.a, b: c.b, col: hexRGB(c.col), col0: c.col0, x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1 }));
    if (GLX.ok) GLX.setCables(out);
    this.layoutDirty = false;
  },

  // ================================================================ 小工具
  hit(node) { if (!node || !node.classList) return; node.classList.remove('hit'); void node.offsetWidth; node.classList.add('hit'); },
  tab(i, text, frac) {
    const p = $('#tp' + i); if (p && p.textContent !== text) p.textContent = text;
    const r = $('#tr' + i); if (r) r.style.width = (clamp(frac || 0, 0, 1) * 100).toFixed(0) + '%';
  },
  stage(i) { const s = $('#tab' + i); if (!s) return; s.classList.add('on'); clearTimeout(s._t); s._t = setTimeout(() => s.classList.remove('on'), 900); },
  toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), ms); },
  beam(sound = true) {
    if (settings.fx === 'low' || reducedMotion()) return;
    const b = $('#beam'); b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
    if (GLX.ok) GLX.fireBeam();
    if (sound) AU.sfx('scan', { gain: 0.9 });
  },
};
