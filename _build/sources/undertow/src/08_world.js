/* ============ 08 世界：移動、躲藏、聲音、獵手、陷阱、進水、撤離 ============ */
let W = null;
const HULL = 20, PW = 13, RUN = 170, SNEAK = 112, CLIMB = 120;
const INPUT = { jx: 0, jy: 0, on: false };

/* ---------- 建立一趟下潛 ---------- */
function newWorld(si, tier) {
  const seed = window.__seed != null ? window.__seed : (Math.random() * 1e9) >>> 0;
  const M = genMap(si, seed, tier);
  const S = M.S;
  W = {
    M, S, si, tier: tier || 0, t: 0, rooms: M.rooms, doors: M.doors, ladders: M.ladders, vents: M.vents, C: M.C, F: M.F,
    foes: [], projs: [], fx: [], nums: [], items: [], pulses: [], decoys: [], drones: [], clouds: [],
    pressure: 0, stage: 0, spawnT: S.trickle * .9, breachT: 12, collapseT: 0,
    noise: 0, heart: 72, heartT: 0, heartProx: 0, scare: 0,
    bag: [], bagVal: 0, bagWt: 0, rescued: [], logsGot: [], relicsGot: [], bpsGot: [], key: false, cacheQ: 0,
    obj: { survivors: M.survivors.length, rescued: 0, hunterKill: false },
    dock: { room: M.dock, called: false, t: 0, arrived: false, rise: 0, waveT: 0, board: 0 },
    pods: M.rooms.filter(r => r.special === 'pod').map(r => ({ room: r.i, cells: 0, x: r.x0 + RW / 2, y: r.floorY })),
    state: 'play', ending: null, deepDone: false, mother: null, linState: 'sit',
    kills: 0, dodges: 0, escapes: 0, said: {}, subs: [], shake: 0, hitstop: 0, slow: 1, flowCache: {}, sonarT: 2, fxT: 0,
    hunter: null, finished: false, msg: null, learn: { locker: 0, bed: 0, desk: 0 }, blackT: 0, zap: null,
    tracker: { on: false, t: 0, per: 1.5, blips: [], seenH: 0, nearD: 0, pingFx: 0 },
    steam: [], puffs: [], lampT: 22, countSaid: {}, breachSaidT: -99,
  };
  // 漏氣的管線（每間艙約一半有）
  for (const r of W.rooms) {
    if (r.collapsed || r.special === 'deep') continue;
    const rg = RNG(r.seed + 77);
    if (rg.f() < .5) W.steam.push({ room: r.i, x: r.x0 + 50 + rg.f() * (RW - 100), y: r.y0 + (r.f === 0 ? 18 : 0) + 14 + rg.f() * 14, dir: rg.f() < .5 ? -1 : 1, t: 2 + rg.f() * 12, on: 0, acc: 0 });
  }
  // 預先繪製房間
  for (const r of W.rooms) r.bg = paintRoom(r, M);
  const st = W.rooms[M.start];
  st.explored = true;
  W.P = makePlayer(st.x0 + RW / 2 + (st.c === 0 ? 40 : -40), st.floorY);
  // 住在站裡的東西
  for (const s of M.residents) {
    const r = W.rooms[s.room];
    const e = spawnFoe(s.type, s.x, r.floorY, false);
    e.home = r.i; e.spawnT = 0;
    if (s.type === 'husk') e.idle = true;
  }
  // 獵手
  const H = S.hunter;
  W.hunter = {
    isHunter: true, state: 'away', x: 0, y: 0, face: 1, walk: 0, moving: false, turn: 0, tilt: 0, quad: 0, atk: 0, lean: 0, flash: 0, mouth: 0,
    climb: null, tx: 0, ty: 0, know: 0, awayT: si === 0 ? 55 : 42, vent: null, ventT: 0, stunT: 0, atkT: 0, searchT: 0,
    shriekCD: 20, chargeT: 0, def: { r: 30, h: 190 }, heard: 0, dropT: 0, seen: false, H, repelled: 0, dead: false, alertT: 0,
    checkQ: [], checkSp: null, checkT: 0, slowT: 0, near: 0,
  };
  W.cam = { x: W.P.x, y: W.P.y - 80 };
  if (S.final) { const dr = W.rooms[M.deep]; const side = dr.ladUp && dr.tank && dr.ladUp.x < dr.tank.x ? 1 : -1; W.lin = { x: dr.tank ? dr.tank.x + side * 120 : dr.x0 + 60, y: dr.floorY }; }
  return W;
}
function pickGun() { return GUN_ORDER.includes(G.lastWeapon) && G.weapons.includes(G.lastWeapon) ? G.lastWeapon : 'rivet'; }
function pickTool() { return TOOL_ORDER.includes(G.lastTool) && G.weapons.includes(G.lastTool) ? G.lastTool : null; }
function makePlayer(x, y) {
  let hpMax = 100 + metaLv('hp') * 14 + relicBonus('hp');
  if (survPerk('maxhp')) hpMax *= 1.1;
  hpMax = Math.round(hpMax);
  const gun = pickGun(), tool = pickTool();
  return {
    x, y, vx: 0, face: 1, hp: hpMax, hpMax, o2: 1, climb: null, walk: 0, moving: false, stealth: false, recoil: 0, fireT: 0, flash: 0, inv: 0,
    gun, gunLv: 1, ammo: WEAPONS[gun].ammo0, tool, toolUses: tool ? WEAPONS[tool].uses0 : 0, toolT: 0,
    passives: {}, med: metaLv('med'), decoys: 1 + metaLv('decoy'), batteries: metaLv('battery'), flashes: 1 + metaLv('flash'), fuses: 0,
    rerolls: 1 + metaLv('reroll') + (survPerk('reroll') ? 1 : 0), adrenT: 0, stepT: 0, channel: null, searching: null, reinforcing: null, medT: 0, decoyT: 0,
    fireHeld: false, fireCD: 0, hide: null, hideT: 0, hold: false, holdT: 0, breath: 1, gaspT: 0, exhaleT: 0, caught: false,
    st: null, dirty: true, nzT: 0, lastHurt: 0, underT: 0, searchNz: 0,
  };
}

/* ---------- 數值（被動、整備、藏品、生還者加成） ---------- */
function PS() {
  const p = W.P;
  if (!p.dirty && p.st) return p.st;
  const pv = id => p.passives[id] || 0;
  const st = {
    speed: (1 + .04 * metaLv('speed')) * (1 + .08 * pv('fins')),
    noise: (1 - .06 * metaLv('quiet')) * Math.pow(.85, pv('quiet')) * (1 + relicBonus('noise')) * (survPerk('quiet') ? .9 : 1),
    dmg: 1 + relicBonus('dmg'),
    crit: .05 + .07 * pv('ballistic') + relicBonus('crit'), critDmg: 2 + .2 * pv('ballistic'),
    search: 1 + .1 * metaLv('search') + .25 * pv('scan') + relicBonus('search') + (survPerk('search') ? .1 : 0),
    weld: 1 + .4 * pv('welder') + relicBonus('weld') + (survPerk('weld') ? .3 : 0),
    doorHp: 40 * pv('welder') + relicBonus('door'),
    magnet: 72 * (1 + .2 * metaLv('magnet')),
    elec: (1 + .3 * pv('conduct')) * (survPerk('elec') ? 1.15 : 1),
    armor: .04 * metaLv('armor'),
    regen: .6 * pv('regen'),
    water: Math.min(1, (pv('fins') >= 3 ? 1 : pv('fins') === 2 ? .85 : .68) + (survPerk('swim') ? .25 : 0)),
    sonar: 1 + (survPerk('sonar') ? .3 : 0) + relicBonus('sonar') + (G.survivors.lin ? .25 : 0),
    credits: 1 + (survPerk('credits') ? .15 : 0) + relicBonus('credits'),
    med: .38 * (survPerk('medPlus') ? 1.3 : 1),
    leech: survPerk('leech'),
    adren: pv('adren'),
    breathCap: 8 * (1 + .3 * pv('lungs')) * (1 + .2 * metaLv('lungs')),
    holdHeart: pv('lungs') >= 3 ? 0 : 1,
    calm: 1 - .2 * pv('calm'), calmHide: pv('calm') >= 3,
    ammoMul: (1 + .4 * pv('pack')) * (1 + relicBonus('ammo')), toolPlus: pv('pack') >= 3 ? 1 : 0,
    fuseSpeed: pv('conduct') >= 3 ? 2 : 1,
  };
  p.st = st; p.dirty = false;
  return st;
}

/* ---------- 位置與結構 ---------- */
const floorOf = y => Math.floor((y - 2) / FH);
function roomAt(x, y) {
  const c = clamp(Math.floor(x / RW), 0, W.C - 1), f = clamp(floorOf(y), 0, W.F - 1);
  return W.rooms[f * W.C + c];
}
function doorAt(c, f) { if (c <= 0 || c >= W.C || f < 0 || f >= W.F) return null; return W.rooms[f * W.C + c].doorL; }
const passable = d => d && (d.state === 'open' || d.state === 'broken');
function losClear(x1, x2, f) {
  const a = Math.min(x1, x2), b = Math.max(x1, x2);
  for (let c = Math.ceil(a / RW); c * RW < b; c++) {
    if (c <= 0 || c >= W.C) return false;
    const d = doorAt(c, f); if (!d || d.state === 'locked') return false;
  }
  return true;
}
/* 水平移動與牆／門碰撞，回傳擋住的門 */
function moveX(e, nx, hw) {
  const f = clamp(floorOf(e.y), 0, W.F - 1);
  nx = clamp(nx, HULL + hw, W.C * RW - HULL - hw);
  const c0 = clamp(Math.floor(e.x / RW), 0, W.C - 1);
  let blocked = null;
  if (nx > e.x) {
    const bx = (c0 + 1) * RW;
    if (c0 + 1 < W.C && nx + hw > bx - WALLW / 2) { const d = doorAt(c0 + 1, f); if (!passable(d)) { nx = Math.min(nx, bx - WALLW / 2 - hw); blocked = d || 'wall'; } }
  } else if (nx < e.x) {
    const bx = c0 * RW;
    if (c0 > 0 && nx - hw < bx + WALLW / 2) { const d = doorAt(c0, f); if (!passable(d)) { nx = Math.max(nx, bx + WALLW / 2 + hw); blocked = d || 'wall'; } }
  }
  e.x = nx;
  return blocked;
}
function waterAt(r) { return r ? r.water * (FH - SLAB - 8) : 0; }

/* ---------- 聲音 ---------- */
let costCache = null, costDirty = true;
function markDoors() { costDirty = true; W.flowCache = {}; }
function soundCost() {
  if (!costDirty && costCache) return costCache;
  const N = W.rooms.length, INF = 99, D = [];
  for (let i = 0; i < N; i++) { D.push(new Float32Array(N).fill(INF)); D[i][i] = 0; }
  const link = (a, b, c) => { if (c < D[a][b]) { D[a][b] = c; D[b][a] = c; } };
  for (const r of W.rooms) {
    if (r.collapsed) continue;
    const right = r.c < W.C - 1 ? W.rooms[r.i + 1] : null;
    if (right && !right.collapsed) { const d = r.doorR; link(r.i, right.i, !d ? 2 : d.state === 'locked' ? 2 : d.state === 'closed' ? 1 : 0); }
    const below = r.f < W.F - 1 ? W.rooms[r.i + W.C] : null;
    if (below && !below.collapsed) link(r.i, below.i, r.ladDown ? .5 : 1.5);
  }
  for (let k = 0; k < N; k++) for (let i = 0; i < N; i++) { const dik = D[i][k]; if (dik >= INF) continue; for (let j = 0; j < N; j++) { const v = dik + D[k][j]; if (v < D[i][j]) D[i][j] = v; } }
  costCache = D; costDirty = false; return D;
}
function heardBy(p, x, y, mul) {
  const a = roomAt(p.x, p.y), b = roomAt(x, y);
  const c = soundCost()[a.i][b.i];
  const eff = p.r * Math.pow(.5, c) * (mul || 1);
  return Math.hypot(p.x - x, (p.y - y) * 1.1) <= eff;
}
function emitNoise(x, y, r, src, show) {
  if (r < 10) return;
  const p = { x, y, r, src, t: 0, dur: .7 };
  if (show !== false && r >= 90) W.pulses.push(p);
  if (src === 'player' || src === 'gun' || src === 'hide') W.noise = Math.min(1, W.noise + r / 900);
  // 小怪：閒晃的回聲人會過去看；牆裡的人被吵醒會尖叫；誘餌類的聲音會把牠們引走
  for (const e of W.foes) {
    if (e.dead) continue;
    if (e.type === 'husk' && e.idle && src !== 'husk' && src !== 'wall' && r >= 100 && heardBy(p, e.x, e.y - 40, 1)) { e.idle = false; e.inv = { x, y }; }
    if (e.type === 'wall' && !e.awake && !e.silent && e.sleepCD <= 0 && src !== 'wall' && src !== 'husk' && r >= 110 && heardBy(p, e.x, e.y - 80, .8)) wallWake(e);
    if ((src === 'decoy' || src === 'drone' || src === 'machine') && e.type !== 'wall' && heardBy(p, e.x, e.y, 1.2)) { e.lure = p; e.lureT = 6; }
  }
  hunterHear(p);
}

/* ---------- 每格更新 ---------- */
function updateWorld(dt) {
  if (W.state !== 'play' && W.state !== 'dying') return;
  if (W.hitstop > 0) { W.hitstop -= dt; return; }
  dt *= W.slow;
  W.t += dt;
  const p = W.P;
  updatePressure(dt);
  updatePlayer(dt);
  updateGun(dt);
  updateProjs(dt);
  for (const e of W.foes) if (!e.dead) updateFoe(e, dt);
  separateFoes();
  for (const e of W.foes) if (e.dead) e.deadT += dt;
  W.foes = W.foes.filter(e => !e.dead || e.deadT < .4);
  updateHunter(dt);
  if (W.mother) updateMother(dt);
  updateTracker(dt);
  updateOmens(dt);
  updateSpawns(dt);
  updateWater(dt);
  updateTraps(dt);
  updateMachines(dt);
  updateDoors(dt);
  updateItems(dt);
  updateDecoys(dt);
  updateDrones(dt);
  updateClouds(dt);
  updateInteract(dt);
  updateSurvivors(dt);
  updateDock(dt);
  updateFX(dt);
  updateHeart(dt);
  W.noise = Math.max(0, W.noise - dt * .45);
  W.blackT = Math.max(0, W.blackT - dt);
  if (p.hp <= 0 && W.state === 'play') playerDie();
  if (W.state === 'dying') { W.dieT -= dt / Math.max(.2, W.slow); W.slow = approach(W.slow, p.caught ? .55 : .25, dt * 2); if (W.dieT <= 0) endRun('dead'); }
}

