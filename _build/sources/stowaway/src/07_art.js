// ============ 美術：船體底圖、物件、船員、牠、頭像、圖示 ============
const ART = { sc: 1.6, mg: 70 };
const FLOOR = {
  hall: { b: '#3a434c', s: '#262d34', h: '#4b5560', pat: 'grate' },
  bridge: { b: '#2f3a48', s: '#1f2833', h: '#41505f', pat: 'panel' },
  office: { b: '#383d44', s: '#252a30', h: '#4a5059', pat: 'panel' },
  cabin: { b: '#463a2f', s: '#2e261e', h: '#58493b', pat: 'plank' },
  med: { b: '#47535e', s: '#33404b', h: '#5d6b77', pat: 'tile' },
  mess: { b: '#4a3d31', s: '#30271f', h: '#5d4d3e', pat: 'tile' },
  cryo: { b: '#30465a', s: '#21334a', h: '#43607a', pat: 'tile' },
  tech: { b: '#344640', s: '#22302b', h: '#46594f', pat: 'panel' },
  store: { b: '#3d4148', s: '#292c31', h: '#50555d', pat: 'diamond' },
  work: { b: '#433f37', s: '#2c2a24', h: '#56514a', pat: 'diamond' },
  reactor: { b: '#34343c', s: '#222228', h: '#45454f', pat: 'panel' },
  cargo: { b: '#3f4247', s: '#2a2c30', h: '#53575d', pat: 'diamond' },
  lab: { b: '#3f4d46', s: '#2b3731', h: '#53635a', pat: 'tile' },
  airlock: { b: '#3c4048', s: '#272a30', h: '#4f545d', pat: 'hazard' },
  dock: { b: '#363d45', s: '#242a30', h: '#47505a', pat: 'grate' },
};
function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function shade(c, x, y, w, h, r, top, bot) { const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; rr(c, x, y, w, h, r); c.fill(); }
function dropShadow(c, fn, dx = 3, dy = 5, a = .45) { c.save(); c.translate(dx, dy); c.globalAlpha = a; c.fillStyle = '#000'; fn(true); c.restore(); }
function rivets(c, x, y, w, h, gap, col) { c.fillStyle = col; for (let i = x + gap / 2; i < x + w; i += gap) { c.fillRect(i - 1, y + 2, 2, 2); c.fillRect(i - 1, y + h - 4, 2, 2); } }
function screen(c, x, y, w, h, col, lines = 3) {
  c.fillStyle = '#05080b'; rr(c, x, y, w, h, 2); c.fill();
  const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, rgba(col, .55)); g.addColorStop(1, rgba(col, .25));
  c.fillStyle = g; rr(c, x + 1.5, y + 1.5, w - 3, h - 3, 1.5); c.fill();
  c.fillStyle = rgba(col, .9);
  for (let k = 0; k < lines; k++) c.fillRect(x + 4, y + 4 + k * (h - 8) / lines, (w - 8) * (.4 + .5 * ((k * 37) % 10) / 10), 1.5);
}

