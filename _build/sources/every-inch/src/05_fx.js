/* ───────────── 特效：槍口焰、彈殼、煙、爆炸、碎片、地面痕跡 ───────────── */
const PT = new Pool(() => ({ alive: false }), 1400);
const WIND = { x: 14 };
let DECAL = null;   // 地面痕跡圖層（戰場建立時設定）
const SHAKE = { t: 0, a: 0 };

function addShake(a) { if (store.get('shake', true)) SHAKE.a = Math.min(14, SHAKE.a + a); }
function hitStop(s) { G.hitStop = Math.max(G.hitStop, s); }

function P(type, x, y, o) {
  const p = PT.get(); if (!p) return null;
  p.type = type; p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.ay = 0; p.drag = 0; p.life = 0; p.max = 1; p.size = 1; p.grow = 0;
  p.rot = 0; p.vrot = 0; p.alpha = 1; p.add = false; p.layer = 1; p.gy = null; p.spr = null; p.col = null; p.bounce = 0.3; p.rest = 0; p.stamp = null; p.fade = 0.25; p.sx = 1;
  if (o) Object.assign(p, o);
  return p;
}

/* 槍口焰＋火光＋煙 */
function fxMuzzle(u, scale) {
  const m = weaponPt(u, u.w.muzzle);
  const a = u.rig.wa, fa = u.face > 0 ? a : Math.PI - a;
  const big = u.wk === 'rpg' ? 0 : u.wk === 'sr' ? 1.5 : u.wk === 'mg' ? 1.05 : u.wk === 'ft' ? 0 : 0.9;
  if (big) {
    P('flash', m[0], m[1], { rot: fa, max: 0.055, size: (scale || 1) * big * 0.62, spr: FXS['mf' + rndi(0, 2)] });
    P('glow', m[0], m[1], { max: 0.07, size: 0.32 * big, spr: FXS.gY, add: true });
    if (chance(0.6)) P('smoke', m[0] + Math.cos(fa) * 3, m[1] + Math.sin(fa) * 3, { vx: Math.cos(fa) * 18 + rnd(-4, 4), vy: Math.sin(fa) * 10 - rnd(6, 14), max: rnd(0.5, 0.9), size: 0.16, grow: 0.5, alpha: 0.4, spr: FXS.smokeL });
    if (u.wk !== 'ft') fxCasing(u);
    if (u.wk === 'sr' && u.st === 'prone') for (let i = 0; i < 6; i++) P('smoke', m[0] - u.face * rnd(0, 18), u.y - 1, { vx: u.face * rnd(-30, 40), vy: -rnd(6, 20), max: rnd(0.5, 0.9), size: 0.2, grow: 0.6, alpha: 0.6, spr: FXS.dust });
  }
  if (u.wk === 'rpg') {
    // 發射：前面一團火、後面一大片反衝煙塵
    P('glow', m[0], m[1], { max: 0.12, size: 1.5, spr: FXS.gO, add: true });
    const b = weaponPt(u, u.w.back), ba = fa + Math.PI;
    P('flash', b[0], b[1], { rot: ba, max: 0.09, size: 1.2, spr: FXS.mf2 });
    for (let i = 0; i < 14; i++) {
      const aa = ba + rnd(-0.5, 0.5), sp = rnd(40, 170);
      P('smoke', b[0], b[1], { vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp - rnd(0, 20), drag: 3, max: rnd(0.8, 1.6), size: rnd(0.2, 0.35), grow: 0.9, alpha: 0.75, spr: i % 3 ? FXS.dust : FXS.smoke });
    }
    addShake(1.5);
  }
}
function fxCasing(u, big) {
  const e = weaponPt(u, u.w.eject);
  const brass = u.wk === 'mg' && !PAL[u.pal].team ? '#d9b65a' : '#e2bd5c';
  P('casing', e[0], e[1], { vx: -u.face * rnd(18, 46), vy: -rnd(55, 95), ay: 520, vrot: rnd(-30, 30), max: 4, gy: u.y + rnd(-2, 3), col: brass, size: big ? 1.4 : 1, layer: 1, bounce: 0.35, stamp: 'casing' });
}
function fxDropPart(u, key, pt) {
  P('part', pt[0], pt[1], { vx: -u.face * rnd(4, 18), vy: rnd(-20, 10), ay: 520, vrot: rnd(-8, 8), rot: 0.3, max: 3.2, gy: u.y + rnd(-1, 2), spr: SPR[key], sx: u.face, bounce: 0.25, stamp: 'part' });
}
function fxBreath(x, y, face) {
  P('smoke', x, y, { vx: face * rnd(6, 12) + WIND.x * 0.3, vy: -rnd(2, 6), max: rnd(0.8, 1.2), size: 0.05, grow: 0.14, alpha: 0.35, spr: FXS.smokeL });
}
function fxThud(x, y) { for (let i = 0; i < 5; i++) P('smoke', x + rnd(-10, 10), y, { vx: rnd(-25, 25), vy: -rnd(4, 14), max: rnd(0.5, 0.9), size: 0.14, grow: 0.4, alpha: 0.55, spr: FXS.dust, layer: 0 }); }
function fxStep(x, y, big) { P('smoke', x, y, { vx: rnd(-8, 8), vy: -rnd(2, 8), max: 0.5, size: big ? 0.14 : 0.08, grow: 0.25, alpha: 0.45, spr: FXS.dust, layer: 0 }); }

