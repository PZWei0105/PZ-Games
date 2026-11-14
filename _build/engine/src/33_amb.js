/* ==========================================================================
   33 環境音（音景）：雨、雷雨、風、森林、夜晚、洞窟、海邊、城市、營火、船艙、溪流
     PZ.amb.play('rain', { fade: 2 })        換成這個音景（其他的淡出）
     PZ.amb.mix({ fire: 1, night: 0.6 })    同時好幾種、各自音量
     PZ.amb.set('wind', 0.4)                只調一種，其他不動        PZ.amb.stop({ fade: 2 })
     PZ.amb.follow(true)                    跟著 PZ.weather：下雨就有雨聲、雷雨有遠雷、下雪／起霧有風
     PZ.amb.define('lab', { beds: [...], events: [...] })   自己做（欄位見下面的預設）
   全部即時合成、不用音檔：
     底（beds）：一直循環的雜訊，經過濾波；可以慢慢起伏（swell：陣風）、像浪一樣湧上來又退下去（wave）、濾波掃動（sweep：風的呼嘯）
     事件（events）：隨機冒出來的聲音（鳥叫、水滴、木柴爆裂、遠處喇叭、船板嘎吱），每次左右位置、大小、音高都不一樣
   走 amb 匯流排（跟著設定裡的音效音量）；切到背景時跟其他聲音一起停。
   ========================================================================== */
