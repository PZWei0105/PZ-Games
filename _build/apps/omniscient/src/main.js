/* 全知 OMNISCIENT v2 — 開機、即時／回放兩種模式、事件 → 光纜上的光點、聲音與畫面 */

const APP = { booted: false, wake: null, lastPx: 0, lastSec: null, stack: false };

// ---------------------------------------------------------------- 版面
function layoutMode() {
  const stack = innerWidth < 1000 || innerWidth / innerHeight < 1.15;
  APP.stack = stack;
  document.documentElement.classList.toggle('stack', stack);
}
let cableT = 0;
function scheduleCables() { cancelAnimationFrame(cableT); cableT = requestAnimationFrame(() => requestAnimationFrame(() => UI.computeCables())); }

// ---------------------------------------------------------------- 光點（沿著光纜送；兩張卡片之間沒有光纜就臨時拉一條）
const FX = {
  send(a, b, hex, { dur = 0.8, size = 1, onArrive } = {}) {
    if (!a || !b || !GLX.ok || APP.stack || settings.fx === 'low' && GLX.packets.length > 10) { if (onArrive) onArrive(); return; }
    const col = hexRGB(hex);
    const ci = GLX.cableKey[a.id + '>' + b.id];
    if (ci != null) { GLX.packet(0, 0, 0, 0, col, { cable: ci, dur, size, onArrive }); return; }
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    if (!ra.height || !rb.height) { if (onArrive) onArrive(); return; }
    const fwd = rb.left >= ra.right - 4;
    GLX.packet(fwd ? ra.right : ra.left + ra.width / 2, ra.top + ra.height / 2, fwd ? rb.left : rb.left + rb.width / 2, rb.top + rb.height / 2, col, { dur, size, onArrive });
  },
  /** 一站一站傳下去：每到一站，那張卡片就閃一下、發一聲很輕的「滴」（對齊配樂的拍子） */
  chain(els, hex, opts = {}) {
    const list = els.filter(Boolean);
    const step = (i) => {
      if (i >= list.length - 1) { if (opts.done) opts.done(); return; }
      this.send(list[i], list[i + 1], hex, {
        dur: opts.dur || 0.75, size: opts.size || 1,
        onArrive: () => {
          const n = list[i + 1];
          UI.hit(n.closest('.cd') || n);
          const col = n.closest('[data-col]');
          if (col) UI.stage(+col.dataset.col);
          AU.sfx('tick' + (1 + (i % 3)), { quant: true, gain: 0.55, pan: AU.panOf(n), gate: 45 });
          if (opts.each) opts.each(i + 1, n);
          step(i + 1);
        },
      });
    };
    step(0);
  },
};
const byId = (id) => (id ? document.getElementById(id) : null);

// ---------------------------------------------------------------- 全部重畫
function currentNews() {
  if (RP.active) {
    const lim = RP.minuteOf(RP.p);
    return newsOn(RP.day).filter((x) => (x.timed ? RP.dayMin(x.ms) : 480) <= lim);
  }
  return newsAll();
}
function renderAll() {
  UI.renderTop();
  UI.renderSources();
  UI.renderVerify();
  UI.renderNews(currentNews(), RP.active ? RP.day : null);
  UI.renderTiles();
  UI.renderGlobal();
  UI.renderBook();
  UI.renderTape();
  RP.renderBar();
  scheduleCables();
}

// ---------------------------------------------------------------- 事件 → 光點路線
const SRC_TO_CHECK = { mis_etf: 'chk-dual', twse_daily: 'chk-close', tpex_daily: 'chk-close', sitca: 'chk-prem', twse_mflows: 'chk-taiex', twse_flows: 'chk-taiex' };
const NEWS_SRC_CARD = { cna: 'src-cna', twse_news: 'src-twse_news', fsc: 'src-fsc', cbc: 'src-cbc' };
const KIND_HEX = { official: '#00e5ff', fact: '#9fb3ff', opinion: '#ffb02e' };
function newsFx(x) {
  const card = byId('nw-' + x.i);
  const tiles = (x.codes || []).filter((c) => watchCodes().includes(c)).map((c) => byId('tile-' + c));
  const path = [byId(NEWS_SRC_CARD[x.src]) || byId('src-cna'), byId('nsum'), card];
  if (tiles.length) path.push(byId('j-v'), tiles[0]);
  FX.chain(path, KIND_HEX[x.kind] || '#ff3df0', { dur: 0.7, each: (i, n) => { if (n === card) AU.sfx('stamp_' + x.kind, { gain: 0.8, pan: AU.panOf(card) }); } });
}
function srcFx(s) {
  const card = byId('src-' + s.key);
  FX.chain([card, byId(SRC_TO_CHECK[s.key] || 'chk-src'), byId('nsum'), byId('j-r')], '#4db8ff', { dur: 0.8 });
}
function pricePackets(codes) {
  const t = performance.now();
  if (t - APP.lastPx < (settings.fx === 'full' ? 260 : 800)) return;
  APP.lastPx = t;
  const c = codes[Math.floor(Math.random() * codes.length)];
  const tile = byId('tile-' + c);
  const hex = tile ? getComputedStyle(tile).getPropertyValue('--c').trim() || '#8f6dff' : '#8f6dff';
  FX.chain([byId('src-mis_etf'), byId('chk-dual'), byId('nsum'), byId('j-k'), tile], hex.startsWith('#') ? hex : '#8f6dff', { dur: 0.55, size: 0.85 });
}

