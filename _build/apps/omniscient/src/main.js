/* 全知 OMNISCIENT — 開機、即時／回放兩種模式、事件 → 畫面與聲光 */

const APP = { booted: false, wake: null, lastPricePacket: 0, liveNewsDay: null };

// ---------------------------------------------------------------- 版面：寬螢幕＝戰情室；直式／小螢幕＝由上往下排
function layoutMode() {
  const stack = innerWidth < 1000 || innerWidth / innerHeight < 1.15;
  document.documentElement.classList.toggle('stack', stack);
  if (FX.bg) { FX.resize(); FX.layoutDirty = true; }
}

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
  const nl = currentNews();
  UI.renderNews(nl, RP.active ? RP.day : null);
  UI.renderTiles();
  UI.renderPulse();
  UI.renderAgents(RP.active ? nl : newsOn(marketPhase().today));
  RP.renderBar();
  FX.layoutDirty = true;
  const tx = taiex();
  if (SFX.ctx) SFX.pad(tx ? Math.sign(tx.chg || 0) : 0);
}

// ---------------------------------------------------------------- 事件 → 光點路線
const SRC_TO_CHECK = { mis_etf: 'chk-dual', twse_daily: 'chk-close', tpex_daily: 'chk-close', sitca: 'chk-prem', twse_mflows: 'chk-taiex', twse_flows: 'chk-taiex' };
const NEWS_SRC_CARD = { cna: 'src-cna', twse_news: 'src-twse_news', fsc: 'src-fsc', cbc: 'src-cbc' };
const byId = (id) => (id ? document.getElementById(id) : null);

function newsFx(x) {
  const card = byId('nw-' + x.i);
  const src = byId(NEWS_SRC_CARD[x.src]) || byId('src-cna');
  const tiles = (x.codes || []).filter((c) => watchCodes().includes(c)).map((c) => byId('tile-' + c));
  const path = [src, byId('chk-ver'), card];
  if (tiles.length) path.push($('#b3 .verdict'), tiles[0]);
  FX.chain(path, x.kind === 'opinion' ? '#ffb02e' : x.kind === 'official' ? '#46d4ff' : '#ff4fd8', { dur: 700 });
  FX.seek('medusa', card || $('#c2'), x.kind === 'opinion' ? `蓋章：觀點（${x.trig || '看法'}）` : x.kind === 'official' ? '蓋章：官方公告' : '蓋章：事實報導', 2800);
  setTimeout(() => SFX.stamp(x.kind), 1300);
}
function srcFx(s) {
  const card = byId('src-' + s.key);
  const chk = byId(SRC_TO_CHECK[s.key] || 'chk-src');
  FX.chain([card, chk, $('#b3 .verdict')], '#46d4ff', { dur: 800 });
  FX.seek('owl', card || $('#c0'), `同步 ${s.org}`, 2600);
}
function pricePackets(codes) {
  const t = performance.now();
  if (t - APP.lastPricePacket < (settings.fx === 'full' ? 320 : 900)) return;
  APP.lastPricePacket = t;
  const c = codes[Math.floor(Math.random() * codes.length)];
  FX.chain([byId('src-mis_etf'), byId('chk-dual'), byId('tile-' + c)], '#9b7bff', { dur: 650, size: 0.8 });
  if (Math.random() < 0.15) FX.seek('libra', byId('chk-dual'), `核對 ${c} 盤中價`, 1800);
}

