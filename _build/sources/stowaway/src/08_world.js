// ============ 世界：船員、獵手、導演、船上系統 ============
const WALK = 1.9 * T, RUN = 3.5 * T;
function newRun(opt = {}) {
  const seed = opt.seed ?? (Date.now() & 0xffffff);
  seedRng(seed);
  buildShip();
  const voyage = (G.voyages || 0) + 1;
  W = {
    seed, voyage, t: 0, act: 0, actT: 0, phase: 'play', over: null,
    crew: [], beast: null, bot: null, items: [], traps: [], noises: [], noiseEv: [], blips: [], fx: [], ghosts: [], ears: [],
    parts: 1, power: { cap: 6 + (perkOn('power') ? 1 : 0), over: 0, overCd: 0, on: { lights: 1, doors: 1, sensors: 1, dampers: 1, life: 1, airlock: 0 } },
    sys: { lock: true, cycle: -1, airlock: false, auth: false, shuttle: false, sensorsBroken: false, reactorDmg: false, sd: -1, rescue: -1, outer: false, sabotaged: null },
    lights: ROOMS.map(() => ({ on: true, broken: false, flick: 0 })),
    plan: null, stance: null, dir: { m: 0, hi: 0, lo: 0, cool: 0, nudge: 0, firstScare: false },
    learn: { hide: { locker: 0, under: 0, pod: 0, crate: 0 }, lure: 0, alarm: 0, fire: 0, weld: 0, bot: 0, sentry: {} },
    chron: [], logs: [], stats: { searched: 0, rescues: 0, kills: 0, burns: 0, hides: 0, lures: 0, dmg: 0 },
    bridgeOp: -1, sel: -1, airLife: 0, sweepT: 0, mimicT: 60 + R.f(0, 40), agent: null, agentDone: false, confessed: false,
    flags: {}, objs: [], lastBeep: 0, lightVer: 0, tension: 0, grabbing: null, airT: 0, finalPlanReady: false,
    mods: { mimic: voyage >= 2, agent: voyage >= 3 && R.chance(.55), event: voyage >= 4 ? R.pick(['reactor', 'jam', 'sensors', 'dark']) : null },
  };
  // 船員
  for (const d of CREW) {
    const m = { ci: d.i, id: d.id, x: d.start[0] * T, y: d.start[1] * T, ang: R.f(0, TAU), hp: 3, bpm: 74, bpmT: 74, dead: false,
      path: null, pi: 0, goal: null, task: null, moving: false, walkPh: 0, run: false, held: null, inv: [], hidden: null, crouch: 0,
      stance: 'guard', panic: null, virtue: false, sed: 0, seen: 99, grabbed: false, lampOn: true, room: -1, barkCd: 0, stepT: 0, wait: null,
      freeze: 0, cocoon: -1, aim: false, firing: false, saved: 0, lastAlone: 0, aboard: false, suit: false, wounds: [] };
    for (const it of d.items) giveItem(m, it);
    if (d.id === 'wei' && perkOn('tracker2')) giveItem(m, 'tracker');
    if (d.id === 'wen' && perkOn('medbag')) { giveItem(m, 'sedative'); giveItem(m, 'medkit'); }
    if (d.id === 'batu' && perkOn('veteran')) giveItem(m, 'harpoon');
    W.crew.push(m);
  }
  // 戰利品
  rollLoot();
  if (perkOn('stash')) W.items.push({ it: 'fuel', x: 5.4 * T, y: 25.4 * T, n: 1 });
  // 開局狀況
  const ev = W.mods.event;
  if (ev === 'reactor') { W.sys.reactorDmg = true; W.power.cap -= 1; fixPower(); }
  if (ev === 'jam') { const d = SHIP.door.b_aft; d.jam = true; d.state = 'open'; d.open = 1; }
  if (ev === 'sensors') W.sys.sensorsBroken = true;
  if (ev === 'dark') for (const id of ['storage', 'work', 'lab', 'aft']) W.lights[ROOM[id].i].broken = true;
  // 預設門的狀態
  for (const id of ['d_capt', 'd_lab', 'd_dock', 'a_in', 'a_out']) { const d = SHIP.door[id]; d.state = 'closed'; d.open = 0; }
  recomputeRoomCosts();
  // 獵手（第一幕從貨櫃裡出來）
  W.beast = makeBeast(10.4 * T, 33 * T, 0);
  W.beast.state = 'dormant'; W.beast.hideT = 6;
  // 小蝸
  W.bot = { x: 7.5 * T, y: 17 * T, ang: 0, path: null, pi: 0, wait: 2, dead: false, lured: 0, target: null, room: -1 };
  unseedRng();
  W.t = 0;
  chron('夜鷺號，第 ' + voyage + ' 航次。拖回來的樣本貨櫃在貨艙裡，封條是斷的。');
  return W;
}
function perkOn(id) { return G && G.equip && G.equip.includes(id); }
function makeBeast(x, y, stage) {
  const st = STAGES[stage];
  const b = { x, y, ang: Math.PI, stage, hp: st.hp, maxhp: st.hp, scale: st.size, juv: stage === 0, state: 'roam', st: 0, path: null, pi: 0,
    inVent: false, vnode: -1, vpath: null, vk: 0, vd: 0, target: null, tmem: null, sonarT: 2, sonarFx: 0, t: 0, moving: false, speedNow: 0,
    dmgWin: 0, dmgT: 0, stun: 0, pin: 0, frozen: 0, fear: 0, grabV: null, grabT: 0, forceDoor: null, forceT: 0, crest: 0, jaw: 0,
    lastHeard: null, searchT: 0, checked: new Set(), feedT: 0, regenCd: 0, visible: false, wasVisible: false, lastSeen: null, telegraph: 0, exitNode: -1,
    avoidRooms: {}, nest: null, enraged: false, lostT: 0, stuckT: 0, wanderT: 0, fed: 0, mood: 'calm' };
  makeBeastRig(b);
  return b;
}
function giveItem(m, it, n = 1) {
  const D = ITEMS[it]; const cap = m.id === 'jie' ? 3 : 2;
  const ex = m.inv.find(s => s.it === it && D.stack);
  if (ex && ex.n < D.stack) { ex.n = Math.min(D.stack, ex.n + n); refreshHeld(m); return true; }
  if (m.inv.length >= cap) return false;
  m.inv.push({ it, n: D.stack ? n : 1, ch: D.charges || 0, fuel: D.fuel || 0 });
  refreshHeld(m); return true;
}
function takeItem(m, it, n = 1) {
  const s = m.inv.find(s => s.it === it); if (!s) return false;
  if (ITEMS[it].stack && s.n > n) s.n -= n; else m.inv.splice(m.inv.indexOf(s), 1);
  refreshHeld(m); return true;
}
function hasItem(m, it) { return m.inv.find(s => s.it === it) || null; }
function refreshHeld(m) { const pri = ['flamer', 'harpoon', 'prod', 'tracker', 'welder']; m.held = null; for (const p of pri) if (hasItem(m, p)) { m.held = p; break; } }
function rollLoot() {
  for (const b of SHIP.boxes) { const tbl = LOOT[b.loot] || LOOT.crate; const pick = R.weighted(tbl); b.loot2 = { it: pick.it, n: pick.n || 1 }; }
  // 保證：至少兩罐燃料、一份哨戒砲零件的機會、足夠的零件
  const boxes = R.shuffle(SHIP.boxes.filter(b => ['crate', 'pantry', 'work', 'locker'].includes(b.loot)));
  const count = it => SHIP.boxes.filter(b => b.loot2.it === it).length;
  let k = 0;
  while (count('fuel') < 2 && k < boxes.length) { if (boxes[k].loot2.it === 'parts' || boxes[k].loot2.it === 'flare') boxes[k].loot2 = { it: 'fuel', n: 1 }; k++; }
  const partsTotal = () => SHIP.boxes.filter(b => b.loot2.it === 'parts').reduce((s, b) => s + b.loot2.n, 0);
  for (const b of boxes) { if (partsTotal() >= 14) break; if (b.loot2.it === 'flare' || b.loot2.it === 'sedative') b.loot2 = { it: 'parts', n: 1 }; }
  // 太多零件就換掉
  for (const b of R.shuffle(SHIP.boxes.slice())) { if (partsTotal() <= 17) break; if (b.loot2.it === 'parts') b.loot2 = R.pick([{ it: 'flare', n: 1 }, { it: 'sedative', n: 1 }, { it: 'lure', n: 1 }, { it: 'medkit', n: 1 }]); }
  if (!SHIP.boxes.some(b => b.loot2.it === 'log')) { const b = SHIP.boxes.find(x => x.loot === 'comms'); if (b) b.loot2 = { it: 'log', n: 1 }; }
  // 工作間有焊槍以外的零件
  const wk = SHIP.boxes.find(b => b.loot === 'work'); if (wk && wk.loot2.it !== 'parts') wk.loot2 = { it: 'parts', n: 2 };
}
function chron(text) { W.chron.push({ t: W.t, text }); }

