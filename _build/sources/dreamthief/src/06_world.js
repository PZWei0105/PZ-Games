'use strict';
/* ====== 一次潛入：世界、玩家、夢衛、戰鬥、撤離 ====== */
let W = null;
const tileAt = (x, y) => { if (!W) return TV; const tx = Math.floor(x / T), ty = Math.floor(y / T); if (tx < 0 || ty < 0 || tx >= W.m.w || ty >= W.m.h) return TV; return W.m.tiles[ty * W.m.w + tx]; };
const solidT = t => t === TV || t === TW || t === TS;
const blockSight = t => t === TV || t === TW;
const inWater = (x, y) => tileAt(x, y) === TWA;
const roomAt = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); if (tx < 0 || ty < 0 || tx >= W.m.w || ty >= W.m.h) return -1; return W.m.roomOf[ty * W.m.w + tx]; };

/* 視線：格子 DDA */
function los(x1, y1, x2, y2) {
  const m = W.m;
  let tx = Math.floor(x1 / T), ty = Math.floor(y1 / T);
  const ex = Math.floor(x2 / T), ey = Math.floor(y2 / T);
  const dx = x2 - x1, dy = y2 - y1;
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
  const tdx = dx === 0 ? 1e9 : Math.abs(T / dx), tdy = dy === 0 ? 1e9 : Math.abs(T / dy);
  let tmx = dx === 0 ? 1e9 : ((sx > 0 ? (tx + 1) * T - x1 : x1 - tx * T) / Math.abs(dx));
  let tmy = dy === 0 ? 1e9 : ((sy > 0 ? (ty + 1) * T - y1 : y1 - ty * T) / Math.abs(dy));
  for (let i = 0; i < 80; i++) {
    if (tx === ex && ty === ey) return true;
    if (tmx < tmy) { tmx += tdx; tx += sx; } else { tmy += tdy; ty += sy; }
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return false;
    if (blockSight(m.tiles[ty * m.w + tx])) return false;
  }
  return true;
}
/* 光線：回傳撞到牆的距離 */
function rayDist(x, y, a, max) {
  const m = W.m, dx = Math.cos(a), dy = Math.sin(a);
  let tx = Math.floor(x / T), ty = Math.floor(y / T);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
  const tdx = dx === 0 ? 1e9 : Math.abs(T / dx), tdy = dy === 0 ? 1e9 : Math.abs(T / dy);
  let tmx = dx === 0 ? 1e9 : ((sx > 0 ? (tx + 1) * T - x : x - tx * T) / Math.abs(dx));
  let tmy = dy === 0 ? 1e9 : ((sy > 0 ? (ty + 1) * T - y : y - ty * T) / Math.abs(dy));
  for (let i = 0; i < 60; i++) {
    let d;
    if (tmx < tmy) { d = tmx; tmx += tdx; tx += sx; } else { d = tmy; tmy += tdy; ty += sy; }
    if (d > max) return max;
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h || blockSight(m.tiles[ty * m.w + tx])) return d;
  }
  return max;
}

/* 碰撞：方塊對格子，分軸滑動 */
function boxHits(x, y, hr) {
  const x0 = Math.floor((x - hr) / T), x1 = Math.floor((x + hr) / T), y0 = Math.floor((y - hr) / T), y1 = Math.floor((y + hr) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { if (tx < 0 || ty < 0 || tx >= W.m.w || ty >= W.m.h) return true; if (solidT(W.m.tiles[ty * W.m.w + tx])) return true; }
  return false;
}
function moveBody(e, dx, dy) {
  const hr = e.r * .78;
  let hit = false;
  if (dx) { const steps = Math.ceil(Math.abs(dx) / 10); const sdx = dx / steps; for (let i = 0; i < steps; i++) { if (!boxHits(e.x + sdx, e.y, hr)) e.x += sdx; else { hit = true; break; } } }
  if (dy) { const steps = Math.ceil(Math.abs(dy) / 10); const sdy = dy / steps; for (let i = 0; i < steps; i++) { if (!boxHits(e.x, e.y + sdy, hr)) e.y += sdy; else { hit = true; break; } } }
  return hit;
}

/* ---------- 建立潛入 ---------- */
function makePlayer(id) {
  const wid = G.loadout.weapon, wd = WEAPONS[wid], wl = G.weapons[wid].lvl;
  const mag = wd.mag + (wid === 'needle' && wl >= 3 ? 12 : 0);
  const p = {
    id, x: 0, y: 0, vx: 0, vy: 0, r: 15, face: 1, aim: -Math.PI / 2, walk: 0, spd: 0,
    hpMax: 100 + G.meta.hp * 15, hp: 0, wpn: { id: wid, def: wd, lvl: wl, mag, ammo: mag, reloadT: 0, cd: 0, shots: 0, idle: 0, flash: 0, recoil: 0 },
    dashMax: 1 + G.meta.dash, dash: 1 + G.meta.dash, dashCd: 0, dashT: 0, dvx: 0, dvy: 0,
    tool: { id: G.loadout.tool, cd: 0, uses: (TOOLS[G.loadout.tool].uses || 0) },
    candies: G.loadout.candies, bag: [], cap: [8, 10, 12, 14][G.meta.bag], pocketCap: 1 + G.meta.pocket,
    xp: 0, lvl: 1, ups: {}, pend: 0, inv: 0, hurt: 0, wardT: 0, regenAcc: 0, mirrorT: 0, stepT: 0, noiseT: 0,
    state: 'alive', search: null, still: 0, kills: 0, assassins: 0, assT: 0, carry: null, blades: 0, bladeA: 0, lastHit: 0,
    input: { mx: 0, my: 0, mag: 0 }, st: null, resonate: false, act: null,
  };
  p.hp = p.hpMax;
  calcStats(p);
  if (G.meta.start) { const id2 = rnd.pick(['power', 'rate', 'chain', 'pierce', 'crit', 'vigor', 'swift', 'hands']); p.ups[id2] = 1; calcStats(p); }
  return p;
}
function calcStats(p) {
  const u = k => p.ups[k] || 0, perk = k => G.perks && G.perks[k];
  const wl = p.wpn.lvl, wid = p.wpn.id;
  p.st = {
    dmg: (1 + .13 * (wl - 1)) * (1 + u('power') * .14) * (1 + u('pierce') * .06) * (1 + u('bounce') * .05),
    rate: 1 + u('rate') * .12, reload: u('rate') >= 5 ? .05 : 1 - u('rate') * .08,
    crit: .05 + u('crit') * .07, critDmg: 1.8 + u('crit') * .15,
    pierce: (WEAPONS[wid].pierce) + u('pierce') + ((wid === 'revolver' || wid === 'crossbow') && wl >= 3 ? 1 : 0),
    bounce: Math.ceil(u('bounce') / 2) + (wid === 'crossbow' && wl >= 5 ? 1 : 0),
    split: u('split') ? u('split') + 1 : 0, chain: u('chain') ? 1 + u('chain') : 0, chainDmg: .3 + u('chain') * .1,
    burn: u('burn') ? 4 + u('burn') * 3 : (wid === 'shotgun' && wl >= 5 ? 5 : 0), chill: u('chill') ? .15 + u('chill') * .07 : 0,
    boom: u('boom') ? 12 + u('boom') * 9 : 0, multi: Math.ceil(u('multi') / 2) + (u('multi') >= 5 ? 1 : 0),
    pellets: (wid === 'shotgun' && wl >= 3 ? 2 : 0), knock: u('power') >= 5 ? 2 : 1,
    speed: (1 + u('swift') * .07), step: Math.max(0, 1 - u('swift') * .12) * (u('swift') >= 5 ? 0 : 1),
    detect: (1 - u('shadow') * .14) * (perk('han') ? .85 : 1), assR: 1 + u('shadow') * .12,
    search: (1 + u('hands') * .22) * (1 + G.meta.lantern * .08), lantern: (1 + u('eye') * .08) * (1 + G.meta.lantern * .12),
    calm: 1 - u('calm') * .08, magnet: 1 + u('magnet') * .35, dashCd: (1 - u('dash') * .1) * (perk('lin') ? .88 : 1),
    ward: u('ward') ? 14 - u('ward') * 1.6 : 0, regenK: u('regen') >= 5 ? 8 : u('regen'), regenS: u('regen') * .4,
    blades: u('blades'), heal: perk('zhou') ? 1.4 : 1,
  };
  p.hpMax = 100 + G.meta.hp * 15 + u('vigor') * 20;
  p.hp = Math.min(p.hp, p.hpMax);
}

function newDive(chi) {
  const seed = (Date.now() ^ (rnd.next() * 1e9)) >>> 0;
  W = {
    chi, ch: CH[chi], depth: 0, seed, t: 0, wake: 0, stage: 0, collapse: 0, collapseMax: 30, out: false, result: null,
    players: [makePlayer(0)], foes: [], bullets: [], ebul: [], picks: [], fx: [], tl: [], tele: [], noises: [], decoys: [],
    shake: 0, hitstop: 0, slow: 1, flow: null, flowT: 0, spawnT: 8, beat: 0, beatT: 0, beatN: 0, stats: { kills: 0, assassins: 0, maxWake: 0, t0: 0, depthMax: 0, gold: 0 },
    side: (G.side[chi] || []).slice(), said: {}, boss: null, bossDead: false, qing: null, finalPhase: 0, waveT: 0, channel: null,
  };
  W.stats.t0 = 0;
  buildLayer();
  if (W.ch.say.d0) sayList(W.ch.say.d0, 1.5);
}
function lifePlan() {
  const ch = CH[W.chi]; if (!ch.life || W.depth < 1) return [];
  const have = k => G.archive.some(i => i.key === k) || G.pending.some(i => i.key === k) || G.sold.some(i => i.key === k) || W.players.some(p => p.bag.some(i => i.key === k));
  const miss = ch.life.items.map((x, i) => ch.id + '_life' + i).filter(k => !have(k));
  return miss.length ? [rnd.pick(miss)] : [];
}
function buildLayer() {
  const m = mapgen((W.seed + W.depth * 7919) >>> 0, W.chi, W.depth, { life: lifePlan() });
  W.m = m;
  W.foes = []; W.bullets = []; W.ebul = []; W.picks = []; W.tele = []; W.noises = []; W.decoys = []; W.fx = []; W.tl = [];
  W.vis = new Uint8Array(m.w * m.h); W.seen = new Uint8Array(m.w * m.h); W.visT = 0; W.visPoly = [];
  W.flow = new Int16Array(m.w * m.h); W.flowT = 0;
  W.boss = null; W.channel = null; W.spawnT = 10;
  for (const p of W.players) { p.x = m.spawn.x + p.id * 30; p.y = m.spawn.y; p.vx = p.vy = 0; p.search = null; p.act = null; }
  for (const f of m.foes) addFoe(f.type, f.x, f.y, f);
  for (const c of m.cams) c.aware = 0;
  if (m.bossRoom) { const br = m.bossRoom; W.boss = makeBoss(W.ch.boss.id, br.cx, br.y * T + br.h * T * .4, br); W.foes.push(W.boss); }
  if (m.ferry) W.ferry = { x: m.ferry.x, y: m.ferry.y, tx: m.ferry.x, ty: m.ferry.y, t: 0, gone: false }; else W.ferry = null;
  W.stats.depthMax = Math.max(W.stats.depthMax, W.depth);
  updateVis(true);
}

/* ---------- 夢衛 ---------- */
function foeScale() { return { hp: (1 + .36 * W.depth) * (1 + .3 * W.chi), dmg: (1 + .15 * W.depth + .12 * W.chi), spd: 1 + .04 * W.chi + .06 * W.depth }; }
function addFoe(type, x, y, o = {}) {
  const d = FOES[type], s = foeScale();
  let t = type;
  if (W.chi === 1 && type === 'ripper') t = 'beat';
  if ((W.chi === 2 || W.chi === 4) && type === 'echo' && inWater(x, y)) t = 'eel';
  const e = {
    id: uid(), type: t, base: type, x, y, vx: 0, vy: 0, r: d.r, hp: d.hp * s.hp * (o.elite ? 1 : 1), hpMax: d.hp * s.hp, dmg: d.dmg * s.dmg, xp: d.xp,
    spd: d.spd * s.spd, aspd: d.aspd * s.spd, notice: d.notice, state: o.state || 'sleep', face: rnd.range(0, TAU), aw: 0, tgt: null, last: null, lostT: 0,
    path: null, pathT: 0, wind: 0, windK: '', cd: rnd.range(.5, 1.5), atk: 0, dashT: 0, dvx: 0, dvy: 0, flash: 0, stun: 0, slowT: 0, slowK: 0, burnT: 0, burnD: 0,
    patrol: o.patrol || null, pi: o.pi || 0, home: { x, y }, wanderT: rnd.range(0, 3), wx: x, wy: y, room: o.room ?? -1, elite: !!o.elite, spawn: o.emerge ? .9 : 0,
    anim: rnd.range(0, 9), bladeHit: 0, dead: false, screamed: false, hatch: 0, lookT: 0, alertT: 0, heard: null,
  };
  if (o.state === 'alert') { e.tgt = nearestPlayer(x, y); e.alertT = 0; }
  W.foes.push(e);
  return e;
}
function nearestPlayer(x, y, needLos) {
  let best = null, bd = 1e9;
  for (const p of W.players) { if (p.state !== 'alive') continue; const d = dist2(x, y, p.x, p.y); if (d < bd && (!needLos || los(x, y, p.x, p.y))) { bd = d; best = p; } }
  return best;
}
/* 空間雜湊 */
let HASH = new Map();
function hashFoes() {
  HASH = new Map();
  for (const e of W.foes) { if (e.dead) continue; const k = ((e.x / (T * 2)) | 0) + ',' + ((e.y / (T * 2)) | 0); let a = HASH.get(k); if (!a) HASH.set(k, a = []); a.push(e); }
}
function foesNear(x, y, r, out = []) {
  out.length = 0;
  const c0 = Math.floor((x - r) / (T * 2)), c1 = Math.floor((x + r) / (T * 2)), r0 = Math.floor((y - r) / (T * 2)), r1 = Math.floor((y + r) / (T * 2));
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) { const a = HASH.get(cx + ',' + cy); if (a) for (const e of a) if (!e.dead && dist2(x, y, e.x, e.y) < (r + e.r) * (r + e.r)) out.push(e); }
  return out;
}
const _near = [], _near2 = [];

