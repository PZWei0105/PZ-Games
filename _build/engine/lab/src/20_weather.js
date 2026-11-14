/* 樣品館：天氣與水面（側視雨夜港口：倒影、雨雪霧雷、路燈光柱、調色、電影黑邊） */
const WX = { pierY: 40, waterY: 70, x0: -1500, x1: 1500 };
WX.art = () => {
  if (PZ.art.has('wx.lamp')) return;
  const A = PZ.art;
  // 路燈：細長燈桿＋彎臂＋燈罩
  A.make('wx.lamp', 46, 176, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 10, 0); g.addColorStop(0, '#3b4252'); g.addColorStop(1, '#1b1f28');
    c.fillStyle = g; c.fillRect(8, 20, 6, h - 26); c.fillStyle = '#2a303c'; c.fillRect(4, h - 10, 14, 10); c.fillRect(6, h - 40, 10, 4);
    c.strokeStyle = '#2a303c'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(11, 24); c.quadraticCurveTo(12, 6, 30, 8); c.stroke();
    c.fillStyle = '#323846'; c.beginPath(); c.moveTo(22, 8); c.lineTo(42, 8); c.lineTo(38, 18); c.lineTo(26, 18); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(9, 20, 1.5, h - 30);
  }, { anchor: [0.24, 1] });
  // 長椅
  A.make('wx.bench', 92, 38, (c, w, h) => {
    c.fillStyle = '#5a3c26'; for (let i = 0; i < 3; i++) c.fillRect(4, 4 + i * 7, w - 8, 5);
    c.fillStyle = '#4a3020'; c.fillRect(4, 24, w - 8, 5);
    c.fillStyle = '#1c2028'; c.fillRect(10, 22, 5, 16); c.fillRect(w - 15, 22, 5, 16); c.fillRect(8, 2, 4, 26); c.fillRect(w - 12, 2, 4, 26);
  }, { anchor: [0.5, 1] });
  // 小漁船（有小艙房、桅杆掛燈）
  A.make('wx.boat', 150, 74, (c, w, h) => {
    const hull = c.createLinearGradient(0, 40, 0, h); hull.addColorStop(0, '#7a2e2a'); hull.addColorStop(1, '#3a1412');
    c.fillStyle = hull; c.beginPath(); c.moveTo(4, 46); c.lineTo(w - 2, 42); c.quadraticCurveTo(w - 16, h - 6, w - 40, h - 4); c.lineTo(26, h - 4); c.quadraticCurveTo(10, h - 10, 4, 46); c.closePath(); c.fill();
    c.fillStyle = '#d8d0c0'; c.fillRect(6, 44, w - 10, 4);
    c.fillStyle = '#c8c0ae'; c.fillRect(52, 22, 46, 22); c.fillStyle = '#2a3442'; c.fillRect(58, 27, 12, 9); c.fillRect(76, 27, 16, 9);
    c.fillStyle = '#8a8070'; c.fillRect(50, 19, 50, 4);
    c.fillStyle = '#3a3a3a'; c.fillRect(118, 6, 3, 38); c.fillRect(112, 8, 14, 2);
  }, { anchor: [0.5, 0.8] });
  // 撐傘的路人：八格走路（側面），傘有邊光
  A.sheet('wx.walker', 8, 70, 104, (c, w, h, i) => {
    const th = (i / 8) * Math.PI * 2, bob = Math.abs(Math.sin(th)) * 1.6, cx = 34, hip = 66 - bob;
    const leg = (a, back) => { c.strokeStyle = back ? '#151a26' : '#202838'; c.lineWidth = 6; c.lineCap = 'round'; const kx = cx + Math.sin(a) * 9, ky = hip + 15, fx = kx + Math.sin(a - (back ? 0.5 : 0.1)) * 10, fy = h - 4; c.beginPath(); c.moveTo(cx, hip); c.lineTo(kx, ky); c.lineTo(fx, fy); c.stroke(); c.fillStyle = '#0c0f16'; c.beginPath(); c.ellipse(fx + 3, fy, 6, 3, 0, 0, Math.PI * 2); c.fill(); };
    leg(-Math.sin(th) * 0.5, true);
    // 大衣
    const coat = c.createLinearGradient(0, 30, 0, hip + 14); coat.addColorStop(0, '#3a4560'); coat.addColorStop(1, '#232a3c');
    c.fillStyle = coat; c.beginPath(); c.moveTo(cx - 9, 34 - bob); c.lineTo(cx + 10, 34 - bob); c.lineTo(cx + 13, hip + 13); c.lineTo(cx - 12, hip + 13); c.closePath(); c.fill();
    c.fillStyle = 'rgba(150,180,255,.25)'; c.fillRect(cx + 8, 36 - bob, 2, hip - 24);
    leg(Math.sin(th) * 0.5, false);
    // 圍巾、頭
    c.fillStyle = '#c99a2e'; c.fillRect(cx - 8, 31 - bob, 17, 6); c.fillRect(cx - 7, 35 - bob, 5, 12);
    c.fillStyle = '#e0b48c'; c.beginPath(); c.arc(cx + 2, 24 - bob, 7, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1a1414'; c.beginPath(); c.arc(cx, 21 - bob, 7.5, Math.PI * 0.9, Math.PI * 2.1); c.fill();
    // 拿傘的手、傘
    c.strokeStyle = '#2b3348'; c.lineWidth = 5; c.beginPath(); c.moveTo(cx + 4, 38 - bob); c.lineTo(cx + 13, 44 - bob); c.lineTo(cx + 12, 30 - bob); c.stroke();
    c.strokeStyle = '#11141c'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx + 12, 34 - bob); c.lineTo(cx + 10, 6 - bob); c.stroke();
    const can = c.createLinearGradient(0, 0, 0, 12); can.addColorStop(0, '#a3283a'); can.addColorStop(1, '#5a1220');
    c.fillStyle = can; c.beginPath(); c.moveTo(cx - 24, 15 - bob); c.quadraticCurveTo(cx + 10, -10 - bob, cx + 44, 15 - bob);
    for (let k = 0; k < 4; k++) { const x0 = cx + 44 - k * 17; c.quadraticCurveTo(x0 - 8.5, 10 - bob, x0 - 17, 15 - bob); }
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,190,200,.45)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx - 22, 13 - bob); c.quadraticCurveTo(cx + 10, -8 - bob, cx + 42, 13 - bob); c.stroke();
  }, { anchor: [0.48, 0.97] });
  // 天空：上暗下亮（城市光害）
  A.make('wx.sky', 4, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#04060e'); g.addColorStop(0.5, '#141634'); g.addColorStop(0.82, '#3a2650'); g.addColorStop(1, '#5c3354'); c.fillStyle = g; c.fillRect(0, 0, w, h); }, { scale: 1 });
  A.make('wx.moon', 64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w * 0.42, h * 0.4, 2, w / 2, h / 2, 28); g.addColorStop(0, '#fffdf2'); g.addColorStop(1, '#d9dcef');
    c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, 28, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(120,130,170,.25)'; for (const [x, y, r] of [[24, 26, 6], [40, 36, 4], [30, 42, 3], [42, 22, 3]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  });
  A.make('wx.plank', 64, 26, (c, w, h) => {
    const R = PZ.rng(6); c.fillStyle = '#3a2a1e'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { c.fillStyle = `hsl(25,${R.range(22, 32)}%,${R.range(20, 27)}%)`; c.fillRect(i * 16 + 1, 0, 14, h); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(i * 16 + 14, 0, 2, h); }
    c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, 0, w, 2);
  });
};
// 城市：遠景、中景大樓（固定亂數種子，每次一樣）
WX.city = () => {
  if (WX.far) return;
  const R = PZ.rng(77);
  WX.far = []; for (let x = -3600; x < 3600; x += R.range(36, 90)) { const w = R.range(40, 120), h = R.range(90, 330), win = []; for (let y = 10; y < h - 8; y += 9) for (let k = 4; k < w - 6; k += 7) if (R.chance(0.09)) win.push(k, y); WX.far.push({ x, w, h, win, ant: R.chance(0.25), ph: R.angle() }); }
  WX.mid = []; const signs = [['HOTEL', '#46d4ff'], ['喫茶', '#ff5fd1'], ['24H', '#5dff9a'], ['PZ', '#ffb547'], ['居酒屋', '#ff4a3a'], ['BAR', '#c06bff']];
  let si = 0;
  for (let x = -3000; x < 3000; x += R.range(150, 260)) {
    const w = R.range(110, 210), h = R.range(230, 470), win = [];
    for (let y = 22; y < h - 20; y += 26) for (let k = 14; k < w - 18; k += 20) if (R.chance(0.3)) win.push(k, y, R.chance(0.7) ? 0 : 1, R.chance(0.08) ? 1 : 0);
    const b = { x, w, h, win, roof: R.int(0, 2), sign: null, ph: R.angle() };
    if (R.chance(0.55)) { const [t, c] = signs[si++ % signs.length]; b.sign = { t, c, y: R.range(60, Math.min(160, h - 60)), vert: t.length <= 3 && R.chance(0.5), broken: t === '居酒屋' }; }
    WX.mid.push(b);
  }
};
const WX_GRADES = [['原色', null], ['電影', 'cinema'], ['冷', 'cold'], ['暖', 'warm'], ['黑白', 'noir'], ['夢境', 'dream'], ['復古', 'retro'], ['霓虹', 'neon']];
const WX_SKIES = [['晴', 'clear'], ['雨', 'rain'], ['雷雨', 'storm'], ['雪', 'snow'], ['霧', 'fog']];
const WX_P = { far: 0.22, mid: 0.5 };

