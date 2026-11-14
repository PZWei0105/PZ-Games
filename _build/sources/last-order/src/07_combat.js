/* ===== 武器、屍體、Boss、投射物、特效 ===== */
const GUNS = {
  pistol: { name: '警用手槍', icon: 'pistol', dmg: 14, rate: 3.0, mag: 12, reload: 1.05, spread: 0.05, speed: 380, range: 170, pellets: 1, res: Infinity, snd: 'pistol', kb: 40, col: '#ffe08a' },
  shotgun: { name: '霰彈槍', icon: 'shotgun', dmg: 10, rate: 1.1, mag: 6, reload: 1.7, spread: 0.3, speed: 340, range: 128, pellets: 7, res: 42, snd: 'shotgun', kb: 90, col: '#ffcf6a' },
  rifle: { name: 'T91 步槍', icon: 'rifle', dmg: 13, rate: 8.5, mag: 30, reload: 1.5, spread: 0.07, speed: 440, range: 205, pellets: 1, res: 210, snd: 'rifle', kb: 30, col: '#fff0b0' }
};
const ZT = {
  walker: { tpl: 'walker', hp: 18, spd: [18, 25], dmg: 7, xp: 3, r: 5, mass: 1, hh: 8 },
  runner: { tpl: 'runner', hp: 12, spd: [47, 55], dmg: 5, xp: 4, r: 4.5, mass: 0.8, pal: 'z_jogger', hh: 7 },
  brute: { tpl: 'brute', hp: 130, spd: [15, 18], dmg: 16, xp: 14, r: 8, mass: 4, pal: 'z_brute', hh: 10 },
  bloater: { tpl: 'bloater', hp: 24, spd: [21, 25], dmg: 0, xp: 5, r: 6, mass: 1.5, pal: 'z_bloater', hh: 8 },
  spitter: { tpl: 'spitter', hp: 28, spd: [19, 23], dmg: 5, xp: 6, r: 5, mass: 1, pal: 'z_spitter', hh: 7 },
  riot: { tpl: 'riot', hp: 70, spd: [19, 23], dmg: 10, xp: 10, r: 5.5, mass: 2.5, pal: 'z_riot', hh: 8 }
};
const BOSSDEF = {
  riotboss: { name: '鎮暴隊長', sub: '正面的盾打不穿。引牠去撞柱子。', tpl: 'riotboss', pal: 'riotboss', hp: 1500, r: 9, spd: 25, dmg: 14, hh: 13 },
  abiao: { name: '阿彪', sub: '豹哥的表弟。三天前被咬，用鐵鍊鎖在地下室。', tpl: 'abiao', pal: 'abiao', hp: 2600, r: 10, spd: 29, dmg: 18, hh: 12 },
  bed7: { name: '七床', sub: '貨輪「東昇十二號」船員。入院時體溫 41.2 度。', tpl: 'bed7', pal: 'bed7', hp: 3300, r: 11, spd: 24, dmg: 16, hh: 13 },
  giant: { name: '巨人', sub: '聯結車司機。被咬之後，身體還在長。', tpl: 'giant', pal: 'giant', hp: 4400, r: 12, spd: 22, dmg: 20, hh: 14 },
  captain: { name: '船長', sub: '東昇十二號船長。一切從他的船開始。', tpl: 'captain', pal: 'captain', hp: 6800, r: 13, spd: 24, dmg: 20, hh: 15 }
};
const xpNeed = L => Math.round(12 + L * 9 + L * L * 1.1);
const Q1 = [], Q2 = [], Q3 = [], Q4 = [];
const BLOODC = ['#6d1616', '#5a0f12', '#7d1717', '#4a0c0c', '#8a1c1c'];

/* 空間格 */
const Grid = {
  cs: 24, w: 0, h: 0, cells: null, used: [],
  init(m) { this.w = Math.ceil(m.pw / this.cs) + 1; this.h = Math.ceil(m.ph / this.cs) + 1; this.cells = []; for (let i = 0; i < this.w * this.h; i++) this.cells.push([]); this.used = []; },
  clear() { for (const i of this.used) this.cells[i].length = 0; this.used.length = 0; },
  add(z) { const cx = clamp((z.x / this.cs) | 0, 0, this.w - 1), cy = clamp((z.y / this.cs) | 0, 0, this.h - 1), i = cy * this.w + cx, c = this.cells[i]; if (!c.length) this.used.push(i); c.push(z); },
  query(x, y, r, out) {
    out.length = 0;
    const x0 = clamp(((x - r) / this.cs) | 0, 0, this.w - 1), x1 = clamp(((x + r) / this.cs) | 0, 0, this.w - 1), y0 = clamp(((y - r) / this.cs) | 0, 0, this.h - 1), y1 = clamp(((y + r) / this.cs) | 0, 0, this.h - 1);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const c = this.cells[cy * this.w + cx]; for (let k = 0; k < c.length; k++) out.push(c[k]); }
    return out;
  }
};

/* ---------- 玩家 ---------- */
function newPlayer(x, y) {
  return {
    x, y, r: 5, hp: 100, mhp: 100, face: 1, aim: 0, an: 0, moving: false, inv: 0, roll: 0, rollDx: 0, rollDy: 0, rollCd: 0, rollHit: [],
    level: 1, xp: 0, xpNext: xpNeed(1), molo: 3, guns: [], gi: 0, fireCd: 0, reload: 0, reloadMax: 1, batCd: 0, swing: 0, swingA: 0,
    target: null, retarget: 0, muzzle: 0, lowSaid: false, lv: {},
    st: { dmg: 1, rate: 1, reload: 1, mag: 1, pierce: 0, multi: 0, crit: 0.05, critMul: 1.8, speed: 1, armor: 0, regen: 0, bat: 1, batKb: 1, batR: 1, batSpd: 1, dodgeCd: 1, dodgeHit: 0, fire: 1, pick: 1, drop: 1, combo: 0, vamp: 0, desperate: 0, ammo: 1, pellets: 0, spread: 1, rifleRate: 1, rifleDmg: 1, pistolDmg: 1, pistolMag: 0 }
  };
}
function gunMag(p, id) { let m = Math.round(GUNS[id].mag * p.st.mag); if (id === 'pistol') m += p.st.pistolMag; return m; }
function resMax(p, id) { const d = GUNS[id]; return d.res === Infinity ? Infinity : Math.round(d.res * p.st.ammo); }
function giveGun(p, id, silent) {
  if (p.guns.some(g => g.id === id)) return;
  p.guns.push({ id, mag: gunMag(p, id), res: resMax(p, id) });
  p.gi = p.guns.length - 1; p.reload = 0; p.fireCd = 0.2;
  HUD.buildSlots();
  if (!silent) { banner('取得 ' + GUNS[id].name, id === 'shotgun' ? '近距離一槍清一片' : '連發火力，自動點射', 'gold'); Sound.play('reload'); }
}
function refillAmmo(p, frac) { for (const g of p.guns) { if (g.res === Infinity) continue; const mx = resMax(p, g.id); g.res = Math.min(mx, g.res + Math.round(mx * frac)); } }
function switchGun(i) {
  const p = G && G.p; if (!p || !p.guns[i] || i === p.gi) return;
  p.gi = i; p.reload = 0; p.fireCd = 0.15; Sound.play('click'); HUD.syncSlots(true);
}
function cycleGun() { const p = G && G.p; if (!p || p.guns.length < 2) return; switchGun((p.gi + 1) % p.guns.length); }

function hurtPlayer(dmg, sx, sy) {
  const p = G.p;
  if (G.state !== 'play' || p.roll > 0 || p.inv > 0 || G.won) return;
  dmg *= Math.max(0.3, 1 - p.st.armor);
  p.hp -= dmg; p.inv = 0.45; G.dmgTaken += dmg;
  const dx = p.x - sx, dy = p.y - sy, L = Math.hypot(dx, dy) || 1; p.x += dx / L * 4; p.y += dy / L * 4; collideCircle(G.map, p);
  G.shake = Math.max(G.shake, 3); HUD.hurt(); Sound.play('hurt');
  PZ.fx.hurt(Math.min(0.6, dmg / 18), { sound: false, freeze: 0, vignette: false }); PZ.cam.kick(Math.atan2(dy, dx), VC.sc); // 引擎：震動、色差、被撞一下、手機震動（紅邊用遊戲原本的 #fxHurt，不再疊一層）
  for (let i = 0; i < 5; i++) addPart('blood', p.x, p.y - 8, { vx: rand(-40, 40), vy: rand(-30, 30), vz: rand(30, 80) });
  if (p.hp <= 0) { p.hp = 0; playerDie(); }
  else if (p.hp < p.mhp * 0.3 && !p.lowSaid) { p.lowSaid = true; say('葳', G.lowLine || '還不能倒……'); }
}
function healPlayer(v) { const p = G.p; const b = p.hp; p.hp = Math.min(p.mhp, p.hp + v); if (p.hp > p.mhp * 0.45) p.lowSaid = false; if (p.hp - b >= 1) addPop(p.x, p.y - 22, '+' + Math.round(p.hp - b), 'heal'); }

