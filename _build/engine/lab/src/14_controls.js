/* 樣品館：操控（同一套動作：鍵盤、滑鼠、觸控、手把都能玩） */
PZ.scene('controls', {
  bg: '#0a0d14',
  ui: () => `${Lab.bar('操控', '移動・瞄準・開火・衝刺')}<div class="lab-stat"></div>
    <div class="lab-panel right" data-ui>
      <div class="lab-row"><span class="lab-label">現在用</span><b class="ctl-dev" style="font-size:14px"></b></div>
      <div class="lab-row ctl-acts" style="margin-top:8px"></div>
      <div class="lab-note ctl-help" style="margin-top:8px"></div>
      <div class="lab-row" style="margin-top:8px"><span class="lab-label">震動</span><button class="lab-chip" data-h="light">輕</button><button class="lab-chip" data-h="medium">中</button><button class="lab-chip" data-h="heavy">重</button><button class="lab-chip" data-h="success">成功</button><button class="lab-chip" data-h="error">錯誤</button></div>
    </div>`,
  enter() {
    const box = PZ.scenes.uiEl; Lab.bindBack(box);
    this.dev = box.querySelector('.ctl-dev'); this.acts = box.querySelector('.ctl-acts'); this.help = box.querySelector('.ctl-help');
    this.acts.innerHTML = ['up', 'down', 'left', 'right', 'fire', 'dash'].map((a) => `<span class="lab-chip" data-act="${a}">${{ up: '上', down: '下', left: '左', right: '右', fire: '開火', dash: '衝刺' }[a]}</span>`).join('');
    box.querySelectorAll('[data-h]').forEach((b) => b.addEventListener('click', () => { PZ.haptic.tap(b.dataset.h); PZ.input.rumble(0.8, 0.5, 200); }));
    this.H = { x: 0, y: 0, vx: 0, vy: 0, aim: 0, dash: 0, cd: 0, ghosts: [], fireT: 0, trail: [] };
    this.shots = [];
    PZ.cam.fit(PZ.screen.portrait ? 420 : 520); PZ.cam.follow(this.H, { lerp: 8, lead: 0.2 });
    PZ.input.stick({ target: 'move', zone: { l: 0, t: 0.3, r: 0.5, b: 1 } });
    PZ.input.stick({ target: 'aim', zone: { l: 0.5, t: 0.3, r: 1, b: 0.72 } });
    this.bF = PZ.input.button({ action: 'fire', label: '開火', right: 26, bottom: 150, size: 82 });
    this.bD = PZ.input.button({ action: 'dash', label: '衝刺', right: 120, bottom: 70, size: 66 });
    this.offDev = PZ.on('device', () => this.syncDev()); this.syncDev();
    PZ.music.play('drive', { intensity: 0.5 });
  },
  exit() { PZ.input.clearTouch(); this.offDev(); },
  syncDev() {
    const d = PZ.input.device;
    this.dev.textContent = { touch: '觸控', mouse: '滑鼠', keyboard: '鍵盤', gamepad: '手把' }[d];
    this.help.textContent = d === 'gamepad' ? '左類比移動、右類比瞄準、A／RT 開火、B／LT 衝刺。' : d === 'touch' ? '左半邊拖曳移動、右半邊拖曳瞄準，按鈕開火與衝刺。' : 'WASD／方向鍵移動、滑鼠瞄準、左鍵或空白鍵開火、Shift 衝刺。接上手把會自動切換。';
  },
  update(dt) {
    const H = this.H, I = PZ.input, M = I.move;
    const sp = H.dash > 0 ? 760 : 240;
    H.vx = PZ.damp(H.vx, M.x * sp, H.dash > 0 ? 30 : 14, dt); H.vy = PZ.damp(H.vy, M.y * sp, H.dash > 0 ? 30 : 14, dt);
    H.x += H.vx * dt; H.y += H.vy * dt;
    // 瞄準：右類比／右搖桿；滑鼠時看游標；都沒有就看移動方向
    if (I.aim.active) H.aim = Math.atan2(I.aim.y, I.aim.x);
    else if (I.device === 'mouse') H.aim = Math.atan2(I.pointer.wy - (H.y - 24), I.pointer.wx - H.x);
    else if (M.mag > 0.2) H.aim = Math.atan2(M.y, M.x);
    H.cd -= dt; H.dash -= dt;
    if (I.pressed('dash') && H.cd <= 0) { H.dash = 0.16; H.cd = 0.5; const a = M.mag > 0.1 ? Math.atan2(M.y, M.x) : H.aim; H.vx = Math.cos(a) * 760; H.vy = Math.sin(a) * 760; PZ.sfx.play('dash'); PZ.particles.emit('dust', H.x, H.y, { count: 8 }); PZ.cam.kick(a, 4); }
    if (H.dash > 0) { H.ghosts.push({ x: H.x, y: H.y, a: 0.6 }); }
    for (const g of H.ghosts) g.a -= dt * 3; H.ghosts = H.ghosts.filter((g) => g.a > 0);
    H.fireT -= dt;
    if ((I.down('fire') || (I.aim.active && I.aim.mag > 0.6)) && H.fireT <= 0) {
      H.fireT = 0.11; const a = H.aim + PZ.rand.spread(0.04);
      this.shots.push({ x: H.x + Math.cos(a) * 20, y: H.y - 24 + Math.sin(a) * 20, vx: Math.cos(a) * 820, vy: Math.sin(a) * 820, life: 0.7, a });
      PZ.particles.emit('muzzle', H.x + Math.cos(a) * 22, H.y - 24 + Math.sin(a) * 22, { angle: a }); PZ.sfx.play('shoot', { vol: 0.5 }); PZ.cam.kick(a + Math.PI, 1.5);
    }
    for (const s of this.shots) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
    this.shots = this.shots.filter((s) => s.life > 0);
    this.acts.querySelectorAll('[data-act]').forEach((c) => c.classList.toggle('on', I.down(c.dataset.act)));
    this.bD.cooldown(Math.max(0, H.cd / 0.5));
  },
  render(g) {
    Lab.floor(g);
    PZ.particles.draw(g, 'under');
    const H = this.H;
    for (const gh of H.ghosts) g.spr('hero', gh.x, gh.y, 0, 1, 1, gh.a, '#46d4ff', 0.6);
    // 瞄準線
    const ax = H.x + Math.cos(H.aim) * 30, ay = H.y - 24 + Math.sin(H.aim) * 30;
    g.line(ax, ay, ax + Math.cos(H.aim) * 70, ay + Math.sin(H.aim) * 70, 2, '#ffb547', { a: 0.5, add: 1 });
    g.circle(ax + Math.cos(H.aim) * 78, ay + Math.sin(H.aim) * 78, 4, '#ffb547', { add: 1 });
    Lab.actor(g, 'hero', H.x, H.y, { flip: Math.cos(H.aim) < 0 });
    for (const s of this.shots) g.spr('bolt', s.x, s.y, s.a, 1.2, 1.1, 1, null, 1);
    g.glow(H.x, H.y - 24, 80, 'rgba(70,212,255,.2)');
  },
});
