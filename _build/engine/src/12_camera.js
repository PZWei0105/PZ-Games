/* ==========================================================================
   12 相機
     PZ.cam.follow(player, { lerp: 8, lead: 0.25 })   跟著目標（lead＝往移動方向多看一點）
     PZ.cam.fit(420)        讓畫面短邊至少看得到 420 個世界單位（手機、平板、電腦看到的範圍一致）
     PZ.cam.shake(0.4)      震動（trauma 模型：疊加、會自己消退，強度是平方，小震很輕、大震很猛）
     PZ.cam.kick(角度, 12)  往某方向頓一下（後座力、被打）
     PZ.cam.punch(0.06)     鏡頭瞬間推近再彈回
     PZ.cam.controls({ pan: true, zoom: [0.5, 3], rotate: true })   戰略／模擬類：拖曳平移、雙指縮放旋轉、滾輪縮放
     PZ.cam.toWorldX/Y(螢幕x, 螢幕y)、toScreenX/Y(世界x, 世界y)、inView(x, y, 邊界)
   ========================================================================== */
const Cam = PZ.cam = {
  x: 0, y: 0, zoom: 1, rot: 0, fitSize: 0, userZoom: 1,
  target: null, lerpK: 8, lead: 0, dead: 0, offX: 0, offY: 0, bounds: null,
  trauma: 0, decay: 1.15, maxX: 16, maxY: 12, maxR: 0.03, freq: 22,
  kx: 0, ky: 0, kvx: 0, kvy: 0, pz: 0, pv: 0,
  sx: 0, sy: 0, sr: 0, ez: 1, er: 0,
  mat: new Float64Array([1, 0, 0, 1, 0, 0]), inv: new Float64Array([1, 0, 0, 1, 0, 0]),
  view: { x: 0, y: 0, w: 0, h: 0 },
  ctl: null, external: false,
};
Cam.follow = (t, o = {}) => { Cam.target = t; if (o.lerp != null) Cam.lerpK = o.lerp; if (o.lead != null) Cam.lead = o.lead; if (o.dead != null) Cam.dead = o.dead; if (o.snap !== false && t) Cam.snap(); return Cam; };
Cam.snap = () => { if (Cam.target) { Cam.x = Cam.target.x + Cam.offX; Cam.y = Cam.target.y + Cam.offY; } Cam.clampBounds(); Cam.compute(); return Cam; };
Cam.fit = (size) => { Cam.fitSize = size; Cam.compute(); return Cam; };
Cam.baseZoom = () => (Cam.fitSize > 0 ? Math.max(0.05, Math.min(Screen.w, Screen.h) / Cam.fitSize) : 1);
Cam.shake = (amount) => { Cam.trauma = Math.min(1, Cam.trauma + amount); return Cam; };
Cam.kick = (angle, px) => { const s = Settings.get('shake'); Cam.kvx += Math.cos(angle) * px * 22 * s; Cam.kvy += Math.sin(angle) * px * 22 * s; return Cam; };
Cam.punch = (amount) => { Cam.pv += amount * 26 * Settings.get('shake'); return Cam; };
Cam.reset = () => { Object.assign(Cam, { x: 0, y: 0, zoom: 1, rot: 0, userZoom: 1, target: null, bounds: null, trauma: 0, external: false, kx: 0, ky: 0, kvx: 0, kvy: 0, pz: 0, pv: 0, offX: 0, offY: 0, ctl: null }); Cam.compute(); };

