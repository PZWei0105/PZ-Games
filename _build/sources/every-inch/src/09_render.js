/* ───────────── 戰場繪製：天空、遠山、雪地、掩體、旗子、單位、彈道、天氣 ───────────── */
const BG = { sky: null, far: null, mid: null, ground: null, fore: null, theme: null, flakes: [] };
const GROUND_Y0 = 58, GROUND_Y1 = 330;

const THEMES = {
  snow: { sky: ['#9fb6c9', '#cfdbe4', '#eef1ee'], far: ['#b6c6d4', '#d9e3eb'], mid: '#7d8f9c', ground: ['#e8edf2', '#dfe6ec', '#d2dbe3'], dirt: '#8f8173', tree: '#3f5a52', snowCap: '#f6f9fb', night: 0 },
  dusk: { sky: ['#4d5a7a', '#c98a72', '#f1c08e'], far: ['#7d7790', '#a7909a'], mid: '#4c4c5e', ground: ['#e6dfe0', '#d8d0d4', '#c9c1c8'], dirt: '#7d6f6a', tree: '#33403f', snowCap: '#f4ecec', night: 0.1 },
  night: { sky: ['#0e1426', '#1f2b44', '#3a4a66'], far: ['#2b3650', '#3c4a66'], mid: '#1c2438', ground: ['#aab6c6', '#9aa7b8', '#8a97a8'], dirt: '#4f4a52', tree: '#162024', snowCap: '#c9d5e3', night: 0.55 },
  ruins: { sky: ['#8f9aa6', '#c4c8c8', '#e2ddd2'], far: ['#a5aab0', '#c7c9ca'], mid: '#6d7176', ground: ['#e2e3e2', '#d6d7d5', '#c8cac8'], dirt: '#7c736a', tree: '#4a4d4d', snowCap: '#f2f3f2', night: 0, town: true },
};