// ---------- 主更新 ----------
function worldTick(dt) {
  if (!W || W.phase !== 'play') return;
  W.t += dt; W.actT += dt;
  // 上一格在獵手之後才發出的聲音，這一格補聽
  W.noisePrev = W.noiseEv.filter(e => !e.done); W.noiseEv = [];
  for (const d of SHIP.doors) updateDoor(d, dt);
  for (const n of SHIP.vn) { n.drip = Math.max(0, n.drip - dt * .5); n.shake = Math.max(0, n.shake - dt); }
  updatePower(dt);
  updateCycle(dt);
  for (const m of W.crew) updateCrew(m, dt);
  updateBeast(W.beast, dt);
  updateBot(dt);
  updateTraps(dt);
  updateSensors(dt);
  updateDirector(dt);
  updateActs(dt);
  updateFx(dt);
  updateObjectives();
}
function aliveCrew() { return W.crew.filter(m => !m.dead && m.cocoon < 0); }
function crewById(id) { return W.crew.find(m => m.id === id); }
function noise(x, y, r, src = 'crew', col) {
  W.noiseEv.push({ x, y, r, src, room: roomIdxW(x, y) });
  if (r > T * .9) W.noises.push({ x, y, r, t: 0, col: col || (src === 'beast' ? '#6fe8ff' : src === 'lure' || src === 'alarm' || src === 'bot' ? '#ffb03a' : '#ff6a1a') });
}
function roomIdxW(x, y) { return roomIdx(Math.floor(x / T), Math.floor(y / T)); }

// ---------- 門 ----------
function updateDoor(d, dt) {
  const tgt = (d.state === 'open' || d.broken) ? 1 : 0;
  const sp = W.power.on.doors ? 4 : 1.1;
  const prev = d.open;
  if (d.open < tgt) d.open = Math.min(tgt, d.open + dt * sp); else if (d.open > tgt) d.open = Math.max(tgt, d.open - dt * sp);
  if ((prev > .6) !== (d.open > .6) || (prev > .35) !== (d.open > .35)) { recomputeRoomCosts(); W.lightVer = (W.lightVer || 0) + 1; }
  d.remoteCd = Math.max(0, d.remoteCd - dt);
  if (d.force > 0 && W.beast.forceDoor !== d) d.force = Math.max(0, d.force - dt * .2);
}
function setDoor(d, open, who) {
  if (d.broken || d.jam) return false;
  if (d.welded && open) return false;
  if (d.kind === 'airout') return false;
  const ns = open ? 'open' : 'closed';
  if (d.state === ns) return true;
  d.state = ns;
  noise(d.x, d.y, W.power.on.doors ? T * 1.6 : T * 2.6, 'door');
  AU.door(d.x, d.y, open, d.kind !== 'door');
  recomputeRoomCosts(); W.lightVer = (W.lightVer || 0) + 1;
  // 夾到牠：關門時牠在門上 → 推回去
  return true;
}

// ---------- 電力 ----------
function powerUsed() { let u = 0; for (const s of SYSTEMS) if (W.power.on[s.id]) u += s.cost; return u; }
function powerCap() { return W.power.cap + (W.power.over > 0 ? 2 : 0); }
function fixPower() { const order = ['airlock', 'sensors', 'dampers', 'lights', 'life', 'doors']; for (const id of order) { if (powerUsed() <= powerCap()) break; W.power.on[id] = 0; } }
function togglePower(id) {
  const s = SYSTEMS.find(x => x.id === id), on = W.power.on;
  if (on[id]) { on[id] = 0; }
  else { if (powerUsed() + s.cost > powerCap()) return false; on[id] = 1; }
  AU.ui('power');
  if (id === 'lights') { W.lightVer = (W.lightVer || 0) + 1; if (!on.lights) chron('全船的燈熄了，只剩紅色應急燈。'); }
  return true;
}
function updatePower(dt) {
  if (W.power.over > 0) { W.power.over -= dt; if (W.power.over <= 0) { fixPower(); toast('反應爐超載結束，電力回到 ' + W.power.cap + ' 格', ''); } }
  W.power.overCd = Math.max(0, W.power.overCd - dt);
  W.airLife = W.power.on.life ? Math.max(0, W.airLife - dt * 2) : W.airLife + dt;
  if (!W.power.on.airlock && W.sys.outer) { /* 外門已經開過 */ }
}
function roomLit(ri) { if (ri < 0) return false; const L = W.lights[ri]; return W.power.on.lights && L.on && !L.broken; }

