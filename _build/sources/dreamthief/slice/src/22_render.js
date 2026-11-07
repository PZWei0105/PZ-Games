'use strict';
/* ====== 試玩關：橫版畫面（大樓剖面） ====== */
const R = { cv: null, ctx: null, w: 0, h: 0, dpr: 1, zoom: 1, cam: { x: 300, y: -110 }, t: 0, lcv: null, lctx: null, ls: .5, rc: new Map(), rcK: 0, snap: true, miniT: 0 };
const glowC = {};
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function glow(c) {
  if (glowC[c]) return glowC[c];
  const cv = mkCanvas(64, 64), g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, rgba(c, 1)); gr.addColorStop(.25, rgba(c, .55)); gr.addColorStop(.6, rgba(c, .14)); gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return glowC[c] = cv;
}
function hash2(x, y) { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

function svInitRender() {
  R.cv = $('#cv'); R.ctx = R.cv.getContext('2d');
  R.lcv = mkCanvas(4, 4); R.lctx = R.lcv.getContext('2d');
  svResize(); addEventListener('resize', svResize);
}
function svResize() {
  R.dpr = Math.min(2, window.devicePixelRatio || 1);
  R.w = innerWidth; R.h = innerHeight;
  R.cv.width = Math.round(R.w * R.dpr); R.cv.height = Math.round(R.h * R.dpr);
  R.zoom = clamp(Math.min(R.w / 460, R.h / 560), .55, 1.7);
  R.lcv.width = Math.max(4, Math.round(R.cv.width * R.ls)); R.lcv.height = Math.max(4, Math.round(R.cv.height * R.ls));
  R.rcK++; R.rc.clear(); R.snap = true;
}
const TH = () => W.ch.th;

/* ---------- 鏡頭 ---------- */
function svCamera(dt) {
  const p = W.players[0], z = R.zoom, vw = R.w / z, vh = R.h / z;
  const maxX = Math.max(...W.L.floors.map(F => F.x1));
  let tx = p.x + p.face * Math.min(90, vw * .12), ty = p.y - 115;
  const bx0 = -90, bx1 = maxX + 90, by0 = FY(3) - 620, by1 = 380;
  tx = vw >= bx1 - bx0 ? (bx0 + bx1) / 2 : clamp(tx, bx0 + vw / 2, bx1 - vw / 2);
  ty = vh >= by1 - by0 ? (by0 + by1) / 2 : clamp(ty, by0 + vh / 2, by1 - vh / 2);
  if (R.snap) { R.cam.x = tx; R.cam.y = ty; R.snap = false; }
  const k = 1 - Math.pow(.0008, dt);
  R.cam.x += (tx - R.cam.x) * k; R.cam.y += (ty - R.cam.y) * k * .8;
}
function worldTf(c, s) {
  const z = R.zoom * R.dpr * s, sh = W.shake * (G.settings.shake === false ? 0 : 1);
  const ox = (Math.random() - .5) * sh, oy = (Math.random() - .5) * sh;
  c.setTransform(z, 0, 0, z, (R.w / 2 * R.dpr - R.cam.x * R.zoom * R.dpr + ox * R.dpr) * s, (R.h / 2 * R.dpr - R.cam.y * R.zoom * R.dpr + oy * R.dpr) * s);
}

/* ---------- 主繪圖 ---------- */
function svRender(dt) {
  R.t += dt;
  const c = R.ctx, w = R.cv.width, h = R.cv.height;
  svCamera(dt);
  c.setTransform(1, 0, 0, 1, 0, 0);
  drawSky(c, w, h);
  worldTf(c, 1);
  drawBuilding(c);
  drawStairs(c);
  for (const F of W.L.floors) for (const r of F.rooms) for (const p of r.props) drawProp(c, p);
  drawVeils(c);
  drawCracks(c);
  drawDoors(c);
  drawPools(c);
  drawPicks(c, false);
  drawActors(c);
  drawFxUnder(c);
  // 光
  drawLight();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'multiply'; c.drawImage(R.lcv, 0, 0, w, h); c.globalCompositeOperation = 'source-over';
  worldTf(c, 1);
  drawEmissive(c);
  drawTele(c);
  drawFxOver(c);
  drawSpotsUI(c);
  drawDoorUI(c);
  drawPicks(c, true);
  drawOverlayText(c);
  c.setTransform(1, 0, 0, 1, 0, 0);
  drawScreenFx(c, w, h);
  R.miniT -= dt; if (R.miniT <= 0) { R.miniT = .2; drawMini(); }
}

/* ---------- 天空、城市 ---------- */
function drawSky(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#04050c'); g.addColorStop(.6, '#0d1230'); g.addColorStop(1, '#1a1838'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  const d = R.dpr, px = R.cam.x * R.zoom * d;
  for (let i = 0; i < 110; i++) { const x = ((hash2(i, 1) * w * 1.6 - px * .05) % (w * 1.6) + w * 1.6) % (w * 1.6) - w * .3, y = hash2(i, 2) * h * .8; c.fillStyle = rgba('#dfe4ff', .15 + .45 * Math.sin(R.t * (.4 + hash2(i, 3)) + i) ** 2); c.fillRect(x, y, 1.4 * d, 1.4 * d); }
  // 月亮
  const mx = w * .78 - px * .02, my = h * .16, mr = Math.min(w, h) * .07;
  c.globalCompositeOperation = 'lighter'; c.drawImage(glow('#7f8cff'), mx - mr * 4, my - mr * 4, mr * 8, mr * 8); c.globalCompositeOperation = 'source-over';
  const mg = c.createRadialGradient(mx - mr * .3, my - mr * .3, mr * .1, mx, my, mr); mg.addColorStop(0, '#fbf8ff'); mg.addColorStop(1, '#b6b4e6'); c.fillStyle = mg; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
  // 遠方的城市（視差）
  const base = h * .5 + (-R.cam.y * R.zoom * d - h * .1) * .25;
  for (let layer = 0; layer < 2; layer++) {
    const par = layer ? .4 : .18, col = layer ? '#0a0b18' : '#10122a', s = (layer ? 1.25 : .9) * d * R.zoom;
    c.fillStyle = col;
    let x = -((px * par) % (900 * s)) - 900 * s, i = 0;
    while (x < w + 200 * s) {
      const k = Math.floor((x + px * par) / (60 * s)) + layer * 999, bw = (40 + hash2(k, 5) * 70) * s, bh = (80 + hash2(k, 6) * 260) * s * (layer ? 1 : .8);
      const by = base + (layer ? 140 : 40) * s;
      c.fillRect(x, by - bh, bw, bh + h);
      for (let j = 0; j < 10; j++) if (hash2(k, j + 20) < .28) { c.fillStyle = rgba(hash2(k, j) < .6 ? '#ffcf7a' : '#9fd4ff', layer ? .55 : .35); c.fillRect(x + (5 + (j % 3) * 12) * s, by - bh + (12 + Math.floor(j / 3) * 18) * s, 4 * s, 6 * s); c.fillStyle = col; }
      x += bw + 6 * s; i++;
    }
  }
}

/* ---------- 大樓 ---------- */
function roomCanvas(r) {
  const key = r.idx;
  let cv = R.rc.get(key); if (cv) return cv;
  const k = R.zoom * R.dpr, wd = r.x1 - r.x0, ht = CEIL;
  cv = mkCanvas(wd * k, ht * k); const g = cv.getContext('2d'); g.scale(k, k);
  paintRoom(g, r, wd, ht);
  R.rc.set(key, cv); return cv;
}
function paintWindow(g, x, y, w, h, opt = {}) {
  g.fillStyle = '#1b1e2c'; g.fillRect(x - 4, y - 4, w + 8, h + 8);
  const sky = g.createLinearGradient(0, y, 0, y + h); sky.addColorStop(0, '#0a0d24'); sky.addColorStop(1, '#232a52'); g.fillStyle = sky; g.fillRect(x, y, w, h);
  for (let i = 0; i < 14; i++) { g.fillStyle = rgba('#e8ecff', .3 + hash2(i, x) * .5); g.fillRect(x + hash2(i, 3 + x) * w, y + hash2(i, 9 + y) * h * .6, 1.2, 1.2); }
  // 遠方的大樓
  for (let i = 0; i < 6; i++) { const bw = 10 + hash2(i, x + 1) * 16, bh = 16 + hash2(i, x + 2) * h * .6, bx = x + i * w / 6; g.fillStyle = '#0c0e1e'; g.fillRect(bx, y + h - bh, bw, bh); for (let j = 0; j < 4; j++) if (hash2(i * 7 + j, x) < .4) { g.fillStyle = rgba('#ffcf7a', .6); g.fillRect(bx + 3, y + h - bh + 4 + j * 7, 3, 3); g.fillStyle = '#0c0e1e'; } }
  if (opt.hospital) {
    const hx = x + w * .55, hw = w * .36, hh = h * .62;
    g.fillStyle = '#121528'; g.fillRect(hx, y + h - hh, hw, hh);
    for (let j = 0; j < 6; j++) for (let i = 0; i < 4; i++) { g.fillStyle = rgba('#d4f1ff', hash2(i, j + 40) < .5 ? .55 : .12); g.fillRect(hx + 4 + i * hw / 4, y + h - hh + 6 + j * hh / 7, hw / 4 - 6, 3); }
    g.fillStyle = '#ff4d5e'; g.fillRect(hx + hw / 2 - 2, y + h - hh - 14, 4, 12); g.fillRect(hx + hw / 2 - 6, y + h - hh - 10, 12, 4);
  }
  g.strokeStyle = '#2c3146'; g.lineWidth = 3; g.strokeRect(x, y, w, h); g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h * .45); g.lineTo(x + w, y + h * .45); g.stroke();
  g.fillStyle = 'rgba(160,200,255,.06)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * .35, y); g.lineTo(x, y + h * .6); g.fill();
}
function paintRoom(g, r, wd, ht) {
  const st = r.style;
  const pal = {
    stair: ['#2b2f3d', '#20232f'], guard: ['#1f3b42', '#16292f'], lobby: ['#5c6274', '#3d4252'], mail: ['#4a3a2c', '#33281e'],
    meet: ['#3a3244', '#2a2433'], office: ['#33405c', '#252f45'], exec: ['#4a3426', '#342418'], wait: ['#3d5650', '#2d403b'],
    exam: ['#5d6a72', '#454f56'], pharm: ['#36453f', '#26322e'], roof: ['#000000', '#000000'],
  }[st] || ['#333', '#222'];
  if (st === 'roof') return;
  const bg = g.createLinearGradient(0, 0, 0, ht); bg.addColorStop(0, pal[1]); bg.addColorStop(1, pal[0]); g.fillStyle = bg; g.fillRect(0, 0, wd, ht);
  // 牆面花紋
  if (st === 'lobby') { g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; for (let i = 0; i < 18; i++) { g.beginPath(); let x = hash2(i, 1) * wd, y = 0; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (hash2(i, k) - .5) * 60; y += ht / 6; g.lineTo(x, y); } g.stroke(); } for (let x = 0; x < wd; x += 90) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, 0, 1.5, ht); } }
  else if (st === 'office' || st === 'meet' || st === 'exec') { g.fillStyle = 'rgba(255,255,255,.025)'; for (let x = 0; x < wd; x += 14) g.fillRect(x, 0, 6, ht); }
  else if (st === 'wait' || st === 'exam' || st === 'pharm') { g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; for (let y = ht * .45; y < ht; y += 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(wd, y); g.stroke(); } for (let x = 0; x < wd; x += 18) { g.beginPath(); g.moveTo(x, ht * .45); g.lineTo(x, ht); g.stroke(); } g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, ht * .45 - 4, wd, 4); }
  else if (st === 'stair') { g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; for (let y = 0; y < ht; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(wd, y); g.stroke(); for (let x = (y / 22 % 2) * 22; x < wd; x += 44) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 22); g.stroke(); } } }
  else if (st === 'guard') { g.fillStyle = 'rgba(255,255,255,.03)'; g.fillRect(0, ht * .55, wd, 3); }
  else if (st === 'mail') { g.fillStyle = 'rgba(0,0,0,.12)'; for (let x = 0; x < wd; x += 30) g.fillRect(x, 0, 2, ht); }
  // 窗
  if (st === 'office') { paintWindow(g, 40, 40, 110, 96); paintWindow(g, wd - 170, 40, 110, 96); }
  if (st === 'meet') { paintWindow(g, wd - 120, 44, 90, 84); g.fillStyle = '#e8ebf2'; g.fillRect(30, 50, 110, 64); g.strokeStyle = '#7a8296'; g.lineWidth = 3; g.strokeRect(30, 50, 110, 64); g.strokeStyle = 'rgba(60,90,200,.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(40, 70); g.lineTo(90, 64); g.lineTo(120, 90); g.moveTo(44, 96); g.lineTo(110, 98); g.stroke(); }
  if (st === 'exec') { paintWindow(g, wd - 140, 36, 110, 100); g.fillStyle = '#2a1a10'; g.fillRect(36, 50, 74, 54); g.fillStyle = '#6a4a2a'; g.fillRect(40, 54, 66, 46); g.fillStyle = '#c8a25a'; g.beginPath(); g.arc(73, 77, 13, 0, TAU); g.fill(); }
  if (st === 'wait') { paintWindow(g, 40, 38, 120, 92, { hospital: true }); g.fillStyle = '#d8efe6'; g.fillRect(wd - 150, 40, 120, 30); g.fillStyle = '#2d5a4a'; g.font = '600 15px "Noto Serif TC",serif'; g.textAlign = 'center'; g.fillText('13F 心安診所', wd - 90, 61); }
  if (st === 'exam') { g.fillStyle = '#f2f4f6'; g.fillRect(40, 44, 40, 56); for (let i = 0; i < 6; i++) { g.fillStyle = '#222'; g.fillRect(52 - i * .5, 52 + i * 8, 16 - i * 2, 3); } }
  if (st === 'pharm') { for (let y = 34; y < 120; y += 28) { g.fillStyle = '#2a2018'; g.fillRect(16, y + 18, wd - 32, 4); for (let x = 22; x < wd - 26; x += 11) { g.fillStyle = ['#e8e2d0', '#9fd4c4', '#e6a0a0', '#f0d48a'][(x + y) % 4]; g.fillRect(x, y + 4 + (x % 3), 7, 14 - (x % 3)); } } }
  if (st === 'lobby') { g.fillStyle = '#c8a25a'; g.font = '700 22px "Noto Serif TC",serif'; g.textAlign = 'center'; g.fillText('千禧大樓', 150, 70); g.font = '600 9px system-ui'; g.fillText('MILLENNIUM TOWER', 150, 86); }
  if (st === 'guard') { g.fillStyle = '#e8e2d0'; g.fillRect(wd - 82, 50, 46, 60); g.fillStyle = '#2a2a2a'; for (let i = 0; i < 6; i++) g.fillRect(wd - 76, 58 + i * 8, 34, 2); g.fillStyle = '#c8a25a'; g.font = '600 9px system-ui'; g.textAlign = 'center'; g.fillText('巡邏表', wd - 59, 120); g.fillStyle = '#1a1612'; g.beginPath(); g.arc(60, 46, 15, 0, TAU); g.fill(); g.fillStyle = '#f3ecd8'; g.beginPath(); g.arc(60, 46, 12, 0, TAU); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(60, 46); g.lineTo(60, 37); g.moveTo(60, 46); g.lineTo(67, 49); g.stroke(); }
  // 踢腳板、天花板線
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, ht - 10, wd, 10);
  g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, ht - 10, wd, 1.5);
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 0, wd, 8);
  if (st === 'stair') { g.fillStyle = '#1fbf6a'; g.fillRect(wd / 2 - 18, 22, 36, 14); g.fillStyle = '#e8fff0'; g.font = '700 9px system-ui'; g.textAlign = 'center'; g.fillText('EXIT', wd / 2, 32); }
}
function drawBuilding(c) {
  const th = TH();
  for (const F of W.L.floors) {
    const y = FY(F.i);
    for (const r of F.rooms) {
      if (r.style === 'stair') continue;
      c.drawImage(roomCanvas(r), r.x0, y - CEIL, r.x1 - r.x0, CEIL);
      // 地板
      const fl = { lobby: '#7a7f90', guard: '#3a4048', mail: '#5a4632', meet: '#3b4766', office: '#3b4766', exec: '#5a3a24', wait: '#8a9c96', exam: '#a8b4b8', pharm: '#7a8a84', roof: '#3a3c48' }[r.style] || '#444';
      c.fillStyle = fl; c.fillRect(r.x0, y - 6, r.x1 - r.x0, 6);
      c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(r.x0, y - 6, r.x1 - r.x0, 1.5);
    }
    // 樓板（下一層的天花板）
    const slabY = y, slabH = 44;
    c.fillStyle = '#1a1c26'; c.fillRect(F.x0 - 24, slabY, F.x1 - F.x0 + 48, slabH);
    c.fillStyle = '#2a2d3a'; c.fillRect(F.x0 - 24, slabY, F.x1 - F.x0 + 48, 4);
    c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(F.x0 - 24, slabY + slabH - 6, F.x1 - F.x0 + 48, 6);
    if (!F.roof) {
      // 外牆
      c.fillStyle = '#151722'; c.fillRect(F.x0 - 24, y - CEIL, 24, CEIL); c.fillRect(F.x1, y - CEIL, 24, CEIL);
      c.fillStyle = '#232634'; c.fillRect(F.x0 - 24, y - CEIL, 4, CEIL); c.fillRect(F.x1 + 20, y - CEIL, 4, CEIL);
      // 樓層牌
      c.fillStyle = 'rgba(216,180,106,.85)'; c.font = '700 20px "Noto Serif TC",serif'; c.textAlign = 'left'; c.fillText(F.label, F.x1 + 30, y - CEIL / 2);
      c.fillStyle = 'rgba(200,190,230,.5)'; c.font = '600 11px "Noto Serif TC",serif'; c.fillText(F.name, F.x1 + 30, y - CEIL / 2 + 17);
    } else {
      // 女兒牆、欄杆
      c.fillStyle = '#1e2030'; c.fillRect(F.x1, y - 40, 16, 40); c.fillRect(F.x0 - 24, y - 40, 24, 40);
      c.strokeStyle = 'rgba(160,170,210,.35)'; c.lineWidth = 2; c.beginPath(); for (let x = 160; x < F.x1; x += 40) { c.moveTo(x, y - 6); c.lineTo(x, y - 36); } c.moveTo(150, y - 36); c.lineTo(F.x1, y - 36); c.stroke();
      c.fillStyle = 'rgba(216,180,106,.85)'; c.font = '700 20px "Noto Serif TC",serif'; c.textAlign = 'left'; c.fillText('RF', F.x1 + 30, y - 60);
    }
  }
  // 沒有天台的那一段屋頂
  const F2 = W.L.floors[2], F3 = W.L.floors[3];
  c.fillStyle = '#1a1c26'; c.fillRect(F3.x1 + 16, FY(3), F2.x1 - F3.x1 + 8, 44);
  // 地面與 B1 停車場（夢裡下不去）
  c.fillStyle = '#08090f'; c.fillRect(-900, 44, 3200, 1200);
  c.fillStyle = '#20222e'; c.fillRect(-900, 44, 3200, 4);
  const by = 48, bh = 196, bx1 = W.L.floors[0].x1;
  const gb = c.createLinearGradient(0, by, 0, by + bh); gb.addColorStop(0, '#10121c'); gb.addColorStop(1, '#151826'); c.fillStyle = gb; c.fillRect(-24, by, bx1 + 48, bh);
  c.fillStyle = '#1a1d2a'; c.fillRect(-24, by + bh - 8, bx1 + 48, 8);
  c.fillStyle = 'rgba(230,205,120,.16)'; for (let x = 80; x < bx1 - 40; x += 96) c.fillRect(x, by + bh - 9, 46, 2);
  for (let x = 120; x < bx1; x += 230) { c.fillStyle = '#0c0e16'; c.fillRect(x - 13, by, 26, bh - 8); c.fillStyle = 'rgba(230,205,120,.12)'; c.fillRect(x - 13, by + bh - 60, 26, 10); }
  for (const [x, col] of [[300, '#1b1f2e'], [760, '#221c24'], [1120, '#1a2229']]) {
    const y = by + bh - 8; c.fillStyle = col;
    c.beginPath(); c.moveTo(x - 78, y - 12); c.lineTo(x - 72, y - 34); c.lineTo(x - 40, y - 38); c.lineTo(x - 22, y - 58); c.lineTo(x + 34, y - 58); c.lineTo(x + 54, y - 38); c.lineTo(x + 78, y - 34); c.lineTo(x + 80, y - 12); c.closePath(); c.fill();
    c.fillStyle = 'rgba(160,190,230,.08)'; c.beginPath(); c.moveTo(x - 18, y - 54); c.lineTo(x + 30, y - 54); c.lineTo(x + 46, y - 38); c.lineTo(x - 34, y - 38); c.closePath(); c.fill();
    c.fillStyle = '#07080d'; c.beginPath(); c.arc(x - 46, y - 10, 12, 0, TAU); c.arc(x + 48, y - 10, 12, 0, TAU); c.fill();
  }
  c.fillStyle = 'rgba(216,180,106,.4)'; c.font = '700 20px "Noto Serif TC",serif'; c.textAlign = 'left'; c.fillText('B1', bx1 + 30, by + bh / 2);
  c.fillStyle = 'rgba(200,190,230,.3)'; c.font = '600 11px "Noto Serif TC",serif'; c.fillText('停車場', bx1 + 30, by + bh / 2 + 17);
  c.fillStyle = '#151722'; c.fillRect(-24, by, 24, bh); c.fillRect(bx1, by, 24, bh);
}
/* 樓梯井 */
function drawStairs(c) {
  for (const s of W.L.stairs) {
    const top = FY(s.f1) - CEIL, bot = FY(s.f0);
    const g = c.createLinearGradient(0, top, 0, bot); g.addColorStop(0, '#1d2030'); g.addColorStop(1, '#262a38'); c.fillStyle = g; c.fillRect(s.x0, top, s.x1 - s.x0, bot - top);
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1;
    for (let y = bot; y > top; y -= 24) { c.beginPath(); c.moveTo(s.x0, y); c.lineTo(s.x1, y); c.stroke(); }
    // 每層的平台
    for (let f = s.f0; f <= s.f1; f++) {
      const y = FY(f);
      c.fillStyle = '#3a3e4e'; c.fillRect(s.x0, y - 6, s.x1 - s.x0, 6); c.fillStyle = '#4c5164'; c.fillRect(s.x0, y - 6, s.x1 - s.x0, 1.5);
      c.fillStyle = '#1fbf6a'; c.fillRect((s.x0 + s.x1) / 2 - 16, y - CEIL + 18, 32, 12); c.fillStyle = '#e8fff0'; c.font = '700 8px system-ui'; c.textAlign = 'center'; c.fillText('EXIT', (s.x0 + s.x1) / 2, y - CEIL + 27);
      c.fillStyle = 'rgba(216,180,106,.7)'; c.font = '700 22px "Noto Serif TC",serif'; c.fillText(W.L.floors[f].label, (s.x0 + s.x1) / 2, y - CEIL + 62);
    }
    // 樓梯段
    for (let k = s.f0; k < s.f1; k++) {
      const x0 = flightX(s, k, false), x1 = flightX(s, k, true), y0 = FY(k), y1 = FY(k + 1);
      const n = 12;
      c.strokeStyle = '#555b70'; c.lineWidth = 4; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      c.fillStyle = '#41465a';
      for (let i = 0; i < n; i++) { const u = i / n, x = lerp(x0, x1, u), y = lerp(y0, y1, u), sw = (x1 - x0) / n; c.fillRect(Math.min(x, x + sw), y - (y0 - y1) / n, Math.abs(sw) + 1, (y0 - y1) / n); }
      c.strokeStyle = 'rgba(200,210,240,.35)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x0, y0 - 34); c.lineTo(x1, y1 - 34); c.stroke();
    }
    // 箭頭提示（玩家在樓梯間時）
    const p = W.players[0];
    if (!p.climb && stairAt(p.f, p.x) === s) {
      const a = .55 + .35 * Math.sin(R.t * 5), cx = (s.x0 + s.x1) / 2, y = FY(p.f);
      c.fillStyle = rgba('#53f0d6', a); c.font = '700 22px system-ui'; c.textAlign = 'center';
      if (p.f < s.f1) c.fillText('▲', cx, y - CEIL + 96);
      if (p.f > s.f0) c.fillText('▼', cx, y - 26);
    }
  }
}

