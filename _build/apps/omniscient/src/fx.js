/* 全知 OMNISCIENT — 特效：資料流線、封包、水母代理人、開機的眼睛
   規則：光點（封包）只在「真的有事件」時才發射——資料進來、核對完成、新聞蓋章、回放走到那一刻。
   背景線條只是很淡的底紋，不代表任何數字。 */

const FX = {
  bg: null, fg: null, b: null, f: null, dpr: 1, W: 0, H: 0,
  links: [], packets: [], jellies: [], layer: null, sprites: {},
  t: 0, last: 0, running: false, layoutDirty: true, stack: false,

  init() {
    this.bg = $('#bg'); this.fg = $('#fg');
    this.b = this.bg.getContext('2d'); this.f = this.fg.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => { this.resize(); this.layoutDirty = true; });
    this.jellies = AGENTS.map((a, i) => new Jelly(a, i));
  },
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, settings.fx === 'low' ? 1 : 1.5);
    this.W = innerWidth; this.H = innerHeight;
    for (const c of [this.bg, this.fg]) { c.width = Math.round(this.W * this.dpr); c.height = Math.round(this.H * this.dpr); }
    this.b.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.f.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.stack = document.documentElement.classList.contains('stack');
    this.layer = null;
  },
  rem() { return parseFloat(getComputedStyle(document.documentElement).fontSize) || 10; },

  /** 光暈貼圖（避免每格用 shadowBlur） */
  sprite(color, size = 64) {
    const k = color + size;
    if (this.sprites[k]) return this.sprites[k];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, color); g.addColorStop(0.45, hexA(color, 0.35)); g.addColorStop(1, hexA(color, 0));
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return (this.sprites[k] = c);
  },

  // ---------------------------------------------------------------- 底紋：欄與欄之間交織的線
  colCards(i) {
    const sel = ['#b0 .src', '#b1 .chk', '#b2 .news', '#b3 .comp, #b3 .verdict', '#b4 .tile'][i];
    const box = $('#c' + i);
    if (!box) return [];
    const br = box.getBoundingClientRect();
    return $$(sel).map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0 && r.top >= br.top - 2 && r.bottom <= br.bottom + 2);
  },
  computeLinks() {
    this.links = [];
    this.layoutDirty = false;
    this.layer = null;
    if (this.stack) return;
    const cols = [0, 1, 2, 3, 4].map((i) => this.colCards(i));
    const pal = ['#46d4ff', '#9b7bff', '#ff4fd8', '#ffbf3c', '#cfe3ff'];
    const pair = (a, b, per) => {
      const L = cols[a], R = cols[b];
      if (!L.length || !R.length) return;
      L.forEach((l, i) => {
        const j0 = Math.floor(i * R.length / L.length);
        for (let k = 0; k < per; k++) {
          const j = (j0 + k * Math.max(1, Math.round(R.length / 3))) % R.length;
          const r = R[j];
          const y0 = l.top + l.height * (0.35 + 0.3 * ((i * 7 + k * 3) % 5) / 4), y1 = r.top + r.height * (0.3 + 0.4 * ((j * 5 + k) % 4) / 3);
          this.links.push({ a, b, x0: l.right, y0, x1: r.left, y1, c0: pal[a], c1: pal[b], ph: Math.random() });
        }
      });
    };
    pair(0, 1, 2); pair(1, 2, 2); pair(2, 3, 2); pair(3, 4, 2); pair(1, 3, 1);
  },
  bez(L, t) {
    const dx = (L.x1 - L.x0) * 0.5;
    const p0x = L.x0, p0y = L.y0, p1x = L.x0 + dx, p1y = L.y0, p2x = L.x1 - dx, p2y = L.y1, p3x = L.x1, p3y = L.y1;
    const u = 1 - t;
    return [u * u * u * p0x + 3 * u * u * t * p1x + 3 * u * t * t * p2x + t * t * t * p3x, u * u * u * p0y + 3 * u * u * t * p1y + 3 * u * t * t * p2y + t * t * t * p3y];
  },
  drawLayer() {
    const c = document.createElement('canvas'); c.width = this.bg.width; c.height = this.bg.height;
    const x = c.getContext('2d'); x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // 細格線
    const r = this.rem();
    x.strokeStyle = 'rgba(110,150,230,.045)'; x.lineWidth = 1;
    for (let gx = 0; gx < this.W; gx += r * 4) { x.beginPath(); x.moveTo(gx + .5, 0); x.lineTo(gx + .5, this.H); x.stroke(); }
    for (let gy = 0; gy < this.H; gy += r * 4) { x.beginPath(); x.moveTo(0, gy + .5); x.lineTo(this.W, gy + .5); x.stroke(); }
    // 欄與欄之間的線
    for (const L of this.links) {
      const g = x.createLinearGradient(L.x0, 0, L.x1, 0);
      g.addColorStop(0, hexA(L.c0, 0.45)); g.addColorStop(1, hexA(L.c1, 0.45));
      x.strokeStyle = g; x.lineWidth = 1.1;
      const dx = (L.x1 - L.x0) * 0.5;
      x.beginPath(); x.moveTo(L.x0, L.y0); x.bezierCurveTo(L.x0 + dx, L.y0, L.x1 - dx, L.y1, L.x1, L.y1); x.stroke();
      x.fillStyle = hexA(L.c0, 0.9); x.beginPath(); x.arc(L.x0, L.y0, 1.6, 0, 6.3); x.fill();
      x.fillStyle = hexA(L.c1, 0.9); x.beginPath(); x.arc(L.x1, L.y1, 1.6, 0, 6.3); x.fill();
    }
    this.layer = c;
  },

  // ---------------------------------------------------------------- 封包（真的事件才發）
  /** 從 a 元素送一顆光點到 b 元素（都可以是 null；null 就略過這一段） */
  send(a, b, color, { dur = 900, size = 1, onArrive } = {}) {
    if (!a || !b || this.stack || settings.fx === 'low' && this.packets.length > 12) { if (onArrive) onArrive(); return; }
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    if (!ra.height || !rb.height) { if (onArrive) onArrive(); return; }
    const fwd = rb.left >= ra.right - 4;
    const L = fwd
      ? { x0: ra.right, y0: ra.top + ra.height * (0.3 + Math.random() * 0.4), x1: rb.left, y1: rb.top + rb.height * (0.3 + Math.random() * 0.4) }
      : { x0: ra.left + ra.width / 2, y0: ra.top + ra.height / 2, x1: rb.left + rb.width / 2, y1: rb.top + rb.height / 2 };
    this.packets.push({ L, t: 0, dur: dur * (0.85 + Math.random() * 0.3), color, size, onArrive, trail: [] });
  },
  /** 一串元素依序傳下去：每到一站那一站就閃一下 */
  chain(els, color, opts = {}) {
    const list = els.filter(Boolean);
    const step = (i) => {
      if (i >= list.length - 1) { if (opts.done) opts.done(); return; }
      this.send(list[i], list[i + 1], color, {
        dur: opts.dur || 850, size: opts.size || 1,
        onArrive: () => {
          const n = list[i + 1];
          UI.hit(n.closest('.card') || n);
          const col = n.closest('[data-col]');
          if (col) { UI.stage(+col.dataset.col); SFX.tick(+col.dataset.col); }
          if (opts.each) opts.each(i + 1, n);
          step(i + 1);
        },
      });
    };
    step(0);
  },

  // ---------------------------------------------------------------- 主迴圈
  start() { if (this.running) return; this.running = true; this.last = performance.now(); requestAnimationFrame((t) => this.frame(t)); },
  stop() { this.running = false; },
  frame(now2) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now2 - this.last) / 1000); this.last = now2; this.t += dt;
    if (this.layoutDirty) this.computeLinks();
    if (!this.layer) this.drawLayer();
    const b = this.b, f = this.f;
    b.clearRect(0, 0, this.W, this.H);
    b.drawImage(this.layer, 0, 0, this.W, this.H);
    // 極淡的流動底紋（裝飾，不代表資料）
    if (settings.fx === 'full' && !reducedMotion()) {
      b.globalCompositeOperation = 'lighter';
      for (const L of this.links) {
        const t = (this.t * 0.06 + L.ph) % 1;
        const [x, y] = this.bez(L, t);
        b.globalAlpha = 0.18;
        b.drawImage(this.sprite(L.c0, 32), x - 6, y - 6, 12, 12);
      }
      b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
    }
    // 封包
    b.globalCompositeOperation = 'lighter';
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i];
      p.t += dt * 1000 / p.dur;
      const tt = Math.min(1, p.t);
      const e = tt < 0.5 ? 2 * tt * tt : 1 - Math.pow(-2 * tt + 2, 2) / 2;
      const [x, y] = this.bez(p.L, e);
      p.trail.push([x, y]); if (p.trail.length > 14) p.trail.shift();
      const sp = this.sprite(p.color, 64);
      p.trail.forEach(([tx, ty], k) => { const a = (k + 1) / p.trail.length; b.globalAlpha = a * 0.5; const s = 10 * a * p.size; b.drawImage(sp, tx - s, ty - s, s * 2, s * 2); });
      b.globalAlpha = 1;
      const s = 16 * p.size;
      b.drawImage(sp, x - s, y - s, s * 2, s * 2);
      if (p.t >= 1) { this.packets.splice(i, 1); if (p.onArrive) p.onArrive(); }
    }
    b.globalCompositeOperation = 'source-over'; b.globalAlpha = 1;
    // 水母代理人（在面板上面，半透明）
    f.clearRect(0, 0, this.W, this.H);
    if (settings.fx !== 'low' && !reducedMotion()) {
      const js = this.stack ? this.jellies.slice(0, 3) : this.jellies;
      for (const j of js) { j.update(dt, this); j.draw(f, this); }
    }
    requestAnimationFrame((t) => this.frame(t));
  },
  jelly(id) { return this.jellies.find((j) => j.a.id === id); },
  /** 代理人游到某個元素旁邊做事，頭上的標籤寫它正在做什麼 */
  seek(id, node, label, ms = 2600) { const j = this.jelly(id); if (j) j.seek(node, label, ms); },
};

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ================================================================ 水母
class Jelly {
  constructor(a, i) {
    this.a = a; this.i = i;
    this.x = innerWidth * (0.12 + i * 0.19); this.y = innerHeight * (0.35 + (i % 2) * 0.25);
    this.vx = 0; this.vy = 0; this.ang = 0; this.ph = Math.random() * 6; this.tx = this.x; this.ty = this.y;
    this.mode = 'drift'; this.until = 0; this.label = '待命'; this.tag = `M-0${i + 1}`;
    this.nextWander = 0; this.alpha = 0;
    this.ten = [];
    for (let k = 0; k < 7; k++) { const seg = []; for (let s = 0; s < 13; s++) seg.push([this.x, this.y + s * 4]); this.ten.push(seg); }
  }
  home(fx) {
    // 在自己那一欄的左側縫隙附近游
    const col = $('#c' + this.a.col);
    if (!col) return [fx.W / 2, fx.H / 2];
    const r = col.getBoundingClientRect();
    const rem = fx.rem();
    return [r.left - rem * 1.6 + (Math.random() - 0.5) * rem * 6, r.top + r.height * (0.15 + Math.random() * 0.7)];
  }
  seek(node, label, ms) {
    if (!node) return;
    const r = node.getBoundingClientRect();
    if (!r.height) return;
    this.mode = 'seek'; this.until = performance.now() + ms; this.label = label || '處理中';
    this.tx = r.left + Math.min(r.width * 0.25, 60) ; this.ty = r.top + r.height / 2;
  }
  update(dt, fx) {
    const t = performance.now();
    this.alpha = Math.min(1, this.alpha + dt * 0.6);
    if (this.mode === 'seek' && t > this.until) { this.mode = 'drift'; this.label = '待命'; this.nextWander = 0; }
    if (this.mode === 'drift' && t > this.nextWander) { [this.tx, this.ty] = this.home(fx); this.nextWander = t + 5000 + Math.random() * 6000; }
    // 一縮一放往前推
    this.ph += dt * (this.mode === 'seek' ? 5.2 : 3.2);
    const pulse = Math.max(0, Math.sin(this.ph));
    const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy) || 1;
    const push = (this.mode === 'seek' ? 260 : 70) * pulse * Math.min(1, d / 120);
    this.vx += (dx / d) * push * dt; this.vy += (dy / d) * push * dt - 4 * dt;
    this.vx *= Math.pow(0.12, dt); this.vy *= Math.pow(0.12, dt);
    this.x += this.vx * dt; this.y += this.vy * dt;
    const want = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    const sp = Math.hypot(this.vx, this.vy);
    const targetAng = sp > 6 ? want : 0;
    let da = targetAng - this.ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    this.ang += da * Math.min(1, dt * 2.2);
    // 觸手：跟著鐘罩下緣拖曳
    const R = fx.rem() * 2.1;
    const ca = Math.cos(this.ang), sa = Math.sin(this.ang);
    this.ten.forEach((seg, k) => {
      const off = (k / (this.ten.length - 1) - 0.5) * R * 1.4;
      const ax = this.x + ca * off - sa * R * 0.25, ay = this.y + sa * off + ca * R * 0.25;
      seg[0][0] = ax; seg[0][1] = ay;
      const len = R * (k % 3 === 1 ? 0.42 : 0.3);
      for (let s = 1; s < seg.length; s++) {
        const p = seg[s], q = seg[s - 1];
        p[0] += Math.sin(this.ph * 0.7 + s * 0.6 + k) * 0.35 + sa * 6 * dt * 10;
        p[1] += 9 * dt * 10 * ca * 0.2 + 0.4;
        const ddx = p[0] - q[0], ddy = p[1] - q[1], dd = Math.hypot(ddx, ddy) || 1;
        p[0] = q[0] + ddx / dd * len; p[1] = q[1] + ddy / dd * len;
      }
    });
  }
  draw(c, fx) {
    const R = fx.rem() * 2.1, col = this.a.color;
    const pulse = Math.sin(this.ph);
    c.save();
    if (fx.stack) { c.globalAlpha = 0.6; }
    c.globalCompositeOperation = 'lighter';
    // 光暈
    const g0 = fx.sprite(col, 128);
    c.globalAlpha = this.alpha * 0.32; c.drawImage(g0, this.x - R * 2.6, this.y - R * 2.6, R * 5.2, R * 5.2);
    // 觸手
    c.globalAlpha = this.alpha * 0.55;
    this.ten.forEach((seg, k) => {
      c.strokeStyle = hexA(col, k % 3 === 1 ? 0.75 : 0.45); c.lineWidth = k % 3 === 1 ? 1.8 : 0.9;
      c.beginPath(); c.moveTo(seg[0][0], seg[0][1]);
      for (let s = 1; s < seg.length - 1; s++) { const mx = (seg[s][0] + seg[s + 1][0]) / 2, my = (seg[s][1] + seg[s + 1][1]) / 2; c.quadraticCurveTo(seg[s][0], seg[s][1], mx, my); }
      c.stroke();
    });
    // 鐘罩
    c.translate(this.x, this.y); c.rotate(this.ang);
    const w = R * (1 + pulse * 0.08), h = R * (0.95 - pulse * 0.1);
    const bg = c.createRadialGradient(0, -h * 0.3, R * 0.1, 0, 0, R * 1.2);
    bg.addColorStop(0, 'rgba(255,255,255,.55)'); bg.addColorStop(0.35, hexA(col, 0.32)); bg.addColorStop(1, hexA(col, 0.05));
    c.globalAlpha = this.alpha;
    c.fillStyle = bg; c.strokeStyle = hexA(col, 0.85); c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(-w, R * 0.2);
    c.bezierCurveTo(-w, -h * 1.15, w, -h * 1.15, w, R * 0.2);
    for (let k = 6; k >= 0; k--) { const xx = -w + (2 * w) * k / 6; c.quadraticCurveTo(xx + w / 6, R * 0.42, xx, R * 0.2); }
    c.closePath(); c.fill(); c.stroke();
    // 內部器官
    c.strokeStyle = hexA(col, 0.5); c.lineWidth = 1;
    for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse((k - 1.5) * w * 0.32, -h * 0.25, w * 0.13, h * 0.24, 0, 0, 6.3); c.stroke(); }
    c.restore();
    // 標籤（它正在做的事）；小螢幕不畫，免得擋住字
    if (fx.stack) return;
    c.save();
    c.globalAlpha = this.alpha * (this.mode === 'seek' ? 1 : 0.3);
    const rem = fx.rem();
    const txt = `${this.tag} · ${this.label}`;
    c.font = `${rem * 1.05}px "Share Tech Mono", "Noto Sans TC", monospace`;
    const tw2 = c.measureText(txt).width + rem * 1.2;
    const lx = this.x + R * 1.1, ly = this.y - R * 1.3;
    c.fillStyle = 'rgba(4,8,18,.82)'; c.strokeStyle = hexA(col, 0.9); c.lineWidth = 1;
    c.beginPath(); c.rect(lx, ly - rem * 1.6, tw2, rem * 2.1); c.fill(); c.stroke();
    c.fillStyle = col; c.fillText(txt, lx + rem * 0.6, ly);
    c.beginPath(); c.moveTo(this.x + R * 0.5, this.y - R * 0.6); c.lineTo(lx, ly - rem * 0.3); c.strokeStyle = hexA(col, 0.5); c.stroke();
    c.restore();
  }
}

