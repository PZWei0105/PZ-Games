/* ==========================================================================
   17 配樂：用文字寫譜、引擎即時演奏
     PZ.music.define('battle', {
       bpm: 128, swing: 0,                   // steps：每小節幾格（預設 16）
       tracks: [
         { inst: 'kick',  pat: 'x...x...x...x...' },
         { inst: 'snare', pat: '....x.......x...' },
         { inst: 'hat',   pat: 'x.x.x.x.x.x.x.x.', vol: 0.35, min: 0.4 },   // 緊張度 ≥ 0.4 才出現
         { inst: 'bass',  notes: 'A1 . A1 . . . G1 . F1 - - . F1 . G1 .' },  // 一格一個字：音名、. 休止、- 延長
         { inst: 'pad',   chords: 'Am F C G', vol: 0.3 },                     // 一小節一個和弦
         { inst: 'pluck', notes: 'A4 . C5 . E5 . C5 . …', min: 0.7 },
       ],
     });
     PZ.music.play('battle', { fade: 1.5 });   PZ.music.intensity(0.8);   PZ.music.stop({ fade: 2 });
     PZ.music.stinger('win')（播一次、自動壓低主配樂）   PZ.music.file('theme', 'music.mp3')（用音檔）
   鼓的字：x 一般、X 重音、o 輕；數字 1～9 是力度。音名：C4＝中央 Do，可寫 C#4、Eb3。
   和弦：A、Am、A7、Am7、Amaj7、Asus2、Asus4、Adim、Aaug、A6、Am6、A9、Aadd9，可加 /E 指定低音。
   樂器（取樣式，便宜）：kick snare hat ohat clap tom crash shaker rim bass sub pluck harp zither keys bell marimba arp stab epiano piano guitar kalimba
   樂器（即時合成，長音）：pad strings lead choir flute organ brass supersaw
   聲部效果：{ delay: 0.35（跟拍子對齊的回音）, lp: 1800 或 [600, 6000]（低通；給兩個值＝緊張度越高越亮）, pump: 0.6（跟著大鼓一縮一放）, rev, pan }
     歌曲：{ delaySteps: 3（回音隔幾格，預設附點八分）, feedback: 0.38, delayTone: 2600 }
   換歌對拍子：PZ.music.play('boss', { sync: 'bar' | 'half' | 'beat' })   下一小節（半小節、下一拍）才切過去，不會亂拍
   PZ.music.muffle(0.8)  配樂悶住（暫停選單、水底）；muffle(0) 恢復      PZ.music.phase()  這一拍走到哪（0～1，畫面跟著節奏跳）
   ========================================================================== */
