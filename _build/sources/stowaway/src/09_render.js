// ============ 繪製：鏡頭、光照、藍圖、標記 ============
const CAM = { x: 8 * T, y: 4 * T, z: 1, tz: 1, follow: -1, freeT: 0, shake: 0, top: 80, bot: 170 };
let CV, CX, LC, LX, SHIPIMG = null, BPIMG = null, DPR = 1, VW = 390, VH = 844, STARS = null;
const LIGHTCACHE = {};
function initRender() {
  CV = $('#cv'); CX = CV.getContext('2d');
  LC = mkCanvas(10, 10); LX = LC.getContext('2d');
  resize(); window.addEventListener('resize', resize);
  STARS = []; const r = mulberry32(99); for (let k = 0; k < 260; k++) STARS.push([r() * 2000, r() * 3000, r() * 1.6 + .3, r() * .8 + .2, r()]);
}
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1) * (S.lowRes ? .75 : 1);
  VW = window.innerWidth; VH = window.innerHeight;
  CV.width = Math.round(VW * DPR); CV.height = Math.round(VH * DPR);
  LC.width = Math.round(VW * DPR * .5); LC.height = Math.round(VH * DPR * .5);
  const land = VW / VH > 1.3;
  CAM.top = land ? 70 : 96; CAM.bot = land ? 70 : 168; CAM.left = land ? 140 : 0;
}
function ensureShipImg() { if (!SHIPIMG) { SHIPIMG = paintShip(); BPIMG = paintBlueprint(); } }
function viewCenter() { return [CAM.left + (VW - CAM.left) / 2, CAM.top + (VH - CAM.top - CAM.bot) / 2]; }
function s2w(sx, sy) { const [cx, cy] = viewCenter(); return [(sx - cx) / CAM.z + CAM.x, (sy - cy) / CAM.z + CAM.y]; }
function w2s(wx, wy) { const [cx, cy] = viewCenter(); return [(wx - CAM.x) * CAM.z + cx, (wy - CAM.y) * CAM.z + cy]; }
function fitZoom() { const h = VH - CAM.top - CAM.bot, w = VW - CAM.left; return Math.min(w / ((MAPW + 2) * T), h / ((MAPH + 3) * T)); }
function shake(a) { if (S.set.shake) CAM.shake = Math.max(CAM.shake, a); }
function flash(a) { if (!S.set.flash) a *= .3; const f = $('#flash'); f.style.transition = 'none'; f.style.opacity = a; requestAnimationFrame(() => { f.style.transition = 'opacity .5s'; f.style.opacity = 0; }); }
function updateCamera(dt) {
  CAM.freeT = Math.max(0, CAM.freeT - dt);
  CAM.z = lerp(CAM.z, CAM.tz, Math.min(1, dt * 8));
  let tx = null, ty = null;
  if (W && W.grabbing && W.phase === 'play') { tx = W.grabbing.x; ty = W.grabbing.y; }
  else if (CAM.follow >= 0 && CAM.freeT <= 0 && W) { const m = W.crew[CAM.follow]; if (m && !m.dead) { tx = m.x; ty = m.y; } }
  if (CAM.focus && CAM.focus.t > 0) { CAM.focus.t -= dt; tx = CAM.focus.x; ty = CAM.focus.y; }
  if (tx != null) { CAM.x = lerp(CAM.x, tx, Math.min(1, dt * 4)); CAM.y = lerp(CAM.y, ty, Math.min(1, dt * 4)); }
  CAM.x = clamp(CAM.x, -T * 2, (MAPW + 2) * T); CAM.y = clamp(CAM.y, -T * 2, (MAPH + 2) * T);
  CAM.shake = Math.max(0, CAM.shake - dt * 30);
}
function worldTransform(c, s) { const [cx, cy] = viewCenter(); const sx = CAM.shake ? R.f(-CAM.shake, CAM.shake) * .5 : 0, sy = CAM.shake ? R.f(-CAM.shake, CAM.shake) * .5 : 0; c.setTransform(s * CAM.z, 0, 0, s * CAM.z, s * (cx - CAM.x * CAM.z + sx), s * (cy - CAM.y * CAM.z + sy)); }