/* ---------- 家具 ---------- */
function drawProp(c, p) {
  const y = FY(p.f), sh = p.shake > 0 ? Math.sin(R.t * 70) * 1.5 : 0;
  p.shake = Math.max(0, p.shake - .016);
  c.save(); c.translate(p.x + sh, y);
  const op = p.open;
  switch (p.t) {
    case 'tvwall': {
      c.fillStyle = '#14161c'; c.fillRect(-58, -170, 116, 78);
      for (let i = 0; i < 4; i++) { const x = -54 + (i % 2) * 56, yy = -166 + Math.floor(i / 2) * 37; c.fillStyle = '#0c2a2a'; c.fillRect(x, yy, 52, 33); c.fillStyle = rgba('#9fffe9', .25 + .15 * Math.sin(R.t * 3 + i)); for (let k = 0; k < 4; k++) c.fillRect(x, yy + ((R.t * 30 + k * 9 + i * 7) % 33), 52, 1.5); if (i === 2) { const cx = x + ((R.t * 8) % 52); c.fillStyle = '#081010'; c.fillRect(cx, yy + 22, 7, 4); c.fillRect(cx + 5, yy + 20, 2, 3); } }
      c.fillStyle = '#c8b46a'; c.font = '600 7px system-ui'; c.textAlign = 'center'; c.fillText('CH 3', -28, -128);
      break;
    }
    case 'gdesk': {
      c.fillStyle = '#2a2d36'; c.fillRect(-48, -38, 96, 8); c.fillStyle = '#1c1e26'; c.fillRect(-44, -30, 88, 30);
      c.fillStyle = '#3a3e4a'; c.fillRect(-40, -26, 36, 22); c.fillRect(4, -26 + op * -4, 36, 22);
      c.fillStyle = '#c0c4d0'; c.fillRect(-36, -58, 26, 20); c.fillStyle = '#0e2a2a'; c.fillRect(-34, -56, 22, 15);
      c.fillStyle = '#8a3a2a'; c.fillRect(14, -52, 9, 14); c.fillStyle = '#e8e2d0'; c.fillRect(26, -42, 18, 4);
      break;
    }
    case 'locker': case 'medcab': {
      const med = p.t === 'medcab', H = med ? 120 : 112;
      c.fillStyle = med ? '#dfe4e8' : '#4a5468'; c.fillRect(-20, -H, 40, H);
      c.fillStyle = med ? '#b8c2c8' : '#3a4256'; c.fillRect(-18, -H + 3, 36, H - 6);
      if (med) { c.fillStyle = 'rgba(160,220,255,.35)'; c.fillRect(-15, -H + 8, 30, 50); for (let i = 0; i < 3; i++) { c.fillStyle = '#7a8a90'; c.fillRect(-15, -H + 24 + i * 16, 30, 2); c.fillStyle = ['#e6a0a0', '#9fd4c4', '#f0d48a'][i]; c.fillRect(-12 + i * 8, -H + 14 + i * 16, 6, 9); } c.fillStyle = '#ff4d5e'; c.fillRect(-3, -H + 70, 6, 16); c.fillRect(-8, -H + 75, 16, 6); }
      else { for (let i = 0; i < 4; i++) { c.fillStyle = '#2a3040'; c.fillRect(-10, -H + 14 + i * 5, 20, 2); } c.fillStyle = '#c8b46a'; c.fillRect(10, -H / 2, 3, 10); }
      if (op) { c.fillStyle = med ? 'rgba(255,255,255,.5)' : '#5a6478'; c.beginPath(); c.moveTo(20, -H); c.lineTo(30, -H + 6); c.lineTo(30, -6); c.lineTo(20, 0); c.fill(); }
      break;
    }
    case 'counter': case 'ccounter': {
      const cl = p.t === 'ccounter';
      c.fillStyle = cl ? '#d8e2de' : '#e8e4da'; c.fillRect(-62, -62, 124, 8);
      c.fillStyle = cl ? '#7a9a90' : '#3a3442'; c.fillRect(-58, -54, 116, 54);
      c.fillStyle = cl ? '#5a7a70' : '#c8a25a'; c.fillRect(-58, -30, 116, 3);
      c.fillStyle = '#20222a'; c.fillRect(-30, -86, 30, 22); c.fillStyle = '#16302e'; c.fillRect(-28, -84, 26, 17);
      if (!cl) { c.fillStyle = '#c8a25a'; c.beginPath(); c.arc(30, -66, 6, Math.PI, 0); c.fill(); c.fillRect(24, -66, 12, 2); }
      else { c.fillStyle = '#f2f4f6'; c.fillRect(18, -82, 28, 18); c.fillStyle = '#ff4d5e'; c.fillRect(30, -78, 4, 10); c.fillRect(27, -75, 10, 4); }
      break;
    }
    case 'plant': {
      c.fillStyle = '#5a3a24'; c.beginPath(); c.moveTo(-14, -26); c.lineTo(14, -26); c.lineTo(10, 0); c.lineTo(-10, 0); c.fill();
      for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i - 3.5) * .32 + Math.sin(R.t * 1.2 + i) * .04; c.strokeStyle = i % 2 ? '#2f6a44' : '#3f8a58'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -24); c.quadraticCurveTo(Math.cos(a) * 20, -24 + Math.sin(a) * 30, Math.cos(a) * 30, -24 + Math.sin(a) * 52); c.stroke(); }
      break;
    }
    case 'revolving': {
      const cr = W.L.cracks.find(o => o.f === p.f && o.x === p.x), act = cr && cr.active;
      c.fillStyle = '#20232e'; c.fillRect(-62, -176, 124, 176);
      c.fillStyle = act ? rgba('#3a0a2a', .9) : '#0a0d24'; c.fillRect(-56, -168, 112, 168);
      for (let i = 0; i < 3; i++) { const a = R.t * .6 + i * TAU / 3, x = Math.cos(a) * 52; c.strokeStyle = rgba('#a8d6e6', .35 + .25 * Math.sin(a)); c.lineWidth = 3; c.beginPath(); c.moveTo(x, -164); c.lineTo(x, -4); c.stroke(); }
      c.strokeStyle = '#3a3e4e'; c.lineWidth = 6; c.strokeRect(-56, -168, 112, 168);
      c.fillStyle = '#c8a25a'; c.font = '700 9px system-ui'; c.textAlign = 'center'; c.fillText('ENTRANCE', 0, -182);
      break;
    }
    case 'sofa': {
      c.fillStyle = '#3a2a3a'; rr(c, -56, -46, 112, 30, 8); c.fill(); c.fillStyle = '#4a3448'; rr(c, -60, -26, 120, 22, 6); c.fill();
      c.fillStyle = '#2a1c2a'; c.fillRect(-56, -4, 6, 4); c.fillRect(50, -4, 6, 4);
      c.fillStyle = '#c8b46a'; c.fillRect(-20, -38, 18, 12);
      break;
    }
    case 'shelf': {
      c.fillStyle = '#5a4430'; c.fillRect(-56, -136, 112, 136);
      for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { c.fillStyle = '#3a2c1e'; c.fillRect(-52 + i * 21, -132 + j * 26, 19, 23); if (hash2(i, j) < .6) { c.fillStyle = hash2(i + 5, j) < .5 ? '#e8e2d0' : '#d4c8a8'; c.fillRect(-49 + i * 21, -124 + j * 26 - (op && hash2(i, j) < .3 ? 4 : 0), 13, 13); } }
      break;
    }
    case 'parcels': {
      const bx = [[-44, -30, 40, 30], [-2, -36, 46, 36], [-34, -56, 34, 26], [8, -62, 30, 26]];
      bx.forEach(([x, yy, w, h], i) => { c.fillStyle = i % 2 ? '#a07a4a' : '#8a6438'; c.fillRect(x, yy, w, h); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x + w / 2 - 3, yy, 6, h); c.fillStyle = '#e8e2d0'; c.fillRect(x + 4, yy + 4, 12, 8); });
      break;
    }
    case 'cooler': {
      c.fillStyle = '#d8dce4'; c.fillRect(-14, -54, 28, 54); c.fillStyle = 'rgba(120,190,255,.7)'; rr(c, -11, -86, 22, 32, 6); c.fill(); c.fillStyle = '#5a6070'; c.fillRect(-4, -40, 8, 4);
      break;
    }
    case 'table': {
      c.fillStyle = '#5a3e2a'; c.fillRect(-84, -40, 168, 8); c.fillStyle = '#3a2818'; c.fillRect(-76, -32, 8, 32); c.fillRect(68, -32, 8, 32);
      for (let i = 0; i < 3; i++) { const x = -60 + i * 60; c.fillStyle = '#20232e'; c.fillRect(x - 10, -60, 20, 26); c.fillRect(x - 12, -36, 24, 6); }
      c.fillStyle = '#e8e2d0'; c.fillRect(-40, -44, 22, 4); c.fillRect(10, -44, 18, 4);
      break;
    }
    case 'projector': {
      c.fillStyle = '#2a2d36'; c.fillRect(-24, -66, 48, 66); c.fillStyle = '#3a3e4a'; c.fillRect(-20, -60 + (op ? -3 : 0), 40, 24); c.fillStyle = '#c0c4d0'; c.fillRect(-14, -80, 28, 14); c.fillStyle = '#9fd4ff'; c.beginPath(); c.arc(-14, -73, 4, 0, TAU); c.fill();
      break;
    }
    case 'desk': {
      c.fillStyle = '#c8ccd6'; c.fillRect(-46, -40, 92, 6); c.fillStyle = '#7a8090'; c.fillRect(-42, -34, 6, 34); c.fillRect(36, -34, 6, 34); c.fillStyle = '#5a6070'; c.fillRect(8, -34, 28, 30 + (op ? 0 : 0)); if (op) { c.fillStyle = '#6a7080'; c.fillRect(8, -28, 34, 8); }
      c.fillStyle = '#1a1c24'; c.fillRect(-22, -76, 40, 28); c.fillStyle = rgba('#3a6aa0', .9); c.fillRect(-20, -74, 36, 23); c.fillStyle = '#2a2d36'; c.fillRect(-4, -48, 6, 8);
      c.fillStyle = '#e8e2d0'; c.fillRect(24, -50, 9, 10); c.fillStyle = '#20232e'; c.fillRect(-56, -54, 18, 24); c.fillRect(-58, -30, 22, 5);
      break;
    }
    case 'copier': {
      c.fillStyle = '#d8dce4'; c.fillRect(-30, -58, 60, 58); c.fillStyle = '#9aa0b0'; c.fillRect(-30, -64, 60, 6); c.fillStyle = '#3a4050'; c.fillRect(-24, -40, 48, 3); c.fillRect(-24, -26, 48, 3); c.fillStyle = '#53f0d6'; c.fillRect(18, -54, 6, 3);
      break;
    }
    case 'bossdesk': {
      c.fillStyle = '#6a4a2a'; c.fillRect(-66, -46, 132, 10); c.fillStyle = '#4a321c'; c.fillRect(-62, -36, 124, 36); c.fillStyle = '#5a3e24'; c.fillRect(-56, -30, 50, 24); c.fillRect(6, -30 + (op ? -3 : 0), 50, 24);
      c.fillStyle = '#c8a25a'; c.fillRect(-14, -54, 28, 8); c.fillStyle = '#2a2018'; c.fillRect(30, -78, 3, 30); c.fillStyle = '#e8d090'; c.beginPath(); c.moveTo(22, -80); c.lineTo(42, -80); c.lineTo(36, -92); c.lineTo(28, -92); c.fill();
      break;
    }
    case 'safe': {
      c.fillStyle = '#3a3e4a'; c.fillRect(-26, -68, 52, 68); c.fillStyle = '#4a4e5c'; c.fillRect(-22, -64, 44, 60);
      c.fillStyle = '#c8b46a'; c.beginPath(); c.arc(0, -36, 9, 0, TAU); c.fill(); c.strokeStyle = '#2a2a30'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -36); c.lineTo(Math.cos(R.t * .5) * 7, -36 + Math.sin(R.t * .5) * 7); c.stroke();
      if (op) { c.fillStyle = '#2a2d36'; c.beginPath(); c.moveTo(26, -68); c.lineTo(40, -62); c.lineTo(40, -6); c.lineTo(26, 0); c.fill(); }
      break;
    }
    case 'chairs': {
      for (let i = 0; i < 4; i++) { const x = -54 + i * 36; c.fillStyle = '#5a8a7e'; c.fillRect(x - 13, -40, 26, 6); c.fillRect(x - 13, -60, 6, 22); c.fillStyle = '#3a5a52'; c.fillRect(x - 2, -34, 4, 34); }
      break;
    }
    case 'magazine': {
      c.fillStyle = '#6a7a74'; c.fillRect(-22, -92, 44, 92); for (let i = 0; i < 4; i++) { c.fillStyle = '#4a5a54'; c.fillRect(-20, -88 + i * 22, 40, 3); c.fillStyle = ['#e6a0a0', '#9fd4ff', '#f0d48a', '#c9b6ff'][i]; c.fillRect(-16, -84 + i * 22 - (op && i === 2 ? 4 : 0), 30, 17); }
      break;
    }
    case 'bed': {
      c.fillStyle = '#c8ccd6'; c.fillRect(-60, -44, 120, 8); c.fillStyle = '#e8ecf2'; c.fillRect(-58, -52, 116, 9); c.fillStyle = '#f8fafc'; rr(c, -56, -62, 34, 12, 5); c.fill();
      c.fillStyle = '#7a8090'; c.fillRect(-56, -36, 5, 36); c.fillRect(51, -36, 5, 36);
      break;
    }
    case 'curtain': {
      c.fillStyle = '#8a9096'; c.fillRect(-50, -190, 100, 3);
      c.fillStyle = rgba('#a8d6c8', .55); c.beginPath(); c.moveTo(-46, -187); for (let i = 0; i <= 8; i++) c.lineTo(-46 + i * 11, -187 + (i % 2) * 3); c.lineTo(42, -8 + Math.sin(R.t) * 2); for (let i = 8; i >= 0; i--) c.lineTo(-46 + i * 11, -8 + (i % 2 ? 4 : 0)); c.closePath(); c.fill();
      c.strokeStyle = rgba('#5a8a7e', .5); c.lineWidth = 1; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(-40 + i * 11, -184); c.lineTo(-40 + i * 11, -10); c.stroke(); }
      break;
    }
    case 'pshelf': {
      c.fillStyle = '#e8ece8'; c.fillRect(-52, -140, 104, 140);
      for (let j = 0; j < 4; j++) { c.fillStyle = '#b8c0bc'; c.fillRect(-50, -104 + j * 34, 100, 3); for (let i = 0; i < 8; i++) { c.fillStyle = ['#e6a0a0', '#9fd4c4', '#f0d48a', '#c9b6ff', '#ffffff'][(i + j) % 5]; c.fillRect(-46 + i * 12, -128 + j * 34 - (op && (i + j) % 3 === 0 ? 3 : 0), 9, 22); } }
      break;
    }
    case 'tank': {
      c.fillStyle = '#2a2d3a'; for (const x of [-46, 40]) c.fillRect(x, -60, 6, 60);
      c.fillStyle = '#4a5068'; rr(c, -58, -158, 116, 100, 14); c.fill(); c.fillStyle = '#3a3e54'; for (let i = 0; i < 4; i++) c.fillRect(-58, -144 + i * 24, 116, 3);
      c.fillStyle = '#c8b46a'; c.font = '700 10px system-ui'; c.textAlign = 'center'; c.fillText('水塔', 0, -100);
      break;
    }
    case 'crates': {
      [[-40, -40, 40, 40], [2, -34, 36, 34], [-24, -70, 34, 30]].forEach(([x, yy, w, h], i) => { c.fillStyle = i % 2 ? '#5a4a34' : '#6a5638'; c.fillRect(x, yy, w, h); c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 2; c.strokeRect(x + 2, yy + 2, w - 4, h - 4); c.beginPath(); c.moveTo(x + 2, yy + 2); c.lineTo(x + w - 2, yy + h - 2); c.stroke(); });
      break;
    }
    case 'antenna': {
      c.strokeStyle = '#3a3e4e'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -230); c.stroke();
      c.lineWidth = 2; for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(-16 + i * 2, -230 + i * 40); c.lineTo(16 - i * 2, -230 + i * 40); c.stroke(); }
      break;
    }
    case 'bell': {
      const ex = W.extract, swing = ex ? Math.sin(R.t * 6) * .35 : Math.sin(R.t * .8) * .04;
      c.fillStyle = '#2a2d3a'; c.fillRect(-46, -170, 8, 170); c.fillRect(38, -170, 8, 170); c.fillRect(-50, -176, 100, 10);
      c.save(); c.translate(0, -166); c.rotate(swing);
      const g = c.createLinearGradient(-30, 0, 30, 0); g.addColorStop(0, '#7a5a22'); g.addColorStop(.45, '#f3d488'); g.addColorStop(1, '#8a6428'); c.fillStyle = g;
      c.beginPath(); c.moveTo(-10, 6); c.quadraticCurveTo(-14, 36, -32, 70); c.lineTo(32, 70); c.quadraticCurveTo(14, 36, 10, 6); c.closePath(); c.fill();
      c.fillStyle = '#5a4018'; c.fillRect(-34, 68, 68, 6); c.fillStyle = '#3a2a10'; c.beginPath(); c.arc(0, 80, 6, 0, TAU); c.fill();
      c.restore();
      if (W.bellSeal) { c.strokeStyle = rgba('#ff4d5e', .7 + .3 * Math.sin(R.t * 6)); c.lineWidth = 3; c.beginPath(); c.moveTo(-46, -150); c.lineTo(46, -60); c.moveTo(46, -150); c.lineTo(-46, -60); c.stroke(); }
      c.fillStyle = 'rgba(216,180,106,.9)'; c.font = '700 12px "Noto Serif TC",serif'; c.textAlign = 'center'; c.fillText(W.bellSeal ? '鐘被封住了' : W.extract ? '' : '撤離・敲鐘', 0, -190);
      break;
    }
  }
  c.restore();
}