function buildBattleBG(themeKey, seed) {
  const T = THEMES[themeKey] || THEMES.snow; BG.theme = T;
  const R = mulberry32(seed || 7);
  // 遠山（寬條，水平重複）
  const FW = 1600;
  BG.far = mkSpr(null, 0, -170, FW, 0, (g) => {
    for (let layer = 0; layer < 2; layer++) {
      const col = T.far[layer], base = layer ? -40 : -70, amp = layer ? 60 : 90;
      g.fillStyle = col; g.beginPath(); g.moveTo(0, 0);
      let y = base;
      for (let x = 0; x <= FW; x += 40) {
        y = base - amp * (0.4 + 0.6 * Math.abs(Math.sin(x * 0.004 + layer * 2 + R() * 0.3))) * (0.6 + R() * 0.4);
        g.lineTo(x, y);
      }
      g.lineTo(FW, 0); g.closePath(); g.fill();
      // 山頂積雪
      g.fillStyle = rgba(T.snowCap, layer ? 0.5 : 0.7);
      for (let x = 0; x < FW; x += 40) { const h = rnd(4, 12); g.beginPath(); g.moveTo(x + 10, base - amp * 0.9); g.lineTo(x + 20, base - amp * 0.9 - h); g.lineTo(x + 30, base - amp * 0.9); g.fill(); }
    }
  }, 1);
  // 中景：雪松林或城市廢墟
  BG.mid = mkSpr(null, 0, -120, FW, 0, (g) => {
    g.fillStyle = T.mid;
    if (T.town) {
      for (let x = 0; x < FW; x += rnd(40, 90)) {
        const w = rnd(30, 70), h = rnd(30, 100);
        g.fillRect(x, -h, w, h);
        g.fillStyle = rgba('#000000', 0.25); for (let wy = -h + 8; wy < -6; wy += 12) for (let wx = x + 5; wx < x + w - 6; wx += 10) if (R() > 0.4) g.fillRect(wx, wy, 4, 5);
        g.fillStyle = T.mid;
        if (R() > 0.5) { g.beginPath(); g.moveTo(x, -h); g.lineTo(x + w * 0.3, -h - 12); g.lineTo(x + w * 0.5, -h + 4); g.closePath(); g.fill(); }
      }
    } else {
      for (let x = -10; x < FW; x += rnd(8, 18)) {
        const h = rnd(34, 78), w = h * 0.36;
        g.fillStyle = mix(T.mid, T.tree, R() * 0.6);
        g.beginPath(); g.moveTo(x, -h); g.lineTo(x + w, 0); g.lineTo(x - w, 0); g.closePath(); g.fill();
        g.fillStyle = rgba(T.snowCap, 0.55);
        for (let k = 0; k < 3; k++) { const yy = -h + (k + 0.5) * h / 3.6, ww = w * (k + 1) / 3.6; g.beginPath(); g.moveTo(x, yy - 4); g.lineTo(x + ww, yy + 3); g.lineTo(x - ww, yy + 3); g.closePath(); g.fill(); }
      }
    }
    g.fillStyle = rgba(T.ground[0], 0.9); g.fillRect(0, -6, FW, 6);
  }, 1);
  // 地面：整片戰場預先畫好
  const W = FIELD_W + 600, H = GROUND_Y1 - GROUND_Y0 + 80;
  BG.ground = mkSpr(null, -300, GROUND_Y0, FIELD_W + 300, GROUND_Y1 + 80, (g) => {
    g.fillStyle = lg(g, 0, GROUND_Y0, 0, GROUND_Y1 + 80, [0, T.ground[2], 0.25, T.ground[1], 1, T.ground[0]]);
    g.fillRect(-300, GROUND_Y0, W, H);
    // 遠方地平線的霧
    g.fillStyle = lg(g, 0, GROUND_Y0, 0, GROUND_Y0 + 40, [0, rgba(T.sky[2], 0.8), 1, rgba(T.sky[2], 0)]); g.fillRect(-300, GROUND_Y0, W, 40);
    // 泥巴、雪堆、車轍
    for (let i = 0; i < 90; i++) {
      const x = -300 + R() * W, y = GROUND_Y0 + 30 + R() * (H - 60), w = 20 + R() * 90;
      g.fillStyle = rgba(T.dirt, 0.05 + R() * 0.1); g.beginPath(); g.ellipse(x, y, w, w * 0.16, 0, 0, TAU); g.fill();
    }
    for (let l = 0; l < 3; l++) {
      const y = LANES[l] + 10;
      g.strokeStyle = rgba(T.dirt, 0.12); g.lineWidth = 3;
      for (const o of [-6, 6]) { g.beginPath(); g.moveTo(-300, y + o); for (let x = -300; x < FIELD_W + 300; x += 60) g.lineTo(x, y + o + Math.sin(x * 0.01 + l) * 2); g.stroke(); }
    }
    for (let i = 0; i < 1600; i++) { // 雪地顆粒
      const x = -300 + R() * W, y = GROUND_Y0 + R() * H;
      g.fillStyle = R() > 0.5 ? 'rgba(255,255,255,.55)' : rgba(T.dirt, 0.12); g.fillRect(x, y, 1.2, 0.8);
    }
    for (let i = 0; i < 40; i++) { // 雪堆
      const x = -300 + R() * W, y = GROUND_Y0 + 20 + R() * (H - 40), w = 12 + R() * 40;
      g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(x, y, w, w * 0.22, 0, Math.PI, TAU); g.fill();
      g.fillStyle = rgba(T.dirt, 0.08); g.beginPath(); g.ellipse(x, y + 1, w, w * 0.1, 0, 0, Math.PI); g.fill();
    }
    // 三條線被踩出來的雪路
    for (let l = 0; l < 3; l++) {
      const y = LANES[l] + 4;
      for (let x = -300; x < FIELD_W + 300; x += 14) {
        const w = 16 + R() * 18, yy = y + Math.sin(x * 0.013 + l * 2) * 4;
        g.fillStyle = rgba(T.dirt, 0.04 + R() * 0.05); g.beginPath(); g.ellipse(x, yy, w, 9 + R() * 5, 0, 0, TAU); g.fill();
      }
      for (let x = -280; x < FIELD_W + 280; x += 9) { // 腳印
        if (R() < 0.45) continue;
        const yy = y + rnd(-12, 12);
        g.fillStyle = rgba(T.dirt, 0.13); g.beginPath(); g.ellipse(x, yy, 1.6, 0.8, 0, 0, TAU); g.fill();
      }
    }
    // 上一場仗留下的舊彈坑
    for (let i = 0; i < 26; i++) {
      const x = 260 + R() * (FIELD_W - 520), y = GROUND_Y0 + 40 + R() * (H - 90), r = 8 + R() * 16;
      g.fillStyle = rgba('#5d534b', 0.18); g.beginPath(); g.ellipse(x, y, r * 1.5, r * 0.5, 0, 0, TAU); g.fill();
      g.fillStyle = rgba('#3d3632', 0.22); g.beginPath(); g.ellipse(x, y + 1, r * 0.9, r * 0.28, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(x - r * 0.2, y - r * 0.32, r * 1.2, r * 0.2, 0, Math.PI, TAU); g.fill();
    }
    // 兩邊陣地的壕溝線
    for (const [x0, x1] of [[150, 330], [FIELD_W - 330, FIELD_W - 150]]) for (let l = 0; l < 3; l++) {
      const y = LANES[l] + 16;
      g.fillStyle = rgba('#6d6158', 0.25); g.beginPath(); g.ellipse((x0 + x1) / 2, y, (x1 - x0) / 2, 5, 0, 0, TAU); g.fill();
    }
  }, 1);
  makeDecal(-300, GROUND_Y0, FIELD_W + 600, GROUND_Y1 - GROUND_Y0 + 80, 1.5);
  // 雪花
  BG.flakes = [];
  for (let i = 0; i < 110; i++) BG.flakes.push({ x: Math.random(), y: Math.random(), z: rnd(0.4, 1.6), ph: rnd(0, TAU) });
  // 地形道具
  B.props = [];
  const add = (k, x, y, o) => B.props.push(Object.assign({ k, x, y }, o || {}));
  for (let i = 0; i < 14; i++) add('pine', -200 + R() * (FIELD_W + 400), GROUND_Y0 + 6 + R() * 16, { s: 0.8 + R() * 0.6 });
  for (let i = 0; i < 8; i++) { const l = Math.floor(R() * 3); add(R() > 0.5 ? 'hedgehog' : 'crate', 380 + R() * (FIELD_W - 760), LANES[l] + (R() > 0.5 ? 24 : -22), { s: 0.9 + R() * 0.3 }); }
  for (let i = 0; i < 5; i++) add('rock', R() * FIELD_W, GROUND_Y0 + 10 + R() * 12, { s: 0.8 + R() * 0.8 });
  if (T.town) for (let i = 0; i < 6; i++) add('ruin', 300 + R() * (FIELD_W - 600), GROUND_Y0 + 14 + R() * 8, { s: 0.9 + R() * 0.5, w: 50 + R() * 50 });
  for (let i = 0; i < 18; i++) add('wire', -150 + R() * (FIELD_W + 300), GROUND_Y1 - 10 + R() * 30, { s: 1 });
}

/* ── 道具圖塊 ── */
function propSpr(k) {
  const key = 'prop_' + k; if (SPR[key]) return SPR[key];
  const T = BG.theme || THEMES.snow;
  switch (k) {
    case 'sandbag': return mkSpr(key, -26, -22, 26, 4, (g) => {
      const bag = (x, y, w) => { rr(g, x - w / 2, y - 5.4, w, 7, 3.4); fo(g, lg(g, 0, y - 5, 0, y + 2, [0, '#c2b08a', 0.5, '#a8956d', 1, '#857352'])); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - w / 2 + 2, y - 1); g.lineTo(x + w / 2 - 2, y - 1.4); g.stroke(); };
      for (let i = 0; i < 4; i++) bag(-18 + i * 12, 0, 12.5);
      for (let i = 0; i < 3; i++) bag(-12 + i * 12, -6.5, 12.5);
      for (let i = 0; i < 2; i++) bag(-6 + i * 12, -13, 12.5);
      g.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 2; i++) { g.beginPath(); g.ellipse(-6 + i * 12, -17.6, 5, 1.4, 0, Math.PI, TAU); g.fill(); }
    });
    case 'sandbagD': return mkSpr(key, -26, -14, 26, 4, (g) => {
      const bag = (x, y, w, r) => { g.save(); g.translate(x, y); g.rotate(r); rr(g, -w / 2, -5.4, w, 7, 3.4); fo(g, lg(g, 0, -5, 0, 2, [0, '#b3a27e', 1, '#7a6a4b'])); g.restore(); };
      bag(-16, 0, 12, 0.2); bag(-3, 1, 12, -0.1); bag(11, 0, 12, 0.3); bag(2, -6, 12, -0.4);
    });
    case 'hedgehog': return mkSpr(key, -14, -18, 14, 2, (g) => {
      g.lineCap = 'round';
      for (const [a, b, c, d] of [[-11, 0, 9, -16], [11, 0, -9, -16], [-1, 1, 1, -17]]) { g.strokeStyle = OUT; g.lineWidth = 4.4; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); g.strokeStyle = '#5b5550'; g.lineWidth = 2.4; g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(-4, -15, 8, 1.4);
    });
    case 'crate': return mkSpr(key, -12, -16, 12, 2, (g) => {
      rr(g, -11, -14, 22, 14, 1.4); fo(g, lg(g, 0, -14, 0, 0, [0, '#8a7a50', 1, '#5e5236']));
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-11, -7); g.lineTo(11, -7); g.moveTo(-3, -14); g.lineTo(-3, 0); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(-11, -15.6, 22, 2);
    });
    case 'pine': return mkSpr(key, -24, -86, 24, 2, (g) => {
      rr(g, -2.6, -14, 5.2, 14, 1.2); fo(g, '#4a3a2c', OW * 0.8);
      for (let k = 0; k < 4; k++) {
        const y = -84 + k * 17, w = 9 + k * 4.6;
        g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 24); g.lineTo(-w, y + 24); g.closePath(); fo(g, lg(g, -w, 0, w, 0, [0, shade(T.tree, -0.2), 1, shade(T.tree, 0.15)]), OW * 0.9);
        g.fillStyle = T.snowCap; g.beginPath(); g.moveTo(0, y + 2); g.lineTo(w * 0.8, y + 20); g.quadraticCurveTo(0, y + 15, -w * 0.8, y + 20); g.closePath(); g.fill();
      }
    });
    case 'rock': return mkSpr(key, -16, -14, 16, 2, (g) => {
      g.beginPath(); g.moveTo(-15, 0); g.lineTo(-11, -9); g.lineTo(-2, -13); g.lineTo(9, -10); g.lineTo(15, 0); g.closePath(); fo(g, lg(g, 0, -13, 0, 0, [0, '#9aa0a6', 1, '#5f656b']));
      g.fillStyle = T.snowCap; g.beginPath(); g.moveTo(-10, -9); g.lineTo(-2, -13); g.lineTo(9, -10); g.lineTo(1, -8); g.closePath(); g.fill();
    });
    case 'ruin': return mkSpr(key, -40, -60, 40, 2, (g) => {
      g.beginPath(); g.moveTo(-36, 0); g.lineTo(-36, -44); g.lineTo(-24, -44); g.lineTo(-20, -56); g.lineTo(-10, -48); g.lineTo(-4, -30); g.lineTo(10, -36); g.lineTo(18, -22); g.lineTo(30, -26); g.lineTo(36, 0); g.closePath();
      fo(g, lg(g, 0, -56, 0, 0, [0, '#8e8a86', 1, '#5d5955']));
      g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, -28, -36, 8, 10, 1); g.fill(); rr(g, -12, -24, 8, 10, 1); g.fill();
      g.fillStyle = T.snowCap; g.fillRect(-36, -45.5, 12, 2);
    });
    case 'wire': return mkSpr(key, -30, -12, 30, 2, (g) => {
      g.strokeStyle = '#3a3634'; g.lineWidth = 1.6; for (const x of [-26, 0, 26]) { g.beginPath(); g.moveTo(x - 4, 0); g.lineTo(x + 4, -10); g.moveTo(x + 4, 0); g.lineTo(x - 4, -10); g.stroke(); }
      g.strokeStyle = '#59544f'; g.lineWidth = 0.7;
      for (let k = 0; k < 2; k++) { g.beginPath(); for (let x = -30; x <= 30; x += 2) { const y = -5 + Math.sin(x * 0.7 + k * 2) * 3; x === -30 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
    });
  }
  return null;
}

