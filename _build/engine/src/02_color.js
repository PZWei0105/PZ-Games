/* ==========================================================================
   02 顏色
   畫圖時顏色可以寫 CSS 字串（'#ff8800'、'rgba(…)'、'hsl(…)'），
   或用 PZ.rgb()/PZ.hsl()/PZ.color() 先轉好的「打包數字」（熱迴圈裡比較快）。
   打包格式是 0xAABBGGRR（直接寫進 WebGL 頂點，小端序）。
   注意：直接寫 0xff8800 這種數字會被當成打包值（會變成透明），請用字串。
   ========================================================================== */
const WHITE = 0xffffffff;
const _colorCache = new Map();
const pack = (r, g, b, a) => (((clamp(Math.round(a * 255), 0, 255) << 24) | (clamp(Math.round(b), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(r), 0, 255)) >>> 0);
const cR = (c) => c & 255, cG = (c) => (c >>> 8) & 255, cB = (c) => (c >>> 16) & 255, cA = (c) => ((c >>> 24) & 255) / 255;

const NAMED = { white: '#fff', black: '#000', red: '#f33', green: '#3d5', blue: '#38f', yellow: '#fd3', orange: '#f93', cyan: '#3ef', magenta: '#f3e', gray: '#888', grey: '#888', transparent: 'rgba(0,0,0,0)', gold: '#ffd24a', purple: '#a5f', pink: '#f8b' };

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

function parseColor(s) {
  s = String(s).trim().toLowerCase();
  if (NAMED[s]) s = NAMED[s];
  if (s[0] === '#') {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    if (h.length === 6) return pack((n >> 16) & 255, (n >> 8) & 255, n & 255, 1);
    if (h.length === 8) return pack((n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, (n & 255) / 255);
  }
  let m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return pack(p[0], p[1], p[2], p.length > 3 ? p[3] : 1); }
  m = s.match(/^hsla?\(([^)]+)\)$/);
  if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); const [r, g, b] = hslToRgb(p[0], p[1] / 100, p[2] / 100); return pack(r, g, b, p.length > 3 ? p[3] : 1); }
  warnOnce('color:' + s, '看不懂的顏色：' + s);
  return WHITE;
}

/** 任何顏色寫法 → 打包數字 */
function toColor(c) {
  if (typeof c === 'number') return c >>> 0;
  if (c == null) return WHITE;
  if (typeof c === 'string') { let v = _colorCache.get(c); if (v === undefined) { v = parseColor(c); if (_colorCache.size > 4096) _colorCache.clear(); _colorCache.set(c, v); } return v; }
  if (Array.isArray(c)) return pack(c[0], c[1], c[2], c.length > 3 ? c[3] : 1);
  return WHITE;
}

const Color = PZ.color = function color(c) { return toColor(c); };
Object.assign(Color, {
  WHITE, BLACK: 0xff000000, CLEAR: 0,
  rgb: (r, g, b, a = 1) => pack(r, g, b, a),
  hsl: (h, s, l, a = 1) => { const [r, g, b] = hslToRgb(h, s, l); return pack(r, g, b, a); },
  r: (c) => cR(toColor(c)), g: (c) => cG(toColor(c)), b: (c) => cB(toColor(c)), a: (c) => cA(toColor(c)),
  /** 換透明度（a 是 0～1） */
  alpha: (c, a) => { c = toColor(c); return pack(cR(c), cG(c), cB(c), a); },
  /** 兩色混合 */
  mix: (a, b, t) => { a = toColor(a); b = toColor(b); return pack(lerp(cR(a), cR(b), t), lerp(cG(a), cG(b), t), lerp(cB(a), cB(b), t), lerp(cA(a), cA(b), t)); },
  lighten: (c, t) => Color.mix(c, Color.alpha(WHITE, cA(toColor(c))), t),
  darken: (c, t) => Color.mix(c, pack(0, 0, 0, cA(toColor(c))), t),
  /** 打包數字 → CSS 字串（給 DOM、Canvas2D 用） */
  css: (c) => { c = toColor(c); const a = cA(c); return a >= 1 ? '#' + ((1 << 24) | (cR(c) << 16) | (cG(c) << 8) | cB(c)).toString(16).slice(1) : `rgba(${cR(c)},${cG(c)},${cB(c)},${+a.toFixed(3)})`; },
  /** 漸層取樣表：粒子顏色隨生命週期變化用；回傳 n 格的 Uint32Array */
  ramp: (stops, n = 32) => {
    const cs = stops.map(toColor), out = new Uint32Array(n);
    if (cs.length === 1) { out.fill(cs[0]); return out; }
    for (let i = 0; i < n; i++) { const t = (i / (n - 1)) * (cs.length - 1), k = Math.min(cs.length - 2, Math.floor(t)); out[i] = Color.mix(cs[k], cs[k + 1], t - k); }
    return out;
  },
  /** 亮度 0～1（感知亮度） */
  luma: (c) => { c = toColor(c); return (0.2126 * cR(c) + 0.7152 * cG(c) + 0.0722 * cB(c)) / 255; },
});
PZ.rgb = Color.rgb;
PZ.hsl = Color.hsl;
