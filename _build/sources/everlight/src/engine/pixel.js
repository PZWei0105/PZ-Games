// 像素繪圖工具：精確到每一格的繪製、上色、明暗、外框
// 顏色用 [r,g,b,a] 陣列；緩衝區用 Uint8ClampedArray（RGBA）

export function hex(h, a = 255) {
  if (Array.isArray(h)) return h.length === 4 ? h : [h[0], h[1], h[2], a];
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// 往陰影色偏移：色相往藍紫、亮度下降、彩度微升（像素畫常用技巧）
export function shift(c, amt) {
  const [h, s, l] = rgb2hsl(c[0], c[1], c[2]);
  let nh = h, ns = s, nl = l;
  const sat = Math.min(1, s / 0.3);
  if (amt < 0) { // 變暗：色相微微偏向藍紫
    const t = -amt;
    const dh = ((250 - h + 540) % 360) - 180;
    nh = h + dh * 0.045 * t * sat;
    nl = clamp01(l - 0.105 * t);
    ns = clamp01(s + 0.035 * t * sat);
  } else { // 變亮：偏向暖黃
    const t = amt;
    const dh = ((55 - h + 540) % 360) - 180;
    nh = h + dh * 0.04 * t * sat;
    nl = clamp01(l + 0.085 * t);
    ns = clamp01(s - 0.02 * t);
  }
  const [r, g, b] = hsl2rgb(nh, ns, nl);
  return [r, g, b, c[3] ?? 255];
}

// 從基礎色產生 5 階色帶：[外框, 陰影, 基色, 亮面, 高光]
export function ramp(base) {
  const c = hex(base);
  return [shift(c, -3.2), shift(c, -1.3), c, shift(c, 1.1), shift(c, 2.3)];
}

export function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, (a[3] ?? 255) + ((b[3] ?? 255) - (a[3] ?? 255)) * t].map(Math.round);
}

// 簡易可重現亂數
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 值雜訊（材質用）
export function makeNoise(seed) {
  const r = rng(seed);
  const P = new Float32Array(256 * 256);
  for (let i = 0; i < P.length; i++) P[i] = r();
  const at = (x, y) => P[(((y % 256) + 256) % 256) * 256 + (((x % 256) + 256) % 256)];
  const sm = (t) => t * t * (3 - 2 * t);
  function v(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }
  function fbm(x, y, oct = 3) {
    let s = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += v(x * f, y * f) * amp; n += amp; amp *= 0.5; f *= 2; }
    return s / n;
  }
  // 可平鋪：用週期取樣
  function tile(x, y, period, oct = 3) {
    let s = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) {
      const p = period * f;
      const fx = (x * f) % p, fy = (y * f) % p;
      const xi = Math.floor(fx), yi = Math.floor(fy), xf = sm(fx - xi), yf = sm(fy - yi);
      const w = (q) => ((q % p) + p) % p;
      const a = at(w(xi), w(yi)), b = at(w(xi + 1), w(yi)), c = at(w(xi), w(yi + 1)), d = at(w(xi + 1), w(yi + 1));
      s += (a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf) * amp; n += amp; amp *= 0.5; f *= 2;
    }
    return s / n;
  }
  return { v, fbm, tile, r };
}