/* ── 指揮部大樓 ── */
function hqSpr(side, pal) {
  const key = 'hq_' + side + '_' + pal; if (SPR[key]) return SPR[key];
  const v = vpal(pal), us = side === 0;
  return mkSpr(key, -80, -140, 80, 8, (g) => {
    // 天線塔
    g.strokeStyle = OUT; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-40, -70); g.lineTo(-36, -136); g.moveTo(-32, -70); g.lineTo(-36, -136); g.stroke();
    g.strokeStyle = '#6a6e76'; g.lineWidth = 1.1; g.stroke();
    g.strokeStyle = '#6a6e76'; g.lineWidth = 0.8; for (let y = -126; y < -72; y += 10) { g.beginPath(); g.moveTo(-39.4 + (y + 136) * 0.06, y); g.lineTo(-32.6 - (y + 136) * 0.06, y + 8); g.stroke(); }
    // 主體：混凝土碉堡
    g.beginPath(); g.moveTo(-70, 0); g.lineTo(-66, -68); g.lineTo(54, -74); g.lineTo(70, 0); g.closePath();
    fo(g, lg(g, 0, -74, 0, 0, [0, '#a9a9a3', 0.5, '#8d8d87', 1, '#6c6c67']));
    g.fillStyle = 'rgba(0,0,0,.14)'; for (let i = 0; i < 6; i++) g.fillRect(-66 + i * 22, -68, 1, 68);
    // 迷彩網
    g.fillStyle = rgba(v.body, 0.85); g.beginPath(); g.moveTo(-74, -60); g.quadraticCurveTo(-10, -96, 60, -66); g.lineTo(62, -52); g.quadraticCurveTo(-10, -72, -72, -46); g.closePath(); g.fill();
    g.strokeStyle = rgba(OUT, 0.5); g.lineWidth = 0.8; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.moveTo(-60, -66); g.quadraticCurveTo(-10, -94, 50, -70); g.quadraticCurveTo(-10, -86, -60, -63); g.closePath(); g.fill();
    // 射口
    rr(g, 30, -44, 30, 8, 2); fo(g, '#1d1d22');
    rr(g, -48, -40, 22, 40, 2); fo(g, lg(g, 0, -40, 0, 0, [0, '#4d4a46', 1, '#33312e']));
    g.fillStyle = '#ffd36a'; g.fillRect(-44, -34, 4, 3);
    // 沙包牆
    for (let i = 0; i < 7; i++) { rr(g, -72 + i * 21, -12, 22, 12, 5); fo(g, lg(g, 0, -12, 0, 0, [0, '#c2b08a', 1, '#857352'])); }
    // 隊徽
    g.fillStyle = v.accent; g.beginPath(); g.arc(4, -40, 9, 0, TAU); g.fill(); g.lineWidth = 1.4; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = OUT; g.font = '900 11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(us ? '7' : '◆', 4, -39.5);
  }, 3);
}
function hqRuinSpr() {
  if (SPR.hqRuin) return SPR.hqRuin;
  return mkSpr('hqRuin', -80, -60, 80, 8, (g) => {
    g.beginPath(); g.moveTo(-70, 0); g.lineTo(-64, -40); g.lineTo(-40, -52); g.lineTo(-24, -30); g.lineTo(-4, -46); g.lineTo(18, -24); g.lineTo(40, -40); g.lineTo(70, 0); g.closePath();
    fo(g, lg(g, 0, -52, 0, 0, [0, '#55524e', 1, '#2c2a28']));
    for (let i = 0; i < 9; i++) { rr(g, -70 + i * 16, -8 + Math.sin(i) * 3, 15, 9, 4); fo(g, '#6d5f48', OW * 0.7); }
  }, 2);
}

