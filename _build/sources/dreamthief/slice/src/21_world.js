'use strict';
/* ====== 試玩關：世界與規則 ====== */
let W = null;
let G = { settings: { sfx: true, music: true } };

/* ---------- 關卡 ---------- */
function svBuildLevel(def) {
  const L = { floors: [], rooms: [], doors: [], stairs: [], spots: [], cracks: [], props: [] };
  def.floors.forEach((fd, f) => {
    const F = { i: f, y: FY(f), x0: 0, x1: fd.x1, label: fd.label, name: fd.name, roof: !!fd.roof, rooms: [], doors: [] };
    fd.rooms.forEach(rd => {
      const r = Object.assign({}, rd, { f, idx: L.rooms.length, entered: false, seen: false, lamps: rd.lamps || [], props: [], flick: Math.random() * 10 });
      (rd.props || []).forEach(pd => {
        const p = Object.assign({}, pd, { f, room: r, open: 0, shake: 0 });
        if (pd.spot) { const s = { id: L.spots.length, f, x: pd.x, room: r, prop: p, rings: pd.spot.slice(), i: 0, prog: 0, special: pd.special || {}, done: false, pop: 0 }; p.spot = s; L.spots.push(s); }
        r.props.push(p); L.props.push(p);
      });
      if (rd.crack != null) L.cracks.push({ f, x: rd.crack, room: r, active: f === 0, pulse: 0, open: 0 });
      F.rooms.push(r); L.rooms.push(r);
    });
    fd.doors.forEach(dd => {
      const D = DOORS[dd.type];
      const d = { id: L.doors.length, f, x: dd.x, type: dd.type, base: D.hp, max: D.hp, hp: D.hp, lock: dd.lock ? Object.assign({}, dd.lock) : null, wall: dd.type === 'wall',
        broken: false, prog: 0, shake: 0, open: 0, hitT: 0, repT: 0, said: false };
      F.doors.push(d); L.doors.push(d);
    });
    F.doors.sort((a, b) => a.x - b.x);
    L.floors.push(F);
  });
  def.stairs.forEach(s => L.stairs.push(Object.assign({}, s)));
  return L;
}
const FL = f => W.L.floors[f];
function roomAt(f, x) {
  const F = W.L.floors[f]; if (!F) return null;
  for (const r of F.rooms) if (x >= r.x0 && x < r.x1) return r;
  return x < F.rooms[0].x0 ? F.rooms[0] : F.rooms[F.rooms.length - 1];
}
function stairAt(f, x) { for (const s of W.L.stairs) if (f >= s.f0 && f <= s.f1 && x >= s.x0 - 2 && x <= s.x1 + 2) return s; return null; }
const hardDoor = d => d.wall || !!d.lock;
const blocksFoe = d => d.wall || !!d.lock || (!d.broken && d.hp > 0);
/* xa → xb 之間（不含端點）第一扇符合條件的門 */
function doorBetween(f, xa, xb, pred) {
  const F = W.L.floors[f]; if (!F) return null;
  let best = null;
  const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
  for (const d of F.doors) if (d.x > lo && d.x < hi && pred(d)) { if (!best || Math.abs(d.x - xa) < Math.abs(best.x - xa)) best = d; }
  return best;
}
function nearestDoor(f, x, r) { const F = W.L.floors[f]; let best = null, bd = r; if (!F) return null; for (const d of F.doors) { if (d.wall) continue; const dd = Math.abs(d.x - x); if (dd < bd) { bd = dd; best = d; } } return best; }

/* ---------- 走路的路線（夢魘找人用） ---------- */
function segOf(f, x) { const F = W.L.floors[f]; let s = 0; for (const d of F.doors) if (hardDoor(d) && d.x <= x) s++; return s; }
function svEdges(f, sg) {
  const out = [];
  for (const s of W.L.stairs) {
    const cx = (s.x0 + s.x1) / 2;
    if (f < s.f0 || f > s.f1 || segOf(f, cx) !== sg) continue;
    if (f < s.f1) out.push({ f: f + 1, sg: segOf(f + 1, cx), s, up: true, x: cx });
    if (f > s.f0) out.push({ f: f - 1, sg: segOf(f - 1, cx), s, up: false, x: cx });
  }
  return out;
}
const SAME = { same: true };
function svRoute(f0, x0, f1, x1) {
  const a = f0 + ':' + segOf(f0, x0), b = f1 + ':' + segOf(f1, x1);
  if (a === b) return SAME;
  const prev = new Map([[a, null]]), q = [a];
  while (q.length) {
    const k = q.shift(); if (k === b) break;
    const [f, sg] = k.split(':').map(Number);
    for (const e of svEdges(f, sg)) { const kk = e.f + ':' + e.sg; if (!prev.has(kk)) { prev.set(kk, { from: k, e }); q.push(kk); } }
  }
  if (!prev.has(b)) return null;
  let k = b, st = prev.get(k);
  while (st && st.from !== a) { k = st.from; st = prev.get(k); }
  return st ? st.e : null;
}

/* ---------- 樓梯 ---------- */
/* 第 k 段樓梯連接 k 樓和 k+1 樓；偶數段由左往右爬 */
function flightX(s, k, top) { const l = s.x0 + 30, r = s.x1 - 30, ltr = k % 2 === 0; return top ? (ltr ? r : l) : (ltr ? l : r); }
function startClimb(o, s, up) {
  const k = up ? o.f : o.f - 1;
  o.climb = { s, up, k, sx: flightX(s, k, !up), ex: flightX(s, k, up), from: o.f, to: up ? o.f + 1 : o.f - 1, ph: 0, t: 0 };
}
function updateClimb(o, dt, spd, dur) {
  const c = o.climb;
  if (c.ph === 0) {
    const dx = c.sx - o.x;
    if (Math.abs(dx) < 5) { c.ph = 1; c.t = 0; }
    else { o.x += Math.sign(dx) * Math.min(Math.abs(dx), spd * dt); o.face = dx > 0 ? 1 : -1; }
    o.y = FY(c.from); o.moving = true; return false;
  }
  c.t += dt / dur;
  const k = Math.min(1, c.t);
  o.x = lerp(c.sx, c.ex, k); o.y = lerp(FY(c.from), FY(c.to), smooth(k)); o.face = c.ex > c.sx ? 1 : -1; o.moving = true;
  if (k >= 1) { o.f = c.to; o.y = FY(o.f); o.climb = null; return true; }
  return false;
}

/* ---------- 開局 ---------- */
function svNewRun() {
  const L = svBuildLevel(SV_LEVEL);
  W = {
    L, ch: CH[0], chi: 0, beat: 0, t: 0, players: [], foes: [], bullets: [], ebul: [], picks: [], fx: [], tele: [], pools: [], planes: [],
    wake: 0, lvl: 0, wave: { n: 0, state: 'wait', t: 13, age: 0, queue: [], spawnT: 0 },
    coins: 0, keys: 0, parts: 0, candies: 2, bag: [], cap: 10, pocket: null,
    xp: 0, xpLvl: 1, tools: {}, ups: {}, st: null, choices: 0, choiceQ: [],
    boss: null, bossDead: false, bellSeal: false, extract: null, holdT: 0, out: false, result: null,
    survivors: SV_LEVEL.survivors.map(s => Object.assign({}, s, { state: 'wait', prog: 0, y: FY(s.f), face: -1, walk: 0, climb: null, moving: false, anim: Math.random() * 9 })),
    usedNames: new Set(), visited: [true, false, false, false], said: {}, prompt: null,
    stats: { kills: 0, waves: 0, rooms: 0, maxWake: 0, elites: 0 },
    shake: 0, hitstop: 0, slowmo: 0, watchLit: 0,
  };
  svStats();
  const p = makeSvPlayer(); W.players.push(p);
  for (const el of SV_LEVEL.elites) addSvFoe(el.type, el.f, el.x, { guard: roomAt(el.f, el.x), spawn: 0 });
  const r0 = roomAt(p.f, p.x); r0.entered = r0.seen = true;
  return W;
}
function makeSvPlayer() {
  const st = W.st;
  return { id: 0, x: SV_LEVEL.start.x, y: FY(SV_LEVEL.start.f), f: SV_LEVEL.start.f, vx: 0, face: 1, aim: 0, walk: 0, spd: 0,
    hp: st.hpMax, hpMax: st.hpMax, inv: 0, hurt: 0, wpn: { id: 'revolver', recoil: 0, ammo: st.mag, reloadT: 0, cd: 0, idle: 0, flash: 0 },
    st: {}, bladeA: 0, mirrorT: 0, carry: null, dashCd: 0, dashT: 0, dashDir: 1, climb: null, still: 0, doorT: 0,
    input: { mx: 0, my: 0 }, state: 'alive', room: null, moving: false };
}
function svStats() {
  const u = k => W.ups[k] || 0, old = W.st;
  W.st = {
    dmg: 16 * (1 + .18 * u('power')), interval: .34 / (1 + .12 * u('rate')), multi: 1 + u('multi'), mag: 8 + 4 * u('mag'),
    reload: 1.2 * Math.pow(.78, u('reload')), pierce: u('pierce'), crit: .06 + .08 * u('crit'),
    hpMax: 120 + 25 * u('vigor'), speed: 205 * (1 + .1 * u('swift')), dashCd: 2.3 * (1 - .1 * u('swift')),
    search: 1 + .25 * u('hands'), repair: 70 * (1 + .6 * u('carpenter')), doorMul: 1 + .3 * u('carpenter'), magnet: 150 * (1 + .6 * u('magnet')),
  };
  if (old && old.doorMul !== W.st.doorMul) for (const d of W.L.doors) if (!d.wall) { const k = d.hp / d.max; d.max = d.base * W.st.doorMul; d.hp = d.max * k; }
  const p = W.players && W.players[0];
  if (p) { const add = W.st.hpMax - p.hpMax; p.hpMax = W.st.hpMax; if (add > 0) p.hp = Math.min(p.hpMax, p.hp + add); }
}