/* 流場：所有玩家到每一格的步數 */
function updateFlow() {
  const m = W.m, f = W.flow; f.fill(-1);
  const q = [];
  for (const p of W.players) { if (p.state !== 'alive') continue; const k = Math.floor(p.y / T) * m.w + Math.floor(p.x / T); if (f[k] < 0) { f[k] = 0; q.push(k); } }
  for (let qi = 0; qi < q.length; qi++) {
    const k = q[qi], x = k % m.w, y = (k / m.w) | 0, d = f[k];
    if (d > 60) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy, kk = yy * m.w + xx; if (xx >= 0 && yy >= 0 && xx < m.w && yy < m.h && f[kk] < 0 && walkable(m.tiles[kk])) { f[kk] = d + 1; q.push(kk); } }
  }
}
function flowDir(e) {
  const m = W.m, tx = Math.floor(e.x / T), ty = Math.floor(e.y / T), k = ty * m.w + tx, here = W.flow[k];
  if (here < 0) return null;
  let best = null, bd = here;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const xx = tx + dx, yy = ty + dy; if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue;
    const d = W.flow[yy * m.w + xx]; if (d < 0 || d >= bd) continue;
    if (dx && dy && (!walkable(m.tiles[ty * m.w + xx]) || !walkable(m.tiles[yy * m.w + tx]))) continue;
    bd = d; best = { x: (xx + .5) * T, y: (yy + .5) * T };
  }
  return best;
}
/* 小範圍尋路（去查看聲音） */
function pathTo(sx, sy, gx, gy) {
  const m = W.m, s = Math.floor(sy / T) * m.w + Math.floor(sx / T), g = Math.floor(gy / T) * m.w + Math.floor(gx / T);
  if (s === g) return [];
  const prev = new Map([[s, -1]]), q = [s];
  for (let qi = 0; qi < q.length && qi < 700; qi++) {
    const k = q[qi]; if (k === g) break;
    const x = k % m.w, y = (k / m.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy, kk = yy * m.w + xx; if (xx >= 0 && yy >= 0 && xx < m.w && yy < m.h && !prev.has(kk) && walkable(m.tiles[kk])) { prev.set(kk, k); q.push(kk); } }
  }
  if (!prev.has(g)) return null;
  const out = []; let k = g; while (k !== s && k >= 0) { out.push({ x: (k % m.w + .5) * T, y: (((k / m.w) | 0) + .5) * T }); k = prev.get(k); }
  return out.reverse();
}

/* 聲音 */
function noise(x, y, r, kind, wakeAdd) {
  if (wakeAdd) addWake(wakeAdd);
  W.noises.push({ x, y, r, t: 0, kind });
  foesNear(x, y, r, _near2);
  for (const e of _near2) {
    if (e.boss || e.dead || e.spawn > 0) continue;
    const d = dist(x, y, e.x, e.y);
    if (d > r * .6 && !los(x, y, e.x, e.y)) continue;
    if (e.state === 'sleep' && kind === 'step' && d > r * .7) continue;
    if (e.state === 'alert') continue;
    if (e.type === 'cocoon') { if (!e.hatch) e.hatch = .9; continue; }
    hearAt(e, x, y);
  }
}
function hearAt(e, x, y) {
  if (e.state !== 'sus') { e.alertT = .35; fxIcon(e, '?'); }
  e.state = 'sus'; e.heard = { x, y }; e.path = null; e.lookT = 0; e.face = angTo(e.x, e.y, x, y);
}
function alertFoe(e, p, delay = .25) {
  if (e.dead || e.boss) return;
  if (e.state !== 'alert') { fxIcon(e, '!'); e.alertT = delay; if (e.type === 'watcher' && !e.screamed) { e.wind = 1.05; e.windK = 'scream'; } }
  e.state = 'alert'; e.tgt = p; e.last = { x: p.x, y: p.y }; e.lostT = 0;
}

/* ---------- 清醒度 ---------- */
function addWake(v) {
  if (W.collapse || W.out) return;
  W.wake = clamp(W.wake + v, 0, 100);
  W.stats.maxWake = Math.max(W.stats.maxWake, W.wake);
}
function updateWake(dt) {
  if (W.out) return;
  const calm = Math.min(...W.players.map(p => p.st.calm));
  if (!W.collapse) {
    const base = [.16, .24, .32][W.depth] * (1 + W.chi * .06) * (W.chi === 4 ? 1.3 : 1) * calm;
    if (!(W.chi === 4 && W.finalPhase >= 1)) addWake(base * dt * (W.channel ? 1.6 : 1));
    const st = W.wake >= 75 ? 3 : W.wake >= 50 ? 2 : W.wake >= 25 ? 1 : 0;
    if (st !== W.stage) {
      if (st > W.stage) { const k = 'wake' + st; if (!W.said[k + W.depth]) { W.said[k + W.depth] = 1; sayList(RADIO[k]); } AU.sfx('stage'); W.shake = Math.max(W.shake, 4); }
      W.stage = st;
    }
    if (W.wake >= 100) startCollapse();
  } else {
    W.collapse -= dt;
    if (W.collapse <= 0) { W.collapse = 0; for (const p of W.players) if (p.state === 'alive') loseDive(p); }
  }
}
function startCollapse(len) {
  if (W.collapse) return;
  W.collapse = W.collapseMax = len || 30; W.wake = 100; W.stage = 3;
  W.channel = null;
  sayList(RADIO.collapse); AU.sfx('collapse'); W.shake = 14;
  for (const e of W.foes) if (!e.dead && !e.boss && e.state !== 'alert') { const p = nearestPlayer(e.x, e.y); if (p && dist(e.x, e.y, p.x, p.y) < T * 12) alertFoe(e, p, .5); }
}

/* ---------- 主更新 ---------- */
function stepWorld(dt) {
  if (!W || W.out) return;
  if (W.slowmo > 0) { W.slowmo -= dt; W.slow = W.slowmo > 0 ? .3 : 1; }
  if (W.hitstop > 0) { W.hitstop -= dt; return; }
  dt *= W.slow;
  W.t += dt;
  hashFoes();
  W.flowT -= dt; if (W.flowT <= 0) { updateFlow(); W.flowT = .22; }
  W.visT -= dt; if (W.visT <= 0) { updateVis(); W.visT = .06; }
  // 節拍（林老師）
  if (W.chi === 1 || (W.boss && W.boss.bid === 'conductor')) { W.beatT -= dt; if (W.beatT <= 0) { W.beatT += .72; W.beatN++; W.beat = 1; AU.sfx('tick', W.beatN % 4 === 0); } }
  W.beat = Math.max(0, W.beat - dt * 4);
  for (const p of W.players) updatePlayer(p, dt);
  for (const e of W.foes) if (!e.dead) { if (e.boss) updateBoss(e, dt); else updateFoe(e, dt); }
  separateFoes();
  updateBullets(dt); updateEBullets(dt); updatePicks(dt); updateTele(dt); updateDecoys(dt);
  updateCams(dt); updateMirrors(dt); updateFerry(dt); updateSpawns(dt); updateWake(dt); updateChannel(dt);
  W.foes = W.foes.filter(e => !e.dead || e.deadT > 0);
  for (const e of W.foes) if (e.dead) e.deadT -= dt;
  W.noises = W.noises.filter(n => (n.t += dt) < .6);
  updateFx(dt);
  W.shake = Math.max(0, W.shake - dt * 30);
}

