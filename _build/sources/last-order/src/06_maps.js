/* ===== 地圖：碰撞、尋路、五張場景 ===== */
function newMap(w, h, theme) {
  const m = { w, h, pw: w * T, ph: h * T, theme, solid: new Uint8Array(w * h), wall: new Uint8Array(w * h), props: [], lights: [], spawns: [], hazards: [], fires: [], dist: new Int16Array(w * h), dist2: null, bg: '#050608', spawnRing: 0.3, dyn: null, zones: {} };
  m.fl = mkCanvas(m.pw, m.ph); m.fx = m.fl.getContext('2d');
  m.dec = mkCanvas(m.pw, m.ph); m.dx = m.dec.getContext('2d');
  return m;
}
const isSolid = (m, tx, ty) => (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) ? 1 : m.solid[ty * m.w + tx];
const isWall = (m, tx, ty) => (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) ? 1 : m.wall[ty * m.w + tx];
function setBlock(m, x, y, w, h, s, wl) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { if (i < 0 || j < 0 || i >= m.w || j >= m.h) continue; const k = j * m.w + i; m.solid[k] = s; m.wall[k] = wl; } }
function canPlace(m, tx, ty, tw, th, mg) { for (let j = ty - mg; j < ty + th + mg; j++) for (let i = tx - mg; i < tx + tw + mg; i++) { if (i < 0 || j < 0 || i >= m.w || j >= m.h) return false; if (m.solid[j * m.w + i]) return false; } return true; }
function addProp(m, img, tx, ty, tw, th, opt) {
  opt = opt || {};
  for (let j = ty; j < ty + th; j++) for (let i = tx; i < tx + tw; i++) { const k = j * m.w + i; m.solid[k] = 1; if (!opt.low) m.wall[k] = 1; }
  const p = { img, x: tx * T + ((tw * T - img.width) >> 1) + (opt.dx || 0), y: (ty + th) * T - img.height + (opt.dy || 0), sy: (ty + th) * T - 2, tx, ty, tw, th, kind: opt.kind || '' };
  m.props.push(p); return p;
}
function collideCircle(m, e) {
  const r = e.r;
  const x0 = Math.floor((e.x - r) / T), x1 = Math.floor((e.x + r) / T), y0 = Math.floor((e.y - r) / T), y1 = Math.floor((e.y + r) / T);
  let hit = false;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!isSolid(m, tx, ty)) continue;
    const rx = tx * T, ry = ty * T;
    const cx = clamp(e.x, rx, rx + T), cy = clamp(e.y, ry, ry + T);
    const dx = e.x - cx, dy = e.y - cy, dd = dx * dx + dy * dy;
    if (dd >= r * r) continue;
    hit = true;
    if (dd > 1e-6) { const d = Math.sqrt(dd), p = r - d; e.x += dx / d * p; e.y += dy / d * p; }
    else {
      const l = e.x - rx, rr = rx + T - e.x, t = e.y - ry, b = ry + T - e.y, mn = Math.min(l, rr, t, b);
      if (mn === l) e.x = rx - r; else if (mn === rr) e.x = rx + T + r; else if (mn === t) e.y = ry - r; else e.y = ry + T + r;
    }
  }
  return hit;
}
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function flowField(m, srcs, dist) {
  dist.fill(32767);
  const W = m.w, H = m.h;
  const q = m.q || (m.q = new Int32Array(W * H));
  let h = 0, t = 0;
  for (const s of srcs) { const [sx, sy] = s; if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue; const k = sy * W + sx; if (dist[k] === 0) continue; dist[k] = 0; q[t++] = k; }
  while (h < t) {
    const i = q[h++]; const x = i % W, y = (i / W) | 0; const nd = dist[i] + 1;
    for (let k = 0; k < 8; k++) {
      const dx = DIRS8[k][0], dy = DIRS8[k][1], nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (m.solid[j] || dist[j] <= nd) continue;
      if (dx && dy && (m.solid[y * W + nx] || m.solid[ny * W + x])) continue;
      dist[j] = nd; q[t++] = j;
    }
  }
}
function losClear(m, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), n = Math.ceil(L / 6);
  for (let i = 1; i < n; i++) { const x = x0 + dx * i / n, y = y0 + dy * i / n; if (isWall(m, (x / T) | 0, (y / T) | 0)) return false; }
  return true;
}
function puddle(x, cx, cy, rx, ry, tint) {
  for (let j = -ry; j <= ry; j++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry)))); R(x, tint || 'rgba(40,60,90,0.35)', cx - hw, cy + j, hw * 2, 1); }
  R(x, 'rgba(200,220,255,0.18)', cx - rx * 0.4, cy - ry * 0.4, rx * 0.5, 1);
}
function stain(x, cx, cy, r, col) { for (let i = 0; i < r * 3; i++) { const a = rand(TAU), d = rand(r); R(x, col, (cx + Math.cos(a) * d) | 0, (cy + Math.sin(a) * d * 0.6) | 0, randi(1, 3), randi(1, 2)); } }
function bloodTrail(x, x0, y0, x1, y1) { const n = Math.hypot(x1 - x0, y1 - y0) / 3; for (let i = 0; i < n; i++) { const t = i / n; R(x, pick(['#5a0f12', '#6d1616', '#4a0c0c']), (lerp(x0, x1, t) + rand(-2, 2)) | 0, (lerp(y0, y1, t) + rand(-1, 1)) | 0, randi(1, 3), randi(1, 2)); } }

