// ============ 人物與怪物：程序骨架 ============
// 座標：原點在腳底，往上是 −y，面向右。人高約 100。
// 姿勢 P：{ t 時間, a 動作(idle/walk/atk/shoot/cast/guard/hit/down/aloft/charge), p 進度 0～1, back 背對 }
const LOOKS = {
  wei:    { skin: '#e8c9a8', hair: '#1c1e2c', coat: '#2f3f6a', coat2: '#1f2a4a', trim: '#e8e2d0', pants: '#22232e', boot: '#15161c', scarf: '#8fd0ff', weapon: 'sword', hairStyle: 'tail', build: 1 },
  yuan:   { skin: '#e2b896', hair: '#8a3a2a', coat: '#5a3a7a', coat2: '#3e2856', trim: '#d0a860', pants: '#2a2a36', boot: '#1c1a22', scarf: '#b58cff', weapon: 'bow', hairStyle: 'pony', build: .9, short: true, goggles: true, female: true },
  luo:    { skin: '#c9a888', hair: '#9a968c', coat: '#6a5a3a', coat2: '#4a3e28', trim: '#8f8a94', pants: '#33302a', boot: '#1c1a16', scarf: '#f3d98a', weapon: 'door', hairStyle: 'hood', build: 1.28, beard: true },
  bruiser:{ skin: '#c9a888', hair: '#2a2420', coat: '#4a3a30', coat2: '#30261e', trim: '#c8402f', pants: '#2a2622', boot: '#15130f', weapon: 'hookhammer', hairStyle: 'wrap', build: 1.22, goggles: true, mask: true },
  rigger: { skin: '#d8b090', hair: '#2a2420', coat: '#3a3a44', coat2: '#26262e', trim: '#c8402f', pants: '#24242a', boot: '#15130f', weapon: 'xbow', hairStyle: 'hood', build: .92, mask: true },
  foreman:{ skin: '#c0a080', hair: '#3a3028', coat: '#2e2a28', coat2: '#1c1a18', trim: '#c8402f', pants: '#26221e', boot: '#12100c', weapon: 'whip', hairStyle: 'hat', build: 1.2, longcoat: true, beard: true },
  zhuo:   { skin: '#c8a27c', hair: '#1a1614', coat: '#6a1e22', coat2: '#451216', trim: '#e8c070', pants: '#221c1a', boot: '#12100c', weapon: 'twinhook', hairStyle: 'bald', build: 1.36, beard: true, short2: true },
  scale:  { skin: '#d8b89a', hair: '#d8d4c8', coat: '#5a5648', coat2: '#3e3a30', trim: '#e8c070', pants: '#3a362e', boot: '#1c1a16', weapon: 'scale', hairStyle: 'bun', build: .95, longcoat: true, female: true, old: true },
  hammer: { skin: '#b89070', hair: '#5a5650', coat: '#5a4636', coat2: '#3c2e22', trim: '#ff9a3c', pants: '#2e2a26', boot: '#15130f', weapon: 'smith', hairStyle: 'bald', build: 1.3, beard: true, apron: true },
  blind:  { skin: '#d8c0a8', hair: '#c8c4b8', coat: '#3e4a5a', coat2: '#2a3440', trim: '#bfe8ff', pants: '#2a2e36', boot: '#16181c', weapon: 'cane', hairStyle: 'long', build: .9, longcoat: true, blindfold: true, old: true },
  zhu:    { skin: '#e0c0a0', hair: '#3a4a3a', coat: '#3a5a4e', coat2: '#274036', trim: '#a0f0d0', pants: '#2a302c', boot: '#161a18', weapon: 'none', hairStyle: 'short', build: .9, satchel: true },
  ear:    { skin: '#e2b896', hair: '#4a3a2a', coat: '#7a6a4a', coat2: '#544a32', trim: '#e8e2d0', pants: '#3a342a', boot: '#1c1a16', weapon: 'none', hairStyle: 'messy', build: .72, kid: true, scarf: '#c8402f' },
  luchen: { skin: '#dcc0a8', hair: '#2a2a34', coat: '#d8d2c4', coat2: '#a8a294', trim: '#ffcf5a', pants: '#8a857c', boot: '#3a3740', weapon: 'staff', hairStyle: 'veil', build: .95, longcoat: true, female: true },
  vill_a: { skin: '#d8b090', hair: '#3a302a', coat: '#6a5a4a', coat2: '#4a3e32', trim: '#8a7a5a', pants: '#3a342e', boot: '#1c1a16', weapon: 'none', hairStyle: 'short', build: 1 },
  vill_b: { skin: '#e0b898', hair: '#5a4a3a', coat: '#4a5a5a', coat2: '#344040', trim: '#8a9a9a', pants: '#2e3436', boot: '#16181a', weapon: 'none', hairStyle: 'bun', build: .92, female: true, longcoat: true },
  vill_c: { skin: '#c8a888', hair: '#8a867c', coat: '#5a4a5a', coat2: '#3e3240', trim: '#9a8a9a', pants: '#322c34', boot: '#18161a', weapon: 'cane', hairStyle: 'hat', build: 1, old: true },
};
const U_INK = '#0b0c13', U_LW = 2.4;
function uPath(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
function uFill(g, pts, fill, lw) { uPath(g, pts); g.fillStyle = fill; g.fill(); if (lw !== 0) { g.strokeStyle = U_INK; g.lineWidth = lw || U_LW; g.lineJoin = 'round'; g.stroke(); } }
function uLimb(g, x0, y0, x1, y1, w, col) { g.lineCap = 'round'; g.strokeStyle = U_INK; g.lineWidth = w + U_LW * 1.6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.stroke(); }
function uCirc(g, x, y, r, fill, lw) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = fill; g.fill(); if (lw !== 0) { g.strokeStyle = U_INK; g.lineWidth = lw || U_LW; g.stroke(); } }
function uEll(g, x, y, rx, ry, rot, fill, lw) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fillStyle = fill; g.fill(); if (lw !== 0) { g.strokeStyle = U_INK; g.lineWidth = lw || U_LW; g.stroke(); } }
const rot2 = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

