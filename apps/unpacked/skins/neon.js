/* 解包 換裝：neon 的音色、配樂（build.py 從 audio.js 切出來） */
(window.__skinQ = window.__skinQ || []).push(function () {
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

});
