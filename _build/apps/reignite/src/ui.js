/* ═══════════════ ui.js — 外框、艦橋、每日任務（量體重、燃料登錄、引擎試車）、共用元件 ═══════════════ */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const TABS = [
  { id: 'bridge', name: '艦橋', ic: 'ship' }, { id: 'log', name: '航跡', ic: 'chart' }, { id: 'dock', name: '船塢', ic: 'wrench' },
  { id: 'story', name: '航誌', ic: 'book' }, { id: 'med', name: '醫療艙', ic: 'med' }
];
let tab = 'bridge';
let comm = '';
let chartRange = 30;

/* ───────── 圖示 ───────── */
const ICONS = {
  ship: '<path d="M3 13h15l3-2-3-2H6L3 11z"/><path d="M14 9V4h2v5"/><circle cx="15" cy="3" r="1"/><path d="M5 13l1 4h10l2-4"/>',
  chart: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M7 15l4-4 3 2 5-6"/>',
  wrench: '<path d="M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  med: '<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/><path d="M9 12h2l1-2 1 4 1-2h1"/>',
  ember: '<path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.6.7-2.7 1.6-3.6.2 1.5 1 2.3 2 2.6C11 8 11 5.5 12 3z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  snd: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l4 6M21 9l-4 6"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 9.5a5 5 0 0 1 7 0"/><path d="M12 9.5l1.5-1.5"/>',
  fuel: '<path d="M7 3h7l3 3v15H7z"/><path d="M10 11c0-1.5 2-3 2-3s2 1.5 2 3a2 2 0 0 1-4 0z"/>',
  walk: '<circle cx="13" cy="4" r="2"/><path d="M10 21l2-6 3 3v3M9 9l3-2 3 3 3 1M12 7l-2 6"/>',
  alarm: '<path d="M6 17V11a6 6 0 0 1 12 0v6"/><path d="M4 17h16v3H4z"/><path d="M12 2v2M3.5 6l1.5 1M20.5 6L19 7"/>',
  moon: '<path d="M19 15A8 8 0 0 1 9 5a8 8 0 1 0 10 10z"/>',
  pod: '<rect x="5" y="6" width="14" height="12" rx="6"/><path d="M5 12h14M12 6v12"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  watch: '<rect x="7" y="6" width="10" height="12" rx="3"/><path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3"/><path d="M12 10v2.5l1.5 1"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>',
  down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  up: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  can: '<rect x="7" y="4" width="10" height="16" rx="2"/><path d="M7 8h10M7 16h10"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  comet: '<circle cx="16" cy="8" r="3"/><path d="M13.5 10.5L4 20M11 7l-6 6M17 13l-6 6"/>',
  radar: '<path d="M5 19a9 9 0 0 1 0-12.7L17.7 19A9 9 0 0 1 5 19z"/><path d="M11 13l4-4M16 6a3 3 0 0 1 2 2M17 3a6 6 0 0 1 4 4"/>',
  fog: '<path d="M4 9h12M6 13h14M4 17h10"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z"/><path d="M5 19l7-7"/>',
  box: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  cookie: '<circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r="1"/><circle cx="14" cy="9" r="1"/><circle cx="13" cy="14" r="1"/><circle cx="9.5" cy="14.5" r=".8"/>'
};
const ic = (n, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';

/* ───────── 提示泡泡、對話框、底部面板、全螢幕面板 ───────── */
function toast(msg, kind) {
  const box = $('#toasts'); const el = document.createElement('div');
  el.className = 'toast ' + (kind || ''); el.innerHTML = msg; box.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); }, kind === 'long' ? 5200 : 3200);
}
function ask(o) {
  return new Promise((res) => {
    const d = $('#dialog');
    d.innerHTML = '<div class="dlg" role="alertdialog" aria-modal="true"><h3>' + o.title + '</h3>' + (o.body ? '<div class="dlg-b">' + o.body + '</div>' : '') +
      '<div class="dlg-a">' + (o.cancel === false ? '' : '<button class="ghost" data-r="0">' + (o.cancel || '取消') + '</button>') + '<button class="' + (o.danger ? 'danger' : 'primary') + '" data-r="1">' + (o.ok || '好') + '</button></div></div>';
    d.classList.add('on');
    const h = (e) => { const b = e.target.closest('[data-r]'); if (!b) return; d.classList.remove('on'); d.removeEventListener('click', h); Sound.play('tap'); res(b.dataset.r === '1'); };
    d.addEventListener('click', h);
    setTimeout(() => { const b = d.querySelector('[data-r="1"]'); if (b) b.focus(); }, 50);
  });
}
let sheetR = null;
function openSheet(fn) {
  sheetR = fn; const s = $('#sheet'); $('#sheetBody').innerHTML = fn(); s.classList.add('on'); s.setAttribute('aria-hidden', 'false');
  $('#sheetBody').scrollTop = 0; Sound.play('soft');
}
function reSheet() { if (sheetR && $('#sheet').classList.contains('on')) { const b = $('#sheetBody'); const y = b.scrollTop; b.innerHTML = sheetR(); b.scrollTop = y; } }
function closeSheet() { const s = $('#sheet'); s.classList.remove('on'); s.setAttribute('aria-hidden', 'true'); sheetR = null; if (Walk.tm) { clearInterval(Walk.tm); Walk.tm = 0; } }
let modalKind = '';
function openModal(html, kind) { modalKind = kind || ''; document.body.classList.add('m-on'); const m = $('#modal'); $('#modalBody').innerHTML = html; m.className = 'modal on' + (modalKind ? ' k-' + modalKind : ''); m.setAttribute('aria-hidden', 'false'); $('#modalBody').scrollTop = 0; }
function closeModal() { document.body.classList.remove('m-on'); const m = $('#modal'); m.className = 'modal'; m.setAttribute('aria-hidden', 'true'); $('#modalBody').innerHTML = ''; if (modalKind === 'crave') Crave.stop(); modalKind = ''; setTimeout(nextQueued, 250); }

