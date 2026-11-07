'use strict';
/* ====== 模擬：主迴圈、殖民者 AI、生物、戰鬥、人際 ====== */
function simAdvance(total) {
  // total: 遊戲分；切成小步
  while (total > 0) {
    const dt = Math.min(1, total);
    simStep(dt);
    total -= dt;
  }
}
function simStep(dt) {
  G.t += dt;
  const d = dayOf(G.t);
  if (d !== G.day) { G.day = d; onNewDay(); }
  if (G.dirtyPath) { G.dirtyPath = false; for (const c of G.colonists) if (c.path && !c.task?.cmdKeep) c.repath = true; for (const b of G.beasts) b.repath = true; }
  for (const b of G.buildings) { b.busy = false; b.firing = false; }
  powerStep(dt);
  podStep(dt);
  if (G.weather && G.t >= G.weather.until) endWeather();
  for (const c of G.colonists) if (!c.dead && !c.away) colonistStep(c, dt);
  for (const b of G.beasts) beastStep(b, dt);
  if (G.beasts.some(b => b.dead)) G.beasts = G.beasts.filter(b => !b.dead);
  turretStep(dt);
  if (G.pet) petStep(dt);
  G._a10 = (G._a10 || 0) + dt; G._a60 = (G._a60 || 0) + dt;
  if (G._a10 >= 10) { G._a10 -= 10; every10(); }
  if (G._a60 >= 60) { G._a60 -= 60; every60(); }
  if (typeof storyStep === 'function') storyStep(dt);
}
function onNewDay() {
  log(`第 ${G.day} 日。`, 'quiet');
  if (G.day > G.scanDay) G.freeScan = true;
  for (const c of awake()) if (!c.leader && c.traits.includes('野心家') && !c.mems.some(m => m.id === 'valued')) trust(c, -1.5);
}
function every10() {
  socialStep();
  // 節點再生
  for (const n of G.world.nodes) if (n.type === 'bush' && n.amt <= 0 && G.t >= (n.regrowAt || 0)) { n.amt = 1; }
}
function every60() {
  for (const c of G.colonists) {
    if (c.dead) continue;
    c.mems = c.mems.filter(m => m.until > G.t);
    calcMood(c);
    if (c.away) continue;
    // 精神崩潰
    if (!c.leader && !c.brk) {
      if (c.mood < 16) c.lowFor += 60; else c.lowFor = Math.max(0, c.lowFor - 60);
      if (c.lowFor >= 180) startBreak(c);
    }
    if (c.brk && (G.t > c.brk.until || c.mood > 40)) { log(`${c.name} 冷靜下來了。`, 'quiet'); c.brk = null; c.lowFor = 0; if (c.task && c.task.kind === 'break') c.task = null; }
    if (!c.leader) {
      if (c.mood < 25) trust(c, -0.25);
      else if (c.mood > 75) trust(c, 0.12);
    }
    if (G.t - c.thoughtAt > 100 + R() * 120) pickThought(c);
  }
  // 人際：沒有互動就慢慢淡掉（強烈的羈絆不受影響）
  for (const k in G.rel) { const v = G.rel[k]; if (Math.abs(v) < 85 && Math.abs(v) > 3) G.rel[k] = Math.round((v - Math.sign(v) * 0.07) * 10) / 10; }
  // 艙體受損：冬眠艙風險
  const h = hull();
  if (h && h.hp < h.hpMax * 0.3 && R() < 0.1) podFail('後段艙嚴重受損');
  // 火災煙霧逐漸消失
  if (typeof eventsHourly === 'function') eventsHourly();
}