function findTarget() {
  const p = G.p, gs = p.guns[p.gi]; if (!gs) return null;
  const range = GUNS[gs.id].range, r2 = range * range, m = G.map;
  let best = null, bd = Infinity;
  for (const z of G.zs) {
    if (z.dead || z.air) continue;
    const dd = d2(z.x, z.y, p.x, p.y);
    if (dd > r2 || dd >= bd) continue;
    if (losClear(m, p.x, p.y - 6, z.x, z.y - z.hh)) { bd = dd; best = z; }
  }
  const b = G.boss;
  if (b && !b.dead && !b.air && best !== b) { const dd = d2(b.x, b.y, p.x, p.y); if (dd < r2 && (!best || bd > 55 * 55) && losClear(m, p.x, p.y - 6, b.x, b.y - b.hh)) best = b; }
  return best;
}
function updatePlayer(dt) {
  const p = G.p, m = G.map;
  p.inv -= dt; p.rollCd -= dt; p.batCd -= dt; p.swing -= dt; p.muzzle -= dt;
  if (p.st.regen > 0 && p.hp < p.mhp) p.hp = Math.min(p.mhp, p.hp + p.st.regen * dt);
  const desp = p.st.desperate && p.hp < p.mhp * 0.35;
  const v = Input.vec(), ix = v[0], iy = v[1];
  p.moving = !!(ix || iy);
  if (p.roll > 0) {
    p.roll -= dt; p.x += p.rollDx * 205 * dt; p.y += p.rollDy * 205 * dt;
    if (p.st.dodgeHit) {
      Grid.query(p.x, p.y, 16, Q3);
      for (const z of Q3) { if (z.dead || p.rollHit.includes(z.id)) continue; if (d2(z.x, z.y, p.x, p.y) < (z.r + p.r + 3) ** 2) { p.rollHit.push(z.id); hitZombie(z, 16 * p.st.dodgeHit, { src: 'bat', kx: p.rollDx * 170, ky: p.rollDy * 170 }); } }
    }
    if (Math.random() < 0.5) addPart('dust', p.x, p.y, { vx: rand(-15, 15), vy: rand(-10, 5), vz: 0 });
  } else {
    const sp = 62 * p.st.speed * (desp ? 1.15 : 1);
    p.x += ix * sp * dt; p.y += iy * sp * dt;
  }
  collideCircle(m, p);
  if (p.moving) p.an += dt * 8;
  p.retarget -= dt;
  if (p.retarget <= 0) { p.retarget = 0.1; p.target = findTarget(); }
  const tg = p.target && !p.target.dead ? p.target : null;
  if (tg) { const a = Math.atan2((tg.y - tg.hh) - (p.y - 7), tg.x - p.x); p.aim = a; p.face = Math.cos(a) >= 0 ? 1 : -1; }
  else if (p.moving) { p.aim = Math.atan2(iy, ix); if (ix > 0.15) p.face = 1; else if (ix < -0.15) p.face = -1; }
  updateGun(p, dt, tg);
  updateBat(p);
}
function startReload(p, gs) { p.reload = p.reloadMax = GUNS[gs.id].reload / p.st.reload; Sound.play('reload'); }
function updateGun(p, dt, tg) {
  const gs = p.guns[p.gi]; if (!gs) return;
  const d = GUNS[gs.id], magMax = gunMag(p, gs.id);
  if (p.reload > 0) {
    p.reload -= dt;
    if (p.reload <= 0) { p.reload = 0; const need = magMax - gs.mag, take = gs.res === Infinity ? need : Math.min(need, gs.res); gs.mag += take; if (gs.res !== Infinity) gs.res -= take; }
    return;
  }
  if (gs.mag <= 0) {
    if (gs.res > 0) startReload(p, gs);
    else { const i = p.guns.findIndex(g => g.mag > 0 || g.res > 0); if (i >= 0) switchGun(i); }
    return;
  }
  p.fireCd -= dt;
  if (!tg) { if (gs.mag < magMax * 0.4 && gs.res > 0 && p.fireCd < -0.8) startReload(p, gs); return; }
  if (p.fireCd > 0) return;
  let rate = d.rate * p.st.rate; if (gs.id === 'rifle') rate *= p.st.rifleRate; if (p.st.desperate && p.hp < p.mhp * 0.35) rate *= 1.35;
  p.fireCd = 1 / rate; gs.mag--;
  let dmg = d.dmg * p.st.dmg; if (gs.id === 'pistol') dmg *= p.st.pistolDmg; if (gs.id === 'rifle') dmg *= p.st.rifleDmg;
  const pellets = d.pellets + (gs.id === 'shotgun' ? p.st.pellets : 0), spread = d.spread * (gs.id === 'shotgun' ? Math.max(0.4, p.st.spread) : 1);
  const mx = p.x + Math.cos(p.aim) * 9, my = p.y - 7 + Math.sin(p.aim) * 9, shots = 1 + p.st.multi;
  for (let s = 0; s < shots; s++) {
    const off = (s - (shots - 1) / 2) * 0.1;
    for (let k = 0; k < pellets; k++) {
      const a = p.aim + off + (pellets > 1 ? (k / (pellets - 1) - 0.5) * spread * 2 + rand(-0.04, 0.04) : rand(-spread, spread));
      const sp = d.speed * rand(0.92, 1.05);
      G.bullets.push({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, spd: sp, dmg, pierce: p.st.pierce, range: d.range * 1.15, dist: 0, hit: [], kb: d.kb, col: d.col });
    }
  }
  p.muzzle = 0.05;
  if (gs.id === 'shotgun') PZ.cam.kick(p.aim + Math.PI, 1.2 * VC.sc); // 霰彈槍後座力（自動連射的手槍、步槍不頓，免得畫面一直抖）
  G.dl.push({ x: mx, y: my, r: 48, i: 0.85, life: 0.06, max: 0.06, col: '#ffcf6a' });
  Sound.play(d.snd);
  addPart('casing', p.x, p.y - 7, { vx: -p.face * rand(20, 45), vy: rand(-12, 6), vz: rand(50, 90) });
  if (gs.id === 'shotgun') shake(1.6);
}
function updateBat(p) {
  if (p.batCd > 0 || p.roll > 0) return;
  const reach = 19 * p.st.batR;
  Grid.query(p.x, p.y, reach + 16, Q2);
  let tg = null, bd = Infinity;
  for (const z of Q2) { if (z.dead || z.air) continue; const dd = Math.hypot(z.x - p.x, z.y - p.y) - z.r; if (dd < reach && dd < bd) { bd = dd; tg = z; } }
  if (!tg) return;
  const a = Math.atan2(tg.y - p.y, tg.x - p.x);
  p.batCd = 0.62 / p.st.batSpd; p.swing = 0.16; p.swingA = a;
  Sound.play('swing');
  let any = false;
  for (const z of Q2) {
    if (z.dead || z.air) continue;
    const dx = z.x - p.x, dy = z.y - p.y, dd = Math.hypot(dx, dy);
    if (dd - z.r > reach) continue;
    if (dd > 8 && Math.abs(angDiff(a, Math.atan2(dy, dx))) > 1.15) continue;
    const crit = Math.random() < p.st.crit;
    hitZombie(z, 20 * p.st.bat * (crit ? p.st.critMul : 1), { src: 'bat', crit, kx: dx / (dd || 1) * 135 * p.st.batKb, ky: dy / (dd || 1) * 135 * p.st.batKb });
    any = true;
  }
  if (any) { Sound.play('bat'); G.hitStop = Math.max(G.hitStop, 0.02); PZ.cam.kick(a, 0.9 * VC.sc); PZ.haptic.tap('light'); PZ.input.rumble(0.45, 0.3, 80); }
}
function doDodge() {
  if (!G || G.state !== 'play') return; const p = G.p;
  if (p.roll > 0 || p.rollCd > 0) return;
  let v = Input.vec(), ix = v[0], iy = v[1];
  if (!ix && !iy) { ix = Math.cos(p.aim); iy = Math.sin(p.aim); }
  const L = Math.hypot(ix, iy) || 1;
  p.rollDx = ix / L; p.rollDy = iy / L; p.roll = 0.28; p.rollCd = 2.2 * Math.max(0.35, p.st.dodgeCd); p.rollHit = [];
  p.inv = Math.max(p.inv, 0.3); if (Math.abs(p.rollDx) > 0.2) p.face = p.rollDx > 0 ? 1 : -1;
  Sound.play('dodge');
  for (let i = 0; i < 6; i++) addPart('dust', p.x, p.y, { vx: rand(-30, 30), vy: rand(-20, 10), vz: 0 });
}
function throwMolotov() {
  if (!G || G.state !== 'play') return; const p = G.p;
  if (p.molo <= 0) { Sound.play('click'); return; }
  p.molo--;
  let tx, ty, best = null, bd = 140 * 140;
  for (const z of G.zs) { if (z.dead) continue; const dd = d2(z.x, z.y, p.x, p.y); if (dd < bd) { bd = dd; best = z; } }
  if (best) { tx = best.x; ty = best.y; } else { tx = p.x + Math.cos(p.aim) * 80; ty = p.y + Math.sin(p.aim) * 80; }
  G.eproj.push({ k: 'molo', sx: p.x, sy: p.y - 8, x: p.x, y: p.y - 8, tx, ty, t: 0, dur: 0.45, h: 34 });
  Sound.play('swing');
}

