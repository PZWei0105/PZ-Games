// ============ 介面 ============
const UI = { bridgeMode: false, showVents: false, aimMode: null, hudT: 0, cards: [], menuOpen: false };
function toast(html, cls = '') {
  const box = $('#toasts'); if (!box) return;
  const e = el('div', 'toast ' + cls, html); box.appendChild(e);
  while (box.children.length > 2) box.removeChild(box.firstChild);
  const life = cls === 'learn' ? 5200 : cls === 'tut' ? 6500 : 3600;
  setTimeout(() => e.classList.add('out'), life); setTimeout(() => e.remove(), life + 500);
}
function say(id, text, cls = '') {
  const box = $('#subs'); if (!box) return;
  const def = CREWI[id];
  const e = el('div', 'sub ' + cls, `<b>${def ? def.name : '？？？'}</b>${text}`); box.appendChild(e);
  while (box.children.length > 2) box.removeChild(box.firstChild);
  setTimeout(() => e.classList.add('out'), 3000); setTimeout(() => e.remove(), 3500);
}
function sayMimic(id, text) {
  const box = $('#subs'); const def = CREWI[id];
  const e = el('div', 'sub mimic', `<b>「${def.name}」？</b>${text}`); box.appendChild(e);
  while (box.children.length > 2) box.removeChild(box.firstChild);
  setTimeout(() => e.classList.add('out'), 4200); setTimeout(() => e.remove(), 4700);
}
function bark(m, key, force) {
  if (!m || m.dead) return;
  if (!force && m.barkCd > 0) return;
  const set = BARK[key]; if (!set) return;
  const lines = set[m.id] || set.wei; if (!lines) return;
  m.barkCd = force ? 2 : 6;
  say(m.id, R.pick(lines));
}
function positionSubs() { const s = $('#subs'); if (!s) return; const land = VW / VH > 1.3; s.style.bottom = (land ? 84 : (UI.selBarH || 160) + 10) + 'px'; }