/* ---------- 主更新 ---------- */
function svStep(dt) {
  if (!W || W.out) return;
  if (W.slowmo > 0) { W.slowmo -= dt; dt *= .35; }
  if (W.hitstop > 0) { W.hitstop -= dt; return; }
  W.t += dt;
  const p = W.players[0];
  svUpdatePlayer(p, dt);
  for (const e of W.foes) svUpdateFoe(e, dt);
  if (W.boss) svUpdateBoss(W.boss, dt);
  svSeparate();
  svUpdateTools(p, dt);
  svUpdateBullets(dt);
  svUpdatePools(dt);
  svUpdatePicks(p, dt);
  svUpdateSurvivors(dt);
  svUpdateWaves(dt);
  svUpdateWake(dt);
  svUpdateExtract(p, dt);
  svUpdateFx(dt);
  for (const d of W.L.doors) { d.shake = Math.max(0, d.shake - dt); d.hitT = Math.max(0, d.hitT - dt); const near = d.f === p.f && Math.abs(d.x - p.x) < 34 && !d.lock && !d.wall; d.open = approach(d.open, near ? 1 : 0, dt * 6); }
  for (const c of W.L.cracks) c.pulse = Math.max(0, c.pulse - dt);
  for (const s of W.L.spots) s.pop = Math.max(0, s.pop - dt);
  W.foes = W.foes.filter(e => !e.dead || (e.deadT -= dt) > 0);
  W.shake = Math.max(0, W.shake - dt * 18);
}

/* ---------- 玩家 ---------- */
function svUpdatePlayer(p, dt) {
  if (p.state !== 'alive') return;
  const st = W.st;
  p.inv = Math.max(0, p.inv - dt); p.hurt = Math.max(0, p.hurt - dt); p.dashCd = Math.max(0, p.dashCd - dt);
  p.wpn.recoil = Math.max(0, p.wpn.recoil - dt * 7); p.wpn.flash = Math.max(0, p.wpn.flash - dt);
  const inp = p.input;
  p.moving = false;
  if (p.climb) {
    updateClimb(p, dt, st.speed * 1.25, .6);
    p.spd = 150; p.walk += dt * 3.2; p.vx = 0;
  } else if (p.dashT > 0) {
    p.dashT -= dt; svMoveX(p, p.dashDir * 900 * dt); p.spd = 400; p.moving = true;
    if (Math.random() < .7) W.fx.push({ k: 'after', x: p.x, y: p.y, f: p.face, t: 0, life: .22 });
  } else {
    const want = Math.abs(inp.mx) > .12 ? clamp(inp.mx / .7, -1, 1) * st.speed : 0;
    p.vx = approach(p.vx, want, st.speed * dt * (want ? 9 : 12));
    if (Math.abs(p.vx) > 2) { svMoveX(p, p.vx * dt); p.moving = Math.abs(p.vx) > 25; }
    p.spd = Math.abs(p.vx);
    if (p.moving) { p.walk += dt * Math.abs(p.vx) / 62; if (!p.target || p.wpn.idle > .25) p.face = p.vx > 0 ? 1 : -1; }
    // 樓梯
    const s = stairAt(p.f, p.x);
    if (s && Math.abs(inp.my) > .55 && Math.abs(inp.my) > Math.abs(inp.mx) * .9) svClimb(p, inp.my < 0);
  }
  // 進房間
  if (!p.climb) {
    const r = roomAt(p.f, p.x);
    if (r !== p.room) {
      p.room = r;
      if (!r.entered) { r.entered = r.seen = true; if (r.style !== 'stair') { W.stats.rooms++; svAddWake(1.5); W.fx.push({ k: 'roomlbl', r, t: 0, life: 2.4 }); } }
      if (!W.visited[p.f]) { W.visited[p.f] = true; if (p.f === 3) sayList(SV_RADIO.roof); }
    }
  }
  if (!p.climb) { svDoorWork(p, dt); svSearchWork(p, dt); svRescueWork(p, dt); }
  svUpdateGun(p, dt);
  // 互動鈕
  p.act = null;
  if (!p.climb && p.f === SV_LEVEL.bell.f && Math.abs(p.x - SV_LEVEL.bell.x) < 90 && !W.extract) p.act = W.bellSeal ? { k: 'sealed', label: '鐘被封住' } : { k: 'bell', label: '敲鐘' };
}
function svClimb(p, up) {
  if (p.climb || p.dashT > 0) return false;
  const s = stairAt(p.f, p.x); if (!s) return false;
  if (up && p.f < s.f1) { startClimb(p, s, true); return true; }
  if (!up && p.f > s.f0) { startClimb(p, s, false); return true; }
  return false;
}
function svMoveX(o, dx) {
  const F = FL(o.f), nx = clamp(o.x + dx, F.x0 + 18, F.x1 - 18);
  const d = doorBetween(o.f, o.x, nx + Math.sign(dx) * 14, hardDoor);
  if (d) { o.x = d.x - Math.sign(dx) * 15; if (o.vx) o.vx = 0; return false; }
  o.x = nx; return true;
}
function svDash(p) {
  if (p.state !== 'alive' || p.dashCd > 0 || p.climb || W.out) return;
  p.dashDir = Math.abs(p.input.mx) > .15 ? Math.sign(p.input.mx) : p.face;
  p.dashT = .19; p.dashCd = W.st.dashCd; p.inv = Math.max(p.inv, .32); AU.sfx('dash');
}
function svCandy(p) {
  if (W.candies <= 0 || p.hp >= p.hpMax || W.out) return;
  W.candies--; p.hp = Math.min(p.hpMax, p.hp + 50); AU.sfx('candy');
  W.fx.push({ k: 'heal', x: p.x, y: p.y, t: 0, life: .8 });
}

/* 門：站在旁邊就修；上鎖的站著就開 */
function svDoorWork(p, dt) {
  const d = nearestDoor(p.f, p.x, 54);
  if (!d || Math.abs(p.vx) > 70 || p.dashT > 0) { p.doorT = 0; if (d) d.prog = Math.max(0, d.prog - dt); return; }
  p.doorT += dt;
  if (d.lock) {
    const need = d.lock.coins ? W.coins >= d.lock.coins : d.lock.key ? W.keys >= 1 : false;
    if (!need) { if (!W.said['lock' + d.id]) { W.said['lock' + d.id] = 1; if (!W.said.lockRadio) { W.said.lockRadio = 1; sayList(SV_RADIO.locked); } } return; }
    if (d.lock.boss) return;
    d.prog += dt / (d.lock.coins ? 2.0 : 1.0);
    if (Math.random() < dt * 8) AU.sfx('rummage');
    if (d.prog >= 1) {
      if (d.lock.coins) W.coins -= d.lock.coins; else W.keys--;
      d.lock = null; d.prog = 0; d.hp = d.max; svAddWake(6); AU.sfx('open'); W.shake = Math.max(W.shake, 4);
      W.fx.push({ k: 'burst', x: d.x, y: FY(d.f) - 80, c: '#ffd27a', t: 0, life: .6 });
      toast('門開了（清醒度 +6）', 'gold');
    }
    return;
  }
  if (d.hp < d.max && p.doorT > .22) {
    const was = d.broken;
    d.hp = Math.min(d.max, d.hp + W.st.repair * dt);
    d.repT += dt; if (d.repT > .32) { d.repT = 0; AU.sfx('thud'); W.fx.push({ k: 'chip', x: d.x + fx(-8, 8), y: FY(d.f) - fx(30, 150), vx: fx(-60, 60), vy: fx(-120, -40), t: 0, life: .5, c: DOORS[d.type].c2 }); }
    if (was && d.hp >= d.max * .3) {
      d.broken = false; AU.sfx('reloadDone');
      for (const e of W.foes) if (!e.dead && e.f === d.f && !e.climb && Math.abs(e.x - d.x) < 24) e.x = p.x < d.x ? d.x + 26 : d.x - 26;
    }
  }
}
/* 放大鏡：站著不動就一圈一圈搜 */
function svSearchWork(p, dt) {
  let s = null, bd = 48;
  for (const o of W.L.spots) if (!o.done && o.f === p.f && Math.abs(o.x - p.x) < bd) { bd = Math.abs(o.x - p.x); s = o; }
  p.searching = null;
  if (!s || Math.abs(p.vx) > 40 || p.dashT > 0) { p.still = 0; return; }
  p.still += dt; if (p.still < .12) return;
  p.searching = s;
  if (!W.said.search) { W.said.search = 1; sayList(SV_RADIO.search); }
  const ring = RING[s.rings[s.i]];
  s.prog += dt * W.st.search / ring.t;
  s.prop.shake = .08;
  if (Math.random() < dt * 7) AU.sfx('rummage');
  if (s.prog >= 1) {
    s.prog = 0; const col = s.rings[s.i], special = s.special[s.i];
    s.i++; s.pop = .45; if (s.i >= s.rings.length) s.done = true;
    s.prop.open = 1;
    svRingReward(s, col, special);
  }
}
function svRescueWork(p, dt) {
  for (const v of W.survivors) {
    if (v.state !== 'wait' || v.f !== p.f || Math.abs(v.x - p.x) > 56 || Math.abs(p.vx) > 60) { if (v.state === 'wait') v.prog = Math.max(0, v.prog - dt); continue; }
    v.prog += dt / 1.3;
    if (v.prog >= 1) svRescue(v, p);
  }
}