/* ---------- 屍體 ---------- */
function makeZombie(type, x, y, o) {
  o = o || {};
  const d = ZT[type], g = G;
  const skin = o.skin || d.pal || pick(g.skins);
  const hpm = g.hpMul * (o.hpMul || 1);
  return {
    t: type, x, y, r: d.r, hp: d.hp * hpm, mhp: d.hp * hpm, spd: rand(d.spd[0], d.spd[1]) * (o.spdMul || 1) * g.spdMul, dmg: d.dmg * g.dmgMul, xp: d.xp, mass: d.mass, hh: d.hh,
    spr: charSprite(d.tpl, [skin]), face: 1, an: rand(2), hf: 0, kx: 0, ky: 0, acd: rand(0.3, 0.6), nx: 0, ny: 0, navT: 0, burn: 0, bt: 0, spitT: rand(1, 2.5),
    tgt: o.tgt || 'p', boss: false, dead: false, id: ++g.zid, shield: type === 'riot', boom: type === 'bloater', spit: type === 'spitter', elite: type === 'brute' || type === 'riot', air: false
  };
}
function spawnPos(forceRing) {
  const m = G.map, p = G.p;
  const ring = forceRing || !m.spawns.length || Math.random() < m.spawnRing;
  if (!ring) {
    const cand = m.spawns.filter(s => { const dd = d2(s.x * T, s.y * T, p.x, p.y); return dd > 100 * 100 && dd < 470 * 470; });
    const list = cand.length ? cand : m.spawns;
    for (let k = 0; k < 6; k++) { const s = pick(list); const x = s.x * T + rand(-6, 6), y = s.y * T + rand(-6, 6); if (!isSolid(m, (x / T) | 0, (y / T) | 0)) return [x, y]; }
  }
  const R0 = Math.hypot(VC.w, VC.h) / 2 + 12;
  for (let k = 0; k < 18; k++) {
    const a = rand(TAU), r = R0 + rand(0, 60), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r, tx = (x / T) | 0, ty = (y / T) | 0;
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h || isSolid(m, tx, ty) || m.dist[ty * m.w + tx] >= 32767) continue;
    return [x, y];
  }
  if (m.spawns.length) { const s = pick(m.spawns); return [s.x * T, s.y * T]; }
  return null;
}
function spawnZombie(type, o) {
  o = o || {};
  if (G.zs.length >= G.maxZ && !o.force) return null;
  const pos = o.pos || spawnPos(o.ring); if (!pos) return null;
  const z = makeZombie(type, pos[0], pos[1], o);
  if (!o.tgt && G.objPt && G.map.dist2 && Math.random() < (G.objBias || 0)) z.tgt = 'obj';
  G.zs.push(z); return z;
}
function spawnAround(x, y, type, o, n) {
  n = n || 1; const m = G.map;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 10; k++) { const a = rand(TAU), r = rand(14, 40), px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (!isSolid(m, (px / T) | 0, (py / T) | 0)) { spawnZombie(type, Object.assign({ pos: [px, py], force: true }, o || {})); break; } }
  }
}
function horde(n, mix, o) {
  o = o || {};
  banner(o.title || '屍潮', o.sub || '大量屍體正在逼近', 'red'); Sound.play('siren');
  const m = G.map;
  let base = null;
  if (m.spawns.length && !o.ring) { const cand = m.spawns.filter(s => d2(s.x * T, s.y * T, G.p.x, G.p.y) < 480 * 480); base = pick(cand.length ? cand : m.spawns); }
  for (let i = 0; i < n; i++) {
    G.pend.push({ t: i * 0.09 + rand(0, 0.2), type: wpick(mix), base, o: o.z || {} });
  }
}
function navDir(z, tx, ty, dist, D) {
  const m = G.map;
  if (dist < 36 || (dist < 120 && Math.random() < 0.4 && losClear(m, z.x, z.y, tx, ty))) { z.nx = (tx - z.x) / dist; z.ny = (ty - z.y) / dist; return; }
  const W = m.w, cx = (z.x / T) | 0, cy = (z.y / T) | 0;
  let best = (cx >= 0 && cy >= 0 && cx < W && cy < m.h) ? D[cy * W + cx] : 32767, bx = -1, by = -1;
  for (let k = 0; k < 8; k++) {
    const dx = DIRS8[k][0], dy = DIRS8[k][1], nx = cx + dx, ny = cy + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= m.h) continue;
    const v = D[ny * W + nx];
    if (v < best) { if (dx && dy && (isSolid(m, nx, cy) || isSolid(m, cx, ny))) continue; best = v; bx = nx; by = ny; }
  }
  if (bx < 0) { z.nx = (tx - z.x) / dist; z.ny = (ty - z.y) / dist; return; }
  const px = (bx + 0.5) * T + rand(-3, 3), py = (by + 0.5) * T + rand(-3, 3), ddx = px - z.x, ddy = py - z.y, L = Math.hypot(ddx, ddy) || 1;
  z.nx = ddx / L; z.ny = ddy / L;
}
function updateZombie(z, dt) {
  const p = G.p, m = G.map;
  if (z.hf > 0) z.hf -= dt;
  const f = Math.exp(-9 * dt); z.kx *= f; z.ky *= f;
  if (z.burn > 0) {
    z.burn -= dt; z.bt -= dt;
    if (z.bt <= 0) { z.bt = 0.33; hitZombie(z, 9 * 0.33 * p.st.fire, { src: 'fire', noKb: 1 }); if (Math.random() < 0.6) addPart('flame', z.x + rand(-3, 3), z.y - rand(3, 10)); }
    if (z.dead) return;
  }
  if (z.boss) { BOSS_AI[z.kind](z, dt); collideCircle(m, z); return; }
  let tx = p.x, ty = p.y, D = m.dist, objMode = false;
  if (z.tgt === 'obj' && G.objPt && m.dist2) { if (d2(z.x, z.y, p.x, p.y) > 55 * 55) { tx = G.objPt.x; ty = G.objPt.y; D = m.dist2; objMode = true; } }
  const dx = tx - z.x, dy = ty - z.y, dist = Math.hypot(dx, dy) || 1;
  z.navT -= dt;
  if (z.navT <= 0) { z.navT = 0.12 + Math.random() * 0.1; navDir(z, tx, ty, dist, D); }
  let spd = z.spd;
  if (z.spit && !objMode) {
    if (dist < 100 && dist > 30) { spd *= 0.15; z.spitT -= dt; if (z.spitT <= 0) { z.spitT = 2.7; if (losClear(m, z.x, z.y - 6, p.x, p.y - 6)) spitAcid(z.x, z.y - 8, p.x, p.y); } }
  }
  if (objMode) {
    if (dist < (G.objR || 26)) { spd = 0; z.acd -= dt; if (z.acd <= 0) { z.acd = 1.1; objHit(z); } }
  } else if (dist < z.r + p.r + 2.5) {
    spd *= 0.2; z.acd -= dt;
    if (z.acd <= 0) { z.acd = 1.0; if (z.boom) { detonate(z); return; } hurtPlayer(z.dmg, z.x, z.y); }
  } else if (z.acd < 0.3) z.acd = 0.3;
  if (z.boom && dist < z.r + p.r + 8 && !objMode) { detonate(z); return; }
  z.x += (z.nx * spd + z.kx) * dt; z.y += (z.ny * spd + z.ky) * dt;
  if (Math.abs(dx) > 2) z.face = dx > 0 ? 1 : -1;
  z.an += dt * (spd * 0.085 + 0.3);
  collideCircle(m, z);
  if (Math.random() < dt * 0.02) Sound.play('groan');
}
function detonate(z) { if (z.dead) return; z.hp = 0; killZombie(z, { src: 'self' }); }
function objHit(z) {
  if (G.objHitFn) G.objHitFn(z);
  addPart('spark', z.x + z.nx * 6, z.y - 6, { vx: rand(-40, 40), vy: rand(-40, 10), vz: 0 });
}
function separate() {
  const zs = G.zs, p = G.p;
  for (const z of zs) {
    if (z.dead || z.air) continue;
    Grid.query(z.x, z.y, z.r + 10, Q3);
    for (const o of Q3) {
      if (o.id <= z.id || o.dead || o.air) continue;
      const dx = o.x - z.x, dy = o.y - z.y, rr = z.r + o.r, dd = dx * dx + dy * dy;
      if (dd >= rr * rr || dd < 1e-6) continue;
      const d = Math.sqrt(dd), push = (rr - d) * 0.5, nx = dx / d, ny = dy / d;
      const wz = o.mass / (z.mass + o.mass), wo = 1 - wz;
      z.x -= nx * push * wz * 2; z.y -= ny * push * wz * 2; o.x += nx * push * wo * 2; o.y += ny * push * wo * 2;
    }
    const dx = z.x - p.x, dy = z.y - p.y, rr = z.r + p.r, dd = dx * dx + dy * dy;
    if (dd < rr * rr && dd > 1e-6 && p.roll <= 0) { const d = Math.sqrt(dd), push = rr - d; z.x += dx / d * push; z.y += dy / d * push; }
  }
}
function comboMul() { const p = G.p; return 1 + Math.min(0.4, Math.floor(G.combo / 10) * p.st.combo); }
function hitZombie(z, dmg, o) {
  if (z.dead) return;
  const p = G.p;
  if (o.src === 'gun' && z.shield && !(z.stun > 0)) {
    if ((z.face > 0 && o.dirx < 0) || (z.face < 0 && o.dirx > 0)) { dmg *= z.boss ? 0.1 : 0.2; o.blocked = 1; if (Math.random() < 0.5) { addPart('spark', z.x + z.face * 7, z.y - 9, { vx: z.face * rand(20, 60), vy: rand(-40, 20), vz: 0 }); Sound.play('clank'); } }
  }
  if (z.stun > 0) dmg *= 1.5;
  if (o.src === 'gun' || o.src === 'bat') dmg *= comboMul();
  if (z.boss && z.shielded) dmg *= 0.25;
  z.hp -= dmg; z.hf = 0.07;
  if (!o.noKb && !o.blocked) { const km = 1 / z.mass; z.kx += (o.kx || 0) * km; z.ky += (o.ky || 0) * km; }
  if (G.pops.length < 70 && PZ.settings.get('numbers') && (o.src !== 'fire' || Math.random() < 0.35)) addPop(z.x + rand(-3, 3), z.y - z.hh * 2 - 4, String(Math.max(1, Math.round(dmg))), o.crit ? 'crit' : o.blocked ? 'block' : 'n');
  if (!o.blocked && o.src !== 'fire') {
    const n = o.src === 'bat' ? 5 : 2, kl = Math.hypot(o.kx || 0, o.ky || 0) || 1;
    for (let i = 0; i < n; i++) addPart('blood', z.x, z.y - z.hh, { vx: (o.kx || 0) / kl * rand(20, 70) + rand(-20, 20), vy: (o.ky || 0) / kl * rand(20, 70) + rand(-20, 20), vz: rand(20, 70) });
  }
  if (o.src === 'gun' || o.src === 'bat') Sound.play('hit');
  if (o.crit) PZ.fx.chroma(0.005, 0.14);
  if (z.hp <= 0) killZombie(z, o);
}
function killZombie(z, o) {
  if (z.dead) return;
  z.dead = true;
  const p = G.p;
  G.kills++; G.runKills++;
  G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = 3.2;
  if (G.combo > G.maxCombo) G.maxCombo = G.combo;
  comboMilestone(G.combo);
  if (o.src === 'bat') G.batKills++;
  if (o.src === 'fire') G.fireKills++;
  gainXP(z.xp);
  if (p.st.vamp && Math.random() < p.st.vamp) healPlayer(3);
  if (!z.boss) { const pr = (z.elite ? 0.5 : 0.022) * p.st.drop; if (Math.random() < pr) dropRandom(z.x, z.y); }
  const nb = z.boss ? 50 : 12;
  for (let i = 0; i < nb; i++) addPart('blood', z.x, z.y - z.hh, { vx: rand(-80, 80), vy: rand(-60, 60), vz: rand(30, 120) });
  for (let i = 0; i < (z.boss ? 14 : 3); i++) addPart('gib', z.x, z.y - z.hh, { vx: rand(-70, 70), vy: rand(-50, 50), vz: rand(40, 110) });
  const d = G.map.dx, img = z.face > 0 ? z.spr.corpse : z.spr.corpseF;
  d.globalAlpha = 0.9; d.drawImage(img, Math.round(z.x - img.width / 2), Math.round(z.y - img.height / 2 - 2)); d.globalAlpha = 1;
  for (let i = 0; i < (z.boss ? 60 : 14); i++) R(d, pick(BLOODC), (z.x + rand(-9, 9) * (z.boss ? 2 : 1)) | 0, (z.y + rand(-5, 5) * (z.boss ? 2 : 1)) | 0, randi(1, 3), randi(1, 2));
  Sound.play('splat');
  if (z.boom) G.booms.push({ x: z.x, y: z.y - 4, t: 0.05, r: 36, dz: 70, dp: 22, src: 'boom' });
  if (z.boss) onBossDead(z);
  if (G.onKill) G.onKill(z, o);
}
function dropRandom(x, y) {
  const p = G.p, hasAmmoGun = p.guns.some(g => g.res !== Infinity);
  const r = Math.random();
  let k = r < 0.42 ? (hasAmmoGun ? 'ammo' : 'med') : r < 0.78 ? 'med' : 'molo';
  if (k === 'med' && p.hp > p.mhp * 0.9 && hasAmmoGun) k = 'ammo';
  addPickup(x, y, k);
}
function addPickup(x, y, k, o) { const q = Object.assign({ x, y, k, t: 0, img: iconCanvas(PICK_ICON[k] || 'box') }, o || {}); G.pickups.push(q); return q; }
const PICK_ICON = { ammo: 'ammo', med: 'med', molo: 'molotov', shotgun: 'shotgun', rifle: 'rifle', fuse: 'fuse', bowl: 'bowl' };