const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteToMidi(tok) {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(tok); if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE_IDX[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CHORD_Q = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus2: [0, 2, 7], sus4: [0, 5, 7], dim: [0, 3, 6], aug: [0, 4, 8], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], 9: [0, 4, 7, 10, 14], add9: [0, 4, 7, 14], m9: [0, 3, 7, 10, 14] };
function chordNotes(name, base = 52) {
  const m = /^([A-G])([#b]?)([a-z0-9]*)(?:\/([A-G][#b]?))?$/.exec(name); if (!m) return null;
  const root = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0), q = CHORD_Q[m[3]] || CHORD_Q[''];
  // 把根音放在 base 附近（聲部不要一直跳）
  let r = base - ((base - root) % 12 + 12) % 12; if (r < base - 6) r += 12;
  const notes = q.map((iv) => r + iv);
  if (m[4]) { const b = NOTE_IDX[m[4][0]] + (m[4][1] === '#' ? 1 : m[4][1] === 'b' ? -1 : 0); notes.unshift(r - 12 + ((b - root + 12) % 12)); }
  return notes;
}
PZ.noteToMidi = noteToMidi; PZ.chordNotes = chordNotes;

/* ---------- 樂器 ---------- */
const INST = {};
const buf = (name, render) => { INST[name] = { kind: 'buf', render }; };
const node = (name, play) => { INST[name] = { kind: 'node', play }; };
function ks(f, dur, sr, bright = 0.5, damp = 0.996, seed = 1) {
  const N = Math.max(2, Math.round(sr / f)), d = new Float32Array(N), r = makeRng(seed);
  let lp = 0; for (let i = 0; i < N; i++) { lp += ((r.next() * 2 - 1) - lp) * (0.15 + bright * 0.85); d[i] = lp; }
  const len = Math.ceil(dur * sr), out = new Float32Array(len); let idx = 0;
  for (let i = 0; i < len; i++) { const a = d[idx], b = d[(idx + 1) % N]; out[i] = a; d[idx] = (a + b) * 0.5 * damp; idx = (idx + 1) % N; }
  return out;
}
buf('kick', (m, dur, sr) => synth({ vol: 1, layers: [{ w: 'sine', f: 160, f1: 44, t: 0.42, a: 0.001, p: 1.6, v: 1, dist: 0.15 }, { w: 'noise', t: 0.012, a: 0.0003, p: 1, v: 0.35, hp: [2500, 2500, 0.7] }] }, sr, 11));
buf('snare', (m, dur, sr) => synth({ vol: 0.85, layers: [{ w: 'noise', t: 0.2, a: 0.001, p: 2, v: 1, bp: [1900, 1500, 0.8] }, { w: 'tri', f: 200, f1: 160, t: 0.09, a: 0.001, p: 2, v: 0.7 }] }, sr, 12));
buf('hat', (m, dur, sr) => synth({ vol: 0.5, layers: [{ w: 'noise', t: 0.045, a: 0.0005, p: 2.5, v: 1, hp: [7500, 7500, 0.8] }] }, sr, 13));
buf('ohat', (m, dur, sr) => synth({ vol: 0.5, layers: [{ w: 'noise', t: 0.32, a: 0.001, p: 1.6, v: 1, hp: [6800, 6800, 0.8] }] }, sr, 14));
buf('clap', (m, dur, sr) => synth({ vol: 0.75, layers: [0, 0.011, 0.022].map((d) => ({ w: 'noise', d, t: d === 0.022 ? 0.18 : 0.012, a: 0.0005, p: 2, v: 1, bp: [1300, 1100, 1.4] })) }, sr, 15));
buf('tom', (m, dur, sr) => synth({ vol: 0.85, layers: [{ w: 'sine', f: midiHz(m || 48) * 1.6, f1: midiHz(m || 48), t: 0.35, a: 0.001, p: 1.8, v: 1 }, { w: 'noise', t: 0.02, p: 1, v: 0.2, lp: [3000, 3000, 0.7] }] }, sr, 16));
buf('crash', (m, dur, sr) => synth({ vol: 0.5, layers: [{ w: 'noise', t: 1.8, a: 0.002, p: 2.2, v: 1, hp: [4200, 6000, 0.6] }] }, sr, 17));
buf('shaker', (m, dur, sr) => synth({ vol: 0.35, layers: [{ w: 'noise', t: 0.07, a: 0.02, p: 2, v: 1, bp: [6500, 6500, 1.2] }] }, sr, 18));
buf('rim', (m, dur, sr) => synth({ vol: 0.5, layers: [{ w: 'noise', t: 0.02, a: 0.0005, p: 2, v: 1, bp: [2400, 2400, 3] }, { w: 'sine', f: 1700, t: 0.03, p: 2, v: 0.6 }] }, sr, 19));
buf('bass', (m, dur, sr) => { const f = midiHz(m), t = Math.min(2, dur + 0.08); return synth({ vol: 0.8, layers: [{ w: 'saw', f, t, a: 0.004, h: dur * 0.6, p: 1.4, v: 0.6, lp: [f * 7, f * 2.2, 1.1] }, { w: 'sine', f, t, a: 0.004, h: dur * 0.6, p: 1.2, v: 0.8 }] }, sr, 20); });
buf('sub', (m, dur, sr) => { const f = midiHz(m), t = Math.min(3, dur + 0.1); return synth({ vol: 0.85, layers: [{ w: 'sine', f, t, a: 0.01, h: dur * 0.7, p: 1.2, v: 1 }, { w: 'tri', f: f * 2, t, a: 0.01, h: dur * 0.5, p: 1.5, v: 0.15 }] }, sr, 21); });
buf('pluck', (m, dur, sr) => { const o = ks(midiHz(m), Math.min(2.4, dur + 0.6), sr, 0.45, 0.995, m); return normalizeBuf(o, 0.7); });
buf('harp', (m, dur, sr) => { const o = ks(midiHz(m), 2.4, sr, 0.75, 0.998, m + 3); return normalizeBuf(o, 0.65); });
buf('zither', (m, dur, sr) => { // 古箏味：亮的撥弦＋開頭往下滑一點
  const f = midiHz(m), o = ks(f * 1.012, 2.2, sr, 0.85, 0.997, m + 7);
  const t = synth({ vol: 1, norm: false, layers: [{ w: 'sine', f: f * 1.02, f1: f, t: 0.12, a: 0.001, p: 2, v: 0.15 }] }, sr, 1);
  for (let i = 0; i < t.length && i < o.length; i++) o[i] += t[i];
  return normalizeBuf(o, 0.7);
});
buf('keys', (m, dur, sr) => { const f = midiHz(m), t = Math.min(3, dur + 0.5); return synth({ vol: 0.6, layers: [{ w: 'sine', f, t, a: 0.002, h: dur * 0.3, p: 2.4, v: 0.8, fm: [1, 1.6, 2.5] }, { w: 'sine', f: f * 2, t: Math.min(t, 0.6), a: 0.001, p: 3, v: 0.2, fm: [7, 1.4, 9] }] }, sr, 22); });
buf('bell', (m, dur, sr) => { const f = midiHz(m); return synth({ vol: 0.55, layers: [{ w: 'sine', f, t: 2.2, a: 0.001, p: 2.8, v: 0.7, fm: [3.5, 2, 1.8] }, { w: 'sine', f: f * 2.01, t: 1.2, a: 0.001, p: 3, v: 0.2 }] }, sr, 23); });
buf('marimba', (m, dur, sr) => { const f = midiHz(m); return synth({ vol: 0.65, layers: [{ w: 'sine', f, t: 0.6, a: 0.001, p: 3, v: 0.9, fm: [4, 1.2, 18] }, { w: 'sine', f: f * 4, t: 0.08, a: 0.001, p: 3, v: 0.15 }] }, sr, 24); });
buf('arp', (m, dur, sr) => { const f = midiHz(m); return synth({ vol: 0.45, layers: [{ w: 'square', f, t: Math.min(0.5, dur + 0.12), a: 0.002, p: 2.2, v: 0.5, duty: 0.3, lp: [f * 10, f * 3, 1.2] }] }, sr, 25); });
buf('stab', (m, dur, sr) => { const f = midiHz(m), t = Math.min(1, dur + 0.1); return synth({ vol: 0.5, layers: [-8, 0, 8].map((c) => ({ w: 'saw', f: f * Math.pow(2, c / 1200), t, a: 0.003, h: dur * 0.3, p: 2, v: 0.35, lp: [f * 12, f * 2, 1] })) }, sr, 26); });
buf('epiano', (m, dur, sr) => { const f = midiHz(m), t = Math.min(3.2, dur + 1); return synth({ vol: 0.6, layers: [{ w: 'sine', f, t, a: 0.002, h: dur * 0.3, p: 2.2, v: 0.85, fm: [1, 1.1, 1.6] }, { w: 'sine', f, t: 0.6, a: 0.001, p: 3.4, v: 0.26, fm: [14, 1.6, 12] }, { w: 'sine', f: f * 2, t: Math.min(t, 1.2), a: 0.002, p: 3, v: 0.1 }] }, sr, 27); });
buf('piano', (m, dur, sr) => { // 鋼琴：泛音稍微偏高（弦的非諧和性），高的泛音衰減快，加一點擊槌聲
  const f = midiHz(m), t = Math.min(3.6, dur + 1.6), B = 0.0004 * Math.pow(2, (m - 60) / 24), L = [];
  for (let k = 1; k <= 7; k++) { const fk = f * k * Math.sqrt(1 + B * k * k); if (fk > sr * 0.4) break; L.push({ w: 'sine', f: fk, t: t / (1 + (k - 1) * 0.35), a: 0.0015, p: 2.4 + k * 0.45, v: (0.9 / Math.pow(k, 1.15)) * (k === 1 ? 1 : 0.8) }); }
  L.push({ w: 'noise', t: 0.03, a: 0.0005, p: 2, v: 0.12, lp: [Math.min(9000, f * 8), f * 2, 0.7] });
  return synth({ vol: 0.62, layers: L }, sr, 28);
});
buf('guitar', (m, dur, sr) => { const o = ks(midiHz(m), Math.min(2.6, dur + 1), sr, 0.62, 0.9965, m + 11); let lp = 0; for (let i = 0; i < o.length; i++) { lp += (o[i] - lp) * 0.04; o[i] = o[i] * 0.85 + lp * 1.6; } return normalizeBuf(o, 0.62); });
buf('kalimba', (m, dur, sr) => { const f = midiHz(m); return synth({ vol: 0.6, layers: [{ w: 'sine', f, t: 1.5, a: 0.0015, p: 3.2, v: 0.9 }, { w: 'sine', f: f * 5.94, t: 0.16, a: 0.0008, p: 3, v: 0.22 }, { w: 'sine', f: f * 2.01, t: 0.5, a: 0.001, p: 3, v: 0.12 }, { w: 'noise', t: 0.012, a: 0.0003, p: 2, v: 0.12, bp: [f * 4, f * 4, 1.5] }] }, sr, 29); });
function normalizeBuf(o, target) { let pk = 0; for (let i = 0; i < o.length; i++) pk = Math.max(pk, Math.abs(o[i])); if (pk > 0) { const g = target / pk; for (let i = 0; i < o.length; i++) o[i] *= g; } const fd = Math.min(o.length, 400); for (let i = 0; i < fd; i++) o[o.length - 1 - i] *= i / fd; return o; }

/** 即時合成的長音樂器：c＝AudioContext、out＝輸出節點 */
function envGain(c, t0, dur, peak, a, rel, sus = 0.8) {
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.setTargetAtTime(peak * sus, t0 + a, Math.max(0.05, dur * 0.4));
  g.gain.setTargetAtTime(0.0001, t0 + Math.max(a, dur), rel / 3);
  return g;
}
function oscs(c, type, f, detunes, t0, end, dest) { for (const d of detunes) { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = d; o.connect(dest); o.start(t0); o.stop(end); } }
node('pad', (c, m, t0, dur, vel, out) => { const f = midiHz(m), rel = 1.4, g = envGain(c, t0, dur, 0.16 * vel, 0.5, rel), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(4000, f * 4); lp.Q.value = 0.5; lp.connect(g); g.connect(out); oscs(c, 'sawtooth', f, [-9, 0, 9], t0, t0 + dur + rel * 1.5, lp); });
node('strings', (c, m, t0, dur, vel, out) => { const f = midiHz(m), rel = 0.9, g = envGain(c, t0, dur, 0.14 * vel, 0.25, rel, 0.9), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(5000, f * 6); lp.connect(g); g.connect(out); oscs(c, 'sawtooth', f, [-12, -4, 5, 12], t0, t0 + dur + rel * 1.5, lp); });
node('lead', (c, m, t0, dur, vel, out) => {
  const f = midiHz(m), rel = 0.25, g = envGain(c, t0, dur, 0.13 * vel, 0.01, rel, 0.85), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(6000, f * 8); lp.Q.value = 2; lp.connect(g); g.connect(out);
  const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f; const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t0); lg.gain.linearRampToValueAtTime(f * 0.012, t0 + Math.min(0.4, dur)); lfo.connect(lg); lg.connect(o.frequency);
  o.connect(lp); o.start(t0); o.stop(t0 + dur + rel * 2); lfo.start(t0); lfo.stop(t0 + dur + rel * 2);
});
node('flute', (c, m, t0, dur, vel, out) => {
  const f = midiHz(m), rel = 0.3, g = envGain(c, t0, dur, 0.16 * vel, 0.06, rel, 0.85); g.connect(out);
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 4.8; lg.gain.value = f * 0.006; lfo.connect(lg); lg.connect(o.frequency); o.connect(g); o.start(t0); o.stop(t0 + dur + rel * 2); lfo.start(t0); lfo.stop(t0 + dur + rel * 2);
  const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2; const g2 = c.createGain(); g2.gain.value = 0.12; o2.connect(g2); g2.connect(g); o2.start(t0); o2.stop(t0 + dur + rel * 2);
});
node('choir', (c, m, t0, dur, vel, out) => {
  const f = midiHz(m), rel = 1, g = envGain(c, t0, dur, 0.22 * vel, 0.35, rel, 0.9); g.connect(out);
  const mix = c.createGain(); mix.gain.value = 1;
  for (const [ff, q, a] of [[700, 6, 1], [1150, 8, 0.6], [2600, 10, 0.25]]) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = ff; b.Q.value = q; const bg = c.createGain(); bg.gain.value = a; mix.connect(b); b.connect(bg); bg.connect(g); }
  oscs(c, 'sawtooth', f, [-7, 0, 7], t0, t0 + dur + rel * 1.5, mix);
});
node('organ', (c, m, t0, dur, vel, out) => { const f = midiHz(m), rel = 0.12, g = envGain(c, t0, dur, 0.1 * vel, 0.01, rel, 1); g.connect(out); for (const [k, a] of [[1, 1], [2, 0.5], [3, 0.3], [4, 0.2]]) { const o = c.createOscillator(); o.frequency.value = f * k; const og = c.createGain(); og.gain.value = a; o.connect(og); og.connect(g); o.start(t0); o.stop(t0 + dur + rel * 3); } });
node('brass', (c, m, t0, dur, vel, out) => { // 銅管：兩支鋸齒波、濾波器一開始猛地打開、音高從下面滑上來
  const f = midiHz(m), rel = 0.18, g = envGain(c, t0, dur, 0.12 * vel, 0.035, rel, 0.85), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.2;
  lp.frequency.setValueAtTime(f * 1.2, t0); lp.frequency.linearRampToValueAtTime(Math.min(9000, f * 7), t0 + 0.06); lp.frequency.setTargetAtTime(Math.min(7000, f * 4), t0 + 0.06, 0.15);
  lp.connect(g); g.connect(out);
  for (const d of [-6, 5]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.setValueAtTime(d - 35, t0); o.detune.linearRampToValueAtTime(d, t0 + 0.07); o.connect(lp); o.start(t0); o.stop(t0 + dur + rel * 3); }
});
node('supersaw', (c, m, t0, dur, vel, out) => { const f = midiHz(m), rel = 0.4, g = envGain(c, t0, dur, 0.07 * vel, 0.02, rel, 0.9), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(9000, f * 9); lp.Q.value = 0.6; lp.connect(g); g.connect(out); oscs(c, 'sawtooth', f, [-22, -11, 0, 11, 22], t0, t0 + dur + rel * 3, lp); });
const DRUMS = new Set(['kick', 'snare', 'hat', 'ohat', 'clap', 'crash', 'shaker', 'rim']);