/* ---------- 一圈開出來的東西 ---------- */
function svRingReward(s, col, special) {
  const x = s.x, y = FY(s.f) - 60;
  AU.sfx('open'); W.fx.push({ k: 'ring', x, y: y - 30, c: RING[col].c, t: 0, life: .55 });
  let kind = special || svWeighted(RING_DROP[col]);
  if (kind === 'key' && W.keyFound) kind = 'mem3';
  if (kind === 'life' && W.lifeGiven) kind = 'mem3';
  switch (kind) {
    case 'coin': { const n = col === 'G' ? (3 + (Math.random() * 4 | 0)) : col === 'B' ? 8 + (Math.random() * 5 | 0) : 15 + (Math.random() * 6 | 0); svGainCoins(n, x, y); break; }
    case 'scrap': { const nm = svMemName(0); svGainCoins(8, x, y); svLabel(x, y - 24, `碎憶「${nm}」→ 8 夢幣`, RAR[0].c); break; }
    case 'part': W.parts++; svLabel(x, y - 20, `鐘擺零件 ${W.parts}/6`, '#ffd27a'); AU.sfx('pick', 2); if (W.parts === 6) sayList(SV_RADIO.parts); break;
    case 'candy': if (W.candies < 4) { W.candies++; svLabel(x, y - 20, '醒神糖', '#ff9ad0'); AU.sfx('candy'); } else svGainCoins(6, x, y); break;
    case 'xp': svGainXp(4); svLabel(x, y - 20, '靈光 +4', '#53f0d6'); break;
    case 'key': W.keys++; W.keyFound = true; svLabel(x, y - 20, '鑰匙！（13F 診間）', '#ffe39a'); AU.sfx('goldDrop'); W.slowmo = .4; break;
    case 'soul': svLabel(x, y - 20, '靈光', '#53f0d6'); svQueueChoice(0); break;
    case 'soulG': svLabel(x, y - 20, '金色靈光', '#ffc94a'); AU.sfx('goldDrop'); svQueueChoice(1); break;
    case 'soulR': svLabel(x, y - 20, '紅色靈光', '#ff4d5e'); AU.sfx('goldDrop'); svQueueChoice(2); break;
    case 'mem1': svDropMem(svMakeMem(1), x, y); break;
    case 'mem2': svDropMem(svMakeMem(2), x, y); break;
    case 'mem3': svDropMem(svMakeMem(3), x, y); break;
    case 'mem4': svDropMem(svMakeMem(4), x, y); break;
    case 'life': { W.lifeGiven = true; const [n, f] = W.ch.life.items[3]; svDropMem({ id: uid(), n, f, rar: 4, size: 2, val: 1300, kind: 'life' }, x, y); break; }
  }
}
function svWeighted(list) { let tot = 0; for (const [, w] of list) tot += w; let k = Math.random() * tot; for (const [v, w] of list) { k -= w; if (k <= 0) return v; } return list[0][0]; }
function svMemName(rar) {
  const pool = rar >= 4 ? HAN_DEEP : W.ch.pool.concat(POOL);
  const free = pool.filter(x => !W.usedNames.has(x[0]));
  const r = (free.length ? free : pool)[Math.random() * (free.length || pool.length) | 0];
  W.usedNames.add(r[0]); return r;
}
function svMakeMem(rar) {
  const [n, f] = rar >= 4 ? svMemName(4) : svMemName(rar);
  const R0 = RAR[rar], size = rar >= 4 ? 2 : rar === 3 ? (Math.random() < .4 ? 2 : 1) : 1;
  return { id: uid(), n: rar === 0 ? n : n, f, rar, size, val: Math.round(fx(R0.v[0], R0.v[1]) * (1 + W.lvl * .08) / 5) * 5, kind: 'gen' };
}
function svDropMem(it, x, y) {
  const f = svFloorOfY(y), F = FL(f);
  let lx = clamp(x + fx(-44, 44), F.x0 + 30, F.x1 - 30);
  if (doorBetween(f, x, lx, d => true)) lx = x;
  W.picks.push({ k: 'mem', x, y, f, tx: lx, ty: FY(f), t: 0, item: it, land: false });
  if (it.rar >= 3) { W.slowmo = .35; AU.sfx('goldDrop'); } else AU.sfx('drop', it.rar);
}
const svFloorOfY = y => clamp(Math.round(-y / FH - .4), 0, W.L.floors.length - 1);
function svGainCoins(n, x, y) { W.coins += n; svLabel(x, y - 20, `+${n} 夢幣`, '#ffd27a'); AU.sfx('xp'); }
function svLabel(x, y, s, c) { W.fx.push({ k: 'label', x, y, s, c, t: 0, life: 1.4, vy: -36 }); }

/* ---------- 背包 ---------- */
const bagUsed = () => W.bag.reduce((s, i) => s + i.size, 0);
function svTakeMem(pk) {
  const it = pk.item;
  if (bagUsed() + it.size > W.cap) return false;
  W.bag.push(it); pk.dead = true;
  AU.sfx('pick', Math.min(5, it.rar));
  svLabel(pk.x, pk.ty - 70, `${RAR[it.rar].n}「${it.n}」`, RAR[it.rar].c);
  if (!W.pocket && it.rar >= 3) { W.pocket = it; W.bag = W.bag.filter(x => x !== it); toast(`「${it.n}」放進保險格（迷失也帶得走）`, 'good'); }
  return true;
}
/* 背包滿了：找出換掉以後放得下、而且比較便宜的組合（最便宜的先） */
function svSwapPlan(it) {
  const items = W.bag.slice().sort((a, b) => a.val / a.size - b.val / b.size);
  let free = W.cap - bagUsed(); const out = []; let lost = 0;
  for (const x of items) { if (free >= it.size) break; out.push(x); free += x.size; lost += x.val; }
  if (free < it.size || lost >= it.val) return null;
  return { out, lost };
}
function svDoSwap(pk) {
  const plan = svSwapPlan(pk.item); if (!plan) return;
  plan.out.forEach((x, i) => { W.bag = W.bag.filter(y => y !== x); const ox = clamp(pk.x + (i % 2 ? 1 : -1) * (26 + i * 12), FL(pk.f).x0 + 30, FL(pk.f).x1 - 30); W.picks.push({ k: 'mem', x: ox, y: pk.ty, f: pk.f, tx: ox, ty: pk.ty, t: 1, item: x, land: true, ign: W.t + 3 }); });
  svTakeMem(pk); W.prompt = null;
  svLabel(pk.x, pk.ty - 96, `換下「${plan.out.map(x => x.n).join('」「')}」`, '#c9c4dc');
}

/* ---------- 靈光（三選一） ---------- */
function svGainXp(v) {
  W.xp += v;
  while (W.xp >= svXpNeed(W.xpLvl)) { W.xp -= svXpNeed(W.xpLvl); W.xpLvl++; svQueueChoice(0); }
}
function svQueueChoice(q) { W.choiceQ.push(q); }
function svChoices(q) {
  const owned = Object.keys(W.tools), cands = [];
  if (owned.length < 3) for (const id of SV_TOOL_IDS) if (!W.tools[id]) cands.push({ k: 'tool', id, w: owned.length === 0 ? 3 : 1.3 });
  for (const id of owned) if (W.tools[id].lv < 5) cands.push({ k: 'tool', id, w: 1.5 });
  for (const id of SV_UP_IDS) if ((W.ups[id] || 0) < SV_UPS[id].max) cands.push({ k: 'up', id, w: 1 });
  const out = [];
  while (out.length < 3 && cands.length) {
    let tot = 0; for (const c of cands) tot += c.w; let k = Math.random() * tot, pick = cands[0];
    for (const c of cands) { k -= c.w; if (k <= 0) { pick = c; break; } }
    out.push(pick); cands.splice(cands.indexOf(pick), 1);
  }
  out.forEach((c, i) => { c.gold = q === 2 || (q === 1 && i === 0); });
  return out;
}
function svApplyChoice(c) {
  const n = c.gold ? 2 : 1;
  if (c.k === 'tool') {
    if (!W.tools[c.id]) { W.tools[c.id] = { id: c.id, lv: 0, cd: .5, t: 0, a: 0 }; }
    W.tools[c.id].lv = Math.min(5, W.tools[c.id].lv + n);
    if (c.id === 'plane') svPlanes();
  } else {
    W.ups[c.id] = Math.min(SV_UPS[c.id].max, (W.ups[c.id] || 0) + n);
    if (c.id === 'vigor') { svStats(); const p = W.players[0]; p.hp = Math.min(p.hpMax, p.hp + 25 * n); }
    if (c.id === 'mag') { svStats(); W.players[0].wpn.ammo = W.st.mag; }
  }
  svStats(); AU.sfx('levelup');
}

