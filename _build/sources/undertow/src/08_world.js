/* ============ 08 世界：移動、戰鬥、聲音、獵手、波次、進水、撤離 ============ */
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
    foes: [], projs: [], fx: [], nums: [], items: [], pulses: [], decoys: [], drones: [],
    pressure: 0, stage: 0, waveT: S.wave.first, waveN: 0, warns: [], warned: false, breachT: 12, collapseT: 0,
    noise: 0, heart: 72, heartT: 0, heartProx: 0,
    bag: [], bagVal: 0, bagWt: 0, rescued: [], logsGot: [], relicsGot: [], bpsGot: [], key: false, cacheQ: 0, lvQ: 0,
    obj: { survivors: M.survivors.length, rescued: 0, hunter: false, hunterKill: false },
    dock: { room: M.dock, called: false, t: 0, arrived: false, rise: 0, waveT: 0, board: 0 },
    pods: M.rooms.filter(r => r.special === 'pod').map(r => ({ room: r.i, cells: 0, x: r.x0 + RW / 2, y: r.floorY })),
    state: 'play', ending: null, deepDone: false, mother: null, linState: 'sit',
    kills: 0, dmgDealt: 0, said: {}, subs: [], shake: 0, hitstop: 0, slow: 1, flowCache: {}, sonarT: 2, fxT: 0,
    hunter: null, finished: false, msg: null,
  };
  // 預先繪製房間
  for (const r of W.rooms) r.bg = paintRoom(r, M);
  const st = W.rooms[M.start];
  st.explored = true;
  W.P = makePlayer(st.x0 + RW / 2 + (st.c === 0 ? 40 : -40), st.floorY);
  // 沉睡的怪
  for (const s of M.sleepers) {
    const r = W.rooms[s.room];
    for (let k = 0; k < s.n; k++) {
      const e = spawnFoe(s.type, r.x0 + rand(80, RW - 80), r.floorY, false);
      e.sleep = s.type === 'iso'; e.idle = s.type === 'husk'; e.home = r.i;
    }
  }
  // 獵手
  const H = S.hunter;
  W.hunter = {
    isHunter: true, state: 'away', x: 0, y: 0, hp: H.hp, hpMax: H.hp, face: 1, walk: 0, moving: false, turn: 0, flash: 0, mouth: 0, atkPose: 0,
    climb: null, cd: 0, memT: 0, tx: 0, ty: 0, engage: 0, awayT: si === 0 ? 55 : 42, vent: null, ventT: 0, stunT: 0, stag: 0, stagT: 0, atkT: 0, searchT: 0,
    shriekCD: 20, chargeT: 0, def: { r: 30, h: 168 }, heard: 0, dropT: 0, seen: false, H, repelled: 0, dead: false, alertT: 0,
  };
  W.cam = { x: W.P.x, y: W.P.y - 80 };
  if (S.final) { const dr = W.rooms[M.deep]; const side = dr.ladUp && dr.tank && dr.ladUp.x < dr.tank.x ? 1 : -1; W.lin = { x: dr.tank ? dr.tank.x + side * 120 : dr.x0 + 60, y: dr.floorY }; }
  return W;
}
function xpNeed(L) { return 9 + L * 6 + Math.floor(L * L * .35); }
function makePlayer(x, y) {
  let hpMax = 100 + metaLv('hp') * 14 + relicBonus('hp');
  if (survPerk('maxhp')) hpMax *= 1.1;
  hpMax = Math.round(hpMax);
  const startW = G.weapons.includes(G.lastWeapon) ? G.lastWeapon : 'rivet';
  return {
    x, y, vx: 0, face: 1, hp: hpMax, hpMax, o2: 1, climb: null, walk: 0, moving: false, stealth: false, recoil: 0, fireT: 0, flash: 0, inv: 0,
    lvl: 1, xp: 0, xpNeed: xpNeed(1), weapons: [newWeapon(startW)], passives: {}, med: metaLv('med'), decoys: 1 + metaLv('decoy'), batteries: metaLv('battery'),
    rerolls: 1 + metaLv('reroll') + (survPerk('reroll') ? 1 : 0), adrenT: 0, stepT: 0, channel: null, searching: null, reinforcing: null, medT: 0, decoyT: 0,
    gun: startW, st: null, dirty: true, nzT: 0, lastHurt: 0, underT: 0,
  };
}
function newWeapon(id) { return { id, lv: 1, cd: .4, nzT: 0, burstT: 0, burstN: 0 }; }

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
    magnet: 72 * (1 + .2 * metaLv('magnet') + .4 * pv('magnet')),
    xp: 1 + .1 * pv('magnet') + relicBonus('xp'),
    elec: (1 + .3 * pv('conduct')) * (survPerk('elec') ? 1.15 : 1),
    armor: .04 * metaLv('armor'),
    regen: .6 * pv('regen'),
    water: Math.min(1, (pv('fins') >= 3 ? 1 : pv('fins') === 2 ? .85 : .68) + (survPerk('swim') ? .25 : 0)),
    hunter: 1 + relicBonus('hunter'),
    sonar: 1 + (survPerk('sonar') ? .3 : 0) + relicBonus('sonar') + (G.survivors.lin ? .25 : 0),
    credits: 1 + (survPerk('credits') ? .15 : 0) + relicBonus('credits'),
    med: .38 * (survPerk('medPlus') ? 1.3 : 1),
    leech: survPerk('leech'),
    adren: pv('adren'),
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
  if (src === 'player') W.noise = Math.min(1, W.noise + r / 900);
  // 沉睡／閒晃的怪
  for (const e of W.foes) {
    if (e.dead) continue;
    if ((e.sleep || e.idle) && heardBy(p, e.x, e.y - 10, 1)) { e.sleep = false; e.idle = false; e.awake = true; }
    if (src === 'decoy' && heardBy(p, e.x, e.y, 1.2)) { e.lure = p; e.lureT = 6; }
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
  updateWeapons(dt);
  updateProjs(dt);
  for (const e of W.foes) if (!e.dead) updateFoe(e, dt);
  separateFoes();
  for (const e of W.foes) if (e.dead) e.deadT += dt;
  W.foes = W.foes.filter(e => !e.dead || e.deadT < .4);
  updateHunter(dt);
  if (W.mother) updateMother(dt);
  updateWaves(dt);
  updateWater(dt);
  updateDoors(dt);
  updateItems(dt);
  updateDecoys(dt);
  updateInteract(dt);
  updateSurvivors(dt);
  updateDock(dt);
  updateFX(dt);
  updateHeart(dt);
  W.noise = Math.max(0, W.noise - dt * .45);
  if (p.hp <= 0 && W.state === 'play') playerDie();
  if (W.state === 'dying') { W.dieT -= dt / Math.max(.2, W.slow); W.slow = approach(W.slow, .25, dt * 2); if (W.dieT <= 0) endRun('dead'); }
}

/* ---------- 主角 ---------- */
function updatePlayer(dt) {
  const p = W.P, st = PS();
  p.flash = Math.max(0, p.flash - dt * 6); p.inv = Math.max(0, p.inv - dt); p.recoil = Math.max(0, p.recoil - dt * 8); p.fireT = Math.max(0, p.fireT - dt);
  p.adrenT = Math.max(0, p.adrenT - dt); p.medT = Math.max(0, p.medT - dt); p.decoyT = Math.max(0, p.decoyT - dt);
  if (st.regen && p.hp < p.hpMax && p.hp > 0) p.hp = Math.min(p.hpMax, p.hp + st.regen * dt);
  const r = roomAt(p.x, p.y);
  if (!r.explored) { r.explored = true; onEnterRoom(r); }
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
  let spd = (p.stealth ? SNEAK : RUN) * st.speed * (p.adrenT > 0 ? 1.35 : 1) * (wet ? st.water : 1);
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
      if (p.moving) { p.walk += dt * Math.abs(p.vx) / 15; if (!p.target) p.face = sgn(p.vx); }
      if (p.moving && !p.stealth) {
        p.stepT -= dt * Math.abs(p.vx) / RUN;
        if (p.stepT <= 0) { p.stepT = .4; const carry = 1 + Math.min(.6, W.bagWt * .02); emitNoise(p.x, p.y, 125 * st.noise * carry, 'player', false); if (wet) AU.play('splash', { vol: .5 }); }
      }
    }
  }
  if (p.target && !p.climb) p.face = sgn(p.target.x - p.x) || p.face;
}
function onEnterRoom(r) {
  if (r.survivor && r.survivor.state === 'hide') { tip('survivor'); W.subs.push({ who: r.survivor.name, text: '「……噓。」', kind: 'voice', dur: 2.6 }); }
  if (r.water > .3) tip('water');
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
}
function playerDie() {
  W.state = 'dying'; W.dieT = 1.6; W.P.hp = 0; AU.play('fail'); W.shake = 16;
  spark(W.P.x, W.P.y - 40, 26, '#ff8a3d', 280);
}

