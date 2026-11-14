/* 說明書裡的最小範例：一個主角、追過來的史萊姆、攻擊有完整打擊感。
   組建：python3 _build/engine/tools/pzbuild.py _build/engine/examples/hello */

// 1) 美術：用程式畫，收進圖集（在 load 裡畫，引擎已經準備好繪圖器）
function makeArt() {
  PZ.art.make('hero', 48, 56, (c, w, h) => {
    c.fillStyle = '#ffb547'; c.beginPath(); c.roundRect(10, 18, 28, 34, 8); c.fill();     // 身體
    c.fillStyle = '#ffe0b0'; c.beginPath(); c.arc(w / 2, 14, 11, 0, Math.PI * 2); c.fill(); // 頭
    c.fillStyle = '#1b1208'; c.fillRect(w / 2 + 3, 11, 4, 4);                               // 眼睛
  });
  PZ.art.make('slime', 44, 34, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2 - 6, h / 2 - 6, 2, w / 2, h / 2, 22);
    gr.addColorStop(0, '#b9ffcf'); gr.addColorStop(1, '#2f9e5a');
    c.fillStyle = gr; c.beginPath(); c.ellipse(w / 2, h * 0.58, 20, 13, 0, 0, Math.PI * 2); c.fill();
  });
}

// 2) 場景：enter 準備、update 邏輯、render 畫圖
PZ.scene('play', {
  bg: '#0b0f17',
  enter() {
    this.p = { x: 0, y: 0 };
    this.foes = []; this.kills = 0;
    PZ.cam.fit(420);                                   // 短邊看得到 420 個世界單位：手機、電腦看到的範圍一樣
    PZ.cam.follow(this.p, { lerp: 8, lead: 0.2 });
    PZ.input.stick({ target: 'move' });                // 手機：左下浮動搖桿（鍵盤 WASD／方向鍵、手把左類比自動合併）
    PZ.input.button({ action: 'fire', label: '攻擊' }); // 手機：右下按鈕
    PZ.every(1.1, () => {                              // 每 1.1 秒（遊戲時間）生一隻
      const a = PZ.rand.angle();
      this.foes.push({ x: this.p.x + Math.cos(a) * 320, y: this.p.y + Math.sin(a) * 320, hp: 3 });
    });
  },
  update(dt) {
    const m = PZ.input.move, p = this.p;
    p.x += m.x * 190 * dt; p.y += m.y * 190 * dt;
    for (const f of this.foes) { const a = Math.atan2(p.y - f.y, p.x - f.x); f.x += Math.cos(a) * 55 * dt; f.y += Math.sin(a) * 55 * dt; }
    if (PZ.input.pressed('fire')) {
      for (const f of this.foes) {
        if (Math.hypot(f.x - p.x, f.y - p.y) > 80) continue;
        f.hp--;
        const kill = f.hp <= 0;
        PZ.fx.hit(f.x, f.y, { power: kill ? 0.8 : 0.45, dir: Math.atan2(f.y - p.y, f.x - p.x), kill });  // 停頓＋震屏＋火花＋震動＋音效
        PZ.fx.number(f.x, f.y - 24, 1);
        if (kill) this.kills++;
      }
      this.foes = this.foes.filter((f) => f.hp > 0);
    }
  },
  render(g) {
    PZ.particles.draw(g, 'under');                     // 地上的粒子（塵土、血）畫在角色下面
    for (const f of this.foes) g.sprite('slime', f.x, f.y);
    g.sprite('hero', this.p.x, this.p.y);
    g.hud();                                           // 之後畫的不受震動與後製影響
    g.text('擊倒 ' + this.kills, 16, 16, { size: 20, weight: 900, color: '#fff', outline: 3 });
  },
});

// 3) 啟動
PZ.start({
  id: 'hello-pz', title: '你好 PZ', version: '0.1.0',
  binds: { fire: ['Space', 'KeyJ', 'PadA', 'Mouse0'] },
  async load() { makeArt(); },
  first: 'play',
});