/* ---------- 玩家 ---------- */
function updatePlayer(p, dt) {
  if (p.state !== 'alive') return;
  const st = p.st, inp = p.input;
  p.inv = Math.max(0, p.inv - dt); p.hurt = Math.max(0, p.hurt - dt); p.mirrorT = Math.max(0, p.mirrorT - dt); p.assT = Math.max(0, p.assT - dt);
  p.wpn.flash = Math.max(0, p.wpn.flash - dt); p.wpn.recoil = Math.max(0, p.wpn.recoil - dt * 8);
  if (st.regenS) { p.regenAcc += st.regenS * dt; if (p.regenAcc >= 1) { const k = Math.floor(p.regenAcc); p.regenAcc -= k; p.hp = Math.min(p.hpMax, p.hp + k); } }
  if (st.ward) { p.wardT = Math.min(st.ward, p.wardT + dt); }
  // 閃身冷卻
  if (p.dash < p.dashMax) { p.dashCd -= dt; if (p.dashCd <= 0) { p.dash++; p.dashCd = p.dash < p.dashMax ? 3 * st.dashCd : 0; } }
  if (p.tool.cd > 0) p.tool.cd -= dt;
  // 移動
  const load = bagUsed(p) / p.cap;
  let sp = (inp.mag >= .62 ? 3.75 : 2.05) * T * st.speed;
  if (load > .7) sp *= 1 - Math.min(.2, (load - .7) / .3 * .2);
  if (inWater(p.x, p.y)) sp *= .64;
  if (p.carry) sp *= .82;
  if (p.search && p.search.prog > 0) sp *= .9;
  const tx = inp.mx * sp * Math.min(1, inp.mag * 1.25), ty = inp.my * sp * Math.min(1, inp.mag * 1.25);
  const acc = 14 * T * dt;
  p.vx = approach(p.vx, tx, acc); p.vy = approach(p.vy, ty, acc);
  if (p.dashT > 0) { p.dashT -= dt; moveBody(p, p.dvx * dt, p.dvy * dt); if (rnd.next() < .9) W.fx.push({ k: 'ghost', x: p.x, y: p.y, t: 0, life: .28, face: p.face, aim: p.aim }); dashHits(p); }
  else moveBody(p, p.vx * dt, p.vy * dt);
  p.spd = Math.hypot(p.vx, p.vy);
  if (p.spd > 20) { p.walk += dt * p.spd / T * 3.2; if (Math.abs(p.vx) > 8) p.face = p.vx > 0 ? 1 : -1; }
  // 腳步聲
  p.stepT -= dt;
  if (p.spd > 2.6 * T * st.speed * (inWater(p.x, p.y) ? .64 : 1) && st.step > 0 && p.stepT <= 0) {
    p.stepT = .34; noise(p.x, p.y, 2.5 * T * st.step, 'step');
    W.fx.push({ k: 'step', x: p.x, y: p.y + 2, t: 0, life: .5, r: 2.5 * T * st.step });
  }
  if (inWater(p.x, p.y) && p.spd > 30 && rnd.next() < dt * 8) W.fx.push({ k: 'ripple', x: p.x + fx(-6, 6), y: p.y + fx(-3, 3), t: 0, life: .7 });
  // 背刺
  tryAssassin(p);
  // 射擊
  updateGun(p, dt);
  // 飛刃
  if (st.blades) { p.bladeA += dt * (UPS.blades && p.ups.blades >= 5 ? 6.4 : 3.2); bladeHits(p, dt); }
  // 搜索
  updateSearch(p, dt);
  // 共鳴
  const res = p.bag.some(i => i.rar >= 3);
  if (res && !p.resonate && !W.said.res) { W.said.res = 1; sayList(RADIO.resonate); }
  p.resonate = res;
  // 出口與互動
  updateAct(p);
  for (const e of W.m.exits) { const fk = { bell: 'seeBell', window: 'seeWindow', stairs: 'seeStairs' }[e.type]; if (!G.flags[fk] && W.vis[Math.floor(e.y / T) * W.m.w + Math.floor(e.x / T)] && dist(e.x, e.y, p.x, p.y) < 6 * T) { G.flags[fk] = 1; sayList(RADIO[fk]); } }
  if (!G.flags.watch && W.t > 2) for (const e of W.foes) if (e.type === 'watcher' && !e.dead && W.vis[Math.floor(e.y / T) * W.m.w + Math.floor(e.x / T)] && dist(e.x, e.y, p.x, p.y) < 7 * T) { G.flags.watch = 1; sayList(RADIO.firstWatcher); break; }
  if (p.hp < p.hpMax * .3 && !W.said.low) { W.said.low = 1; sayList(RADIO.lowHp); }
}
function bagUsed(p) { let s = 0; for (const i of p.bag) s += i.size; return s; }

function playerDash(p) {
  if (p.state !== 'alive' || p.dash <= 0 || p.dashT > 0) return;
  let dx = p.input.mx, dy = p.input.my;
  if (Math.hypot(dx, dy) < .2) { dx = Math.cos(p.aim); dy = Math.sin(p.aim); }
  const l = Math.hypot(dx, dy) || 1;
  p.dvx = dx / l * 15 * T; p.dvy = dy / l * 15 * T; p.dashT = .17; p.inv = Math.max(p.inv, .26);
  p.dash--; if (p.dashCd <= 0) p.dashCd = 3 * p.st.dashCd;
  p.dashHit = new Set();
  AU.sfx('dash'); p.search = null;
  if (p.ups.dash >= 5) { W.decoys.push({ x: p.x, y: p.y, t: 0, life: 2.2, ghost: true, pulse: 0 }); }
}
function dashHits(p) {
  if ((p.ups.dash || 0) < 3) return;
  foesNear(p.x, p.y, p.r + 6, _near);
  for (const e of _near) if (!p.dashHit.has(e)) { p.dashHit.add(e); hurtFoe(e, 22 * p.st.dmg, p, { x: p.x, y: p.y, nk: 1 }); }
}

function tryAssassin(p) {
  if (p.assT > 0) return;
  const R = (1.05 * T + 14) * p.st.assR;
  foesNear(p.x, p.y, R, _near);
  for (const e of _near) {
    if (e.boss || e.dead || e.spawn > 0 || e.dashT > 0) continue;
    const unaware = e.state !== 'alert' || p.mirrorT > 0;
    if (!unaware) continue;
    const behind = Math.abs(angDiff(e.face, angTo(e.x, e.y, p.x, p.y))) > 1.75;
    if (!(e.state === 'sleep' || behind || p.mirrorT > 0)) continue;
    if (!los(p.x, p.y, e.x, e.y)) continue;
    // 背刺
    p.assT = .28; p.assassins++; W.stats.assassins++;
    W.hitstop = .09; W.shake = Math.max(W.shake, 5);
    const a = angTo(p.x, p.y, e.x, e.y);
    W.fx.push({ k: 'slash', x: e.x, y: e.y - 20, a, t: 0, life: .32 });
    AU.sfx('stab');
    if (e.elite) { hurtFoe(e, e.hpMax * .5, p, { x: p.x, y: p.y, silent: true }); e.stun = 1.4; alertFoe(e, p, .9); }
    else { e.hp = 0; killFoe(e, p, { silent: true, ass: true }); }
    if (p.ups.calm >= 5) addWake(-1);
    if (p.ups.shadow >= 5) p.mirrorT = Math.max(p.mirrorT, 2);
    if (!G.flags.ass) { G.flags.ass = 1; sayList(RADIO.firstAssassin); }
    break;
  }
}

/* 射擊 */
function pickTarget(p) {
  const wd = p.wpn.def, range = wd.range * T;
  if (W.bags && W.boss && W.boss.healing) for (const g of W.bags) if (!g.dead && dist(p.x, p.y, g.x, g.y) < range && los(p.x, p.y, g.x, g.y)) return g;
  let best = null, bs = 1e9;
  foesNear(p.x, p.y, range, _near);
  for (const e of _near) {
    if (e.dead || e.spawn > 0) continue;
    const d = dist(p.x, p.y, e.x, e.y);
    const engaged = e.boss ? e.awake : (e.state === 'alert' || (e.state === 'sus' && d < 2.6 * T) || e.wind > 0 || (e.type === 'cocoon' && e.hatch > 0));
    if (!engaged) continue;
    if (!los(p.x, p.y, e.x, e.y)) continue;
    const s = d - (e.wind > 0 ? 70 : 0) - (e.type === 'watcher' && e.windK === 'scream' ? 160 : 0) - (e.boss ? -40 : 0);
    if (s < bs) { bs = s; best = e; }
  }
  if (!best) {
    for (const c of W.m.cams) if (!c.dead && c.aware > .25 && dist(p.x, p.y, c.x, c.y) < range && los(p.x, p.y, c.x, c.y + 8)) return c;
    if (W.wake >= 20) for (const mi of W.m.mirrors) if (!mi.broken && dist(p.x, p.y, mi.x, mi.y) < 3 * T && los(p.x, p.y, mi.x, mi.y + 10)) return mi;
    for (const b of (W.bags || [])) if (!b.dead && dist(p.x, p.y, b.x, b.y) < range && los(p.x, p.y, b.x, b.y)) return b;
  }
  return best;
}
function updateGun(p, dt) {
  const w = p.wpn, wd = w.def, st = p.st;
  if (w.reloadT > 0) { w.reloadT -= dt; if (w.reloadT <= 0) { w.ammo = w.mag; AU.sfx('reloadDone', w.id); } }
  w.cd -= dt;
  const tgt = pickTarget(p);
  if (tgt) {
    const ta = angTo(p.x, p.y - 18, tgt.x, tgt.y - (tgt.boss ? 40 : 18));
    p.aim += angDiff(p.aim, ta) * Math.min(1, dt * 22);
    p.face = Math.cos(p.aim) >= 0 ? 1 : -1;
    w.idle = 0;
    if (w.reloadT <= 0 && w.ammo > 0 && w.cd <= 0) {
      fireGun(p, ta);
      w.cd = 1 / (wd.rate * st.rate * (p.carry ? .5 : 1));
      w.ammo--;
      if (w.ammo <= 0) { w.reloadT = wd.reload * st.reload; AU.sfx('reload', w.id); }
    }
  } else {
    w.idle += dt;
    if (p.spd > 20) { const ma = Math.atan2(p.vy, p.vx); p.aim += angDiff(p.aim, ma) * Math.min(1, dt * 10); }
    if (w.idle > 1.4 && w.ammo < w.mag && w.reloadT <= 0) { w.reloadT = wd.reload * st.reload; AU.sfx('reload', w.id); }
  }
}
function fireGun(p, a) {
  const w = p.wpn, wd = w.def, st = p.st;
  w.shots++; w.flash = .06; w.recoil = 1;
  const pel = wd.pellets + st.pellets;
  const extra = st.multi;
  const lastCrit = w.id === 'revolver' && w.lvl >= 5 && w.ammo === 1;
  const chainShot = w.id === 'needle' && w.lvl >= 5 && w.shots % 8 === 0;
  const mx = p.x + Math.cos(a) * 26, my = p.y - 18 + Math.sin(a) * 26;
  const fan = (k, n) => n <= 1 ? 0 : (k / (n - 1) - .5) * (.16 * (n - 1));
  for (let s = 0; s <= extra; s++) {
    const off = fan(s, extra + 1);
    for (let i = 0; i < pel; i++) {
      const sp = (pel > 1 ? (i / (pel - 1) - .5) * wd.spread * 2 : 0) + fx(-wd.spread, wd.spread) * (pel > 1 ? .3 : 1);
      const aa = a + off + sp;
      const crit = lastCrit || Math.random() < st.crit;
      W.bullets.push({ x: p.x + Math.cos(aa) * 20, y: p.y + Math.sin(aa) * 20, vx: Math.cos(aa) * wd.spd * T * fx(.94, 1.04), vy: Math.sin(aa) * wd.spd * T * fx(.94, 1.04),
        dmg: wd.dmg * st.dmg * (crit ? st.critDmg : 1) * (s > 0 ? .8 : 1), crit, pierce: st.pierce, bounce: st.bounce, life: wd.range * T / (wd.spd * T) * 1.15,
        split: st.split, chain: st.chain + (chainShot ? 3 : 0), owner: p, hit: new Set(), kind: w.id, r: w.id === 'shotgun' ? 5 : w.id === 'needle' ? 4 : 6, tr: [] });
    }
  }
  W.tl.push({ x: mx, y: my + 18, r: 120, c: '#ffd59a', t: 0, life: .07, i: .9 });
  W.fx.push({ k: 'muzzle', x: mx, y: my, a, t: 0, life: .07, w: w.id });
  if (w.id !== 'crossbow') W.fx.push({ k: 'shell', x: p.x, y: p.y - 16, vx: -Math.cos(a) * 60 + fx(-30, 30), vy: -120, t: 0, life: .5 });
  AU.sfx('shot', w.id);
  W.shake = Math.max(W.shake, w.id === 'shotgun' ? 4 : w.id === 'revolver' ? 2.2 : w.id === 'crossbow' ? 1.2 : .6);
  if (wd.noise > 0 && W.t - (p.lastNoise || 0) > .3) { p.lastNoise = W.t; noise(p.x, p.y, wd.noise * T, 'gun', wd.noise * .012); }
  p.search = null;
}
function bladeHits(p, dt) {
  const n = p.st.blades, R = 1.55 * T;
  for (let i = 0; i < n; i++) {
    const a = p.bladeA + i * TAU / n, bx = p.x + Math.cos(a) * R, by = p.y - 12 + Math.sin(a) * R * .8;
    foesNear(bx, by + 12, 14, _near);
    for (const e of _near) { if (e.bladeHit > W.t) continue; e.bladeHit = W.t + .32; hurtFoe(e, (10 + p.ups.blades * 4) * (1 + (p.ups.power || 0) * .1), p, { x: p.x, y: p.y, nk: .4 }); AU.sfx('blade'); }
  }
}

