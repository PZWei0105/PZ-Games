/* ============ 09 繪製 ============ */
const R = { cv: null, ctx: null, w: 0, h: 0, dpr: 1, dprCap: 2, zoom: 1, lm: null, lctx: null, LS: .5, snow: [], t: 0, mini: null, mctx: null, miniT: 0, slowT: 0, ema: 1 / 60 };
function initRender() {
  R.cv = $('#cv'); R.ctx = R.cv.getContext('2d');
  R.lm = makeCanvas(10, 10); R.lctx = R.lm.getContext('2d');
  R.gm = makeCanvas(10, 10); R.gctx = R.gm.getContext('2d');
  R.mini = $('#minimap'); R.mctx = R.mini.getContext('2d');
  for (let k = 0; k < 90; k++) R.snow.push({ x: Math.random(), y: Math.random(), z: rand(.2, 1), s: rand(.6, 2.2), o: rand(.15, .55) });
  resize();
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight, dpr = Math.min(R.dprCap, window.devicePixelRatio || 1);
  R.w = w; R.h = h; R.dpr = dpr;
  R.cv.width = Math.round(w * dpr); R.cv.height = Math.round(h * dpr);
  R.lm.width = Math.ceil(w * R.LS); R.lm.height = Math.ceil(h * R.LS);
  R.gm.width = R.lm.width; R.gm.height = R.lm.height;
  const portrait = h >= w;
  R.zoom = portrait ? Math.min(w / 430, h / (FH * 2.9)) : clamp(Math.min(w / 430, h / (FH * 2.15)), .62, 1.35);
  const want = clamp(R.zoom * dpr, 1, 1.8);
  if (W && Math.abs(want - ART_SCALE) > .25) { ART_SCALE = want; for (const r of W.rooms) r.bg = paintRoom(r, W.M); }
  else ART_SCALE = want;
}
const toSX = x => (x - R.camX) * R.zoom + R.w / 2;
const toSY = y => (y - R.camY) * R.zoom + R.h / 2;

function render(dt) {
  R.t += dt;
  const ctx = R.ctx;
  ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  if (S.mode === 'dive' && W) renderDive(dt);
  else renderMenu(dt);
}

/* ---------- 站體外殼頂部 ---------- */
function drawHullTop(ctx, totW, t) {
  // 弧形頂殼
  ctx.fillStyle = '#0e171b';
  ctx.beginPath(); ctx.moveTo(-14, -12);
  ctx.quadraticCurveTo(totW / 2, -70, totW + 14, -12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2d3a41'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-14, -12); ctx.quadraticCurveTo(totW / 2, -70, totW + 14, -12); ctx.stroke();
  // 肋條
  ctx.strokeStyle = 'rgba(80,100,110,.35)'; ctx.lineWidth = 3;
  for (let x = 40; x < totW; x += 90) { const yy = -12 - 58 * (1 - Math.pow((x - totW / 2) / (totW / 2 + 14), 2)) * .97; ctx.beginPath(); ctx.moveTo(x, -12); ctx.lineTo(x, yy + 4); ctx.stroke(); }
  // 纜繩往上消失
  ctx.strokeStyle = 'rgba(120,150,160,.28)'; ctx.lineWidth = 3;
  for (const fx of [.22, .78]) { const x = totW * fx; ctx.beginPath(); ctx.moveTo(x, -40); ctx.bezierCurveTo(x + 10, -300, x - 30, -600, x + 20, -1100); ctx.stroke(); }
  // 天線與信標
  for (const fx of [.1, .5, .9]) {
    const x = totW * fx, base = -12 - 58 * (1 - Math.pow((x - totW / 2) / (totW / 2 + 14), 2)) * .97;
    ctx.fillStyle = '#1a252b'; ctx.fillRect(x - 3, base - 70, 6, 72); ctx.fillRect(x - 16, base - 44, 32, 4);
    const on = (t * .8 + fx) % 1 < .18;
    ctx.fillStyle = on ? '#ff4d5e' : '#4a1a20'; ctx.beginPath(); ctx.arc(x, base - 74, 5, 0, TAU); ctx.fill();
    if (on) { ctx.fillStyle = 'rgba(255,77,94,.25)'; ctx.beginPath(); ctx.arc(x, base - 74, 22, 0, TAU); ctx.fill(); }
  }
  // 站名
  ctx.save(); ctx.fillStyle = 'rgba(180,210,220,.16)'; ctx.font = '900 34px "Noto Sans TC",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('瀚淵站  HANYUAN', totW / 2, -24); ctx.restore();
}

/* ---------- 海床 ---------- */
const seabedY = (x, totH) => totH + 214 + 10 + 16 * Math.sin(x * .013) + 8 * Math.sin(x * .041);
function seabedDots(totW, totH) { const out = []; for (let k = 0; k < 12; k++) { const x = (k * 211) % (totW + 500) - 250; out.push([x, seabedY(x, totH) - 3, k]); } return out; }
function drawSeabed(ctx, totW, totH, t) {
  ctx.fillStyle = '#071017';
  ctx.beginPath(); ctx.moveTo(-700, totH + 1200);
  for (let x = -700; x <= totW + 700; x += 40) ctx.lineTo(x, seabedY(x, totH));
  ctx.lineTo(totW + 700, totH + 1200); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0c1a21';
  for (let k = 0; k < 16; k++) { const x = -500 + k * (totW + 1000) / 16 + 40 * Math.sin(k * 7.3), w = 34 + 22 * ((k * 37) % 5); ctx.beginPath(); ctx.ellipse(x, seabedY(x, totH) + 8, w, 12 + (k % 3) * 7, 0, Math.PI, 0); ctx.fill(); }
  for (const [x, y, k] of seabedDots(totW, totH)) {
    ctx.strokeStyle = 'rgba(160,210,220,.25)'; ctx.lineWidth = 2;
    for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(x + j * 6 - 6, y + 4); ctx.quadraticCurveTo(x + j * 6 - 6 + Math.sin(t * 1.3 + j + k) * 4, y - 10, x + j * 6 - 6 + Math.sin(t * 1.1 + j + k) * 6, y - 18 - j * 3); ctx.stroke(); }
    ctx.fillStyle = `rgba(95,231,255,${.45 + .25 * Math.sin(t * 2 + k)})`; ctx.beginPath(); ctx.arc(x, y - 18, 2.6, 0, TAU); ctx.fill();
  }
}

/* ---------- 海 ---------- */
function drawOcean(ctx, cx, cy, deep) {
  const g = ctx.createLinearGradient(0, 0, 0, R.h);
  g.addColorStop(0, deep ? '#031019' : '#05202e'); g.addColorStop(.55, '#020a10'); g.addColorStop(1, '#000306');
  ctx.fillStyle = g; ctx.fillRect(0, 0, R.w, R.h);
  for (const s of R.snow) {
    s.y += .00025 * s.z; if (s.y > 1.05) { s.y = -.05; s.x = Math.random(); }
    const x = ((s.x * R.w * 1.4 - cx * s.z * .25) % (R.w * 1.4) + R.w * 1.4) % (R.w * 1.4) - R.w * .2;
    const y = ((s.y * R.h * 1.3 - cy * s.z * .25) % (R.h * 1.3) + R.h * 1.3) % (R.h * 1.3) - R.h * .15;
    ctx.fillStyle = `rgba(190,230,240,${s.o * s.z})`; ctx.fillRect(x, y, s.s * s.z, s.s * s.z);
  }
}

