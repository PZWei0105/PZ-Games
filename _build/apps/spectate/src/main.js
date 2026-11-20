const INTRO_REV = 2;   // 開場的版本：2026/11/18 加了「今晚節目單」
'use strict';
/* 觀戰 SPECTATE — 路由、點擊、開場 */

let ROUTE = null, BASE = 'home', PENDING_CTX = '';
const SCROLL = new Map();
const TAB_OF = (r) => (r.startsWith('storm') ? 'storm' : r.startsWith('live') ? 'live' : r.startsWith('games') || r.startsWith('g/') ? 'games' : r.startsWith('rookies') ? 'rookies' : r.startsWith('me') || r === 'key' ? 'me' : 'home');

function parse() { return decodeURIComponent((location.hash || '').replace(/^#/, '')) || 'home'; }

function render(r) {
  const v = $('#view');
  let html;
  try {
    if (r === 'home') html = vHome();
    else if (r === 'storm') html = vStorm();
    else if (r === 'live') html = vLive();
    else if (r === 'games') html = vGames();
    else if (r.startsWith('g/')) html = vGame(r.slice(2));
    else if (r === 'rookies') html = vRookies();
    else if (r === 'me') html = vMe();
    else if (r === 'pick') html = vPick();
    else if (r === 'key') html = vKey();
    else if (r.startsWith('ch/')) html = vChannel(r.slice(3));
    else if (r.startsWith('list/')) html = vList(r.slice(5));
    else html = vHome();
  } catch (e) {
    console.error(e);
    html = empty('這頁打不開', esc(e.message), '<a class="btn" href="#home">回轉播台</a>');
  }
  v.innerHTML = html;
  v.className = 'r-' + r.split('/')[0];
  $$('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === TAB_OF(r)));
  moveTabInk();
  if (r === 'home') heroStart(); else clearInterval(heroTimer);
  if (r === 'games') { const q = $('#gameQ'); if (q) q.addEventListener('input', () => { gameFilter = q.value; const pos = q.selectionStart; render('games'); const q2 = $('#gameQ'); q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (e) { /* */ } }); }
  if (r === 'rookies') deckInit();
  if (r === 'me') $$('[data-count]').forEach((el) => { const n = +el.dataset.count; if (Number.isInteger(n)) Fx.count(el, n, 800); });
  v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
}

function route() {
  const r = parse();
  if (r.startsWith('watch/')) {
    const id = r.slice(6);
    if (ROUTE == null) { ROUTE = BASE; render(BASE); }
    if (SET.play === 'yt' && !Player.isOpen()) { history.replaceState(null, '', '#' + (ROUTE || 'home')); window.open(ytUrl(id), '_blank'); return; }
    if (!Player.isOpen() || !Player.cur || Player.cur.i !== id) {
      const ctx = CTX.get(PENDING_CTX) || defaultCtx(id);
      Player.open(id, ctx, ctxLabel(PENDING_CTX));
      Snd.play('take');
    }
    PENDING_CTX = '';
    return;
  }
  if (Player.isOpen()) Player.close();
  if (r === ROUTE) return;
  if (ROUTE) SCROLL.set(ROUTE, scrollY);
  const prev = ROUTE;
  const go = () => {
    ROUTE = r; BASE = r;
    render(r);
    scrollTo(0, SCROLL.get(r) || 0);
  };
  if (prev && TAB_OF(prev) !== TAB_OF(r)) Fx.wipe(go); else { go(); if (prev) Snd.play('select'); }
}
function defaultCtx(id) {
  const it = IDX.byId.get(id);
  if (!it) return [id];
  if (it.so && stormHas(id)) return stormAll().map((x) => x.i);   // 從《解包》風暴眼點進來的名單外影片：接著播特別轉播
  if (VIEW.subs[it.c]) return L.subs().map((x) => x.i);
  if (it.g) return L.game(it.g).map((x) => x.i);
  return L.main().map((x) => x.i);
}
function ctxLabel(name) {
  if (!name) return '';
  const map = { hero: '焦點', main: subsOn() ? '你的頻道' : '精選', trailer: '新預告', dark: '黑馬', live: '直播', cont: '繼續觀看', later: '稍後觀看', review: '評測', deep: '深度', guide: '攻略', play: '實況', news: '新聞' };
  if (map[name]) return map[name];
  if (name.startsWith('st:')) return '特別轉播' + (stormName() ? '・' + stormName() : '');
  if (name.startsWith('g:')) { const g = gameOf(name.slice(2).split(':')[0]); return g ? gameName(g) : ''; }
  if (name.startsWith('ch:') || name.startsWith('rk:')) return chOf(name.slice(3)).n || '';
  if (name.startsWith('list:')) return (LIST_META[name.slice(5)] || [''])[0];
  return '';
}
function onPlayerTake(it) { history.replaceState(null, '', '#watch/' + it.i); }
function onPlayerClosed() {
  try { questCheck(); } catch (e) { /* 任務不影響播放 */ }
  if (parse().startsWith('watch/')) {
    if (history.length > 1 && ROUTE) history.back(); else history.replaceState(null, '', '#' + BASE);
  }
  if (ROUTE === 'home' || ROUTE === 'me' || (ROUTE || '').startsWith('list/')) softRefresh();
}
function softRefresh() {
  const y = scrollY;
  render(ROUTE || 'home');
  scrollTo(0, y);
}

/* ------------------------------------------------------------ 分頁列的光條 */
function moveTabInk() {
  const on = $('#tabs a.on');
  let ink = $('#tabs .ink');
  if (!ink) { ink = document.createElement('i'); ink.className = 'ink'; $('#tabs').appendChild(ink); }
  if (!on) { ink.style.opacity = 0; return; }
  const r = on.getBoundingClientRect(), p = $('#tabs').getBoundingClientRect();
  const vertical = p.height > p.width;
  ink.style.opacity = 1;
  ink.style.transform = vertical ? `translate3d(0,${r.top - p.top}px,0)` : `translate3d(${r.left - p.left}px,0,0)`;
  ink.style[vertical ? 'height' : 'width'] = (vertical ? r.height : r.width) + 'px';
  ink.style[vertical ? 'width' : 'height'] = '';
}

/* ------------------------------------------------------------ 點擊 */
function hap() { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* */ } }
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]');
  const link = e.target.closest('a[href]');
  if (!a && link) {
    if (link.dataset.ctx != null && link.getAttribute('href').startsWith('#watch/')) {
      PENDING_CTX = link.dataset.ctx;
      const tapped = IDX.byId.get(link.dataset.v);
      // 只能到 YouTube 看的（頻道關掉嵌入、年齡限制）：一點就直接開 YouTube，不用先進導播台看錯誤訊息
      if (SET.play === 'yt' || (tapped && tapped.ne)) { e.preventDefault(); window.open(ytUrl(link.dataset.v), '_blank'); Snd.play('tap'); return; }
      Snd.play('tap');
    } else if (link.target === '_blank') {
      Snd.play('tap');
    }
    if (link.dataset.close && Player.isOpen()) { /* 換頁時路由會關掉導播台 */ }
    return;
  }
  if (!a) return;
  const act = a.dataset.act, c = a.dataset.c, v = a.dataset.v;
  switch (act) {
    case 'sub': {
      e.preventDefault();
      subscribe(c, a.dataset.src);
      Snd.play('sub'); hap();
      const r = a.getBoundingClientRect(); Fx.burst(r.left + r.width / 2, r.top + r.height / 2);
      toast('已訂閱「' + (chOf(c).n || '') + '」');
      refreshAfterAction();
      break;
    }
    case 'unsub': e.preventDefault(); unsubscribe(c); Snd.play('unsub'); toast('已取消訂閱'); refreshAfterAction(); break;
    case 'sub-group': {
      const ids = (a.dataset.ids || '').split(',').filter((x) => x && !VIEW.subs[x]);
      ids.forEach((x) => subscribe(x, 'pool'));
      Snd.play('sub'); hap();
      const r = a.getBoundingClientRect(); Fx.burst(r.left + r.width / 2, r.top + r.height / 2, ['#c4ff3d', '#ffffff', '#ffc229']);
      toast('一次訂閱 ' + ids.length + ' 台');
      refreshAfterAction();
      break;
    }
    case 'block': unsubscribe(c); block(c); Snd.play('unsub'); toast('封鎖了，它的影片不會再出現'); refreshAfterAction(); break;
    case 'unblock': unblock(c); Snd.play('select'); toast('解除封鎖'); refreshAfterAction(); break;
    case 'unpass': unpass(c); Snd.play('select'); refreshAfterAction(); break;
    case 'later': {
      const on = !VIEW.later[v];
      setLater(v, on);
      Snd.play('later'); hap();
      toast(on ? '收進稍後觀看（手機、電腦都看得到）' : '從稍後觀看移除');
      if (Player.isOpen()) Player.refresh();
      break;
    }
    case 'copy': {
      const url = ytUrl(v);
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('連結複製好了'), () => toast(url));
      Snd.play('select');
      break;
    }
    case 'take': Player.take(v); break;
    case 'pvw': Player.setMode(a.dataset.k); break;
    case 'auto': SET.auto = !SET.auto; saveSet(); Player.refresh(); Snd.play('tick'); toast(SET.auto ? '連播開著：播完自動接下一支' : '連播關了'); break;
    case 'nx-cancel': Player.cancelNext(); Snd.play('back'); break;
    case 'hero-play': { const id = heroCur(); if (id) { PENDING_CTX = 'hero'; location.hash = 'watch/' + id; } break; }
    case 'hero-later': { const id = heroCur(); if (id) { const on = !VIEW.later[id]; setLater(id, on); Snd.play('later'); toast(on ? '收進稍後觀看' : '從稍後觀看移除'); } break; }
    case 'hero-go': heroGo(+a.dataset.i); clearInterval(heroTimer); break;
    case 'play-list': { const ids = CTX.get(a.dataset.ctx) || []; if (ids[0]) { PENDING_CTX = a.dataset.ctx; location.hash = 'watch/' + ids[0]; } break; }
    case 'draft-sub': draftDecide('sub'); break;
    case 'draft-pass': draftDecide('pass'); break;
    case 'draft-peek': { const top = deckTop(); const s = top && $('.dr-sample', top); if (s) s.click(); break; }
    case 'pick-done': store.set('picked', 1); Fx.stinger(() => { location.hash = 'home'; }); break;
    case 'add-ch': {
      const q = ($('#addQ') || {}).value || '';
      if (!q.trim()) { toast('先貼上頻道網址或 @代號'); Snd.play('err'); break; }
      addChannel(q.trim());
      Snd.play('sub');
      toast('送出了：下一次轉播更新就會加入');
      refreshAfterAction();
      break;
    }
    case 'back': Snd.play('back'); if (history.length > 1) history.back(); else location.hash = 'home'; break;
    case 'reload': Snd.play('select'); toast('重新接收轉播訊號…'); refreshData(true).then(() => softRefresh()); break;
    case 'more': LF.limit = +a.dataset.n || 96; softRefresh(); break;
    case 'st-zh': ST.zh = a.dataset.k === '1'; store.set('stZh', ST.zh); LF.limit = 48; MEMO.clear(); Snd.play('tick'); softRefresh(); break;
    case 'lf-lane': LF.lane = a.dataset.k; LF.limit = 48; Snd.play('tick'); softRefresh(); break;
    case 'lf-lang': LF.lang = a.dataset.k; LF.limit = 48; Snd.play('tick'); softRefresh(); break;
    case 'clear-hist': if (a.dataset.sure) { clearHistory(); toast('清掉了'); softRefresh(); } else { a.dataset.sure = 1; a.textContent = '再按一次確定清除'; } break;
    case 'set-intro': SET.intro = a.dataset.k; saveSet(); Snd.play('tick'); softRefresh(); break;
    case 'set-fx': SET.fx = a.dataset.k; saveSet(); applyFx(); Snd.play('tick'); softRefresh(); break;
    case 'set-play': SET.play = a.dataset.k; saveSet(); Snd.play('tick'); softRefresh(); break;
    case 'sheet-close': closeSheet(); Snd.play('back'); break;
    case 'sheet-close-nav': closeSheet(); break;
    default: break;
  }
});
document.addEventListener('change', (e) => {
  const k = e.target.dataset && e.target.dataset.set;
  if (!k) return;
  if (e.target.type === 'checkbox') SET[k] = e.target.checked;
  else if (e.target.type === 'range') SET[k] = +e.target.value;
  saveSet();
  if (k === 'bgm' || k === 'sfx' || k === 'vol') { Snd.init(); Snd.refresh(); }
  if (['zhFirst', 'shorts', 'filtered', 'gacha'].includes(k)) { MEMO.clear(); renderTicker(); }
  if (k === 'autoLand') Land.onSetting();
  Snd.play('tick');
});
document.addEventListener('input', (e) => { if (e.target.dataset && e.target.dataset.set === 'vol') { SET.vol = +e.target.value; Snd.refresh(); } });
document.addEventListener('error', (e) => {
  const t = e.target;
  if (!t || t.tagName !== 'IMG') return;
  if (t.dataset.fb && t.src !== t.dataset.fb) { t.src = t.dataset.fb; return; }
  t.classList.add('noimg');
}, true);
let hoverAt = 0;
document.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const c = e.target.closest('.vc,.gt,.mon,.cc,.go-btn,.take-btn');
  if (!c || c === document.__lastHover) return;
  document.__lastHover = c;
  const t = performance.now();
  if (t - hoverAt > 60) { hoverAt = t; Snd.play('tick'); }
});

