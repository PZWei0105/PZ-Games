/* ───────────── 音效：全部用 Web Audio 即時合成 ───────────── */
const AU = { ctx: null, master: null, bus: null, mus: null, noise: null, on: true, musOn: true, last: {}, active: 0, loops: {} };

/* 一定要在使用者點擊的當下同步呼叫（不能放在 await 後面） */
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try { AU.ctx = new AC(); } catch (e) { return; }
  const c = AU.ctx;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
  AU.master = c.createGain(); AU.master.gain.value = store.get('vol', 0.85);
  AU.bus = c.createGain(); AU.bus.gain.value = 1;
  AU.mus = c.createGain(); AU.mus.gain.value = 0.32;
  AU.bus.connect(comp); AU.mus.connect(comp); comp.connect(AU.master); AU.master.connect(c.destination);
  const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  AU.noise = buf;
  AU.on = store.get('sfx', true); AU.musOn = store.get('music', true);
  startAmbience();
}
function aNoise(t, dur, f0, f1, q, type) {
  const c = AU.ctx, s = c.createBufferSource(); s.buffer = AU.noise; s.loop = true;
  s.loopStart = Math.random(); s.loopEnd = s.loopStart + 0.9;
  const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.Q.value = q || 1;
  f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  s.connect(f); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  return [s, f];
}
function aOsc(t, dur, type, f0, f1) {
  const c = AU.ctx, o = c.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  o.start(t); o.stop(t + dur + 0.05); return o;
}
function aEnv(t, a, peak, dur, curve) {
  const g = AU.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
  return g;
}
function aOut(node, pan) {
  const c = AU.ctx;
  if (c.createStereoPanner && pan) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); node.connect(p); p.connect(AU.bus); }
  else node.connect(AU.bus);
}
/* 以鏡頭為中心：越遠越小聲、左右聲道 */
function spatial(x) {
  if (x === undefined || x === null) return [1, 0];
  const sx = (x - CAM.x) * CAM.z;
  const half = VIEW.w / 2;
  const off = Math.max(0, Math.abs(sx) - half);
  const vol = clamp(1 - off / (half * 1.6), 0.08, 1) * clamp(0.55 + CAM.z * 0.45, 0.5, 1.15);
  return [vol, clamp(sx / half, -1, 1) * 0.75];
}
const SFXMIN = { rifle: 0.035, mg: 0.03, tink: 0.05, magout: 0.1, magin: 0.1, charge: 0.1, boomS: 0.05, boom: 0.06, hit: 0.04, ric: 0.05, step: 0.08 };
function sfx(name, x, v) {
  if (!AU.ctx || !AU.on || AU.ctx.state !== 'running') return;
  const now = AU.ctx.currentTime;
  const mi = SFXMIN[name] || 0.02;
  if (AU.last[name] && now - AU.last[name] < mi) return;
  if (AU.active > 34) return;
  AU.last[name] = now;
  const [vol, pan] = spatial(x);
  const fn = SFX[name]; if (!fn) return;
  AU.active++; setTimeout(() => { AU.active--; }, 600);
  try { fn(now + 0.005, vol * (v === undefined ? 1 : v), pan); } catch (e) { /* 單一音效失敗不影響遊戲 */ }
}
const SFX = {
  rifle(t, v, pan) {
    const [n, f] = aNoise(t, 0.14, 2600, 700, 0.9); const g = aEnv(t, 0.002, 0.55 * v, 0.13); f.connect(g); aOut(g, pan);
    const o = aOsc(t, 0.09, 'triangle', 190, 60); const g2 = aEnv(t, 0.002, 0.5 * v, 0.08); o.connect(g2); aOut(g2, pan);
  },
  rifleE(t, v, pan) { SFX.rifle(t, v * 0.8, pan); },
  mg(t, v, pan) {
    const [n, f] = aNoise(t, 0.09, 1900, 500, 0.8); const g = aEnv(t, 0.002, 0.5 * v, 0.085); f.connect(g); aOut(g, pan);
    const o = aOsc(t, 0.06, 'square', 120, 50); const g2 = aEnv(t, 0.002, 0.18 * v, 0.06); o.connect(g2); aOut(g2, pan);
  },
  sniper(t, v, pan) {
    const [n, f] = aNoise(t, 0.6, 3200, 300, 0.6); const g = aEnv(t, 0.002, 0.9 * v, 0.55); f.connect(g); aOut(g, pan);
    const o = aOsc(t, 0.3, 'sine', 120, 38); const g2 = aEnv(t, 0.002, 0.9 * v, 0.28); o.connect(g2); aOut(g2, pan);
  },
  rpg(t, v, pan) {
    const [n, f] = aNoise(t, 0.7, 400, 2600, 1.2); const g = aEnv(t, 0.01, 0.8 * v, 0.65); f.connect(g); aOut(g, pan);
    const o = aOsc(t, 0.2, 'sine', 90, 40); const g2 = aEnv(t, 0.002, 0.8 * v, 0.2); o.connect(g2); aOut(g2, pan);
  },
  cannon(t, v, pan) {
    const o = aOsc(t, 0.7, 'sine', 95, 28); const g = aEnv(t, 0.003, 1.1 * v, 0.7); o.connect(g); aOut(g, pan);
    const [n, f] = aNoise(t, 0.9, 1400, 120, 0.7, 'lowpass'); const g2 = aEnv(t, 0.003, 1.0 * v, 0.85); f.connect(g2); aOut(g2, pan);
    const [n2, f2] = aNoise(t + 0.22, 0.6, 500, 150, 0.5, 'lowpass'); const g3 = aEnv(t + 0.22, 0.02, 0.25 * v, 0.5); f2.connect(g3); aOut(g3, -pan);
  },
  boomS(t, v, pan) {
    const o = aOsc(t, 0.45, 'sine', 80, 30); const g = aEnv(t, 0.003, 0.7 * v, 0.42); o.connect(g); aOut(g, pan);
    const [n, f] = aNoise(t, 0.5, 1800, 150, 0.6, 'lowpass'); const g2 = aEnv(t, 0.003, 0.75 * v, 0.48); f.connect(g2); aOut(g2, pan);
  },
  boom(t, v, pan) {
    const o = aOsc(t, 0.9, 'sine', 70, 24); const g = aEnv(t, 0.004, 1.2 * v, 0.85); o.connect(g); aOut(g, pan);
    const [n, f] = aNoise(t, 1.2, 2200, 90, 0.5, 'lowpass'); const g2 = aEnv(t, 0.004, 1.2 * v, 1.1); f.connect(g2); aOut(g2, pan);
    const [n2, f2] = aNoise(t + 0.05, 0.8, 4000, 1200, 0.8); const g3 = aEnv(t + 0.05, 0.01, 0.18 * v, 0.7); f2.connect(g3); aOut(g3, pan); // 碎片沙沙聲
  },
  boomBig(t, v, pan) {
    SFX.boom(t, v * 1.15, pan);
    const o = aOsc(t, 1.6, 'sine', 50, 18); const g = aEnv(t, 0.01, 1.2 * v, 1.5); o.connect(g); aOut(g, 0);
    const [n, f] = aNoise(t + 0.3, 1.6, 600, 80, 0.5, 'lowpass'); const g2 = aEnv(t + 0.3, 0.05, 0.5 * v, 1.4); f.connect(g2); aOut(g2, -pan * 0.5);
  },
  mortar(t, v, pan) {
    const o = aOsc(t, 0.25, 'sine', 140, 50); const g = aEnv(t, 0.002, 0.9 * v, 0.24); o.connect(g); aOut(g, pan);
    const [n, f] = aNoise(t, 0.3, 900, 200, 0.7, 'lowpass'); const g2 = aEnv(t, 0.002, 0.5 * v, 0.28); f.connect(g2); aOut(g2, pan);
  },
  whistle(t, v, pan) {
    const o = aOsc(t, 0.9, 'sine', 1500, 420); const g = aEnv(t, 0.15, 0.16 * v, 0.75); o.connect(g); aOut(g, pan);
  },
  launch(t, v, pan) { // 火箭砲車連發
    const [n, f] = aNoise(t, 0.5, 300, 3000, 1.4); const g = aEnv(t, 0.01, 0.6 * v, 0.48); f.connect(g); aOut(g, pan);
  },
  flak(t, v, pan) {
    const o = aOsc(t, 0.12, 'square', 160, 60); const g = aEnv(t, 0.002, 0.35 * v, 0.1); o.connect(g); aOut(g, pan);
    const [n, f] = aNoise(t, 0.12, 2400, 800, 1); const g2 = aEnv(t, 0.002, 0.4 * v, 0.1); f.connect(g2); aOut(g2, pan);
  },
  flame(t, v, pan) { const [n, f] = aNoise(t, 0.35, 700, 500, 0.6); const g = aEnv(t, 0.03, 0.4 * v, 0.3); f.connect(g); aOut(g, pan); },
  magout(t, v, pan) { const o = aOsc(t, 0.05, 'square', 1800, 900); const g = aEnv(t, 0.001, 0.12 * v, 0.04); o.connect(g); aOut(g, pan); },
  magin(t, v, pan) { const o = aOsc(t, 0.05, 'square', 1200, 500); const g = aEnv(t, 0.001, 0.16 * v, 0.05); o.connect(g); aOut(g, pan); const [n, f] = aNoise(t, 0.04, 3000, 3000, 2); const g2 = aEnv(t, 0.001, 0.15 * v, 0.03); f.connect(g2); aOut(g2, pan); },
  charge(t, v, pan) { SFX.magin(t, v, pan); SFX.magout(t + 0.09, v, pan); },
  bolt(t, v, pan) { SFX.magout(t, v * 1.2, pan); SFX.magin(t + 0.14, v * 1.2, pan); },
  tink(t, v, pan) { const o = aOsc(t, 0.08, 'sine', rnd(3200, 4200), 2800); const g = aEnv(t, 0.001, 0.05 * v, 0.07); o.connect(g); aOut(g, pan); },
  hit(t, v, pan) { const [n, f] = aNoise(t, 0.07, 700, 300, 1); const g = aEnv(t, 0.002, 0.28 * v, 0.06); f.connect(g); aOut(g, pan); },
  ric(t, v, pan) { const o = aOsc(t, 0.25, 'sine', rnd(2400, 3400), rnd(900, 1400)); const g = aEnv(t, 0.002, 0.08 * v, 0.22); o.connect(g); aOut(g, pan); },
  pin(t, v, pan) { const o = aOsc(t, 0.06, 'triangle', 2600, 2200); const g = aEnv(t, 0.001, 0.12 * v, 0.06); o.connect(g); aOut(g, pan); },
  deploy(t, v) { // 無線電「收到」
    const [n, f] = aNoise(t, 0.12, 2000, 2000, 3); const g = aEnv(t, 0.002, 0.12, 0.1); f.connect(g); aOut(g, 0);
    const o = aOsc(t + 0.05, 0.08, 'square', 1320, 1320); const g2 = aEnv(t + 0.05, 0.002, 0.07, 0.07); o.connect(g2); aOut(g2, 0);
    const o2 = aOsc(t + 0.14, 0.08, 'square', 1760, 1760); const g3 = aEnv(t + 0.14, 0.002, 0.07, 0.07); o2.connect(g3); aOut(g3, 0);
  },
  click(t) { const o = aOsc(t, 0.04, 'triangle', 900, 600); const g = aEnv(t, 0.001, 0.14, 0.04); o.connect(g); aOut(g, 0); },
  tick(t) { const o = aOsc(t, 0.03, 'sine', 1400, 1100); const g = aEnv(t, 0.001, 0.08, 0.03); o.connect(g); aOut(g, 0); },
  deny(t) { const o = aOsc(t, 0.16, 'square', 180, 130); const g = aEnv(t, 0.002, 0.1, 0.15); o.connect(g); aOut(g, 0); },
  flag(t, v) { // 升旗號角
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => { const o = aOsc(t + i * 0.11, 0.3, 'sawtooth', f, f); const lp = AU.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; const g = aEnv(t + i * 0.11, 0.02, 0.09 * v, i === 3 ? 0.5 : 0.18); o.connect(lp); lp.connect(g); aOut(g, 0); });
  },
  lost(t, v) { [392, 330, 262].forEach((f, i) => { const o = aOsc(t + i * 0.16, 0.3, 'triangle', f, f * 0.98); const g = aEnv(t + i * 0.16, 0.02, 0.1 * v, 0.28); o.connect(g); aOut(g, 0); }); },
  win(t) { [392, 523, 659, 784, 1047, 784, 1047].forEach((f, i) => { const o = aOsc(t + i * 0.13, 0.4, 'sawtooth', f, f); const lp = AU.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; const g = aEnv(t + i * 0.13, 0.02, 0.1, i > 4 ? 0.7 : 0.2); o.connect(lp); lp.connect(g); aOut(g, 0); }); },
  lose(t) { [330, 311, 262, 196].forEach((f, i) => { const o = aOsc(t + i * 0.3, 0.6, 'sawtooth', f, f * 0.97); const lp = AU.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200; const g = aEnv(t + i * 0.3, 0.05, 0.1, 0.55); o.connect(lp); lp.connect(g); aOut(g, 0); }); },
  jet(t, v, pan) {
    const [n, f] = aNoise(t, 2.6, 300, 2400, 0.6); const g = AU.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7 * v, t + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6); f.connect(g);
    const c = AU.ctx; if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.setValueAtTime(-0.9, t); p.pan.linearRampToValueAtTime(0.9, t + 2.4); g.connect(p); p.connect(AU.bus); } else g.connect(AU.bus);
  },
  alarm(t) { for (let i = 0; i < 3; i++) { const o = aOsc(t + i * 0.32, 0.26, 'square', 880, 660); const g = aEnv(t + i * 0.32, 0.01, 0.06, 0.24); o.connect(g); aOut(g, 0); } },
  radio(t) { const [n, f] = aNoise(t, 0.25, 1800, 1800, 2); const g = aEnv(t, 0.01, 0.08, 0.22); f.connect(g); aOut(g, 0); },
  coin(t) { [1320, 1760].forEach((fq, i) => { const o = aOsc(t + i * 0.07, 0.12, 'square', fq, fq); const g = aEnv(t + i * 0.07, 0.002, 0.06, 0.11); o.connect(g); aOut(g, 0); }); },
};