/* ---------- 第一章：捷運站月台 ---------- */
function buildStation() {
  const W = 60, H = 30, m = newMap(W, H, 'station'), x = m.fx, rnd = seeded(11);
  setBlock(m, 0, 0, W, H, 1, 1);
  setBlock(m, 1, 7, W - 2, 18, 0, 0);
  setBlock(m, 0, 14, 1, 4, 0, 0); setBlock(m, W - 1, 14, 1, 4, 0, 0);
  const stairs = [9, 28, 47];
  for (const s of stairs) setBlock(m, s, 25, 5, 5, 0, 0);
  R(x, '#07080b', 0, 0, m.pw, m.ph);
  R(x, '#101217', 0, 0, m.pw, 6 * T); dots(x, 0, 0, m.pw, 6 * T, ['#171a20', '#1c2027', '#0c0e12'], 0.25, rnd);
  for (let px = 0; px < m.pw; px += 12) R(x, '#231e1b', px, 19, 6, 60);
  for (const ry of [26, 66]) { R(x, '#4f545c', 0, ry, m.pw, 3); R(x, '#a9b0ba', 0, ry, m.pw, 1); }
  for (let ty = 7; ty < 25; ty += 2) for (let tx = 1; tx < W - 1; tx += 2) {
    const bx = tx * T, by = ty * T, base = ['#5d626d', '#61666f', '#5a5f69', '#63676f'][(rnd() * 4) | 0];
    R(x, base, bx, by, 32, 32); dots(x, bx, by, 32, 32, ['#6c717c', '#52565f', '#747983', '#4d5159'], 0.07, rnd);
    R(x, '#474b54', bx, by, 32, 1); R(x, '#474b54', bx, by, 1, 32);
  }
  R(x, '#b8932a', T, 7 * T, (W - 2) * T, 12);
  for (let px = T + 1; px < (W - 1) * T; px += 3) for (let py = 7 * T + 1; py < 7 * T + 12; py += 3) R(x, '#e2bd48', px, py, 1, 1);
  R(x, '#d9d9d0', T, 7 * T + 13, (W - 2) * T, 1);
  for (let tx = 0; tx < W; tx++) {
    if (stairs.some(s => tx >= s && tx < s + 5)) continue;
    const bx = tx * T, by = 25 * T;
    R(x, '#2a3142', bx, by, T, T); R(x, '#2e6db5', bx, by + 6, T, 3); R(x, '#8fb6e8', bx, by + 6, T, 1); R(x, '#1a1f2b', bx, by + T - 2, T, 2);
  }
  for (const s of stairs) {
    const bx = s * T;
    for (let r = 0; r < 5 * T; r += 4) { R(x, '#4a4f5a', bx, 25 * T + r, 5 * T, 4); R(x, '#9aa0a8', bx, 25 * T + r, 5 * T, 1); R(x, `rgba(0,0,0,${Math.min(0.9, r / (5 * T) * 1.1)})`, bx, 25 * T + r, 5 * T, 4); }
    R(x, '#c9a22a', bx, 25 * T, 5 * T, 2); R(x, '#1b1e25', bx - 2, 25 * T, 2, 5 * T); R(x, '#1b1e25', bx + 5 * T, 25 * T, 2, 5 * T);
  }
  for (const sx of [0, W - 1]) {
    for (let ty = 6; ty < 25; ty++) { if (ty >= 14 && ty < 18) { R(x, '#34373e', sx * T, ty * T, T, T); dots(x, sx * T, ty * T, T, T, ['#2a2d33', '#3d4047'], 0.2, rnd); continue; } R(x, '#1c2029', sx * T, ty * T, T, T); R(x, '#2a3142', sx * T + (sx ? 0 : 12), ty * T, 4, T); }
  }
  for (let i = 0; i < 16; i++) puddle(x, rand(2 * T, 58 * T) | 0, rand(9 * T, 24 * T) | 0, randi(8, 18), randi(2, 5));
  for (let i = 0; i < 6; i++) bloodTrail(x, rand(3 * T, 57 * T), rand(10 * T, 23 * T), rand(3 * T, 57 * T), rand(10 * T, 23 * T));
  const ad = ['#f2c14e', '#6fd0e8', '#f28c6a', '#9fe07a', '#e8e3d8'];
  for (const py of [11, 19]) for (const px of [6, 18, 30, 41, 53]) { const c = pick(ad); addProp(m, PROP.pillar(c), px, py, 2, 2); m.lights.push({ x: px * T + 16, y: py * T - 12, r: 44, i: 0.6, col: c, f: 0 }); }
  for (const px of [12, 24, 36, 47]) addProp(m, PROP.bench(), px, 15, 3, 1, { low: true });
  for (let px = 4; px < 58; px += 8) { m.lights.push({ x: px * T, y: 9 * T, r: 62, i: 0.4, f: 0.35 }); m.lights.push({ x: px * T + 64, y: 22 * T, r: 62, i: 0.35, f: 0.45 }); }
  for (const s of stairs) m.lights.push({ x: (s + 2.5) * T, y: 25 * T, r: 54, i: 0.55, col: '#ff3b30', f: 0.1 });
  m.spawns = [{ x: 11.5, y: 29 }, { x: 30.5, y: 29 }, { x: 49.5, y: 29 }, { x: 0.5, y: 15.5 }, { x: W - 0.5, y: 15.5 }];
  m.spawnRing = 0.22;
  m.doors = [4, 10, 16, 22, 28, 34, 40, 46, 52];
  m.dyn = drawStationDyn;
  return m;
}
function drawStationDyn(ctx, cx, cy, g) {
  const m = g.map, tr = g.train;
  if (tr) {
    const x0 = Math.round(tr.x - cx), y0 = Math.round(8 - cy), L = 57 * T;
    R(ctx, OUTLINE, x0 - 1, y0 - 1, L + 2, 76); R(ctx, '#d9dde3', x0, y0, L, 74); R(ctx, '#2e6db5', x0, y0 + 46, L, 6); R(ctx, '#aeb4bc', x0, y0 + 60, L, 14);
    for (let wx = 10; wx < L - 16; wx += 24) { R(ctx, '#2a3a4f', x0 + wx, y0 + 12, 16, 28); R(ctx, 'rgba(255,238,190,0.6)', x0 + wx + 1, y0 + 13, 14, 26); }
    R(ctx, '#1d2633', x0, y0 + 8, 10, 34); R(ctx, '#fff4c0', x0 + 1, y0 + 50, 4, 4);
  }
  const y = 6 * T - cy, open = g.doorOpen || 0;
  R(ctx, '#15181e', -cx, y - 5, m.pw, 5);
  for (let tx = 0; tx < m.w; tx++) {
    const px = tx * T - cx; if (px < -T - 14 || px > VC.w + 14) continue;
    const L = m.doors.includes(tx), Rr = m.doors.includes(tx - 1);
    R(ctx, '#20242c', px, y + T - 3, T, 3);
    if (!L && !Rr) { R(ctx, '#3b414c', px, y, T, T - 3); R(ctx, 'rgba(143,179,196,0.38)', px + 2, y + 2, T - 4, T - 7); R(ctx, '#2b3038', px, y, 1, T - 3); }
    else {
      const s = Math.round(open * 13);
      if (L) { R(ctx, '#4a515e', px - s, y, T - 1, T - 3); R(ctx, 'rgba(143,179,196,0.42)', px + 1 - s, y + 2, T - 4, T - 7); }
      else { R(ctx, '#4a515e', px + 1 + s, y, T - 1, T - 3); R(ctx, 'rgba(143,179,196,0.42)', px + 3 + s, y + 2, T - 4, T - 7); }
      if (L) { const blink = open > 0.5 ? '#5fe07a' : ((g.t * 3) % 1 < 0.5 ? '#ff3b30' : '#6a1a16'); R(ctx, blink, px + T - 2, y - 4, 3, 2); }
    }
  }
}