/* ── 旗子 ── */
function drawFlag(c, f) {
  const x = f.x, y = LANES[f.lane] - 2;
  // 旗座
  c.fillStyle = 'rgba(30,40,60,.22)'; c.beginPath(); c.ellipse(x, y, 13, 3.2, 0, 0, TAU); c.fill();
  rr(c, x - 7, y - 6, 14, 6, 2.5); c.fillStyle = '#9b8a66'; c.fill(); c.lineWidth = OW; c.strokeStyle = OUT; c.stroke();
  const H = 74;
  c.lineCap = 'round';
  c.strokeStyle = OUT; c.lineWidth = 3.4; c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x, y - H); c.stroke();
  c.strokeStyle = '#c9ccd2'; c.lineWidth = 1.5; c.stroke();
  dot(c, x, y - H - 1, 2.2, '#e0c060');
  // 旗面：高度跟著佔領進度
  const p = f.prog, k = Math.abs(p);
  if (k < 0.35) { // 沒人的旗點掛著一面破白旗，有人在搶就降下來
    const wk = 1 - k / 0.35;
    c.save(); c.translate(x, y - H + 2 + (1 - wk) * 30); c.globalAlpha = 0.5 + wk * 0.5;
    c.beginPath(); c.moveTo(0, 0);
    for (let i = 0; i <= 5; i++) { const t = i / 5; c.lineTo(t * 24, Math.sin(f.wave - t * 3) * 2.4 * t + (i % 2 ? 1.6 : 0)); }
    for (let i = 5; i >= 0; i--) { const t = i / 5; c.lineTo(t * 24 - (i === 5 ? 3 : 0), Math.sin(f.wave - t * 3) * 2.4 * t + 15 - (i % 2 ? 2.4 : 0)); }
    c.closePath(); c.fillStyle = '#e9e6dc'; c.fill(); c.lineWidth = OW; c.strokeStyle = OUT; c.stroke();
    c.restore();
  }
  if (k > 0.02) {
    const ours = p < 0;
    const pal = ours ? PAL.us : PAL[B.rival.pal];
    const fy = y - 10 - (H - 16) * k;
    const fw = 30, fh = 19, dir = 1;
    c.save(); c.translate(x, fy);
    const pts = [];
    for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([t * fw * dir, Math.sin(f.wave - t * 3.4) * 3.2 * t]); }
    c.beginPath(); c.moveTo(0, 0); for (const q of pts) c.lineTo(q[0], q[1]); for (let i = 6; i >= 0; i--) c.lineTo(pts[i][0], pts[i][1] + fh); c.closePath();
    c.fillStyle = pal.flagA; c.fill(); c.lineWidth = OW; c.strokeStyle = OUT; c.stroke();
    // 徽記
    const mx = pts[3][0], my = pts[3][1] + fh / 2;
    c.fillStyle = pal.flagB;
    if (ours) { c.beginPath(); c.moveTo(mx - 5, my + 4); c.lineTo(mx, my - 5); c.lineTo(mx + 5, my + 4); c.closePath(); c.fill(); c.fillRect(mx - 0.8, my - 1, 1.6, 5); }
    else emblem(c, B.rival.emblem, mx, my, 5, pal.flagB);
    c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); for (let i = 0; i <= 6; i++) c.lineTo(pts[i][0], pts[i][1] + fh * 0.75); for (let i = 6; i >= 0; i--) c.lineTo(pts[i][0], pts[i][1] + fh); c.fill();
    c.restore();
  }
  // 爭奪中：底下一圈進度
  const contested = (f.owner === 0 && p > -0.999) || (f.owner === 1 && p < 0.999) || f.owner === -1;
  if (contested && k < 0.999) {
    c.lineWidth = 2.4; c.strokeStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(x, y - 20, 9, 0, TAU); c.stroke();
    c.strokeStyle = p < 0 ? PAL.us.accent : PAL[B.rival.pal].accent; c.beginPath(); c.arc(x, y - 20, 9, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke();
  }
}
function emblem(c, kind, x, y, s, col) {
  c.fillStyle = col; c.strokeStyle = col;
  if (kind === 'flame') { c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x + s, y, x + s * 0.5, y + s); c.quadraticCurveTo(x, y + s * 0.4, x - s * 0.5, y + s); c.quadraticCurveTo(x - s, y, x, y - s); c.fill(); }
  else if (kind === 'anvil') { c.fillRect(x - s, y - s * 0.6, s * 2, s * 0.6); c.fillRect(x - s * 0.3, y, s * 0.6, s * 0.5); c.fillRect(x - s * 0.7, y + s * 0.5, s * 1.4, s * 0.4); }
  else if (kind === 'wing') { c.beginPath(); c.moveTo(x - s, y + s * 0.4); c.quadraticCurveTo(x, y - s * 1.2, x + s, y - s * 0.6); c.quadraticCurveTo(x + s * 0.2, y, x - s, y + s * 0.4); c.fill(); }
  else { c.beginPath(); c.arc(x, y - s * 0.3, s * 0.55, 0, TAU); c.fill(); c.fillRect(x - s * 0.3, y, s * 0.6, s * 0.7); c.fillRect(x - s * 0.7, y + s * 0.6, s * 1.4, s * 0.35); }
}