function refreshAfterAction() {
  MEMO.clear();
  renderTicker();
  if (Player.isOpen()) Player.refresh();
  if (ROUTE === 'rookies') return;     // 選秀牌組自己會動
  softRefresh();
}

/* ------------------------------------------------------------ 選秀牌組（拖曳） */
function deckTop() { const cards = $$('#deck .draft:not(.gone)'); return cards[cards.length - 1] || null; }
function deckInit() {
  const deck = $('#deck');
  if (!deck) return;
  let sx = 0, sy = 0, dx = 0, drag = null, horiz = null;
  deck.addEventListener('pointerdown', (e) => {
    const top = deckTop();
    if (!top || !top.contains(e.target) || e.target.closest('.dr-sample')) return;
    drag = top; sx = e.clientX; sy = e.clientY; dx = 0; horiz = null;
    top.setPointerCapture && top.setPointerCapture(e.pointerId);
    top.classList.add('drag');
  });
  deck.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const mx = e.clientX - sx, my = e.clientY - sy;
    if (horiz == null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) horiz = Math.abs(mx) > Math.abs(my);
    if (!horiz) return;
    dx = mx;
    drag.style.transform = `translate3d(${dx}px,0,0) rotate(${dx / 18}deg)`;
    drag.classList.toggle('lean-r', dx > 60);
    drag.classList.toggle('lean-l', dx < -60);
  });
  const end = () => {
    if (!drag) return;
    const d = drag; drag = null;
    d.classList.remove('drag', 'lean-r', 'lean-l');
    if (horiz && Math.abs(dx) > 90) { draftDecide(dx > 0 ? 'sub' : 'pass', d); return; }
    d.style.transform = '';
  };
  deck.addEventListener('pointerup', end);
  deck.addEventListener('pointercancel', end);
}
function draftDecide(kind, card) {
  const top = card || deckTop();
  if (!top) return;
  const c = top.dataset.c;
  top.classList.add('gone', kind === 'sub' ? 'fly-r' : 'fly-l');
  top.style.transform = '';
  if (kind === 'sub') {
    subscribe(c, 'rookie');
    Snd.play('sub'); hap();
    Fx.stamp(top, '選進來！', 'lime');
    const r = top.getBoundingClientRect(); Fx.burst(r.left + r.width / 2, r.top + r.height / 3, ['#c4ff3d', '#ffffff', '#ffc229']);
    toast('選進來了：「' + (chOf(c).n || '') + '」會出現在你的轉播台');
  } else {
    pass(c);
    Snd.play('pass');
    Fx.stamp(top, 'PASS', 'dim');
  }
  renderTicker();
  setTimeout(() => {
    if (!deckTop()) { MEMO.clear(); softRefresh(); }
  }, 700);
}

