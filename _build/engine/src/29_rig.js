/* ==========================================================================
   29 角色動畫（二）：骨架角色 PZ.rig
     只要畫好身體各部位（頭、身體、骨盆、上臂、前臂、手、大腿、小腿、腳、武器），引擎就讓它
     站著呼吸、走、跑、跳、落地、蹲、出招（揮砍、橫掃、突刺、上挑、重擊、出拳、施法）、受傷、倒下、爬起來；
     腳會踩在高低不平的地上（兩段 IK），動作之間自動平滑接起來，披風、羽飾、頭髮自己飄（PZ.chain）。
       const hero = PZ.rig.humanoid({ parts: { head, torso, pelvis, upper, fore, hand, thigh, shin, foot }, weapon, cape, plume })
       每格：hero.drive({ vx, vy, grounded, crouch }); hero.update(dt);   畫：g.rig(hero, x, y)   影子：g.rigShadow(hero, x, y)
       hero.attack('slash').then(…)   hero.on('hit', (招式) => 判定傷害)   hero.hurt()   hero.die()   hero.revive()
       hero.ground = (x) => 地面 y      腳踩地形；hero.joint('handF') 手的位置（放特效）；hero.tip() 武器尖端
   部位圖的畫法（重要）：手腳畫成「往下垂」的直條，關節（上端）在 anchor；身體、頭、骨盆畫成直立的，跟下一段相接的點在 anchor；
   腳畫成橫的（腳尖朝右），腳踝在 anchor；武器畫成橫的（尖端朝右），握把在 anchor。角色面向右邊畫。
   ========================================================================== */
