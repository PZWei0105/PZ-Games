/* ===== PZ 引擎接手：主迴圈、畫面放大＋後製、光暈、手把選單、設定 =====
   遷移做法（給之後改這款的 Claude）：
   - 世界照舊用 Canvas2D 畫在 VC.cv（像素解析度），每格交給引擎當貼圖放大到全螢幕（最近鄰，像素清楚），
     再經過引擎的後製（泛光、衝擊波扭曲、色差、暗角、顆粒）。
   - 引擎相機設成 external：跟著遊戲自己的鏡頭走，引擎只提供震動與後座力的位移（Cam.offsetX/Y）。
   - 引擎世界座標＝遊戲世界的像素座標：在 drawOverlays 裡可以直接用 g.glow / PZ.particles 疊在像素世界上。
   - 遊戲邏輯維持固定 1/60 秒（引擎 step: 1/60），跟原本一模一樣。 */
function openSettings() {
  // 額外一列：劇情文字速度（引擎的 textSpeed，各款遊戲共用）
  const seg = document.createElement('div'); seg.className = 'pz-seg';
  for (const [v, l] of [[0.6, '慢'], [1, '標準'], [1.8, '快']]) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = l;
    if (Math.abs(PZ.settings.get('textSpeed') - v) < 0.05) b.classList.add('on');
    b.onclick = () => { PZ.settings.set('textSpeed', v); for (const x of seg.children) x.classList.toggle('on', x === b); PZ.uiSound('click'); };
    seg.appendChild(b);
  }
  return PZ.ui.settings({ save: Save.store, extra: [{ head: '劇情' }, { label: '文字速度', control: seg }] });
}

// 收藏庫的 PZ 圓鈕選單打開：遊戲中就叫出暫停選單（關掉選單時停在暫停畫面，不會突然被咬）
PZ.on('hub', (open) => { if (open && App.screen === 'play' && G && G.state === 'play') UI.pause(); });

/** 疊在像素世界上的光暈（引擎畫，會被泛光放大）：槍口火光、爆炸、火焰 */
function drawOverlays(g) {
  const G0 = G; if (!G0) return;
  for (const l of G0.dl) {
    const k = Math.max(0, l.life / l.max);
    g.glow(l.x, l.y, l.r * 0.75, l.col || '#ffcf6a', { a: Math.min(1, (l.i || 1) * k) * 0.5, core: 0.6 });
  }
  for (const z of G0.zones) {
    if (z.k !== 'fire') continue;
    const k = Math.min(1, z.life / 0.6), f = 0.85 + Math.sin(G0.t * 23 + z.x) * 0.1;
    g.glow(z.x, z.y - 4, z.r * 1.5 * f, '#ff7a2a', { a: 0.4 * k, core: 0.4 });
  }
}

/* 手把／鍵盤操作 DOM 選單：最上層看得到的畫面登記成引擎的介面層，方向鍵移動焦點、A／Enter 按、B／Esc 返回。
   畫面出現後要等一下才接手（升級卡 0.6 秒、其他 0.35 秒）：狂按翻滾時跳出升級卡，不會被誤選。劇情只有在「選擇」時才接手，其餘交給點擊／空白鍵。 */
const PadNav = {
  layer: null, el: null, cand: null, since: 0,
  arm(e) { return e.id === 'mLv' ? 0.6 : 0.35; }, // 升級卡多等一下：狂按翻滾的人不會一出來就按掉
  pick() {
    for (const id of ['mLv', 'mDead', 'mClear', 'mPause']) { const e = $(id); if (e && !e.hidden) return e; }
    if (App.screen === 'story') { const c = $('stChoice'); return c && !c.hidden ? c : null; }
    if (App.screen && App.screen !== 'play') { const e = $(SCREENS[App.screen]); if (e && !e.hidden) return e; }
    return null;
  },
  back(e) {
    // 暫停選單的返回：鍵盤 Esc 由遊戲自己的按鍵處理（這裡再接一次會「繼續→又暫停」），手把 B 見 04_input.js
    if (e.id === 'scrChapters' || e.id === 'scrAch') return () => { Sound.play('click'); Title.show(); };
    return null;
  },
  tag(e) { e.querySelectorAll('button:not(.pz-focusable)').forEach((b) => b.classList.add('pz-focusable')); },
  tick() {
    const e = this.pick(), now = PZ.time.real;
    if (e !== this.cand) { this.cand = e; this.since = now; }
    const want = e && now - this.since >= this.arm(e) ? e : null;
    if (want !== this.el) {
      if (this.layer) PZ.ui.pop(this.layer);
      this.el = want; this.layer = null;
      if (want) { this.tag(want); this.layer = PZ.ui.push(want, this.back(want)); }
      return;
    }
    if (this.el) {
      // 內容換掉（重抽升級卡、章節列表重畫）：新按鈕也要能選，焦點不見就放回第一個
      this.tag(this.el);
      const f = PZ.ui.focus, dev = PZ.input.device;
      if ((dev === 'gamepad' || dev === 'keyboard') && (!f || !document.body.contains(f) || f.offsetParent === null)) {
        const first = this.el.querySelector('.pz-focusable.primary:not([disabled])') || [...this.el.querySelectorAll('.pz-focusable')].find((x) => !x.disabled && x.offsetParent !== null);
        if (first && f) PZ.ui.setFocus(first);
      }
    }
  },
};

