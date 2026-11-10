/* ───────────── 場景：標題（背景是一場自動進行的戰鬥）、戰鬥、結算 ───────────── */
function show(id) { for (const s of $$('#ui > .scr')) s.classList.toggle('on', s.id === id); }
function initUI() {
  const ui = $('#ui');
  ui.innerHTML = `
  <div id="title" class="scr"></div>
  <div id="map" class="scr"></div>
  <div id="base" class="scr"></div>
  <div id="brief" class="scr"></div>
  <div id="hud" class="scr"></div>
  <div id="result" class="scr"></div>
  <div id="dlg" class="scr"></div>
  <div id="modal" class="scr"></div>`;
}
function toast(t) { const d = el('div', 'toast', esc(t)); $('#ui').appendChild(d); setTimeout(() => d.remove(), 2500); }
function onLayout() { document.documentElement.classList.toggle('sm', VIEW.h < 360); document.documentElement.classList.toggle('xs', VIEW.h < 330); if (G.scene === 'battle' || G.scene === 'title') clampCam(); }

/* 自動指揮（標題背景、測試用）：照補給和戰況隨手下兵 */
function autoPlayer(side, dt, deck) {
  B.auto = B.auto || [0, 0];
  B.auto[side] -= dt;
  if (B.auto[side] > 0) return;
  B.auto[side] = rnd(0.8, 1.8);
  const sup = B.supply[side];
  const opts = deck.filter((k) => { const d = ABIL[k] || HERO[k] || UDEF[k]; return d && d.cost <= sup && !(ABIL[k] && (B.cdAbil['a' + side + k] || 0) > 0) && !(HERO[k] && B.heroUsed['a' + side + k]); });
  if (!opts.length || (sup < 6 && chance(0.5))) return;
  const k = pick(opts);
  if (ABIL[k]) {
    const t = clusterTarget(1 - side, 3); if (!t) return;
    B.supply[side] -= ABIL[k].cost; useAbility(side, k, t.lane, t.x); B.cdAbil['a' + side + k] = ABIL[k].cd; return;
  }
  // 兵力最少的那條線
  const own = [0, 0, 0]; for (const u of B.units) if (u.alive && u.side === side) own[u.lane]++;
  let lane = 0; for (let l = 1; l < 3; l++) if (own[l] + rnd(0, 2) < own[lane]) lane = l;
  const z = deployZone(side, lane);
  if (HERO[k]) { B.heroUsed['a' + side + k] = true; B.supply[side] -= HERO[k].cost; spawnHero(side, k, lane, side ? z[0] + 40 : z[1] - 40); return; }
  deploy(side, k, lane, side ? z[0] + rnd(10, 80) : z[1] - rnd(10, 80));
}

/* ── 戰鬥場景 ── */
SCENES.battle = {
  enter(cfg) {
    G.scene = 'battle'; G.paused = false; G.speed = 1; G.slowTarget = 1; G.timeScale = 1;
    newBattle(cfg);
    buildBattleBG(cfg.theme || 'snow', cfg.seed || 7);
    battleCamInit();
    buildHUD();
    show('hud');
    B.sel = null;
    setTimeoutG(() => { rivalSay('open'); }, 1.2);
    setTimeoutG(() => { radio('指揮官，部隊待命。拖曳畫面看戰場，點下方卡片出兵。'); }, 0.3);
    if (cfg.onStart) cfg.onStart();
  },
  update(dt, rdt) {
    if (!B) return;
    if (!G.paused) {
      if (B.cfg.autoUs || G.autoTest) autoPlayer(0, dt, B.deck);
      battleUpdate(dt);
      if (B.cfg.tutorial) tutorialTick(dt);
    }
    camFollow(rdt);
    updateHUD(rdt);
    setLoop('wind', 0.06);
    let rot = 0, eng = 0, fire = 0;
    for (const u of B.units) if (u.alive) { if (u.cls === 'air') rot += 0.5 * spatial(u.x)[0]; else if (u.isVeh) eng += 0.25 * spatial(u.x)[0] * (Math.abs(u.vx) > 3 ? 1.4 : 0.6); }
    for (const u of B.units) if (u.wreck && u.burnT < 14) fire += 0.08 * spatial(u.x)[0];
    setLoop('rotor', Math.min(0.5, rot)); setLoop('engine', Math.min(0.35, eng)); setLoop('fire', Math.min(0.25, fire));
  },
  render(c) { if (B) renderBattle(c); },
};
function showPause() {
  openModal('暫停', `<p>戰鬥暫停中。</p><ul><li>拖曳畫面看整個戰場、雙指縮放。</li><li>點卡片 → 點綠色範圍部署；技能可以點任何位置。</li><li>英雄上場後，再點一次英雄卡就是放大招。</li><li>佔越多旗點，補給回得越快。</li></ul>`,
    [['繼續', () => { G.paused = false; $('.ib[data-a=pause]').classList.remove('on'); }], ['撤退', () => { G.paused = false; if (B) endBattle(1); }, 'red']]);
}
function openModal(title, html, btns) {
  const m = $('#modal');
  m.innerHTML = `<div class="box panel"><h3>${esc(title)}</h3>${html}<div class="ops"></div></div>`;
  const ops = $('.ops', m);
  for (const [t, fn, cls] of btns || [['好', null]]) { const b = el('button', 'btn ' + (cls || ''), esc(t)); b.addEventListener('click', () => { sfx('click'); m.classList.remove('on'); if (fn) fn(); }); ops.appendChild(b); }
  m.classList.add('on');
}

