/* ───────────── 介面：戰鬥 HUD、卡片縮圖、指揮官頭像、觸控 ───────────── */
const UI = {};

/* ── 指揮官頭像（側臉，跟小兵同一個畫風） ── */
const PORTRAIT = {
  wei: { skin: '#f3c39d', cloth: '#5f7a33', hat: 'cap', hatC: '#5b7431', band: '#2f3a1a', badge: '#ffd36a', hair: '#2a221e', brow: 'firm', name: '魏子葳', role: '第七前哨 指揮官' },
  amo: { skin: '#e9b48e', cloth: '#6f8b3b', hat: 'headset', hatC: '#5f7a33', hair: '#2a221e', brow: 'soft', name: '阿默', role: '通訊兵' },
  boiler: { skin: '#d9a07a', cloth: '#4f6a2a', hat: 'bald', hair: '#3a2f28', brow: 'heavy', beard: true, cigar: true, name: '葛魯「鍋爐」', role: '重機槍手' },
  sparrow: { skin: '#f4cdb0', cloth: '#5c6e3c', hat: 'hood', hatC: '#5d6b3c', hair: '#1f1a18', brow: 'soft', paint: true, name: '蘇雀「小雀」', role: '狙擊手' },
  kaz: { skin: '#e8b88f', cloth: '#b5532c', hat: 'beanie', hatC: '#3b3330', hair: '#d0571f', brow: 'sly', grin: true, scar: true, name: '卡茲「火鼬」', role: '焦土幫 頭目' },
  holder: { skin: '#e2ae8a', cloth: '#8f3b33', hat: 'ushanka', hatC: '#6a5546', hair: '#cfcac4', brow: 'heavy', mustache: true, wrinkle: true, name: '霍爾德「鐵砧」', role: '鐵砧兵團 上校' },
  ilya: { skin: '#f6d2bb', cloth: '#b23f4c', hat: 'pilotUp', hatC: '#e9edf2', hair: '#e6e8ee', brow: 'sharp', lash: true, name: '伊莉亞「白隼」', role: '白隼航空隊 隊長' },
  severin: { skin: '#e9c3a6', cloth: '#3d3a3c', hat: 'peak', hatC: '#2b292b', band: '#9b1f2c', badge: '#c9c9c9', hair: '#9a9a9a', brow: 'calm', glasses: true, mask: true, wrinkle: true, name: '塞弗林「老師」', role: '白棋學院 院長' },
};
const PORT_CACHE = {};
function portraitCanvas(id, size, flip) {
  const key = id + '_' + size + (flip ? 'f' : '');
  if (PORT_CACHE[key]) return PORT_CACHE[key];
  const c = mkCanvas(size * 2, size * 2), g = c.getContext('2d');
  g.scale(size * 2 / 128, size * 2 / 128);
  if (flip) { g.translate(128, 0); g.scale(-1, 1); }
  drawPortrait(g, PORTRAIT[id] || PORTRAIT.amo);
  PORT_CACHE[key] = c; return c;
}
function drawPortrait(g, P) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  const O = '#1a1720', ow = 2.6;
  const fo2 = (fill) => { g.fillStyle = fill; g.fill(); g.lineWidth = ow; g.strokeStyle = O; g.stroke(); };
  // 肩膀與衣領
  g.beginPath(); g.moveTo(14, 132); g.quadraticCurveTo(18, 98, 52, 92); g.lineTo(84, 92); g.quadraticCurveTo(116, 98, 120, 132); g.closePath();
  fo2(lg(g, 0, 92, 0, 130, [0, shade(P.cloth, 0.15), 1, shade(P.cloth, -0.3)]));
  g.beginPath(); g.moveTo(50, 93); g.lineTo(64, 112); g.lineTo(78, 93); g.closePath(); fo2(shade(P.cloth, -0.18));
  if (P.mask) { g.beginPath(); g.ellipse(76, 104, 15, 11, 0.2, 0, TAU); fo2('#4a4944'); g.beginPath(); g.arc(80, 104, 5, 0, TAU); fo2('#2a292c'); }
  // 脖子
  rr(g, 52, 78, 22, 20, 8); fo2(shade(P.skin, -0.08));
  // 臉（聯集外框）
  const face = () => { g.beginPath(); g.ellipse(62, 58, 31, 30, 0, 0, TAU); g.moveTo(98, 72); g.ellipse(80, 72, 16, 13, 0, 0, TAU); g.moveTo(101, 62); g.arc(95, 62, 6.4, 0, TAU); };
  face(); g.lineWidth = ow * 2; g.strokeStyle = O; g.stroke();
  face(); g.fillStyle = lg(g, 40, 30, 96, 90, [0, shade(P.skin, 0.1), 0.6, P.skin, 1, shade(P.skin, -0.14)]); g.fill();
  // 後腦頭髮
  if (P.hat !== 'bald' && P.hat !== 'hood') { g.beginPath(); g.moveTo(34, 50); g.quadraticCurveTo(30, 74, 46, 84); g.quadraticCurveTo(44, 64, 50, 52); g.closePath(); fo2(P.hair); }
  // 耳朵
  g.beginPath(); g.ellipse(51, 64, 7, 9, 0.15, 0, TAU); fo2(shade(P.skin, -0.06));
  g.strokeStyle = shade(P.skin, -0.3); g.lineWidth = 1.6; g.beginPath(); g.arc(51, 64, 3.6, -1.2, 1.6); g.stroke();
  // 皺紋、疤
  if (P.wrinkle) { g.strokeStyle = rgba(shade(P.skin, -0.35), 0.7); g.lineWidth = 1.4; g.beginPath(); g.moveTo(74, 52); g.quadraticCurveTo(80, 50, 86, 52); g.moveTo(84, 78); g.quadraticCurveTo(80, 82, 74, 82); g.stroke(); }
  if (P.scar) { g.strokeStyle = '#b5615a'; g.lineWidth = 2; g.beginPath(); g.moveTo(70, 66); g.lineTo(82, 80); g.stroke(); g.lineWidth = 1.2; for (const t of [0.3, 0.6]) { const x = 70 + 12 * t, y = 66 + 14 * t; g.beginPath(); g.moveTo(x - 3, y + 2); g.lineTo(x + 3, y - 2); g.stroke(); } }
  if (P.paint) { g.fillStyle = 'rgba(60,80,40,.55)'; g.beginPath(); g.moveTo(66, 70); g.lineTo(92, 66); g.lineTo(92, 72); g.lineTo(66, 76); g.closePath(); g.fill(); }
  // 臉頰
  g.fillStyle = 'rgba(255,110,100,.2)'; g.beginPath(); g.ellipse(76, 74, 8, 5, 0, 0, TAU); g.fill();
  // 眼睛
  const ex = 80, ey = 58;
  if (P.glasses) {
    g.beginPath(); g.arc(ex, ey, 8.5, 0, TAU); g.fillStyle = 'rgba(190,230,255,.35)'; g.fill(); g.lineWidth = 2.2; g.strokeStyle = '#2a2a2e'; g.stroke();
    g.beginPath(); g.moveTo(71.5, ey - 1); g.lineTo(54, ey - 3); g.stroke();
  }
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, ey, 4.6, 6, 0, 0, TAU); g.fill();
  g.fillStyle = '#2a2026'; g.beginPath(); g.ellipse(ex + 1.4, ey + 0.4, 3, 4.6, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + 2.4, ey - 2, 1.4, 0, TAU); g.fill();
  if (P.lash) { g.strokeStyle = O; g.lineWidth = 2.2; g.beginPath(); g.moveTo(ex - 5, ey - 5); g.quadraticCurveTo(ex, ey - 8, ex + 6, ey - 5); g.lineTo(ex + 9, ey - 7); g.stroke(); }
  if (P.glasses) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(ex - 4, ey - 4); g.lineTo(ex - 1, ey - 6); g.stroke(); }
  // 眉毛
  g.strokeStyle = shade(P.hair, -0.2); g.lineWidth = P.brow === 'heavy' ? 4.4 : 3.2; g.beginPath();
  const bw = { firm: [73, 47, 88, 49], soft: [73, 48, 87, 47], heavy: [72, 46, 89, 50], sly: [72, 46, 88, 51], sharp: [72, 50, 89, 45], calm: [73, 48, 88, 48] }[P.brow];
  g.moveTo(bw[0], bw[1]); g.lineTo(bw[2], bw[3]); g.stroke();
  // 嘴、鬍子
  if (P.grin) { g.beginPath(); g.moveTo(80, 80); g.quadraticCurveTo(88, 86, 96, 78); g.lineTo(93, 77); g.quadraticCurveTo(87, 81, 81, 78); g.closePath(); fo2('#fff'); }
  else { g.strokeStyle = O; g.lineWidth = 2; g.beginPath(); g.moveTo(82, 81); g.quadraticCurveTo(88, 82, 93, 79); g.stroke(); }
  if (P.mustache) { g.beginPath(); g.moveTo(78, 76); g.quadraticCurveTo(90, 70, 101, 76); g.quadraticCurveTo(103, 82, 97, 80); g.quadraticCurveTo(90, 76, 82, 80); g.closePath(); fo2(P.hair); }
  if (P.beard) { g.fillStyle = 'rgba(60,45,35,.35)'; g.beginPath(); g.ellipse(80, 80, 16, 10, 0, 0, TAU); g.fill(); }
  if (P.cigar) { rr(g, 92, 79, 16, 4.4, 2); fo2('#7a4a26'); g.fillStyle = '#ff8a2a'; g.fillRect(106, 79.6, 2.6, 3.4); g.fillStyle = 'rgba(220,220,220,.5)'; g.beginPath(); g.arc(112, 72, 4, 0, TAU); g.arc(116, 64, 5, 0, TAU); g.fill(); }
  // 帽子／頭飾
  const hc = P.hatC;
  if (P.hat === 'cap' || P.hat === 'peak') {
    g.beginPath(); g.moveTo(30, 44); g.quadraticCurveTo(34, 16, 66, 16); g.quadraticCurveTo(96, 16, 98, 38); g.lineTo(96, 44); g.closePath(); fo2(lg(g, 0, 16, 0, 44, [0, shade(hc, 0.2), 1, shade(hc, -0.2)]));
    rr(g, 32, 36, 64, 10, 4); fo2(P.band);
    g.beginPath(); g.moveTo(86, 44); g.quadraticCurveTo(104, 42, 112, 50); g.lineTo(94, 50); g.closePath(); fo2('#1f1c1a');
    g.beginPath(); g.arc(78, 33, 6, 0, TAU); fo2(P.badge);
    if (P.hat === 'peak') { g.fillStyle = '#9b1f2c'; g.beginPath(); g.moveTo(75, 33); g.lineTo(78, 28); g.lineTo(81, 33); g.lineTo(78, 37); g.closePath(); g.fill(); }
    else { g.fillStyle = '#2f3a1a'; g.font = '900 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('7', 78, 33.5); }
  } else if (P.hat === 'headset') {
    g.beginPath(); g.moveTo(28, 52); g.bezierCurveTo(26, 22, 50, 14, 64, 14); g.bezierCurveTo(90, 14, 98, 30, 97, 46); g.lineTo(28, 54); g.closePath(); fo2(lg(g, 0, 14, 0, 54, [0, shade(hc, 0.22), 1, shade(hc, -0.25)]));
    g.beginPath(); g.ellipse(51, 62, 9, 11, 0, 0, TAU); fo2('#2c2e35'); g.strokeStyle = O; g.lineWidth = 3; g.beginPath(); g.moveTo(54, 70); g.quadraticCurveTo(70, 84, 88, 82); g.stroke(); g.beginPath(); g.arc(90, 82, 3.4, 0, TAU); fo2('#2c2e35');
    g.strokeStyle = '#3a3c43'; g.lineWidth = 2; g.beginPath(); g.moveTo(44, 54); g.lineTo(30, 6); g.stroke(); g.fillStyle = '#ff5a3c'; g.beginPath(); g.arc(30, 6, 2.6, 0, TAU); g.fill();
  } else if (P.hat === 'bald') {
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 3; g.beginPath(); g.arc(62, 54, 24, -2.4, -1.4); g.stroke();
    g.beginPath(); g.ellipse(51, 62, 9, 11, 0, 0, TAU); fo2('#2c2e35'); g.strokeStyle = O; g.lineWidth = 3.4; g.beginPath(); g.arc(62, 54, 31, -2.9, -0.4); g.stroke(); g.strokeStyle = '#3a3c43'; g.lineWidth = 1.6; g.stroke();
  } else if (P.hat === 'hood') {
    g.beginPath(); g.moveTo(24, 96); g.bezierCurveTo(14, 40, 34, 14, 66, 14); g.bezierCurveTo(98, 14, 106, 36, 102, 52); g.lineTo(90, 44); g.quadraticCurveTo(64, 30, 44, 54); g.quadraticCurveTo(38, 80, 48, 96); g.closePath();
    fo2(lg(g, 0, 14, 0, 96, [0, shade(hc, 0.15), 1, shade(hc, -0.3)]));
    g.strokeStyle = 'rgba(30,40,20,.6)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { const x = 30 + (i * 37) % 64, y = 22 + (i * 23) % 60; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y + 4); g.stroke(); }
  } else if (P.hat === 'beanie') {
    g.beginPath(); g.moveTo(30, 48); g.bezierCurveTo(28, 18, 52, 12, 66, 12); g.bezierCurveTo(92, 12, 98, 30, 96, 44); g.closePath(); fo2(lg(g, 0, 12, 0, 48, [0, shade(hc, 0.15), 1, shade(hc, -0.2)]));
    rr(g, 28, 38, 70, 12, 5); fo2(shade(hc, -0.05));
    g.strokeStyle = '#1e1a18'; g.lineWidth = 4; g.beginPath(); g.moveTo(32, 34); g.quadraticCurveTo(60, 24, 82, 28); g.stroke();
    g.beginPath(); g.arc(84, 30, 9, 0, TAU); fo2('#2a2420'); g.beginPath(); g.arc(84, 30, 6, 0, TAU); g.fillStyle = lg(g, 0, 24, 0, 36, [0, '#ffd28a', 1, '#c26a1c']); g.fill(); g.fillStyle = '#fff'; g.fillRect(81, 26, 3, 2.4);
    g.fillStyle = P.hair; g.beginPath(); g.moveTo(40, 14); g.lineTo(46, 2); g.lineTo(52, 12); g.lineTo(58, 0); g.lineTo(64, 12); g.closePath(); g.fill(); g.lineWidth = 2; g.strokeStyle = O; g.stroke();
  } else if (P.hat === 'ushanka') {
    g.beginPath(); g.moveTo(26, 56);
    for (let i = 0; i <= 16; i++) { const a = Math.PI + (i / 16) * Math.PI, r = 37 + (i % 2 ? 2.6 : 0); g.lineTo(63 + Math.cos(a) * r, 46 + Math.sin(a) * r * 0.85); }
    g.lineTo(100, 46); g.lineTo(26, 56); g.closePath(); fo2(lg(g, 0, 10, 0, 56, [0, shade(hc, 0.2), 1, shade(hc, -0.25)]));
    rr(g, 26, 34, 76, 14, 7); fo2('#8a7462');
    g.beginPath(); g.moveTo(36, 50); g.quadraticCurveTo(30, 80, 42, 92); g.quadraticCurveTo(54, 88, 54, 70); g.lineTo(52, 50); g.closePath(); fo2('#6a5546');
    g.beginPath(); g.arc(76, 40, 6, 0, TAU); fo2('#ff6b4a');
  } else if (P.hat === 'pilotUp') {
    g.beginPath(); g.moveTo(28, 64); g.bezierCurveTo(22, 20, 48, 10, 66, 10); g.bezierCurveTo(96, 10, 104, 30, 100, 44); g.lineTo(90, 40); g.quadraticCurveTo(66, 30, 50, 46); g.lineTo(46, 66); g.closePath();
    fo2(lg(g, 0, 10, 0, 66, [0, '#ffffff', 1, '#aeb6c2']));
    g.fillStyle = '#ff4f6d'; g.beginPath(); g.moveTo(40, 18); g.quadraticCurveTo(64, 6, 90, 16); g.lineTo(88, 22); g.quadraticCurveTo(64, 12, 42, 24); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(52, 14); g.quadraticCurveTo(84, 10, 100, 30); g.lineTo(96, 36); g.quadraticCurveTo(80, 20, 54, 22); g.closePath(); fo2(lg(g, 52, 12, 100, 36, [0, '#3a3f5a', 1, '#6a4a6a']));
    g.fillStyle = P.hair; g.beginPath(); g.moveTo(84, 44); g.quadraticCurveTo(96, 46, 98, 60); g.quadraticCurveTo(90, 52, 82, 50); g.closePath(); g.fill(); g.lineWidth = 1.6; g.strokeStyle = O; g.stroke();
  }
}