// ---------- HUD ----------
function buildHUD() {
  const cb = $('#crewbar'); cb.innerHTML = ''; UI.cards = [];
  W.crew.forEach((m, i) => {
    const d = CREW[i];
    const card = el('button', 'cc', `<div class="tk"></div><canvas width="96" height="74"></canvas><div class="meta"><div class="nm">${d.name}</div><div class="st"><span class="bpm">72</span><span class="hp"><i></i><i></i><i></i></span></div></div><div class="ico"></div><div class="bar" style="width:0"></div>`);
    card.addEventListener('click', e => { e.stopPropagation(); onCrewCard(i); });
    cb.appendChild(card);
    drawPortraitTo(card.querySelector('canvas'), d.id, null, true);
    UI.cards.push({ card, tk: card.querySelector('.tk'), bpm: card.querySelector('.bpm'), hp: card.querySelectorAll('.hp i'), ico: card.querySelector('.ico'), bar: card.querySelector('.bar'), cv: card.querySelector('canvas'), st: '' });
  });
  $('#b-pause').onclick = () => pauseGame(true);
  $('#b-zoom').onclick = () => { AU.ui('tap'); const fz = fitZoom(); if (CAM.tz > fz * 1.6) { CAM.tz = fz; CAM.freeT = 999; CAM.x = MAPW * T / 2; CAM.y = MAPH * T / 2; } else { CAM.tz = 1.15; CAM.freeT = 0; } };
  $('#b-bridge').onclick = () => { AU.ui('tap'); if (!bridgeOn()) { toast('艦橋主控台沒有人。派一個人到艦橋，點主控台坐上去。'); return; } UI.bridgeMode ? closeBridgeMode() : openBridgeMode(); };
  $('#b-vents').onclick = () => { AU.ui('tap'); UI.showVents = !UI.showVents; $('#b-vents').classList.toggle('on', UI.showVents); };
  $('#objbox').onclick = () => $('#objbox').classList.toggle('open');
  // 屏息：按住
  const br = $('#breath');
  const hold = on => e => { e.preventDefault(); e.stopPropagation(); if (W) W.breathHeld = on; br.classList.toggle('on', on); if (on) AU.ui('tap'); };
  br.onpointerdown = e => { try { br.setPointerCapture(e.pointerId); } catch (x) { } hold(true)(e); };
  br.onpointerup = br.onpointercancel = br.onlostpointercapture = hold(false);
  br.oncontextmenu = e => e.preventDefault();
}
function onCrewCard(i) {
  const m = W.crew[i];
  if (m.dead) return;
  if (m.cocoon >= 0) { CAM.focus = { x: m.x, y: m.y, t: 1.5 }; toast(CREW[i].name + '被包在巢裡。派人過去救他。'); return; }
  if (W.sel === i) { CAM.follow = i; CAM.freeT = 0; if (CAM.tz < .8) CAM.tz = 1.15; }
  selectCrew(i);
}
function selectCrew(i) {
  const m = W.crew[i];
  if (!m || m.dead) return;
  if (W.agent && W.agent.m === m && m.secret) { askConfront(m); }
  W.sel = i; CAM.follow = i; CAM.freeT = 0;
  UI.aimMode = null;
  AU.ui('sel'); bark(m, 'select');
  if (S.set.slowmo) S.slowT = 1.6;
  tut('move');
  refreshActbar(true);
}
function deselect() { W.sel = -1; UI.aimMode = null; refreshActbar(true); }
function updateHUD(dt) {
  UI.hudT -= dt; if (UI.hudT > 0) return; UI.hudT = .1;
  const A = ACTS[W.act];
  $('#act-n').textContent = A.n; $('#act-t').textContent = A.t; $('#clock').textContent = fmtT(W.t);
  $('#stage').textContent = W.beast ? STAGES[W.beast.stage].name : '';
  $('#parts').textContent = '⚙ ' + W.parts;
  // 目標
  const ob = $('#objbox');
  const info = W.objs.find(o => o.timer);
  let h = `<div class="oh"><span>目標 ${ob.classList.contains('open') ? '▴' : '▾'}</span><span class="tm">${info ? info.t : ''}</span></div>`;
  for (const o of W.objs) if (!o.timer) h += `<div class="o ${o.done ? 'done' : ''} ${o.opt ? 'opt' : ''}" style="${o.sub ? 'padding-left:10px' : ''}${o.bad ? ';color:#ff8080' : ''}${o.tip ? ';color:var(--amber)' : ''}"><i>${o.done ? '✓' : o.head ? '▸' : o.tip ? '!' : o.opt ? '◇' : '□'}</i><span>${o.t}</span></div>`;
  if (W.act === 1 && W.finalPlanReady) h += `<div style="margin-top:4px"><button class="abtn on" id="go-plan" style="height:34px;width:100%;flex-direction:row;gap:6px">執行最終計畫 ▶</button></div>`;
  if (ob.dataset.h !== h) { ob.innerHTML = h; ob.dataset.h = h; const gp = $('#go-plan'); if (gp) gp.onclick = e => { e.stopPropagation(); if (W.grabbing) return toast('先救人！', 'bad'); toInterlude(2); }; }
  // 艦橋鈕
  const bb = $('#b-bridge'); bb.classList.toggle('off', !bridgeOn()); bb.classList.toggle('on', UI.bridgeMode);
  // 船員卡
  W.crew.forEach((m, i) => {
    const C = UI.cards[i]; if (!C) return;
    const st = m.dead ? 'dead' : m.cocoon >= 0 ? 'cocoon' : m.hp < 3 ? 'hurt' : '';
    if (C.st !== st) { C.st = st; drawPortraitTo(C.cv, CREW[i].id, st === 'dead' ? 'dead' : st === 'hurt' ? 'hurt' : null, true); }
    C.card.classList.toggle('sel', W.sel === i);
    C.card.classList.toggle('dead', m.dead);
    C.card.classList.toggle('grab', m.grabbed || m.cocoon >= 0);
    C.card.classList.toggle('panic', !!m.panic);
    const b = Math.round(m.bpm);
    C.bpm.textContent = m.dead ? '—' : '♥' + b; C.bpm.className = 'bpm ' + (b >= 140 ? 'r' : b >= 105 ? 'y' : '');
    C.hp.forEach((e, k) => e.classList.toggle('x', k >= m.hp));
    let tk = m.dead ? (m.why || '死亡') : m.grabbed ? '被抓住了！' : m.cocoon >= 0 ? '巢裡 ' + Math.ceil(m.cocoon) + '秒' : m.secret ? '……？' : m.panic ? { scream: '尖叫', run: '逃跑', freeze: '嚇呆', rage: '失控' }[m.panic.type] : m.inVent ? '管道裡' : m.hidden ? (m.holding ? '屏息' : '躲藏') : m.task ? taskName(m.task) : m.drive && m.moving ? (m.driveRun ? '跑' : '走') : m.follow >= 0 ? '跟著' + CREW[m.follow].short : m.path ? (m.run ? '跑' : '走') : ROOMS[m.room] ? ROOMS[m.room].name : '';
    C.tk.textContent = tk;
    C.bar.style.width = m.task && m.task.dur < 1e6 ? clamp(m.task.t / m.task.dur, 0, 1) * 100 + '%' : '0';
    let ic = '';
    for (const s of m.inv) ic += `<span title="${ITEMS[s.it].name}" style="color:${ITEMS[s.it].rar >= 3 ? '#ffb03a' : ITEMS[s.it].rar === 2 ? '#5aa8ff' : '#ece4d2'}">${ITEMS[s.it].name[0]}</span>`;
    if (C.ico.dataset.h !== ic) { C.ico.innerHTML = ic; C.ico.dataset.h = ic; }
  });
  refreshActbar(false);
  const gb = $('#grab'); gb.classList.toggle('on', !!W.grabbing);
  if (W.grabbing) { const v = W.grabbing, helpers = W.crew.filter(o => o !== v && !o.dead && o.cocoon < 0 && dist(o.x, o.y, v.x, v.y) < T * 7 && (hasItem(o, 'flamer') || hasItem(o, 'prod') || hasItem(o, 'flare') || hasItem(o, 'harpoon'))); const left = Math.max(0, W.beast.grabT).toFixed(1);
    const txt = `<div class="gbx"><b>${CREW[v.ci].name}被抓住了！</b> ${left} 秒<br><span>${helpers.length ? '能救他的人：' + helpers.map(o => CREW[o.ci].name).join('、') + '（選他，按火焰／電擊棒／照明彈／魚叉）' : '附近沒有人帶著火、電擊棒、照明彈或魚叉……'}</span></div>`;
    if (gb.dataset.h !== txt) { gb.innerHTML = txt; gb.dataset.h = txt; } }
  else { const op = opportunity(); const txt = op ? `<div class="gbx op"><b>${op[0]}</b><br><span>${op[1]}</span></div>` : '';
    if (gb.dataset.h !== txt) { gb.innerHTML = txt; gb.dataset.h = txt; } }
  positionSubs();
  updateBreathUI();
  updateJoyHint();
}
// 屏息按鈕：有人躲著、牠就在旁邊時才出現
function updateBreathUI() {
  const br = $('#breath'); if (!br) return;
  const list = W.phase === 'play' ? W.crew.filter(m => !m.dead && breathDanger(m)) : [];
  const show = list.length > 0 || W.crew.some(m => m.holding);
  br.classList.toggle('hide', !show);
  if (!show) { if (W.breathHeld) { W.breathHeld = false; br.classList.remove('on'); } return; }
  document.documentElement.style.setProperty('--bh', (UI.selBarH || 160) + 'px');
  const m = list.sort((a, c) => a.breath - c.breath)[0] || W.crew.find(x => x.holding);
  const lvl = m ? clamp(m.breath, 0, 1) : 1;
  const f = br.querySelector('.rf'); if (f) f.style.strokeDashoffset = String(301.6 * (1 - lvl));
  br.classList.toggle('low', lvl < .3);
  br.classList.toggle('alert', !!(W.breathAlert && W.t - W.breathAlert.t < 2.6) && !W.breathHeld);
  const nm = list.length === 1 ? CREW[list[0].ci].name : list.length > 1 ? list.length + ' 人' : '';
  const sm = br.querySelector('small'); const txt = m && m.gaspT > 0 ? '喘不過氣' : W.breathHeld ? (nm || '屏息中') : '按住・' + nm;
  if (sm.textContent !== txt) sm.textContent = txt;
}
// 搖桿提示：還沒用過搖桿的人，選人時在左下角畫一個淡淡的圈
function updateJoyHint() {
  const jh = $('#joyhint'); if (!jh) return;
  const m = W.sel >= 0 ? W.crew[W.sel] : null;
  const show = !G.joyUsed && m && W.phase === 'play' && !UI.bridgeMode && joyFree(m) && JOY.id == null;
  jh.classList.toggle('hide', !show);
  if (show) { const p = joyHome(); jh.style.left = p[0] + 'px'; jh.style.top = p[1] + 'px'; }
}
function opportunity() {
  const b = W.beast; if (!b || b.inVent || W.phase !== 'play') return null;
  const ri = beastRoom(b);
  if (W.act === 2 && W.plan === 'airlock' && ri === ROOM.airlock.i) {
    const steps = [];
    if (SHIP.door.a_in.state === 'open') steps.push('關上氣閘內門');
    if (!SHIP.vnode.va.sealed && !SHIP.dampers.D9.closed) steps.push('關上 D9 閘門');
    if (!W.power.on.airlock) steps.push('電力打開「氣閘」');
    steps.push('打開外門');
    return ['牠在氣閘裡！', steps.join(' → ')];
  }
  if (W.act === 2 && W.plan === 'burn' && b.visible && isTrapped(b)) return ['牠被困住了！', '用火燒牠，燒到牠倒下'];
  if (W.act === 0 && b.visible && isTrapped(b)) return ['牠被困在這個房間了！', '牠還小——用電擊棒、火或魚叉解決牠'];
  return null;
}
function taskName(k) { return { search: '搜索', weld: '焊門', cut: '切焊道', seal: '焊格柵', unseal: '撬格柵', repair: '修理', craft: '合成', heal: '治療', healOther: '治療', free: '救人', bridge: '操作艦橋', auth: '授權', selfdestruct: '啟動自毀', overload: '超載', lever: '拉拉桿', sabotage: '……', fire: '噴火', crawl: '爬管道', suit: '穿太空衣', board: '上艇' }[k.type] || ''; }