/* ── 結算 ── */
function onBattleEnd(res) {
  if (G.scene !== 'battle' || !B) return;
  const s = B.stats;
  const cb = B.cfg.onEnd;
  const r = $('#result');
  const win = res === 'win';
  const reward = cb ? cb(res, s, true) : null;
  r.innerHTML = `<div class="box panel">
    <h2 class="${win ? 'win' : 'lose'}">${win ? '勝利' : '敗退'}</h2>
    <div style="font-size:13px;color:#c9d2da;margin-top:4px">${win ? esc(B.rival.lines.lose2[0]) : esc(B.rival.lines.win[0])} <span style="color:#ff9a7f">—— ${esc(B.rival.name)}</span></div>
    <div class="stats"><div><b>${s.kills}</b><span>擊倒敵兵</span></div><div><b>${s.veh}</b><span>摧毀載具</span></div><div><b>${s.flagsTaken}</b><span>奪下旗點</span></div><div><b>${s.lost}</b><span>我方損失</span></div></div>
    <div class="rw">${reward && reward.html ? reward.html : ''}</div>
    <div class="ops" style="justify-content:center"></div></div>`;
  const ops = $('.ops', r);
  const b = el('button', 'btn' + (win ? '' : ' alt'), win ? '繼續' : '回去');
  b.addEventListener('click', () => { sfx('click'); r.classList.remove('on'); if (cb) cb(res, s, false); else startGame(); });
  ops.appendChild(b);
  if (!cb || !win) { const b2 = el('button', 'btn alt', '再打一次'); b2.addEventListener('click', () => { sfx('click'); r.classList.remove('on'); SCENES.battle.enter(B.cfg); }); ops.appendChild(b2); }
  r.classList.add('on');
  setLoop('rotor', 0); setLoop('engine', 0); setLoop('fire', 0);
}