/* ---------- 裂縫、門 ---------- */
function drawCracks(c) {
  for (const cr of W.L.cracks) {
    const y = FY(cr.f), a = cr.active ? .55 + .35 * Math.sin(R.t * 3 + cr.x) + cr.pulse : .14;
    c.save(); c.translate(cr.x, y);
    c.strokeStyle = rgba(cr.active ? '#ff5aa0' : '#8a7aa8', Math.min(1, a)); c.lineWidth = cr.active ? 2.6 : 1.4;
    for (let k = 0; k < 3; k++) { c.beginPath(); let x = (k - 1) * 14, yy = -10; c.moveTo(x, yy); for (let i = 0; i < 7; i++) { x += (hash2(k, i + cr.f * 9) - .5) * 26; yy -= 24; c.lineTo(x, yy); } c.stroke(); }
    c.restore();
  }
}
function drawDoors(c) {
  for (const d of W.L.doors) {
    const y = FY(d.f), D = DOORS[d.type];
    if (d.wall) { c.fillStyle = '#151722'; c.fillRect(d.x - 10, y - CEIL, 20, CEIL); c.fillStyle = '#232634'; c.fillRect(d.x - 10, y - CEIL, 3, CEIL); continue; }
    // 門框
    c.fillStyle = '#151722'; c.fillRect(d.x - 10, y - CEIL, 20, CEIL - 186); c.fillStyle = '#2a2d3a'; c.fillRect(d.x - 12, y - 190, 24, 6);
    c.fillStyle = '#151722'; c.fillRect(d.x - 12, y - 186, 4, 186); c.fillRect(d.x + 8, y - 186, 4, 186);
    if (d.broken) {
      c.save(); c.translate(d.x, y - 186); c.rotate(.5); c.fillStyle = shade(D.c, -.3); c.fillRect(-3, 0, 8, 70); c.restore();
      c.fillStyle = shade(D.c, -.2); c.fillRect(d.x - 4, y - 24, 8, 24);
      continue;
    }
    const sh = d.shake > 0 ? Math.sin(R.t * 80) * 2 : 0, op = d.open;
    c.save(); c.translate(d.x + sh, y);
    const k = d.hp / d.max;
    if (op > .02 && !d.lock) { c.fillStyle = shade(D.c, -.25); c.beginPath(); c.moveTo(-5, -184); c.lineTo(-5 + op * 34, -178); c.lineTo(-5 + op * 34, -6); c.lineTo(-5, 0); c.fill(); }
    else {
      c.fillStyle = D.c; c.fillRect(-6, -184, 12, 184);
      if (d.type === 'glass') { c.fillStyle = rgba(D.c2, .5); c.fillRect(-4, -170, 8, 120); }
      else { c.fillStyle = D.c2; c.fillRect(-4, -150, 8, 3); c.fillRect(-4, -60, 8, 3); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(-2, -128, 4, 26); }
      c.fillStyle = '#c8b46a'; c.fillRect(3, -96, 3, 8);
      // 裂痕
      if (k < .7) { c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-5, -150); c.lineTo(2, -120); c.lineTo(-3, -95); if (k < .4) { c.moveTo(5, -70); c.lineTo(-2, -40); c.lineTo(4, -20); } c.stroke(); }
      if (d.lock) {
        c.strokeStyle = '#8a7a5a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-14, -130); c.lineTo(14, -70); c.moveTo(14, -130); c.lineTo(-14, -70); c.stroke();
        c.fillStyle = d.lock.boss ? '#ff4d5e' : '#d8b46a'; rr(c, -9, -108, 18, 16, 3); c.fill(); c.strokeStyle = c.fillStyle; c.lineWidth = 2.6; c.beginPath(); c.arc(0, -108, 6, Math.PI, 0); c.stroke();
      }
    }
    c.restore();
  }
}
function drawPools(c) {
  for (const o of W.pools) {
    const y = FY(o.f), a = Math.min(1, o.t / .4) * .9;
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) { const x = o.x + (i - 3) * o.w / 7, h = 18 + 14 * Math.sin(R.t * 9 + i * 1.7); c.drawImage(glow('#ff8a3a'), x - 22, y - h - 18, 44, h + 30); }
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = rgba('#ffb45a', a * .5); c.fillRect(o.x - o.w / 2, y - 4, o.w, 4);
  }
}

