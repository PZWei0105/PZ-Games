/* ───────────── 戰場模擬：部署、索敵、開火、掩體、搶旗、敵方指揮官 ───────────── */
const LANES = [118, 172, 226];
const LANE_GAP = 54;
const FIELD_W = 2240;
const FLAG_X = [560, 1120, 1680];
const HQ_X = [92, FIELD_W - 92];
let B = null;
let UID = 1;

function newBattle(cfg) {
  UID = 1;
  PT.clear();
  TIMERS.length = 0; // 上一場（或標題背景戰）還沒落地的砲擊、煙幕、台詞，不能帶進新的一場
  B = {
    cfg, t: 0, time: cfg.time || 240, over: false, result: null, endT: 0,
    units: [], projs: [], zones: [], planes: [], covers: [], props: [],
    flags: [], hq: [], supply: [5, 5], supMax: [cfg.supMax || 10, 10], regen: [cfg.regen || 0.42, 0.42 * (cfg.aiRegen || 1)],
    cards: [], sel: null, cdAbil: {}, heroUsed: {},
    rival: RIVAL[cfg.rival], aiCD: {}, ai: { t: 2.5, heroT: rnd(70, 110), heroOut: false, lineT: 6, lastBig: 0 },
    stats: { kills: 0, lost: 0, flagsTaken: 0, flagsLost: 0, veh: 0, dmg: 0 },
    msgQ: [], lv: cfg.lv || { inf: 0, veh: 0, air: 0 }, aiLv: cfg.aiLv || 0,
    lowSaid: false, tankSaid: 0, heliSaid: 0, hqSaid: 0,
  };
  // 旗點：每條線三個，左邊是我們的、中間沒人、右邊是敵人的
  for (let l = 0; l < 3; l++) for (let i = 0; i < 3; i++) {
    const own = cfg.flags ? cfg.flags[l][i] : (i === 0 ? 0 : i === 2 ? 1 : -1);
    B.flags.push({ lane: l, i, x: FLAG_X[i] + (l - 1) * 14, y: LANES[l] - 22, owner: own, prog: own === 0 ? -1 : own === 1 ? 1 : 0, raiser: null, wave: rnd(0, 6) });
  }
  // 指揮部
  for (let s = 0; s < 2; s++) {
    const hp = s === 0 ? (cfg.hqHp || 4500) : (cfg.aiHqHp || 4500);
    B.hq.push({ side: s, x: HQ_X[s], y: LANES[1], hp, max: hp, cls: 'str', mgT: 0, burst: 0, bt: 0, alive: true, flash: 0, dmgT: 0, dead: false });
  }
  // 掩體：每個旗點前後各一道沙包
  for (let l = 0; l < 3; l++) for (let i = 0; i < 3; i++) {
    const fx = FLAG_X[i] + (l - 1) * 14;
    B.covers.push({ lane: l, x: fx - 46, y: LANES[l] + 8, hp: 260 }, { lane: l, x: fx + 46, y: LANES[l] + 8, hp: 260 });
  }
  if (cfg.doc && cfg.doc.includes('rush')) B.supply[0] += 2;
  B.deck = cfg.deck;
  B.cards = cfg.deck.map((k) => ({ k, cd: 0 }));
  return B;
}

/* ── 兵種數值（含等級加成） ── */
function statOf(def, side) {
  const lv = side === 0 ? B.lv : { inf: B.aiLv, veh: B.aiLv, air: B.aiLv };
  const k = def.cls === 'inf' ? lv.inf : def.cls === 'air' ? lv.air : lv.veh;
  return 1 + (k || 0) * 0.12;
}

/* ── 生成單位 ── */
function mkSoldier(side, kind, def, lane, x, pal, wk) {
  const u = { id: UID++, side, kind, def, cls: 'inf', lane, x, y: LANES[lane] + rnd(-13, 13), face: side ? -1 : 1, alive: true, isSoldier: true };
  newSoldierAnim(u, pal, wk || def.wk);
  const m = statOf(def, side);
  u.maxHp = u.hp = Math.round(def.hp * m); u.dm = m;
  u.state = 'arrive'; u.tgt = null; u.tgtT = rnd(0, 0.3); u.cd = rnd(0.2, 0.8); u.burstLeft = 0; u.burstT = 0;
  u.mag = magSize(def); u.ammo = u.mag; u.sup = 0; u.nadeT = rnd(4, 8); u.burn = 0; u.cover = null; u.setupT = 0;
  u.speedMul = rnd(0.92, 1.08);
  B.units.push(u);
  return u;
}
function magSize(def) { return def.wk === 'mg' ? 48 : def.wk === 'ar' ? 15 : 1; }

function spawnSquad(side, kind, lane, x, arrive) {
  const def = UDEF[kind], pal = side ? B.rival.pal : 'us';
  const out = [];
  const sq = UID++;
  for (let i = 0; i < def.n; i++) {
    let wk = def.wk;
    if (kind === 'mg' && i === 1) wk = 'ar';
    if (kind === 'mortar') wk = 'ar';
    const u = mkSoldier(side, kind, def, lane, x - (side ? -1 : 1) * i * 16, pal, wk);
    u.squad = sq; u.idx = i;
    if (kind === 'mg' && i === 1) { u.loader = true; u.def = Object.assign({}, UDEF.rifle, { rng: 240, cd: 1.8 }); }
    if (kind === 'mortar') { u.crew = true; u.def = Object.assign({}, UDEF.rifle, { rng: 200 }); }
    if (arrive) { u.x -= (side ? -1 : 1) * arrive; u.arriveX = x - (side ? -1 : 1) * i * 16; }
    else u.state = 'move';
    out.push(u);
  }
  if (kind === 'mortar') { // 迫擊砲本體跟著組員
    out[0].mortar = { a: 1.0, rec: 0, rdy: false }; out[0].def = Object.assign({}, def); out[0].kind = 'mortar'; out[0].crew = false; out[0].gunner = true;
  }
  return out;
}

function spawnVehicle(side, kind, lane, x, arrive, heroKey) {
  const def = heroKey ? HERO[heroKey] : UDEF[kind];
  const vk = kind === 'heli' ? 'heli' : kind;
  const pal = side ? B.rival.pal : 'us';
  const u = { id: UID++, side, kind, def, cls: def.cls || (kind === 'tank' ? 'arm' : kind === 'heli' ? 'air' : 'veh'), lane, x, y: LANES[lane] + rnd(-3, 3), face: side ? -1 : 1, alive: true, isVeh: true };
  if (heroKey) { u.cls = kind === 'heli' ? 'air' : 'arm'; u.hero = heroKey; u.scale = def.scale; }
  newVehAnim(u, vk, heroKey ? heroPal(side, heroKey) : pal);
  const m = statOf(def, side);
  u.maxHp = u.hp = Math.round(def.hp * m); u.dm = m;
  u.state = 'arrive'; u.tgt = null; u.tgtT = 0; u.cd = 1; u.burstLeft = 0; u.burstT = 0; u.coaxCd = 1; u.rocketCd = rnd(1, 3); u.setupT = 0;
  u.cargo = def.carry || 0; u.speedMul = 1; u.sup = 0;
  if (kind === 'heli') { u.alt = 0; u.altT = def.alt; u.y = LANES[lane]; }
  if (arrive) { u.arriveX = x; u.x -= (side ? -1 : 1) * arrive; } else u.state = 'move';
  B.units.push(u);
  return u;
}

function heroPal(side, key) { const h = HERO[key]; const p = side === 0 && (PAL[h.pal + 'Us'] || VPAL_ALIAS[h.pal + 'Us']) ? h.pal + 'Us' : h.pal; return p; }
const VPAL_ALIAS = { holderUs: 1, ilyaUs: 1 };
function spawnHero(side, key, lane, x) {
  const h = HERO[key];
  if (h.kind === 'inf') {
    const def = Object.assign({ cls: 'inf', n: 1 }, h);
    const u = mkSoldier(side, 'hero', def, lane, x, heroPal(side, key), h.wk);
    u.hero = key; u.scale = h.scale; u.skillCd = 6; u.arriveX = x; u.x -= (side ? -1 : 1) * 150;
    if (h.prone) u.def.prone = true;
    return u;
  }
  const u = spawnVehicle(side, h.kind, lane, x, 220, key);
  u.skillCd = 6;
  return u;
}

/* ── 部署 ── */
function deployZone(side, lane) {
  // 從自家指揮部到「連續佔有的最後一個旗點」再往前一點
  let front = side === 0 ? 210 : FIELD_W - 210;
  const fl = B.flags.filter((f) => f.lane === lane).sort((a, b) => (side === 0 ? a.x - b.x : b.x - a.x));
  for (const f of fl) { if (f.owner === side) front = f.x + (side === 0 ? 90 : -90); else break; }
  return side === 0 ? [150, front] : [front, FIELD_W - 150];
}
function canAfford(side, cost) { return B.supply[side] >= cost - 1e-6; }

function cardCost(side, key) {
  if (side === 0 && B.cfg.campaign && typeof costOf === 'function') return costOf(key);
  const d = ABIL[key] || HERO[key] || UDEF[key]; return d.cost;
}
function hasDocB(side, d) { return side === 0 && B.cfg.doc && B.cfg.doc.includes(d); }
function deploy(side, key, lane, x) {
  const isAbil = !!ABIL[key], isHero = !!HERO[key];
  const cost = cardCost(side, key);
  if (!canAfford(side, cost)) return false;
  if (!isAbil) {
    const z = deployZone(side, lane); x = clamp(x, z[0], z[1]);
  }
  B.supply[side] -= cost;
  if (isAbil) { useAbility(side, key, lane, x); return true; }
  if (isHero) { spawnHero(side, key, lane, x); if (side === 0) { B.heroUsed[key] = true; heroLine(key); } return true; }
  const def = UDEF[key];
  if (def.cls === 'inf') spawnSquad(side, key, lane, x, 150);
  else spawnVehicle(side, key, lane, x, key === 'heli' ? 300 : 230);
  if (side === 0) { radio(RADIO.deploy[key]); sfx('deploy'); }
  return true;
}

