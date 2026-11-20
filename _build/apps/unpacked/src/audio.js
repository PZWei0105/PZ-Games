/* 解包 — 聲音：全部即時合成，沒有任何音檔。
   2026-11-20 換裝：四套音色各一組（塗鴉：噴漆、貼紙、刷碟；像素：8-bit 方波；霓虹：合成器、FM 鐘；紙本：翻頁、打字機、橡皮章），
   每套一首背景配樂（塗鴉 boom-bap、像素晶片音樂、霓虹 synthwave、紙本 lo-fi 爵士），換裝時交叉淡入淡出。
   程式其他地方照樣呼叫 sfx.stamp()、sfx.click()…，會自動用目前這一套的聲音。
   iPhone：AudioContext 一定要在點擊的當下同步建立；audioSession 設成 playback，側邊靜音鍵打開也有聲音。 */
const AU = { ac: null, master: null, sfx: null, bgm: null, NB: null, timer: null, duck: false, lanes: [], rev: null, pw: {} };

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
/* 殘響（霓虹、紙本用）和 8-bit 方波（像素用）：用到那一套才做，開 App 不多花時間 */
function revBuf() {
  if (AU.revBuf) return AU.revBuf;
  const sr = AU.ac.sampleRate, rl = Math.round(sr * 1.6), ir = AU.ac.createBuffer(2, rl, sr), k = Math.pow(0.0004, 1 / rl);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let g = 1; for (let i = 0; i < rl; i++) { d[i] = (Math.random() * 2 - 1) * g; g *= k; } }
  return (AU.revBuf = ir);
}
function revNode() {
  if (!AU.rev) { AU.rev = AU.ac.createConvolver(); AU.rev.buffer = revBuf(); const rg = AU.ac.createGain(); rg.gain.value = 0.55; AU.rev.connect(rg).connect(AU.master); }
  return AU.rev;
}
function pwave(type) {
  if (!AU.pw[type]) {
    const duty = type === 'p25' ? 25 : 12.5, n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty / 100);
    AU.pw[type] = AU.ac.createPeriodicWave(re, im);
  }
  return AU.pw[type];
}

function nz(t, d, { type = 'bandpass', f = 1000, q = 1, g = 0.5, f2 = null, bus = AU.sfx, a = 0.002 } = {}) {
  const s = AU.ac.createBufferSource(); s.buffer = AU.NB;
  const fl = AU.ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
  const gn = AU.ac.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + a); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl).connect(gn).connect(bus); s.start(t, Math.random() * Math.max(0.01, 1.45 - d)); s.stop(t + d + 0.05);
}
function tone(t, d, { type = 'sine', f = 440, f2 = null, g = 0.3, bus = AU.sfx, a = 0.003 } = {}) {
  const o = AU.ac.createOscillator(), gn = AU.ac.createGain();
  if (type === 'p12' || type === 'p25') o.setPeriodicWave(pwave(type)); else o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + a); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn).connect(bus); o.start(t); o.stop(t + d + 0.05);
}
/* 8-bit 音符：方波（可選佔空比）、平平的音量、短短的收尾（像掌機） */
function chip(t, d, { type = 'p25', f = 440, f2 = null, g = 0.05, bus = AU.sfx, vib = 0 } = {}) {
  const o = AU.ac.createOscillator(), gn = AU.ac.createGain();
  if (type === 'p12' || type === 'p25') o.setPeriodicWave(pwave(type)); else o.type = type;
  o.frequency.setValueAtTime(f, t); if (f2) o.frequency.linearRampToValueAtTime(f2, t + d);
  if (vib) { const l = AU.ac.createOscillator(), lg = AU.ac.createGain(); l.frequency.value = 6; lg.gain.value = f * vib; l.connect(lg).connect(o.frequency); l.start(t + d * 0.3); l.stop(t + d + 0.05); }
  gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(g, t + 0.004); gn.gain.setValueAtTime(g, t + Math.max(0.005, d - 0.02)); gn.gain.linearRampToValueAtTime(0, t + d);
  o.connect(gn).connect(bus); o.start(t); o.stop(t + d + 0.03);
}
/* 合成器：兩支微走音的鋸齒波＋會掃的低通濾波（霓虹的貝斯、琶音、鋪底） */
function syn(t, d, { type = 'sawtooth', f = 220, cut = 1800, cut2 = null, q = 4, g = 0.05, bus = AU.sfx, a = 0.005, r = 0.12, det = 7 } = {}) {
  const fl = AU.ac.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = q; fl.frequency.setValueAtTime(cut, t);
  if (cut2) fl.frequency.exponentialRampToValueAtTime(cut2, t + d);
  const gn = AU.ac.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + a);
  gn.gain.setValueAtTime(g, t + Math.max(a, d - r)); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  fl.connect(gn).connect(bus);
  [-det, det].forEach((c) => { const o = AU.ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = c; o.connect(fl); o.start(t); o.stop(t + d + 0.05); });
}
/* FM 鐘聲／電鋼琴：調變器打在載波頻率上，亮度跟著衰減 */
function fm(t, d, { f = 880, ratio = 3.5, idx = 2.2, g = 0.08, bus = AU.sfx, a = 0.004, trem = 0 } = {}) {
  const c = AU.ac.createOscillator(), m = AU.ac.createOscillator(), mg = AU.ac.createGain(), gn = AU.ac.createGain();
  c.frequency.value = f; m.frequency.value = f * ratio;
  mg.gain.setValueAtTime(f * idx, t); mg.gain.exponentialRampToValueAtTime(Math.max(1, f * idx * 0.05), t + d * 0.7);
  m.connect(mg).connect(c.frequency);
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + a); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  if (trem) { const l = AU.ac.createOscillator(), lg = AU.ac.createGain(); l.frequency.value = 4.2; lg.gain.value = g * trem; l.connect(lg).connect(gn.gain); l.start(t); l.stop(t + d + 0.05); }
  c.connect(gn).connect(bus); c.start(t); m.start(t); c.stop(t + d + 0.05); m.stop(t + d + 0.05);
}
const T = () => AU.ac.currentTime;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
/* 音效送去殘響（霓虹、紙本的鐘聲） */
function wetBus() { const w = AU.ac.createGain(); w.connect(AU.sfx); const s = AU.ac.createGain(); s.gain.value = 0.35; w.connect(s); s.connect(revNode()); return w; }

