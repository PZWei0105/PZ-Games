// 程序生成的像素材質：地面、岩壁、牆面、屋瓦，全部 32×32 一格，打包成圖集
import { Pix, ramp, hex, shift, mix, makeNoise, rng } from './pixel.js';

export const TS = 32;          // 每格像素
const COLS = 16;               // 圖集一列 16 格
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

function pick(R, t) { // t 0..1 → 色帶
  const i = Math.max(0, Math.min(R.length - 1, Math.floor(t * R.length)));
  return R[i];
}

const N = makeNoise(7);

const painters = {
  grass(p, v = 0) {
    const R = [hex('#2f5228'), hex('#3d6830'), hex('#4f7d38'), hex('#62913f'), hex('#78a64a')];
    const r = rng(11 + v);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const n = N.tile(x / 8 + v * 3.1, y / 8, 4) * 0.75 + N.tile(x / 3, y / 3 + v, 8) * 0.25;
      const t = n + (bay(x, y) - 0.5) * 0.16;
      p.set(x, y, pick(R.slice(1, 4), t * 1.15 - 0.1));
    }
    for (let i = 0; i < 46; i++) { // 草葉
      const x = Math.floor(r() * TS), y = Math.floor(r() * TS);
      p.set(x, y, R[4]); p.set(x, (y + 1) % TS, R[3]); p.set(x, (y + 2) % TS, R[1]);
    }
    for (let i = 0; i < 14; i++) { const x = Math.floor(r() * TS), y = Math.floor(r() * TS); p.set(x, y, R[0]); }
    if (v === 2) for (let i = 0; i < 5; i++) {
      const x = 2 + Math.floor(r() * 28), y = 2 + Math.floor(r() * 28);
      const fc = [hex('#f2efe0'), hex('#f2d36a'), hex('#9fb8f0')][i % 3];
      p.set(x, y, fc); p.set(x + 1, y, shift(fc, -1)); p.set(x, y + 1, hex('#2f5228'));
    }
  },
  dirt(p) {
    const R = [hex('#5a4030'), hex('#6e5039'), hex('#836247'), hex('#977657'), hex('#a98a68')];
    const r = rng(23);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const t = N.tile(x / 7, y / 7 + 9, 4) + (bay(x, y) - 0.5) * 0.2;
      p.set(x, y, pick(R.slice(1, 5), t));
    }
    for (let i = 0; i < 16; i++) { const x = Math.floor(r() * 30), y = Math.floor(r() * 30); p.set(x, y, R[4]); p.set(x + 1, y, R[3]); p.set(x, y + 1, R[0]); p.set(x + 1, y + 1, R[1]); }
  },
  sand(p, wet = 0) {
    const R = wet ? [hex('#6f6250'), hex('#837560'), hex('#968770'), hex('#a99a80'), hex('#c8c4b4')] : [hex('#a08458'), hex('#bba070'), hex('#cdb383'), hex('#dcc596'), hex('#ead8ad')];
    const r = rng(31 + wet);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const n = N.tile(x / 9, y / 9 + 20, 3);
      const rip = Math.sin((y + n * 7) * (Math.PI * 2 / 8) + x * 0.12) * 0.5 + 0.5;
      const t = n * 0.6 + rip * 0.35 + (bay(x, y) - 0.5) * 0.18;
      p.set(x, y, pick(R.slice(1, 4), t));
    }
    for (let i = 0; i < 18; i++) { const x = Math.floor(r() * TS), y = Math.floor(r() * TS); p.set(x, y, wet ? R[4] : (i % 3 ? R[4] : R[0])); }
  },
  cobble(p, v = 0) {
    const r = rng(41 + v), pts = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) pts.push([i * 6.4 + 1 + r() * 4.4, j * 6.4 + 1 + r() * 4.4, r()]);
    const base = v ? '#7c7a72' : '#86817a';
    const R = ramp(base);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      let d1 = 1e9, d2 = 1e9, k = 0;
      for (const [px, py, s] of pts) for (const ox of [-TS, 0, TS]) for (const oy of [-TS, 0, TS]) {
        const d = Math.hypot(x - px - ox, y - py - oy);
        if (d < d1) { d2 = d1; d1 = d; k = s; } else if (d < d2) d2 = d;
      }
      const edge = d2 - d1;
      let c = mix(R[2], k > 0.5 ? R[3] : R[1], 0.35 + k * 0.2);
      if (edge < 1.1) c = R[0];
      else if (edge < 1.9) c = mix(R[1], R[0], 0.45);
      else if (N.tile(x / 3, y / 3, 6) > 0.62) c = shift(c, 0.5);
      p.set(x, y, c);
    }
  },
  slab(p, v = 0) {
    const R = ramp(v === 2 ? '#6f7a72' : '#7d817c');
    const r = rng(53 + v);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const t = N.tile(x / 10 + v, y / 10, 3) + (bay(x, y) - 0.5) * 0.15;
      let c = pick(R.slice(1, 4), t);
      if (x % 16 === 0 || y % 16 === 0) c = R[0];
      else if (x % 16 === 1 || y % 16 === 1) c = R[3];
      p.set(x, y, c);
    }
    // 裂縫
    for (let k = 0; k < 2; k++) { let x = r() * 32, y = r() * 32; for (let i = 0; i < 9; i++) { p.set(x, y, R[0]); x += r() * 2 - 0.6; y += r() * 2 - 0.6; } }
    if (v >= 1) for (let i = 0; i < 40; i++) { // 青苔
      const x = Math.floor(r() * 32), y = Math.floor(r() * 32);
      if (x % 16 < 3 || y % 16 < 3) p.set(x, y, [hex('#4c6e3a'), hex('#5f8444')][i % 2]);
    }
  },
  planks(p, v = 0) {
    const R = ramp(v ? '#6e5136' : '#86603c');
    const r = rng(61 + v);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const row = Math.floor(y / 8), off = (row * 13) % 32;
      const g = N.tile((x + off) / 12, y / 2.5 + row * 7, 2);
      let c = pick([R[1], R[2], R[2], R[3]], g + (row % 2 ? 0.1 : -0.05));
      if (y % 8 === 7) c = R[0];
      if (y % 8 === 0) c = shift(c, 0.6);
      if ((x + off) % 32 === 0) c = R[0];
      p.set(x, y, c);
    }
    for (let row = 0; row < 4; row++) { const x = (row * 13 + 3) % 32; p.set(x, row * 8 + 3, hex('#3a3434')); p.set(x, row * 8 + 4, hex('#3a3434')); }
  },
  cliff(p, top = 0) {
    const R = ramp('#7b7064');
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const strata = Math.sin(y * 0.9 + N.tile(x / 6, y / 12, 2) * 5) * 0.5 + 0.5;
      const n = N.tile(x / 5, y / 5 + 40, 4);
      let t = n * 0.65 + strata * 0.35 + (bay(x, y) - 0.5) * 0.2;
      let c = pick(R.slice(0, 4), t);
      if (N.tile(x / 4 + 3, y / 9, 3) > 0.7) c = R[0];
      p.set(x, y, c);
    }
    if (top) {
      const G = [hex('#2f5228'), hex('#3d6830'), hex('#4f7d38'), hex('#62913f')];
      for (let x = 0; x < TS; x++) {
        const d = 4 + Math.floor(N.tile(x / 3, 3, 2) * 6) + (x % 5 === 0 ? 3 : 0);
        for (let y = 0; y < d; y++) p.set(x, y, y === d - 1 ? G[0] : G[1 + ((x + y) % 3 === 0 ? 1 : 0) + (y < 2 ? 1 : 0)]);
      }
    }
  },
  darkrock(p) {
    const R = ramp('#565964');
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const t = N.tile(x / 6, y / 6 + 70, 4) + (bay(x, y) - 0.5) * 0.25;
      p.set(x, y, pick(R.slice(0, 4), t));
    }
  },
  brick(p) {
    const B = [hex('#8e4e3e'), hex('#a05a44'), hex('#b0684e'), hex('#934f40')], M = hex('#5e504a');
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const row = Math.floor(y / 4), off = row % 2 ? 4 : 0;
      const bx = Math.floor((x + off) / 8);
      let c = B[(bx * 7 + row * 3) % 4];
      if (y % 4 === 3 || (x + off) % 8 === 7) c = M;
      else if (y % 4 === 0) c = shift(c, 0.6);
      if (N.tile(x / 3, y / 3 + 90, 2) > 0.72) c = shift(c, -0.6);
      p.set(x, y, c);
    }
  },
  plaster(p, v = 0) {
    const R = ramp(v === 1 ? '#c9d1cf' : v === 2 ? '#d9c3a3' : '#ddd3bc');
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const t = N.tile(x / 8, y / 8 + 110 + v, 3) * 0.8 + (bay(x, y) - 0.5) * 0.2;
      p.set(x, y, pick(R.slice(1, 4), t + 0.05));
    }
  },
  ruinwall(p, v = 0) {
    const R = ramp(v ? '#5f6a66' : '#6f736e');
    const r = rng(77 + v);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const row = Math.floor(y / 10), off = row % 2 ? 8 : 0;
      const t = N.tile(x / 7, y / 7 + 130 + v, 3) + (bay(x, y) - 0.5) * 0.2;
      let c = pick(R.slice(1, 4), t);
      if (y % 10 === 9 || (x + off) % 16 === 15) c = R[0];
      if (y % 10 === 0) c = shift(c, 0.5);
      p.set(x, y, c);
    }
    for (let i = 0; i < 12; i++) { const x = Math.floor(r() * 32), y = 20 + Math.floor(r() * 12); p.set(x, y, hex('#e0e6e0')); p.set(x + 1, y, hex('#b9c2be')); }
    for (let x = 0; x < TS; x++) { const d = 2 + Math.floor(N.tile(x / 3, 5, 2) * 6); for (let y = TS - d; y < TS; y++) p.set(x, y, [hex('#3d5a3a'), hex('#4c6e42')][(x + y) % 2]); }
  },
  roof(p, v = 0) {
    const base = ['#a8463a', '#4b5a74', '#3d7670', '#6b4a3a'][v];
    const R = ramp(base);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const row = Math.floor(y / 8), off = row % 2 ? 4 : 0;
      const lx = (x + off) % 8, ly = y % 8;
      // 每片瓦下緣是圓弧
      const cx = lx - 3.5, edge = 6.2 + Math.sqrt(Math.max(0, 16 - cx * cx)) * 0.45;
      let c = R[2];
      if (ly > edge) c = R[0];
      else if (ly > edge - 1.2) c = R[1];
      else if (ly < 1.5) c = shift(R[2], -0.5);
      else if (lx === 0 || lx === 7) c = R[1];
      else if (lx < 3 && ly < 4) c = R[3];
      if (N.tile(x / 4, y / 4 + 150 + v, 2) > 0.76) c = shift(c, -0.5);
      p.set(x, y, c);
    }
  },
  tower(p, band = 0) {
    const R = ramp(band ? '#b4443c' : '#e6e0d2');
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const t = N.tile(x / 6, y / 6 + 170 + band, 3) + (bay(x, y) - 0.5) * 0.15;
      let c = pick(R.slice(1, 4), t + 0.08);
      if (y % 8 === 7) c = R[1];
      if ((x + (Math.floor(y / 8) % 2) * 8) % 16 === 0) c = R[1];
      p.set(x, y, c);
    }
  },
  wood(p) { // 小屋木牆（直板）
    const R = ramp('#7a5a3c');
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const col = Math.floor(x / 6);
      const g = N.tile(x / 2 + col * 5, y / 10 + 190, 2);
      let c = pick([R[1], R[2], R[2], R[3]], g);
      if (x % 6 === 5) c = R[0];
      if (x % 6 === 0) c = shift(c, 0.5);
      p.set(x, y, c);
    }
  },
  kelp(p) {
    const R = ramp('#4a5a40');
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const t = N.tile(x / 5, y / 5 + 210, 4) + (bay(x, y) - 0.5) * 0.25;
      p.set(x, y, pick([R[0], R[1], R[2], R[3], hex('#6b5a3a')], t));
    }
  },
  rug(p) { // 室內地毯
    const R = ramp('#7a2f36');
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      let c = R[2];
      if ((x + y) % 8 === 0 || (x - y + 64) % 8 === 0) c = R[3];
      if (x < 2 || y < 2 || x > 29 || y > 29) c = hex('#c99a4a');
      p.set(x, y, c);
    }
  },
};