/* ------------------------------------------------------------ 其他 */
let toastT = 0;
function toast(msg) {
  if (typeof Land !== 'undefined' && Land.mode) { Land.say(msg); return; }   // 橫放全螢幕時寫在播放器裡（跟著轉）
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 2600);
}
function syncLight() {
  const s = $('#sync');
  if (!s) return;
  s.className = 'sync ' + syncState();
  s.title = { ok: '訂閱都同步了', wait: '有動作等轉播管線收件', bad: '送不出去，連上網路後重送' }[syncState()];
}
function applyFx() { document.documentElement.classList.toggle('fx-lite', Fx.lite()); }
function tickClock() {
  const d = new Date();
  $('#clock').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
async function refreshData(fresh) {
  const changed = await loadAll(fresh);
  renderTicker();
  syncLight();
  return changed;
}

document.addEventListener('keydown', (e) => {
  if (e.target.matches && e.target.matches('input,textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
  if (Player.isOpen()) {
    if (e.key === 'Escape') { Player.close(); }
    else if (e.key === 'ArrowDown' || e.key === 'n' || e.key === 'N') { e.preventDefault(); Player.next(); }
    else if (e.key === 'ArrowUp' || e.key === 'p' || e.key === 'P') { e.preventDefault(); Player.prev(); }
    else if (e.key === ' ') { e.preventDefault(); Player.toggle(); }
    else if (e.key === 'f' || e.key === 'F') Player.fullscreen();
    else if ((e.key === 'l' || e.key === 'L') && Player.cur) { const on = !VIEW.later[Player.cur.i]; setLater(Player.cur.i, on); Snd.play('later'); Player.refresh(); toast(on ? '收進稍後觀看' : '移除'); }
    return;
  }
  if (e.key === '/') { e.preventDefault(); openSearch(); }
  else if ($('#sheet') && !$('#sheet').hidden && e.key === 'Escape') closeSheet();
  else if (e.key >= '1' && e.key <= '6') { const t = ['home', 'storm', 'live', 'games', 'rookies', 'me'][+e.key - 1]; location.hash = t; }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    Snd.setHidden(true);
    flushHist();
    store.set('visit', Date.now());
  } else {
    Snd.setHidden(false);
    if (Date.now() - D.at > 2 * 60e3) refreshData().then((ch) => { if (ch && !Player.isOpen() && (ROUTE === 'home' || ROUTE === 'live' || ROUTE === 'storm')) softRefresh(); });
    sendNow();
  }
});
addEventListener('resize', () => moveTabInk());
addEventListener('hashchange', route);
addEventListener('online', () => { sendNow(); refreshData(); });

/* ------------------------------------------------------------ 開機 */
async function start() {
  applyFx();
  tickClock();
  setInterval(tickClock, 15000);
  syncLight();
  $('#btnSearch').addEventListener('click', openSearch);
  $('#sync').addEventListener('click', () => { Snd.play('tick'); location.hash = 'me'; setTimeout(() => { const s = $('.sys'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 450); });
  $('#pgmClose').addEventListener('click', () => Player.close());
  $('#pgmFull').addEventListener('click', () => Player.fullscreen());
  Land.init();
  const lastVisit = store.get('visit', 0);
  // 開場有新段落時（INTRO_REV：2026/11/18 加了今晚節目單），更新後第一次打開照樣播，不用等到明天
  const showIntro = SET.intro === 'every' || (SET.intro === 'daily' && (store.get('boot') !== dayKey() || (+store.get('introRev', 0) || 0) < INTRO_REV));
  const loading = refreshData();
  if (showIntro && !QS.has('skip')) {
    const stats = await Promise.race([loading.then(() => (D.feed ? `${L.newCount()} 支新片 · ${L.live().length} 場直播 · ${Object.keys(IDX.ch).length} 個頻道` : '')), new Promise((r) => setTimeout(() => r(''), 1800))]);
    route();
    await Fx.boot(stats);
    store.set('boot', dayKey()); store.set('introRev', INTRO_REV);
    Snd.bgmStart();
    welcome(lastVisit);
  } else {
    route();
    const unlock = () => { Snd.init(); Snd.bgmStart(); };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
  }
  await loading;
  // 從《解包》直接點影片進來（#watch/…）時資料還沒到：到了之後補上標題、頻道和接著播的清單
  if (Player.isOpen() && Player.cur && Player.cur.ghost) Player.relink(defaultCtx(Player.cur.i));
  try { questCheck(); } catch (e) { /* */ }
  if (!Player.isOpen()) softRefresh();
  sendNow();
  setInterval(() => { if (!document.hidden) refreshData().then((ch) => { if (ch && !Player.isOpen() && ROUTE === 'home' && scrollY < 80) softRefresh(); }); }, 5 * 60e3);
  setInterval(() => { if (SYNC.out.length) sendNow(); }, 10 * 60e3);
  if (window.SP_WEB && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { /* */ });
}
function welcome(lastVisit) {
  if (!D.feed) return;
  const since = (lastVisit || 0) / 1000;
  const n = since ? L.main().filter((it) => it.p > since).length : L.main().filter((it) => nowS() - it.p < 86400).length;
  const live = L.live().length;
  const sub = [since ? `你不在的時候進來 ${n} 支新片` : `今天 ${n} 支新片`];
  if (live) sub.push(live + ' 場直播中');
  const rk = rookies().length;
  if (rk) sub.push(rk + ' 位新秀等你選');
  setTimeout(() => Fx.lowerThird(greet() + '，' + NAME, sub.join(' · ')), 250);
}
start();

/* ---------- 換新版（2026/11/18）----------
   加到主畫面的 App 切回來不會重新載入，所以回到 App 時看一下網站上的 ver.json：已經是新版就重新載入
   （剛切回來、沒在打字、沒開著東西才自動換；不然頂端出一顆「有新版本・點一下更新」）。一分鐘最多看一次；
   自動重新載入之後 60 秒內不再自動換（網站快取還沒換完時不會一直重整）。 */
const Fresh = {
  at: 0, busy: false, shown: false, hid: 0,
  async check(back) {
    if (!window.SP_WEB || this.busy || !navigator.onLine) return;
    const now = Date.now(); if (now - this.at < 60e3) return; this.at = now; this.busy = true;
    try {
      const r = await fetch('ver.json?t=' + now, { cache: 'no-store' }); if (!r.ok) return;
      const j = await r.json(); if (!j || !j.v || j.v === BUILD) return;
      let last = 0; try { last = +sessionStorage.getItem('freshAt') || 0; } catch (e) { /* 無痕模式 */ }
      const typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (back && !typing && (!Player.isOpen()) && now - last > 60e3) { this.reload(); return; }
      this.chip();
    } catch (e) { /* 連不上就下次再看 */ } finally { this.busy = false; }
  },
  reload() { try { sessionStorage.setItem('freshAt', String(Date.now())); } catch (e) { /* 無痕模式 */ } location.reload(); },
  chip() {
    if (this.shown) return; this.shown = true;
    const b = document.createElement('button'); b.className = 'fresh-chip'; b.type = 'button'; b.textContent = '有新版本・點一下更新';
    b.addEventListener('click', (ev) => { ev.stopPropagation(); this.reload(); });
    document.body.appendChild(b);
  },
};
document.addEventListener('visibilitychange', () => { if (document.hidden) Fresh.hid = Date.now(); else Fresh.check(Fresh.hid > 0 && Date.now() - Fresh.hid > 2000); });
addEventListener('pageshow', (e) => { if (e.persisted) { Fresh.at = 0; Fresh.check(true); } });
setTimeout(() => Fresh.check(false), 6000);
setInterval(() => { if (!document.hidden) Fresh.check(false); }, 10 * 60e3);
