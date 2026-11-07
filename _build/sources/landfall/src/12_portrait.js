'use strict';
/* ====== 全像檔案立繪、建築縮圖、圖示 ====== */
function portraitCanvas(p, w = 120, h = 144, opt = {}) {
  const cvs = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cvs.width = Math.round(w * dpr); cvs.height = Math.round(h * dpr);
  cvs.style.width = w + 'px'; cvs.style.height = h + 'px';
  drawPortrait(cvs, p, opt);
  return cvs;
}
function drawPortrait(cvs, p, opt = {}) {
  const g = cvs.getContext('2d');
  const W = cvs.width, H = cvs.height;
  const k = Math.min(W / 100, H / 120);
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const o = off.getContext('2d');
  o.save(); o.translate((W - 100 * k) / 2, (H - 120 * k)); o.scale(k, k);
  const look = p.look || { skin: 1, hair: 1, hc: '#222', acc: [] };
  const skin = SKIN[look.skin] || SKIN[1];
  const suit = SUIT[p.suit] || SUIT.colon;
  const acc = look.acc || [];
  const hc = look.hc;
  // 長髮（身後）
  o.fillStyle = hc;
  if (look.hair === 3) { o.beginPath(); o.moveTo(31, 40); o.quadraticCurveTo(26, 78, 30, 92); o.lineTo(70, 92); o.quadraticCurveTo(74, 78, 69, 40); o.fill(); }
  if (look.hair === 2 || look.hair === 10) { o.beginPath(); o.moveTo(31, 40); o.quadraticCurveTo(29, 62, 33, 70); o.lineTo(67, look.hair === 10 ? 60 : 70); o.quadraticCurveTo(71, 62, 69, 40); o.fill(); }
  if (look.hair === 4) { o.beginPath(); o.ellipse(70, 52, 5, 16, 0.25, 0, TAU); o.fill(); }
  if (look.hair === 6) { for (let i = 0; i < 6; i++) { o.beginPath(); o.ellipse(32 - i * 0.4, 58 + i * 6, 4.2, 3.6, 0, 0, TAU); o.fill(); } }
  // 肩膀與身體
  const bg = o.createLinearGradient(14, 80, 86, 120);
  bg.addColorStop(0, shade(suit.c, 0.2)); bg.addColorStop(1, shade(suit.c, -0.25));
  o.fillStyle = bg;
  o.beginPath(); o.moveTo(10, 121); o.quadraticCurveTo(12, 88, 30, 81); o.quadraticCurveTo(50, 75, 70, 81); o.quadraticCurveTo(88, 88, 90, 121); o.closePath(); o.fill();
  o.fillStyle = suit.trim;
  o.beginPath(); o.moveTo(40, 79); o.lineTo(50, 94); o.lineTo(60, 79); o.lineTo(56, 78); o.lineTo(50, 88); o.lineTo(44, 78); o.closePath(); o.fill();
  o.fillRect(20, 104, 60, 2.2);
  o.fillStyle = p.hue || '#7fe3ff'; o.fillRect(62, 92, 9, 6);
  o.fillStyle = 'rgba(255,255,255,0.25)'; o.fillRect(63, 93, 7, 1.2);
  // 脖子
  const ng = o.createLinearGradient(43, 0, 57, 0); ng.addColorStop(0, shade(skin, -0.2)); ng.addColorStop(1, shade(skin, -0.05));
  o.fillStyle = ng; o.fillRect(43.5, 60, 13, 20);
  // 耳朵
  o.fillStyle = shade(skin, -0.12); o.beginPath(); o.ellipse(32.5, 49, 3.2, 5, 0, 0, TAU); o.ellipse(67.5, 49, 3.2, 5, 0, 0, TAU); o.fill();
  // 臉
  const fg = o.createRadialGradient(45, 40, 3, 50, 47, 24);
  fg.addColorStop(0, shade(skin, 0.1)); fg.addColorStop(1, shade(skin, -0.14));
  o.fillStyle = fg;
  o.beginPath(); o.moveTo(33, 42); o.quadraticCurveTo(33, 25, 50, 25); o.quadraticCurveTo(67, 25, 67, 42); o.quadraticCurveTo(67, 58, 58, 64); o.quadraticCurveTo(50, 69, 42, 64); o.quadraticCurveTo(33, 58, 33, 42); o.fill();
  // 五官
  const old = p.age >= 60;
  o.strokeStyle = shade(hc === '#e6e1d8' || hc === '#d9d4cc' || hc === '#cfcac2' ? '#8a8580' : hc, -0.1); o.lineWidth = 1.7; o.lineCap = 'round';
  o.beginPath(); o.moveTo(38.5, 41.5); o.quadraticCurveTo(42, 39.6, 46, 41); o.moveTo(54, 41); o.quadraticCurveTo(58, 39.6, 61.5, 41.5); o.stroke();
  for (const ex of [42.2, 57.8]) {
    o.fillStyle = '#fbfbff'; o.beginPath(); o.ellipse(ex, 47, 3.6, 2.3, 0, 0, TAU); o.fill();
    o.fillStyle = '#2a2230'; o.beginPath(); o.arc(ex, 47.1, 1.9, 0, TAU); o.fill();
    o.fillStyle = '#fff'; o.beginPath(); o.arc(ex - 0.7, 46.4, 0.6, 0, TAU); o.fill();
    o.strokeStyle = 'rgba(40,25,30,0.55)'; o.lineWidth = 0.9; o.beginPath(); o.ellipse(ex, 47, 3.6, 2.3, 0, Math.PI * 1.05, Math.PI * 1.95); o.stroke();
  }
  if (old) { o.strokeStyle = 'rgba(90,60,50,0.35)'; o.lineWidth = 0.7; o.beginPath(); o.moveTo(36.5, 50); o.lineTo(38.5, 51.5); o.moveTo(63.5, 50); o.lineTo(61.5, 51.5); o.moveTo(43, 59.5); o.quadraticCurveTo(50, 61, 57, 59.5); o.stroke(); }
  o.strokeStyle = shade(skin, -0.3); o.lineWidth = 1.1;
  o.beginPath(); o.moveTo(50.5, 48); o.quadraticCurveTo(49.2, 53.5, 48.2, 54.6); o.quadraticCurveTo(50, 55.6, 52, 54.8); o.stroke();
  o.strokeStyle = shade(skin, -0.4); o.lineWidth = 1.3;
  o.beginPath(); o.moveTo(45.5, 59.3); o.quadraticCurveTo(50, 61.2, 54.5, 59.3); o.stroke();
  // 配件（臉上）
  if (acc.includes('freckles')) { o.fillStyle = 'rgba(150,80,50,0.45)'; for (const [x, y] of [[38, 52], [40, 53.5], [42, 52.4], [58, 52.4], [60, 53.5], [62, 52]]) { o.beginPath(); o.arc(x, y, 0.6, 0, TAU); o.fill(); } }
  if (acc.includes('scar')) { o.strokeStyle = 'rgba(200,100,100,0.85)'; o.lineWidth = 1.1; o.beginPath(); o.moveTo(61, 43); o.lineTo(64, 53); o.stroke(); o.lineWidth = 0.6; for (let i = 0; i < 3; i++) { o.beginPath(); o.moveTo(61.2 + i, 46 + i * 2.6); o.lineTo(63.6 + i, 45.3 + i * 2.6); o.stroke(); } }
  if (acc.includes('stubble')) { o.fillStyle = 'rgba(40,30,30,0.18)'; o.beginPath(); o.moveTo(36, 52); o.quadraticCurveTo(38, 63, 50, 67); o.quadraticCurveTo(62, 63, 64, 52); o.quadraticCurveTo(56, 60, 50, 60); o.quadraticCurveTo(44, 60, 36, 52); o.fill(); }
  if (acc.includes('beard')) { o.fillStyle = look.beard || hc; o.beginPath(); o.moveTo(34, 48); o.quadraticCurveTo(35, 66, 50, 70); o.quadraticCurveTo(65, 66, 66, 48); o.quadraticCurveTo(62, 58, 55, 58); o.quadraticCurveTo(50, 56, 45, 58); o.quadraticCurveTo(38, 58, 34, 48); o.fill(); o.fillStyle = shade(skin, -0.4); o.beginPath(); o.moveTo(45.5, 59.6); o.quadraticCurveTo(50, 61.6, 54.5, 59.6); o.quadraticCurveTo(50, 60.4, 45.5, 59.6); o.fill(); }
  if (acc.includes('mustache')) { o.fillStyle = look.beard || hc; o.beginPath(); o.moveTo(50, 56.5); o.quadraticCurveTo(45, 55, 42.5, 58.5); o.quadraticCurveTo(46, 57.6, 50, 58); o.quadraticCurveTo(54, 57.6, 57.5, 58.5); o.quadraticCurveTo(55, 55, 50, 56.5); o.fill(); }
  // 頭髮（前）
  o.fillStyle = hc;
  const capTop = () => { o.beginPath(); o.moveTo(31.5, 44); o.quadraticCurveTo(30, 21, 50, 20); o.quadraticCurveTo(70, 21, 68.5, 44); o.quadraticCurveTo(66, 33, 58, 31); o.quadraticCurveTo(50, 30, 42, 31); o.quadraticCurveTo(34, 33, 31.5, 44); o.fill(); };
  switch (look.hair) {
    case 0: o.beginPath(); o.moveTo(33, 38); o.quadraticCurveTo(33, 23, 50, 23); o.quadraticCurveTo(67, 23, 67, 38); o.quadraticCurveTo(60, 30, 50, 30.5); o.quadraticCurveTo(40, 30, 33, 38); o.fill(); break;
    case 1: capTop(); o.beginPath(); o.moveTo(31.5, 40); o.quadraticCurveTo(38, 27, 58, 31); o.quadraticCurveTo(66, 33, 68.5, 41); o.lineTo(69, 34); o.quadraticCurveTo(64, 20, 48, 21); o.quadraticCurveTo(33, 23, 31.5, 40); o.fill(); break;
    case 2: capTop(); o.beginPath(); o.moveTo(31.5, 38); o.lineTo(31, 66); o.lineTo(36, 66); o.lineTo(35.5, 38); o.fill(); o.beginPath(); o.moveTo(68.5, 38); o.lineTo(69, 66); o.lineTo(64, 66); o.lineTo(64.5, 38); o.fill(); o.beginPath(); o.moveTo(35, 36); o.quadraticCurveTo(44, 31, 52, 37); o.quadraticCurveTo(46, 31, 35, 36); o.fill(); break;
    case 3: capTop(); o.beginPath(); o.moveTo(31.5, 38); o.lineTo(30.5, 82); o.lineTo(36, 82); o.lineTo(35.5, 40); o.fill(); o.beginPath(); o.moveTo(68.5, 38); o.lineTo(69.5, 82); o.lineTo(64, 82); o.lineTo(64.5, 40); o.fill(); break;
    case 4: capTop(); o.beginPath(); o.moveTo(31.5, 40); o.quadraticCurveTo(44, 28, 68.5, 40); o.quadraticCurveTo(62, 26, 50, 25.5); o.quadraticCurveTo(38, 26, 31.5, 40); o.fill(); break;
    case 5: capTop(); o.beginPath(); o.arc(50, 18, 7.5, 0, TAU); o.fill(); o.strokeStyle = shade(hc, -0.2); o.lineWidth = 0.8; o.beginPath(); o.arc(50, 18, 4, 0.5, 4); o.stroke(); break;
    case 6: capTop(); break;
    case 7: for (let i = 0; i < 13; i++) { const a = Math.PI * (0.95 + i / 12 * 1.1); o.beginPath(); o.arc(50 + Math.cos(a) * 17, 42 + Math.sin(a) * 19, 6.2, 0, TAU); o.fill(); } break;
    case 8: o.fillStyle = 'rgba(255,255,255,0.22)'; o.beginPath(); o.ellipse(44, 30, 7, 3, -0.4, 0, TAU); o.fill(); break;
    case 9: capTop(); for (let i = 0; i < 8; i++) { const a = Math.PI * (1.05 + i * 0.12); o.beginPath(); o.moveTo(50 + Math.cos(a) * 15, 40 + Math.sin(a) * 17); o.lineTo(50 + Math.cos(a + 0.1) * 24, 40 + Math.sin(a + 0.1) * 25); o.lineTo(50 + Math.cos(a + 0.22) * 15, 40 + Math.sin(a + 0.22) * 17); o.fill(); } break;
    case 10: capTop(); o.beginPath(); o.moveTo(31.5, 38); o.lineTo(30.5, 70); o.lineTo(37, 70); o.lineTo(36, 38); o.fill(); o.beginPath(); o.moveTo(68.5, 38); o.lineTo(69, 56); o.lineTo(65, 56); o.fill(); o.beginPath(); o.moveTo(36, 36); o.quadraticCurveTo(50, 27, 62, 38); o.quadraticCurveTo(54, 29, 36, 36); o.fill(); if (look.streak) { o.fillStyle = look.streak; o.beginPath(); o.moveTo(45, 21); o.quadraticCurveTo(36, 30, 33, 70); o.lineTo(36, 70); o.quadraticCurveTo(38, 32, 48, 22); o.fill(); } break;
    case 11: o.beginPath(); o.moveTo(32, 40); o.quadraticCurveTo(30, 21, 50, 20.5); o.quadraticCurveTo(70, 21, 68, 40); o.quadraticCurveTo(64, 28, 50, 27.5); o.quadraticCurveTo(36, 28, 32, 40); o.fill(); o.fillStyle = 'rgba(255,255,255,0.18)'; o.beginPath(); o.ellipse(44, 24.5, 8, 2, -0.15, 0, TAU); o.fill(); break;
    case 12: for (let i = 0; i < 12; i++) { const a = Math.PI * (1.0 + i / 11); o.beginPath(); o.arc(50 + Math.cos(a) * 16.5, 41 + Math.sin(a) * 18.5, 4.4, 0, TAU); o.fill(); } break;
    case 13: capTop(); o.beginPath(); o.arc(35, 23, 6.5, 0, TAU); o.arc(65, 23, 6.5, 0, TAU); o.fill(); o.beginPath(); o.moveTo(36, 37); o.quadraticCurveTo(50, 30, 64, 37); o.quadraticCurveTo(50, 26, 36, 37); o.fill(); break;
  }
  if (acc.includes('headband')) { o.fillStyle = p.hue || '#ff6b6b'; o.beginPath(); o.moveTo(32, 35.5); o.quadraticCurveTo(50, 28, 68, 35.5); o.lineTo(68, 39.5); o.quadraticCurveTo(50, 32, 32, 39.5); o.fill(); }
  if (acc.includes('goggles')) { o.fillStyle = '#34343e'; o.beginPath(); o.moveTo(31.5, 31); o.quadraticCurveTo(50, 24, 68.5, 31); o.lineTo(68.5, 35); o.quadraticCurveTo(50, 28, 31.5, 35); o.fill(); for (const gx of [42, 58]) { o.fillStyle = '#5ad0ff'; o.beginPath(); o.ellipse(gx, 30, 5.4, 4, 0, 0, TAU); o.fill(); o.strokeStyle = '#26262e'; o.lineWidth = 1.4; o.stroke(); o.fillStyle = 'rgba(255,255,255,0.6)'; o.beginPath(); o.arc(gx - 1.8, 28.8, 1.2, 0, TAU); o.fill(); } }
  if (acc.includes('glasses')) { o.strokeStyle = '#1d1d24'; o.lineWidth = 1.2; o.beginPath(); o.roundRect ? o.roundRect(36.5, 43.5, 11, 7.5, 2.5) : o.rect(36.5, 43.5, 11, 7.5); o.moveTo(63.5, 47); o.roundRect ? o.roundRect(52.5, 43.5, 11, 7.5, 2.5) : o.rect(52.5, 43.5, 11, 7.5); o.moveTo(47.5, 46.5); o.lineTo(52.5, 46.5); o.stroke(); o.fillStyle = 'rgba(200,230,255,0.15)'; o.fillRect(37, 44, 10, 6.5); o.fillRect(53, 44, 10, 6.5); }
  if (acc.includes('earring')) { o.fillStyle = '#ffd166'; o.beginPath(); o.arc(32.5, 55, 1.4, 0, TAU); o.fill(); }
  o.restore();
  // 全像化
  g.clearRect(0, 0, W, H);
  if (opt.raw) { g.drawImage(off, 0, 0); return; }
  const hue = p.hue || '#7fe3ff';
  // 投影光柱
  const bgr = g.createLinearGradient(0, H, 0, 0);
  bgr.addColorStop(0, rgba(hue, 0.28)); bgr.addColorStop(0.6, rgba(hue, 0.05)); bgr.addColorStop(1, rgba(hue, 0));
  g.fillStyle = bgr; g.beginPath(); g.moveTo(W * 0.12, 0); g.lineTo(W * 0.88, 0); g.lineTo(W * 0.98, H); g.lineTo(W * 0.02, H); g.fill();
  // 主體
  const tint = document.createElement('canvas'); tint.width = W; tint.height = H;
  const t = tint.getContext('2d');
  t.drawImage(off, 0, 0);
  t.globalCompositeOperation = 'source-atop';
  t.fillStyle = rgba(hue, 0.42); t.fillRect(0, 0, W, H);
  t.globalCompositeOperation = 'source-over';
  g.save(); g.shadowColor = rgba(hue, 0.9); g.shadowBlur = 10 * k; g.globalAlpha = 0.95; g.drawImage(tint, 0, 0); g.restore();
  g.globalAlpha = 0.9; g.drawImage(tint, 0, 0); g.globalAlpha = 1;
  // 掃描線
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 0; y < H; y += Math.max(2, Math.round(k * 2.4))) g.fillRect(0, y, W, Math.max(1, Math.round(k * 0.8)));
  g.globalCompositeOperation = 'source-over';
  // 投影底座
  const by = H - 2 * k;
  const rg = g.createRadialGradient(W / 2, by, 1, W / 2, by, W * 0.45);
  rg.addColorStop(0, rgba(hue, 0.7)); rg.addColorStop(1, rgba(hue, 0));
  g.fillStyle = rg; g.beginPath(); g.ellipse(W / 2, by, W * 0.45, 7 * k, 0, 0, TAU); g.fill();
  if (opt.corrupt) {
    g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(${R() < .5 ? '255,80,120' : '80,220,255'},${0.15 + R() * 0.25})`; g.fillRect(0, R() * H, W, (2 + R() * 9) * k); }
    g.globalCompositeOperation = 'source-over';
  }
}
// 伴星的頭像
function aiAvatar(w = 96, h = 116) {
  const cvs = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cvs.width = w * dpr; cvs.height = h * dpr; cvs.style.width = w + 'px'; cvs.style.height = h + 'px';
  cvs.className = 'ai-avatar';
  const g = cvs.getContext('2d');
  const draw = () => {
    if (!cvs.isConnected) return;
    const W = cvs.width, H = cvs.height, t = performance.now() / 1000;
    g.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.45, r = W * 0.28;
    const gr = g.createRadialGradient(cx, cy, 1, cx, cy, r * 2.2); gr.addColorStop(0, 'rgba(127,227,255,0.5)'); gr.addColorStop(1, 'rgba(127,227,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(160,240,255,0.95)'; g.lineWidth = 1.6 * dpr;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(cx, cy, r * (1 - i * 0.22), r * (1 - i * 0.22) * Math.abs(Math.cos(t * 0.7 + i * 1.1)), t * 0.3 + i, 0, TAU); g.stroke(); }
    g.fillStyle = '#e8fbff'; g.beginPath(); g.arc(cx, cy, r * 0.2 * (1 + 0.15 * Math.sin(t * 3)), 0, TAU); g.fill();
    g.fillStyle = 'rgba(127,227,255,0.8)'; g.font = `700 ${10 * dpr}px "Chakra Petch",sans-serif`; g.textAlign = 'center'; g.fillText('COMPANION', cx, H * 0.88);
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  return cvs;
}

/* 建築縮圖（用同一套渲染器） */
const THUMBS = {};
function buildingThumb(type) {
  if (THUMBS[type]) return THUMBS[type];
  const d = BUILD[type];
  const w = 132, h = 104, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const c = document.createElement('canvas'); c.width = w * dpr; c.height = h * dpr;
  const g = c.getContext('2d');
  const save = { ctx, W: CAM.W, H: CAM.H, x: CAM.x, y: CAM.y, z: CAM.z, rot: CAM.rot, sx: CAM.shakeX, sy: CAM.shakeY };
  const fb = { id: 999, type, x: 0, y: 0, w: d.w, h: d.h, done: true, prog: 1, hp: 1, hpMax: 1, active: true, grow: 60, out: 6, busy: false };
  try {
    ctx = g; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    CAM.W = w; CAM.H = h; CAM.rot = 0; CAM.shakeX = 0; CAM.shakeY = 0;
    const span = Math.max(d.w, d.h);
    CAM.z = span >= 3 ? 0.44 : span === 2 ? 0.58 : 0.82;
    CAM.x = d.w / 2; CAM.y = d.h / 2;
    const tall = { lamp: 22, antenna: 40, hull: 0 }[type] || 10;
    // 將畫面往下移，讓高的東西放得下
    CAM.y -= 0; CAM.x -= 0;
    g.save(); g.translate(0, (BH[type] || 20) * CAM.z * 0.5 + tall * CAM.z * 0.6);
    const lit = true;
    const ob = { done: true };
    if (type === 'fence' || type === 'wall') { BDRAW[type] ? drawWallLike(fb, type === 'wall' ? 24 : 14, type === 'wall' ? '#9aa6b5' : '#8a6a9a', type === 'wall' ? '#7a8696' : '#6d4f7d', '#fff', type === 'wall') : 0; }
    else if (BDRAW[type]) BDRAW[type](fb, 0, lit, CAM.z);
    g.restore();
  } catch (e) { console.warn('thumb', type, e); }
  ctx = save.ctx; CAM.W = save.W; CAM.H = save.H; CAM.x = save.x; CAM.y = save.y; CAM.z = save.z; CAM.rot = save.rot; CAM.shakeX = save.sx; CAM.shakeY = save.sy;
  LIGHTS.length = 0; GLOWPTS.length = 0;
  THUMBS[type] = c;
  return c;
}
function thumbImg(type) {
  const src = buildingThumb(type);
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0); c.className = 'thumb';
  return c;
}

/* SVG 圖示 */
const ICON = {
  food: '<path d="M12 3c3 0 6 3 6 7 0 5-3 11-6 11S6 15 6 10c0-4 3-7 6-7z" fill="currentColor" opacity=".9"/><path d="M12 3c1-1 2-1.5 3-1" stroke="currentColor" stroke-width="1.6" fill="none"/>',
  metal: '<path d="M4 15l8-4 8 4-8 4z" fill="currentColor"/><path d="M4 11l8-4 8 4-8 4z" fill="currentColor" opacity=".6"/>',
  fiber: '<path d="M12 21V9" stroke="currentColor" stroke-width="2"/><path d="M4 10c0-4 4-7 8-7s8 3 8 7z" fill="currentColor"/>',
  comp: '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" stroke-width="2"/>',
  med: '<rect x="4" y="7" width="16" height="11" rx="3" fill="currentColor" opacity=".35"/><path d="M12 9v7M8.5 12.5h7" stroke="currentColor" stroke-width="2.4"/>',
  data: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/>',
  power: '<path d="M13 2L5 14h6l-1 8 8-12h-6z" fill="currentColor"/>',
  build: '<path d="M14 4l6 6-3 3-6-6z" fill="currentColor"/><path d="M11 7L3 15l3 3 8-8" fill="none" stroke="currentColor" stroke-width="2"/>',
  people: '<circle cx="9" cy="8" r="3.4" fill="currentColor"/><path d="M2.5 20c0-4 3-6.5 6.5-6.5s6.5 2.5 6.5 6.5z" fill="currentColor"/><circle cx="17" cy="9" r="2.6" fill="currentColor" opacity=".6"/><path d="M15 14.5c3.5-.5 6.5 1.5 6.5 5.5H17" fill="currentColor" opacity=".6"/>',
  pod: '<rect x="7" y="2.5" width="10" height="19" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="9.5" y="6" width="5" height="8" rx="2.5" fill="currentColor" opacity=".7"/><path d="M9 17h6" stroke="currentColor" stroke-width="2"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9c-.6 1.4.3 3 1.9 3h10.2c1.6 0 2.5-1.6 1.9-3l-5-9V3" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M7.5 15h9" stroke="currentColor" stroke-width="1.9"/>',
  log: '<rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="currentColor" stroke-width="1.9"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.2"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor"/>',
  play: '<path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor"/>',
  ff: '<path d="M3 5l9 7-9 7zM12 5l9 7-9 7z" fill="currentColor"/>',
  fff: '<path d="M1 5l7 7-7 7zM8.5 5l7 7-7 7zM16 5l7 7-7 7z" fill="currentColor"/>',
  rotL: '<path d="M5 9a8 8 0 1 1 1.5 8" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M2 4v6h6" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  rotR: '<path d="M19 9a8 8 0 1 0-1.5 8" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M22 4v6h-6" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  home: '<path d="M3 11l9-7 9 7v9H3z" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10" y="14" width="4" height="6" fill="currentColor"/>',
  x: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4"/>',
  check: '<path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" stroke-width="2.6"/>',
  moon: '<path d="M15 3a8 8 0 1 0 6 13A9 9 0 0 1 15 3z" fill="currentColor"/>',
  sun: '<circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2"/>',
  talk: '<path d="M4 5h16v10H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
  move: '<path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3" stroke="currentColor" stroke-width="1.8" fill="none"/>',
  hammer: '<path d="M14 4l6 6-3 3-6-6z" fill="currentColor"/><path d="M11 9l-8 8 3 3 8-8" fill="none" stroke="currentColor" stroke-width="2"/>',
  pick: '<path d="M4 7c4-3 12-3 16 0" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 5v16" stroke="currentColor" stroke-width="2.2"/>',
  leaf: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z" fill="currentColor" opacity=".85"/><path d="M5 19L14 10" stroke="#081020" stroke-width="1.6"/>',
  gear: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2.2"/>',
  cross: '<path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="3.2"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="none" stroke="currentColor" stroke-width="2"/>',
  bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6z" fill="currentColor"/>',
  warn: '<path d="M12 3l10 18H2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 10v5M12 17.5v.5" stroke="currentColor" stroke-width="2.2"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5c1.5 1 1.5 6 0 7M18.5 6c3 2.5 3 9.5 0 12" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2"/>',
  exp: '<path d="M3 20l6-12 4 7 3-4 5 9z" fill="currentColor" opacity=".8"/><circle cx="17" cy="6" r="2.5" fill="currentColor"/>',
  lamp: '<path d="M12 22V8" stroke="currentColor" stroke-width="2"/><path d="M7 8h10l-2-4H9z" fill="currentColor"/>',
};
function icon(name, cls = '') { return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name] || ''}</svg>`; }
const ART_ICON = { food: 'food', pod: 'pod', talk: 'talk', bug: 'eye', spore: 'med', meteor: 'warn', storm: 'warn', cake: 'food', fight: 'warn', heart: 'people', box: 'log', whale: 'moon', ai: 'data', wrench: 'build', house: 'home', fire: 'sun', drone: 'gear', exp: 'exp' };