// 圖集內容（名稱 → 繪製方式）
const TILES = [
  ['grass', (p) => painters.grass(p, 0)], ['grass2', (p) => painters.grass(p, 1)], ['flowers', (p) => painters.grass(p, 2)],
  ['dirt', painters.dirt], ['sand', (p) => painters.sand(p, 0)], ['wetsand', (p) => painters.sand(p, 1)],
  ['cobble', (p) => painters.cobble(p, 0)], ['cobble2', (p) => painters.cobble(p, 1)],
  ['slab', (p) => painters.slab(p, 0)], ['slabmoss', (p) => painters.slab(p, 1)], ['slabdark', (p) => painters.slab(p, 2)],
  ['planks', (p) => painters.planks(p, 0)], ['planks2', (p) => painters.planks(p, 1)],
  ['cliff', (p) => painters.cliff(p, 0)], ['clifftop', (p) => painters.cliff(p, 1)], ['darkrock', painters.darkrock],
  ['brick', painters.brick], ['plaster', (p) => painters.plaster(p, 0)], ['plaster2', (p) => painters.plaster(p, 1)], ['plaster3', (p) => painters.plaster(p, 2)],
  ['ruinwall', (p) => painters.ruinwall(p, 0)], ['ruinwall2', (p) => painters.ruinwall(p, 1)],
  ['roofred', (p) => painters.roof(p, 0)], ['roofslate', (p) => painters.roof(p, 1)], ['roofteal', (p) => painters.roof(p, 2)], ['roofbrown', (p) => painters.roof(p, 3)],
  ['tower', (p) => painters.tower(p, 0)], ['towerband', (p) => painters.tower(p, 1)], ['woodwall', painters.wood], ['kelp', painters.kelp], ['rug', painters.rug],
];