/* ── 每格更新 ── */
function battleUpdate(dt) {
  if (!B) return;
  B.t += dt;
  if (!B.over) {
    B.time -= dt;
    // 補給：基礎＋每佔一個旗點多一點
    for (let s = 0; s < 2; s++) {
      const owned = B.flags.filter((f) => f.owner === s).length;
      let r = B.regen[s] + owned * 0.024 * (hasDocB(s, 'inch') ? 2 : 1);
      if (owned <= 2) r *= 1.3; // 被壓著打的一方補給回得快一點，比較有機會翻盤
      B.supply[s] = Math.min(B.supMax[s], B.supply[s] + r * dt);
    }
    for (const c of B.cards) c.cd = Math.max(0, c.cd - dt);
    aiUpdate(dt);
    if (B.time <= 0) endBattle(timeWinner());
  } else {
    B.endT += dt;
  }
  for (const u of B.units) if (u.alive || u.death || u.wreck) unitUpdate(u, dt);
  separate(dt);
  // 清掉消失的
  if (B.units.length > 60) B.units = B.units.filter((u) => !u.gone);
  updateProjs(dt);
  updateZones(dt);
  updatePlanes(dt);
  updateFlags(dt);
  updateHQ(dt);
  updateFx(dt);
  decalSnowfall(dt);
}
function separate(dt) {
  const L = [[], [], []];
  for (const u of B.units) if (u.alive && u.isSoldier && !u.para && !(u.act && u.act.k === 'raise')) L[u.lane].push(u);
  for (const arr of L) {
    arr.sort((a, b) => a.x - b.x);
    for (let i = 1; i < arr.length; i++) {
      const a = arr[i - 1], b = arr[i];
      if (a.side !== b.side) continue;
      const d = b.x - a.x, want = 9;
      if (d < want) {
        const push = (want - d) * 0.5 * Math.min(1, dt * 8);
        if (!(a.mortar || a.st === 'prone')) a.x -= push; if (!(b.mortar || b.st === 'prone')) b.x += push;
        if (Math.abs(a.y - b.y) < 6) { a.y -= dt * 6; b.y += dt * 6; }
      }
    }
  }
  for (const u of B.units) if (u.alive && u.isSoldier) u.y = clamp(u.y, LANES[u.lane] - 14, LANES[u.lane] + 14);
}
function timeWinner() {
  const a = B.flags.filter((f) => f.owner === 0).length, b = B.flags.filter((f) => f.owner === 1).length;
  if (a !== b) return a > b ? 0 : 1;
  return B.hq[0].hp / B.hq[0].max >= B.hq[1].hp / B.hq[1].max ? 0 : 1;
}

/* ── 單位行為 ── */
function unitUpdate(u, dt) {
  if (u.isSoldier) {
    if (u.alive) soldierBrain(u, dt);
    animSoldier(u, dt); soldierRig(u);
    if (u.alive && u.spd > 8 && chance(dt * 2.2) && DECAL) decalMark(u.x - u.face * 2, u.y, 2, 0.8, 'rgba(120,130,145,.25)');
  } else {
    if (u.alive) vehBrain(u, dt);
    else if (u.crash) heliCrash(u, dt);
    u.hpFrac = u.hp / u.maxHp;
    animVeh(u, dt);
    if (u.wreck && u.burnT > 26) { u.alpha = Math.max(0, u.alpha - dt * 0.5); if (u.alpha <= 0) u.gone = true; }
  }
}

function dirOf(u) { return u.side === 0 ? 1 : -1; }
function enemyHQ(u) { return B.hq[1 - u.side]; }

/* 找目標：同一條線優先，也打得到相鄰線 */
function findTarget(u, rng, opts) {
  opts = opts || {};
  let best = null, bs = 1e9;
  const pref = opts.prefer;
  for (const e of B.units) {
    if (!e.alive || e.side === u.side) continue;
    if (e.cls === 'air') { if (!opts.air) continue; }
    else if (opts.airOnly) continue;
    if (e.para && e.paraY < -5) continue;
    const dx = Math.abs(e.x - u.x), dl = Math.abs(e.lane - u.lane);
    if (e.cls !== 'air' && dl > (opts.lanes === undefined ? 1 : opts.lanes)) continue;
    const d = Math.hypot(dx, dl * LANE_GAP * 1.5);
    if (d > rng) continue;
    if (opts.min && dx < opts.min) continue;
    let sc = d * (dl ? 1.3 : 1);
    if (pref === 'veh' && (e.cls === 'veh' || e.cls === 'arm')) sc *= 0.35;
    if (pref === 'inf' && e.cls === 'inf') sc *= (e.hero ? 0.3 : e.kind === 'mg' || e.kind === 'at' ? 0.5 : 0.7);
    if (pref === 'air' && e.cls === 'air') sc *= 0.3;
    if (opts.ap && e.cls === 'inf') sc *= 2.4;
    if (sc < bs) { bs = sc; best = e; }
  }
  if (!best && !opts.airOnly) { // 指揮部
    const h = enemyHQ(u);
    if (!h.dead && Math.abs(h.x - u.x) - 50 < rng) best = h;
  }
  return best;
}
function tgtPoint(e) {
  if (e.cls === 'str') return [e.x, e.y - 40];
  if (e.cls === 'air') return [e.x, e.y - e.alt - 4];
  if (e.isVeh) return [e.x, e.y - 22];
  const d = e.death ? 6 : 0;
  return [e.x, e.y - (e.st === 'prone' ? 8 : e.st === 'kneel' || e.st === 'crouch' ? 22 : 30) + d];
}
function inRange(u, e, rng) {
  if (!e || (e.cls !== 'str' && !e.alive) || (e.cls === 'str' && e.dead)) return false;
  if (e.cls === 'str') return Math.abs(e.x - u.x) - 50 < rng;
  if (e.cls === 'air') return Math.abs(e.x - u.x) < rng;
  return Math.hypot(e.x - u.x, (e.lane - u.lane) * LANE_GAP * 1.5) < rng;
}

function soldierBrain(u, dt) {
  const d = u.def, dir = dirOf(u);
  u.sup = Math.max(0, u.sup - dt * 0.5);
  if (u.burn > 0) { u.burn -= dt; if (chance(dt * 12)) fxFlame(u.x, u.y - 20, 0.5); hurt(u, 7 * dt, 'flame', null, dir); if (!u.alive) return; }
  if (u.para) { paraStep(u, dt); return; }
  // 跑步進場
  if (u.state === 'arrive') {
    const tx = u.arriveX;
    u.vx = dir * 72; u.x += u.vx * dt; u.face = dir; setStance(u, 'stand');
    if ((tx - u.x) * dir <= 0) { u.state = 'move'; u.vx = 0; }
    return;
  }
  // 升旗中
  if (u.act && u.act.k === 'raise') { u.vx = 0; return; }
  if (u.act && (u.act.k === 'cheer' || u.act.k === 'salute')) { u.vx = 0; return; }
  // 索敵
  u.tgtT -= dt;
  const rng = d.rng * (u.mortar ? 1 : 1);
  if (u.tgtT <= 0) {
    u.tgtT = rnd(0.25, 0.4);
    if (!inRange(u, u.tgt, rng)) u.tgt = null;
    if (u.mortar) u.tgt = mortarTarget(u, d.rng, d.min);
    else if (!u.tgt || chance(0.25)) u.tgt = findTarget(u, rng, { air: !!d.aa && d.wk !== 'sr', prefer: d.prefer, ap: d.dt === 'ap' }) || u.tgt;
  }
  const t = u.tgt;
  const engaged = t && (t.cls === 'str' ? !t.dead : t.alive);
  const supportUnit = u.mortar || u.crew || d.prone && d.wk === 'sr';
  if (engaged) {
    // 找附近的沙包
    if (!u.cover && d.wk !== 'ft' && !u.mortar && !u.crew) {
      const cv = findCover(u, t);
      if (cv) u.cover = cv;
    }
    if (u.cover) {
      const cx = u.cover.x - dir * 15 + (u.idx || 0) * -dir * 2;
      if (Math.abs(u.x - cx) > 3) { moveTo(u, cx, dt, 1.2); u.wantAim = false; return; }
    }
    u.vx = 0; u.face = Math.sign(t.x - u.x) || dir;
    if (u.mortar) { mortarFire(u, t, dt); return; }
    if (u.crew) { setStance(u, 'kneel'); u.wantAim = false; return; }
    // 姿勢
    const want = d.prone ? 'prone' : u.cover ? (u.burstLeft > 0 || u.cd < 0.5 ? 'kneel' : 'crouch') : u.sup > 0.5 ? 'kneel' : (u.idx % 2 ? 'kneel' : 'stand');
    if (d.wk === 'ft') setStance(u, 'stand'); else setStance(u, want);
    if (d.prone && u.stb < 1) { u.setupT = 0; return; }
    if (d.setup && u.setupT < d.setup) { u.setupT += dt; u.wantAim = false; return; }
    aimAt(u, t);
    if (d.wk === 'ft') { flameFire(u, t, dt); return; }
    if (u.act) return; // 換彈、丟手榴彈中
    // 手榴彈
    if (d.nade) {
      u.nadeT -= dt;
      const tp = tgtPoint(t);
      if (u.nadeT <= 0 && t.cls === 'inf' && Math.abs(t.x - u.x) < 170 && t.lane === u.lane) { u.nadeT = rnd(7, 11); startThrow(u, t.x + rnd(-10, 10), t.y); return; }
    }
    weaponCycle(u, t, dt);
  } else {
    u.wantAim = false; u.burstLeft = 0; u.setupT = Math.max(0, u.setupT - dt);
    // 支援兵種不要衝到最前面
    if (supportUnit || d.wk === 'sr') {
      const front = laneFront(u.side, u.lane, u);
      if (front !== null && (u.x - (front - dir * (u.mortar || u.crew ? 200 : 120))) * dir > 0) { u.vx = 0; setStance(u, d.prone ? 'prone' : 'stand'); return; }
    }
    u.cover = null;
    if (u.act) { u.vx = 0; return; }
    if (u.ammo < u.mag * 0.5 && d.wk === 'ar') { u.ammo = u.mag; startReload(u); return; }
    setStance(u, 'stand');
    // 往前推進（被壓制就慢）
    const sp = d.spd * u.speedMul * (1 - u.sup * 0.6);
    u.vx = dir * sp; u.face = dir;
    u.x += u.vx * dt;
    // 不要穿過敵方指揮部
    const h = enemyHQ(u);
    if ((u.x - (h.x - dir * 70)) * dir > 0) { u.x = h.x - dir * 70; u.vx = 0; }
  }
}
function moveTo(u, x, dt, mul) { const dx = x - u.x, s = u.def.spd * (mul || 1) * u.speedMul; u.vx = Math.sign(dx) * s; u.face = Math.sign(dx) || u.face; u.x += clamp(u.vx * dt, -Math.abs(dx), Math.abs(dx)); setStance(u, 'stand'); }
function findCover(u, t) {
  const dir = Math.sign(t.x - u.x) || dirOf(u);
  let best = null, bd = 60;
  for (const c of B.covers) {
    if (c.lane !== u.lane || c.hp <= 0) continue;
    const ahead = (c.x - u.x) * dir;
    if (ahead < -10 || ahead > 60) continue;
    if ((c.x - t.x) * dir > -20) continue; // 沙包要在我和敵人之間
    if (ahead < bd) { bd = ahead; best = c; }
  }
  return best;
}
function laneFront(side, lane, me) {
  let f = null;
  for (const v of B.units) {
    if (!v.alive || v.side !== side || v.lane !== lane || v === me || v.cls === 'air') continue;
    if (v.mortar || v.crew || v.kind === 'mlrs' || (v.def && v.def.wk === 'sr')) continue;
    if (f === null || (v.x - f) * (side ? -1 : 1) > 0) f = v.x;
  }
  return f;
}
function aimAt(u, t) {
  const tp = tgtPoint(t);
  const sh = u.rig.sh;
  const lx = (tp[0] - u.x) * u.face - sh[0], ly = tp[1] - (u.y + sh[1]);
  u.aimTA = clamp(Math.atan2(ly, Math.max(10, lx)), -1.15, 0.6);
  u.wantAim = true;
}
function weaponCycle(u, t, dt) {
  const d = u.def;
  if (u.aimB < 0.85) return;
  if (u.burstLeft > 0) {
    u.burstT -= dt;
    const rate = u.skillT > 0 && u.hero === 'boiler' ? 3 : 1;
    if (u.burstT <= 0) { fireShot(u, t); u.burstLeft--; u.ammo--; u.burstT = d.gap / rate; }
    return;
  }
  u.cd -= dt * (u.skillT > 0 && u.hero === 'boiler' ? 3 : 1);
  if (u.cd > 0) return;
  if (u.ammo <= 0 && u.mag > 1) { u.ammo = u.mag; startReload(u); u.cd = 0.2; return; }
  u.burstLeft = d.burst || 1; u.burstT = 0;
  u.cd = d.cd * rnd(0.85, 1.15);
}
function fireShot(u, t) {
  const d = u.def, tp = tgtPoint(t);
  const m = weaponPt(u, u.w.muzzle);
  u.rec = 1;
  setExpr(u, chance(0.25) ? 's' : 'f', 0.3);
  fxMuzzle(u);
  if (d.wk === 'rpg') {
    u.warhead = false; startReload(u);
    sfx('rpg', u.x);
    fireRocket(u, m[0], m[1], t, tp, d);
    return;
  }
  sfx(d.wk === 'sr' ? 'sniper' : d.wk === 'mg' ? 'mg' : u.side ? 'rifleE' : 'rifle', u.x);
  if (d.wk === 'sr') startReload(u);
  let acc = d.acc * (1 - u.sup * 0.45) * smokeFactor(u, t);
  const dist = Math.abs(tp[0] - u.x);
  acc *= clamp(1.15 - dist / (d.rng * 1.6), 0.45, 1.1);
  if (t.cls === 'inf' && t.cover && coverProtects(t, u)) acc *= 0.6;
  if (t.st === 'prone') acc *= 0.75;
  const hit = Math.random() < acc;
  const dmg = d.dmg * u.dm * (u.hero ? 1 : 1);
  shootBullet(u, m[0], m[1], t, hit, dmg, d.dt, u.side ? PAL[u.pal].tracer : PAL.us.tracer, d.wk === 'sr' ? 1.6 : 1);
  if (d.suppress || u.hero === 'boiler') suppressAround(t, u, u.skillT > 0 ? 0.5 : 0.18);
}
function coverProtects(t, src) {
  const c = t.cover; if (!c || c.hp <= 0) return false;
  return Math.abs(t.x - c.x) < 30 && Math.sign(t.x - c.x) !== Math.sign(src.x - c.x);
}
function suppressAround(t, src, k) {
  for (const e of B.units) if (e.alive && e.isSoldier && e.side !== src.side && Math.abs(e.x - t.x) < 50 && e.lane === t.lane) e.sup = Math.min(1, e.sup + k);
}
function smokeFactor(a, b) {
  let f = 1;
  for (const z of B.zones) if (z.k === 'smoke') {
    const inA = Math.hypot(a.x - z.x, (a.y - z.y) * 1.6) < z.r, inB = Math.hypot(b.x - z.x, (b.y - z.y) * 1.6) < z.r;
    if (inA || inB) f *= 0.4;
  }
  return f;
}

