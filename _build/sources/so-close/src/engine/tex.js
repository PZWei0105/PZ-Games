// 程式產生的貼圖（畫布）
import * as THREE from 'three';

const cache = new Map();
export function canvasTex(key, w, h, draw, opts = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
  cache.set(key, t);
  return t;
}

function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

export const tex = {
  // 柔光圓點
  dot: () => canvasTex('dot', 64, 64, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.75)'); r.addColorStop(0.6, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  }),
  // 十字星芒
  star: () => canvasTex('star', 128, 128, (g, w) => {
    const c = w / 2;
    const r = g.createRadialGradient(c, c, 0, c, c, c);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.12, 'rgba(255,255,255,.6)'); r.addColorStop(0.4, 'rgba(255,255,255,.05)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
    g.globalCompositeOperation = 'lighter';
    for (const [sx, sy] of [[1, 0.035], [0.035, 1]]) {
      const lg = g.createRadialGradient(c, c, 0, c, c, c);
      lg.addColorStop(0, 'rgba(255,255,255,.95)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.save(); g.translate(c, c); g.scale(sx, sy); g.fillStyle = lg; g.beginPath(); g.arc(0, 0, c, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }),
  wood: (tone = '#5a3420') => canvasTex('wood' + tone, 256, 256, (g, w, h) => {
    g.fillStyle = tone; g.fillRect(0, 0, w, h);
    const R = rnd(7);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(${R() < 0.5 ? '20,8,2' : '255,210,160'},${0.05 + R() * 0.1})`;
      g.lineWidth = 1 + R() * 3;
      g.beginPath();
      const y0 = R() * h;
      g.moveTo(0, y0);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + Math.sin(x * 0.03 + i) * 4 + (R() - 0.5) * 2);
      g.stroke();
    }
  }, { repeat: [1, 1] }),
  velvet: (tone) => canvasTex('velvet' + tone, 128, 128, (g, w, h) => {
    g.fillStyle = tone; g.fillRect(0, 0, w, h);
    const R = rnd(3);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,255,255'},${R() * 0.06})`; g.fillRect(R() * w, R() * h, 1, 1); }
  }),
  // 懷錶錶盤
  dial: () => canvasTex('dial', 512, 512, (g, w) => {
    const c = w / 2;
    const bg = g.createRadialGradient(c, c, 0, c, c, c);
    bg.addColorStop(0, '#fffaf0'); bg.addColorStop(0.85, '#f1e6cf'); bg.addColorStop(1, '#d8c39a');
    g.fillStyle = bg; g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#b08a3e'; g.lineWidth = 10; g.beginPath(); g.arc(c, c, c - 8, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#2c2a33'; g.lineWidth = 2; g.beginPath(); g.arc(c, c, c - 60, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, r0 = c - 34, r1 = c - (i % 5 ? 46 : 58);
      g.lineWidth = i % 5 ? 2 : 5; g.strokeStyle = '#2c2a33';
      g.beginPath(); g.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0); g.lineTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1); g.stroke();
    }
    const R = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    g.fillStyle = '#1d1b24'; g.font = 'bold 44px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    R.forEach((s, i) => { const a = (i / 12) * Math.PI * 2, r = c - 100; g.save(); g.translate(c + Math.sin(a) * r, c - Math.cos(a) * r); g.rotate(a); g.fillText(s, 0, 0); g.restore(); });
    g.fillStyle = '#9a7630'; g.font = 'italic 26px Georgia, serif'; g.fillText('So Close · Est. 2026', c, c + 120);
    // 小秒盤
    g.strokeStyle = '#7a6a4c'; g.lineWidth = 2; g.beginPath(); g.arc(c, c + 60, 46, 0, Math.PI * 2); g.stroke();
  }),
  // 吸積盤
  disk: () => canvasTex('disk', 512, 512, (g, w) => {
    const c = w / 2;
    const r = g.createRadialGradient(c, c, c * 0.42, c, c, c);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.08, 'rgba(255,240,200,1)'); r.addColorStop(0.25, 'rgba(255,170,60,.95)');
    r.addColorStop(0.55, 'rgba(230,80,20,.55)'); r.addColorStop(0.8, 'rgba(120,20,10,.18)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = 'rgba(0,0,0,1)'; g.beginPath(); g.arc(c, c, c * 0.42, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-atop';
    const R = rnd(11);
    for (let i = 0; i < 260; i++) {
      const a = R() * Math.PI * 2, rr = c * (0.45 + R() * 0.5);
      g.strokeStyle = `rgba(${R() < 0.5 ? '255,250,220' : '90,20,0'},${0.08 + R() * 0.18})`;
      g.lineWidth = 1 + R() * 3;
      g.beginPath(); g.arc(c, c, rr, a, a + 0.3 + R() * 0.9); g.stroke();
    }
  }),
  // 極光
  aurora: () => canvasTex('aurora', 256, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    const R = rnd(5);
    const cols = ['#39ffb0', '#2ad7ff', '#8a5cff', '#ff5ccf'];
    for (let i = 0; i < 26; i++) {
      const x = R() * w, wd = 10 + R() * 40;
      const lg = g.createLinearGradient(0, h, 0, 0);
      const col = cols[Math.floor(R() * cols.length)];
      lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.25, col); lg.addColorStop(0.7, col + '55'); lg.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.25 + R() * 0.35; g.fillStyle = lg; g.fillRect(x - wd / 2, 0, wd, h);
      g.fillRect(x - wd / 2 - w, 0, wd, h); g.fillRect(x - wd / 2 + w, 0, wd, h);
    }
  }, { repeat: [2, 1] }),
  // 黑金蛋的金粉
  glitter: () => canvasTex('glitter', 256, 256, (g, w, h) => {
    g.fillStyle = '#060504'; g.fillRect(0, 0, w, h);
    const R = rnd(19);
    for (let i = 0; i < 900; i++) { const v = R(); g.fillStyle = v > 0.92 ? '#fff3c0' : v > 0.6 ? '#e3b44a' : '#7a5a1c'; const s = R() * 2.2 + 0.5; g.fillRect(R() * w, R() * h, s, s); }
  }, { repeat: [3, 2] }),
  // 虹彩厚度圖（綠色通道＝薄膜厚度）：讓每個切面的顏色都不一樣
  iri: () => canvasTex('iri', 128, 128, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = 0.5 + 0.25 * Math.sin(x * 0.21 + Math.sin(y * 0.07) * 3) + 0.25 * Math.cos(y * 0.13 + x * 0.05);
      const i = (y * w + x) * 4; img.data[i] = 0; img.data[i + 1] = Math.floor(Math.max(0, Math.min(1, v)) * 255); img.data[i + 2] = 0; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { linear: true }),
  // 機台背板花紋
  backdrop: (a, b, accent, seed = 1) => canvasTex('bd' + a + b + accent + seed, 512, 512, (g, w, h) => {
    const lg = g.createLinearGradient(0, 0, 0, h);
    lg.addColorStop(0, b); lg.addColorStop(1, a);
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    const R = rnd(seed * 97);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) {
      const x = R() * w, y = R() * h * 0.8, s = 1 + R() * 2.5;
      g.fillStyle = accent; g.globalAlpha = 0.15 + R() * 0.6; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 0.12; g.strokeStyle = accent; g.lineWidth = 2;
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(w / 2, h * 1.15, 120 + i * 48, Math.PI, 0); g.stroke(); }
  }),
  // 地板（機台內）
  felt: (tone, accent) => canvasTex('felt' + tone + accent, 256, 256, (g, w, h) => {
    g.fillStyle = tone; g.fillRect(0, 0, w, h);
    g.strokeStyle = accent; g.globalAlpha = 0.16; g.lineWidth = 2;
    for (let i = -h; i < w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); }
    g.globalAlpha = 1;
    const R = rnd(23);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(255,255,255,${R() * 0.04})`; g.fillRect(R() * w, R() * h, 1, 1); }
  }, { repeat: [3, 3] }),
  // 店內地磚
  tiles: () => canvasTex('tiles', 512, 512, (g, w, h) => {
    g.fillStyle = '#0b0c12'; g.fillRect(0, 0, w, h);
    const R = rnd(31);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const v = 14 + R() * 8;
      g.fillStyle = `rgb(${v},${v + 1},${v + 6})`;
      g.fillRect(x * 128 + 2, y * 128 + 2, 124, 124);
    }
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${R() * 0.035})`; g.fillRect(R() * w, R() * h, 1, 1); }
  }, { repeat: [10, 10] }),
};

// 招牌文字貼圖（發光霓虹）
export function signTex(text, opts = {}) {
  const key = 'sign' + text + JSON.stringify(opts);
  return canvasTex(key, opts.w || 1024, opts.h || 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = opts.font || `900 ${Math.floor(h * 0.62)}px "Noto Sans TC", "PingFang TC", sans-serif`;
    const col = opts.color || '#ffffff';
    g.shadowColor = opts.glow || col; g.shadowBlur = opts.blur ?? h * 0.12;
    g.fillStyle = col;
    for (let i = 0; i < (opts.passes || 2); i++) g.fillText(text, w / 2, h / 2 + (opts.dy || 0));
    if (opts.stroke) { g.shadowBlur = 0; g.lineWidth = opts.stroke; g.strokeStyle = opts.strokeColor || '#fff'; g.strokeText(text, w / 2, h / 2 + (opts.dy || 0)); }
  });
}
