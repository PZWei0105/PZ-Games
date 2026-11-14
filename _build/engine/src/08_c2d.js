/* ==========================================================================
   08 Canvas2D 後備繪圖器
   沒有 WebGL2、或 WebGL 一直救不回來時用。介面跟 GLRenderer 一樣，遊戲不用改。
   做不到的：後製（泛光、扭曲、色差、調色）、上色（tint）。閃白、暗角、加亮照常。
   ========================================================================== */
class C2DRenderer {
  constructor(canvas) {
    this.kind = 'canvas2d'; this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    if (!this.ctx) throw new Error('沒有 Canvas2D');
    this.cur = this.ctx; this.textures = new Set();
    this.stats = { draws: 0, quads: 0, flushes: 0, tex: 0 };
    this.blendOp = 'source-over'; this.lost = false; this.inScene = false;
    this.w = canvas.width; this.h = canvas.height;
    this._glow = new Map(); this._vig = null; this._vigKey = '';
  }
  texCreate(w, h, o = {}) {
    const t = { id: ++TexId, w, h, canvas: document.createElement('canvas'), nearest: !!o.nearest, rt: !!o.rt, restore: o.restore || null };
    t.canvas.width = w; t.canvas.height = h; t.ctx = t.canvas.getContext('2d');
    this.textures.add(t); return t;
  }
  texUpload(t, src, x = 0, y = 0) { t.ctx.drawImage(src, x, y); t._white = null; t._sil = null; }
  texClear(t) { t.ctx.clearRect(0, 0, t.w, t.h); t._white = null; }
  texDelete(t) { if (t.canvas && !t.live) { t.canvas.width = t.canvas.height = 0; } t.canvas = null; this.textures.delete(t); } // live＝遊戲自己的畫布，不清
  begin(clear) {
    this.w = this.canvas.width; this.h = this.canvas.height;
    this.stats.draws = this.stats.quads = this.stats.lights = 0;
    const c = this.ctx; this.cur = c;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.fillStyle = Color.css(Color.alpha(clear == null ? '#000' : clear, 1)); c.fillRect(0, 0, this.w, this.h);
    this.inScene = true;
  }
  beginTarget(t, clear) {
    this._prev = this.cur; this.cur = t.ctx; t._white = null;
    if (clear !== undefined) { t.ctx.setTransform(1, 0, 0, 1, 0, 0); t.ctx.clearRect(0, 0, t.w, t.h); const cc = toColor(clear); if (cA(cc) > 0) { t.ctx.fillStyle = Color.css(cc); t.ctx.fillRect(0, 0, t.w, t.h); } }
  }
  endTarget() { this.cur = this._prev || this.ctx; }
  setBlend(name) { this.blendOp = name === 'multiply' ? 'multiply' : name === 'screen' ? 'screen' : name === 'erase' ? 'destination-out' : name === 'add' ? 'lighter' : 'source-over'; }
  whiteOf(t) {
    if (t._white) return t._white;
    const w = document.createElement('canvas'); w.width = t.w; w.height = t.h; const x = w.getContext('2d');
    x.drawImage(t.canvas, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, t.w, t.h);
    t._white = w; return w;
  }
  glowOf(color) {
    const key = color & 0xffffff; let g = this._glow.get(key);
    if (g) return g;
    g = document.createElement('canvas'); g.width = g.height = 64; const x = g.getContext('2d');
    const r = cR(color), gg = cG(color), b = cB(color), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${r},${gg},${b},1)`); gr.addColorStop(0.35, `rgba(${r},${gg},${b},0.45)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    if (this._glow.size > 64) this._glow.clear();
    this._glow.set(key, g); return g;
  }
  quad(t, a, b, c, d, e, f, u0, v0, u1, v1, color, mode, add, param) {
    const x = this.cur; this.stats.quads++;
    const al = cA(color); if (al <= 0.002) return;
    x.setTransform(a, b, c, d, e, f);
    x.globalAlpha = al;
    x.globalCompositeOperation = add > 0.5 ? 'lighter' : this.blendOp;
    if (mode === MODE.sprite || mode === MODE.silhouette) {
      if (!t || !t.canvas) return;
      let sx = u0 * t.w, sy = v0 * t.h, sw = (u1 - u0) * t.w, sh = (v1 - v0) * t.h;
      if (sw < 0) { x.transform(-1, 0, 0, 1, 1, 0); sx += sw; sw = -sw; }
      if (sh < 0) { x.transform(1, 0, 0, -1, 0, 1); sy += sh; sh = -sh; }
      if (sw <= 0 || sh <= 0) return;
      if (mode === MODE.silhouette) { x.drawImage(this.whiteOf(t), sx, sy, sw, sh, 0, 0, 1, 1); return; }
      x.drawImage(t.canvas, sx, sy, sw, sh, 0, 0, 1, 1);
      if (param > 0.01) { x.globalAlpha = al * param; x.drawImage(this.whiteOf(t), sx, sy, sw, sh, 0, 0, 1, 1); }
    } else if (mode === MODE.solid || mode === MODE.line) {
      x.fillStyle = Color.css(color | 0xff000000); x.fillRect(0, 0, 1, 1);
    } else if (mode === MODE.circle) {
      x.fillStyle = Color.css(color | 0xff000000); x.beginPath(); x.arc(0.5, 0.5, 0.5, 0, TAU); x.fill();
    } else if (mode === MODE.ring) {
      const th = Math.max(0.02, param) * 0.5; x.strokeStyle = Color.css(color | 0xff000000); x.lineWidth = th; x.beginPath(); x.arc(0.5, 0.5, 0.5 - th / 2, 0, TAU); x.stroke();
    } else if (mode === MODE.glow) {
      x.drawImage(this.glowOf(color), 0, 0, 1, 1);
    }
  }
  quad4(t, x0, y0, x1, y1, x2, y2, x3, y3, u0, v0, u1, v1, c0, c1, mode, add) { this.quadv(t, x0, y0, 0, 0, x1, y1, 0, 0, x2, y2, 0, 0, x3, y3, 0, 0, c0, c1, mode, add); }
  quadv(t, x0, y0, u0, v0, x1, y1, u1, v1, x2, y2, u2, v2, x3, y3, u3, v3, c0, c1, mode, add) {
    const x = this.cur; x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = add > 0.5 ? 'lighter' : this.blendOp;
    if (mode === MODE.beam) { // 光束：沿長度漸層（橫向柔邊做不到，用整塊淡一點代替）
      x.globalAlpha = 0.7; const g = x.createLinearGradient((x0 + x3) / 2, (y0 + y3) / 2, (x1 + x2) / 2, (y1 + y2) / 2);
      g.addColorStop(0, Color.css(c0)); g.addColorStop(1, Color.css(c1)); x.fillStyle = g;
    } else {
      x.globalAlpha = (cA(c0) + cA(c1)) / 2; if (x.globalAlpha <= 0.002) return;
      x.fillStyle = Color.css(Color.mix(c0, c1, 0.5) | 0xff000000);
    }
    x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.lineTo(x2, y2); x.lineTo(x3, y3); x.closePath(); x.fill();
  }
  tri(x1, y1, x2, y2, x3, y3, color, add) {
    const x = this.cur; x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = cA(color);
    x.globalCompositeOperation = add > 0.5 ? 'lighter' : this.blendOp;
    x.fillStyle = Color.css(color | 0xff000000); x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.lineTo(x3, y3); x.closePath(); x.fill();
  }
  flush() { }
  /** 光影（沒有陰影）：小張的光照圖，用 multiply 疊上去 */
  lighting(S) {
    if (this.cur !== this.ctx) return false;
    const sc = 0.25, lw = Math.max(1, Math.ceil(this.w * sc)), lh = Math.max(1, Math.ceil(this.h * sc));
    const lc = this._lc || (this._lc = document.createElement('canvas'));
    if (lc.width !== lw || lc.height !== lh) { lc.width = lw; lc.height = lh; }
    const x = lc.getContext('2d'), a = S.ambient, b = (v) => Math.max(0, Math.min(255, v * 255)) | 0;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    x.fillStyle = `rgb(${b(a[0])},${b(a[1])},${b(a[2])})`; x.fillRect(0, 0, lw, lh);
    if (S.zones) for (const z of S.zones) { x.globalAlpha = z.a; x.fillStyle = `rgb(${b(z.r)},${b(z.g)},${b(z.b)})`; x.fillRect(z.x0 * sc, z.y0 * sc, (z.x1 - z.x0) * sc, (z.y1 - z.y0) * sc); }
    x.globalAlpha = 1; x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < S.n; i++) {
      const l = S.lights[i], px = l.x * sc, py = l.y * sc, r = Math.max(1, l.r * sc), rgb = `${b(l.cr * 2)},${b(l.cg * 2)},${b(l.cb * 2)}`;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.3, `rgba(${rgb},.62)`); g.addColorStop(0.65, `rgba(${rgb},.2)`); g.addColorStop(1, `rgba(${rgb},0)`);
      x.fillStyle = g; x.beginPath();
      if (l.cone) { const ang = Math.atan2(l.cone[1], l.cone[0]), half = Math.acos(clamp(l.cone[2], -1, 1)); x.moveTo(px, py); x.arc(px, py, r, ang - half, ang + half); x.closePath(); }
      else x.arc(px, py, r, 0, TAU);
      x.fill();
    }
    const c = this.ctx; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'multiply'; c.imageSmoothingEnabled = true;
    c.drawImage(lc, 0, 0, this.w, this.h); c.restore();
    this.stats.lights = (this.stats.lights || 0) + S.n;
    return true;
  }
  /** 水面：倒影＋上色（扭曲、熱浪做不到） */
  grab(o) {
    if (this.cur !== this.ctx || o.mode === 2) return false;
    const c = this.ctx, r = o.rect, w = r[2] - r[0], h = r[3] - r[1]; if (w <= 0 || h <= 0) return false;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over';
    c.beginPath(); if (o.shape) c.ellipse(r[0] + w / 2, r[1] + h / 2, w / 2, h / 2, 0, 0, TAU); else c.rect(r[0], r[1], w, h); c.clip();
    if (o.mode === 0 && o.reflect > 0) {
      const sy = Math.max(0, r[1] - h), sh = r[1] - sy;
      if (sh > 1) { c.save(); c.globalAlpha = o.reflect * 0.75; c.translate(0, 2 * r[1]); c.scale(1, -1); c.drawImage(this.canvas, r[0], sy, w, sh, r[0], sy, w, sh); c.restore(); }
    }
    const k = o.col; c.globalAlpha = k[3] * 0.65; c.fillStyle = `rgb(${k[0] * 255 | 0},${k[1] * 255 | 0},${k[2] * 255 | 0})`; c.fillRect(r[0], r[1], w, h);
    if (o.mode === 0 && o.foam > 0) { c.globalAlpha = o.foam * 0.5; c.fillStyle = '#fff'; c.fillRect(r[0], r[1], w, Math.max(1, o.scale)); }
    c.restore();
    return true;
  }
  hud() {
    if (!this.inScene) return; this.inScene = false;
    const x = this.ctx; x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over';
    if (Post.vignette > 0.01) {
      const key = this.w + 'x' + this.h + ':' + Post.vignette.toFixed(2) + Post.vignetteColor;
      if (key !== this._vigKey) {
        this._vigKey = key; const v = this._vig || (this._vig = document.createElement('canvas')); v.width = Math.max(1, this.w / 4 | 0); v.height = Math.max(1, this.h / 4 | 0);
        const vx = v.getContext('2d'), cx = v.width / 2, cy = v.height / 2, R = Math.hypot(cx, cy), g = vx.createRadialGradient(cx, cy, R * 0.25, cx, cy, R);
        const vc = toColor(Post.vignetteColor); g.addColorStop(0, `rgba(${cR(vc)},${cG(vc)},${cB(vc)},0)`); g.addColorStop(1, `rgba(${cR(vc)},${cG(vc)},${cB(vc)},${Math.min(0.9, Post.vignette * 1.6)})`);
        vx.fillStyle = g; vx.fillRect(0, 0, v.width, v.height);
      }
      x.globalAlpha = 1; x.drawImage(this._vig, 0, 0, this.w, this.h);
    }
    const fl = Post.flash, a = fl[3] * Settings.flashScale();
    if (a > 0.002) { x.globalAlpha = a; x.fillStyle = `rgb(${fl[0] * 255 | 0},${fl[1] * 255 | 0},${fl[2] * 255 | 0})`; x.fillRect(0, 0, this.w, this.h); }
    x.globalAlpha = 1;
  }
  end() { if (this.inScene) this.hud(); }
  destroy() { }
}

