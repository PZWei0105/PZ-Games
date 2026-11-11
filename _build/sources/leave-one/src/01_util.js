'use strict';
// ===== 小工具 =====
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ilerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
const smooth = (t) => t * t * (3 - 2 * t);
const sgn = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
const hyp = Math.hypot;
const $ = (s) => document.querySelector(s);

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 整數雜湊 → 0..1
function hashi(i, j = 0) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// 一維值雜訊 → -1..1
function vnoise(x, s = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hashi(i, s), hashi(i + 1, s), u) * 2 - 1;
}

// 存檔：localStorage，失敗時退回記憶體
const store = (() => {
  const P = 'leaveone.v1.', mem = {};
  return {
    get(k, d) {
      try { const v = localStorage.getItem(P + k); if (v != null) return JSON.parse(v); } catch (e) { /* 沒有儲存空間 */ }
      return k in mem ? mem[k] : d;
    },
    set(k, v) {
      mem[k] = v;
      try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* 沒有儲存空間 */ }
    },
  };
})();

// 顏料
const PIG = {
  char: [30, 21, 17], charS: [44, 33, 28], ochre: [160, 60, 33], ochreL: [184, 84, 44], ochreD: [116, 38, 24],
  yellow: [204, 148, 62], umber: [96, 64, 42], white: [240, 233, 216], ash: [156, 149, 140], mang: [50, 36, 40],
  water: [40, 54, 62], ice: [226, 232, 230], flameR: [186, 62, 28], flameO: [232, 128, 42], flameY: [250, 210, 110],
};
const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