/* ---------- 開火／潛行 ---------- */
function toggleStance(force) {
  const p = W.P; p.stealth = force != null ? force : !p.stealth;
  AU.play(p.stealth ? 'stance_q' : 'stance_f');
  if (p.stealth) tip('stealth');
  UI.stance();
}

/* ---------- 目標 ---------- */
function targets() {
  const out = [];
  for (const e of W.foes) if (!e.dead && !e.sleepHidden) out.push(e);
  const h = W.hunter; if (h && onMap(h)) out.push(h);
  if (W.mother && W.mother.state !== 'gone' && W.mother.state !== 'lured') out.push(W.mother);
  return out;
}
function tgtY(e) { return e.y - (e.def.h || 30) * .5 - (e.type === 'jelly' ? 26 : 0); }
function findTarget(range, from) {
  const p = W.P; from = from || p;
  const pf = floorOf(from.y);
  let best = null, bd = 1e9;
  for (const e of targets()) {
    if (e.climb && floorOf(e.y) !== pf) continue;
    if (floorOf(e.y) !== pf) continue;
    const d = Math.abs(e.x - from.x);
    if (d > range || d >= bd) continue;
    if (!losClear(from.x, e.x, pf)) continue;
    best = e; bd = d;
  }
  return best;
}

/* ---------- 武器 ---------- */
function updateWeapons(dt) {
  const p = W.P, st = PS();
  p.target = null;
  if (W.state !== 'play') return;
  const quiet = p.stealth || p.climb || p.channel;
  for (const w of p.weapons) {
    w.cd -= dt; w.nzT -= dt;
    if (w.id === 'drone') { updateDrone(w, dt, quiet); continue; }
    if (quiet) continue;
    if (w.cd > 0) {
      if (w.id === 'torch' && w.burning) torchTick(w, dt);
      continue;
    }
    fireWeapon(w, st);
  }
  if (!quiet) { const t = findTarget(440); if (t) p.target = t; }
}
const muzzle = () => { const p = W.P; return { x: p.x + p.face * 46, y: p.y - 39 * (p.stealth ? .9 : 1) }; };
function wNoise(w, base) { if (w.nzT > 0) return; w.nzT = .28; emitNoise(W.P.x, W.P.y - 30, base * PS().noise, 'player'); }
function fireWeapon(w, st) {
  const p = W.P, L = w.lv;
  switch (w.id) {
    case 'rivet': {
      const t = findTarget(340); if (!t) { w.cd = .1; return; }
      p.target = t; p.face = sgn(t.x - p.x) || p.face;
      const n = L >= 3 ? 2 : 1, m = muzzle(), ty = tgtY(t);
      for (let k = 0; k < n; k++) {
        const ang = Math.atan2(ty - m.y, t.x - m.x) + (n > 1 ? (k - .5) * .07 : 0) + rand(-.02, .02);
        W.projs.push({ kind: 'rivet', x: m.x, y: m.y, vx: Math.cos(ang) * 950, vy: Math.sin(ang) * 950, dmg: 10 * (L >= 2 ? 1.3 : 1) * (L >= 5 ? 1.4 : 1), life: .42, pierce: L >= 5 ? 2 : 0, hit: new Set(), knock: 14, col: '#ffcf7a' });
      }
      w.cd = .22 / (L >= 4 ? 1.25 : 1);
      p.recoil = 1; p.fireT = .06; flashAt(m.x, m.y, '#ffd28a', 90);
      AU.play('rivet'); wNoise(w, WEAPONS.rivet.noise);
      W.fx.push({ k: 'shell', x: p.x - p.face * 4, y: p.y - 40, vx: -p.face * rand(40, 90), vy: rand(-160, -90), t: 0, life: .6 });
      break; }
    case 'arc': {
      const t = findTarget(270); if (!t) { w.cd = .1; return; }
      p.target = t; p.face = sgn(t.x - p.x) || p.face;
      const chains = 2 + (L >= 2 ? 1 : 0), dmg = 16 * (L >= 3 ? 1.4 : 1);
      const m = muzzle(), pts = [[m.x, m.y]], hit = new Set();
      let cur = t;
      for (let k = 0; k <= chains && cur; k++) {
        hit.add(cur); pts.push([cur.x, tgtY(cur)]);
        hurt(cur, dmg, { type: 'elec', crit: true, stun: L >= 5 ? .5 : 0 });
        if (L >= 5 && k > 0) { const fork = nearestFoe(cur, 120, hit); if (fork) { hit.add(fork); hurt(fork, dmg * .6, { type: 'elec' }); W.fx.push({ k: 'bolt', pts: [[cur.x, tgtY(cur)], [fork.x, tgtY(fork)]], t: 0, life: .16, col: '#9ff4ff' }); } }
        cur = nearestFoe(cur, 145, hit);
      }
      // 水中導電：整池一起電
      const tr = roomAt(t.x, t.y);
      if (tr.water > .25 && t.y > tr.floorY - waterAt(tr) - 10) {
        for (const e of targets()) if (!hit.has(e) && roomAt(e.x, e.y) === tr && e.y > tr.floorY - waterAt(tr) - 6) { hit.add(e); hurt(e, dmg * 1.3, { type: 'elec' }); W.fx.push({ k: 'bolt', pts: [[t.x, tgtY(t)], [e.x, tgtY(e)]], t: 0, life: .2, col: '#c7fbff' }); }
        W.fx.push({ k: 'waterzap', room: tr.i, t: 0, life: .35 });
      }
      W.fx.push({ k: 'bolt', pts, t: 0, life: .17, col: '#7fe9ff' });
      flashAt(m.x, m.y, '#7fe9ff', 110);
      w.cd = 1.0 * (L >= 4 ? .75 : 1); p.recoil = .5; p.fireT = .05;
      AU.play('arc'); wNoise(w, WEAPONS.arc.noise);
      break; }
    case 'harpoon': {
      const t = findTarget(450); if (!t) { w.cd = .1; return; }
      p.target = t; p.face = sgn(t.x - p.x) || p.face;
      const m = muzzle(), ang = Math.atan2(tgtY(t) - m.y, t.x - m.x);
      const shot = () => W.projs.push({ kind: 'harpoon', x: m.x, y: m.y, vx: Math.cos(ang) * 780, vy: Math.sin(ang) * 780, dmg: 50 * (L >= 2 ? 1.35 : 1), life: .62, pierce: 99, hit: new Set(), knock: 70, pin: L >= 5, col: '#e8f0f4', ap: true });
      shot(); if (L >= 4) { w.burstN = 1; w.burstT = .14; }
      w.cd = 1.5 * (L >= 3 ? .8 : 1); p.recoil = 2; p.fireT = .1; W.shake = Math.max(W.shake, 3);
      AU.play('harpoon'); wNoise(w, WEAPONS.harpoon.noise);
      break; }
    case 'sonic': {
      const rad = 170 * (L >= 2 ? 1.25 : 1);
      const near = targets().filter(e => Math.abs(e.x - p.x) < rad && Math.abs(tgtY(e) - (p.y - 34)) < 110);
      if (!near.length) { w.cd = .15; return; }
      for (const e of near) {
        const dir = sgn(e.x - p.x);
        hurt(e, 26 * (L >= 3 ? 1.4 : 1) * (e.isHunter ? 2.5 : 1), { type: 'sonic', knock: e.isHunter ? 40 : 130, dir, crit: true, vuln: L >= 5 ? 3 : 0 });
        if (e.isHunter) stunHunter(e, L >= 5 ? 2.2 : 1.3);
      }
      W.fx.push({ k: 'ring', x: p.x, y: p.y - 34, r0: 20, r1: rad, t: 0, life: .4, col: '#ffa36b', w: 8 });
      W.fx.push({ k: 'ring', x: p.x, y: p.y - 34, r0: 10, r1: rad * .7, t: 0, life: .3, col: '#fff1e0', w: 3 });
      w.cd = 2.4 * (L >= 4 ? .8 : 1); W.shake = Math.max(W.shake, 7); p.fireT = .1;
      AU.play('sonic'); emitNoise(p.x, p.y - 30, WEAPONS.sonic.noise * PS().noise, 'player');
      break; }
    case 'torch': {
      const range = 125 * (L >= 2 ? 1.25 : 1);
      const t = findTarget(range); if (!t) { w.cd = .1; w.burning = false; return; }
      p.target = t; p.face = sgn(t.x - p.x) || p.face; w.burning = true; w.cd = .1;
      torchTick(w, .1);
      break; }
    case 'cryo': {
      const rad = 150 * (L >= 2 ? 1.2 : 1);
      const near = targets().filter(e => Math.abs(e.x - p.x) < rad && Math.abs(tgtY(e) - (p.y - 34)) < 100);
      if (!near.length) { w.cd = .2; return; }
      for (const e of near) {
        hurt(e, 10, { type: 'cold', crit: true });
        if (L >= 5 && !e.frozeOnce && !e.isHunter) { e.frozen = 1.2; e.frozeOnce = true; }
        e.slow = Math.max(e.slow || 0, 2.5 + (L >= 3 ? 1.5 : 0));
      }
      W.fx.push({ k: 'frost', x: p.x, y: p.y - 30, r: rad, t: 0, life: .55 });
      w.cd = 3 * (L >= 4 ? .75 : 1);
      AU.play('cryo'); wNoise(w, WEAPONS.cryo.noise);
      break; }
  }
}
function torchTick(w, dt) {
  const p = W.P, L = w.lv, range = 125 * (L >= 2 ? 1.25 : 1);
  w.tickT = (w.tickT || 0) - dt;
  if (Math.random() < .9) for (let k = 0; k < 2; k++) W.fx.push({ k: 'flame', x: p.x + p.face * 44, y: p.y - 38, vx: p.face * rand(260, 420), vy: rand(-40, 30), t: 0, life: range / 360 * rand(.7, 1) });
  if (w.tickT > 0) return;
  w.tickT = .1;
  for (const e of targets()) {
    const dx = (e.x - p.x) * p.face;
    if (dx < -10 || dx > range || Math.abs(tgtY(e) - (p.y - 38)) > 55) continue;
    if (!losClear(p.x, e.x, floorOf(p.y))) continue;
    hurt(e, 5 * (L >= 3 ? 1.35 : 1) * (e.atDoor ? 1.5 : 1), { type: 'fire', crit: true, burn: 3 * (L >= 4 ? 2 : 1) });
  }
  if (Math.random() < .3) AU.play('weld', { vol: .6 });
  wNoise(w, WEAPONS.torch.noise);
}
function updateDrone(w, dt, quiet) {
  const p = W.P, n = w.lv >= 5 ? 2 : 1;
  while (W.drones.length < n) W.drones.push({ x: p.x, y: p.y - 80, cd: .3, a: W.drones.length * Math.PI });
  for (const d of W.drones) {
    d.a += dt * 2;
    const tx = p.x - p.face * 22 + Math.cos(d.a) * 16, ty = p.y - 92 + Math.sin(d.a * 1.7) * 7;
    d.x = lerp(d.x, tx, Math.min(1, dt * 6)); d.y = lerp(d.y, ty, Math.min(1, dt * 6));
    d.cd -= dt;
    if (quiet || d.cd > 0) continue;
    const t = findTarget(230 * (w.lv >= 4 ? 1.3 : 1), { x: d.x, y: p.y });
    if (!t) { d.cd = .15; continue; }
    hurt(t, 7 * (w.lv >= 2 ? 1.4 : 1), { type: 'phys', crit: true, knock: 4, dir: sgn(t.x - d.x) });
    W.fx.push({ k: 'laser', x1: d.x, y1: d.y, x2: t.x, y2: tgtY(t), t: 0, life: .08 });
    d.cd = .35 / (w.lv >= 3 ? 1.3 : 1);
    AU.play('drone'); wNoise(w, WEAPONS.drone.noise);
  }
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
    // 連發
    const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
    const f = floorOf(b.y + 30);
    const cA = Math.floor(b.x / RW), cB = Math.floor(nx / RW);
    if (cA !== cB) { const c = Math.max(cA, cB); const d = doorAt(c, f); if (c <= 0 || c >= W.C || !d || d.state === 'locked') { spark(c * RW, b.y, 5, '#ffd28a', 120); continue; } }
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
    if (!dead && b.life > 0) keep.push(b);
  }
  W.projs = keep;
  // 魚叉連發
  for (const w of W.P.weapons) if (w.burstN > 0) { w.burstT -= dt; if (w.burstT <= 0) { w.burstN--; const t = findTarget(450); if (t) { const m = muzzle(), ang = Math.atan2(tgtY(t) - m.y, t.x - m.x); W.projs.push({ kind: 'harpoon', x: m.x, y: m.y, vx: Math.cos(ang) * 780, vy: Math.sin(ang) * 780, dmg: 50 * (w.lv >= 2 ? 1.35 : 1), life: .62, pierce: 99, hit: new Set(), knock: 70, pin: w.lv >= 5, col: '#e8f0f4', ap: true }); AU.play('harpoon'); } } }
}

