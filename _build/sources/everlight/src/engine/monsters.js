// 怪物像素圖（全部朝右，面向畫面右邊的我方）
import { Pix, ramp, hex, shift, mix, rng } from './pixel.js';
import { human } from './chars.js';

function fin(p, R, skip = []) {
  for (const k of Object.keys(R)) p.shade(+k, R[k], { soft: false });
  p.innerLines((q) => R[q], skip);
  p.outline();
  return p;
}
const W = (p, R, k, base) => { R[k] = ramp(base); return R[k][2]; };

// ---------------- 礁蟹 ----------------
function crab(pose, f, alt = false) {
  const p = new Pix(72, 52), R = {};
  const dy = pose === 'idle' && f === 1 ? 1 : 0, lx = pose === 'atk' ? 6 : pose === 'hurt' ? -4 : 0;
  const sh = W(p, R, 3, alt ? '#7a5aa0' : '#b85a3a'), leg = W(p, R, 1, alt ? '#5a4478' : '#8a3e2a'), cl = W(p, R, 5, alt ? '#8a6ab0' : '#c86a44');
  // 腳
  for (let i = 0; i < 3; i++) {
    const x = 20 + i * 9 + lx * 0.3;
    p.limb(x, 34 + dy, x - 6, 44, 3, 2, leg, 1); p.limb(x - 6, 44, x - 8, 50, 2, 1.5, leg, 1);
  }
  // 後螯
  p.limb(16 + lx * 0.3, 28 + dy, 8 + lx * 0.3, 20 + dy, 4, 3, leg, 1);
  p.ellipse(7 + lx * 0.3, 17 + dy, 5, 4, leg, 1);
  // 殼
  p.ellipse(32 + lx * 0.5, 27 + dy, 19, 12, sh, 3);
  p.poly([[16 + lx * 0.5, 30 + dy], [48 + lx * 0.5, 30 + dy], [44 + lx * 0.5, 37 + dy], [20 + lx * 0.5, 37 + dy]], sh, 3);
  // 眼柄
  W(p, R, 4, '#e6d2b0');
  p.line(44 + lx * 0.6, 17 + dy, 45 + lx * 0.6, 10 + dy, R[4][2], 1.6, 4); p.line(49 + lx * 0.6, 18 + dy, 51 + lx * 0.6, 11 + dy, R[4][2], 1.6, 4);
  // 大螯（前）
  const cx = 58 + lx, cy = 24 + dy - (pose === 'atk' ? 4 : 0);
  p.limb(46 + lx * 0.6, 30 + dy, cx - 6, cy + 4, 5, 4, cl, 5);
  p.ellipse(cx, cy, 8, 6, cl, 5);
  p.poly([[cx + 2, cy - 3], [cx + 13, cy - 8 - (pose === 'atk' ? 3 : 0)], [cx + 8, cy - 1]], cl, 5);
  p.poly([[cx + 2, cy + 3], [cx + 12, cy + 5], [cx + 6, cy + 5]], cl, 5);
  fin(p, R, [4]);
  // 眼睛、藤壺
  for (const [x, y] of [[45 + lx * 0.6, 9 + dy], [51 + lx * 0.6, 10 + dy]]) { p.set(x, y, hex('#141018')); p.set(x + 1, y, hex('#141018')); p.set(x, y - 1, hex('#f0f0f0')); }
  const r = rng(4);
  for (let i = 0; i < 9; i++) { const x = 20 + r() * 26 + lx * 0.5, y = 18 + r() * 8 + dy; p.set(x, y, hex('#efe8dc')); p.set(x + 1, y, hex('#b8b0a4')); }
  for (let i = 0; i < 4; i++) { const x = 22 + i * 6 + lx * 0.5; p.line(x, 16 + dy, x + 1, 12 + dy + (i % 2), hex('#4c8a4a'), 1); }
  return p;
}

