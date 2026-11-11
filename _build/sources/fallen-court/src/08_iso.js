// ============ 斜俯視場景：投影、鏡頭、地塊與物件貼圖、光照、粒子 ============
const TW = 64, TH = 32, LH = 18, SS = 2;
let cv = null, cx = null, VW = 0, VH = 0, DPR = 1, lightCv = null, lightCx = null;
const Cam = { x: 0, y: 0, z: 0, zoom: 1.3, tx: 0, ty: 0, tz: 0, tzoom: 1.3, shake: 0, sx: 0, sy: 0, cy: .5, tcy: .5, free: 0 };
const Gfx = { tiles: [], rows: [], d0: 0, zone: null, lights: [], parts: [], units: [], decals: [], overlay: [], glow: [], cap: 2 };

function initCanvas() {
  cv = $('#cv'); cx = cv.getContext('2d', { alpha: false });
  lightCv = mkCanvas(8, 8); lightCx = lightCv.getContext('2d');
  resize(); addEventListener('resize', resize);
}
function resize() {
  // 畫質：「精細」最高 2 倍、「流暢」1.25 倍；「自動」從 2 倍起跳，真的跑不動才往下降（見 perfWatch）
  DPR = Math.min(window.devicePixelRatio || 1, S.set.gfx === 'hi' ? 2 : S.set.gfx === 'lo' ? 1.25 : Gfx.cap); VW = innerWidth; VH = innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  lightCv.width = Math.ceil(VW / 3); lightCv.height = Math.ceil(VH / 3);
  document.documentElement.classList.toggle('land', VW > VH * 1.15);
  if (typeof onResize === 'function') onResize();
}
const isoX = (x, y) => (x - y) * TW / 2;
const isoY = (x, y, z) => (x + y) * TH / 2 - (z || 0) * LH;
function w2s(x, y, z) { return [(isoX(x, y) - isoX(Cam.x, Cam.y)) * Cam.zoom + VW / 2 + Cam.sx, (isoY(x, y, z) - isoY(Cam.x, Cam.y, Cam.z)) * Cam.zoom + VH * Cam.cy + Cam.sy]; }
function s2w(sx, sy, z) { // 螢幕點 → 世界座標（假設高度 z）
  const px = (sx - VW / 2 - Cam.sx) / Cam.zoom + isoX(Cam.x, Cam.y), py = (sy - VH * Cam.cy - Cam.sy) / Cam.zoom + isoY(Cam.x, Cam.y, Cam.z) + (z || 0) * LH;
  return [py / TH + px / TW, py / TH - px / TW];
}
function camUpdate(dt) {
  const k = 1 - Math.pow(.0015, dt);
  Cam.x += (Cam.tx - Cam.x) * k; Cam.y += (Cam.ty - Cam.y) * k; Cam.z += (Cam.tz - Cam.z) * k; Cam.zoom += (Cam.tzoom - Cam.zoom) * k; Cam.cy += (Cam.tcy - Cam.cy) * k;
  if (Cam.shake > 0) { Cam.shake = Math.max(0, Cam.shake - dt * 30); const a = S.set.shake ? Cam.shake : 0; Cam.sx = (Math.random() * 2 - 1) * a; Cam.sy = (Math.random() * 2 - 1) * a; } else { Cam.sx = Cam.sy = 0; }
}
function camSnap() { Cam.x = Cam.tx; Cam.y = Cam.ty; Cam.z = Cam.tz; Cam.zoom = Cam.tzoom; Cam.cy = Cam.tcy; }
function shake(n) { Cam.shake = Math.max(Cam.shake, n); }

