'use strict';
/* ====== 標題、夜當、劇情畫面 ====== */
const BG = { orbs: [], dust: [], rain: [] };
function initBG() {
  for (let i = 0; i < 46; i++) BG.orbs.push({ x: Math.random(), y: Math.random(), s: Math.random() * .8 + .4, r: (Math.random() * 5) | 0, p: Math.random() * 9 });
  for (let i = 0; i < 60; i++) BG.dust.push({ x: Math.random(), y: Math.random(), v: Math.random() * .02 + .005, p: Math.random() * 9 });
  for (let i = 0; i < 140; i++) BG.rain.push({ x: Math.random(), y: Math.random(), v: Math.random() * .6 + .9, l: Math.random() * .03 + .02 });
}
function silhouetteMan(g, x, y, s, o = {}) {
  g.save(); g.translate(x, y); g.scale(s * (o.flip ? -1 : 1), s);
  g.fillStyle = o.c || '#05050a';
  g.beginPath(); g.moveTo(-9, 0); g.lineTo(-7, -26); g.lineTo(-12, -26); g.quadraticCurveTo(-13, -52, -8, -60); g.lineTo(8, -60); g.quadraticCurveTo(14, -52, 13, -26); g.lineTo(8, -26); g.lineTo(10, 0); g.lineTo(3, 0); g.lineTo(1, -22); g.lineTo(-2, -22); g.lineTo(-3, 0); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(1, -68, 7, 8, 0, 0, TAU); g.fill();
  if (o.lining) { g.fillStyle = o.lining; g.beginPath(); g.moveTo(8, -56); g.quadraticCurveTo(12, -40, 12, -27); g.lineTo(9, -27); g.quadraticCurveTo(9, -40, 5, -52); g.fill(); }
  g.restore();
}
function silhouetteGirl(g, x, y, s, pose, o = {}) {
  g.save(); g.translate(x, y); g.scale(s * (o.flip ? -1 : 1), s);
  const red = o.red || '#c62a34', dark = '#9a1e28', skin = '#efe1d4', hair = '#121218';
  if (pose === 'stand') {
    g.fillStyle = skin; g.fillRect(-5, -8, 3, 8); g.fillStyle = red; g.fillRect(2, -8, 3, 8);
    g.fillStyle = red; g.beginPath(); g.moveTo(-8, -44); g.quadraticCurveTo(-13, -24, -14, -6); g.quadraticCurveTo(0, -3, 14, -6); g.quadraticCurveTo(13, -24, 8, -44); g.closePath(); g.fill();
    g.fillStyle = dark; g.beginPath(); g.moveTo(-1, -42); g.lineTo(1, -42); g.lineTo(2, -7); g.lineTo(-1, -7); g.fill();
    if (o.reach) { g.strokeStyle = red; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(7, -38); g.lineTo(24, -44); g.stroke(); g.fillStyle = skin; g.beginPath(); g.arc(25, -44, 2.4, 0, TAU); g.fill(); }
    g.fillStyle = red; g.beginPath(); g.ellipse(0, -52, 10, 11, 0, 0, TAU); g.fill();
    g.fillStyle = skin; g.beginPath(); g.ellipse(1.5, -50, 6, 7, 0, 0, TAU); g.fill();
    g.fillStyle = hair; g.beginPath(); g.ellipse(1, -55, 6.5, 3.4, 0, Math.PI, 0); g.fill();
  } else if (pose === 'sit') {
    g.fillStyle = red; g.beginPath(); g.moveTo(-14, 0); g.quadraticCurveTo(-15, -22, -9, -34); g.lineTo(9, -34); g.quadraticCurveTo(15, -22, 14, 0); g.closePath(); g.fill();
    g.fillStyle = dark; g.fillRect(-1, -32, 2, 30);
    g.fillStyle = hair; g.beginPath(); g.ellipse(0, -44, 10, 11, 0, 0, TAU); g.fill(); g.fillRect(-10, -44, 4, 14); g.fillRect(6, -44, 4, 14);
    g.fillStyle = skin; g.beginPath(); g.ellipse(1, -42, 6.5, 7.5, 0, 0, TAU); g.fill();
    if (o.smile) { g.strokeStyle = '#7a3a3a'; g.lineWidth = .9; g.beginPath(); g.arc(1, -40, 2.5, .3, Math.PI - .3); g.stroke(); }
  } else if (pose === 'lie') {
    g.fillStyle = red; g.beginPath(); g.ellipse(6, -6, 30, 9, 0, 0, TAU); g.fill();
    g.fillStyle = dark; g.fillRect(-10, -7, 40, 2);
    g.fillStyle = hair; g.beginPath(); g.ellipse(-27, -8, 9, 8, 0, 0, TAU); g.fill();
    g.fillStyle = skin; g.beginPath(); g.ellipse(-24, -7, 6, 6.5, 0, 0, TAU); g.fill();
    g.strokeStyle = '#5a2a2a'; g.lineWidth = .9; g.beginPath(); g.moveTo(-27, -8); g.lineTo(-23, -8); g.stroke();
    if (o.burn) { g.fillStyle = '#7a1a1a'; g.beginPath(); g.ellipse(-28, -10, 1.6, 1.2, 0, 0, TAU); g.fill(); }
  } else if (pose === 'back') {
    g.fillStyle = '#2a1a1e'; g.beginPath(); g.moveTo(-14, 0); g.quadraticCurveTo(-15, -24, -9, -36); g.lineTo(9, -36); g.quadraticCurveTo(15, -24, 14, 0); g.closePath(); g.fill();
    g.fillStyle = hair; g.beginPath(); g.ellipse(0, -46, 10, 11, 0, 0, TAU); g.fill(); g.fillRect(-9, -46, 18, 16);
    g.fillStyle = red; g.beginPath(); g.moveTo(-5, -54); g.lineTo(5, -54); g.lineTo(0, -50); g.fill(); g.fillRect(-2, -55, 4, 4);
  }
  g.restore();
}
function drawTitleBG(c, t) {
  const w = c.canvas.width, h = c.canvas.height, d = R.dpr;
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#05040c'); g.addColorStop(.55, '#140e2c'); g.addColorStop(1, '#2a1838'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  // 星
  for (let i = 0; i < 90; i++) { const x = (hash2(i, 1) * w), y = hash2(i, 2) * h * .7; c.fillStyle = rgba('#dfe4ff', .2 + .5 * Math.sin(t * (.5 + hash2(i, 3)) + i) ** 2); c.fillRect(x, y, 1.4 * d, 1.4 * d); }
  // 月
  const mx = w * .66, my = h * (h > w ? .44 : .36), mr = Math.min(w, h) * .19;
  c.globalCompositeOperation = 'lighter'; c.drawImage(glow('#9f8cff'), mx - mr * 3, my - mr * 3, mr * 6, mr * 6); c.globalCompositeOperation = 'source-over';
  const mg = c.createRadialGradient(mx - mr * .3, my - mr * .3, mr * .1, mx, my, mr); mg.addColorStop(0, '#fbf8ff'); mg.addColorStop(1, '#bcb4e6'); c.fillStyle = mg; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
  c.fillStyle = 'rgba(120,110,170,.18)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(mx + Math.cos(i * 2.1) * mr * .5, my + Math.sin(i * 1.7) * mr * .45, mr * (.06 + hash2(i, 9) * .1), 0, TAU); c.fill(); }
  // 雲
  c.fillStyle = 'rgba(40,28,70,.55)'; for (let i = 0; i < 4; i++) { const cx = ((t * 8 * d + i * w * .37) % (w * 1.4)) - w * .2, cy = h * (.24 + i * .08); c.beginPath(); c.ellipse(cx, cy, w * .22, h * .018, 0, 0, TAU); c.fill(); }
  // 漂浮的樓梯
  c.strokeStyle = 'rgba(200,190,255,.28)'; c.lineWidth = 2 * d;
  for (let i = 0; i < 22; i++) { const k = i / 22, x = lerp(w * .18, mx - mr * .2, k), y = lerp(h * .86, my + mr * .9, k), sw = (22 - i * .6) * d; c.fillStyle = rgba('#2a2040', 1 - k * .6); c.fillRect(x - sw / 2, y, sw, 4 * d); c.fillStyle = rgba('#d8ccff', .25 * (1 - k)); c.fillRect(x - sw / 2, y, sw, 1 * d); }
  silhouetteMan(c, lerp(w * .18, mx - mr * .2, .32), lerp(h * .86, my + mr * .9, .32), 1.05 * d, { lining: '#53f0d6' });
  const lx = lerp(w * .18, mx - mr * .2, .32) - 8 * d, ly = lerp(h * .86, my + mr * .9, .32) - 26 * d;
  c.globalCompositeOperation = 'lighter'; c.drawImage(glow('#ffcf7a'), lx - 30 * d, ly - 30 * d, 60 * d, 60 * d); c.globalCompositeOperation = 'source-over';
  // 城市
  c.fillStyle = '#07060e';
  let x = 0; let i = 0; while (x < w) { const bw = (30 + hash2(i, 5) * 70) * d, bh = (60 + hash2(i, 6) * 200) * d; c.fillRect(x, h - bh, bw, bh); for (let k = 0; k < 8; k++) if (hash2(i, k + 20) < .3) { c.fillStyle = rgba(hash2(i, k) < .5 ? '#ffcf7a' : '#9fd4ff', .5 + .3 * Math.sin(t + k)); c.fillRect(x + (4 + (k % 3) * 9) * d, h - bh + (10 + Math.floor(k / 3) * 16) * d, 4 * d, 6 * d); c.fillStyle = '#07060e'; } x += bw + 2 * d; i++; }
  // 往上飄的記憶
  c.globalCompositeOperation = 'lighter';
  for (const o of BG.orbs) { o.y -= .00045 * o.s; if (o.y < -.05) { o.y = 1.05; o.x = Math.random(); } const ox = (o.x + Math.sin(t * .4 + o.p) * .01) * w, oy = o.y * h, r = (4 + o.s * 5) * d; c.drawImage(glow(RAR[o.r].c), ox - r * 3, oy - r * 3, r * 6, r * 6); c.fillStyle = rgba('#ffffff', .85); c.beginPath(); c.arc(ox, oy, r * .35, 0, TAU); c.fill(); }
  c.globalCompositeOperation = 'source-over';
  const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
}
function drawHubBG(c, t) {
  const w = c.canvas.width, h = c.canvas.height, d = R.dpr;
  const port = h > w;
  c.fillStyle = '#0b0710'; c.fillRect(0, 0, w, h);
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a1018'); g.addColorStop(.6, '#120a12'); g.addColorStop(1, '#070408'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  // 後牆的木頭格子
  c.strokeStyle = 'rgba(120,80,50,.18)'; c.lineWidth = 1 * d; for (let x = 0; x < w; x += 46 * d) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h * .72); c.stroke(); }
  // 窗戶與招牌
  const wx = port ? w * .62 : w * .74, wy = h * .1, ww = port ? w * .3 : w * .18, wh = h * .22;
  const wg = c.createLinearGradient(0, wy, 0, wy + wh); wg.addColorStop(0, '#0a1430'); wg.addColorStop(1, '#2a1a40'); c.fillStyle = wg; c.fillRect(wx, wy, ww, wh);
  c.globalCompositeOperation = 'lighter'; c.drawImage(glow('#ff3a4a'), wx + ww * .2, wy - wh * .1, ww * .9, ww * .9); c.globalCompositeOperation = 'source-over';
  c.fillStyle = rgba('#ff5a6a', .75 + .2 * Math.sin(t * 3) * (Math.sin(t * 17) > .9 ? 0 : 1)); c.font = `700 ${ww * .35}px "Noto Serif TC",serif`; c.textAlign = 'center'; c.save(); c.translate(wx + ww * .62, wy + wh * .62); c.scale(-1, 1); c.fillText('當', 0, 0); c.restore();
  c.strokeStyle = '#2a1a14'; c.lineWidth = 4 * d; c.strokeRect(wx, wy, ww, wh); c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.stroke();
  // 架子上的記憶瓶
  const sx0 = port ? w * .04 : w * .12, sw = port ? w * .55 : w * .52;
  for (let r = 0; r < 4; r++) {
    const sy = h * (.12 + r * .12);
    c.fillStyle = '#2a1810'; c.fillRect(sx0, sy + 26 * d, sw, 5 * d);
    for (let k = 0; k < 9; k++) {
      const jx = sx0 + (k + .5) * sw / 9, jy = sy + 6 * d, rr = hash2(r, k), col = RAR[Math.min(4, Math.floor(rr * rr * 5.5))].c;
      const tw = .5 + .5 * Math.sin(t * (1 + rr) + k * 2 + r);
      c.fillStyle = 'rgba(200,220,255,.12)'; c.fillRect(jx - 8 * d, jy - 4 * d, 16 * d, 24 * d);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = .45 + tw * .4; c.drawImage(glow(col), jx - 18 * d, jy - 8 * d, 36 * d, 36 * d); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.fillStyle = rgba('#ffffff', .7); c.beginPath(); c.arc(jx, jy + 10 * d, 3 * d, 0, TAU); c.fill();
      c.fillStyle = '#5a3a20'; c.fillRect(jx - 6 * d, jy - 7 * d, 12 * d, 3 * d);
    }
  }
  // 吊燈
  const lx = w * .5, ly = h * .05;
  c.strokeStyle = '#2a1a10'; c.lineWidth = 2 * d; c.beginPath(); c.moveTo(lx, 0); c.lineTo(lx, ly); c.stroke();
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = .55; c.drawImage(glow('#ffb860'), lx - w * .55, ly - h * .1, w * 1.1, h * .9); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#3a2410'; c.beginPath(); c.moveTo(lx - 18 * d, ly + 14 * d); c.lineTo(lx + 18 * d, ly + 14 * d); c.lineTo(lx + 8 * d, ly); c.lineTo(lx - 8 * d, ly); c.fill(); c.fillStyle = '#ffe2a0'; c.beginPath(); c.arc(lx, ly + 16 * d, 5 * d, 0, TAU); c.fill();
  // 櫃台
  const cy = h * (port ? .6 : .62);
  c.fillStyle = '#1e120a'; c.fillRect(0, cy, w, h - cy); c.fillStyle = '#3a2414'; c.fillRect(0, cy, w, 10 * d); c.fillStyle = 'rgba(255,200,120,.25)'; c.fillRect(0, cy, w, 2 * d);
  // 沈姨
  const shx = port ? w * .28 : w * .3;
  c.fillStyle = '#07040a'; c.beginPath(); c.moveTo(shx - 40 * d, cy); c.quadraticCurveTo(shx - 44 * d, cy - 70 * d, shx - 18 * d, cy - 92 * d); c.lineTo(shx + 18 * d, cy - 92 * d); c.quadraticCurveTo(shx + 44 * d, cy - 70 * d, shx + 40 * d, cy); c.fill();
  c.beginPath(); c.ellipse(shx, cy - 110 * d, 17 * d, 20 * d, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(shx - 4 * d, cy - 130 * d, 11 * d, 9 * d, 0, 0, TAU); c.fill();
  c.strokeStyle = '#07040a'; c.lineWidth = 7 * d; c.lineCap = 'round'; c.beginPath(); c.moveTo(shx + 26 * d, cy - 70 * d); c.lineTo(shx + 30 * d, cy - 100 * d); c.stroke();
  const tipx = shx + 34 * d, tipy = cy - 106 * d; c.fillStyle = '#ff8a3a'; c.beginPath(); c.arc(tipx, tipy, 2.2 * d, 0, TAU); c.fill();
  for (let i = 0; i < 6; i++) { const k = ((t * .25 + i / 6) % 1); c.fillStyle = rgba('#b8b0c8', .18 * (1 - k)); c.beginPath(); c.arc(tipx + Math.sin(k * 6 + i) * 10 * d, tipy - k * 120 * d, (3 + k * 14) * d, 0, TAU); c.fill(); }
  // 小滿與螢幕
  const mx = port ? w * .8 : w * .78;
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = .6 + .1 * Math.sin(t * 7); c.drawImage(glow('#53f0d6'), mx - 110 * d, cy - 160 * d, 220 * d, 200 * d); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#0d2a2a'; c.fillRect(mx - 46 * d, cy - 80 * d, 50 * d, 34 * d); c.fillRect(mx + 8 * d, cy - 76 * d, 36 * d, 28 * d);
  c.fillStyle = rgba('#53f0d6', .55); for (let k = 0; k < 6; k++) c.fillRect(mx - 42 * d, cy - 75 * d + k * 5 * d, (10 + hash2(k, Math.floor(t * 3)) * 34) * d, 1.5 * d);
  c.fillStyle = '#060408'; c.beginPath(); c.ellipse(mx - 6 * d, cy - 30 * d, 26 * d, 30 * d, 0, Math.PI, 0); c.fill(); c.beginPath(); c.ellipse(mx - 6 * d, cy - 66 * d, 13 * d, 15 * d, 0, 0, TAU); c.fill();
  c.strokeStyle = '#060408'; c.lineWidth = 4 * d; c.beginPath(); c.arc(mx - 6 * d, cy - 68 * d, 15 * d, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); c.fillStyle = '#53f0d6'; c.fillRect(mx - 22 * d, cy - 70 * d, 4 * d, 8 * d);
  // 櫃台正面：木板、當票、牌匾
  const ph = h - cy;
  for (let i = 0; i < 6; i++) { const px = (i + .5) * w / 6, pw = w / 6 - 14 * d; c.strokeStyle = 'rgba(216,180,106,.16)'; c.lineWidth = 1.2 * d; c.strokeRect(px - pw / 2, cy + 22 * d, pw, ph * .62); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(px - pw / 2 + 4 * d, cy + 26 * d, pw - 8 * d, ph * .62 - 8 * d); }
  c.strokeStyle = 'rgba(200,180,140,.35)'; c.lineWidth = 1 * d; c.beginPath(); c.moveTo(0, cy + 30 * d); for (let x2 = 0; x2 <= w; x2 += w / 12) c.lineTo(x2, cy + 30 * d + Math.sin(x2 / w * Math.PI) * 26 * d); c.stroke();
  for (let i = 0; i < 9; i++) { const tx = (i + .7) * w / 10, ty = cy + 30 * d + Math.sin(tx / w * Math.PI) * 26 * d, sw2 = Math.sin(t * 1.2 + i) * .06; c.save(); c.translate(tx, ty); c.rotate(sw2); c.fillStyle = i % 3 === 1 ? '#e8d6b0' : '#d8c8a0'; c.fillRect(-9 * d, 0, 18 * d, 34 * d); c.fillStyle = 'rgba(120,30,30,.75)'; c.beginPath(); c.arc(0, 22 * d, 5 * d, 0, TAU); c.fill(); c.fillStyle = 'rgba(60,40,20,.55)'; for (let k = 0; k < 3; k++) c.fillRect(-6 * d, (5 + k * 4) * d, 12 * d, 1.2 * d); c.restore(); }
  const bx = w / 2, by2 = cy + ph * .42;
  c.fillStyle = '#2a180c'; c.fillRect(bx - 46 * d, by2 - 30 * d, 92 * d, 60 * d); c.strokeStyle = '#c79a4a'; c.lineWidth = 2 * d; c.strokeRect(bx - 42 * d, by2 - 26 * d, 84 * d, 52 * d);
  c.fillStyle = 'rgba(243,220,160,.85)'; c.font = `700 ${38 * d}px "Noto Serif TC","Songti TC",serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('當', bx, by2 + 2 * d); c.textBaseline = 'alphabetic';
  // 櫃台上的東西
  c.fillStyle = '#e8dcc0'; c.save(); c.translate(w * .4, cy - 2 * d); c.fillRect(-30 * d, -6 * d, 28 * d, 6 * d); c.fillRect(2 * d, -6 * d, 28 * d, 6 * d); c.fillStyle = 'rgba(60,40,20,.4)'; for (let k = 0; k < 3; k++) { c.fillRect(-26 * d, (-5 + k * 1.6) * d, 20 * d, .6 * d); c.fillRect(6 * d, (-5 + k * 1.6) * d, 20 * d, .6 * d); } c.restore();
  c.fillStyle = '#c79a4a'; c.beginPath(); c.ellipse(w * .5, cy - 4 * d, 12 * d, 5 * d, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(w * .5, cy - 10 * d, 7 * d, Math.PI, 0); c.fill();
  c.fillStyle = '#e8dcc0'; c.save(); c.translate(w * .62, cy - 3 * d); c.rotate(-.1); c.fillRect(-14 * d, -5 * d, 28 * d, 8 * d); c.restore();
  // 灰塵
  c.globalCompositeOperation = 'lighter';
  for (const o of BG.dust) { o.y -= o.v * .02; if (o.y < 0) o.y = 1; const x = (o.x + Math.sin(t * .3 + o.p) * .02) * w, y = o.y * h; c.fillStyle = rgba('#ffe2b0', .25 + .2 * Math.sin(t + o.p)); c.fillRect(x, y, 1.6 * d, 1.6 * d); }
  c.globalCompositeOperation = 'source-over';
  const v = c.createRadialGradient(w / 2, h * .45, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
}

/* 劇情畫面 */
function drawScene(cv, key, t, li) {
  const c = cv.getContext('2d'), w = cv.width, h = cv.height, d = R.dpr;
  c.setTransform(1, 0, 0, 1, 0, 0);
  const rain = (a = .35) => { c.strokeStyle = rgba('#a8b8d8', a); c.lineWidth = 1 * d; for (const r of BG.rain) { r.y += r.v * .012; if (r.y > 1.05) { r.y = -.05; r.x = Math.random(); } c.beginPath(); c.moveTo(r.x * w, r.y * h); c.lineTo(r.x * w - 4 * d, (r.y + r.l) * h); c.stroke(); } };
  const vign = (a = .7) => { const v = c.createRadialGradient(w / 2, h * .45, Math.min(w, h) * .25, w / 2, h / 2, Math.max(w, h) * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${a})`); c.fillStyle = v; c.fillRect(0, 0, w, h); };
  const S0 = Math.min(w, h) / 360;
  switch (key) {
    case 'prologue': {
      c.fillStyle = '#05060c'; c.fillRect(0, 0, w, h);
      const wx = w * .2, wy = h * .12, ww = w * .6, wh = h * .34;
      const g = c.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, '#0c1630'); g.addColorStop(1, '#1a2240'); c.fillStyle = g; c.fillRect(wx, wy, ww, wh);
      c.save(); c.beginPath(); c.rect(wx, wy, ww, wh); c.clip(); rain(.5); c.restore();
      c.strokeStyle = '#141820'; c.lineWidth = 6 * d; c.strokeRect(wx, wy, ww, wh); c.beginPath(); c.moveTo(w / 2, wy); c.lineTo(w / 2, wy + wh); c.stroke();
      const by = h * .68;
      c.fillStyle = '#d8dde8'; c.fillRect(w * .18, by - 18 * S0, w * .64, 22 * S0); c.fillStyle = '#9aa2b4'; c.fillRect(w * .18, by + 4 * S0, w * .64, 10 * S0);
      silhouetteGirl(c, w * .48, by - 14 * S0, 2.6 * S0, 'lie');
      // 心電圖
      const mx = w * .78, my = h * .5; c.fillStyle = '#0a1210'; c.fillRect(mx - 40 * S0, my - 26 * S0, 80 * S0, 50 * S0); c.strokeStyle = '#4af0a0'; c.lineWidth = 2 * d; c.beginPath();
      for (let i = 0; i <= 60; i++) { const xx = mx - 36 * S0 + i * 72 * S0 / 60, ph = (i / 60 + t * .5) % 1, yy = my + (Math.abs(ph - .5) < .03 ? -16 * S0 * Math.sin((ph - .47) / .06 * Math.PI) : 0); i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
      vign(.8); break;
    }
    case 'cctv': {
      c.fillStyle = '#060807'; c.fillRect(0, 0, w, h);
      const sx = w * .08, sy = h * .16, sw = w * .84, sh = h * .46;
      c.fillStyle = '#1a2a24'; c.fillRect(sx, sy, sw, sh);
      // 走廊透視
      c.strokeStyle = 'rgba(160,220,190,.35)'; c.lineWidth = 1.5 * d; const vx = sx + sw * .5, vy = sy + sh * .42;
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => { c.beginPath(); c.moveTo(sx + a * sw, sy + b * sh); c.lineTo(vx + (a - .5) * sw * .2, vy + (b - .5) * sh * .25); c.stroke(); });
      c.strokeRect(vx - sw * .1, vy - sh * .125, sw * .2, sh * .25);
      c.fillStyle = 'rgba(180,230,210,.25)'; c.fillRect(vx - sw * .06, vy - sh * .1, sw * .12, sh * .22);
      const k = clamp((li - 1) / 3, 0, 1), fx2 = lerp(vx, sx + sw * .32, k), fy = lerp(vy + sh * .1, sy + sh * .95, k), fs = lerp(.35, 1.2, k) * S0;
      if (li >= 2) { silhouetteMan(c, fx2, fy, fs, { c: '#0a120e', lining: li >= 4 ? rgba('#53f0d6', .9) : null }); c.fillStyle = '#c62a34'; c.beginPath(); c.ellipse(fx2 + 4 * fs, fy - 46 * fs, 12 * fs, 7 * fs, -.3, 0, TAU); c.fill(); }
      for (let i = 0; i < 160; i++) { c.fillStyle = rgba('#d8ffe8', Math.random() * .12); c.fillRect(sx + Math.random() * sw, sy + Math.random() * sh, 2 * d, 1 * d); }
      for (let y = sy; y < sy + sh; y += 3 * d) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(sx, y, sw, 1 * d); }
      c.fillStyle = 'rgba(200,255,220,.85)'; c.font = `${12 * S0}px monospace`; c.textAlign = 'left'; c.fillText('CH07  13F', sx + 10 * S0, sy + 18 * S0); c.textAlign = 'right'; c.fillText('03:12:' + String(47 + Math.floor(t) % 13).padStart(2, '0'), sx + sw - 10 * S0, sy + 18 * S0);
      c.fillStyle = Math.floor(t * 2) % 2 ? '#ff3030' : '#400'; c.beginPath(); c.arc(sx + sw - 14 * S0, sy + sh - 14 * S0, 4 * S0, 0, TAU); c.fill();
      c.strokeStyle = '#2a2e2a'; c.lineWidth = 10 * d; c.strokeRect(sx, sy, sw, sh);
      vign(.75); break;
    }
    case 'piano': {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a1a12'); g.addColorStop(1, '#0e0806'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const wx = w * .55, wy = h * .1, ww = w * .32, wh = h * .3;
      const sg = c.createLinearGradient(0, wy, 0, wy + wh); sg.addColorStop(0, '#f4c88a'); sg.addColorStop(1, '#c8784a'); c.fillStyle = sg; c.fillRect(wx, wy, ww, wh);
      c.fillStyle = '#3a2418'; c.fillRect(wx + ww * .45, wy + wh * .35, 6 * S0, wh * .65); c.fillStyle = '#5a3a20'; c.beginPath(); c.arc(wx + ww * .48, wy + wh * .32, ww * .3, 0, TAU); c.fill();
      for (let i = 0; i < 6; i++) { const k = ((t * .15 + i / 6) % 1); c.fillStyle = rgba('#e8a050', .8 * (1 - k)); c.save(); c.translate(wx + ww * (.2 + hash2(i, 3) * .6), wy + wh * .2 + k * wh * .9); c.rotate(t + i); c.fillRect(-3 * S0, -2 * S0, 6 * S0, 4 * S0); c.restore(); }
      c.strokeStyle = '#2a1a10'; c.lineWidth = 5 * d; c.strokeRect(wx, wy, ww, wh);
      c.globalCompositeOperation = 'lighter'; c.drawImage(glow('#ffb870'), wx - ww, wy - wh * .2, ww * 3, wh * 2.4); c.globalCompositeOperation = 'source-over';
      const py = h * .72;
      c.fillStyle = '#0c0705'; c.fillRect(w * .12, py - 110 * S0, w * .5, 110 * S0); c.fillStyle = '#efe6d2'; c.fillRect(w * .12, py - 46 * S0, w * .5, 12 * S0);
      c.fillStyle = '#0c0705'; for (let i = 0; i < 20; i++) if (i % 7 !== 2 && i % 7 !== 6) c.fillRect(w * .12 + i * w * .5 / 20 + 4 * S0, py - 46 * S0, 5 * S0, 7 * S0);
      c.fillStyle = '#0c0705'; c.fillRect(w * .3, py - 8 * S0, w * .12, 8 * S0);
      silhouetteGirl(c, w * .36, py - 8 * S0, 1.9 * S0, 'back');
      silhouetteMan(c, w * .74, py + 10 * S0, 1.5 * S0, { c: '#07040a', flip: true });
      vign(.75); break;
    }
    case 'bed': {
      c.fillStyle = '#0a1214'; c.fillRect(0, 0, w, h);
      const pulse = .5 + .5 * Math.sin(t * 4);
      c.fillStyle = rgba('#ff2030', .12 * pulse); c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'lighter'; c.drawImage(glow('#effdff'), w * .1, -h * .2, w * .8, h * .7); c.globalCompositeOperation = 'source-over';
      const by = h * .58;
      c.fillStyle = '#d8e2e2'; c.fillRect(w * .1, by - 20 * S0, w * .8, 26 * S0);
      silhouetteGirl(c, w * .5, by - 14 * S0, 3 * S0, 'lie', { burn: li >= 4 });
      // 欄杆上的手
      c.fillStyle = '#8a9ea0'; c.fillRect(w * .1, by + 12 * S0, w * .8, 5 * S0);
      if (li >= 5) { for (const hx of [w * .38, w * .5]) { c.fillStyle = '#d8b8a0'; c.beginPath(); c.ellipse(hx, by + 14 * S0, 16 * S0, 9 * S0, 0, 0, TAU); c.fill(); c.fillStyle = '#5a1a1a'; c.beginPath(); c.ellipse(hx + 2 * S0, by + 12 * S0, 4 * S0, 2.6 * S0, .3, 0, TAU); c.fill(); } c.fillStyle = '#1c1f33'; c.fillRect(w * .3, by + 18 * S0, w * .28, 60 * S0); c.fillStyle = '#45f2d6'; c.fillRect(w * .3, by + 18 * S0, 4 * S0, 60 * S0); }
      vign(.75); break;
    }
    case 'deal': {
      c.fillStyle = '#0c0708'; c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'lighter'; c.drawImage(glow('#ffb860'), w * .1, -h * .1, w * .8, h * .8); c.globalCompositeOperation = 'source-over';
      const cy = h * .6;
      c.fillStyle = '#2a180c'; c.fillRect(0, cy, w, h - cy); c.fillStyle = '#4a2c14'; c.fillRect(0, cy, w, 8 * S0);
      const n = li >= 5 ? 3 : 2;
      for (let i = 0; i < n; i++) { const ox = w * (.4 + i * .1), oy = cy - 14 * S0; c.globalCompositeOperation = 'lighter'; c.drawImage(glow('#ffc94a'), ox - 40 * S0, oy - 40 * S0, 80 * S0, 80 * S0); c.globalCompositeOperation = 'source-over'; const g = c.createRadialGradient(ox - 3 * S0, oy - 3 * S0, 1, ox, oy, 11 * S0); g.addColorStop(0, '#fff8d8'); g.addColorStop(1, '#d89a20'); c.fillStyle = g; c.beginPath(); c.arc(ox, oy, 11 * S0, 0, TAU); c.fill(); }
      c.fillStyle = '#07040a'; const sx = w * .2; c.beginPath(); c.ellipse(sx, cy - 10 * S0, 34 * S0, 70 * S0, 0, Math.PI, 0); c.fill(); c.beginPath(); c.ellipse(sx, cy - 92 * S0, 15 * S0, 18 * S0, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(sx - 3 * S0, cy - 112 * S0, 10 * S0, 8 * S0, 0, 0, TAU); c.fill();
      silhouetteMan(c, w * .82, cy + 30 * S0, 2 * S0, { c: '#07040a', flip: true }); c.fillStyle = '#07040a'; c.fillRect(w * .82 - 16 * S0, cy - 150 * S0, 30 * S0, 22 * S0);
      vign(.7); break;
    }
    case 'night': {
      c.fillStyle = '#050508'; c.fillRect(0, 0, w, h);
      if (li < 7) {
        const vy = h * .45;
        const fg = c.createLinearGradient(0, vy, 0, h); fg.addColorStop(0, '#0a0b12'); fg.addColorStop(1, '#22232e'); c.fillStyle = fg; c.beginPath(); c.moveTo(w / 2 - w * .06, vy); c.lineTo(w / 2 + w * .06, vy); c.lineTo(w * 1.1, h); c.lineTo(-w * .1, h); c.fill();
        c.strokeStyle = 'rgba(120,130,160,.25)'; c.lineWidth = 1.5 * d; for (const a of [-1, 1]) { c.beginPath(); c.moveTo(w / 2 + a * w * .6, 0); c.lineTo(w / 2 + a * w * .06, vy); c.lineTo(w / 2 + a * w * .6, h); c.stroke(); }
        c.globalCompositeOperation = 'lighter'; c.drawImage(glow('#ffe8c0'), w / 2 - 80 * S0, vy - 80 * S0, 160 * S0, 160 * S0); c.globalCompositeOperation = 'source-over';
        const k = clamp((li - 2) / 4, 0, 1);
        silhouetteMan(c, w / 2 + w * .1 * (1 - k), lerp(h * .9, vy + 30 * S0, k), lerp(2.2, .8, k) * S0, { lining: '#53f0d6' });
        const ox = w / 2 + w * .1 * (1 - k) - 20 * lerp(2.2, .8, k) * S0, oy = lerp(h * .9, vy + 30 * S0, k) - 40 * lerp(2.2, .8, k) * S0;
        c.globalCompositeOperation = 'lighter'; c.drawImage(glow('#ffc94a'), ox - 40 * S0, oy - 40 * S0, 80 * S0, 80 * S0); c.globalCompositeOperation = 'source-over';
        if (li >= 5) { c.globalAlpha = li >= 6 ? .35 + .2 * Math.sin(t * 3) : .9; silhouetteGirl(c, w * .2, h * .9, 2.2 * S0, 'stand', { reach: true }); c.globalAlpha = 1; }
        rain(.25);
      } else {
        c.fillStyle = '#0a0e12'; c.fillRect(0, 0, w, h);
        c.globalCompositeOperation = 'lighter'; c.drawImage(glow('#cfe0ff'), w * .1, h * .05, w * .8, h * .7); c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#d8dde8'; c.fillRect(w * .1, h * .62, w * .8, 30 * S0);
        silhouetteGirl(c, w * .52, h * .625, 3.6 * S0, 'lie', { burn: true });
        rain(.12);
      }
      vign(.8); break;
    }
    case 'end_repeat': {
      c.fillStyle = '#0c0708'; c.fillRect(0, 0, w, h);
      const cy = h * .62; c.fillStyle = '#2a180c'; c.fillRect(0, cy, w, h - cy);
      for (let i = 0; i < 9; i++) { const ox = w * (.3 + hash2(i, 1) * .4), oy = cy - (6 + hash2(i, 2) * 20) * S0; c.globalCompositeOperation = 'lighter'; c.drawImage(glow('#ffc94a'), ox - 30 * S0, oy - 30 * S0, 60 * S0, 60 * S0); c.globalCompositeOperation = 'source-over'; }
      if (li >= 6) { const fx2 = w * .75, fy = cy - 10 * S0; c.fillStyle = '#5a3a20'; c.beginPath(); c.ellipse(fx2, fy, 26 * S0, 9 * S0, 0, 0, TAU); c.fill(); for (let i = 0; i < 8; i++) { const k = (t * 1.2 + i / 8) % 1; c.fillStyle = rgba(i % 2 ? '#ffb040' : '#ff6a20', .8 * (1 - k)); c.beginPath(); c.ellipse(fx2 + Math.sin(i + t * 3) * 8 * S0, fy - k * 60 * S0, (8 - k * 6) * S0, (12 - k * 8) * S0, 0, 0, TAU); c.fill(); } }
      vign(.8); break;
    }
    case 'end_stranger': case 'end_sunny': case 'epilogue': {
      const sunny = key === 'end_sunny', ep = key === 'epilogue';
      const k = ep ? .5 : clamp((li - (sunny ? 8 : 6)) / 4, 0, 1);
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, mixHex('#0a0e1a', '#c8d8f0', k * .8)); g.addColorStop(1, mixHex('#05060a', '#5a6a80', k * .6)); c.fillStyle = g; c.fillRect(0, 0, w, h);
      if (k < .9 && !ep) rain(.3 * (1 - k));
      if (k > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = k; for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(255,240,200,.08)'; c.beginPath(); c.moveTo(w * (.5 + i * .1), 0); c.lineTo(w * (.7 + i * .1), 0); c.lineTo(w * (.3 + i * .1), h); c.lineTo(w * (.1 + i * .1), h); c.fill(); } c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
      if (!ep && li >= (sunny ? 6 : 7)) {
        if (sunny) { c.fillStyle = '#e8ecf4'; c.fillRect(w * .08, h * .7, w * .55, 30 * S0); c.fillStyle = '#c8ccd8'; c.fillRect(w * .08, h * .7 + 30 * S0, w * .55, 8 * S0); silhouetteGirl(c, w * .3, h * .7, 2.4 * S0, 'sit', { smile: li >= 9 }); silhouetteMan(c, w * .76, h * .82, 2.2 * S0, { c: '#1c1f33', lining: '#53f0d6', flip: true }); }
        else { c.fillStyle = '#2a2e3a'; c.fillRect(w * .58, h * .3, w * .22, h * .52); c.fillStyle = 'rgba(255,240,200,.15)'; c.fillRect(w * .6, h * .32, w * .18, h * .5); silhouetteMan(c, w * .74, h * .82, 2.2 * S0, { c: '#1c1f33', lining: '#53f0d6', flip: true }); silhouetteGirl(c, w * .34, h * .82, 2.3 * S0, 'stand'); }
      }
      vign(.6); break;
    }
    default: c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
  }
}