// ---------------------------------------------------------------- 回放事件
function replayLog(agent, text, m, hl) { UI.log(agent, text, { time: ymdToMs(RP.day, 0, 0) + m * 60e3, hl }); }
function handleReplayEvent(ev, silent) {
  const first = watchCodes()[0];
  switch (ev.type) {
    case 'open': {
      replayLog('core', '開盤 09:00 · 證交所開始逐筆撮合', ev.m, true);
      if (!silent) { UI.beam(); SFX.blip(4); UI.stage(4); }
      break;
    }
    case 'auction': replayLog('core', '13:25 收盤前集合競價（最後 5 分鐘一起撮合）', ev.m); break;
    case 'close': {
      const q = quoteAt(first, 270);
      replayLog('core', `收盤 13:30 · ${first} 收 ${fmtPx(q.px)}（${fmtPct(q.pct)}）`, ev.m, true);
      const tx = taiex();
      if (tx && tx.date === RP.day) replayLog('owl', `加權指數收 ${fmtPx(tx.v)}（${fmtPct(tx.pct)}）· 證交所`, ev.m, true);
      if (!silent) { UI.beam(); SFX.chime(q && q.chg >= 0 ? 1 : -1); UI.renderTop(); }
      break;
    }
    case 'news': {
      const x = ev.item;
      replayLog('medusa', `［${KIND_INFO[x.kind].short}］${x.srcName}：${x.t}`, ev.m, x.kind === 'official');
      break;   // 畫面上的新聞卡與光點在 replay-time 統一處理（要等卡片畫出來）
    }
    case 'src': {
      replayLog('owl', `已同步：${ev.src.org} ${ev.src.what}`, ev.m);
      if (!silent) { UI.renderVerify(); srcFx(ev.src); }
      break;
    }
    case 'eod': {
      replayLog('judge', `收盤批次完成 · 規則重新計算 ${(D.summary.etfs || []).length} 檔 ETF`, ev.m, true);
      if (!silent) { UI.beam(); FX.chain([$('#b3 .verdict'), byId('tile-' + first)], '#ffbf3c', { dur: 900, size: 1.3 }); FX.seek('judge', $('#b3 .verdict'), '重新計算觀點', 3000); }
      break;
    }
    case 'high': case 'low': {
      replayLog('core', `${ev.code} ${ev.type === 'high' ? '衝上今日新高' : '跌到今日新低'} ${fmtPx(ev.px)}`, ev.m);
      if (!silent) { UI.hit(byId('tile-' + ev.code)); SFX.blip(ev.type === 'high' ? 3 : 1); FX.seek('core', byId('tile-' + ev.code), ev.type === 'high' ? '新高' : '新低', 2000); }
      break;
    }
    default:
  }
}
let lastTimeRender = 0, lastHeavy = 0;
bus.on('replay-event', ({ ev, silent }) => handleReplayEvent(ev, silent));
bus.on('replay-px', ({ codes, silent }) => { if (!silent) pricePackets(codes); });
bus.on('replay-time', ({ silent }) => {
  const t = performance.now();
  if (!silent && t - lastTimeRender < 120) return;
  lastTimeRender = t;
  UI.renderTiles();
  const nl = currentNews();
  const fresh = UI.renderNews(nl, RP.day);
  if (!silent) fresh.slice(0, 3).forEach((x, k) => setTimeout(() => newsFx(x), k * 350));
  if (silent || t - lastHeavy > 600) { lastHeavy = t; UI.renderPulse(); UI.renderAgents(nl); UI.renderTop(); }
});
bus.on('replay-seek', () => { renderAll(); });
bus.on('replay-start', (day) => { UI.toast(`回放 ${dateText(day)}（${WD[weekday(day)]}）· 照當天真實發生的順序重演`); renderAll(); });
bus.on('replay-stop', () => { renderAll(); });
bus.on('replay-end', (day) => showReport(day));