// ---------- 行動列 ----------
function refreshActbar(force) {
  const bar = $('#actbar');
  const m = W.sel >= 0 ? W.crew[W.sel] : null;
  const acts = m && !m.dead ? crewButtons(m) : [];
  const key = acts.map(a => a.id + (a.on ? 1 : 0) + (a.dis ? 1 : 0) + (a.ct || '') + a.label).join('|') + (UI.aimMode ? UI.aimMode.kind : '');
  if (!force && bar.dataset.k === key) return;
  bar.dataset.k = key; bar.innerHTML = '';
  for (const a of acts) {
    const b = el('button', 'abtn' + (a.on ? ' on' : '') + (a.warn ? ' warn' : '') + (a.rar ? ' r' + a.rar : '') + (UI.aimMode && UI.aimMode.id === a.id ? ' arm' : ''), `${icon(a.icon)}<span>${a.label}</span>${a.ct != null ? `<span class="ct">${a.ct}</span>` : ''}`);
    b.disabled = !!a.dis;
    b.addEventListener('click', e => { e.stopPropagation(); AU.ui('tap'); a.fn(); refreshActbar(true); });
    bar.appendChild(b);
  }
  const hint = $('#hint');
  let ht = '';
  if (UI.aimMode) ht = UI.aimMode.hint;
  else if (m && m.inVent) ht = '點一個格柵，阿傑會從管道爬過去';
  else if (!m && W.phase === 'play' && W.t < 40) ht = '點船員卡選人';
  else if (m && !G.joyUsed && joyFree(m) && !UI.bridgeMode) ht = '左半邊按住拖曳＝搖桿　點地板＝走過去';
  else if (UI.bridgeMode) ht = '艦橋模式：點門開關門、點閘門（D1～D10）開關、點房間開燈或響警報';
  hint.textContent = ht; hint.classList.toggle('hide', !ht);
  UI.selBarH = $('#bottom').offsetHeight;
}
function crewButtons(m) {
  const out = [];
  if (m.grabbed || m.cocoon >= 0) return out;
  if (m.inVent) { out.push({ id: 'cancel', icon: 'x', label: '取消', fn: () => { } }); return out; }
  out.push({ id: 'run', icon: m.run ? 'run' : 'walk', label: m.run ? '用跑的' : '用走的', on: m.run, fn: () => { m.run = !m.run; toast(m.run ? '跑步：快，但很吵（聲波四格）。' : '走路：安靜。'); } });
  out.push({ id: 'stance', icon: m.stance === 'guard' ? 'guard' : 'stop', label: m.stance === 'guard' ? '警戒' : '待命', on: m.stance === 'guard', fn: () => { m.stance = m.stance === 'guard' ? 'hold' : 'guard'; toast(m.stance === 'guard' ? '警戒：看到牠會自己開火、救人、逃跑。' : '待命：不會自己亂跑，也不會被聲音騙過去。'); } });
  if (m.hidden) out.push({ id: 'unhide', icon: 'unhide', label: '出來', on: true, fn: () => { unhide(m); } });
  else {
    const h = nearestProp(m, 'hide', T * 2.4);
    if (h && h.occ == null) out.push({ id: 'hide', icon: 'hide', label: '躲進' + shortName(h.name), fn: () => { orderDo(m, 'hide', h); bark(m, 'hide'); } });
    const bx = nearestProp(m, 'box', T * 2.6, p => !p.searched);
    if (bx) out.push({ id: 'search', icon: 'search', label: '搜' + shortName(bx.name), fn: () => orderDo(m, 'search', bx) });
    const cn = nearestProp(m, 'con', T * 2.2);
    if (cn) { const lab = conLabel(m, cn); if (lab) out.push({ id: 'con', icon: lab[1], label: lab[0], on: lab[2], fn: () => orderDo(m, 'con', cn) }); }
    const g = nearestVentNode(m, T * 1.8);
    if (g && m.id === 'jie' && !g.sealed) out.push({ id: 'crawl', icon: 'vent', label: '鑽管道', fn: () => orderDo(m, 'grate', g, { act: 'crawl' }) });
    // 腳邊的道具
    const fi = W.items.filter(i => dist(i.x, i.y, m.x, m.y) < T * 1.3).sort((a, b) => dist(a.x, a.y, m.x, m.y) - dist(b.x, b.y, m.x, m.y))[0];
    if (fi) out.push({ id: 'pick', icon: fi.it, label: '撿' + ITEMS[fi.it].name.slice(0, 3), fn: () => pickUp(m, fi) });
    // 站在門邊：直接開關門（甩上門擋牠）
    const dr = nearestDoor(m, T * 1.25);
    if (dr && !dr.broken && !dr.welded && !dr.jam) out.push({ id: 'door', icon: 'door', label: dr.state === 'open' ? '關門' : '開門', fn: () => { if (dist(m.x, m.y, dr.x, dr.y) < T * 1.3 && !m.task) { setDoor(dr, dr.state !== 'open'); m.ang = Math.atan2(dr.y - m.y, dr.x - m.x); } else orderDo(m, 'door', dr, { act: dr.state === 'open' ? 'close' : 'open' }); } });
  }
  // 道具
  m.inv.forEach((s, i) => {
    const D = ITEMS[s.it];
    const ct = D.stack ? s.n : D.charges ? s.ch : D.fuel != null && s.it === 'flamer' ? Math.round(s.fuel) + '%' : null;
    out.push({ id: 'it' + i, icon: s.it, label: D.name.length > 4 ? D.name.slice(0, 4) : D.name, ct, rar: D.rar, fn: () => useItemUI(m, i) });
  });
  // 小隊
  const fol = followersOf(m);
  if (fol.length) out.push({ id: 'follow', icon: 'group', label: '解散', on: true, ct: fol.length, fn: () => dismissFollow(m) });
  else if (!m.hidden) { const fc = followCandidates(m); if (fc.length) { out.push({ id: 'follow', icon: 'group', label: '叫大家跟上', ct: fc.length, fn: () => callFollow(m) }); tut('follow'); } }
  const mates = W.crew.filter(o => o !== m && !o.dead && o.cocoon < 0 && dist(o.x, o.y, m.x, m.y) < T * 1.8);
  if (mates.length && m.inv.length) out.push({ id: 'give', icon: 'give', label: '給', fn: () => giveMenu(m, mates) });
  // 巢
  const cc = W.crew.find(o => o.cocoon >= 0 && dist(o.x, o.y, m.x, m.y) < T * 3);
  if (cc) out.push({ id: 'free', icon: 'cut', label: '救' + CREW[cc.ci].short, warn: true, fn: () => orderDo(m, 'nest', cc, { victim: cc }) });
  if (W.sys.sabotaged && cn && ((W.sys.sabotaged === 'airlock' && cn.fn === 'airlock') || (W.sys.sabotaged === 'shuttle' && cn.fn === 'shuttle'))) out.push({ id: 'unsab', icon: 'repair', label: '重修', warn: true, fn: () => { if (W.parts < 2) return toast('要 ⚙ ×2', 'bad'); W.parts -= 2; startTask(m, 'repair', 6, { what: W.sys.sabotaged === 'airlock' ? 'airlock' : 'shuttle', aim: true }); W.sys.sabotaged = null; } });
  return out;
}
function shortName(n) { return n.length > 4 ? n.slice(0, 4) : n; }
function conLabel(m, c) {
  switch (c.fn) {
    case 'bridge': return [W.bridgeOp === m.ci ? '操作中' : '坐鎮艦橋', 'bridge', W.bridgeOp === m.ci];
    case 'power': return ['電力配置', 'power'];
    case 'craft': return ['工作台', 'craft'];
    case 'heal': return ['醫療台', 'heal'];
    case 'dampers': return ['閘門控制', 'vent'];
    case 'comms': return ['通訊台', 'comms'];
    case 'container': return ['看貨櫃', 'eye'];
    case 'airlock': return W.sys.lock ? ['封鎖中', 'airlock'] : W.sys.airlock ? (W.act === 2 && W.plan === 'airlock' ? ['拉下拉桿', 'airlock', true] : ['氣閘控制盤', 'airlock']) : ['修氣閘 ⚙3', 'repair'];
    case 'shuttle': return W.sys.lock ? ['封鎖中', 'shuttle'] : W.sys.shuttle ? (W.act === 2 && W.plan === 'abandon' ? (m.aboard ? ['發射', 'shuttle', true] : ['上艇', 'shuttle', true]) : ['逃生艇', 'shuttle']) : ['修逃生艇 ⚙5', 'repair'];
    case 'selfdestruct': return W.act === 2 && W.plan === 'abandon' && W.sys.sd < 0 ? ['啟動自毀', 'selfdestruct', true] : m.id === 'deng' ? ['反應爐超載', 'power'] : ['自毀裝置', 'selfdestruct'];
  }
  return null;
}
function nearestProp(m, k, r, f) { let best = null, bd = r; for (const p of SHIP.props) { if (p.k !== k || (f && !f(p))) continue; if (p.room !== m.room && dist(m.x, m.y, p.sx, p.sy) > T) continue; const d = dist(m.x, m.y, p.sx, p.sy); if (d < bd) { bd = d; best = p; } } return best; }
function nearestVentNode(m, r) { let best = null, bd = r; for (const n of SHIP.vn) { const d = dist(m.x, m.y, n.x, n.y); if (d < bd) { bd = d; best = n; } } return best; }
function useItemUI(m, slot) {
  const s = m.inv[slot]; if (!s) return;
  const it = s.it, D = ITEMS[it];
  if (UI.aimMode && UI.aimMode.id === 'it' + slot) { UI.aimMode = null; return; }
  switch (D.use) {
    case 'throw': UI.aimMode = { id: 'it' + slot, kind: 'throw', it, m, hint: '點地圖：把' + D.name + '丟到那裡（6 格內）' }; break;
    case 'melee': if (!useProd(m)) { } break;
    case 'shoot': shootHarpoon(m); break;
    case 'fire': startFire(m); break;
    case 'place': if (it === 'fuel' && hasItem(m, 'flamer') && hasItem(m, 'flamer').fuel < 40) { takeItem(m, 'fuel'); hasItem(m, 'flamer').fuel = Math.min(100, hasItem(m, 'flamer').fuel + 60); toast('噴火器加了油。'); } else placeTrap(m, it); break;
    case 'heal': { const tg = m.hp < 3 ? m : W.crew.find(o => o !== m && !o.dead && o.cocoon < 0 && o.hp < 3 && dist(o.x, o.y, m.x, m.y) < T * 1.8); if (!tg) return toast('身邊沒有人受傷。'); useMedkit(m, tg); break; }
    case 'self': { const tg = W.crew.filter(o => !o.dead && o.cocoon < 0 && dist(o.x, o.y, m.x, m.y) < T * 1.8).sort((a, b) => b.bpm - a.bpm)[0] || m; useSedative(m, tg); break; }
    case 'tool': { const d = nearestDoor(m, T * 1.6), g = nearestVentNode(m, T * 1.6); if (g && (!d || dist(m.x, m.y, g.x, g.y) < dist(m.x, m.y, d.x, d.y))) orderDo(m, 'grate', g, { act: g.sealed ? 'unseal' : 'seal' }); else if (d) orderDo(m, 'door', d, { act: d.welded ? 'cut' : 'weld' }); else UI.aimMode = { id: 'it' + slot, kind: 'weld', it, m, hint: '點一扇門或一個格柵：走過去把它焊死' }; break; }
    case 'passive': toast(D.desc); break;
    default: toast(D.desc);
  }
}
function nearestDoor(m, r) { let best = null, bd = r; for (const d of SHIP.doors) { if (d.kind === 'airout') continue; const dd = dist(m.x, m.y, d.x, d.y); if (dd < bd) { bd = dd; best = d; } } return best; }
function giveMenu(m, mates) {
  const items = m.inv.map(s => s.it);
  const opts = [];
  for (const o of mates) for (const it of items) opts.push({ label: `把${ITEMS[it].name}給${CREW[o.ci].name}`, fn: () => doGive(m, o, it) });
  showMenu('交給誰', opts, VW / 2, VH * .55);
}
function showMenu(title, opts, x, y) {
  const pm = $('#pmenu'); pm.innerHTML = `<div class="t">${title}</div>`;
  for (const o of opts) { const b = el('button', o.cls || '', o.label + (o.sub ? `<small>${o.sub}</small>` : '')); b.disabled = !!o.dis; b.onclick = e => { e.stopPropagation(); hideMenu(); AU.ui('tap'); o.fn(); refreshActbar(true); }; pm.appendChild(b); }
  const cancel = el('button', '', '取消'); cancel.onclick = e => { e.stopPropagation(); hideMenu(); }; pm.appendChild(cancel);
  pm.classList.remove('hide');
  const w = pm.offsetWidth, h = pm.offsetHeight;
  pm.style.left = clamp(x - w / 2, 8, VW - w - 8) + 'px'; pm.style.top = clamp(y - h - 16, 60, VH - h - 8) + 'px';
  UI.menuOpen = true;
}
function hideMenu() { $('#pmenu').classList.add('hide'); UI.menuOpen = false; }

