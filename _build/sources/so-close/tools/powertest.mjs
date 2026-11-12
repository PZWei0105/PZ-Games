import RAPIER from '@dimforge/rapier3d-compat';
import { Sim } from '../src/game/sim.js';
import { rng } from '../src/game/qmath.js';
await RAPIER.init();
const a = Object.fromEntries(process.argv.slice(2).map((x) => x.split('=')));
const P = { g: +(a.g || 1), l: +(a.l || 0.97), c: +(a.c || 0.9) };
const sx = +(a.sx || 0.12), sy = +(a.sy || 0.15), sz = +(a.sz || 0.1), m = +(a.m || 0.2);
for (const off of (a.offs || '0,0.01,0.02,0.03').split(',').map(Number)) {
  let wins = 0, grabs = 0, dzs = [];
  const N = +(a.n || 12);
  for (let s = 1; s <= N; s++) {
    const sim = new Sim(RAPIER, 'shelf'); const L = sim.L, R = rng(s * 131);
    const b = sim.addPrize({ id: 0, kind: 'box', sx, sy, sz, mass: m }, { x: -0.05 + R() * 0.1, y: L.shelfY + sy / 2 + 0.002, z: +(a.z || -0.06) });
    for (let i = 0; i < 120; i++) sim.sub(1 / 120);
    sim.events.length = 0;
    const t = b.body.translation();
    sim.start(P); const e = R() * 0.01, an = R() * 6.28;
    sim.car.x = t.x + Math.cos(an) * e; sim.car.z = t.z - off + Math.sin(an) * e; sim.applyClaw(true);
    for (let i = 0; i < 10; i++) sim.sub(1 / 120);
    sim.drop();
    let tt = 0; while (sim.state !== 'idle' && tt < 30) { sim.sub(1 / 120); tt += 1 / 120; }
    const ev = sim.events.splice(0);
    if (ev.some((x) => x.type === 'grab')) grabs++;
    if (ev.some((x) => x.type === 'win')) wins++; else dzs.push((b.body.translation().z - t.z).toFixed(3));
  }
  console.log(`off ${off}: win ${wins}/${N} grab ${grabs}/${N} dz ${dzs.join(' ')}`);
}
