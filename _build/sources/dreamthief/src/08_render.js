'use strict';
/* ====== 繪圖：鏡頭、地板、2.5D 牆、光影、特效 ====== */
const WH = 34;   // 牆高
const R = { cv: null, ctx: null, w: 0, h: 0, dpr: 1, zoom: 1, cam: { x: 0, y: 0 }, lcv: null, lctx: null, ls: .5, cache: {}, cacheKey: '', t: 0, hurt: 0, stars: [], miniT: 0 };

function initRender() {
  R.cv = $('#cv'); R.ctx = R.cv.getContext('2d');
  R.lcv = document.createElement('canvas'); R.lctx = R.lcv.getContext('2d');
  for (let i = 0; i < 160; i++) R.stars.push({ x: Math.random() * 4000, y: Math.random() * 4000, s: Math.random() * 1.6 + .3, p: Math.random() * 9, c: Math.random() });
  resize(); addEventListener('resize', resize);
}
function resize() {
  R.dpr = Math.min(2, window.devicePixelRatio || 1);
  R.w = innerWidth; R.h = innerHeight;
  R.cv.width = Math.round(R.w * R.dpr); R.cv.height = Math.round(R.h * R.dpr);
  R.zoom = clamp(Math.min(R.w / (8.1 * T), R.h / (9 * T)), .72, 1.55);
  R.lcv.width = Math.ceil(R.w * R.ls); R.lcv.height = Math.ceil(R.h * R.ls);
  R.cacheKey = '';
}
const ZS = () => R.zoom * R.dpr;

/* ---------- 快取：地板、牆、光暈 ---------- */
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
const glowC = {};
function glow(c) {
  if (glowC[c]) return glowC[c];
  const cv = mkCanvas(64, 64), g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, rgba(c, 1)); gr.addColorStop(.25, rgba(c, .55)); gr.addColorStop(.6, rgba(c, .14)); gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return glowC[c] = cv;
}
function hash2(x, y) { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
function buildCache() {
  const th = W.ch.th, s = ZS(), key = W.chi + ':' + s.toFixed(3);
  if (R.cacheKey === key) return;
  R.cacheKey = key; R.cache = { floor: [], cor: [], water: [], wtop: [], wface: [] };
  const sz = Math.ceil(T * s);
  for (let v = 0; v < 4; v++) {
    R.cache.floor.push(paintTile(sz, th.floor, th.fstyle, v, false));
    R.cache.cor.push(paintTile(sz, th.cor, th.cstyle, v, true));
    R.cache.water.push(paintTile(sz, ['#123b46', '#16444f', '#2e7c86'], 'water', v));
    R.cache.wtop.push(paintWallTop(sz, th, v));
  }
  const fh = Math.ceil(WH * s);
  const styles = th.wstyle === 'collage' ? ['office', 'panel', 'tile', 'glass'] : [th.wstyle];
  for (let v = 0; v < 6; v++) R.cache.wface.push(paintWallFace(sz, fh, th, styles[v % styles.length], v));
}
function paintTile(sz, cols, style, v, cor) {
  const c = mkCanvas(sz, sz), g = c.getContext('2d'), k = sz / T;
  g.scale(k, k);
  const [a, b, l] = cols;
  g.fillStyle = v % 2 ? a : mixHex(a, b, .5); g.fillRect(0, 0, T, T);
  const R0 = RNG(v * 99 + style.length * 7 + (cor ? 3 : 0));
  if (style === 'carpet') {
    for (let i = 0; i < 70; i++) { g.fillStyle = rgba(R0.chance(.5) ? '#ffffff' : '#000000', R0.range(.015, .05)); g.fillRect(R0.range(0, T), R0.range(0, T), R0.range(1, 3), R0.range(1, 3)); }
    g.strokeStyle = rgba(l, .9); g.lineWidth = 1.2; g.strokeRect(.6, .6, T - 1.2, T - 1.2);
    if (v === 2) { g.fillStyle = rgba('#000', .08); g.fillRect(6, 6, T - 12, T - 12); }
  } else if (style === 'lino') {
    g.fillStyle = rgba('#ffffff', .03); g.fillRect(0, 0, T, T / 2);
    g.strokeStyle = rgba(l, .7); g.lineWidth = 1; g.beginPath(); g.moveTo(0, T / 2); g.lineTo(T, T / 2); g.stroke();
    for (let i = 0; i < 30; i++) { g.fillStyle = rgba('#000', R0.range(.03, .07)); g.fillRect(R0.range(0, T), R0.range(0, T), 2, 1); }
  } else if (style === 'wood') {
    const pw = 12;
    for (let i = 0; i < 4; i++) { const yy = i * pw; g.fillStyle = shade(i % 2 ? a : b, R0.range(-.08, .06)); g.fillRect(0, yy, T, pw); g.fillStyle = rgba('#000', .35); g.fillRect(0, yy + pw - 1, T, 1); const cut = ((i * 17 + v * 11) % 40) + 4; g.fillRect(cut, yy, 1, pw);
      for (let k2 = 0; k2 < 3; k2++) { g.strokeStyle = rgba('#000', .12); g.beginPath(); g.moveTo(0, yy + 3 + k2 * 3); g.bezierCurveTo(T * .3, yy + 2 + k2 * 3 + R0.range(-1, 1), T * .7, yy + 4 + k2 * 3, T, yy + 3 + k2 * 3); g.stroke(); } }
  } else if (style === 'runner') {
    g.fillStyle = a; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 40; i++) { g.fillStyle = rgba('#000', R0.range(.03, .08)); g.fillRect(R0.range(0, T), R0.range(0, T), 2, 2); }
    g.strokeStyle = rgba(l, .55); g.lineWidth = 1.5; g.strokeRect(4, 4, T - 8, T - 8);
    g.fillStyle = rgba(l, .35); g.beginPath(); g.moveTo(T / 2, 14); g.lineTo(T - 14, T / 2); g.lineTo(T / 2, T - 14); g.lineTo(14, T / 2); g.closePath(); g.fill();
  } else if (style === 'tile') {
    const n = 3, s2 = T / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = shade(a, R0.range(-.06, .05)); g.fillRect(x * s2 + .6, y * s2 + .6, s2 - 1.2, s2 - 1.2); g.fillStyle = rgba('#fff', .06); g.fillRect(x * s2 + 1, y * s2 + 1, s2 - 2, 2); }
    g.fillStyle = rgba(l, .5); for (let i = 0; i <= n; i++) { g.fillRect(i * s2 - .6, 0, 1.2, T); g.fillRect(0, i * s2 - .6, T, 1.2); }
    if (v === 3) { g.fillStyle = rgba('#3a1010', .18); g.beginPath(); g.ellipse(30, 30, 9, 5, .4, 0, TAU); g.fill(); }
  } else if (style === 'stripe') {
    g.fillStyle = a; g.fillRect(0, 0, T, T); g.fillStyle = rgba(l, .5); g.fillRect(0, T * .44, T, T * .12);
    g.fillStyle = rgba('#fff', .04); g.fillRect(0, 0, T, T * .3);
  } else if (style === 'marble') {
    g.fillStyle = a; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 4; i++) { g.strokeStyle = rgba(l, R0.range(.12, .3)); g.lineWidth = R0.range(.4, 1.3); g.beginPath(); let x = R0.range(-10, T), y = R0.range(0, T); g.moveTo(x, y); for (let k2 = 0; k2 < 4; k2++) { x += R0.range(5, 16); y += R0.range(-8, 8); g.lineTo(x, y); } g.stroke(); }
    const gr = g.createLinearGradient(0, 0, T, T); gr.addColorStop(0, rgba('#fff', .06)); gr.addColorStop(.5, rgba('#fff', 0)); gr.addColorStop(1, rgba('#fff', .03)); g.fillStyle = gr; g.fillRect(0, 0, T, T);
    g.strokeStyle = rgba('#000', .35); g.lineWidth = .8; g.strokeRect(.4, .4, T - .8, T - .8);
  } else if (style === 'wet') {
    g.fillStyle = a; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 60; i++) { g.fillStyle = rgba(R0.chance(.5) ? '#fff' : '#000', R0.range(.02, .06)); g.fillRect(R0.range(0, T), R0.range(0, T), R0.range(1, 2.5), R0.range(1, 2.5)); }
    if (v % 2 === 0) { g.fillStyle = rgba('#9fdcff', .07); g.beginPath(); g.ellipse(R0.range(14, 34), R0.range(14, 34), R0.range(8, 14), R0.range(4, 7), 0, 0, TAU); g.fill(); }
    g.strokeStyle = rgba('#000', .25); g.strokeRect(.5, .5, T - 1, T - 1);
  } else if (style === 'water') {
    g.fillStyle = a; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 5; i++) { g.strokeStyle = rgba(l, R0.range(.15, .35)); g.lineWidth = 1; g.beginPath(); const y = R0.range(4, T - 4), x = R0.range(0, T - 16); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 3, x + 16, y); g.stroke(); }
  }
  return c;
}
function paintWallTop(sz, th, v) {
  const c = mkCanvas(sz, sz), g = c.getContext('2d'), k = sz / T; g.scale(k, k);
  g.fillStyle = th.wtop; g.fillRect(0, 0, T, T);
  const R0 = RNG(v * 31 + 5);
  for (let i = 0; i < 26; i++) { g.fillStyle = rgba(R0.chance(.5) ? '#fff' : '#000', R0.range(.02, .06)); g.fillRect(R0.range(0, T), R0.range(0, T), R0.range(1, 4), R0.range(1, 3)); }
  if (th.wstyle === 'glass') { g.fillStyle = rgba('#9fe7ff', .07); g.fillRect(0, 0, T, T); }
  return c;
}
function paintWallFace(sz, fh, th, style, v) {
  const c = mkCanvas(sz, fh), g = c.getContext('2d'), k = sz / T; g.scale(k, k);
  const H = WH, R0 = RNG(v * 13 + 77);
  const base = style === th.wstyle ? th.wface : { office: '#58607e', panel: '#5a3622', tile: '#7d9a97', glass: '#155066' }[style];
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, shade(base, .1)); gr.addColorStop(1, shade(base, -.35));
  g.fillStyle = gr; g.fillRect(0, 0, T, H);
  if (style === 'office') {
    g.fillStyle = rgba('#000', .25); g.fillRect(0, H - 5, T, 5);
    g.fillStyle = rgba('#fff', .05); g.fillRect(0, 0, T, 2);
    if (v % 3 === 0) { g.fillStyle = rgba('#000', .3); g.fillRect(T / 2 - .5, 2, 1, H - 7); }
    if (v === 4) { g.fillStyle = '#cfd6e6'; g.fillRect(14, 8, 12, 9); g.fillStyle = '#5a6176'; g.fillRect(16, 10, 8, 1); g.fillRect(16, 12, 6, 1); g.fillRect(16, 14, 7, 1); }
  } else if (style === 'panel') {
    g.strokeStyle = rgba(th.trim || '#c79a4a', .55); g.lineWidth = 1; g.strokeRect(5, 5, T - 10, H - 14);
    g.fillStyle = rgba('#c79a4a', .55); g.fillRect(0, H - 6, T, 1.5); g.fillStyle = rgba('#000', .35); g.fillRect(0, H - 4.5, T, 4.5);
    if (v === 2) { g.fillStyle = rgba('#000', .4); g.fillRect(16, 7, 16, 14); g.strokeStyle = rgba('#c79a4a', .8); g.strokeRect(16, 7, 16, 14); g.fillStyle = rgba('#7a4a30', .7); g.fillRect(18, 9, 12, 10); }
  } else if (style === 'tile') {
    const s2 = 8; for (let y = 0; y < H - 6; y += s2) for (let x = 0; x < T; x += s2) { g.fillStyle = shade(base, R0.range(-.05, .08)); g.fillRect(x + .5, y + .5, s2 - 1, s2 - 1); }
    g.fillStyle = rgba('#3fa39a', .85); g.fillRect(0, H * .55, T, 3);
    g.fillStyle = rgba('#000', .3); g.fillRect(0, H - 5, T, 5);
  } else if (style === 'glass') {
    const gg = g.createLinearGradient(0, 0, T, H); gg.addColorStop(0, rgba('#0e4a5c', .95)); gg.addColorStop(1, rgba('#041e29', .98)); g.fillStyle = gg; g.fillRect(0, 0, T, H);
    for (let i = 0; i < 4; i++) { g.fillStyle = rgba('#bff6ff', R0.range(.2, .5)); g.beginPath(); g.arc(R0.range(4, T - 4), R0.range(4, H - 6), R0.range(.8, 2), 0, TAU); g.fill(); }
    g.strokeStyle = rgba('#a9e6f0', .5); g.lineWidth = 1; g.beginPath(); g.moveTo(0, .5); g.lineTo(T, .5); g.stroke();
    g.fillStyle = rgba('#c9a35b', .7); g.fillRect(0, H - 4, T, 4);
    g.fillStyle = rgba('#fff', .08); g.beginPath(); g.moveTo(6, 0); g.lineTo(14, 0); g.lineTo(4, H); g.lineTo(-4, H); g.fill();
  }
  if (th.wstyle === 'collage') { g.fillStyle = rgba('#000', .25); g.fillRect(0, 0, T, H); g.fillStyle = rgba('#ff5d6a', .25); g.fillRect(0, H - 3, T, 1); }
  return c;
}

