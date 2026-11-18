/* 解包 — 聲音：全部即時合成（噴漆嘶聲、搖罐、拍貼紙、蓋章、重低音、刷碟、鈴鐺）＋ boom-bap 背景鼓組。
   iPhone：AudioContext 一定要在點擊的當下同步建立；audioSession 設成 playback，側邊靜音鍵打開也有聲音。 */
const AU = { ac: null, master: null, sfx: null, bgm: null, NB: null, timer: null, next: 0, step: 0, bar: 0, duck: false };

function audioInit() {
  if (AU.ac) { if (AU.ac.state === 'suspended') AU.ac.resume(); return; }
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* 舊版 Safari */ }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    AU.ac = new AC();
    const comp = AU.ac.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    comp.connect(AU.ac.destination);
    AU.master = AU.ac.createGain(); AU.master.gain.value = 0.9; AU.master.connect(comp);
    AU.sfx = AU.ac.createGain(); AU.sfx.gain.value = S.settings.vol; AU.sfx.connect(AU.master);
    AU.bgm = AU.ac.createGain(); AU.bgm.gain.value = S.settings.bgmVol; AU.bgm.connect(AU.master);
    const len = AU.ac.sampleRate * 1.5;
    AU.NB = AU.ac.createBuffer(1, len, AU.ac.sampleRate);
    const x = AU.NB.getChannelData(0); for (let i = 0; i < len; i++) x[i] = Math.random() * 2 - 1;
    // 用一個極短的無聲 buffer 把 iOS 的音訊管線叫醒
    const b = AU.ac.createBuffer(1, 1, 22050); const s = AU.ac.createBufferSource(); s.buffer = b; s.connect(AU.ac.destination); s.start(0);
  } catch (e) { AU.ac = null; }
}
const sndOK = () => AU.ac && S.settings.sfx && !S.muted;