/* ---------- 第二章：夜市停車場「籠子」 ---------- */
function buildCage() {
  const W = 44, H = 34, m = newMap(W, H, 'cage'), x = m.fx, rnd = seeded(23);
  setBlock(m, 0, 0, W, H, 1, 1);
  setBlock(m, 1, 6, W - 2, H - 7, 0, 0);
  setBlock(m, 0, 17, 1, 4, 0, 0); setBlock(m, W - 1, 17, 1, 4, 0, 0); setBlock(m, 20, H - 1, 4, 1, 0, 0);
  R(x, '#07080b', 0, 0, m.pw, m.ph);
  R(x, '#3a3d44', 0, 0, m.pw, 5 * T); dots(x, 0, 0, m.pw, 5 * T, ['#44474e', '#32353b', '#3f4249'], 0.15, rnd);
  for (let px = 0; px < m.pw; px += 88) { R(x, '#24262b', px, 0, 16, 5 * T); R(x, '#4a4d54', px + 16, 0, 2, 5 * T); }
  for (let px = 40; px < m.pw; px += 88) R(x, 'rgba(230,230,220,0.25)', px, 2 * T, 30, 2);
  R(x, '#8e949c', 0, 5 * T - 6, m.pw, 2); for (let px = 0; px < m.pw; px += 8) R(x, '#6d737b', px, 4 * T, 1, T - 5);
  R(x, '#15171b', 0, 5 * T, m.pw, T);
  for (let px = 0; px < m.pw; px += 4) for (let py = 0; py < T; py += 4) R(x, '#7a8088', px + ((py / 4) % 2 ? 2 : 0), 5 * T + py, 1, 1);
  R(x, '#9aa0a8', 0, 5 * T, m.pw, 1); R(x, '#9aa0a8', 0, 6 * T - 2, m.pw, 1);
  R(x, '#2a2c30', T, 6 * T, (W - 2) * T, (H - 7) * T);
  dots(x, T, 6 * T, (W - 2) * T, (H - 7) * T, ['#33353a', '#232428', '#2e3035', '#3a3c41'], 0.14, rnd);
  for (let tx = 3; tx < W - 3; tx += 3) { R(x, 'rgba(220,220,205,0.4)', tx * T, 7 * T, 1, 3 * T); R(x, 'rgba(220,220,205,0.4)', tx * T, (H - 5) * T, 1, 3 * T); }
  R(x, 'rgba(220,220,205,0.35)', 2 * T, 10 * T, (W - 4) * T, 1); R(x, 'rgba(220,220,205,0.35)', 2 * T, (H - 5) * T, (W - 4) * T, 1);
  for (let i = 0; i < 18; i++) { const px = rand(2 * T, (W - 2) * T), py = rand(7 * T, (H - 2) * T); puddle(x, px | 0, py | 0, randi(5, 12), randi(2, 4), 'rgba(15,15,18,0.6)'); }
  for (let i = 0; i < 12; i++) puddle(x, rand(2 * T, (W - 2) * T) | 0, rand(8 * T, (H - 2) * T) | 0, randi(8, 16), randi(3, 5), 'rgba(120,40,40,0.25)');
  const tin = (tx, ty) => { const bx = tx * T, by = ty * T; for (let i = 0; i < T; i++) R(x, i % 4 < 2 ? '#7b8189' : '#5c6168', bx + i, by, 1, T); if (rnd() < 0.45) R(x, 'rgba(140,70,40,0.6)', bx + randi(0, 8), by + randi(0, 9), randi(3, 8), randi(3, 7)); R(x, 'rgba(0,0,0,0.25)', bx, by + T - 3, T, 3); };
  for (let ty = 6; ty < H; ty++) { if (!(ty >= 17 && ty < 21)) { tin(0, ty); tin(W - 1, ty); } }
  for (let tx = 0; tx < W; tx++) if (!(tx >= 20 && tx < 24)) tin(tx, H - 1);
  for (const [gx, gy, gw, gh] of [[0, 17, 1, 4], [W - 1, 17, 1, 4], [20, H - 1, 4, 1]]) { R(x, '#121316', gx * T, gy * T, gw * T, gh * T); dots(x, gx * T, gy * T, gw * T, gh * T, ['#5a0f12', '#1d1e22'], 0.2, rnd); }
  for (const [cx, cy] of [[9, 12], [33, 12], [9, 25], [33, 25]]) addProp(m, PROP.column(), cx, cy, 2, 2);
  const cols = ['#c8322b', '#2e6db5', '#e0b020', '#e8e3d8', '#2f8a5a', '#6a4a9a'];
  let n = 0, tries = 0;
  while (n < 12 && tries < 300) { tries++; const tx = randi(3, W - 5), ty = randi(8, H - 4); if (Math.abs(tx - 21) < 5 && Math.abs(ty - 19) < 5) continue; if (!canPlace(m, tx, ty, 2, 1, 1)) continue; addProp(m, PROP.scooter(pick(cols)), tx, ty, 2, 1, { low: true }); n++; }
  m.hz = [[6, 9], [37, 9], [6, 29], [37, 29], [21, 11], [15, 21], [28, 21]];
  for (let px = T; px < m.pw; px += 3 * T) m.lights.push({ x: px, y: 5 * T + 8, r: 42, i: 0.55, col: '#ff5a3c', f: 0.12, lan: 1 });
  m.lights.push({ x: 22 * T, y: 12 * T, r: 120, i: 0.45, col: '#fff1c8', f: 0.05 });
  m.lights.push({ x: 22 * T, y: 26 * T, r: 110, i: 0.35, col: '#fff1c8', f: 0.1 });
  m.spawns = [{ x: 0.5, y: 19 }, { x: W - 0.5, y: 19 }, { x: 22, y: H - 0.5 }];
  m.spawnRing = 0;
  const crowd = []; const shirts = ['#c8322b', '#2e6db5', '#e0b020', '#e8e3d8', '#2f8a5a', '#1b1b1b', '#8a5a9a', '#ff7a1a', '#5fd0e6'];
  for (let i = 0; i < 64; i++) { const sh = pick(shirts); crowd.push({ x: rand(8, m.pw - 8), y: rand(18, 70), a: PROP.crowd(sh, false), b: PROP.crowd(sh, true), ph: rand(TAU), sp: rand(4, 9) }); }
  crowd.push({ x: 22 * T, y: 44, a: PROP.crowd('#c98f68', false), b: PROP.crowd('#c98f68', true), ph: 0, sp: 3, boss: 1 });
  crowd.sort((a, b) => a.y - b.y);
  m.crowd = crowd;
  m.dyn = drawCageDyn;
  return m;
}
function drawCageDyn(ctx, cx, cy, g) {
  const m = g.map, hype = g.hype || 0, t = g.t;
  for (const p of m.crowd) {
    const px = Math.round(p.x - cx), py0 = p.y - cy; if (px < -10 || px > VC.w + 10 || py0 > VC.h) continue;
    const up = p.boss ? (g.bossDead ? 0 : 0) : (Math.sin(t * p.sp + p.ph) > 1 - hype * 1.6);
    const bob = Math.round(Math.abs(Math.sin(t * p.sp * 0.8 + p.ph)) * hype * 3);
    ctx.drawImage(up ? p.b : p.a, px - 4, Math.round(py0 - bob));
    if (p.boss) { R(ctx, '#e6c14a', px - 2, Math.round(py0) + 5, 4, 1); }
  }
  for (let px = T; px < m.pw; px += 3 * T) {
    const sx = Math.round(px - cx + Math.sin(t * 2 + px) * 1.5), sy = Math.round(5 * T + 4 - cy);
    if (sx < -6 || sx > VC.w + 6) continue;
    R(ctx, '#2a1a14', sx, sy - 3, 1, 3); R(ctx, OUTLINE, sx - 3, sy, 7, 7); R(ctx, '#e0402c', sx - 2, sy + 1, 5, 5); R(ctx, '#ffb347', sx - 1, sy + 2, 3, 2);
  }
}

