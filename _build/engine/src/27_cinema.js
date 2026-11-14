/* ==========================================================================
   27 電影感：調色（LUT）、黑邊
     PZ.post.grade('cinema')                  套用調色（預設 0.8 秒淡過去）
       'cinema' 青橘電影  'warm' 暖  'cold' 冷  'noir' 黑白  'sepia' 舊照片  'horror' 恐怖  'dream' 夢境
       'night' 夜晚  'sunset' 夕陽  'neon' 霓虹  'toxic' 毒氣  'vivid' 鮮豔  'bleach' 漂白  'retro' 復古
     PZ.post.grade('noir', { time: 1.5, amount: 0.8 })                 1.5 秒換過去、強度八成
     PZ.post.grade({ temp: 0.4, sat: 1.2, contrast: 0.2, lift: [0, 0, 0.05] })   自己調（欄位見下面 gradeColor）
     PZ.post.grade(null)                      回到原色
     PZ.post.grades                           全部預設的名字＋中文
     PZ.fx.letterbox(0.12)                    電影黑邊：上下各佔畫面高度 12%（預設 0.6 秒滑進來）；PZ.fx.letterbox(0) 收起來
   調色只在有後製的時候有效（Canvas2D 後備模式、最低畫質沒有）；黑邊一直都有。
   ========================================================================== */
const GRADES = {
  cinema: { name: '電影', temp: 0.04, contrast: 0.18, sat: 1.04, lift: [0, 0.008, 0.02], split: { shadow: '#0f6f7d', highlight: '#ffad6a', amount: 0.34 } },
  warm: { name: '暖', temp: 0.42, sat: 1.07, contrast: 0.08, gain: [1.04, 1, 0.95] },
  cold: { name: '冷', temp: -0.45, sat: 0.9, contrast: 0.12, lift: [0, 0.01, 0.04] },
  noir: { name: '黑白', mono: 1, contrast: 0.5, gamma: 0.94, fade: 0.015 },
  sepia: { name: '舊照片', mono: 1, monoColor: '#d1a877', fade: 0.09, contrast: -0.04 },
  horror: { name: '恐怖', sat: 0.42, temp: -0.12, tint: 0.28, contrast: 0.32, gamma: 0.9, split: { shadow: '#1f3b29', highlight: '#cfdcb4', amount: 0.26 } },
  dream: { name: '夢境', fade: 0.08, sat: 1.12, contrast: -0.12, gain: [1.03, 1, 1.04], split: { shadow: '#6b4ea0', highlight: '#ffd8ea', amount: 0.32 } },
  night: { name: '夜晚', temp: -0.6, sat: 0.66, exposure: -0.4, contrast: 0.12, lift: [0, 0.01, 0.05] },
  sunset: { name: '夕陽', temp: 0.55, tint: -0.16, sat: 1.15, contrast: 0.1, split: { shadow: '#5b2b6c', highlight: '#ffb45c', amount: 0.36 } },
  neon: { name: '霓虹', sat: 1.32, vibrance: 0.4, contrast: 0.2, split: { shadow: '#3c1b8c', highlight: '#2fe6ff', amount: 0.3 } },
  toxic: { name: '毒氣', sat: 0.9, tint: 0.5, contrast: 0.16, split: { shadow: '#1e3d10', highlight: '#c8ff6a', amount: 0.42 } },
  vivid: { name: '鮮豔', sat: 1.28, vibrance: 0.3, contrast: 0.12 },
  bleach: { name: '漂白', sat: 0.45, contrast: 0.42, gain: [1.02, 1.02, 1.02], fade: 0.02 },
  retro: { name: '復古', fade: 0.12, sat: 0.84, temp: 0.2, contrast: -0.08, split: { shadow: '#2a4b5c', highlight: '#f2d18f', amount: 0.26 } },
};
const vec3of = (v, d) => (v == null ? [d, d, d] : typeof v === 'number' ? [v, v, v] : v);
const rgb01 = (c) => { c = toColor(c); return [cR(c) / 255, cG(c) / 255, cB(c) / 255]; };
/**
 * 一個顏色經過調色。P 的欄位（都可以不給）：
 *   exposure（曝光，格數，-1 暗一半）  temp（-1 冷～1 暖）  tint（-1 洋紅～1 綠）
 *   contrast（-0.5～1，S 曲線）  lift / gamma / gain（暗部／中間調／亮部，數字或 [r,g,b]）
 *   sat（飽和度，1＝原樣）  vibrance（只拉不飽和的顏色）  split: { shadow, highlight, amount, balance }（暗部、亮部各染一種顏色）
 *   fade（黑色抬起來的霧面感）  mono（0～1 變黑白）, monoColor（黑白帶的顏色，例如舊照片的褐色）
 */