const SFX_G = {   // 塗鴉街頭：噴漆、貼紙、刷碟
  rattle() { const t = T(); for (let i = 0; i < 4; i++) { nz(t + i * 0.06, 0.04, { f: 3800, q: 4, g: 0.45 }); tone(t + i * 0.06, 0.03, { type: 'square', f: 2600 + Math.random() * 600, g: 0.04 }); } },
  hiss(d = 1.2) { const t = T(); nz(t, d, { type: 'highpass', f: 2500, g: 0.2, a: 0.05 }); nz(t, d, { f: 6000, q: 0.7, g: 0.1, a: 0.05 }); },
  spray() { const t = T(); nz(t, 0.22, { type: 'highpass', f: 3000, g: 0.16, a: 0.02 }); },
  whoosh() { nz(T(), 0.42, { f: 300, f2: 4500, q: 1.2, g: 0.4, a: 0.14 }); },
  slap() { const t = T(); nz(t, 0.15, { type: 'lowpass', f: 2200, g: 0.8 }); tone(t, 0.2, { f: 180, f2: 60, g: 0.5 }); },
  stamp() { const t = T(); nz(t, 0.09, { type: 'lowpass', f: 1600, g: 0.65 }); tone(t, 0.15, { f: 220, f2: 90, g: 0.42 }); },
  drop() { const t = T(); tone(t, 0.9, { f: 110, f2: 32, g: 0.9 }); nz(t, 0.35, { type: 'lowpass', f: 900, g: 0.55 }); tone(t, 0.5, { type: 'sawtooth', f: 55, f2: 40, g: 0.12 }); },
  squeak() { const t = T(); tone(t, 0.18, { type: 'triangle', f: 2400, f2: 3300, g: 0.05 }); nz(t, 0.18, { f: 5000, q: 3, g: 0.05 }); },
  tick() { const t = T(); tone(t, 0.045, { type: 'square', f: 1900, g: 0.05 }); nz(t, 0.035, { f: 4000, q: 2, g: 0.16 }); },
  type() { const t = T(); nz(t, 0.03, { f: 2500 + Math.random() * 1500, q: 3, g: 0.22 }); },
  blip(f = 1000) { tone(T(), 0.07, { type: 'square', f, g: 0.05 }); },
  ding() { const t = T(); tone(t, 1.1, { f: 1320, g: 0.16 }); tone(t, 0.9, { f: 1980, g: 0.07 }); tone(t + 0.16, 1.1, { f: 1320, g: 0.1 }); },
  scratch() { const t = T(); nz(t, 0.11, { f: 900, f2: 2600, q: 6, g: 0.45 }); nz(t + 0.11, 0.13, { f: 2600, f2: 700, q: 6, g: 0.45 }); },
  riser() { const t = T(); nz(t, 0.7, { f: 400, f2: 6000, q: 2, g: 0.22, a: 0.6 }); tone(t, 0.7, { type: 'sawtooth', f: 200, f2: 900, g: 0.035, a: 0.6 }); },
  rip() { const t = T(); for (let i = 0; i < 9; i++) nz(t + i * 0.035 + Math.random() * 0.02, 0.05, { f: 1200 + Math.random() * 2400, q: 2, g: 0.3 + Math.random() * 0.25 }); },
  click() { const t = T(); nz(t, 0.03, { type: 'highpass', f: 3000, g: 0.25 }); tone(t, 0.04, { f: 700, f2: 300, g: 0.12 }); },
  ping(f = 1600) { const t = T(); tone(t, 0.35, { f, f2: f * 0.97, g: 0.07 }); tone(t + 0.12, 0.3, { f, g: 0.025 }); },
  siren() { const t = T(); for (let i = 0; i < 3; i++) { tone(t + i * 0.32, 0.3, { type: 'sawtooth', f: 620, f2: 1240, g: 0.05 }); tone(t + i * 0.32, 0.3, { type: 'square', f: 310, f2: 620, g: 0.025 }); } },
  lock() { const t = T(); [0, 0.07, 0.14].forEach((d, i) => tone(t + d, 0.06, { type: 'square', f: 1400 + i * 260, g: 0.05 })); nz(t + 0.2, 0.08, { type: 'lowpass', f: 1500, g: 0.4 }); },
  pop() { const t = T(); tone(t, 0.12, { f: 500, f2: 1200, g: 0.18 }); nz(t, 0.05, { f: 3000, q: 3, g: 0.12 }); },
  // 行情板：開盤鐘（一天第一次打開）、數字跳動
  bell() { const t = T(); [0, 0.38, 0.76].forEach((d) => { tone(t + d, 1.5, { f: 880, g: 0.13 }); tone(t + d, 1.0, { f: 1763, g: 0.045 }); tone(t + d, 0.6, { f: 2645, g: 0.02 }); }); },
  tickUp(up = true) { tone(T(), 0.06, { type: 'triangle', f: up ? 1500 : 700, f2: up ? 1900 : 520, g: 0.06 }); },
  // 點播台：無線電發射
  radio() { const t = T(); nz(t, 0.22, { f: 2200, q: 1.5, g: 0.16, a: 0.01 }); [0, 0.08, 0.16, 0.24].forEach((d, i) => tone(t + 0.2 + d, 0.055, { type: 'square', f: i % 2 ? 1320 : 990, g: 0.05 })); nz(t + 0.55, 0.16, { type: 'highpass', f: 3500, g: 0.1 }); },
  // TGA：拆封、開獎
  fanfare() { const t = T(); [[0, [523, 659, 784]], [0.17, [587, 740, 880]], [0.34, [659, 831, 988]], [0.56, [784, 988, 1175, 1568]]].forEach(([d, ch]) => ch.forEach((f) => tone(t + d, d > 0.5 ? 1.3 : 0.2, { type: 'sawtooth', f, g: 0.032, a: 0.01 }))); tone(t + 0.56, 1.2, { f: 196, f2: 190, g: 0.3 }); nz(t + 0.56, 0.6, { type: 'highpass', f: 6000, g: 0.08, a: 0.02 }); },
  // 免費補給站：領到
  coin() { const t = T(); tone(t, 0.08, { type: 'square', f: 988, g: 0.06 }); tone(t + 0.08, 0.42, { type: 'square', f: 1319, g: 0.06 }); },
};