/* ---------- 經驗、連殺 ---------- */
function gainXP(v) {
  const p = G.p; p.xp += v;
  while (p.xp >= p.xpNext) { p.xp -= p.xpNext; p.level++; p.xpNext = xpNeed(p.level); G.pendingLv++; G.lvDelay = 0.2; }
}
const COMBO_MS = [[10, '熱身完畢'], [25, '殺紅眼'], [50, '屍山血海'], [100, '人間兵器'], [200, '陸戰隊不死'], [300, '一個都別想走'], [500, '外送之神']];
function comboMilestone(c) {
  for (const [n, name] of COMBO_MS) if (c === n) {
    banner(n + ' 連殺', name, n >= 100 ? 'gold' : 'amber'); Sound.play('combo');
    if (G.onCombo) G.onCombo(n);
  }
}

/* ---------- 投射物、區域、爆炸 ---------- */
function spitAcid(x, y, tx, ty) {
  const a = Math.atan2(ty - y, tx - x), sp = 110;
  G.eproj.push({ k: 'acid', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: Math.min(1.4, Math.hypot(tx - x, ty - y) / sp + 0.1), dmg: 6 * G.dmgMul });
}
function addZone(k, x, y, r, life, dps) { G.zones.push({ k, x, y, r, life, max: life, dps, tick: 0 }); }
function explodeAt(x, y, r, dz, dp, src) {
  Grid.query(x, y, r + 14, Q4);
  for (const z of Q4) {
    if (z.dead) continue; const dd = Math.hypot(z.x - x, z.y - y);
    if (dd < r + z.r) { const f = 1 - dd / (r + z.r) * 0.5; hitZombie(z, dz * f, { src: src || 'boom', kx: (z.x - x) / (dd || 1) * 170, ky: (z.y - y) / (dd || 1) * 170 }); }
  }
  for (const h of G.hazards) if (!h.dead && h.fuse < 0 && d2(h.x, h.y, x, y) < (r + 6) ** 2) h.fuse = 0.18;
  const p = G.p, dpl = Math.hypot(p.x - x, p.y - y);
  if (dp > 0 && dpl < r + p.r) hurtPlayer(dp * (1 - dpl / (r + p.r) * 0.4), x, y);
  shake(Math.min(9, r / 5)); Sound.play('boom');
  PZ.fx.shockwave(x, y, { radius: r * 3.4, strength: 0.026, thick: 20 }); PZ.fx.flash('#ffd9a0', 0.12, 0.08); PZ.fx.chroma(0.006, 0.2); PZ.haptic.tap('heavy'); PZ.input.rumble(0.9, 0.7, 200);
  G.dl.push({ x, y, r: r * 3, i: 1, life: 0.35, max: 0.35, col: '#ffb45a' });
  for (let i = 0; i < 18; i++) addPart('flame', x + rand(-r / 2, r / 2), y + rand(-r / 3, r / 3), { vx: rand(-60, 60), vy: rand(-60, 20) });
  for (let i = 0; i < 12; i++) addPart('smoke', x + rand(-r / 2, r / 2), y + rand(-r / 3, r / 3));
  for (let i = 0; i < 10; i++) addPart('debris', x, y, { vx: rand(-110, 110), vy: rand(-80, 80), vz: rand(60, 140) });
  const d = G.map.dx; d.fillStyle = 'rgba(12,10,10,0.35)'; for (let j = -r * 0.6; j <= r * 0.6; j++) { const hw = r * 0.9 * Math.sqrt(Math.max(0, 1 - (j * j) / (r * r * 0.36))); d.fillRect((x - hw) | 0, (y + j * 0.6) | 0, (hw * 2) | 0, 1); }
}
function shockwave(x, y, r, dp, dz) {
  const p = G.p;
  if (Math.hypot(p.x - x, p.y - y) < r + p.r) hurtPlayer(dp, x, y);
  Grid.query(x, y, r + 10, Q4);
  for (const z of Q4) { if (z.dead || z.boss) continue; const dd = Math.hypot(z.x - x, z.y - y); if (dd < r + z.r) hitZombie(z, dz || 40, { src: 'boss', kx: (z.x - x) / (dd || 1) * 200, ky: (z.y - y) / (dd || 1) * 200 }); }
  shake(7); Sound.play('boom');
  PZ.fx.shockwave(x, y, { radius: r * 2.6, strength: 0.034, thick: 24 }); PZ.haptic.tap('heavy'); PZ.input.rumble(1, 0.8, 240);
  G.parts.length < 700 && G.parts.push({ k: 'ring', x, y, z: 0, vx: 0, vy: 0, vz: 0, life: 0.3, max: 0.3, r });
  for (let i = 0; i < 14; i++) addPart('dust', x + rand(-r, r) * 0.7, y + rand(-r, r) * 0.4, { vx: rand(-60, 60), vy: rand(-30, 30) });
}
function tele(k, x, y, a, r, w, dur) { G.teles.push({ k, x, y, a, r, w, t: 0, dur }); }