/* ---------- 主繪圖 ---------- */
function renderDive(dt) {
  const ctx = R.ctx, p = W.players[0];
  R.t += dt;
  buildCache();
  // 鏡頭
  const look = 26;
  const tx = p.x + (p.vx / (3.75 * T)) * look, ty = p.y - 26 + (p.vy / (3.75 * T)) * look;
  R.cam.x = lerp(R.cam.x || tx, tx, Math.min(1, dt * 7)); R.cam.y = lerp(R.cam.y || ty, ty, Math.min(1, dt * 7));
  if (R.snap) { R.cam.x = tx; R.cam.y = ty; R.snap = false; }
  const sh = W.shake * (G.settings.shake ? 1 : 0), shx = fx(-sh, sh), shy = fx(-sh, sh);
  const z = R.zoom, s = ZS();
  const ox = R.w / 2 - R.cam.x * z + shx, oy = R.h / 2 - R.cam.y * z + shy;
  // 背景虛空
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const th = W.ch.th;
  const bg = ctx.createLinearGradient(0, 0, 0, R.cv.height); bg.addColorStop(0, th.void[1]); bg.addColorStop(1, th.void[0]);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, R.cv.width, R.cv.height);
  for (const st of R.stars) { const x = ((st.x - R.cam.x * .25) % R.w + R.w) % R.w, y = ((st.y - R.cam.y * .25) % R.h + R.h) % R.h; ctx.fillStyle = rgba(th.fog, .15 + .25 * Math.sin(R.t * 1.3 + st.p) ** 2); ctx.fillRect(x * R.dpr, y * R.dpr, st.s * R.dpr, st.s * R.dpr); }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) { const st = R.stars[i * 11]; const x = ((st.x * 1.7 + R.t * (6 + i * 2) - R.cam.x * .12) % (R.w + 400) + R.w + 400) % (R.w + 400) - 200, y = ((st.y * 1.3 - R.cam.y * .12) % (R.h + 400) + R.h + 400) % (R.h + 400) - 200, r = (160 + i * 30) * R.dpr; ctx.globalAlpha = .07; ctx.drawImage(glow(th.fog), x * R.dpr - r, y * R.dpr - r, r * 2, r * 2); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.setTransform(s, 0, 0, s, ox * R.dpr, oy * R.dpr);
  // 可見範圍
  const vx0 = Math.floor((R.cam.x - R.w / 2 / z) / T) - 1, vx1 = Math.ceil((R.cam.x + R.w / 2 / z) / T) + 1;
  const vy0 = Math.floor((R.cam.y - R.h / 2 / z) / T) - 1, vy1 = Math.ceil((R.cam.y + R.h / 2 / z + WH) / T) + 1;
  const m = W.m, tiles = m.tiles;
  // 地板
  for (let y = Math.max(0, vy0); y <= Math.min(m.h - 1, vy1); y++) for (let x = Math.max(0, vx0); x <= Math.min(m.w - 1, vx1); x++) {
    const k = y * m.w + x; if (!W.seen[k]) continue;
    const t = tiles[k];
    if (t === TF || t === TS) { const v = (hash2(x, y) * 4) | 0; ctx.drawImage(m.roomOf[k] < 0 ? R.cache.cor[v] : R.cache.floor[v], x * T, y * T, T + .5, T + .5); }
    else if (t === TWA) { ctx.drawImage(R.cache.water[(hash2(x, y) * 4) | 0], x * T, y * T, T + .5, T + .5); }
  }
  drawWaterShine(ctx, vx0, vx1, vy0, vy1);
  drawFloorFx(ctx);
  drawTeles(ctx, false);
  // 牆與物件（逐列）
  const items = collectDrawables(vx0, vx1, vy0, vy1);
  items.sort((a, b) => a.y - b.y);
  let ii = 0;
  for (let y = Math.max(0, vy0); y <= Math.min(m.h - 1, vy1); y++) {
    for (let x = Math.max(0, vx0); x <= Math.min(m.w - 1, vx1); x++) { const k = y * m.w + x; if (tiles[k] === TW && W.seen[k]) drawWall(ctx, x, y); }
    while (ii < items.length && items[ii].y < (y + 1) * T) { items[ii].f(ctx); ii++; }
  }
  while (ii < items.length) { items[ii].f(ctx); ii++; }
  drawTeles(ctx, true);
  drawBullets(ctx);
  // 光影
  renderLight(ox, oy, z);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(R.lcv, 0, 0, R.cv.width, R.cv.height);
  ctx.globalCompositeOperation = 'source-over';
  // 記憶中的區域變暗
  ctx.setTransform(s, 0, 0, s, ox * R.dpr, oy * R.dpr);
  ctx.fillStyle = 'rgba(4,3,10,.5)'; ctx.beginPath();
  for (let y = Math.max(0, vy0); y <= Math.min(m.h - 1, vy1); y++) for (let x = Math.max(0, vx0); x <= Math.min(m.w - 1, vx1); x++) { const k = y * m.w + x; if (W.seen[k] && !W.vis[k]) ctx.rect(x * T, y * T - (tiles[k] === TW ? WH : 0), T, T + (tiles[k] === TW ? 0 : 0)); }
  ctx.fill();
  // 走過的地方留下牆的輪廓
  const th2 = W.ch.th;
  for (let y = Math.max(0, vy0); y <= Math.min(m.h - 1, vy1); y++) for (let x = Math.max(0, vx0); x <= Math.min(m.w - 1, vx1); x++) {
    const k = y * m.w + x; if (tiles[k] !== TW || !W.seen[k]) continue;
    ctx.fillStyle = rgba(th2.wedge, W.vis[k] ? .16 : .1);
    const X = x * T, Y = y * T - WH;
    if (y > 0 && tiles[k - m.w] !== TW) ctx.fillRect(X, Y, T, 1.5);
    if (y + 1 < m.h && tiles[k + m.w] !== TW) ctx.fillRect(X, Y + T - 1.5, T, 1.5);
    if (x > 0 && tiles[k - 1] !== TW) ctx.fillRect(X, Y, 1.5, T);
    if (x + 1 < m.w && tiles[k + 1] !== TW) ctx.fillRect(X + T - 1.5, Y, 1.5, T);
  }
  // 發光層
  ctx.globalCompositeOperation = 'lighter';
  drawEmissive(ctx);
  ctx.globalCompositeOperation = 'source-over';
  drawOverlayFx(ctx);
  // 螢幕效果
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawScreenFx(ctx, dt);
  drawJoystick(ctx);
  R.miniT -= dt; if (R.miniT <= 0) { R.miniT = .25; drawMini(); }
}

