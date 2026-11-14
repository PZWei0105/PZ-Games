/* ==========================================================================
   28 角色動畫（一）：讓「一張圖」的角色活起來、會飄的東西、逐格動畫
     PZ.juice(o)       程序動畫：呼吸、走路起伏與搖擺、前傾、轉身、跳躍拉長、落地壓扁、受擊抖動與閃白
       const j = PZ.juice();  每格 j.update(dt, { vx, vy, grounded, face });  畫：j.draw(g, 'slime', x, y, { s: 1.2 })
       j.hit(力道, 方向)  j.land(力道)  j.jump()  j.pulse(0.2)  j.set({ breathe: 0 })
     PZ.chain(o)       繩子、披風、圍巾、尾巴、頭髮、觸手（verlet）：每格 c.pin(x, y) → c.update(dt) → g.chain(c, { w0, w1, color })
     PZ.animator(defs) 逐格動畫狀態機：播放、不循環播完接下一個、某一格發事件（腳步聲、出招判定）
   ========================================================================== */

/* ---------- PZ.juice：程序動畫 ---------- */
const JUICE_DEF = { breathe: 0.022, breatheRate: 0.42, bob: 2.6, waddle: 0.07, step: 0.045, lean: 0.1, leanSpeed: 320, turn: 0.13, k: 420, d: 15, shake: 1 };
class Juice {
  constructor(o) {
    this.o = Object.assign({}, JUICE_DEF, o);
    this.sx = new Spring(1, { k: this.o.k, d: this.o.d }); this.sy = new Spring(1, { k: this.o.k, d: this.o.d }); this.rot = new Spring(0, { k: this.o.k * 0.6, d: this.o.d });
    this.t = Rand.range(0, 10); this.phase = 0; this.move = 0; this.face = 1; this.turnT = 0; this.flash = 0; this.shakeT = 0; this.shakeA = 0; this.air = 0; this.grounded = true;
    this.ox = 0; this.oy = 0;
  }
  set(o) { Object.assign(this.o, o); return this; }
  /** 每格呼叫：s = { vx, vy, grounded, face }（都可以不給） */
  update(dt, s) {
    if (!(dt > 0)) return this;
    const o = this.o, vx = (s && s.vx) || 0, vy = (s && s.vy) || 0, grounded = !s || s.grounded !== false, sp = Math.abs(vx);
    this.t += dt;
    let face = s && s.face != null ? Math.sign(s.face) : (sp > 8 ? Math.sign(vx) : 0);
    if (face && face !== this.face) { this.face = face; this.turnT = o.turn; }
    this.turnT = Math.max(0, this.turnT - dt);
    if (grounded && sp > 6) { this.phase += sp * o.step * dt; this.move = Math.min(1, this.move + dt * 6); } else this.move = Math.max(0, this.move - dt * 5);
    // 落地：從空中回到地面時自動壓扁
    if (grounded && !this.grounded && this.air > 0.08) this.land(Math.min(1, Math.abs(this._vyLast || 0) / 600 + 0.25));
    if (!grounded) this.air += dt; else this.air = 0;
    this.grounded = grounded; this._vyLast = vy;
    // 目標：空中依速度拉長；地上 1
    const stretch = grounded ? 0 : clamp(-vy / 900, -0.12, 0.18);
    this.sy.target = 1 + stretch; this.sx.target = 1 - stretch * 0.6;
    this.rot.target = clamp(vx / o.leanSpeed, -1, 1) * o.lean * (grounded ? 1 : 0.6);
    const n = Math.ceil(dt / 0.008); for (let i = 0; i < n; i++) { this.sx.step(dt / n); this.sy.step(dt / n); this.rot.step(dt / n); }
    this.flash = Math.max(0, this.flash - dt * 7);
    if (this.shakeT > 0) { this.shakeT = Math.max(0, this.shakeT - dt); }
    return this;
  }
  /** 被打：力道 0～1（或更大）、方向（弧度，從哪裡被打過來；不給就原地抖） */
  hit(power = 0.6, dir) {
    const p = Math.max(0.1, power);
    this.flash = Math.min(1, 0.6 + p * 0.5); this.shakeT = 0.12 + p * 0.18; this.shakeA = (2 + p * 5) * this.o.shake;
    this.sx.kick(p * 7); this.sy.kick(-p * 7);
    if (dir != null) this.rot.kick(Math.cos(dir) * p * 9);
    return this;
  }
  /** 落地壓扁 */
  land(power = 0.6) { this.sy.kick(-power * 9); this.sx.kick(power * 7); return this; }
  /** 起跳拉長 */
  jump(power = 0.7) { this.sy.kick(power * 8); this.sx.kick(-power * 5); return this; }
  /** 一下脈動（撿到東西、升級、被選到） */
  pulse(k = 0.25) { this.sx.kick(k * 14); this.sy.kick(k * 14); return this; }
  /** 算出這一格的變形（不畫）：{ dx, dy, r, sx, sy, flash } */
  pose() {
    const o = this.o, br = Math.sin(this.t * Math.PI * 2 * o.breatheRate) * o.breathe * (1 - this.move);
    const stepS = Math.sin(this.phase * Math.PI * 2), bob = Math.abs(stepS) * o.bob * this.move;
    let fx = this.face;
    if (this.turnT > 0) fx *= Math.max(0.05, Math.abs(Math.cos((1 - this.turnT / o.turn) * Math.PI)));   // 轉身：像紙片一樣翻過去
    const sh = this.shakeT > 0 ? this.shakeA * (this.shakeT / 0.3) : 0;
    const p = this._p || (this._p = {});
    p.dx = sh ? Rand.spread(sh) : 0; p.dy = -bob + (sh ? Rand.spread(sh * 0.5) : 0);
    p.r = this.rot.value + stepS * o.waddle * this.move;
    p.sx = this.sx.value * (1 - br * 0.5) * fx; p.sy = this.sy.value * (1 + br); p.flash = this.flash;
    return p;
  }
  /** 直接畫：o = { s, sx, sy, a, color, add, r, ax, ay } */
  draw(g, f, x, y, o) {
    const p = this.pose(), s = o && o.s != null ? o.s : 1;
    g.spr(f, x + p.dx, y + p.dy, p.r + ((o && o.r) || 0), p.sx * s * (o && o.sx != null ? o.sx : 1), p.sy * s * (o && o.sy != null ? o.sy : 1), o && o.a != null ? o.a : 1, o && o.color, (o && o.add) || 0, Math.max(p.flash, (o && o.flash) || 0), o && o.ax, o && o.ay);
    return this;
  }
}
PZ.juice = (o) => new Juice(o);
PZ.Juice = Juice;