// ---------- 船體底圖（只畫一次） ----------
function paintShip() {
  const sc = ART.sc, mg = ART.mg, W0 = MAPW * T + mg * 2, H0 = MAPH * T + mg * 2;
  const cv = mkCanvas(W0 * sc, H0 * sc), c = cv.getContext('2d');
  c.scale(sc, sc); c.translate(mg, mg);
  const rnd2 = mulberry32(7);
  // 外殼
  const hullRects = ROOMS.map(r => [r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0]);
  const hullPath = (inf, rad) => { for (const [x, y, w, h] of hullRects) { rr(c, x - inf, y - inf, w + inf * 2, h + inf * 2, rad); c.fill(); } };
  // 船首天線、引擎
  c.fillStyle = '#0a0d11';
  hullPath(30, 26);
  // 引擎座
  for (const ex of [4.4, 10.6]) { c.fillStyle = '#12171d'; rr(c, ex * T - 34, 41 * T, 68, 70, 14); c.fill(); }
  c.fillStyle = '#1b232c'; hullPath(22, 20);
  // 外殼板線
  c.save(); c.beginPath(); for (const [x, y, w, h] of hullRects) { rr(c, x - 22, y - 22, w + 44, h + 44, 20); } c.clip();
  for (let y = -40; y < MAPH * T + 40; y += 24) { c.fillStyle = (y / 24) % 2 ? '#1f2831' : '#1d252e'; c.fillRect(-40, y, MAPW * T + 80, 24); c.fillStyle = '#141a20'; c.fillRect(-40, y, MAPW * T + 80, 1.5); }
  for (let k = 0; k < 220; k++) { const x = rnd2() * MAPW * T, y = rnd2() * MAPH * T; c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(x, y, 2, 2); }
  c.restore();
  // 外殼邊緣亮線
  c.strokeStyle = 'rgba(160,190,220,.12)'; c.lineWidth = 2;
  for (const [x, y, w, h] of hullRects) { rr(c, x - 22, y - 22, w + 44, h + 44, 20); c.stroke(); }
  // 引擎噴口
  for (const ex of [4.4, 10.6]) {
    const x = ex * T, y = 42 * T + 18;
    c.fillStyle = '#0c1014'; rr(c, x - 28, y - 10, 56, 44, 10); c.fill();
    const g = c.createRadialGradient(x, y + 24, 2, x, y + 24, 30); g.addColorStop(0, '#2a3340'); g.addColorStop(1, '#0c1014');
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y + 22, 22, 14, 0, 0, TAU); c.fill();
  }
  // 船首天線
  c.strokeStyle = '#2a333d'; c.lineWidth = 4; c.beginPath(); c.moveTo(8.5 * T, -22); c.lineTo(8.5 * T, -60); c.stroke();
  c.fillStyle = '#2a333d'; c.beginPath(); c.ellipse(8.5 * T, -60, 16, 6, 0, 0, TAU); c.fill();
  // 外殼文字
  c.save(); c.fillStyle = 'rgba(236,228,210,.13)'; c.font = '900 30px ' + FONT_M; c.textAlign = 'center';
  c.translate(-8, 18 * T); c.rotate(-Math.PI / 2); c.fillText('NIGHT HERON', 0, 0); c.restore();
  c.save(); c.fillStyle = 'rgba(255,106,26,.18)'; c.font = '900 22px ' + FONT_M; c.translate(MAPW * T + 12, 25 * T); c.rotate(Math.PI / 2); c.textAlign = 'center'; c.fillText('NH-07 · 夜鷺號', 0, 0); c.restore();

  // 地板
  for (const r of ROOMS) paintFloor(c, r, rnd2);
  // 牆根陰影
  for (const r of ROOMS) {
    const x = r.x0, y = r.y0, w = r.x1 - r.x0, h = r.y1 - r.y0;
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 22; c.strokeRect(x, y, w, h);
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 10; c.strokeRect(x, y, w, h);
    c.restore();
  }
  // 物件
  paintProps(c, rnd2);
  // 牆
  paintWalls(c);
  // 房間名稱（地板上的漆字）
  for (const r of ROOMS) {
    if (r.kind === 'hall') continue;
    c.save(); c.font = '900 15px ' + FONT; c.fillStyle = 'rgba(236,228,210,.12)'; c.textAlign = 'left';
    const lx = r.x0 + 12, ly = r.y1 - 12;
    c.fillText(r.name, lx, ly); c.font = '700 10px ' + FONT_M; c.fillStyle = 'rgba(255,106,26,.22)'; c.fillText(r.code, lx, ly - 16);
    c.restore();
  }
  return cv;
}
function paintFloor(c, r, rn) {
  const F = FLOOR[r.kind], x = r.x0, y = r.y0, w = r.x1 - r.x0, h = r.y1 - r.y0;
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = F.b; c.fillRect(x, y, w, h);
  if (F.pat === 'grate') {
    for (let yy = y; yy < y + h; yy += 6) { c.fillStyle = F.s; c.fillRect(x, yy, w, 2); }
    c.fillStyle = 'rgba(0,0,0,.25)'; for (let xx = x; xx < x + w; xx += T) c.fillRect(xx, y, 3, h);
    if (r.kind === 'hall') { c.fillStyle = 'rgba(255,176,58,.16)'; c.fillRect(x + w / 2 - 3, y, 6, h); for (let yy = y + 20; yy < y + h; yy += 60) { c.fillStyle = 'rgba(255,220,150,.18)'; c.fillRect(x + w / 2 - 2, yy, 4, 14); } }
  } else if (F.pat === 'diamond') {
    c.fillStyle = F.h;
    for (let yy = y + 4; yy < y + h; yy += 12) for (let xx = x + ((yy / 12) % 2 ? 6 : 0); xx < x + w; xx += 12) { c.save(); c.translate(xx, yy); c.rotate(.6); c.fillRect(-3, -1, 6, 2); c.restore(); }
    for (let xx = x; xx < x + w; xx += T * 2) { c.fillStyle = F.s; c.fillRect(xx, y, 2, h); }
    for (let yy = y; yy < y + h; yy += T * 2) { c.fillStyle = F.s; c.fillRect(x, yy, w, 2); }
  } else if (F.pat === 'tile') {
    for (let yy = y; yy < y + h; yy += T / 2) for (let xx = x; xx < x + w; xx += T / 2) { c.fillStyle = ((xx + yy) / (T / 2)) % 2 ? F.b : F.h; c.globalAlpha = .55; c.fillRect(xx + 1, yy + 1, T / 2 - 2, T / 2 - 2); c.globalAlpha = 1; }
    c.fillStyle = F.s; for (let xx = x; xx < x + w; xx += T / 2) c.fillRect(xx, y, 1.5, h); for (let yy = y; yy < y + h; yy += T / 2) c.fillRect(x, yy, w, 1.5);
  } else if (F.pat === 'plank') {
    for (let yy = y; yy < y + h; yy += 12) { c.fillStyle = (yy / 12) % 2 ? F.b : F.h; c.globalAlpha = .5; c.fillRect(x, yy, w, 11); c.globalAlpha = 1; c.fillStyle = F.s; c.fillRect(x, yy + 11, w, 1); for (let k = 0; k < 3; k++) c.fillRect(x + ((yy * 7 + k * 97) % w), yy, 1, 11); }
  } else if (F.pat === 'hazard') {
    for (let yy = y; yy < y + h; yy += T) for (let xx = x; xx < x + w; xx += T) { c.fillStyle = F.s; c.fillRect(xx, yy, T, 1.5); c.fillRect(xx, yy, 1.5, T); }
    c.save(); c.beginPath(); c.rect(x + 6, y + 6, w - 12, h - 12); c.rect(x + 18, y + 18, w - 36, h - 36); c.clip('evenodd');
    for (let k = -h; k < w + h; k += 18) { c.fillStyle = 'rgba(255,170,30,.55)'; c.beginPath(); c.moveTo(x + k, y); c.lineTo(x + k + 9, y); c.lineTo(x + k + 9 - h, y + h); c.lineTo(x + k - h, y + h); c.fill(); }
    c.restore();
  } else {
    for (let xx = x; xx < x + w; xx += T) { c.fillStyle = F.s; c.fillRect(xx, y, 2, h); }
    for (let yy = y; yy < y + h; yy += T) { c.fillStyle = F.s; c.fillRect(x, yy, w, 2); }
    for (let yy = y; yy < y + h; yy += T) for (let xx = x; xx < x + w; xx += T) { c.fillStyle = 'rgba(255,255,255,.035)'; c.fillRect(xx + 3, yy + 3, T - 6, 3); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(xx + 4, yy + 4, 2, 2); c.fillRect(xx + T - 6, yy + 4, 2, 2); c.fillRect(xx + 4, yy + T - 6, 2, 2); c.fillRect(xx + T - 6, yy + T - 6, 2, 2); }
  }
  // 髒污、刮痕
  for (let k = 0; k < (w * h) / 900; k++) { const px = x + rn() * w, py = y + rn() * h; c.fillStyle = rn() < .5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.03)'; c.beginPath(); c.ellipse(px, py, 3 + rn() * 10, 2 + rn() * 5, rn() * 3, 0, TAU); c.fill(); }
  // 特殊地板
  if (r.kind === 'reactor') {
    const cx = 13 * T, cy = 26 * T;
    c.save(); c.beginPath(); c.arc(cx, cy, 92, 0, TAU); c.arc(cx, cy, 74, 0, TAU, true); c.clip();
    for (let a = 0; a < TAU; a += .2) { c.fillStyle = 'rgba(255,170,30,.5)'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, 95, a, a + .1); c.fill(); }
    c.restore();
  }
  if (r.kind === 'cargo') {
    c.strokeStyle = 'rgba(255,190,60,.35)'; c.lineWidth = 3; c.setLineDash([16, 10]);
    c.strokeRect(r.x0 + 30, r.y0 + 30, (r.x1 - r.x0) - 60, (r.y1 - r.y0) - 60); c.setLineDash([]);
    c.font = '900 38px ' + FONT_M; c.fillStyle = 'rgba(255,190,60,.12)'; c.fillText('BAY 01', r.x0 + 70, r.y1 - 60);
  }
  if (r.kind === 'dock') { c.strokeStyle = 'rgba(255,190,60,.4)'; c.lineWidth = 3; rr(c, 4.7 * T, 38.8 * T, 5.6 * T, 3.4 * T, 30); c.stroke(); }
  c.restore();
}
function paintWalls(c) {
  const WT = 10;
  const segs = [];
  for (let y = 0; y < MAPH; y++) for (let x = 0; x <= MAPW; x++) {
    const a = roomIdx(x - 1, y), b = roomIdx(x, y);
    if (a === b) continue; if (a < 0 && b < 0) continue;
    const d = doorBetween(x - 1, y, x, y); if (d && d.kind !== 'airout') continue;
    segs.push(['v', x, y, d]);
  }
  for (let y = 0; y <= MAPH; y++) for (let x = 0; x < MAPW; x++) {
    const a = roomIdx(x, y - 1), b = roomIdx(x, y);
    if (a === b) continue; if (a < 0 && b < 0) continue;
    const d = doorBetween(x, y - 1, x, y); if (d) continue;
    segs.push(['h', x, y, null]);
  }
  // 北牆的牆面（3/4 視角看得到的那一面）
  for (const [o, x, y] of segs) if (o === 'h' && roomIdx(x, y) >= 0) { const g = c.createLinearGradient(0, y * T, 0, y * T + 16); g.addColorStop(0, '#2a333c'); g.addColorStop(1, 'rgba(20,26,32,0)'); c.fillStyle = g; c.fillRect(x * T - 1, y * T + 3, T + 2, 15); }
  c.fillStyle = '#0d1115';
  for (const [o, x, y] of segs) { if (o === 'v') c.fillRect(x * T - WT / 2 - 1, y * T - WT / 2 - 1, WT + 2, T + WT + 2); else c.fillRect(x * T - WT / 2 - 1, y * T - WT / 2 - 1, T + WT + 2, WT + 2); }
  c.fillStyle = '#3b4652';
  for (const [o, x, y] of segs) { if (o === 'v') c.fillRect(x * T - WT / 2, y * T - WT / 2, WT, T + WT); else c.fillRect(x * T - WT / 2, y * T - WT / 2, T + WT, WT); }
  c.fillStyle = '#56636f';
  for (const [o, x, y] of segs) { if (o === 'v') c.fillRect(x * T - WT / 2 + 1, y * T - WT / 2 + 1, 3, T + WT - 2); else c.fillRect(x * T - WT / 2 + 1, y * T - WT / 2 + 1, T + WT - 2, 3); }
  // 管線沿牆
  c.strokeStyle = 'rgba(120,140,160,.25)'; c.lineWidth = 2;
  for (const [o, x, y] of segs) { if (o === 'h' && (x + y) % 3 === 0) { c.beginPath(); c.moveTo(x * T, y * T + 9); c.lineTo(x * T + T, y * T + 9); c.stroke(); } }
  // 門框
  for (const d of SHIP.doors) {
    const heavy = d.kind !== 'door';
    c.fillStyle = heavy ? '#4a3a20' : '#2c3640';
    if (d.orient === 'v') { c.fillRect(d.x - 8, d.y - d.len / 2 - 8, 16, 10); c.fillRect(d.x - 8, d.y + d.len / 2 - 2, 16, 10); }
    else { c.fillRect(d.x - d.len / 2 - 8, d.y - 8, 10, 16); c.fillRect(d.x + d.len / 2 - 2, d.y - 8, 10, 16); }
    if (d.kind === 'airout') { c.fillStyle = '#0d1115'; c.fillRect(d.x - 6, d.y - d.len / 2 - 6, 12, d.len + 12); }
  }
}
function paintProps(c, rn) {
  const P = (x, y) => [x * T, y * T];
  // ---- 艦橋 ----
  { const [x, y] = P(4.3, .15); dropShadow(c, () => { rr(c, x, y, 8.4 * T, 30, 10); c.fill(); });
    shade(c, x, y, 8.4 * T, 30, 10, '#3c4856', '#26303b');
    for (let k = 0; k < 7; k++) screen(c, x + 12 + k * 56, y + 6, 44, 16, k === 3 ? '#ff8a3d' : '#6fe8ff', 2);
    c.fillStyle = '#1a222b'; c.fillRect(x + 6, y + 26, 8.4 * T - 12, 4); }
  { const [x, y] = P(8.5, 2.25); dropShadow(c, () => { c.beginPath(); c.ellipse(x, y, 17, 15, 0, 0, TAU); c.fill(); }); shade(c, x - 16, y - 14, 32, 28, 12, '#5a4636', '#3a2c22'); c.fillStyle = '#2a2018'; rr(c, x - 12, y + 6, 24, 8, 4); c.fill(); }
  for (const sx of [6.2, 10.8]) { const [x, y] = P(sx, 2.3); shade(c, x - 12, y - 11, 24, 22, 9, '#3c4652', '#28313b'); }
  { const [x, y] = P(4.15, .9); shade(c, x, y, 30, 40, 4, '#34404c', '#222a33'); screen(c, x + 5, y + 6, 20, 26, '#ffb03a', 4); }
  { const [x, y] = P(4.1, 3.7); shade(c, x, y, 26, 34, 3, '#4a3a2a', '#33281d'); c.fillStyle = '#ff6a1a'; c.fillRect(x + 4, y + 4, 18, 4); }
  { const [x, y] = P(11.3, .7); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x, y, 34, 18); }
  // ---- 通訊室 ----
  { const [x, y] = P(2.15, 5.15); shade(c, x, y, 2.4 * T, 26, 4, '#3a4450', '#262e38'); screen(c, x + 8, y + 5, 40, 16, '#6fe8ff', 3); screen(c, x + 56, y + 5, 40, 16, '#86f0a0', 2); }
  { const [x, y] = P(2.2, 7.7); dropShadow(c, () => { rr(c, x, y, 2.5 * T, 26, 4); c.fill(); }); shade(c, x, y, 2.5 * T, 26, 4, '#4a4036', '#332b24'); c.fillStyle = '#1b2026'; c.fillRect(x + 70, y + 6, 22, 14); }
  { const [x, y] = P(6.1, 8.05); shade(c, x, y, 34, 40, 3, '#3a4048', '#262b31'); }
  // ---- 艦長室 ----
  { const [x, y] = P(9.15, 7.2); dropShadow(c, () => { rr(c, x, y, 2.4 * T, 1.6 * T, 6); c.fill(); }); shade(c, x, y, 2.4 * T, 1.6 * T, 6, '#2e3a4a', '#1f2834'); shade(c, x + 4, y + 4, 2.4 * T - 8, 30, 5, '#d8d2c4', '#a8a294'); c.fillStyle = 'rgba(80,110,150,.6)'; c.fillRect(x + 4, y + 40, 2.4 * T - 8, 34); }
  { const [x, y] = P(13.35, 5.15); shade(c, x, y, 28, 1.8 * T, 3, '#4a3e30', '#30281e'); c.fillStyle = '#1c1712'; c.fillRect(x + 13, y + 6, 2, 1.8 * T - 12); }
  { const [x, y] = P(9.3, 5.25); c.fillStyle = '#2a2420'; rr(c, x, y, 60, 26, 3); c.fill(); c.fillStyle = 'rgba(255,220,180,.25)'; c.fillRect(x + 8, y + 6, 20, 14); }
  // ---- 寢艙 ----
  for (const by of [10.6, 12.4]) { const [x, y] = P(1.1, by); dropShadow(c, () => { rr(c, x, y, 2.1 * T, 1.3 * T, 5); c.fill(); }); shade(c, x, y, 2.1 * T, 1.3 * T, 5, '#3a3e46', '#262a30'); shade(c, x + 4, y + 4, 26, 1.3 * T - 8, 4, '#cfc8b8', '#a39d8e'); c.fillStyle = by < 12 ? 'rgba(90,168,255,.55)' : 'rgba(134,240,160,.45)'; c.fillRect(x + 34, y + 5, 2.1 * T - 40, 1.3 * T - 10); }
  for (const lx of [2.05, 5.05]) { const [x, y] = P(lx, 9.08); shade(c, x, y, 44, 24, 3, '#56606c', '#3a424c'); c.fillStyle = '#20262c'; c.fillRect(x + 21, y + 3, 2, 18); c.fillStyle = lx < 3 ? '#86f0a0' : '#ff5a5a'; c.fillRect(x + 4, y + 4, 6, 3); }
  { const [x, y] = P(6.25, 12.7); shade(c, x, y, 34, 58, 3, '#4b5560', '#323a43'); c.fillStyle = '#1b2026'; c.fillRect(x + 16, y + 5, 2, 48); }
  // ---- 醫務室 ----
  { const [x, y] = P(10.5, 10.35); dropShadow(c, () => { rr(c, x, y, 1.8 * T, 34, 8); c.fill(); }); shade(c, x, y, 1.8 * T, 34, 8, '#e2e8ec', '#a8b2ba'); c.fillStyle = '#7fd7e8'; c.fillRect(x + 6, y + 6, 1.8 * T - 12, 4); }
  { const [x, y] = P(14.35, 9.35); shade(c, x, y, 26, 1.8 * T, 3, '#e4e9ee', '#b0b8c0'); c.fillStyle = '#ff3d3d'; c.fillRect(x + 9, y + 20, 8, 3); c.fillRect(x + 11.5, y + 17.5, 3, 8); }
  { const [x, y] = P(13.3, 12.9); dropShadow(c, () => { rr(c, x, y, 1.5 * T, 1.05 * T, 22); c.fill(); }); shade(c, x, y, 1.5 * T, 1.05 * T, 22, '#c8d6e0', '#7e8e9a'); c.fillStyle = 'rgba(111,232,255,.35)'; rr(c, x + 8, y + 8, 1.5 * T - 16, 1.05 * T - 16, 14); c.fill(); }
  { const [x, y] = P(9.2, 13.2); screen(c, x, y, 40, 24, '#86f0a0', 2); }
  // ---- 餐廳 ----
  { const [x, y] = P(2.75, 15.75); dropShadow(c, () => { rr(c, x, y, 2.5 * T, 2.5 * T, 10); c.fill(); }, 4, 7);
    shade(c, x, y, 2.5 * T, 2.5 * T, 10, '#7a6450', '#5a4838'); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(x + 6, y + k * 24); c.lineTo(x + 2.5 * T - 6, y + k * 24); c.stroke(); }
    c.fillStyle = '#d8d0c0'; for (const [mx, my] of [[18, 20], [70, 24], [34, 82], [86, 76]]) { c.beginPath(); c.ellipse(x + mx, y + my, 7, 7, 0, 0, TAU); c.fill(); }
    c.fillStyle = '#c94'; c.fillRect(x + 50, y + 50, 6, 10); }
  for (const [sx, sy] of [[2.4, 15.4], [2.4, 18.3], [5.6, 15.4], [5.6, 18.3], [3.2, 18.6], [4.6, 15.15]]) { const [x, y] = P(sx, sy); shade(c, x - 9, y - 9, 18, 18, 6, '#4a3f36', '#2e2721'); }
  { const [x, y] = P(1.05, 14.2); shade(c, x, y, 26, 1.8 * T, 3, '#6a5a4a', '#4a3e33'); }
  { const [x, y] = P(5.9, 14.12); shade(c, x, y, 50, 24, 3, '#8a8c90', '#5e6064'); c.fillStyle = '#2a2c30'; c.beginPath(); c.arc(x + 14, y + 12, 6, 0, TAU); c.arc(x + 34, y + 12, 6, 0, TAU); c.fill(); }
  { const [x, y] = P(6.2, 18.6); shade(c, x, y, 36, 62, 3, '#c9d2da', '#8e98a2'); c.fillStyle = '#5a646e'; c.fillRect(x + 4, y + 26, 28, 2); }
  // ---- 休眠艙 ----
  for (const py of [14.15, 15.35, 16.55]) { const [x, y] = P(13.65, py); dropShadow(c, () => { rr(c, x, y, 1.25 * T, 52, 24); c.fill(); }); shade(c, x, y, 1.25 * T, 52, 24, '#b8c8d6', '#6e7e8c'); c.fillStyle = 'rgba(150,220,255,.45)'; rr(c, x + 8, y + 8, 1.25 * T - 16, 36, 16); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + 14, y + 12, 18, 3); }
  { const [x, y] = P(9.1, 14.1); shade(c, x, y, 28, 1.2 * T, 3, '#5a6878', '#3a4652'); for (let k = 0; k < 3; k++) { c.fillStyle = '#9fe6ff'; c.beginPath(); c.arc(x + 14, y + 12 + k * 15, 5, 0, TAU); c.fill(); } }
  { const [x, y] = P(10.2, 16.6); screen(c, x, y, 56, 20, '#6fe8ff', 2); }
  // ---- 維生室 ----
  for (const sx of [9.4, 10.9]) { const [x, y] = P(sx, 18.25); dropShadow(c, () => { rr(c, x, y, 58, 58, 10); c.fill(); }); shade(c, x, y, 58, 58, 10, '#4c5e56', '#2e3a35'); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 2; c.beginPath(); c.arc(x + 29, y + 29, 18, 0, TAU); c.stroke(); for (let a = 0; a < TAU; a += TAU / 6) { c.beginPath(); c.moveTo(x + 29, y + 29); c.lineTo(x + 29 + Math.cos(a) * 16, y + 29 + Math.sin(a) * 16); c.stroke(); } }
  { const [x, y] = P(14.4, 18.1); shade(c, x, y, 28, 1.4 * T, 3, '#3c4844', '#26302c'); screen(c, x + 4, y + 6, 20, 30, '#86f0a0', 4); for (let k = 0; k < 4; k++) { c.fillStyle = '#ffb03a'; c.fillRect(x + 6 + (k % 2) * 10, y + 42 + Math.floor(k / 2) * 8, 6, 4); } }
  { const [x, y] = P(14.4, 20.8); shade(c, x, y, 26, 54, 3, '#4b5560', '#323a43'); }
  { const [x, y] = P(9.05, 20.75); shade(c, x, y, 30, 58, 3, '#3e4650', '#2a3038'); c.fillStyle = '#ffb03a'; c.fillRect(x + 3, y + 3, 24, 3); }
  // ---- 儲藏室 ----
  for (const [sx, sy, w, h] of [[1.05, 20.1, 50, 40], [3.1, 20.08, 2.2 * T, 22], [5.6, 22.6, 46, 44], [1.05, 22.8, 52, 50]]) { const [x, y] = P(sx, sy); dropShadow(c, () => { rr(c, x, y, w, h, 3); c.fill(); }); paintCrate(c, x, y, w, h, rn); }
  // ---- 工作間 ----
  { const [x, y] = P(2.4, 24.08); dropShadow(c, () => { rr(c, x, y, 3 * T, 28, 3); c.fill(); }); shade(c, x, y, 3 * T, 28, 3, '#6a5a48', '#4a3e30'); c.fillStyle = '#2a2a2e'; c.fillRect(x + 12, y + 6, 26, 14); c.fillStyle = '#ffb03a'; c.fillRect(x + 50, y + 8, 16, 4); c.fillStyle = '#9aa'; c.fillRect(x + 80, y + 10, 30, 3); c.fillRect(x + 92, y + 4, 3, 16); }
  { const [x, y] = P(1.05, 26.3); shade(c, x, y, 24, 2.2 * T, 3, '#3a3a40', '#26262b'); c.fillStyle = '#7a8088'; for (let k = 0; k < 6; k++) c.fillRect(x + 6, y + 8 + k * 16, 12, 3); }
  { const [x, y] = P(6.25, 27.7); shade(c, x, y, 34, 58, 3, '#4b5560', '#323a43'); }
  { const [x, y] = P(4.2, 27.4); c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y, 26, 14, .3, 0, TAU); c.fill(); }
  // ---- 反應爐 ----
  { const cx = 13 * T, cy = 26 * T; dropShadow(c, () => { c.beginPath(); c.arc(cx, cy, 66, 0, TAU); c.fill(); }, 5, 8);
    const g = c.createRadialGradient(cx - 10, cy - 14, 6, cx, cy, 66); g.addColorStop(0, '#5a6370'); g.addColorStop(1, '#232a33'); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 66, 0, TAU); c.fill();
    c.strokeStyle = '#141a20'; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, 50, 0, TAU); c.stroke();
    for (let a = 0; a < TAU; a += TAU / 8) { c.fillStyle = '#3a434e'; c.save(); c.translate(cx + Math.cos(a) * 58, cy + Math.sin(a) * 58); c.rotate(a); c.fillRect(-6, -4, 12, 8); c.restore(); } }
  { const [x, y] = P(9.08, 22.1); shade(c, x, y, 30, 44, 3, '#3a4048', '#262b31'); screen(c, x + 5, y + 6, 20, 30, '#ffb03a', 5); }
  { const [x, y] = P(15.35, 27.6); shade(c, x, y, 28, 52, 3, '#5a2a22', '#3a1a16'); c.fillStyle = '#ff3d3d'; c.beginPath(); c.arc(x + 14, y + 26, 8, 0, TAU); c.fill(); c.fillStyle = '#ffb03a'; for (let k = 0; k < 4; k++) c.fillRect(x + 2, y + 4 + k * 12, 24, 2); }
  { const [x, y] = P(15.3, 22.1); paintCrate(c, x, y, 30, 40, rn); }
  for (const [sx, sy] of [[9.2, 27.5], [9.2, 26.2]]) { const [x, y] = P(sx, sy); dropShadow(c, () => { c.beginPath(); c.arc(x + 18, y + 18, 18, 0, TAU); c.fill(); }); const g = c.createRadialGradient(x + 12, y + 12, 2, x + 18, y + 18, 18); g.addColorStop(0, '#7a8a98'); g.addColorStop(1, '#3a4652'); c.fillStyle = g; c.beginPath(); c.arc(x + 18, y + 18, 18, 0, TAU); c.fill(); }
  c.strokeStyle = 'rgba(255,176,58,.25)'; c.lineWidth = 5; c.beginPath(); c.moveTo(9.6 * T, 23.4 * T); c.quadraticCurveTo(11 * T, 24.6 * T, 12.1 * T, 25.1 * T); c.stroke();
  // ---- 貨艙 ----
  { const [x, y] = P(9.05, 32.05); dropShadow(c, () => { rr(c, x, y, 2.9 * T, 1.9 * T, 4); c.fill(); }, 6, 9);
    shade(c, x, y, 2.9 * T, 1.9 * T, 4, '#7a8088', '#4e545c'); c.fillStyle = '#3a3e44'; for (let k = 0; k < 8; k++) c.fillRect(x + 8 + k * 16, y + 4, 3, 1.9 * T - 8);
    c.fillStyle = '#e8e0cc'; c.fillRect(x + 20, y + 30, 70, 16); c.fillStyle = '#ff3d3d'; c.font = '900 11px ' + FONT_M; c.fillText('SPECIMEN', x + 24, y + 42);
    // 被撐開的側面
    c.fillStyle = '#0a0c0f'; c.beginPath(); c.moveTo(x - 2, y + 30); c.lineTo(x + 22, y + 22); c.lineTo(x + 26, y + 64); c.lineTo(x - 2, y + 72); c.fill();
    c.strokeStyle = '#9aa2aa'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 22, y + 22); c.lineTo(x + 6, y + 12); c.moveTo(x + 26, y + 64); c.lineTo(x + 4, y + 82); c.stroke();
    c.fillStyle = 'rgba(160,220,190,.25)'; c.beginPath(); c.ellipse(x - 14, y + 56, 26, 12, .4, 0, TAU); c.fill(); }
  for (const [sx, sy, w, h] of [[3.15, 31.1, 52, 48], [3.15, 34.9, 50, 54], [4.8, 36.9, 56, 40], [12.2, 36.8, 60, 42], [12.9, 31.05, 46, 46], [6.5, 31.1, 40, 36]]) { const [x, y] = P(sx, sy); dropShadow(c, () => { rr(c, x, y, w, h, 3); c.fill(); }); paintCrate(c, x, y, w, h, rn); }
  { const [x, y] = P(13.5, 36.75); shade(c, x, y, 26, 42, 3, '#4a3a1c', '#30260f'); screen(c, x + 4, y + 5, 18, 14, '#ff6a1a', 2); c.fillStyle = '#ff3d3d'; c.fillRect(x + 8, y + 26, 10, 10); }
  // 起重軌道
  c.strokeStyle = 'rgba(255,190,60,.18)'; c.lineWidth = 6; c.beginPath(); c.moveTo(3.4 * T, 34 * T); c.lineTo(13.6 * T, 34 * T); c.stroke();
  // ---- 樣本間 ----
  { const [x, y] = P(.15, 31.08); shade(c, x, y, 2.7 * T, 26, 3, '#3e4e46', '#2a3630'); screen(c, x + 30, y + 5, 60, 16, '#86f0a0', 3); }
  { const cx = 1.5 * T, cy = 33.4 * T; dropShadow(c, () => { c.beginPath(); c.arc(cx, cy, 26, 0, TAU); c.fill(); }); c.fillStyle = '#2a3430'; c.beginPath(); c.arc(cx, cy, 26, 0, TAU); c.fill(); c.fillStyle = 'rgba(160,255,140,.18)'; c.beginPath(); c.arc(cx, cy, 20, 0, TAU); c.fill(); c.strokeStyle = '#8aa'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 14, cy - 6); c.lineTo(cx + 4, cy + 14); c.moveTo(cx + 12, cy - 12); c.lineTo(cx - 2, cy + 2); c.stroke(); }
  { const [x, y] = P(.1, 34.7); shade(c, x, y, 26, 58, 3, '#d8dcd0', '#9ea294'); c.fillStyle = '#ffb03a'; c.fillRect(x + 3, y + 3, 20, 3); }
  // ---- 氣閘 ----
  for (const sy of [32.2, 35.1]) { const [x, y] = P(14.25, sy); shade(c, x, y, 2.5 * T, 22, 3, '#3a3e46', '#26292f'); for (let k = 0; k < 3; k++) { c.fillStyle = '#e8e0cc'; c.beginPath(); c.ellipse(x + 20 + k * 36, y + 11, 10, 8, 0, 0, TAU); c.fill(); c.fillStyle = '#ff6a1a'; c.fillRect(x + 14 + k * 36, y + 4, 12, 3); } }
  // ---- 逃生艇 ----
  { const x = 5 * T, y = 39.05 * T, w = 5 * T, h = 2.85 * T;
    dropShadow(c, () => { c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, TAU); c.fill(); }, 6, 10);
    const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#e8e2d4'); g.addColorStop(1, '#8e897e'); c.fillStyle = g;
    c.beginPath(); c.moveTo(x + 30, y + 6); c.lineTo(x + w - 50, y + 6); c.quadraticCurveTo(x + w + 6, y + h / 2, x + w - 50, y + h - 6); c.lineTo(x + 30, y + h - 6); c.quadraticCurveTo(x, y + h / 2, x + 30, y + 6); c.fill();
    c.fillStyle = '#1c2a38'; c.beginPath(); c.moveTo(x + w - 70, y + 24); c.quadraticCurveTo(x + w - 22, y + h / 2, x + w - 70, y + h - 24); c.closePath(); c.fill();
    c.fillStyle = '#ff6a1a'; c.fillRect(x + 40, y + h / 2 - 4, w - 130, 8);
    c.fillStyle = '#5a5850'; c.fillRect(x + w / 2 - 18, y + 2, 36, 10);
    c.font = '900 12px ' + FONT_M; c.fillStyle = 'rgba(30,30,30,.55)'; c.fillText('LIFEBOAT NH-1', x + 50, y + h / 2 + 24); }
  // 通風格柵在動態層畫
}
function paintCrate(c, x, y, w, h, rn) {
  const hue = rn();
  const top = hue < .33 ? '#6e6a5e' : hue < .66 ? '#5a6470' : '#7a5e3a', bot = hue < .33 ? '#4a473e' : hue < .66 ? '#3a424c' : '#4e3c24';
  shade(c, x, y, w, h, 3, top, bot);
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; c.strokeRect(x + 4, y + 4, w - 8, h - 8);
  c.beginPath(); c.moveTo(x + 4, y + 4); c.lineTo(x + w - 4, y + h - 4); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x + 2, y + 2, w - 4, 2);
  if (rn() < .5) { c.fillStyle = 'rgba(255,190,60,.5)'; c.fillRect(x + 6, y + h - 12, w - 12, 3); }
}

