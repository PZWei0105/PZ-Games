'use strict';
/* ====== 渲染核心：鏡頭、地形、光照、特效、點選 ====== */
const TW = 64, TH = 32;
const CAM = { x: 24, y: 24, z: 1.35, rot: 0, tz: 1.35, shake: 0, fade: null, W: 0, H: 0, dpr: 1 };
let cv, ctx, lightCv, lctx;
const FX = { parts: [], texts: [], shots: [], rings: [] };
let RT = 0; // 渲染時間（秒）

function rotP(x, y, r = CAM.rot) {
  switch (r) {
    case 1: return [N - y, x];
    case 2: return [N - x, N - y];
    case 3: return [y, N - x];
    default: return [x, y];
  }
}
function unrotP(rx, ry, r = CAM.rot) {
  switch (r) {
    case 1: return [ry, N - rx];
    case 2: return [N - rx, N - ry];
    case 3: return [N - ry, rx];
    default: return [rx, ry];
  }
}
// 世界座標 → 螢幕座標（CSS px）
function w2s(x, y, h = 0) {
  const [rx, ry] = rotP(x, y);
  const [cx, cy] = rotP(CAM.x, CAM.y);
  const z = CAM.z;
  return [
    (rx - ry - (cx - cy)) * TW / 2 * z + CAM.W / 2 + (CAM.shakeX || 0),
    (rx + ry - (cx + cy)) * TH / 2 * z - h * z + CAM.H / 2 + (CAM.shakeY || 0),
  ];
}
function s2w(sx, sy) {
  const z = CAM.z;
  const [cx, cy] = rotP(CAM.x, CAM.y);
  const a = (sx - CAM.W / 2) / (TW / 2 * z) + (cx - cy);
  const b = (sy - CAM.H / 2) / (TH / 2 * z) + (cx + cy);
  const rx = (a + b) / 2, ry = (b - a) / 2;
  return unrotP(rx, ry);
}
// 世界方向 → 螢幕方向
function dirToScreen(dx, dy) {
  const [ax, ay] = rotP(dx, dy); const [ox, oy] = rotP(0, 0);
  const rx = ax - ox, ry = ay - oy;
  return [rx - ry, (rx + ry) / 2];
}

function initRender(canvas) {
  cv = canvas; ctx = cv.getContext('2d');
  lightCv = document.createElement('canvas'); lctx = lightCv.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  buildTerrainColors();
}
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = cv.clientWidth || window.innerWidth, H = cv.clientHeight || window.innerHeight;
  CAM.W = W; CAM.H = H; CAM.dpr = dpr;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  lightCv.width = Math.max(1, Math.round(W * dpr / 2)); lightCv.height = Math.max(1, Math.round(H * dpr / 2));
  STARS = null;
}

/* ---------- 地形顏色快取 ---------- */
let TCOL = null;
function buildTerrainColors() {
  if (!G) return;
  TCOL = new Array(N * N);
  const nz = makeNoise(G.seed + 3);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = TERRAIN[G.world.ter[idx(x, y)]];
    const v = fbm(nz, x / 5, y / 5, 2);
    const d = G.world.deco[idx(x, y)] / 255;
    // 量化成 7 階，讓同色格子可以一次畫完
    const q = Math.round(clamp(v * 1.2 - 0.1 + (d - .5) * 0.25, 0, 1) * 6) / 6;
    let c = mix(t.c1, t.c2, q);
    // 地圖邊緣稍暗
    const e = Math.min(x, y, N - 1 - x, N - 1 - y);
    if (e < 3) c = shade(c, -(3 - e) * 0.06);
    TCOL[idx(x, y)] = c;
  }
}

