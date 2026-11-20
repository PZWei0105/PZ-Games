/* 解包 換裝：paper 的音色、配樂（build.py 從 audio.js 切出來） */
(window.__skinQ = window.__skinQ || []).push(function () {
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

});
