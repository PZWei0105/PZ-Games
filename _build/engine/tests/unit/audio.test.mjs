import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPZ } from './_load.mjs';
const PZ = loadPZ();
const stats = (d, sr) => { let pk = 0, sum = 0, nan = 0, dc = 0; for (let i = 0; i < d.length; i++) { const v = d[i]; if (!Number.isFinite(v)) nan++; const a = Math.abs(v); if (a > pk) pk = a; sum += v * v; dc += v; } return { pk, rms: Math.sqrt(sum / d.length), nan, dc: dc / d.length, dur: d.length / sr }; };

test('every built-in sound renders clean', () => {
  const names = Object.keys(PZ.sfx.defs);
  assert.ok(names.length >= 40, 'at least 40 sounds, got ' + names.length);
  for (const n of names) {
    const d = PZ.sfx.render(n, 44100); const s = stats(d, 44100);
    assert.equal(s.nan, 0, n + ' has NaN');
    assert.ok(s.pk <= 1.0001, n + ' clips ' + s.pk);
    assert.ok(s.pk > 0.05, n + ' silent ' + s.pk);
    assert.ok(s.dur > 0.01 && s.dur < 4, n + ' duration ' + s.dur);
    assert.ok(Math.abs(s.dc) < 0.02, n + ' DC offset ' + s.dc);
    // 結尾要收乾淨（不會「啪」一聲）
    assert.ok(Math.abs(d[d.length - 1]) < 0.01, n + ' ends with click ' + d[d.length - 1]);
  }
});
test('render is deterministic', () => {
  const a = PZ.sfx.render('explosion'), b = PZ.sfx.render('explosion');
  assert.equal(a.length, b.length); for (let i = 0; i < a.length; i += 97) assert.equal(a[i], b[i]);
});
test('custom sound define', () => {
  PZ.sfx.define('t1', { layers: [{ w: 'square', f: 440, t: 0.1 }], vol: 0.5 });
  const s = stats(PZ.sfx.render('t1'), 44100); assert.ok(Math.abs(s.pk - 0.475) < 0.02, 'normalized to vol*0.95: ' + s.pk);
});
test('notes and chords parse', () => {
  assert.equal(PZ.noteToMidi('C4'), 60); assert.equal(PZ.noteToMidi('A4'), 69); assert.equal(PZ.noteToMidi('C#4'), 61); assert.equal(PZ.noteToMidi('Bb3'), 58); assert.equal(PZ.noteToMidi('x'), null);
  assert.equal(JSON.stringify(PZ.chordNotes('C', 48)), '[48,52,55]');
  const am = PZ.chordNotes('Am7', 52); assert.equal(am.length, 4); assert.equal((am[1] - am[0] + 12) % 12, 3);
  const slash = PZ.chordNotes('C/E', 48); assert.equal(slash[0] % 12, 4);
});
