// 即時合成的配樂與音效（不需要任何音檔）
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function midi(s) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(s);
  if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 「C4 1, E4+G4 .5, r 1」→ [{t, notes, d}]
function parse(seq) {
  const out = []; let t = 0;
  for (const tok of seq.split(/[,\n]+/).map((x) => x.trim()).filter(Boolean)) {
    const [n, d0, v0] = tok.split(/\s+/);
    const d = parseFloat(d0 || '1'), v = v0 ? parseFloat(v0) : 1;
    if (n !== 'r') out.push({ t, notes: n.split('+').map(midi), d, v });
    t += d;
  }
  return withRep({ notes: out, len: t });
}
function withRep(o) { Object.defineProperty(o, 'repeat', { enumerable: false, value: (n) => withRep(rep(o, n)) }); return o; }

// 和弦分解：給每小節的和弦，自動產生琶音
function arp(chords, pattern, beatsPerChord = 4, step = 0.5, vel = 0.8) {
  const out = []; let t = 0;
  for (const ch of chords) {
    const ns = ch.split('+').map(midi);
    for (let b = 0; b < beatsPerChord; b += step) {
      const idx = pattern[Math.round(b / step) % pattern.length];
      const n = idx >= ns.length ? ns[idx % ns.length] + 12 : ns[idx];
      out.push({ t: t + b, notes: [n], d: step * 1.8, v: vel * (b === 0 ? 1 : 0.8) });
    }
    t += beatsPerChord;
  }
  return { notes: out, len: t };
}
function held(chords, beats = 4, vel = 0.7) {
  return { notes: chords.map((c, i) => ({ t: i * beats, notes: c.split('+').map(midi), d: beats, v: vel })), len: chords.length * beats };
}
function drums(pattern, bars, beats = 4) {
  // pattern: {kick:'x...x...', snare:'....x...', hat:'x.x.x.x.'}，每一格是 1/2 拍
  const out = [];
  for (let b = 0; b < bars; b++) for (const [k, p] of Object.entries(pattern)) for (let i = 0; i < p.length; i++) {
    if (p[i] === 'x' || p[i] === 'o') out.push({ t: b * beats + i * (beats / p.length), notes: [0], d: 0.25, v: p[i] === 'o' ? 0.5 : 1, drum: k });
  }
  return { notes: out, len: bars * beats };
}