PZ.scene('weather', {
  bg: '#05070f',
  ui: () => `${Lab.bar('天氣與水面', '點天空：打雷')}
    <div class="lab-panel" data-ui>
      <div class="lab-row"><span class="lab-label">天氣</span>${WX_SKIES.map(([n, k]) => `<button class="lab-chip cyan${k === 'rain' ? ' on' : ''}" data-sky="${k}">${n}</button>`).join('')}</div>
      <div class="lab-row"><span class="lab-label">調色</span>${WX_GRADES.map(([n, k], i) => `<button class="lab-chip${i === 1 ? ' on' : ''}" data-grade="${k || ''}">${n}</button>`).join('')}</div>
      <div class="lab-row"><button class="lab-chip" data-chip="bars">電影黑邊</button><button class="lab-chip" data-chip="water">水面倒影</button><button class="lab-chip" data-chip="beams">光柱</button></div>
    </div>`,
  enter() {
    WX.art(); WX.city();
    const box = PZ.scenes.uiEl; Lab.bindBack(box);
    const st = this.st = { bars: false, water: true, beams: true };
    Lab.chips(box, st, (k) => { if (k === 'bars') PZ.fx.letterbox(st.bars ? 0.11 : 0, 0.7); });
    box.querySelectorAll('[data-sky]').forEach((b) => b.addEventListener('click', () => { box.querySelectorAll('[data-sky]').forEach((x) => x.classList.toggle('on', x === b)); PZ.weather.set(b.dataset.sky, { time: 2.5 }); PZ.uiSound('click'); }));
    box.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => { box.querySelectorAll('[data-grade]').forEach((x) => x.classList.toggle('on', x === b)); PZ.post.grade(b.dataset.grade || null, { time: 0.9 }); PZ.uiSound('click'); }));
    this.base = { grade: PZ.post.gradeName, bloom: PZ.post.bloom.strength, vig: PZ.post.vignette };
    PZ.post.grade('cinema', { time: 0 }); PZ.post.bloom.strength = 0.8; PZ.post.vignette = 0.45;
    const L = PZ.light; L.on({ ambient: '#5a6184', shadows: false });
    L.zone(-1e5, -1e5, 2e5, 1e5 + WX.pierY - 150, { ambient: '#ffffff', soft: 130 });   // 天空、遠景自己會亮（不被環境光壓暗），只有碼頭這一帶受燈光影響
    this.moonL = L.add({ r: 1500, color: '#8ea6ff', intensity: 0.32 });
    this.lamps = []; for (let x = -1350; x <= 1350; x += 300) this.lamps.push({ x, L: L.add({ x: x + 21, y: WX.pierY - 150, r: 380, cone: 0.62, dir: Math.PI / 2, color: '#ffcb86', intensity: 1.45, size: 6, haze: 0.12, glow: 0.85, glowR: 9, flicker: x === 150 ? 0.55 : 0, flickerSpeed: 6 }) });
    for (const b of WX.mid) if (b.sign) b._L = L.add({ r: 200, color: b.sign.c, intensity: 0.85, flicker: b.sign.broken ? 0.75 : 0.05, flickerSpeed: b.sign.broken ? 5 : 2 });
    this.boat = { x: 420, y: WX.waterY + 6, t: 0 };
    this.boatL = L.add({ r: 200, color: '#ffb35c', intensity: 0.75, flicker: 0.15, glow: 0.9, glowR: 6, haze: 0.1, fall: 9 });
    const W = this.W = { x: -200, y: WX.pierY, dir: 1, t: 0 };
    PZ.weather.set('rain', { time: 0 }); PZ.weather.ground = (x) => (x > WX.x0 && x < WX.x1 && Math.abs(x - this.boat.x) > 70 ? (PZ.rand.chance(0.45) ? WX.pierY : WX.waterY + PZ.rand.range(4, 60)) : WX.waterY + 8);
    this.lay = () => { PZ.cam.fit(PZ.screen.portrait ? 520 : 820); PZ.cam.offX = Lab.shift(); PZ.cam.offY = PZ.screen.portrait ? -90 : -123; PZ.cam.snap(); };
    PZ.cam.follow(W, { lerp: 3, lead: 0 }); this.lay(); this.offR = PZ.on('resize', this.lay);
    this.offTap = PZ.on('tap', (t) => { if (t.wy < WX.pierY - 120) { PZ.weather.strike({ x: t.x, y: Math.max(40, t.y) }); PZ.haptic.tap('heavy'); } });
    PZ.music.play('dread', { intensity: 0.35, fade: 2 });
  },
  exit() {
    this.offR(); this.offTap(); PZ.fx.letterbox(0, 0);
    PZ.post.grade(this.base.grade, { time: 0 }); PZ.post.bloom.strength = this.base.bloom; PZ.post.vignette = this.base.vig;
  },
  update(dt) {
    const W = this.W, sp = 46;
    W.t += dt; W.x += W.dir * sp * dt;
    if (W.x > 1250) W.dir = -1; else if (W.x < -1250) W.dir = 1;
    W.y = WX.pierY;
    const B = this.boat; B.t += dt; B.bob = Math.sin(B.t * 1.3) * 3; B.rot = Math.sin(B.t * 1.1 + 0.6) * 0.045;
    this.boatL.x = B.x + 44; this.boatL.y = B.y - 60 + B.bob;
    // 傘上的雨滴濺起來
    if (PZ.weather.rain > 0.3 && PZ.rand.chance(dt * 9 * PZ.weather.rain)) PZ.particles.emit('dust', W.x + W.dir * PZ.rand.range(-18, 30), WX.pierY - 96, { count: 2, color: 'rgba(200,215,240,.6)', scale: 0.5 });
  },
  layerX(p) { return PZ.cam.x * (1 - p); },
  render(g) {
    const cam = PZ.cam, v = cam.view, t = this.W.t, L = PZ.light;
    // 天空（螢幕座標鋪滿）＋星星＋月亮
    const top = -900, hz = WX.pierY;
    g.rect(v.x - 10, v.y - 10, v.w + 20, v.h + 20, '#04060e');
    g.sprite('wx.sky', v.x + v.w / 2, (top + hz) / 2, { sx: (v.w + 40) / 4, sy: (hz - top) / 256 });
    const R = PZ.rng(5), sx0 = this.layerX(0.03);
    for (let i = 0; i < 90; i++) { const x = sx0 + R.range(-1400, 1400), y = R.range(-760, -180), tw = 0.45 + 0.55 * Math.sin(t * R.range(1, 3) + i); if (x > v.x && x < v.x + v.w) g.circle(x, y, R.range(0.6, 1.5), '#e8eeff', { a: 0.35 + 0.5 * tw }); }
    const mx = this.layerX(0.06) + 300, my = -390;
    g.glow(mx, my, 160, '#9bb0ff', { a: 0.25 }); g.sprite('wx.moon', mx, my, { s: 1.1 });
    this.moonL.x = mx; this.moonL.y = my + 200;
    // 遠景大樓
    const fx = this.layerX(WX_P.far), base = WX.pierY - 6;
    for (const b of WX.far) { const x = fx + b.x; if (x + b.w < v.x || x > v.x + v.w) continue; g.rect(x, base - b.h, b.w, b.h, '#191a38'); if (b.ant) g.rect(x + b.w / 2 - 1, base - b.h - 26, 2, 26, '#191a38'); }
    // 中景大樓（招牌的燈不管看不看得到都要跟著位置走，不然會全部疊在原點）
    const mxo = this.layerX(WX_P.mid);
    for (const b of WX.mid) if (b._L) { b._L.x = mxo + b.x + b.w / 2; b._L.y = WX.pierY - 6 - b.h + b.sign.y + 30; }
    for (const b of WX.mid) {
      const x = mxo + b.x; if (x + b.w < v.x - 40 || x > v.x + v.w + 40) continue;
      g.rect(x, base - b.h, b.w, b.h, '#211e3e'); g.rect(x, base - b.h, 3, b.h, 'rgba(160,170,255,.14)');
      if (b.roof === 1) g.rect(x + 12, base - b.h - 14, b.w * 0.4, 14, '#211e3e');
      if (b.roof === 2) g.poly([x, base - b.h, x + b.w, base - b.h, x + b.w * 0.5, base - b.h - 30], '#211e3e');
    }
    // 碼頭、欄杆、路燈、長椅、船
    const pv0 = Math.max(WX.x0, v.x - 40), pv1 = Math.min(WX.x1, v.x + v.w + 40);
    for (let x = Math.ceil(pv0 / 120) * 120; x < pv1; x += 120) g.rect(x - 5, WX.pierY + 18, 10, 120, '#2b2018');
    g.tile('wx.plank', pv0, WX.pierY, pv1 - pv0, 26, { ox: -pv0 });
    g.rect(pv0, WX.pierY + 24, pv1 - pv0, 6, '#1d150f');
    for (let x = Math.ceil(pv0 / 60) * 60; x < pv1; x += 60) g.rect(x - 2, WX.pierY - 34, 4, 34, '#2b2f3a');
    g.rect(pv0, WX.pierY - 36, pv1 - pv0, 4, '#3a3f4c');
    for (const l of this.lamps) if (l.x > v.x - 80 && l.x < v.x + v.w + 80) g.sprite('wx.lamp', l.x, WX.pierY + 2);
    for (const bx of [-600, 450, 1050]) g.sprite('wx.bench', bx, WX.pierY + 2);
    const B = this.boat; g.sprite('wx.boat', B.x, B.y + B.bob, { r: B.rot });
    // 撐傘的人＋投影（路燈照下來，影子落在碼頭上）
    const W = this.W, f = Math.floor(W.t * 7.3) % 8, wf = 'wx.walker:' + f, fl = W.dir < 0 ? -1.1 : 1.1;
    g.ellipse(W.x, WX.pierY + 2, 20, 4, 'rgba(0,0,0,.35)');
    g.castShadow(wf, W.x, WX.pierY + 2, { flat: true, len: 0.9, a: 0.55, sx: fl, sy: 1.1 });
    g.sprite(wf, W.x, WX.pierY + 2, { sx: fl, sy: 1.1 });
    // ↓ 套用光影；之後是會發光的東西
    g.lighting();
    for (const b of WX.far) { const x = fx + b.x; if (x + b.w < v.x || x > v.x + v.w) continue; for (let i = 0; i < b.win.length; i += 2) g.rect(x + b.win[i], base - b.h + b.win[i + 1], 2.5, 3.5, '#ffcf8a', { a: 0.55 }); if (b.ant && Math.sin(t * 2.5 + b.ph) > 0.6) g.glow(x + b.w / 2, base - b.h - 27, 5, '#ff3b3b', { core: 1 }); }
    for (const b of WX.mid) {
      const x = mxo + b.x; if (x + b.w < v.x - 40 || x > v.x + v.w + 40) continue;
      for (let i = 0; i < b.win.length; i += 4) { const flick = b.win[i + 3] && Math.sin(t * 9 + i) > 0.7 ? 0.3 : 1; g.rect(x + b.win[i], base - b.h + b.win[i + 1], 9, 13, b.win[i + 2] ? '#9fd8ff' : '#ffd28a', { a: 0.75 * flick }); }
      const s = b.sign; if (!s) continue;
      const sL = b._L, k = sL ? sL._fi : 1, sx = x + b.w / 2, sy = base - b.h + s.y;
      g.glow(sx, sy, 60, s.c, { a: 0.3 * k });
      if (s.vert) { [...s.t].forEach((ch, i) => g.text(ch, sx, sy - 18 + i * 22, { size: 19, weight: 900, color: '#fff', align: 'center', baseline: 'middle', outline: 3, outlineColor: s.c, a: 0.25 + 0.75 * k })); }
      else g.text(s.t, sx, sy, { size: 22, weight: 900, color: '#fff', align: 'center', baseline: 'middle', outline: 3, outlineColor: s.c, a: 0.25 + 0.75 * k });
    }
    // 路燈下的光柱（雨天、霧天更明顯）
    if (this.st.beams) { const wet = 0.35 + PZ.weather.rain * 0.4 + PZ.weather.fog * 0.6 + PZ.weather.snow * 0.3; for (const l of this.lamps) if (l.x > v.x - 200 && l.x < v.x + v.w + 200) { const k = l.L._fi; g.beam(l.x + 21, WX.pierY - 146, Math.PI / 2, 186, 14, 150, '#ffd9a0', { a: 0.13 * wet * k, end: 0.25 }); } }
    // 水面：倒映上面所有東西（包含剛剛畫的發光窗戶、霓虹、路燈）
    if (this.st.water) g.water(v.x - 20, WX.waterY, v.w + 40, v.y + v.h - WX.waterY + 20, { color: '#0b1630', depth: 0.5, reflect: 0.78, ripple: 2.6, foam: 0.35, sky: '#3a2a50' });
    else g.rect(v.x - 20, WX.waterY, v.w + 40, v.y + v.h - WX.waterY + 20, '#081022');
  },
});
