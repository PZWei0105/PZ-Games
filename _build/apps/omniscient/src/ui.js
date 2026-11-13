/* 全知 OMNISCIENT — 畫面：五個處理階段、下排三塊、頂列 */

const COLS = [
  { no: '01', zh: '蒐集', en: 'INGEST' },
  { no: '02', zh: '查證', en: 'VERIFY' },
  { no: '03', zh: '過濾', en: 'FILTER' },
  { no: '04', zh: '判斷', en: 'JUDGE' },
  { no: '05', zh: '結論', en: 'VERDICT' },
];
const ICONS = {
  owl: '<svg viewBox="0 0 32 32"><path d="M6 9l4 3h12l4-3v12a10 10 0 0 1-20 0z"/><circle cx="12" cy="17" r="3.2"/><circle cx="20" cy="17" r="3.2"/><path d="M15 22l1 1.6 1-1.6"/></svg>',
  libra: '<svg viewBox="0 0 32 32"><path d="M16 5v22M8 27h16M5 10h22"/><path d="M9 10l-4 8h8zM23 10l-4 8h8z"/><circle cx="16" cy="5" r="1.6"/></svg>',
  medusa: '<svg viewBox="0 0 32 32"><path d="M6 15a10 10 0 0 1 20 0c0 2-2 2-3 1s-2 1-3 0-2 1-4 0-2 1-3 0-2 1-3 0-3 1-4-1z"/><path d="M10 18c-1 4 1 6 0 10M14 18c0 4 1 6 0 9M18 18c0 4-1 6 0 9M22 18c1 4-1 6 0 10"/></svg>',
  judge: '<svg viewBox="0 0 32 32"><path d="M8 26h16M10 22h12l-1-6H11z"/><path d="M13 16V9a3 3 0 0 1 6 0v7"/><path d="M16 4v2"/></svg>',
  core: '<svg viewBox="0 0 32 32"><path d="M16 3l11 6.5v13L16 29 5 22.5v-13z"/><circle cx="16" cy="16" r="4.6"/><circle cx="16" cy="16" r="1.6"/></svg>',
};
const AGENTS = [
  { id: 'owl', col: 0, zh: '鴞', en: 'OWL', role: '官方資料員', color: '#46d4ff' },
  { id: 'libra', col: 1, zh: '天秤', en: 'LIBRA', role: '查證官', color: '#9b7bff' },
  { id: 'medusa', col: 2, zh: '水母', en: 'MEDUSA', role: '新聞讀者', color: '#ff4fd8' },
  { id: 'judge', col: 3, zh: '判官', en: 'JUDGE', role: '規則判官', color: '#ffbf3c' },
  { id: 'core', col: 4, zh: '核心', en: 'CORE', role: '冷眼核心', color: '#cfe3ff' },
];
const AG = Object.fromEntries(AGENTS.map((a) => [a.id, a]));