// ---------------- 浮燈水母 ----------------
function jelly(pose, f) {
  const p = new Pix(56, 72), R = {};
  const dy = [0, -2][f % 2] + (pose === 'hurt' ? 2 : 0), sx = pose === 'atk' ? 5 : 0;
  // 觸手
  const tc = hex('#9ad6e8');
  for (let i = 0; i < 6; i++) {
    let x = 14 + i * 5.5 + sx, y = 34 + dy;
    for (let k = 0; k < 14; k++) { const nx = x + Math.sin(k * 0.8 + i + f * 1.6) * 1.2 + (pose === 'atk' ? 0.6 : 0); p.set(nx, y, k % 4 === 0 ? hex('#e8faff') : tc); y += 2.3; x = nx; }
  }
  // 傘
  const bell = W(p, R, 2, '#5aa8c8');
  p.ellipse(28 + sx, 26 + dy, 18, 15, bell, 2);
  for (let x = 0; x < 56; x++) for (let y = 34 + dy; y < 44; y++) if (p.part[y * 56 + x] === 2) p.clear(x, y);
  // 傘緣皺褶
  for (let i = 0; i < 9; i++) p.ellipse(12 + i * 4 + sx, 34 + dy, 2.4, 1.8, bell, 2);
  fin(p, R);
  // 透光的內部與燈芯
  for (let y = 0; y < 72; y++) for (let x = 0; x < 56; x++) {
    if (p.part[y * 56 + x] !== 2) continue;
    const d = Math.hypot(x - 28 - sx, (y - 26 - dy) * 1.2);
    if (d < 11 && (x + y) % 2 === 0) p.set(x, y, hex('#8fe0f0'));
  }
  p.ellipse(28 + sx, 26 + dy, 5.5, 5, hex('#ffe9a0'), 9);
  p.ellipse(28 + sx, 25 + dy, 3, 2.8, hex('#fffbe8'), 9);
  p.set(24 + sx, 16 + dy, hex('#e8fbff')); p.set(25 + sx, 15 + dy, hex('#e8fbff')); p.set(26 + sx, 15 + dy, hex('#e8fbff'));
  return p;
}

// ---------------- 潮鬼 ----------------
function wraith(pose, f) {
  const p = new Pix(64, 80), R = {};
  const dy = [0, -2][f % 2], sx = pose === 'atk' ? 6 : pose === 'hurt' ? -4 : 0;
  const cl = W(p, R, 2, '#2c5260');
  // 斗篷（下襬破爛）
  const pts = [[30 + sx, 8 + dy], [42 + sx, 14 + dy], [46 + sx, 34 + dy], [48 + sx, 58 + dy]];
  const bottom = [];
  for (let i = 0; i <= 8; i++) bottom.push([48 - i * 4 + sx + (i % 2 ? 1 : 0), 58 + dy + (i % 2 ? -5 : 4) + Math.sin(f + i) * 1.5]);
  p.poly([...pts, ...bottom, [16 + sx, 34 + dy], [20 + sx, 14 + dy]], cl, 2);
  // 兜帽
  p.ellipse(32 + sx, 20 + dy, 11, 12, cl, 3); R[3] = ramp('#24434f');
  // 手
  const hd = W(p, R, 4, '#9fb8b4');
  const ax = pose === 'atk' ? 58 : 50, ay = pose === 'atk' ? 30 : 36;
  p.limb(44 + sx, 30 + dy, ax + sx * 0.3, ay + dy, 4, 2.5, cl, 2);
  p.limb(ax + sx * 0.3, ay + dy, ax + 4 + sx * 0.3, ay + 2 + dy, 2, 1, hd, 4);
  fin(p, R, [3]);
  // 兜帽裡的黑暗與眼睛
  p.ellipse(35 + sx, 22 + dy, 6.5, 7, hex('#081218'), 5);
  const eye = pose === 'cast' ? hex('#fff6c0') : hex('#8ff0ff');
  p.set(36 + sx, 21 + dy, eye); p.set(37 + sx, 21 + dy, eye); p.set(40 + sx, 21 + dy, eye); p.set(41 + sx, 21 + dy, eye);
  p.set(36 + sx, 22 + dy, shift(eye, -1)); p.set(40 + sx, 22 + dy, shift(eye, -1));
  // 水滴
  for (let i = 0; i < 6; i++) { const x = 20 + i * 5 + sx, y = 62 + dy + ((f + i) % 3) * 3; p.set(x, y, hex('#6fd0e0')); }
  return p;
}