/* 噴火 */
function flameFire(u, t, dt) {
  const d = u.def;
  if (Math.abs(t.x - u.x) > d.rng + 10 && t.cls !== 'str') { u.vx = dirOf(u) * d.spd; u.x += u.vx * dt; return; }
  u.flT = (u.flT || 0) - dt;
  const m = weaponPt(u, u.w.muzzle);
  if (u.flT <= 0) { u.flT = 0.03; flameParticle(m[0], m[1], u.face, u.rig.wa); }
  if (chance(dt * 3)) sfx('flame', u.x);
  u.rec = 0.25;
  // 範圍傷害：前方扇形
  for (const e of B.units) {
    if (!e.alive || e.side === u.side || e.cls === 'air') continue;
    const dx = (e.x - u.x) * u.face;
    if (dx < -6 || dx > d.rng + 10 || Math.abs(e.lane - u.lane) > 0) continue;
    hurt(e, d.dmg * u.dm * dt, 'flame', u, u.face);
    if (e.isSoldier && e.alive) e.burn = Math.max(e.burn, 2.2);
  }
  for (const c of B.covers) if (c.lane === u.lane && (c.x - u.x) * u.face > 0 && (c.x - u.x) * u.face < d.rng) c.hp -= 8 * dt;
  const h = enemyHQ(u); if (!h.dead && Math.abs(h.x - u.x) - 50 < d.rng) hurt(h, d.dmg * dt * 0.8, 'flame', u, u.face);
}
function flameParticle(x, y, face, wa) {
  const a = face > 0 ? wa : Math.PI - wa;
  for (let i = 0; i < 2; i++) {
    const sp = rnd(220, 300), aa = a + rnd(-0.08, 0.08);
    P('fire', x, y, { vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp - 10, ay: 80, drag: 2.4, max: rnd(0.35, 0.55), size: rnd(0.16, 0.26), add: true, grow: 0.5 });
  }
  if (chance(0.3)) P('smoke', x + Math.cos(a) * 60, y - 6, { vx: Math.cos(a) * 60, vy: -rnd(10, 30), max: 1.2, size: 0.14, grow: 0.5, alpha: 0.45, spr: FXS.smokeD });
}

/* 迫擊砲 */
function mortarTarget(u, rng, min) {
  // 找最密集的敵人
  let best = null, bs = 0;
  for (const e of B.units) {
    if (!e.alive || e.side === u.side || e.cls === 'air') continue;
    const dx = Math.abs(e.x - u.x);
    if (dx > rng || dx < min || Math.abs(e.lane - u.lane) > 1) continue;
    let n = 0; for (const o of B.units) if (o.alive && o.side === e.side && o.cls !== 'air' && Math.abs(o.x - e.x) < 50 && o.lane === e.lane) n += o.cls === 'inf' ? 1 : 1.5;
    if (e.cover) n += 1;
    if (n > bs) { bs = n; best = e; }
  }
  if (!best) { const h = enemyHQ(u); if (!h.dead && Math.abs(h.x - u.x) < rng) best = h; }
  return best;
}
function mortarFire(u, t, dt) {
  setStance(u, 'kneel');
  const m = u.mortar;
  if (!m.rdy) { u.setupT += dt; if (u.setupT > u.def.setup) m.rdy = true; return; }
  u.cd -= dt;
  m.rec = Math.max(0, m.rec - dt * 4);
  const dist = Math.abs(t.x - u.x);
  m.a = damp(m.a, lerp(1.25, 0.82, clamp(dist / u.def.rng, 0, 1)), 3, dt);
  const loader = B.units.find((o) => o.squad === u.squad && o.crew && o.alive);
  if (u.cd <= 0) {
    u.cd = u.def.cd * rnd(0.9, 1.1);
    const go = () => {
      if (!u.alive) return;
      m.rec = 1; sfx('mortar', u.x);
      const mx = u.x + u.face * 14, my = u.y - 16;
      P('flash', mx, my - 6, { rot: -Math.PI / 2 + (u.face > 0 ? 0.4 : -0.4), max: 0.06, size: 0.8, spr: FXS.mf2 });
      for (let i = 0; i < 6; i++) P('smoke', mx, my - 6, { vx: rnd(-30, 30), vy: -rnd(20, 60), drag: 2, max: rnd(0.8, 1.4), size: 0.16, grow: 0.5, alpha: 0.6, spr: FXS.smoke });
      const tp = [t.x + rnd(-24, 24), (t.cls === 'str' ? t.y : t.y) + rnd(-6, 6)];
      const gk = hasDocB(u.side, 'gunner') ? 1.1 : 1, gr = hasDocB(u.side, 'gunner') ? 1.2 : 1;
      B.projs.push({ k: 'mortar', side: u.side, x: mx, y: my - 8, sx: mx, sy: my - 8, tx: tp[0], ty: tp[1], t: 0, dur: 1.5 + Math.abs(tp[0] - mx) / 900, h: 300, dmg: u.def.dmg * u.dm * gk, r: u.def.r * gr, whistled: false, src: u });
      if (loader) { loader.face = u.face; setStance(loader, 'crouch'); }
    };
    if (loader) { loader.act = { k: 'mload', t: 0, d: 0.55, done: go }; } else go();
  }
}