export function buildAtlas() {
  const size = TS * COLS;
  const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
  const cx = cv.getContext('2d');
  const uv = {};
  TILES.forEach(([name, fn], i) => {
    const p = new Pix(TS, TS); fn(p);
    const x = (i % COLS) * TS, y = Math.floor(i / COLS) * TS;
    cx.putImageData(new ImageData(new Uint8ClampedArray(p.d), TS, TS), x, y);
    // UV（v 從下往上），內縮半格避免取樣到鄰格
    const e = 0.5 / size;
    uv[name] = { u0: x / size + e, u1: (x + TS) / size - e, v0: 1 - (y + TS) / size + e, v1: 1 - y / size - e, i };
  });
  return { canvas: cv, uv };
}

// 單張可平鋪材質（牆面、立面用）
export function tileCanvas(name, wTiles = 1, hTiles = 1) {
  const fn = TILES.find((t) => t[0] === name)[1];
  const p = new Pix(TS, TS); fn(p);
  const cv = document.createElement('canvas'); cv.width = TS * wTiles; cv.height = TS * hTiles;
  const cx = cv.getContext('2d');
  const id = new ImageData(new Uint8ClampedArray(p.d), TS, TS);
  for (let y = 0; y < hTiles; y++) for (let x = 0; x < wTiles; x++) cx.putImageData(id, x * TS, y * TS);
  return cv;
}