/* ---------- 主角 ---------- */
function updatePlayer(dt) {
  const p = W.P, st = PS();
  p.flash = Math.max(0, p.flash - dt * 6); p.inv = Math.max(0, p.inv - dt); p.recoil = Math.max(0, p.recoil - dt * 8); p.fireT = Math.max(0, p.fireT - dt);
  p.adrenT = Math.max(0, p.adrenT - dt); p.medT = Math.max(0, p.medT - dt); p.decoyT = Math.max(0, p.decoyT - dt); p.toolT = Math.max(0, p.toolT - dt);
  p.gaspT = Math.max(0, p.gaspT - dt); p.exhaleT = Math.max(0, p.exhaleT - dt);
  if (p.caught) return;
  if (st.regen && p.hp < p.hpMax && p.hp > 0) p.hp = Math.min(p.hpMax, p.hp + st.regen * dt);
  const r = roomAt(p.x, p.y);
  if (!r.explored) { r.explored = true; onEnterRoom(r); }
  // 呼吸：只有躲著的時候能憋氣
  if (p.hold && p.hide) {
    p.holdT += dt; p.breath = Math.max(0, p.breath - dt / st.breathCap);
    if (p.breath <= 0) gasp();
  } else {
    if (p.hold) releaseBreath();
    p.breath = Math.min(1, p.breath + dt / 2.6);
  }
  // 躲著：不能動，推搖桿或按情境鈕就出來
  if (p.hide) {
    p.hideT += dt; p.moving = false; p.vx = 0;
    if (p.hideT > .45 && Math.abs(INPUT.jx) > .6 && !p.hold) exitHide();
    AU.setUnder(false);
    return;
  }
  const wl = waterAt(r), feet = r.floorY - p.y;
  const wet = !p.climb && wl > 16, under = wl > 60 + feet;
  p.wet = wet;
  if (under) { p.o2 = Math.max(0, p.o2 - dt / 14); p.underT += dt; if (p.o2 <= 0) { p.hp -= 9 * dt; p.flash = .3; } if (Math.random() < dt * 3) AU.play('bubble'); }
  else { p.o2 = Math.min(1, p.o2 + dt / 2.5); p.underT = 0; }
  AU.setUnder(under);
  let ix = INPUT.jx, iy = INPUT.jy;
  const mag = Math.min(1, Math.hypot(ix, iy));
  if (p.channel && (Math.abs(ix) > .35 || Math.abs(iy) > .6)) cancelChannel();
  if (p.channel) { ix = 0; iy = 0; }
  p.slowT = Math.max(0, (p.slowT || 0) - dt);
  let spd = (p.stealth ? SNEAK : RUN) * st.speed * (p.adrenT > 0 ? 1.35 : 1) * (wet ? st.water : 1) * (p.slowT > 0 ? .55 : 1);
  if (p.climb) {
    const L = p.climb; p.x = L.x;
    let vy = Math.abs(iy) > .3 ? sgn(iy) : 0;
    if (vy === 0 && Math.abs(ix) > .5) vy = p.climbDir || 0;
    p.y += vy * CLIMB * st.speed * dt;
    p.moving = vy !== 0; if (p.moving) { p.walk += dt * 9; p.climbDir = vy; }
    if (p.y <= L.y1) { p.y = L.y1; p.climb = null; }
    else if (p.y >= L.y2) { p.y = L.y2; p.climb = null; }
  } else {
    if (Math.abs(iy) > .55 && Math.abs(iy) > Math.abs(ix) * 1.1) {
      if (iy > 0 && r.ladDown && Math.abs(p.x - r.ladDown.x) < 30) { p.climb = r.ladDown; p.x = p.climb.x; p.y += 2; p.climbDir = 1; }
      else if (iy < 0 && r.ladUp && Math.abs(p.x - r.ladUp.x) < 30) { p.climb = r.ladUp; p.x = p.climb.x; p.y -= 2; p.climbDir = -1; }
    }
    if (!p.climb) {
      const tx = Math.abs(ix) > .14 ? sgn(ix) * spd * clamp(mag * 1.3, 0, 1) : 0;
      p.vx = approach(p.vx, tx, (tx ? 1400 : 1800) * dt);
      if (p.vx) moveX(p, p.x + p.vx * dt, PW);
      p.moving = Math.abs(p.vx) > 12;
      if (p.moving) { p.walk += dt * Math.abs(p.vx) / 15; if (!(p.fireT > 0 && p.target)) p.face = sgn(p.vx); }
      // 腳步聲：跑步大聲、潛行只有貼著才聽得到；泡水的話每一步都有水聲
      if (p.moving) {
        p.stepT -= dt * Math.abs(p.vx) / RUN;
        if (p.stepT <= 0) {
          p.stepT = p.stealth ? .5 : .4;
          const carry = 1 + Math.min(.6, W.bagWt * .02);
          if (!p.stealth) emitNoise(p.x, p.y, 125 * st.noise * carry, 'player', false);
          else emitNoise(p.x, p.y, 44 * st.noise * carry, 'player', false);
          if (wet) { AU.play('splash', { vol: .5 }); emitNoise(p.x, p.y, (p.stealth ? 80 : 150) * st.noise, 'player', false); }
        }
      }
    }
  }
}
/* 身體的聲音：呼吸、心跳、喘氣。牠貼得夠近就聽得到 */
function bodyNoise() {
  const p = W.P;
  if (W.state !== 'play' || p.caught) return 0;
  const hr = W.heart, muf = p.hide ? HIDE_INFO[p.hide.type].muf : p.stealth ? .85 : 1;
  const breath = p.hold ? 0 : 26 + Math.max(0, hr - 78) * .9;
  const beat = hr >= 148 ? 30 + (hr - 148) * 2 : 0;
  let r = Math.max(breath, beat) * muf;
  if (p.gaspT > 0) r = Math.max(r, 170 * Math.min(1, muf * 1.6));
  if (p.exhaleT > 0) r = Math.max(r, 70 * muf);
  return r * PS().noise;
}
function onEnterRoom(r) {
  if (r.survivor && r.survivor.state === 'hide') { tip('survivor'); W.subs.push({ who: r.survivor.name, text: '「……噓。」', kind: 'voice', dur: 2.6 }); }
  if (r.water > .3) tip('water');
  if (r.trap && !r.trap.seen) { r.trap.seen = true; setTimeout(() => { if (W) tip('trapBox'); }, 700); }
  if (r.hides && r.hides.length && W.t > 20) tip('hide');
}
function hurtPlayer(dmg, src) {
  const p = W.P, st = PS();
  if (p.inv > 0 || W.state !== 'play' || W.god) return;
  dmg *= 1 - st.armor;
  p.hp -= dmg; p.flash = 1; p.inv = .5 + (st.adren >= 3 ? .4 : 0); p.lastHurt = W.t;
  if (st.adren) p.adrenT = 2.5 + (st.adren >= 2 ? 1 : 0);
  W.shake = Math.max(W.shake, Math.min(14, 4 + dmg * .3));
  AU.play('hurt'); vib(dmg > 20 ? 90 : 40);
  UI.hurt(dmg / p.hpMax);
  if (p.hp < p.hpMax * .35) tip('lowhp');
  cancelChannel();
  if (p.hide && dmg > 0) exitHide(true);
}
function playerDie() {
  W.state = 'dying'; W.dieT = 1.6; W.P.hp = 0; AU.play('fail'); W.shake = 16;
  spark(W.P.x, W.P.y - 40, 26, '#ff8a3d', 280);
}

/* ---------- 潛行 ---------- */
function toggleStance(force) {
  const p = W.P; p.stealth = force != null ? force : !p.stealth;
  AU.play(p.stealth ? 'stance_q' : 'stance_f');
  if (p.stealth) tip('stealth');
  UI.stance();
}
/* ---------- 躲藏與憋氣 ---------- */
function enterHide(sp) {
  const p = W.P;
  if (p.hide || p.climb || W.state !== 'play') return;
  cancelChannel();
  p.hide = { spot: sp, type: sp.type, kind: sp.kind }; p.hideT = 0; p.x = sp.x; p.vx = 0; p.moving = false; p.fireHeld = false;
  const info = HIDE_INFO[sp.type];
  emitNoise(sp.x, p.y - 40, info.enter * PS().noise, 'hide', info.enter >= 90);
  AU.play(sp.type === 'locker' ? 'locker_in' : 'hide_in');
  UI.hideMode(true);
  tip('hide');
}
function exitHide(forced) {
  const p = W.P;
  if (!p.hide) return;
  if (p.hold) releaseBreath();
  const sp = p.hide.spot; p.hide = null; p.hold = false;
  p.x = sp.x + (forced ? 0 : (p.face || 1) * 4);
  if (!forced) { AU.play(sp.type === 'locker' ? 'locker_out' : 'hide_out'); emitNoise(sp.x, p.y - 40, (sp.type === 'locker' ? 70 : 40) * PS().noise, 'player', false); }
  UI.hideMode(false);
}
function holdBreath(on) {
  const p = W.P;
  if (!W || W.state !== 'play') return;
  if (on) { if (!p.hide || p.hold || p.breath < .08) return; p.hold = true; p.holdT = 0; AU.play('inhale'); if (p.breath < .5) tip('breathOut'); }
  else if (p.hold) releaseBreath();
}
function releaseBreath() {
  const p = W.P;
  if (!p.hold) return;
  p.hold = false;
  if (p.holdT > PS().breathCap * .55) { p.exhaleT = .45; AU.play('exhale', { vol: .9 }); }
  else AU.play('exhale', { vol: .35 });
  p.holdT = 0;
}
function gasp() {
  const p = W.P;
  p.hold = false; p.holdT = 0; p.gaspT = .7; p.breath = .12;
  AU.play('gasp'); W.scare = Math.max(W.scare, .6);
  tip('breathOut');
}

/* ---------- 動態偵測器：只抓得到「會動的東西」，嗶聲本身也是聲音 ---------- */
const TRACK_RANGE = 820;
function toggleTracker(force) {
  const T = W.tracker; T.on = force != null ? force : !T.on;
  AU.play(T.on ? 'track_on' : 'track_off');
  T.t = .3; T.blips = []; T.seenH = 0; T.nearD = 0;
  if (T.on) G.tips.tracker = true;
  UI.trackerBtn();
}
function updateTracker(dt) {
  const T = W.tracker, p = W.P;
  T.seenH = Math.max(0, T.seenH - dt);
  for (const b of T.blips) b.a = Math.max(0, b.a - dt / Math.max(.6, T.per));
  T.pingFx = Math.max(0, T.pingFx - dt * 2.2);
  if (!T.on) return;
  T.t -= dt;
  if (T.t > 0) return;
  const cs = [], RANGE = TRACK_RANGE * PS().sonar;
  const add = (x, y, big, isH) => { const d = Math.hypot(x - p.x, y - p.y); if (d <= RANGE) cs.push({ x, y, d, big, isH }); };
  for (const e of W.foes) {
    if (e.dead) continue;
    const mv = e.tkx != null && Math.hypot(e.x - e.tkx, e.y - e.tky) > 4;
    e.tkx = e.x; e.tky = e.y;
    if (mv) add(e.x, e.y - 20, e.type === 'husk' || e.elite, false);
  }
  const h = W.hunter;
  if (h && !h.dead) {
    let hx = null, hy = null;
    if (h.state === 'crawl') { hx = h.cx; hy = h.cy; }
    else if (h.state === 'venting') { hx = h.vent.x; hy = h.vent.y; }
    else if (onMap(h)) { const mv = h.tkx != null && Math.hypot(h.x - h.tkx, h.y - h.tky) > 4; h.tkx = h.x; h.tky = h.y; if (mv || h.state === 'attack' || h.state === 'drop' || h.state === 'charge') { hx = h.x; hy = h.y - 90; } }
    if (hx != null) add(hx, hy, true, true);
  }
  const m = W.mother; if (m && !m.dead && m.state !== 'lured') add(m.x, m.y - 120, true, true);
  cs.sort((a, b) => a.d - b.d);
  const k = cs.length ? clamp(1 - cs[0].d / RANGE, 0, 1) : 0;
  T.per = lerp(1.6, .42, k * k); T.t = T.per;
  T.nearD = cs.length ? cs[0].d : 0;
  T.blips = cs.slice(0, 16).map(c => ({ x: c.x, y: c.y, big: c.big, a: 1 }));
  if (cs.some(c => c.isH)) T.seenH = T.per + .6;
  T.pingFx = 1;
  AU.play('track_ping', { vol: .9 });
  if (cs.length) setTimeout(() => { if (W && W.tracker.on) AU.play('track_blip', { f: 620 + 900 * k, vol: .9 }); }, 140);
  emitNoise(p.x, p.y - 40, 95 * (p.hide ? .6 : 1), 'tracker');
}
/* ---------- 預兆：燈管被干擾、爆掉、漏蒸氣 ---------- */
function omenPos() {
  const h = W.hunter, m = W.mother;
  if (m && !m.dead && m.state !== 'lured') return { x: m.x, y: m.y - 100 };
  if (!h || h.dead) return null;
  if (h.state === 'crawl') return { x: h.cx, y: h.cy };
  if (h.state === 'venting') return { x: h.vent.x, y: h.vent.y };
  if (onMap(h)) return { x: h.x, y: h.y - 100 };
  return null;
}
function updateOmens(dt) {
  const p = W.P, pr = roomAt(p.x, p.y);
  for (const r of W.rooms) if (r.flickT > 0) r.flickT -= dt;
  const o = omenPos();
  if (o) {
    for (const r of W.rooms) { if (r.collapsed) continue; if (Math.abs(r.x0 + RW / 2 - o.x) < RW * .78 && Math.abs(r.y0 + FH / 2 - o.y) < FH * .85) r.flickT = .4; }
    if (pr.flickT > 0 && !pr.lightDead && pr.light !== 'dark') { if (Math.random() < dt * 3) AU.play('buzz', { vol: .7 }); if (W.hunter && W.hunter.seen) tip('flicker'); }
  }
  if (W.stage >= 2) {
    W.lampT -= dt;
    if (W.lampT <= 0) {
      W.lampT = rand(16, 34) / (W.stage >= 3 ? 1.6 : 1);
      const cands = W.rooms.filter(r => !r.collapsed && !r.lightDead && r.light !== 'dark' && r.special !== 'dock' && Math.abs(r.c - pr.c) + Math.abs(r.f - pr.f) <= 1 && r.lights && r.lights.length);
      if (cands.length) {
        const r = pick(cands), k = randi(0, r.lights.length - 1); r.deadLamps = r.deadLamps || {};
        if (!r.deadLamps[k]) {
          r.deadLamps[k] = true; const l = r.lights[k];
          spark(l.x, l.y, 14, '#fff3c4', 220);
          for (let j = 0; j < 4; j++) W.fx.push({ k: 'debris', x: l.x, y: l.y, vx: rand(-90, 90), vy: rand(-60, 40), t: 0, life: rand(.5, .9), rot: rand(0, 6), col: '#cfe4ea' });
          flashAt(l.x, l.y + 20, '#fff3c4', 170); AU.at('lamp_pop', l.x, l.y, { range: 900 });
        }
      }
    }
  }
  updateSteam(dt);
}
function updateSteam(dt) {
  const p = W.P, act = W.stage >= 1 ? 1.7 : 1;
  for (const s of W.steam) {
    const r = W.rooms[s.room];
    if (s.on > 0) {
      s.on -= dt;
      if (Math.abs(r.x0 + RW / 2 - p.x) < 900 && Math.abs(r.y0 - p.y) < 720) {
        s.acc += dt * 16;
        while (s.acc > 1) { s.acc--; W.puffs.push({ x: s.x, y: s.y, vx: s.dir * rand(55, 120), vy: rand(-8, 26), t: 0, life: rand(1.3, 2.4), s0: rand(5, 9), s1: rand(34, 62) }); }
      }
    } else { s.t -= dt * act; if (s.t <= 0) { s.t = rand(7, 16); s.on = rand(1.4, 3.2); AU.at('steam', s.x, s.y, { range: 700, dur: s.on }); } }
  }
  for (const f of W.puffs) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 1 - dt * 1.2; f.vy -= 6 * dt; }
  if (W.puffs.length) W.puffs = W.puffs.filter(f => f.t < f.life);
  if (W.puffs.length > 220) W.puffs.splice(0, W.puffs.length - 220);
}
/* ---------- 站內自動廣播 ---------- */
function zhNum(n) { const d = '零一二三四五六七八九'; n = Math.max(0, Math.round(n)); if (n < 10) return d[n]; if (n < 20) return '十' + (n % 10 ? d[n % 10] : ''); if (n < 100) return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : ''); return String(n); }
function say(text, spoken) {
  if (!W) return;
  W.subs.push({ who: '瀚淵站　自動廣播', text, kind: 'ai', dur: 2.4 + text.length / 10, prio: 2 });
  AU.play('announce');
  setTimeout(() => { if (W && W.state !== 'over') AU.speak(spoken || text); }, 700);
}

/* ---------- 目標：只有小怪。聆和母聆不是「目標」——打牠沒有用 ---------- */
function targets() { const out = []; for (const e of W.foes) if (!e.dead) out.push(e); return out; }
function tgtY(e) { return e.y - (e.def.h || 30) * .5 - (e.type === 'jelly' ? 26 : 0) - (e.type === 'wall' ? 18 : 0); }
function findTarget(range, from, face) {
  const p = W.P; from = from || p;
  const pf = floorOf(from.y);
  let best = null, bd = 1e9;
  for (const e of targets()) {
    if (e.climb || floorOf(e.y) !== pf) continue;
    const dx = e.x - from.x, d = Math.abs(dx) + (face && sgn(dx) !== face ? 140 : 0);
    if (Math.abs(dx) > range || d >= bd) continue;
    if (!losClear(from.x, e.x, pf)) continue;
    best = e; bd = d;
  }
  return best;
}
const mobOn = h => h && !h.dead && (h.mother ? h.state !== 'lured' && h.state !== 'gone' : onMap(h));

/* ---------- 槍：按住開火，子彈有限，每一槍都在報位置 ---------- */
function setFire(on) { if (!W) return; const p = W.P; p.fireHeld = !!on && !p.hide; }
const muzzle = () => { const p = W.P; return { x: p.x + p.face * 46, y: p.y - 39 * (p.stealth ? .9 : 1) }; };
function gunNoise(base) { const p = W.P; emitNoise(p.x, p.y - 30, base * PS().noise, 'gun'); }
function updateGun(dt) {
  const p = W.P;
  p.fireCD -= dt; p.target = null;
  if (W.torchT > 0) {
    W.torchT -= dt;
    for (let k = 0; k < 3; k++) W.fx.push({ k: 'flame', x: p.x + p.face * 44, y: p.y - 38, vx: p.face * rand(300, 470), vy: rand(-50, 40), t: 0, life: rand(.22, .38) });
    if (Math.random() < .4) AU.play('weld', { vol: .6 });
  }
  if (W.state !== 'play' || p.caught) return;
  if (p.burstN > 0) { p.burstT -= dt; if (p.burstT <= 0) { p.burstN = 0; if (p.ammo > 0) { p.ammo--; harpoonShot(p.burstA); } } }
  if (!p.fireHeld || p.hide || p.climb || p.channel || p.fireCD > 0) return;
  fireGun();
}
function harpoonShot(ang) {
  const p = W.P, m = muzzle(), L = p.gunLv;
  W.projs.push({ kind: 'harpoon', x: m.x, y: m.y, vx: Math.cos(ang) * 780, vy: Math.sin(ang) * 780, dmg: 50 * (L >= 2 ? 1.35 : 1), life: .62, pierce: 99, hit: new Set(), knock: 70, pin: L >= 5, col: '#e8f0f4', ap: true });
  p.recoil = 2; p.fireT = .12; W.shake = Math.max(W.shake, 3);
  AU.play('harpoon'); gunNoise(WEAPONS.harpoon.noise);
}
function fireGun() {
  const p = W.P, w = WEAPONS[p.gun], L = p.gunLv;
  if (p.ammo <= 0) { p.fireCD = .45; AU.play('empty'); tip('noAmmo'); return; }
  const range = p.gun === 'arc' ? 280 : p.gun === 'harpoon' ? 460 : 360;
  const t = findTarget(range, p, p.face);
  if (t) p.face = sgn(t.x - p.x) || p.face;
  p.target = t;
  const m = muzzle(), straight = p.face > 0 ? 0 : Math.PI;
  if (p.gun === 'arc') {
    if (!t) { p.fireCD = .25; AU.play('deny'); return; }
    p.ammo--;
    const chains = 2 + (L >= 2 ? 1 : 0), dmg = 16 * (L >= 3 ? 1.4 : 1);
    const pts = [[m.x, m.y]], hit = new Set();
    let cur = t;
    for (let k = 0; k <= chains && cur; k++) {
      hit.add(cur); pts.push([cur.x, tgtY(cur)]);
      hurt(cur, dmg, { type: 'elec', crit: true, stun: L >= 5 ? .5 : 0 });
      if (L >= 5 && k > 0) { const fork = nearestFoe(cur, 120, hit); if (fork) { hit.add(fork); hurt(fork, dmg * .6, { type: 'elec' }); W.fx.push({ k: 'bolt', pts: [[cur.x, tgtY(cur)], [fork.x, tgtY(fork)]], t: 0, life: .16, col: '#9ff4ff' }); } }
      cur = nearestFoe(cur, 145, hit);
    }
    // 水中導電：整池一起電；泡在水裡的聆也會被電到
    const tr = roomAt(t.x, t.y);
    if (tr.water > .25 && t.y > tr.floorY - waterAt(tr) - 10) {
      for (const e of targets()) if (!hit.has(e) && roomAt(e.x, e.y) === tr && e.y > tr.floorY - waterAt(tr) - 6) { hit.add(e); hurt(e, dmg * 1.3, { type: 'elec' }); W.fx.push({ k: 'bolt', pts: [[t.x, tgtY(t)], [e.x, tgtY(e)]], t: 0, life: .2, col: '#c7fbff' }); }
      W.fx.push({ k: 'waterzap', room: tr.i, t: 0, life: .35 });
      const h = W.hunter;
      if (onMap(h) && roomAt(h.x, h.y) === tr && !h.climb) { h.flash = .6; if (L >= 5 && !hunterBusy(h)) { stunHunter(h, 2, 'hunt'); toast('聆被電麻了！', '#7fe9ff'); } else { h.tx = p.x; h.ty = p.y; h.know = Math.max(h.know, 1); } }
    }
    W.fx.push({ k: 'bolt', pts, t: 0, life: .17, col: '#7fe9ff' });
    flashAt(m.x, m.y, '#7fe9ff', 110);
    p.fireCD = w.rate; p.recoil = .5; p.fireT = .12;
    AU.play('arc'); gunNoise(w.noise);
    return;
  }
  p.ammo--;
  const ang = t ? Math.atan2(tgtY(t) - m.y, t.x - m.x) : straight;
  if (p.gun === 'harpoon') {
    harpoonShot(ang);
    if (L >= 4 && p.ammo > 0) { p.burstN = 1; p.burstT = .16; p.burstA = ang; }
    p.fireCD = w.rate * (L >= 3 ? .85 : 1);
    return;
  }
  W.projs.push({ kind: 'rivet', x: m.x, y: m.y, vx: Math.cos(ang + rand(-.02, .02)) * 950, vy: Math.sin(ang) * 950, dmg: 10 * (L >= 2 ? 1.3 : 1) * (L >= 5 ? 1.4 : 1), life: .45, pierce: L >= 5 ? 2 : 0, hit: new Set(), knock: 14, col: '#ffcf7a' });
  p.fireCD = w.rate / (L >= 4 ? 1.25 : 1);
  p.recoil = 1; p.fireT = .1; flashAt(m.x, m.y, '#ffd28a', 90);
  AU.play('rivet'); gunNoise(w.noise * (L >= 4 ? .75 : 1));
  W.fx.push({ k: 'shell', x: p.x - p.face * 4, y: p.y - 40, vx: -p.face * rand(40, 90), vy: rand(-160, -90), t: 0, life: .6 });
}
function nearestFoe(from, range, excl) {
  let best = null, bd = range;
  for (const e of targets()) { if (excl.has(e)) continue; const d = Math.hypot(e.x - from.x, (e.y - from.y) * 1.5); if (d < bd && floorOf(e.y) === floorOf(from.y)) { bd = d; best = e; } }
  return best;
}