function gradeColor(r, g, b, P, sh, hi, mono) {
  if (P.exposure) { const e = Math.pow(2, P.exposure); r *= e; g *= e; b *= e; }
  if (P.temp) { r *= 1 + P.temp * 0.11; g *= 1 + P.temp * 0.015; b *= 1 - P.temp * 0.12; }
  if (P.tint) { g *= 1 + P.tint * 0.09; r *= 1 - P.tint * 0.03; b *= 1 - P.tint * 0.03; }
  const lift = vec3of(P.lift, 0), gam = vec3of(P.gamma, 1), gain = vec3of(P.gain, 1), out = [r, g, b];
  for (let i = 0; i < 3; i++) {
    let x = Math.max(0, out[i]);
    if (P.contrast) { const k = 1 + P.contrast; x = Math.min(1, x); x = x < 0.5 ? 0.5 * Math.pow(2 * x, k) : 1 - 0.5 * Math.pow(2 - 2 * x, k); }
    x = gain[i] * (x + lift[i] * (1 - x));
    x = Math.pow(Math.max(0, x), 1 / Math.max(0.05, gam[i]));
    out[i] = x;
  }
  [r, g, b] = out;
  let l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const sat = P.sat != null ? P.sat : 1;
  if (sat !== 1) { r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat; }
  if (P.vibrance) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), k = 1 + P.vibrance * (1 - clamp01((mx - mn) * 2)); r = l + (r - l) * k; g = l + (g - l) * k; b = l + (b - l) * k; }
  if (sh) {
    l = clamp01(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const bal = P.split.balance || 0, amt = P.split.amount != null ? P.split.amount : 0.3;
    const ws = (1 - smoothstep(0, 0.55 + bal * 0.3, l)) * amt, wh = smoothstep(0.45 + bal * 0.3, 1, l) * amt;
    r += (sh[0] - sh[3]) * ws + (hi[0] - hi[3]) * wh; g += (sh[1] - sh[3]) * ws + (hi[1] - hi[3]) * wh; b += (sh[2] - sh[3]) * ws + (hi[2] - hi[3]) * wh;
  }
  if (mono) { l = 0.2126 * r + 0.7152 * g + 0.0722 * b; const k = P.mono; r = lerp(r, l * mono[0], k); g = lerp(g, l * mono[1], k); b = lerp(b, l * mono[2], k); }
  if (P.fade) { const f = P.fade; r = f + r * (1 - f); g = f + g * (1 - f); b = f + b * (1 - f); }
  return [r, g, b];
}
/** 做一張 16³ 調色表（256×16 RGBA） */
function makeLut(P) {
  P = P || {};
  const d = new Uint8Array(256 * 16 * 4), withL = (c) => { const v = rgb01(c); v.push(0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]); return v; };
  const sh = P.split ? withL(P.split.shadow || '#000') : null, hi = P.split ? withL(P.split.highlight || '#fff') : null;
  let mono = null; if (P.mono) { mono = rgb01(P.monoColor || '#fff'); const l = 0.2126 * mono[0] + 0.7152 * mono[1] + 0.0722 * mono[2] || 1; mono = mono.map((v) => v / l); }
  for (let bi = 0; bi < 16; bi++) for (let gi = 0; gi < 16; gi++) for (let ri = 0; ri < 16; ri++) {
    const c = gradeColor(ri / 15, gi / 15, bi / 15, P, sh, hi, mono), i = (gi * 256 + bi * 16 + ri) * 4;
    d[i] = Math.round(clamp01(c[0]) * 255); d[i + 1] = Math.round(clamp01(c[1]) * 255); d[i + 2] = Math.round(clamp01(c[2]) * 255); d[i + 3] = 255;
  }
  return d;
}
let LutVer = 0, LutIdent = null;
const lutIdent = () => LutIdent || (LutIdent = makeLut({}));
function lutBlend(a, b, t) { const o = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) o[i] = Math.round(a[i] + (b[i] - a[i]) * t); return o; }
/* Post._lut：{ a, va, b, vb, mix（0～1 從 a 換到 b）, amt（整體強度）} 由 07_gl 的合成著色器讀 */
const Cinema = PZ.cinema = { bars: 0, barsFrom: 0, barsTo: 0, barsT: 0, barsDur: 0, _gAmtTo: 0, _gAmtRate: 1, _gMixRate: 0 };
Post.grades = Object.fromEntries(Object.entries(GRADES).map(([k, v]) => [k, v.name]));
Post.gradeName = null;
Post.grade = (p, o = {}) => {
  const time = o.time != null ? o.time : 0.8, amount = o.amount != null ? clamp01(o.amount) : 1;
  let P = null;
  if (typeof p === 'string') { P = GRADES[p]; if (!P) { warnOnce('grade:' + p, '沒有這種調色：' + p); return; } }
  else if (p && typeof p === 'object') P = p;
  const L = Post._lut || (Post._lut = { a: lutIdent(), va: ++LutVer, b: null, vb: 0, mix: 0, amt: 0 });
  if (L.b && L.mix > 0) { L.a = lutBlend(L.a, L.b, L.mix); L.va = ++LutVer; }
  L.b = null; L.mix = 0;
  Post.gradeName = typeof p === 'string' ? p : P ? 'custom' : null;
  const rate = 1 / Math.max(0.001, time);
  if (!P) { Cinema._gAmtTo = 0; Cinema._gAmtRate = rate; return; }
  const data = makeLut(P);
  if (L.amt <= 0.001 || time <= 0) { L.a = data; L.va = ++LutVer; if (time <= 0) L.amt = amount; }
  else { L.b = data; L.vb = ++LutVer; Cinema._gMixRate = rate; }
  Cinema._gAmtTo = amount; Cinema._gAmtRate = rate;
};
/** 電影黑邊：amount＝上下各佔畫面高度幾成（0～0.3），time 秒 */
Fx.letterbox = (amount = 0.12, time = 0.6) => { const C = Cinema; C.barsFrom = C.bars; C.barsTo = clamp(amount, 0, 0.3); C.barsT = 0; C.barsDur = Math.max(0, time); if (time <= 0) C.bars = C.barsTo; };
Cinema.reset = () => { Cinema.bars = Cinema.barsTo = Cinema.barsFrom = 0; Cinema.barsDur = 0; };
addSystem({
  name: 'cinema', order: 76,
  frame(rdt) {
    const C = Cinema, L = Post._lut;
    if (C.bars !== C.barsTo) { C.barsT += rdt; C.bars = C.barsDur > 0 ? lerp(C.barsFrom, C.barsTo, Ease.inOutQuad(clamp01(C.barsT / C.barsDur))) : C.barsTo; }
    if (L) {
      if (L.b) { L.mix = Math.min(1, L.mix + C._gMixRate * rdt); if (L.mix >= 1) { L.a = L.b; L.va = L.vb; L.b = null; L.mix = 0; } }
      if (L.amt !== C._gAmtTo) L.amt = approach(L.amt, C._gAmtTo, C._gAmtRate * rdt);
    }
  },
});
Cinema._drawBars = (g) => {
  if (Cinema.bars < 0.0005) return;
  const h = Screen.h * Cinema.bars;
  g.rect(-2, -2, Screen.w + 4, h + 2, '#000'); g.rect(-2, Screen.h - h, Screen.w + 4, h + 2, '#000');
};