/* ---------- 角色 ---------- */
function drawActors(c) {
  const p = W.players[0];
  for (const v of W.survivors) drawSurvivor(c, v);
  const list = W.foes.filter(e => !e.dead).sort((a, b) => a.lane - b.lane);
  for (const e of list) {
    e.state = e.aggro ? 'alert' : 'idle';
    c.save();
    if (!e.climb) { c.beginPath(); c.rect(e.x - 160, FY(e.f) - CEIL - 40, 320, CEIL + 42); c.clip(); }
    c.translate(0, e.lane * .5); drawFoe(c, e); c.restore();
    if (e.elite || e.brute) drawFoeBar(c, e);
  }
  if (W.boss && !W.boss.dead) drawBoss(c, W.boss);
  if (p.state === 'alive' || W.out) drawPlayer(c, p);
  // 紙飛機
  for (const pl of W.planes) { c.save(); c.translate(pl.x, pl.y); c.rotate(pl.st === 'dive' ? Math.atan2((pl.tgt ? pl.tgt.y : pl.y) - pl.y, (pl.tgt ? pl.tgt.x : pl.x) - pl.x) : Math.sin(R.t * 3 + pl.a) * .3); c.fillStyle = '#f4f1e6'; c.beginPath(); c.moveTo(12, 0); c.lineTo(-9, -6); c.lineTo(-5, 0); c.lineTo(-9, 6); c.closePath(); c.fill(); c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.moveTo(12, 0); c.lineTo(-5, 0); c.lineTo(-9, 6); c.fill(); c.restore(); }
}
function drawFoeBar(c, e) {
  const w = e.elite && !e.brute ? 60 : 44, y = e.y - e.h - 22;
  c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(e.x - w / 2, y, w, 5); c.fillStyle = e.brute ? '#e8a04a' : '#ff4d5e'; c.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.hpMax), 5);
  if (e.elite && !e.brute) { c.fillStyle = '#ffd0d4'; c.font = '600 11px "Noto Serif TC",serif'; c.textAlign = 'center'; c.fillText(SV_FOES[e.type].n, e.x, y - 5); }
}
function drawSurvivor(c, v) {
  if (v.state === 'gone') return;
  const t = v.anim, mv = v.moving, s = mv ? Math.sin(v.walk * Math.PI) : 0, waiting = v.state === 'wait';
  c.save(); c.translate(v.x, v.y); c.scale(v.face, 1);
  c.globalAlpha = waiting ? .92 : .8;
  shadowAt(c, 0, 0, 14, 4, .35);
  if (v.kind === 'cat') {
    const b = mv ? Math.abs(Math.sin(v.walk * Math.PI)) * 2 : 0;
    c.fillStyle = '#0c0c12'; ell(c, 0, -12 - b, 16, 8); c.fill(); ell(c, 14, -20 - b, 7, 6.5); c.fill();
    c.beginPath(); c.moveTo(10, -25 - b); c.lineTo(12, -32 - b); c.lineTo(15, -25 - b); c.moveTo(16, -25 - b); c.lineTo(19, -31 - b); c.lineTo(20, -24 - b); c.fill();
    c.strokeStyle = '#0c0c12'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-15, -14 - b); c.quadraticCurveTo(-26, -20, -22 + Math.sin(t * 3) * 3, -32); c.stroke();
    for (let i = 0; i < 4; i++) limb(c, -9 + i * 6, -6 - b, -9 + i * 6 + (mv ? Math.sin(v.walk * Math.PI + i) * 3 : 0), 0, 2.6, '#0c0c12');
    c.fillStyle = '#ffd84a'; ell(c, 15, -21 - b, 1.5, 1.8); c.fill(); ell(c, 19, -21 - b, 1.5, 1.8); c.fill();
  } else {
    const fem = v.kind === 'ajuan', sit = waiting && v.kind === 'boy';
    if (sit) { c.fillStyle = '#20232e'; c.fillRect(-12, -30, 24, 6); c.fillRect(-12, -30, 4, 30); }
    const hip = sit ? -30 : -26;
    limb(c, -3, hip, sit ? 12 : -3 + s * 6, sit ? -28 : -2, 5, fem ? '#5a4a5a' : '#2a2d3a'); limb(c, 3, hip, sit ? 14 : 3 - s * 6, sit ? -2 : -2, 5, fem ? '#5a4a5a' : '#2a2d3a');
    if (sit) limb(c, 13, -28, 14, -2, 5, '#2a2d3a');
    c.fillStyle = fem ? '#a8786a' : '#e8ecf2';
    c.beginPath(); c.moveTo(-9, hip - 24); c.lineTo(9, hip - 24); c.lineTo(fem ? 12 : 9, hip + 2); c.lineTo(fem ? -12 : -9, hip + 2); c.closePath(); c.fill();
    if (!fem) { c.fillStyle = '#3a5aa0'; c.beginPath(); c.moveTo(-1.5, hip - 22); c.lineTo(1.5, hip - 22); c.lineTo(2.5, hip - 6); c.lineTo(0, hip - 3); c.lineTo(-2.5, hip - 6); c.fill(); }
    else { c.fillStyle = '#7a5048'; c.fillRect(-9, hip - 24, 4, 26); c.fillRect(5, hip - 24, 4, 26); }
    const hy = hip - 33 + (sit ? 4 : 0);
    c.fillStyle = '#e8d1bf'; ell(c, 1, hy, 6.8, 7.6); c.fill();
    c.fillStyle = fem ? '#3a2a24' : '#14151c';
    if (fem) { ell(c, 0, hy - 3, 8.5, 7); c.fill(); ell(c, -5, hy + 1, 4.5, 5); c.fill(); } else { c.beginPath(); c.arc(1, hy - 2, 7.4, Math.PI, TAU); c.fill(); }
    if (!fem) { c.strokeStyle = '#222'; c.lineWidth = 1; c.strokeRect(2, hy - 2, 4, 3); }
    if (sit) { c.save(); c.translate(1, hy); c.restore(); }
    // 手
    if (fem) { limb(c, 6, hip - 20, 12, hip - 4, 4, '#a8786a'); c.fillStyle = '#d8c09a'; rr(c, 8, hip - 4, 16, 12, 3); c.fill(); c.fillStyle = '#c8344a'; c.fillRect(8, hip - 4, 16, 4); }
    else { limb(c, 6, hip - 20, sit ? 10 : 8 + s * 3, hip - 4, 4, '#e8ecf2'); c.fillStyle = '#3a2a1a'; c.fillRect(-14, hip - 12, 8, 12); }
  }
  c.restore();
  if (waiting) {
    // 等待救援的提示
    const a = .6 + .3 * Math.sin(R.t * 4);
    c.fillStyle = rgba('#ffd0e0', a); c.font = '600 12px "Noto Serif TC",serif'; c.textAlign = 'center'; c.fillText(v.n, v.x, v.y - (v.kind === 'cat' ? 44 : 78));
    if (v.prog > 0) { c.strokeStyle = '#ffd0e0'; c.lineWidth = 3; c.beginPath(); c.arc(v.x, v.y - (v.kind === 'cat' ? 60 : 96), 11, -Math.PI / 2, -Math.PI / 2 + TAU * v.prog); c.stroke(); }
  }
}