// ---------- 格柵 ----------
function drawGrate(c, n, t) {
  const x = n.x, y = n.y, s = 15;
  const sh = n.shake > 0 ? (Math.sin(t * 60) * 2 * Math.min(1, n.shake)) : 0;
  c.save(); c.translate(x + sh, y);
  c.fillStyle = '#0b0e12'; rr(c, -s - 3, -s - 3, s * 2 + 6, s * 2 + 6, 3); c.fill();
  c.fillStyle = '#4a5560'; rr(c, -s - 2, -s - 2, s * 2 + 4, s * 2 + 4, 3); c.fill();
  c.fillStyle = '#05070a'; c.fillRect(-s + 1, -s + 1, s * 2 - 2, s * 2 - 2);
  c.fillStyle = '#5c6874'; for (let k = -s + 3; k < s; k += 5) c.fillRect(-s + 1, k, s * 2 - 2, 2);
  if (n.sealed) { c.strokeStyle = '#ff8a3d'; c.lineWidth = 3; c.beginPath(); c.moveTo(-s, -s); c.lineTo(s, s); c.moveTo(s, -s); c.lineTo(-s, s); c.stroke(); c.strokeStyle = 'rgba(255,200,120,.5)'; c.lineWidth = 1; c.strokeRect(-s - 2, -s - 2, s * 2 + 4, s * 2 + 4); }
  if (n.drip > 0) { c.fillStyle = 'rgba(150,240,210,' + (.35 * Math.min(1, n.drip)) + ')'; c.beginPath(); c.ellipse(0, s + 4, 10 + n.drip * 6, 5 + n.drip * 2, 0, 0, TAU); c.fill(); }
  c.restore();
}