/* 子彈 */
function updateBullets(dt) {
  for (const b of W.bullets) {
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }
    const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 12));
    const sx = b.vx * dt / steps, sy = b.vy * dt / steps;
    for (let s = 0; s < steps && !b.dead; s++) {
      const ox = b.x, oy = b.y;
      b.x += sx; b.y += sy;
      const t = tileAt(b.x, b.y);
      if (t === TW || t === TV) {
        if (b.bounce > 0) {
          b.bounce--; b.bounced = true;
          if (blockSight(tileAt(b.x, oy))) b.vx = -b.vx; else b.vy = -b.vy;
          if (blockSight(tileAt(ox, b.y)) && blockSight(tileAt(b.x, oy))) { b.vx = -b.vx; }
          b.x = ox; b.y = oy; spark(b.x, b.y - 18, '#ffe7b0', 4);
          if (p_ups(b.owner, 'bounce') >= 5) b.dmg *= 2;
        } else { b.dead = true; spark(ox, oy - 18, '#ffe0a0', 6); W.fx.push({ k: 'puff', x: ox, y: oy - 18, t: 0, life: .3 }); AU.sfx('wallhit'); }
        break;
      }
      // 監視器、鏡子、點滴袋
      for (const c of W.m.cams) if (!c.dead && dist2(b.x, b.y, c.x, c.y + 12) < 400) { c.hp -= b.dmg; spark(b.x, b.y - 18, '#9fd4ff', 6); b.dead = true; if (c.hp <= 0) { c.dead = true; AU.sfx('glass'); burst(c.x, c.y, '#9fd4ff', 14); } break; }
      for (const mi of W.m.mirrors) if (!mi.broken && Math.abs(b.x - mi.x) < 22 && b.y < mi.y + 14 && b.y > mi.y - 20) { breakMirror(mi, b.owner); b.dead = true; break; }
      if (W.bags) for (const g of W.bags) if (!g.dead && dist2(b.x, b.y, g.x, g.y) < 26 * 26) { g.hp -= b.dmg; spark(b.x, b.y - 18, '#bff6ff', 5); b.dead = true; if (g.hp <= 0) { g.dead = true; burst(g.x, g.y - 30, '#bff6ff', 20); AU.sfx('glass'); } break; }
      if (b.dead) break;
      foesNear(b.x, b.y, b.r + 4, _near);
      for (const e of _near) {
        if (b.hit.has(e) || e.spawn > 0) continue;
        if (e.boss && !e.awake) continue;
        b.hit.add(e);
        hurtFoe(e, b.dmg, b.owner, { x: b.x - b.vx * .02, y: b.y - b.vy * .02, crit: b.crit, bullet: b });
        if (b.split && !b.isSplit) splitBullet(b, e);
        if (b.chain) chainFrom(e, b.owner, b.dmg * b.owner.st.chainDmg, b.chain + (inWater(e.x, e.y) && (W.chi === 2 || W.chi === 4) ? 2 : 0));
        if (b.pierce > 0) { b.pierce--; if (p_ups(b.owner, 'pierce') < 5) b.dmg *= .82; }
        else { b.dead = true; break; }
      }
    }
    if (!b.dead) { b.tr.push(b.x, b.y); if (b.tr.length > 10) b.tr.splice(0, 2); }
  }
  W.bullets = W.bullets.filter(b => !b.dead);
}
const p_ups = (p, k) => (p && p.ups && p.ups[k]) || 0;
function splitBullet(b, e) {
  const n = b.split;
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(b.vy, b.vx) + (i / Math.max(1, n - 1) - .5) * 1.6 + fx(-.2, .2);
    const sp = Math.hypot(b.vx, b.vy) * .75;
    W.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: b.dmg * .4, crit: false, pierce: 0, bounce: 0, life: .35, split: p_ups(b.owner, 'split') >= 5 && !b.isSplit2 ? 2 : 0, isSplit: !(p_ups(b.owner, 'split') >= 5) || b.isSplit2, isSplit2: true, chain: 0, owner: b.owner, hit: new Set([e]), kind: 'shard', r: 4, tr: [] });
  }
}
function chainFrom(e0, p, dmg, jumps) {
  let cur = e0; const done = new Set([e0]);
  for (let j = 0; j < jumps; j++) {
    foesNear(cur.x, cur.y, 3.3 * T, _near2);
    let nx = null, nd = 1e9;
    for (const e of _near2) { if (done.has(e) || e.dead || e.spawn > 0 || (e.boss && !e.awake)) continue; const d = dist2(cur.x, cur.y, e.x, e.y); if (d < nd && los(cur.x, cur.y, e.x, e.y)) { nd = d; nx = e; } }
    if (!nx) break;
    W.fx.push({ k: 'arc', x1: cur.x, y1: cur.y - 20, x2: nx.x, y2: nx.y - 20, t: 0, life: .18, seed: Math.random() * 99 });
    W.tl.push({ x: nx.x, y: nx.y, r: 70, c: '#9fe8ff', t: 0, life: .12, i: .8 });
    done.add(nx); hurtFoe(nx, dmg, p, { x: cur.x, y: cur.y, nk: .2, chain: true });
    if (p_ups(p, 'chain') >= 5 && j === 0) chainFrom(nx, p, dmg * .7, 2);
    cur = nx;
  }
  if (jumps) AU.sfx('zap');
}

function hurtFoe(e, dmg, p, o = {}) {
  if (e.dead) return;
  if (e.boss) { if (!e.awake) return; if (e.shield) dmg *= .35; }
  e.hp -= dmg; e.flash = Math.max(e.flash, o.chain ? .045 : .08);
  const crit = o.crit;
  numFx(e, dmg, crit ? 'crit' : '');
  if (!o.chain) spark(e.x, e.y - 22, crit ? '#fff2a8' : '#ffffff', crit ? 9 : 5);
  inkSplash(e, crit ? 4 : o.chain ? (rnd.next() < .5 ? 1 : 0) : 2);
  if (!e.boss && o.x != null) {
    const a = angTo(o.x, o.y, e.x, e.y), k = (o.bullet ? WEAPONS[p.wpn.id].knock : 90) * (p ? p.st.knock : 1) * (o.nk ?? 1) * (e.elite ? .3 : 1);
    e.vx += Math.cos(a) * k; e.vy += Math.sin(a) * k;
  }
  if (p && p.st) {
    if (p.st.burn && !o.chain) { e.burnT = 3; e.burnD = p.st.burn; }
    if (p.st.chill && !o.chain) { e.slowT = 1.6; e.slowK = p.st.chill; if (p.ups.chill >= 5 && Math.random() < .12 && !e.boss) { e.stun = Math.max(e.stun, 1.5); W.fx.push({ k: 'ice', x: e.x, y: e.y, t: 0, life: 1.5 }); } }
    if (crit && p.ups.crit >= 5 && !e.boss) e.stun = Math.max(e.stun, .5);
  }
  if (crit) { W.hitstop = Math.max(W.hitstop, .025); AU.sfx('crit'); } else AU.sfx('hit');
  if (!e.boss && e.state !== 'alert' && p && !o.silent) alertFoe(e, p, .1);
  if (e.hp <= 0) killFoe(e, p, o);
}
function killFoe(e, p, o = {}) {
  if (e.dead) return;
  e.dead = true; e.deadT = .5;
  if (e.boss) { bossDie(e, p); return; }
  W.stats.kills++; if (p) p.kills++;
  W.fx.push({ k: 'dissolve', x: e.x, y: e.y, t: 0, life: .55, type: e.type, face: e.face, elite: e.elite });
  inkSplash(e, o.ass ? 18 : 12);
  AU.sfx(o.ass ? 'kill2' : 'kill');
  const n = e.xp; for (let i = 0; i < n; i++) W.picks.push({ k: 'xp', x: e.x + fx(-8, 8), y: e.y + fx(-8, 8), vx: fx(-90, 90), vy: fx(-90, 90), t: 0, v: 1.6 });
  if (e.elite) { for (let i = 0; i < 2; i++) dropMemory(e.x, e.y, rollRar(2.6 + W.depth * .5)); W.shake = Math.max(W.shake, 8); }
  if (p && p.st.regenK) p.hp = Math.min(p.hpMax, p.hp + p.st.regenK);
  if (p && p.st.boom) boom(e.x, e.y, p.st.boom, (p.ups.boom >= 5 ? 1.5 : 1) * 1.6 * T, p);
  if (p && p.ups.burn >= 5 && e.burnT > 0) { foesNear(e.x, e.y, 1.6 * T, _near2); for (const f of _near2) if (f !== e) { f.burnT = 3; f.burnD = p.st.burn; } }
}
function boom(x, y, dmg, r, p) {
  W.fx.push({ k: 'boom', x, y, r, t: 0, life: .35 }); W.tl.push({ x, y, r: r * 1.6, c: '#ffb06a', t: 0, life: .2, i: 1 });
  AU.sfx('boom');
  foesNear(x, y, r, _near2);
  for (const e of _near2.slice()) if (!e.dead) hurtFoe(e, dmg, p, { x, y, nk: .6, chain: true });
}