// ---------------------------------------------------------------- 今日戰報（回放結束）
function showReport(day) {
  const codes = watchCodes();
  const tx = taiex();
  const M = D.summary && D.summary.market;
  const ins = M && M.insti && M.insti.date === day ? M.insti : null;
  const nl = newsOn(day), k = kindCounts(nl);
  const br = breadth();
  const synced = sourcesList().filter((s) => isFinite(s.ok) && ymdOf(s.ok) === day).length;
  const first = quoteAt(codes[0], 9999);
  const r = $('#report');
  r.innerHTML = `<div class="rcard"><h3>DAILY BRIEF · 今日戰報</h3><h4>${Math.floor(day / 10000)}/${dateText(day)}（${WD[weekday(day)]}）收盤定格</h4>
    <div class="rgrid">
      <div><div class="rl">加權指數${tx && tx.date === day ? '' : '（這天的收盤還沒進來）'}</div><div class="rv2 ${dirCls(tx && tx.date === day ? tx.chg : 0)}">${tx && tx.date === day ? fmtPx(tx.v) : '—'}</div><div class="rs2 ${dirCls(tx && tx.chg)}">${tx && tx.date === day ? fmtChg(tx.chg) + '　' + fmtPct(tx.pct) : ''}</div></div>
      <div><div class="rl">${esc(codes[0])} ${esc(etfName(codes[0]))}</div><div class="rv2 ${dirCls(first.chg)}">${fmtPx(first.px)}</div><div class="rs2 ${dirCls(first.chg)}">${fmtChg(first.chg)}　${fmtPct(first.pct)}</div></div>
      <div><div class="rl">三大法人合計${ins ? '' : '（這天的還沒公布）'}</div><div class="rv2 ${dirCls(ins ? ins.f + ins.t + ins.d : 0)}">${ins ? fmtSignedMoney(ins.f + ins.t + ins.d) : '—'}</div><div class="rs2">${ins ? `外資 ${fmtSignedMoney(ins.f)} · 投信 ${fmtSignedMoney(ins.t)}` : ''}</div></div>
    </div>
    <div class="rlines">${codes.slice(1).map((c) => { const q = quoteAt(c, 9999); return `<div><span>${c} ${esc(etfName(c))}</span>${isNum(q.px) ? `<span class="mono ${dirCls(q.chg)}">${fmtPx(q.px)}　${fmtPct(q.pct)}</span>` : '<span style="color:var(--ink3)">當天沒有成交紀錄</span>'}</div>`; }).join('')}
      <div><span>官方公告與新聞</span><span class="mono">${nl.length} 則（觀點 ${k.opinion}）</span></div>
      <div><span>當天同步的官方來源</span><span class="mono">${synced} 個</span></div>
      <div><span>規則觀點（全市場）</span><span class="mono">多 ${br.bull}・空 ${br.bear}</span></div></div>
    <p class="rnote">價格是冷眼記下的證交所盤中行情（最後一筆）；規則觀點依 ${dateText(D.summary && D.summary.asof)} 收盤計算。${tx && tx.date !== day ? '加權指數的官方收盤進來以後，這裡會自動補上。' : ''}個人研究用途，不是投資建議。</p>
    <div class="rbtns"><button type="button" class="btn pri" data-act="again">再播一次</button><button type="button" class="btn" data-act="live">看最新資料</button></div>
    <div class="rcount" id="rcount"></div></div>`;
  r.hidden = false;
  SFX.chime(first.chg >= 0 ? 1 : -1);
  UI.beam();
  if (settings.loop) {
    let n = 30;
    const tick = () => { const e = $('#rcount'); if (!e || r.hidden) return; e.textContent = `${n} 秒後自動重播`; if (n-- <= 0) { r.hidden = true; RP.start(day); return; } RP.loopTimer = setTimeout(tick, 1000); };
    tick();
  }
}