// ---------- 船員 ----------
function updateCrew(m, dt) {
  if (m.dead) return;
  const def = CREW[m.ci];
  m.barkCd = Math.max(0, m.barkCd - dt); m.freeze = Math.max(0, m.freeze - dt); m.sed = Math.max(0, m.sed - dt); m.saved = Math.max(0, m.saved - dt);
  m.room = roomIdxW(m.x, m.y);
  if (m.cocoon >= 0) { m.cocoon -= dt; if (m.cocoon <= 0) { killCrew(m, '死在巢裡'); } return; }
  if (m.grabbed) { m.bpm = Math.min(190, m.bpm + dt * 30); return; }
  updateBpm(m, dt);
  // 恐慌
  if (m.panic) { m.panic.t -= dt; if (m.panic.t <= 0) m.panic = null; }
  else if (!m.hidden && m.bpm >= (def.id === 'batu' || def.id === 'wei' ? 168 : 156) && !m.virtue) {
    m.panicRoll = (m.panicRoll || 0) - dt;
    if (m.panicRoll <= 0) { m.panicRoll = 3; if (R.chance((m.bpm - 150) / 55)) startPanic(m); }
  }
  // 任務
  if (m.task) { if (m.freeze <= 0) runTask(m, dt); }
  else if (m.path && m.freeze <= 0) moveAlong(m, dt);
  else { m.moving = false; autoBehavior(m, dt); }
  m.crouch = lerp(m.crouch, m.hidden || (m.task && m.task.crouch) ? 1 : 0, dt * 6);
  m.aim = !!(m.firing || (m.task && m.task.aim));
}
function updateBpm(m, dt) {
  const def = CREW[m.ci], b = W.beast;
  let tgt = 72;
  const lit = roomLit(m.room);
  if (!lit) tgt += W.power.on.lights ? 10 : 16;
  const near = W.crew.filter(o => o !== m && !o.dead && o.cocoon < 0 && dist(o.x, o.y, m.x, m.y) < T * 3.2 && (o.room === m.room));
  if (!near.length) { tgt += 10 + (W.stance === 'split' ? 6 : 0); m.lastAlone += dt; } else { tgt -= Math.min(12, near.length * 6) + (W.stance === 'huddle' ? 15 : 0); m.lastAlone = 0; }
  m.seen += dt;
  tgt += 55 * Math.exp(-m.seen / 7);
  if (m.blipNear > 0) { tgt += 16; m.blipNear -= dt; }
  tgt += (3 - m.hp) * 10;
  tgt += [0, 4, 9][W.act] || 0;
  if (W.airLife > 60) tgt += W.airLife > 180 ? 20 : 10;
  if (W.grabbing && W.grabbing !== m && dist(W.grabbing.x, W.grabbing.y, m.x, m.y) < T * 7) tgt += 25;
  if (m.hidden && b && !b.inVent && dist(b.x, b.y, m.x, m.y) < T * 5) tgt += 18;
  if (m.sed > 0) tgt -= def.id === 'wen' || m.sedBy === 'wen' ? 60 : 45;
  tgt = clamp(tgt, 56, 188);
  if (m.virtue) tgt = Math.min(tgt, 112);
  m.bpmT = tgt;
  const capt = crewById('wei');
  const aura = capt && !capt.dead && capt !== m && capt.room === m.room && capt.cocoon < 0;
  let up = 9 * (perkOn('calm') ? .8 : 1) * (aura ? .5 : 1);
  if (m.bpm < tgt) m.bpm = Math.min(tgt, m.bpm + up * dt); else m.bpm = Math.max(tgt, m.bpm - 4.5 * dt);
  // 鎮定下來
  if (!m.virtue && m.bpm >= 150 && !m.virtueTried) {
    m.virtueTried = true;
    const p = def.id === 'jie' ? .3 : def.id === 'batu' ? .25 : .15;
    if (R.chance(p)) { m.virtue = true; m.panic = null; bark(m, 'virtue', true); toast(def.name + ' 的手不抖了。這一幕他心跳不會超過 110。', 'good'); chron(def.name + '在最害怕的時候反而鎮定了下來。'); }
  }
}
function startPanic(m) {
  const def = CREW[m.ci];
  const roll = rnd();
  let type = roll < .4 ? 'scream' : roll < .75 ? 'run' : 'freeze';
  if (def.id === 'jie' && roll < .5) type = 'scream';
  if (def.id === 'batu') type = 'rage';
  m.panic = { type, t: 3 };
  if (type === 'scream') { noise(m.x, m.y, T * 9, 'scream'); bark(m, 'scream', true); AU.scream(m.x, m.y, m.ci); }
  else if (type === 'run') { cancelTask(m); const rooms = ROOMS.filter(r => r.i !== m.room && r.kind !== 'airlock'); const r = R.pick(rooms); orderMove(m, r.cx, r.cy, true, true); bark(m, 'flee', true); }
  else if (type === 'freeze') { cancelTask(m); m.path = null; m.freeze = 3; bark(m, 'freeze', true); }
  else { bark(m, 'rage', true); m.panic.t = 4; }
  chron(def.name + (type === 'scream' ? '失控尖叫。' : type === 'run' ? '嚇得拔腿就跑。' : type === 'freeze' ? '嚇得動不了。' : '殺紅了眼。'));
  vibrate(30);
}
function moveAlong(m, dt) {
  const p = m.path[m.pi];
  if (!p) { m.path = null; m.moving = false; arrive(m); return; }
  // 經過門：關著就先開
  if (p[2] != null) {
    const d = doorBetween(p[2], p[3], p[4], p[5]);
    if (d && !doorOpen(d)) {
      m.moving = false;
      if (d.welded || d.jam) { m.path = null; toast(CREW[m.ci].name + '：門被焊死了，過不去。', 'bad'); m.goal = null; return; }
      if (d.state !== 'open') { m.wait = (m.wait || 0) + dt; if (m.wait > (W.power.on.doors ? .25 : 1.2)) { setDoor(d, true); m.wait = 0; } }
      return;
    }
  }
  let sp = m.run ? RUN : WALK;
  if (m.hp === 2) sp *= .82; else if (m.hp === 1) sp *= .55;
  if (m.sed > 0) sp *= .85;
  if (W.stance === 'huddle') sp *= .9;
  if (m.virtue) sp *= 1.12;
  if (m.panic && m.panic.type === 'run') sp = RUN * 1.05;
  const dx = p[0] - m.x, dy = p[1] - m.y, d0 = Math.hypot(dx, dy);
  m.moving = true;
  if (d0 > 1) m.ang = lerpAng(m.ang, Math.atan2(dy, dx), dt * 10);
  const step = sp * dt;
  if (step >= d0) { m.x = p[0]; m.y = p[1]; m.pi++; } else { m.x += dx / d0 * step; m.y += dy / d0 * step; }
  m.walkPh += dt * (m.run ? 13 : 9);
  m.stepT -= dt;
  if (m.stepT <= 0) { m.stepT = m.run ? .34 : .6; noise(m.x, m.y, m.run ? T * 4.2 : T * .9, 'step'); if (m.run) AU.step(m.x, m.y, true); }
}
function lerpAng(a, b, t) { return a + angDiff(a, b) * Math.min(1, t); }
function orderMove(m, x, y, run, auto) {
  if (m.dead || m.grabbed || m.cocoon >= 0) return false;
  if (m.freeze > 0 && !auto) { toast(CREW[m.ci].name + '嚇得動不了……', 'bad'); return false; }
  if (m.hidden) unhide(m);
  if (!auto) { cancelTask(m); m.goal = null; }
  if (W.bridgeOp === m.ci && !auto) leaveBridge(m);
  const path = findPath(Math.floor(m.x / T), Math.floor(m.y / T), Math.floor(x / T), Math.floor(y / T), 'crew');
  if (!path) { if (!auto) toast('那裡走不過去。', 'bad'); return false; }
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  const exact = tileFree(tx, ty) && path[path.length - 1][0] === tx && path[path.length - 1][1] === ty;
  m.path = pathToPts(path, exact ? x : null, exact ? y : null); m.pi = 0; m.run = !!run;
  if (!m.path.length) { m.path = null; arrive(m); }
  return true;
}
// 走到物件旁再做事
function orderDo(m, kind, target, extra = {}) {
  if (m.dead || m.grabbed || m.cocoon >= 0) return false;
  if (m.freeze > 0) { toast(CREW[m.ci].name + '嚇得動不了……', 'bad'); return false; }
  const pos = goalPos(kind, target, m);
  cancelTask(m);
  if (m.hidden && !(kind === 'unhide')) unhide(m);
  if (W.bridgeOp === m.ci && kind !== 'bridge') leaveBridge(m);
  m.goal = { kind, target, ...extra };
  if (dist(m.x, m.y, pos[0], pos[1]) < T * .45) { m.path = null; arrive(m); return true; }
  const ok = orderMove(m, pos[0], pos[1], extra.run ?? m.run, true);
  if (!ok) { m.goal = null; toast('那裡走不過去。', 'bad'); }
  return ok;
}
function goalPos(kind, t, m) {
  if (kind === 'door') { const d = t, [ax, ay, bx, by] = d.tiles[0]; const da = dist(m.x, m.y, (ax + .5) * T, (ay + .5) * T), db = dist(m.x, m.y, (bx + .5) * T, (by + .5) * T); const [x, y] = da < db ? [ax, ay] : [bx, by]; return [(x + .5) * T, (y + .5) * T]; }
  if (kind === 'grate' || kind === 'nest') { const n = t; const tx = Math.floor(n.x / T), ty = Math.floor(n.y / T); const f = tileFree(tx, ty) ? [tx, ty] : nearestFree(tx, ty); return [(f[0] + .5) * T, (f[1] + .5) * T]; }
  if (kind === 'item') return [t.x, t.y];
  if (kind === 'place' || kind === 'throw') return [m.x, m.y];
  if (kind === 'crew') return [t.x, t.y];
  return [t.sx, t.sy];
}
function arrive(m) {
  const g = m.goal; m.moving = false;
  if (!g) return;
  m.goal = null;
  const t = g.target, def = CREW[m.ci];
  switch (g.kind) {
    case 'search': if (t.searched) { toast('這裡已經翻過了。'); return; } startTask(m, 'search', 3.2 * (W.stance === 'split' ? .6 : 1), { prop: t, crouch: true }); noise(m.x, m.y, T * 1.4, 'search'); AU.search(m.x, m.y); break;
    case 'hide': if (t.occ != null && t.occ !== m.ci) { toast(t.name + '裡已經有人了。', 'bad'); return; } hide(m, t); break;
    case 'door': { const d = t; if (g.act === 'weld') { if (!hasItem(m, 'welder')) return toast('要有焊槍。', 'bad'); if (!d.welded && d.state === 'open') setDoor(d, false); startTask(m, 'weld', def.id === 'deng' ? 3 : 6, { door: d, aim: true }); }
      else if (g.act === 'cut') startTask(m, 'cut', def.id === 'deng' ? 2.5 : 4.5, { door: d, aim: true });
      else { setDoor(d, g.act === 'open' ? true : g.act === 'close' ? false : d.state !== 'open'); } break; }
    case 'grate': if (g.act === 'seal') { if (!hasItem(m, 'welder')) return toast('要有焊槍。', 'bad'); startTask(m, 'seal', def.id === 'deng' ? 2 : 4, { node: t, crouch: true }); } else if (g.act === 'unseal') startTask(m, 'unseal', 3, { node: t, crouch: true }); else if (g.act === 'crawl') startCrawl(m, t); break;
    case 'item': pickUp(m, t); break;
    case 'con': useConsole(m, t, g.act); break;
    case 'nest': startTask(m, 'free', 4, { victim: g.victim, crouch: true }); break;
    case 'crew': if (g.act === 'give') { if (dist(m.x, m.y, t.x, t.y) < T * 1.6) doGive(m, t, g.item); } else if (g.act === 'heal') startTask(m, 'healOther', def.id === 'wen' ? 2.5 : 5, { other: t, crouch: true }); else if (g.act === 'sedate') { useSedative(m, t); } break;
    case 'place': placeTrap(m, g.item); break;
    case 'sab': startTask(m, 'sabotage', 8, { what: W.agent ? W.agent.what : 'airlock', crouch: true }); break;
  }
}
function startTask(m, type, dur, o = {}) { m.task = { type, t: 0, dur, ...o }; m.path = null; }
function cancelTask(m) {
  if (!m.task) return;
  if (m.task.type === 'bridge') leaveBridge(m);
  m.task = null; m.firing = false;
}
function runTask(m, dt) {
  const k = m.task, def = CREW[m.ci];
  k.t += dt;
  if (k.type === 'bridge' || k.type === 'guardPost') { return; }
  if (k.type === 'fire') { fireFlamer(m, dt, k); return; }
  // 有聲音的工作
  k.nt = (k.nt || 0) - dt;
  if (k.nt <= 0) {
    k.nt = 1;
    if (k.type === 'weld' || k.type === 'seal' || k.type === 'cut' || k.type === 'unseal') { noise(m.x, m.y, T * 5, 'weld'); AU.weld(m.x, m.y); spark(m.x + Math.cos(m.ang) * 18, m.y + Math.sin(m.ang) * 18); }
    if (k.type === 'repair' || k.type === 'craft') { noise(m.x, m.y, T * 3, 'work'); AU.work(m.x, m.y); }
  }
  if (k.t < k.dur) return;
  m.task = null;
  switch (k.type) {
    case 'search': finishSearch(m, k.prop); break;
    case 'weld': k.door.welded = 1; k.door.state = 'closed'; recomputeRoomCosts(); toast(def.name + '焊死了這扇門。', 'good'); chron(def.name + '焊死了' + doorName(k.door) + '。'); break;
    case 'cut': k.door.welded = 0; toast('焊道切開了。'); recomputeRoomCosts(); break;
    case 'seal': k.node.sealed = true; toast(def.name + '把格柵焊死了。', 'good'); break;
    case 'unseal': k.node.sealed = false; toast('格柵撬開了。'); break;
    case 'repair': finishRepair(m, k.what); break;
    case 'craft': finishCraft(m, k.recipe); break;
    case 'heal': m.hp = Math.min(3, m.hp + 1); toast(def.name + '包紮好了。', 'good'); break;
    case 'healOther': if (!k.other.dead) { k.other.hp = Math.min(3, k.other.hp + 1); toast(CREW[k.other.ci].name + '的傷處理好了。', 'good'); } break;
    case 'free': if (k.victim && k.victim.cocoon >= 0) { k.victim.cocoon = -1; k.victim.hp = 1; k.victim.bpm = 160; k.victim.x = m.x + 20; k.victim.y = m.y; W.stats.rescues++; toast(CREW[k.victim.ci].name + '被救出來了！', 'good'); chron(def.name + '從巢裡把' + CREW[k.victim.ci].name + '拖了出來。'); bark(k.victim, 'saved', true); } break;
    case 'auth': W.sys.auth = true; toast('艦長授權完成：氣閘外門可以打開了。', 'good'); chron('魏子葳在艦橋輸入了氣閘的授權碼。'); AU.ui('ok'); if (W.bridgeOp === m.ci) m.task = { type: 'bridge', t: 0, dur: 1e9 }; break;
    case 'selfdestruct': startSelfDestruct(m); break;
    case 'overload': W.power.over = 60; W.power.overCd = 150; toast('反應爐超載：多兩格電，撐 60 秒。', 'good'); noise(m.x, m.y, T * 6, 'work'); break;
    case 'lever': openOuterDoor(m); break;
    case 'sabotage': doSabotage(m, k.what); break;
    case 'suit': m.suit = true; toast(def.name + '穿好太空衣了。', 'good'); break;
    case 'board': m.aboard = true; toast(def.name + '上了逃生艇。', 'good'); break;
  }
}
function doorName(d) { const a = ROOMS[d.ra], b = ROOMS[d.rb]; return (a ? a.name : '') + (b ? '和' + b.name : '') + '之間的門'; }
function finishSearch(m, p) {
  p.searched = true; W.stats.searched++;
  const L = p.loot2 || { it: 'parts', n: 1 };
  const def = CREW[m.ci];
  let lucky = W.stance === 'split' && R.chance(.25);
  if (L.it === 'parts') { const n = L.n + (lucky ? 1 : 0); W.parts += n; toast(def.name + '找到 ⚙ 零件 ×' + n, 'loot'); AU.loot(1); }
  else if (L.it === 'log') { foundLog(m); }
  else {
    const D = ITEMS[L.it];
    if (giveItem(m, L.it, L.n)) { toast(`${def.name}找到<b>${D.name}</b>（${RARN[D.rar]}）`, 'loot r' + D.rar); AU.loot(D.rar); if (D.rar >= 3) { bark(m, 'rare', true); chron(def.name + '在' + p.name + '翻到了' + D.name + '。'); flash(.12); vibrate([20, 30, 20]); } }
    else { W.items.push({ it: L.it, x: m.x + R.f(-10, 10), y: m.y + R.f(-10, 10), n: L.n }); toast(`${def.name}找到${D.name}，但手上拿不下，先放在地上。`, 'loot r' + D.rar); }
  }
  if (lucky && L.it !== 'parts') { W.parts += 1; }
}
function foundLog(m) {
  const pool = LORE.filter(f => f.src === 'log' && (!f.late || W.voyage >= f.late) && !G.lore.includes(f.id) && !W.logs.includes(f.id));
  const f = pool.length ? R.pick(pool) : null;
  if (f) { W.logs.push(f.id); toast('找到一份紀錄：<b>' + f.title + '</b>（結束後可在調查檔案閱讀）', 'loot r2'); AU.loot(2); }
  else { W.parts += 1; toast('一份看過的紀錄，裡面夾著一個零件。', 'loot'); }
}
function pickUp(m, it) {
  const idx = W.items.indexOf(it); if (idx < 0) return;
  if (giveItem(m, it.it, it.n)) { W.items.splice(idx, 1); toast(CREW[m.ci].name + '撿起' + ITEMS[it.it].name); AU.ui('pick'); }
  else toast('手上拿不下了（先放掉一樣東西）。', 'bad');
}
function dropItem(m, slot) {
  const s = m.inv[slot]; if (!s) return;
  m.inv.splice(slot, 1); refreshHeld(m);
  W.items.push({ it: s.it, x: m.x + R.f(-8, 8), y: m.y + 10, n: s.n, ch: s.ch, fuel: s.fuel });
}
function doGive(a, b, it) {
  const s = hasItem(a, it); if (!s) return;
  const D = ITEMS[it];
  if (b.inv.length >= (b.id === 'jie' ? 3 : 2) && !(D.stack && hasItem(b, it))) { toast(CREW[b.ci].name + '手上拿不下了。', 'bad'); return; }
  const n = D.stack ? 1 : 1;
  const one = { ...s, n };
  if (D.stack && s.n > 1) s.n -= 1; else a.inv.splice(a.inv.indexOf(s), 1);
  const ex = b.inv.find(x => x.it === it && D.stack);
  if (ex) ex.n += 1; else b.inv.push(one);
  refreshHeld(a); refreshHeld(b);
  toast(CREW[a.ci].name + '把' + D.name + '交給' + CREW[b.ci].name);
}
function hide(m, h) {
  m.hidden = h; h.occ = m.ci; m.path = null; m.x = h.px; m.y = h.py; m.hideAt = W.t; W.stats.hides++;
  AU.hide(m.x, m.y);
  if (W.beast && !W.beast.inVent && W.beast.target === m && W.beast.visible && hasLOS(W.beast.x, W.beast.y, m.x, m.y)) { m.seenHiding = true; }
}
function unhide(m) {
  if (!m.hidden) return;
  const h = m.hidden; h.occ = null; m.hidden = null; m.x = h.sx; m.y = h.sy;
}
function useSedative(giver, target) {
  if (!takeItem(giver, 'sedative')) return;
  target.sed = 60; target.sedBy = giver.id; target.panic = null; target.freeze = 0;
  toast(CREW[target.ci].name + '打了一針鎮定劑。', 'good'); AU.ui('pick');
}
function useMedkit(m, target) { if (!takeItem(m, 'medkit')) return; startTask(m, target === m ? 'heal' : 'healOther', m.id === 'wen' ? 2.5 : 5, { other: target, crouch: true }); }