/* 解鎖章節、升級等「要讓他看見」的事件排隊顯示 */
const queue = [];
function nextQueued() {
  if ($('#modal').classList.contains('on') || !queue.length) return;
  const q = queue.shift();
  if (q.type === 'chapter') showUnlock(q.c);
  else if (q.type === 'welcome') showWelcome(q.n);
  else if (q.type === 'ladder') { toast('<b>' + esc(D.ladders[q.kind].name) + '升級</b><br>' + esc(q.r.name) + '完成，星火 +40', 'long'); nextQueued(); }
}

/* ───────── 外框：HUD 與分頁 ───────── */
function renderHUD() {
  const sk = streak();
  $('#hud').innerHTML =
    '<div class="hud-l"><div class="emblem" aria-hidden="true">' + ic('ember') + '</div><div class="who"><b>艦長 ' + esc(S.p.name || '痞子葳') + '</b><span>餘燼號　航行第 ' + voyageDay() + ' 天</span></div></div>' +
    '<div class="hud-r">' +
    (sk ? '<span class="streak" title="連續航行">' + ic('ember', 'sm') + sk + '</span>' : '') +
    '<button class="sp-chip" id="spChip" data-act="tab" data-v="dock" aria-label="星火 ' + S.sp + '，去船塢">' + ic('ember') + '<b id="spN">' + S.sp + '</b></button>' +
    '<button class="icon-btn" data-act="sound" aria-label="' + (S.set.sound ? '關掉音效' : '打開音效') + '">' + ic(S.set.sound ? 'snd' : 'mute') + '</button>' +
    '<button class="icon-btn" data-act="settings" aria-label="設定與備份">' + ic('gear') + '</button></div>';
}
function renderTabs() {
  $('#tabs').innerHTML = TABS.map((t) => {
    const badge = (t.id === 'story' && unreadCount()) ? '<i class="dot"></i>' : (t.id === 'dock' && canRepairAny()) ? '<i class="dot"></i>' : '';
    return '<button class="tab' + (tab === t.id ? ' on' : '') + '" data-act="tab" data-v="' + t.id + '"' + (tab === t.id ? ' aria-current="page"' : '') + '>' + ic(t.ic) + '<span>' + t.name + '</span>' + badge + '</button>';
  }).join('');
}
const unreadCount = () => D.chapters.filter((c) => S.ch[c.id] && !S.read[c.id]).length;
const canRepairAny = () => ['fuel', 'o2', 'engine'].some((k) => S.sys[k] < 8 && S.sp >= D.cost[S.sys[k]]);

function go(t, noScroll) {
  if (!TABS.some((x) => x.id === t)) t = 'bridge';
  tab = t;
  if (location.hash.slice(1) !== t) { try { history.replaceState(null, '', '#' + t); } catch (e) { location.hash = t; } }
  render(); if (!noScroll) $('#view').scrollTop = 0;
}
function render() {
  renderHUD(); renderTabs();
  const v = $('#view');
  const fn = { bridge: viewBridge, log: viewLog, dock: viewDock, story: viewStory, med: viewMed }[tab] || viewBridge;
  v.innerHTML = fn();
  if (tab === 'bridge') { const slot = $('#shipSlot'); if (slot) slot.appendChild(Ship.el || Ship.build()); updateShip(); typeComm(); }
  if (tab === 'log') drawCharts();
  if (tab === 'med') drawO2();
}
function shipState() {
  const td = dayOf(today());
  return { hull: hull(), fuel: S.sys.fuel, o2: S.sys.o2, eng: S.sys.engine, beacon: beaconParts(), mem: memoryPct(), todayF: doneF(td), todayE: doneE(td), todayW: doneW(td), lit: S.lit };
}
function updateShip() { Ship.update(shipState()); applyPaint(); }
function applyPaint() { const p = D.paints.find((x) => x.id === S.paint) || D.paints[0]; document.documentElement.style.setProperty('--hullC', p.hull); document.documentElement.style.setProperty('--hullHi', p.hi); }