/* ---------- 殖民者 ---------- */
function speedMul(c) {
  let m = 1;
  if (c.sick) m *= 0.65;
  if (c.hp < c.hpMax * 0.5) m *= 0.75;
  if (c.carry) m *= 0.9;
  if (c.food <= 0) m *= 0.8;
  if (c.brk && c.brk.type === 'strike') m *= 0.6;
  return m;
}
function workRate(c, skill) {
  let r = 0.55 + (c.sk[skill] || 0) * 0.11;
  if (c.traits.includes('勤勞')) r *= 1.15;
  if (c.traits.includes('懶散')) r *= 0.85;
  if (c.traits.includes('強壯') && (skill === 'build' || skill === 'gather')) r *= 1.1;
  if (c.traits.includes('體弱') && (skill === 'build' || skill === 'gather')) r *= 0.85;
  if (c.traits.includes('好奇') && skill === 'research') r *= 1.15;
  if (c.mood < 25) r *= 0.8; else if (c.mood > 75) r *= 1.1;
  if (isNight() && !c.traits.includes('夜貓子')) r *= 0.92;
  if (G.buffs.work > G.t) r *= 1.12;
  if (G.weather && G.weather.type === 'storm' && !G.weather.indoor) r *= 0.7;
  if (c.sick) r *= 0.5;
  return r;
}
function gainXp(c, k, dt) {
  c.xp[k] = (c.xp[k] || 0) + dt * (c.traits.includes('學得快') ? 2 : 1);
  const need = 260 * (c.sk[k] + 1);
  if (c.xp[k] >= need && c.sk[k] < 10) {
    c.xp[k] = 0; c.sk[k]++;
    if (typeof fxText === 'function') fxText(c.x, c.y - 0.4, SKILLS[k] + ' ↑' + c.sk[k], '#9ff5ff');
    log(`${c.name} 的${SKILLS[k]}提升到 ${c.sk[k]}。`, c.sk[k] >= 8 ? 'good' : 'quiet');
  }
}
function colonistStep(c, dt) {
  const t = c.task;
  const sleeping = t && t.kind === 'sleep' && t.phase === 'sleep';
  const resting = t && (t.kind === 'rest') && t.phase === 'rest';
  // 需求
  c.food = Math.max(0, c.food - dt * 100 / 840 * (sleeping ? 0.45 : 1));
  if (sleeping) c.rest = Math.min(100, c.rest + dt * (c.traits.includes('失眠') ? 0.17 : 0.24) * (t.ground ? 0.8 : 1));
  else if (resting) c.rest = Math.min(100, c.rest + dt * 0.08);
  else c.rest = Math.max(0, c.rest - dt * (c.traits.includes('懶散') ? 0.072 : 0.092));
  if (c.food <= 0 && !c.leader) c.hp -= dt / 150;
  // 生命
  if (c.downed) {
    if (c.lie) c.hp = Math.min(c.hpMax, c.hp + dt * (inMed(c) ? 0.12 : 0.05) * (G.tech.done.trauma ? 1.5 : 1));
    else if (!c.carriedBy && !G.tech.done.trauma && !c.leader) c.hp -= dt / 70;
    if (c.hp <= 0) { if (c.leader) c.hp = 1; else { die(c, '失血'); return; } }
    if (c.lie && c.hp >= c.hpMax * 0.45) {
      c.downed = false; const b = bById(c.lie); c.lie = 0; c.inside = 0;
      if (b) { const a = accessTiles(b); if (a.length) { const s = R.pick(a); c.x = s[0] + .5; c.y = s[1] + .5; } }
      log(`${c.name} 恢復意識，可以下床了。`, 'good');
    }
    c.moving = false;
    return;
  }
  if (c.hp < c.hpMax) c.hp = Math.min(c.hpMax, c.hp + dt / 60 * (sleeping || resting ? 3 : 1) * (inMed(c) ? 2 : 1));
  if (c.sick && G.t >= c.sick) { c.sick = 0; c.sickLabel = ''; }
  // 決策
  if (!c.task || G.t >= c.thinkAt) think(c);
  if (c.task) runTask(c, dt);
}
function inMed(c) { const b = c.lie ? bById(c.lie) : (c.inside ? bById(c.inside) : null); return b && b.type === 'medbay'; }
function isFighter(c) { return c.job === 'guard' || c.leader; }
function hostileNear(x, y, r) {
  let best = null, bd = r;
  for (const b of G.beasts) {
    if (b.dead || !b.hostile) continue;
    const d = dist(b.x, b.y, x, y);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}
function setTask(c, task) {
  if (c.task) endTask(c, true);
  if (c.inside && !['sleep', 'rest', 'flee'].includes(task.kind)) exitBuilding(c);
  task.phase = task.phase || 'go';
  task.t0 = G.t;
  c.task = task; c.path = null; c.pi = 0; c.working = false;
}
function endTask(c, replacing) {
  const t = c.task;
  if (!t) return;
  if (t.nid) { const n = nodeById(t.nid); if (n && n.by === c.id) n.by = 0; }
  if (t.kind === 'rescue' && t.pid) { const p = byId(t.pid); if (p && p.carriedBy === c.id) { p.carriedBy = 0; } }
  if (t.kind === 'talk' && t.pid) { const p = byId(t.pid); if (p) p.waitFor = 0; }
  if (c.carry) { /* 手上的東西直接入庫，避免遺失 */ G.res[c.carry.res] = (G.res[c.carry.res] || 0) + c.carry.amt; if (c.carry.bonus) G.res[c.carry.bonus.res] += c.carry.bonus.amt; c.carry = null; }
  c.task = null; c.path = null; c.working = false;
  if (!replacing) c.thinkAt = G.t;
}
function finish(c) {
  const t = c.task;
  if (t && t.kind === 'harvest' && c.carry) { G.res[c.carry.res] += c.carry.amt; c.carry = null; }
  if (c.inside) { exitBuilding(c); }
  endTask(c);
}
function exitBuilding(c) {
  const b = bById(c.inside); c.inside = 0; c.hidden = false;
  if (b) { const a = accessTiles(b); if (a.length) { const s = a.reduce((best, p) => dist(p[0], p[1], c.x, c.y) < dist(best[0], best[1], c.x, c.y) ? p : best, a[0]); c.x = s[0] + .5; c.y = s[1] + .5; } }
}

function think(c) {
  c.thinkAt = G.t + 8 + R() * 8;
  const t = c.task;
  if (t && t.cmd) return;                          // 艦長的直接命令
  if (c.waitFor && c.waitFor > G.t) { if (!t || t.kind !== 'wait') setTask(c, { kind: 'wait', until: c.waitFor, soft: true }); return; }
  const tideNight = G.tide.phase === 'active';
  // 危險
  const danger = hostileNear(c.x, c.y, tideNight ? 9 : 7);
  // 躲在建築裡的非戰鬥人員：外面有危險就繼續待著
  if (c.inside && !isFighter(c) && (danger || tideNight)) { if (!t || !['sleep', 'rest', 'flee'].includes(t.kind)) setTask(c, { kind: 'flee' }); if (c.task.kind === 'flee') { c.hidden = true; } return; }
  if (t && t.kind === 'flee' && t.storm) { if (G.weather && G.weather.indoor) return; }
  if (isFighter(c) && !c.sick) {
    if (danger) { if (!t || t.kind !== 'fight') setTask(c, { kind: 'fight', tid: danger.id }); return; }
    if (tideNight && !c.leader && (!t || (t.kind !== 'fight' && t.kind !== 'patrol'))) { const tt = hostileNear(c.x, c.y, 16); if (tt) { setTask(c, { kind: 'fight', tid: tt.id }); return; } }
  } else {
    if (danger || (tideNight && !c.leader)) { if (!t || t.kind !== 'flee') setTask(c, { kind: 'flee' }); return; }
  }
  if (t && t.kind === 'fight') { if (!danger && !(tideNight && hostileNear(c.x, c.y, 16))) endTask(c, true); else return; }
  if (t && t.kind === 'flee') { if (c.hidden && (hostileNear(hull().x + 2.5, hull().y + 1.5, 13) || tideNight)) return; if (c.hidden) exitBuilding(c); endTask(c, true); }
  if (t && !t.soft) {
    // 正在工作：檢查是不是該吃飯睡覺
    if (t.kind === 'sleep' || t.kind === 'eat' || t.kind === 'rescue' || t.kind === 'rest') return;
    if (c.food < 18 || c.rest < 12) endTask(c, true); else return;
  }
  // 救人
  const down = G.colonists.find(o => o !== c && o.downed && !o.dead && !o.away && !o.lie && !o.carriedBy && !G.colonists.some(x => x.task && x.task.kind === 'rescue' && x.task.pid === o.id));
  if (down && !c.sick && !hostileNear(down.x, down.y, 5)) { setTask(c, { kind: 'rescue', pid: down.id }); return; }
  // 吃
  if (c.food < 32 && G.res.food >= 1 && G.t - c.eatAt > 120) { setTask(c, { kind: 'eat' }); return; }
  // 睡
  const hh = hourOf(G.t);
  const sleepy = c.rest < 20 || ((hh >= 22 || hh < 5) && c.rest < 75 && !(c.traits.includes('夜貓子') && hh >= 22 && c.rest > 40));
  if (sleepy && c.food < 55 && G.res.food >= 1 && G.t - c.eatAt > 90) { setTask(c, { kind: 'eat' }); return; }
  if (sleepy) { setTask(c, { kind: 'sleep' }); return; }
  // 生病
  if (c.sick && c.sick - G.t > 120) { setTask(c, { kind: 'rest' }); return; }
  // 沙暴待在室內
  if (G.weather && G.weather.type === 'storm' && G.weather.indoor) { setTask(c, { kind: 'flee', storm: true }); return; }
  // 崩潰
  if (c.brk) { if (!t || t.kind !== 'break') setTask(c, { kind: 'break', soft: true }); return; }
  if (c.offUntil > G.t) { setTask(c, { kind: 'leisure', soft: true }); return; }
  // 工作
  const w = findWork(c);
  if (w) { if (!t || t.kind !== w.kind || t.bid !== w.bid || t.nid !== w.nid) setTask(c, w); return; }
  if (t && t.soft && G.t - t.t0 < 60) return;
  setTask(c, R() < 0.6 ? { kind: 'leisure', soft: true } : { kind: 'wander', soft: true });
}

/* 找工作 */
function slotsUsed(b, kind = 'work') { return G.colonists.filter(o => o.task && o.task.bid === b.id && o.task.kind === kind && !o.dead).length; }
function powered(b) { return G.power.ok && b.active && !(G.tide.blackout && b.type !== 'turret'); }
function findWork(c) {
  const order = [c.job];
  for (const j of ['build', 'gather']) if (!order.includes(j)) order.push(j);
  for (const j of order) {
    const w = workFor(c, j, j !== c.job);
    if (w) return w;
  }
  return null;
}
function workFor(c, job, fallback) {
  const hx = c.x, hy = c.y;
  const nearest = (list, fx) => { let best = null, bd = 1e9; for (const o of list) { const d = fx(o); if (d < bd) { bd = d; best = o; } } return best; };
  switch (job) {
    case 'build': {
      const sites = G.buildings.filter(b => !b.done && slotsUsed(b, 'build') < (fallback ? 2 : 3) && !(c.skip && c.skip[b.id] > G.t));
      const b = nearest(sites, b => dist(b.x + b.w / 2, b.y + b.h / 2, hx, hy));
      if (b) return { kind: 'build', bid: b.id };
      if (G.tide.phase === 'active') return null;
      const dmg = G.buildings.filter(b => b.done && b.hp < b.hpMax * (b.type === 'hull' ? 0.95 : 0.8) && slotsUsed(b, 'repair') < (b.type === 'hull' ? 3 : 1) && !(c.skip && c.skip[b.id] > G.t) && !hostileNear(b.x + b.w / 2, b.y + b.h / 2, 7));
      const r = dmg.find(b => b.type === 'hull') || nearest(dmg, b => dist(b.x, b.y, hx, hy));
      return r ? { kind: 'repair', bid: r.id } : null;
    }
    case 'gather': {
      const n = pickHarvest(c, fallback);
      return n ? { kind: 'harvest', nid: n.id } : null;
    }
    case 'farm': {
      const g = nearest(G.buildings.filter(b => b.type === 'greenhouse' && b.done && b.active && slotsUsed(b) < BUILD.greenhouse.slots), b => dist(b.x, b.y, hx, hy));
      return g ? { kind: 'work', what: 'farm', bid: g.id, work: true } : null;
    }
    case 'craft': {
      const p = G.pods.find(p => p.repairQ && p.status === 'sleep' && !G.colonists.some(o => o.task && o.task.pod === p.id));
      if (p) return { kind: 'work', what: 'repair', bid: hull().id, pod: p.id, work: true };
      const ws = G.buildings.filter(b => b.type === 'workshop' && b.done && b.active && slotsUsed(b) < 2);
      if (!ws.length) return null;
      const canRifle = G.rifleQ > 0 && G.res.metal >= 8 && G.res.comp >= 3;
      const canComp = G.compOn && G.res.metal >= 24 && G.res.comp < (G.compCap || 40);
      if (!canRifle && !canComp) return null;
      const b = nearest(ws, b => dist(b.x, b.y, hx, hy));
      return { kind: 'work', what: 'craft', bid: b.id, work: true };
    }
    case 'research': {
      const rs = G.buildings.filter(b => b.type === 'research' && b.done && b.active && slotsUsed(b) < 2);
      if (!rs.length) return null;
      const decrypting = c.key === 'shen' && G.flags.blackbox && !G.flags.decrypted && G.tide.done;
      if (!decrypting && !G.tech.cur && !TECH_ORDER.some(techAvailable) && G.res.data > 60) return null;
      const b = nearest(rs, b => dist(b.x, b.y, hx, hy));
      if (c.key === 'shen' && G.flags.blackbox && !G.flags.decrypted && G.tide.done && !G.colonists.some(o => o !== c && o.task && o.task.what === 'decrypt'))
        return { kind: 'work', what: 'decrypt', bid: b.id, work: true };
      return { kind: 'work', what: 'research', bid: b.id, work: true };
    }
    case 'medic': {
      const pat = G.colonists.find(o => !o.dead && !o.away && o !== c && ((o.downed && o.lie) || (!o.downed && o.hp < o.hpMax * 0.6)) && (!o.tendedAt || G.t - o.tendedAt > 180) && !G.colonists.some(x => x.task && x.task.kind === 'treat' && x.task.pid === o.id));
      if (pat) return { kind: 'treat', pid: pat.id, work: true };
      const mb = G.buildings.find(b => b.type === 'medbay' && b.done && b.active && slotsUsed(b) < 1);
      if (mb && G.res.med < 12 && G.res.fiber >= 3) return { kind: 'work', what: 'medmake', bid: mb.id, work: true };
      return null;
    }
    case 'guard': {
      if (isNight() || G.tide.phase === 'warn' && hourOf(G.t) > 16) return { kind: 'patrol', soft: true, work: true };
      return null;
    }
  }
  return null;
}
function needWeights() {
  const pop = Math.max(1, awake().length);
  const r = G.res;
  return {
    food: clamp(1.6 - r.food / (pop * 5), 0.35, 2.2),
    metal: clamp(1.4 - r.metal / 60, 0.2, 1.6),
    fiber: clamp(1.3 - r.fiber / 40, 0.2, 1.5),
    comp: clamp(1.3 - r.comp / 25, 0.25, 1.5),
    data: G.flags.crystalSample ? 0.12 : 0.3,
  };
}
function pickHarvest(c, fallback) {
  const h = hull();
  const hx = h.x + 2.5, hy = h.y + 1.5;
  const ok = n => {
    const d = NODE[n.type];
    if (!d.res || n.by || (c.skip && c.skip[n.id] > G.t)) return false;
    if (n.type === 'bush' && n.amt <= 0) return false;
    if (!explored(n.x, n.y)) return false;
    if (hostileNear(n.x, n.y, 6)) return false;
    return true;
  };
  const marked = G.world.nodes.filter(n => n.marked && ok(n));
  if (marked.length) return marked.reduce((a, b) => dist(a.x, a.y, c.x, c.y) < dist(b.x, b.y, c.x, c.y) ? a : b);
  const w = needWeights();
  const lim = fallback ? 18 : 28;
  let best = null, bs = -1;
  for (const n of G.world.nodes) {
    if (!ok(n)) continue;
    const dh = dist(n.x, n.y, hx, hy);
    if (dh > lim) continue;
    const d = NODE[n.type];
    if (d.res === 'data' && !G.story.done.study) continue;
    let s = (w[d.res] || 0.2) * (d.bonus && d.bonus.comp ? 1 + d.bonus.comp : 1) / (3 + dist(n.x, n.y, c.x, c.y) * 0.6 + dh * 0.15);
    if (s > bs) { bs = s; best = n; }
  }
  if (fallback && bs < 0.02) return null;
  return best;
}
function nearestStore(x, y) {
  let best = null, bd = 1e9;
  for (const b of G.buildings) {
    if (!b.done || !BUILD[b.type].store) continue;
    const d = dist(b.x + b.w / 2, b.y + b.h / 2, x, y);
    if (d < bd) { bd = d; best = b; }
  }
  return best || hull();
}

/* 路徑 */
function pathTo(c, goals) {
  if (!goals || !goals.length) return null;
  const p = findPath(c.x, c.y, goals);
  if (!p) return null;
  c.path = p; c.pi = 1; c.repath = false;
  return p;
}
function followPath(c, dt) {
  if (!c.path) return true;
  if (c.pi >= c.path.length) { c.moving = false; return true; }
  const [tx, ty] = c.path[c.pi];
  if (!passable(tx, ty) && c.pi < c.path.length - 1) { c.path = null; c.repath = true; return false; }
  const gx = tx + .5, gy = ty + .5;
  const dx = gx - c.x, dy = gy - c.y, d = Math.hypot(dx, dy);
  const cost = TERRAIN[G.world.ter[idx(clamp(Math.floor(c.x), 0, N - 1), clamp(Math.floor(c.y), 0, N - 1))]].walk;
  const step = K.WALK * speedMul(c) / Math.min(cost, 2.6) * dt;
  c.moving = true; c.walk += step * 2.6;
  if (d > 0.001) { c.dx = dx / d; c.dy = dy / d; }
  if (d <= step) { c.x = gx; c.y = gy; c.pi++; if (c.pi >= c.path.length) { c.moving = false; return true; } }
  else { c.x += dx / d * step; c.y += dy / d * step; }
  return false;
}
// 走向目標（若 path 不存在就計算），抵達回傳 true；無法抵達回傳 null
function go(c, goalsFn, dt) {
  if (!c.path || c.repath) {
    const goals = goalsFn();
    const fx = Math.floor(c.x), fy = Math.floor(c.y);
    if (goals.some(([x, y]) => x === fx && y === fy)) { c.path = null; c.moving = false; return true; }
    if (!pathTo(c, goals)) return null;
  }
  return followPath(c, dt);
}
function failTask(c, objId) {
  c.skip = c.skip || {};
  if (objId) c.skip[objId] = G.t + 240;
  endTask(c);
}

/* 執行任務 */
function runTask(c, dt) {
  const t = c.task;
  c.working = false;
  switch (t.kind) {
    case 'build': {
      const b = bById(t.bid);
      if (!b || b.done) return endTask(c);
      if (t.phase === 'go') { const r = go(c, () => accessTiles(b), dt); if (r === null) return failTask(c, b.id); if (r) t.phase = 'work'; return; }
      faceTo(c, b.x + b.w / 2, b.y + b.h / 2);
      c.working = 'hammer';
      const d = BUILD[b.type];
      b.work += workRate(c, 'build') * dt;
      b.prog = Math.min(1, b.work / d.work);
      b.hp = Math.max(b.hp, Math.round(b.hpMax * (0.15 + 0.85 * b.prog)));
      gainXp(c, 'build', dt);
      if (R() < dt * 0.18 && typeof fxSpark === 'function') fxSpark(b.x + b.w / 2 + (R() - .5) * b.w * .6, b.y + b.h / 2 + (R() - .5) * b.h * .6);
      if (typeof SFX !== 'undefined' && R() < dt * 0.05) SFX.hammer(c);
      if (b.work >= d.work) { completeBuilding(b); endTask(c); }
      return;
    }
    case 'repair': {
      const b = bById(t.bid);
      if (!b || !b.done || b.hp >= b.hpMax) return endTask(c);
      if (t.phase === 'go') { const r = go(c, () => accessTiles(b), dt); if (r === null) return failTask(c, b.id); if (r) t.phase = 'work'; return; }
      faceTo(c, b.x + b.w / 2, b.y + b.h / 2);
      c.working = 'hammer';
      b.hp = Math.min(b.hpMax, b.hp + workRate(c, 'build') * dt * Math.max(1.2, b.hpMax / 140));
      gainXp(c, 'build', dt * 0.5);
      if (R() < dt * 0.15 && typeof fxSpark === 'function') fxSpark(b.x + b.w / 2 + (R() - .5) * b.w * .6, b.y + b.h / 2 + (R() - .5) * b.h * .6);
      if (b.hp >= b.hpMax) { endTask(c); if (b.type === 'hull') log('後段艙修補完成。', 'good'); }
      return;
    }
    case 'harvest': {
      const n = nodeById(t.nid);
      if (t.phase === 'go') {
        if (!n || (n.type === 'bush' && n.amt <= 0)) return endTask(c);
        if (n.by && n.by !== c.id) return endTask(c);
        n.by = c.id;
        const r = go(c, () => { const a = accessTiles({ x: n.x, y: n.y, w: 1, h: 1 }); if (!NODE[n.type].block) a.push([n.x, n.y]); return a; }, dt);
        if (r === null) return failTask(c, n.id);
        if (r) { t.phase = 'work'; t.prog = 0; }
        return;
      }
      if (t.phase === 'work') {
        if (!n) return endTask(c);
        faceTo(c, n.x + .5, n.y + .5);
        c.working = n.type === 'bush' ? 'pick' : n.type === 'tree' ? 'chop' : 'pickaxe';
        t.prog += workRate(c, 'gather') * dt;
        gainXp(c, 'gather', dt);
        if (R() < dt * 0.1 && typeof fxDust === 'function') fxDust(n.x + .5, n.y + .5, n.type);
        if (typeof SFX !== 'undefined' && R() < dt * 0.06) SFX.gather(c, n.type);
        const d = NODE[n.type];
        if (t.prog >= d.work) {
          let amt = d.yield + (c.sk.gather >= 7 ? 1 : 0);
          c.carry = { res: d.res, amt };
          if (d.bonus) for (const k in d.bonus) if (R() < d.bonus[k] || d.bonus[k] >= 1) c.carry.bonus = { res: k, amt: d.bonus[k] >= 1 ? d.bonus[k] * 2 : 2 };
          n.amt--;
          n.by = 0;
          G.stats.harvested[d.res] = (G.stats.harvested[d.res] || 0) + amt;
          if (n.type === 'crystal' && !G.flags.crystalSample) { G.flags.crystalSample = 1; log('取得了晶簇樣本。', 'good'); }
          if (n.type === 'bush') { n.regrowAt = G.t + NODE.bush.regrow; if (n.amt <= 0) n.amt = 0; }
          else if (n.amt <= 0) removeNode(n);
          n.marked = n.amt > 0 && n.marked;
          t.phase = 'haul'; c.path = null;
          if (G.story.track) G.story.track[d.res] = (G.story.track[d.res] || 0) + amt;
        }
        return;
      }
      if (t.phase === 'haul') {
        const s = nearestStore(c.x, c.y);
        const r = go(c, () => accessTiles(s), dt);
        if (r === null) { if (c.carry) { G.res[c.carry.res] += c.carry.amt; c.carry = null; } return endTask(c); }
        if (r) {
          if (c.carry) {
            G.res[c.carry.res] = (G.res[c.carry.res] || 0) + c.carry.amt;
            if (typeof fxText === 'function') fxText(c.x, c.y - .3, '+' + c.carry.amt + ' ' + RES[c.carry.res].name, RES[c.carry.res].color);
            const bn = c.carry.bonus;
            if (bn) { G.res[bn.res] += bn.amt; const px = c.x, py = c.y; if (typeof fxText === 'function') setTimeout(() => fxText(px, py - .3, '+' + bn.amt + ' ' + RES[bn.res].name, RES[bn.res].color), 350); }
            if (typeof SFX !== 'undefined') SFX.deposit();
            c.carry = null;
          }
          endTask(c);
        }
      }
      return;
    }
    case 'work': {
      const b = bById(t.bid);
      if (!b || !b.done) return endTask(c);
      if (t.phase === 'go') { const r = go(c, () => accessTiles(b), dt); if (r === null) return failTask(c, b.id); if (r) t.phase = 'work'; return; }
      faceTo(c, b.x + b.w / 2, b.y + b.h / 2);
      if (G.t - t.t0 > 200 || c.food < 22 || c.rest < 16) return endTask(c);
      const pw = b.type === 'hull' ? true : powered(b);
      const rate = workRate(c, { farm: 'farm', craft: 'craft', research: 'research', medmake: 'medic', decrypt: 'research', repair: 'craft' }[t.what]) * (pw ? 1 : 0.25);
      b.busy = true; c.working = t.what === 'farm' ? 'pick' : 'type';
      switch (t.what) {
        case 'farm': {
          if (!b.active) return endTask(c);
          const dark = G.flags.ghDark > G.t;
          b.grow += dt * (0.1 + c.sk.farm * 0.022) * (pw ? 1 : 0.25) * (dark ? 0.5 : 1);
          gainXp(c, 'farm', dt);
          if (b.grow >= 100) {
            b.grow = 0;
            const amt = Math.round(8 * (G.tech.done.hydro ? 1.4 : 1) * (C('chengwei') ? 1.15 : 1));
            G.res.food += amt; G.stats.harvested.food = (G.stats.harvested.food || 0) + amt;
            if (G.story.track) G.story.track.food = (G.story.track.food || 0) + amt;
            if (typeof fxText === 'function') fxText(b.x + b.w / 2, b.y + b.h / 2, '+' + amt + ' 食物', RES.food.color);
            if (typeof SFX !== 'undefined') SFX.deposit();
          }
          break;
        }
        case 'craft': {
          if (!t.item) {
            if (G.rifleQ > 0 && G.res.metal >= 8 && G.res.comp >= 3) { G.res.metal -= 8; G.res.comp -= 3; G.rifleQ--; t.item = 'rifle'; t.p = 0; }
            else if (G.compOn && G.res.metal >= 24 && G.res.comp < (G.compCap || 40)) { G.res.metal -= 4; t.item = 'comp'; t.p = 0; }
            else return endTask(c);
          }
          t.p += rate * dt; gainXp(c, 'craft', dt);
          if (R() < dt * 0.15 && typeof fxSpark === 'function') fxSpark(b.x + b.w / 2, b.y + b.h / 2);
          const need = t.item === 'rifle' ? 90 : 34;
          if (t.p >= need) {
            if (t.item === 'rifle') { G.rifles++; log('工坊造好了一把步槍。', 'good'); armGuards(); }
            else { G.res.comp++; if (typeof fxText === 'function') fxText(b.x + b.w / 2, b.y + b.h / 2, '+1 零件', RES.comp.color); }
            t.item = null;
          }
          break;
        }
        case 'research': {
          G.res.data += rate * dt * 0.085;
          gainXp(c, 'research', dt);
          applyResearch();
          break;
        }
        case 'decrypt': {
          G.flags.decryptProg = (G.flags.decryptProg || 0) + rate * dt;
          gainXp(c, 'research', dt);
          if (G.flags.decryptProg >= 300) { G.flags.decrypted = 'shen'; endTask(c); if (typeof onDecrypted === 'function') onDecrypted('shen'); }
          break;
        }
        case 'medmake': {
          if (!t.item) { if (G.res.fiber >= 3 && G.res.med < 12) { G.res.fiber -= 3; t.item = 'med'; t.p = 0; } else return endTask(c); }
          t.p += rate * dt; gainXp(c, 'medic', dt);
          if (t.p >= 50) { G.res.med++; t.item = null; if (typeof fxText === 'function') fxText(b.x + 1, b.y + 1, '+1 藥品', RES.med.color); }
          break;
        }
        case 'repair': {
          const p = podById(t.pod);
          if (!p || !p.repairQ || p.status !== 'sleep') return endTask(c);
          p.repair += rate * dt; gainXp(c, 'craft', dt);
          if (p.repair >= 60) { p.dmg = false; p.repairQ = false; p.left = 0; log(`冬眠艙 ${p.label} 修好了。`, 'good'); endTask(c); }
          break;
        }
      }
      return;
    }
    case 'eat': {
      const target = G.buildings.find(b => b.type === 'mess' && b.done && slotsUsed(b, 'eat') < BUILD.mess.seats) || nearestStore(c.x, c.y);
      if (t.phase === 'go') { t.bid = target.id; const r = go(c, () => accessTiles(target), dt); if (r === null) { t.phase = 'eat'; t.e0 = G.t; return; } if (r) { t.phase = 'eat'; t.e0 = G.t; } return; }
      c.working = 'eat';
      if (G.t - t.e0 >= 22) {
        if (G.res.food >= 1) {
          let use = 1;
          if (G.flags.zhouStore && R() < 0.06) use = 0;
          G.res.food -= use;
          if (c.key === 'zhou' && G.flags.zhouSteal !== 0 && R() < 0.12 * (G.flags.zhouSteal == null ? 1 : G.flags.zhouSteal) && G.res.food >= 1) G.res.food -= 1;
          c.food = Math.min(100, c.food + 62);
          const b = bById(t.bid);
          if (b && b.type === 'mess') mem(c, 'meal', c.traits.includes('美食家') ? 9 : 5, 8 * 60, C('ramon') ? '吃了雷蒙煮的熱食' : '在食堂吃了熱騰騰的一餐');
          else mem(c, 'meal', c.traits.includes('美食家') ? -3 : 0, 6 * 60, '站在殘骸邊啃口糧');
        } else mem(c, 'nofood', -12, 6 * 60, '沒東西吃');
        c.eatAt = G.t;
        endTask(c);
      }
      return;
    }
    case 'sleep': {
      if (t.phase === 'go') {
        const bed = c.bed && bById(c.bed);
        if (bed && bed.done) {
          const r = go(c, () => accessTiles(bed), dt);
          if (r === null) { t.phase = 'sleep'; t.ground = true; return; }
          if (r) { t.phase = 'sleep'; c.inside = bed.id; c.hidden = true; }
        } else {
          const h = hull();
          if (!t.spot) { const a = []; for (let y = h.y - 3; y <= h.y + h.h + 2; y++) for (let x = h.x - 3; x <= h.x + h.w + 2; x++) if (passable(x, y) && !bAt(x, y)) a.push([x, y]); t.spot = a.length ? R.pick(a) : [Math.floor(c.x), Math.floor(c.y)]; }
          const r = go(c, () => [t.spot], dt);
          if (r === null || r) { t.phase = 'sleep'; t.ground = true; }
        }
        return;
      }
      if (t.ground) mem(c, 'ground', -6, 12 * 60, '睡在泥地上');
      else mem(c, 'bedsleep', 2, 10 * 60, '睡在宿舍的床上');
      c.working = 'sleep';
      const hh = hourOf(G.t);
      const morning = hh >= 5.5 && hh < 21;
      if ((c.rest >= 98 && (morning || c.traits.includes('夜貓子'))) || (c.rest >= 60 && hh >= 6.5 && hh < 21)) { if (c.inside) exitBuilding(c); endTask(c); }
      return;
    }
    case 'rest': {
      if (t.phase === 'go') {
        const mb = G.buildings.find(b => b.type === 'medbay' && b.done);
        const bed = mb || (c.bed && bById(c.bed));
        if (bed) { const r = go(c, () => accessTiles(bed), dt); if (r === null || r) { t.phase = 'rest'; if (r) { c.inside = bed.id; c.hidden = true; } } }
        else t.phase = 'rest';
        return;
      }
      c.working = 'sleep';
      if (!c.sick || c.sick <= G.t || c.food < 20) { if (c.inside) exitBuilding(c); endTask(c); }
      return;
    }
    case 'rescue': {
      const p = byId(t.pid);
      if (!p || p.dead || !p.downed || p.lie) return endTask(c);
      if (t.phase === 'go') {
        const r = go(c, () => [[Math.floor(p.x), Math.floor(p.y)], ...accessTiles({ x: Math.floor(p.x), y: Math.floor(p.y), w: 1, h: 1 })], dt);
        if (r === null) return failTask(c);
        if (r) { p.carriedBy = c.id; t.phase = 'carry'; c.path = null; }
        return;
      }
      const dest = G.buildings.find(b => b.type === 'medbay' && b.done && G.colonists.filter(o => o.lie === b.id).length < BUILD.medbay.beds)
        || (p.bed && bById(p.bed)) || G.buildings.find(b => b.type === 'dorm' && b.done) || hull();
      const r = go(c, () => accessTiles(dest), dt);
      p.x = c.x; p.y = c.y - 0.05;
      if (r === null) { p.carriedBy = 0; return endTask(c); }
      if (r) { p.carriedBy = 0; p.lie = dest.id; p.inside = dest.id; p.hidden = true; log(`${c.name} 把 ${p.name} 送到了${BUILD[dest.type].name}。`, 'quiet'); opin(p, c, 10); endTask(c); }
      return;
    }
    case 'treat': {
      const p = byId(t.pid);
      if (!p || p.dead) return endTask(c);
      const at = p.inside ? bById(p.inside) : null;
      if (t.phase === 'go') {
        const r = go(c, () => at ? accessTiles(at) : [[Math.floor(p.x), Math.floor(p.y)], ...accessTiles({ x: Math.floor(p.x), y: Math.floor(p.y), w: 1, h: 1 })], dt);
        if (r === null) return failTask(c);
        if (r) { t.phase = 'treat'; t.e0 = G.t; if (!p.inside) p.waitFor = G.t + 35; }
        return;
      }
      c.working = 'type';
      if (G.t - t.e0 >= 30) {
        const useMed = G.res.med >= 1;
        if (useMed) G.res.med -= 1;
        const heal = (useMed ? 30 : 14) + c.sk.medic * 2;
        p.hp = Math.min(p.hpMax, p.hp + heal);
        if (p.sick && p.sickLabel !== '冬眠失調' && useMed) p.sick = Math.min(p.sick, G.t + 60);
        p.tendedAt = G.t; p.waitFor = 0;
        mem(p, 'tended', 4, DAY, '有人照顧我的傷');
        opin(p, c, 6);
        gainXp(c, 'medic', 30);
        if (typeof fxText === 'function') fxText(p.x, p.y - .4, '+' + heal, '#7ef0c4');
        endTask(c);
      }
      return;
    }
    case 'fight': {
      let tg = G.beasts.find(b => b.id === t.tid && !b.dead);
      if (!tg) { tg = hostileNear(c.x, c.y, 16); if (!tg) return endTask(c); t.tid = tg.id; c.path = null; }
      const range = c.weapon ? 6 : c.leader ? 5 : 1.3;
      const d = dist(tg.x, tg.y, c.x, c.y);
      if (d > range) {
        if (!c.path || c.repath || G.t - (t.pathAt || 0) > 6) { t.pathAt = G.t; pathTo(c, [[Math.floor(tg.x), Math.floor(tg.y)], ...accessTiles({ x: Math.floor(tg.x), y: Math.floor(tg.y), w: 1, h: 1 })]); }
        followPath(c, dt);
        return;
      }
      c.moving = false; faceTo(c, tg.x, tg.y);
      c.working = 'aim';
      c.fightT -= dt;
      if (c.fightT <= 0) {
        c.fightT = c.weapon ? 4 : c.leader ? 4.5 : 5;
        const hit = R() < 0.62 + c.sk.combat * 0.035 + (c.traits.includes('果斷') ? 0.08 : 0);
        let dmg = (c.weapon ? 8 + c.sk.combat * 1.4 : c.leader ? 6 + c.sk.combat : 3 + c.sk.combat * 0.6) * (G.tech.done.ballistic ? 1.25 : 1);
        if (c.traits.includes('暴躁')) dmg += 2;
        if (typeof fxShot === 'function' && (c.weapon || c.leader)) fxShot(c.x, c.y, tg.x, tg.y, hit, '#ffe08a');
        if (typeof SFX !== 'undefined') SFX.shot(c);
        if (hit) damageBeast(tg, dmg, c);
        gainXp(c, 'combat', 6);
      }
      return;
    }
    case 'flee': {
      const h = hull();
      if (c.hidden) {
        if (c.food < 30 && G.res.food >= 1 && G.t - c.eatAt > 120) { G.res.food -= 1; c.food = Math.min(100, c.food + 62); c.eatAt = G.t; mem(c, 'meal', 0, 6 * 60, '躲在艙裡啃口糧'); }
        if (c.rest < 80 && (isNight() || c.rest < 30)) { c.rest = Math.min(100, c.rest + dt * 0.16); c.working = 'sleep'; }
        return;
      }
      const r = go(c, () => accessTiles(h), dt);
      if (r === null || r) { c.inside = h.id; c.hidden = true; c.moving = false; }
      return;
    }
    case 'patrol': {
      if (!isNight() && G.tide.phase !== 'active') return endTask(c);
      if (t.phase === 'go') {
        if (!t.pt) {
          const pts = G.buildings.filter(b => b.done && (b.type === 'lamp' || b.type === 'turret' || b.type === 'greenhouse'));
          const h = hull();
          let p;
          if (pts.length && R() < 0.7) { const b = R.pick(pts); const a = accessTiles(b); p = a.length ? R.pick(a) : null; }
          if (!p) { const a = R() * TAU, rr = 5 + R() * 3; p = [Math.floor(h.x + 2.5 + Math.cos(a) * rr), Math.floor(h.y + 1.5 + Math.sin(a) * rr)]; }
          if (!p || !passable(p[0], p[1])) return endTask(c);
          t.pt = p;
        }
        const r = go(c, () => [t.pt], dt);
        if (r === null || r) { t.phase = 'watch'; t.e0 = G.t; }
        return;
      }
      c.working = 'watch';
      if (G.t - t.e0 > 30) { t.pt = null; t.phase = 'go'; c.path = null; }
      return;
    }
    case 'leisure': {
      if (t.phase === 'go') {
        if (!t.spot) {
          const mess = G.buildings.filter(b => b.type === 'mess' && b.done);
          const b = mess.length ? R.pick(mess) : hull();
          const a = accessTiles(b);
          const near = [];
          for (const [x, y] of a) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (passable(x + dx, y + dy) && !bAt(x + dx, y + dy)) near.push([x + dx, y + dy]);
          t.spot = near.length ? R.pick(near) : null;
          if (!t.spot) return endTask(c);
        }
        const r = go(c, () => [t.spot], dt);
        if (r === null || r) { t.phase = 'idle'; t.e0 = G.t; t.dur = 40 + R() * 50; }
        return;
      }
      c.working = 'idle';
      if (G.t - t.e0 > t.dur) endTask(c);
      return;
    }
    case 'wander': {
      if (t.phase === 'go') {
        if (!t.spot) {
          for (let k = 0; k < 12; k++) {
            const x = Math.floor(c.x + (R() - .5) * 10), y = Math.floor(c.y + (R() - .5) * 10);
            const h = hull();
            if (passable(x, y) && explored(x, y) && dist(x, y, h.x + 2.5, h.y + 1.5) < 14) { t.spot = [x, y]; break; }
          }
          if (!t.spot) return endTask(c);
        }
        const r = go(c, () => [t.spot], dt);
        if (r === null || r) { t.phase = 'idle'; t.e0 = G.t; t.dur = 15 + R() * 25; }
        return;
      }
      c.working = 'idle';
      if (G.t - t.e0 > t.dur) endTask(c);
      return;
    }
    case 'wait': { c.moving = false; c.working = 'idle'; if (G.t > t.until) endTask(c); return; }
    case 'break': {
      const b = c.brk;
      if (!b) return endTask(c);
      if (b.type === 'cry' || b.type === 'strike') {
        if (t.phase === 'go') {
          if (!t.spot) { const h = hull(); t.spot = [clamp(Math.floor(h.x - 2 + R() * 9), 0, N - 1), clamp(Math.floor(h.y + h.h + 1 + R() * 3), 0, N - 1)]; if (!passable(...t.spot)) t.spot = [Math.floor(c.x), Math.floor(c.y)]; }
          const r = go(c, () => [t.spot], dt); if (r === null || r) { t.phase = 'idle'; t.e0 = G.t; }
          return;
        }
        c.working = b.type === 'cry' ? 'sad' : 'idle';
        if (G.t - t.e0 > 90) { t.phase = 'go'; t.spot = null; c.path = null; }
      } else if (b.type === 'rage') {
        const tg = byId(b.target);
        if (!tg || tg.dead || tg.hidden) { c.brk.type = 'strike'; return; }
        const r = go(c, () => [[Math.floor(tg.x), Math.floor(tg.y)], ...accessTiles({ x: Math.floor(tg.x), y: Math.floor(tg.y), w: 1, h: 1 })], dt);
        if (r) { opin(tg, c, -12); opin(c, tg, -6); bubble(c, 'anger'); bubble(tg, 'anger'); log(`${c.name} 對著 ${tg.name} 大吼大叫。`, 'bad'); c.brk.type = 'strike'; c.path = null; t.phase = 'go'; t.spot = null; }
        if (r === null) c.brk.type = 'strike';
      }
      return;
    }
    case 'move': {
      const r = go(c, () => [[t.x, t.y]], dt);
      if (r === null || r) endTask(c);
      return;
    }
    case 'talk': {
      const p = byId(t.pid);
      if (!p || p.dead || p.away) return endTask(c);
      if (p.downed && !p.lie) return endTask(c);
      if (t.phase === 'go') {
        p.waitFor = G.t + 30;
        const at = p.inside ? bById(p.inside) : null;
        if (!c.path || G.t - (t.pathAt || 0) > 8) { t.pathAt = G.t; c.path = null; }
        const r = go(c, () => at ? accessTiles(at) : [[Math.floor(p.x), Math.floor(p.y)], ...accessTiles({ x: Math.floor(p.x), y: Math.floor(p.y), w: 1, h: 1 })], dt);
        if (r === null) return endTask(c);
        if (r || dist(c.x, c.y, p.x, p.y) < 1.6) { t.phase = 'talk'; t.e0 = G.t; c.path = null; c.moving = false; if (p.inside && p.task && p.task.kind === 'sleep') { exitBuilding(p); p.task = null; } if (p.task && p.task.kind !== 'wait') { endTask(p, true); } setTask(p, { kind: 'wait', until: G.t + 40, soft: true }); }
        return;
      }
      c.working = 'talk'; faceTo(c, p.x, p.y); faceTo(p, c.x, c.y);
      if (G.t - t.e0 > 0.5 && !t.bub) { t.bub = 1; bubble(c, 'talk'); setTimeout(() => bubble(p, 'talk'), 600); }
      if (G.t - t.e0 >= 30) { leaderTalk(c, p); endTask(c); }
      return;
    }
    case 'inspect': {
      const n = nodeById(t.nid);
      if (!n) return endTask(c);
      if (t.phase === 'go') { const r = go(c, () => accessTiles({ x: n.x, y: n.y, w: 1, h: 1 }), dt); if (r === null) return endTask(c); if (r) { t.phase = 'look'; t.e0 = G.t; } return; }
      faceTo(c, n.x + .5, n.y + .5); c.working = 'idle';
      if (G.t - t.e0 > 20) { endTask(c); if (typeof onInspect === 'function') onInspect(n); }
      return;
    }
  }
}
function faceTo(c, x, y) { const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy); if (d > 0.01) { c.dx = dx / d; c.dy = dy / d; } }
function armGuards() {
  for (const c of awake()) if (c.job === 'guard' && !c.weapon && G.rifles > 0) { c.weapon = true; G.rifles--; }
}

