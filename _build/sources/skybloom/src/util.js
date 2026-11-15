// 小工具：亂數、顏色、畫布貼圖
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export function seeded(seed) {
  let s = seed >>> 0;
  const f = () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (a, b) => a + f() * (b - a);
  return f;
}

// HSV → 線性 RGB（陣列）
export function hsv(h, s, v) {
  h = ((h % 1) + 1) % 1;
  const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const m = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
  return m.map((c) => Math.pow(c, 2.2));
}
export const hex = (h, k = 1) => { const c = new THREE.Color(h); return [c.r * k, c.g * k, c.b * k]; };

export function canvasTex(w, h, draw, { repeat = null, srgb = true, mips = true } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = 4;
  if (!mips) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  return t;
}

// 是不是手機／平板
export function isMobile() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod|Android|Mobile/i.test(ua)) return true;
  if (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)) return true; // iPadOS
  return Math.min(screen.width, screen.height) < 600 && 'ontouchstart' in window;
}

export const store = {
  get(k, d) { try { const v = localStorage.getItem('skybloom.v1.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('skybloom.v1.' + k, JSON.stringify(v)); } catch (e) { /* 無痕或沙盒：不存 */ } },
};