// ---------- 門 ----------
function drawDoor(c, d, t) {
  const o = d.broken ? 1 : d.open, L = d.len, heavy = d.kind !== 'door', thick = heavy ? 12 : 9;
  c.save(); c.translate(d.x, d.y);
  if (d.orient === 'h') c.rotate(Math.PI / 2);
  // 門板沿 y 方向（垂直門）
  const half = L / 2, slide = o * half * .92;
  const col1 = d.welded ? '#5a4a3a' : heavy ? '#6a5a3a' : '#56626e', col2 = d.welded ? '#3a2e24' : heavy ? '#3e3420' : '#36404a';
  for (const s of [-1, 1]) {
    const y0 = s < 0 ? -half - slide : slide, h = half;
    if (d.broken) { c.save(); c.rotate(s * .35); }
    const g = c.createLinearGradient(-thick / 2, 0, thick / 2, 0); g.addColorStop(0, col1); g.addColorStop(1, col2);
    c.fillStyle = '#0b0e12'; c.fillRect(-thick / 2 - 1, y0 - 1, thick + 2, h + 2);
    c.fillStyle = g; c.fillRect(-thick / 2, y0, thick, h);
    if (heavy) { c.save(); c.beginPath(); c.rect(-thick / 2, y0, thick, h); c.clip(); c.fillStyle = 'rgba(255,170,30,.6)'; for (let k = -20; k < h + 20; k += 12) { c.beginPath(); c.moveTo(-thick / 2, y0 + k); c.lineTo(thick / 2, y0 + k + 8); c.lineTo(thick / 2, y0 + k + 14); c.lineTo(-thick / 2, y0 + k + 6); c.fill(); } c.restore(); }
    if (d.broken) c.restore();
  }
  // 指示燈
  const lc = d.broken ? '#666' : d.welded ? '#ff8a3d' : d.state === 'open' ? '#86f0a0' : '#ff3d3d';
  c.fillStyle = lc; c.fillRect(thick / 2 + 2, -half - 6, 3, 4); c.fillRect(-thick / 2 - 5, half + 2, 3, 4);
  if (d.welded && o < .1) { c.strokeStyle = 'rgba(255,200,120,' + (.5 + .3 * Math.sin(t * 5)) + ')'; c.lineWidth = 2; c.beginPath(); for (let k = -half; k <= half; k += 6) c.lineTo((k / 6) % 2 ? 2 : -2, k); c.stroke(); }
  if (d.force > 0 && !d.broken) { c.fillStyle = 'rgba(255,60,60,' + (.25 + d.force * .5) + ')'; c.fillRect(-thick / 2 - 2, -3, thick + 4, 6); }
  c.restore();
}