function drawWall(ctx, x, y) {
  const m = W.m, k = y * m.w + x;
  const below = y + 1 < m.h ? m.tiles[k + m.w] : TV, above = y > 0 ? m.tiles[k - m.w] : TV;
  const left = x > 0 ? m.tiles[k - 1] : TV, right = x + 1 < m.w ? m.tiles[k + 1] : TV;
  const X = x * T, Y = y * T;
  const v = (hash2(x, y) * 4) | 0;
  ctx.drawImage(R.cache.wtop[v], X, Y - WH, T + .5, T + .5);
  const th = W.ch.th;
  // 邊緣高光
  ctx.fillStyle = th.wedge;
  if (above !== TW) ctx.fillRect(X, Y - WH, T, 2);
  if (left !== TW) ctx.fillRect(X, Y - WH, 2, T);
  if (right !== TW) ctx.fillRect(X + T - 2, Y - WH, 2, T);
  if (below !== TW) {
    ctx.drawImage(R.cache.wface[(hash2(y, x) * R.cache.wface.length) | 0], X, Y + T - WH, T + .5, WH);
    ctx.fillStyle = rgba(th.wedge, .9); ctx.fillRect(X, Y + T - WH - 1, T, 1.5);
    if (W.chi === 3 && hash2(x * 3, y) < .4) drawFish(ctx, X, Y + T - WH, x, y);
  }
}
function drawFish(ctx, X, Y, x, y) {
  const t = R.t * (.3 + hash2(x, y) * .5) + hash2(y, x) * 10, fxp = ((t * 18) % (T + 30)) - 15;
  if (fxp < 0 || fxp > T) return;
  ctx.fillStyle = rgba('#7ff3ff', .35); const fy = Y + 8 + hash2(x, y * 2) * 16;
  ctx.beginPath(); ctx.ellipse(X + fxp, fy, 5, 2.2, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(X + fxp - 5, fy); ctx.lineTo(X + fxp - 9, fy - 3); ctx.lineTo(X + fxp - 9, fy + 3); ctx.fill();
}
function drawWaterShine(ctx, vx0, vx1, vy0, vy1) {
  if (W.chi !== 2 && W.chi !== 4) return;
  const m = W.m;
  ctx.strokeStyle = 'rgba(160,240,255,.22)'; ctx.lineWidth = 1.2;
  for (let y = Math.max(0, vy0); y <= Math.min(m.h - 1, vy1); y++) for (let x = Math.max(0, vx0); x <= Math.min(m.w - 1, vx1); x++) {
    const k = y * m.w + x; if (m.tiles[k] !== TWA || !W.vis[k]) continue;
    const ph = R.t * 1.4 + hash2(x, y) * 6;
    ctx.beginPath(); const yy = y * T + 12 + Math.sin(ph) * 5; ctx.moveTo(x * T + 6, yy); ctx.quadraticCurveTo(x * T + 18, yy - 4, x * T + 30, yy); ctx.stroke();
  }
}

/* 收集要排序的物件 */
function collectDrawables(vx0, vx1, vy0, vy1) {
  const out = [], m = W.m, p0 = W.players[0];
  const inView = (x, y, pad = 2) => x > (vx0 - pad) * T && x < (vx1 + pad) * T && y > (vy0 - pad) * T && y < (vy1 + pad) * T;
  const visAt = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return false; return W.vis[ty * m.w + tx] === 1; };
  const seenAt = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return false; return W.seen[ty * m.w + tx] === 1; };
  for (const c of m.containers) if (inView(c.x, c.y) && seenAt(c.x, c.y)) out.push({ y: (c.ty + 1) * T - 4, f: ctx => drawContainer(ctx, c) });
  for (const d of m.decor) if (inView(d.x, d.y) && seenAt(d.x, d.y)) out.push({ y: d.k === 'rug' || d.k === 'papers' || d.k === 'puddle' ? d.y - 40 : d.y, f: ctx => drawDecor(ctx, d) });
  for (const e of m.exits) if (inView(e.x, e.y, 3) && seenAt(e.x, e.y)) out.push({ y: e.type === 'stairs' ? e.y - 40 : e.y - 10, f: ctx => drawExit(ctx, e) });
  for (const mi of m.mirrors) if (inView(mi.x, mi.y) && seenAt(mi.x, mi.y)) out.push({ y: mi.y - 1, f: ctx => drawMirror(ctx, mi) });
  for (const c of m.cams) if (inView(c.x, c.y) && seenAt(c.x, c.y + 10)) out.push({ y: c.y - 2, f: ctx => drawCam(ctx, c) });
  if (W.bags) for (const g of W.bags) if (!g.dead && inView(g.x, g.y)) out.push({ y: g.y, f: ctx => drawIVBag(ctx, g) });
  for (const k of W.picks) if (inView(k.x, k.y) && (visAt(k.x, k.y) || dist(k.x, k.y, p0.x, p0.y) < 1.5 * T)) out.push({ y: k.y, f: ctx => drawPick(ctx, k) });
  for (const d of W.decoys) if (inView(d.x, d.y)) out.push({ y: d.y, f: ctx => drawDecoy(ctx, d) });
  for (const e of W.foes) {
    if (!inView(e.x, e.y, 3)) continue;
    if (!e.boss && !visAt(e.x, e.y) && dist(e.x, e.y, p0.x, p0.y) > 1.6 * T) continue;
    if (e.boss && !seenAt(e.x, e.y)) continue;
    if (e.dead) continue;
    out.push({ y: e.y, f: ctx => drawFoe(ctx, e) });
  }
  if (W.ferry && !W.ferry.gone && inView(W.ferry.x, W.ferry.y) && visAt(W.ferry.x, W.ferry.y)) out.push({ y: W.ferry.y, f: ctx => drawFerry(ctx, W.ferry) });
  if (W.qing && !W.qing.carried && inView(W.qing.x, W.qing.y)) out.push({ y: W.qing.y, f: ctx => drawQing(ctx, W.qing.x, W.qing.y, false) });
  for (const f of W.fx) if (f.k === 'dissolve' || f.k === 'ghost' || f.k === 'smear') out.push({ y: f.y, f: ctx => drawFxSprite(ctx, f) });
  for (const p of W.players) if (p.state === 'alive' || p.state === 'out') out.push({ y: p.y, f: ctx => drawPlayer(ctx, p) });
  return out;
}