// ---------- 地塊貼圖 ----------
const FLOOR_COL = { s: '#bdb7aa', r: '#7a4a36', d: '#4a4750', w: '#7a6248', m: '#2a6a60', o: '#14151c', g: '#3a4a7a', c: '#34343e' };
const SIDE_COL = { s: '#8e897f', r: '#5a3426', d: '#34323a', w: '#55432f', m: '#2c3a38', o: '#1a1a22', g: '#7f7a72', c: '#22222a' };
const _spr = {};
function sprCanvas(w, h) { const c = mkCanvas(w * SS, h * SS), g = c.getContext('2d'); g.scale(SS, SS); return [c, g]; }
function diamond(g, ox, oy) { g.beginPath(); g.moveTo(ox + TW / 2, oy); g.lineTo(ox + TW, oy + TH / 2); g.lineTo(ox + TW / 2, oy + TH); g.lineTo(ox, oy + TH / 2); g.closePath(); }
// 頂面上的一點：u 沿 +x 邊（往右下）、v 沿 +y 邊（往左下），0～1
const topPt = (u, v) => [TW / 2 + (u - v) * TW / 2, (u + v) * TH / 2];
const TPX = 2, TPY = 1; // 頂面貼圖外擴的邊
const hash2 = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
function tileTop(floor, v, jx, jy, wx, wy) {
  const key = 'T' + floor + (floor === 'g' ? wx + ',' + wy : v) + (jx ? 1 : 0) + (jy ? 1 : 0); if (_spr[key]) return _spr[key];
  const [c, g] = sprCanvas(TW + TPX * 2, TH + TPY * 2), rr = mulberry32(hashStr(key)), base = FLOOR_COL[floor];
  g.translate(TPX, TPY);
  g.save(); g.beginPath(); g.moveTo(TW / 2, -TPY); g.lineTo(TW + TPX, TH / 2); g.lineTo(TW / 2, TH + TPY); g.lineTo(-TPX, TH / 2); g.closePath(); g.clip();
  const line = (u0, v0, u1, v1) => { const a = topPt(u0, v0), b = topPt(u1, v1); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
  const inPt = () => topPt(.16 + rr() * .68, .16 + rr() * .68); // 細節畫在裡面，不跨到邊上：相鄰地塊接起來才不會有一格一格的感覺
  g.fillStyle = base; g.fillRect(-TPX, -TPY, TW + TPX * 2, TH + TPY * 2);
  if (floor === 's') {
    for (let i = 0; i < 4; i++) { g.fillStyle = rgba(rr() < .5 ? '#ffffff' : '#5a5560', .04 + rr() * .05); const p = inPt(); g.beginPath(); g.ellipse(p[0], p[1], 3 + rr() * 6, 1.5 + rr() * 3, 0, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(40,38,48,.34)'; g.lineWidth = 1; if (jx) line(0, 0, 0, 1); if (jy) line(0, 0, 1, 0);
    g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = .7; if (jx) line(.03, 0, .03, 1); if (jy) line(0, .03, 1, .03);
    if (rr() < .4) { g.strokeStyle = 'rgba(30,28,38,.4)'; g.lineWidth = .8; let u = .2 + rr() * .5, w = .2 + rr() * .5; g.beginPath(); let p = topPt(u, w); g.moveTo(p[0], p[1]); for (let i = 0; i < 3; i++) { u = clamp(u + (rr() - .5) * .3, .1, .9); w = clamp(w + (rr() - .3) * .25, .1, .9); p = topPt(u, w); g.lineTo(p[0], p[1]); } g.stroke(); }
    if (rr() < .2) { g.fillStyle = 'rgba(122,74,54,.28)'; const p = inPt(); g.beginPath(); g.ellipse(p[0], p[1], 6, 2.4, .3, 0, TAU); g.fill(); }
  } else if (floor === 'r') {
    for (let i = 0; i < 6; i++) { g.fillStyle = rgba(rr() < .5 ? '#c06a3a' : '#2a1812', .07 + rr() * .1); const p = inPt(); g.beginPath(); g.ellipse(p[0], p[1], 2.5 + rr() * 6, 1.2 + rr() * 3, rr(), 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(20,10,8,.42)'; g.lineWidth = 1.1; if (jx) line(0, 0, 0, 1); if (jy) line(0, 0, 1, 0);
    g.fillStyle = 'rgba(255,190,140,.42)'; if (jx) for (const w of [.25, .75]) { const p = topPt(.09, w); g.beginPath(); g.ellipse(p[0], p[1], 1.3, .8, 0, 0, TAU); g.fill(); } if (jy) for (const u of [.25, .75]) { const p = topPt(u, .09); g.beginPath(); g.ellipse(p[0], p[1], 1.3, .8, 0, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(255,200,160,.12)'; g.lineWidth = .6; for (let i = 0; i < 2; i++) { const u = .15 + rr() * .4, w = .15 + rr() * .7; line(u, w, u + .15 + rr() * .2, w + (rr() - .5) * .08); }
  } else if (floor === 'd') {
    for (let i = 0; i < 14; i++) { g.fillStyle = rgba(rr() < .5 ? '#8a8490' : '#1c1a22', .1 + rr() * .16); const p = topPt(rr(), rr()); g.beginPath(); g.ellipse(p[0], p[1], .8 + rr() * 2.2, .5 + rr() * 1.2, 0, 0, TAU); g.fill(); }
    if (rr() < .3) { g.fillStyle = rgba(['#a8324a', '#2e5aa8', '#d99a2b', '#2f8f6a'][Math.floor(rr() * 4)], .7); const p = topPt(rr(), rr()); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + 3, p[1] - 1); g.lineTo(p[0] + 1.5, p[1] + 1.6); g.fill(); }
  } else if (floor === 'w') {
    for (let i = 0; i < 3; i++) { g.fillStyle = shade(base, (i % 2 ? -.1 : .04) + (rr() - .5) * .08); const a = topPt(0, i / 3), b = topPt(1, i / 3), c2 = topPt(1, (i + 1) / 3), d = topPt(0, (i + 1) / 3); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c2[0], c2[1]); g.lineTo(d[0], d[1]); g.fill(); }
    g.strokeStyle = 'rgba(25,16,10,.6)'; g.lineWidth = .9; for (let i = 0; i <= 3; i++) line(0, i / 3, 1, i / 3); if (jy) line(0, 0, 0, 1);
    g.strokeStyle = 'rgba(20,12,8,.25)'; g.lineWidth = .5; for (let i = 0; i < 5; i++) { const w = rr(), u = rr() * .6; line(u, w, u + .3, w); }
    g.fillStyle = 'rgba(20,14,10,.7)'; for (let i = 0; i < 3; i++) { const p = topPt(.08, i / 3 + .16); g.fillRect(p[0] - .7, p[1] - .5, 1.4, 1); }
  } else if (floor === 'm') {
    for (let i = 0; i < 16; i++) { g.fillStyle = rgba(rr() < .6 ? '#3f9a86' : '#143a36', .2 + rr() * .26); const p = inPt(); g.beginPath(); g.ellipse(p[0], p[1], 2 + rr() * 4.5, 1 + rr() * 2.2, 0, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(160,255,225,.85)'; for (let i = 0; i < 5; i++) { const p = topPt(rr(), rr()); g.beginPath(); g.arc(p[0], p[1], .8, 0, TAU); g.fill(); }
  } else if (floor === 'o') {
    for (let i = 0; i < 4; i++) { const p = topPt(.3 + rr() * .4, .3 + rr() * .4); const gr = g.createLinearGradient(p[0] - 14, p[1], p[0] + 14, p[1]); gr.addColorStop(0, 'rgba(120,80,200,0)'); gr.addColorStop(.4, 'rgba(120,90,220,.28)'); gr.addColorStop(.6, 'rgba(60,200,190,.26)'); gr.addColorStop(1, 'rgba(60,200,190,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(p[0], p[1], 14, 2.2 + rr() * 2, (rr() - .5) * .3, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(220,230,255,.14)'; g.lineWidth = .6; for (let i = 0; i < 2; i++) { const p = topPt(rr(), rr()); g.beginPath(); g.ellipse(p[0], p[1], 6 + rr() * 6, 2 + rr() * 2, 0, 0, TAU); g.stroke(); }
  } else if (floor === 'g') {
    // 彩窗地：碎片的角落用世界座標決定，跨過地塊還是接得起來（不會變成一格一格的棋盤）
    const cols = ['#8a2a40', '#274a8c', '#b88226', '#28755a', '#57308a', '#a59f90', '#274a8c', '#8a2a40'], n = 2;
    const P = (i, j) => { const gi = wx * n + i, gj = wy * n + j; return topPt((i + (hash2(gi, gj) - .5) * .62) / n, (j + (hash2(gj + 9.3, gi + 4.1) - .5) * .62) / n); };
    for (let i = -1; i <= n; i++) for (let j = -1; j <= n; j++) { const gi = wx * n + i, gj = wy * n + j, a = P(i, j), b = P(i + 1, j), c2 = P(i + 1, j + 1), d = P(i, j + 1), hh = hash2(gi * 1.7 + 3, gj * 2.3 + 7); g.fillStyle = shade(cols[Math.floor(hh * cols.length)], -.3 + hash2(gj, gi) * .22); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c2[0], c2[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill(); g.strokeStyle = '#15131c'; g.lineWidth = 1.3; g.lineJoin = 'round'; g.stroke();
      if (hh > .5) { g.strokeStyle = 'rgba(21,19,28,.9)'; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c2[0], c2[1]); g.stroke(); } }
  } else if (floor === 'c') {
    g.fillStyle = '#0a0a10'; g.fillRect(-TPX, -TPY, TW + TPX * 2, TH + TPY * 2);
    g.strokeStyle = '#5a5a68'; g.lineWidth = 1.6; for (let i = 0; i <= 4; i++) { line(i / 4, 0, i / 4, 1); line(0, i / 4, 1, i / 4); }
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = .5; for (let i = 0; i <= 4; i++) line(i / 4 + .02, 0, i / 4 + .02, 1);
  }
  g.restore();
  return (_spr[key] = c);
}
// 側面：face 0＝左下那面（較暗）、1＝右下那面；hl 是露出的階數；fade＝底下是虛空
function tileSide(floor, face, hl, fade) {
  const lv = fade ? hl + 7 : hl, key = 'S' + floor + face + hl + (fade ? 1 : 0); if (_spr[key]) return _spr[key];
  const H = lv * LH, [c, g] = sprCanvas(TW / 2, H + TH / 2), rr = mulberry32(hashStr(key)), base = shade(SIDE_COL[floor], face ? -.08 : -.3);
  g.beginPath();
  if (face === 0) { g.moveTo(0, 0); g.lineTo(TW / 2, TH / 2); g.lineTo(TW / 2, TH / 2 + H); g.lineTo(0, H); } else { g.moveTo(0, TH / 2); g.lineTo(TW / 2, 0); g.lineTo(TW / 2, H); g.lineTo(0, TH / 2 + H); }
  g.closePath(); g.save(); g.clip();
  g.fillStyle = base; g.fillRect(0, 0, TW / 2, H + TH / 2);
  const sl = face === 0 ? .5 : -.5; // 斜率
  const yAt = (x, y0) => y0 + (face === 0 ? x * .5 : (TW / 2 - x) * .5);
  if (floor === 's' || floor === 'g') { g.strokeStyle = 'rgba(20,18,28,.5)'; g.lineWidth = .9; for (let y = 9; y < H; y += 9) { g.beginPath(); g.moveTo(0, yAt(0, y)); g.lineTo(TW / 2, yAt(TW / 2, y)); g.stroke(); const off = (Math.floor(y / 9) % 2) * 8; for (let x = 4 + off; x < TW / 2; x += 16) { g.beginPath(); g.moveTo(x, yAt(x, y - 9)); g.lineTo(x, yAt(x, y)); g.stroke(); } } }
  else if (floor === 'r' || floor === 'c') { g.strokeStyle = 'rgba(10,6,6,.55)'; g.lineWidth = 1; for (let y = LH; y < H; y += LH) { g.beginPath(); g.moveTo(0, yAt(0, y)); g.lineTo(TW / 2, yAt(TW / 2, y)); g.stroke(); } g.fillStyle = 'rgba(255,170,120,.35)'; for (let y = 5; y < H; y += LH) for (let x = 5; x < TW / 2; x += 11) g.fillRect(x, yAt(x, y), 1.4, 1.4); for (let i = 0; i < lv * 2; i++) { g.fillStyle = rgba('#c06a3a', .12 + rr() * .12); g.fillRect(rr() * TW / 2, rr() * H, 2 + rr() * 3, 6 + rr() * 16); } }
  else if (floor === 'w') { g.strokeStyle = 'rgba(15,10,6,.55)'; g.lineWidth = 1; for (let x = 6; x < TW / 2; x += 9) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H + TH / 2); g.stroke(); } }
  else { for (let i = 0; i < lv * 5; i++) { g.fillStyle = rgba(rr() < .5 ? '#6a6672' : '#121018', .18 + rr() * .2); g.beginPath(); g.ellipse(rr() * TW / 2, rr() * (H + 8), 1 + rr() * 3, 1 + rr() * 2, 0, 0, TAU); g.fill(); } }
  void sl;
  // 頂緣亮線、往下變暗
  const gr = g.createLinearGradient(0, 0, 0, H + TH / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(fade ? .35 : 1, fade ? 'rgba(4,5,10,.75)' : 'rgba(0,0,0,.28)'); if (fade) gr.addColorStop(1, 'rgba(4,5,10,1)');
  g.fillStyle = gr; g.fillRect(0, 0, TW / 2, H + TH / 2);
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = .8; g.beginPath(); if (face === 0) { g.moveTo(0, .5); g.lineTo(TW / 2, TH / 2 + .5); } else { g.moveTo(0, TH / 2 + .5); g.lineTo(TW / 2, .5); } g.stroke();
  return (_spr[key] = c);
}

// ---------- 物件貼圖 ----------
// 每個物件畫在 160×260 的畫布上，腳底錨點 (80, 220)
const PW = 160, PH = 260, PAX = 80, PAY = 220;
const INK = '#0c0d14';
function poly(g, pts, fill, stroke, lw) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1.6; g.lineJoin = 'round'; g.stroke(); } }
function isoBox(g, cxp, cyp, w, d, h, top, left, right, lw) { // 斜方塊：(cxp, cyp) 是底面菱形的中心，w 是菱形的寬
  const hw = w / 2, hh = w / 4;
  poly(g, [cxp - hw, cyp - h, cxp, cyp + hh - h, cxp, cyp + hh, cxp - hw, cyp], left, INK, lw);
  poly(g, [cxp + hw, cyp - h, cxp, cyp + hh - h, cxp, cyp + hh, cxp + hw, cyp], right, INK, lw);
  poly(g, [cxp - hw, cyp - h, cxp, cyp - hh - h, cxp + hw, cyp - h, cxp, cyp + hh - h], top, INK, lw);
}
function ell(g, x, y, rx, ry, fill, stroke, lw) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1.6; g.stroke(); } }
function shadowBlob(g, x, y, rx, ry, a) { const gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, `rgba(0,0,0,${a == null ? .45 : a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, TAU); g.fill(); g.restore(); }
const GLASS = ['#a8324a', '#2e5aa8', '#d99a2b', '#2f8f6a', '#6a3aa0'];
const PROP = {
  P(g, r) { shadowBlob(g, 80, 222, 30, 13); const h = 96 + r() * 16; isoBox(g, 80, 214, 44, 44, 10, '#cfc9bb', '#7d786f', '#a39e92');
    const gr = g.createLinearGradient(62, 0, 98, 0); gr.addColorStop(0, '#6f6b66'); gr.addColorStop(.45, '#d8d2c4'); gr.addColorStop(1, '#8a857c'); poly(g, [63, 208, 63, 208 - h + 8, 70, 208 - h, 80, 208 - h + 6, 88, 208 - h - 6, 97, 208 - h + 4, 97, 208], gr, INK, 1.8);
    g.strokeStyle = 'rgba(40,36,46,.45)'; g.lineWidth = 1; for (let x = 68; x < 96; x += 6) { g.beginPath(); g.moveTo(x, 206); g.lineTo(x, 208 - h + 12); g.stroke(); }
    ell(g, 80, 208, 17, 6, null, INK, 1.6); g.fillStyle = '#3f8f7f'; g.fillRect(63, 180, 34, 5); g.strokeStyle = INK; g.strokeRect(63, 180, 34, 5);
    g.strokeStyle = 'rgba(20,18,28,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(74, 208 - h + 10); g.lineTo(78, 208 - h + 30); g.lineTo(72, 208 - h + 44); g.stroke(); },
  p(g, r) { shadowBlob(g, 80, 222, 28, 12); isoBox(g, 80, 214, 44, 44, 10, '#cfc9bb', '#7d786f', '#a39e92'); const gr = g.createLinearGradient(62, 0, 98, 0); gr.addColorStop(0, '#6f6b66'); gr.addColorStop(.45, '#d8d2c4'); gr.addColorStop(1, '#8a857c'); poly(g, [63, 208, 63, 186, 72, 178, 80, 188, 90, 180, 97, 190, 97, 208], gr, INK, 1.8); poly(g, [104, 216, 112, 208, 122, 214, 116, 222], '#b5afa2', INK, 1.4); poly(g, [48, 220, 54, 213, 62, 220], '#a39e92', INK, 1.4); void r; },
  W(g, r) { shadowBlob(g, 80, 224, 40, 15); const top = [38, 150, 52, 138, 60, 150, 74, 128, 88, 140, 100, 122, 112, 144, 122, 160];
    poly(g, [38, 212, 38, 150, 52, 138, 60, 150, 74, 128, 88, 140, 100, 122, 112, 144, 122, 160, 122, 222, 80, 236], '#a39e92', INK, 1.8); poly(g, [38, 212, 38, 150, 52, 138, 60, 150, 74, 128, 80, 134, 80, 236], '#7d786f', null);
    g.strokeStyle = 'rgba(20,18,28,.5)'; g.lineWidth = 1; for (let y = 160; y < 226; y += 13) { g.beginPath(); g.moveTo(38, y); g.lineTo(80, y + 21); g.lineTo(122, y + 6); g.stroke(); }
    poly(g, [88, 150, 100, 138, 110, 150, 110, 186, 88, 192], '#15131c', INK, 1.6); for (let i = 0; i < 4; i++) poly(g, [90 + (i % 2) * 10, 154 + Math.floor(i / 2) * 18, 99 + (i % 2) * 10, 150 + Math.floor(i / 2) * 18, 99 + (i % 2) * 10, 166 + Math.floor(i / 2) * 18, 90 + (i % 2) * 10, 170 + Math.floor(i / 2) * 18], shade(GLASS[Math.floor(r() * 5)], -.1), '#15131c', 1.2); void top; },
  X(g, r) { shadowBlob(g, 80, 222, 26, 11); isoBox(g, 80, 212, 42, 42, 28, '#9a7a56', '#5c4630', '#7a5f42'); g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(59, 190); g.lineTo(80, 222); g.moveTo(101, 190); g.lineTo(80, 222); g.moveTo(59, 212); g.lineTo(80, 194); g.moveTo(101, 212); g.lineTo(80, 194); g.stroke(); if (r() < .6) { g.fillStyle = '#c8402f'; g.beginPath(); g.arc(90, 203, 3.2, 0, TAU); g.fill(); g.strokeStyle = INK; g.stroke(); } },
  D(g, r) { shadowBlob(g, 80, 222, 30, 11, .35); for (let i = 0; i < 6; i++) { const x = 56 + r() * 48, y = 206 + r() * 14, s = 5 + r() * 9; poly(g, [x - s, y, x - s * .3, y - s * .8, x + s * .7, y - s * .5, x + s, y + s * .2, x, y + s * .5], shade('#a39e92', -.3 + r() * .3), INK, 1.3); } for (let i = 0; i < 3; i++) { const x = 60 + r() * 40, y = 204 + r() * 14; poly(g, [x, y, x + 5, y - 7, x + 8, y + 1], shade(GLASS[Math.floor(r() * 5)], .05), INK, 1); } g.strokeStyle = '#7a4a36'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(62, 214); g.quadraticCurveTo(76, 196, 96, 208); g.stroke(); },
  J(g, r) { shadowBlob(g, 80, 224, 40, 15); poly(g, [40, 220, 48, 180, 66, 168, 76, 148, 94, 156, 104, 176, 120, 190, 124, 222, 80, 236], '#5a3a2c', INK, 1.8); poly(g, [48, 180, 66, 168, 76, 148, 80, 170, 70, 200, 52, 210], '#7a4a36', INK, 1.4); poly(g, [80, 170, 94, 156, 104, 176, 100, 204, 84, 212], '#4a2e24', INK, 1.4);
    g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(58, 196); g.lineTo(98, 170); g.stroke(); g.strokeStyle = '#8f8a84'; g.lineWidth = 3; g.stroke(); ell(g, 96, 196, 11, 11, null, INK, 5); ell(g, 96, 196, 11, 11, null, '#3f8f7f', 2.6); for (let i = 0; i < 6; i++) { g.fillStyle = rgba('#c06a3a', .5); g.fillRect(50 + r() * 60, 170 + r() * 50, 2, 5 + r() * 8); } },
  L(g) { shadowBlob(g, 80, 222, 14, 6); g.strokeStyle = INK; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, 220); g.lineTo(80, 128); g.quadraticCurveTo(80, 112, 96, 114); g.stroke(); g.strokeStyle = '#4a4650'; g.lineWidth = 3; g.stroke();
    isoBox(g, 80, 220, 16, 16, 5, '#4a4650', '#2c2a32', '#3a3740'); g.strokeStyle = INK; g.lineWidth = 1.4; g.beginPath(); g.moveTo(96, 114); g.lineTo(96, 122); g.stroke(); poly(g, [89, 122, 103, 122, 105, 140, 96, 146, 87, 140], '#ffd89a', INK, 1.6); poly(g, [87, 122, 105, 122, 96, 116], '#3a3740', INK, 1.4); g.fillStyle = '#fff4d8'; g.beginPath(); g.ellipse(96, 133, 3.2, 5, 0, 0, TAU); g.fill(); },
  F(g, r) { shadowBlob(g, 80, 222, 28, 11, .3); const cr = (x, y, w, h, tilt, a) => { poly(g, [x - w, y, x - w * .5 + tilt, y - h * .7, x + tilt * 1.6, y - h, x + w * .6 + tilt, y - h * .6, x + w, y], `rgba(160,225,255,${a})`, '#2c4a6a', 1.5); poly(g, [x - w * .1, y, x + tilt * 1.6, y - h, x + w * .6 + tilt, y - h * .6, x + w, y], 'rgba(90,150,220,.55)', null); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - w * .5 + tilt, y - h * .7); g.lineTo(x + tilt * 1.6, y - h); g.stroke(); };
    cr(66, 218, 9, 34, -4, .9); cr(82, 220, 12, 56, 2, .95); cr(98, 218, 8, 28, 5, .9); cr(74, 222, 6, 18, -2, .85); cr(60, 172, 4, 12, 0, .8); cr(102, 160, 5, 14, 1, .8); cr(86, 140, 3.5, 10, 0, .75); void r; },
  B(g) { shadowBlob(g, 80, 222, 20, 9); const gr = g.createLinearGradient(62, 0, 98, 0); gr.addColorStop(0, '#5a1e16'); gr.addColorStop(.5, '#c8402f'); gr.addColorStop(1, '#6e241a'); poly(g, [63, 216, 63, 184, 97, 184, 97, 216], gr, null); ell(g, 80, 216, 17, 7, gr, INK, 1.8); g.fillStyle = gr; g.fillRect(63, 184, 34, 32); g.strokeStyle = INK; g.lineWidth = 1.8; g.beginPath(); g.moveTo(63, 184); g.lineTo(63, 216); g.moveTo(97, 184); g.lineTo(97, 216); g.stroke(); ell(g, 80, 184, 17, 7, '#8a3024', INK, 1.8);
    g.strokeStyle = '#2a2a32'; g.lineWidth = 3; for (const y of [193, 208]) { g.beginPath(); g.ellipse(80, y, 17, 7, 0, .1, Math.PI - .1); g.stroke(); } poly(g, [80, 190, 85, 199, 82, 199, 86, 207, 76, 200, 79, 200, 75, 194], '#ffd070', INK, 1); },
  R(g, r) { shadowBlob(g, 82, 224, 22, 9, .3); g.lineCap = 'round'; const draw = (col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(96, 222); g.bezierCurveTo(112, 150, 96, 70, 40, 30); g.stroke(); }; draw(INK, 13); draw('#b5a88c', 9.5); draw('#d8ccb0', 4); g.strokeStyle = 'rgba(50,40,30,.5)'; g.lineWidth = 1; for (let i = 0; i < 7; i++) { const t = .1 + i * .12, x = 96 + (40 - 96) * t * t + 14 * Math.sin(t * 3), y = 222 - 192 * t; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 6, y - 3); g.stroke(); } void r; },
  U(g) { shadowBlob(g, 80, 224, 26, 11); isoBox(g, 80, 216, 40, 40, 12, '#cfc9bb', '#7d786f', '#a39e92'); poly(g, [66, 208, 62, 160, 70, 130, 78, 118, 90, 118, 96, 132, 100, 162, 96, 208], '#b5afa2', INK, 1.8); poly(g, [62, 160, 70, 130, 78, 118, 80, 150, 76, 208, 66, 208], '#8e897f', null); poly(g, [76, 118, 80, 108, 86, 112, 90, 118], '#7d786f', INK, 1.4);
    g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(94, 138); g.lineTo(118, 128); g.stroke(); g.strokeStyle = '#3f8f7f'; g.lineWidth = 2; g.stroke(); g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(104, 134); g.lineTo(104, 150); g.moveTo(118, 128); g.lineTo(118, 146); g.stroke(); ell(g, 104, 152, 6, 2.5, '#3f8f7f', INK, 1.2); ell(g, 118, 148, 6, 2.5, '#3f8f7f', INK, 1.2); },
  N(g, r) { shadowBlob(g, 80, 222, 12, 5); g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(80, 220); g.lineTo(80, 96); g.stroke(); g.strokeStyle = '#6b5540'; g.lineWidth = 2.6; g.stroke(); poly(g, [82, 100, 122, 106, 118, 128, 124, 150, 112, 146, 104, 160, 96, 148, 82, 156], '#7a1e22', INK, 1.6); poly(g, [82, 100, 100, 103, 98, 150, 82, 156], '#5a1418', null); ell(g, 102, 124, 7, 7, null, '#e8c070', 2); g.strokeStyle = '#e8c070'; g.lineWidth = 2; g.beginPath(); g.moveTo(97, 119); g.lineTo(107, 129); g.moveTo(107, 119); g.lineTo(97, 129); g.stroke(); void r; },
  Y(g) { g.lineCap = 'round'; for (let y = -10; y < 188; y += 17) { const odd = Math.floor(y / 17) % 2; g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.ellipse(80, y + 9, odd ? 3 : 7, 10, 0, 0, TAU); g.stroke(); g.strokeStyle = odd ? '#4a4650' : '#6a6672'; g.lineWidth = 3; g.stroke(); } g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(80, 190); g.quadraticCurveTo(80, 210, 68, 204); g.stroke(); g.strokeStyle = '#6a6672'; g.lineWidth = 3; g.stroke(); shadowBlob(g, 80, 222, 12, 5, .25); },
  T(g, r) { shadowBlob(g, 80, 226, 44, 16); poly(g, [36, 218, 80, 150, 124, 218, 80, 238], '#6a5a48', INK, 1.8); poly(g, [36, 218, 80, 150, 80, 238], '#4f4336', null); poly(g, [80, 238, 80, 176, 96, 228], '#1a1410', INK, 1.4); poly(g, [80, 176, 96, 228, 86, 234, 80, 238], '#ffb86b', null); g.globalAlpha = .5; poly(g, [80, 180, 94, 228, 84, 234, 80, 236], '#fff0c8', null); g.globalAlpha = 1; for (let i = 0; i < 3; i++) poly(g, [48 + r() * 20, 190 + r() * 20, 58 + r() * 20, 186 + r() * 20, 60 + r() * 20, 198 + r() * 20, 50 + r() * 20, 202 + r() * 20], shade(['#7a1e22', '#3f8f7f', '#8a7a5a'][i], -.1), INK, 1); g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.moveTo(80, 150); g.lineTo(80, 140); g.stroke(); },
  S(g, r) { shadowBlob(g, 80, 226, 40, 14); isoBox(g, 80, 216, 60, 60, 20, '#8a6e4e', '#4f3d2a', '#6a543a'); g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(52, 200); g.lineTo(52, 150); g.moveTo(108, 200); g.lineTo(108, 150); g.stroke(); poly(g, [40, 156, 80, 136, 120, 156, 80, 176], ['#7a1e22', '#3f6f8f', '#8a7a3a'][Math.floor(r() * 3)], INK, 1.8); poly(g, [40, 156, 80, 176, 80, 184, 40, 164], '#3a1014', INK, 1.2);
    for (let i = 0; i < 4; i++) ell(g, 62 + i * 11, 196 - (i % 2) * 4, 4, 3, shade(GLASS[i], .1), INK, 1); },
  O(g) { shadowBlob(g, 80, 224, 34, 13); const br = (x, y) => { const gr = g.createLinearGradient(x - 14, 0, x + 14, 0); gr.addColorStop(0, '#2a2a32'); gr.addColorStop(.5, '#5a5a66'); gr.addColorStop(1, '#30303a'); g.fillStyle = gr; g.fillRect(x - 14, y - 30, 28, 30); ell(g, x, y, 14, 6, gr, INK, 1.6); g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - 14, y - 30); g.lineTo(x - 14, y); g.moveTo(x + 14, y - 30); g.lineTo(x + 14, y); g.stroke(); ell(g, x, y - 30, 14, 6, '#44444e', INK, 1.6); g.fillStyle = 'rgba(120,90,220,.5)'; g.beginPath(); g.ellipse(x - 3, y - 30, 6, 2.4, 0, 0, TAU); g.fill(); }; br(64, 212); br(96, 214); br(80, 224); },
  M(g) { shadowBlob(g, 80, 226, 34, 13); isoBox(g, 80, 218, 56, 56, 10, '#3a3a46', '#1c1c24', '#2a2a34'); poly(g, [58, 210, 58, 96, 70, 82, 84, 78, 96, 86, 102, 100, 102, 214, 80, 222], '#2a2a36', INK, 2); poly(g, [58, 210, 58, 96, 70, 82, 80, 80, 80, 222], '#1e1e28', null);
    g.strokeStyle = 'rgba(200,196,184,.4)'; g.lineWidth = .7; for (let y = 104; y < 206; y += 6) { g.beginPath(); g.moveTo(63, y); g.lineTo(77, y + 2); g.moveTo(84, y + 3); g.lineTo(98, y); g.stroke(); }
    g.strokeStyle = '#ffcf5a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(70, 82); g.lineTo(74, 110); g.lineTo(66, 140); g.lineTo(76, 170); g.lineTo(70, 206); g.moveTo(74, 110); g.lineTo(92, 124); g.lineTo(98, 150); g.stroke(); },
  A(g) { shadowBlob(g, 80, 226, 30, 12); poly(g, [64, 216, 68, 120, 80, 104, 92, 120, 96, 216, 80, 226], '#4a4650', INK, 2); poly(g, [64, 216, 68, 120, 80, 104, 80, 226], '#2e2c34', null); poly(g, [76, 140, 84, 140, 84, 196, 76, 196], '#bfe8ff', INK, 1.2); ell(g, 80, 110, 16, 9, null, INK, 7); ell(g, 80, 110, 16, 9, null, '#6a6672', 3.5); for (const y of [150, 180]) { g.fillStyle = '#7a4a36'; g.fillRect(66, y, 28, 5); g.strokeStyle = INK; g.lineWidth = 1.2; g.strokeRect(66, y, 28, 5); } },
  V(g) { shadowBlob(g, 80, 226, 44, 16, .4); poly(g, [34, 214, 60, 196, 126, 206, 104, 232], '#3a4a5e', INK, 1.8); poly(g, [40, 208, 62, 150, 112, 140, 122, 200, 100, 224], 'rgba(150,215,250,.55)', '#2c4a6a', 1.8); poly(g, [40, 208, 62, 150, 78, 160, 70, 220], 'rgba(90,150,220,.5)', null); poly(g, [78, 160, 112, 140, 122, 200, 100, 224, 70, 220], 'rgba(200,240,255,.25)', null);
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(62, 150); g.lineTo(112, 140); g.moveTo(84, 150); g.lineTo(92, 176); g.lineTo(80, 196); g.lineTo(96, 220); g.moveTo(92, 176); g.lineTo(112, 180); g.stroke(); poly(g, [112, 140, 128, 132, 132, 150, 122, 160], 'rgba(150,215,250,.6)', '#2c4a6a', 1.4); },
  Z(g) { shadowBlob(g, 80, 228, 56, 20, .5); g.lineCap = 'butt'; const link = (col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(36, 226); g.bezierCurveTo(10, 150, 30, 60, 84, 44); g.bezierCurveTo(128, 34, 146, 90, 138, 140); g.stroke(); }; link(INK, 34); link('#3a3740', 29); link('#5a5664', 12);
    poly(g, [122, 132, 154, 140, 150, 152, 120, 146], '#f4ecd4', INK, 1.6); g.strokeStyle = '#ffcf5a'; g.lineWidth = 2; g.beginPath(); g.moveTo(124, 138); g.lineTo(152, 146); g.stroke(); for (let i = 0; i < 5; i++) { g.fillStyle = rgba('#c06a3a', .35); g.fillRect(24 + i * 9, 110 + i * 6, 3, 12); } },
  Q(g) { shadowBlob(g, 80, 226, 40, 14); isoBox(g, 68, 214, 44, 44, 34, '#5a5664', '#2c2a32', '#3a3740'); poly(g, [56, 200, 68, 206, 68, 190, 56, 184], '#ff9a3c', INK, 1.4); g.fillStyle = '#fff0c0'; g.fillRect(59, 190, 6, 8); isoBox(g, 108, 222, 26, 26, 12, '#6a6672', '#33313a', '#4a4650'); poly(g, [94, 204, 124, 198, 128, 204, 96, 212], '#8f8a94', INK, 1.4); g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(60, 180); g.lineTo(60, 150); g.stroke(); poly(g, [52, 150, 68, 150, 66, 140, 54, 140], '#3a3740', INK, 1.4); },
  E(g) { shadowBlob(g, 80, 226, 36, 13); isoBox(g, 80, 216, 54, 54, 22, '#6a543a', '#3a2e20', '#4f3d2a'); ell(g, 74, 188, 8, 4, '#bfe8ff', '#2c4a6a', 1.4); g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.moveTo(74, 188); g.lineTo(88, 170); g.stroke(); ell(g, 90, 166, 7, 7, 'rgba(190,232,255,.5)', INK, 1.6); g.strokeStyle = '#ffcf5a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(86, 194); g.lineTo(98, 190); g.lineTo(94, 198); g.stroke(); },
  h(g) { shadowBlob(g, 80, 226, 34, 12); g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(52, 222); g.lineTo(52, 160); g.lineTo(108, 152); g.lineTo(108, 216); g.stroke(); g.strokeStyle = '#6b5540'; g.lineWidth = 2; g.stroke(); for (let i = 0; i < 5; i++) { const x = 58 + i * 11, y = 162 - i * 1.4; poly(g, [x, y, x + 4, y + 22 + (i % 2) * 8, x - 4, y + 20 + (i % 2) * 8], i % 2 ? '#3f9a86' : '#2a6a60', INK, 1.1); } isoBox(g, 82, 224, 30, 30, 10, '#8a6e4e', '#4f3d2a', '#6a543a'); },
  k(g) { shadowBlob(g, 80, 224, 26, 9); g.strokeStyle = INK; g.lineWidth = 4.4; g.beginPath(); g.moveTo(58, 222); g.lineTo(58, 150); g.moveTo(104, 214); g.lineTo(104, 142); g.stroke(); poly(g, [52, 198, 52, 150, 110, 140, 110, 188], '#6a543a', INK, 1.8); const pp = [[58, 158, '#e8e2d0'], [74, 152, '#d8ccb0'], [90, 150, '#e8e2d0'], [64, 176, '#d8ccb0'], [84, 170, '#e8d8a0']]; for (const p of pp) poly(g, [p[0], p[1], p[0] + 12, p[1] - 2, p[0] + 13, p[1] + 13, p[0] + 1, p[1] + 15], p[2], INK, 1); g.fillStyle = '#c8402f'; for (const p of pp) g.fillRect(p[0] + 5, p[1], 2, 2); },
  z(g) { shadowBlob(g, 80, 228, 44, 14); isoBox(g, 80, 220, 70, 30, 10, '#5a5664', '#2c2a32', '#3a3740'); ell(g, 80, 136, 50, 66, '#0d0e16', INK, 2); ell(g, 80, 136, 50, 66, null, '#4a4650', 7); ell(g, 80, 136, 50, 66, null, INK, 1.6); ell(g, 80, 136, 44, 60, null, INK, 1.4); ell(g, 80, 136, 16, 22, null, '#4a4650', 3); g.strokeStyle = '#4a4650'; g.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(80 + Math.cos(a) * 16, 136 + Math.sin(a) * 22); g.lineTo(80 + Math.cos(a) * 44, 136 + Math.sin(a) * 60); g.stroke(); } },
};
function propSprite(ch, v) {
  const key = 'P' + ch + v; if (_spr[key]) return _spr[key];
  const [c, g] = sprCanvas(PW, PH); g.lineJoin = 'round';
  (PROP[ch] || PROP.D)(g, mulberry32(hashStr(key)));
  return (_spr[key] = c);
}
// 圓形柔光貼圖（發光用）
function glowSprite(col) { const key = 'G' + col; if (_spr[key]) return _spr[key]; const c = mkCanvas(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, rgba(col, .9)); gr.addColorStop(.25, rgba(col, .45)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (_spr[key] = c); }

// ---------- 載入區域 ----------
function gfxLoadZone(m, Zd) {
  Gfx.zone = m; Gfx.zd = Zd; Gfx.tiles = []; Gfx.rows = []; Gfx.parts = []; Gfx.lights = m.lights.slice();
  const hAt = (x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h || m.floor[y][x] === ' ') ? -99 : m.ht[y][x];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const f = m.floor[y][x]; if (f === ' ') continue;
    const h = m.ht[y][x], hl = hAt(x, y + 1), hr = hAt(x + 1, y), hs = hashStr(x + ',' + y + Zd.id);
    const t = { x, y, h, d: x + y, px: isoX(x, y) - TW / 2, py: isoY(x, y, h) - TH / 2 + TH / 2 - TH / 2, top: tileTop(f, hs % 4, f === 'r' ? x % 4 === 0 : f === 's' ? x % 3 === 0 : (x & 1) === 0, f === 'r' ? y % 4 === 0 : f === 's' ? (y + (Math.floor(x / 3) & 1)) % 2 === 0 : (y & 1) === 0, x, y), sl: null, sr: null, ch: m.obj[y][x], pv: hs % 3, f };
    t.py = isoY(x, y, h) - TH / 2;
    if (hl < h) { t.sl = tileSide(f, 0, hl === -99 ? Math.min(h, 6) : h - hl, hl === -99); t.slh = t.sl.height / SS; }
    if (hr < h) { t.sr = tileSide(f, 1, hr === -99 ? Math.min(h, 6) : h - hr, hr === -99); t.srh = t.sr.height / SS; }
    if (t.ch !== ' ') t.prop = propSprite(t.ch, t.pv);
    Gfx.tiles.push(t);
    (Gfx.rows[t.d] = Gfx.rows[t.d] || []).push(t);
  }
  Gfx.dMax = m.w + m.h;
  const rb = mulberry32(hashStr('blob' + Zd.id)); Gfx.blobs = [];
  for (let i = 0; i < Math.round(m.w * m.h / 38); i++) Gfx.blobs.push({ x: rb() * m.w, y: rb() * m.h, r: 2.5 + rb() * 4.5, a: .1 + rb() * .2, lit: rb() < .3 });
}
function tileH(x, y) { const m = Gfx.zone; x = Math.round(x); y = Math.round(y); if (!m || x < 0 || y < 0 || x >= m.w || y >= m.h || m.floor[y][x] === ' ') return 0; return m.ht[y][x]; }

// ---------- 粒子 ----------
function part(o) { if (Gfx.parts.length > 420) return; Gfx.parts.push(Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 1, t: 0, size: 2, col: '#ffffff', add: true, grav: 0, drag: 0, k: 'dot' }, o)); }
function partsUpdate(dt) {
  for (let i = Gfx.parts.length - 1; i >= 0; i--) { const p = Gfx.parts[i]; p.t += dt; if (p.t >= p.life) { Gfx.parts.splice(i, 1); continue; } p.vz -= p.grav * dt; if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; } p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.spin) p.rot = (p.rot || 0) + p.spin * dt; }
}
function ambientParts(dt) { // 往上飄的浮石屑、往下落的灰
  const m = Gfx.zone; if (!m) return;
  if (Math.random() < dt * 9) { const [wx, wy] = s2w(Math.random() * VW, Math.random() * VH, 0); part({ x: wx, y: wy, z: -.5, vz: .5 + Math.random() * .7, vx: (Math.random() - .5) * .15, vy: (Math.random() - .5) * .15, life: 5 + Math.random() * 4, size: 1 + Math.random() * 1.6, col: '#bfe8ff', k: 'mote' }); }
  if (Math.random() < dt * 5) { const [wx, wy] = s2w(Math.random() * VW, Math.random() * VH * .6, 0); part({ x: wx, y: wy, z: 9, vz: -.7 - Math.random() * .5, vx: .1, life: 7, size: .8 + Math.random(), col: '#8a8494', add: false, k: 'dust' }); }
  for (const l of Gfx.lights) { if (l.off) continue; if ((l.c === '#ff9050' || l.flame) && Math.random() < dt * (l.flame ? 14 : 6)) part({ x: l.x + (Math.random() - .5) * .4, y: l.y + (Math.random() - .5) * .4, z: tileH(l.x, l.y) + (l.flame ? 1.6 : .8), vz: 1.2 + Math.random() * 1.4, vx: (Math.random() - .5) * .5, vy: (Math.random() - .5) * .5, life: .9 + Math.random() * .8, size: 1.2 + Math.random() * 1.6, col: Math.random() < .5 ? '#ffb050' : '#ff7030', k: 'ember' }); }
}
function drawParts(add) {
  cx.globalCompositeOperation = add ? 'lighter' : 'source-over';
  for (const p of Gfx.parts) {
    if (!!p.add !== add) continue;
    const [sx, sy] = w2s(p.x, p.y, p.z), a = (p.fade === 'in' ? Math.min(1, p.t * 3) : 1) * Math.min(1, (p.life - p.t) / (p.life * .35)), s = p.size * Cam.zoom * (p.grow ? 1 + p.grow * p.t : 1);
    if (sx < -40 || sy < -40 || sx > VW + 40 || sy > VH + 40) continue;
    cx.globalAlpha = clamp(a * (p.a == null ? 1 : p.a), 0, 1);
    if (p.k === 'shard') { cx.save(); cx.translate(sx, sy); cx.rotate(p.rot || 0); cx.fillStyle = p.col; cx.beginPath(); cx.moveTo(-s, s * .4); cx.lineTo(0, -s * 1.2); cx.lineTo(s * .8, s * .6); cx.closePath(); cx.fill(); cx.strokeStyle = 'rgba(255,255,255,.7)'; cx.lineWidth = .7; cx.stroke(); cx.restore(); }
    else if (p.k === 'ring') { cx.strokeStyle = p.col; cx.lineWidth = Math.max(.6, (p.lw || 3) * (1 - p.t / p.life)) * Cam.zoom; cx.beginPath(); cx.ellipse(sx, sy, s, s * .5, 0, 0, TAU); cx.stroke(); }
    else if (p.k === 'streak') { cx.strokeStyle = p.col; cx.lineWidth = s; cx.lineCap = 'round'; const [ex, ey] = w2s(p.x - p.vx * .05, p.y - p.vy * .05, p.z - p.vz * .05); cx.beginPath(); cx.moveTo(sx, sy); cx.lineTo(ex, ey); cx.stroke(); }
    else if (p.k === 'glow') { const im = glowSprite(p.col); cx.drawImage(im, sx - s, sy - s, s * 2, s * 2); }
    else { cx.fillStyle = p.col; cx.beginPath(); cx.arc(sx, sy, Math.max(.4, s), 0, TAU); cx.fill(); }
  }
  cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
}

// ---------- 畫世界 ----------
// Gfx.units：{ x, y, z, draw(g, sx, sy, k), tall, xray } ；Gfx.decals：{ x, y, z, draw(g, sx, sy, k) }
function renderWorld(t) {
  const m = Gfx.zone, k = Cam.zoom;
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  // 虛空底
  const bg = cx.createLinearGradient(0, 0, 0, VH); bg.addColorStop(0, '#05060c'); bg.addColorStop(1, '#0a0c16'); cx.fillStyle = bg; cx.fillRect(0, 0, VW, VH);
  if (!m) return;
  const cpx = isoX(Cam.x, Cam.y), cpy = isoY(Cam.x, Cam.y, Cam.z), ox = VW / 2 + Cam.sx, oy = VH * Cam.cy + Cam.sy;
  const X = px => (px - cpx) * k + ox, Y = py => (py - cpy) * k + oy;
  // 單位與貼地物分桶
  const ub = {}; for (const u of Gfx.units) { const d = Math.round(u.x + u.y + (u.bias || 0)); (ub[d] = ub[d] || []).push(u); }
  const db = {}; for (const u of Gfx.decals) { const d = Math.round(u.x + u.y); (db[d] = db[d] || []).push(u); }
  const tw = TW * k, th = TH * k;
  for (let d = 0; d <= Gfx.dMax; d++) {
    const row = Gfx.rows[d];
    if (row) for (const tt of row) {
      const sx = X(tt.px), sy = Y(tt.py);
      if (sx > VW + 6 || sx + tw < -6 || sy > VH + 6) continue; // 在畫面兩側或下方：頂面和側面都看不到
      if (tt.sl && sy + th / 2 + tt.slh * k > 0) cx.drawImage(tt.sl, sx, sy + th / 2, tw / 2, tt.slh * k);
      if (tt.sr && sy + th / 2 + tt.srh * k > 0) cx.drawImage(tt.sr, sx + tw / 2, sy + th / 2, tw / 2, tt.srh * k);
      if (sy + th > -6) cx.drawImage(tt.top, sx - TPX * k, sy - TPY * k, tw + TPX * 2 * k, th + TPY * 2 * k);
    }
    const dl = db[d]; if (dl) for (const u of dl) { const [sx, sy] = w2s(u.x, u.y, u.z); u.draw(cx, sx, sy, k); }
    if (row) for (const tt of row) { if (!tt.prop || tt.hide) continue; const px0 = X(tt.px) + tw / 2 - PAX * k, py0 = Y(tt.py) + th / 2 - PAY * k; if (px0 > VW || px0 + PW * k < 0 || py0 > VH || py0 + PH * k < 0) continue; if (tt.fadeA != null && tt.fadeA < 1) cx.globalAlpha = tt.fadeA; cx.drawImage(tt.prop, px0, py0, PW * k, PH * k); cx.globalAlpha = 1; }
    const ul = ub[d]; if (ul) { ul.sort((a, b) => (a.x + a.y) - (b.x + b.y)); for (const u of ul) { const [sx, sy] = w2s(u.x, u.y, u.z); if (sx < -200 || sx > VW + 200 || sy < -100 || sy > VH + 300) continue; u.draw(cx, sx, sy, k); } }
  }
  // 光照
  const lw = lightCv.width, lh = lightCv.height, sc = lw / VW; lightCx.globalCompositeOperation = 'source-over'; lightCx.fillStyle = (Gfx.zd && Gfx.zd.amb) || '#2a2c40'; lightCx.fillRect(0, 0, lw, lh);
  for (const b of Gfx.blobs || []) { const [bx, by] = w2s(b.x, b.y, tileH(b.x, b.y)), r = b.r * TW * .5 * k; if (bx < -r || bx > VW + r || by < -r || by > VH + r) continue; lightCx.globalCompositeOperation = b.lit ? 'lighter' : 'source-over'; const g = lightCx.createRadialGradient(bx * sc, by * sc, 0, bx * sc, by * sc, r * sc); g.addColorStop(0, b.lit ? `rgba(70,74,96,${b.a})` : `rgba(8,9,16,${b.a + .1})`); g.addColorStop(1, b.lit ? 'rgba(70,74,96,0)' : 'rgba(8,9,16,0)'); lightCx.fillStyle = g; lightCx.save(); lightCx.translate(bx * sc, by * sc); lightCx.scale(1, .5); lightCx.translate(-bx * sc, -by * sc); lightCx.fillRect((bx - r) * sc, (by - r * 2) * sc, r * 2 * sc, r * 4 * sc); lightCx.restore(); }
  lightCx.globalCompositeOperation = 'lighter';
  const lights = Gfx.lights.concat(Gfx.dynLights || []);
  for (const l of lights) {
    if (l.off) continue;
    const [sx, sy] = w2s(l.x, l.y, tileH(l.x, l.y) + (l.z || 1)), r = l.r * TW * .62 * k * (1 + (l.fl || 0) * Math.sin(t * 7 + l.x * 3 + l.y));
    if (sx < -r || sx > VW + r || sy < -r || sy > VH + r) continue;
    const g = lightCx.createRadialGradient(sx * sc, sy * sc, 0, sx * sc, sy * sc, r * sc); g.addColorStop(0, rgba(l.c, l.i == null ? .95 : l.i)); g.addColorStop(.45, rgba(l.c, (l.i == null ? .95 : l.i) * .42)); g.addColorStop(1, rgba(l.c, 0));
    lightCx.fillStyle = g; lightCx.fillRect((sx - r) * sc, (sy - r) * sc, r * 2 * sc, r * 2 * sc);
  }
  cx.globalCompositeOperation = 'multiply'; cx.drawImage(lightCv, 0, 0, VW, VH); cx.globalCompositeOperation = 'source-over';
  // 發光與粒子
  drawParts(false);
  cx.globalCompositeOperation = 'lighter';
  for (const l of lights) { if (l.off || l.noGlow) continue; const [sx, sy] = w2s(l.x, l.y, tileH(l.x, l.y) + (l.z || 1)); const r = (l.gr || 26) * k; if (sx < -r || sx > VW + r || sy < -r || sy > VH + r) continue; cx.globalAlpha = .55 + .1 * Math.sin(t * 9 + l.x); cx.drawImage(glowSprite(l.c), sx - r, sy - r, r * 2, r * 2); }
  cx.globalAlpha = 1;
  for (const u of Gfx.glow) u(cx, k, t);
  cx.globalCompositeOperation = 'source-over';
  drawParts(true);
  // 被擋住的人：淡淡再畫一次
  for (const u of Gfx.units) if (u.xray) { const [sx, sy] = w2s(u.x, u.y, u.z); cx.globalAlpha = .3; u.draw(cx, sx, sy, k, true); cx.globalAlpha = 1; }
  for (const u of Gfx.overlay) u(cx, k, t);
  // 暗角
  const vg = cx.createRadialGradient(VW / 2, VH * .5, Math.min(VW, VH) * .35, VW / 2, VH * .5, Math.max(VW, VH) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,3,8,.6)'); cx.fillStyle = vg; cx.fillRect(0, 0, VW, VH);
}
// 一個人前面有沒有高的東西擋著
function occluded(x, y, z) {
  const m = Gfx.zone; if (!m) return false;
  for (let i = 1; i <= 3; i++) for (const [dx, dy] of [[i, i], [i, i - 1], [i - 1, i]]) { const tx = Math.round(x) + dx, ty = Math.round(y) + dy; if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h || m.floor[ty][tx] === ' ') continue; const dh = m.ht[ty][tx] - z; if (dh >= 2 + (i - 1) * 2) return true; if (i <= 2 && 'PWJRTMZzNU'.includes(m.obj[ty][tx])) { if (i === 1 || 'RMZzW'.includes(m.obj[ty][tx])) return true; } }
  return false;
}
