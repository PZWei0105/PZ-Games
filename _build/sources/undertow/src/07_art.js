/* ============ 07 美術：房間背景快取、角色、物件、圖示 ============ */
let ART_SCALE = 1.6;
const HAZ = ['#e2b23a', '#1a1a1a'];

function hazard(ctx, x, y, w, h, step = 10) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = HAZ[1]; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = HAZ[0];
  for (let k = -h; k < w + h; k += step * 2) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + step, y + h); ctx.lineTo(x + k + step + h, y); ctx.lineTo(x + k + h, y); ctx.fill(); }
  ctx.restore();
}
function vgrad(ctx, y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function hgrad(ctx, x0, x1, stops) { const g = ctx.createLinearGradient(x0, 0, x1, 0); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function box(ctx, x, y, w, h, fill, hi, lo) {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  if (hi) { ctx.fillStyle = hi; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y, 2, h); }
  if (lo) { ctx.fillStyle = lo; ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x + w - 2, y, 2, h); }
}
function rivets(ctx, x0, x1, y, step, col) { ctx.fillStyle = col; for (let x = x0; x <= x1; x += step) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill(); } }

/* ---------- 房間背景（只畫一次，快取成圖） ---------- */
function paintRoom(r, M) {
  const S = ART_SCALE, cv = makeCanvas(RW * S, FH * S), ctx = cv.getContext('2d');
  ctx.scale(S, S);
  const rng = RNG(r.seed);
  const C = M.C, F = M.F;
  const L = r.c === 0 ? 20 : 8, Rr = r.c === C - 1 ? 20 : 8, T = r.f === 0 ? 18 : 0;
  const fy = FH - SLAB; // 地板（房間內座標）
  r.glow = []; r.blink = []; r.lights = []; r.windows = [];
  if (r.collapsed) { paintCollapsed(ctx, r, rng, L, Rr, T, fy); return cv; }
  const th = THEMES[r.theme] || THEMES.storage;
  const wall = th.wall;
  // 牆面
  ctx.fillStyle = vgrad(ctx, T, fy, [[0, mixHex(wall, '#000000', .45)], [.35, wall], [.75, mixHex(wall, '#0a0f12', .15)], [1, mixHex(wall, '#000000', .35)]]);
  ctx.fillRect(L, T, RW - L - Rr, fy - T);
  // 牆板
  const pw = rng.pick([56, 60, 64, 72]);
  for (let x = L, k = 0; x < RW - Rr; x += pw, k++) {
    if (k % 2) { ctx.fillStyle = 'rgba(255,255,255,.022)'; ctx.fillRect(x, T + 46, Math.min(pw, RW - Rr - x), fy - T - 130); }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, T + 40, 1.5, fy - T - 40);
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(x + 1.5, T + 40, 1, fy - T - 40);
  }
  // 護牆板
  const wy = fy - 84;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(L, wy, RW - L - Rr, fy - wy);
  ctx.fillStyle = mixHex(wall, '#9fb6c2', .18); ctx.fillRect(L, wy - 4, RW - L - Rr, 4);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(L, wy, RW - L - Rr, 2);
  rivets(ctx, L + 10, RW - Rr - 6, wy - 2, 24, 'rgba(200,220,230,.18)');
  // 天花板管線
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(L, T, RW - L - Rr, 40);
  const pipeCols = [['#4d5f69', '#77909c'], ['#5a4a3a', '#8a7058'], ['#3c5a52', '#5f8a7d']];
  const pc = rng.pick(pipeCols);
  for (const [py, ph] of [[T + 10, 9], [T + 24, 6]]) {
    ctx.fillStyle = vgrad(ctx, py, py + ph, [[0, pc[1]], [.5, pc[0]], [1, mixHex(pc[0], '#000000', .5)]]);
    ctx.fillRect(L, py, RW - L - Rr, ph);
    for (let x = L + 20 + rng.int(0, 30); x < RW - Rr; x += rng.int(60, 110)) { ctx.fillStyle = '#20292e'; ctx.fillRect(x, py - 2, 5, ph + 4); }
  }
  // 一兩根垂直管
  if (rng.chance(.6)) {
    const vx = rng.pick([L + 14, RW - Rr - 22]);
    if (!r.doorL || vx > 30) {
      ctx.fillStyle = hgrad(ctx, vx, vx + 8, [[0, '#2f3b42'], [.5, '#6c818c'], [1, '#2a343a']]); ctx.fillRect(vx, T + 30, 8, fy - T - 30 - 92);
      ctx.fillStyle = '#1b2226'; ctx.fillRect(vx - 2, wy - 30, 12, 6);
    }
  }
  // 窗（看得到外面的海）
  r.windows = [];
  if (r.theme !== 'dock' && rng.chance(r.theme === 'control' || r.theme === 'deep' ? 1 : .42)) {
    const big = r.theme === 'control' || r.theme === 'deep';
    const wr = big ? 34 : rng.int(15, 19);
    let wx = rng.int(L + 60, RW - Rr - 60), wyy = T + (big ? 92 : rng.int(70, 88));
    if (r.vent && Math.abs(r.vent.x - r.x0 - wx) < 60) wx = RW - wx;
    r.windows.push({ x: wx, y: wyy, r: wr });
  }
  // 通風口
  if (r.vent) {
    const vx = r.vent.x - r.x0, vy = r.vent.y - r.y0;
    ctx.fillStyle = '#0b1013'; ctx.fillRect(vx - 26, vy - 15, 52, 30);
    ctx.strokeStyle = '#5c6c74'; ctx.lineWidth = 3; ctx.strokeRect(vx - 26, vy - 15, 52, 30);
    // 葉片在動態層畫（會抖）
  }
  // 牆上標示
  ctx.save();
  ctx.font = '900 15px "Rajdhani","Noto Sans TC",sans-serif'; ctx.fillStyle = 'rgba(210,230,240,.08)';
  const code = String.fromCharCode(65 + r.f) + '-' + (r.c + 1) + (r.i % 2 ? '1' : '7');
  ctx.fillText(code, L + 16, wy - 14);
  ctx.font = '700 11px "Noto Sans TC",sans-serif'; ctx.fillStyle = 'rgba(210,230,240,.12)';
  ctx.fillText(th.name, L + 16, wy - 28);
  ctx.restore();
  paintDecor(ctx, r, rng, L, Rr, T, fy, wy);
  // 燈具
  r.lights = [];
  const nl = r.theme === 'corridor' || r.theme === 'server' ? 1 : (rng.chance(.5) ? 2 : 1);
  const lxs = nl === 2 ? [RW * .3, RW * .7] : [RW * .5 + rng.int(-40, 40)];
  for (let lx of lxs) {
    if (r.ladDown && Math.abs(r.ladDown.x - r.x0 - lx) < 30) lx += 50;
    ctx.fillStyle = '#1b2327'; ctx.fillRect(lx - 1, T + 36, 2, 10);
    ctx.fillStyle = vgrad(ctx, T + 44, T + 54, [[0, '#56646b'], [1, '#2a3337']]);
    ctx.beginPath(); ctx.moveTo(lx - 20, T + 54); ctx.lineTo(lx - 10, T + 44); ctx.lineTo(lx + 10, T + 44); ctx.lineTo(lx + 20, T + 54); ctx.fill();
    r.lights.push({ x: r.x0 + lx, y: r.y0 + T + 56 });
  }
  // 擺設
  for (const p of r.props) paintProp(ctx, p, fy, r, rng);
  // 地板
  ctx.fillStyle = vgrad(ctx, fy, FH, [[0, '#56656d'], [.12, '#2b353b'], [.6, '#161d21'], [1, '#0c1114']]);
  ctx.fillRect(0, fy, RW, SLAB);
  ctx.fillStyle = 'rgba(190,215,225,.32)'; ctx.fillRect(0, fy, RW, 1.5);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let x = 0; x < RW; x += 7) ctx.fillRect(x, fy + 3, 1, 5);
  if (r.f === F - 1) { ctx.fillStyle = '#0a0e10'; ctx.fillRect(0, fy + 12, RW, SLAB - 12); }
  // 地板與牆的陰影
  ctx.fillStyle = vgrad(ctx, fy - 26, fy, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.45)']]); ctx.fillRect(L, fy - 26, RW - L - Rr, 26);
  // 梯井
  if (r.ladDown) paintLadder(ctx, r.ladDown.x - r.x0, fy - 74, FH, true);
  if (r.ladUp) paintLadder(ctx, r.ladUp.x - r.x0, T - 2, fy + 1, false);
  // 撤離塢的月池
  if (r.theme === 'dock') {
    const mp = r.props.find(p => p.kind === 'moonpool');
    if (mp) {
      ctx.clearRect(mp.x, fy, mp.w, SLAB);
      hazard(ctx, mp.x - 8, fy - 2, 8, SLAB + 2, 5); hazard(ctx, mp.x + mp.w, fy - 2, 8, SLAB + 2, 5);
      ctx.fillStyle = '#39464d'; ctx.fillRect(mp.x - 14, fy - 30, 6, 30); ctx.fillRect(mp.x + mp.w + 8, fy - 30, 6, 30);
      ctx.fillStyle = '#ffb03a'; ctx.fillRect(mp.x - 15, fy - 34, 8, 5); ctx.fillRect(mp.x + mp.w + 7, fy - 34, 8, 5);
      r.moon = { x: r.x0 + mp.x, w: mp.w };
    }
  }
  // 牆（左右）與艙門門框
  paintSideWall(ctx, r, 0, L, T, fy, !!r.doorL, r.c === 0);
  paintSideWall(ctx, r, RW - Rr, Rr, T, fy, !!r.doorR, r.c === C - 1);
  if (r.f === 0) { ctx.fillStyle = vgrad(ctx, 0, T, [[0, '#0d1418'], [1, '#2a363d']]); ctx.fillRect(0, 0, RW, T); ctx.fillStyle = 'rgba(150,180,190,.25)'; ctx.fillRect(0, T - 2, RW, 2); rivets(ctx, 10, RW, 7, 22, 'rgba(160,190,200,.25)'); }
  // 窗洞（挖空，讓海景透出來）
  for (const w of r.windows) {
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#5c6d75'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(w.x, w.y, w.r + 3, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#1b2327'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w.x, w.y, w.r + 7, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#8fa3ad'; for (let a = 0; a < 8; a++) { ctx.beginPath(); ctx.arc(w.x + Math.cos(a * TAU / 8) * (w.r + 3), w.y + Math.sin(a * TAU / 8) * (w.r + 3), 1.4, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(180,240,255,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w.x, w.y, w.r - 3, -2.4, -1.4); ctx.stroke();
  }
  // 房間暗角
  const vg = ctx.createRadialGradient(RW / 2, FH * .45, FH * .3, RW / 2, FH * .45, RW * .75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)');
  ctx.fillStyle = vg; ctx.fillRect(L, T, RW - L - Rr, fy - T);
  return cv;
}
function paintSideWall(ctx, r, x, w, T, fy, door, hull) {
  ctx.fillStyle = hull ? hgrad(ctx, x, x + w, x === 0 ? [[0, '#0b1114'], [.6, '#2d3940'], [1, '#41515a']] : [[0, '#41515a'], [.4, '#2d3940'], [1, '#0b1114']]) : '#26323a';
  ctx.fillRect(x, T, w, fy - T);
  if (!hull) { ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x === 0 ? x + w - 1 : x, T, 1, fy - T); }
  if (door) {
    const dy = fy - DOORH;
    ctx.fillStyle = '#05080a'; ctx.fillRect(x, dy, w, DOORH);
    const fx = x === 0 ? x + w : x - 6;
    hazard(ctx, fx, dy - 8, 6, DOORH + 8, 5);
    ctx.fillStyle = '#3c4a52'; ctx.fillRect(x === 0 ? x : x, dy - 12, w, 6);
  }
  if (hull) rivets(ctx, 0, 0, 0, 1, 'transparent');
}
function paintCollapsed(ctx, r, rng, L, Rr, T, fy) {
  ctx.fillStyle = '#05080a'; ctx.fillRect(0, 0, RW, FH);
  ctx.fillStyle = vgrad(ctx, 0, FH, [[0, '#0d1316'], [1, '#121a1e']]);
  for (let k = 0; k < 14; k++) {
    const x = rng.range(0, RW), y = rng.range(FH * .2, FH), w = rng.range(30, 110), h = rng.range(20, 70);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rng.range(-.6, .6));
    ctx.fillStyle = rng.pick(['#1b2328', '#232c31', '#151b1f', '#2a2622']); ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(-w / 2, -h / 2, w, 2); ctx.restore();
  }
  for (let k = 0; k < 3; k++) { ctx.save(); ctx.translate(rng.range(40, RW - 40), rng.range(40, FH - 40)); ctx.rotate(rng.range(-1, 1)); hazard(ctx, -60, -5, 120, 10, 6); ctx.restore(); }
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, RW, FH);
  ctx.fillStyle = '#2a363d'; ctx.fillRect(0, FH - SLAB, RW, SLAB);
}
function paintLadder(ctx, x, y0, y1, hatch) {
  if (hatch) { ctx.fillStyle = '#05080a'; ctx.fillRect(x - 22, FH - SLAB, 44, SLAB); hazard(ctx, x - 26, FH - SLAB - 2, 4, SLAB + 2, 4); hazard(ctx, x + 22, FH - SLAB - 2, 4, SLAB + 2, 4); }
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - 14, y0, 30, y1 - y0);
  for (const sx of [-13, 11]) { ctx.fillStyle = hgrad(ctx, x + sx, x + sx + 3, [[0, '#8fa3ad'], [1, '#4c5b62']]); ctx.fillRect(x + sx, y0, 3, y1 - y0); }
  ctx.fillStyle = '#6f828b'; for (let y = y0 + 8; y < y1; y += 15) ctx.fillRect(x - 11, y, 22, 2.5);
  if (hatch) { ctx.strokeStyle = '#8fa3ad'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 12, y0); ctx.quadraticCurveTo(x - 12, y0 - 14, x, y0 - 14); ctx.quadraticCurveTo(x + 12, y0 - 14, x + 12, y0); ctx.stroke(); }
}
function paintDecor(ctx, r, rng, L, Rr, T, fy, wy) {
  const th = r.theme;
  const spot = () => rng.int(L + 40, RW - Rr - 80);
  const screen = (x, y, w, h, col) => { ctx.fillStyle = '#0a1013'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6); ctx.fillStyle = col; ctx.fillRect(x, y, w, h); ctx.fillStyle = 'rgba(255,255,255,.15)'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 4, y + 5 + k * (h / 5), rng.range(w * .3, w * .8), 1.5); };
  if (th === 'mess' || th === 'lounge') { const x = spot(); ctx.fillStyle = '#2e3a3c'; ctx.fillRect(x, T + 70, 70, 44); ctx.fillStyle = 'rgba(255,200,120,.12)'; ctx.fillRect(x + 4, T + 74, 62, 36); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.font = '700 9px sans-serif'; ctx.fillText('今日菜單', x + 10, T + 88); }
  if (th === 'med' || th === 'autopsy') { const x = spot(); ctx.fillStyle = 'rgba(230,240,240,.12)'; ctx.fillRect(x, T + 64, 30, 30); ctx.fillStyle = 'rgba(255,70,80,.35)'; ctx.fillRect(x + 12, T + 68, 6, 22); ctx.fillRect(x + 4, T + 76, 22, 6); }
  if (th === 'sonar' || th === 'control' || th === 'studio') { screen(spot(), T + 62, 64, 40, 'rgba(40,140,160,.35)'); }
  if (th === 'office' || th === 'lab') { const x = spot(); ctx.fillStyle = '#c9cfc4'; ctx.fillRect(x, T + 62, 76, 46); ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < 5; k++) ctx.fillRect(x + 6, T + 70 + k * 7, rng.range(20, 60), 1.5); ctx.strokeStyle = 'rgba(200,40,40,.5)'; ctx.beginPath(); ctx.arc(x + 56, T + 84, 9, 0, TAU); ctx.stroke(); }
  if (th === 'dorm') { for (let k = 0; k < 2; k++) { const x = spot(); ctx.fillStyle = rng.pick(['#4b3d5a', '#5a4a3d', '#3d5a4f']); ctx.fillRect(x, T + 66, 22, 30); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x + 4, T + 70, 14, 14); } }
  if (th === 'pump' || th === 'power' || th === 'workshop' || th === 'corridor') { const x = spot(); hazard(ctx, x, wy - 18, 90, 8, 6); ctx.fillStyle = 'rgba(255,190,80,.4)'; ctx.font = '900 10px sans-serif'; ctx.fillText('注意高壓', x + 18, wy - 24); }
  if (th === 'freezer') { ctx.fillStyle = 'rgba(200,230,255,.07)'; ctx.fillRect(L, T + 40, RW - L - Rr, 30); }
  if (th === 'tanks' || th === 'deep') { ctx.strokeStyle = 'rgba(80,200,180,.18)'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { const x = spot(); ctx.beginPath(); ctx.moveTo(x, T + 36); ctx.bezierCurveTo(x + 20, T + 90, x - 20, T + 120, x + 10, fy - 40); ctx.stroke(); } }
  if (rng.chance(.5)) { // 刮痕／血跡
    const x = spot(), y = rng.int(T + 80, fy - 40);
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + k * 7, y); ctx.lineTo(x + k * 7 + 18, y + 34); ctx.stroke(); }
  }
  if (rng.chance(.35)) { const x = spot(); ctx.fillStyle = 'rgba(70,10,15,.45)'; ctx.beginPath(); ctx.ellipse(x, fy - 1, 26, 4, 0, 0, TAU); ctx.fill(); ctx.fillRect(x - 3, fy - 60, 4, 58); }
}

