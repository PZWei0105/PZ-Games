/* 樣品館：壓力測試（也是倖存者類「大量怪物＋自動射擊」的寫法範例） */
PZ.scene('stress', {
  bg: '#07090f',
  ui: () => `${Lab.bar('壓力測試', '搖桿或 WASD 移動・自動射擊')}<div class="lab-stat"></div>
    <div class="lab-panel" data-ui>
      <div class="lab-row"><span class="lab-label">加怪</span><button class="lab-chip big" data-n="300">+300</button><button class="lab-chip big" data-n="1000">+1000</button><button class="lab-chip big" data-n="3000">+3000</button><button class="lab-chip cyan big" data-n="0">清空</button></div>
      <div class="lab-note">畫質「自動」：撐不住時自己降解析度、關泛光、減粒子，順了再升回去（右上角看得到）。</div>
    </div>`,
  enter() {
    const box = PZ.scenes.uiEl; Lab.bindBack(box);
    this.stat = box.querySelector('.lab-stat');
    box.querySelectorAll('[data-n]').forEach((b) => b.addEventListener('click', () => { const n = +b.dataset.n; if (!n) { this.foes.length = 0; return; } this.spawn(n); PZ.uiSound('confirm'); }));
    this.hero = { x: 0, y: 0, vx: 0, vy: 0, fire: 0, face: 1 };
    this.foes = []; this.shots = []; this.gems = []; this.grid = new PZ.Grid(36); this.kills = 0; this.tmp = [];
    const lay = () => { PZ.cam.fit(PZ.screen.portrait ? 520 : 640); PZ.cam.offX = Lab.shift(); }; lay(); this.offR = PZ.on('resize', lay);
    PZ.cam.follow(this.hero, { lerp: 7, lead: 0.15 });
    if (PZ.env.touch) PZ.input.stick({ target: 'move', zone: { l: 0, t: 0.25, r: 1, b: 0.82 } });
    this.spawn(300);
    PZ.music.play('drive', { intensity: 0.85, fade: 1 });
  },
  exit() { PZ.input.clearTouch(); this.offR(); },
  spawn(n) {
    const R = PZ.rand, H = this.hero;
    for (let i = 0; i < n; i++) { const a = R.angle(), d = R.range(420, 900); this.foes.push({ x: H.x + Math.cos(a) * d, y: H.y + Math.sin(a) * d, r: 11, hp: 3, sp: R.range(55, 95), kind: R.chance(0.3) ? 'husk2' : 'husk', flash: 0, t: R.next() * 9 }); }
  },
  update(dt) {
    const H = this.hero, M = PZ.input.move, R = PZ.rand;
    H.vx = PZ.damp(H.vx, M.x * 230, 14, dt); H.vy = PZ.damp(H.vy, M.y * 230, 14, dt); H.x += H.vx * dt; H.y += H.vy * dt; if (M.x) H.face = Math.sign(M.x);
    const G = this.grid; G.clear();
    for (const f of this.foes) G.insert(f, f.r);
    // 怪物追主角＋互相推開（只看附近幾隻，五千隻也撐得住）
    for (const f of this.foes) {
      let dx = H.x - f.x, dy = H.y - f.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      let px = 0, py = 0; const near = G.query(f.x, f.y, 16, this.tmp);
      for (let k = 0, m = 0; k < near.length && m < 4; k++) { const o = near[k]; if (o === f) continue; m++; const ox = f.x - o.x, oy = f.y - o.y, od = Math.hypot(ox, oy) || 1; px += ox / od; py += oy / od; }
      f.x += (dx * f.sp + px * 40) * dt; f.y += (dy * f.sp + py * 40) * dt;
      if (d < 20) { f.x -= dx * (20 - d); f.y -= dy * (20 - d); }
      f.flash = Math.max(0, f.flash - dt * 8); f.t += dt;
    }
    // 自動射擊：最近的怪
    H.fire -= dt;
    if (H.fire <= 0) {
      const tgt = G.nearest(H.x, H.y, 420);
      if (tgt) { H.fire = 0.07; const a = Math.atan2(tgt.y - H.y, tgt.x - H.x) + R.spread(0.05); this.shots.push({ x: H.x + Math.cos(a) * 14, y: H.y - 22 + Math.sin(a) * 14, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, life: 0.55, a }); PZ.particles.emit('muzzle', H.x + Math.cos(a) * 18, H.y - 22 + Math.sin(a) * 18, { angle: a }); PZ.sfx.play('rifle', { vol: 0.35 }); }
    }
    for (let i = 0; i < this.shots.length; i++) {
      const s = this.shots[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      const hit = s.life > 0 && G.nearest(s.x, s.y + 22, 12, (f) => f.hp > 0);
      if (hit) {
        hit.hp--; hit.flash = 1; hit.x += s.vx * 0.012; hit.y += s.vy * 0.012;
        PZ.particles.emit('hit', s.x, s.y, { angle: s.a + Math.PI, scale: 0.7 });
        if (hit.hp <= 0) { this.kills++; PZ.particles.emit('sparks', hit.x, hit.y - 20, { count: 6, colors: ['#fff', '#e3b5ff', 'rgba(160,80,255,0)'] }); PZ.particles.emit('dust', hit.x, hit.y); this.gems.push({ x: hit.x, y: hit.y, t: 0 }); PZ.sfx.at('kill', hit.x, hit.y, { vol: 0.4 }); PZ.cam.shake(0.03); }
        s.life = 0;
      }
      if (s.life <= 0) { this.shots[i] = this.shots[this.shots.length - 1]; this.shots.pop(); i--; }
    }
    this.foes = this.foes.filter((f) => f.hp > 0);
    for (let i = 0; i < this.gems.length; i++) {
      const g = this.gems[i]; g.t += dt; const d = PZ.math.dist(g.x, g.y, H.x, H.y);
      if (d < 140) { const k = Math.min(1, dt * 9); g.x += (H.x - g.x) * k; g.y += (H.y - 20 - g.y) * k; }
      if (d < 18) { PZ.fx.pickup(g.x, g.y, { sound: 'xp', color: '#46d4ff' }); this.gems[i] = this.gems[this.gems.length - 1]; this.gems.pop(); i--; }
    }
    if (this.foes.length < 60) this.spawn(80);
    if (PZ.time.frame % 15 === 0) { const r = PZ.gfx.r.stats; this.stat.textContent = `${Math.round(PZ.time.fps)} FPS\n怪物 ${this.foes.length}\n子彈 ${this.shots.length}  粒子 ${PZ.particles.n}\n繪圖批次 ${r.draws}\n畫質 ${PZ.quality.cur.name}${PZ.quality.auto ? '（自動）' : ''}\n擊倒 ${this.kills}`; }
  },
  render(g) {
    Lab.floor(g);
    PZ.particles.draw(g, 'under');
    for (const gm of this.gems) { const b = Math.sin(gm.t * 6) * 2; g.glow(gm.x, gm.y - 6, 14, 'rgba(70,212,255,.5)'); g.spr('gem', gm.x, gm.y - 8 + b, 0, 0.8); }
    const list = this.foes; PZ.sortBy(list, (f) => f.y);
    for (const f of list) { if (!g.visible(f.x, f.y, 50)) continue; g.ellipse(f.x, f.y, 11, 4, 'rgba(0,0,0,.4)'); g.spr(f.kind, f.x, f.y + Math.sin(f.t * 8) * 0.8, 0, (f.x > this.hero.x ? -0.82 : 0.82), 0.82, 1, null, 0, f.flash); }
    const H = this.hero; Lab.actor(g, 'hero', H.x, H.y, { flip: H.face < 0 });
    g.glow(H.x, H.y - 24, 90, 'rgba(70,212,255,.18)');
    for (const s of this.shots) g.spr('bolt', s.x, s.y, s.a, 1.1, 1, 1, null, 1);
  },
});
