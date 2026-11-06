// 介面：頂部資訊、操作台、搖桿、開獎卡、陳列櫃、設定、教學
import { MACHINES, PRIZES, PRIZE, RARITY, RARITY_ORDER, SERIES, RANKS, rankOf, ECON, seriesPrizes, MISSIONS } from './data.js';
import { thumb } from './showcase.js';

const $ = (s, r = document) => r.querySelector(s);
const h = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
const fmt = (n) => n.toLocaleString('en-US');
const pad = (n, k = 4) => String(n).padStart(k, '0');

export class UI {
  constructor(game) {
    this.g = game;
    this.hudTop = 110; this.hudBottom = 220;
    this.stick = { x: 0, y: 0 };
    this.keys = new Set();
    this.coachEl = null;
  }
  fatal(msg) {
    const b = $('#boot');
    if (b) { b.classList.remove('out'); $('.s', b).innerHTML = msg + '<br><br>請重新整理頁面再試一次。'; }
  }
  ready() {
    setTimeout(() => $('#boot').classList.add('out'), 250);
    setTimeout(() => $('#boot').remove(), 900);
    setTimeout(() => this.coach('coin'), 1200);
    if (this.g.P.flags.opening === 1) { this.g.P.flags.opening = 2; this.g.saveProfile(); setTimeout(() => this.toast(`開幕特惠：星砂扭蛋機的保夾燈先幫你點亮 ${ECON.openingMeter} 格`, 'gold'), 1600); }
  }