/* ---------- 擺設 ---------- */
function paintProp(ctx, p, fy, r, rng) {
  const x = p.x, w = p.w;
  const metal = '#3f4d55', metalHi = '#6b7f89', dark = '#1a2226';
  switch (p.kind) {
    case 'bunk': {
      ctx.fillStyle = dark; ctx.fillRect(x, fy - 96, 4, 96); ctx.fillRect(x + w - 4, fy - 96, 4, 96);
      for (const by of [fy - 24, fy - 74]) {
        ctx.fillStyle = metal; ctx.fillRect(x, by, w, 6);
        const bc = rng.pick(['#3b4a6b', '#4a5d4a', '#5a4040', '#4a4a5a']);
        ctx.fillStyle = bc; rrect(ctx, x + 4, by - 12, w - 8, 13, 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + 6, by - 11, w - 12, 2);
        ctx.fillStyle = '#c9c6bd'; rrect(ctx, x + 6, by - 17, 22, 8, 3); ctx.fill();
        if (rng.chance(.5)) { ctx.fillStyle = mixHex(bc, '#000000', .3); ctx.beginPath(); ctx.moveTo(x + w - 30, by - 12); ctx.quadraticCurveTo(x + w - 10, by + 8, x + w - 4, by + 22); ctx.lineTo(x + w - 18, by + 22); ctx.quadraticCurveTo(x + w - 28, by + 4, x + w - 44, by - 12); ctx.fill(); }
      }
      ctx.fillStyle = metalHi; for (let k = 0; k < 4; k++) ctx.fillRect(x + w - 16, fy - 70 + k * 14, 12, 2);
      break; }
    case 'locker': {
      ctx.fillStyle = vgrad(ctx, fy - 110, fy, [[0, '#55656e'], [1, '#2d383e']]); ctx.fillRect(x, fy - 110, w, 110);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + w / 2 - .5, fy - 108, 1, 106);
      for (let k = 0; k < 4; k++) { ctx.fillRect(x + 5, fy - 100 + k * 5, w / 2 - 9, 2); }
      ctx.fillStyle = '#c8b46a'; ctx.fillRect(x + w / 2 - 5, fy - 60, 3, 8);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.font = '700 8px sans-serif'; ctx.fillText(String(rng.int(10, 99)), x + 4, fy - 76);
      if (rng.chance(.3)) { ctx.fillStyle = '#0a0e10'; ctx.fillRect(x + w / 2 + 1, fy - 108, w / 2 - 2, 104); }
      break; }
    case 'desk': case 'counter': {
      const h = p.kind === 'desk' ? 40 : 48;
      ctx.fillStyle = p.kind === 'desk' ? '#5a4a3a' : '#5e6a70'; ctx.fillRect(x, fy - h, w, 6);
      ctx.fillStyle = p.kind === 'desk' ? '#3c3027' : '#3a454b'; ctx.fillRect(x + 4, fy - h + 6, w - 8, h - 6);
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x + 8, fy - h + 12, w * .35, 2); ctx.fillRect(x + 8, fy - h + 24, w * .35, 2);
      if (p.kind === 'desk') { ctx.fillStyle = '#1b2428'; ctx.fillRect(x + w - 36, fy - h - 26, 30, 22); ctx.fillStyle = 'rgba(80,200,220,.35)'; ctx.fillRect(x + w - 33, fy - h - 23, 24, 15); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x + 10, fy - h - 4, 18, 4); }
      else { for (let k = 0; k < 3; k++) { ctx.fillStyle = rng.pick(['#9aa5a8', '#c8c0a8', '#7d8a8f']); ctx.fillRect(x + 10 + k * 22, fy - h - 9, 12, 9); } }
      break; }
    case 'table': {
      ctx.fillStyle = '#6a7378'; ctx.fillRect(x, fy - 38, w, 5); ctx.fillStyle = '#2d363b'; ctx.fillRect(x + 8, fy - 33, 4, 33); ctx.fillRect(x + w - 12, fy - 33, 4, 33);
      ctx.fillStyle = '#3e4a50'; ctx.fillRect(x - 8, fy - 20, 22, 4); ctx.fillRect(x + w - 14, fy - 20, 22, 4);
      for (let k = 0; k < 3; k++) { ctx.fillStyle = rng.pick(['#c9c3b0', '#8b9aa0', '#a87d5a']); ctx.fillRect(x + 12 + k * 30, fy - 44, rng.int(10, 16), 6); }
      if (rng.chance(.5)) { ctx.fillStyle = 'rgba(120,20,30,.4)'; ctx.fillRect(x + 40, fy - 36, 30, 2); }
      break; }
    case 'fridge': {
      ctx.fillStyle = vgrad(ctx, fy - 120, fy, [[0, '#c3c9c4'], [1, '#7f8884']]); rrect(ctx, x, fy - 120, w, 120, 4); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 2, fy - 76, w - 4, 2);
      ctx.fillStyle = '#5a6360'; ctx.fillRect(x + w - 9, fy - 110, 3, 26); ctx.fillRect(x + w - 9, fy - 66, 3, 30);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x + 4, fy - 116, 3, 100);
      break; }
    case 'bed': {
      ctx.fillStyle = metal; ctx.fillRect(x, fy - 34, w, 6); ctx.fillRect(x + 4, fy - 28, 4, 28); ctx.fillRect(x + w - 8, fy - 28, 4, 28); ctx.fillRect(x + w - 6, fy - 56, 4, 28);
      ctx.fillStyle = '#d6dcd8'; rrect(ctx, x + 2, fy - 46, w - 10, 13, 4); ctx.fill();
      ctx.fillStyle = '#7fa6b5'; rrect(ctx, x + 30, fy - 47, w - 42, 14, 4); ctx.fill();
      ctx.fillStyle = '#eef1ee'; rrect(ctx, x + 6, fy - 52, 22, 9, 3); ctx.fill();
      break; }
    case 'cabinet': {
      ctx.fillStyle = vgrad(ctx, fy - 90, fy, [[0, '#d0d6d2'], [1, '#8d9692']]); ctx.fillRect(x, fy - 90, w, 90);
      ctx.fillStyle = 'rgba(40,70,80,.55)'; ctx.fillRect(x + 4, fy - 86, w - 8, 40);
      ctx.fillStyle = 'rgba(255,255,255,.3)'; for (let k = 0; k < 3; k++) ctx.fillRect(x + 8 + k * 11, fy - 80 + (k % 2) * 8, 6, 14);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 2, fy - 42, w - 4, 2); ctx.fillRect(x + 2, fy - 22, w - 4, 2);
      if (r.theme === 'power') { ctx.fillStyle = '#2e3a40'; ctx.fillRect(x, fy - 90, w, 90); hazard(ctx, x + 6, fy - 82, w - 12, 8, 4); ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.moveTo(x + w / 2, fy - 64); ctx.lineTo(x + w / 2 - 8, fy - 46); ctx.lineTo(x + w / 2 + 2, fy - 48); ctx.lineTo(x + w / 2 - 4, fy - 30); ctx.lineTo(x + w / 2 + 9, fy - 52); ctx.lineTo(x + w / 2, fy - 50); ctx.fill(); }
      break; }
    case 'iv': ctx.fillStyle = metalHi; ctx.fillRect(x + 10, fy - 104, 2, 104); ctx.fillRect(x + 2, fy - 2, 18, 2); ctx.fillStyle = 'rgba(200,230,240,.5)'; rrect(ctx, x + 2, fy - 100, 12, 18, 3); ctx.fill(); break;
    case 'crate': {
      const h = rng.pick([38, 44, 50]);
      const col = rng.pick(['#4a5a3a', '#5a4a32', '#3e4e58', '#5b5a52']);
      ctx.fillStyle = col; ctx.fillRect(x, fy - h, w, h);
      ctx.strokeStyle = mixHex(col, '#000000', .45); ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, fy - h + 1.5, w - 3, h - 3);
      ctx.beginPath(); ctx.moveTo(x + 3, fy - h + 3); ctx.lineTo(x + w - 3, fy - 3); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.font = '700 8px sans-serif'; ctx.fillText('XM-' + rng.int(10, 99), x + 6, fy - h + 12);
      if (rng.chance(.5)) { const h2 = rng.pick([26, 30]); ctx.fillStyle = mixHex(col, '#ffffff', .08); ctx.fillRect(x + 6, fy - h - h2, w - 14, h2); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.strokeRect(x + 7, fy - h - h2 + 1, w - 16, h2 - 2); }
      break; }
    case 'shelf': {
      ctx.fillStyle = dark; ctx.fillRect(x, fy - 112, 3, 112); ctx.fillRect(x + w - 3, fy - 112, 3, 112);
      for (let k = 0; k < 4; k++) {
        const y = fy - 4 - k * 34; ctx.fillStyle = metal; ctx.fillRect(x, y, w, 4);
        let cx = x + 4; while (cx < x + w - 10) { const bw = rng.int(6, 14), bh = rng.int(12, 26); ctx.fillStyle = rng.pick(['#7a5a3a', '#4a6a7a', '#8a8a7a', '#5a4a6a', '#9a6a4a', '#6a7a5a']); ctx.fillRect(cx, y - bh, bw, bh); cx += bw + rng.int(1, 4); }
      }
      break; }
    case 'barrel': {
      const col = rng.pick(['#7a4a2a', '#3a5a7a', '#6a6a2a']);
      ctx.fillStyle = hgrad(ctx, x, x + w, [[0, mixHex(col, '#000000', .5)], [.4, col], [1, mixHex(col, '#000000', .6)]]); rrect(ctx, x, fy - 46, w, 46, 4); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, fy - 34, w, 3); ctx.fillRect(x, fy - 14, w, 3);
      break; }
    case 'sofa': {
      const col = rng.pick(['#5a3a3a', '#3a4a5a', '#4a5a4a']);
      ctx.fillStyle = col; rrect(ctx, x, fy - 50, w, 30, 8); ctx.fill(); ctx.fillStyle = mixHex(col, '#000000', .25); rrect(ctx, x + 4, fy - 30, w - 8, 22, 6); ctx.fill();
      ctx.fillStyle = mixHex(col, '#ffffff', .1); rrect(ctx, x - 4, fy - 36, 14, 30, 5); ctx.fill(); rrect(ctx, x + w - 10, fy - 36, 14, 30, 5); ctx.fill();
      ctx.fillStyle = dark; ctx.fillRect(x + 6, fy - 8, 4, 8); ctx.fillRect(x + w - 10, fy - 8, 4, 8);
      break; }
    case 'plant': ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x + 4, fy - 22, 18, 22); ctx.fillStyle = '#3a4a32'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + 13 + rng.range(-8, 8), fy - 30 - k * 7, 7, 3, rng.range(-1, 1), 0, TAU); ctx.fill(); } break;
    case 'washer': {
      ctx.fillStyle = vgrad(ctx, fy - 56, fy, [[0, '#cfd4d0'], [1, '#8a928e']]); rrect(ctx, x, fy - 56, w, 56, 3); ctx.fill();
      ctx.fillStyle = '#333c40'; ctx.beginPath(); ctx.arc(x + w / 2, fy - 26, 15, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(120,170,190,.5)'; ctx.beginPath(); ctx.arc(x + w / 2, fy - 26, 11, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5a6360'; ctx.fillRect(x + 4, fy - 52, w - 8, 6);
      break; }
    case 'pump': {
      ctx.fillStyle = hgrad(ctx, x + 10, x + w - 10, [[0, '#2a3a40'], [.35, '#6a8590'], [.6, '#4a5f68'], [1, '#1e2a2f']]); rrect(ctx, x + 10, fy - 130, w - 20, 130, 18); ctx.fill();
      ctx.fillStyle = '#1b2428'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 6, fy - 112 + k * 28, w - 12, 6);
      ctx.fillStyle = '#c84a3a'; ctx.beginPath(); ctx.arc(x + w / 2, fy - 64, 13, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.arc(x + w / 2, fy - 64, 9, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c84a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w / 2, fy - 64); ctx.lineTo(x + w / 2 + 6, fy - 69); ctx.stroke();
      if (rng.chance(.5)) { ctx.fillStyle = '#1b2428'; ctx.fillRect(x + w - 30, fy - 10, 40, 10); }
      break; }
    case 'valve': ctx.fillStyle = '#4a5a62'; ctx.fillRect(x + 12, fy - 120, 8, 120); ctx.strokeStyle = '#c84a3a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x + 16, fy - 70, 12, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 4, fy - 70); ctx.lineTo(x + 28, fy - 70); ctx.moveTo(x + 16, fy - 82); ctx.lineTo(x + 16, fy - 58); ctx.stroke(); break;
    case 'generator': {
      ctx.fillStyle = vgrad(ctx, fy - 120, fy, [[0, '#4d5c63'], [1, '#232c30']]); rrect(ctx, x, fy - 120, w, 120, 6); ctx.fill();
      ctx.fillStyle = '#0b1416'; rrect(ctx, x + 22, fy - 100, w - 44, 60, 30); ctx.fill();
      r.glow = r.glow || []; r.glow.push({ x: r.x0 + x + w / 2, y: r.y0 + fy - 70, r: 60, col: '#5fe7ff' });
      ctx.fillStyle = 'rgba(95,231,255,.55)'; rrect(ctx, x + 30, fy - 92, w - 60, 44, 22); ctx.fill();
      hazard(ctx, x + 6, fy - 24, w - 12, 10, 6);
      ctx.fillStyle = '#1b2428'; for (let k = 0; k < 6; k++) ctx.fillRect(x + 10 + k * 18, fy - 116, 8, 10);
      break; }
    case 'bench': {
      ctx.fillStyle = '#5a5248'; ctx.fillRect(x, fy - 44, w, 7); ctx.fillStyle = '#2d363b'; ctx.fillRect(x + 6, fy - 37, 5, 37); ctx.fillRect(x + w - 11, fy - 37, 5, 37); ctx.fillRect(x + 6, fy - 18, w - 12, 4);
      ctx.fillStyle = '#8a8f88'; ctx.fillRect(x + 12, fy - 54, 20, 10); ctx.fillStyle = '#c84a3a'; ctx.fillRect(x + 40, fy - 50, 26, 6); ctx.fillStyle = '#ccb050'; ctx.fillRect(x + 70, fy - 52, 10, 8);
      ctx.strokeStyle = '#3a454b'; ctx.lineWidth = 2; ctx.strokeRect(x + 4, fy - 128, w - 8, 60);
      ctx.fillStyle = '#7d8a8f'; for (let k = 0; k < 6; k++) ctx.fillRect(x + 10 + k * 13, fy - 122 + (k % 3) * 6, 3, 30 + (k % 2) * 10);
      break; }
    case 'cable': ctx.fillStyle = '#5a4a32'; ctx.beginPath(); ctx.arc(x + 21, fy - 21, 21, 0, TAU); ctx.fill(); ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(x + 21, fy - 21, 15, 0, TAU); ctx.fill(); ctx.fillStyle = '#5a4a32'; ctx.beginPath(); ctx.arc(x + 21, fy - 21, 6, 0, TAU); ctx.fill(); break;
    case 'console': {
      ctx.fillStyle = vgrad(ctx, fy - 52, fy, [[0, '#46545b'], [1, '#22292d']]);
      ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x, fy - 40); ctx.lineTo(x + 10, fy - 54); ctx.lineTo(x + w, fy - 54); ctx.lineTo(x + w, fy); ctx.fill();
      ctx.fillStyle = '#0b1416'; ctx.fillRect(x + 14, fy - 92, w - 22, 34);
      ctx.fillStyle = 'rgba(60,200,220,.45)'; ctx.fillRect(x + 17, fy - 89, w - 28, 28);
      ctx.strokeStyle = 'rgba(160,255,255,.7)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let k = 0; k <= 20; k++) { const xx = x + 18 + k * (w - 30) / 20, yy = fy - 75 + Math.sin(k * 1.3 + rng.f() * 3) * rng.range(2, 9); k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
      r.glow = r.glow || []; r.glow.push({ x: r.x0 + x + w / 2, y: r.y0 + fy - 75, r: 46, col: '#3fd8ee' });
      for (let k = 0; k < 6; k++) { ctx.fillStyle = rng.pick(['#ff5a5a', '#5aff8a', '#ffcf5a', '#5ad8ff']); ctx.fillRect(x + 16 + k * 9, fy - 48, 4, 3); }
      break; }
    case 'speaker': {
      ctx.fillStyle = '#20282c'; rrect(ctx, x, fy - 130, w, 130, 4); ctx.fill();
      for (const [cy, rr] of [[fy - 98, 22], [fy - 44, 26]]) { ctx.fillStyle = '#0b0f11'; ctx.beginPath(); ctx.arc(x + w / 2, cy, rr, 0, TAU); ctx.fill(); ctx.strokeStyle = '#3e4a50'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + w / 2, cy, rr - 6, 0, TAU); ctx.stroke(); ctx.fillStyle = '#2d363b'; ctx.beginPath(); ctx.arc(x + w / 2, cy, 6, 0, TAU); ctx.fill(); }
      hazard(ctx, x + 4, fy - 128, w - 8, 6, 4);
      break; }
    case 'server': {
      ctx.fillStyle = vgrad(ctx, fy - 132, fy, [[0, '#283238'], [1, '#141a1d']]); ctx.fillRect(x, fy - 132, w, 132);
      for (let k = 0; k < 14; k++) { const y = fy - 126 + k * 9; ctx.fillStyle = '#0a0e10'; ctx.fillRect(x + 3, y, w - 6, 6); ctx.fillStyle = rng.chance(.6) ? rng.pick(['#5aff8a', '#5ad8ff', '#ffcf5a']) : '#33393c'; ctx.fillRect(x + 6, y + 2, 3, 2); ctx.fillRect(x + 11, y + 2, 2, 2); }
      r.blink = r.blink || []; r.blink.push({ x: r.x0 + x + 7, y: r.y0 + fy - 120, h: 120 });
      break; }
    case 'mic': ctx.fillStyle = '#2d363b'; ctx.fillRect(x + 10, fy - 110, 2, 110); ctx.fillRect(x + 2, fy - 2, 18, 2); ctx.fillStyle = '#56646b'; rrect(ctx, x + 6, fy - 124, 10, 18, 5); ctx.fill(); break;
    case 'tank': {
      const h = 120;
      ctx.fillStyle = '#2d363b'; ctx.fillRect(x, fy - 14, w, 14); ctx.fillRect(x, fy - h - 12, w, 12);
      ctx.fillStyle = 'rgba(60,200,170,.22)'; ctx.fillRect(x + 4, fy - h, w - 8, h - 14);
      ctx.fillStyle = 'rgba(160,255,230,.18)'; ctx.fillRect(x + 6, fy - h, 4, h - 14);
      const kind = rng.int(0, 2);
      ctx.fillStyle = 'rgba(30,70,60,.85)';
      if (kind === 0) { ctx.beginPath(); ctx.ellipse(x + w / 2, fy - 60, 12, 22, .2, 0, TAU); ctx.fill(); }
      else if (kind === 1) { for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + w / 2 + rng.range(-10, 10), fy - 40 - k * 16, 6, 0, TAU); ctx.fill(); } }
      else { ctx.beginPath(); ctx.moveTo(x + w / 2 - 12, fy - 30); ctx.quadraticCurveTo(x + w / 2, fy - 100, x + w / 2 + 12, fy - 30); ctx.fill(); }
      r.glow = r.glow || []; r.glow.push({ x: r.x0 + x + w / 2, y: r.y0 + fy - 66, r: 50, col: '#4fe0b8' });
      if (rng.chance(.25)) { ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 10, fy - 100); ctx.lineTo(x + 22, fy - 80); ctx.lineTo(x + 16, fy - 60); ctx.stroke(); }
      break; }
    case 'optable': {
      ctx.fillStyle = '#9aa7ac'; ctx.fillRect(x, fy - 44, w, 7); ctx.fillStyle = '#56646b'; ctx.fillRect(x + w / 2 - 6, fy - 37, 12, 37); ctx.fillRect(x + w / 2 - 26, fy - 4, 52, 4);
      ctx.fillStyle = 'rgba(220,225,220,.85)'; rrect(ctx, x + 8, fy - 56, w - 16, 12, 5); ctx.fill();
      ctx.fillStyle = 'rgba(90,10,20,.45)'; ctx.fillRect(x + 30, fy - 45, 40, 3);
      break; }
    case 'freezer': {
      ctx.fillStyle = vgrad(ctx, fy - 130, fy, [[0, '#a9b8c0'], [1, '#6a7a82']]); ctx.fillRect(x, fy - 130, w, 130);
      for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) { const xx = x + 4 + j * (w / 2 - 2), yy = fy - 126 + k * 42; ctx.fillStyle = '#8796a0'; ctx.fillRect(xx, yy, w / 2 - 6, 38); ctx.fillStyle = '#4a5860'; ctx.fillRect(xx + w / 4 - 8, yy + 16, 14, 4); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.font = '700 9px sans-serif'; ctx.fillText(String(k * 2 + j + 1), xx + 4, yy + 11); }
      ctx.fillStyle = 'rgba(230,245,255,.25)'; ctx.fillRect(x, fy - 130, w, 6);
      break; }
    case 'labbench': {
      ctx.fillStyle = '#e0e4e0'; ctx.fillRect(x, fy - 46, w, 6); ctx.fillStyle = '#5a6a70'; ctx.fillRect(x + 4, fy - 40, w - 8, 40);
      for (let k = 0; k < 4; k++) { const bx = x + 10 + k * 22; ctx.fillStyle = rng.pick(['rgba(95,231,255,.6)', 'rgba(120,255,160,.55)', 'rgba(255,120,200,.5)']); ctx.fillRect(bx, fy - 62, 9, 16); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(bx + 2, fy - 68, 5, 6); }
      ctx.fillStyle = '#2d363b'; ctx.fillRect(x + w - 30, fy - 74, 22, 28); ctx.fillStyle = '#5a6a70'; ctx.fillRect(x + w - 22, fy - 82, 6, 10);
      break; }
    case 'bigtank': {
      const h = 186;
      ctx.fillStyle = '#20292e'; ctx.fillRect(x - 6, fy - 22, w + 12, 22); ctx.fillRect(x - 6, fy - h - 20, w + 12, 22);
      ctx.fillStyle = 'rgba(40,120,140,.28)'; ctx.fillRect(x, fy - h, w, h - 22);
      ctx.fillStyle = 'rgba(160,255,255,.12)'; ctx.fillRect(x + 8, fy - h, 8, h - 22); ctx.fillRect(x + w - 26, fy - h, 3, h - 22);
      for (let k = 0; k < 5; k++) { ctx.fillStyle = '#3a474e'; ctx.fillRect(x - 8 + k * (w + 4) / 4, fy - h - 20, 6, h + 20); }
      hazard(ctx, x - 6, fy - 22, w + 12, 6, 5);
      r.tank = { x: r.x0 + x + w / 2, y: r.y0 + fy - h / 2 - 10, w, h };
      break; }
    case 'hatch': {
      const cx = x + w / 2, cy = fy - 64;
      ctx.fillStyle = '#2d383e'; ctx.beginPath(); ctx.arc(cx, cy, 42, 0, TAU); ctx.fill();
      ctx.fillStyle = vgrad(ctx, cy - 34, cy + 34, [[0, '#7a8d96'], [1, '#3e4c53']]); ctx.beginPath(); ctx.arc(cx, cy, 34, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2a3237'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, TAU); ctx.stroke();
      for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + .4; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14); ctx.lineTo(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28); ctx.stroke(); }
      ctx.fillStyle = '#5fe39a'; ctx.fillRect(cx - 4, cy - 52, 8, 4);
      break; }
    case 'suitrack': {
      ctx.fillStyle = '#2d363b'; ctx.fillRect(x, fy - 120, w, 4); ctx.fillRect(x + 2, fy - 120, 3, 120); ctx.fillRect(x + w - 5, fy - 120, 3, 120);
      for (let k = 0; k < 2; k++) { const sx = x + 12 + k * 26; ctx.fillStyle = k ? '#b8692a' : '#8a5a2a'; rrect(ctx, sx, fy - 108, 18, 44, 6); ctx.fill(); ctx.fillStyle = '#6f828b'; ctx.beginPath(); ctx.arc(sx + 9, fy - 112, 8, 0, TAU); ctx.fill(); ctx.fillStyle = '#0b1a20'; ctx.fillRect(sx + 9, fy - 116, 7, 6); }
      break; }
    case 'podhatch': {
      const cx = x + w / 2, cy = fy - 70;
      ctx.fillStyle = '#20292e'; rrect(ctx, x - 6, fy - 140, w + 12, 140, 10); ctx.fill();
      ctx.fillStyle = vgrad(ctx, cy - 44, cy + 44, [[0, '#ffb03a'], [1, '#b0620e']]); ctx.beginPath(); ctx.ellipse(cx, cy, 30, 44, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#0b1a20'; ctx.beginPath(); ctx.ellipse(cx, cy - 8, 16, 18, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(95,231,255,.25)'; ctx.beginPath(); ctx.ellipse(cx - 4, cy - 12, 6, 8, -.3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ESCAPE', cx, fy - 120); ctx.textAlign = 'left';
      r.podPos = { x: r.x0 + cx, y: r.y0 + fy - 140 };
      break; }
    case 'body': {
      const col = rng.pick(['#b8692a', '#4a5a6a', '#c9c6bd']);
      ctx.fillStyle = 'rgba(80,10,15,.5)'; ctx.beginPath(); ctx.ellipse(x + 30, fy - 1, 34, 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = col; rrect(ctx, x + 8, fy - 16, 38, 14, 6); ctx.fill();
      ctx.fillStyle = mixHex(col, '#000000', .3); ctx.fillRect(x + 40, fy - 8, 20, 7); ctx.fillRect(x, fy - 10, 12, 6);
      ctx.fillStyle = '#c9a98a'; ctx.beginPath(); ctx.arc(x + 4, fy - 14, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(x + 3, fy - 17, 6, Math.PI, TAU); ctx.fill();
      break; }
    case 'moonpool': {
      ctx.fillStyle = '#2d383e'; ctx.fillRect(x - 6, fy - 112, 8, 112); ctx.fillRect(x + w - 2, fy - 112, 8, 112);
      ctx.fillStyle = '#3e4c53'; ctx.fillRect(x - 6, fy - 116, w + 12, 8);
      ctx.fillStyle = '#ffb03a'; for (let k = 0; k < 5; k++) ctx.fillRect(x + 10 + k * (w - 20) / 4, fy - 112, 6, 4);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.font = '900 12px "Rajdhani",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MOON POOL · DOCK 01', x + w / 2, fy - 126); ctx.textAlign = 'left';
      break; }
  }
}