/* ---------- 子彈 ---------- */
function updateProjs(dt) {
  const keep = [];
  for (const b of W.projs) {
    b.life -= dt;
    const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
    const f = floorOf(b.y + 30);
    const cA = Math.floor(b.x / RW), cB = Math.floor(nx / RW);
    if (cA !== cB) { const c = Math.max(cA, cB); const d = doorAt(c, f); if (c <= 0 || c >= W.C || !d || !passable(d)) { spark(c * RW, b.y, 5, '#ffd28a', 120); if (d && d.state === 'closed') AU.at('armor', c * RW, b.y); continue; } }
    b.x = nx; b.y = ny;
    let dead = false;
    for (const e of targets()) {
      if (b.hit.has(e)) continue;
      const hy = tgtY(e), hh = (e.def.h || 30) * .6 + 8;
      if (Math.abs(e.x - b.x) < (e.def.r || 18) + 6 && Math.abs(hy - b.y) < hh) {
        b.hit.add(e);
        hurt(e, b.dmg, { type: 'phys', crit: true, knock: b.knock, dir: sgn(b.vx), ap: b.ap, pin: b.pin ? 1.2 : 0 });
        spark(b.x, b.y, 4, b.col, 160);
        if (b.pierce-- <= 0) { dead = true; break; }
      }
    }
    // 打在聆身上：沒有用，只會讓牠知道你在哪
    if (!dead) for (const h of [W.hunter, W.mother]) {
      if (!mobOn(h) || b.hit.has(h)) continue;
      const sc = h.mother ? 1.55 : 1, low = h.quad > .5, hy = h.y - (low ? 62 : 118) * sc, hh = (low ? 44 : 92) * sc;
      if (Math.abs(h.x - b.x) < 30 * sc && Math.abs(hy - b.y) < hh) { b.hit.add(h); hunterThud(h, b); dead = true; break; }
    }
    if (!dead && b.life > 0) keep.push(b);
  }
  W.projs = keep;
}

/* ---------- 受傷（小怪） ---------- */
function hurt(e, dmg, o = {}) {
  if (e.dead) return;
  if (e.isHunter) return hunterThud(e, null);
  const st = PS();
  let d = dmg * st.dmg;
  if (e.vuln > 0) d *= 1.3;
  if (e.slow > 0 || e.frozen > 0) d *= 1.2;
  if (o.type === 'elec') d *= st.elec;
  let crit = false;
  if (o.crit && Math.random() < st.crit) { d *= st.critDmg; crit = true; }
  e.hp -= d; e.flash = 1;
  if (o.knock && !e.def.fixed) e.kx = (e.kx || 0) + (o.dir || 1) * o.knock;
  if (o.burn) e.burn = Math.max(e.burn || 0, o.burn);
  if (o.vuln) e.vuln = o.vuln;
  if (o.stun) e.stun = Math.max(e.stun || 0, o.stun);
  if (o.pin) e.stun = Math.max(e.stun || 0, o.pin);
  if (e.idle || e.lurk) { e.idle = false; e.lurk = false; e.awake = true; }
  if (e.type === 'wall' && !e.awake && e.hp > 0) wallWake(e);
  addNum(e, d, crit ? '#ffd25a' : o.type === 'elec' ? '#9ff4ff' : o.type === 'fire' ? '#ffa45a' : o.type === 'cold' ? '#cfeeff' : '#ffffff', crit);
  if (crit) { AU.at('crit', e.x, e.y); W.hitstop = Math.max(W.hitstop, .025); } else AU.at('hit', e.x, e.y, { vol: .7 });
  if (e.hp <= 0) killFoe(e);
}
function addNum(e, d, col, crit) {
  if (!G.settings.nums) return;
  const last = e.numRef;
  if (last && last.t < .3 && !last.done && last.col === col) { last.v += d; last.t = Math.min(last.t, .12); last.pop = 1; return; }
  const n = { x: e.x + rand(-8, 8), y: tgtY(e) - (e.def.h || 30) * .4, v: d, col, t: 0, crit, pop: 1 };
  e.numRef = n; W.nums.push(n);
}
function killFoe(e) {
  e.dead = true; e.deadT = 0; W.kills++;
  const st = PS();
  const col = e.type === 'jelly' ? '#8ff0ff' : e.type === 'eel' ? '#6dd3c0' : '#b6ff6d';
  spark(e.x, tgtY(e), 14, col, 220);
  W.fx.push({ k: 'goo', x: e.x, y: e.y, t: 0, life: 6, r: (e.def.r || 18) * 1.1, col: e.type === 'jelly' || e.type === 'eel' ? '#1d2f33' : '#2c3a22' });
  if (e.type === 'wall') { W.fx.push({ k: 'goo', x: e.x, y: e.y, t: 0, life: 9, r: 26, col: '#3a1a14' }); e.silent = true; }
  AU.at(e.type === 'jelly' || e.type === 'eel' ? 'kill' : 'kill_h', e.x, e.y);
  if (Math.random() < .26) dropItem({ kind: 'ammo' }, e.x, tgtY(e));
  if (Math.random() < .04) dropItem({ kind: 'med' }, e.x, e.y - 20);
  if (Math.random() < .03) dropItem({ kind: 'battery' }, e.x, e.y - 20);
  if (st.leech && Math.random() < .3) W.P.hp = Math.min(W.P.hpMax, W.P.hp + 6);
}

/* ---------- 小怪 ---------- */
function spawnFoe(type, x, y, awake = true) {
  const def = FOES[type], sec = W.S.endless ? 4 + W.S.tier * .5 : W.si;
  const hpm = 1 + .2 * sec, dmgm = 1 + .12 * sec;
  const e = { type, def, x, y, hp: def.hp * hpm, hpMax: def.hp * hpm, dmg: def.dmg * dmgm, face: Math.random() < .5 ? 1 : -1, walk: rand(0, 6), flash: 0, kx: 0,
    wind: 0, windT: 0, cd: rand(.3, 1), climb: null, awake, seed: rand(0, 9), shoutCD: rand(1, 3), spawnT: .5, slow: 0, frozen: 0, burn: 0, vuln: 0, stun: 0, fuseT: 0, lungeT: 0,
    idle: false, chase: false, lurk: false, sleepCD: 0, moanT: 0, moanP: 0, lostT: 0, dir: Math.random() < .5 ? -1 : 1 };
  W.foes.push(e);
  return e;
}
function foeGoal(e) {
  if (e.lure && e.lureT > 0) return { x: e.lure.x, y: e.lure.y };
  if (e.chase) return { x: W.P.x, y: W.P.climb ? W.P.climb.y2 : W.P.y };
  if (e.inv) return e.inv;
  return null;
}
function huskSees(e) {
  const p = W.P;
  if (p.hide || p.caught || floorOf(p.y) !== floorOf(e.y)) return false;
  const d = Math.abs(p.x - e.x), range = p.stealth ? 170 : 290;
  if (d > range) return false;
  if (sgn(p.x - e.x) !== e.face && d > 90) return false;  // 背對你的時候，只有很近才會發現
  return losClear(p.x, e.x, floorOf(p.y));
}
function huskShout(e) {
  const p = W.P;
  e.shoutCD = 7; e.shoutT = 1;
  emitNoise(e.x, e.y - 50, 540, 'husk'); AU.at('shout', e.x, e.y, { range: 1200 });
  if (Math.abs(p.x - e.x) < 320) W.subs.push({ who: '回聲人', text: pick(HUSK_LINES), kind: 'voice', dur: 2.4, prio: 1 });
  tip('husk');
}
function wallWake(e) {
  if (e.dead || e.silent) return;
  e.awake = true; e.moanT = 8; e.moanP = 2.4; e.shoutT = 1.2;
  emitNoise(e.x, e.y - 90, 620, 'wall'); AU.at('wall_scream', e.x, e.y, { range: 1400 });
  if (Math.abs(W.P.x - e.x) < 420) W.subs.push({ who: '牆裡的人', text: pick(WALL_LINES), kind: 'voice', dur: 2.6, prio: 1 });
  tip('wall');
}
function updateFoe(e, dt) {
  e.flash = Math.max(0, e.flash - dt * 7); e.spawnT = Math.max(0, e.spawnT - dt);
  if (e.burn > 0) { e.burn -= dt; e.burnTick = (e.burnTick || 0) - dt; if (e.burnTick <= 0) { e.burnTick = .4; hurt(e, 5, { type: 'fire' }); if (e.dead) return; } }
  e.slow = Math.max(0, e.slow - dt); e.frozen = Math.max(0, e.frozen - dt); e.vuln = Math.max(0, e.vuln - dt); e.stun = Math.max(0, e.stun - dt); e.shoutT = Math.max(0, (e.shoutT || 0) - dt);
  if (e.lureT > 0) e.lureT -= dt; else e.lure = null;
  if (e.kx) { const k = e.kx * Math.min(1, dt * 10); moveX(e, e.x + k, e.def.r); e.kx -= k; if (Math.abs(e.kx) < 1) e.kx = 0; }
  if (e.spawnT > 0 || e.frozen > 0 || e.stun > 0) return;
  switch (e.type) {
    case 'wall': return updateWall(e, dt);
    case 'husk': return updateHusk(e, dt);
    case 'drowned': return updateDrowned(e, dt);
    case 'jelly': return updateJelly(e, dt);
    default: return foeChase(e, dt, null);
  }
}
/* 攻擊前搖：時間到時你還在範圍內才會打中 */
function foeWind(e, dt) {
  const p = W.P, def = e.def;
  e.windT += dt;
  if (e.type === 'eel' && e.windT >= def.wind) { if (!e.lungeT) { e.lungeT = .35; e.lungeDir = e.face; } }
  if (e.lungeT > 0) { e.lungeT -= dt; moveX(e, e.x + e.lungeDir * 420 * dt, def.r); if (!p.hide && Math.abs(p.x - e.x) < 34 && Math.abs(p.y - e.y) < 50) { hurtPlayer(e.dmg, e); e.lungeT = 0; } if (e.lungeT <= 0) { e.wind = 0; e.lungeT = 0; e.cd = 1.4; } return; }
  if (e.windT >= def.wind) {
    e.wind = 0; e.cd = 1.1;
    if (p.hide) return;
    if (Math.abs(p.x - e.x) < def.reach * 1.3 && floorOf(p.y) === floorOf(e.y) && !p.climb) { hurtPlayer(e.dmg, e); if (e.type === 'drowned') p.slowT = 1.2; }
    else if (p.climb && Math.abs(p.x - e.x) < def.reach && Math.abs(p.y - e.y) < 60) hurtPlayer(e.dmg, e);
  }
}
/* 共用：往目標移動（會開門、爬梯、撞門），到了就攻擊 */
function foeChase(e, dt, spdOverride) {
  const p = W.P, def = e.def;
  if (e.climb) {
    const L = e.climb.lad, ty = e.climb.dir > 0 ? L.y2 : L.y1;
    e.x = L.x; e.y = approach(e.y, ty, (spdOverride || def.spd) * .7 * dt); e.walk += dt * 6;
    if (e.y === ty) e.climb = null;
    return;
  }
  if (e.wind > 0) return foeWind(e, dt);
  e.cd -= dt;
  const goal = foeGoal(e);
  if (!goal) { e.walk += dt; return; }
  const r = roomAt(e.x, e.y);
  const inWater = r.water > .25 && waterAt(r) > 20;
  let spd = spdOverride || def.spd;
  if (e.type === 'eel') spd = inWater ? def.wspd : 30;
  else if (!spdOverride && inWater) spd *= .75;
  if (e.slow > 0) spd *= .45;
  e.atDoor = null;
  const gR = roomAt(goal.x, goal.y);
  let tx = null;
  if (r === gR && floorOf(goal.y) === floorOf(e.y)) {
    tx = goal.x;
    if (e.lure && Math.abs(goal.x - e.x) < 30) { e.walk += dt; return; }
    if (e.chase && !e.lure && !p.hide && Math.abs(p.x - e.x) < def.reach && !p.climb && e.cd <= 0) { e.wind = def.wind; e.windT = 0; e.face = sgn(p.x - e.x) || e.face; return; }
    if (e.chase && !e.lure && !p.hide && p.climb && Math.abs(p.x - e.x) < def.reach && Math.abs(p.y - e.y) < 60 && e.cd <= 0) { e.wind = def.wind; e.windT = 0; return; }
    if (e.inv && Math.abs(goal.x - e.x) < 24) { e.inv = null; e.idle = true; return; }
  } else {
    const ed = navNext(r, gR, e.type === 'eel' ? 'eel' : 'foe');
    if (!ed) { e.walk += dt; return; }
    if (ed.lad) { if (Math.abs(e.x - ed.lad.x) < 6) { e.climb = { lad: ed.lad, dir: ed.dir }; e.x = ed.lad.x; return; } tx = ed.lad.x; }
    else if (ed.door) tx = ed.door.x + (ed.door.x > e.x ? 40 : -40);
  }
  if (tx != null) {
    const dx = tx - e.x;
    if (Math.abs(dx) > 3) {
      e.face = sgn(dx);
      const bl = moveX(e, e.x + clamp(dx, -spd * dt, spd * dt), def.r);
      e.walk += dt * spd / 8;
      if (bl && bl !== 'wall') doorAttack(e, bl, dt);
    }
  }
}
function updateHusk(e, dt) {
  const p = W.P;
  e.shoutCD -= dt;
  // 一頓一頓的走法（像壞掉的影片）
  const jerk = .3 + 1.15 * Math.max(0, Math.sin(e.seed * 3 + W.t * 2.4));
  if (e.idle) {
    e.walk += dt * 2 * jerk; e.idleT = (e.idleT || 0) - dt;
    if (e.idleT <= 0) { e.idleT = rand(2, 5); e.idleDir = Math.random() < .5 ? -1 : 1; }
    const r = roomAt(e.x, e.y), nx = e.x + e.idleDir * 16 * jerk * dt;
    if (nx > r.x0 + 30 && nx < r.x0 + RW - 30) moveX(e, nx, e.def.r); else e.idleDir *= -1;
    e.face = e.idleDir;
    if (huskSees(e)) { e.idle = false; e.chase = true; e.awake = true; e.face = sgn(p.x - e.x); huskShout(e); }
    return;
  }
  if (e.chase) {
    if (huskSees(e) || (Math.abs(p.x - e.x) < 70 && floorOf(p.y) === floorOf(e.y) && !p.hide)) { e.lostT = 0; if (e.shoutCD <= 0) huskShout(e); }
    else { e.lostT += dt; if (e.lostT > 5) { e.chase = false; e.idle = true; e.lostT = 0; } }
    return foeChase(e, dt, e.def.spd * 1.35 * jerk);
  }
  if (e.inv) { if (huskSees(e)) { e.inv = null; e.chase = true; huskShout(e); return; } return foeChase(e, dt, e.def.spd * jerk); }
  e.idle = true;
}
function updateDrowned(e, dt) {
  const p = W.P, r = roomAt(e.x, e.y), wet = r.water > .22 && waterAt(r) > 26;
  const same = floorOf(p.y) === floorOf(e.y) && !p.hide, d = Math.abs(p.x - e.x);
  if (e.lurk) {
    e.walk += dt; e.lurkA = Math.min(1, (e.lurkA || 0) + dt);
    if (!wet) e.lurk = false;
    else if (same && roomAt(p.x, p.y) === r && (d < 120 || (p.wet && d < 230))) { e.lurk = false; e.chase = true; AU.at('surge', e.x, e.y, { range: 900 }); tip('drowned'); W.fx.push({ k: 'ring', x: e.x, y: r.floorY - waterAt(r), r0: 6, r1: 70, t: 0, life: .5, col: '#a8ecff', w: 4 }); }
    return;
  }
  if (!e.chase) { if (same && d < 260) e.chase = true; else { e.walk += dt; return; } }
  if (!same || d > 520) { e.lostT += dt; if (e.lostT > 4) { e.chase = false; e.lostT = 0; if (wet) e.lurk = true; return; } } else e.lostT = 0;
  if (wet && Math.abs(e.vx0 = (e.x - (e.px0 || e.x))) > .5) { e.splT = (e.splT || 0) - dt; if (e.splT <= 0) { e.splT = .45; emitNoise(e.x, r.floorY - 10, 150, 'foe', false); AU.at('splash', e.x, e.y, { vol: .8 }); } }
  e.px0 = e.x;
  foeChase(e, dt, wet ? e.def.wspd : e.def.spd);
}
function updateWall(e, dt) {
  const p = W.P;
  e.sleepCD = Math.max(0, e.sleepCD - dt);
  if (e.silent) return;
  if (!e.awake) {
    const same = roomAt(p.x, p.y) === roomAt(e.x, e.y) && floorOf(p.y) === floorOf(e.y);
    if (same && !p.hide && e.sleepCD <= 0) { const d = Math.abs(p.x - e.x); if ((!p.stealth && d < 150) || d < 40) wallWake(e); }
    return;
  }
  e.moanT -= dt; e.moanP -= dt;
  if (e.moanP <= 0) { e.moanP = 2.4; emitNoise(e.x, e.y - 90, 330, 'wall'); AU.at('moan', e.x, e.y, { range: 1000 }); }
  if (e.moanT <= 0) { e.awake = false; e.sleepCD = 7; return; }
  if (e.wind > 0) return foeWind(e, dt);
  e.cd -= dt;
  if (!p.hide && floorOf(p.y) === floorOf(e.y) && Math.abs(p.x - e.x) < e.def.reach && e.cd <= 0) { e.wind = e.def.wind; e.windT = 0; e.face = sgn(p.x - e.x) || e.face; }
}
function updateJelly(e, dt) {
  const p = W.P, def = e.def;
  if (e.fuseT > 0) { e.fuseT += dt; if (e.fuseT >= def.fuse) jellyBoom(e); return; }
  if (!p.hide && Math.hypot(p.x - e.x, (p.y - 30) - (e.y - 26)) < 62) { e.fuseT = .001; AU.at('click', e.x, e.y); return; }
  const r = roomAt(e.x, e.y);
  let tx = e.lure ? e.lure.x : null;
  if (tx == null) { const nx = e.x + e.dir * def.spd * dt; if (nx < r.x0 + 40 || nx > r.x0 + RW - 40) e.dir *= -1; else moveX(e, nx, def.r); }
  else { const dx = tx - e.x; if (Math.abs(dx) > 6) { const bl = moveX(e, e.x + clamp(dx, -def.spd * 2 * dt, def.spd * 2 * dt), def.r); if (bl && bl !== 'wall') doorAttack(e, bl, dt); } }
  e.walk += dt * 3;
}
function doorAttack(e, d, dt) {
  if (d.state !== 'closed') return;
  e.atDoor = d;
  d.hp -= e.def.door * dt; d.hitT = .25; d.shake = 1;
  e.walk += dt * 10;
  if (Math.random() < dt * 3) AU.at('door_hit', d.x, d.y, { vol: .8 });
  if (d.hp <= 0) breakDoor(d);
}
function breakDoor(d) {
  d.state = 'broken'; d.open = 1; d.hp = 0; markDoors();
  AU.at('door_break', d.x, d.y, { range: 1400 });
  emitNoise(d.x, d.y - 60, 300, 'door');
  for (let k = 0; k < 18; k++) W.fx.push({ k: 'debris', x: d.x + rand(-8, 8), y: d.y - rand(10, 110), vx: rand(-220, 220), vy: rand(-260, -40), t: 0, life: rand(.6, 1.2), rot: rand(0, 6), col: pick(['#56646b', '#e2b23a', '#2a343a']) });
  W.shake = Math.max(W.shake, 6);
}
function jellyBoom(e) {
  const p = W.P;
  e.hp = 0; killFoe(e);
  W.fx.push({ k: 'ring', x: e.x, y: e.y - 26, r0: 10, r1: e.def.blast, t: 0, life: .35, col: '#9ff4ff', w: 10 });
  flashAt(e.x, e.y - 26, '#bff8ff', 180);
  AU.at('pop', e.x, e.y); emitNoise(e.x, e.y - 26, 260, 'boom');
  if (!p.hide && Math.hypot(p.x - e.x, (p.y - 30) - (e.y - 26)) < e.def.blast) hurtPlayer(e.dmg, e);
  for (const d of W.doors) if (d.state === 'closed' && Math.abs(d.x - e.x) < 60 && floorOf(d.y) === floorOf(e.y)) { d.hp -= e.def.door; d.hitT = .3; if (d.hp <= 0) breakDoor(d); }
}
function separateFoes() {
  const fs = W.foes;
  for (let i = 0; i < fs.length; i++) {
    const a = fs[i]; if (a.dead || a.climb || a.def.fixed || a.lurk) continue;
    for (let j = i + 1; j < fs.length; j++) {
      const b = fs[j]; if (b.dead || b.climb || b.def.fixed || b.lurk || a.def.fly !== b.def.fly) continue;
      if (Math.abs(a.y - b.y) > 20) continue;
      const dx = b.x - a.x, min = (a.def.r + b.def.r) * .7;
      if (Math.abs(dx) < min) { const push = (min - Math.abs(dx)) * .5 * (dx < 0 ? -1 : 1); moveX(a, a.x - push * .5, a.def.r); moveX(b, b.x + push * .5, b.def.r); }
    }
  }
}