// ---------- 主控台 ----------
function useConsole(m, c, act) {
  const def = CREW[m.ci];
  switch (c.fn) {
    case 'bridge': enterBridge(m); break;
    case 'power': UI.openPower(m); break;
    case 'craft': UI.openCraft(m); break;
    case 'heal': if (m.hp >= 3) toast(def.name + '沒有受傷。'); else startTask(m, 'heal', 6 * (m.id === 'wen' ? .5 : 1), { crouch: true }); break;
    case 'dampers': UI.openDampers(m); break;
    case 'comms': if (!W.flags.beacon) { W.flags.beacon = true; UI.listenBeacon(); } else toast('通訊台只剩雜訊。'); break;
    case 'container': if (!W.flags.cont) { W.flags.cont = true; UI.lookContainer(); } else toast('空的貨櫃。內壁上全是抓痕。'); break;
    case 'airlock':
      if (W.sys.lock) { toast('檢疫封鎖中：貨櫃破裂後，氣閘自動鎖死了。幕間艦長解除封鎖以後（第二幕）才修得了。', 'bad'); break; }
      if (!W.sys.airlock) { tryRepair(m, 'airlock'); }
      else if (W.act === 2 && W.plan === 'airlock') startTask(m, 'lever', 3, { aim: true });
      else toast('氣閘控制盤正常。第三幕執行「拋出去」時，在這裡拉下拉桿就能打開外門。');
      break;
    case 'shuttle':
      if (W.sys.lock) { toast('檢疫封鎖中：逃生艇鎖死了。第二幕才修得了。', 'bad'); break; }
      if (!W.sys.shuttle) tryRepair(m, 'shuttle');
      else if (W.act === 2 && W.plan === 'abandon') { if (!m.aboard) startTask(m, 'board', 1.5); else UI.launchAsk(); }
      else toast('逃生艇修好了。要「棄船」時從這裡上艇。');
      break;
    case 'selfdestruct':
      if (W.act === 2 && W.plan === 'abandon' && W.sys.sd < 0) { if (m.id !== 'wei') toast('自毀需要艦長的授權碼。', 'bad'); else startTask(m, 'selfdestruct', 5, { aim: true }); }
      else if (m.id === 'deng' && W.power.overCd <= 0) startTask(m, 'overload', 4, { aim: true });
      else if (m.id === 'deng') toast('反應爐還在冷卻（' + Math.ceil(W.power.overCd) + ' 秒）。');
      else toast('自毀裝置。要第三幕選了「棄船」才能啟動。鄧伯可以在這裡讓反應爐超載。');
      break;
  }
}
function tryRepair(m, what) {
  const R0 = REPAIRS[what];
  if (W.parts < R0.parts) { toast(`修${R0.name}要 ⚙ ×${R0.parts}（現在 ${W.parts}）`, 'bad'); return; }
  W.parts -= R0.parts;
  startTask(m, 'repair', R0.t * (m.id === 'deng' ? .5 : 1), { what, aim: true });
  toast(CREW[m.ci].name + '開始修' + R0.name + '……很吵。');
}
function finishRepair(m, what) {
  if (what === 'airlock') { W.sys.airlock = true; toast('氣閘控制盤修好了。', 'good'); chron(CREW[m.ci].name + '修好了氣閘控制盤。'); }
  if (what === 'shuttle') { W.sys.shuttle = true; toast('逃生艇修好了，隨時可以走。', 'good'); chron(CREW[m.ci].name + '修好了逃生艇。'); }
  if (what === 'sensors') { W.sys.sensorsBroken = false; toast('感測器恢復。', 'good'); }
  if (what === 'reactor') { W.sys.reactorDmg = false; W.power.cap += 1; toast('反應爐修好，電力多一格。', 'good'); }
  if (what === 'unsab') { W.sys.sabotaged = null; toast('修好了。', 'good'); }
  AU.ui('ok');
}
function finishCraft(m, rid) {
  const r = RECIPES.find(x => x.id === rid);
  if (!giveItem(m, r.out)) { W.items.push({ it: r.out, x: m.x, y: m.y + 14, n: 1 }); }
  const D = ITEMS[r.out];
  toast(`${CREW[m.ci].name}做好了<b>${D.name}</b>`, 'loot r' + D.rar); AU.loot(D.rar);
  if (r.out === 'flamer') chron(CREW[m.ci].name + '在工作台組出了一把火焰噴射器。');
}
function startCraft(m, rid) {
  const r = RECIPES.find(x => x.id === rid);
  if (W.parts < r.parts) return toast('零件不夠。', 'bad');
  if (r.need && !hasItem(m, r.need)) return toast('手上要有' + ITEMS[r.need].name + '。', 'bad');
  if (r.need) takeItem(m, r.need);
  W.parts -= r.parts;
  startTask(m, 'craft', r.t * (m.id === 'jie' ? .5 : 1), { recipe: rid, aim: true });
}
function enterBridge(m) {
  if (W.bridgeOp >= 0 && W.bridgeOp !== m.ci) { const o = W.crew[W.bridgeOp]; if (!o.dead) { toast(CREW[o.ci].name + '已經在操作艦橋了。'); return; } }
  W.bridgeOp = m.ci; m.task = { type: 'bridge', t: 0, dur: 1e9 }; m.path = null;
  m.x = SHIP.con.bridge.sx; m.y = SHIP.con.bridge.sy; m.ang = -Math.PI / 2;
  W.flags.bridged = true;
  toast(CREW[m.ci].name + '坐上艦橋主控台：可以遠端開關門、燈、通風閘門。按左邊的「艦橋」。', 'good');
  AU.ui('ok');
}
function leaveBridge(m) { if (W.bridgeOp === m.ci) { W.bridgeOp = -1; if (m.task && m.task.type === 'bridge') m.task = null; UI.closeBridge(); } }
function bridgeOn() { if (W.bridgeOp < 0) return false; const m = W.crew[W.bridgeOp]; return m && !m.dead && !m.grabbed && m.cocoon < 0; }
function remoteReady() { return bridgeOn(); }
function remoteCd() { return W.crew[W.bridgeOp] && W.crew[W.bridgeOp].id === 'su' ? 0 : 1.2; }
function remoteDoor(d) {
  if (!remoteReady()) return toast('要有人坐鎮艦橋才能遠端開關門。', 'bad');
  if (!W.power.on.doors) return toast('艙門沒有電，不能遠端控制。', 'bad');
  if (d.kind === 'airout') return toast('外門要在第三幕由艦橋或氣閘控制盤打開。', 'bad');
  if (d.remoteCd > 0) return;
  if (d.welded) return toast('這扇門焊死了。', 'bad');
  if (setDoor(d, d.state !== 'open')) d.remoteCd = remoteCd();
}
function remoteDamper(dm) {
  if (!remoteReady()) return toast('要有人坐鎮艦橋（或到維生室的控制盤）才能開關閘門。', 'bad');
  if (!W.power.on.dampers) return toast('通風閘門沒有電。', 'bad');
  toggleDamper(dm);
}
function toggleDamper(dm) { dm.closed = !dm.closed; AU.damper(dm.x, dm.y, dm.closed); noise(dm.x, dm.y, T * 1.5, 'damper'); }
function remoteLight(ri) { if (!remoteReady()) return; const L = W.lights[ri]; L.on = !L.on; W.lightVer = (W.lightVer || 0) + 1; AU.ui('light'); }
function remoteAlarm(ri) {
  if (!remoteReady()) return;
  if ((W.alarmCd || 0) > W.t) return toast('警報還在冷卻（' + Math.ceil(W.alarmCd - W.t) + ' 秒）');
  const r = ROOMS[ri]; W.alarmCd = W.t + 22;
  W.traps.push({ type: 'alarm', x: r.cx, y: r.cy, t: 0, dur: 6, room: ri, pulse: 0 });
  toast(r.name + '的警報響了。', ''); chron('有人在' + r.name + '拉響了警報。');
}
function remoteBot(ri) {
  if (!remoteReady()) return; const bot = W.bot; if (bot.dead) return toast('小蝸已經壞了。', 'bad');
  const r = ROOMS[ri]; botGo(r.cx, r.cy); bot.lured = 12; toast('小蝸往' + r.name + '開過去，一路嗶嗶叫。');
}
function remoteOuter() {
  if (!remoteReady()) return;
  const m = W.crew[W.bridgeOp]; openOuterDoor(m);
}
function openOuterDoor(m) {
  const inner = SHIP.door.a_in, outer = SHIP.door.a_out;
  if (!W.sys.airlock) return toast('氣閘控制盤壞了。', 'bad');
  if (!W.sys.auth) return toast('需要艦長在艦橋授權。', 'bad');
  if (!W.power.on.airlock) return toast('氣閘沒有電。要先在電力配置打開「氣閘」（兩格）。', 'bad');
  if (W.sys.sabotaged === 'airlock') return toast('控制盤被人動過手腳，打不開！', 'bad');
  if (inner.state === 'open' || inner.open > .05) return toast('內門還開著！先關上內門。', 'bad');
  if (W.sys.cycle >= 0) return;
  W.sys.cycle = 3; AU.alarm(true); toast('氣閘循環：外門 3 秒後打開！', 'bad'); chron('氣閘開始循環。');
  CAM.focus = { x: ROOM.airlock.cx, y: ROOM.airlock.cy, t: 3.4 };
}
function updateCycle(dt) {
  if (W.sys.cycle < 0) return;
  const inner = SHIP.door.a_in;
  W.sys.cycle -= dt;
  if ((W.cycSnd = (W.cycSnd || 0) - dt) <= 0) { W.cycSnd = .5; AU.alarmPing(SHIP.door.a_out.x, SHIP.door.a_out.y); }
  if (inner.state === 'open' || inner.broken) { W.sys.cycle = -1; toast('內門開了——氣閘循環中斷！', 'bad'); return; }
  if (W.sys.cycle <= 0) { W.sys.cycle = -1; const outer = SHIP.door.a_out; outer.state = 'open'; outer.broken = false; W.sys.outer = true; outer.open = 0; decompress(); }
}
function decompress() {
  const ar = ROOM.airlock.i;
  AU.decompress(); flash(.5); shake(18); vibrate([60, 40, 120]);
  W.fx.push({ type: 'vent', t: 0, dur: 3 });
  const b = W.beast;
  // 氣閘自己的格柵：D9 關著時，那一小段管道跟氣閘一起被抽空
  const va = SHIP.vnode.va, dva = dist(b.x, b.y, va.x, va.y);
  const pocket = b.inVent && (dva < T * .8 || (dva < T * 1.7 && SHIP.dampers.D9.closed));
  const inside = (!b.inVent && roomIdxW(b.x, b.y) === ar) || pocket;
  for (const m of W.crew) if (!m.dead && m.room === ar) { killCrew(m, '被吸進了真空'); }
  if (inside) {
    if (pocket) { b.inVent = false; b.x = va.x; b.y = va.y; b.vpath = null; for (const sg of b.seg) { sg.x = va.x; sg.y = va.y; } chron('牠縮在氣閘的格柵底下。真空把那一段管道一起抽空，牠被從格柵裡扯了出去。'); }
    else chron('外門打開。牠被吸進了真空。');
    b.state = 'spaced'; b.st = 0; b.visible = true; W.phase = 'cine';
    if (UI.bridgeMode) closeBridgeMode();
    CAM.tz = clamp(CAM.tz, 1.05, 1.25); CAM.focus = { x: ROOM.airlock.cx, y: ROOM.airlock.cy, t: 4 };
    setTimeout(() => endRun('spaced'), 3200);
  }
  else { toast('外門打開了……但牠不在裡面。', 'bad'); chron('外門打開了，但氣閘裡是空的。'); setTimeout(() => { const o = SHIP.door.a_out; o.state = 'closed'; W.sys.outer = false; }, 2500); }
}
function startSelfDestruct(m) { W.sys.sd = 180; toast('自毀倒數 180 秒。所有人上逃生艇！', 'bad'); chron('魏子葳啟動了自毀程序。'); AU.alarm(true); }
function launchShuttle() {
  const aboard = W.crew.filter(m => m.aboard && !m.dead);
  if (!aboard.length) return;
  const b = W.beast, dock = ROOM.dock;
  const near = !b.inVent ? dist(b.x, b.y, dock.cx, dock.cy) < T * 9 : (dist(b.x, b.y, dock.cx, dock.cy) < T * 10 && !SHIP.dampers.D10.closed && !SHIP.vnode.vd.sealed);
  W.stowaway = near || (W.t - (b.nearDockT || -99) < 25 && R.chance(.5));
  for (const m of W.crew) if (!m.dead && !m.aboard) { m.left = true; }
  W.phase = 'cine'; AU.launch();
  chron('逃生艇脫離夜鷺號。艇上 ' + aboard.length + ' 人。');
  setTimeout(() => { UI.shuttleEnding(); }, 1800);
}