/* ---------- 研究 ---------- */
function techAvailable(id) {
  const t = TECH[id];
  if (G.tech.done[id]) return false;
  if (t.pre && !t.pre.every(p => G.tech.done[p])) return false;
  if (t.need && !G.flags[t.need]) return false;
  return true;
}
function applyResearch() {
  const id = G.tech.cur;
  if (!id) return;
  if (!techAvailable(id)) { G.tech.cur = null; return; }
  const need = TECH[id].cost - (G.tech.prog[id] || 0);
  const use = Math.min(need, G.res.data);
  if (use <= 0) return;
  G.res.data -= use;
  G.tech.prog[id] = (G.tech.prog[id] || 0) + use;
  if (G.tech.prog[id] >= TECH[id].cost - 1e-6) {
    G.tech.done[id] = true; G.tech.cur = null;
    log(`研究完成：${TECH[id].name}`, 'good');
    if (typeof SFX !== 'undefined') SFX.research();
    if (id === 'struct') for (const b of G.buildings) { b.hpMax = Math.round(b.hpMax * 1.3); b.hp = Math.round(b.hp * 1.3); }
    if (typeof onTech === 'function') onTech(id);
    // 自動接續下一個可研究項目（只在玩家沒指定時）
  }
}
function setResearch(id) { if (!techAvailable(id)) return false; G.tech.cur = id; applyResearch(); return true; }