/* ---------- 夢衛 AI ---------- */
function updateFoe(e, dt) {
  e.anim += dt; e.flash = Math.max(0, e.flash - dt);
  if (e.spawn > 0) { e.spawn -= dt; return; }
  if (e.burnT > 0) { e.burnT -= dt; e.burnAcc = (e.burnAcc || 0) + e.burnD * dt; if (e.burnAcc >= 3) { const k = e.burnAcc; e.burnAcc = 0; e.hp -= k; numFx(e, k, 'burn'); if (e.hp <= 0) { killFoe(e, W.players[0]); return; } } if (rnd.next() < dt * 10) W.fx.push({ k: 'ember', x: e.x + fx(-10, 10), y: e.y - fx(10, 40), t: 0, life: .6 }); }
  if (e.slowT > 0) e.slowT -= dt;
  // 擊退
  if (Math.abs(e.vx) + Math.abs(e.vy) > 1) { moveBody(e, e.vx * dt, e.vy * dt); e.vx *= Math.pow(.0008, dt); e.vy *= Math.pow(.0008, dt); }
  if (e.stun > 0) { e.stun -= dt; e.wind = 0; return; }
  if (e.alertT > 0) { e.alertT -= dt; return; }
  const water = inWater(e.x, e.y) && e.type !== 'eel';
  const spdMul = (e.slowT > 0 ? 1 - e.slowK : 1) * (water ? .64 : 1) * (W.collapse ? 1.2 : 1) * (W.stage >= 1 && e.state !== 'alert' ? 1.15 : 1);
  sense(e, dt);
  switch (e.state) {
    case 'sleep': if (e.type === 'cocoon' && e.hatch > 0) hatch(e, dt); break;
    case 'wander': wander(e, dt, spdMul); break;
    case 'patrol': patrol(e, dt, spdMul); break;
    case 'sus': investigate(e, dt, spdMul); break;
    case 'alert': fight(e, dt, spdMul); break;
  }
}
function sense(e, dt) {
  if (e.state === 'alert') return;
  e.aw = Math.max(0, e.aw - dt * .35);
  for (const p of W.players) {
    if (p.state !== 'alive' || p.mirrorT > 0) continue;
    const d = dist(e.x, e.y, p.x, p.y);
    if (d > 7 * T) continue;
    const running = p.spd > 2.6 * T;
    if (e.type === 'watcher' && e.state !== 'sleep') {
      const ca = angDiff(e.face, angTo(e.x, e.y, p.x, p.y));
      const cr = FOES.watcher.cone * T;
      if (d < cr && Math.abs(ca) < FOES.watcher.fov && los(e.x, e.y - 10, p.x, p.y - 10)) {
        const rate = 1.35 * (1.6 - d / cr) * (running ? 1.3 : p.spd > 20 ? .85 : .55) * p.st.detect * (p.resonate ? 1.25 : 1);
        e.aw += rate * dt * 2;
        if (e.aw >= 1) { alertFoe(e, p, .1); if (!W.said.spot) { W.said.spot = 1; sayList(RADIO.spotted); } return; }
        continue;
      }
    }
    let R = e.notice * T * (p.resonate ? 1.3 : 1) * p.st.detect;
    if (e.state === 'sleep') R = (e.type === 'cocoon' ? 2.2 : .95) * T;
    else { const front = Math.abs(angDiff(e.face, angTo(e.x, e.y, p.x, p.y))) < 1.2; R *= (front ? 1 : .55) * (running ? 1.15 : .8); }
    if (d < R && los(e.x, e.y, p.x, p.y)) {
      if (e.type === 'cocoon') { if (!e.hatch) e.hatch = .9; return; }
      if (e.state === 'sleep') { e.state = 'sus'; e.heard = { x: p.x, y: p.y }; fxIcon(e, '?'); e.alertT = .5; return; }
      alertFoe(e, p, .3);
      // 叫醒旁邊的
      foesNear(e.x, e.y, 3 * T, _near2); for (const f of _near2) if (f !== e && f.state !== 'alert' && !f.boss) alertFoe(f, p, .5);
      return;
    }
  }
}
function stepToward(e, x, y, sp, dt) {
  const a = angTo(e.x, e.y, x, y);
  e.face += angDiff(e.face, a) * Math.min(1, dt * 8);
  const hit = moveBody(e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
  e.moving = true;
  return hit;
}
function wander(e, dt, m) {
  e.moving = false;
  if (e.type === 'eel') { e.wanderT -= dt; if (e.wanderT <= 0) { e.wanderT = rnd.range(1.5, 3); for (let k = 0; k < 6; k++) { const x = e.x + fx(-2.5, 2.5) * T, y = e.y + fx(-2.5, 2.5) * T; if (inWater(x, y)) { e.wx = x; e.wy = y; break; } } } if (dist(e.x, e.y, e.wx, e.wy) > 8) { const ox = e.x, oy = e.y; stepToward(e, e.wx, e.wy, e.spd * T * m * 1.4, dt); if (!inWater(e.x, e.y)) { e.x = ox; e.y = oy; e.wanderT = 0; } } return; }
  e.wanderT -= dt;
  if (e.wanderT <= 0) { e.wanderT = rnd.range(2, 4.5); if (rnd.next() < .6) { const a = rnd.range(0, TAU), r = rnd.range(.6, 2.2) * T; e.wx = e.home.x + Math.cos(a) * r; e.wy = e.home.y + Math.sin(a) * r; } else { e.wx = e.x; e.wy = e.y; e.face += fx(-1.5, 1.5); } }
  if (dist(e.x, e.y, e.wx, e.wy) > 10) { if (stepToward(e, e.wx, e.wy, e.spd * T * m * .6, dt)) e.wanderT = 0; }
}
function patrol(e, dt, m) {
  e.moving = false;
  if (!e.patrol) { e.state = 'wander'; return; }
  if (e.lookT > 0) { e.lookT -= dt; e.face += Math.sin(W.t * 2 + e.id) * dt * 1.2; return; }
  const pt = e.patrol[e.pi];
  if (dist(e.x, e.y, pt.x, pt.y) < 12) { e.pi = (e.pi + 1) % e.patrol.length; e.lookT = rnd.range(.6, 1.6); return; }
  if (stepToward(e, pt.x, pt.y, e.spd * T * m, dt)) e.pi = (e.pi + 1) % e.patrol.length;
}
function investigate(e, dt, m) {
  e.moving = false;
  if (!e.heard) { e.state = e.patrol ? 'patrol' : 'wander'; return; }
  if (e.lookT > 0) {
    e.lookT -= dt; e.face += dt * 2.2 * (e.id % 2 ? 1 : -1);
    if (e.lookT <= 0) { e.heard = null; e.state = e.patrol ? 'patrol' : 'wander'; e.home = { x: e.x, y: e.y }; if (e.type === 'watcher') e.aw = 0; }
    return;
  }
  if (!e.path) { e.path = pathTo(e.x, e.y, e.heard.x, e.heard.y) || []; }
  const nx = e.path[0];
  if (!nx || dist(e.x, e.y, e.heard.x, e.heard.y) < 18) { e.lookT = rnd.range(1.8, 3); return; }
  if (dist(e.x, e.y, nx.x, nx.y) < 14) { e.path.shift(); return; }
  stepToward(e, nx.x, nx.y, e.spd * T * m * 1.25, dt);
}
function fight(e, dt, m) {
  e.moving = false;
  let p = e.tgt;
  if (!p || p.state !== 'alive') { p = e.tgt = nearestPlayer(e.x, e.y); if (!p) { e.state = 'wander'; return; } }
  if (p.mirrorT > 0) { e.state = 'sus'; e.heard = e.last || { x: p.x, y: p.y }; e.path = null; return; }
  const d = dist(e.x, e.y, p.x, p.y);
  const see = d < 10 * T && los(e.x, e.y, p.x, p.y);
  if (see) { e.last = { x: p.x, y: p.y }; e.lostT = 0; } else { e.lostT += dt; if (e.lostT > 5) { e.state = 'sus'; e.heard = e.last; e.path = null; return; } }
  e.cd -= dt;
  // 正在出招
  if (e.wind > 0) {
    e.wind -= dt;
    if (e.windK !== 'dash' && e.windK !== 'scream') e.face += angDiff(e.face, angTo(e.x, e.y, p.x, p.y)) * Math.min(1, dt * 3);
    if (e.wind <= 0) resolveAttack(e, p);
    return;
  }
  if (e.dashT > 0) {
    e.dashT -= dt; moveBody(e, e.dvx * dt, e.dvy * dt);
    if (!e.dashHit) for (const q of W.players) if (q.state === 'alive' && dist(e.x, e.y, q.x, q.y) < e.r + q.r + 6) { hurtPlayer(q, e.dmg * (e.elite ? 1.2 : 1), e.x, e.y); e.dashHit = true; }
    if (rnd.next() < .8) W.fx.push({ k: 'smear', x: e.x, y: e.y, t: 0, life: .25, type: e.type, face: e.face });
    return;
  }
  const t = e.type;
  const sp = e.aspd * T * m;
  if (t === 'shade' || t === 'watcher') {
    if (d < e.r + p.r + 22 && e.cd <= 0) { e.wind = .38; e.windK = 'swipe'; e.cd = 1; return; }
    chase(e, p, sp, see, dt);
  } else if (t === 'ripper') {
    if (see && d < 5 * T && d > 1.2 * T && e.cd <= 0) { e.wind = .52; e.windK = 'dash'; e.face = angTo(e.x, e.y, p.x, p.y); e.cd = 2; return; }
    if (d < e.r + p.r + 18 && e.cd <= 0) { e.wind = .3; e.windK = 'swipe'; e.cd = .9; return; }
    chase(e, p, sp, see, dt);
  } else if (t === 'beat') {
    if (W.beat > .9 && see && d < 5.5 * T && e.cd <= 0) { e.face = angTo(e.x, e.y, p.x, p.y); e.dvx = Math.cos(e.face) * 9 * T; e.dvy = Math.sin(e.face) * 9 * T; e.dashT = .26; e.dashHit = false; e.cd = .65; AU.sfx('lunge'); return; }
    if (W.beat < .2) chase(e, p, sp * .55, see, dt); else e.face += angDiff(e.face, angTo(e.x, e.y, p.x, p.y)) * Math.min(1, dt * 6);
  } else if (t === 'echo') {
    if (see && e.cd <= 0 && d < 7 * T) { e.wind = .45; e.windK = 'orb'; e.cd = 1.9; return; }
    if (d < 3.3 * T && see) { const a = angTo(p.x, p.y, e.x, e.y); moveBody(e, Math.cos(a) * sp * .7 * dt, Math.sin(a) * sp * .7 * dt); e.face = angTo(e.x, e.y, p.x, p.y); }
    else if (d > 5.2 * T || !see) chase(e, p, sp, see, dt);
  } else if (t === 'eel') {
    if (see && inWater(p.x, p.y) && d < 3.6 * T && e.cd <= 0) { e.wind = .7; e.windK = 'shock'; e.cd = 2.2; return; }
    const tx = p.x, ty = p.y; const ox = e.x, oy = e.y; stepToward(e, tx, ty, sp * 1.2, dt); if (!inWater(e.x, e.y)) { e.x = ox; e.y = oy; }
  } else if (t === 'warden') {
    if (d < 2 * T && e.cd <= 0) { e.wind = .85; e.windK = 'slam'; e.cd = 2.4; return; }
    if (see && d > 3.2 * T && d < 7 * T && e.cd <= -1.5) { e.wind = .6; e.windK = 'dash'; e.face = angTo(e.x, e.y, p.x, p.y); e.cd = 2.6; return; }
    chase(e, p, sp, see, dt);
  } else if (t === 'cocoon') { if (!e.hatch) e.hatch = .9; hatch(e, dt); }
}
function chase(e, p, sp, see, dt) {
  if (see && dist(e.x, e.y, p.x, p.y) < 3.2 * T) { stepToward(e, p.x, p.y, sp, dt); return; }
  const nx = flowDir(e);
  if (nx) stepToward(e, nx.x, nx.y, sp, dt); else if (e.last) stepToward(e, e.last.x, e.last.y, sp, dt);
}
function resolveAttack(e, p) {
  const k = e.windK; e.windK = '';
  const d = dist(e.x, e.y, p.x, p.y);
  if (k === 'swipe') {
    W.fx.push({ k: 'claw', x: e.x, y: e.y - 20, a: e.face, t: 0, life: .2 });
    AU.sfx('swipe');
    for (const q of W.players) if (q.state === 'alive' && dist(e.x, e.y, q.x, q.y) < e.r + q.r + 30 && Math.abs(angDiff(e.face, angTo(e.x, e.y, q.x, q.y))) < 1.3) hurtPlayer(q, e.dmg, e.x, e.y);
  } else if (k === 'dash') {
    const sp = (e.type === 'warden' ? 7 : 9.5) * T;
    e.dvx = Math.cos(e.face) * sp; e.dvy = Math.sin(e.face) * sp; e.dashT = e.type === 'warden' ? .45 : .33; e.dashHit = false; AU.sfx('lunge');
  } else if (k === 'orb') {
    const a = angTo(e.x, e.y, p.x, p.y);
    W.ebul.push({ x: e.x + Math.cos(a) * 18, y: e.y + Math.sin(a) * 18, vx: Math.cos(a) * 3.4 * T, vy: Math.sin(a) * 3.4 * T, r: 9, dmg: e.dmg, life: 3, home: .7, tgt: p, k: 'orb', c: W.ch.th.foe.glow });
    AU.sfx('orb');
  } else if (k === 'slam') {
    W.fx.push({ k: 'shock', x: e.x, y: e.y, r: 2.1 * T, t: 0, life: .4 }); W.shake = Math.max(W.shake, 9); AU.sfx('slam');
    for (const q of W.players) if (q.state === 'alive' && dist(e.x, e.y, q.x, q.y) < 2.1 * T) { hurtPlayer(q, e.dmg, e.x, e.y); const a = angTo(e.x, e.y, q.x, q.y); q.vx += Math.cos(a) * 600; q.vy += Math.sin(a) * 600; }
  } else if (k === 'shock') {
    W.fx.push({ k: 'zapring', x: e.x, y: e.y, r: 3 * T, t: 0, life: .4 }); AU.sfx('zap');
    for (const q of W.players) if (q.state === 'alive' && inWater(q.x, q.y) && dist(e.x, e.y, q.x, q.y) < 3.4 * T) hurtPlayer(q, e.dmg * 1.3, e.x, e.y);
  } else if (k === 'scream') {
    if (!e.dead) {
      e.screamed = true; addWake(4); W.shake = Math.max(W.shake, 7);
      W.fx.push({ k: 'scream', x: e.x, y: e.y - 40, t: 0, life: .9 }); AU.sfx('scream');
      foesNear(e.x, e.y, 9 * T, _near2); for (const f of _near2) if (f !== e && !f.boss) alertFoe(f, p, .6);
      if (!W.said.scream) { W.said.scream = 1; sayList(RADIO.scream); }
    }
  }
}
function hatch(e, dt) {
  e.hatch -= dt;
  if (e.hatch <= 0) {
    e.dead = true; e.deadT = .4; W.fx.push({ k: 'dissolve', x: e.x, y: e.y, t: 0, life: .5, type: 'cocoon' }); inkSplash(e, 16); AU.sfx('hatch');
    const p = nearestPlayer(e.x, e.y);
    for (let i = 0; i < 3; i++) { const f = addFoe('shade', e.x + fx(-20, 20), e.y + fx(-20, 20), { state: 'alert', emerge: 0, room: e.room }); f.alertT = .4 + i * .15; if (p) f.tgt = p; }
  }
}
function separateFoes() {
  for (const e of W.foes) {
    if (e.dead || e.boss) continue;
    foesNear(e.x, e.y, e.r + 4, _near);
    for (const f of _near) {
      if (f === e || f.boss) continue;
      const d = dist(e.x, e.y, f.x, f.y), m = e.r + f.r - 4;
      if (d < m && d > .01) { const push = (m - d) * .25, a = angTo(f.x, f.y, e.x, e.y); moveBody(e, Math.cos(a) * push, Math.sin(a) * push); }
    }
  }
}
function updateEBullets(dt) {
  for (const b of W.ebul) {
    b.life -= dt; if (b.life <= 0) { b.dead = true; continue; }
    if (b.home > 0 && b.tgt) { b.home -= dt; const a = Math.atan2(b.vy, b.vx), ta = angTo(b.x, b.y, b.tgt.x, b.tgt.y), sp = Math.hypot(b.vx, b.vy); const na = a + clamp(angDiff(a, ta), -dt * 2, dt * 2); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (blockSight(tileAt(b.x, b.y)) && !b.ghost) { b.dead = true; burst(b.x, b.y - 18, b.c, 6); continue; }
    for (const p of W.players) if (p.state === 'alive' && dist(b.x, b.y, p.x, p.y) < b.r + p.r) { hurtPlayer(p, b.dmg, b.x - b.vx * .05, b.y - b.vy * .05); b.dead = true; burst(b.x, b.y - 18, b.c, 8); break; }
  }
  W.ebul = W.ebul.filter(b => !b.dead);
}

/* ---------- 玩家受傷 ---------- */
function hurtPlayer(p, dmg, sx, sy) {
  if (p.state !== 'alive' || p.inv > 0 || W.out) return;
  if (p.st.ward && p.wardT >= p.st.ward) {
    p.wardT = 0; p.inv = .4; W.fx.push({ k: 'ward', x: p.x, y: p.y, t: 0, life: .5 }); AU.sfx('ward');
    if (p.ups.ward >= 5) { foesNear(p.x, p.y, 2 * T, _near2); for (const e of _near2) hurtFoe(e, 20, p, { x: p.x, y: p.y, nk: 2 }); }
    return;
  }
  p.hp -= dmg; p.inv = .55; p.hurt = .35; p.lastHit = W.t;
  const a = angTo(sx, sy, p.x, p.y); p.vx += Math.cos(a) * 260; p.vy += Math.sin(a) * 260;
  W.shake = Math.max(W.shake, 8); W.hitstop = Math.max(W.hitstop, .04);
  W.fx.push({ k: 'num', x: p.x, y: p.y - 60, v: Math.round(dmg), t: 0, life: .7, vy: -60, hurt: 1 });
  burst(p.x, p.y - 26, '#ff5a6a', 10);
  AU.sfx('hurt'); addWake(.4);
  if (p.hp <= 0) { p.hp = 0; loseDive(p); }
}

/* ---------- 記憶 ---------- */
function rollRar(q) {
  const w = [Math.max(4, 52 - q * 15), 30 + q * 2, 9 + q * 7, q > .7 ? 1.2 + q * 3.2 : 0, q > 1.7 ? (q - 1.5) * 2.4 : 0];
  let tot = w.reduce((a, b) => a + b), k = Math.random() * tot;
  for (let i = 0; i < w.length; i++) { k -= w[i]; if (k <= 0) return i; }
  return 0;
}
function makeMemory(rar, chi, o = {}) {
  const ch = CH[chi];
  let n, f;
  if (o.n) { n = o.n; f = o.f; }
  else {
    const used = W.usedNames || (W.usedNames = new Set());
    const pick = list => { const free = list.filter(x => !used.has(x[0])); return free.length ? rnd.pick(free) : null; };
    const r = (Math.random() < .55 && ch.pool ? pick(ch.pool) : null) || pick(POOL) || (ch.pool && pick(ch.pool)) || rnd.pick(POOL);
    n = r[0]; f = r[1]; used.add(n);
  }
  const R0 = RAR[rar];
  const size = o.size || [1, rnd.next() < .2 ? 2 : 1, rnd.next() < .45 ? 2 : 1, 2, rnd.next() < .5 ? 3 : 2, 1][rar];
  let val = o.val || Math.round(fx(R0.v[0], R0.v[1]) * (1 + W.depth * .3) * (1 + chi * .12) / 5) * 5;
  return { id: uid() + '_' + Date.now(), n, f, rar, size, val, ch: chi, key: o.key || null, kind: o.kind || 'gen', pocket: false, d: W.depth };
}
function landSpot(x, y, R0) {
  for (let k = 0; k < 40; k++) {
    const a = rnd.range(0, TAU), r = rnd.range(.35, 1) * (R0 || 1.3 * T) * (1 + k / 40);
    const lx = x + Math.cos(a) * r, ly = y + Math.sin(a) * r * .8;
    if (walkable(tileAt(lx, ly)) && !boxHits(lx, ly, 13) && W.picks.every(o => o.k !== 'mem' || dist2(o.x, o.y, lx, ly) > 26 * 26)) return { x: lx, y: ly };
  }
  const p = nearestPlayer(x, y); return p ? { x: p.x + fx(-10, 10), y: p.y + fx(-10, 10) } : { x, y };
}
function dropMemory(x, y, rar, item) {
  const it = item || makeMemory(rar, W.chi);
  const L = landSpot(x, y), vz = fx(300, 360), ft = 2 * vz / 900;
  W.picks.push({ k: 'mem', x, y, z: 0, vz, vx: (L.x - x) / ft, vy: (L.y - y) / ft, t: 0, item: it, beam: 0, ign: 0, lx: L.x, ly: L.y });
  if (it.rar >= 4) { W.slowmo = .5; AU.sfx('goldDrop'); W.stats.gold++; } else AU.sfx('drop', it.rar);
}
function openContainer(c, p) {
  c.open = true; c.openT = W.t;
  const n = 1 + (c.q > 1.2 ? 1 : 0) + (c.q > 2.4 ? 1 : 0) + (Math.random() < .35 ? 1 : 0) + (p.ups.hands >= 5 ? 1 : 0);
  const fxp = c.side === 'w' ? { x: c.x + T * .9, y: c.y + T * .2 } : c.side === 'e' ? { x: c.x - T * .9, y: c.y + T * .2 } : { x: c.x, y: c.y + T * .8 };
  let k = 0;
  if (c.special) { const it = lifeItem(c.special); if (it) { dropMemory(fxp.x, fxp.y, 3, it); k++; } }
  for (; k < n; k++) dropMemory(fxp.x + fx(-14, 14), fxp.y, rollRar(c.q));
  for (let i = 0; i < 2; i++) { const L = landSpot(fxp.x, fxp.y, T); W.picks.push({ k: 'xp', x: L.x, y: L.y, vx: 0, vy: 0, t: 0, v: 1.6 }); }
  if (Math.random() < .12) { const L = landSpot(fxp.x, fxp.y, T); W.picks.push({ k: 'candy', x: L.x, y: L.y, vx: 0, vy: 0, t: 0 }); }
  burst(c.x, c.y - 10, '#fff1c8', 14); AU.sfx('open');
  W.fx.push({ k: 'openring', x: c.x, y: c.y, t: 0, life: .5 });
}
function lifeItem(key) {
  const mm = /^(\w+?)_life(\d)$/.exec(key); if (!mm) return null;
  const ch = CH.find(c => c.id === mm[1]), idx = +mm[2]; if (!ch) return null;
  const [n, f] = ch.life.items[idx];
  return { id: uid() + '_' + Date.now(), n, f, rar: 3, size: 2, val: Math.round(fx(900, 1300) / 10) * 10, ch: CH.indexOf(ch), key, kind: 'life', pocket: false };
}
function qingItem(q) { return { id: uid() + '_q', n: q.n, f: q.f, rar: 4, size: 2, val: Math.round(fx(3600, 4800) / 10) * 10, ch: 4, key: q.key, kind: 'qing', pocket: false }; }
function coreItem(chi) { const c = CH[chi].core; return { id: uid() + '_c', n: c.n, f: c.f, rar: 5, size: 1, val: 0, ch: chi, key: 'core_' + CH[chi].id, kind: 'core', pocket: false }; }

function updateSearch(p, dt) {
  if (p.spd > 26 || p.dashT > 0) { p.still = 0; if (p.search) { p.search = null; } }
  else p.still += dt;
  let best = null, bd = 1e9;
  for (const c of W.m.containers) {
    if (c.open) continue;
    const x0 = c.tx * T, x1 = (c.tx + c.w) * T, y0 = c.ty * T, y1 = (c.ty + 1) * T;
    const cx = clamp(p.x, x0, x1), cy = clamp(p.y, y0, y1), d = dist(p.x, p.y, cx, cy);
    if (d < .95 * T + p.r && d < bd) { bd = d; best = c; }
  }
  p.near = best;
  if (best && p.still > .12 && !p.carry) {
    if (!p.search) { p.search = best; if (!G.flags.search) { G.flags.search = 1; sayList(RADIO.firstSearch); } }
    if (p.search === best) {
      best.prog += dt * p.st.search / best.t;
      if (rnd.next() < dt * 6) AU.sfx('rummage');
      if (best.prog >= 1) { openContainer(best, p); p.search = null; }
    }
  }
}

function updatePicks(dt) {
  for (const k of W.picks) {
    k.t += dt;
    if (k.k === 'mem') {
      if (k.vz != null && (k.z > 0 || k.vz > 0)) { k.z += k.vz * dt; k.vz -= 900 * dt; k.x += k.vx * dt; k.y += k.vy * dt; if (k.z <= 0) { k.z = 0; k.vz = null; if (k.lx != null) { k.x = k.lx; k.y = k.ly; } AU.sfx('land', k.item.rar); W.fx.push({ k: 'land', x: k.x, y: k.y, c: RAR[k.item.rar].c, t: 0, life: .5 }); } }
      k.beam = Math.min(1, k.beam + dt * 2);
      if (k.z > 0) continue;
      for (const p of W.players) {
        if (p.state !== 'alive') continue;
        const d = dist(p.x, p.y, k.x, k.y);
        if (d < p.r + 18) {
          if (k.ign > W.t) continue;
          if (p.carry && !k.item.carryOk) { offerDropQing(p, k); continue; }
          if (bagUsed(p) + k.item.size <= p.cap) takeMemory(p, k);
          else offerSwap(p, k);
        }
      }
    } else {
      // 夢屑、糖
      if (k.vx) { k.x += k.vx * dt; k.y += k.vy * dt; k.vx *= Math.pow(.02, dt); k.vy *= Math.pow(.02, dt); if (Math.abs(k.vx) < 4) k.vx = 0; }
      const p = nearestPlayer(k.x, k.y); if (!p) continue;
      const d = dist(p.x, p.y, k.x, k.y), R = (k.k === 'xp' ? 2.2 : 1.3) * T * p.st.magnet * (p.ups.magnet >= 5 && k.k === 'xp' ? 20 : 1);
      if (d < R && k.t > .35) { const sp = 7 * T * (1 - d / R) + 2 * T, a = angTo(k.x, k.y, p.x, p.y); k.x += Math.cos(a) * sp * dt; k.y += Math.sin(a) * sp * dt; k.vx = 0; k.vy = 0; }
      if (d < p.r + 8 && k.t > .35) {
        k.dead = true;
        if (k.k === 'xp') { gainXp(p, k.v); AU.sfx('xp'); }
        else if (k.k === 'candy') { const maxC = 3 + G.meta.candy * 2; if (p.candies < maxC) { p.candies++; toast('撿到一顆醒神糖', 'good'); AU.sfx('candy'); } else { p.hp = Math.min(p.hpMax, p.hp + 15); AU.sfx('candy'); } }
      }
    }
  }
  W.picks = W.picks.filter(k => !k.dead);
}
function takeMemory(p, k) {
  k.dead = true;
  const it = k.item;
  p.bag.push(it);
  if (it.kind === 'core' || it.kind === 'qing') { const pk = p.bag.filter(i => i.pocket).length; if (pk < p.pocketCap) it.pocket = true; }
  AU.sfx('pick', it.rar);
  W.fx.push({ k: 'pickflash', x: p.x, y: p.y, c: RAR[it.rar].c, t: 0, life: .45 });
  W.fx.push({ k: 'label', x: p.x, y: p.y - 70, s: it.n, c: RAR[it.rar].c, t: 0, life: 1.6 });
  UI.onPick && UI.onPick(it);
  if (it.rar >= 4 && it.kind === 'gen' && !W.said.gold) { W.said.gold = 1; sayList(RADIO.gold); }
  if (it.kind === 'core') sayList(RADIO.core);
  if (it.kind === 'qing') { sayList(G.flags.qing ? RADIO.qing2 : RADIO.qing); G.flags.qing = 1; }
}
function offerSwap(p, k) {
  if (UI.swapOpen || W.out) return;
  k.ign = W.t + 3;
  if (!W.said.full) { W.said.full = 1; sayList(RADIO.bagFull); }
  UI.openSwap(p, k);
}
function offerDropQing(p, k) { if (UI.swapOpen) return; k.ign = W.t + 3; UI.openPutDown(p, k); }

function gainXp(p, v) {
  p.xp += v;
  while (p.xp >= xpNeed(p.lvl)) { p.xp -= xpNeed(p.lvl); p.lvl++; p.pend++; AU.sfx('levelup'); W.fx.push({ k: 'lvl', x: p.x, y: p.y, t: 0, life: .9 }); }
  if (p.pend && UI.wantLevelUp) UI.wantLevelUp(p);
}
function upChoices(p) {
  const pool = UP_IDS.filter(k => (p.ups[k] || 0) < 5);
  const out = [];
  while (out.length < 3 && pool.length) {
    const k = rnd.weighted(pool, x => UPS[x].w * ((p.ups[x] || 0) > 0 ? 1.35 : 1));
    out.push(k); pool.splice(pool.indexOf(k), 1);
  }
  return out;
}
function applyUp(p, k) {
  const before = p.ups[k] || 0;
  p.ups[k] = before + 1;
  calcStats(p);
  if (k === 'vigor') p.hp = p.ups[k] >= 5 ? p.hpMax : Math.min(p.hpMax, p.hp + 30);
  p.pend--;
}

/* ---------- 夢具、糖 ---------- */
function useTool(p) {
  if (p.state !== 'alive') return;
  const t = p.tool, def = TOOLS[t.id];
  if (t.cd > 0) return;
  if (t.id === 'incense') {
    if (t.uses <= 0) { toast('安眠香已經用掉了', 'bad'); return; }
    if (W.collapse) { toast('夢已經在崩了', 'bad'); return; }
    t.uses--; addWake(-20); W.stage = W.wake >= 75 ? 3 : W.wake >= 50 ? 2 : W.wake >= 25 ? 1 : 0;
    W.fx.push({ k: 'calm', x: p.x, y: p.y, t: 0, life: 1.6 }); AU.sfx('incense'); toast('夢主睡得更沉了', 'good');
    return;
  }
  t.cd = def.cd;
  if (t.id === 'decoy') {
    let a = Math.hypot(p.input.mx, p.input.my) > .2 ? Math.atan2(p.input.my, p.input.mx) : p.aim;
    const d = Math.min(4.2 * T, rayDist(p.x, p.y, a, 4.2 * T) - 16);
    const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    W.decoys.push({ x, y, sx: p.x, sy: p.y, t: 0, life: 6.5, fly: .35, pulse: 0 });
    AU.sfx('throw');
  } else if (t.id === 'mirror') {
    p.mirrorT = 5; AU.sfx('mirror'); W.fx.push({ k: 'mirrorfx', x: p.x, y: p.y, t: 0, life: .6 });
    for (const e of W.foes) if (!e.dead && !e.boss && e.state === 'alert' && e.tgt === p) { e.state = 'sus'; e.heard = { x: p.x, y: p.y }; e.path = null; e.lookT = 0; }
  } else if (t.id === 'stun') {
    foesNear(p.x, p.y, 3.6 * T, _near2);
    for (const e of _near2) { if (e.boss) { e.stunT2 = 1; continue; } e.stun = 2.5; W.fx.push({ k: 'pin', x: e.x, y: e.y, t: 0, life: 2.5 }); }
    W.fx.push({ k: 'needles', x: p.x, y: p.y, t: 0, life: .5 }); AU.sfx('stun');
  }
}
function useCandy(p) {
  if (p.state !== 'alive' || p.candies <= 0 || p.hp >= p.hpMax) return;
  p.candies--; p.hp = Math.min(p.hpMax, p.hp + 45 * p.st.heal);
  W.fx.push({ k: 'heal', x: p.x, y: p.y, t: 0, life: .8 }); AU.sfx('candy');
}
function updateDecoys(dt) {
  for (const d of W.decoys) {
    d.t += dt;
    if (d.fly && d.t < d.fly) continue;
    if (d.fly && !d.landed) { d.landed = true; AU.sfx('glassTink'); }
    d.pulse -= dt;
    if (d.pulse <= 0) {
      d.pulse = .7; W.noises.push({ x: d.x, y: d.y, r: 6.5 * T, t: 0, kind: 'decoy' });
      foesNear(d.x, d.y, 6.5 * T, _near2);
      for (const e of _near2) { if (e.boss || e.type === 'cocoon') continue; if (e.state === 'alert' && Math.random() < (d.ghost ? .3 : .5) && dist(e.x, e.y, d.x, d.y) < 5 * T) { e.state = 'sus'; } if (e.state !== 'alert') { e.state = 'sus'; e.heard = { x: d.x, y: d.y }; e.path = null; e.lookT = 0; } }
    }
  }
  W.decoys = W.decoys.filter(d => d.t < d.life);
}

/* ---------- 章節機關：監視器、鏡子、渡夢人 ---------- */
function updateCams(dt) {
  for (const c of W.m.cams) {
    if (c.dead) continue;
    c.a = c.base + Math.sin(W.t * .7 + c.ph) * c.sweep;
    if (c.cool > 0) { c.cool -= dt; c.aware = 0; continue; }
    let seen = false;
    for (const p of W.players) {
      if (p.state !== 'alive' || p.mirrorT > 0) continue;
      const d = dist(c.x, c.y, p.x, p.y);
      if (d < 6.2 * T && Math.abs(angDiff(c.a, angTo(c.x, c.y, p.x, p.y))) < .42 && los(c.x, c.y + 10, p.x, p.y)) { seen = true; c.aware += dt * 1.1 * p.st.detect * (p.spd > 2.6 * T ? 1.4 : 1); }
    }
    if (!seen) c.aware = Math.max(0, c.aware - dt * .5);
    if (c.aware >= 1) {
      c.aware = 0; c.cool = 9; addWake(3); AU.sfx('alarm'); W.shake = Math.max(W.shake, 5);
      W.fx.push({ k: 'scream', x: c.x, y: c.y, t: 0, life: .9 });
      const p = nearestPlayer(c.x, c.y);
      foesNear(c.x, c.y, 8 * T, _near2); for (const e of _near2) if (!e.boss && p) alertFoe(e, p, .5);
      if (!W.said.cam) { W.said.cam = 1; say('man', '監視器拍到你了！整層都知道你在哪！'); }
    }
  }
}
function breakMirror(mi, p) {
  mi.broken = true; AU.sfx('glass'); addWake(1.5); W.shake = Math.max(W.shake, 4);
  for (let i = 0; i < 22; i++) W.fx.push({ k: 'glass', x: mi.x + fx(-16, 16), y: mi.y - fx(0, 40), vx: fx(-160, 160), vy: fx(-200, 40), t: 0, life: fx(.5, 1), rot: fx(0, 6) });
  if (mi.loot) dropMemory(mi.x, mi.y + T * .6, rollRar(1.6 + W.depth * .6));
}
function updateMirrors(dt) {
  if (W.chi !== 3) return;
  for (const mi of W.m.mirrors) {
    if (mi.broken) continue;
    mi.cd -= dt;
    const p = nearestPlayer(mi.x, mi.y);
    if (!p || mi.cd > 0) continue;
    const d = dist(mi.x, mi.y, p.x, p.y);
    if (W.wake >= 20 && d < 6 * T && d > 1.5 * T) {
      mi.cd = fx(9, 15) - W.stage * 1.5;
      const alive = W.foes.filter(e => !e.dead && e.fromMirror === mi.id).length;
      if (alive >= 2) continue;
      const e = addFoe(rnd.next() < .6 ? 'shade' : 'ripper', mi.x, mi.y + T * .6, { state: 'alert', emerge: 1, room: mi.room });
      e.fromMirror = mi.id; e.tgt = p; e.spawn = .8; AU.sfx('mirrorSpawn');
      W.fx.push({ k: 'mirrorfx', x: mi.x, y: mi.y + 20, t: 0, life: .6 });
    }
  }
}
function updateFerry(dt) {
  const f = W.ferry; if (!f || f.gone) return;
  f.t += dt;
  if (W.collapse) { f.gone = true; W.fx.push({ k: 'dissolve', x: f.x, y: f.y, t: 0, life: .8, type: 'ferry' }); return; }
  if (dist(f.x, f.y, f.tx, f.ty) < 10 || (f.t % 9 < dt)) {
    for (let k = 0; k < 8; k++) { const a = rnd.range(0, TAU), r = rnd.range(1, 3) * T, x = f.x + Math.cos(a) * r, y = f.y + Math.sin(a) * r; if (walkable(tileAt(x, y)) && !boxHits(x, y, 12)) { f.tx = x; f.ty = y; break; } }
  }
  const a = angTo(f.x, f.y, f.tx, f.ty); const ox = f.x, oy = f.y;
  if (dist(f.x, f.y, f.tx, f.ty) > 10) { f.x += Math.cos(a) * .55 * T * dt; f.y += Math.sin(a) * .55 * T * dt; if (boxHits(f.x, f.y, 12)) { f.x = ox; f.y = oy; f.tx = f.x; f.ty = f.y; } f.face = Math.cos(a) >= 0 ? 1 : -1; }
}

/* ---------- 增援 ---------- */
function spawnAway(minD, maxD, type, o = {}) {
  const m = W.m;
  for (let k = 0; k < 40; k++) {
    const r = rnd.pick(m.rooms);
    const x = (rnd.int(r.x, r.x + r.w - 1) + .5) * T, y = (rnd.int(r.y, r.y + r.h - 1) + .5) * T;
    if (!walkable(tileAt(x, y)) || boxHits(x, y, 14)) continue;
    const ti = Math.floor(y / T) * m.w + Math.floor(x / T);
    if (W.vis[ti] && !o.anyVis) continue;
    const p = nearestPlayer(x, y); if (!p) return null;
    const d = dist(x, y, p.x, p.y); if (d < minD * T || d > maxD * T) continue;
    if (W.flow[ti] < 0) continue;
    const e = addFoe(type, x, y, { state: 'alert', emerge: 1, room: r.i });
    e.spawn = .9; e.tgt = p;
    return e;
  }
  return null;
}
function updateSpawns(dt) {
  if (W.stage < 2 && !W.collapse) return;
  W.spawnT -= dt;
  if (W.spawnT > 0) return;
  const st = W.collapse ? 4 : W.stage;
  W.spawnT = Math.max(4.5, 15 - st * 2.6 - W.depth);
  const alive = W.foes.filter(e => !e.dead && e.state === 'alert').length;
  if (alive > 14 + W.depth * 3) return;
  const n = st - 1 + (rnd.next() < .4 ? 1 : 0);
  for (let i = 0; i < n; i++) spawnAway(8, 16, rnd.pick(st >= 3 && W.depth >= 1 && rnd.next() < .15 ? ['warden'] : ['shade', 'shade', 'ripper', W.depth ? 'echo' : 'shade']));
}

/* ---------- 出口與互動 ---------- */
function updateAct(p) {
  let act = null;
  for (const e of W.m.exits) {
    const d = dist(p.x, p.y, e.x, e.y);
    if (e.type === 'stairs' && d < 1.3 * T && !W.collapse) act = { k: 'stairs', e, label: '下潛' };
    if (e.type === 'bell' && d < 1.5 * T && (!W.collapse || W.finalPhase >= 2) && !W.channel) act = { k: 'bell', e, label: '敲鐘' };
    if (e.type === 'window' && d < 1.6 * T) act = { k: 'window', e, label: '跳窗' };
  }
  if (W.ferry && !W.ferry.gone && dist(p.x, p.y, W.ferry.x, W.ferry.y) < 1.5 * T) act = { k: 'ferry', label: '渡夢' };
  if (W.qing && !W.qing.carried && dist(p.x, p.y, W.qing.x, W.qing.y) < 1.3 * T) act = { k: 'qing', label: '背起她' };
  if (act && !p.act) {
    if (act.k === 'window' && !W.said.win) { W.said.win = 1; sayList(RADIO.window); }
    if (act.k === 'ferry' && !W.said.ferry) { W.said.ferry = 1; sayList(RADIO.ferry); }
  }
  p.act = act;
}
function doAct(p) {
  const a = p.act; if (!a || p.state !== 'alive') return;
  if (W.busy) return;
  if (a.k === 'stairs') descend();
  else if (a.k === 'bell') startChannel(p, a.e);
  else if (a.k === 'window') { if (p.carry) { toast('背著她跳不下去', 'bad'); return; } if (bagUsed(p) - pocketUsed(p) > 6) UI.openWindowPick(p); else extract(p, 'window'); }
  else if (a.k === 'ferry') UI.openFerry(p);
  else if (a.k === 'qing') pickUpQing(p);
}
const pocketUsed = p => p.bag.filter(i => i.pocket).reduce((s, i) => s + i.size, 0);
function descend() {
  if (W.depth >= 2 || W.busy) return;
  W.busy = true;
  AU.sfx('descend');
  UI.fadeTo(() => {
    W.busy = false;
    if (W.depth >= 2 || W.out) return;
    W.depth++; buildLayer();
    const lbl = ['淺眠', '深眠', '夢核'][W.depth];
    UI.banner(lbl, W.ch.dreamer + '的夢・第 ' + (W.depth + 1) + ' 層');
    sayList(RADIO.descend);
    if (W.ch.say['d' + W.depth]) sayList(W.ch.say['d' + W.depth], 2.5);
    AU.music('dream', W.chi, W.depth);
  });
}
function startChannel(p, e) {
  W.channel = { p, e, t: 0, need: 12, waveT: 1.2 };
  addWake(4); AU.sfx('bell'); W.shake = Math.max(W.shake, 6); sayList(RADIO.bell);
  W.fx.push({ k: 'bellring', x: e.x, y: e.y, t: 0, life: 1.2 });
}
function updateChannel(dt) {
  const c = W.channel; if (!c) return;
  const p = c.p;
  if (p.state !== 'alive') { W.channel = null; return; }
  if (W.collapse && W.finalPhase < 2) { W.channel = null; return; }
  const inside = dist(p.x, p.y, c.e.x, c.e.y) < 2.4 * T;
  if (inside) c.t += dt; else c.t = Math.max(0, c.t - dt * .5);
  c.inside = inside;
  c.waveT -= dt;
  if (c.waveT <= 0) {
    c.waveT = Math.max(1.4, 2.6 - W.depth * .4);
    const n = 1 + W.depth + (W.stage >= 2 ? 1 : 0) + (W.finalPhase >= 2 ? 1 : 0);
    for (let i = 0; i < n; i++) spawnAway(4.5, 10, rnd.pick(['shade', 'shade', 'ripper', 'echo']), { anyVis: true });
    AU.sfx('bellTick');
  }
  if (c.t >= c.need) { W.channel = null; extract(p, 'bell'); }
}

/* ---------- 終章：背起她 ---------- */
function pickUpQing(p) {
  if (!W.qing || W.qing.carried) return;
  const loose = p.bag.filter(i => !i.pocket);
  if (loose.length) {
    for (const it of loose) dropMemory(p.x + fx(-20, 20), p.y + fx(-10, 10), it.rar, Object.assign(it, { carryOk: false }));
    p.bag = p.bag.filter(i => i.pocket);
  }
  p.carry = W.qing; W.qing.carried = true; AU.sfx('carry');
  if (!W.said.carry) { W.said.carry = 1; say('wei', '……晴，抓緊。'); }
  if (W.finalPhase < 2) { W.finalPhase = 2; startCollapse(60); W.wake = 100; say('man', '夢在崩！鐘門還在——快去敲鐘！'); }
  calcStats(p);
}
function putDownQing(p) {
  if (!p.carry) return;
  W.qing.carried = false; W.qing.x = p.x + 10; W.qing.y = p.y + 6; p.carry = null; AU.sfx('drop', 3);
}

/* ---------- 撤離、迷失 ---------- */
function extract(p, how, keep) {
  if (W.out) return;
  if (how === 'window' && keep) p.bag = keep;
  if (how === 'wake') p.bag = p.bag.filter(i => i.pocket);
  p.state = 'out';
  W.out = true;
  AU.sfx(how === 'window' ? 'fall' : 'extract');
  const carried = !!p.carry;
  W.result = { ok: true, how, items: p.bag.slice(), lost: [], p, carried };
  UI.endDive(W.result);
}
function loseDive(p) {
  if (W.out) return;
  p.state = 'dead'; W.out = true;
  const kept = p.bag.filter(i => i.pocket), lost = p.bag.filter(i => !i.pocket);
  W.result = { ok: false, how: 'lost', items: kept, lost, p };
  AU.sfx('lost');
  UI.endDive(W.result);
}

/* ---------- 視野（光線） ---------- */
function updateVis(force) {
  const p = W.players[0]; if (!p) return;
  const R = 7.6 * T * p.st.lantern;
  W.vis.fill(0);
  const poly = [];
  const N = 140;
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU;
    const d = Math.min(R, rayDist(p.x, p.y - 4, a, R) + 10);
    poly.push(p.x + Math.cos(a) * d, p.y - 4 + Math.sin(a) * d);
    // 標記看得到的格子
    for (let s = 0; s < d + T * .5; s += T * .45) {
      const x = p.x + Math.cos(a) * s, y = p.y - 4 + Math.sin(a) * s;
      const tx = Math.floor(x / T), ty = Math.floor(y / T);
      if (tx < 0 || ty < 0 || tx >= W.m.w || ty >= W.m.h) break;
      const k = ty * W.m.w + tx; W.vis[k] = 1; W.seen[k] = 1;
      if (blockSight(W.m.tiles[k])) break;
    }
  }
  // 牆的正面也看得到（站在牆下時）
  const ptx = Math.floor(p.x / T), pty = Math.floor(p.y / T);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const tx = ptx + dx, ty = pty + dy; if (tx >= 0 && ty >= 0 && tx < W.m.w && ty < W.m.h) { const k = ty * W.m.w + tx; W.vis[k] = 1; W.seen[k] = 1; } }
  W.visPoly = poly;
}

