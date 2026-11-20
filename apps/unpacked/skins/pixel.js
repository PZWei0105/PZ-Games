/* 解包 換裝：pixel 的音色、配樂（build.py 從 audio.js 切出來） */
(window.__skinQ = window.__skinQ || []).push(function () {
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

});
