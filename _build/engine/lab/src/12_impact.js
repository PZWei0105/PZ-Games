/* 樣品館：打擊感實驗室
   同一下攻擊，打擊感的每一項可以單獨開關。遊戲裡寫一行 PZ.fx.hit(x, y, {…}) 就是全開。 */
const IMPACT_KEYS = [['stop', '停頓'], ['shake', '震屏'], ['kick', '頓鏡'], ['spark', '火花'], ['flash', '閃白'], ['knock', '擊退'], ['nums', '數字'], ['chroma', '色差'], ['sound', '音效'], ['haptic', '震動']];
PZ.scene('impact', {
  bg: '#0a0d14',
  ui: () => `${Lab.bar('打擊感實驗室', '點怪物攻擊・逐項開關比較')}
    <div class="lab-panel" data-ui>
      <div class="lab-row">${IMPACT_KEYS.map(([k, l]) => `<button class="lab-chip" data-chip="${k}">${l}</button>`).join('')}</div>
      <div class="lab-row"><button class="lab-chip cyan big" data-a="none">全部關掉</button><button class="lab-chip cyan big" data-a="all">全部打開</button><button class="lab-chip big" data-a="auto">自動攻擊</button></div>
      <div class="lab-row"><span class="lab-label">力道</span><input class="lab-range" type="range" min="0.1" max="1" step="0.05" value="0.55"></div>
      <div class="lab-row"><button class="lab-chip big" data-a="crit">爆擊</button><button class="lab-chip big" data-a="boom">爆炸</button><button class="lab-chip big" data-a="slow">終結慢動作</button></div>
    </div>`,
  enter() {
    const box = PZ.scenes.uiEl; Lab.bindBack(box);
    this.fx = Object.fromEntries(IMPACT_KEYS.map(([k]) => [k, true]));
    this.power = 0.55; this.auto = false; this.autoT = 0;
    Lab.chips(box, this.fx);
    const sync = () => box.querySelectorAll('[data-chip]').forEach((b) => b.classList.toggle('on', !!this.fx[b.dataset.chip]));
    box.querySelector('[data-a="none"]').onclick = () => { for (const k in this.fx) this.fx[k] = false; sync(); PZ.uiSound('cancel'); };
    box.querySelector('[data-a="all"]').onclick = () => { for (const k in this.fx) this.fx[k] = true; sync(); PZ.uiSound('confirm'); };
    const ab = box.querySelector('[data-a="auto"]'); ab.onclick = () => { this.auto = !this.auto; ab.classList.toggle('on', this.auto); };
    box.querySelector('[data-a="crit"]').onclick = () => { const e = this.pick(); if (e) this.attack(e, true); };
    box.querySelector('[data-a="boom"]').onclick = () => this.boom();
    box.querySelector('[data-a="slow"]').onclick = () => { const e = this.pick(); if (e) { e.hp = 1; PZ.slowmo(0.2, 0.9, 0.4); this.attack(e, true); } };
    Lab.range(box.querySelector('.lab-range'), (v) => { this.power = v; });
    this.hero = { x: -120, y: 12, swing: 0, face: 1 };
    this.foes = [];
    const spots = [[30, -70], [110, 10], [30, 95], [190, -60], [190, 85], [245, 12]];
    spots.forEach(([x, y], i) => this.foes.push(this.foe(x, y, i === 5 ? 'brute' : i % 2 ? 'husk2' : 'husk')));
    // 直拿時下方有控制面板：鏡頭往下挪，讓戰場在上面三分之二
    // 直拿：整排往中間收（主角、怪物都不出畫面，也不用把鏡頭拉遠讓角色變小）
    let first = true;
    const layout = () => {
      const port = PZ.screen.portrait, k = port ? 0.8 : 1;
      this.hero.x = port ? -96 : -120;
      for (const e of this.foes) { e.ox = e.bx * k; if (first) e.x = e.ox; }
      first = false;
      const side = Lab.side();
      PZ.cam.fit(port || side ? 380 : 420); PZ.cam.x = (port ? 52 : 50) + Lab.shift(); PZ.cam.y = port ? 70 : side ? 12 : 20;
    };
    layout(); this.offResize = PZ.on('resize', layout);
    this.offTap = PZ.on('tap', (t) => { const wx = t.wx, wy = t.wy; let best = null, bd = 70 * 70; for (const e of this.foes) { if (e.dead) continue; const d = PZ.math.dist2(wx, wy, e.x, e.y - e.h * 0.4); if (d < bd) { bd = d; best = e; } } if (best) this.attack(best); else { this.hero.swing = 1; if (this.fx.sound) PZ.sfx.play('whoosh'); } });
    PZ.music.play('drive', { intensity: 0.6, fade: 1.5 });
  },
  exit() { this.offTap(); this.offResize(); },
  foe(x, y, kind) { const big = kind === 'brute'; return { x, y, ox: x, oy: y, bx: x, vx: 0, vy: 0, kind, hp: big ? 260 : 100, max: big ? 260 : 100, back: 1, flash: 0, sq: PZ.spring(1, { k: 520, d: 14 }), h: big ? 84 : 52, big, dead: false, t: PZ.rand.next() * 6, spawn: 0 }; },
  pick() { const live = this.foes.filter((e) => !e.dead); return live.length ? PZ.rand.pick(live) : null; },
  attack(e, forceCrit) {
    const F = this.fx, p = this.power, crit = forceCrit || PZ.rand.chance(0.22);
    const dir = Math.atan2(e.y - this.hero.y, e.x - this.hero.x);
    this.hero.swing = 1; this.hero.face = Math.sign(e.x - this.hero.x) || 1;
    let dmg = Math.round((10 + p * 34) * (crit ? 2.2 : 1) * PZ.rand.range(0.85, 1.15));
    e.hp -= dmg; const kill = e.hp <= 0;
    const hx = e.x - Math.cos(dir) * 12, hy = e.y - e.h * 0.45;
    // ↓ 這一段就是 PZ.fx.hit() 裡面做的事，拆開來才能逐項開關
    if (F.stop) PZ.freeze(Math.min(140, 18 + p * 50 + (crit ? 40 : 0) + (kill ? 45 : 0)));
    if (F.shake) PZ.cam.shake(0.06 + p * 0.22 + (crit ? 0.14 : 0) + (kill ? 0.1 : 0));
    if (F.kick) { PZ.cam.kick(dir, 2 + p * 7 + (crit ? 4 : 0)); if (crit) PZ.cam.punch(0.03 + p * 0.02); }
    if (F.spark) { PZ.particles.emit('hit', hx, hy, { angle: dir, scale: 0.8 + p * 0.6 }); PZ.particles.emit('sparks', hx, hy, { angle: dir, count: Math.round(4 + p * 12) }); if (crit) { PZ.particles.emit('flare', hx, hy, { scale: 1 + p }); PZ.particles.emit('ring', hx, hy, { scale: 0.8 + p }); } }
    if (F.flash) { e.flash = 1; if (crit || kill) PZ.fx.flash('#fff', 0.08 + p * 0.1, 0.07); }
    if (F.knock) { e.vx += Math.cos(dir) * (220 + p * 420) * (e.big ? 0.4 : 1); e.vy += Math.sin(dir) * (220 + p * 420) * (e.big ? 0.4 : 1); e.sq.kick(-6 - p * 6); }
    if (F.nums) PZ.fx.number(hx, hy - 10, dmg, { crit });
    if (F.chroma && crit) PZ.fx.chroma(0.01 + p * 0.008, 0.22);
    if (F.sound) { PZ.sfx.at(p > 0.6 ? 'hitHeavy' : 'hit', hx, hy, { pitch: 1.08 - p * 0.18 }); if (crit) PZ.sfx.at('crit', hx, hy); if (kill) PZ.sfx.at('kill', hx, hy); }
    if (F.haptic) PZ.haptic.tap(crit || kill ? 'medium' : 'light');
    if (kill) this.kill(e, dir);
  },
  kill(e, dir) {
    e.dead = true; e.respawn = 1.4;
    if (this.fx.spark) { PZ.particles.emit('explosion', e.x, e.y - e.h * 0.4, { scale: e.big ? 1.2 : 0.7 }); PZ.particles.emit('magic', e.x, e.y - e.h * 0.4, { colors: ['#fff', '#d6a8ff', 'rgba(150,80,255,0)'] }); }
    if (this.fx.shake) PZ.cam.shake(e.big ? 0.5 : 0.25);
    if (this.fx.flash && e.big) PZ.fx.shockwave(e.x, e.y - 30, { radius: 300, strength: 0.03 });
    if (this.fx.sound && e.big) PZ.sfx.at('explosion', e.x, e.y, { vol: 0.8 });
  },
  boom() {
    const live = this.foes.filter((e) => !e.dead); if (!live.length) return;
    let cx = 0, cy = 0; for (const e of live) { cx += e.x; cy += e.y; } cx /= live.length; cy /= live.length;
    PZ.fx.explode(cx, cy - 20, { power: 1, radius: 150 });
    for (const e of live) { const d = Math.atan2(e.y - cy, e.x - cx); e.vx += Math.cos(d) * 520; e.vy += Math.sin(d) * 520; e.flash = 1; e.hp -= 60; PZ.fx.number(e.x, e.y - e.h, 60, {}); if (e.hp <= 0) this.kill(e, d); }
  },
  update(dt) {
    const H = this.hero; H.swing = Math.max(0, H.swing - dt * 5);
    if (this.auto) { this.autoT -= dt; if (this.autoT <= 0) { this.autoT = 0.42; const e = this.pick(); if (e) this.attack(e); } }
    for (const e of this.foes) {
      e.t += dt; e.flash = Math.max(0, e.flash - dt * 7);
      if (e.dead) { e.respawn -= dt; if (e.respawn <= 0) { Object.assign(e, { dead: false, hp: e.max, x: e.ox, y: e.oy, vx: 0, vy: 0, spawn: 1 }); e.sq.set(0.2); e.sq.target = 1; PZ.particles.emit('magic', e.x, e.y - 20); } continue; }
      e.spawn = Math.max(0, e.spawn - dt * 3);
      e.x += e.vx * dt; e.y += e.vy * dt; const k = Math.exp(-7 * dt); e.vx *= k; e.vy *= k;
      e.x = PZ.damp(e.x, e.ox, 2.2, dt); e.y = PZ.damp(e.y, e.oy, 2.2, dt);
      e.back = Math.max(e.hp / e.max, e.back - dt * 0.6);
    }
  },
  render(g) {
    Lab.floor(g);
    PZ.particles.draw(g, 'under');
    const list = [...this.foes.filter((e) => !e.dead), this.hero].sort((a, b) => a.y - b.y);
    for (const e of list) {
      if (e === this.hero) {
        const H = this.hero, sw = H.swing;
        Lab.actor(g, 'hero', H.x, H.y, { flip: H.face < 0, sx: 1 + sw * 0.08, sy: 1 - sw * 0.06 });
        if (sw > 0) { g.save(); g.translate(H.x + H.face * 18, H.y - 30); g.rotate(H.face > 0 ? -1.4 + (1 - sw) * 2.6 : Math.PI + 1.4 - (1 - sw) * 2.6); g.alpha(sw); g.rect(0, -3, 46, 6, '#ffe6b0', { add: 1, ax: 0, ay: 0.5 }); g.restore(); }
        continue;
      }
      const sq = e.sq.value, bob = Math.sin(e.t * 3) * 1.5;
      Lab.actor(g, e.kind, e.x, e.y, { sx: (2 - sq), sy: sq, oy: bob, flash: e.flash, shadow: e.big ? 26 : 15 });
      g.glow(e.x, e.y - e.h * 0.75, e.big ? 40 : 24, e.kind === 'husk2' ? 'rgba(255,190,80,.35)' : e.big ? 'rgba(255,60,60,.35)' : 'rgba(255,80,220,.35)');
      if (e.hp < e.max) g.bar(e.x - 22, e.y - e.h - 12, 44, 5, e.hp / e.max, { back: e.back, fg: '#ff3b5c' });
    }
    g.glow(this.hero.x, this.hero.y - 30, 70, 'rgba(70,212,255,.22)');
  },
});