/* 地上的效果：腳步、漣漪、預警 */
function drawFloorFx(ctx) {
  for (const f of W.fx) {
    const k = f.t / f.life;
    if (f.k === 'step') { ctx.strokeStyle = rgba('#d8ccff', .22 * (1 - k)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * easeOut(k), f.r * easeOut(k) * .55, 0, 0, TAU); ctx.stroke(); }
    else if (f.k === 'ripple' || f.k === 'splash') { ctx.strokeStyle = rgba('#bff6ff', .5 * (1 - k)); ctx.lineWidth = 1.5; const r = (f.r || 18) * easeOut(k); ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * .5, 0, 0, TAU); ctx.stroke(); }
    else if (f.k === 'land' || f.k === 'openring') { ctx.strokeStyle = rgba(f.c || '#fff1c8', .6 * (1 - k)); ctx.lineWidth = 2; const r = 8 + 34 * easeOut(k); ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * .5, 0, 0, TAU); ctx.stroke(); }
    else if (f.k === 'shock' || f.k === 'zapring') { ctx.strokeStyle = f.k === 'zapring' ? rgba('#9fe8ff', .8 * (1 - k)) : rgba('#ffd2b0', .7 * (1 - k)); ctx.lineWidth = 4 * (1 - k) + 1; const r = f.r * easeOut(k); ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * .6, 0, 0, TAU); ctx.stroke(); }
    else if (f.k === 'pin') { ctx.fillStyle = rgba('#53f0d6', .5 * (1 - k * .5)); ctx.beginPath(); ctx.ellipse(f.x, f.y, 16, 6, 0, 0, TAU); ctx.fill(); }
  }
  // 腳下的搜尋圈
  const p = W.players[0];
  for (const c of W.m.containers) if (!c.open && c.prog > 0) { ctx.strokeStyle = rgba('#000', .4); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(c.x, c.y - 52, 16, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#ffe2a0'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(c.x, c.y - 52, 16, -Math.PI / 2, -Math.PI / 2 + TAU * c.prog); ctx.stroke(); }
  if (p.near && !p.near.open && p.near.prog <= 0) { const c = p.near; ctx.strokeStyle = rgba('#ffe2a0', .5 + .3 * Math.sin(R.t * 6)); ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(c.x, c.y - 52, 16, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
}
function drawTeles(ctx, top) {
  for (const o of W.tele) {
    const k = clamp(o.t / o.life, 0, 1);
    ctx.save();
    if (!top && (o.k === 'circle' || o.k === 'band' || o.k === 'ring' || o.k === 'cone')) {
      ctx.fillStyle = rgba('#ff2a3a', .12 + .22 * k); ctx.strokeStyle = rgba('#ff5a6a', .7);  ctx.lineWidth = 2;
      if (o.k === 'circle') { ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r, o.r * .62, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = rgba('#ff5060', .35); ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r * k, o.r * .62 * k, 0, 0, TAU); ctx.fill(); }
      else if (o.k === 'band') { ctx.fillRect(o.x, o.y - o.h / 2, o.gap - o.x, o.h); ctx.fillRect(o.gap + o.gapW, o.y - o.h / 2, o.x + o.w - o.gap - o.gapW, o.h); ctx.fillStyle = rgba('#ffd08a', .5); for (let i = 0; i < 5; i++) ctx.fillRect(o.x, o.y - o.h / 2 + i * o.h / 4, o.w, 1); }
      else if (o.k === 'ring' && o.t > o.life) { ctx.strokeStyle = rgba('#ff4a5a', .75); ctx.lineWidth = o.th; ctx.beginPath(); ctx.ellipse(o.x, o.y, Math.max(1, o.r), Math.max(1, o.r) * .62, 0, 0, TAU); ctx.stroke(); }
      else if (o.k === 'ring') { ctx.beginPath(); ctx.ellipse(o.x, o.y, 30 + 20 * k, (30 + 20 * k) * .62, 0, 0, TAU); ctx.stroke(); }
      else if (o.k === 'cone') { ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.arc(o.x, o.y, o.r, o.a - o.fov, o.a + o.fov); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
    if (top && (o.k === 'line' || o.k === 'beam')) {
      const L = teleLen(o);
      ctx.translate(o.x, o.y); ctx.rotate(o.a);
      if (o.k === 'beam' && o.t > o.life) { const g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, rgba('#e8f6ff', .95)); g.addColorStop(1, rgba('#9fd4ff', .25)); ctx.fillStyle = g; ctx.fillRect(0, -o.w / 2, L, o.w); }
      else { ctx.fillStyle = rgba('#ff2a3a', .1 + .25 * k); ctx.fillRect(0, -o.w / 2, L, o.w); ctx.fillStyle = rgba('#ff6a7a', .8); ctx.fillRect(0, -1, L, 2); }
    }
    ctx.restore();
  }
}
function drawBullets(ctx) {
  for (const b of W.bullets) {
    const a = Math.atan2(b.vy, b.vx), y = b.y - 18;
    const tl = b.kind === 'crossbow' ? 30 : b.kind === 'needle' ? 18 : b.kind === 'shard' ? 8 : 22;
    ctx.save(); ctx.translate(b.x, y); ctx.rotate(a);
    if (b.kind === 'crossbow') { ctx.fillStyle = '#e9e2cf'; ctx.fillRect(-tl, -1.5, tl, 3); ctx.fillStyle = '#7fe9d4'; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.fill(); }
    else { const g = ctx.createLinearGradient(-tl, 0, 4, 0); g.addColorStop(0, 'rgba(255,220,150,0)'); g.addColorStop(1, b.crit ? '#fff6b0' : '#ffe7bd'); ctx.fillStyle = g; ctx.fillRect(-tl, -b.r * .45, tl + 4, b.r * .9); }
    ctx.restore();
  }
  for (const b of W.ebul) {
    const y = b.y - 18;
    ctx.fillStyle = rgba(b.c, .35); ctx.beginPath(); ctx.arc(b.x, y, b.r + 4, 0, TAU); ctx.fill();
    if (b.k === 'note') { ctx.fillStyle = '#ffe2b0'; ctx.beginPath(); ctx.ellipse(b.x, y + 3, 5, 3.6, -.4, 0, TAU); ctx.fill(); ctx.fillRect(b.x + 3.5, y - 9, 1.6, 12); }
    else if (b.k === 'static') { ctx.fillStyle = '#f2f8ff'; ctx.fillRect(b.x - 5, y - 5, 10, 10); ctx.fillStyle = '#7d8aa8'; ctx.fillRect(b.x - 3, y - 2, 6, 2); }
    else if (b.k === 'shard') { ctx.save(); ctx.translate(b.x, y); ctx.rotate(Math.atan2(b.vy, b.vx)); ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -4); ctx.lineTo(-3, 0); ctx.lineTo(-6, 4); ctx.fill(); ctx.restore(); }
    else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, y, b.r * .55, 0, TAU); ctx.fill(); ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(b.x, y, b.r * .8, 0, TAU); ctx.globalAlpha = .6; ctx.fill(); ctx.globalAlpha = 1; }
  }
}