// ---------- 武器 ----------
function drawWeapon(g, kind, hx, hy, ang, L, P) { // 握點 (hx,hy)，角度 ang（0＝指向右，負＝往上）
  g.save(); g.translate(hx, hy); g.rotate(ang);
  if (kind === 'sword') {
    const full = P && P.reforged;
    const gr = g.createLinearGradient(0, -4, 0, 4); gr.addColorStop(0, '#f4f8ff'); gr.addColorStop(.5, '#aab8d0'); gr.addColorStop(1, '#6a7890');
    if (full) uFill(g, [6, -4, 54, -3.4, 62, 0, 54, 3.4, 6, 4], gr, 1.8); else uFill(g, [6, -4, 34, -3.6, 30, -.5, 38, 1.5, 31, 4, 6, 4], gr, 1.8);
    g.strokeStyle = '#ffcf5a'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(8, 0); g.lineTo(full ? 56 : 30, 0); g.stroke();
    uFill(g, [3, -8, 7, -8, 7, 8, 3, 8], '#e8c070', 1.6); uFill(g, [-9, -2.4, 3, -2.4, 3, 2.4, -9, 2.4], '#2a2a36', 1.6); uCirc(g, -10, 0, 3, '#e8c070', 1.5);
  } else if (kind === 'bow') {
    uFill(g, [-6, -3, 22, -3, 22, 3, -6, 3], '#5a4636', 1.8);
    g.strokeStyle = U_INK; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(16, -17); g.quadraticCurveTo(26, 0, 16, 17); g.stroke(); g.strokeStyle = '#d0a860'; g.lineWidth = 2.4; g.stroke();
    g.strokeStyle = '#e8e2d0'; g.lineWidth = 1; g.beginPath(); g.moveTo(16, -17); g.lineTo(8 - (P && P.draw ? 6 : 0), 0); g.lineTo(16, 17); g.stroke();
    uFill(g, [22, -2, 34, 0, 22, 2], '#cfd8e8', 1.4); g.strokeStyle = U_INK; g.lineWidth = 2.4; g.beginPath(); g.arc(30, 4, 4, -1.2, 1.6); g.stroke(); g.strokeStyle = '#cfd8e8'; g.lineWidth = 1.2; g.stroke();
  } else if (kind === 'xbow') {
    uFill(g, [-6, -2.6, 22, -2.6, 22, 2.6, -6, 2.6], '#4a3a30', 1.8); g.strokeStyle = U_INK; g.lineWidth = 4.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(16, -15); g.quadraticCurveTo(24, 0, 16, 15); g.stroke(); g.strokeStyle = '#6a6672'; g.lineWidth = 2.2; g.stroke(); uFill(g, [22, -1.6, 32, 0, 22, 1.6], '#cfd8e8', 1.2);
  } else if (kind === 'door') { // 駱山的門盾（握在前臂）
    const gr = g.createLinearGradient(-4, 0, 14, 0); gr.addColorStop(0, '#8a6e4e'); gr.addColorStop(1, '#5c4630');
    uFill(g, [-2, -38, 12, -40, 14, 34, 0, 36], gr, 2.2);
    g.strokeStyle = 'rgba(20,14,8,.6)'; g.lineWidth = 1; for (const x of [3, 8]) { g.beginPath(); g.moveTo(x, -38); g.lineTo(x + 1.6, 35); g.stroke(); }
    for (const y of [-28, 0, 26]) uFill(g, [-3, y - 3, 15, y - 3.6, 15, y + 2.4, -3, y + 3], '#5a5664', 1.5);
    uFill(g, [3, -18, 10, -18.4, 10, -9, 3, -8.6], '#15131c', 1.4); g.strokeStyle = '#5a5664'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(5.4, -18); g.lineTo(5.4, -9); g.moveTo(7.8, -18); g.lineTo(7.8, -9); g.stroke();
    g.fillStyle = 'rgba(255,220,170,.5)'; for (const y of [-28, 0, 26]) { g.fillRect(0, y - 1, 1.6, 1.6); g.fillRect(11, y - 1.2, 1.6, 1.6); }
  } else if (kind === 'mace') {
    uFill(g, [-4, -2.4, 26, -2.4, 26, 2.4, -4, 2.4], '#4a3a30', 1.8); uFill(g, [24, -8, 38, -7, 40, 0, 38, 7, 24, 8, 21, 0], '#6a6672', 2); g.fillStyle = '#9a96a2'; g.fillRect(27, -5, 8, 3);
  } else if (kind === 'hookhammer') {
    uFill(g, [-6, -2.6, 34, -2.6, 34, 2.6, -6, 2.6], '#4a3a30', 1.8); uFill(g, [28, -11, 42, -10, 42, 6, 28, 7], '#5a5664', 2); g.strokeStyle = U_INK; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(35, 12, 8, -.4, 2.6); g.stroke(); g.strokeStyle = '#8f8a94'; g.lineWidth = 3; g.stroke();
  } else if (kind === 'whip') {
    uFill(g, [-5, -2.4, 10, -2.4, 10, 2.4, -5, 2.4], '#2a2420', 1.6); const w = (P && P.whip) || 0; g.strokeStyle = U_INK; g.lineWidth = 4.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(10, 0); g.bezierCurveTo(26, -10 - w * 20, 40, 14 + w * 10, 54 + w * 16, 2); g.stroke(); g.strokeStyle = '#6a6672'; g.lineWidth = 2; g.stroke();
  } else if (kind === 'twinhook' || kind === 'hook') {
    uFill(g, [-5, -2.4, 12, -2.4, 12, 2.4, -5, 2.4], '#2a2420', 1.6); g.strokeStyle = U_INK; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(12, 0); g.lineTo(26, 0); g.arc(26, 8, 8, -Math.PI / 2, Math.PI * .8); g.stroke(); g.strokeStyle = '#cfd8e8'; g.lineWidth = 2.4; g.stroke();
  } else if (kind === 'staff' || kind === 'cane') {
    const n = kind === 'staff' ? 76 : 44; uFill(g, [-n * .45, -1.8, n * .55, -1.8, n * .55, 1.8, -n * .45, 1.8], kind === 'staff' ? '#d8d2c4' : '#5a4636', 1.6); if (kind === 'staff') { uCirc(g, n * .55 + 5, 0, 5, 'rgba(255,220,130,.9)', 1.5); }
  } else if (kind === 'scale') {
    uFill(g, [-3, -1.6, 20, -1.6, 20, 1.6, -3, 1.6], '#e8c070', 1.4); g.strokeStyle = U_INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(2, 0); g.lineTo(2, 12); g.moveTo(18, 0); g.lineTo(18, 12); g.stroke(); uEll(g, 2, 13, 5, 2, 0, '#e8c070', 1.2); uEll(g, 18, 13, 5, 2, 0, '#e8c070', 1.2);
  } else if (kind === 'smith') {
    uFill(g, [-4, -2.2, 20, -2.2, 20, 2.2, -4, 2.2], '#4a3a30', 1.6); uFill(g, [16, -7, 28, -7, 28, 7, 16, 7], '#5a5664', 1.8);
  }
  g.restore();
}