const TRACKS = {
  title: () => {
    const ch = ['D3+F3+A3', 'Bb2+D3+F3', 'F3+A3+C4', 'C3+E3+G3', 'D3+F3+A3', 'Bb2+D3+F3', 'G2+Bb2+D3', 'A2+C#3+E3'];
    return { bpm: 72, parts: [
      { inst: 'harp', vol: 0.32, seq: arp(ch.map((c) => c.split('+').map((n) => n.replace(/(\d)$/, (d) => +d + 1)).join('+')), [0, 1, 2, 3, 2, 1, 0, 2]) },
      { inst: 'bell', vol: 0.22, seq: parse('A4 2, G4 1, F4 1, F4 2, E4 1, D4 1, C5 3, A4 1, G4 4, A4 2, C5 1, D5 1, D5 2, C5 1, Bb4 1, Bb4 2, A4 1, G4 1, A4 4') },
      { inst: 'pad', vol: 0.12, seq: held(ch) },
      { inst: 'bass', vol: 0.22, seq: parse('D2 4, Bb1 4, F2 4, C2 4, D2 4, Bb1 4, G1 4, A1 4') },
    ] };
  },
  cape: () => {
    const ch = ['A2+C3+E3', 'F2+A2+C3', 'C3+E3+G3', 'G2+B2+D3', 'A2+C3+E3', 'F2+A2+C3', 'D3+F3+A3', 'E2+G#2+B2'];
    return { bpm: 64, parts: [
      { inst: 'harp', vol: 0.26, seq: arp(ch.map((c) => c.split('+').map((n) => n.replace(/(\d)$/, (d) => +d + 1)).join('+')), [0, 2, 1, 2, 3, 2, 1, 2], 4, 0.5, 0.7) },
      { inst: 'flute', vol: 0.16, seq: parse('r 2, E5 1, D5 1, C5 3, B4 1, G4 2, A4 1, B4 1, D5 4, r 2, E5 1, G5 1, F5 2, E5 1, D5 1, D5 2, C5 1, A4 1, B4 4') },
      { inst: 'pad', vol: 0.1, seq: held(ch) },
      { inst: 'bass', vol: 0.16, seq: parse('A1 4, F1 4, C2 4, G1 4, A1 4, F1 4, D2 4, E1 4') },
    ] };
  },
  harbor: () => {
    const prog = ['F2', 'C2', 'D2', 'Bb1', 'F2', 'C2', 'Bb1', 'F2'];
    const chords = ['A3+C4+F4', 'G3+C4+E4', 'A3+D4+F4', 'Bb3+D4+F4', 'A3+C4+F4', 'G3+C4+E4', 'Bb3+D4+G4', 'A3+C4+F4'];
    const oom = { notes: [], len: 24 };
    prog.forEach((b, i) => { oom.notes.push({ t: i * 3, notes: [midi(b)], d: 1, v: 0.9 }); const c = chords[i].split('+').map(midi); oom.notes.push({ t: i * 3 + 1, notes: c, d: 0.8, v: 0.55 }, { t: i * 3 + 2, notes: c, d: 0.8, v: 0.5 }); });
    return { bpm: 104, parts: [
      { inst: 'pluck', vol: 0.24, seq: oom },
      { inst: 'accordion', vol: 0.14, seq: parse('C5 1, F5 1, A5 1, G5 2, E5 1, F5 1.5, E5 .5, D5 1, D5 3, C5 1, F5 1, A5 1, C6 2, A5 1, Bb5 1, A5 1, G5 1, F5 3') },
      { inst: 'harp', vol: 0.12, seq: parse('r 12, A5 .5, C6 .5, A5 .5, F5 .5, r 2, r 6, C6 .5, A5 .5, F5 .5, C5 .5, r 1') },
    ] };
  },
  flats: () => {
    const ch = ['A2+E3+A3', 'F2+C3+F3', 'G2+D3+G3', 'E2+B2+E3', 'A2+E3+A3', 'F2+C3+F3', 'D3+A3+D4', 'E2+G#2+B2'];
    return { bpm: 116, parts: [
      { inst: 'strings', vol: 0.12, seq: arp(ch.map((c) => c.split('+').map((n) => n.replace(/(\d)$/, (d) => +d + 1)).join('+')), [0, 1, 2, 1], 4, 0.5, 0.7) },
      { inst: 'flute', vol: 0.17, seq: parse('A4 1.5, B4 .5, C5 1, E5 1, D5 2, C5 1, A4 1, B4 1.5, C5 .5, D5 1, G5 1, E5 4, A5 1.5, G5 .5, E5 1, C5 1, D5 1.5, E5 .5, F5 1, A5 1, G5 1.5, F5 .5, E5 1, D5 1, E5 4') },
      { inst: 'bass', vol: 0.2, seq: parse('A1 1, A1 1, A2 1, A1 1, F1 1, F1 1, F2 1, F1 1, G1 1, G1 1, G2 1, G1 1, E1 1, E1 1, E2 1, E1 1, A1 1, A1 1, A2 1, A1 1, F1 1, F1 1, F2 1, F1 1, D2 1, D2 1, D3 1, D2 1, E1 1, E1 1, E2 1, G#1 1') },
      { inst: 'drum', vol: 0.32, seq: drums({ kick: 'x...x...', snare: '..o...o.', hat: 'oxoxoxox' }, 8) },
    ] };
  },
  ruins: () => ({ bpm: 66, parts: [
    { inst: 'pad', vol: 0.12, seq: held(['E2+B2+E3', 'F2+C3+F3', 'E2+B2+E3', 'D2+A2+D3', 'E2+B2+E3', 'F2+C3+F3', 'G2+D3+G3', 'F2+C3+F3']) },
    { inst: 'harp', vol: 0.18, seq: parse('E4 .5, G4 .5, B4 .5, r 2.5, F4 .5, A4 .5, C5 .5, r 2.5, E4 .5, B4 .5, E5 .5, r 2.5, D4 .5, F4 .5, A4 .5, r 2.5, E4 .5, G4 .5, B4 .5, r 2.5, F4 .5, A4 .5, C5 .5, r 2.5, G4 .5, B4 .5, D5 .5, r 2.5, F4 .5, B4 .5, E5 .5, r 2.5') },
    { inst: 'bell', vol: 0.14, seq: parse('r 3, B4 5, r 3, C5 5, r 3, A4 5, r 3, E4 5') },
    { inst: 'choir', vol: 0.07, seq: held(['E4+B4', 'F4+C5', 'E4+B4', 'D4+A4', 'E4+B4', 'F4+C5', 'G4+D5', 'F4+B4']) },
  ] }),
  battle: () => ({ bpm: 150, parts: [
    { inst: 'bass', vol: 0.3, seq: parse('D2 .5, D2 .5, D3 .5, D2 .5, D2 .5, D3 .5, C3 .5, D3 .5, Bb1 .5, Bb1 .5, Bb2 .5, Bb1 .5, Bb1 .5, Bb2 .5, A2 .5, Bb2 .5, C2 .5, C2 .5, C3 .5, C2 .5, C2 .5, C3 .5, Bb2 .5, C3 .5, A1 .5, A1 .5, A2 .5, A1 .5, C#2 .5, E2 .5, G2 .5, A2 .5').repeat(2) },
    { inst: 'strings', vol: 0.15, seq: parse('D5 1.5, E5 .5, F5 1, A5 1, G5 1.5, F5 .5, E5 1, D5 1, C5 1.5, D5 .5, E5 1, G5 1, A5 4, D6 1.5, C6 .5, A5 1, F5 1, G5 1.5, A5 .5, Bb5 1, A5 1, G5 1, F5 1, E5 1, G5 1, A5 2, C#6 2') },
    { inst: 'brass', vol: 0.14, seq: parse('D4+F4+A4 .5, r 1.5, D4+F4+A4 .5, r 1.5, D4+F4+Bb4 .5, r 1.5, D4+F4+Bb4 .5, r 1.5, E4+G4+C5 .5, r 1.5, E4+G4+C5 .5, r 1.5, E4+A4+C#5 2, E4+A4+C#5 2').repeat(2) },
    { inst: 'drum', vol: 0.4, seq: drums({ kick: 'x..x..x.', snare: '..x...x.', hat: 'xxxxxxxx' }, 16) },
  ] }),
  boss: () => ({ bpm: 138, parts: [
    { inst: 'bass', vol: 0.32, seq: parse('C2 .5, C2 .5, C3 .5, C2 .5, Eb2 .5, C2 .5, G2 .5, C2 .5, Ab1 .5, Ab1 .5, Ab2 .5, Ab1 .5, C2 .5, Ab1 .5, Eb2 .5, Ab1 .5, Bb1 .5, Bb1 .5, Bb2 .5, Bb1 .5, D2 .5, Bb1 .5, F2 .5, Bb1 .5, G1 .5, G1 .5, G2 .5, G1 .5, B1 .5, D2 .5, F2 .5, G2 .5').repeat(2) },
    { inst: 'organ', vol: 0.09, seq: held(['C4+Eb4+G4', 'Ab3+C4+Eb4', 'Bb3+D4+F4', 'G3+B3+D4', 'C4+Eb4+G4', 'Ab3+C4+Eb4', 'F3+Ab3+C4', 'G3+B3+D4+F4']) },
    { inst: 'strings', vol: 0.15, seq: parse('G5 1, Ab5 1, G5 1, Eb5 1, C5 2, Eb5 1, D5 1, Bb4 1.5, C5 .5, D5 1, F5 1, D5 4, G5 1, Ab5 1, Bb5 1, C6 1, Ab5 2, G5 1, F5 1, Eb5 1, D5 1, C5 1, D5 1, B4 4') },
    { inst: 'choir', vol: 0.06, seq: held(['C5+G5', 'C5+Ab5', 'D5+F5', 'B4+D5', 'C5+G5', 'C5+Ab5', 'C5+F5', 'B4+D5']) },
    { inst: 'drum', vol: 0.42, seq: drums({ kick: 'x..xx..x', snare: '....x...', hat: 'x.x.x.x.', timp: 'x.......' }, 16) },
  ] }),
  final: () => ({ bpm: 146, parts: [
    { inst: 'bass', vol: 0.32, seq: parse('E2 .5, E2 .5, E3 .5, E2 .5, G2 .5, E2 .5, B2 .5, E2 .5, C2 .5, C2 .5, C3 .5, C2 .5, E2 .5, C2 .5, G2 .5, C2 .5, D2 .5, D2 .5, D3 .5, D2 .5, F#2 .5, D2 .5, A2 .5, D2 .5, B1 .5, B1 .5, B2 .5, B1 .5, D#2 .5, F#2 .5, A2 .5, B2 .5').repeat(2) },
    { inst: 'brass', vol: 0.15, seq: parse('E4+G4+B4 1, r 1, E4+G4+B4 .5, E4+G4+B4 .5, r 1, C4+E4+G4 1, r 1, C4+E4+G4 .5, C4+E4+G4 .5, r 1, D4+F#4+A4 1, r 1, D4+F#4+A4 .5, D4+F#4+A4 .5, r 1, B3+D#4+F#4 2, B3+D#4+F#4 2').repeat(2) },
    { inst: 'strings', vol: 0.15, seq: parse('B5 1.5, A5 .5, G5 1, E5 1, G5 1.5, A5 .5, B5 1, C6 1, D6 1.5, C6 .5, B5 1, A5 1, B5 4, E6 1.5, D6 .5, B5 1, G5 1, C6 1.5, B5 .5, A5 1, G5 1, F#5 1, G5 1, A5 1, F#5 1, D#5 4') },
    { inst: 'drum', vol: 0.42, seq: drums({ kick: 'x.xx..x.', snare: '..x...x.', hat: 'xxxxxxxx' }, 16) },
  ] }),
  sad: () => ({ bpm: 58, parts: [
    { inst: 'harp', vol: 0.24, seq: arp(['C4+E4+G4', 'B3+D4+G4', 'A3+C4+E4', 'F3+A3+C4', 'C4+E4+G4', 'F3+A3+C4', 'G3+B3+D4', 'C4+E4+G4'], [0, 1, 2, 3, 2, 1], 3, 0.5, 0.7) },
    { inst: 'strings', vol: 0.12, seq: parse('E5 2, D5 1, D5 2, B4 1, C5 2, A4 1, A4 3, G4 2, C5 1, A4 2, F4 1, G4 2, D5 1, C5 3') },
    { inst: 'pad', vol: 0.08, seq: held(['C3+G3', 'G2+D3', 'A2+E3', 'F2+C3', 'C3+G3', 'F2+C3', 'G2+D3', 'C3+G3'], 3) },
  ], beats: 3 }),
  victory: () => ({ bpm: 128, once: true, parts: [
    { inst: 'brass', vol: 0.2, seq: parse('C5 .33, C5 .33, C5 .33, C5 1, Ab4 1, Bb4 1, C5 .66, Bb4 .33, C5 3') },
    { inst: 'harp', vol: 0.2, seq: parse('C4+E4+G4 1, r 2, Ab3+C4+Eb4 1, Bb3+D4+F4 1, C4+E4+G4+C5 3') },
    { inst: 'drum', vol: 0.35, seq: drums({ timp: 'x.x.x.x.' }, 1) },
  ] }),
  gameover: () => ({ bpm: 60, once: true, parts: [
    { inst: 'harp', vol: 0.25, seq: parse('A4 1, E4 1, C4 1, A3 3') },
    { inst: 'pad', vol: 0.12, seq: held(['A2+E3+A3'], 6) },
  ] }),
};
// 給 parse 結果加 repeat
function rep(s, n) { const out = { notes: [], len: s.len * n }; for (let i = 0; i < n; i++) for (const x of s.notes) out.notes.push({ ...x, t: x.t + s.len * i }); return out; }