/* ---------- PZ.chain：繩子、披風、尾巴（verlet） ---------- */
/**
 * o = { n（節數，預設 8）, len（每節長度，預設 8）, gravity（預設 600）, damping（0～1，預設 0.94）, iterations（預設 4）,
 *       stiff（0～1 不容易彎，預設 0.1）, dir（不受力時往哪個方向垂，弧度，預設 π/2 往下）, wind（受天氣的風影響多少，預設 1）,
 *       ground（地面 y，或 (x) => y）, x, y（一開始的位置） }
 */
class Chain {
  constructor(o = {}) {
    this.o = Object.assign({ n: 8, len: 8, gravity: 600, damping: 0.94, iterations: 4, stiff: 0.1, dir: Math.PI / 2, wind: 1, ground: null, x: 0, y: 0 }, o);
    const { n, len, dir, x, y } = this.o;
    this.pts = []; for (let i = 0; i < n; i++) { const px = x + Math.cos(dir) * len * i, py = y + Math.sin(dir) * len * i; this.pts.push({ x: px, y: py, px, py }); }
    this.acc = 0; this.ax = x; this.ay = y; this.aa = null; this.fx = 0; this.fy = 0;
  }
  /** 把第一節釘在 (x, y)；angle：第一節要往哪個方向延伸（尾巴、圍巾用；不給就自由垂） */
  pin(x, y, angle) { this.ax = x; this.ay = y; this.aa = angle == null ? null : angle; return this; }
  /** 額外的力（爆炸、衝刺），一格有效 */
  push(fx, fy) { this.fx += fx; this.fy += fy; return this; }
  /** 一下子全部移到某處（傳送、換場景時避免甩一大圈） */
  reset(x, y) { const { len, dir } = this.o; this.pts.forEach((p, i) => { p.x = p.px = x + Math.cos(dir) * len * i; p.y = p.py = y + Math.sin(dir) * len * i; }); this.ax = this._lx = x; this.ay = this._ly = y; return this; }
  update(dt) {
    if (!(dt > 0)) return this;
    const H = 1 / 120; this.acc = Math.min(this.acc + dt, 0.1);
    // 釘住的點在這幾小步之間平順移過去（不然一格跳一大段，鏈子會被甩出去）
    const n = Math.floor(this.acc / H), tx = this.ax, ty = this.ay, sx = this._lx == null ? tx : this._lx, sy = this._ly == null ? ty : this._ly;
    for (let i = 1; i <= n; i++) { this.ax = sx + (tx - sx) * (i / n); this.ay = sy + (ty - sy) * (i / n); this._step(H); }
    this.acc -= n * H; this.ax = tx; this.ay = ty; if (n > 0) { this._lx = tx; this._ly = ty; }
    this.fx = this.fy = 0;
    return this;
  }
  _step(h) {
    const o = this.o, P = this.pts, n = P.length, wind = (typeof Weather !== 'undefined' ? Weather.wind : 0) * o.wind * 260;
    const gx = this.fx + wind, gy = o.gravity + this.fy, damp = Math.pow(o.damping, h * 60);
    P[0].px = P[0].x; P[0].py = P[0].y; P[0].x = this.ax; P[0].y = this.ay;
    for (let i = 1; i < n; i++) {
      const p = P[i], vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
      p.px = p.x; p.py = p.y;
      p.x += vx + gx * h * h * (0.7 + 0.3 * i / n); p.y += vy + gy * h * h;
    }
    const L = o.len, ground = o.ground;
    for (let it = 0; it < o.iterations; it++) {
      P[0].x = this.ax; P[0].y = this.ay;
      for (let i = 1; i < n; i++) {
        const a = P[i - 1], b = P[i];
        let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1e-6, diff = (d - L) / d;
        if (i === 1) { b.x -= dx * diff; b.y -= dy * diff; } else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
        // 不容易彎：往「上一節的方向」（第一節：釘住的方向）拉一點
        if (o.stiff > 0) {
          let ux, uy;
          if (i === 1) { if (this.aa == null) continue; ux = Math.cos(this.aa); uy = Math.sin(this.aa); }
          else { const z = P[i - 2]; ux = a.x - z.x; uy = a.y - z.y; const l = Math.hypot(ux, uy) || 1; ux /= l; uy /= l; }
          const tx = a.x + ux * L, ty = a.y + uy * L, k = o.stiff * (i === 1 ? 1 : 0.6);
          b.x += (tx - b.x) * k; b.y += (ty - b.y) * k;
        }
      }
      if (ground != null) for (let i = 1; i < n; i++) { const p = P[i], gy0 = typeof ground === 'function' ? ground(p.x) : ground; if (gy0 != null && p.y > gy0) { p.y = gy0; p.px += (p.x - p.px) * 0.4; } }
    }
  }
  get tip() { return this.pts[this.pts.length - 1]; }
}
PZ.chain = (o) => new Chain(o);
PZ.Chain = Chain;
/** 把鏈子畫成一條帶子：o = { w0（根部寬）, w1（尾端寬）, color, color2, a, add } */
Graphics.prototype.chain = function (c, o = {}) {
  const color = o.color || '#fff';
  return this.trail(c.pts, o.w0 != null ? o.w0 : 6, o.w1 != null ? o.w1 : 2, color, o.color2 != null ? o.color2 : color, { a: o.a, add: o.add || 0 });
};