/* ---------- 掉落物 ---------- */
function drawPicks(c, over) {
  for (const k of W.picks) {
    if (k.k === 'mem') {
      const col = RAR[k.item.rar].c, gl = RAR[k.item.rar].glow;
      if (!over) {
        if (k.land) { const bh = 90 + 70 * gl, a = .22 + .1 * Math.sin(R.t * 3 + k.x); const g = c.createLinearGradient(0, k.y - bh, 0, k.y); g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, a)); c.fillStyle = g; c.fillRect(k.x - 8, k.y - bh, 16, bh); }
        continue;
      }
      const yy = k.y - 14 + (k.land ? Math.sin(R.t * 2.6 + k.x) * 3 : 0);
      c.globalCompositeOperation = 'lighter'; c.drawImage(glow(col), k.x - 26, yy - 26, 52, 52); c.globalCompositeOperation = 'source-over';
      const g = c.createRadialGradient(k.x - 3, yy - 3, 1, k.x, yy, 9); g.addColorStop(0, '#fff'); g.addColorStop(.5, mixHex(col, '#ffffff', .3)); g.addColorStop(1, shade(col, -.3)); c.fillStyle = g; c.beginPath(); c.arc(k.x, yy, 8, 0, TAU); c.fill();
    } else if (over) {
      const coin = k.k === 'coin';
      if (coin) { c.fillStyle = '#ffd27a'; c.beginPath(); c.ellipse(k.x, k.y, 4.5 * Math.abs(Math.cos(R.t * 5 + k.x)) + 1, 4.5, 0, 0, TAU); c.fill(); }
      else { c.globalCompositeOperation = 'lighter'; c.drawImage(glow('#53f0d6'), k.x - 9, k.y - 9, 18, 18); c.globalCompositeOperation = 'source-over'; }
    }
  }
}