/* ---------- 槍 ---------- */
function svFoeTargets() { const out = W.foes.filter(e => !e.dead && e.spawn <= 0); if (W.boss && !W.boss.dead) out.push(W.boss); return out; }
function svPickTarget(p) {
  let best = null, bs = 1e9;
  for (const e of svFoeTargets()) {
    const dx = Math.abs(e.x - p.x), dy = Math.abs(e.y - p.y);
    if (dy > 90 || dx > 560) continue;
    if (doorBetween(p.f, p.x, e.x, hardDoor) && !p.climb) continue;
    const sc = dx + dy * 3 + (e.boss ? 60 : 0);
    if (sc < bs) { bs = sc; best = e; }
  }
  p.target = best; return best;
}
function svUpdateGun(p, dt) {
  const w = p.wpn, st = W.st;
  w.cd -= dt;
  if (w.reloadT > 0) { w.reloadT -= dt; if (w.reloadT <= 0) { w.ammo = st.mag; AU.sfx('reloadDone'); } svPickTarget(p); return; }
  const tgt = svPickTarget(p);
  if (!tgt) { w.idle += dt; if (w.idle > 1.3 && w.ammo < st.mag) { w.reloadT = st.reload; AU.sfx('reload'); } return; }
  w.idle = 0;
  const ty = tgt.y - (tgt.boss ? 90 : (tgt.h || 50) * .55);
  if (!p.dashT) p.face = tgt.x >= p.x ? 1 : -1;
  p.aim = Math.atan2(ty - (p.y - 47), tgt.x - p.x);
  if (w.cd > 0) return;
  if (w.ammo <= 0) { w.reloadT = st.reload; AU.sfx('reload'); return; }
  w.cd = st.interval; w.ammo--; w.recoil = 1; w.flash = .06;
  const mx = p.x + Math.cos(p.aim) * 26, my = p.y - 47 + Math.sin(p.aim) * 26;
  for (let i = 0; i < st.multi; i++) {
    const a = p.aim + (i - (st.multi - 1) / 2) * .07;
    W.bullets.push({ x: mx, y: my, vx: Math.cos(a) * 1500, vy: Math.sin(a) * 1500, f: p.f, dmg: st.dmg, pierce: st.pierce, life: .5, hit: new Set(), crit: Math.random() < st.crit });
  }
  AU.sfx('shot'); W.shake = Math.max(W.shake, 1.6);
  W.fx.push({ k: 'shell', x: p.x - p.face * 4, y: p.y - 46, vx: -p.face * fx(60, 120), vy: fx(-200, -120), t: 0, life: .7 });
}
function svUpdateBullets(dt) {
  for (const b of W.bullets) {
    const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
    const f = svFloorOfY(b.y + 40);
    const hd = doorBetween(f, b.x, nx, hardDoor);
    const F = FL(f);
    if (hd || nx < F.x0 - 10 || nx > F.x1 + 10) { b.dead = true; AU.sfx('wallhit'); W.fx.push({ k: 'spark', x: hd ? hd.x : clamp(nx, F.x0, F.x1), y: b.y, c: '#ffe8b0', t: 0, life: .2 }); continue; }
    b.x = nx; b.y = ny; b.life -= dt; if (b.life <= 0) b.dead = true;
    for (const e of svFoeTargets()) {
      if (b.hit.has(e)) continue;
      const hw = e.boss ? 80 : 16, top = e.boss ? 170 : (e.h || 50);
      if (Math.abs(e.x - b.x) < hw && b.y > e.y - top && b.y < e.y + 6) {
        b.hit.add(e);
        svHurt(e, b.dmg * (b.crit ? 1.9 : 1), { crit: b.crit, kx: Math.sign(b.vx) * 40 });
        W.fx.push({ k: 'spark', x: b.x, y: b.y, c: b.crit ? '#fff2a8' : '#ffffff', t: 0, life: .18 });
        if (b.pierce-- <= 0) { b.dead = true; break; }
      }
    }
  }
  W.bullets = W.bullets.filter(b => !b.dead);
  // 夢魘的光球：門擋得住
  const p = W.players[0];
  for (const o of W.ebul) {
    const nx = o.x + o.vx * dt;
    const d = doorBetween(o.f, o.x, nx, blocksFoe);
    if (d) { o.dead = true; if (!d.wall && !d.lock) svHitDoor(d, o.dmg * .6); W.fx.push({ k: 'spark', x: d.x, y: o.y, c: '#9fd4ff', t: 0, life: .25 }); continue; }
    o.x = nx; o.life -= dt; if (o.life <= 0) o.dead = true;
    if (p.state === 'alive' && !p.climb && p.f === o.f && Math.abs(p.x - o.x) < 16 && o.y > p.y - 66 && o.y < p.y) { o.dead = true; svHurtPlayer(o.dmg); }
  }
  W.ebul = W.ebul.filter(o => !o.dead);
}

/* ---------- 受傷 ---------- */
function svHurt(e, dmg, o = {}) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = Math.max(e.flash || 0, .08);
  if (!e.boss && e.guard && !e.aggro) e.aggro = true;
  svNum(e, dmg, o.crit ? 'crit' : o.burn ? 'burn' : '');
  if (!e.boss && o.kx && !e.climb && e.type !== 'warden') { const nx = e.x + o.kx * (e.elite ? .2 : 1) * .25; if (!doorBetween(e.f, e.x, nx, blocksFoe)) e.x = nx; }
  if (o.crit) { W.hitstop = Math.max(W.hitstop, .02); AU.sfx('crit'); } else if (!o.quiet) AU.sfx('hit');
  if (Math.random() < .5) W.fx.push({ k: 'ink', x: e.x + fx(-8, 8), y: e.y - (e.h || 50) * .6, vx: fx(-160, 160), vy: fx(-200, -60), t: 0, life: fx(.25, .45), s: fx(2, 4.5) });
  if (e.hp <= 0) { if (e.boss) svBossDie(e); else svKill(e); }
}
function svKill(e) {
  e.dead = true; e.deadT = .5;
  W.stats.kills++;
  W.fx.push({ k: 'dissolve', x: e.x, y: e.y, h: e.h || 50, t: 0, life: .5 });
  for (let i = 0; i < 9; i++) W.fx.push({ k: 'ink', x: e.x + fx(-10, 10), y: e.y - (e.h || 50) * fx(.2, .9), vx: fx(-220, 220), vy: fx(-260, -40), t: 0, life: fx(.3, .6), s: fx(2.5, 5) });
  AU.sfx('kill');
  const d = SV_FOES[e.type];
  if (Math.random() < d.coin % 1 || d.coin >= 1) { const n = Math.max(1, Math.floor(d.coin)); for (let i = 0; i < n; i++) W.picks.push({ k: 'coin', x: e.x + fx(-12, 12), y: e.y - 20, f: e.f, vx: fx(-80, 80), vy: fx(-220, -120), t: 0 }); }
  for (let i = 0; i < d.xp; i++) W.picks.push({ k: 'xp', x: e.x + fx(-10, 10), y: e.y - 30, f: e.f, vx: fx(-70, 70), vy: fx(-200, -100), t: 0 });
  if (e.elite && !e.brute) {
    W.stats.elites++; W.parts++; svLabel(e.x, e.y - 110, `鐘擺零件 ${W.parts}/6`, '#ffd27a'); if (W.parts === 6) sayList(SV_RADIO.parts);
    svDropMem(svMakeMem(3), e.x, e.y - 60); svQueueChoice(1); W.shake = 10;
  }
}
function svHurtPlayer(dmg, src) {
  const p = W.players[0];
  if (p.state !== 'alive' || p.inv > 0 || W.out) return;
  p.hp -= dmg; p.inv = .45; p.hurt = .35; W.shake = Math.max(W.shake, 7); AU.sfx('hurt');
  W.fx.push({ k: 'num', x: p.x, y: p.y - 80, v: Math.round(dmg), hurt: 1, t: 0, life: .7, vy: -60, born: W.t });
  if (p.searching) p.searching.prog = Math.max(0, p.searching.prog - .2);
  if (p.hp <= 0) { p.hp = 0; svLose(); }
}
function svHitDoor(d, dmg) {
  if (d.wall || d.lock || d.broken) return;
  d.hp -= dmg; d.shake = .22; d.hitT = .3;
  if (Math.random() < .6) W.fx.push({ k: 'chip', x: d.x + fx(-6, 6), y: FY(d.f) - fx(30, 160), vx: fx(-120, 120), vy: fx(-160, -40), t: 0, life: .5, c: DOORS[d.type].c2 });
  AU.sfx('thud');
  if (d.hp <= 0) {
    d.hp = 0; d.broken = true; AU.sfx(d.type === 'glass' ? 'glass' : 'boom'); W.shake = Math.max(W.shake, 6);
    for (let i = 0; i < 10; i++) W.fx.push({ k: 'chip', x: d.x + fx(-10, 10), y: FY(d.f) - fx(20, 180), vx: fx(-220, 220), vy: fx(-260, -60), t: 0, life: .8, c: DOORS[d.type].c2 });
    const p = W.players[0];
    if (!W.said.doorBroken && Math.abs(p.x - d.x) < 600 && p.f === d.f) { W.said.doorBroken = 1; sayList(SV_RADIO.doorBroken); }
  }
}