/* 子彈打到東西 */
function fxImpact(x, y, kind, dir) {
  if (kind === 'flesh') {
    P('glow', x, y, { max: 0.05, size: 0.25, spr: FXS.gW, add: true });
    for (let i = 0; i < 3; i++) P('smoke', x, y, { vx: dir * rnd(10, 40), vy: -rnd(5, 25), max: 0.35, size: 0.06, grow: 0.25, alpha: 0.5, spr: FXS.dust });
  } else if (kind === 'metal') {
    P('glow', x, y, { max: 0.06, size: 0.35, spr: FXS.gY, add: true });
    for (let i = 0; i < 5; i++) { const a = rnd(0, TAU), s = rnd(60, 180); P('spark', x, y, { vx: Math.cos(a) * s - dir * 40, vy: Math.sin(a) * s - 40, ay: 400, max: rnd(0.15, 0.35), rot: a, add: true }); }
  } else { // 雪地／泥土
    for (let i = 0; i < 3; i++) P('smoke', x + rnd(-2, 2), y, { vx: rnd(-14, 14), vy: -rnd(16, 44), drag: 2, max: rnd(0.4, 0.7), size: 0.08, grow: 0.3, alpha: 0.75, spr: FXS.dust });
    for (let i = 0; i < 4; i++) P('chunk', x, y, { vx: rnd(-40, 40), vy: -rnd(60, 130), ay: 520, max: 1.4, gy: y + rnd(-1, 1), col: chance(0.6) ? '#f4f7fa' : '#8b7d6b', size: rnd(0.6, 1.3), vrot: rnd(-10, 10), bounce: 0.2 });
  }
}

/* 爆炸：閃光、火球、黑煙、碎片、衝擊波、焦痕 */
function fxExplosion(x, y, size, o) {
  o = o || {};
  const s = size;
  P('glow', x, y - 6 * s, { max: 0.16, size: 2.6 * s, spr: FXS.gW, add: true });
  P('glow', x, y - 8 * s, { max: 0.45, size: 2.2 * s, spr: FXS.gO, add: true });
  P('ball', x, y - 10 * s, { max: 0.32, size: 0.25 * s, grow: 2.2 * s, spr: FXS.ball, add: true });
  for (let i = 0; i < 3; i++) P('ball', x + rnd(-14, 14) * s, y - rnd(6, 22) * s, { max: rnd(0.22, 0.36), size: 0.15 * s, grow: rnd(1.2, 1.9) * s, spr: FXS.ball, add: true });
  P('ring', x, y - 2, { max: 0.3, size: 0.2 * s, grow: 3.2 * s, spr: FXS.ring, alpha: 0.7, sy: 0.32 });
  const nSmoke = Math.round(7 + 6 * s);
  for (let i = 0; i < nSmoke; i++) {
    const a = rnd(-Math.PI, 0), sp = rnd(10, 60) * s;
    P('smoke', x + rnd(-10, 10) * s, y - rnd(4, 20) * s, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rnd(8, 26), drag: 1.2, max: rnd(1.4, 2.8), size: rnd(0.3, 0.5) * s, grow: rnd(0.5, 0.9) * s, alpha: 0.85, spr: i % 3 === 0 ? FXS.smoke : FXS.smokeD });
  }
  for (let i = 0; i < 6 + 4 * s; i++) { // 雪地被掀起來
    const a = Math.PI + rnd(-0.2, 0.2) * (i % 2 ? 1 : -1), dir = i % 2 ? 1 : -1;
    P('smoke', x, y, { vx: dir * rnd(60, 160) * s, vy: -rnd(4, 30), drag: 3.2, max: rnd(0.7, 1.3), size: 0.2 * s, grow: 0.7 * s, alpha: 0.85, spr: FXS.dust, layer: 0 });
  }
  const nDeb = Math.round((o.debris || 10) * s);
  for (let i = 0; i < nDeb; i++) {
    const a = rnd(-Math.PI * 0.92, -Math.PI * 0.08), sp = rnd(120, 340) * Math.sqrt(s);
    P('chunk', x, y - 4, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ay: 600, max: 2.4, gy: y + rnd(-14, 14), col: o.metal && chance(0.5) ? '#3d4048' : chance(0.55) ? '#f1f4f7' : '#7d6f5f', size: rnd(0.8, 2.2), vrot: rnd(-14, 14), bounce: 0.25, trail: chance(0.3) });
  }
  for (let i = 0; i < 10 * s; i++) { const a = rnd(-Math.PI, 0), sp = rnd(120, 360); P('spark', x, y - 8, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ay: 380, max: rnd(0.25, 0.6), add: true }); }
  if (o.fire) for (let i = 0; i < 6; i++) P('fire', x + rnd(-12, 12) * s, y - rnd(0, 8), { vx: rnd(-8, 8), vy: -rnd(20, 50), max: rnd(0.5, 1.1), size: rnd(0.2, 0.36) * s, add: true });
  decalScorch(x, y, 14 * s + 6);
  addShake(3 + 4 * s);
  if (s >= 1.4) hitStop(0.05);
  sfx(s >= 1.5 ? 'boomBig' : s >= 0.9 ? 'boom' : 'boomS', x);
}
/* 燃燒的火焰（坦克殘骸、燒起來的地面） */
function fxFlame(x, y, s) {
  P('fire', x + rnd(-4, 4) * s, y, { vx: rnd(-6, 6) + WIND.x * 0.2, vy: -rnd(26, 50), max: rnd(0.35, 0.7), size: rnd(0.14, 0.24) * s, add: true });
  if (chance(0.35)) P('smoke', x, y - 10 * s, { vx: WIND.x * 0.8 + rnd(-5, 5), vy: -rnd(16, 30), max: rnd(1.6, 2.6), size: 0.2 * s, grow: 0.6 * s, alpha: 0.6, spr: FXS.smokeD });
}
function fxSmokeTrail(x, y, s, dark) {
  P('smoke', x, y, { vx: rnd(-6, 6) + WIND.x * 0.5, vy: -rnd(4, 12), max: rnd(0.6, 1.2), size: 0.1 * s, grow: 0.35 * s, alpha: 0.55, spr: dark ? FXS.smokeD : FXS.smoke });
}
function fxText(x, y, txt, col, size) { P('text', x, y, { vy: -38, max: 1.1, txt, col: col || '#fff', size: size || 1 }); }