// ---------- 道具使用 ----------
function itemActions(m) {
  const out = [];
  for (let i = 0; i < m.inv.length; i++) {
    const s = m.inv[i], D = ITEMS[s.it];
    out.push({ slot: i, it: s.it, n: D.stack ? s.n : (D.charges ? s.ch : D.fuel ? Math.round(s.fuel) : null), use: D.use });
  }
  return out;
}
function throwItem(m, it, x, y) {
  const d = dist(m.x, m.y, x, y);
  if (d > T * 6.5) { const k = T * 6.5 / d; x = m.x + (x - m.x) * k; y = m.y + (y - m.y) * k; }
  // 撞牆就停
  const dd = Math.hypot(x - m.x, y - m.y);
  if (dd > 2) { const hit = castRay(m.x, m.y, (x - m.x) / dd, (y - m.y) / dd, dd); if (hit < dd) { x = m.x + (x - m.x) / dd * (hit - 10); y = m.y + (y - m.y) / dd * (hit - 10); } }
  if (!takeItem(m, it)) return;
  cancelTask(m); m.ang = Math.atan2(y - m.y, x - m.x);
  W.fx.push({ type: 'throw', x0: m.x, y0: m.y, x1: x, y1: y, t: 0, dur: .45, it });
  setTimeout(() => {
    if (!W) return;
    if (it === 'flare') { W.traps.push({ type: 'flare', x, y, t: 0, dur: 25 }); AU.flare(x, y); noise(x, y, T * 2, 'flare'); hitWithFlare(x, y); }
    if (it === 'lure') { W.traps.push({ type: 'lure', x, y, t: 0, dur: 2 + (W.stance === 'trap' ? 14 : 10), delay: 2, pulse: 0 }); W.stats.lures++; }
  }, 450);
  bark(m, 'throw');
}
function hitWithFlare(x, y) {
  const b = W.beast; if (!b || b.inVent) return;
  if (dist(b.x, b.y, x, y) < T * 1.6) { flinch(b, 'flare'); }
}
function placeTrap(m, it) {
  if (!takeItem(m, it)) return;
  if (it === 'fuel') W.traps.push({ type: 'fuel', x: m.x + Math.cos(m.ang) * 14, y: m.y + Math.sin(m.ang) * 14, t: 0 });
  if (it === 'ln2') W.traps.push({ type: 'ln2', x: m.x, y: m.y, t: 0 });
  if (it === 'sentry') { W.traps.push({ type: 'sentry', x: m.x, y: m.y, ang: m.ang, t: 0, ammo: 80, cd: 0, room: m.room, aimA: m.ang, hp: 3 }); chron(CREW[m.ci].name + '在' + ROOMS[m.room].name + '架起了哨戒砲。'); }
  toast(CREW[m.ci].name + '放下了' + ITEMS[it].name); AU.ui('place');
}
function startFire(m) {
  const s = hasItem(m, 'flamer'); if (!s) return;
  if (s.fuel <= 0) { const f = hasItem(m, 'fuel'); if (f) { takeItem(m, 'fuel'); s.fuel = Math.min(100, s.fuel + 60); toast('加滿油了。'); } else return toast('噴火器沒油了。', 'bad'); }
  cancelTask(m); startTask(m, 'fire', 1.4, { aim: true });
}
function fireFlamer(m, dt, k) {
  const s = hasItem(m, 'flamer'); if (!s || s.fuel <= 0) { m.task = null; m.firing = false; return; }
  m.firing = true; s.fuel = Math.max(0, s.fuel - dt * 11);
  const b = W.beast;
  if (b && !b.inVent && b.state !== 'dead') { m.ang = lerpAng(m.ang, Math.atan2(b.y - m.y, b.x - m.x), dt * 8); }
  if (Math.random() < .6) W.fx.push({ type: 'flame', x: m.x + Math.cos(m.ang) * 26, y: m.y + Math.sin(m.ang) * 26, vx: Math.cos(m.ang + R.f(-.25, .25)) * R.f(180, 260), vy: Math.sin(m.ang + R.f(-.25, .25)) * R.f(180, 260), t: 0, dur: R.f(.35, .55) });
  k.nt2 = (k.nt2 || 0) - dt; if (k.nt2 <= 0) { k.nt2 = .5; noise(m.x, m.y, T * 7, 'fire'); AU.flame(m.x, m.y); }
  if (b && !b.inVent && b.state !== 'dead') {
    const d = dist(m.x, m.y, b.x, b.y), a = Math.abs(angDiff(m.ang, Math.atan2(b.y - m.y, b.x - m.x)));
    if (d < T * 3.4 && a < .55 && hasLOS(m.x, m.y, b.x, b.y)) { hurtBeast(b, (CREW[m.ci].id === 'batu' ? 39 : 30) * dt, 'fire', m); }
  }
  for (const t of W.traps) if (t.type === 'fuel' && dist(m.x + Math.cos(m.ang) * 60, m.y + Math.sin(m.ang) * 60, t.x, t.y) < T * 1.6) explodeFuel(t);
  if (k.t >= k.dur) { m.task = null; m.firing = false; }
}
function useProd(m) {
  const s = hasItem(m, 'prod'), b = W.beast; if (!s) return false;
  if (!b || b.inVent || dist(m.x, m.y, b.x, b.y) > T * 1.5) { toast('要貼到牠身邊才電得到。', 'bad'); return false; }
  s.ch--; if (s.ch <= 0) takeItem(m, 'prod');
  stunBeast(b, 2.5); hurtBeast(b, (m.id === 'batu' ? 16 : 12), 'prod', m); AU.zap(b.x, b.y); spark(b.x, b.y, '#9fd8ff');
  return true;
}
function shootHarpoon(m) {
  const s = hasItem(m, 'harpoon'), b = W.beast; if (!s) return false;
  if (!b || b.inVent || !b.visible) { toast('看不到牠。', 'bad'); return false; }
  const d = dist(m.x, m.y, b.x, b.y);
  if (d > T * 6.2 || !hasLOS(m.x, m.y, b.x, b.y)) { toast('太遠或被擋住了。', 'bad'); return false; }
  s.ch--; if (s.ch <= 0) takeItem(m, 'harpoon');
  m.ang = Math.atan2(b.y - m.y, b.x - m.x);
  W.fx.push({ type: 'bolt', x0: m.x, y0: m.y, x1: b.x, y1: b.y, t: 0, dur: .12 });
  b.pin = 3; hurtBeast(b, m.id === 'batu' ? 33 : 25, 'harpoon', m); AU.harpoon(m.x, m.y); noise(m.x, m.y, T * 5, 'shot');
  if (b.grabV) releaseGrab(b, true);
  chron(CREW[m.ci].name + '一發魚叉把牠釘在地上。');
  return true;
}
function explodeFuel(t) {
  if (t.dead) return; t.dead = true;
  W.fx.push({ type: 'boom', x: t.x, y: t.y, t: 0, dur: .9 }); AU.boom(t.x, t.y); shake(14); flash(.25); noise(t.x, t.y, T * 12, 'boom');
  const b = W.beast;
  if (b && !b.inVent && dist(b.x, b.y, t.x, t.y) < T * 2.6) hurtBeast(b, 85, 'boom');
  for (const m of W.crew) if (!m.dead && m.cocoon < 0 && dist(m.x, m.y, t.x, t.y) < T * 2) woundCrew(m, '被爆炸波及');
  for (let k = 0; k < 6; k++) W.fx.push({ type: 'fire', x: t.x + R.f(-40, 40), y: t.y + R.f(-40, 40), t: 0, dur: R.f(3, 6) });
}