// ---------------------------------------------------------------- 回放事件
function replayLog(tag, text, m, hl) { UI.log(tag, text, { time: ymdToMs(RP.day, 0, 0) + m * 60e3, hl }); }
function handleReplayEvent(ev, silent) {
  const first = watchCodes()[0];
  switch (ev.type) {
    case 'open':
      replayLog('core', '09:00 開盤 · 證交所開始逐筆撮合', ev.m, true);
      if (!silent) { UI.beam(); AU.sfx('blip2', { gain: 0.8 }); }
      break;
    case 'auction': replayLog('core', '13:25 收盤前集合競價', ev.m); break;
    case 'close': {
      const q = quoteAt(first, 270);
      replayLog('core', `13:30 收盤 · ${first} ${fmtPx(q.px)}（${fmtPct(q.pct)}）`, ev.m, true);
      const tx = taiex();
      if (tx && tx.date === RP.day) replayLog('ingest', `加權指數收 ${fmtPx(tx.v)}（${fmtPct(tx.pct)}）`, ev.m, true);
      if (!silent) { UI.beam(); AU.sfx(q && q.chg >= 0 ? 'chime_up' : 'chime_down', { gain: 0.85 }); UI.renderTop(); }
      break;
    }
    case 'news': replayLog('filter', `［${KIND_INFO[ev.item.kind].short}］${ev.item.srcName}：${ev.item.t}`, ev.m, ev.item.kind === 'official'); break;
    case 'src':
      replayLog('ingest', `同步 ${ev.src.org} ${ev.src.what}`, ev.m);
      if (!silent) { UI.renderVerify(); srcFx(ev.src); }
      break;
    case 'eod':
      replayLog('judge', `收盤批次完成 · 規則重新計算 ${(D.summary.etfs || []).length} 檔`, ev.m, true);
      if (!silent) { UI.beam(); AU.sfx('burst', { gain: 0.8 }); FX.chain([byId('j-r'), byId('tile-' + first), byId('g-br')], '#ffd23d', { dur: 0.9, size: 1.3 }); }
      break;
    case 'high': case 'low':
      replayLog('core', `${ev.code} ${ev.type === 'high' ? '衝上今日新高' : '跌到今日新低'} ${fmtPx(ev.px)}`, ev.m);
      if (!silent) { UI.hit(byId('tile-' + ev.code)); AU.sfx(ev.type === 'high' ? 'blip2' : 'blip1', { gain: 0.7, quant: true, pan: AU.panOf(byId('tile-' + ev.code)) }); }
      break;
    default:
  }
}
const THR = { tiles: 0, heavy: 0, book: 0 };
bus.on('replay-event', ({ ev, silent }) => handleReplayEvent(ev, silent));
bus.on('replay-px', ({ codes, silent }) => { if (!silent) pricePackets(codes); });
bus.on('replay-time', ({ silent }) => {
  const t = performance.now();
  if (silent || t - THR.tiles > 110) { THR.tiles = t; UI.renderTiles(); }
  if (silent || t - THR.book > 350) { THR.book = t; UI.renderBook(); UI.renderTape(); UI.renderHeat(); }
  const fresh = UI.renderNews(currentNews(), RP.day);
  if (!silent) fresh.slice(0, 3).forEach((x, k) => setTimeout(() => newsFx(x), k * 380));
  if (silent || t - THR.heavy > 700) { THR.heavy = t; UI.renderStats(); UI.renderMode(); }
});
bus.on('replay-seek', () => { renderAll(); });
bus.on('replay-start', (day) => { UI.toast(`REPLAY ${dateText(day)}（${WD[weekday(day)]}）· 照當天真實發生的順序重演`); renderAll(); });
bus.on('replay-stop', () => { renderAll(); });
bus.on('replay-end', (day) => showReport(day));

