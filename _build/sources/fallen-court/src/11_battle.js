// ============ 戰鬥引擎（純邏輯，不碰畫面）============
// 所有狀態都在 B 裡（可複製）：預覽＝複製一份、試打一次、比較差異。
// 每個行動把發生的事依序推進 EV，畫面照著演。
let EV = [];
const ev = (t, o) => { const e = Object.assign({ t }, o); EV.push(e); return e; };
const U = id => B.units[id];
const isHero = u => u.side === 'hero';
const up = u => !u.dead && !u.down;
const liveFoes = () => B.units.filter(u => u.side === 'foe' && !u.dead);
const realFoes = () => B.units.filter(u => u.side === 'foe' && !u.dead && !u.object);
const allHeroes = () => B.units.filter(u => u.side === 'hero');
const liveHeroes = () => B.units.filter(u => u.side === 'hero' && !u.down);
const hasTrait = (u, k) => u.side === 'foe' && FOE[u.type].traits.some(t => t.k === k);
const M = (u, id) => (u.mods && u.mods[id]) || 0;
const L = (u, id) => !!(u.leg && u.leg[id]);
const T = (u, id) => !!(u.tal && u.tal[id]);
const partyHas = id => liveHeroes().some(h => M(h, id));
const partyLeg = id => allHeroes().find(h => !h.down && L(h, id));
function brand() { let a = B.rs = (B.rs + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const bpick = a => a[Math.floor(brand() * a.length)];
const isAloft = u => u.s.aloft || (u.side === 'foe' && hasTrait(u, 'hover'));
const spdOf = u => u.spd + (u.side === 'foe' && hasTrait(u, 'frenzy') && realFoes().length === 1 ? 25 : 0);
function adjacentOf(u) { const Lr = B.rows[u.row] || []; const i = Lr.indexOf(u.id); const out = []; if (i > 0) out.push(U(Lr[i - 1])); if (i >= 0 && i < Lr.length - 1) out.push(U(Lr[i + 1])); return out.filter(x => !x.dead); }
function frontEmpty() { return !B.rows.front.some(id => !U(id).dead && !U(id).object); }
function canReach(sk, tgt) { if (sk.reach !== 'melee') return true; if (tgt.row === 'front') return true; if (B.airLow) return true; return frontEmpty() && tgt.row === 'back'; }
function newS() { return { aloft: false, lift: 0, stagger: 0, mark: 0, markLock: 0, burn: 0, burnAtk: 0, burnKeep: false, rust: 0, slow: 0, lit: 0, exposed: 0, isolate: 0, guard: 0, riposte: 0, oathdr: 0, gate: 0, evade: 0, ambush: 0, still: 0, moss: 0, armorZero: 0, feather: 0, perch: 0 }; }

// ---------- 建立戰鬥 ----------
function battleNew(cfg) {
  B = { units: [], time: 0, reso: cfg.reso0 || 0, resoMax: RULE.resoMax, rows: { front: [], back: [], air: [] }, scene: (cfg.scene || []).map(k => ({ k, used: false, wake: 0 })),
    shelter: 0, rs: (cfg.seed || 1) | 0, last: null, over: null, zl: cfg.zl || 1, items: Object.assign({ potion: 0, fire: 0, float: 0 }, cfg.items || {}),
    flags: cfg.flags || {}, boss: !!cfg.boss, noFlee: !!cfg.noFlee, dmgBy: {}, xp: 0, coin: 0, kills: [], turns: 0, dry: false, depth: 0, airLow: false, resoFam: cfg.resoFam || null,
    ambush: cfg.ambush || 0, easy: !!cfg.easy, parleyDone: !!cfg.parleyDone, hpK: cfg.hpK || 1, atkK: cfg.atkK || 1, pylonsAtEnd: 0, stat: { links: 0, perfect: 0, slams: 0, interrupts: 0, downs: 0 } };
  for (const h of cfg.heroes) {
    const st = h.stats, u = { id: B.units.length, side: 'hero', hero: h.id, name: HERO[h.id].n, hp: Math.min(h.hp == null ? st.hpMax : h.hp, st.hpMax), hpMax: st.hpMax, shield: 0,
      atk: st.atk, arm: st.arm, spd: st.spd, crit: st.crit, w: HERO[h.id].w, impact: st.impact || 0, liftB: st.lift || 0, mods: st.mods || {}, leg: st.leg || {}, tal: st.tal || {},
      mom: Math.min(5, (h.mom || 0) + (st.mom0 || 0)), skills: h.skills.slice(), ultOk: !!h.ultOk, cds: {}, s: newS(), f: {}, t: 0, down: false, dead: false, wounds: 0 };
    if (u.hp <= 0) u.hp = 1;
    B.units.push(u);
  }
  for (const f of cfg.foes) addFoe(f.type || f, f.row, true);
  if (partyLeg('writ')) B.resoMax = 4;
  B.rustCap = RULE.rustMax + (liveHeroes().some(h => M(h, 'R5')) ? 2 : 0) + (partyLeg('scale') ? 3 : 0);
  // 開場順序
  for (const u of B.units) {
    if (u.object) { u.t = Infinity; continue; }
    u.t = 10000 / u.spd * (.5 + .5 * brand());
    if (isHero(u)) { if (B.ambush > 0) u.t -= RULE.ambushAdv; if (M(u, 'M5')) { u.t -= M(u, 'M5'); u.s.ambush = 1; } }
    else if (B.ambush < 0) u.t -= RULE.ambushedAdv;
  }
  if (partyLeg('wick')) for (const h of liveHeroes()) h.t -= 10;
  const mn = Math.min(...B.units.filter(u => !u.object).map(u => u.t)); for (const u of B.units) if (!u.object) u.t = Math.max(0, u.t - Math.max(0, mn - 5));
  if (partyLeg('chair')) { const top = realFoes().sort((a, b) => b.hp - a.hp)[0]; if (top) { top.s.mark = 1; top.s.markLock = 3; } }
  for (const u of realFoes()) pickIntent(u);
  return B;
}
function addFoe(type, row, init) {
  const F = FOE[type], zl = B.zl;
  const u = { id: B.units.length, side: 'foe', type, name: F.n, hp: Math.round(foeHp(F, zl) * (F.object ? 1 : B.hpK || 1)), hpMax: Math.round(foeHp(F, zl) * (F.object ? 1 : B.hpK || 1)), shield: 0, atk: foeAtk(F, zl) * (B.atkK || 1), arm: F.arm, spd: F.spd, crit: 0, w: F.w,
    row: row || F.row, elite: !!F.elite, boss: !!F.boss, object: !!F.object, cds: {}, used: {}, s: newS(), f: {}, t: 0, dead: false, down: false, intent: null, charging: null, acted: 0, phase: 1, crumbled: 0 };
  B.units.push(u); B.rows[u.row].push(u.id);
  if (!init) { u.t = B.time + 60; if (!u.object) pickIntent(u); else u.t = Infinity; }
  return u;
}

// ---------- 順序條 ----------
function nextUnit() { let best = null; for (const u of B.units) { if (u.dead || u.down || u.object) continue; if (!best || u.t < best.t - 1e-9 || (Math.abs(u.t - best.t) < 1e-9 && u.id < best.id)) best = u; } return best; }
function bOrder(n) { // 接下來 n 手（後續以延遲 100 推算）
  const sim = B.units.filter(u => !u.dead && !u.down && !u.object).map(u => ({ id: u.id, t: u.t, spd: spdOf(u), first: true })), out = [];
  if (!sim.length) return out;
  for (let i = 0; i < n; i++) { sim.sort((a, b) => a.t - b.t || a.id - b.id); const x = sim[0]; const u = U(x.id); out.push({ id: x.id, t: x.t, first: x.first, charge: x.first && !!u.charging }); x.t += 100 * 100 / x.spd; x.first = false; }
  return out;
}
function advance(u, n) { if (u.dead || u.down || !n) return; u.t = Math.max(B.time, u.t - n); ev('adv', { u: u.id, n }); }
function delayU(src, u, n) {
  if (u.dead || u.down || u.object || !n) return 0;
  if (isHero(u) && L(u, 'ballast')) { ballastBlock(u); return 0; }
  if (u.boss) n = Math.round(n * .5);
  u.t += n; ev('delay', { u: u.id, n });
  if (src && isHero(src) && L(src, 'brokenscale') && src !== u) advance(src, Math.round(n / 2));
  return n;
}
function ballastBlock(u) { addShield(u, Math.round(u.hpMax * .10)); ev('text', { u: u.id, s: '壓艙石', c: '#f3d98a' }); }

// ---------- 資源 ----------
function addMom(u, n) { if (!isHero(u) || u.down || !n) return; const b = u.mom; u.mom = clamp(u.mom + n, 0, 5); if (u.mom !== b) ev('mom', { u: u.id, n: u.mom - b, v: u.mom }); }
function addReso(n) { const b = B.reso; B.reso = clamp(B.reso + n, 0, B.resoMax); if (B.reso !== b) ev('reso', { n: B.reso - b, v: B.reso }); }
function addShield(u, n) { if (u.dead || u.down || n <= 0) return; u.shield = Math.min(u.hpMax, u.shield + n); ev('shield', { u: u.id, n, v: u.shield }); }
function heal(u, n, src) { if (u.dead || n <= 0) return 0; if (u.s.isolate && !u.down) { ev('text', { u: u.id, s: '落單：補不到', c: '#ff6a5a' }); return 0; } const b = u.hp; u.hp = Math.min(u.hpMax, u.hp + Math.round(n)); ev('heal', { u: u.id, n: u.hp - b, hp: u.hp }); return u.hp - b; }

// ---------- 狀態 ----------
function cancelCharge(u, why, src) {
  if (!u.charging) return false;
  u.charging = null; ev('interrupt', { u: u.id, why }); B.stat.interrupts++;
  addReso(1);
  const v = Math.max(0, ...liveHeroes().map(h => M(h, 'T3'))); if (v) for (const h of liveHeroes()) advance(h, v);
  pickIntent(u);
  return true;
}
function addStagger(src, u, quiet) {
  if (u.dead || u.down || u.object) return;
  if (isHero(u) && L(u, 'ballast')) { ballastBlock(u); return; }
  const was = u.s.stagger; u.s.stagger = 1;
  if (!was) { ev('status', { u: u.id, k: 'stagger', on: 1 }); delayU(null, u, RULE.staggerDelay); }
  if (u.charging) cancelCharge(u, 'stagger', src);
  if (src && isHero(src) && !was) {
    if (T(src, 'w5b')) addMom(src, 1);
    if (u.s.rust >= 3 && partyHas('R6') && !u.s.armorZero) { u.s.armorZero = 1; ev('text', { u: u.id, s: '崩解', c: '#4fc7a0' }); }
    if (B.cur != null) (B.opened = B.opened || {})[u.id] = 1;
  }
  if (u.side === 'foe' && hasTrait(u, 'highperch') && u.row === 'air') perchDown(u);
}
function perchDown(u) { moveRow(u, 'front'); u.s.perch = 1; ev('text', { u: u.id, s: '落下來了', c: '#8fd0ff' }); }
function moveRow(u, row) { if (u.row === row) return; const a = B.rows[u.row], i = a.indexOf(u.id); if (i >= 0) a.splice(i, 1); u.row = row; B.rows[row].push(u.id); ev('row', { u: u.id, row }); }
function addMark(src, u) { if (u.dead || u.object) return; if (!u.s.mark) { u.s.mark = 1; ev('status', { u: u.id, k: 'mark', on: 1 }); } if (src && isHero(src)) (B.opened = B.opened || {})[u.id] = 1; }
function addBurn(src, u, n, spread) {
  if (u.dead || u.down || u.object || n <= 0) return;
  const b = u.s.burn; u.s.burn = Math.min(RULE.burnMax, u.s.burn + n);
  u.s.burnAtk = Math.max(u.s.burnAtk, (src && src.atk) || (14 + 3 * B.zl));
  if (src && isHero(src) && L(src, 'brazier')) u.s.burnKeep = true;
  if (u.s.burn !== b) ev('status', { u: u.id, k: 'burn', on: 1, n: u.s.burn });
  if (src && isHero(src) && M(src, 'C3') && !src.f.c3) { src.f.c3 = 1; addMom(src, 1); }
  if (!spread && u.side === 'foe' && B.scene.some(s => s.k === 'oil')) for (const o of adjacentOf(u)) addBurn(src, o, 1, true);
}
function addRust(src, u, n) {
  if (u.dead || u.down || u.object || n <= 0) return;
  const cap = isHero(u) ? RULE.rustMax : B.rustCap, b = u.s.rust; u.s.rust = Math.min(cap, u.s.rust + n);
  if (u.s.rust !== b) ev('status', { u: u.id, k: 'rust', on: 1, n: u.s.rust });
  if (src && isHero(src) && M(src, 'R3')) delayU(src, u, M(src, 'R3'));
}
function addLift(src, u, n) {
  if (u.dead || u.down || u.object || n <= 0) return;
  if (isHero(u) && L(u, 'ballast')) { ballastBlock(u); return; }
  if (u.side === 'foe' && hasTrait(u, 'hover')) return;
  if (u.side === 'foe' && u.s.moss > 0) { ev('text', { u: u.id, s: '有苔，浮不起來', c: '#5fd0b0' }); return; }
  if (src && isHero(src)) n += src.liftB + (B.resoFam === 'aloft' ? 1 : 0);
  if (u.s.aloft) return;
  u.s.lift += n;
  if (u.boss || u.w >= 5) { // 浮不起來，但蓄力時每 2 點削 1 格穩固
    if (u.charging) { while (u.s.lift >= 2 && u.charging) { u.s.lift -= 2; chip(src, u, 1); } } else u.s.lift = Math.min(u.s.lift, 1);
    ev('text', { u: u.id, s: '撐不起來', c: '#8fd0ff' }); return;
  }
  ev('lift', { u: u.id, n: u.s.lift, w: u.w });
  if (u.s.lift >= u.w) launch(src, u);
}
function launch(src, u) {
  u.s.aloft = true; u.s.lift = 0; ev('launch', { u: u.id });
  let d = RULE.aloftDelay;
  if (src && isHero(src) && L(src, 'feather') && u.side === 'foe') { d += 30; u.s.feather = 1; }
  if (u.boss) d = Math.round(d * .5); u.t += d; ev('delay', { u: u.id, n: d });
  if (u.charging) cancelCharge(u, 'launch', src);
  if (isHero(u)) { u.s.guard = 0; u.s.riposte = 0; }
  if (src && isHero(src) && u.side === 'foe') {
    (B.opened = B.opened || {})[u.id] = 1;
    if (M(src, 'F1')) hit(src, u, { mult: M(src, 'F1') / 100, kind: 'follow', noCrit: true });
    if (M(src, 'F3')) advance(src, M(src, 'F3'));
  }
}
function chip(src, u, n) { // 削穩固
  if (!u.charging || n <= 0) return;
  u.charging.pips -= n; ev('chip', { u: u.id, n, pips: Math.max(0, u.charging.pips) });
  if (u.charging.pips <= 0) { cancelCharge(u, 'break', src); addStagger(src, u); }
}

// ---------- 傷害 ----------
function armorFactor(a) { return a >= 0 ? 100 / (100 + a) : 2 - 100 / (100 - a); }
function effArm(u) { let a = u.arm - u.s.rust * (RULE.rustArm + (u.side === 'foe' && B.resoFam === 'rust' ? 2 : 0)) - (u.crumbled || 0) * 8; if (u.s.armorZero) a = Math.min(a, 0); return a; }
function badCount(u) { let n = 0; if (u.s.aloft) n++; if (u.s.stagger) n++; if (u.s.mark) n++; if (u.s.burn) n++; if (u.s.rust) n++; if (u.s.slow) n++; return n; }
// 回傳 { dmg, crit, cc(暴擊率), cdmg(暴擊時傷害) }；不改狀態
function calcHit(src, tgt, o) {
  let base = o.fixed != null ? o.fixed : (src ? src.atk : 0) * (o.mult || 0);
  if (o.pctHp) base += tgt.hpMax * o.pctHp;
  let bonus = 0, mul = 1;
  const sk = o.sk || null, dot = o.kind === 'dot', fixed = o.fixed != null && !o.mult;
  if (src && !fixed && !dot) {
    if (isHero(src)) {
      if (o.link) bonus += o.link;
      if (src.hero === 'wei' && (isAloft(tgt) || tgt.s.stagger)) bonus += RULE.passiveWei;
      if (src.hero === 'yuan' && (tgt.row === 'back' || tgt.row === 'air')) bonus += T(src, 'y5a') ? .30 : RULE.backYuan;
      if (M(src, 'F2') && isAloft(tgt)) bonus += M(src, 'F2') / 100;
      if (M(src, 'T2') && sk && sk.delay >= 120) bonus += M(src, 'T2') / 100;
      if (L(src, 'collar')) bonus += .08 * badCount(tgt);
      if (src.s.still) bonus += .08 * src.s.still;
      if (sk && sk.id === 'y_hook' && T(src, 'y3b')) bonus += .4;
    } else {
      if (hasTrait(src, 'pack')) bonus += .2 * (realFoes().filter(f => f.type === 'hound' && f !== src).length);
      if (hasTrait(src, 'braced') && !src.f.hitSince) bonus += .4;
      if (hasTrait(src, 'stubborn') && src.hp < src.hpMax * .5) bonus += .25;
      if (hasTrait(src, 'frenzy') && realFoes().length === 1) bonus += .25;
      if (B.easy) mul *= .75;
    }
  }
  // 目標端
  if (tgt.s.stagger) mul *= 1 + RULE.staggerDmg;
  if (isHero(tgt)) {
    if (tgt.s.lit) mul *= 1 + RULE.litDmg;
    if (tgt.s.aloft) mul *= 1 + RULE.aloftDmgHero;
    if (!o.pierce && !dot) {
      if (tgt.s.guard) mul *= 1 - (T(tgt, 'l3a') ? .65 : RULE.guardDR);
      else { const nd = allHeroes().find(h => h !== tgt && !h.down && h.s.guard && L(h, 'nightdoor')); if (nd) mul *= 1 - (T(nd, 'l3a') ? .65 : RULE.guardDR) / 2; }
      if (tgt.s.riposte) mul *= 1 - (RULE.ripDR + (T(tgt, 'w7b') ? .2 : 0));
      if (tgt.s.oathdr) mul *= 1 - RULE.oathDR;
      if (o.covered && T(tgt, 'l7a')) mul *= .7;
    }
    if (!dot && allHeroes().some(h => !h.down && h.s.gate > 0)) mul *= 1 - RULE.gateDR;
    if (M(tgt, 'O5') && tgt.hp < tgt.hpMax * .4) mul *= 1 - M(tgt, 'O5') / 100;
    if (o.aoe) { const g = Math.max(0, ...allHeroes().filter(h => h !== tgt && !h.down).map(h => M(h, 'O3'))); if (g) mul *= 1 - g / 100; }
  } else {
    if (hasTrait(tgt, 'shell') && !tgt.s.stagger && !isAloft(tgt)) mul *= .6;
    if (hasTrait(tgt, 'formation') && adjacentOf(tgt).some(x => hasTrait(x, 'formation'))) mul *= .8;
    if (hasTrait(tgt, 'alpha')) mul *= 1 - Math.min(.45, .15 * realFoes().filter(f => f.type === 'hound').length);
    if (hasTrait(tgt, 'anchored')) mul *= 1 - .2 * liveFoes().filter(f => f.type === 'pylon').length;
    if (tgt.s.feather && tgt.s.aloft) mul *= 1.15;
    if (dot && hasTrait(tgt, 'moss')) mul *= 2;
    if (dot && B.scene.some(s => s.k === 'oil')) mul *= 1.5;
    if (dot && B.resoFam === 'cin') mul *= 1.25;
  }
  let slamK = 1;
  if (o.slam && isAloft(tgt)) { slamK = RULE.slamBase + RULE.slamPerW * tgt.w; if (tgt.side === 'foe' && hasTrait(tgt, 'hover')) slamK *= 2; }
  const af = (dot || o.trueDmg) ? 1 : armorFactor(effArm(tgt));
  const raw = base * (1 + bonus) * mul * slamK * af;
  // 暴擊
  let cc = 0, sure = false, cm = RULE.critMult;
  if (src && isHero(src) && !o.noCrit && !dot && !fixed) {
    cc = src.crit + (M(src, 'R2') ? M(src, 'R2') * tgt.s.rust : 0) + (M(src, 'M2') && tgt.s.stagger ? M(src, 'M2') : 0);
    if (tgt.s.mark || src.s.ambush || o.sure || (o.slam && isAloft(tgt) && T(src, 'w7a'))) sure = true;
    if (src.s.ambush && T(src, 'y7a')) cm = 2; if (B.resoFam === 'shade') cm = Math.max(cm, 1.75);
    cc = clamp(cc, 0, 100);
  }
  return { dmg: Math.max(1, Math.round(raw)), cdmg: Math.max(1, Math.round(raw * cm)), cc: sure ? 100 : cc, sure, slamK };
}
function hit(src, tgt, o) {
  if (tgt.dead || tgt.down) return 0;
  if (B.depth > 6) return 0;
  B.depth++;
  const c = calcHit(src, tgt, o);
  let crit = c.sure || (!B.dry && c.cc > 0 && brand() * 100 < c.cc);
  if (B.forceCrit && c.cc > 0) crit = true;
  let dmg = crit ? c.cdmg : c.dmg;
  const heroSrc = src && isHero(src);
  // 標記／伏擊消耗
  let usedMark = false;
  if (heroSrc && !o.noCrit && o.kind !== 'dot') {
    if (tgt.s.mark && crit) { if (tgt.s.markLock > 0) { /* 不消耗 */ } else { tgt.s.mark = 0; ev('status', { u: tgt.id, k: 'mark', on: 0 }); } usedMark = true; }
    if (src.s.ambush && !o.keepAmbush) { src.s.ambush = 0; ev('status', { u: src.id, k: 'ambush', on: 0 }); }
  }
  // 扣血
  let sh = 0;
  if (tgt.shield > 0 && !o.pierce) { sh = Math.min(tgt.shield, dmg); tgt.shield -= sh; }
  const hpLoss = Math.min(tgt.hp, dmg - sh);
  tgt.hp -= hpLoss;
  // 層主：20% 認出
  if (tgt.boss && !B.parleyDone && tgt.hp <= tgt.hpMax * .2) { tgt.hp = Math.max(1, Math.round(tgt.hpMax * .2)); B.parley = true; }
  if (heroSrc) B.dmgBy[src.id] = (B.dmgBy[src.id] || 0) + dmg;
  ev('hit', { src: src ? src.id : -1, tgt: tgt.id, dmg, crit, hp: tgt.hp, sh: tgt.shield, kind: o.kind || 'skill', slam: !!(o.slam && c.slamK > 1), fx: o.fx || null, cc: c.cc, cdmg: c.cdmg, ndmg: c.dmg });
  if (tgt.side === 'foe') { tgt.f.hitSince = 1; crumbleCheck(tgt); phaseCheck(tgt); }
  // 命中後的觸發
  if (heroSrc && o.kind !== 'dot' && tgt.side === 'foe') {
    if (!src.f.firstHit && (o.kind === 'skill' || !o.kind)) { src.f.firstHit = 1; if (M(src, 'C2')) addBurn(src, tgt, 1); if (M(src, 'R1')) addRust(src, tgt, 1); }
    if (usedMark && M(src, 'M1')) advance(src, M(src, 'M1'));
    if (crit) {
      if (M(src, 'C1')) addBurn(src, tgt, M(src, 'C1'));
      if (M(src, 'M3') && !src.f.m3) { const o2 = realFoes().filter(f => f !== tgt && !f.s.mark).sort((a, b) => b.hp - a.hp)[0]; if (o2) { src.f.m3 = 1; addMark(src, o2); } }
      if (o.kind !== 'follow') for (const h of liveHeroes()) if (h !== src && M(h, 'M6') && !h.f.m6 && !tgt.dead && tgt.hp > 0) { h.f.m6 = 1; ev('follow', { u: h.id, tgt: tgt.id }); hit(h, tgt, { mult: M(h, 'M6') / 100, kind: 'follow' }); }
    }
  }
  if (isHero(tgt) && src && src.side === 'foe' && o.kind !== 'dot') {
    if (M(tgt, 'C5')) addBurn(tgt, src, 1);
    if (M(tgt, 'R4')) addRust(tgt, src, 1);
    if (L(tgt, 'wick') && !tgt.f.wick) { tgt.f.wick = 1; addMark(null, src); }
    if (T(tgt, 'y5b') && !tgt.f.y5b && tgt.hp > 0) { tgt.f.y5b = 1; tgt.s.ambush = 1; ev('status', { u: tgt.id, k: 'ambush', on: 1 }); }
    if (L(tgt, 'heart') && tgt.hp > 0 && tgt.s.still < 5) { tgt.s.still++; ev('status', { u: tgt.id, k: 'still', on: 1, n: tgt.s.still }); }
    if (tgt.s.oathdr && T(tgt, 'l5a') && (tgt.f.l5a || 0) < 2) { tgt.f.l5a = (tgt.f.l5a || 0) + 1; addMom(tgt, 1); }
  }
  if (tgt.hp <= 0) kill(src, tgt, o);
  B.depth--;
  return dmg;
}
function crumbleCheck(u) { if (!hasTrait(u, 'crumble') || u.dead) return; const lost = Math.floor((1 - u.hp / u.hpMax) * 4); while (u.crumbled < Math.min(3, lost)) { u.crumbled++; ev('text', { u: u.id, s: '殼剝落', c: '#cfc9bb' }); } }
function phaseCheck(u) { if (!u.boss || u.dead) return; if (u.phase === 1 && u.hp <= u.hpMax * .5) { u.phase = 2; u.spd += 15; ev('phase', { u: u.id, n: 2 }); if (!u.charging) pickIntent(u); } }
function kill(src, tgt, o) {
  if (isHero(tgt)) {
    tgt.hp = 0; tgt.down = true; tgt.wounds = Math.min(RULE.woundMax, (tgt.wounds || 0) + 1); tgt.shield = 0; const keep = tgt.s.still; tgt.s = newS(); void keep; tgt.t = Infinity; B.stat.downs++;
    ev('down', { u: tgt.id });
    for (const h of liveHeroes()) if (M(h, 'O6')) { h.t = B.time; addMom(h, M(h, 'O6')); ev('text', { u: h.id, s: '薪火', c: '#f3d98a' }); }
    if (!liveHeroes().length) B.over = 'lose';
    return;
  }
  tgt.dead = true; tgt.hp = 0; tgt.charging = null;
  const adj = adjacentOf(tgt), burnN = tgt.s.burn, wasMark = tgt.s.mark, row = tgt.row;
  const a = B.rows[tgt.row], i = a.indexOf(tgt.id); if (i >= 0) a.splice(i, 1);
  ev('death', { u: tgt.id, by: src ? src.id : -1 });
  const F = FOE[tgt.type];
  if (!tgt.object) { B.xp += foeXp(F, B.zl); B.coin += F.coin[0] + Math.floor(brand() * (F.coin[1] - F.coin[0] + 1)); B.kills.push(tgt.type); }
  if (src && isHero(src)) {
    addMom(src, 1 + (M(src, 'M4') || 0));
    if (L(src, 'pricetag') && !src.f.price) { const nx = liveHeroes().filter(h => h !== src).sort((x, y) => x.t - y.t)[0]; if (nx) { src.f.price = 1; nx.t = B.time; ev('text', { u: nx.id, s: '價目牌：立刻行動', c: '#ffcf5a' }); } }
  }
  if (burnN > 0 && partyHas('C6')) { const o2 = realFoes().sort((x, y) => y.hp - x.hp)[0]; if (o2) addBurn(src && isHero(src) ? src : null, o2, Math.min(3, burnN)); }
  if (wasMark && liveHeroes().some(h => T(h, 'y9b'))) { const o2 = realFoes().sort((x, y) => y.hp - x.hp)[0]; if (o2) addMark(null, o2); }
  if (hasTrait(tgt, 'burst')) { ev('burst', { u: tgt.id }); for (const x of adjacent2(adj)) addLift(src, x, 2); if (src && isHero(src) && o && o.melee) addLift(null, src, 2); }
  if (tgt.type === 'moss' && burnN <= 0 && realFoes().length < 6) { ev('text', { u: tgt.id, s: '裂開了', c: '#5fd0b0' }); for (let k = 0; k < 2; k++) { const n = addFoe('spore', row); ev('summon', { u: n.id, by: tgt.id }); } }
  rowsFix(); checkOver();
}
const adjacent2 = a => a.filter(x => !x.dead);
function rowsFix() {
  if (frontEmpty()) {
    const back = B.rows.back.map(U).filter(u => !u.dead && !u.object);
    if (back.length) { for (const u of back) moveRow(u, 'front'); ev('text', { s: '後排補上來了', c: '#e8e2d0', big: true }); }
    else if (B.rows.air.some(id => !U(id).dead) && !B.airLow) { B.airLow = true; ev('text', { s: '牠們飄下來了', c: '#e8e2d0', big: true }); }
  }
}
function checkOver() { if (B.over) return; if (!realFoes().length) { B.over = 'win'; B.pylonsAtEnd = liveFoes().filter(f => f.type === 'pylon').length; } else if (!liveHeroes().length) B.over = 'lose'; }

// ---------- 回合開始／結束 ----------
function bNext() { // 把時鐘推到下一個行動者，處理回合開始的事
  EV = [];
  const u = nextUnit(); if (!u) { checkOver(); return { u: null, ev: EV }; }
  B.time = u.t; B.cur = u.id; B.turns++; B.opened = null; B.depth = 0;
  ev('turn', { u: u.id });
  u.f.firstHit = 0; u.f.c3 = 0; u.f.m3 = 0; u.f.m6 = 0; u.f.price = 0; u.f.y5b = 0; u.f.l5a = 0; u.f.dealt = 0; u.f.coverUsed = 0;
  if (isHero(u)) {
    u.f.wasIsolated = u.s.isolate ? 1 : 0;
    for (const k of ['guard', 'riposte', 'oathdr', 'evade', 'isolate']) if (u.s[k]) { u.s[k] = 0; ev('status', { u: u.id, k, on: 0 }); }
    if (u.s.gate > 0) { u.s.gate--; if (!u.s.gate) ev('status', { u: u.id, k: 'gate', on: 0 }); }
    for (const k in u.cds) if (u.cds[k] > 0) u.cds[k]--;
    if (M(u, 'C4')) for (const f of realFoes()) if (f.s.burn > 0) burnTick(f, true);
  }
  // 落地
  if (u.s.aloft) { u.s.aloft = false; u.s.lift = 0; u.s.feather = 0; ev('land', { u: u.id }); }
  else if (u.s.lift > 0) u.s.lift--;
  // 灼燒
  if (u.s.burn > 0 && !u.dead) burnTick(u, false);
  if (u.dead || u.down) { B.cur = null; return { u: null, ev: EV, skipped: u.id }; }
  // 苔
  if (u.side === 'foe' && hasTrait(u, 'moss')) { if (u.s.moss < 3) { u.s.moss++; ev('status', { u: u.id, k: 'moss', on: 1, n: u.s.moss }); } heal(u, u.hpMax * .05 * u.s.moss); }
  // 地利醒來
  for (const s of B.scene) if (s.wake && B.time >= s.wake) { s.wake = 0; s.used = false; ev('scene', { k: s.k, wake: 1 }); }
  return { u, ev: EV };
}
function burnTick(u, keep) {
  const d = (u.s.burnAtk || 14) * RULE.burnPct * u.s.burn;
  hit(null, u, { fixed: d, kind: 'dot', noCrit: true });
  if (u.dead || u.down) return;
  if (hasTrait(u, 'moss') && u.s.moss > 0) { u.s.moss--; ev('status', { u: u.id, k: 'moss', on: u.s.moss > 0 ? 1 : 0, n: u.s.moss }); }
  if (!keep && !u.s.burnKeep) { u.s.burn--; ev('status', { u: u.id, k: 'burn', on: u.s.burn > 0 ? 1 : 0, n: u.s.burn }); }
}
function endAction(u, delay) {
  if (u.dead || u.down) { B.last = { id: u.id, side: u.side, opened: B.opened || {}, chain: isHero(u) ? (B.chainNow || [u.id]) : null }; B.cur = null; return; }
  let d = delay;
  if (isHero(u)) { if (d <= 70 && M(u, 'T1')) d *= 1 - M(u, 'T1') / 100; }
  else if (partyLeg('scale') && u.s.rust) d *= 1 + .04 * u.s.rust;
  if (u.s.slow > 0) d *= 1 + RULE.slowDelay;
  u.t = Math.max(u.t, B.time) + d * 100 / spdOf(u);
  // 自己的回合結束時消退的狀態
  if (u.s.stagger) { u.s.stagger = 0; ev('status', { u: u.id, k: 'stagger', on: 0 }); }
  for (const k of ['slow', 'lit', 'exposed', 'markLock']) if (u.s[k] > 0) { u.s[k]--; if (!u.s[k] && k !== 'markLock') ev('status', { u: u.id, k, on: 0 }); }
  if (u.side === 'foe') { u.f.hitSince = 0; u.acted++; if (u.s.perch) { u.s.perch = 0; if (!u.dead) moveRow(u, 'air'); } }
  if (isHero(u)) {
    if (M(u, 'O2') && !u.f.dealt) addShield(u, Math.round(u.hpMax * M(u, 'O2') / 100));
    if (M(u, 'F5') && realFoes().some(f => f.s.aloft)) advance(u, M(u, 'F5'));
  }
  B.last = { id: u.id, side: u.side, opened: B.opened || {}, chain: isHero(u) ? (B.chainNow || [u.id]) : null }; B.cur = null;
  checkOver();
}

// ---------- 英雄行動 ----------
function skillCost(u, sk) { if (sk.unison) return 0; let c = sk.cost || 0; if (sk.id === 'w_lift' && T(u, 'w3a')) c = 0; if ((sk.id === 'y_hook' || sk.id === 'y_hoist') && L(u, 'firsthook')) c = 0; return c; }
function skillDelay(u, sk) { let d = sk.delay; if (sk.id === HERO[u.hero].basic && L(u, 'knuckle')) d += 15; return d; }
function skillCd(u, sk) { let c = sk.cd || 0; if (sk.id === 'y_mark' && T(u, 'y3a')) c = 0; if (sk.id === 'l_mend' && T(u, 'l7b')) c -= 1; return c; }
function canUse(u, sk) {
  if (sk.unison) return B.reso >= B.resoMax ? null : '共鳴未滿';
  if (sk.ult && !u.ultOk) return '尚未領悟';
  if (sk.item && !(B.items[sk.item] > 0)) return '用完了';
  if ((u.cds[sk.id] || 0) > 0) return '冷卻 ' + u.cds[sk.id];
  if (skillCost(u, sk) > u.mom) return '勢不足';
  return null;
}
function heroCommands(u) { // 這個人這回合能選的全部指令
  const H = HERO[u.hero], ids = [H.basic].concat(u.skills, [H.ult, 'c_guard', 'c_wait', 'c_potion', 'c_fire', 'c_float', 'c_unison']);
  return ids.map(id => ({ sk: SK[id], no: canUse(u, SK[id]) }));
}
function skillTargets(u, sk) { // 回傳 { units:[id], scene:[idx], all:bool }
  const out = { units: [], scene: [], all: false };
  if (sk.tg === 'self') { out.units = [u.id]; out.all = true; return out; }
  if (sk.tg === 'allies') { out.units = allHeroes().filter(h => !h.down).map(h => h.id); out.all = true; return out; }
  if (sk.tg === 'ally') { out.units = allHeroes().filter(h => (!h.down && (sk.heal ? h.hp < h.hpMax || (sk.cleanse && (h.s.burn || h.s.slow)) : true)) || (h.down && sk.revive)).map(h => h.id); return out; }
  if (sk.tg === 'foes') { out.units = realFoes().concat(liveFoes().filter(f => f.object && !sk.noDmg)).map(f => f.id); out.all = true; return out; }
  out.units = liveFoes().filter(f => canReach(sk, f)).map(f => f.id);
  if (sk.tg === 'foe') B.scene.forEach((s, i) => { const S0 = SCENE[s.k]; if (S0.passive || s.used) return; if (S0.ranged && sk.reach !== 'ranged') return; if (sk.noDmg) return; out.scene.push(i); });
  return out;
}
function bAct(uid, skId, tgt) { // tgt：單位 id，或 { scene: idx }
  EV = []; B.depth = 0;
  const u = U(uid), sk = SK[skId];
  const cost = skillCost(u, sk), delay = skillDelay(u, sk);
  if (cost) { u.mom -= cost; ev('mom', { u: u.id, n: -cost, v: u.mom }); }
  if (sk.item) B.items[sk.item]--;
  const cd = skillCd(u, sk); if (cd > 0) u.cds[sk.id] = cd + 1;
  // 連攜判定
  let link = 0, perfect = false, prev = null;
  const dmgSkill = !!(sk.mult || sk.fixed || sk.unison || sk.slam);
  const chain = (B.last && B.last.side === 'hero' && B.last.chain) ? B.last.chain : [];
  if (B.last && B.last.side === 'hero' && B.last.id !== u.id && !u.f.wasIsolated && !chain.includes(u.id)) {
    prev = U(B.last.id);
    const pair = [u.hero, prev.hero].sort().join('+');
    if (!(B.flags.noLinkYL && pair === 'luo+yuan') && !prev.down) {
      link = RULE.linkDmg;
      const tids = tgt != null && typeof tgt === 'number' ? [tgt] : (sk.tg === 'foes' ? realFoes().map(f => f.id) : []);
      if (dmgSkill && tids.some(id => B.last.opened[id])) { perfect = true; link = RULE.perfectDmg; }
      link += Math.max(M(u, 'T4'), 0) / 100;
    }
  }
  ev('act', { u: u.id, sk: sk.id, tgt: typeof tgt === 'number' ? tgt : -1, scene: tgt && tgt.scene != null ? tgt.scene : -1, link: link > 0, perfect, prev: prev ? prev.id : -1, ult: !!sk.ult, unison: !!sk.unison });
  if (link > 0) {
    B.stat.links++; if (perfect) B.stat.perfect++;
    addReso(perfect ? 2 : 1); B.perfectNow = perfect;
    const hv = Math.max(M(u, 'O4'), prev ? M(prev, 'O4') : 0) + (B.resoFam === 'oath' ? 5 : 0);
    if (hv) { heal(u, u.hpMax * hv / 100); if (prev && !prev.down) heal(prev, prev.hpMax * hv / 100); }
  }
  B.opened = null; B.chainNow = link > 0 ? chain.concat([u.id]) : [u.id]; if (!(link > 0)) B.perfectNow = false;
  if (sk.gain) addMom(u, sk.gain);
  const o = { sk, link: dmgSkill ? link : 0, melee: sk.reach === 'melee' };
  if (tgt && tgt.scene != null) useScene(u, tgt.scene);
  else if (sk.unison) doUnison(u);
  else resolveSkill(u, sk, typeof tgt === 'number' ? U(tgt) : null, o);
  if (sk.ult && T(u, 'w9a') && sk.id === 'w_ult' && !u.f.w9a) { u.f.w9a = 1; addMom(u, 2); }
  endAction(u, delay);
  return EV;
}
function splashList(sk, tgt) { return adjacentOf(tgt); }
function resolveSkill(u, sk, tgt, o) {
  const dealt = () => { u.f.dealt = 1; };
  switch (sk.tg) {
    case 'self': {
      if (sk.stance) { u.s[sk.stance] = sk.stance === 'gate' ? (sk.gateTurns + (T(u, 'l9a') ? 1 : 0)) : 1; ev('status', { u: u.id, k: sk.stance, on: 1 }); }
      if (sk.ambush) { u.s.ambush = 1; ev('status', { u: u.id, k: 'ambush', on: 1 }); }
      if (sk.staggerFront) for (const f of B.rows.front.map(U).filter(x => !x.dead && !x.object)) addStagger(u, f);
      break;
    }
    case 'allies': {
      for (const h of liveHeroes()) if (sk.shieldPct) addShield(h, Math.round(u.hpMax * sk.shieldPct * (T(u, 'l9b') ? 1.5 : 1)));
      break;
    }
    case 'ally': {
      const h = tgt; if (!h) break;
      if (h.down) { if (sk.revive) { h.down = false; h.hp = Math.max(1, Math.round(h.hpMax * (sk.revive + (sk.id === 'l_mend' && T(u, 'l7b') ? .1 : 0)))); h.t = B.time + 100 * 100 / h.spd; h.mom = Math.min(h.mom, 2); ev('revive', { u: h.id, hp: h.hp }); } }
      else { heal(h, h.hpMax * (sk.heal + (sk.id === 'l_mend' && T(u, 'l7b') ? .1 : 0)), u); if (sk.cleanse) for (const k of ['burn', 'slow']) if (h.s[k]) { h.s[k] = 0; ev('status', { u: h.id, k, on: 0 }); } }
      break;
    }
    case 'foes': {
      const list = realFoes().concat(sk.noDmg ? [] : liveFoes().filter(f => f.object));
      for (const f of list) {
        if (f.dead) continue;
        if (!sk.noDmg) {
          const fixed = sk.fixed != null ? sk.fixed + (sk.fixedLv || 0) * B.zl : null;
          if (sk.slamAloft && isAloft(f) && !f.object) doSlam(u, f, sk.mult, o, true);
          else { hit(u, f, Object.assign({ mult: sk.mult, fixed, aoe: true }, o, fixed != null ? { noCrit: true } : null)); dealt(); if (!f.dead) applyImpact(u, f, sk); }
        }
        if (f.dead || f.object) continue;
        applyRiders(u, f, sk);
        if (sk.staggerAll) addStagger(u, f);
      }
      dealt();
      break;
    }
    case 'multi': {
      let n = sk.n2 + (T(u, 'y9a') ? 1 : 0);
      const others = realFoes().filter(f => f !== tgt).sort((a, b) => (a.row === tgt.row ? 0 : 1) - (b.row === tgt.row ? 0 : 1) || b.hp - a.hp).slice(0, n);
      const list = [tgt].concat(others), k = sk.mult + sk.perExtra * (list.length - 1);
      for (const f of list) { if (f.dead) continue; hit(u, f, Object.assign({ mult: k, aoe: true }, o)); dealt(); if (f.dead) continue; applyRiders(u, f, sk); }
      break;
    }
    case 'adj': case 'foe': default: {
      if (!tgt || tgt.dead) break;
      // 斷錨（重鑄後的殘刃）：每場一次，魏子葳的墜擊對沒浮空的目標也成立
      const forced = sk.slam && !isAloft(tgt) && L(u, 'anchorblade') && !B.forcedSlam && !tgt.object;
      if (forced) { B.forcedSlam = true; ev('text', { u: u.id, s: '斷錨', c: '#ffcf5a' }); }
      if (sk.slam && (isAloft(tgt) || forced)) { doSlam(u, tgt, sk.slamMult || sk.mult, o, false); dealt(); break; }
      hit(u, tgt, Object.assign({ mult: sk.mult }, o)); dealt();
      if (!tgt.dead) {
        applyImpact(u, tgt, sk);
        applyRiders(u, tgt, sk);
        if (sk.delayIfGround && !tgt.dead) delayU(u, tgt, sk.delayIfGround);
        if (sk.id === 'l_atk' && T(u, 'l3b')) delayU(u, tgt, 10);
        if (sk.id === HERO[u.hero].basic && L(u, 'knuckle')) addLift(u, tgt, 1);
      }
      if (sk.splash) for (const x of splashList(sk, tgt)) { hit(u, x, Object.assign({ mult: sk.splash, aoe: true }, o)); if (!x.dead && sk.id === 'w_dash' && T(u, 'w5a')) delayU(u, x, 10); }
      if (sk.id === 'w_dash' && T(u, 'w5a') && !tgt.dead) delayU(u, tgt, 10);
      if (sk.ram) { const x = adjacentOf(tgt)[0]; if (x) { hit(u, x, Object.assign({ mult: sk.ram, aoe: true }, o)); if (!x.dead) delayU(u, x, sk.delayTgt); } }
      if (sk.id === 'l_slam' && T(u, 'l5b')) for (const x of adjacentOf(tgt)) hit(u, x, Object.assign({ mult: sk.mult * .5, aoe: true }, o));
    }
  }
}
function applyImpact(u, f, sk) {
  let imp = sk.impact || 0;
  if (sk.id === 'w_time' && T(u, 'w9b')) imp = Math.max(imp, 2);
  if (!imp) return;
  imp += u.impact; if (sk.id === 'l_atk' && L(u, 'nightdoor')) imp += 1; if (sk.id === 'l_slam' && T(u, 'l5b')) imp += 1;
  if (f.charging) chip(u, f, imp);
}
function applyRiders(u, f, sk) {
  if (f.dead) return;
  if (sk.lift) addLift(u, f, sk.lift);
  if (sk.mark) addMark(u, f);
  if (sk.burn) addBurn(u, f, sk.burn);
  if (sk.rust) addRust(u, f, sk.rust);
  if (sk.id === 'y_hook' && T(u, 'y3b')) addRust(u, f, 1);
  if (sk.pullFront) { if (f.row !== 'front') { if (hasTrait(f, 'highperch')) perchDown(f); else moveRow(f, 'front'); } else if (sk.delayIfFront) delayU(u, f, sk.delayIfFront + (L(u, 'firsthook') ? 15 : 0)); }
  if (sk.delayTgt && !sk.ram) delayU(u, f, sk.delayTgt + (sk.id === 'w_time' && T(u, 'w9b') ? 15 : 0));
}
function doSlam(u, f, mult, o, mass) {
  const hover = hasTrait(f, 'hover');
  const base = u.atk * mult * (RULE.slamBase + RULE.slamPerW * f.w) * (hover ? 2 : 1);
  const adj = adjacentOf(f), wasRow = f.row;
  hit(u, f, Object.assign({ mult, slam: true }, o)); u.f.dealt = 1;
  B.stat.slams++;
  ev('slam', { u: u.id, tgt: f.id });
  if (!B.perfectNow) addReso(1);
  if (M(u, 'F4')) addMom(u, 1);
  if (!f.dead) { if (!hover) { f.s.aloft = false; f.s.lift = 0; f.s.feather = 0; ev('land', { u: f.id, hard: 1 }); } addStagger(u, f); if (o.sk && o.sk.id === 'y_yank' && T(u, 'y7b')) delayU(u, f, 20);
    if (!hover && !f.elite && !f.boss && f.w <= 2 && B.scene.some(s => s.k === 'ledge')) { ev('ledge', { u: f.id }); f.hp = 0; kill(u, f, o); } }
  if (!mass) { // 衝擊波
    const k = RULE.shock * (1 + (T(u, 'w3b') ? .5 : 0) + M(u, 'F4') / 100);
    const all = liveHeroes().some(h => M(h, 'F6'));
    const near = adj.filter(x => !x.dead);
    for (const x of near) hit(u, x, { fixed: base * k, kind: 'shock', noCrit: true, aoe: true, mult: 0 });
    if (all) for (const x of realFoes()) if (x !== f && !near.includes(x)) hit(u, x, { fixed: base * k * .5, kind: 'shock', noCrit: true, aoe: true, mult: 0 });
  }
  void wasRow;
}
function useScene(u, idx) {
  const s = B.scene[idx], zl = B.zl; ev('scene', { k: s.k, idx, use: 1, by: u.id }); u.f.dealt = 1;
  if (s.k === 'barrel') { s.used = true; const oil = B.scene.some(x => x.k === 'oil'); const list = oil ? realFoes() : B.rows.front.map(U).filter(x => !x.dead && !x.object); for (const f of list) { hit(u, f, { fixed: 30 + 6 * zl, kind: 'scene', noCrit: true, aoe: true, mult: 0 }); if (!f.dead) addBurn(u, f, oil ? 3 : 2); } }
  else if (s.k === 'cluster') { s.used = true; s.wake = B.time + 300; for (const f of realFoes()) addLift(null, f, 2); }
  else if (s.k === 'hang') dropHangOn('foe', u, idx);
}
function dropHangOn(side, by, idx) { // idx：玩家點的是哪一段（沒指定就用第一段還吊著的）
  const s = (idx != null && B.scene[idx] && B.scene[idx].k === 'hang' && !B.scene[idx].used) ? B.scene[idx] : B.scene.find(x => x.k === 'hang' && !x.used); if (!s) return; s.used = true; const zl = B.zl;
  // 第 n 段懸鏈對第 n 根錨樁：那一根還在就砸那一根，不在了就砸第一根還立著的
  const nth = B.scene.filter(x => x.k === 'hang').indexOf(s), pys = B.units.filter(f => f.type === 'pylon'), py = side !== 'foe' ? null : pys[nth] && !pys[nth].dead ? pys[nth] : liveFoes().find(f => f.type === 'pylon');
  ev('hangdrop', { side, idx: B.scene.indexOf(s), onto: py ? py.id : null });
  if (side === 'foe') {
    for (const f of B.rows.front.map(U).filter(x => !x.dead && !x.object)) { hit(by, f, { fixed: 50 + 10 * zl, kind: 'scene', noCrit: true, aoe: true, mult: 0 }); if (!f.dead) addStagger(by, f); }
    if (py) { py.hp = 0; kill(by, py, {}); }
  } else for (const h of liveHeroes()) { hit(by, h, { fixed: 40 + 8 * zl, kind: 'scene', noCrit: true, aoe: true, mult: 0 }); if (!h.down) addStagger(null, h); }
}
function doUnison(u) {
  const hs = liveHeroes(), has = id => hs.some(h => h.hero === id), fam = B.resoFam;
  B.reso = 0; ev('reso', { n: -99, v: 0 });
  ev('unison', { by: u.id, members: hs.map(h => h.id) });
  const list = realFoes();
  if (has('yuan')) for (const f of list) { if (f.row !== 'front' && !hasTrait(f, 'highperch')) moveRow(f, 'front'); addMark(null, f); }
  if (has('luo')) for (const f of list) { if (f.boss || f.w >= 5) continue; if (!hasTrait(f, 'hover') && !f.s.aloft) { f.s.aloft = true; f.s.lift = 0; ev('launch', { u: f.id }); if (f.charging) cancelCharge(f, 'launch', u); } }
  const pow = hs.reduce((a, h) => a + h.atk * (h.hero === 'wei' ? 1.6 : .8), 0);
  for (const f of list) {
    if (f.dead) continue;
    hit(u, f, { fixed: pow, kind: 'unison', noCrit: fam !== 'shade', sure: fam === 'shade', mult: 0, aoe: true });
    if (f.dead) continue;
    if (f.s.aloft) { f.s.aloft = false; ev('land', { u: f.id, hard: 1 }); }
    addStagger(u, f); delayU(u, f, 30 + (fam === 'aloft' ? 30 : 0));
    if (fam === 'cin') addBurn(u, f, 3); if (fam === 'rust') addRust(u, f, 3);
  }
  for (const py of liveFoes().filter(f => f.object)) hit(u, py, { fixed: pow, kind: 'unison', noCrit: true, mult: 0 });
  if (fam === 'oath') for (const h of hs) addShield(h, Math.round(h.hpMax * .2));
  u.f.dealt = 1;
}

// ---------- 預覽：複製一份試打 ----------
function bPreview(uid, skId, tgt) {
  const real = B, realEV = EV;
  B = JSON.parse(JSON.stringify(real, (k, v) => v === Infinity ? '__inf' : v), (k, v) => v === '__inf' ? Infinity : v);
  B.dry = true;
  const before = {}; for (const x of B.units) before[x.id] = { hp: x.hp, sh: x.shield, dead: x.dead, down: x.down };
  let evs = [];
  try { evs = bAct(uid, skId, tgt); } catch (e) { evs = []; }
  const res = { units: {}, order: bOrder(9), reso: B.reso, mom: U(uid).mom, over: B.over, notes: [] };
  for (const x of B.units) { const b = before[x.id]; if (!b) { res.units[x.id] = { hp: x.hp, loss: 0, summoned: true }; continue; } res.units[x.id] = { hp: x.hp, loss: (b.hp - x.hp) + (b.sh - x.shield), dead: x.dead && !b.dead, down: x.down && !b.down, aloft: x.s.aloft, stagger: x.s.stagger, lift: x.s.lift, mark: x.s.mark, burn: x.s.burn, rust: x.s.rust, row: x.row }; }
  for (const e of evs) if (e.t === 'hit' && e.src === uid && (e.kind === 'skill' || !e.kind)) { const r = res.units[e.tgt]; if (r && r.cc == null) { r.cc = e.cc; r.cdmg = e.cdmg; r.ndmg = e.ndmg; } }
  for (const e of evs) { if (e.t === 'interrupt') res.notes.push('打斷'); if (e.t === 'launch') res.notes.push('打浮'); if (e.t === 'slam') res.notes.push('墜擊'); if (e.t === 'act' && e.link) res.notes.push(e.perfect ? '完美連攜' : '連攜'); if (e.t === 'ledge') res.notes.push('打落深淵'); }
  B = real; EV = realEV;
  return res;
}

// ---------- 敵人：意圖與行動 ----------
function condOk(u, c) {
  if (!c) return true;
  switch (c) {
    case 'round2': return u.acted >= 1;
    case 'notFirst': return u.acted >= 1 || B.time > 60;
    case 'hasHang': return B.scene.some(s => s.k === 'hang' && !s.used);
    case 'fewHounds': return realFoes().filter(f => f.type === 'hound').length < 2;
    case 'fewKin': return realFoes().filter(f => f.type === 'unmoored').length < 2;
    case 'fewGuards': return realFoes().filter(f => !f.boss).length < 2;
    case 'hasAllies': return realFoes().filter(f => f !== u).length >= 1;
    case 'hpBelow60': return u.hp < u.hpMax * .6;
    case 'heroAloft': return liveHeroes().some(h => h.s.aloft);
    case 'phase2': return u.phase >= 2;
  }
  return true;
}
function pickIntent(u) {
  const F = FOE[u.type]; if (!F.moves.length) { u.intent = null; return; }
  const ok = F.moves.filter(m => !(u.cds[m.id] > 0) && !(m.once && u.used[m.id]) && condOk(u, m.cond) && condOk(u, m.cond2));
  let mv = null; const pr = ok.filter(m => m.prio).sort((a, b) => b.prio - a.prio)[0];
  if (pr) mv = pr; else { const pool = ok.filter(m => m.w); if (pool.length) { let s = 0; for (const m of pool) s += m.w; let r = brand() * s; for (const m of pool) { r -= m.w; if (r <= 0) { mv = m; break; } } mv = mv || pool[pool.length - 1]; } }
  if (!mv) mv = F.moves[F.moves.length - 1];
  u.intent = { mv: mv.id, tgt: pickTargets(u, mv) };
}
function moveOf(u, id) { return FOE[u.type].moves.find(m => m.id === id); }
function pickTargets(u, mv) {
  const hs = liveHeroes(); if (!hs.length) return [];
  const one = h => h ? [h.id] : [];
  switch (mv.tgt) {
    case 'self': return [];
    case 'all': return hs.map(h => h.id);
    case 'low': return one(hs.slice().sort((a, b) => a.hp / a.hpMax - b.hp / b.hpMax)[0]);
    case 'weak': return one(hs.slice().sort((a, b) => effArm(a) - effArm(b) || a.hp - b.hp)[0]);
    case 'threat': return one(hs.slice().sort((a, b) => (B.dmgBy[b.id] || 0) - (B.dmgBy[a.id] || 0) || b.atk - a.atk)[0]);
    case 'stance': return one(hs.find(h => h.s.guard || h.s.riposte || h.s.oathdr) || hs.slice().sort((a, b) => a.hp / a.hpMax - b.hp / b.hpMax)[0]);
    case 'aloft': return one(hs.find(h => h.s.aloft) || bpick(hs));
    case 'wei': return one(hs.find(h => h.hero === 'wei') || bpick(hs));
    case 'two': { const a = hs.slice().sort(() => brand() - .5); return a.slice(0, 2).map(h => h.id); }
    default: return one(bpick(hs));
  }
}
// 現在這一刻，這個意圖實際會打到誰（立誓、點名、紅光都算進去）
function intentTargets(u) {
  if (!u.intent) return [];
  const mv = moveOf(u, u.charging ? u.charging.mv : u.intent.mv); if (!mv) return [];
  if (mv.tgt === 'self') return [];
  const hs = liveHeroes(); if (!hs.length) return [];
  if (mv.tgt === 'all') return hs.map(h => h.id);
  let ids = (u.charging ? u.charging.tgt : u.intent.tgt).filter(id => !U(id).down);
  if (!ids.length) ids = pickTargetsStable(u, mv);
  if (mv.tgt === 'two') return ids;
  if (hasTrait(u, 'grudge')) return ids;
  const taunt = hs.find(h => h.s.oathdr); if (taunt) return [taunt.id];
  const exp = hs.find(h => h.s.exposed); if (exp && (FOE[u.type].human || ['bruiser', 'rigger', 'foreman', 'ledger'].includes(u.type))) return [exp.id];
  if (u.type === 'drone') { const lit = hs.find(h => h.s.lit); if (lit && realFoes().some(f => f.type === 'drone07')) return [lit.id]; }
  return ids;
}
function pickTargetsStable(u, mv) { const hs = liveHeroes(); if (mv.tgt === 'low') return [hs.slice().sort((a, b) => a.hp / a.hpMax - b.hp / b.hpMax)[0].id]; return [hs[(u.id + u.acted) % hs.length].id]; }
function intentInfo(u) { // 給介面：招式、目標、預估傷害、蓄力
  if (!u.intent) return null;
  const charging = !!u.charging, mv = moveOf(u, charging ? u.charging.mv : u.intent.mv), tg = intentTargets(u), dmg = {};
  if (mv.mult || mv.pctHp) for (const id of tg) { const h = U(id); let c = calcHit(u, h, { mult: mv.mult, pctHp: mv.pctHp, pierce: mv.pierce, aoe: mv.tgt === 'all', slam: mv.slamHero }); dmg[id] = c.dmg * (mv.hits || 1); }
  return { mv, tgt: tg, dmg, charging, pips: charging ? u.charging.pips : (mv.charge ? mv.charge.pips : 0), willCharge: !charging && !!mv.charge };
}
function foeAct(u) {
  EV = []; B.depth = 0;
  if (!u.intent) { endAction(u, 100); return EV; }
  let mv, delay;
  if (u.charging) { mv = moveOf(u, u.charging.mv); const tg = intentTargets(u); u.charging = null; ev('foeact', { u: u.id, mv: mv.id, tgt: tg, release: 1 }); execMove(u, mv, tg); delay = mv.delay; if (mv.cd) u.cds[mv.id] = mv.cd + 1; if (mv.once) u.used[mv.id] = 1; }
  else {
    mv = moveOf(u, u.intent.mv);
    if (mv.charge) { u.charging = { mv: mv.id, pips: mv.charge.pips, tgt: u.intent.tgt.slice() }; ev('charge', { u: u.id, mv: mv.id, pips: mv.charge.pips, tgt: intentTargets(u) }); delay = mv.charge.t; }
    else { const tg = intentTargets(u); ev('foeact', { u: u.id, mv: mv.id, tgt: tg }); execMove(u, mv, tg); delay = mv.delay; if (mv.cd) u.cds[mv.id] = mv.cd + 1; if (mv.once) u.used[mv.id] = 1; }
  }
  for (const k in u.cds) if (u.cds[k] > 0) u.cds[k]--;
  if (hasTrait(u, 'whip') && !u.dead) { const sl = realFoes().filter(f => f !== u).sort((a, b) => b.t - a.t)[0]; if (sl) advance(sl, 20); }
  const wasCharging = !!u.charging;
  endAction(u, delay);
  if (!u.dead && !wasCharging) pickIntent(u);
  return EV;
}
function execMove(u, mv, tg) {
  const aoe = mv.tgt === 'all';
  if (mv.summon) { const cap = mv.summonCap || 6; let list = mv.summon; if (mv.summonAlt && u.phase >= 2) list = mv.summonAlt; for (const t of list) { if (realFoes().filter(f => f !== u && !f.boss).length >= cap || realFoes().length >= 7) break; const n = addFoe(t); ev('summon', { u: n.id, by: u.id }); } }
  if (mv.actAllies) { for (const f of realFoes().filter(x => x !== u)) { f.t = B.time + .01 * (f.id + 1); } ev('text', { u: u.id, s: '催命：全員上', c: '#ff6a5a', big: true }); }
  if (mv.dropHang) { dropHangOn('hero', u); return; }
  let shelter = mv.shelter ? B.shelter : 0; const sheltered = {};
  if (shelter > 0) { for (const h of liveHeroes().sort((a, b) => a.hp - b.hp)) { if (shelter <= 0) break; sheltered[h.id] = 1; shelter--; } B.shelter = 0; }
  for (const id of tg) {
    let h = U(id); if (!h || h.down) continue;
    if (sheltered[h.id]) { ev('text', { u: h.id, s: '躲在錨後', c: '#f3d98a' }); continue; }
    let covered = false;
    if (!aoe) {
      if (h.s.evade) { h.s.evade = 0; ev('evade', { u: h.id }); ev('status', { u: h.id, k: 'evade', on: 0 }); continue; }
      const luo = allHeroes().find(x => x.hero === 'luo' && !x.down && !x.s.aloft);
      if (luo && luo !== h && !luo.f.coverUsed && !h.s.isolate && !h.s.exposed && h.hp < h.hpMax * (T(luo, 'l7a') ? .5 : RULE.coverAt)) { luo.f.coverUsed = 1; ev('cover', { u: luo.id, for: h.id }); h = luo; covered = true; }
    }
    const n = mv.hits || 1;
    for (let i = 0; i < n && !h.down; i++) {
      if (mv.mult || mv.pctHp) {
        const slam = !!(mv.slamHero && h.s.aloft);
        hit(u, h, { mult: mv.mult, pctHp: mv.pctHp, pierce: mv.pierce, aoe, slam, covered, kind: 'foe', fx: mv.fx });
        if (slam && !h.down) { h.s.aloft = false; h.s.lift = 0; ev('land', { u: h.id, hard: 1 }); addStagger(null, h); }
      }
    }
    if (h.down) continue;
    if (mv.rustHero) addRust(u, h, mv.rustHero);
    if (mv.heroLift) addLift(u, h, mv.heroLift);
    if (mv.heroDelay) delayU(u, h, mv.heroDelay);
    if (mv.momLoss && h.mom > 0) { h.mom -= 1; ev('mom', { u: h.id, n: -1, v: h.mom }); }
    if (mv.slow && !L(h, 'ballast')) { h.s.slow = mv.slow; ev('status', { u: h.id, k: 'slow', on: 1 }); }
    if (mv.lit) { h.s.lit = mv.lit; ev('status', { u: h.id, k: 'lit', on: 1 }); }
    if (mv.exposed) { h.s.exposed = mv.exposed; ev('status', { u: h.id, k: 'exposed', on: 1 }); }
    if (mv.isolate) { h.s.isolate = 1; ev('status', { u: h.id, k: 'isolate', on: 1 }); }
    if (mv.strip) for (const k of ['guard', 'riposte', 'oathdr', 'evade']) if (h.s[k]) { h.s[k] = 0; ev('status', { u: h.id, k, on: 0 }); ev('text', { u: h.id, s: '架勢被扯掉', c: '#ff6a5a' }); }
    // 反擊
    if (mv.melee && !u.dead && !h.down && !h.s.aloft) {
      if (h.s.riposte) { ev('counter', { u: h.id, tgt: u.id }); hit(h, u, { mult: 1.0, kind: 'counter', melee: true }); if (!u.dead && T(h, 'w7b')) delayU(h, u, 15); }
      else if (h.s.guard && M(h, 'O1')) { ev('counter', { u: h.id, tgt: u.id }); hit(h, u, { mult: M(h, 'O1') / 100, kind: 'counter', melee: true }); }
    }
    if (u.dead) break;
  }
  if (mv.anchor && !u.dead) { B.shelter++; ev('anchor', { n: B.shelter }); }
}

// ---------- 戰後 ----------
function battleResult() {
  const r = { win: B.over === 'win', xp: B.xp, coin: B.coin, kills: B.kills.slice(), heroes: {}, items: Object.assign({}, B.items), reso: B.reso, turns: B.turns, stat: B.stat, pylons: B.pylonsAtEnd };
  for (const h of allHeroes()) r.heroes[h.hero] = { hp: h.hp, hpMax: h.hpMax, down: h.down, wounds: h.wounds || 0, mom: h.mom };
  return r;
}
