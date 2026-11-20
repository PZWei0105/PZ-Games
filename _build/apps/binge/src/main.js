'use strict';
/* 補番 BINGE — 路由、點擊、天空、開場 */

let ROUTE = null, BASE = 'home', PENDING_CTX = '', LAST_TAB = 'home';
const SCROLL = new Map();
const TABS = ['home', 'ai', 'ani', 'mine'];
function tabOf(r) {
  if (TABS.includes(r)) return r;
  if (r === 'key') return 'mine';
  if (r.startsWith('list/')) { const k = r.slice(5); if (/^(comps:ai|fresh:ai|genre|len|shows:ai)/.test(k)) return 'ai'; if (/^(eps|comps:ani|movies|kind)/.test(k)) return 'ani'; if (/^(later|cont|history)/.test(k)) return 'mine'; }
  return LAST_TAB;
}
function parse() { return decodeURIComponent((location.hash || '').replace(/^#/, '')) || 'home'; }

function render(r) {
  const v = $('#view');
  let html;
  try {
    if (r === 'home') html = vHome();
    else if (r === 'ai') html = vAI();
    else if (r === 'ani') html = vAni();
    else if (r === 'mine') html = vMine();
    else if (r === 'key') html = vKey();
    else if (r.startsWith('show/')) html = vShow(r.slice(5));
    else if (r.startsWith('ch/')) html = vChannel(r.slice(3));
    else if (r.startsWith('list/')) html = vList(r.slice(5));
    else html = vHome();
  } catch (e) {
    console.error(e);
    html = empty('這頁打不開', esc(e.message), '<a class="btn" href="#home">回放送</a>');
  }
  v.innerHTML = html;
  v.className = 'r-' + r.split('/')[0];
  const t = tabOf(r);
  LAST_TAB = t;
  $$('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === t));
  moveTabInk();
  if (r === 'home') heroStart(); else clearInterval(heroTimer);
  if (r === 'mine') $$('[data-count]').forEach((el) => { const n = +el.dataset.count; if (Number.isInteger(n) && n > 0) Fx.count(el, n, 900); });
  v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
}

function route(ev) {
  const r = parse();
  if (r.startsWith('watch/')) {
    const id = r.slice(6);
    if (ROUTE == null) { ROUTE = BASE; render(BASE); }
    if (SET.play === 'yt' && !Player.isOpen()) { history.replaceState(null, '', '#' + (ROUTE || 'home')); window.open(ytUrl(id, (histOf(id) || [])[1]), '_blank'); return; }
    if (!Player.isOpen() || !Player.cur || Player.cur.i !== id) {
      const ctx = CTX.get(PENDING_CTX) || defaultCtx(id);
      Player.open(id, ctx, ctxLabel(PENDING_CTX, id));
    }
    PENDING_CTX = '';
    return;
  }
  if (Player.isOpen()) Player.close();
  if (Swipe.isOpen()) Swipe.close();
  if (r === ROUTE) return;
  if (ROUTE) SCROLL.set(ROUTE, scrollY);
  const prev = ROUTE;
  const go = () => { ROUTE = r; BASE = r; render(r); scrollTo(0, SCROLL.get(r) || 0); };
  if (prev && TABS.includes(r) && tabOf(prev) !== r) {
    const a = $('#tabs a[data-tab="' + r + '"]');
    const b = a && a.getBoundingClientRect();
    Fx.iris(go, b ? b.left + b.width / 2 : null, b ? b.top + b.height / 2 : null);
  } else { go(); if (prev) Snd.play('select'); }
}
function defaultCtx(id) {
  const v = IDX.byId.get(id);
  if (!v) return [id];
  const s = showOf(v);
  if (s) return s.eps.map((x) => x.i);
  return L.all(tabOf(ROUTE || 'home') === 'ai' ? 'ai' : '').map((x) => x.i);
}
function ctxLabel(name, id) {
  if (!name) { const s = showOf(IDX.byId.get(id)); return s ? s.n : ''; }
  const map = { hero: '今日放送', cont: '繼續補番', news: '追番更新', live: '直播馬拉松', comps: '一口氣看完', aicomps: '一口氣看完', jp: '日本動畫新集', cn: '國漫新集', anicomp: '番劇合輯', movies: '劇場版', toon: '卡通', later: '片單', aifresh: '新上架', search: '搜尋結果' };
  if (map[name]) return map[name];
  if (name.startsWith('show:')) { const s = IDX.showById.get(name.slice(5)); return s ? s.n : ''; }
  if (name.startsWith('ch:')) return chOf(name.slice(3)).n || '';
  if (name.startsWith('list:')) return listOf(name.slice(5)).t;
  return '';
}
function onPlayerTake(v) { history.replaceState(null, '', '#watch/' + v.i); }
function onPlayerClosed() {
  if (parse().startsWith('watch/')) {
    if (history.length > 1 && ROUTE) history.back(); else history.replaceState(null, '', '#' + BASE);
  }
  MEMO.delete('cont'); MEMO.delete('news'); MEMO.delete('hero');
  if (['home', 'mine', 'ai', 'ani'].includes(ROUTE) || (ROUTE || '').startsWith('show/') || (ROUTE || '').startsWith('list/')) softRefresh();
}
function softRefresh() { const y = scrollY; render(ROUTE || 'home'); scrollTo(0, y); }

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
    const href = link.getAttribute('href');
    if (href.startsWith('#watch/')) {
      PENDING_CTX = link.dataset.ctx || '';
      const tid = href.slice(7), tv = IDX.byId.get(tid);
      // 只能到 YouTube 看的：一點就直接開 YouTube，不用先進放映室看錯誤訊息
      if (SET.play === 'yt' || (tv && tv.ne)) { e.preventDefault(); window.open(ytUrl(tid, (histOf(tid) || [])[1]), '_blank'); Snd.play('tap'); return; }
      Snd.play('tap');
    } else if (link.target === '_blank') Snd.play('tap');
    else if (href.startsWith('#show/') || href.startsWith('#ch/') || href.startsWith('#list/')) { Snd.play('tap'); if (href.startsWith('#show/')) EPR = 0; }
    if (link.dataset.close && Player.isOpen()) { /* 換頁時路由會關掉放映機 */ }
    return;
  }
  if (!a) return;
  const act = a.dataset.act, v = a.dataset.v, k = a.dataset.k;
  switch (act) {
    case 'follow': {
      e.preventDefault();
      follow(a.dataset.s);
      Snd.play('kira'); hap();
      const r = a.getBoundingClientRect(); Fx.sparkle(r.left + r.width / 2, r.top + r.height / 2);
      toast('追番了：出新集會出現在放送頁最上面');
      afterAction();
      break;
    }
    case 'unfollow': e.preventDefault(); unfollow(a.dataset.s); Snd.play('unkira'); toast('不追了'); afterAction(); break;
    case 'later': case 'sw-later': {
      const on = !VIEW.later[v];
      setLater(v, on);
      Snd.play('later'); hap();
      toast(on ? '收進片單（手機、電腦都看得到）' : '從片單拿掉');
      if (act === 'sw-later') Swipe.render(); else afterAction();
      break;
    }
    case 'hide': hideShow(a.dataset.s); Snd.play('back'); toast('不會再出現這部'); history.back(); break;
    case 'unhide': unhideShow(a.dataset.s); Snd.play('select'); afterAction(); break;
    case 'block': block(a.dataset.c); Snd.play('back'); toast('封鎖了，這台的影片不會再出現'); afterAction(); break;
    case 'unblock': unblock(a.dataset.c); Snd.play('select'); toast('解除封鎖'); afterAction(); break;
    case 'copy': { const url = ytUrl(v); (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('連結複製好了'), () => toast(url)); Snd.play('select'); break; }
    case 'take': Player.take(v); break;
    case 'prev': Player.prev(); break;
    case 'next': Player.next(); break;
    case 'toggle': Player.toggle(); Snd.play('tap'); break;
    case 'back10': Player.seekBy(-10); break;
    case 'fwd10': Player.seekBy(10); break;
    case 'skipop': Player.skipOp(); break;
    case 'comp-next': if (!Player.nextInComp()) toast('這支沒有分集資訊'); break;
    case 'rate': Player.cycleRate(); break;
    case 'sleep-menu': Player.sleepSheet(); Snd.play('select'); break;
    case 'sleep-set': closeSheet(); Player.setSleep(k); break;
    case 'sleep-more': Player.sleepMore(); break;
    case 'chap-menu': Player.chapterSheet(); Snd.play('select'); break;
    case 'chap-go': closeSheet(); Player.seekTo(+a.dataset.s); break;
    case 'tl-seek': Player.tlSeek(e, a); break;
    case 'from-start': Player.fromStart(); break;
    case 'auto': SET.auto = !SET.auto; saveSet(); Snd.play('tick'); toast(SET.auto ? '連播開著：看完自動接下一集' : '連播關了'); Player.refresh(); $$('.auto').forEach((x) => { x.classList.toggle('on', SET.auto); x.textContent = '連播 ' + (SET.auto ? 'ON' : 'OFF'); }); break;
    case 'nx-cancel': Player.cancelNext(); Snd.play('back'); break;
    case 'th-close': Player.close(); break;
    case 'hero-play': { const id = heroCur(); if (id) { PENDING_CTX = 'hero'; location.hash = 'watch/' + id; } break; }
    case 'hero-later': { const id = heroCur(); if (id) { const on = !VIEW.later[id]; setLater(id, on); Snd.play('later'); toast(on ? '收進片單' : '從片單拿掉'); } break; }
    case 'hero-go': heroGo(+a.dataset.i); clearInterval(heroTimer); break;
    case 'gacha': spinGacha(a); break;
    case 'gacha-play': PENDING_CTX = ''; location.hash = 'watch/' + v; break;
    case 'aif': AIF = k; LF.limit = 48; Snd.play('tick'); MEMO.clear(); softRefresh(); break;
    case 'anif': ANIF = k; LF.limit = 48; Snd.play('tick'); softRefresh(); break;
    case 'anis': ANIS = k; Snd.play('tick'); softRefresh(); break;
    case 'epr': EPR = +k; Snd.play('tick'); softRefresh(); break;
    case 'swipe-open': { const ids = CTX.get(a.dataset.ctx) || []; Snd.play('whoosh'); Swipe.open(ids, ids[0]); break; }
    case 'sw-full': Swipe.close(true); PENDING_CTX = ''; location.hash = 'watch/' + v; break;
    case 'sw-close': Swipe.close(); break;
    case 'sw-up': Swipe.go(-1); break;
    case 'sw-down': Swipe.go(1); break;
    case 'more': LF.limit = +a.dataset.n || 96; softRefresh(); break;
    case 'back': Snd.play('back'); if (history.length > 1) history.back(); else location.hash = LAST_TAB || 'home'; break;
    case 'reload': Snd.play('select'); toast('重新接收片庫…'); refreshData(true).then(() => softRefresh()); break;
    case 'replay-op': store.del('boot'); bootSequence(true); break;
    case 'clear-hist': if (a.dataset.sure) { clearHistory(); toast('清掉了'); softRefresh(); } else { a.dataset.sure = 1; a.textContent = '再按一次確定清除'; } break;
    case 'set-seg': {
      const key = a.dataset.k, val = a.dataset.v;
      SET[key] = ['skipOp'].includes(key) ? +val : val;
      saveSet();
      Snd.play('tick');
      if (key === 'sky') applySky();
      if (key === 'fx') applyFx();
      softRefresh();
      break;
    }
    case 'add-ch': {
      const q = ($('#addQ') || {}).value || '';
      if (!q.trim()) { toast('先貼上頻道網址或 @代號'); Snd.play('err'); break; }
      addChannel(q.trim());
      Snd.play('kira');
      toast('送出了：下一次片庫更新（30 分鐘內）就會加入');
      afterAction();
      break;
    }
    case 'stip': { const q = $('#sq'); if (q) { q.value = k; renderSearch(k); } break; }
    case 'sheet-close': closeSheet(); Snd.play('back'); break;
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
  if (['zhFirst', 'kids', 'west'].includes(k)) MEMO.clear();
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
  const c = e.target.closest('.vc,.mc,.sc,.cc,.ep2,.go-btn,.genre,.len,.chc');
  if (!c || c === document.__lastHover) return;
  document.__lastHover = c;
  const t = performance.now();
  if (t - hoverAt > 60) { hoverAt = t; Snd.play('tick'); }
});
function afterAction() {
  MEMO.clear();
  if (Player.isOpen()) Player.refresh();
  if (Swipe.isOpen()) Swipe.render();
  softRefresh();
}

/* ------------------------------------------------------------ 其他 */
let toastT = 0;
let scrolledOn = false;
addEventListener('scroll', () => {
  const on = scrollY > 8;
  if (on !== scrolledOn) { scrolledOn = on; document.documentElement.classList.toggle('scrolled', on); }
}, { passive: true });
function toast(msg, ms) {
  if (typeof Land !== 'undefined' && Land.mode) { Land.say(msg); return; }   // 橫放全螢幕時寫在播放器裡（跟著轉）
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), ms || 2600);
}
function syncLight() {
  const s = $('#sync');
  if (!s) return;
  s.className = 'sync ' + syncState();
  s.title = { ok: '片單都同步了', wait: '有動作等資料管線收件', bad: '送不出去，連上網路後重送' }[syncState()];
}
function applyFx() { document.documentElement.classList.toggle('fx-lite', Fx.lite()); }
function skyNow() {
  if (SET.sky && SET.sky !== 'auto') return SET.sky;
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 16.5) return 'day';
  if (h >= 16.5 && h < 19) return 'dusk';
  return 'night';
}
function applySky() {
  const s = skyNow();
  const html = document.documentElement;
  ['dawn', 'day', 'dusk', 'night'].forEach((x) => html.classList.toggle('sky-' + x, x === s));
  html.classList.toggle('dark', s === 'night' || s === 'dusk');
  $('meta[name=theme-color]').setAttribute('content', { dawn: '#f6b7a6', day: '#5fb8ff', dusk: '#3a2470', night: '#0d0f2b' }[s]);
  const lab = $('#skyLab');
  if (lab) lab.textContent = { dawn: '清晨', day: '白天', dusk: '黃昏', night: '深夜' }[s];
  Snd.setMood(s === 'night' ? 'night' : s === 'dusk' ? 'dusk' : 'day');
}
function tickClock() {
  const d = new Date();
  $('#clock').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
async function refreshData(fresh) {
  const changed = await loadAll(fresh);
  syncLight();
  return changed;
}

document.addEventListener('keydown', (e) => {
  if (e.target.matches && e.target.matches('input,textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
  if (Swipe.isOpen()) {
    if (e.key === 'Escape') Swipe.close();
    else if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); Swipe.go(1); }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); Swipe.go(-1); }
    else if (e.key === ' ') { e.preventDefault(); Swipe.toggle(); }
    return;
  }
  if (Player.isOpen()) {
    if (e.key === 'Escape') { if (!$('#sheet').hidden) closeSheet(); else Player.close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); Player.seekBy(e.shiftKey ? 60 : 10); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); Player.seekBy(e.shiftKey ? -60 : -10); }
    else if (e.key === 'n' || e.key === 'N' || e.key === 'ArrowDown') { e.preventDefault(); Player.next(); }
    else if (e.key === 'p' || e.key === 'P' || e.key === 'ArrowUp') { e.preventDefault(); Player.prev(); }
    else if (e.key === ' ' || e.key === 'k') { e.preventDefault(); Player.toggle(); }
    else if (e.key === 'f' || e.key === 'F') Player.fullscreen();
    else if (e.key === 's' || e.key === 'S') Player.skipOp();
    else if (e.key === ']') Player.cycleRate();
    return;
  }
  if (e.key === '/') { e.preventDefault(); openSearch(); }
  else if (!$('#sheet').hidden && e.key === 'Escape') closeSheet();
  else if (e.key >= '1' && e.key <= '4') location.hash = TABS[+e.key - 1];
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    Snd.setHidden(true);
    flushHist();
    store.set('visit', Date.now());
    sendNow();
  } else {
    Snd.setHidden(false);
    applySky();
    if (Date.now() - D.at > 3 * 60e3) refreshData().then((ch) => { if (ch && !Player.isOpen() && !Swipe.isOpen() && TABS.includes(ROUTE)) softRefresh(); });
    sendNow();
  }
});
addEventListener('resize', () => moveTabInk());
addEventListener('hashchange', route);
addEventListener('online', () => { sendNow(); refreshData(); });
addEventListener('pagehide', () => { flushHist(); sendNow(); });