// ---------------------------------------------------------------- 今日戰報
function showReport(day) {
  const codes = watchCodes();
  const tx = taiex();
  const M = D.summary && D.summary.market;
  const ins = M && M.insti && M.insti.date === day ? M.insti : null;
  const nl = newsOn(day), k = kindCounts(nl);
  const br = breadth();
  const synced = sourcesList().filter((s) => isFinite(s.ok) && ymdOf(s.ok) === day).length;
  const qOf = (c) => (sparkOf(c).length ? quoteAt(c, 9999) : quoteClose(c));
  const first = qOf(codes[0]);
  const r = $('#report');
  r.innerHTML = `<div class="rcard"><h3>DAILY BRIEF · 今日戰報</h3><h4>${Math.floor(day / 10000)}/${dateText(day)}（${WD[weekday(day)]}）收盤定格</h4>
    <div class="rgrid">
      <div><div class="rl">加權指數${tx && tx.date === day ? '' : '（這天的收盤還沒進來）'}</div><div class="rv2 ${dirCls(tx && tx.date === day ? tx.chg : 0)}">${tx && tx.date === day ? fmtPx(tx.v) : '—'}</div><div class="rs2 ${dirCls(tx && tx.chg)}">${tx && tx.date === day ? fmtChg(tx.chg) + '　' + fmtPct(tx.pct) : ''}</div></div>
      <div><div class="rl">${esc(codes[0])} ${esc(etfName(codes[0]))}</div><div class="rv2 ${dirCls(first && first.chg)}">${fmtPx(first && first.px)}</div><div class="rs2 ${dirCls(first && first.chg)}">${first ? fmtChg(first.chg) + '　' + fmtPct(first.pct) : ''}</div></div>
      <div><div class="rl">三大法人合計${ins ? '' : '（這天的還沒公布）'}</div><div class="rv2 ${dirCls(ins ? ins.f + ins.t + ins.d : 0)}">${ins ? fmtSignedMoney(ins.f + ins.t + ins.d) : '—'}</div><div class="rs2">${ins ? `外資 ${fmtSignedMoney(ins.f)} · 投信 ${fmtSignedMoney(ins.t)}` : ''}</div></div>
    </div>
    <div class="rlines">${codes.slice(1).map((c) => { const q = qOf(c); return `<div><span>${c} ${esc(etfName(c))}</span>${q && isNum(q.px) ? `<span class="mono ${dirCls(q.chg)}">${fmtPx(q.px)}　${fmtPct(q.pct)}</span>` : '<span style="color:var(--ink3)">沒有成交紀錄</span>'}</div>`; }).join('')}
      <div><span>官方公告與新聞</span><span class="mono">${nl.length} 則（觀點 ${k.opinion}）</span></div>
      <div><span>當天同步的官方來源</span><span class="mono">${synced} 個</span></div>
      <div><span>規則觀點（全市場）</span><span class="mono">多 ${br.bull}・空 ${br.bear}</span></div></div>
    <p class="rnote">價格是冷眼記下的證交所盤中行情；規則觀點依 ${dateText(D.summary && D.summary.asof)} 收盤計算。${tx && tx.date !== day ? '加權指數的官方收盤進來以後，這裡會自動補上。' : ''}個人研究用途，不是投資建議。</p>
    <div class="rbtns"><button type="button" class="btn pri" data-act="again">再播一次</button><button type="button" class="btn" data-act="live">看最新資料</button></div>
    <div class="rcount" id="rcount"></div></div>`;
  r.hidden = false;
  AU.duck(0.4, 2.2);
  AU.sfx('report', { gain: 0.9 });
  setTimeout(() => AU.sfx(first && first.chg >= 0 ? 'chime_up' : 'chime_down', { gain: 0.9 }), 450);
  UI.beam(false);
  if (settings.loop) {
    let n = 30;
    const tick = () => { const e = $('#rcount'); if (!e || r.hidden) return; e.textContent = `${n} 秒後自動重播`; if (n-- <= 0) { r.hidden = true; RP.start(day); return; } RP.loopTimer = setTimeout(tick, 1000); };
    tick();
  }
}