/* ── 載具 ── */
function vehBrain(u, dt) {
  const d = u.def, dir = dirOf(u), k = u.kind;
  if (u.skillT > 0) u.skillT -= dt;
  if (u.skillCd > 0) u.skillCd -= dt;
  if (u.state === 'arrive') {
    u.vx = dir * (k === 'heli' ? 140 : 90); u.x += u.vx * dt; u.face = dir;
    if (k === 'heli') u.alt = damp(u.alt, u.altT, 2, dt);
    if ((u.arriveX - u.x) * dir <= 0) u.state = 'move';
    return;
  }
  if (k === 'heli') { heliBrain(u, dt); return; }
  u.tgtT -= dt;
  const rng = k === 'aa' ? d.rng : d.rng;
  if (u.tgtT <= 0) {
    u.tgtT = rnd(0.3, 0.5);
    if (k === 'aa') u.tgt = findTarget(u, d.rng, { airOnly: true, air: true, lanes: 3 }) || findTarget(u, d.groundRng, {});
    else if (k === 'mlrs') u.tgt = mortarTarget(u, d.rng, d.min);
    else u.tgt = findTarget(u, rng, { air: k === 'apc', prefer: k === 'tank' ? null : null });
    if (k === 'tank' || u.hero === 'holder') u.coaxTgt = findTarget(u, d.coax.rng, { prefer: 'inf', air: true });
  }
  const t = u.tgt;
  const eng = t && (t.cls === 'str' ? !t.dead : t.alive) && inRange(u, t, k === 'aa' && t.cls !== 'air' ? d.groundRng : rng);
  // 運兵車：遇敵或到旗點就放人
  if (k === 'apc' && u.cargo > 0) {
    const nearFlag = B.flags.some((f) => f.lane === u.lane && f.owner !== u.side && Math.abs(f.x - u.x) < 80);
    const threat = findTarget(u, 230, {});
    if (nearFlag || threat || u.unloading) { apcUnload(u, dt); return; }
  }
  if (k === 'mlrs') { mlrsBrain(u, t, eng, dt); return; }
  if (eng) {
    u.vx = damp(u.vx, 0, 6, dt);
    const tp = tgtPoint(t);
    const ang = Math.atan2(-(tp[1] - (u.y - 45)), Math.abs(tp[0] - u.x));
    u.aimTA = clamp(ang, k === 'aa' ? 0 : -0.12, k === 'aa' ? 1.2 : 0.3);
    if (k === 'aa' && t.cls === 'air') u.aimTA = clamp(Math.atan2(-(tp[1] - (u.y - 40)), Math.abs(tp[0] - u.x)), 0.15, 1.25);
    u.cd -= dt;
    if (k === 'tank') {
      if (u.cd <= 0 && Math.abs(u.aimA - u.aimTA) < 0.05) { u.cd = d.cd * rnd(0.9, 1.1); tankFire(u, t); if (u.skillShots > 0) { u.skillShots--; u.cd = 0.6; } }
    } else { // 運兵車機槍、防空砲
      if (u.burstLeft > 0) { u.burstT -= dt; if (u.burstT <= 0) { vehShot(u, t); u.burstLeft--; u.burstT = d.gap; } }
      else if (u.cd <= 0) { u.burstLeft = d.burst; u.cd = d.cd; }
    }
  } else {
    // 前進；坦克在步兵後面一點點
    let sp = d.spd;
    const h = enemyHQ(u);
    const stopX = h.x - dir * (k === 'tank' ? 200 : 160);
    if ((u.x - stopX) * dir > 0) sp = 0;
    // 不要疊在一起
    for (const o of B.units) if (o !== u && o.alive && o.isVeh && o.cls !== 'air' && o.side === u.side && o.lane === u.lane && (o.x - u.x) * dir > 0 && (o.x - u.x) * dir < 90) sp = Math.min(sp, o.vx * dir);
    u.vx = damp(u.vx, dir * Math.max(0, sp), 2.5, dt);
    u.x += u.vx * dt; u.face = dir;
    u.aimTA = 0;
  }
  // 同軸機槍
  if ((k === 'tank') && u.coaxTgt && u.coaxTgt.alive && inRange(u, u.coaxTgt, d.coax.rng)) {
    const c = d.coax;
    u.coaxCd -= dt;
    if (u.burstLeft > 0) { u.burstT -= dt; if (u.burstT <= 0) { coaxShot(u, u.coaxTgt); u.burstLeft--; u.burstT = c.gap; } }
    else if (u.coaxCd <= 0) { u.coaxCd = c.cd; u.burstLeft = c.burst; }
  }
  if (u.hero && u.skillT <= 0 && u.skillOn) { u.skillOn = false; }
}
function tankFire(u, t) {
  const d = u.def, m = vehMuzzle(u);
  u.recoil = 1; u.antV += 4 * -u.face; u.pitchV -= 1.4;
  P('flash', m[0], m[1], { rot: m[2], max: 0.08, size: 1.8 * (u.scale || 1), spr: FXS.mf1 });
  P('glow', m[0], m[1], { max: 0.18, size: 1.5, spr: FXS.gO, add: true });
  for (let i = 0; i < 10; i++) { const a = m[2] + rnd(-0.9, 0.9); P('smoke', m[0], m[1], { vx: Math.cos(a) * rnd(30, 110), vy: Math.sin(a) * rnd(20, 60) - 14, drag: 2.4, max: rnd(0.9, 1.8), size: 0.22, grow: 0.75, alpha: 0.7, spr: FXS.smoke }); }
  for (let i = 0; i < 6; i++) P('smoke', u.x + u.face * rnd(30, 80), u.y - 1, { vx: u.face * rnd(20, 80), vy: -rnd(4, 20), drag: 3, max: rnd(0.6, 1.1), size: 0.2, grow: 0.6, alpha: 0.6, spr: FXS.dust, layer: 0 });
  // 退彈殼
  P('casing', u.x - u.face * 4, u.y - 56, { vx: -u.face * rnd(30, 60), vy: -rnd(90, 140), ay: 520, vrot: rnd(-12, 12), max: 3, gy: u.y + 2, col: '#d8a94a', size: 3, bounce: 0.3 });
  addShake(2.4); sfx('cannon', u.x);
  const tp = tgtPoint(t);
  const acc = d.acc * smokeFactor(u, t) * (t.cls === 'inf' ? 0.85 : 1);
  const hit = Math.random() < acc;
  const tx = hit ? tp[0] : tp[0] + rnd(-40, 40), ty = hit ? tp[1] : t.y + rnd(-10, 8);
  B.projs.push({ k: 'shell', side: u.side, x: m[0], y: m[1], tx, ty: hit ? ty : Math.max(ty, t.y), vx: 0, vy: 0, sp: 1500, dmg: d.dmg * u.dm, r: d.r, tgt: hit ? t : null, src: u, life: 0 });
}
function coaxShot(u, t) {
  const tp = tgtPoint(t), s = u.scale || 1;
  const mx = u.x + u.face * 30 * s, my = u.y - 46 * s;
  u.coax = 1;
  sfx('mg', u.x, 0.7);
  const hit = Math.random() < 0.5 * smokeFactor(u, t);
  shootBullet(u, mx, my, t, hit, u.def.coax.dmg * u.dm, 'bullet', u.side ? PAL[u.pal] && PAL[u.pal].tracer || '#ffc49a' : PAL.us.tracer, 1);
}
function vehShot(u, t) {
  const d = u.def, k = u.kind;
  const m = vehMuzzle(u, u.gunSide);
  u.recoil = 1; if (k === 'aa') u.gunSide = 1 - u.gunSide;
  P('flash', m[0], m[1], { rot: m[2], max: 0.05, size: 0.7, spr: FXS['mf' + rndi(0, 2)] });
  sfx(k === 'aa' ? 'flak' : 'mg', u.x);
  const air = t.cls === 'air';
  const dt2 = k === 'aa' ? (air ? 'flak' : 'bullet') : 'bullet';
  const hit = Math.random() < d.acc * smokeFactor(u, t);
  shootBullet(u, m[0], m[1], t, hit, (k === 'aa' && !air ? 8 : d.dmg) * u.dm, dt2, k === 'aa' ? '#ffe28a' : (u.side ? '#ffc49a' : PAL.us.tracer), 1.2);
  if (k === 'aa' && air) { const tp = tgtPoint(t); P('smoke', tp[0] + rnd(-30, 30), tp[1] + rnd(-30, 20), { vx: rnd(-10, 10), vy: -rnd(2, 8), max: rnd(0.8, 1.4), size: 0.14, grow: 0.3, alpha: 0.85, spr: FXS.smokeD }); }
  P('casing', u.x - u.face * 6, u.y - 40, { vx: -u.face * rnd(20, 50), vy: -rnd(60, 100), ay: 520, vrot: rnd(-20, 20), max: 2, gy: u.y + rnd(-2, 4), col: '#d8b04a', size: 1.6, bounce: 0.3 });
}
function apcUnload(u, dt) {
  u.vx = damp(u.vx, 0, 5, dt);
  u.unloading = true;
  u.ramp = Math.min(1, u.ramp + dt * 1.4);
  if (u.ramp >= 1) {
    u.unT = (u.unT || 0) - dt;
    if (u.unT <= 0 && u.cargo > 0) {
      u.unT = 0.32; u.cargo--;
      const pal = u.side ? B.rival.pal : 'us';
      const s = mkSoldier(u.side, 'rifle', UDEF.rifle, u.lane, u.x - u.face * 46, pal, 'ar');
      s.state = 'move'; s.idx = 3 - u.cargo; s.squad = u.id; s.x -= u.face * 6;
      fxStep(s.x, s.y, true);
    }
    if (u.cargo <= 0) { u.unloading = false; u.ramp = 0.99; }
  }
}
function mlrsBrain(u, t, eng, dt) {
  const d = u.def;
  if (eng && t) {
    u.vx = damp(u.vx, 0, 5, dt);
    u.jacks = Math.min(1, u.jacks + dt / 0.9);
    if (u.jacks >= 1) u.pod = Math.min(1, u.pod + dt / 1.1);
    if (u.pod < 1) return;
    u.cd -= dt;
    if (u.cd <= 0 && !u.salvo) { u.salvo = d.salvo; u.salvoT = 0; u.cd = d.cd; u.salvoTgt = t; }
  } else if (!u.salvo) {
    u.pod = Math.max(0, u.pod - dt / 1.1);
    if (u.pod <= 0) u.jacks = Math.max(0, u.jacks - dt / 0.8);
    if (u.jacks <= 0) {
      const front = laneFront(u.side, u.lane, u), dir = dirOf(u);
      let sp = d.spd;
      if (front !== null && (u.x - (front - dir * 260)) * dir > 0) sp = 0;
      u.vx = damp(u.vx, dir * sp, 2.5, dt); u.x += u.vx * dt; u.face = dir;
    }
  }
  if (u.salvo > 0) {
    u.salvoT -= dt;
    if (u.salvoT <= 0) {
      u.salvoT = 0.13; u.salvo--;
      const tg = u.salvoTgt && (u.salvoTgt.alive || (u.salvoTgt.cls === 'str' && !u.salvoTgt.dead)) ? u.salvoTgt : t;
      if (!tg) { u.salvo = 0; return; }
      const m = vehMuzzle(u);
      u.recoil = 1;
      sfx('launch', u.x);
      P('flash', m[0], m[1], { rot: m[2], max: 0.06, size: 1, spr: FXS.mf2 });
      for (let i = 0; i < 5; i++) P('smoke', u.x - u.face * rnd(20, 50), u.y - rnd(20, 40), { vx: -u.face * rnd(40, 120), vy: rnd(-20, 30), drag: 2.4, max: rnd(1, 2), size: 0.25, grow: 0.8, alpha: 0.6, spr: i % 2 ? FXS.smoke : FXS.dust });
      const tx = tg.x + rnd(-60, 60), ty = (tg.cls === 'str' ? tg.y : LANES[tg.lane]) + rnd(-26, 26);
      const gk = hasDocB(u.side, 'gunner') ? 1.1 : 1, gr = hasDocB(u.side, 'gunner') ? 1.2 : 1;
      B.projs.push({ k: 'arty', side: u.side, x: m[0], y: m[1], sx: m[0], sy: m[1], tx, ty, t: 0, dur: 1.6 + Math.abs(tx - m[0]) / 1100, h: 260 + rnd(0, 80), dmg: d.dmg * u.dm * gk, r: d.r * gr, trail: true });
    }
  }
}

