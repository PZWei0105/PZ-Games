/* ==========================================================================
   32 HUD 元件（畫在畫布上；通常在 g.hud() 之後畫，不受震動、後製影響）
     const hp = PZ.meter({ max: 100, value: 100 })     hp.hit(18)  hp.heal(25)  hp.set(v)   （引擎每格自動更新）
     g.meter(hp, x, y, w, h, { color: '#ff4d5e', color2, shape: 'skew'|'round'|'flat', segments: 10, low: 0.3, label: 'HP', text: true })
       受傷：主條馬上掉、白色殘影停一下再慢慢退、整條閃白抖一下；補血：綠色預覽先長出來、主條再追上；快沒血時一閃一閃
     const score = PZ.count(0)    score.add(120)        數字一路往上滾、每跳一下有聲音、變大一下
     g.count(score, x, y, { size: 30, color, align: 'right', prefix: '', suffix: '' })
     g.arc(x, y, r, 粗細, 起角, 終角, color, { cap: 'round', a })   圓弧（經驗值環、充能）
     g.pie(x, y, r, 起角, 終角, color, { a })                       扇形
     g.cooldown(x, y, r, 剩下 0～1, { color, flash })               技能冷卻：暗色扇形一圈掃開、外圈亮邊；好了的瞬間閃一下（flash 0～1）
     g.rrect(x, y, w, h, 圓角, color, { a, border, borderColor })   圓角框
     g.quad([x0,y0, x1,y1, x2,y2, x3,y3], 左色, 右色, { a, add })   任意四邊形、左右漸層（順時針：左上、右上、右下、左下）
   ========================================================================== */
const HudList = new Set();
class Meter {
  constructor(o = {}) {
    this.max = o.max != null ? o.max : 100; this.value = clamp(o.value != null ? o.value : this.max, 0, this.max);
    this.shown = this.value; this.trail = this.value; this.ghost = this.value;
    this.hold = 0; this.flash = 0; this.shake = 0; this.t = 0; this.drain = o.drain || 0.55; this.fill = o.fill || 5;
    this.dead = false; this.keep = !!o.keep; this.scene = Scenes.name; HudList.add(this);
  }
  get frac() { return this.max > 0 ? this.value / this.max : 0; }
  /** 直接設定（instant：沒有動畫） */
  set(v, instant) {
    v = clamp(v, 0, this.max);
    if (v < this.value) { this.hold = Math.max(this.hold, 0.45); this.shown = v; } else this.ghost = v;
    this.value = v; if (instant) this.shown = this.trail = this.ghost = v; return this;
  }
  hit(n) { const before = this.value; this.set(this.value - n); const k = (before - this.value) / Math.max(1, this.max); this.flash = 1; this.shake = Math.min(1, this.shake + k * 5 + 0.15); return this; }
  heal(n) { this.set(this.value + n); return this; }
  setMax(m, keepFrac) { const f = this.frac; this.max = Math.max(1, m); this.set(keepFrac ? f * this.max : Math.min(this.value, this.max), true); return this; }
  update(dt) {
    this.t += dt;
    if (this.shown < this.value) this.shown = Math.min(this.value, damp(this.shown, this.value, this.fill, dt) + this.max * 0.04 * dt);
    else this.shown = this.value;
    if (this.trail > this.shown) { if (this.hold > 0) this.hold -= dt; else this.trail = Math.max(this.shown, this.trail - this.max * this.drain * dt * (0.4 + (this.trail - this.shown) / this.max * 2)); } else this.trail = this.shown;
    if (this.ghost < this.shown || Math.abs(this.ghost - this.value) > 1e-6 && this.ghost < this.value) this.ghost = Math.max(this.ghost, this.shown);
    if (this.ghost > this.value) this.ghost = this.value;
    this.flash = Math.max(0, this.flash - dt * 4); this.shake = Math.max(0, this.shake - dt * 3);
  }
  remove() { this.dead = true; HudList.delete(this); }
}
PZ.meter = (o) => new Meter(o);
PZ.Meter = Meter;

