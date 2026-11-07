'use strict';
/* ====== 音效與配樂（WebAudio 即時合成） ====== */
const SFX = (() => {
  let A = null, master, sfxBus, musBus, ambBus, noiseBuf, verb;
  let vol = { master: 0.8, music: 0.55, sfx: 0.8 };
  try { const v = JSON.parse(localStorage.getItem('zx.vol') || 'null'); if (v) vol = Object.assign(vol, v); } catch (e) {}
  let muted = false;
  let lastT = {};
  const ok = () => A && A.state === 'running' && !muted;
  function init() {
    if (A) { if (A.state === 'suspended') A.resume(); return; }
    try { A = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = A.createGain(); master.gain.value = vol.master; master.connect(A.destination);
    const comp = A.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(master);
    sfxBus = A.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(comp);
    musBus = A.createGain(); musBus.gain.value = vol.music; musBus.connect(comp);
    ambBus = A.createGain(); ambBus.gain.value = 0.6; ambBus.connect(musBus);
    noiseBuf = A.createBuffer(1, A.sampleRate * 2, A.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // 簡易殘響
    verb = A.createConvolver();
    const len = A.sampleRate * 2.4, ir = A.createBuffer(2, len, A.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir; const vg = A.createGain(); vg.gain.value = 0.32; verb.connect(vg); vg.connect(comp);
    startAmbient();
    startMusic();
  }
  function env(g, t, a, peak, d, sus = 0) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + d); }
  function tone(f, type, dur, peak = 0.2, opts = {}) {
    if (!ok()) return;
    const t = A.currentTime + (opts.delay || 0);
    const o = A.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    const g = A.createGain(); env(g, t, opts.a || 0.005, peak, dur);
    let node = o;
    if (opts.lp) { const f2 = A.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = opts.lp; o.connect(f2); node = f2; }
    node.connect(g); g.connect(opts.bus || sfxBus);
    if (opts.verb) g.connect(verb);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, peak, f, q = 1, type = 'bandpass', opts = {}) {
    if (!ok()) return;
    const t = A.currentTime + (opts.delay || 0);
    const s = A.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = opts.rate || 1;
    const fl = A.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (opts.to) fl.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    const g = A.createGain(); env(g, t, opts.a || 0.003, peak, dur);
    s.connect(fl); fl.connect(g); g.connect(opts.bus || sfxBus);
    if (opts.verb) g.connect(verb);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  const limit = (k, ms) => { const n = performance.now(); if (lastT[k] && n - lastT[k] < ms) return false; lastT[k] = n; return true; };
  // 距離衰減：只有鏡頭附近的聲音
  const near = (x, y) => { if (typeof CAM === 'undefined') return 1; const d = Math.hypot(x - CAM.x, y - CAM.y); return clamp(1.2 - d / 18, 0, 1) * clamp(CAM.z / 1.2, 0.5, 1.1); };

  /* 環境音 */
  let windG, windF, chimeT = 0;
  function startAmbient() {
    const s = A.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    windF = A.createBiquadFilter(); windF.type = 'lowpass'; windF.frequency.value = 420; windF.Q.value = 0.6;
    windG = A.createGain(); windG.gain.value = 0.05;
    s.connect(windF); windF.connect(windG); windG.connect(ambBus); s.start();
  }
  /* 配樂：生成式氛圍 */
  let musT = 0, chord = 0, tideMode = false, pulseOsc = null, pulseG = null;
  const PROG = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 67], [52, 55, 59, 64], [53, 57, 62, 65]];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function pad(notes, dur, peak) {
    const t = A.currentTime;
    for (const m of notes) for (const det of [-6, 5]) {
      const o = A.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m - 12); o.detune.value = det;
      const f = A.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(900, t + dur * 0.5); f.frequency.linearRampToValueAtTime(380, t + dur);
      const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g); g.connect(musBus); g.connect(verb);
      o.start(t); o.stop(t + dur + 0.1);
    }
  }
  function startMusic() { musT = 0; }
  function musicTick(dt, state) {
    if (!ok()) return;
    musT -= dt;
    const night = state.dark > 0.5;
    if (windG) { windG.gain.setTargetAtTime(state.storm ? 0.22 : 0.035 + (night ? 0.01 : 0.02), A.currentTime, 1.5); windF.frequency.setTargetAtTime(state.storm ? 900 : 380 + Math.sin(A.currentTime * 0.2) * 120, A.currentTime, 2); }
    // 夜裡的發光生物音
    chimeT -= dt;
    if (night && chimeT <= 0 && !state.tide) {
      chimeT = 1.2 + Math.random() * 3.5;
      const pent = [72, 74, 76, 79, 81, 84, 86];
      tone(mtof(pent[Math.floor(Math.random() * pent.length)]), 'sine', 1.6, 0.025 + Math.random() * 0.02, { bus: ambBus, verb: true, a: 0.02 });
    }
    if (state.tide !== tideMode) setTide(state.tide);
    if (musT <= 0) {
      if (tideMode) {
        musT = 2.2;
        const t = A.currentTime;
        for (let i = 0; i < 4; i++) { noise(0.22, 0.22, 90, 1.4, 'lowpass', { delay: i * 0.55, bus: musBus }); if (i % 2) noise(0.09, 0.06, 4200, 2, 'highpass', { delay: i * 0.55 + 0.27, bus: musBus }); }
        tone(mtof([45, 45, 48, 44][Math.floor(Math.random() * 4)]), 'sawtooth', 2.0, 0.05, { lp: 500, bus: musBus });
      } else {
        musT = 9 + Math.random() * 3;
        chord = (chord + 1 + (Math.random() < 0.3 ? 1 : 0)) % PROG.length;
        pad(PROG[chord], musT + 2, night ? 0.018 : 0.014);
        // 稀疏的旋律
        if (Math.random() < 0.7) {
          const notes = PROG[chord].map(n => n + 12);
          for (let i = 0; i < 4; i++) if (Math.random() < 0.65) tone(mtof(notes[Math.floor(Math.random() * 4)] + (Math.random() < 0.3 ? 12 : 0)), 'triangle', 1.4, 0.03, { delay: 1 + i * 1.6 + Math.random() * 0.4, bus: musBus, verb: true, a: 0.01 });
        }
      }
    }
  }
  function setTide(v) {
    tideMode = v; musT = 0;
    if (v && !pulseOsc) {
      pulseOsc = A.createOscillator(); pulseOsc.type = 'sine'; pulseOsc.frequency.value = 41;
      pulseG = A.createGain(); pulseG.gain.value = 0;
      const lfo = A.createOscillator(); lfo.frequency.value = 1.1; const lg = A.createGain(); lg.gain.value = 0.05; lfo.connect(lg); lg.connect(pulseG.gain);
      pulseOsc.connect(pulseG); pulseG.connect(musBus); pulseOsc.start(); lfo.start();
      pulseOsc._lfo = lfo;
    } else if (!v && pulseOsc) { const p = pulseOsc; setTimeout(() => { try { p.stop(); p._lfo.stop(); } catch (e) {} }, 100); pulseOsc = null; }
  }
  return {
    init, musicTick, get ctx() { return A; },
    setVol(k, v) { vol[k] = v; if (A) { if (k === 'master') master.gain.value = v; if (k === 'music') musBus.gain.value = v; if (k === 'sfx') sfxBus.gain.value = v; } try { localStorage.setItem('zx.vol', JSON.stringify(vol)); } catch (e) {} },
    get vol() { return vol; },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : vol.master; return muted; },
    get muted() { return muted; },
    click() { tone(1800, 'square', 0.03, 0.035, { lp: 3000 }); },
    tap() { tone(900, 'sine', 0.06, 0.05); },
    open() { noise(0.18, 0.05, 1800, 0.8, 'bandpass', { to: 4000 }); tone(660, 'sine', 0.12, 0.03, { delay: 0.02 }); },
    close() { noise(0.14, 0.04, 3000, 0.8, 'bandpass', { to: 1200 }); },
    hammer(c) { const k = c ? near(c.x, c.y) : 1; if (k < 0.05 || !limit('ham', 90)) return; tone(1200 + Math.random() * 600, 'square', 0.04, 0.04 * k, { lp: 2600 }); noise(0.05, 0.05 * k, 3000, 3); },
    gather(c, type) { const k = c ? near(c.x, c.y) : 1; if (k < 0.05 || !limit('gat', 140)) return; if (type === 'tree') noise(0.08, 0.06 * k, 600, 2); else if (type === 'bush') tone(700, 'sine', 0.06, 0.03 * k); else { tone(900 + Math.random() * 300, 'triangle', 0.05, 0.045 * k); noise(0.04, 0.04 * k, 2400, 4); } },
    deposit() { if (!limit('dep', 120)) return; tone(520, 'sine', 0.08, 0.05); tone(780, 'sine', 0.1, 0.04, { delay: 0.05 }); },
    done() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 'triangle', 0.35, 0.06, { delay: i * 0.07, verb: true })); },
    research() { [440, 554, 659, 880, 1108].forEach((f, i) => tone(f, 'sine', 0.5, 0.05, { delay: i * 0.08, verb: true })); },
    objective() { [392, 523, 659, 784].forEach((f, i) => tone(f, 'triangle', 0.6, 0.06, { delay: i * 0.1, verb: true })); tone(196, 'sine', 1.2, 0.06, { verb: true }); },
    milestone() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 'triangle', 0.7, 0.06, { delay: i * 0.09, verb: true })); },
    alert() { if (!limit('alert', 800)) return; tone(660, 'square', 0.16, 0.06, { lp: 1800 }); tone(440, 'square', 0.22, 0.06, { lp: 1800, delay: 0.18 }); },
    shot(c) { const k = c ? near(c.x, c.y) : 1; if (k < 0.05 || !limit('shot', 50)) return; noise(0.09, 0.12 * k, 1400, 0.7, 'bandpass', { to: 400 }); tone(140, 'sine', 0.1, 0.1 * k, { to: 60 }); },
    turret(t) { const k = t ? near(t.x, t.y) : 1; if (k < 0.05 || !limit('tur', 60)) return; tone(1600, 'square', 0.09, 0.05 * k, { to: 300, lp: 3500 }); },
    hurt() { if (!limit('hurt', 200)) return; noise(0.12, 0.08, 500, 1); tone(220, 'sawtooth', 0.12, 0.04, { to: 120, lp: 900 }); },
    bite(b) { if (!limit('bite', 160)) return; noise(0.06, 0.04, 2400, 3); },
    kill(type) { if (!limit('kill' + type, 60)) return; if (type === 'mother') { noise(1.4, 0.3, 300, 0.7, 'lowpass', { to: 60 }); tone(110, 'sawtooth', 1.6, 0.12, { to: 30, lp: 600, verb: true }); } else { tone(1400 + Math.random() * 800, 'sine', 0.18, 0.04, { to: 2400, verb: true }); } },
    boom() { noise(0.9, 0.25, 260, 0.6, 'lowpass', { to: 50 }); tone(70, 'sine', 0.8, 0.22, { to: 30 }); },
    boss() { tone(55, 'sawtooth', 2.5, 0.14, { to: 38, lp: 400, verb: true }); noise(2, 0.08, 200, 1, 'lowpass', { verb: true }); },
    tide() { tone(98, 'sawtooth', 3, 0.1, { lp: 500, verb: true, a: 0.6 }); tone(147, 'sawtooth', 3, 0.07, { lp: 500, verb: true, a: 0.6 }); tone(196, 'sine', 3.5, 0.05, { verb: true, a: 0.8, delay: 0.4 }); },
    blackout(v) { if (v) tone(800, 'sawtooth', 0.8, 0.06, { to: 50, lp: 1200 }); else tone(60, 'sawtooth', 0.6, 0.06, { to: 600, lp: 1200 }); },
    wake() { noise(1.6, 0.08, 6000, 0.6, 'highpass', { a: 0.2, verb: true }); [261, 392, 523, 659, 784].forEach((f, i) => tone(f, 'sine', 1.6, 0.05, { delay: 0.3 + i * 0.15, verb: true, a: 0.05 })); },
    reveal() { [523, 784, 1046].forEach((f, i) => tone(f, 'triangle', 0.8, 0.06, { delay: i * 0.06, verb: true })); },
    type() { if (!limit('type', 45)) return; tone(2400 + Math.random() * 400, 'square', 0.015, 0.012, { lp: 4000 }); },
    actEnd() { [196, 262, 330, 392, 523].forEach((f, i) => tone(f, 'triangle', 2.4, 0.06, { delay: i * 0.25, verb: true, a: 0.1 })); },
  };
})();