// ---------- 船員（俯視） ----------
function drawCrew(c, m, t, opt = {}) {
  const def = CREW[m.ci];
  c.save(); c.translate(m.x, m.y);
  if (m.dead) { drawCorpse(c, m, def); c.restore(); return; }
  const a = m.ang, walk = m.walkPh, mv = m.moving ? 1 : 0;
  const crouch = m.crouch || 0, sc = (1 - crouch * .12) * 1.18;
  // 影子
  c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(3, 5, 17 * sc, 14 * sc, 0, 0, TAU); c.fill();
  if (m.grabbed) c.rotate(Math.sin(t * 22) * .2);
  c.rotate(a); c.scale(sc, sc);
  // 腳
  const st = Math.sin(walk) * 7 * mv;
  c.fillStyle = '#1a1e24';
  rr(c, -4 + st, 4, 12, 7, 3); c.fill(); rr(c, -4 - st, -11, 12, 7, 3); c.fill();
  // 背包／氧氣瓶
  shade(c, -17, -9, 9, 18, 3, '#5a6470', '#353d46');
  // 身體
  const g = c.createLinearGradient(-10, -14, 8, 14); g.addColorStop(0, mixHex(def.suit, '#ffffff', .18)); g.addColorStop(1, def.suit);
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 10.5, 15, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1.2; c.stroke();
  // 肩上的識別色
  c.fillStyle = def.col; c.beginPath(); c.ellipse(-1, -12.5, 5, 3, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(-1, 12.5, 5, 3, 0, 0, TAU); c.fill();
  // 手臂
  const sw = Math.sin(walk + Math.PI) * 6 * mv;
  const armL = m.aim ? 10 : 4 + sw, armR = m.aim ? 10 : 4 - sw;
  c.fillStyle = mixHex(def.suit, '#000000', .15);
  rr(c, -3, -17, 8 + armL, 6, 3); c.fill(); rr(c, -3, 11, 8 + armR, 6, 3); c.fill();
  c.fillStyle = def.skin; c.beginPath(); c.arc(6 + armL, -14, 3, 0, TAU); c.fill(); c.beginPath(); c.arc(6 + armR, 14, 3, 0, TAU); c.fill();
  // 手上的東西
  const held = m.held;
  if (held === 'flamer') { c.fillStyle = '#4a4a4e'; rr(c, 2, 2, 24, 6, 2); c.fill(); c.fillStyle = '#8a6a2a'; rr(c, -6, 4, 10, 8, 2); c.fill(); if (!m.firing) { c.fillStyle = 'rgba(120,180,255,.9)'; c.beginPath(); c.arc(27, 5, 1.8 + Math.sin(t * 30) * .5, 0, TAU); c.fill(); } }
  else if (held === 'harpoon') { c.fillStyle = '#3a3e44'; rr(c, 2, 3, 26, 5, 2); c.fill(); c.fillStyle = '#c8ccd0'; c.fillRect(24, 4.5, 8, 2); }
  else if (held === 'prod') { c.fillStyle = '#2a2a2e'; rr(c, 6, 11, 16, 4, 2); c.fill(); c.fillStyle = 'rgba(120,200,255,' + (.6 + .4 * Math.sin(t * 40)) + ')'; c.beginPath(); c.arc(23, 13, 2.2, 0, TAU); c.fill(); }
  else if (held === 'tracker') { c.fillStyle = '#2c3238'; rr(c, 6, -20, 10, 9, 2); c.fill(); c.fillStyle = 'rgba(134,240,160,.95)'; c.fillRect(8, -18.5, 6, 5); }
  else if (held === 'welder') { c.fillStyle = '#3a3e44'; rr(c, 6, 10, 14, 5, 2); c.fill(); }
  // 頭
  drawHeadTop(c, def, t, m);
  // 肩燈
  c.fillStyle = m.lampOn ? '#fff6dc' : '#555'; c.fillRect(4, 8, 4, 3);
  c.restore();
}
function drawHeadTop(c, def, t, m) {
  const hx = 1, r = 8.6;
  c.fillStyle = def.skin; c.beginPath(); c.arc(hx, 0, r, 0, TAU); c.fill();
  const hair = def.hair;
  c.save(); c.beginPath(); c.arc(hx, 0, r, 0, TAU); c.clip();
  if (hair === 'under') { c.fillStyle = '#1c1612'; c.beginPath(); c.arc(hx - 3, 0, r + 1, 0, TAU); c.fill(); c.fillStyle = '#3a2c22'; c.beginPath(); c.ellipse(hx - 2, 0, 6, 5, 0, 0, TAU); c.fill(); }
  else if (hair === 'bob') { c.fillStyle = '#20150f'; c.beginPath(); c.arc(hx - 2.5, 0, r + 1.5, 0, TAU); c.fill(); c.fillStyle = '#3a2a1e'; c.fillRect(hx - 8, -2, 8, 4); }
  else if (hair === 'bald') { c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(hx - 2, -2, 4, 0, TAU); c.fill(); c.fillStyle = '#c8c4bc'; c.beginPath(); c.arc(hx + 7, 0, 5, -1.2, 1.2); c.fill(); }
  else if (hair === 'messy') { c.fillStyle = '#2a1c12'; for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; c.beginPath(); c.arc(hx - 2 + Math.cos(a) * 4, Math.sin(a) * 4, 5, 0, TAU); c.fill(); } c.fillStyle = '#5a6a72'; c.fillRect(hx - 1, -r, 3, r * 2); c.fillStyle = '#9fe6ff'; c.fillRect(hx, -6, 2, 4); c.fillRect(hx, 2, 2, 4); }
  else if (hair === 'bun') { c.fillStyle = '#1a1210'; c.beginPath(); c.arc(hx - 2.5, 0, r + 1, 0, TAU); c.fill(); }
  else if (hair === 'buzz') { c.fillStyle = 'rgba(30,22,16,.85)'; c.beginPath(); c.arc(hx - 1.5, 0, r, 0, TAU); c.fill(); }
  c.restore();
  if (hair === 'bun') { c.fillStyle = '#1a1210'; c.beginPath(); c.arc(hx - 10, 0, 4.2, 0, TAU); c.fill(); }
  if (def.id === 'su') { c.fillStyle = '#2a3036'; c.fillRect(hx - 2, -r - 1.5, 4, 3); c.fillRect(hx - 2, r - 1.5, 4, 3); c.fillStyle = '#5aa8ff'; c.fillRect(hx + 1, r - 1, 4, 1.5); }
  if (def.id === 'wen') { c.strokeStyle = 'rgba(220,230,240,.8)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(hx + 5, -4); c.lineTo(hx + 7.5, -4); c.moveTo(hx + 5, 4); c.lineTo(hx + 7.5, 4); c.stroke(); }
  // 臉朝前的那一側（鼻子）
  c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.arc(hx + r - 1, 0, 2, 0, TAU); c.fill();
}
function drawCorpse(c, m, def) {
  c.fillStyle = 'rgba(60,8,8,.65)'; c.beginPath(); c.ellipse(4, 6, 26, 18, .4, 0, TAU); c.fill();
  c.rotate(m.ang + 1.2);
  c.fillStyle = def.suit; c.beginPath(); c.ellipse(0, 0, 10, 15, 0, 0, TAU); c.fill();
  c.fillStyle = def.col; c.fillRect(-4, -14, 6, 3);
  c.fillStyle = def.skin; c.beginPath(); c.arc(12, 3, 7.5, 0, TAU); c.fill();
  c.fillStyle = mixHex(def.suit, '#000000', .2); rr(c, -4, 12, 20, 6, 3); c.fill(); rr(c, -14, -18, 16, 6, 3); c.fill();
}

// ---------- 牠（俯視，程序化步態） ----------
const BEAST_SEG = [0, 13, 14, 15, 14, 12, 11, 10, 9, 8];
const BEAST_W = [8, 10.5, 13, 14, 12.5, 9, 6, 4.4, 3.2, 2.2];
function makeBeastRig(b) {
  b.seg = []; const n = BEAST_SEG.length;
  for (let k = 0; k < n; k++) b.seg.push({ x: b.x - k * 12 * b.scale, y: b.y });
  b.legs = [];
  for (const [si, side, reach, fw] of [[1, -1, 1.05, 16], [1, 1, 1.05, 16], [2, -1, 1.15, 2], [2, 1, 1.15, 2], [3, -1, 1.05, -14], [3, 1, 1.05, -14]]) b.legs.push({ si, side, reach, fw, fx: b.x, fy: b.y, ox: b.x, oy: b.y, tx: b.x, ty: b.y, t: 1 });
}
function updateBeastRig(b, dt) {
  const s = b.scale;
  b.seg[0].x = b.x; b.seg[0].y = b.y;
  for (let k = 1; k < b.seg.length; k++) {
    const p = b.seg[k - 1], q = b.seg[k], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
    const L = BEAST_SEG[k] * s; q.x = p.x + dx / d * L; q.y = p.y + dy / d * L;
    if (k >= 5) { const sw = Math.sin(b.t * 3.4 + k * .9) * .9 * s * (b.moving ? 1 : .35); q.x += -dy / d * sw; q.y += dx / d * sw; }
  }
  const nLegs = b.juv ? 4 : 6;
  for (let i = 0; i < nLegs; i++) {
    const L = b.legs[i], s0 = b.seg[L.si], s1 = b.seg[L.si + 1];
    const ax = s0.x - s1.x, ay = s0.y - s1.y, ad = Math.hypot(ax, ay) || 1, nx = -ay / ad, ny = ax / ad;
    const reach = 38 * s * L.reach;
    const hx = s0.x + nx * L.side * reach + ax / ad * L.fw * s, hy = s0.y + ny * L.side * reach + ay / ad * L.fw * s;
    if (L.t >= 1) {
      if (Math.hypot(hx - L.fx, hy - L.fy) > 20 * s) { const other = b.legs[i ^ 1]; if (other.t >= 1 || !b.moving) { L.ox = L.fx; L.oy = L.fy; L.tx = hx + (hx - L.fx) * .35; L.ty = hy + (hy - L.fy) * .35; L.t = 0; } }
    } else { L.t = Math.min(1, L.t + dt * (b.moving ? 7 + b.speedNow * .02 : 5)); const e = easeOut(L.t); L.fx = lerp(L.ox, L.tx, e); L.fy = lerp(L.oy, L.ty, e); }
  }
}
function beastPal(b) {
  return b.juv ? { base: '#7e6a68', mid: '#b49c96', hi: '#f4e2da', edge: '#4a3836', glow: '#9ff0ff' }
    : b.stage === 2 ? { base: '#07090d', mid: '#18222e', hi: '#6a8eae', edge: '#000000', glow: '#7ff0ff' }
      : { base: '#0b1016', mid: '#1c2836', hi: '#55779a', edge: '#020305', glow: '#6fe8ff' };
}
function drawBeast(c, b, t, alpha = 1) {
  const s = b.scale, juv = b.juv, P = beastPal(b), seg = b.seg;
  c.save(); c.globalAlpha = alpha;
  // 每一節的法線
  const N = seg.map((p, k) => { const a = seg[Math.max(0, k - 1)], q = seg[Math.min(seg.length - 1, k + 1)]; const dx = a.x - q.x, dy = a.y - q.y, d = Math.hypot(dx, dy) || 1; return [-dy / d, dx / d, dx / d, dy / d]; });
  const breathe = 1 + Math.sin(b.t * (b.state === 'chase' ? 7 : 2.2)) * .04;
  // 影子
  c.fillStyle = 'rgba(0,0,0,.42)';
  c.beginPath(); for (let k = 1; k < 7; k++) { const p = seg[k]; c.moveTo(p.x + 6 + BEAST_W[k] * s * 1.2, p.y + 9); c.ellipse(p.x + 6, p.y + 9, BEAST_W[k] * s * 1.25, BEAST_W[k] * s * 1.05, 0, 0, TAU); } c.fill();
  // 腳（三節）
  const nLegs = juv ? 4 : 6;
  for (let i = 0; i < nLegs; i++) {
    const L = b.legs[i], h = seg[L.si], n = N[L.si];
    const lift = L.t < 1 ? Math.sin(L.t * Math.PI) * 7 * s : 0;
    const hx = h.x + n[0] * L.side * BEAST_W[L.si] * s * .7, hy = h.y + n[1] * L.side * BEAST_W[L.si] * s * .7;
    const fx = L.fx, fy = L.fy - lift * .3;
    const dx = fx - hx, dy = fy - hy, dd = Math.hypot(dx, dy) || 1, ux = dx / dd, uy = dy / dd;
    const out = L.side * (i < 2 ? 1 : i < 4 ? .7 : .4);
    const kx = hx + dx * .38 + (-uy) * out * 14 * s - n[2] * (i >= 4 ? 8 : -4) * s, ky = hy + dy * .38 + ux * out * 14 * s - n[3] * (i >= 4 ? 8 : -4) * s - lift;
    const axx = hx + dx * .75 + (-uy) * out * 6 * s, ayy = hy + dy * .75 + ux * out * 6 * s - lift * .5;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = P.edge; c.lineWidth = 7.4 * s; c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.stroke();
    c.strokeStyle = P.base; c.lineWidth = 5.6 * s; c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.stroke();
    c.lineWidth = 3.6 * s; c.strokeStyle = P.edge; c.beginPath(); c.moveTo(kx, ky); c.lineTo(axx, ayy); c.stroke();
    c.lineWidth = 2.6 * s; c.strokeStyle = P.base; c.beginPath(); c.moveTo(kx, ky); c.lineTo(axx, ayy); c.stroke();
    c.lineWidth = 1.6 * s; c.beginPath(); c.moveTo(axx, ayy); c.lineTo(fx, fy); c.stroke();
    c.globalAlpha = alpha * .7; c.strokeStyle = P.hi; c.lineWidth = 1.1 * s; c.beginPath(); c.moveTo(hx + 1, hy - 1); c.lineTo(kx, ky - 1); c.lineTo(axx, ayy - .5); c.stroke(); c.globalAlpha = alpha;
    c.fillStyle = P.mid; c.beginPath(); c.arc(kx, ky, 2.6 * s, 0, TAU); c.fill();
    c.fillStyle = P.hi; c.beginPath(); c.arc(kx - .6, ky - .8, 1 * s, 0, TAU); c.fill();
  }
  // 尾巴
  c.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    for (let k = 5; k < seg.length; k++) { const a = seg[k - 1], q = seg[k]; c.strokeStyle = pass ? P.base : P.edge; c.lineWidth = BEAST_W[k] * s * 2 * (pass ? .78 : 1); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(q.x, q.y); c.stroke(); }
  }
  c.globalAlpha = alpha * .6; c.strokeStyle = P.hi; c.lineWidth = 1 * s; c.beginPath(); c.moveTo(seg[5].x, seg[5].y); for (let k = 6; k < seg.length; k++) c.lineTo(seg[k].x, seg[k].y); c.stroke(); c.globalAlpha = alpha;
  const tip = seg[seg.length - 1], pre = seg[seg.length - 2], ta = Math.atan2(tip.y - pre.y, tip.x - pre.x);
  c.save(); c.translate(tip.x, tip.y); c.rotate(ta); c.fillStyle = P.edge; c.beginPath(); c.moveTo(20 * s, 0); c.quadraticCurveTo(6 * s, -7 * s, -3 * s, -4 * s); c.lineTo(-3 * s, 4 * s); c.quadraticCurveTo(6 * s, 7 * s, 20 * s, 0); c.fill(); c.fillStyle = P.hi; c.globalAlpha = alpha * .6; c.fillRect(0, -.6 * s, 14 * s, 1.2 * s); c.restore();
  // 身體輪廓（平滑）
  const L0 = [], R0 = [];
  for (let k = 0; k <= 5; k++) { const p = seg[k], n = N[k], w = BEAST_W[k] * s * (k >= 2 && k <= 4 ? breathe : 1); L0.push([p.x + n[0] * w, p.y + n[1] * w]); R0.push([p.x - n[0] * w, p.y - n[1] * w]); }
  const body = () => { c.beginPath(); c.moveTo(L0[0][0], L0[0][1]); for (let k = 1; k < L0.length; k++) { const a = L0[k - 1], q = L0[k]; c.quadraticCurveTo(a[0], a[1], (a[0] + q[0]) / 2, (a[1] + q[1]) / 2); } c.lineTo(L0[L0.length - 1][0], L0[L0.length - 1][1]); for (let k = R0.length - 1; k >= 1; k--) { const a = R0[k], q = R0[k - 1]; c.quadraticCurveTo(a[0], a[1], (a[0] + q[0]) / 2, (a[1] + q[1]) / 2); } c.closePath(); };
  c.fillStyle = P.edge; c.save(); c.translate(0, 1.5); body(); c.fill(); c.restore();
  const hd = seg[0], tl = seg[5];
  const g = c.createLinearGradient(hd.x + N[2][0] * 16 * s, hd.y + N[2][1] * 16 * s, hd.x - N[2][0] * 16 * s, hd.y - N[2][1] * 16 * s);
  g.addColorStop(0, P.hi); g.addColorStop(.3, P.mid); g.addColorStop(.75, P.base); g.addColorStop(1, P.edge);
  c.fillStyle = g; body(); c.fill();
  c.strokeStyle = P.edge; c.lineWidth = 1.2; body(); c.stroke();
  // 甲殼的橫紋與背棘
  for (let k = 1; k <= 5; k++) {
    const p = seg[k], n = N[k], w = BEAST_W[k] * s * .92;
    c.strokeStyle = juv ? 'rgba(80,50,50,.45)' : 'rgba(0,0,0,.55)'; c.lineWidth = 1.4 * s;
    c.beginPath(); c.moveTo(p.x + n[0] * w, p.y + n[1] * w); c.quadraticCurveTo(p.x - n[2] * 5 * s, p.y - n[3] * 5 * s, p.x - n[0] * w, p.y - n[1] * w); c.stroke();
    if (!juv) { c.fillStyle = P.edge; c.beginPath(); c.moveTo(p.x + n[0] * 2.5 * s, p.y + n[1] * 2.5 * s); c.lineTo(p.x - n[2] * (9 + k) * s * .6, p.y - n[3] * (9 + k) * s * .6); c.lineTo(p.x - n[0] * 2.5 * s, p.y - n[1] * 2.5 * s); c.fill(); }
  }
  // 背脊的高光
  c.globalAlpha = alpha * (juv ? .5 : .85); c.strokeStyle = P.hi; c.lineWidth = 1.6 * s; c.beginPath();
  for (let k = 1; k <= 5; k++) { const p = seg[k], n = N[k], o = BEAST_W[k] * s * .38; if (k === 1) c.moveTo(p.x + n[0] * o, p.y + n[1] * o); else c.lineTo(p.x + n[0] * o, p.y + n[1] * o); } c.stroke(); c.globalAlpha = alpha;
  if (juv) { const gg = c.createRadialGradient(seg[2].x, seg[2].y, 0, seg[2].x, seg[2].y, 14 * s); gg.addColorStop(0, 'rgba(255,160,150,.45)'); gg.addColorStop(1, 'rgba(255,120,120,0)'); c.fillStyle = gg; c.beginPath(); c.arc(seg[2].x, seg[2].y, 14 * s, 0, TAU); c.fill(); }
  // 前肢（鐮刀）
  const ha = Math.atan2(seg[0].y - seg[1].y, seg[0].x - seg[1].x);
  if (!juv) {
    const strike = b.state === 'chase' || b.state === 'grab' ? .5 + .5 * Math.sin(b.t * 9) : 0;
    for (const sd of [-1, 1]) {
      c.save(); c.translate(seg[1].x, seg[1].y); c.rotate(ha);
      const sx = 6 * s, sy = sd * 10 * s, ex = (24 + strike * 14) * s, ey = sd * (16 - strike * 6) * s, tx = (34 + strike * 18) * s, ty = sd * (6 - strike * 4) * s;
      c.strokeStyle = P.edge; c.lineCap = 'round'; c.lineWidth = 5.5 * s; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
      c.strokeStyle = P.base; c.lineWidth = 3.8 * s; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
      c.fillStyle = P.edge; c.beginPath(); c.moveTo(ex, ey - sd * 2.5 * s); c.quadraticCurveTo(tx + 4 * s, ey, tx, ty); c.quadraticCurveTo(ex + 6 * s, ey + sd * .5 * s, ex, ey + sd * 2.5 * s); c.fill();
      c.strokeStyle = P.hi; c.globalAlpha = alpha * .7; c.lineWidth = 1 * s; c.beginPath(); c.moveTo(ex + 2 * s, ey); c.quadraticCurveTo(tx, ey - sd * 1 * s, tx - 1 * s, ty + sd * 1 * s); c.stroke(); c.globalAlpha = alpha;
      c.restore();
    }
  }
  // 頭
  c.save(); c.translate(seg[0].x, seg[0].y); c.rotate(ha);
  const crest = b.crest || 0;
  if (!juv) {
    for (let k = -4; k <= 4; k++) { const ang = Math.PI + k * (.16 + crest * .11), len = (20 + crest * 12 - Math.abs(k) * 1.5) * s; c.fillStyle = k % 2 ? P.base : P.edge; c.beginPath(); c.moveTo(-6 * s + Math.cos(ang + Math.PI / 2) * 2 * s, Math.sin(ang + Math.PI / 2) * 2 * s); c.lineTo(-6 * s + Math.cos(ang) * len, Math.sin(ang) * len); c.lineTo(-6 * s + Math.cos(ang - Math.PI / 2) * 2 * s, Math.sin(ang - Math.PI / 2) * 2 * s); c.fill(); }
  }
  const hg = c.createLinearGradient(0, -10 * s, 0, 10 * s); hg.addColorStop(0, P.hi); hg.addColorStop(.35, P.mid); hg.addColorStop(1, P.edge);
  c.fillStyle = hg; c.beginPath(); c.moveTo(26 * s, 0); c.bezierCurveTo(18 * s, -10 * s, 2 * s, -11 * s, -9 * s, -8 * s); c.quadraticCurveTo(-15 * s, 0, -9 * s, 8 * s); c.bezierCurveTo(2 * s, 11 * s, 18 * s, 10 * s, 26 * s, 0); c.fill();
  c.strokeStyle = P.edge; c.lineWidth = 1.2; c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1 * s; c.beginPath(); c.moveTo(-4 * s, 0); c.lineTo(20 * s, 0); c.stroke();
  // 喉囊
  const pulse = Math.max(0, b.sonarFx || 0);
  c.fillStyle = rgba(P.glow, .85 + pulse * .15); c.beginPath(); c.ellipse(6 * s, 0, (5 + pulse * 2) * s, (3 + pulse) * s, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(240,255,255,.9)'; c.beginPath(); c.ellipse(7 * s, -.6 * s, 2 * s, 1.1 * s, 0, 0, TAU); c.fill();
  // 顎
  const jaw = b.jaw || 0;
  c.strokeStyle = juv ? '#f0e0d6' : '#9ab6cc'; c.lineWidth = 1.8 * s; c.lineCap = 'round';
  for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(20 * s, sd * 3 * s); c.quadraticCurveTo((28 + jaw * 3) * s, sd * (5 + jaw * 5) * s, (31 + jaw * 4) * s, sd * (1 + jaw * 3) * s); c.stroke(); }
  c.restore();
  c.restore();
}
// 管道裡的影子（從格柵縫看到）
function drawBeastUnder(c, b, n, t) {
  c.save(); c.beginPath(); c.rect(n.x - 14, n.y - 14, 28, 28); c.clip();
  c.fillStyle = 'rgba(0,0,0,.85)'; c.beginPath(); c.ellipse(b.x, b.y, 22 * b.scale, 12 * b.scale, b.ang, 0, TAU); c.fill();
  c.fillStyle = 'rgba(111,232,255,.8)'; c.beginPath(); c.arc(b.x + Math.cos(b.ang) * 10, b.y + Math.sin(b.ang) * 10, 3, 0, TAU); c.fill();
  c.restore();
}