/* ── 卡片縮圖：直接把單位畫進去 ── */
const THUMB = {};
function cardThumb(key) {
  if (THUMB[key]) return THUMB[key];
  const W = 128, H = 116;
  const c = mkCanvas(W, H), g = c.getContext('2d');
  const isAb = !!ABIL[key], hero = HERO[key];
  const bgc = isAb ? ['#4a3d1c', '#1d180c'] : hero ? ['#5a4a1c', '#21190a'] : ['#33414f', '#161d25'];
  g.fillStyle = lg(g, 0, 0, 0, H, [0, bgc[0], 1, bgc[1]]); g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.ellipse(64, 98, 56, 9, 0, 0, TAU); g.fill();
  g.lineJoin = 'round'; g.lineCap = 'round';
  const savedT = G.t; G.t = 1.3;
  if (isAb) abilityIcon(g, key, W, H);
  else {
    const def = hero || UDEF[key];
    const kind = hero ? (hero.kind === 'inf' ? 'inf' : hero.kind) : def.cls === 'inf' ? 'inf' : key;
    if (kind === 'inf') {
      const u = { x: 0, y: 0, face: 1 };
      newSoldierAnim(u, hero ? hero.pal : 'us', def.wk || 'ar');
      const st = def.prone ? 'prone' : (key === 'at' || key === 'mortar') ? 'kneel' : 'stand';
      setStance(u, st); u.stb = 1; u.st0 = st;
      u.wantAim = true; u.aimTA = u.aimA = -0.05; u.aimB = 1; u.blinkT = 3;
      soldierRig(u);
      g.save(); const s = (hero ? hero.scale : 1) * (def.prone ? 2.0 : 1.75); g.translate(def.prone ? 70 : 54, 98); g.scale(s, s);
      drawSoldier(g, u);
      if (key === 'mortar') { u.mortar = { a: 1, rec: 0 }; drawMortarTube(g, u); }
      g.restore();
    } else {
      const u = { x: 0, y: 0, face: 1 };
      newVehAnim(u, kind === 'heli' ? 'heli' : kind, hero ? hero.pal : 'us');
      if (kind === 'truck' || key === 'mlrs') { u.vk = 'truck'; u.pod = 0.6; u.jacks = 1; }
      if (key === 'apc') u.ramp = 0;
      u.aimA = kind === 'aa' ? 0.7 : 0.05;
      g.save(); const s = kind === 'heli' ? 0.95 : 1.12; g.translate(kind === 'heli' ? 68 : 64, kind === 'heli' ? 64 : 100); g.scale(s, s);
      drawVehicle(g, u); g.restore();
    }
  }
  G.t = savedT;
  THUMB[key] = c; return c;
}
function abilityIcon(g, key, W, H) {
  g.save(); g.translate(W / 2, H / 2 - 4);
  if (key === 'airstrike') {
    g.save(); g.rotate(-0.25); dspr(g, getV('jet', 'us'), 0, -8, 0, 0.8); g.restore();
    for (let i = 0; i < 3; i++) dspr(g, getV('bomb', 'us'), -16 + i * 16, 18 + i * 6, 1.2, 1.4);
    g.globalCompositeOperation = 'lighter'; dspr(g, FXS.gO, 30, 36, 0, 0.9); g.globalCompositeOperation = 'source-over';
  } else if (key === 'barrage') {
    for (let i = 0; i < 4; i++) { g.save(); g.translate(-30 + i * 20, -20 + (i % 2) * 14); g.rotate(1.2); rr(g, -9, -3.4, 18, 6.8, 3); fo(g, '#4a4e44'); g.restore(); }
    g.globalCompositeOperation = 'lighter'; dspr(g, FXS.ball, 6, 30, 0, 0.7); dspr(g, FXS.gY, 6, 30, 0, 0.8); g.globalCompositeOperation = 'source-over';
  } else if (key === 'smoke') {
    for (let i = 0; i < 6; i++) dspr(g, FXS.smokeL, rnd(-28, 28), rnd(-14, 24), 0, rnd(0.8, 1.2));
    rr(g, -6, 20, 12, 18, 3); fo(g, '#5a6a3a');
  } else if (key === 'medic') {
    g.strokeStyle = OUT; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 6); g.lineTo(-24, -26); g.moveTo(0, 6); g.lineTo(24, -26); g.stroke();
    g.beginPath(); g.moveTo(-30, -24); g.quadraticCurveTo(0, -58, 30, -24); g.quadraticCurveTo(0, -32, -30, -24); fo(g, '#ecece4');
    rr(g, -16, 4, 32, 24, 3); fo(g, '#8a7a50');
    g.fillStyle = '#e03a3a'; g.fillRect(-4, 9, 8, 14); g.fillRect(-7, 12, 14, 8);
  } else if (key === 'para') {
    g.beginPath(); g.moveTo(-34, -14); g.quadraticCurveTo(0, -56, 34, -14); g.quadraticCurveTo(0, -24, -34, -14); fo(g, '#c9d6a8');
    g.strokeStyle = OUT; g.lineWidth = 1; g.beginPath(); for (const x of [-30, -10, 10, 30]) { g.moveTo(x, -16); g.lineTo(0, 22); } g.stroke();
    const u = { x: 0, y: 0, face: 1 }; newSoldierAnim(u, 'us', 'ar'); soldierRig(u); g.save(); g.translate(0, 52); g.scale(1.1, 1.1); drawSoldier(g, u); g.restore();
  }
  g.restore();
}