function nz(t, d, { type = 'bandpass', f = 1000, q = 1, g = 0.5, f2 = null, bus = AU.sfx, a = 0.002 } = {}) {
  const s = AU.ac.createBufferSource(); s.buffer = AU.NB;
  const fl = AU.ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
  const gn = AU.ac.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + a); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl).connect(gn).connect(bus); s.start(t, Math.random()); s.stop(t + d + 0.05);
}
function tone(t, d, { type = 'sine', f = 440, f2 = null, g = 0.3, bus = AU.sfx, a = 0.003 } = {}) {
  const o = AU.ac.createOscillator(), gn = AU.ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + a); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn).connect(bus); o.start(t); o.stop(t + d + 0.05);
}
const T = () => AU.ac.currentTime;
const sfx = {
  rattle() { if (!sndOK()) return; const t = T(); for (let i = 0; i < 4; i++) { nz(t + i * 0.06, 0.04, { f: 3800, q: 4, g: 0.45 }); tone(t + i * 0.06, 0.03, { type: 'square', f: 2600 + Math.random() * 600, g: 0.04 }); } },
  hiss(d = 1.2) { if (!sndOK()) return; const t = T(); nz(t, d, { type: 'highpass', f: 2500, g: 0.2, a: 0.05 }); nz(t, d, { f: 6000, q: 0.7, g: 0.1, a: 0.05 }); },
  spray() { if (!sndOK()) return; const t = T(); nz(t, 0.22, { type: 'highpass', f: 3000, g: 0.16, a: 0.02 }); },
  whoosh() { if (!sndOK()) return; nz(T(), 0.42, { f: 300, f2: 4500, q: 1.2, g: 0.4, a: 0.14 }); },
  slap() { if (!sndOK()) return; const t = T(); nz(t, 0.15, { type: 'lowpass', f: 2200, g: 0.8 }); tone(t, 0.2, { f: 180, f2: 60, g: 0.5 }); },
  stamp() { if (!sndOK()) return; const t = T(); nz(t, 0.09, { type: 'lowpass', f: 1600, g: 0.65 }); tone(t, 0.15, { f: 220, f2: 90, g: 0.42 }); },
  drop() { if (!sndOK()) return; const t = T(); tone(t, 0.9, { f: 110, f2: 32, g: 0.9 }); nz(t, 0.35, { type: 'lowpass', f: 900, g: 0.55 }); tone(t, 0.5, { type: 'sawtooth', f: 55, f2: 40, g: 0.12 }); },
  squeak() { if (!sndOK()) return; const t = T(); tone(t, 0.18, { type: 'triangle', f: 2400, f2: 3300, g: 0.05 }); nz(t, 0.18, { f: 5000, q: 3, g: 0.05 }); },
  tick() { if (!sndOK()) return; const t = T(); tone(t, 0.045, { type: 'square', f: 1900, g: 0.05 }); nz(t, 0.035, { f: 4000, q: 2, g: 0.16 }); },
  type() { if (!sndOK()) return; const t = T(); nz(t, 0.03, { f: 2500 + Math.random() * 1500, q: 3, g: 0.22 }); },
  blip(f = 1000) { if (!sndOK()) return; tone(T(), 0.07, { type: 'square', f, g: 0.05 }); },
  ding() { if (!sndOK()) return; const t = T(); tone(t, 1.1, { f: 1320, g: 0.16 }); tone(t, 0.9, { f: 1980, g: 0.07 }); tone(t + 0.16, 1.1, { f: 1320, g: 0.1 }); },
  scratch() { if (!sndOK()) return; const t = T(); nz(t, 0.11, { f: 900, f2: 2600, q: 6, g: 0.45 }); nz(t + 0.11, 0.13, { f: 2600, f2: 700, q: 6, g: 0.45 }); },
  riser() { if (!sndOK()) return; const t = T(); nz(t, 0.7, { f: 400, f2: 6000, q: 2, g: 0.22, a: 0.6 }); tone(t, 0.7, { type: 'sawtooth', f: 200, f2: 900, g: 0.035, a: 0.6 }); },
  rip() { if (!sndOK()) return; const t = T(); for (let i = 0; i < 9; i++) nz(t + i * 0.035 + Math.random() * 0.02, 0.05, { f: 1200 + Math.random() * 2400, q: 2, g: 0.3 + Math.random() * 0.25 }); },
  click() { if (!sndOK()) return; const t = T(); nz(t, 0.03, { type: 'highpass', f: 3000, g: 0.25 }); tone(t, 0.04, { f: 700, f2: 300, g: 0.12 }); },
  ping(f = 1600) { if (!sndOK()) return; const t = T(); tone(t, 0.35, { f, f2: f * 0.97, g: 0.07 }); tone(t + 0.12, 0.3, { f, g: 0.025 }); },
  siren() { if (!sndOK()) return; const t = T(); for (let i = 0; i < 3; i++) { tone(t + i * 0.32, 0.3, { type: 'sawtooth', f: 620, f2: 1240, g: 0.05 }); tone(t + i * 0.32, 0.3, { type: 'square', f: 310, f2: 620, g: 0.025 }); } },
  lock() { if (!sndOK()) return; const t = T(); [0, 0.07, 0.14].forEach((d, i) => tone(t + d, 0.06, { type: 'square', f: 1400 + i * 260, g: 0.05 })); nz(t + 0.2, 0.08, { type: 'lowpass', f: 1500, g: 0.4 }); },
  pop() { if (!sndOK()) return; const t = T(); tone(t, 0.12, { f: 500, f2: 1200, g: 0.18 }); nz(t, 0.05, { f: 3000, q: 3, g: 0.12 }); },
  // 行情板：開盤鐘（一天第一次打開）、數字跳動
  bell() { if (!sndOK()) return; const t = T(); [0, 0.38, 0.76].forEach((d) => { tone(t + d, 1.5, { f: 880, g: 0.13 }); tone(t + d, 1.0, { f: 1763, g: 0.045 }); tone(t + d, 0.6, { f: 2645, g: 0.02 }); }); },
  tickUp(up = true) { if (!sndOK()) return; tone(T(), 0.06, { type: 'triangle', f: up ? 1500 : 700, f2: up ? 1900 : 520, g: 0.06 }); },
  // 點播台：無線電發射
  radio() { if (!sndOK()) return; const t = T(); nz(t, 0.22, { f: 2200, q: 1.5, g: 0.16, a: 0.01 }); [0, 0.08, 0.16, 0.24].forEach((d, i) => tone(t + 0.2 + d, 0.055, { type: 'square', f: i % 2 ? 1320 : 990, g: 0.05 })); nz(t + 0.55, 0.16, { type: 'highpass', f: 3500, g: 0.1 }); },
  // TGA：拆封、開獎
  fanfare() { if (!sndOK()) return; const t = T(); [[0, [523, 659, 784]], [0.17, [587, 740, 880]], [0.34, [659, 831, 988]], [0.56, [784, 988, 1175, 1568]]].forEach(([d, ch]) => ch.forEach((f) => tone(t + d, d > 0.5 ? 1.3 : 0.2, { type: 'sawtooth', f, g: 0.032, a: 0.01 }))); tone(t + 0.56, 1.2, { f: 196, f2: 190, g: 0.3 }); nz(t + 0.56, 0.6, { type: 'highpass', f: 6000, g: 0.08, a: 0.02 }); },
  // 免費補給站：領到
  coin() { if (!sndOK()) return; const t = T(); tone(t, 0.08, { type: 'square', f: 988, g: 0.06 }); tone(t + 0.08, 0.42, { type: 'square', f: 1319, g: 0.06 }); },
};