/* ---------- 特效小工具 ---------- */
function spark(x, y, c, n) { for (let i = 0; i < n; i++) { const a = rnd.range(0, TAU), s = fx(80, 320); W.fx.push({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: fx(.12, .3), c }); } }
function burst(x, y, c, n) { for (let i = 0; i < n; i++) { const a = rnd.range(0, TAU), s = fx(40, 200); W.fx.push({ k: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, t: 0, life: fx(.3, .7), c, s: fx(2, 4.5) }); } }
function inkSplash(e, n) { const c = W.ch.th.foe.body; for (let i = 0; i < n; i++) { const a = rnd.range(0, TAU), s = fx(150, 290); W.fx.push({ k: 'ink', x: e.x + Math.cos(a) * 16, y: e.y - fx(12, 34) + Math.sin(a) * 8, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 70, t: 0, life: fx(.22, .42), c, s: fx(2, 4.5) }); } }
/* 傷害數字：同一隻在很短時間內連續挨打，就加在同一個數字上（不會疊成一團） */
function numFx(e, v, kind) {
  const live = f => f && f.t < .3 && W.t - f.born < .55 && W.fx.includes(f);
  if (kind === 'burn' && live(e.numN)) { e.numN.v += v; return; }   // 燒傷併進正在跳的數字，不另外冒一個
  const key = kind === 'burn' ? 'numB' : kind === 'crit' ? null : 'numN', old = key && e[key];
  if (live(old)) { old.v += v; old.t = Math.min(old.t, .1); if (kind !== 'burn') old.pop = .14; return; }
  const [nx, ny] = numSpot(e.x + fx(-6, 6), e.y - (e.boss ? 90 : 46) + (kind === 'burn' ? 10 : 0), kind === 'crit');
  if (nx == null) return;
  const f = { k: 'num', x: nx, y: ny, v, crit: kind === 'crit', burn: kind === 'burn', t: 0, born: W.t, life: kind === 'crit' ? .9 : kind === 'burn' ? .55 : .65, vy: kind === 'burn' ? -50 : -70 };
  if (key) e[key] = f;
  W.fx.push(f);
}
/* 找一個不會蓋到其他數字的位置；畫面上數字太多時，小傷害就不再冒新的 */
const _nums = [];
const NUM_TRY = [[0, 0], [-24, -4], [24, -4], [0, -17], [-34, -18], [34, -18], [-14, -32], [14, -32], [0, -46]];
function numSpot(x, y, big) {
  _nums.length = 0;
  for (const f of W.fx) if (f.k === 'num' && f.t < f.life * .8 && Math.abs(f.x - x) < 90 && Math.abs(f.y - y) < 80) _nums.push(f);
  if (_nums.length > 9 && !big) return [null, null];
  const wOf = f => (String(Math.round(f.v)).length * 9 + 8) * (f.crit ? 1.45 : 1);
  const myW = big ? 40 : 26;
  for (const [dx, dy] of NUM_TRY) {
    const nx = x + dx, ny = y + dy;
    if (_nums.every(f => Math.abs(f.x - nx) >= (wOf(f) + myW) / 2 || Math.abs(f.y - ny) >= (f.crit || big ? 20 : 15))) return [nx, ny];
  }
  return [x + fx(-16, 16), y - fx(6, 26)];
}
function fxIcon(e, s) { W.fx.push({ k: 'icon', e, s, t: 0, life: s === '!' ? .9 : .8 }); if (s === '!') AU.sfx('alert'); }
function updateFx(dt) {
  for (const f of W.fx) {
    f.t += dt;
    if (f.vx != null && f.k !== 'shell') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= Math.pow(.05, dt); f.vy *= Math.pow(.05, dt); if (f.k === 'dot' || f.k === 'ink' || f.k === 'glass') f.vy += 380 * dt; }
    if (f.k === 'shell') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 700 * dt; }
    if (f.k === 'num' || f.k === 'label') { f.y += (f.vy || -30) * dt * (1 - f.t / f.life); if (f.pop) f.pop = Math.max(0, f.pop - dt); }
  }
  W.fx = W.fx.filter(f => f.t < f.life);
  for (const l of W.tl) l.t += dt;
  W.tl = W.tl.filter(l => l.t < l.life);
}