/* ---------- 星空背景 ---------- */
let STARS = null;
function drawSky(dark) {
  const W = CAM.W, H = CAM.H;
  const tide = G.tide.phase === 'active';
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const top = tide ? mix('#1a0f2e', '#2a0f3a', 0.5 + 0.5 * Math.sin(RT * 1.3)) : mix('#2a3550', '#070914', dark);
  g.addColorStop(0, top);
  g.addColorStop(1, mix('#3a3046', '#0b0a16', dark));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (!STARS) { const r = RNG(42); STARS = []; for (let i = 0; i < 160; i++) STARS.push([r() * W, r() * H, r() * 1.4 + 0.3, r() * TAU]); }
  if (dark > 0.05) {
    for (const [x, y, s, p] of STARS) {
      ctx.globalAlpha = dark * (0.35 + 0.35 * Math.sin(RT * 1.7 + p));
      ctx.fillStyle = '#cfe6ff'; ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
    // 雙月
    const sep = G.tide.day ? clamp((G.tide.day - G.t / DAY - 0.77) / 8, 0, 1) : 1;
    const mx = W * 0.82, my = H * 0.13;
    drawMoon(mx - sep * 70 - 6, my + sep * 18, 26, '#e9e3ff', dark);
    drawMoon(mx + sep * 30, my - sep * 10, 15, '#ffd2ec', dark);
    if (tide) { ctx.globalAlpha = 0.3 + 0.2 * Math.sin(RT * 2); ctx.strokeStyle = '#ff7bd8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx - 6, my, 52 + Math.sin(RT * 2) * 4, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  }
}
function drawMoon(x, y, r, col, a) {
  ctx.save(); ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 3);
  g.addColorStop(0, rgba(col, 0.35)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, TAU); ctx.fill();
  const g2 = ctx.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
  g2.addColorStop(0, '#ffffff'); g2.addColorStop(1, col);
  ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba('#8b7fb5', 0.25); ctx.beginPath(); ctx.arc(x + r * .3, y + r * .1, r * .22, 0, TAU); ctx.arc(x - r * .2, y + r * .35, r * .14, 0, TAU); ctx.fill();
  ctx.restore();
}

/* ---------- 地台側面（立體模型感） ---------- */
function drawPlateau() {
  const z = CAM.z, depth = 70 * z;
  // 兩個面向鏡頭的邊：旋轉後 rx=N 邊與 ry=N 邊
  const corners = [[0, 0], [N, 0], [N, N], [0, N]].map(([x, y]) => unrotP(x, y));
  const P = corners.map(([x, y]) => w2s(x, y));
  // P[1]=右, P[2]=下, P[3]=左（旋轉空間）
  const face = (a, b, light) => {
    const g = ctx.createLinearGradient(0, Math.min(a[1], b[1]), 0, Math.max(a[1], b[1]) + depth);
    g.addColorStop(0, light ? '#4a3a5c' : '#3a2d4a');
    g.addColorStop(0.35, light ? '#36294a' : '#2b2038');
    g.addColorStop(1, 'rgba(10,8,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(b[0], b[1] + depth); ctx.lineTo(a[0], a[1] + depth); ctx.closePath(); ctx.fill();
    // 地層紋
    ctx.strokeStyle = 'rgba(255,190,240,0.07)'; ctx.lineWidth = 1;
    for (let k = 1; k < 5; k++) { const o = depth * k / 6; ctx.beginPath(); ctx.moveTo(a[0], a[1] + o); ctx.lineTo(b[0], b[1] + o); ctx.stroke(); }
  };
  face(P[3], P[2], true);
  face(P[2], P[1], false);
  ctx.strokeStyle = 'rgba(190,170,255,0.25)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(P[3][0], P[3][1]); ctx.lineTo(P[2][0], P[2][1]); ctx.lineTo(P[1][0], P[1][1]); ctx.stroke();
}

/* ---------- 可見範圍 ---------- */
function visibleTiles() {
  const pts = [[0, 0], [CAM.W, 0], [0, CAM.H], [CAM.W, CAM.H]].map(([x, y]) => s2w(x, y));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [clamp(Math.floor(x0) - 2, 0, N - 1), clamp(Math.floor(y0) - 2, 0, N - 1), clamp(Math.ceil(x1) + 2, 0, N - 1), clamp(Math.ceil(y1) + 4, 0, N - 1)];
}
function onScreen(sx, sy, m = 80) { return sx > -m && sy > -m * 1.5 && sx < CAM.W + m && sy < CAM.H + m; }

/* ---------- 地形 ---------- */
function tilePath(x, y, grow = 0.6) {
  const a = w2s(x, y), b = w2s(x + 1, y), c = w2s(x + 1, y + 1), d = w2s(x, y + 1);
  const cx = (a[0] + c[0]) / 2, cy = (a[1] + c[1]) / 2;
  const e = (p) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * grow, p[1] + dy / l * grow]; };
  const A = e(a), B = e(b), C2 = e(c), D = e(d);
  ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C2[0], C2[1]); ctx.lineTo(D[0], D[1]); ctx.closePath();
}
function drawTerrain(dark) {
  const [x0, y0, x1, y1] = visibleTiles();
  const W = G.world;
  const z = CAM.z;
  // 依顏色批次
  const groups = new Map();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = idx(x, y);
    const t = W.ter[i];
    if (t === T.WATER) continue;
    const col = TCOL[i];
    let g = groups.get(col); if (!g) { g = []; groups.set(col, g); }
    g.push(x, y);
  }
  for (const [col, list] of groups) {
    ctx.fillStyle = col; ctx.beginPath();
    for (let k = 0; k < list.length; k += 2) tilePath(list[k], list[k + 1]);
    ctx.fill();
  }
  // 水
  const wt = RT * 0.6;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (W.ter[idx(x, y)] !== T.WATER) continue;
    const ph = Math.sin(wt + x * 0.7 + y * 0.45);
    ctx.fillStyle = mix('#1a5470', '#2a8aa5', 0.5 + ph * 0.25);
    ctx.beginPath(); tilePath(x, y); ctx.fill();
  }
  // 細節（近距離才畫）
  if (z > 0.7) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = idx(x, y), t = W.ter[i], d = W.deco[i];
      const [sx, sy] = w2s(x + .5, y + .5);
      if (t === T.WATER) {
        ctx.strokeStyle = `rgba(160,245,255,${0.25 + 0.2 * Math.sin(wt * 2 + d)})`; ctx.lineWidth = 1.2 * z;
        const o = ((RT * 9 + d) % 20 - 10) * z;
        ctx.beginPath(); ctx.moveTo(sx - 9 * z + o * .3, sy + o * .15); ctx.lineTo(sx + 3 * z + o * .3, sy - 3 * z + o * .15); ctx.stroke();
        continue;
      }
      if (d % 5 === 0) {
        // 小石子
        ctx.fillStyle = 'rgba(20,16,30,0.35)';
        ctx.beginPath(); ctx.ellipse(sx + ((d >> 2) % 11 - 5) * z * 2, sy + ((d >> 4) % 7 - 3) * z, 2.2 * z, 1.2 * z, 0, 0, TAU); ctx.fill();
      }
      if ((t === T.SOIL || t === T.MOSS) && d % 3 === 1) {
        // 外星草
        const gx = sx + ((d >> 3) % 13 - 6) * z * 1.6, gy = sy + ((d >> 1) % 9 - 4) * z;
        ctx.strokeStyle = t === T.MOSS ? '#3f8a8f' : (d % 2 ? '#8a3f6d' : '#6d4a8f'); ctx.lineWidth = 1.3 * z;
        const sw = Math.sin(RT * 1.5 + d) * 1.2 * z;
        ctx.beginPath();
        ctx.moveTo(gx, gy); ctx.quadraticCurveTo(gx - 1 * z, gy - 4 * z, gx - 2 * z + sw, gy - 7 * z);
        ctx.moveTo(gx + 1.5 * z, gy); ctx.quadraticCurveTo(gx + 2 * z, gy - 4 * z, gx + 3.5 * z + sw, gy - 6 * z);
        ctx.stroke();
      }
      if (t === T.BURNT && d % 4 === 0) {
        ctx.strokeStyle = 'rgba(255,120,60,0.15)'; ctx.lineWidth = 1 * z;
        ctx.beginPath(); ctx.moveTo(sx - 8 * z, sy); ctx.lineTo(sx - 2 * z, sy + 2 * z); ctx.lineTo(sx + 6 * z, sy - 1 * z); ctx.stroke();
      }
      if (t === T.GLASS && d % 3 === 0) {
        ctx.fillStyle = 'rgba(255,140,220,0.35)';
        ctx.beginPath(); ctx.moveTo(sx + 2 * z, sy - 6 * z); ctx.lineTo(sx + 4 * z, sy); ctx.lineTo(sx, sy + 1 * z); ctx.closePath(); ctx.fill();
      }
    }
  }
}
// 迷霧
function drawFog() {
  const [x0, y0, x1, y1] = visibleTiles();
  const f = G.world.fog;
  ctx.fillStyle = 'rgba(8,8,20,0.86)';
  ctx.beginPath();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!f[idx(x, y)]) tilePath(x, y, 1);
  ctx.fill();
  // 邊緣柔化
  ctx.fillStyle = 'rgba(8,8,20,0.38)';
  ctx.beginPath();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!f[idx(x, y)]) continue;
    if ((x > 0 && !f[idx(x - 1, y)]) || (y > 0 && !f[idx(x, y - 1)]) || (x < N - 1 && !f[idx(x + 1, y)]) || (y < N - 1 && !f[idx(x, y + 1)])) tilePath(x, y, 0.5);
  }
  ctx.fill();
}