/* ---- boom-bap 鼓組（92 BPM，帶一點搖擺） ---- */
const BPM = 92, S16 = 60 / BPM / 4;
const KICK = [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0];
const SNR = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1];
const HAT = [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1];
const BASS = [41, 0, 0, 0, 0, 0, 0, 41, 0, 0, 44, 0, 0, 0, 39, 0];  // MIDI 音（F、Ab、Eb）
const STAB = [65, 68, 72];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function schedStep(i, t) {
  const B = AU.bgm;
  if (KICK[i]) { tone(t, 0.4, { f: 140, f2: 42, g: 0.85, bus: B }); tone(t, 0.02, { type: 'square', f: 900, g: 0.06, bus: B }); }
  if (SNR[i]) { nz(t, 0.18, { f: 1800, q: 0.8, g: 0.55, bus: B }); tone(t, 0.1, { type: 'triangle', f: 240, f2: 160, g: 0.25, bus: B }); }
  if (HAT[i]) nz(t, i % 4 === 2 ? 0.08 : 0.03, { type: 'highpass', f: 7000, g: i % 2 ? 0.08 : 0.14, bus: B });
  if (BASS[i]) tone(t, 0.32, { type: 'triangle', f: mtof(BASS[i]), g: 0.32, bus: B, a: 0.01 });
  if (i === 0 && AU.bar % 2 === 0) STAB.forEach((m, k) => tone(t + k * 0.004, 0.5, { type: 'sawtooth', f: mtof(m), g: 0.022, bus: B, a: 0.01 }));
  if (i === 12 && AU.bar % 8 === 7) { nz(t, 0.1, { f: 900, f2: 2600, q: 6, g: 0.25, bus: B }); nz(t + 0.1, 0.12, { f: 2600, f2: 700, q: 6, g: 0.25, bus: B }); }
  if (i === 0) nz(t, S16 * 16, { type: 'bandpass', f: 4500, q: 0.4, g: 0.012, bus: B, a: 0.2 });  // 黑膠沙沙聲
}
function bgmStart() {
  if (!AU.ac || !S.settings.bgm || S.muted || AU.timer || AU.duck) return;   // 看預告、聽導讀的時候不開
  AU.next = AU.ac.currentTime + 0.1; AU.step = 0; AU.bar = 0;
  AU.bgm.gain.cancelScheduledValues(AU.ac.currentTime);
  AU.bgm.gain.setValueAtTime(0.0001, AU.ac.currentTime);
  AU.bgm.gain.exponentialRampToValueAtTime(Math.max(0.001, S.settings.bgmVol), AU.ac.currentTime + 1.2);
  AU.timer = setInterval(() => {
    if (!AU.ac) return;
    while (AU.next < AU.ac.currentTime + 0.15) {
      const i = AU.step % 16; const swing = (i % 2) ? S16 * 0.14 : 0;
      schedStep(i, AU.next + swing);
      AU.next += S16; AU.step++; if (AU.step % 16 === 0) AU.bar++;
    }
  }, 30);
}
function bgmStop() { if (AU.timer) { clearInterval(AU.timer); AU.timer = null; } }
/* 看預告、短影音、語音導讀時把鼓組收掉：先淡出再整個停（不在背景空轉吃電），結束再淡入 */
function bgmDuck(on) {
  AU.duck = on; if (!AU.ac) return;
  clearTimeout(AU.duckT);
  AU.bgm.gain.cancelScheduledValues(AU.ac.currentTime);
  if (on) { AU.bgm.gain.setTargetAtTime(0.0001, AU.ac.currentTime, 0.15); AU.duckT = setTimeout(() => { if (AU.duck) bgmStop(); }, 800); return; }
  if (!S.settings.bgm || S.muted) return;
  if (AU.timer) AU.bgm.gain.setTargetAtTime(Math.max(0.0001, S.settings.bgmVol), AU.ac.currentTime, 0.15);
  else bgmStart();
}
function audioApply() {
  if (!AU.ac) return;
  AU.sfx.gain.value = S.settings.vol;
  if (S.settings.bgm && !S.muted) { AU.bgm.gain.setTargetAtTime(AU.duck ? 0.0001 : S.settings.bgmVol, AU.ac.currentTime, 0.1); bgmStart(); } else bgmStop();
}
document.addEventListener('visibilitychange', () => {
  if (!AU.ac) return;
  if (document.hidden) { bgmStop(); AU.ac.suspend && AU.ac.suspend(); }
  else { AU.ac.resume && AU.ac.resume(); if (S.settings.bgm && !S.muted && !AU.duck) bgmStart(); }
});