// ---------------------------------------------------------------- 即時模式：每分鐘看版本檔，真的有新資料才演
bus.on('poll', ({ ok, changed }) => {
  if (!ok) { UI.renderMode(); if (D.link === 'down') { UI.log('owl', '連不上冷眼的資料，畫面維持上一份並標示斷線'); SFX.alert(); } renderVerifyLight(); return; }
  // 每一次看版本檔都是一次真的連線：送一顆小光點到「版本同步」
  if (!RP.active && !FX.stack) FX.send(byId('src-mis_etf'), byId('chk-ver'), '#46d4ff', { dur: 600, size: 0.6, onArrive: () => UI.hit(byId('chk-ver')) });
  if (!changed.length) { UI.renderMode(); return; }
  const names = changed.map((c) => c.name);
  if (RP.active) { UI.toast('冷眼有新資料，回放結束後就會顯示'); return; }
  renderAll();
  for (const c of changed) {
    if (c.name === 'live') {
      const L = D.live;
      UI.log('owl', `盤中行情更新 ${stampText(parseTs(L.at))} · ${Object.keys(L.etfs || {}).length} 檔`, { hl: true });
      const codes = watchCodes();
      codes.forEach((code, k) => setTimeout(() => FX.chain([byId('src-mis_etf'), byId('chk-dual'), byId('tile-' + code)], '#9b7bff', { dur: 700 }), k * 180));
      FX.seek('owl', byId('src-mis_etf'), '同步盤中行情', 2600);
      const q = quote(codes[0]);
      if (q) UI.log('core', `${codes[0]} ${fmtPx(q.px)}（${fmtPct(q.pct)}）`);
    } else if (c.name === 'news') {
      const prev = new Set(((c.prev && c.prev.items) || []).map((x) => x.url));
      const fresh = newsAll().filter((x) => !prev.has(x.url)).slice(0, 6);
      fresh.forEach((x, k) => setTimeout(() => { UI.log('medusa', `［${KIND_INFO[x.kind].short}］${x.srcName}：${x.t}`, { hl: x.kind === 'official' }); newsFx(x); }, k * 500));
      if (!fresh.length) UI.log('medusa', '新聞檔更新，沒有新的項目');
    } else if (c.name === 'summary') {
      UI.log('judge', `收盤批次完成（${dateText(D.summary.asof)}）· 規則重新計算 ${(D.summary.etfs || []).length} 檔`, { hl: true });
      UI.beam(); SFX.chime(((D.summary.market || {}).chg || 0) >= 0 ? 1 : -1);
      UI.setFocus(UI.focus || watchCodes()[0]);
    } else if (c.name === 'global') {
      UI.log('owl', `全球市場更新 · 市場溫度「${(D.global.temp || {}).level || '—'}」`);
    } else if (c.name === 'spark') {
      UI.log('owl', `今日走勢更新 · ${Object.keys((D.spark && D.spark.s) || {}).length} 檔`);
    }
  }
  if (names.includes('live') || names.includes('summary')) UI.beam();
});
function renderVerifyLight() { UI.renderVerify(); UI.renderTop(); }

