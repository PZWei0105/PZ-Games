/* 樣品館：介面與聲音（遊戲 HUD：血條殘影、數字滾動、技能冷卻、連擊；閃卡、背包、標題畫面、轉場；音景混音、對拍子換歌、悶住） */
const HD = {};
HD.art = () => {
  if (PZ.art.has('hd.sk0')) return;
  const A = PZ.art;
  const icon = (n, draw) => A.make(n, 48, 48, (c, w, h) => { draw(c, w, h); }, { anchor: [0.5, 0.5] });
  icon('hd.sk0', (c) => { c.save(); c.translate(24, 24); c.rotate(-0.78); const g = c.createLinearGradient(-4, 0, 4, 0); g.addColorStop(0, '#f4fbff'); g.addColorStop(1, '#8fb4d8'); c.fillStyle = g; c.beginPath(); c.moveTo(0, -19); c.lineTo(4, -13); c.lineTo(4, 8); c.lineTo(-4, 8); c.lineTo(-4, -13); c.closePath(); c.fill(); c.fillStyle = '#d9a94a'; c.fillRect(-9, 8, 18, 3.5); c.fillStyle = '#6b4424'; c.fillRect(-2.5, 11, 5, 8); c.restore(); });
  icon('hd.sk1', (c) => { const g = c.createRadialGradient(22, 27, 2, 24, 24, 17); g.addColorStop(0, '#fff7c2'); g.addColorStop(0.35, '#ffb347'); g.addColorStop(0.75, '#ff4d2e'); g.addColorStop(1, 'rgba(255,60,30,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(24, 5); c.bezierCurveTo(33, 15, 40, 21, 38, 30); c.bezierCurveTo(36, 40, 28, 43, 24, 43); c.bezierCurveTo(14, 43, 9, 35, 11, 27); c.bezierCurveTo(13, 20, 20, 17, 24, 5); c.fill(); });
  icon('hd.sk2', (c) => { c.translate(24, 24); c.strokeStyle = '#bff3ff'; c.lineWidth = 3; c.lineCap = 'round'; for (let i = 0; i < 6; i++) { c.save(); c.rotate((i * Math.PI) / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -17); c.moveTo(0, -10); c.lineTo(-5, -14); c.moveTo(0, -10); c.lineTo(5, -14); c.stroke(); c.restore(); } c.fillStyle = '#eaffff'; c.beginPath(); c.arc(0, 0, 3.5, 0, Math.PI * 2); c.fill(); });
  icon('hd.sk3', (c) => { const g = c.createLinearGradient(0, 8, 0, 40); g.addColorStop(0, '#b6ffcf'); g.addColorStop(1, '#2fbf6a'); c.fillStyle = g; c.beginPath(); c.roundRect(19, 8, 10, 32, 3); c.roundRect(8, 19, 32, 10, 3); c.fill(); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(20.5, 9.5, 3, 12); });
  A.make('hd.pine', 70, 130, (c, w, h) => { c.fillStyle = '#0b1120'; for (let i = 0; i < 4; i++) { const y = 18 + i * 26, hw = 16 + i * 9; c.beginPath(); c.moveTo(w / 2, y - 20); c.lineTo(w / 2 + hw, y + 22); c.lineTo(w / 2 - hw, y + 22); c.closePath(); c.fill(); } c.fillRect(w / 2 - 4, h - 22, 8, 22); c.strokeStyle = 'rgba(150,180,255,.12)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2 - 22, 40); c.stroke(); }, { anchor: [0.5, 1] });
  A.make('hd.tent', 110, 70, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#2b3f5e'); g.addColorStop(0.5, '#3d5880'); g.addColorStop(1, '#1d2b42'); c.fillStyle = g; c.beginPath(); c.moveTo(4, h); c.lineTo(w / 2, 4); c.lineTo(w - 4, h); c.closePath(); c.fill(); c.fillStyle = '#0d1422'; c.beginPath(); c.moveTo(w / 2 - 14, h); c.lineTo(w / 2, 26); c.lineTo(w / 2 + 14, h); c.closePath(); c.fill(); c.strokeStyle = 'rgba(255,220,170,.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(w / 2, 4); c.lineTo(w - 4, h); c.stroke(); }, { anchor: [0.5, 1] });
  A.make('hd.logs', 70, 22, (c, w, h) => { c.lineCap = 'round'; for (const [x0, y0, x1, y1] of [[6, 16, 60, 8], [10, 8, 64, 17], [20, 19, 52, 19]]) { c.strokeStyle = '#3d2412'; c.lineWidth = 8; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = 'rgba(255,170,90,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y0 - 2); c.lineTo(x1, y1 - 2); c.stroke(); } }, { anchor: [0.5, 0.8] });
  A.make('hd.leafart', 12, 8, (c, w, h) => { c.fillStyle = '#7aa04a'; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 0.5, h / 2 - 0.5, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(30,50,10,.6)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(1, h / 2); c.lineTo(w - 1, h / 2); c.stroke(); });
  PZ.particles.define('hd.leaf', { count: [1, 2], life: [3, 5], speed: [120, 220], angle: 0.15, spread: 0.5, drag: 0.2, grav: 22, size: [7, 11], end: 1, colors: ['#9bc45a', '#6e8f3a', 'rgba(110,143,58,0)'], shape: 'hd.leafart', spin: [-5, 5], rot: 'random' });
  A.make('hd.flame', 30, 46, (c, w, h) => { const g = c.createLinearGradient(0, h, 0, 0); g.addColorStop(0, '#fff3c0'); g.addColorStop(0.3, '#ffb347'); g.addColorStop(0.75, '#ff5a2e'); g.addColorStop(1, 'rgba(255,60,30,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(w / 2, 0); c.bezierCurveTo(w, h * 0.45, w, h * 0.8, w / 2, h); c.bezierCurveTo(0, h * 0.8, 0, h * 0.45, w / 2, 0); c.fill(); }, { anchor: [0.5, 1] });
};
HD.SKILLS = [
  { name: '斬擊', icon: 'hd.sk0', cd: 0.8, mp: 0, color: '#bfefff', key: '1' },
  { name: '火球', icon: 'hd.sk1', cd: 3.5, mp: 18, color: '#ffb347', key: '2' },
  { name: '冰霜', icon: 'hd.sk2', cd: 6, mp: 26, color: '#8ff3ff', key: '3' },
  { name: '治療', icon: 'hd.sk3', cd: 9, mp: 30, color: '#7dffa8', key: '4' },
];
HD.AMBS = [['雨', 'rain'], ['雷雨', 'storm'], ['風', 'wind'], ['森林', 'forest'], ['夜晚', 'night'], ['洞窟', 'cave'], ['海邊', 'ocean'], ['城市', 'city'], ['營火', 'fire'], ['船艙', 'ship'], ['溪流', 'stream']];
HD.TRANS = [['菱形', 'diamond'], ['百葉窗', 'blinds'], ['快門', 'shutter'], ['推門', 'slide'], ['方塊', 'pixel'], ['光圈', 'iris'], ['斜切', 'wipe']];
HD.songs = () => {
  if (PZ.music.songs.hd_explore) return;
  const M = PZ.music;
  M.define('hd_explore', { bpm: 92, swing: 0.14, delaySteps: 3, feedback: 0.42, tracks: [
    { inst: 'kick', pat: 'x.......x..x....', vol: 0.45 },
    { inst: 'hat', pat: '..x...x...x...xo', vol: 0.16 },
    { inst: 'rim', pat: '....o.......o...', vol: 0.18, min: 0.35 },
    { inst: 'epiano', chords: 'Fmaj7 Em7 Dm7 Cmaj7', vol: 0.3, rev: 0.3, base: 55 },
    { inst: 'sub', notes: 'F2 - - - - - - - . . . . F2 - . . E2 - - - - - - - . . . . E2 - . . D2 - - - - - - - . . . . D2 - . . C2 - - - - - - - . . . . G2 - . .', vol: 0.45 },
    { inst: 'kalimba', notes: 'A4 . C5 . E5 . . . D5 . C5 . A4 . . . G4 . B4 . D5 . . . C5 . B4 . G4 . . . F4 . A4 . C5 . . . B4 . A4 . F4 . . . E4 . G4 . C5 . . . B4 . G4 . E4 . . .', vol: 0.36, delay: 0.38, rev: 0.25 },
    { inst: 'pad', chords: 'Fmaj7 Em7 Dm7 Cmaj7', vol: 0.12, min: 0.55 },
  ] });
  M.define('hd_battle', { bpm: 128, delaySteps: 3, feedback: 0.3, tracks: [
    { inst: 'kick', pat: 'x...x...x...x...', vol: 0.9 },
    { inst: 'snare', pat: '....x.......x...', vol: 0.55 },
    { inst: 'clap', pat: '....x.......x...', vol: 0.25, min: 0.5 },
    { inst: 'hat', pat: 'x.x.x.x.x.x.x.x.', vol: 0.22 },
    { inst: 'ohat', pat: '..x...x...x...x.', vol: 0.14, min: 0.45 },
    { inst: 'bass', notes: 'A1 . A1 A2 . A1 . A1 F1 . F1 F2 . F1 . F1 C2 . C2 C3 . C2 . C2 G1 . G1 G2 . G1 . G1', vol: 0.55 },
    { inst: 'supersaw', chords: 'Am F C G', vol: 0.2, pump: 0.75, lp: [700, 6000], base: 57 },
    { inst: 'arp', notes: 'A4 C5 E5 A5 E5 C5 A4 C5 F4 A4 C5 F5 C5 A4 F4 A4 C5 E5 G5 C6 G5 E5 C5 E5 B4 D5 G5 B5 G5 D5 B4 D5', vol: 0.2, delay: 0.25, lp: [900, 9000], min: 0.35 },
    { inst: 'brass', notes: 'A4 - . . . . . . . . . . . . . . F4 - . . . . . . . . . . . . . . C5 - . . . . . . . . . . . . . . B4 - . . . . . . G4 - . . . . . .', vol: 0.3, min: 0.62, rev: 0.2 },
  ] });
  M.define('hd_boss', { bpm: 140, tracks: [
    { inst: 'kick', pat: 'x..x..x.x..x..x.', vol: 1 },
    { inst: 'snare', pat: '....X.......X..o', vol: 0.65 },
    { inst: 'hat', pat: 'xxxxxxxxxxxxxxxx', vol: 0.15 },
    { inst: 'crash', pat: 'x...............................................................', vol: 0.3 },
    { inst: 'bass', notes: 'D2 . D2 D2 . D2 . D2 C2 . C2 C2 . C2 . C2 Bb1 . Bb1 Bb1 . Bb1 . Bb1 A1 . A1 A1 . A1 . A1', vol: 0.6 },
    { inst: 'supersaw', chords: 'Dm C Bb A', vol: 0.15, pump: 0.6, lp: [1200, 8000], base: 57 },
    { inst: 'choir', chords: 'Dm C Bb A', vol: 0.16, min: 0.3 },
    { inst: 'brass', notes: 'D4 - - - F4 - A4 - G4 - - - F4 - E4 - F4 - - - D4 - - - . . . . . . . . D4 - - - F4 - A4 - C5 - - - Bb4 - A4 - G4 - - - - - - - A4 - - - - - - -', vol: 0.32, rev: 0.25 },
  ] });
};

PZ.scene('hud', {
  bg: '#070a16',
  ui: () => `${Lab.bar('介面與聲音', '點技能、點稻草人；音景可以同時開好幾種')}
    <div class="lab-panel" data-ui style="max-height:46%;overflow:auto;touch-action:pan-y">
      <div class="lab-row"><span class="lab-label">介面</span><button class="lab-chip" data-a="hurt" data-sfx="none">受傷</button><button class="lab-chip" data-a="heal" data-sfx="none">補血</button><button class="lab-chip" data-a="score" data-sfx="none">得分</button><button class="lab-chip" data-a="cards">抽卡</button><button class="lab-chip" data-a="bag">背包</button><button class="lab-chip" data-a="title">標題畫面</button><button class="lab-chip" data-a="trans">轉場：菱形</button></div>
      <div class="lab-row"><span class="lab-label">音景</span>${HD.AMBS.map(([n, k]) => `<button class="lab-chip cyan" data-amb="${k}" data-sfx="none">${n}</button>`).join('')}</div>
      <div class="lab-row"><span class="lab-label">配樂</span><button class="lab-chip big" data-m="hd_explore">探索</button><button class="lab-chip big" data-m="hd_battle">戰鬥</button><button class="lab-chip big" data-m="hd_boss">頭目</button><button class="lab-chip" data-a="muffle">悶住</button><span class="hd-beat"></span></div>
      <div class="lab-note">換歌會等到下一小節才切（不會亂拍）；緊張度跟著戰鬥狀態走，濾波一層一層打開。</div>
    </div>
    <style>.hd-beat{display:inline-block;width:12px;height:12px;border-radius:50%;background:#ffb547;margin-left:6px;box-shadow:0 0 12px #ffb547;transform:scale(var(--b,.5));opacity:calc(.35 + var(--b,.5) * .65)}
    .hd-cards{display:flex;gap:min(12px,2.4vw);justify-content:center;padding:8px 2px 4px}
    .hd-card{width:min(118px,25vw);aspect-ratio:118/168;border-radius:14px;box-sizing:border-box;padding:8px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;color:#fff;background:linear-gradient(160deg,var(--c1),var(--c2));box-shadow:0 14px 30px rgba(0,0,0,.5),0 0 0 1.5px rgba(255,255,255,.28) inset;cursor:pointer;animation:hd-deal .5s calc(var(--i) * .12s) cubic-bezier(.2,.9,.25,1.2) both}
    .hd-card canvas{width:72%;height:auto;max-height:56%;object-fit:contain;filter:drop-shadow(0 6px 8px rgba(0,0,0,.5))}
    .hd-card b{font:900 15px/1.2 var(--pz-font);letter-spacing:.08em;text-shadow:0 1px 3px rgba(0,0,0,.6)}
    .hd-card small{font:800 10px/1 var(--pz-font);letter-spacing:.3em;opacity:.8}
    @keyframes hd-deal{from{opacity:0;transform:translateY(40px) rotate(-8deg) scale(.8)}}</style>`,
  enter(params) {
    HD.art(); HD.songs(); AN.art(); WD.art(); LT.art();
    const box = PZ.scenes.uiEl; Lab.bindBack(box); this.box = box;
    // 狀態：血、魔力、經驗、分數、連擊、技能冷卻
    this.hp = PZ.meter({ max: 120, value: 120 }); this.mp = PZ.meter({ max: 100, value: 100, drain: 0.9 });
    this.xp = 0.35; this.xpShown = 0.35; this.level = 7; this.score = PZ.count(0); this.combo = 0; this.comboT = 0; this.comboPop = 0;
    this.sk = HD.SKILLS.map((s) => ({ s, cd: 0, flash: 0, press: 0 }));
    this.t = 0; this.dummy = { x: 130, y: 0, hit: 0, ph: 0 }; this.hero = { x: -70, y: 0, atk: 0 };
    this.fly = []; this.tension = 0;
    // 音景：預設是海邊懸崖上的營火之夜
    const ambOn = this.amb = params && params.amb ? params.amb : { fire: 1, night: 1, ocean: 0.7 };
    const ambBtn = box.querySelectorAll('[data-amb]');
    const syncAmb = () => { ambBtn.forEach((b) => b.classList.toggle('on', !!ambOn[b.dataset.amb])); PZ.amb.mix(ambOn, { fade: 1.6 }); const w = ambOn.storm ? 'storm' : ambOn.rain ? 'rain' : 'clear'; if (PZ.weather.name !== w) PZ.weather.set(w, { time: 2, wind: ambOn.wind ? 0.6 : w === 'clear' ? 0 : 0.2 }); else PZ.weather.wind = ambOn.wind ? 0.6 : 0.1; };
    ambBtn.forEach((b) => b.addEventListener('click', () => { const k = b.dataset.amb; if (ambOn[k]) delete ambOn[k]; else ambOn[k] = k === 'ocean' ? 0.7 : 1; PZ.uiSound(ambOn[k] ? 'toggleOn' : 'toggleOff'); syncAmb(); }));
    syncAmb();
    // 配樂：對拍子換歌
    const mb = box.querySelectorAll('[data-m]'); this.mb = mb;
    const syncM = () => mb.forEach((b) => b.classList.toggle('on', PZ.music.cur && PZ.music.cur.name === b.dataset.m));
    mb.forEach((b) => b.addEventListener('click', () => { PZ.music.play(b.dataset.m, { sync: 'bar', intensity: b.dataset.m === 'hd_explore' ? 0.3 : 0.6 }); setTimeout(syncM, 30); }));
    if (!PZ.music.cur || !/^hd_/.test(PZ.music.cur.name)) PZ.music.play('hd_explore', { fade: 1.5, intensity: 0.3 });
    syncM();
    this.beatEl = box.querySelector('.hd-beat');
    // 介面示範
    const act = {
      hurt: () => this.hurt(PZ.rand.int(14, 30)),
      heal: () => { this.hp.heal(35); PZ.sfx.play('heal'); PZ.fx.number(this.hero.x, this.hero.y - 80, 35, { heal: true }); },
      score: () => { this.score.add(PZ.rand.int(800, 2400)); PZ.sfx.play('coin'); },
      cards: () => this.cards(),
      bag: () => this.bag(),
      title: () => this.title(),
      trans: () => { const i = ((params && params.ti) || 0), T = HD.TRANS[i % HD.TRANS.length]; PZ.go('hud', { ti: i + 1, amb: ambOn }, { type: T[1], time: 0.55, color: '#05060c' }); },
      muffle: (b) => { this.muffled = !this.muffled; PZ.music.muffle(this.muffled ? 0.85 : 0, 0.5); b.classList.toggle('on', this.muffled); PZ.uiSound(this.muffled ? 'toggleOn' : 'toggleOff'); },
    };
    box.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => act[b.dataset.a](b)));
    const tb = box.querySelector('[data-a=trans]'), ti = (params && params.ti) || 0; tb.textContent = '轉場：' + HD.TRANS[ti % HD.TRANS.length][0];
    if (this.muffled) PZ.music.muffle(0, 0.3); this.muffled = false;
    // 點技能、點稻草人
    this.offTap = PZ.on('tap', (t) => { const i = this.skillAt(t.x, t.y); if (i >= 0) { this.cast(i); return; } if (Math.abs(t.wx - this.dummy.x) < 60 && t.wy > this.dummy.y - 110 && t.wy < this.dummy.y + 20) this.cast(0); });
    this.offKey = (e) => { const i = '1234'.indexOf(e.key); if (i >= 0) this.cast(i); else if (e.key === ' ') this.cast(0); };
    window.addEventListener('keydown', this.offKey);
    // 光影：月光＋營火；天空不受影響
    const L = PZ.light; L.on({ ambient: '#4a5476', soak: 8 });
    L.zone(-3000, -3000, 6000, 2978, { ambient: '#ffffff', soft: 24 });   // 天空與遠方的海不受明暗影響
    this.fireL = L.add({ x: 0, y: -18, r: 330, color: '#ff9a46', intensity: 1.35, flicker: 0.28, flickerSpeed: 9, size: 10, shadows: false });
    this.lay = () => {
      const side = Lab.side(); PZ.cam.fit(side ? 380 : PZ.screen.portrait ? 470 : 420); PZ.cam.compute(); PZ.cam.x = Lab.shift();
      // 地面放在「面板上面那塊畫面」的 78% 高（天空多一點、地上不要空一大片）
      const panel = this.box.querySelector('.lab-panel'), top = side || !panel ? PZ.screen.h : panel.getBoundingClientRect().top - PZ.screen.ui.getBoundingClientRect().top;
      PZ.cam.y = (PZ.screen.h / 2 - top * (side ? 0.7 : 0.74)) / (PZ.cam.ez || 1);
    };
    this.lay(); this.offR = PZ.on('resize', this.lay);
    const R = PZ.rng(5); this.stars = Array.from({ length: 90 }, () => ({ x: R.next(), y: R.next() * 0.62, s: R.range(0.6, 1.8), ph: R.angle(), sp: R.range(0.6, 2.2) }));
    this.flies = Array.from({ length: 14 }, () => ({ x: R.range(-300, 300), y: R.range(-120, 40), ph: R.angle() }));
    this.city = Array.from({ length: 46 }, () => ({ x: R.range(-420, -60), h: R.range(2, 10), c: R.pick(['#ffd27a', '#ffe9b0', '#7fd8ff']), ph: R.angle() }));
    this.rocks = Array.from({ length: 10 }, () => ({ x: R.range(-300, 300), y: R.range(16, 90), w: R.range(6, 16), h: R.range(3, 6) }));
    this.grass = Array.from({ length: 34 }, () => ({ x: R.range(-320, 320), y: R.range(-12, 110), h: R.range(5, 11) }));
  },
  exit() { this.offTap(); this.offR(); window.removeEventListener('keydown', this.offKey); PZ.music.muffle(0, 0.2); PZ.amb.stop({ fade: 0.8 }); },
  skillRects() {
    const n = this.sk.length, r = PZ.screen.portrait ? 25 : 23, gap = r * 2 + 14, side = Lab.side();
    const panel = this.box && this.box.querySelector('.lab-panel'), pt = panel && !side ? panel.getBoundingClientRect().top - PZ.screen.ui.getBoundingClientRect().top : PZ.screen.h;
    const cx = side ? (PZ.screen.w - Math.min(320, PZ.screen.w * 0.44) - 20) / 2 : PZ.screen.w / 2, cy = Math.min(PZ.screen.h - 40, pt - r - 22);
    return this.sk.map((_, i) => ({ x: cx + (i - (n - 1) / 2) * gap, y: cy, r }));
  },
  skillAt(x, y) { const rs = this.skillRects(); for (let i = 0; i < rs.length; i++) if (Math.hypot(x - rs[i].x, y - rs[i].y) < rs[i].r + 8) return i; return -1; },
  cast(i) {
    const k = this.sk[i], S = k.s, H = this.hero, D = this.dummy;
    if (k.cd > 0) { PZ.uiSound('error'); k.press = 0.6; return; }
    if (this.mp.value < S.mp) { PZ.uiSound('error'); PZ.fx.text(H.x, H.y - 90, '魔力不夠', null, { life: 0.7 }); return; }
    k.cd = S.cd; k.press = 1; if (S.mp) this.mp.set(this.mp.value - S.mp);   // 用掉的那段留一下殘影
    H.atk = 1; this.tension = Math.min(1, this.tension + 0.25);
    if (i === 3) { this.hp.heal(45); PZ.sfx.play('heal'); PZ.fx.number(H.x, H.y - 80, 45, { heal: true }); PZ.particles.emit('heal', H.x, H.y - 30, { count: 18 }); return; }
    const dmg = [PZ.rand.int(16, 26), PZ.rand.int(48, 70), PZ.rand.int(30, 42)][i], crit = PZ.rand.chance(i === 0 ? 0.2 : 0.35);
    const hit = () => {
      D.hit = 1; PZ.fx.hit(D.x, D.y - 50, { power: i ? 0.7 : 0.35, crit, dir: 0, color: S.color, sound: i === 1 ? 'explosion' : i === 2 ? 'glass' : 'hit' });
      PZ.fx.number(D.x, D.y - 90, crit ? dmg * 2 : dmg, { crit });
      this.combo++; this.comboT = 2.2; this.comboPop = 1; if (this.combo > 1) PZ.sfx.play('combo', { pitch: 1 + Math.min(1, this.combo * 0.04) });
      this.score.add((crit ? dmg * 2 : dmg) * 10 * Math.max(1, this.combo)); this.xp += 0.07;
      if (this.xp >= 1) { this.xp -= 1; this.xpShown = 0; this.level++; PZ.sfx.play('levelup'); PZ.ui.banner('升級！', { sub: '等級 ' + this.level, sound: false }); }
    };
    if (i === 0) { PZ.sfx.play('slash'); PZ.after(0.08, hit); return; }
    PZ.sfx.play(i === 1 ? 'magic' : 'charge', { vol: 0.6 });
    this.fly.push({ i, x: H.x + 20, y: H.y - 50, t: 0, hit, col: S.color });
  },
  hurt(n) { this.hp.hit(n); PZ.fx.number(this.hero.x, this.hero.y - 80, n, { color: '#ff6b6b' }); PZ.sfx.play('hurt'); PZ.cam.shake(0.25); PZ.fx.vignette('#b0001a', 0.6, 0.6); this.combo = 0; },
  async cards() {
    const rar = [['普通', '#3c4a63', '#1d2536', 'common', 'husk'], ['稀有', '#2c6bc4', '#122a55', 'rare', 'hero'], ['傳說', '#c98b1e', '#5a2a08', 'legend', 'brute']];
    const wrap = document.createElement('div'); wrap.className = 'hd-cards';
    rar.forEach(([n, c1, c2, r, art], i) => {
      const cd = document.createElement('div'); cd.className = 'hd-card'; cd.style.setProperty('--c1', c1); cd.style.setProperty('--c2', c2); cd.style.setProperty('--i', i);
      cd.innerHTML = `<small>${n}</small>`; cd.appendChild(PZ.art.canvas(art)); cd.insertAdjacentHTML('beforeend', `<b>${['空殼', '魏子葳', '屍王'][i]}</b>`);
      PZ.ui.holo(cd, { foil: r !== 'common', tilt: 16 }); wrap.appendChild(cd);
      PZ.ui.tip(cd, `<b>${['空殼', '魏子葳', '屍王'][i]}</b><em>${n}</em><div>${['怕光，被照到會往後縮。', '凌晨三點的外送員，背包裡永遠有一單。', '倉庫最深處的那個東西。攻擊時整個畫面都會震。'][i]}</div>`, { cls: 'r-' + (r === 'common' ? 'common' : r) });
    });
    PZ.after(0.35, () => PZ.sfx.play('rare'), { real: true });
    await PZ.ui.modal({ title: '抽到三張卡', body: wrap, wide: true, buttons: [{ label: '收下', primary: true, value: true }] });
  },
  async bag() {
    const items = [
      { icon: 'kn.sword', name: '騎士長劍', tag: '武器・傳說', desc: '揮出去會留下一道藍白色的刀光。', rarity: 'legend', new: true },
      { icon: 'wd.crystal', name: '洞窟水晶', tag: '素材・史詩', desc: '在黑暗裡會自己發光。', rarity: 'epic', count: 3 },
      { icon: 'gem', name: '藍寶石', tag: '素材・稀有', desc: '可以拿去換錢。', rarity: 'rare', count: 12 },
      { icon: 'lt.flare', name: '照明彈', tag: '道具', desc: '丟出去照亮一大片，空殼最怕這個。', count: 5, new: true },
      { icon: 'wd.chest', name: '寶箱鑰匙組', tag: '道具・稀有', desc: '地牢的寶箱都打得開。', rarity: 'rare' },
      { icon: '🧪', name: '回復藥水', tag: '消耗品', desc: '回復 50 點生命。', count: 8 },
      { icon: '📜', name: '傳送卷軸', tag: '消耗品・史詩', desc: '回到最近的營火。', rarity: 'epic', count: 2 },
      { icon: '🔑', name: '生鏽的鑰匙', tag: '劇情', desc: '上面刻著「312」。' },
      { icon: '🍙', name: '飯糰', tag: '食物', desc: '便利商店的最後一個。', count: 2 },
    ];
    const pick = document.createElement('div'); pick.className = 'lab-note'; pick.style.cssText = 'text-align:center;min-height:22px;margin-top:6px'; pick.textContent = '點一格看看（手指按住看說明）';
    const body = document.createElement('div');
    body.appendChild(PZ.ui.slots({ items, cols: PZ.screen.w < 400 ? 4 : 5, size: PZ.screen.w < 400 ? 60 : 64, min: 15, onPick: (it) => { pick.innerHTML = `<b style="color:#fff">${it.name}</b>　${it.desc}`; PZ.sfx.play(it.rarity === 'legend' || it.rarity === 'epic' ? 'equip' : 'select'); } }));
    body.appendChild(pick);
    await PZ.ui.modal({ title: '背包', body, wide: true, buttons: [{ label: '關閉', value: true }] });
  },
  async title() {
    PZ.music.muffle(0.6, 0.6);
    await PZ.ui.title({ backdrop: true, kicker: '痞子葳 出品', title: '夜行', sub: 'NIGHT RUN', items: [{ label: '開始遊戲', value: 'start', primary: true }, { label: '繼續', value: 'cont' }, { label: '設定', value: 'set' }], foot: 'PZ ENGINE · v' + PZ.version });
    PZ.music.muffle(this.muffled ? 0.85 : 0, 0.6);
  },
  update(dt) {
    this.t += dt; const H = this.hero, D = this.dummy;
    this.mp.heal(dt * 7); this.mp.ghost = this.mp.value;   // 魔力慢慢回（不要綠色預覽）
    for (const k of this.sk) { if (k.cd > 0) { k.cd = Math.max(0, k.cd - dt); if (k.cd === 0) { k.flash = 1; PZ.sfx.play('select', { vol: 0.5, pitch: 1.3 }); } } k.flash = Math.max(0, k.flash - dt * 2.5); k.press = Math.max(0, k.press - dt * 5); }
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    this.comboPop = Math.max(0, this.comboPop - dt * 4);
    this.xpShown = PZ.damp(this.xpShown, this.xp, 6, dt);
    H.atk = Math.max(0, H.atk - dt * 4); D.hit = Math.max(0, D.hit - dt * 3); D.ph += dt;
    // 飛行的法術
    for (const f of this.fly) {
      f.t += dt; const k = Math.min(1, f.t / 0.38); f.x = PZ.lerp(H.x + 20, D.x - 10, k); f.y = PZ.lerp(H.y - 50, D.y - 50, k) - Math.sin(k * Math.PI) * 40;
      PZ.particles.emit(f.i === 1 ? 'ember' : 'sparks', f.x, f.y, { count: f.i === 1 ? 2 : 1, colors: f.i === 2 ? ['#ffffff', '#8ff3ff', 'rgba(140,240,255,0)'] : undefined, scale: 0.8 });
      if (k >= 1 && !f.done) { f.done = true; f.hit(); if (f.i === 1) PZ.fx.explode(D.x, D.y - 50, { power: 0.5, radius: 70 }); }
    }
    this.fly = this.fly.filter((f) => !f.done);
    // 緊張度：打得越兇配樂越滿（濾波打開、聲部加進來）
    this.tension = Math.max(0, this.tension - dt * 0.08);
    if (PZ.music.cur && PZ.music.cur.name !== 'hd_explore') { const lv = 0.35 + this.tension * 0.65; if (Math.abs(lv - PZ.music.level) > 0.04) PZ.music.intensity(lv, 0.6); }
    // 營火的火星、風吹落葉
    if (this.amb.fire && PZ.rand.chance(dt * 9)) PZ.particles.emit('ember', PZ.rand.spread(14), -12, { scale: 0.8 });
    if (this.amb.wind && PZ.rand.chance(dt * 3)) PZ.particles.emit('hd.leaf', PZ.cam.view.x - 20, PZ.rand.range(-220, -20), { angle: 0.15 });
    this.fireL.intensity = this.amb.fire ? 1.35 : 0.0001;
    // 拍子燈
    const ph = PZ.music.phase(); this.beatEl.style.setProperty('--b', (0.45 + 0.55 * Math.pow(1 - ph, 3)).toFixed(3));
    if (this.mb) { const cur = PZ.music.cur && PZ.music.cur.name; this.mb.forEach((b) => b.classList.toggle('on', cur === b.dataset.m)); }
  },
  render(g) {
    const t = this.t, v = PZ.cam.view, A = this.amb;
    // 天空（垂直漸層：g.quad 的角順序轉一下，左色＝上、右色＝下）
    const HZ = -150, top = A.storm ? '#0b0f1c' : '#0a1030', bot = A.storm ? '#1c2234' : '#40305e';
    g.quad([v.x + v.w, v.y - 10, v.x + v.w, HZ, v.x, HZ, v.x, v.y - 10], top, bot);
    if (!A.storm && !A.rain) for (const s of this.stars) { const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)); g.circle(v.x + s.x * v.w, v.y + s.y * (HZ - v.y), s.s, '#e8f0ff', { a }); }
    // 月亮
    const mx = v.x + v.w * 0.78, my = v.y + (HZ - v.y) * 0.56;
    if (!A.storm) { g.glow(mx, my, 80, '#9fb8ff', { a: 0.35 }); g.circle(mx, my, 18, '#f4f2e4'); g.circle(mx + 5, my - 3, 16, '#e4e2d2', { a: 0.5 }); }
    // 遠方的海（越近越暗）＋月光倒影＋對岸的城市燈火
    g.quad([v.x + v.w, HZ, v.x + v.w, -18, v.x, -18, v.x, HZ], A.storm ? '#141c30' : '#1d2a52', A.storm ? '#080c16' : '#0b1228');
    if (!A.storm) for (let i = 0; i < 34; i++) { const k = i / 34, yy = HZ + 3 + k * 120, w = 10 + k * 40 + Math.sin(t * 1.6 + i * 1.7) * 8; g.rect(mx - w / 2 + Math.sin(t * 1.1 + i) * (3 + k * 6), yy, w, 1 + k, '#d8e2ff', { a: (0.3 - k * 0.24) * (0.6 + 0.4 * Math.sin(t * 2.3 + i)) }); }
    for (const c of this.city) g.rect(c.x, HZ - c.h, 2.2, c.h, c.c, { a: 0.5 + 0.4 * Math.sin(t * 0.7 + c.ph) });
    g.rect(v.x, HZ - 0.5, v.w, 1, '#8ea2d8', { a: 0.25 });
    // 懸崖頂（站的地方）：邊緣一道月光
    g.quad([v.x + v.w + 20, -20, v.x + v.w + 20, v.y + v.h + 20, v.x - 20, v.y + v.h + 20, v.x - 20, -20], '#202a44', '#0c1120');
    g.rect(v.x - 20, -21, v.w + 40, 2, '#5a6c9e', { a: 0.5 });
    for (const r of this.rocks) g.ellipse(r.x, r.y, r.w, r.h, '#1a2238');
    for (const gr of this.grass) for (let k = -1; k <= 1; k++) g.line(gr.x + k * 2.5, gr.y, gr.x + k * 4 + Math.sin(t * (A.wind ? 3 : 1.2) + gr.x) * (A.wind ? 4 : 1.5), gr.y - gr.h, 1.4, '#2c3a5c');
    const sway = A.wind ? 0.07 : 0.015;
    for (const [x, sc] of [[-260, 1.1], [-205, 0.8], [215, 1.2], [270, 0.9]]) g.spr('hd.pine', x, -14, Math.sin(t * (A.wind ? 2.2 : 0.9) + x) * sway, sc, sc);
    g.spr('hd.tent', -150, -10);
    // 營火
    g.spr('hd.logs', 0, -4);
    // 角色
    const H = this.hero, D = this.dummy;
    g.ellipse(H.x, H.y - 2, 22, 6, 'rgba(0,0,0,.4)'); g.spr('hero', H.x + H.atk * 8, H.y - 4 - Math.abs(Math.sin(t * 2)) * 1.5, H.atk * 0.12, 1.35, 1.35);
    g.ellipse(D.x, D.y - 2, 22, 6, 'rgba(0,0,0,.4)');
    g.spr('husk2', D.x + Math.sin(t * 60) * D.hit * 4, D.y - 4, Math.sin(D.ph * 1.3) * 0.03 + D.hit * 0.12, -1.25, 1.25 * (1 - D.hit * 0.08), 1, null, 0, D.hit * 0.8);
    for (const f of this.flies) { f.ph += 0.016; f.x += Math.cos(f.ph * 0.7) * 0.4; f.y += Math.sin(f.ph * 1.1) * 0.25; }
    g.lighting();
    // 會發光的：火焰、法術、螢火蟲、稻草人的眼睛
    if (A.fire) { const fl = this.fireL._fi || 1; for (let i = 0; i < 3; i++) g.spr('hd.flame', (i - 1) * 7, -6, Math.sin(t * 8 + i * 2) * 0.12, 0.7 + i % 2 * 0.25, (0.85 + 0.25 * Math.sin(t * 11 + i)) * fl, 0.95, null, 1); g.glow(0, -16, 46 * fl, '#ff9a46', { a: 0.55 }); }
    for (const f of this.fly) { g.glow(f.x, f.y, f.i === 1 ? 20 : 16, f.col, { a: 0.95, core: 1 }); g.glow(f.x, f.y, 40, f.col, { a: 0.3 }); }
    if (A.forest || A.night) for (const f of this.flies) g.glow(f.x, f.y, 4, '#d8ff7a', { a: 0.4 + 0.5 * Math.max(0, Math.sin(t * 2 + f.ph * 3)), core: 1 });
    for (const ex of [-5, 5]) g.glow(D.x - ex * 1.25, D.y - 4 - 32 * 1.25, 4, '#ffd04f', { a: 0.8, core: 1 });
    PZ.particles.draw(g);
    g.hud();
    this.drawHud(g);
  },
  drawHud(g) {
    const S = PZ.screen, sf = S.safe, side = Lab.side(), t = this.t;
    // 左上：頭像＋經驗值環＋血條、魔力條
    const px = 16 + sf.l + 30, py = 66 + sf.t + 30, pr = 27;
    g.circle(px, py, pr + 5, 'rgba(6,8,16,.8)');
    g.arc(px, py, pr + 2.5, 3.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2, 'rgba(255,255,255,.12)');
    g.arc(px, py, pr + 2.5, 3.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * PZ.clamp(this.xpShown, 0, 1), '#c48bff', { cap: 'round' });
    g.circle(px, py, pr, '#1a2440');
    g.spr('face_wei', px, py + 5, 0, 0.225, 0.225);
    g.rrect(px + 12, py + 14, 24, 15, 7, '#c48bff'); g.text(String(this.level), px + 24, py + 21.5, { size: 11, weight: 900, color: '#1a0c2e', align: 'center', baseline: 'middle' });
    const bw = Math.min(side ? 180 : 210, S.w * 0.5), bx = px + pr + 26;
    g.text('魏子葳', bx, py - 30, { size: 13, weight: 900, color: '#fff', baseline: 'middle', outline: 3, outlineColor: 'rgba(0,0,0,.6)' });
    g.meter(this.hp, bx, py - 17, bw, 15, { color: '#ff3b55', color2: '#ff8a5a', segments: 10, low: 0.3, text: true });
    g.meter(this.mp, bx - 6, py + 4, bw * 0.78, 9, { color: '#2f7bff', color2: '#46d4ff', frame: true });
    // 右上：分數、連擊
    const rx = S.w - 16 - sf.r - (side ? Math.min(320, S.w * 0.44) + 12 : 0), ry = 22 + sf.t + (side ? 0 : 36);
    g.text('SCORE', rx, ry - 10, { size: 10, weight: 900, color: 'rgba(255,255,255,.55)', align: 'right', baseline: 'middle', letterSpacing: 2 });
    g.count(this.score, rx, ry + 10, { size: 26, align: 'right', color: '#ffe9b0' });
    if (this.combo > 1) {
      const k = this.comboPop, s = 1 + k * 0.45, hot = Math.min(1, this.combo / 20), col = PZ.color.mix('#7fe8ff', '#ff5a3d', hot);
      g.save(); g.translate(rx, ry + 52); g.scale(s, s); g.rotate(-0.06);
      g.text(this.combo + '', 0, 0, { size: 34, weight: 900, color: PZ.color.css(col), align: 'right', baseline: 'middle', outline: 4, outlineColor: 'rgba(0,0,0,.6)' });
      g.restore();
      g.text('連擊', rx, ry + 76, { size: 12, weight: 900, color: '#fff', align: 'right', baseline: 'middle', outline: 3, outlineColor: 'rgba(0,0,0,.6)' });
      g.rect(rx - 60, ry + 88, 60, 3, 'rgba(255,255,255,.18)'); g.rect(rx - 60 * (this.comboT / 2.2), ry + 88, 60 * (this.comboT / 2.2), 3, PZ.color.css(col));
    }
    // 技能列
    const rs = this.skillRects();
    rs.forEach((r, i) => {
      const k = this.sk[i], S2 = k.s, s = 1 - k.press * 0.12, ready = k.cd <= 0 && this.mp.value >= S2.mp;
      g.circle(r.x, r.y + 3, r.r + 3, 'rgba(0,0,0,.45)');
      g.circle(r.x, r.y, (r.r + 2) * s, ready ? S2.color : '#3a4258', { a: ready ? 0.85 : 0.6 });
      g.circle(r.x, r.y, r.r * s, '#141b2e');
      g.spr(S2.icon, r.x, r.y, 0, (r.r / 30) * s, (r.r / 30) * s, ready ? 1 : 0.45);
      g.cooldown(r.x, r.y, r.r * s, k.cd / S2.cd, { color: S2.color, flash: k.flash });
      if (k.cd > 0) g.text(k.cd >= 1 ? Math.ceil(k.cd) + '' : k.cd.toFixed(1), r.x, r.y + 1, { size: 15, weight: 900, color: '#fff', align: 'center', baseline: 'middle', outline: 3, outlineColor: 'rgba(0,0,0,.7)' });
      if (S2.mp) g.text(S2.mp + '', r.x + r.r * 0.7, r.y + r.r * 0.75, { size: 10, weight: 900, color: this.mp.value >= S2.mp ? '#8fd0ff' : '#ff6b6b', align: 'center', baseline: 'middle', outline: 3, outlineColor: 'rgba(0,0,0,.8)' });
      if (!PZ.env.touch) g.text(S2.key, r.x - r.r * 0.72, r.y - r.r * 0.72, { size: 10, weight: 900, color: 'rgba(255,255,255,.75)', align: 'center', baseline: 'middle', outline: 3, outlineColor: 'rgba(0,0,0,.8)' });
    });
    void t;
  },
});