/* ---------- 艦長的行動 ---------- */
function cmd(c, task) { task.cmd = true; setTask(c, task); }
function leaderTalk(L, p) {
  const recent = G.t - p.talkedAt < DAY;
  p.talkedAt = G.t;
  let k = (L.traits.includes('領袖') ? 1.6 : 1) * (0.6 + L.sk.social * 0.08) * (recent ? 0.35 : 1);
  const moodGain = Math.round(5 + 4 * k);
  mem(p, 'talk', moodGain, DAY, '和艦長談過');
  trust(p, 3 + 4 * k);
  opin(p, L, 4 * k); opin(L, p, 3);
  mem(p, 'valued', 0, 3 * DAY, '');
  gainXp(L, 'social', 30);
  // 調解
  const rival = G.colonists.find(o => !o.dead && o !== p && !o.leader && opinion(p, o) < -30);
  let extra = '';
  if (rival && !recent) { opin(p, rival, 12); extra = `，也聊到了${rival.name}的事`; }
  bubble(p, 'heart');
  log(`艦長和 ${p.name} 談了一會${extra}。（心情 +${moodGain}，信任上升）`, 'good');
}

/* ---------- 人際 ---------- */
function bubble(c, icon) { c.bubble = { icon, t: performance.now() }; }
function socialStep() {
  const list = G.colonists.filter(c => !c.dead && !c.away && !c.hidden && !c.downed && !c.sick);
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (dist(a.x, a.y, b.x, b.y) > 2.4) continue;
    const idleA = !a.task || ['leisure', 'eat', 'wander', 'wait'].includes(a.task.kind);
    const idleB = !b.task || ['leisure', 'eat', 'wander', 'wait'].includes(b.task.kind);
    let p = (idleA && idleB) ? 0.16 : (idleA || idleB) ? 0.07 : 0.025;
    for (const x of [a, b]) { if (x.traits.includes('話多')) p *= 1.5; if (x.traits.includes('寡言')) p *= 0.6; }
    if (a.apart === b.id) p *= 0.2;
    if (R() > p) continue;
    chat(a, b);
  }
}
function chat(a, b) {
  const comp = traitCompat(a, b);
  const md = ((a.mood + b.mood) / 2 - 50) / 25;
  let d = (R() * 6 - 2.7) + comp * 1.3 + md;
  if (d > 0) d *= clamp(1 - Math.max(opinion(a, b), opinion(b, a)) / 115, 0.15, 1);
  const before = [opinion(a, b), opinion(b, a)];
  if (d < -3.2) {
    opin(a, b, d); opin(b, a, d * 0.9);
    bubble(a, 'anger'); bubble(b, 'anger');
    if (R() < 0.35) log(`${a.name} 和 ${b.name} 起了口角。`, 'quiet');
  } else {
    const deep = d > 5.5;
    opin(a, b, d * 0.9); opin(b, a, d * 0.9);
    if (deep || R() < 0.35) { bubble(a, deep ? 'heart' : 'talk'); bubble(b, deep ? 'heart' : 'talk'); }
    mem(a, 'chat', deep ? 4 : 2, 4 * 60, deep ? '和' + b.name + '聊得很投機' : '聊了聊天');
    mem(b, 'chat', deep ? 4 : 2, 4 * 60, deep ? '和' + a.name + '聊得很投機' : '聊了聊天');
  }
  for (const [x, y, old] of [[a, b, before[0]], [b, a, before[1]]]) {
    const now = opinion(x, y);
    if (old < 35 && now >= 35 && (x.key || y.key)) log(`${x.name} 把 ${y.name} 當成朋友了。`, 'quiet');
    if (old < 70 && now >= 70) log(`${x.name} 和 ${y.name} 成了摯友。`, (x.key || y.key) ? 'good' : 'quiet');
    if (old > -35 && now <= -35) log(`${x.name} 開始看 ${y.name} 不順眼。`, 'quiet');
  }
}
function findRivals() {
  const l = awake().filter(c => !c.leader && !c.downed && !c.hidden);
  for (const a of l) for (const b of l) if (a !== b && opinion(a, b) < -28 && opinion(b, a) < -15 && a.apart !== b.id) return [a, b];
  return null;
}
function findLovers() {
  const l = awake().filter(c => !c.leader && !c.minor && !c.partner && c.age >= 20);
  for (const a of l) for (const b of l) if (a !== b && a.g !== b.g && opinion(a, b) >= 68 && opinion(b, a) >= 68 && Math.abs(a.age - b.age) < 16) return [a, b];
  return null;
}
function startBreak(c) {
  let type = 'strike';
  if (c.traits.includes('暴躁')) type = 'rage';
  else if (c.traits.includes('悲觀') || c.traits.includes('體弱') || R() < 0.35) type = 'cry';
  const rival = G.colonists.find(o => !o.dead && o !== c && opinion(c, o) < -20);
  if (type === 'rage' && !rival) type = 'strike';
  c.brk = { type, until: G.t + 300 + R() * 240, target: rival && rival.id };
  c.task = null;
  const what = { strike: '撂下工具不幹了', cry: '躲到一旁哭了起來', rage: '情緒失控了' }[type];
  log(`${c.name} ${what}。（心情崩潰）`, 'bad');
  if (typeof SFX !== 'undefined') SFX.alert();
}
function pickThought(c) {
  c.thoughtAt = G.t;
  const t = c.task;
  let sit = 'idle';
  if (G.tide.phase === 'active') sit = 'tide';
  else if (G.weather && G.weather.type === 'storm') sit = 'storm';
  else if (c.downed || c.hp < c.hpMax * 0.4) sit = 'hurt';
  else if (c.sick) sit = 'sick';
  else if (c.food < 30) sit = 'hungry';
  else if (c.rest < 25) sit = 'tired';
  else if (c.mood < 28) sit = 'low';
  else if (t && t.kind === 'sleep' && t.ground) sit = 'ground';
  else if (t && t.kind === 'fight' || t && t.kind === 'flee') sit = 'danger';
  else if (t && t.kind === 'build') sit = 'build';
  else if (t && t.kind === 'harvest') sit = 'gather';
  else if (t && t.kind === 'work') sit = { farm: 'farm', craft: 'craft', research: 'research', medmake: 'medic', decrypt: 'research', repair: 'craft' }[t.what] || 'idle';
  else if (t && t.kind === 'treat') sit = 'medic';
  else if (t && t.kind === 'patrol') sit = 'guard';
  else if (isNight()) sit = 'night';
  else if (c.mood > 72) sit = 'high';
  const own = c.key && OWN_THOUGHTS[c.key] && OWN_THOUGHTS[c.key][sit];
  const pool = (own && R() < 0.6) ? own : (THOUGHTS[sit] || THOUGHTS.idle);
  c.thought = R.pick(pool);
}

