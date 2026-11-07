'use strict';
/* ====== 心魔（頭目）與預警範圍 ====== */
function makeBoss(bid, x, y, room) {
  const hp = 3400 * (1 + .3 * W.chi);
  return { id: uid(), boss: true, bid, type: 'boss', x, y, r: bid === 'desk' ? 52 : 40, hp, hpMax: hp, awake: false, room, phase: 1, cd: 2.2, act: null, actT: 0,
    face: Math.PI / 2, flash: 0, anim: 0, tx: x, ty: y, moveT: 0, dead: false, vx: 0, vy: 0, state: 'boss', spawn: 0, aim: 0, n: 0, shield: false, hx: x, hy: y };
}
function haveKey(k) { return G.archive.some(i => i.key === k) || G.pending.some(i => i.key === k) || G.sold.some(i => i.key === k) || W.players.some(p => p.bag.some(i => i.key === k)); }
function inRoomClamp(b) { const r = b.room; b.x = clamp(b.x, (r.x + 1) * T, (r.x + r.w - 1) * T); b.y = clamp(b.y, (r.y + 1.2) * T, (r.y + r.h - 1) * T); }
function bossWake(b) {
  if (b.awake) return;
  b.awake = true; b.cd = 1.6;
  const bd = W.ch.boss;
  UI.banner(bd.n, bd.sub, true);
  say('boss', bd.hello, 3.2);
  AU.music('boss', W.chi); AU.sfx('roar'); W.shake = 12;
  if (b.bid === 'nurse') {
    const r = b.room; W.bags = [{ x: (r.x + 1.2) * T, y: (r.y + 1.4) * T, hp: 170, dead: false }, { x: (r.x + r.w - 1.2) * T, y: (r.y + 1.4) * T, hp: 170, dead: false }];
  }
}
function tele(o) { o.t = 0; W.tele.push(o); return o; }
function shoot(b, a, sp, o = {}) {
  W.ebul.push(Object.assign({ x: b.x + Math.cos(a) * 30, y: b.y + Math.sin(a) * 30, vx: Math.cos(a) * sp * T, vy: Math.sin(a) * sp * T, r: 9, dmg: 11 * (1 + .12 * W.chi), life: 4, k: 'orb', c: W.ch.th.foe.glow }, o));
}
function updateBoss(b, dt) {
  b.anim += dt; b.flash = Math.max(0, b.flash - dt);
  const p = nearestPlayer(b.x, b.y);
  if (!b.awake) {
    for (const q of W.players) if (q.state === 'alive' && roomAt(q.x, q.y) === b.room.i) bossWake(b);
    if (W.stage >= 3 && !W.said.bossStir) { W.said.bossStir = 1; sayList(RADIO.boss); }
    return;
  }
  if (!p) return;
  if (b.phase === 1 && b.hp < b.hpMax * .5) { b.phase = 2; b.cd = 1; say('boss', W.ch.boss.half, 3); AU.sfx('roar'); W.shake = 10; }
  if (b.stunT2 > 0) { b.stunT2 -= dt; return; }
  b.face = angTo(b.x, b.y, p.x, p.y);
  const P2 = b.phase === 2;
  // 進行中的招式
  if (b.act) { b.actT += dt; bossAct(b, p, dt, P2); return; }
  bossMove(b, p, dt);
  b.cd -= dt;
  if (b.cd > 0) return;
  const list = { desk: ['sweep', 'static', 'call', 'lock', 'static'], conductor: ['notes', 'staff', 'ring', 'notes', 'call'], nurse: ['lash', 'drip', 'ring', 'lash', 'blink'],
    collector: ['toss', 'shards', 'clones', 'charge', 'toss'], thief: ['shots', 'slash', 'sack', 'rain', 'shots'] }[b.bid];
  let a = rnd.pick(list); if (a === b.last && rnd.next() < .7) a = rnd.pick(list);
  b.last = a; b.act = a; b.actT = 0; b.n = 0; b.k = 0;
}
function bossMove(b, p, dt) {
  const r = b.room;
  if (b.bid === 'desk') { b.x = b.hx; return; }
  b.moveT -= dt;
  if (b.bid === 'conductor' || b.bid === 'collector' || b.bid === 'thief') {
    if (b.moveT <= 0) { b.moveT = rnd.range(1.6, 3); const a = rnd.range(0, TAU), d = rnd.range(1.5, 3.2) * T; b.tx = clamp(p.x + Math.cos(a) * d, (r.x + 1.2) * T, (r.x + r.w - 1.2) * T); b.ty = clamp(p.y + Math.sin(a) * d, (r.y + 1.5) * T, (r.y + r.h - 1.2) * T); }
    const sp = (b.bid === 'thief' ? 2.6 : b.bid === 'collector' ? 1.3 : 1.8) * T;
    if (dist(b.x, b.y, b.tx, b.ty) > 8) { const a = angTo(b.x, b.y, b.tx, b.ty); moveBody(b, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt); }
  }
  inRoomClamp(b);
}
function bossAct(b, p, dt, P2) {
  const a = b.act, t = b.actT, done = () => { b.act = null; b.cd = (P2 ? .9 : 1.4) + rnd.range(0, .6); };
  const dmg = (v) => v * (1 + .12 * W.chi) * (1 + .1 * W.depth);
  switch (a) {
    /* 值班台 */
    case 'sweep': {
      if (b.n === 0) { b.n = 1; const base = angTo(b.x, b.y, p.x, p.y); const k = P2 ? 2 : 1; for (let i = 0; i < k; i++) tele({ k: 'beam', x: b.x, y: b.y - 10, a: base - .9 + i * 1.8, da: (i ? -1 : 1) * (P2 ? .95 : .8), len: 11 * T, w: 30, life: .7, act: 2.6, dmg: dmg(12), src: b }); AU.sfx('beam'); }
      if (t > 3.4) done(); break;
    }
    case 'static': {
      const vol = P2 ? 4 : 3;
      if (t > b.n * .38 && b.n < vol) { b.n++; const base = angTo(b.x, b.y, p.x, p.y); for (let i = 0; i < 9; i++) shoot(b, base + (i / 8 - .5) * 1.15 + (b.n % 2 ? .06 : -.06), 3.6, { k: 'static', c: '#cfe9ff', dmg: dmg(10) }); AU.sfx('static'); }
      if (b.n >= vol && t > vol * .38 + .3) done(); break;
    }
    case 'call': {
      if (b.n === 0) { b.n = 1; const alive = W.foes.filter(e => !e.dead && e.fromBoss).length; const k = Math.min(3, 6 - alive); for (let i = 0; i < k; i++) { const r = b.room, x = (r.x + 1 + rnd.next() * (r.w - 2)) * T, y = (r.y + r.h - 1.2) * T; const e = addFoe(b.bid === 'conductor' ? 'ripper' : 'shade', x, y, { state: 'alert', emerge: 1, room: r.i }); e.spawn = .8; e.tgt = p; e.fromBoss = true; } AU.sfx('summon'); }
      if (t > 1) done(); break;
    }
    case 'lock': {
      if (b.n === 0) { b.n = 1; b.lk = tele({ k: 'line', x: b.x, y: b.y - 10, a: angTo(b.x, b.y, p.x, p.y), len: 12 * T, w: 26, life: 1, dmg: 0, follow: p, followT: .65, src: b }); AU.sfx('lock'); }
      if (t > 1 && t < 1.6 && b.k < 12 && t > 1 + b.k * .05) { b.k++; shoot(b, b.lk.a + fx(-.03, .03), 9.5, { k: 'bolt', c: '#ff6a6a', r: 7, dmg: dmg(7) }); AU.sfx('static'); }
      if (t > 1.8) done(); break;
    }
    /* 指揮 */
    case 'notes': {
      if (W.beat > .95 && b.n < (P2 ? 6 : 4) && t - (b.lt || -1) > .3) { b.lt = t; b.n++; const k = P2 ? 14 : 10, off = W.beatN * .17; for (let i = 0; i < k; i++) shoot(b, off + i / k * TAU, 2.9, { k: 'note', c: '#ffd08a', dmg: dmg(10) }); AU.sfx('note'); }
      if (t > (P2 ? 4.6 : 3.4)) done(); break;
    }
    case 'staff': {
      const r = b.room, rows = 5;
      if (b.n < rows && t > b.n * .42) { const y = (r.y + 1 + (b.n + .5) * (r.h - 1.5) / rows) * T, gap = rnd.range(r.x + 1, r.x + r.w - 2.5) * T; tele({ k: 'band', x: r.x * T, y, w: r.w * T, h: .62 * T, gap, gapW: 2 * T, life: .95, dmg: dmg(14), src: b }); b.n++; AU.sfx('staff'); }
      if (t > rows * .42 + 1.2) done(); break;
    }
    case 'ring': {
      const n = P2 ? 2 : 1;
      if (b.n < n && t > b.n * .9) { b.n++; tele({ k: 'ring', x: b.x, y: b.y, r: 0, rmax: 7 * T, th: .55 * T, life: .5, grow: 2.2, dmg: dmg(14), src: b }); AU.sfx('ringwave'); }
      if (t > n * .9 + 2.6) done(); break;
    }
    /* 夜班的自己 */
    case 'lash': {
      if (b.n === 0) { b.n = 1; const base = angTo(b.x, b.y, p.x, p.y); const k = P2 ? 5 : 3; for (let i = 0; i < k; i++) tele({ k: 'line', x: b.x, y: b.y - 10, a: base + (i / (k - 1) - .5) * (P2 ? 1.1 : .7), len: 7.5 * T, w: 30, life: .72, dmg: dmg(17), src: b, whip: 1 }); AU.sfx('lash'); }
      if (t > 1.1) done(); break;
    }
    case 'drip': {
      const k = P2 ? 8 : 6;
      if (b.n < k && t > b.n * .28) { b.n++; tele({ k: 'circle', x: p.x + fx(-14, 14), y: p.y + fx(-14, 14), r: .95 * T, life: .8, dmg: dmg(14), src: b, drip: 1 }); AU.sfx('drip'); }
      if (t > k * .28 + 1) done(); break;
    }
    case 'blink': {
      if (b.n === 0) { b.n = 1; const r = b.room; b.bx = clamp(p.x + fx(-2.5, 2.5) * T, (r.x + 1.2) * T, (r.x + r.w - 1.2) * T); b.by = clamp(p.y + fx(-2.5, 2.5) * T, (r.y + 1.5) * T, (r.y + r.h - 1.2) * T); tele({ k: 'circle', x: b.bx, y: b.by, r: 1.6 * T, life: .85, dmg: dmg(16), src: b }); b.fade = 1; AU.sfx('blink'); }
      if (t > .85 && b.n === 1) { b.n = 2; b.x = b.bx; b.y = b.by; b.fade = 0; W.shake = 6; }
      if (t > 1.3) done(); break;
    }
    /* 收藏家 */
    case 'toss': {
      const k = P2 ? 8 : 5;
      if (b.n < k && t > b.n * .16) { b.n++; const x = p.x + fx(-2.4, 2.4) * T, y = p.y + fx(-1.8, 1.8) * T; if (walkable(tileAt(x, y))) tele({ k: 'circle', x, y, r: .85 * T, life: 1, dmg: dmg(16), src: b, orb: { sx: b.x, sy: b.y - 70 }, real: (W.realDrops || 0) < 6 && rnd.next() < .22 }); AU.sfx('toss'); }
      if (t > k * .16 + 1.3) done(); break;
    }
    case 'shards': {
      const vol = 3;
      if (t > b.n * .42 && b.n < vol) { b.n++; const base = angTo(b.x, b.y, p.x, p.y); const k = P2 ? 9 : 7; for (let i = 0; i < k; i++) shoot(b, base + (i / (k - 1) - .5) * (P2 ? 1.5 : 1.1), 4.3, { k: 'shard', c: '#bff4ff', r: 8, dmg: dmg(10) }); AU.sfx('glassTink'); }
      if (b.n >= vol && t > vol * .42 + .3) done(); break;
    }
    case 'clones': {
      if (b.n === 0) { b.n = 1; const alive = W.foes.filter(e => !e.dead && e.clone).length; for (let i = alive; i < 2; i++) { const a = rnd.range(0, TAU); const e = addFoe('echo', b.x + Math.cos(a) * 80, b.y + Math.sin(a) * 60, { state: 'alert', room: b.room.i }); e.clone = true; e.hp = e.hpMax = 260 * (1 + .2 * W.depth); e.spawn = .7; e.tgt = p; } AU.sfx('mirrorSpawn'); }
      if (t > 1) done(); break;
    }
    case 'charge': {
      if (b.n === 0) { b.n = 1; b.ca = angTo(b.x, b.y, p.x, p.y); tele({ k: 'line', x: b.x, y: b.y, a: b.ca, len: 6 * T, w: 70, life: .7, dmg: 0, src: b }); AU.sfx('lock'); }
      if (t > .7 && t < 1.15) { const sp = 13 * T; moveBody(b, Math.cos(b.ca) * sp * dt, Math.sin(b.ca) * sp * dt); inRoomClamp(b); for (const q of W.players) if (q.state === 'alive' && dist(b.x, b.y, q.x, q.y) < b.r + q.r && !b.hitP) { b.hitP = true; hurtPlayer(q, dmg(22), b.x, b.y); } W.fx.push({ k: 'smear', x: b.x, y: b.y, t: 0, life: .25, type: 'boss', face: b.ca }); }
      if (t > 1.4) { b.hitP = false; done(); } break;
    }
    /* 撤離的人 */
    case 'shots': {
      const k = P2 ? 8 : 6;
      if (b.n < k && t > .3 + b.n * (P2 ? .22 : .28)) { b.n++; shoot(b, angTo(b.x, b.y, p.x, p.y) + fx(-.05, .05), 9, { k: 'bolt', c: '#7ffff0', r: 7, dmg: dmg(9) }); AU.sfx('shot', 'revolver'); W.fx.push({ k: 'muzzle', x: b.x + Math.cos(b.face) * 30, y: b.y - 30 + Math.sin(b.face) * 30, a: b.face, t: 0, life: .07, w: 'revolver' }); }
      if (t > .3 + k * .28 + .6) done(); break;
    }
    case 'slash': {
      if (b.n === 0) { b.n = 1; b.ca = angTo(b.x, b.y, p.x, p.y); tele({ k: 'cone', x: b.x, y: b.y, a: b.ca, r: 3.4 * T, fov: .7, life: .5, dmg: dmg(20), src: b, moveWith: b }); AU.sfx('lock'); }
      if (t > .3 && t < .55) { moveBody(b, Math.cos(b.ca) * 10 * T * dt, Math.sin(b.ca) * 10 * T * dt); inRoomClamp(b); W.fx.push({ k: 'smear', x: b.x, y: b.y, t: 0, life: .25, type: 'boss', face: b.ca }); }
      if (t > .9) done(); break;
    }
    case 'sack': {
      const n = P2 ? 3 : 2;
      if (b.n < n && t > b.n * .55) { b.n++; const k = 16; for (let i = 0; i < k; i++) shoot(b, i / k * TAU + b.n * .2, 2.7, { k: 'mem', c: rnd.pick(['#ffc94a', '#b98aff', '#5fb6ff']), dmg: dmg(11) }); AU.sfx('sack'); }
      if (t > n * .55 + .8) done(); break;
    }
    case 'rain': {
      if (b.n === 0) { b.n = 1; const r = b.room, k = P2 ? 14 : 10; for (let i = 0; i < k; i++) { const x = (r.x + 1 + rnd.next() * (r.w - 2)) * T, y = (r.y + 1 + rnd.next() * (r.h - 2)) * T; tele({ k: 'circle', x, y, r: .9 * T, life: .9 + i * .05, dmg: dmg(14), src: b, orb: { sx: x, sy: y - 400 } }); } tele({ k: 'circle', x: p.x, y: p.y, r: .9 * T, life: 1.1, dmg: dmg(14), src: b, orb: { sx: p.x, sy: p.y - 400 } }); AU.sfx('toss'); }
      if (t > 2) done(); break;
    }
    default: done();
  }
  // 點滴袋補血
  if (b.bid === 'nurse' && W.bags && b.hp < b.hpMax * .6) { const n = W.bags.filter(g => !g.dead).length; if (n) { b.hp = Math.min(b.hpMax, b.hp + b.hpMax * .011 * n * dt); b.healing = true; if (!W.said.bags) { W.said.bags = 1; say('man', '她在吸點滴回血！先把點滴袋打掉！'); } } else b.healing = false; }
}
function updateTele(dt) {
  for (const o of W.tele) {
    o.t += dt;
    if (o.follow && o.t < o.followT) o.a = angTo(o.x, o.y, o.follow.x, o.follow.y);
    if (o.moveWith) { o.x = o.moveWith.x; o.y = o.moveWith.y; }
    if (o.k === 'beam') {
      if (o.t > o.life) { o.a += o.da * dt; if (o.src && !o.src.dead) { o.x = o.src.x; o.y = o.src.y - 10; } o.tick = (o.tick || 0) - dt; if (o.tick <= 0) { o.tick = .3; for (const p of W.players) if (p.state === 'alive' && inBeam(o, p)) hurtPlayer(p, o.dmg, o.x, o.y); } }
      if (o.t > o.life + o.act || (o.src && o.src.dead)) o.dead = true;
      continue;
    }
    if (o.k === 'ring') {
      if (o.t > o.life) { o.r = (o.t - o.life) / o.grow * o.rmax; for (const p of W.players) if (p.state === 'alive' && !o.hitSet?.has(p)) { const d = dist(o.x, o.y, p.x, p.y); if (Math.abs(d - o.r) < o.th * .5 + p.r * .5) { (o.hitSet = o.hitSet || new Set()).add(p); hurtPlayer(p, o.dmg, o.x, o.y); } } }
      if (o.t > o.life + o.grow) o.dead = true;
      continue;
    }
    if (o.t >= o.life) {
      o.dead = true;
      if (o.dmg) for (const p of W.players) if (p.state === 'alive' && inTele(o, p)) hurtPlayer(p, o.dmg, o.x, o.y);
      if (o.k === 'circle') { W.fx.push({ k: o.drip ? 'splash' : 'shock', x: o.x, y: o.y, r: o.r, t: 0, life: .35 }); AU.sfx(o.drip ? 'splash' : 'thud'); W.shake = Math.max(W.shake, 3); if (o.real) { W.realDrops = (W.realDrops || 0) + 1; dropMemory(o.x, o.y, rollRar(2.8)); } }
      if (o.k === 'line' && o.whip) W.fx.push({ k: 'whip', x: o.x, y: o.y, a: o.a, len: o.len, t: 0, life: .25 });
      if (o.k === 'band') W.fx.push({ k: 'bandfx', o, t: 0, life: .3 });
      if (o.k === 'cone') W.fx.push({ k: 'claw', x: o.x, y: o.y - 20, a: o.a, t: 0, life: .25, big: 1 });
    }
  }
  W.tele = W.tele.filter(o => !o.dead);
}
function teleLen(o) { return o.k === 'beam' || o.k === 'line' ? Math.min(o.len, rayDist(o.x, o.y + 10, o.a, o.len) + 6) : o.len; }
function inBeam(o, p) { const dx = p.x - o.x, dy = p.y - o.y, ca = Math.cos(o.a), sa = Math.sin(o.a); const along = dx * ca + dy * sa, perp = Math.abs(-dx * sa + dy * ca); return along > 0 && along < teleLen(o) && perp < o.w * .5 + p.r * .6; }
function inTele(o, p) {
  if (o.k === 'circle') return dist(o.x, o.y, p.x, p.y) < o.r + p.r * .4;
  if (o.k === 'line') return inBeam(o, p);
  if (o.k === 'band') return p.y > o.y - o.h / 2 - p.r * .4 && p.y < o.y + o.h / 2 + p.r * .4 && !(p.x > o.gap && p.x < o.gap + o.gapW);
  if (o.k === 'cone') return dist(o.x, o.y, p.x, p.y) < o.r && Math.abs(angDiff(o.a, angTo(o.x, o.y, p.x, p.y))) < o.fov;
  return false;
}
function bossDie(b, p) {
  W.bossDead = true; W.hitstop = .2; W.slowmo = 1.2; W.shake = 20;
  AU.sfx('bossDie'); say('boss', W.ch.boss.die, 3.5);
  for (let i = 0; i < 60; i++) { const a = rnd.range(0, TAU), s = fx(60, 420); W.fx.push({ k: 'ink', x: b.x, y: b.y - fx(10, 80), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, t: 0, life: fx(.6, 1.4), c: W.ch.th.foe.body, s: fx(4, 11) }); }
  W.fx.push({ k: 'boom', x: b.x, y: b.y, r: 4 * T, t: 0, life: .6 }); W.tl.push({ x: b.x, y: b.y, r: 9 * T, c: '#fff', t: 0, life: .5, i: 1 });
  W.fx.push({ k: 'dissolve', x: b.x, y: b.y, t: 0, life: 1.4, type: 'boss', bid: b.bid });
  for (const e of W.foes) if (e.fromBoss || e.clone) { e.hp = 0; killFoe(e, p); }
  W.tele = []; W.ebul = []; if (W.bags) W.bags.forEach(g => g.dead = true);
  for (let i = 0; i < 14; i++) W.picks.push({ k: 'xp', x: b.x + fx(-30, 30), y: b.y + fx(-20, 20), vx: fx(-200, 200), vy: fx(-200, 200), t: 0, v: 2 });
  AU.music('dream', W.chi, W.depth);
  const chi = W.chi;
  setTimeout(() => {
    if (!W || W.out) return;
    if (chi === 4) { finalAfterBoss(b); return; }
    if (!G.chapters[chi].core) dropMemory(b.x, b.y + 20, 5, coreItem(chi));
    else dropMemory(b.x, b.y + 20, 4, makeMemory(4, chi, { n: '心魔的殘響', f: CH[chi].dreamer + '最不願意想起的那一刻。', val: 3200 }));
    if (CH[chi].qing && !haveKey(CH[chi].qing.key)) dropMemory(b.x - 30, b.y + 30, 4, qingItem(CH[chi].qing));
    if (CH[chi].qingSet) CH[chi].qingSet.forEach((q, i) => { if (!haveKey(q.key)) dropMemory(b.x + (i - 1) * 40, b.y + 34, 4, qingItem(q)); });
    for (let i = 0; i < 2; i++) dropMemory(b.x, b.y, rollRar(3.2));
  }, 700);
}
function finalAfterBoss(b) {
  W.finalPhase = 1;
  UI.playScene(CH[4].core, () => {
    W.qing = { x: b.x, y: b.y + 10, carried: false };
    const r = b.room;
    const names = ['偷來的初戀', '別人的畢業典禮', '一場買來的雨', '沒有臉的生日', '借來的晴天', '別人家的晚餐', '陌生人的第一句我愛你', '一張被賣掉的全家福'];
    for (let i = 0; i < 8; i++) { const x = (r.x + 1 + rnd.next() * (r.w - 2)) * T, y = (r.y + 1 + rnd.next() * (r.h - 2)) * T; const it = makeMemory(4, 4, { n: names[i], f: '這些年，從別人夢裡偷出來的東西。', val: Math.round(fx(2600, 4200) / 10) * 10 }); W.picks.push({ k: 'mem', x, y, z: 0, vz: null, vx: 0, vy: 0, t: 0, item: it, beam: 1, ign: 0 }); }
    say('wei', '……晴。', 3);
    setTimeout(() => say('man', '子葳，她在那裡！地上那些……很值錢。可是背著她就拿不了。', 5), 2500);
  });
}
