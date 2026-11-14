/* 樣品館：後製特效 */
const GRADES = { 原色: { sat: 1, contrast: 1, bright: 0, tint: [1, 1, 1] }, 恐怖: { sat: 0.45, contrast: 1.15, bright: -0.06, tint: [0.92, 1, 0.95] }, 暖: { sat: 1.1, contrast: 1.05, bright: 0.02, tint: [1.1, 0.98, 0.82] }, 冷: { sat: 0.9, contrast: 1.08, bright: 0, tint: [0.82, 0.95, 1.12] }, 黑白: { sat: 0, contrast: 1.2, bright: 0, tint: [1, 1, 1] } };
PZ.scene('post', {
  bg: '#04050a',
  ui: () => `${Lab.bar('後製特效', '點畫面任何地方：衝擊波')}
    <div class="lab-panel" data-ui>
      <div class="lab-row"><button class="lab-chip" data-p="bloom">泛光</button><button class="lab-chip" data-p="vignette">暗角</button><button class="lab-chip" data-p="grain">顆粒</button><button class="lab-chip" data-p="scan">掃描線</button><button class="lab-chip" data-p="warp">老電視</button><button class="lab-chip" data-p="chroma">色差</button></div>
      <div class="lab-row"><span class="lab-label">調色</span>${Object.keys(GRADES).map((k, i) => `<button class="lab-chip cyan${i ? '' : ' on'}" data-g="${k}">${k}</button>`).join('')}</div>
    </div>`,
  enter() {
    const box = PZ.scenes.uiEl; Lab.bindBack(box);
    const P = PZ.post;
    this.base = { vignette: P.vignette, grain: P.grain, bloom: P.bloom.on };
    const st = this.st = { bloom: P.bloom.on, vignette: P.vignette > 0, grain: P.grain > 0, scan: false, warp: false, chroma: false };
    Lab.chips(box, st, () => this.apply());
    box.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => { box.querySelectorAll('[data-g]').forEach((x) => x.classList.toggle('on', x === b)); const gr = GRADES[b.dataset.g]; PZ.tween(P, { sat: gr.sat, contrast: gr.contrast, bright: gr.bright }, 0.5, 'inOutQuad', { real: true }); P.tint = gr.tint.slice(); PZ.uiSound('click'); }));
    this.offTap = PZ.on('tap', (t) => { PZ.fx.shockwave(t.wx, t.wy, { radius: 420, strength: 0.045 }); PZ.particles.emit('shockring', t.wx, t.wy, { scale: 2 }); PZ.fx.flash('#cfe8ff', 0.12, 0.08); PZ.sfx.play('explosion', { vol: 0.5, pitch: 1.4 }); PZ.cam.shake(0.25); });
    this.t = 0; this.orbs = [];
    const R = PZ.rng(3); for (let i = 0; i < 40; i++) this.orbs.push({ a: R.angle(), r: R.range(60, 330), s: R.range(0.2, 0.7) * R.sign(), c: R.pick(['#ff3db8', '#46d4ff', '#ffb547', '#8cff6a']), z: R.range(3, 9), trail: [] });
    const lay = () => { PZ.cam.fit(640); PZ.cam.x = Lab.shift(); }; lay(); this.offR = PZ.on('resize', lay);
    PZ.music.play('dread', { intensity: 0.6, fade: 1.5 });
  },
  apply() {
    const P = PZ.post, s = this.st;
    P.bloom.on = s.bloom; P.vignette = s.vignette ? 0.55 : 0; P.grain = s.grain ? 0.07 : 0; P.scan = s.scan ? 0.18 : 0; P.warp = s.warp ? 0.22 : 0; P.chroma = s.chroma ? 0.006 : 0;
  },
  exit() { this.offTap(); this.offR(); const P = PZ.post; P.bloom.on = this.base.bloom; P.vignette = this.base.vignette; P.grain = this.base.grain; P.scan = 0; P.warp = 0; P.chroma = 0; P.sat = 1; P.contrast = 1; P.bright = 0; P.tint = [1, 1, 1]; },
  update(dt) {
    this.t += dt;
    for (const o of this.orbs) { o.a += o.s * dt; const x = Math.cos(o.a) * o.r, y = Math.sin(o.a) * o.r * 0.6; o.trail.unshift({ x, y }); if (o.trail.length > 16) o.trail.pop(); o.x = x; o.y = y; }
    if (this.st.chroma) PZ.post.chroma = 0.004 + Math.sin(this.t * 3) * 0.003;
  },
  render(g) {
    for (let i = -12; i <= 12; i++) { g.line(i * 60, -500, i * 60, 500, 1.5, '#1c2848', { a: 0.6 }); g.line(-800, i * 50, 800, i * 50, 1.5, '#1c2848', { a: 0.6 }); }
    g.glow(0, 0, 160, 'rgba(255,60,200,.25)');
    for (const o of this.orbs) {
      if (o.trail.length > 2) g.trail(o.trail, o.z * 1.6, 0, o.c, PZ.color.alpha(o.c, 0), { add: 1, a: 0.8 });
      g.glow(o.x, o.y, o.z * 5, o.c, { a: 0.7, core: 0.8 });
      g.circle(o.x, o.y, o.z * 0.7, '#fff');
    }
    g.text('後製', 0, 0, { size: 64, weight: 900, color: '#fff', align: 'center', baseline: 'middle', outline: 6, outlineColor: '#ff3db8', add: 0 });
  },
});