/* ---------- 光影 ---------- */
function renderLight(ox, oy, z) {
  const l = R.lctx, ls = R.ls, th = W.ch.th, p = W.players[0];
  l.setTransform(1, 0, 0, 1, 0, 0);
  l.globalCompositeOperation = 'source-over';
  let amb = th.amb;
  if (W.stage >= 2) amb = mixHex(amb, '#4a1830', (W.stage - 1) * .18);
  if (W.collapse) amb = mixHex(amb, '#5a0f1a', .35 + .15 * Math.sin(R.t * 6));
  l.fillStyle = amb; l.fillRect(0, 0, R.lcv.width, R.lcv.height);
  l.setTransform(ls * z, 0, 0, ls * z, ox * ls, oy * ls);
  l.globalCompositeOperation = 'lighter';
  const m = W.m;
  // 房間燈
  for (const L of m.lights) {
    const rm = m.rooms[L.room]; if (!rm) continue;
    const ck = Math.floor(L.y / T) * m.w + Math.floor(L.x / T); if (!W.seen[ck]) continue;
    let I = .95;
    if (L.flick) { const f = Math.sin(R.t * 13 + L.ph) + Math.sin(R.t * 31 + L.ph * 2); if (f > 1.55 * (1 - L.flick * .3)) I = .2; }
    if (W.collapse) I *= .6 + .4 * Math.sin(R.t * 9 + L.ph);
    l.save(); l.beginPath(); l.rect((rm.x - .5) * T, (rm.y - 1.5) * T, (rm.w + 1) * T, (rm.h + 1.8) * T); l.clip();
    l.globalAlpha = I; l.drawImage(glow(L.c), L.x - L.r, L.y - L.r, L.r * 2, L.r * 2); l.globalAlpha = 1;
    l.restore();
  }
  // 夢燈（陰影）
  if (W.visPoly.length) {
    const R0 = 7.6 * T * p.st.lantern;
    l.save(); l.beginPath(); const vp = W.visPoly; l.moveTo(vp[0], vp[1]); for (let i = 2; i < vp.length; i += 2) l.lineTo(vp[i], vp[i + 1]); l.closePath(); l.clip();
    const g = l.createRadialGradient(p.x, p.y - 20, 10, p.x, p.y - 20, R0);
    g.addColorStop(0, rgba('#fff0d8', 1)); g.addColorStop(.28, rgba('#ffe1b4', .85)); g.addColorStop(.6, rgba('#b8a2d8', .34)); g.addColorStop(1, rgba('#000', 0));
    l.fillStyle = g; l.fillRect(p.x - R0, p.y - 20 - R0, R0 * 2, R0 * 2);
    l.restore();
  }
  l.globalAlpha = .55; l.drawImage(glow('#ffd8a0'), p.x - 70, p.y - 90, 140, 140); l.globalAlpha = 1;
  // 視野錐
  for (const e of W.foes) {
    if (e.dead || e.type !== 'watcher' || e.state === 'sleep' || e.spawn > 0) continue;
    if (dist(e.x, e.y, p.x, p.y) > 14 * T) continue;
    const col = e.state === 'alert' ? '#ff5a5a' : e.aw > .05 ? mixHex('#ffe39a', '#ff7a3a', clamp(e.aw, 0, 1)) : '#ffe39a';
    coneLight(l, e.x, e.y - 30, e.face, FOES.watcher.fov, FOES.watcher.cone * T, col, e.state === 'alert' ? .5 : .62);
  }
  for (const c of m.cams) if (!c.dead && c.a != null && dist(c.x, c.y, p.x, p.y) < 14 * T) coneLight(l, c.x, c.y + 10, c.a, .42, 6.2 * T, c.aware > .05 ? mixHex('#9fd4ff', '#ff4a4a', clamp(c.aware, 0, 1)) : '#9fd4ff', .5);
  // 出口
  for (const e of m.exits) {
    const ck = Math.floor(e.y / T) * m.w + Math.floor(e.x / T); if (!W.seen[ck]) continue;
    const c = e.type === 'bell' ? '#ffc070' : e.type === 'window' ? '#b8d8ff' : '#b394ff', r = e.type === 'window' ? 3.4 * T : 2.6 * T;
    const off = (e.type === 'bell' && W.collapse && W.finalPhase < 2) ? .25 : 1;
    l.globalAlpha = (.7 + .15 * Math.sin(R.t * 2)) * off; l.drawImage(glow(c), e.x - r, e.y - r * .7, r * 2, r * 2); l.globalAlpha = 1;
  }
  // 發光物
  for (const k of W.picks) if (k.k === 'mem') { const c = RAR[k.item.rar].c, r = 50 + k.item.rar * 22; l.globalAlpha = .8; l.drawImage(glow(c), k.x - r, k.y - 20 - r, r * 2, r * 2); l.globalAlpha = 1; }
  for (const L of W.tl) { const a = (1 - L.t / L.life) * (L.i || 1); l.globalAlpha = a; l.drawImage(glow(L.c), L.x - L.r, L.y - L.r, L.r * 2, L.r * 2); l.globalAlpha = 1; }
  for (const b of W.bullets) { l.drawImage(glow('#ffd59a'), b.x - 28, b.y - 46, 56, 56); }
  for (const b of W.ebul) { l.drawImage(glow(b.c), b.x - 34, b.y - 52, 68, 68); }
  for (const d of W.decoys) { const r = 70 + 30 * Math.sin(R.t * 8); l.drawImage(glow('#53f0d6'), d.x - r, d.y - r, r * 2, r * 2); }
  if (W.ferry && !W.ferry.gone) l.drawImage(glow('#ffcf7a'), W.ferry.x - 90, W.ferry.y - 130, 180, 180);
  if (W.qing && !W.qing.carried) l.drawImage(glow('#ff8f8f'), W.qing.x - 120, W.qing.y - 120, 240, 240);
  for (const e of W.foes) if (!e.dead && (e.boss ? e.awake || dist(e.x, e.y, p.x, p.y) < 8 * T : e.type === 'eel' || e.type === 'cocoon' || e.burnT > 0)) { const c = e.burnT > 0 ? '#ff9a4a' : W.ch.th.foe.glow, r = e.boss ? 200 : 60; l.globalAlpha = e.boss ? .55 : .5; l.drawImage(glow(c), e.x - r, e.y - 40 - r, r * 2, r * 2); l.globalAlpha = 1; }
  if (W.bags) for (const g of W.bags) if (!g.dead) l.drawImage(glow('#bff6ff'), g.x - 60, g.y - 90, 120, 120);
  for (const mi of m.mirrors) if (!mi.broken) { const ck = Math.floor(mi.y / T) * m.w + Math.floor(mi.x / T); if (W.seen[ck]) { l.globalAlpha = .45; l.drawImage(glow('#bff6ff'), mi.x - 60, mi.y - 60, 120, 120); l.globalAlpha = 1; } }
  l.globalCompositeOperation = 'source-over';
}
function coneLight(l, x, y, a, fov, len, col, alpha) {
  const N = 18;
  l.save(); l.beginPath(); l.moveTo(x, y);
  for (let i = 0; i <= N; i++) { const aa = a - fov + 2 * fov * i / N; const d = rayDist(x, y + 20, aa, len); l.lineTo(x + Math.cos(aa) * d, y + 20 + Math.sin(aa) * d); }
  l.closePath(); l.clip();
  const g = l.createRadialGradient(x, y, 4, x, y, len);
  g.addColorStop(0, rgba(col, alpha)); g.addColorStop(.6, rgba(col, alpha * .45)); g.addColorStop(1, rgba(col, 0));
  l.fillStyle = g; l.fillRect(x - len, y - len, len * 2, len * 2);
  l.restore();
}

