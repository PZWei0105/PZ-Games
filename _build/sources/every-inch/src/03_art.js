/* ───────────── 美術核心：外框、快取圖塊、隊伍配色 ───────────── */
const OUT = '#1a1720';
const OW = 1.35;
const SPR_S = 4;           // 圖塊快取解析度：每個世界單位 4 像素
const SPR = {};

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
/* 在世界座標 (x0,y0)-(x1,y1) 的範圍畫一張圖塊；之後以 (0,0) 為錨點貼上 */
function mkSpr(key, x0, y0, x1, y1, fn, scale) {
  const S = scale || SPR_S, pad = 2;
  const c = mkCanvas((x1 - x0 + pad * 2) * S, (y1 - y0 + pad * 2) * S);
  const g = c.getContext('2d');
  g.scale(S, S); g.translate(-x0 + pad, -y0 + pad);
  g.lineJoin = 'round'; g.lineCap = 'round';
  fn(g);
  const s = { c, ox: pad - x0, oy: pad - y0, w: c.width / S, h: c.height / S };
  if (key) SPR[key] = s;
  return s;
}
function dspr(ctx, s, x, y, rot, sx, sy) {
  if (!rot && sx === undefined) { ctx.drawImage(s.c, x - s.ox, y - s.oy, s.w, s.h); return; }
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
  if (sx !== undefined) ctx.scale(sx, sy === undefined ? sx : sy);
  ctx.drawImage(s.c, -s.ox, -s.oy, s.w, s.h); ctx.restore();
}
function rr(g, x, y, w, h, r) {
  g.beginPath();
  if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; }
  r = Math.min(r, w / 2, h / 2);
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
function fo(g, fill, lw) { g.fillStyle = fill; g.fill(); g.lineWidth = lw || OW; g.strokeStyle = OUT; g.stroke(); }
function lg(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i], stops[i + 1]); return gr; }
function rg(g, x, y, r0, r1, stops) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); for (let i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i], stops[i + 1]); return gr; }

/* ── 隊伍配色 ── 我方：橄欖綠；敵方：各勢力的紅 */
const PAL = {};
function mkPal(id, o) {
  const p = Object.assign({
    skin: '#f4c7a1', skinD: '#d89f7b', skinS: '#e9b18b', boot: '#37302a', bootL: '#5a4d40', glove: '#2f2a26',
    vest: '#8a7b50', vestD: '#695c39', vestL: '#a99962', pack: '#6e5f3d', packD: '#4f442b', belt: '#4a3b28', metal: '#2c2e35', metalL: '#53575f',
  }, o);
  p.clothD = p.clothD || shade(p.cloth, -0.28); p.clothL = p.clothL || shade(p.cloth, 0.18);
  p.helmD = p.helmD || shade(p.helm, -0.3); p.helmL = p.helmL || shade(p.helm, 0.22);
  PAL[id] = p; return p;
}
mkPal('us', { cloth: '#6f8b3b', helm: '#5f7a33', accent: '#9dff5c', flagA: '#3e9b3c', flagB: '#e8f5d8', tracer: '#fff6b0', gear: 'helmet', team: 0 });
mkPal('red', { cloth: '#ad4637', helm: '#86342b', accent: '#ff5a3c', flagA: '#c8372b', flagB: '#ffe2d6', tracer: '#ffc49a', gear: 'helmetR', team: 1,
  vest: '#5d5148', vestD: '#433a33', vestL: '#7a6c60', pack: '#4e443c', packD: '#38302b' });
mkPal('kaz', { cloth: '#b5532c', helm: '#3b3330', accent: '#ff8a2a', flagA: '#d0571f', flagB: '#ffe8c2', tracer: '#ffc490', gear: 'bandana', team: 1,
  vest: '#5c4a3a', vestD: '#3f3228', vestL: '#79634e', pack: '#544433', packD: '#3a2f23' });
mkPal('holder', { cloth: '#8f3b33', helm: '#6a5546', accent: '#ff6b4a', flagA: '#9c2f2a', flagB: '#f1d9c9', tracer: '#ffbe95', gear: 'ushanka', team: 1,
  vest: '#4d4744', vestD: '#35302e', vestL: '#6a625e', pack: '#4a3f38', packD: '#332b26' });
mkPal('ilya', { cloth: '#b23f4c', helm: '#e9edf2', helmD: '#aeb6c2', helmL: '#ffffff', accent: '#ff4f6d', flagA: '#c9314a', flagB: '#fff1f3', tracer: '#ffc4cf', gear: 'pilot', team: 1,
  vest: '#4a4952', vestD: '#33323a', vestL: '#66656e', pack: '#45444c', packD: '#2f2e35' });
mkPal('severin', { cloth: '#7b2c34', helm: '#3d3a3c', accent: '#ff3b4f', flagA: '#6e1f2a', flagB: '#e9d6cf', tracer: '#ffb0a8', gear: 'mask', team: 1,
  vest: '#403a36', vestD: '#2c2724', vestL: '#5b534d', pack: '#3d3631', packD: '#2a2420' });

