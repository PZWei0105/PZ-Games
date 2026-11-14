/* 樣品館：鏡頭（戰略／模擬類：縮放、旋轉、拖曳慣性都是一行 PZ.cam.controls） */
PZ.scene('city', {
  bg: '#0d1118',
  ui: () => `${Lab.bar('鏡頭', PZ.env.touch ? '單指拖曳・雙指縮放旋轉' : '拖曳平移・滾輪縮放・Q／E 旋轉')}
    <div class="lab-panel" data-ui><div class="lab-row"><button class="lab-chip big on" data-c="rot">可以旋轉</button><button class="lab-chip big on" data-c="iner">拖曳慣性</button><button class="lab-chip cyan big" data-c="reset">鏡頭回正</button><button class="lab-chip big" data-c="night">夜晚</button></div></div>`,
  enter() {
    const box = PZ.scenes.uiEl; Lab.bindBack(box);
    PZ.cam.fit(700); PZ.cam.controls({ pan: true, zoom: [0.3, 3], rotate: true, inertia: true });
    this.night = false;
    const btn = (k) => box.querySelector(`[data-c="${k}"]`);
    btn('rot').onclick = () => { PZ.cam.ctl.rotate = !PZ.cam.ctl.rotate; btn('rot').classList.toggle('on', PZ.cam.ctl.rotate); };
    btn('iner').onclick = () => { PZ.cam.ctl.inertia = !PZ.cam.ctl.inertia; btn('iner').classList.toggle('on', PZ.cam.ctl.inertia); };
    btn('reset').onclick = () => { PZ.tween(PZ.cam, { x: 0, y: 0, rot: 0, userZoom: 1 }, 0.6, 'inOutCubic', { real: true }); };
    btn('night').onclick = () => { this.night = !this.night; btn('night').classList.toggle('on', this.night); PZ.tween(PZ.post, { bright: this.night ? -0.18 : 0, sat: this.night ? 0.75 : 1 }, 0.8, 'inOutQuad', { real: true }); };
    // 地圖：12×12 的街區，路寬 40
    const R = PZ.rng(21); this.blocks = []; this.trees = []; this.cars = []; this.N = 12; this.B = 160;
    const half = (this.N * this.B) / 2;
    for (let i = 0; i < this.N; i++) for (let j = 0; j < this.N; j++) {
      const x = -half + i * this.B + 20, y = -half + j * this.B + 20;
      if (R.chance(0.12)) { for (let k = 0; k < 6; k++) this.trees.push({ x: x + R.range(10, 110), y: y + R.range(10, 110), s: R.range(0.8, 1.3) }); this.blocks.push({ x, y, park: true }); }
      else this.blocks.push({ x, y, f: 'bldg' + R.int(0, 5) });
    }
    for (let k = 0; k < 70; k++) { const vert = R.chance(0.5), lane = R.int(0, this.N), p = R.range(-half, half); this.cars.push({ vert, lane, p, sp: R.range(60, 140) * R.sign(), c: R.pick(['#ff5f6d', '#ffd166', '#46d4ff', '#f4f4f4', '#9b8cff']) }); }
    this.half = half;
    this.offKey = PZ.input.onPress('cancel', () => {});
    PZ.music.play('ink', { intensity: 0.5, fade: 1.5 });
  },
  exit() { PZ.cam.controls(false); PZ.tween(PZ.post, { bright: 0, sat: 1 }, 0.3, 'linear', { real: true }); this.offKey(); },
  update(dt) {
    if (PZ.input.down('dash')) PZ.cam.rot += dt;
    if (PZ.input.keys.has('KeyQ')) PZ.cam.rot -= dt * 1.2; if (PZ.input.keys.has('KeyE')) PZ.cam.rot += dt * 1.2;
    const lim = this.half; for (const c of this.cars) { c.p += c.sp * dt; if (c.p > lim) c.p = -lim; if (c.p < -lim) c.p = lim; }
  },
  render(g) {
    const h = this.half, B = this.B;
    g.rect(-h - 40, -h - 40, h * 2 + 80, h * 2 + 80, '#262b35');
    for (let i = 0; i <= this.N; i++) { const p = -h + i * B; g.line(p + 10, -h, p + 10, h, 2, '#e8d27a', { a: 0.35 }); g.line(-h, p + 10, h, p + 10, 2, '#e8d27a', { a: 0.35 }); }
    for (const b of this.blocks) { if (!g.visible(b.x + 60, b.y + 60, 120)) continue; if (b.park) { g.rect(b.x, b.y, 120, 120, '#2f5a3a'); } else g.spr(b.f, b.x, b.y); }
    for (const t of this.trees) if (g.visible(t.x, t.y, 30)) g.spr('tree', t.x, t.y, 0, t.s);
    for (const c of this.cars) {
      const lanePos = -h + c.lane * B + 10 + (c.sp > 0 ? 6 : -6), x = c.vert ? lanePos : c.p, y = c.vert ? c.p : lanePos;
      if (!g.visible(x, y, 40)) continue;
      const a = c.vert ? (c.sp > 0 ? Math.PI / 2 : -Math.PI / 2) : c.sp > 0 ? 0 : Math.PI;
      g.rect(x, y, 16, 8, c.c, { r: a });
      if (this.night) { const fx = x + Math.cos(a) * 18, fy = y + Math.sin(a) * 18; g.glow(fx, fy, 22, 'rgba(255,240,200,.5)'); }
    }
    if (this.night) for (const b of this.blocks) if (!b.park && g.visible(b.x + 60, b.y + 60, 120)) g.glow(b.x + 60, b.y + 60, 70, 'rgba(255,200,120,.12)');
  },
});