// ---------- 點地圖 ----------
function handleTap(sx, sy, dbl) {
  if (!W || W.phase !== 'play') return;
  if (UI.menuOpen) { hideMenu(); return; }
  const [wx, wy] = s2w(sx, sy);
  const px = 1 / CAM.z;
  const m = W.sel >= 0 ? W.crew[W.sel] : null;
  // 瞄準
  if (UI.aimMode) {
    const a = UI.aimMode; UI.aimMode = null;
    if (a.kind === 'throw') { if (!a.m.dead) throwItem(a.m, a.it, wx, wy); }
    else if (a.kind === 'weld') { const d = hitDoor(wx, wy, 22 * px), g = hitGrate(wx, wy, 24 * px); if (g) orderDo(a.m, 'grate', g, { act: g.sealed ? 'unseal' : 'seal' }); else if (d) orderDo(a.m, 'door', d, { act: d.welded ? 'cut' : 'weld' }); else toast('那裡沒有門或格柵。'); }
    refreshActbar(true); return;
  }
  // 艦橋模式
  if (UI.bridgeMode) {
    const d = hitDoor(wx, wy, 20 * px); if (d) { if (d.kind === 'airout') { remoteOuter(); } else remoteDoor(d); return; }
    const dm = hitDamper(wx, wy, 18 * px); if (dm) { remoteDamper(dm); return; }
    const r = roomAt(wx, wy); if (r) { roomMenu(r, sx, sy); return; }
    return;
  }
  // 點船員
  const hc = hitCrew(wx, wy, Math.max(26, 30 * px));
  if (hc && hc !== m) {
    if (m && !hc.dead && dist(m.x, m.y, hc.x, hc.y) < T * 2 && (hc.hp < 3 || hc.bpm > 120) && (hasItem(m, 'medkit') || hasItem(m, 'sedative'))) {
      const opts = [{ label: '選' + CREW[hc.ci].name, fn: () => selectCrew(hc.ci) }];
      if (hasItem(m, 'medkit') && hc.hp < 3) opts.push({ label: '幫' + CREW[hc.ci].name + '包紮', fn: () => useMedkit(m, hc) });
      if (hasItem(m, 'sedative')) opts.push({ label: '給' + CREW[hc.ci].name + '打鎮定劑', fn: () => useSedative(m, hc) });
      showMenu(CREW[hc.ci].name, opts, sx, sy); return;
    }
    if (!hc.dead && hc.cocoon < 0) { selectCrew(hc.ci); return; }
  }
  if (!m) {
    const d = hitDoor(wx, wy, 18 * px);
    if (d && bridgeOn() && W.power.on.doors) { remoteDoor(d); return; }
    toast('先點船員卡選一個人。'); return;
  }
  if (m.inVent) { const g = hitGrate(wx, wy, 30 * px); if (g) crawlTo(m, g); else toast('點一個格柵當出口。'); return; }
  if (m.grabbed) return;
  // 巢裡的人
  const cc = W.crew.find(o => o.cocoon >= 0 && dist(o.x, o.y, wx, wy) < 30);
  if (cc) { orderDo(m, 'nest', cc, { victim: cc }); bark(m, 'move'); return; }
  // 門
  const d = hitDoor(wx, wy, 20 * px);
  if (d) { doorMenu(m, d, sx, sy); return; }
  // 格柵
  const g = hitGrate(wx, wy, 18 * px);
  if (g && (hasItem(m, 'welder') || m.id === 'jie')) { grateMenu(m, g, sx, sy); return; }
  // 物件
  const p = hitProp(wx, wy, 22 * px);
  if (p) {
    if (p.k === 'box') { if (p.searched) toast('這裡翻過了。'); else orderDo(m, 'search', p); }
    else if (p.k === 'hide') { if (m.hidden === p) unhide(m); else orderDo(m, 'hide', p); }
    else if (p.k === 'con') orderDo(m, 'con', p);
    bark(m, 'move'); return;
  }
  // 地上的道具
  const it = W.items.find(i => dist(i.x, i.y, wx, wy) < 26);
  if (it) { orderDo(m, 'item', it); return; }
  // 地板
  if (!roomAt(wx, wy)) return;
  if (orderMove(m, wx, wy, dbl || m.run)) { bark(m, 'move'); W.fx.push({ type: 'tapmark', x: wx, y: wy, t: 0, dur: .5 }); if (W.sel >= 0) S.slowT = 0; }
}
function hitCrew(x, y, r) { let best = null, bd = r; for (const m of W.crew) { if (m.dead) continue; const d = dist(m.x, m.y, x, y); if (d < bd) { bd = d; best = m; } } return best; }
function hitDoor(x, y, r) { let best = null, bd = Math.max(r, 14); for (const d of SHIP.doors) { const dd = dist(d.x, d.y, x, y); if (dd < bd) { bd = dd; best = d; } } return best; }
function hitDamper(x, y, r) { let best = null, bd = Math.max(r, 14); for (const id in SHIP.dampers) { const dm = SHIP.dampers[id]; const dd = dist(dm.x, dm.y, x, y); if (dd < bd) { bd = dd; best = dm; } } return best; }
function hitGrate(x, y, r) { let best = null, bd = Math.max(r, 16); for (const n of SHIP.vn) { const dd = dist(n.x, n.y, x, y); if (dd < bd) { bd = dd; best = n; } } return best; }
function hitProp(x, y, r) { let best = null, bd = Math.max(r, 20); for (const p of SHIP.props) { const dd = Math.min(dist(p.px, p.py, x, y), dist(p.sx, p.sy, x, y)); if (dd < bd) { bd = dd; best = p; } } return best; }
function doorMenu(m, d, sx, sy) {
  if (d.kind === 'airout') { toast('氣閘外門：第三幕「拋出去」時，從艦橋或氣閘控制盤打開。'); return; }
  const opts = [];
  if (d.broken) { toast('這扇門被撞爛了，關不上。'); return; }
  if (d.welded) { if (hasItem(m, 'welder')) opts.push({ label: '切開焊道', sub: '要 4 秒', fn: () => orderDo(m, 'door', d, { act: 'cut' }) }); else { toast('門焊死了。要焊槍才切得開。'); return; } }
  else {
    opts.push({ label: d.state === 'open' ? '過去關門' : '過去開門', fn: () => orderDo(m, 'door', d, { act: d.state === 'open' ? 'close' : 'open' }) });
    if (hasItem(m, 'welder')) opts.push({ label: '焊死這扇門', sub: (m.id === 'deng' ? 3 : 6) + ' 秒・很吵', fn: () => orderDo(m, 'door', d, { act: 'weld' }) });
    if (bridgeOn() && W.power.on.doors) opts.unshift({ label: (d.state === 'open' ? '遠端關門' : '遠端開門'), sub: '艦橋', fn: () => remoteDoor(d) });
  }
  if (opts.length === 1) { opts[0].fn(); return; }
  showMenu(doorName(d), opts, sx, sy);
}
function grateMenu(m, g, sx, sy) {
  const opts = [];
  if (hasItem(m, 'welder')) opts.push({ label: g.sealed ? '撬開格柵' : '焊死格柵', sub: g.sealed ? '3 秒' : (m.id === 'deng' ? 2 : 4) + ' 秒・很吵', fn: () => orderDo(m, 'grate', g, { act: g.sealed ? 'unseal' : 'seal' }) });
  if (m.id === 'jie' && !g.sealed) opts.push({ label: '鑽進通風管', sub: '阿傑', fn: () => orderDo(m, 'grate', g, { act: 'crawl' }) });
  opts.push({ label: '走到這裡', fn: () => orderMove(m, g.x, g.y, m.run) });
  showMenu('通風格柵', opts, sx, sy);
}
function roomMenu(r, sx, sy) {
  const L = W.lights[r.i];
  const opts = [
    { label: L.on ? '關燈' : '開燈', sub: W.power.on.lights ? '' : '照明沒電', dis: L.broken, fn: () => remoteLight(r.i) },
    { label: '在這裡響警報', sub: W.learn.alarm >= 3 ? '牠已經不理了' : '引牠過來', fn: () => remoteAlarm(r.i) },
    { label: '派小蝸過去', sub: W.bot.dead ? '小蝸壞了' : (W.learn.bot ? '牠已經不理了' : '一路嗶嗶叫'), dis: W.bot.dead, fn: () => remoteBot(r.i) },
  ];
  showMenu(r.name, opts, sx, sy);
}