/* ---------- Boss ---------- */
function makeBoss(kind, x, y, hpMul) {
  const d = BOSSDEF[kind];
  const z = makeZombie('walker', x, y, { skin: 'z_office' });
  Object.assign(z, { t: 'boss', kind, boss: true, elite: true, r: d.r, hp: d.hp * (hpMul || 1), mhp: d.hp * (hpMul || 1), spd: d.spd, dmg: d.dmg, xp: 150, mass: 14, hh: d.hh, spr: charSprite(d.tpl, [d.pal]), st: 'walk', stT: 0, cd: { a: 2.5, b: 4, c: 6, d: 8 }, stun: 0, shield: kind === 'riotboss', name: d.name, phase: 1, acd: 0.6 });
  return z;
}
function bossEnter(kind, x, y, hpMul) {
  PZ.fx.vignette('#3a0006', 0.5, 1.4); PZ.input.rumble(0.8, 0.6, 400);
  const z = makeBoss(kind, x, y, hpMul); G.zs.push(z); G.boss = z; G.bossDead = false;
  G.slow = 0.35; shake(8); Sound.play('boss');
  banner('BOSS｜' + z.name, BOSSDEF[kind].sub, 'boss');
  HUD.bossShow(z.name);
  return z;
}
function onBossDead(z) {
  PZ.fx.flash('#ffffff', 0.35, 0.2); PZ.fx.shockwave(z.x, z.y, { radius: 520, strength: 0.05, thick: 40 }); PZ.haptic.tap('success');
  G.boss = null; G.bossDead = true; G.bossKills = (G.bossKills || 0) + 1;
  G.slow = 0.25; shake(12); HUD.bossHide();
  banner('擊倒 ' + z.name, '', 'gold');
  addPickup(z.x - 10, z.y, 'med'); addPickup(z.x + 10, z.y, G.p.guns.some(g => g.res !== Infinity) ? 'ammo' : 'molo');
  if (G.onBoss) G.onBoss(z);
}
function bossStep(z, tx, ty, spd, dt) {
  const dx = tx - z.x, dy = ty - z.y, L = Math.hypot(dx, dy) || 1;
  z.navT -= dt; if (z.navT <= 0) { z.navT = 0.15; navDir(z, tx, ty, L, G.map.dist); }
  z.x += (z.nx * spd + z.kx) * dt; z.y += (z.ny * spd + z.ky) * dt;
  if (Math.abs(dx) > 3) z.face = dx > 0 ? 1 : -1;
  z.an += dt * spd * 0.07;
}
function bossTouch(z, dt) {
  const p = G.p;
  if (Math.hypot(p.x - z.x, p.y - z.y) < z.r + p.r + 3) { z.acd -= dt; if (z.acd <= 0) { z.acd = 0.9; hurtPlayer(z.dmg, z.x, z.y); } }
}
function bossTimers(z, dt) { const f = Math.exp(-8 * dt); z.kx *= f; z.ky *= f; z.stT -= dt; for (const k in z.cd) z.cd[k] -= dt; if (z.hf > 0) z.hf -= dt; }
function chargeMove(z, dt, sp) {
  const p = G.p, ox = z.x, oy = z.y;
  z.x += Math.cos(z.ca) * sp * dt; z.y += Math.sin(z.ca) * sp * dt; z.an += dt * 12;
  if (Math.random() < 0.7) addPart('dust', z.x, z.y, { vx: rand(-20, 20), vy: rand(-20, 20) });
  if (!z.hitP && Math.hypot(p.x - z.x, p.y - z.y) < z.r + p.r + 4) { z.hitP = true; hurtPlayer(z.dmg * 1.8, z.x, z.y); }
  Grid.query(z.x, z.y, z.r + 12, Q4);
  for (const o of Q4) { if (o === z || o.dead) continue; if (d2(o.x, o.y, z.x, z.y) < (z.r + o.r + 2) ** 2) hitZombie(o, 60, { src: 'boss', kx: Math.cos(z.ca) * 220, ky: Math.sin(z.ca) * 220 }); }
  const hit = collideCircle(G.map, z);
  const moved = Math.hypot(z.x - ox, z.y - oy);
  return hit && moved < sp * dt * 0.6;
}
const BOSS_AI = {
  riotboss(z, dt) {
    const p = G.p; bossTimers(z, dt);
    const dist = Math.hypot(p.x - z.x, p.y - z.y);
    if (z.phase === 1 && z.hp < z.mhp * 0.5) { z.phase = 2; say('坤', '牠在叫人！後面還有！'); for (let i = 0; i < 6; i++) spawnAround(z.x, z.y, 'walker', { skin: 'z_police' }); }
    if (z.st === 'walk') {
      bossStep(z, p.x, p.y, z.spd, dt); bossTouch(z, dt);
      if (z.cd.a <= 0 && dist < 240 && dist > 36) { z.st = 'aim'; z.stT = 0.85; z.ca = Math.atan2(p.y - z.y, p.x - z.x); z.face = Math.cos(z.ca) >= 0 ? 1 : -1; tele('line', z.x, z.y - 4, z.ca, 280, 16, 0.85); Sound.play('groan'); }
    } else if (z.st === 'aim') { z.face = Math.cos(z.ca) >= 0 ? 1 : -1; if (z.stT <= 0) { z.st = 'charge'; z.stT = 1.35; z.hitP = false; } }
    else if (z.st === 'charge') {
      if (chargeMove(z, dt, 195)) { z.st = 'stun'; z.stT = 2.6; z.stun = 2.6; shake(9); Sound.play('boom'); Sound.play('stun'); addPop(z.x, z.y - 36, '!', 'crit'); z.cd.a = 5; say('葳', '……撞暈了。打牠！'); }
      else if (z.stT <= 0) { z.st = 'walk'; z.cd.a = 4; }
    } else if (z.st === 'stun') { z.stun = z.stT; if (z.stT <= 0) { z.st = 'walk'; z.stun = 0; } }
  },
  abiao(z, dt) {
    const p = G.p; bossTimers(z, dt);
    const dist = Math.hypot(p.x - z.x, p.y - z.y);
    if (z.phase === 1 && z.hp < z.mhp * 0.5) { z.phase = 2; z.spd *= 1.3; say('豹', '阿彪！給我起來！'); for (let i = 0; i < 8; i++) spawnZombie('runner', { force: true }); }
    const cm = z.phase === 2 ? 0.72 : 1;
    switch (z.st) {
      case 'walk':
        bossStep(z, p.x, p.y, z.spd, dt); bossTouch(z, dt);
        if (dist < 50 && z.cd.a <= 0) { z.st = 'slamT'; z.stT = 0.7; tele('circle', z.x, z.y, 0, 46, 0, 0.7); }
        else if (z.cd.b <= 0 && dist < 150) { z.st = 'spinT'; z.stT = 0.65; tele('ring', z.x, z.y, 0, 62, 0, 0.65); }
        else if (z.cd.c <= 0 && dist > 90 && dist < 250) { z.st = 'aim'; z.stT = 0.7; z.ca = Math.atan2(p.y - z.y, p.x - z.x); tele('line', z.x, z.y - 4, z.ca, 260, 18, 0.7); }
        break;
      case 'slamT': if (z.stT <= 0) { shockwave(z.x, z.y, 46, 28); z.st = 'rec'; z.stT = 0.5; z.cd.a = 2.2 * cm; } break;
      case 'spinT': if (z.stT <= 0) { z.st = 'spin'; z.stT = 2.3; z.tick = 0; } break;
      case 'spin':
        bossStep(z, p.x, p.y, 17, dt); z.spinA = (z.spinA || 0) + dt * 11; z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 0.33; const d = Math.hypot(p.x - z.x, p.y - z.y); if (d < 64 && d > 9) hurtPlayer(11, z.x, z.y);
          Grid.query(z.x, z.y, 66, Q4); for (const o of Q4) { if (o === z || o.dead) continue; const dd = Math.hypot(o.x - z.x, o.y - z.y); if (dd < 64) hitZombie(o, 35, { src: 'boss', kx: (o.x - z.x) / (dd || 1) * 200, ky: (o.y - z.y) / (dd || 1) * 200 }); }
          Sound.play('swing');
        }
        if (z.stT <= 0) { z.st = 'walk'; z.cd.b = 8 * cm; }
        break;
      case 'aim': if (z.stT <= 0) { z.st = 'charge'; z.stT = 1.0; z.hitP = false; } break;
      case 'charge': if (chargeMove(z, dt, 215) || z.stT <= 0) { if (z.stT > 0) { shake(7); Sound.play('boom'); } z.st = 'rec'; z.stT = 0.7; z.cd.c = 6 * cm; } break;
      case 'rec': if (z.stT <= 0) z.st = 'walk'; break;
    }
  },
  bed7(z, dt) {
    const p = G.p; bossTimers(z, dt);
    const dist = Math.hypot(p.x - z.x, p.y - z.y);
    if ((z.phase === 1 && z.hp < z.mhp * 0.66) || (z.phase === 2 && z.hp < z.mhp * 0.33)) { z.phase++; shake(6); Sound.play('groan'); banner('七床在尖叫', '病房裡的人都起來了', 'red'); for (let i = 0; i < 8; i++) spawnAround(z.x, z.y, 'walker', { skin: 'z_patient' }); }
    switch (z.st) {
      case 'walk':
        bossStep(z, p.x, p.y, z.spd, dt); bossTouch(z, dt);
        if (z.cd.a <= 0 && dist < 150) { z.st = 'vomT'; z.stT = 0.6; z.ca = Math.atan2(p.y - z.y, p.x - z.x); tele('cone', z.x, z.y - 8, z.ca, 130, 0.5, 0.6); Sound.play('groan'); }
        else if (z.cd.b <= 0 && dist < 230 && dist > 40) { z.st = 'leapT'; z.stT = 0.95; z.lx0 = z.x; z.ly0 = z.y; z.lx1 = p.x; z.ly1 = p.y; tele('circle', p.x, p.y, 0, 32, 0, 0.95); z.air = true; }
        break;
      case 'vomT':
        if (z.stT <= 0) { for (let i = 0; i < 9; i++) { const a = z.ca + (i / 8 - 0.5) * 0.9, sp = rand(100, 135); G.eproj.push({ k: 'acid', x: z.x + Math.cos(a) * 8, y: z.y - 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.8, 1.1), dmg: 9 }); } z.st = 'rec'; z.stT = 0.4; z.cd.a = 4.4; }
        break;
      case 'leapT': {
        const k = 1 - Math.max(0, z.stT) / 0.95; z.x = lerp(z.lx0, z.lx1, k); z.y = lerp(z.ly0, z.ly1, k); z.jz = Math.sin(k * Math.PI) * 50;
        if (z.stT <= 0) { z.air = false; z.jz = 0; collideCircle(G.map, z); shockwave(z.x, z.y, 34, 30); z.st = 'rec'; z.stT = 0.7; z.cd.b = 7; }
        break;
      }
      case 'rec': if (z.stT <= 0) z.st = 'walk'; break;
    }
  },
  giant(z, dt) {
    const p = G.p; bossTimers(z, dt);
    const dist = Math.hypot(p.x - z.x, p.y - z.y);
    if (z.phase === 1 && z.hp < z.mhp * 0.5) { z.phase = 2; z.spd *= 1.2; say('晴', '哥，牠在拆車！'); }
    switch (z.st) {
      case 'walk':
        bossStep(z, p.x, p.y, z.spd, dt); bossTouch(z, dt);
        if (dist < 46 && z.cd.b <= 0) { z.st = 'stompT'; z.stT = 0.6; tele('circle', z.x, z.y, 0, 42, 0, 0.6); }
        else if (z.cd.a <= 0 && dist < 280) {
          z.st = 'throwT'; z.stT = 0.35;
          const n = z.phase === 2 ? 2 : 1;
          for (let i = 0; i < n; i++) {
            const lead = p.moving ? 22 : 0, a = rand(TAU);
            const tx = p.x + Math.cos(p.aim) * lead * (i ? -1 : 1) + (i ? Math.cos(a) * 30 : 0), ty = p.y + Math.sin(p.aim) * lead + (i ? Math.sin(a) * 30 : 0);
            tele('circle', tx, ty, 0, 28, 0, 1.15);
            G.eproj.push({ k: 'car', sx: z.x, sy: z.y - 20, x: z.x, y: z.y - 20, tx, ty, t: 0, dur: 1.15, h: 70, img: PROP.car(pick(['#c8322b', '#2e6db5', '#e8e3d8', '#8a8f96']), true) });
          }
          z.cd.a = z.phase === 2 ? 2.4 : 3.2;
        }
        break;
      case 'stompT': if (z.stT <= 0) { shockwave(z.x, z.y, 42, 26); z.st = 'rec'; z.stT = 0.5; z.cd.b = 2.4; } break;
      case 'throwT': if (z.stT <= 0) z.st = 'walk'; break;
      case 'rec': if (z.stT <= 0) z.st = 'walk'; break;
    }
  },
  captain(z, dt) {
    const p = G.p; bossTimers(z, dt);
    const dist = Math.hypot(p.x - z.x, p.y - z.y);
    if (z.phase === 1 && z.hp < z.mhp * 0.5) { z.phase = 2; z.spd *= 1.25; banner('船長暴怒', '錨鍊甩得更快了', 'red'); }
    const cm = z.phase === 2 ? 0.78 : 1;
    if (z.cd.c <= 0) { z.cd.c = 12 * cm; const h = G.map.hatch; for (let i = 0; i < 5; i++) spawnZombie('walker', { pos: [h.x * T + rand(-10, 10), h.y * T + rand(0, 8)], skin: 'z_sailor', force: true }); }
    if (z.phase === 2 && z.cd.d <= 0) { z.cd.d = 4.5; for (let i = 0; i < 3; i++) { const a = rand(TAU), r = rand(10, 60); tele('circle', p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 0, 16, 0, 0.8); G.later.push({ t: 0.8, fn: ((x, y) => () => addZone('acid', x, y, 16, 4, 10))(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r) }); } }
    switch (z.st) {
      case 'walk':
        bossStep(z, p.x, p.y, z.spd, dt); bossTouch(z, dt);
        if (z.cd.a <= 0 && dist < 95) { z.st = 'sweepT'; z.stT = 0.75; z.ca = Math.atan2(p.y - z.y, p.x - z.x); tele('arc', z.x, z.y - 6, z.ca, 86, 1.6, 0.75); }
        else if (z.cd.b <= 0 && dist > 70 && dist < 260) { z.st = 'anchorT'; z.stT = 0.6; z.ca = Math.atan2(p.y - z.y, p.x - z.x); tele('line', z.x, z.y - 8, z.ca, 250, 12, 0.6); }
        break;
      case 'sweepT':
        if (z.stT <= 0) {
          const d = Math.hypot(p.x - z.x, p.y - z.y), a = Math.atan2(p.y - z.y, p.x - z.x);
          if (d < 86 + p.r && Math.abs(angDiff(z.ca, a)) < 1.6) hurtPlayer(28, z.x, z.y);
          Grid.query(z.x, z.y, 90, Q4); for (const o of Q4) { if (o === z || o.dead) continue; const dd = Math.hypot(o.x - z.x, o.y - z.y); if (dd < 88 && Math.abs(angDiff(z.ca, Math.atan2(o.y - z.y, o.x - z.x))) < 1.6) hitZombie(o, 60, { src: 'boss', kx: (o.x - z.x) / (dd || 1) * 240, ky: (o.y - z.y) / (dd || 1) * 240 }); }
          shake(6); Sound.play('swing'); Sound.play('boom');
          G.parts.push({ k: 'sweep', x: z.x, y: z.y - 6, z: 0, vx: 0, vy: 0, vz: 0, life: 0.22, max: 0.22, r: 86, a: z.ca });
          z.st = 'rec'; z.stT = 0.55; z.cd.a = 4.4 * cm;
        }
        break;
      case 'anchorT':
        if (z.stT <= 0) { G.eproj.push({ k: 'anchor', ox: z, x: z.x, y: z.y - 8, a: z.ca, d: 0, out: true, hit1: false, hit2: false, sp: 320, max: 250 }); z.st = 'anchor'; z.stT = 2; z.cd.b = 6 * cm; Sound.play('swing'); }
        break;
      case 'anchor': if (z.stT <= 0 || !G.eproj.some(e => e.k === 'anchor')) z.st = 'walk'; break;
      case 'rec': if (z.stT <= 0) z.st = 'walk'; break;
    }
  }
};