/* ---------- 夢魘 ---------- */
function addSvFoe(type, f, x, o = {}) {
  const brute = type === 'brute', t = brute ? 'warden' : type, d = SV_FOES[t];
  const lv = W.lvl, hpK = (1 + .2 * lv + .05 * Math.max(0, (o.wave || 0) - 1)) * (brute ? .7 : 1);
  const e = { id: uid(), type: t, base: d, brute, x, y: FY(f), f, hp: d.hp * hpK, hpMax: d.hp * hpK, dmg: d.dmg * (1 + .1 * lv), spd: d.spd * (1 + .05 * lv) * fx(.92, 1.08),
    h: d.h, elite: !!d.elite, face: Math.PI, anim: Math.random() * 9, flash: 0, spawn: o.spawn ?? .8, stun: 0, slowT: 0, slowK: 0, burnT: 0, burnD: 0,
    wind: 0, windK: '', atkT: fx(.2, .6), doorT: 0, thinkT: 0, route: null, climb: null, state: 'alert', moving: false, lane: fx(-7, 7), wave: o.wave || 0,
    guard: o.guard || null, aggro: !o.guard, beamT: 0, shotT: fx(1, 2) };
  W.foes.push(e); return e;
}
function svUpdateFoe(e, dt) {
  if (e.dead) return;
  e.anim += dt; e.flash = Math.max(0, e.flash - dt); e.moving = false;
  if (e.spawn > 0) { e.spawn -= dt; return; }
  if (e.burnT > 0) { e.burnT -= dt; e.burnAcc = (e.burnAcc || 0) + e.burnD * dt; if (e.burnAcc >= 4) { const k = e.burnAcc; e.burnAcc = 0; svHurt(e, k, { burn: 1, quiet: 1 }); if (e.dead) return; } if (Math.random() < dt * 9) W.fx.push({ k: 'ember', x: e.x + fx(-10, 10), y: e.y - fx(10, e.h), t: 0, life: .6 }); }
  if (e.slowT > 0) e.slowT -= dt;
  if (e.stun > 0) { e.stun -= dt; e.wind = 0; return; }
  const spd = e.spd * (e.slowT > 0 ? 1 - e.slowK : 1) * (W.extract ? 1.15 : 1);
  if (e.climb) { updateClimb(e, dt, spd, 1.0 * e.base.spd / Math.max(40, spd)); return; }
  const p = W.players[0];
  if (p.state !== 'alive') return;
  // 守房的精英：玩家進房或被打才動
  if (!e.aggro) {
    if ((p.f === e.f && !p.climb && roomAt(p.f, p.x) === e.guard)) e.aggro = true;
    else { const r = e.guard, mid = (r.x0 + r.x1) / 2, tx = mid + Math.sin(e.anim * .35) * (r.x1 - r.x0) * .3; if (Math.abs(tx - e.x) > 4) { e.x += Math.sign(tx - e.x) * spd * .4 * dt; e.face = tx > e.x ? 0 : Math.PI; e.moving = true; } return; }
  }
  // 攻擊動作中
  if (e.wind > 0) {
    e.wind -= dt;
    if (e.wind <= 0) svFoeStrike(e, p);
    return;
  }
  e.atkT = Math.max(0, e.atkT - dt);
  // 路線
  e.thinkT -= dt;
  const pf = p.climb ? p.climb.from : p.f;
  if (e.thinkT <= 0) { e.thinkT = .28 + Math.random() * .14; e.route = svRoute(e.f, e.x, pf, p.x); }
  let tx = e.x;
  if (e.route === SAME || (e.route && e.route.same)) tx = p.x;
  else if (e.route) {
    tx = e.route.x;
    if (Math.abs(e.x - tx) < 30 && stairAt(e.f, e.x) === e.route.s) { startClimb(e, e.route.s, e.route.up); e.route = null; return; }
  }
  const sameFloor = e.f === pf && !p.climb && (e.route === SAME || (e.route && e.route.same));
  const dx = p.x - e.x, adx = Math.abs(dx);
  if (sameFloor) e.face = dx > 0 ? 0 : Math.PI;
  // 回音：保持距離丟光球
  if (e.type === 'echo' && sameFloor && adx < 330) {
    e.shotT -= dt;
    if (adx < 170) tx = e.x - Math.sign(dx) * 60; else if (adx < 260) tx = e.x;
    if (e.shotT <= 0) { e.shotT = e.base.rate * fx(.85, 1.15); e.wind = .45; e.windK = 'shoot'; return; }
  }
  // 巡夜者的手電筒
  if (e.type === 'watcher' && sameFloor) {
    const lit = adx < 280 && !doorBetween(e.f, e.x, p.x, d => !d.broken || d.lock);
    if (lit) { W.watchLit += dt; if (W.watchLit > 1.1 && e.beamT <= 0) { W.watchLit = 0; e.beamT = 9; e.wind = .9; e.windK = 'scream'; AU.sfx('scream'); return; } }
    else W.watchLit = Math.max(0, W.watchLit - dt);
    e.beamT = Math.max(0, e.beamT - dt);
  }
  // 近戰
  if (sameFloor && adx <= e.base.reach && e.atkT <= 0 && !doorBetween(e.f, e.x, p.x, blocksFoe)) {
    e.wind = e.type === 'warden' ? .75 : .3; e.windK = e.type === 'warden' ? 'slam' : 'swipe'; e.atkT = e.base.rate; return;
  }
  // 移動（門擋住就打門）
  const want = tx - e.x;
  if (Math.abs(want) > 6 && !(sameFloor && adx < e.base.reach * .8)) {
    const dir = Math.sign(want), step = dir * Math.min(Math.abs(want), spd * dt);
    const d = doorBetween(e.f, e.x, e.x + step + dir * 18, blocksFoe);
    if (d) {
      e.x = approach(e.x, d.x - dir * 18, spd * dt); e.face = dir > 0 ? 0 : Math.PI;
      if (!hardDoor(d)) { e.doorT -= dt; if (e.doorT <= 0) { e.doorT = e.base.rate * 1.05; e.wind = .22; e.windK = 'door'; e.doorTgt = d; } }
      else { e.thinkT = Math.min(e.thinkT, .1); }
    } else { e.x += step; e.face = dir > 0 ? 0 : Math.PI; e.moving = true; }
  }
}
function svFoeStrike(e, p) {
  const sameFloor = e.f === p.f && !p.climb, adx = Math.abs(p.x - e.x);
  if (e.windK === 'door') { if (e.doorTgt && !e.doorTgt.broken) svHitDoor(e.doorTgt, e.base.door * (1 + .1 * W.lvl)); e.doorTgt = null; return; }
  if (e.windK === 'shoot') { const dir = p.x > e.x ? 1 : -1; W.ebul.push({ x: e.x + dir * 14, y: e.y - 44, vx: dir * 300, f: e.f, dmg: e.dmg, life: 2.2 }); AU.sfx('orb'); return; }
  if (e.windK === 'scream') { svAddWake(6); W.shake = 8; for (let i = 0; i < 3; i++) { const c = svPickCrack(); if (c) addSvFoe('shade', c.f, c.x + fx(-20, 20), { wave: W.wave.n }); } toast('巡夜者尖叫了（清醒度 +6）', 'bad'); return; }
  if (e.windK === 'slam') {
    W.fx.push({ k: 'slam', x: e.x, y: e.y, r: 100, t: 0, life: .4 }); W.shake = 9; AU.sfx('slam');
    if (sameFloor && adx < 100 && !doorBetween(e.f, e.x, p.x, blocksFoe)) svHurtPlayer(e.dmg);
    return;
  }
  if (sameFloor && adx <= e.base.reach + 10 && !doorBetween(e.f, e.x, p.x, blocksFoe)) { svHurtPlayer(e.dmg); W.fx.push({ k: 'claw', x: p.x, y: p.y - 40, f: p.x > e.x ? 1 : -1, t: 0, life: .2 }); AU.sfx('swipe'); }
}
function svSeparate() {
  const byF = {};
  for (const e of W.foes) if (!e.dead && !e.climb && e.spawn <= 0) (byF[e.f] = byF[e.f] || []).push(e);
  for (const f in byF) {
    const a = byF[f].sort((m, n) => m.x - n.x);
    for (let i = 1; i < a.length; i++) {
      const m = a[i - 1], n = a[i], gap = (m.elite || n.elite ? 34 : 17) - (n.x - m.x);
      if (gap > 0 && !doorBetween(+f, m.x - gap / 2, n.x + gap / 2, blocksFoe)) { m.x -= gap * .25; n.x += gap * .25; }
    }
  }
}