//@skin pixel
const SFX_PX = {   // 像素掌機：方波、三角波、8-bit 噪音
  rattle() { const t = T(); [0, 1, 2, 3].forEach((i) => chip(t + i * 0.05, 0.035, { f: i % 2 ? 1568 : 1175, g: 0.04 })); },
  hiss(d = 1.2) { const t = T(); nz(t, d, { type: 'highpass', f: 5200, g: 0.12, a: 0.03 }); for (let i = 0; i < 6; i++) chip(t + i * d / 6, 0.03, { type: 'p12', f: 3000 - i * 300, g: 0.02 }); },
  spray() { nz(T(), 0.14, { type: 'highpass', f: 5000, g: 0.1 }); },
  whoosh() { const t = T(); chip(t, 0.16, { type: 'p12', f: 400, f2: 1800, g: 0.035 }); nz(t, 0.18, { f: 1500, f2: 6000, q: 1, g: 0.12 }); },
  slap() { const t = T(); nz(t, 0.08, { type: 'lowpass', f: 2600, g: 0.55 }); chip(t, 0.09, { type: 'square', f: 320, f2: 90, g: 0.07 }); },
  stamp() { const t = T(); chip(t, 0.05, { type: 'p25', f: 784, g: 0.05 }); chip(t + 0.05, 0.09, { type: 'p25', f: 1046, g: 0.05 }); nz(t, 0.06, { type: 'lowpass', f: 1800, g: 0.35 }); },
  drop() { const t = T(); chip(t, 0.45, { type: 'triangle', f: 196, f2: 40, g: 0.32 }); nz(t, 0.32, { type: 'lowpass', f: 900, g: 0.5 }); chip(t, 0.22, { type: 'square', f: 110, f2: 55, g: 0.05 }); },
  squeak() { chip(T(), 0.12, { type: 'triangle', f: 1800, f2: 2600, g: 0.06 }); },
  tick() { chip(T(), 0.025, { type: 'p12', f: 2093, g: 0.035 }); },
  type() { chip(T(), 0.02, { type: 'p12', f: 1800 + Math.random() * 900, g: 0.03 }); },
  blip(f = 1000) { chip(T(), 0.05, { f, g: 0.045 }); },
  ding() { const t = T(); [1319, 1568, 2093, 2637].forEach((f, i) => chip(t + i * 0.065, i === 3 ? 0.3 : 0.07, { f, g: 0.045 })); },
  scratch() { const t = T(); chip(t, 0.1, { type: 'p12', f: 1400, f2: 260, g: 0.045 }); },
  riser() { const t = T(); chip(t, 0.62, { type: 'p25', f: 180, f2: 1500, g: 0.035, vib: 0.03 }); },
  rip() { const t = T(); for (let i = 0; i < 6; i++) nz(t + i * 0.035, 0.03, { type: 'highpass', f: 2500 + i * 300, g: 0.25 }); },
  click() { chip(T(), 0.032, { type: 'p25', f: 1760, g: 0.04 }); },
  ping(f = 1600) { const t = T(); chip(t, 0.06, { f, g: 0.04 }); chip(t + 0.09, 0.06, { f, g: 0.02 }); chip(t + 0.18, 0.06, { f, g: 0.01 }); },
  siren() { const t = T(); for (let i = 0; i < 6; i++) chip(t + i * 0.12, 0.11, { type: 'square', f: i % 2 ? 660 : 880, g: 0.035 }); },
  lock() { const t = T(); [988, 1319, 1976].forEach((f, i) => chip(t + i * 0.06, 0.055, { f, g: 0.04 })); nz(t + 0.2, 0.06, { type: 'lowpass', f: 1500, g: 0.3 }); },
  pop() { const t = T(); chip(t, 0.04, { f: 1046, g: 0.04 }); chip(t + 0.04, 0.06, { f: 1568, g: 0.04 }); },
  bell() { const t = T(); [0, 0.3, 0.6].forEach((d) => { chip(t + d, 0.08, { f: 2093, g: 0.04 }); chip(t + d + 0.08, 0.2, { f: 1568, g: 0.03 }); }); },
  tickUp(up = true) { chip(T(), 0.05, { type: 'p12', f: up ? 1319 : 784, f2: up ? 1760 : 587, g: 0.03 }); },
  radio() { const t = T(); for (let i = 0; i < 10; i++) chip(t + i * 0.035, 0.028, { type: 'p12', f: 900 + ((i * 7) % 5) * 260, g: 0.03 }); },
  fanfare() { const t = T(); const N = [[0, 523], [0.1, 659], [0.2, 784], [0.3, 1046], [0.45, 784], [0.55, 1046]]; N.forEach(([d, f]) => chip(t + d, 0.09, { f, g: 0.05 })); chip(t + 0.7, 0.6, { f: 1318, g: 0.05, vib: 0.02 }); chip(t + 0.7, 0.6, { type: 'p12', f: 1046, g: 0.03 }); chip(t + 0.7, 0.6, { type: 'triangle', f: 131, g: 0.25 }); },
  coin() { const t = T(); chip(t, 0.07, { f: 988, g: 0.05 }); chip(t + 0.07, 0.35, { f: 1319, g: 0.05 }); },
  flip() { chip(T(), 0.1, { type: 'p12', f: 2200, f2: 600, g: 0.035 }); },
  zap() { const t = T(); chip(t, 0.16, { type: 'square', f: 1800, f2: 120, g: 0.05 }); },
};

SFX_BANK.pixel = SFX_PX;
//@end