// ---------------------------------------------------------------- 即時模式：每分鐘看一次版本檔，真的有新資料才演
bus.on('poll', ({ ok, changed }) => {
  if (!ok) { UI.renderMode(); if (D.link === 'down') { UI.log('ingest', '連不上冷眼的資料，畫面維持上一份並標示斷線'); AU.sfx('alert', { gain: 0.8 }); UI.renderVerify(); UI.renderTop(); } return; }
  // 每一次看版本檔都是一次真的連線：送一顆小光點到「資料版本同步」
  if (!RP.active) FX.send(byId('src-ust') || byId('src-mis_etf'), byId('chk-ver'), '#2ef2d0', { dur: 0.6, size: 0.6, onArrive: () => UI.hit(byId('chk-ver')) });
  if (!changed.length) { UI.renderMode(); return; }
  if (RP.active) { UI.toast('冷眼有新資料，回放結束後就會顯示'); return; }
  renderAll();
  for (const c of changed) {
    if (c.name === 'live') {
      UI.log('ingest', `盤中行情更新 ${stampText(parseTs(D.live.at))} · ${Object.keys(D.live.etfs || {}).length} 檔`, { hl: true });
      watchCodes().forEach((code, k) => setTimeout(() => FX.chain([byId('src-mis_etf'), byId('chk-dual'), byId('nsum'), byId('j-k'), byId('tile-' + code)], NEON_LIST[k % NEON_LIST.length], { dur: 0.65 }), k * 160));
      const q = quote(watchCodes()[0]);
      if (q) UI.log('core', `${watchCodes()[0]} ${fmtPx(q.px)}（${fmtPct(q.pct)}）`);
    } else if (c.name === 'news') {
      const prev = new Set(((c.prev && c.prev.items) || []).map((x) => x.url));
      const fresh = newsAll().filter((x) => !prev.has(x.url)).slice(0, 6);
      fresh.forEach((x, k) => setTimeout(() => { UI.log('filter', `［${KIND_INFO[x.kind].short}］${x.srcName}：${x.t}`, { hl: x.kind === 'official' }); newsFx(x); }, k * 520));
      if (!fresh.length) UI.log('filter', '新聞檔更新，沒有新的項目');
    } else if (c.name === 'summary') {
      UI.log('judge', `收盤批次完成（${dateText(D.summary.asof)}）· 規則重新計算 ${(D.summary.etfs || []).length} 檔`, { hl: true });
      AU.sfx('burst', { gain: 0.85 });
      UI.setFocus(UI.focus || watchCodes()[0]);
    } else if (c.name === 'global') UI.log('ingest', `全球市場更新 · 市場溫度「${(D.global.temp || {}).level || '—'}」`);
    else if (c.name === 'spark') { UI.log('ingest', `今日走勢更新 · ${Object.keys((D.spark && D.spark.s) || {}).length} 檔`); loadTape(UI.focus).then(() => { UI.renderBook(); UI.renderTape(); }); }
  }
  if (changed.some((c) => c.name === 'live' || c.name === 'summary')) UI.beam();
});