// ---------- 艦橋模式 ----------
function openBridgeMode() {
  UI.bridgeMode = true; UI._z = CAM.tz; CAM.tz = fitZoom(); CAM.freeT = 999; CAM.x = MAPW * T / 2; CAM.y = MAPH * T / 2;
  renderBridgePanel(); $('#pbridge').classList.remove('hide'); tut('bridge2');
}
function closeBridgeMode() { UI.bridgeMode = false; CAM.tz = UI._z || 1; CAM.freeT = 0; $('#pbridge').classList.add('hide'); }
UI.closeBridge = () => { if (UI.bridgeMode) closeBridgeMode(); };
function renderBridgePanel() {
  const p = $('#pbridge'); const op = W.crew[W.bridgeOp];
  const isCapt = op && op.id === 'wei';
  let h = `<h3><span>艦橋控制 <small>${op ? CREW[op.ci].name + ' 操作中' : ''}</small></span><button class="x" id="pb-x">✕</button></h3><div class="row">`;
  h += `<button id="pb-power">電力配置<small>${powerUsed()}/${powerCap()} 格</small></button>`;
  h += `<button id="pb-auth" ${W.sys.auth ? 'disabled' : ''} class="${isCapt && !W.sys.auth ? 'go' : ''}">${W.sys.auth ? '氣閘已授權' : '授權氣閘'}<small>${!W.sys.airlock ? '先修控制盤' : isCapt ? '艦長 8 秒' : '要艦長來坐'}</small></button>`;
  if (W.act === 2 && W.plan === 'airlock') h += `<button id="pb-outer" class="go">打開外門<small>內門要先關</small></button>`;
  h += `<button id="pb-sens" disabled>感測器<small>${W.sys.sensorsBroken ? '故障' : W.power.on.sensors ? '掃描中' : '沒電'}</small></button>`;
  h += `</div>`;
  p.innerHTML = h;
  $('#pb-x').onclick = () => closeBridgeMode();
  $('#pb-power').onclick = () => UI.openPower(op);
  const au = $('#pb-auth'); if (au) au.onclick = () => { if (!W.sys.airlock) return toast('氣閘控制盤還沒修好，沒東西可以授權。先到貨艙修控制盤（⚙4）。', 'bad'); if (!isCapt) return toast('只有艦長能授權。讓魏子葳坐上艦橋主控台。', 'bad'); startTask(op, 'auth', 8, {}); closeBridgeMode(); };
  const ou = $('#pb-outer'); if (ou) ou.onclick = () => remoteOuter();
}
// 授權會中斷艦橋操作，結束後回到主控台
// ---------- 面板 ----------
UI.openPower = m => {
  const p = $('#ppower');
  const draw = () => {
    let h = `<h3><span>電力配置 <small>REACTOR</small></span><button class="x" id="pp-x">✕</button></h3>`;
    h += `<div class="pcap">${Array.from({ length: powerCap() }, (_, i) => `<i class="${i < powerUsed() ? 'u' : ''}"></i>`).join('')}<span style="margin-left:6px">${powerUsed()} / ${powerCap()} 格${W.power.over > 0 ? '（超載中）' : ''}</span></div>`;
    for (const s of SYSTEMS) h += `<div class="prow"><div class="pn">${s.name}<small>${s.desc}</small></div><div class="pp">${Array.from({ length: s.cost }, () => `<i class="${W.power.on[s.id] ? 'on' : ''}"></i>`).join('')}</div><button data-s="${s.id}" class="${W.power.on[s.id] ? 'on' : ''}">${W.power.on[s.id] ? '開' : '關'}</button></div>`;
    p.innerHTML = h;
    $('#pp-x').onclick = () => p.classList.add('hide');
    p.querySelectorAll('button[data-s]').forEach(b => b.onclick = () => { if (!togglePower(b.dataset.s)) toast('電力不夠。先關掉別的系統。', 'bad'); draw(); });
  };
  draw(); p.classList.remove('hide');
};
UI.openCraft = m => {
  const p = $('#pcraft');
  const draw = () => {
    let h = `<h3><span>工作台 <small>⚙ ${W.parts}</small></span><button class="x" id="pc-x">✕</button></h3><p>${CREW[m.ci].name}在工作台前。${m.id === 'jie' ? '阿傑做東西快一倍。' : ''}</p>`;
    for (const r of RECIPES) {
      const D = ITEMS[r.out], need = r.need ? ITEMS[r.need].name : null;
      const ok = W.parts >= r.parts && (!r.need || hasItem(m, r.need));
      h += `<div class="crow"><div class="ci">${icon(r.out)}</div><div class="cn">${D.name}<small>⚙${r.parts}${need ? '＋手上的' + need : ''}・${r.t * (m.id === 'jie' ? .5 : 1)} 秒<br>${D.desc}</small></div><button data-r="${r.id}" ${ok ? '' : 'disabled'}>合成</button></div>`;
    }
    p.innerHTML = h;
    $('#pc-x').onclick = () => p.classList.add('hide');
    p.querySelectorAll('button[data-r]').forEach(b => b.onclick = () => { startCraft(m, b.dataset.r); p.classList.add('hide'); refreshActbar(true); });
  };
  draw(); p.classList.remove('hide');
};
UI.openDampers = m => {
  UI.bridgeMode = true; UI.localDampers = true; UI._z = CAM.tz; CAM.tz = fitZoom(); CAM.freeT = 999; CAM.x = MAPW * T / 2; CAM.y = MAPH * T / 2;
  const p = $('#pbridge'); p.innerHTML = `<h3><span>通風閘門控制盤 <small>${CREW[m.ci].name}</small></span><button class="x" id="pb-x">✕</button></h3><p>點地圖上的 D1～D10 開關閘門。關著的閘門牠過不去（但逼急了會撞開）。</p>`;
  p.classList.remove('hide');
  $('#pb-x').onclick = () => { UI.localDampers = false; closeBridgeMode(); };
};
// 閘門控制盤：在維生室也能開關（不用艦橋）
const _remoteDamper = remoteDamper;
remoteDamper = function (dm) {
  if (UI.localDampers) { const m = W.crew.find(o => !o.dead && o.room === ROOM.life.i); if (m) { toggleDamper(dm); return; } }
  _remoteDamper(dm);
};
UI.listenBeacon = () => { W.phase = 'scene'; playScene(BEACON_SCENE, () => { W.phase = 'play'; W.logs.includes('L01') || W.logs.push('L01'); toast('調查檔案：靜海號的求救訊號', 'loot r2'); }); };
UI.lookContainer = () => { W.phase = 'scene'; playScene(CONTAINER_SCENE, () => { W.phase = 'play'; W.logs.includes('L02') || W.logs.push('L02'); toast('調查檔案：貨櫃標籤 M-9', 'loot r2'); chron('有人在貨櫃上發現：溫度三天前被醫務室的代碼調高過。'); }); };
UI.launchAsk = () => {
  const aboard = W.crew.filter(m => m.aboard && !m.dead).length, alive = aliveCrew().length;
  showMenu(`艇上 ${aboard} 人／還活著 ${alive} 人`, [{ label: '發射逃生艇', sub: alive > aboard ? '還有人沒上來！' : '全員到齊', cls: alive > aboard ? 'd' : '', fn: () => launchShuttle() }], VW / 2, VH * .6);
};
UI.confession = () => { W.phase = 'scene'; playScene([{ who: 'wen', t: '……好。我說。' }, { nar: '溫曼從口袋裡拿出一張摺得很小的紙。' }, { who: 'wen', t: '公司要牠活著回去。我兒子的醫藥費在他們手上。貨櫃的溫度……是我調的。我以為牠只是一個樣本。' }, { who: 'wei', t: '收起來。活下去以後，妳要把這張紙交給對的人。' }], () => { W.phase = 'play'; W.logs.includes('L08') || W.logs.push('L08'); toast('調查檔案：衡宇集團 特別命令 937', 'loot r3'); }); };
function askConfront(m) {
  showMenu('溫曼在做什麼？', [{ label: '叫住她：「妳要去哪？」', fn: () => { if (!confront(m)) toast('她停了下來。'); } }], VW / 2, VH * .55);
}
UI.onAct = () => { refreshActbar(true); };