/* ---------- 光 ---------- */
function drawLight() {
  const l = R.lctx, s = R.ls;
  l.setTransform(1, 0, 0, 1, 0, 0);
  l.globalCompositeOperation = 'source-over';
  l.fillStyle = W.lvl >= 3 ? '#1c1632' : '#181c36'; l.fillRect(0, 0, R.lcv.width, R.lcv.height);
  worldTf(l, s);
  l.globalCompositeOperation = 'lighter';
  // 走過的房間：保留一點底光，看得清楚
  l.fillStyle = W.lvl >= 3 ? 'rgba(78,58,92,.55)' : 'rgba(64,72,110,.55)';
  for (const r of W.L.rooms) if (r.seen && r.style !== 'roof') l.fillRect(r.x0, FY(r.f) - CEIL, r.x1 - r.x0, CEIL);
  const p = W.players[0], F3 = W.L.floors[3];
  // 天台的月光
  l.globalAlpha = .55; l.drawImage(glow('#8aa0ff'), F3.x0 - 300, FY(3) - 700, F3.x1 + 600, 900); l.globalAlpha = 1;
  // 外面的天空
  l.globalAlpha = .5; l.drawImage(glow('#6a78c0'), -900, FY(3) - 500, 900, 1400); l.drawImage(glow('#6a78c0'), 1350, FY(3) - 500, 900, 1400); l.globalAlpha = 1;
  // 每間房的燈
  for (const r of W.L.rooms) {
    if (r.style === 'roof') continue;
    const y = FY(r.f);
    for (const lx of r.lamps) {
      const fl = r.f === 1 && lx === 760 ? (Math.sin(R.t * 23) > .3 ? 1 : .25) : .85 + .15 * Math.sin(R.t * 7 + lx);
      l.save(); l.beginPath(); l.rect(r.x0, y - CEIL, r.x1 - r.x0, CEIL); l.clip();
      l.globalAlpha = .7 * fl; l.drawImage(glow('#cfe6ff'), lx - 250, y - CEIL - 70, 500, CEIL + 190);
      l.restore();
    }
    if (r.style === 'stair') { l.globalAlpha = .35; l.drawImage(glow('#7fe0a8'), (r.x0 + r.x1) / 2 - 80, y - CEIL - 40, 160, 160); }
    l.globalAlpha = 1;
  }
  for (const bx of [300, 760, 1120]) { l.globalAlpha = (bx === 760 ? (Math.sin(R.t * 17) > .6 ? .1 : .32) : .3); l.drawImage(glow('#9fb4e0'), bx - 160, 48, 320, 220); }
  l.globalAlpha = 1;
  for (const s0 of W.L.stairs) { l.globalAlpha = .28; l.drawImage(glow('#9aa8d0'), s0.x0 - 40, FY(s0.f1) - CEIL, s0.x1 - s0.x0 + 80, FY(s0.f0) - FY(s0.f1) + CEIL); l.globalAlpha = 1; }
  // 夢燈
  if (p.state === 'alive') {
    const r = p.climb ? null : roomAt(p.f, p.x), ly = p.y - 40;
    l.save();
    if (r) { l.beginPath(); l.rect(r.x0 - 10, FY(r.f) - CEIL, r.x1 - r.x0 + 20, CEIL + 10); l.clip(); }
    l.globalAlpha = .95; l.drawImage(glow('#ffcf8a'), p.x - 330, ly - 300, 660, 600);
    l.restore();
    l.globalAlpha = .8; l.drawImage(glow('#ffe0b0'), p.x - 90, ly - 90, 180, 180); l.globalAlpha = 1;
    if (p.wpn.flash > 0) { l.drawImage(glow('#fff2c8'), p.x + p.face * 30 - 70, p.y - 117, 140, 140); }
  }
  // 放大鏡、記憶、火、鐘
  for (const sp of W.L.spots) if (!sp.done) { const col = RING[sp.rings[sp.i]].c; l.globalAlpha = .55; l.drawImage(glow(col), sp.x - 50, FY(sp.f) - 150, 100, 100); }
  l.globalAlpha = 1;
  for (const k of W.picks) if (k.k === 'mem') { const col = RAR[k.item.rar].c; l.drawImage(glow(col), k.x - 60, k.y - 120, 120, 140); }
  for (const o of W.pools) l.drawImage(glow('#ff8a3a'), o.x - o.w, FY(o.f) - 120, o.w * 2, 160);
  const bell = SV_LEVEL.bell; l.globalAlpha = W.extract ? .9 : .45; l.drawImage(glow('#ffd27a'), bell.x - 140, FY(bell.f) - 260, 280, 280); l.globalAlpha = 1;
  for (const cr of W.L.cracks) if (cr.active) { l.globalAlpha = .45 + cr.pulse; l.drawImage(glow('#ff5aa0'), cr.x - 90, FY(cr.f) - 200, 180, 200); l.globalAlpha = 1; }
  for (const v of W.survivors) if (v.state !== 'gone') l.drawImage(glow('#ffd0e0'), v.x - 50, v.y - 110, 100, 120);
  for (const f of W.fx) if (f.k === 'beam') { l.globalAlpha = 1 - f.t / f.life; l.drawImage(glow('#bff6ff'), Math.min(f.x0, f.x1), f.y - 60, Math.abs(f.x1 - f.x0), 120); l.globalAlpha = 1; } else if (f.k === 'bolt') { for (const q of f.pts) l.drawImage(glow('#d4f1ff'), q.x - 50, q.y - 50, 100, 100); }
  if (W.boss) { l.globalAlpha = .7; l.drawImage(glow('#9fffe9'), W.boss.x - 200, W.boss.y - 260, 400, 300); l.globalAlpha = 1; }
  for (const o of W.tele) if (o.k === 'col' && o.t > o.warn) l.drawImage(glow('#d4fff4'), o.x - 80, FY(3) - 260, 160, 280);
  l.globalCompositeOperation = 'source-over';
}
/* 還沒進去過的房間：黑著，只看得到裂縫和眼睛 */
function drawVeils(c) {
  for (const r of W.L.rooms) {
    if (r.seen || r.style === 'roof' || r.style === 'stair') continue;
    const y = FY(r.f);
    c.fillStyle = 'rgba(4,4,10,.9)'; c.fillRect(r.x0, y - CEIL, r.x1 - r.x0, CEIL);
    c.fillStyle = 'rgba(160,150,200,.25)'; c.font = '600 13px "Noto Serif TC",serif'; c.textAlign = 'center'; c.fillText(r.name, (r.x0 + r.x1) / 2, y - CEIL / 2);
  }
}
function drawEmissive(c) {
  c.globalCompositeOperation = 'lighter';
  for (const e of W.foes) {
    if (e.dead || e.spawn > 0) continue;
    const f = Math.cos(e.face) >= 0 ? 1 : -1, ey = e.y - e.h + (e.type === 'ripper' ? 6 : 2) + e.lane * .5, ex = e.x + f * (e.type === 'ripper' ? 10 : 3);
    const col = e.type === 'warden' ? '#ff6a5a' : '#ff3a5a';
    c.globalAlpha = .7; c.drawImage(glow(col), ex - 10, ey - 10, 20, 20);
    if (e.type === 'watcher' && e.aggro) {
      // 手電筒的光錐
      c.globalAlpha = .18 + (W.watchLit > 0 ? .12 : 0); const g = c.createLinearGradient(e.x, 0, e.x + f * 280, 0); g.addColorStop(0, 'rgba(255,240,190,.9)'); g.addColorStop(1, 'rgba(255,240,190,0)'); c.fillStyle = g;
      c.beginPath(); c.moveTo(e.x + f * 14, e.y - 38); c.lineTo(e.x + f * 280, e.y - 100); c.lineTo(e.x + f * 280, e.y); c.closePath(); c.fill();
    }
  }
  c.globalAlpha = 1;
  for (const k of W.ebul) { c.drawImage(glow('#9fd4ff'), k.x - 18, k.y - 18, 36, 36); c.fillStyle = '#e8f8ff'; c.beginPath(); c.arc(k.x, k.y, 4, 0, TAU); c.fill(); }
  for (const b of W.bullets) { c.strokeStyle = b.crit ? 'rgba(255,240,160,.95)' : 'rgba(255,230,190,.9)'; c.lineWidth = b.crit ? 4 : 3; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x - b.vx * .018, b.y - b.vy * .018); c.stroke(); }
  const p = W.players[0];
  if (p.wpn.flash > 0) { const mx = p.x + Math.cos(p.aim) * 30, my = p.y - 47 + Math.sin(p.aim) * 30; c.drawImage(glow('#fff2c8'), mx - 22, my - 22, 44, 44); }
  // 夢燈
  if (p.state === 'alive' && !p.climb) { c.globalAlpha = .7; c.drawImage(glow('#ffcf7a'), p.x - p.face * 7 - 14, p.y - 31 - 14, 28, 28); c.globalAlpha = 1; }
  c.globalCompositeOperation = 'source-over';
}
function drawTele(c) {
  for (const o of W.tele) {
    if (o.k === 'col') {
      const y = FY(3);
      if (o.t < o.warn) { const a = .25 + .25 * Math.sin(R.t * 20); c.fillStyle = rgba('#ff4d5e', a); c.fillRect(o.x - o.w / 2, y - 200, o.w, 200); c.fillStyle = rgba('#ff8a9a', .8); c.font = '700 26px system-ui'; c.textAlign = 'center'; c.fillText(o.dir > 0 ? '→' : '←', o.x + o.dir * 60, y - 100); }
      else { c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(o.x - o.w / 2, 0, o.x + o.w / 2, 0); g.addColorStop(0, 'rgba(160,255,230,0)'); g.addColorStop(.5, 'rgba(220,255,245,.85)'); g.addColorStop(1, 'rgba(160,255,230,0)'); c.fillStyle = g; c.fillRect(o.x - o.w / 2, y - 230, o.w, 230); c.globalCompositeOperation = 'source-over'; }
    } else if (o.k === 'circ' && !o.fired) {
      const y = FY(3) - 3, k = o.t / o.warn;
      c.fillStyle = rgba('#ff4d5e', .18 + .2 * k); c.beginPath(); c.ellipse(o.x, y, o.r, o.r * .28, 0, 0, TAU); c.fill();
      c.strokeStyle = rgba('#ff8a9a', .9); c.lineWidth = 2; c.beginPath(); c.ellipse(o.x, y, o.r * k, o.r * .28 * k, 0, 0, TAU); c.stroke();
    }
  }
}
function drawFxUnder(c) {
  for (const f of W.fx) {
    const k = f.t / f.life;
    if (f.k === 'after') { c.globalAlpha = .3 * (1 - k); c.fillStyle = '#53f0d6'; c.beginPath(); c.ellipse(f.x, f.y - 32, 10, 30, 0, 0, TAU); c.fill(); c.globalAlpha = 1; }
    else if (f.k === 'dissolve') { c.fillStyle = rgba('#141a2c', .7 * (1 - k)); for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(f.x + Math.sin(i * 2.3) * 14 * k * 2, f.y - f.h * (i / 6) - k * 30, 8 * (1 - k), 0, TAU); c.fill(); } }
    else if (f.k === 'heal') { c.fillStyle = rgba('#7affc0', 1 - k); for (let i = 0; i < 5; i++) { const x = f.x + Math.sin(i * 2.1) * 18, y = f.y - 30 - k * 50 - i * 6; c.fillRect(x - 1.5, y - 5, 3, 10); c.fillRect(x - 5, y - 1.5, 10, 3); } }
    else if (f.k === 'shell') { c.fillStyle = rgba('#e0b860', 1 - k); c.fillRect(f.x, f.y, 4, 2); }
  }
}
function drawFxOver(c) {
  for (const f of W.fx) {
    const k = f.t / f.life;
    if (f.k === 'ink') { c.fillStyle = rgba(W.ch.th.foe.body, .8 * (1 - k * k)); c.beginPath(); c.arc(f.x, f.y, f.s * (1 - k * .6), 0, TAU); c.fill(); }
    else if (f.k === 'chip') { c.fillStyle = rgba(f.c, 1 - k); c.fillRect(f.x, f.y, 4, 3); }
    else if (f.k === 'spark') { c.globalCompositeOperation = 'lighter'; c.drawImage(glow(f.c), f.x - 14, f.y - 14, 28, 28); c.globalCompositeOperation = 'source-over'; }
    else if (f.k === 'beam') { c.globalCompositeOperation = 'lighter'; const a = 1 - k; c.fillStyle = rgba('#bff6ff', .9 * a); c.fillRect(Math.min(f.x0, f.x1), f.y - 5 * a, Math.abs(f.x1 - f.x0), 10 * a); c.fillStyle = rgba('#ffffff', a); c.fillRect(Math.min(f.x0, f.x1), f.y - 1.5, Math.abs(f.x1 - f.x0), 3); c.globalCompositeOperation = 'source-over'; }
    else if (f.k === 'bolt') { c.strokeStyle = rgba('#e8fbff', 1 - k); c.lineWidth = 2.4; c.beginPath(); f.pts.forEach((q, i) => { if (!i) c.moveTo(q.x, q.y); else { const pr = f.pts[i - 1]; for (let s = 1; s <= 4; s++) c.lineTo(lerp(pr.x, q.x, s / 4) + (s < 4 ? fx(-8, 8) : 0), lerp(pr.y, q.y, s / 4) + (s < 4 ? fx(-8, 8) : 0)); } }); c.stroke(); }
    else if (f.k === 'bottle' && !f.done) { c.save(); c.translate(f.x, f.y); c.rotate(f.t * 14); c.fillStyle = '#c87a3a'; c.fillRect(-4, -7, 8, 14); c.fillStyle = '#ffd27a'; c.fillRect(-2, -10, 4, 4); c.restore(); }
    else if (f.k === 'wave') { c.strokeStyle = rgba('#ffe39a', .8 * (1 - k)); c.lineWidth = 4 * (1 - k) + 1; c.beginPath(); c.ellipse(f.x, f.y, f.r * easeOut(k), f.r * .5 * easeOut(k), 0, 0, TAU); c.stroke(); }
    else if (f.k === 'slam') { c.strokeStyle = rgba('#ff6a5a', .8 * (1 - k)); c.lineWidth = 4; c.beginPath(); c.ellipse(f.x, f.y - 4, f.r * easeOut(k), 16 * easeOut(k), 0, 0, TAU); c.stroke(); }
    else if (f.k === 'claw') { c.save(); c.translate(f.x, f.y); c.scale(f.f, 1); c.strokeStyle = rgba('#ff6a7a', .9 * (1 - k)); c.lineWidth = 3; const R0 = f.big ? 60 : 24; for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(-8, i * 7, R0, -.7, .7); c.stroke(); } c.restore(); }
    else if (f.k === 'burst') { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - k; c.drawImage(glow(f.c), f.x - 60 - k * 40, f.y - 60 - k * 40, 120 + k * 80, 120 + k * 80); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    else if (f.k === 'ring') { c.strokeStyle = rgba(f.c, 1 - k); c.lineWidth = 3; c.beginPath(); c.arc(f.x, f.y, 10 + k * 40, 0, TAU); c.stroke(); }
    else if (f.k === 'landfx') { c.strokeStyle = rgba(f.c, 1 - k); c.lineWidth = 2; c.beginPath(); c.ellipse(f.x, f.y - 2, 10 + k * 30, 3 + k * 8, 0, 0, TAU); c.stroke(); }
    else if (f.k === 'bellring') { c.strokeStyle = rgba('#ffd27a', 1 - k); c.lineWidth = 3; for (let i = 0; i < 3; i++) { const r = 30 + (k + i * .2) * 160; c.beginPath(); c.arc(f.x, f.y, r, 0, TAU); c.stroke(); } }
    else if (f.k === 'ember') { c.fillStyle = rgba('#ffb060', 1 - k); c.fillRect(f.x, f.y - 20 * k, 2.5, 2.5); }
  }
}
/* 放大鏡圖示：一圈一圈的顏色先看得到 */
function drawSpotsUI(c) {
  const p = W.players[0];
  for (const s of W.L.spots) {
    if (s.done && s.pop <= 0) continue;
    const y = FY(s.f) - (PROP_H[s.prop.t] || 90) - 34, x = s.x, active = p.searching === s;
    const near = s.f === p.f && Math.abs(p.x - s.x) < 220;
    if (!s.room.seen) continue;
    const a = s.done ? s.pop / .45 : near ? 1 : .7;
    c.globalAlpha = a;
    // 放大鏡
    const col = s.done ? '#ffffff' : RING[s.rings[s.i]].c, bob = Math.sin(R.t * 3 + s.id) * 2;
    c.globalCompositeOperation = 'lighter'; c.drawImage(glow(col), x - 26, y - 26 + bob, 52, 52); c.globalCompositeOperation = 'source-over';
    c.fillStyle = 'rgba(10,8,18,.75)'; c.beginPath(); c.arc(x, y + bob, 13, 0, TAU); c.fill();
    c.strokeStyle = col; c.lineWidth = 2.4; c.beginPath(); c.arc(x - 1.5, y - 1.5 + bob, 6, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(x + 3, y + 3 + bob); c.lineTo(x + 7, y + 7 + bob); c.stroke();
    if (active) { c.strokeStyle = col; c.lineWidth = 3.5; c.beginPath(); c.arc(x, y + bob, 17, -Math.PI / 2, -Math.PI / 2 + TAU * s.prog); c.stroke(); }
    // 圈數
    const n = s.rings.length, gap = 11;
    for (let i = 0; i < n; i++) {
      const cx = x + (i - (n - 1) / 2) * gap, cy = y + 22 + bob, rc = RING[s.rings[i]].c;
      c.fillStyle = i < s.i ? 'rgba(255,255,255,.18)' : rc;
      c.beginPath(); c.arc(cx, cy, i === s.i ? 4.6 : 3.4, 0, TAU); c.fill();
      if (i === s.i && !s.done) { c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, 6.4, 0, TAU); c.stroke(); }
    }
    c.globalAlpha = 1;
  }
}
const PROP_H = { gdesk: 70, locker: 112, counter: 90, plant: 80, sofa: 50, shelf: 136, parcels: 62, table: 64, projector: 82, desk: 78, copier: 66, bossdesk: 92, safe: 70, ccounter: 86, magazine: 92, bed: 62, medcab: 120, pshelf: 140, crates: 70 };
function drawDoorUI(c) {
  const p = W.players[0];
  for (const d of W.L.doors) {
    if (d.wall) continue;
    const y = FY(d.f), near = d.f === p.f && Math.abs(p.x - d.x) < 260;
    if (d.lock && !d.lock.boss && (near || d.prog > 0)) {
      const ok = d.lock.coins ? W.coins >= d.lock.coins : W.keys >= 1;
      const s = d.lock.coins ? `${d.lock.coins} 夢幣` : ok ? '用鑰匙開' : '需要鑰匙';
      c.font = '700 13px "Noto Sans TC",system-ui'; c.textAlign = 'center';
      const tw = c.measureText(s).width + 18;
      c.fillStyle = 'rgba(10,8,18,.82)'; rr(c, d.x - tw / 2, y - 222, tw, 22, 11); c.fill();
      c.strokeStyle = ok ? '#ffd27a' : '#ff6a6a'; c.lineWidth = 1.4; rr(c, d.x - tw / 2, y - 222, tw, 22, 11); c.stroke();
      c.fillStyle = ok ? '#ffe6a8' : '#ffb0b0'; c.fillText(s, d.x, y - 206);
      if (d.prog > 0) { c.strokeStyle = '#ffd27a'; c.lineWidth = 4; c.beginPath(); c.arc(d.x, y - 112, 22, -Math.PI / 2, -Math.PI / 2 + TAU * d.prog); c.stroke(); }
    } else if (!d.lock && (d.hp < d.max) && (near || d.hitT > 0)) {
      const w = 40, k = d.hp / d.max;
      c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(d.x - w / 2, y - 212, w, 6);
      c.fillStyle = d.broken ? '#ff4d5e' : k < .35 ? '#ff8a5a' : '#ffd27a'; c.fillRect(d.x - w / 2, y - 212, w * k, 6);
      if (d.broken) { c.fillStyle = '#ff9a9a'; c.font = '700 11px "Noto Sans TC",system-ui'; c.textAlign = 'center'; c.fillText('門破了', d.x, y - 218); }
      if (near && Math.abs(p.x - d.x) < 54 && d.hp < d.max) { c.fillStyle = 'rgba(255,230,160,.9)'; c.font = '600 11px "Noto Sans TC",system-ui'; c.textAlign = 'center'; c.fillText('修門中', d.x, y - 226); }
    }
  }
}
function drawOverlayText(c) {
  const p = W.players[0];
  for (const f of W.fx) {
    const k = f.t / f.life;
    if (f.k === 'num') {
      const a = k < .7 ? 1 : 1 - (k - .7) / .3, sc = (f.crit ? 1 + .6 * Math.max(0, 1 - k * 4) : 1) * (1 + (f.pop || 0) * 2.2) * (f.burn ? .85 : 1);
      c.save(); c.translate(f.x, f.y); c.scale(sc, sc);
      c.font = `900 ${f.crit ? 22 : f.hurt ? 18 : 15}px "Noto Sans TC",system-ui,sans-serif`; c.textAlign = 'center';
      const vs = Math.round(f.v); c.lineWidth = 4; c.strokeStyle = rgba('#000', .85 * a); c.strokeText(vs, 0, 0);
      c.fillStyle = f.hurt ? rgba('#ff6a6a', a) : f.crit ? rgba('#ffe15a', a) : f.burn ? rgba('#ffa860', a) : rgba('#ffffff', a); c.fillText(vs, 0, 0);
      c.restore();
    } else if (f.k === 'label') {
      const a = k < .75 ? 1 : 1 - (k - .75) / .25; c.font = '600 13px "Noto Serif TC",serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = rgba('#000', .8 * a); c.strokeText(f.s, f.x, f.y); c.fillStyle = rgba(f.c, a); c.fillText(f.s, f.x, f.y);
    } else if (f.k === 'roomlbl') {
      const r = f.r, a = k < .15 ? k / .15 : k > .7 ? 1 - (k - .7) / .3 : 1, y = FY(r.f) - CEIL + 40;
      c.font = '600 18px "Noto Serif TC",serif'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = rgba('#000', .7 * a);
      const s = `${W.L.floors[r.f].label}・${r.name}`; c.strokeText(s, (r.x0 + r.x1) / 2, y); c.fillStyle = rgba('#f3ecd8', a); c.fillText(s, (r.x0 + r.x1) / 2, y);
    } else if (f.k === 'bubble') {
      const o = f.o, a = k < .1 ? k / .1 : k > .85 ? 1 - (k - .85) / .15 : 1, y = o.y - (o.kind === 'cat' ? 54 : 92);
      c.font = '600 13px "Noto Sans TC",system-ui'; c.textAlign = 'center';
      const lines = wrapText(c, f.s, 200), lh = 18, bw = Math.max(...lines.map(s => c.measureText(s).width)) + 20, bh = lines.length * lh + 12;
      c.globalAlpha = a; c.fillStyle = 'rgba(12,9,18,.9)'; rr(c, o.x - bw / 2, y - bh, bw, bh, 8); c.fill(); c.strokeStyle = 'rgba(255,208,224,.7)'; c.lineWidth = 1.2; rr(c, o.x - bw / 2, y - bh, bw, bh, 8); c.stroke();
      c.fillStyle = '#f8eef2'; lines.forEach((s, i) => c.fillText(s, o.x, y - bh + 22 + i * lh)); c.globalAlpha = 1;
    }
  }
}
function wrapText(c, s, maxW) {
  const out = []; let cur = '';
  for (const ch of s) { if (c.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; }
  if (cur) out.push(cur); return out;
}
function drawScreenFx(c, w, h) {
  const p = W.players[0];
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.max(w, h) * .75);
  let vc = '#000000', va = .5;
  if (W.lvl >= 2) { vc = '#3a0818'; va = .5 + W.lvl * .05; }
  if (W.extract) { vc = '#3a2a08'; va = .55 + .1 * Math.sin(R.t * 4); }
  g.addColorStop(0, rgba(vc, 0)); g.addColorStop(1, rgba(vc, va)); c.fillStyle = g; c.fillRect(0, 0, w, h);
  if (p.hurt > 0) { const k = p.hurt / .35, gh = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .22, w / 2, h / 2, Math.max(w, h) * .66); gh.addColorStop(0, 'rgba(255,32,48,0)'); gh.addColorStop(.55, rgba('#ff2030', .1 * k)); gh.addColorStop(1, rgba('#ff2030', .62 * k)); c.fillStyle = gh; c.fillRect(0, 0, w, h); }
  if (p.hp < p.hpMax * .3 && p.state === 'alive') { const a = .16 + .1 * Math.sin(R.t * 6); const g2 = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .7); g2.addColorStop(0, 'rgba(255,0,30,0)'); g2.addColorStop(1, rgba('#ff0020', a)); c.fillStyle = g2; c.fillRect(0, 0, w, h); }
}

