/* ==========================================================================
   11 畫圖 API（場景的 render(g) 拿到的 g）
   座標空間：
     g.world()   世界座標（跟著相機：位移、縮放、旋轉、震動）← render 一開始就是這個
     g.screen()  螢幕座標（CSS px，左上角 0,0），不跟相機
     g.hud()     場景畫完：做後製（泛光、扭曲…），之後畫的 HUD 不受震動與後製影響；自動切到 screen
     g.lighting() 套用光影（PZ.light）與霧；之後畫的東西不受明暗影響（發光的燈泡、火焰）。沒呼叫的話 g.hud() 會自動套用
   變形跟 Canvas2D 一樣：g.save() / g.translate() / g.rotate() / g.scale() / g.restore() / g.alpha(a)
   常用：
     g.sprite('hero', x, y, { r: 角度, s: 縮放, sx, sy, a: 透明度, color: 上色, add: 發光 0～1, flash: 閃白 0～1, ax, ay })
     g.spr(frame, x, y, r, sx, sy, a, color, add, flash)    ← 熱迴圈用，不產生物件
     g.rect(x, y, w, h, color, { a, add, r, ax, ay })
     g.circle(x, y, r, color, { a, add })    g.ring(x, y, r, 粗細, color)    g.glow(x, y, r, color, { a, core })
     g.line(x1, y1, x2, y2, 粗細, color, { a, add, cap: 'round' })
     g.poly([x0,y0, x1,y1, …], color)         g.trail(點陣列, 頭寬, 尾寬, 頭色, 尾色, { add })
     g.text('字', x, y, { size, color, weight, outline, outlineColor, shadow, align, baseline, maxWidth })
     g.bar(x, y, w, h, 比例, { bg, fg, back })  血條
     g.into('decals', () => { …畫進畫布貼圖… })
     g.castShadow('hero', x, y, { len, a })   角色投影（朝離燈的方向）    g.beam(x, y, 角度, 長度, 起寬, 終寬, color)  光束
     g.water(x, y, w, h, { mode: 'mirror' | 'flat', color, reflect })     水面（倒影、波紋）    g.haze(x, y, w, h)  熱浪扭曲
   ========================================================================== */