/* ---------- 導航（房間圖） ---------- */
function roomEdges(r, mode) {
  const out = [];
  if (r.doorL && r.doorL.state !== 'locked') out.push({ to: r.i - 1, door: r.doorL, cost: r.doorL.state === 'closed' ? (mode === 'hunter' ? 1.6 : 3) : 1 });
  if (r.doorR && r.doorR.state !== 'locked') out.push({ to: r.i + 1, door: r.doorR, cost: r.doorR.state === 'closed' ? (mode === 'hunter' ? 1.6 : 3) : 1 });
  if (mode !== 'eel') {
    if (r.ladDown) out.push({ to: r.i + W.C, lad: r.ladDown, dir: 1, cost: 1.5 });
    if (r.ladUp) out.push({ to: r.i - W.C, lad: r.ladUp, dir: -1, cost: 1.5 });
  }
  return out;
}
function navNext(from, goal, mode) {
  const key = goal.i + mode;
  let fl = W.flowCache[key];
  if (!fl || W.t - fl.t > .3) {
    const N = W.rooms.length, D = new Float32Array(N).fill(1e9);
    D[goal.i] = 0;
    const q = [goal.i], inq = new Uint8Array(N); inq[goal.i] = 1;
    while (q.length) { const i = q.shift(); inq[i] = 0; for (const ed of roomEdges(W.rooms[i], mode)) { const nd = D[i] + ed.cost; if (nd < D[ed.to]) { D[ed.to] = nd; if (!inq[ed.to]) { q.push(ed.to); inq[ed.to] = 1; } } } }
    fl = W.flowCache[key] = { t: W.t, D };
  }
  let best = null, bd = 1e9;
  for (const ed of roomEdges(from, mode)) { const v = fl.D[ed.to] + ed.cost; if (v < bd) { bd = v; best = ed; } }
  return bd < 1e8 ? best : null;
}