// 建築立面：牆面材質＋窗＋門；同時輸出夜晚發光用的貼圖
export function facade({ wall = 'plaster', w = 4, h = 3, windows = [], door = null, timber = false, seed = 1, sign = null, lit = 1 }) {
  const cv = tileCanvas(wall, w, h);
  const cx = cv.getContext('2d');
  const em = document.createElement('canvas'); em.width = cv.width; em.height = cv.height;
  const ex = em.getContext('2d');
  ex.fillStyle = '#000'; ex.fillRect(0, 0, em.width, em.height);
  const r = rng(seed);
  const W = cv.width, H = cv.height;
  if (timber) { // 木骨架
    cx.fillStyle = '#4a3324';
    cx.fillRect(0, 0, W, 3); cx.fillRect(0, H - 4, W, 4); cx.fillRect(0, 0, 3, H); cx.fillRect(W - 3, 0, 3, H);
    cx.fillRect(0, Math.floor(H * 0.48), W, 3);
    for (let x = TS * 2; x < W - 4; x += TS * 2) cx.fillRect(x - 1, 0, 3, H);
    cx.fillStyle = '#5e4330';
    cx.fillRect(0, 3, W, 1); cx.fillRect(0, Math.floor(H * 0.48) + 3, W, 1);
  }
  const px = (x, y, c) => { cx.fillStyle = c; cx.fillRect(x, y, 1, 1); };
  for (const win of windows) {
    const ww = win.w || 12, wh = win.h || 14;
    const x = Math.round(win.x * TS - ww / 2), y = Math.round(win.y * TS - wh / 2);
    cx.fillStyle = '#3b2a20'; cx.fillRect(x - 2, y - 2, ww + 4, wh + 4); // 窗框
    cx.fillStyle = '#5c4230'; cx.fillRect(x - 2, y - 2, ww + 4, 1);
    const on = win.lit ?? (r() < lit);
    const g1 = on ? '#ffd27a' : '#2a3448', g2 = on ? '#f2a64a' : '#1e2638';
    cx.fillStyle = g2; cx.fillRect(x, y, ww, wh);
    cx.fillStyle = g1; cx.fillRect(x, y, ww, Math.floor(wh * 0.55));
    cx.fillStyle = '#3b2a20'; cx.fillRect(x + Math.floor(ww / 2) - 1, y, 2, wh); cx.fillRect(x, y + Math.floor(wh / 2) - 1, ww, 2);
    cx.fillStyle = '#6e4f36'; cx.fillRect(x - 3, y + wh + 2, ww + 6, 2); // 窗台
    if (win.flower) { for (let i = 0; i < ww + 4; i += 2) px(x - 2 + i, y + wh + 1, ['#d9584a', '#f2d36a', '#e8e0f0'][i % 3]); }
    if (on) { ex.fillStyle = '#ffb44a'; ex.fillRect(x, y, ww, wh); ex.fillStyle = '#ffe2a0'; ex.fillRect(x + 1, y + 1, ww - 2, Math.floor(wh * 0.5)); }
  }
  if (door) {
    const dw = door.w || 16, dh = door.h || 26;
    const x = Math.round(door.x * TS - dw / 2), y = H - dh;
    cx.fillStyle = '#2e2018'; cx.fillRect(x - 2, y - 3, dw + 4, dh + 3);
    cx.fillStyle = door.color || '#6a4630'; cx.fillRect(x, y, dw, dh);
    cx.fillStyle = '#563826'; for (let i = 3; i < dw; i += 4) cx.fillRect(x + i, y, 1, dh);
    cx.fillStyle = '#d9b45a'; cx.fillRect(x + dw - 4, y + Math.floor(dh / 2), 2, 2);
    if (door.arch) { cx.fillStyle = '#2e2018'; cx.fillRect(x - 2, y - 5, dw + 4, 3); }
    if (door.lit) { ex.fillStyle = '#7a4a20'; ex.fillRect(x, y, dw, dh); }
  }
  if (sign) {
    const x = Math.round(sign.x * TS - 14), y = Math.round(sign.y * TS);
    cx.fillStyle = '#3a2618'; cx.fillRect(x - 1, y - 1, 30, 12);
    cx.fillStyle = sign.color || '#9a6a3a'; cx.fillRect(x, y, 28, 10);
    cx.fillStyle = '#f2e2b0';
    if (sign.icon === 'mug') { cx.fillRect(x + 10, y + 2, 6, 6); cx.fillRect(x + 16, y + 3, 2, 3); }
    else if (sign.icon === 'sword') { cx.fillRect(x + 6, y + 4, 16, 2); cx.fillRect(x + 8, y + 2, 2, 6); }
    else if (sign.icon === 'fish') { cx.fillRect(x + 8, y + 3, 10, 4); cx.fillRect(x + 18, y + 2, 3, 6); }
    else if (sign.icon === 'bottle') { cx.fillRect(x + 12, y + 2, 4, 2); cx.fillRect(x + 10, y + 4, 8, 5); }
    else { cx.fillRect(x + 6, y + 4, 16, 2); }
  }
  // 牆角髒污
  const g = cx.createLinearGradient(0, H - 10, 0, H);
  g.addColorStop(0, 'rgba(40,30,30,0)'); g.addColorStop(1, 'rgba(40,30,30,0.35)');
  cx.fillStyle = g; cx.fillRect(0, H - 10, W, 10);
  return { map: cv, emissive: em };
}