// ---------------------------------------------------------------- 開機
const BOOT_MIN_MS = 4300;
async function awaken() {
  const g = $('#gate');
  if (g.classList.contains('gone')) return;
  SFX.init();
  g.classList.add('gone');
  setTimeout(() => g.remove(), 600);
  const show = !reducedMotion() && (settings.boot === 'always' || (settings.boot === 'daily' && lsGet('bootDay', 0) !== tw().ymd));
  lsSet('bootDay', tw().ymd);
  const bootEl = $('#boot'), logEl = $('#bootLog');
  let skipped = false;
  const lines = [];
  const say = (html) => {
    lines.push(html);
    if (!show) return;
    const li = el('li', '', html);
    logEl.appendChild(li);
    while (logEl.children.length > 11) logEl.firstChild.remove();
    SFX.typeKey();
  };
  if (show) {
    bootEl.hidden = false;
    BootFX.start();
    SFX.bootDrone();
    bootEl.addEventListener('click', () => { skipped = true; }, { once: true });
    const title = $('#bootTitle');
    const target = 'OMNISCIENT';
    let k = 0;
    const scr = setInterval(() => {
      k++;
      const n = Math.min(target.length, Math.floor(k / 3));
      title.innerHTML = target.slice(0, n) + Array.from({ length: target.length - n }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&'[Math.floor(Math.random() * 39)]).join('') + '<small>全　知</small>';
      if (n >= target.length) clearInterval(scr);
    }, 45);
    say('<span class="okk">&gt;</span> 全知 OMNISCIENT v' + VERSION + ' · 喚醒中');
  }
  const t0 = performance.now();
  await initialLoad((name, r) => {
    const tag = !r.ok ? '<span class="bad">斷線</span>' : r.offline ? '<span class="wr">離線備份</span>' : '<span class="okk">OK</span>';
    if (name === 'version') say(`&gt; 連線 冷眼資料核心 ……… ${tag}${D.version && D.version.built ? '　最近更新 ' + stampText(parseTs(D.version.built)) : ''}`);
    else if (name === 'summary' && D.summary) say(`&gt; 收盤計算批次 ${dateText(D.summary.asof)} · ${D.summary.etfs.length} 檔 ETF · 規則 v${esc(D.summary.engine)} ……… ${tag}`);
    else if (name === 'live' && D.live) say(`&gt; 盤中行情 ${stampText(parseTs(D.live.at))} · ${Object.keys(D.live.etfs || {}).length} 檔 ……… ${tag}`);
    else if (name === 'news' && D.news) { const c = kindCounts(newsAll()); say(`&gt; 官方公告與新聞 ${D.news.items.length} 則（官方 ${c.official}・事實 ${c.fact}・觀點 ${c.opinion}）……… ${tag}`); }
    else if (name === 'global' && D.global) say(`&gt; 全球市場 · 市場溫度「${esc((D.global.temp || {}).level || '—')}」……… ${tag}`);
    else if (name === 'spark' && D.spark) say(`&gt; ${dateText(D.spark.d)} 盤中走勢 · ${Object.keys(D.spark.s || {}).length} 檔 ……… ${tag}`);
    else if (!r.ok) say(`&gt; ${FILE_NAMES[name] || name} ……… ${tag}`);
  });
  const ok = !!D.summary;
  if (ok) {
    const C = verifyChecks();
    const h = sourceHealth();
    say(`&gt; 官方來源 ${h.ok}/${h.total} 正常 · 交叉核對 ${C.filter((c) => c.st === 'pass').length}/${C.length} 通過`);
    say(`&gt; 代理人 鴞・天秤・水母・判官・核心 上線`);
    say(`<span class="okk">全知 · 已就緒。</span>${esc(coldeyeName())}，資料都攤在這裡了。`);
  } else {
    say('<span class="bad">&gt; 連不上冷眼的資料，而且這台裝置也還沒有存過備份。請確認網路後重新整理。</span>');
  }
  if (show) {
    while (!skipped && performance.now() - t0 < BOOT_MIN_MS) await sleep(60);
    BootFX.flash = 0.9; BootFX.zoom = 0;
    SFX.awaken();
    const z0 = performance.now();
    while (performance.now() - z0 < 700) { BootFX.zoom = (performance.now() - z0) / 700; await sleep(16); }
    bootEl.classList.add('out');
    setTimeout(() => { BootFX.stop(); bootEl.hidden = true; }, 820);
  }
  reveal(ok);
}

async function reveal(ok) {
  document.body.classList.add('ready');
  if (!ok) { UI.renderMode(); UI.toast('連不上冷眼的資料', 6000); schedule(); return; }
  const ph = marketPhase();
  const codes = watchCodes();
  UI.focus = codes[0];
  if (ph.phase !== 'open' && D.spark && D.spark.d) RP.start(D.spark.d, { play: false });
  else renderAll();
  UI.setFocus(codes[0]);
  // 五欄依序點亮
  for (let i = 0; i < 5; i++) { setTimeout(() => { UI.hit($('#c' + i)); UI.stage(i); SFX.light(i); }, 120 + i * 150); }
  FX.start();
  setTimeout(() => {
    UI.beam();
    FX.layoutDirty = true;
    const tx = taiex();
    SFX.pad(tx ? Math.sign(tx.chg || 0) : 0);
    if (!RP.active) {
      UI.log('core', `全知上線 · 盤中即時模式 · 自選 ${codes.join('、')}`, { hl: true });
      FX.chain([byId('src-mis_etf'), byId('chk-dual'), byId('nw-' + (newsAll()[0] || {}).i), $('#b3 .verdict'), byId('tile-' + codes[0])], '#46d4ff', { dur: 700 });
    } else {
      RP.playing = true; RP.last = performance.now(); RP.renderBar();
    }
    APP.booted = true;
  }, 950);
  schedule();
  requestWake();
}

// ---------------------------------------------------------------- 定時工作
function schedule() {
  setInterval(() => { UI.renderMode(); }, 1000);
  setInterval(async () => {
    if (document.hidden) return;
    await poll();
  }, 60e3);
  setInterval(() => { if (!document.hidden && APP.booted) UI.nextFocus(); }, 14e3);
  setInterval(() => { if (!document.hidden && APP.booted) { UI.renderSources(); UI.renderVerify(); UI.renderTop(); } }, 30e3);
  // 開盤、收盤的那一刻自動切換模式
  let lastPhase = marketPhase().phase;
  setInterval(() => {
    const ph = marketPhase();
    if (ph.phase === lastPhase) return;
    const prev = lastPhase; lastPhase = ph.phase;
    if (ph.phase === 'open' && RP.active) { RP.stop(); UI.toast('開盤了，切到盤中即時'); poll(); }
    if (prev === 'open' && ph.phase === 'post') { UI.log('core', '收盤 · 等證交所收盤資料（約 14:30 以後）', { hl: true }); renderAll(); }
  }, 20e3);
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && APP.booted) { poll(); requestWake(); }
});

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
    else UI.toast('這個瀏覽器不支援全螢幕；iPhone 可以「加入主畫面」後從主畫面打開');
  } catch { UI.toast('這個瀏覽器不支援全螢幕'); }
}
function toggleSound() {
  SFX.init();
  settings.sound = !settings.sound; saveSettings(); SFX.setVolume();
  $('[data-act=snd]').classList.toggle('off', !settings.sound);
  UI.toast(settings.sound ? '音效開' : '音效關');
  if (settings.sound) SFX.pad(SFX.mood);
}
function goLive() {
  $('#report').hidden = true;
  clearTimeout(RP.loopTimer);
  if (RP.active) RP.stop();
  else renderAll();
  UI.log('core', marketPhase().phase === 'open' ? '回到盤中即時' : '顯示最新資料（冷眼目前手上最新的一份）', { hl: true });
}

