// ===== 顏料層：把世界畫成岩壁上的畫（2D canvas，再交給 WebGL 打光） =====
const P = {
  cv: null, ctx: null, k: 1, ox: 0, oy: 0, vw: 0, vh: 0, t: 0, boil: 0, px: 1,
  init() {
    this.cv = document.createElement('canvas');
    this.ctx = this.cv.getContext('2d');
  },
  resize(w, h) { this.cv.width = w; this.cv.height = h; },
};
// 手繪抖動：每秒換九次
const jit = (i, a = 1) => (hashi(i, P.boil) - 0.5) * 2 * a;

function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
}
// 沿著折線畫一條兩端粗細不同的帶子
function ribbonPath(ctx, pts, w0, w1) {
  const n = pts.length;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const w = lerp(w0, w1, i / (n - 1)) / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
  const e = pts[n - 1];
  ctx.quadraticCurveTo(e[0] + (e[0] - pts[n - 2][0]) * 0.6, e[1] + (e[1] - pts[n - 2][1]) * 0.6, R[n - 1][0], R[n - 1][1]);
  for (let i = n - 2; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
}
function bezPts(p0, p1, p2, p3, n) {
  const o = [];
  for (let i = 0; i <= n; i++) o.push(bez(p0, p1, p2, p3, i / n));
  return o;
}

// ---------- 地面、岩塊、湖 ----------
function paintGround(W) {
  const c = P.ctx;
  const x0 = Math.max(-600, P.ox - 60), x1 = Math.min(3000, P.ox + P.vw / P.k + 60);
  // 草原底下的土色
  const a0 = Math.max(x0, 290), a1 = Math.min(x1, 1570);
  if (a1 > a0) {
    c.beginPath();
    c.moveTo(a0, W.groundAt(a0));
    for (let x = a0; x <= a1; x += 10) c.lineTo(x, W.groundAt(x) + 2);
    c.lineTo(a1, 900); c.lineTo(a0, 900); c.closePath();
    const g = c.createLinearGradient(0, 585, 0, 820);
    g.addColorStop(0, rgba(PIG.umber, 0.55)); g.addColorStop(0.35, rgba(PIG.umber, 0.26)); g.addColorStop(1, rgba(PIG.umber, 0));
    c.fillStyle = g; c.fill();
    // 地層
    c.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const off = 34 + k * 38;
      c.beginPath();
      let pen = false;
      for (let x = a0; x <= a1; x += 14) {
        const on = hashi(Math.floor(x / 70) + k * 97, 5) > 0.35;
        const y = W.groundAt(x) + off + 4 * Math.sin(x / 90 + k);
        if (on) { if (!pen) { c.moveTo(x, y); pen = true; } else c.lineTo(x, y); } else pen = false;
      }
      c.strokeStyle = rgba(PIG.char, 0.16 - k * 0.04); c.lineWidth = 2.2; c.stroke();
    }
    // 碎石點
    c.fillStyle = rgba(PIG.char, 0.22);
    for (let x = Math.ceil(a0 / 23) * 23; x < a1; x += 23) {
      const h = hashi(x, 11);
      if (h < 0.5) continue;
      c.beginPath(); c.arc(x + h * 9, W.groundAt(x) + 14 + h * 50, 1.6 + h * 1.8, 0, TAU); c.fill();
    }
  }
  // 左邊石台與岩壁
  if (x0 < 470) paintRockMass(W, -600, 450, 1);
  if (x1 > 2150) paintRockMass(W, LAKE1 - 20, 3000, 2);
  // 湖
  if (x1 > 1530 && x0 < 2200) paintLake(W);
  // 地平線（炭筆）
  c.beginPath();
  const s0 = Math.max(x0, 300), s1 = Math.min(x1, 1562);
  for (let x = s0, i = 0; x <= s1; x += 12, i++) {
    const y = W.groundAt(x) + jit(i * 7 + 3, 1.1);
    if (x === s0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.strokeStyle = rgba(PIG.char, 0.88); c.lineWidth = 4.2; c.lineJoin = 'round'; c.stroke();
}

function paintRockMass(W, xa, xb, id) {
  const c = P.ctx;
  const x0 = Math.max(xa, P.ox - 80), x1 = Math.min(xb, P.ox + P.vw / P.k + 80);
  if (x1 <= x0) return;
  c.save();
  c.beginPath();
  c.moveTo(x0, W.groundAt(x0));
  for (let x = x0; x <= x1; x += 8) c.lineTo(x, W.groundAt(x));
  c.lineTo(x1, W.groundAt(x1));
  c.lineTo(x1, 1000); c.lineTo(x0, 1000); c.closePath();
  const g = c.createLinearGradient(0, 380, 0, 900);
  g.addColorStop(0, rgba([88, 74, 64], 0.72)); g.addColorStop(0.5, rgba([70, 58, 50], 0.5)); g.addColorStop(1, rgba([60, 50, 44], 0));
  c.fillStyle = g; c.fill();
  c.clip();
  // 斜線陰影
  c.beginPath();
  for (let x = Math.floor(x0 / 15) * 15 - 400; x < x1; x += 15) { c.moveTo(x, 360); c.lineTo(x + 380, 900); }
  c.strokeStyle = rgba(PIG.char, 0.17); c.lineWidth = 2; c.stroke();
  // 岩塊的裂縫
  c.beginPath();
  for (let k = 0; k < 14; k++) {
    const x = lerp(xa, xb, hashi(k, 40 + id));
    if (x < x0 - 60 || x > x1 + 60) continue;
    const y = W.groundAt(x) + 10 + hashi(k, 50 + id) * 40;
    c.moveTo(x, y);
    c.lineTo(x + (hashi(k, 60) - 0.5) * 40, y + 40 + hashi(k, 70) * 60);
    c.lineTo(x + (hashi(k, 80) - 0.5) * 70, y + 110 + hashi(k, 90) * 90);
  }
  c.strokeStyle = rgba(PIG.char, 0.42); c.lineWidth = 3; c.stroke();
  c.restore();
  // 輪廓
  c.beginPath();
  for (let x = x0, i = 0; x <= x1; x += 10, i++) {
    const y = W.groundAt(x) + jit(i * 5 + id * 900, 1.3);
    if (x === x0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.strokeStyle = rgba(PIG.char, 0.92); c.lineWidth = 6.5; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
  // 上面的小石頭
  for (let k = 0; k < 9; k++) {
    const x = lerp(xa + 40, xb - 40, hashi(k, 100 + id));
    if (x < x0 - 30 || x > x1 + 30) continue;
    if (id === 1 && Math.abs(x - HUNTER_X) < 50) continue;
    const r = 7 + hashi(k, 110) * 11, y = W.groundAt(x) - r * 0.45;
    c.beginPath(); c.ellipse(x, y, r * 1.3, r * 0.75, 0, Math.PI, TAU); c.closePath();
    c.fillStyle = rgba([104, 92, 80], 0.75); c.fill();
    c.strokeStyle = rgba(PIG.char, 0.7); c.lineWidth = 2.4; c.stroke();
  }
}

function lakeBed(x) { return 612 + 92 * Math.sin(Math.PI * clamp((x - 1540) / (LAKE1 + 26 - 1540), 0, 1)); }
function paintLake(W) {
  const c = P.ctx, t = P.t;
  // 水
  c.beginPath();
  c.moveTo(1540, 612);
  for (let x = 1540; x <= LAKE1 + 26; x += 12) c.lineTo(x, lakeBed(x));
  c.lineTo(LAKE1 + 26, 612); c.closePath();
  const g = c.createLinearGradient(0, 612, 0, 712);
  g.addColorStop(0, rgba(PIG.water, 0.62)); g.addColorStop(1, rgba([22, 30, 36], 0.78));
  c.fillStyle = g; c.fill();
  c.beginPath();
  for (let k = 0; k < 9; k++) {
    const y = 630 + k * 8;
    for (let x = 1560 + (k % 2) * 30; x < LAKE1; x += 64) {
      if (y > lakeBed(x) - 6) continue;
      const o = Math.sin(t * 0.7 + k + x * 0.01) * 4;
      c.moveTo(x + o, y); c.lineTo(x + 26 + o, y);
    }
  }
  c.strokeStyle = rgba(PIG.white, 0.13); c.lineWidth = 1.6; c.stroke();
  // 湖底
  c.beginPath();
  for (let x = 1540; x <= LAKE1 + 26; x += 12) { const y = lakeBed(x); if (x === 1540) c.moveTo(x, y); else c.lineTo(x, y); }
  c.strokeStyle = rgba(PIG.char, 0.5); c.lineWidth = 3; c.stroke();
  // 冰
  for (const s of W.ice) {
    const x0 = s.cx - 8, x1 = s.cx + 8;
    if (s.broken) {
      // 冰洞：水面與碎冰
      const bob = Math.sin(t * 2.2 + s.i * 1.7) * 2.5;
      c.fillStyle = rgba([30, 40, 48], 0.75);
      c.fillRect(x0, 612, 16.5, 8);
      c.beginPath(); c.moveTo(x0, 616 + bob * 0.4); c.lineTo(x1, 616 - bob * 0.4);
      c.strokeStyle = rgba(PIG.white, 0.35); c.lineWidth = 1.5; c.stroke();
      if (s.i % 2 === 0) {
        c.save(); c.translate(s.cx + Math.sin(s.i) * 4, 612 + bob);
        c.rotate(Math.sin(t * 1.3 + s.i) * 0.18 + (hashi(s.i, 3) - 0.5) * 0.6);
        c.beginPath(); c.moveTo(-11, -3); c.lineTo(9, -5); c.lineTo(12, 3); c.lineTo(-8, 5); c.closePath();
        c.fillStyle = rgba(PIG.ice, 0.85); c.fill();
        c.strokeStyle = rgba(PIG.char, 0.55); c.lineWidth = 1.4; c.stroke();
        c.restore();
      }
      continue;
    }
    const thin = 1 - clamp((s.th - 0.3) / 0.7, 0, 1);
    const col = [lerp(244, 200, thin), lerp(244, 222, thin), lerp(236, 230, thin)];
    c.fillStyle = rgba(col, lerp(0.97, 0.7, thin));
    c.fillRect(x0 - 0.3, 603, 16.6, lerp(16, 10, thin));
    if (s.wet > 0) { c.fillStyle = rgba(PIG.char, 0.22 * s.wet); c.fillRect(x0, 604, 16.5, 11); }
  }
  // 冰面的線
  c.beginPath();
  let pen = false;
  for (const s of W.ice) {
    if (s.broken) { pen = false; continue; }
    const y = 604 + jit(s.i * 3 + 777, 0.6);
    if (!pen) { c.moveTo(s.cx - 8, y); pen = true; } else c.lineTo(s.cx - 8, y);
    c.lineTo(s.cx + 8, y);
  }
  c.strokeStyle = rgba(PIG.char, 0.82); c.lineWidth = 3; c.stroke();
  // 反光
  c.beginPath();
  for (const s of W.ice) {
    if (s.broken || s.i % 3) continue;
    c.moveTo(s.cx - 5, 608); c.lineTo(s.cx + 9, 608);
  }
  c.strokeStyle = rgba(PIG.white, 0.6); c.lineWidth = 1.6; c.stroke();
  // 薄冰上的氣泡
  c.fillStyle = rgba(PIG.white, 0.5);
  for (const s of W.ice) {
    if (s.broken || s.th > 0.6) continue;
    if (hashi(s.i, 31) > 0.55) { c.beginPath(); c.arc(s.cx + (hashi(s.i, 32) - 0.5) * 10, 614 + hashi(s.i, 33) * 14, 1.6 + hashi(s.i, 34) * 1.6, 0, TAU); c.fill(); }
  }
  // 裂紋
  c.beginPath();
  for (const s of W.ice) {
    if (s.broken) continue;
    const lvl = s.fail ? 0.5 + s.strain : s.strain * 1.4;
    if (lvl < 0.08) continue;
    const n = 1 + Math.floor(lvl * 4);
    for (let k = 0; k < n; k++) {
      let x = s.cx + (hashi(s.i * 9 + k, 7) - 0.5) * 12, y = 604;
      c.moveTo(x, y);
      const len = 4 + lvl * 7;
      for (let q = 0; q < len; q++) {
        x += (hashi(s.i * 31 + k * 7 + q, 8) - 0.5) * 9 + (k % 2 ? 1.6 : -1.6);
        y += 1.6 + hashi(s.i * 17 + q, 9) * 2.2;
        if (y > 619) { y = 619; }
        c.lineTo(x, y);
      }
    }
  }
  c.strokeStyle = rgba(PIG.char, 0.75); c.lineWidth = 1.5; c.stroke();
}

// ---------- 草 ----------
function paintGrass(W) {
  const c = P.ctx, t = P.t, w = W.wind.now;
  const x0 = P.ox - 40, x1 = P.ox + P.vw / P.k + 40;
  const yel = new Path2D(), chr = new Path2D(), stub = new Path2D();
  c.lineCap = 'round';
  for (const s of W.grass) {
    if (s.cx < x0 || s.cx > x1) continue;
    if (s.st >= 1) {
      const gy = W.groundAt(s.cx);
      c.beginPath(); c.moveTo(s.cx - 9, gy + 1); c.lineTo(s.cx + 9, gy + 1);
      c.strokeStyle = rgba(PIG.char, s.st === 1 ? 0.35 : 0.5); c.lineWidth = 9; c.stroke();
      for (let k = 0; k < 3; k++) {
        const bx = s.cx - 6 + k * 6, by = W.groundAt(bx);
        const h = s.st === 1 ? 6 + 6 * (1 - s.I) : 4 + hashi(s.i * 3 + k, 2) * 4;
        stub.moveTo(bx, by); stub.lineTo(bx + (hashi(s.i + k, 4) - 0.5) * 4, by - h);
      }
      continue;
    }
    for (let k = 0; k < 3; k++) {
      const bx = s.cx - 6 + k * 6 + (hashi(s.i * 3 + k, 1) - 0.5) * 3, by = W.groundAt(bx) + 1;
      const h = (19 + 15 * hashi(s.i * 3 + k, 2)) * s.fuel;
      const sway = w * (4 + 3 * hashi(s.i, k)) + Math.sin(t * (1.6 + 0.4 * Math.abs(w)) + s.i * 0.7 + k * 1.3) * (1.8 + Math.abs(w) * 1.3);
      const path = k === 1 ? chr : yel;
      path.moveTo(bx, by);
      path.quadraticCurveTo(bx + sway * 0.25, by - h * 0.6, bx + sway, by - h);
    }
  }
  c.strokeStyle = rgba(PIG.yellow, 0.95); c.lineWidth = 2.6; c.stroke(yel);
  c.strokeStyle = rgba(PIG.char, 0.8); c.lineWidth = 1.9; c.stroke(chr);
  c.strokeStyle = rgba(PIG.char, 0.85); c.lineWidth = 2.2; c.stroke(stub);
  // 灰
  c.fillStyle = rgba(PIG.ash, 0.55);
  for (const s of W.grass) {
    if (s.st < 2 || s.cx < x0 || s.cx > x1) continue;
    for (let k = 0; k < 3; k++) {
      c.beginPath(); c.arc(s.cx + (hashi(s.i, 20 + k) - 0.5) * 14, W.groundAt(s.cx) - 2 - hashi(s.i, 30 + k) * 5, 1.4 + hashi(s.i, 40 + k) * 1.4, 0, TAU); c.fill();
    }
  }
}

// ---------- 火焰（畫在岩壁上的火，光另外由 WebGL 打） ----------
function flamePath(p, x, y, w, h, lean, ph) {
  const tx = x + lean + Math.sin(ph) * w * 0.35, ty = y - h;
  p.moveTo(x - w, y);
  p.bezierCurveTo(x - w * 1.25, y - h * 0.42, x - w * 0.5 + lean * 0.5, y - h * 0.7, tx - w * 0.12, ty + h * 0.06);
  p.quadraticCurveTo(tx, ty - h * 0.02, tx + w * 0.14, ty + h * 0.08);
  p.bezierCurveTo(x + w * 0.5 + lean * 0.45, y - h * 0.6, x + w * 1.2, y - h * 0.36, x + w, y);
  p.closePath();
}
function paintFlames(W, extra) {
  const c = P.ctx, t = P.t, w = W.wind.now;
  const x0 = P.ox - 60, x1 = P.ox + P.vw / P.k + 60;
  const pr = new Path2D(), po = new Path2D(), py = new Path2D();
  const add = (x, y, I, seed, scale = 1) => {
    for (let k = 0; k < 3; k++) {
      const ph = t * (8 + k * 2.7) + seed * 1.7 + k * 2.1;
      const big = (k === 1 ? 0.85 : 0.45) + 0.45 * hashi(seed * 3 + k, 9) + 0.25 * vnoise(t * 1.7 + seed * 0.9 + k * 4, 5);
      const h = (44 + 80 * I) * big * (0.8 + 0.22 * Math.sin(ph) + 0.12 * Math.sin(ph * 2.3)) * scale;
      const fw = (7 + 7 * I) * (0.75 + 0.35 * big) * scale;
      const lean = (w * 13 + Math.sin(ph * 0.7) * 6) * scale;
      const xx = x + (k - 1) * 7 * scale;
      flamePath(pr, xx, y, fw, h, lean, ph);
      flamePath(po, xx + lean * 0.06, y, fw * 0.7, h * 0.74, lean * 0.8, ph + 1);
      flamePath(py, xx + lean * 0.1, y, fw * 0.42, h * 0.46, lean * 0.6, ph + 2);
    }
  };
  for (const s of W.grass) {
    if (s.st !== 1 || s.cx < x0 || s.cx > x1) continue;
    add(s.cx, W.groundAt(s.cx) + 2, s.I * s.fuel, s.i);
  }
  for (const b of W.brands) {
    if (b.x < x0 || b.x > x1) continue;
    const life = 1 - b.t / b.life;
    add(b.x, b.y - 4, 0.25 * life + 0.1, b.x, 0.55);
  }
  if (extra) for (const e of extra) add(e.x, e.y, e.I, e.seed, e.s);
  c.fillStyle = rgba(PIG.flameR, 0.9); c.fill(pr);
  c.fillStyle = rgba(PIG.flameO, 0.95); c.fill(po);
  c.fillStyle = rgba(PIG.flameY, 1); c.fill(py);
}

// ---------- 矛、火把 ----------
function spearPath(c, x, y, ang, len = 118) {
  // (x,y) 是矛尖
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const bx = x - dx * len, by = y - dy * len;
  c.beginPath(); c.moveTo(bx, by); c.lineTo(x - dx * 14, y - dy * 14);
  c.strokeStyle = rgba(PIG.char, 0.95); c.lineWidth = 3.4; c.lineCap = 'round'; c.stroke();
  // 石矛頭
  const nx = -dy, ny = dx;
  c.beginPath();
  c.moveTo(x + dx * 2, y + dy * 2);
  c.lineTo(x - dx * 17 + nx * 5, y - dy * 17 + ny * 5);
  c.lineTo(x - dx * 13, y - dy * 13);
  c.lineTo(x - dx * 17 - nx * 5, y - dy * 17 - ny * 5);
  c.closePath();
  c.fillStyle = rgba([70, 60, 56], 0.95); c.fill();
  c.strokeStyle = rgba(PIG.char, 0.9); c.lineWidth = 1.6; c.stroke();
  // 尾羽
  c.beginPath();
  for (let k = 0; k < 2; k++) {
    const px = bx + dx * (8 + k * 9), py = by + dy * (8 + k * 9);
    c.moveTo(px, py); c.lineTo(px - dx * 9 + nx * 7, py - dy * 9 + ny * 7);
    c.moveTo(px, py); c.lineTo(px - dx * 9 - nx * 7, py - dy * 9 - ny * 7);
  }
  c.strokeStyle = rgba(PIG.ochre, 0.9); c.lineWidth = 2; c.stroke();
}
function torchPath(c, x, y, ang) {
  // (x,y) 是火把頭
  const dx = Math.cos(ang), dy = Math.sin(ang);
  c.beginPath(); c.moveTo(x - dx * 54, y - dy * 54); c.lineTo(x, y);
  c.strokeStyle = rgba(PIG.umber, 0.95); c.lineWidth = 5; c.lineCap = 'round'; c.stroke();
  c.beginPath(); c.ellipse(x, y, 8, 6, ang, 0, TAU);
  c.fillStyle = rgba(PIG.char, 0.92); c.fill();
}
function paintStuck(W) {
  const c = P.ctx;
  for (const s of W.stuck) {
    if (s.x < P.ox - 150 || s.x > P.ox + P.vw / P.k + 150) continue;
    if (s.flat) {
      const a = s.ang;
      spearPath(c, s.x + Math.cos(a) * 60, s.y - 3 + Math.sin(a) * 60 * 0.1, a, 118);
    } else {
      // 矛尖埋進土裡 14
      spearPath(c, s.x + Math.cos(s.ang) * 14, s.y + Math.sin(s.ang) * 14, s.ang, 118);
      if (s.ice) {
        c.beginPath();
        for (let k = 0; k < 4; k++) { c.moveTo(s.x, s.y + 2); c.lineTo(s.x + (k - 1.5) * 9, s.y + 8 + (k % 2) * 4); }
        c.strokeStyle = rgba(PIG.char, 0.6); c.lineWidth = 1.2; c.stroke();
      }
    }
  }
  for (const b of W.brands) {
    if (b.x < P.ox - 100 || b.x > P.ox + P.vw / P.k + 100) continue;
    torchPath(c, b.x + 8, b.y - 6, Math.PI + 0.12);
  }
}

// ---------- 獵人（黎凡特岩畫式的細長人形） ----------
function limb(c, ax, ay, bx, by, cx, cy, w0, w1, w2) {
  ribbonPath(c, [[ax, ay], [bx, by], [cx, cy]], w0, w2);
}
function paintHunter(W, aim, tool) {
  const c = P.ctx, h = W.hunter, t = P.t;
  c.save();
  c.translate(h.x, h.y);
  if (!h.alive) {
    const d = Math.min(h.deadT, 1.6);
    c.translate(-150 * d, -260 * d + 330 * d * d);
    c.rotate(-d * 3.2);
  }
  c.scale(1.22, -1.22);
  const p = aim ? aim.power : 0;
  const a = aim ? aim.ang : -0.75;
  const dir = [Math.cos(a), -Math.sin(a)];
  const thr = h.throwT < 0.32 ? h.throwT / 0.32 : -1;
  const breath = Math.sin(t * 2.1) * 1.2;
  const lean = aim ? -p * 0.22 : thr >= 0 ? 0.22 * Math.sin(thr * Math.PI) : 0;
  const hip = [0, 76];
  const sh = [6 + Math.sin(lean) * 44, 76 + Math.cos(lean) * 44 + breath * 0.5];
  const head = [sh[0] + Math.sin(lean) * 16 + 2, sh[1] + 16];
  const bend = aim ? p * 10 : 0;
  // 腿
  c.beginPath();
  limb(c, hip[0] - 2, hip[1], -10 - bend * 0.3, 40 - bend, -19 - bend * 0.6, 1, 11, 7, 5);
  limb(c, hip[0] + 3, hip[1], 15, 39, 23, 1, 11, 7, 5);
  c.fillStyle = rgba(PIG.char, 0.96); c.fill();
  // 腳掌
  c.beginPath(); c.moveTo(-22 - bend * 0.6, 1); c.lineTo(-11 - bend * 0.6, 1); c.moveTo(20, 1); c.lineTo(31, 1);
  c.strokeStyle = rgba(PIG.char, 0.96); c.lineWidth = 3.5; c.lineCap = 'round'; c.stroke();
  // 身體（倒三角）
  c.beginPath();
  c.moveTo(hip[0] - 6, hip[1] - 2); c.lineTo(hip[0] + 7, hip[1] - 2);
  c.lineTo(sh[0] + 11, sh[1] + 1); c.lineTo(sh[0] - 10, sh[1] - 1); c.closePath();
  c.fillStyle = rgba(PIG.char, 0.97); c.fill();
  // 腰帶、彩繪
  c.beginPath(); c.moveTo(hip[0] - 6, hip[1] + 3); c.lineTo(hip[0] + 8, hip[1] + 4);
  c.strokeStyle = rgba(PIG.ochre, 0.95); c.lineWidth = 4; c.stroke();
  c.beginPath(); c.moveTo(lerp(hip[0], sh[0], 0.55) - 4, lerp(hip[1], sh[1], 0.55)); c.lineTo(lerp(hip[0], sh[0], 0.55) + 6, lerp(hip[1], sh[1], 0.55) + 1);
  c.strokeStyle = rgba(PIG.ochre, 0.8); c.lineWidth = 2.4; c.stroke();
  // 頭與羽飾
  c.beginPath(); c.arc(head[0], head[1], 8.5, 0, TAU); c.fillStyle = rgba(PIG.char, 0.97); c.fill();
  c.beginPath();
  c.moveTo(head[0] - 3, head[1] + 5); c.quadraticCurveTo(head[0] - 10, head[1] + 16, head[0] - 16 + Math.sin(t * 1.7) * 1.5, head[1] + 25);
  c.moveTo(head[0] + 1, head[1] + 7); c.quadraticCurveTo(head[0] - 3, head[1] + 19, head[0] - 6 + Math.sin(t * 1.9 + 1) * 1.5, head[1] + 30);
  c.strokeStyle = rgba(PIG.ochre, 0.95); c.lineWidth = 3; c.lineCap = 'round'; c.stroke();
  c.beginPath(); c.moveTo(head[0] - 8, head[1] + 2); c.lineTo(head[0] + 8, head[1] + 3);
  c.strokeStyle = rgba(PIG.ochre, 0.9); c.lineWidth = 2.6; c.stroke();
  // 手臂與武器
  let hand, elbow, fore;
  const hasTool = h.alive && W.tools[tool] > 0;
  if (aim) {
    const back = 26 + 14 * p;
    hand = [sh[0] - dir[0] * back, sh[1] - dir[1] * back + 6];
    elbow = [(sh[0] + hand[0]) / 2 - dir[1] * 6, (sh[1] + hand[1]) / 2 + 9];
  } else if (thr >= 0) {
    const e = 1 - (1 - thr) * (1 - thr);
    const ta = W._lastAng !== undefined ? W._lastAng : -0.7;
    const td = [Math.cos(ta), -Math.sin(ta)];
    hand = [sh[0] + td[0] * lerp(-24, 34, e), sh[1] + td[1] * lerp(-24, 34, e) + 2];
    elbow = [(sh[0] + hand[0]) / 2, (sh[1] + hand[1]) / 2 + 6];
  } else {
    hand = [sh[0] + 13, sh[1] - 26 + breath];
    elbow = [sh[0] + 3, sh[1] - 16];
  }
  fore = aim ? [sh[0] + dir[0] * 30 + 4, sh[1] + dir[1] * 30 - 8] : [sh[0] + 22, sh[1] - 12 + breath];
  c.beginPath();
  limb(c, sh[0], sh[1], elbow[0], elbow[1], hand[0], hand[1], 7.5, 5.5, 4.2);
  limb(c, sh[0] + 2, sh[1] - 1, (sh[0] + fore[0]) / 2 + 2, (sh[1] + fore[1]) / 2 - 3, fore[0], fore[1], 7.5, 5.5, 4.2);
  c.fillStyle = rgba(PIG.char, 0.97); c.fill();
  const toolNow = thr >= 0 ? null : (hasTool ? tool : null);
  c.restore();
  // 武器用世界座標畫（y 朝下）
  const S = 1.22;
  const hx = h.x + hand[0] * S, hy = h.y - hand[1] * S;
  let fireAt = null;
  if (toolNow === 'spear') {
    if (aim) spearPath(c, hx + Math.cos(a) * 66, hy + Math.sin(a) * 66, a, 120);
    else spearPath(c, hx + 6, hy - 92, -1.5, 150);
  } else if (toolNow === 'fire') {
    const ta = aim ? a : -1.35;
    const tip = [hx + Math.cos(ta) * 30, hy + Math.sin(ta) * 30];
    torchPath(c, tip[0], tip[1], ta);
    fireAt = { x: tip[0], y: tip[1] - 2, I: 0.35, seed: 3, s: 0.62 };
  }
  return { hand: [hx, hy], fireAt };
}

// ---------- 猛獁 ----------
const MAM_BODY = (c) => {
  c.moveTo(-142, 150);
  c.bezierCurveTo(-152, 192, -122, 214, -80, 223);
  c.bezierCurveTo(-32, 235, 4, 254, 36, 258);
  c.bezierCurveTo(58, 261, 74, 248, 86, 240);
  c.lineTo(112, 178);
  c.bezierCurveTo(108, 150, 102, 130, 98, 112);
  c.bezierCurveTo(96, 102, 94, 96, 92, 90);
  c.bezierCurveTo(70, 70, 40, 62, 10, 62);
  c.bezierCurveTo(-30, 62, -70, 66, -98, 80);
  c.bezierCurveTo(-122, 92, -136, 112, -142, 150);
  c.closePath();
};
const MAM_HEAD = (c) => {
  c.moveTo(80, 238);
  c.bezierCurveTo(92, 262, 112, 278, 132, 270);
  c.bezierCurveTo(152, 262, 162, 238, 161, 212);
  c.bezierCurveTo(162, 196, 164, 186, 166, 178);
  c.lineTo(142, 160);
  c.bezierCurveTo(128, 150, 112, 140, 100, 128);
  c.bezierCurveTo(92, 150, 82, 200, 80, 238);
  c.closePath();
};
function legPolys(px, py, th, bend, L1, L2, w0, w1, w2) {
  const d1 = [Math.sin(th), -Math.cos(th)];
  const k = [px + d1[0] * L1, py + d1[1] * L1];
  const d2 = [Math.sin(th - bend), -Math.cos(th - bend)];
  const f = [k[0] + d2[0] * L2, k[1] + d2[1] * L2];
  return { pts: [[px, py], k, f], w0, w2, f, d2 };
}
function drawLeg(c, L, fill, outline, alpha = 1) {
  c.beginPath();
  ribbonPath(c, L.pts, L.w0, L.w2);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (outline) { c.strokeStyle = outline; c.lineWidth = 3.4; c.lineJoin = 'round'; c.stroke(); }
  if (fill && outline) {
    // 腳趾甲
    c.beginPath();
    for (let k = -1; k <= 1; k++) { const x = L.f[0] + k * L.w2 * 0.26 + L.d2[0] * 4, y = L.f[1] + L.d2[1] * 4; c.moveTo(x - 3, y + 1); c.lineTo(x + 3, y + 1); }
    c.strokeStyle = rgba(PIG.char, 0.7); c.lineWidth = 2.4; c.stroke();
  }
}
function mamLegs(m) {
  const sp = Math.abs(m.vx);
  const rf = clamp((sp - 60) / 200, 0, 1);
  const mv = clamp(sp / 40, 0, 1);
  const amp = lerp(0.16, 0.38, rf) * mv, bA = lerp(0.16, 0.36, rf) * mv;
  const off = rf > 0.5 ? [0.0, 0.1, 0.5, 0.6] : [0.25, 0.75, 0.0, 0.5];
  return { amp, bA, off, rf };
}
function legSet(m, phase, W) {
  const g = mamLegs(m);
  const mk = (i, px, py, L1, L2) => {
    const ph = TAU * (phase + g.off[i]);
    let ext = 0;
    if (W && m.alive && m.state !== 'sink') ext = clamp(W.groundAt(m.x + px * m.face) - m.y, -40, 40) - Math.sin(m.tilt) * px * m.face * 0;
    return legPolys(px, py, g.amp * Math.sin(ph), g.bA * Math.max(0, Math.cos(ph)), L1, Math.max(14, L2 + ext), 60, 46, 42);
  };
  return {
    nearF: mk(0, 74, 112, 60, 52), farF: mk(1, 90, 116, 60, 54),
    nearH: mk(2, -106, 116, 62, 54), farH: mk(3, -92, 120, 62, 56),
  };
}
function trunkPts(m) {
  const tr = m.trunk, t = P.t;
  const hang = [[164, 178], [180, 116], [158, 62], [184, 30]];
  const gnd = [[164, 178], [192, 112], [196, 30], [168, 40]];
  const up = [[164, 178], [212, 200], [238, 254], [212, 294]];
  const q = tr >= 0 ? gnd : up, k = Math.abs(tr);
  const P4 = hang.map((p, i) => [lerp(p[0], q[i][0], k), lerp(p[1], q[i][1], k)]);
  const run = Math.abs(m.vx) > 150 ? Math.sin(m.legPh * TAU) * 9 : 0;
  P4[2][0] += Math.sin(t * 1.3 + m.breath) * 4 + run; P4[3][0] += Math.sin(t * 1.1 + m.breath) * 6 + run * 1.4;
  return bezPts(P4[0], P4[1], P4[2], P4[3], 12);
}
function paintMammoth(W) {
  const m = W.mam, c = P.ctx, t = P.t;
  if (m.x < P.ox - 400 || m.x > P.ox + P.vw / P.k + 400) return;
  const ochre = rgba(PIG.ochre, 0.93), ochreFar = rgba(PIG.ochreD, 0.95), line = rgba(PIG.char, 0.92);
  const sinking = m.state === 'sink' || (!m.alive && m.how === 'ice');
  c.save();
  let depth = 0;
  if (sinking) {
    const st = m.sinkT;
    depth = Math.min(1, st / 0.5) * 120 + Math.max(0, st - 1.6) * 26;
    depth = Math.min(depth, 196);
    c.beginPath(); c.rect(m.x - 400, 0, 800, 612); c.clip();
  }
  const fall = !m.alive && !sinking ? smooth(clamp(m.deadT / 0.95, 0, 1)) : 0;
  const shake = m.flinch > 0 ? Math.sin(t * 70) * 5 * m.flinch : 0;
  const struggle = sinking && m.alive ? Math.sin(t * 9) * 6 : 0;
  c.translate(m.x + shake + struggle, m.y + depth + fall * 70);
  c.rotate(m.tilt * 0.4 * (1 - fall) + fall * 0.1 * m.fv);
  c.scale(m.fv, -1);
  if (m.rear > 0) { c.translate(-100, 0); c.rotate(m.rear * 0.26); c.translate(100, 0); }
  if (sinking && m.alive) c.rotate(Math.sin(t * 5.5) * 0.06);
  const bob = Math.abs(m.vx) > 150 ? Math.abs(Math.sin(m.legPh * TAU)) * 7 : Math.sin(m.legPh * TAU * 2) * 1.6;
  const breathe = 1 + Math.sin(m.breath * 1.7) * 0.008;
  const legs = legSet(m, m.legPh, W);
  if (fall > 0) for (const k of ['nearF', 'farF', 'nearH', 'farH']) {
    const L = legs[k], [p0, p1, p2] = L.pts, f = 1 - 0.62 * fall;
    L.pts = [p0, [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f], [p0[0] + (p2[0] - p0[0]) * f + 18 * fall, p0[1] + (p2[1] - p0[1]) * f]];
    L.f = L.pts[2];
  }
  // 遠側的腿與象牙
  drawLeg(c, legs.farF, ochreFar, rgba(PIG.char, 0.75));
  drawLeg(c, legs.farH, ochreFar, rgba(PIG.char, 0.75));
  c.save();
  c.translate(0, bob);
  c.scale(1, breathe);
  // 頭的轉動
  const headRot = (fn) => { c.save(); c.translate(92, 205); c.rotate(m.head); c.translate(-92, -205); fn(); c.restore(); };
  headRot(() => {
    const tk = bezPts([148, 162], [190, 126], [246, 128], [250, 184], 10);
    c.beginPath(); ribbonPath(c, tk, 17, 5);
    c.fillStyle = rgba([196, 184, 162], 0.9); c.fill();
    c.strokeStyle = rgba(PIG.char, 0.7); c.lineWidth = 2.2; c.stroke();
  });
  // 近側的腿（奔跑時多畫兩組殘影，像肖維洞穴的畫法）
  const g0 = mamLegs(m);
  if (g0.rf > 0.6) {
    for (const [dp, al] of [[-0.07, 0.26], [-0.14, 0.12]]) {
      const ghost = legSet(m, m.legPh + dp, W);
      drawLeg(c, ghost.nearF, null, rgba(PIG.char, al));
      drawLeg(c, ghost.nearH, null, rgba(PIG.char, al));
    }
  }
  drawLeg(c, legs.nearF, ochre, line);
  drawLeg(c, legs.nearH, ochre, line);
  // 腿上的毛
  c.beginPath();
  for (const L of [legs.nearF, legs.nearH]) {
    const [a, b] = L.pts;
    for (let k = 0; k < 6; k++) {
      const u = k / 6;
      const x = lerp(a[0], b[0], u) - 18, y = lerp(a[1], b[1], u);
      c.moveTo(x, y); c.lineTo(x - 6 + jit(k + a[0], 1.5), y - 14);
    }
  }
  c.strokeStyle = rgba(PIG.char, 0.5); c.lineWidth = 2; c.stroke();
  // 身體
  c.beginPath(); MAM_BODY(c);
  c.fillStyle = ochre; c.fill();
  c.save();
  c.clip();
  const g = c.createLinearGradient(0, 262, 0, 150);
  g.addColorStop(0, rgba(PIG.mang, 0.85)); g.addColorStop(0.45, rgba(PIG.mang, 0.4)); g.addColorStop(1, rgba(PIG.mang, 0));
  c.fillStyle = g; c.fillRect(-170, 140, 300, 130);
  const g2 = c.createLinearGradient(0, 60, 0, 120);
  g2.addColorStop(0, rgba(PIG.ochreD, 0.75)); g2.addColorStop(1, rgba(PIG.ochreD, 0));
  c.fillStyle = g2; c.fillRect(-170, 55, 300, 70);
  // 背上的毛
  c.beginPath();
  for (let i = 0; i < 26; i++) {
    const u = i / 25;
    const [x, y] = bez([-130, 196], [-60, 240], [0, 262], [70, 252], u);
    c.moveTo(x + jit(i * 3, 1.2), y - 2);
    c.lineTo(x - 6 + jit(i * 3 + 1, 2), y - 22 - hashi(i, 12) * 14);
  }
  c.strokeStyle = rgba(PIG.char, 0.55); c.lineWidth = 2.2; c.stroke();
  // 心（要害）
  c.beginPath();
  c.arc(46, 146, 7, 0, TAU); c.arc(58, 146, 7, 0, TAU);
  c.moveTo(40, 143); c.lineTo(52, 126); c.lineTo(64, 143);
  c.fillStyle = rgba([92, 24, 18], 0.55); c.fill();
  c.restore();
  // 頭、鼻、近側象牙
  headRot(() => {
    c.beginPath(); MAM_HEAD(c);
    c.fillStyle = ochre; c.fill();
    c.save(); c.clip();
    const gh = c.createLinearGradient(0, 280, 0, 200);
    gh.addColorStop(0, rgba(PIG.mang, 0.85)); gh.addColorStop(1, rgba(PIG.mang, 0));
    c.fillStyle = gh; c.fillRect(70, 190, 110, 95);
    c.restore();
    // 鼻
    const tp = trunkPts(m);
    c.beginPath(); ribbonPath(c, tp, 28, 10);
    c.fillStyle = ochre; c.fill();
    c.strokeStyle = line; c.lineWidth = 4; c.lineJoin = 'round'; c.stroke();
    c.beginPath();
    for (let i = 3; i < tp.length - 1; i += 2) {
      const [x, y] = tp[i], [x2, y2] = tp[i + 1];
      const dx = x2 - x, dy = y2 - y, d = Math.hypot(dx, dy) || 1;
      const w = lerp(12, 5, i / tp.length);
      c.moveTo(x - (dy / d) * w, y + (dx / d) * w); c.lineTo(x + (dy / d) * w * 0.6, y - (dx / d) * w * 0.6);
    }
    c.strokeStyle = rgba(PIG.char, 0.45); c.lineWidth = 1.8; c.stroke();
    // 頭的輪廓
    c.beginPath();
    c.moveTo(80 + jit(901, 1), 238);
    c.bezierCurveTo(92, 262, 112, 278 + jit(902, 1.2), 132, 270);
    c.bezierCurveTo(152, 262, 162, 238, 161, 212);
    c.bezierCurveTo(162, 196, 164, 186, 166, 178);
    c.moveTo(142, 160);
    c.bezierCurveTo(128, 150, 112, 140, 100, 128);
    c.strokeStyle = line; c.lineWidth = 5; c.lineCap = 'round'; c.stroke();
    // 耳、眼
    c.beginPath(); c.ellipse(104, 208, 12, 17, -0.2, 0, TAU);
    c.strokeStyle = rgba(PIG.char, 0.6); c.lineWidth = 2.4; c.stroke();
    c.beginPath(); c.ellipse(132, 214, 5, 3.2, -0.15, 0, TAU);
    c.fillStyle = m.rage > 0.2 && m.alive ? rgba([150, 20, 10], 1) : rgba(PIG.char, 1); c.fill();
    if (!m.alive) { c.beginPath(); c.moveTo(126, 210); c.lineTo(138, 218); c.moveTo(138, 210); c.lineTo(126, 218); c.strokeStyle = rgba(PIG.char, 1); c.lineWidth = 2; c.stroke(); }
    // 近側象牙
    const tk = bezPts([138, 158], [178, 116], [238, 116], [240, 178], 12);
    c.beginPath(); ribbonPath(c, tk, 22, 6);
    c.fillStyle = rgba(PIG.white, 0.97); c.fill();
    c.strokeStyle = rgba(PIG.char, 0.88); c.lineWidth = 2.8; c.stroke();
    // 吼叫的聲紋
    if (m.trumpT > 0.15 && m.alive) {
      const [ex, ey] = tp[tp.length - 1];
      c.beginPath();
      for (let k = 0; k < 3; k++) {
        const r = 16 + k * 13 + ((t * 60) % 13);
        c.moveTo(ex + r * Math.cos(0.2), ey + r * Math.sin(0.2));
        c.arc(ex, ey, r, 0.2, 1.3);
      }
      c.strokeStyle = rgba(PIG.char, 0.55 * Math.min(1, m.trumpT)); c.lineWidth = 2.2; c.stroke();
    }
  });
  // 肚子下垂的長毛
  c.beginPath();
  const hairSwing = Math.abs(m.vx) > 120 ? -10 : -3;
  for (let i = 0; i < 44; i++) {
    const u = i / 43;
    const [x, y] = bez([98, 100], [60, 64], [-40, 58], [-110, 86], u);
    const len = 26 + hashi(i, 77) * 22 + Math.sin(u * Math.PI) * 14;
    c.moveTo(x + jit(i * 2 + 50, 1), y + 3);
    c.quadraticCurveTo(x + hairSwing * 0.3, y - len * 0.5, x + hairSwing + jit(i * 2 + 51, 2), y - len);
  }
  for (let i = 0; i < 9; i++) {
    const [x, y] = bez([100, 128], [98, 112], [96, 100], [94, 92], i / 8);
    c.moveTo(x, y); c.lineTo(x + hairSwing - 4, y - 24 - hashi(i, 79) * 12);
  }
  c.strokeStyle = rgba(PIG.char, 0.82); c.lineWidth = 2.3; c.lineCap = 'round'; c.stroke();
  // 身體輪廓
  c.beginPath();
  c.moveTo(-142, 150);
  c.bezierCurveTo(-152, 192, -122 + jit(5, 1), 214, -80, 223 + jit(6, 1));
  c.bezierCurveTo(-32, 235, 4, 254 + jit(7, 1.2), 36, 258);
  c.bezierCurveTo(58, 261, 74, 248, 86, 240);
  c.moveTo(-98, 80);
  c.bezierCurveTo(-122, 92, -136, 112, -142, 150);
  c.strokeStyle = line; c.lineWidth = 5.5; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  c.beginPath();
  c.moveTo(-142, 150); c.quadraticCurveTo(-158, 140, -160 + jit(8, 2), 118);
  c.strokeStyle = line; c.lineWidth = 4; c.stroke();
  // 扎在身上的矛與血
  for (const s of m.spears) {
    const dx = Math.cos(s.la), dy = Math.sin(s.la);
    const ex = s.lx - dx * 98, ey = s.ly - dy * 98;
    c.beginPath(); c.moveTo(s.lx - dx * 6, s.ly - dy * 6); c.lineTo(ex, ey);
    c.strokeStyle = rgba(PIG.char, 0.95); c.lineWidth = 3.4; c.stroke();
    c.beginPath();
    for (let k = 0; k < 2; k++) {
      const px = ex + dx * (8 + k * 9), py = ey + dy * (8 + k * 9);
      c.moveTo(px, py); c.lineTo(px - dx * 9 - dy * 7, py - dy * 9 + dx * 7);
      c.moveTo(px, py); c.lineTo(px - dx * 9 + dy * 7, py - dy * 9 - dx * 7);
    }
    c.strokeStyle = rgba(PIG.ochre, 0.9); c.lineWidth = 2; c.stroke();
  }
  for (const w of m.wounds) {
    const L = Math.min(34, 6 + w.t * 9);
    c.beginPath();
    c.moveTo(w.lx - 3, w.ly + 2); c.lineTo(w.lx - 1, w.ly - L); c.lineTo(w.lx + 3, w.ly - L * 0.5); c.lineTo(w.lx + 4, w.ly + 2);
    c.fillStyle = rgba([120, 18, 12], 0.9); c.fill();
  }
  c.restore();
  c.restore();
  // 沉下去時的水花
  if (sinking) {
    c.beginPath();
    for (let k = 0; k < 6; k++) {
      const x = m.x + (k - 2.5) * 46 + Math.sin(t * 3 + k) * 8;
      const h = (m.alive ? 10 + Math.abs(Math.sin(t * 6 + k * 1.3)) * 16 : 4);
      c.moveTo(x - 10, 612); c.quadraticCurveTo(x, 612 - h, x + 10, 612);
    }
    c.strokeStyle = rgba(PIG.white, 0.75); c.lineWidth = 2.4; c.stroke();
  }
}

// ---------- 飛行中的東西 ----------
function paintProj(W) {
  const p = W.proj;
  if (!p) return null;
  const c = P.ctx;
  if (p.trail.length > 4) {
    c.beginPath();
    c.moveTo(p.trail[0], p.trail[1]);
    for (let i = 2; i < p.trail.length; i += 2) c.lineTo(p.trail[i], p.trail[i + 1]);
    c.strokeStyle = rgba(p.kind === 'fire' ? PIG.char : PIG.char, 0.14); c.lineWidth = p.kind === 'fire' ? 6 : 3; c.lineCap = 'round'; c.stroke();
  }
  if (p.kind === 'spear') {
    spearPath(c, p.x + Math.cos(p.ang) * 56, p.y + Math.sin(p.ang) * 56, p.ang, 120);
    return null;
  }
  const hx = p.x + Math.cos(p.ang) * 24, hy = p.y + Math.sin(p.ang) * 24;
  torchPath(c, hx, hy, p.ang);
  return { x: hx, y: hy, I: 0.4, seed: 7, s: 0.6 };
}