// ---------- 主繪製 ----------
function render(dt) {
  const c = CX; ensureShipImg();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#020305'; c.fillRect(0, 0, CV.width, CV.height);
  drawSpace(c);
  if (!W) return;
  const t = W.t;
  worldTransform(c, DPR);
  const sc = ART.sc, mg = ART.mg;
  c.imageSmoothingEnabled = true;
  c.drawImage(SHIPIMG, -mg, -mg, SHIPIMG.width / sc, SHIPIMG.height / sc);
  drawFloorFx(c, t);
  for (const n of SHIP.vn) drawGrate(c, n, t);
  drawNest(c, t);
  for (const d of SHIP.doors) drawDoor(c, d, t);
  drawDynProps(c, t);
  for (const it of W.items) drawFloorItem(c, it, t);
  for (const tp of W.traps) drawTrap(c, tp, t);
  const vis = W.visCache = computeObserved();
  if (W.bot && (botSeen() || bridgeOn())) drawBot(c, W.bot, t);
  for (const m of W.crew) if (m.dead && !m.left) drawCrew(c, m, t);
  for (const m of W.crew) if (!m.dead && !m.inVent && m.cocoon < 0) { if (m.hidden) { c.save(); c.globalAlpha = .35; drawCrew(c, m, t); c.restore(); } else drawCrew(c, m, t); }
  for (const m of W.crew) if (!m.dead && m.cocoon >= 0) drawCocoon(c, m, t);
  const b = W.beast;
  if (b && (b.visible || b.state === 'dead' || b.state === 'spaced') && !b.inVent && b.state !== 'dormant') drawBeast(c, b, t, b.state === 'sink' ? 1 - b.st / .55 : 1);
  // 被抓住的人畫在牠上面，才看得出是誰
  if (W.grabbing && b && !b.inVent) { const m = W.grabbing; c.save(); c.translate(Math.sin(t * 31) * 1.6, Math.cos(t * 27) * 1.2); drawCrew(c, m, t); c.restore(); }
  if (b && b.inVent) for (const n of SHIP.vn) if (dist(n.x, n.y, b.x, b.y) < T * .9 && vis.rooms.has(n.room) && (roomLit(n.room) || nearCrewLight(n.x, n.y))) drawBeastUnder(c, b, n, t);
  drawFx(c, t);
  // 光照
  drawLighting(c, t, vis);
  worldTransform(c, DPR);
  drawEmissive(c, t);
  drawOverlays(c, t, vis);
  // 藍圖
  const bp = clamp((.6 - CAM.z) / .2, 0, 1);
  if (bp > 0 || UI.bridgeMode) drawBlueprint(c, t, UI.bridgeMode ? Math.max(bp, .82) : bp);
  // 畫面效果
  c.setTransform(1, 0, 0, 1, 0, 0);
  drawScreenFx(c, t);
}
function drawSpace(c) {
  const g = c.createLinearGradient(0, 0, 0, CV.height); g.addColorStop(0, '#04060a'); g.addColorStop(1, '#070a10'); c.fillStyle = g; c.fillRect(0, 0, CV.width, CV.height);
  const ox = -CAM.x * .15 * CAM.z, oy = -CAM.y * .15 * CAM.z;
  const tt = W ? W.t : performance.now() / 1000;
  for (const [x, y, r, a, ph] of STARS) {
    const sx = ((x + ox) % 2000 + 2000) % 2000 * DPR * VW / 2000 * 1.2, sy = ((y + oy) % 3000 + 3000) % 3000 * DPR * VH / 3000 * 1.2;
    c.fillStyle = `rgba(220,230,255,${a * (.7 + .3 * Math.sin(tt * 1.5 + ph * 9))})`; c.fillRect(sx, sy, r * DPR, r * DPR);
  }
}
function computeObserved() {
  // 船員看得到的房間（燈光才算數）
  const rooms = new Set();
  for (const m of W.crew) {
    if (m.dead || m.cocoon >= 0 || m.inVent) continue;
    if (m.room >= 0) rooms.add(m.room);
    for (const r of ROOMS) {
      if (rooms.has(r.i)) continue;
      if (dist(m.x, m.y, r.cx, r.cy) > T * 12) continue;
      for (const [lx, ly] of r.lamps) { if (hasLOS(m.x, m.y, lx * T, ly * T)) { rooms.add(r.i); break; } }
    }
  }
  for (const tp of W.traps) if (tp.type === 'flare') { const ri = roomIdxW(tp.x, tp.y); if (ri >= 0) rooms.add(ri); }
  if (W.fx.some(f => f.type === 'vent')) rooms.add(ROOM.airlock.i);
  if (UI.bridgeMode) { /* 艦橋：只看感測器 */ }
  return { rooms };
}
function nearCrewLight(x, y) { return W.crew.some(m => !m.dead && m.cocoon < 0 && dist(m.x, m.y, x, y) < T * 4 && hasLOS(m.x, m.y, x, y)); }
function botSeen() { const b = W.bot; return W.crew.some(m => canSee(m, b.x, b.y)); }