/* ---------- PZ.animator：逐格動畫狀態機 ---------- */
/**
 * defs = { idle: { frames: ['hero:0', …] 或 'hero'（自動找 hero:0、hero:1…）, fps: 8, loop: true },
 *          attack: { frames: 'atk', fps: 16, loop: false, next: 'idle', events: { 3: 'hit' } } }
 * const an = PZ.animator(defs, 'idle');  an.play('attack');  an.on('hit', () => …);  每格 an.update(dt)；畫 g.sprite(an.frame, x, y)
 */
class Animator {
  constructor(defs, start) {
    makeEmitter(this);
    this.defs = {}; for (const k in defs) this.defs[k] = this._norm(defs[k]);
    this.name = ''; this.cur = null; this.t = 0; this.i = 0; this.speed = 1; this.done = false;
    if (start || Object.keys(this.defs)[0]) this.play(start || Object.keys(this.defs)[0]);
  }
  _norm(d) {
    let fr = d.frames;
    if (typeof fr === 'string') { const base = fr; fr = []; for (let i = 0; Art.has(`${base}:${i}`); i++) fr.push(`${base}:${i}`); if (!fr.length) fr = [base]; }
    return { frames: fr.map((f) => Art.get(f)), fps: d.fps || 10, loop: d.loop !== false, next: d.next || null, events: d.events || null, speed: d.speed || 1 };
  }
  /** 換動畫（同一個在播就不重來，除非 restart） */
  play(name, o = {}) {
    const d = this.defs[name]; if (!d) { warnOnce('anim:' + name, '沒有這個動畫：' + name); return this; }
    if (name === this.name && !o.restart && !this.done) return this;
    this.name = name; this.cur = d; this.t = 0; this.i = 0; this.done = false; if (o.speed != null) this.speed = o.speed;
    this._fire(0);
    return this;
  }
  _fire(i) { const ev = this.cur.events && this.cur.events[i]; if (ev) this.emit(ev, this.name, i); this.emit('frame', this.name, i); }
  update(dt) {
    const d = this.cur; if (!d || this.done) return this;
    this.t += dt * this.speed * d.speed;
    const n = d.frames.length, idx = Math.floor(this.t * d.fps);
    while (this.i < idx) {
      this.i++;
      if (this.i >= n) {
        if (d.loop) { this.i = 0; this.t -= n / d.fps; this.emit('loop', this.name); this._fire(0); break; }
        this.i = n - 1; this.done = true; this.emit('end', this.name);
        if (d.next) this.play(d.next);
        return this;
      }
      this._fire(this.i);
    }
    return this;
  }
  get frame() { const d = this.cur; return d ? d.frames[Math.min(this.i, d.frames.length - 1)] : MISSING; }
  /** 0～1：播到哪裡了（不循環的動畫判斷「出招到哪」） */
  get progress() { const d = this.cur; return d ? clamp01(this.t * d.fps / d.frames.length) : 0; }
}
PZ.animator = (defs, start) => new Animator(defs, start);