/* ---------- 獵手「聆」：打不死、比你快、被抓到就完了 ---------- */
const onMap = h => h && !h.dead && h.state !== 'away' && h.state !== 'venting' && h.state !== 'crawl' && h.state !== 'gone';
const HBUSY = { attack: 1, grab: 1, stun: 1, flee: 1, drop: 1, trapped: 1, charge: 1, smash: 1 };
const hunterBusy = h => !!HBUSY[h.state];
function hearMul(h) { return h.H.hear * (W.stage >= 2 ? 1.2 : 1) * (W.stage >= 4 ? 1.15 : 1); }
function hunterHear(p) {
  const h = W.hunter;
  if (!h || h.dead || h.state === 'gone' || h.state === 'venting' || hunterBusy(h)) return;
  const mul = hearMul(h);
  if (h.state === 'away') {
    if (h.awayCD > 0) return;
    if (p.r * mul < 300) return;
    h.heardAt = { x: p.x, y: p.y };
    h.awayT = Math.min(h.awayT, rand(1.5, 4));
    return;
  }
  if (h.state === 'crawl') {
    if (p.r * mul < 200 || (h.reT || -9) > W.t - 2) return;
    const v = pickVentArrive(p.x, p.y, true); if (!v || v === h.vent) return;
    h.reT = W.t; h.c0 = { x: h.cx, y: h.cy }; h.vent = v; h.crawlT = 0; h.crawlDur = clamp(Math.hypot(v.x - h.cx, v.y - h.cy) / 170, 1.5, 6); h.tx = p.x; h.ty = p.y;
    return;
  }
  if (!heardBy(p, h.x, h.y - 120, mul)) return;
  if (h.state === 'check' && h.checkSp && Math.abs(p.x - h.checkSp.x) < 40) return;
  h.tx = p.x; h.ty = p.y; h.heard = 1; h.alertT = 1.5;
  if (p.src === 'hide') h.hideHeard = { x: p.x, t: W.t };
  AU.at('growl', h.x, h.y, { vol: .8 });
  const d = Math.hypot(p.x - h.x, p.y - h.y);
  // 很近的腳步聲、槍聲：牠知道你就在那裡
  if (d < 320 && (p.src === 'player' || p.src === 'gun')) h.know = Math.max(h.know, 1);
  h.state = (d < 760 || p.src === 'gun' || p.r * mul > 420) ? 'hunt' : 'search';
  h.searchT = 0; h.checkSp = null; h.checkQ = []; h.checkSnd = false;
}
/* 子彈打在牠身上：一點用都沒有，只會讓牠確定你在哪 */
function hunterThud(h, b) {
  const p = W.P;
  h.flash = .45;
  spark(b ? b.x : h.x, b ? b.y : h.y - 100, 6, '#c9d6dc', 140);
  AU.at('thud', h.x, h.y);
  if (h.mother || hunterBusy(h)) return;
  h.tx = p.x; h.ty = p.y; h.know = Math.max(h.know, 1.2); h.heard = 1;
  if (h.state !== 'hunt') { h.state = 'hunt'; h.checkSp = null; h.checkQ = []; AU.at('growl', h.x, h.y, { vol: 1.3 }); }
  tip('bullet', true);
}
function stunHunter(h, t, after) {
  if (h.dead || h.state === 'trapped' || h.state === 'grab') return;
  const was = h.state === 'stun' ? h.stunT : 0;
  h.state = 'stun'; h.stunT = Math.max(was, t); h.after = after || 'hunt';
  h.atk = 0; h.mouth = 0; h.atkT = 0; h.struck = false; h.lean = 0; h.checkSp = null; h.checkQ = [];
}
function repelHunter(h, how) {
  if (h.dead || h.state === 'trapped' || h.state === 'flee' || h.state === 'grab') return;
  h.repelled++;
  if (how === 'fire' && h.repelled >= 3) {
    stunHunter(h, .6, 'hunt'); h.know = 1.5; h.tx = W.P.x; h.ty = W.P.y;
    AU.at('growl', h.x, h.y, { vol: 1.6 }); tip('fearless', true); banner('牠不怕火了', '', '');
    return;
  }
  stunHunter(h, .8, 'flee');
  AU.at('shriek', h.x, h.y, { range: 2000 }); W.shake = Math.max(W.shake, 8);
  banner('聆 退走了', h.repelled >= 2 ? '下一次，火就沒用了' : '牠記得痛', 'cy'); tip('repel', true);
}
function hunterDie(h) {
  h.dead = true; h.state = 'dead'; h.deadT = 0; W.obj.hunterKill = true;
  AU.play('shriek'); W.shake = 18; W.slow = .35; setTimeout(() => { if (W) W.slow = 1; }, 900);
  W.pressure = Math.max(0, W.pressure - 10);
  banner('聆 倒下了', '整座站安靜了一下', 'gd'); setTimeout(() => { if (W) tip('kill', true); }, 1400);
  spark(h.x, h.y - 100, 40, '#7fe9ff', 320);
  dropItem({ kind: 'relic', id: 'disc', rar: 5 }, h.x, h.y - 60);
  const bp = lockedWeapons()[0]; if (bp) dropItem({ kind: 'bp', id: bp, rar: 4 }, h.x + 30, h.y - 60);
  dropItem({ kind: 'loot', rar: 5 }, h.x - 30, h.y - 60);
  dropItem({ kind: 'cache', rar: 3 }, h.x + 50, h.y - 60);
  G.stats.hunterKills++;
}
function startAttack(h) {
  h.state = 'attack'; h.atkT = 0; h.struck = false; h.face = sgn(W.P.x - h.x) || h.face; h.lean = 0;
  AU.at('lunge', h.x, h.y, { vol: 1.4 }); AU.play('sting', { force: true });
}
/* 被抓住：有震爆彈就炸牠的耳朵掙脫，沒有就完了 */
function grabPlayer(h) {
  const p = W.P;
  if (p.hide) exitHide(true);
  if (W.god || p.flashes > 0) {
    if (!W.god) p.flashes--;
    W.escapes++;
    W.fx.push({ k: 'ring', x: h.x + h.face * 40, y: h.y - 140, r0: 10, r1: 280, t: 0, life: .5, col: '#ffffff', w: 10 });
    flashAt(h.x, h.y - 120, '#ffffff', 460); UI.flashScreen('rgba(255,255,255,.9)');
    AU.play('flashbang'); W.shake = 16; W.hitstop = .14; vib(180);
    if (h.mother) { h.stunT = 2.6; h.state = 'hunt'; h.atk = 0; h.mouth = 0; } else { stunHunter(h, 2.8, 'flee'); h.repelled = Math.max(0, h.repelled - 1); }
    p.inv = 2.4; p.adrenT = 3; moveX(p, p.x - h.face * 70, PW);
    if (!W.god) { p.hp = Math.max(1, p.hp - 12); UI.hurt(.3); }
    W.scare = 1;
    banner('掙脫了', p.flashes > 0 ? `震爆彈還剩 ${p.flashes} 顆` : '震爆彈用完了', '');
    tip('grabEscape', true); if (!p.flashes) setTimeout(() => { if (W && W.state === 'play') tip('lastFlash', true); }, 2600);
    return;
  }
  h.state = 'grab'; h.grabT = 0; h.atk = 1; h.mouth = 1; h.quad = 0;
  p.caught = true; p.hold = false; W.caughtBy = h.mother ? 'mother' : 'hunter';
  AU.play('grab'); W.shake = 24; vib([60, 40, 260]);
  UI.flashScreen('rgba(170,0,20,.7)');
  W.state = 'dying'; W.dieT = 2.3; p.hp = 0;
}
/* 牠的感官：撞到你、聽到你的呼吸和心跳 */
function hunterSense(h) {
  const p = W.P;
  if (W.state !== 'play' || p.caught) return false;
  const hr = roomAt(h.x, h.y), pr = roomAt(p.x, p.y);
  if (hr !== pr && soundCost()[hr.i][pr.i] >= .99) return false;
  const dx = Math.abs(p.x - h.x), sameF = floorOf(p.y) === floorOf(h.y) && !p.climb && !h.climb;
  if (!p.hide && sameF && dx < 40) return true;
  const checking = h.state === 'check' && p.hide && h.checkSp === p.hide.spot && h.checkT > .35;
  const r = bodyNoise() * (checking ? 2.6 : 1) * (h.state === 'hunt' ? 1.1 : 1);
  if (r <= 0) return false;
  const d = sameF || p.hide ? (floorOf(p.y) === floorOf(h.y) ? dx : 1e9) : Math.hypot(dx, (p.y - h.y) * .9);
  return d < r;
}
/* 到了聲音的位置：要不要翻附近的櫃子、床底、桌子底下？牠會記得你躲過哪裡 */
function planChecks(h) {
  const r = roomAt(h.tx, h.ty); h.checkQ = [];
  if (!r || !r.hides || !r.hides.length) return;
  const c = [];
  for (const sp of r.hides) {
    const near = Math.abs(sp.x - h.tx);
    if (near > 240) continue;
    let pr = .1 + .2 * (W.learn[sp.type] || 0);
    if (h.hideHeard && W.t - h.hideHeard.t < 10 && Math.abs(h.hideHeard.x - sp.x) < 30) pr += .85;
    if (Math.random() < Math.min(.92, pr)) c.push([near, sp]);
  }
  c.sort((a, b) => a[0] - b[0]);
  h.checkQ = c.slice(0, 2).map(q => q[1]);
}
function hunterGoTo(h, tx, ty) {
  // 走不到就鑽管道
  const myR = roomAt(h.x, h.y), gR = roomAt(tx, ty);
  if (myR === gR && floorOf(ty) === floorOf(h.y)) return { x: tx };
  const ed = navNext(myR, gR, 'hunter');
  if (!ed) return null;
  if (ed.lad) return { lad: ed.lad, dir: ed.dir };
  return { x: ed.door.x + (ed.door.x > h.x ? 50 : -50), door: ed.door };
}
function pickVentArrive(x, y, heard) {
  // 聽到聲音：從離聲源一到三間艙外的通風口出來，給玩家時間安靜下來
  const tr = roomAt(x, y), D = soundCost(), pr = roomAt(W.P.x, W.P.y);
  const c = W.vents.filter(v => v.room !== pr.i && D[v.room][tr.i] >= (heard ? 1 : 2) && D[v.room][tr.i] <= (heard ? 3 : 5));
  if (c.length) return pick(c);
  return pickVentNear(x, y, pr.i);
}
function pickVentNear(x, y, exclRoom) {
  const tr = roomAt(x, y), D = soundCost();
  let best = null, bd = 1e9;
  for (const v of W.vents) { if (exclRoom != null && v.room === exclRoom) continue; const c = D[v.room][tr.i] + Math.abs(v.x - x) / 2000; if (c < bd) { bd = c; best = v; } }
  return best;
}
function updateHunter(dt) {
  const h = W.hunter, p = W.P;
  if (!h) return;
  if (h.dead) { h.deadT = (h.deadT || 0) + dt; return; }
  h.flash = Math.max(0, h.flash - dt * 5); h.alertT = Math.max(0, h.alertT - dt); h.slowT = Math.max(0, h.slowT - dt);
  h.bashT = Math.max(0, (h.bashT || 0) - dt); h.lastX = h.curX; h.curX = h.x;
  if (h.awayCD > 0) h.awayCD -= dt;
  const wantQuad = ((h.state === 'hunt' || h.state === 'flee') && h.moving) || h.state === 'drop' ? 1 : 0;
  h.quad = approach(h.quad, wantQuad, dt * (wantQuad ? 5 : 3));
  if (h.state !== 'attack' && h.state !== 'grab' && h.state !== 'smash') h.atk = approach(h.atk, 0, dt * 3);
  if (h.state !== 'check') h.lean = approach(h.lean, 0, dt * 3);
  const H = h.H;
  switch (h.state) {
    case 'gone': return;
    case 'away': {
      h.awayT -= dt;
      if (h.awayT <= 0 && W.t > 8) {
        const tgt = h.heardAt || { x: p.x + rand(-500, 500), y: p.y };
        let v = pickVentArrive(tgt.x, tgt.y, !!h.heardAt);
        if (!v) { h.awayT = 10; return; }
        // 先在管道裡爬過來：天花板上聽得到、偵測器看得到
        const far = W.vents.filter(o => o !== v && Math.hypot(o.x - v.x, o.y - v.y) > 480);
        const s0 = far.length ? pick(far) : { x: clamp(v.x + (v.x > W.C * RW / 2 ? -700 : 700), 20, W.C * RW - 20), y: v.y };
        h.state = 'crawl'; h.vent = v; h.c0 = { x: s0.x, y: s0.y }; h.cx = s0.x; h.cy = s0.y; h.crawlT = 0; h.crawlStep = .4;
        h.crawlDur = clamp(Math.hypot(s0.x - v.x, s0.y - v.y) / 160, 3.5, 8.5);
        h.tx = tgt.x; h.ty = tgt.y; h.heardAt = null; h.repelledHere = 0;
        tip('vent'); tip('crawl'); if (!G.tips.tracker) tip('tracker');
      }
      return; }
    case 'crawl': {
      h.crawlT += dt;
      const u = clamp(h.crawlT / h.crawlDur, 0, 1), u2 = u * u * (3 - 2 * u);
      h.cx = lerp(h.c0.x, h.vent.x, u2); h.cy = lerp(h.c0.y, h.vent.y, u2);
      h.crawlStep -= dt;
      if (h.crawlStep <= 0) {
        h.crawlStep = rand(.28, .5); AU.at('crawl', h.cx, h.cy, { range: 1100, vol: 1.15 });
        const r = roomAt(h.cx, h.cy + 40);
        if (r && !r.collapsed && Math.random() < .7) W.fx.push({ k: 'dust', x: h.cx + rand(-16, 16), y: r.y0 + SLAB + 4, vx: rand(-8, 8), vy: rand(30, 70), t: 0, life: 1.4 });
      }
      if (u >= 1) { h.state = 'venting'; h.ventT = 2.6 + (G.survivors.lin ? 1.5 : 0); }
      return; }
    case 'venting': {
      h.ventT -= dt; h.vent.shake = 1;
      if (Math.random() < dt * 2.2) AU.at('vent', h.vent.x, h.vent.y, { range: 1300, vol: 1.1 });
      if (Math.random() < dt * 6) W.fx.push({ k: 'drip', x: h.vent.x + rand(-18, 18), y: h.vent.y + 15, vx: 0, vy: 20, t: 0, life: 2.5, fy: W.rooms[h.vent.room].floorY });
      if (Math.random() < dt * 2.5) AU.at('drip', h.vent.x, h.vent.y, { range: 700 });
      if (Math.random() < dt * 8) W.fx.push({ k: 'dust', x: h.vent.x + rand(-24, 24), y: h.vent.y + 14, vx: rand(-20, 20), vy: rand(10, 60), t: 0, life: 1.2 });
      if (h.ventT <= 0) {
        const r = W.rooms[h.vent.room];
        h.x = h.vent.x; h.y = h.vent.y + 20; h.state = 'drop'; h.dropT = 0; h.dropY = r.floorY; h.face = sgn(p.x - h.x) || 1;
        h.vent.shake = 0; h.know = 0; h.checkQ = []; h.checkSp = null;
        AU.at('step', h.x, r.floorY, { range: 1400, vol: 1.3 });
        if (!h.stungT || W.t - h.stungT > 60) { h.stungT = W.t; if (Math.hypot(h.x - p.x, h.y - p.y) < 1200) AU.play('sting'); }
        if (!h.seen) { h.seen = true; banner('聆', '牠看不見你。牠聽得見你。', ''); setTimeout(() => tip('hunterSeen'), 1500); }
      }
      return; }
    case 'drop': {
      h.dropT += dt; h.y = lerp(h.vent.y + 20, h.dropY, ease.inCubic(Math.min(1, h.dropT / .45)));
      if (h.dropT >= .45) { h.y = h.dropY; h.state = 'search'; h.searchT = 0; W.shake = Math.max(W.shake, roomAt(h.x, h.y) === roomAt(p.x, p.y) ? 7 : 2); AU.at('step', h.x, h.y, { vol: 1.4 }); if (Math.abs(h.tx - h.x) < 30 && roomAt(h.tx, h.ty) === roomAt(h.x, h.y)) planChecks(h); }
      return; }
    case 'stun': {
      h.stunT -= dt; h.mouth = approach(h.mouth, 0, dt * 3);
      if (h.stunT <= 0) { h.state = h.after || 'hunt'; if (h.state === 'hunt' && Math.hypot(p.x - h.x, p.y - h.y) < 520) { h.tx = p.x; h.ty = p.y; } }
      return; }
    case 'flee': {
      const v = pickVentNear(h.x, h.y, roomAt(p.x, p.y).i) || pickVentNear(h.x, h.y);
      if (!v) { h.state = 'away'; h.awayT = 45; return; }
      const mv = hunterGoTo(h, v.x, W.rooms[v.room].floorY);
      if (!mv) { h.state = 'away'; h.awayT = 45; return; }
      hunterMove(h, mv, H.run * .9, dt);
      if (roomAt(h.x, h.y).i === v.room && Math.abs(h.x - v.x) < 26) { h.state = 'away'; h.awayT = 45 + rand(0, 15); h.awayCD = 30; AU.at('vent', v.x, v.y); v.shake = 1; }
      return; }
    case 'attack': {
      h.atkT += dt; h.atk = Math.min(1, h.atkT / .5); h.mouth = h.atk;
      // 撲過去：前搖的時候還在往你那邊衝，後退是躲不掉的
      if (h.atkT < .55 && !p.hide && floorOf(p.y) === floorOf(h.y) && !h.climb) { const dx = p.x - h.x; h.face = sgn(dx) || h.face; if (Math.abs(dx) > 48) { moveX(h, h.x + clamp(dx - sgn(dx) * 44, -H.run * 1.3 * dt, H.run * 1.3 * dt), 26); h.walk += dt * 6; } }
      if (h.atkT >= .55 && !h.struck) {
        h.struck = true;
        const reach = !p.caught && W.state === 'play' && Math.abs(p.x - h.x) < 108 && (floorOf(p.y) === floorOf(h.y) ? !p.climb || Math.abs(p.y - h.y) < 100 : p.climb && Math.abs(p.y - h.y) < 110);
        if (reach) { grabPlayer(h); return; }
        AU.at('swipe', h.x, h.y); W.fx.push({ k: 'slash', x: h.x + h.face * 60, y: h.y - 90, face: h.face, t: 0, life: .25 });
      }
      if (h.atkT >= .95) { h.state = 'hunt'; h.struck = false; h.cd = .5; }
      return; }
    case 'grab': { h.grabT += dt; h.atk = 1; h.mouth = 1; return; }
    case 'trapped': {
      h.trapT += dt; h.flash = .5 + .5 * Math.random(); h.atk = .6 + .4 * Math.random(); h.mouth = 1;
      if (Math.random() < dt * 14) W.fx.push({ k: 'bolt', pts: [[h.x + rand(-30, 30), h.y - rand(10, 60)], [h.x + rand(-40, 40), h.y - rand(90, 190)]], t: 0, life: .12, col: '#c7fbff' });
      if (h.trapT >= 2.6) hunterDie(h);
      return; }
    case 'smash': {
      h.smashT -= dt; h.atk = Math.sin(clamp(1 - h.smashT / .8, 0, 1) * Math.PI);
      if (h.smashT <= 0) { const m = h.smashM; if (m) { m.on = 0; m.broken = true; spark(m.x, W.rooms[m.room].floorY - 50, 18, '#ffd28a', 240); AU.at('smash', m.x, h.y, { range: 1200 }); } h.smashM = null; h.state = 'search'; h.searchT = 2.5; }
      return; }
    case 'charge': {
      h.chargeT += dt; h.mouth = Math.min(1, h.chargeT / 1.4);
      if (h.chargeT >= 1.4) {
        h.state = 'search'; h.shriekCD = rand(20, 28); h.mouth = 0;
        AU.at('shriek', h.x, h.y, { range: 2400, vol: 1.2 });
        W.fx.push({ k: 'ring', x: h.x, y: h.y - 130, r0: 30, r1: 470, t: 0, life: .7, col: '#ffffff', w: 6 });
        W.shake = Math.max(W.shake, 6);
        const c = soundCost()[roomAt(h.x, h.y).i][roomAt(p.x, p.y).i];
        // 尖嘯的回聲找得到站在外面的人；躲在家具裡的找不到
        if (!p.hide && Math.hypot(p.x - h.x, p.y - h.y) < 470 && c < 1) { h.state = 'hunt'; h.know = 1.2; h.tx = p.x; h.ty = p.y; hurtPlayer(6, h); UI.flashScreen('rgba(255,255,255,.35)'); }
      }
      return; }
  }
  // ---------- 搜索／追獵／翻找／離開 ----------
  h.shriekCD -= dt; h.cd = (h.cd || 0) - dt;
  h.mouth = approach(h.mouth, 0, dt * 2);
  if (hunterSense(h)) {
    if (h.know <= 0) { AU.at('growl', h.x, h.y, { vol: 1.3 }); h.heard = 1; }
    h.know = 1.3;
    if (h.state !== 'hunt') { h.state = 'hunt'; h.checkSp = null; h.checkQ = []; h.checkSnd = false; }
  } else h.know = Math.max(0, h.know - dt);
  if (h.know > 0) { h.tx = p.x; h.ty = p.climb ? p.y : p.y; }
  // 夠近就撲上去
  if (h.know > 0 && h.cd <= 0 && !p.caught) {
    const sameF = floorOf(p.y) === floorOf(h.y) && !p.climb && !h.climb;
    const close = sameF ? Math.abs(p.x - h.x) < 96 : (p.climb && Math.abs(p.x - h.x) < 50 && Math.abs(p.y - h.y) < 110);
    if (close) { startAttack(h); return; }
  }
  // 擦身而過：你躲著、牠在旁邊卻沒發現。牠會記住你躲的那種地方
  if (p.hide && roomAt(h.x, h.y) === roomAt(p.x, p.y) && Math.abs(h.x - p.x) < 160) h.closeCall = p.hide.type;
  if (h.closeCall && (!p.hide || Math.abs(h.x - p.x) > 430 || roomAt(h.x, h.y) !== roomAt(p.x, p.y) && Math.abs(h.x - p.x) > 260)) {
    if (p.hide) { W.learn[h.closeCall] = (W.learn[h.closeCall] || 0) + 1; W.dodges++; }
    h.closeCall = null;
  }
  // 尖嘯（第三區起）
  if (h.state === 'search' && H.shriek && h.shriekCD <= 0 && Math.hypot(p.x - h.x, p.y - h.y) < 700) { h.state = 'charge'; h.chargeT = 0; AU.at('charge', h.x, h.y, { range: 1600 }); tip('shriek'); return; }
  if (h.state === 'leave') {
    const goAway = (t, cd) => { h.state = 'away'; h.awayT = t; if (cd) h.awayCD = cd; h.leaveVent = null; h.leaveT = 0; };
    if (!h.leaveVent) h.leaveT = 0;
    if (!h.leaveVent || h.leaveVent.room === roomAt(p.x, p.y).i) h.leaveVent = pickVentNear(h.x, h.y, roomAt(p.x, p.y).i) || pickVentNear(h.x, h.y);
    const v = h.leaveVent;
    if (!v) { goAway(30); return; }
    const lmv = hunterGoTo(h, v.x, W.rooms[v.room].floorY);
    if (!lmv) { const nv = pickVentNear(h.x, h.y); if (!nv || nv === v) goAway(Math.max(16, 34 - W.stage * 5)); else h.leaveVent = nv; return; }
    hunterMove(h, lmv, H.walk, dt);
    h.leaveT += dt;
    if (h.leaveT > 25) { goAway(Math.max(16, 34 - W.stage * 5)); return; }
    if (roomAt(h.x, h.y).i === v.room && Math.abs(h.x - v.x) < 26) { goAway(Math.max(16, rand(30, 44) - W.stage * 5), Math.max(12, 26 - W.stage * 4)); AU.at('vent', v.x, v.y, { vol: .8 }); v.shake = 1; }
    return;
  }
  if (h.state === 'check') {
    const sp = h.checkSp; if (!sp) { h.state = 'search'; return; }
    const fr = W.rooms[sp.room], side = h.x < sp.x ? -1 : 1, gx = sp.x + side * 24;
    if (roomAt(h.x, h.y) !== fr || Math.abs(h.x - gx) > 8) { const mv2 = hunterGoTo(h, gx, fr.floorY); if (!mv2) { h.state = 'search'; return; } hunterMove(h, mv2, H.walk * 1.15, dt); h.checkT = 0; return; }
    h.moving = false; h.face = -side; h.checkT += dt; h.lean = approach(h.lean, 1, dt * 3); h.tilt = .45 * Math.sin(h.checkT * 2.2);
    if (!h.checkSnd) { h.checkSnd = true; AU.at('check', sp.x, fr.floorY, { range: 900 }); if (p.hide && p.hide.spot === sp) { tip('check'); W.scare = Math.max(W.scare, .6); } }
    if (h.checkT > 1.9) { h.state = 'search'; h.searchT = Math.min(h.searchT, 3.5); h.checkSp = null; h.checkSnd = false; }
    return;
  }
  const running = h.state === 'hunt';
  const spd = (running ? H.run * (W.stage >= 3 ? 1.06 : 1) : H.walk) * (h.slowT > 0 ? .35 : 1);
  const mv = hunterGoTo(h, h.tx, h.ty);
  const arrived = !h.climb && roomAt(h.x, h.y) === roomAt(h.tx, h.ty) && Math.abs(h.x - h.tx) < 30;
  if (arrived) {
    h.moving = false;
    const m = runningMachine(roomAt(h.x, h.y), h.x, 70);
    if (m) { h.state = 'smash'; h.smashT = .8; h.smashM = m; h.face = sgn(m.x - h.x) || h.face; AU.at('swipe', h.x, h.y); return; }
    if (h.state === 'hunt') { if (h.know > 0) return; h.state = 'search'; h.searchT = 0; planChecks(h); }
    h.searchT += dt;
    h.turn = Math.sin(W.t * 1.6) * .9; h.tilt = .5 * Math.sin(W.t * 1.1 + h.x * .01);
    if (h.checkQ.length && h.searchT > .7) { h.checkSp = h.checkQ.shift(); h.state = 'check'; h.checkT = 0; h.checkSnd = false; return; }
    if (h.searchT > 7.5) { h.state = 'leave'; h.leaveVent = null; h.leaveT = 0; return; }
    if (h.searchT > 1.4 && Math.random() < dt * .6) { const hr = roomAt(h.x, h.y); h.tx = clamp(h.x + rand(-140, 140), hr.x0 + 34, hr.x0 + RW - 34); h.ty = hr.floorY; }
  } else {
    if (!mv) { const v = pickVentNear(h.tx, h.ty); if (v && v.room !== roomAt(h.x, h.y).i) { h.vent = v; h.state = 'venting'; h.ventT = 2.4; } else { h.state = 'leave'; h.leaveVent = null; } return; }
    hunterMove(h, mv, spd, dt);
    const still = Math.abs(h.x - (h.lastX == null ? h.x + 1 : h.lastX)) < .4 && !h.climb && !(h.bashT > 0);
    h.stuckT = still ? (h.stuckT || 0) + dt : 0;
    if (h.stuckT > 2.2) { h.stuckT = 0; h.tx = h.x; h.ty = h.y; if (h.state === 'hunt' && h.know <= 0) { h.state = 'search'; h.searchT = 0; } }
    h.turn = h.state === 'hunt' ? approach(h.turn, .95, dt * 3) : Math.sin(W.t * 1.2) * .7;
    h.tilt = approach(h.tilt, 0, dt * 2);
  }
}
function hunterMove(h, mv, spd, dt) {
  if (!mv) return;
  if (h.climb) {
    const L = h.climb.lad, ty = h.climb.dir > 0 ? L.y2 : L.y1;
    h.x = L.x; h.y = approach(h.y, ty, spd * .7 * dt); h.walk += dt * 5; h.moving = true;
    if (h.y === ty) h.climb = null;
    return;
  }
  if (mv.lad) { if (Math.abs(h.x - mv.lad.x) < 8) { h.climb = { lad: mv.lad, dir: mv.dir }; return; } mv = { x: mv.lad.x }; }
  const dx = mv.x - h.x;
  h.moving = Math.abs(dx) > 4;
  if (!h.moving) return;
  h.face = sgn(dx);
  const bl = moveX(h, h.x + clamp(dx, -spd * dt, spd * dt), 26);
  h.walk += dt * spd / (h.quad > .5 ? 34 : 22);
  h.stepT = (h.stepT || 0) - dt * spd / 90;
  if (h.stepT <= 0) { h.stepT = 1; AU.at(h.quad > .5 ? 'gallop' : 'step', h.x, h.y, { vol: .9 }); }
  if (bl && bl !== 'wall' && bl.state === 'closed') {
    bl.hp -= h.H.door * dt; bl.hitT = .25; bl.shake = 1.5; h.bashT = .4;
    if (Math.random() < dt * 4) AU.at('door_hit', bl.x, bl.y, { vol: 1.2, range: 1400 });
    if (bl.hp <= 0) breakDoor(bl);
  }
}