/* ── 直升機 ── */
function heliBrain(u, dt) {
  const d = u.def, dir = dirOf(u);
  u.alt = damp(u.alt, u.altT + Math.sin(B.t * 1.4 + u.id) * 6, 2, dt);
  u.tgtT -= dt;
  if (u.tgtT <= 0) { u.tgtT = 0.4; u.tgt = findTarget(u, d.rng + 60, { air: true, lanes: 3 }); }
  const t = u.tgt;
  if (u.hero === 'ilya' && u.skillT > 0) { heliStrafe(u, dt); return; }
  if (t && (t.cls === 'str' ? !t.dead : t.alive)) {
    // 保持距離懸停射擊
    const want = t.x - dir * (d.rng * 0.75);
    const dx = want - u.x;
    u.vx = damp(u.vx, clamp(dx * 1.4, -d.spd, d.spd), 2, dt);
    u.x += u.vx * dt; u.face = Math.sign(t.x - u.x) || dir;
    const tp = tgtPoint(t);
    const lx = Math.abs(tp[0] - u.x), ly = tp[1] - (u.y - u.alt + 12);
    u.aimTA = -clamp(Math.atan2(ly, lx), -0.2, 1.1);
    u.cd -= dt;
    if (Math.abs(t.x - u.x) < d.rng + 30) {
      if (u.burstLeft > 0) { u.burstT -= dt; if (u.burstT <= 0) { heliShot(u, t); u.burstLeft--; u.burstT = d.gap; } }
      else if (u.cd <= 0) { u.burstLeft = d.burst; u.cd = d.cd; }
      u.rocketCd -= dt;
      if (u.rocketCd <= 0 && t.cls !== 'air') { u.rocketCd = d.rockets.cd; heliRockets(u, t, d.rockets.n); }
    }
  } else {
    const h = enemyHQ(u);
    const stopX = h.x - dir * 330;
    const sp = (u.x - stopX) * dir > 0 ? 0 : d.spd;
    u.vx = damp(u.vx, dir * sp, 1.5, dt); u.x += u.vx * dt; u.face = dir;
    u.aimTA = 0.2;
  }
}
function heliShot(u, t) {
  const m = vehMuzzle(u); u.coax = 1;
  P('flash', m[0], m[1], { rot: m[2], max: 0.05, size: 0.6, spr: FXS['mf' + rndi(0, 2)] });
  sfx('mg', u.x, 0.8);
  const hit = Math.random() < u.def.acc * smokeFactor(u, t);
  shootBullet(u, m[0], m[1], t, hit, u.def.dmg * u.dm, 'bullet', u.side ? '#ffc49a' : PAL.us.tracer, 1);
  P('casing', u.x + u.face * 30, u.y - u.alt + 14, { vx: -u.face * rnd(10, 40), vy: rnd(0, 30), ay: 520, vrot: rnd(-20, 20), max: 2, gy: u.y + rnd(-3, 3), col: '#d8b04a', size: 1.2, bounce: 0.3 });
}
function heliRockets(u, t, n) {
  for (let i = 0; i < n; i++) {
    setTimeoutG(() => {
      if (!u.alive) return;
      const s = u.scale || 1, c = Math.cos(u.tilt), sn = Math.sin(u.tilt);
      const lx = 10 * s, ly = 5 * s;
      const x = u.x + u.face * (lx * c - ly * sn), y = u.y - u.alt + (lx * sn + ly * c);
      const tp = t.alive || t.cls === 'str' ? tgtPoint(t) : [t.x, t.y];
      fireRocket(u, x, y, t, [tp[0] + rnd(-30, 30), (t.cls === 'str' ? t.y : t.y) + rnd(-8, 4)], { dmg: u.def.rockets.dmg * u.dm, dt: 'he', r: u.def.rockets.r }, true);
      sfx('rpg', u.x, 0.6);
      P('flash', x, y, { rot: u.face > 0 ? Math.PI : 0, max: 0.06, size: 0.8, spr: FXS.mf2 });
    }, i * 0.14);
  }
}
function heliStrafe(u, dt) {
  const dir = dirOf(u);
  u.vx = damp(u.vx, dir * 170, 3, dt); u.x += u.vx * dt; u.face = dir;
  u.alt = damp(u.alt, 70, 3, dt);
  u.strT = (u.strT || 0) - dt;
  if (u.strT <= 0) {
    u.strT = 0.16;
    const tx = u.x + dir * 170, lane = u.lane;
    fireRocket(u, u.x + dir * 10, u.y - u.alt + 6, null, [tx + rnd(-20, 20), LANES[lane] + rnd(-30, 30)], { dmg: 70 * u.dm, dt: 'he', r: 40 }, true);
    sfx('rpg', u.x, 0.5);
  }
  const h = enemyHQ(u);
  if ((u.x - (h.x - dir * 200)) * dir > 0) u.skillT = 0;
}
function heliCrash(u, dt) {
  u.crashT = (u.crashT || 0) + dt;
  u.spin = (u.spin || 0.01) + dt * 7;
  u.alt -= (40 + u.crashT * 160) * dt;
  u.x += u.vx * dt; u.vx *= 0.99;
  u.rotor += dt * 20;
  if (chance(0.7)) fxSmokeTrail(u.x - u.face * 20, u.y - u.alt - 10, 1.4, true);
  if (chance(0.5)) fxFlame(u.x, u.y - u.alt - 6, 0.8);
  if (u.alt <= 4) {
    u.alt = 0; u.crash = false; u.wreck = true; u.spin = 0; u.burnT = 0;
    fxExplosion(u.x, u.y, 1.6, { fire: true, metal: true, debris: 16 });
    splash(u.x, u.y, 70, 120, 'he', 1 - u.side, null);
  }
}