PZ.start({
  id: 'last-order', title: '最後一單', version: (window.PZ_GAME && PZ_GAME.version) || '2.0.0',
  orientation: 'any', background: '#050608',
  step: 1 / 60, // 跟原本一樣：邏輯固定每秒 60 次
  post: { vignette: 0.26, grain: 0.03, bloom: { on: true, strength: 0.55, threshold: 0.7 } },
  theme: { font: "'LOPixel', ui-monospace, 'PingFang TC', 'Noto Sans TC', sans-serif", text: '#ece6da', dim: '#9aa4b5', faint: 'rgba(236,230,218,.4)', bg: 'rgba(4,6,10,.74)', panel: '#131925', panel2: '#1b2331', line: '#45526b', accent: '#ffb347', accent2: '#6fd0e8', 'on-accent': '#1d1206', radius: '0px', 'radius-s': '0px', shadow: '0 -3px 0 0 #2c3649, 0 3px 0 0 #2c3649, -3px 0 0 0 #2c3649, 3px 0 0 0 #2c3649' },
  loading: PZ.env.claude, // Claude 版：先等雲端存檔回話（最多 5 秒），免得新遊戲蓋掉另一台的進度
  async load(progress) {
    Save.load();
    if (Save.store.ready) { progress(0.4, '連上你的帳號'); await Save.store.ready; Save.fix(); }
    boot();
  },
  scenes: {
    main: {
      bg: '#050608',
      enter() {
        PZ.cam.external = true; PZ.cam.decay = 2.4; PZ.cam.maxR = 0;
        this.world = PZ.art.live('lo-world', VC.cv, { pixel: true });
        this.wasPlay = false; this.moving = false;
        PZ.post.enabled = false; // 標題、劇情畫在自己的 DOM 畫布上，引擎畫面被蓋住：不用跑後製（省電、手機不發燙）
      },
      update(dt) {
        if (App.screen === 'play' && G && (G.state === 'play' || G.state === 'dying' || G.state === 'clearing')) {
          update(dt);
          const mv = PZ.input.move.mag > 0.1;
          if (mv && !this.moving && G && G.state === 'play') Game.onMoveInput(); // 開始移動的那一下（教學提示幾秒後收起）
          this.moving = mv;
        }
      },
      render(g) {
        const rdt = PZ.time.rdt, playing = App.screen === 'play' && !!G;
        PadNav.tick();
        if (playing !== this.wasPlay) { this.wasPlay = playing; Input.stick.show(playing); PZ.screen.keepAwake(playing); PZ.post.enabled = playing; }
        if (playing) {
          VC.sc = PZ.screen.w / VC.w;
          PZ.cam.maxX = 4.6 * VC.sc; PZ.cam.maxY = 3.6 * VC.sc; // 震動幅度以「遊戲像素」計，4K 電視上一樣有感
          render(rdt); HUD.sync(rdt);
          this.world.refresh();
          // 引擎相機對齊遊戲鏡頭：之後 g.world() 畫的東西會疊在像素世界的同一個位置
          PZ.cam.fitSize = 0; PZ.cam.zoom = VC.sc; PZ.cam.x = G.cx + VC.w / 2; PZ.cam.y = G.cy + VC.h / 2; PZ.cam.compute();
          g.screen(); g.spr(this.world, 0, 0, 0, PZ.screen.w / VC.w, PZ.screen.h / VC.h);
          g.world(); drawOverlays(g);
        } else if (App.screen === 'story') Story.frame(rdt);
        else Scene.frame(rdt);
        g.hud();
      },
    },
  },
  first: 'main', firstTransition: 'none',
});