/* ── 補給圓環 ── */
function drawSupplyRing(c, v, max) {
  const g = c.getContext('2d'), S = c.width;
  g.clearRect(0, 0, S, S);
  const r = S * 0.42, cx = S / 2, cy = S / 2;
  g.fillStyle = 'rgba(8,12,16,.8)'; g.beginPath(); g.arc(cx, cy, r + S * 0.06, 0, TAU); g.fill();
  const n = max, gap = 0.06;
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + (i / n) * TAU + gap, a1 = -Math.PI / 2 + ((i + 1) / n) * TAU - gap;
    const f = clamp(v - i, 0, 1);
    g.lineWidth = S * 0.09; g.strokeStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
    if (f > 0) { g.strokeStyle = f >= 1 ? '#9dff5c' : 'rgba(157,255,92,.45)'; g.beginPath(); g.arc(cx, cy, r, a0, a0 + (a1 - a0) * f); g.stroke(); }
  }
}

/* ── 建立戰鬥 HUD ── */
function buildHUD() {
  const h = $('#hud');
  h.innerHTML = `
  <div class="top">
    <div class="cmd us"><div class="ava"><canvas width="84" height="84"></canvas></div><div class="bub" id="bubUs"><b></b><span></span></div></div>
    <div class="mid"><div class="timer num" id="timer">4:00</div>
      <div class="terr"><div class="hqb" id="hqUs"><i></i></div><div class="flags" id="flagGrid">${'<i></i>'.repeat(9)}</div><div class="hqb en" id="hqEn"><i></i></div></div></div>
    <div class="cmd en"><div class="ava"><canvas width="84" height="84"></canvas></div><div class="bub" id="bubEn"><b></b><span></span></div></div>
  </div>
  <div class="side">
    <button class="ib" data-a="pause"><svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg></button>
    <button class="ib" data-a="speed"><span class="num">1×</span></button>
    <button class="ib on" data-a="follow"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></button>
  </div>
  <div class="bot"><div class="sup"><canvas width="132" height="132"></canvas><div class="n num" id="supN">5</div><div class="l">補給</div></div><div class="cards" id="cards"></div></div>
  <div id="banner"><span class="t"></span></div>
  <div id="hint"></div>`;
  const avs = $$('.ava canvas', h);
  avs[0].getContext('2d').drawImage(portraitCanvas('amo', 42), 0, 0, 84, 84);
  const rp = { kaz: 'kaz', holder: 'holder', ilya: 'ilya', severin: 'severin' }[B.cfg.rival] || 'kaz';
  avs[1].getContext('2d').drawImage(portraitCanvas(rp, 42, true), 0, 0, 84, 84);
  $('#bubEn b').textContent = B.rival.name + '「' + B.rival.title + '」';
  // 卡片
  const wrap = $('#cards');
  UI.cardEls = [];
  B.deck.forEach((k, i) => {
    const isAb = !!ABIL[k], hero = HERO[k];
    const d = isAb ? ABIL[k] : hero || UDEF[k];
    const el2 = el('div', 'card' + (isAb ? ' ab' : '') + (hero ? ' hero' : ''));
    const cvs = cardThumb(k), cc = mkCanvas(128, 116);
    cc.getContext('2d').drawImage(cvs, 0, 0);
    el2.appendChild(cc);
    el2.insertAdjacentHTML('beforeend', `<div class="nm">${hero ? hero.short : d.name}</div><div class="c num">${cardCost(0, k)}</div><div class="fill"></div><div class="cd hide"></div>`);
    el2.addEventListener('pointerdown', (e) => { e.stopPropagation(); audioInit(); cardTap(k, el2); });
    wrap.appendChild(el2);
    UI.cardEls.push({ k, el: el2, fill: $('.fill', el2), cd: $('.cd', el2), c: $('.c', el2), hero });
  });
  $$('.ib', h).forEach((b) => b.addEventListener('pointerdown', (e) => { e.stopPropagation(); audioInit(); hudButton(b.dataset.a, b); }));
  UI.supC = $('.sup canvas', h); UI.supN = $('#supN'); UI.timer = $('#timer'); UI.flagEls = $$('#flagGrid i');
  UI.hqUs = $('#hqUs i'); UI.hqEn = $('#hqEn i'); UI.bubUs = $('#bubUs'); UI.bubEn = $('#bubEn'); UI.banner = $('#banner'); UI.hint = $('#hint');
  UI.bubT = [0, 0]; UI.last = {};
}
function hudButton(a, b) {
  sfx('click');
  if (a === 'pause') { G.paused = !G.paused; b.classList.toggle('on', G.paused); if (G.paused) showPause(); }
  else if (a === 'speed') { G.speed = G.speed === 2 ? 1 : 2; $('span', b).textContent = G.speed + '×'; b.classList.toggle('on', G.speed === 2); }
  else if (a === 'follow') { CAM.follow = !CAM.follow; CAM.userT = 0; b.classList.toggle('on', CAM.follow); }
}
function cardTap(k, elx) {
  if (!B || B.over) return;
  const hero = HERO[k];
  if (hero && B.heroUsed[k]) { // 已經上場：變成大招按鈕
    const u = B.units.find((x) => x.side === 0 && x.hero === k && x.alive);
    if (u && heroSkill(u)) { sfx('click'); return; }
    sfx('deny'); return;
  }
  const d = ABIL[k] || hero || UDEF[k];
  if (B.sel === k) { selectCard(null); return; }
  const cost = cardCost(0, k);
  if ((ABIL[k] && B.cdAbil[k] > 0) || !canAfford(0, cost)) {
    sfx('deny'); elx.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 180 });
    if (!canAfford(0, cost)) showHint(`補給不足（還差 ${Math.ceil(cost - B.supply[0])}）`, 1.2);
    return;
  }
  selectCard(k);
}
function selectCard(k) {
  B.sel = k; B.aim = null;
  G.slowTarget = k ? 0.3 : 1;
  for (const c of UI.cardEls) c.el.classList.toggle('sel', c.k === k);
  if (k && !ABIL[k]) { // 部署範圍不在畫面上就把鏡頭移過去
    const front = Math.max(deployZone(0, 0)[1], deployZone(0, 1)[1], deployZone(0, 2)[1]);
    const vw = VIEW.w / CAM.z, left = CAM.x - vw / 2, right = CAM.x + vw / 2;
    if (front < left + 60 || front > right - 30) { CAM.x = front + vw * 0.12; clampCam(); CAM.userT = 3.5; }
  }
  if (k) { sfx('tick'); showHint(ABIL[k] ? '點戰場任何位置發動' : '點綠色範圍內部署（越前面越快接戰）', 99); }
  else showHint('', 0);
}
function showHint(t, s) { if (!UI.hint) return; UI.hint.textContent = t; UI.hint.classList.toggle('on', !!t); UI.hintT = s; }