const RIG_DIMS = { thigh: 24, shin: 24, torso: 30, upper: 17, fore: 16, depth: 3, spread: 10, shoulder: 0.86, neck: 1 };
const P_KEYS = ['hx', 'hy', 'r', 'lean', 'head', 'fFx', 'fFy', 'fBx', 'fBy', 'aFu', 'aFf', 'aBu', 'aBf', 'footF', 'footB', 'wr'];
const newPose = () => { const p = {}; for (const k of P_KEYS) p[k] = 0; return p; };
const HALF_PI = Math.PI / 2;
/** 兩段 IK：從 (hx, hy) 伸到 (tx, ty)，兩節長 a、b；bend +1 關節朝前（膝蓋）、-1 朝後（手肘） → [第一節角度, 第二節角度, 關節 x, 關節 y] */
function ik2(hx, hy, tx, ty, a, b, bend, out) {
  let dx = tx - hx, dy = ty - hy, d = Math.hypot(dx, dy) || 1e-4;
  const dmax = a + b - 0.05, dmin = Math.abs(a - b) + 0.05;
  if (d > dmax) { dx *= dmax / d; dy *= dmax / d; d = dmax; } else if (d < dmin) { dx *= dmin / d; dy *= dmin / d; d = dmin; }
  const th = Math.atan2(dy, dx), A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)), a1 = th - bend * A;
  const kx = hx + Math.cos(a1) * a, ky = hy + Math.sin(a1) * a;
  out[0] = a1; out[1] = Math.atan2(hy + dy - ky, hx + dx - kx); out[2] = kx; out[3] = ky;
  return out;
}
/* 招式：每個關鍵格 [時間, { u 前上臂, f 前前臂, bu, bf 後手, lean, hx, hy, head, w 手腕（武器相對前臂多轉幾度） }, 緩動]；沒寫的欄位＝跟著原本的動作 */
const RIG_MOVES = {
  slash: { dur: 0.46, hit: 0.15, keys: [[0.11, { u: -2.3, f: -2.9, bu: 1.0, bf: 0.6, lean: -0.08, hx: -1 }, 'outQuad'], [0.17, { u: 0.32, f: 0.14, bu: 2.3, bf: 2.0, lean: 0.26, hx: 7 }, 'outQuint'], [0.3, { u: 0.95, f: 0.8, bu: 2.0, bf: 1.7, lean: 0.2, hx: 6 }, 'outCubic']] },
  swing: { dur: 0.42, hit: 0.15, keys: [[0.12, { u: 2.5, f: 2.95, bu: 0.6, bf: 0.2, lean: -0.05, hx: -2 }, 'outQuad'], [0.18, { u: -0.05, f: -0.35, bu: 2.2, bf: 2.0, lean: 0.2, hx: 6 }, 'outQuint'], [0.3, { u: -0.85, f: -1.35, bu: 2.4, bf: 2.3, lean: 0.12, hx: 6 }, 'outCubic']] },
  thrust: { dur: 0.4, hit: 0.13, keys: [[0.1, { u: 2.0, f: 2.7, bu: 1.2, bf: 0.8, lean: -0.05, hx: -3, w: 1.6 }, 'outQuad'], [0.15, { u: 0.05, f: 0.0, bu: 2.5, bf: 2.4, lean: 0.3, hx: 14, w: 1.2 }, 'outQuint'], [0.28, { u: 0.1, f: 0.05, lean: 0.26, hx: 13, w: 1.2 }, 'outCubic']] },
  upper: { dur: 0.45, hit: 0.15, keys: [[0.1, { u: 1.4, f: 1.0, bu: 2.0, bf: 1.6, lean: 0.15, hx: 0, hy: 4 }, 'outQuad'], [0.16, { u: -1.2, f: -1.6, bu: 0.8, bf: 0.4, lean: -0.12, hx: 5, hy: -2 }, 'outQuint'], [0.3, { u: -1.6, f: -2.0, lean: -0.15, hx: 4 }, 'outCubic']] },
  smash: { dur: 0.72, hit: 0.33, keys: [[0.22, { u: -2.4, f: -2.9, bu: -2.0, bf: -2.6, lean: -0.15, hx: -3, hy: 5, head: 0.1, w: -0.3 }, 'inOutQuad'], [0.32, { u: 0.6, f: 0.45, bu: 0.9, bf: 0.6, lean: 0.42, hx: 9, hy: 11, head: -0.1, w: 0.5 }, 'outQuint'], [0.5, { u: 0.9, f: 0.7, bu: 1.1, bf: 0.8, lean: 0.36, hx: 9, hy: 9 }, 'outCubic']] },
  punch: { dur: 0.27, hit: 0.08, keys: [[0.05, { u: 1.9, f: -0.6, bu: 1.2, bf: -0.4, lean: -0.02 }, 'outQuad'], [0.09, { u: 0.0, f: 0.0, bu: 1.6, bf: -0.9, lean: 0.16, hx: 4 }, 'outQuint'], [0.18, { u: 0.12, f: -0.2, lean: 0.12, hx: 3 }, 'outCubic']] },
  cast: { dur: 0.6, hit: 0.28, keys: [[0.2, { u: -1.6, f: -1.9, bu: -1.4, bf: -1.8, lean: -0.1, hy: 2, head: 0.12 }, 'inOutQuad'], [0.3, { u: -0.1, f: -0.05, bu: 0.05, bf: 0.0, lean: 0.12, hx: 3 }, 'outQuint'], [0.46, { u: -0.05, f: 0.0, bu: 0.1, bf: 0.05, lean: 0.1, hx: 3 }, 'linear']] },
};
class Humanoid {
  constructor(o = {}) {
    makeEmitter(this);
    this.o = o; this.d = Object.assign({}, RIG_DIMS, o.dims); this.s = o.scale || 1;
    this.parts = Object.assign({}, o.parts);
    this.walkSpeed = o.walkSpeed || 80; this.runSpeed = o.runSpeed || 230;
    this.face = 1; this.faceK = 1; this.turnT = 0; this.ground = o.ground || null;
    this.vx = 0; this.vy = 0; this.grounded = true; this.crouching = false;
    this.t = Rand.range(0, 10); this.phase = 0; this.move = 0; this.runK = 0; this.airK = 0; this.landK = 0; this.crouchK = 0;
    this.atk = null; this.queue = null; this.hurtT = 0; this.hurtK = 0; this.deadK = 0; this.dead = false; this.flash = 0;
    this.cur = newPose(); this.pp = newPose(); this.tmp = newPose(); this.tmp2 = newPose(); this._ik = [0, 0, 0, 0]; this._fa = [0, 0, 0]; this._fb = [0, 0, 0];
    this.J = {}; this.x = 0; this.y = 0; this.trail = []; this._first = true;
    this.chains = [];
    // 披風、圍巾：根部順著背往下垂（不會被甩到頭上）；羽飾：往後上方翹；頭髮：往後垂
    const CH_DEF = { cape: { n: 8, len: 7, gravity: 700, damping: 0.9, stiff: 0.12, angle: 1.95 }, scarf: { n: 6, len: 6, gravity: 600, damping: 0.9, stiff: 0.08, angle: 2.4 }, plume: { n: 6, len: 5.5, gravity: 260, damping: 0.93, stiff: 0.35, angle: 3.6 }, hair: { n: 6, len: 6, gravity: 500, damping: 0.9, stiff: 0.15, angle: 2.2 } };
    for (const k of ['cape', 'plume', 'hair', 'scarf']) if (o[k]) { const c = Object.assign({}, CH_DEF[k], o[k]); this.chains.push({ key: k, c: new Chain(c), at: c.at || k, o: c }); }
    this._poseIdle(this.cur, 0);
  }
  /** 每格先餵狀態：{ vx, vy, grounded, crouch, face } */
  drive(s) {
    if (s.vx != null) this.vx = s.vx; if (s.vy != null) this.vy = s.vy; if (s.grounded != null) this.grounded = !!s.grounded;
    if (s.crouch != null) this.crouching = !!s.crouch;
    const f = s.face != null ? Math.sign(s.face) : (Math.abs(this.vx) > 6 && !this.atk ? Math.sign(this.vx) : 0);
    if (f && f !== this.face && !this.dead) { this.face = f; this.turnT = 0.1; }
    return this;
  }
  /** 出招：'slash' 'swing' 'thrust' 'upper' 'smash' 'punch' 'cast'，或自訂 { dur, hit, keys }。出招中再按會接下一招（連段） */
  attack(kind = 'slash') {
    if (this.dead) return Promise.resolve(false);
    const mv = typeof kind === 'object' ? kind : RIG_MOVES[kind];
    if (!mv) { warnOnce('move:' + kind, '沒有這個招式：' + kind); return Promise.resolve(false); }
    if (this.atk && this.atk.t < this.atk.mv.hit + 0.06) { if (this.queue && this.queue.res) this.queue.res(false); return new Promise((res) => { this.queue = { kind, mv, res }; }); }
    if (this.atk && this.atk.res) this.atk.res(false);
    return new Promise((res) => { this.atk = { kind: typeof kind === 'string' ? kind : 'custom', mv, t: 0, hitDone: false, res, from: this.atk ? this._snapshotArms() : null }; this.trail.length = 0; });
  }
  _snapshotArms() { const c = this.pp && this.atk ? this.pp : this.cur; return { u: c.aFu, f: c.aFf, bu: c.aBu, bf: c.aBf, lean: c.lean, hx: c.hx, hy: 0, head: c.head, w: c.wr || 0 }; }
  get attacking() { return !!this.atk; }
  hurt(dir, power = 0.7) {
    if (this.dead) return this;
    this.hurtT = 0.38; this.hurtK = clamp(power, 0.2, 1.2); this.flash = 1;
    if (this.atk && this.atk.t < this.atk.mv.hit) { if (this.atk.res) this.atk.res(false); this.atk = null; this.queue = null; }
    for (const ch of this.chains) ch.c.push(-this.face * 3000 * power, -1200 * power);
    return this;
  }
  die() { if (this.dead) return this; this.dead = true; this.atk = null; this.queue = null; this.flash = 1; this.emit('die'); return this; }
  revive() { this.dead = false; this.emit('revive'); return this; }
  /** 起跳的瞬間（蹲一下再彈起來的感覺；遊戲照常給速度） */
  jump() { this.landK = 0; this.airK = Math.max(this.airK, 0.4); return this; }
  update(dt) {
    if (!(dt > 0)) return this;
    const d = this.d, sp = Math.abs(this.vx);
    this.t += dt; this.turnT = Math.max(0, this.turnT - dt); this.flash = Math.max(0, this.flash - dt * 5);
    const legScale = (d.thigh + d.shin) / 48, stride = lerp(26, 56, this.runK) * legScale;
    // 走路／跑步：相位依速度前進；runK 依速度在走與跑之間混
    const tgtRun = clamp01((sp - this.walkSpeed * 0.9) / Math.max(1, this.runSpeed - this.walkSpeed * 0.9));
    this.runK = damp(this.runK, tgtRun, 6, dt);
    const moving = this.grounded && sp > 4 && !this.dead;
    this.move = damp(this.move, moving ? 1 : 0, moving ? 10 : 7, dt);
    if (moving) this.phase = (this.phase + sp / (stride * 2) * dt) % 1;
    else if (this.move < 0.05) this.phase = 0;
    // 空中、落地、蹲
    const wasAir = this.airK > 0.5;
    this.airK = damp(this.airK, this.grounded ? 0 : 1, this.grounded ? 22 : 12, dt);
    if (this.grounded && wasAir && this.airK < 0.5) { this.landK = Math.min(1, 0.45 + Math.abs(this._vyAir || 0) / 900); this.emit('land', this.landK); for (const ch of this.chains) ch.c.push(0, 2500); }
    if (!this.grounded) this._vyAir = this.vy;
    this.landK = Math.max(0, this.landK - dt * 4.2);
    this.crouchK = damp(this.crouchK, this.crouching && this.grounded ? 1 : 0, 14, dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.deadK = approach(this.deadK, this.dead ? 1 : 0, dt * (this.dead ? 1.6 : 2.6));
    // 招式
    const A = this.atk;
    if (A) {
      A.t += dt;
      if (!A.hitDone && A.t >= A.mv.hit) { A.hitDone = true; this.emit('hit', A.kind); }
      if (A.t >= A.mv.dur || (this.queue && A.t >= A.mv.hit + 0.06)) {
        if (A.res) A.res(true);
        const q = this.queue; this.queue = null; this.atk = null;
        if (q) { this.atk = { kind: typeof q.kind === 'string' ? q.kind : 'custom', mv: q.mv, t: 0, hitDone: false, res: q.res, from: this._snapshotArms() }; this.trail.length = 0; }
      }
    }
    // 姿勢：各種狀態的權重本身已經是平滑變化的，直接混（不能再整體平滑，腳會在地上滑）
    this._poseTarget(this.cur);
    return this;
  }
  _poseIdle(P, t) {
    const d = this.d, L = d.thigh + d.shin, b = Math.sin(t * Math.PI * 2 / 3.4);
    P.hx = 0; P.hy = -L * 0.975 + b * 0.5; P.r = 0; P.lean = 0.035 + b * 0.012; P.head = -0.03 - b * 0.012;
    P.fFx = d.spread * 0.45; P.fFy = 0; P.fBx = -d.spread * 0.55; P.fBy = 0;
    P.aFu = HALF_PI + 0.1 + b * 0.025; P.aFf = P.aFu - 0.3; P.aBu = HALF_PI + 0.15 - b * 0.02; P.aBf = P.aBu - 0.32; P.footF = 0; P.footB = 0; P.wr = 0;
  }
  _foot(ph, S, lift, stance, k, out) {
    if (ph < stance) { const u = ph / stance; out[0] = S / 2 - S * u; out[1] = 0; out[2] = 0; return out; }
    const u = (ph - stance) / (1 - stance);
    out[0] = -S / 2 + S * smoothstep(0, 1, Math.pow(u, 1 + k * 0.4)); out[1] = -lift * Math.sin(Math.PI * u) - k * 9 * Math.sin(Math.PI * Math.min(1, u * 1.7)) * (1 - u); out[2] = 0.3 * Math.sin(Math.PI * u) * (1 - k * 0.3);
    return out;
  }
  _poseLoco(P, ph, k) {
    const d = this.d, L = d.thigh + d.shin, ls = L / 48;
    const S = lerp(26, 56, k) * ls, lift = lerp(7, 17, k) * ls, stance = lerp(0.62, 0.4, k), bob = lerp(2.2, 4.5, k) * ls, sw = lerp(0.38, 0.72, k), elbow = lerp(0.32, 1.55, k);
    const F = this._foot(ph, S, lift, stance, k, this._fa), B = this._foot((ph + 0.5) % 1, S, lift, stance, k, this._fb);
    P.hx = 0; P.hy = -L * lerp(0.95, 0.9, k) + bob * 0.5 * (1 + Math.cos(Math.PI * 4 * (ph - 0.2 * k))); P.r = 0;
    P.lean = lerp(0.07, 0.27, k) + 0.025 * Math.sin(Math.PI * 4 * ph); P.head = -P.lean * 0.55;
    P.fFx = F[0]; P.fFy = F[1]; P.footF = F[2]; P.fBx = B[0]; P.fBy = B[1]; P.footB = B[2];
    const sF = F[0] / (S / 2), sB = B[0] / (S / 2);
    P.aFu = HALF_PI + sw * sF - k * 0.25; P.aFf = P.aFu - elbow - 0.25 * Math.max(0, -sF);
    P.aBu = HALF_PI + sw * sB - k * 0.25; P.aBf = P.aBu - elbow - 0.25 * Math.max(0, -sB); P.wr = 0;
  }
  _poseAir(P) {
    const d = this.d, L = d.thigh + d.shin, ls = L / 48, w = clamp01(this.vy / 380 + 0.45), T = this._airT || (this._airT = newPose());
    // 上升：前腳膝蓋抬起、後腳往後伸、雙手往上；下墜：腳往下找地、手張開
    P.hx = 0; P.hy = -L * 0.93; P.r = 0; P.lean = 0.12; P.head = -0.1;
    P.fFx = 9 * ls; P.fFy = -15 * ls; P.fBx = -7 * ls; P.fBy = -3 * ls; P.footF = 0.35; P.footB = 0.5;
    P.aFu = -0.9; P.aFf = -1.5; P.aBu = -0.5; P.aBf = -0.8; P.wr = 0; T.wr = 0;
    T.hx = 0; T.hy = -L * 0.95; T.r = 0; T.lean = 0; T.head = 0.06;
    T.fFx = 5 * ls; T.fFy = -3 * ls; T.fBx = -6 * ls; T.fBy = -7 * ls; T.footF = 0.2; T.footB = 0.4;
    T.aFu = 0.2; T.aFf = -0.3; T.aBu = 2.6; T.aBf = 2.2;
    for (const k of P_KEYS) P[k] = lerp(P[k], T[k], w);
  }
  _poseTarget(P) {
    const d = this.d, L = d.thigh + d.shin, ls = L / 48, T = this.tmp;
    this._poseIdle(P, this.t);
    if (this.move > 0.001) { this._poseLoco(T, this.phase, this.runK); for (const k of P_KEYS) P[k] = lerp(P[k], T[k], this.move); }
    if (this.airK > 0.001) { const A2 = this.tmp2; this._poseAir(A2); for (const k of P_KEYS) P[k] = lerp(P[k], A2[k], this.airK); }
    if (this.crouchK > 0.001) {
      const c = this.crouchK; P.hy = lerp(P.hy, -L * 0.64, c); P.lean += 0.3 * c; P.head -= 0.2 * c;
      P.fFx = lerp(P.fFx, 10 * ls, c); P.fBx = lerp(P.fBx, -9 * ls, c); P.fFy *= 1 - c; P.fBy *= 1 - c;
      P.aFu = lerp(P.aFu, 1.0, c); P.aFf = lerp(P.aFf, 0.3, c); P.aBu = lerp(P.aBu, 1.2, c); P.aBf = lerp(P.aBf, 0.6, c);
    }
    if (this.landK > 0) { const c = Ease.outQuad(this.landK); P.hy += c * L * 0.22; P.lean += c * 0.16; P.aFu += c * 0.35; P.aBu += c * 0.35; }
    if (this.hurtT > 0) { const c = Math.sin(Math.min(1, this.hurtT / 0.38) * Math.PI * 0.5) * this.hurtK; P.lean -= 0.5 * c; P.head -= 0.45 * c; P.hx -= 4 * c * ls; P.aFu = lerp(P.aFu, -0.6, c * 0.8); P.aBu = lerp(P.aBu, 2.5, c * 0.8); P.hy += 2 * c; }
    if (this.deadK > 0) {
      const c = this.dead ? Ease.outBounce(this.deadK) : Ease.inOutQuad(this.deadK);
      P.r = -1.5 * c; P.hy = lerp(P.hy, -L * 0.98, c); P.lean = lerp(P.lean, -0.05, c); P.head = lerp(P.head, 0.25, c);
      P.fFx = lerp(P.fFx, 3 * ls, c); P.fFy = lerp(P.fFy, 0, c); P.fBx = lerp(P.fBx, -2 * ls, c); P.fBy = lerp(P.fBy, 0, c);
      P.aFu = lerp(P.aFu, -1.9, c); P.aFf = lerp(P.aFf, -1.6, c); P.aBu = lerp(P.aBu, -2.3, c); P.aBf = lerp(P.aBf, -2.0, c);
    }
  }
  /** 招式疊在身體動作上（上半身照關鍵格，下半身照走路／站著） */
  _applyMove(P) {
    const A = this.atk; if (!A) return;
    const keys = A.mv.keys, t = A.t, from = A.from, base = { u: P.aFu, f: P.aFf, bu: P.aBu, bf: P.aBf, lean: P.lean, hx: P.hx, hy: 0, head: P.head, w: 0 };
    const val = (key, ch) => (key && key[ch] != null ? key[ch] : base[ch]);
    let k0 = { t: 0, v: from || base }, k1 = null, ease = 'outQuad';
    for (let i = 0; i < keys.length; i++) { if (t < keys[i][0]) { k1 = { t: keys[i][0], v: keys[i][1] }; ease = keys[i][2] || 'outQuad'; break; } k0 = { t: keys[i][0], v: keys[i][1] }; }
    if (!k1) { k1 = { t: A.mv.dur, v: null }; ease = 'inOutQuad'; }
    const e = easeOf(ease)(clamp01((t - k0.t) / Math.max(1e-4, k1.t - k0.t)));
    const mix = (ch) => lerp(val(k0.v, ch), val(k1.v, ch), e);
    P.aFu = mix('u'); P.aFf = mix('f'); P.aBu = mix('bu'); P.aBf = mix('bf'); P.lean = mix('lean'); P.hx = mix('hx') * ((this.d.thigh + this.d.shin) / 48); P.head = mix('head');
    P.hy += mix('hy'); P.wr = mix('w');
  }
  /** 算出每個關節的位置（本地座標：面向右、腳底中間是 (0,0)、單位＝世界單位 ÷ scale）；x, y 是畫的位置（世界） */
  _place(x, y) {
    const d = this.d, s = this.s, J = this.J, p = this.pp, C = this.cur;
    for (const k of P_KEYS) p[k] = C[k];
    this._applyMove(p);
    this.x = x; this.y = y;
    // 地形：腳踩在地上（在地上、沒倒下時）
    if (this.ground && this.airK < 0.5 && this.deadK < 0.5) {
      const g0 = this.ground(x), f = this.faceK;
      const dF = (this.ground(x + f * p.fFx * s) - g0) / s, dB = (this.ground(x + f * p.fBx * s) - g0) / s;
      if (p.fFy > -3) p.fFy += dF; if (p.fBy > -3) p.fBy += dB;
      p.hy += clamp(Math.max(dF, dB, 0) * 0.85 + Math.min(dF, dB, 0) * 0.15, -12, 14);
      const sl = (gx) => Math.atan2(this.ground(gx + 4) - this.ground(gx - 4), 8);
      p.footF += sl(x + f * p.fFx * s) * f; p.footB += sl(x + f * p.fBx * s) * f;
    }
    const L = this._ik, ta = -HALF_PI + p.lean, tc = Math.cos(ta), ts = Math.sin(ta);
    J.hip = [p.hx, p.hy]; J.ta = ta;
    J.sh = [p.hx + tc * d.torso * d.shoulder, p.hy + ts * d.torso * d.shoulder];
    J.neck = [p.hx + tc * (d.torso + d.neck), p.hy + ts * (d.torso + d.neck)]; J.ha = ta + p.head;
    const hF = [p.hx + d.depth * 0.5, p.hy], hB = [p.hx - d.depth * 0.5, p.hy];
    ik2(hF[0], hF[1], p.fFx, p.fFy, d.thigh, d.shin, 1, L); J.hipF = hF; J.thF = L[0]; J.shF = L[1]; J.kneeF = [L[2], L[3]]; J.ankF = [L[2] + Math.cos(L[1]) * d.shin, L[3] + Math.sin(L[1]) * d.shin]; J.ftF = p.footF;
    ik2(hB[0], hB[1], p.fBx, p.fBy, d.thigh, d.shin, 1, L); J.hipB = hB; J.thB = L[0]; J.shB = L[1]; J.kneeB = [L[2], L[3]]; J.ankB = [L[2] + Math.cos(L[1]) * d.shin, L[3] + Math.sin(L[1]) * d.shin]; J.ftB = p.footB;
    const sF = [J.sh[0] + d.depth * 0.3, J.sh[1]], sB = [J.sh[0] - d.depth * 0.6, J.sh[1] + 0.5];
    J.shoF = sF; J.auF = p.aFu; J.elF = [sF[0] + Math.cos(p.aFu) * d.upper, sF[1] + Math.sin(p.aFu) * d.upper]; J.afF = p.aFf; J.hdF = [J.elF[0] + Math.cos(p.aFf) * d.fore, J.elF[1] + Math.sin(p.aFf) * d.fore];
    J.wr = p.wr || 0;
    J.shoB = sB; J.auB = p.aBu; J.elB = [sB[0] + Math.cos(p.aBu) * d.upper, sB[1] + Math.sin(p.aBu) * d.upper]; J.afB = p.aBf; J.hdB = [J.elB[0] + Math.cos(p.aBf) * d.fore, J.elB[1] + Math.sin(p.aBf) * d.fore];
    // 整個身體繞腳底旋轉（倒下）
    J.r = p.r;
    if (p.r) { const c = Math.cos(p.r), sn = Math.sin(p.r); for (const k in J) { const v = J[k]; if (Array.isArray(v)) { const X = v[0], Y = v[1]; v[0] = X * c - Y * sn; v[1] = X * sn + Y * c; } } }
    // 面向：轉身時快速壓扁再翻過去
    const tk = this.turnT > 0 ? Math.max(0.15, Math.abs(Math.cos((1 - this.turnT / 0.1) * Math.PI))) : 1;
    this.faceK = this.face * tk;
    return J;
  }
  /** 關節的世界座標（上一次畫的時候）：'hip' 'neck' 'hdF'（前手）'hdB' 'ankF' 'kneeF' 'elF'… */
  joint(name) { const v = this.J[name]; if (!v) return null; return { x: this.x + v[0] * this.s * this.faceK, y: this.y + v[1] * this.s }; }
  /** 武器尖端的世界座標 */
  tip() {
    const w = this.o.weapon; if (!w || !this.J.hdF) return null;
    const a = this.J.afF + (this.J.r || 0) + (this.J.wr || 0) + (w.grip != null ? w.grip : -1.25), len = w.len || 40, h = this.J.hdF;
    return { x: this.x + (h[0] + Math.cos(a) * len) * this.s * this.faceK, y: this.y + (h[1] + Math.sin(a) * len) * this.s };
  }
  /** 鏈子（披風、羽飾）跟著身體 */
  _chains(dt) {
    for (const ch of this.chains) {
      const j = this.J, at = ch.o.at || ch.key, base = at === 'plume' || at === 'hair' ? j.neck : at === 'scarf' ? j.sh : j.sh;
      if (!base) continue;
      const off = ch.o.off || (ch.key === 'cape' ? [-4, 1] : ch.key === 'plume' ? [-2, -22] : ch.key === 'hair' ? [-6, -16] : [-3, 2]);
      const ang = ((ch.key === 'cape' || ch.key === 'scarf') ? j.ta : j.ha) + (j.r || 0), c = Math.cos(ang + HALF_PI), s = Math.sin(ang + HALF_PI);
      // 偏移是在身體／頭的方向上（往上是 -y）
      const lx = base[0] + off[0] * c - off[1] * s, ly = base[1] + off[0] * s + off[1] * c;
      const wx = this.x + lx * this.s * this.faceK, wy = this.y + ly * this.s;
      if (this._first) ch.c.reset(wx, wy);
      const a0 = ch.o.angle != null ? (this.faceK > 0 ? ch.o.angle : Math.PI - ch.o.angle) + (j.r || 0) * Math.sign(this.faceK || 1) : null;
      if (this.ground && !ch.o.ground) ch.c.o.ground = this.ground;   // 披風、頭髮不會穿到地底下
      ch.c.pin(wx, wy, a0); ch.c.update(dt);
    }
    this._first = false;
  }
}
PZ.rig = { moves: RIG_MOVES, humanoid: (o) => new Humanoid(o), Humanoid, ik: ik2 };

/* ---------- 畫 ---------- */
const RIG_ORDER_BACK = [['upper', 'shoB', 'auB', 'down'], ['fore', 'elB', 'afB', 'down'], ['hand', 'hdB', 'afB', 'down'], ['thigh', 'hipB', 'thB', 'down'], ['shin', 'kneeB', 'shB', 'down'], ['foot', 'ankB', 'ftB', 'flat']];
const RIG_ORDER_FRONT_LEG = [['thigh', 'hipF', 'thF', 'down'], ['shin', 'kneeF', 'shF', 'down'], ['foot', 'ankF', 'ftF', 'flat']];
const RIG_ORDER_FRONT_ARM = [['upper', 'shoF', 'auF', 'down'], ['fore', 'elF', 'afF', 'down'], ['hand', 'hdF', 'afF', 'down']];
function rigPart(g, R, name, jk, ak, mode, back, o) {
  const P = R.parts, fr = (back && P[name + 'B']) || P[name]; if (!fr) return;
  const J = R.J, p = J[jk]; if (!p) return;
  let a = J[ak]; if (typeof a !== 'number') return; a += J.r || 0;
  const r = mode === 'down' ? a - HALF_PI : mode === 'up' ? a + HALF_PI : a;
  if (o.silhouette) { g.sprite(fr, p[0], p[1], { r, silhouette: true, color: o.shadowColor || '#000', a: o.sa }); return; }
  const col = back ? (R.o.backTint || '#b6b6c6') : o.color;
  g.spr(fr, p[0], p[1], r, 1, 1, o.a == null ? 1 : o.a, col, o.add || 0, Math.max(R.flash, o.flash || 0));
}
function rigBody(g, R, o) {
  const J = R.J, P = R.parts, r = J.r || 0, al = o.a == null ? 1 : o.a, fl = Math.max(R.flash, o.flash || 0);
  const draw = (fr, p, ang) => { if (!fr || !p) return; if (o.silhouette) g.sprite(fr, p[0], p[1], { r: ang, silhouette: true, color: o.shadowColor || '#000', a: o.sa }); else g.spr(fr, p[0], p[1], ang, 1, 1, al, o.color, o.add || 0, fl); };
  draw(P.pelvis, J.hip, J.ta + HALF_PI + r);
  draw(P.torso, J.hip, J.ta + HALF_PI + r);
  draw(P.head, J.neck, J.ha + HALF_PI + r);
}
function rigWeapon(g, R, o) {
  const w = R.o.weapon; if (!w || !w.frame || !R.J.hdF) return;
  const a = R.J.afF + (R.J.r || 0) + (R.J.wr || 0) + (w.grip != null ? w.grip : -1.25), h = R.J.hdF;
  if (o.silhouette) { g.sprite(w.frame, h[0], h[1], { r: a, silhouette: true, color: o.shadowColor || '#000', a: o.sa }); return; }
  g.spr(w.frame, h[0], h[1], a, 1, 1, o.a == null ? 1 : o.a, o.color, (o.add || 0) + (w.add || 0), Math.max(R.flash, o.flash || 0));
}
/** 畫骨架角色：o = { s（再縮放）, color, a, add, flash, bones（畫骨架線，除錯用）, trail（揮武器的刀光，預設 true）, trailColor } */
Graphics.prototype.rig = function (R, x, y, o = {}) {
  // 鏈子用「上次畫到現在過了多少遊戲時間」來算：掉幀時一格畫面可能跑了好幾次更新，只用最後一次的 dt 會讓披風被甩飛
  R._place(x, y);
  if (R._chainFrame !== Time.frame) { R._chainFrame = Time.frame; const dt = R._lastT == null ? 0 : clamp(Time.t - R._lastT, 0, 0.1); R._lastT = Time.t; R._chains(dt); }
  const s = R.s * (o.s || 1), fx = R.faceK;
  // 刀光：出招中記下武器尖端
  if (o.trail !== false && R.o.weapon) {
    const A = R.atk, tp = R.tip(), hp = R.joint('hdF');
    if (A && A.t > A.mv.hit - 0.09 && A.t < A.mv.hit + 0.11 && tp && hp) { const w = (R.o.weapon.len || 40) * 0.35, k = w / Math.max(1, Math.hypot(tp.x - hp.x, tp.y - hp.y)); R.trail.unshift({ x: tp.x, y: tp.y, bx: tp.x + (hp.x - tp.x) * k * 1.6, by: tp.y + (hp.y - tp.y) * k * 1.6, t: Time.t }); }
    while (R.trail.length && (Time.t - R.trail[R.trail.length - 1].t > 0.13 || R.trail.length > 16)) R.trail.pop();
  }
  const local = (fn) => { this.save(); this.translate(x, y); this.scale(fx * s, s); try { fn(); } finally { this.restore(); } };
  const capes = R.chains.filter((c) => c.key === 'cape' || c.key === 'scarf'), heads = R.chains.filter((c) => c.key === 'plume' || c.key === 'hair');
  local(() => { for (const [n, j, a, m] of RIG_ORDER_BACK) rigPart(this, R, n, j, a, m, true, o); });
  for (const c of capes) this.chain(c.c, Object.assign({ w0: 10, w1: 18, color: '#6a1a2a' }, c.o.draw, { a: o.a }));
  for (const c of heads) this.chain(c.c, Object.assign({ w0: 6, w1: 2, color: '#c33' }, c.o.draw, { a: o.a }));
  local(() => {
    rigBody(this, R, o);
    for (const [n, j, a, m] of RIG_ORDER_FRONT_LEG) rigPart(this, R, n, j, a, m, false, o);
    rigWeapon(this, R, o);
    for (const [n, j, a, m] of RIG_ORDER_FRONT_ARM) rigPart(this, R, n, j, a, m, false, o);
  });
  if (R.trail.length >= 2 && o.trail !== false) this.swoosh(R.trail, o.trailColor || (R.o.weapon && R.o.weapon.trail) || '#cfe8ff', { a: 0.9 });
  if (o.bones) local(() => {
    const J = R.J, L = (a, b, c) => { if (J[a] && J[b]) this.line(J[a][0], J[a][1], J[b][0], J[b][1], 1.2 / s, c, { a: 0.9 }); };
    for (const [a, b] of [['hip', 'neck'], ['hipF', 'kneeF'], ['kneeF', 'ankF'], ['hipB', 'kneeB'], ['kneeB', 'ankB'], ['shoF', 'elF'], ['elF', 'hdF'], ['shoB', 'elB'], ['elB', 'hdB']]) L(a, b, a.endsWith('B') || b.endsWith('B') ? '#46d4ff' : '#ffb547');
    for (const k of ['hip', 'neck', 'kneeF', 'kneeB', 'ankF', 'ankB', 'elF', 'elB', 'hdF', 'hdB']) if (J[k]) this.circle(J[k][0], J[k][1], 2 / s, '#fff');
  });
  return this;
};
/** 骨架角色的影子：o = { flat（側視：貼地扁影，預設 true）, angle, len（預設 0.3）, a（濃度，預設 0.35）, color } */
Graphics.prototype.rigShadow = function (R, x, y, o = {}) {
  if (!R.J.hip) R._place(x, y);
  const flat = o.flat !== false, s = R.s * (o.s || 1), fx = R.faceK;
  let ang = o.angle; if (ang == null) ang = Light.shadowDir(x, y).angle;
  const len = o.len != null ? o.len : flat ? 0.9 : 0.6, dx = Math.cos(ang), dy = Math.sin(ang), fy = o.flatY != null ? o.flatY : 0.07;
  this.save(); this.translate(x, y);
  if (flat) this.transform(fx * s, 0, -dx * len * s, -fy * s, 0, 0); else this.transform(-dy * s * fx, dx * s * fx, -dx * len * s, -dy * len * s, 0, 0);
  const so = { silhouette: true, shadowColor: o.color || '#000', sa: o.a != null ? o.a : 0.35 };
  for (const [n, j, a, m] of RIG_ORDER_BACK) rigPart(this, R, n, j, a, m, true, so);
  rigBody(this, R, so);
  for (const [n, j, a, m] of RIG_ORDER_FRONT_LEG) rigPart(this, R, n, j, a, m, false, so);
  this.restore();
  return this;
};

/* ---------- 刀光 ---------- */
function catmull(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
/**
 * 刀光／揮擊的殘影：list 是最新在前的 [{ x, y（刀尖）, bx, by（靠手那一側）}…]，畫成一片從刀尖亮到內側透明、越舊越淡的弧。
 * o = { a, sub（每段再細分幾份，預設 4：掉幀時也是圓弧）, add（預設 1） }
 */
Graphics.prototype.swoosh = function (list, color, o = {}) {
  const n = list.length; if (n < 2) return this;
  const sub = o.sub || 4, pts = [], m = this.m, c = toColor(color), al = o.a != null ? o.a : 1, add = o.add != null ? o.add : 1;
  for (let i = 0; i < n - 1; i++) {
    const p0 = list[Math.max(0, i - 1)], p1 = list[i], p2 = list[i + 1], p3 = list[Math.min(n - 1, i + 2)];
    for (let k = 0; k < sub; k++) { const t = k / sub; pts.push([catmull(p0.x, p1.x, p2.x, p3.x, t), catmull(p0.y, p1.y, p2.y, p3.y, t), catmull(p0.bx, p1.bx, p2.bx, p3.bx, t), catmull(p0.by, p1.by, p2.by, p3.by, t)]); }
  }
  const L = list[n - 1]; pts.push([L.x, L.y, L.bx, L.by]);
  const X = (x, y) => m[0] * x + m[2] * y + m[4], Y = (x, y) => m[1] * x + m[3] * y + m[5], N = pts.length;
  for (let i = 0; i < N - 1; i++) {
    const a = pts[i], b = pts[i + 1], f0 = 1 - i / (N - 1), f1 = 1 - (i + 1) / (N - 1);
    const ct = pack(cR(c), cG(c), cB(c), al * (f0 + f1) * 0.5 * this.al);
    // 外緣（刀尖）亮、內緣透明；越舊越淡（細分得夠細，一段一段的階梯看不出來）
    this.r.quadv(null, X(a[2], a[3]), Y(a[2], a[3]), 0, 0, X(a[0], a[1]), Y(a[0], a[1]), 0, 0, X(b[0], b[1]), Y(b[0], b[1]), 0, 0, X(b[2], b[3]), Y(b[2], b[3]), 0, 0, 0, ct, MODE.solid, add, 0);
  }
  return this;
};
