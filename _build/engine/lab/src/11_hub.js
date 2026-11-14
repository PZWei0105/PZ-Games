/* 樣品館：大廳 */
const HUB_ITEMS = [
  ['impact', '✦', '打擊感實驗室', '同一下攻擊，把停頓、震屏、火花、數字一項一項打開，感受差別'],
  ['stress', '◎', '壓力測試', '幾千隻怪同時追過來、子彈亂飛，看幀數與自動畫質'],
  ['controls', '✥', '操控', '虛擬搖桿、觸控按鈕、鍵盤、手把，全部同一套動作'],
  ['city', '⌂', '鏡頭', '雙指縮放、旋轉、拖曳慣性、滾輪：戰略與模擬類的基本功'],
  ['sound', '♪', '聲音', '四十多種合成音效、三首文字寫的配樂、緊張度分層'],
  ['post', '◐', '後製特效', '泛光、衝擊波扭曲、色差、調色、掃描線，一鍵切換'],
  ['ui', '▤', '介面與劇情', '五套主題、對話框、劇情對話、選擇、設定頁'],
];
PZ.scene('hub', {
  bg: '#05070c',
  ui: () => `<div class="lab-hub" data-ui>
    <div class="lab-head"><div class="lab-logo">PZ<span>ENGINE</span></div><div class="lab-sub">樣品館　v${PZ.version}</div></div>
    <div class="lab-grid">${HUB_ITEMS.map(([id, ic, t, d]) => `<button class="lab-card pz-focusable" data-go="${id}"><i>${ic}</i><b>${t}</b><small>${d}</small></button>`).join('')}</div>
    <div class="lab-foot">${PZ.env.mobile ? '點一下就有聲音・三指點一下看效能' : '點一下就有聲音・F3 看效能・方向鍵／手把也能選'}<br>痞子葳 × Claude</div>
  </div>`,
  enter() {
    const box = PZ.scenes.uiEl;
    box.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => PZ.go(b.dataset.go, null, { type: 'iris', time: 0.45, cx: b.getBoundingClientRect().left + 30, cy: b.getBoundingClientRect().top + 30 })));
    PZ.ui.push(box.querySelector('.lab-hub'), null);
    this.layer = PZ.ui.top();
    this.t = 0; this.orbs = [];
    const R = PZ.rng(11); for (let i = 0; i < 26; i++) this.orbs.push({ a: R.angle(), r: R.range(80, 520), s: R.range(0.04, 0.16) * R.sign(), z: R.range(2, 7), c: R.pick(['#ffb547', '#46d4ff', '#ff5fd1', '#ffffff']) });
    PZ.music.play('drive', { intensity: 0.35, fade: 2 });
  },
  exit() { PZ.ui.pop(this.layer); },
  update(dt) {
    this.t += dt;
    if (PZ.rand.chance(dt * 6)) PZ.particles.emit('ember', PZ.rand.range(-500, 500), PZ.rand.range(100, 500), { scale: 1.4 });
  },
  render(g) {
    const t = this.t;
    // 遠處的格線與光環
    g.save(); g.alpha(0.5);
    for (let i = -10; i <= 10; i++) { g.line(i * 80, -800, i * 80, 800, 1, '#1b2a44'); g.line(-800, i * 80, 800, i * 80, 1, '#1b2a44'); }
    g.restore();
    for (let k = 0; k < 3; k++) g.ring(0, -60, 150 + k * 70 + Math.sin(t * 0.8 + k) * 6, 1.5, k === 1 ? '#46d4ff' : '#ffb547', { a: 0.25 + 0.1 * Math.sin(t + k), add: 1 });
    for (const o of this.orbs) { const a = o.a + t * o.s; const x = Math.cos(a) * o.r, y = -60 + Math.sin(a) * o.r * 0.55; g.glow(x, y, o.z * 6, o.c, { a: 0.55, core: 0.6 }); g.circle(x, y, o.z * 0.6, '#fff', { a: 0.9 }); }
    g.glow(0, -60, 260, 'rgba(255,170,60,.25)');
    PZ.particles.draw(g, 'over');
  },
});