// ---------------------------------------------------------------- 設定
function renderDrawer() {
  const dr = $('#drawer');
  const cw = coldeyeWatch();
  const seg = (key, opts) => `<div class="seg" data-key="${key}">${opts.map(([v, t]) => `<button type="button" data-v="${v}" class="${String(settings[key]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  dr.innerHTML = `<h3>設定<button type="button" data-act="close" aria-label="關閉">×</button></h3>
    <div class="sg"><span class="sgt">自選（右邊「結論」那六格）</span>${seg('watchMode', [['coldeye', '跟冷眼一樣'], ['custom', '自己挑']])}
      ${settings.watchMode === 'coldeye' ? `<p>${cw ? `讀到這台裝置上冷眼的自選：${cw.map(esc).join('、')}（最多顯示 6 檔）` : '這台裝置的瀏覽器裡還沒有冷眼的自選（冷眼要在同一個瀏覽器打開過），先用預設：' + DEFAULTS.watch.join('、')}</p>` : `<input type="text" id="watchIn" value="${esc(settings.watch.join(', '))}" placeholder="例如 0050, 00878, 0056" inputmode="text"><p>用逗號或空白分開，最多 6 檔；只認冷眼有收錄的 ETF。</p>`}</div>
    <div class="sg"><span class="sgt">音效</span>${seg('sound', [['true', '開'], ['false', '關']])}<label style="margin-top:1rem">音量</label><input type="range" id="volIn" min="0" max="1" step="0.05" value="${settings.vol}">${seg('ambient', [['true', '環境底音：開'], ['false', '環境底音：關']])}<p>環境底音的和弦跟著大盤：漲是大調、跌是小調。</p></div>
    <div class="sg"><span class="sgt">特效</span>${seg('fx', [['full', '全開'], ['std', '標準'], ['low', '省電']])}<p>省電會關掉水母與底紋光點，只留資料事件的光點。</p></div>
    <div class="sg"><span class="sgt">回放速度（整個交易時段）</span>${seg('speed', [[0.5, '6 分鐘'], [1, '3 分鐘'], [2, '90 秒'], [4, '45 秒']])}${seg('loop', [['true', '播完自動重播'], ['false', '播完停住']])}</div>
    <div class="sg"><span class="sgt">開機動畫</span>${seg('boot', [['always', '每次'], ['daily', '每天第一次'], ['off', '不要']])}</div>
    <div class="sg"><span class="sgt">螢幕</span>${seg('wake', [['true', '保持常亮'], ['false', '照系統設定']])}<p>掛在電視或筆電上當看板時，保持常亮比較方便。快速鍵：F 全螢幕、M 音效、空白鍵 播放／暫停、← → 快轉、R 回放、L 最新資料、S 設定。</p></div>
    <div class="sg"><span class="sgt">正確性鐵律</span><div class="rulebox"><ol>
      <li>畫面上的每個數字都來自冷眼的公開資料，旁邊標來源與時間。</li>
      <li>資料過期會變色、標「已過期」；抓不到就標「斷線」，不拿舊數字假裝是新的、不用亂數補。</li>
      <li>動畫不產生數字。光點只在真的有事件時才出現：資料進來、核對完成、新聞蓋章、回放走到那一刻。</li>
      <li>回放只演當天真的發生過的事；盤中沒有逐筆紀錄的東西（例如盤中加權指數）不會畫出來。</li>
      <li>沒有任何假的獲利數字。</li></ol>
      <p style="margin-top:1rem">全知只讀冷眼公開出來的資料，不會修改冷眼，也不會讀你在冷眼裡記的持股。要即時、要記帳，請用 <a href="${COLDEYE_URL}" target="_blank" rel="noopener">冷眼</a>。個人研究用途，不是投資建議。</p></div></div>
    <div class="sg"><p>全知 OMNISCIENT v${VERSION} · 資料位置 ${esc(DATA_BASE)}</p></div>`;
  dr.hidden = false;
  $$('.seg', dr).forEach((s) => s.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const k = s.dataset.key; let v = b.dataset.v;
    if (v === 'true') v = true; else if (v === 'false') v = false; else if (!isNaN(+v) && k === 'speed') v = +v;
    settings[k] = v; saveSettings(); SFX.click();
    if (k === 'sound' || k === 'ambient') { SFX.init(); SFX.setVolume(); SFX.pad(SFX.mood); $('[data-act=snd]').classList.toggle('off', !settings.sound); }
    if (k === 'fx') { FX.resize(); FX.layoutDirty = true; }
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
  const vi = $('#volIn');
  if (vi) vi.addEventListener('input', () => { settings.vol = +vi.value; saveSettings(); SFX.init(); SFX.setVolume(); });
}

// ---------------------------------------------------------------- 輸入
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'fs') toggleFullscreen();
  else if (a === 'snd') toggleSound();
  else if (a === 'set') { SFX.click(); if ($('#drawer').hidden) renderDrawer(); else $('#drawer').hidden = true; }
  else if (a === 'close') $('#drawer').hidden = true;
  else if (a === 'play') { SFX.click(); RP.toggle(); }
  else if (a === 'speed') { const sp = [0.5, 1, 2, 4]; settings.speed = sp[(sp.indexOf(settings.speed) + 1) % sp.length]; saveSettings(); SFX.click(); RP.renderBar(); }
  else if (a === 'replay') { SFX.click(); if (D.spark && D.spark.d) { RP.start(D.spark.d); } }
  else if (a === 'live') { SFX.click(); goLive(); }
  else if (a === 'again') { SFX.click(); $('#report').hidden = true; RP.start(RP.day); }
});
document.addEventListener('keydown', (e) => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (!$('#gate') || !$('#gate').classList.contains('gone')) { if (k === ' ' || k === 'enter') { e.preventDefault(); awaken(); } return; }
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
  FX.init();
  $('[data-act=snd]').classList.toggle('off', !settings.sound);
  $('#gate').addEventListener('click', awaken);
  window.addEventListener('resize', () => { layoutMode(); });
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { FX.layoutDirty = true; }, 200); });
  if (!window.OMNI_NO_SW && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (QS.get('auto') === '1' && !IS_PROD) setTimeout(awaken, 50);
}
main();
