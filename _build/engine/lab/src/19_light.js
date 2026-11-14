/* 樣品館：光影（動態光源、柔和陰影、手電筒、火把、照明彈、角色投影、怕光的空殼） */
const LT = {
  walls: [[-600, -500, 1200, 48], [-600, 452, 1200, 48], [-600, -500, 48, 1000], [552, -500, 48, 1000], [-600, -40, 290, 40], [310, 130, 290, 40], [-100, -262, 200, 36]],
  pillars: [[-250, -250], [250, -250], [-250, 270], [250, 270]],
  crates: [[-500, -420], [-436, -420], [-500, -356], [470, 400], [406, 400], [470, 336], [150, 380], [-470, 300]],
  barrels: [[-380, -420], [500, -60], [-160, 400], [60, -400]],
  torches: [[-300, -452, 'n'], [300, -452, 'n'], [-552, 220, 'w'], [552, -280, 'e'], [0, -226, 'n']],   // 牆面上的位置＋朝向（n：北牆朝下、w：西牆朝右、e：東牆朝左）
  husks: [[-420, 110, 'husk'], [420, -160, 'husk2'], [0, 300, 'brute'], [-120, -380, 'husk']],
  oil: [[-150, 120, 1.1, 0.4], [170, -40, 0.8, 2.1], [80, 230, 1.3, 1]],
  papers: [[-60, 160, 0.4], [230, 60, -0.7], [-260, -120, 1.9], [-20, 175, 1.2]],
  puddle: [-405, 366, 150, 64],
  gen: [420, -400],
  path: (t) => ({ x: Math.cos(t) * 330, y: 40 + Math.sin(t) * 190 }),
};
LT.art = () => {
  if (PZ.art.has('lt.floor')) return;
  const A = PZ.art;
  // 石板地：2×2 塊，每塊有色差、裂縫、苔蘚、髒污（燈一照細節就出來）
  A.make('lt.floor', 128, 128, (c, w, h) => {
    const R = PZ.rng(21);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const x = i * 64, y = j * 64, base = R.range(30, 42);
      const g = c.createLinearGradient(x, y, x + 64, y + 64); g.addColorStop(0, `hsl(220,10%,${base + 4}%)`); g.addColorStop(1, `hsl(225,12%,${base - 6}%)`);
      c.fillStyle = g; c.fillRect(x + 1.5, y + 1.5, 61, 61);
      for (let k = 0; k < 60; k++) { c.fillStyle = `rgba(${R.chance(0.5) ? '255,255,255' : '0,0,0'},${R.range(0.02, 0.07)})`; c.fillRect(x + R.range(2, 60), y + R.range(2, 60), R.range(1, 4), R.range(1, 4)); }
      c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(x + 1.5, y + 1.5, 61, 1.5); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x + 1.5, y + 61, 61, 1.5);
      if (R.chance(0.6)) { c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1; c.beginPath(); let px = x + R.range(10, 54), py = y + R.range(6, 20); c.moveTo(px, py); for (let s = 0; s < 4; s++) { px += R.spread(10); py += R.range(6, 12); c.lineTo(px, py); } c.stroke(); }
      if (R.chance(0.45)) { const mg = c.createRadialGradient(x + R.range(8, 56), y + R.range(8, 56), 0, x + 32, y + 32, 30); mg.addColorStop(0, 'rgba(70,110,60,.22)'); mg.addColorStop(1, 'rgba(70,110,60,0)'); c.fillStyle = mg; c.fillRect(x, y, 64, 64); }
    }
    c.fillStyle = '#0b0d12'; c.fillRect(0, 0, w, 1.5); c.fillRect(0, 0, 1.5, h); c.fillRect(0, 63, w, 2); c.fillRect(63, 0, 2, h);
  });
  // 牆頂（深色石材，邊緣有斜面光）與牆面（磚）
  A.make('lt.top', 64, 64, (c, w, h) => {
    const R = PZ.rng(4); c.fillStyle = '#2b2f38'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 90; k++) { c.fillStyle = `rgba(${R.chance(0.5) ? '255,255,255' : '0,0,0'},${R.range(0.02, 0.06)})`; c.fillRect(R.range(0, w), R.range(0, h), R.range(1, 5), R.range(1, 3)); }
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, w - 1, h - 1);
  });
  A.make('lt.brick', 64, 28, (c, w, h) => {
    c.fillStyle = '#1d1f26'; c.fillRect(0, 0, w, h);
    const R = PZ.rng(8);
    for (let row = 0; row < 2; row++) for (let i = -1; i < 3; i++) {
      const x = i * 32 + (row ? 16 : 0), y = row * 14, l = R.range(26, 36);
      c.fillStyle = `hsl(18,${R.range(14, 24)}%,${l}%)`; c.fillRect(x + 1, y + 1, 30, 12);
      c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(x + 1, y + 1, 30, 1.5); c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(x + 1, y + 11.5, 30, 1.5);
    }
  });
  // 柱子（俯視：圓頂有刻紋）
  A.make('lt.pillar', 72, 72, (c, w, h) => {
    const g = c.createRadialGradient(w * 0.4, h * 0.38, 2, w / 2, h / 2, 34); g.addColorStop(0, '#6d7180'); g.addColorStop(0.7, '#3d414c'); g.addColorStop(1, '#22252c');
    c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, 33, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; for (const r of [24, 14]) { c.beginPath(); c.arc(w / 2, h / 2, r, 0, Math.PI * 2); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1.5; c.beginPath(); c.arc(w / 2, h / 2, 31, Math.PI * 1.05, Math.PI * 1.7); c.stroke();
  });
  // 木箱
  A.make('lt.crate', 60, 60, (c, w, h) => {
    c.fillStyle = '#4a3220'; c.fillRect(2, 2, w - 4, h - 4);
    for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#7a5634' : '#6c4a2c'; c.fillRect(5, 5 + i * 12.5, w - 10, 11); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(5, 15 + i * 12.5, w - 10, 1.2); }
    c.strokeStyle = '#3a2614'; c.lineWidth = 5; c.strokeRect(4.5, 4.5, w - 9, h - 9);
    c.strokeStyle = '#8a6440'; c.lineWidth = 4; c.beginPath(); c.moveTo(8, 8); c.lineTo(w - 8, h - 8); c.stroke();
    c.fillStyle = '#b8b0a0'; for (const [x, y] of [[7, 7], [w - 7, 7], [7, h - 7], [w - 7, h - 7]]) { c.beginPath(); c.arc(x, y, 1.8, 0, Math.PI * 2); c.fill(); }
  });
  A.make('lt.barrel', 46, 46, (c, w, h) => {
    const g = c.createRadialGradient(w * 0.42, h * 0.4, 2, w / 2, h / 2, 22); g.addColorStop(0, '#8a4a3a'); g.addColorStop(1, '#3a1c16');
    c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, 21, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#2a2a30'; c.lineWidth = 3; for (const r of [20, 13]) { c.beginPath(); c.arc(w / 2, h / 2, r, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = 'rgba(255,220,180,.18)'; c.beginPath(); c.ellipse(w * 0.4, h * 0.36, 8, 4, -0.6, 0, Math.PI * 2); c.fill();
  });
  // 火把座
  A.make('lt.torch', 14, 26, (c, w, h) => {
    c.fillStyle = '#2a1f18'; c.fillRect(w / 2 - 2, 8, 4, h - 8);
    c.fillStyle = '#5a4030'; c.beginPath(); c.moveTo(1, 4); c.lineTo(w - 1, 4); c.lineTo(w - 3, 10); c.lineTo(3, 10); c.closePath(); c.fill();
    c.fillStyle = '#8a6a4a'; c.fillRect(1, 3, w - 2, 2);
  }, { anchor: [0.5, 0.2] });
  // 地上的油漬（帶一點虹彩）、警示斑馬線、散落的紙、發電機
  A.make('lt.oil', 90, 56, (c, w, h) => {
    const R = PZ.rng(13);
    for (let i = 0; i < 9; i++) { const x = w / 2 + R.spread(w * 0.25), y = h / 2 + R.spread(h * 0.2), r = R.range(10, 24), g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(8,8,12,.55)'); g.addColorStop(0.75, 'rgba(8,8,12,.35)'); g.addColorStop(1, 'rgba(8,8,12,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
    const g2 = c.createLinearGradient(10, 10, w - 10, h - 10); g2.addColorStop(0, 'rgba(120,60,200,0)'); g2.addColorStop(0.4, 'rgba(60,160,200,.18)'); g2.addColorStop(0.6, 'rgba(200,180,60,.14)'); g2.addColorStop(1, 'rgba(200,60,120,0)');
    c.globalCompositeOperation = 'source-atop'; c.fillStyle = g2; c.fillRect(0, 0, w, h);
  });
  A.make('lt.stripes', 64, 16, (c, w, h) => {
    c.fillStyle = '#c99a1e'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#16140f'; for (let x = -16; x < w; x += 16) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 8, 0); c.lineTo(x + 16, 0); c.lineTo(x + 8, h); c.closePath(); c.fill(); }
    const R = PZ.rng(3); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(30,30,34,${R.range(0.2, 0.6)})`; c.fillRect(R.range(0, w), R.range(0, h), R.range(1, 5), R.range(1, 3)); }
  });
  A.make('lt.paper', 18, 24, (c, w, h) => { c.fillStyle = '#d9d4c6'; c.fillRect(1, 1, w - 2, h - 2); c.fillStyle = 'rgba(40,40,50,.35)'; for (let y = 5; y < h - 3; y += 3) c.fillRect(3, y, w - 6 - (y % 6), 1); c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.moveTo(w - 1, 1); c.lineTo(w - 6, 1); c.lineTo(w - 1, 6); c.fill(); });
  A.make('lt.gen', 76, 54, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#4c5560'); g.addColorStop(1, '#262c33'); c.fillStyle = g; c.beginPath(); c.roundRect(2, 2, w - 4, h - 4, 5); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 1.5; c.beginPath(); c.roundRect(2.5, 2.5, w - 5, h - 5, 5); c.stroke();
    c.fillStyle = '#15191e'; for (let i = 0; i < 6; i++) c.fillRect(8 + i * 7, 10, 4, 22);
    c.fillStyle = '#c99a1e'; c.fillRect(w - 26, 10, 16, 10); c.fillStyle = '#16140f'; c.font = '900 8px sans-serif'; c.fillText('⚡', w - 22, 18);
    c.fillStyle = '#0d1014'; c.fillRect(w - 28, h - 18, 20, 8);
  });
  // 照明彈
  A.make('lt.flare', 10, 22, (c, w, h) => { c.fillStyle = '#b02a2a'; c.fillRect(2, 4, w - 4, h - 4); c.fillStyle = '#e8d8c0'; c.fillRect(2, h - 5, w - 4, 3); c.fillStyle = '#fff'; c.fillRect(3, 0, w - 6, 4); });
};
const LT_TIMES = { 深夜: { amb: '#1a2234', bloom: 0.75, k: 1 }, 黃昏: { amb: '#5d4a5e', bloom: 0.6, k: 0.85 }, 白天: { amb: '#ffffff', bloom: 0.45, k: 0.3 } };

PZ.scene('light', {
  bg: '#07080c',
  ui: () => `${Lab.bar('光影', '點地上：丟照明彈・空殼怕光')}<div class="lab-stat"></div>
    <div class="lab-panel" data-ui>
      <div class="lab-row"><button class="lab-chip" data-chip="shadows">陰影</button><button class="lab-chip" data-chip="flash">手電筒</button><button class="lab-chip" data-chip="torch">火把</button><button class="lab-chip" data-chip="orbs">彩燈</button><button class="lab-chip" data-chip="cast">投影</button><button class="lab-chip" data-chip="fog">霧氣</button></div>
      <div class="lab-row"><span class="lab-label">時段</span>${Object.keys(LT_TIMES).map((k, i) => `<button class="lab-chip cyan${i ? '' : ' on'}" data-time="${k}">${k}</button>`).join('')}</div>
    </div>`,
  enter() {
    LT.art();
    const box = PZ.scenes.uiEl; Lab.bindBack(box); this.stat = box.querySelector('.lab-stat');
    const st = this.st = { shadows: true, flash: true, torch: true, orbs: true, cast: true, fog: false };
    Lab.chips(box, st, (k) => this.apply(k));
    box.querySelectorAll('[data-time]').forEach((b) => b.addEventListener('click', () => { box.querySelectorAll('[data-time]').forEach((x) => x.classList.toggle('on', x === b)); this.setTime(b.dataset.time); PZ.uiSound('click'); }));
    this.base = { bloom: PZ.post.bloom.strength };
    const L = PZ.light; L.on({ ambient: LT_TIMES['深夜'].amb, soak: 12 });
    for (const w of LT.walls) L.box(...w);
    for (const [x, y] of LT.pillars) L.circle(x, y, 31);
    for (const [x, y] of LT.crates) L.box(x - 28, y - 28, 56, 56);
    for (const [x, y] of LT.barrels) L.circle(x, y, 20);
    L.box(LT.gen[0] - 36, LT.gen[1] - 25, 72, 50);
    this.led = L.add({ x: LT.gen[0] + 26, y: LT.gen[1] + 14, r: 90, color: '#3dff8a', intensity: 0.8, flicker: 0.5, flickerSpeed: 2.5, shadows: false });
    // 角色也擋光（照明彈會把空殼的影子拖得很長）
    L.occluders((g) => { for (const h of this.husks) g.sprite(h.f, h.x, h.y - 4, { s: h.s * 0.9, silhouette: true }); });
    this.torches = LT.torches.map(([x, y, f]) => {
      const fx = f === 'w' ? 1 : f === 'e' ? -1 : 0, fy = f === 'n' ? 1 : 0, t = { x, y, f, fx, fy, lx: x + fx * 16, ly: y + fy * 16 + (fx ? -10 : 0) };
      t.L = L.add({ x: t.lx, y: t.ly, r: 310, color: '#ff9a3c', intensity: 1.3, flicker: 0.22, flickerSpeed: 11, size: 10, fall: 5 });
      return t;
    });
    this.orbs = [{ c: '#46d4ff', ph: 0 }, { c: '#c06bff', ph: Math.PI }].map((o) => Object.assign(o, { x: 0, y: 0, L: L.add({ r: 290, color: o.c, intensity: 1.1, size: 8, glow: 0.9, glowR: 9 }) }));
    this.neon = L.add({ x: 0, y: -440, r: 230, color: '#ff3db8', intensity: 0.9, flicker: 0.08, flickerSpeed: 3 });
    const H = this.H = { x: 300, y: 40, vx: 0, vy: 0, dir: Math.PI / 2, aim: Math.PI / 2, t: 0, auto: true, idle: 9, walk: 0 };
    this.flash = L.add({ follow: H, oy: -26, r: 520, cone: 0.38, dir: H.aim, color: '#fff1d6', intensity: 1.55, size: 5, haze: 0.05 });
    this.lantern = L.add({ follow: H, oy: -12, r: 110, color: '#ffd9a8', intensity: 0.28, shadows: false });
    this.husks = LT.husks.map(([x, y, f]) => ({ x, y, f, s: f === 'brute' ? 1.05 : 1.2, scare: 0, lit: 0, ph: PZ.rand.angle() }));
    this.flares = [];
    PZ.cam.fit(520); PZ.cam.follow(H, { lerp: 5, lead: 0.15 });
    this.stick = PZ.input.stick({ target: 'move', zone: { l: 0, t: 0.35, r: 0.5, b: 0.82 } });
    this.offTap = PZ.on('tap', (t) => { if (t.y > PZ.screen.h - 130 && !Lab.side()) return; this.throwFlare(t.wx, t.wy); });
    // 手機橫拿時面板在右邊：鏡頭往右挪、邊界也放寬，主角才不會被面板擋住
    this.lay = () => { const k = Lab.shift(); PZ.cam.offX = k; PZ.cam.bounds = { x: -660, y: -560, w: 1320 + k * 2, h: 1140 }; }; this.lay(); this.offR = PZ.on('resize', this.lay);
    PZ.post.bloom.strength = LT_TIMES['深夜'].bloom;
    PZ.music.play('dread', { intensity: 0.45, fade: 1.5 });
  },
  exit() { this.offTap(); this.offR(); PZ.input.clearTouch(); PZ.post.bloom.strength = this.base.bloom; },
  apply(k) {
    const s = this.st, L = PZ.light, dk = this.dayK == null ? 1 : this.dayK;   // 白天燈要暗一點（不然手電筒在大太陽下還很刺眼）
    if (k === 'shadows') L.shadows = s.shadows;
    if (k === 'flash' || k === '*') this.flash.fade(s.flash ? dk : 0, 0.25);
    if (k === 'torch' || k === '*') for (const t of this.torches) t.L.fade(s.torch ? dk : 0, 0.35);
    if (k === 'orbs' || k === '*') for (const o of this.orbs) o.L.fade(s.orbs ? dk : 0, 0.35);
    if (k === 'fog') PZ.weather.set(s.fog ? 'mist' : 'clear', { time: 1.2 });
  },
  setTime(k) {
    const T = LT_TIMES[k], L = PZ.light, from = PZ.color(L.ambient), to = PZ.color(T.amb);
    this.dayK = T.k; this.apply('*'); this.neon.fade(T.k, 0.6); this.led.fade(T.k, 0.6);
    PZ.tween({ k: 0 }, { k: 1 }, 0.8, 'inOutQuad', { real: true, onUpdate: (o) => { L.ambient = PZ.color.mix(from, to, o.k); } });
    PZ.tween(PZ.post.bloom, { strength: T.bloom }, 0.8, 'inOutQuad', { real: true });
  },
  throwFlare(x, y) {
    const H = this.H, f = { x: H.x, y: H.y - 30, sx: H.x, sy: H.y - 30, tx: x, ty: y, t: 0, fly: 0.55, life: 9, rot: 0, L: null };
    f.L = PZ.light.add({ x: f.x, y: f.y, r: 380, color: '#ff4a3a', intensity: 1.6, flicker: 0.35, flickerSpeed: 17, size: 6, glow: 1, glowR: 10, haze: 0.08 });
    this.flares.push(f); if (this.flares.length > 4) { const o = this.flares.shift(); o.L.fade(0, 0.3, { remove: true }); }
    PZ.sfx.play('whoosh', { vol: 0.5 }); PZ.haptic.tap('light');
  },
  collide(H) {
    const r = 14;
    for (const [x, y, w, h] of LT.walls) {
      const cx = PZ.clamp(H.x, x, x + w), cy = PZ.clamp(H.y, y, y + h + 12), dx = H.x - cx, dy = H.y - cy, d = Math.hypot(dx, dy);
      if (d < r) { if (d > 0.01) { H.x = cx + (dx / d) * r; H.y = cy + (dy / d) * r; } else H.y = y + h + 12 + r; }
    }
    for (const [x, y] of LT.pillars.concat(LT.barrels)) { const dx = H.x - x, dy = H.y - y, d = Math.hypot(dx, dy), R = 34 + r * 0.5; if (d < R && d > 0.01) { H.x = x + (dx / d) * R; H.y = y + (dy / d) * R; } }
    for (const [x, y] of LT.crates.concat([LT.gen])) { const cx = PZ.clamp(H.x, x - 28, x + 28), cy = PZ.clamp(H.y, y - 28, y + 30), dx = H.x - cx, dy = H.y - cy, d = Math.hypot(dx, dy); if (d < r && d > 0.01) { H.x = cx + (dx / d) * r; H.y = cy + (dy / d) * r; } }
  },
  update(dt) {
    const H = this.H, I = PZ.input, M = I.move, L = PZ.light;
    if (M.mag > 0.12) { H.idle = 0; H.auto = false; } else H.idle += dt;
    if (H.idle > 4) H.auto = true;
    if (H.auto) {
      H.t += dt * 0.32; const p = LT.path(H.t), q = LT.path(H.t + 0.05);
      H.vx = (p.x - H.x) * 6; H.vy = (p.y - H.y) * 6; H.x = p.x; H.y = p.y; H.dir = Math.atan2(q.y - p.y, q.x - p.x);
    } else {
      H.vx = PZ.damp(H.vx, M.x * 210, 12, dt); H.vy = PZ.damp(H.vy, M.y * 210, 12, dt);
      H.x += H.vx * dt; H.y += H.vy * dt; this.collide(H);
      if (M.mag > 0.15) H.dir = Math.atan2(M.y, M.x);
      // 回到自動巡邏時從最近的點接上
      let best = 0, bd = 1e9; for (let a = 0; a < Math.PI * 2; a += 0.1) { const p = LT.path(a), d = PZ.math.dist(p.x, p.y, H.x, H.y); if (d < bd) { bd = d; best = a; } } H.t = best;
    }
    if (I.device === 'mouse' && !H.auto) H.dir = Math.atan2(I.pointer.wy - (H.y - 26), I.pointer.wx - H.x);
    H.aim = PZ.math.dampAngle(H.aim, H.dir, 9, dt); H.walk += Math.hypot(H.vx, H.vy) * dt;
    this.flash.dir = H.aim; this.flash.ox = Math.cos(H.aim) * 18; this.flash.oy = -24 + Math.sin(H.aim) * 10;
    // 彩燈：8 字形飄
    this.T = (this.T || 0) + dt;
    this.orbs.forEach((o, i) => { const a = this.T * 0.45 + o.ph; o.x = Math.sin(a) * 300; o.y = 30 + Math.sin(a * 2) * 150 * (i ? -1 : 1); o.L.x = o.x; o.L.y = o.y - 10; });
    // 照明彈：拋物線飛出去、落地、燒完熄掉
    for (const f of this.flares) {
      f.t += dt;
      if (f.t < f.fly) { const k = f.t / f.fly; f.x = PZ.lerp(f.sx, f.tx, k); f.y = PZ.lerp(f.sy, f.ty, k) - Math.sin(k * Math.PI) * 90; f.rot += dt * 14; }
      else if (!f.landed) { f.landed = true; f.x = f.tx; f.y = f.ty; PZ.particles.emit('sparks', f.x, f.y, { count: 14, color: '#ff8a5a' }); PZ.sfx.play('hit', { vol: 0.25, pitch: 1.6 }); }
      if (f.landed && PZ.rand.chance(dt * 18)) PZ.particles.emit('ember', f.x, f.y - 4, { color: '#ff6a4a', scale: 0.8 });
      f.L.x = f.x; f.L.y = f.y - 6;
      if (f.t > f.life && !f.out) { f.out = true; f.L.fade(0, 1.2, { remove: true }); }
    }
    this.flares = this.flares.filter((f) => !(f.out && f.t > f.life + 1.3));
    // 空殼：被照亮就往後縮、眼睛暗掉
    for (const h of this.husks) {
      const lit = L.at(h.x, h.y - 20); h.lit = PZ.damp(h.lit, lit, 6, dt);
      const scared = h.lit > 0.7; if (scared && h.scare < 0.05) PZ.sfx.play('hurt', { vol: 0.12, pitch: 1.8 });
      h.scare = PZ.damp(h.scare, scared ? 1 : 0, scared ? 14 : 3, dt); h.ph += dt;
    }
    // 火把的火星
    if (this.st.torch) for (const t of this.torches) if (PZ.rand.chance(dt * 2.2)) PZ.particles.emit('ember', t.lx + PZ.rand.spread(3), t.ly - 6, { scale: 0.7 });
    const q = PZ.quality.cur.name, hl = L.at(H.x, H.y - 20);
    this.stat.textContent = `燈 ${PZ.gfx.r.stats.lights}　主角亮度 ${hl.toFixed(2)}\n畫質 ${q}${PZ.gfx.kind === 'canvas2d' ? '（無陰影）' : ''}`;
  },
  drawWall(g, x, y, w, h) {
    g.tile('lt.brick', x, y + h, w, 28, { color: '#c9c0b8' });
    g.rect(x, y + h + 22, w, 6, 'rgba(0,0,0,.35)');
    g.tile('lt.top', x, y, w, h);
    g.rect(x, y, w, 2, 'rgba(255,255,255,.09)'); g.rect(x, y + h - 3, w, 3, 'rgba(0,0,0,.4)');
  },
  render(g) {
    const v = PZ.cam.view, s = 128, x0 = Math.floor(v.x / s) * s - s, y0 = Math.floor(v.y / s) * s - s;
    g.tile('lt.floor', x0, y0, v.w + s * 3, v.h + s * 3, { ox: -x0, oy: -y0 });
    g.rect(-600, 500, 1200, 400, '#05060a'); g.rect(-600, -900, 1200, 400, '#05060a'); g.rect(-900, -900, 300, 1800, '#05060a'); g.rect(600, -900, 300, 1800, '#05060a');
    // 地上的東西（油漬、斑馬線、紙、水窪）：畫在光影之前，會被照亮
    g.tile('lt.stripes', -100, -194, 200, 14, { a: 0.85 });
    for (const [x, y, k, r] of LT.oil) g.sprite('lt.oil', x, y, { s: k, r });
    for (const [x, y, r] of LT.papers) g.sprite('lt.paper', x, y, { r, a: 0.9 });
    const [px, py, pw, ph] = LT.puddle; g.water(px, py, pw, ph, { mode: 'flat', shape: 'ellipse', color: '#0e1a24', depth: 0.35, reflect: 0.9, ripple: 2.2, foam: 0.6 });
    // 物件依 y 排序：越下面越前面
    const items = [];
    items.push({ y: LT.gen[1] + 25, d: () => { g.rect(LT.gen[0] - 36, LT.gen[1] + 20, 76, 8, 'rgba(0,0,0,.35)'); g.sprite('lt.gen', LT.gen[0], LT.gen[1]); } });
    for (const [x, y] of LT.pillars) items.push({ y: y + 30, d: () => { g.ellipse(x + 4, y + 8, 36, 30, 'rgba(0,0,0,.35)'); g.sprite('lt.pillar', x, y); } });
    for (const [x, y] of LT.crates) items.push({ y: y + 28, d: () => { g.rect(x - 26, y + 24, 56, 8, 'rgba(0,0,0,.35)'); g.sprite('lt.crate', x, y); } });
    for (const [x, y] of LT.barrels) items.push({ y: y + 20, d: () => g.sprite('lt.barrel', x, y) });
    for (const h of this.husks) items.push({ y: h.y, d: () => {
      const back = h.scare * 6, sq = 1 - h.scare * 0.12;
      if (this.st.cast) g.castShadow(h.f, h.x, h.y, { s: h.s, a: 0.5 });
      g.ellipse(h.x, h.y, 16 * h.s, 6 * h.s, 'rgba(0,0,0,.4)');
      g.spr(h.f, h.x + Math.sin(h.ph * 30) * h.scare * 1.5, h.y - back, 0, h.s * (1 + h.scare * 0.06), h.s * sq, 1, null, 0, h.scare * 0.25);
    } });
    const H = this.H;
    items.push({ y: H.y, d: () => {
      if (this.st.cast) g.castShadow('hero', H.x, H.y, { s: 1.15, a: 0.55 });
      g.ellipse(H.x, H.y, 16, 6, 'rgba(0,0,0,.45)');
      const bob = Math.abs(Math.sin(H.walk * 0.06)) * 2.5;
      g.spr('hero', H.x, H.y - bob, Math.sin(H.walk * 0.06) * 0.04, 1.15, 1.15);
    } });
    items.sort((a, b) => a.y - b.y);
    for (const w of LT.walls) this.drawWall(g, ...w);
    for (const t of this.torches) g.sprite('lt.torch', t.lx - t.fx * 8, t.ly - (t.fy ? 10 : -4), { r: t.fx ? -t.fx * 0.5 : 0 });
    for (const it of items) it.d();
    for (const f of this.flares) g.sprite('lt.flare', f.x, f.y, { r: f.landed ? 1.2 : f.rot, s: 0.9 });
    PZ.particles.draw(g, 'under');
    // ↓ 套用光影：之前畫的東西被照亮／變暗；之後畫的是會發光的東西
    g.lighting();
    if (this.st.torch) for (const t of this.torches) { const k = t.L._fi * t.L._k, x = t.lx - t.fx * 8, y = t.ly - (t.fy ? 14 : 0); g.glow(x, y, 16 * k, '#ffb050', { a: 0.95, core: 0.8 }); g.glow(x, y - 2, 7 * k, '#fff2c8', { core: 1 }); }
    g.glow(LT.gen[0] + 26, LT.gen[1] + 14, 5, '#3dff8a', { a: 0.4 + 0.6 * this.led._fi, core: 1 });
    const nk = this.neon._fi;
    g.text('夜 班', 0, -466, { size: 26, weight: 900, color: '#ffd0ef', align: 'center', baseline: 'middle', outline: 3, outlineColor: PZ.color.alpha('#ff3db8', 0.9 * nk), a: 0.4 + 0.6 * nk });
    g.glow(0, -466, 70, '#ff3db8', { a: 0.35 * nk });
    for (const h of this.husks) { const e = (1 - h.scare) * (0.6 + 0.4 * Math.sin(h.ph * 3)); if (e > 0.05) for (const ex of [-5, 5]) g.glow(h.x + ex * h.s, h.y - (h.f === 'brute' ? 66 : 33) * h.s, 6 * h.s, h.f === 'husk2' ? '#ffd04f' : '#ff4fd8', { a: e, core: 0.9 }); }
    if (this.flash._k > 0.05) { const a = H.aim; g.beam(H.x + Math.cos(a) * 14, H.y - 26 + Math.sin(a) * 14, a, 300, 8, 210, '#fff4dc', { a: 0.07 * this.flash._k }); }
  },
});