Cam.clampBounds = () => {
  const b = Cam.bounds; if (!b) return;
  const z = Cam.ez || 1, hw = Screen.w / z / 2, hh = Screen.h / z / 2;
  if (b.w <= hw * 2) Cam.x = b.x + b.w / 2; else Cam.x = clamp(Cam.x, b.x + hw, b.x + b.w - hw);
  if (b.h <= hh * 2) Cam.y = b.y + b.h / 2; else Cam.y = clamp(Cam.y, b.y + hh, b.y + b.h - hh);
};
/** 算出世界 → 螢幕（CSS px）的矩陣 */
Cam.compute = () => {
  // external：相機由遊戲自己控制（舊遊戲遷移），震動與後座力的位移不套進矩陣，遊戲自己讀 Cam.offsetX/Y
  const ext = Cam.external;
  const z = Cam.baseZoom() * Cam.zoom * Cam.userZoom * (ext ? 1 : 1 + Cam.pz);
  const r = Cam.rot + (ext ? 0 : Cam.sr);
  Cam.ez = z; Cam.er = r;
  const c = Math.cos(-r) * z, s = Math.sin(-r) * z;
  const cx = Screen.w / 2 + (ext ? 0 : Cam.sx + Cam.kx), cy = Screen.h / 2 + (ext ? 0 : Cam.sy + Cam.ky);
  const m = Cam.mat; m[0] = c; m[1] = s; m[2] = -s; m[3] = c; m[4] = cx - (c * Cam.x - s * Cam.y); m[5] = cy - (s * Cam.x + c * Cam.y);
  const det = m[0] * m[3] - m[1] * m[2] || 1, iv = Cam.inv;
  iv[0] = m[3] / det; iv[1] = -m[1] / det; iv[2] = -m[2] / det; iv[3] = m[0] / det; iv[4] = (m[2] * m[5] - m[3] * m[4]) / det; iv[5] = (m[1] * m[4] - m[0] * m[5]) / det;
  // 看得到的世界範圍（旋轉時取外接框）
  const hw = Screen.w / z / 2, hh = Screen.h / z / 2, ac = Math.abs(Math.cos(r)), as = Math.abs(Math.sin(r));
  const ew = hw * ac + hh * as, eh = hw * as + hh * ac;
  const v = Cam.view; v.x = Cam.x - ew; v.y = Cam.y - eh; v.w = ew * 2; v.h = eh * 2;
};
/** 目前震動＋後座力造成的畫面位移（CSS px）；external 模式的遊戲自己加到鏡頭上 */
Object.defineProperty(Cam, 'offsetX', { get: () => Cam.sx + Cam.kx });
Object.defineProperty(Cam, 'offsetY', { get: () => Cam.sy + Cam.ky });
Cam.toWorldX = (sx, sy) => Cam.inv[0] * sx + Cam.inv[2] * sy + Cam.inv[4];
Cam.toWorldY = (sx, sy) => Cam.inv[1] * sx + Cam.inv[3] * sy + Cam.inv[5];
Cam.toScreenX = (wx, wy) => Cam.mat[0] * wx + Cam.mat[2] * wy + Cam.mat[4];
Cam.toScreenY = (wx, wy) => Cam.mat[1] * wx + Cam.mat[3] * wy + Cam.mat[5];
Cam.inView = (x, y, m = 0) => { const v = Cam.view; return x >= v.x - m && x <= v.x + v.w + m && y >= v.y - m && y <= v.y + v.h + m; };