/* 每格更新 */
function updateFx(dt) {
  SHAKE.a = Math.max(0, SHAKE.a - dt * 26);
  SHAKE.t += dt * 60;
  PT.each((p) => {
    p.life += dt;
    if (p.life >= p.max) { if (p.stamp && DECAL) stampDecal(p); PT.kill(p); return; }
    if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
    if (p.type === 'smoke' || p.type === 'fire') p.vx += (WIND.x - p.vx) * 0.25 * dt;
    p.vy += p.ay * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vrot * dt;
    p.size += p.grow * dt;
    if (p.gy !== null && p.y >= p.gy && p.vy > 0) {
      p.y = p.gy;
      if (Math.abs(p.vy) > 40) { p.vy *= -p.bounce; p.vx *= 0.55; p.vrot *= 0.5; if (p.type === 'casing' && chance(0.3)) sfx('tink', p.x); }
      else { p.vy = 0; p.vx *= 0.8; p.vrot *= 0.6; p.ay = 0; if (!p.rest) p.rest = p.life; if (p.type === 'part') { p.vrot = 0; p.rot = Math.round(p.rot / Math.PI) * Math.PI + rnd(-0.12, 0.12); } }
      if (p.trail) p.trail = false;
    }
    if (p.trail && chance(0.5)) P('smoke', p.x, p.y, { vy: -6, max: 0.6, size: 0.06, grow: 0.25, alpha: 0.45, spr: FXS.smokeD });
    if (p.type === 'casing' && p.rest && p.life - p.rest > 0.4 && DECAL) { stampDecal(p); PT.kill(p); }
    if (p.type === 'part' && p.rest && p.life - p.rest > 0.6 && DECAL) { stampDecal(p); PT.kill(p); }
  });
}

