/* ==========================================================================
   13 補間與彈簧
     PZ.tween(obj, { x: 100, alpha: 0 }, 0.4, 'outBack').then(() => …)
     o: { delay, yoyo, repeat（-1＝無限）, real（跟真實時間，暫停中也會動）, from: {…}, onUpdate, onDone }
     await PZ.tween(…)        // 可以直接 await
     PZ.tweens.killOf(obj)    // 停掉某物件的所有補間
     const sp = PZ.spring(1, { k: 320, d: 16 }); sp.target = 1.3; …每格讀 sp.value（UI 彈跳、縮放回彈）
   ========================================================================== */
class Tween {
  constructor(target, to, dur, ease, o) {
    this.target = target; this.to = to; this.dur = Math.max(0.0001, dur); this.ease = easeOf(ease);
    this.delay = o.delay || 0; this.yoyo = !!o.yoyo; this.repeat = o.repeat || 0; this.real = !!o.real;
    this.onUpdate = o.onUpdate || null; this.onDone = o.onDone || null; this.from = o.from || null;
    this.t = 0; this.started = false; this.dead = false; this.dir = 1; this.props = null; this._p = null; this._res = null;
  }
  _start() {
    this.started = true; this.props = [];
    for (const k in this.to) {
      const from = this.from && this.from[k] != null ? this.from[k] : this.target[k];
      if (this.from && this.from[k] != null) this.target[k] = from;
      this.props.push(k, +from || 0, +this.to[k]);
    }
  }
  step(dt) {
    if (this.dead) return true;
    if (this.delay > 0) { this.delay -= dt; if (this.delay > 0) return false; dt = -this.delay; this.delay = 0; }
    if (!this.started) this._start();
    this.t += dt;
    let k = clamp01(this.t / this.dur); const e = this.ease(this.dir > 0 ? k : 1 - k);
    const P = this.props, T = this.target;
    for (let i = 0; i < P.length; i += 3) T[P[i]] = P[i + 1] + (P[i + 2] - P[i + 1]) * e;
    if (this.onUpdate) safeCall(this.onUpdate, null, T, e);
    if (k >= 1) {
      if (this.yoyo && this.dir > 0) { this.dir = -1; this.t = 0; return false; }
      if (this.repeat !== 0) { if (this.repeat > 0) this.repeat--; this.t = 0; this.dir = 1; return false; }
      this.finish(); return true;
    }
    return false;
  }
  finish() { if (this.dead) return; this.dead = true; if (this.onDone) safeCall(this.onDone, null, this.target); if (this._res) this._res(this.target); }
  /** 停掉；complete=true 直接跳到終點 */
  kill(complete) { if (this.dead) return; if (complete) { if (!this.started) this._start(); const P = this.props; for (let i = 0; i < P.length; i += 3) this.target[P[i]] = this.yoyo ? P[i + 1] : P[i + 2]; this.finish(); } else { this.dead = true; if (this._res) this._res(this.target); } }
  then(a, b) { if (!this._p) this._p = new Promise((res) => { this._res = res; if (this.dead) res(this.target); }); return this._p.then(a, b); }
}
const Tweens = PZ.tweens = { list: [], real: [] };
PZ.tween = (target, to, dur = 0.3, ease = 'outQuad', o = {}) => { const t = new Tween(target, to, dur, ease, o); (t.real ? Tweens.real : Tweens.list).push(t); return t; };
Tweens.killOf = (target, complete) => { for (const t of Tweens.list) if (t.target === target) t.kill(complete); for (const t of Tweens.real) if (t.target === target) t.kill(complete); };
Tweens.clear = () => { for (const t of Tweens.list) t.dead = true; Tweens.list.length = 0; };
function stepTweens(list, dt) { for (let i = 0; i < list.length; i++) { const t = list[i]; if (t.step(dt)) { list[i] = list[list.length - 1]; list.pop(); i--; } } }

class Spring {
  constructor(v, o = {}) { this.value = v; this.target = v; this.v = 0; this.k = o.k || 300; this.d = o.d || 18; this.real = o.real !== false; this.dead = false; }
  /** 往某方向踢一下（不改目標） */
  kick(vel) { this.v += vel; return this; }
  set(v) { this.value = this.target = v; this.v = 0; return this; }
  step(dt) { const a = -this.k * (this.value - this.target) - this.d * this.v; this.v += a * dt; this.value += this.v * dt; }
  kill() { this.dead = true; }
}
const Springs = [];
PZ.spring = (v, o) => { const s = new Spring(v, o); s.scene = typeof Scenes !== 'undefined' && o && o.keep ? null : (typeof Scenes !== 'undefined' ? Scenes.name : null); Springs.push(s); return s; };
PZ.springs = Springs;

addSystem({
  name: 'tween', order: 20,
  frame(rdt) {
    stepTweens(Tweens.real, rdt);
    for (let i = 0; i < Springs.length; i++) { const s = Springs[i]; if (s.dead) { Springs.splice(i--, 1); continue; } if (s.real) { const n = Math.ceil(rdt / 0.008); for (let k = 0; k < n; k++) s.step(rdt / n); } }
  },
  update(dt) {
    stepTweens(Tweens.list, dt);
    for (const s of Springs) if (!s.real && !s.dead) { const n = Math.ceil(dt / 0.008); for (let k = 0; k < n; k++) s.step(dt / n); }
  },
});