const AMB_PRESETS = {
  rain: { beds: [{ noise: 'pink', hp: 380, lp: 6800, vol: 0.42, swell: [3, 7, 0.25] }, { noise: 'white', bp: [2400, 0.55], vol: 0.12 }, { noise: 'brown', lp: 260, vol: 0.2 }],
    events: [{ sfx: 'amb.drip', rate: 3.5, vol: [0.08, 0.22], pitch: [0.8, 1.6], pan: 0.9 }, { sfx: 'amb.patter', rate: 0.6, vol: [0.15, 0.3], pan: 0.8 }] },
  storm: { beds: [{ noise: 'pink', hp: 260, lp: 8000, vol: 0.6, swell: [2, 5, 0.35] }, { noise: 'brown', bp: [380, 0.7], vol: 0.35, swell: [2, 6, 0.6], sweep: [0.13, 160] }, { noise: 'white', bp: [3000, 0.5], vol: 0.12 }],
    events: [{ sfx: 'amb.rumble', rate: 0.06, vol: [0.4, 0.8], pitch: [0.7, 1.1], pan: 0.6, rev: 0.5 }, { sfx: 'amb.drip', rate: 5, vol: [0.06, 0.18], pitch: [0.8, 1.6], pan: 0.9 }] },
  wind: { beds: [{ noise: 'brown', bp: [420, 0.6], vol: 0.55, swell: [2.5, 6, 0.7], sweep: [0.09, 180] }, { noise: 'pink', bp: [1300, 5], vol: 0.07, swell: [3, 7, 0.9], sweep: [0.17, 420] }],
    events: [{ sfx: 'amb.rustle', rate: 0.25, vol: [0.15, 0.35], pan: 0.9 }] },
  forest: { beds: [{ noise: 'pink', hp: 900, lp: 4200, vol: 0.13, swell: [3, 8, 0.6] }, { noise: 'brown', lp: 300, vol: 0.1 }],
    events: [{ sfx: 'amb.bird1', rate: 0.32, vol: [0.16, 0.38], pitch: [0.85, 1.2], pan: 0.9, rev: 0.25 }, { sfx: 'amb.bird2', rate: 0.18, vol: [0.1, 0.24], pitch: [0.9, 1.15], pan: 0.9, rev: 0.3 },
      { sfx: 'amb.bird3', rate: 0.12, vol: [0.08, 0.2], pitch: [0.9, 1.1], pan: 0.9, rev: 0.3 }, { sfx: 'amb.wood', rate: 0.03, vol: [0.1, 0.2], pan: 0.8, rev: 0.4 }, { sfx: 'amb.rustle', rate: 0.12, vol: [0.08, 0.18], pan: 0.9 }] },
  night: { beds: [{ noise: 'brown', lp: 220, vol: 0.18 }, { noise: 'pink', hp: 2500, lp: 5000, vol: 0.03 }],
    events: [{ sfx: 'amb.cricket', rate: 2.4, vol: [0.07, 0.18], pitch: [0.92, 1.1], pan: 1 }, { sfx: 'amb.owl', rate: 0.035, vol: [0.12, 0.22], pitch: [0.92, 1.05], pan: 0.8, rev: 0.5 }, { sfx: 'amb.frog', rate: 0.25, vol: [0.05, 0.12], pitch: [0.85, 1.2], pan: 0.9 }] },
  cave: { beds: [{ noise: 'brown', lp: 170, vol: 0.4, swell: [6, 12, 0.3] }, { noise: 'pink', bp: [700, 2.5], vol: 0.04, swell: [4, 9, 0.8] }],
    events: [{ sfx: 'amb.drip', rate: 0.55, vol: [0.15, 0.4], pitch: [0.55, 1.1], pan: 0.9, rev: 0.75 }, { sfx: 'amb.rumble', rate: 0.03, vol: [0.15, 0.3], pitch: [0.5, 0.7], pan: 0.5, rev: 0.6 }] },
  ocean: { beds: [{ noise: 'pink', lp: 1500, vol: 0.55, wave: [6, 10, 0.15, 1] }, { noise: 'white', hp: 2800, lp: 9000, vol: 0.12, wave: [6, 10, 0.05, 1] }, { noise: 'brown', lp: 200, vol: 0.18 }],
    events: [{ sfx: 'amb.gull', rate: 0.07, vol: [0.06, 0.16], pitch: [0.85, 1.15], pan: 0.9, rev: 0.4 }] },
  city: { beds: [{ noise: 'brown', lp: 240, vol: 0.45, swell: [4, 9, 0.25] }, { noise: 'pink', bp: [850, 0.5], vol: 0.1 }],
    events: [{ sfx: 'amb.car', rate: 0.16, vol: [0.15, 0.4], pitch: [0.8, 1.2], pan: 0.9 }, { sfx: 'amb.horn', rate: 0.04, vol: [0.06, 0.14], pitch: [0.9, 1.15], pan: 0.9, rev: 0.4 }, { sfx: 'amb.siren', rate: 0.008, vol: [0.05, 0.1], pan: 0.7, rev: 0.6 }] },
  fire: { beds: [{ noise: 'brown', lp: 520, vol: 0.32, swell: [0.4, 1.4, 0.45] }, { noise: 'pink', hp: 1800, lp: 6000, vol: 0.05, swell: [0.3, 1, 0.6] }],
    events: [{ sfx: 'amb.crackle', rate: 9, vol: [0.06, 0.3], pitch: [0.7, 1.6], pan: 0.35 }, { sfx: 'amb.pop', rate: 0.5, vol: [0.15, 0.35], pitch: [0.8, 1.3], pan: 0.3 }] },
  ship: { beds: [{ noise: 'brown', lp: 280, vol: 0.32, wave: [5, 8, 0.4, 1] }, { noise: 'pink', lp: 1100, hp: 200, vol: 0.14, wave: [5, 8, 0.2, 1] }],
    events: [{ sfx: 'amb.creak', rate: 0.2, vol: [0.1, 0.25], pitch: [0.8, 1.25], pan: 0.9 }, { sfx: 'amb.slap', rate: 0.35, vol: [0.1, 0.25], pan: 0.8 }, { sfx: 'bell', rate: 0.02, vol: [0.04, 0.08], pitch: [0.5, 0.55], pan: 0.6, rev: 0.6 }] },
  stream: { beds: [{ noise: 'pink', bp: [1500, 0.45], vol: 0.3, swell: [1.5, 4, 0.25] }, { noise: 'white', hp: 4200, vol: 0.05 }],
    events: [{ sfx: 'amb.bubble', rate: 5, vol: [0.04, 0.12], pitch: [0.7, 1.6], pan: 0.7 }] },
};
// 事件的聲音（一般的合成音效，走 amb 匯流排）
(() => {
  const D = (n, sp) => Sfx.define(n, Object.assign({ bus: 'amb', pitchVar: 0, max: 6, gap: 0.01 }, sp));
  D('amb.drip', { vol: 0.5, layers: [{ w: 'sine', f: 1900, f1: 950, t: 0.08, a: 0.001, p: 3, v: 0.8 }, { w: 'sine', f: 3100, f1: 2200, t: 0.03, a: 0.0005, p: 2.5, v: 0.25 }] });
  D('amb.patter', { vol: 0.5, layers: [0, 0.03, 0.07, 0.1, 0.16].map((d, i) => ({ w: 'noise', d, t: 0.012, a: 0.0005, p: 2, v: 0.6 - i * 0.06, bp: [2600 + i * 300, 2600, 1.4] })) });
  D('amb.rumble', { vol: 0.8, max: 2, layers: [{ w: 'brown', t: 3.2, a: 0.7, p: 1.4, v: 1, lp: [420, 90, 0.7] }, { w: 'noise', t: 1.6, d: 0.3, a: 0.4, p: 2, v: 0.15, bp: [500, 200, 0.8] }] });
  D('amb.rustle', { vol: 0.5, layers: [{ w: 'pink', t: 0.9, a: 0.3, p: 1.3, v: 1, hp: [1600, 2400, 0.7] }, { w: 'noise', t: 0.6, d: 0.15, a: 0.1, p: 2, v: 0.2, bp: [5200, 4000, 1] }] });
  D('amb.bird1', { vol: 0.5, layers: [0, 0.075, 0.15, 0.225].map((d, i) => ({ w: 'sine', d, f: 3000 + i * 120, f1: 4300 + i * 60, t: 0.055, a: 0.004, p: 2, v: 0.7 })).concat([{ w: 'sine', d: 0.31, f: 3900, f1: 2700, t: 0.12, a: 0.005, p: 1.6, v: 0.6 }]) });
  D('amb.bird2', { vol: 0.5, layers: [{ w: 'sine', f: 2650, f1: 2750, t: 0.2, a: 0.02, p: 1.4, v: 0.7, vib: [9, 0.4] }, { w: 'sine', d: 0.24, f: 2150, f1: 2050, t: 0.28, a: 0.02, p: 1.5, v: 0.65, vib: [8, 0.35] }] });
  D('amb.bird3', { vol: 0.45, layers: [{ w: 'sine', f: 2300, f1: 3100, t: 0.42, a: 0.03, p: 1.2, v: 0.7, vib: [21, 2.2], fm: [1.5, 0.6, 0] }] });
  D('amb.wood', { vol: 0.5, layers: Array.from({ length: 9 }, (_, i) => ({ w: 'noise', d: i * 0.055, t: 0.018, a: 0.0005, p: 2, v: 0.8 - i * 0.05, bp: [1500, 1500, 3] })) });
  D('amb.cricket', { vol: 0.4, layers: [0, 1, 2].flatMap((c) => [0, 1, 2, 3].map((k) => ({ w: 'sine', d: c * 0.17 + k * 0.026, f: 4400, t: 0.016, a: 0.002, p: 1.4, v: 0.6, fm: [1.01, 0.3, 0] }))) });
  D('amb.owl', { vol: 0.5, max: 1, layers: [{ w: 'sine', f: 390, f1: 350, t: 0.42, a: 0.06, p: 1.2, v: 0.8, vib: [5, 0.25] }, { w: 'sine', d: 0.6, f: 370, f1: 330, t: 0.6, a: 0.08, p: 1.1, v: 0.7, vib: [5, 0.3] }, { w: 'sine', d: 0.62, f: 740, f1: 660, t: 0.5, a: 0.08, p: 1.4, v: 0.08 }] });
  D('amb.frog', { vol: 0.4, layers: [{ w: 'saw', f: 150, f1: 135, t: 0.22, a: 0.01, p: 1.6, v: 0.6, lp: [1100, 700, 2], vib: [32, 2.5] }, { w: 'saw', d: 0.28, f: 145, f1: 130, t: 0.18, a: 0.01, p: 1.6, v: 0.45, lp: [1000, 600, 2], vib: [30, 2.5] }] });
  D('amb.gull', { vol: 0.45, layers: [0, 0.32, 0.6].map((d, i) => ({ w: 'saw', d, f: 1900 - i * 80, f1: 1250, t: 0.26, a: 0.02, p: 1.5, v: 0.5, bp: [1700, 1300, 4], vib: [11, 0.6] })) });
  D('amb.car', { vol: 0.6, max: 3, layers: [{ w: 'brown', t: 3.4, a: 1.4, h: 0.2, p: 1.5, v: 1, bp: [260, 150, 0.8] }, { w: 'noise', t: 3.2, a: 1.4, h: 0.1, p: 1.7, v: 0.35, bp: [1100, 480, 0.9] }] });
  D('amb.horn', { vol: 0.5, max: 2, layers: [{ w: 'square', f: 415, t: 0.32, a: 0.01, h: 0.25, p: 1, v: 0.4, lp: [1600, 1600, 0.8] }, { w: 'square', f: 523, t: 0.32, a: 0.01, h: 0.25, p: 1, v: 0.3, lp: [1600, 1600, 0.8] }, { w: 'square', d: 0.42, f: 415, t: 0.5, a: 0.01, h: 0.4, p: 1, v: 0.4, lp: [1600, 1600, 0.8] }] });
  D('amb.siren', { vol: 0.4, max: 1, layers: [{ w: 'sine', f: 820, t: 3.2, a: 0.6, h: 2, p: 1.3, v: 0.6, vib: [0.75, 3.6] }, { w: 'tri', f: 1640, t: 3.2, a: 0.6, h: 2, p: 1.3, v: 0.12, vib: [0.75, 3.6] }] });
  D('amb.crackle', { vol: 0.6, max: 8, layers: [{ w: 'noise', t: 0.012, a: 0.0003, p: 3, v: 1, hp: [1300, 1300, 0.7] }] });
  D('amb.pop', { vol: 0.6, max: 3, layers: [{ w: 'noise', t: 0.05, a: 0.0005, p: 2.5, v: 1, bp: [1700, 900, 1.2] }, { w: 'sine', f: 900, f1: 250, t: 0.04, a: 0.0005, p: 2, v: 0.5 }, { w: 'noise', d: 0.05, t: 0.25, a: 0.01, p: 2, v: 0.2, hp: [3000, 5000, 0.7] }] });
  D('amb.creak', { vol: 0.5, max: 2, layers: [{ w: 'saw', f: 95, f1: 72, t: 0.7, a: 0.18, p: 1.4, v: 0.7, bp: [620, 460, 6], vib: [15, 0.9] }, { w: 'saw', d: 0.05, f: 140, f1: 120, t: 0.5, a: 0.15, p: 1.6, v: 0.3, bp: [900, 700, 7], vib: [19, 0.7] }] });
  D('amb.slap', { vol: 0.5, max: 3, layers: [{ w: 'pink', t: 0.42, a: 0.025, p: 2, v: 1, lp: [1500, 380, 0.8] }, { w: 'noise', t: 0.15, d: 0.02, a: 0.01, p: 2, v: 0.25, hp: [3000, 3000, 0.7] }] });
  D('amb.bubble', { vol: 0.45, max: 6, layers: [{ w: 'sine', f: 420, f1: 1150, t: 0.05, a: 0.002, p: 2, v: 0.8 }] });
})();