// ---------- 劇情播放 ----------
function playScene(lines, done, opts = {}) {
  const sc = $('#s-scene'); sc.classList.remove('hide');
  sc.innerHTML = `<div class="scr-in"><div class="sc-head">${opts.head || ''}</div><div id="sc-lines" style="display:flex;flex-direction:column;gap:9px"></div><div id="sc-foot" style="margin-top:6px"></div></div>`;
  const box = $('#sc-lines'), foot = $('#sc-foot');
  let k = 0;
  const next = () => {
    if (k >= lines.length) { if (opts.choices) { showChoices(opts.choices, foot, c => { sc.classList.add('hide'); done && done(c); }); } else { sc.classList.add('hide'); done && done(); } return; }
    const L = lines[k++];
    const row = el('div', 'line' + (L.nar ? ' nar' : ''));
    if (L.nar) row.innerHTML = `<div class="bub">${L.nar}</div>`;
    else { const def = CREWI[L.who]; row.innerHTML = `<canvas width="108" height="132"></canvas><div class="bub"><b>${def.name}・${def.role}</b>${L.t}</div>`; drawPortraitTo(row.querySelector('canvas'), L.who, null, false); }
    box.appendChild(row);
    while (box.children.length > 5) box.removeChild(box.firstChild);
    foot.innerHTML = `<div class="tapnext">點一下繼續</div>`;
    AU.ui('tap');
  };
  sc.onclick = e => { if (e.target.closest('.choice')) return; if (foot.querySelector('.choices')) return; next(); };
  next();
}
function showChoices(choices, foot, cb) {
  foot.innerHTML = ''; const box = el('div', 'choices'); foot.appendChild(box);
  for (const c of choices) {
    const b = el('button', 'choice', `<b>${c.name}</b><small>${c.sub}</small>${c.req ? `<span class="req">${c.req}</span>` : ''}`);
    b.disabled = !!c.dis;
    b.onclick = e => { e.stopPropagation(); AU.ui('ok'); cb(c); };
    box.appendChild(b);
  }
}
UI.interlude = n => {
  hideMenu(); closeBridgeMode(); $('#ppower').classList.add('hide'); $('#pcraft').classList.add('hide');
  const lines = interludeLines(n);
  if (n === 1) {
    playScene(lines, c => { W.stance = c.id; chron('魏子葳做了決定：' + c.name + '。'); saveCkpt(1); startAct(1); toast('第二幕：牠長大了。', 'bad'); }, { head: `<span class="lbl">INTERLUDE</span><h2>蛻下來的殼</h2><div class="sub2">選擇接下來的方針</div>`, choices: STANCES.map(s => ({ ...s })) });
  } else {
    const ch = Object.keys(PLANS).map(id => {
      const P = PLANS[id], ok = planReady(id);
      return { id, name: P.name, sub: P.sub, dis: !ok, req: ok ? '' : id === 'airlock' ? '需要：修好氣閘控制盤＋艦長授權' : id === 'burn' ? '需要：兩把火焰噴射器，或一把加一罐燃料罐' : id === 'abandon' ? '需要：修好逃生艇' : '' };
    });
    playScene(lines, c => { W.plan = c.id; chron('最後的計畫：' + c.name + '。'); saveCkpt(2); startAct(2); toast('第三幕：' + c.name + '。', 'bad'); }, { head: `<span class="lbl">INTERLUDE</span><h2>最後的計畫</h2><div class="sub2">只有一次機會</div>`, choices: ch });
  }
};
UI.shuttleEnding = () => {
  if (!W.stowaway) { endRun('abandon'); return; }
  shuttleFinale();
};
// 逃生艇上的最後一場
function shuttleFinale() {
  const aboard = W.crew.filter(m => m.aboard && !m.dead);
  const armed = aboard.find(m => hasItem(m, 'harpoon') || hasItem(m, 'flamer') || hasItem(m, 'flare') || hasItem(m, 'prod'));
  let suited = false;
  const sc = $('#s-scene'); sc.classList.remove('hide');
  const stage = (head, text, opts, secs, onTimeout) => {
    sc.innerHTML = `<div class="scr-in"><div class="sc-head"><span class="lbl">LIFEBOAT NH-1</span><h2>${head}</h2></div><div class="line nar"><div class="bub" style="font-size:16px">${text}</div></div><div style="height:6px;background:#2a3340;border-radius:3px;overflow:hidden"><div id="fz-bar" style="height:100%;width:100%;background:var(--red)"></div></div><div class="choices" id="fz-c"></div></div>`;
    const cb = $('#fz-c'); let done = false; const t0 = performance.now();
    for (const o of opts) { const b = el('button', 'choice', `<b>${o.name}</b><small>${o.sub || ''}</small>`); b.disabled = !!o.dis; b.onclick = () => { if (done) return; done = true; AU.ui('ok'); o.fn(); }; cb.appendChild(b); }
    const tick = () => { if (done) return; const u = (performance.now() - t0) / 1000 / secs; const bar = $('#fz-bar'); if (bar) bar.style.width = Math.max(0, 100 - u * 100) + '%'; if (u >= 1) { done = true; onTimeout(); return; } requestAnimationFrame(tick); };
    requestAnimationFrame(tick); AU.stinger(2);
  };
  const lose = (who, why) => { killCrew(who, why); };
  const finish = () => { sc.classList.add('hide'); endRun(aliveCrew().filter(m => m.aboard).length ? 'stowaway' : 'lost'); };
  const step3 = () => stage('艙門', '牠被逼到艙門前，冠全張開了。你的手放在緊急洩壓的拉桿上。' + (suited ? '' : '<br><b style="color:#ff8080">有人還沒穿太空衣。</b>'), [
    { name: '拉下拉桿', sub: suited ? '所有人都穿好太空衣了' : '沒穿太空衣的人會被一起吸出去', fn: () => { if (!suited) { for (const m of aboard.slice(1)) if (!m.dead && R.chance(.6)) lose(m, '跟著牠一起被吸進了真空'); } flash(.6); AU.decompress(); chron('艙門炸開，牠被扯進了真空。'); setTimeout(finish, 1200); } },
  ], 5, () => { const v = R.pick(aboard.filter(m => !m.dead)); if (v) lose(v, '在逃生艇裡被牠拖走'); chron('牠撲了上來。'); step3b(); });
  const step3b = () => { if (!aliveCrew().filter(m => m.aboard).length) { finish(); return; } stage('最後一次', '牠撲倒了一個人，正把他往維修板裡拖。艙門就在牠背後。', [{ name: '拉下拉桿', sub: '現在，不然就沒機會了', fn: () => { flash(.6); AU.decompress(); for (const m of aboard) if (!m.dead && !suited && R.chance(.5)) lose(m, '跟著牠一起被吸進了真空'); setTimeout(finish, 1200); } }], 4, () => { for (const m of aboard) if (!m.dead) lose(m, '死在逃生艇裡'); setTimeout(finish, 800); }); };
  const step2 = () => stage('牠在艇上', '維修板被從裡面推開。牠從艇壁裡爬出來，落在你們和艙門之間。', [
    { name: armed ? '用' + (hasItem(armed, 'flamer') ? '火' : hasItem(armed, 'harpoon') ? '魚叉' : hasItem(armed, 'flare') ? '照明彈' : '電擊棒') + '把牠逼向艙門' : '沒有武器', sub: armed ? CREW[armed.ci].name + '動手' : '', dis: !armed, fn: () => { chron(CREW[armed.ci].name + '把牠逼向艙門。'); step3(); } },
    { name: '有人去當誘餌，引牠到艙門口', sub: '很可能會死', fn: () => { const v = aboard.filter(m => !m.dead).sort((a, b) => a.hp - b.hp)[0]; if (v && R.chance(.55)) lose(v, '在逃生艇裡當了誘餌'); else if (v) chron(CREW[v.ci].name + '引開了牠，活了下來。'); step3(); } },
  ], 6, () => { const v = R.pick(aboard.filter(m => !m.dead)); if (v) lose(v, '在逃生艇裡被牠拖走'); step3(); });
  const step1 = () => stage('有聲音', '逃生艇離開夜鷺號三分鐘。艇壁的維修板裡，傳來喀、喀、喀的聲音。', [
    { name: '所有人穿上太空衣', sub: '要一點時間', fn: () => { suited = true; chron('所有人穿上了太空衣。'); step2(); } },
    { name: '先把武器拿出來', sub: armed ? '' : '艇上沒有武器', dis: !armed, fn: () => { step2(); } },
  ], 7, () => step2());
  step1();
}