export class Sound {
  constructor() { this.ctx = null; this.music = 0.55; this.sfxV = 0.8; this.cur = null; this.curName = null; this.timer = null; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ctx = new C();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(ctx.destination);
    this.master = ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(comp);
    this.mBus = ctx.createGain(); this.mBus.gain.value = this.music; this.mBus.connect(this.master);
    this.sBus = ctx.createGain(); this.sBus.gain.value = this.sfxV; this.sBus.connect(this.master);
    // 殘響
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.rev = ctx.createConvolver(); this.rev.buffer = ir;
    const rg = ctx.createGain(); rg.gain.value = 0.34; this.rev.connect(rg); rg.connect(this.master);
    this.revSend = ctx.createGain(); this.revSend.gain.value = 1; this.revSend.connect(this.rev);
    // 雜訊
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    this.ambient = null;
  }
  setVol(m, s) { this.music = m; this.sfxV = s; if (this.ctx) { this.mBus.gain.value = m; this.sBus.gain.value = s; } }
  // ---------- 樂器 ----------
  voice(inst, f, t, d, v, out) {
    const c = this.ctx;
    const g = c.createGain(); g.connect(out);
    const send = c.createGain(); send.gain.value = { harp: 0.5, bell: 0.7, pad: 0.6, flute: 0.5, strings: 0.45, choir: 0.7, organ: 0.4 }[inst] ?? 0.2;
    g.connect(send); send.connect(this.revSend);
    const env = (a, dec, sus, rel) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + a);
      g.gain.setTargetAtTime(v * sus, t + a, dec);
      g.gain.setTargetAtTime(0.0001, t + d, rel);
    };
    const osc = (type, freq, det = 0, dest = g) => { const o = c.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = det; o.connect(dest); o.start(t); o.stop(t + d + 2.5); return o; };
    if (inst === 'harp') { env(0.004, 0.35, 0.0, 0.3); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.connect(g); osc('triangle', f, 0, lp); const g2 = c.createGain(); g2.gain.value = 0.25; g2.connect(lp); osc('sine', f * 2, 0, g2); }
    else if (inst === 'bell') { env(0.003, 0.9, 0.0, 0.8); const car = c.createOscillator(); car.type = 'sine'; car.frequency.value = f; const mod = c.createOscillator(); mod.frequency.value = f * 3.5; const mg = c.createGain(); mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 1.2); mod.connect(mg); mg.connect(car.frequency); car.connect(g); car.start(t); mod.start(t); car.stop(t + d + 3); mod.stop(t + d + 3); }
    else if (inst === 'pad' || inst === 'choir') { env(0.5, 1.5, 0.85, 0.9); const lp = c.createBiquadFilter(); lp.type = inst === 'choir' ? 'bandpass' : 'lowpass'; lp.frequency.value = inst === 'choir' ? 900 : 1100; lp.Q.value = inst === 'choir' ? 1.4 : 0.6; lp.connect(g); osc('sawtooth', f, -8, lp); osc('sawtooth', f, 8, lp); if (inst === 'choir') osc('triangle', f, 0, lp); }
    else if (inst === 'strings') { env(0.09, 0.6, 0.8, 0.25); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(g); const lfo = c.createOscillator(); lfo.frequency.value = 5.2; const lg = c.createGain(); lg.gain.value = 6; lfo.connect(lg); lfo.start(t); lfo.stop(t + d + 1); for (const det of [-7, 0, 7]) { const o = osc('sawtooth', f, det, lp); lg.connect(o.detune); } }
    else if (inst === 'flute') { env(0.06, 0.5, 0.85, 0.18); const lfo = c.createOscillator(); lfo.frequency.value = 5; const lg = c.createGain(); lg.gain.value = 9; lfo.connect(lg); lfo.start(t); lfo.stop(t + d + 1); const o = osc('sine', f, 0); lg.connect(o.detune); const g3 = c.createGain(); g3.gain.value = 0.18; g3.connect(g); osc('triangle', f * 2, 0, g3); }
    else if (inst === 'bass') { env(0.006, 0.3, 0.6, 0.08); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(g); osc('triangle', f, 0, lp); osc('sine', f / 2, 0, lp); }
    else if (inst === 'pluck' || inst === 'accordion') {
      if (inst === 'pluck') env(0.003, 0.25, 0.0, 0.2); else env(0.03, 0.4, 0.8, 0.12);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
      lp.frequency.setValueAtTime(inst === 'pluck' ? 3800 : 2000, t); lp.frequency.exponentialRampToValueAtTime(inst === 'pluck' ? 500 : 1500, t + 0.3); lp.connect(g);
      osc(inst === 'pluck' ? 'sawtooth' : 'square', f, 0, lp); if (inst === 'accordion') osc('sawtooth', f, 9, lp);
    }
    else if (inst === 'brass') { env(0.03, 0.3, 0.7, 0.1); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2600, t + 0.06); lp.frequency.setTargetAtTime(1300, t + 0.08, 0.2); lp.connect(g); osc('sawtooth', f, -4, lp); osc('sawtooth', f, 4, lp); }
    else if (inst === 'organ') { env(0.05, 0.5, 0.9, 0.2); for (const [m, a] of [[1, 1], [2, 0.5], [3, 0.3], [4, 0.2]]) { const gg = c.createGain(); gg.gain.value = a; gg.connect(g); osc('sine', f * m, 0, gg); } }
  }
  drum(kind, t, v, out) {
    const c = this.ctx, g = c.createGain(); g.connect(out);
    if (kind === 'kick') { const o = c.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g); o.start(t); o.stop(t + 0.32); return; }
    const n = c.createBufferSource(); n.buffer = this.noiseBuf; const f = c.createBiquadFilter();
    if (kind === 'snare') { f.type = 'bandpass'; f.frequency.value = 1800; g.gain.setValueAtTime(v * 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); const o = c.createOscillator(); o.frequency.value = 190; const og = c.createGain(); og.gain.setValueAtTime(v * 0.4, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.12); }
    else if (kind === 'hat') { f.type = 'highpass'; f.frequency.value = 7500; g.gain.setValueAtTime(v * 0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); }
    else if (kind === 'timp') { const o = c.createOscillator(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.5); const og = c.createGain(); og.gain.setValueAtTime(v * 0.9, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.9); o.connect(og); og.connect(out); o.start(t); o.stop(t + 1); f.type = 'lowpass'; f.frequency.value = 400; g.gain.setValueAtTime(v * 0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); }
    n.connect(f); f.connect(g); n.start(t); n.stop(t + 0.4);
  }
  // ---------- 配樂 ----------
  play(name, fade = 1.2) {
    if (!this.ctx || this.curName === name) return;
    this.stopMusic(fade);
    if (!name || !TRACKS[name]) return;
    const def = TRACKS[name]();
    def.parts.forEach((p) => { if (p.seq.repeat) { } });
    const c = this.ctx;
    const bus = c.createGain(); bus.gain.setValueAtTime(0.0001, c.currentTime); bus.gain.linearRampToValueAtTime(1, c.currentTime + 0.6); bus.connect(this.mBus);
    const spb = 60 / def.bpm;
    const loopBeats = Math.max(...def.parts.map((p) => p.seq.len));
    const st = { name, def, bus, start: c.currentTime + 0.12, spb, loopBeats, next: 0, parts: def.parts.map((p) => ({ ...p, i: 0, loop: 0 })), once: def.once };
    this.cur = st; this.curName = name;
    const tick = () => {
      if (this.cur !== st) return;
      const until = c.currentTime + 0.25;
      for (const p of st.parts) {
        for (let guard = 0; guard < 64; guard++) {
          const n = p.seq.notes[p.i];
          if (!n) { if (st.once) break; p.i = 0; p.loop++; continue; }
          const tt = st.start + (n.t + p.loop * st.loopBeats) * spb;
          if (tt > until) break;
          if (tt > c.currentTime - 0.05) {
            if (n.drum) this.drum(n.drum, tt, n.v * p.vol * 2, bus);
            else for (const m of n.notes) if (m != null) this.voice(p.inst, hz(m), tt, n.d * spb, n.v * p.vol * 0.5, bus);
          }
          p.i++;
        }
      }
    };
    tick();
    st.timer = setInterval(tick, 60);
  }
  stopMusic(fade = 1) {
    const st = this.cur; if (!st) return;
    clearInterval(st.timer);
    const c = this.ctx;
    st.bus.gain.cancelScheduledValues(c.currentTime);
    st.bus.gain.setValueAtTime(st.bus.gain.value, c.currentTime);
    st.bus.gain.linearRampToValueAtTime(0.0001, c.currentTime + fade);
    setTimeout(() => st.bus.disconnect(), fade * 1000 + 3000);
    this.cur = null; this.curName = null;
  }
  // 環境音（海浪、風）
  amb(kind) {
    if (!this.ctx) return;
    if (this.ambient) { const a = this.ambient; a.g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.5); setTimeout(() => { try { a.src.stop(); } catch (e) { } }, 2500); this.ambient = null; }
    if (!kind) return;
    const c = this.ctx, src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = kind === 'wind' ? 'bandpass' : 'lowpass'; f.frequency.value = kind === 'wind' ? 600 : 420; f.Q.value = kind === 'wind' ? 0.8 : 0.5;
    const g = c.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(kind === 'cave' ? 0.05 : 0.1, c.currentTime, 1);
    const lfo = c.createOscillator(); lfo.frequency.value = kind === 'wind' ? 0.13 : 0.09; const lg = c.createGain(); lg.gain.value = kind === 'wind' ? 300 : 160; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
    this.ambient = { src, g };
  }
  // ---------- 音效 ----------
  sfx(name, v = 1) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + 0.005, out = this.sBus;
    const tone = (type, f0, f1, dur, vol, at = t, rev = 0.2) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, at); if (f1) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
      g.gain.setValueAtTime(vol * v, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur); o.connect(g); g.connect(out);
      if (rev) { const s = c.createGain(); s.gain.value = rev; g.connect(s); s.connect(this.revSend); }
      o.start(at); o.stop(at + dur + 0.05);
    };
    const noise = (ft, freq, dur, vol, at = t, q = 1, f1) => {
      const n = c.createBufferSource(); n.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = ft; f.frequency.setValueAtTime(freq, at); if (f1) f.frequency.exponentialRampToValueAtTime(f1, at + dur); f.Q.value = q;
      const g = c.createGain(); g.gain.setValueAtTime(vol * v, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      n.connect(f); f.connect(g); g.connect(out); n.start(at, Math.random()); n.stop(at + dur + 0.05);
    };
    const bellN = (f, at, vol, dur = 1.8) => this.voice('bell', f, at, dur * 0.4, vol * v, out);
    switch (name) {
      case 'tick': tone('sine', 1320, 0, 0.05, 0.08, t, 0); break;
      case 'ok': tone('sine', 880, 0, 0.07, 0.12, t, 0.1); tone('sine', 1320, 0, 0.1, 0.12, t + 0.06, 0.1); break;
      case 'back': tone('sine', 660, 440, 0.1, 0.1, t, 0); break;
      case 'talk': tone('triangle', 520 + Math.random() * 60, 0, 0.03, 0.04, t, 0); break;
      case 'step': noise('lowpass', 500, 0.05, 0.05); break;
      case 'slash': noise('highpass', 2500, 0.16, 0.5, t, 0.7, 6000); tone('sawtooth', 900, 250, 0.12, 0.08); break;
      case 'pierce': noise('bandpass', 3500, 0.09, 0.5, t, 2); tone('square', 1600, 600, 0.05, 0.06); break;
      case 'blunt': tone('sine', 140, 45, 0.22, 0.6, t, 0.1); noise('lowpass', 800, 0.15, 0.4); break;
      case 'fire': for (let i = 0; i < 6; i++) noise('bandpass', 900 + Math.random() * 1600, 0.12, 0.3, t + i * 0.035, 1.2); tone('sawtooth', 220, 110, 0.35, 0.08); break;
      case 'tide': noise('lowpass', 1800, 0.5, 0.45, t, 0.6, 300); for (let i = 0; i < 4; i++) tone('sine', 500 + Math.random() * 500, 1200, 0.07, 0.07, t + 0.05 + i * 0.06); break;
      case 'light': [1046, 1318, 1568, 2093].forEach((f, i) => bellN(f, t + i * 0.05, 0.12)); noise('highpass', 6000, 0.3, 0.12); break;
      case 'shadow': tone('sawtooth', 220, 55, 0.6, 0.18, t, 0.6); tone('sawtooth', 233, 58, 0.6, 0.14, t, 0.6); noise('lowpass', 600, 0.5, 0.2); break;
      case 'weak': tone('triangle', 1760, 0, 0.18, 0.16, t, 0.3); tone('triangle', 2637, 0, 0.22, 0.1, t + 0.04, 0.3); break;
      case 'break': for (let i = 0; i < 10; i++) tone('sine', 2000 + Math.random() * 4000, 0, 0.12 + Math.random() * 0.2, 0.08, t + Math.random() * 0.12, 0.4); noise('highpass', 3000, 0.4, 0.5); tone('sine', 90, 40, 0.5, 0.7, t, 0.2); break;
      case 'phase': this.voice('bell', 98, t, 1.2, 0.5 * v, out); this.voice('bell', 196, t + 0.02, 1.2, 0.3 * v, out); noise('bandpass', 400, 1.4, 0.35, t, 0.7, 4000); break;
      case 'heal': [523, 659, 784, 1046].forEach((f, i) => this.voice('harp', f, t + i * 0.07, 0.3, 0.18 * v, out)); break;
      case 'buff': tone('sine', 440, 1760, 0.4, 0.12, t, 0.5); tone('sine', 660, 2640, 0.4, 0.08, t + 0.05, 0.5); break;
      case 'debuff': tone('sine', 880, 220, 0.4, 0.12, t, 0.4); break;
      case 'hurt': noise('lowpass', 1200, 0.18, 0.45); tone('square', 200, 90, 0.12, 0.08); break;
      case 'miss': noise('highpass', 4000, 0.12, 0.15, t, 0.5, 9000); break;
      case 'ko': tone('sine', 300, 60, 0.5, 0.3, t, 0.4); noise('lowpass', 900, 0.6, 0.25); break;
      case 'charge': tone('sawtooth', 110, 440, 1.0, 0.12, t, 0.6); noise('bandpass', 300, 1, 0.2, t, 1, 2400); break;
      case 'ult': noise('bandpass', 200, 0.8, 0.5, t, 0.8, 5000); tone('sawtooth', 55, 220, 0.8, 0.2, t, 0.5); break;
      case 'boom': tone('sine', 80, 30, 0.9, 0.9, t, 0.3); noise('lowpass', 600, 0.8, 0.6, t, 0.7, 120); break;
      case 'levelup': [523, 659, 784, 1046, 1318].forEach((f, i) => this.voice('bell', f, t + i * 0.08, 0.4, 0.14 * v, out)); break;
      case 'coin': tone('square', 1568, 0, 0.06, 0.06, t, 0.1); tone('square', 2093, 0, 0.12, 0.06, t + 0.06, 0.1); break;
      case 'chest': tone('sawtooth', 160, 120, 0.25, 0.06, t, 0); [784, 988, 1175, 1568].forEach((f, i) => bellN(f, t + 0.2 + i * 0.06, 0.12)); break;
      case 'door': tone('sine', 120, 70, 0.2, 0.4, t, 0.2); noise('lowpass', 500, 0.2, 0.2); break;
      case 'splash': noise('lowpass', 2500, 0.35, 0.4, t, 0.6, 400); tone('sine', 700, 200, 0.12, 0.15); break;
      case 'reel': for (let i = 0; i < 4; i++) noise('bandpass', 3000, 0.02, 0.15, t + i * 0.04, 4); break;
      case 'bite': tone('sine', 900, 300, 0.1, 0.3, t, 0.1); noise('lowpass', 2000, 0.15, 0.3); break;
      case 'lamp': this.voice('bell', 392, t, 0.6, 0.3 * v, out); this.voice('bell', 587, t + 0.06, 0.6, 0.2 * v, out); noise('bandpass', 1200, 0.6, 0.25, t, 1, 5000); break;
      case 'encounter': noise('bandpass', 300, 0.6, 0.4, t, 1, 3000); tone('sawtooth', 220, 880, 0.35, 0.12, t, 0.3); tone('sawtooth', 330, 1320, 0.35, 0.08, t + 0.05, 0.3); break;
      case 'steal': tone('sine', 1200, 2400, 0.12, 0.1, t, 0.2); tone('sine', 1800, 3600, 0.12, 0.08, t + 0.08, 0.2); break;
      case 'shine': [1568, 2093, 2637].forEach((f, i) => bellN(f, t + i * 0.09, 0.08)); break;
      default: tone('sine', 660, 0, 0.08, 0.08);
    }
  }
}