// ---------------------------------------------------------------- 開機
const BOOT_MIN = 4.4;
async function awaken() {
  const g = $('#gate');
  if (!g || g.classList.contains('gone')) return;
  AU.unlock();
  g.classList.add('gone');
  setTimeout(() => g.remove(), 700);
  const show = !reducedMotion() && settings.boot !== 'off' && !(settings.boot === 'daily' && lsGet('bootDay', 0) === tw().ymd);
  lsSet('bootDay', tw().ymd);
  const bootEl = $('#boot'), logEl = $('#bootLog'), bar = $('#bootBar');
  let skipped = false, loaded = 0;
  const say = (html) => {
    if (!show) return;
    logEl.appendChild(el('li', '', html));
    while (logEl.children.length > 12) logEl.firstChild.remove();
    AU.sfx('tick' + (1 + (logEl.children.length % 3)), { gain: 0.35, gate: 30 });
  };
  const t0 = performance.now();
  if (show) {
    bootEl.hidden = false;
    bootEl.addEventListener('click', () => { skipped = true; }, { once: true });
    GLX.boot.idle = false; GLX.boot.t0 = GLX.t;
    GLX.converge(260);
    AU.sfx('boot_rise', { gain: 0.9 });
    const title = $('#bootTitle');
    const target = 'OMNISCIENT';
    let k = 0;
    const scr = setInterval(() => {
      k++;
      const n = Math.min(target.length, Math.floor(k / 4));
      title.innerHTML = target.slice(0, n) + Array.from({ length: target.length - n }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/'[Math.floor(Math.random() * 40)]).join('') + '<small>全　知</small>';
      if (n >= target.length) clearInterval(scr);
    }, 50);
    say(`<span class="okk">▶</span> OMNISCIENT v${VERSION} · BOOT SEQUENCE`);
  } else { GLX.boot.on = false; }
  await initialLoad((name, r) => {
    loaded++;
    if (bar) bar.style.width = Math.min(100, loaded / 8 * 100) + '%';
    const tag = !r.ok ? '<span class="bad">OFFLINE</span>' : r.offline ? '<span class="wr">CACHE</span>' : '<span class="okk">OK</span>';
    if (name === 'version') say(`&gt; LINK  冷眼資料核心 ········ ${tag}${D.version && D.version.built ? '　' + stampText(parseTs(D.version.built)) : ''}`);
    else if (name === 'summary' && D.summary) say(`&gt; LOAD  收盤批次 ${dateText(D.summary.asof)} · ${D.summary.etfs.length} 檔 ETF · 規則 v${esc(D.summary.engine)} ···· ${tag}`);
    else if (name === 'live' && D.live) say(`&gt; LOAD  盤中行情 ${stampText(parseTs(D.live.at))} · ${Object.keys(D.live.etfs || {}).length} 檔 ···· ${tag}`);
    else if (name === 'news' && D.news) { const c = kindCounts(newsAll()); say(`&gt; SCAN  公告與新聞 ${D.news.items.length} 則（官方 ${c.official}・事實 ${c.fact}・觀點 ${c.opinion}）···· ${tag}`); }
    else if (name === 'global' && D.global) say(`&gt; LOAD  全球市場 · 溫度「${esc((D.global.temp || {}).level || '—')}」···· ${tag}`);
    else if (name === 'spark' && D.spark) say(`&gt; LOAD  ${dateText(D.spark.d)} 盤中走勢 · ${Object.keys(D.spark.s || {}).length} 檔 ···· ${tag}`);
    else if (!r.ok) say(`&gt; ${FILE_NAMES[name] || name} ···· ${tag}`);
  });
  const ok = !!D.summary;
  const codes0 = ok ? watchCodes() : [];
  if (ok) {
    await Promise.all(codes0.slice(0, 1).map((c) => Promise.all([loadEtf(c), loadK(c), loadTape(c)])));
    const C = verifyChecks();
    const h = sourceHealth();
    say(`&gt; VERIFY  官方來源 ${h.ok}/${h.total} · 交叉核對 ${C.filter((c) => c.st === 'pass').length}/${C.length} PASS`);
    say(`&gt; ARM   六個處理階段 · 光纜 · 泛光引擎${GLX.ok ? (GLX.hdr ? ' HDR' : '') : '（簡化）'}`);
    say(`<span class="okk">全知 · ONLINE。</span>${esc(coldeyeName())}，資料都攤在這裡了。`);
  } else say('<span class="bad">&gt; 連不上冷眼的資料，而且這台裝置還沒有存過備份。請確認網路後重新整理。</span>');
  if (bar) bar.style.width = '100%';
  if (show) {
    while (!skipped && (performance.now() - t0) / 1000 < BOOT_MIN) await sleep(40);
    AU.sfx('boot_hit', { gain: 1 });
    GLX.boot.flash = 0.85;
    const z0 = performance.now();
    while (performance.now() - z0 < 650) { GLX.boot.zoom = (performance.now() - z0) / 650; await sleep(16); }
    bootEl.classList.add('out');
    GLX.boot.on = false; GLX.boot.zoom = 0;
    setTimeout(() => { bootEl.hidden = true; }, 760);
  }
  reveal(ok);
}

function reveal(ok) {
  document.body.classList.add('ready');
  GLX.boot.on = false;
  if (!ok) { UI.renderMode(); UI.toast('連不上冷眼的資料', 6000); schedule(); return; }
  const ph = marketPhase();
  const codes = watchCodes();
  UI.focus = codes[0];
  if (ph.phase !== 'open' && D.spark && D.spark.d) RP.start(D.spark.d, { play: false });
  else renderAll();
  UI.setFocus(codes[0]);
  // 卡片一欄一欄閃進來，光纜跟著畫出來
  requestAnimationFrame(() => {
    $$('#cols .col').forEach((col, ci) => $$('.cd', col).forEach((c, k) => { c.style.animationDelay = (ci * 0.11 + k * 0.035).toFixed(3) + 's'; c.classList.add('in'); }));
    $$('#bottom .pn, #top > *').forEach((c, k) => { c.style.animation = `cardIn .7s steps(1,end) ${(0.5 + k * 0.05).toFixed(2)}s both`; });
    setTimeout(() => { $$('.cd.in').forEach((c) => { c.classList.remove('in'); c.style.animationDelay = ''; }); }, 2200);
    for (let i = 0; i < 6; i++) setTimeout(() => { UI.stage(i); AU.sfx('panel' + (i + 1), { gain: 0.7, pan: -0.8 + i * 0.32 }); }, 90 + i * 115);
    UI.computeCables();
    if (GLX.ok) GLX.revealCables(0.8);
  });
  setTimeout(() => {
    UI.beam();
    if (!RP.active) {
      UI.log('core', `全知上線 · 盤中即時 · 自選 ${codes.join('、')}`, { hl: true });
      FX.chain([byId('src-mis_etf'), byId('chk-dual'), byId('nsum'), byId('j-k'), byId('tile-' + codes[0]), byId('g-tx')], '#00e5ff', { dur: 0.7 });
    } else { RP.playing = true; RP.last = performance.now(); RP.renderBar(); }
    APP.booted = true;
  }, 1100);
  schedule();
  requestWake();
}

// ---------------------------------------------------------------- 每一格：泛光跟著配樂呼吸、換段落時亮一下（純裝飾，不碰數字、不放光點）
GLX.onFrame = (dt) => {
  GLX.surge = Math.max(0, (GLX.surge || 0) - dt * 0.8);
  GLX.energy = settings.fx === 'low' ? 0 : Math.min(1.6, AU.pulse(dt) + GLX.surge);
  const sec = AU.section();
  if (sec && sec !== APP.lastSec) {
    if (APP.lastSec && APP.booted && (sec === 'A' || sec === 'B' || sec === 'drop')) GLX.surge = sec === 'drop' ? 1 : 0.6;
    APP.lastSec = sec;
  }
};

// ---------------------------------------------------------------- 定時工作
let scheduled = false;
function schedule() {
  if (scheduled) return; scheduled = true;
  setInterval(() => { UI.renderMode(); }, 1000);
  setInterval(async () => { if (!document.hidden) await poll(); }, 60e3);
  // 「判斷」那一欄輪流看每一檔自選（只是換顯示，不是新資料，所以不放光點）
  setInterval(() => { if (!document.hidden && APP.booted) UI.nextFocus(); }, 14e3);
  setInterval(() => { if (!document.hidden && APP.booted) { UI.renderSources(); UI.renderVerify(); UI.renderTop(); UI.renderGlobal(); scheduleCables(); } }, 30e3);
  let lastPhase = marketPhase().phase;
  setInterval(() => {
    const ph = marketPhase();
    if (ph.phase === lastPhase) return;
    const prev = lastPhase; lastPhase = ph.phase;
    if (ph.phase === 'open' && RP.active) { RP.stop(); UI.toast('開盤了，切到盤中即時'); poll(); }
    if (prev === 'open' && ph.phase === 'post') { UI.log('core', '收盤 · 等證交所收盤資料（約 14:30 以後）', { hl: true }); renderAll(); }
  }, 20e3);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && APP.booted) { poll(); requestWake(); } });