// ---------- 陷阱、誘餌、警報 ----------
function updateTraps(dt) {
  const b = W.beast;
  for (const t of W.traps) {
    t.t += dt;
    if (t.type === 'lure') {
      if (t.t > t.delay) { t.pulse -= dt; if (t.pulse <= 0) { t.pulse = .5; noise(t.x, t.y, T * 12, 'lure'); AU.lure(t.x, t.y); } }
      if (t.t > t.dur + t.delay) t.dead = true;
    } else if (t.type === 'alarm') {
      t.pulse -= dt; if (t.pulse <= 0) { t.pulse = .7; noise(t.x, t.y, T * 19, 'alarm'); AU.alarmPing(t.x, t.y); }
      if (t.t > t.dur) t.dead = true;
    } else if (t.type === 'flare') { if (t.t > t.dur) t.dead = true; }
    else if (t.type === 'ln2') { if (b && !b.inVent && b.state !== 'dead' && dist(b.x, b.y, t.x, t.y) < T * 1.3) { t.dead = true; b.frozen = 5; hurtBeast(b, 20, 'cold'); W.fx.push({ type: 'frost', x: t.x, y: t.y, t: 0, dur: 5 }); AU.freeze(t.x, t.y); chron('牠踩上液氮罐，被凍在原地。'); } }
    else if (t.type === 'sentry') {
      t.cd -= dt;
      if (b && !b.inVent && b.state !== 'dead' && t.ammo > 0) {
        const d = dist(t.x, t.y, b.x, b.y);
        if (d < T * 6 && hasLOS(t.x, t.y, b.x, b.y)) {
          const a = Math.atan2(b.y - t.y, b.x - t.x); t.aimA = lerpAng(t.aimA, a, dt * 8);
          if (t.cd <= 0 && Math.abs(angDiff(t.aimA, a)) < .25) { t.cd = .16; t.ammo--; hurtBeast(b, 4, 'sentry'); W.fx.push({ type: 'tracer', x0: t.x, y0: t.y, x1: b.x + R.f(-8, 8), y1: b.y + R.f(-8, 8), t: 0, dur: .06 }); AU.gun(t.x, t.y); t.nt = (t.nt || 0) - .16; if (t.nt <= 0) { t.nt = .6; noise(t.x, t.y, T * 9, 'gun'); } W.learn.sentry[t.room] = (W.learn.sentry[t.room] || 0) + 4; }
        }
        if (d < T * .9 && b.state !== 'stunned') { t.hpT = (t.hpT || 0) + dt; if (t.hpT > 1.6) { t.dead = true; W.fx.push({ type: 'boom', x: t.x, y: t.y, t: 0, dur: .5 }); AU.boom(t.x, t.y); toast('哨戒砲被牠撕爛了。', 'bad'); } }
      }
    } else if (t.type === 'fuel') { if (t.t > 0 && W.traps.some(o => o.type === 'flare' && !o.dead && dist(o.x, o.y, t.x, t.y) < T * 1.2)) explodeFuel(t); }
  }
  W.traps = W.traps.filter(t => !t.dead);
}

