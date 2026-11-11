// ============ 彩窗：半身像、小頭像、片頭與殘窗 ============
const _port = {};
// 把一張平塗的圖變成鑲嵌彩窗：不規則小格、鉛條、背光
function glassify(src, lines, o) {
  // 色塊照原圖（邊界才會跟著輪廓走），不規則小格只負責每片玻璃的明暗與細鉛條
  const W = src.width, H = src.height, out = mkCanvas(W, H), g = out.getContext('2d'), cell = o.cell || 26, rr = mulberry32(o.seed || 7);
  g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop';
  const nx = Math.ceil(W / cell) + 1, ny = Math.ceil(H / cell) + 1, P = [];
  for (let j = 0; j <= ny; j++) { P.push([]); for (let i = 0; i <= nx; i++) P[j].push([i * cell + (rr() - .5) * cell * .66 - cell * .5, j * cell + (rr() - .5) * cell * .66 - cell * .5]); }
  const pane = pts => { const v = rr(), t = v < .42 ? `rgba(255,252,240,${.03 + rr() * .15})` : v < .84 ? `rgba(6,8,22,${.03 + rr() * .17})` : `rgba(255,214,130,${.05 + rr() * .1})`; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let q = 1; q < pts.length; q++) g.lineTo(pts[q][0], pts[q][1]); g.closePath(); g.fillStyle = t; g.fill(); g.strokeStyle = 'rgba(12,12,20,.34)'; g.lineWidth = o.lead || 1.1; g.stroke(); };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = P[j][i], b = P[j][i + 1], c = P[j + 1][i + 1], d = P[j + 1][i]; if (rr() < .34) { pane([a, b, c]); pane([a, c, d]); } else pane([a, b, c, d]); }
  // 背光
  const bl = g.createRadialGradient(W * .55, H * .38, 10, W * .5, H * .45, Math.max(W, H) * .75); bl.addColorStop(0, 'rgba(255,250,230,.30)'); bl.addColorStop(.5, 'rgba(255,250,230,.05)'); bl.addColorStop(1, 'rgba(6,8,20,.44)');
  g.fillStyle = bl; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
  if (lines) g.drawImage(lines, 0, 0);
  return out;
}
// 半身像：先平塗，再把輪廓與五官畫在鉛條層
function paintBust(id, W, H) {
  const L = LOOKS[id] || LOOKS.vill_a, base = mkCanvas(W, H), b = base.getContext('2d'), line = mkCanvas(W, H), l = line.getContext('2d');
  const sx = W / 300, sy = H / 380; b.scale(sx, sy); l.scale(sx, sy); l.lineJoin = 'round'; l.lineCap = 'round'; l.strokeStyle = '#0c0c14';
  const both = (fn, fill, lw) => { b.beginPath(); fn(b); b.fillStyle = fill; b.fill(); l.save(); l.globalCompositeOperation = 'destination-out'; l.beginPath(); fn(l); l.fillStyle = '#000'; l.fill(); l.restore(); l.beginPath(); fn(l); l.lineWidth = lw || 5; l.stroke(); };
  const B = L.build || 1, col = (HERO[id] && HERO[id].col) || L.trim || '#8f8a94';
  // 背景玻璃
  b.fillStyle = shade(col, -.62); b.fillRect(0, 0, 300, 380);
  const rg = b.createRadialGradient(170, 130, 10, 150, 160, 240); rg.addColorStop(0, shade(col, -.05)); rg.addColorStop(.6, shade(col, -.5)); rg.addColorStop(1, shade(col, -.78)); b.fillStyle = rg; b.fillRect(0, 0, 300, 380);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI + Math.PI; b.fillStyle = rgba(i % 2 ? shade(col, .25) : shade(col, -.25), .5); b.beginPath(); b.moveTo(160, 150); b.lineTo(160 + Math.cos(a) * 420, 150 + Math.sin(a) * 420); b.lineTo(160 + Math.cos(a + .35) * 420, 150 + Math.sin(a + .35) * 420); b.closePath(); b.fill(); }
  // 圍巾／披
  if (L.scarf) both(g => { g.moveTo(96, 250); g.quadraticCurveTo(30, 262, 0, 330); g.lineTo(0, 380); g.lineTo(88, 380); g.quadraticCurveTo(70, 310, 130, 268); }, L.scarf);
  // 肩與外套
  const shw = 118 * B; both(g => { g.moveTo(150 - shw, 380); g.quadraticCurveTo(150 - shw * .96, 286, 150 - shw * .5, 262); g.quadraticCurveTo(150, 244, 150 + shw * .55, 262); g.quadraticCurveTo(150 + shw, 286, 150 + shw * 1.02, 380); }, L.coat, 6);
  b.fillStyle = L.coat2; b.beginPath(); b.moveTo(150 - shw, 380); b.quadraticCurveTo(150 - shw * .96, 286, 150 - shw * .5, 262); b.lineTo(138, 258); b.lineTo(120, 380); b.closePath(); b.fill();
  both(g => { g.moveTo(176, 256); g.lineTo(196, 380); g.lineTo(214, 380); g.lineTo(190, 254); }, L.trim, 3.4);
  if (id === 'wei') both(g => { g.moveTo(196, 258); g.quadraticCurveTo(262, 252, 286, 300); g.lineTo(276, 338); g.quadraticCurveTo(236, 300, 198, 300); g.closePath(); }, '#cfd8e8');
  if (id === 'luo') both(g => { g.moveTo(226, 380); g.lineTo(232, 250); g.lineTo(300, 240); g.lineTo(300, 380); }, '#7a5f42');
  if (id === 'yuan') { both(g => { g.moveTo(92, 268); g.lineTo(214, 372); g.lineTo(228, 360); g.lineTo(106, 258); }, L.trim, 3.4); }
  // 領
  both(g => { g.moveTo(112, 262); g.quadraticCurveTo(150, 300, 196, 258); g.lineTo(186, 232); g.lineTo(120, 236); g.closePath(); }, L.scarf || L.trim);
  // 頸
  both(g => { g.moveTo(132, 216); g.lineTo(130, 250); g.quadraticCurveTo(152, 266, 176, 248); g.lineTo(176, 214); }, shade(L.skin, -.22), 4);
  // 後髮
  if (L.hairStyle === 'pony') both(g => { g.moveTo(96, 96); g.quadraticCurveTo(30, 110, 34, 200); g.quadraticCurveTo(40, 262, 76, 286); g.quadraticCurveTo(70, 210, 112, 160); }, L.hair);
  if (L.hairStyle === 'tail') both(g => { g.moveTo(100, 120); g.quadraticCurveTo(56, 130, 60, 196); g.lineTo(84, 208); g.quadraticCurveTo(84, 160, 112, 150); }, L.hair);
  if (L.hairStyle === 'long' || L.hairStyle === 'veil') both(g => { g.moveTo(92, 110); g.quadraticCurveTo(62, 200, 78, 290); g.lineTo(132, 262); g.lineTo(116, 130); }, L.hairStyle === 'veil' ? L.coat : L.hair);
  if (L.hairStyle === 'hood') both(g => { g.moveTo(84, 250); g.quadraticCurveTo(58, 110, 126, 62); g.quadraticCurveTo(190, 36, 226, 96); g.quadraticCurveTo(244, 170, 214, 250); g.quadraticCurveTo(150, 290, 84, 250); }, L.coat2, 6);
  // 臉
  both(g => { g.moveTo(104, 130); g.quadraticCurveTo(100, 70, 156, 62); g.quadraticCurveTo(212, 64, 214, 132); g.quadraticCurveTo(214, 190, 180, 222); g.quadraticCurveTo(156, 238, 130, 220); g.quadraticCurveTo(104, 190, 104, 130); }, L.skin, 5);
  b.fillStyle = shade(L.skin, -.18); b.beginPath(); b.moveTo(104, 130); b.quadraticCurveTo(100, 70, 140, 64); b.lineTo(134, 222); b.quadraticCurveTo(104, 190, 104, 130); b.fill();
  // 髮
  const hairTop = g => { g.moveTo(98, 140); g.quadraticCurveTo(84, 52, 158, 46); g.quadraticCurveTo(224, 46, 220, 124); g.quadraticCurveTo(206, 92, 178, 104); g.quadraticCurveTo(160, 84, 138, 112); g.quadraticCurveTo(122, 140, 116, 178); g.closePath(); };
  if (L.hairStyle === 'bald') { /* 無 */ }
  else if (L.hairStyle === 'hood') both(g => { g.moveTo(98, 150); g.quadraticCurveTo(90, 70, 150, 58); g.quadraticCurveTo(212, 56, 220, 120); g.quadraticCurveTo(180, 84, 138, 104); g.quadraticCurveTo(116, 130, 112, 190); g.closePath(); }, L.coat2, 5);
  else if (L.hairStyle === 'veil') both(g => { g.moveTo(96, 160); g.quadraticCurveTo(86, 60, 156, 50); g.quadraticCurveTo(222, 50, 220, 118); g.quadraticCurveTo(180, 82, 136, 104); g.quadraticCurveTo(116, 130, 112, 200); g.closePath(); }, L.coat, 5);
  else if (L.hairStyle === 'wrap') both(g => { g.moveTo(98, 150); g.quadraticCurveTo(88, 54, 158, 48); g.quadraticCurveTo(222, 50, 220, 108); g.lineTo(112, 116); g.lineTo(110, 190); g.closePath(); }, '#22201e', 5);
  else if (L.hairStyle === 'hat') { both(hairTop, L.hair); both(g => { g.moveTo(60, 104); g.lineTo(262, 92); g.lineTo(250, 116); g.lineTo(72, 124); g.closePath(); }, '#22201e'); both(g => { g.moveTo(104, 104); g.lineTo(112, 34); g.lineTo(206, 30); g.lineTo(218, 96); g.closePath(); }, '#22201e'); both(g => { g.arc(232, 68, 13, 0, TAU); }, '#ffd070', 4); }
  else both(hairTop, L.hair);
  if (L.hairStyle === 'bun') both(g => { g.arc(104, 62, 26, 0, TAU); }, L.hair);
  if (L.hairStyle === 'messy') both(g => { g.moveTo(96, 96); g.lineTo(108, 30); g.lineTo(136, 66); g.lineTo(158, 22); g.lineTo(178, 62); g.lineTo(208, 38); g.lineTo(212, 96); g.closePath(); }, L.hair);
  // 五官（畫在鉛條層）
  if (L.mask) both(g => { g.moveTo(118, 150); g.lineTo(214, 144); g.quadraticCurveTo(212, 196, 180, 222); g.quadraticCurveTo(156, 238, 130, 220); g.closePath(); }, '#1c1a1e', 4);
  if (L.blindfold) both(g => { g.moveTo(98, 122); g.lineTo(218, 114); g.lineTo(218, 142); g.lineTo(100, 150); g.closePath(); }, '#e8e2d0', 4);
  else if (L.goggles && L.mask) both(g => { g.arc(182, 128, 20, 0, TAU); }, '#ffd070', 5);
  else { const soft = L.female || L.kid ? 2 : 0;
    l.lineWidth = 6; l.beginPath(); l.moveTo(164, 121 - soft); l.lineTo(204, 113 + soft); l.stroke(); l.lineWidth = 5; l.beginPath(); l.moveTo(120, 119 + soft); l.lineTo(146, 123 - soft); l.stroke();
    l.fillStyle = '#0c0c14'; l.beginPath(); l.moveTo(166, 134); l.quadraticCurveTo(183, 122, 200, 132); l.quadraticCurveTo(184, 143, 166, 134); l.fill(); l.beginPath(); l.moveTo(122, 136); l.quadraticCurveTo(134, 127, 146, 135); l.quadraticCurveTo(134, 144, 122, 136); l.fill();
    l.fillStyle = '#f4f8ff'; l.beginPath(); l.arc(187, 131, 2.6, 0, TAU); l.fill(); l.beginPath(); l.arc(137, 134, 2, 0, TAU); l.fill();
    if (!L.mask) { l.lineWidth = 3; l.beginPath(); l.moveTo(160, 144); l.lineTo(165, 168); l.lineTo(156, 172); l.stroke(); l.lineWidth = 3.6; l.beginPath(); l.moveTo(148, 197); l.lineTo(176, 195); l.stroke(); } }
  if (L.goggles && !L.mask) { both(g => { g.moveTo(98, 96); g.lineTo(220, 86); g.lineTo(222, 108); g.lineTo(100, 118); g.closePath(); }, '#c8a060', 4); both(g => { g.arc(184, 96, 15, 0, TAU); }, '#bfe8ff', 4); both(g => { g.arc(132, 102, 12, 0, TAU); }, '#bfe8ff', 4); }
  if (L.beard) both(g => { g.moveTo(118, 180); g.quadraticCurveTo(160, 168, 206, 176); g.quadraticCurveTo(206, 236, 162, 262); g.quadraticCurveTo(124, 244, 118, 180); }, L.hair, 5);
  if (L.old && !L.beard && !L.blindfold) { l.lineWidth = 2.4; l.beginPath(); l.moveTo(196, 150); l.lineTo(206, 154); l.moveTo(120, 156); l.lineTo(128, 160); l.stroke(); }
  // 金繼：一道斜裂
  l.strokeStyle = '#ffcf5a'; l.lineWidth = 2.6; const rr = mulberry32(hashStr(id)); l.beginPath(); let x = 300, y = 40 + rr() * 60; l.moveTo(x, y); for (let i = 0; i < 6; i++) { x -= 30 + rr() * 34; y += 26 + rr() * 40; l.lineTo(x, y); } l.stroke();
  return [base, line];
}
function portrait(id, kind) {
  const key = id + kind; if (_port[key]) return _port[key];
  if (kind === 'bust') { const [b, l] = paintBust(id, 300, 380); return (_port[key] = glassify(b, l, { cell: 30, seed: hashStr(id) })); }
  // chip：臉部特寫的小方塊
  const big = portrait(id, 'bust'), c = mkCanvas(96, 96), g = c.getContext('2d'); g.drawImage(big, 78, 40, 170, 170, 0, 0, 96, 96); return (_port[key] = c);
}
// 怪物的小頭像：把骨架畫進小方塊
function unitChip(look) {
  const key = 'uc' + look; if (_port[key]) return _port[key];
  const c = mkCanvas(96, 96), g = c.getContext('2d'); g.fillStyle = '#2a1a1e'; g.fillRect(0, 0, 96, 96); const gr = g.createRadialGradient(48, 40, 4, 48, 48, 70); gr.addColorStop(0, 'rgba(255,120,100,.5)'); gr.addColorStop(1, 'rgba(20,8,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, 96, 96);
  const F = { hound: [34, -44, 1.5], threejaw: [34, -44, 1.5], spitter: [28, -26, 1.7], crab: [8, -34, 1.15], citycrab: [-2, -58, .8], warden: [2, -96, 1.5], arbalest: [4, -82, 1.5], drone: [2, -28, 1.7], drone07: [2, -28, 1.7], unmoored: [1, -100, 1.4], elder: [1, -100, 1.4], moss: [2, -30, 1.1], spore: [3, -11, 2.2], keeper: [2, -116, 1.0], pylon: [0, -56, .8] }[look] || [2, -84, 1.5];
  g.save(); g.translate(48 + F[0] * F[2], 50 - F[1] * F[2]); g.scale(-F[2], F[2]); drawRig(g, look, { t: 1, a: 'idle' }); g.restore();
  return (_port[key] = c);
}
function chipFor(u) { return u.side === 'hero' ? portrait(u.hero, 'chip') : unitChip(FOE[u.type].look); }

// ---------- 大彩窗：片頭與殘窗 ----------
// 畫「墜庭之夜」：浮在淵上的城、垂下的錨鏈、鏈邊舉劍的人
function paintFallNight(W, H) {
  const base = mkCanvas(W, H), b = base.getContext('2d'), line = mkCanvas(W, H), l = line.getContext('2d'), s = W / 400; b.scale(s, s); l.scale(s, s); l.lineJoin = 'round'; l.strokeStyle = '#0c0c14';
  const both = (fn, fill, lw) => { b.beginPath(); fn(b); b.fillStyle = fill; b.fill(); l.save(); l.globalCompositeOperation = 'destination-out'; l.beginPath(); fn(l); l.fillStyle = '#000'; l.fill(); l.restore(); l.beginPath(); fn(l); l.lineWidth = lw || 4; l.stroke(); };
  const sky = b.createLinearGradient(0, 0, 0, 400); sky.addColorStop(0, '#f0d890'); sky.addColorStop(.22, '#d07848'); sky.addColorStop(.5, '#4a3a7a'); sky.addColorStop(1, '#0a1030'); b.fillStyle = sky; b.fillRect(0, 0, 400, 400);
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; b.fillStyle = `rgba(255,240,190,${i % 2 ? .18 : .05})`; b.beginPath(); b.moveTo(200, 70); b.lineTo(200 + Math.cos(a) * 500, 70 + Math.sin(a) * 500); b.lineTo(200 + Math.cos(a + .22) * 500, 70 + Math.sin(a + .22) * 500); b.fill(); }
  both(g => { g.arc(200, 70, 26, 0, TAU); }, '#fff6d8');
  // 城
  both(g => { g.moveTo(70, 190); g.lineTo(90, 150); g.lineTo(110, 150); g.lineTo(114, 110); g.lineTo(130, 96); g.lineTo(146, 110); g.lineTo(150, 140); g.lineTo(176, 140); g.lineTo(182, 84); g.lineTo(200, 60); g.lineTo(218, 84); g.lineTo(224, 140); g.lineTo(250, 140); g.lineTo(254, 116); g.lineTo(270, 104); g.lineTo(286, 116); g.lineTo(290, 150); g.lineTo(310, 150); g.lineTo(330, 190); g.closePath(); }, '#e8e2d0', 5);
  both(g => { g.moveTo(70, 190); g.lineTo(330, 190); g.lineTo(280, 236); g.lineTo(200, 256); g.lineTo(120, 236); g.closePath(); }, '#8a5a4a', 5);
  for (const [x, y] of [[126, 122], [196, 96], [266, 128], [160, 160], [236, 160]]) both(g => { g.rect(x, y, 10, 16); }, '#ffcf5a', 2.4);
  for (const x of [100, 150, 250, 300]) both(g => { g.moveTo(x - 8, 196); g.lineTo(x + 8, 196); g.lineTo(x, 216); g.closePath(); }, '#9fe3ff', 2.6);
  // 錨鏈（斷開）
  for (let i = 0; i < 4; i++) both(g => { g.ellipse(200, 268 + i * 17, i % 2 ? 5 : 9, 10, 0, 0, TAU); }, '#6a6672', 3);
  for (let i = 0; i < 3; i++) both(g => { g.ellipse(204 + i * 3, 352 + i * 17, i % 2 ? 5 : 9, 10, .2, 0, TAU); }, '#4a4650', 3);
  l.strokeStyle = '#ffcf5a'; l.lineWidth = 4; l.beginPath(); l.moveTo(172, 338); l.lineTo(232, 330); l.stroke(); l.strokeStyle = '#0c0c14';
  // 人
  both(g => { g.moveTo(240, 344); g.lineTo(246, 312); g.lineTo(262, 312); g.lineTo(270, 344); g.lineTo(280, 380); g.lineTo(232, 380); g.closePath(); }, '#2f3f6a');
  both(g => { g.arc(254, 302, 9, 0, TAU); }, '#e8c9a8', 3); both(g => { g.moveTo(246, 316); g.lineTo(214, 326); g.lineTo(212, 332); g.lineTo(248, 324); }, '#2f3f6a', 3); both(g => { g.moveTo(214, 328); g.lineTo(170, 340); g.lineTo(172, 344); g.lineTo(216, 332); }, '#eaf4ff', 2.4);
  both(g => { g.moveTo(262, 314); g.quadraticCurveTo(300, 322, 316, 360); g.lineTo(296, 358); g.quadraticCurveTo(286, 336, 262, 328); }, '#8fd0ff', 3);
  // 淵
  both(g => { g.moveTo(0, 330); g.lineTo(90, 350); g.lineTo(150, 400); g.lineTo(0, 400); g.closePath(); }, '#16203a'); both(g => { g.moveTo(400, 320); g.lineTo(320, 356); g.lineTo(300, 400); g.lineTo(400, 400); g.closePath(); }, '#16203a');
  return [base, line];
}
function fallWindow(size) { const key = 'fw' + size; if (_port[key]) return _port[key]; const [b, l] = paintFallNight(size, size); return (_port[key] = glassify(b, l, { cell: size / 15, seed: 31, lead: size / 220 })); }
// 畫成圓花窗：lit＝亮起的瓣（1～12），沒亮的是暗的；broken＝片頭用，缺幾塊
function drawRose(g, cxp, cyp, R, lit, t, o) {
  o = o || {}; const im = fallWindow(512);
  g.save(); g.beginPath(); g.arc(cxp, cyp, R, 0, TAU); g.clip(); g.fillStyle = '#07080e'; g.fillRect(cxp - R, cyp - R, R * 2, R * 2);
  for (let i = 0; i < 12; i++) { const on = lit === 'all' || (lit && lit.includes(i + 1)); if (!on) continue; const a0 = i / 12 * TAU - Math.PI / 2, a1 = a0 + TAU / 12; g.save(); g.beginPath(); g.moveTo(cxp, cyp); g.arc(cxp, cyp, R, a0, a1); g.closePath(); g.clip(); g.globalAlpha = o.alpha == null ? 1 : o.alpha; g.drawImage(im, cxp - R, cyp - R, R * 2, R * 2); g.restore(); }
  g.restore();
  g.strokeStyle = '#1a1b26'; g.lineWidth = R * .035; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU - Math.PI / 2; g.beginPath(); g.moveTo(cxp + Math.cos(a) * R * .16, cyp + Math.sin(a) * R * .16); g.lineTo(cxp + Math.cos(a) * R, cyp + Math.sin(a) * R); g.stroke(); }
  g.beginPath(); g.arc(cxp, cyp, R * .16, 0, TAU); g.stroke(); g.beginPath(); g.arc(cxp, cyp, R * .6, 0, TAU); g.lineWidth = R * .02; g.stroke();
  g.lineWidth = R * .07; g.strokeStyle = '#2a2c3a'; g.beginPath(); g.arc(cxp, cyp, R, 0, TAU); g.stroke(); g.lineWidth = R * .012; g.strokeStyle = '#5a5e74'; g.beginPath(); g.arc(cxp, cyp, R * 1.03, 0, TAU); g.stroke();
  void t;
}