mkPal('boiler', { cloth: '#56702e', helm: '#5f7a33', accent: '#9dff5c', flagA: '#3e9b3c', flagB: '#e8f5d8', tracer: '#fff6b0', gear: 'bald', team: 0, skin: '#dca37c', skinD: '#b97e5c', skinS: '#cd9370' });
mkPal('sparrow', { cloth: '#5d6e3d', helm: '#5d6b3c', accent: '#9dff5c', flagA: '#3e9b3c', flagB: '#e8f5d8', tracer: '#ffffff', gear: 'hood', team: 0 });
mkPal('kazboss', { cloth: '#b5532c', helm: '#3b3330', accent: '#ff8a2a', flagA: '#d0571f', flagB: '#ffe8c2', tracer: '#ffc490', gear: 'mohawk', team: 1, vest: '#5c4a3a', vestD: '#3f3228', vestL: '#79634e', pack: '#544433', packD: '#3a2f23' });
mkPal('kazbossUs', { cloth: '#b5532c', helm: '#3b3330', accent: '#9dff5c', flagA: '#3e9b3c', flagB: '#e8f5d8', tracer: '#fff6b0', gear: 'mohawk', team: 0, vest: '#5c4a3a', vestD: '#3f3228', vestL: '#79634e', pack: '#544433', packD: '#3a2f23' });

/* ── 柔光、煙霧等共用圖塊（放射漸層一次畫好） ── */
const FXS = {};
function buildFxSprites() {
  const glow = (key, col, r) => { FXS[key] = mkSpr(null, -r, -r, r, r, (g) => { g.fillStyle = rg(g, 0, 0, 0, r, [0, rgba(col, 1), 0.25, rgba(col, 0.55), 1, rgba(col, 0)]); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); }, 2); };
  glow('gW', '#ffffff', 32); glow('gY', '#ffd36a', 32); glow('gO', '#ff8a2a', 32); glow('gR', '#ff3d22', 32);
  glow('gG', '#9dff5c', 32); glow('gB', '#8fd8ff', 32);
  // 煙：邊緣帶一點雜訊的團塊
  const puff = (key, c1, c2, seed) => {
    const R = mulberry32(seed);
    FXS[key] = mkSpr(null, -32, -32, 32, 32, (g) => {
      for (let i = 0; i < 9; i++) {
        const a = R() * TAU, d = R() * 12, r = 12 + R() * 9;
        const x = Math.cos(a) * d, y = Math.sin(a) * d;
        g.fillStyle = rg(g, x, y, 0, r, [0, rgba(c1, 0.5), 0.5, rgba(c2, 0.3), 1, rgba(c2, 0)]);
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
    }, 2);
  };
  puff('smoke', '#8d8f96', '#6c6e75', 7); puff('smokeD', '#3c3c42', '#26262b', 11); puff('smokeL', '#f2f4f7', '#cfd5dc', 13);
  puff('dust', '#e9eef2', '#c2cad3', 17); puff('dirt', '#8a7a68', '#6a5d4f', 19); puff('fire', '#fff2a8', '#ff7a1a', 23);
  // 星形槍口焰（三種形狀輪替）
  for (let k = 0; k < 3; k++) {
    const R = mulberry32(31 + k);
    FXS['mf' + k] = mkSpr(null, -6, -10, 28, 10, (g) => {
      g.fillStyle = rg(g, 2, 0, 0, 14, [0, 'rgba(255,255,230,1)', 0.35, 'rgba(255,214,90,.95)', 1, 'rgba(255,120,30,0)']);
      g.beginPath(); g.arc(3, 0, 9, 0, TAU); g.fill();
      g.fillStyle = '#fff7c8';
      const n = 5 + k;
      g.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * TAU - Math.PI / 2;
        const fwd = Math.max(0, Math.cos(a));
        const r = i % 2 ? 2.2 : 5 + R() * 4 + fwd * (10 + R() * 8);
        const x = 3 + Math.cos(a) * r, y = Math.sin(a) * r * 0.62;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath(); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(4, 0, 5, 2.6, 0, 0, TAU); g.fill();
    }, 3);
  }
  // 爆炸火球
  FXS.ball = mkSpr(null, -32, -32, 32, 32, (g) => {
    g.fillStyle = rg(g, 0, 0, 0, 30, [0, '#fffbe0', 0.25, '#ffd65c', 0.55, '#ff8a22', 0.85, 'rgba(214,60,20,.85)', 1, 'rgba(120,30,10,0)']);
    g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill();
  }, 2);
  FXS.ring = mkSpr(null, -32, -32, 32, 32, (g) => {
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 28, 0, TAU); g.stroke();
  }, 2);
  FXS.spark = mkSpr(null, -6, -2, 6, 2, (g) => { g.fillStyle = '#fff3b0'; g.beginPath(); g.ellipse(0, 0, 6, 1.4, 0, 0, TAU); g.fill(); }, 3);
}

/* 把圖塊整張染成單色（受擊白閃、燒焦用），保留外框輪廓 */
function tintSpr(key, src, color, a) {
  const c = mkCanvas(src.c.width, src.c.height), g = c.getContext('2d');
  g.drawImage(src.c, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  const s = { c, ox: src.ox, oy: src.oy, w: src.w, h: src.h };
  if (key) SPR[key] = s; return s;
}

/* 動態畫肢體：連續折線、外框＋本色＋亮面 */
function limbPath(ctx, pts, n) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < n * 2; i += 2) ctx.lineTo(pts[i], pts[i + 1]); }
function drawLimb(ctx, pts, n, w, col, hi) {
  limbPath(ctx, pts, n);
  ctx.lineWidth = w + OW * 2; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
  if (hi) {
    const o = -w * 0.18, a0 = ctx.globalAlpha;
    ctx.beginPath(); ctx.moveTo(pts[0] + o, pts[1] + o); ctx.lineTo(pts[2] + o, pts[3] + o);
    ctx.lineWidth = w * 0.3; ctx.strokeStyle = hi; ctx.globalAlpha = a0 * 0.55; ctx.stroke(); ctx.globalAlpha = a0;
  }
}
function dot(ctx, x, y, r, col, outline) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = col; ctx.fill();
  if (outline !== false) { ctx.lineWidth = OW; ctx.strokeStyle = OUT; ctx.stroke(); }
}
