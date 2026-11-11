// 用 Node 跑規則：node tests/sim.js [局數]
// 幾種打法各打很多局，看結果分布，確認連鎖會發生、沒有標準解
const fs = require('fs');
const path = require('path');
const src = ['01_util.js', '02_world.js'].map((f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const vm = require('vm');
const ctx = { console, Math, Float32Array, document: undefined, localStorage: undefined };
vm.createContext(ctx);
vm.runInContext(src + '\nthis.World = World; this.TURN_TIME = TURN_TIME; this.MAM = MAM;', ctx);
const { World, TURN_TIME } = ctx;

function aimFor(w, tool, tx, wantMam = false) {
  let best = null;
  for (let a = -1.45; a <= -0.15; a += 0.04) {
    for (let p = 0.05; p <= 1.0001; p += 0.02) {
      const pr = w.predict(tool, a, p);
      const r = pr.res;
      if (!r) continue;
      if (wantMam) {
        if (r.type === 'mam') {
          const score = { vital: 0, body: 1, leg: 2, trunk: 2, head: 3, tusk: 9 }[r.zone] + Math.abs(a + 0.7) * 0.1;
          if (!best || score < best.score) best = { a, p, score, r };
        }
      } else if (r.type === 'ground') {
        const score = Math.abs(r.x - tx);
        if (!best || score < best.score) best = { a, p, score, r };
      }
    }
  }
  return best;
}
function worldPhase(w) {
  const dt = 1 / 60;
  for (let t = 0; t < TURN_TIME; t += dt) { w.step(dt); w.anim(dt); if (w.over && (w.mam.alive === false || !w.hunter.alive)) { /* 收尾 */ } }
}
function play(seed, strat, log = false) {
  const w = new World(seed);
  const L = [];
  for (let turn = 0; turn < 14 && !w.over; turn++) {
    const act = strat(w, turn);
    if (act && act.tool && w.tools[act.tool] > 0) {
      w.throwProj(act.tool, act.a, act.p);
      let n = 0;
      while (!w.flightStep(1 / 60) && n++ < 2000);
    }
    if (log) L.push(`T${turn + 1} wind ${w.wind.now} act ${act ? act.tool + '@' + (act.r ? Math.round(act.r.x) + ':' + (act.r.zone || act.r.kind) : '') : 'wait'} m.x ${Math.round(w.mam.x)} ${w.mam.state} hp ${Math.round(w.mam.hp)}`);
    if (!w.over) worldPhase(w);
    if (log) L.push(`   -> m.x ${Math.round(w.mam.x)} ${w.mam.state} hp ${Math.round(w.mam.hp)} fire ${w.grass.filter((s) => s.st === 1).length}`);
    if (!w.over) w.nextTurn();
  }
  // 讓死亡動畫跑完
  for (let i = 0; i < 240; i++) w.step(1 / 60);
  if (log) console.log(L.join('\n'));
  return { over: w.over || { win: false, why: 'timeout' }, w };
}

// 打法 1：順風火攻——在猛獁上風處點火，把牠趕向冰湖
const stratFire = (w, turn) => {
  const m = w.mam;
  if (w.tools.fire > 0 && w.wind.now > 0 && !w.grass.some((s) => s.st === 1)) {
    const b = aimFor(w, 'fire', m.x - 190);
    if (b) return { tool: 'fire', ...b };
  }
  return null;
};
// 打法 2：先扎一矛激怒，再在牠前面點火牆
const stratSpearWall = (w, turn) => {
  const m = w.mam;
  if (m.state !== 'charge' && w.tools.spear > 0 && turn === 0) { const b = aimFor(w, 'spear', 0, true); if (b) return { tool: 'spear', ...b }; }
  if (m.state === 'charge' && w.tools.fire > 0) { const b = aimFor(w, 'fire', m.x - 260); if (b) return { tool: 'fire', ...b }; }
  if (w.tools.spear > 0 && m.state === 'charge') { const b = aimFor(w, 'spear', 0, true); if (b) return { tool: 'spear', ...b }; }
  return null;
};
// 打法 3：只用矛
const stratSpear = (w) => {
  if (w.tools.spear > 0) { const b = aimFor(w, 'spear', 0, true); if (b) return { tool: 'spear', ...b }; }
  return null;
};
// 打法 5：逆風把牠趕到石壁下，用火燒弱，再補一矛要害
const stratCorner = (w) => {
  const m = w.mam;
  const burning = w.grass.some((s) => s.st === 1);
  if (m.hp <= 34 && w.tools.spear > 0) { const b = aimFor(w, 'spear', 0, true); if (b && b.r.zone === 'vital') return { tool: 'spear', ...b }; }
  if (w.tools.fire > 0 && !burning && w.wind.now < 0) { const b = aimFor(w, 'fire', m.x + 210); if (b) return { tool: 'fire', ...b }; }
  if (m.hp <= 50 && w.tools.spear > 1 && (m.state === 'cornered' || m.state === 'trapped')) { const b = aimFor(w, 'spear', 0, true); if (b && b.r.zone === 'vital') return { tool: 'spear', ...b }; }
  return null;
};
// 打法 6：扎矛放血，火牆擋衝鋒，讓牠一直跑
const stratBleed = (w, turn) => {
  const m = w.mam;
  const burning = w.grass.some((s) => s.st === 1);
  const between = w.flames.some((fx) => fx < m.x && fx > w.hunter.x + 150);
  if (m.state === 'charge' && !between && w.tools.fire > 0 && m.x < 1000) { const b = aimFor(w, 'fire', m.x - 230); if (b) return { tool: 'fire', ...b }; }
  if (w.tools.spear > 0 && m.spears.length < 2 && (m.state !== 'charge' || between)) { const b = aimFor(w, 'spear', 0, true); if (b && b.r.zone !== 'tusk' && b.r.zone !== 'head') return { tool: 'spear', ...b }; }
  if (w.tools.spear > 0 && m.hp < 40) { const b = aimFor(w, 'spear', 0, true); if (b && (b.r.zone === 'vital' || b.r.zone === 'body')) return { tool: 'spear', ...b }; }
  return null;
};
// 打法 4：亂丟
const stratRandom = (w) => {
  const R = Math.random;
  if (R() < 0.25) return null;
  const tool = R() < 0.55 ? 'spear' : 'fire';
  if (w.tools[tool] <= 0) return null;
  const a = -0.2 - R() * 1.1, p = 0.2 + R() * 0.8;
  return { tool, a, p, r: w.predict(tool, a, p).res };
};

const N = +process.argv[2] || 60;
const which = process.argv[3];
const strats = { fire: stratFire, spearWall: stratSpearWall, spear: stratSpear, corner: stratCorner, bleed: stratBleed, random: stratRandom };
for (const [name, s] of Object.entries(strats)) {
  if (which && which !== name) continue;
  const tally = {};
  let turns = 0, score = 0, best = 0;
  for (let i = 0; i < N; i++) {
    const { over, w } = play(1000 + i, s);
    const k = over.win ? 'win:' + over.how : 'lose:' + over.why;
    tally[k] = (tally[k] || 0) + 1;
    turns += w.stats.turns;
    const h = w.harvest(); score += h.score; best = Math.max(best, h.score);
  }
  console.log(name.padEnd(10), JSON.stringify(tally), 'avg turns', (turns / N).toFixed(1), 'avg score', (score / N).toFixed(1), 'best', best);
}
if (process.argv[4]) play(+process.argv[4], strats[which], true);