/* ---------- 下潛畫面 ---------- */
function renderDive(dt) {
  const ctx = R.ctx, p = W.P, t = R.t;
  // 鏡頭
  const lookX = p.x + p.face * 36, lookY = p.y - 96;
  if (R.camX == null || R.snapCam) { R.camX = lookX; R.camY = lookY; R.snapCam = false; }
  R.camX = lerp(R.camX, lookX, Math.min(1, dt * 5)); R.camY = lerp(R.camY, lookY, Math.min(1, dt * 5));
  const halfW = R.w / 2 / R.zoom, halfH = R.h / 2 / R.zoom, totW = W.C * RW, totH = W.F * FH;
  if (totW < halfW * 2 - 120) R.camX = totW / 2; else R.camX = clamp(R.camX, halfW - 110, totW - halfW + 110);
  // 上方要讓出 HUD 的空間：最上層的房間不會被介面蓋住
  const port = R.h > R.w, compactL = !port && R.h <= 500;
  const topPad = (port ? 236 : compactL ? 96 : 160) / R.zoom, botPad = (port ? 310 : compactL ? 120 : 220) / R.zoom;
  R.camY = clamp(R.camY, halfH - topPad, Math.max(halfH - topPad, totH - halfH + botPad));
  const sh = G.settings.shake ? W.shake : 0;
  const sway = W.P.stealth ? Math.sin(t * 1.25) * 1.6 * clamp((W.heart - 90) / 50, 0, 1) : 0;
  const sx = sh ? rand(-sh, sh) * .6 : 0, sy = (sh ? rand(-sh, sh) * .6 : 0) + sway;
  // 警示燈與頻閃（深壓 60%／85% 以後、撤離倒數、最終區）
  const live = W.state === 'play' && !blocked();
  R.alarm = W.stage >= 2 || W.dock.called || !!W.ending;
  const strobeOn = G.settings.flash !== false && live && (W.stage >= 3 || (W.dock.called && !W.dock.arrived) || !!W.ending);
  R.strobeT = (R.strobeT || 0) - dt;
  if (strobeOn && R.strobeT <= 0) { R.strobeT = rand(.55, 1.9); R.strobeA = 1; AU.play('strobe', { vol: .8 }); }
  R.strobeA = Math.max(0, (R.strobeA || 0) - dt * 13);
  drawOcean(ctx, R.camX, R.camY, W.si >= 3);
  // 遠方的影子（第 4、5 區偶爾看得到母聆）
  if (W.si >= 3 || W.S.endless) drawLeviathan(ctx, t, .35);
  ctx.save();
  ctx.translate(R.w / 2 + sx, R.h / 2 + sy); ctx.scale(R.zoom, R.zoom); ctx.translate(-R.camX, -R.camY);
  const vx0 = R.camX - halfW - 20, vx1 = R.camX + halfW + 20, vy0 = R.camY - halfH - 20, vy1 = R.camY + halfH + 20;
  const vis = W.rooms.filter(r => r.x0 + RW > vx0 && r.x0 < vx1 && r.y0 + FH > vy0 && r.y0 < vy1);
  // 外殼框
  ctx.fillStyle = '#0b1215'; ctx.fillRect(-14, -14, totW + 28, totH + 28);
  ctx.strokeStyle = '#2d3a41'; ctx.lineWidth = 6; ctx.strokeRect(-11, -11, totW + 22, totH + 22);
  ctx.fillStyle = '#121a1e'; for (let x = 60; x < totW; x += 240) { ctx.fillRect(x, totH + 14, 22, 200); ctx.fillRect(x - 30, totH + 200, 82, 14); }
  if (vy0 < 0) drawHullTop(ctx, totW, t);
  if (vy1 > totH + 180) drawSeabed(ctx, totW, totH, t);
  for (const r of vis) ctx.drawImage(r.bg, r.x0, r.y0, RW, FH);
  for (const r of vis) drawRoomDyn(ctx, r, t);
  for (const d of W.doors) if (d.x > vx0 && d.x < vx1 && d.y > vy0 && d.y - DOORH < vy1) drawDoor(ctx, d, t);
  // 掉落物
  for (const it of W.items) drawItem(ctx, it, t);
  for (const d of W.decoys) { drawItem(ctx, { kind: 'decoy', x: d.x, y: d.y + 6, ground: false }, t); if (d.landed && (t * 3) % 1 < .5) { ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.arc(d.x, d.y - 18, 3, 0, TAU); ctx.fill(); } }
  // 生物
  const sv = W.M.survivors; for (const s of sv) if (s.x > vx0 && s.x < vx1) drawSurvivor(ctx, s, t);
  for (const e of W.foes) { if (e.x < vx0 - 60 || e.x > vx1 + 60 || e.y < vy0 - 40 || e.y > vy1 + 200) continue; drawFoeWrap(ctx, e, t); }
  const h = W.hunter;
  if (h && (onMap(h) || (h.dead && h.deadT < 3))) drawHunterWrap(ctx, h, t);
  if (W.mother && !W.mother.dead && W.mother.state !== 'lured') drawHunter(ctx, W.mother, t, 1.55, true);
  for (const c of W.clouds) drawCloud(ctx, c, t);
  if (p.caught) drawCaught(ctx, p, t);
  else if (p.hide) drawHidden(ctx, p, t);
  else if (W.state !== 'over' || W.finishedKind !== 'pod') drawDiver(ctx, p, t);
  for (const d of W.drones) drawDrone(ctx, d, t);
  // 子彈與特效
  drawProjs(ctx);
  drawFX(ctx, t);
  drawSteam(ctx);
  // 水
  for (const r of vis) drawWater(ctx, r, t);
  ctx.restore();
  // 光照
  drawLighting(ctx, vis, t);
  // 聆：暗色剪影，只有光照到、頻閃、槍口火光或中彈時才看得清楚
  if ((h && onMap(h)) || (W.mother && !W.mother.dead && W.mother.state !== 'lured')) {
    ctx.save(); ctx.translate(R.w / 2 + sx, R.h / 2 + sy); ctx.scale(R.zoom, R.zoom); ctx.translate(-R.camX, -R.camY);
    if (h && onMap(h)) { const a = hunterSil(h); if (a > .02) { ctx.globalAlpha = a; drawHunter(ctx, h, t, 1, false, true); } }
    const m = W.mother; if (m && !m.dead && m.state !== 'lured') { const a = hunterSil(m) * .8; if (a > .02) { ctx.globalAlpha = a; drawHunter(ctx, m, t, 1.55, true, true); } }
    ctx.restore();
  }
  // 聲波圈、數字、提示（在光照之上）
  ctx.save(); ctx.translate(R.w / 2 + sx, R.h / 2 + sy); ctx.scale(R.zoom, R.zoom); ctx.translate(-R.camX, -R.camY);
  drawSteam(ctx, .32);
  drawPulses(ctx);
  drawWorldHints(ctx, vis, t);
  drawNums(ctx);
  ctx.restore();
  drawEdge(ctx, t);
  // 暗角
  const vg = ctx.createRadialGradient(R.w / 2, R.h / 2, Math.min(R.w, R.h) * .35, R.w / 2, R.h / 2, Math.max(R.w, R.h) * .75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${.55 + W.heartProx * .25})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, R.w, R.h);
  if (W.heartProx > .35) { const a = (W.heartProx - .35) * .35 * (.6 + .4 * Math.sin(t * W.heart / 60 * TAU)); ctx.fillStyle = `rgba(120,0,15,${a})`; ctx.fillRect(0, 0, R.w, R.h); }
  if (AU.under) { ctx.fillStyle = 'rgba(10,60,90,.25)'; ctx.fillRect(0, 0, R.w, R.h); }
  if (R.strobeA > 0) { ctx.fillStyle = `rgba(225,238,255,${.1 * R.strobeA})`; ctx.fillRect(0, 0, R.w, R.h); }
  R.miniT -= dt; if (R.miniT <= 0) { R.miniT = W.tracker.on ? .07 : .15; drawMinimap(R.mctx, R.mini.width, R.mini.height, false); }
  if (UI.bigMap) { if (!UI.modalOpen || !document.body.contains(UI.bigMap.canvas)) UI.bigMap = null; else { R.bigT = (R.bigT || 0) - dt; if (R.bigT <= 0) { R.bigT = .08; drawMinimap(UI.bigMap, 640, 560, true); } } }
}
/* 聆的剪影濃度：1 = 全黑剪影，0 = 照亮看清楚 */
function hunterSil(h) {
  const p = W.P;
  let a = .9;
  a *= 1 - clamp(R.strobeA || 0, 0, 1);
  a *= 1 - clamp((h.flash || 0) * 1.6, 0, 1);
  if (!p.climb && floorOf(p.y) === floorOf(h.y) && sgn(h.x - p.x) === p.face && Math.abs(h.x - p.x) < (p.stealth ? 210 : 340)) a *= .4;
  for (const f of W.fx) if (f.k === 'light' && Math.abs(f.x - h.x) < f.r && Math.abs(f.y - (h.y - 90)) < f.r + 60) { a *= .45; break; }
  if (h.state === 'stun' || h.state === 'trapped') a *= .45;
  if (h.state === 'attack' || h.state === 'grab') a *= .6;
  return a;
}
/* 蒸氣 */
function puffSprite() {
  if (R.puff) return R.puff;
  const c = makeCanvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(200,214,222,.85)'); g.addColorStop(.5, 'rgba(190,206,216,.35)'); g.addColorStop(1, 'rgba(185,200,210,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return (R.puff = c);
}
function drawSteam(ctx, k = 1) {
  if (!W.puffs.length) return;
  const sp = puffSprite();
  for (const f of W.puffs) {
    const u = f.t / f.life, sz = lerp(f.s0, f.s1, u);
    ctx.globalAlpha = .22 * k * (1 - u) * Math.min(1, f.t * 4);
    ctx.drawImage(sp, f.x - sz, f.y - sz, sz * 2, sz * 2);
  }
  ctx.globalAlpha = 1;
}
/* 膠片顆粒：做成 CSS 疊層（瀏覽器合成，不佔每格的畫布時間） */
function setupGrain() {
  const el = $('#grain'); if (!el) return;
  if (!R.grainURL) {
    const c = makeCanvas(160, 160), x = c.getContext('2d'), id = x.createImageData(160, 160);
    for (let i = 0; i < id.data.length; i += 4) { const v = (Math.random() * 255) | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = Math.random() < .55 ? 0 : (Math.random() * 42) | 0; }
    x.putImageData(id, 0, 0); try { R.grainURL = c.toDataURL('image/png'); } catch (e) { R.grainURL = ''; }
    if (R.grainURL) el.style.backgroundImage = `url(${R.grainURL})`;
  }
  el.classList.toggle('on', G.settings.grain !== false && !!R.grainURL);
}
function drawLeviathan(ctx, t, a) {
  const per = 70, ph = (t % per) / per;
  if (ph > .45) return;
  const x = lerp(-R.w * .6, R.w * 1.6, ph / .45), y = R.h * .3 + Math.sin(t * .2) * 30;
  ctx.save(); ctx.globalAlpha = a * Math.sin(ph / .45 * Math.PI);
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y, R.w * .55, R.h * .12, -.05, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(95,231,255,.35)'; ctx.lineWidth = 3;
  for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(x + R.w * .48, y - 10, 20 * k, 34 * k, 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
function drawFoeWrap(ctx, e, t) {
  if (e.dead) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - e.deadT / .4); drawFoe(ctx, e, t); ctx.restore(); return; }
  if (e.lurk) { ctx.save(); ctx.globalAlpha = .22 + .08 * Math.sin(t * 2 + e.seed); drawFoe(ctx, e, t); ctx.restore(); return; }
  if (e.spawnT > 0) { ctx.save(); ctx.globalAlpha = 1 - e.spawnT * 1.6; drawFoe(ctx, e, t); ctx.restore(); return; }
  drawFoe(ctx, e, t);
  if (e.hp < e.hpMax && !e.dead && e.type !== 'wall') { const w = 28, y = e.y - e.def.h * 1.05 - (e.def.fly ? 44 : 10); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(e.x - w / 2, y, w, 3); ctx.fillStyle = '#ff8a6a'; ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.hpMax), 3); }
}
function drawHunterWrap(ctx, h, t) {
  if (h.dead) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - h.deadT / 4); ctx.translate(h.x, h.y); ctx.rotate(-Math.min(1.45, h.deadT * 1.6) * h.face); ctx.translate(-h.x, -h.y); drawHunter(ctx, h, t); ctx.restore(); return; }
  if (h.state === 'trapped') { ctx.save(); ctx.translate(rand(-3, 3), rand(-2, 2)); drawHunter(ctx, h, t + rand(0, 3)); ctx.restore(); return; }
  drawHunter(ctx, h, t);
  const top = h.y - (h.quad > .5 ? 120 : 210);
  if (h.state === 'stun') { ctx.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { const a = t * 5 + k * 2.1; ctx.beginPath(); ctx.arc(h.x + h.face * 36 + Math.cos(a) * 24, top + 14 + Math.sin(a) * 6, 3, 0, TAU); ctx.fill(); } }
  if (h.heard > 0) { h.heard = Math.max(0, h.heard - 1 / 60); ctx.save(); ctx.globalAlpha = h.heard; ctx.font = '900 26px "Rajdhani",sans-serif'; ctx.fillStyle = h.state === 'hunt' || h.state === 'attack' ? '#ff3b4e' : '#ffb03a'; ctx.textAlign = 'center'; ctx.fillText(h.state === 'hunt' || h.state === 'attack' ? '!' : '?', h.x + h.face * 36, top - (1 - h.heard) * 10); ctx.restore(); }
}
function drawDrone(ctx, d, t) {
  ctx.save(); ctx.translate(d.x, d.y);
  ctx.fillStyle = '#4a5a62'; rrect(ctx, -11, -5, 22, 10, 3); ctx.fill();
  ctx.fillStyle = d.state === 'hover' && (t * 3) % 1 < .5 ? '#ffffff' : '#a6ff9e'; ctx.fillRect(-4, -1, 8, 3);
  ctx.strokeStyle = 'rgba(200,220,230,.6)'; ctx.lineWidth = 1.5; const s = Math.sin(t * 60) * 7;
  ctx.beginPath(); ctx.moveTo(-14 - s * .3, -7); ctx.lineTo(-4, -7); ctx.moveTo(4, -7); ctx.lineTo(14 + s * .3, -7); ctx.stroke();
  ctx.restore();
}