/* ---------- 更新：子彈、投射物、區域、危險物、拾取 ---------- */
function updateBullets(dt) {
  const m = G.map, arr = G.bullets, p = G.p;
  for (let i = arr.length - 1; i >= 0; i--) {
    const b = arr[i]; let alive = true;
    const sx = b.vx * dt / 2, sy = b.vy * dt / 2, st = Math.hypot(sx, sy);
    for (let s = 0; s < 2 && alive; s++) {
      b.x += sx; b.y += sy; b.dist += st;
      if (isWall(m, (b.x / T) | 0, ((b.y + 6) / T) | 0)) { alive = false; addPart('spark', b.x - sx, b.y - sy, { vx: -sx * 3 + rand(-30, 30), vy: -sy * 3 + rand(-30, 30) }); break; }
      for (const h of G.hazards) if (!h.dead && d2(b.x, b.y, h.x, h.y - 6) < 64) { h.hp -= b.dmg; if (h.hp <= 0 && h.fuse < 0) h.fuse = 0.05; alive = false; addPart('spark', b.x, b.y); break; }
      if (!alive) break;
      Grid.query(b.x, b.y + 8, 18, Q1);
      for (let k = 0; k < Q1.length; k++) {
        const z = Q1[k];
        if (z.dead || z.air || b.hit.includes(z.id)) continue;
        const rr = z.r + 2.5, hy = z.y - z.hh;
        if (d2(b.x, b.y, z.x, hy) < rr * rr * 1.3) {
          b.hit.push(z.id);
          const crit = Math.random() < p.st.crit;
          hitZombie(z, b.dmg * (crit ? p.st.critMul : 1), { src: 'gun', crit, kx: b.vx / b.spd * b.kb, ky: b.vy / b.spd * b.kb, dirx: b.vx });
          if (b.pierce-- <= 0) { alive = false; break; }
        }
      }
    }
    if (b.dist > b.range) alive = false;
    if (!alive) { arr[i] = arr[arr.length - 1]; arr.pop(); }
  }
}
function updateEProj(dt) {
  const p = G.p, arr = G.eproj, m = G.map;
  for (let i = arr.length - 1; i >= 0; i--) {
    const e = arr[i]; let alive = true;
    if (e.k === 'acid') {
      e.x += e.vx * dt; e.y += e.vy * dt; e.life -= dt;
      if (Math.random() < 0.4) addPart('acid', e.x, e.y, { vx: rand(-10, 10), vy: rand(-10, 10), vz: 0 });
      if (d2(e.x, e.y, p.x, p.y - 6) < 64) { hurtPlayer(e.dmg, e.x, e.y); alive = false; addZone('acid', e.x, e.y + 6, 13, 3.5, 9); }
      else if (e.life <= 0 || isWall(m, (e.x / T) | 0, ((e.y + 6) / T) | 0)) { alive = false; addZone('acid', e.x, e.y + 6, 13, 3.5, 9); }
    } else if (e.k === 'molo' || e.k === 'car') {
      e.t += dt; const k = Math.min(1, e.t / e.dur);
      e.x = lerp(e.sx, e.tx, k); e.y = lerp(e.sy, e.ty, k); e.z = Math.sin(k * Math.PI) * e.h;
      if (e.k === 'molo' && Math.random() < 0.6) addPart('flame', e.x, e.y - e.z, { vx: rand(-10, 10), vy: rand(-10, 10) });
      if (k >= 1) {
        alive = false;
        if (e.k === 'molo') {
          addZone('fire', e.tx, e.ty, 30, 4.5, 26 * p.st.fire); Sound.play('molotov');
          G.dl.push({ x: e.tx, y: e.ty, r: 110, i: 0.9, life: 0.3, max: 0.3, col: '#ff8a3c' });
          for (let j = 0; j < 14; j++) addPart('flame', e.tx + rand(-20, 20), e.ty + rand(-12, 12), { vx: rand(-40, 40), vy: rand(-40, 10) });
          for (let j = 0; j < 6; j++) addPart('spark', e.tx, e.ty, { vx: rand(-90, 90), vy: rand(-90, 40) });
        } else {
          explodeAt(e.tx, e.ty, 28, 80, 34, 'boss');
          const d = G.map.dx; d.globalAlpha = 0.9; d.drawImage(tintC(e.img, '#1a1410', 0.55), Math.round(e.tx - e.img.width / 2), Math.round(e.ty - e.img.height / 2)); d.globalAlpha = 1;
          addZone('fire', e.tx, e.ty, 20, 3, 16);
        }
      }
    } else if (e.k === 'anchor') {
      const o = e.ox;
      if (o.dead) { alive = false; }
      else {
        e.d += (e.out ? 1 : -1) * e.sp * dt;
        if (e.out && e.d >= e.max) e.out = false;
        const hx = o.x + Math.cos(e.a) * e.d, hy = o.y - 8 + Math.sin(e.a) * e.d; e.x = hx; e.y = hy;
        if (isWall(m, (hx / T) | 0, ((hy + 8) / T) | 0) && e.out) { e.out = false; addPart('spark', hx, hy); Sound.play('clank'); }
        const hitNow = d2(hx, hy, p.x, p.y - 6) < 12 * 12;
        if (hitNow && ((e.out && !e.hit1) || (!e.out && !e.hit2))) { if (e.out) e.hit1 = true; else e.hit2 = true; hurtPlayer(22, hx, hy); }
        Grid.query(hx, hy + 8, 14, Q4); for (const z of Q4) { if (z === o || z.dead) continue; if (d2(z.x, z.y - z.hh, hx, hy) < 150) hitZombie(z, 40, { src: 'boss', kx: Math.cos(e.a) * 150, ky: Math.sin(e.a) * 150 }); }
        if (!e.out && e.d <= 0) alive = false;
      }
    }
    if (!alive) { arr[i] = arr[arr.length - 1]; arr.pop(); }
  }
}
function updateZones(dt) {
  const p = G.p, arr = G.zones;
  for (let i = arr.length - 1; i >= 0; i--) {
    const z = arr[i]; z.life -= dt; z.tick -= dt;
    if (z.k === 'fire') {
      if (Math.random() < dt * 30) addPart('flame', z.x + rand(-z.r, z.r) * 0.8, z.y + rand(-z.r, z.r) * 0.45, { vx: rand(-8, 8), vy: rand(-8, 8) });
      if (z.tick <= 0) {
        z.tick = 0.25; Grid.query(z.x, z.y, z.r + 10, Q4);
        for (const o of Q4) { if (o.dead || o.air) continue; if (d2(o.x, o.y, z.x, z.y) < (z.r + o.r) ** 2 * 0.7) { hitZombie(o, z.dps * 0.25, { src: 'fire', noKb: 1 }); o.burn = Math.max(o.burn, 1.6); } }
      }
      if (Math.random() < dt * 4) G.dl.push({ x: z.x, y: z.y, r: z.r * 2.4, i: 0.7, life: 0.12, max: 0.12, col: '#ff8a3c' });
    } else if (z.k === 'acid') {
      if (z.tick <= 0) { z.tick = 0.25; if (d2(p.x, p.y, z.x, z.y) < z.r * z.r && p.roll <= 0) { p.hp -= z.dps * 0.25 * Math.max(0.3, 1 - p.st.armor); G.dmgTaken += z.dps * 0.25; if (p.hp <= 0) { p.hp = 0; playerDie(); } else HUD.hurt(true); } }
    }
    if (z.life <= 0) { arr[i] = arr[arr.length - 1]; arr.pop(); }
  }
}
function makeHazard(tx, ty, kind) { const img = kind === 'gas' ? PROP.gas() : PROP.drum(); const h = { x: (tx + 0.5) * T, y: (ty + 1) * T - 3, tx, ty, hp: 22, fuse: -1, dead: false, img, kind }; setBlock(G.map, tx, ty, 1, 1, 1, 0); G.hazards.push(h); return h; }
function updateHazards(dt) {
  for (const h of G.hazards) {
    if (h.dead || h.fuse < 0) continue;
    h.fuse -= dt;
    if (h.fuse <= 0) { h.dead = true; setBlock(G.map, h.tx, h.ty, 1, 1, 0, 0); explodeAt(h.x, h.y - 4, 46, 110, 26, 'boom'); addZone('fire', h.x, h.y, 26, 4, 22); }
  }
}
function updatePickups(dt) {
  const p = G.p, arr = G.pickups, rng = 26 * p.st.pick;
  for (let i = arr.length - 1; i >= 0; i--) {
    const k = arr[i]; k.t += dt;
    if (k.fz > 0) { k.fz = Math.max(0, k.fz - dt * 150); if (!k.fz) { addPart('dust', k.x, k.y); Sound.play('clank'); } continue; }
    const dx = p.x - k.x, dy = (p.y - 4) - k.y, dd = Math.hypot(dx, dy);
    if (dd < rng || k.mag) { k.mag = true; const sp = 170 + k.t * 40; k.x += dx / (dd || 1) * sp * dt; k.y += dy / (dd || 1) * sp * dt; }
    if (dd < 8) { collect(k); arr[i] = arr[arr.length - 1]; arr.pop(); continue; }
    if (k.life && k.t > k.life) { arr[i] = arr[arr.length - 1]; arr.pop(); }
  }
}
function collect(k) {
  const p = G.p; Sound.play('pick');
  switch (k.k) {
    case 'ammo': if (p.guns.some(g => g.res !== Infinity)) { refillAmmo(p, 0.4); addPop(p.x, p.y - 22, '+%', 'ammo'); } else { p.molo++; } break;
    case 'med': healPlayer(28); break;
    case 'bowl': healPlayer(p.mhp * 0.45); break;
    case 'molo': p.molo++; addPop(p.x, p.y - 22, '+1', 'fire'); break;
    case 'shotgun': giveGun(p, 'shotgun'); break;
    case 'rifle': giveGun(p, 'rifle'); break;
    case 'fuse': if (G.onFuse) G.onFuse(k); break;
  }
}