//@skin neon
const SFX_NE = {   // 霓虹賽博：合成器、FM 鐘、數位雜訊
  rattle() { const t = T(); [0, 1, 2, 3].forEach((i) => fm(t + i * 0.045, 0.05, { f: 1800 + i * 220, ratio: 2, idx: 1, g: 0.03 })); },
  hiss(d = 1.2) { const t = T(); nz(t, d, { f: 7000, q: 0.6, g: 0.1, a: 0.2 }); nz(t, d, { type: 'highpass', f: 9000, g: 0.06, a: 0.1 }); },
  spray() { nz(T(), 0.2, { f: 6500, q: 0.8, g: 0.1, a: 0.04 }); },
  whoosh() { const t = T(); nz(t, 0.4, { f: 200, f2: 7000, q: 3, g: 0.32, a: 0.12 }); syn(t, 0.35, { f: 110, cut: 300, cut2: 3000, g: 0.03 }); },
  slap() { const t = T(); syn(t, 0.22, { f: 110, cut: 2400, cut2: 160, q: 6, g: 0.09, r: 0.15 }); tone(t, 0.2, { f: 150, f2: 55, g: 0.4 }); nz(t, 0.05, { type: 'highpass', f: 4000, g: 0.15 }); },
  stamp() { const t = T(); syn(t, 0.14, { type: 'square', f: 440, cut: 4000, cut2: 300, q: 8, g: 0.06, r: 0.1 }); tone(t, 0.16, { f: 160, f2: 60, g: 0.38 }); },
  drop() { const t = T(); tone(t, 1.0, { f: 92, f2: 28, g: 0.85 }); syn(t, 0.6, { f: 55, cut: 900, cut2: 80, q: 3, g: 0.08 }); nz(t, 0.5, { f: 3000, f2: 200, q: 1, g: 0.18, bus: wetBus() }); },
  squeak() { const t = T(); fm(t, 0.16, { f: 2400, ratio: 1.5, idx: 0.6, g: 0.04 }); },
  tick() { const t = T(); tone(t, 0.025, { f: 2900, g: 0.05 }); nz(t, 0.012, { type: 'highpass', f: 7000, g: 0.12 }); },
  type() { const t = T(); tone(t, 0.018, { f: 2200 + Math.random() * 1600, g: 0.04 }); },
  blip(f = 1000) { fm(T(), 0.09, { f, ratio: 2, idx: 1.2, g: 0.05 }); },
  ding() { const t = T(); fm(t, 1.4, { f: 1320, ratio: 3.5, idx: 2.4, g: 0.09, bus: wetBus() }); fm(t + 0.12, 1.2, { f: 1980, ratio: 3.5, idx: 1.6, g: 0.05, bus: wetBus() }); },
  scratch() { const t = T(); [0, 0.04, 0.08].forEach((d, i) => tone(t + d, 0.035, { type: 'square', f: [1700, 600, 2400][i], g: 0.04 })); nz(t, 0.12, { f: 3000, q: 4, g: 0.15 }); },
  riser() { const t = T(); syn(t, 0.75, { f: 110, cut: 200, cut2: 6000, q: 6, g: 0.05, a: 0.5, r: 0.08 }); nz(t, 0.75, { f: 500, f2: 9000, q: 2, g: 0.16, a: 0.6 }); },
  rip() { const t = T(); for (let i = 0; i < 7; i++) nz(t + i * 0.03, 0.035, { f: 800 + Math.random() * 5000, q: 6, g: 0.25 }); },
  click() { const t = T(); tone(t, 0.03, { f: 1500, f2: 900, g: 0.08 }); nz(t, 0.015, { type: 'highpass', f: 6000, g: 0.14 }); },
  ping(f = 1600) { fm(T(), 0.6, { f, ratio: 3.5, idx: 1.5, g: 0.06, bus: wetBus() }); },
  siren() { const t = T(); for (let i = 0; i < 3; i++) syn(t + i * 0.3, 0.28, { f: 440, cut: 600, cut2: 4000, q: 9, g: 0.05, r: 0.05 }); },
  lock() { const t = T(); [1046, 1568, 2093].forEach((f, i) => fm(t + i * 0.06, 0.08, { f, ratio: 2, idx: 1, g: 0.04 })); tone(t + 0.2, 0.14, { f: 140, f2: 60, g: 0.35 }); },
  pop() { const t = T(); tone(t, 0.09, { f: 500, f2: 1500, g: 0.12 }); },
  bell() { const t = T(); [0, 0.36, 0.72].forEach((d) => fm(t + d, 1.4, { f: 880, ratio: 3.5, idx: 2, g: 0.07, bus: wetBus() })); },
  tickUp(up = true) { tone(T(), 0.06, { f: up ? 1700 : 800, f2: up ? 2300 : 560, g: 0.06 }); },
  radio() { const t = T(); nz(t, 0.24, { f: 2600, q: 3, g: 0.12 }); [0, 0.07, 0.14, 0.21, 0.28].forEach((d, i) => fm(t + 0.22 + d, 0.05, { f: i % 2 ? 1760 : 1320, ratio: 2, idx: 1.4, g: 0.035 })); },
  fanfare() { const t = T(); [[0, [57, 64, 69]], [0.18, [53, 60, 65]], [0.36, [55, 62, 67]], [0.58, [57, 64, 69, 76]]].forEach(([d, ch]) => ch.forEach((m) => syn(t + d, d > 0.5 ? 1.4 : 0.22, { f: mtof(m + 12), cut: 3500, cut2: 900, q: 2, g: 0.022, r: d > 0.5 ? 0.8 : 0.06, bus: wetBus() }))); tone(t + 0.58, 1.2, { f: 110, f2: 108, g: 0.3 }); },
  coin() { const t = T(); fm(t, 0.08, { f: 1568, ratio: 2, idx: 1, g: 0.05 }); fm(t + 0.08, 0.4, { f: 2093, ratio: 3.5, idx: 1.4, g: 0.05, bus: wetBus() }); },
  flip() { nz(T(), 0.22, { f: 900, f2: 5000, q: 2, g: 0.2, a: 0.05 }); },
  zap() { const t = T(); syn(t, 0.2, { f: 1800, cut: 6000, cut2: 200, q: 10, g: 0.05 }); tone(t, 0.18, { type: 'square', f: 2600, f2: 90, g: 0.035 }); },
};

SFX_BANK.neon = SFX_NE;
//@end