/* 每格更新 HUD */
function updateHUD(rdt) {
  if (!B || !UI.cardEls) return;
  const sup = B.supply[0];
  const k = Math.floor(sup * 10);
  if (UI.last.sup !== k) { UI.last.sup = k; drawSupplyRing(UI.supC, sup, B.supMax[0]); UI.supN.textContent = Math.floor(sup); }
  for (const c of UI.cardEls) {
    const isAb = !!ABIL[c.k], hero = c.hero;
    const d = isAb ? ABIL[c.k] : hero || UDEF[c.k];
    let cd = isAb ? B.cdAbil[c.k] || 0 : 0;
    const cost = cardCost(0, c.k);
    let no = !canAfford(0, cost) || cd > 0;
    if (hero && B.heroUsed[c.k]) {
      const u = B.units.find((x) => x.side === 0 && x.hero === c.k && x.alive);
      c.el.classList.toggle('used', !u);
      if (u) { cd = u.skillCd > 0 ? u.skillCd : 0; no = cd > 0; c.el.classList.toggle('ready', cd <= 0); if (c.c.textContent !== '技') { c.c.textContent = '技'; } }
      else c.el.classList.remove('ready');
    }
    c.el.classList.toggle('no', no);
    c.fill.style.height = (hero && B.heroUsed[c.k]) ? '0%' : Math.round(clamp(sup / cost, 0, 1) * 100) + '%';
    const cdt = cd > 0 ? Math.ceil(cd) : 0;
    if (c.lcd !== cdt) { c.lcd = cdt; c.cd.classList.toggle('hide', !cdt); c.cd.textContent = cdt || ''; }
  }
  // 時間
  const t = Math.max(0, Math.ceil(B.time));
  if (UI.last.t !== t) { UI.last.t = t; UI.timer.textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); UI.timer.classList.toggle('low', t <= 30); }
  // 旗點
  B.flags.forEach((f, i) => { const e = UI.flagEls[f.lane * 3 + f.i]; const cls = f.owner === 0 ? 'u' : f.owner === 1 ? 'e' : ''; if (e.className !== cls) e.className = cls; });
  UI.hqUs.style.width = (B.hq[0].hp / B.hq[0].max * 100).toFixed(1) + '%';
  UI.hqEn.style.width = (B.hq[1].hp / B.hq[1].max * 100).toFixed(1) + '%';
  // 訊息
  while (B.msgQ.length) {
    const m = B.msgQ.shift();
    if (m.k === 'radio') { $('b', UI.bubUs).textContent = m.who; $('span', UI.bubUs).textContent = m.txt; UI.bubUs.classList.add('on'); UI.bubT[0] = 3.2; }
    else if (m.k === 'rival') { $('span', UI.bubEn).textContent = m.txt; UI.bubEn.classList.add('on'); UI.bubT[1] = 3.6; }
    else if (m.k === 'banner') { const t2 = $('.t', UI.banner); t2.textContent = m.txt; t2.style.color = m.col || '#fff'; UI.banner.classList.remove('go'); void UI.banner.offsetWidth; UI.banner.classList.add('go'); }
  }
  for (let i = 0; i < 2; i++) if (UI.bubT[i] > 0) { UI.bubT[i] -= rdt; if (UI.bubT[i] <= 0) (i ? UI.bubEn : UI.bubUs).classList.remove('on'); }
  if (UI.hintT > 0 && UI.hintT < 50) { UI.hintT -= rdt; if (UI.hintT <= 0) showHint('', 0); }
}