/* ── 子彈、砲彈、火箭、手榴彈 ── */
const TIMERS = [];
function setTimeoutG(fn, s) { TIMERS.push({ fn, t: s }); }
function shootBullet(src, x, y, t, hit, dmg, dtype, col, w) {
  const tp = tgtPoint(t);
  let tx = tp[0], ty = tp[1];
  if (!hit) {
    if (t.cls === 'air') { tx += rnd(-40, 40); ty += rnd(-40, 30); }
    else { tx += rnd(-22, 22) * (1 + Math.abs(tx - x) / 400); ty = t.cls === 'str' ? ty + rnd(-30, 30) : t.y + rnd(-6, 8); }
  } else { tx += rnd(-4, 4); ty += rnd(-6, 6); }
  const d = Math.hypot(tx - x, ty - y);
  B.projs.push({ k: 'bullet', side: src.side, x, y, sx: x, sy: y, tx, ty, t: 0, dur: d / 2100, hit, dmg, dtype, tgt: t, src, col, w: w || 1, air: t.cls === 'air' });
}
function fireRocket(src, x, y, t, tp, d, fromAir) {
  B.projs.push({ k: 'rocket', side: src.side, x, y, tx: tp[0], ty: tp[1], sp: fromAir ? 640 : 560, t: 0, dmg: (d.dmg || 0) * (src.dm || 1), dtype: d.dt || 'ap', r: d.r || 22, tgt: t, src, wob: rnd(0, 6), hit: !t || Math.random() < (d.acc || 0.9) * smokeFactor(src, t || src) });
}
function throwGrenade(u, tx, ty) {
  if (!u.alive && !u.death) return;
  const h = weaponPt(u, [0, 0]);
  const x = u.x + u.face * 8, y = u.y + u.rig.hn[1];
  sfx('pin', u.x);
  B.projs.push({ k: 'nade', side: u.side, x, y, sx: x, sy: y, tx, ty, t: 0, dur: 0.75, h: 70, fuse: 0.5, dmg: 42 * (u.dm || 1), r: 40, rot: 0, bounced: false });
}
function updateProjs(dt) {
  for (let i = TIMERS.length - 1; i >= 0; i--) { TIMERS[i].t -= dt; if (TIMERS[i].t <= 0) { const f = TIMERS[i].fn; TIMERS.splice(i, 1); f(); } }
  const keep = [];
  for (const p of B.projs) {
    let done = false;
    if (p.k === 'bullet') {
      p.t += dt; const k = Math.min(1, p.t / p.dur);
      p.px = p.x; p.py = p.y;
      p.x = lerp(p.sx, p.tx, k); p.y = lerp(p.sy, p.ty, k);
      if (k >= 1) {
        done = true;
        const t = p.tgt;
        if (p.hit && t && (t.cls === 'str' ? !t.dead : t.alive)) {
          let dmg = p.dmg;
          if (t.cls === 'inf' && coverProtects(t, p.src)) dmg *= hasDocB(t.side, 'trench') ? 0.375 : 0.5;
          hurt(t, dmg, p.dtype, p.src, Math.sign(p.tx - p.sx));
          fxImpact(p.tx, p.ty, t.cls === 'inf' ? 'flesh' : 'metal', Math.sign(p.tx - p.sx));
          if (t.cls !== 'inf' && chance(0.3)) sfx('ric', p.tx);
        } else if (!p.air) {
          // 打到沙包或地上
          fxImpact(p.tx, Math.max(p.ty, p.ty), 'snow', 1);
        }
      }
    } else if (p.k === 'shell' || p.k === 'rocket') {
      p.life = (p.life || 0) + dt;
      const sp = p.sp || 1400;
      let tx = p.tx, ty = p.ty;
      if (p.tgt && p.hit !== false && (p.tgt.alive || (p.tgt.cls === 'str' && !p.tgt.dead))) { const tp = tgtPoint(p.tgt); tx = tp[0]; ty = tp[1]; }
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      const step = sp * dt;
      p.px = p.x; p.py = p.y;
      if (p.k === 'rocket') { p.wob += dt * 20; const wy = Math.sin(p.wob) * 0.6; p.y += wy; if (chance(0.9)) P('smoke', p.x, p.y, { vx: rnd(-6, 6), vy: -rnd(2, 8), max: rnd(0.5, 0.9), size: 0.08, grow: 0.35, alpha: 0.55, spr: FXS.smoke }); }
      if (d <= step || p.life > 3) {
        done = true; p.x = tx; p.y = ty;
        if (p.k === 'shell') {
          fxExplosion(tx, Math.max(ty, p.tgt ? p.tgt.y - 4 : ty), 0.9, { debris: 8 });
          if (p.tgt && (p.tgt.alive || (p.tgt.cls === 'str' && !p.tgt.dead))) hurt(p.tgt, p.dmg, 'shell', p.src, Math.sign(dx));
          splash(tx, p.tgt ? p.tgt.y : ty, p.r, p.dmg * 0.6, 'shell', 1 - p.side, p.tgt);
        } else {
          const gy = p.tgt && p.tgt.cls !== 'air' ? p.tgt.y : ty;
          fxExplosion(tx, p.tgt && p.tgt.cls === 'air' ? ty : gy, p.dtype === 'ap' ? 0.7 : 0.75, { debris: 6 });
          if (p.tgt && p.hit && (p.tgt.alive || (p.tgt.cls === 'str' && !p.tgt.dead))) hurt(p.tgt, p.dmg, p.dtype, p.src, Math.sign(dx));
          splash(tx, gy, p.r, p.dtype === 'ap' ? p.dmg * 0.18 : p.dmg * 0.8, 'he', 1 - p.side, p.hit ? p.tgt : null);
        }
      } else { p.x += (dx / d) * step; p.y += (dy / d) * step; p.ang = Math.atan2(dy, dx); }
    } else if (p.k === 'mortar' || p.k === 'arty' || p.k === 'nade' || p.k === 'bomb' || p.k === 'crate') {
      p.t += dt;
      const k = Math.min(1, p.t / p.dur);
      p.px = p.x; p.py = p.y;
      p.x = lerp(p.sx, p.tx, k);
      p.y = lerp(p.sy, p.ty, k) - Math.sin(Math.PI * k) * p.h;
      p.ang = Math.atan2(p.y - p.py, p.x - p.px);
      if ((p.k === 'mortar' || p.k === 'arty') && !p.whistled && p.dur - p.t < 0.9) { p.whistled = true; sfx('whistle', p.tx); }
      if (p.k === 'arty' && chance(0.85)) P('smoke', p.x, p.y, { vx: rnd(-5, 5), vy: -rnd(2, 8), max: rnd(0.6, 1.1), size: 0.09, grow: 0.35, alpha: 0.55, spr: FXS.smoke });
      if (p.k === 'nade') p.rot = (p.rot || 0) + dt * 14;
      if (k >= 1) {
        if (p.k === 'nade') {
          p.fuse -= dt;
          if (!p.bounced) { p.bounced = true; fxStep(p.x, p.y); }
          if (p.fuse > 0) { keep.push(p); continue; }
          fxExplosion(p.tx, p.ty, 0.6, { debris: 6 }); splash(p.tx, p.ty, p.r, p.dmg, 'he', 1 - p.side, null);
        } else if (p.k === 'crate') {
          B.zones.push({ k: 'medic', side: p.side, x: p.tx, y: p.ty, r: 110, t: 5, max: 5 });
          P('smoke', p.tx, p.ty, { vy: -10, max: 1.5, size: 0.3, grow: 0.6, alpha: 0.6, spr: FXS.gG });
          sfx('coin', p.tx);
        } else {
          const big = p.k === 'bomb' ? 1.35 : p.k === 'arty' ? 0.85 : 0.8;
          fxExplosion(p.tx, p.ty, big, { debris: 10, fire: p.k === 'bomb' });
          splash(p.tx, p.ty, p.r, p.dmg, 'he', 1 - p.side, null);
        }
        done = true;
      }
    }
    if (!done) keep.push(p);
  }
  B.projs = keep;
}
/* 範圍傷害：y 方向距離放大，越遠越輕 */
function splash(x, y, r, dmg, dtype, side, skip) {
  for (const e of B.units) {
    if (!e.alive || e === skip || (side !== undefined && side !== null && e.side !== side) || e.cls === 'air') continue;
    const d = Math.hypot(e.x - x, (e.y - y) * 1.7);
    if (d > r + (e.isVeh ? 30 : 0)) continue;
    const k = 1 - clamp(d / (r + 1), 0, 1) * 0.65;
    let dd = dmg * k;
    if (e.isSoldier && e.cover && e.cover.hp > 0 && Math.abs(e.x - e.cover.x) < 30 && Math.sign(e.x - e.cover.x) !== Math.sign(x - e.cover.x)) dd *= 0.55;
    if (e.st === 'prone') dd *= 0.7;
    hurt(e, dd, dtype, null, Math.sign(e.x - x) || 1, true);
  }
  for (const c of B.covers) if (Math.hypot(c.x - x, (c.y - y) * 1.7) < r) c.hp -= dmg * 0.4;
  for (const h of B.hq) if (!h.dead && (side === undefined || side === null || h.side === side) && Math.abs(h.x - x) < 60 + r) hurt(h, dmg * 0.6, dtype, null, 1, true);
}

/* 受傷與陣亡 */
function hurt(e, dmg, dtype, src, dir, blast) {
  if (e.cls === 'str') {
    if (e.dead) return;
    e.hp -= dmg * (DMUL[dtype] ? DMUL[dtype].str : 1);
    e.flash = 0.08; e.dmgT = 0.5;
    if (e.side === 0 && B.hqSaid <= 0) { radio(pick(RADIO.hqHit)); B.hqSaid = 25; }
    if (e.hp <= 0) { e.hp = 0; hqDestroyed(e); }
    return;
  }
  if (!e.alive) return;
  let m = DMUL[dtype] ? DMUL[dtype][e.cls] : 1;
  if (Math.abs(e.x - HQ_X[e.side]) < 380) m *= 0.8;
  if (e.hero === 'holder' && e.skillT > 0) m *= 0.5;
  if (e.hero && e.cls === 'inf') m *= 0.8;
  const d = dmg * m;
  if (d <= 0) return;
  e.hp -= d;
  if (src && src.side === 0) B.stats.dmg += d;
  if (e.isSoldier) {
    e.flash = 0.07;
    if (d > 4) { e.flinch = 0.22; setExpr(e, 'h', 0.35); if (chance(0.3)) sfx('hit', e.x); }
    if (e.act && e.act.k === 'raise' && d > 6) e.act = null;
  } else e.flash = 0.06;
  if (e.hp <= 0) {
    e.hp = 0; e.alive = false;
    if (e.side === 0) B.stats.lost++; else B.stats.kills++;
    if (e.isSoldier) {
      const type = dtype === 'flame' ? 'burn' : (blast || dtype === 'he' || dtype === 'shell') ? 'blast' : (src && src.def && src.def.wk === 'sr') ? 'crumple' : chance(0.75) ? 'shot' : 'crumple';
      killSoldier(e, type, dir || 1, blast ? 1 : 0.8);
      if (e.hero) heroDown(e);
    } else killVehicle(e, dir);
  }
}
function killVehicle(u, dir) {
  if (u.side === 1) B.stats.veh++;
  if (u.kind === 'heli') {
    u.crash = true; u.vx = u.vx * 0.6;
    fxExplosion(u.x, u.y - u.alt, 0.9, { metal: true, debris: 6 });
    if (u.hero) heroDown(u);
    return;
  }
  u.wreck = true; u.burnT = 0;
  const s = u.scale || 1;
  fxExplosion(u.x, u.y - 10, 1.5 * s, { fire: true, metal: true, debris: 18 });
  hitStop(0.06);
  if (u.kind === 'tank') { // 砲塔被炸飛
    const ts = turretSpr(u.pal);
    P('part', u.x, u.y - 46 * s, { vx: -dir * rnd(10, 60), vy: -rnd(260, 360), ay: 600, vrot: rnd(-5, 5), max: 4.5, gy: u.y - 4, spr: ts, sx: u.face * s, bounce: 0.2, trail: true, layer: 1 });
  }
  // 車上的人逃出來（運兵車還沒下車的）
  if (u.kind === 'apc' && u.cargo > 0) for (let i = 0; i < Math.min(2, u.cargo); i++) { const pal = u.side ? B.rival.pal : 'us'; const s2 = mkSoldier(u.side, 'rifle', UDEF.rifle, u.lane, u.x + rnd(-20, 20), pal, 'ar'); s2.state = 'move'; s2.hp = 20; }
  if (u.hero) heroDown(u);
}

/* ── 區域效果：煙幕、補給、焦土 ── */
function updateZones(dt) {
  for (const z of B.zones) {
    z.t -= dt;
    if (z.k === 'smoke') {
      if (z.t > 1 && chance(dt * 22)) { const a = rnd(0, TAU), d = rnd(0, z.r); P('smoke', z.x + Math.cos(a) * d, z.y + Math.sin(a) * d * 0.4 - rnd(0, 40), { vx: rnd(-8, 8) + WIND.x * 0.3, vy: -rnd(2, 8), max: rnd(2.2, 3.4), size: rnd(0.5, 0.9), grow: 0.25, alpha: 0.75, spr: FXS.smokeL }); }
    } else if (z.k === 'medic') {
      for (const u of B.units) if (u.alive && u.side === z.side && u.cls !== 'air' && Math.hypot(u.x - z.x, (u.y - z.y) * 1.6) < z.r) { u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.12 * dt); if (chance(dt * 2)) P('text', u.x, u.y - 40, { vy: -24, max: 0.8, txt: '+', col: '#9dff5c', size: 1.3 }); }
    } else if (z.k === 'firewall') {
      if (chance(dt * 30)) fxFlame(z.x + rnd(-z.w / 2, z.w / 2), z.y + rnd(-10, 10), 1.2);
      for (const u of B.units) if (u.alive && u.side !== z.side && u.cls !== 'air' && u.lane === z.lane && Math.abs(u.x - z.x) < z.w / 2) { hurt(u, 60 * dt, 'flame', null, 1); if (u.isSoldier && u.alive) u.burn = 2; }
    }
  }
  B.zones = B.zones.filter((z) => z.t > 0);
}