async function requestWake() {
  if (!settings.wake || !('wakeLock' in navigator) || document.hidden) return;
  try { APP.wake = await navigator.wakeLock.request('screen'); } catch { /* 不支援就算了 */ }
}
function toggleFullscreen() {
  const d = document, e = d.documentElement;
  const fs = d.fullscreenElement || d.webkitFullscreenElement;
  try {
    if (fs) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else if (e.requestFullscreen) e.requestFullscreen({ navigationUI: 'hide' }).catch(() => UI.toast('這個瀏覽器不支援全螢幕'));
    else if (e.webkitRequestFullscreen) e.webkitRequestFullscreen();
    else UI.toast('iPhone 可以「加入主畫面」後從主畫面打開');
  } catch { UI.toast('這個瀏覽器不支援全螢幕'); }
}
function toggleSound() {
  AU.unlock();
  settings.sound = !settings.sound; saveSettings(); AU.setVolumes();
  $('[data-act=snd]').classList.toggle('off', !settings.sound);
  UI.toast(settings.sound ? '聲音開' : '聲音關');
}
function goLive() {
  $('#report').hidden = true;
  clearTimeout(RP.loopTimer);
  if (RP.active) RP.stop(); else renderAll();
  UI.log('core', marketPhase().phase === 'open' ? '回到盤中即時' : '顯示最新資料', { hl: true });
}