/* ── 觸控：拖曳平移、雙指縮放、點一下部署 ── */
const PTR = new Map();
let gest = null;
function initInput() {
  cv.addEventListener('pointerdown', onDown, { passive: false });
  addEventListener('pointermove', onMove, { passive: false });
  addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
  cv.addEventListener('wheel', (e) => { e.preventDefault(); if (G.scene !== 'battle') { if (SCENES[G.scene] && SCENES[G.scene].wheel) SCENES[G.scene].wheel(e); return; } const [lx, ly] = toLocal(e.clientX, e.clientY); zoomAt(lx, ly, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  addEventListener('keydown', (e) => {
    if (G.scene !== 'battle' || !B) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 8 && UI.cardEls[n - 1]) cardTap(UI.cardEls[n - 1].k, UI.cardEls[n - 1].el);
    if (e.key === ' ') hudButton('pause', $('.ib[data-a=pause]'));
    if (e.key === 'Escape') selectCard(null);
  });
}
function zoomAt(lx, ly, f) {
  const [wx, wy] = screenToWorld(lx, ly);
  CAM.z *= f; clampCam();
  const [wx2, wy2] = screenToWorld(lx, ly);
  CAM.x += wx - wx2; CAM.y += wy - wy2; clampCam();
  CAM.userT = 5; CAM.baseY = CAM.y;
}
function onDown(e) {
  e.preventDefault(); audioInit();
  const [x, y] = toLocal(e.clientX, e.clientY);
  PTR.set(e.pointerId, { x, y, sx: x, sy: y });
  try { cv.setPointerCapture(e.pointerId); } catch (er) { /* 有些瀏覽器不支援 */ }
  if (G.scene !== 'battle') { const S = SCENES[G.scene]; if (S && S.down) S.down(x, y, e); return; }
  if (PTR.size === 2) { const [a, b] = [...PTR.values()]; gest = { k: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), z: CAM.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; if (B) B.aim = null; return; }
  gest = { k: 'tap', moved: 0, t: G.rt, cx: CAM.x, cy: CAM.y };
  if (B && B.sel) updateAim(x, y);
}
function onMove(e) {
  const p = PTR.get(e.pointerId); if (!p) return;
  const [x, y] = toLocal(e.clientX, e.clientY);
  const dx = x - p.x, dy = y - p.y; p.x = x; p.y = y;
  if (G.scene !== 'battle') { const S = SCENES[G.scene]; if (S && S.move) S.move(x, y, dx, dy, PTR); return; }
  if (!gest) return;
  if (gest.k === 'pinch' && PTR.size >= 2) {
    const [a, b] = [...PTR.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    zoomAt(mx, my, d / gest.d); gest.d = d;
    CAM.x -= (mx - gest.mx) / CAM.z; CAM.y -= (my - gest.my) / CAM.z; gest.mx = mx; gest.my = my; clampCam(); CAM.baseY = CAM.y;
    return;
  }
  gest.moved += Math.abs(dx) + Math.abs(dy);
  if (B && B.sel && gest.moved < 26) { updateAim(x, y); return; }
  if (gest.moved > 8) {
    if (B && B.sel && !ABIL[B.sel]) { updateAim(x, y); return; }
    CAM.x -= dx / CAM.z; CAM.y -= dy / CAM.z; clampCam(); CAM.userT = 4; CAM.baseY = CAM.y;
    if (B && B.sel) updateAim(x, y);
  }
}
function onUp(e) {
  const p = PTR.get(e.pointerId); PTR.delete(e.pointerId);
  if (!p) return;
  if (G.scene !== 'battle') { const S = SCENES[G.scene]; if (S && S.up) S.up(p.x, p.y, e); return; }
  if (!gest) return;
  if (gest.k === 'pinch') { if (PTR.size === 0) gest = null; return; }
  if (B && B.sel && B.aim) {
    const k = B.sel, a = B.aim;
    if (deploy(0, k, a.lane, a.x)) { if (ABIL[k]) sfx('radio'); selectCard(null); }
    else { sfx('deny'); }
    B.aim = null;
  } else if (B && gest.moved < 10) {
    // 點自己的英雄：放大招
    const [wx, wy] = screenToWorld(p.x, p.y);
    const h = B.units.find((u) => u.alive && u.side === 0 && u.hero && Math.abs(u.x - wx) < 34 && Math.abs((u.cls === 'air' ? u.y - u.alt : u.y - 26) - wy) < 40);
    if (h) heroSkill(h);
  }
  gest = null;
}
function updateAim(x, y) {
  const [wx, wy] = screenToWorld(x, y);
  let lane = 0, bd = 1e9;
  for (let l = 0; l < 3; l++) { const d = Math.abs(wy - LANES[l] + 14); if (d < bd) { bd = d; lane = l; } }
  let ax = clamp(wx, 40, FIELD_W - 40);
  if (!ABIL[B.sel]) { const z = deployZone(0, lane); ax = clamp(ax, z[0], z[1]); }
  B.aim = { x: ax, lane };
}
