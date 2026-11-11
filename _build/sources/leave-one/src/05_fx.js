// ===== 粒子：餘燼、煙、雪、塵、血、冰屑、水花、蒸氣、手印噴點 =====
const FX = {
  emb: [], smoke: [], snow: [], dust: [], drops: [], stains: [], sparks: [], splash: [], shards: [], steam: [], spray: [],
  reset() {
    for (const k of ['emb', 'smoke', 'dust', 'drops', 'stains', 'sparks', 'splash', 'shards', 'steam', 'spray']) this[k].length = 0;
  },
  burst(kind, x, y, n, o = {}) {
    const R = Math.random;
    for (let i = 0; i < n; i++) {
      if (kind === 'dust') {
        const a = -Math.PI * (0.1 + 0.8 * R());
        const v = (o.v || 120) * (0.4 + R());
        this.dust.push({ x: x + (R() - 0.5) * (o.w || 30), y, vx: Math.cos(a) * v + (o.vx || 0), vy: Math.sin(a) * v * 0.6, r: 6 + R() * 10, life: 0, max: 0.7 + R() * 0.6 });
      } else if (kind === 'spark') {
        const a = -Math.PI * R(), v = 180 + R() * 320;
        this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.25 + R() * 0.35 });
      } else if (kind === 'splash') {
        const a = -Math.PI * (0.15 + 0.7 * R()), v = (o.v || 260) * (0.5 + R() * 0.8);
        this.splash.push({ x: x + (R() - 0.5) * (o.w || 40), y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.6 + R() * 0.5, r: 2 + R() * 3 });
      } else if (kind === 'shard') {
        const a = -Math.PI * (0.2 + 0.6 * R()), v = 160 + R() * 260;
        this.shards.push({ x: x + (R() - 0.5) * 60, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: R() * 6, vr: (R() - 0.5) * 14, s: 4 + R() * 7, life: 0, max: 0.6 + R() * 0.4 });
      } else if (kind === 'steam') {
        this.steam.push({ x: x + (R() - 0.5) * 40, y: y - R() * 10, vx: (R() - 0.5) * 30, vy: -40 - R() * 50, r: 8 + R() * 8, life: 0, max: 1.4 + R() * 1.2 });
      } else if (kind === 'blood') {
        this.drops.push({ x: x + (R() - 0.5) * 8, y, vx: (o.vx || 0) * 0.3 + (R() - 0.5) * 40, vy: -40 - R() * 60 });
      } else if (kind === 'ember') {
        this.emb.push({ x: x + (R() - 0.5) * 18, y: y - R() * 20, vx: (R() - 0.5) * 50, vy: -60 - R() * 120, life: 0, max: 0.9 + R() * 1.4, s: 0.6 + R() * 0.8 });
      }
    }
  },
  update(dt, W, view) {
    const R = Math.random, w = W.wind.now;
    // 火：餘燼與煙
    for (const s of W.grass) {
      if (s.st !== 1) continue;
      if (R() < dt * 7 * s.I && this.emb.length < 260) this.burst('ember', s.cx, W.groundAt(s.cx) - 10, 1);
      if (R() < dt * 2.2 * s.I && this.smoke.length < 110) this.smoke.push({ x: s.cx + (R() - 0.5) * 16, y: W.groundAt(s.cx) - 40 - R() * 30, vx: 0, vy: -50 - R() * 30, r: 12 + R() * 8, life: 0, max: 2.6 + R() * 1.6 });
    }
    for (const b of W.brands) if (R() < dt * 3 && this.emb.length < 260) this.burst('ember', b.x, b.y - 8, 1);
    const step = (arr, fn) => { let j = 0; for (let i = 0; i < arr.length; i++) { const p = arr[i]; if (fn(p)) arr[j++] = p; } arr.length = j; };
    step(this.emb, (p) => {
      p.life += dt; p.vx += (w * 70 - p.vx) * dt * 1.4; p.vy -= 20 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.x += Math.sin(p.life * 7 + p.max * 9) * 18 * dt;
      return p.life < p.max;
    });
    step(this.smoke, (p) => {
      p.life += dt; p.vx += (w * 46 - p.vx) * dt * 0.9; p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= 1 - dt * 0.25; p.r += dt * 22;
      return p.life < p.max;
    });
    step(this.dust, (p) => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 2.2; p.vy += 60 * dt; p.r += dt * 18; return p.life < p.max; });
    step(this.sparks, (p) => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; return p.life < p.max; });
    step(this.splash, (p) => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; return p.life < p.max && p.y < 640; });
    step(this.shards, (p) => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; p.rot += p.vr * dt; return p.life < p.max && p.y < 650; });
    step(this.steam, (p) => { p.life += dt; p.x += (p.vx + w * 25) * dt; p.y += p.vy * dt; p.r += dt * 16; return p.life < p.max; });
    step(this.drops, (p) => {
      p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const g = W.groundAt(p.x);
      if (p.y >= g) { if (this.stains.length > 160) this.stains.shift(); this.stains.push({ x: p.x, y: g - 1, r: 2.2 + Math.random() * 2.4 }); return false; }
      return true;
    });
    // 雪：一直待在畫面裡，風向一看就懂
    const vx0 = view.x0, vx1 = view.x1, vy0 = view.y0, vy1 = view.y1;
    while (this.snow.length < 90) this.snow.push({ x: lerp(vx0, vx1, R()), y: lerp(vy0, vy1, R()), s: R(), ph: R() * 9 });
    for (const f of this.snow) {
      f.x += (w * (34 + f.s * 26) + Math.sin(P.t * 1.3 + f.ph) * 12) * dt;
      f.y += (24 + f.s * 26) * dt;
      const W0 = vx1 - vx0, H0 = vy1 - vy0;
      if (f.y > vy1 + 20) { f.y = vy0 - 10; f.x = lerp(vx0, vx1, R()); }
      if (f.y < vy0 - 40) f.y = vy0;
      if (f.x > vx1 + 30) f.x -= W0 + 50;
      if (f.x < vx0 - 30) f.x += W0 + 50;
      if (H0 <= 0) break;
    }
  },
  paintUnder() {
    const c = P.ctx;
    c.fillStyle = rgba([118, 20, 14], 0.85);
    for (const s of this.stains) { c.beginPath(); c.ellipse(s.x, s.y, s.r * 1.4, s.r * 0.7, 0, 0, TAU); c.fill(); }
  },
  paint() {
    const c = P.ctx, k = P.k;
    // 煙（像煙燻在岩壁上的灰）
    for (const p of this.smoke) {
      const a = Math.sin((p.life / p.max) * Math.PI) * 0.16;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fillStyle = rgba([34, 28, 26], a); c.fill();
    }
    for (const p of this.steam) {
      const a = Math.sin((p.life / p.max) * Math.PI) * 0.3;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fillStyle = rgba(PIG.white, a); c.fill();
    }
    for (const p of this.dust) {
      const a = (1 - p.life / p.max) * 0.3;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fillStyle = rgba(PIG.umber, a); c.fill();
    }
    c.fillStyle = rgba([118, 20, 14], 0.85);
    for (const p of this.drops) { c.beginPath(); c.arc(p.x, p.y, 2.4, 0, TAU); c.fill(); }
    for (const p of this.splash) { c.fillStyle = rgba([226, 234, 236], 0.8 * (1 - p.life / p.max) + 0.1); c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); }
    for (const p of this.shards) {
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
      c.beginPath(); c.moveTo(-p.s, -p.s * 0.3); c.lineTo(p.s * 0.8, -p.s * 0.5); c.lineTo(p.s, p.s * 0.4); c.lineTo(-p.s * 0.6, p.s * 0.5); c.closePath();
      c.fillStyle = rgba([214, 226, 228], 0.85 * (1 - p.life / p.max) + 0.15); c.fill(); c.strokeStyle = rgba(PIG.char, 0.55); c.lineWidth = 1.4; c.stroke();
      c.restore();
    }
    // 雪
    c.fillStyle = rgba(PIG.white, 0.75);
    const px = (P.px || 1) / k;
    for (const f of this.snow) { c.beginPath(); c.arc(f.x, f.y, (1.5 + f.s * 2.1) * px, 0, TAU); c.fill(); }
    // 手印噴點
    if (this.spray.length) {
      c.fillStyle = rgba(PIG.ochre, 0.55);
      for (const d of this.spray) { c.beginPath(); c.arc(d.x, d.y, d.r, 0, TAU); c.fill(); }
    }
  },
  glow(toS, scale) {
    for (const p of this.emb) {
      const a = Math.sin((p.life / p.max) * Math.PI);
      const s = toS(p.x, p.y);
      GLR.glow(s[0], s[1], (3 + p.s * 3) * scale, 1.0 * a, 0.55 * a, 0.18 * a, 2.2);
    }
    for (const p of this.sparks) {
      const a = 1 - p.life / p.max, s = toS(p.x, p.y);
      GLR.glow(s[0], s[1], 3.5 * scale, 1.0 * a, 0.8 * a, 0.45 * a, 2);
    }
  },
};