export class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
    this.part = new Int16Array(w * h).fill(-1); // 每格屬於哪個部件（畫內線用）
  }
  i(x, y) { return (y * this.w + x) * 4; }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { if (!this.in(x, y)) return null; const i = this.i(x, y); return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]]; }
  alpha(x, y) { return this.in(x, y) ? this.d[this.i(x, y) + 3] : 0; }
  set(x, y, c, part = -2) {
    x = Math.round(x); y = Math.round(y);
    if (!this.in(x, y) || !c) return;
    const i = this.i(x, y), a = c[3] ?? 255;
    if (a >= 255) { this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255; }
    else if (a > 0) {
      const t = a / 255, ia = this.d[i + 3] / 255, oa = t + ia * (1 - t);
      for (let k = 0; k < 3; k++) this.d[i + k] = (c[k] * t + this.d[i + k] * ia * (1 - t)) / (oa || 1);
      this.d[i + 3] = oa * 255;
    }
    if (part !== -2) this.part[y * this.w + x] = part;
  }
  clear(x, y) { if (!this.in(x, y)) return; const i = this.i(x, y); this.d[i + 3] = 0; this.part[y * this.w + x] = -1; }
  rect(x, y, w, h, c, part) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c, part); }
  ellipse(cx, cy, rx, ry, c, part) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c, part);
      }
  }
  poly(pts, c, part) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c, part);
    }
  }
  line(x0, y0, x1, y1, c, th = 1, part) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      if (th <= 1) this.set(x, y, c, part);
      else this.ellipse(x, y, th / 2, th / 2, c, part);
    }
  }
  // 粗線（四邊形），手臂、腿用
  limb(x0, y0, x1, y1, w0, w1, c, part) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    this.poly([[x0 + nx * w0 / 2, y0 + ny * w0 / 2], [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2], [x0 - nx * w0 / 2, y0 - ny * w0 / 2]], c, part);
    this.ellipse(x1, y1, w1 / 2, w1 / 2, c, part);
    this.ellipse(x0, y0, w0 / 2, w0 / 2, c, part);
  }
  blit(src, ox, oy, flip = false, partOffset = 0) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const sx = flip ? src.w - 1 - x : x, i = src.i(sx, y);
      if (src.d[i + 3] === 0) continue;
      const p = src.part[y * src.w + sx];
      this.set(ox + x, oy + y, [src.d[i], src.d[i + 1], src.d[i + 2], src.d[i + 3]], p >= 0 ? p + partOffset : -2);
    }
  }
  // 以光源方向（左上）幫某個部件上明暗
  // R = ramp；mask 由部件編號決定
  shade(part, R, opt = {}) {
    const { lx = -1, ly = -1, soft = false, hi = true, deep = 2 } = opt;
    const w = this.w, h = this.h, P = this.part;
    const isP = (x, y) => x >= 0 && y >= 0 && x < w && y < h && P[y * w + x] === part;
    const out = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (P[y * w + x] !== part) continue;
      // 往陰影方向走幾格會不會出界
      let c = R[2];
      const sx = -lx, sy = -ly;
      if (!isP(x + sx, y + sy) || (deep > 1 && !isP(x + sx * 2, y + sy * 2) && !soft)) c = R[1];
      if (!isP(x + sx, y + sy) && !isP(x + sx, y)) c = R[1];
      if (hi && !isP(x + lx, y + ly) && isP(x - lx, y - ly)) c = R[3];
      if (hi && !isP(x + lx, y) && !isP(x, y + ly) && R[4]) c = R[4];
      out.push([x, y, c]);
    }
    for (const [x, y, c] of out) { const i = this.i(x, y); this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; }
  }
  // 部件邊界內線：前面的部件在和其他部件相鄰的邊上畫深一階
  innerLines(rampOf, skip) {
    const w = this.w, h = this.h, P = this.part, todo = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = P[y * w + x];
      if (p < 0 || (skip && skip.includes(p))) continue;
      const R = rampOf(p); if (!R) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = P[ny * w + nx];
        if (q >= 0 && q !== p && q < p) { todo.push([x, y, shift(R[1], -0.9)]); break; }
      }
    }
    for (const [x, y, c] of todo) { const i = this.i(x, y); this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; }
  }
  // 外框：透明格若貼著不透明格，就塗上該鄰格顏色的深色版（彩色外框）
  outline(dark = null, amt = 0.55) {
    const w = this.w, h = this.h, todo = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (this.alpha(x, y) > 0) continue;
      let src = null;
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
        if (this.alpha(x + dx, y + dy) > 128) { src = this.get(x + dx, y + dy); break; }
      }
      if (src) {
        let c = dark ? dark : [src[0] * 0.22 + 8, src[1] * 0.22 + 8, src[2] * 0.3 + 18, 255].map(Math.round);
        todo.push([x, y, c]);
      }
    }
    for (const [x, y, c] of todo) this.set(x, y, c, -1);
  }
  // 整體色調（夜晚、受擊用）
  tint(c, t) {
    for (let i = 0; i < this.d.length; i += 4) if (this.d[i + 3]) for (let k = 0; k < 3; k++) this.d[i + k] = this.d[i + k] + (c[k] - this.d[i + k]) * t;
  }
  toCanvas(scale = 1) {
    const cv = document.createElement('canvas');
    cv.width = this.w * scale; cv.height = this.h * scale;
    const cx = cv.getContext('2d');
    const id = new ImageData(new Uint8ClampedArray(this.d), this.w, this.h);
    if (scale === 1) cx.putImageData(id, 0, 0);
    else {
      const t = document.createElement('canvas'); t.width = this.w; t.height = this.h;
      t.getContext('2d').putImageData(id, 0, 0);
      cx.imageSmoothingEnabled = false; cx.drawImage(t, 0, 0, cv.width, cv.height);
    }
    return cv;
  }
  clone() { const p = new Pix(this.w, this.h); p.d.set(this.d); p.part.set(this.part); return p; }
}

// 把多張 Pix 排成一張圖集
export function sheet(frames, cols) {
  const fw = frames[0].w, fh = frames[0].h, rows = Math.ceil(frames.length / cols);
  const cv = document.createElement('canvas');
  cv.width = fw * cols; cv.height = fh * rows;
  const cx = cv.getContext('2d');
  frames.forEach((f, k) => {
    const id = new ImageData(new Uint8ClampedArray(f.d), f.w, f.h);
    cx.putImageData(id, (k % cols) * fw, Math.floor(k / cols) * fh);
  });
  return { canvas: cv, cols, rows, fw, fh };
}
