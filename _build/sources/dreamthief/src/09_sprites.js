'use strict';
/* 受擊閃白：往白色混一點、很快退掉（不整隻變白） */
const _fcache = new Map();
function flashCol(c, k) {   // k：往白色混多少（0～1）
  if (!(k > .04)) return c;
  const q = Math.min(10, Math.round(k * 10)), key = c + '|' + q;
  let v = _fcache.get(key);
  if (!v) { v = mixHex(c, '#ffffff', q / 10); _fcache.set(key, v); }
  return v;
}
const flashK = e => e.flash > 0 ? Math.min(1, e.flash / .09) : 0;
/* ====== 角色、夢衛、心魔、家具、出口的手繪 ====== */
function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); }
function shadowAt(c, x, y, rx, ry, a = .45) { c.fillStyle = `rgba(0,0,0,${a})`; ell(c, x, y, rx, ry); c.fill(); }
function limb(c, x1, y1, x2, y2, w, col) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }

/* ---------- 魏子葳 ---------- */
function drawPlayer(c, p, opt = {}) {
  const t = R.t, moving = p.spd > 20, f = p.face || 1;
  const s = moving ? Math.sin(p.walk * Math.PI) : 0;
  const bob = moving ? Math.abs(Math.sin(p.walk * Math.PI)) * 2.4 : Math.sin(t * 2.2) * .6;
  const back = Math.sin(p.aim) < -.62 && !opt.title;
  const la = f > 0 ? p.aim : Math.PI - p.aim;
  c.save(); c.translate(p.x, p.y);
  if (opt.scale) c.scale(opt.scale, opt.scale);
  shadowAt(c, 0, 0, 17, 5.5);
  if (p.mirrorT > 0) c.globalAlpha = .28 + .1 * Math.sin(t * 20);
  if (p.inv > 0 && p.hurt > 0 && Math.floor(t * 24) % 2) c.globalAlpha *= .45;
  c.scale(f, 1);
  const sway = clamp(-(p.vx || 0) * f / (3.75 * T) * 4, -4, 4) + Math.sin(t * 3) * .6;
  // 腿
  const hipY = -23 - bob * .3;
  limb(c, -3, hipY, -3 + s * 7, -2, 5.4, '#171824'); limb(c, 3, hipY, 3 - s * 7, -2, 5.4, '#1d1e2c');
  c.fillStyle = '#0a0a10'; ell(c, -3 + s * 7 + 2, -1.5, 4.5, 2.4); c.fill(); ell(c, 3 - s * 7 + 2, -1.5, 4.5, 2.4); c.fill();
  // 背著的晴
  if (p.carry) drawQingCarried(c, bob);
  c.translate(0, -bob);
  // 後手
  const armSw = moving ? -s * 5 : Math.sin(t * 2) * 1.2;
  if (!back) limb(c, -3, -46, -6 + armSw, -29, 5, '#161827');
  // 大衣
  c.fillStyle = '#1c1f33';
  c.beginPath(); c.moveTo(-8, -51); c.lineTo(8, -51); c.quadraticCurveTo(12, -32, 14 + sway, -11); c.quadraticCurveTo(1 + sway * .7, -7, -13 + sway * .6, -11); c.quadraticCurveTo(-11, -32, -8, -51); c.closePath(); c.fill();
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.moveTo(-8, -51); c.lineTo(-2, -51); c.quadraticCurveTo(-3, -30, -4 + sway * .6, -9); c.lineTo(-13 + sway * .6, -11); c.quadraticCurveTo(-11, -32, -8, -51); c.fill();
  if (!back) {
    c.fillStyle = '#45f2d6'; c.globalAlpha *= .9; c.beginPath(); c.moveTo(6, -47); c.quadraticCurveTo(10, -30, 14 + sway, -11); c.lineTo(9 + sway, -10); c.quadraticCurveTo(6, -28, 3, -42); c.closePath(); c.fill(); c.globalAlpha = c.globalAlpha / .9;
    c.fillStyle = '#2a2d40'; c.fillRect(-7, -27, 15, 3);
    // 夢燈
    c.strokeStyle = '#b08a4a'; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -26); c.lineTo(-7, -22); c.stroke();
    c.fillStyle = '#3a2a14'; c.fillRect(-10.5, -22, 7, 9); c.fillStyle = '#ffd27a'; c.fillRect(-9.5, -21, 5, 7);
  } else {
    c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -30); c.lineTo(sway * .6, -10); c.stroke();
  }
  // 領子
  c.fillStyle = '#14162a'; c.beginPath(); c.moveTo(-7, -50); c.lineTo(-3, -56); c.lineTo(4, -56); c.lineTo(8, -50); c.closePath(); c.fill();
  // 頭
  const hy = -61;
  if (!back) {
    c.fillStyle = '#e8d1bf'; ell(c, 2, hy, 7.2, 7.8); c.fill();
    c.fillStyle = '#121320'; c.beginPath(); c.arc(1, hy - 1, 8, Math.PI * .95, Math.PI * 2.08); c.quadraticCurveTo(6, hy - 4, 0, hy - 3); c.quadraticCurveTo(-4, hy + 2, -6, hy + 5); c.closePath(); c.fill();
    c.fillStyle = '#121320'; c.beginPath(); c.moveTo(-6, hy - 2); c.quadraticCurveTo(-8, hy + 6, -5, hy + 8); c.lineTo(-3, hy + 2); c.fill();
    // 眼罩推在額頭
    c.fillStyle = '#dde0ec'; c.beginPath(); c.moveTo(-4, hy - 6.5); c.lineTo(9.5, hy - 6); c.lineTo(9.5, hy - 2.6); c.lineTo(-4, hy - 3.4); c.closePath(); c.fill();
    c.strokeStyle = '#6a6e86'; c.lineWidth = .9; c.beginPath(); c.arc(5.5, hy - 5.4, 2, .2, Math.PI - .2); c.stroke();
    c.fillStyle = '#1a1a24'; c.fillRect(6.2, hy + .2, 1.6, 2);
  } else {
    c.fillStyle = '#121320'; ell(c, 1, hy, 8, 8.4); c.fill();
    c.fillStyle = '#dde0ec'; c.fillRect(-7, hy - 5, 16, 2.6);
  }
  // 拿槍的手
  const sx = 3, sy = -47, rec = (p.wpn ? p.wpn.recoil : 0) * 3.5;
  const hx = sx + Math.cos(la) * (15 - rec), hyy = sy + Math.sin(la) * (15 - rec);
  limb(c, sx, sy, hx, hyy, 5, back ? '#161827' : '#1f2236');
  c.save(); c.translate(hx, hyy); c.rotate(la);
  const wid = p.wpn ? p.wpn.id : 'revolver';
  c.fillStyle = '#26262f';
  if (wid === 'crossbow') { c.fillRect(-2, -2, 18, 4); c.strokeStyle = '#8a7a5a'; c.lineWidth = 1.6; c.beginPath(); c.arc(13, 0, 8, -1.3, 1.3); c.stroke(); }
  else if (wid === 'shotgun') { c.fillRect(-3, -3, 22, 5.5); c.fillStyle = '#5a3a22'; c.fillRect(-6, -2, 6, 5); }
  else if (wid === 'needle') { c.fillRect(-2, -3, 16, 6); c.fillStyle = '#53f0d6'; c.fillRect(4, -1, 9, 2); }
  else { c.fillRect(-2, -2.6, 15, 5); c.fillStyle = '#3a3a46'; c.fillRect(1, -1, 5, 5); c.fillStyle = '#7a5a34'; c.fillRect(-4, 0, 4, 5); }
  c.fillStyle = '#e8d1bf'; ell(c, 0, 0, 2.8, 2.8); c.fill();
  c.restore();
  c.restore();
  // 飛刃
  if (p.st && p.st.blades && !opt.title) {
    const n = p.st.blades;
    for (let i = 0; i < n; i++) { const a = p.bladeA + i * TAU / n, bx = p.x + Math.cos(a) * 1.55 * T, by = p.y - 12 + Math.sin(a) * 1.55 * T * .8; c.save(); c.translate(bx, by); c.rotate(a + R.t * 12); c.fillStyle = '#e9fbff'; c.beginPath(); c.moveTo(0, -9); c.lineTo(3, 0); c.lineTo(0, 9); c.lineTo(-3, 0); c.fill(); c.restore(); }
  }
  if (p.st && p.st.ward && p.wardT >= p.st.ward && !opt.title) { c.strokeStyle = rgba('#ffe39a', .35 + .15 * Math.sin(R.t * 4)); c.lineWidth = 1.5; ell(c, p.x, p.y - 30, 26, 36); c.stroke(); }
}
function drawQingCarried(c, bob) {
  c.save(); c.translate(-7, -36 - bob);
  c.fillStyle = '#c62a34'; c.beginPath(); c.ellipse(0, 4, 11, 15, -.25, 0, TAU); c.fill();
  c.fillStyle = '#a82029'; c.beginPath(); c.ellipse(4, -10, 8, 7, .2, 0, TAU); c.fill();
  c.fillStyle = '#f0dccd'; c.beginPath(); c.ellipse(7, -9, 4, 4.5, 0, 0, TAU); c.fill();
  c.strokeStyle = '#8a3a3a'; c.lineWidth = .8; c.beginPath(); c.moveTo(6, -9); c.lineTo(9, -9); c.stroke();
  c.fillStyle = '#efe1d4'; c.fillRect(-9, 16, 3, 9); c.fillStyle = '#c62a34'; c.fillRect(-3, 16, 3, 8);
  c.restore();
}