// 結局時在岩壁上噴一個手印（負像：顏料噴在手的四周）
function sprayHand(cx, cy, s, n) {
  const R = Math.random;
  const inHand = (x, y) => {
    const lx = (x - cx) / s, ly = (y - cy) / s;
    if ((lx * lx) / 0.3 + ((ly - 0.28) * (ly - 0.28)) / 0.3 < 1) return true;
    const seg = (ax, ay, bx, by, r) => {
      const dx = bx - ax, dy = by - ay, t = clamp(((lx - ax) * dx + (ly - ay) * dy) / (dx * dx + dy * dy), 0, 1);
      return Math.hypot(lx - ax - dx * t, ly - ay - dy * t) < r;
    };
    return seg(-0.38, -0.05, -0.5, -0.62, 0.12) || seg(-0.13, -0.15, -0.17, -0.95, 0.125) || seg(0.12, -0.15, 0.13, -1.0, 0.125)
      || seg(0.36, -0.05, 0.45, -0.75, 0.115) || seg(0.45, 0.32, 0.95, -0.12, 0.13) || seg(-0.2, 0.6, 0.2, 0.6, 0.2);
  };
  let tries = 0;
  for (let i = 0; i < n && tries < n * 4; tries++) {
    const a = R() * TAU, r = Math.pow(R(), 0.75) * s * 1.75;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 1.12;
    if (inHand(x, y)) continue;
    FX.spray.push({ x, y, r: (1.6 + R() * 3.2) * (1 - (r / (s * 1.75)) * 0.55) });
    i++;
  }
}
