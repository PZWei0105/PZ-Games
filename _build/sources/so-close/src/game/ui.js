// 介面：頂部資訊、操作台、搖桿、開獎卡、陳列櫃、設定、教學
import { MACHINES, MACHINE, RARITY, SERIES, SERIES_ORDER, CHAR, CHARS, VERSIONS, RANKS, rankOf, ECON, ODDS, MISSIONS, OLD_PRIZES, OLD_PRIZE, OLD_SERIES, seriesChars, charsOf, versionsOf, colKey, parseKey, valueOf, editionOf, starOf, STAR_AT, CAP_R, CAB_SKINS, CLAW_SKINS, ROOM_THEMES, NEED_TEXT, buddyLines } from './data.js';
import { CAPSULE_COLORS } from './models.js';
import { thumb } from './showcase.js';
import { THEMES } from './den.js';

const $ = (s, r = document) => r.querySelector(s);
const h = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
const fmt = (n) => n.toLocaleString('en-US');
const pad = (n, k = 4) => String(n).padStart(k, '0');
const pick = (a) => a[Math.floor(Math.random() * a.length)];

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
    const F = this.g.P.flags;
    if (F.opening === 1) { F.opening = 2; this.g.saveProfile(); setTimeout(() => this.toast(`開幕特惠：星砂扭蛋機的保夾燈先幫你點亮 ${ECON.openingMeter} 格`, 'gold'), 1600); }
    if (F.v2) {
      const tk = F.v2.tickets || 0; delete F.v2; F.v21 = 2; this.g.saveProfile();
      setTimeout(() => this.toast('改版：獎品換成 54 隻角色公仔！', 'gold'), 1500);
      setTimeout(() => this.toast(tk ? `以前夾到的留在陳列櫃「初代」分頁，重複的換成 ${tk} 張兌換券` : '以前夾到的獎品留在陳列櫃的「初代」分頁', 'gold'), 3600);
    } else if (F.v21 === 1) {
      F.v21 = 2; this.g.saveProfile();
      setTimeout(() => this.toast('新系列：機甲核心、街頭英雄、睡衣派對，27 隻新角色！', 'gold'), 1500);
      setTimeout(() => this.toast('新功能：收藏房間、夥伴、機台外觀（在陳列櫃和本台說明裡）', 'gold'), 3700);
    }
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
    $('#bKey').addEventListener('click', () => { g.snd.click(); this.openKeys(); });
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
      this.tapStart = pts.size === 1 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false } : null;
      if (g.mode === 'reveal') this.revealTap();
    });
    el.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId);
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const ts = this.tapStart;
      if (ts && ts.id === e.pointerId && Math.hypot(e.clientX - ts.x, e.clientY - ts.y) > 9) ts.moved = true;
      if (g.mode === 'room') { if (ts?.moved) g.den.drag(dx); return; }
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
    const up = (e) => {
      pts.delete(e.pointerId); if (pts.size < 2) pinch = 0;
      const ts = this.tapStart;
      if (ts && ts.id === e.pointerId && !ts.moved && performance.now() - ts.t < 450 && e.type === 'pointerup') this.sceneTap(e.clientX, e.clientY);
      if (ts && ts.id === e.pointerId) this.tapStart = null;
    };
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
  refreshAll() { this.setTokens(); this.setRank(); this.refreshMachine(); this.setKeys(); this.layout(); this.updateColDot(); this.updateMissionDot(); }
  setKeys() {
    const b = $('#bKey'); if (!b) return;
    const k = this.g.P.keys || 0, full = k >= ODDS.keys;
    b.classList.toggle('full', full);
    b.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="4.2"/><path d="M11 11l9 9M16 16l2.5-2.5M18.5 18.5l2-2"/></svg>${full ? '開寶箱' : `${k}/${ODDS.keys}`}`;
  }
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
    const gold = !lock && !!g.P.goldShot[def.id];
    b.classList.toggle('power', !lock && !gold && g.isPower(def));
    b.classList.toggle('gold', gold);
    if (lock) b.innerHTML = `<span>🔒 升到「${RANKS[def.unlock].name}」解鎖</span>`;
    else if (gold) b.innerHTML = `<span class="lb">黃金一夾</span><span class="c">FREE</span>`;
    else b.innerHTML = `<span class="lb">${g.isPower(def) ? '強爪' : '投幣'}</span><span class="coin">S</span><span class="c">${def.cost}</span>`;
  }
  layout() {
    this.layoutRoom?.();
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
  onTurnStart(power, gold) {
    $('#idle').classList.add('hide'); $('#aim').classList.remove('hide'); $('#busy').classList.add('hide');
    this.setTokens(); this.refreshMachine();
    this.setTimer(1);
    requestAnimationFrame(() => this.layout());
    if (gold) this.big('黃金一夾！', 'win'); else if (power) this.big('強爪！', 'win');
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
    const defs = MACHINES.filter((m) => m.unlock === r);
    this.big(`升段！${RANKS[r].name}`, 'win');
    this.toast(`段位升到「${RANKS[r].name}」＋${reward} 代幣`, 'gold');
    if (defs.length) setTimeout(() => this.toast(`新機台解鎖：${defs.map((d) => d.name).join('、')}`, 'gold'), 700);
    this.setTokens(); this.setRank(); this.refreshMachine();
  }
  noTokens() {
    const g = this.g, left = g.regenLeft(), tk = g.P.tickets || 0, E = ECON.ticketToTokens;
    this.sheet(`<div class="card"><h2>代幣不夠了<small>OUT OF COINS</small></h2>
      <p>代幣低於 ${ECON.regenCap} 枚時，每 ${ECON.regenEvery} 秒自動補 1 枚${left >= 0 ? `（下一枚 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}）` : ''}。每天第一次打開還會送 ${ECON.daily} 枚。</p>
      ${tk >= E.cost ? `<p>你有 ${tk} 張兌換券，可以到兌換櫃台用 ${E.cost} 張換 ${E.tokens} 枚代幣。</p>` : ''}
      <div class="btns">${tk >= E.cost ? '<button class="btn goldb" data-a="ctr">去兌換櫃台</button>' : ''}<button class="btn main" data-a="close">知道了</button></div></div>`, (a) => { if (a === 'ctr') { this.openCounter(); return true; } });
  }

  // ---------------- 開獎 ----------------
  openReveal(info) {
    this.closeSheet();
    let el = $('#rv');
    if (!el) { el = h('<div id="rv"><div class="banner"><span></span></div><div class="tap hide">點一下打開</div><div class="cardr"></div></div>'); document.body.appendChild(el); el.addEventListener('pointerdown', (e) => { if (e.target.closest('.cert')) return; this.revealTap(); }); }
    el.classList.remove('hide');
    $('.cardr', el).innerHTML = '';
    $('.tap', el).classList.add('hide');
    $('.banner span', el).className = '';
    $('#ui').classList.add('hide');
    this.revealTapAt = 0;
    this.clearCoach();
  }
  tapHint(on, text) { const t = $('#rv .tap'); if (t) { t.classList.toggle('hide', !on); if (text) t.textContent = text; } }
  revealTap() {
    const now = performance.now();
    if (now - (this.revealTapAt || 0) < 280) return;
    if (this.g.reveal.tap()) this.revealTapAt = now;
  }
  revealBanner(text, kind = '') {
    const s = $('#rv .banner span'); if (!s) return;
    s.className = ''; void s.offsetWidth;
    s.textContent = text; s.className = kind + ' go';
  }
  // 證書卡：final＝最後的結果（有按鈕、加碼說明）
  showCard(info, final) {
    const g = this.g, key = final ? info.key : (info.from || info.key);
    const k = parseKey(key), c = k.c, v = k.v, r = RARITY[c.tier], s = SERIES[c.s], V = VERSIONS[v];
    const G = info.grant || {}, e = info.entry || {};
    const box = $('#rv .cardr');
    const isHid = c.tier === 'HID';
    const ed = editionOf(c.tier, v);
    const serial = final ? G.serial : (ed ? 1 + Math.floor(Math.random() * ed) : 0);
    const extras = [];
    if (final) {
      if (info.glitch) extras.push(['hid', '隱藏版！這一顆在打開的瞬間變身了。']);
      if (info.blackHidden) extras.push(['hid', '黑金蛋開出了隱藏版！']);
      if (e.src === 'chest') extras.push(['gold', '祕密寶箱：必定是傳說以上。']);
      if (e.src === 'buy') extras.push(['', '從兌換櫃台換來的。']);
      if (info.inner) extras.push(['gold', '蛋中蛋：裡面那一顆升了一級。']);
      if (G.starUp) extras.push(['star', `升星！${'★'.repeat(G.starUp)}${G.starUp >= 3 ? '　換上金色底座' : '　解鎖專屬動作'}`]);
      if (!G.isNew) extras.push(['', `重複了，換成 ${G.tickets} 張兌換券（現在 ${g.P.tickets} 張）`]);
      else if (!G.newChar) extras.push(['', `新版本！這隻角色多了一個「${V.name}」。`]);
      if (info.ev === 'key') extras.push(['gold', `鑰匙碎片 ＋1（${Math.min(g.P.keys, ODDS.keys)}/${ODDS.keys}）${g.P.keys >= ODDS.keys ? '　可以打開祕密寶箱了！' : ''}`]);
      if (info.ev === 'gold') extras.push(['gold', '黃金一夾！這台的下一夾免費，而且直接是強爪。']);
      if (info.ev === 'tri') extras.push(['gold', '一次三隻！後面還有兩隻。']);
      if (G.complete) extras.push(['gold', `「${SERIES[G.complete].name}」八隻收齊！＋${ECON.seriesReward} 代幣、＋${ECON.seriesTickets} 張兌換券`]);
      if (G.allv) extras.push(['gold', `「${SERIES[G.allv].name}」普通、異色、夜光全部收齊！＋${ECON.allVersionsReward} 代幣`]);
      if (info.ev === 'key') setTimeout(() => g.snd.key(), 500);
      if (info.ev === 'gold') setTimeout(() => g.snd.goldShot(), 500);
    }
    const star = final ? G.star : starOf(g.P.ch[c.id]?.got || 0) || 1;
    const vtag = v !== 'n' && !isHid ? `<span class="vtag" style="--vc:${V.color}">${V.name}</span>` : '';
    const card = h(`<div class="cert ${isHid ? 'hid' : ''} ${v === 'g' ? 'glowv' : ''} ${v === 'm' ? 'gild' : ''} ${final && e.shell === 'box' ? 'flip' : ''}" style="--rc:${r.color}">
      <div class="rr"><span class="rbig">${isHid ? 'SECRET' : c.tier}</span><span class="rname">${r.name}</span>${vtag}${final && G.isNew ? '<span class="new">NEW</span>' : ''}</div>
      <h3>${c.name}</h3><div class="en">${c.en.toUpperCase()} · ${s.name}</div>
      <div class="stars" aria-label="星級">${'★'.repeat(star)}<i>${'★'.repeat(3 - star)}</i></div>
      <div class="ln">${c.line}</div>
      <div class="meta">
        <div>收藏市價<b>NT$ ${fmt(valueOf(c, v))}</b></div>
        <div>${ed ? `限量 ${fmt(ed)}・你的編號` : '版本'}<b class="${ed ? '' : 'zh'}">${ed ? 'No.' + pad(serial, String(ed).length) : '一般版'}</b></div>
      </div>
      ${extras.map(([k2, t]) => `<div class="extra ${k2}">${t}</div>`).join('')}
      ${final ? `<div class="btns"><button class="btn main" data-a="ok">${info.left ? '下一個' : '收下'}</button></div>` : ''}
    </div>`);
    box.innerHTML = ''; box.appendChild(card);
    card.addEventListener('click', (ev) => {
      const a = ev.target.closest('[data-a]')?.dataset.a;
      if (!a) return;
      ev.stopPropagation();
      this.g.snd.click();
      this.g.reveal.finish();
    });
  }
  closeReveal() {
    const el = $('#rv'); if (el) el.classList.add('hide');
    $('#ui').classList.remove('hide');
    this.refreshAll();
    const P = this.g.P;
    if (!P.buddy && !P.flags.buddyTip && Object.keys(P.ch).length >= 1) { P.flags.buddyTip = 1; this.g.saveProfile(); setTimeout(() => this.toast('到陳列櫃點一隻公仔，按「設為夥伴」，牠會坐在機台旁邊陪你夾', 'gold'), 900); }
  }

  // ---------------- 面板 ----------------
  sheet(html, onAction) {
    this.closeSheet();
    this.clearCoach();
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
  // 本台說明卡：角色、扭蛋顏色、機率
  openList() {
    const g = this.g, i = g.active, def = MACHINES[i], st = g.mstate[i], P = g.P;
    const count = {}; let blk = 0, glow = 0;
    for (const it of st.items) { if (it.black) blk++; else count[it.rarity] = (count[it.rarity] || 0) + 1; if (it.glow) glow++; }
    const unit = def.kind === 'shelf' ? '盒' : '顆';
    const vault = def.series === 'X';
    const tiers = Object.keys(def.mix).filter((t) => def.mix[t] > 0 || (t === 'SSR' && def.ssr));
    if (!tiers.includes('SSR') && def.ssr) tiers.push('SSR');
    const swatch = (t) => def.kind === 'shelf' ? `<span class="sw box ${t}"></span>` : `<span class="sw" style="background:radial-gradient(circle at 35% 30%,#fff,${t === 'N' ? '#ff9fba' : CAPSULE_COLORS[t]} 45%)"></span>`;
    const thumbs = (list) => list.map((c) => { const own = P.ch[c.id]?.got; return `<img data-k="${colKey(c.id, vault ? 'm' : 'n')}" data-s="${own ? '' : '1'}" alt="" title="${own ? c.name : '？？？'}">`; }).join('');
    const rows = tiers.map((t) => {
      const list = vault ? SERIES_ORDER.flatMap((q) => charsOf(q, t)) : charsOf(def.series, t);
      const label = def.kind === 'shelf' ? { R: '藍盒', SR: '紫盒', SSR: '金盒' }[t] : { N: '粉彩扭蛋', R: '藍扭蛋', SR: '紫扭蛋', SSR: '金色大扭蛋' }[t];
      return `<div class="tier">${swatch(t)}<div class="tx"><div class="nm"><span class="rt ${t}">${t}</span>${label}<em>×${count[t] || 0}</em></div><div class="th">${thumbs(list)}</div></div></div>`;
    }).join('');
    const pct = (x) => (x >= 0.01 ? `${Math.round(x * 1000) / 10}%` : `1/${Math.round(1 / x)}`);
    const O = def.kind === 'shelf' ? ODDS.box : ODDS.cap, EV = def.kind === 'shelf' ? ODDS.evBox : vault ? ODDS.evVault : ODDS.ev;
    const hid = '隱藏版';
    const odds = vault ? `<li>這台全部是<b>鍍金版</b></li><li>${hid}：每${unit} ${pct(O.HID)}</li><li>黑金蛋：${pct(ODDS.black)} 是隱藏版，其餘是鍍金的傳說角色</li>`
      : `<li>普通版 ${pct(1 - O.a - O.g - O.HID)}・異色版 ${pct(O.a)}・夜光版 ${pct(O.g)}</li><li>${hid}：每${unit} ${pct(O.HID)}</li>
         <li>發光的${def.kind === 'shelf' ? '盲盒' : '扭蛋'}：必定變異（夜光 ${pct(ODDS.glow.g)}，其餘異色），隱藏版 ${pct(ODDS.glow.HID)}</li>${blk || def.blackChance ? `<li>黑金蛋：${pct(ODDS.black)} 是隱藏版，其餘是必定變異的傳說角色</li>` : ''}`;
    const evs = [EV.key && `鑰匙碎片 ${pct(EV.key)}`, EV.gold && `黃金一夾 ${pct(EV.gold)}`, EV.egg && `蛋中蛋 ${pct(EV.egg)}`, EV.tri && `一次三隻 ${pct(EV.tri)}`].filter(Boolean).join('・');
    const sh = this.sheet(`<div class="card"><h2>${def.name}<small>${def.en}</small></h2>
      <p>${def.tip}</p><p style="color:var(--muted);font-size:13px">機台裡現在有 ${st.items.length} ${unit}${glow ? `（${glow} ${unit}在發光）` : ''}・每次 ${def.cost} 代幣${def.meter ? `・保夾 ${def.meter} 次` : ''}</p>
      ${blk ? `<div class="tier"><span class="sw" style="background:radial-gradient(circle at 35% 30%,#fff3c0,#e3b44a 30%,#1a1408 70%);box-shadow:0 0 12px rgba(255,180,60,.6)"></span><div class="tx"><div class="nm"><span class="rt HID">BLK</span>黑金蛋<em>×${blk}</em></div></div></div>` : ''}
      ${rows}
      <div class="odds"><h4>打開時</h4><ul>${odds}</ul><h4>加碼（每${unit}最多一個）</h4><p>${evs}</p></div>
      <div class="btns"><button class="btn" data-a="skin">機台外觀</button><button class="btn main" data-a="close">好</button></div></div>`, (a) => { if (a === 'skin') { this.openSkins(def.id); return true; } });
    const imgs = [...sh.querySelectorAll('img[data-k]')];
    const run = () => { const im = imgs.shift(); if (!im) return; im.src = thumb(im.dataset.k, !!im.dataset.s); requestAnimationFrame(run); };
    requestAnimationFrame(run);
  }
  openTip() {
    this.sheet(`<div class="card"><h2>怎麼玩<small>HOW TO PLAY</small></h2>
      <p><b>投幣</b>之後，用左下的搖桿把爪子移到目標正上方，按右下的<b>下爪</b>。</p>
      <p>爪子會張開、下降、收爪、上升。<b>到頂的那一瞬間爪子會鬆一點</b>——抓得歪就會在這裡掉下來。畫面可以拖曳轉角度，切到<b>側面</b>看前後距離。</p>
      <p><b>扭蛋的顏色就是稀有度</b>：粉彩是普通、藍是稀有、紫是超稀有、金色大顆是傳說。裡面是哪一隻、會不會變成<b>異色版、夜光版</b>，甚至變成<b>隱藏版</b>，打開才知道。<b>發光的扭蛋</b>必定變異。</p>
      <p><b>保夾燈</b>：沒夾到的每一局都會亮一格；全亮時，下一爪是<b>強爪</b>。夾到任何獎品，或強爪用掉了，燈就歸零。</p>
      <p>開蛋時偶爾有加碼：<b>鑰匙碎片</b>集滿 ${ODDS.keys} 片開祕密寶箱；<b>黃金一夾</b>讓下一夾免費又是強爪；還有<b>蛋中蛋</b>、<b>一次三隻</b>。</p>
      <p>重複的角色會換成<b>兌換券</b>，同一隻拿到第 ${STAR_AT[1]} 隻升 ★★（專屬動作）、第 ${STAR_AT[2]} 隻升 ★★★（金色底座）。</p>
      <p><b>收藏房間</b>：陳列櫃右上的「房間」，公仔會擺在展示櫃裡，點牠會跳一下、說句話。<b>夥伴</b>：選一隻公仔坐在機台旁陪你夾。<b>機台外觀</b>：在「本台說明」裡換機殼顏色和夾爪。這些都只改外觀，不影響爪力和機率。</p>
      <div class="btns"><button class="btn main" data-a="close">開始夾</button></div></div>`);
  }
  openWallet() {
    const g = this.g, left = g.regenLeft();
    this.sheet(`<div class="card"><h2>代幣 ${g.P.tokens}<small>COINS</small></h2>
      <p>低於 ${ECON.regenCap} 枚時每 ${ECON.regenEvery} 秒補 1 枚${left >= 0 ? `，下一枚 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : ''}。</p>
      <p>每天第一次打開送 ${ECON.daily} 枚；段位升級、收齊一整個系列也會送。兌換櫃台可以用 ${ECON.ticketToTokens.cost} 張兌換券換 ${ECON.ticketToTokens.tokens} 枚。</p>
      <div class="btns"><button class="btn goldb" data-a="ctr">兌換櫃台</button><button class="btn main" data-a="close">好</button></div></div>`, (a) => { if (a === 'ctr') { this.openCounter(); return true; } });
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
        <div>變異<b>${s.mut || 0}</b></div><div>兌換券<b>${P.tickets || 0}</b></div>
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
      <p style="font-size:12px;color:var(--dim);margin-top:12px">差一點 SO CLOSE · v2.1</p>
      <div class="btns"><button class="btn main" data-a="close">完成</button></div></div>`, (a) => {
      if (a === 'sfx') { S.sfx = !S.sfx; g.snd.setOn(S.sfx); }
      else if (a === 'music') { S.music = !S.music; g.snd.setMusic(S.music); }
      else if (a.startsWith('q:')) { S.quality = a.slice(2); if (S.quality !== 'auto') g.R.setQuality(S.quality); else g.R.setQuality('high'); }
      else if (a === 'tut') { for (const k of Object.keys(g.P.flags)) if (k.startsWith('c_')) delete g.P.flags[k]; g.saveProfile(); this.closeSheet(); this.coach('coin'); return false; }
      g.saveProfile();
      this.openSettings();
      return true;
    });
    return s;
  }

  // ---------------- 陳列櫃 ----------------
  updateColDot() {
    const d = $('#bCol .dot'), P = this.g.P;
    if (d) d.classList.toggle('hide', !Object.values(P.ch).some((c) => c.got && !c.seen));
  }
  bestKey(cid) {
    const P = this.g.P;
    for (const v of ['m', 'g', 'a', 'n']) if (P.col[colKey(cid, v)]?.n) return colKey(cid, v);
    return null;
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
    this.clearCoach();
    this.colSeries = series || this.colSeries || MACHINES[g.active].series.replace('X', 'J');
    this.renderCollection();
  }
  renderCollection() {
    const g = this.g, P = g.P, el = $('#col');
    const allKeys = CHARS.flatMap((c) => versionsOf(c).map((v) => colKey(c.id, v)));
    const ownChars = CHARS.filter((c) => P.ch[c.id]?.got).length;
    const ownKeys = allKeys.filter((k) => P.col[k]?.n).length;
    const hidList = CHARS.filter((c) => c.tier === 'HID');
    const hasOld = OLD_PRIZES.some((p) => P.col[p.id]?.n);
    const tabs = [...SERIES_ORDER.map((k) => SERIES[k]), ...(hasOld ? [{ key: 'OLD', name: '初代', color: '#9aa3c0' }] : [])];
    if (this.colSeries === 'OLD' && !hasOld) this.colSeries = 'J';
    el.innerHTML = `<header><h1>陳列櫃<small>COLLECTION</small></h1><button class="chip roomchip" data-a="room"><svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></svg>房間</button><button class="chip tkchip" data-a="ctr">券 ${P.tickets || 0}</button><button class="ibtn" data-a="close" aria-label="關閉"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
      <div class="stats"><div>角色<b>${ownChars}/${CHARS.length}</b></div><div>版本<b>${ownKeys}/${allKeys.length}</b></div><div>隱藏版<b>${hidList.filter((c) => P.ch[c.id]?.got).length}/${hidList.length}</b></div></div>
      <div class="tabs">${tabs.map((s) => `<button data-s="${s.key}" class="${s.key === this.colSeries ? 'on' : ''}" style="--sc:${s.color}">${s.name}${P.series[s.key] ? ' ✦' : ''}</button>`).join('')}</div>
      <div class="grid"></div>`;
    const grid = $('.grid', el), pending = [];
    if (this.colSeries === 'OLD') {
      grid.appendChild(h('<div class="sb">v1 的獎品已經停產，只留在陳列櫃裡。</div>'));
      for (const p of OLD_PRIZES.filter((q) => P.col[q.id]?.n)) {
        const r = RARITY[p.rarity];
        const slot = h(`<div class="slot own ${p.rarity === 'HID' ? 'hid' : ''}" style="--rc:${r.color}" data-o="${p.id}"><img alt=""><span class="rt ${p.rarity}">${p.rarity === 'HID' ? 'SECRET' : p.rarity}</span><div class="nm">${p.name}</div><div class="vp sub">${OLD_SERIES[p.series].name}</div></div>`);
        grid.appendChild(slot);
        const img = $('img', slot); pending.push(() => { img.src = thumb(p.id); });
      }
    } else {
      const S = SERIES[this.colSeries], list = seriesChars(S.key);
      const keys = list.flatMap((c) => versionsOf(c).map((v) => colKey(c.id, v)));
      const reg = list.filter((c) => c.tier !== 'HID'), hidC = list.find((c) => c.tier === 'HID');
      grid.appendChild(h(`<div class="sb">${S.blurb}<br>角色 ${reg.filter((c) => P.ch[c.id]?.got).length}/${reg.length}・隱藏版 ${P.ch[hidC.id]?.got ? 1 : 0}/1・版本 ${keys.filter((k) => P.col[k]?.n).length}/${keys.length}${P.series[S.key] ? '・✦ 八隻收齊' : ''}${P.seriesAll[S.key] ? '・✦ 全版本' : ''}</div>`));
      for (const c of list) {
        const ch = P.ch[c.id], have = !!ch?.got, r = RARITY[c.tier], isH = c.tier === 'HID';
        const best = this.bestKey(c.id), star = starOf(ch?.got || 0);
        const pips = isH ? '' : versionsOf(c).map((v) => `<i class="${P.col[colKey(c.id, v)]?.n ? 'on' : ''}" style="--v:${VERSIONS[v].color}">${VERSIONS[v].short}</i>`).join('');
        const slot = h(`<div class="slot ${have ? 'own' : 'no'} ${isH ? 'hid' : ''} ${have && !ch.seen ? 'fresh' : ''}" style="--rc:${r.color}" data-c="${c.id}">
          ${!have && isH ? '<div class="q">?</div>' : '<img alt="">'}
          <span class="rt ${c.tier}">${isH ? 'SECRET' : c.tier}</span>${have ? `<span class="st">${'★'.repeat(star)}<i>${'★'.repeat(3 - star)}</i></span>` : ''}
          <div class="nm">${have ? c.name : isH ? '隱藏版' : '？？？'}</div><div class="vp">${pips}</div></div>`);
        grid.appendChild(slot);
        const img = $('img', slot);
        if (img) pending.push(() => { img.src = thumb(best || colKey(c.id, 'n'), !have); });
      }
    }
    const run = () => { const f = pending.shift(); if (!f) return; f(); requestAnimationFrame(run); };
    requestAnimationFrame(run);
    el.querySelector('.tabs button.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    el.onclick = (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'close') { g.snd.click(); this.closeCollection(); return; }
      if (a === 'ctr') { g.snd.click(); this.openCounter(); return; }
      if (a === 'room') { g.snd.click(); this.openRoom(this.colSeries !== 'OLD' ? this.colSeries : 'J'); return; }
      const sb = e.target.closest('[data-s]');
      if (sb) { g.snd.click(); this.colSeries = sb.dataset.s; this.renderCollection(); return; }
      const so = e.target.closest('[data-o]');
      if (so) { g.snd.soft(); this.openOldDetail(so.dataset.o); return; }
      const sl = e.target.closest('[data-c]');
      if (sl) {
        const cid = sl.dataset.c;
        if (P.ch[cid]?.got) { g.snd.soft(); this.openDetail(cid, undefined, 'grid'); }
        else { g.snd.deny(); this.toast(CHAR[cid].tier === 'HID' ? '隱藏版……只有在打開的瞬間才會出現' : '還沒拿到這一隻', 'warn'); }
      }
    };
  }
  closeCollection() {
    const g = this.g;
    $('#col')?.classList.add('hide');
    this.closeDetail();
    $('#ui').classList.remove('hide');
    if (g.mode === 'collection') g.mode = 'shop';
    this.updateColDot();
  }
  openDetail(cid, v, from) {
    const g = this.g, P = g.P, c = CHAR[cid], r = RARITY[c.tier], s = SERIES[c.s], ch = P.ch[cid];
    this.detailFrom = from || this.detailFrom || 'grid';
    if (from === 'room') $('#den')?.classList.add('hide');
    ch.seen = true; g.saveProfile();
    const owned = versionsOf(c).filter((q) => P.col[colKey(cid, q)]?.n);
    v = v && owned.includes(v) ? v : (this.bestKey(cid) || colKey(cid, 'n')).split('.')[1];
    const key = colKey(cid, v), col = P.col[key], star = starOf(ch.got), V = VERSIONS[v], isH = c.tier === 'HID';
    $('#col')?.classList.add('hide');
    g.showcase.open(key, star);
    let el = $('#detail');
    if (!el) { el = h('<div id="detail"></div>'); document.body.appendChild(el); }
    el.classList.remove('hide');
    const ed = editionOf(c.tier, v), best = col.serials.length ? Math.min(...col.serials) : 0;
    const isBud = P.buddy === key;
    const d = new Date(ch.first);
    const next = star < 3 ? `再 ${STAR_AT[star] - ch.got} 隻升 ${'★'.repeat(star + 1)}` : '已經滿星';
    const chips = isH ? '' : `<div class="vchips">${versionsOf(c).map((q) => { const o = P.col[colKey(cid, q)]?.n; return `<button data-v="${q}" class="${q === v ? 'on' : ''} ${o ? '' : 'off'}" style="--v:${VERSIONS[q].color}">${o ? VERSIONS[q].name : '？'}</button>`; }).join('')}</div>`;
    el.innerHTML = `<div class="drag"></div><button class="ibtn back" data-a="back" aria-label="返回"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
      <div class="dl"><div class="cert ${isH ? 'hid' : ''} ${v === 'g' ? 'glowv' : ''} ${v === 'm' ? 'gild' : ''}" style="--rc:${r.color}">
        <div class="rr"><span class="rbig">${isH ? 'SECRET' : c.tier}</span><span class="rname">${r.name}</span>${v !== 'n' ? `<span class="vtag" style="--vc:${V.color}">${V.name}</span>` : ''}<span class="new" style="background:rgba(255,255,255,.1);box-shadow:none">×${ch.got}</span></div>
        <h3>${c.name}</h3><div class="en">${c.en.toUpperCase()} · ${s.name}</div>
        <div class="stars">${'★'.repeat(star)}<i>${'★'.repeat(3 - star)}</i><small>${next}・★★ 專屬動作・★★★ 金色底座</small></div>
        ${chips}
        <div class="ln">${c.line}</div>
        <div class="meta">
          <div>收藏市價<b>NT$ ${fmt(valueOf(c, v))}</b></div>
          <div>${ed ? `限量 ${fmt(ed)}・最小編號` : '版本'}<b class="${ed ? '' : 'zh'}">${ed && best ? 'No.' + pad(best, String(ed).length) : V.name}</b></div>
          <div>第一次拿到<b class="zh">${d.getMonth() + 1} 月 ${d.getDate()} 日</b></div>
          <div>這個版本<b>×${col.n}</b></div>
        </div>
        <div class="btns"><button class="btn ${isBud ? '' : 'goldb'}" data-a="buddy">${isBud ? '✓ 夥伴' : '設為夥伴'}</button><button class="btn main" data-a="back">${this.detailFrom === 'room' ? '回到房間' : '返回陳列櫃'}</button></div>
      </div></div>`;
    this.bindDrag(el);
    el.onclick = (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'back') { g.snd.click(); this.backFromDetail(); return; }
      if (a === 'buddy') { g.snd.click(); this.toggleBuddy(key); this.openDetail(cid, v); return; }
      const vb = e.target.closest('[data-v]');
      if (vb) { if (vb.classList.contains('off')) { g.snd.deny(); this.toast(vb.dataset.v === 'm' ? '鍍金版只出在黑金庫' : '還沒開出這個版本', 'warn'); } else { g.snd.soft(); this.openDetail(cid, vb.dataset.v); } }
    };
  }
  openOldDetail(pid) {
    const g = this.g, P = g.P, pz = OLD_PRIZE[pid], r = RARITY[pz.rarity], c = P.col[pid];
    $('#col')?.classList.add('hide');
    g.showcase.open(pid, 1);
    let el = $('#detail');
    if (!el) { el = h('<div id="detail"></div>'); document.body.appendChild(el); }
    el.classList.remove('hide');
    const d = new Date(c.first);
    el.innerHTML = `<div class="drag"></div><button class="ibtn back" data-a="back" aria-label="返回"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
      <div class="dl"><div class="cert ${pz.rarity === 'HID' ? 'hid' : ''}" style="--rc:${r.color}">
        <div class="rr"><span class="rbig">${pz.rarity === 'HID' ? 'SECRET' : pz.rarity}</span><span class="rname">${r.name}</span><span class="vtag" style="--vc:#9aa3c0">初代</span></div>
        <h3>${pz.name}</h3><div class="en">${pz.en.toUpperCase()} · ${OLD_SERIES[pz.series].name}</div>
        <div class="ln">${pz.line}</div>
        <div class="meta"><div>收藏市價<b>NT$ ${fmt(pz.value)}</b></div><div>第一次夾到<b class="zh">${d.getMonth() + 1} 月 ${d.getDate()} 日</b></div></div>
        <div class="btns"><button class="btn main" data-a="back">返回陳列櫃</button></div>
      </div></div>`;
    this.bindDrag(el);
    el.onclick = (e) => { if (e.target.closest('[data-a]')?.dataset.a === 'back') { g.snd.click(); this.closeDetail(); $('#col').classList.remove('hide'); this.renderCollection(); } };
  }
  bindDrag(el) {
    const g = this.g, drag = $('.drag', el);
    let lx = null;
    drag.onpointerdown = (e) => { lx = e.clientX; drag.setPointerCapture(e.pointerId); };
    drag.onpointermove = (e) => { if (lx == null) return; g.showcase.drag(e.clientX - lx); lx = e.clientX; };
    drag.onpointerup = drag.onpointercancel = () => { lx = null; };
  }
  closeDetail() { $('#detail')?.classList.add('hide'); this.g.showcase.close(); }
  backFromDetail() {
    this.closeDetail();
    if (this.detailFrom === 'room' && this.g.mode === 'room') { this.detailFrom = 'grid'; $('#den')?.classList.remove('hide'); this.renderRoomCard(); this.renderRoomFoot(); this.layoutRoom(); return; }
    this.detailFrom = 'grid';
    this.openCollection(this.colSeries);
  }

  // ---------------- 兌換櫃台 ----------------
  openCounter() {
    const g = this.g, P = g.P, E = ECON.ticketToTokens, tk = P.tickets || 0;
    const missing = CHARS.filter((c) => c.tier !== 'HID' && !P.col[colKey(c.id, 'n')]?.n);
    const rows = SERIES_ORDER.map((sk) => {
      const list = missing.filter((c) => c.s === sk);
      if (!list.length) return '';
      return `<h4>${SERIES[sk].name}</h4>` + list.map((c) => { const pr = ECON.price[c.tier]; return `<div class="pi"><img data-k="${colKey(c.id, 'n')}" alt=""><div class="tx"><div class="nm"><span class="rt ${c.tier}">${c.tier}</span>${c.name}</div><div class="sb">普通版</div></div><button class="buy" data-a="b:${c.id}" ${tk >= pr ? '' : 'disabled'}>${pr} 張</button></div>`; }).join('');
    }).join('');
    const sh = this.sheet(`<div class="card"><h2>兌換櫃台<small>PRIZE COUNTER</small></h2>
      <p>你有 <b class="tkn">${tk}</b> 張兌換券。重複的角色會自動換成兌換券（普通 ${ECON.ticket.N}・稀有 ${ECON.ticket.R}・超稀有 ${ECON.ticket.SR}・傳說 ${ECON.ticket.SSR}・隱藏版 ${ECON.ticket.HID} 張）。</p>
      <div class="pi"><div class="coin" style="width:52px;height:52px;font-size:20px">S</div><div class="tx"><div class="nm">代幣 ×${E.tokens}</div><div class="sb">可以重複換</div></div><button class="buy" data-a="tok" ${tk >= E.cost ? '' : 'disabled'}>${E.cost} 張</button></div>
      <div class="btns" style="margin-top:10px"><button class="btn" data-a="skin">機台外觀</button><button class="btn" data-a="theme">房間佈置</button></div>
      ${missing.length ? `<p style="margin-top:14px">還沒拿到的角色，可以直接指定換一隻普通版：</p><div class="plist">${rows}</div>` : '<p>所有角色的普通版都收齊了！</p>'}
      <p style="font-size:12px;color:var(--muted)">異色、夜光、鍍金和隱藏版只能自己開出來。</p>
      <div class="btns"><button class="btn main" data-a="close">好</button></div></div>`, (a) => {
      if (a === 'tok') { const v = g.ticketsToTokens(); if (v) this.toast(`換到 ${v} 枚代幣`, 'gold'); this.openCounter(); return true; }
      if (a === 'skin') { this.openSkins(MACHINES[g.active].id); return true; }
      if (a === 'theme') { this.openThemes(); return true; }
      if (a.startsWith('b:')) { if (!g.exchange(a.slice(2))) { g.snd.deny(); return true; } return true; }
    });
    const imgs = [...sh.querySelectorAll('img[data-k]')];
    const run = () => { const im = imgs.shift(); if (!im) return; im.src = thumb(im.dataset.k); requestAnimationFrame(run); };
    requestAnimationFrame(run);
  }
  // ---------------- 祕密寶箱 ----------------
  openKeys() {
    const g = this.g, k = g.P.keys || 0, full = k >= ODDS.keys;
    this.sheet(`<div class="card"><h2>祕密寶箱<small>SECRET CHEST</small></h2>
      <p>開扭蛋、拆盲盒時有機會拿到<b>鑰匙碎片</b>。集滿 ${ODDS.keys} 片可以打開一次祕密寶箱：<b>必定是傳說以上</b>，而且一定是異色或夜光版；有 ${Math.round(ODDS.chest.HID * 100)}% 是隱藏版。</p>
      <div class="keyrow">${Array.from({ length: ODDS.keys }, (_, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('')}<b>${k}/${ODDS.keys}</b></div>
      <div class="btns">${full ? '<button class="btn goldb" data-a="open">打開寶箱</button>' : ''}<button class="btn main" data-a="close">${full ? '等一下' : '好'}</button></div></div>`, (a) => {
      if (a === 'open') { if (!g.openChest()) g.snd.deny(); return true; }
    });
  }

  // ---------------- 點畫面（夥伴、收藏房間） ----------------
  sceneTap(x, y) {
    const g = this.g;
    if (g.mode === 'shop') { if (!g.turn || g.turn.sim.state !== 'aim') { if (g.buddy.hit(x, y)) g.buddy.react('tap', true); } return; }
    if (g.mode !== 'room') return;
    const r = g.den.tap(x, y);
    if (r.kind === 'slot') {
      const c = r.slot.c;
      g.pet(c.id);
      this.roomSay(r.slot.i, pick(buddyLines(c).tap));
      this.roomCard(r.slot);
    } else if (r.kind === 'buddy') {
      const k = parseKey(g.P.buddy);
      if (k) this.roomSay('buddy', pick(buddyLines(k.c).tap));
    } else if (r.kind === 'locked') {
      this.toast(r.slot.c.tier === 'HID' ? '隱藏版……只有在打開的瞬間才會出現' : '還沒拿到這一隻', 'warn');
    } else if (g.den.cam.focus >= 0) this.roomCard(null);
  }

  // ---------------- 收藏房間 ----------------
  openRoom(series) {
    const g = this.g;
    if (g.turn) return;
    $('#col')?.classList.add('hide');
    this.closeDetail();
    let el = $('#den');
    if (!el) { el = h('<div id="den"></div>'); document.body.appendChild(el); }
    el.classList.remove('hide');
    $('#ui').classList.add('hide');
    this.clearCoach();
    this.roomSeries = series || this.roomSeries || (this.colSeries && this.colSeries !== 'OLD' ? this.colSeries : 'J');
    g.openRoom(this.roomSeries);
    this.renderRoom();
    if (!g.P.flags.roomTip) { g.P.flags.roomTip = 1; g.saveProfile(); setTimeout(() => this.toast('點公仔：牠會跳一下、說句話；★★ 以上還會做專屬動作', 'gold'), 700); }
  }
  renderRoom() {
    const g = this.g, P = g.P, el = $('#den');
    const bk = P.buddy && parseKey(P.buddy);
    el.innerHTML = `<header class="pe"><button class="ibtn" data-a="back" aria-label="返回"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><h1>收藏房間<small>MY ROOM</small></h1><button class="chip" data-a="deco"><svg viewBox="0 0 24 24"><path d="M4 20h16M6 20V9l6-5 6 5v11"/><path d="M10 20v-6h4v6"/></svg>佈置</button></header>
      <div class="tabs pe">${SERIES_ORDER.map((k) => `<button data-s="${k}" class="${k === this.roomSeries ? 'on' : ''}" style="--sc:${SERIES[k].color}">${SERIES[k].name}${P.series[k] ? ' ✦' : ''}</button>`).join('')}</div>
      <div class="dbub hide"><span></span></div>
      <div class="dfoot pe"><span>${bk ? `夥伴：<b>${bk.c.name}</b>　` : ''}點公仔互動・左右拖曳換角度</span></div>
      <div class="dcard pe hide"></div>`;
    el.onclick = (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'back') { g.snd.click(); this.closeRoom(); return; }
      if (a === 'deco') { g.snd.click(); this.openThemes(); return; }
      if (a === 'buddy') { g.snd.click(); this.toggleBuddy(this.roomFocusKey); this.renderRoomCard(); this.renderRoomFoot(); return; }
      if (a === 'detail') { g.snd.click(); const k = parseKey(this.roomFocusKey); if (k) this.openDetail(k.cid, k.v, 'room'); return; }
      if (a === 'x') { g.snd.click(); this.roomCard(null); return; }
      const sb = e.target.closest('[data-s]');
      if (sb && sb.dataset.s !== this.roomSeries) { g.snd.click(); this.roomSeries = sb.dataset.s; this.roomCard(null); g.den.fill(this.roomSeries); el.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.s === this.roomSeries)); }
    };
    el.querySelector('.tabs button.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    requestAnimationFrame(() => this.layoutRoom());
  }
  renderRoomFoot() { const f = $('#den .dfoot span'); if (!f) return; const bk = this.g.P.buddy && parseKey(this.g.P.buddy); f.innerHTML = `${bk ? `夥伴：<b>${bk.c.name}</b>　` : ''}點公仔互動・左右拖曳換角度`; }
  roomCard(slot) {
    const g = this.g, card = $('#den .dcard'), foot = $('#den .dfoot');
    if (!card) return;
    if (!slot) { g.den.unfocus(); card.classList.add('hide'); foot.classList.remove('hide'); this.roomFocusKey = null; this.layoutRoom(); return; }
    this.roomFocusKey = slot.key;
    this.renderRoomCard();
    card.classList.remove('hide'); foot.classList.add('hide');
    this.layoutRoom();
  }
  renderRoomCard() {
    const g = this.g, P = g.P, card = $('#den .dcard'), key = this.roomFocusKey;
    const k = key && parseKey(key); if (!k || !card) return;
    const c = k.c, r = RARITY[c.tier], V = VERSIONS[k.v], isH = c.tier === 'HID', star = starOf(P.ch[c.id]?.got || 0), isB = P.buddy && parseKey(P.buddy)?.cid === c.id;
    card.innerHTML = `<div class="cert mini ${isH ? 'hid' : ''} ${k.v === 'g' ? 'glowv' : ''} ${k.v === 'm' ? 'gild' : ''}" style="--rc:${r.color}">
      <button class="x" data-a="x" aria-label="關閉"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="rr"><span class="rbig">${isH ? 'SECRET' : c.tier}</span><span class="rname">${r.name}</span>${k.v !== 'n' && !isH ? `<span class="vtag" style="--vc:${V.color}">${V.name}</span>` : ''}</div>
      <h3>${c.name}</h3>
      <div class="stars">${'★'.repeat(star)}<i>${'★'.repeat(3 - star)}</i><small>${star >= 2 ? '會做專屬動作' : `再 ${STAR_AT[1] - (P.ch[c.id]?.got || 0)} 隻升 ★★，解鎖專屬動作`}</small></div>
      <div class="ln">${c.line}</div>
      <div class="btns"><button class="btn ${isB ? '' : 'goldb'}" data-a="buddy">${isB ? '✓ 牠是你的夥伴' : '設為夥伴'}</button><button class="btn main" data-a="detail">詳細</button></div>
    </div>`;
  }
  roomSay(slot, text) {
    const b = $('#den .dbub'); if (!b) return;
    this.roomBub = { slot, until: performance.now() + 2400 };
    $('span', b).textContent = text;
    b.classList.remove('hide', 'pop'); void b.offsetWidth; b.classList.add('pop');
  }
  denFrame() {
    const B = this.roomBub, b = $('#den .dbub');
    if (!B || !b) return;
    if (performance.now() > B.until) { b.classList.add('hide'); this.roomBub = null; return; }
    const p = this.g.den.screenOf(B.slot); if (!p) return;
    const w = b.offsetWidth || 120;
    b.style.transform = `translate(${Math.max(8, Math.min(innerWidth - w - 8, p.x - w * 0.5))}px, ${Math.max(this.denTop || 60, p.y - 50)}px)`;
  }
  layoutRoom() {
    const el = $('#den'); if (!el || el.classList.contains('hide')) return;
    const tabs = $('.tabs', el), card = $('.dcard', el), foot = $('.dfoot', el);
    this.denTop = tabs ? tabs.getBoundingClientRect().bottom + 4 : 100;
    const open = card && !card.classList.contains('hide');
    const land = innerWidth > innerHeight;
    // 橫向：卡片在右邊，畫面往左讓；直向：卡片在下面
    this.denSide = land && open ? card.getBoundingClientRect().width : 0;
    const low = open && !land ? card : foot;
    this.denBottom = low ? innerHeight - low.getBoundingClientRect().top + 4 : 60;
    if (land) this.denBottom = Math.min(this.denBottom, 44);
  }
  closeRoom() {
    const g = this.g;
    $('#den')?.classList.add('hide');
    this.roomBub = null;
    g.closeRoom();
    this.openCollection(this.roomSeries);
  }
  toggleBuddy(key) {
    const g = this.g, k = key && parseKey(key);
    if (!k) return;
    const cur = g.P.buddy && parseKey(g.P.buddy);
    if (cur && cur.cid === k.cid && cur.v === k.v) { g.setBuddy(null); this.toast(`${k.c.name}回陳列櫃休息了`, ''); return; }
    g.setBuddy(key);
    this.toast(`${k.c.name}會坐在機台旁邊陪你夾！`, 'gold');
    g.snd.cheer();
  }

  // ---------------- 機台外觀、房間佈置 ----------------
  skinBtn(kind, it, cur) {
    const g = this.g, own = g.skinOwned(kind, it.id);
    if (own) return cur === it.id ? '<button class="buy on" disabled>使用中</button>' : `<button class="buy" data-a="u:${kind}:${it.id}">套用</button>`;
    if (it.need) return g.needOk(it.need) ? `<button class="buy" data-a="g:${kind}:${it.id}">解鎖</button>` : `<button class="buy" disabled>🔒</button>`;
    return `<button class="buy" data-a="g:${kind}:${it.id}" ${(g.P.tickets || 0) >= it.price ? '' : 'disabled'}>${it.price} 張</button>`;
  }
  openSkins(mid) {
    const g = this.g, P = g.P, def = MACHINE[mid] || MACHINES[g.active], u = P.skin.mach[def.id] || {};
    const cabCur = u.cab || 'base', clawCur = u.claw || 'chrome';
    const cabRow = (it) => { const body = it.body || def.theme.body, trim = it.trim === 'rainbow' ? 'conic-gradient(#ff3fb4,#ffd23a,#5dffb0,#3fe0ff,#9a5aff,#ff3fb4)' : it.trim || def.theme.trim; return `<div class="pi"><span class="skin cab" style="--b:${body};--t:${trim}"></span><div class="tx"><div class="nm">${it.name}</div><div class="sb">${it.need ? NEED_TEXT[it.need] : it.id === 'base' ? '這台機台原本的顏色' : '機殼＋霓虹燈'}</div></div>${this.skinBtn('cab', it, cabCur)}</div>`; };
    const clawRow = (it) => `<div class="pi"><span class="skin claw ${it.iri ? 'iri' : ''}" style="--c:${it.color}"></span><div class="tx"><div class="nm">${it.name}</div><div class="sb">${it.need ? NEED_TEXT[it.need] : '夾爪的金屬材質'}</div></div>${this.skinBtn('claw', it, clawCur)}</div>`;
    this.sheet(`<div class="card"><h2>機台外觀<small>${def.name}</small></h2>
      <p>只換外觀，<b>不影響爪力和機率</b>。買過的顏色每一台都可以套用。你有 <b class="tkn">${P.tickets || 0}</b> 張兌換券。</p>
      <h4>機殼配色</h4><div class="plist">${CAB_SKINS.map(cabRow).join('')}</div>
      <h4>夾爪</h4><div class="plist">${CLAW_SKINS.map(clawRow).join('')}</div>
      <div class="btns"><button class="btn main" data-a="close">好</button></div></div>`, (a) => {
      const [op, kind, id] = a.split(':');
      if (op === 'g') { if (!g.getSkin(kind, id)) { g.snd.deny(); return true; } g.useSkin(kind, id, def.id); this.toast('換好了！', 'gold'); this.openSkins(def.id); return true; }
      if (op === 'u') { g.useSkin(kind, id, def.id); this.openSkins(def.id); return true; }
    });
  }
  openThemes() {
    const g = this.g, P = g.P, cur = P.skin.room || 'wood';
    const row = (it) => { const T = THEMES[it.id]; return `<div class="pi"><span class="skin room" style="--w:${T.wall[1]};--w2:${T.wall[2] || T.wall[1]};--c:${T.cab};--l:${T.led}"></span><div class="tx"><div class="nm">${it.name}</div><div class="sb">${it.need ? NEED_TEXT[it.need] : '牆、地板、展示櫃、燈光'}</div></div>${this.skinBtn('room', it, cur)}</div>`; };
    this.sheet(`<div class="card"><h2>房間佈置<small>ROOM THEME</small></h2>
      <p>換一整套房間的佈置。你有 <b class="tkn">${P.tickets || 0}</b> 張兌換券。</p>
      <div class="plist">${ROOM_THEMES.map(row).join('')}</div>
      <div class="btns"><button class="btn main" data-a="close">好</button></div></div>`, (a) => {
      const [op, kind, id] = a.split(':');
      if (op === 'g') { if (!g.getSkin(kind, id)) { g.snd.deny(); return true; } g.useSkin(kind, id); this.toast('佈置好了！', 'gold'); this.openThemes(); return true; }
      if (op === 'u') { g.useSkin(kind, id); this.openThemes(); return true; }
    });
  }

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
    if (!T || this.g.mode !== 'shop' || this.modal) return;
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