// ---------------- 崖鷗 ----------------
function gull(pose, f) {
  const p = new Pix(64, 52), R = {};
  const up = (f % 2 === 0) !== (pose === 'atk'), sx = pose === 'atk' ? 8 : pose === 'hurt' ? -4 : 0, dy = pose === 'atk' ? 6 : 0;
  const wing = W(p, R, 1, '#8a96a6'), body = W(p, R, 3, '#e8ecf0'), beak = W(p, R, 4, '#e8b030');
  // 後翼
  if (up) p.poly([[26 + sx, 24 + dy], [14 + sx, 4 + dy], [34 + sx, 20 + dy]], shift(hex('#8a96a6'), -1), 1);
  else p.poly([[26 + sx, 26 + dy], [12 + sx, 40 + dy], [32 + sx, 30 + dy]], shift(hex('#8a96a6'), -1), 1);
  p.ellipse(30 + sx, 28 + dy, 13, 8, body, 3);
  p.ellipse(42 + sx, 22 + dy, 7, 6.5, body, 3);
  p.poly([[17 + sx, 26 + dy], [6 + sx, 22 + dy], [8 + sx, 30 + dy], [18 + sx, 31 + dy]], wing, 1);
  // 前翼
  if (up) p.poly([[28 + sx, 26 + dy], [36 + sx, 2 + dy], [46 + sx, 8 + dy], [38 + sx, 26 + dy]], wing, 5);
  else p.poly([[28 + sx, 28 + dy], [38 + sx, 46 + dy], [46 + sx, 42 + dy], [38 + sx, 28 + dy]], wing, 5);
  R[5] = ramp('#9aa6b6');
  p.poly([[48 + sx, 22 + dy], [57 + sx, 24 + dy], [48 + sx, 26 + dy]], beak, 4);
  p.limb(28 + sx, 35 + dy, 27 + sx, 42 + dy, 1.5, 1.5, hex('#e8a040'), 6);
  fin(p, R);
  p.set(44 + sx, 20 + dy, hex('#141018')); p.set(45 + sx, 20 + dy, hex('#141018')); p.set(43 + sx, 19 + dy, hex('#3a3040'));
  p.set(53 + sx, 25 + dy, hex('#d83030'));
  for (let i = 0; i < 3; i++) p.set(40 + sx - (up ? 0 : 0) + i * 2, (up ? 6 : 42) + dy + i, hex('#2a2e38'));
  return p;
}

// ---------------- 鹽殼蝸 ----------------
function snail(pose, f) {
  const p = new Pix(72, 60), R = {};
  const sx = pose === 'atk' ? 5 : 0, dy = f % 2;
  const body = W(p, R, 1, '#7a8a74'), shell = W(p, R, 3, '#c8a0a8');
  p.poly([[8, 50], [60 + sx, 50], [64 + sx, 44 - dy], [58 + sx, 34 - dy], [50 + sx, 40], [12, 44]], body, 1);
  p.limb(56 + sx, 36 - dy, 60 + sx, 22 - dy, 2.4, 1.6, body, 1); p.limb(52 + sx, 37 - dy, 53 + sx, 24 - dy, 2.2, 1.4, body, 1);
  p.ellipse(30, 30 + dy * 0.5, 20, 18, shell, 3);
  fin(p, R);
  // 螺旋
  let a = 0, rr = 15;
  for (let i = 0; i < 60; i++) { const x = 30 + Math.cos(a) * rr, y = 30 + Math.sin(a) * rr * 0.9; p.set(x, y, hex('#8a5a6a')); a += 0.22; rr -= 0.22; }
  // 鹽結晶
  const r = rng(9);
  for (let i = 0; i < 9; i++) {
    const x = 16 + r() * 28, y = 13 + r() * 12;
    p.poly([[x, y - 4], [x + 2, y], [x, y + 2], [x - 2, y]], hex('#f4f2fa'), 8);
    p.set(x, y - 2, hex('#ffffff')); p.set(x + 1, y, hex('#c8c0dc'));
  }
  p.set(60 + sx, 21 - dy, hex('#141018')); p.set(53 + sx, 23 - dy, hex('#141018'));
  return p;
}