/* ---------- 發光精靈 ---------- */
const GLOWS = new Map();
function glowSprite(col) {
  let s = GLOWS.get(col);
  if (s) return s;
  s = document.createElement('canvas'); s.width = s.height = 64;
  const g = s.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, rgba(col, 1)); gr.addColorStop(0.25, rgba(col, 0.55)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  GLOWS.set(col, s); return s;
}
function glow(x, y, r, col, a = 1) {
  if (a <= 0.01) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}
let HOLE = null;
function holeSprite() {
  if (HOLE) return HOLE;
  HOLE = document.createElement('canvas'); HOLE.width = HOLE.height = 64;
  const g = HOLE.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return HOLE;
}

/* ---------- 光照 ---------- */
const LIGHTS = []; // 每幀收集 {x,y,r(格),col,a}
function addLight(x, y, r, col, a = 1, h = 0) { LIGHTS.push({ x, y, r, col, a, h }); }
function drawLighting(dark) {
  const tide = G.tide.phase === 'active';
  const storm = G.weather && G.weather.type === 'storm';
  if (dark < 0.02 && !storm) return;
  const s = 0.5 * CAM.dpr;
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, lightCv.width, lightCv.height);
  let col = tide ? mix('#140626', '#2a0838', 0.5 + 0.5 * Math.sin(RT * 2.2)) : '#070b22';
  let a = dark * (tide ? 0.8 : 0.74);
  if (storm) { col = mix(col, '#4a2a12', 0.6); a = Math.max(a, 0.35); }
  lctx.fillStyle = rgba(col, a);
  lctx.fillRect(0, 0, lightCv.width, lightCv.height);
  lctx.globalCompositeOperation = 'destination-out';
  const hs = holeSprite();
  for (const L of LIGHTS) {
    const [sx, sy] = w2s(L.x, L.y, L.h);
    const r = L.r * TW * 0.5 * CAM.z * s;
    lctx.globalAlpha = clamp(L.a, 0, 1);
    lctx.drawImage(hs, sx * s - r, sy * s - r * 0.62, r * 2, r * 1.24);
  }
  lctx.globalAlpha = 1;
  ctx.drawImage(lightCv, 0, 0, CAM.W, CAM.H);
  // 加色光暈
  ctx.globalCompositeOperation = 'lighter';
  for (const L of LIGHTS) {
    if (!L.col) continue;
    const [sx, sy] = w2s(L.x, L.y, L.h);
    const r = L.r * TW * 0.42 * CAM.z;
    ctx.globalAlpha = clamp(L.a * dark * 0.32, 0, 1);
    ctx.drawImage(glowSprite(L.col), sx - r, sy - r * 0.62, r * 2, r * 1.24);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/* ---------- 特效 ---------- */
function fxText(x, y, text, color = '#fff') { FX.texts.push({ x, y, text, color, life: 1.6, max: 1.6 }); }
function part(x, y, h, vx, vy, vh, life, color, size, kind) { if (FX.parts.length < 900) FX.parts.push({ x, y, h, vx, vy, vh, life, max: life, color, size, kind }); }
function fxBurst(x, y, color, n = 16, k = 1) {
  for (let i = 0; i < n; i++) { const a = R() * TAU, s = (0.6 + R() * 1.8) * k; part(x, y, 8, Math.cos(a) * s, Math.sin(a) * s, 40 + R() * 70 * k, 0.6 + R() * 0.7, color, 2 + R() * 3 * k, 'glow'); }
  FX.rings.push({ x, y, life: 0.6, max: 0.6, color, r: 1.2 * k });
}
function fxSpark(x, y) { for (let i = 0; i < 4; i++) { const a = R() * TAU; part(x, y, 18 + R() * 14, Math.cos(a) * 1.2, Math.sin(a) * 1.2, 20 + R() * 40, 0.35 + R() * 0.3, R() < .5 ? '#ffe28a' : '#ffffff', 1.6, 'spark'); } }
function fxDust(x, y, type) { const col = type === 'tree' ? '#c08bff' : type === 'bush' ? '#ffb347' : type === 'crystal' ? '#ff9be0' : '#b8c0cc'; for (let i = 0; i < 3; i++) part(x + (R() - .5) * .5, y + (R() - .5) * .5, 6, (R() - .5) * .6, (R() - .5) * .6, 14 + R() * 18, 0.5 + R() * 0.4, col, 2 + R() * 2, 'dust'); }
function fxSmoke(x, y, h = 30, col = '#8a8496') { part(x + (R() - .5) * .3, y + (R() - .5) * .3, h, (R() - .2) * .22, (R() - .7) * .22, 18 + R() * 12, 2.6 + R() * 1.6, col, 4 + R() * 3, 'smoke'); }
function fxShot(x1, y1, x2, y2, hit, color, turret) {
  FX.shots.push({ x1, y1, x2, y2, life: 0.14, max: 0.14, color, hit, h1: turret ? 20 : 17 });
  if (hit) for (let i = 0; i < 3; i++) part(x2, y2, 10, (R() - .5) * 1.5, (R() - .5) * 1.5, 20 + R() * 30, 0.25, color, 1.6, 'spark');
}
function fxBite(x, y, col) { for (let i = 0; i < 3; i++) part(x + (R() - .5) * .4, y + (R() - .5) * .4, 12, (R() - .5), (R() - .5), 25, 0.3, col, 2, 'spark'); }
function fxMeteor(x, y) {
  FX.rings.push({ x, y, life: 0.9, max: 0.9, color: '#ffb36b', r: 2.6 });
  for (let i = 0; i < 26; i++) { const a = R() * TAU, s = 0.5 + R() * 2.4; part(x, y, 4, Math.cos(a) * s, Math.sin(a) * s, 40 + R() * 100, 0.8 + R() * 0.8, R() < .5 ? '#ffb36b' : '#ffe9b0', 2 + R() * 3, 'glow'); }
  for (let i = 0; i < 10; i++) fxSmoke(x, y, 6, '#6a5a50');
  FX.meteor = { x, y, t: 0 };
  CAM.shake = Math.max(CAM.shake, 0.6);
  if (typeof SFX !== 'undefined') SFX.boom();
}
function stepFX(dt) {
  for (const p of FX.parts) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.h += p.vh * dt;
    if (p.kind === 'smoke') { p.vh *= 0.99; p.size += dt * 4; }
    else if (p.kind !== 'float') { p.vh -= 160 * dt; if (p.h < 0) { p.h = 0; p.vh *= -0.3; p.vx *= .6; p.vy *= .6; } }
  }
  FX.parts = FX.parts.filter(p => p.life > 0);
  for (const t of FX.texts) t.life -= dt;
  FX.texts = FX.texts.filter(t => t.life > 0);
  for (const s of FX.shots) s.life -= dt;
  FX.shots = FX.shots.filter(s => s.life > 0);
  for (const r of FX.rings) r.life -= dt;
  FX.rings = FX.rings.filter(r => r.life > 0);
  if (CAM.shake > 0) { CAM.shake = Math.max(0, CAM.shake - dt * 1.8); CAM.shakeX = (R() - .5) * CAM.shake * 10; CAM.shakeY = (R() - .5) * CAM.shake * 8; } else { CAM.shakeX = CAM.shakeY = 0; }
}
function drawFXWorld(dark) {
  const z = CAM.z;
  for (const r of FX.rings) {
    const k = 1 - r.life / r.max;
    const [sx, sy] = w2s(r.x, r.y);
    ctx.strokeStyle = rgba(r.color, (1 - k) * 0.8); ctx.lineWidth = 3 * z * (1 - k) + 0.5;
    ctx.beginPath(); ctx.ellipse(sx, sy, r.r * k * TW * 0.5 * z, r.r * k * TH * 0.5 * z, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const s of FX.shots) {
    const [ax, ay] = w2s(s.x1, s.y1, s.h1); const [bx, by] = w2s(s.x2, s.y2, 10);
    const a = s.life / s.max;
    ctx.strokeStyle = rgba(s.color, a); ctx.lineWidth = 2.2 * z;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    glow(ax, ay, 12 * z, s.color, a);
    if (s.hit) glow(bx, by, 10 * z, s.color, a);
  }
  for (const p of FX.parts) {
    if (p.kind === 'smoke') continue;
    const [sx, sy] = w2s(p.x, p.y, p.h);
    const a = clamp(p.life / p.max, 0, 1);
    if (p.kind === 'glow' || p.kind === 'spark') { glow(sx, sy, p.size * 2.4 * z, p.color, a); }
    else { ctx.globalAlpha = a * 0.8; ctx.fillStyle = p.color; ctx.fillRect(sx - p.size * z / 2, sy - p.size * z / 2, p.size * z, p.size * z); ctx.globalAlpha = 1; }
  }
  ctx.globalCompositeOperation = 'source-over';
}
function drawSmoke() {
  const z = CAM.z;
  for (const p of FX.parts) {
    if (p.kind !== 'smoke') continue;
    const [sx, sy] = w2s(p.x, p.y, p.h);
    const k = clamp(p.life / p.max, 0, 1);
    const a = Math.min(k, (1 - k) * 4) * 0.22;
    ctx.fillStyle = rgba(p.color, a);
    ctx.beginPath(); ctx.arc(sx, sy, p.size * z, 0, TAU); ctx.fill();
  }
}
function drawTexts() {
  ctx.textAlign = 'center';
  for (const t of FX.texts) {
    const k = 1 - t.life / t.max;
    const [sx, sy] = w2s(t.x, t.y, 44 + k * 26);
    ctx.globalAlpha = clamp(t.life / t.max * 1.6, 0, 1);
    ctx.font = `700 ${Math.round(12 + 2 * Math.min(CAM.z, 1.6))}px "Noto Sans TC", sans-serif`;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,10,24,0.85)'; ctx.strokeText(t.text, sx, sy);
    ctx.fillStyle = t.color; ctx.fillText(t.text, sx, sy);
  }
  ctx.globalAlpha = 1;
}