/* ---------- 夢衛 ---------- */
function drawFoe(c, e) {
  if (e.boss) { drawBoss(c, e); return; }
  const th = W.ch.th.foe, t = e.anim;
  const f = Math.cos(e.face) >= 0 ? 1 : -1;
  c.save(); c.translate(e.x, e.y);
  let a = 1;
  if (e.spawn > 0) { a = 1 - e.spawn / .9; c.fillStyle = rgba(th.body, .7); ell(c, 0, 0, 22 * (1.2 - a * .2), 8); c.fill(); c.translate(0, (1 - a) * 30); c.globalAlpha = a; }
  if (e.stun > 0) { c.translate(Math.sin(R.t * 40) * 1.2, 0); }
  const fk = flashK(e) * .42, body = flashCol(th.body, fk), mask = flashCol(th.mask, fk * .5);
  const alert = e.state === 'alert', sleep = e.state === 'sleep';
  switch (e.type) {
    case 'shade': case 'watcher': {
      const tall = e.type === 'watcher' ? 1.22 : 1;
      shadowAt(c, 0, 0, 15, 5, .4);
      c.scale(f, 1);
      if (sleep) c.rotate(-.18);
      const sway = Math.sin(t * 2.4) * 1.5 + (e.moving ? Math.sin(t * 9) * 2 : 0);
      const H = 48 * tall;
      // 身體（墨）
      c.fillStyle = body; c.beginPath(); c.moveTo(-12, -2);
      for (let i = 0; i <= 6; i++) { const x = -12 + i * 4.2, y = -1 + Math.sin(t * 7 + i * 1.7) * 2.2 + (i % 2 ? 3 : 0); c.lineTo(x, y); }
      c.quadraticCurveTo(13 + sway * .3, -H * .55, 7, -H + 4); c.lineTo(-6, -H + 4); c.quadraticCurveTo(-13, -H * .55, -12, -2); c.fill();
      if (W.chi === 2) { c.fillStyle = 'rgba(190,230,220,.18)'; c.fillRect(-10, -H * .55, 20, H * .4); }
      if (W.chi === 3) { c.fillStyle = 'rgba(240,240,250,.55)'; c.beginPath(); c.moveTo(-3, -H + 6); c.lineTo(3, -H + 6); c.lineTo(0, -H + 18); c.fill(); }
      if (W.chi === 1) { c.fillStyle = mask; c.fillRect(-4, -H + 6, 8, 3); }
      if (W.chi === 0 && e.type === 'shade') { c.fillStyle = '#7a1e2a'; c.beginPath(); c.moveTo(-1.5, -H + 7); c.lineTo(1.5, -H + 7); c.lineTo(2.5, -H + 20); c.lineTo(0, -H + 23); c.lineTo(-2.5, -H + 20); c.fill(); }
      // 手
      const raise = e.wind > 0 && e.windK === 'swipe' ? 1 - e.wind / .38 : 0;
      const ax = 9 + raise * 6, ay = -H * .5 - raise * 18;
      limb(c, 6, -H + 10, ax + sway * .3, ay + 22 - raise * 10, 3.6, body);
      limb(c, -6, -H + 10, -10 + sway * .2, -H * .35 + 14, 3.4, body);
      if (e.type === 'watcher') {
        // 提燈
        const lx = 15, ly = -H * .6 + Math.sin(t * 2) * 1.5 - (e.windK === 'scream' ? 18 : 0);
        limb(c, 6, -H + 12, lx, ly, 3.4, body);
        c.strokeStyle = '#3a3a3a'; c.lineWidth = 1; c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx, ly + 4); c.stroke();
        c.fillStyle = '#2a2420'; c.fillRect(lx - 4, ly + 4, 8, 10); c.fillStyle = e.windK === 'scream' && Math.floor(R.t * 16) % 2 ? '#ff4a4a' : alert ? '#ff9a6a' : '#ffe39a'; c.fillRect(lx - 3, ly + 5, 6, 8);
      }
      // 面具
      const my = -H - 3 + (sleep ? 4 : 0);
      c.fillStyle = mask; ell(c, 1.5, my, 7.2, 8.6); c.fill();
      if (W.chi === 0 && e.type === 'watcher') { c.fillStyle = '#20263a'; c.fillRect(-6, my - 11, 16, 4); c.fillRect(-2, my - 14, 10, 4); c.fillStyle = '#c8b46a'; c.fillRect(2, my - 12, 3, 2); }
      c.fillStyle = alert ? '#c41e2e' : '#1a1a22';
      if (sleep) { c.fillRect(-1.5, my - 1, 4, 1.2); c.fillRect(4.5, my - 1, 3.5, 1.2); }
      else { ell(c, .5, my - 1, 1.6, alert ? 2.6 : 2); c.fill(); ell(c, 5.5, my - 1, 1.6, alert ? 2.6 : 2); c.fill(); }
      if (e.windK === 'scream') { c.fillStyle = '#100'; ell(c, 3, my + 4, 2.6, 3.4 * (1 - e.wind / 1.05) + 1); c.fill(); }
      if (alert && W.chi !== 4) { c.strokeStyle = 'rgba(255,60,80,.8)'; c.lineWidth = .9; c.beginPath(); c.moveTo(3, my - 8); c.lineTo(1, my - 3); c.lineTo(4, my + 1); c.stroke(); }
      if (W.chi === 4) { c.strokeStyle = 'rgba(180,200,255,.35)'; c.lineWidth = 1; for (let i = 0; i < 3; i++) { const yy = (R.t * 60 + i * 17 + e.id * 9) % 40; c.beginPath(); c.moveTo(-6 + i * 6, -H + yy); c.lineTo(-6 + i * 6, -H + yy + 5); c.stroke(); } }
      if (sleep) zzz(c, 8, -H - 14, e.id);
      break;
    }
    case 'ripper': {
      shadowAt(c, 0, 0, 16, 5, .4); c.scale(f, 1);
      const crouch = e.wind > 0 ? 6 : 0, lean = e.dashT > 0 ? .35 : 0;
      c.rotate(lean);
      c.fillStyle = body; c.beginPath(); c.moveTo(-14, -2); c.lineTo(-8, -26 + crouch); c.lineTo(6, -30 + crouch); c.lineTo(15, -18 + crouch); c.lineTo(12, -2); c.closePath(); c.fill();
      for (let i = 0; i < 3; i++) limb(c, -8 + i * 8, -4, -10 + i * 8 + Math.sin(t * 12 + i) * 3, 0, 2.4, body);
      c.fillStyle = mask; c.beginPath(); c.moveTo(4, -32 + crouch); c.lineTo(18, -24 + crouch); c.lineTo(6, -18 + crouch); c.closePath(); c.fill();
      c.fillStyle = alert ? '#e0303e' : '#222'; c.fillRect(9, -27 + crouch, 3, 2);
      const op = Math.sin(t * 14) * .3 + (e.wind > 0 ? .5 : 0);
      c.fillStyle = shade(mask, -.15); c.save(); c.translate(10, -16 + crouch); c.rotate(-.3 - op); c.beginPath(); c.moveTo(0, -2); c.lineTo(24, 0); c.lineTo(0, 2); c.fill(); c.rotate(.6 + op * 2); c.beginPath(); c.moveTo(0, -2); c.lineTo(22, 0); c.lineTo(0, 2); c.fill(); c.restore();
      if (sleep) zzz(c, 6, -40, e.id);
      if (e.wind > 0 && e.windK === 'dash') { c.restore(); c.save(); c.translate(e.x, e.y); c.strokeStyle = rgba('#ff4a5a', .6); c.lineWidth = 3; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(e.face) * 4.5 * T, Math.sin(e.face) * 4.5 * T); c.stroke(); c.setLineDash([]); }
      break;
    }
    case 'beat': {
      shadowAt(c, 0, 0, 14, 5, .4);
      const pulse = W.beat;
      c.fillStyle = flashCol('#3a2016', fk); c.beginPath(); c.moveTo(-12, -4); c.lineTo(12, -4); c.lineTo(5, -40 - pulse * 3); c.lineTo(-5, -40 - pulse * 3); c.closePath(); c.fill();
      c.fillStyle = '#c79a4a'; c.fillRect(-12, -6, 24, 3); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(-6, -30, 12, 18);
      for (let i = 0; i < 4; i++) limb(c, -9 + i * 6, -4, -12 + i * 8 + Math.sin(t * 14 + i) * 2, 0, 2, '#2a160e');
      const sw = Math.sin(W.t / .72 * Math.PI) * .7;
      c.save(); c.translate(0, -12); c.rotate(sw); c.strokeStyle = '#e8d6b0'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -34); c.stroke(); c.fillStyle = '#f3dca0'; c.fillRect(-3, -26, 6, 4); c.restore();
      c.fillStyle = alert ? '#ff4a3a' : '#ffd08a'; ell(c, 0, -22, 2.2, 2.2); c.fill();
      if (pulse > .5 && alert) { c.strokeStyle = rgba('#ffd08a', pulse * .7); c.lineWidth = 2; ell(c, 0, -20, 18 + (1 - pulse) * 20, 22 + (1 - pulse) * 20); c.stroke(); }
      if (sleep) zzz(c, 6, -50, e.id);
      break;
    }
    case 'echo': {
      const hov = Math.sin(t * 3) * 4, hy = -44 + hov;
      shadowAt(c, 0, 0, 11, 4, .3);
      c.scale(f, 1);
      for (let i = 0; i < 3; i++) { c.strokeStyle = rgba(body, .85); c.lineWidth = 3 - i * .6; c.beginPath(); c.moveTo(-4 + i * 4, hy + 8); for (let k = 1; k <= 5; k++) c.lineTo(-4 + i * 4 + Math.sin(t * 5 + k + i) * 4, hy + 8 + k * 6); c.stroke(); }
      if (e.clone) { c.fillStyle = '#1d2c38'; c.fillRect(-11, hy - 2, 22, 26); c.fillStyle = 'rgba(200,240,255,.35)'; c.fillRect(-8, hy + 2, 16, 18); c.fillStyle = '#ffd77a'; ell(c, 0, hy + 11, 4, 4); c.fill(); c.fillStyle = '#f4f6fa'; ell(c, 0, hy - 8, 6, 7); c.fill(); c.fillStyle = '#111'; c.fillRect(-6, hy - 20, 12, 7); c.fillRect(-9, hy - 14, 18, 2); }
      else if (W.chi === 2) { c.fillStyle = rgba('#d8fbff', .85); c.beginPath(); c.moveTo(-9, hy - 10); c.lineTo(9, hy - 10); c.lineTo(10, hy + 8); c.quadraticCurveTo(0, hy + 14, -10, hy + 8); c.closePath(); c.fill(); c.fillStyle = rgba('#7ff9ff', .7); c.fillRect(-8, hy, 16, 8); }
      else { c.fillStyle = body; ell(c, 0, hy, 12, 11); c.fill(); c.fillStyle = mask; ell(c, 2, hy, 8, 7); c.fill(); }
      const wnd = e.wind > 0 ? 1 - e.wind / .45 : 0;
      c.fillStyle = alert ? '#ff3a4a' : th.glow; ell(c, 3, hy, 2.6 + wnd * 2.5, 2.6 + wnd * 2.5); c.fill();
      if (sleep) zzz(c, 6, hy - 16, e.id);
      break;
    }
    case 'eel': {
      const n = 9;
      for (let i = n - 1; i >= 0; i--) { const xx = -Math.cos(e.face) * i * 7 + Math.sin(t * 6 + i * .7) * 4 * Math.sin(e.face), yy = -Math.sin(e.face) * i * 5 + Math.sin(t * 6 + i * .7) * 4 * Math.cos(e.face) - 6; c.fillStyle = i === 0 ? '#2a4a5a' : rgba('#1a3a4a', .95); ell(c, xx, yy, 7 - i * .4, 5.5 - i * .35); c.fill(); if (i % 2 === 0) { c.fillStyle = rgba('#7ff9ff', .55 + .3 * Math.sin(R.t * 10 + i)); ell(c, xx, yy - 1, 2, 1.2); c.fill(); } }
      c.fillStyle = alert ? '#ff4a5a' : '#bff6ff'; ell(c, Math.cos(e.face) * 4, Math.sin(e.face) * 3 - 8, 1.6, 1.6); c.fill();
      if (e.wind > 0) { c.strokeStyle = rgba('#9fe8ff', .7); c.lineWidth = 2; ell(c, 0, 0, 3.4 * T * (1 - e.wind / .7), 3.4 * T * .5 * (1 - e.wind / .7)); c.stroke(); }
      break;
    }
    case 'cocoon': {
      shadowAt(c, 0, 0, 16, 5, .4);
      const sh = e.hatch > 0 ? Math.sin(R.t * 50) * 2 : 0, pul = .5 + .5 * Math.sin(t * 2.5);
      c.translate(sh, 0);
      c.fillStyle = body; ell(c, 0, -26, 15, 28); c.fill();
      c.strokeStyle = rgba(th.mask, .35); c.lineWidth = 1.4; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(0, -26, 15 - i * .5, 6 + i * 5, 0, Math.PI * .1, Math.PI * .9); c.stroke(); }
      c.fillStyle = rgba(th.glow, .3 + pul * .4 + (e.hatch > 0 ? .3 : 0)); ell(c, 0, -26, 6, 14); c.fill();
      if (e.hatch > 0) { c.strokeStyle = '#000'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-2, -50); c.lineTo(3, -38); c.lineTo(-3, -28); c.stroke(); }
      break;
    }
    case 'warden': {
      shadowAt(c, 0, 0, 30, 9, .5); c.scale(f, 1);
      const sw = e.moving ? Math.sin(t * 6) * 2 : 0, raise = e.wind > 0 && e.windK === 'slam' ? 1 - e.wind / .85 : 0;
      limb(c, -9, -30, -10 + sw, -2, 9, body); limb(c, 9, -30, 10 - sw, -2, 9, body);
      c.fillStyle = body; c.beginPath(); c.moveTo(-24, -32); c.quadraticCurveTo(-28, -70, -14, -86); c.lineTo(16, -86); c.quadraticCurveTo(30, -70, 24, -32); c.closePath(); c.fill();
      c.fillStyle = shade(th.cloth, .1); c.fillRect(-22, -40, 44, 7);
      // 胸口的鐘
      c.fillStyle = '#1a1612'; ell(c, 2, -62, 13, 13); c.fill(); c.fillStyle = '#e9dcc0'; ell(c, 2, -62, 11, 11); c.fill();
      c.strokeStyle = '#2a2018'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(2, -62); c.lineTo(2 + Math.cos(R.t * 2) * 8, -62 + Math.sin(R.t * 2) * 8); c.moveTo(2, -62); c.lineTo(2 + Math.cos(R.t * .2) * 5, -62 + Math.sin(R.t * .2) * 5); c.stroke();
      // 頭盔
      c.fillStyle = body; ell(c, 2, -92, 13, 11); c.fill(); c.fillStyle = alert ? '#ff3a4a' : th.glow; c.fillRect(-4, -94, 14, 2.6);
      // 手臂
      limb(c, 18, -78, 26 + raise * 4, -46 - raise * 40, 8, body); limb(c, -18, -78, -24 - raise * 4, -46 - raise * 40, 8, body);
      c.fillStyle = body; ell(c, 26 + raise * 4, -44 - raise * 40, 7, 7); c.fill(); ell(c, -24 - raise * 4, -44 - raise * 40, 7, 7); c.fill();
      if (e.wind > 0 && e.windK === 'slam') { c.restore(); c.save(); c.translate(e.x, e.y); c.fillStyle = rgba('#ff2a3a', .12 + .25 * raise); c.strokeStyle = rgba('#ff5a6a', .8); c.lineWidth = 2; ell(c, 0, 0, 2.1 * T, 2.1 * T * .62); c.fill(); c.stroke(); }
      if (sleep) zzz(c, 10, -108, e.id);
      break;
    }
  }
  c.restore();
}
function zzz(c, x, y, id) { const k = (R.t * .6 + id * .37) % 1; c.fillStyle = rgba('#d8ccff', .7 * (1 - k)); c.font = `600 ${9 + k * 5}px system-ui`; c.textAlign = 'center'; c.fillText('z', x + k * 8, y - k * 14); }