// ---------- 結束 ----------
function endRun(id) {
  if (!W || W.ended) return; W.ended = true; W.phase = 'over';
  hideMenu(); closeBridgeMode();
  const alive = W.crew.filter(m => !m.dead && !m.left);
  const win = ['strangle', 'spaced', 'burned', 'abandon', 'stowaway'].includes(id);
  let final = id;
  if (W.beacon) { }
  if (W.flags.beacon && !W.logs.includes('L01')) W.logs.push('L01');
  if (W.flags.cont && !W.logs.includes('L02')) W.logs.push('L02');
  if (W.confessed && !W.logs.includes('L08')) W.logs.push('L08');
  const have = new Set([...G.lore, ...W.logs]);
  const allButTruth = LORE.filter(f => f.id !== 'L16').every(f => have.has(f.id));
  const wen = crewById('wen');
  if (win && allButTruth && W.confessed && wen && !wen.dead && !wen.left) { final = 'truth'; W.logs.push('L16'); }
  else if (win && alive.length === 1) final = 'sole';
  // 獎勵
  const base = { strangle: 320, spaced: 260, burned: 240, abandon: 180, stowaway: 300, sole: 120, company: 60, lost: 30, truth: 500 }[final] ?? 50;
  const rew = [['結局：' + ENDINGS.find(e => e.id === final).name, base], ['活下來的人 ×' + alive.length, alive.length * 45], ['新的調查檔案 ×' + W.logs.filter(l => !G.lore.includes(l)).length, W.logs.filter(l => !G.lore.includes(l)).length * 35], ['救回來的次數 ×' + W.stats.rescues, W.stats.rescues * 20], ['擦身而過 ×' + (W.stats.close || 0), Math.min(8, W.stats.close || 0) * 12], ['屏住呼吸 ×' + (W.stats.holds || 0), Math.min(6, W.stats.holds || 0) * 15]];
  const total = rew.reduce((s, r) => s + r[1], 0);
  const firstEnd = !G.endings[final];
  G.money += total; G.voyages = (G.voyages || 0) + 1; if (win) G.wins = (G.wins || 0) + 1;
  G.endings[final] = (G.endings[final] || 0) + 1; if (final !== id) G.endings[id] = G.endings[id] || 0;
  const newLore = W.logs.filter(l => !G.lore.includes(l));
  for (const l of newLore) { G.lore.push(l); G.newLore.push(l); }
  const rec = { v: W.voyage, end: final, alive: alive.map(m => m.id), dead: W.crew.filter(m => m.dead).map(m => [m.id, m.why]), t: Math.round(W.t), chron: W.chron.slice(-14).map(c => [Math.round(c.t), c.text]), plan: W.plan };
  G.runs.unshift(rec); G.runs = G.runs.slice(0, 20);
  G.ckpt = null; saveG();
  // 解鎖提示
  const unl = [];
  if (G.voyages === 1) unl.push('第 2 航次起：牠會學人的聲音。');
  if (G.voyages === 2) unl.push('第 3 航次起：船上可能有人帶著公司的密令。');
  if (G.voyages === 3) unl.push('第 4 航次起：每次出航會遇到不同的開局狀況。');
  if (win && G.wins === 1) unl.push('出航準備已經開放：用分紅買裝備與訓練。');
  setTimeout(() => showResult(final, rew, total, firstEnd, newLore, unl), id === 'lost' ? 600 : 300);
}
function showResult(id, rew, total, firstEnd, newLore, unl) {
  S.mode = 'result'; $('#hud').classList.add('hide');
  const E = ENDINGS.find(e => e.id === id);
  const sc = $('#s-result'); sc.classList.remove('hide');
  let h = `<div class="scr-in"><div class="rhead"><span class="lbl">ENDING ${String(ENDINGS.indexOf(E) + 1).padStart(2, '0')} / ${ENDINGS.length}${firstEnd ? ' · 首次達成' : ''}</span><h2>${E.name}</h2><p>${endingText(id === 'sole' ? 'sole' : id)}</p></div>`;
  h += `<div class="survivors">` + W.crew.map(m => `<div class="sv ${m.dead || m.left ? 'd' : ''}"><canvas width="108" height="132" data-id="${m.id}" data-st="${m.dead || m.left ? 'dead' : m.hp < 3 ? 'hurt' : ''}"></canvas><div class="sn">${CREW[m.ci].name}</div><div class="ss">${epitaph(m)}</div></div>`).join('') + `</div>`;
  h += `<div class="card"><h4>航行日誌 · 第 ${W.voyage} 航次</h4><div class="chron" style="margin-top:6px">` + W.chron.slice(-12).map(c => `<div class="ln"><span class="tm">${fmtT(c.t)}</span>${c.text}</div>`).join('') + `</div></div>`;
  h += `<div class="card"><h4>分紅</h4>` + rew.filter(r => r[1]).map(r => `<div class="rew"><span>${r[0]}</span><b>+${r[1]}</b></div>`).join('') + `<div class="rew" style="color:var(--cream);font-weight:900"><span>合計</span><b>+${total}（現有 ${G.money}）</b></div></div>`;
  if (newLore.length) h += `<div class="card unl"><h4>新的調查檔案</h4><p>${newLore.map(l => '・' + LOREI[l].title).join('<br>')}</p></div>`;
  if (unl.length) h += `<div class="card unl"><h4>下一航</h4><p>${unl.join('<br>')}</p></div>`;
  h += `<button class="bigbtn" id="r-again">再出航一次<small>第 ${G.voyages + 1} 航次</small></button><button class="bigbtn sec" id="r-home">回到船塢</button></div>`;
  sc.innerHTML = h; sc.scrollTop = 0;
  sc.querySelectorAll('canvas[data-id]').forEach(cv => drawPortraitTo(cv, cv.dataset.id, cv.dataset.st || null, false));
  $('#r-again').onclick = () => { sc.classList.add('hide'); startGame(); };
  $('#r-home').onclick = () => { sc.classList.add('hide'); showTitle(); };
  AU.stab(.7);
}

