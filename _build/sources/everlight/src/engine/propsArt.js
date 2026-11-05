// 道具與植物的像素圖（樹、草叢、營火火焰、魚、寶物圖示…）
import { Pix, ramp, hex, shift, mix, rng, makeNoise } from './pixel.js';

const N = makeNoise(99);

export function treePix(kind = 'oak', seed = 1) {
  const r = rng(seed);
  if (kind === 'pine') {
    const p = new Pix(64, 112);
    const tr = ramp('#5a3e2a');
    p.rect(29, 86, 6, 22, tr[2], 1);
    const L = ramp('#2f5a3e');
    for (let k = 0; k < 5; k++) {
      const y = 12 + k * 15, w = 10 + k * 5.2;
      p.poly([[32, y - 10], [32 + w, y + 14], [32 - w, y + 14]], L[2], 2 + k);
    }
    for (let k = 0; k < 5; k++) p.shade(2 + k, L, { soft: false });
    p.shade(1, tr);
    // 雪白光點（夜裡反光）
    for (let i = 0; i < 26; i++) { const x = 14 + r() * 36, y = 8 + r() * 80; if (p.alpha(Math.round(x), Math.round(y)) && p.alpha(Math.round(x - 1), Math.round(y - 1))) p.set(x, y, L[4]); }
    p.innerLines((q) => (q >= 2 ? L : tr), [1]);
    p.outline();
    return p;
  }
  if (kind === 'dead') {
    const p = new Pix(64, 96);
    const tr = ramp('#5a4a42');
    p.limb(32, 92, 31, 40, 7, 4, tr[2], 1);
    p.limb(31, 60, 18, 36, 3.5, 1.5, tr[2], 1); p.limb(31, 52, 46, 28, 3.5, 1.5, tr[2], 1);
    p.limb(31, 42, 26, 18, 3, 1.2, tr[2], 1); p.limb(20, 40, 10, 34, 2, 1, tr[2], 1); p.limb(42, 33, 52, 30, 2, 1, tr[2], 1);
    p.shade(1, tr); p.outline();
    return p;
  }
  if (kind === 'bush') {
    const p = new Pix(48, 36);
    const L = ramp(seed % 2 ? '#3f6e34' : '#4a7a3a');
    for (let i = 0; i < 7; i++) p.ellipse(10 + r() * 28, 14 + r() * 12, 7 + r() * 5, 6 + r() * 4, L[2], 1);
    p.shade(1, L, { soft: true });
    for (let i = 0; i < 40; i++) { const x = Math.round(4 + r() * 40), y = Math.round(4 + r() * 28); if (p.alpha(x, y) && !p.alpha(x - 1, y - 2)) p.set(x, y, L[4]); }
    for (let i = 0; i < 30; i++) { const x = Math.round(4 + r() * 40), y = Math.round(8 + r() * 28); if (p.alpha(x, y) && !p.alpha(x + 1, y + 2)) p.set(x, y, L[0]); }
    if (seed % 3 === 0) for (let i = 0; i < 6; i++) { const x = Math.round(8 + r() * 32), y = Math.round(8 + r() * 18); if (p.alpha(x, y)) p.set(x, y, hex(['#f2efe0', '#e8a0b0', '#f2d36a'][i % 3])); }
    p.outline();
    return p;
  }
  // 闊葉樹
  const p = new Pix(96, 128);
  const tr = ramp('#5e422e');
  p.poly([[42, 124], [54, 124], [52, 70], [44, 70]], tr[2], 1);
  p.limb(48, 84, 30, 58, 6, 3, tr[2], 1); p.limb(48, 80, 66, 56, 6, 3, tr[2], 1);
  p.poly([[38, 124], [58, 124], [54, 118], [42, 118]], tr[2], 1);
  const L = ramp(kind === 'autumn' ? '#a8683a' : '#3f6e36');
  const blobs = [];
  for (let i = 0; i < 9; i++) blobs.push([20 + r() * 56, 18 + r() * 48, 13 + r() * 9]);
  blobs.push([48, 34, 26], [30, 52, 18], [66, 50, 18]);
  blobs.forEach(([x, y, s], i) => p.ellipse(x, y, s, s * 0.85, L[2], 2));
  // 葉叢明暗（光從左上）
  const out = [];
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (p.part[y * p.w + x] !== 2) continue;
    let best = 1e9, bl = null;
    for (const b of blobs) { const d = Math.hypot(x - b[0], (y - b[1]) / 0.85) / b[2]; if (d < best) { best = d; bl = b; } }
    const lx = (x - bl[0]) / bl[2], ly = (y - bl[1]) / bl[2];
    let v = -(lx * 0.6 + ly * 0.8) * 0.5 + 0.5 - best * 0.35 + N.v(x / 4, y / 4) * 0.25;
    const bay = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)] / 16 - 0.5;
    v += bay * 0.18;
    const c = v > 0.62 ? L[4] : v > 0.46 ? L[3] : v > 0.28 ? L[2] : v > 0.12 ? L[1] : L[0];
    out.push([x, y, c]);
  }
  for (const [x, y, c] of out) p.set(x, y, c);
  p.shade(1, tr);
  p.outline();
  return p;
}

