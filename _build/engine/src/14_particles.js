/* ==========================================================================
   14 粒子
     PZ.particles.emit('sparks', x, y, { angle: 方向, spread: 0.8, count: 12, scale: 1.2, colors: [...] })
     PZ.particles.define('myDust', { …同下面的格式… })
   格式（全部可省略）：
     count: [8,14]  life: [0.3,0.6]  speed: [80,300]  angle: 0  spread: TAU  drag: 2  grav: 0（正數往下）
     size: [3,6]  end: 0（結束時是開始大小的幾倍）  colors: ['#fff', '#fc6', 'rgba(255,80,0,0)']
     shape: 'glow' | 'circle' | 'ring' | 'square' | 圖名（例如 'pz.spark'、自己畫的圖）
     add: 1（發光，0～1）  stretch: 0（沿速度拉長，火花用 0.02～0.05）  spin: [-4,4]  rot: 'random'|'dir'
     layer: 'over'|'under'  flicker: 0（閃爍）  offset: 0（出生點隨機偏移半徑）  ease: 'outQuad'（大小變化曲線）
     inherit: { vx, vy }（加上發射者速度的比例）
   預設粒子層：'under' 畫在角色下面（血跡、塵土），'over' 畫在上面（火花、爆炸）。
   場景沒自己畫的話，引擎會在 g.hud() 前自動畫 over 層；under 層要在 render 裡呼叫 PZ.particles.draw(g, 'under')。
   ========================================================================== */
const PF = { X: 0, Y: 1, VX: 2, VY: 3, LIFE: 4, MAX: 5, S0: 6, S1: 7, R: 8, VR: 9, DRAG: 10, GRAV: 11, ADD: 12, STR: 13, FLK: 14, SEED: 15 };
const PSTRIDE = 16;
const Particles = PZ.particles = {
  cap: 8000, n: 0,
  f: new Float32Array(8000 * PSTRIDE),
  ramp: new Array(8000), shape: new Uint8Array(8000), frame: new Array(8000), layer: new Uint8Array(8000), ease: new Array(8000),
  presets: {}, _ramps: new Map(), drawn: { 0: false, 1: false },
};
const SHAPE = { glow: 0, circle: 1, ring: 2, square: 3, sprite: 4 };
const rangeOf = (v, r) => (Array.isArray(v) ? r.range(v[0], v[1]) : v);
function rampOf(colors) {
  const key = Array.isArray(colors) ? colors.join('|') : String(colors);
  let r = Particles._ramps.get(key);
  if (!r) { r = Color.ramp(Array.isArray(colors) ? colors : [colors, Color.alpha(colors, 0)], 32); Particles._ramps.set(key, r); }
  return r;
}
Particles.define = (name, spec) => { Particles.presets[name] = spec; return spec; };

