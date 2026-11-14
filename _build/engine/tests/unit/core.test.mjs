import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPZ } from './_load.mjs';
const PZ = loadPZ();

test('version stamped', () => { assert.match(PZ.version, /^\d+\.\d+\.\d+$/); });
test('math basics', () => {
  const m = PZ.math;
  assert.equal(m.clamp(5, 0, 3), 3); assert.equal(m.lerp(0, 10, 0.25), 2.5);
  assert.ok(Math.abs(m.wrapAngle(Math.PI * 3) - Math.PI) < 1e-9 || Math.abs(m.wrapAngle(Math.PI * 3) + Math.PI) < 1e-9);
  assert.ok(Math.abs(m.damp(0, 10, 5, 1) - 10 * (1 - Math.exp(-5))) < 1e-9);
  assert.ok(Math.abs(m.angleDiff(0.1, -0.1) + 0.2) < 1e-9);
});
test('rng reproducible and in range', () => {
  const a = PZ.rng(42), b = PZ.rng(42);
  for (let i = 0; i < 1000; i++) { const x = a.next(); assert.equal(x, b.next()); assert.ok(x >= 0 && x < 1); }
  const r = PZ.rng(7); const seen = new Set(); for (let i = 0; i < 2000; i++) { const v = r.int(1, 6); assert.ok(v >= 1 && v <= 6); seen.add(v); } assert.equal(seen.size, 6);
  let s = 0, n = 20000; for (let i = 0; i < n; i++) s += r.gauss(); assert.ok(Math.abs(s / n) < 0.05);
});
test('noise smooth and bounded', () => {
  let mx = 0; for (let x = 0; x < 50; x += 0.01) { const v = PZ.noise.n1(x); mx = Math.max(mx, Math.abs(v)); assert.ok(Number.isFinite(v)); }
  assert.ok(mx <= 1.5, 'n1 bounded ' + mx);
  // continuity
  for (let x = 0; x < 10; x += 0.001) assert.ok(Math.abs(PZ.noise.n1(x + 0.001) - PZ.noise.n1(x)) < 0.05);
  let m2 = 0; for (let i = 0; i < 5000; i++) { const v = PZ.noise.n2(i * 0.37, i * 0.11); m2 = Math.max(m2, Math.abs(v)); } assert.ok(m2 <= 1.5);
});
test('easing endpoints', () => {
  for (const [k, f] of Object.entries(PZ.ease)) { if (k === 'blip') continue; assert.ok(Math.abs(f(0)) < 1e-6, k + '(0)'); assert.ok(Math.abs(f(1) - 1) < 1e-6, k + '(1)'); }
});
test('color parse/pack', () => {
  const c = PZ.color;
  assert.equal(c('#fff'), 0xffffffff); assert.equal(c('#000'), 0xff000000);
  assert.equal(c.r('#ff8000'), 255); assert.equal(c.g('#ff8000'), 128); assert.equal(c.b('#ff8000'), 0);
  assert.equal(c.a('rgba(10,20,30,0.5)').toFixed(2), '0.50');
  assert.equal(c.css('#12ab9f'), '#12ab9f');
  assert.equal(c.css(c.alpha('#fff', 0.5)), 'rgba(255,255,255,0.502)');
  assert.equal(c.r(c.hsl(0, 1, 0.5)), 255);
  const r = c.ramp(['#000', '#fff'], 3); assert.equal(c.r(r[1]), 128);
  assert.equal(c('#11223344'), PZ.rgb(0x11, 0x22, 0x33, 0x44 / 255));
});
test('events', () => {
  let n = 0; const off = PZ.on('x', (v) => (n += v)); PZ.emit('x', 2); PZ.emit('x', 3); off(); PZ.emit('x', 10); assert.equal(n, 5);
  let m = 0; PZ.once('y', () => m++); PZ.emit('y'); PZ.emit('y'); assert.equal(m, 1);
});
test('grid query', () => {
  const g = new PZ.Grid(32); const objs = []; const r = PZ.rng(1);
  for (let i = 0; i < 500; i++) { const o = { x: r.range(-500, 500), y: r.range(-500, 500), r: 4 }; objs.push(o); g.insert(o, o.r); }
  for (let k = 0; k < 50; k++) {
    const x = r.range(-500, 500), y = r.range(-500, 500), rad = r.range(10, 120);
    const got = new Set(g.query(x, y, rad, []));
    const want = objs.filter((o) => Math.hypot(o.x - x, o.y - y) <= rad + o.r);
    assert.equal(got.size, want.length); for (const o of want) assert.ok(got.has(o));
  }
  g.clear(); assert.equal(g.query(0, 0, 1000, []).length, 0);
});
test('collision helpers', () => {
  const h = PZ.hit;
  assert.ok(h.circle(0, 0, 5, 9, 0, 5)); assert.ok(!h.circle(0, 0, 5, 11, 0, 5));
  assert.equal(h.segCircle(-10, 0, 10, 0, 0, 0, 2) > 0, true);
  assert.equal(h.segCircle(-10, 5, 10, 5, 0, 0, 2), -1);
  const p = h.pushCircleRect(5, -1, 3, 0, 0, 10, 10); assert.ok(p && p.y < 0);
});
test('sortBy stable insertion', () => {
  const a = [{ y: 3 }, { y: 1 }, { y: 2 }, { y: 1 }]; PZ.sortBy(a, (o) => o.y); assert.deepEqual(a.map((o) => o.y), [1, 1, 2, 3]);
});
test('store falls back to memory without localStorage', () => {
  assert.equal(PZ.store.available, false); PZ.store.set('a', 1); assert.equal(PZ.store.get('a'), '1'); PZ.store.setJSON('b', { x: 1 }); assert.equal(JSON.stringify(PZ.store.getJSON('b')), '{"x":1}');
});