//@skin paper
const SFX_PA = {   // 紙本雜誌：翻頁、鉛筆、打字機、橡皮章、桌鈴
  rattle() { const t = T(); for (let i = 0; i < 5; i++) nz(t + i * 0.045, 0.04, { type: 'lowpass', f: 3200, g: 0.22 }); },
  hiss(d = 1.2) { const t = T(); const n = Math.round(d * 16); for (let i = 0; i < n; i++) nz(t + i * d / n, 0.05, { f: 2400 + (i % 3) * 400, q: 1.4, g: 0.12 }); },
  spray() { const t = T(); for (let i = 0; i < 3; i++) nz(t + i * 0.05, 0.05, { f: 2600, q: 1.4, g: 0.12 }); },
  whoosh() { const t = T(); nz(t, 0.32, { f: 700, f2: 3600, q: 0.9, g: 0.3, a: 0.13 }); nz(t + 0.2, 0.08, { type: 'lowpass', f: 1500, g: 0.25 }); },
  slap() { const t = T(); nz(t, 0.12, { type: 'lowpass', f: 1100, g: 0.7 }); tone(t, 0.14, { f: 150, f2: 70, g: 0.35 }); },
  stamp() { const t = T(); tone(t, 0.16, { f: 170, f2: 80, g: 0.5 }); nz(t, 0.07, { type: 'lowpass', f: 700, g: 0.6 }); tone(t + 0.09, 0.05, { type: 'triangle', f: 2600, f2: 2900, g: 0.015 }); },
  drop() { const t = T(); tone(t, 0.55, { f: 95, f2: 38, g: 0.8 }); nz(t, 0.4, { type: 'lowpass', f: 420, g: 0.6 }); nz(t + 0.02, 0.18, { f: 1200, q: 0.8, g: 0.15 }); },
  squeak() { tone(T(), 0.12, { type: 'triangle', f: 2100, f2: 2500, g: 0.03 }); },
  tick() { nz(T(), 0.012, { f: 4200, q: 5, g: 0.3 }); },
  type() { const t = T(); nz(t, 0.016, { type: 'highpass', f: 2500, g: 0.4 }); tone(t, 0.03, { f: 190, f2: 120, g: 0.14 }); },
  blip(f = 1000) { const t = T(); tone(t, 0.06, { type: 'triangle', f: f * 0.5, g: 0.09 }); nz(t, 0.01, { f: 3000, q: 3, g: 0.15 }); },
  ding() { const t = T(); tone(t, 1.3, { f: 2093, g: 0.09 }); tone(t, 0.9, { f: 4419, g: 0.025 }); tone(t, 0.6, { f: 5634, g: 0.012 }); },
  scratch() { const t = T(); nz(t, 0.03, { f: 5200, q: 9, g: 0.4 }); nz(t + 0.09, 0.035, { f: 4600, q: 9, g: 0.4 }); },
  riser() { const t = T(); for (let i = 0; i < 10; i++) nz(t + i * 0.06, 0.05, { f: 1500 + i * 220, q: 1.2, g: 0.06 + i * 0.012 }); },
  rip() { const t = T(); for (let i = 0; i < 9; i++) nz(t + i * 0.032 + Math.random() * 0.015, 0.045, { f: 900 + Math.random() * 1800, q: 1.5, g: 0.24 + Math.random() * 0.2 }); },
  click() { const t = T(); nz(t, 0.018, { f: 3200, q: 2, g: 0.3 }); tone(t, 0.025, { f: 900, f2: 600, g: 0.05 }); },
  ping(f = 1600) { tone(T(), 0.5, { f, g: 0.06 }); },
  siren() { const t = T(); [0, 0.3, 0.6].forEach((d) => { tone(t + d, 0.7, { f: 2637, g: 0.07 }); tone(t + d, 0.5, { f: 5274, g: 0.02 }); }); },
  lock() { const t = T(); nz(t, 0.02, { type: 'highpass', f: 2000, g: 0.4 }); nz(t + 0.08, 0.03, { type: 'lowpass', f: 1500, g: 0.5 }); tone(t + 0.08, 0.08, { f: 260, f2: 140, g: 0.2 }); },
  pop() { const t = T(); nz(t, 0.04, { type: 'lowpass', f: 1400, g: 0.35 }); tone(t, 0.07, { f: 420, f2: 720, g: 0.08 }); },
  bell() { const t = T(); [0, 0.36, 0.72].forEach((d) => { tone(t + d, 1.2, { f: 2637, g: 0.07 }); tone(t + d, 0.8, { f: 6900, g: 0.012 }); }); },
  tickUp(up = true) { tone(T(), 0.045, { type: 'triangle', f: up ? 1250 : 820, g: 0.06 }); },
  radio() { const t = T(); [0, 0.1, 0.2, 0.36, 0.46].forEach((d, i) => tone(t + d, i === 2 ? 0.12 : 0.06, { f: 880, g: 0.06 })); },
  fanfare() { const t = T(); [[0, [60, 64, 67]], [0.16, [62, 65, 69]], [0.32, [64, 67, 71]], [0.52, [65, 69, 72, 76]]].forEach(([d, ch]) => ch.forEach((m, k) => fm(t + d + k * 0.012, d > 0.5 ? 1.8 : 0.3, { f: mtof(m + 12), ratio: 1, idx: 0.9, g: 0.04, trem: d > 0.5 ? 0.3 : 0, bus: wetBus() }))); tone(t + 0.52, 1.2, { f: 87, g: 0.22 }); },
  coin() { const t = T(); nz(t, 0.05, { f: 3500, q: 3, g: 0.3 }); tone(t + 0.04, 0.9, { f: 2093, g: 0.07 }); tone(t + 0.04, 0.5, { f: 3136, g: 0.03 }); },
  flip() { const t = T(); nz(t, 0.28, { f: 600, f2: 3200, q: 0.8, g: 0.32, a: 0.12 }); nz(t + 0.24, 0.06, { type: 'lowpass', f: 1300, g: 0.3 }); },
  zap() { this.flip(); },
};

SFX_BANK.paper = SFX_PA;
//@end