/* ---------- 主角：魏子葳（橘色打撈潛水服） ---------- */
function fl(col, f) { return f > 0 ? mixHex(col, '#ffffff', f) : col; }
function drawDiver(ctx, p, t) {
  const f = p.flash || 0, face = p.face;
  ctx.save(); ctx.translate(p.x, p.y);
  if (p.climb) { drawDiverClimb(ctx, p, t, f); ctx.restore(); return; }
  const crouch = p.stealth ? .9 : 1;
  ctx.scale(face, crouch);
  const ph = p.walk, mv = p.moving ? 1 : 0;
  const bob = mv ? Math.abs(Math.sin(ph)) * 2 : Math.sin(t * 2) * .5;
  const rec = p.recoil || 0;
  ctx.translate(-rec * 3, -bob);
  // 影子
  ctx.save(); ctx.scale(1, 1 / crouch); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, bob + 1, 20, 4, 0, 0, TAU); ctx.fill(); ctx.restore();
  const suit = fl('#d9772e', f), suitD = fl('#9c4f19', f), dark = fl('#262c31', f), metal = fl('#8fa3ad', f), metalD = fl('#4f5f67', f);
  const leg = (sx, a, front) => {
    ctx.save(); ctx.translate(sx, -30);
    ctx.rotate(a);
    ctx.fillStyle = front ? suit : suitD; rrect(ctx, -5, 0, 10, 16, 4); ctx.fill();
    ctx.translate(0, 15); ctx.rotate(Math.max(0, -a) * 1.1 + .05);
    ctx.fillStyle = front ? suit : suitD; rrect(ctx, -4.5, -1, 9, 15, 4); ctx.fill();
    ctx.fillStyle = dark; rrect(ctx, -5, 11, 14, 6, 2.5); ctx.fill();
    ctx.restore();
  };
  const swing = mv ? Math.sin(ph) * .6 : 0;
  leg(-2, -swing, false);
  // 氣瓶
  ctx.fillStyle = metalD; rrect(ctx, -19, -58, 9, 30, 4); ctx.fill(); ctx.fillStyle = metal; rrect(ctx, -16, -60, 8, 31, 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-14, -57, 2, 24);
  ctx.fillStyle = fl('#c84a3a', f); ctx.fillRect(-17, -63, 7, 4);
  leg(3, swing, true);
  // 身體
  ctx.fillStyle = suit; rrect(ctx, -11, -56, 23, 30, 7); ctx.fill();
  ctx.fillStyle = suitD; rrect(ctx, -2, -52, 13, 16, 4); ctx.fill();
  ctx.fillStyle = fl('#e8e2d0', f); ctx.fillRect(1, -48, 7, 2); ctx.fillRect(1, -44, 5, 2);
  ctx.fillStyle = dark; ctx.fillRect(-11, -31, 23, 5);
  ctx.fillStyle = fl('#3e4a50', f); rrect(ctx, -9, -33, 8, 8, 2); ctx.fill();
  // 後手
  ctx.strokeStyle = suitD; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-2, -50); ctx.lineTo(8, -40); ctx.lineTo(18, -39); ctx.stroke();
  // 武器
  drawGun(ctx, p.gun || 'rivet', f, p.fireT);
  // 前手
  ctx.strokeStyle = suit; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(3, -51); ctx.lineTo(10, -42); ctx.lineTo(16, -37); ctx.stroke();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(17, -37, 4.5, 0, TAU); ctx.fill();
  // 頭盔
  const hx = 2, hy = -64;
  ctx.fillStyle = metalD; ctx.beginPath(); ctx.arc(hx, hy, 14.5, 0, TAU); ctx.fill();
  const hg = ctx.createRadialGradient(hx - 4, hy - 6, 2, hx, hy, 14); hg.addColorStop(0, fl('#c8d6dc', f)); hg.addColorStop(1, metal);
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, 13, 0, TAU); ctx.fill();
  ctx.fillStyle = fl('#0b1a20', f); rrect(ctx, hx + 2, hy - 7, 13, 12, 5); ctx.fill();
  const vis = p.stealth ? .45 : 1;
  ctx.fillStyle = `rgba(95,231,255,${.85 * vis})`; ctx.fillRect(hx + 5, hy - 3, 9, 2.5);
  ctx.fillStyle = `rgba(200,250,255,${.35 * vis})`; ctx.fillRect(hx + 4, hy - 6, 3, 2);
  ctx.fillStyle = metalD; for (let a = 0; a < 6; a++) { ctx.beginPath(); ctx.arc(hx + Math.cos(a + .5) * 11.5, hy + Math.sin(a + .5) * 11.5, 1.2, 0, TAU); ctx.fill(); }
  ctx.fillStyle = dark; ctx.fillRect(hx + 4, hy - 18, 9, 6);
  ctx.fillStyle = p.stealth ? '#7a6a3a' : '#ffe7a0'; ctx.fillRect(hx + 10, hy - 17, 4, 4);
  ctx.restore();
}
function drawGun(ctx, id, f, fireT) {
  const kick = fireT > 0 ? fireT * 10 : 0;
  ctx.save(); ctx.translate(-kick * .4, 0);
  const m = fl('#3a454b', f), m2 = fl('#5d6d75', f);
  if (id === 'harpoon') {
    ctx.fillStyle = m; ctx.fillRect(6, -42, 30, 8); ctx.fillStyle = m2; ctx.fillRect(10, -44, 22, 3);
    ctx.fillStyle = fl('#d8e2e6', f); ctx.fillRect(30, -39, 18, 2); ctx.beginPath(); ctx.moveTo(48, -42); ctx.lineTo(54, -38); ctx.lineTo(48, -35); ctx.fill();
  } else if (id === 'arc') {
    ctx.fillStyle = m; rrect(ctx, 6, -43, 26, 10, 3); ctx.fill(); ctx.fillStyle = fl('#7fe9ff', f); ctx.fillRect(12, -41, 14, 2);
    ctx.fillStyle = m2; ctx.fillRect(32, -41, 8, 6); ctx.strokeStyle = fl('#7fe9ff', f); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(40, -38); ctx.lineTo(44, -42); ctx.lineTo(42, -36); ctx.lineTo(47, -40); ctx.stroke();
  } else if (id === 'torch') {
    ctx.fillStyle = m; ctx.fillRect(6, -41, 22, 7); ctx.fillStyle = fl('#c84a3a', f); rrect(ctx, 4, -50, 9, 12, 3); ctx.fill(); ctx.fillStyle = m2; ctx.fillRect(28, -40, 12, 4); ctx.fillStyle = '#ffb47a'; ctx.fillRect(40, -40, 3, 4);
  } else if (id === 'sonic') {
    ctx.fillStyle = m; rrect(ctx, 6, -45, 24, 13, 4); ctx.fill(); ctx.fillStyle = fl('#ffa36b', f); ctx.beginPath(); ctx.moveTo(30, -46); ctx.lineTo(42, -50); ctx.lineTo(42, -28); ctx.lineTo(30, -32); ctx.fill();
  } else {
    ctx.fillStyle = m; rrect(ctx, 6, -43, 28, 9, 3); ctx.fill(); ctx.fillStyle = m2; ctx.fillRect(9, -45, 18, 3);
    ctx.fillStyle = fl('#ffcf7a', f); ctx.fillRect(12, -36, 6, 6); ctx.fillStyle = m; ctx.fillRect(34, -41, 11, 4);
  }
  ctx.restore();
}
function drawDiverClimb(ctx, p, t, f) {
  const ph = p.walk, s = Math.sin(ph);
  const suit = fl('#d9772e', f), suitD = fl('#9c4f19', f), metal = fl('#8fa3ad', f), dark = fl('#262c31', f);
  ctx.strokeStyle = suitD; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-5, -30); ctx.lineTo(-7, -16 + s * 6); ctx.lineTo(-6, -2 + s * 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -30); ctx.lineTo(7, -16 - s * 6); ctx.lineTo(6, -2 - s * 6); ctx.stroke();
  ctx.fillStyle = suit; rrect(ctx, -11, -56, 22, 30, 7); ctx.fill();
  ctx.fillStyle = metal; rrect(ctx, -9, -58, 8, 28, 4); ctx.fill(); rrect(ctx, 1, -58, 8, 28, 4); ctx.fill();
  ctx.strokeStyle = suit; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-9, -52); ctx.lineTo(-13, -64 - s * 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9, -52); ctx.lineTo(13, -64 + s * 6); ctx.stroke();
  ctx.fillStyle = metal; ctx.beginPath(); ctx.arc(0, -64, 13, 0, TAU); ctx.fill();
  ctx.fillStyle = dark; ctx.fillRect(-4, -78, 8, 5);
}