/* ---------- 編曲器 ---------- */
const Music = PZ.music = { songs: {}, cur: null, level: 0.5, _bufs: new Map(), _beats: [], _beatFns: [], _timer: 0, look: 0.18, _out: [] };
Music.define = (name, song) => { Music.songs[name] = song; return song; };
Music.instrument = (name, def) => { INST[name] = def; };
function tokensOf(tr, steps) {
  if (tr.chords) {
    const out = []; for (const ch of tr.chords.trim().split(/\s+/)) { out.push(ch === '.' ? '.' : ch); for (let i = 1; i < (tr.per || steps); i++) out.push('-'); }
    return out;
  }
  const src = (tr.pat || tr.notes || '').replace(/\|/g, ' ').trim();
  if (tr.pat && !/\s/.test(src)) return src.split('');
  return src.split(/\s+/).filter(Boolean);
}
function instBuf(inst, midi, dur) {
  const sr = Aud.ctx.sampleRate, key = inst + '|' + midi + '|' + (DRUMS.has(inst) ? 0 : Math.round(dur * 8));
  let b = Music._bufs.get(key);
  if (!b) {
    const data = INST[inst].render(midi, dur, sr);
    b = Aud.ctx.createBuffer(1, data.length, sr); b.getChannelData(0).set(data);
    if (Music._bufs.size > 400) Music._bufs.clear();
    Music._bufs.set(key, b);
  }
  return b;
}
function playNote(rt, tr, midi, t0, dur, vel) {
  const c = Aud.ctx, I = INST[tr.inst]; if (!I) { warnOnce('inst:' + tr.inst, '沒有這個樂器：' + tr.inst); return; }
  if (I.kind === 'node') { I.play(c, midi, t0, dur, vel, tr.out); return; }
  const s = c.createBufferSource(); s.buffer = instBuf(tr.inst, midi, dur);
  const g = c.createGain(); g.gain.value = vel; s.connect(g); g.connect(tr.out); s.start(t0);
  if (!DRUMS.has(tr.inst) && tr.inst !== 'tom') { const end = t0 + dur + 0.6; try { g.gain.setValueAtTime(vel, end - 0.08); g.gain.linearRampToValueAtTime(0, end); s.stop(end + 0.02); } catch (e) { /* ignore */ } }
}
function scheduleStep(rt, step, time) {
  const def = rt.def, sd = rt.stepDur;
  for (const tr of rt.tracks) {
    if (!tr.on) continue;
    const tok = tr.toks[step % tr.toks.length];
    if (!tok || tok === '.' || tok === '-') continue;
    let n = 1; while (n < tr.toks.length && tr.toks[(step + n) % tr.toks.length] === '-') n++;
    const dur = n * sd * (tr.gate || 0.95);
    const sw = (step % 2 === 1 ? (def.swing || 0) * sd * 0.5 : 0);
    const t = time + sw + (tr.humanize ? Rand.spread(tr.humanize) : 0);
    if (DRUMS.has(tr.inst) || tr.pat) {
      const vel = tok === 'X' ? 1.25 : tok === 'o' ? 0.45 : /^[1-9]$/.test(tok) ? +tok / 6 : 1;
      if (/^[xXo1-9]$/.test(tok)) { const mm = tr.inst === 'tom' ? (tr.note ? noteToMidi(tr.note) : 45) : 0; playNote(rt, tr, mm, t, dur, vel * (tr.vel || 1)); }
      continue;
    }
    if (tr.chords) { const ns = chordNotes(tok, tr.base || 52); if (ns) for (const m of ns) playNote(rt, tr, m + (tr.shift || 0), t, dur, (tr.vel || 1) * 0.8); continue; }
    const midi = noteToMidi(tok); if (midi != null) playNote(rt, tr, midi + (tr.shift || 0), t, dur, tr.vel || 1);
  }
  if (rt.pumpers.length) {   // 跟著大鼓一縮一放（沒有大鼓就每一拍）
    const kick = rt.tracks.find((tr) => tr.inst === 'kick' && tr.on); let hit;
    if (kick) { const tk = kick.toks[step % kick.toks.length]; hit = !!tk && /^[xXo1-9]$/.test(tk); } else hit = step % ((def.steps || 16) / 4) === 0;
    if (hit) for (const tr of rt.pumpers) { const g = tr.pg.gain; g.cancelScheduledValues(time); g.setValueAtTime(1 - tr.def.pump, time); g.setTargetAtTime(1, time + 0.02, sd * 0.9); }
  }
  if (step % (def.steps || 16) === 0) PZ.emit('bar', step / (def.steps || 16));
  if (step % ((def.steps || 16) / 4) === 0) Music._beats.push({ t: time, n: step / ((def.steps || 16) / 4) });
}
function trackActive(tr, lv) { return lv >= (tr.def.min || 0) && lv <= (tr.def.max != null ? tr.def.max : 1); }
function runSong(rt) {
  const c = Aud.ctx; if (!c || rt.stopped) return;
  if (rt.file) return;
  while (rt.next < c.currentTime + Music.look) {
    if (rt.endStep != null && rt.step >= rt.endStep) { fadeOutAt(rt, rt.endAt, rt.endFade); return; }   // 對拍換歌：排到切換點就收
    if (rt.once && rt.step >= rt.len) { rt.stopped = true; PZ.after(rt.stepDur * 8, () => { try { rt.gain.disconnect(); } catch (e) { /* ignore */ } }, { real: true }); return; }
    scheduleStep(rt, rt.step, rt.next);
    rt.next += rt.stepDur; rt.step++;
  }
}
/** 低通截止頻率：lp 給兩個值時跟著緊張度在中間滑（指數內插） */
function trackCut(td, lv) { const L = td.lp; if (!Array.isArray(L)) return L; return L[0] * Math.pow(L[1] / L[0], clamp01(lv)); }
/** 跟拍子對齊的回音（附點八分）：輸入 → 延遲 ⇄ 回授（低通，越回越暗）→ 歌曲音量 */
function makeDelay(c, rt, def) {
  const input = c.createGain(), dl = c.createDelay(2), fb = c.createGain(), lp = c.createBiquadFilter();
  dl.delayTime.value = Math.min(1.9, rt.stepDur * (def.delaySteps || 3)); fb.gain.value = def.feedback != null ? def.feedback : 0.38; lp.type = 'lowpass'; lp.frequency.value = def.delayTone || 2600;
  input.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(rt.gain);
  return input;
}
/** 下一個小節／半小節／拍子的位置 */
function syncPoint(rt, sync) { const steps = rt.def.steps || 16, q = sync === 'beat' ? steps / 4 : sync === 'half' ? steps / 2 : steps, step = Math.ceil(rt.step / q) * q; return { step, time: rt.next + (step - rt.step) * rt.stepDur }; }
function makeRuntime(name, o = {}) {
  const def = Music.songs[name]; if (!def) { warnOnce('song:' + name, '沒有這首配樂：' + name); return null; }
  const c = Aud.ctx, steps = def.steps || 16, stepDur = 60 / (def.bpm || 110) / (steps / 4);
  const gain = c.createGain(); gain.gain.value = 0.0001; gain.connect(o.bus || Aud.bus.music);
  const rt = { name, def, stepDur, step: 0, next: c.currentTime + 0.06, gain, tracks: [], pumpers: [], stopped: false, once: !!o.once || !!def.once, len: 0, delay: null };
  rt.t0 = rt.next;
  if (def.file) { rt.file = true; return rt; }
  for (const td of def.tracks || []) {
    const out = c.createGain(), on = trackActive({ def: td }, Music.level);
    out.gain.value = on ? (td.vol != null ? td.vol : 0.7) : 0.0001;
    let dst = out, lpf = null, pg = null;
    if (td.lp) { lpf = c.createBiquadFilter(); lpf.type = 'lowpass'; lpf.Q.value = td.q || 0.7; lpf.frequency.value = trackCut(td, Music.level); dst.connect(lpf); dst = lpf; }
    if (td.pump) { pg = c.createGain(); pg.gain.value = 1; dst.connect(pg); dst = pg; }
    if (td.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = td.pan; dst.connect(p); dst = p; }
    dst.connect(gain);
    if (td.rev) { const rg = c.createGain(); rg.gain.value = td.rev; out.connect(rg); rg.connect(Aud.revIn); }
    if (td.delay) { const D = rt.delay || (rt.delay = makeDelay(c, rt, def)), sg = c.createGain(); sg.gain.value = td.delay; dst.connect(sg); sg.connect(D); }
    const tr = Object.assign({}, td, { def: td, out, on, lpf, pg, toks: tokensOf(td, steps) });
    if (pg) rt.pumpers.push(tr);
    rt.len = Math.max(rt.len, tr.toks.length);
    rt.tracks.push(tr);
  }
  return rt;
}
/** 播一首（同一首正在播就只調整）；o: { fade（淡入秒數）, intensity } */
Music.play = (name, o = {}) => {
  if (o.intensity != null) Music.level = o.intensity;
  Music._want = { name, o };
  if (!Aud.ctx) return; // 還沒解鎖：解鎖後自動開始
  if (Music.cur && Music.cur.name === name && !Music.cur.stopped) { Music.intensity(Music.level); return; }
  const old = Music.cur, fade = o.fade != null ? o.fade : 1.2, c = Aud.ctx;
  const def = Music.songs[name];
  const rt = makeRuntime(name, o); if (!rt) return;
  const vol = def && def.vol != null ? def.vol : 1;
  if (o.sync && old && !old.stopped && !old.file && !(def && def.file)) {
    // 對拍子換歌：舊的排到下一個小節（拍子）就收，新的剛好從那裡開始
    const sp = syncPoint(old, o.sync); old.endStep = sp.step; old.endAt = sp.time; old.endFade = o.outFade != null ? o.outFade : 0.12;
    Music._out.push(old); rt.next = rt.t0 = sp.time;
    rt.gain.gain.setValueAtTime(0.0001, c.currentTime); rt.gain.gain.setValueAtTime(0.0001, sp.time); rt.gain.gain.exponentialRampToValueAtTime(vol, sp.time + Math.max(0.02, o.inFade != null ? o.inFade : 0.04));
    Music.switchAt = sp.time;
  } else {
    if (old) fadeOut(old, fade);
    if (def && def.file) { startFile(rt, def); }
    rt.gain.gain.setValueAtTime(0.0001, c.currentTime); rt.gain.gain.exponentialRampToValueAtTime(vol, c.currentTime + Math.max(0.05, fade));
    Music.switchAt = c.currentTime;
  }
  Music.cur = rt;
  runSong(rt);
};
/** 在指定時間（音訊時間）淡出收掉 */
function fadeOutAt(rt, at, fade = 0.12) {
  rt.stopped = true; const c = Aud.ctx, g = rt.gain.gain, now = c.currentTime;
  try { const v = Math.max(0.0001, g.value); g.cancelScheduledValues(now); g.setValueAtTime(v, now); g.setValueAtTime(v, Math.max(now, at)); g.exponentialRampToValueAtTime(0.0001, Math.max(now, at) + Math.max(0.02, fade)); } catch (e) { /* ignore */ }
  PZ.after(Math.max(0, at - now) + fade + 0.6, () => { try { rt.gain.disconnect(); } catch (e) { /* ignore */ } }, { real: true });
}
function fadeOut(rt, fade) {
  rt.stopped = true; const c = Aud.ctx, t = c.currentTime;
  try { rt.gain.gain.cancelScheduledValues(t); rt.gain.gain.setValueAtTime(Math.max(0.0001, rt.gain.gain.value), t); rt.gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, fade)); } catch (e) { /* ignore */ }
  if (rt.src) { try { rt.src.stop(t + fade + 0.05); } catch (e) { /* ignore */ } }
  PZ.after(fade + 0.3, () => { try { rt.gain.disconnect(); } catch (e) { /* ignore */ } }, { real: true });
}
Music.stop = (o = {}) => { Music._want = null; if (Music.cur) { fadeOut(Music.cur, o.fade != null ? o.fade : 1); Music.cur = null; } };
/** 緊張度 0～1：決定哪些聲部出現（track 的 min/max） */
Music.intensity = (v, fade = 1.2) => {
  Music.level = clamp01(v); const rt = Music.cur; if (!rt || !Aud.ctx || rt.file) return Music.level;
  const t = Aud.ctx.currentTime;
  for (const tr of rt.tracks) {
    if (tr.lpf && Array.isArray(tr.def.lp)) tr.lpf.frequency.setTargetAtTime(trackCut(tr.def, Music.level), t, fade / 3);
    const on = trackActive(tr, Music.level); if (on === tr.on) continue;
    tr.on = on; const target = on ? (tr.def.vol != null ? tr.def.vol : 0.7) : 0.0001;
    tr.out.gain.cancelScheduledValues(t); tr.out.gain.setValueAtTime(Math.max(0.0001, tr.out.gain.value), t); tr.out.gain.exponentialRampToValueAtTime(target, t + fade);
    if (!on) { tr.on = true; PZ.after(fade, () => { if (!trackActive(tr, Music.level)) tr.on = false; }, { real: true }); }
  }
  return Music.level;
};
/** 短樂句（過關、升級）：播一次，主配樂暫時壓低 */
Music.stinger = (name, o = {}) => {
  if (!Aud.ctx) return;
  if (Sfx.has(name) && !Music.songs[name]) { Aud.duck(0.35, o.duck || 1.2); Sfx.play(name, o); return; }
  const rt = makeRuntime(name, { once: true, bus: Aud.bus.sfx }); if (!rt) return;
  if (o.sync && Music.cur && !Music.cur.stopped && !Music.cur.file) { const sp = syncPoint(Music.cur, o.sync); rt.next = rt.t0 = sp.time; }
  Aud.duck(0.3, rt.len * rt.stepDur + 0.5 + Math.max(0, rt.next - Aud.ctx.currentTime));
  rt.gain.gain.setValueAtTime(o.vol || 1, Aud.ctx.currentTime);
  (Music._stingers || (Music._stingers = [])).push(rt);
  runSong(rt);
};
/** 用音檔當配樂：PZ.music.file('theme', 'data:audio/mp3;base64,…', { vol: 0.8 }) */
Music.file = (name, url, o = {}) => { Music.songs[name] = Object.assign({ file: url, loop: true }, o); };
async function startFile(rt, def) {
  try {
    let b = Music._bufs.get('file:' + def.file);
    if (!b) { const res = await fetch(def.file), ab = await res.arrayBuffer(); b = await new Promise((ok, no) => Aud.ctx.decodeAudioData(ab, ok, no)); Music._bufs.set('file:' + def.file, b); }
    if (rt.stopped) return;
    const s = Aud.ctx.createBufferSource(); s.buffer = b; s.loop = def.loop !== false; if (def.loopStart != null) { s.loopStart = def.loopStart; s.loopEnd = def.loopEnd || b.duration; }
    s.connect(rt.gain); s.start(); rt.src = s;
  } catch (e) { reportError(e, 'music.file'); }
}
/** 配樂悶住（0～1；暫停選單、水底、被打暈）：低通慢慢壓下去／打開 */
Music.muffle = (amount = 1, time = 0.4) => {
  Music._muffle = amount; if (!Aud.ctx || !Aud.musicLP) return;
  const f = amount <= 0.001 ? 20000 : 20000 * Math.pow(380 / 20000, clamp01(amount));
  Aud.musicLP.frequency.setTargetAtTime(f, Aud.ctx.currentTime, Math.max(0.01, time / 3));
};
/** 這一拍走到哪（0＝拍點、接近 1＝下一拍之前）：畫面跟著節奏一跳一跳 */
Music.phase = () => {
  const rt = Music.cur; if (!rt || !Aud.ctx || rt.file || rt.stopped) return 0;
  const beat = rt.stepDur * ((rt.def.steps || 16) / 4), t = Aud.ctx.currentTime - rt.t0;
  return t < 0 ? 0 : (t / beat) % 1;
};
/** 每一拍呼叫（跟音樂對拍：UI 脈動、燈光閃爍） */
Music.onBeat = (fn) => { Music._beatFns.push(fn); return () => { const i = Music._beatFns.indexOf(fn); if (i >= 0) Music._beatFns.splice(i, 1); }; };
PZ.on('audio', () => { if (Music._want) Music.play(Music._want.name, Object.assign({}, Music._want.o, { fade: 1.5, sync: null })); if (Music._muffle) Music.muffle(Music._muffle, 0.05); });
addSystem({
  name: 'music', order: 32,
  frame() {
    if (!Aud.ctx) return;
    if (Music.cur) runSong(Music.cur);
    for (let i = 0; i < Music._out.length; i++) { const r = Music._out[i]; runSong(r); if (r.stopped) Music._out.splice(i--, 1); }
    if (Music._stingers) for (let i = 0; i < Music._stingers.length; i++) { const s = Music._stingers[i]; runSong(s); if (s.stopped) Music._stingers.splice(i--, 1); }
    const t = Aud.ctx.currentTime;
    while (Music._beats.length && Music._beats[0].t <= t) { const b = Music._beats.shift(); for (const f of Music._beatFns) safeCall(f, null, b.n); }
    if (Music._beats.length > 64) Music._beats.splice(0, Music._beats.length - 64);
  },
});
// 背景時 requestAnimationFrame 會停：用計時器補排程（避免切回來時斷拍）
if (HAS_DOM) setInterval(() => { if (Aud.ctx && Aud.ctx.state === 'running' && document.hidden === false) { if (Music.cur) runSong(Music.cur); for (const r of Music._out) runSong(r); } }, 50);