/* ---------- 受傷 ---------- */
function hurt(e, dmg, o = {}) {
  if (e.dead) return;
  if (e.isHunter) return hurtHunter(e, dmg, o);
  const st = PS();
  let d = dmg * st.dmg;
  if (e.vuln > 0) d *= 1.3;
  if (e.slow > 0 || e.frozen > 0) d *= 1.2;
  if (o.type === 'elec') d *= st.elec;
  if (e.def.armor && o.type === 'phys' && !o.ap) { d *= 1 - e.def.armor; if (Math.random() < .3) AU.at('armor', e.x, e.y); }
  let crit = false;
  if (o.crit && Math.random() < st.crit) { d *= st.critDmg; crit = true; }
  e.hp -= d; e.flash = 1; W.dmgDealt += d;
  if (o.knock) e.kx = (e.kx || 0) + (o.dir || 1) * o.knock * (e.elite ? .4 : 1) * (e.type === 'crab' ? .5 : 1);
  if (o.burn) e.burn = Math.max(e.burn || 0, o.burn);
  if (o.vuln) e.vuln = o.vuln;
  if (o.stun) e.stun = Math.max(e.stun || 0, o.stun);
  if (o.pin) e.stun = Math.max(e.stun || 0, o.pin);
  if (e.sleep || e.idle) { e.sleep = false; e.idle = false; e.awake = true; }
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
  spark(e.x, tgtY(e), 14, e.type === 'jelly' ? '#8ff0ff' : e.type === 'husk' ? '#b6ff6d' : '#6dd3c0', 220);
  W.fx.push({ k: 'goo', x: e.x, y: e.y, t: 0, life: 6, r: (e.def.r || 18) * (e.elite ? 1.4 : 1), col: e.type === 'husk' ? '#2c3a22' : e.type === 'crab' ? '#3a1a14' : '#1d2f33' });
  AU.at('kill', e.x, e.y);
  const xp = e.def.xp * (e.elite ? 5 : 1);
  for (let k = 0; k < Math.min(6, Math.ceil(xp / 2)); k++) dropItem({ kind: 'orb', xp: xp / Math.min(6, Math.ceil(xp / 2)) }, e.x, tgtY(e));
  if (e.elite) { dropItem({ kind: 'cache', rar: 3 }, e.x, e.y - 20); }
  if (Math.random() < .035) dropItem({ kind: 'med' }, e.x, e.y - 20);
  if (Math.random() < .03) dropItem({ kind: 'battery' }, e.x, e.y - 20);
  if (st.leech && Math.random() < .12) W.P.hp = Math.min(W.P.hpMax, W.P.hp + 3);
  // 熔斷
  const torch = W.P.weapons.find(w => w.id === 'torch' && w.lv >= 5);
  if (torch && e.burn > 0) { W.fx.push({ k: 'ring', x: e.x, y: tgtY(e), r0: 8, r1: 70, t: 0, life: .3, col: '#ff8a3d', w: 6 }); for (const o of targets()) if (o !== e && Math.hypot(o.x - e.x, tgtY(o) - tgtY(e)) < 70) hurt(o, 30, { type: 'fire' }); }
}