/* 發光層：子彈核心、光柱、眼睛 */
function drawEmissive(ctx) {
  const p0 = W.players[0];
  for (const k of W.picks) {
    if (k.k !== 'mem') continue;
    const tx = Math.floor(k.x / T), ty = Math.floor(k.y / T); if (!W.vis[ty * W.m.w + tx] && dist(k.x, k.y, p0.x, p0.y) > 1.5 * T) continue;
    const r = k.item.rar, c = RAR[r].c;
    if (r >= 1) { const h = (60 + r * 55) * k.beam, w = 6 + r * 3; const g = ctx.createLinearGradient(0, k.y - 20 - h, 0, k.y - 10); g.addColorStop(0, rgba(c, 0)); g.addColorStop(.7, rgba(c, .25 + r * .06)); g.addColorStop(1, rgba(c, .5)); ctx.fillStyle = g; ctx.fillRect(k.x - w / 2, k.y - 20 - h, w, h); ctx.fillRect(k.x - w / 6, k.y - 20 - h * 1.1, w / 3, h * 1.1); }
  }
  for (const b of W.bullets) { ctx.drawImage(glow(b.crit ? '#fff1a0' : '#ffcf8a'), b.x - 12, b.y - 30, 24, 24); }
  for (const e of W.foes) {
    if (e.dead || e.spawn > 0) continue;
    const tx = Math.floor(e.x / T), ty = Math.floor(e.y / T); if (!e.boss && !W.vis[ty * W.m.w + tx]) continue;
    if (e.state === 'alert' && !e.boss && e.type !== 'cocoon') { ctx.globalAlpha = .7; ctx.drawImage(glow('#ff4a5a'), e.x - 10, e.y - (e.type === 'warden' ? 92 : e.type === 'ripper' || e.type === 'beat' ? 40 : 60), 20, 20); ctx.globalAlpha = 1; }
  }
  // 大衣內裡的光
  for (const p of W.players) if (p.state === 'alive') { ctx.globalAlpha = .35 + .1 * Math.sin(R.t * 3); ctx.drawImage(glow('#53f0d6'), p.x - 18 * p.face - 14, p.y - 44, 28, 34); ctx.drawImage(glow('#ffcf7a'), p.x - 9 * p.face - 12, p.y - 36, 24, 24); ctx.globalAlpha = 1; }
  for (const f of W.fx) {
    const k = f.t / f.life;
    if (f.k === 'muzzle') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.globalAlpha = 1 - k; const L = f.w === 'shotgun' ? 34 : 24; ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(L, 0); ctx.lineTo(0, 5); ctx.fill(); ctx.drawImage(glow('#ffcf7a'), -18, -18, 36, 36); ctx.restore(); ctx.globalAlpha = 1; }
    else if (f.k === 'spark') { ctx.strokeStyle = rgba(f.c, 1 - k); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.vx * .03, f.y - f.vy * .03); ctx.stroke(); }
    else if (f.k === 'arc') { ctx.strokeStyle = rgba('#bff4ff', 1 - k); ctx.lineWidth = 2.5; lightning(ctx, f.x1, f.y1, f.x2, f.y2, f.seed + Math.floor(f.t * 30)); ctx.strokeStyle = rgba('#5fd8ff', .5 * (1 - k)); ctx.lineWidth = 6; lightning(ctx, f.x1, f.y1, f.x2, f.y2, f.seed + Math.floor(f.t * 30)); }
    else if (f.k === 'boom') { ctx.globalAlpha = 1 - k; ctx.drawImage(glow('#ffb06a'), f.x - f.r * 1.3, f.y - 20 - f.r * 1.3, f.r * 2.6, f.r * 2.6); ctx.globalAlpha = 1; }
    else if (f.k === 'pickflash' || f.k === 'lvl') { ctx.globalAlpha = 1 - k; const c = f.c || '#53f0d6'; ctx.drawImage(glow(c), f.x - 60, f.y - 100, 120, 120); if (f.k === 'lvl') { ctx.fillStyle = rgba('#b9fff0', .5 * (1 - k)); ctx.fillRect(f.x - 14, f.y - 220 * easeOut(k), 28, 220 * easeOut(k)); } ctx.globalAlpha = 1; }
    else if (f.k === 'ember') { ctx.fillStyle = rgba('#ffb060', 1 - k); ctx.fillRect(f.x, f.y - 20 * k, 2.5, 2.5); }
    else if (f.k === 'scream') { ctx.strokeStyle = rgba('#ff6a6a', .8 * (1 - k)); ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { const r = (20 + i * 22) + 60 * k; ctx.beginPath(); ctx.arc(f.x, f.y, r, -2.6, -.5); ctx.stroke(); } }
  }
}
function lightning(ctx, x1, y1, x2, y2, seed) {
  const r = RNG(seed | 0), n = 6;
  ctx.beginPath(); ctx.moveTo(x1, y1);
  for (let i = 1; i < n; i++) { const t = i / n; ctx.lineTo(lerp(x1, x2, t) + r.range(-10, 10), lerp(y1, y2, t) + r.range(-10, 10)); }
  ctx.lineTo(x2, y2); ctx.stroke();
}