/* ---------- 第三章：市立醫院 ---------- */
function buildHospital() {
  const W = 56, H = 42, m = newMap(W, H, 'hospital'), x = m.fx, rnd = seeded(37);
  setBlock(m, 0, 0, W, H, 1, 1);
  const rooms = [
    { id: 'A', x: 1, y: 1, w: 11, h: 17, door: [5, 18], side: [12, 8] },
    { id: 'B', x: 17, y: 1, w: 9, h: 17, door: [20, 18], side: [16, 11] },
    { id: 'C', x: 31, y: 1, w: 9, h: 17, door: [34, 18], iso: 1 },
    { id: 'D', x: 45, y: 1, w: 10, h: 17, door: [48, 18], side: [44, 8] },
    { id: 'E', x: 1, y: 24, w: 11, h: 17, door: [5, 23], side: [12, 31] },
    { id: 'F', x: 17, y: 24, w: 9, h: 17, door: [20, 23], power: 1 },
    { id: 'G', x: 31, y: 24, w: 9, h: 17, door: [34, 23], side: [40, 34] },
    { id: 'H', x: 45, y: 24, w: 10, h: 17, door: [48, 23], side: [44, 30] }
  ];
  for (const r of rooms) setBlock(m, r.x, r.y, r.w, r.h, 0, 0);
  setBlock(m, 1, 19, W - 2, 4, 0, 0);
  for (const cxx of [13, 27, 41]) setBlock(m, cxx, 1, 3, H - 2, 0, 0);
  for (const r of rooms) {
    if (r.iso) setBlock(m, r.door[0], r.door[1], 3, 1, 1, 1); else setBlock(m, r.door[0], r.door[1], 3, 1, 0, 0);
    if (r.side) setBlock(m, r.side[0], r.side[1], 1, 3, 0, 0);
  }
  m.rooms = rooms;
  const iso = rooms[2]; m.isoDoor = { x: iso.door[0], y: iso.door[1] };
  const inRoom = (tx, ty) => rooms.find(r => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const bx = tx * T, by = ty * T, k = ty * W + tx;
    if (m.solid[k]) continue;
    const r = inRoom(tx, ty);
    if (r) { R(x, r.power ? '#9aa39a' : r.iso ? '#b9b2b6' : '#b3bdb1', bx, by, T, T); R(x, 'rgba(0,0,0,0.07)', bx, by, T, 1); R(x, 'rgba(0,0,0,0.07)', bx, by, 1, T); dots(x, bx, by, T, T, ['#a8b3a6', '#bcc6ba'], 0.06, rnd); }
    else { R(x, '#c4c9cb', bx, by, T, T); R(x, 'rgba(0,0,0,0.06)', bx, by, T, 1); R(x, 'rgba(0,0,0,0.06)', bx, by, 1, T); dots(x, bx, by, T, T, ['#b6bbbd', '#cfd3d5'], 0.05, rnd); }
  }
  R(x, '#3f9a5a', T, 20 * T + 6, (W - 2) * T, 2); R(x, '#c8453c', T, 21 * T + 8, (W - 2) * T, 2);
  for (const cxx of [13, 27, 41]) R(x, '#3a7fc0', cxx * T + 23, T, 2, (H - 2) * T);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const k = ty * W + tx; if (!m.solid[k]) continue;
    const bx = tx * T, by = ty * T, below = ty + 1 < H && !m.solid[k + W];
    if (below) { R(x, '#2b3037', bx, by, T, 5); R(x, '#dfe2de', bx, by + 5, T, 11); R(x, '#f2f4f1', bx, by + 5, T, 1); R(x, '#8a9aa0', bx, by + 11, T, 2); R(x, '#a9afab', bx, by + T - 1, T, 1); }
    else { R(x, '#2b3037', bx, by, T, T); if (ty > 0 && !m.solid[k - W]) R(x, '#454b54', bx, by, T, 1); if (tx > 0 && !m.solid[k - 1]) R(x, '#454b54', bx, by, 1, T); if (tx < W - 1 && !m.solid[k + 1]) R(x, '#454b54', bx + T - 1, by, 1, T); }
  }
  const isoX = m.isoDoor.x * T, isoY = m.isoDoor.y * T;
  m.isoImg = P2(48, 16, (c) => { R(c, '#5d6470', 0, 0, 48, 16); R(c, '#7a828e', 1, 5, 46, 10); R(c, '#c8322b', 0, 8, 48, 3); for (let i = 0; i < 48; i += 6) R(c, '#1b1b1b', i, 8, 3, 3); R(c, '#e8e3d8', 20, 1, 8, 3); });
  x.drawImage(m.isoImg, isoX, isoY);
  for (const r of rooms) {
    if (r.power) {
      addProp(m, PROP.generator(), r.x + 1, r.y + 2, 2, 1); addProp(m, PROP.generator(), r.x + 6, r.y + 2, 2, 1);
      for (let i = 0; i < r.w * T; i++) { x.fillStyle = (i >> 2) % 2 ? '#1b1b1b' : '#e0b020'; x.fillRect(r.x * T + i, (r.y + r.h) * T - 4, 1, 4); }
      m.powerPt = { x: (r.x + r.w / 2) * T, y: (r.y + 6) * T };
      R(x, '#3a3f48', m.powerPt.x - 10, m.powerPt.y - 28, 20, 14); R(x, '#8fdc6a', m.powerPt.x - 7, m.powerPt.y - 25, 3, 3); R(x, '#d8423c', m.powerPt.x - 2, m.powerPt.y - 25, 3, 3); R(x, '#e0b020', m.powerPt.x + 3, m.powerPt.y - 25, 3, 3);
      continue;
    }
    if (r.iso) {
      for (let i = 0; i < 3; i++) { const bx = r.x + 1 + i * 3; if (canPlace(m, bx, r.y + 2, 2, 1, 0)) addProp(m, PROP.bed(true), bx, r.y + 2, 2, 1, { low: true }); }
      bloodTrail(x, (r.x + 4) * T, (r.y + 5) * T, (r.x + 5) * T, (r.y + 15) * T); stain(x, (r.x + 5) * T, (r.y + 10) * T, 20, '#5a0f12');
      m.isoPt = { x: (r.x + r.w / 2) * T, y: (r.y + 9) * T };
      continue;
    }
    for (let bx = r.x + 1; bx + 2 <= r.x + r.w - 1; bx += 3) { if (canPlace(m, bx, r.y + 1, 2, 1, 0) && rnd() < 0.85) addProp(m, PROP.bed(rnd() < 0.4), bx, r.y + 1, 2, 1, { low: true }); }
    for (let bx = r.x + 1; bx + 2 <= r.x + r.w - 1; bx += 3) { if (canPlace(m, bx, r.y + r.h - 3, 2, 1, 0) && rnd() < 0.6) addProp(m, PROP.bed(rnd() < 0.4), bx, r.y + r.h - 3, 2, 1, { low: true }); }
    for (let i = 0; i < 3; i++) stain(x, (r.x + rnd() * r.w) * T, (r.y + 4 + rnd() * (r.h - 8)) * T, randi(6, 14), '#6d1616');
  }
  addProp(m, PROP.counter(), 22, 19, 4, 1, { low: true });
  for (const [vx, vy] of [[2, 19], [53, 19], [28, 35], [14, 5]]) if (canPlace(m, vx, vy, 1, 1, 0)) addProp(m, PROP.vending(), vx, vy, 1, 1);
  for (let i = 0; i < 10; i++) bloodTrail(x, rand(2 * T, 54 * T), rand(19 * T, 23 * T), rand(2 * T, 54 * T), rand(19 * T, 23 * T));
  for (let px = 3; px < W - 2; px += 6) m.lights.push({ x: px * T, y: 20.5 * T, r: 70, i: 0.75, pw: 1, f: 0 });
  for (const cxx of [14, 28, 42]) for (let py = 4; py < H - 2; py += 7) m.lights.push({ x: cxx * T + 8, y: py * T, r: 60, i: 0.7, pw: 1, f: 0 });
  for (const r of rooms) m.lights.push({ x: (r.x + r.w / 2) * T, y: (r.y + r.h / 2) * T, r: 80, i: 0.6, pw: 1, f: 0 });
  for (const [ex, ey] of [[1.5, 19.3], [54.5, 19.3], [14, 1.3], [42, 40.5]]) m.lights.push({ x: ex * T, y: ey * T, r: 30, i: 0.6, col: '#5fe07a', f: 0 });
  m.lights.push({ x: isoX + 24, y: isoY + 8, r: 44, i: 0.6, col: '#ff3b30', f: 0.2, iso: 1 });
  m.spawns = []; m.spawnRing = 1;
  m.dyn = drawHospitalDyn;
  return m;
}
function drawHospitalDyn(ctx, cx, cy, g) {
  const m = g.map;
  if (g.isoOpen) { const x0 = m.isoDoor.x * T - cx, y0 = m.isoDoor.y * T - cy; R(ctx, '#15181d', x0, y0, 48, 16); R(ctx, '#5d6470', x0 - 6, y0, 6, 16); R(ctx, '#5d6470', x0 + 48, y0, 6, 16); }
}