/* ── 鏡頭 ── */
function battleCamInit() {
  // 讓「直升機高度～最近一條線的腳」剛好落在上下兩條介面之間
  const top = 54, bot = VIEW.h - 84, w0 = 4, w1 = LANES[2] + 16;
  CAM.z = clamp((bot - top) / (w1 - w0), 0.7, 1.9);
  CAM.y = w0 + (VIEW.h / 2 - top) / CAM.z;
  CAM.baseY = CAM.y;
  CAM.x = 650 + VIEW.w / CAM.z * 0.2; CAM.follow = true; CAM.userT = 0;
  clampCam();
}
function clampCam() {
  const halfW = VIEW.w / 2 / CAM.z;
  const minZ = Math.max(VIEW.w / (FIELD_W + 260), VIEW.h / 520);
  CAM.z = clamp(CAM.z, minZ, 2.6);
  CAM.x = clamp(CAM.x, halfW - 130, FIELD_W + 130 - halfW);
  if (halfW * 2 > FIELD_W + 260) CAM.x = FIELD_W / 2;
  const halfH = VIEW.h / 2 / CAM.z;
  CAM.y = clamp(CAM.y, -60 + halfH * 0.6, 330 - halfH * 0.6);
}
function camFollow(dt) {
  if (!B) return;
  if (CAM.userT > 0) { CAM.userT -= dt; return; }
  if (!CAM.follow) return;
  // 盯著前線：我軍最前面的位置放在畫面左邊三分之一，往右看得到交戰的地方
  let f0 = Math.max(deployZone(0, 0)[1], deployZone(0, 1)[1], deployZone(0, 2)[1]) - 40, f1 = Math.min(deployZone(1, 0)[0], deployZone(1, 1)[0], deployZone(1, 2)[0]) + 40;
  for (const u of B.units) { if (!u.alive || u.cls === 'air') continue; if (u.side === 0) f0 = Math.max(f0, u.x); else f1 = Math.min(f1, u.x); }
  const vw = VIEW.w / CAM.z;
  let tx = clamp((f0 + f1) / 2, f0 - vw * 0.12, f0 + vw * 0.26);
  if (B.over) tx = B.result === 'win' ? HQ_X[1] - 120 : HQ_X[0] + 120;
  CAM.x = damp(CAM.x, tx, 1.2, dt);
  CAM.y = damp(CAM.y, CAM.baseY || CAM.y, 2, dt);
  clampCam();
}