// ---------------- 鏽甲兵 ----------------
function rustguard(pose, f) {
  const p = new Pix(72, 88), R = {};
  const sx = pose === 'atk' ? 6 : pose === 'hurt' ? -3 : 0, dy = f % 2;
  const arm = W(p, R, 2, '#8a5a3a'), pat = W(p, R, 4, '#5a8a80'), dark = W(p, R, 1, '#4a3a34');
  // 腿
  p.limb(28, 56, 26, 82, 6, 5, dark, 1); p.limb(40, 56, 42, 82, 6, 5, dark, 1);
  p.rect(22, 80, 9, 6, arm, 2); p.rect(39, 80, 9, 6, arm, 2);
  // 戟（在身後）
  const ha = pose === 'atk' ? -0.2 : -1.25;
  const hx = 50 + sx, hy = 44 + dy;
  p.line(hx - Math.cos(ha) * 14, hy - Math.sin(ha) * 14, hx + Math.cos(ha) * 34, hy + Math.sin(ha) * 34, hex('#5a4a3a'), 2, 1);
  const tx = hx + Math.cos(ha) * 34, ty = hy + Math.sin(ha) * 34;
  p.poly([[tx, ty], [tx + Math.cos(ha + 1.4) * 9, ty + Math.sin(ha + 1.4) * 9], [tx + Math.cos(ha) * 8, ty + Math.sin(ha) * 8]], hex('#9aa0a0'), 6); R[6] = ramp('#8a9090');
  // 軀幹
  p.poly([[22 + sx * 0.3, 28 + dy], [48 + sx * 0.3, 28 + dy], [46 + sx * 0.3, 56 + dy], [24 + sx * 0.3, 56 + dy]], arm, 2);
  p.ellipse(22 + sx * 0.3, 30 + dy, 7, 6, pat, 4); p.ellipse(48 + sx * 0.3, 30 + dy, 7, 6, pat, 4);
  p.limb(48 + sx * 0.3, 32 + dy, hx, hy, 5, 4, arm, 2);
  // 頭盔
  p.ellipse(35 + sx * 0.4, 18 + dy, 10, 11, pat, 4);
  p.rect(27 + sx * 0.4, 17 + dy, 17, 3, hex('#101414'), 5); R[5] = ramp('#202828');
  fin(p, R, [5]);
  const g = pose === 'cast' ? hex('#ffe6a0') : hex('#7ff0e0');
  for (let x = 31; x < 42; x++) p.set(x + sx * 0.4, 18 + dy, x % 3 === 0 ? shift(g, -1) : g);
  const r = rng(12);
  for (let i = 0; i < 10; i++) { const x = 24 + r() * 22 + sx * 0.3, y = 32 + r() * 22 + dy; p.set(x, y, hex('#e8e2d8')); }
  return p;
}

