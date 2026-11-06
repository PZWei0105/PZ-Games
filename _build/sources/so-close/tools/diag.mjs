import RAPIER from '@dimforge/rapier3d-compat';
import { Sim } from '../src/game/sim.js';
import { rng, D2R } from '../src/game/qmath.js';
await RAPIER.init();
const P = { g: 1, l: 1, c: 1 };
for (let s = 1; s <= 14; s++) {
  const sim = new Sim(RAPIER, 'pile');
  const R = rng(s * 7919), L = sim.L;
  for (let k = 0; k < +(process.env.NCAP || 30); k++) {
    let x, z;
    for (let t = 0; t < 80; t++) { const a = R() * 6.283, rr = Math.sqrt(R()) * 0.3; x = 0.08 + Math.cos(a) * rr * 1.25; z = -0.08 + Math.sin(a) * rr; if (Math.abs(x) < L.W / 2 - 0.06 && Math.abs(z) < L.D / 2 - 0.06 && !(x < L.chute.x1 + 0.07 && z > L.chute.z0 - 0.07)) break; }
    sim.addPrize({ id: k, kind: 'cap', r: k === 0 ? 0.064 : 0.05, mass: k === 0 ? 0.24 : 0.1 + R() * 0.03 }, { x, y: 0.07 + k * 0.03, z });
  }
  for (let i = 0; i < 360; i++) sim.sub(1 / 120);
  const R2 = rng(s * 31337);
  const cand = sim.prizes.map((p) => ({ p, t: p.body.translation() })).sort((a, b) => b.t.y - a.t.y);
  const tg = cand[Math.floor(R2() * 5)];
  // 周圍擁擠度：XZ 距離 < 0.13 的鄰居數
  const crowd = cand.filter((c) => c !== tg && Math.hypot(c.t.x - tg.t.x, c.t.z - tg.t.z) < 0.12 && c.t.y > tg.t.y - 0.06).length;
  sim.events.length = 0;
  sim.start(P); sim.car.x = tg.t.x; sim.car.z = tg.t.z; sim.applyClaw(true);
  for (let i = 0; i < 20; i++) sim.sub(1 / 120);
  sim.drop();
  let landY = null, gripInfo = null, t = 0;
  while (sim.state !== 'idle' && t < 30) {
    const before = sim.state;
    sim.sub(1 / 120); t += 1 / 120;
    if (before === 'drop' && sim.state === 'close') landY = sim.hy;
    if (before === 'close' && sim.state === 'grip') gripInfo = { n: sim.gripped.length, has: sim.gripped.includes(tg.p), ang: sim.prongs.map((p) => (p.hold / D2R).toFixed(0)).join(','), ty: tg.p.body.translation().y.toFixed(3), hy: sim.hy.toFixed(3) };
  }
  const ev = sim.events.filter((e) => e.type !== 'hit').map((e) => e.type + (e.phase ? ':' + e.phase : '')).join(' ');
  console.log(s, 'targetY', tg.t.y.toFixed(3), 'crowd', crowd, 'land', landY?.toFixed(3), 'grip', JSON.stringify(gripInfo), '|', ev.replace('drop land close lift ', ''));
}