/** 戰略／模擬類的鏡頭操作 */
Cam.controls = (o = {}) => {
  if (o === false) { Cam.ctl = null; return Cam; }
  Cam.ctl = Object.assign({ pan: true, zoom: [0.4, 3], rotate: false, inertia: true, vx: 0, vy: 0, drag: true, keys: true }, o);
  return Cam;
};
function camControls(dt) {
  const c = Cam.ctl; if (!c) return;
  const g = Input.gesture, z = Cam.ez || 1;
  const panning = c.pan && (Input.pointers.size >= 2 || (c.drag && Input.pointers.size === 1));
  if (panning && (g.panX || g.panY)) {
    const cr = Math.cos(Cam.er), sr = Math.sin(Cam.er), wx = (g.panX * cr - g.panY * sr) / z, wy = (g.panX * sr + g.panY * cr) / z;
    Cam.x -= wx; Cam.y -= wy;
    if (dt > 0) { c.vx = lerp(c.vx, -wx / dt, 0.5); c.vy = lerp(c.vy, -wy / dt, 0.5); }
  } else if (c.inertia && !Input.pointers.size) {
    Cam.x += c.vx * dt; Cam.y += c.vy * dt; const k = Math.exp(-5 * dt); c.vx *= k; c.vy *= k;
  } else { c.vx = c.vy = 0; }
  if (c.keys && c.pan) {
    const m = Input.move; if (m.mag > 0 && !Cam.target) { const sp = 600 / z * dt; Cam.x += (m.x * Math.cos(Cam.er) - m.y * Math.sin(Cam.er)) * sp; Cam.y += (m.x * Math.sin(Cam.er) + m.y * Math.cos(Cam.er)) * sp; }
  }
  const zoomBy = g.zoom, rot = c.rotate ? g.rotate : 0;
  if (zoomBy !== 1 || rot) {
    // 讓手指（游標）下面那一點保持不動
    const cx = g.cx || Screen.w / 2, cy = g.cy || Screen.h / 2, wx = Cam.toWorldX(cx, cy), wy = Cam.toWorldY(cx, cy);
    if (zoomBy !== 1) { const zr = c.zoom || [0.4, 3]; Cam.userZoom = clamp(Cam.userZoom * zoomBy, zr[0], zr[1]); }
    if (rot) Cam.rot += rot;
    Cam.compute();
    const nx = Cam.toWorldX(cx, cy), ny = Cam.toWorldY(cx, cy); Cam.x += wx - nx; Cam.y += wy - ny;
  }
}

addSystem({
  name: 'camera', order: 50,
  update(dt) {
    const t = Cam.target;
    if (t) {
      let tx = t.x + Cam.offX, ty = t.y + Cam.offY;
      if (Cam.lead && (t.vx || t.vy)) { tx += (t.vx || 0) * Cam.lead; ty += (t.vy || 0) * Cam.lead; }
      if (Cam.dead > 0) { const dx = tx - Cam.x, dy = ty - Cam.y, d = Math.hypot(dx, dy); if (d > Cam.dead) { const k = (d - Cam.dead) / d; tx = Cam.x + dx * k; ty = Cam.y + dy * k; } else { tx = Cam.x; ty = Cam.y; } }
      Cam.x = damp(Cam.x, tx, Cam.lerpK, dt); Cam.y = damp(Cam.y, ty, Cam.lerpK, dt);
    }
    camControls(dt);
    Cam.clampBounds();
  },
  frame(rdt) {
    // 震動、後座力、推近用真實時間（打擊停頓時還在晃，才有「定格」的力道）
    const s = Settings.get('shake');
    Cam.trauma = Math.max(0, Cam.trauma - Cam.decay * rdt);
    const sh = Cam.trauma * Cam.trauma * s, t = Time.real * Cam.freq;
    Cam.sx = Cam.maxX * sh * noise1(t); Cam.sy = Cam.maxY * sh * noise1(t + 37.1); Cam.sr = Cam.maxR * sh * noise1(t + 71.9);
    // 彈簧：切成小步算（低幀率時一大步會發散）
    const k = 260, d = 22, n = Math.max(1, Math.ceil(rdt / 0.006)), h = rdt / n;
    for (let i = 0; i < n; i++) {
      Cam.kvx += (-k * Cam.kx - d * Cam.kvx) * h; Cam.kvy += (-k * Cam.ky - d * Cam.kvy) * h; Cam.kx += Cam.kvx * h; Cam.ky += Cam.kvy * h;
      Cam.pv += (-200 * Cam.pz - 18 * Cam.pv) * h; Cam.pz += Cam.pv * h;
    }
    Cam.pz = clamp(Cam.pz, -0.5, 1); Cam.kx = clamp(Cam.kx, -200, 200); Cam.ky = clamp(Cam.ky, -200, 200);
    if (Math.abs(Cam.kx) < 0.01 && Math.abs(Cam.kvx) < 0.01) Cam.kx = Cam.kvx = 0;
    if (Math.abs(Cam.ky) < 0.01 && Math.abs(Cam.kvy) < 0.01) Cam.ky = Cam.kvy = 0;
  },
  render() { Cam.compute(); },
});