// ---------------- 沉影 ----------------
function shade(pose, f) {
  const p = new Pix(64, 88), R = {};
  const sx = pose === 'atk' ? 7 : pose === 'hurt' ? -4 : 0, dy = f % 2 ? -1 : 0;
  const b = W(p, R, 2, '#283048');
  // 飄散長髮
  W(p, R, 1, '#1a2036');
  for (let i = 0; i < 7; i++) p.limb(30 + sx, 14 + dy, 14 + i * 2 + Math.sin(f + i) * 2, 34 + i * 3 + dy, 3, 1.5, R[1][2], 1);
  // 身形
  p.ellipse(32 + sx, 16 + dy, 8, 9, b, 2);
  p.poly([[24 + sx, 24 + dy], [40 + sx, 24 + dy], [44 + sx, 60 + dy], [38 + sx, 84], [26 + sx, 84], [20 + sx, 60 + dy]], b, 2);
  const ax = pose === 'atk' ? 60 : 50;
  p.limb(38 + sx, 28 + dy, ax + sx * 0.3, pose === 'atk' ? 30 : 42 + dy, 4, 2.4, b, 3); R[3] = ramp('#303a56');
  fin(p, R);
  // 白色空洞的眼與水痕
  p.set(34 + sx, 15 + dy, hex('#e8f2ff')); p.set(35 + sx, 15 + dy, hex('#e8f2ff')); p.set(38 + sx, 15 + dy, hex('#e8f2ff'));
  p.set(34 + sx, 16 + dy, hex('#8fa8d0')); p.set(38 + sx, 16 + dy, hex('#8fa8d0'));
  for (let i = 0; i < 8; i++) { const x = 24 + i * 2.5 + sx, y = 40 + ((i * 7 + f * 3) % 30); p.set(x, y, hex('#5a7ab0')); }
  if (pose === 'cast') for (let i = 0; i < 12; i++) p.set(28 + (i * 5) % 16 + sx, 6 + (i * 3) % 10, hex('#9fb8ff'));
  return p;
}

// ---------------- 鐵顎鰻（中頭目） ----------------
function eel(pose, f) {
  const p = new Pix(176, 128), R = {};
  const sw = Math.sin(f * Math.PI) * 2, sx = pose === 'atk' ? 14 : pose === 'hurt' ? -6 : 0, dy = pose === 'atk' ? 6 : 0;
  const body = W(p, R, 2, '#3e5a4a'), belly = W(p, R, 3, '#a8a878'), iron = W(p, R, 5, '#6a7480'), fin2 = W(p, R, 1, '#5a3a4a');
  // 身體：一串圓
  const segs = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const x = 18 + t * 110 + sx * t * t;
    const y = 120 - Math.sin(t * Math.PI * 0.9) * 74 - t * 18 + Math.sin(t * 6 + f * 2) * sw + dy * t;
    segs.push([x, y, 13 - t * 2 + (t > 0.85 ? 4 : 0)]);
  }
  // 背鰭
  for (let i = 3; i < 18; i++) { const [x, y, r] = segs[i]; p.poly([[x - 4, y - r + 2], [x + 1, y - r - 9 - (i % 2) * 3], [x + 4, y - r + 2]], fin2, 1); }
  for (const [x, y, r] of segs) p.ellipse(x, y, r, r, body, 2);
  for (const [x, y, r] of segs.slice(0, 18)) p.ellipse(x + 2, y + r * 0.45, r * 0.7, r * 0.4, belly, 3);
  // 頭與鐵顎
  const [hx, hy] = segs[20];
  const open = pose === 'atk' || pose === 'cast' ? 9 : 3;
  p.ellipse(hx + 8, hy - 2, 20, 14, body, 2);
  p.poly([[hx + 4, hy + 2], [hx + 40, hy + 4 + open], [hx + 36, hy + 12 + open], [hx + 2, hy + 12]], iron, 5);
  p.poly([[hx + 10, hy - 10], [hx + 40, hy - 2], [hx + 38, hy + 4 - open * 0.2], [hx + 8, hy + 2]], iron, 5);
  fin(p, R, []);
  // 牙
  for (let i = 0; i < 6; i++) { const x = hx + 14 + i * 4; p.poly([[x, hy + 3], [x + 2, hy + 3], [x + 1, hy + 7]], hex('#f0ece0'), 9); p.poly([[x + 1, hy + 4 + open], [x + 3, hy + 4 + open], [x + 2, hy + open]], hex('#f0ece0'), 9); }
  // 眼
  p.ellipse(hx + 6, hy - 6, 3.5, 3, hex('#ffd34a'), 9); p.rect(hx + 6, hy - 8, 1, 4, hex('#201010'), 9);
  // 斑點
  const r = rng(21);
  for (let i = 0; i < 40; i++) { const s = segs[Math.floor(r() * 19)]; const x = s[0] + (r() - 0.5) * s[2], y = s[1] - r() * s[2] * 0.6; if (p.part[Math.round(y) * 176 + Math.round(x)] === 2) p.set(x, y, hex('#5a7a62')); }
  for (let i = 0; i < 5; i++) { const s = segs[4 + i * 3]; p.set(s[0] - 2, s[1] - s[2] + 3, hex('#e8e2d0')); }
  return p;
}