/** 發射：preset 可以是名字或格式物件；o 覆蓋 preset 的欄位，另外有 scale（大小與速度倍率）、angle、count */
Particles.emit = (preset, x, y, o) => {
  const p = typeof preset === 'string' ? Particles.presets[preset] : preset;
  if (!p) { warnOnce('pfx:' + preset, '沒有這種粒子：' + preset); return; }
  if (o) { if (o.burst) { for (const b of o.burst) Particles.emit(b, x, y, Object.assign({}, o, { burst: null })); return; } }
  if (p.burst) { for (const b of p.burst) Particles.emit(b, x, y, o); return; }
  const r = Rand, sc = (o && o.scale) || 1, q = Quality.cur.particles * ((o && o.density) || 1);
  let count = Math.round(rangeOf(o && o.count != null ? o.count : p.count != null ? p.count : 10, r) * q);
  if (count <= 0) return;
  const colors = (o && o.colors) || (o && o.color ? [o.color, Color.alpha(o.color, 0)] : null) || p.colors || ['#fff', 'rgba(255,255,255,0)'];
  const ramp = rampOf(colors);
  let shapeName = (o && o.shape) || p.shape || 'glow', shape = SHAPE[shapeName], frame = null;
  if (shape === undefined) { shape = SHAPE.sprite; frame = Art.get(shapeName); }
  const ang = o && o.angle != null ? o.angle : p.angle || 0, spread = o && o.spread != null ? o.spread : p.spread != null ? p.spread : TAU;
  const speed = (o && o.speed) || p.speed || [60, 200], life = (o && o.life) || p.life || [0.3, 0.6], size = (o && o.size) || p.size || [3, 6];
  const end = p.end != null ? p.end : 0, drag = p.drag != null ? p.drag : 2, grav = (p.grav || 0) * sc, add = o && o.add != null ? o.add : p.add != null ? p.add : 1;
  const stretch = p.stretch || 0, spin = p.spin || 0, rotMode = p.rot != null ? p.rot : 'random', flk = p.flicker || 0, off = ((o && o.offset) || p.offset || 0) * sc;
  const layer = ((o && o.layer) || p.layer) === 'under' ? 0 : 1, ease = easeOf(p.ease || 'outQuad');
  const ivx = o && o.vx ? o.vx * (p.inherit || 0.5) : 0, ivy = o && o.vy ? o.vy * (p.inherit || 0.5) : 0;
  const F = Particles.f;
  for (let k = 0; k < count; k++) {
    if (Particles.n >= Particles.cap) break;
    const i = Particles.n++, b = i * PSTRIDE;
    const a = ang + (spread >= TAU - 0.001 ? r.next() * TAU : (r.next() - 0.5) * spread), sp = rangeOf(speed, r) * sc;
    const oa = r.next() * TAU, orr = off * Math.sqrt(r.next());
    F[b] = x + Math.cos(oa) * orr; F[b + 1] = y + Math.sin(oa) * orr;
    F[b + 2] = Math.cos(a) * sp + ivx; F[b + 3] = Math.sin(a) * sp + ivy;
    const lf = rangeOf(life, r); F[b + 4] = lf; F[b + 5] = lf;
    const s0 = rangeOf(size, r) * sc; F[b + 6] = s0; F[b + 7] = s0 * end;
    F[b + 8] = rotMode === 'dir' ? a : typeof rotMode === 'number' ? rotMode : r.next() * TAU; F[b + 9] = rangeOf(spin, r);
    F[b + 10] = drag; F[b + 11] = grav; F[b + 12] = add; F[b + 13] = stretch; F[b + 14] = flk; F[b + 15] = r.next() * 100;
    Particles.ramp[i] = ramp; Particles.shape[i] = shape; Particles.frame[i] = frame; Particles.layer[i] = layer; Particles.ease[i] = ease;
  }
};
Particles.clear = () => { Particles.n = 0; };
function moveParticle(from, to) {
  const F = Particles.f; F.copyWithin(to * PSTRIDE, from * PSTRIDE, from * PSTRIDE + PSTRIDE);
  Particles.ramp[to] = Particles.ramp[from]; Particles.shape[to] = Particles.shape[from]; Particles.frame[to] = Particles.frame[from]; Particles.layer[to] = Particles.layer[from]; Particles.ease[to] = Particles.ease[from];
}
Particles.update = (dt) => {
  const F = Particles.f;
  for (let i = 0; i < Particles.n; i++) {
    const b = i * PSTRIDE;
    F[b + 4] -= dt;
    if (F[b + 4] <= 0) { Particles.n--; if (i !== Particles.n) moveParticle(Particles.n, i); i--; continue; }
    const k = Math.exp(-F[b + 10] * dt);
    F[b + 2] *= k; F[b + 3] = F[b + 3] * k + F[b + 11] * dt;
    F[b] += F[b + 2] * dt; F[b + 1] += F[b + 3] * dt; F[b + 8] += F[b + 9] * dt;
  }
};
/** 畫某一層（'under'｜'over'）。在 world() 空間裡呼叫 */
Particles.draw = (g, layerName = 'over') => {
  const L = layerName === 'under' ? 0 : 1; Particles.drawn[L] = true;
  const F = Particles.f, m = g.m, rr = g.r, al = g.al, v = Cam.view, mg = 40;
  for (let i = 0; i < Particles.n; i++) {
    if (Particles.layer[i] !== L) continue;
    const b = i * PSTRIDE, x = F[b], y = F[b + 1];
    if (x < v.x - mg || x > v.x + v.w + mg || y < v.y - mg || y > v.y + v.h + mg) continue;
    const t = 1 - F[b + 4] / F[b + 5], e = Particles.ease[i](t);
    let s = F[b + 6] + (F[b + 7] - F[b + 6]) * e; if (s <= 0.05) continue;
    const ramp = Particles.ramp[i]; let col = ramp[Math.min(31, (t * 31.999) | 0)];
    let a = cA(col) * al; if (F[b + 14] > 0) a *= 1 - F[b + 14] * (0.5 + 0.5 * Math.sin(F[b + 15] + Time.real * 40));
    if (a <= 0.01) continue;
    col = ((Math.round(clamp01(a) * 255) << 24) | (col & 0xffffff)) >>> 0;
    const shape = Particles.shape[i], add = F[b + 12];
    let w = s * 2, h = s * 2, rot = F[b + 8];
    const st = F[b + 13];
    if (st > 0) { const vx = F[b + 2], vy = F[b + 3], sp = Math.hypot(vx, vy); w = s * 2 + sp * st * 2; rot = Math.atan2(vy, vx); }
    let tex = null, u0 = -1, v0 = -1, u1 = 1, v1 = 1, mode;
    if (shape === SHAPE.sprite) { const f = Particles.frame[i]; if (!f.tex) continue; tex = f.tex; u0 = f.u0; v0 = f.v0; u1 = f.u1; v1 = f.v1; mode = MODE.sprite; if (st <= 0) { w = s * 2 * (f.w / Math.max(f.w, f.h)); h = s * 2 * (f.h / Math.max(f.w, f.h)); } }
    else mode = shape === SHAPE.glow ? MODE.glow : shape === SHAPE.circle ? MODE.circle : shape === SHAPE.ring ? MODE.ring : MODE.solid;
    const c = Math.cos(rot), sn = Math.sin(rot), la = c * w, lb = sn * w, lc = -sn * h, ld = c * h, le = x - 0.5 * la - 0.5 * lc, lf = y - 0.5 * lb - 0.5 * ld;
    rr.quad(tex, m[0] * la + m[2] * lb, m[1] * la + m[3] * lb, m[0] * lc + m[2] * ld, m[1] * lc + m[3] * ld, m[0] * le + m[2] * lf + m[4], m[1] * le + m[3] * lf + m[5], u0, v0, u1, v1, col, mode, add, shape === SHAPE.ring ? 0.18 : 0);
  }
};
addSystem({ name: 'particles', order: 60, update(dt) { Particles.update(dt); } });
PZ.on('quality', () => { Particles.cap = Math.min(8000, Math.round(8000 * Math.max(0.4, Quality.cur.particles))); if (Particles.n > Particles.cap) Particles.n = Particles.cap; });