// ---------------------------------------------------------------- 設定
function renderDrawer() {
  const dr = $('#drawer');
  const cw = coldeyeWatch();
  const seg = (key, opts) => `<div class="seg" data-key="${key}">${opts.map(([v, t]) => `<button type="button" data-v="${v}" class="${String(settings[key]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  dr.innerHTML = `<h3>設定<button type="button" data-act="close" aria-label="關閉">×</button></h3>
    <div class="sg"><span class="sgt">WATCH · 自選（「結論」那六格）</span>${seg('watchMode', [['coldeye', '跟冷眼一樣'], ['custom', '自己挑']])}
      ${settings.watchMode === 'coldeye' ? `<p>${cw ? `讀到這台裝置上冷眼的自選：${cw.map(esc).join('、')}（最多顯示 6 檔）` : '這個瀏覽器裡還沒有冷眼的自選（冷眼要在同一個瀏覽器打開過），先用預設：' + DEFAULTS.watch.join('、')}</p>` : `<input type="text" id="watchIn" value="${esc(settings.watch.join(', '))}" placeholder="例如 0050, 00878, 0056"><p>用逗號或空白分開，最多 6 檔；只認冷眼有收錄的 ETF。</p>`}</div>
    <div class="sg"><span class="sgt">SOUND · 聲音</span>${seg('sound', [['true', '開'], ['false', '關']])}
      <label>配樂</label>${seg('music', [['true', '主題配樂：開'], ['false', '關']])}<input type="range" id="musicVol" min="0" max="1" step="0.05" value="${settings.musicVol}">
      <label>音效</label><input type="range" id="sfxVol" min="0" max="1" step="0.05" value="${settings.sfxVol}"><p>配樂與音效都是全知自己的（D 小調、100 BPM）；音效會對齊配樂的拍子落下。</p></div>
    <div class="sg"><span class="sgt">FX · 特效</span>${seg('fx', [['full', '全開'], ['std', '標準'], ['low', '省電']])}<p>電視或比較弱的電腦卡卡的話選「標準」或「省電」；太慢時也會自動降一級。</p></div>
    <div class="sg"><span class="sgt">REPLAY · 回放</span>${seg('speed', [[0.5, '6 分鐘'], [1, '3 分鐘'], [2, '90 秒'], [4, '45 秒']])}${seg('loop', [['true', '播完自動重播'], ['false', '播完停住']])}</div>
    <div class="sg"><span class="sgt">BOOT · 開機動畫</span>${seg('boot', [['always', '每次'], ['daily', '每天第一次'], ['off', '不要']])}</div>
    <div class="sg"><span class="sgt">SCREEN · 螢幕</span>${seg('wake', [['true', '保持常亮'], ['false', '照系統設定']])}<p>快速鍵：F 全螢幕、M 聲音、空白鍵 播放／暫停、← → 快轉、R 回放、L 最新資料、S 設定、↑↓ 換焦點。</p></div>
    <div class="sg"><span class="sgt">INTEGRITY · 正確性鐵律</span><div class="rulebox"><ol>
      <li>每個數字都來自冷眼的公開資料，旁邊標來源與時間。</li>
      <li>資料過期會變色；抓不到就標「斷線」，不拿舊數字假裝新的、不用亂數補。</li>
      <li>動畫不產生數字：明亮的光點只在真的有事件時才出現（資料進來、核對完成、新聞蓋章、回放走到那一刻）；光纜上緩慢流動的微光、跟著配樂呼吸的泛光只是裝飾；「判斷」欄每 14 秒換看下一檔只是換顯示。</li>
      <li>回放只演當天真的發生過的事；盤中沒有逐筆紀錄的東西（例如盤中加權指數）不會畫出來。</li>
      <li>沒有任何假的獲利數字。</li></ol>
      <p style="margin-top:1rem">全知只讀冷眼公開出來的資料，不會修改冷眼，也不讀你在冷眼裡記的持股。要即時、要記帳，請用 <a href="${COLDEYE_URL}" target="_blank" rel="noopener">冷眼</a>。個人研究用途，不是投資建議。</p></div></div>
    <div class="sg"><p>全知 OMNISCIENT v${VERSION} · ${GLX.ok ? 'WebGL2' + (GLX.hdr ? ' HDR' : '') : '簡化畫面'} · 資料 ${esc(DATA_BASE)}</p></div>`;
  dr.hidden = false;
  $$('.seg', dr).forEach((s) => s.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const k = s.dataset.key; let v = b.dataset.v;
    if (v === 'true') v = true; else if (v === 'false') v = false; else if (k === 'speed') v = +v;
    settings[k] = v; saveSettings(); AU.sfx('click', { gain: 0.8 });
    if (k === 'sound' || k === 'music') { AU.unlock(); AU.setVolumes(); $('[data-act=snd]').classList.toggle('off', !settings.sound); }
    if (k === 'fx') { GLX.quality = v === 'low' ? 0.5 : v === 'std' ? 0.75 : 1; GLX.resize(); }
    if (k === 'watchMode') { UI.focus = watchCodes()[0]; renderAll(); UI.setFocus(UI.focus); if (RP.active) RP.start(RP.day, { at: RP.p }); }
    if (k === 'speed') RP.renderBar();
    if (k === 'wake' && v) requestWake();
    renderDrawer();
  }));
  const wi = $('#watchIn');
  if (wi) wi.addEventListener('change', () => {
    const list = wi.value.toUpperCase().split(/[\s,，、]+/).filter(Boolean).filter((c) => D.map[c]).slice(0, 6);
    if (!list.length) { UI.toast('沒有認得的代號，維持原本的自選'); return; }
    settings.watch = list; saveSettings();
    UI.focus = watchCodes()[0]; renderAll(); UI.setFocus(UI.focus);
    if (RP.active) RP.start(RP.day, { at: RP.p });
    UI.toast('自選已更新：' + list.join('、'));
  });
  const mv = $('#musicVol'); if (mv) mv.addEventListener('input', () => { settings.musicVol = +mv.value; saveSettings(); AU.setVolumes(); });
  const sv = $('#sfxVol'); if (sv) sv.addEventListener('input', () => { settings.sfxVol = +sv.value; saveSettings(); AU.setVolumes(); AU.sfx('tick2', { gain: 1 }); });
}

// ---------------------------------------------------------------- 輸入
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'fs') toggleFullscreen();
  else if (a === 'snd') toggleSound();
  else if (a === 'set') { AU.sfx('click'); if ($('#drawer').hidden) renderDrawer(); else $('#drawer').hidden = true; }
  else if (a === 'close') $('#drawer').hidden = true;
  else if (a === 'play') { AU.sfx('click'); RP.toggle(); }
  else if (a === 'speed') { const sp = [0.5, 1, 2, 4]; settings.speed = sp[(sp.indexOf(settings.speed) + 1) % sp.length]; saveSettings(); AU.sfx('click'); RP.renderBar(); }
  else if (a === 'replay') { AU.sfx('click'); if (D.spark && D.spark.d) RP.start(D.spark.d); }
  else if (a === 'live') { AU.sfx('click'); goLive(); }
  else if (a === 'again') { AU.sfx('click'); $('#report').hidden = true; RP.start(RP.day); }
});
document.addEventListener('keydown', (e) => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if ($('#gate') && !$('#gate').classList.contains('gone')) { if (k === ' ' || k === 'enter') { e.preventDefault(); awaken(); } return; }
  if (k === 'f') toggleFullscreen();
  else if (k === 'm') toggleSound();
  else if (k === 's') { if ($('#drawer').hidden) renderDrawer(); else $('#drawer').hidden = true; }
  else if (k === 'escape') { $('#drawer').hidden = true; $('#report').hidden = true; }
  else if (k === ' ') { e.preventDefault(); if (RP.active) RP.toggle(); else if (D.spark && D.spark.d) RP.start(D.spark.d); }
  else if (k === 'arrowright' && RP.active) RP.seek(RP.p + 0.04, true);
  else if (k === 'arrowleft' && RP.active) RP.seek(RP.p - 0.04, true);
  else if (k === 'r' && D.spark && D.spark.d) RP.start(D.spark.d);
  else if (k === 'l') goLive();
  else if (k === 'arrowdown') UI.nextFocus(true);
  else if (k === 'arrowup') { const c = watchCodes(); UI.setFocus(c[(c.indexOf(UI.focus) - 1 + c.length) % c.length], true); }
});

// ---------------------------------------------------------------- 啟動
function main() {
  layoutMode();
  UI.build();
  const ok = GLX.init($('#gl'));
  if (!ok) { $('#gl').hidden = true; document.body.style.background = 'radial-gradient(120rem 70rem at 50% 40%, #0a1630, #02040a)'; }
  else GLX.start();
  AU.prepare();
  $('[data-act=snd]').classList.toggle('off', !settings.sound);
  $('#gate').addEventListener('click', awaken);
  let rz = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      const was = APP.stack; layoutMode();
      if (GLX.ok) GLX.resize();
      if (was !== APP.stack && APP.booted) renderAll();
      scheduleCables();
      if (APP.booted) { UI.renderTiles(true); UI.renderTape(); if (UI.focus) UI.renderJudge(UI.focus); }
    }, 180);
  });
  if (!window.OMNI_NO_SW && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (QS.get('auto') === '1' && !IS_PROD) setTimeout(awaken, 60);
}
main();