/* ---------- 粒子、數字 ---------- */
function addPart(k, x, y, o) {
  if (G.parts.length > 720) return;
  o = o || {};
  const P = { k, x, y, z: o.z || 0, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, life: 0, max: 1, col: '', s: 1 };
  switch (k) {
    case 'blood': P.max = 1.2; P.col = pick(BLOODC); P.z = 8; break;
    case 'gib': P.max = 1.4; P.col = pick(['#5a0f12', '#8a2a2a', '#3a0a0a']); P.s = 2; P.z = 8; break;
    case 'spark': P.max = 0.18; P.col = pick(['#fff4c0', '#ffcf5a', '#ffffff']); break;
    case 'smoke': P.max = rand(0.8, 1.4); P.col = 'rgba(40,40,44,0.55)'; P.vy = rand(-20, -8); P.s = randi(2, 4); break;
    case 'flame': P.max = rand(0.3, 0.6); P.vy = (o.vy || 0) - rand(15, 35); P.s = randi(1, 2); break;
    case 'casing': P.max = 1.5; P.col = '#d9a23a'; P.z = 7; break;
    case 'dust': P.max = rand(0.3, 0.5); P.col = 'rgba(180,170,150,0.5)'; P.s = randi(1, 2); break;
    case 'debris': P.max = 1.2; P.col = pick(['#5a5f69', '#3a3f48', '#8a8f96']); P.s = 2; P.z = 6; break;
    case 'acid': P.max = 0.4; P.col = pick(['#a3e84e', '#5f9a22']); break;
  }
  G.parts.push(P);
}
function updateParts(dt) {
  const arr = G.parts, d = G.map.dx;
  for (let i = arr.length - 1; i >= 0; i--) {
    const q = arr[i]; q.life += dt;
    q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.k === 'blood' || q.k === 'gib' || q.k === 'casing' || q.k === 'debris') {
      q.z += q.vz * dt; q.vz -= 300 * dt;
      if (q.z <= 0) {
        if (q.k === 'casing' && q.vz < -40) { q.vz = -q.vz * 0.35; q.z = 0.1; q.vx *= 0.5; q.vy *= 0.5; }
        else { d.fillStyle = q.col; d.fillRect(q.x | 0, q.y | 0, q.s, q.s); if (q.k === 'blood' && Math.random() < 0.4) d.fillRect((q.x + 1) | 0, q.y | 0, 1, 1); q.life = q.max; }
      }
    } else if (q.k !== 'ring' && q.k !== 'sweep') { q.vx *= 0.94; q.vy *= 0.94; }
    if (q.life >= q.max) { arr[i] = arr[arr.length - 1]; arr.pop(); }
  }
}
function addPop(x, y, s, kind) { G.pops.push({ x, y, s, kind, t: 0 }); }
function updatePops(dt) { const a = G.pops; for (let i = a.length - 1; i >= 0; i--) { const q = a[i]; q.t += dt; q.y -= (q.kind === 'crit' ? 26 : 18) * dt; if (q.t > 0.75) { a[i] = a[a.length - 1]; a.pop(); } } }
function shake(v) { if (G) G.shake = Math.max(G.shake, v); PZ.cam.shake(Math.min(1, Math.sqrt(v) / 3.2)); }