/* ---------- 夢具 ---------- */
function svPlanes() { const t = W.tools.plane; if (!t) return; const n = 2 + (t.lv >= 2 ? 1 : 0) + (t.lv >= 4 ? 1 : 0); while (W.planes.length < n) W.planes.push({ a: Math.random() * TAU, cd: Math.random(), st: 'orbit', x: 0, y: 0, tx: 0, ty: 0, t: 0, tgt: null }); }
function svFoesNear(f, x, r, yTol = 90) { const out = []; for (const e of svFoeTargets()) if (Math.abs(e.x - x) <= r && Math.abs(e.y - FY(f)) < yTol) out.push(e); return out; }
function svUpdateTools(p, dt) {
  if (p.state !== 'alive') return;
  const T0 = W.tools;
  for (const id in T0) {
    const t = T0[id], lv = t.lv; t.cd -= dt;
    if (id === 'mirror') {
      const cd = 2.8 * (lv >= 4 ? .75 : 1);
      if (t.cd <= 0) {
        const near = svFoesNear(p.f, p.x, 640); if (!near.length || p.climb) continue;
        const left = near.filter(e => e.x < p.x).length, right = near.length - left;
        const dirs = lv >= 5 ? [1, -1] : [right >= left ? 1 : -1];
        const shots = lv >= 3 ? 2 : 1;
        for (let k = 0; k < shots; k++) setTimeout(() => { if (W && !W.out) for (const d of dirs) svBeam(p, d, 22 * (lv >= 2 ? 1.4 : 1)); }, k * 160);
        t.cd = cd;
      }
    } else if (id === 'oil') {
      if (t.cd <= 0) {
        const near = svFoesNear(p.f, p.x, 470); if (!near.length) continue;
        let best = near[0], bc = -1; for (const e of near) { const c = near.filter(o => Math.abs(o.x - e.x) < 90).length; if (c > bc) { bc = c; best = e; } }
        const n = lv >= 3 ? 2 : 1;
        for (let k = 0; k < n; k++) W.fx.push({ k: 'bottle', x: p.x, y: p.y - 50, sx: p.x, sy: p.y - 50, tx: best.x + (k ? fx(-70, 70) : 0), f: best.f, t: 0, life: .5, lv });
        AU.sfx('throw'); t.cd = 3.6;
      }
    } else if (id === 'tube') {
      if (t.cd <= 0) {
        const near = svFoesNear(p.f, p.x, 300, 130); if (!near.length) continue;
        const cast = () => svChain(p, 3 + (lv >= 2 ? 2 : 0), 15 * (lv >= 3 ? 1.4 : 1), lv >= 4);
        cast(); if (lv >= 5) setTimeout(() => { if (W && !W.out) cast(); }, 150);
        t.cd = 2.4;
      }
    } else if (id === 'clock') {
      if (t.cd <= 0) {
        const r = 150 * (lv >= 2 ? 1.3 : 1); const near = svFoesNear(p.f, p.x, r, 100); if (!near.length) continue;
        for (const e of near) { svHurt(e, 12 * (lv >= 4 ? 2 : 1), { quiet: 1 }); if (!e.boss) { e.stun = Math.max(e.stun, 1); const nx = e.x + Math.sign(e.x - p.x || 1) * 110; if (!e.climb && !doorBetween(e.f, e.x, nx, blocksFoe)) e.x = clamp(nx, FL(e.f).x0 + 20, FL(e.f).x1 - 20); } }
        if (lv >= 5) for (const d of W.L.doors) if (d.f === p.f && !d.wall && !d.lock && Math.abs(d.x - p.x) < 220) { d.hp = Math.min(d.max, d.hp + 60); if (d.broken && d.hp > d.max * .3) d.broken = false; }
        W.fx.push({ k: 'wave', x: p.x, y: p.y - 40, r, t: 0, life: .45 }); AU.sfx('ringwave'); W.shake = Math.max(W.shake, 4);
        t.cd = 6.5 * (lv >= 3 ? .75 : 1);
      }
    } else if (id === 'cold') {
      const r = 130 * (lv >= 2 ? 1.25 : 1);
      t.a = (t.a || 0) + dt;
      for (const e of svFoesNear(p.f, p.x, r, 100)) { if (e.boss) continue; e.slowT = .25; e.slowK = lv >= 3 ? .5 : .35; e.coldAcc = (e.coldAcc || 0) + 6 * (lv >= 4 ? 2 : 1) * dt; if (e.coldAcc >= 3) { svHurt(e, e.coldAcc, { quiet: 1 }); e.coldAcc = 0; } if (lv >= 5 && Math.random() < dt * .15) e.stun = Math.max(e.stun, 1); }
    }
  }
  // 紙飛機
  if (T0.plane) {
    const lv = T0.plane.lv;
    W.planes.forEach((pl, i) => {
      pl.a += dt * 2.4;
      const ox = p.x + Math.cos(pl.a + i * TAU / W.planes.length) * 46, oy = p.y - 70 + Math.sin(pl.a + i * TAU / W.planes.length) * 16;
      pl.cd -= dt;
      if (pl.st === 'orbit') {
        pl.x = lerp(pl.x || ox, ox, Math.min(1, dt * 10)); pl.y = lerp(pl.y || oy, oy, Math.min(1, dt * 10));
        if (pl.cd <= 0) { const near = svFoesNear(p.f, p.x, 360, 110).filter(e => !e.boss || true); if (near.length) { pl.tgt = near[Math.random() * near.length | 0]; pl.st = 'dive'; pl.t = 0; pl.sx = pl.x; pl.sy = pl.y; pl.hit = new Set(); } else pl.cd = .3; }
      } else if (pl.st === 'dive') {
        pl.t += dt / .26; const e = pl.tgt;
        const tx = e ? e.x : pl.sx, ty = e ? e.y - (e.boss ? 90 : e.h * .5) : pl.sy;
        pl.x = lerp(pl.sx, tx, Math.min(1, pl.t)); pl.y = lerp(pl.sy, ty, Math.min(1, pl.t));
        if (lv >= 5) for (const o of svFoesNear(p.f, pl.x, 18, 120)) if (!pl.hit.has(o)) { pl.hit.add(o); svHurt(o, 11 * (lv >= 3 ? 1.4 : 1), { quiet: 1 }); }
        if (pl.t >= 1) { if (e && !e.dead && !pl.hit.has(e)) svHurt(e, 11 * (lv >= 3 ? 1.4 : 1), { quiet: 1 }); AU.sfx('blade'); pl.st = 'back'; pl.t = 0; pl.sx = pl.x; pl.sy = pl.y; }
      } else { pl.t += dt / .3; pl.x = lerp(pl.sx, ox, Math.min(1, pl.t)); pl.y = lerp(pl.sy, oy, Math.min(1, pl.t)); if (pl.t >= 1) { pl.st = 'orbit'; pl.cd = 1.6; } }
    });
  }
  // 燈油瓶落地
  for (const o of W.fx) if (o.k === 'bottle' && !o.done && o.t >= o.life) {
    o.done = true; const lv = o.lv, w = 130 * (lv >= 2 ? 1.4 : 1);
    W.pools.push({ f: o.f, x: o.tx, w, t: lv >= 4 ? 5 : 3, life: lv >= 4 ? 5 : 3, dps: 10 * (lv >= 5 ? 1.6 : 1), spread: lv >= 5 });
    for (const e of svFoesNear(o.f, o.tx, w / 2, 80)) svHurt(e, 16 * (lv >= 5 ? 1.6 : 1), { quiet: 1 });
    AU.sfx('boom'); W.shake = Math.max(W.shake, 3);
  }
}
function svBeam(p, dir, dmg) {
  const F = FL(p.f); let end = dir > 0 ? F.x1 : F.x0;
  const hd = doorBetween(p.f, p.x, end, hardDoor); if (hd) end = hd.x;
  W.fx.push({ k: 'beam', x0: p.x + dir * 20, x1: end, y: p.y - 48, t: 0, life: .28 });
  for (const e of svFoeTargets()) if (Math.abs(e.y - p.y) < 90 && (e.x - p.x) * dir > 0 && Math.abs(e.x - p.x) < Math.abs(end - p.x)) svHurt(e, dmg, { quiet: 1 });
  AU.sfx('zap');
}
function svChain(p, jumps, dmg, stun) {
  let from = { x: p.x, y: p.y - 50 }, hit = new Set(), pts = [from];
  for (let j = 0; j < jumps; j++) {
    let best = null, bd = j === 0 ? 300 : 220;
    for (const e of svFoeTargets()) { if (hit.has(e)) continue; const d = Math.hypot(e.x - from.x, (e.y - (e.h || 50) * .5) - from.y); if (d < bd) { bd = d; best = e; } }
    if (!best) break;
    hit.add(best); svHurt(best, dmg, { quiet: 1 }); if (stun && !best.boss) best.stun = Math.max(best.stun, .4);
    from = { x: best.x, y: best.y - (best.boss ? 90 : (best.h || 50) * .5) }; pts.push(from);
  }
  if (pts.length > 1) { W.fx.push({ k: 'bolt', pts, t: 0, life: .22 }); AU.sfx('zap'); }
}
function svUpdatePools(dt) {
  for (const o of W.pools) {
    o.t -= dt;
    o.acc = (o.acc || 0) + dt;
    if (o.acc >= .25) { o.acc = 0; for (const e of svFoesNear(o.f, o.x, o.w / 2, 70)) { if (o.spread && !e.boss) { e.burnT = 2; e.burnD = 6; } svHurt(e, o.dps * .25, { burn: 1, quiet: 1 }); } }
  }
  W.pools = W.pools.filter(o => o.t > 0);
}

/* ---------- 撿東西 ---------- */
function svUpdatePicks(p, dt) {
  W.prompt = null;
  for (const k of W.picks) {
    k.t += dt;
    if (k.k === 'mem') {
      if (!k.land) {
        const u = Math.min(1, k.t / .55);
        k.x = lerp(k.x, k.tx, Math.min(1, dt * 6)); k.y = lerp(k.y, k.ty, u * u);
        if (u >= 1) { k.land = true; k.x = k.tx; k.y = k.ty; AU.sfx('land', k.item.rar); W.fx.push({ k: 'landfx', x: k.x, y: k.y, c: RAR[k.item.rar].c, t: 0, life: .5 }); }
        continue;
      }
      if (p.state !== 'alive' || p.climb || p.f !== k.f || Math.abs(p.x - k.x) > 30 || (k.ign && k.ign > W.t)) continue;
      if (!svTakeMem(k)) {
        if (svSwapPlan(k.item)) { svDoSwap(k); if (!W.said.bagFull) { W.said.bagFull = 1; sayList(SV_RADIO.bagFull); } }
        else { W.prompt = k; if (!k.noted || W.t - k.noted > 4) { k.noted = W.t; svLabel(k.x, k.ty - 74, '背包裡的都比它值錢', '#c9c4dc'); } }
      }
    } else {
      // 夢幣、靈光碎片
      if (k.vy != null && !k.landed) { k.vy += 900 * dt; k.x += k.vx * dt; k.y += k.vy * dt; const gy = FY(k.f); if (k.y >= gy - 6) { k.y = gy - 6; k.vy = -k.vy * .35; k.vx *= .6; if (Math.abs(k.vy) < 60) { k.landed = true; k.vy = 0; } } }
      if (p.state !== 'alive') continue;
      const pf = p.climb ? -9 : p.f;
      const d = Math.hypot(p.x - k.x, (p.y - 30) - k.y);
      if (k.t > .3 && (pf === k.f || d < 120) && d < W.st.magnet) { k.landed = true; const a = Math.atan2((p.y - 30) - k.y, p.x - k.x), sp = 420 + (1 - d / W.st.magnet) * 500; k.x += Math.cos(a) * sp * dt; k.y += Math.sin(a) * sp * dt; }
      if (d < 22 && k.t > .3) { k.dead = true; if (k.k === 'coin') { W.coins++; AU.sfx('xp'); } else { svGainXp(1); AU.sfx('xp'); } }
    }
  }
  W.picks = W.picks.filter(k => !k.dead);
}