const SFX_BANK = { graffiti: SFX_G };   // 其他三套的音色在 skins/<名字>.js（換上那一套才載入，組建時從這個檔切出去）
SFX_G.flip = SFX_G.whoosh; SFX_G.zap = SFX_G.riser;
/* 四套音效一樣大聲：離線算過每一個聲音的 RMS，跟塗鴉版對齊（_ 是那一套的預設倍率） */
const SFX_TRIM = {
  pixel: { _: 2.8, drop: 1.1, rip: 0.9, fanfare: 0.65, slap: 1.9, lock: 1.8, siren: 0.7, squeak: 0.55, zap: 0.7, stamp: 5, coin: 1.5, tickUp: 3, radio: 3, click: 5, type: 5, pop: 4.5, bell: 4, blip: 1.5 },
  neon: { _: 1.5, drop: 1.05, stamp: 1.1, lock: 0.5, zap: 0.45, fanfare: 1.3, siren: 0.45, rattle: 2.4, hiss: 3, spray: 6, click: 2.1, type: 2.4, rip: 2.4 },
  paper: { _: 1.35, stamp: 1.1, drop: 1.05, type: 0.45, lock: 0.45, coin: 1.2, rattle: 1, slap: 1.4, click: 2.4, hiss: 3.6, spray: 6, siren: 0.75, zap: 0.8, blip: 0.85, whoosh: 0.9, flip: 0.95 },
};
function sfxRun(id, k, a) {
  const B = SFX_BANK[id] || SFX_G; const f = B[k] || SFX_G[k]; if (!f) return;
  const tr = SFX_TRIM[id]; const g = tr ? (tr[k] != null ? tr[k] : tr._) : 1;
  if (g === 1) { f.apply(B, a); return; }
  const n = AU.ac.createGain(); n.gain.value = g; n.connect(AU.sfx);
  const keep = AU.sfx; AU.sfx = n;
  try { f.apply(B, a); } finally { AU.sfx = keep; }
}
/* sfx.名字()：用目前這一套的聲音；sfxFor(套, 名字)：指定某一套（換裝轉場用新的那一套的聲音） */
const sfx = {};
Object.keys(SFX_G).forEach((k) => { sfx[k] = (...a) => { if (!sndOK()) return; sfxRun(skinId(), k, a); }; });
function sfxFor(id, k) { if (!sndOK()) return; sfxRun(id, k, []); }

/* ---- boom-bap 鼓組（92 BPM，帶一點搖擺） ---- */
const G_S16 = 60 / 92 / 4;
const KICK = [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0];
const SNR = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1];
const HAT = [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1];
const BASS = [41, 0, 0, 0, 0, 0, 0, 41, 0, 0, 44, 0, 0, 0, 39, 0];  // MIDI 音（F、Ab、Eb）
const STAB = [65, 68, 72];
function stepG(i, t, bar, L) {
  const B = L.out;
  if (KICK[i]) { tone(t, 0.4, { f: 140, f2: 42, g: 0.85, bus: B }); tone(t, 0.02, { type: 'square', f: 900, g: 0.06, bus: B }); }
  if (SNR[i]) { nz(t, 0.18, { f: 1800, q: 0.8, g: 0.55, bus: B }); tone(t, 0.1, { type: 'triangle', f: 240, f2: 160, g: 0.25, bus: B }); }
  if (HAT[i]) nz(t, i % 4 === 2 ? 0.08 : 0.03, { type: 'highpass', f: 7000, g: i % 2 ? 0.08 : 0.14, bus: B });
  if (BASS[i]) tone(t, 0.32, { type: 'triangle', f: mtof(BASS[i]), g: 0.32, bus: B, a: 0.01 });
  if (i === 0 && bar % 2 === 0) STAB.forEach((m, k) => tone(t + k * 0.004, 0.5, { type: 'sawtooth', f: mtof(m), g: 0.022, bus: B, a: 0.01 }));
  if (i === 12 && bar % 8 === 7) { nz(t, 0.1, { f: 900, f2: 2600, q: 6, g: 0.25, bus: B }); nz(t + 0.1, 0.12, { f: 2600, f2: 700, q: 6, g: 0.25, bus: B }); }
  if (i === 0) nz(t, G_S16 * 16, { type: 'bandpass', f: 4500, q: 0.4, g: 0.012, bus: B, a: 0.2 });  // 黑膠沙沙聲
}

const BGM = { graffiti: { bpm: 92, swing: 0.14, step: stepG } };   // 其他三首在 skins/<名字>.js
//@skin pixel
/* ---- 像素掌機：晶片電玩（118 BPM；方波主旋律、12.5% 方波琶音、三角波貝斯、噪音鼓）----
   A 段 8 小節（Am F C G ×2）＋ B 段 4 小節（F G Em Am）；第二輪主旋律降八度換音色、B 段只剩伴奏，不會一直同一句 */
const PX_CH = { Am: [45, [69, 72, 76]], F: [41, [65, 69, 72]], C: [48, [67, 72, 76]], G: [43, [67, 71, 74]], Em: [40, [64, 67, 71]] };
const PX_SEQ = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G', 'Em', 'Am'];
const PX_LEAD = [
  [[0, 76, 2], [2, 74, 2], [4, 72, 2], [6, 74, 2], [8, 76, 4], [12, 79, 2], [14, 76, 2]],
  [[0, 77, 3], [3, 76, 1], [4, 74, 4], [8, 72, 2], [10, 74, 2], [12, 76, 4]],
  [[0, 79, 2], [2, 76, 2], [4, 72, 2], [6, 76, 2], [8, 79, 3], [11, 81, 1], [12, 79, 4]],
  [[0, 74, 2], [2, 76, 2], [4, 79, 2], [6, 78, 2], [8, 79, 6], [14, 71, 2]],
  [[0, 72, 2], [2, 76, 2], [4, 81, 4], [8, 79, 2], [10, 76, 2], [12, 74, 2], [14, 76, 2]],
  [[0, 77, 2], [2, 81, 2], [4, 84, 4], [8, 81, 2], [10, 77, 2], [12, 76, 2], [14, 74, 2]],
  [[0, 76, 2], [2, 79, 2], [4, 84, 2], [6, 83, 2], [8, 81, 4], [12, 79, 4]],
  [[0, 79, 2], [2, 77, 2], [4, 76, 2], [6, 74, 2], [8, 71, 4], [12, 74, 2], [14, 79, 2]],
  [[0, 72, 4], [4, 69, 4], [8, 72, 4], [12, 74, 4]],
  [[0, 74, 4], [4, 71, 4], [8, 74, 4], [12, 76, 4]],
  [[0, 76, 6], [6, 74, 2], [8, 71, 4], [12, 67, 4]],
  [[0, 69, 8], [8, 72, 2], [10, 74, 2], [12, 76, 4]],
];
const PX_S16 = 60 / 118 / 4;
function stepPX(i, t, bar, L) {
  const B = L.out, b = bar % 24, sec = b % 12, [root, arp] = PX_CH[PX_SEQ[sec]], two = b >= 12;
  if (i % 4 === 0 && !(i === 12 && sec % 2 === 0)) chip(t, 0.09, { type: 'triangle', f: 170, f2: 48, g: 0.42, bus: B });
  if (i === 4 || i === 12) nz(t, 0.1, { type: 'highpass', f: 1600, g: 0.24, bus: B });
  if (i % 2 === 0) nz(t, 0.022, { type: 'highpass', f: 8500, g: i % 4 === 2 ? 0.07 : 0.035, bus: B });
  if (sec === 11 && i >= 12) nz(t, 0.05, { type: 'highpass', f: 2200 - (i - 12) * 200, g: 0.16, bus: B });   // 過門
  if (i % 2 === 0) chip(t, PX_S16 * 1.7, { type: 'triangle', f: mtof(root + (i % 4 === 2 ? 12 : 0)), g: 0.2, bus: B });
  chip(t, PX_S16 * 0.85, { type: 'p12', f: mtof(arp[i % 3] + (i >= 8 ? 12 : 0)), g: two && sec >= 8 ? 0.024 : 0.014, bus: B });
  if (two && sec >= 8) return;   // 第二輪的 B 段只剩伴奏
  (PX_LEAD[sec] || []).forEach(([s, m, len]) => { if (s === i) chip(t, len * PX_S16 * 0.94, { type: two ? 'p12' : 'p25', f: mtof(m - (two ? 12 : 0)), g: two ? 0.05 : 0.042, bus: B, vib: len >= 4 ? 0.012 : 0 }); });
}