/* ---------- 生物 ---------- */
function spawnBeast(type, x, y, mode) {
  const d = BEAST[type];
  const b = { id: uid(), type, x: x + .5, y: y + .5, hp: d.hp, hpMax: d.hp, mode: mode || 'roam', hostile: mode !== 'roam', atk: 0, path: null, pi: 0, thinkAt: 0, dx: 1, dy: 0, walk: R() * 10, home: [x, y], hit: 0 };
  G.beasts.push(b);
  return b;
}
function edgeSpot(minD = 18) {
  const h = hull(); const hx = h.x + 2.5, hy = h.y + 1.5;
  for (let k = 0; k < 80; k++) {
    const side = R.int(0, 3); const p = R.int(0, N - 1);
    const x = side === 0 ? 0 : side === 1 ? N - 1 : p, y = side === 2 ? 0 : side === 3 ? N - 1 : p;
    const xx = side < 2 ? x : p, yy = side < 2 ? p : y;
    if (walkCost(xx, yy, true) > 0 && dist(xx, yy, hx, hy) > minD) return [xx, yy];
  }
  return [0, 0];
}
function spawnBeasts(type, n, near, mode = 'hunt') {
  let base = near ? [Math.floor(near.x), Math.floor(near.y)] : edgeSpot();
  if (near) { // 附近找個邊緣位置
    const a = R() * TAU; base = [clamp(Math.floor(near.x + Math.cos(a) * 9), 0, N - 1), clamp(Math.floor(near.y + Math.sin(a) * 9), 0, N - 1)];
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = clamp(base[0] + R.int(-2, 2), 0, N - 1), y = clamp(base[1] + R.int(-2, 2), 0, N - 1);
    if (walkCost(x, y, true) > 0 && !bAt(x, y)) out.push(spawnBeast(type, x, y, mode));
  }
  return out;
}
function beastTarget(b) {
  const d = BEAST[b.type];
  const h = hull();
  if (b.mode === 'roam') return null;
  // 近身的殖民者優先
  let best = null, bs = -1;
  const vis = c => !c.dead && !c.away && !c.hidden && !c.downed && !c.inside;
  for (const c of G.colonists) {
    if (!vis(c)) continue;
    const dd = dist(c.x, c.y, b.x, b.y);
    const lim = b.mode === 'hunt' ? 20 : 4;
    if (dd < lim) { const s = 10 / (dd + 1); if (s > bs) { bs = s; best = { k: 'c', id: c.id }; } }
  }
  if (b.mode === 'hunt' && best) return best;
  if (b.type === 'mother') return { k: 'b', id: h.id };
  if (b.mode === 'tide') {
    if (G.tide.blackout && b.type === 'bug' && R() < 0.7) return null;
    for (const x of G.buildings) {
      if (!x.done) continue;
      let w = 0;
      if (x.type === 'hull') w = G.tide.blackout ? 0.9 : 3;
      else if (G.tide.blackout) w = BUILD[x.type].wall ? 0 : 0.15;
      else if (x.type === 'lamp' && isNight()) w = 2.4;
      else if (x.type === 'turret') w = 1.6;
      else if (x.type === 'greenhouse') w = 1.5;
      else if (BUILD[x.type].use) w = 1;
      else if (BUILD[x.type].gen) w = 1.1;
      if (!w) continue;
      const s = w / (dist(x.x + x.w / 2, x.y + x.h / 2, b.x, b.y) + 6);
      if (s > bs) { bs = s; best = { k: 'b', id: x.id }; }
    }
    return best;
  }
  // hunt：沒看到人就打建築
  for (const x of G.buildings) {
    if (!x.done || x.type === 'hull' && b.type === 'bug') continue;
    const s = 1 / (dist(x.x + x.w / 2, x.y + x.h / 2, b.x, b.y) + 4) * (BUILD[x.type].wall ? 0.4 : 1);
    if (s > bs) { bs = s; best = { k: 'b', id: x.id }; }
  }
  return best;
}
function tgtPos(tg) {
  if (!tg) return null;
  if (tg.k === 'c') { const c = byId(tg.id); return c && !c.dead && !c.hidden && !c.away && !c.downed ? { x: c.x, y: c.y, c } : null; }
  const b = bById(tg.id); return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2, b } : null;
}
function beastStep(b, dt) {
  if (b.dead) return;
  const d = BEAST[b.type];
  b.atk -= dt; b.hit = Math.max(0, b.hit - dt);
  if (G.t >= b.thinkAt || b.repath) {
    b.thinkAt = G.t + 6 + R() * 6;
    if (b.mode !== 'roam' || b.provoked > G.t) b.tg = beastTarget(b);
    b.path = null; b.repath = false;
  }
  // 白天的燈蟲會回到荒野
  if (b.type === 'bug' && b.mode === 'tide' && G.tide.phase === 'done') { b.mode = 'roam'; b.hostile = false; }
  const tp = tgtPos(b.tg);
  if (!tp) {
    // 漫遊
    if (!b.path || b.pi >= b.path.length) {
      if (R() < dt * 0.03 || !b.path) {
        const x = clamp(Math.floor(b.home[0] + (R() - .5) * 12), 0, N - 1), y = clamp(Math.floor(b.home[1] + (R() - .5) * 12), 0, N - 1);
        if (walkCost(x, y, false) > 0) b.path = findPath(b.x, b.y, [[x, y]], false, 1500), b.pi = 1;
      }
    }
    beastMove(b, dt, d.speed * 0.45);
    if (b.mode === 'tide' && G.tide.phase !== 'active' && G.tide.phase !== 'boss') b.flee = true;
    return;
  }
  const dd = dist(tp.x, tp.y, b.x, b.y);
  const reach = d.range + (tp.b ? Math.max(tp.b.w, tp.b.h) / 2 : 0.2);
  if (dd <= reach) {
    b.moving = false;
    const dx = tp.x - b.x, dy = tp.y - b.y, l = Math.hypot(dx, dy) || 1; b.dx = dx / l; b.dy = dy / l;
    if (b.atk <= 0) { b.atk = d.atkGap / 10; beastHit(b, tp); }
    return;
  }
  if (!b.path || b.pi >= b.path.length) {
    const goals = tp.b ? accessTiles(tp.b).concat([[Math.floor(tp.x), Math.floor(tp.y)]]) : [[Math.floor(tp.x), Math.floor(tp.y)]];
    b.path = findPath(b.x, b.y, goals, true, 3000); b.pi = 1;
    if (!b.path) { b.tg = null; return; }
  }
  // 下一格是建築就咬它
  if (b.path && b.pi < b.path.length) {
    const [nx, ny] = b.path[b.pi];
    const blk = bAt(nx, ny);
    if (blk && (!tp.b || blk.id !== tp.b.id)) {
      if (dist(nx + .5, ny + .5, b.x, b.y) < 1.2) { b.moving = false; if (b.atk <= 0) { b.atk = d.atkGap / 10; beastHit(b, { b: blk, x: nx + .5, y: ny + .5 }); } return; }
    }
  }
  beastMove(b, dt, d.speed);
}
function beastMove(b, dt, sp) {
  if (!b.path || b.pi >= b.path.length) { b.moving = false; return; }
  const [tx, ty] = b.path[b.pi];
  const gx = tx + .5, gy = ty + .5;
  const dx = gx - b.x, dy = gy - b.y, d = Math.hypot(dx, dy);
  const step = sp * dt;
  b.moving = true; b.walk += step * 3;
  if (d > 0.001) { b.dx = dx / d; b.dy = dy / d; }
  if (d <= step) { b.x = gx; b.y = gy; b.pi++; } else { b.x += dx / d * step; b.y += dy / d * step; }
}
function beastHit(b, tp) {
  const d = BEAST[b.type];
  if (typeof fxBite === 'function') fxBite(tp.x, tp.y, d.glow);
  if (tp.c) { hurt(tp.c, d.dmg * (0.8 + R() * 0.4), BEAST[b.type].name + '攻擊'); if (typeof SFX !== 'undefined') SFX.hurt(); }
  else if (tp.b) {
    const B = tp.b;
    B.hp -= d.dmg * (BUILD[B.type].wall ? 1 : 1);
    if (typeof SFX !== 'undefined' && R() < 0.4) SFX.bite(B);
    if (B.hp <= 0) {
      if (B.type === 'hull') { B.hp = 1; }
      else {
        log(`${BUILD[B.type].name}被摧毀了！`, 'bad');
        if (typeof fxBurst === 'function') fxBurst(B.x + B.w / 2, B.y + B.h / 2, '#ffb36b', 26, 1.4);
        for (const c of G.colonists) {
          if (c.inside === B.id || c.lie === B.id) { c.inside = 0; c.hidden = false; c.lie = 0; c.x = B.x + .5; c.y = B.y + .5; if (c.task && !c.downed) { c.task = null; } }
          if (c.bed === B.id) c.bed = 0;
          if (c.task && c.task.bid === B.id) { c.task = null; c.path = null; }
        }
        removeBuilding(B); assignBeds();
        if (!nodeAt(B.x, B.y)) addNode('debris', B.x, B.y);
        for (const c of G.colonists) if (!c.dead && bAt(Math.floor(c.x), Math.floor(c.y)) == null && !passable(Math.floor(c.x), Math.floor(c.y))) nudgeOut(c);
      }
    }
  }
}
function damageBeast(b, dmg, by) {
  if (b.dead) return;
  b.hp -= dmg; b.hit = 1.2;
  if (!b.hostile) { b.hostile = true; b.mode = 'hunt'; b.provoked = G.t + 120; b.thinkAt = 0; }
  if (b.hp <= 0) {
    b.dead = true; G.stats.killed++;
    if (typeof fxBurst === 'function') fxBurst(b.x, b.y, BEAST[b.type].glow, b.type === 'mother' ? 80 : b.type === 'spine' ? 26 : 12, b.type === 'mother' ? 3 : 1);
    if (typeof SFX !== 'undefined') SFX.kill(b.type);
    if (b.type === 'bug' && R() < 0.3) G.res.fiber += 1;
    if (b.type === 'spine') { G.res.food += 5; if (typeof fxText === 'function') fxText(b.x, b.y, '+5 食物', RES.food.color); }
    if (b.type === 'mother') { G.res.comp += 12; G.res.data += 40; log('潮母倒下了。牠的晶核碎成了一地閃爍的零件與資料。', 'good'); G.tide.bossDown = 1; if (typeof onBossDown === 'function') onBossDown(); }
  }
}
function turretStep(dt) {
  if (!G.power.ok) return;
  for (const t of G.buildings) {
    if (t.type !== 'turret' || !t.done || !t.active || G.tide.blackout) continue;
    t.cd = (t.cd || 0) - dt;
    const range = BUILD.turret.range;
    let tg = t.tg && G.beasts.find(b => b.id === t.tg && !b.dead && b.hostile && dist(b.x, b.y, t.x + .5, t.y + .5) <= range);
    if (!tg) { tg = null; let bd = range; for (const b of G.beasts) { if (b.dead || !b.hostile) continue; const d = dist(b.x, b.y, t.x + .5, t.y + .5); if (d < bd) { bd = d; tg = b; } } t.tg = tg && tg.id; }
    if (tg) {
      t.aim = Math.atan2(tg.y - (t.y + .5), tg.x - (t.x + .5));
      t.firing = true;
      if (t.cd <= 0) {
        t.cd = 2.5;
        const dmg = BUILD.turret.dmg * (G.tech.done.ballistic ? 1.25 : 1);
        if (typeof fxShot === 'function') fxShot(t.x + .5, t.y + .5, tg.x, tg.y, true, '#7fe9ff', true);
        if (typeof SFX !== 'undefined') SFX.turret(t);
        damageBeast(tg, dmg, null);
      }
    }
  }
}
// 寵物燈蟲
function spawnPet() { const r = C('rani'); G.pet = { x: r ? r.x + .6 : 25, y: r ? r.y + .4 : 25, walk: 0, alarm: 0 }; }
function petStep(dt) {
  const r = CA('rani'); const p = G.pet;
  if (!r || r.dead) { G.pet = null; return; }
  const tx = r.x + 0.7, ty = r.y + 0.5;
  const d = dist(tx, ty, p.x, p.y);
  if (d > 0.3) { const sp = Math.min(d, (0.4 + d * 0.2) * dt); p.x += (tx - p.x) / d * sp; p.y += (ty - p.y) / d * sp; p.walk += sp * 4; p.moving = true; } else p.moving = false;
  p.hidden = r.hidden || r.away;
  p.alarm = hostileNear(p.x, p.y, 12) ? 1 : 0;
}