/* ---------- 夢中人 ---------- */
function svRescue(v, p) {
  v.state = 'walk'; v.prog = 0;
  AU.sfx('carry'); W.fx.push({ k: 'burst', x: v.x, y: v.y - 40, c: '#ffd0e0', t: 0, life: .7 });
  W.fx.push({ k: 'bubble', o: v, s: v.line, t: 0, life: 4.2 });
  if (v.reward === 'parts') { W.parts += 1; W.coins += 15; svLabel(v.x, v.y - 90, `鐘擺零件 +1・夢幣 +15`, '#ffd27a'); if (W.parts >= 6 && !W.said.parts) { W.said.parts = 1; sayList(SV_RADIO.parts); } }
  if (v.reward === 'soul') svQueueChoice(1);
  if (v.reward === 'heal') { p.hp = p.hpMax; W.candies = Math.min(4, W.candies + 2); svLabel(v.x, v.y - 90, '生命回滿・醒神糖 +2', '#ff9ad0'); AU.sfx('candy'); }
  if (!W.said.rescue) { W.said.rescue = 1; sayList(SV_RADIO.rescue); }
}
function svUpdateSurvivors(dt) {
  for (const v of W.survivors) {
    v.anim += dt; v.moving = false;
    if (v.state !== 'walk') continue;
    if (v.climb) { updateClimb(v, dt, 110, 1.1); v.walk += dt * 3; continue; }
    if (v.f === SV_LEVEL.bell.f) {
      const tx = SV_LEVEL.bell.x - 70 - W.survivors.indexOf(v) * 34;
      if (Math.abs(v.x - tx) > 4) { v.x += Math.sign(tx - v.x) * 110 * dt; v.face = tx > v.x ? 1 : -1; v.moving = true; v.walk += dt * 3; } else { v.state = 'roof'; v.face = 1; }
      continue;
    }
    const r = svRoute(v.f, v.x, SV_LEVEL.bell.f, SV_LEVEL.bell.x);
    if (!r || r.same) continue;
    if (Math.abs(v.x - r.x) < 30 && stairAt(v.f, v.x) === r.s) { startClimb(v, r.s, r.up); continue; }
    const dir = Math.sign(r.x - v.x); v.x += dir * 110 * dt; v.face = dir; v.moving = true; v.walk += dt * 3;
  }
}

/* ---------- 波次 ---------- */
function svActivateCracks() {
  const n = W.wave.n;
  for (const c of W.L.cracks) {
    if (c.f === 1 && (n >= 3 || W.visited[1])) c.active = true;
    if (c.f === 2 && (n >= 5 || W.visited[2])) c.active = true;
    if (c.f === 3) c.active = !!(W.extract || W.boss);
  }
}
function svPickCrack() {
  const p = W.players[0], pf = p.climb ? p.climb.from : p.f;
  const cs = W.L.cracks.filter(c => c.active && svRoute(c.f, c.x, pf, p.x));
  if (!cs.length) return null;
  let tot = 0; const w = cs.map(c => { const v = c.f === pf ? 3 : Math.abs(c.f - pf) === 1 ? 1.6 : 1; tot += v; return v; });
  let k = Math.random() * tot; for (let i = 0; i < cs.length; i++) { k -= w[i]; if (k <= 0) return cs[i]; }
  return cs[0];
}
function svStartWave() {
  const wv = W.wave; wv.n++; wv.state = 'active'; wv.age = 0; wv.spawnT = 0;
  wv.queue = svWaveList(wv.n, W.lvl);
  svActivateCracks();
  if (wv.n === 1) sayList(SV_RADIO.wave1); else toast(`第 ${wv.n} 波來了`, 'bad');
  AU.sfx('summon');
}
function svWaveAlive(n) { let c = 0; for (const e of W.foes) if (!e.dead && e.wave === n) c++; return c; }
function svUpdateWaves(dt) {
  const wv = W.wave;
  if (W.extract) {
    W.holdT -= dt;
    if (W.holdT <= 0) {
      W.holdT = Math.max(2.2, 3.4 - W.lvl * .25);
      const roof = W.L.cracks.find(c => c.f === 3);
      const ramp = Math.floor(clamp(30 - W.extract.t, 0, 30) / 10);   // 越到最後湧得越多
      for (let i = 0; i < 4 + ramp; i++) addSvFoe(Math.random() < .3 + ramp * .08 ? 'ripper' : 'shade', 3, roof.x - fx(0, 30), { wave: -1, spawn: .5 + i * .18 });
      for (let i = 0; i < 2 + (ramp >= 2 ? 1 : 0); i++) addSvFoe(Math.random() < .3 ? 'echo' : 'shade', 2, 40 + fx(0, 70), { wave: -1, spawn: .5 + i * .2 });
      roof.pulse = .5;
    }
    return;
  }
  if (wv.state === 'wait') {
    wv.t -= dt;
    if (wv.t <= 0) svStartWave();
  } else {
    wv.age += dt;
    if (wv.queue.length) {
      wv.spawnT -= dt;
      if (wv.spawnT <= 0) {
        wv.spawnT = .24;
        const c = svPickCrack();
        if (c) { addSvFoe(wv.queue.shift(), c.f, c.x + fx(-18, 18), { wave: wv.n }); c.pulse = .5; c.open = 1; }
      }
    } else if (svWaveAlive(wv.n) === 0) {
      wv.state = 'wait'; wv.t = 10; W.stats.waves++; svAddWake(3);
      toast(`第 ${wv.n} 波清空（清醒度 +3）`, 'good');
    } else if (wv.age > 55) svStartWave();
  }
}

/* ---------- 清醒度（＝血月） ---------- */
function svAddWake(v) { if (W.bossDead || W.out) return; W.wake = Math.min(100, W.wake + v); }
function svUpdateWake(dt) {
  if (!W.extract && !W.boss) svAddWake(dt / 3.6);
  W.stats.maxWake = Math.max(W.stats.maxWake, W.wake);
  const lv = Math.min(4, Math.floor(W.wake / 25));
  if (lv !== W.lvl) {
    if (lv > W.lvl) { const k = 'lv' + lv; if (SV_RADIO[k] && !W.said[k]) { W.said[k] = 1; sayList(SV_RADIO[k]); } AU.sfx('stage'); W.shake = Math.max(W.shake, 5); }
    W.lvl = lv;
  }
  if (W.wake >= 100 && !W.boss && !W.bossDead) svBossAwake();
}

