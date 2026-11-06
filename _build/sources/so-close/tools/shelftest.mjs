// 推落台：同一台連續推，看幾次掉下去
import RAPIER from '@dimforge/rapier3d-compat';
import { Sim } from '../src/game/sim.js';
import { rng } from '../src/game/qmath.js';
await RAPIER.init();
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')));
const P = { g: +(args.g || 0.9), l: +(args.l || 0.5), c: +(args.c || 0.3) };
const off = +(args.off || 0.06), err = +(args.err || 0.01), N = +(args.n || 8);
const sx = +(args.sx || 0.2), sy = +(args.sy || 0.15), sz = +(args.sz || 0.128), mass = +(args.m || 0.38);
let total = 0, fails = 0;
for (let s = 1; s <= N; s++) {
  const sim = new Sim(RAPIER, 'shelf');
  const L = sim.L, R = rng(s * 977);
  const b = sim.addPrize({ id: 0, kind: 'box', sx, sy, sz, mass }, { x: -0.05 + R() * 0.1, y: L.shelfY + sy / 2 + 0.002, z: +(args.z || -0.1) });
  sim.addPrize({ id: 1, kind: 'box', sx, sy, sz, mass }, { x: 0.24, y: L.shelfY + sy / 2 + 0.002, z: -0.2 });
  for (let i = 0; i < 120; i++) sim.sub(1 / 120);
  sim.events.length = 0;
  let turns = 0, won = false, log = [];
  while (turns < 30 && !won) {
    const t = b.body.translation();
    sim.start(P);
    const a = R() * 6.283, e = R() * err;
    sim.car.x = t.x + Math.cos(a) * e; sim.car.z = t.z - off + Math.sin(a) * e; sim.applyClaw(true);
    for (let i = 0; i < 10; i++) sim.sub(1 / 120);
    sim.drop();
    let tt = 0;
    while (sim.state !== 'idle' && tt < 30) { sim.sub(1 / 120); tt += 1 / 120; }
    turns++;
    const ev = sim.events.splice(0);
    if (ev.some((e) => e.type === 'win' && e.id === 0) || b.state !== 'pile') { won = true; log.push('WIN'); break; }
    const t2 = b.body.translation();
    log.push((t2.z - t.z).toFixed(3));
  }
  if (won) total += turns; else fails++;
  console.log('seed', s, won ? 'WIN in ' + turns : 'no win', 'dz:', log.join(' '));
}
console.log('avg turns', (total / Math.max(1, N - fails)).toFixed(1), 'fails', fails);