/* 每格畫：layer 0 在單位底下、layer 1 在單位上面 */
function drawFx(c, layer) {
  const items = PT.items;
  let add = false;
  for (let i = 0; i < items.length; i++) {
    const p = items[i];
    if (!p.alive || (layer !== undefined && p.layer !== layer)) continue;
    const t = p.life / p.max;
    if (p.add !== add) { c.globalCompositeOperation = p.add ? 'lighter' : 'source-over'; add = p.add; }
    switch (p.type) {
      case 'flash':
        c.globalAlpha = 1; dspr(c, p.spr, p.x, p.y, p.rot, p.size); break;
      case 'glow': case 'ball':
        c.globalAlpha = p.type === 'ball' ? Math.max(0, 1 - t * t) : (1 - t) * p.alpha;
        dspr(c, p.spr, p.x, p.y, 0, p.size); break;
      case 'ring':
        c.globalAlpha = (1 - t) * p.alpha; dspr(c, p.spr, p.x, p.y, 0, p.size, p.size * (p.sy || 1)); break;
      case 'smoke': {
        const a = p.alpha * (t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88);
        c.globalAlpha = Math.max(0, a); dspr(c, p.spr, p.x, p.y, p.rot, p.size); break;
      }
      case 'fire':
        c.globalAlpha = 1 - t; dspr(c, t < 0.4 ? FXS.gY : FXS.gO, p.x, p.y, 0, p.size * (1 - t * 0.5)); break;
      case 'spark':
        c.globalAlpha = 1 - t; dspr(c, FXS.spark, p.x, p.y, Math.atan2(p.vy, p.vx), 0.8); break;
      case 'chunk':
        c.globalAlpha = t > 0.8 ? (1 - t) * 5 : 1;
        c.fillStyle = p.col; c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.fillRect(-p.size, -p.size * 0.7, p.size * 2, p.size * 1.4); c.restore(); break;
      case 'casing':
        c.globalAlpha = 1; c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.fillStyle = p.col; c.fillRect(-1.3 * p.size, -0.55 * p.size, 2.6 * p.size, 1.1 * p.size);
        c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-1.3 * p.size, -0.55 * p.size, 2.6 * p.size, 0.35 * p.size);
        c.restore(); break;
      case 'part':
        c.globalAlpha = 1; c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(p.sx, 1); dspr(c, p.spr, 0, 0, 0); c.restore(); break;
      case 'text':
        c.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
        c.font = `900 ${Math.round(11 * p.size)}px "PingFang TC","Noto Sans TC",sans-serif`; c.textAlign = 'center';
        c.lineWidth = 3; c.strokeStyle = 'rgba(10,12,18,.85)'; c.strokeText(p.txt, p.x, p.y); c.fillStyle = p.col; c.fillText(p.txt, p.x, p.y); break;
    }
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}

/* ── 地面痕跡圖層：彈殼、焦痕、腳印、履帶印 ── */
function makeDecal(x0, y0, w, h, s) {
  const c = mkCanvas(w * s, h * s), g = c.getContext('2d');
  DECAL = { c, g, x0, y0, w, h, s, fadeT: 0 };
  return DECAL;
}
function stampDecal(p) {
  const D = DECAL, g = D.g;
  g.save(); g.setTransform(D.s, 0, 0, D.s, (-D.x0) * D.s, (-D.y0) * D.s);
  g.translate(p.x, p.y); g.rotate(p.rot);
  if (p.type === 'casing') { g.fillStyle = p.col; g.fillRect(-1.3 * p.size, -0.55 * p.size, 2.6 * p.size, 1.1 * p.size); }
  else if (p.type === 'part' && p.spr) { g.scale(p.sx, 1); g.globalAlpha = 0.95; dspr(g, p.spr, 0, 0, 0); }
  g.restore();
}
function decalScorch(x, y, r) {
  if (!DECAL) return;
  const D = DECAL, g = D.g;
  g.save(); g.setTransform(D.s, 0, 0, D.s, (-D.x0) * D.s, (-D.y0) * D.s);
  g.translate(x, y); g.scale(1, 0.36);
  g.fillStyle = rg(g, 0, 0, 0, r * 1.5, [0, 'rgba(40,34,30,.75)', 0.45, 'rgba(70,60,52,.45)', 1, 'rgba(90,80,70,0)']);
  g.beginPath(); g.arc(0, 0, r * 1.5, 0, TAU); g.fill();
  g.fillStyle = 'rgba(30,26,24,.55)'; g.beginPath();
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU, rr2 = r * rnd(0.5, 0.85); i ? g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : g.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
  g.closePath(); g.fill();
  g.restore();
}
function decalMark(x, y, w, h, col, rot) {
  if (!DECAL) return;
  const D = DECAL, g = D.g;
  g.save(); g.setTransform(D.s, 0, 0, D.s, (-D.x0) * D.s, (-D.y0) * D.s);
  g.translate(x, y); if (rot) g.rotate(rot); g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, TAU); g.fill(); g.restore();
}
/* 雪慢慢蓋掉舊痕跡 */
function decalSnowfall(dt, col) {
  if (!DECAL) return;
  DECAL.fadeT += dt;
  if (DECAL.fadeT < 1.5) return; DECAL.fadeT = 0;
  const g = DECAL.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.035; g.fillStyle = '#000'; g.fillRect(0, 0, DECAL.c.width, DECAL.c.height); g.restore();
}