// ---------------- 沉鐘守（頭目） ----------------
function warden(pose, f) {
  const p = new Pix(224, 204), R = {};
  const dy = f % 2, lean = pose === 'atk' ? 8 : pose === 'hurt' ? -7 : 0;
  const glow = pose === 'cast';
  const stone = W(p, R, 1, '#6a6a76'), iron = W(p, R, 2, '#4a4e58'), bell = W(p, R, 3, '#4a8a7a'), trim = W(p, R, 4, '#b8873e'), helm = W(p, R, 5, '#9a7038');
  const arm = W(p, R, 6, '#747482'), chain = W(p, R, 7, '#8e939e'), knob = W(p, R, 8, '#5a5248'), weed = W(p, R, 10, '#3e6a3a'), cloak = W(p, R, 11, '#2c3a52');
  const X = (x) => x + lean * 0.35, Y = (y) => y + dy;
  // 破披風（背後）
  p.poly([[X(58), Y(58)], [X(126), Y(58)], [X(146), Y(150)], [X(138), Y(176)], [X(126), Y(166)], [X(116), Y(182)], [X(100), Y(170)], [X(84), Y(186)], [X(70), Y(168)], [X(54), Y(180)], [X(40), Y(160)]], cloak, 11);
  // 石腿
  p.limb(76, 148, 70, 192, 22, 19, stone, 1); p.limb(110, 148, 116, 192, 22, 19, stone, 1);
  p.rect(56, 188, 34, 13, stone, 1); p.rect(100, 188, 34, 13, stone, 1);
  p.rect(64, 168, 16, 4, trim, 4); p.rect(106, 168, 16, 4, trim, 4);
  // 後臂（石）
  p.limb(X(60), Y(70), X(40) - lean * 0.3, Y(126), 18, 15, stone, 1);
  p.ellipse(X(38) - lean * 0.3, Y(130), 10, 9, stone, 1);
  // 鐘身
  const bw = (y) => { const t = (y - 52) / 96; return 21 + 7 * t + 33 * Math.pow(t, 2.6); };
  const bl = [], br = [];
  for (let y = 52; y <= 148; y += 6) { bl.push([X(92 - bw(y)), Y(y)]); br.unshift([X(92 + bw(y)), Y(y)]); }
  p.poly([...bl, ...br], bell, 3);
  p.ellipse(X(92), Y(55), 23, 12, bell, 3);
  // 鐘口（厚唇）與銅箍
  p.rect(X(30), Y(143), 124, 13, trim, 4);
  p.ellipse(X(30), Y(149), 5, 7, trim, 4); p.ellipse(X(154), Y(149), 5, 7, trim, 4);
  p.rect(X(92 - bw(92)), Y(90), bw(92) * 2, 5, trim, 4); p.rect(X(92 - bw(122)), Y(120), bw(122) * 2, 4, trim, 4);
  // 肩甲
  p.ellipse(X(60), Y(62), 17, 13, trim, 4); p.ellipse(X(124), Y(62), 17, 13, trim, 4);
  p.rect(X(46), Y(68), 28, 5, helm, 5); p.rect(X(110), Y(68), 28, 5, helm, 5);
  // 頭盔：小鐘形，單一視縫
  const hx = X(92) + lean * 0.4;
  p.poly([[hx - 13, Y(48)], [hx + 13, Y(48)], [hx + 15, Y(30)], [hx + 9, Y(15)], [hx - 9, Y(15)], [hx - 15, Y(30)]], helm, 5);
  p.ellipse(hx, Y(16), 10, 6, helm, 5);
  p.rect(hx - 16, Y(44), 32, 5, trim, 4);
  // 鐘鈕（頭頂兩個環）
  for (const ox of [-6, 6]) { p.ellipse(hx + ox, Y(8), 5, 6, trim, 4); }
  // 前臂與鐘錘
  const ha = pose === 'atk' ? 0.15 : pose === 'cast' ? -2.05 : pose === 'hurt' ? -0.4 : -1.05;
  const ax = X(146) + lean * 0.6, ay = Y(pose === 'cast' ? 70 : 88);
  p.limb(X(124), Y(66), ax, ay, 19, 16, arm, 6);
  p.ellipse(ax, ay, 10, 9, arm, 6);
  const L = 50, mx = ax + Math.cos(ha) * L, my = ay + Math.sin(ha) * L;
  p.line(ax - Math.cos(ha) * 8, ay - Math.sin(ha) * 8, mx, my, iron, 5, 2);
  const kx = mx + Math.cos(ha) * 12, ky = my + Math.sin(ha) * 12;
  p.ellipse(kx, ky, 14, 15, knob, 8); p.ellipse(mx, my, 8, 8, knob, 8);
  p.rect(Math.round(kx - 3), Math.round(ky - 3), 6, 6, trim, 4);
  // 鎖鏈：斜纏鐘身＋垂下的斷鏈
  for (let i = 0; i <= 11; i++) { const t = i / 11, cx = X(64) + t * 70, cy = Y(76) + t * 62; p.ellipse(cx, cy, i % 2 ? 3.6 : 2.8, i % 2 ? 2.6 : 3.6, chain, 7); }
  for (let i = 0; i < 5; i++) p.ellipse(X(46) - i * 0.6, Y(158) + i * 5, 2.2, 2.8, chain, 7);
  // 海草
  for (const [x0, len] of [[40, 22], [58, 16], [124, 18], [142, 26], [96, 12]]) p.limb(X(x0), Y(154), X(x0) - 3, Y(154) + len, 3, 1.5, weed, 10);
  fin(p, R, [9]);
  // 發光裂縫
  const cc = glow ? hex('#ffe9a0') : hex('#7ff6dc'), cc2 = shift(cc, -1.2);
  const crack = [[X(102), Y(58)], [X(95), Y(76)], [X(104), Y(92)], [X(97), Y(110)], [X(106), Y(126)], [X(99), Y(142)]];
  for (let k = 0; k < crack.length - 1; k++) {
    const [x0, y0] = crack[k], [x1, y1] = crack[k + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let s = 0; s <= n; s++) { const x = Math.round(x0 + (x1 - x0) * s / n), y = Math.round(y0 + (y1 - y0) * s / n); p.set(x, y, cc); p.set(x + 1, y, cc2); }
  }
  for (const [x, y] of [[X(78), Y(104)], [X(72), Y(112)], [X(80), Y(132)], [X(116), Y(100)], [X(122), Y(112)]]) { p.set(x, y, cc); p.set(x + 1, y + 1, cc); p.set(x + 2, y + 1, cc2); }
  if (glow) for (let y = 96; y < 144; y++) for (let x = 40; x < 146; x++) if (p.part[(y + dy) * 224 + x] === 3 && (x * 3 + y * 7) % 11 === 0) p.set(x, y + dy, hex('#ffd76a'));
  // 符文（鐘口）
  for (let i = 0; i < 9; i++) { const x = Math.round(X(40) + i * 12), y = Y(148); const c = glow ? hex('#fff2c0') : hex('#d8f8ea'); p.set(x, y, c); p.set(x + 1, y + 1, c); p.set(x + 2, y, c); }
  // 視縫
  const eye = glow ? hex('#ffffff') : pose === 'hurt' ? hex('#ff9a7a') : hex('#9ffff0');
  p.rect(Math.round(hx - 8), Y(29), 18, 3, eye); p.rect(Math.round(hx + 2), Y(28), 8, 1, shift(eye, 0.5));
  // 藤壺與銅綠
  const r = rng(33);
  for (let i = 0; i < 70; i++) { const x = 40 + r() * 104, y = 54 + r() * 92; const yy = Math.round(y + dy), xx = Math.round(x + lean * 0.35); if (p.part[yy * 224 + xx] === 3 && r() < 0.6) p.set(xx, yy, hex(r() < 0.5 ? '#7ac2a6' : '#3a6a5e')); }
  for (let i = 0; i < 26; i++) { const x = Math.round(X(36) + r() * 112), y = Y(150) + Math.round(r() * 6); if (p.alpha(x, y)) { p.set(x, y, hex('#d8d2c0')); p.set(x + 1, y, hex('#9a9484')); } }
  return p;
}