/* ------------------------------------------------------------ 開機 */
const OP_LINES = ['今天也一口氣看完吧', '補完計畫，開始', '放映室開門了', '下一集，馬上開播', '片頭曲，下！', '今天補什麼番'];
function opLine() {
  const h = new Date().getHours();
  if (h >= 0 && h < 5) return '深夜補番，記得留點睡眠';
  const news = D.cat ? SL.news().length : 0;
  if (news) return '你追的 ' + news + ' 部出新集了';
  const d = new Date().getDay();
  if (d === 0 || d === 6) return '週末，一口氣看完吧';
  return OP_LINES[hash32(dayKey()) % OP_LINES.length];
}
function episodeNo() {
  const days = store.get('days', { n: 0, last: '' });
  if (days.last !== dayKey()) { days.n++; days.last = dayKey(); store.set('days', days); }
  return days.n;
}
async function bootSequence(force) {
  const ep = episodeNo();
  const cuts = D.cat ? heroPicks().map((x) => x.v.i) : [];
  const nLive = D.cat ? L.live().filter((v) => v.live).length : 0;
  const stats = D.cat ? [IDX.shows.length + ' 部作品', L.comps('').length + ' 支長片合輯', nLive ? nLive + ' 場直播' : ''].filter(Boolean).join(' · ') : '';
  await Fx.boot({ ep, line: opLine(), cuts, stats });
  store.set('boot', dayKey());
  Snd.bgmStart();
  if (!force) welcome(ep);
}
async function start() {
  applyFx();
  applySky();
  tickClock();
  setInterval(tickClock, 15000);
  setInterval(applySky, 5 * 60e3);
  syncLight();
  Swipe.bind();
  $('#btnSearch').addEventListener('click', () => { Snd.play('select'); openSearch(); });
  $('#sync').addEventListener('click', () => { Snd.play('tick'); location.hash = 'mine'; setTimeout(() => { const s = $('.sys'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 500); });
  $('#thClose').addEventListener('click', () => Player.close());
  $('#thFull').addEventListener('click', () => Player.fullscreen());
  Land.init();
  const lastVisit = store.get('visit', 0);
  const showIntro = SET.intro === 'every' || (SET.intro === 'daily' && store.get('boot') !== dayKey());
  const loading = refreshData();
  if (showIntro && !QS.has('skip')) {
    await Promise.race([loading, new Promise((r) => setTimeout(r, 1800))]);
    route();
    await bootSequence();
  } else {
    episodeNo();
    route();
    const unlock = () => { Snd.init(); Snd.bgmStart(); };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
  }
  await loading;
  if (!Player.isOpen() && !Swipe.isOpen()) softRefresh();
  showNews(lastVisit, showIntro && !QS.has('skip'));
  sendNow();
  setInterval(() => { if (!document.hidden) refreshData().then((ch) => { if (ch && !Player.isOpen() && !Swipe.isOpen() && ROUTE === 'home' && scrollY < 80) softRefresh(); }); }, 6 * 60e3);
  setInterval(() => { if (SYNC.out.length) sendNow(); }, 10 * 60e3);
  if (window.BG_WEB && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { /* */ });
  void lastVisit;
}
function showNews(lastVisit, afterOp) {
  // 改版提示：每一筆只說一次；第一次打開的人不用看
  if (typeof NEWS === 'undefined' || !NEWS.length || store.get('news') === NEWS[0].id) return;
  store.set('news', NEWS[0].id);
  if (!lastVisit) return;
  setTimeout(() => { if (!Player.isOpen() && !Swipe.isOpen()) toast('更新：' + NEWS[0].t, 7000); }, afterOp ? 4200 : 1500);
}
function welcome(ep) {
  if (!D.cat) return;
  const sub = [];
  const news = SL.news();
  if (news.length) sub.push('追番更新 ' + news.reduce((s, x) => s + x.n, 0) + ' 集');
  const cont = L.cont();
  if (cont.length) sub.push('有 ' + cont.length + ' 支看到一半');
  const live = L.live().filter((v) => v.live).length;
  if (live) sub.push(live + ' 場直播馬拉松');
  if (!sub.length) sub.push('今天有 ' + L.fresh('').filter((v) => nowS() - v.p < 86400).length + ' 支新片');
  setTimeout(() => Fx.titleCard('第 ' + ep + ' 話', greet() + '，' + NAME, sub.join(' · ')), 300);
}
start();