/* ---------- 內建粒子 ---------- */
const D = Particles.define;
D('sparks', { count: [8, 14], life: [0.15, 0.4], speed: [180, 520], spread: 1.1, drag: 5, size: [1.6, 3], end: 0.2, colors: ['#fff', '#ffe08a', '#ff8a2b', 'rgba(255,60,0,0)'], shape: 'pz.spark', stretch: 0.035, add: 1 });
D('hit', { count: [5, 9], life: [0.08, 0.22], speed: [120, 360], spread: 1.4, drag: 6, size: [2, 4], end: 0, colors: ['#fff', '#fff6c8', 'rgba(255,200,120,0)'], shape: 'pz.spark', stretch: 0.03, add: 1 });
D('flare', { count: 1, life: [0.12, 0.16], speed: 0, size: [22, 28], end: 1.6, colors: ['#fff', 'rgba(255,240,200,0)'], shape: 'pz.flare', add: 1, rot: 0, ease: 'outCubic' });
D('ring', { count: 1, life: [0.25, 0.3], speed: 0, size: [6, 6], end: 6, colors: ['rgba(255,255,255,.9)', 'rgba(255,255,255,0)'], shape: 'ring', add: 1, ease: 'outCubic' });
D('blood', { count: [6, 12], life: [0.3, 0.6], speed: [60, 260], spread: 1.3, drag: 4, grav: 420, size: [1.6, 3.4], end: 0.5, colors: ['#c4162a', '#7d0b18', 'rgba(70,0,10,0)'], shape: 'circle', add: 0 });
D('smoke', { count: [4, 7], life: [0.6, 1.2], speed: [10, 60], drag: 1.2, grav: -18, size: [10, 18], end: 2.2, colors: ['rgba(70,70,76,.55)', 'rgba(40,40,46,.3)', 'rgba(20,20,24,0)'], shape: 'pz.smoke', add: 0, spin: [-1, 1], ease: 'outQuad', layer: 'over' });
D('dust', { count: [4, 8], life: [0.3, 0.6], speed: [20, 90], spread: TAU, drag: 3, grav: -10, size: [4, 8], end: 1.8, colors: ['rgba(210,190,160,.45)', 'rgba(160,140,110,0)'], shape: 'pz.smoke', add: 0, layer: 'under' });
D('fire', { count: [10, 16], life: [0.25, 0.55], speed: [40, 240], drag: 3.2, grav: -60, size: [7, 14], end: 0.2, colors: ['#fff6d0', '#ffc24a', '#ff5a1f', 'rgba(120,20,0,0)'], shape: 'glow', add: 1, offset: 6 });
D('debris', { count: [5, 9], life: [0.5, 0.9], speed: [120, 380], drag: 1.5, grav: 700, size: [1.5, 3.5], end: 1, colors: ['#5b4a3a', '#3a2e24', 'rgba(30,24,18,0)'], shape: 'pz.shard', spin: [-14, 14], add: 0 });
D('core', { count: 1, life: [0.12, 0.16], speed: 0, size: [26, 30], end: 2, colors: ['#fff', '#ffe9a8', 'rgba(255,170,60,0)'], shape: 'glow', add: 1, ease: 'outCubic' });
D('explosion', { burst: ['core', 'fire', 'sparks', 'smoke', 'debris', 'ring'] });
D('magic', { count: [10, 16], life: [0.4, 0.8], speed: [30, 140], drag: 2, grav: -40, size: [2, 4], end: 0, colors: ['#fff', '#b9a4ff', '#6a5cff', 'rgba(80,60,255,0)'], shape: 'pz.star', spin: [-6, 6], add: 1, flicker: 0.5 });
D('heal', { count: [8, 12], life: [0.6, 1], speed: [10, 50], spread: TAU, drag: 1, grav: -90, size: [2.5, 4.5], end: 0, colors: ['#fff', '#8dffb0', 'rgba(40,220,120,0)'], shape: 'pz.star', add: 1, offset: 14 });
D('pickup', { count: [6, 9], life: [0.25, 0.45], speed: [60, 180], drag: 4, size: [1.5, 3], end: 0, colors: ['#fff', '#ffe58a', 'rgba(255,200,40,0)'], shape: 'pz.star', add: 1, spin: [-8, 8] });
D('confetti', { count: [30, 44], life: [1.2, 2], speed: [200, 520], angle: -Math.PI / 2, spread: 1.4, drag: 1.6, grav: 380, size: [2.5, 4.5], end: 1, colors: ['#ff5a7a', '#ffd54a', '#4ad8ff', '#8cff6a', '#c78bff'], shape: 'square', spin: [-12, 12], add: 0 });
D('ember', { count: [1, 2], life: [0.8, 1.6], speed: [10, 40], angle: -Math.PI / 2, spread: 1.2, drag: 0.6, grav: -30, size: [1, 2.2], end: 0, colors: ['#ffd27a', '#ff7a2a', 'rgba(255,60,0,0)'], shape: 'glow', add: 1, flicker: 0.6, offset: 30 });
D('muzzle', { count: [3, 5], life: [0.04, 0.08], speed: [60, 200], spread: 0.5, drag: 8, size: [3, 6], end: 0.2, colors: ['#fff', '#ffe18a', 'rgba(255,160,40,0)'], shape: 'pz.spark', stretch: 0.03, add: 1 });
D('shockring', { count: 1, life: [0.35, 0.4], speed: 0, size: [10, 10], end: 9, colors: ['rgba(255,255,255,.8)', 'rgba(255,255,255,0)'], shape: 'ring', add: 1, ease: 'outQuart' });