// ---------- 地板上的東西 ----------
function drawFloorFx(c, t) {
  for (const f of W.fx) {
    if (f.type === 'blood') { c.fillStyle = 'rgba(90,10,10,.55)'; c.beginPath(); c.ellipse(f.x, f.y + 4, 16, 10, (f.x % 3), 0, TAU); c.fill(); }
    if (f.type === 'ichor') { c.fillStyle = 'rgba(120,230,200,.35)'; c.beginPath(); c.ellipse(f.x, f.y, 10, 6, (f.y % 3), 0, TAU); c.fill(); }
    if (f.type === 'frost') { const a = 1 - f.t / f.dur; c.fillStyle = `rgba(200,240,255,${.35 * a})`; c.beginPath(); c.arc(f.x, f.y, T * 1.4, 0, TAU); c.fill(); }
  }
}
function drawNest(c, t) {
  if (!W.nest) return;
  const n = W.nest;
  c.save(); c.translate(n.x, n.y);
  const r = mulberry32(5);
  for (let k = 0; k < 16; k++) { const a = r() * TAU, d = r() * 70; c.fillStyle = `rgba(30,40,46,${.6 + r() * .3})`; c.beginPath(); c.ellipse(Math.cos(a) * d, Math.sin(a) * d, 14 + r() * 22, 8 + r() * 12, a, 0, TAU); c.fill(); }
  for (let k = 0; k < 10; k++) { const a = r() * TAU; c.strokeStyle = 'rgba(80,110,120,.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(Math.cos(a + .5) * 50, Math.sin(a + .5) * 50, Math.cos(a) * 95, Math.sin(a) * 95); c.stroke(); }
  c.fillStyle = `rgba(111,232,255,${.12 + .08 * Math.sin(t * 2)})`; c.beginPath(); c.arc(0, 0, 40, 0, TAU); c.fill();
  c.restore();
}
function drawCocoon(c, m, t) {
  c.save(); c.translate(m.x, m.y);
  c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(3, 5, 18, 14, 0, 0, TAU); c.fill();
  const g = c.createRadialGradient(-4, -4, 2, 0, 0, 20); g.addColorStop(0, '#6a7a80'); g.addColorStop(1, '#2a3438');
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 16, 20, .3, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(160,200,210,.4)'; c.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(0, k * 6, 15, 4, .3, 0, Math.PI); c.stroke(); }
  c.fillStyle = CREW[m.ci].skin; c.beginPath(); c.arc(2, -12, 5, 0, TAU); c.fill();
  const p = m.cocoon / 90;
  c.strokeStyle = '#ff3d3d'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 26, -Math.PI / 2, -Math.PI / 2 + TAU * p); c.stroke();
  c.restore();
}
function drawDynProps(c, t) {
  // 反應爐核心
  const cx = 13 * T, cy = 26 * T, on = !W.sys.reactorDmg;
  const g = c.createRadialGradient(cx, cy, 2, cx, cy, 44); g.addColorStop(0, on ? '#fff2c8' : '#ffb0a0'); g.addColorStop(.4, on ? 'rgba(255,170,60,.9)' : 'rgba(255,80,60,.8)'); g.addColorStop(1, 'rgba(255,120,30,0)');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 44, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(255,200,120,.55)'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, 38, t * 1.2, t * 1.2 + 4); c.stroke(); c.beginPath(); c.arc(cx, cy, 28, -t * 2, -t * 2 + 3); c.stroke();
  if (W.power.over > 0) { c.strokeStyle = `rgba(255,255,255,${.4 + .3 * Math.sin(t * 20)})`; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, 50, 0, TAU); c.stroke(); }
  // 貨櫃震動
  for (const f of W.fx) if (f.type === 'shakeProp') { c.fillStyle = `rgba(160,230,200,${.3 * Math.sin(f.t * 30) + .2})`; c.beginPath(); c.ellipse(f.x - 60, f.y + 20, 24, 12, 0, 0, TAU); c.fill(); }
  // 自毀燈
  if (W.sys.sd >= 0) { const sd = SHIP.con.selfdestruct; c.fillStyle = `rgba(255,40,40,${.5 + .5 * Math.sin(t * 10)})`; c.beginPath(); c.arc(sd.px, sd.py, 10, 0, TAU); c.fill(); }
  // 氣閘
  if (W.sys.airlock) { const a = SHIP.con.airlock; c.fillStyle = W.power.on.airlock ? '#86f0a0' : '#ffb03a'; c.fillRect(a.px - 4, a.py - 12, 8, 4); }
}
function drawFloorItem(c, it, t) {
  c.save(); c.translate(it.x, it.y);
  const D = ITEMS[it.it]; const col = D.rar >= 3 ? '#ffb03a' : D.rar === 2 ? '#5aa8ff' : '#ece4d2';
  c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(2, 3, 11, 7, 0, 0, TAU); c.fill();
  c.fillStyle = '#2a3038'; rr(c, -9, -7, 18, 14, 3); c.fill();
  c.strokeStyle = col; c.lineWidth = 1.5; c.globalAlpha = .6 + .4 * Math.sin(t * 3); rr(c, -10, -8, 20, 16, 4); c.stroke();
  c.restore();
}
function drawTrap(c, tp, t) {
  c.save(); c.translate(tp.x, tp.y);
  if (tp.type === 'flare') { c.fillStyle = '#ff6060'; c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill(); }
  else if (tp.type === 'lure') { c.fillStyle = '#3a3e44'; rr(c, -8, -6, 16, 12, 2); c.fill(); c.fillStyle = tp.t > tp.delay && Math.sin(t * 16) > 0 ? '#ffb03a' : '#5a4020'; c.fillRect(-3, -3, 6, 6); }
  else if (tp.type === 'alarm') { /* 只有聲音 */ }
  else if (tp.type === 'fuel') { c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(2, 4, 11, 8, 0, 0, TAU); c.fill(); shade(c, -8, -11, 16, 22, 3, '#c8402a', '#7a2214'); c.fillStyle = '#ffb03a'; c.fillRect(-6, -2, 12, 3); }
  else if (tp.type === 'ln2') { shade(c, -7, -11, 14, 22, 6, '#e0f0ff', '#8aa8c0'); c.fillStyle = '#5aa8ff'; c.fillRect(-5, -2, 10, 3); }
  else if (tp.type === 'sentry') {
    c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(3, 5, 18, 14, 0, 0, TAU); c.fill();
    c.strokeStyle = '#3a3e44'; c.lineWidth = 4; for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + .5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); c.stroke(); }
    c.rotate(tp.aimA); shade(c, -10, -9, 22, 18, 4, '#6a7078', '#3a3e44'); c.fillStyle = '#222'; c.fillRect(10, -3, 14, 6); c.fillStyle = tp.ammo > 0 ? '#ff3d3d' : '#444'; c.fillRect(-6, -2, 4, 4);
  }
  c.restore();
}
function drawFx(c, t) {
  for (const f of W.fx) {
    const u = f.t / f.dur;
    if (f.type === 'flame') { const r = 8 + u * 22; const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, r); g.addColorStop(0, `rgba(255,240,180,${.8 * (1 - u)})`); g.addColorStop(.4, `rgba(255,140,40,${.7 * (1 - u)})`); g.addColorStop(1, 'rgba(255,60,10,0)'); c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, r, 0, TAU); c.fill(); }
    else if (f.type === 'fire') { const fl = .5 + .5 * Math.sin(t * 13 + f.x); const r = 18 * (1 - u * .5); const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, r); g.addColorStop(0, `rgba(255,220,140,${.7 * fl})`); g.addColorStop(1, 'rgba(255,80,20,0)'); c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, r, 0, TAU); c.fill(); }
    else if (f.type === 'spark') { c.fillStyle = f.col; c.globalAlpha = 1 - u; c.fillRect(f.x - 1.5, f.y - 1.5, 3, 3); c.globalAlpha = 1; }
    else if (f.type === 'boom') { const r = 20 + u * 110; c.fillStyle = `rgba(255,200,120,${.8 * (1 - u)})`; c.beginPath(); c.arc(f.x, f.y, r, 0, TAU); c.fill(); c.strokeStyle = `rgba(255,255,255,${1 - u})`; c.lineWidth = 4; c.beginPath(); c.arc(f.x, f.y, r * 1.2, 0, TAU); c.stroke(); }
    else if (f.type === 'tracer') { c.strokeStyle = `rgba(255,230,160,${1 - u})`; c.lineWidth = 2; c.beginPath(); c.moveTo(f.x0, f.y0); c.lineTo(f.x1, f.y1); c.stroke(); }
    else if (f.type === 'bolt') { c.strokeStyle = '#e8eef4'; c.lineWidth = 3; c.beginPath(); c.moveTo(lerp(f.x0, f.x1, u * .7), lerp(f.y0, f.y1, u * .7)); c.lineTo(lerp(f.x0, f.x1, u), lerp(f.y0, f.y1, u)); c.stroke(); }
    else if (f.type === 'throw') { const x = lerp(f.x0, f.x1, u), y = lerp(f.y0, f.y1, u) - Math.sin(u * Math.PI) * 30; c.fillStyle = f.it === 'flare' ? '#ff8080' : '#ffb03a'; c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill(); }
  }
}
// ---------- 光照 ----------
function lampPoly(r, k, L) {
  const key = r.i + ':' + k + ':' + (W.lightVer || 0);
  if (LIGHTCACHE[key]) return LIGHTCACHE[key];
  const R0 = Math.max(r.w, r.h) * T * .95 + T * 2;
  const p = visPoly(L[0] * T, L[1] * T, R0, 80);
  for (const kk in LIGHTCACHE) if (kk.startsWith(r.i + ':' + k + ':')) delete LIGHTCACHE[kk];
  LIGHTCACHE[key] = { p, R0 };
  return LIGHTCACHE[key];
}
function fillPoly(c, p) { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fill(); }
function drawLighting(c, t, vis) {
  const l = LX, s = DPR * .5;
  l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-over';
  const dark = W.power.on.lights ? .93 : .96;
  l.fillStyle = `rgba(3,5,9,${dark})`; l.fillRect(0, 0, LC.width, LC.height);
  worldTransform(l, s);
  l.globalCompositeOperation = 'destination-out';
  const pwr = W.power.on.lights;
  // 房間燈
  for (const r of ROOMS) {
    if (!vis.rooms.has(r.i)) continue;
    const Ls = W.lights[r.i];
    r.lamps.forEach((L, k) => {
      const lit = pwr && Ls.on && !Ls.broken;
      let a = lit ? .96 : .32;
      if (lit && Ls.flick > 0) a *= .4 + .6 * (Math.sin(t * 47 + k) > 0 ? 1 : .3);
      const { p, R0 } = lampPoly(r, k, L);
      const g = l.createRadialGradient(L[0] * T, L[1] * T, 0, L[0] * T, L[1] * T, lit ? R0 : R0 * .55);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.55, `rgba(0,0,0,${a * .8})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = g; fillPoly(l, p);
    });
  }
  // 船員的肩燈與身邊
  for (const m of W.crew) {
    if (m.dead || m.cocoon >= 0 || m.inVent) continue;
    const near = visPoly(m.x, m.y, T * 1.9, 28);
    const g0 = l.createRadialGradient(m.x, m.y, 0, m.x, m.y, T * 1.9); g0.addColorStop(0, 'rgba(0,0,0,.75)'); g0.addColorStop(1, 'rgba(0,0,0,0)'); l.fillStyle = g0; fillPoly(l, near);
    if (m.lampOn && !m.hidden) {
      const cone = visPoly(m.x, m.y, T * 7, 46, m.ang - .55, m.ang + .55);
      const g = l.createRadialGradient(m.x, m.y, T * .3, m.x, m.y, T * 7); g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(.6, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = g; fillPoly(l, cone);
    }
  }
  // 照明彈、火
  for (const tp of W.traps) if (tp.type === 'flare') {
    const fl = .85 + .15 * Math.sin(t * 31 + tp.x), R0 = T * 4.8;
    const p = visPoly(tp.x, tp.y, R0, 48); const g = l.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, R0); g.addColorStop(0, `rgba(0,0,0,${fl})`); g.addColorStop(1, 'rgba(0,0,0,0)'); l.fillStyle = g; fillPoly(l, p);
  }
  for (const f of W.fx) if (f.type === 'fire' || f.type === 'boom' || f.type === 'flame') { const R0 = f.type === 'boom' ? T * 4 : T * 2; const g = l.createRadialGradient(f.x, f.y, 0, f.x, f.y, R0); g.addColorStop(0, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); l.fillStyle = g; l.beginPath(); l.arc(f.x, f.y, R0, 0, TAU); l.fill(); }
  // 被拋出去／倒下的牠：看得清楚
  const bb = W.beast;
  if (bb && (bb.state === 'spaced' || bb.state === 'dead')) { const R0 = T * 3.6 * (bb.scale || 1); const g = l.createRadialGradient(bb.x, bb.y, 0, bb.x, bb.y, R0); g.addColorStop(0, 'rgba(0,0,0,.92)'); g.addColorStop(.6, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); l.fillStyle = g; l.beginPath(); l.arc(bb.x, bb.y, R0, 0, TAU); l.fill(); }
  // 反應爐
  if (vis.rooms.has(ROOM.reactor.i)) { const g = l.createRadialGradient(13 * T, 26 * T, 0, 13 * T, 26 * T, T * 3); g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); l.fillStyle = g; l.beginPath(); l.arc(13 * T, 26 * T, T * 3, 0, TAU); l.fill(); }
  l.globalCompositeOperation = 'source-over';
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(LC, 0, 0, CV.width, CV.height);
  // 色光
  worldTransform(c, DPR);
  c.globalCompositeOperation = 'lighter';
  for (const r of ROOMS) {
    if (!vis.rooms.has(r.i)) continue;
    const Ls = W.lights[r.i], lit = pwr && Ls.on && !Ls.broken;
    for (const L of r.lamps) {
      const col = lit ? LAMP[L[2]] : [255, 30, 20];
      const R0 = (lit ? Math.max(r.w, r.h) * .7 : 1.6) * T;
      const a = lit ? .085 : .12 * (.6 + .4 * Math.sin(t * 2));
      const g = c.createRadialGradient(L[0] * T, L[1] * T, 0, L[0] * T, L[1] * T, R0);
      g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`); g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(L[0] * T, L[1] * T, R0, 0, TAU); c.fill();
    }
  }
  for (const tp of W.traps) if (tp.type === 'flare') { const g = c.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, T * 4); g.addColorStop(0, 'rgba(255,90,80,.35)'); g.addColorStop(1, 'rgba(255,40,40,0)'); c.fillStyle = g; c.beginPath(); c.arc(tp.x, tp.y, T * 4, 0, TAU); c.fill(); }
  for (const f of W.fx) if (f.type === 'fire' || f.type === 'flame') { const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, T * 1.6); g.addColorStop(0, 'rgba(255,140,40,.25)'); g.addColorStop(1, 'rgba(255,80,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, T * 1.6, 0, TAU); c.fill(); }
  c.globalCompositeOperation = 'source-over';
}
// 發光的東西（畫在黑暗之上）
function drawEmissive(c, t) {
  const b = W.beast;
  if (b && !b.inVent && b.state !== 'dormant' && b.state !== 'dead' && (b.visible || nearAnyCrew(b.x, b.y, T * 3.2))) {
    const h = b.seg[0], h1 = b.seg[1], a = Math.atan2(h.y - h1.y, h.x - h1.x), s = b.scale;
    const gx = h.x + Math.cos(a) * 3 * s, gy = h.y + Math.sin(a) * 3 * s;
    const g = c.createRadialGradient(gx, gy, 0, gx, gy, 16 * s + b.sonarFx * 20);
    g.addColorStop(0, 'rgba(160,245,255,.9)'); g.addColorStop(.3, 'rgba(111,232,255,.35)'); g.addColorStop(1, 'rgba(111,232,255,0)');
    c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.beginPath(); c.arc(gx, gy, 16 * s + b.sonarFx * 20, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
    if (b.visible && b.sonarFx > 0) { c.strokeStyle = `rgba(111,232,255,${b.sonarFx * .55})`; c.lineWidth = 2 / CAM.z; c.beginPath(); c.arc(gx, gy, (1 - b.sonarFx) * T * 6 + 10, 0, TAU); c.stroke(); }
  }
  // 門的指示燈
  for (const d of SHIP.doors) { const col = d.broken ? '#555' : d.welded ? '#ff8a3d' : d.state === 'open' ? '#86f0a0' : '#ff3d3d'; c.fillStyle = rgba(col.length === 7 ? col : '#555555', .9); c.beginPath(); c.arc(d.x + (d.orient === 'v' ? 9 : -d.len / 2 - 6), d.y + (d.orient === 'v' ? -d.len / 2 - 6 : 9), 2.4, 0, TAU); c.fill(); }
  // 照明彈本體
  for (const tp of W.traps) if (tp.type === 'flare') { c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, 26); g.addColorStop(0, 'rgba(255,240,240,1)'); g.addColorStop(.3, 'rgba(255,90,80,.6)'); g.addColorStop(1, 'rgba(255,40,40,0)'); c.fillStyle = g; c.beginPath(); c.arc(tp.x, tp.y, 26, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; }
  // 氣閘洩壓：白霧被抽向外門
  for (const f of W.fx) if (f.type === 'vent') {
    const u = f.t / f.dur, a = (1 - u) * (1 - u), o = SHIP.door.a_out, ar = ROOM.airlock;
    for (let k = 0; k < 16; k++) {
      const ph = (k * .37 + u * 2.4) % 1, sp = 1 - ph;
      const x = lerp(ar.cx - T * .6, o.x + T * 3, ph) + Math.sin(k * 7.1) * T * .9 * sp, y = lerp(ar.cy, o.y, ph) + Math.cos(k * 3.3) * T * 1.2 * sp;
      const r = T * (1.1 - ph * .6), g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(236,242,255,${.38 * a})`); g.addColorStop(1, 'rgba(236,242,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
  }
  // 自毀、巢
  for (const n of SHIP.vn) if (n.drip > .2) { c.fillStyle = `rgba(150,240,210,${.25 * Math.min(1, n.drip)})`; c.beginPath(); c.arc(n.x, n.y, 18 + n.drip * 6, 0, TAU); c.fill(); }
}
function nearAnyCrew(x, y, r) { return W.crew.some(m => !m.dead && m.cocoon < 0 && dist(m.x, m.y, x, y) < r); }

// ---------- 疊加標記 ----------
function drawOverlays(c, t, vis) {
  const z = CAM.z, px = 1 / z;
  // 沒有人看得到的房間：留下輪廓與名字
  c.lineWidth = 1.2 * px;
  for (const r of ROOMS) {
    if (vis.rooms.has(r.i)) continue;
    c.strokeStyle = 'rgba(236,228,210,.13)'; c.strokeRect(r.x0 + 3, r.y0 + 3, r.x1 - r.x0 - 6, r.y1 - r.y0 - 6);
    if (z > .55 && r.kind !== 'hall') { c.fillStyle = 'rgba(236,228,210,.28)'; c.font = `700 ${12 * px}px ${FONT}`; c.textAlign = 'center'; c.fillText(r.name, r.cx, r.cy + 4 * px); }
  }
  // 管道網（按「管道」或在艦橋模式）
  if (UI.showVents || UI.bridgeMode) drawVentNet(c, t, px, UI.bridgeMode ? .9 : .65);
  // 聲波圈
  for (const n of W.noises) { const u = n.t / .9; const big = n.r > T * 5; c.strokeStyle = rgba(n.col, (big ? .42 : .28) * (1 - u)); c.lineWidth = (big ? 2 : 1.3) * px; c.beginPath(); c.arc(n.x, n.y, n.r * (.2 + .8 * easeOut(u)), 0, TAU); c.stroke(); }
  // 偵測器掃描
  for (const f of W.fx) if (f.type === 'sweep') { const u = f.t / f.dur; c.strokeStyle = `rgba(134,240,160,${.32 * (1 - u)})`; c.lineWidth = 2 * px; c.beginPath(); c.arc(f.x, f.y, f.r * easeOut(u), 0, TAU); c.stroke(); }
  // 光點
  for (const bl of W.blips) {
    const u = bl.t / 2.2, a = 1 - u, rr0 = (bl.vent ? 9 : 7) * px;
    c.fillStyle = bl.vent ? `rgba(255,160,60,${a})` : `rgba(255,60,60,${a})`;
    if (bl.vent) { c.strokeStyle = c.fillStyle; c.lineWidth = 2 * px; c.beginPath(); c.arc(bl.x, bl.y, rr0, 0, TAU); c.stroke(); c.font = `700 ${9 * px}px ${FONT}`; c.textAlign = 'center'; c.fillText('地板下', bl.x, bl.y - rr0 - 3 * px); }
    else { c.beginPath(); c.arc(bl.x, bl.y, rr0, 0, TAU); c.fill(); }
    c.strokeStyle = `rgba(255,80,80,${a * .5})`; c.lineWidth = 1.5 * px; c.beginPath(); c.arc(bl.x, bl.y, rr0 + u * 22 * px, 0, TAU); c.stroke();
  }
  // 最後看到的位置
  for (const g of W.ghosts) { const a = .5 * (1 - g.t / 3); c.strokeStyle = `rgba(111,232,255,${a})`; c.setLineDash([4 * px, 4 * px]); c.lineWidth = 1.5 * px; c.beginPath(); c.ellipse(g.x, g.y, 26 * g.sc, 16 * g.sc, g.ang, 0, TAU); c.stroke(); c.setLineDash([]); }
  // 模仿聲
  for (const e of W.ears) { const a = 1 - e.t / 5; c.fillStyle = `rgba(111,232,255,${a})`; c.font = `900 ${18 * px}px ${FONT}`; c.textAlign = 'center'; c.fillText('？', e.x, e.y - 8 * px); c.strokeStyle = `rgba(111,232,255,${a * .6})`; c.lineWidth = 2 * px; for (let k = 1; k <= 2; k++) { c.beginPath(); c.arc(e.x, e.y, k * 14 * px + Math.sin(t * 4) * 3 * px, -1, 1); c.stroke(); } }
  // 物件提示
  drawPropHints(c, t, vis, px);
  // 門與閘門的按鈕
  drawDoorButtons(c, t, px);
  // 選取
  if (W.sel >= 0) {
    const m = W.crew[W.sel];
    if (m && !m.dead) {
      c.strokeStyle = 'rgba(255,106,26,.95)'; c.lineWidth = 2.4 * px; c.setLineDash([7 * px, 5 * px]); c.lineDashOffset = -t * 20 * px;
      c.beginPath(); c.arc(m.x, m.y, 24, 0, TAU); c.stroke(); c.setLineDash([]);
      if (m.path) { c.strokeStyle = 'rgba(255,176,58,.6)'; c.lineWidth = 2 * px; c.setLineDash([4 * px, 6 * px]); c.beginPath(); c.moveTo(m.x, m.y); for (let k = m.pi; k < m.path.length; k++) c.lineTo(m.path[k][0], m.path[k][1]); c.stroke(); c.setLineDash([]); const L = m.path[m.path.length - 1]; if (L) { c.fillStyle = 'rgba(255,176,58,.85)'; c.beginPath(); c.arc(L[0], L[1], 5 * px, 0, TAU); c.fill(); } }
    }
  }
  if (UI.aimMode) drawAimMode(c, t, px);
  // 跟著選中的人走的同伴
  if (W.sel >= 0) {
    const L = W.crew[W.sel];
    c.strokeStyle = 'rgba(255,176,58,.38)'; c.lineWidth = 1.6 * px; c.setLineDash([3 * px, 5 * px]);
    for (const o of W.crew) if (o !== L && !o.dead && o.cocoon < 0 && o.follow === L.ci && !o.hidden) { c.beginPath(); c.moveTo(o.x, o.y); c.lineTo(L.x, L.y); c.stroke(); }
    c.setLineDash([]);
  }
  // 船員頭上
  for (const m of W.crew) {
    if (m.dead || m.cocoon >= 0) continue;
    const y0 = m.y - 30;
    if (m.task && m.task.dur < 1e6 && m.task.type !== 'fire') { const u = clamp(m.task.t / m.task.dur, 0, 1); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 5 * px; c.beginPath(); c.arc(m.x, y0, 9 * px, 0, TAU); c.stroke(); c.strokeStyle = '#ffb03a'; c.lineWidth = 3 * px; c.beginPath(); c.arc(m.x, y0, 9 * px, -Math.PI / 2, -Math.PI / 2 + TAU * u); c.stroke(); }
    if (m.panic) { c.fillStyle = '#ff3d3d'; c.font = `900 ${16 * px}px ${FONT}`; c.textAlign = 'center'; c.fillText('!!', m.x, y0 - 6 * px); }
    if (m.grabbed) { const g = W.beast.grabT / STAGES[W.beast.stage].grab; c.strokeStyle = '#ff3d3d'; c.lineWidth = 4 * px; c.beginPath(); c.arc(m.x, m.y, 30, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(g, 0, 1)); c.stroke(); }
    if (m.hidden) {
      const dg = breathDanger(m);
      if (dg || m.breath < 1) {
        // 屏息的氣：圈越短越快撐不住
        const r0 = 24, lv = clamp(m.breath, 0, 1);
        c.lineWidth = 4 * px; c.strokeStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.arc(m.x, m.y, r0, 0, TAU); c.stroke();
        c.strokeStyle = lv < .3 ? '#ff8080' : m.holding ? '#6fe8ff' : 'rgba(111,232,255,.55)'; c.lineWidth = 3 * px;
        c.beginPath(); c.arc(m.x, m.y, r0, -Math.PI / 2, -Math.PI / 2 + TAU * lv); c.stroke();
      }
      c.fillStyle = m.holding ? '#9ff0ff' : dg ? '#ffb3b3' : 'rgba(236,228,210,.7)'; c.font = `700 ${(m.holding || dg ? 11 : 10) * px}px ${FONT}`; c.textAlign = 'center';
      const lb = m.gaspT > 0 ? '喘氣！' : m.holding ? '屏息中' : dg ? '牠在旁邊' : '躲藏中', ly = y0 - (dg ? 4 * px : 0);
      c.strokeStyle = 'rgba(0,0,0,.75)'; c.lineWidth = 3 * px; c.lineJoin = 'round'; c.strokeText(lb, m.x, ly); c.fillText(lb, m.x, ly);
    }
    if (m.inVent) { c.fillStyle = 'rgba(134,240,160,.85)'; c.beginPath(); c.arc(m.x, m.y, 7 * px, 0, TAU); c.fill(); c.font = `700 ${10 * px}px ${FONT}`; c.textAlign = 'center'; c.fillText('阿傑（管道裡）', m.x, m.y - 12 * px); }
    if (z > .55 && (W.sel === m.ci || UI.bridgeMode)) { c.font = `700 ${11 * px}px ${FONT}`; c.textAlign = 'center'; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillText(CREW[m.ci].name, m.x + 1 * px, m.y + 38 + 1 * px); c.fillStyle = CREW[m.ci].col; c.fillText(CREW[m.ci].name, m.x, m.y + 38); }
  }
  // 巢與被包住的人
  if (W.nest) { c.fillStyle = 'rgba(111,232,255,.8)'; c.font = `900 ${11 * px}px ${FONT}`; c.textAlign = 'center'; c.fillText('巢', W.nest.x, W.nest.y - 50); }
}
function drawVentNet(c, t, px, a) {
  c.lineWidth = 3 * px; c.setLineDash([6 * px, 5 * px]);
  for (const L of SHIP.vl) {
    const closed = L.damper && SHIP.dampers[L.damper].closed;
    c.strokeStyle = closed ? `rgba(255,61,61,${a * .5})` : `rgba(255,176,58,${a * .55})`;
    c.beginPath(); c.moveTo(L.pts[0], L.pts[1]); for (let i = 2; i < L.pts.length; i += 2) c.lineTo(L.pts[i], L.pts[i + 1]); c.stroke();
  }
  c.setLineDash([]);
}
function drawPropHints(c, t, vis, px) {
  const sel = W.sel >= 0 ? W.crew[W.sel] : null;
  if (CAM.z < .5) return;
  for (const p of SHIP.props) {
    if (!vis.rooms.has(p.room) && !(sel && sel.room === p.room)) continue;
    let k = null, col = 'rgba(236,228,210,.85)';
    if (p.k === 'box') { if (p.searched) continue; k = 'search'; col = 'rgba(255,176,58,.95)'; }
    else if (p.k === 'hide') { if (p.occ != null) continue; k = 'hide'; }
    else if (p.k === 'con') { k = { bridge: 'bridge', power: 'power', craft: 'craft', heal: 'heal', dampers: 'vent', comms: 'comms', container: 'eye', airlock: 'airlock', shuttle: 'shuttle', selfdestruct: 'selfdestruct' }[p.fn]; col = 'rgba(111,232,255,.95)'; if (p.fn === 'airlock' && !W.sys.airlock) col = 'rgba(255,90,90,.95)'; if (p.fn === 'shuttle' && !W.sys.shuttle) col = 'rgba(255,90,90,.95)'; }
    if (!k) continue;
    const near = sel && dist(sel.x, sel.y, p.sx, p.sy) < T * 5;
    const r0 = (near ? 11 : 8) * px;
    c.globalAlpha = near ? 1 : .55;
    c.fillStyle = 'rgba(8,12,18,.82)'; c.beginPath(); c.arc(p.px, p.py, r0, 0, TAU); c.fill();
    c.strokeStyle = col; c.lineWidth = 1.5 * px; c.stroke();
    drawIconCanvas(c, k, p.px, p.py, r0 * 1.25, col);
    c.globalAlpha = 1;
  }
  // 地上的道具
  for (const it of W.items) { if (!vis.rooms.has(roomIdxW(it.x, it.y))) continue; c.fillStyle = 'rgba(255,255,255,.9)'; c.font = `700 ${9 * px}px ${FONT}`; c.textAlign = 'center'; c.fillText(ITEMS[it.it].name, it.x, it.y - 14 * px); }
}
// 用 Path2D 畫 svg 圖示（簡化：只畫一個符號字）
const ICON_GLYPH = { search: '搜', hide: '躲', bridge: '控', power: '電', craft: '工', heal: '醫', vent: '閘', comms: '訊', eye: '看', airlock: '閘', shuttle: '艇', selfdestruct: '毀' };
function drawIconCanvas(c, k, x, y, s, col) { c.fillStyle = col; c.font = `900 ${s * .8}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ICON_GLYPH[k] || '•', x, y + s * .04); c.textBaseline = 'alphabetic'; }
function drawDoorButtons(c, t, px) {
  const show = UI.bridgeMode || W.sel >= 0;
  if (!show || (CAM.z < .32 && !UI.bridgeMode)) return;
  const big = UI.bridgeMode, bs = big ? clamp(CAM.z / .5, .76, 1) : 1;
  for (const d of SHIP.doors) {
    if (d.kind === 'airout' && !UI.bridgeMode) continue;
    const r0 = (big ? 13 * bs : 9) * px;
    const col = d.broken ? '#777777' : d.welded ? '#ff8a3d' : d.state === 'open' ? '#86f0a0' : '#ff3d3d';
    c.fillStyle = 'rgba(8,12,18,.85)'; c.beginPath(); c.arc(d.x, d.y, r0, 0, TAU); c.fill();
    c.strokeStyle = col; c.lineWidth = 2 * px; c.stroke();
    c.fillStyle = col; c.font = `900 ${r0 * 1.05}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(d.broken ? '✕' : d.welded ? '焊' : d.state === 'open' ? '開' : '關', d.x, d.y + .5 * px); c.textBaseline = 'alphabetic';
    if (d.remoteCd > 0) { c.strokeStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(d.x, d.y, r0 + 3 * px, -Math.PI / 2, -Math.PI / 2 + TAU * d.remoteCd / 1.2); c.stroke(); }
  }
  if (UI.bridgeMode || UI.showVents) for (const id in SHIP.dampers) {
    const dm = SHIP.dampers[id], r0 = (big ? 12 * bs : 8) * px;
    c.fillStyle = 'rgba(8,12,18,.9)'; c.fillRect(dm.x - r0, dm.y - r0, r0 * 2, r0 * 2);
    c.strokeStyle = dm.closed ? '#ff3d3d' : '#ffb03a'; c.lineWidth = 2 * px; c.strokeRect(dm.x - r0, dm.y - r0, r0 * 2, r0 * 2);
    c.fillStyle = c.strokeStyle; c.font = `800 ${r0 * .8}px ${FONT_M}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(id, dm.x, dm.y + .5 * px); c.textBaseline = 'alphabetic';
  }
}
function drawAimMode(c, t, px) {
  const m = W.crew[W.sel]; if (!m) return;
  const R0 = T * 6.5;
  c.strokeStyle = 'rgba(255,176,58,.5)'; c.lineWidth = 2 * px; c.setLineDash([6 * px, 6 * px]); c.beginPath(); c.arc(m.x, m.y, R0, 0, TAU); c.stroke(); c.setLineDash([]);
  c.fillStyle = 'rgba(255,176,58,.06)'; c.beginPath(); c.arc(m.x, m.y, R0, 0, TAU); c.fill();
}
// ---------- 藍圖 ----------
function paintBlueprint() {
  const sc = 1, mg = 60, cv = mkCanvas((MAPW * T + mg * 2) * sc, (MAPH * T + mg * 2) * sc), c = cv.getContext('2d');
  c.translate(mg, mg);
  c.fillStyle = 'rgba(8,22,40,.92)'; c.fillRect(-mg, -mg, cv.width, cv.height);
  c.strokeStyle = 'rgba(110,170,230,.08)'; c.lineWidth = 1;
  for (let x = -mg; x < MAPW * T + mg; x += T / 2) { c.beginPath(); c.moveTo(x, -mg); c.lineTo(x, MAPH * T + mg); c.stroke(); }
  for (let y = -mg; y < MAPH * T + mg; y += T / 2) { c.beginPath(); c.moveTo(-mg, y); c.lineTo(MAPW * T + mg, y); c.stroke(); }
  for (const r of ROOMS) {
    c.fillStyle = 'rgba(30,60,96,.55)'; c.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
    c.strokeStyle = 'rgba(200,225,255,.85)'; c.lineWidth = 3; c.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
    c.font = `700 14px ${FONT_M}`; c.fillStyle = 'rgba(255,140,60,.55)'; c.textAlign = 'center'; if (r.kind !== 'hall') c.fillText(r.code, r.cx, r.y1 - 10);
  }
  for (const [x, y] of BLOCKED) { c.fillStyle = 'rgba(200,225,255,.16)'; c.fillRect(x * T + 4, y * T + 4, T - 8, T - 8); }
  return cv;
}
function drawBlueprint(c, t, a) {
  c.save(); c.globalAlpha = a;
  c.drawImage(BPIMG, -60, -60, BPIMG.width, BPIMG.height);
  const px = 1 / CAM.z;
  drawVentNet(c, t, px, .9);
  // 門
  for (const d of SHIP.doors) {
    const col = d.broken ? '#999' : d.welded ? '#ff8a3d' : d.state === 'open' ? '#86f0a0' : '#ff3d3d';
    c.strokeStyle = col; c.lineWidth = 7;
    c.beginPath(); if (d.orient === 'v') { c.moveTo(d.x, d.y - d.len / 2 + 4); c.lineTo(d.x, d.y + d.len / 2 - 4); } else { c.moveTo(d.x - d.len / 2 + 4, d.y); c.lineTo(d.x + d.len / 2 - 4, d.y); } c.stroke();
  }
  c.textAlign = 'center';
  // 房間名：放在左上角（門的按鈕多半在牆的中段）
  c.textAlign = 'left';
  for (const r of ROOMS) { if (r.kind === 'hall') continue; c.font = `900 ${12 * px}px ${FONT}`; c.fillStyle = 'rgba(8,20,36,.8)'; const w = c.measureText(r.name).width, lx = r.x0 + 8 + 2 * px, ly = r.y0 + 8; c.fillRect(lx - 3 * px, ly, w + 6 * px, 15 * px); c.fillStyle = W.lights[r.i].on && W.power.on.lights && !W.lights[r.i].broken ? 'rgba(236,240,255,.95)' : 'rgba(255,120,100,.95)'; c.fillText(r.name, lx, ly + 12 * px); }
  c.textAlign = 'center';
  for (const n of SHIP.vn) { c.fillStyle = n.sealed ? '#ff8a3d' : 'rgba(255,176,58,.9)'; c.fillRect(n.x - 6, n.y - 6, 12, 12); if (n.sealed) { c.strokeStyle = '#140900'; c.lineWidth = 2; c.beginPath(); c.moveTo(n.x - 5, n.y - 5); c.lineTo(n.x + 5, n.y + 5); c.stroke(); } }
  // 船員
  for (const m of W.crew) {
    if (m.dead) { c.fillStyle = 'rgba(255,61,61,.7)'; c.font = `900 ${18 * px}px ${FONT}`; c.textAlign = 'center'; c.fillText('✕', m.x, m.y + 6 * px); continue; }
    const col = CREW[m.ci].col;
    c.fillStyle = col; c.beginPath(); c.arc(m.x, m.y, 11 * px + 4, 0, TAU); c.fill();
    c.fillStyle = '#081420'; c.font = `900 ${12 * px + 3}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(CREW[m.ci].short, m.x, m.y + 1); c.textBaseline = 'alphabetic';
    if (W.sel === m.ci) { c.strokeStyle = '#fff'; c.lineWidth = 2.5 * px; c.beginPath(); c.arc(m.x, m.y, 15 * px + 6, 0, TAU); c.stroke(); }
  }
  // 牠（看得到才畫）
  const b = W.beast;
  if (b && b.visible && !b.inVent) { c.fillStyle = '#6fe8ff'; c.beginPath(); c.arc(b.x, b.y, 12 * px + 6, 0, TAU); c.fill(); c.fillStyle = '#081420'; c.font = `900 ${12 * px + 4}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('牠', b.x, b.y + 1); c.textBaseline = 'alphabetic'; }
  // 掃描線
  for (const f of W.fx) if (f.type === 'bsweep') { const y = lerp(-60, MAPH * T + 60, f.t / f.dur); const g = c.createLinearGradient(0, y - 80, 0, y); g.addColorStop(0, 'rgba(134,240,160,0)'); g.addColorStop(1, 'rgba(134,240,160,.35)'); c.fillStyle = g; c.fillRect(-60, y - 80, MAPW * T + 120, 80); }
  for (const bl of W.blips) { const u = bl.t / 2.2; c.fillStyle = bl.vent ? `rgba(255,160,60,${1 - u})` : `rgba(255,60,60,${1 - u})`; c.beginPath(); c.arc(bl.x, bl.y, 9 * px + 4, 0, TAU); c.fill(); }
  if (W.nest) { c.strokeStyle = '#6fe8ff'; c.lineWidth = 3; c.setLineDash([8, 6]); c.beginPath(); c.arc(W.nest.x, W.nest.y, 60, 0, TAU); c.stroke(); c.setLineDash([]); }
  c.restore();
  drawDoorButtons(c, t, 1 / CAM.z);
}
// ---------- 畫面效果 ----------
function drawScreenFx(c, t) {
  const w = CV.width, h = CV.height;
  // 暗角
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.max(w, h) * .75);
  const tn = W ? W.tension : 0;
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.45 + tn * .25})`);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  if (W && W.grabbing) { c.fillStyle = `rgba(160,0,0,${.12 + .08 * Math.sin(t * 10)})`; c.fillRect(0, 0, w, h); }
  if (W && !W.power.on.lights) { c.fillStyle = `rgba(80,0,0,${.06 + .04 * Math.sin(t * 2)})`; c.fillRect(0, 0, w, h); }
  if (W && W.sys.sd >= 0) { c.fillStyle = `rgba(255,30,30,${.06 + .06 * Math.sin(t * 8)})`; c.fillRect(0, 0, w, h); }
  for (const f of (W ? W.fx : [])) if (f.type === 'vent') { const u = f.t / f.dur, near = clamp(1 - dist(CAM.x, CAM.y, ROOM.airlock.cx, ROOM.airlock.cy) / (T * 16), .2, 1); c.fillStyle = `rgba(230,240,255,${.16 * (1 - u) * (1 - u) * (1 - u) * near})`; c.fillRect(0, 0, w, h); }
  // 掃描線（細）
  if (UI.bridgeMode) { c.fillStyle = 'rgba(134,240,160,.03)'; for (let y = 0; y < h; y += 4 * DPR) c.fillRect(0, y, w, DPR); }
}
