// 單次夾取的詳細追蹤
import RAPIER from '@dimforge/rapier3d-compat';
import { Sim } from '../src/game/sim.js';
import { D2R } from '../src/game/qmath.js';
await RAPIER.init();
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')));
const sim = new Sim(RAPIER, 'pile');
const r = +(args.r || 0.05);
const pr = sim.addPrize({ id: 0, kind: 'cap', r, mass: +(args.m || 0.1) }, { x: 0.1, y: r + 0.001, z: 0 });
for (let i = 0; i < 120; i++) sim.sub(1 / 120);
const P = { g: +(args.g || 1), l: +(args.l || 0.7), c: +(args.c || 0.35) };
sim.start(P);
sim.car.x = 0.1 + +(args.ex || 0); sim.car.z = 0 + +(args.ez || 0); sim.applyClaw(true);
for (let i = 0; i < 20; i++) sim.sub(1 / 120);
sim.drop();
let last = '', t = 0, k = 0;
while (sim.state !== 'idle' && t < 20) {
  sim.sub(1 / 120); t += 1 / 120; k++;
  const p = pr.body.translation();
  if (sim.state !== last || k % 12 === 0) {
    const hp = sim._hp;
    const tips = sim.prongs.map((q) => sim.tipWorld(q, hp, sim._hq));
    console.log(t.toFixed(2), sim.state.padEnd(7), 'hy', sim.hy.toFixed(3), 'ang', sim.prongs.map((q) => (q.a / D2R).toFixed(0)).join(','), 'tipY', tips.map((q) => q.y.toFixed(3)).join(','), 'tipR', tips.map((q) => Math.hypot(q.x - hp.x, q.z - hp.z).toFixed(3)).join(','), '| cap', p.x.toFixed(3), p.y.toFixed(3), p.z.toFixed(3));
    last = sim.state;
  }
}
console.log(sim.events.filter((e) => e.type !== 'hit').map((e) => e.type + (e.phase ? ':' + e.phase : '')).join(' '));