export function tuftPix(seed = 1, color = '#4f7d38') {
  const p = new Pix(16, 16), r = rng(seed), L = ramp(color);
  for (let i = 0; i < 7; i++) {
    const x = 3 + r() * 10, h = 5 + r() * 8;
    p.line(x, 15, x + (r() - 0.5) * 4, 15 - h, i % 2 ? L[3] : L[2], 1);
  }
  if (seed % 4 === 0) { p.set(8, 4, hex('#f2efe0')); p.set(9, 5, hex('#f2d36a')); }
  return p;
}

export function flamePix(f) {
  const p = new Pix(24, 32);
  const cols = [hex('#fff6c8'), hex('#ffd36a'), hex('#f59a32'), hex('#d9542a')];
  const sway = [0, 1, 0, -1][f % 4];
  p.poly([[5, 30], [19, 30], [16 + sway, 14], [12 + sway * 2, 2 + (f % 2)], [8 + sway, 14]], cols[3], 1);
  p.poly([[7, 30], [17, 30], [15 + sway, 17], [12 + sway * 1.5, 7 + (f % 2)], [9 + sway, 17]], cols[2], 2);
  p.poly([[9, 30], [15, 30], [14, 21], [12 + sway, 13], [10, 21]], cols[1], 3);
  p.ellipse(12, 27, 3, 3, cols[0], 4);
  return p;
}

export function logsPix() {
  const p = new Pix(32, 16), L = ramp('#6a4a32');
  p.limb(4, 12, 28, 8, 4, 4, L[2], 1); p.limb(4, 8, 28, 12, 4, 4, L[2], 2);
  p.shade(1, L); p.shade(2, L); p.innerLines(() => L, []);
  const st = ramp('#6c6a6a');
  for (let i = 0; i < 6; i++) p.ellipse(3 + i * 5, 14, 2.4, 1.8, st[2], 3);
  p.shade(3, st);
  p.outline();
  return p;
}

// 各種小圖示（道具欄、地圖符號）
export function iconPix(kind) {
  const p = new Pix(16, 16);
  const C = (h) => hex(h);
  switch (kind) {
    case 'potion': p.rect(6, 2, 4, 3, C('#c9a46a'), 1); p.ellipse(8, 10, 5, 5, C('#4fb3c9'), 2); p.ellipse(7, 9, 1.5, 1.5, C('#d8f6ff'), 3); break;
    case 'bigpotion': p.rect(6, 1, 4, 3, C('#c9a46a'), 1); p.ellipse(8, 10, 6, 6, C('#3fa0e0'), 2); p.ellipse(6, 8, 2, 2, C('#d8f6ff'), 3); break;
    case 'oil': p.rect(6, 2, 4, 2, C('#7a5a3a'), 1); p.poly([[4, 6], [12, 6], [13, 14], [3, 14]], C('#e0a83a'), 2); p.rect(5, 8, 2, 4, C('#fff0b0'), 3); break;
    case 'incense': p.rect(7, 4, 2, 10, C('#a86a3a'), 1); p.set(8, 3, C('#ffd36a')); p.set(7, 1, C('#d0d0e0')); p.set(9, 0, C('#d0d0e0')); break;
    case 'fish': p.ellipse(7, 8, 5, 3, C('#7aa6c0'), 1); p.poly([[11, 8], [15, 4], [15, 12]], C('#5a86a0'), 2); p.set(4, 7, C('#1a1a2a')); break;
    case 'shard': p.poly([[8, 1], [13, 7], [9, 15], [3, 9]], C('#9fe0e8'), 1); p.line(8, 3, 6, 10, C('#e8ffff')); break;
    case 'salt': p.poly([[8, 2], [12, 8], [8, 14], [4, 8]], C('#e8e4f0'), 1); p.set(7, 5, C('#ffffff')); break;
    case 'iron': p.poly([[2, 10], [8, 6], [14, 10], [8, 14]], C('#8a8f9c'), 1); break;
    case 'bone': p.limb(3, 12, 13, 4, 2.5, 2.5, C('#e8e0c8'), 1); p.ellipse(3, 12, 2.5, 2.5, C('#e8e0c8'), 1); p.ellipse(13, 4, 2.5, 2.5, C('#e8e0c8'), 1); break;
    case 'pearl': p.ellipse(8, 8, 5, 5, C('#f0eaf6'), 1); p.ellipse(6, 6, 1.5, 1.5, C('#ffffff'), 2); break;
    case 'coin': p.ellipse(8, 8, 5, 5, C('#e0b84a'), 1); p.rect(7, 5, 2, 6, C('#a8862a'), 2); break;
    case 'key': p.ellipse(5, 6, 3, 3, C('#d9b45a'), 1); p.rect(7, 6, 7, 2, C('#d9b45a'), 1); p.rect(12, 8, 2, 3, C('#d9b45a'), 1); break;
    default: p.ellipse(8, 8, 5, 5, C('#c0c0c0'), 1);
  }
  for (let k = 1; k < 4; k++) { const R = null; }
  p.outline();
  return p;
}