// ---------- 感測器、偵測器 ----------
function updateSensors(dt) {
  const b = W.beast;
  // 光點：會動的東西
  const movers = [];
  if (b && b.state !== 'dormant' && b.state !== 'dead' && b.state !== 'spaced' && b.moving) movers.push({ x: b.x, y: b.y, vent: b.inVent, beast: true });
  if (W.bot && !W.bot.dead && W.bot.moving) movers.push({ x: W.bot.x, y: W.bot.y, vent: false, bot: true });
  // 手持偵測器
  W.sweepT -= dt;
  const holders = W.crew.filter(m => !m.dead && m.cocoon < 0 && hasItem(m, 'tracker'));
  if (W.sweepT <= 0) {
    W.sweepT = 2;
    let nearest = Infinity;
    for (const h of holders) {
      const range = T * (8 + (h.id === 'su' ? 4 : 0) + (perkOn('calib') ? 2 : 0));
      W.fx.push({ type: 'sweep', x: h.x, y: h.y, r: range, t: 0, dur: .9 });
      for (const mv of movers) { const d = dist(h.x, h.y, mv.x, mv.y); if (d < range) { W.blips.push({ x: mv.x, y: mv.y, t: 0, vent: mv.vent, src: 'hand' }); nearest = Math.min(nearest, d); if (d < T * 6) for (const o of W.crew) if (dist(o.x, o.y, h.x, h.y) < T * 3) o.blipNear = 3; } }
    }
    if (holders.length) AU.tracker(nearest < Infinity ? nearest / T : -1);
    W.lastNearest = nearest;
  }
  // 艦橋感測器
  W.bridgeSweep = (W.bridgeSweep || 0) - dt;
  if (bridgeOn() && W.power.on.sensors && !W.sys.sensorsBroken && W.bridgeSweep <= 0) {
    W.bridgeSweep = perkOn('calib') ? 2 : 3;
    W.fx.push({ type: 'bsweep', t: 0, dur: 1.2 });
    for (const mv of movers) W.blips.push({ x: mv.x, y: mv.y, t: 0, vent: mv.vent, src: 'bridge' });
  }
  for (const bl of W.blips) bl.t += dt;
  W.blips = W.blips.filter(bl => bl.t < 2.2);
}