/* ---------- 獵手「聆」 ---------- */
function hunterCol(st) { return st === 'hunt' || st === 'attack' ? '#ff3b4e' : st === 'alert' ? '#ffb03a' : st === 'stun' ? '#ffffff' : st === 'flee' ? '#b47cff' : '#5fe7ff'; }
function drawHunter(ctx, h, t, scale = 1, mother = false, sil = false) {
  const f = sil ? 0 : (h.flash || 0);
  ctx.save(); ctx.translate(h.x, h.y); ctx.scale(h.face * scale, scale);
  const glow = hunterCol(h.state);
  const ph = h.walk, mv = h.moving ? 1 : 0;
  // sil：光照之後再疊一次的暗色剪影（只留發光的頭盤與背脊）
  const body = sil ? '#05080b' : fl(mother ? '#7d8f9c' : '#33414d', f), body2 = sil ? '#0a1015' : fl(mother ? '#a9bac4' : '#4a5c6a', f), belly = sil ? '#0c1319' : fl(mother ? '#d6e2e8' : '#7d8d99', f), dark = sil ? '#020304' : fl('#141b21', f);
  if (!sil) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(0, 2, 46, 6, 0, 0, TAU); ctx.fill(); }
  const atk = h.atkPose || 0;
  // 後腿與後臂
  const legF = (sx, a, c) => {
    ctx.save(); ctx.translate(sx, -78); ctx.rotate(a * .55 + .25);
    ctx.fillStyle = c; rrect(ctx, -5, 0, 10, 40, 5); ctx.fill();
    ctx.translate(0, 38); ctx.rotate(-.9 - a * .2);
    rrect(ctx, -4, 0, 8, 34, 4); ctx.fill();
    ctx.translate(0, 32); ctx.rotate(.65 + a * .1);
    rrect(ctx, -3, 0, 6, 16, 3); ctx.fill();
    ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-2, 14); ctx.lineTo(16, 18); ctx.lineTo(-4, 20); ctx.fill();
    ctx.restore();
  };
  const sw = mv ? Math.sin(ph) : 0;
  legF(-10, -sw, mixHex(body, '#000000', .3));
  const arm = (sx, sy, a, c, front) => {
    ctx.save(); ctx.translate(sx, sy);
    const lift = front ? atk : atk * .4;
    ctx.rotate(.5 + a * .35 - lift * 2.1);
    ctx.fillStyle = c; rrect(ctx, -4, 0, 8, 48, 4); ctx.fill();
    ctx.translate(0, 46); ctx.rotate(-.35 - lift * .6);
    rrect(ctx, -3, 0, 6, 46, 3); ctx.fill();
    ctx.translate(0, 44);
    ctx.strokeStyle = sil ? '#141c22' : fl('#c9d4d9', f); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(k * 6 + 6, 10, k * 4 + 14, 6); ctx.stroke(); }
    ctx.restore();
  };
  arm(10, -122, sw, mixHex(body, '#000000', .3), false);
  // 身體（前傾）
  ctx.save(); ctx.translate(0, -80); ctx.rotate(-.55);
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, -26, 20, 40, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(8, -22, 10, 30, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = body2; ctx.beginPath(); ctx.ellipse(-8, -30, 9, 30, 0, 0, TAU); ctx.fill();
  // 背脊發光點
  for (let k = 0; k < 7; k++) { const a = .5 + .5 * Math.sin(t * 3 + k); ctx.fillStyle = rgba(glow, .35 + .5 * a); ctx.beginPath(); ctx.arc(-17 + k * .5, -56 + k * 10, 2.4, 0, TAU); ctx.fill(); }
  ctx.restore();
  legF(8, sw, body);
  // 脖子與頭盤
  const hx = 30, hy = -142 + (h.state === 'search' ? Math.sin(t * 1.4) * 3 : 0);
  ctx.strokeStyle = body; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(12, -128); ctx.quadraticCurveTo(24, -142, hx - 4, hy + 4); ctx.stroke();
  const turn = h.turn || 0; // -1..1 頭盤轉向
  const rx = 10 + 26 * Math.abs(Math.cos(turn * 1.2)), ry = 36;
  ctx.save(); ctx.translate(hx, hy);
  ctx.fillStyle = mixHex(body, '#000000', .25); ctx.beginPath(); ctx.ellipse(-3, 0, rx + 3, ry + 3, 0, 0, TAU); ctx.fill();
  const dg = ctx.createRadialGradient(0, 0, 2, 0, 0, ry); dg.addColorStop(0, '#05080a'); dg.addColorStop(.45, sil ? '#070b0e' : fl('#1c252c', f)); dg.addColorStop(1, body2);
  ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
  if (sil) { ctx.strokeStyle = 'rgba(170,215,230,.16)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, rx + 1, ry + 1, 0, -2.2, -.6); ctx.stroke(); }
  const pulse = h.state === 'hunt' || h.state === 'attack' ? .7 + .3 * Math.sin(t * 14) : .55 + .25 * Math.sin(t * 2.5);
  ctx.lineWidth = 2.2;
  for (let k = 1; k <= 3; k++) { ctx.strokeStyle = rgba(glow, Math.min(1, pulse * (.25 + k * .2) * (sil ? 1.8 : 1))); ctx.beginPath(); ctx.ellipse(0, 0, rx * k / 3.4, ry * k / 3.4, 0, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = rgba(glow, .9 * pulse); ctx.beginPath(); ctx.ellipse(0, 0, Math.max(2, rx * .12), 4, 0, 0, TAU); ctx.fill();
  ctx.restore();
  // 嘴（尖嘯時張開）
  const mo = h.mouth || 0;
  ctx.fillStyle = '#05080a'; ctx.beginPath(); ctx.ellipse(hx + 4, hy + ry + 4, 5, 3 + mo * 9, 0, 0, TAU); ctx.fill();
  if (mo > .2) { ctx.fillStyle = rgba(glow, .5 * mo); ctx.beginPath(); ctx.ellipse(hx + 4, hy + ry + 4, 3, mo * 6, 0, 0, TAU); ctx.fill(); }
  arm(16, -124, -sw, body, true);
  ctx.restore();
}

/* ---------- 小型敵人 ---------- */
function drawFoe(ctx, e, t) {
  const f = e.flash || 0;
  ctx.save(); ctx.translate(e.x, e.y);
  const sc = e.elite ? 1.32 : 1;
  if (e.elite) { const g = ctx.createRadialGradient(0, -e.def.h * .5, 4, 0, -e.def.h * .5, 46); g.addColorStop(0, 'rgba(255,60,90,.35)'); g.addColorStop(1, 'rgba(255,60,90,0)'); ctx.fillStyle = g; ctx.fillRect(-50, -e.def.h - 40, 100, e.def.h + 50); }
  ctx.scale(e.face * sc, sc);
  if (e.frozen > 0) ctx.globalAlpha = .9;
  switch (e.type) {
    case 'iso': drawIso(ctx, e, t, f); break;
    case 'jelly': drawJelly(ctx, e, t, f); break;
    case 'crab': drawCrab(ctx, e, t, f); break;
    case 'eel': drawEel(ctx, e, t, f); break;
    case 'husk': drawHusk(ctx, e, t, f); break;
  }
  ctx.globalAlpha = 1;
  if (e.slow > 0 || e.frozen > 0) { ctx.fillStyle = e.frozen > 0 ? 'rgba(190,235,255,.55)' : 'rgba(170,220,255,.22)'; ctx.beginPath(); ctx.ellipse(0, -e.def.h * .45, e.def.r + 6, e.def.h * .6, 0, 0, TAU); ctx.fill(); }
  if (e.burn > 0) { for (let k = 0; k < 3; k++) { ctx.fillStyle = `rgba(255,${120 + k * 40},40,${.5 - k * .12})`; ctx.beginPath(); ctx.ellipse(Math.sin(t * 9 + k * 2) * 6, -e.def.h * .6 - k * 6 - (t * 30 + k * 7) % 12, 5 - k, 8 - k * 2, 0, 0, TAU); ctx.fill(); } }
  ctx.restore();
}
function drawIso(ctx, e, t, f) {
  const ph = e.walk, rear = e.wind > 0 ? Math.min(1, e.windT / e.def.wind) : 0;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 1, 22, 3.5, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.rotate(-rear * .35);
  ctx.strokeStyle = fl('#2a2733', f); ctx.lineWidth = 2;
  for (let k = 0; k < 6; k++) { const lx = -14 + k * 5.6, sw = Math.sin(ph + k * 1.1) * 3; ctx.beginPath(); ctx.moveTo(lx, -8); ctx.lineTo(lx + sw - 2, -2); ctx.lineTo(lx + sw, 0); ctx.stroke(); }
  const cols = ['#4e4a63', '#57526e', '#605a79', '#6a6385', '#5a5470'];
  for (let k = 0; k < 5; k++) { ctx.fillStyle = fl(cols[k], f); ctx.beginPath(); ctx.ellipse(-14 + k * 7, -11, 8, 9 - Math.abs(k - 2) * .6, 0, Math.PI, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(-19 + k * 7, -18, 7, 1.5); }
  ctx.fillStyle = fl('#3d394d', f); ctx.beginPath(); ctx.ellipse(18, -9, 6, 6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd25a'; ctx.beginPath(); ctx.arc(21, -10, 1.8, 0, TAU); ctx.fill();
  ctx.strokeStyle = fl('#6a6385', f); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(22, -12); ctx.quadraticCurveTo(30, -20 - Math.sin(t * 6) * 3, 34, -14); ctx.moveTo(21, -13); ctx.quadraticCurveTo(26, -24, 31, -22 + Math.sin(t * 5) * 2); ctx.stroke();
  ctx.restore();
}
function drawJelly(ctx, e, t, f) {
  const fuse = e.fuseT > 0 ? e.fuseT / e.def.fuse : 0;
  const sw = 1 + fuse * .5 + Math.sin(t * 3 + e.seed) * .06;
  const y0 = -24 + Math.sin(t * 2 + e.seed) * 4;
  ctx.save(); ctx.translate(0, y0);
  ctx.strokeStyle = 'rgba(140,200,255,.45)'; ctx.lineWidth = 1.5;
  for (let k = 0; k < 5; k++) { const x = -10 + k * 5; ctx.beginPath(); ctx.moveTo(x, 4); for (let j = 1; j <= 5; j++) ctx.lineTo(x + Math.sin(t * 3 + j * .8 + k) * 3, 4 + j * 6); ctx.stroke(); }
  const flashOn = fuse > 0 && Math.sin(t * 40) > 0;
  const g = ctx.createRadialGradient(0, -2, 1, 0, 0, 20 * sw);
  g.addColorStop(0, flashOn ? '#ffffff' : fl('#bff8ff', f)); g.addColorStop(.5, flashOn ? 'rgba(255,90,100,.8)' : 'rgba(80,190,255,.65)'); g.addColorStop(1, 'rgba(60,90,200,.12)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 19 * sw, 15 * sw, 0, Math.PI, TAU); ctx.quadraticCurveTo(0, 8 * sw, -19 * sw, 0); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-6, -7, 5, 3, -.4, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawCrab(ctx, e, t, f) {
  const ph = e.walk, snap = e.wind > 0 ? Math.min(1, e.windT / e.def.wind) : 0;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 1, 32, 4, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = fl('#5a2a22', f); ctx.lineWidth = 3;
  for (let k = 0; k < 3; k++) for (const s of [-1, 1]) { const sw = Math.sin(ph + k + (s > 0 ? 1.5 : 0)) * 3; ctx.beginPath(); ctx.moveTo(s * (8 + k * 6), -14); ctx.lineTo(s * (20 + k * 6) + sw, -20); ctx.lineTo(s * (24 + k * 6) + sw, 0); ctx.stroke(); }
  const g = ctx.createLinearGradient(0, -38, 0, -10); g.addColorStop(0, fl('#b5543e', f)); g.addColorStop(1, fl('#5e261c', f));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -16, 30, 18, 0, Math.PI, TAU); ctx.quadraticCurveTo(0, -6, -30, -16); ctx.fill();
  ctx.fillStyle = fl('#d1735a', f); for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 10 - 4, -30 + Math.abs(k) * 3); ctx.lineTo(k * 10, -38 + Math.abs(k) * 4); ctx.lineTo(k * 10 + 4, -30 + Math.abs(k) * 3); ctx.fill(); }
  ctx.strokeStyle = fl('#7a3428', f); ctx.lineWidth = 2; for (const s of [-4, 6]) { ctx.beginPath(); ctx.moveTo(14 + s * .3, -28); ctx.lineTo(18 + s, -40); ctx.stroke(); ctx.fillStyle = '#ffd25a'; ctx.beginPath(); ctx.arc(18 + s, -41, 2.2, 0, TAU); ctx.fill(); }
  ctx.save(); ctx.translate(26, -18); ctx.rotate(-.3 - snap * .5);
  ctx.fillStyle = fl('#9a4433', f); rrect(ctx, 0, -6, 18, 12, 5); ctx.fill();
  ctx.fillStyle = fl('#c25a43', f); ctx.beginPath(); ctx.moveTo(16, -8); ctx.quadraticCurveTo(34, -14 - snap * 6, 32, -2); ctx.lineTo(18, -1); ctx.fill();
  ctx.beginPath(); ctx.moveTo(16, 6); ctx.quadraticCurveTo(32, 10 + snap * 6, 30, 1); ctx.lineTo(18, 2); ctx.fill();
  ctx.restore();
}
function drawEel(ctx, e, t, f) {
  const L = 110, n = 12, lunge = e.lungeT > 0 ? 1 : 0;
  const pts = [];
  for (let k = 0; k <= n; k++) { const u = k / n; pts.push([24 - u * L, -14 + Math.sin(t * 7 + u * 6 + e.seed) * (5 + u * 6) * (lunge ? .4 : 1)]); }
  for (let k = 0; k < n; k++) {
    const [x1, y1] = pts[k], [x2, y2] = pts[k + 1], w = 11 * (1 - k / n * .8);
    ctx.strokeStyle = fl(k % 2 ? '#1e3b45' : '#24464f', f); ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (k % 2 === 0) { ctx.fillStyle = 'rgba(109,255,176,.75)'; ctx.beginPath(); ctx.arc((x1 + x2) / 2, (y1 + y2) / 2 - w * .25, 1.6, 0, TAU); ctx.fill(); }
  }
  const op = e.wind > 0 || lunge ? 1 : .2;
  ctx.fillStyle = fl('#2b525c', f); ctx.beginPath(); ctx.moveTo(18, -20); ctx.lineTo(38, -16 - op * 5); ctx.lineTo(26, -14); ctx.lineTo(38, -12 + op * 5); ctx.lineTo(18, -8); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(24, -18, 1.8, 0, TAU); ctx.fill();
}
function drawHusk(ctx, e, t, f) {
  const ph = e.walk, sh = e.shoutT > 0 ? 1 : 0;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 1, 16, 3.5, 0, 0, TAU); ctx.fill();
  const suit = fl('#5b6b5e', f), suitD = fl('#3e4a40', f);
  const sw = Math.sin(ph) * .5;
  ctx.strokeStyle = suitD; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-3, -30); ctx.lineTo(-5 - sw * 8, -14); ctx.lineTo(-4 - sw * 6, 0); ctx.stroke();
  ctx.strokeStyle = suit; ctx.beginPath(); ctx.moveTo(3, -30); ctx.lineTo(5 + sw * 8, -14); ctx.lineTo(6 + sw * 6, 0); ctx.stroke();
  ctx.save(); ctx.translate(0, -30); ctx.rotate(.35 - sh * .5);
  ctx.fillStyle = suit; rrect(ctx, -11, -28, 22, 30, 7); ctx.fill();
  ctx.fillStyle = '#b6ff6d'; for (const [bx, by, br] of [[-9, -24, 4], [-12, -16, 3], [-6, -30, 3]]) { ctx.globalAlpha = .6 + .4 * Math.sin(t * 4 + bx); ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = suit; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(6, -22); ctx.quadraticCurveTo(16, -6, 12 + Math.sin(t * 2) * 2, 12); ctx.stroke();
  ctx.fillStyle = fl('#6f7d73', f); ctx.beginPath(); ctx.arc(4, -34, 12, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0b1210'; rrect(ctx, 5, -40, 11, 10, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(182,255,109,.7)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(8, -38); ctx.lineTo(13, -33); ctx.lineTo(10, -30); ctx.stroke();
  ctx.strokeStyle = '#4e5c43'; ctx.lineWidth = 2;
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(2 + k * 3, -44); ctx.quadraticCurveTo(k * 6 - 6, -56 - k * 2, k * 5 - 10 + Math.sin(t * 2 + k) * 3, -60); ctx.stroke(); }
  if (sh) { ctx.fillStyle = 'rgba(255,90,100,.5)'; ctx.beginPath(); ctx.arc(10, -35, 3 + Math.sin(t * 30) * 1.5, 0, TAU); ctx.fill(); }
  ctx.restore();
}

/* ---------- 生還者、林汐、Y-01 ---------- */
function drawSurvivor(ctx, s, t) {
  const hue = s.hue || 200, col = `hsl(${hue},28%,46%)`, colD = `hsl(${hue},28%,30%)`;
  ctx.save(); ctx.translate(s.x, s.y);
  if (s.state === 'gone') { ctx.restore(); return; }
  ctx.globalAlpha = s.state === 'leave' ? clamp(1 - s.t / 1.2, 0, 1) : 1;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 1, 16, 3.5, 0, 0, TAU); ctx.fill();
  if (s.state === 'hide') {
    const sh = Math.sin(t * 9) * .6;
    ctx.translate(sh, 0);
    ctx.fillStyle = colD; rrect(ctx, -12, -18, 24, 18, 7); ctx.fill();
    ctx.fillStyle = col; rrect(ctx, -10, -40, 20, 26, 8); ctx.fill();
    ctx.fillStyle = '#d8b494'; ctx.beginPath(); ctx.arc(2, -46, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.arc(1, -49, 8, Math.PI * .9, TAU * 1.02); ctx.fill();
    ctx.fillStyle = '#d8b494'; ctx.beginPath(); ctx.arc(7, -43, 3.5, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = colD; ctx.fillRect(-7, -30, 6, 30); ctx.fillRect(1, -30, 6, 30);
    ctx.fillStyle = col; rrect(ctx, -10, -56, 20, 28, 7); ctx.fill();
    ctx.fillStyle = '#d8b494'; ctx.beginPath(); ctx.arc(0, -63, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.arc(-1, -66, 8, Math.PI * .9, TAU * 1.02); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(6, -52); ctx.lineTo(14, -60 - Math.sin(t * 8) * 4); ctx.stroke();
  }
  ctx.restore();
}
function drawLin(ctx, x, y, t, standing) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 1, 18, 3.5, 0, 0, TAU); ctx.fill();
  if (!standing) {
    ctx.fillStyle = '#3a4a5a'; rrect(ctx, -14, -20, 28, 20, 8); ctx.fill();
    ctx.fillStyle = '#c9d4d9'; rrect(ctx, -11, -44, 22, 28, 8); ctx.fill();
    ctx.fillStyle = '#e0c0a0'; ctx.beginPath(); ctx.arc(-1, -51, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1614'; ctx.beginPath(); ctx.moveTo(-10, -52); ctx.quadraticCurveTo(-2, -66, 8, -52); ctx.lineTo(9, -34); ctx.lineTo(4, -40); ctx.lineTo(4, -50); ctx.fill();
    ctx.fillStyle = '#20292e'; ctx.fillRect(4, -56, 5, 8); ctx.strokeStyle = '#20292e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-1, -52, 10, -2.8, -.5); ctx.stroke();
    ctx.fillStyle = '#e0c0a0'; ctx.beginPath(); ctx.arc(8, -22, 4, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = '#3a4a5a'; ctx.fillRect(-7, -30, 6, 30); ctx.fillRect(1, -30, 6, 30);
    ctx.fillStyle = '#c9d4d9'; rrect(ctx, -10, -58, 20, 30, 7); ctx.fill();
    ctx.fillStyle = '#e0c0a0'; ctx.beginPath(); ctx.arc(0, -65, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1614'; ctx.beginPath(); ctx.moveTo(-9, -66); ctx.quadraticCurveTo(0, -80, 9, -66); ctx.lineTo(10, -46); ctx.lineTo(5, -52); ctx.lineTo(5, -64); ctx.fill();
  }
  ctx.restore();
}
function drawYi(ctx, x, y, t, a = 1) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 1.3) * 5); ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 60); g.addColorStop(0, 'rgba(95,231,255,.35)'); g.addColorStop(1, 'rgba(95,231,255,0)'); ctx.fillStyle = g; ctx.fillRect(-60, -60, 120, 120);
  ctx.fillStyle = '#4a5c6a'; ctx.beginPath(); ctx.ellipse(-6, 10, 10, 18, .6, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#4a5c6a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, 20); ctx.quadraticCurveTo(-24, 30 + Math.sin(t * 2) * 4, -30, 18); ctx.stroke();
  ctx.fillStyle = '#1c252c'; ctx.beginPath(); ctx.ellipse(6, -10, 12, 15, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = `rgba(95,231,255,${.5 + .3 * Math.sin(t * 2.2)})`; ctx.lineWidth = 1.5;
  for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(6, -10, 12 * k / 3.4, 15 * k / 3.4, 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
}

/* ---------- 掉落物 ---------- */
function drawItem(ctx, it, t) {
  ctx.save(); ctx.translate(it.x, it.y + (it.ground ? Math.sin(t * 3 + it.seed) * 2 - 6 : 0));
  const col = RAR[it.rar || 0].col;
  if (it.rar >= 3 && it.ground) { const g = ctx.createLinearGradient(0, -140, 0, 0); g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, .4)); ctx.fillStyle = g; ctx.fillRect(-6, -140, 12, 140); }
  switch (it.kind) {
    case 'loot': ctx.fillStyle = '#2a343a'; rrect(ctx, -9, -8, 18, 13, 3); ctx.fill(); ctx.fillStyle = col; ctx.fillRect(-9, -4, 18, 3); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-7, -7, 6, 2); break;
    case 'key': ctx.fillStyle = '#ff4f5e'; rrect(ctx, -9, -7, 18, 12, 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-6, -4, 7, 2); ctx.fillStyle = '#ffd25a'; ctx.fillRect(3, -3, 4, 4); break;
    case 'battery': ctx.fillStyle = '#ffcf3a'; rrect(ctx, -6, -11, 12, 18, 2); ctx.fill(); ctx.fillStyle = '#4a3a10'; ctx.fillRect(-2, -14, 4, 3); ctx.fillStyle = '#4a3a10'; ctx.fillRect(-1, -7, 2, 8); ctx.fillRect(-4, -4, 8, 2); break;
    case 'med': ctx.fillStyle = '#eef2f0'; rrect(ctx, -9, -8, 18, 14, 3); ctx.fill(); ctx.fillStyle = '#ff4f5e'; ctx.fillRect(-2, -6, 4, 10); ctx.fillRect(-6, -2, 12, 3); break;
    case 'decoy': ctx.fillStyle = '#5d6d75'; rrect(ctx, -5, -12, 10, 16, 3); ctx.fill(); ctx.fillStyle = '#ffcf3a'; ctx.fillRect(-5, -6, 10, 3); ctx.strokeStyle = '#8fa3ad'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -18); ctx.stroke(); break;
    case 'orb': { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 7); g.addColorStop(0, '#e9fdff'); g.addColorStop(.4, '#5fe7ff'); g.addColorStop(1, 'rgba(95,231,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); break; }
  }
  ctx.restore();
}

/* ---------- 介面圖示（畫在小畫布上） ---------- */
function iconCanvas(size, fn) { const c = makeCanvas(size, size), x = c.getContext('2d'); x.scale(size / 64, size / 64); fn(x); return c; }
function drawWeaponIcon(x, id) {
  const col = WEAPONS[id] ? WEAPONS[id].col : '#fff';
  x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0, 0, 64, 64);
  x.save(); x.translate(32, 34);
  x.shadowColor = col; x.shadowBlur = 8;
  x.fillStyle = '#3a454b'; x.strokeStyle = col; x.lineWidth = 2;
  if (id === 'rivet') { rrect(x, -22, -8, 34, 12, 3); x.fill(); x.stroke(); x.fillRect(12, -5, 12, 5); x.fillStyle = col; x.fillRect(-14, 4, 8, 10); for (let k = 0; k < 3; k++) x.fillRect(16 + k * 5, -14, 2, 6); }
  else if (id === 'arc') { x.beginPath(); x.moveTo(-6, -20); x.lineTo(-14, 2); x.lineTo(-2, 2); x.lineTo(-8, 22); x.lineTo(12, -4); x.lineTo(0, -4); x.lineTo(6, -20); x.closePath(); x.fillStyle = col; x.fill(); }
  else if (id === 'harpoon') { x.rotate(-.5); x.fillStyle = col; x.fillRect(-24, -2, 40, 4); x.beginPath(); x.moveTo(16, -7); x.lineTo(28, 0); x.lineTo(16, 7); x.fill(); x.fillRect(-24, -6, 6, 12); }
  else if (id === 'sonic') { x.strokeStyle = col; x.lineWidth = 3; for (let k = 1; k <= 3; k++) { x.beginPath(); x.arc(-10, 0, k * 8, -.9, .9); x.stroke(); } x.fillStyle = col; x.beginPath(); x.arc(-12, 0, 5, 0, TAU); x.fill(); }
  else if (id === 'torch') { x.fillStyle = col; x.beginPath(); x.moveTo(-18, 4); x.quadraticCurveTo(0, -24, 16, -2); x.quadraticCurveTo(6, -6, 4, 10); x.quadraticCurveTo(-4, 2, -18, 4); x.fill(); x.fillStyle = '#ffe1a0'; x.beginPath(); x.ellipse(0, 0, 6, 8, .4, 0, TAU); x.fill(); }
  else if (id === 'drone') { x.fillStyle = col; rrect(x, -10, -4, 20, 9, 4); x.fill(); x.fillRect(-20, -8, 12, 3); x.fillRect(8, -8, 12, 3); x.fillStyle = '#0b1a20'; x.beginPath(); x.arc(0, 2, 3, 0, TAU); x.fill(); }
  else if (id === 'cryo') { x.strokeStyle = col; x.lineWidth = 3; for (let k = 0; k < 3; k++) { x.save(); x.rotate(k * Math.PI / 3); x.beginPath(); x.moveTo(-18, 0); x.lineTo(18, 0); x.moveTo(12, -5); x.lineTo(16, 0); x.lineTo(12, 5); x.moveTo(-12, -5); x.lineTo(-16, 0); x.lineTo(-12, 5); x.stroke(); x.restore(); } }
  x.restore();
}
const PICON = {
  quiet: x => { x.strokeStyle = '#5fe7ff'; x.lineWidth = 3; x.beginPath(); x.moveTo(14, 26); x.lineTo(22, 26); x.lineTo(32, 16); x.lineTo(32, 48); x.lineTo(22, 38); x.lineTo(14, 38); x.closePath(); x.stroke(); x.beginPath(); x.moveTo(40, 24); x.lineTo(52, 40); x.moveTo(52, 24); x.lineTo(40, 40); x.stroke(); },
  hull: x => { x.strokeStyle = '#ff8a6a'; x.lineWidth = 3; x.beginPath(); x.moveTo(32, 12); x.lineTo(50, 20); x.lineTo(48, 38); x.lineTo(32, 52); x.lineTo(16, 38); x.lineTo(14, 20); x.closePath(); x.stroke(); x.fillStyle = '#ff8a6a'; x.fillRect(29, 24, 6, 18); x.fillRect(24, 30, 16, 6); },
  regen: x => { x.strokeStyle = '#5fe39a'; x.lineWidth = 3; x.beginPath(); x.arc(32, 32, 16, -.5, 4.6); x.stroke(); x.beginPath(); x.moveTo(44, 18); x.lineTo(46, 26); x.lineTo(38, 26); x.stroke(); x.fillStyle = '#5fe39a'; x.fillRect(29, 24, 6, 16); x.fillRect(24, 29, 16, 6); },
  fins: x => { x.fillStyle = '#7fd0ff'; x.beginPath(); x.moveTo(12, 44); x.quadraticCurveTo(30, 10, 52, 18); x.quadraticCurveTo(36, 26, 34, 48); x.closePath(); x.fill(); },
  welder: x => { x.fillStyle = '#ffb03a'; x.fillRect(16, 30, 24, 8); x.fillRect(38, 26, 8, 16); x.strokeStyle = '#ffe1a0'; x.lineWidth = 2; for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(48, 34); x.lineTo(52 + Math.cos(k) * 8, 34 + Math.sin(k * 1.7) * 9); x.stroke(); } },
  scan: x => { x.strokeStyle = '#5fe7ff'; x.lineWidth = 3; x.beginPath(); x.arc(28, 28, 12, 0, TAU); x.stroke(); x.beginPath(); x.moveTo(37, 37); x.lineTo(50, 50); x.stroke(); },
  magnet: x => { x.strokeStyle = '#b47cff'; x.lineWidth = 7; x.beginPath(); x.arc(32, 28, 12, Math.PI, 0); x.stroke(); x.beginPath(); x.moveTo(20, 28); x.lineTo(20, 44); x.moveTo(44, 28); x.lineTo(44, 44); x.stroke(); x.fillStyle = '#fff'; x.fillRect(16, 42, 8, 6); x.fillRect(40, 42, 8, 6); },
  conduct: x => { x.fillStyle = '#7fe9ff'; x.beginPath(); x.moveTo(34, 10); x.lineTo(20, 34); x.lineTo(30, 34); x.lineTo(26, 54); x.lineTo(44, 28); x.lineTo(34, 28); x.lineTo(40, 10); x.fill(); x.fillStyle = 'rgba(95,180,255,.5)'; x.fillRect(10, 50, 44, 4); },
  ballistic: x => { x.strokeStyle = '#ffc845'; x.lineWidth = 3; x.beginPath(); x.arc(32, 32, 16, 0, TAU); x.stroke(); x.beginPath(); x.arc(32, 32, 6, 0, TAU); x.stroke(); x.beginPath(); x.moveTo(32, 8); x.lineTo(32, 18); x.moveTo(32, 46); x.lineTo(32, 56); x.moveTo(8, 32); x.lineTo(18, 32); x.moveTo(46, 32); x.lineTo(56, 32); x.stroke(); },
  adren: x => { x.strokeStyle = '#ff4f5e'; x.lineWidth = 3; x.beginPath(); x.moveTo(8, 34); x.lineTo(20, 34); x.lineTo(26, 20); x.lineTo(34, 48); x.lineTo(40, 30); x.lineTo(56, 30); x.stroke(); },
  heal: x => { x.fillStyle = '#5fe39a'; x.fillRect(27, 14, 10, 36); x.fillRect(14, 27, 36, 10); },
  credits: x => { x.fillStyle = '#ffc845'; x.beginPath(); x.arc(32, 32, 16, 0, TAU); x.fill(); x.fillStyle = '#5a4210'; x.font = '900 20px sans-serif'; x.textAlign = 'center'; x.fillText('¤', 32, 39); },
  armor: x => { x.fillStyle = '#8fa3ad'; x.beginPath(); x.moveTo(32, 10); x.lineTo(52, 18); x.lineTo(50, 36); x.lineTo(32, 54); x.lineTo(14, 36); x.lineTo(12, 18); x.closePath(); x.fill(); x.fillStyle = '#2a343a'; x.fillRect(30, 18, 4, 28); },
  med: x => { x.fillStyle = '#eef2f0'; rrect(x, 12, 18, 40, 30, 5); x.fill(); x.fillStyle = '#ff4f5e'; x.fillRect(28, 22, 8, 22); x.fillRect(21, 29, 22, 8); },
  decoy: x => { x.fillStyle = '#8fa3ad'; rrect(x, 24, 20, 16, 30, 4); x.fill(); x.fillStyle = '#ffcf3a'; x.fillRect(24, 30, 16, 5); x.strokeStyle = '#ffcf3a'; x.lineWidth = 2.5; for (let k = 1; k <= 2; k++) { x.beginPath(); x.arc(32, 16, k * 7, -2.4, -.7); x.stroke(); } },
  reroll: x => { x.strokeStyle = '#5fe7ff'; x.lineWidth = 3.5; x.beginPath(); x.arc(32, 32, 15, .3, 5.2); x.stroke(); x.beginPath(); x.moveTo(46, 14); x.lineTo(47, 24); x.lineTo(37, 24); x.stroke(); },
  battery: x => { x.fillStyle = '#ffcf3a'; rrect(x, 20, 16, 24, 36, 4); x.fill(); x.fillStyle = '#4a3a10'; x.fillRect(27, 12, 10, 5); x.fillRect(30, 26, 4, 16); x.fillRect(24, 32, 16, 4); },
};
function drawPassiveIcon(x, id) { (PICON[id] || PICON.heal)(x); }
function drawRelicIcon(x, id) {
  x.save(); x.translate(32, 32); x.fillStyle = '#c9d4d9'; x.strokeStyle = '#c9d4d9'; x.lineWidth = 3;
  const R = {
    earplug: () => { x.fillStyle = '#ffb03a'; rrect(x, -18, -6, 14, 18, 6); x.fill(); rrect(x, 4, -10, 14, 18, 6); x.fill(); x.fillStyle = '#8a1c24'; x.beginPath(); x.arc(-8, 10, 3, 0, TAU); x.fill(); },
    knob: () => { x.beginPath(); x.arc(0, 0, 18, 0, TAU); x.fill(); x.fillStyle = '#2a343a'; x.fillRect(-3, -18, 6, 18); x.font = '700 10px sans-serif'; x.fillStyle = '#2a343a'; x.fillText('OFF', -10, 14); },
    watch: () => { x.fillStyle = '#d8c070'; x.beginPath(); x.arc(0, 4, 17, 0, TAU); x.fill(); x.fillStyle = '#f2ecd8'; x.beginPath(); x.arc(0, 4, 13, 0, TAU); x.fill(); x.strokeStyle = '#2a2a2a'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 4); x.lineTo(5, -4); x.moveTo(0, 4); x.lineTo(-6, 6); x.stroke(); x.strokeStyle = '#d8c070'; x.beginPath(); x.arc(0, -16, 5, 0, TAU); x.stroke(); },
    wrench: () => { x.rotate(.7); x.fillRect(-4, -20, 8, 34); x.beginPath(); x.arc(0, -20, 10, 0, TAU); x.fill(); x.fillStyle = '#071820'; x.fillRect(-4, -32, 8, 12); x.fillStyle = '#5a4a3a'; x.fillRect(-5, 0, 10, 14); },
    pumpcap: () => { x.fillStyle = '#7a8d96'; x.beginPath(); x.arc(0, 0, 20, 0, TAU); x.fill(); x.fillStyle = '#2a343a'; for (let k = 0; k < 12; k++) { x.beginPath(); x.arc(Math.cos(k * TAU / 12) * 15, Math.sin(k * TAU / 12) * 15, 2, 0, TAU); x.fill(); } },
    fuse: () => { x.fillStyle = '#c9d4d9'; rrect(x, -20, -6, 40, 12, 4); x.fill(); x.fillStyle = '#2a2420'; x.fillRect(-8, -6, 18, 12); x.fillStyle = '#8a5a2a'; x.fillRect(-24, -3, 4, 6); x.fillRect(20, -3, 4, 6); },
    phones: () => { x.lineWidth = 4; x.beginPath(); x.arc(0, 4, 18, Math.PI, 0); x.stroke(); x.fillStyle = '#3a454b'; rrect(x, -24, 0, 10, 16, 4); x.fill(); x.fillStyle = '#5fe7ff'; rrect(x, 14, 0, 10, 16, 4); x.fill(); },
    spectrum: () => { x.fillStyle = '#e8e2d0'; x.fillRect(-20, -18, 40, 36); x.strokeStyle = '#2a343a'; x.lineWidth = 1.5; x.beginPath(); for (let k = 0; k <= 16; k++) { const xx = -18 + k * 2.25, yy = Math.sin(k * 1.4) * 8 * (k % 4 === 3 ? 1.6 : .6); k ? x.lineTo(xx, yy) : x.moveTo(xx, yy); } x.stroke(); x.strokeStyle = '#ff4f5e'; x.beginPath(); x.ellipse(4, 0, 12, 10, 0, 0, TAU); x.stroke(); },
    castkey: () => { x.fillStyle = '#d8c070'; x.beginPath(); x.arc(-10, 0, 9, 0, TAU); x.fill(); x.fillRect(-2, -3, 24, 6); x.fillRect(14, 3, 4, 6); x.fillStyle = '#071820'; x.beginPath(); x.arc(-10, 0, 3, 0, TAU); x.fill(); },
    tag7: () => { x.fillStyle = '#c9d4d9'; rrect(x, -20, -12, 40, 24, 3); x.fill(); x.fillStyle = '#2a343a'; for (let k = 0; k < 4; k++) x.fillRect(-14, -7 + k * 5, 18 + (k % 2) * 8, 2); x.font = '900 12px sans-serif'; x.fillText('7', 10, 6); },
    notes: () => { x.fillStyle = '#e8e2d0'; x.fillRect(-16, -20, 32, 40); x.fillStyle = '#2a343a'; x.font = '900 13px sans-serif'; x.fillText('噓', -6, -2); x.fillText('噓', -6, 14); },
    molt: () => { x.fillStyle = 'rgba(180,220,230,.55)'; x.beginPath(); x.ellipse(0, 6, 12, 16, 0, 0, TAU); x.fill(); for (let k = 0; k < 5; k++) { x.save(); x.rotate(-.9 + k * .45); x.fillRect(-2, -26, 4, 16); x.restore(); } },
    medal: () => { x.fillStyle = '#c84a3a'; x.beginPath(); x.moveTo(-10, -22); x.lineTo(10, -22); x.lineTo(6, -2); x.lineTo(-6, -2); x.fill(); x.fillStyle = '#d8c070'; x.beginPath(); x.arc(0, 8, 13, 0, TAU); x.fill(); x.fillStyle = '#8a6a20'; x.beginPath(); x.arc(0, 8, 7, 0, TAU); x.fill(); },
    toysub: () => { x.fillStyle = '#3f8fd8'; rrect(x, -22, -6, 40, 16, 8); x.fill(); x.fillRect(-4, -14, 12, 9); x.fillStyle = '#ffcf3a'; x.beginPath(); x.arc(8, 2, 3, 0, TAU); x.fill(); x.beginPath(); x.arc(-4, 2, 3, 0, TAU); x.fill(); x.fillStyle = '#2a5a8a'; x.fillRect(18, -2, 6, 8); },
    disc: () => { x.fillStyle = '#1c252c'; x.beginPath(); x.moveTo(-18, -14); x.lineTo(16, -20); x.lineTo(20, 12); x.lineTo(-4, 20); x.lineTo(-20, 6); x.fill(); x.strokeStyle = 'rgba(255,59,78,.8)'; x.lineWidth = 2; x.beginPath(); x.arc(4, 4, 9, 0, TAU); x.stroke(); x.beginPath(); x.arc(4, 4, 15, -2, 1); x.stroke(); },
  };
  (R[id] || R.knob)();
  x.restore();
}
function drawPortrait(x, id, hue) {
  const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#0d2a36'); g.addColorStop(1, '#04121a'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const col = `hsl(${hue},30%,45%)`;
  x.fillStyle = col; rrect(x, 12, 44, 40, 30, 12); x.fill();
  x.fillStyle = '#d8b494'; x.beginPath(); x.arc(32, 32, 12, 0, TAU); x.fill();
  const hair = ['#2a2420', '#4a3426', '#1a1614', '#6a6a6a'][(hue >> 4) % 4];
  x.fillStyle = hair; x.beginPath(); x.arc(32, 28, 12.5, Math.PI * 1.02, TAU * .99); x.fill();
  if (['ye', 'bai', 'lily', 'yuki', 'wei', 'lin'].includes(id)) { x.fillRect(19, 26, 5, 18); x.fillRect(40, 26, 5, 16); }
  if (id === 'lin') { x.strokeStyle = '#5fe7ff'; x.lineWidth = 2; x.beginPath(); x.arc(32, 30, 15, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); x.fillStyle = '#5fe7ff'; x.fillRect(16, 28, 4, 8); x.fillRect(44, 28, 4, 8); }
  if (id === 'amon') { x.fillStyle = '#eee'; rrect(x, 20, 12, 24, 10, 4); x.fill(); }
  if (id === 'tie') { x.fillStyle = '#2a343a'; x.fillRect(20, 18, 24, 6); }
  if (id === 'chen' || id === 'liang') { x.strokeStyle = '#1a1a1a'; x.lineWidth = 1.5; x.strokeRect(24, 30, 7, 5); x.strokeRect(33, 30, 7, 5); }
  if (id === 'lu') { x.fillStyle = '#3f8fd8'; x.fillRect(19, 16, 26, 7); }
  x.fillStyle = '#1a1a1a'; x.fillRect(27, 32, 2.5, 2.5); x.fillRect(35, 32, 2.5, 2.5);
}