/* ---------- 天氣、殘骸雨 ---------- */
function startWeather(type, dur, indoor) {
  G.weather = { type, until: G.t + dur, indoor: !!indoor, t0: G.t };
  if (indoor) for (const c of awake()) if (!c.leader || true) { c.thinkAt = G.t; }
  log(type === 'storm' ? '沙暴來了。' : '', 'warn');
}
function endWeather() {
  if (!G.weather) return;
  const w = G.weather; G.weather = null;
  if (w.type === 'storm') log('沙暴過去了。', 'good');
  for (const c of awake()) if (c.task && c.task.storm) { if (c.hidden) exitBuilding(c); endTask(c); }
}
function meteorShower() {
  const h = hull();
  const n = R.int(4, 6);
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      if (!G) return;
      for (let k = 0; k < 30; k++) {
        const a = R() * TAU, d = 7 + R() * 14;
        const x = Math.floor(h.x + 2.5 + Math.cos(a) * d), y = Math.floor(h.y + 1.5 + Math.sin(a) * d);
        if (!inMap(x, y) || G.world.ter[idx(x, y)] === T.WATER) continue;
        const b = bAt(x, y);
        if (b && b.type !== 'hull') { b.hp -= b.hpMax * 0.4; if (b.hp <= 0) { b.hp = 1; } log(`殘骸砸中了${BUILD[b.type].name}！`, 'bad'); }
        if (!b && !nodeAt(x, y)) { addNode(R() < 0.35 ? 'crate' : 'debris', x, y); revealAround(x + .5, y + .5, 2); }
        if (typeof fxMeteor === 'function') fxMeteor(x + .5, y + .5);
        break;
      }
    }, 500 + i * 650);
  }
}