/* ---------- 敵人 ---------- */
function spawnFoe(type, x, y, awake = true, elite = false) {
  const def = FOES[type], sec = W.S.endless ? 4 + W.S.tier * .5 : W.si;
  const hpm = (1 + .25 * sec) * (elite ? 4 : 1), dmgm = 1 + .15 * sec;
  const e = { type, def, x, y, hp: def.hp * hpm, hpMax: def.hp * hpm, dmg: def.dmg * dmgm * (elite ? 1.3 : 1), face: Math.random() < .5 ? 1 : -1, walk: rand(0, 6), flash: 0, kx: 0,
    wind: 0, windT: 0, cd: rand(.3, 1), climb: null, awake, elite, seed: rand(0, 9), shoutCD: rand(1, 3), spawnT: .5, slow: 0, frozen: 0, burn: 0, vuln: 0, stun: 0, fuseT: 0, lungeT: 0 };
  W.foes.push(e);
  return e;
}
function goalFor(e) {
  if (e.lure && e.lureT > 0) return { x: e.lure.x, y: e.lure.y };
  return { x: W.P.x, y: W.P.climb ? (W.P.climb.y2) : W.P.y };
}
function updateFoe(e, dt) {
  e.flash = Math.max(0, e.flash - dt * 7); e.spawnT = Math.max(0, e.spawnT - dt);
  if (e.burn > 0) { e.burn -= dt; e.burnTick = (e.burnTick || 0) - dt; if (e.burnTick <= 0) { e.burnTick = .4; hurt(e, 4 * (W.P.weapons.find(w => w.id === 'torch' && w.lv >= 4) ? 2 : 1), { type: 'fire' }); if (e.dead) return; } }
  e.slow = Math.max(0, e.slow - dt); e.frozen = Math.max(0, e.frozen - dt); e.vuln = Math.max(0, e.vuln - dt); e.stun = Math.max(0, e.stun - dt);
  if (e.lureT > 0) e.lureT -= dt; else e.lure = null;
  if (e.kx) { const k = e.kx * Math.min(1, dt * 10); moveX(e, e.x + k, e.def.r); e.kx -= k; if (Math.abs(e.kx) < 1) e.kx = 0; }
  if (e.sleep || e.spawnT > 0) return;
  if (e.frozen > 0 || e.stun > 0) return;
  const p = W.P, def = e.def;
  let spd = def.spd * (e.slow > 0 ? .5 : 1);
  const r = roomAt(e.x, e.y);
  const inWater = r.water > .25 && waterAt(r) > 20;
  if (e.type === 'eel') spd = inWater ? def.wspd : 30;
  else if (inWater && !def.fly) spd *= .75;
  e.atDoor = null;
  // 回聲人：看到你就大叫
  if (e.type === 'husk') {
    e.shoutCD -= dt; e.shoutT = Math.max(0, (e.shoutT || 0) - dt);
    if (e.idle) { e.walk += dt * 2; e.idleT = (e.idleT || 0) - dt; if (e.idleT <= 0) { e.idleT = rand(2, 5); e.idleDir = Math.random() < .5 ? -1 : 1; } moveX(e, e.x + e.idleDir * 18 * dt, def.r); e.face = e.idleDir; if (floorOf(p.y) === floorOf(e.y) && Math.abs(p.x - e.x) < 260 && losClear(p.x, e.x, floorOf(p.y))) { e.idle = false; e.awake = true; } return; }
    if (e.shoutCD <= 0 && floorOf(p.y) === floorOf(e.y) && Math.abs(p.x - e.x) < 320 && losClear(p.x, e.x, floorOf(p.y))) {
      e.shoutCD = 8; e.shoutT = 1;
      emitNoise(e.x, e.y - 50, 540, 'husk'); AU.at('shout', e.x, e.y, { range: 1200 });
      if (Math.abs(p.x - e.x) < 300) W.subs.push({ who: '回聲人', text: pick(HUSK_LINES), kind: 'voice', dur: 2.4, prio: 1 });
      tip('husk');
    }
  }
  if (e.idle) return;
  const goal = goalFor(e);
  // 攀爬中
  if (e.climb) {
    const L = e.climb.lad, ty = e.climb.dir > 0 ? L.y2 : L.y1;
    e.x = L.x; e.y = approach(e.y, ty, spd * .7 * dt); e.walk += dt * 6;
    if (e.y === ty) e.climb = null;
    return;
  }
  // 攻擊動作
  if (e.wind > 0) {
    e.windT += dt;
    if (e.type === 'eel' && e.windT >= def.wind) { if (!e.lungeT) { e.lungeT = .35; e.lungeDir = e.face; } }
    if (e.lungeT > 0) { e.lungeT -= dt; moveX(e, e.x + e.lungeDir * 420 * dt, def.r); if (Math.abs(p.x - e.x) < 34 && Math.abs(p.y - e.y) < 50) { hurtPlayer(e.dmg, e); e.lungeT = 0; } if (e.lungeT <= 0) { e.wind = 0; e.lungeT = 0; e.cd = 1.4; } return; }
    if (e.windT >= def.wind) {
      e.wind = 0; e.cd = 1.1;
      if (Math.abs(p.x - e.x) < def.reach * 1.3 && floorOf(p.y) === floorOf(e.y) && !p.climb) hurtPlayer(e.dmg, e);
      else if (p.climb && Math.abs(p.x - e.x) < def.reach && Math.abs(p.y - e.y) < 60) hurtPlayer(e.dmg, e);
    }
    return;
  }
  e.cd -= dt;
  const myR = r, gR = roomAt(goal.x, goal.y);
  let tx = null;
  if (def.fly) {
    // 水母：往你飄，靠近就自爆
    const dx = goal.x - e.x, dy = (goal.y - 40) - (e.y - 26);
    if (e.fuseT > 0) { e.fuseT += dt; if (e.fuseT >= def.fuse) jellyBoom(e); return; }
    if (Math.hypot(p.x - e.x, (p.y - 30) - (e.y - 26)) < 62 && !e.lure) { e.fuseT = .001; AU.at('click', e.x, e.y); return; }
    if (myR === gR) { tx = goal.x; }
    else {
      const ed = navNext(myR, gR, 'fly');
      if (ed && ed.lad) { if (Math.abs(e.x - ed.lad.x) < 8) { e.climb = { lad: ed.lad, dir: ed.dir }; return; } tx = ed.lad.x; }
      else if (ed && ed.door) { tx = ed.door.x + (ed.door.x > e.x ? 30 : -30); }
    }
    if (tx != null) { e.face = sgn(tx - e.x) || e.face; const bl = moveX(e, e.x + clamp(tx - e.x, -spd * dt, spd * dt), def.r); if (bl && bl !== 'wall') doorAttack(e, bl, dt); }
    e.walk += dt * 3;
    return;
  }
  if (myR === gR && floorOf(goal.y) === floorOf(e.y)) {
    tx = goal.x;
    if (e.lure && Math.abs(goal.x - e.x) < 30) { e.walk += dt; return; }
    if (!e.lure && Math.abs(p.x - e.x) < def.reach && !p.climb && e.cd <= 0) { e.wind = def.wind; e.windT = 0; e.face = sgn(p.x - e.x) || e.face; return; }
    if (!e.lure && p.climb && Math.abs(p.x - e.x) < def.reach && Math.abs(p.y - e.y) < 60 && e.cd <= 0) { e.wind = def.wind; e.windT = 0; return; }
  } else {
    const ed = navNext(myR, gR, e.type === 'eel' ? 'eel' : 'foe');
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
function doorAttack(e, d, dt) {
  if (d.state !== 'closed') return;
  e.atDoor = d;
  const mul = e.elite ? 2 : 1;
  d.hp -= e.def.door * mul * dt; d.hitT = .25; d.shake = 1;
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
  if (Math.hypot(p.x - e.x, (p.y - 30) - (e.y - 26)) < e.def.blast) hurtPlayer(e.dmg, e);
  for (const d of W.doors) if (d.state === 'closed' && Math.abs(d.x - e.x) < 60 && floorOf(d.y) === floorOf(e.y)) { d.hp -= e.def.door; d.hitT = .3; if (d.hp <= 0) breakDoor(d); }
}
function separateFoes() {
  const fs = W.foes;
  for (let i = 0; i < fs.length; i++) {
    const a = fs[i]; if (a.dead || a.climb) continue;
    for (let j = i + 1; j < fs.length; j++) {
      const b = fs[j]; if (b.dead || b.climb || a.def.fly !== b.def.fly) continue;
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

/* ---------- 獵手「聆」 ---------- */
const onMap = h => h && !h.dead && h.state !== 'away' && h.state !== 'venting' && h.state !== 'gone';
function hunterHear(p) {
  const h = W.hunter;
  if (!h || h.dead || h.state === 'gone' || h.state === 'flee' || h.state === 'stun' || h.state === 'attack' || h.state === 'drop') return;
  const mul = h.H.hear * (W.stage >= 2 ? 1.2 : 1) * (W.stage >= 4 ? 1.15 : 1);
  if (h.state === 'away') {
    if (h.awayCD > 0) return;
    if (p.r * mul < 300) return;
    h.heardAt = { x: p.x, y: p.y };
    h.awayT = Math.min(h.awayT, rand(1.5, 4));
    return;
  }
  if (h.state === 'venting') return;
  if (!heardBy(p, h.x, h.y - 120, mul)) return;
  h.tx = p.x; h.ty = p.y; h.heard = 1; h.alertT = 1.5;
  AU.at('growl', h.x, h.y, { vol: .8 });
  const near = Math.hypot(p.x - h.x, p.y - h.y) < 760;
  if (h.state === 'search' || h.state === 'leave' || h.state === 'hunt' || h.state === 'charge') {
    if (h.state === 'charge') return;
    h.state = near || p.src !== 'player' ? 'hunt' : 'search';
    h.searchT = 0;
  }
}
function stunHunter(h, t) { if (h.dead || h.state === 'flee' || h.state === 'gone') return; h.state = 'stun'; h.stunT = Math.max(h.stunT || 0, t); h.chargeT = 0; h.atkT = 0; h.atkPose = 0; h.mouth = 0; }
function hurtHunter(h, dmg, o) {
  if (h.dead || !onMap(h)) return;
  const st = PS();
  let d = dmg * st.dmg * st.hunter;
  if (o.type === 'elec') { d *= st.elec; h.stag += d * (W.P.passives.conduct >= 3 ? 2 : 1); }
  if (h.vuln > 0 || o.vuln) { d *= 1.3; if (o.vuln) h.vuln = o.vuln; }
  if (h.state === 'stun') d *= 1.5;
  let crit = false;
  if (o.crit && Math.random() < st.crit) { d *= st.critDmg; crit = true; }
  if (h === W.mother) { h.hp -= d; h.flash = 1; addNum(h, d, crit ? '#ffd25a' : '#ffb0b8', crit); if (h.hp <= 0) { h.hp = 0; h.dead = true; h.state = 'dead'; AU.play('shriek'); } return; }
  h.hp -= d; h.flash = 1; h.engage += d; W.dmgDealt += d;
  addNum(h, d, crit ? '#ffd25a' : o.type === 'elec' ? '#9ff4ff' : '#ffb0b8', crit);
  if (o.knock) { h.kx = (h.kx || 0) + (o.dir || 1) * o.knock * .3; }
  if (h.state === 'search' || h.state === 'leave') { h.state = 'hunt'; }
  h.tx = W.P.x; h.ty = W.P.y;
  if (h.stag >= h.hpMax * .07 && h.state !== 'stun') { h.stag = 0; stunHunter(h, 1.6); AU.at('growl', h.x, h.y); }
  if (h.hp <= 0) return hunterDie(h);
  if (h.engage >= h.hpMax * .25 && !h.enraged && h.state !== 'stun') {
    if (h.repelled >= 2) { h.enraged = true; h.engage = 0; banner('聆 被激怒了', '牠不會再逃了', ''); AU.at('shriek', h.x, h.y, { range: 2400 }); W.shake = Math.max(W.shake, 10); }
    else hunterFlee(h);
  }
}
function hunterFlee(h) {
  h.state = 'flee'; h.engage = 0; h.repelled++; W.obj.hunter = true;
  AU.at('shriek', h.x, h.y, { range: 2000 }); W.shake = Math.max(W.shake, 8);
  banner('聆 退走了', '牠記得痛', 'cy'); tip('repel', true);
}
function hunterDie(h) {
  h.dead = true; h.state = 'dead'; h.hp = 0; h.deadT = 0; W.obj.hunter = true; W.obj.hunterKill = true;
  AU.play('shriek'); W.shake = 18; W.hitstop = .25; W.slow = .35; setTimeout(() => { if (W) W.slow = 1; }, 900);
  W.pressure = Math.max(0, W.pressure - 10);
  banner('聆 倒下了', '整座站安靜了一下', 'gd'); tip('kill', true);
  spark(h.x, h.y - 120, 40, '#ff3b4e', 320);
  dropItem({ kind: 'relic', id: 'disc', rar: 5 }, h.x, h.y - 60);
  const bp = lockedWeapons()[0]; if (bp) dropItem({ kind: 'bp', id: bp, rar: 4 }, h.x + 30, h.y - 60);
  dropItem({ kind: 'loot', rar: 5 }, h.x - 30, h.y - 60);
  for (let k = 0; k < 8; k++) dropItem({ kind: 'orb', xp: 6 }, h.x, h.y - 80);
  G.stats.hunterKills++;
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
  if (!h || h.dead) { if (h && h.dead) h.deadT = (h.deadT || 0) + dt; return; }
  h.flash = Math.max(0, h.flash - dt * 6); h.alertT = Math.max(0, h.alertT - dt); h.vuln = Math.max(0, (h.vuln || 0) - dt);
  h.bashT = Math.max(0, (h.bashT || 0) - dt); h.lastX = h.curX; h.curX = h.x;
  h.stagT += dt; if (h.stagT > 3) { h.stag *= .5; h.stagT = 0; }
  if (h.awayCD > 0) h.awayCD -= dt;
  if (h.kx) { const k = h.kx * Math.min(1, dt * 8); moveX(h, h.x + k, 26); h.kx -= k; if (Math.abs(h.kx) < 1) h.kx = 0; }
  const H = h.H, frenzy = (W.stage >= 3 ? 1.12 : 1) * (h.enraged ? 1.12 : 1);
  switch (h.state) {
    case 'gone': return;
    case 'away': {
      h.awayT -= dt;
      if (h.hp < h.hpMax) h.hp = Math.min(h.hpMax, h.hp + h.hpMax * .003 * dt);
      if (h.awayT <= 0 && W.t > 8) {
        const tgt = h.heardAt || { x: p.x + rand(-500, 500), y: p.y };
        let v = pickVentArrive(tgt.x, tgt.y, !!h.heardAt);
        if (!v) { h.awayT = 10; return; }
        h.vent = v; h.state = 'venting'; h.ventT = 3.6 + (G.survivors.lin ? 1.5 : 0); h.tx = tgt.x; h.ty = tgt.y; h.heardAt = null;
        tip('vent');
      }
      return; }
    case 'venting': {
      h.ventT -= dt; h.vent.shake = 1;
      if (Math.random() < dt * 2.2) AU.at('vent', h.vent.x, h.vent.y, { range: 1300, vol: 1.1 });
      if (Math.random() < dt * 8) W.fx.push({ k: 'dust', x: h.vent.x + rand(-24, 24), y: h.vent.y + 14, vx: rand(-20, 20), vy: rand(10, 60), t: 0, life: 1.2 });
      if (h.ventT <= 0) {
        const r = W.rooms[h.vent.room];
        h.x = h.vent.x; h.y = h.vent.y + 20; h.state = 'drop'; h.dropT = 0; h.dropY = r.floorY; h.face = sgn(p.x - h.x) || 1;
        h.vent.shake = 0; h.engage = 0;
        AU.at('step', h.x, r.floorY, { range: 1400, vol: 1.3 });
        if (!h.seen) { h.seen = true; banner('聆', '牠看不見你。牠聽得見你。', ''); setTimeout(() => tip('hunterSeen'), 1500); }
      }
      return; }
    case 'drop': {
      h.dropT += dt; h.y = lerp(h.vent.y + 20, h.dropY, ease.inCubic(Math.min(1, h.dropT / .45)));
      if (h.dropT >= .45) { h.y = h.dropY; h.state = 'search'; h.searchT = 0; W.shake = Math.max(W.shake, roomAt(h.x, h.y) === roomAt(p.x, p.y) ? 7 : 2); AU.at('step', h.x, h.y, { vol: 1.4 }); }
      return; }
    case 'stun': {
      h.stunT -= dt; h.mouth = approach(h.mouth, 0, dt * 3);
      if (h.stunT <= 0) { h.state = 'hunt'; h.tx = p.x; h.ty = p.y; }
      return; }
    case 'flee': {
      const v = pickVentNear(h.x, h.y);
      if (!v) { h.state = 'away'; h.awayT = 45; return; }
      const mv = hunterGoTo(h, v.x, v.y + 100);
      hunterMove(h, mv, H.run * 1.15, dt);
      if (roomAt(h.x, h.y).i === v.room && Math.abs(h.x - v.x) < 26) { h.state = 'away'; h.awayT = 45 + rand(0, 15); h.awayCD = 40; AU.at('vent', v.x, v.y); v.shake = 1; }
      return; }
    case 'attack': {
      h.atkT += dt; h.atkPose = Math.min(1, h.atkT / .7); h.mouth = h.atkPose * .7;
      if (h.atkT >= .85 && !h.struck) {
        h.struck = true; AU.at('swipe', h.x, h.y);
        W.fx.push({ k: 'slash', x: h.x + h.face * 60, y: h.y - 70, face: h.face, t: 0, life: .25 });
        if (Math.abs(p.x - (h.x + h.face * 50)) < 82 && Math.abs(p.y - h.y) < 70) { hurtPlayer(H.dmg * (W.stage >= 3 ? 1.15 : 1) * (h.enraged ? 1.2 : 1), h); W.P.kx = h.face * 80; moveX(p, p.x + h.face * 40, PW); }
      }
      if (h.atkT >= 1.25) { h.state = 'hunt'; h.atkT = 0; h.atkPose = 0; h.struck = false; h.cd = 1.2; }
      return; }
    case 'charge': {
      h.chargeT += dt; h.mouth = Math.min(1, h.chargeT / 1.4);
      if (h.chargeT >= 1.4) {
        h.state = 'search'; h.shriekCD = rand(20, 28); h.mouth = 0;
        AU.at('shriek', h.x, h.y, { range: 2400, vol: 1.2 });
        W.fx.push({ k: 'ring', x: h.x, y: h.y - 130, r0: 30, r1: 470, t: 0, life: .7, col: '#ffffff', w: 6 });
        W.shake = Math.max(W.shake, 6);
        const c = soundCost()[roomAt(h.x, h.y).i][roomAt(p.x, p.y).i];
        if (Math.hypot(p.x - h.x, p.y - h.y) < 470 && c < 1) { h.state = 'hunt'; h.tx = p.x; h.ty = p.y; hurtPlayer(6, h); UI.flashScreen('rgba(255,255,255,.35)'); }
      }
      return; }
  }
  // search / hunt / leave
  h.cd -= dt; h.shriekCD -= dt;
  h.mouth = approach(h.mouth, 0, dt * 2);
  const sameFloor = floorOf(p.y) === floorOf(h.y) && !p.climb;
  const dP = Math.abs(p.x - h.x);
  // 安靜程度：0 一般、1 潛行移動、2 潛行靜止（牠擦身而過也不會發現）
  const quiet = p.stealth ? (p.moving ? 1 : 2) : 0;
  const touchR = [74, 46, 0][quiet];
  // 碰到你：直接鎖定
  if (sameFloor && dP < touchR && roomAt(p.x, p.y) === roomAt(h.x, h.y)) { h.tx = p.x; h.ty = p.y; if (h.state !== 'hunt') { h.state = 'hunt'; AU.at('growl', h.x, h.y); } }
  if (quiet === 2 && sameFloor && dP < 140 && roomAt(p.x, p.y) === roomAt(h.x, h.y) && !h.brushT) { h.brushT = 1; tip('holdStill'); }
  if (dP > 220) h.brushT = 0;
  const knows = quiet < 2 || Math.abs(p.x - h.tx) < 60 && floorOf(h.ty) === floorOf(p.y);
  if (h.state === 'hunt' && knows && sameFloor && dP < 92 && h.cd <= 0 && losClear(p.x, h.x, floorOf(p.y))) { h.state = 'attack'; h.atkT = 0; h.struck = false; h.face = sgn(p.x - h.x) || h.face; AU.at('growl', h.x, h.y, { vol: 1.3 }); return; }
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
  const spd = (h.state === 'hunt' ? H.run : H.walk) * frenzy;
  const mv = hunterGoTo(h, h.tx, h.ty);
  const arrived = roomAt(h.x, h.y) === roomAt(h.tx, h.ty) && Math.abs(h.x - h.tx) < 30;
  if (arrived) {
    h.moving = false; h.searchT += dt; h.turn = Math.sin(W.t * 1.6) * .9;
    if (h.state === 'hunt') { h.state = 'search'; h.searchT = 0; }
    if (h.searchT > 6.5) { h.state = 'leave'; h.leaveVent = null; h.leaveT = 0; }
    if (h.searchT > 1.2 && Math.random() < dt * .6) { const hr = roomAt(h.x, h.y); h.tx = clamp(h.x + rand(-140, 140), hr.x0 + 34, hr.x0 + RW - 34); h.ty = hr.floorY; }
  } else {
    if (!mv) { const v = pickVentNear(h.tx, h.ty); if (v) { h.vent = v; h.state = 'venting'; h.ventT = 2.4; } else { h.state = 'leave'; h.leaveVent = null; } return; }
    hunterMove(h, mv, spd, dt);
    // 卡住保護：原地推牆太久就當作到了
    const still = Math.abs(h.x - (h.lastX == null ? h.x + 1 : h.lastX)) < .4 && !h.climb && !(h.bashT > 0);
    h.stuckT = still ? (h.stuckT || 0) + dt : 0;
    if (h.stuckT > 2.2) { h.stuckT = 0; h.tx = h.x; h.ty = h.y; if (h.state === 'hunt') { h.state = 'search'; h.searchT = 0; } }
    h.turn = h.state === 'hunt' ? approach(h.turn, .95, dt * 3) : Math.sin(W.t * 1.2) * .7;
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
  h.walk += dt * spd / 22;
  h.stepT = (h.stepT || 0) - dt * spd / 90;
  if (h.stepT <= 0) { h.stepT = 1; AU.at('step', h.x, h.y, { vol: .9 }); }
  if (bl && bl !== 'wall' && bl.state === 'closed') {
    bl.hp -= h.H.door * dt; bl.hitT = .25; bl.shake = 1.5; h.bashT = .4;
    if (Math.random() < dt * 4) AU.at('door_hit', bl.x, bl.y, { vol: 1.2, range: 1400 });
    if (bl.hp <= 0) breakDoor(bl);
  }
}

/* ---------- 波次 ---------- */
function updateWaves(dt) {
  if (W.dock.called || W.ending) { return; }
  W.waveT -= dt;
  if (W.waveT <= 6 && !W.warned) {
    W.warned = true;
    const pts = waveSpawnPoints(W.waveN >= 3 ? 2 : 1);
    W.warns = pts.map(pt => Object.assign(pt, { t: 6 }));
    AU.play('alarm', { vol: .7 });
    if (W.waveN === 0) tip('wave');
  }
  for (const w of W.warns) w.t -= dt;
  if (W.waveT <= 0) {
    W.waveT = W.S.wave.int * (1 - .32 * W.pressure / 100);
    const budget = W.S.wave.budget + W.waveN * W.S.wave.grow * .6 + W.pressure / 100 * W.S.wave.budget * .6;
    spawnWave(W.warns, budget, W.waveN >= 3);
    W.waveN++; W.warned = false; W.warns = [];
  }
}
function waveSpawnPoints(n) {
  const pr = roomAt(W.P.x, W.P.y), D = soundCost();
  const cands = W.rooms.filter(r => !r.collapsed && r.i !== pr.i && r.special !== 'start' && D[pr.i][r.i] >= 1 && D[pr.i][r.i] <= 4.5);
  const pool = cands.length ? cands : W.rooms.filter(r => !r.collapsed && r.i !== pr.i);
  const out = [];
  for (const r of RNG((Math.random() * 1e9) | 0).shuffle(pool.slice())) {
    if (out.length >= n) break;
    const hull = r.c === 0 || r.c === W.C - 1;
    const x = r.vent && Math.random() < .5 ? r.vent.x : hull ? (r.c === 0 ? r.x0 + 40 : r.x0 + RW - 40) : r.x0 + rand(60, RW - 60);
    out.push({ room: r.i, x, y: r.floorY, vent: r.vent && x === r.vent.x });
  }
  return out;
}
function spawnWave(pts, budget, elite) {
  if (!pts.length) return;
  const alive = W.foes.filter(e => !e.dead).length;
  let room = Math.max(0, 22 - alive);
  let k = 0, eliteDone = !elite;
  while (budget > 0 && room > 0) {
    const pt = pts[k++ % pts.length], r = W.rooms[pt.room];
    const opts = [['iso', 5]];
    if (W.waveN >= 1) opts.push(['jelly', 3]);
    if (W.waveN >= 2) opts.push(['crab', 1.6]);
    if (W.waveN >= 3 || W.si >= 2) opts.push(['husk', .9]);
    if (r.water > .4) opts.push(['eel', 5]);
    let s = 0; for (const o of opts) s += o[1];
    let x = Math.random() * s, type = 'iso'; for (const o of opts) { x -= o[1]; if (x <= 0) { type = o[0]; break; } }
    const e = spawnFoe(type, pt.x + rand(-20, 20), pt.y, true, !eliteDone && type !== 'jelly');
    if (!eliteDone && type !== 'jelly') eliteDone = true;
    if (FOES[type].fly) e.y = pt.y;
    budget -= FOES[type].cost * (e.elite ? 3 : 1); room--;
    for (let q = 0; q < 6; q++) W.fx.push({ k: 'debris', x: pt.x + rand(-14, 14), y: pt.y - rand(10, 80), vx: rand(-120, 120), vy: rand(-200, -20), t: 0, life: rand(.4, .8), rot: rand(0, 6), col: '#3a474e' });
  }
  for (const pt of pts) { AU.at('breach', pt.x, pt.y, { vol: .6, range: 1200 }); if (pt.vent) W.rooms[pt.room].vent.shake = 1; }
}

/* ---------- 深壓 ---------- */
const STAGES = [{ at: 0, name: '平靜', col: '#5fe7ff' }, { at: 30, name: '滲漏', col: '#9fe0ff' }, { at: 60, name: '擠壓', col: '#ffb03a' }, { at: 85, name: '結構警報', col: '#ff7a45' }, { at: 100, name: '崩潰', col: '#ff4d5e' }];
function updatePressure(dt) {
  if (W.stage < 4) W.pressure = Math.min(100, W.pressure + dt / W.S.T * 100);
  let st = 0; for (let k = 0; k < STAGES.length; k++) if (W.pressure >= STAGES[k].at) st = k;
  if (st > W.stage) {
    W.stage = st;
    if (st === 1) { tip('p30', true); }
    if (st === 2) { tip('p60', true); banner('深壓 60%', '牠的聽力變好了', ''); killLights(.25); }
    if (st === 3) { tip('p85', true); banner('結構警報', '去撤離塢', ''); killLights(.35); AU.play('alarm'); }
    if (st === 4) { tip('p100', true); banner('崩潰', '站體正在塌陷', ''); W.collapseT = 95; AU.play('alarm'); }
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
  if (r === pr) tip('breach');
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
    if (up.water > .12 && dn.water < 1) { const fl = Math.min(up.water - .1, .12 * up.water * dt); up.water -= fl; dn.water = Math.min(1, dn.water + fl * .9); }
  }
  // 水裡長出鞭鰻
  W.eelT = (W.eelT || 12) - dt;
  if (W.eelT <= 0) {
    W.eelT = 14;
    const wet = W.rooms.filter(r => r.water > .55 && !r.collapsed);
    const eels = W.foes.filter(e => e.type === 'eel' && !e.dead).length;
    if (wet.length && eels < 4 && W.stage >= 1) { const r = pick(wet); spawnFoe('eel', r.x0 + rand(60, RW - 60), r.floorY, true); }
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
  if (it.kind === 'orb') { it.vx = rand(-140, 140); it.vy = rand(-200, -60); }
  W.items.push(it);
  return it;
}
function updateItems(dt) {
  const p = W.P, st = PS(), keep = [];
  for (const it of W.items) {
    it.t += dt;
    const d = Math.hypot(p.x - it.x, (p.y - 34) - it.y);
    const magnet = it.kind === 'orb' ? st.magnet * 1.6 : st.magnet;
    if (it.t > .35 && (d < magnet || it.pull) && !p.climb && W.state === 'play') {
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
function pickup(it) {
  const p = W.P;
  switch (it.kind) {
    case 'orb': gainXP(it.xp || 1); AU.play('xp', { k: p.lvl }); return;
    case 'med': p.med++; toast('醫療包 ＋1', '#5fe39a'); break;
    case 'battery': p.batteries++; toast('電池 ＋1', '#ffcf3a'); break;
    case 'decoy': p.decoys++; toast('聲波誘餌 ＋1', '#ffcf3a'); break;
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
    case 'bp': W.bpsGot.push(it.id); toast(`藍圖：${WEAPONS[it.id].name}`, RAR[4].col); banner('武器藍圖', WEAPONS[it.id].name, 'gd'); break;
  }
  AU.play('pickup');
}
function gainXP(n) {
  const p = W.P;
  p.xp += n * PS().xp;
  while (p.xp >= p.xpNeed) { p.xp -= p.xpNeed; p.lvl++; p.xpNeed = xpNeed(p.lvl); W.lvQ++; }
}
function lockedWeapons() { return WEAPON_ORDER.filter(id => !G.weapons.includes(id) && !W.bpsGot.includes(id)); }
function spotLoot(sp) {
  const r = sp.rar, x = sp.x, y = sp.y - 40;
  AU.play('loot', { r });
  if (r >= 3) W.fx.push({ k: 'beam', x, y: sp.y, col: RAR[r].col, t: 0, life: 1.6 });
  spark(x, y, 6 + r * 3, RAR[r].col, 160);
  if (sp.kind === 'key') { dropItem({ kind: 'key', rar: 3 }, x, y); return; }
  if (sp.kind === 'cache') { dropItem({ kind: 'cache', rar: 3 }, x, y); return; }
  if (sp.kind === 'log') { getLog(sp.log); dropItem({ kind: 'loot', rar: 1 }, x, y); return; }
  dropItem({ kind: 'loot', rar: r }, x, y);
  if (r >= 1 && Math.random() < .5) dropItem({ kind: 'loot', rar: Math.max(0, r - 1) }, x, y);
  if (Math.random() < .17) dropItem({ kind: 'battery' }, x, y);
  if (Math.random() < .1) dropItem({ kind: 'med' }, x, y);
  if (Math.random() < .07) dropItem({ kind: 'decoy' }, x, y);
  for (let k = 0; k < 2 + r; k++) dropItem({ kind: 'orb', xp: 1 }, x, y);
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
function interactables() {
  const p = W.P, r = roomAt(p.x, p.y), f = floorOf(p.y), out = [];
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
    case 'open': setDoor(it.d, true); break;
    case 'close': setDoor(it.d, false); break;
    case 'unlock': it.d.state = 'open'; it.d.lock = null; it.d.hp = 100; it.d.hpMax = 100; markDoors(); AU.play('ui2'); AU.at('door_open', it.d.x, it.d.y); toast('鑰卡通過'); break;
    case 'cell': { const n = Math.min(p.batteries, 3 - it.pod.cells); it.pod.cells += n; p.batteries -= n; AU.play('ui2'); toast(`逃生艙電池 ${it.pod.cells}/3`, '#ffcf3a'); tip('pod'); break; }
    case 'launch': UI.confirm('啟動逃生艙？', '只能帶走你身上的東西。救出的人帶不走，這一區也不算通關。', '發射', () => { AU.play('pod'); endRun('pod'); }); break;
    case 'call': callDock(); break;
    case 'board': endRun('dock'); break;
    case 'deep': startFinal(); break;
  }
}
function cancelChannel() { if (W && W.P.channel) { W.P.channel = null; } }
function updateInteract(dt) {
  const p = W.P, st = PS();
  if (W.state !== 'play') return;
  // 情境動作進度
  if (p.channel) {
    const c = p.channel; c.t += dt * (c.it.k === 'weld' || c.it.k === 'patch' ? st.weld : 1);
    if (c.it.k === 'weld' || c.it.k === 'patch') { if (Math.random() < dt * 14) spark(c.it.d ? c.it.d.x : p.x + p.face * 30, p.y - 50, 1, '#ffd28a', 120); AU.play('weld'); }
    if (c.t >= c.it.dur) {
      const it = c.it; p.channel = null;
      if (it.k === 'rescue') rescue(it.s);
      if (it.k === 'weld') { it.d.state = 'closed'; it.d.hp = 45; markDoors(); AU.at('door_close', it.d.x, it.d.y); toast('艙門焊上了'); }
      if (it.k === 'patch') { const r = roomAt(p.x, p.y); r.breach = null; AU.play('patched'); toast('破口補好了'); }
    }
    p.searching = null; p.reinforcing = null;
    return;
  }
  p.searching = null; p.reinforcing = null;
  if (p.moving || p.climb) return;
  const r = roomAt(p.x, p.y);
  // 自動搜索
  let sp = null, bd = 30;
  for (const s of r.spots) { if (s.done) continue; const d = Math.abs(s.x - p.x); if (d < bd) { bd = d; sp = s; } }
  if (sp) {
    sp.t += dt * st.search; p.searching = sp;
    AU.play('tick', { vol: .7 });
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
}
function throwDecoy() {
  const p = W.P;
  if (W.state !== 'play' || p.decoys <= 0 || p.decoyT > 0 || p.climb) { AU.play('deny'); return; }
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

/* ---------- 撤離 ---------- */
function callDock() {
  const D = W.dock; D.called = true;
  D.t = (W.ending ? 28 : 40 + (W.S.final ? 5 : 0)) * (survPerk('dock') ? .8 : 1);
  D.waveT = 5;
  const r = W.rooms[D.room];
  emitNoise(r.x0 + RW / 2, r.floorY - 40, 1500, 'dock');
  AU.play('sub'); AU.play('alarm'); tip('dock', true);
  banner('潛艇放下去了', `撐住 ${Math.round(D.t)} 秒`, 'cy');
  const h = W.hunter; if (h && !h.dead && h.state === 'away' && !W.ending) { h.awayT = Math.min(h.awayT, 8); h.heardAt = { x: r.x0 + RW / 2, y: r.floorY }; }
}
function updateDock(dt) {
  const D = W.dock;
  if (!D.called) return;
  if (!D.arrived) {
    D.t -= dt;
    D.waveT -= dt;
    if (D.waveT <= 0) {
      D.waveT = 8.5;
      const r = W.rooms[D.room], pts = waveSpawnPoints(2).filter(p => p.room !== D.room);
      spawnWave(pts.length ? pts : waveSpawnPoints(1), 3 + W.si * .8 + W.pressure / 100 * 4, false);
    }
    if (D.t <= 0) { D.arrived = true; D.rise = 0; AU.play('sub'); banner('潛艇到了', '走到月池登艇', 'cy'); }
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
  if (W.ending === 'C') {
    const dr = W.rooms[W.M.deep];
    const m = W.mother = Object.assign({}, W.hunter, { isHunter: true, mother: true, state: 'hunt', x: dr.x0 + RW - 60, y: dr.floorY, hp: 9000, hpMax: 9000, dead: false, H: { walk: 90, run: 150, dmg: 48, door: 260, hear: 2, shriek: false }, def: { r: 44, h: 260 }, cd: 2, face: -1, lureT: 26, engage: 0, flash: 0 });
    W.fx.push({ k: 'flashscr', t: 0, life: .5 }); W.shake = 22; AU.play('shriek');
    for (let k = 0; k < 30; k++) W.fx.push({ k: 'debris', x: m.x + rand(-40, 40), y: m.y - rand(20, 200), vx: rand(-300, 300), vy: rand(-300, -60), t: 0, life: rand(.6, 1.4), rot: rand(0, 6), col: '#3a474e' });
    dr.breach = { x: dr.x0 + RW - 30, y: dr.floorY - 120, rate: 1 / 12, t: 0 };
  }
}
function updateMother(dt) {
  const m = W.mother, p = W.P;
  if (m.dead) return;
  m.flash = Math.max(0, m.flash - dt * 6); m.cd -= dt;
  m.lureT -= dt;
  if (m.state === 'lured') { if (m.lureT <= 0) { m.state = 'hunt'; m.lureT = 22; banner('牠回來了', '', ''); } m.x = -999; return; }
  if (m.lureT <= 0) { m.state = 'lured'; m.lureT = 16; W.subs.push({ who: '林汐（無線電）', text: '牠往我這邊來了……快走！', kind: 'radio', dur: 3 }); AU.play('motif', { vol: .9 }); return; }
  if (m.state === 'attack') {
    m.atkT += dt; m.atkPose = Math.min(1, m.atkT / .8);
    if (m.atkT >= .95 && !m.struck) { m.struck = true; AU.play('swipe'); W.shake = 12; if (Math.abs(p.x - (m.x + m.face * 80)) < 120 && Math.abs(p.y - m.y) < 90) hurtPlayer(m.H.dmg, m); }
    if (m.atkT >= 1.4) { m.state = 'hunt'; m.atkT = 0; m.atkPose = 0; m.struck = false; m.cd = 1.4; }
    return;
  }
  m.tx = p.x; m.ty = p.y;
  if (floorOf(p.y) === floorOf(m.y) && Math.abs(p.x - m.x) < 120 && m.cd <= 0) { m.state = 'attack'; m.atkT = 0; m.face = sgn(p.x - m.x); return; }
  const mv = hunterGoTo(m, m.tx, m.ty);
  if (!mv) return;
  if (m.climb) { const L = m.climb.lad, ty = m.climb.dir > 0 ? L.y2 : L.y1; m.x = L.x; m.y = approach(m.y, ty, 120 * dt); if (m.y === ty) m.climb = null; return; }
  if (mv.lad) { if (Math.abs(m.x - mv.lad.x) < 10) { m.climb = { lad: mv.lad, dir: mv.dir }; return; } mv.x = mv.lad.x; }
  const dx = mv.x - m.x; m.moving = Math.abs(dx) > 4; if (!m.moving) return;
  m.face = sgn(dx);
  const bl = moveX(m, m.x + clamp(dx, -m.H.run * dt, m.H.run * dt), 40); m.walk += dt * 4;
  if (Math.random() < dt * 1.6) { AU.at('step', m.x, m.y, { vol: 1.6 }); W.shake = Math.max(W.shake, 3); }
  if (bl && bl !== 'wall' && bl.state === 'closed') { bl.hp -= m.H.door * dt; bl.shake = 2; if (bl.hp <= 0) breakDoor(bl); }
}

/* ---------- 心率 ---------- */
function updateHeart(dt) {
  const h = W.hunter, p = W.P, st = PS();
  let prox = 0;
  if (onMap(h)) { const d = Math.hypot(h.x - p.x, (h.y - p.y) * 1.4); prox = clamp(1 - d / (900 * st.sonar), 0, 1); if (h.state === 'hunt' || h.state === 'attack') prox = Math.min(1, prox + .25); }
  else if (h && h.state === 'venting') { const d = Math.hypot(h.vent.x - p.x, (h.vent.y - p.y) * 1.4); prox = clamp(1 - d / (1100 * st.sonar), 0, 1) * .8; }
  if (W.mother && W.mother.state !== 'lured' && !W.mother.dead) prox = Math.max(prox, clamp(1 - Math.hypot(W.mother.x - p.x, W.mother.y - p.y) / 1000, 0, 1));
  W.heartProx = lerp(W.heartProx, prox, Math.min(1, dt * 2));
  const target = 72 + W.heartProx * 70 + W.pressure * .12 + (p.hp < p.hpMax * .35 ? 14 : 0) + (W.dock.called && !W.dock.arrived ? 16 : 0);
  W.heart = lerp(W.heart, target, Math.min(1, dt * .8));
  W.heartT -= dt;
  if (W.heartT <= 0) { W.heartT = 60 / W.heart; if (W.heartProx > .18 || p.hp < p.hpMax * .3) AU.play('heart', { vol: .25 + W.heartProx * .8 }); }
  // 配樂張力
  let tension = W.heartProx * .9 + W.pressure / 260;
  if (W.foes.some(e => !e.dead && !e.sleep && !e.idle && Math.abs(e.x - p.x) < 500 && floorOf(e.y) === floorOf(p.y))) tension += .3;
  if (W.dock.called && !W.dock.arrived) tension += .4;
  AU.tickMusic(dt, clamp(tension, 0, 1));
  AU.tickAmb(dt);
}

/* ---------- 特效 ---------- */
function spark(x, y, n, col, sp) { for (let k = 0; k < n; k++) { const a = rand(0, TAU), s = rand(.3, 1) * sp; W.fx.push({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0, life: rand(.25, .55), col }); } }
function flashAt(x, y, col, r) { W.fx.push({ k: 'light', x, y, col, r, t: 0, life: .07 }); }
function updateFX(dt) {
  W.shake = Math.max(0, W.shake - dt * 30);
  const keep = [];
  for (const f of W.fx) {
    f.t += dt;
    if (f.vx != null) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.k === 'spark' || f.k === 'debris' || f.k === 'shell') f.vy += 700 * dt; if (f.k === 'flame') { f.vy -= 120 * dt; f.vx *= .96; } }
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
  const urgent = /^(holdStill|shriek|vent|lowhp|p85|p100)$/.test(key);
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
  const sum = { kind, ok, si, endless: !!W.S.endless, tier: W.tier, credits: 0, loot: W.bag.slice(), rescued: [], stars: [false, false, false], newStars: [], unlocked: [], relics: [], bps: [], logs: W.logsGot.slice(), kills: W.kills, time: W.t, lvl: W.P.lvl, bonus: 0, ending: W.ending };
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
    const stars = [kind === 'dock', kind === 'dock' && W.obj.rescued >= W.obj.survivors, W.obj.hunter];
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