/* ---------- 心魔 ---------- */
function drawBoss(c, b) {
  const t = b.anim, th = W.ch.th.foe, fk = flashK(b) * .3, fl = fk > .04;
  c.save(); c.translate(b.x, b.y);
  if (b.fade) c.globalAlpha = .25;
  const P2 = b.phase === 2;
  const glowc = P2 ? '#ff4a5a' : th.glow;
  if (b.bid === 'desk') {
    shadowAt(c, 0, 4, 90, 18, .55);
    // 線纜觸手
    for (let i = 0; i < 6; i++) { const sx = (i < 3 ? -1 : 1) * (40 + (i % 3) * 14), sy = -60; c.strokeStyle = '#121620'; c.lineWidth = 5 - (i % 3); c.beginPath(); c.moveTo(sx, sy); let x = sx, y = sy; for (let k = 1; k < 7; k++) { x += (i < 3 ? -1 : 1) * 10; y += Math.sin(t * 2 + i + k * .8) * 8 + 4; c.lineTo(x, y); } c.stroke(); }
    // 桌子
    c.fillStyle = flashCol('#3a3d4a', fk); c.fillRect(-80, -70, 160, 14); c.fillStyle = flashCol('#24262f', fk * .85); c.fillRect(-76, -56, 152, 54);
    c.fillStyle = '#4d5061'; c.fillRect(-76, -56, 152, 4); for (let i = 0; i < 3; i++) { c.strokeStyle = 'rgba(0,0,0,.4)'; c.strokeRect(-70 + i * 48, -46, 40, 36); c.fillStyle = '#8a8e9e'; c.fillRect(-56 + i * 48, -30, 12, 3); }
    c.fillStyle = '#c8a24a'; c.fillRect(-20, -50, 40, 8); c.fillStyle = '#2a2018'; c.font = '700 7px system-ui'; c.textAlign = 'center'; c.fillText('SECURITY', 0, -44);
    // 螢幕
    const mons = [[-46, -96, 40, 30], [0, -100, 44, 34], [46, -96, 40, 30], [-22, -134, 40, 30], [24, -136, 38, 30]];
    const p = W.players[0];
    mons.forEach(([x, y, w, h], i) => {
      c.fillStyle = '#1a1c22'; c.fillRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6);
      c.fillStyle = P2 ? '#3a0a10' : '#0e2a2a'; c.fillRect(x - w / 2, y - h / 2, w, h);
      for (let k = 0; k < 5; k++) { c.fillStyle = rgba(P2 ? '#ff6a6a' : '#9fffe9', .1 + .1 * Math.random()); c.fillRect(x - w / 2, y - h / 2 + ((t * 40 + k * 7 + i * 5) % h), w, 1.5); }
      const ea = angTo(b.x + x, b.y + y, p.x, p.y);
      c.fillStyle = P2 ? '#ff9a9a' : '#c8fff4'; ell(c, x, y, w * .3, h * .25); c.fill();
      c.fillStyle = '#081010'; ell(c, x + Math.cos(ea) * 4, y + Math.sin(ea) * 3, 4, 4); c.fill();
    });
    c.fillStyle = '#20263a'; c.fillRect(8, -158, 34, 7); c.fillRect(14, -165, 22, 8); c.fillStyle = '#c8b46a'; c.fillRect(22, -162, 6, 3);
  } else if (b.bid === 'conductor') {
    shadowAt(c, 0, 0, 30, 9, .5);
    const f = Math.cos(b.face) >= 0 ? 1 : -1; c.scale(f, 1);
    c.fillStyle = flashCol('#120a08', fk);
    c.beginPath(); c.moveTo(-16, -2); c.lineTo(-20, -60); c.lineTo(-12, -108); c.lineTo(14, -108); c.lineTo(22, -60); c.lineTo(28, -6); c.lineTo(10, -40); c.lineTo(4, -2); c.closePath(); c.fill();
    c.fillStyle = '#f3e7d6'; c.beginPath(); c.moveTo(-4, -106); c.lineTo(6, -106); c.lineTo(1, -84); c.fill();
    c.fillStyle = '#c79a4a'; c.fillRect(-14, -66, 30, 3);
    // 節拍器頭
    c.fillStyle = '#3a2016'; c.beginPath(); c.moveTo(-14, -108); c.lineTo(14, -108); c.lineTo(6, -150); c.lineTo(-6, -150); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(-5, -142, 10, 26);
    const sw = Math.sin(W.t / .72 * Math.PI) * .6;
    c.save(); c.translate(0, -114); c.rotate(sw); c.strokeStyle = '#efe2c4'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -46); c.stroke(); c.fillStyle = '#f3dca0'; c.fillRect(-5, -36, 10, 6); c.restore();
    c.fillStyle = glowc; ell(c, 0, -126, 3.5, 3.5); c.fill();
    // 指揮棒
    const ba = -1.1 + Math.sin(t * 3) * .5 + W.beat * .6;
    limb(c, 12, -96, 12 + Math.cos(ba) * 26, -96 + Math.sin(ba) * 26, 6, '#120a08');
    c.strokeStyle = '#f3e7d6'; c.lineWidth = 2; c.beginPath(); c.moveTo(12 + Math.cos(ba) * 26, -96 + Math.sin(ba) * 26); c.lineTo(12 + Math.cos(ba) * 52, -96 + Math.sin(ba) * 52); c.stroke();
    for (let i = 0; i < 4; i++) { const a = t * .8 + i * 1.6, x = Math.cos(a) * 46, y = -80 + Math.sin(a * 1.3) * 30; c.fillStyle = rgba('#f3e7d6', .7); c.fillRect(x - 6, y - 8, 12, 15); c.fillStyle = '#3a2016'; for (let k = 0; k < 4; k++) c.fillRect(x - 5, y - 6 + k * 3.5, 10, .7); }
  } else if (b.bid === 'nurse') {
    shadowAt(c, 0, 0, 26, 8, .5);
    if (W.bags) for (const g of W.bags) if (!g.dead) { c.strokeStyle = rgba('#bff6ff', .5); c.lineWidth = 1.6; c.beginPath(); c.moveTo(-10, -70); c.quadraticCurveTo((g.x - b.x) * .5, -20, g.x - b.x, g.y - b.y - 46); c.stroke(); }
    const sw = Math.sin(t * 1.6) * 3;
    c.fillStyle = flashCol('#d6e6e4', fk); c.beginPath(); c.moveTo(-16, -2); c.lineTo(-14, -80); c.lineTo(14, -80); c.lineTo(20 + sw, -2); c.closePath(); c.fill();
    c.fillStyle = 'rgba(30,60,60,.25)'; c.fillRect(-12, -60, 26, 4);
    c.fillStyle = '#3fa39a'; c.fillRect(-14, -82, 28, 6);
    limb(c, -12, -76, -22 + sw, -36, 5, '#d6e6e4'); limb(c, 12, -76, 24 - sw, -40, 5, '#d6e6e4');
    c.fillStyle = '#0a0c0e'; c.beginPath(); c.moveTo(-14, -78); c.quadraticCurveTo(-16, -120, 0, -122); c.quadraticCurveTo(16, -120, 14, -78); c.lineTo(10, -40 + sw); c.lineTo(4, -70); c.lineTo(-4, -70); c.lineTo(-10, -42 - sw); c.closePath(); c.fill();
    c.fillStyle = '#f4f8f8'; c.fillRect(-6, -124, 12, 6); c.fillStyle = '#e04050'; c.fillRect(-1.5, -123, 3, 4); c.fillRect(-3, -121.5, 6, 1.2);
    c.fillStyle = glowc; ell(c, -3, -100, 1.6, 1.6); c.fill(); ell(c, 4, -100, 1.6, 1.6); c.fill();
    for (let i = 0; i < 3; i++) { const yy = (R.t * 70 + i * 23) % 60; c.fillStyle = rgba('#bff6ff', .6); ell(c, -18 + i * 18, -40 + yy, 1.6, 2.6); c.fill(); }
  } else if (b.bid === 'collector') {
    shadowAt(c, 0, 0, 40, 11, .55);
    const f = Math.cos(b.face) >= 0 ? 1 : -1; c.scale(f, 1);
    const sw = Math.sin(t * 2) * 2;
    limb(c, -12, -40, -14 + sw, -2, 10, '#141d26'); limb(c, 12, -40, 14 - sw, -2, 10, '#141d26');
    c.fillStyle = flashCol('#1d2c38', fk); c.beginPath(); c.moveTo(-36, -40); c.lineTo(-30, -128); c.lineTo(30, -128); c.lineTo(36, -40); c.closePath(); c.fill();
    // 展示櫃
    c.fillStyle = 'rgba(160,220,240,.18)'; c.fillRect(-24, -118, 48, 70); c.strokeStyle = '#c9a35b'; c.lineWidth = 2; c.strokeRect(-24, -118, 48, 70); c.beginPath(); c.moveTo(-24, -95); c.lineTo(24, -95); c.moveTo(-24, -72); c.lineTo(24, -72); c.stroke();
    const orbs = W.bossDead ? 0 : 3;
    for (let i = 0; i < orbs; i++) { const x = -12 + i * 12, y = -106 + i * 23; const g = c.createRadialGradient(x - 2, y - 2, 1, x, y, 8); g.addColorStop(0, '#fff6d0'); g.addColorStop(1, '#e0a020'); c.fillStyle = g; ell(c, x, y, 7, 7); c.fill(); }
    c.fillStyle = '#f4f6fa'; c.beginPath(); c.moveTo(-6, -128); c.lineTo(6, -128); c.lineTo(0, -112); c.fill();
    limb(c, -32, -120, -46 + sw, -70, 9, '#1d2c38'); limb(c, 32, -120, 48 - sw, -84 - (b.act === 'toss' ? 30 : 0), 9, '#1d2c38');
    c.fillStyle = '#f4f6fa'; ell(c, 0, -142, 13, 15); c.fill();
    c.fillStyle = '#0a0a0e'; c.fillRect(-14, -176, 28, 26); c.fillRect(-21, -152, 42, 5); c.fillStyle = '#c9a35b'; c.fillRect(-14, -158, 28, 3);
    c.strokeStyle = '#ffe3a8'; c.lineWidth = 1.4; ell(c, 5, -143, 4.5, 4.5); c.stroke(); c.beginPath(); c.moveTo(9, -141); c.lineTo(12, -126); c.stroke();
    c.fillStyle = glowc; ell(c, 5, -143, 1.6, 1.6); c.fill(); ell(c, -5, -143, 1.6, 1.6); c.fill();
  } else if (b.bid === 'thief') {
    const fake = { x: 0, y: 0, face: Math.cos(b.face) >= 0 ? 1 : -1, aim: b.face, spd: dist(0, 0, b.tx - b.x, b.ty - b.y) > 8 ? 60 : 0, walk: t * 2.5, vx: 0, wpn: { id: 'revolver', recoil: 0 }, mirrorT: 0, inv: 0, hurt: 0 };
    c.save(); c.scale(1.65, 1.65);
    // 背上的袋子
    c.save(); c.scale(fake.face, 1); const g = c.createRadialGradient(-14, -44, 2, -14, -44, 20); g.addColorStop(0, '#fff2b0'); g.addColorStop(.5, '#c99a3a'); g.addColorStop(1, '#5a3a10'); c.fillStyle = g; ell(c, -14, -42, 15, 17); c.fill(); c.strokeStyle = '#3a2408'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-6, -56); c.lineTo(4, -50); c.stroke(); c.restore();
    drawPlayer(c, fake, { title: true });
    // 眼罩拉下來蓋住眼睛
    c.save(); c.scale(fake.face, 1); c.fillStyle = '#dde0ec'; c.fillRect(-3, -63, 13, 4.5); c.fillStyle = '#6a6e86'; c.fillRect(1, -61.5, 6, 1); c.restore();
    c.restore();
    if (fl) { c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,255,255,${(1.2 * fk).toFixed(2)})`; ell(c, 0, -60, 30, 60); c.fill(); }
  }
  c.restore();
}

/* ---------- 家具（可搜索） ---------- */
function box(c, x0, x1, yb, yf, h, top, face, edge) {
  c.fillStyle = face; c.fillRect(x0, yf - h, x1 - x0, h);
  c.fillStyle = top; c.fillRect(x0, yb - h, x1 - x0, yf - yb);
  c.fillStyle = edge; c.fillRect(x0, yf - h - 1, x1 - x0, 1.6);
  c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(x0, yf - 3, x1 - x0, 3);
}
function drawContainer(c, k) {
  const id = k.def.id, x0 = k.tx * T + 4, x1 = (k.tx + k.w) * T - 4, yb = k.ty * T + 6, yf = (k.ty + 1) * T - 4, cx = (x0 + x1) / 2, o = k.open;
  shadowAt(c, cx, yf, (x1 - x0) * .55, 6, .35);
  const p = W.players[0];
  if (!o && p.ups && p.ups.eye && k.q > 1.6) { c.globalAlpha = .35 + .2 * Math.sin(R.t * 3); c.drawImage(glow('#ffc94a'), cx - 50, yf - 80, 100, 100); c.globalAlpha = 1; }
  if (k.special && !o && p.ups && p.ups.eye >= 5) { c.globalAlpha = .5; c.drawImage(glow('#b98aff'), cx - 40, yf - 70, 80, 80); c.globalAlpha = 1; }
  const dk = o ? -.25 : 0;
  switch (id) {
    case 'desk': {
      const ofc = W.chi === 0 || W.chi === 4;
      box(c, x0, x1, yb, yf, 26, shade(ofc ? '#59607a' : '#4a3020', dk), shade(ofc ? '#353a4c' : '#2e1c12', dk), ofc ? '#7d84a0' : '#8a5a35');
      if (ofc) { c.fillStyle = '#16181f'; c.fillRect(cx - 12, yb - 52, 24, 18); c.fillStyle = o ? '#1e2a2a' : '#5ac8b8'; c.fillRect(cx - 10, yb - 50, 20, 13); c.fillStyle = '#16181f'; c.fillRect(cx - 2, yb - 34, 4, 6); }
      else { c.fillStyle = '#e8dcc0'; c.fillRect(cx - 14, yb - 30, 12, 9); c.fillStyle = '#c9a35b'; ell(c, cx + 14, yb - 26, 4, 3); c.fill(); }
      c.fillStyle = 'rgba(240,240,255,.5)'; c.fillRect(x0 + 6, yb - 30, 10, 7);
      c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1; for (let i = 0; i < 2; i++) c.strokeRect(x0 + 8 + i * (x1 - x0 - 30), yf - 22, 14, 8);
      if (o) { c.fillStyle = '#0a0a10'; c.fillRect(x0 + 6, yf - 16, 18, 8); }
      break;
    }
    case 'cabinet': case 'locker': case 'medcab': case 'fridge': case 'wardrobe': case 'winecab': case 'shelf': {
      const H = { cabinet: 46, locker: 54, medcab: 50, fridge: 58, wardrobe: 62, winecab: 54, shelf: 58 }[id];
      const col = { cabinet: ['#666d82', '#4a5064', '#9aa2ba'], locker: ['#4f6a78', '#37505c', '#8fb0c0'], medcab: ['#dfe9e8', '#b6c6c4', '#ffffff'], fridge: ['#cfd8dc', '#9fb0b6', '#ffffff'], wardrobe: ['#3a2418', '#24160e', '#8a5a35'], winecab: ['#2a1810', '#1a0e08', '#c9a35b'], shelf: ['#3e2618', '#26160c', '#94633a'] }[id];
      box(c, x0 + 2, x1 - 2, yb + 6, yf, H, shade(col[0], dk), shade(col[1], dk), col[2]);
      const fy = yf - H, fh = H;
      c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1;
      if (id === 'cabinet') { for (let i = 0; i < 3; i++) { c.strokeRect(x0 + 6, fy + 4 + i * 14, x1 - x0 - 12, 12); c.fillStyle = '#c8ccd8'; c.fillRect(cx - 4, fy + 9 + i * 14, 8, 2); } if (o) { c.fillStyle = '#0a0a10'; c.fillRect(x0 + 6, fy + 18, x1 - x0 - 12, 9); c.fillStyle = '#eee'; c.fillRect(x0 + 9, fy + 18, 10, 3); } }
      else if (id === 'locker') { c.fillStyle = 'rgba(0,0,0,.4)'; for (let i = 0; i < 4; i++) c.fillRect(cx - 8, fy + 6 + i * 4, 16, 1.5); c.fillStyle = '#d0dde4'; c.fillRect(x1 - 12, fy + 26, 3, 8); if (o) { c.fillStyle = '#0a0a10'; c.fillRect(x0 + 5, fy + 3, x1 - x0 - 12, fh - 7); c.fillStyle = shade(col[1], .2); c.beginPath(); c.moveTo(x1 - 7, fy + 3); c.lineTo(x1 + 6, fy + 8); c.lineTo(x1 + 6, yf - 2); c.lineTo(x1 - 7, yf - 4); c.fill(); } }
      else if (id === 'medcab') { c.fillStyle = '#e04050'; c.fillRect(cx - 2.5, fy + 10, 5, 14); c.fillRect(cx - 7, fy + 14.5, 14, 5); c.strokeRect(x0 + 5, fy + 4, x1 - x0 - 10, fh - 8); if (o) { c.fillStyle = '#0a1012'; c.fillRect(x0 + 5, fy + 28, x1 - x0 - 10, 12); c.fillStyle = '#fff'; c.fillRect(x0 + 9, fy + 33, 5, 7); } }
      else if (id === 'fridge') { c.strokeRect(x0 + 5, fy + 4, x1 - x0 - 10, fh * .4); c.strokeRect(x0 + 5, fy + 6 + fh * .4, x1 - x0 - 10, fh * .5); c.fillStyle = '#7ff3ff'; c.fillRect(x0 + 8, fy + 8, 6, 3); c.fillStyle = '#e8eef0'; c.fillRect(x1 - 11, fy + 10, 3, 12); if (o) { c.fillStyle = '#9fe7ff'; c.globalAlpha = .5; c.fillRect(x0 + 5, fy + 6 + fh * .4, x1 - x0 - 10, fh * .5); c.globalAlpha = 1; } }
      else if (id === 'wardrobe') { c.beginPath(); c.moveTo(cx, fy + 3); c.lineTo(cx, yf - 4); c.stroke(); c.strokeRect(x0 + 6, fy + 5, x1 - x0 - 12, fh - 10); c.fillStyle = '#c9a35b'; c.fillRect(cx - 4, fy + fh * .45, 2, 6); c.fillRect(cx + 2, fy + fh * .45, 2, 6); if (o) { c.fillStyle = '#08060a'; c.fillRect(cx, fy + 5, x1 - cx - 6, fh - 10); } }
      else if (id === 'winecab') { for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) { c.fillStyle = o && r < 2 ? '#0a0608' : ['#5a1020', '#2a4a20', '#6a4a10'][(r + q) % 3]; ell(c, x0 + 10 + q * 10, fy + 9 + r * 11, 3.2, 3.2); c.fill(); } }
      else if (id === 'shelf') { for (let r = 0; r < 4; r++) { c.fillStyle = '#1a0e06'; c.fillRect(x0 + 5, fy + 4 + r * 13, x1 - x0 - 10, 11); for (let q = 0; q < 6; q++) { if (o && (q + r) % 3 === 0) continue; c.fillStyle = ['#8a2a2a', '#2a4a6a', '#c9a35b', '#4a6a3a', '#6a3a6a', '#d8d0c0'][(q * 3 + r) % 6]; c.fillRect(x0 + 6 + q * 5.2, fy + 5 + r * 13 + (q % 2), 4.2, 10 - (q % 2)); } } }
      break;
    }
    case 'safe': case 'velvet': case 'redbox': {
      if (id === 'safe') { box(c, x0 + 4, x1 - 4, yb + 10, yf, 34, shade('#4a4e58', dk), shade('#2c2f37', dk), '#c9a35b'); c.fillStyle = '#9aa0ad'; ell(c, cx, yf - 18, 7, 7); c.fill(); c.strokeStyle = '#2a2a30'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx, yf - 18); c.lineTo(cx + Math.cos(R.t) * 6, yf - 18 + Math.sin(R.t) * 6); c.stroke(); if (o) { c.fillStyle = '#05050a'; c.fillRect(x0 + 6, yf - 30, x1 - x0 - 12, 24); } }
      else if (id === 'velvet') { box(c, x0 + 6, x1 - 6, yb + 14, yf, 20, shade('#8a1a2a', dk), shade('#5a0f1a', dk), '#e8c070'); c.fillStyle = '#e8c070'; c.fillRect(cx - 3, yf - 14, 6, 6); }
      else { box(c, x0 + 8, x1 - 8, yb + 16, yf, 16, shade('#c62a34', dk), shade('#8a1820', dk), '#ff8a8a'); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x0 + 10, yb + 16 - 16, 8, 2); }
      if (!o) { c.globalAlpha = .4 + .2 * Math.sin(R.t * 3); c.drawImage(glow('#ffc94a'), cx - 30, yf - 60, 60, 60); c.globalAlpha = 1; }
      break;
    }
    case 'piano': {
      box(c, x0, x1, yb + 4, yf, 48, shade('#1c120c', dk), shade('#120a06', dk), '#94633a');
      c.fillStyle = '#efe6d2'; c.fillRect(x0 + 6, yf - 22, x1 - x0 - 12, 8);
      c.fillStyle = '#111'; for (let i = 0; i < 14; i++) if (i % 7 !== 2 && i % 7 !== 6) c.fillRect(x0 + 9 + i * (x1 - x0 - 16) / 14, yf - 22, 2.4, 5);
      c.fillStyle = '#e8dcc0'; c.fillRect(cx - 10, yf - 44, 20, 12); c.fillStyle = '#3a2016'; for (let k = 0; k < 4; k++) c.fillRect(cx - 9, yf - 42 + k * 3, 18, .6);
      c.fillStyle = '#f3dca0'; c.fillRect(x0 + 8, yf - 58, 3, 10); c.fillStyle = '#ffcf7a'; ell(c, x0 + 9.5, yf - 60, 2, 3); c.fill();
      if (o) { c.fillStyle = '#0a0606'; c.fillRect(x0 + 10, yf - 12, x1 - x0 - 20, 6); }
      break;
    }
    case 'case': { box(c, x0 + 4, x1 - 4, yb + 18, yf, 12, shade('#2a1a12', dk), shade('#1a0e08', dk), '#94633a'); c.fillStyle = '#c9a35b'; c.fillRect(cx - 2, yf - 10, 4, 4); if (o) { c.fillStyle = '#5a1018'; c.fillRect(x0 + 6, yb + 6, x1 - x0 - 12, 8); } break; }
    case 'vanity': { box(c, x0 + 2, x1 - 2, yb + 10, yf, 30, shade('#4a2a1c', dk), shade('#2e1a10', dk), '#c79a4a'); c.fillStyle = '#c79a4a'; ell(c, cx, yb - 32, 12, 15); c.fill(); c.fillStyle = o ? '#2a2a34' : '#9fb8c8'; ell(c, cx, yb - 32, 10, 13); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(cx - 5, yb - 40, 2, 10); break; }
    case 'bed': {
      box(c, x0, x1, yb, yf, 18, shade('#e8f0ef', dk), shade('#9fb0ae', dk), '#ffffff');
      c.fillStyle = shade('#cfdde0', dk); c.fillRect(x0 + 4, yb - 18, 22, yf - yb - 6);
      c.fillStyle = 'rgba(80,120,130,.4)'; c.fillRect(x0 + 30, yb - 14, x1 - x0 - 36, yf - yb - 8);
      c.strokeStyle = '#8a9ea0'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 + 2, yb - 26); c.lineTo(x1 - 2, yb - 26); c.stroke();
      if (o) { c.fillStyle = '#5a6a6c'; c.fillRect(x0 + 30, yb - 14, 20, 6); }
      break;
    }
    case 'cart': { box(c, x0 + 6, x1 - 6, yb + 12, yf - 4, 26, shade('#b8c6c8', dk), shade('#7e8e90', dk), '#ffffff'); c.fillStyle = '#eef'; c.fillRect(cx - 8, yb - 18, 6, 4); c.fillStyle = '#e04050'; c.fillRect(cx + 2, yb - 18, 5, 3); c.fillStyle = '#222'; ell(c, x0 + 9, yf - 2, 2.5, 2.5); c.fill(); ell(c, x1 - 9, yf - 2, 2.5, 2.5); c.fill(); break; }
    case 'display': {
      box(c, x0 + 4, x1 - 4, yb + 8, yf, 18, '#2a1c12', '#1a120a', '#c9a35b');
      c.fillStyle = 'rgba(170,230,245,.18)'; c.fillRect(x0 + 6, yf - 52, x1 - x0 - 12, 34); c.strokeStyle = '#c9a35b'; c.lineWidth = 1.2; c.strokeRect(x0 + 6, yf - 52, x1 - x0 - 12, 34);
      if (!o) { const g = c.createRadialGradient(cx, yf - 34, 1, cx, yf - 34, 8); g.addColorStop(0, '#fff'); g.addColorStop(1, RAR[clamp(Math.round(k.q), 1, 4)].c); c.fillStyle = g; ell(c, cx, yf - 34 + Math.sin(R.t * 2) * 1.5, 6, 6); c.fill(); }
      else { c.strokeStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(x0 + 8, yf - 50); c.lineTo(cx, yf - 30); c.lineTo(x1 - 10, yf - 46); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x0 + 8, yf - 50, 2, 28);
      break;
    }
    default: box(c, x0, x1, yb, yf, 30, '#555', '#333', '#888');
  }
}

/* ---------- 擺設 ---------- */
function drawDecor(c, d) {
  const x = d.x, y = d.y;
  switch (d.k) {
    case 'plant': shadowAt(c, x, y, 10, 4, .35); c.fillStyle = '#5a3a2a'; c.fillRect(x - 7, y - 14, 14, 14); c.fillStyle = '#2f5a3a'; for (let i = 0; i < 6; i++) { c.save(); c.translate(x, y - 14); c.rotate(-1.2 + i * .48 + Math.sin(R.t + i) * .05); ell(c, 0, -12, 3.5, 12); c.fill(); c.restore(); } break;
    case 'cooler': shadowAt(c, x, y, 9, 4, .35); c.fillStyle = '#c8d2dc'; c.fillRect(x - 8, y - 30, 16, 30); c.fillStyle = 'rgba(120,190,255,.6)'; ell(c, x, y - 40, 8, 10); c.fill(); c.fillStyle = '#3a6aaa'; c.fillRect(x - 3, y - 22, 6, 3); break;
    case 'chair': shadowAt(c, x, y, 10, 4, .3); c.fillStyle = W.chi === 1 ? '#5a1a22' : W.chi === 3 ? '#2a1d14' : '#2a2e3c'; c.fillRect(x - 9, y - 14, 18, 5); c.fillRect(x - 9, y - 30, 18, 15); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x - 8, y - 9, 2, 9); c.fillRect(x + 6, y - 9, 2, 9); break;
    case 'papers': c.fillStyle = 'rgba(230,230,240,.55)'; for (let i = 0; i < 4; i++) { c.save(); c.translate(x + Math.cos(i * 2.3 + d.f * 9) * 14, y + Math.sin(i * 1.7 + d.f * 5) * 8); c.rotate(i + d.f * 6); c.fillRect(-6, -4, 12, 8); c.restore(); } break;
    case 'stand': shadowAt(c, x, y, 8, 3, .3); c.strokeStyle = '#1a1a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 34); c.moveTo(x - 7, y); c.lineTo(x, y - 6); c.lineTo(x + 7, y); c.stroke(); c.fillStyle = '#2a2420'; c.fillRect(x - 11, y - 46, 22, 14); c.fillStyle = '#efe6d2'; c.fillRect(x - 9, y - 45, 18, 11); break;
    case 'iv': shadowAt(c, x, y, 8, 3, .3); c.strokeStyle = '#9aa8ac'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 58); c.moveTo(x - 8, y); c.lineTo(x + 8, y); c.stroke(); c.fillStyle = 'rgba(210,250,255,.7)'; c.fillRect(x + 2, y - 60, 10, 14); c.strokeStyle = 'rgba(210,250,255,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 7, y - 46); c.quadraticCurveTo(x + 14, y - 20, x + 4, y - 6); c.stroke(); break;
    case 'wheel': shadowAt(c, x, y, 12, 4, .3); c.strokeStyle = '#7a8a8e'; c.lineWidth = 2.5; ell(c, x - 2, y - 10, 9, 9); c.stroke(); c.fillStyle = '#2a3a3e'; c.fillRect(x - 8, y - 22, 16, 6); c.fillRect(x + 4, y - 36, 4, 16); break;
    case 'puddle': c.fillStyle = 'rgba(150,200,230,.14)'; ell(c, x, y, 22 + d.f * 10, 9 + d.f * 4); c.fill(); c.strokeStyle = 'rgba(200,230,255,.18)'; c.lineWidth = 1; ell(c, x, y, 10 + ((R.t * 10 + d.f * 20) % 14), 4 + ((R.t * 10 + d.f * 20) % 14) * .4); c.stroke(); break;
    case 'statue': shadowAt(c, x, y, 12, 4, .35); c.fillStyle = '#3a4a52'; c.fillRect(x - 10, y - 26, 20, 26); c.fillStyle = '#c8d4d8'; ell(c, x, y - 36, 8, 10); c.fill(); c.fillRect(x - 10, y - 30, 20, 6); break;
    case 'rug': c.fillStyle = W.chi === 3 ? 'rgba(90,30,30,.55)' : 'rgba(60,30,40,.45)'; c.fillRect(x - 40, y - 22, 80, 44); c.strokeStyle = 'rgba(201,163,91,.5)'; c.lineWidth = 2; c.strokeRect(x - 36, y - 18, 72, 36); break;
    case 'umbrella': shadowAt(c, x, y, 18, 5, .3); c.fillStyle = '#c62a34'; c.beginPath(); c.moveTo(x - 22, y - 2); c.quadraticCurveTo(x - 4, y - 22, x + 18, y - 6); c.closePath(); c.fill(); c.strokeStyle = '#3a1a1a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - 2, y - 10); c.lineTo(x + 14, y + 4); c.stroke(); break;
    case 'shoe': c.fillStyle = '#c62a34'; ell(c, x, y - 2, 8, 4); c.fill(); c.fillStyle = '#7a1a20'; ell(c, x + 3, y - 3, 3, 2); c.fill(); break;
  }
}

/* ---------- 出口 ---------- */
function drawExit(c, e) {
  const x = e.x, y = e.y, t = R.t;
  if (e.type === 'stairs') {
    c.fillStyle = '#4a4458'; ell(c, x, y, 46, 27); c.fill();
    const g = c.createRadialGradient(x, y + 4, 2, x, y, 42); g.addColorStop(0, '#000'); g.addColorStop(.7, '#140d24'); g.addColorStop(1, '#2a2240'); c.fillStyle = g; ell(c, x, y, 40, 23); c.fill();
    c.strokeStyle = 'rgba(180,150,255,.35)'; c.lineWidth = 2;
    for (let i = 0; i < 12; i++) { const a = t * .6 + i * TAU / 12; const r1 = 38, r2 = 10; c.beginPath(); c.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * .58); c.quadraticCurveTo(x + Math.cos(a + .6) * 24, y + Math.sin(a + .6) * 14, x + Math.cos(a + 1.2) * r2, y + Math.sin(a + 1.2) * r2 * .58); c.stroke(); }
    c.fillStyle = rgba('#b394ff', .5 + .2 * Math.sin(t * 3)); ell(c, x, y + 2, 6, 3.5); c.fill();
    return;
  }
  if (e.type === 'bell') {
    const off = W.collapse && W.finalPhase < 2;
    shadowAt(c, x, y, 36, 8, .4);
    c.fillStyle = '#2e1c10'; c.beginPath(); c.moveTo(x - 30, y); c.lineTo(x - 30, y - 92); c.quadraticCurveTo(x, y - 122, x + 30, y - 92); c.lineTo(x + 30, y); c.closePath(); c.fill();
    c.fillStyle = off ? '#0a0806' : '#180c06'; c.beginPath(); c.moveTo(x - 22, y); c.lineTo(x - 22, y - 86); c.quadraticCurveTo(x, y - 110, x + 22, y - 86); c.lineTo(x + 22, y); c.closePath(); c.fill();
    if (!off) { c.fillStyle = rgba('#ffcf80', .55 + .25 * Math.sin(t * 2.4)); c.fillRect(x - 1.5, y - 94, 3, 92); }
    c.strokeStyle = '#c79a4a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 30, y); c.lineTo(x - 30, y - 92); c.quadraticCurveTo(x, y - 122, x + 30, y - 92); c.lineTo(x + 30, y); c.stroke();
    c.fillStyle = '#2a1a10'; ell(c, x, y - 126, 19, 19); c.fill(); c.fillStyle = off ? '#5a5048' : '#efe2c0'; ell(c, x, y - 126, 16, 16); c.fill();
    c.strokeStyle = '#2a1a10'; c.lineWidth = 1.5; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(x + Math.cos(a) * 13, y - 126 + Math.sin(a) * 13); c.lineTo(x + Math.cos(a) * 15, y - 126 + Math.sin(a) * 15); c.stroke(); }
    c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - 126); c.lineTo(x + Math.cos(-1.4) * 10, y - 126 + Math.sin(-1.4) * 10); c.moveTo(x, y - 126); c.lineTo(x + Math.cos(t * (W.channel ? 4 : .4)) * 13, y - 126 + Math.sin(t * (W.channel ? 4 : .4)) * 13); c.stroke();
    c.fillStyle = '#c79a4a'; c.beginPath(); c.moveTo(x - 8, y - 146); c.quadraticCurveTo(x, y - 162, x + 8, y - 146); c.closePath(); c.fill();
    if (off) { c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 10, y - 140); c.lineTo(x + 4, y - 120); c.lineTo(x - 4, y - 112); c.stroke(); }
    return;
  }
  if (e.type === 'window') {
    const top = y - 128, bot = y - 30;
    c.fillStyle = '#1a1622'; c.fillRect(x - 40, top - 6, 80, bot - top + 12);
    const g = c.createLinearGradient(0, top, 0, bot); g.addColorStop(0, '#0b1636'); g.addColorStop(1, '#3a4a7a'); c.fillStyle = g; c.fillRect(x - 34, top, 68, bot - top);
    c.fillStyle = '#f2f4ff'; ell(c, x + 10, top + 30, 15, 15); c.fill(); c.fillStyle = '#c8d0f0'; ell(c, x + 14, top + 26, 4, 4); c.fill();
    for (let i = 0; i < 9; i++) { c.fillStyle = rgba('#fff', .5 + .5 * Math.sin(t * 2 + i)); c.fillRect(x - 30 + (i * 29 % 60), top + 6 + (i * 13 % 50), 1.5, 1.5); }
    c.strokeStyle = '#2a2430'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, top); c.lineTo(x, bot); c.moveTo(x - 34, (top + bot) / 2); c.lineTo(x + 34, (top + bot) / 2); c.stroke();
    const cw = Math.sin(t * 1.8) * 6;
    c.fillStyle = W.chi === 1 ? '#6a1a24' : W.chi === 3 ? '#2a4a5a' : '#3a3a52';
    c.beginPath(); c.moveTo(x - 42, top - 8); c.lineTo(x - 24 + cw, top - 8); c.quadraticCurveTo(x - 30 + cw * 1.5, (top + bot) / 2, x - 34 + cw * 2, bot + 10); c.lineTo(x - 42, bot + 10); c.fill();
    c.beginPath(); c.moveTo(x + 42, top - 8); c.lineTo(x + 24 + cw, top - 8); c.quadraticCurveTo(x + 30 + cw * 1.5, (top + bot) / 2, x + 34 + cw * 2, bot + 10); c.lineTo(x + 42, bot + 10); c.fill();
    c.fillStyle = '#4a4458'; c.fillRect(x - 44, bot, 88, 6);
    c.fillStyle = rgba('#b8d8ff', .08); c.beginPath(); c.moveTo(x - 34, bot + 6); c.lineTo(x + 34, bot + 6); c.lineTo(x + 50, y + 40); c.lineTo(x - 50, y + 40); c.fill();
  }
}
function drawMirror(c, mi) {
  const x = mi.x, y = mi.y, top = y - 84, bot = y - 4;
  c.fillStyle = '#7a5a28'; c.beginPath(); c.ellipse(x, (top + bot) / 2, 22, (bot - top) / 2 + 3, 0, 0, TAU); c.fill();
  if (mi.broken) { c.fillStyle = '#0a0c10'; ell(c, x, (top + bot) / 2, 18, (bot - top) / 2 - 1); c.fill(); c.strokeStyle = 'rgba(200,240,255,.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 10, top + 10); c.lineTo(x + 2, (top + bot) / 2); c.lineTo(x - 6, bot - 8); c.moveTo(x + 2, (top + bot) / 2); c.lineTo(x + 12, top + 20); c.stroke(); return; }
  const g = c.createLinearGradient(x - 18, top, x + 18, bot); g.addColorStop(0, '#9fc8d8'); g.addColorStop(.5, '#2a4a5a'); g.addColorStop(1, '#6a9aaa'); c.fillStyle = g; ell(c, x, (top + bot) / 2, 18, (bot - top) / 2 - 1); c.fill();
  const sh = ((R.t * 30 + mi.id * 40) % 100) / 100; c.fillStyle = 'rgba(255,255,255,.35)'; c.save(); c.beginPath(); c.ellipse(x, (top + bot) / 2, 18, (bot - top) / 2 - 1, 0, 0, TAU); c.clip(); c.fillRect(x - 30 + sh * 60, top, 6, bot - top); c.restore();
  c.fillStyle = 'rgba(14,26,34,.6)'; ell(c, x, bot - 18, 6, 14); c.fill(); ell(c, x, bot - 36, 4.5, 5); c.fill();
}
function drawCam(c, k) {
  if (k.dead) { c.fillStyle = '#222'; c.fillRect(k.x - 6, k.y - 46, 12, 6); return; }
  c.fillStyle = '#2a2e3a'; c.fillRect(k.x - 2, k.y - 50, 4, 10);
  c.save(); c.translate(k.x, k.y - 40); c.rotate(k.a || 0); c.fillStyle = '#c8ccd8'; c.fillRect(-4, -5, 16, 10); c.fillStyle = '#111'; c.fillRect(10, -3, 4, 6); c.restore();
  c.fillStyle = Math.floor(R.t * 2) % 2 ? '#ff3030' : '#601010'; ell(c, k.x, k.y - 47, 1.6, 1.6); c.fill();
  if (k.aware > .05) { c.fillStyle = '#300'; c.fillRect(k.x - 12, k.y - 62, 24, 4); c.fillStyle = '#ff4a4a'; c.fillRect(k.x - 12, k.y - 62, 24 * k.aware, 4); }
}
function drawIVBag(c, g) { c.strokeStyle = '#9aa8ac'; c.lineWidth = 3; c.beginPath(); c.moveTo(g.x, g.y); c.lineTo(g.x, g.y - 70); c.stroke(); c.fillStyle = 'rgba(210,250,255,.8)'; c.fillRect(g.x - 10, g.y - 74, 20, 26); c.fillStyle = '#7ff9ff'; c.fillRect(g.x - 8, g.y - 60 + (1 - g.hp / 170) * 10, 16, 10 - (1 - g.hp / 170) * 10); c.fillStyle = '#300'; c.fillRect(g.x - 14, g.y - 84, 28, 4); c.fillStyle = '#7ff9ff'; c.fillRect(g.x - 14, g.y - 84, 28 * g.hp / 170, 4); }

/* ---------- 撿得到的東西 ---------- */
function drawPick(c, k) {
  if (k.k === 'xp') { const b = Math.sin(R.t * 5 + k.x) * 2; c.fillStyle = '#7ff9e4'; c.beginPath(); c.moveTo(k.x, k.y - 14 + b); c.lineTo(k.x + 4, k.y - 9 + b); c.lineTo(k.x, k.y - 4 + b); c.lineTo(k.x - 4, k.y - 9 + b); c.fill(); return; }
  if (k.k === 'candy') { c.fillStyle = '#ff8fb8'; ell(c, k.x, k.y - 8, 5, 4); c.fill(); c.beginPath(); c.moveTo(k.x - 5, k.y - 8); c.lineTo(k.x - 10, k.y - 12); c.lineTo(k.x - 10, k.y - 4); c.fill(); c.beginPath(); c.moveTo(k.x + 5, k.y - 8); c.lineTo(k.x + 10, k.y - 12); c.lineTo(k.x + 10, k.y - 4); c.fill(); return; }
  const r = k.item.rar, col = RAR[r].c, rad = 7 + r * 1.3 + (k.item.kind !== 'gen' ? 2 : 0);
  const bob = k.z > 0 ? 0 : Math.sin(R.t * 2.5 + k.x * .1) * 3;
  const yy = k.y - 20 - (k.z || 0) + bob;
  shadowAt(c, k.x, k.y, rad * .9, rad * .35, .35);
  const g = c.createRadialGradient(k.x - rad * .35, yy - rad * .35, 1, k.x, yy, rad);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.35, mixHex(col, '#ffffff', .4)); g.addColorStop(1, shade(col, -.3));
  c.fillStyle = g; ell(c, k.x, yy, rad, rad); c.fill();
  c.strokeStyle = rgba('#ffffff', .5); c.lineWidth = 1; c.beginPath(); c.arc(k.x, yy, rad * .55, R.t * 2, R.t * 2 + 2.2); c.stroke();
  if (k.item.kind === 'core') { c.strokeStyle = '#ffd0d4'; c.lineWidth = 1.5; ell(c, k.x, yy, rad + 4 + Math.sin(R.t * 5) * 2, rad + 4 + Math.sin(R.t * 5) * 2); c.stroke(); }
}
function drawDecoy(c, d) {
  let x = d.x, y = d.y, z = 0;
  if (d.fly && d.t < d.fly) { const k = d.t / d.fly; x = lerp(d.sx, d.x, k); y = lerp(d.sy, d.y, k); z = Math.sin(k * Math.PI) * 40; }
  if (d.ghost) { c.globalAlpha = .35 * (1 - d.t / d.life); drawPlayer(c, Object.assign({}, W.players[0], { x: d.x, y: d.y, spd: 0, mirrorT: 0 })); c.globalAlpha = 1; return; }
  c.fillStyle = '#bff9f0'; ell(c, x, y - 6 - z, 5, 5); c.fill();
  if (!(d.fly && d.t < d.fly)) { const k = (d.t % .7) / .7; c.strokeStyle = rgba('#53f0d6', .6 * (1 - k)); c.lineWidth = 2; ell(c, x, y, 10 + k * 50, (10 + k * 50) * .55); c.stroke(); }
}
function drawFerry(c, f) {
  const t = R.t, x = f.x, y = f.y, bob = Math.sin(t * 1.5) * 2;
  shadowAt(c, x, y, 18, 5, .35);
  c.save(); c.translate(x, y - bob); c.scale(f.face || 1, 1);
  c.fillStyle = '#1a1a24'; c.beginPath(); c.moveTo(-12, 0); c.lineTo(-10, -44); c.lineTo(10, -44); c.lineTo(14, 0); c.closePath(); c.fill();
  c.fillStyle = '#2a2a38'; c.fillRect(-10, -30, 22, 3);
  c.fillStyle = '#c8b88a'; c.beginPath(); c.moveTo(-22, -50); c.lineTo(0, -66); c.lineTo(22, -50); c.closePath(); c.fill(); c.fillStyle = '#8a7a4a'; c.fillRect(-22, -51, 44, 2);
  c.fillStyle = '#05050a'; ell(c, 0, -46, 7, 5); c.fill();
  c.strokeStyle = '#5a4a32'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(14, -40); c.lineTo(22, 6); c.stroke();
  c.strokeStyle = '#5a4a32'; c.lineWidth = 1; c.beginPath(); c.moveTo(-10, -36); c.lineTo(-20, -30); c.stroke();
  c.fillStyle = '#ffcf7a'; c.fillRect(-24, -30, 7, 9);
  c.restore();
  if (dist(x, y, W.players[0].x, W.players[0].y) < 3 * T) { c.font = '600 12px "Noto Serif TC",serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#000'; c.strokeText('渡夢人', x, y - 76); c.fillStyle = '#ffe2a0'; c.fillText('渡夢人', x, y - 76); }
}
function drawQing(c, x, y) {
  shadowAt(c, x, y + 2, 26, 7, .4);
  c.fillStyle = '#c62a34'; c.beginPath(); c.ellipse(x, y - 8, 24, 11, -.08, 0, TAU); c.fill();
  c.fillStyle = '#a82029'; c.beginPath(); c.ellipse(x - 18, y - 12, 9, 8, 0, 0, TAU); c.fill();
  c.fillStyle = '#f0dccd'; c.beginPath(); c.ellipse(x - 20, y - 10, 5, 5.5, 0, 0, TAU); c.fill();
  c.strokeStyle = '#6a3030'; c.lineWidth = 1; c.beginPath(); c.moveTo(-23 + x, y - 10); c.lineTo(-19 + x, y - 10); c.stroke();
  c.fillStyle = '#121218'; c.beginPath(); c.ellipse(x - 23, y - 14, 4, 4, 0, 0, TAU); c.fill();
  c.fillStyle = '#efe1d4'; c.fillRect(x + 20, y - 7, 9, 4);
  c.fillStyle = '#fff'; c.globalAlpha = .4 + .3 * Math.sin(R.t * 2); c.font = '600 13px "Noto Serif TC",serif'; c.textAlign = 'center'; c.fillText('晴', x, y - 40); c.globalAlpha = 1;
}
function drawFxSprite(c, f) {
  const k = f.t / f.life;
  if (f.k === 'ghost') { c.save(); c.globalAlpha = .3 * (1 - k); c.fillStyle = '#53f0d6'; c.beginPath(); c.ellipse(f.x, f.y - 32, 11, 30, 0, 0, TAU); c.fill(); c.restore(); }
  else if (f.k === 'smear') { c.save(); c.globalAlpha = .35 * (1 - k); c.fillStyle = f.type === 'boss' ? '#ffffff' : W.ch.th.foe.body; c.translate(f.x, f.y - 22); c.rotate(f.face || 0); c.beginPath(); c.ellipse(0, 0, 26, 12, 0, 0, TAU); c.fill(); c.restore(); }
  else if (f.k === 'dissolve') {
    c.save(); c.globalAlpha = 1 - k;
    const h = f.type === 'boss' ? 150 : f.type === 'warden' ? 100 : f.type === 'ripper' || f.type === 'beat' ? 34 : 54;
    c.fillStyle = f.type === 'ferry' ? '#c8b88a' : W.ch.th.foe.body;
    c.beginPath(); c.ellipse(f.x, f.y - h / 2 - k * 30, (f.type === 'boss' ? 40 : 13) * (1 - k * .6), h / 2 * (1 - k * .5), 0, 0, TAU); c.fill();
    c.fillStyle = W.ch.th.foe.mask; c.globalAlpha = (1 - k) * .8; c.beginPath(); c.ellipse(f.x + 2, f.y - h - k * 50, 6 * (1 - k), 7 * (1 - k), 0, 0, TAU); c.fill();
    c.restore();
  }
}

/* ---------- 給介面用：夢主小立繪 ---------- */
function drawDreamerCard(cv, chi) {
  const g = cv.getContext('2d'), w = cv.width, h = cv.height, th = CH[chi].th;
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, shade(th.amb, .15)); bg.addColorStop(1, th.void[0]); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'lighter'; g.drawImage(glow(th.lamp), w * .1, -h * .2, w * .8, h * .8); g.globalCompositeOperation = 'source-over';
  g.save(); g.translate(w / 2, h * .98); g.scale(w / 70, w / 70);
  g.fillStyle = '#0b0a10';
  // 剪影：每位夢主有自己的輪廓
  const sil = [
    () => { g.beginPath(); g.moveTo(-16, 0); g.lineTo(-14, -50); g.quadraticCurveTo(0, -58, 14, -50); g.lineTo(16, 0); g.fill(); ell(g, 0, -62, 9, 10); g.fill(); g.fillRect(-12, -74, 24, 5); g.fillRect(-7, -80, 14, 7); g.fillStyle = '#ffe39a'; g.fillRect(14, -40, 6, 8); },
    () => { g.beginPath(); g.moveTo(-18, 0); g.quadraticCurveTo(-16, -40, -10, -52); g.lineTo(10, -52); g.quadraticCurveTo(16, -40, 18, 0); g.fill(); ell(g, 0, -62, 9, 10); g.fill(); ell(g, 2, -72, 8, 6); g.fill(); g.strokeStyle = '#0b0a10'; g.lineWidth = 2; g.beginPath(); g.moveTo(10, -46); g.lineTo(26, -60); g.stroke(); },
    () => { g.beginPath(); g.moveTo(-16, 0); g.lineTo(-13, -52); g.lineTo(13, -52); g.lineTo(16, 0); g.fill(); ell(g, 0, -62, 9, 10); g.fill(); g.fillStyle = '#e8f0f0'; g.fillRect(-6, -74, 12, 4); g.fillStyle = '#e04050'; g.fillRect(-1, -74, 2, 4); },
    () => { g.beginPath(); g.moveTo(-18, 0); g.lineTo(-16, -52); g.lineTo(16, -52); g.lineTo(18, 0); g.fill(); ell(g, 0, -62, 9, 10); g.fill(); g.fillRect(-8, -86, 16, 16); g.fillRect(-13, -72, 26, 3); g.fillStyle = '#ffe3a8'; ell(g, 4, -63, 2, 2); g.fill(); },
    () => { g.fillStyle = '#c62a34'; g.beginPath(); g.moveTo(-16, 0); g.quadraticCurveTo(-18, -40, -9, -54); g.lineTo(9, -54); g.quadraticCurveTo(18, -40, 16, 0); g.fill(); g.fillStyle = '#a82029'; ell(g, 0, -62, 11, 11); g.fill(); g.fillStyle = '#f0dccd'; ell(g, 1, -60, 6, 7); g.fill(); },
  ];
  sil[chi]();
  g.restore();
  g.strokeStyle = rgba('#d8b46a', .35); g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
}