/* ---------- 心魔：值班台 ---------- */
function svBossAwake() {
  const b = { boss: true, bid: 'desk', x: 640, y: FY(3), f: 3, hp: 2600, hpMax: 2600, phase: 1, cd: 2.4, act: null, actT: 0, n: 0, anim: 0, flash: 0, face: Math.PI, awake: true, h: 170, said: false };
  W.boss = b; W.bellSeal = true; svActivateCracks();
  UI.banner(W.ch.boss.n, W.ch.boss.sub, true); sayList(SV_RADIO.boss);
  AU.music('boss', 0); AU.sfx('roar'); W.shake = 14;
  const p = W.players[0];
  if (p.f !== 3) toast('天台上出現了什麼……鐘被封住了', 'bad');
}
function svUpdateBoss(b, dt) {
  if (b.dead) return;
  b.anim += dt; b.flash = Math.max(0, b.flash - dt);
  const p = W.players[0];
  if (b.phase === 1 && b.hp < b.hpMax * .5) { b.phase = 2; sayList(SV_RADIO.bossHalf); W.shake = 10; AU.sfx('roar'); }
  if (p.f !== 3 || p.climb) return;
  if (b.act) { b.actT += dt; svBossAct(b, p, dt); return; }
  b.cd -= dt;
  // 線纜：靠太近會被掃
  if (Math.abs(p.x - b.x) < 140 && b.cd > .4 && !b.swipe) { b.swipe = .55; }
  if (b.swipe != null) { b.swipe -= dt; if (b.swipe <= 0) { b.swipe = null; if (Math.abs(p.x - b.x) < 150 && p.f === 3) { svHurtPlayer(16); const nx = p.x + Math.sign(p.x - b.x || 1) * 110; svMoveX(p, nx - p.x); } W.fx.push({ k: 'claw', x: b.x + Math.sign(p.x - b.x) * 90, y: b.y - 50, f: Math.sign(p.x - b.x), big: 1, t: 0, life: .25 }); AU.sfx('lash'); } }
  if (b.cd > 0) return;
  const list = b.phase === 2 ? ['sweep', 'static', 'call', 'lock', 'static'] : ['sweep', 'static', 'call', 'static'];
  let a = list[Math.random() * list.length | 0]; if (a === b.last) a = list[Math.random() * list.length | 0];
  b.last = a; b.act = a; b.actT = 0; b.n = 0;
}
function svBossAct(b, p, dt) {
  const done = () => { b.act = null; b.cd = b.phase === 2 ? 1.5 : 2.3; };
  const roof = FL(3);
  if (b.act === 'sweep') {
    if (b.n === 0) { b.n = 1; const dir = p.x > b.x ? 1 : -1; W.tele.push({ k: 'col', x: b.x, dir, w: 74, t: 0, warn: .75, spd: b.phase === 2 ? 420 : 320, x0: roof.x0 + 150, x1: roof.x1, hitT: 0 }); AU.sfx('beam'); }
    if (b.actT > 2.6) done();
  } else if (b.act === 'static') {
    if (b.n === 0) { b.n = 1; const k = b.phase === 2 ? 5 : 3; for (let i = 0; i < k; i++) W.tele.push({ k: 'circ', x: clamp(p.x + (i - (k - 1) / 2) * 95 + fx(-20, 20), roof.x0 + 170, roof.x1 - 20), r: 52, t: 0, warn: .9, life: 1.15, dmg: 18 }); AU.sfx('static'); }
    if (b.actT > 1.2) done();
  } else if (b.act === 'call') {
    if (b.n === 0) { b.n = 1; const c = W.L.cracks.find(o => o.f === 3); for (let i = 0; i < 4; i++) addSvFoe(i === 3 ? 'ripper' : 'shade', 3, c.x - fx(0, 40), { wave: -1, spawn: .6 + i * .15 }); c.pulse = .8; AU.sfx('summon'); }
    if (b.actT > .9) done();
  } else if (b.act === 'lock') {
    if (b.n === 0) { b.n = 1; const d = FL(3).doors[0]; if (!d.lock) { d.lock = { boss: true }; d.lockT = 6; AU.sfx('lock'); toast('值班台把天台的門鎖上了', 'bad'); } }
    if (b.actT > .8) done();
  }
}
function svUpdateTele(dt) {
  const p = W.players[0];
  for (const o of W.tele) {
    o.t += dt;
    if (o.k === 'col') {
      if (o.t < o.warn) continue;
      o.x += o.dir * o.spd * dt; o.hitT -= dt;
      if (p.f === 3 && !p.climb && Math.abs(p.x - o.x) < o.w / 2 && o.hitT <= 0) { svHurtPlayer(20); o.hitT = .5; }
      if (o.x < o.x0 - 40 || o.x > o.x1 + 40) o.dead = true;
    } else if (o.k === 'circ') {
      if (!o.fired && o.t >= o.warn) { o.fired = true; W.fx.push({ k: 'burst', x: o.x, y: FY(3) - 20, c: '#9fffe9', t: 0, life: .4 }); AU.sfx('static'); if (p.f === 3 && !p.climb && Math.abs(p.x - o.x) < o.r) svHurtPlayer(o.dmg); }
      if (o.t >= o.life) o.dead = true;
    }
  }
  W.tele = W.tele.filter(o => !o.dead);
  // 被鎖上的門
  for (const d of W.L.doors) if (d.lock && d.lock.boss) { d.lockT -= dt; if (d.lockT <= 0) d.lock = null; }
}
function svBossDie(b) {
  b.dead = true; W.bossDead = true; W.bellSeal = false; W.slowmo = 1.2; W.shake = 16;
  AU.sfx('bossDie'); AU.music('dream', 0, 2);
  for (let i = 0; i < 40; i++) W.fx.push({ k: 'ink', x: b.x + fx(-60, 60), y: b.y - fx(20, 160), vx: fx(-300, 300), vy: fx(-360, -60), t: 0, life: fx(.5, 1.2), s: fx(3, 8) });
  svDropMem({ id: uid(), n: HAN_CORE.n, f: HAN_CORE.f, rar: 5, size: 1, val: 3200, kind: 'core' }, b.x, b.y - 80);
  svDropMem(svMakeMem(3), b.x - 40, b.y - 60);
  sayList(SV_RADIO.bossDie); UI.banner('心魔退散', '天台的鐘可以敲了');
  W.boss = null;
}

/* ---------- 撤離 ---------- */
function svRingBell() {
  const p = W.players[0];
  if (!p.act || p.act.k !== 'bell' || W.extract) return;
  W.extract = { t: 30 }; W.holdT = 1.2; svActivateCracks();
  AU.sfx('bell'); sayList(SV_RADIO.bell); W.shake = 8;
  W.fx.push({ k: 'bellring', x: SV_LEVEL.bell.x, y: FY(3) - 130, t: 0, life: 1.4 });
  W.wave.state = 'hold';
}
function svUpdateExtract(p, dt) {
  svUpdateTele(dt);
  if (!W.extract) return;
  const onRoof = p.f === 3 && !p.climb;
  W.extract.onRoof = onRoof;
  if (onRoof) {
    const prev = Math.ceil(W.extract.t);
    W.extract.t -= dt;
    if (Math.ceil(W.extract.t) !== prev && W.extract.t > 0) AU.sfx('tick', W.extract.t < 6 ? 1 : 0);
  }
  if (W.extract.t <= 0) svExtract('bell');
}
function svExtract(kind) {
  if (W.out) return;
  const p = W.players[0];
  W.out = true;
  const surv = kind === 'bell' ? W.survivors.filter(v => v.state === 'roof' || (v.state === 'walk' && v.f === 3)) : [];
  const left = W.survivors.filter(v => v.state !== 'wait' && !surv.includes(v));
  const items = W.bag.slice(); if (W.pocket) items.unshift(W.pocket);
  const svMems = surv.map(v => Object.assign({ id: uid(), size: 0, kind: v.mem.life ? 'life' : 'gen' }, v.mem));
  const total = items.reduce((s, i) => s + i.val, 0) + svMems.reduce((s, i) => s + i.val, 0) + W.coins;
  W.result = { kind, items, svMems, left, total, coins: W.coins, kills: W.stats.kills, waves: W.stats.waves, wake: Math.round(W.stats.maxWake), rooms: W.stats.rooms, t: W.t, boss: W.bossDead };
  AU.sfx(kind === 'bell' ? 'extract' : 'fall');
  setTimeout(() => UI.results(W.result), 900);
}
function svWakeNow() {
  if (W.parts < 6 || W.out) return;
  S.paused = true;
  confirmBox('緊急醒來', '用六個鐘擺零件立刻醒來。<br>背包裡的東西都帶得走，但夢中人會留在夢裡。', '醒來', '再撐一下', () => { S.paused = false; svExtract('wake'); }, false, () => { S.paused = false; });
}
function svLose() {
  const p = W.players[0];
  p.state = 'down'; W.out = true;
  const kept = W.pocket ? [W.pocket] : [];
  W.result = { kind: 'lost', items: kept, lost: W.bag.slice(), svMems: [], left: W.survivors.filter(v => v.state !== 'wait'), total: kept.reduce((s, i) => s + i.val, 0), coins: 0, kills: W.stats.kills, waves: W.stats.waves, wake: Math.round(W.stats.maxWake), rooms: W.stats.rooms, t: W.t, boss: W.bossDead };
  AU.sfx('lost'); W.slowmo = 1.5;
  setTimeout(() => UI.results(W.result), 1600);
}

/* ---------- 特效、數字 ---------- */
function svNum(e, v, kind) {
  const live = f => f && f.t < .3 && W.t - f.born < .55 && W.fx.includes(f);
  if (kind === 'burn' && live(e.numN)) { e.numN.v += v; return; }
  const key = kind === 'crit' ? null : kind === 'burn' ? 'numB' : 'numN', old = key && e[key];
  if (live(old)) { old.v += v; old.t = Math.min(old.t, .1); if (kind !== 'burn') old.pop = .14; return; }
  const top = e.boss ? 180 : (e.h || 50) + 18;
  const [nx, ny] = svNumSpot(e.x + fx(-6, 6), e.y - top, kind === 'crit');
  if (nx == null) return;
  const f = { k: 'num', x: nx, y: ny, v, crit: kind === 'crit', burn: kind === 'burn', t: 0, born: W.t, life: kind === 'crit' ? .9 : .65, vy: -60 };
  if (key) e[key] = f;
  W.fx.push(f);
}
const NUM_TRY = [[0, 0], [-24, -4], [24, -4], [0, -17], [-34, -18], [34, -18], [-14, -32], [14, -32], [0, -46]];
function svNumSpot(x, y, big) {
  const near = [];
  for (const f of W.fx) if (f.k === 'num' && f.t < f.life * .8 && Math.abs(f.x - x) < 90 && Math.abs(f.y - y) < 80) near.push(f);
  if (near.length > 9 && !big) return [null, null];
  const wOf = f => (String(Math.round(f.v)).length * 9 + 8) * (f.crit ? 1.45 : 1), myW = big ? 40 : 26;
  for (const [dx, dy] of NUM_TRY) { const nx = x + dx, ny = y + dy; if (near.every(f => Math.abs(f.x - nx) >= (wOf(f) + myW) / 2 || Math.abs(f.y - ny) >= (f.crit || big ? 20 : 15))) return [nx, ny]; }
  return [x + fx(-16, 16), y - fx(6, 26)];
}
function svUpdateFx(dt) {
  for (const f of W.fx) {
    f.t += dt;
    if (f.k === 'num' || f.k === 'label') { f.y += (f.vy || -30) * dt * (1 - f.t / f.life); if (f.pop) f.pop = Math.max(0, f.pop - dt); }
    else if (f.k === 'ink' || f.k === 'chip' || f.k === 'shell') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 820 * dt; f.vx *= Math.pow(.2, dt); }
    else if (f.k === 'bottle') { const u = Math.min(1, f.t / f.life); f.x = lerp(f.sx, f.tx, u); f.y = lerp(f.sy, FY(f.f) - 10, u) - Math.sin(u * Math.PI) * 90; }
  }
  W.fx = W.fx.filter(f => f.t < f.life || (f.k === 'bottle' && !f.done));
}