BGM.pixel = { bpm: 118, swing: 0, step: stepPX, vol: 0.76 };
//@end
//@skin neon
/* ---- 霓虹賽博：synthwave（100 BPM；四拍大鼓、八分音符貝斯、方波琶音加回聲、鋸齒鋪底、第 9～12 小節主旋律）---- */
const NE_CH = [[33, [57, 60, 64, 69], [69, 72, 76, 81]], [29, [53, 57, 60, 65], [65, 69, 72, 77]], [36, [55, 60, 64, 67], [67, 72, 76, 79]], [31, [55, 59, 62, 67], [67, 71, 74, 79]]];
const NE_ARP = [0, 1, 2, 3, 2, 1, 2, 3];
const NE_HOOK = [[[0, 76, 6], [6, 74, 2], [8, 72, 8]], [[0, 72, 6], [6, 69, 2], [8, 77, 8]], [[0, 76, 6], [6, 74, 2], [8, 72, 4], [12, 74, 4]], [[0, 71, 12], [12, 74, 4]]];
const NE_S16 = 60 / 100 / 4;
function setupNE(L) {
  // 琶音的回聲：附點八分音符、回授 38%、回聲越來越暗
  const d = AU.ac.createDelay(1); d.delayTime.value = NE_S16 * 3; const fb = AU.ac.createGain(); fb.gain.value = 0.38;
  const lp = AU.ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  d.connect(lp).connect(fb).connect(d); lp.connect(L.bus);
  L.arp = AU.ac.createGain(); L.arp.connect(L.out); L.arp.connect(d);
}
function stepNE(i, t, bar, L) {
  const B = L.out, b = bar % 16, [root, pad, arp] = NE_CH[b % 4], intro = b < 2, brk = b >= 12;
  if (!intro && !brk && i % 4 === 0) tone(t, 0.32, { f: 130, f2: 42, g: 0.78, bus: B });
  if (!intro && (i === 4 || i === 12)) { nz(t, 0.24, { f: 1700, q: 0.8, g: brk ? 0.18 : 0.34, bus: B }); tone(t, 0.12, { type: 'triangle', f: 220, f2: 160, g: 0.16, bus: B }); }
  if (!intro && i % 4 === 2) nz(t, 0.05, { type: 'highpass', f: 8000, g: 0.09, bus: B });
  if (i % 2 === 1 && !brk) nz(t, 0.025, { type: 'highpass', f: 10000, g: 0.035, bus: B });
  if (i % 2 === 0 && !brk) syn(t, NE_S16 * 1.7, { f: mtof(root + (i % 4 === 2 ? 12 : 0)), cut: 900, cut2: 200, q: 7, g: 0.07, r: 0.04, bus: B });
  if (i === 0) pad.forEach((m) => syn(t, NE_S16 * 16, { f: mtof(m), cut: 1500, q: 1, g: 0.014, a: 0.55, r: 0.6, det: 12, bus: B }));
  const sweep = 1900 + 1400 * Math.sin((bar * 16 + i) / 40);
  syn(t, NE_S16 * 0.9, { type: 'square', f: mtof(arp[NE_ARP[i % 8]]), cut: sweep, q: 5, g: brk ? 0.026 : 0.018, r: 0.04, det: 3, bus: L.arp });
  if (b >= 8 && b < 12) (NE_HOOK[b - 8] || []).forEach(([s, m, len]) => { if (s === i) syn(t, len * NE_S16, { f: mtof(m), cut: 3200, q: 2, g: 0.03, a: 0.02, r: 0.25, det: 9, bus: L.arp }); });
  if (b === 15 && i === 8) nz(t, NE_S16 * 8, { f: 300, f2: 8000, q: 2, g: 0.12, a: NE_S16 * 7, bus: B });   // 回到開頭前的上升
}