/* 躲起來的你：櫃子門縫裡的面罩反光、床底下的黑影；沒憋氣的時候，呼出的白霧會從縫裡飄出來 */
function drawHidden(ctx, p, t) {
  const sp = p.hide.spot, y = p.y;
  if (p.hide.type === 'locker') {
    const g = .5 + .5 * Math.sin(t * 1.3);
    ctx.fillStyle = `rgba(95,231,255,${.35 + .25 * g})`; ctx.fillRect(sp.x + p.face * 3 - 3, y - 92, 6, 1.6);
  } else {
    const yy = y - (p.hide.type === 'bed' ? 9 : 11);
    ctx.fillStyle = 'rgba(4,7,9,.92)'; ctx.beginPath(); ctx.ellipse(sp.x - p.face * 6, yy, 28, 8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(sp.x + p.face * 22, yy - 3, 8.5, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(95,231,255,.55)'; ctx.fillRect(sp.x + p.face * 24 - 2, yy - 5, 5, 2);
  }
  if (!p.hold && W.state === 'play') {
    const k = (t * .8) % 1, ox = p.hide.type === 'locker' ? sp.x + p.face * 10 : sp.x + p.face * 30, oy = p.hide.type === 'locker' ? y - 90 : y - 18;
    ctx.fillStyle = `rgba(220,235,240,${.22 * (1 - k)})`; ctx.beginPath(); ctx.arc(ox + p.face * k * 10, oy - k * 16, 3 + k * 6, 0, TAU); ctx.fill();
  }
}
/* 被抓住：牠把你舉起來 */
function drawCaught(ctx, p, t) {
  const h = W.caughtBy === 'mother' ? W.mother : W.hunter;
  if (!h) { drawDiver(ctx, p, t); return; }
  const sc = h.mother ? 1.55 : 1, u = clamp((h.grabT || 0) / .5, 0, 1);
  const hx = lerp(p.x, h.x + h.face * 64 * sc, u), hy = lerp(p.y, h.y - 150 * sc, u);
  ctx.save(); ctx.translate(hx + rand(-2, 2), hy + rand(-2, 2)); ctx.rotate(-h.face * (.4 + Math.sin(t * 22) * .12)); ctx.translate(0, 40);
  const q = Object.assign({}, p, { x: 0, y: 0, moving: true, walk: t * 30, climb: null, flash: .2 });
  drawDiver(ctx, q, t);
  ctx.restore();
}
function drawCloud(ctx, c, t) {
  const u = c.t / c.life, a = (u < .15 ? u / .15 : u > .75 ? (1 - u) / .25 : 1) * .5, rr = c.r * (.75 + .25 * Math.min(1, c.t * 3));
  const g = ctx.createRadialGradient(c.x, c.y, rr * .1, c.x, c.y, rr);
  g.addColorStop(0, `rgba(215,240,255,${a * .55})`); g.addColorStop(.7, `rgba(190,230,255,${a * .35})`); g.addColorStop(1, 'rgba(190,230,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c.x, c.y, rr, rr * .55, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = `rgba(240,250,255,${a})`;
  for (let k = 0; k < 10; k++) { const ang = t * .6 + k * .63, rad = rr * (.3 + (k % 4) * .17); ctx.fillRect(c.x + Math.cos(ang) * rad, c.y + Math.sin(ang * 1.3) * rad * .45, 2, 2); }
}

/* ---------- 房間的動態部分 ---------- */
function beaconPos(r) { return { x: r.x0 + (r.i % 2 ? 46 : RW - 46), y: r.y0 + (r.f === 0 ? 18 : 0) + 40 }; }
function drawRoomDyn(ctx, r, t) {
  if (r.collapsed) return;
  // 警示燈
  if (R.alarm) {
    const b = beaconPos(r), ang = t * 2.6 + r.i * 1.7, face = .5 + .5 * Math.sin(ang);
    ctx.fillStyle = '#1b2226'; ctx.fillRect(b.x - 9, b.y - 6, 18, 5);
    ctx.fillStyle = `rgba(255,${50 + 70 * face},${60 + 30 * face},${.5 + .5 * face})`; ctx.beginPath(); ctx.arc(b.x, b.y, 7, Math.PI, 0); ctx.fill();
    ctx.fillStyle = `rgba(255,230,220,${.7 * face})`; ctx.fillRect(b.x - 1.5 + Math.cos(ang) * 4, b.y - 5, 3, 3);
  }
  // 通風口葉片
  if (r.vent) {
    const v = r.vent, s = v.shake > 0 ? rand(-2.5, 2.5) * v.shake : 0;
    ctx.fillStyle = '#56666e';
    for (let k = 0; k < 5; k++) ctx.fillRect(v.x - 23 + s, v.y - 12 + k * 6 + (v.shake > 0 ? rand(-1, 1) : 0), 46, 2.5);
    if (v.shake > .2) { ctx.fillStyle = `rgba(255,59,78,${.4 * v.shake})`; ctx.beginPath(); ctx.arc(v.x, v.y, 32, 0, TAU); ctx.fill(); }
  }
  // 舷窗：外面的海
  for (const w of r.windows || []) {
    const wx = r.x0 + w.x, wy = r.y0 + w.y;
    const g = ctx.createRadialGradient(wx - w.r * .3, wy - w.r * .3, 1, wx, wy, w.r);
    g.addColorStop(0, 'rgba(60,170,200,.35)'); g.addColorStop(1, 'rgba(5,30,45,.6)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(wx, wy, w.r, 0, TAU); ctx.fill();
    const fx = ((t * 18 + r.i * 53) % (w.r * 6)) - w.r * 3;
    if (Math.abs(fx) < w.r) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.ellipse(wx + fx, wy + Math.sin(t + r.i) * 4, w.r * .35, w.r * .12, 0, 0, TAU); ctx.fill(); }
    for (let k = 0; k < 3; k++) { const yy = ((t * 6 + k * 13 + r.i * 7) % (w.r * 2)) - w.r; ctx.fillStyle = 'rgba(200,240,255,.35)'; ctx.fillRect(wx - w.r * .6 + k * w.r * .5, wy + yy, 1.5, 1.5); }
  }
  // 破口
  if (r.breach) {
    const b = r.breach;
    ctx.strokeStyle = '#05080a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x - 14, b.y - 18); ctx.lineTo(b.x - 3, b.y - 4); ctx.lineTo(b.x - 9, b.y + 6); ctx.lineTo(b.x + 4, b.y + 18); ctx.moveTo(b.x - 3, b.y - 4); ctx.lineTo(b.x + 12, b.y - 10); ctx.stroke();
    for (let k = 0; k < 7; k++) { const u = ((t * 2.6 + k / 7) % 1); const dir = r.c === 0 ? 1 : r.c === W.C - 1 ? -1 : (k % 2 ? 1 : -1); ctx.fillStyle = `rgba(190,235,255,${.7 * (1 - u)})`; ctx.beginPath(); ctx.arc(b.x + dir * u * 90, b.y + u * u * (r.floorY - b.y), 3 + u * 5, 0, TAU); ctx.fill(); }
  }
  // 陷阱：配電箱與海水閘
  if (r.trap) {
    const T = r.trap, bx = T.bx, by = T.by;
    ctx.fillStyle = '#1b2226'; ctx.fillRect(bx - 2, by + 18, 4, r.floorY - by - 18);
    ctx.fillStyle = '#2d383e'; rrect(ctx, bx - 16, by - 22, 32, 40, 3); ctx.fill();
    ctx.strokeStyle = '#56646b'; ctx.lineWidth = 1.5; ctx.strokeRect(bx - 16, by - 22, 32, 40);
    hazard(ctx, bx - 16, by - 27, 32, 5, 4);
    const lampC = T.state === 'armed' ? (Math.sin(t * 7) > 0 ? '#ffd23a' : '#8a6a10') : T.state === 'spent' ? '#2a2222' : '#8a1a24';
    ctx.fillStyle = lampC; ctx.beginPath(); ctx.arc(bx + 9, by - 14, 3.2, 0, TAU); ctx.fill();
    ctx.fillStyle = T.state === 'spent' ? '#3a3a30' : '#ffcf5a'; ctx.beginPath(); ctx.moveTo(bx + 2, by - 10); ctx.lineTo(bx - 5, by + 2); ctx.lineTo(bx, by + 2); ctx.lineTo(bx - 3, by + 12); ctx.lineTo(bx + 6, by - 1); ctx.lineTo(bx + 1, by - 1); ctx.closePath(); ctx.fill();
    if (T.state === 'armed' && Math.sin(t * 13 + bx) > .93) { ctx.fillStyle = '#fff6c8'; ctx.fillRect(bx - 12 + rand(0, 24), by + 16, 2, 2); }
    const vx = T.vx, fy = r.floorY;
    ctx.fillStyle = '#2d383e'; ctx.fillRect(vx - 18, fy - 8, 36, 8); ctx.fillStyle = '#3e4c53'; ctx.fillRect(vx - 4, fy - 40, 8, 32); ctx.fillRect(vx - 4, fy - 44, 26, 7);
    ctx.save(); ctx.translate(vx, fy - 30); ctx.rotate((T.flood > 0 ? t * 3 : 0) + (T.flood === 0 && r.water > .5 ? 1.2 : 0));
    ctx.strokeStyle = '#c84a3a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.moveTo(0, -11); ctx.lineTo(0, 11); ctx.stroke(); ctx.restore();
    if (T.flood > 0) for (let k = 0; k < 8; k++) { const u = (t * 2.2 + k / 8) % 1; ctx.fillStyle = `rgba(170,230,250,${.7 * (1 - u)})`; ctx.beginPath(); ctx.arc(vx + 22 + u * 20, fy - 40 + u * u * 40, 2.5 + u * 3, 0, TAU); ctx.fill(); }
  }
  // 機器在運轉：抖動、警示燈；被拆掉的會冒火花
  for (const m of r.machines || []) {
    if (m.on > 0) { const on = Math.sin(t * 10) > 0; ctx.fillStyle = on ? '#ffb03a' : '#5a3a10'; ctx.beginPath(); ctx.arc(m.x, r.floorY - 136, 4, 0, TAU); ctx.fill(); ctx.strokeStyle = `rgba(255,190,90,${.35 + .3 * Math.sin(t * 20)})`; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(m.x, r.floorY - 70, 30 + k * 12 + ((t * 30) % 12), -.9, -.3); ctx.stroke(); ctx.beginPath(); ctx.arc(m.x, r.floorY - 70, 30 + k * 12 + ((t * 30) % 12), Math.PI + .3, Math.PI + .9); ctx.stroke(); } }
    else if (m.broken && Math.sin(t * 9 + m.x) > .95) { ctx.fillStyle = '#ffd28a'; ctx.fillRect(m.x + rand(-20, 20), r.floorY - rand(40, 100), 2, 2); }
  }
  // 閃爍伺服器燈
  if (r.blink) for (const bl of r.blink) for (let k = 0; k < 8; k++) if (Math.sin(t * 4 + k * 7 + bl.x) > .6) { ctx.fillStyle = k % 3 ? '#5aff8a' : '#ffcf5a'; ctx.fillRect(bl.x, bl.y + k * 14, 3, 2); }
  // 逃生艙電池燈
  const pod = W.pods.find(q => q.room === r.i);
  if (pod && r.podPos) for (let k = 0; k < 3; k++) { ctx.fillStyle = k < pod.cells ? '#ffcf3a' : '#2a343a'; ctx.beginPath(); ctx.arc(r.podPos.x - 16 + k * 16, r.podPos.y + 12, 4.5, 0, TAU); ctx.fill(); }
  // 撤離塢：月池邊的維修坑格柵
  for (const sp of r.hides || []) if (sp.kind === 'grate') { ctx.fillStyle = '#0b1013'; ctx.fillRect(sp.x - 20, r.floorY - 3, 40, 5); ctx.strokeStyle = '#56646b'; ctx.lineWidth = 1.5; for (let k = -16; k <= 16; k += 6) { ctx.beginPath(); ctx.moveTo(sp.x + k, r.floorY - 3); ctx.lineTo(sp.x + k, r.floorY + 2); ctx.stroke(); } }
  // 撤離塢：月池與潛艇
  if (r.moon) {
    const m = r.moon, wy = r.floorY + 6;
    ctx.fillStyle = 'rgba(20,90,120,.75)'; ctx.fillRect(m.x, wy, m.w, SLAB + 40);
    ctx.strokeStyle = 'rgba(170,240,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let x = 0; x <= m.w; x += 8) { const y = wy + Math.sin(x * .08 + t * 2.4) * 2; x ? ctx.lineTo(m.x + x, y) : ctx.moveTo(m.x, y); } ctx.stroke();
    const D = W.dock;
    if (D.called) {
      const rise = D.arrived ? ease.outCubic(D.rise) : 0, sy = r.floorY + 70 - rise * 64;
      if (D.arrived || D.t < 6) drawSub(ctx, m.x + m.w / 2, sy, t, D.arrived);
      if (!D.arrived) { ctx.fillStyle = `rgba(255,176,58,${.5 + .5 * Math.sin(t * 6)})`; ctx.fillRect(m.x, r.floorY - 2, m.w, 3); }
    }
  }
  // 收容深艙
  if (r.special === 'deep' && r.tank) {
    const tk = r.tank;
    drawYi(ctx, tk.x, tk.y + 20, t, W.ending === 'A' || W.ending === 'B' ? clamp(1 - (W.t - (W.endT || W.t)) / 3, 0, 1) : W.ending === 'C' ? 0 : 1);
    if (W.lin) {
      if (W.linState === 'sit') drawLin(ctx, W.lin.x, W.lin.y, t, false);
      else if (W.linState === 'gate' || W.linState === 'go') drawLin(ctx, W.lin.x + (W.linState === 'go' ? -1 : 1) * Math.min(160, (W.t - (W.endT || W.t)) * 40), W.lin.y, t, true);
    }
  }
}
function drawSub(ctx, x, y, t, lit) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#c86a24'; rrect(ctx, -82, -34, 164, 52, 26); ctx.fill();
  ctx.fillStyle = '#8a4614'; ctx.fillRect(-82, 2, 164, 16);
  ctx.fillStyle = '#d9772e'; rrect(ctx, -26, -60, 52, 30, 10); ctx.fill();
  for (let k = -1; k <= 1; k++) { ctx.fillStyle = '#0b1a20'; ctx.beginPath(); ctx.arc(k * 34, -12, 9, 0, TAU); ctx.fill(); ctx.fillStyle = lit ? 'rgba(255,220,140,.8)' : 'rgba(95,231,255,.3)'; ctx.beginPath(); ctx.arc(k * 34, -12, 6, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#fff'; ctx.font = '900 11px "Rajdhani",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('HAIYAN-2', 0, -40);
  ctx.restore();
}
function drawDoor(ctx, d, t) {
  const fy = d.y, top = fy - DOORH, x = d.x + (d.shake > 0 ? rand(-2, 2) * d.shake : 0);
  if (d.state === 'broken') {
    ctx.fillStyle = '#3a474e'; ctx.save(); ctx.translate(d.x + 18, fy - 6); ctx.rotate(-.12); ctx.fillRect(-26, -8, 52, 10); hazard(ctx, -26, -8, 52, 3, 4); ctx.restore();
    if (Math.sin(t * 7 + d.x) > .93) { ctx.fillStyle = '#ffd28a'; ctx.fillRect(d.x - 2, top + 6 + rand(0, 6), 3, 3); }
    return;
  }
  const o = d.open, ph = DOORH * (1 - o);
  if (ph > 1) {
    const lockC = d.state === 'locked';
    ctx.fillStyle = vgrad(ctx, top, top + ph, [[0, lockC ? '#5a2a30' : '#5b6a72'], [1, lockC ? '#3a1a1f' : '#36434a']]);
    ctx.fillRect(x - 10, top, 20, ph);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x - 10, top, 2, ph);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 8, top, 2, ph);
    if (ph > 30) hazard(ctx, x - 10, top + ph - 10, 20, 8, 4);
    if (ph > 70) { ctx.fillStyle = '#05080a'; ctx.fillRect(x - 4, top + 34, 8, 26); ctx.fillStyle = `rgba(255,190,110,${.25 + .1 * Math.sin(t * 3)})`; ctx.fillRect(x - 2, top + 38, 4, 18); }
    if (lockC) { ctx.fillStyle = '#ff4f5e'; ctx.fillRect(x - 6, top + 70, 12, 10); ctx.strokeStyle = '#ff4f5e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, top + 70, 4, Math.PI, 0); ctx.stroke(); }
    if (d.hitT > 0) { ctx.fillStyle = `rgba(255,255,255,${d.hitT})`; ctx.fillRect(x - 10, top, 20, ph); }
  }
  // 狀態燈
  ctx.fillStyle = d.state === 'locked' ? '#ff4f5e' : d.state === 'closed' ? '#ffb03a' : '#5fe39a';
  ctx.beginPath(); ctx.arc(d.x, top - 18, 3.5, 0, TAU); ctx.fill();
  // 耐久
  if (d.state === 'closed' && (d.hp < d.hpMax - 1 || d.hitT > 0)) {
    const w = 44; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(d.x - w / 2, top - 32, w, 5);
    ctx.fillStyle = d.hp / d.hpMax < .3 ? '#ff4f5e' : '#ffb03a'; ctx.fillRect(d.x - w / 2, top - 32, w * clamp(d.hp / d.hpMax, 0, 1), 5);
  }
}
function drawProjs(ctx) {
  for (const b of W.projs) {
    const ang = Math.atan2(b.vy, b.vx);
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(ang);
    if (b.kind === 'harpoon') { ctx.fillStyle = '#e8f0f4'; ctx.fillRect(-26, -1.5, 30, 3); ctx.beginPath(); ctx.moveTo(4, -5); ctx.lineTo(14, 0); ctx.lineTo(4, 5); ctx.fill(); ctx.strokeStyle = 'rgba(232,240,244,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-90, 0); ctx.stroke(); }
    else { const g = ctx.createLinearGradient(-30, 0, 6, 0); g.addColorStop(0, 'rgba(255,207,122,0)'); g.addColorStop(1, '#fff1cf'); ctx.fillStyle = g; ctx.fillRect(-30, -1.5, 36, 3); }
    ctx.restore();
  }
}
function drawFX(ctx, t) {
  for (const f of W.fx) {
    const u = f.t / f.life;
    switch (f.k) {
      case 'spark': ctx.fillStyle = f.col; ctx.globalAlpha = 1 - u; ctx.fillRect(f.x - 1.5, f.y - 1.5, 3, 3); ctx.globalAlpha = 1; break;
      case 'debris': ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot + f.t * 8); ctx.fillStyle = f.col; ctx.globalAlpha = 1 - u * u; ctx.fillRect(-4, -2, 8, 4); ctx.restore(); break;
      case 'shell': ctx.fillStyle = '#d8b46a'; ctx.globalAlpha = 1 - u; ctx.fillRect(f.x, f.y, 3, 2); ctx.globalAlpha = 1; if (f.y > W.P.y) f.vy = -Math.abs(f.vy) * .3; break;
      case 'flame': { const s = 6 + u * 16; const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, s); g.addColorStop(0, `rgba(255,240,200,${.9 * (1 - u)})`); g.addColorStop(.4, `rgba(255,140,50,${.7 * (1 - u)})`); g.addColorStop(1, 'rgba(255,60,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, s, 0, TAU); ctx.fill(); break; }
      case 'bolt': { ctx.strokeStyle = f.col; ctx.lineWidth = 2.5 * (1 - u) + .5; ctx.shadowColor = f.col; ctx.shadowBlur = 0; ctx.beginPath(); for (let k = 0; k < f.pts.length - 1; k++) { const [x1, y1] = f.pts[k], [x2, y2] = f.pts[k + 1]; ctx.moveTo(x1, y1); const n = 6; for (let j = 1; j <= n; j++) { const v = j / n; ctx.lineTo(lerp(x1, x2, v) + (j < n ? rand(-9, 9) : 0), lerp(y1, y2, v) + (j < n ? rand(-9, 9) : 0)); } } ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.stroke(); break; }
      case 'laser': ctx.strokeStyle = `rgba(166,255,158,${1 - u})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke(); break;
      case 'ring': { const rr = lerp(f.r0, f.r1, ease.outCubic(u)); ctx.strokeStyle = f.col; ctx.globalAlpha = 1 - u; ctx.lineWidth = f.w * (1 - u) + 1; ctx.beginPath(); ctx.arc(f.x, f.y, rr, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; break; }
      case 'frost': { const rr = f.r * ease.outCubic(u); const g = ctx.createRadialGradient(f.x, f.y, rr * .3, f.x, f.y, rr); g.addColorStop(0, 'rgba(200,240,255,0)'); g.addColorStop(.8, `rgba(200,240,255,${.35 * (1 - u)})`); g.addColorStop(1, 'rgba(200,240,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, rr, 0, TAU); ctx.fill(); break; }
      case 'goo': ctx.fillStyle = f.col; ctx.globalAlpha = Math.min(1, (1 - u) * 3) * .8; ctx.beginPath(); ctx.ellipse(f.x, f.y - 1, f.r * 1.3, 4, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; break;
      case 'slash': { ctx.save(); ctx.translate(f.x, f.y); ctx.scale(f.face, 1); ctx.strokeStyle = `rgba(255,80,100,${1 - u})`; ctx.lineWidth = 6; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(-20, k * 14 - 14, 50, -1.1 + u, .4 + u); ctx.stroke(); } ctx.restore(); break; }
      case 'beam': { const g = ctx.createLinearGradient(0, f.y - 200, 0, f.y); g.addColorStop(0, rgba(f.col, 0)); g.addColorStop(1, rgba(f.col, .55 * (1 - u))); ctx.fillStyle = g; ctx.fillRect(f.x - 8 - u * 8, f.y - 200, 16 + u * 16, 200); break; }
      case 'dust': ctx.fillStyle = `rgba(150,160,165,${.5 * (1 - u)})`; ctx.beginPath(); ctx.arc(f.x, f.y, 2 + u * 3, 0, TAU); ctx.fill(); break;
      case 'drip': ctx.fillStyle = 'rgba(170,210,160,.9)'; ctx.beginPath(); ctx.ellipse(f.x, f.y, 1.8, 2.5 + Math.min(4, f.vy / 120), 0, 0, TAU); ctx.fill(); break;
      case 'waterzap': { const r = W.rooms[f.room], top = r.floorY - waterAt(r); ctx.strokeStyle = `rgba(200,250,255,${1 - u})`; ctx.lineWidth = 1.5; ctx.beginPath(); for (let k = 0; k < 7; k++) { const x0 = r.x0 + rand(20, RW - 20); ctx.moveTo(x0, top + rand(2, 20)); ctx.lineTo(x0 + rand(-30, 30), top + rand(10, 60)); } ctx.stroke(); break; }
      case 'flashscr': break;
    }
  }
}
function drawWater(ctx, r, t) {
  if (r.collapsed || r.water < .004) return;
  if (W.zap && W.zap.room === r.i) {
    const hgt = waterAt(r), top = r.floorY - hgt, a = 1 - W.zap.t / W.zap.life;
    ctx.fillStyle = `rgba(160,245,255,${.35 * a})`; ctx.fillRect(r.x0 + 8, top, RW - 16, hgt);
    ctx.strokeStyle = `rgba(230,255,255,${a})`; ctx.lineWidth = 2; ctx.beginPath();
    for (let k = 0; k < 16; k++) { let x0 = r.x0 + rand(14, RW - 14), y0 = top + rand(0, hgt); ctx.moveTo(x0, y0); for (let j = 0; j < 4; j++) { x0 += rand(-26, 26); y0 += rand(-14, 14); ctx.lineTo(x0, clamp(y0, top - 30, r.floorY)); } }
    ctx.stroke();
  }
  const h = waterAt(r), top = r.floorY - h, x0 = r.x0 + (r.c === 0 ? 20 : 8), x1 = r.x0 + RW - (r.c === W.C - 1 ? 20 : 8);
  const g = ctx.createLinearGradient(0, top, 0, r.floorY);
  g.addColorStop(0, 'rgba(60,170,200,.28)'); g.addColorStop(1, 'rgba(8,50,72,.55)');
  ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, h + 2);
  ctx.strokeStyle = 'rgba(180,245,255,.55)'; ctx.lineWidth = 1.6; ctx.beginPath();
  for (let x = x0; x <= x1; x += 10) { const y = top + Math.sin(x * .045 + t * 2.2) * 2.2 + Math.sin(x * .11 - t * 3) * 1; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(200,250,255,.35)';
  for (let k = 0; k < 6; k++) { const bx = x0 + ((k * 61 + r.i * 37) % (x1 - x0)), u = ((t * .5 + k * .17) % 1); const by = r.floorY - u * h; if (by > top + 4) { ctx.beginPath(); ctx.arc(bx + Math.sin(t * 3 + k) * 3, by, 1.5 + k % 3, 0, TAU); ctx.fill(); } }
}

/* ---------- 光照 ---------- */
function drawLighting(ctx, vis, t) {
  const L = R.lctx, s = R.LS, z = R.zoom;
  const black = W.blackT > 0 && Math.random() > .12;
  const dark = black ? .975 : clamp(.87 + W.si * .015 + (W.stage >= 3 ? .04 : 0), 0, .95) * (1 - .65 * (R.strobeA || 0));
  L.globalCompositeOperation = 'source-over';
  L.fillStyle = `rgba(1,5,9,${dark})`; L.fillRect(0, 0, R.lm.width, R.lm.height);
  L.globalCompositeOperation = 'destination-out';
  const glows = [], beams = [], cones = [];
  const lampLight = (x, y, k, a, col) => {
    const sx = toSX(x) * s, sy = toSY(y + 70 * k) * s, rx = 175 * k * z * s, ry = 120 * k * z * s;
    if (sx < -rx || sy < -ry * 2 || sx > R.lm.width + rx || sy > R.lm.height + ry * 2) return;
    L.save(); L.translate(sx, sy); L.scale(rx / ry, 1);
    const g = L.createRadialGradient(0, 0, 0, 0, 0, ry);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.55, `rgba(0,0,0,${a * .6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    L.fillStyle = g; L.fillRect(-ry, -ry, ry * 2, ry * 2); L.restore();
    glows.push([x, y + 60 * k, 150 * k, a, col]);
  };
  const light = (x, y, r, a, col) => {
    const sx = toSX(x) * s, sy = toSY(y) * s, rr = r * z * s;
    if (sx < -rr || sy < -rr || sx > R.lm.width + rr || sy > R.lm.height + rr) return;
    const g = L.createRadialGradient(sx, sy, 0, sx, sy, rr);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.5, `rgba(0,0,0,${a * .55})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    L.fillStyle = g; L.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
    if (col) glows.push([x, y, r, a, col]);
  };
  for (const r of vis) {
    if (r.collapsed) continue;
    const dead = (r.lightDead && r.special !== 'dock') || black;
    if (!dead && r.light !== 'dark') r.lights.forEach((l, k) => {
      if (r.deadLamps && r.deadLamps[k]) return;
      let a = r.light === 'lit' ? .95 : .72;
      if (r.light === 'emer') { const fl = Math.sin(t * 13 + r.flick * 40) * Math.sin(t * 3.1 + r.flick * 9); if (fl > .82) a *= .3; }
      if (W.stage >= 4) a *= .6 + .4 * Math.abs(Math.sin(t * 7 + r.flick * 5));
      // 接觸不良的燈管
      if ((r.i * 7 + k * 13) % 9 === 0) { const ph = Math.sin(t * 17 + k * 3 + r.i) * Math.sin(t * 2.3 + r.i * 1.7); if (ph > .55) { a *= .12; if (W.state === 'play' && roomAt(W.P.x, W.P.y) === r) AU.play('buzz', { vol: .35 }); } else if (ph > .42) a *= .6; }
      // 聆在附近：燈被干擾
      if (r.flickT > 0) a *= Math.random() < .38 ? .08 : .85;
      const kk = r.light === 'lit' ? 1 : .8, col = r.light === 'emer' ? '#ffae5a' : '#cfeeff';
      lampLight(l.x, l.y, kk, a, col);
      if (a > .25) beams.push([l.x, l.y + 6, r.floorY, 96 * kk, a, col]);
    });
    if (W.zap && W.zap.room === r.i) light(r.x0 + RW / 2, r.floorY - waterAt(r) / 2, 260, .9 * (1 - W.zap.t / W.zap.life), '#bff8ff');
    for (const m of r.machines || []) if (m.on > 0) light(m.x, r.floorY - 120, 50, .5 + .3 * Math.sin(t * 10), '#ffb03a');
    if (r.trap && r.trap.state === 'armed') light(r.trap.bx, r.trap.by, 40, .45, '#ffd23a');
    if (R.alarm && !black) {
      const b = beaconPos(r), ang = t * 2.6 + r.i * 1.7, face = .5 + .5 * Math.sin(ang), dir = Math.PI / 2 + Math.cos(ang) * 1.25;
      const bsx = toSX(b.x) * s, bsy = toSY(b.y) * s, rr = 340 * z * s;
      if (bsx > -rr && bsx < R.lm.width + rr && bsy > -rr && bsy < R.lm.height + rr) {
        L.save(); L.translate(bsx, bsy); L.rotate(dir);
        const g = L.createRadialGradient(0, 0, 0, 0, 0, rr); g.addColorStop(0, `rgba(0,0,0,${.72 * face})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        L.fillStyle = g; L.beginPath(); L.moveTo(0, 0); L.arc(0, 0, rr, -.32, .32); L.closePath(); L.fill(); L.restore();
        cones.push([bsx, bsy, dir, rr, .32, `rgba(255,36,50,${.55 * face})`]);
        light(b.x, b.y, 34, .55 + .4 * face, '#ff3040');
      }
    }
    for (const g of r.glow || []) light(g.x, g.y, g.r * 1.6, .55, g.col);
    if (r.breach) light(r.breach.x, r.breach.y, 120, .45 + .3 * Math.sin(t * 6), '#ff4d5e');
    if (r.special === 'dock') light(r.x0 + RW / 2, r.floorY - 40, 200, .7, '#5fe7ff');
    if (r.special === 'deep' && r.tank) light(r.tank.x, r.tank.y, 240, .8, '#5fe7ff');
    for (const w of r.windows || []) light(r.x0 + w.x, r.y0 + w.y, w.r * 2.6, .45, '#3fb8d8');
    if (r.vent && r.vent.shake > .2) light(r.vent.x, r.vent.y, 90, .5 * r.vent.shake, '#ff3b4e');
  }
  if (R.camY - R.h / 2 / z < 0) for (const fx of [.1, .5, .9]) { const x = W.C * RW * fx, base = -12 - 58 * (1 - Math.pow((x - W.C * RW / 2) / (W.C * RW / 2 + 14), 2)) * .97; if ((t * .8 + fx) % 1 < .18) light(x, base - 74, 38, .5, '#ff4d5e'); }
  if (R.camY + R.h / 2 / z > W.F * FH + 180) for (const [x, y] of seabedDots(W.C * RW, W.F * FH)) light(x, y - 16, 46, .45, '#3fb8d8');
  const p = W.P;
  light(p.x, p.y - 40, 105, .78, null);
  // 頭燈光錐
  if (!p.climb) {
    const hx = toSX(p.x + p.face * 12) * s, hy = toSY(p.y - 64) * s, rr = (p.stealth ? 210 : 340) * z * s, ang = p.stealth ? .32 : .42;
    L.save(); L.translate(hx, hy); if (p.face < 0) L.scale(-1, 1);
    const g = L.createRadialGradient(0, 0, 0, 0, 0, rr); g.addColorStop(0, `rgba(0,0,0,${p.stealth ? .6 : .92})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    L.fillStyle = g; L.beginPath(); L.moveTo(0, 0); L.arc(0, 0, rr, -ang + .12, ang + .12); L.closePath(); L.fill(); L.restore();
    cones.push([hx, hy, p.face < 0 ? Math.PI - .12 : .12, rr, ang, `rgba(205,235,255,${p.stealth ? .07 : .12})`]);
  }
  for (const f of W.fx) { if (f.k === 'light') light(f.x, f.y, f.r, .9 * (1 - f.t / f.life), f.col); else if (f.k === 'bolt' && f.t < .08) light(f.pts[1][0], f.pts[1][1], 120, .8, '#7fe9ff'); else if (f.k === 'flame' && Math.random() < .2) light(f.x, f.y, 80, .6, '#ff8a3d'); else if (f.k === 'ring' && f.t < .15) light(f.x, f.y, f.r1 * .8, .6, f.col); else if (f.k === 'beam') light(f.x, f.y - 60, 90, .6 * (1 - f.t / f.life), f.col); }
  for (const e of W.foes) { if (e.dead) continue; if (e.type === 'jelly') light(e.x, e.y - 26, 80, .6, '#7fe9ff'); else if (e.type === 'husk') light(e.x + e.face * 8, e.y - 40, 38, .3, '#b6ff6d'); else if (e.type === 'wall' && e.awake && !e.silent) light(e.x, e.y - 120, 60, .4, '#b6ff6d'); }
  const h = W.hunter; if (onMap(h)) light(h.x + h.face * (h.quad > .5 ? 70 : 44), h.y - (h.quad > .5 ? 70 : 158), 70, .32, hunterCol(h.state));
  for (const it of W.items) if (it.rar >= 3 && it.ground) light(it.x, it.y, 60, .5, null);
  for (const d of W.decoys) if (d.landed) light(d.x, d.y - 10, 70, .5 * (.5 + .5 * Math.sin(t * 9)), '#ffcf3a');
  for (const sp of spotsVisible(vis)) light(sp.x, sp.y - 50, 40, .35, null);
  if (W.dock.arrived) { const r = W.rooms[W.dock.room]; light(r.x0 + RW / 2, r.floorY - 20, 160, .8, '#ffd28a'); }
  // 疊上暗部
  ctx.drawImage(R.lm, 0, 0, R.w, R.h);
  // 彩色光暈：畫在低解析度的光暈層，再一次疊上去（手機 GPU 省很多填充量）
  const GL = R.gctx, gw = R.gm.width, gh = R.gm.height;
  GL.globalCompositeOperation = 'source-over'; GL.clearRect(0, 0, gw, gh);
  GL.globalCompositeOperation = 'lighter';
  for (const [x, y, r, a, col] of glows) {
    const sx = toSX(x) * s, sy = toSY(y) * s, rr = r * z * .8 * s;
    if (sx < -rr || sy < -rr || sx > gw + rr || sy > gh + rr) continue;
    const g = GL.createRadialGradient(sx, sy, 0, sx, sy, rr);
    g.addColorStop(0, rgba(col, .22 * a)); g.addColorStop(1, rgba(col, 0));
    GL.fillStyle = g; GL.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
  }
  // 看得見的光柱：吊燈往下的光、頭燈、警示燈
  for (const [x, y0, y1, hw, a, col] of beams) {
    const bx = toSX(x) * s, by0 = toSY(y0) * s, by1 = toSY(y1) * s, w0 = 8 * z * s, w1 = hw * z * s;
    if (bx < -w1 || bx > gw + w1 || by1 < 0 || by0 > gh) continue;
    const g = GL.createLinearGradient(0, by0, 0, by1); g.addColorStop(0, rgba(col, .15 * a)); g.addColorStop(.75, rgba(col, .045 * a)); g.addColorStop(1, rgba(col, 0));
    GL.fillStyle = g; GL.beginPath(); GL.moveTo(bx - w0, by0); GL.lineTo(bx + w0, by0); GL.lineTo(bx + w1, by1); GL.lineTo(bx - w1, by1); GL.closePath(); GL.fill();
  }
  for (const [cx, cy, dir, rr, ang, col] of cones) {
    GL.save(); GL.translate(cx, cy); GL.rotate(dir);
    const g = GL.createRadialGradient(0, 0, 0, 0, 0, rr); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    GL.fillStyle = g; GL.beginPath(); GL.moveTo(0, 0); GL.arc(0, 0, rr, -ang, ang); GL.closePath(); GL.fill(); GL.restore();
  }
  // 光裡飄的灰塵
  drawMotes(GL, beams, s, z, t);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(R.gm, 0, 0, R.w, R.h);
  ctx.globalCompositeOperation = 'source-over';
}
function drawMotes(GL, beams, s, z, t) {
  const p = W.P, hw = R.w / 2 / z, hh = R.h / 2 / z;
  if (!R.motes) { R.motes = []; for (let k = 0; k < 90; k++) R.motes.push({ x: 0, y: 0, vx: 0, vy: 0, ph: Math.random() * 6, live: false }); }
  for (const m of R.motes) {
    if (!m.live || Math.abs(m.x - R.camX) > hw + 40 || Math.abs(m.y - R.camY) > hh + 40) { m.x = R.camX + rand(-hw, hw); m.y = R.camY + rand(-hh, hh); m.vx = rand(-5, 5); m.vy = rand(-4, 3); m.live = true; }
    m.x += (m.vx + Math.sin(t * .7 + m.ph) * 3) / 60; m.y += (m.vy + Math.cos(t * .5 + m.ph) * 2) / 60;
    let lit = 0;
    for (const [x, y0, y1, w, a] of beams) { if (m.y < y0 || m.y > y1) continue; const half = lerp(8, w, (m.y - y0) / Math.max(1, y1 - y0)); if (Math.abs(m.x - x) < half) { lit = Math.max(lit, a * (1 - Math.abs(m.x - x) / half)); } }
    if (!p.climb) { const dx = (m.x - p.x - p.face * 12) * p.face, dy = m.y - (p.y - 64), d = Math.hypot(dx, dy); if (dx > 0 && d < (p.stealth ? 210 : 340) && Math.abs(Math.atan2(dy, dx) - .12) < (p.stealth ? .32 : .42)) lit = Math.max(lit, (1 - d / 340) * 1.2); }
    if (lit < .08) continue;
    GL.fillStyle = `rgba(230,245,255,${Math.min(.75, lit * .7)})`;
    GL.fillRect(toSX(m.x) * s, toSY(m.y) * s, 1.2, 1.2);
  }
}
function spotsVisible(vis) { const out = []; for (const r of vis) for (const s of r.spots) if (!s.done) out.push(s); return out; }

/* ---------- 光照之上的提示 ---------- */
function drawPulses(ctx) {
  for (const p of W.pulses) {
    const u = p.t / p.dur, rr = p.r * ease.outCubic(u);
    const col = p.src === 'player' ? '200,240,255' : p.src === 'tracker' ? '125,255,165' : p.src === 'decoy' ? '255,207,58' : p.src === 'husk' ? '255,80,100' : p.src === 'dock' ? '95,231,255' : '255,170,90';
    ctx.strokeStyle = `rgba(${col},${(1 - u) * (p.src === 'player' ? .22 : .35)})`; ctx.lineWidth = 2 / R.zoom + (1 - u) * 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, TAU); ctx.stroke();
  }
}
function drawWorldHints(ctx, vis, t) {
  const p = W.P;
  // 搜索點
  for (const r of vis) for (const sp of r.spots) {
    if (sp.done) continue;
    const col = sp.kind === 'log' ? '#5fe7ff' : sp.kind === 'key' ? '#ff4f5e' : sp.kind === 'cache' ? RAR[3].col : RAR[sp.rar].col;
    const x = sp.x, y = sp.y - 78 + Math.sin(t * 2.4 + x) * 2;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(3,12,17,.7)'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    if (sp.kind === 'log') { ctx.strokeRect(-7, -4.5, 14, 9); ctx.beginPath(); ctx.arc(-3, 0, 2, 0, TAU); ctx.arc(3, 0, 2, 0, TAU); ctx.stroke(); }
    else if (sp.kind === 'cache') { ctx.strokeRect(-6, -5, 12, 10); ctx.beginPath(); ctx.moveTo(-6, -1); ctx.lineTo(6, -1); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(-1.5, -1.5, 4.5, 0, TAU); ctx.moveTo(1.8, 1.8); ctx.lineTo(6, 6); ctx.stroke(); }
    if (sp.t > 0) { const need = RAR[sp.rar].t * (sp.kind === 'log' ? .5 : 1); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 15, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(sp.t / need, 0, 1)); ctx.stroke(); }
    ctx.restore();
  }
  // 加固中
  if (p.reinforcing) { const d = p.reinforcing; ctx.fillStyle = '#ffd28a'; ctx.font = '700 12px "Noto Sans TC",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('加固中', d.x, d.y - DOORH - 40); ctx.textAlign = 'left'; }
  // 情境動作進度
  if (p.channel) { const c = p.channel; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(p.x, p.y - 100, 14, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#5fe7ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y - 100, 14, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(c.t / c.it.dur, 0, 1)); ctx.stroke(); }
  // 聆在附近：標出這間艙躲得進去的地方
  const h = W.hunter, danger = h && !h.dead && h.state !== 'away' && h.state !== 'gone';
  if ((danger || W.mother) && !p.hide && !p.caught) {
    const pr = roomAt(p.x, p.y);
    for (const sp of pr.hides || []) {
      if (Math.abs(sp.x - p.x) > 300) continue;
      const a = .35 + .25 * Math.sin(t * 4 + sp.x), y = p.y - (sp.type === 'locker' ? 126 : 66);
      ctx.strokeStyle = `rgba(200,240,255,${a})`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(sp.x - 9, y - 4); ctx.lineTo(sp.x - 9, y + 5); ctx.lineTo(sp.x + 9, y + 5); ctx.lineTo(sp.x + 9, y - 4); ctx.stroke();
      ctx.beginPath(); ctx.arc(sp.x, y - 1, 2.2, 0, TAU); ctx.stroke();
    }
  }
  // 陷阱提示
  for (const r of vis) if (r.trap && r.trap.state !== 'spent' && r.explored) {
    const T = r.trap, y = T.by - 46 + Math.sin(t * 2.4) * 2;
    ctx.fillStyle = 'rgba(3,12,17,.75)'; ctx.beginPath(); ctx.arc(T.bx, y, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = T.state === 'armed' ? '#ffd23a' : '#ff8a3d'; ctx.font = '900 12px "Noto Sans TC",sans-serif'; ctx.textAlign = 'center'; ctx.fillText(T.state === 'armed' ? '電' : '?', T.bx, y + 4); ctx.textAlign = 'left';
  }
}
function drawNums(ctx) {
  ctx.textAlign = 'center';
  for (const n of W.nums) {
    const a = n.t < .7 ? 1 : 1 - (n.t - .7) / .4, sc = (n.crit ? 1.35 : 1) * (1 + n.pop * .35);
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.font = `900 ${Math.round(15 * sc / Math.max(.8, R.zoom) * 1.0)}px "Rajdhani",sans-serif`;
    const s = n.v >= 1000 ? (n.v / 1000).toFixed(1) + 'K' : Math.round(n.v);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(s, n.x, n.y);
    ctx.fillStyle = n.col; ctx.fillText(s, n.x, n.y);
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
}
/* ---------- 畫面邊緣的方向提示 ---------- */
function drawEdge(ctx, t) {
  const p = W.P, cx = R.w / 2, cy = R.h / 2;
  const mark = (x, y, col, label, kind, pulse) => {
    const sx = toSX(x), sy = toSY(y);
    const port = R.h > R.w, mL = port ? 66 : 34, mR = port ? 40 : 40, mT = port ? 250 : R.h <= 500 ? 96 : 170, mB = port ? 170 : 110;
    if (sx > mL && sx < R.w - mR && sy > mT && sy < R.h - mB) return;
    const ccx = (mL + R.w - mR) / 2, ccy = (mT + R.h - mB) / 2, hw = (R.w - mR - mL) / 2, hh = (R.h - mB - mT) / 2;
    const dx = sx - ccx, dy = sy - ccy, k = Math.min(hw / Math.max(1, Math.abs(dx)), hh / Math.max(1, Math.abs(dy)));
    const ex = ccx + dx * k, ey = ccy + dy * k, ang = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(ex, ey);
    ctx.globalAlpha = pulse ? .55 + .45 * Math.sin(t * 8) : .9;
    if (kind === 'hunter') {
      ctx.rotate(ang); ctx.strokeStyle = col; ctx.lineWidth = 4;
      for (let q = 0; q < 3; q++) { ctx.globalAlpha = (pulse ? .5 + .5 * Math.sin(t * 8 - q) : .8) * (1 - q * .25); ctx.beginPath(); ctx.arc(-6 - q * 8, 0, 16 + q * 7, -.7, .7); ctx.stroke(); }
      ctx.rotate(-ang);
    } else {
      ctx.fillStyle = col; ctx.beginPath(); ctx.rotate(ang); ctx.moveTo(12, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.fill(); ctx.rotate(-ang);
    }
    if (label) { ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.font = '700 11px "Rajdhani","Noto Sans TC",sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label, -Math.cos(ang) * 28, -Math.sin(ang) * 28 + 4); }
    ctx.restore();
  };
  const h = W.hunter, st = PS();
  const T = W.tracker;
  if (onMap(h)) {
    const d = Math.hypot(h.x - p.x, h.y - p.y), chasing = (h.state === 'hunt' || h.state === 'attack') && d < 700;
    if (T.seenH > 0 || chasing) mark(h.x, h.y - 100, chasing ? '#ff3b4e' : '#7dffa8', Math.round(d * .025) + 'm', 'hunter', chasing);
  }
  else if (h && h.state === 'crawl' && T.seenH > 0) mark(h.cx, h.cy, '#7dffa8', '管道', 'hunter', true);
  else if (h && h.state === 'venting') mark(h.vent.x, h.vent.y, '#ff3b4e', '管道', 'hunter', true);
  if (W.mother && !W.mother.dead && W.mother.state !== 'lured') mark(W.mother.x, W.mother.y - 150, '#ff3b4e', Math.round(Math.hypot(W.mother.x - p.x, W.mother.y - p.y) * .025) + 'm', 'hunter', true);
  const tr = trapReady(); if (tr) mark(tr.trap.bx, tr.trap.by, '#ffd23a', '通電', 'dock', true);
  if (W.dock.called || W.stage >= 3 || W.ending) { const r = W.rooms[W.dock.room]; mark(r.x0 + RW / 2, r.floorY - 60, '#5fe7ff', '撤離', 'dock', false); }
}

/* ---------- 小地圖（磷光綠的掃描螢幕；偵測器開著時就是動態偵測畫面） ---------- */
const PH = (a) => `rgba(125,255,165,${a})`;
function drawMinimap(m, w, h, big) {
  m.clearRect(0, 0, w, h);
  m.fillStyle = 'rgba(2,14,8,.72)'; m.fillRect(0, 0, w, h);
  const C = W.C, F = W.F, pad = big ? 10 : 6;
  const cw = (w - pad * 2) / C, ch = Math.min((h - pad * 2) / F, cw * .85);
  const oy = (h - ch * F) / 2, ox = pad;
  const t = R.t, p = W.P, pr = roomAt(p.x, p.y), T = W.tracker;
  const mx = x => ox + x / RW * cw, my = y => oy + y / FH * ch;
  for (const r of W.rooms) {
    const x = ox + r.c * cw, y = oy + r.f * ch;
    if (r.collapsed) { m.fillStyle = 'rgba(255,255,255,.035)'; m.fillRect(x + 1, y + 1, cw - 2, ch - 2); m.strokeStyle = PH(.08); m.beginPath(); m.moveTo(x + 2, y + 2); m.lineTo(x + cw - 2, y + ch - 2); m.stroke(); continue; }
    m.fillStyle = r === pr ? PH(.24) : r.explored ? PH(.07) : 'rgba(255,255,255,.02)';
    m.fillRect(x + 1, y + 1, cw - 2, ch - 2);
    if (r.water > .02) { const wh = (ch - 2) * r.water; m.fillStyle = 'rgba(60,150,255,.42)'; m.fillRect(x + 1, y + ch - 1 - wh, cw - 2, wh); }
    m.strokeStyle = r.explored ? PH(.5) : PH(.16); m.lineWidth = big ? 1.5 : 1; m.strokeRect(x + .5, y + .5, cw - 1, ch - 1);
    if (r.breach && Math.sin(t * 8) > 0) { m.fillStyle = '#ff4d5e'; m.fillRect(x + cw - 6, y + 3, 3, 3); }
    if (r.ladDown) { m.fillStyle = PH(.75); const lx = mx(r.ladDown.x); m.fillRect(lx - 1, y + ch - 4, 2, 8); }
    m.textAlign = 'center';
    if (r.special === 'dock') { m.fillStyle = '#e8fff0'; m.font = `900 ${big ? 13 : 9}px "Noto Sans TC",sans-serif`; m.fillText('撤', x + cw / 2, y + ch / 2 + 4); }
    if (r.special === 'pod') { m.fillStyle = '#ffcf3a'; m.font = `900 ${big ? 12 : 8}px "Noto Sans TC",sans-serif`; m.fillText('艙', x + cw / 2, y + ch / 2 + 3); }
    if (r.special === 'deep') { m.fillStyle = '#ff4f5e'; m.font = `900 ${big ? 12 : 8}px "Noto Sans TC",sans-serif`; m.fillText('深', x + cw / 2, y + ch / 2 + 3); }
    if (big && r.explored && !r.special) { m.fillStyle = PH(.35); m.font = '600 10px "Rajdhani",sans-serif'; m.fillText(paCode(r), x + cw / 2, y + 12); }
    if (r.special === 'vault' && r.explored) { m.fillStyle = '#ff4f5e'; m.fillRect(x + 3, y + 3, 4, 4); }
    const sv = r.survivor;
    if (sv && sv.state === 'hide' && (r.explored || W.rooms.some(o => o.explored && Math.abs(o.c - r.c) + Math.abs(o.f - r.f) === 1))) { m.fillStyle = '#5fe7ff'; m.beginPath(); m.arc(ox + (sv.x / RW) * cw, y + ch - 5, big ? 4 : 2.5, 0, TAU); m.fill(); }
    if (W.P.passives.scan >= 3) for (const sp of r.spots) if (!sp.done) { m.fillStyle = RAR[sp.rar].col; m.fillRect(mx(sp.x) - 1, y + ch - 3, 2, 2); }
  }
  m.textAlign = 'left';
  for (const d of W.doors) {
    const x = ox + d.c * cw, y = oy + d.f * ch;
    m.fillStyle = d.state === 'open' ? PH(.65) : d.state === 'closed' ? '#ffb03a' : '#ff4f5e';
    if (d.state === 'open') m.fillRect(x - 1, y + ch - 7, 2, 5); else m.fillRect(x - 1.5, y + ch * .35, 3, ch * .6);
  }
  for (const i of W.M.traps) { const r = W.rooms[i]; if (!r.explored && !big) continue; if (!r.explored && big && !r.trap.seen) continue; const T = r.trap; if (T.state === 'spent') continue; m.fillStyle = T.state === 'armed' ? (Math.sin(t * 6) > 0 ? '#ffd23a' : '#8a6a10') : '#ff8a3d'; m.font = `900 ${big ? 12 : 8}px "Noto Sans TC",sans-serif`; m.textAlign = 'center'; m.fillText('電', mx(T.bx), oy + r.f * ch + ch / 2 + 3); m.textAlign = 'left'; }
  const hh = W.hunter;
  if (hh && hh.state === 'venting' && Math.sin(t * 8) > 0) { m.strokeStyle = '#ff3b4e'; m.lineWidth = 1.5; m.beginPath(); m.arc(mx(hh.vent.x), my(hh.vent.y), big ? 7 : 4, 0, TAU); m.stroke(); }
  if (onMap(hh) && roomAt(hh.x, hh.y) === pr) { m.fillStyle = hunterCol(hh.state); m.beginPath(); m.arc(mx(hh.x), my(hh.y) - 3, big ? 5 : 3, 0, TAU); m.fill(); }
  // 偵測器
  const px = mx(p.x), py = my(p.y) - 3, rr = TRACK_RANGE * PS().sonar / RW * cw;
  if (T.on) {
    m.strokeStyle = PH(.14); m.lineWidth = 1; m.beginPath(); m.arc(px, py, rr, 0, TAU); m.stroke();
    if (T.pingFx > 0) { m.strokeStyle = PH(.55 * T.pingFx); m.lineWidth = big ? 2 : 1.5; m.beginPath(); m.arc(px, py, rr * (1 - T.pingFx), 0, TAU); m.stroke(); }
  }
  for (const b of T.blips) {
    if (b.a <= 0) continue;
    const bx = mx(b.x), by = my(b.y), br = (b.big ? 3.4 : 2.3) * (big ? 1.6 : 1);
    m.fillStyle = `rgba(235,255,240,${b.a})`; m.shadowColor = '#7dffa8'; m.shadowBlur = 6;
    m.beginPath(); m.arc(bx, by, br, 0, TAU); m.fill(); m.shadowBlur = 0;
  }
  m.fillStyle = '#ffffff'; m.shadowColor = '#7dffa8'; m.shadowBlur = 6;
  m.beginPath(); m.arc(px, py, big ? 4.5 : 3, 0, TAU); m.fill(); m.shadowBlur = 0;
  if (T.on && !big) {
    m.font = '700 17px "Rajdhani",sans-serif'; m.fillStyle = 'rgba(2,14,8,.8)'; m.fillRect(0, h - 22, w, 22);
    m.fillStyle = PH(.95); m.fillText((Math.sin(t * 6) > 0 ? '● ' : '○ ') + (T.blips.length ? Math.max(1, Math.round(T.nearD * .025)) + ' M' : '— —'), 8, h - 6);
  }
  if (big) { const sy = (t * .22 % 1) * h; const g = m.createLinearGradient(0, sy - 60, 0, sy); g.addColorStop(0, PH(0)); g.addColorStop(1, PH(.14)); m.fillStyle = g; m.fillRect(0, sy - 60, w, 60); m.fillStyle = PH(.5); m.fillRect(0, sy, w, 1.5); }
  m.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 0; y < h; y += 3) m.fillRect(0, y, w, 1);
}

/* ---------- 選單背景 ---------- */
function renderMenu(dt) {
  const ctx = R.ctx, t = R.t, w = R.w, h = R.h;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#08304a'); g.addColorStop(.35, '#041824'); g.addColorStop(1, '#000306');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // 光束
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 5; k++) { const x = w * (.15 + k * .2) + Math.sin(t * .2 + k) * 40; const gg = ctx.createLinearGradient(x, 0, x + 80, h * .7); gg.addColorStop(0, 'rgba(120,200,230,.08)'); gg.addColorStop(1, 'rgba(120,200,230,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(x - 20, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x + 160, h * .75); ctx.lineTo(x + 40, h * .75); ctx.fill(); }
  ctx.restore();
  // 巨影
  const per = 46, ph = (t % per) / per;
  if (ph < .6) {
    const x = lerp(w * 1.5, -w * .6, ph / .6), y = h * .52 + Math.sin(t * .3) * 20, a = Math.sin(ph / .6 * Math.PI);
    ctx.save(); ctx.globalAlpha = .55 * a;
    ctx.fillStyle = '#01060a'; ctx.beginPath(); ctx.ellipse(x, y, w * .7, h * .1, .04, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + w * .6, y); ctx.quadraticCurveTo(x + w * .9, y - h * .06, x + w * 1.1, y + h * .03); ctx.quadraticCurveTo(x + w * .9, y + h * .02, x + w * .6, y + h * .04); ctx.fill();
    ctx.strokeStyle = 'rgba(95,231,255,.5)'; ctx.lineWidth = 2;
    for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(x - w * .6, y - 6, 10 * k, 18 * k, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
  // 研究站剪影
  const bx = w / 2, by = h * .78, sw = Math.min(w * .9, 560), sh = sw * .42;
  ctx.fillStyle = '#020a0f'; ctx.fillRect(bx - sw / 2, by - sh, sw, sh);
  ctx.fillRect(bx - 6, 0, 3, by - sh); ctx.fillRect(bx + sw * .3, 0, 2, by - sh);
  for (let k = 0; k < 6; k++) ctx.fillRect(bx - sw / 2 + 20 + k * (sw - 40) / 5, by, 10, h - by);
  const rows = 4, cols = 7;
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const on = Math.sin(i * 7.1 + j * 3.3) > -.2;
    if (!on) continue;
    const fl = Math.sin(t * (2 + (i * cols + j) % 3) + i * j) > .92 ? .2 : 1;
    ctx.fillStyle = (i + j) % 4 === 0 ? `rgba(255,176,80,${.55 * fl})` : `rgba(140,220,240,${.4 * fl})`;
    ctx.fillRect(bx - sw / 2 + 18 + j * (sw - 36) / cols, by - sh + 14 + i * (sh - 20) / rows, (sw - 36) / cols - 12, 5);
  }
  for (const s of R.snow) {
    s.y += .0004 * s.z; if (s.y > 1.05) { s.y = -.05; s.x = Math.random(); }
    ctx.fillStyle = `rgba(190,230,240,${s.o * s.z})`; ctx.fillRect(s.x * w + Math.sin(t * .5 + s.x * 9) * 6, s.y * h, s.s * s.z, s.s * s.z);
  }
  const vg = ctx.createRadialGradient(w / 2, h * .45, Math.min(w, h) * .2, w / 2, h * .45, Math.max(w, h) * .8);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.7)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
}
