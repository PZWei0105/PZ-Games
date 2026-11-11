// ===== 洞壁上前人留下的舊畫（褪色、只畫一次，烤進岩面） =====
function makeDecor(seed) {
  const cv = document.createElement('canvas');
  cv.width = 2048; cv.height = 1024;
  const c = cv.getContext('2d');
  const sx = cv.width / (WALL.x1 - WALL.x0), sy = cv.height / (WALL.y1 - WALL.y0);
  c.setTransform(sx, 0, 0, sy, -WALL.x0 * sx, -WALL.y0 * sy);
  const R = mulberry32(seed * 7 + 3);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const red = (a) => rgba([150, 56, 34], a), blk = (a) => rgba([36, 26, 22], a), yel = (a) => rgba([190, 132, 60], a);

  // 負像手印
  const hand = (x, y, s, rot, col) => {
    c.save(); c.translate(x, y); c.rotate(rot);
    const pts = [];
    for (let i = 0; i < 900; i++) {
      const a = R() * TAU, r = Math.pow(R(), 0.55) * s * 1.7;
      const px = Math.cos(a) * r, py = Math.sin(a) * r * 1.15;
      const lx = px / s, ly = py / s;
      let inside = lx * lx / 0.4 + (ly - 0.2) * (ly - 0.2) / 0.34 < 1;
      const F = [[-0.46, -0.6], [-0.17, -1.0], [0.1, -1.06], [0.36, -0.9], [0.66, -0.2]];
      for (const [fx, fy] of F) {
        const bx = fx * 0.5, by = 0, dx = fx - bx, dy = fy - by, L2 = dx * dx + dy * dy;
        const t = clamp(((lx - bx) * dx + (ly - by) * dy) / L2, 0, 1);
        if (Math.hypot(lx - bx - dx * t, ly - by - dy * t) < 0.13) inside = true;
      }
      if (!inside) pts.push(px, py, (0.6 + R() * 1.8) * (1 - r / (s * 1.9)));
    }
    c.fillStyle = col;
    for (let i = 0; i < pts.length; i += 3) { c.beginPath(); c.arc(pts[i], pts[i + 1], Math.max(0.4, pts[i + 2]) * 1.6, 0, TAU); c.fill(); }
    c.restore();
  };
  // 正像手印
  const palm = (x, y, s, rot, col) => {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    c.beginPath(); c.ellipse(0, 0.2, 0.62, 0.58, 0, 0, TAU);
    for (const [fx, fy, l] of [[-0.48, -0.25, 0.6], [-0.18, -0.45, 0.8], [0.1, -0.48, 0.85], [0.36, -0.4, 0.7], [0.66, 0.0, 0.5]]) {
      c.moveTo(fx, fy); c.ellipse(fx, fy - l * 0.45, 0.12, l * 0.5, 0, 0, TAU);
    }
    c.fillStyle = col; c.fill();
    c.restore();
  };
  // 舊的馬、野牛、鹿
  const horse = (x, y, s, col, w, fill) => {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath();
    c.moveTo(-60, -40); c.bezierCurveTo(-40, -62, 30, -60, 50, -48);
    c.bezierCurveTo(62, -62, 72, -84, 88, -92); c.bezierCurveTo(102, -97, 114, -86, 118, -74);
    c.lineTo(112, -66); c.bezierCurveTo(98, -70, 86, -60, 76, -44);
    c.bezierCurveTo(70, -22, 52, -14, 40, -12); c.bezierCurveTo(10, -6, -40, -8, -58, -16);
    c.bezierCurveTo(-70, -22, -70, -34, -60, -40);
    if (fill) { c.fillStyle = fill; c.fill(); }
    c.moveTo(40, -14); c.lineTo(46, 22); c.moveTo(28, -10); c.lineTo(22, 22);
    c.moveTo(-40, -12); c.lineTo(-48, 20); c.moveTo(-52, -16); c.lineTo(-62, 18);
    c.moveTo(-62, -36); c.quadraticCurveTo(-82, -30, -86, -4);
    for (let i = 0; i < 7; i++) { const u = i / 6; c.moveTo(56 + u * 30, -52 - u * 38); c.lineTo(50 + u * 30, -60 - u * 40); }
    c.strokeStyle = col; c.lineWidth = w / s; c.stroke();
    c.restore();
  };
  const bison = (x, y, s, col, w, fill) => {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath();
    c.moveTo(-70, -36); c.bezierCurveTo(-60, -58, -20, -60, 10, -70);
    c.bezierCurveTo(30, -88, 52, -84, 62, -66); c.bezierCurveTo(74, -58, 86, -44, 88, -26);
    c.lineTo(80, -18); c.bezierCurveTo(66, -22, 60, -12, 52, -6);
    c.bezierCurveTo(20, -4, -30, -2, -60, -10); c.bezierCurveTo(-74, -16, -76, -28, -70, -36);
    if (fill) { c.fillStyle = fill; c.fill(); }
    c.moveTo(70, -56); c.quadraticCurveTo(86, -66, 82, -78);
    c.moveTo(50, -6); c.lineTo(54, 24); c.moveTo(36, -4); c.lineTo(32, 24); c.moveTo(-44, -6); c.lineTo(-50, 22); c.moveTo(-58, -10); c.lineTo(-66, 20);
    c.moveTo(-72, -32); c.quadraticCurveTo(-88, -26, -86, -6);
    c.strokeStyle = col; c.lineWidth = w / s; c.stroke();
    c.restore();
  };
  const deer = (x, y, s, col, w) => {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath();
    c.moveTo(-50, -40); c.bezierCurveTo(-30, -52, 20, -52, 40, -44);
    c.bezierCurveTo(52, -60, 58, -78, 68, -86); c.lineTo(84, -80); c.lineTo(70, -70);
    c.bezierCurveTo(64, -56, 56, -36, 44, -26); c.bezierCurveTo(16, -18, -30, -20, -48, -26); c.closePath();
    c.moveTo(66, -88); c.lineTo(58, -118); c.lineTo(46, -128); c.moveTo(58, -118); c.lineTo(66, -132);
    c.moveTo(70, -88); c.lineTo(80, -116); c.lineTo(94, -124); c.moveTo(80, -116); c.lineTo(76, -132);
    c.moveTo(36, -26); c.lineTo(40, 18); c.moveTo(26, -22); c.lineTo(20, 18); c.moveTo(-34, -22); c.lineTo(-38, 16); c.moveTo(-44, -26); c.lineTo(-52, 14);
    c.strokeStyle = col; c.lineWidth = w / s; c.stroke();
    c.restore();
  };
  const dots = (x, y, n, gap, col, r = 5) => { c.fillStyle = col; for (let i = 0; i < n; i++) { c.beginPath(); c.arc(x + i * gap + (R() - 0.5) * 4, y + (R() - 0.5) * 6, r * (0.8 + R() * 0.4), 0, TAU); c.fill(); } };
  const grid = (x, y, col) => {
    c.beginPath();
    for (let i = 0; i < 4; i++) { c.moveTo(x + i * 12, y); c.lineTo(x + i * 12 + 4, y + 40); }
    c.moveTo(x - 4, y + 12); c.lineTo(x + 44, y + 10); c.moveTo(x - 2, y + 28); c.lineTo(x + 46, y + 26);
    c.strokeStyle = col; c.lineWidth = 3.4; c.stroke();
  };
  const soot = (x, y) => {
    for (let i = 0; i < 6; i++) {
      c.beginPath(); c.moveTo(x + i * 5, y + R() * 6); c.lineTo(x + i * 5 + 20 + R() * 20, y - 30 - R() * 20);
      c.strokeStyle = blk(0.12 + R() * 0.1); c.lineWidth = 3 + R() * 4; c.stroke();
    }
  };

  // 上方的牆面
  hand(70, 130, 46, -0.2, red(0.28));
  hand(-160, 300, 40, 0.3, red(0.22));
  hand(760, 70, 44, 0.15, blk(0.2));
  hand(1500, 120, 48, -0.35, red(0.26));
  hand(2380, 230, 44, 0.2, red(0.24));
  hand(2620, 120, 40, -0.1, blk(0.18));
  palm(250, 150, 36, 0.2, red(0.22));
  palm(1980, 90, 34, -0.3, red(0.2));
  horse(520, 250, 1.5, blk(0.2), 5, null);
  bison(1150, 190, 1.7, red(0.2), 5, red(0.08));
  deer(1820, 290, 1.4, blk(0.18), 4.5);
  horse(2620, 360, 1.2, red(0.18), 4.5, red(0.05));
  bison(-300, 120, 1.4, blk(0.18), 5, null);
  dots(330, 330, 9, 22, red(0.3));
  dots(1300, 80, 7, 20, red(0.26));
  dots(2100, 420, 6, 24, blk(0.22));
  grid(880, 300, red(0.24));
  grid(2240, 60, blk(0.2));
  soot(420, 40); soot(1640, -40); soot(2500, 30);
  // 下方的牆面
  hand(980, 900, 48, 0.1, red(0.26));
  hand(1860, 860, 44, -0.25, red(0.22));
  hand(380, 960, 42, 0.35, blk(0.18));
  palm(1380, 960, 38, 0.1, red(0.2));
  palm(2400, 900, 34, -0.2, yel(0.22));
  dots(560, 830, 10, 24, red(0.26));
  dots(1520, 800, 8, 22, blk(0.2));
  dots(2200, 1010, 7, 26, red(0.24));
  grid(120, 840, red(0.22));
  horse(2660, 820, 1.3, blk(0.16), 4.5, null);
  bison(-260, 900, 1.3, red(0.18), 4.5, red(0.06));
  return cv;
}
