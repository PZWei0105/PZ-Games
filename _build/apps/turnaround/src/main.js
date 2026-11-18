const INTRO_REV = 2;   // 開場的版本：2026/11/18 加了「今日出發看板」（更新後第一次打開照樣播）
/* 開機、路由、讀資料、開場 */
const App = {
  tab: 'dep', ready: false, pushed: false, dirty: {}, entered: false,
  async getJSON(path) {
    if (!IS_WEB) {
      const E = window.TA_DATA || {};
      if (path === 'data/index.json') return E.index;
      if (path === 'data/fleet.json') return E.fleet;
      if (path === 'data/manual.json') return E.manual;
      const m = path.match(/days\/(.+)\.json$/); if (m) { if (E.days && E.days[m[1]]) return E.days[m[1]]; throw new Error('Claude 版只帶最近幾天'); }
      return null;
    }
    const r = await fetch(path, { cache: 'no-cache' });
    if (!r.ok) throw new Error(path + ' ' + r.status);
    return r.json();
  },
  async loadDay(date) {
    if (D.days[date]) return D.days[date];
    try { D.days[date] = await this.getJSON('data/days/' + date + '.json'); } catch (e) { D.days[date] = null; toast('這一天的航班讀不到'); }
    return D.days[date];
  },
  async load() {
    const [index, fleet, manual] = await Promise.all([this.getJSON('data/index.json'), this.getJSON('data/fleet.json'), this.getJSON('data/manual.json')]);
    D.index = index; D.fleet = fleet; D.manual = manual;
    D.fleetBy = {}; fleet.works.forEach((w) => { D.fleetBy[w.id] = w; });
    D.ruleBy = {}; manual.rules.forEach((r) => { D.ruleBy[r.id] = r; });
    if (index.latest) await this.loadDay(index.latest);
    const li = latestInspection(); if (li && li.date !== index.latest) await this.loadDay(li.date);
    this.ready = true;
  },
  async checkInbox(force) {
    if (!IS_WEB || !navigator.onLine) return;
    try {
      const r = await fetch('data/inbox.json', { cache: 'no-cache' }); if (!r.ok) return;
      const j = await r.json(); D.inboxAt = j.at || '';
      Sync.ack(new Set((j.events || []).map((e) => e.id)));
      if (force) App.refresh(true);
    } catch (e) { /* 收不到就下次 */ }
  },
  async freshen() {
    if (!IS_WEB) return;
    try {
      const idx = await this.getJSON('data/index.json');
      if (idx && idx.latest && D.index && idx.latest !== D.index.latest) {
        D.index = idx; await this.loadDay(idx.latest);
        const [fleet, manual] = await Promise.all([this.getJSON('data/fleet.json'), this.getJSON('data/manual.json')]);
        D.fleet = fleet; D.manual = manual; D.fleetBy = {}; fleet.works.forEach((w) => { D.fleetBy[w.id] = w; }); D.ruleBy = {}; manual.rules.forEach((r) => { D.ruleBy[r.id] = r; });
        Snd.chime(); toast('新航班到站了！');
        this.dirty = { dep: 1, hangar: 1, manual: 1, me: 1 }; this.show(this.tab, true);
      }
    } catch (e) { /* 下次再看 */ }
  },
  refresh(soft) {
    if (!this.ready) return;
    this.badges(); Sync.mark();
    this.dirty = { dep: 1, hangar: 1, manual: 1, me: 1 };
    if (!soft || !$('#pages .page')) this.show(this.tab, true);
  },
  badges() {
    const latest = D.days[D.index.latest];
    const set = (id, n) => { const b = $(id); if (!b) return; b.textContent = n || ''; b.classList.toggle('on', n > 0); };
    set('#tb-dep', latest ? latest.flights.filter((f) => !S.votes[f.id]).length : 0);
    const li = latestInspection(); const ins = li && D.days[li.date] ? D.days[li.date].inspection : null;
    set('#tb-hangar', (ins && !S.dispatched[ins.id] && (ins.items || []).length ? 1 : 0) + (S.flight && Date.now() - Date.parse(S.flight.t) > 20000 ? 1 : 0));
    set('#tb-manual', D.manual.rules.filter((r) => r.status === 'proposed' && !S.notams[r.id]).length);
  },
  show(tab, keepScroll) {
    const changed = tab !== this.tab;
    this.tab = tab;
    $$('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
    $$('.view').forEach((v) => v.classList.toggle('on', v.dataset.tab === tab));
    if (changed || this.dirty[tab] || !$('#v-' + tab).innerHTML) {
      this.dirty[tab] = 0;
      if (tab === 'dep') renderDep(D.view && D.view !== D.index.latest && !changed ? D.view : null);
      if (tab === 'hangar') renderHangar();
      if (tab === 'manual') renderManual();
      if (tab === 'me') renderMe();
    }
    if (changed && !keepScroll) window.scrollTo(0, 0);
    this.badges();
  },
};

function go(h) { if (location.hash === h) route(); else { App.pushed = true; location.hash = h; } }
function back() {
  if (App.pushed && history.length > 1) { App.pushed = false; history.back(); }
  else { location.hash = '#' + App.tab; }
}
function route() {
  if (!App.ready) return;
  const h = decodeURIComponent(location.hash || '#dep');
  let m;
  if ((m = h.match(/^#f\/(.+)$/))) { if (!$('#v-' + App.tab).innerHTML) App.show(App.tab); flightPage(m[1]); return; }
  if ((m = h.match(/^#i\/(\d{4}-\d{2}-\d{2})\/(.+)$/))) { if (!$('#v-' + App.tab).innerHTML) App.show(App.tab); inspPage(m[2], m[1]); return; }
  closePages(false);
  if ((m = h.match(/^#d\/(\d{4}-\d{2}-\d{2})$/))) { App.tab = 'dep'; $$('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === 'dep')); $$('.view').forEach((v) => v.classList.toggle('on', v.dataset.tab === 'dep')); renderDep(m[1]); window.scrollTo(0, 0); return; }
  const tab = h.replace('#', '');
  App.show(['dep', 'hangar', 'manual', 'me'].includes(tab) ? tab : 'dep');
}
window.addEventListener('hashchange', route);

/* 點擊：看板列、到站紀錄、分頁 */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-f],[data-i],[data-day],[data-go],[data-insp],[data-w],[data-rck],[data-fbn],#tabs a,#tower-dot');
  if (!t) return;
  Snd.init();
  if (t.closest('#tabs')) { Snd.tick(); haptic(8); if (location.hash === t.getAttribute('href')) { window.scrollTo({ top: 0, behavior: 'smooth' }); } return; }
  if (t.id === 'tower-dot') { go('#me'); setTimeout(() => { const n = $('#sync-now'); if (n) n.scrollIntoView({ block: 'center' }); }, 300); return; }
  if (t.dataset.f) { e.preventDefault(); haptic(10); go('#f/' + t.dataset.f); return; }
  if (t.dataset.i) { e.preventDefault(); haptic(10); go('#hangar'); return; }
  if (t.dataset.day) { e.preventDefault(); Snd.tick(); go('#d/' + t.dataset.day); return; }
  if (t.dataset.go) { e.preventDefault(); Snd.tick(); go(t.dataset.go); return; }
  if (t.dataset.insp && !t.closest('#sheet')) { e.preventDefault(); Snd.tick(); go('#i/' + t.dataset.date + '/' + t.dataset.insp); return; }
  if (t.dataset.w) { e.preventDefault(); workSheet(t.dataset.w); return; }
  if (t.dataset.rck) { e.preventDefault(); Snd.tick(); go('#i/' + t.dataset.date + '/' + t.dataset.rck); return; }
  if (t.hasAttribute('data-fbn')) { e.preventDefault(); const f = S.flight; if (f) openVerify(verifyKey(f.work, f.insp), Math.max(1, Math.round((Date.now() - Date.parse(f.t)) / 60000))); }
});

/* ---------- 時鐘 ---------- */
function tickClock() {
  const d = new Date();
  const c = $('#clk'); if (c) c.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const cd = $('#clk-d'); if (cd) cd.textContent = String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0') + ' ' + WKE[d.getDay()];
}

/* ---------- 開門：跑道進場燈 ---------- */
const Runway = {
  on: false, raf: 0,
  start() {
    const cv = $('#runway'); if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const fit = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
    fit(); addEventListener('resize', fit);
    const g = cv.getContext('2d'); this.on = true; const t0 = performance.now(); let last = 0;
    const draw = (now) => {
      if (!this.on) return;
      this.raf = requestAnimationFrame(draw);
      if (now - last < 33) return; last = now;
      const W = cv.width, H = cv.height, vx = W / 2, vy = H * 0.34, t = (now - t0) / 1000;
      g.fillStyle = '#030405'; g.fillRect(0, 0, W, H);
      const sky = g.createLinearGradient(0, 0, 0, vy); sky.addColorStop(0, '#05070b'); sky.addColorStop(1, '#0d1420'); g.fillStyle = sky; g.fillRect(0, 0, W, vy);
      g.fillStyle = 'rgba(255,190,90,.06)'; g.fillRect(0, vy - 2 * dpr, W, 3 * dpr);
      for (let i = 0; i < 26; i++) {
        const z = ((i / 26) + (t * 0.18) % (1 / 26)) % 1; const p = z * z; const y = vy + (H - vy) * p; const spread = (W * 0.08) + (W * 0.9) * p; const r = (0.6 + 3.2 * p) * dpr;
        g.globalAlpha = 0.25 + 0.75 * p;
        g.fillStyle = '#ffd56a'; g.beginPath(); g.arc(vx - spread / 2, y, r, 0, 7); g.arc(vx + spread / 2, y, r, 0, 7); g.fill();
        if (i % 2 === 0) { g.fillStyle = '#eaf2ff'; g.fillRect(vx - r * 0.6, y - r * 2.4, r * 1.2, r * 4.8); }
      }
      const rp = (t * 1.25) % 1; const rz = rp * rp; const ry = vy + (H - vy) * rz; const rr = (2 + 9 * rz) * dpr;
      g.globalAlpha = 1 - rp * 0.6; const gr = g.createRadialGradient(vx, ry, 0, vx, ry, rr * 4); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(vx, ry, rr * 4, 0, 7); g.fill();
      g.globalAlpha = 1;
    };
    this.raf = requestAnimationFrame(draw);
  },
  stop() { this.on = false; cancelAnimationFrame(this.raf); },
};

/* ---------- 開場：翻牌大字＋鈴聲＋廣播 ---------- */
App.intro = async function (day, replay) {
  const el = $('#intro');
  const d = new Date(day.date + 'T00:00:00');
  const no = D.index.days.find((x) => x.date === day.date);
  el.innerHTML = '<div class="il">PZ TERMINAL · DAY ' + String(no ? no.no : 1).padStart(3, '0') + '</div><div class="ib">' + Flap.html('轉機', 'big') + Flap.html('TURNAROUND', 'mid amber') + Flap.html(fmtDate(day.date) + ' ' + WKE[d.getDay()], 'mid') + '</div>' +
    '<div class="il" style="color:#c8d0da">' + (isStale(day.date) ? '最新 ' : '今日 ') + day.flights.length + ' 班航班' + (day.inspection ? '・1 架進廠檢修' : '') + '</div>' +
    (reduced() ? '' : introBoardHtml(day)) + '<button class="skip">點一下跳過</button>';
  el.hidden = false; el.classList.remove('out');
  let done = false;
  const finish = () => {
    if (done) return; done = true;
    el.classList.add('out'); setTimeout(() => { el.hidden = true; el.innerHTML = ''; }, 460);
    Snd.music(true);
    if (S.settings.announce) setTimeout(() => announce(day), 500);
  };
  el.onclick = finish;
  Snd.chime();
  Flap.run($('.ib', el), { min: 3, max: 7, step: 55, dur: 80 });
  // 2026/11/18：接著今天的出發看板一列一列翻上來，最後一架飛機掠過看板
  const bd = $('.ixb', el);
  if (bd) {
    setTimeout(() => { if (done) return; el.classList.add('boarded'); Flap.run(bd, { min: 2, max: 5, step: 26, dur: 66 }); }, 1900);
    setTimeout(() => { if (done) return; bd.classList.add('fly'); Snd.jet(); haptic(30); }, 3900);
  }
  setTimeout(finish, reduced() ? 600 : bd ? 5400 : 3300);
};

/* ---------- 開機 ---------- */
async function boot() {
  document.documentElement.classList.toggle('reduce', reduced());
  tickClock(); setInterval(tickClock, 10000);
  Sync.mark();
  const skipGate = /[?&]enter=1/.test(location.search);
  if (!skipGate) Runway.start();
  let loadErr = null;
  const loading = App.load().catch((e) => { loadErr = e; });
  Cloud.init(); Voice.init(); Tower.init();
  const enter = async (gesture) => {
    if (App.entered) return; App.entered = true;
    if (gesture) {
      Snd.init();
      try { if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch (e) { /* 解鎖語音 */ }
      haptic(20);
    }
    await loading;
    if (loadErr || !D.index) { $('#gate-note').textContent = '航班資料讀不到，請確認網路後重新打開'; App.entered = false; Snd.beep(false); return; }
    $('#app').removeAttribute('aria-hidden');
    route();
    const g = $('#gate'); g.classList.add('out'); setTimeout(() => { g.remove(); Runway.stop(); }, 650);
    const today = D.days[D.index.latest];
    if (today && (S.introDay !== D.index.latest || (S.introRev || 0) < INTRO_REV) && !skipGate) { S.introDay = D.index.latest; S.introRev = INTRO_REV; save(); App.intro(today); }
    else { Snd.music(true); }
    App.badges();
    setTimeout(checkFlight, 1500);
  };
  $('#gate-go').addEventListener('click', () => enter(true));
  $('#gate').addEventListener('click', (e) => { if (!e.target.closest('#gate-go')) enter(true); });
  if (skipGate) enter(false);
  App.checkInbox(); Sync.flush();
  setInterval(() => { if (!document.hidden) { Sync.flush(); App.checkInbox(); } }, 5 * 60e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { tickClock(); Sync.flush(); App.checkInbox(); App.freshen(); if (App.entered) { checkFlight(); App.refresh(true); } } });
  addEventListener('pageshow', (e) => { if (e.persisted && App.entered) checkFlight(); });
  addEventListener('online', () => { Sync.flush(); Sync.mark(); });
  if (IS_WEB && 'serviceWorker' in navigator) { try { navigator.serviceWorker.register('sw.js'); } catch (e) { /* 沒有離線 */ } }
}
window.App = App;
boot();

/* ---------- 換新版（2026/11/18）----------
   加到主畫面的 App 切回來不會重新載入，所以回到 App 時看一下網站上的 ver.json：已經是新版就重新載入
   （剛切回來、沒在打字、沒開著東西才自動換；不然頂端出一顆「有新版本・點一下更新」）。一分鐘最多看一次；
   自動重新載入之後 60 秒內不再自動換（網站快取還沒換完時不會一直重整）。 */
const Fresh = {
  at: 0, busy: false, shown: false, hid: 0,
  async check(back) {
    if (!IS_WEB || this.busy || !navigator.onLine) return;
    const now = Date.now(); if (now - this.at < 60e3) return; this.at = now; this.busy = true;
    try {
      const r = await fetch('ver.json?t=' + now, { cache: 'no-store' }); if (!r.ok) return;
      const j = await r.json(); if (!j || !j.v || j.v === VERSION) return;
      let last = 0; try { last = +sessionStorage.getItem('freshAt') || 0; } catch (e) { /* 無痕模式 */ }
      const typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (back && !typing && (!$('#pages .page') && $('#sheet').hidden !== false && !$('#intro:not([hidden])')) && now - last > 60e3) { this.reload(); return; }
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