// ---------- 清潔機器人 小蝸 ----------
function drawBot(c, bot, t) {
  c.save(); c.translate(bot.x, bot.y);
  c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(2, 4, 14, 12, 0, 0, TAU); c.fill();
  if (bot.dead) { c.fillStyle = '#3a3a3a'; c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.fill(); c.fillStyle = '#ff6a1a'; c.fillRect(-6, -1, 12, 2); c.restore(); return; }
  const g = c.createRadialGradient(-4, -4, 2, 0, 0, 13); g.addColorStop(0, '#f0e8d8'); g.addColorStop(1, '#a8a090');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.fill();
  c.fillStyle = '#2a2e34'; c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill();
  c.fillStyle = bot.lured ? '#ff6a1a' : '#86f0a0'; c.beginPath(); c.arc(Math.cos(bot.ang) * 8, Math.sin(bot.ang) * 8, 2, 0, TAU); c.fill();
  c.strokeStyle = '#ffb03a'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 12, bot.ang - .6, bot.ang + .6); c.stroke();
  c.restore();
}

// ---------- 頭像（胸像，強烈明暗） ----------
const PORTRAIT_CACHE = {};
function portrait(id, state) {
  const key = id + (state || '');
  if (PORTRAIT_CACHE[key]) return PORTRAIT_CACHE[key];
  const def = CREWI[id], W0 = 120, H0 = 140, cv = mkCanvas(W0, H0), c = cv.getContext('2d');
  // 背景
  const bg = c.createLinearGradient(0, 0, W0, H0); bg.addColorStop(0, '#0c121a'); bg.addColorStop(1, '#16202c'); c.fillStyle = bg; c.fillRect(0, 0, W0, H0);
  const rg = c.createRadialGradient(W0 * .85, H0 * .3, 4, W0 * .85, H0 * .3, 90); rg.addColorStop(0, rgba(def.col, .45)); rg.addColorStop(1, rgba(def.col, 0)); c.fillStyle = rg; c.fillRect(0, 0, W0, H0);
  c.fillStyle = 'rgba(255,255,255,.025)'; for (let y = 0; y < H0; y += 3) c.fillRect(0, y, W0, 1);
  const cx = 60, hy = 58;
  // 肩膀
  c.fillStyle = def.suit; c.beginPath(); c.moveTo(6, H0); c.quadraticCurveTo(14, 102, 40, 96); c.lineTo(80, 96); c.quadraticCurveTo(106, 102, 114, H0); c.fill();
  c.fillStyle = def.col; c.beginPath(); c.moveTo(14, H0); c.quadraticCurveTo(18, 110, 34, 104); c.lineTo(36, 112); c.quadraticCurveTo(24, 116, 22, H0); c.fill();
  c.fillStyle = mixHex(def.suit, '#000000', .3); c.beginPath(); c.moveTo(44, 96); c.lineTo(60, 116); c.lineTo(76, 96); c.fill();
  // 脖子
  const sk = def.skin, skd = mixHex(sk, '#000000', .45);
  c.fillStyle = skd; c.fillRect(cx - 11, 80, 22, 22);
  // 頭型
  const jaw = { wei: 1, su: .9, deng: 1.05, jie: .88, wen: .9, batu: 1.15 }[id] || 1;
  const headPath = () => { c.beginPath(); c.moveTo(cx - 25 * jaw, hy - 6); c.bezierCurveTo(cx - 26 * jaw, hy - 42, cx + 26 * jaw, hy - 42, cx + 25 * jaw, hy - 6); c.bezierCurveTo(cx + 25 * jaw, hy + 14, cx + 16 * jaw, hy + 30, cx, hy + 33); c.bezierCurveTo(cx - 16 * jaw, hy + 30, cx - 25 * jaw, hy + 14, cx - 25 * jaw, hy - 6); c.closePath(); };
  // 耳朵
  c.fillStyle = mixHex(sk, '#000000', .2); c.beginPath(); c.ellipse(cx - 25 * jaw, hy + 2, 5, 8, 0, 0, TAU); c.ellipse(cx + 25 * jaw, hy + 2, 5, 8, 0, 0, TAU); c.fill();
  const fg = c.createLinearGradient(cx - 26, 0, cx + 26, 0); fg.addColorStop(0, mixHex(sk, '#000000', .25)); fg.addColorStop(.6, sk); fg.addColorStop(1, mixHex(sk, '#ffffff', .12));
  c.fillStyle = fg; headPath(); c.fill();
  // 五官
  const eyeY = hy - 2, eo = 10;
  c.fillStyle = '#1a1210';
  // 眉
  const brow = (x, s) => { c.beginPath(); c.moveTo(x - 7 * s, eyeY - 8); c.quadraticCurveTo(x, eyeY - 11 - (id === 'jie' ? 1 : 0), x + 7 * s, eyeY - 8 + (id === 'batu' ? 1 : 0)); c.lineTo(x + 7 * s, eyeY - 6); c.quadraticCurveTo(x, eyeY - 9, x - 7 * s, eyeY - 6); c.fill(); };
  brow(cx - eo, 1); brow(cx + eo, -1);
  for (const s of [-1, 1]) { const ex = cx + s * eo; c.fillStyle = '#efe6da'; c.beginPath(); c.ellipse(ex, eyeY, 5.2, 2.6, 0, 0, TAU); c.fill(); c.fillStyle = '#20160f'; c.beginPath(); c.arc(ex + s * .4, eyeY + .2, 2.2, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(ex + 1, eyeY - 1.4, 1.2, 1.2); c.strokeStyle = 'rgba(30,20,14,.7)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(ex, eyeY - .4, 5.6, 2.8, 0, Math.PI, TAU); c.stroke(); }
  // 鼻、嘴
  c.strokeStyle = mixHex(sk, '#000000', .45); c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx + 1, eyeY + 2); c.lineTo(cx + 3, eyeY + 13); c.lineTo(cx - 2, eyeY + 15); c.stroke();
  c.strokeStyle = mixHex(sk, '#000000', .55); c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 7, hy + 20); c.quadraticCurveTo(cx, hy + (id === 'jie' ? 23 : 21), cx + 7, hy + 20); c.stroke();
  // 角色特徵
  if (id === 'wei') { c.fillStyle = 'rgba(30,20,14,.28)'; c.beginPath(); c.ellipse(cx, hy + 22, 18, 11, 0, 0, Math.PI); c.fill(); c.strokeStyle = 'rgba(255,220,200,.55)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx + 14, hy - 12); c.lineTo(cx + 19, hy + 2); c.stroke(); }
  if (id === 'deng') { c.fillStyle = '#d0ccc4'; c.beginPath(); c.moveTo(cx - 20, hy + 8); c.quadraticCurveTo(cx - 18, hy + 38, cx, hy + 40); c.quadraticCurveTo(cx + 18, hy + 38, cx + 20, hy + 8); c.quadraticCurveTo(cx + 10, hy + 18, cx, hy + 17); c.quadraticCurveTo(cx - 10, hy + 18, cx - 20, hy + 8); c.fill(); c.strokeStyle = '#6a645c'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 7, hy + 20); c.quadraticCurveTo(cx, hy + 18, cx + 7, hy + 20); c.stroke(); }
  if (id === 'batu') { c.fillStyle = 'rgba(30,20,14,.35)'; c.beginPath(); c.ellipse(cx, hy + 24, 20, 12, 0, 0, Math.PI); c.fill(); c.strokeStyle = 'rgba(80,40,30,.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 20, hy - 14); c.lineTo(cx - 12, hy + 4); c.stroke(); }
  if (id === 'wen') { c.strokeStyle = '#c8d0d8'; c.lineWidth = 1.8; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(cx + s * eo, eyeY, 8, 6, 0, 0, TAU); c.stroke(); } c.beginPath(); c.moveTo(cx - 2, eyeY); c.lineTo(cx + 2, eyeY); c.stroke(); }
  // 頭髮
  c.save();
  if (def.hair === 'under') { c.fillStyle = '#17110d'; c.beginPath(); c.moveTo(cx - 26, hy - 4); c.bezierCurveTo(cx - 30, hy - 44, cx + 24, hy - 52, cx + 27, hy - 10); c.quadraticCurveTo(cx + 18, hy - 30, cx - 6, hy - 26); c.quadraticCurveTo(cx - 20, hy - 22, cx - 22, hy - 4); c.fill(); }
  else if (def.hair === 'bob') { c.fillStyle = '#1c120c'; c.beginPath(); c.moveTo(cx - 30, hy + 22); c.bezierCurveTo(cx - 36, hy - 50, cx + 36, hy - 50, cx + 30, hy + 22); c.lineTo(cx + 22, hy + 22); c.quadraticCurveTo(cx + 24, hy - 18, cx + 4, hy - 22); c.quadraticCurveTo(cx - 14, hy - 12, cx - 22, hy - 4); c.lineTo(cx - 22, hy + 22); c.fill(); c.fillStyle = '#2a3036'; c.fillRect(cx + 26, hy - 6, 6, 14); c.strokeStyle = '#2a3036'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx + 30, hy + 6); c.quadraticCurveTo(cx + 22, hy + 22, cx + 8, hy + 24); c.stroke(); }
  else if (def.hair === 'bald') { c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.ellipse(cx + 6, hy - 26, 12, 6, -.3, 0, TAU); c.fill(); c.fillStyle = '#b8b2a8'; c.fillRect(cx - 26, hy - 10, 5, 10); c.fillRect(cx + 21, hy - 10, 5, 10); }
  else if (def.hair === 'messy') { c.fillStyle = '#24170e'; c.beginPath(); c.moveTo(cx - 27, hy - 2); for (let k = 0; k <= 10; k++) { const a = Math.PI + k / 10 * Math.PI; const r = 30 + (k % 2 ? 6 : -2); c.lineTo(cx + Math.cos(a) * r, hy - 10 + Math.sin(a) * r * .9); } c.lineTo(cx + 26, hy - 2); c.quadraticCurveTo(cx + 10, hy - 22, cx - 26, hy - 2); c.fill(); c.fillStyle = '#4a5a62'; c.fillRect(cx - 24, hy - 26, 48, 7); for (const s of [-1, 1]) { c.fillStyle = '#9fe6ff'; c.beginPath(); c.ellipse(cx + s * 11, hy - 23, 7, 5, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(cx + s * 11 - 3, hy - 25, 3, 2); } }
  else if (def.hair === 'bun') { c.fillStyle = '#150e0b'; c.beginPath(); c.moveTo(cx - 26, hy); c.bezierCurveTo(cx - 30, hy - 46, cx + 30, hy - 46, cx + 26, hy); c.quadraticCurveTo(cx + 18, hy - 26, cx, hy - 26); c.quadraticCurveTo(cx - 18, hy - 26, cx - 26, hy); c.fill(); c.beginPath(); c.arc(cx + 14, hy - 38, 9, 0, TAU); c.fill(); }
  else if (def.hair === 'buzz') { c.fillStyle = 'rgba(26,18,12,.85)'; c.beginPath(); c.moveTo(cx - 27, hy - 6); c.bezierCurveTo(cx - 28, hy - 44, cx + 28, hy - 44, cx + 27, hy - 6); c.quadraticCurveTo(cx + 20, hy - 26, cx, hy - 28); c.quadraticCurveTo(cx - 20, hy - 26, cx - 27, hy - 6); c.fill(); }
  c.restore();
  // 分割光：左半邊壓暗
  c.save(); headPath(); c.clip();
  const sh = c.createLinearGradient(cx - 26, 0, cx + 8, 0); sh.addColorStop(0, 'rgba(6,8,14,.72)'); sh.addColorStop(.75, 'rgba(6,8,14,.3)'); sh.addColorStop(1, 'rgba(6,8,14,0)');
  c.fillStyle = sh; c.fillRect(cx - 40, hy - 50, 50, 100); c.restore();
  // 輪廓光
  c.save(); c.strokeStyle = rgba(def.col, .85); c.lineWidth = 2.2; c.beginPath(); c.moveTo(cx + 25 * jaw, hy - 14); c.bezierCurveTo(cx + 26 * jaw, hy + 8, cx + 20 * jaw, hy + 24, cx + 6, hy + 32); c.stroke();
  c.beginPath(); c.moveTo(80, 97); c.quadraticCurveTo(104, 102, 112, 130); c.stroke(); c.restore();
  if (state === 'hurt') { c.fillStyle = 'rgba(150,10,10,.6)'; c.beginPath(); c.ellipse(cx + 14, hy - 16, 8, 4, .5, 0, TAU); c.fill(); c.fillStyle = '#e8e2d4'; c.fillRect(cx - 24, hy - 28, 48, 5); }
  if (state === 'dead') { c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, 0, W0, H0); c.strokeStyle = 'rgba(255,60,60,.7)'; c.lineWidth = 4; c.beginPath(); c.moveTo(16, 16); c.lineTo(W0 - 16, H0 - 16); c.stroke(); }
  // 顆粒
  const id2 = c.getImageData(0, 0, W0, H0), dd = id2.data, rg2 = mulberry32(id.length * 31 + 7);
  for (let i = 0; i < dd.length; i += 4) { const n = (rg2() - .5) * 18; dd[i] += n; dd[i + 1] += n; dd[i + 2] += n; }
  c.putImageData(id2, 0, 0);
  if (state === 'dead') { const g2 = c.getImageData(0, 0, W0, H0), d2 = g2.data; for (let i = 0; i < d2.length; i += 4) { const l = d2[i] * .3 + d2[i + 1] * .59 + d2[i + 2] * .11; d2[i] = d2[i + 1] = d2[i + 2] = l; } c.putImageData(g2, 0, 0); }
  PORTRAIT_CACHE[key] = cv;
  return cv;
}
function drawPortraitTo(cv, id, state, crop) {
  const c = cv.getContext('2d'), p = portrait(id, state);
  const w = cv.width, h = cv.height;
  c.clearRect(0, 0, w, h);
  const ar = p.width / p.height, tw = w, th = w / ar;
  if (crop) { const s = Math.max(w / p.width, h / (p.height * .62)); c.drawImage(p, 0, 8, p.width, p.height * .62, (w - p.width * s) / 2, 0, p.width * s, p.height * .62 * s); }
  else c.drawImage(p, 0, (h - th) / 2, tw, th);
}