/* 覆蓋層：數字、圖示、名稱 */
function drawOverlayFx(ctx) {
  const p0 = W.players[0];
  for (const f of W.fx) {
    const k = f.t / f.life;
    if (f.k === 'dot') { ctx.fillStyle = rgba(f.c, 1 - k); ctx.fillRect(f.x - f.s / 2, f.y - f.s / 2, f.s, f.s); }
    else if (f.k === 'ink') { ctx.fillStyle = rgba(f.c, .75 * (1 - k * k)); ctx.beginPath(); ctx.arc(f.x, f.y, f.s * (1 - k * .6), 0, TAU); ctx.fill(); }
    else if (f.k === 'glass') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot + f.t * 8); ctx.fillStyle = rgba('#d8fbff', .9 * (1 - k)); ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(4, 3); ctx.lineTo(-3, 4); ctx.fill(); ctx.restore(); }
    else if (f.k === 'puff') { ctx.fillStyle = rgba('#cfc8e0', .3 * (1 - k)); ctx.beginPath(); ctx.arc(f.x, f.y - 10 * k, 5 + 10 * k, 0, TAU); ctx.fill(); }
    else if (f.k === 'shell') { ctx.fillStyle = rgba('#e0b860', 1 - k); ctx.fillRect(f.x, f.y, 4, 2); }
    else if (f.k === 'slash') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.strokeStyle = rgba('#ffffff', 1 - k); ctx.lineWidth = 5 * (1 - k) + 1; ctx.beginPath(); ctx.arc(0, 0, 26 + 10 * k, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = rgba('#53f0d6', .8 * (1 - k)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 32 + 10 * k, -1, 1); ctx.stroke(); ctx.restore(); }
    else if (f.k === 'claw') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.strokeStyle = rgba('#ff6a7a', .9 * (1 - k)); ctx.lineWidth = 3; const R0 = f.big ? 80 : 34; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(-8, i * 7, R0, -.6, .6); ctx.stroke(); } ctx.restore(); }
    else if (f.k === 'whip') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.strokeStyle = rgba('#e8fbff', 1 - k); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); for (let i = 1; i <= 10; i++) ctx.lineTo(f.len * i / 10, Math.sin(i * 1.3 + f.t * 30) * 8); ctx.stroke(); ctx.restore(); }
    else if (f.k === 'num') {
      const a = k < .7 ? 1 : 1 - (k - .7) / .3, sc = (f.crit ? 1 + .6 * Math.max(0, 1 - k * 4) : 1) * (1 + (f.pop || 0) * 2.2) * (f.burn ? .85 : 1);
      ctx.save(); ctx.translate(f.x, f.y); ctx.scale(sc, sc);
      ctx.font = `900 ${f.crit ? 22 : f.hurt ? 18 : 15}px ${'"Noto Sans TC",system-ui,sans-serif'}`; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = rgba('#000', .85 * a); const vs = typeof f.v === 'number' ? Math.round(f.v) : f.v; ctx.strokeText(vs, 0, 0);
      ctx.fillStyle = f.hurt ? rgba('#ff6a6a', a) : f.crit ? rgba('#ffe15a', a) : f.burn ? rgba('#ffa860', a) : rgba('#ffffff', a); ctx.fillText(vs, 0, 0);
      if (f.crit) { ctx.fillStyle = rgba('#ffb02a', a); ctx.beginPath(); ctx.moveTo(-28, -16); ctx.lineTo(-20, -16); ctx.lineTo(-24, -8); ctx.lineTo(-18, -8); ctx.lineTo(-30, 4); ctx.lineTo(-26, -6); ctx.lineTo(-32, -6); ctx.fill(); }
      ctx.restore();
    }
    else if (f.k === 'label') { const a = k < .75 ? 1 : 1 - (k - .75) / .25; ctx.font = `600 13px "Noto Serif TC","Songti TC",serif`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = rgba('#000', .8 * a); ctx.strokeText(f.s, f.x, f.y); ctx.fillStyle = rgba(f.c, a); ctx.fillText(f.s, f.x, f.y); }
    else if (f.k === 'icon') { const e = f.e; if (e.dead) continue; const a = 1 - Math.max(0, (k - .7) / .3), hy = e.y - (e.type === 'warden' ? 112 : e.type === 'watcher' ? 92 : 78) - 8 * easeOut(Math.min(1, k * 4)); ctx.font = `900 ${f.s === '!' ? 24 : 20}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = rgba('#000', a); ctx.strokeText(f.s, e.x, hy); ctx.fillStyle = f.s === '!' ? rgba('#ff4a4a', a) : rgba('#ffd84a', a); ctx.fillText(f.s, e.x, hy); }
    else if (f.k === 'heal') { ctx.fillStyle = rgba('#7affc0', 1 - k); for (let i = 0; i < 5; i++) { const x = f.x + Math.sin(i * 2.1) * 18, y = f.y - 30 - k * 50 - i * 6; ctx.fillRect(x - 1.5, y - 5, 3, 10); ctx.fillRect(x - 5, y - 1.5, 10, 3); } }
    else if (f.k === 'ward') { ctx.strokeStyle = rgba('#ffe39a', 1 - k); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y - 30, 34 + 10 * k, 0, TAU); ctx.stroke(); }
    else if (f.k === 'calm') { ctx.strokeStyle = rgba('#b394ff', .7 * (1 - k)); ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const r = 40 + i * 40 + k * 120; ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * .55, 0, 0, TAU); ctx.stroke(); } }
    else if (f.k === 'mirrorfx') { ctx.strokeStyle = rgba('#e8fbff', 1 - k); ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + k; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * 10, f.y - 30 + Math.sin(a) * 10); ctx.lineTo(f.x + Math.cos(a) * (30 + 30 * k), f.y - 30 + Math.sin(a) * (30 + 30 * k)); ctx.stroke(); } }
    else if (f.k === 'needles') { ctx.strokeStyle = rgba('#53f0d6', 1 - k); ctx.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = 3.6 * T * easeOut(k); ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * r * .7, f.y + Math.sin(a) * r * .5); ctx.lineTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * .6); ctx.stroke(); } }
    else if (f.k === 'bellring') { ctx.strokeStyle = rgba('#ffd08a', .8 * (1 - k)); ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { const r = 20 + i * 30 + k * 140; ctx.beginPath(); ctx.arc(f.x, f.y - 80, r, 0, TAU); ctx.stroke(); } }
    else if (f.k === 'ice') { ctx.fillStyle = rgba('#bff4ff', .45 * (1 - k * .5)); ctx.beginPath(); ctx.moveTo(f.x, f.y - 60); ctx.lineTo(f.x + 18, f.y - 20); ctx.lineTo(f.x, f.y + 4); ctx.lineTo(f.x - 18, f.y - 20); ctx.fill(); }
    else if (f.k === 'bandfx') { const o = f.o; ctx.fillStyle = rgba('#ffd08a', .5 * (1 - k)); ctx.fillRect(o.x, o.y - o.h / 2, o.gap - o.x, o.h); ctx.fillRect(o.gap + o.gapW, o.y - o.h / 2, o.x + o.w - o.gap - o.gapW, o.h); }
  }
  // 頭目血條（世界中）、背包裡的名字提示
  let lab = null, ld = 2.2 * T; for (const k of W.picks) if (k.k === 'mem' && !k.z) { const d = dist(k.x, k.y, p0.x, p0.y); if (d < ld) { ld = d; lab = k; } }
  for (const k of (lab ? [lab] : [])) { ctx.font = `600 12px "Noto Serif TC",serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)'; const s = k.item.n + (k.item.size > 1 ? ` ·${k.item.size}格` : ''); ctx.strokeText(s, k.x, k.y - 44); ctx.fillStyle = RAR[k.item.rar].c; ctx.fillText(s, k.x, k.y - 44); }
  // 撤離倒數圈
  if (W.channel) { const c = W.channel; ctx.strokeStyle = rgba('#000', .5); ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(c.e.x, c.e.y + 6, 2.4 * T, 2.4 * T * .6, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = c.inside ? '#ffd08a' : '#ff6a6a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(c.e.x, c.e.y + 6, 2.4 * T, 2.4 * T * .6, 0, -Math.PI / 2, -Math.PI / 2 + TAU * c.t / c.need); ctx.stroke();
    ctx.font = `700 18px "Noto Serif TC",serif`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#000'; const s = c.inside ? `守住 ${Math.ceil(c.need - c.t)}` : '回到鐘旁！'; ctx.strokeText(s, c.e.x, c.e.y - 130); ctx.fillStyle = c.inside ? '#ffe2b0' : '#ff8a8a'; ctx.fillText(s, c.e.x, c.e.y - 130); }
}

/* ---------- 螢幕效果 ---------- */
function drawScreenFx(ctx, dt) {
  const w = R.cv.width, h = R.cv.height, p = W.players[0];
  // 暗角
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.max(w, h) * .75);
  let vc = '#000000', va = .55;
  if (W.stage >= 2) { vc = '#3a0818'; va = .55 + W.stage * .05; }
  if (W.collapse) { vc = '#5a0010'; va = .7 + .2 * Math.sin(R.t * 7); }
  g.addColorStop(0, rgba(vc, 0)); g.addColorStop(1, rgba(vc, va));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (p.hurt > 0) { const k = p.hurt / .35, gh = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .22, w / 2, h / 2, Math.max(w, h) * .66); gh.addColorStop(0, 'rgba(255,32,48,0)'); gh.addColorStop(.55, rgba('#ff2030', .1 * k)); gh.addColorStop(1, rgba('#ff2030', .62 * k)); ctx.fillStyle = gh; ctx.fillRect(0, 0, w, h); }
  if (W.beat > 0 && (W.chi === 1 || (W.boss && W.boss.bid === 'conductor' && W.boss.awake))) { const g3 = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .45, w / 2, h / 2, Math.max(w, h) * .7); g3.addColorStop(0, 'rgba(255,200,120,0)'); g3.addColorStop(1, rgba('#ffcf8a', W.beat * .16)); ctx.fillStyle = g3; ctx.fillRect(0, 0, w, h); }
  if (p.hp < p.hpMax * .3 && p.state === 'alive') { const a = .18 + .12 * Math.sin(R.t * 6); const g2 = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .7); g2.addColorStop(0, 'rgba(255,0,30,0)'); g2.addColorStop(1, rgba('#ff0020', a)); ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h); }
  if (p.mirrorT > 0) { ctx.fillStyle = rgba('#bff6ff', .06 + .03 * Math.sin(R.t * 10)); ctx.fillRect(0, 0, w, h); }
  if (W.collapse) {
    // 崩塌的裂痕從邊緣長進來
    const k = 1 - W.collapse / W.collapseMax;
    ctx.strokeStyle = rgba('#000', .85); ctx.lineWidth = 3 * R.dpr;
    const rr = RNG(7);
    for (let i = 0; i < 14; i++) { let x = rr.chance(.5) ? 0 : w, y = rr.range(0, h); if (rr.chance(.5)) { y = rr.chance(.5) ? 0 : h; x = rr.range(0, w); } ctx.beginPath(); ctx.moveTo(x, y); const L = (60 + 260 * k) * R.dpr; for (let s = 0; s < 6; s++) { x += (w / 2 - x) / Math.hypot(w / 2 - x, h / 2 - y) * L / 6 + rr.range(-20, 20) * R.dpr; y += (h / 2 - y) / Math.hypot(w / 2 - x, h / 2 - y) * L / 6 + rr.range(-20, 20) * R.dpr; ctx.lineTo(x, y); } ctx.stroke(); }
  }
  if (W.slow < 1) { ctx.fillStyle = 'rgba(255,220,140,.05)'; ctx.fillRect(0, 0, w, h); }
}