const fmtThousands = (n) => { const s = String(Math.abs(Math.round(n))); let out = ''; for (let i = 0; i < s.length; i++) { if (i && (s.length - i) % 3 === 0) out += ','; out += s[i]; } return (n < 0 ? '-' : '') + out; };
class Count {
  constructor(v = 0, o = {}) { this.value = v; this.shown = v; this.speed = o.speed || 7; this.pop = 0; this.sound = o.sound === undefined ? 'tick' : o.sound; this.fmt = o.format || fmtThousands; this._tick = 0; this.dead = false; this.keep = !!o.keep; this.scene = Scenes.name; HudList.add(this); }
  set(v, instant) { if (v > this.value) this.pop = Math.min(1, this.pop + 0.5); this.value = v; if (instant) this.shown = v; return this; }
  add(n) { return this.set(this.value + n); }
  get rolling() { return Math.round(this.shown) !== Math.round(this.value); }
  update(dt) {
    const d = this.value - this.shown;
    if (Math.abs(d) < 0.5) this.shown = this.value;
    else {
      const before = Math.round(this.shown);
      this.shown += d * Math.min(1, dt * this.speed) + Math.sign(d) * Math.min(Math.abs(d), dt * 6);
      this._tick -= dt;
      if (this.sound && Math.round(this.shown) !== before && this._tick <= 0) { this._tick = 0.045; Sfx.play(this.sound, { bus: 'ui', pitch: 1 + Math.min(0.5, Math.abs(d) / Math.max(50, Math.abs(this.value)) * 0.8), vol: 0.8 }); }
    }
    this.pop = Math.max(0, this.pop - dt * 3.2);
  }
  get text() { return this.fmt(this.shown); }
  remove() { this.dead = true; HudList.delete(this); }
}
PZ.count = (v, o) => new Count(v, o);
PZ.Count = Count;
PZ.fmt = fmtThousands;
addSystem({ name: 'hud', order: 66, frame(rdt) { for (const h of HudList) h.update(rdt); } });
// 換場景：上一個場景建的血條、數字不再更新（keep: true 的留著）
PZ.on('scene', (name) => { for (const h of HudList) if (!h.keep && h.scene !== name) HudList.delete(h); });