// ================================================================ 開機的眼睛
const BootFX = {
  cv: null, c: null, t0: 0, run: false, open: 0, flash: 0, zoom: 0, W: 0, H: 0, dpr: 1, ticks: [],
  start() {
    this.cv = $('#bootcv'); this.c = this.cv.getContext('2d');
    this.dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.W = innerWidth; this.H = innerHeight;
    this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
    this.c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.t0 = performance.now(); this.run = true; this.open = 0; this.flash = 0; this.zoom = 0;
    this.ticks = Array.from({ length: 120 }, () => Math.random());
    const loop = (t) => { if (!this.run) return; this.draw((t - this.t0) / 1000); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  },
  stop() { this.run = false; },
  draw(s) {
    const c = this.c, W = this.W, H = this.H, cx = W / 2, cy = H * 0.4;
    const R = Math.min(W, H) * 0.22;
    c.clearRect(0, 0, W, H);
    // 掃描線
    const sl = Math.min(1, s / 0.7);
    c.fillStyle = `rgba(120,220,255,${0.6 * (1 - this.open)})`;
    c.fillRect(cx - W * 0.5 * sl, cy - 1, W * sl, 2);
    // 眼睛張開的程度
    this.open += ((s > 0.6 ? 1 : 0) - this.open) * 0.035;
    const op = this.open;
    const z = 1 + this.zoom * 2.4;
    c.save(); c.translate(cx, cy); c.scale(z, z);
    // 眼眶（杏仁形，上下眼皮）
    c.save();
    c.beginPath();
    const ew = R * 2.1, eh = R * 1.15 * op;
    c.moveTo(-ew, 0); c.bezierCurveTo(-ew * 0.45, -eh * 1.25, ew * 0.45, -eh * 1.25, ew, 0); c.bezierCurveTo(ew * 0.45, eh * 1.25, -ew * 0.45, eh * 1.25, -ew, 0);
    c.strokeStyle = 'rgba(70,212,255,.9)'; c.lineWidth = 2.2; c.shadowColor = '#46d4ff'; c.shadowBlur = 18; c.stroke();
    c.shadowBlur = 0;
    c.clip();
    // 虹膜
    const rot = s * 0.25;
    c.lineWidth = 1.2;
    for (let k = 0; k < 3; k++) {
      const rr = R * (0.95 - k * 0.2);
      c.strokeStyle = k === 1 ? 'rgba(255,191,60,.85)' : 'rgba(120,220,255,.7)';
      c.setLineDash(k === 1 ? [R * 0.08, R * 0.04] : k === 2 ? [2, 6] : []);
      c.save(); c.rotate(rot * (k % 2 ? -1.4 : 1)); c.beginPath(); c.arc(0, 0, rr, 0, Math.PI * 2); c.stroke(); c.restore();
    }
    c.setLineDash([]);
    // 放射狀刻度：像資料一條條匯進來
    c.save(); c.rotate(-rot * 0.6);
    for (let k = 0; k < this.ticks.length; k++) {
      const a = k / this.ticks.length * Math.PI * 2, l = R * (0.08 + this.ticks[k] * 0.22) * Math.min(1, s / 1.6);
      c.strokeStyle = k % 9 === 0 ? 'rgba(255,191,60,.9)' : 'rgba(120,220,255,.45)';
      c.beginPath(); c.moveTo(Math.cos(a) * R * 0.98, Math.sin(a) * R * 0.98); c.lineTo(Math.cos(a) * (R * 0.98 + l), Math.sin(a) * (R * 0.98 + l)); c.stroke();
    }
    c.restore();
    // 瞳孔
    const pr = R * (0.32 + Math.sin(s * 2) * 0.02);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, pr * 2.2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(160,240,255,.9)'); g.addColorStop(0.55, 'rgba(70,212,255,.35)'); g.addColorStop(1, 'rgba(70,212,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, pr * 2.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#01030a'; c.beginPath(); c.arc(0, 0, pr * 0.42, 0, Math.PI * 2); c.fill();
    c.restore();
    c.restore();
    // 睜眼那一下的白光
    if (this.flash > 0) { c.fillStyle = `rgba(230,250,255,${this.flash})`; c.fillRect(0, 0, W, H); this.flash = Math.max(0, this.flash - 0.03); }
  },
};