/* ---------- 搖桿 ---------- */
function drawJoystick(ctx) {
  const j = IN.joy; if (!j.on) return;
  const d = R.dpr;
  ctx.globalAlpha = .9;
  ctx.strokeStyle = 'rgba(220,214,255,.35)'; ctx.lineWidth = 2 * d; ctx.beginPath(); ctx.arc(j.ox * d, j.oy * d, IN.joyR * d, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(220,214,255,.18)'; ctx.setLineDash([4 * d, 6 * d]); ctx.beginPath(); ctx.arc(j.ox * d, j.oy * d, IN.joyR * .62 * d, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  const mag = Math.min(1, Math.hypot(j.x - j.ox, j.y - j.oy) / IN.joyR);
  ctx.fillStyle = mag >= .62 ? 'rgba(255,206,140,.55)' : 'rgba(83,240,214,.45)';
  ctx.beginPath(); ctx.arc(j.kx * d, j.ky * d, 24 * d, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = `${11 * d}px "Noto Sans TC",sans-serif`; ctx.textAlign = 'center';
  ctx.fillText(mag >= .62 ? '跑' : mag > .08 ? '靜步' : '', j.kx * d, j.ky * d + 4 * d);
  ctx.globalAlpha = 1;
}

/* ---------- 小地圖 ---------- */
function drawMini() {
  const c = $('#mini'); if (!c || !W) return;
  const m = W.m, s = 2, pw = m.w * s, ph = m.h * s;
  if (c.width !== 92 * 2) { c.width = 92 * 2; c.height = 92 * 2; }
  const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
  const p = W.players[0], cx = p.x / T * s, cy = p.y / T * s, sc = 2.2;
  g.save(); g.translate(c.width / 2, c.height / 2); g.scale(sc, sc); g.translate(-cx, -cy);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const k = y * m.w + x; if (!W.seen[k]) continue; const t = m.tiles[k];
    g.fillStyle = t === TW ? 'rgba(200,190,240,.55)' : t === TWA ? 'rgba(80,170,190,.5)' : W.vis[k] ? 'rgba(170,160,210,.38)' : 'rgba(120,110,160,.22)';
    g.fillRect(x * s, y * s, s, s);
  }
  for (const e of m.exits) { if (!W.seen[Math.floor(e.y / T) * m.w + Math.floor(e.x / T)]) continue; g.fillStyle = e.type === 'bell' ? '#ffc070' : e.type === 'window' ? '#b8d8ff' : '#b394ff'; g.beginPath(); g.arc(e.x / T * s, e.y / T * s, 3, 0, TAU); g.fill(); }
  if (W.boss && !W.boss.dead && W.seen[Math.floor(W.boss.y / T) * m.w + Math.floor(W.boss.x / T)]) { g.fillStyle = '#ff4d5e'; g.fillRect(W.boss.x / T * s - 3, W.boss.y / T * s - 3, 6, 6); }
  for (const e of W.foes) if (!e.dead && !e.boss && e.state === 'alert' && W.vis[Math.floor(e.y / T) * m.w + Math.floor(e.x / T)]) { g.fillStyle = '#ff6a6a'; g.fillRect(e.x / T * s - 1, e.y / T * s - 1, 2, 2); }
  if (W.qing && !W.qing.carried) { g.fillStyle = '#ff8f8f'; g.beginPath(); g.arc(W.qing.x / T * s, W.qing.y / T * s, 3, 0, TAU); g.fill(); }
  g.fillStyle = '#53f0d6'; g.beginPath(); g.arc(cx, cy, 2.4, 0, TAU); g.fill();
  g.restore();
}