/* ---------- 小地圖：整棟樓的剖面 ---------- */
function drawMini() {
  const cv = $('#mini'); if (!cv || !W) return;
  const s = 2, w = cv.offsetWidth * s, h = cv.offsetHeight * s; if (!w) return;
  if (cv.width !== w) { cv.width = w; cv.height = h; }
  const g = cv.getContext('2d'); g.clearRect(0, 0, w, h);
  const maxX = 1350, pad = 6 * s, fh = (h - pad * 2) / 4, kx = (w - pad * 2) / maxX;
  const X = x => pad + x * kx, Yf = f => pad + (3 - f) * fh;
  const p = W.players[0];
  for (const F of W.L.floors) {
    for (const r of F.rooms) {
      const x = X(r.x0) + 1, y = Yf(F.i) + 2, ww = (r.x1 - r.x0) * kx - 2, hh = fh - 4;
      g.fillStyle = !r.seen ? 'rgba(255,255,255,.05)' : r.style === 'stair' ? 'rgba(127,224,168,.22)' : 'rgba(200,200,230,.18)';
      g.fillRect(x, y, ww, hh);
      if (r === p.room && !p.climb) { g.strokeStyle = '#53f0d6'; g.lineWidth = 1.5 * s; g.strokeRect(x, y, ww, hh); }
    }
    for (const d of F.doors) if (d.lock) { g.fillStyle = d.lock.boss ? '#ff4d5e' : '#ffd27a'; g.fillRect(X(d.x) - 1.5 * s, Yf(F.i) + fh * .3, 3 * s, fh * .4); } else if (d.broken) { g.fillStyle = '#ff6a6a'; g.fillRect(X(d.x) - 1 * s, Yf(F.i) + fh * .6, 2 * s, fh * .3); }
  }
  for (const cr of W.L.cracks) if (cr.active) { g.fillStyle = '#ff5aa0'; g.fillRect(X(cr.x) - 1.5 * s, Yf(cr.f) + 3 * s, 3 * s, fh - 6 * s); }
  for (const e of W.foes) if (!e.dead) { g.fillStyle = e.elite ? '#ff9a5a' : '#ff4d5e'; g.beginPath(); g.arc(X(e.x), Yf(Math.round(-e.y / FH)) + fh * .65, (e.elite ? 2.4 : 1.4) * s, 0, TAU); g.fill(); }
  for (const v of W.survivors) if (v.state !== 'gone') { g.fillStyle = '#ffd0e0'; g.beginPath(); g.arc(X(v.x), Yf(Math.round(-v.y / FH)) + fh * .5, 2.2 * s, 0, TAU); g.fill(); }
  const b = SV_LEVEL.bell; g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(X(b.x), Yf(b.f) + fh * .45, 3 * s, 0, TAU); g.fill();
  g.fillStyle = '#53f0d6'; g.beginPath(); g.arc(X(p.x), Yf(p.climb ? Math.round(-p.y / FH) : p.f) + fh * .55, 3 * s, 0, TAU); g.fill();
}