/* ---------- 站裡陸續冒出來的東西：沒有波次，只有零星的訪客 ---------- */
function updateSpawns(dt) {
  if (W.ending) return;
  W.spawnT -= dt * (1 + W.pressure / 160);
  if (W.spawnT > 0) return;
  W.spawnT = W.S.trickle * rand(.8, 1.2);
  const alive = W.foes.filter(e => !e.dead && (e.type === 'husk' || e.type === 'drowned')).length;
  if (alive < 3 + Math.min(3, W.si)) spawnVisitor(W.P.x, W.P.y, 1.5, 4.5);
}
function spawnVisitor(tx, ty, dMin, dMax, chase) {
  const pr = roomAt(W.P.x, W.P.y), D = soundCost();
  const cands = W.rooms.filter(r => !r.collapsed && r.i !== pr.i && r.special !== 'start' && r.special !== 'dock' && D[pr.i][r.i] >= dMin && D[pr.i][r.i] <= dMax);
  if (!cands.length) return null;
  const r = pick(cands);
  const x = r.vent && Math.random() < .5 ? r.vent.x : r.x0 + rand(60, RW - 60);
  const e = spawnFoe('husk', x, r.floorY, true);
  if (chase) e.chase = true; else e.inv = { x: tx + rand(-160, 160), y: ty };
  if (r.vent && x === r.vent.x) { r.vent.shake = 1; AU.at('vent', x, r.vent.y, { vol: .6 }); }
  return e;
}

/* ---------- 深壓 ---------- */
const STAGES = [{ at: 0, name: '平靜', col: '#5fe7ff' }, { at: 30, name: '滲漏', col: '#9fe0ff' }, { at: 60, name: '擠壓', col: '#ffb03a' }, { at: 85, name: '結構警報', col: '#ff7a45' }, { at: 100, name: '崩潰', col: '#ff4d5e' }];
function updatePressure(dt) {
  if (W.stage < 4) W.pressure = Math.min(100, W.pressure + dt / W.S.T * 100);
  let st = 0; for (let k = 0; k < STAGES.length; k++) if (W.pressure >= STAGES[k].at) st = k;
  if (st > W.stage) {
    W.stage = st;
    if (st === 1) { tip('p30', true); say(PA.p30); }
    if (st === 2) { tip('p60', true); banner('深壓 60%', '牠的聽力變好了', ''); killLights(.25); say(PA.p60); }
    if (st === 3) { tip('p85', true); banner('結構警報', '去撤離塢', ''); killLights(.35); AU.play('alarm'); say(PA.p85); }
    if (st === 4) { tip('p100', true); banner('崩潰', '站體正在塌陷', ''); W.collapseT = 95; AU.play('alarm'); say('站體崩潰程序啟動。倒數 90 秒。', PA.p100); }
  }
  if (W.stage >= 1) {
    W.breachT -= dt;
    if (W.breachT <= 0) {
      W.breachT = W.stage >= 4 ? 3.5 : lerp(38, 16, (W.pressure - 30) / 70);
      makeBreach(W.stage >= 4);
    }
  }
  if (W.stage >= 4) {
    W.collapseT -= dt;
    for (const k of [60, 30, 10]) if (W.collapseT <= k && W.collapseT > k - 3 && !W.countSaid[k]) { W.countSaid[k] = true; say(`倒數 ${k} 秒。`, PA.count[k]); }
    if (W.collapseT <= 0 && W.state === 'play') { W.P.hp = 0; W.collapsed = true; }
    if (Math.random() < dt * .8) W.shake = Math.max(W.shake, 4);
  }
}
function killLights(frac) { for (const r of W.rooms) if (!r.collapsed && Math.random() < frac && r.special !== 'dock') r.lightDead = true; }
function makeBreach(any) {
  const pr = roomAt(W.P.x, W.P.y);
  const cands = W.rooms.filter(r => !r.collapsed && !r.breach && r.special !== 'dock' && (any || r.i !== pr.i || Math.random() < .3));
  if (!cands.length) return;
  const r = pick(cands);
  const hull = r.c === 0 ? r.x0 + 30 : r.c === W.C - 1 ? r.x0 + RW - 30 : r.x0 + rand(80, RW - 80);
  r.breach = { x: hull, y: r.floorY - rand(40, 120), rate: 1 / rand(24, 34), t: 0 };
  AU.at('breach', r.breach.x, r.breach.y, { range: 1400 });
  if (Math.random() < .3 && r !== pr && W.foes.filter(e => e.type === 'jelly' && !e.dead).length < 3) { const e = spawnFoe('jelly', r.breach.x + (r.c === 0 ? 30 : -30), r.floorY, true); e.spawnT = .8; }
  if (r === pr) tip('breach');
  if (Math.abs(r.c - pr.c) + Math.abs(r.f - pr.f) <= 1 && W.t - W.breachSaidT > 25) { W.breachSaidT = W.t; const c = paCode(r); say(`警告：${c} 艙段破口。`, `警告，${c.replace('-', ' ')}，艙段破口。`); }
}
function updateWater(dt) {
  const C = W.C;
  for (const r of W.rooms) {
    if (r.collapsed) continue;
    if (r.breach) { r.water = Math.min(1, r.water + r.breach.rate * dt); r.breach.t += dt; }
    else if (W.stage < 4) r.water = Math.max(0, r.water - dt / 160);
    if (r.special === 'dock') r.water = Math.max(0, r.water - dt / (W.stage >= 4 ? 40 : 14));
  }
  for (const d of W.doors) {
    if (!passable(d)) continue;
    const a = W.rooms[d.a], b = W.rooms[d.b];
    const diff = a.water - b.water;
    if (Math.abs(diff) > .01) { const fl = diff * .22 * dt; a.water -= fl; b.water += fl; }
  }
  for (const L of W.ladders) {
    const up = W.rooms[L.f * C + L.c], dn = W.rooms[(L.f + 1) * C + L.c];
    if (up.trap && up.trap.state !== 'spent') continue; // 陷阱艙的地板艙口是水密的：灌進去的水不會從梯子口漏掉
    if (up.water > .12 && dn.water < 1) { const fl = Math.min(up.water - .1, .12 * up.water * dt); up.water -= fl; dn.water = Math.min(1, dn.water + fl * .9); }
  }
  // 淹水的艙：溺者潛在水裡等你、深水裡有鞭鰻
  W.eelT = (W.eelT || 14) - dt;
  if (W.eelT <= 0) {
    W.eelT = 16;
    const pr = roomAt(W.P.x, W.P.y);
    const wet = W.rooms.filter(r => r.water > .45 && !r.collapsed && r !== pr && r.special !== 'dock');
    const dr = W.foes.filter(e => e.type === 'drowned' && !e.dead).length, eels = W.foes.filter(e => e.type === 'eel' && !e.dead).length;
    if (wet.length && (W.stage >= 1 || W.t > 150)) {
      const r = pick(wet);
      if (dr < 2 && Math.random() < .65) { const e = spawnFoe('drowned', r.x0 + rand(60, RW - 60), r.floorY, true); e.lurk = true; e.spawnT = 0; }
      else if (eels < 2 && r.water > .6) { const e = spawnFoe('eel', r.x0 + rand(60, RW - 60), r.floorY, true); e.chase = true; }
    }
  }
}

/* ---------- 艙門 ---------- */
function updateDoors(dt) {
  const st = PS();
  for (const d of W.doors) {
    const target = d.state === 'open' || d.state === 'broken' ? 1 : 0;
    d.open = approach(d.open, target, dt * 5);
    d.hitT = Math.max(0, d.hitT - dt); d.shake = Math.max(0, d.shake - dt * 4);
    d.hpMax = 100 + st.doorHp;
  }
}
function setDoor(d, open) {
  if (d.state === 'locked' || d.state === 'broken') return false;
  if (!open) {
    const f = floorOf(d.y);
    const stuck = W.foes.some(e => !e.dead && floorOf(e.y) === f && Math.abs(e.x - d.x) < 22) || (onMap(W.hunter) && floorOf(W.hunter.y) === f && Math.abs(W.hunter.x - d.x) < 30);
    if (stuck) { toast('門被卡住了'); AU.play('deny'); return false; }
    const p = W.P;
    if (floorOf(p.y) === f && Math.abs(p.x - d.x) < WALLW / 2 + PW) p.x = d.x + (p.x < d.x ? -(WALLW / 2 + PW + 1) : (WALLW / 2 + PW + 1));
  }
  d.state = open ? 'open' : 'closed';
  markDoors();
  AU.at(open ? 'door_open' : 'door_close', d.x, d.y);
  emitNoise(d.x, d.y - 60, 150 * PS().noise, 'player', false);
  if (!open) tip('door');
  return true;
}

/* ---------- 掉落物 ---------- */
function dropItem(o, x, y) {
  const it = Object.assign({ x, y, vx: rand(-90, 90), vy: rand(-260, -160), t: 0, ground: false, seed: rand(0, 9), rar: o.rar || 0 }, o);
  const r = roomAt(x, y); it.floorY = r.floorY;
  W.items.push(it);
  return it;
}
function updateItems(dt) {
  const p = W.P, st = PS(), keep = [];
  for (const it of W.items) {
    it.t += dt;
    const d = Math.hypot(p.x - it.x, (p.y - 34) - it.y);
    if (it.t > .35 && (d < st.magnet || it.pull) && !p.climb && !p.hide && W.state === 'play') {
      it.pull = true; it.ground = false;
      const sp = 520 + it.t * 200;
      it.x += (p.x - it.x) / Math.max(1, d) * sp * dt; it.y += ((p.y - 34) - it.y) / Math.max(1, d) * sp * dt;
      if (d < 18) { pickup(it); continue; }
    } else if (!it.ground) {
      it.vy += 900 * dt; it.x += it.vx * dt; it.y += it.vy * dt;
      const before = it.x; moveX(it, it.x, 6); if (it.x !== before) it.vx *= -.4;
      if (it.y >= it.floorY - 4) { it.y = it.floorY - 4; it.vy *= -.3; it.vx *= .6; if (Math.abs(it.vy) < 40) { it.ground = true; it.vy = 0; } }
    }
    keep.push(it);
  }
  W.items = keep;
}
function ammoGain() {
  const p = W.P, w = WEAPONS[p.gun], L = p.gunLv;
  let n = w.pick;
  if (p.gun === 'rivet' && L >= 3) n *= 1.5;
  if (p.gun === 'arc' && L >= 4) n += 2;
  if (p.gun === 'harpoon' && L >= 3) n += 1;
  return Math.max(1, Math.round(n * PS().ammoMul));
}
function pickup(it) {
  const p = W.P;
  switch (it.kind) {
    case 'med': p.med++; toast('醫療包 ＋1', '#5fe39a'); break;
    case 'battery': p.batteries++; toast('電池 ＋1', '#ffcf3a'); break;
    case 'decoy': p.decoys++; toast('聲波誘餌 ＋1', '#ffcf3a'); break;
    case 'ammo': { const n = ammoGain(); p.ammo += n; toast(`${WEAPONS[p.gun].name}　<span class="num">+${n}</span> ${WEAPONS[p.gun].unit}`, '#ffcf7a'); break; }
    case 'tool': { if (p.tool) { const n = 1 + PS().toolPlus; p.toolUses += n; toast(`${WEAPONS[p.tool].name}　次數 ＋${n}`, WEAPONS[p.tool].col); } else { p.ammo += ammoGain(); toast('彈藥補給', '#ffcf7a'); } break; }
    case 'flash': p.flashes++; toast('震爆彈 ＋1（被抓住時自動用掉）', '#ffffff'); break;
    case 'fuse': p.fuses++; toast('保險絲 ＋1', '#ffb03a'); tip('fuse'); break;
    case 'key': W.key = true; toast('紅色鑰卡', '#ff4f5e'); tip('key'); break;
    case 'cache': W.cacheQ++; toast('強化艙', RAR[3].col); tip('cache'); break;
    case 'loot': {
      const sec = W.S.endless ? 4 : W.si;
      const pool = LOOT_NAMES[Math.min(4, it.rar >= 4 ? 4 : sec)] || LOOT_NAMES[0];
      const name = pool[Math.floor(it.seed * 97) % pool.length] + LOOT_SUFFIX[it.rar];
      const val = Math.round(RAR[it.rar].val * (1 + .22 * (W.S.endless ? 4 + W.S.tier * .4 : W.si)) * rand(.85, 1.2));
      W.bag.push({ name, rar: it.rar, val }); W.bagVal += val; W.bagWt += RAR[it.rar].wt;
      toast(`${name}　<span class="num">+${val}</span>`, RAR[it.rar].col);
      break; }
    case 'relic': {
      const R = RELICS.find(r => r.id === it.id); W.relicsGot.push(it.id);
      toast(`藏品「${R.name}」`, RAR[5].col); banner('發現藏品', R.name, 'gd'); break; }
    case 'bp': W.bpsGot.push(it.id); toast(`藍圖：${WEAPONS[it.id].name}`, RAR[4].col); banner(WEAPONS[it.id].kind === 'tool' ? '工具藍圖' : '武器藍圖', WEAPONS[it.id].name, 'gd'); break;
  }
  AU.play('pickup');
}
function lockedWeapons() { return WEAPON_ORDER.filter(id => !G.weapons.includes(id) && !W.bpsGot.includes(id)); }
function spotLoot(sp) {
  const r = sp.rar, x = sp.x, y = sp.y - 40, p = W.P;
  AU.play('loot', { r });
  if (r >= 3) W.fx.push({ k: 'beam', x, y: sp.y, col: RAR[r].col, t: 0, life: 1.6 });
  spark(x, y, 6 + r * 3, RAR[r].col, 160);
  if (sp.kind === 'key') { dropItem({ kind: 'key', rar: 3 }, x, y); return; }
  if (sp.kind === 'cache') { dropItem({ kind: 'cache', rar: 3 }, x, y); return; }
  if (sp.kind === 'fuse') { dropItem({ kind: 'fuse', rar: 2 }, x, y); dropItem({ kind: 'loot', rar: 1 }, x, y); return; }
  if (sp.kind === 'log') { getLog(sp.log); dropItem({ kind: 'loot', rar: 1 }, x, y); return; }
  dropItem({ kind: 'loot', rar: r }, x, y);
  if (r >= 1 && Math.random() < .5) dropItem({ kind: 'loot', rar: Math.max(0, r - 1) }, x, y);
  if (Math.random() < .42) dropItem({ kind: 'ammo' }, x, y);
  if (Math.random() < .15) dropItem({ kind: 'battery' }, x, y);
  if (Math.random() < .1) dropItem({ kind: 'med' }, x, y);
  if (Math.random() < .08) dropItem({ kind: 'decoy' }, x, y);
  if (p.tool && Math.random() < .1 + r * .03) dropItem({ kind: 'tool' }, x, y);
  if (r >= 2 && Math.random() < .05 + r * .01) dropItem({ kind: 'flash' }, x, y);
  if (Math.random() < .04) dropItem({ kind: 'fuse' }, x, y);
  if (r >= 3 && Math.random() < .3) dropItem({ kind: 'cache', rar: 3 }, x, y);
  if (r >= 4) {
    const sec = W.S.endless ? -2 : W.si;
    const pool = RELICS.filter(rl => rl.sec === sec || (W.S.endless && rl.sec >= 0));
    if (pool.length && Math.random() < .45) dropItem({ kind: 'relic', id: pick(pool).id, rar: 5 }, x, y);
    else { const bp = lockedWeapons(); if (bp.length && Math.random() < .5) dropItem({ kind: 'bp', id: pick(bp), rar: 4 }, x, y); }
  }
}
function getLog(id) {
  if (!id || !LOGS[id]) return;
  const L = LOGS[id], fresh = !G.logs[id];
  G.logs[id] = true; W.logsGot.push(id); saveGame();
  // 長的錄音切成幾段播，手機上一次最多兩三行
  const parts = [], sents = L.text.match(/[^。！？]+[。！？」]*|.+$/g) || [L.text];
  let cur = '';
  for (const s2 of sents) { if (cur && (cur + s2).length > 44) { parts.push(cur); cur = ''; } cur += s2; }
  if (cur) parts.push(cur);
  let total = 0;
  parts.forEach((t, k) => { const d = 2.4 + t.length / 9; total += d + .35; W.subs.push({ who: `【${L.who}】${parts.length > 1 ? ` ${k + 1}/${parts.length}` : ''}`, text: t, kind: L.kind === 'voice' ? 'log' : 'doc', dur: d, prio: 2 }); });
  if (L.kind === 'voice') AU.play('motif', { vol: .5, f: 220 });
  if (fresh) setTimeout(() => tip('log'), 1000 * total + 400);
}