// ---------------- 鐘靈 ----------------
function bellwisp(pose, f) {
  const p = new Pix(44, 48), R = {};
  const dy = [0, -2][f % 2], sx = pose === 'atk' ? 4 : 0;
  const b = W(p, R, 2, '#b88a40');
  p.poly([[16 + sx, 10 + dy], [28 + sx, 10 + dy], [32 + sx, 30 + dy], [12 + sx, 30 + dy]], b, 2);
  p.ellipse(22 + sx, 11 + dy, 7, 4, b, 2);
  p.rect(10 + sx, 29 + dy, 24, 3, b, 2);
  fin(p, R);
  p.ellipse(22 + sx, 20 + dy, 3, 3, hex('#f8f4e8'), 5); p.set(23 + sx, 20 + dy, hex('#202030')); p.set(23 + sx, 21 + dy, hex('#202030'));
  for (let i = 0; i < 5; i++) p.set(14 + i * 4 + sx, 36 + dy + ((i + f) % 2) * 2, hex(i % 2 ? '#7ff0d8' : '#c8fff0'));
  return p;
}

// ---------------- 人類敵人（側面翻轉） ----------------
const HUMAN_SPEC = {
  soldier: { skin: '#eac8a8', hair: { color: '#5a4030', style: 'short' }, eyes: '#3a2a20', top: { color: '#e4ddcc' }, coatLen: 0.4, pants: '#5a5f70', boots: '#8a8f9a', belt: '#8a6a3a', hat: { type: 'helmet', color: '#b8bcc6', trim: '#d8a84a' }, weapon: 'spear', emblem: '#d8a030' },
  archer: { skin: '#e8c4a0', hair: { color: '#7a5a3a', style: 'short' }, eyes: '#3a2a20', top: { color: '#c9c0a8' }, coatLen: 0.3, pants: '#4a4f5c', boots: '#6a4a30', belt: '#7a5a3a', hat: { type: 'cap', color: '#a83a3a' }, weapon: 'sabre', scarf: { color: '#a83a3a' } },
  gray: { skin: '#e2c2a8', hair: { color: '#c8ccd4', style: 'short' }, eyes: '#5a6a80', top: { color: '#5a5e68' }, coat: { color: '#3a3e48' }, coatLen: 0.8, pants: '#2a2c34', boots: '#2a2228', belt: '#5a4028', weapon: 'sabre', trim: '#c9c0a8' },
};

export const MONSTER_ART = { crab, crab2: (a, b) => crab(a, b, true), jelly, wraith, gull, snail, rustguard, shade, eel, warden, bellwisp };

export function monsterFrames(kind) {
  const frames = [], index = {};
  if (HUMAN_SPEC[kind]) {
    const S = HUMAN_SPEC[kind];
    const map = { idle0: ['b_idle', 0], idle1: ['b_idle', 1], atk: ['atk2', 0], atk1: ['atk1', 0], hurt: ['hurt', 0], cast: ['cast', 0] };
    for (const [k, [pose, f]] of Object.entries(map)) { index[k] = frames.length; frames.push(human(S, 'side', pose, f)); }
    return { frames, index, human: true };
  }
  const fn = MONSTER_ART[kind];
  for (const [k, pose, f] of [['idle0', 'idle', 0], ['idle1', 'idle', 1], ['atk', 'atk', 0], ['hurt', 'hurt', 0], ['cast', 'cast', 0]]) {
    index[k] = frames.length; frames.push(fn(pose, f));
  }
  return { frames, index };
}