// ---------- 暫停 ----------
function pauseGame(on) {
  if (!W) return;
  S.paused = on; const sc = $('#s-pause');
  if (!on) { sc.classList.add('hide'); return; }
  sc.classList.remove('hide');
  sc.innerHTML = `<div class="scr-in"><h2>暫停</h2><button class="bigbtn" id="p-go">繼續</button><button class="bigbtn sec" id="p-help">怎麼玩</button><button class="bigbtn sec" id="p-set">設定</button><button class="bigbtn sec" id="p-quit">放棄這一航</button><p style="text-align:center;color:var(--dim);font-size:12px;margin-top:8px">每一幕之間會自動存檔。中途離開，下次會從最近的幕間繼續。</p></div>`;
  $('#p-go').onclick = () => pauseGame(false);
  $('#p-help').onclick = () => showHelp(true);
  $('#p-set').onclick = () => showSettings(true);
  $('#p-quit').onclick = () => askBox('放棄這一航？這一航的進度不會留下。', () => { sc.classList.add('hide'); S.paused = false; W.phase = 'over'; W.ended = true; G.ckpt = null; saveG(); $('#hud').classList.add('hide'); showTitle(); }, '放棄');
}
// 確認視窗（畫在頁面裡：Claude 上不能跳瀏覽器的確認框）
function askBox(t, yes, label = '確定') {
  const o = el('div', 'askbox', `<div class="ab"><p>${t}</p><div class="abr"><button class="bigbtn sec" data-a="0">取消</button><button class="bigbtn" data-a="1">${label}</button></div></div>`);
  document.body.appendChild(o);
  o.addEventListener('pointerdown', e => e.stopPropagation());
  o.querySelectorAll('button').forEach(b => b.onclick = e => { e.stopPropagation(); AU.ui && AU.ui('tap'); o.remove(); if (b.dataset.a === '1') yes(); });
}
// ---------- 教學提示 ----------
function tut(k) {
  if (!S.set.hints || G.tut[k]) return;
  const T0 = TUTOR.find(x => x.k === k); if (!T0) { if (k === 'bridge2') { G.tut[k] = 1; saveG(); toast('艦橋模式：點門開關、點 D1～D10 開關通風閘門、點房間開燈或在那裡響警報引開牠。', 'good'); } return; }
  G.tut[k] = 1; saveG();
  UI.tutQ = UI.tutQ || []; UI.tutQ.push(T0.t); pumpTut();
}
function pumpTut() {
  if (UI.tutBusy || !UI.tutQ || !UI.tutQ.length) return;
  UI.tutBusy = true; toast('💡 ' + UI.tutQ.shift(), 'good tut');
  setTimeout(() => { UI.tutBusy = false; pumpTut(); }, 7000);
}