// ---------- 人形 ----------
// 比例約四頭半身：頭大、肩寬、四肢粗，縮小後仍看得清楚
function rigHuman(g, L, P) {
  const t = P.t || 0, a = P.a || 'idle', p = P.p || 0, B = L.build || 1, kid = L.kid ? .76 : 1, back = !!P.back;
  let lean = 0, bob = Math.sin(t * 2.2) * 1.2, dx = 0, legA = 0, armF = .3, armB = -.22, wAng = -.95, crouch = 0, headTilt = 0, stride = 0;
  if (a === 'walk') { const s = Math.sin(t * 9.5); legA = s * .6; bob = Math.abs(Math.cos(t * 9.5)) * 2.8; armF = .15 + s * -.5; armB = -.15 + s * .5; lean = .07; wAng = -.5; }
  else if (a === 'atk') {
    if (p < .32) { const q = easeOut(p / .32); lean = -.18 * q; armF = .3 - 2.5 * q; wAng = -.95 - 1.5 * q; dx = -6 * q; crouch = 3 * q; stride = -.2 * q; }
    else if (p < .52) { const q = easeIn((p - .32) / .2); lean = -.18 + .5 * q; armF = -2.2 + 3.3 * q; wAng = -2.45 + 3.1 * q; dx = -6 + 22 * q; crouch = 3 + 3 * q; stride = -.2 + .65 * q; }
    else { const q = ease((p - .52) / .48); lean = .32 * (1 - q); armF = 1.1 - .8 * q; wAng = .65 - 1.6 * q; dx = 16 * (1 - q); crouch = 6 * (1 - q); stride = .45 * (1 - q); }
  } else if (a === 'up') {
    if (p < .3) { const q = easeOut(p / .3); lean = .22 * q; armF = .3 + 1.0 * q; wAng = -.95 + 2.0 * q; crouch = 9 * q; stride = .3 * q; }
    else if (p < .5) { const q = easeIn((p - .3) / .2); lean = .22 - .46 * q; armF = 1.3 - 3.7 * q; wAng = 1.05 - 3.3 * q; crouch = 9 - 14 * q; dx = 9 * q; stride = .3; }
    else { const q = ease((p - .5) / .5); lean = -.24 * (1 - q); armF = -2.4 + 2.7 * q; wAng = -2.25 + 1.3 * q; crouch = -5 * (1 - q); dx = 9 * (1 - q); stride = .3 * (1 - q); }
  } else if (a === 'smash') {
    if (p < .4) { const q = easeOut(p / .4); lean = -.22 * q; armF = .3 - 3.1 * q; wAng = -.95 - 1.9 * q; crouch = -7 * q; }
    else if (p < .56) { const q = easeIn((p - .4) / .16); lean = -.22 + .68 * q; armF = -2.8 + 4.2 * q; wAng = -2.85 + 4.0 * q; crouch = -7 + 19 * q; dx = 11 * q; stride = .5 * q; }
    else { const q = ease((p - .56) / .44); lean = .46 * (1 - q); armF = 1.4 - 1.1 * q; wAng = 1.15 - 2.1 * q; crouch = 12 * (1 - q); dx = 11 * (1 - q); stride = .5 * (1 - q); }
  } else if (a === 'shoot') { const k = p < .25 ? easeOut(p / .25) : 1, rc = p > .3 && p < .5 ? Math.sin((p - .3) / .2 * Math.PI) : 0; armF = .3 - 1.8 * k; wAng = -.95 + .95 * k; lean = -.06 * k - .1 * rc; dx = -5 * rc; armB = -.22 - 1.1 * k; stride = .25 * k; }
  else if (a === 'cast') { const k = Math.sin(Math.min(1, p * 1.4) * Math.PI); armF = .3 - 2.7 * k; wAng = -.95 - .7 * k; armB = -.22 - 1.7 * k; lean = -.08 * k; crouch = -3 * k; }
  else if (a === 'guard') { armF = -1.0; wAng = -1.55; armB = .5; lean = .1; crouch = 5; stride = .3; }
  else if (a === 'hit') { const k = Math.sin(Math.min(1, p) * Math.PI); lean = -.32 * k; dx = -10 * k; armF = .3 + .7 * k; armB = -.22 - .9 * k; headTilt = -.3 * k; }
  else if (a === 'charge') { const k = .5 + .5 * Math.sin(t * 14); armF = -2.45 + k * .1; wAng = -2.3; lean = -.15; crouch = 5 + k; stride = .25; }
  else if (a === 'aloft') { lean = -.5 + Math.sin(t * 3) * .1; armF = -2.6 + Math.sin(t * 4) * .2; armB = -2.2 + Math.cos(t * 3.3) * .2; legA = .35 + Math.sin(t * 3.7) * .15; wAng = -2.2; bob = 0; }
  g.save();
  if (a === 'down') { g.translate(4, -9); g.rotate(-Math.PI / 2 + .1); g.translate(0, 0); lean = 0; bob = 0; armF = 1.3; armB = .7; legA = .18; wAng = .4; }
  g.translate(dx, -bob + crouch); g.scale(kid, kid);
  const hipY = -42, shY = -69, sw = 12.5 * B, ww = 9.5 * B, hp = 11.5 * B, lw = U_LW + .3;
  const hem = L.longcoat ? -13 : L.short ? -36 : -25;
  // 圍巾／披風（最後面）
  if (L.scarf) { const s1 = Math.sin(t * 3.2) * 4, s2 = Math.cos(t * 2.6) * 6, nx = -4, ny = shY + 1; g.save(); g.translate(0, hipY); g.rotate(lean * .7); g.translate(0, -hipY);
    g.beginPath(); g.moveTo(nx + 6, ny - 5); g.quadraticCurveTo(nx - 12, ny - 2 + s1 * .3, nx - 26 - s2 * .6, ny + 14 + s1); g.quadraticCurveTo(nx - 38 - s2, ny + 26 + s1, nx - 46 - s2 * 1.5, ny + 44 + s1 * 1.3); g.lineTo(nx - 34 - s2, ny + 40 + s1); g.quadraticCurveTo(nx - 26 - s2 * .6, ny + 30 + s1 * .8, nx - 14, ny + 20 + s1 * .5); g.lineTo(nx - 2, ny + 10); g.closePath();
    g.fillStyle = L.scarf; g.fill(); g.strokeStyle = U_INK; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); g.restore(); }
  // 後手
  g.save(); g.translate(0, hipY); g.rotate(lean); g.translate(0, -hipY);
  { const e = rot2(0, 15, armB), h = rot2(0, 29, armB * 1.15); uLimb(g, -sw * .7, shY + 4, -sw * .7 + e[0], shY + 4 + e[1], 8.6 * B, L.coat2); uLimb(g, -sw * .7 + e[0], shY + 4 + e[1], -sw * .7 + h[0], shY + 4 + h[1], 7.4 * B, L.coat2); uCirc(g, -sw * .7 + h[0], shY + 4 + h[1], 4 * B, shade(L.skin, -.2), 1.8);
    if (L.weapon === 'twinhook') drawWeapon(g, 'hook', -sw * .7 + h[0], shY + 4 + h[1], armB + 1.3, L, P); }
  g.restore();
  // 腿與靴
  const leg = (ang, col, off, far) => { const k = rot2(0, 21, ang), f = rot2(0, 40, ang * .85), fx = off + f[0], fy = hipY + f[1];
    uLimb(g, off, hipY + 2, off + k[0], hipY + 2 + k[1], 10 * B, col); uLimb(g, off + k[0], hipY + 2 + k[1], fx, fy - 4, 8.4 * B, col);
    g.beginPath(); g.moveTo(fx - 6, fy - 9); g.lineTo(fx + 5, fy - 9); g.lineTo(fx + 6, fy - 3); g.quadraticCurveTo(fx + 15, fy - 3, fx + 15, fy + 2); g.lineTo(fx - 7, fy + 2); g.closePath(); g.fillStyle = far ? shade(L.boot, -.2) : L.boot; g.fill(); g.strokeStyle = U_INK; g.lineWidth = lw; g.stroke();
    g.fillStyle = far ? shade(L.trim, -.5) : shade(L.trim, -.25); g.fillRect(fx - 6, fy - 10.5, 11, 2.6); };
  leg(-legA - stride, shade(L.pants, -.3), -3.5 * B, true); leg(legA + stride, L.pants, 3.5 * B, false);
  // 軀幹（外套）
  g.save(); g.translate(0, hipY); g.rotate(lean); g.translate(0, -hipY);
  const sway = Math.sin(t * 2.8) * 1.5;
  g.beginPath(); g.moveTo(-sw, shY + 3); g.quadraticCurveTo(-sw * .4, shY - 5, 1, shY - 4); g.quadraticCurveTo(sw * .7, shY - 4, sw, shY + 3);
  g.quadraticCurveTo(sw + 1.5, shY + 14, ww + 1, hipY - 6); g.quadraticCurveTo(hp + 3, hipY + 4, hp + 4, hem); g.quadraticCurveTo(0, hem + 5, -hp - 8 - sway, hem + 3); g.quadraticCurveTo(-hp - 3, hipY, -ww - 1, hipY - 6); g.quadraticCurveTo(-sw - 2, shY + 14, -sw, shY + 3); g.closePath();
  g.fillStyle = L.coat; g.fill(); g.save(); g.clip(); g.fillStyle = L.coat2; g.fillRect(-40, shY - 8, 38 + ww * .1, 90); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(sw * .45, shY - 8, 12, 90); g.restore(); g.strokeStyle = U_INK; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke();
  // 襟線與釦
  g.strokeStyle = L.trim; g.lineWidth = 2.2; g.beginPath(); g.moveTo(sw * .35, shY - 2); g.quadraticCurveTo(sw * .55, hipY - 8, hp * .7, hem + 1); g.stroke();
  // 腰帶
  g.beginPath(); g.moveTo(-ww - 2.5, hipY - 8); g.quadraticCurveTo(0, hipY - 4, ww + 2.5, hipY - 9); g.lineTo(ww + 2.6, hipY - 3.5); g.quadraticCurveTo(0, hipY + 1.5, -ww - 2.6, hipY - 2.5); g.closePath(); g.fillStyle = shade(L.coat2, -.4); g.fill(); g.strokeStyle = U_INK; g.lineWidth = 1.7; g.stroke();
  uFill(g, [ww * .25, hipY - 8.4, ww * .25 + 5.5, hipY - 8.8, ww * .25 + 5.5, hipY - 3, ww * .25, hipY - 2.6], L.trim, 1.4);
  if (L.apron) uFill(g, [-sw * .3, shY + 10, sw * .85, shY + 9, hp + 1, hem + 5, -hp * .4, hem + 7], '#3a2e24', 1.8);
  if (L.satchel) { g.strokeStyle = U_INK; g.lineWidth = 3.4; g.beginPath(); g.moveTo(sw * .6, shY); g.lineTo(-hp - 2, hipY - 2); g.stroke(); g.strokeStyle = '#8a6e4e'; g.lineWidth = 1.6; g.stroke(); uFill(g, [-hp - 9, hipY - 6, -hp + 5, hipY - 7, -hp + 6, hipY + 9, -hp - 8, hipY + 9], '#6a543a', 1.8); }
  if (L.id === 'yuan') { g.strokeStyle = U_INK; g.lineWidth = 3.6; g.beginPath(); g.moveTo(-sw * .7, shY + 1); g.lineTo(ww, hipY - 8); g.stroke(); g.strokeStyle = L.trim; g.lineWidth = 1.8; g.stroke(); uCirc(g, -hp - 2, hipY + 3, 6, '#c8a060', 1.8); uCirc(g, -hp - 2, hipY + 3, 2.8, L.coat2, 1.2); }
  if (L.id === 'wei') { uFill(g, [sw - 9, shY - 5, sw + 4, shY - 2, sw + 4, shY + 8, sw - 6, shY + 7], '#cfd8e8', 1.8); g.strokeStyle = '#ffcf5a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(sw - 5, shY + 1); g.lineTo(sw + 2, shY + 3); g.stroke(); }
  // 領口
  uFill(g, [-5, shY - 3, 7, shY - 3.5, 9, shY + 3, 1, shY + 6, -6, shY + 3], L.scarf && !L.kid ? L.scarf : L.trim, 1.7);
  // ── 頭 ──
  g.save(); g.translate(2, shY - 16); g.rotate(headTilt + (a === 'walk' ? .04 : 0));
  const hr = 12.5;
  if (L.hairStyle === 'hood') { g.beginPath(); g.moveTo(-15, 12); g.quadraticCurveTo(-19, -10, -8, -17); g.quadraticCurveTo(4, -21, 13, -10); g.quadraticCurveTo(15, 2, 9, 12); g.closePath(); g.fillStyle = L.coat2; g.fill(); g.strokeStyle = U_INK; g.lineWidth = lw; g.stroke(); }
  if (L.hairStyle === 'veil') { g.beginPath(); g.moveTo(-16, 22); g.quadraticCurveTo(-19, -12, -6, -17); g.quadraticCurveTo(8, -19, 13, -6); g.lineTo(8, 10); g.lineTo(-4, 24); g.closePath(); g.fillStyle = L.coat; g.fill(); g.strokeStyle = U_INK; g.lineWidth = lw; g.stroke(); }
  if (L.hairStyle === 'long') { g.beginPath(); g.moveTo(-14, 20); g.quadraticCurveTo(-17, -8, -4, -15); g.lineTo(6, -8); g.lineTo(-2, 22); g.closePath(); g.fillStyle = L.hair; g.fill(); g.strokeStyle = U_INK; g.lineWidth = lw; g.stroke(); }
  if (L.hairStyle === 'pony') { const s = Math.sin(t * 3) * 3; g.beginPath(); g.moveTo(-9, -9); g.quadraticCurveTo(-24, -10 + s * .4, -27 - s, 6 + s); g.quadraticCurveTo(-28 - s, 20 + s, -20 - s * .6, 24 + s); g.quadraticCurveTo(-17, 10, -10, 1); g.closePath(); g.fillStyle = L.hair; g.fill(); g.strokeStyle = U_INK; g.lineWidth = lw; g.stroke(); }
  if (L.hairStyle === 'tail') { const s = Math.sin(t * 3.4) * 2; g.beginPath(); g.moveTo(-9, -6); g.quadraticCurveTo(-20, -4, -21 - s, 8 + s); g.lineTo(-15 - s, 11 + s); g.quadraticCurveTo(-14, 2, -9, 2); g.closePath(); g.fillStyle = L.hair; g.fill(); g.strokeStyle = U_INK; g.lineWidth = lw; g.stroke(); }
  uCirc(g, 0, 0, hr, back ? L.hair : L.skin, lw);
  if (!back) {
    g.save(); g.beginPath(); g.arc(0, 0, hr - .2, 0, TAU); g.clip();
    g.fillStyle = shade(L.skin, -.16); g.fillRect(-14, -14, 9, 28);              // 臉側陰影
    if (L.hairStyle === 'bald') { g.fillStyle = shade(L.skin, -.22); g.fillRect(-14, -14, 8, 28); }
    else if (L.hairStyle === 'hood') { g.fillStyle = L.coat2; g.fillRect(-14, -14, 13, 28); g.beginPath(); g.moveTo(-14, -14); g.lineTo(14, -14); g.lineTo(13, -5); g.quadraticCurveTo(4, -8, -2, -3); g.closePath(); g.fill(); }
    else if (L.hairStyle === 'veil') { g.fillStyle = L.coat; g.fillRect(-14, -14, 12, 28); g.beginPath(); g.moveTo(-14, -14); g.lineTo(14, -14); g.lineTo(13, -6); g.quadraticCurveTo(4, -9, -3, -2); g.closePath(); g.fill(); }
    else if (L.hairStyle === 'wrap') { g.fillStyle = '#22201e'; g.fillRect(-14, -14, 28, 9); g.fillRect(-14, -14, 9, 28); }
    else if (L.hairStyle === 'hat') { g.fillStyle = L.hair; g.fillRect(-14, -14, 9, 28); }
    else { g.fillStyle = L.hair; g.beginPath(); g.moveTo(-14, 14); g.lineTo(-14, -14); g.lineTo(14, -14); g.lineTo(13.5, -4.5); g.quadraticCurveTo(9, -9, 5, -4); g.quadraticCurveTo(2, -8.5, -2, -3); g.quadraticCurveTo(-5, 4, -4.5, 14); g.closePath(); g.fill(); }
    if (L.mask) { g.fillStyle = '#1c1a1e'; g.beginPath(); g.moveTo(-6, 0); g.lineTo(14, -1); g.lineTo(14, 14); g.lineTo(-6, 14); g.closePath(); g.fill(); }
    if (L.blindfold) { g.fillStyle = '#e8e2d0'; g.fillRect(-14, -5, 28, 6); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-14, -.4, 28, 1.4); }
    g.restore();
    uCirc(g, 0, 0, hr, 'rgba(0,0,0,0)', lw);
    if (!L.blindfold) {
      if (L.goggles && L.mask) { uCirc(g, 6, -3, 4.6, '#ffd070', 1.8); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(7.2, -4.4, 1.6, 0, TAU); g.fill(); }
      else { g.fillStyle = U_INK; g.beginPath(); g.ellipse(6.4, -1.6, 1.9, 2.9, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(6.6, -3.4, 1.3, 1.5); g.strokeStyle = U_INK; g.lineWidth = 1.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(3.4, -6.2); g.lineTo(9.6, -6.6 + (a === 'atk' || a === 'smash' || a === 'charge' ? 1.6 : 0)); g.stroke();
        if (!L.mask) { g.strokeStyle = shade(L.skin, -.4); g.lineWidth = 1.2; g.beginPath(); g.moveTo(6.5, 5.4); g.lineTo(10, 5); g.stroke(); } }
    }
    if (L.goggles && !L.mask) { uFill(g, [-11.5, -11, 11, -12, 11.8, -7, -11.5, -6], '#c8a060', 1.7); uCirc(g, 5, -9.2, 3.2, '#bfe8ff', 1.4); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(5.2, -10.8, 1.4, 1.4); }
    if (L.beard) { g.beginPath(); g.moveTo(-3, 5); g.quadraticCurveTo(6, 2, 12, 4); g.quadraticCurveTo(12, 14, 4, 17); g.quadraticCurveTo(-3, 14, -3, 5); g.closePath(); g.fillStyle = L.hair; g.fill(); g.strokeStyle = U_INK; g.lineWidth = 1.7; g.stroke(); }
    if (L.hairStyle === 'bun') uCirc(g, -10, -11, 5.6, L.hair, 2);
    if (L.hairStyle === 'messy') uFill(g, [-12, -6, -9, -17, -3, -12, 1, -19, 5, -12, 10, -16, 12, -7], L.hair, 2);
    if (L.hairStyle === 'hat') { uFill(g, [-19, -6, 19, -8, 16, -3, -16, -2], '#22201e', 2); uFill(g, [-10, -7, -8, -19, 8, -20, 10, -8], '#22201e', 2); g.fillStyle = L.trim; g.fillRect(-9, -9.6, 18, 2.4); uCirc(g, 11, -13, 3.6, '#ffd070', 1.6); }
  }
  g.restore();
  // ── 前手與武器 ──
  const e = rot2(0, 15, armF), h = rot2(0, 29, armF * 1.12 + (a === 'shoot' ? -.1 : 0)), sx0 = sw * .72, sy0 = shY + 5, hx = sx0 + h[0], hy = sy0 + h[1];
  if (L.weapon === 'door') {
    const dOff = a === 'guard' ? 10 : (a === 'atk' || a === 'smash') ? 5 + Math.max(0, lean) * 34 : 5;
    const mh = rot2(0, 27, (a === 'atk' || a === 'smash') ? armF : -.5); drawWeapon(g, 'mace', -2 + mh[0], shY + 6 + mh[1], (a === 'atk' || a === 'smash') ? wAng : -1.25, L, P); uCirc(g, -2 + mh[0], shY + 6 + mh[1], 4.2, shade(L.skin, -.1), 1.6);
    g.save(); g.scale(1.12, 1.12); drawWeapon(g, 'door', (sw * .8 + dOff) / 1.12, (shY + 37) / 1.12, (a === 'atk' ? lean * .5 : a === 'guard' ? -.05 : 0), L, P); g.restore();
    uLimb(g, sx0, sy0, sx0 + 8, sy0 + 15, 9 * B, L.coat); uCirc(g, sx0 + 9, sy0 + 17, 4.4 * B, L.skin, 1.8);
  } else {
    if (L.weapon !== 'none') { g.save(); g.translate(hx, hy); g.scale(1.25, 1.25); drawWeapon(g, L.weapon === 'twinhook' ? 'hook' : L.weapon, 0, 0, L.weapon === 'bow' || L.weapon === 'xbow' ? (a === 'shoot' ? 0 : .55) : wAng, L, Object.assign({ draw: a === 'shoot' && p < .3 }, P)); g.restore(); }
    uLimb(g, sx0, sy0, sx0 + e[0], sy0 + e[1], 9 * B, L.coat); uLimb(g, sx0 + e[0], sy0 + e[1], hx, hy, 7.8 * B, L.coat);
    uCirc(g, hx, hy, 4.4 * B, L.skin, 1.8);
  }
  g.restore(); g.restore();
}