/* ---------- 點選 ---------- */
function pickAt(sx, sy) {
  // 殖民者（以螢幕距離）
  let best = null, bd = 34 * Math.max(0.8, CAM.z);
  for (const c of G.colonists) {
    if (c.dead || c.away || c.hidden) continue;
    const [px, py] = w2s(c.x, c.y, 24);
    const d = Math.hypot(px - sx, py - sy);
    if (d < bd) { bd = d; best = { kind: 'c', o: c }; }
  }
  if (best) return best;
  for (const b of G.beasts) {
    if (b.dead || !explored(Math.floor(b.x), Math.floor(b.y))) continue;
    const [px, py] = w2s(b.x, b.y, 10 * BEAST[b.type].size);
    const d = Math.hypot(px - sx, py - sy);
    if (d < 26 * CAM.z * Math.max(1, BEAST[b.type].size)) return { kind: 'beast', o: b };
  }
  // 建築：檢查點擊的格子，以及往下偏移（高建築點到屋頂）
  for (let h = 0; h <= 60; h += 10) {
    const [wx, wy] = s2w(sx, sy + h * CAM.z);
    const tx = Math.floor(wx), ty = Math.floor(wy);
    if (!inMap(tx, ty)) continue;
    const b = bAt(tx, ty);
    if (b && explored(tx, ty)) return { kind: 'b', o: b };
    const n = nodeAt(tx, ty);
    if (n && explored(tx, ty) && h <= 30) return { kind: 'n', o: n };
  }
  const [wx, wy] = s2w(sx, sy);
  if (inMap(Math.floor(wx), Math.floor(wy))) return { kind: 'tile', x: Math.floor(wx), y: Math.floor(wy) };
  return null;
}
function centerOn(x, y, z) { CAM.x = clamp(x, 0, N); CAM.y = clamp(y, 0, N); if (z) CAM.tz = z; }
function clampCam() { CAM.x = clamp(CAM.x, 2, N - 2); CAM.y = clamp(CAM.y, 2, N - 2); }