/* ---------- 選擇繪圖器、處理 WebGL 遺失 ---------- */
const Gfx = PZ.gfx = { r: null, kind: '', forced: null };
Gfx.create = (prefer) => {
  const cv = Screen.canvas;
  if (prefer !== 'canvas2d') {
    try { Gfx.r = new GLRenderer(cv); Gfx.kind = 'webgl2'; return Gfx.r; }
    catch (e) { warnOnce('gl', 'WebGL2 用不了，改用 Canvas2D：' + e.message); }
  }
  // 已經拿過 WebGL context 的畫布不能再拿 2D：換一張新的
  const fresh = document.createElement('canvas'); fresh.id = 'pz-canvas'; fresh.width = cv.width; fresh.height = cv.height;
  cv.replaceWith(fresh); Screen.canvas = fresh;
  Gfx.r = new C2DRenderer(fresh); Gfx.kind = 'canvas2d';
  return Gfx.r;
};
/** 換成 Canvas2D（WebGL 救不回來時自動呼叫；也可以手動測試） */
Gfx.fallback = () => {
  if (Gfx.kind === 'canvas2d') return;
  const old = Gfx.r, texs = old ? [...old.textures] : [];
  try { if (old) old.destroy(); } catch (e) { /* ignore */ }
  const r = Gfx.create('canvas2d');
  for (const t of texs) { // 把貼圖搬到新的繪圖器：由各自的 restore 重畫
    t.gl = null; t.fb = null; t.canvas = document.createElement('canvas'); t.canvas.width = t.w; t.canvas.height = t.h; t.ctx = t.canvas.getContext('2d');
    r.textures.add(t); if (t.restore) safeCall(t.restore, null, t);
  }
  PZ.emit('renderer', 'canvas2d');
};
// WebGL 遺失超過 4 秒（畫面看得到的狀態下）還沒恢復：換 Canvas2D
addSystem({ name: 'gfx-watch', order: -80, frame() { const r = Gfx.r; if (r && r.lost && !document.hidden && Time.real - (r.lostAt || Time.real) > 4) Gfx.fallback(); } });
PZ.on('visible', () => { if (Gfx.r && Gfx.r.lost) Gfx.r.lostAt = Time.real; });