/* ---------- 互動（自動搜索、加固、情境按鈕） ---------- */
function hideSpotAt(r, x) {
  let best = null, bd = 1e9;
  for (const sp of r.hides || []) { const d = Math.abs(sp.x - x); if (d < sp.w / 2 + 8 && d < bd) { bd = d; best = sp; } }
  return best;
}
function interactables() {
  const p = W.P, r = roomAt(p.x, p.y), out = [];
  if (p.caught) return out;
  if (p.hide) { out.push({ k: 'unhide', label: '出來', pri: 11 }); return out; }
  if (p.climb) return out;
  const s = r.survivor;
  if (s && s.state === 'hide' && Math.abs(s.x - p.x) < 70) out.push({ k: 'rescue', label: '救援', dur: 1.4, s, pri: 9 });
  if (r.special === 'deep' && !W.deepDone && r.tank && Math.abs(r.tank.x - p.x) < 140) out.push({ k: 'deep', label: '靠近收容槽', pri: 10 });
  for (const d of [r.doorL, r.doorR]) {
    if (!d || Math.abs(d.x - p.x) > 56) continue;
    if (d.state === 'locked') out.push(W.key ? { k: 'unlock', label: '刷卡開門', d, pri: 8 } : { k: 'none', label: '需要紅色鑰卡', off: true, pri: 1 });
    else if (d.state === 'closed') out.push({ k: 'open', label: '開艙門', d, pri: 5 });
    else if (d.state === 'open') out.push({ k: 'close', label: '關艙門', d, pri: 5 });
    else if (d.state === 'broken') out.push({ k: 'weld', label: '焊上艙門', d, dur: 2.2, pri: 4 });
  }
  if (r.breach && Math.abs(r.breach.x - p.x) < 80) out.push({ k: 'patch', label: '修補破口', dur: 2.6, warn: true, pri: 7 });
  const T = r.trap;
  if (T) {
    if (Math.abs(T.bx - p.x) < 56) {
      if (T.state === 'nofuse') out.push(p.fuses > 0 ? { k: 'fuse', label: '插上保險絲', dur: 2.2 / PS().fuseSpeed, warn: true, pri: 7 } : { k: 'none', label: '配電箱：缺保險絲', off: true, pri: 2 });
      else if (T.state === 'armed') out.push({ k: 'none', label: '陷阱：通電待命', off: true, pri: 2 });
    }
    if (Math.abs(T.vx - p.x) < 50 && T.state !== 'spent' && T.flood <= 0 && r.water < .5) out.push({ k: 'flood', label: '打開海水閘', dur: 1.6, warn: true, pri: 6 });
  }
  const m = (r.machines || []).find(q => Math.abs(q.x - p.x) < 52);
  if (m) {
    if (m.broken) out.push({ k: 'none', label: `${MACHINES[m.kind]}被拆了`, off: true, pri: 1 });
    else if (m.on > 0) out.push({ k: 'none', label: `${MACHINES[m.kind]}運轉中`, off: true, pri: 1 });
    else if (m.cd <= 0) out.push({ k: 'machine', label: `啟動${MACHINES[m.kind]}`, m, warn: true, pri: 4 });
  }
  const pod = W.pods.find(q => q.room === r.i);
  if (pod && Math.abs(pod.x - p.x) < 70) {
    if (pod.cells >= 3) out.push({ k: 'launch', label: '啟動逃生艙', pod, warn: true, pri: 8 });
    else if (p.batteries > 0) out.push({ k: 'cell', label: `裝電池 ${pod.cells}/3`, pod, pri: 6 });
    else out.push({ k: 'none', label: `需要電池 ${pod.cells}/3`, off: true, pri: 1 });
  }
  if (r.i === W.dock.room) {
    if (!W.dock.called && Math.abs(r.x0 + 70 - p.x) < 90) out.push({ k: 'call', label: '呼叫潛艇', warn: true, pri: 9 });
    if (W.dock.arrived && r.moon && p.x > r.moon.x - 10 && p.x < r.moon.x + r.moon.w + 10) out.push({ k: 'board', label: '登艇撤離', pri: 10 });
  }
  const hs = hideSpotAt(r, p.x);
  if (hs) out.push({ k: 'hide', label: HIDE_LABEL[hs.kind] || HIDE_INFO[hs.type].label, sp: hs, pri: 3.5 });
  out.sort((a, b) => b.pri - a.pri);
  return out;
}
function doInteract() {
  const p = W.P;
  if (W.state !== 'play' || p.channel) return;
  const it = interactables()[0];
  if (!it || it.off) { if (it && it.off) AU.play('deny'); return; }
  if (it.dur) { p.channel = { it, t: 0 }; return; }
  switch (it.k) {
    case 'unhide': exitHide(); break;
    case 'hide': enterHide(it.sp); break;
    case 'open': setDoor(it.d, true); break;
    case 'close': setDoor(it.d, false); break;
    case 'unlock': it.d.state = 'open'; it.d.lock = null; it.d.hp = 100; it.d.hpMax = 100; markDoors(); AU.play('ui2'); AU.at('door_open', it.d.x, it.d.y); toast('鑰卡通過'); break;
    case 'cell': { const n = Math.min(p.batteries, 3 - it.pod.cells); it.pod.cells += n; p.batteries -= n; AU.play('ui2'); toast(`逃生艙電池 ${it.pod.cells}/3`, '#ffcf3a'); tip('pod'); break; }
    case 'launch': UI.confirm('啟動逃生艙？', '只能帶走你身上的東西。救出的人帶不走，這一區也不算通關。', '發射', () => { AU.play('pod'); endRun('pod'); }); break;
    case 'call': callDock(); break;
    case 'board': endRun('dock'); break;
    case 'deep': startFinal(); break;
    case 'machine': startMachine(it.m); break;
  }
}
/* 給「通常會用到的下一個動作」：情境鈕優先順序之外，躲藏有獨立的入口 */
function cancelChannel() { if (W && W.P.channel) { W.P.channel = null; } }
function updateInteract(dt) {
  const p = W.P, st = PS();
  if (W.state !== 'play' || p.hide) { if (p.hide) { p.searching = null; p.reinforcing = null; } return; }
  // 情境動作進度
  if (p.channel) {
    const c = p.channel; c.t += dt * (c.it.k === 'weld' || c.it.k === 'patch' ? st.weld : 1);
    if (c.it.k === 'weld' || c.it.k === 'patch' || c.it.k === 'fuse') { if (Math.random() < dt * 14) spark(c.it.d ? c.it.d.x : p.x + p.face * 30, p.y - 50, 1, '#ffd28a', 120); AU.play('weld'); }
    if (c.it.k === 'flood' && Math.random() < dt * 4) AU.play('valve', { vol: .6 });
    if (c.t >= c.it.dur) {
      const it = c.it; p.channel = null;
      if (it.k === 'rescue') rescue(it.s);
      if (it.k === 'weld') { it.d.state = 'closed'; it.d.hp = 45; markDoors(); AU.at('door_close', it.d.x, it.d.y); toast('艙門焊上了'); }
      if (it.k === 'patch') { const r = roomAt(p.x, p.y); r.breach = null; AU.play('patched'); toast('破口補好了'); }
      if (it.k === 'fuse') armTrap(roomAt(p.x, p.y));
      if (it.k === 'flood') floodTrap(roomAt(p.x, p.y));
    }
    p.searching = null; p.reinforcing = null;
    return;
  }
  p.searching = null; p.reinforcing = null;
  if (p.moving || p.climb) return;
  const r = roomAt(p.x, p.y);
  // 自動搜索（翻東西有一點聲音）
  let sp = null, bd = 30;
  for (const s of r.spots) { if (s.done) continue; const d = Math.abs(s.x - p.x); if (d < bd) { bd = d; sp = s; } }
  if (sp) {
    sp.t += dt * st.search; p.searching = sp;
    AU.play('tick', { vol: .7 });
    p.searchNz -= dt; if (p.searchNz <= 0) { p.searchNz = .7; emitNoise(sp.x, sp.y - 40, 72 * st.noise, 'player', false); }
    if (sp.t >= RAR[sp.rar].t * (sp.kind === 'log' ? .5 : 1)) { sp.done = true; spotLoot(sp); }
    if (!G.tips.search && W.t > 7) tip('search');
    return;
  }
  // 自動加固
  for (const d of [r.doorL, r.doorR]) {
    if (!d || d.state !== 'closed' || Math.abs(d.x - p.x) > 74) continue;
    if (d.hp < d.hpMax) { d.hp = Math.min(d.hpMax, d.hp + 22 * st.weld * dt); p.reinforcing = d; if (Math.random() < dt * 6) spark(d.x + (p.x < d.x ? -10 : 10), d.y - rand(20, 110), 1, '#ffd28a', 90); AU.play('weld', { vol: .5 }); }
  }
}
function rescue(s) {
  s.state = 'talk'; s.t = 0; W.rescued.push(s); W.obj.rescued++;
  AU.play('rescue');
  const line = s.id ? SURV[s.id].line : pick(['「謝……謝謝你。」', '「我以為不會有人來了。」', '「外面……外面還有人嗎？」']);
  W.subs.push({ who: s.name, text: line, kind: 'voice', dur: 3.2, prio: 1 });
  setTimeout(() => { if (W && s.state === 'talk') { W.subs.push({ who: s.name, text: '「我從維修管道過去，撤離塢見。」', kind: 'voice', dur: 2.6 }); s.state = 'leave'; s.t = 0; } }, 2600);
  toast(`救出 ${s.name}（${W.obj.rescued}/${W.obj.survivors}）`, '#5fe39a');
}
function updateSurvivors(dt) { for (const s of W.M.survivors) { s.t += dt; if (s.state === 'leave' && s.t > 1.2) s.state = 'gone'; } }

/* ---------- 道具：醫療包、聲波誘餌 ---------- */
function useMed() {
  const p = W.P;
  if (W.state !== 'play' || p.med <= 0 || p.medT > 0 || p.hp >= p.hpMax) { AU.play('deny'); return; }
  p.med--; p.medT = 1.2; p.hp = Math.min(p.hpMax, p.hp + p.hpMax * PS().med);
  AU.play('med'); spark(p.x, p.y - 40, 14, '#5fe39a', 120);
  W.fx.push({ k: 'ring', x: p.x, y: p.y - 34, r0: 10, r1: 60, t: 0, life: .45, col: '#5fe39a', w: 4 });
  if (p.hide) emitNoise(p.x, p.y - 40, 50 * PS().noise, 'player', false);
}
function throwDecoy() {
  const p = W.P;
  if (W.state !== 'play' || p.decoys <= 0 || p.decoyT > 0 || p.climb || p.hide) { AU.play('deny'); return; }
  p.decoys--; p.decoyT = 1;
  const d = { x: p.x + p.face * 20, y: p.y - 50, vx: p.face * 360, vy: -260, t: 0, life: 7.5, landed: false, pulseT: 0, floorY: p.y };
  W.decoys.push(d); AU.play('throw'); tip('decoy');
}
function updateDecoys(dt) {
  const keep = [];
  for (const d of W.decoys) {
    if (!d.landed) {
      d.vy += 900 * dt; const bx = d.x; d.x += d.vx * dt; moveX(d, d.x, 6); if (d.x !== bx + d.vx * dt) d.vx *= -.3;
      d.y += d.vy * dt; if (d.y >= d.floorY - 8) { d.y = d.floorY - 8; d.landed = true; }
    } else {
      d.t += dt; d.pulseT -= dt;
      if (d.pulseT <= 0) { d.pulseT = .7; emitNoise(d.x, d.y, 560, 'decoy'); AU.at('decoy', d.x, d.y); }
      const h = W.hunter;
      if (onMap(h) && Math.abs(h.x - d.x) < 50 && floorOf(h.y) === floorOf(d.y)) { d.t = d.life; AU.at('swipe', d.x, d.y); spark(d.x, d.y, 10, '#ffcf3a', 200); }
    }
    if (d.t < d.life) keep.push(d);
  }
  W.decoys = keep;
}

/* ---------- 保命工具：焊槍、聲波炮、冷凍霧、誘餌無人機 ---------- */
function useTool() {
  const p = W.P;
  if (W.state !== 'play' || !p.tool || p.toolUses <= 0 || p.toolT > 0 || p.climb || p.caught) { AU.play('deny'); return; }
  const h = W.hunter;
  if (p.hide && p.tool === 'drone') { AU.play('deny'); return; }
  if (p.hide && mobOn(h) && floorOf(h.y) === floorOf(p.y)) p.face = sgn(h.x - p.x) || p.face;
  p.toolUses--; p.toolT = .9;
  ({ torch: toolTorch, sonic: toolSonic, cryo: toolCryo, drone: toolDrone })[p.tool]();
}
function toolTorch() {
  const p = W.P, h = W.hunter, m = W.mother, range = 150;
  W.torchT = .85; AU.play('torch'); emitNoise(p.x, p.y - 40, 60 * PS().noise, 'player', false);
  for (const e of targets()) {
    const dx = (e.x - p.x) * p.face;
    if (dx < -14 || dx > range || Math.abs(tgtY(e) - (p.y - 38)) > 70 || floorOf(e.y) !== floorOf(p.y)) continue;
    hurt(e, 45, { type: 'fire', crit: true, burn: 4 });
  }
  const hit = q => mobOn(q) && floorOf(q.y) === floorOf(p.y) && (q.x - p.x) * p.face > -20 && Math.abs(q.x - p.x) < range + (q.mother ? 60 : 0);
  if (hit(h)) { h.flash = 1; repelHunter(h, 'fire'); }
  if (hit(m)) { m.flash = 1; m.stunT = 1.2; }
}
function toolSonic() {
  const p = W.P, h = W.hunter, m = W.mother, rad = 200;
  W.fx.push({ k: 'ring', x: p.x, y: p.y - 34, r0: 20, r1: rad, t: 0, life: .45, col: '#ffa36b', w: 9 });
  W.fx.push({ k: 'ring', x: p.x, y: p.y - 34, r0: 10, r1: rad * .7, t: 0, life: .32, col: '#fff1e0', w: 3 });
  W.shake = Math.max(W.shake, 8); AU.play('sonic');
  for (const e of targets()) { if (Math.hypot(e.x - p.x, tgtY(e) - (p.y - 34)) > rad) continue; hurt(e, 30, { type: 'sonic', knock: e.def.fixed ? 0 : 130, dir: sgn(e.x - p.x), stun: 2 }); }
  if (mobOn(h) && Math.hypot(h.x - p.x, (h.y - 100) - (p.y - 34)) < rad + 40) { h.flash = 1; stunHunter(h, 3.4, 'hunt'); W.fx.push({ k: 'ring', x: h.x + h.face * 30, y: h.y - 150, r0: 6, r1: 60, t: 0, life: .6, col: '#ffffff', w: 4 }); }
  if (mobOn(m) && Math.hypot(m.x - p.x, m.y - p.y) < rad + 120) { m.flash = 1; m.stunT = 2.4; }
  emitNoise(p.x, p.y - 30, WEAPONS.sonic.noise * PS().noise, 'boom');
}
function toolCryo() {
  const p = W.P;
  W.clouds.push({ x: p.x, y: p.y - 30, r: 170, t: 0, life: 5, f: floorOf(p.y) });
  W.fx.push({ k: 'frost', x: p.x, y: p.y - 30, r: 170, t: 0, life: .6 });
  AU.play('cryo'); emitNoise(p.x, p.y - 30, 80 * PS().noise, 'player', false);
}
function toolDrone() {
  const p = W.P;
  W.drones.push({ x: p.x + p.face * 20, y: p.y - 86, vx: p.face * 330, f: floorOf(p.y), floorY: p.y, t: 0, flown: 0, state: 'fly', life: 9, pulseT: 0 });
  AU.play('drone_go'); tip('decoy');
}
function updateClouds(dt) {
  const h = W.hunter, m = W.mother;
  for (const c of W.clouds) {
    c.t += dt;
    for (const e of targets()) if (floorOf(e.y) === c.f && Math.abs(e.x - c.x) < c.r) { e.slow = Math.max(e.slow, .5); if (!e.frozeC) { e.frozeC = true; e.frozen = 1.6; } }
    if (mobOn(h) && floorOf(h.y) === c.f && Math.abs(h.x - c.x) < c.r) h.slowT = Math.max(h.slowT, 2);
    if (mobOn(m) && floorOf(m.y) === c.f && Math.abs(m.x - c.x) < c.r) m.slowT = Math.max(m.slowT || 0, 1.5);
  }
  W.clouds = W.clouds.filter(c => c.t < c.life);
}
function updateDrones(dt) {
  const keep = [], h = W.hunter;
  for (const d of W.drones) {
    d.t += dt;
    if (d.state === 'fly') {
      const bx = d.x, probe = { x: d.x, y: d.floorY };
      const blk = moveX(probe, d.x + d.vx * dt, 10); d.x = probe.x;
      d.flown += Math.abs(d.x - bx);
      if (blk || d.flown > 520 || Math.abs(d.x - bx) < .5) { d.state = 'hover'; d.t = 0; AU.at('decoy', d.x, d.y); }
    } else {
      d.pulseT -= dt; d.y += Math.sin(d.t * 5) * .3;
      if (d.pulseT <= 0) { d.pulseT = .7; emitNoise(d.x, d.y + 40, WEAPONS.drone.noise, 'drone'); AU.at('decoy', d.x, d.y); }
      if (onMap(h) && Math.abs(h.x - d.x) < 60 && floorOf(h.y) === d.f) { d.t = d.life; AU.at('swipe', d.x, d.y); spark(d.x, d.y, 16, '#a6ff9e', 220); continue; }
    }
    if (d.state === 'fly' || d.t < d.life) keep.push(d);
  }
  W.drones = keep;
}

/* ---------- 會一直響的機器：拿來引開聆（牠會去把它拆了） ---------- */
function startMachine(m) {
  m.on = 12; m.cd = 30; m.pulse = 0;
  AU.at('machine', m.x, W.rooms[m.room].floorY, { kind: m.kind }); tip('machine');
}
function runningMachine(r, x, range) { for (const m of r.machines || []) if (m.on > 0 && !m.broken && Math.abs(m.x - x) < range) return m; return null; }
function updateMachines(dt) {
  for (const r of W.rooms) for (const m of r.machines || []) {
    if (m.cd > 0) m.cd -= dt;
    if (m.on <= 0 || m.broken) continue;
    m.on -= dt; m.pulse -= dt;
    if (m.pulse <= 0) { m.pulse = .8; emitNoise(m.x, r.floorY - 50, 480, 'machine'); AU.at('machine_hum', m.x, r.floorY, { kind: m.kind, range: 1100 }); }
    if (m.on <= 0) AU.at('machine_off', m.x, r.floorY);
  }
}