/* 持續音：直升機旋翼、引擎、火焰、風聲；強度每格由戰場設定 */
function startAmbience() {
  const c = AU.ctx;
  const mk = (name, build) => { const g = c.createGain(); g.gain.value = 0; build(g); g.connect(AU.bus); AU.loops[name] = { g, v: 0 }; };
  mk('wind', (g) => { const s = c.createBufferSource(); s.buffer = AU.noise; s.loop = true; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; s.connect(f); f.connect(g); s.start(); });
  mk('rotor', (g) => {
    const s = c.createBufferSource(); s.buffer = AU.noise; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 220; f.Q.value = 0.8;
    const am = c.createGain(); am.gain.value = 0.5; const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 13; const lg2 = c.createGain(); lg2.gain.value = 0.5; lfo.connect(lg2); lg2.connect(am.gain); lfo.start();
    s.connect(f); f.connect(am); am.connect(g); s.start();
  });
  mk('engine', (g) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 46; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180; o.connect(f); f.connect(g); o.start(); const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 23.5; const g2 = c.createGain(); g2.gain.value = 0.35; o2.connect(g2); g2.connect(f); o2.start(); });
  mk('fire', (g) => { const s = c.createBufferSource(); s.buffer = AU.noise; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 0.5; s.connect(f); f.connect(g); s.start(); });
}
function setLoop(name, v) {
  const L = AU.loops[name]; if (!L || !AU.ctx) return;
  v = AU.on ? clamp(v, 0, 1) : 0;
  if (Math.abs(L.v - v) < 0.01) return;
  L.v = v; L.g.gain.setTargetAtTime(v, AU.ctx.currentTime, 0.25);
}
function setMasterVol(v) { store.set('vol', v); if (AU.master) AU.master.gain.value = v; }