/* ── 指揮官技能 ── */
function useAbility(side, key, lane, x) {
  const dir = side ? -1 : 1;
  const y = LANES[lane];
  if (key === 'airstrike') {
    sfx('jet', x);
    // 炸彈放出去後還會往前飛 0.55 秒（620×0.55），提早投彈，五顆才會落在瞄準圈裡
    B.planes.push({ k: 'jet', side, x: x - dir * 900, y: Math.max(14, y - 165), tx: x, vx: dir * 620, dropX: x - dir * (140 + 620 * 0.55), drops: 5, gap: 70, lane, done: false, t: 0 });
  } else if (key === 'barrage') {
    const gk = hasDocB(side, 'gunner') ? 1.1 : 1, gr = hasDocB(side, 'gunner') ? 1.2 : 1;
    for (let i = 0; i < 10; i++) setTimeoutG(() => { const tx = x + rnd(-110, 110), ty = y + rnd(-50, 50); B.projs.push({ k: 'arty', side, x: tx - dir * 400, y: -300, sx: tx - dir * 400, sy: -300, tx, ty, t: 0, dur: 1.0, h: 60, dmg: 62 * gk, r: 40 * gr, whistled: false }); }, i * 0.3);
    if (side === 0) radio('砲兵收到，三秒後落彈！');
  } else if (key === 'smoke') {
    B.zones.push({ k: 'smoke', side, x, y, r: ABIL.smoke.radius, t: 10, max: 10 });
    for (let i = 0; i < 4; i++) setTimeoutG(() => B.projs.push({ k: 'nade', side, x: x - dir * 200, y: y - 30, sx: x - dir * 200, sy: y - 30, tx: x + rnd(-60, 60), ty: y + rnd(-30, 30), t: 0, dur: 0.6, h: 60, fuse: 0.01, dmg: 0, r: 1 }), i * 0.1);
  } else if (key === 'medic') {
    B.projs.push({ k: 'crate', side, x, y: -200, sx: x, sy: -260, tx: x, ty: y, t: 0, dur: 2.2, h: 0, chute: true });
    B.supply[side] = Math.min(B.supMax[side], B.supply[side] + 1);
  } else if (key === 'para') {
    B.planes.push({ k: 'transport', side, x: x - dir * 900, y: Math.max(10, y - 175), tx: x, vx: dir * 360, drops: 5, gap: 34, dropX: x - dir * 70, lane, t: 0 });
  }
  if (side === 0) B.cdAbil[key] = ABIL[key].cd * (B.cfg.cdMul || 1);
}
function updatePlanes(dt) {
  for (const p of B.planes) {
    p.t += dt; p.x += p.vx * dt;
    const dir = Math.sign(p.vx);
    if (p.drops > 0 && (p.x - p.dropX) * dir >= 0) {
      p.drops--; p.dropX += dir * p.gap;
      if (p.k === 'jet') {
        B.projs.push({ k: 'bomb', side: p.side, x: p.x, y: p.y + 10, sx: p.x, sy: p.y + 10, tx: p.x + p.vx * 0.55, ty: LANES[p.lane] + rnd(-40, 40), t: 0, dur: 0.85, h: -20, dmg: 140, r: 58 });
      } else {
        const pal = p.side ? B.rival.pal : 'us';
        const s = mkSoldier(p.side, 'rifle', UDEF.rifle, p.lane, p.x, pal, 'ar');
        s.para = true; s.paraY = -(LANES[p.lane] - p.y); s.state = 'move'; s.y = LANES[p.lane] + rnd(-10, 10);
      }
    }
    if (p.k === 'jet' && chance(0.8)) P('smoke', p.x - dir * 64, p.y + 2, { vx: -dir * 20, vy: 0, max: 1.6, size: 0.12, grow: 0.25, alpha: 0.4, spr: FXS.smokeL });
  }
  B.planes = B.planes.filter((p) => Math.abs(p.x - p.tx) < 1600);
}
function paraStep(u, dt) {
  u.paraY += 60 * dt;
  u.vx = 0; u.face = dirOf(u);
  if (u.paraY >= 0) { u.paraY = 0; u.para = false; fxStep(u.x, u.y, true); setStance(u, 'kneel'); }
}

/* ── 英雄大招 ── */
function heroSkill(u) {
  if (!u || !u.alive || u.skillCd > 0) return false;
  const h = HERO[u.hero];
  u.skillCd = h.scd;
  if (u.hero === 'boiler') { u.skillT = 5; sfx('alarm'); }
  else if (u.hero === 'sparrow') {
    let best = null, bv = -1;
    for (const e of B.units) if (e.alive && e.side !== u.side && Math.abs(e.x - u.x) < 760) { const v = (e.hero ? 100 : 0) + (e.cls === 'arm' ? 60 : e.cls === 'veh' ? 40 : e.kind === 'mg' ? 30 : e.kind === 'at' ? 28 : 10) + e.hp / 100; if (v > bv) { bv = v; best = e; } }
    if (best) {
      G.slowTarget = 0.25; setTimeoutG(() => { G.slowTarget = 1; }, 0.5);
      u.tgt = best; aimAt(u, best); u.rec = 1; fxMuzzle(u); sfx('sniper', u.x, 1.4); startReload(u);
      const m = weaponPt(u, u.w.muzzle);
      shootBullet(u, m[0], m[1], best, true, best.cls === 'inf' ? 9999 : 480, best.cls === 'inf' ? 'bullet' : 'ap', '#ffffff', 2.4);
      addShake(3);
    }
  } else if (u.hero === 'kaz') {
    const dir = u.face;
    B.zones.push({ k: 'firewall', side: u.side, x: u.x + dir * 120, y: u.y, lane: u.lane, w: 160, t: 4 });
    sfx('flame', u.x, 1.6);
  } else if (u.hero === 'holder') { u.skillT = 6; u.skillShots = 2; u.cd = 0; sfx('alarm'); }
  else if (u.hero === 'ilya') { u.skillT = 6; sfx('jet', u.x); }
  if (u.side === 0) radio(`${h.short}：${h.skill}！`);
  return true;
}
function heroLine(key) { radio(HERO[key].quote, HERO[key].short); }
function heroDown(u) { if (u.side === 0) radio(`${HERO[u.hero].short}倒下了！`); }

/* ── 旗點 ── */
function updateFlags(dt) {
  for (const f of B.flags) {
    f.wave += dt * (3.2 + Math.abs(WIND.x) * 0.05);
    let p0 = 0, p1 = 0;
    let near0 = null;
    for (const u of B.units) {
      if (!u.alive || u.lane !== f.lane || u.cls === 'air' || u.para) continue;
      if (Math.abs(u.x - f.x) > 70) continue;
      const pw = u.cls === 'inf' ? (u.hero ? 2 : 1) : 0.5;
      if (u.side === 0) { p0 += pw; if (u.isSoldier && (!near0 || Math.abs(u.x - f.x) < Math.abs(near0.x - f.x))) near0 = u; } else p1 += pw;
    }
    let target = f.prog;
    if (p0 > 0 && p1 === 0) target = -1; else if (p1 > 0 && p0 === 0) target = 1;
    if (target !== f.prog) {
      const pw = p0 > 0 ? p0 : p1;
      const rate = 0.17 * Math.sqrt(pw);
      f.prog = approach(f.prog, target, rate * dt);
      // 有人拉繩子
      if (p0 > 0 && near0 && !f.raiser && near0.state === 'move' && !near0.act && !near0.tgt) { f.raiser = near0; near0.x = f.x - 9; near0.face = 1; startRaise(near0, 9, 99); }
      if (p1 > 0 && !f.raiserE) {
        const e = B.units.find((u) => u.alive && u.side === 1 && u.isSoldier && u.lane === f.lane && Math.abs(u.x - f.x) < 70 && !u.act && !u.tgt);
        if (e) { f.raiserE = e; e.x = f.x + 9; e.face = -1; startRaise(e, 9, 99); }
      }
    }
    // 拉繩子的人離開或打完
    for (const k of ['raiser', 'raiserE']) {
      const r = f[k];
      if (r && (!r.alive || Math.abs(f.prog - (k === 'raiser' ? -1 : 1)) < 0.01 || r.tgt)) { if (r.act && r.act.k === 'raise') r.act = null; f[k] = null; }
    }
    const newOwner = f.prog <= -0.999 ? 0 : f.prog >= 0.999 ? 1 : (f.owner === 0 && f.prog < 0) || (f.owner === 1 && f.prog > 0) ? f.owner : -1;
    if (newOwner !== f.owner) {
      const old = f.owner; f.owner = newOwner;
      if (newOwner === 0) {
        B.stats.flagsTaken++; sfx('flag'); B.supply[0] = Math.min(B.supMax[0], B.supply[0] + 1.5);
        radio(pick(RADIO.flagTake).replace('{f}', flagName(f))); banner(`奪下 ${flagName(f)} 點`, '#9dff5c');
        cheerNear(f, 0); rivalSay('lose');
      } else if (newOwner === 1) {
        sfx('lost'); B.supply[1] = Math.min(B.supMax[1], B.supply[1] + 1.5); cheerNear(f, 1);
        if (old === 0) { B.stats.flagsLost++; radio(pick(RADIO.flagLose).replace('{f}', flagName(f))); rivalSay('take'); }
      }
    }
  }
}
function flagName(f) { return ['北', '中', '南'][f.lane] + FLAG_NAMES[f.i]; }
function cheerNear(f, side) {
  for (const u of B.units) if (u.alive && u.isSoldier && u.side === side && u.lane === f.lane && Math.abs(u.x - f.x) < 110 && !u.tgt && chance(0.8)) { if (u.act && u.act.k === 'raise') u.act = null; startCheer(u, rnd(1.1, 1.8)); }
}