  bind() {
    const g = this.g;
    // 第一次觸碰：開聲音
    const unlock = () => { g.snd.unlock(); };
    addEventListener('pointerdown', unlock, { capture: true });
    addEventListener('keydown', unlock, { capture: true });
    $('#bCoin').addEventListener('click', () => { g.insertCoin(); this.dismissCoach('coin'); });
    $('#bPrev').addEventListener('click', () => g.go(-1));
    $('#bNext').addEventListener('click', () => g.go(1));
    $('#bList').addEventListener('click', () => { g.snd.click(); this.openList(); });
    $('#bTip').addEventListener('click', () => { g.snd.click(); this.openTip(); });
    $('#bCol').addEventListener('click', () => { g.snd.click(); this.openCollection(); });
    $('#bMis').addEventListener('click', () => { g.snd.click(); this.openMissions(); });
    $('#bSet').addEventListener('click', () => { g.snd.click(); this.openSettings(); });
    $('#tok').addEventListener('click', () => { g.snd.click(); this.openWallet(); });
    $('#rank').addEventListener('click', () => { g.snd.click(); this.openRank(); });
    $('#vFront').addEventListener('click', () => this.view('front'));
    $('#vSide').addEventListener('click', () => this.view('side'));
    const drop = $('#drop');
    drop.addEventListener('pointerdown', (e) => { e.preventDefault(); g.dropClaw(); this.dismissCoach('drop'); });
    this.bindJoy();
    this.bindScene();
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (g.mode === 'reveal' && (e.code === 'Space' || e.code === 'Enter')) { this.revealTap(); return; }
      if (e.code === 'Space' || e.code === 'Enter') { if (g.turn) g.dropClaw(); else if (g.mode === 'shop' && !this.modal) g.insertCoin(); }
      if (g.turn) return;
      if (e.code === 'BracketLeft' || e.code === 'KeyQ' && !g.turn) g.go(-1);
      if (e.code === 'BracketRight' || e.code === 'KeyE' && !g.turn) g.go(1);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }
  bindJoy() {
    const el = $('#joy'), k = $('.k', el);
    let id = null, cx = 0, cy = 0, R = 50;
    const set = (x, y) => {
      const dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy);
      const m = Math.min(1, L / R), ux = L ? dx / L : 0, uy = L ? dy / L : 0;
      const dead = 0.12;
      const mm = m < dead ? 0 : (m - dead) / (1 - dead);
      this.stick.x = ux * mm; this.stick.y = uy * mm;
      k.style.transform = `translate(${ux * Math.min(L, R)}px,${uy * Math.min(L, R)}px)`;
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      id = e.pointerId; el.setPointerCapture(id);
      const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; R = r.width * 0.36;
      set(e.clientX, e.clientY);
      this.dismissCoach('joy');
    });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e.clientX, e.clientY); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; this.stick.x = this.stick.y = 0; k.style.transform = ''; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  bindScene() {
    const g = this.g, el = g.app;
    const pts = new Map();
    let pinch = 0, last = null;
    el.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
      last = { x: e.clientX, y: e.clientY };
      if (g.mode === 'reveal') this.revealTap();
    });
    el.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId);
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (g.mode !== 'shop') return;
      const C = g.cam;
      if (pts.size >= 2) {
        const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) C.tzoom = Math.min(1.25, Math.max(0.5, C.tzoom * (pinch / d)));
        pinch = d; return;
      }
      C.tyaw = Math.max(-1.45, Math.min(1.45, C.tyaw - dx * 0.006));
      C.tpitch = Math.max(0.08, Math.min(1.2, C.tpitch + dy * 0.004));
      this.syncViewChips();
    });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => { if (g.mode !== 'shop') return; e.preventDefault(); g.cam.tzoom = Math.min(1.25, Math.max(0.5, g.cam.tzoom * (1 + e.deltaY * 0.001))); }, { passive: false });
  }
  view(v) {
    const C = this.g.cam;
    this.g.snd.click();
    if (v === 'front') { C.tyaw = 0; C.tpitch = 0.36; }
    else { C.tyaw = 1.32; C.tpitch = 0.26; this.dismissCoach('side'); }
    this.syncViewChips();
  }
  syncViewChips() {
    const C = this.g.cam;
    $('#vFront').classList.toggle('on', Math.abs(C.tyaw) < 0.3);
    $('#vSide').classList.toggle('on', Math.abs(C.tyaw) > 1.0);
  }
  stickVec() {
    let x = this.stick.x, y = this.stick.y;
    const K = this.keys;
    if (K.has('ArrowLeft') || K.has('KeyA')) x -= 1;
    if (K.has('ArrowRight') || K.has('KeyD')) x += 1;
    if (K.has('ArrowUp') || K.has('KeyW')) y -= 1;
    if (K.has('ArrowDown') || K.has('KeyS')) y += 1;
    const L = Math.hypot(x, y); if (L > 1) { x /= L; y /= L; }
    return { x, y };
  }

  // ---------------- 頂部 ----------------
  refreshAll() { this.setTokens(); this.setRank(); this.refreshMachine(); this.layout(); this.updateColDot(); this.updateMissionDot(); }
  updateMissionDot() {
    const d = $('#bMis .dot'), M = this.g.P.missions;
    if (!d || !M) return;
    d.classList.toggle('hide', !M.list.some((m) => { const def = MISSIONS.find((x) => x.id === m.id); return def && m.n >= def.goal && !m.claimed; }));
  }
  openMissions() {
    const g = this.g;
    if (!g.P.missions || g.P.missions.day !== g.P.day) g.rollMissions();
    const M = g.P.missions;
    const now = new Date(), end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const left = Math.max(0, Math.floor((end - now) / 60000));
    const rows = M.list.map((m) => {
      const def = MISSIONS.find((x) => x.id === m.id); if (!def) return '';
      const ok = m.n >= def.goal;
      return `<div class="mis ${m.claimed ? 'done' : ''}"><div class="tx"><div class="nm">${def.text}</div><div class="pg"><i style="width:${Math.min(100, (m.n / def.goal) * 100)}%"></i></div></div>
        <div class="rw">＋${def.reward}</div><button data-a="c:${def.id}" ${ok && !m.claimed ? '' : 'disabled'}>${m.claimed ? '已領' : ok ? '領取' : `${m.n}/${def.goal}`}</button></div>`;
    }).join('');
    this.sheet(`<div class="card"><h2>今日任務<small>DAILY</small></h2><p style="color:var(--muted);font-size:13px">每天換一批，${Math.floor(left / 60)} 小時 ${left % 60} 分後更新。</p>${rows}
      <div class="btns"><button class="btn main" data-a="close">好</button></div></div>`, (a) => {
      if (a.startsWith('c:')) { const v = g.claimMission(a.slice(2)); if (v) this.toast(`領到 ${v} 枚代幣`, 'gold'); this.openMissions(); return true; }
    });
  }
  setTokens() {
    const P = this.g.P;
    const el = $('#tok .v');
    if (!el) return;
    const prev = +el.textContent;
    el.textContent = P.tokens;
    if (P.tokens > prev && prev) { $('#tok').classList.remove('bump'); void $('#tok').offsetWidth; $('#tok').classList.add('bump'); }
    this.refreshCoin();
  }
  setRank() {
    const P = this.g.P, r = rankOf(P.xp);
    const el = $('#rank .nm'); if (!el) return;
    el.textContent = RANKS[r].name;
    const a = RANKS[r].xp, b = RANKS[r + 1]?.xp;
    $('#rank .bar i').style.width = b ? `${((P.xp - a) / (b - a)) * 100}%` : '100%';
  }
  refreshMachine() {
    const g = this.g, i = g.active, def = MACHINES[i];
    $('#minfo .mn').innerHTML = `${def.name}<small>${def.en}</small>`;
    const m = $('#meter');
    m.style.setProperty('--mc', def.theme.trim);
    if (def.meter) {
      m.classList.remove('hide');
      const n = g.meterOf(def);
      $('.bulbs', m).innerHTML = Array.from({ length: def.meter }, (_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('');
      const pw = g.isPower(def);
      m.classList.toggle('power', pw);
      $('.lbl', m).textContent = pw ? '強爪' : '保夾';
      $('b', m).textContent = pw ? 'POWER!' : `${n}/${def.meter}`;
    } else {
      m.classList.remove('power');
      $('.bulbs', m).innerHTML = '';
      $('.lbl', m).textContent = '推落台';
      $('b', m).textContent = '用推的';
    }
    $('#bPrev').classList.toggle('off', i === 0);
    $('#bNext').classList.toggle('off', i === MACHINES.length - 1);
    this.refreshCoin();
  }
  refreshCoin() {
    const g = this.g, def = MACHINES[g.active], b = $('#bCoin');
    if (!b) return;
    const lock = !g.unlocked(g.active);
    b.classList.toggle('locked', lock);
    b.classList.toggle('power', !lock && g.isPower(def));
    if (lock) b.innerHTML = `<span>🔒 升到「${RANKS[def.unlock].name}」解鎖</span>`;
    else b.innerHTML = `<span class="lb">${g.isPower(def) ? '強爪' : '投幣'}</span><span class="coin">S</span><span class="c">${def.cost}</span>`;
  }
  layout() {
    const top = $('#minfo'), deck = $('#deck');
    if (!top || !deck) return;
    const r1 = top.getBoundingClientRect(), r2 = deck.getBoundingClientRect();
    this.hudTop = r1.bottom + 4;
    this.hudBottom = innerHeight - r2.top + 4;
    if (innerWidth > innerHeight && innerHeight <= 600) { this.hudBottom = 8; this.hudTop = Math.min(this.hudTop, 64); }
  }
  frame(dt, t) {
    const left = this.g.regenLeft();
    const rg = $('#tok .rg');
    if (rg) rg.textContent = left < 0 ? '' : `+1 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (this.revealTapT) this.revealTapT -= dt;
  }

  // ---------------- 一局 ----------------
  onTurnStart(power) {
    $('#idle').classList.add('hide'); $('#aim').classList.remove('hide'); $('#busy').classList.add('hide');
    this.setTokens(); this.refreshMachine();
    this.setTimer(1);
    requestAnimationFrame(() => this.layout());
    if (power) this.big('強爪！', 'win');
    setTimeout(() => this.coach('joy'), 300);
  }
  onDrop() {
    $('#aim').classList.add('hide'); $('#busy').classList.remove('hide');
    this.status('下爪中…');
    this.clearCoach();
  }
  onTurnEnd(won) {
    $('#idle').classList.remove('hide'); $('#aim').classList.add('hide'); $('#busy').classList.add('hide');
    this.refreshMachine(); this.setTokens();
  }
  setTimer(f) {
    const c = $('#drop .fg'); if (!c) return;
    c.style.strokeDashoffset = String(339.3 * (1 - f));
    const sec = Math.max(0, Math.ceil(f * 25));
    $('#drop .tm').textContent = sec;
    $('#drop').classList.toggle('urgent', sec <= 5);
  }
  status(text, kind = '') { const s = $('#status'); s.textContent = text; s.className = kind; }
  big(text, kind) {
    const s = $('#bigt span');
    s.className = ''; void s.offsetWidth;
    s.textContent = text; s.className = kind + ' go';
  }
  flash(col) {
    const f = $('#flash');
    f.style.transition = 'none'; f.style.background = `radial-gradient(circle at 50% 40%, ${col}, transparent 70%)`; f.style.opacity = '0.75';
    requestAnimationFrame(() => { f.style.transition = 'opacity .9s'; f.style.opacity = '0'; });
  }
  toast(text, kind = '') {
    const box = $('#toasts'); if (!box) return;
    const t = h(`<div class="toast ${kind}"></div>`); t.textContent = text; box.appendChild(t);
    this.g.snd.toast();
    setTimeout(() => t.remove(), 3200);
  }
  rankUp(r, reward) {
    const def = MACHINES.find((m) => m.unlock === r);
    this.big(`升段！${RANKS[r].name}`, 'win');
    this.toast(`段位升到「${RANKS[r].name}」＋${reward} 代幣`, 'gold');
    if (def) setTimeout(() => this.toast(`新機台解鎖：${def.name}`, 'gold'), 700);
    this.setTokens(); this.setRank(); this.refreshMachine();
  }
  noTokens() {
    const g = this.g, left = g.regenLeft();
    const dupes = Object.entries(g.P.col).filter(([, c]) => c.n > 1).length;
    this.sheet(`<div class="card"><h2>代幣不夠了<small>OUT OF COINS</small></h2>
      <p>代幣低於 ${ECON.regenCap} 枚時，每 ${ECON.regenEvery} 秒自動補 1 枚${left >= 0 ? `（下一枚 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}）` : ''}。每天第一次打開還會送 ${ECON.daily} 枚。</p>
      ${dupes ? `<p>你有 ${dupes} 種重複的獎品，可以到陳列櫃換成代幣。</p>` : ''}
      <div class="btns">${dupes ? '<button class="btn goldb" data-a="col">去陳列櫃</button>' : ''}<button class="btn main" data-a="close">知道了</button></div></div>`, (a) => { if (a === 'col') this.openCollection(); });
  }

  // ---------------- 開獎 ----------------
  openReveal(info) {
    this.closeSheet();
    let el = $('#rv');
    if (!el) { el = h('<div id="rv"><div class="tap hide">點一下打開</div><div class="cardr"></div></div>'); document.body.appendChild(el); el.addEventListener('pointerdown', (e) => { if (e.target.closest('.cert')) return; this.revealTap(); }); }
    el.classList.remove('hide');
    $('.cardr', el).innerHTML = '';
    $('.tap', el).classList.add('hide');
    $('#ui').classList.add('hide');
    this.revealTapT = 0;
  }
  tapHint(on) { const t = $('#rv .tap'); if (t) { t.classList.toggle('hide', !on); t.textContent = this.g.reveal.boxObj ? '點一下拆盒' : '點一下打開'; } }
  revealTap() {
    const R = this.g.reveal;
    if (this.revealTapT > 0) return;
    if (R.phase === 'enter' || R.phase === 'bounce') { R.shell.position.y = R.sz / 2; R.phase = 'idle'; }
    if (R.phase === 'idle') { if (R.open()) { this.tapHint(false); this.revealTapT = 0.3; } }
  }
  showCard(info, pid, final) {
    const pz = PRIZE[pid], r = RARITY[pz.rarity], s = SERIES[pz.series];
    const it = info.item;
    const box = $('#rv .cardr');
    const serial = final ? info.serial : (r.ed ? 1 + Math.floor(Math.random() * r.ed) : 0);
    const dup = final && info.dupes > 0;
    const isHid = pz.rarity === 'HID';
    let extra = '';
    if (final && isHid && info.upgraded) extra = '<div class="extra">隱藏版！這一顆在打開的瞬間變身了。</div>';
    else if (final && isHid) extra = '<div class="extra">黑金蛋開出了隱藏版！</div>';
    if (final && info.complete) extra += `<div class="extra">「${SERIES[info.complete].name}」系列收齊！＋${ECON.seriesReward} 代幣</div>`;
    const card = h(`<div class="cert ${isHid ? 'hid' : ''}" style="--rc:${r.color}">
      <div class="rr"><span class="rbig">${pz.rarity === 'HID' ? 'SECRET' : pz.rarity}</span><span class="rname">${r.name}</span>${final && info.isNew ? '<span class="new">NEW</span>' : ''}</div>
      <h3>${pz.name}</h3><div class="en">${pz.en.toUpperCase()} · ${s.name}</div>
      <div class="ln">${pz.line}</div>
      <div class="meta">
        <div>收藏市價<b>NT$ ${fmt(pz.value)}</b></div>
        <div>${r.ed ? `限量 ${fmt(r.ed)}・你的編號` : '版本'}<b class="${r.ed ? '' : 'zh'}">${r.ed ? 'No.' + pad(serial, String(r.ed).length) : '一般版'}</b></div>
      </div>
      ${extra}
      ${final ? `<div class="btns">${dup ? `<button class="btn" data-a="rec">換成代幣 ＋${r.recycle}</button>` : ''}<button class="btn main" data-a="ok">${this.g.revealList.length ? '下一個' : '收下'}</button></div>` : ''}
    </div>`);
    box.innerHTML = ''; box.appendChild(card);
    card.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (!a) return;
      e.stopPropagation();
      if (a === 'rec') { const v = this.g.recycle(pid); if (v) this.toast(`換到 ${v} 枚代幣`, 'gold'); }
      this.g.snd.click();
      this.g.reveal.finish();
    });
  }
  closeReveal() {
    const el = $('#rv'); if (el) el.classList.add('hide');
    $('#ui').classList.remove('hide');
    this.refreshAll();
  }

  // ---------------- 面板 ----------------
  sheet(html, onAction) {
    this.closeSheet();
    const s = h(`<div class="sheet">${html}</div>`);
    document.body.appendChild(s);
    this.modal = s;
    s.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (e.target === s || a === 'close') { this.g.snd.click(); this.closeSheet(); return; }
      if (a) { this.g.snd.click(); const keep = onAction?.(a, e); if (!keep) this.closeSheet(); }
    });
    return s;
  }
  closeSheet() { if (this.modal) { this.modal.remove(); this.modal = null; } }
  openList() {
    const g = this.g, i = g.active, def = MACHINES[i], st = g.mstate[i];
    const count = {}; let blk = 0;
    for (const it of st.items) { if (it.black) blk++; else count[it.prize] = (count[it.prize] || 0) + 1; }
    const total = st.items.length || 1;
    const pool = def.series === 'X' ? PRIZES.filter((p) => p.rarity !== 'N') : seriesPrizes(def.series);
    const rows = pool.filter((p) => p.rarity !== 'HID' && (def.series !== 'X' || count[p.id])).sort((a, b) => RARITY[b.rarity].order - RARITY[a.rarity].order).map((p) => `
      <div class="pi"><img src="${thumb(p.id)}" alt=""><div class="tx"><div class="nm"><span class="rt ${p.rarity}">${p.rarity}</span>${p.name}</div><div class="sb">市價 NT$ ${fmt(p.value)}</div></div><div class="ct">×${count[p.id] || 0}</div></div>`).join('');
    const unit = def.kind === 'shelf' ? '盒' : '顆';
    this.sheet(`<div class="card"><h2>${def.name}<small>${def.en}</small></h2>
      <p>${def.tip}</p><p style="color:var(--muted);font-size:13px">機台裡現在有 ${st.items.length} ${unit}・每次 ${def.cost} 代幣${def.meter ? `・保夾 ${def.meter} 次` : ''}</p>
      <div class="plist">
        ${blk ? `<div class="pi"><div style="width:52px;height:52px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3c0,#e3b44a 30%,#1a1408 70%);box-shadow:0 0 16px rgba(255,180,60,.6)"></div><div class="tx"><div class="nm"><span class="rt HID">BLK</span>黑金蛋</div><div class="sb">一定是傳說，三分之一機率是隱藏版</div></div><div class="ct">×${blk}</div></div>` : ''}
        ${rows}
        <div class="pi"><div style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;font-family:var(--pop);font-size:30px;color:#ffb85a">?</div><div class="tx"><div class="nm"><span class="rt HID">SECRET</span>隱藏版</div><div class="sb">每一${unit}打開時，都有約 1/150 的機率變成隱藏版</div></div></div>
      </div>
      <div class="btns"><button class="btn main" data-a="close">好</button></div></div>`);
  }
  openTip() {
    this.sheet(`<div class="card"><h2>怎麼玩<small>HOW TO PLAY</small></h2>
      <p><b>投幣</b>之後，用左下的搖桿把爪子移到目標正上方，按右下的<b>下爪</b>。</p>
      <p>爪子會張開、下降、收爪、上升。<b>到頂的那一瞬間爪子會鬆一點</b>——抓得歪就會在這裡掉下來。</p>
      <p>畫面可以拖曳轉角度。切到<b>側面</b>看前後距離，是老手都會做的事。</p>
      <p><b>保夾燈</b>：沒夾到的每一局都會亮一格；全亮時，下一爪是<b>強爪</b>，到頂也不會鬆。夾到任何獎品，或強爪用掉了，燈就歸零。</p>
      <p>獎品被推到出口邊上不會跑掉——下一次就更接近了。</p>
      <div class="btns"><button class="btn main" data-a="close">開始夾</button></div></div>`);
  }
  openWallet() {
    const g = this.g, left = g.regenLeft();
    this.sheet(`<div class="card"><h2>代幣 ${g.P.tokens}<small>COINS</small></h2>
      <p>低於 ${ECON.regenCap} 枚時每 ${ECON.regenEvery} 秒補 1 枚${left >= 0 ? `，下一枚 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : ''}。</p>
      <p>每天第一次打開送 ${ECON.daily} 枚；段位升級、收齊一整個系列也會送。重複的獎品可以在陳列櫃換成代幣。</p>
      <div class="btns"><button class="btn main" data-a="close">好</button></div></div>`);
  }
  openRank() {
    const P = this.g.P, r = rankOf(P.xp), nx = RANKS[r + 1];
    const s = P.stats;
    this.sheet(`<div class="card"><h2>${RANKS[r].name}<small>RANK ${r + 1}</small></h2>
      <p>${nx ? `再 ${nx.xp - P.xp} 點經驗升到「${nx.name}」。` : '已經是最高段位了。'}每投一次 +${ECON.playXp}，夾到的獎品越稀有加越多。</p>
      <div class="cert" style="--rc:#3fe0ff;margin-top:8px"><div class="meta">
        <div>投幣次數<b>${s.plays}</b></div><div>夾到<b>${s.wins}</b></div>
        <div>差一點<b>${s.near}</b></div><div>一夾多<b>${s.multi}</b></div>
        <div>傳說<b>${s.ssr}</b></div><div>隱藏版<b>${s.hidden}</b></div>
      </div></div>
      <p style="font-size:13px;color:var(--muted)">${MACHINES.map((m) => `${m.name}：${RANKS[m.unlock].name}`).join('　')}</p>
      <div class="btns"><button class="btn main" data-a="close">好</button></div></div>`);
  }
  openSettings() {
    const g = this.g, S = g.P.settings;
    const s = this.sheet(`<div class="card"><h2>設定<small>SETTINGS</small></h2>
      <div class="row2"><span>音效</span><button class="tog ${S.sfx ? 'on' : ''}" data-a="sfx"></button></div>
      <div class="row2"><span>背景音樂</span><button class="tog ${S.music ? 'on' : ''}" data-a="music"></button></div>
      <div class="row2"><span>畫質</span><div class="seg">${['auto', 'high', 'mid', 'low'].map((q) => `<button data-a="q:${q}" class="${S.quality === q ? 'on' : ''}">${{ auto: '自動', high: '高', mid: '中', low: '低' }[q]}</button>`).join('')}</div></div>
      <div class="row2"><span>操作教學</span><button class="chip" data-a="tut">重新提示</button></div>
      <p style="font-size:12px;color:var(--dim);margin-top:12px">差一點 SO CLOSE · v1.0</p>
      <div class="btns"><button class="btn main" data-a="close">完成</button></div></div>`, (a) => {
      if (a === 'sfx') { S.sfx = !S.sfx; g.snd.setOn(S.sfx); }
      else if (a === 'music') { S.music = !S.music; g.snd.setMusic(S.music); }
      else if (a.startsWith('q:')) { S.quality = a.slice(2); if (S.quality !== 'auto') g.R.setQuality(S.quality); else g.R.setQuality('high'); }
      else if (a === 'tut') { g.P.flags = {}; g.saveProfile(); this.closeSheet(); this.coach('coin'); return false; }
      g.saveProfile();
      this.openSettings();
      return true;
    });
    return s;
  }

  // ---------------- 陳列櫃 ----------------
  updateColDot() {
    const d = $('#bCol .dot');
    if (d) d.classList.toggle('hide', !Object.entries(this.g.P.col).some(([, c]) => c.n && !c.seen));
  }
  openCollection(series) {
    const g = this.g;
    this.closeSheet();
    if (g.turn) return;
    g.mode = 'collection';
    let el = $('#col');
    if (!el) { el = h('<div id="col"></div>'); document.body.appendChild(el); }
    el.classList.remove('hide');
    $('#ui').classList.add('hide');
    this.colSeries = series || this.colSeries || 'A';
    this.renderCollection();
  }
  renderCollection() {
    const g = this.g, P = g.P, el = $('#col');
    const own = PRIZES.filter((p) => P.col[p.id]?.n);
    const value = own.reduce((s, p) => s + p.value * P.col[p.id].n, 0);
    const hid = PRIZES.filter((p) => p.rarity === 'HID');
    el.innerHTML = `<header><h1>陳列櫃<small>COLLECTION</small></h1><button class="ibtn" data-a="close" aria-label="關閉"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
      <div class="stats"><div>收集<b>${own.length}/${PRIZES.length}</b></div><div>隱藏版<b>${hid.filter((p) => P.col[p.id]?.n).length}/${hid.length}</b></div><div>收藏總值<b>NT$ ${value >= 1e6 ? (value / 1e6).toFixed(2) + 'M' : fmt(value)}</b></div></div>
      <div class="tabs">${Object.values(SERIES).map((s) => `<button data-s="${s.key}" class="${s.key === this.colSeries ? 'on' : ''}" style="--sc:${s.color}">${s.name}${P.series[s.key] ? ' ✦' : ''}</button>`).join('')}</div>
      <div class="grid"></div>`;
    const grid = $('.grid', el);
    const s = SERIES[this.colSeries];
    grid.appendChild(h(`<div class="sb">${s.blurb}　${seriesPrizes(s.key).filter((p) => P.col[p.id]?.n).length}/${seriesPrizes(s.key).length}</div>`));
    const list = seriesPrizes(s.key).sort((a, b) => RARITY[a.rarity].order - RARITY[b.rarity].order);
    const pending = [];
    for (const p of list) {
      const c = P.col[p.id], have = c && c.n > 0, r = RARITY[p.rarity];
      const isH = p.rarity === 'HID';
      const slot = h(`<div class="slot ${have ? 'own' : 'no'} ${isH ? 'hid' : ''}" style="--rc:${r.color}" data-p="${p.id}">
        ${!have && isH ? '<div class="q">?</div>' : '<img alt="">'}
        <span class="rt ${p.rarity}">${isH ? 'SECRET' : p.rarity}</span>${have ? `<span class="ct">×${c.n}</span>` : ''}
        <div class="nm">${have || !isH ? (have ? p.name : '？？？') : '隱藏版'}</div></div>`);
      grid.appendChild(slot);
      const img = $('img', slot);
      if (img) pending.push(() => { img.src = thumb(p.id, !have); });
    }
    // 縮圖分批產生，避免卡頓
    const run = () => { const f = pending.shift(); if (!f) return; f(); requestAnimationFrame(run); };
    requestAnimationFrame(run);
    el.onclick = (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'close') { g.snd.click(); this.closeCollection(); return; }
      const sb = e.target.closest('[data-s]');
      if (sb) { g.snd.click(); this.colSeries = sb.dataset.s; this.renderCollection(); return; }
      const sl = e.target.closest('.slot');
      if (sl) {
        const pid = sl.dataset.p;
        if (P.col[pid]?.n) { g.snd.soft(); this.openDetail(pid); }
        else { g.snd.deny(); this.toast(PRIZE[pid].rarity === 'HID' ? '隱藏版……只有在打開扭蛋的瞬間才會出現' : '還沒夾到這一個', 'warn'); }
      }
    };
  }
  closeCollection() {
    const g = this.g;
    $('#col')?.classList.add('hide');
    this.closeDetail();
    $('#ui').classList.remove('hide');
    g.mode = 'shop';
    this.updateColDot();
  }
  openDetail(pid) {
    const g = this.g, P = g.P, pz = PRIZE[pid], r = RARITY[pz.rarity], c = P.col[pid], s = SERIES[pz.series];
    c.seen = true; g.saveProfile();
    $('#col').classList.add('hide');
    g.showcase.open(pid);
    let el = $('#detail');
    if (!el) { el = h('<div id="detail"></div>'); document.body.appendChild(el); }
    el.classList.remove('hide');
    const best = c.serials.length ? Math.min(...c.serials) : 0;
    const d = new Date(c.first);
    el.innerHTML = `<div class="drag"></div><button class="ibtn back" data-a="back" aria-label="返回"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
      <div class="dl"><div class="cert ${pz.rarity === 'HID' ? 'hid' : ''}" style="--rc:${r.color}">
        <div class="rr"><span class="rbig">${pz.rarity === 'HID' ? 'SECRET' : pz.rarity}</span><span class="rname">${r.name}</span><span class="new" style="background:rgba(255,255,255,.1);box-shadow:none">×${c.n}</span></div>
        <h3>${pz.name}</h3><div class="en">${pz.en.toUpperCase()} · ${s.name}</div>
        <div class="ln">${pz.line}</div>
        <div class="meta">
          <div>收藏市價<b>NT$ ${fmt(pz.value)}</b></div>
          <div>${r.ed ? `限量 ${fmt(r.ed)}・最小編號` : '版本'}<b class="${r.ed ? '' : 'zh'}">${r.ed ? 'No.' + pad(best, String(r.ed).length) : '一般版'}</b></div>
          <div>第一次夾到<b class="zh">${d.getMonth() + 1} 月 ${d.getDate()} 日</b></div>
          <div>回收價<b>${r.recycle} 代幣</b></div>
        </div>
        <div class="btns">${c.n > 1 ? `<button class="btn" data-a="rec">換一個成代幣 ＋${r.recycle}</button>` : ''}<button class="btn main" data-a="back">返回陳列櫃</button></div>
      </div></div>`;
    const drag = $('.drag', el);
    let lx = null;
    drag.onpointerdown = (e) => { lx = e.clientX; drag.setPointerCapture(e.pointerId); };
    drag.onpointermove = (e) => { if (lx == null) return; g.showcase.drag(e.clientX - lx); lx = e.clientX; };
    drag.onpointerup = drag.onpointercancel = () => { lx = null; };
    el.onclick = (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'back') { g.snd.click(); this.closeDetail(); $('#col').classList.remove('hide'); this.renderCollection(); }
      if (a === 'rec') { const v = g.recycle(pid); if (v) { this.toast(`換到 ${v} 枚代幣`, 'gold'); this.openDetail(pid); } }
    };
  }
  closeDetail() { $('#detail')?.classList.add('hide'); this.g.showcase.close(); }

  // ---------------- 教學提示 ----------------
  coach(step) {
    const F = this.g.P.flags;
    const key = 'c_' + step;
    if (F[key]) return;
    const T = {
      coin: { el: '#bCoin', text: '投一枚代幣，開始夾。', dir: 'down' },
      joy: { el: '#joy', text: '推搖桿，把爪子移到扭蛋正上方。', dir: 'down' },
      side: { el: '#vSide', text: '切到「側面」看前後距離——老手都會這樣做。', dir: 'down' },
      drop: { el: '#drop', text: '對準了就按下爪。25 秒內要決定。', dir: 'down' },
      meter: { el: '#meter', text: '沒夾到也不虧：保夾燈亮一格。全亮時，下一爪是強爪。', dir: 'up' },
    }[step];
    if (!T) return;
    const target = $(T.el);
    if (!target || target.offsetParent === null) return;
    this.clearCoach();
    const b = h(`<div class="coach ${T.dir === 'down' ? 'down' : 'up'}">${T.text}<small>點一下關閉</small></div>`);
    document.body.appendChild(b);
    const r = target.getBoundingClientRect(), bw = Math.min(230, innerWidth - 24);
    b.style.maxWidth = bw + 'px';
    const bh = b.offsetHeight;
    let x = r.left + r.width / 2 - bw / 2; x = Math.max(12, Math.min(innerWidth - bw - 12, x));
    b.style.left = x + 'px';
    b.style.top = (T.dir === 'down' ? r.top - bh - 12 : r.bottom + 12) + 'px';
    b.style.setProperty('--ax', `${Math.max(12, Math.min(bw - 26, r.left + r.width / 2 - x - 7))}px`);
    b.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.dismissCoach(step); });
    this.coachEl = b; this.coachStep = step;
  }
  dismissCoach(step) {
    const F = this.g.P.flags;
    if (this.coachStep !== step) { F['c_' + step] = 1; return; }
    F['c_' + step] = 1;
    this.clearCoach();
    this.g.saveProfile();
    const next = { joy: 'side', side: 'drop' }[step];
    if (next && this.g.turn && this.g.turn.sim.state === 'aim') setTimeout(() => this.coach(next), 250);
  }
  clearCoach() { if (this.coachEl) { this.coachEl.remove(); this.coachEl = null; this.coachStep = null; } }
  coachAfterTurn() {
    const def = MACHINES[this.g.active];
    if (def.meter && this.g.meterOf(def) > 0) setTimeout(() => this.coach('meter'), 600);
  }
}