// ---------- 小蝸 ----------
function botGo(x, y) {
  const bot = W.bot;
  const p = findPath(Math.floor(bot.x / T), Math.floor(bot.y / T), Math.floor(x / T), Math.floor(y / T), 'crew');
  if (p) { bot.path = pathToPts(p); bot.pi = 0; }
}
function updateBot(dt) {
  const bot = W.bot; if (!bot || bot.dead) return;
  bot.moving = false;
  bot.lured = Math.max(0, bot.lured - dt);
  if (!bot.path) {
    bot.wait -= dt;
    if (bot.wait <= 0) { const rooms = ['mid', 'mess', 'cryo', 'life', 'storage', 'aft', 'work', 'quarters', 'med', 'fore'].map(id => ROOM[id]); const r = R.pick(rooms); botGo(r.x0 + R.f(.5, r.w - .5) * T, r.y0 + R.f(.5, r.h - .5) * T); bot.wait = R.f(6, 14); }
    return;
  }
  const p = bot.path[bot.pi]; if (!p) { bot.path = null; return; }
  if (p[2] != null) { const d = doorBetween(p[2], p[3], p[4], p[5]); if (d && !doorOpen(d)) { if (d.welded || d.jam || !W.power.on.doors) { bot.path = null; return; } setDoor(d, true); return; } }
  const dx = p[0] - bot.x, dy = p[1] - bot.y, d0 = Math.hypot(dx, dy), sp = T * (bot.lured ? 1.8 : 1.1) * dt;
  bot.moving = true; bot.ang = lerpAng(bot.ang, Math.atan2(dy, dx), dt * 6);
  if (sp >= d0) { bot.x = p[0]; bot.y = p[1]; bot.pi++; } else { bot.x += dx / d0 * sp; bot.y += dy / d0 * sp; }
  bot.nt = (bot.nt || 0) - dt; if (bot.nt <= 0) { bot.nt = bot.lured ? .5 : 1.4; noise(bot.x, bot.y, bot.lured ? T * 6 : T * 2.2, 'bot'); if (bot.lured) AU.botBeep(bot.x, bot.y); }
}

// ---------- 特效 ----------
function spark(x, y, col = '#ffd890') { for (let k = 0; k < 6; k++) W.fx.push({ type: 'spark', x, y, vx: R.f(-120, 120), vy: R.f(-120, 120), t: 0, dur: R.f(.2, .45), col }); }
function updateFx(dt) {
  for (const f of W.fx) { f.t += dt; if (f.vx != null) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .9; f.vy *= .9; } }
  W.fx = W.fx.filter(f => f.t < f.dur);
  for (const n of W.noises) n.t += dt;
  W.noises = W.noises.filter(n => n.t < .9);
  for (const g of W.ghosts) g.t += dt;
  W.ghosts = W.ghosts.filter(g => g.t < 3);
  for (const e of W.ears) e.t += dt;
  W.ears = W.ears.filter(e => e.t < 5);
}
function woundCrew(m, why) {
  if (m.dead) return;
  m.hp -= 1; m.seen = 0; AU.hurt(m.x, m.y, m.ci); vibrate(80);
  W.fx.push({ type: 'blood', x: m.x, y: m.y, t: 0, dur: 30 });
  if (m.hp <= 0) killCrew(m, why); else { bark(m, 'hurt', true); }
}
function killCrew(m, why) {
  if (m.dead) return;
  m.dead = true; m.why = why; m.deathT = W.t; m.task = null; m.path = null; m.grabbed = false; m.cocoon = -1;
  if (m.hidden) unhide(m);
  if (W.bridgeOp === m.ci) leaveBridge(m);
  for (const s of m.inv.splice(0)) W.items.push({ it: s.it, x: m.x + R.f(-14, 14), y: m.y + R.f(-14, 14), n: s.n, ch: s.ch, fuel: s.fuel });
  refreshHeld(m);
  const def = CREW[m.ci];
  chron(def.name + why + '。');
  toast(`<b>${def.name}</b> ${why}。`, 'bad');
  for (const o of W.crew) if (!o.dead && o !== m) { o.bpm = Math.min(190, o.bpm + 25); o.seen = Math.min(o.seen, 2); }
  if (def.id === 'jie') { const bt = crewById('batu'); if (bt && !bt.dead) { bt.rage = true; say('batu', '阿傑——！我要把你撕成碎片！'); } }
  AU.death(m.x, m.y);
  if (W.sel === m.ci) W.sel = -1;
  setTimeout(() => { if (W && W.phase === 'play') checkLost(); }, 100);
}
function checkLost() {
  const alive = W.crew.filter(m => !m.dead);
  if (!alive.length) { W.phase = 'cine'; setTimeout(() => endRun('lost'), 1600); }
  else if (alive.every(m => m.cocoon >= 0)) { W.phase = 'cine'; for (const m of alive) m.dead = true; setTimeout(() => endRun('lost'), 1600); }
}