/* ── 指揮部 ── */
function updateHQ(dt) {
  if (B.hqSaid > 0) B.hqSaid -= dt;
  for (const h of B.hq) {
    h.flash = Math.max(0, h.flash - dt); h.dmgT = Math.max(0, h.dmgT - dt);
    if (h.dead) { if (chance(dt * 6)) fxFlame(h.x + rnd(-50, 50), h.y - rnd(10, 50), 1.3); continue; }
    // 碉堡機槍
    h.mgT -= dt;
    if (h.burst > 0) {
      h.bt -= dt;
      if (h.bt <= 0 && h.tgt && h.tgt.alive) {
        h.bt = 0.08; h.burst--;
        const mx = h.x + (h.side ? -46 : 46), my = h.y - 30;
        P('flash', mx, my, { rot: h.side ? Math.PI : 0, max: 0.05, size: 0.6, spr: FXS['mf' + rndi(0, 2)] });
        sfx('mg', h.x, 0.7);
        shootBullet({ side: h.side, x: h.x, def: {} }, mx, my, h.tgt, Math.random() < 0.45, 6, 'bullet', h.side ? '#ffc49a' : PAL.us.tracer, 1);
      }
    } else if (h.mgT <= 0) {
      h.mgT = 1.2;
      h.tgt = null; let bd = 330;
      for (const u of B.units) if (u.alive && u.side !== h.side && u.cls !== 'air' && Math.abs(u.x - h.x) < bd) { bd = Math.abs(u.x - h.x); h.tgt = u; }
      if (h.tgt) h.burst = 10;
    }
    // 重砲：打靠近的載具或人堆
    h.gunT = (h.gunT === undefined ? 3 : h.gunT) - dt;
    if (h.gunT <= 0) {
      h.gunT = 3.2;
      let tgt = null, bd = 460;
      for (const u of B.units) if (u.alive && u.side !== h.side && u.cls !== 'air') { const d = Math.abs(u.x - h.x) - (u.isVeh ? 120 : 0); if (d < bd) { bd = d; tgt = u; } }
      if (tgt) {
        const gx = h.x + (h.side ? -30 : 30), gy = h.y - 70;
        P('flash', gx, gy, { rot: h.side ? Math.PI + 0.3 : -0.3, max: 0.08, size: 1.3, spr: FXS.mf1 });
        for (let i = 0; i < 6; i++) P('smoke', gx, gy, { vx: (h.side ? -1 : 1) * rnd(20, 80), vy: -rnd(10, 40), drag: 2, max: rnd(0.8, 1.4), size: 0.2, grow: 0.6, alpha: 0.65, spr: FXS.smoke });
        sfx('cannon', h.x, 0.8); addShake(1);
        B.projs.push({ k: 'arty', side: h.side, x: gx, y: gy, sx: gx, sy: gy, tx: tgt.x + rnd(-14, 14), ty: tgt.y + rnd(-6, 6), t: 0, dur: 0.6 + Math.abs(tgt.x - gx) / 900, h: 70, dmg: 95, r: 42 });
      }
    }
    if (h.hp / h.max < 0.5 && chance(dt * 3)) fxSmokeTrail(h.x + rnd(-40, 40), h.y - 60, 1.5, true);
    if (h.hp / h.max < 0.25 && chance(dt * 5)) fxFlame(h.x + rnd(-40, 40), h.y - 40, 1);
  }
  if (!B.lowSaid && B.hq[1].hp / B.hq[1].max < 0.3) { B.lowSaid = true; rivalSay('low'); }
}
function hqDestroyed(h) {
  h.dead = true;
  for (let i = 0; i < 7; i++) setTimeoutG(() => fxExplosion(h.x + rnd(-60, 60), h.y + rnd(-50, 30), rnd(1.2, 2), { fire: true, debris: 18, metal: true }), i * 0.22);
  G.slowTarget = 0.35; setTimeoutG(() => { G.slowTarget = 1; }, 1.6);
  endBattle(1 - h.side);
}
function endBattle(winner) {
  if (B.over) return;
  B.over = true; B.result = winner === 0 ? 'win' : 'lose';
  B.endT = 0;
  for (const u of B.units) if (u.alive && u.isSoldier && u.side === winner) setTimeoutG(() => startCheer(u, 3), rnd(0.2, 1));
  sfx(winner === 0 ? 'win' : 'lose');
  rivalSay(winner === 0 ? 'lose2' : 'win');
  if (typeof onBattleEnd === 'function') setTimeoutG(() => onBattleEnd(B.result), 3.2);
}

/* ── 敵方指揮官 AI ── */
function aiUpdate(dt) {
  const R = B.rival, A = B.ai, P2 = R.ai;
  for (const k in B.aiCD) B.aiCD[k] = Math.max(0, B.aiCD[k] - dt);
  for (const k in B.cdAbil) B.cdAbil[k] = Math.max(0, B.cdAbil[k] - dt);
  A.lineT -= dt;
  A.t -= dt;
  if (A.t > 0) return;
  A.t = P2.think * rnd(0.7, 1.3);
  const sup = B.supply[1];
  // 每條線的威脅與兵力
  const thr = [0, 0, 0], own = [0, 0, 0], comp = [{ inf: 0, arm: 0, air: 0, veh: 0 }, { inf: 0, arm: 0, air: 0, veh: 0 }, { inf: 0, arm: 0, air: 0, veh: 0 }];
  for (const u of B.units) {
    if (!u.alive) continue;
    const v = u.cls === 'inf' ? 1 : u.cls === 'arm' ? 5 : u.cls === 'air' ? 4.5 : 3;
    if (u.side === 0) { const close = 1 + clamp((u.x - 900) / 900, 0, 1.4); thr[u.lane] += v * close; comp[u.lane][u.cls] += v; }
    else own[u.lane] += v;
  }
  // 敵人的旗被威脅：防守
  let defLane = -1, worst = 1.5;
  for (let l = 0; l < 3; l++) { const g = thr[l] - own[l] * 0.9; if (g > worst) { worst = g; defLane = l; } }
  const deck = R.deck;
  const choose = (lane) => {
    const c = comp[lane];
    const opts = [];
    for (const k of deck) {
      const d = UDEF[k]; if (!d || B.aiCD[k] > 0) continue;
      let w = 1;
      if (c.arm + c.veh > 2 && (k === 'at' || k === 'tank')) w += 3;
      if (c.air > 2 && (k === 'aa' || k === 'mg')) w += 4;
      if (c.inf > 3 && (k === 'mg' || k === 'flame' || k === 'mortar' || k === 'tank')) w += 2;
      if (c.air > 0 && k === 'heli') w -= 0.5;
      if (k === 'rifle') w += 0.8;
      if (P2.smart) w *= 1.3;
      opts.push([k, Math.max(0.1, w)]);
    }
    let sum = opts.reduce((a, b) => a + b[1], 0), r = Math.random() * sum;
    for (const [k, w] of opts) { r -= w; if (r <= 0) return k; }
    return opts.length ? opts[0][0] : 'rifle';
  };
  const tryDeploy = (lane, k) => {
    const d = UDEF[k]; if (!d) return false;
    if (sup < d.cost) return false;
    const z = deployZone(1, lane);
    const x = defLane === lane ? z[0] + rnd(20, 80) : z[0] + rnd(10, 60);
    deploy(1, k, lane, x);
    B.aiCD[k] = 4 + d.cost * 0.6;
    if ((k === 'tank' || k === 'heli' || k === 'mlrs') && A.lineT <= 0) { rivalSay('big'); A.lineT = 14; }
    if (k === 'tank' && B.tankSaid <= B.t) { radio(pick(RADIO.enemyTank)); B.tankSaid = B.t + 40; }
    if (k === 'heli' && B.heliSaid <= B.t) { radio(pick(RADIO.enemyHeli)); B.heliSaid = B.t + 40; }
    return true;
  };
  // 技能：打擠在一起的我軍
  if (R.abil.length && chance(P2.abil * 0.6)) {
    for (const ab of R.abil) {
      if ((B.aiCD['ab_' + ab] || 0) > 0 || sup < ABIL[ab].cost) continue;
      const tgt = clusterTarget(0, ab === 'smoke' ? 3 : 4.5);
      if (tgt && (ab !== 'smoke' || defLane >= 0)) {
        B.supply[1] -= ABIL[ab].cost; useAbility(1, ab, tgt.lane, tgt.x + rnd(-20, 20)); B.aiCD['ab_' + ab] = ABIL[ab].cd * 1.15;
        return;
      }
    }
  }
  // 英雄登場
  if (R.hero && !A.heroOut && B.t > A.heroT && sup >= HERO[R.hero].cost) {
    const lane = defLane >= 0 ? defLane : 1; const z = deployZone(1, lane);
    B.supply[1] -= HERO[R.hero].cost; spawnHero(1, R.hero, lane, z[0] + 40); A.heroOut = true;
    rivalSay('big'); banner(`${HERO[R.hero].name} 登場`, R.color);
    return;
  }
  if (A.heroOut) { const hu = B.units.find((u) => u.side === 1 && u.hero && u.alive); if (hu && hu.skillCd <= 0 && chance(0.5)) { const t = findTarget(hu, 400, { air: true }); if (t) heroSkill(hu); } }
  if (defLane >= 0) { tryDeploy(defLane, choose(defLane)); return; }
  // 進攻：存到一定補給再推
  if (sup >= Math.min(P2.save, B.supMax[1] - 0.5)) {
    let lane;
    if (P2.lane === 'center') lane = chance(0.6) ? 1 : rndi(0, 2);
    else if (P2.lane === 'weak') { let m = 1e9; for (let l = 0; l < 3; l++) { const s = thr[l] - own[l] * 0.3 + rnd(0, 1.5); if (s < m) { m = s; lane = l; } } }
    else { let m = -1e9; for (let l = 0; l < 3; l++) { const s = thr[l] - own[l] + rnd(0, 2); if (s > m) { m = s; lane = l; } } }
    let n = 0;
    while (n < 3 && tryDeploy(lane, choose(lane))) n++;
  }
}
function clusterTarget(side, minV) {
  let best = null, bv = minV;
  for (const u of B.units) {
    if (!u.alive || u.side !== side || u.cls === 'air') continue;
    let v = 0;
    for (const o of B.units) if (o.alive && o.side === side && o.cls !== 'air' && o.lane === u.lane && Math.abs(o.x - u.x) < 90) v += o.cls === 'inf' ? 1 : 2.5;
    if (v > bv) { bv = v; best = u; }
  }
  return best;
}

/* ── 訊息（UI 會把它們顯示出來） ── */
function radio(txt, who) { if (B) B.msgQ.push({ k: 'radio', txt, who: who || '阿默' }); sfx('radio'); }
function rivalSay(kind) { if (!B) return; const L = B.rival.lines[kind]; if (L) B.msgQ.push({ k: 'rival', txt: pick(L) }); }
function banner(txt, col) { if (B) B.msgQ.push({ k: 'banner', txt, col }); }
