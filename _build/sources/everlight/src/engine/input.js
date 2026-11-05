// 觸控搖桿、點擊、鍵盤
export class Input {
  constructor(el, ui) {
    this.el = el; this.ui = ui;
    this.vec = { x: 0, y: 0 }; this.active = false;
    this.taps = []; this.keys = new Set(); this.pressed = new Set();
    this.pid = null; this.start = null; this.moved = false;
    this.pinch = null; this.zoomDelta = 0;
    this.enabled = true;
    const touches = new Map();
    el.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) { const [a, b] = [...touches.values()]; this.pinch = Math.hypot(a.x - b.x, a.y - b.y); this.active = false; this.ui.joy.classList.remove('on'); return; }
      if (this.pid != null) return;
      this.pid = e.pointerId; this.start = { x: e.clientX, y: e.clientY, t: performance.now() }; this.moved = false;
      this.ui.joy.style.left = e.clientX + 'px'; this.ui.joy.style.top = e.clientY + 'px';
    });
    el.addEventListener('pointermove', (e) => {
      if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2 && this.pinch) { const [a, b] = [...touches.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); this.zoomDelta += (this.pinch - d) * 0.02; this.pinch = d; return; }
      if (e.pointerId !== this.pid || !this.start) return;
      const dx = e.clientX - this.start.x, dy = e.clientY - this.start.y, L = Math.hypot(dx, dy);
      if (L > 10) { this.moved = true; this.active = true; this.ui.joy.classList.add('on'); }
      if (this.active) {
        const m = Math.min(1, L / 50);
        this.vec.x = (dx / (L || 1)) * m; this.vec.y = (dy / (L || 1)) * m;
        const k = Math.min(L, 50);
        this.ui.joy.querySelector('i').style.transform = `translate(${(dx / (L || 1)) * k}px,${(dy / (L || 1)) * k}px)`;
      }
    });
    const end = (e) => {
      touches.delete(e.pointerId);
      if (touches.size < 2) this.pinch = null;
      if (e.pointerId !== this.pid) return;
      if (!this.moved && this.start && performance.now() - this.start.t < 400) this.taps.push({ x: e.clientX, y: e.clientY });
      this.pid = null; this.start = null; this.active = false; this.vec.x = 0; this.vec.y = 0;
      this.ui.joy.classList.remove('on'); this.ui.joy.querySelector('i').style.transform = '';
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', (e) => { this.zoomDelta += e.deltaY * 0.01; }, { passive: true });
    window.addEventListener('keydown', (e) => { if (!this.keys.has(e.code)) this.pressed.add(e.code); this.keys.add(e.code); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.active = false; this.vec.x = this.vec.y = 0; });
  }
  move() {
    let x = this.vec.x, y = this.vec.y;
    const K = this.keys;
    if (K.has('ArrowLeft') || K.has('KeyA')) x -= 1;
    if (K.has('ArrowRight') || K.has('KeyD')) x += 1;
    if (K.has('ArrowUp') || K.has('KeyW')) y -= 1;
    if (K.has('ArrowDown') || K.has('KeyS')) y += 1;
    const L = Math.hypot(x, y);
    if (L > 1) { x /= L; y /= L; }
    return { x, y, mag: Math.min(1, L) };
  }
  takeTaps() { const t = this.taps; this.taps = []; return t; }
  took(code) { if (this.pressed.has(code)) { this.pressed.delete(code); return true; } return false; }
  clear() { this.taps = []; this.pressed.clear(); this.vec.x = this.vec.y = 0; this.active = false; this.zoomDelta = 0; }
}