/* ───────── 螢的通訊 ───────── */
function greet() {
  const h = now().getHours(); const n = S.p.name || '痞子葳';
  if (h < 5) return '這麼晚還沒睡，艦長' + n + '？';
  if (h < 11) return '早安，艦長' + n + '。';
  if (h < 14) return '午安，艦長' + n + '。';
  if (h < 18) return '下午好，艦長' + n + '。';
  return '晚安，艦長' + n + '。';
}
function defaultComm() {
  const d = dayOf(today()); const w = doneW(d), f = doneF(d), e = doneE(d);
  if (d && d.rest && !dayDone(d)) return '今天是休整日。不用做任務，連續航行不會斷。想記的話也可以照常記。';
  if (!w && !f && !e) return greet() + '今天三個任務，各一分鐘。先從量體重開始吧。';
  if (w && f && e) {
    const crew = [];
    if (S.ch[3]) crew.push(...D.lines.wok); if (S.ch[5]) crew.push(...D.lines.sprout); if (S.ch[6]) crew.push(...D.lines.aso); if (S.ch[7]) crew.push(...D.lines.night);
    return crew.length && Math.random() < 0.6 ? pick(crew) : pick(D.lines.full);
  }
  const left = []; if (!w) left.push('量體重'); if (!f) left.push('燃料登錄'); if (!e) left.push('引擎試車');
  if (!w) return greet() + '還沒量體重。起床、上完廁所、吃東西之前量一次就好。';
  const c = coach();
  return (c.head ? c.head + ' ' : '') + '今天還剩：' + left.join('、') + '。';
}
let commShown = '';
function setComm(t) { comm = t; }
function typeComm() {
  const el = $('#comm'); if (!el) return;
  const t = comm || defaultComm(); if (!comm) comm = t;
  if (t === commShown || REDUCED) { el.textContent = t; commShown = t; return; }
  commShown = t; el.textContent = ''; let i = 0;
  const step = () => { if (!el.isConnected) return; i += 2; el.textContent = t.slice(0, i); if (i < t.length) setTimeout(step, 18); };
  step();
}