BGM.neon = { bpm: 100, swing: 0, step: stepNE, setup: setupNE, rev: 0.22 };
//@end
//@skin paper
/* ---- 紙本雜誌：lo-fi 爵士（80 BPM、搖擺；Dm9–G13–Cmaj9–Am9；電鋼琴、木貝斯、刷子小鼓、黑膠沙沙）---- */
const PA_CH = [[38, [53, 57, 60, 64]], [43, [53, 57, 59, 64]], [36, [52, 55, 59, 62]], [45, [55, 59, 60, 64]]];
const PA_S16 = 60 / 80 / 4;
function setupPA(L) {   // 整首過一道低通：溫一點、像從舊收音機傳出來
  const lp = AU.ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200; lp.Q.value = 0.5; lp.connect(L.bus); L.out = lp;
}
function stepPA(i, t, bar, L) {
  const B = L.out, b = bar % 8, [root, ch] = PA_CH[b % 4], nxt = PA_CH[(b + 1) % 4][0];
  if (i === 0 || i === 10) tone(t, 0.3, { f: 96, f2: 44, g: 0.48, bus: B });
  if (i === 4 || i === 12) { nz(t, 0.16, { f: 2300, q: 0.7, g: 0.15, bus: B }); nz(t, 0.05, { type: 'highpass', f: 5200, g: 0.07, bus: B }); }
  if (i === 7 || i === 15) nz(t, 0.04, { f: 2300, q: 0.7, g: 0.04, bus: B });
  if (i % 2 === 0) nz(t, 0.03, { type: 'highpass', f: 9000, g: i % 4 === 2 ? 0.055 : 0.03, bus: B });
  const bass = { 0: [root, 5], 6: [root + 7, 2], 10: [root + 10, 2], 14: [nxt - 1, 2] }[i];
  if (bass) { tone(t, bass[1] * PA_S16 * 1.15, { f: mtof(bass[0]), g: 0.3, a: 0.008, bus: B }); tone(t, 0.08, { type: 'triangle', f: mtof(bass[0] + 12), g: 0.03, bus: B }); }
  if (i === 0) ch.forEach((m, k) => fm(t + k * 0.018, PA_S16 * 14, { f: mtof(m + 12), ratio: 1, idx: 0.75, g: 0.024, trem: 0.3, bus: L.wet }));
  if (i === 10 && b % 2 === 1) ch.slice(1).forEach((m) => fm(t, 0.5, { f: mtof(m + 12), ratio: 1, idx: 0.6, g: 0.016, bus: L.wet }));
  if (b >= 4 && i === 2 && b % 2 === 0) [76, 79, 81].forEach((m, k) => fm(t + k * PA_S16 * 1.5, 0.6, { f: mtof(m), ratio: 4, idx: 0.5, g: 0.012, bus: L.wet }));   // 偶爾一句鐵琴
  if (Math.random() < 0.35) nz(t + Math.random() * PA_S16, 0.004, { type: 'highpass', f: 2500, g: 0.04 + Math.random() * 0.06, bus: B });   // 黑膠爆音
  if (i === 0) nz(t, PA_S16 * 16, { f: 5000, q: 0.3, g: 0.007, a: 0.2, bus: B });
}

BGM.paper = { bpm: 80, swing: 0.2, step: stepPA, setup: setupPA, rev: 0.16, vol: 1.55 };   // vol：四首聽起來一樣大聲（離線算過 RMS）
//@end
function laneNew(id) {
  const def = BGM[id] || BGM.graffiti;
  const L = { id, def, next: AU.ac.currentTime + 0.12, step: 0, bar: 0, dying: 0 };
  L.vol = def.vol || 1;
  L.bus = AU.ac.createGain(); L.bus.gain.value = L.vol; L.bus.connect(AU.bgm); L.out = L.bus; L.wet = L.bus;
  if (def.rev) {   // 殘響：配樂自己一個（跟著配樂音量淡出淡入）
    if (!AU.revB) { AU.revB = AU.ac.createConvolver(); AU.revB.buffer = revBuf(); AU.revB.connect(AU.bgm); }
    const s = AU.ac.createGain(); s.gain.value = def.rev; L.bus.connect(s); s.connect(AU.revB);
  }
  if (def.setup) def.setup(L);
  if (L.out !== L.bus && L.wet === L.bus) L.wet = L.out;
  return L;
}
function bgmTick() {
  if (!AU.ac) return;
  const now = AU.ac.currentTime;
  AU.lanes.forEach((L) => {
    const s16 = 60 / L.def.bpm / 4;
    if (L.next < now - 0.5) L.next = now + 0.05;   // 卡住太久（切到背景回來）就從現在開始，不要一口氣補一堆音
    while (L.next < now + 0.15) {
      const i = L.step % 16, sw = (i % 2) ? s16 * (L.def.swing || 0) : 0;
      if (!L.dying) { try { L.def.step(i, L.next + sw, L.bar, L); } catch (e) { /* 一個音出錯不要讓整首停 */ } }
      L.next += s16; L.step++; if (L.step % 16 === 0) L.bar++;
    }
  });
  AU.lanes = AU.lanes.filter((L) => { if (L.dying && now > L.dying) { try { L.bus.disconnect(); } catch (e) { /* */ } return false; } return true; });
}
function bgmStart() {
  if (!AU.ac || !S.settings.bgm || S.muted || AU.timer || AU.duck) return;   // 看預告、聽導讀的時候不開
  const now = AU.ac.currentTime;
  AU.lanes.forEach((L) => { try { L.bus.disconnect(); } catch (e) { /* */ } });
  AU.lanes = [laneNew(skinId())];
  AU.bgm.gain.cancelScheduledValues(now);
  AU.bgm.gain.setValueAtTime(0.0001, now);
  AU.bgm.gain.exponentialRampToValueAtTime(Math.max(0.001, S.settings.bgmVol), now + 1.2);
  AU.timer = setInterval(bgmTick, 30);
}
function bgmStop() { if (AU.timer) { clearInterval(AU.timer); AU.timer = null; } }
/* 換裝：舊的配樂 1.4 秒淡出、新的 1.6 秒淡入（兩首同時在跑一小段） */
function bgmSkin(id) {
  if (!AU.ac || !AU.timer) return;
  const now = AU.ac.currentTime;
  AU.lanes.forEach((L) => { if (!L.dying) { L.bus.gain.setValueAtTime(L.bus.gain.value || 1, now); L.bus.gain.linearRampToValueAtTime(0.0001, now + 1.4); L.dying = now + 1.5; } });
  const N = laneNew(id); N.bus.gain.setValueAtTime(0.0001, now); N.bus.gain.linearRampToValueAtTime(N.vol, now + 1.6); N.next = now + 0.25;
  AU.lanes.push(N);
}
/* 看預告、短影音、語音導讀時把配樂收掉：先淡出再整個停（不在背景空轉吃電），結束再淡入 */
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