// ---------- 怪物 ----------
function rigHound(g, P, big) {
  const t = P.t || 0, a = P.a, p = P.p || 0; let lunge = 0, jaw = .15 + Math.sin(t * 3) * .05, bob = Math.sin(t * 5) * 1.2, lean = 0;
  if (a === 'atk') { const k = p < .35 ? -easeOut(p / .35) * .5 : p < .55 ? easeIn((p - .35) / .2) * 1.5 - .5 : (1 - ease((p - .55) / .45)); lunge = k * 26; jaw = p > .3 && p < .6 ? .7 : .2; lean = k * .12; }
  if (a === 'hit') { const k = Math.sin(Math.min(1, p) * Math.PI); lunge = -10 * k; lean = -.2 * k; }
  if (a === 'charge') { jaw = .6 + Math.sin(t * 20) * .1; lean = -.12; }
  if (a === 'aloft') { lean = -.4 + Math.sin(t * 3) * .1; bob = 0; }
  if (a === 'down') { g.rotate(Math.PI / 2 - .3); g.translate(-30, -6); }
  g.save(); g.translate(lunge, -bob); g.rotate(lean);
  const fur = big ? '#3a2e34' : '#4a4038', fur2 = big ? '#261e24' : '#2e2824', bone = '#d8ccb0';
  const lg = (x, ph, col) => { const s = a === 'walk' ? Math.sin(t * 10 + ph) * 6 : a === 'aloft' ? Math.sin(t * 5 + ph) * 4 + 6 : 0; uLimb(g, x, -30, x + 3 + s * .4, -14, 5.4, col); uLimb(g, x + 3 + s * .4, -14, x + s, -2, 4.4, col); };
  lg(-22, 0, fur2); lg(12, 2, fur2);
  // 尾
  g.strokeStyle = U_INK; g.lineWidth = 6.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-28, -36); g.quadraticCurveTo(-44, -44 + Math.sin(t * 4) * 4, -46, -30); g.stroke(); g.strokeStyle = fur; g.lineWidth = 3.4; g.stroke();
  // 身
  uFill(g, [-30, -42, -8, -48, 14, -46, 26, -40, 24, -26, 6, -22, -20, -22, -32, -30], fur);
  g.strokeStyle = bone; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-18 + i * 7, -42); g.quadraticCurveTo(-16 + i * 7, -32, -19 + i * 7, -24); g.stroke(); }
  if (big) { g.strokeStyle = U_INK; g.lineWidth = 5; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(14 - i * 5, -40 + i * 1.5, 4, 9, .2, 0, TAU); g.stroke(); } g.strokeStyle = ['#c8402f', '#e8c070', '#6a6672'][0]; g.lineWidth = 2.2; for (let i = 0; i < 3; i++) { g.strokeStyle = ['#c8402f', '#e8c070', '#8f8a94'][i]; g.beginPath(); g.ellipse(14 - i * 5, -40 + i * 1.5, 4, 9, .2, 0, TAU); g.stroke(); } }
  lg(-16, 3.1, fur); lg(18, 1, fur);
  // 頭（骨板）
  g.save(); g.translate(28, -44); g.rotate(-.1);
  uFill(g, [-6, -8, 8, -11, 26, -5, 30, 0, 8, 2, -6, 4], bone);
  uFill(g, [4, 2, 28, 1, 24, 5 + jaw * 10, 6, 6 + jaw * 6], fur2);
  g.fillStyle = '#f4ecd4'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(10 + i * 5, 1.4); g.lineTo(12 + i * 5, 5); g.lineTo(14 + i * 5, 1.4); g.fill(); }
  if (big) { uFill(g, [2, 6 + jaw * 6, 22, 5 + jaw * 10, 18, 11 + jaw * 16, 4, 11 + jaw * 10], fur2); uFill(g, [-4, 4, 6, 6 + jaw * 6, 2, 14 + jaw * 12, -6, 10], '#1c1418'); }
  uCirc(g, 9, -4.5, 2.6, '#ffb040', 1.4); g.fillStyle = '#fff4c8'; g.fillRect(9.4, -5.4, 1.4, 1.4);
  uFill(g, [-4, -8, -9, -19, 2, -11], fur); g.restore();
  g.restore();
}
function rigSpitter(g, P) {
  const t = P.t || 0, a = P.a, p = P.p || 0; let puff = 1 + Math.sin(t * 3) * .08, rec = 0, lean = 0;
  if (a === 'shoot' || a === 'atk') { puff = p < .4 ? 1 + p * 1.2 : 1.5 - (p - .4) * .8; rec = p > .4 && p < .6 ? -6 : 0; }
  if (a === 'charge') puff = 1.4 + Math.sin(t * 18) * .08;
  if (a === 'hit') { const k = Math.sin(Math.min(1, p) * Math.PI); rec = -9 * k; lean = -.2 * k; }
  if (a === 'aloft') lean = -.5;
  if (a === 'down') { g.rotate(Math.PI); g.translate(0, 26); }
  g.save(); g.translate(rec, 0); g.rotate(lean);
  const sk = '#3f6f5a', sk2 = '#274a3c';
  g.strokeStyle = U_INK; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(-18, -14); g.quadraticCurveTo(-40, -10, -46, -22 + Math.sin(t * 3) * 3); g.stroke(); g.strokeStyle = sk2; g.lineWidth = 5.5; g.stroke();
  uLimb(g, -14, -14, -22, -3, 4.6, sk2); uLimb(g, 8, -14, 16, -3, 4.6, sk2);
  uFill(g, [-22, -22, -6, -30, 12, -28, 22, -22, 20, -12, 0, -8, -18, -10], sk);
  g.fillStyle = 'rgba(190,130,90,.55)'; for (let i = 0; i < 5; i++) uPath(g, [-14 + i * 7, -27, -11 + i * 7, -32, -8 + i * 7, -27]), g.fill();
  // 褶傘
  uFill(g, [12, -26, 6, -46, 18, -40, 22, -52, 28, -40, 38, -44, 32, -28], '#a8524a'); g.strokeStyle = U_INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(16, -28); g.lineTo(14, -42); g.moveTo(22, -28); g.lineTo(23, -48); g.moveTo(28, -28); g.lineTo(34, -42); g.stroke();
  // 喉囊
  uEll(g, 22, -12, 9 * puff, 8 * puff, 0, '#8ff0a0'); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(24, -15, 3 * puff, 2 * puff, 0, 0, TAU); g.fill();
  uFill(g, [16, -30, 36, -28, 44, -22, 34, -17, 18, -18], sk); uCirc(g, 32, -25, 2.6, '#ffe070', 1.4); g.fillStyle = U_INK; g.fillRect(32.6, -26.4, 1.2, 2.8);
  g.restore();
}
function rigCrab(g, P, city) {
  const t = P.t || 0, a = P.a, p = P.p || 0; let claw = Math.sin(t * 2) * .1, lunge = 0, bob = Math.sin(t * 2.4) * 1.2, open = .3;
  if (a === 'atk' || a === 'smash') { const k = p < .4 ? -easeOut(p / .4) : p < .56 ? -1 + easeIn((p - .4) / .16) * 2.2 : 1.2 * (1 - ease((p - .56) / .44)); claw = k * .9; lunge = Math.max(0, k) * 18; open = p < .45 ? .8 : .05; }
  if (a === 'charge') { claw = -.9 + Math.sin(t * 16) * .05; open = .9; }
  if (a === 'hit') { const k = Math.sin(Math.min(1, p) * Math.PI); lunge = -8 * k; }
  if (a === 'aloft') { bob = 0; g.rotate(-.35 + Math.sin(t * 3) * .08); }
  if (a === 'down') { g.rotate(Math.PI); g.translate(0, 50); }
  g.save(); g.translate(lunge, -bob);
  const sh = '#8a5a4a', sh2 = '#5a3a30';
  for (let i = 0; i < 3; i++) { const s = a === 'walk' ? Math.sin(t * 9 + i * 2) * 4 : 0; uLimb(g, -20 + i * 8, -14, -34 + i * 6 + s, -24, 4.4, sh2); uLimb(g, -34 + i * 6 + s, -24, -40 + i * 8 + s, -1, 3.6, sh2); uLimb(g, 4 + i * 8, -12, 16 + i * 9 + s, -20, 4.4, sh2); uLimb(g, 16 + i * 9 + s, -20, 20 + i * 10 - s, -1, 3.6, sh2); }
  uFill(g, [-34, -16, -26, -30, 20, -30, 30, -18, 22, -8, -24, -8], sh);
  // 背上的窗框與石塊
  if (city) { uFill(g, [-36, -28, -34, -76, -10, -92, 14, -78, 28, -84, 30, -30], '#a39e92'); uFill(g, [-36, -28, -34, -76, -10, -92, -8, -30], '#7d786f', 0); uFill(g, [-22, -34, -22, -62, -12, -70, -2, -62, -2, -34], '#15131c', 1.6); for (let i = 0; i < 4; i++) uFill(g, [-20 + (i % 2) * 9, -60 + Math.floor(i / 2) * 13, -13 + (i % 2) * 9, -64 + Math.floor(i / 2) * 13 + (i % 2) * 3, -13 + (i % 2) * 9, -51 + Math.floor(i / 2) * 13, -20 + (i % 2) * 9, -49 + Math.floor(i / 2) * 13], shade(GLASS[i], 0), 1.2); uFill(g, [-10, -92, -8, -108, -4, -92], '#7d786f', 1.6); uFill(g, [6, -34, 6, -58, 22, -62, 22, -34], '#8e897f', 1.4); }
  else { uFill(g, [-30, -28, -28, -56, -8, -66, 12, -58, 24, -30], '#a39e92'); uFill(g, [-30, -28, -28, -56, -8, -66, -6, -30], '#7d786f', 0); uFill(g, [-20, -32, -20, -50, -10, -56, 0, -50, 0, -32], '#15131c', 1.6); for (let i = 0; i < 4; i++) uFill(g, [-18 + (i % 2) * 9, -48 + Math.floor(i / 2) * 9, -11 + (i % 2) * 9, -51 + Math.floor(i / 2) * 9 + (i % 2) * 3, -11 + (i % 2) * 9, -42 + Math.floor(i / 2) * 9, -18 + (i % 2) * 9, -40 + Math.floor(i / 2) * 9], shade(GLASS[i], 0), 1.2); }
  // 眼柄
  g.strokeStyle = U_INK; g.lineWidth = 3.4; g.beginPath(); g.moveTo(18, -28); g.lineTo(22, -38); g.moveTo(24, -26); g.lineTo(30, -35); g.stroke(); uCirc(g, 22, -39, 2.8, '#ffb040', 1.4); uCirc(g, 30, -36, 2.8, '#ffb040', 1.4);
  // 巨鉗
  g.save(); g.translate(24, -18); g.rotate(claw); uLimb(g, 0, 0, 18, -10, 7, sh2); g.translate(18, -10);
  uFill(g, [-4, -8, 14, -16 - open * 10, 34, -10 - open * 12, 22, -4, 6, 0], '#b06a50'); uFill(g, [-4, 2, 8, 4, 26, 4 + open * 8, 32, -2 + open * 10, 12, 12 + open * 6, -2, 10], '#8a4a38');
  g.fillStyle = '#f4ecd4'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(12 + i * 6, -6 - open * 4); g.lineTo(14 + i * 6, -1 - open * 2); g.lineTo(16 + i * 6, -6 - open * 5); g.fill(); }
  g.restore();
  g.save(); g.translate(-28, -14); uLimb(g, 0, 0, -8, 6, 5, sh2); uFill(g, [-16, 2, -6, 0, -4, 8, -14, 12], '#8a4a38', 1.8); g.restore();
  g.restore();
}
function rigWarden(g, P, xbow) {
  const t = P.t || 0, a = P.a, p = P.p || 0; let lean = 0, arm = -.3, dx = 0, bob = Math.sin(t * 1.6) * .8, wA = -1.35;
  if (a === 'atk') { if (p < .35) { const q = easeOut(p / .35); arm = -.3 - .9 * q; dx = -6 * q; lean = -.08 * q; } else if (p < .52) { const q = easeIn((p - .35) / .17); arm = -1.2 + 1.5 * q; dx = -6 + 26 * q; lean = -.08 + .2 * q; wA = -1.35 + 1.3 * q; } else { const q = ease((p - .52) / .48); arm = .3 - .6 * q; dx = 20 * (1 - q); lean = .12 * (1 - q); wA = -.05 - 1.3 * q; } }
  if (a === 'smash') { if (p < .4) { const q = easeOut(p / .4); wA = -1.35 - 1.2 * q; lean = -.12 * q; } else if (p < .58) { const q = easeIn((p - .4) / .18); wA = -2.55 + 3.4 * q; lean = -.12 + .3 * q; dx = 14 * q; } else { const q = ease((p - .58) / .42); wA = .85 - 2.2 * q; lean = .18 * (1 - q); dx = 14 * (1 - q); } }
  if (a === 'shoot') { const rc = p > .3 && p < .5 ? Math.sin((p - .3) / .2 * Math.PI) : 0; dx = -5 * rc; lean = -.06 * rc; }
  if (a === 'charge') { wA = xbow ? -1.35 : -2.4 + Math.sin(t * 16) * .04; lean = -.1; }
  if (a === 'hit') { const k = Math.sin(Math.min(1, p) * Math.PI); lean = -.2 * k; dx = -8 * k; }
  if (a === 'aloft') { lean = -.45 + Math.sin(t * 3) * .08; bob = 0; }
  if (a === 'down') { g.rotate(-Math.PI / 2 + .1); g.translate(-10, 36); }
  g.save(); g.translate(dx, -bob);
  const m1 = '#4f8f80', m2 = '#2e5a50', ru = '#7a4a36', dk = '#22262e';
  const lg = (x, ph) => { const s = a === 'walk' ? Math.sin(t * 7 + ph) * 5 : 0; uLimb(g, x, -44, x + s * .5, -22, 8, dk); uFill(g, [x + s - 7, -24, x + s + 7, -24, x + s + 9, 0, x + s - 8, 0], m2); };
  if (xbow) { uLimb(g, -8, -40, -22, -2, 5, dk); uLimb(g, 2, -40, 16, -2, 5, dk); uLimb(g, -2, -40, -2, -1, 5, dk); } else { lg(-8, 0); lg(8, 3); }
  g.save(); g.translate(0, -44); g.rotate(lean); g.translate(0, 44);
  if (!xbow) { g.save(); g.translate(-6, -80); g.rotate(-.2); uFill(g, [-4, 0, -12, 30 + Math.sin(t * 2) * 2, -2, 26, 2, 0], '#7a1e22', 1.8); g.restore(); }
  uFill(g, xbow ? [-14, -78, 12, -76, 16, -50, 10, -38, -12, -38, -18, -52] : [-16, -90, 14, -90, 20, -62, 14, -42, -14, -42, -20, -62], m1);
  uFill(g, xbow ? [-14, -78, -2, -78, -4, -38, -12, -38, -18, -52] : [-16, -90, -2, -90, -4, -42, -14, -42, -20, -62], m2, 0);
  for (let i = 0; i < 5; i++) { g.fillStyle = rgba(ru, .55); g.fillRect(-12 + i * 6, (xbow ? -70 : -82) + (i % 2) * 14, 3, 9); }
  uCirc(g, 6, xbow ? -58 : -66, 5, '#e8c070', 1.6); g.strokeStyle = U_INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(3, xbow ? -58 : -66); g.lineTo(9, xbow ? -58 : -66); g.moveTo(6, (xbow ? -58 : -66) - 3); g.lineTo(6, (xbow ? -58 : -66) + 3); g.stroke();
  // 頭盔＋彩窗面甲
  const hy = xbow ? -90 : -104;
  uFill(g, [-9, hy + 14, -11, hy, -4, hy - 9, 8, hy - 8, 13, hy + 2, 11, hy + 14], m1); uFill(g, [1, hy + 2, 12, hy + 3, 11, hy + 9, 1, hy + 8], '#bfe8ff', 1.5); g.strokeStyle = U_INK; g.lineWidth = 1; g.beginPath(); g.moveTo(5, hy + 2); g.lineTo(5, hy + 9); g.moveTo(8.5, hy + 2); g.lineTo(8.5, hy + 9); g.stroke();
  if (!xbow) uFill(g, [-4, hy - 9, -2, hy - 22, 2, hy - 9], '#e8c070', 1.6);
  if (xbow) { // 弩臂
    g.save(); g.translate(10, -66); uFill(g, [0, -5, 34, -4, 34, 4, 0, 5], dk); g.strokeStyle = U_INK; g.lineWidth = 5.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(26, -20); g.quadraticCurveTo(38, 0, 26, 20); g.stroke(); g.strokeStyle = '#8f8a94'; g.lineWidth = 2.6; g.stroke(); uFill(g, [34, -2, 48, 0, 34, 2], '#cfd8e8', 1.4); g.restore(); }
  else { // 戟
    const sh = rot2(0, 26, arm); const hx = 12 + sh[0], hy2 = -80 + sh[1]; uLimb(g, 12, -80, hx, hy2, 7.6, m2);
    g.save(); g.translate(hx, hy2); g.rotate(wA); uFill(g, [-40, -2, 46, -2, 46, 2, -40, 2], '#3a2e24', 1.8); uFill(g, [44, -3, 66, 0, 44, 3], '#cfd8e8', 1.8); uFill(g, [40, -3, 54, -18, 58, -6, 46, -2], '#aab8d0', 1.8); uFill(g, [34, 2, 30, 14, 40, 6], '#7a1e22', 1.4); g.restore(); uCirc(g, hx, hy2, 4.4, m1, 1.6); }
  g.restore(); g.restore();
}
function rigDrone(g, P, red) {
  const t = P.t || 0, a = P.a, p = P.p || 0; let bob = Math.sin(t * 2.6) * 3, tilt = Math.sin(t * 1.7) * .08, rec = 0;
  if (a === 'shoot' || a === 'atk' || a === 'cast') { rec = p > .3 && p < .5 ? -5 : 0; tilt = .2; }
  if (a === 'hit') { const k = Math.sin(Math.min(1, p) * Math.PI); tilt = -.5 * k; rec = -8 * k; }
  if (a === 'charge') tilt = Math.sin(t * 30) * .12;
  if (a === 'down') { g.translate(0, 26); g.rotate(.9); bob = 0; }
  g.save(); g.translate(rec, -bob); g.rotate(tilt);
  const br = '#b08a4a', br2 = '#6a5230', lamp = red ? '#ff5a4a' : '#ffe08a';
  g.strokeStyle = U_INK; g.lineWidth = 2; for (const x of [-9, 9]) { g.beginPath(); g.moveTo(x, -10); g.lineTo(x + Math.sin(t * 3 + x) * 2, 4); g.stroke(); }
  uFill(g, [-12, -30, 12, -30, 14, -12, 0, -6, -14, -12], br); uFill(g, [-12, -30, -2, -30, -3, -8, -14, -12], br2, 0);
  uFill(g, [-9, -44, 9, -44, 13, -30, -13, -30], br); uFill(g, [-3, -50, 3, -50, 4, -44, -4, -44], br2); g.strokeStyle = U_INK; g.lineWidth = 2; g.beginPath(); g.arc(0, -53, 3.4, 0, TAU); g.stroke();
  uCirc(g, 4, -21, 7.5, lamp, 1.8); g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(5.6, -23, 2.6, 0, TAU); g.fill(); g.strokeStyle = U_INK; g.lineWidth = 1; g.beginPath(); g.moveTo(-3.5, -21); g.lineTo(11.5, -21); g.moveTo(4, -28.5); g.lineTo(4, -13.5); g.stroke();
  if (red) { g.strokeStyle = U_INK; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-10, -42); g.lineTo(-2, -34); g.lineTo(-8, -30); g.stroke(); }
  g.restore();
}
function rigUnmoored(g, P, elder) {
  const t = P.t || 0, a = P.a, p = P.p || 0; let bob = Math.sin(t * 1.8) * 4, lean = Math.sin(t * 1.1) * .08, reach = 0, dx = 0;
  if (a === 'atk') { const k = p < .4 ? easeOut(p / .4) : 1 - ease((p - .4) / .6); reach = k; dx = k * 18; lean = .25 * k; }
  if (a === 'hit') { const k = Math.sin(Math.min(1, p) * Math.PI); lean = -.4 * k; dx = -10 * k; }
  if (a === 'charge' || a === 'cast') { lean = -.25; reach = -.4; }
  if (a === 'down') { g.translate(0, 10); g.rotate(-1.2); bob = 0; }
  g.save(); g.translate(dx, -14 - bob); g.rotate(lean);
  const sk = elder ? '#b8b4c0' : '#9aa0b4', rag = elder ? '#d8d2c4' : '#4a4a5a', rag2 = elder ? '#a8a294' : '#30303c';
  // 腳往下垂、尖端往上飄
  uLimb(g, -4, -40, -7, -18, 5, sk); uLimb(g, -7, -18, -3 + Math.sin(t * 2) * 3, -2, 4, sk); uLimb(g, 4, -40, 5, -18, 5, sk); uLimb(g, 5, -18, 10 + Math.cos(t * 2.4) * 3, -4, 4, sk);
  uFill(g, [-11, -78, 10, -78, 13, -52, 16, -30 + Math.sin(t * 2.2) * 3, 6, -36, 0, -26 + Math.cos(t * 2) * 3, -8, -36, -15, -30, -12, -52], rag); uFill(g, [-11, -78, -1, -78, -2, -36, -8, -36, -15, -30, -12, -52], rag2, 0);
  uCirc(g, 2, -64, 5, '#9fe3ff', 1.6); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(3, -65.5, 2, 0, TAU); g.fill(); g.strokeStyle = '#9fe3ff'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(2, -64); g.lineTo(-6, -72); g.moveTo(2, -64); g.lineTo(9, -56); g.moveTo(2, -64); g.lineTo(-5, -55); g.stroke();
  // 手：往上飄
  const au = -2.6 + Math.sin(t * 2.1) * .2 + reach * 2.2, h1 = rot2(0, 26, au), h2 = rot2(0, 26, -2.3 + Math.cos(t * 1.9) * .2);
  uLimb(g, -9, -74, -9 + h2[0], -74 + h2[1], 4.4, sk); uLimb(g, 9, -74, 9 + h1[0] * .6, -74 + h1[1] * .6, 4.6, sk); uLimb(g, 9 + h1[0] * .6, -74 + h1[1] * .6, 9 + h1[0] * 1.25, -74 + h1[1] * 1.1, 4, sk);
  // 頭與裂面具、往上飄的髮
  const hs = Math.sin(t * 2.4) * 2; uFill(g, [-8, -96, -14 - hs, -116, -6, -106, -2 + hs, -124, 2, -106, 10 + hs, -118, 8, -96], elder ? '#e8e2d0' : '#22222c', 2);
  uCirc(g, 1, -90, 9, sk); uFill(g, [-2, -98, 9, -96, 10, -86, 4, -81, -3, -84], '#e8e2d0', 1.6); g.strokeStyle = U_INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(2, -98); g.lineTo(5, -90); g.lineTo(2, -84); g.stroke(); g.fillStyle = U_INK; g.fillRect(5.4, -92, 3, 1.6);
  if (elder) { g.strokeStyle = U_INK; g.lineWidth = 3.4; g.beginPath(); g.moveTo(-2, -40); g.lineTo(-10, 6); g.stroke(); g.strokeStyle = '#6a6672'; g.lineWidth = 1.6; g.stroke(); }
  g.restore();
}
function rigMoss(g, P, small) {
  const t = P.t || 0, a = P.a, p = P.p || 0; let sq = 1 + Math.sin(t * 2) * .04, dx = 0;
  if (a === 'atk') { const k = p < .4 ? easeOut(p / .4) : 1 - ease((p - .4) / .6); dx = k * (small ? 18 : 8); sq = 1 + k * .12; }
  if (a === 'hit') { const k = Math.sin(Math.min(1, p) * Math.PI); sq = 1 - .18 * k; dx = -6 * k; }
  if (a === 'charge' || a === 'cast') sq = 1.12 + Math.sin(t * 16) * .03;
  if (a === 'aloft') g.rotate(Math.sin(t * 3) * .1);
  if (a === 'down') sq = .4;
  g.save(); g.translate(dx, small && a !== 'down' ? -Math.abs(Math.sin(t * 6)) * 5 : 0); g.scale(1 / Math.sqrt(sq), sq);
  const k = small ? .42 : 1, m1 = '#2a6a60', m2 = '#143a36';
  g.scale(k, k);
  uFill(g, [-34, 0, -38, -18, -26, -40, -8, -54, 14, -52, 30, -38, 38, -16, 34, 0], m1); uFill(g, [-34, 0, -38, -18, -26, -40, -8, -54, -4, -30, -12, 0], m2, 0);
  for (let i = 0; i < 9; i++) { const x = -28 + (i * 37 % 56), y = -12 - (i * 53 % 34); g.fillStyle = rgba('#3f9a86', .7); g.beginPath(); g.ellipse(x, y, 5, 3, 0, 0, TAU); g.fill(); }
  if (!small) { // 肋骨圍成的口
    uFill(g, [2, -30, 26, -32, 30, -14, 6, -10], '#0c1416', 1.8); g.strokeStyle = '#d8ccb0'; g.lineWidth = 2.6; g.lineCap = 'round'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(6 + i * 6, -31); g.quadraticCurveTo(8 + i * 6, -22, 7 + i * 6, -12); g.stroke(); }
    for (let i = 0; i < 4; i++) { const x = -22 + i * 13, h = 16 + (i % 2) * 10 + Math.sin(t * 2 + i) * 2; g.strokeStyle = U_INK; g.lineWidth = 3; g.beginPath(); g.moveTo(x, -42 + (i % 2) * 6); g.lineTo(x + Math.sin(t * 1.5 + i) * 2, -42 - h); g.stroke(); g.strokeStyle = '#7ff0d0'; g.lineWidth = 1.2; g.stroke(); uCirc(g, x + Math.sin(t * 1.5 + i) * 2, -42 - h, 3.2, '#a0ffe0', 1.4); }
  } else { uCirc(g, 8, -26, 5, '#a0ffe0', 1.6); g.fillStyle = U_INK; g.fillRect(9, -28, 2, 4); }
  g.restore();
}
function rigKeeper(g, P) { // 守錨者：與斷鏈熔在一起的巨型庭衛
  const t = P.t || 0, a = P.a, p = P.p || 0, ph2 = P.phase >= 2; let lean = Math.sin(t * .9) * .02, armA = -.4 + Math.sin(t * 1.2) * .05, dx = 0, slam = 0;
  if (a === 'atk') { if (p < .4) armA = -.4 - 1.6 * easeOut(p / .4); else if (p < .56) { armA = -2.0 + 2.9 * easeIn((p - .4) / .16); dx = 8 * (p - .4) / .16; } else { armA = .9 - 1.3 * ease((p - .56) / .44); dx = 8 * (1 - (p - .56) / .44); } }
  if (a === 'smash' || a === 'cast') { if (p < .45) { slam = -easeOut(p / .45); } else if (p < .6) slam = -1 + 2 * easeIn((p - .45) / .15); else slam = 1 - ease((p - .6) / .4); armA = -.4 - 1.9 * Math.max(0, -slam) + .9 * Math.max(0, slam); lean = -.08 * Math.max(0, -slam) + .12 * Math.max(0, slam); }
  if (a === 'charge') { armA = -2.2 + Math.sin(t * 12) * .04; lean = -.06; }
  if (a === 'hit') { const k = Math.sin(Math.min(1, p) * Math.PI); lean = -.07 * k; dx = -4 * k; }
  if (a === 'down') { lean = .5; }
  if (a === 'kneel') { lean = .22; armA = .5; }
  g.save(); g.translate(dx, 0);
  const m1 = '#4a7a70', m2 = '#28443e', dk = '#1c2026', ru = '#7a4a36', gl = '#bfe8ff';
  // 下半身：錨與鏈
  if (!ph2) { uFill(g, [-30, 0, -24, -34, 24, -34, 30, 0], dk); uFill(g, [-38, 0, -30, -14, 30, -14, 38, 0], '#3a3740'); for (let i = 0; i < 4; i++) { g.strokeStyle = U_INK; g.lineWidth = 7; g.beginPath(); g.ellipse(-44 - i * 12, -4 + (i % 2) * 3, 8, 5, 0, 0, TAU); g.stroke(); g.strokeStyle = '#6a6672'; g.lineWidth = 3.4; g.stroke(); } }
  else { uFill(g, [-22, 0, -18, -26, 18, -26, 22, 0, 8, -6, -4, 2], dk); g.strokeStyle = '#ffcf5a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-14, -8); g.lineTo(-4, -16); g.lineTo(6, -6); g.stroke(); for (let i = 0; i < 3; i++) { g.strokeStyle = U_INK; g.lineWidth = 7; g.beginPath(); g.ellipse(-30 - i * 13, -2, 8, 5, .3, 0, TAU); g.stroke(); g.strokeStyle = '#6a6672'; g.lineWidth = 3.4; g.stroke(); } }
  g.save(); g.translate(0, -30); g.rotate(lean); g.translate(0, 30);
  // 後臂
  uLimb(g, -22, -86, -34, -56, 12, m2); uLimb(g, -34, -56, -30, -30, 10, m2);
  // 軀幹
  uFill(g, [-28, -100, 26, -100, 34, -66, 24, -32, -24, -32, -34, -66], m1); uFill(g, [-28, -100, -4, -100, -6, -32, -24, -32, -34, -66], m2, 0);
  for (let i = 0; i < 8; i++) { g.fillStyle = rgba(ru, .5); g.fillRect(-24 + i * 7, -94 + (i * 29 % 50), 4, 10 + (i % 3) * 5); }
  uFill(g, [-2, -84, 16, -84, 18, -52, -4, -52], '#15131c', 2); for (let i = 0; i < 6; i++) uFill(g, [-1 + (i % 2) * 9, -83 + Math.floor(i / 2) * 10, 7 + (i % 2) * 9, -83 + Math.floor(i / 2) * 10, 7 + (i % 2) * 9, -74 + Math.floor(i / 2) * 10, -1 + (i % 2) * 9, -74 + Math.floor(i / 2) * 10], shade([gl, '#d99a2b', '#2e5aa8', gl, '#a8324a', gl][i], -.05), 1.2);
  // 肩甲
  uFill(g, [-36, -104, -14, -110, -10, -94, -34, -90], '#5a8a80'); uFill(g, [14, -110, 38, -104, 36, -90, 12, -94], '#5a8a80');
  // 頭
  uFill(g, [-10, -108, -12, -126, -4, -136, 10, -134, 15, -122, 12, -108], m1); uFill(g, [0, -126, 14, -124, 13, -116, 0, -117], gl, 1.6); uFill(g, [-4, -136, -1, -152, 3, -136], '#e8c070', 1.8);
  // 前臂＋鏈錘
  const sh = rot2(0, 40, armA), ex = 26 + sh[0], ey = -92 + sh[1]; uLimb(g, 26, -92, 26 + sh[0] * .5, -92 + sh[1] * .5, 13, m1); uLimb(g, 26 + sh[0] * .5, -92 + sh[1] * .5, ex, ey, 11, m1);
  g.save(); g.translate(ex, ey); g.rotate(armA + 1.2); for (let i = 0; i < 4; i++) { g.strokeStyle = U_INK; g.lineWidth = 6; g.beginPath(); g.ellipse(8 + i * 11, Math.sin(t * 3 + i) * 2, 6, 4, 0, 0, TAU); g.stroke(); g.strokeStyle = '#8f8a94'; g.lineWidth = 2.8; g.stroke(); } uFill(g, [48, -12, 66, -14, 76, 0, 66, 14, 48, 12, 52, 0], '#3a3740', 2.4); g.strokeStyle = '#ffcf5a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(54, -6); g.lineTo(62, 0); g.lineTo(56, 8); g.stroke(); g.restore();
  g.restore(); g.restore();
}
function rigPylon(g, P) { const t = P.t || 0; g.save(); if (P.a === 'hit') g.translate(Math.sin((P.p || 0) * 30) * 2, 0); uFill(g, [-14, 0, -10, -84, 0, -100, 10, -84, 14, 0, 0, 8], '#4a4650'); uFill(g, [-14, 0, -10, -84, 0, -100, 0, 8], '#2e2c34', 0); uFill(g, [-4, -66, 4, -66, 4, -18, -4, -18], '#bfe8ff', 1.4); g.globalAlpha = .5 + .3 * Math.sin(t * 4); g.fillStyle = '#ffffff'; g.fillRect(-2, -62, 4, 40); g.globalAlpha = 1; g.strokeStyle = U_INK; g.lineWidth = 7; g.beginPath(); g.ellipse(0, -94, 15, 8, 0, 0, TAU); g.stroke(); g.strokeStyle = '#6a6672'; g.lineWidth = 3.4; g.stroke(); for (const y of [-78, -10]) { uFill(g, [-13, y, 13, y, 13, y + 5, -13, y + 5], '#7a4a36', 1.4); } g.restore(); }

// ---------- 對外 ----------
const UNIT_H = { hound: 52, spitter: 54, crab: 70, warden: 122, arbalest: 104, drone: 58, unmoored: 126, moss: 62, spore: 30, bruiser: 104, rigger: 100, threejaw: 56, foreman: 106, elder: 130, citycrab: 110, drone07: 58, zhuo: 104, ledger: 100, keeper: 154, pylon: 104, human: 104 };
function drawRig(g, look, P) {
  switch (look) {
    case 'hound': return rigHound(g, P, false);
    case 'threejaw': return rigHound(g, P, true);
    case 'spitter': return rigSpitter(g, P);
    case 'crab': return rigCrab(g, P, false);
    case 'citycrab': return rigCrab(g, P, true);
    case 'warden': return rigWarden(g, P, false);
    case 'arbalest': return rigWarden(g, P, true);
    case 'drone': return rigDrone(g, P, false);
    case 'drone07': return rigDrone(g, P, true);
    case 'unmoored': return rigUnmoored(g, P, false);
    case 'elder': return rigUnmoored(g, P, true);
    case 'moss': return rigMoss(g, P, false);
    case 'spore': return rigMoss(g, P, true);
    case 'keeper': return rigKeeper(g, P);
    case 'pylon': return rigPylon(g, P);
    default: { const L0 = LOOKS[look] || LOOKS.vill_a; if (!L0.id) L0.id = look; return rigHuman(g, L0, P); }
  }
}
const unitH = look => UNIT_H[look] || UNIT_H.human;
let _flashCv = null;
// 在 (sx, sy) 畫一個單位。k＝鏡頭縮放；o：{ flip, scale, P, flash 0～1, tint, alpha }
function drawUnitAt(g, look, sx, sy, k, o) {
  const s = k * .82 * (o.scale || 1), P = o.P || { t: 0, a: 'idle' };
  if (o.flash > 0 || o.tint) {
    const W = 360, H = 400; if (!_flashCv) _flashCv = mkCanvas(W, H); const fg = _flashCv.getContext('2d'); fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, W, H); fg.translate(W / 2, H - 80); fg.scale(o.flip ? -1.4 : 1.4, 1.4); drawRig(fg, look, P);
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = 'source-atop'; fg.fillStyle = o.tint || '#ffffff'; fg.globalAlpha = o.tint ? (o.tintA || .45) : o.flash; fg.fillRect(0, 0, W, H); fg.globalAlpha = 1; fg.globalCompositeOperation = 'source-over';
    const d = s / 1.4; g.drawImage(_flashCv, sx - W / 2 * d, sy - (H - 80) * d, W * d, H * d); return;
  }
  g.save(); g.translate(sx, sy); g.scale(o.flip ? -s : s, s); drawRig(g, look, P); g.restore();
}