/* ---------- 繪圖 ---------- */
const HUD_SCR = new Float64Array(16);
Object.assign(Graphics.prototype, {
  /** 任意四邊形（順時針：0 左上、1 右上、2 右下、3 左下），左邊 c0、右邊 c1 漸層 */
  quad(p, c0, c1, o) {
    const m = this.m, a = o && o.a != null ? o.a : 1, add = (o && o.add) || 0, A = this._col(c0, a), B = c1 == null ? A : this._col(c1, a), S = HUD_SCR;
    for (let i = 0; i < 4; i++) { const x = p[i * 2], y = p[i * 2 + 1]; S[i * 2] = m[0] * x + m[2] * y + m[4]; S[i * 2 + 1] = m[1] * x + m[3] * y + m[5]; }
    this.r.quadv(null, S[0], S[1], 0, 0, S[2], S[3], 0, 0, S[4], S[5], 0, 0, S[6], S[7], 0, 0, A, B, MODE.solid, add, 0);
    return this;
  },
  /** 扇形（角度：0 朝右、順時針為正） */
  pie(x, y, r, a0, a1, color, o) {
    if (a1 < a0) [a0, a1] = [a1, a0]; const n = Math.max(1, Math.ceil((a1 - a0) / 0.14)), m = this.m, col = this._col(color, o && o.a != null ? o.a : 1), add = (o && o.add) || 0;
    const X = (px, py) => m[0] * px + m[2] * py + m[4], Y = (px, py) => m[1] * px + m[3] * py + m[5], cx = X(x, y), cy = Y(x, y);
    let px = x + Math.cos(a0) * r, py = y + Math.sin(a0) * r;
    for (let i = 1; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n, qx = x + Math.cos(a) * r, qy = y + Math.sin(a) * r; this.r.tri(cx, cy, X(px, py), Y(px, py), X(qx, qy), Y(qx, qy), col, add); px = qx; py = qy; }
    return this;
  },
  /** 粗圓弧 */
  arc(x, y, r, thick, a0, a1, color, o) {
    if (Math.abs(a1 - a0) < 1e-4) return this;
    const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 0.12)), r0 = r - thick / 2, r1 = r + thick / 2, a = o && o.a != null ? o.a : 1, p = HUD_A;
    for (let i = 0; i < n; i++) {
      const b0 = a0 + ((a1 - a0) * i) / n, b1 = a0 + ((a1 - a0) * (i + 1)) / n, c0 = Math.cos(b0), s0 = Math.sin(b0), c1 = Math.cos(b1), s1 = Math.sin(b1);
      p[0] = x + c0 * r1; p[1] = y + s0 * r1; p[2] = x + c1 * r1; p[3] = y + s1 * r1; p[4] = x + c1 * r0; p[5] = y + s1 * r0; p[6] = x + c0 * r0; p[7] = y + s0 * r0;
      this.quad(p, color, color, o);
    }
    if (o && o.cap === 'round') { this.circle(x + Math.cos(a0) * r, y + Math.sin(a0) * r, thick / 2, color, { a }); this.circle(x + Math.cos(a1) * r, y + Math.sin(a1) * r, thick / 2, color, { a }); }
    return this;
  },
  /** 圓角框（凸多邊形）＋可選的框線 */
  rrect(x, y, w, h, r, color, o) {
    r = Math.max(0, Math.min(r, w / 2, h / 2)); const pts = HUD_RR; pts.length = 0;
    const seg = r > 6 ? 6 : r > 2 ? 4 : 1;
    const corner = (cx, cy, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (Math.PI / 2) * (i / seg); pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } };
    if (r <= 0.01) pts.push(x, y, x + w, y, x + w, y + h, x, y + h);
    else { corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI); }
    if (color != null) this.poly(pts, color, o);
    if (o && o.border) this.strokePoly(pts, o.border, o.borderColor || 'rgba(255,255,255,.25)', o.borderA != null ? { a: o.borderA } : null);
    return this;
  },
  /** 凸多邊形的框線（往內畫 w 粗） */
  strokePoly(pts, w, color, o) {
    const n = pts.length / 2; if (n < 3) return this;
    let cx = 0, cy = 0; for (let i = 0; i < n; i++) { cx += pts[i * 2]; cy += pts[i * 2 + 1]; } cx /= n; cy /= n;
    const inner = HUD_IN; inner.length = 0;
    for (let i = 0; i < n; i++) { const px = pts[i * 2], py = pts[i * 2 + 1], dx = cx - px, dy = cy - py, l = Math.hypot(dx, dy) || 1, k = Math.min(w, l * 0.5); inner.push(px + (dx / l) * k, py + (dy / l) * k); }
    const q = HUD_Q;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; q[0] = pts[i * 2]; q[1] = pts[i * 2 + 1]; q[2] = pts[j * 2]; q[3] = pts[j * 2 + 1]; q[4] = inner[j * 2]; q[5] = inner[j * 2 + 1]; q[6] = inner[i * 2]; q[7] = inner[i * 2 + 1]; this.quad(q, color, color, o); }
    return this;
  },
  /** 血條／能量條 */
  meter(M, x, y, w, h, o = {}) {
    const shape = o.shape || 'skew', sk = shape === 'skew' ? Math.min(h * 0.6, w * 0.1) : 0, max = Math.max(1e-6, M.max);
    const sx = M.shake > 0 ? Math.sin(M.t * 70) * M.shake * 3 : 0, sy = M.shake > 0 ? Math.cos(M.t * 57) * M.shake * 1.2 : 0;
    x += sx; y += sy;
    const col = o.color || '#ff4d5e', col2 = o.color2 || Color.lighten(col, 0.25), low = o.low != null ? o.low : 0.3, f = M.shown / max;
    // 從比例 a 到 b 的那一段（斜的：上緣往右偏 sk）
    const span = (a, b, c0, c1, op) => {
      if (b - a <= 1e-4) return;
      const L = x + (w - sk) * a, R = x + (w - sk) * b;
      if (shape === 'round') { const rr = h / 2, x0 = x + (w) * a, x1 = x + w * b; this.rrect(x0, y, Math.max(x1 - x0, Math.min(h, x1 - x0)), h, Math.min(rr, (x1 - x0) / 2), c0, op); return; }
      HUD_Q[0] = L + sk; HUD_Q[1] = y; HUD_Q[2] = R + sk; HUD_Q[3] = y; HUD_Q[4] = R; HUD_Q[5] = y + h; HUD_Q[6] = L; HUD_Q[7] = y + h;
      this.quad(HUD_Q, c0, c1, op);
    };
    // 底
    if (o.frame !== false) { const pad = o.pad != null ? o.pad : 2; HUD_Q2[0] = x + sk - pad + pad * 0.5; HUD_Q2[1] = y - pad; HUD_Q2[2] = x + w + pad; HUD_Q2[3] = y - pad; HUD_Q2[4] = x + w - sk + pad - pad * 0.5; HUD_Q2[5] = y + h + pad; HUD_Q2[6] = x - pad; HUD_Q2[7] = y + h + pad; if (shape === 'round') this.rrect(x - pad, y - pad, w + pad * 2, h + pad * 2, h / 2 + pad, o.frameColor || 'rgba(0,0,0,.55)'); else this.quad(HUD_Q2, o.frameColor || 'rgba(0,0,0,.55)', null); }
    span(0, 1, o.bg || 'rgba(255,255,255,.08)', o.bg || 'rgba(255,255,255,.04)');
    // 受傷殘影、補血預覽
    if (M.trail > M.shown) span(f, M.trail / max, o.trailColor || '#fff4e0', o.trailColor || '#ffd9b0', { a: 0.9 });
    if (M.ghost > M.shown) span(f, M.ghost / max, o.ghostColor || '#7dffa8', o.ghostColor || '#b6ffd0', { a: 0.45 + 0.25 * Math.sin(M.t * 10) });
    // 主條
    const lowOn = f <= low && f > 0, pulse = lowOn ? 0.5 + 0.5 * Math.sin(M.t * 9) : 0;
    span(0, f, Color.mix(Color.darken(col, 0.15), '#ffffff', pulse * 0.25), Color.mix(col2, '#ffffff', pulse * 0.35));
    // 上半部光澤
    if (shape !== 'round' && f > 0) { const gh = h * 0.42, L = x + sk, R = x + (w - sk) * f + sk; HUD_Q[0] = L; HUD_Q[1] = y + 1; HUD_Q[2] = R; HUD_Q[3] = y + 1; HUD_Q[4] = R - sk * (gh / h); HUD_Q[5] = y + gh; HUD_Q[6] = L - sk * (gh / h); HUD_Q[7] = y + gh; this.quad(HUD_Q, 'rgba(255,255,255,.28)', 'rgba(255,255,255,.12)'); }
    // 刻度
    if (o.segments) { const per = o.segments, n = Math.floor(max / per); for (let i = 1; i < n + (max % per ? 1 : 0); i++) { const k = (i * per) / max; if (k >= 1) break; const X = x + (w - sk) * k; this.line(X + sk, y + 1, X, y + h - 1, i % 5 === 0 ? 2 : 1.2, 'rgba(0,0,0,.45)'); } }
    if (M.flash > 0) span(0, 1, '#ffffff', '#ffffff', { a: M.flash * 0.55 });
    if (lowOn && o.lowGlow !== false) span(0, 1, col, col, { a: pulse * 0.18, add: 1 });
    // 字
    const fs = o.size || Math.max(10, h * 0.78);
    if (o.label) this.text(o.label, x - (o.labelGap != null ? o.labelGap : 6), y + h / 2, { size: fs, weight: 900, color: o.labelColor || '#fff', align: 'right', baseline: 'middle', outline: 3, outlineColor: 'rgba(0,0,0,.6)' });
    if (o.text) this.text(o.text === true ? `${Math.ceil(M.value)} / ${Math.round(max)}` : o.text, x + w - sk - 6, y + h / 2 + 0.5, { size: fs * 0.85, weight: 800, color: '#fff', align: 'right', baseline: 'middle', outline: 3, outlineColor: 'rgba(0,0,0,.55)' });
    return this;
  },
  /** 會滾的數字 */
  count(C, x, y, st = {}) {
    const p = C.pop, s = 1 + Ease.outBack(Math.min(1, p)) * (st.pop != null ? st.pop : 0.28) * p;
    this.save(); this.translate(x, y); this.scale(s, s);
    this.text((st.prefix || '') + C.text + (st.suffix || ''), 0, 0, Object.assign({ size: 28, weight: 900, color: '#fff', align: 'left', baseline: 'middle', outline: 4, outlineColor: 'rgba(0,0,0,.55)' }, st, { color: p > 0.05 ? Color.css(Color.mix(st.color || '#ffffff', st.popColor || '#fff4b0', Math.min(1, p * 1.5))) : st.color || '#fff' }));
    this.restore(); return this;
  },
  /** 技能冷卻：rest＝剩下的比例（1 剛用完、0 好了） */
  cooldown(x, y, r, rest, o = {}) {
    const top = -Math.PI / 2, done = 1 - clamp01(rest);
    if (rest > 0.001) {
      this.pie(x, y, r, top + done * TAU, top + TAU, o.shade || 'rgba(4,6,12,.72)');
      const a = top + done * TAU; this.line(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, 2, o.color || '#fff', { a: 0.85 });
      this.arc(x, y, r + 2.5, 3, top, a, o.color || '#ffd36b', { a: 0.95 });
    }
    if (o.flash > 0) { const k = 1 - o.flash; this.ring(x, y, r + 2 + k * 10, 3 * o.flash + 0.5, o.flashColor || '#ffffff', { a: o.flash }); this.circle(x, y, r, '#ffffff', { a: o.flash * 0.45, add: 1 }); }
    return this;
  },
});
const HUD_RR = [], HUD_IN = [], HUD_Q = [0, 0, 0, 0, 0, 0, 0, 0], HUD_Q2 = [0, 0, 0, 0, 0, 0, 0, 0], HUD_A = [0, 0, 0, 0, 0, 0, 0, 0];