// ---------- 圖示 ----------
const ICON = {
  tracker: '<rect x="5" y="3" width="14" height="18" rx="3"/><circle cx="12" cy="11" r="5"/><path d="M12 11l3-3"/><circle cx="14" cy="9" r="1" fill="currentColor"/>',
  flare: '<path d="M8 20l6-12"/><path d="M14 8l2-4 2 3-4 1z" fill="currentColor"/><path d="M17 3l1-1M20 6l1-.5M18 9h1"/>',
  lure: '<rect x="6" y="8" width="12" height="11" rx="2"/><path d="M9 8V5h6v3"/><path d="M3 10c-1 2-1 5 0 7M21 10c1 2 1 5 0 7"/>',
  prod: '<path d="M4 20l10-10"/><path d="M14 10l2-6 2 4 3-1-3 6z" fill="currentColor"/>',
  welder: '<path d="M3 17l8-8 3 3-8 8z"/><path d="M14 9l3-3"/><path d="M18 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="currentColor"/>',
  flamer: '<rect x="2" y="10" width="13" height="5" rx="1"/><path d="M15 12h3"/><path d="M18 9c3 1 4 3 3 6-1-1-2-1-3 0 0-2 1-4 0-6z" fill="currentColor"/><path d="M5 15v4h4"/>',
  fuel: '<path d="M7 5h8l3 3v12H7z"/><path d="M10 5V3h4v2"/><path d="M10 12h5M10 15h5"/>',
  harpoon: '<path d="M2 14h12"/><path d="M14 14l6-3v6z" fill="currentColor"/><path d="M4 14l-1 4M8 14v4"/>',
  sentry: '<path d="M6 20l3-7h6l3 7"/><rect x="7" y="7" width="10" height="6" rx="1"/><path d="M17 10h5"/>',
  sentrykit: '<rect x="4" y="9" width="16" height="10" rx="2"/><path d="M8 9V6h8v3M9 14h6"/>',
  medkit: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M12 10v7M8.5 13.5h7"/>',
  sedative: '<path d="M14 3l7 7-9 9-4 1 1-4z"/><path d="M11 6l7 7M5 19l-2 2"/>',
  ln2: '<rect x="7" y="4" width="10" height="17" rx="4"/><path d="M12 8v8M9 10l6 4M15 10l-6 4"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="M15 15l5 5"/>',
  hide: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M12 3v18M9 12h1M14 12h1"/>',
  unhide: '<rect x="5" y="3" width="10" height="18" rx="2"/><path d="M15 12h6M18 9l3 3-3 3"/>',
  run: '<circle cx="14" cy="4" r="2"/><path d="M8 21l3-6 3 3v4M11 15l1-6 4 3 3-1M12 9l-4 1-2 3"/>',
  walk: '<circle cx="12" cy="4" r="2"/><path d="M12 7v7l-2 7M12 14l3 7M9 10l3-2 3 2"/>',
  guard: '<path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
  door: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M12 3v18"/><circle cx="10" cy="12" r="1" fill="currentColor"/>',
  weld: '<path d="M4 20l16-16M4 4l16 16" stroke-dasharray="2 2"/><circle cx="12" cy="12" r="3"/>',
  give: '<path d="M3 13h5l3 3h4a2 2 0 000-4h-3"/><path d="M8 13l-1 7h11l3-6"/><path d="M14 4v6M11 7h6"/>',
  craft: '<path d="M14 6l4 4-9 9-4 1 1-4z"/><path d="M4 4l5 5M16 14l4 4"/>',
  repair: '<path d="M14 4a5 5 0 016 6l-9 9-4-4 9-9"/><path d="M5 19l2-2"/>',
  power: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
  bridge: '<circle cx="12" cy="12" r="9"/><path d="M12 12l6-4"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
  heal: '<path d="M12 21s-8-5-8-11a4 4 0 018-1 4 4 0 018 1c0 6-8 11-8 11z"/>',
  airlock: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="3"/>',
  shuttle: '<path d="M4 15c2-6 8-9 16-9-1 6-5 11-11 12z"/><path d="M8 17l-3 4M6 13l-3 1"/>',
  selfdestruct: '<circle cx="12" cy="13" r="7"/><path d="M12 6V3M9 3h6M12 13l3-3"/>',
  comms: '<path d="M12 12v9M8 21h8"/><path d="M8 8a5 5 0 018 0M5 5a9 9 0 0114 0"/><circle cx="12" cy="11" r="1.5" fill="currentColor"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  vent: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M4 13h16M4 17h16"/>',
  seal: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M6 6l12 12M18 6L6 18"/>',
  light: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 00-4-10z"/>',
  alarm: '<path d="M6 17V11a6 6 0 0112 0v6"/><path d="M4 17h16M10 20h4"/><path d="M3 6l2 2M21 6l-2 2"/>',
  bot: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M17 8l2-2"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  group: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 20c0-4 2-6 5-6s5 2 5 6M11 20c0-4 2-6 5-6s5 2 5 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cut: '<circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M9 15l8-11M15 15L7 4"/>',
  log: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h3"/>',
  parts: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/>',
};
function icon(k, extra = '') { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${ICON[k] || ICON.x}</svg>`; }
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const FONT_M = "'Chakra Petch','Noto Sans TC',monospace";