/* ---------- 陷阱：插上保險絲、灌水，把聆引進來，然後通電 ---------- */
function armTrap(r) {
  const p = W.P, T = r.trap;
  if (!T || T.state !== 'nofuse' || p.fuses <= 0) return;
  p.fuses--; T.state = 'armed';
  AU.play('arm'); spark(T.bx, T.by, 14, '#ffd28a', 160); emitNoise(T.bx, T.by, 140 * PS().noise, 'player');
  banner('陷阱通電待命', r.water > .28 ? '水已經夠深了' : '還要讓這間艙淹水', 'gd');
  tip('trapArmed');
}
function floodTrap(r) {
  const T = r.trap; if (!T) return;
  T.flood = 14; AU.at('flood', T.vx, r.floorY, { range: 1200 }); emitNoise(T.vx, r.floorY - 30, 260, 'player');
  tip('flood');
}
function updateTraps(dt) {
  for (const i of W.M.traps) {
    const r = W.rooms[i], T = r.trap; if (!T) continue;
    if (T.flood > 0) {
      T.flood -= dt; r.water = Math.min(.68, r.water + dt / 11);
      if (Math.random() < dt * 6) W.fx.push({ k: 'drip', x: T.vx + rand(-14, 14), y: r.floorY - 40, vx: 0, vy: 80, t: 0, life: 1, fy: r.floorY });
      if (r.water >= .67) T.flood = 0;
    }
  }
  const tr = trapReady();
  if (tr && !W.trapTipT) { W.trapTipT = 1; tip('trapReady', true); }
  if (!tr) W.trapTipT = 0;
}
function armedTraps() { return W.M.traps.map(i => W.rooms[i]).filter(r => r.trap && r.trap.state === 'armed'); }
function trapReady() {
  const h = W.hunter, m = W.mother;
  for (const r of armedTraps()) {
    if (r.water < .26) continue;
    if (onMap(h) && !h.climb && roomAt(h.x, h.y) === r && !hunterBusy(h)) return r;
    if (mobOn(m) && roomAt(m.x, m.y) === r) return r;
  }
  return null;
}
function fireTrap() {
  if (!W || W.state !== 'play') return;
  const r = trapReady();
  if (!r) { AU.play('deny'); toast(armedTraps().length ? '牠不在淹水的陷阱艙裡' : '沒有通電的陷阱', '#ffb03a'); return; }
  const p = W.P, h = W.hunter, m = W.mother;
  r.trap.state = 'spent';
  W.zap = { room: r.i, t: 0, life: 1.6 }; W.blackT = 2; W.shake = 24; W.hitstop = .2;
  AU.play('trap'); UI.flashScreen('rgba(190,245,255,.75)'); vib([80, 40, 160]);
  for (const e of targets()) if (roomAt(e.x, e.y) === r && e.y > r.floorY - waterAt(r) - 8) { hurt(e, 999, { type: 'elec' }); }
  if (roomAt(p.x, p.y) === r && p.wet && !p.climb) { hurtPlayer(p.hpMax * .9, null); toast('你也在水裡……', '#ff4f5e'); }
  if (onMap(h) && roomAt(h.x, h.y) === r) { h.state = 'trapped'; h.trapT = 0; h.quad = 0; h.climb = null; AU.at('shriek', h.x, h.y, { range: 3000 }); }
  if (mobOn(m) && roomAt(m.x, m.y) === r) { m.stunT = 5; m.flash = 1; banner('電不死牠', '但牠停下來了——快跑', ''); }
  for (const q of W.rooms) if (!q.collapsed && Math.abs(q.c - r.c) + Math.abs(q.f - r.f) <= 2) q.flickT = 2;
}

/* ---------- 撤離 ---------- */
function callDock() {
  const D = W.dock; D.called = true;
  D.t = (W.ending ? 28 : 40 + (W.S.final ? 5 : 0)) * (survPerk('dock') ? .8 : 1);
  D.waveT = 5;
  const r = W.rooms[D.room];
  emitNoise(r.x0 + RW / 2, r.floorY - 40, 1500, 'dock');
  AU.play('sub'); AU.play('alarm'); tip('dock', true);
  banner('潛艇放下去了', `撐住 ${Math.round(D.t)} 秒`, 'cy');
  say(`撤離艇下放中。預計抵達：${Math.round(D.t)} 秒。`, `撤離艇下放中。預計抵達，${zhNum(D.t)}秒。`);
  const h = W.hunter; if (h && !h.dead && h.state === 'away' && !W.ending) { h.awayT = Math.min(h.awayT, 8); h.heardAt = { x: r.x0 + RW / 2, y: r.floorY }; }
}
function updateDock(dt) {
  const D = W.dock;
  if (!D.called) return;
  if (!D.arrived) {
    D.t -= dt;
    D.waveT -= dt;
    if (D.waveT <= 0) {
      // 撤離倒數：站裡的回聲人都被吵醒了，陸續往撤離塢走
      D.waveT = 9 - Math.min(3, W.si * .6);
      const alive = W.foes.filter(e => !e.dead && e.type === 'husk').length;
      if (alive < 4 + Math.min(3, W.si)) spawnVisitor(W.P.x, W.P.y, 1, 3.5, true);
    }
    if (D.t <= 0) { D.arrived = true; D.rise = 0; AU.play('sub'); banner('潛艇到了', '走到月池登艇', 'cy'); say(PA.docked); }
  } else D.rise = Math.min(1, D.rise + dt / 2);
}

/* ---------- 最終區：收容深艙 ---------- */
function startFinal() {
  W.deepDone = true; W.state = 'story';
  UI.story(FINAL_SCENE, { choice: true }, (choice) => {
    const allSaved = SURV_ORDER.every(id => G.survivors[id] || W.rescued.some(s => s.id === id));
    W.ending = choice === 'A' ? (allSaved ? 'A' : 'B') : 'C';
    UI.story(AFTER_CHOICE[W.ending], {}, () => { W.state = 'play'; afterChoice(); });
  });
}
function afterChoice() {
  const h = W.hunter;
  if (h && !h.dead) { h.state = 'gone'; }
  W.foes.forEach(e => { if (!e.dead && Math.random() < .5) { e.dead = true; e.deadT = 1; } });
  W.pressure = 100; W.stage = 4; W.collapseT = W.ending === 'C' ? 130 : 110;
  W.linState = W.ending === 'A' ? 'go' : W.ending === 'B' ? 'gate' : 'run';
  AU.play('alarm'); banner('站體崩潰', '去撤離塢', '');
  setTimeout(() => { if (W && W.ending) say(W.ending === 'C' ? PA.contain : PA.gate); }, 1800);
  if (W.ending === 'C') {
    const dr = W.rooms[W.M.deep];
    W.mother = { isHunter: true, mother: true, state: 'hunt', x: dr.x0 + RW - 60, y: dr.floorY, face: -1, walk: 0, moving: false, turn: .9, tilt: 0, quad: 1, atk: 0, lean: 0, flash: 0, mouth: 0,
      climb: null, H: { walk: 90, run: 150, door: 260, hear: 2 }, def: { r: 44, h: 260 }, cd: 2, lureT: 26, stunT: 0, slowT: 0, dead: false, atkT: 0 };
    const m = W.mother;
    W.fx.push({ k: 'flashscr', t: 0, life: .5 }); W.shake = 22; AU.play('shriek');
    for (let k = 0; k < 30; k++) W.fx.push({ k: 'debris', x: m.x + rand(-40, 40), y: m.y - rand(20, 200), vx: rand(-300, 300), vy: rand(-300, -60), t: 0, life: rand(.6, 1.4), rot: rand(0, 6), col: '#3a474e' });
    dr.breach = { x: dr.x0 + RW - 30, y: dr.floorY - 120, rate: 1 / 12, t: 0 };
  }
}
/* 母聆：打不動也電不死，只能跑。林汐會不時把牠引開 */
function updateMother(dt) {
  const m = W.mother, p = W.P;
  if (m.dead) return;
  m.flash = Math.max(0, m.flash - dt * 6); m.cd -= dt; m.slowT = Math.max(0, (m.slowT || 0) - dt);
  if (m.state === 'grab') { m.atk = 1; m.mouth = 1; return; }
  if (m.stunT > 0) { m.stunT -= dt; m.moving = false; m.quad = approach(m.quad, 0, dt * 3); return; }
  m.lureT -= dt;
  if (m.state === 'lured') { if (m.lureT <= 0) { m.state = 'hunt'; m.lureT = 22; banner('牠回來了', '', ''); } m.x = -999; return; }
  if (m.lureT <= 0) { m.state = 'lured'; m.lureT = 16; W.subs.push({ who: '林汐（無線電）', text: '牠往我這邊來了……快走！', kind: 'radio', dur: 3 }); AU.play('motif', { vol: .9 }); return; }
  if (m.state === 'attack') {
    m.atkT += dt; m.atk = Math.min(1, m.atkT / .6); m.mouth = m.atk;
    if (m.atkT >= .65 && !m.struck) { m.struck = true; if (W.state === 'play' && !p.hide && Math.abs(p.x - m.x) < 150 && floorOf(p.y) === floorOf(m.y)) { grabPlayer(m); return; } AU.play('swipe'); W.shake = 12; }
    if (m.atkT >= 1.2) { m.state = 'hunt'; m.atkT = 0; m.atk = 0; m.struck = false; m.cd = 1.4; }
    return;
  }
  m.atk = approach(m.atk, 0, dt * 3); m.mouth = approach(m.mouth, 0, dt * 2);
  // 牠追的是聲音：你躲起來、又不出聲，牠會從你面前走過去
  const hidden = p.hide && bodyNoise() < Math.abs(p.x - m.x);
  if (!hidden) { m.tx = p.x; m.ty = p.y; }
  else if (m.tx == null) { m.tx = m.x; m.ty = m.y; }
  if (!hidden && floorOf(p.y) === floorOf(m.y) && Math.abs(p.x - m.x) < 130 && m.cd <= 0 && W.state === 'play') { m.state = 'attack'; m.atkT = 0; m.struck = false; m.face = sgn(p.x - m.x); AU.play('sting', { force: true }); return; }
  const mv = hunterGoTo(m, m.tx, m.ty);
  if (!mv) { m.moving = false; return; }
  const spd = m.H.run * (m.slowT > 0 ? .4 : 1);
  if (m.climb) { const L = m.climb.lad, ty = m.climb.dir > 0 ? L.y2 : L.y1; m.x = L.x; m.y = approach(m.y, ty, 120 * dt); m.walk += dt * 4; if (m.y === ty) m.climb = null; return; }
  if (mv.lad) { if (Math.abs(m.x - mv.lad.x) < 10) { m.climb = { lad: mv.lad, dir: mv.dir }; return; } mv.x = mv.lad.x; }
  const dx = mv.x - m.x; m.moving = Math.abs(dx) > 4; m.quad = approach(m.quad, m.moving ? 1 : 0, dt * 4); if (!m.moving) return;
  m.face = sgn(dx);
  const bl = moveX(m, m.x + clamp(dx, -spd * dt, spd * dt), 40); m.walk += dt * spd / 30;
  if (Math.random() < dt * 1.6) { AU.at('gallop', m.x, m.y, { vol: 1.6 }); W.shake = Math.max(W.shake, 3); }
  if (bl && bl !== 'wall' && bl.state === 'closed') { bl.hp -= m.H.door * dt; bl.shake = 2; if (bl.hp <= 0) breakDoor(bl); }
}

/* ---------- 心率：牠越近、你憋氣越久，心跳越快；心跳太快，牠聽得到 ---------- */
function updateHeart(dt) {
  const h = W.hunter, p = W.P, st = PS();
  let prox = 0;
  if (onMap(h)) { const d = Math.hypot(h.x - p.x, (h.y - p.y) * 1.4); prox = clamp(1 - d / (900 * st.sonar), 0, 1); if (h.state === 'hunt' || h.state === 'attack' || h.state === 'check') prox = Math.min(1, prox + .25); }
  else if (h && h.state === 'venting') { const d = Math.hypot(h.vent.x - p.x, (h.vent.y - p.y) * 1.4); prox = clamp(1 - d / (1100 * st.sonar), 0, 1) * .8; }
  else if (h && h.state === 'crawl') { const d = Math.hypot(h.cx - p.x, (h.cy - p.y) * 1.4); prox = clamp(1 - d / (1000 * st.sonar), 0, 1) * .7; }
  if (mobOn(W.mother)) prox = Math.max(prox, clamp(1 - Math.hypot(W.mother.x - p.x, W.mother.y - p.y) / 1000, 0, 1));
  W.heartProx = lerp(W.heartProx, prox, Math.min(1, dt * 2));
  W.scare = Math.max(0, W.scare - dt * .22);
  let target = 70 + W.heartProx * 58 * st.calm + W.pressure * .06 + (p.hp < p.hpMax * .35 ? 10 : 0) + (W.dock.called && !W.dock.arrived ? 12 : 0) + W.scare * 22;
  if (p.hold) target += Math.min(20, p.holdT * 2.5) * st.holdHeart;
  if (p.hide && st.calmHide) target -= 10;
  W.heart = lerp(W.heart, target, Math.min(1, dt * .8));
  W.heartT -= dt;
  if (W.heartT <= 0) { W.heartT = 60 / W.heart; if (W.heartProx > .18 || p.hp < p.hpMax * .3 || p.hide) AU.play('heart', { vol: (p.hide ? .4 : .25) + W.heartProx * .8 + (W.heart >= 148 ? .3 : 0) }); }
  // 配樂張力
  let tension = W.heartProx * .9 + W.pressure / 260;
  if (W.foes.some(e => !e.dead && e.chase && Math.abs(e.x - p.x) < 500 && floorOf(e.y) === floorOf(p.y))) tension += .3;
  if (W.dock.called && !W.dock.arrived) tension += .4;
  AU.tickMusic(dt, clamp(tension, 0, 1));
  AU.tickAmb(dt);
  AU.tickBreath(dt, W.heart, p.stealth || !!p.hide, AU.under, p.hold, !!p.hide);
}

/* ---------- 特效 ---------- */
function spark(x, y, n, col, sp) { for (let k = 0; k < n; k++) { const a = rand(0, TAU), s = rand(.3, 1) * sp; W.fx.push({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0, life: rand(.25, .55), col }); } }
function flashAt(x, y, col, r) { W.fx.push({ k: 'light', x, y, col, r, t: 0, life: .07 }); }
function updateFX(dt) {
  W.shake = Math.max(0, W.shake - dt * 30);
  if (W.zap) { W.zap.t += dt; if (W.zap.t >= W.zap.life) W.zap = null; }
  const keep = [];
  for (const f of W.fx) {
    f.t += dt;
    if (f.vx != null) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.k === 'spark' || f.k === 'debris' || f.k === 'shell') f.vy += 700 * dt; if (f.k === 'flame') { f.vy -= 120 * dt; f.vx *= .96; } }
    if (f.k === 'drip') { f.vy += 520 * dt; if (f.y >= f.fy) { f.t = f.life; keep.push({ k: 'goo', x: f.x, y: f.fy, r: rand(4, 8), col: 'rgba(150,190,140,.75)', t: 0, life: 4 }); } }
    if (f.t < f.life) keep.push(f);
  }
  W.fx = keep;
  for (const n of W.nums) { n.t += dt; n.y -= dt * 34; n.pop = Math.max(0, n.pop - dt * 5); if (n.t > .9) n.done = true; }
  W.nums = W.nums.filter(n => n.t < 1.1);
  for (const p of W.pulses) p.t += dt;
  W.pulses = W.pulses.filter(p => p.t < p.dur);
  for (const v of W.vents) v.shake = Math.max(0, v.shake - dt * .8);
}

/* ---------- 提示、字幕、橫幅 ---------- */
function tip(key, perRun) {
  if (!RADIO[key]) return;
  if (perRun) { if (W.said[key]) return; W.said[key] = true; }
  else { if (G.tips[key]) return; G.tips[key] = true; }
  const urgent = /^(holdStill|shriek|vent|lowhp|p85|p100|check|trapReady|grabEscape|bullet|breathOut|fearless)$/.test(key);
  W.subs.push({ who: '老韓（無線電）', text: RADIO[key], kind: 'radio', dur: 2.6 + RADIO[key].length / 14, prio: urgent ? 3 : 0 });
  AU.play('radio');
}
function banner(t, s, cls) { UI.banner(t, s, cls); }
function toast(html, col) { UI.toast(html, col); }

/* ---------- 結束一趟 ---------- */
function endRun(kind) {
  if (W.finished) return;
  W.finished = true; W.state = 'over';
  AU.setUnder(false);
  const sum = settleRun(kind);
  const goEnding = (kind === 'dock' && W.ending);
  setTimeout(() => {
    if (goEnding) {
      const E = ENDINGS[W.ending];
      UI.story(E.lines, { ending: W.ending }, () => UI.results(sum));
    } else UI.results(sum);
  }, kind === 'dead' ? 200 : 600);
}
function settleRun(kind) {
  const ok = kind === 'dock' || kind === 'pod';
  const st = PS(), si = W.si, gs = W.S.endless ? null : G.sectors[si];
  const sum = { kind, ok, si, endless: !!W.S.endless, tier: W.tier, credits: 0, loot: W.bag.slice(), rescued: [], stars: [false, false, false], newStars: [], unlocked: [], relics: [], bps: [], logs: W.logsGot.slice(), kills: W.kills, dodges: W.dodges, escapes: W.escapes, caught: !!W.caughtBy, time: W.t, bonus: 0, ending: W.ending, hunterKill: W.obj.hunterKill };
  G.stats.dives++; G.stats.kills += W.kills;
  if (!ok) { G.stats.deaths++; if (gs) gs.runs++; saveGame(); return sum; }
  G.stats.extracts++;
  let credits = W.bagVal * st.credits;
  if (kind === 'dock') {
    for (const s of W.rescued) { if (s.id) { if (!G.survivors[s.id]) sum.rescued.push(s.id); G.survivors[s.id] = true; } else credits += 60; }
    if (W.ending === 'A') G.survivors.lin = true;
  }
  for (const id of W.relicsGot) { G.relics[id] = Math.min(3, (G.relics[id] || 0) + 1); sum.relics.push(id); }
  for (const id of W.bpsGot) { if (!G.weapons.includes(id)) { G.weapons.push(id); sum.bps.push(id); } }
  if (gs) {
    gs.runs++;
    const stars = [kind === 'dock', kind === 'dock' && W.obj.rescued >= W.obj.survivors, W.obj.hunterKill];
    stars.forEach((v, k) => { if (v) { sum.stars[k] = true; if (!gs.stars[k]) { gs.stars[k] = true; sum.newStars.push(k); credits += 120 + si * 60; } } });
    const finalNeedsEnding = W.S.final && !W.ending;
    if (kind === 'dock' && !finalNeedsEnding && !gs.cleared) {
      gs.cleared = true;
      const bp = BLUEPRINT_PLAN[si]; if (bp && !G.weapons.includes(bp)) { G.weapons.push(bp); sum.bps.push(bp); }
      if (si + 1 < SECTORS.length) { G.sectors[si + 1].unlocked = true; sum.unlocked.push(SECTORS[si + 1].name); }
      if (si === 2 && !G.endless.unlocked) { G.endless.unlocked = true; sum.unlocked.push('無盡深潛'); }
      sum.firstClear = true;
    }
    gs.best = Math.max(gs.best || 0, Math.round(W.bagVal));
    if (W.ending) G.endings[W.ending] = true;
  } else {
    if (kind === 'dock') { G.endless.best = Math.max(G.endless.best, W.tier); sum.nextTier = W.tier + 1; }
    credits *= 1 + .1 * W.tier;
  }
  if (kind === 'dock' && W.ending === 'C') { credits += 50000; sum.bounty = 50000; }
  credits = Math.round(credits);
  sum.credits = credits; G.credits += credits; G.stats.credits += credits;
  saveGame();
  return sum;
}
