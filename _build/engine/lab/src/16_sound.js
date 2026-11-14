/* 樣品館：聲音（合成音效板＋三首配樂＋緊張度＋頻譜） */
const SFX_LABEL = { hit: '打中', hitHeavy: '重擊', crit: '爆擊', kill: '擊倒', slash: '揮砍', clang: '金屬', block: '格擋', shoot: '手槍', rifle: '步槍', shotgun: '散彈', laser: '雷射', reload: '換彈', empty: '空膛', explosion: '爆炸', thunder: '雷', splash: '水花', glass: '玻璃', pickup: '撿到', xp: '經驗', coin: '金幣', powerup: '強化', levelup: '升級', heal: '治療', magic: '法術', charge: '蓄力', whoosh: '揮空', dash: '衝刺', jump: '跳', land: '落地', step: '腳步', hurt: '受傷', death: '死亡', growl: '低吼', heartbeat: '心跳', click: '點擊', hover: '滑過', confirm: '確定', cancel: '取消', error: '錯誤', open: '開啟', close: '關閉', tick: '計數', type: '打字', notify: '通知', card: '翻牌', alarm: '警報', bell: '鐘' };
PZ.scene('sound', {
  bg: '#06080d',
  ui: () => `${Lab.bar('聲音', '全部是程式即時合成，沒有用任何音檔')}
    <div class="lab-panel" data-ui style="max-height:56%;overflow:auto;touch-action:pan-y">
      <div class="lab-row"><span class="lab-label">配樂</span><button class="lab-chip big" data-m="drive">夜行</button><button class="lab-chip big" data-m="ink">墨</button><button class="lab-chip big" data-m="dread">凌晨</button><button class="lab-chip cyan big" data-m="stop">停</button><button class="lab-chip big" data-m="win">過關短句</button></div>
      <div class="lab-row"><span class="lab-label">緊張度</span><input class="lab-range" type="range" min="0" max="1" step="0.05" value="0.5"></div>
      <div class="lab-note">緊張度越高，鼓、琶音、旋律一層一層加進來；遊戲裡打 Boss 時把它拉高就好。</div>
      <div class="lab-sfx" style="margin-top:8px">${Object.keys(SFX_LABEL).map((k) => `<button data-s="${k}" data-sfx="none">${SFX_LABEL[k]}</button>`).join('')}</div>
    </div>`,
  enter() {
    const box = PZ.scenes.uiEl; Lab.bindBack(box);
    const mb = box.querySelectorAll('[data-m]');
    const sync = () => mb.forEach((b) => b.classList.toggle('on', PZ.music.cur && PZ.music.cur.name === b.dataset.m));
    mb.forEach((b) => b.addEventListener('click', () => { const m = b.dataset.m; if (m === 'stop') PZ.music.stop({ fade: 1 }); else if (m === 'win') PZ.music.stinger('win'); else PZ.music.play(m, { fade: 1.2 }); setTimeout(sync, 50); }));
    const rg = box.querySelector('.lab-range'); rg.value = PZ.music.level; Lab.range(rg, (v) => PZ.music.intensity(v));
    box.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('pointerdown', () => { PZ.sfx.play(b.dataset.s, { force: true }); this.pulse = 1; }));
    this.bars = new Float32Array(48); this.pulse = 0; this.beat = 0;
    this.offBeat = PZ.music.onBeat((n) => { this.beat = 1; if (n % 4 === 0) PZ.particles.emit('ring', 0, -40, { scale: 3, colors: ['rgba(255,181,71,.6)', 'rgba(255,181,71,0)'] }); });
    PZ.music.play('drive', { fade: 1 }); sync();
    const lay = () => { PZ.cam.fit(Lab.side() ? 620 : 520); PZ.cam.y = PZ.screen.portrait ? 150 : Lab.side() ? 10 : 40; PZ.cam.x = Lab.shift(); }; lay(); this.offR = PZ.on('resize', lay);
  },
  exit() { this.offBeat(); this.offR(); },
  update(dt) {
    this.pulse = Math.max(0, this.pulse - dt * 4); this.beat = Math.max(0, this.beat - dt * 5);
    const an = PZ.audio.analyser(256);
    if (an) { const d = this._d || (this._d = new Uint8Array(an.frequencyBinCount)); an.getByteFrequencyData(d); for (let i = 0; i < 48; i++) { const v = d[Math.floor(Math.pow(i / 48, 1.6) * 100) + 1] / 255; this.bars[i] = Math.max(v, this.bars[i] - dt * 1.5); } }
  },
  render(g) {
    const n = 48, R = 120, b = this.beat;
    g.glow(0, -40, 200 + b * 40, 'rgba(255,170,60,.25)');
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PZ.TAU - Math.PI / 2, v = this.bars[i], len = 8 + v * 130;
      const x1 = Math.cos(a) * R, y1 = -40 + Math.sin(a) * R, x2 = Math.cos(a) * (R + len), y2 = -40 + Math.sin(a) * (R + len);
      g.line(x1, y1, x2, y2, 5, i % 2 ? '#ffb547' : '#46d4ff', { add: 0.6, cap: 'round' });
    }
    g.ring(0, -40, R - 8 + b * 6, 3, '#fff', { a: 0.4 + b * 0.5, add: 1 });
    g.circle(0, -40, 34 + this.pulse * 10 + b * 6, '#ffb547', { add: 0.3 });
    g.text('♪', 0, -40, { size: 40, align: 'center', baseline: 'middle', color: '#1a1206', weight: 900 });
  },
});