let AmbNoise = null;
/** 5 秒可以循環的雜訊（首尾交叉淡化，循環時不會喀一聲） */
function ambNoise(kind) {
  if (!AmbNoise) AmbNoise = {};
  if (AmbNoise[kind]) return AmbNoise[kind];
  const c = Aud.ctx, sr = c.sampleRate, len = Math.floor(sr * 5), x = Math.floor(sr * 0.25), raw = new Float32Array(len + x), R = makeRng(hashStr(kind));
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, br = 0;
  for (let i = 0; i < raw.length; i++) {
    const w = R.next() * 2 - 1;
    if (kind === 'white') raw[i] = w * 0.5;
    else if (kind === 'brown') { br = (br + 0.02 * w) / 1.02; raw[i] = br * 3.2; }
    else { b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
  }
  const buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = raw[i];
  for (let i = 0; i < x; i++) { const k = i / x; d[i] = raw[i] * k + raw[len + i] * (1 - k); }   // 結尾接回開頭
  let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(d[i])); const g = pk > 0 ? 0.9 / pk : 1; for (let i = 0; i < len; i++) d[i] *= g;
  return (AmbNoise[kind] = buf);
}

const Amb = PZ.amb = { presets: AMB_PRESETS, live: {}, want: {}, vol: 1, _follow: false };
Amb.define = (name, def) => { AMB_PRESETS[name] = def; return def; };
function makeBed(c, B, out) {
  const src = c.createBufferSource(); src.buffer = ambNoise(B.noise || 'pink'); src.loop = true;
  let node = src; const chain = (n) => { node.connect(n); node = n; }, nodes = [src], oscs = [];
  const filt = (type, f, q) => { const n = c.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; chain(n); nodes.push(n); return n; };
  if (B.hp) filt('highpass', B.hp, 0.5);
  if (B.lp) filt('lowpass', B.lp, 0.5);
  let bp = null; if (B.bp) bp = filt('bandpass', B.bp[0], B.bp[1] || 1);
  if (B.sweep && bp) { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = B.sweep[0]; og.gain.value = B.sweep[1]; o.connect(og); og.connect(bp.frequency); o.start(); oscs.push(o); nodes.push(og); }
  const g = c.createGain(); g.gain.value = B.vol || 0.3; chain(g); nodes.push(g);
  if (c.createStereoPanner && B.pan) { const p = c.createStereoPanner(); p.pan.value = B.pan; chain(p); nodes.push(p); }
  node.connect(out);
  src.start(0, Rand.range(0, src.buffer.duration * 0.9));
  return { B, g, t: Rand.range(0, 1), nodes, oscs, src };
}
function ambStart(name) {
  const def = AMB_PRESETS[name], c = Aud.ctx; if (!def || !c) return null;
  const gain = c.createGain(); gain.gain.value = 0.0001; gain.connect(Aud.bus.amb);
  const L = { name, gain, level: 0, beds: (def.beds || []).map((B) => makeBed(c, B, gain)), events: (def.events || []).map((E) => ({ E, t: Rand.range(0.2, 1.5) / Math.max(0.05, E.rate) })), dying: 0 };
  Amb.live[name] = L; return L;
}
function ambKill(L) {
  for (const b of L.beds) { try { b.src.stop(); } catch (e) { /* ignore */ } for (const o of b.oscs) { try { o.stop(); } catch (e) { /* ignore */ } } for (const n of b.nodes) { try { n.disconnect(); } catch (e) { /* ignore */ } } }
  try { L.gain.disconnect(); } catch (e) { /* ignore */ }
  delete Amb.live[L.name];
}
/** 把目標音量套上去（淡入淡出 fade 秒） */
function ambApply(fade = 2) {
  const c = Aud.ctx; if (!c) return;
  const names = new Set([...Object.keys(Amb.want), ...Object.keys(Amb.live)]);
  for (const n of names) {
    const v = (Amb.want[n] || 0) * Amb.vol;
    let L = Amb.live[n];
    if (!L) { if (v <= 0.001) continue; L = ambStart(n); if (!L) continue; }
    L.level = v; L.dying = v <= 0.001 ? fade + 0.6 : 0;
    const t = c.currentTime; L.gain.gain.cancelScheduledValues(t); L.gain.gain.setTargetAtTime(Math.max(0.0001, v), t, Math.max(0.05, fade / 3));
  }
}
Amb.play = (name, o = {}) => { Amb.want = {}; if (name) Amb.want[name] = o.vol != null ? o.vol : 1; ambApply(o.fade); return Amb; };
Amb.mix = (levels, o = {}) => { Amb.want = Object.assign({}, levels); ambApply(o.fade); return Amb; };
Amb.set = (name, v, o = {}) => { Amb.want[name] = v; ambApply(o.fade); return Amb; };
Amb.stop = (o = {}) => { Amb.want = {}; ambApply(o.fade != null ? o.fade : 1.5); return Amb; };
Amb.level = (name) => (Amb.live[name] ? Amb.live[name].level : 0);
/* 跟著天氣：只管雨、雷雨、風三種，其他（營火、森林…）照遊戲自己設的 */
const AMB_WEATHER = { clear: {}, rain: { rain: 1 }, drizzle: { rain: 0.45 }, storm: { storm: 1 }, snow: { wind: 0.3 }, blizzard: { wind: 1 }, fog: { wind: 0.16 }, mist: { wind: 0.1 } };
Amb.follow = (on = true) => { Amb._follow = !!on; if (on) ambWeather(Weather.name); return Amb; };
function ambWeather(name) { const m = AMB_WEATHER[name] || {}; for (const k of ['rain', 'storm', 'wind']) Amb.want[k] = m[k] || 0; ambApply(3); }
PZ.on('weather', (name) => { if (Amb._follow) ambWeather(name); });
PZ.on('audio', () => ambApply(1.5));
addSystem({
  name: 'amb', order: 33,
  frame(rdt) {
    const c = Aud.ctx; if (!c || c.state !== 'running') return;
    const now = c.currentTime;
    for (const n in Amb.live) {
      const L = Amb.live[n];
      if (L.dying > 0) { L.dying -= rdt; if (L.dying <= 0) { ambKill(L); continue; } }
      // 底：陣風起伏、浪湧上來又退
      for (const b of L.beds) {
        const B = b.B; b.t -= rdt; if (b.t > 0) continue;
        if (B.wave) { const [p0, p1, lo, hi] = B.wave, per = Rand.range(p0, p1), rise = per * Rand.range(0.3, 0.42), v = B.vol;
          b.g.gain.cancelScheduledValues(now); b.g.gain.setValueAtTime(Math.max(0.0001, b.g.gain.value), now); b.g.gain.linearRampToValueAtTime(v * Rand.range(hi * 0.8, hi), now + rise); b.g.gain.setTargetAtTime(v * lo, now + rise, (per - rise) / 2.6); b.t = per; }
        else if (B.swell) { const [p0, p1, depth] = B.swell, per = Rand.range(p0, p1); b.g.gain.setTargetAtTime(B.vol * (1 - depth + depth * Rand.next() * 1.15), now, per / 3); b.t = per; }
        else b.t = 1e9;
      }
      // 事件
      if (L.level < 0.01 || L.dying > 0) continue;
      for (const ev of L.events) {
        ev.t -= rdt; if (ev.t > 0) continue;
        const E = ev.E; ev.t = -Math.log(1 - Rand.next() * 0.999) / Math.max(0.01, E.rate);
        const v = E.vol || [0.2, 0.4], p = E.pitch || [1, 1];
        Sfx.play(E.sfx, { bus: 'amb', vol: Rand.range(v[0], v[1]) * L.level, pitch: Rand.range(p[0], p[1]), pan: Rand.spread(E.pan || 0), rev: E.rev || 0, force: true });
      }
    }
  },
});