const UI = {
  view: { mode: 'live', minute: null, day: null },
  shownNews: new Set(),
  focus: null, focusPinnedUntil: 0, focusIdx: 0,
  lastPx: {},
  logRows: [],

  build() {
    const st = $('#stages');
    st.innerHTML = COLS.map((c, i) => `<div class="st" id="st${i}" style="--acc:var(--c${i})"><span class="sn">${c.no} /</span><b>${c.zh}</b><span class="se">${c.en}</span><span class="pg" id="m${i}"></span></div>`).join('');
    COLS.forEach((c, i) => {
      $('#c' + i).innerHTML = `<div class="shd">${c.no} ${c.zh}<span>${c.en}</span></div><div class="pb" id="b${i}"></div>`;
    });
    $('#pLog').innerHTML = '<header class="ph"><span class="no">◆</span><h2>一則決策的一生</h2><span class="en">LIFE OF A DECISION</span><span class="meta" id="mLog"></span></header><div class="pb"><ol class="log" id="log"></ol></div>';
    $('#pAgents').innerHTML = '<header class="ph"><span class="no">◆</span><h2>代理人網路</h2><span class="en">AGENT MESH</span><span class="meta" id="mAg"></span></header><div class="pb"><div class="mesh" id="mesh"></div></div>';
    $('#pPulse').innerHTML = '<header class="ph"><span class="no">◆</span><h2>盤面脈動</h2><span class="en">MARKET PULSE</span><span class="meta" id="mPulse"></span></header><div class="pb"><div class="pulse" id="pulse"></div></div>';
    $('#fnote').innerHTML = `所有數字都來自冷眼的公開資料（證交所、櫃買中心、集保、投信投顧公會、央行、金管會、中央社）· 不補、不猜、不造假 · 個人研究用途，不是投資建議 · v${VERSION}`;
    this.buildMesh();
  },

  // ---------------------------------------------------------------- 頂列
  renderTop() {
    const g = D.global, temp = g && g.temp;
    const br = breadth();
    const h = sourceHealth();
    const fl = freshness('live');
    const liveAge = D.live ? now() - parseTs(D.live.at) : NaN;
    const ph = marketPhase();
    const tempLv = temp ? temp.level : null;
    const rings = [
      { v: tempLv === '晴' ? 1 : tempLv === '陰' ? 0.55 : tempLv === '雨' ? 0.22 : 0, txt: tempLv || '—', l: '市場溫度', c: tempLv === '晴' ? 'var(--ok)' : tempLv === '陰' ? 'var(--warn)' : tempLv === '雨' ? 'var(--bad)' : 'var(--ink3)' },
      { v: br.n ? br.bull / br.n : 0, txt: br.n ? Math.round(br.bull / br.n * 100) + '%' : '—', l: '偏多比例', c: 'var(--up)' },
      { v: h.total ? h.ok / h.total : 0, txt: h.total ? `${h.ok}/${h.total}` : '—', l: '官方來源', c: h.err ? 'var(--warn)' : 'var(--c0)' },
      D.link === 'down' ? { v: 0.08, txt: '斷線', l: '連不上冷眼', c: 'var(--bad)' }
        : { v: ph.phase === 'open' ? clamp(1 - liveAge / 1800e3, 0.04, 1) : (fl.level === 'ok' ? 1 : 0.4), txt: ph.phase === 'open' && isFinite(liveAge) ? Math.max(0, Math.round(liveAge / 60e3)) + '分' : fl.level === 'ok' ? '最新' : '舊', l: ph.phase === 'open' ? '盤中資料年齡' : '資料新鮮度', c: fl.level === 'ok' ? 'var(--c3)' : fl.level === 'warn' ? 'var(--warn)' : 'var(--bad)' },
    ];
    const C = 2 * Math.PI * 27;
    const r = $('#rings');
    if (!r.children.length) r.innerHTML = rings.map(() => `<div class="ring"><svg viewBox="0 0 64 64"><circle class="trk" cx="32" cy="32" r="27"/><circle class="val" cx="32" cy="32" r="27" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg><div class="rv"></div><div class="rl"></div></div>`).join('');
    rings.forEach((x, i) => {
      const n = r.children[i];
      const v = n.querySelector('.val');
      v.style.strokeDashoffset = String(C * (1 - clamp(x.v, 0, 1)));
      v.style.stroke = x.c; v.style.color = x.c;
      n.querySelector('.rv').textContent = x.txt;
      n.querySelector('.rl').textContent = x.l;
    });
    // 數字
    const tx = taiex();
    const M = D.summary && D.summary.market;
    const ins = M && M.insti;
    const txf = g && g.txf && g.txf.txf_day;
    let tHtml;
    const rep = this.view.mode === 'replay';
    if (rep && tx && this.view.day && (tx.date !== this.view.day || this.view.minute < SESSION_MIN)) {
      // 回放中：指數只有收盤值，13:30 以前先顯示昨收（不編造盤中指數）
      const ref = tx.date === this.view.day ? tx.v - tx.chg : tx.v;
      tHtml = `<div class="sl">加權指數 · 回放中</div><div class="sv">${fmtPx(ref)}</div><div class="ss flat">昨收 · 13:30 揭曉收盤</div><div class="sm">盤中指數沒有逐筆紀錄，看右下 0050 走勢</div>`;
    } else if (tx) {
      tHtml = `<div class="sl">加權指數 · ${tx.src === 'live' ? '盤中 ' + esc(tx.time || '') : '收盤 ' + dateText(tx.date)}</div><div class="sv ${dirCls(tx.chg)}">${fmtPx(tx.v)}</div><div class="ss ${dirCls(tx.chg)}">${fmtChg(tx.chg)}　${fmtPct(tx.pct)}</div><div class="sm">來源：證交所</div>`;
    } else tHtml = '<div class="sl">加權指數</div><div class="sv">—</div>';
    const tot = ins ? (ins.f || 0) + (ins.t || 0) + (ins.d || 0) : null;
    const stats = [
      tHtml,
      `<div class="sl">集中市場成交值 · ${dateText(M && M.d)}</div><div class="sv">${M ? fmtMoney(M.val).replace(' ', '<small style="font-size:.5em"> ') + '</small>' : '—'}</div><div class="sm">證交所每日收盤行情</div>`,
      `<div class="sl">三大法人合計 · ${dateText(ins && ins.date)}</div><div class="sv ${dirCls(tot)}">${ins ? fmtSignedMoney(tot).replace(' ', '<small style="font-size:.5em"> ') + '</small>' : '—'}</div><div class="ss">${ins ? `<span class="${dirCls(ins.f)}">外 ${fmtSignedMoney(ins.f)}</span> <span class="${dirCls(ins.t)}">投 ${fmtSignedMoney(ins.t)}</span>` : ''}</div>`,
      `<div class="sl">台指期 · ${txf ? esc(txf.t || '') + ' ' + dateText(txf.d) : '—'}</div><div class="sv ${dirCls(txf && txf.pct)}">${txf ? fmtPx(txf.px, 0) : '—'}</div><div class="ss ${dirCls(txf && txf.pct)}">${txf ? fmtPct(txf.pct) : ''}</div><div class="sm">臺灣期貨交易所</div>`,
    ];
    const s = $('#stats');
    if (!s.children.length) s.innerHTML = stats.map(() => '<div class="stat"></div>').join('');
    stats.forEach((h2, i) => { if (s.children[i].innerHTML !== h2) s.children[i].innerHTML = h2; });
    this.renderMode();
  },
  renderMode() {
    const ph = marketPhase();
    let badge;
    if (D.link === 'down') badge = '<span class="badge down"><i class="dot"></i>斷線 OFFLINE</span>';
    else if (this.view.mode === 'replay') badge = `<span class="badge replay"><i class="dot"></i>回放 REPLAY ${dateText(this.view.day)}（${WD[weekday(this.view.day || ph.today)]}）</span>`;
    else if (ph.phase === 'open') badge = '<span class="badge live"><i class="dot"></i>盤中 LIVE</span>';
    else badge = `<span class="badge closed"><i class="dot"></i>${ph.phase === 'pre' ? '開盤前' : ph.phase === 'post' ? '已收盤' : '休市'} · 下次開盤 ${dateText(ph.next)}</span>`;
    const t = tw();
    const lastData = D.version && D.version.built ? parseTs(D.version.built) : (D.live ? parseTs(D.live.at) : NaN);
    const html = `${badge}<div class="clock">${pad2(t.hh)}:${pad2(t.mi)}<small style="margin-left:0">:${pad2(t.ss)}</small><small>${t.m}/${t.d}（${WD[t.wd]}）</small></div><div class="age">冷眼最近一次更新 ${stampText(lastData)} · ${ageText(lastData)}</div>`;
    const m = $('#mode');
    if (m.innerHTML !== html) m.innerHTML = html;
  },

  // ---------------------------------------------------------------- 01 蒐集
  renderSources() {
    const L = sourcesList();
    const b = $('#b0');
    const html = L.map((s) => {
      const age = isFinite(s.ok) ? now() - s.ok : Infinity;
      const w = isFinite(age) ? clamp(1 - age / (4 * 86400e3), 0.03, 1) : 0;
      return `<a class="card src ${s.st}" id="src-${s.key}" href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.name)}"><i class="lamp ${s.st}"></i><span class="on2">${esc(s.org)}</span><span class="tm">${s.st === 'idle' ? '未啟用' : stampText(s.ok)}<small>${s.st === 'err' ? '抓取失敗' : s.st === 'idle' ? '' : ageText(s.ok)}</small></span><span class="wt">${esc(s.what)}</span><span class="bar"><i style="width:${(w * 100).toFixed(0)}%"></i></span></a>`;
    }).join('');
    if (b.dataset.h !== html) { b.innerHTML = html; b.dataset.h = html; }
    const h = sourceHealth();
    $('#m0').textContent = `${h.ok}/${h.total} 正常`;
  },

  // ---------------------------------------------------------------- 02 查證
  renderVerify() {
    const C = verifyChecks();
    const b = $('#b1');
    const label = { pass: '通過 PASS', warn: '注意 CHECK', fail: '失敗 FAIL', wait: '等待 WAIT' };
    const html = C.map((c) => `<div class="card chk ${c.st}" id="chk-${c.id}"><div class="ct">${esc(c.title)}</div><div class="cb">${esc(c.big)}</div><div class="co">${esc(c.org)} · <span class="cs">${label[c.st]}</span></div><div class="cd">${esc(c.detail)}</div><i class="scan"></i></div>`).join('');
    if (b.dataset.h !== html) { b.innerHTML = html; b.dataset.h = html; }
    const pass = C.filter((c) => c.st === 'pass').length;
    $('#m1').textContent = `${pass}/${C.length} 通過`;
    return C;
  },

  // ---------------------------------------------------------------- 03 過濾
  /** list：要顯示的新聞（新的在前）；回傳這次第一次出現的 */
  renderNews(list, day) {
    const b = $('#b2');
    const fresh = [];
    const counts = kindCounts(list);
    const top = list.slice(0, 14);
    const rows = top.map((x) => {
      const isNew = !this.shownNews.has(x.url);
      if (isNew) fresh.push(x);
      const k = KIND_INFO[x.kind] || KIND_INFO.fact;
      let t = esc(x.t);
      if (x.trig) t = t.replace(esc(x.trig), `<mark>${esc(x.trig)}</mark>`);
      return `<a class="card news ${k.cls}${isNew && this.newsReady ? ' new' : ''}" id="nw-${x.i}" href="${esc(x.url)}" target="_blank" rel="noopener"><div class="nt">${t}</div><div class="nm"><span>${x.timed ? hmText(x.ms) : dateText(x.day)}</span><span>${esc(x.srcName)}</span>${x.trig ? `<span class="k-op">因「${esc(x.trig)}」標為觀點</span>` : ''}</div><span class="stp ${k.cls}">${k.short}</span></a>`;
    });
    const head = `<div class="nstat"><span class="chip k-off">官方 ${counts.official}</span><span class="chip k-fact">事實 ${counts.fact}</span><span class="chip k-op">觀點 ${counts.opinion}</span><span class="chip idle">${day ? dateText(day) : ''}</span></div>`;
    const html = head + (rows.length ? rows.join('') : `<div class="empty">${day ? dateText(day) + ' 這天到目前為止<br>還沒有官方公告或新聞' : '還沒有新聞'}</div>`);
    if (b.dataset.h !== html) { b.innerHTML = html; b.dataset.h = html; }
    top.forEach((x) => this.shownNews.add(x.url));
    this.newsReady = true;
    $('#m2').textContent = D.news ? `更新 ${stampText(parseTs(D.news.generated))}` : '—';
    return fresh;
  },

  // ---------------------------------------------------------------- 04 判斷
  async renderJudge(code) {
    if (!code) return;
    const e = D.map[code];
    const x = await loadEtf(code);
    if (code !== this.focus) return;   // 等資料的時候已經換下一檔
    const b = $('#b3');
    const v = x && x.view;
    const stance = STANCE[String(e ? e.st : 0)] || STANCE[0];
    const score = v ? v.score : e && e.sc;
    const comps = (v && v.components) || [];
    const codes = watchCodes();
    const ang = clamp((isNum(score) ? score : 0) / 2, -1, 1) * 120;
    const arc = (a0, a1, r) => { const p = (a) => [60 + r * Math.sin(a * Math.PI / 180), 60 - r * Math.cos(a * Math.PI / 180)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
    const sim = (v && v.similar) || (e && e.sim);
    const bt = x && x.bt;
    const lv = v && v.levels;
    const html = `
      <div class="jh"><span class="jc">${esc(code)}</span><span class="jn">${esc(e ? e.n : code)}</span><span class="jdots">${codes.map((c) => `<i class="${c === code ? 'on' : ''}"></i>`).join('')}</span></div>
      <div class="jsub">${esc(CAT_NAMES()[e && e.k] || '')} · 規則 v${esc((D.summary && D.summary.engine) || '')} · 依 ${dateText(D.summary && D.summary.asof)} 收盤計算 · 約 20 個交易日的尺度</div>
      <div class="verdict">
        <div class="dial"><svg viewBox="0 0 120 120"><path d="${arc(-120, 120, 50)}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="7" stroke-linecap="round"/>
          <path d="${arc(-120, -30, 50)}" fill="none" stroke="var(--dn)" stroke-opacity=".5" stroke-width="7" stroke-linecap="round"/>
          <path d="${arc(30, 120, 50)}" fill="none" stroke="var(--up)" stroke-opacity=".5" stroke-width="7" stroke-linecap="round"/>
          <g style="transform:rotate(${ang.toFixed(1)}deg);transform-origin:60px 60px;transition:transform 1.2s cubic-bezier(.2,1.3,.4,1)"><path d="M60 60L60 16" stroke="#fff" stroke-width="3" stroke-linecap="round" style="filter:drop-shadow(0 0 4px #fff)"/></g>
          <circle cx="60" cy="60" r="5" fill="var(--c3)"/></svg>
          <div class="dt"><b class="${stance.cls}">${stance.t}</b><span>${isNum(score) ? (score > 0 ? '+' : '') + score.toFixed(2) : '—'}</span></div></div>
        <div class="vinfo"><div class="va">${esc((v && v.advice && v.advice.action) || (e && e.a) || '—')}</div>
          <div class="vm">信心 <b>${e && isNum(e.cf) ? e.cf : '—'}</b> · 部位訊號 <b>${esc(POS_NAMES[e && e.ps] || '—')}</b>${e && isNum(e.dl) ? ` · 防守線 <b>${fmtPx(e.dl)}</b>` : ''}<br>
          ${lv && lv.turn_bull ? `站上 <b>${fmtPx(lv.turn_bull.price)}</b>（${esc(lv.turn_bull.label)}）轉多` : ''}${lv && lv.turn_bear ? ` · 跌破 <b>${fmtPx(lv.turn_bear.price)}</b> 轉空` : ''}</div></div>
      </div>
      ${comps.map((c) => {
        const s = isNum(c.score) ? clamp(c.score / 2, -1, 1) : 0;
        return `<div class="comp"><div class="cn">${esc(c.name)}<small>權重 ${Math.round((c.weight || 0) * 100)}%</small></div><div class="cbar"><i class="${s >= 0 ? 'p' : 'n'}" style="width:${(Math.abs(s) * 50).toFixed(1)}%"></i></div><div class="cv ${dirCls(c.score)}">${isNum(c.score) ? (c.score > 0 ? '+' : '') + c.score.toFixed(1) : '—'}</div><div class="ctx" title="${esc(c.text)}">${esc(c.text)}</div></div>`;
      }).join('') || '<div class="empty">這一檔還沒有足夠的歷史資料可以判斷</div>'}
      <div class="jfoot">${sim && isNum(sim.hit) ? `同類 ETF 歷史上出現同方向訊號：命中 <b>${(sim.hit * 100).toFixed(1)}%</b>，同類任何一天 <b>${(sim.base * 100).toFixed(1)}%</b>（${sim.n} 次）` : ''}${bt && bt.bull ? `<br>這一檔回測：偏多命中 <b>${(bt.bull.hit * 100).toFixed(1)}%</b> vs 任何一天上漲 <b>${(bt.base_up * 100).toFixed(1)}%</b>（${bt.start ? Math.floor(bt.start / 10000) + ' 年起' : ''}）` : ''}${x && x._offline ? '<br><span style="color:var(--warn)">離線：顯示上次存下的分析</span>' : ''}</div>`;
    b.innerHTML = html;
    $('#m3').textContent = `焦點 ${code} · ${stance.t}`;
    this.hit($('#c3'));
  },
  nextFocus(force) {
    const codes = watchCodes();
    if (!codes.length) return;
    if (!force && Date.now() < this.focusPinnedUntil && codes.includes(this.focus)) return;
    this.focusIdx = (codes.indexOf(this.focus) + 1) % codes.length;
    this.setFocus(codes[this.focusIdx]);
  },
  setFocus(code, pin) {
    this.focus = code;
    if (pin) this.focusPinnedUntil = Date.now() + 60e3;
    $$('.tile').forEach((t) => t.classList.toggle('focus', t.dataset.code === code));
    this.renderJudge(code);
    bus.emit('focus', code);
  },

  // ---------------------------------------------------------------- 05 結論
  renderTiles() {
    const codes = watchCodes();
    const b = $('#b4');
    if (b.dataset.codes !== codes.join(',')) {
      b.innerHTML = `<div class="tiles">${codes.map((c) => `<div class="card tile" data-code="${c}" id="tile-${c}"><div class="tt"><span class="tc">${c}</span><span class="tn">${esc(etfName(c))}</span></div><div class="tp mono">—</div><div class="tq"></div><svg class="spk" preserveAspectRatio="none"></svg><div class="tb2"></div></div>`).join('')}</div>`;
      b.dataset.codes = codes.join(',');
      $$('.tile', b).forEach((t) => t.addEventListener('click', () => { SFX.click(); this.setFocus(t.dataset.code, true); }));
    }
    const rep = this.view.mode === 'replay';
    for (const c of codes) {
      const t = $('#tile-' + c);
      if (!t) continue;
      const e = D.map[c];
      const noTape = rep && !sparkOf(c).length;   // 這一檔那天沒有盤中紀錄（例如暫停交易）：照實顯示最近的官方收盤
      const q = noTape ? quoteClose(c) : rep ? quoteAt(c, this.view.minute) : quote(c);
      const pxEl = t.querySelector('.tp');
      const pxTxt = q && isNum(q.px) ? fmtPx(q.px) : (rep ? (UI.view.minute < 0 ? '開盤前' : '還沒成交') : '—');
      if (pxEl.textContent !== pxTxt) {
        const prev = this.lastPx[c];
        pxEl.textContent = pxTxt;
        if (q && isNum(q.px) && isNum(prev) && q.px !== prev) { pxEl.classList.remove('flash-up', 'flash-dn'); void pxEl.offsetWidth; pxEl.classList.add(q.px > prev ? 'flash-up' : 'flash-dn'); }
        this.lastPx[c] = q && q.px;
      }
      pxEl.className = 'tp mono ' + (q && isNum(q.px) ? '' : 'na ') + dirCls(q && q.chg) + (pxEl.classList.contains('flash-up') ? ' flash-up' : pxEl.classList.contains('flash-dn') ? ' flash-dn' : '');
      const qh = q && isNum(q.chg) ? `<span class="${dirCls(q.chg)}">${fmtChg(q.chg)}</span><span class="${dirCls(q.chg)}">${fmtPct(q.pct)}</span>` : '<span class="flat">　</span>';
      const tq = t.querySelector('.tq'); if (tq.innerHTML !== qh) tq.innerHTML = qh;
      // 走勢：今天有盤中紀錄就畫今天，否則畫近 40 個交易日收盤
      const pts = sparkOf(c);
      const svg = t.querySelector('.spk');
      const W = 200, H = 60;
      let sh = '', longView = false;
      const ref = refClose(c, D.spark && D.spark.d);
      if (pts.length && D.spark) {
        const show = rep ? pts.filter((p) => p[0] <= this.view.minute) : pts;
        const ys = pts.map((p) => p[1]).concat(isNum(ref) ? [ref] : []);
        const lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
        const X = (m) => (m / SESSION_MIN) * W, Y = (p) => H - 4 - (p - lo) / span * (H - 8);
        const last = show.length ? show[show.length - 1] : null;
        const col = last && isNum(ref) ? (last[1] > ref ? 'var(--up)' : last[1] < ref ? 'var(--dn)' : 'var(--flat)') : 'var(--flat)';
        const d = show.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join('');
        sh = `<defs><linearGradient id="g-${c}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".35"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>`
          + (isNum(ref) ? `<line x1="0" x2="${W}" y1="${Y(ref).toFixed(1)}" y2="${Y(ref).toFixed(1)}" stroke="rgba(255,255,255,.28)" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>` : '')
          + (show.length > 1 ? `<path d="${d}L${X(last[0]).toFixed(1)} ${H}L${X(show[0][0]).toFixed(1)} ${H}Z" fill="url(#g-${c})"/><path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke" style="filter:drop-shadow(0 0 3px ${col})"/>` : '')
          + (last ? `<circle cx="${X(last[0]).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="2.6" fill="#fff" style="filter:drop-shadow(0 0 4px ${col})"/>` : '');
      } else if (e && Array.isArray(e.sp) && e.sp.length > 1) {
        const lo = Math.min(...e.sp), hi = Math.max(...e.sp), span = hi - lo || 1;
        const d = e.sp.map((p, i) => `${i ? 'L' : 'M'}${(i / (e.sp.length - 1) * W).toFixed(1)} ${(H - 4 - (p - lo) / span * (H - 8)).toFixed(1)}`).join('');
        sh = `<path d="${d}" fill="none" stroke="var(--c4)" stroke-opacity=".7" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`;
        longView = true;
      }
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      if (svg.dataset.h !== sh) { svg.innerHTML = sh; svg.dataset.h = sh; }
      const stance = STANCE[String(e ? e.st : 0)] || STANCE[0];
      const src = noTape ? `收盤 ${dateText(q && q.date)} · 當天沒有盤中紀錄` : longView ? `近 ${e.sp.length} 日收盤（${dateText(e.d)}）` : rep ? `回放 ${isNum(q && q.m) ? hmText(ymdToMs(this.view.day, 9, 0) + q.m * 60e3) : '09:00'}` : q && q.src === 'live' ? `盤中 ${esc((q.time || '').slice(0, 5))}` : `收盤 ${dateText(q && q.date)}`;
      const bh = `<span class="pill ${stance.cls}">${stance.t}</span><span class="pill" style="color:var(--ink2)">${esc(POS_NAMES[e && e.ps] || '—')}</span>${q && isNum(q.prem) && !rep ? `<span class="pill" style="color:${Math.abs(q.prem) >= 1 ? 'var(--warn)' : 'var(--ink3)'}">${q.prem >= 0 ? '溢' : '折'} ${Math.abs(q.prem).toFixed(2)}%</span>` : ''}<span class="src2">${src}</span>`;
      const tb2 = t.querySelector('.tb2'); if (tb2.innerHTML !== bh) tb2.innerHTML = bh;
      t.classList.toggle('focus', c === this.focus);
    }
    const br = breadth();
    $('#m4').textContent = `自選 ${codes.length} 檔` + (br.n ? ` · 全市場 多 ${br.bull}・空 ${br.bear}` : '');
  },

  // ---------------------------------------------------------------- 下排：事件紀錄
  log(agent, text, { time = now(), hl = false } = {}) {
    const a = AG[agent] || AG.core;
    const ul = $('#log');
    if (!ul) return;
    const li = el('li', hl ? 'hl' : '', `<span class="lt">${hmText(time)}</span><span class="la ag-${a.id}">[${a.en}]</span><span class="lx">${esc(text)}</span>`);
    ul.prepend(li);
    while (ul.children.length > 40) ul.lastChild.remove();
    $('#mLog').textContent = this.view.mode === 'replay' ? `回放 ${dateText(this.view.day)}` : '即時';
    this.agentHit(a.id);
  },
  clearLog() { const ul = $('#log'); if (ul) ul.innerHTML = ''; },

  // ---------------------------------------------------------------- 下排：代理人
  buildMesh() {
    const m = $('#mesh');
    const pos = [[13, 30], [31, 74], [69, 74], [87, 30], [50, 36]];
    const P = { owl: pos[0], libra: pos[1], medusa: pos[2], judge: pos[3], core: pos[4] };
    this.meshPos = P;
    const pairs = [['owl', 'libra'], ['libra', 'medusa'], ['medusa', 'judge'], ['owl', 'core'], ['libra', 'core'], ['medusa', 'core'], ['judge', 'core'], ['owl', 'medusa'], ['libra', 'judge']];
    m.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${pairs.map(([a, b]) => `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke="url(#mg)" stroke-width=".35" vector-effect="non-scaling-stroke" stroke-opacity=".55"/>`).join('')}<defs><linearGradient id="mg"><stop offset="0" stop-color="#46d4ff"/><stop offset=".5" stop-color="#ff4fd8"/><stop offset="1" stop-color="#ffbf3c"/></linearGradient></defs></svg>`
      + AGENTS.map((a) => `<div class="anode" id="ag-${a.id}" style="left:${P[a.id][0]}%;top:${P[a.id][1]}%;color:${a.color}"><div class="ai">${ICONS[a.id]}</div><b>${a.zh} ${a.en}</b><span id="ags-${a.id}">${a.role}</span></div>`).join('');
    this.meshPairs = pairs;
  },
  agentStatus(id, text) { const s = $('#ags-' + id); if (s && s.textContent !== text) s.textContent = text; },
  agentHit(id) { const n = $('#ag-' + id); if (!n) return; n.classList.remove('hit'); void n.offsetWidth; n.classList.add('hit'); },
  renderAgents(newsList) {
    const h = sourceHealth();
    const C = verifyChecks();
    const br = breadth();
    const k = kindCounts(newsList || []);
    this.agentStatus('owl', `官方來源 ${h.ok}/${h.total} 正常`);
    this.agentStatus('libra', `核對 ${C.filter((c) => c.st === 'pass').length} 通過・${C.filter((c) => c.st === 'wait').length} 等待`);
    this.agentStatus('medusa', `${newsList ? newsList.length : 0} 則・觀點 ${k.opinion}`);
    this.agentStatus('judge', br.n ? `多 ${br.bull}・中 ${br.neutral}・空 ${br.bear}` : '等資料');
    this.agentStatus('core', D.summary ? `觀點依 ${dateText(D.summary.asof)} 收盤` : '等資料');
    $('#mAg').textContent = `${AGENTS.length} 名上線`;
  },

  // ---------------------------------------------------------------- 下排：盤面脈動
  renderPulse() {
    const M = D.summary && D.summary.market;
    const g = D.global;
    const p = $('#pulse');
    const W = 300, H = 80;
    const line = (vals, col, ref) => {
      if (!vals || vals.length < 2) return '';
      const ys = vals.concat(isNum(ref) ? [ref] : []);
      const lo = Math.min(...ys), hi = Math.max(...ys), sp = hi - lo || 1;
      const d = vals.map((v, i) => `${i ? 'L' : 'M'}${(i / (vals.length - 1) * W).toFixed(1)} ${(H - 4 - (v - lo) / sp * (H - 8)).toFixed(1)}`).join('');
      return (isNum(ref) ? `<line x1="0" x2="${W}" y1="${(H - 4 - (ref - lo) / sp * (H - 8)).toFixed(1)}" y2="${(H - 4 - (ref - lo) / sp * (H - 8)).toFixed(1)}" stroke="rgba(255,255,255,.25)" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>` : '')
        + `<path d="${d}L${W} ${H}L0 ${H}Z" fill="${col}" fill-opacity=".09"/><path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke" style="filter:drop-shadow(0 0 3px ${col})"/>`;
    };
    // 左：加權指數近 60 個交易日（官方收盤）
    const tx = taiex();
    const c1 = M && Array.isArray(M.spark) ? line(M.spark, M.chg >= 0 ? '#ff4d6d' : '#22e39a', M.ma60) : '';
    // 右：今日走勢（焦點那一檔；回放時只畫到回放的時間）
    const fc = this.focus || watchCodes()[0];
    const pts = sparkOf(fc);
    const rep = this.view.mode === 'replay';
    const showPts = rep ? pts.filter((q) => q[0] <= this.view.minute) : pts;
    const ref = refClose(fc, D.spark && D.spark.d);
    let c2 = '';
    if (pts.length) {
      const ys = pts.map((q) => q[1]).concat(isNum(ref) ? [ref] : []);
      const lo = Math.min(...ys), hi = Math.max(...ys), sp = hi - lo || 1;
      const Y = (v) => H - 4 - (v - lo) / sp * (H - 8);
      const last = showPts[showPts.length - 1];
      const col = last && isNum(ref) ? (last[1] >= ref ? '#ff4d6d' : '#22e39a') : '#cfe3ff';
      const d = showPts.map((q, i) => `${i ? 'L' : 'M'}${(q[0] / SESSION_MIN * W).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join('');
      c2 = (isNum(ref) ? `<line x1="0" x2="${W}" y1="${Y(ref).toFixed(1)}" y2="${Y(ref).toFixed(1)}" stroke="rgba(255,255,255,.25)" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>` : '')
        + [60, 120, 180, 240].map((m) => `<line x1="${(m / SESSION_MIN * W).toFixed(1)}" x2="${(m / SESSION_MIN * W).toFixed(1)}" y1="0" y2="${H}" stroke="rgba(255,255,255,.05)" vector-effect="non-scaling-stroke"/>`).join('')
        + (showPts.length > 1 ? `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke" style="filter:drop-shadow(0 0 3px ${col})"/>` : '')
        + (last ? `<circle cx="${(last[0] / SESSION_MIN * W).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="3" fill="#fff"/>` : '');
    }
    const ins = M && M.insti;
    const mx = ins ? Math.max(Math.abs(ins.f || 0), Math.abs(ins.t || 0), Math.abs(ins.d || 0), 1) : 1;
    const ib = (lab, v) => `<div class="ib"><div class="il">${lab}</div><div class="iv ${dirCls(v)}">${fmtSignedMoney(v)}</div><div class="ibar"><i style="${v >= 0 ? 'left:50%' : 'right:50%'};width:${(Math.abs(v || 0) / mx * 50).toFixed(1)}%;background:${v >= 0 ? 'var(--up)' : 'var(--dn)'}"></i></div></div>`;
    const idx = (g && g.idx) || {};
    const gq = (k, lab) => { const x = idx[k]; if (!x) return `<div class="gq">${lab}<b>—</b></div>`; const px = x.live ? x.live.px : x.c, pc = x.live && isNum(x.live.pct) ? x.live.pct : x.chg; return `<div class="gq">${lab} ${dateText(x.live ? x.live.d : x.d)}<b class="${dirCls(pc)}">${fmtPx(px, k === 'twd' ? 3 : 2)} <small>${fmtPct(pc)}</small></b></div>`; };
    const temp = g && g.temp;
    const html = `
      <div class="pchart"><div class="pl"><span>加權指數 · 近 60 個交易日</span><b class="${dirCls(tx && tx.chg)}">${tx ? fmtPx(tx.v) : '—'}</b></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${c1}</svg></div>
      <div class="pchart"><div class="pl"><span>${esc(fc || '')} ${esc(etfName(fc))} · ${dateText(D.spark && D.spark.d)} 盤中</span><b>${rep ? '回放中' : '09:00–13:30'}</b></div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${c2}</svg></div>
      <div class="insti">${ins ? ib('外資 · ' + dateText(ins.date), ins.f) + ib('投信', ins.t) + ib('自營商', ins.d) : '<div class="gq">三大法人資料還沒出來</div>'}</div>
      <div class="glob">${gq('spx', 'S&P 500')}${gq('ndx', '那指 100')}${gq('sox', '費半')}${gq('vix', 'VIX')}${gq('twd', '新台幣')}</div>`;
    if (p.dataset.h !== html) { p.innerHTML = html; p.dataset.h = html; }
    $('#mPulse').textContent = temp ? `市場溫度 ${temp.level}${temp.flags && temp.flags.length ? ' · ' + temp.flags.length + ' 個警訊' : ''}` : '';
  },

  // ---------------------------------------------------------------- 小工具
  hit(node) { if (!node) return; node.classList.remove('hit'); void node.offsetWidth; node.classList.add('hit'); },
  stage(i) { const s = $('#st' + i); if (!s) return; s.classList.remove('on'); void s.offsetWidth; s.classList.add('on'); clearTimeout(s._t); s._t = setTimeout(() => s.classList.remove('on'), 1600); },
  toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), ms); },
  beam() { if (settings.fx === 'low' || reducedMotion()) return; const b = $('#beam'); b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); SFX.beam(); },
};