/* ───────── 艦橋 ───────── */
function viewBridge() {
  const k = today(); const d = dayOf(k) || {}; const T = trend();
  const tier = D.tiers[S.eng.tier - 1];
  const nW = doneW(d), nF = doneF(d), nE = doneE(d); const n = (nW ? 1 : 0) + (nF ? 1 : 0) + (nE ? 1 : 0);
  const meals = (d.m || []).length;
  const walkMin = (d.walk || []).reduce((s, x) => s + (x.min || 0), 0);
  const ev = weekEvent();
  const rbV = ladderView('rb'), swV = ladderView('sw');
  const counter = (kind, label, icon, V) => {
    const v = d[kind]; const L = D.ladders[kind];
    return '<div class="cnt ' + kind + '"><div class="cnt-h">' + ic(icon) + '<b>' + label + '</b><span class="cnt-r">' + (V.done ? '路線完成' : esc(V.r.name) + ' ' + V.n + '/' + V.r.need) + '</span></div>' +
      '<div class="cnt-c"><button class="rnd" data-act="cnt" data-k="' + kind + '" data-d="-1" aria-label="' + label + '少一' + L.unit + '"' + (v ? '' : ' disabled') + '>' + ic('minus') + '</button>' +
      (v == null ? '<button class="cnt-zero" data-act="cnt-zero" data-k="' + kind + '">今天沒' + (kind === 'rb' ? '喝' : '吃') + '</button>' : '<div class="cnt-v"><b>' + v + '</b><span>' + L.unit + '</span></div>') +
      '<button class="rnd" data-act="cnt" data-k="' + kind + '" data-d="1" aria-label="' + label + '多一' + L.unit + '">' + ic('plus') + '</button></div></div>';
  };
  const install = IS_WEB && !DEMO && !S.set.install && !isStandalone() ? '<div class="note install"><p><b>加到主畫面</b>用 Safari 打開這一頁 → 下方「分享」→「加入主畫面」，之後就能像 App 一樣從主畫面點開。</p><button class="icon-btn" data-act="install-x" aria-label="不再顯示">' + ic('x') + '</button></div>' : '';
  const demo = DEMO ? '<div class="note demo"><p><b>示範資料</b>這是看效果用的假紀錄，不會存到你的紀錄。</p></div>' : '';
  const noSave = !IS_WEB && !storageOK && Cloud.state !== 'ok' ? '<div class="note warn"><p><b>這裡沒辦法存檔</b>紀錄關掉就會不見。長期使用請打開網頁版（PZ 遊戲收藏 → 專屬 App → 重新點火）。</p></div>' : '';
  const sup = S.intro && !d.drop ? '<button class="pod" data-act="supply"><span class="pod-i">' + ic('pod') + '</span><span><b>補給艙漂過來了</b><small>每天一個，點開看看裡面有什麼</small></span>' + ic('chev') + '</button>' : '';
  return install + demo + noSave +
    '<section class="bridge">' +
    '<div class="ship-frame"><div id="shipSlot" class="ship-slot"></div></div>' +
    '<div class="comms" aria-live="polite"><span class="fly" aria-hidden="true"></span><div><small>螢</small><p id="comm"></p></div></div>' +
    '<div class="sec-h"><h2>今日任務</h2><span class="pill' + (n === 3 ? ' full' : '') + '">' + (n === 3 ? '全系統連線' : n + ' / 3') + '</span></div>' +
    '<div class="tasks">' +
    taskRow('w', nW, 'scale', '晨間校準', nW ? '今天 ' + f1(d.w) + ' kg' + (T.t != null ? '　均線 ' + f1(T.t) : '') : '量體重，3 秒', 'open-w', '#8EA8FF', nW ? '' : '+' + 10) +
    taskRow('f', nF, 'fuel', '燃料登錄', nF ? '今天記了 ' + meals + ' 餐' : '記一餐吃了什麼', 'open-f', '#F2C14E', nF ? (meals < 4 ? '再記一餐' : '') : '+' + (6 + S.sys.fuel)) +
    taskRow('e', nE, 'walk', '引擎試車', nE ? '今天 ' + walkMin + ' 分鐘' + ((d.walk || []).some((x) => x.st !== 'ok') ? '　安全停機' : '') : tier.name + '：' + tier.min + ' 分鐘', 'open-e', '#FF6A3D', nE ? '' : '+' + (20 + S.sys.engine)) +
    '</div>' +
    '<div class="counters">' + counter('rb', '紅牛', 'can', rbV) + counter('sw', '甜食餅乾', 'cookie', swV) + '</div>' +
    '<div class="actions"><button class="alarm-btn" data-act="crave"><span class="hz" aria-hidden="true"></span><span class="al-t">' + ic('alarm') + '<b>嘴饞警報</b><small>想喝紅牛、想吃甜的時候按</small></span></button>' +
    '<button class="rest-btn" data-act="rest"' + (d.rest || dayDone(d) ? ' disabled' : '') + '>' + ic('moon') + '<b>休整日</b><small>剩 ' + S.rest + ' 張</small></button></div>' +
    sup +
    (ev ? eventCard(ev) : '') +
    '</section>';
}
function taskRow(id, done, icon, title, sub, act, color, sp) {
  return '<button class="task' + (done ? ' done' : '') + '" data-act="' + act + '" style="--c:' + color + '">' +
    '<span class="lamp" aria-hidden="true"></span><span class="tk-ic">' + ic(icon) + '</span>' +
    '<span class="tk-tx"><b>' + title + '</b><small>' + sub + '</small></span>' +
    (done ? '<span class="tk-ok">' + ic('check') + (sp ? '<em>' + sp + '</em>' : '') + '</span>' : '<span class="tk-sp">' + sp + '</span>') + '</button>';
}
const EVIC = { wind: 'sun', meteor: 'comet', depot: 'fuel', sos: 'radar', fog: 'fog', green: 'leaf', drift: 'box', quiet: 'mute' };
function eventCard(E) {
  const pct = Math.round(E.v / E.ev.need * 100);
  return '<div class="event' + (E.done ? ' done' : '') + '"><div class="ev-h"><span class="ev-ic" aria-hidden="true">' + ic(EVIC[E.ev.id] || 'star') + '</span><div><small>本週航道事件</small><b>' + E.ev.name + '</b></div></div>' +
    '<p>' + E.ev.text + '</p><div class="ev-goal"><span>' + E.ev.goal + '</span><b>' + E.v + ' / ' + E.ev.need + '</b></div>' +
    '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
    (E.done && !E.claimed ? '<button class="primary wide" data-act="ev-claim">領取獎勵：星火 +80 和一件貨物</button>' : E.claimed ? '<p class="muted">獎勵已領取。下週一會有新的航道事件。</p>' : '<p class="muted">完成後可以領星火 +80 和一件貨物。</p>') + '</div>';
}
function isStandalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }

/* ───────── 行動後的共同處理：星火飛行、全系統連線、掉落、解鎖 ───────── */
function afterAction(o) {
  o = o || {};
  let rect = null; if (o.from && o.from.getBoundingClientRect) { const r0 = o.from.getBoundingClientRect(); if (r0.width) rect = r0; }
  const k = today(); const d = day(k);
  let line = o.line || '';
  const tokenMsg = dayDone(d) ? firstOfDay(k) : null;
  if (dayFull(d) && !d.fullB) { d.fullB = 1; gain(15, '全系統連線'); line = pick(D.lines.full); Sound.play('full'); }
  let item = o.item || null;
  if (!item && o.drop !== false && Math.random() < 0.1) item = roll(0.25);
  const ups = refresh();
  const total = gains.reduce((s, g) => s + g.n, 0); gains.length = 0;
  if (line) setComm(line); else setComm(defaultComm());
  save(); render();
  if (o.sys) Ship.pulse(o.sys);
  if (total) flySparks(total, rect);
  if (tokenMsg === 'rest') setTimeout(() => toast('<b>休整日 +1</b><br>每累計 7 天就送一張，最多存 3 張。', 'long'), 600);
  if (item) setTimeout(() => showItemToast(item), total ? 900 : 200);
  for (const c of ups) queue.push({ type: 'chapter', c });
  setTimeout(nextQueued, total ? 1200 : 300);
}
function flySparks(n, fromEl) {
  const chip = $('#spChip'); if (!chip) return;
  const r2 = chip.getBoundingClientRect(); let x = window.innerWidth / 2, y = window.innerHeight * 0.55;
  if (fromEl && fromEl.width) { x = fromEl.left + fromEl.width / 2; y = fromEl.top + fromEl.height / 2; }
  const nEl = $('#spN'); const end = S.sp; const startV = end - n;
  if (nEl) nEl.textContent = startV;
  Sound.play('spark');
  const pop = document.createElement('div'); pop.className = 'plus'; pop.textContent = '+' + n; pop.style.left = x + 'px'; pop.style.top = y + 'px'; document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 1400);
  FX.fly(x, y, r2.left + r2.width / 2, r2.top + r2.height / 2, Math.min(18, 6 + Math.round(n / 4)), '#ffc45c', () => {
    Sound.play('gain'); chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump');
    const t0 = performance.now(); const tick = (t) => { const p = Math.min(1, (t - t0) / 500); if (nEl && nEl.isConnected) nEl.textContent = Math.round(startV + n * p); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}
function showItemToast(it) {
  const R = D.rarity[it.r]; Sound.play(it.r >= 2 ? 'gold' : 'spark');
  toast('<span class="it-r" style="color:' + R.color + '">' + R.name + '貨物</span><b>' + esc(it.name) + '</b><br><span class="muted">' + esc(it.text) + '</span>', 'long item');
}

/* ───────── 量體重 ───────── */
const W = { v: null, k: null };
function sheetWeigh() {
  const k = W.k || today(); const d = dayOf(k); const T = trend();
  if (W.v == null) W.v = d && d.w != null ? d.w : T.last ? T.last.w : (S.p.w0 || 90);
  const isToday = k === today();
  return '<div class="sh-h" style="--c:#8EA8FF">' + ic('scale') + '<div><h3>晨間校準</h3><p>起床、上完廁所、吃東西之前量。每天同一個時間，數字才比得起來。</p></div></div>' +
    '<div class="wpick"><button class="rnd big" data-act="w-step" data-d="-1" aria-label="減 0.1 公斤">' + ic('minus') + '</button>' +
    '<label class="wval" for="wIn"><input id="wIn" type="number" inputmode="decimal" step="0.1" min="30" max="250" value="' + f1(W.v) + '"><span>kg</span></label>' +
    '<button class="rnd big" data-act="w-step" data-d="1" aria-label="加 0.1 公斤">' + ic('plus') + '</button></div>' +
    '<p class="hint center">按住 ＋／－ 會連續調整，也可以直接打數字。</p>' +
    '<label class="field"><span>日期</span><input type="date" id="wDate" value="' + k + '" max="' + today() + '"></label>' +
    (!isToday ? '<p class="hint">補登 ' + fmtYMD(k) + ' 的體重。補登不會拿星火，但會算進均線。</p>' : '') +
    '<button class="primary wide" data-act="w-save">' + (d && d.w != null ? '更新紀錄' : '記錄' + (isToday ? '　星火 +10' : '')) + '</button>' +
    (d && d.w != null ? '<button class="ghost wide" data-act="w-del">刪除這一天的體重</button>' : '');
}
function saveWeigh() {
  const inp = $('#wIn'); const v = parseFloat(inp && inp.value); const k = ($('#wDate') && $('#wDate').value) || today();
  if (!(v >= 30 && v <= 250)) { toast('體重要在 30 到 250 公斤之間，請再檢查一下。', 'warn'); return; }
  if (k > today()) { toast('不能記錄未來的日子。', 'warn'); return; }
  const d = day(k); const first = d.w == null;
  d.w = r1(v); d.wt = Date.now();
  if (first && k === today()) gain(10 + 0, '晨間校準');
  closeSheet(); W.v = null; W.k = null;
  const c = coach(); const line = [c.head].concat(c.lines.filter(Boolean)).slice(0, 2).join(' ');
  afterAction({ line, sys: 'hull', from: $('.task') });
}

/* ───────── 燃料登錄 ───────── */
const F = { s: null, ty: null, tg: [], x: [] };
function autoSlot() { const h = now().getHours(); return h < 5 ? 'n' : h < 10 ? 'b' : h < 15 ? 'l' : h < 17 ? 'a' : h < 21 ? 'd' : 'n'; }
function recentMeals() {
  const out = [], seen = new Set();
  const ks = Object.keys(S.days).sort().reverse();
  for (const k of ks) for (const m of (S.days[k].m || []).slice().reverse()) {
    const sig = m.ty + '|' + (m.tg || []).slice().sort().join(',') + '|' + (m.x || []).slice().sort().join(',');
    if (seen.has(sig)) continue; seen.add(sig); out.push(m); if (out.length >= 3) return out;
  }
  return out;
}
function mealSp(m) {
  let n = 6 + S.sys.fuel; const tg = m.tg || [];
  if (tg.includes('veg')) n += 3; if (tg.includes('pro')) n += 2;
  if (!tg.includes('fried') && !tg.includes('proc') && !tg.includes('sugar')) n += 2;
  n += Math.min(2, (m.x || []).length) * 4;
  return n;
}
function mealName(m) { const t = D.mealTypes.find((x) => x.id === m.ty); return t ? t.name : '一餐'; }
function sheetFuel() {
  if (!F.s) F.s = autoSlot();
  const d = dayOf(today()) || {}; const list = d.m || [];
  const rec = recentMeals();
  const prev = { s: F.s, ty: F.ty, tg: F.tg, x: F.x };
  const count = list.length;
  const spNext = count < 4 ? mealSp(prev) : 0;
  const tips = F.ty ? D.swaps[F.ty] : [];
  return '<div class="sh-h" style="--c:#F2C14E">' + ic('fuel') + '<div><h3>燃料登錄</h3><p>不算熱量，只記你吃了什麼、做了哪些換法。照實記就好，帳本不罵人。</p></div></div>' +
    '<div class="seg">' + D.mealSlots.map((s) => '<button class="seg-b' + (F.s === s.id ? ' on' : '') + '" data-act="f-slot" data-v="' + s.id + '">' + s.name + '</button>').join('') + '</div>' +
    (rec.length ? '<h4>跟之前一樣</h4><div class="chips">' + rec.map((m, i) => '<button class="chip rep" data-act="f-repeat" data-i="' + i + '">' + esc(mealName(m)) + ((m.tg || []).includes('veg') ? '＋青菜' : '') + ((m.x || []).length ? '＋換法' + m.x.length : '') + '</button>').join('') + '</div>' : '') +
    '<h4>吃了什麼</h4><div class="chips">' + D.mealTypes.map((t) => '<button class="chip' + (F.ty === t.id ? ' on' : '') + '" data-act="f-type" data-v="' + t.id + '">' + t.name + '</button>').join('') + '</div>' +
    '<h4>這一餐有</h4><div class="chips">' + D.mealTags.map((t) => '<button class="chip tag' + (t.good ? ' good' : '') + (F.tg.includes(t.id) ? ' on' : '') + '" data-act="f-tag" data-v="' + t.id + '"' + (t.hint ? ' title="' + t.hint + '"' : '') + '>' + t.name + (t.hint ? '<small>' + t.hint + '</small>' : '') + '</button>').join('') + '</div>' +
    (F.ty ? '<h4>換法　做到哪個就點哪個</h4><div class="swaps">' + tips.map((s, i) => '<button class="swap' + (F.x.includes(s) ? ' on' : '') + '" data-act="f-swap" data-i="' + i + '"><span class="box">' + ic('check') + '</span>' + esc(s) + '</button>').join('') + '</div>' +
      (S.ch[3] ? '<p class="crew-tip">老鍋：「' + esc(tips[0]) + '，這個最好做。」</p>' : '') : '<p class="hint">先選「吃了什麼」，下面會出現這類外食最好做的換法。</p>') +
    '<button class="primary wide" data-act="f-save"' + (F.ty ? '' : ' disabled') + '>記錄這一餐' + (spNext ? '　星火 +' + spNext : '') + '</button>' +
    (list.length ? '<h4>今天的燃料</h4><ul class="meals">' + list.map((m) => '<li><span class="ms">' + (D.mealSlots.find((s) => s.id === m.s) || { name: '' }).name + '</span><span class="mt"><b>' + esc(mealName(m)) + '</b><small>' + mealDesc(m) + '</small></span><button class="icon-btn" data-act="f-del" data-id="' + m.id + '" aria-label="刪除這一餐">' + ic('trash') + '</button></li>').join('') + '</ul>' : '');
}
function mealDesc(m) {
  const t = (m.tg || []).map((x) => (D.mealTags.find((y) => y.id === x) || { name: '' }).name);
  const s = (m.x || []).length ? '換法 ' + m.x.length : '';
  return esc(t.concat(s ? [s] : []).join('、') || '照實記錄');
}
function saveMeal() {
  if (!F.ty) return;
  const d = day(today()); d.m = d.m || [];
  const m = { id: uid(), s: F.s || autoSlot(), ty: F.ty, tg: F.tg.slice(), x: F.x.slice(), t: Date.now() };
  m.clean = !m.tg.includes('fried') && !m.tg.includes('proc') && !m.tg.includes('sugar');
  m.sp = d.m.length < 4 ? mealSp(m) : 0;
  d.m.push(m); if (m.sp) gain(m.sp, '燃料登錄');
  const line = m.x.length ? (S.ch[3] && Math.random() < 0.5 ? pick(D.lines.wok) : pick(D.lines.fuelSwap)) : pick(D.lines.fuel);
  F.ty = null; F.tg = []; F.x = []; F.s = null;
  closeSheet();
  afterAction({ line, sys: 'fuel', from: $$('.task')[1] });
}

/* ───────── 紅牛、甜食計數 ───────── */
function bump(kind, delta, el) {
  const d = day(today()); const first = d[kind] == null;
  d[kind] = Math.max(0, (d[kind] || 0) + delta);
  if (first) { d[kind + 'S'] = 1; gain(2, '誠實記帳'); }
  Sound.play(delta > 0 ? 'tap' : 'soft');
  const V = ladderView(kind); let line = '';
  if (!V.done && V.r && d[kind] != null && !V.r.ok(d[kind]) && delta > 0) line = '記下來了。今天已經超過「' + V.r.name + '」的標準，沒關係，這一天不算數就好，不扣分。';
  afterAction({ line: line || undefined, from: el, drop: false });
}

/* ───────── 引擎試車（復健式：安全檢查 → 計時 → 走完的感覺） ───────── */
const Walk = { step: 'pre', q1: null, q2: null, pre: '', post: '', feel: null, t0: 0, el: 0, min: 10, manual: 10, tm: 0, stopped: false, half: false };
function walkReset() { Object.assign(Walk, { step: 'pre', q1: null, q2: null, pre: '', post: '', feel: null, t0: 0, el: 0, stopped: false, half: false, manual: D.tiers[S.eng.tier - 1].min }); }
function sheetWalk() {
  const T = D.tiers[S.eng.tier - 1]; const thr = S.safe.spo2;
  const head = '<div class="sh-h" style="--c:#FF6A3D">' + ic('walk') + '<div><h3>引擎試車　' + T.name + '</h3><p>目標：' + T.desc + '</p></div></div>';
  const yn = (key, opts) => '<div class="yn">' + opts.map((o) => '<button class="chip' + (Walk[key] === o[0] ? ' on' : '') + (o[2] ? ' ' + o[2] : '') + '" data-act="e-q" data-k="' + key + '" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>';
  if (Walk.step === 'pre') {
    const preNum = parseFloat(Walk.pre);
    const lowO2 = preNum > 0 && preNum < thr;
    const block = Walk.q1 === 'yes' || lowO2;
    return head +
      '<h4>出發前安全檢查</h4>' +
      '<p class="q">現在有胸痛、胸悶，或頭暈的感覺嗎？</p>' + yn('q1', [['no', '沒有'], ['yes', '有', 'bad']]) +
      '<p class="q">比平常更喘、更累嗎？</p>' + yn('q2', [['no', '沒有'], ['some', '有一點', 'mid']]) +
      '<label class="field"><span>血氧（選填，看 Apple Watch）</span><span class="inl"><input id="ePre" type="number" inputmode="numeric" min="70" max="100" placeholder="例如 96" value="' + esc(Walk.pre) + '"><em>%</em></span></label>' +
      (block ? '<div class="stopcard"><b>今天引擎停機。</b><p>' + (lowO2 ? '血氧低於你設定的門檻（' + thr + '%）。' : '身體有不舒服的訊號。') + '今天先休息，不試車。休息後如果還是不舒服，或越來越喘，請聯絡醫生。</p>' + emergencyHTML() + '<button class="primary wide" data-act="e-skip">記錄：安全停機（任務算完成）</button></div>' :
        (Walk.q2 === 'some' ? '<div class="notecard"><p>今天比較累，目標減半：走 ' + Math.max(5, Math.round(T.min / 2)) + ' 分鐘就好。也可以直接休息。</p></div>' : '') +
        '<button class="primary wide" data-act="e-start"' + (Walk.q1 && Walk.q2 ? '' : ' disabled') + '>開始試車</button>' +
        '<button class="ghost wide" data-act="e-manual"' + (Walk.q1 === 'no' ? '' : ' disabled') + '>已經走完了，直接記錄</button>');
  }
  if (Walk.step === 'run') {
    const target = Walk.half ? Math.max(5, Math.round(T.min / 2)) : T.min;
    return head +
      '<div class="run"><div class="ring" id="runRing" style="--p:0"><div class="ring-in"><b id="runT">0:00</b><small>目標 ' + target + ' 分鐘</small></div></div>' +
      '<p class="talk" id="runTip">說話測試：走路時要能講完整的句子。講不出來就放慢。</p>' +
      '<button class="danger wide big" data-act="e-stop">' + ic('x') + '不舒服，停止</button>' +
      '<button class="primary wide" data-act="e-done">走完了</button>' +
      (S.safe.hr ? '<p class="hint center">心率上限 ' + S.safe.hr + '（看 Apple Watch）</p>' : '') +
      '<p class="hint center">螢幕關掉也會繼續計時。</p></div>';
  }
  if (Walk.step === 'stop') {
    return head + '<div class="stopcard"><b>先停下來。</b><p>找地方坐下，慢慢呼吸，休息到呼吸恢復平常。今天到這裡就好，任務一樣算完成。</p>' + emergencyHTML() + '</div>' + postForm(true);
  }
  if (Walk.step === 'manual') {
    return head + '<h4>走了幾分鐘？</h4><div class="wpick sm"><button class="rnd" data-act="e-min" data-d="-1" aria-label="少一分鐘">' + ic('minus') + '</button><div class="wval"><b id="eMin">' + Walk.manual + '</b><span>分鐘</span></div><button class="rnd" data-act="e-min" data-d="1" aria-label="多一分鐘">' + ic('plus') + '</button></div>' + postForm(false);
  }
  return head + postForm(false);
}
function postForm(stopped) {
  return '<h4>走完的感覺</h4><div class="yn col">' +
    [['easy', '輕鬆'], ['ok', '有點喘，但還能講話'], ['hard', '很喘，講不出完整句子', 'mid'], ['dizzy', '頭暈或胸悶', 'bad']].map((o) => '<button class="chip' + (Walk.feel === o[0] ? ' on' : '') + (o[2] ? ' ' + o[2] : '') + '" data-act="e-feel" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>' +
    '<label class="field"><span>走完後的血氧（選填）</span><span class="inl"><input id="ePost" type="number" inputmode="numeric" min="70" max="100" placeholder="例如 95" value="' + esc(Walk.post) + '"><em>%</em></span></label>' +
    '<button class="primary wide" data-act="e-save"' + (Walk.feel ? '' : ' disabled') + '>記錄試車' + (doneE(dayOf(today())) ? '' : '　星火 +' + (20 + S.sys.engine)) + '</button>' + (stopped ? '' : '');
}
function emergencyHTML() {
  return '<div class="sos"><b>出現這些情況，立刻求助：</b><p>胸痛、胸口壓迫感、快要昏倒、喘到說不出話、嘴唇發紫。請旁邊的人幫忙，必要時撥打 <a href="tel:119">119</a>（電話號碼：119）。</p></div>';
}
function walkTick() {
  const T = D.tiers[S.eng.tier - 1]; const target = (Walk.half ? Math.max(5, Math.round(T.min / 2)) : T.min) * 60;
  const el = Math.floor((Date.now() - Walk.t0) / 1000); Walk.el = el;
  const t = $('#runT'); if (!t) return;
  t.textContent = Math.floor(el / 60) + ':' + pad(el % 60);
  const ring = $('#runRing'); if (ring) ring.style.setProperty('--p', String(Math.min(1, el / target)));
  if (el >= target && !Walk.reached) { Walk.reached = true; Sound.play('full'); haptic(40); const tip = $('#runTip'); if (tip) tip.textContent = '目標達成。可以收工了，多走不加分，磨合期就是要慢。'; ring && ring.classList.add('done'); }
  else if (!Walk.reached && el > 0 && el % 120 === 0) { const tip = $('#runTip'); if (tip) tip.textContent = pick(['還能講完整句子嗎？可以的話就是剛好的速度。', '覺得喘就放慢，放慢不丟臉。', '肩膀放鬆，手自然擺動。', '不舒服就按紅色按鈕，停下來也算完成。']); }
}
function saveWalk(kind) {
  const T = D.tiers[S.eng.tier - 1]; const thr = S.safe.spo2;
  const d = day(today()); d.walk = d.walk || [];
  const pre = parseFloat(Walk.pre) || null, post = parseFloat(Walk.post) || null;
  let min = 0, st = 'ok';
  if (kind === 'skip') { st = 'skip'; min = 0; }
  else if (Walk.step === 'manual') min = Walk.manual;
  else min = Math.max(1, Math.round(Walk.el / 60));
  if (Walk.stopped) st = 'stop';
  const feel = kind === 'skip' ? null : Walk.feel;
  const rec = { min, tier: T.n, st, feel, pre, post, t: Date.now(), half: Walk.half };
  const firstToday = !d.walk.length;
  rec.sp = firstToday ? 20 + S.sys.engine : d.walk.length < 3 ? 5 : 0;
  d.walk.push(rec); if (rec.sp) gain(rec.sp, '引擎試車');
  for (const v of [pre, post]) if (v) { S.spo2.push({ k: today(), v, src: 'walk' }); }
  const target = Walk.half ? Math.max(5, Math.round(T.min / 2)) : T.min;
  const flag = feel === 'hard' || feel === 'dizzy' || (post && post < thr) || (pre && post && pre - post >= 4);
  if (st === 'ok' && !Walk.half && min >= target && (feel === 'easy' || feel === 'ok') && !flag) S.eng.good = (S.eng.good || 0) + 1;
  let line = st === 'ok' ? pick(D.lines.walk) : pick(D.lines.safeStop);
  closeSheet(); walkReset();
  afterAction({ line, sys: 'engine', from: $$('.task')[2] });
  if (flag) {
    setTimeout(() => ask({
      title: '這次試車有點吃力', cancel: false, ok: '知道了',
      body: '<p>' + (feel === 'dizzy' ? '你記錄了頭暈或胸悶。' : feel === 'hard' ? '你記錄了很喘、講不出完整句子。' : '走完後的血氧偏低或掉得比較多。') + '下次試車前先休息一天，下一次放慢、縮短一點。這種感覺如果又出現，請告訴醫生。</p>' + emergencyHTML()
    }), 700);
  } else if (tierReady()) setTimeout(() => toast('<b>引擎可以解除封印了</b><br>到「醫療艙」看下一個階段。', 'long'), 1400);
}
function tierReady() { const T = D.tiers[S.eng.tier - 1]; const nx = D.tiers[S.eng.tier]; return !!nx && T.need && (S.eng.good || 0) >= T.need && (!nx.doc || S.safe.doc); }