/* ── 一格戰場 ── */
const DRAW = [];
function renderBattle(c) {
  const T = BG.theme || THEMES.snow;
  const shk = SHAKE.a;
  CAM.sx = shk ? Math.sin(SHAKE.t * 1.9) * shk * 0.5 / CAM.z : 0; CAM.sy = shk ? Math.cos(SHAKE.t * 2.3) * shk * 0.4 / CAM.z : 0;
  const dpr = VIEW.dpr;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  // 天空（螢幕座標）
  const skyG = c.createLinearGradient(0, 0, 0, VIEW.h);
  skyG.addColorStop(0, T.sky[0]); skyG.addColorStop(0.55, T.sky[1]); skyG.addColorStop(1, T.sky[2]);
  c.fillStyle = skyG; c.fillRect(0, 0, VIEW.w, VIEW.h);
  // 遠景視差
  const horizonS = worldToScreen(0, GROUND_Y0)[1];
  parallax(c, BG.far, 0.12, horizonS + 4, 0.75);
  parallax(c, BG.mid, 0.35, horizonS + 2, 0.92);
  applyCam(c);
  c.lineJoin = 'round'; c.lineCap = 'round';
  // 地面、痕跡
  dspr(c, BG.ground, 0, 0);
  c.drawImage(DECAL.c, DECAL.x0, DECAL.y0, DECAL.w, DECAL.h);
  // 部署範圍
  if (B.sel && !B.over) drawDeployZones(c);
  // 影子
  c.fillStyle = 'rgba(40,52,72,.2)';
  for (const u of B.units) {
    if (u.gone) continue;
    const s = u.scale || 1;
    if (u.isSoldier) { if (u.para && u.paraY < -2) continue; const ox = u.death && u.death.ox ? u.death.ox : 0; c.beginPath(); c.ellipse(u.x + ox, u.y + 1, 10 * s, 2.6 * s, 0, 0, TAU); c.fill(); }
    else if (u.cls === 'air') { const a = clamp(1 - u.alt / 260, 0.3, 1); c.globalAlpha = a; c.beginPath(); c.ellipse(u.x, u.y + 2, 46 * a, 6 * a, 0, 0, TAU); c.fill(); c.globalAlpha = 1; }
    else { c.beginPath(); c.ellipse(u.x, u.y + 1, 50 * s, 6.5 * s, 0, 0, TAU); c.fill(); }
  }
  drawFx(c, 0);
  // 依深度排序後畫
  DRAW.length = 0;
  for (const p of B.props) if (p.k !== 'wire') DRAW.push(p);
  for (const cv of B.covers) DRAW.push(cv);
  for (const f of B.flags) DRAW.push(f);
  for (const h of B.hq) DRAW.push(h);
  for (const u of B.units) if (!u.gone && (u.cls !== 'air' || u.wreck)) DRAW.push(u);
  DRAW.sort((a, b) => sortY(a) - sortY(b));
  for (const o of DRAW) drawObj(c, o);
  drawProjs(c, false);
  drawFx(c, 1);
  // 空中
  for (const u of B.units) if (!u.gone && u.cls === 'air' && !u.wreck) { c.save(); c.translate(0, -u.alt); if (u.scale) { c.translate(u.x, u.y); c.scale(u.scale, u.scale); c.translate(-u.x, -u.y); } drawVehicle(c, u); c.restore(); drawBars(c, u); }
  drawProjs(c, true);
  drawPlanes(c);
  // 前景鐵絲網
  for (const p of B.props) if (p.k === 'wire') dspr(c, propSpr('wire'), p.x, p.y);
  // 技能瞄準圈
  if (B.sel && B.aim) drawAim(c);
  // 天氣與暗角（螢幕座標）
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawSnow(c, G.dt);
  if (T.night) { c.fillStyle = `rgba(10,16,34,${T.night * 0.5})`; c.fillRect(0, 0, VIEW.w, VIEW.h); }
  if (!BG.vig || BG.vigW !== VIEW.w) { BG.vigW = VIEW.w; BG.vig = c.createRadialGradient(VIEW.w / 2, VIEW.h * 0.55, VIEW.h * 0.35, VIEW.w / 2, VIEW.h * 0.55, VIEW.w * 0.75); BG.vig.addColorStop(0, 'rgba(0,0,0,0)'); BG.vig.addColorStop(1, 'rgba(8,12,20,.38)'); }
  c.fillStyle = BG.vig; c.fillRect(0, 0, VIEW.w, VIEW.h);
}
function sortY(o) { if (o.k === 'pine' || o.k === 'rock' || o.k === 'ruin') return o.y - 200; if (o.cls === 'str') return o.y - 120; if (o.lane !== undefined && o.prog !== undefined) return o.y + 1; return o.y; }
function parallax(c, s, k, baseY, alpha) {
  const z = clamp(CAM.z, 0.75, 1.3);
  const w = s.w * z, h = s.h * z;
  let off = (-(CAM.x) * CAM.z * k) % w; if (off > 0) off -= w;
  c.globalAlpha = alpha;
  for (let x = off; x < VIEW.w; x += w) c.drawImage(s.c, x, baseY - s.oy * z, w, h);
  c.globalAlpha = 1;
}
function drawObj(c, o) {
  if (o.isSoldier) {
    if (o.para && o.paraY < 0) { drawPara(c, o); return; }
    if (o.scale && o.scale !== 1) { c.save(); c.translate(o.x, o.y); c.scale(o.scale, o.scale); c.translate(-o.x, -o.y); drawSoldier(c, o); c.restore(); }
    else drawSoldier(c, o);
    if (o.alive && o.hero) drawBars(c, o);
    if (o.mortar && o.alive) drawMortarTube(c, o);
    return;
  }
  if (o.isVeh) {
    if (o.scale && o.scale !== 1) { c.save(); c.translate(o.x, o.y); c.scale(o.scale, o.scale); c.translate(-o.x, -o.y); drawVehicle(c, o); c.restore(); }
    else drawVehicle(c, o);
    if (o.alive) drawBars(c, o);
    return;
  }
  if (o.prog !== undefined) { drawFlag(c, o); return; }
  if (o.cls === 'str') {
    const s = hqSpr(o.side, o.side ? B.rival.pal : 'us');
    c.save(); c.translate(o.x, o.y + 6); c.scale(o.side ? -1 : 1, 1);
    if (o.dead) dspr(c, hqRuinSpr(), 0, 0);
    else {
      dspr(c, s, 0, 0);
      if (o.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35; dspr(c, s, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
      // 雷達與警示燈
      c.save(); c.translate(26, -78); c.scale(Math.cos(B.t * 1.6), 1); dspr(c, getV('radar', o.side ? B.rival.pal : 'us'), 0, 0); c.restore();
      if (Math.sin(B.t * 5) > 0) { c.globalCompositeOperation = 'lighter'; dspr(c, FXS.gR, -36, -136, 0, 0.18); c.globalCompositeOperation = 'source-over'; }
    }
    c.restore();
    if (!o.dead) { // 血條
      const w = 90, x = o.x - w / 2, y = o.y - 158, k = o.hp / o.max;
      c.fillStyle = 'rgba(10,14,22,.65)'; rr(c, x - 1, y - 1, w + 2, 6, 2); c.fill();
      c.fillStyle = o.side ? '#ff6a4d' : '#8cff5a'; rr(c, x, y, w * k, 4, 1.5); c.fill();
    }
    return;
  }
  if (o.hp !== undefined && o.lane !== undefined) { // 沙包
    dspr(c, propSpr(o.hp > 0 ? 'sandbag' : 'sandbagD'), o.x, o.y);
    return;
  }
  const s = propSpr(o.k); if (s) dspr(c, s, o.x, o.y, 0, o.s || 1);
}
function drawBars(c, u) {
  if (u.hp >= u.maxHp && !u.hero) return;
  const s = u.scale || 1;
  const w = u.isVeh ? 46 * s : 22, h = u.isVeh ? 4 : 3;
  const y = u.isVeh ? (u.cls === 'air' ? u.y - u.alt - 40 * s : u.y - 70 * s) : u.y - 60 * s;
  const x = u.x - w / 2, k = u.hp / u.maxHp;
  c.fillStyle = 'rgba(10,14,22,.6)'; rr(c, x - 1, y - 1, w + 2, h + 2, 2); c.fill();
  c.fillStyle = u.side ? (k > 0.35 ? '#ff7a55' : '#ff3d22') : (k > 0.35 ? '#8cff5a' : '#ffd23d'); rr(c, x, y, Math.max(0.5, w * k), h, 1.5); c.fill();
  if (u.hero) {
    const h2 = HERO[u.hero];
    c.font = '900 8px "PingFang TC","Noto Sans TC",sans-serif'; c.textAlign = 'center';
    c.lineWidth = 2.6; c.strokeStyle = 'rgba(10,12,18,.85)'; c.strokeText(h2.short, u.x, y - 3); c.fillStyle = u.side ? '#ffb39a' : '#f6ffb0'; c.fillText(h2.short, u.x, y - 3);
    if (u.skillT > 0) { c.globalCompositeOperation = 'lighter'; dspr(c, u.side ? FXS.gR : FXS.gG, u.x, u.isVeh ? y + 30 : y + 26, 0, 0.9); c.globalCompositeOperation = 'source-over'; }
  }
}
function drawMortarTube(c, u) {
  const m = u.mortar, x = u.x + u.face * 14, y = u.y;
  c.save(); c.translate(x, y); c.scale(u.face, 1);
  rr(c, -6, -2.4, 12, 3, 1); c.fillStyle = '#3a3c43'; c.fill(); c.lineWidth = OW * 0.8; c.strokeStyle = OUT; c.stroke();
  c.save(); c.translate(0, -2 + m.rec * 1.5); c.rotate(-m.a);
  rr(c, -1, -2.6, 24, 5.2, 1.6); c.fillStyle = lg(c, 0, -2.6, 0, 2.6, [0, '#6a7048', 1, '#3e4228']); c.fill(); c.stroke();
  c.restore();
  c.strokeStyle = OUT; c.lineWidth = 1.6; c.beginPath(); c.moveTo(10, -9); c.lineTo(13, 0); c.stroke();
  c.restore();
}
function drawPara(c, u) {
  const y0 = u.paraY;
  c.save(); c.translate(0, y0);
  const sway = Math.sin(B.t * 2 + u.id) * 0.12;
  c.save(); c.translate(u.x, u.y - 34); c.rotate(sway);
  c.strokeStyle = 'rgba(30,30,30,.6)'; c.lineWidth = 0.7; c.beginPath(); for (const x of [-20, -8, 8, 20]) { c.moveTo(0, 0); c.lineTo(x, -46); } c.stroke();
  c.beginPath(); c.moveTo(-24, -44); c.quadraticCurveTo(0, -78, 24, -44); c.quadraticCurveTo(12, -50, 0, -46); c.quadraticCurveTo(-12, -50, -24, -44); c.closePath();
  c.fillStyle = u.side ? '#d9c8b8' : '#c9d6a8'; c.fill(); c.lineWidth = OW; c.strokeStyle = OUT; c.stroke();
  c.restore();
  drawSoldier(c, u);
  c.restore();
}
function drawDeployZones(c) {
  const sel = B.sel, isAbil = !!ABIL[sel];
  if (isAbil) {
    for (let l = 0; l < 3; l++) { c.fillStyle = 'rgba(255,220,120,.08)'; c.fillRect(0, LANES[l] - 26, FIELD_W, 52); }
    return;
  }
  for (let l = 0; l < 3; l++) {
    const z = deployZone(0, l), y = LANES[l];
    const pulse = 0.16 + Math.sin(G.rt * 5) * 0.05;
    c.fillStyle = `rgba(140,255,90,${pulse})`; rr(c, z[0], y - 24, z[1] - z[0], 46, 10); c.fill();
    c.strokeStyle = 'rgba(160,255,110,.75)'; c.lineWidth = 1.6; c.setLineDash([6, 5]); c.lineDashOffset = -G.rt * 20; c.stroke(); c.setLineDash([]);
    c.font = '900 13px "PingFang TC","Noto Sans TC",sans-serif'; c.textAlign = 'left'; c.fillStyle = 'rgba(20,40,20,.55)';
    c.fillText(['北線', '中路', '南線'][l], z[0] + 8, y + 5);
    // 禁區
    c.fillStyle = 'rgba(255,70,50,.06)'; c.fillRect(z[1], y - 24, FIELD_W - z[1], 46);
  }
}
function drawAim(c) {
  const a = B.aim, ab = ABIL[B.sel];
  if (!ab) { // 部署落點：綠色箭頭
    const y = LANES[a.lane];
    c.save(); c.translate(a.x, y);
    c.fillStyle = 'rgba(157,255,92,.25)'; c.beginPath(); c.ellipse(0, 4, 30, 9, 0, 0, TAU); c.fill();
    c.strokeStyle = '#9dff5c'; c.lineWidth = 2.4; c.beginPath(); c.ellipse(0, 4, 30, 9, 0, 0, TAU); c.stroke();
    const bob = Math.sin(G.rt * 8) * 3;
    c.fillStyle = '#9dff5c'; c.beginPath(); c.moveTo(0, -18 + bob); c.lineTo(-9, -32 + bob); c.lineTo(9, -32 + bob); c.closePath(); c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke();
    c.restore(); return;
  }
  const r = ab ? ab.radius : 40;
  c.save(); c.translate(a.x, LANES[a.lane]); c.scale(1, 0.42);
  c.strokeStyle = 'rgba(255,90,60,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
  c.fillStyle = 'rgba(255,90,60,.12)'; c.fill();
  c.rotate(G.rt * 1.5); c.setLineDash([10, 8]); c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r * 0.7, 0, TAU); c.stroke(); c.setLineDash([]);
  c.restore();
  c.strokeStyle = 'rgba(255,90,60,.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(a.x - 10, LANES[a.lane]); c.lineTo(a.x + 10, LANES[a.lane]); c.moveTo(a.x, LANES[a.lane] - 8); c.lineTo(a.x, LANES[a.lane] + 8); c.stroke();
}
function drawProjs(c, air) {
  c.lineCap = 'round';
  for (const p of B.projs) {
    if (p.k === 'bullet') {
      if (!!p.air !== air) continue;
      const dx = p.tx - p.sx, dy = p.ty - p.sy, d = Math.hypot(dx, dy) || 1;
      const L = Math.min(26 * p.w, d * Math.min(1, p.t / p.dur));
      const x0 = p.x - (dx / d) * L, y0 = p.y - (dy / d) * L;
      c.globalAlpha = 0.95; c.strokeStyle = p.col; c.lineWidth = 1.5 * p.w;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(p.x, p.y); c.stroke();
      c.strokeStyle = '#ffffff'; c.lineWidth = 0.7 * p.w; c.beginPath(); c.moveTo(p.x - (dx / d) * L * 0.4, p.y - (dy / d) * L * 0.4); c.lineTo(p.x, p.y); c.stroke();
      c.globalAlpha = 1;
    } else if (air) continue;
    else if (p.k === 'shell') {
      const a = p.ang || 0;
      c.strokeStyle = '#ffe9a0'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(p.x - Math.cos(a) * 30, p.y - Math.sin(a) * 30); c.lineTo(p.x, p.y); c.stroke();
      c.globalCompositeOperation = 'lighter'; dspr(c, FXS.gY, p.x, p.y, 0, 0.3); c.globalCompositeOperation = 'source-over';
    } else if (p.k === 'rocket') {
      const a = p.ang || 0;
      c.save(); c.translate(p.x, p.y); c.rotate(a);
      rr(c, -7, -1.6, 9, 3.2, 1.2); c.fillStyle = '#5a5e52'; c.fill(); c.lineWidth = 0.8; c.strokeStyle = OUT; c.stroke();
      c.globalCompositeOperation = 'lighter'; dspr(c, FXS.gO, -9, 0, 0, 0.28); c.globalCompositeOperation = 'source-over';
      c.restore();
    } else if (p.k === 'mortar' || p.k === 'arty' || p.k === 'nade' || p.k === 'bomb') {
      c.save(); c.translate(p.x, p.y); c.rotate(p.k === 'nade' ? p.rot : p.ang || 0);
      if (p.k === 'bomb') dspr(c, getV('bomb', 'us'), 0, 0, 0, 1.2);
      else if (p.k === 'nade') { c.beginPath(); c.ellipse(0, 0, 2.6, 2, 0, 0, TAU); c.fillStyle = '#4c5a34'; c.fill(); c.lineWidth = 0.8; c.strokeStyle = OUT; c.stroke(); }
      else { rr(c, -5, -1.8, 10, 3.6, 1.6); c.fillStyle = '#3d4038'; c.fill(); c.lineWidth = 0.8; c.strokeStyle = OUT; c.stroke(); if (p.k === 'arty') { c.globalCompositeOperation = 'lighter'; dspr(c, FXS.gO, -7, 0, 0, 0.22); c.globalCompositeOperation = 'source-over'; } }
      c.restore();
    } else if (p.k === 'crate') {
      c.save(); c.translate(p.x, p.y);
      c.strokeStyle = 'rgba(30,30,30,.6)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(0, -8); c.lineTo(-16, -40); c.moveTo(0, -8); c.lineTo(16, -40); c.stroke();
      c.beginPath(); c.moveTo(-20, -40); c.quadraticCurveTo(0, -66, 20, -40); c.closePath(); c.fillStyle = '#e9e9e2'; c.fill(); c.lineWidth = OW; c.strokeStyle = OUT; c.stroke();
      dspr(c, propSpr('crate'), 0, 2, 0, 0.7);
      c.fillStyle = '#d93a3a'; c.fillRect(-2.5, -8, 5, 1.6); c.fillRect(-0.8, -9.6, 1.6, 5);
      c.restore();
    }
  }
}
function drawPlanes(c) {
  for (const p of B.planes) {
    c.save(); c.translate(p.x, p.y); c.scale(Math.sign(p.vx), 1);
    if (p.k === 'jet') { dspr(c, getV('jet', 'us'), 0, 0, 0, 1.15); c.globalCompositeOperation = 'lighter'; dspr(c, FXS.gO, -76, 0, 0, 0.5); c.globalCompositeOperation = 'source-over'; }
    else { c.scale(1.6, 1.6); dspr(c, getV('jet', 'us'), 0, 0, 0, 1); }
    c.restore();
  }
}
function drawSnow(c, dt) {
  const w = VIEW.w, h = VIEW.h;
  c.fillStyle = '#ffffff';
  for (let band = 0; band < 3; band++) {
    c.globalAlpha = 0.45 + band * 0.18;
    c.beginPath();
    for (let i = band; i < BG.flakes.length; i += 3) {
      const f = BG.flakes[i];
      f.y += dt * 0.05 * f.z; f.x += dt * (WIND.x * 0.0009 * f.z + Math.sin(G.rt + f.ph) * 0.004);
      if (f.y > 1.05) { f.y = -0.05; f.x = Math.random(); }
      const x = (((f.x - (CAM.x * CAM.z * 0.0006 * f.z)) % 1) + 1) % 1 * w, y = f.y * h, r = f.z * 1.1;
      c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
    }
    c.fill();
  }
  c.globalAlpha = 1;
}
