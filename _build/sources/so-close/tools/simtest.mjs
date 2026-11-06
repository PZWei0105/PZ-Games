// 無頭物理調校：大量自動夾取，統計成功率
import RAPIER from '@dimforge/rapier3d-compat';
import { Sim } from '../src/game/sim.js';
import { rng } from '../src/game/qmath.js';

await RAPIER.init();
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')));
const N = +(args.n || 40);
const kind = args.kind || 'pile';
const P = { g: +(args.g || 1), l: +(args.l || 0.7), c: +(args.c || 0.35) };
const errMax = +(args.err || 0.0);
const verbose = !!args.v;

function makePile(seed, count = +(args.cap || 60)) {
  const sim = new Sim(RAPIER, kind);
  const R = rng(seed);
  const L = sim.L;
  let id = 0;
  if (kind === 'pile') {
    for (let k = 0; k < count; k++) {
      let x, z;
      for (let t = 0; t < 80; t++) { const a = R() * 6.283, rr = Math.sqrt(R()) * 0.3; x = 0.08 + Math.cos(a) * rr * 1.25; z = -0.08 + Math.sin(a) * rr; if (Math.abs(x) < L.W / 2 - 0.06 && Math.abs(z) < L.D / 2 - 0.06 && !(x < L.chute.x1 + 0.07 && z > L.chute.z0 - 0.07)) break; }
      const big = k === 0;
      sim.addPrize({ id: id++, kind: 'cap', r: big ? 0.064 : 0.05, mass: big ? 0.24 : 0.1 + R() * 0.03 }, { x, y: 0.07 + k * 0.03, z });
    }
  } else {
    sim.addPrize({ id: id++, kind: 'box', sx: 0.17, sy: 0.12, sz: 0.11, mass: 0.32 }, { x: -0.1, y: L.shelfY + 0.07, z: -0.09 });
    sim.addPrize({ id: id++, kind: 'box', sx: 0.17, sy: 0.12, sz: 0.11, mass: 0.32 }, { x: 0.15, y: L.shelfY + 0.07, z: -0.12 });
  }
  for (let i = 0; i < 360; i++) sim.sub(1 / 120);
  sim.events.length = 0;
  return sim;
}

function runTurn(sim, tx, tz) {
  sim.start(P);
  sim.car.x = tx; sim.car.z = tz;
  sim.applyClaw(true);
  for (let i = 0; i < 30; i++) sim.sub(1 / 120);
  sim.drop();
  let t = 0;
  while (sim.state !== 'idle' && t < 30) { sim.sub(1 / 120); t += 1 / 120; }
  const ev = sim.events.splice(0);
  return { t, ev };
}

const stats = { turns: 0, grabbed: 0, wins: 0, slipLift: 0, slipTop: 0, slipReturn: 0, t: 0 };
const t0 = performance.now();
for (let s = 1; s <= N; s++) {
  const sim = makePile(s * 7919);
  const R = rng(s * 31337);
  // 目標：最高、離出口近、可以夾到的那顆
  const cand = sim.prizes.filter((p) => p.state === 'pile').map((p) => ({ p, t: p.body.translation() }));
  cand.sort((a, b) => b.t.y - a.t.y);
  const score = (c) => { const nb = cand.filter((o) => o !== c && Math.hypot(o.t.x - c.t.x, o.t.z - c.t.z) < 0.11 && o.t.y > c.t.y - 0.03).length; const dc = Math.hypot(c.t.x + 0.29, c.t.z - 0.23); return c.t.y * 2 - nb * 0.06 - dc * 0.15; };
  const target = args.big ? cand.find((c) => c.p.r > 0.06) || cand[0] : args.smart ? [...cand].sort((a, b) => score(b) - score(a))[0] : cand[Math.floor(R() * Math.min(5, cand.length))];
  const ang = R() * Math.PI * 2, e = R() * errMax;
  const r = runTurn(sim, target.t.x + Math.cos(ang) * e, target.t.z + Math.sin(ang) * e);
  stats.turns++;
  stats.t += r.t;
  const types = r.ev.map((e) => e.type + (e.phase ? ':' + e.phase : ''));
  if (r.ev.some((e) => e.type === 'grab')) stats.grabbed++;
  if (r.ev.some((e) => e.type === 'win')) stats.wins++;
  for (const e of r.ev) if (e.type === 'slip') stats['slip' + e.phase[0].toUpperCase() + e.phase.slice(1)] = (stats['slip' + e.phase[0].toUpperCase() + e.phase.slice(1)] || 0) + 1;
  if (verbose) console.log(s, 'err', e.toFixed(3), types.filter((x) => x !== 'hit').join(' '), 'hits', types.filter((x) => x === 'hit').length);
}
const ms = performance.now() - t0;
console.log(JSON.stringify(stats), 'avgTurn', (stats.t / stats.turns).toFixed(1) + 's', 'speed', (stats.t / (ms / 1000)).toFixed(1) + 'x realtime');