const M_ID = [1, 0, 0, 1, 0, 0];
let PolyScratch = new Float64Array(64);   // g.polyTex 用的暫存（螢幕座標＋材質座標）
class Graphics {
  constructor() {
    this.m = new Float64Array(6); this.m.set(M_ID);
    this.stack = []; this.al = 1; this.space = 'world'; this.blendName = 'normal';
    this._opt = {};
  }
  get r() { return Gfx.r; }
  /* ---- 座標空間 ---- */
  _base(space) {
    const res = Screen.res, m = this.m;
    if (space === 'world') { const v = Cam.mat; m[0] = v[0] * res; m[1] = v[1] * res; m[2] = v[2] * res; m[3] = v[3] * res; m[4] = v[4] * res; m[5] = v[5] * res; }
    else { m[0] = res; m[1] = 0; m[2] = 0; m[3] = res; m[4] = 0; m[5] = 0; }
    this.space = space; this.stack.length = 0; this.al = 1;
  }
  world() { this._base('world'); return this; }
  screen() { this._base('screen'); return this; }
  hud() {
    if (this._hudDone) { this._base('screen'); return this; }
    this.lighting(); Weather._drawOver(this); Fx._drawAuto(this);
    this.r.hud(); this._base('screen'); Cinema._drawBars(this);
    this._hudDone = true; return this;
  }
  /** 套用光影（PZ.light）與霧：之前畫的東西被照亮／變暗，之後畫的（燈泡、火焰、發光字）照原樣。沒呼叫的話 g.hud() 會自動套用 */
  lighting() { if (this._litDone) return this; this._litDone = true; Weather._drawUnder(this); Light._apply(this); return this; }
  /* ---- 變形 ---- */
  save() { this.stack.push([this.m[0], this.m[1], this.m[2], this.m[3], this.m[4], this.m[5], this.al, this.blendName]); return this; }
  restore() { const s = this.stack.pop(); if (s) { this.m.set(s.slice(0, 6)); this.al = s[6]; if (s[7] !== this.blendName) this.blend(s[7]); } return this; }
  translate(x, y) { const m = this.m; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; return this; }
  scale(sx, sy = sx) { const m = this.m; m[0] *= sx; m[1] *= sx; m[2] *= sy; m[3] *= sy; return this; }
  rotate(a) { if (!a) return this; const m = this.m, c = Math.cos(a), s = Math.sin(a), a0 = m[0], b0 = m[1], c0 = m[2], d0 = m[3]; m[0] = a0 * c + c0 * s; m[1] = b0 * c + d0 * s; m[2] = c0 * c - a0 * s; m[3] = d0 * c - b0 * s; return this; }
  transform(a, b, c, d, e, f) { const m = this.m, a0 = m[0], b0 = m[1], c0 = m[2], d0 = m[3]; m[0] = a0 * a + c0 * b; m[1] = b0 * a + d0 * b; m[2] = a0 * c + c0 * d; m[3] = b0 * c + d0 * d; m[4] += a0 * e + c0 * f; m[5] += b0 * e + d0 * f; return this; }
  /** 乘上透明度（save/restore 會記住） */
  alpha(a) { this.al *= a; return this; }
  /** 混合模式：'normal' | 'add' | 'multiply' | 'screen' | 'erase' */
  blend(name = 'normal') { this.blendName = name; this.r.setBlend(name); return this; }
  /* ---- 內部：把單位正方形經過 L 再經過目前矩陣送出去 ---- */
  _emit(t, la, lb, lc, ld, le, lf, u0, v0, u1, v1, color, mode, add, param) {
    const m = this.m;
    this.r.quad(t, m[0] * la + m[2] * lb, m[1] * la + m[3] * lb, m[0] * lc + m[2] * ld, m[1] * lc + m[3] * ld, m[0] * le + m[2] * lf + m[4], m[1] * le + m[3] * lf + m[5], u0, v0, u1, v1, color, mode, add > 1 ? 1 : add < 0 ? 0 : add, param > 1 ? 1 : param < 0 ? 0 : param);
  }
  _col(color, a) { const c = color == null ? WHITE : typeof color === 'number' ? color : toColor(color); const al = cA(c) * a * this.al; return al >= 0.999 ? (c | 0xff000000) >>> 0 : (((Math.round(clamp01(al) * 255) << 24) | (c & 0xffffff)) >>> 0); }
  /* ---- 貼圖 ---- */
  spr(f, x, y, r = 0, sx = 1, sy = sx, a = 1, color, add = 0, flash = 0, ax, ay) {
    if (typeof f === 'string') f = Art.get(f);
    if (!f.tex) return this;
    const W = f.w * sx, H = f.h * sy, axx = ax == null ? f.ax : ax, ayy = ay == null ? f.ay : ay;
    let la, lb, lc, ld;
    if (r) { const c = Math.cos(r), s = Math.sin(r); la = c * W; lb = s * W; lc = -s * H; ld = c * H; } else { la = W; lb = 0; lc = 0; ld = H; }
    this._emit(f.tex, la, lb, lc, ld, x - axx * la - ayy * lc, y - axx * lb - ayy * ld, f.u0, f.v0, f.u1, f.v1, this._col(color, a), MODE.sprite, add, flash);
    return this;
  }
  sprite(f, x, y, o) {
    if (!o) return this.spr(f, x, y);
    const s = o.s != null ? o.s : 1;
    let sx = o.sx != null ? o.sx * s : s, sy = o.sy != null ? o.sy * s : s;
    if (o.flipX) sx = -sx; if (o.flipY) sy = -sy;
    if (o.silhouette) { // 純色剪影（上色受擊、陰影）
      if (typeof f === 'string') f = Art.get(f); if (!f.tex) return this;
      const W = f.w * sx, H = f.h * sy, r = o.r || 0, c = Math.cos(r), sn = Math.sin(r), la = c * W, lb = sn * W, lc = -sn * H, ld = c * H, ax = o.ax == null ? f.ax : o.ax, ay = o.ay == null ? f.ay : o.ay;
      this._emit(f.tex, la, lb, lc, ld, x - ax * la - ay * lc, y - ax * lb - ay * ld, f.u0, f.v0, f.u1, f.v1, this._col(o.color || '#000', o.a == null ? 1 : o.a), MODE.silhouette, o.add || 0, 0);
      return this;
    }
    return this.spr(f, x, y, o.r || 0, sx, sy, o.a == null ? 1 : o.a, o.color, o.add || 0, o.flash || 0, o.ax, o.ay);
  }
  /** 把一張圖鋪滿一個矩形（背景、地板）；u/v 可以平移（捲動） */
  tile(f, x, y, w, h, o = {}) {
    if (typeof f === 'string') f = Art.get(f); if (!f.tex) return this;
    const tw = f.w * (o.s || 1), th = f.h * (o.s || 1), ox = ((o.ox || 0) % tw + tw) % tw, oy = ((o.oy || 0) % th + th) % th;
    const col = this._col(o.color, o.a == null ? 1 : o.a);
    for (let ty = y - oy; ty < y + h; ty += th) for (let tx = x - ox; tx < x + w; tx += tw) {
      const x0 = Math.max(tx, x), y0 = Math.max(ty, y), x1 = Math.min(tx + tw, x + w), y1 = Math.min(ty + th, y + h);
      if (x1 <= x0 || y1 <= y0) continue;
      const fu0 = (x0 - tx) / tw, fv0 = (y0 - ty) / th, fu1 = (x1 - tx) / tw, fv1 = (y1 - ty) / th, du = f.u1 - f.u0, dv = f.v1 - f.v0;
      this._emit(f.tex, x1 - x0, 0, 0, y1 - y0, x0, y0, f.u0 + du * fu0, f.v0 + dv * fv0, f.u0 + du * fu1, f.v0 + dv * fv1, col, MODE.sprite, o.add || 0, 0);
    }
    return this;
  }
  /* ---- 形狀 ---- */
  rect(x, y, w, h, color, o) {
    const a = o && o.a != null ? o.a : 1, add = (o && o.add) || 0, r = (o && o.r) || 0;
    if (r) { const ax = o.ax == null ? 0.5 : o.ax, ay = o.ay == null ? 0.5 : o.ay, c = Math.cos(r), s = Math.sin(r), la = c * w, lb = s * w, lc = -s * h, ld = c * h; this._emit(null, la, lb, lc, ld, x - ax * la - ay * lc, y - ax * lb - ay * ld, 0, 0, 1, 1, this._col(color, a), MODE.solid, add, 0); }
    else this._emit(null, w, 0, 0, h, x, y, 0, 0, 1, 1, this._col(color, a), MODE.solid, add, 0);
    return this;
  }
  /** 整個畫面填色（不管相機） */
  fill(color, a = 1) { this.save(); this._base('screen'); this.rect(0, 0, Screen.w, Screen.h, color, { a }); this.restore(); return this; }
  circle(x, y, r, color, o) { this._emit(null, r * 2, 0, 0, r * 2, x - r, y - r, -1, -1, 1, 1, this._col(color, o && o.a != null ? o.a : 1), MODE.circle, (o && o.add) || 0, 0); return this; }
  /** 橢圓（影子很好用） */
  ellipse(x, y, rx, ry, color, o) { this._emit(null, rx * 2, 0, 0, ry * 2, x - rx, y - ry, -1, -1, 1, 1, this._col(color, o && o.a != null ? o.a : 1), MODE.circle, (o && o.add) || 0, 0); return this; }
  ring(x, y, r, thick, color, o) { this._emit(null, r * 2, 0, 0, r * 2, x - r, y - r, -1, -1, 1, 1, this._col(color, o && o.a != null ? o.a : 1), MODE.ring, (o && o.add) || 0, clamp01(thick / r)); return this; }
  /** 柔光：預設加亮（add=1）；core 0～1 讓中心更亮 */
  glow(x, y, r, color, o) { this._emit(null, r * 2, 0, 0, r * 2, x - r, y - r, -1, -1, 1, 1, this._col(color, o && o.a != null ? o.a : 1), MODE.glow, o && o.add != null ? o.add : 1, (o && o.core) || 0); return this; }
  line(x1, y1, x2, y2, w, color, o) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy); if (len < 1e-6) return this;
    const nx = -dy / len, ny = dx / len, col = this._col(color, o && o.a != null ? o.a : 1), add = (o && o.add) || 0;
    this._emit(null, dx, dy, nx * w, ny * w, x1 - nx * w / 2, y1 - ny * w / 2, -1, -1, 1, 1, col, MODE.line, add, 0);
    if (o && o.cap === 'round') { const r = w / 2; this._emit(null, w, 0, 0, w, x1 - r, y1 - r, -1, -1, 1, 1, col, MODE.circle, add, 0); this._emit(null, w, 0, 0, w, x2 - r, y2 - r, -1, -1, 1, 1, col, MODE.circle, add, 0); }
    return this;
  }
  /** 凸多邊形：[x0,y0, x1,y1, …] */
  poly(pts, color, o) {
    const n = pts.length / 2; if (n < 3) return this;
    const m = this.m, col = this._col(color, o && o.a != null ? o.a : 1), add = (o && o.add) || 0;
    const X = (i) => m[0] * pts[i * 2] + m[2] * pts[i * 2 + 1] + m[4], Y = (i) => m[1] * pts[i * 2] + m[3] * pts[i * 2 + 1] + m[5];
    const x0 = X(0), y0 = Y(0);
    for (let i = 1; i < n - 1; i++) this.r.tri(x0, y0, X(i), Y(i), X(i + 1), Y(i + 1), col, add);
    return this;
  }
  /**
   * 貼材質的凸多邊形 [x0,y0, x1,y1, …]：材質照世界座標一直重複（PZ.art.pattern 做的圖），形狀怎麼切都接得起來
   * o = { s（材質放大幾倍）, color（染色：乘上去）, a, add, ox, oy（材質的原點） }
   */
  polyTex(pts, f, o) {
    if (typeof f === 'string') f = Art.get(f);
    const n = pts.length / 2; if (n < 3) return this;
    if (!f.tex || !f.pattern || this.r.kind === 'canvas2d') {   // Canvas2D：平均色×染色
      const t = toColor(o && o.color != null ? o.color : WHITE), a = f.avg != null ? f.avg : 0xff808080;
      return this.poly(pts, Color.rgb((cR(a) * cR(t)) / 255, (cG(a) * cG(t)) / 255, (cB(a) * cB(t)) / 255, cA(t)), o);
    }
    const m = this.m, col = this._col(o && o.color, o && o.a != null ? o.a : 1), add = (o && o.add) || 0;
    const sc = (o && o.s) || 1, tw = f.w * sc, th = f.h * sc, ox = (o && o.ox) || 0, oy = (o && o.oy) || 0;
    // 材質座標減掉整數（重複取樣下一樣），數字小，手機的半精度才不會糊
    let bu = Infinity, bv = Infinity; for (let i = 0; i < n; i++) { const u = (pts[i * 2] - ox) / tw, v = (pts[i * 2 + 1] - oy) / th; if (u < bu) bu = u; if (v < bv) bv = v; }
    bu = Math.floor(bu); bv = Math.floor(bv);
    const S = PolyScratch.length >= n * 4 ? PolyScratch : (PolyScratch = new Float64Array(n * 4)), r = this.r, t = f.tex;
    for (let i = 0; i < n; i++) { const x = pts[i * 2], y = pts[i * 2 + 1], j = i * 4; S[j] = m[0] * x + m[2] * y + m[4]; S[j + 1] = m[1] * x + m[3] * y + m[5]; S[j + 2] = (x - ox) / tw - bu; S[j + 3] = (y - oy) / th - bv; }
    for (let i = 1; i < n - 1; i++) { const j = i * 4, k = j + 4; r.quadv(t, S[0], S[1], S[2], S[3], S[j], S[j + 1], S[j + 2], S[j + 3], S[k], S[k + 1], S[k + 2], S[k + 3], S[k], S[k + 1], S[k + 2], S[k + 3], col, col, MODE.sprite, add, 0); }
    return this;
  }
  /** 拖尾／光帶：pts 是 [{x,y}…]（頭在前面），寬度與顏色從頭漸變到尾 */
  trail(pts, w0, w1, c0, c1, o) {
    const n = pts.length; if (n < 2) return this;
    const m = this.m, add = o && o.add != null ? o.add : 0, a = o && o.a != null ? o.a : 1;
    const A = this._col(c0, a), B = this._col(c1 == null ? Color.alpha(c0, 0) : c1, a);
    let px = 0, py = 0, pl = 0, pr = 0, plx = 0, ply = 0, prx = 0, pry = 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[Math.min(n - 1, i + 1)], o2 = pts[Math.max(0, i - 1)];
      let dx = q.x - o2.x, dy = q.y - o2.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const t = i / (n - 1), w = lerp(w0, w1, t) / 2, nx = -dy * w, ny = dx * w;
      const lx = p.x + nx, ly = p.y + ny, rx = p.x - nx, ry = p.y - ny;
      const LX = m[0] * lx + m[2] * ly + m[4], LY = m[1] * lx + m[3] * ly + m[5], RX = m[0] * rx + m[2] * ry + m[4], RY = m[1] * rx + m[3] * ry + m[5];
      if (i > 0) { const ca = Color.mix(A, B, (i - 1) / (n - 1)), cb = Color.mix(A, B, t); this.r.quad4(null, plx, ply, LX, LY, RX, RY, prx, pry, -1, -1, 1, 1, ca, cb, MODE.line, add, 0); }
      plx = LX; ply = LY; prx = RX; pry = RY; px = p.x; py = p.y; pl = w; pr = w;
    }
    return this;
  }
  /** 血條：frac 0～1；back 是「剛被扣掉、慢慢追上」的那一截 */
  bar(x, y, w, h, frac, o = {}) {
    this.rect(x, y, w, h, o.bg || 'rgba(0,0,0,.55)');
    if (o.back != null && o.back > frac) this.rect(x, y, w * clamp01(o.back), h, o.backColor || '#fff', { a: 0.85 });
    this.rect(x, y, w * clamp01(frac), h, o.fg || '#e33');
    return this;
  }
  /* ---- 文字 ---- */
  text(str, x, y, st) {
    if (str == null || str === '') return { w: 0, h: 0 };
    st = st || this._opt;
    return Text.draw(this.r, this.m, String(str), x, y, st, (st.a == null ? 1 : st.a) * this.al);
  }
  measure(str, st) { return Text.measure(String(str), st || {}); }
  /* ---- 畫進畫布貼圖 ---- */
  into(target, fn, clear) {
    const f = typeof target === 'string' ? Art.get(target) : target; if (!f.rt) { warnOnce('into', 'g.into 只能畫進 PZ.art.target() 建的貼圖'); return this; }
    const r = this.r; this.save();
    r.beginTarget(f.tex, clear);
    const m = this.m; m[0] = f.res; m[1] = 0; m[2] = 0; m[3] = f.res; m[4] = 0; m[5] = 0; this.al = 1;
    try { fn(this); } catch (e) { reportError(e, 'g.into'); }
    r.flush(); r.endTarget();
    this.restore();
    return this;
  }
  /** 這個點在不在畫面裡（世界座標、加邊界），畫之前先問可以省很多 */
  visible(x, y, margin = 64) { return Cam.inView(x, y, margin); }
}
const G = PZ.g = new Graphics();