/* ---------- 第四章：國道汐止高架 ---------- */
function buildHighway() {
  const W = 72, H = 28, m = newMap(W, H, 'highway'), x = m.fx, rnd = seeded(51);
  setBlock(m, 0, 0, W, H, 1, 1);
  setBlock(m, 0, 4, W, 20, 0, 0);
  setBlock(m, 12, 24, 6, 4, 0, 0); setBlock(m, 52, 24, 6, 4, 0, 0);
  R(x, '#05070b', 0, 0, m.pw, m.ph);
  for (let i = 0; i < 260; i++) { const py = rnd() < 0.5 ? rnd() * 3 * T : (25 + rnd() * 3) * T; R(x, pick(['#ffd88a', '#fff4d0', '#ff8a5a', '#8fb6e8']), rnd() * m.pw, py, 1, 1); }
  const fog = x.createLinearGradient(0, 0, 0, 3 * T); fog.addColorStop(0, 'rgba(40,50,70,0.25)'); fog.addColorStop(1, 'rgba(10,12,18,0)'); x.fillStyle = fog; x.fillRect(0, 0, m.pw, 3 * T);
  R(x, '#27292d', 0, 4 * T, m.pw, 20 * T); dots(x, 0, 4 * T, m.pw, 20 * T, ['#2f3136', '#212327', '#34363b', '#1c1e21'], 0.15, rnd);
  for (const [rx] of [[12], [52]]) { R(x, '#27292d', rx * T, 24 * T, 6 * T, 4 * T); dots(x, rx * T, 24 * T, 6 * T, 4 * T, ['#2f3136', '#212327'], 0.15, rnd); const sh = x.createLinearGradient(0, 24 * T, 0, 28 * T); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.7)'); x.fillStyle = sh; x.fillRect(rx * T, 24 * T, 6 * T, 4 * T); }
  for (const ly of [7, 10, 13, 16, 19]) for (let px = 0; px < m.pw; px += 32) R(x, 'rgba(230,230,220,0.55)', px, ly * T, 16, 2);
  R(x, 'rgba(230,230,220,0.6)', 0, 4 * T + 6, m.pw, 2); R(x, 'rgba(230,200,60,0.6)', 0, 23 * T + 8, m.pw, 2);
  const jersey = (ty, face) => { for (let tx = 0; tx < W; tx++) { if (ty === 24 && ((tx >= 12 && tx < 18) || (tx >= 52 && tx < 58))) continue; const bx = tx * T, by = ty * T; R(x, '#6f7276', bx, by, T, T); R(x, '#9a9da1', bx, by + (face ? 0 : 4), T, 5); R(x, '#55585c', bx, by + T - 3, T, 3); if (tx % 4 === 0) R(x, '#ffb347', bx + 6, by + 7, 3, 2); } };
  jersey(3, 0); jersey(24, 1);
  for (let i = 0; i < 40; i++) stain(x, rand(0, m.pw), rand(5 * T, 23 * T), randi(4, 10), 'rgba(10,10,12,0.5)');
  for (let i = 0; i < 14; i++) bloodTrail(x, rand(0, m.pw), rand(5 * T, 22 * T), rand(0, m.pw), rand(5 * T, 22 * T));
  m.amb = { tx: 34, ty: 12, tw: 3, th: 2 };
  const ab = addProp(m, PROP.ambulance(), 34, 12, 3, 2, { kind: 'amb' });
  m.ambProp = ab; m.ambPt = { x: 35.5 * T, y: 13 * T };
  addProp(m, PROP.bus(), 5, 6, 6, 2); addProp(m, PROP.truck(), 44, 17, 5, 2);
  for (const [sx, sy] of [[59, 5], [60, 5], [61, 5], [59, 10], [60, 10], [61, 10]]) addProp(m, PROP.sandbag(), sx, sy, 1, 1, { low: true });
  addProp(m, PROP.barrier(), 64, 6, 2, 1, { low: true }); addProp(m, PROP.barrier(), 64, 9, 2, 1, { low: true });
  addProp(m, PROP.armyTruck(), 62, 14, 4, 2);
  m.crateAt = { x: 63.5 * T, y: 7.8 * T };
  const cc = ['#c8322b', '#2e6db5', '#e8e3d8', '#1b1b1b', '#8a8f96', '#2f8a5a', '#d8a23a', '#6a4a9a'];
  let n = 0, tries = 0; const fires = [];
  while (n < 22 && tries < 500) {
    tries++; const tx = randi(1, W - 5), ty = randi(5, 21);
    if (Math.abs(tx - 35) < 7 && Math.abs(ty - 13) < 5) continue;
    if (tx > 56 && ty < 12) continue;
    if (!canPlace(m, tx, ty, 3, 2, 1)) continue;
    const p = addProp(m, PROP.car(pick(cc), rnd() < 0.5), tx, ty, 3, 2); n++;
    if (fires.length < 4 && rnd() < 0.2) fires.push({ x: (tx + 1.5) * T, y: (ty + 0.6) * T });
  }
  m.fires = fires;
  for (const f of fires) m.lights.push({ x: f.x, y: f.y, r: 70, i: 0.7, col: '#ff8a3c', f: 0.35 });
  m.hz = [];
  for (let i = 0; i < 7; i++) { for (let k = 0; k < 40; k++) { const tx = randi(2, W - 3), ty = randi(5, 22); if (canPlace(m, tx, ty, 1, 1, 1) && Math.abs(tx - 35) > 4) { m.hz.push([tx, ty]); break; } } }
  for (let px = 6; px < W; px += 12) { const on = rnd() < 0.55; m.lights.push({ x: px * T, y: 4 * T, r: on ? 90 : 0, i: 0.55, col: '#ffb45a', f: on ? 0.05 : 0 }); }
  m.spawns = [];
  for (let sy = 6; sy <= 21; sy += 3) { m.spawns.push({ x: 0.5, y: sy }); m.spawns.push({ x: W - 0.5, y: sy }); }
  m.spawns.push({ x: 15, y: 27.5 }, { x: 15, y: 27.5 }, { x: 55, y: 27.5 }, { x: 55, y: 27.5 });
  m.spawnRing = 0.35;
  m.dist2 = new Int16Array(W * H);
  const srcs = []; for (let j = 11; j <= 14; j++) for (let i = 33; i <= 37; i++) if (!m.solid[j * W + i]) srcs.push([i, j]);
  flowField(m, srcs, m.dist2);
  m.dyn = null;
  return m;
}
function drawAmbLights(ctx, a, cx, cy, t) {
  const on = (t * 4) % 2 < 1;
  const lx = a.x + 14 - cx, ly = a.y + 1 - cy;
  R(ctx, on ? '#ff3b30' : '#5a1a16', lx, ly, 8, 3); R(ctx, on ? '#1b2d5a' : '#3f7bff', lx + 12, ly, 8, 3);
}