/* ── 標題：背後是一場自動進行的戰鬥 ── */
SCENES.title = {
  enter() {
    G.scene = 'title'; G.paused = false; G.speed = 1; G.slowTarget = 1;
    const rv = pick(['kaz', 'holder', 'ilya']);
    newBattle({ rival: rv, deck: ['rifle', 'mg', 'at', 'tank', 'heli', 'aa', 'mortar', 'flame', 'apc', 'airstrike'], autoUs: true, time: 9999, aiRegen: 1, regen: 0.6 });
    B.regen = [0.62, 0.62];
    buildBattleBG(pick(['snow', 'dusk', 'ruins', 'night']), rndi(1, 999));
    battleCamInit(); CAM.x = FIELD_W / 2;
    this.panT = 0;
    // 先在背景快轉一段，一打開就有仗可看
    const on = AU.on; AU.on = false;
    for (let i = 0; i < 26 * 20; i++) { autoPlayer(0, 0.05, B.deck); battleUpdate(0.05); }
    AU.on = on;
    buildTitle();
    show('title');
  },
  update(dt, rdt) {
    if (!B) return;
    autoPlayer(0, dt, B.deck);
    battleUpdate(dt);
    // 攝影機慢慢沿著前線晃
    let f0 = 400, f1 = FIELD_W - 400;
    for (const u of B.units) { if (!u.alive || u.cls === 'air') continue; if (u.side === 0) f0 = Math.max(f0, u.x); else f1 = Math.min(f1, u.x); }
    this.panT += rdt;
    CAM.x = damp(CAM.x, (f0 + f1) / 2 + 120 + Math.sin(this.panT * 0.15) * 140, 0.6, rdt);
    clampCam();
    // 打到某一邊快贏了就重來，避免畫面空掉
    if (B.over || B.hq[0].hp < 600 || B.hq[1].hp < 600 || B.t > 260) { const keep = this.panT; this.enter(); this.panT = keep; }
    setLoop('wind', 0.05);
    let rot = 0; for (const u of B.units) if (u.alive && u.cls === 'air') rot += 0.4 * spatial(u.x)[0];
    setLoop('rotor', Math.min(0.3, rot) * 0.6);
  },
  render(c) { if (B) renderBattle(c); },
};
function buildTitle() {
  const t = $('#title');
  const hasSave = !!store.get('camp', null);
  t.innerHTML = `
    <div class="logo"><h1>寸土</h1><h2 class="sten">EVERY INCH</h2><p>冰原前線，四股人馬各據一方：昔日同窗、父親的老戰友，還有教過你們的老師。你是第七前哨最年輕的指揮官——寸土必爭，一面旗一面旗搶回來。</p></div>
    <div class="menu">
      ${hasSave ? '<button class="btn" data-a="cont">繼續戰役 <small>' + esc(campSummary()) + '</small></button>' : ''}
      <button class="btn ${hasSave ? 'alt' : ''}" data-a="new">${hasSave ? '重新開始戰役' : '開始戰役'}</button>
      <button class="btn alt" data-a="skirmish">遭遇戰 <small>挑一個對手直接開打</small></button>
      <button class="btn alt" data-a="set">設定</button>
    </div>
    <div class="ver">寸土 EVERY INCH · v1.0</div>`;
  $$('[data-a]', t).forEach((b) => b.addEventListener('click', () => { audioInit(); sfx('click'); titleAction(b.dataset.a); }));
}
function titleAction(a) {
  if (a === 'cont') { campLoad(); goMap(); }
  else if (a === 'new') {
    if (store.get('camp', null)) openModal('重新開始？', '<p>目前的戰役進度會被覆蓋。</p>', [['確定重來', () => { campNew(); startIntro(); }, 'red'], ['取消', null, 'alt']]);
    else { campNew(); startIntro(); }
  } else if (a === 'skirmish') openSkirmish();
  else if (a === 'set') openSettings();
}
function openSkirmish() {
  const opts = Object.keys(RIVAL).map((k) => `<button class="btn alt" data-r="${k}" style="justify-content:flex-start;width:100%;margin-top:6px">${RIVAL[k].name}「${RIVAL[k].title}」<small style="margin-left:8px;opacity:.7">${RIVAL[k].faction}</small></button>`).join('');
  openModal('遭遇戰：選擇對手', `<p>用你戰役裡已經解鎖的兵種開打（還沒開始戰役的話用基本部隊）。</p>${opts}`, [['取消', null, 'alt']]);
  $$('#modal [data-r]').forEach((b) => b.addEventListener('click', () => {
    sfx('click'); $('#modal').classList.remove('on');
    const c = CAMP || campDefault();
    const deck = (c.deck && c.deck.length ? c.deck : ['rifle', 'mg', 'at', 'mortar', 'tank', 'heli', 'barrage', 'airstrike']).slice(0, 8);
    SCENES.battle.enter({ rival: b.dataset.r, deck, lv: c.lv || { inf: 0, veh: 0, air: 0 }, aiLv: 1, theme: pick(['snow', 'dusk', 'ruins', 'night']), seed: rndi(1, 999), supMax: 10 + (c.bld ? c.bld.hq - 1 : 0) });
  }));
}
function openSettings() {
  const vol = store.get('vol', 0.85);
  openModal('設定', `
    <div class="kv"><span>音量</span><input id="sVol" type="range" min="0" max="1" step="0.05" value="${vol}" style="width:160px"></div>
    <div class="kv"><span>音效</span><button class="btn alt" id="sSfx" style="height:30px;font-size:13px">${AU.on ? '開' : '關'}</button></div>
    <div class="kv"><span>畫面晃動</span><button class="btn alt" id="sShake" style="height:30px;font-size:13px">${store.get('shake', true) ? '開' : '關'}</button></div>
    <p style="margin-top:10px">直拿手機時畫面會自動轉成橫的；把手機橫過來就能玩，轉向鎖開著也沒關係。</p>`, [['完成', null]]);
  $('#sVol').addEventListener('input', (e) => setMasterVol(parseFloat(e.target.value)));
  $('#sSfx').addEventListener('click', (e) => { AU.on = !AU.on; store.set('sfx', AU.on); e.target.textContent = AU.on ? '開' : '關'; });
  $('#sShake').addEventListener('click', (e) => { const v = !store.get('shake', true); store.set('shake', v); e.target.textContent = v ? '開' : '關'; });
}

function startGame() {
  SCENES.title.enter();
}