/* ---------- 第五章：基隆港西岸碼頭 ---------- */
function buildHarbor(noShip) {
  const W = 64, H = 44, m = newMap(W, H, 'harbor'), x = m.fx, rnd = seeded(73);
  m.noShip = !!noShip;
  setBlock(m, 0, 0, W, H, 1, 1);
  setBlock(m, 0, 7, W, H - 8, 0, 0);
  setBlock(m, 34, 6, 3, 1, 0, 0); setBlock(m, 7, 6, 3, 1, 0, 0);
  for (const gx of [10, 30, 50]) setBlock(m, gx, H - 1, 4, 1, 0, 0);
  R(x, '#0b1a27', 0, 0, m.pw, 7 * T);
  for (let i = 0; i < 400; i++) R(x, pick(['#12283a', '#0e2233', '#1a3650']), rnd() * m.pw, rnd() * 7 * T, randi(3, 9), 1);
  if (!noShip) {
  R(x, OUTLINE, 20 * T - 1, 0, 31 * T + 2, 6 * T + 6);
  R(x, '#1a2638', 20 * T, 0, 31 * T, 6 * T + 5);
  R(x, '#d8dde2', 20 * T, 0, 31 * T, 14); R(x, '#aab2ba', 20 * T, 14, 31 * T, 2);
  for (let px = 20 * T + 6; px < 51 * T - 6; px += 14) { R(x, '#2a3a50', px, 30, 7, 7); R(x, '#ffe6a0', px + 1, 31, 5, 5); }
  for (let px = 20 * T; px < 51 * T; px += 22) R(x, 'rgba(255,255,255,0.05)', px, 16, 1, 6 * T - 12);
  R(x, '#8a2a26', 20 * T, 6 * T + 1, 31 * T, 4);
  R(x, '#9aa0a8', 20 * T, 12, 31 * T, 1);
  }
  R(x, OUTLINE, 0, 0, 18 * T + 1, 6 * T + 2);
  R(x, '#5e241d', 0, 0, 18 * T, 6 * T + 1);
  for (let px = 0; px < 18 * T; px += 5) R(x, pick(['#7a3a26', '#4a1a14', '#8a4a2a']), px, randi(0, 40), 2, randi(20, 80));
  R(x, '#3a1612', 0, 6 * T - 6, 18 * T, 6);
  R(x, '#0a0a0a', 7 * T, 4 * T, 3 * T, 2 * T + 2); R(x, '#241210', 7 * T - 2, 4 * T - 2, 3 * T + 4, 2);
  if (!noShip) { R(x, '#5a6068', 34 * T, 2 * T, 3 * T, 5 * T); for (let py = 2 * T; py < 7 * T; py += 4) R(x, '#8a9098', 34 * T, py, 3 * T, 1); R(x, '#c8ccd2', 34 * T, 2 * T, 1, 5 * T); R(x, '#c8ccd2', 37 * T - 1, 2 * T, 1, 5 * T); } else setBlock(m, 34, 6, 3, 1, 1, 1);
  R(x, '#76787a', 0, 7 * T, m.pw, (H - 7) * T); dots(x, 0, 7 * T, m.pw, (H - 7) * T, ['#6d6f71', '#808284', '#707274', '#626466'], 0.14, rnd);
  for (let px = 0; px < m.pw; px += 8 * T) R(x, '#5e6062', px, 7 * T, 1, (H - 7) * T);
  for (let py = 7 * T; py < m.ph; py += 8 * T) R(x, '#5e6062', 0, py, m.pw, 1);
  R(x, '#e0b020', 0, 7 * T + 4, m.pw, 2); R(x, '#4a4c4e', 0, 7 * T, m.pw, 3);
  for (let i = 0; i < 30; i++) stain(x, rand(0, m.pw), rand(8 * T, 42 * T), randi(5, 14), 'rgba(40,40,42,0.35)');
  for (let i = 0; i < 10; i++) bloodTrail(x, rand(0, m.pw), rand(10 * T, 40 * T), rand(0, m.pw), rand(10 * T, 40 * T));
  for (let tx = 0; tx < W; tx++) { if (tx >= 10 && tx < 14 || tx >= 30 && tx < 34 || tx >= 50 && tx < 54) continue; const bx = tx * T, by = (H - 1) * T; R(x, '#15171b', bx, by, T, T); for (let i = 0; i < T; i += 4) for (let j = 0; j < T; j += 4) R(x, '#7a8088', bx + i + (j % 8 ? 2 : 0), by + j, 1, 1); R(x, '#9aa0a8', bx, by, T, 1); }
  const cols = ['#a8322b', '#2b5a9a', '#2f7a4a', '#c8641e', '#6b7178', '#8a2a5a'];
  for (const [cx0, cy0] of [[2, 16], [2, 24], [2, 32], [9, 20], [9, 28], [9, 36], [17, 24], [17, 32], [43, 16], [43, 24], [43, 32], [50, 20], [50, 28], [50, 36], [57, 16], [57, 24], [57, 32]]) addProp(m, PROP.container(pick(cols)), cx0, cy0, 5, 2);
  for (const bx of [22, 26, 30, 40, 44, 48, 55, 60, 2, 12]) if (canPlace(m, bx, 7, 1, 1, 0)) addProp(m, PROP.bollard(), bx, 7, 1, 1, { low: true });
  for (const [bx, by] of [[27, 12], [29, 12], [38, 12], [40, 12]]) addProp(m, PROP.barrier(), bx, by, 2, 1, { low: true });
  addProp(m, PROP.tent(), 23, 9, 3, 2, { low: true });
  for (const [tx, ty] of [[21, 11], [48, 11], [33, 30]]) { addProp(m, PROP.tower(), tx, ty, 1, 1); m.lights.push({ x: tx * T + 8, y: ty * T - 20, r: 120, i: 0.6, col: '#fffbe0', f: 0 }); }
  if (!noShip) { for (let px = 21 * T; px < 51 * T; px += 42) m.lights.push({ x: px, y: 2 * T + 8, r: 40, i: 0.4, col: '#ffe6a0', f: 0 }); m.lights.push({ x: 35.5 * T, y: 7 * T, r: 70, i: 0.6, col: '#fff1c8', f: 0 }); }
  m.spawns = [{ x: 12, y: H - 0.5 }, { x: 32, y: H - 0.5 }, { x: 52, y: H - 0.5 }, { x: 0.5, y: 22 }, { x: 0.5, y: 34 }, { x: W - 0.5, y: 22 }, { x: W - 0.5, y: 34 }];
  m.hatch = { x: 8.5, y: 6.5 };
  m.spawnRing = 0.3;
  m.gang = { x: 35.5 * T, y: 7.6 * T };
  m.dist2 = new Int16Array(W * H);
  flowField(m, [[34, 7], [35, 7], [36, 7], [35, 6]], m.dist2);
  m.dyn = drawHarborDyn;
  m.evac = [];
  return m;
}
function drawHarborDyn(ctx, cx, cy, g) {
  const m = g.map, t = g.t;
  for (let i = 0; i < 6; i++) { const wx = ((t * 12 + i * 170) % (m.pw + 40)) - 20 - cx, wy = (0.6 + (i % 3) * 1.9) * T - cy; if (wy > -4 && wx > -30 && wx < VC.w + 30) { if (wx + cx < 20 * T - 20 || wx + cx > 51 * T) R(ctx, 'rgba(160,200,230,0.18)', wx, wy, 18, 1); } }
  if (m.noShip) return;
  for (const e of m.evac) R(ctx, OUTLINE, Math.round(e.x - cx) - 1, Math.round(e.y - cy) - 7, 4, 8), R(ctx, e.c, Math.round(e.x - cx), Math.round(e.y - cy) - 6, 2, 6);
  for (let i = 0; i < 9; i++) { const sx = (21.5 + i * 3.4) * T - cx, sy = 10 - cy; R(ctx, OUTLINE, sx - 1, sy - 1, 4, 8); R(ctx, '#4b5635', sx, sy, 2, 6); R(ctx, '#c89370', sx, sy - 1, 2, 2); }
}

