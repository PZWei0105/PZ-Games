/* 樣品館：角色動畫（骨架騎士、披風與羽飾、腳踩地形、連段攻擊；程序動畫的史萊姆、木樁；尾巴會甩的小狐狸） */
const AN = { base: 40 };
AN.ground = (x) => AN.base + (AN.hills ? 22 * Math.sin(x / 170) + 10 * Math.sin(x / 61 + 1.3) : 0);
AN.art = () => {
  if (PZ.art.has('kn.head')) return;
  const A = PZ.art, steel = (c, x0, y0, x1, y1) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#e2e8f0'); g.addColorStop(0.45, '#9aa6b6'); g.addColorStop(1, '#4a5466'); return g; };
  const gold = '#d9a94a', red = '#a3283a', dark = '#2a303c', rim = { color: '#fff4dc', a: 0.6, w: 1.2, angle: -2.4 };
  // 頭盔（面向右，脖子在下緣中間）
  A.make('kn.head', 28, 30, (c) => {
    c.fillStyle = steel(c, 4, 2, 24, 28); c.beginPath(); c.moveTo(5, 27); c.quadraticCurveTo(2, 4, 15, 2.5); c.quadraticCurveTo(27, 3, 26, 16); c.lineTo(24.5, 27); c.closePath(); c.fill();
    c.fillStyle = '#0d1118'; c.beginPath(); c.roundRect(14, 12.5, 12.5, 4, 1.5); c.fill();
    c.fillStyle = '#7fe8ff'; c.fillRect(16, 13.8, 9.5, 1.4);
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(6, 7); c.quadraticCurveTo(14, 3, 25, 9); c.stroke();
    c.fillStyle = gold; c.fillRect(4.5, 24.5, 20, 2.5);
    c.fillStyle = '#5b6576'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(17 + i * 3, 20.5, 0.9, 0, Math.PI * 2); c.fill(); }
  }, { anchor: [0.5, 0.95], rim });
  // 胸甲＋紅色罩袍＋腰帶（髖在下緣中間）
  A.make('kn.torso', 26, 34, (c) => {
    c.fillStyle = steel(c, 4, 0, 24, 30); c.beginPath(); c.moveTo(6, 33); c.lineTo(5, 6); c.quadraticCurveTo(6, 1, 13, 1); c.quadraticCurveTo(22, 2, 24.5, 13); c.quadraticCurveTo(25, 23, 20.5, 33); c.closePath(); c.fill();
    c.fillStyle = red; c.beginPath(); c.moveTo(6.5, 33); c.lineTo(6, 14); c.lineTo(20, 12); c.quadraticCurveTo(24, 22, 20.5, 33); c.closePath(); c.fill();
    c.strokeStyle = gold; c.lineWidth = 1.4; c.beginPath(); c.moveTo(6, 14); c.lineTo(20, 12); c.stroke();
    c.fillStyle = '#f2d68a'; c.beginPath(); c.moveTo(13, 17); c.lineTo(16, 21); c.lineTo(13, 25); c.lineTo(10, 21); c.closePath(); c.fill();
    c.fillStyle = '#4a3020'; c.fillRect(5.5, 27.5, 16, 3.4); c.fillStyle = gold; c.fillRect(15, 27, 4, 4.4);
  }, { anchor: [0.5, 0.97], rim, shade: 0.2 });
  A.make('kn.pelvis', 24, 18, (c) => {
    c.fillStyle = red; c.beginPath(); c.moveTo(5, 0); c.lineTo(19, 0); c.lineTo(21, 15); c.lineTo(3, 15); c.closePath(); c.fill();
    for (let i = 0; i < 3; i++) { c.fillStyle = steel(c, 0, i * 4, 0, i * 4 + 6); c.beginPath(); c.roundRect(3 - i * 0.4, 1 + i * 4, 18 + i * 0.8, 5.5, 2); c.fill(); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(3, 5.7 + i * 4, 18, 1); }
    c.strokeStyle = gold; c.lineWidth = 1; c.beginPath(); c.moveTo(3, 15); c.lineTo(21, 15); c.stroke();
  }, { anchor: [0.5, 0.1], rim });
  // 手：上臂（肩甲圓圓的）、前臂（護腕）、拳頭
  A.make('kn.upper', 14, 21, (c) => {
    c.fillStyle = steel(c, 2, 4, 10, 20); c.beginPath(); c.roundRect(4, 6, 6.5, 14, 3); c.fill();
    c.fillStyle = steel(c, 0, 0, 12, 10); c.beginPath(); c.ellipse(7, 5.5, 6.8, 5.5, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = gold; c.lineWidth = 1.2; c.beginPath(); c.ellipse(7, 5.5, 6, 4.6, 0, 0.2, Math.PI - 0.2); c.stroke();
  }, { anchor: [0.5, 0.16], rim });
  A.make('kn.fore', 10, 19, (c) => {
    c.fillStyle = steel(c, 1, 2, 9, 18); c.beginPath(); c.moveTo(1.5, 3); c.lineTo(8.5, 3); c.lineTo(7.5, 18.5); c.lineTo(2.5, 18.5); c.closePath(); c.fill();
    c.fillStyle = '#c3ccd8'; c.beginPath(); c.arc(5, 3, 3.6, 0, Math.PI * 2); c.fill(); c.fillStyle = gold; c.fillRect(2.4, 14, 5.2, 1.6);
  }, { anchor: [0.5, 0.12], rim });
  A.make('kn.hand', 9, 10, (c) => { c.fillStyle = dark; c.beginPath(); c.roundRect(0.5, 1, 8, 8.5, 3); c.fill(); c.fillStyle = '#5b6576'; c.fillRect(1.5, 2.5, 6, 1.5); c.fillRect(1.5, 5, 6, 1.2); }, { anchor: [0.5, 0.15] });
  // 腳：大腿（膝蓋護片）、小腿、鞋（腳尖朝右）
  A.make('kn.thigh', 13, 28, (c) => {
    c.fillStyle = '#3a2e2a'; c.fillRect(3, 0, 7, 26);
    c.fillStyle = steel(c, 1, 2, 12, 24); c.beginPath(); c.moveTo(2, 1); c.lineTo(11, 1); c.lineTo(10.5, 22); c.lineTo(2.5, 22); c.closePath(); c.fill();
    c.fillStyle = '#c9d1dd'; c.beginPath(); c.ellipse(7.5, 24, 4.8, 3.6, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = gold; c.beginPath(); c.arc(7.5, 24, 1.3, 0, Math.PI * 2); c.fill();
  }, { anchor: [0.5, 0.06], rim });
  A.make('kn.shin', 11, 27, (c) => {
    c.fillStyle = steel(c, 1, 0, 10, 26); c.beginPath(); c.moveTo(2, 1); c.lineTo(9.5, 1); c.quadraticCurveTo(10.5, 12, 8.5, 26); c.lineTo(3, 26); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(3, 9); c.lineTo(9.5, 9); c.stroke();
  }, { anchor: [0.5, 0.05], rim });
  A.make('kn.foot', 17, 9, (c) => {
    c.fillStyle = steel(c, 0, 0, 16, 8); c.beginPath(); c.moveTo(1, 1); c.lineTo(8, 1); c.quadraticCurveTo(14, 3, 16.5, 8); c.lineTo(1, 8.5); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 0.8; for (const x of [6, 9.5, 12.5]) { c.beginPath(); c.moveTo(x, 2); c.lineTo(x - 1, 8); c.stroke(); }
  }, { anchor: [0.3, 0.3], rim });
  // 長劍（握把在 anchor、劍尖朝右）
  A.make('kn.sword', 72, 12, (c) => {
    c.fillStyle = gold; c.beginPath(); c.arc(2.5, 6, 2.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#4a2c1c'; c.fillRect(4, 4.4, 9, 3.2); c.fillStyle = 'rgba(255,255,255,.18)'; for (let x = 5; x < 13; x += 2.2) c.fillRect(x, 4.4, 0.8, 3.2);
    c.fillStyle = gold; c.beginPath(); c.roundRect(12.5, 0.5, 3.4, 11, 1.4); c.fill();
    const g = c.createLinearGradient(0, 3.5, 0, 8.5); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#b8c6d8'); g.addColorStop(1, '#6f7e94');
    c.fillStyle = g; c.beginPath(); c.moveTo(16, 3.6); c.lineTo(62, 3.9); c.lineTo(71.5, 6); c.lineTo(62, 8.1); c.lineTo(16, 8.4); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(70,90,120,.55)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(17, 6); c.lineTo(58, 6); c.stroke();
    c.fillStyle = 'rgba(127,232,255,.55)'; c.fillRect(18, 3.6, 40, 0.8);
  }, { anchor: [0.1, 0.5] });
  // 史萊姆（果凍、亮面、眼睛）、木樁、小狐狸
  A.make('cr.slime', 42, 34, (c, w, h) => {
    const g = c.createRadialGradient(w * 0.38, h * 0.32, 2, w / 2, h * 0.6, w * 0.6); g.addColorStop(0, '#c8ffb0'); g.addColorStop(0.5, '#5fd16a'); g.addColorStop(1, '#22803c');
    c.fillStyle = g; c.beginPath(); c.moveTo(3, h - 2); c.quadraticCurveTo(2, 6, w / 2, 3); c.quadraticCurveTo(w - 2, 6, w - 3, h - 2); c.quadraticCurveTo(w / 2, h + 1, 3, h - 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.65)'; c.beginPath(); c.ellipse(13, 11, 6, 3.2, -0.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#14301a'; for (const x of [23, 31]) { c.beginPath(); c.ellipse(x, 18, 2.4, 3.4, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#fff'; for (const x of [23.8, 31.8]) { c.beginPath(); c.arc(x, 16.8, 0.9, 0, Math.PI * 2); c.fill(); }
  }, { anchor: [0.5, 0.96], outline: 1.2, outlineColor: '#0f2a16' });
  A.make('cr.dummy', 34, 74, (c, w, h) => {
    c.fillStyle = '#6a4a30'; c.fillRect(w / 2 - 3, 18, 6, h - 18); c.fillRect(2, 30, w - 4, 5);
    c.fillStyle = '#c9a46a'; c.beginPath(); c.roundRect(6, 22, w - 12, 34, 8); c.fill();
    c.strokeStyle = 'rgba(90,60,30,.5)'; c.lineWidth = 1; for (let y = 26; y < 54; y += 5) { c.beginPath(); c.moveTo(8, y); c.lineTo(w - 8, y + 1.5); c.stroke(); }
    c.fillStyle = '#d23a3a'; c.beginPath(); c.arc(w / 2, 39, 8, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f4e4c8'; c.beginPath(); c.arc(w / 2, 39, 5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#d23a3a'; c.beginPath(); c.arc(w / 2, 39, 2.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c9a46a'; c.beginPath(); c.arc(w / 2, 12, 9, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(90,60,30,.5)'; c.beginPath(); c.moveTo(w / 2 - 6, 12); c.lineTo(w / 2 + 6, 13); c.stroke();
  }, { anchor: [0.5, 0.98], rim: { color: '#ffe0a8', a: 0.5 } });
  A.make('cr.fox', 42, 30, (c, w, h) => {
    const g = c.createLinearGradient(0, 4, 0, h); g.addColorStop(0, '#f39a4a'); g.addColorStop(1, '#c75a1e');
    c.fillStyle = g; c.beginPath(); c.ellipse(19, 18, 13, 8.5, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(32, 11, 7.5, 6.5, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(30, 6); c.lineTo(31, -2); c.lineTo(35, 5); c.fill(); c.beginPath(); c.moveTo(34, 6); c.lineTo(37, -1); c.lineTo(38.5, 7); c.fill();
    c.beginPath(); c.moveTo(37, 11); c.lineTo(42, 13.5); c.lineTo(36, 15); c.fill();
    c.fillStyle = '#fff3e6'; c.beginPath(); c.ellipse(34, 15, 4.5, 3, 0.3, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(24, 22, 7, 3.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1a1010'; c.beginPath(); c.arc(41, 13.4, 1.2, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(34, 10.5, 1.2, 1.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a2016'; for (const x of [10, 15, 24, 29]) c.fillRect(x, 24, 3, 6);
  }, { anchor: [0.5, 0.98], rim: { color: '#fff0c8', a: 0.45 } });
  A.make('an.sky', 4, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b1b3a'); g.addColorStop(0.45, '#5b3a6a'); g.addColorStop(0.75, '#d4705a'); g.addColorStop(1, '#ffc27a'); c.fillStyle = g; c.fillRect(0, 0, w, h); }, { scale: 1 });
};
AN.mountains = (seed, n, amp, base) => { const R = PZ.rng(seed), pts = []; let y = 0; for (let i = 0; i <= n; i++) { y = PZ.clamp(y + R.spread(amp * 0.5), -amp, amp * 0.3); pts.push(y - R.range(0, amp * 0.6)); } return pts; };

PZ.scene('anim', {
  bg: '#1b1b3a',
  ui: () => `${Lab.bar('角色動畫', '搖桿走跑・攻擊三連段・點騎士：受傷')}
    <div class="lab-panel" data-ui>
      <div class="lab-row"><button class="lab-chip" data-chip="bones">骨架</button><button class="lab-chip" data-chip="slow">慢動作</button><button class="lab-chip" data-chip="hills">地形</button><button class="lab-chip" data-chip="cloth">披風</button><button class="lab-chip" data-chip="juice">程序動畫</button></div>
      <div class="lab-row"><button class="lab-chip cyan" data-act="die">倒下／起來</button><button class="lab-chip cyan" data-act="smash">重擊</button><button class="lab-chip cyan" data-act="cast">施法</button></div>
    </div>`,
  enter() {
    AN.art();
    const box = PZ.scenes.uiEl; Lab.bindBack(box);
    const st = this.st = { bones: false, slow: false, hills: true, cloth: true, juice: true };
    AN.hills = true;
    Lab.chips(box, st, (k, v) => { if (k === 'slow') PZ.time.scale = v ? 0.3 : 1; if (k === 'hills') AN.hills = v; });
    box.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => this.act(b.dataset.act)));
    PZ.input.bind({ jump: ['Space', 'KeyW', 'ArrowUp', 'PadA'], attack: ['KeyJ', 'Mouse0', 'PadX', 'PadRT'], heavy: ['KeyL', 'PadY'], run: ['ShiftLeft', 'ShiftRight', 'PadB', 'PadLT'] });
    // 騎士：只給部位圖，走跑跳、出招、受傷、倒下都是引擎算的
    const K = this.K = PZ.rig.humanoid({
      scale: 1.15, walkSpeed: 85, runSpeed: 240,
      parts: { head: 'kn.head', torso: 'kn.torso', pelvis: 'kn.pelvis', upper: 'kn.upper', fore: 'kn.fore', hand: 'kn.hand', thigh: 'kn.thigh', shin: 'kn.shin', foot: 'kn.foot' },
      weapon: { frame: 'kn.sword', grip: -1.2, len: 62, trail: '#bfefff' },
      cape: { n: 8, len: 7.6, off: [-6, 2], draw: { w0: 14, w1: 30, color: '#9a2234', color2: '#4a0f1a' } },
      plume: { n: 6, len: 5.5, gravity: 260, angle: 3.6, off: [-3, -27], draw: { w0: 7, w1: 2.5, color: '#e8434e', color2: '#8a1520' } },
    });
    K.ground = AN.ground;
    this.P = { x: -120, y: AN.ground(-120), vx: 0, vy: 0, grounded: true, idle: 6, combo: 0, comboT: 0, aiT: 0, aiTarget: 0 };
    K.on('hit', (kind) => this.onHit(kind));
    K.on('land', (k) => { if (k > 0.6) { PZ.particles.emit('dust', this.P.x, this.P.y, { count: 10 }); PZ.sfx.play('land', { vol: 0.4 }); } });
    this.dummies = [-420, 230, 520].map((x) => ({ x, j: PZ.juice({ breathe: 0, bob: 0, k: 300, d: 9 }) }));
    this.slimes = [[-260, 1], [80, -1], [380, 1]].map(([x, d]) => ({ x, y: AN.ground(x), vx: 0, vy: 0, dir: d, grounded: true, t: PZ.rand.range(0.5, 2), state: 'wait', j: PZ.juice({ breathe: 0.05, breatheRate: 0.7 }) }));
    const F = this.fox = { x: -200, y: AN.ground(-200), vx: 0, vy: 0, grounded: true, face: 1, j: PZ.juice({ bob: 3, step: 0.06 }) };
    F.tail = PZ.chain({ n: 7, len: 5.5, gravity: 140, stiff: 0.32, damping: 0.9, x: F.x, y: F.y });
    this.far = AN.mountains(3, 40, 60); this.mid = AN.mountains(9, 40, 90);
    if (PZ.env.touch) {
      this.stick = PZ.input.stick({ target: 'move', zone: { l: 0, t: 0.3, r: 0.5, b: 0.85 } });
      this.bA = PZ.input.button({ action: 'attack', label: '攻擊', right: 22, bottom: 190, size: 78 });
      this.bJ = PZ.input.button({ action: 'jump', label: '跳', right: 112, bottom: 150, size: 62 });
    }
    this.offTap = PZ.on('tap', (t) => { const j = this.K.joint('hip'); if (j && Math.abs(t.wx - j.x) < 40 && Math.abs(t.wy - j.y) < 70) { this.K.hurt(0, 0.9); PZ.sfx.play('hurt', { vol: 0.5 }); PZ.freeze(60); PZ.cam.shake(0.25); } });
    this.lay = () => { PZ.cam.fit(PZ.screen.portrait ? 440 : PZ.screen.h > 600 ? 560 : 400); PZ.cam.offX = Lab.shift(); };
    this.camT = { x: this.P.x, y: AN.base - 60 }; PZ.cam.follow(this.camT, { lerp: 5, lead: 0 }); this.lay(); this.offR = PZ.on('resize', this.lay);
    this.base = { grade: PZ.post.gradeName }; PZ.post.grade('warm', { time: 0, amount: 0.55 });
    PZ.music.play('drive', { intensity: 0.4, fade: 1.5 });
  },
  exit() { this.offTap(); this.offR(); PZ.input.clearTouch(); PZ.time.scale = 1; PZ.post.grade(this.base.grade, { time: 0 }); },
  act(a) {
    const K = this.K; PZ.uiSound('click');
    if (a === 'die') { if (K.dead) K.revive(); else { K.die(); PZ.sfx.play('death', { vol: 0.5 }); } }
    else if (!K.dead) K.attack(a);
    this.P.idle = 0;
  },
  onHit(kind) {
    const K = this.K, P = this.P, tip = K.tip() || { x: P.x + K.face * 60, y: P.y - 60 }, heavy = kind === 'smash', reach = heavy ? 120 : kind === 'thrust' ? 105 : 90;
    PZ.sfx.play(kind === 'cast' ? 'magic' : 'slash', { vol: 0.55 });
    if (kind === 'cast') { PZ.particles.emit('magic', tip.x, tip.y, { count: 30 }); PZ.fx.shockwave(tip.x, tip.y, { radius: 200, strength: 0.03 }); }
    let any = false;
    for (const d of this.dummies) { const dx = d.x - P.x; if (Math.sign(dx) === K.face && Math.abs(dx) < reach) { any = true; d.j.hit(heavy ? 1.3 : 0.8, K.face > 0 ? 0 : Math.PI); PZ.particles.emit('hit', d.x - K.face * 12, AN.ground(d.x) - 40, { color: '#ffd28a' }); PZ.particles.emit('debris', d.x, AN.ground(d.x) - 40, { count: 6, color: '#c9a46a' }); } }
    for (const s of this.slimes) { const dx = s.x - P.x; if (Math.sign(dx) === K.face && Math.abs(dx) < reach) { any = true; s.j.hit(1, 0); s.vx = K.face * (heavy ? 420 : 260); s.vy = heavy ? -420 : -260; s.grounded = false; s.state = 'air'; PZ.particles.emit('hit', s.x, s.y - 14, { color: '#9cff8a' }); } }
    if (any) { PZ.sfx.play(heavy ? 'hitHeavy' : 'hit', { vol: 0.6 }); PZ.freeze(heavy ? 90 : 55); PZ.cam.shake(heavy ? 0.45 : 0.18); PZ.cam.kick(K.face > 0 ? 0 : Math.PI, heavy ? 6 : 3); }
    if (heavy) { PZ.particles.emit('dust', P.x + K.face * 50, AN.ground(P.x + K.face * 50), { count: 18, scale: 1.6 }); PZ.particles.emit('shockring', P.x + K.face * 50, AN.ground(P.x + K.face * 50), { scale: 1.6 }); }
  },
  update(dt) {
    const P = this.P, K = this.K, I = PZ.input, M = I.move;
    // 輸入（閒著四秒以上就自己示範：走到木樁前打一套連段）
    let ix = M.mag > 0.15 ? M.x : 0, run = I.down('run') || Math.abs(M.x) > 0.85, wantJump = I.pressed('jump'), wantAtk = I.pressed('attack'), wantHeavy = I.pressed('heavy');
    if (ix || wantJump || wantAtk || wantHeavy) P.idle = 0; else P.idle += dt;
    if (P.idle > 4 && !K.dead) {
      P.aiT -= dt;
      const tx = this.dummies[P.aiTarget].x - Math.sign(this.dummies[P.aiTarget].x - P.x || 1) * 62, dx = tx - P.x;
      if (Math.abs(dx) > 8) { ix = Math.sign(dx); run = Math.abs(dx) > 180; if (P.grounded && Math.abs(dx) > 260 && PZ.rand.chance(dt * 0.5)) wantJump = true; }
      else { if (K.face !== Math.sign(this.dummies[P.aiTarget].x - P.x)) K.drive({ face: Math.sign(this.dummies[P.aiTarget].x - P.x) }); if (P.aiT <= 0 && !K.attacking) { wantAtk = true; P.aiHits = (P.aiHits || 0) + 1; P.aiT = 0.05; if (P.aiHits >= 3) { P.aiHits = 0; P.aiT = 1.1; P.aiTarget = (P.aiTarget + 1) % this.dummies.length; } } }
    }
    if (K.dead) ix = 0;
    const sp = run ? 240 : 85, lock = K.attacking && K.atk.t < K.atk.mv.dur * 0.6;
    P.vx = PZ.damp(P.vx, lock ? P.vx * 0.2 : ix * sp, lock ? 20 : 10, dt);
    if (wantJump && P.grounded && !K.dead) { P.vy = -470; P.grounded = false; K.jump(); PZ.sfx.play('jump', { vol: 0.4 }); }
    if ((wantAtk || wantHeavy) && !K.dead) {
      const kinds = ['slash', 'swing', 'thrust'];
      if (wantHeavy) K.attack('smash');
      else { if (P.comboT <= 0) P.combo = 0; K.attack(kinds[P.combo % 3]); P.combo++; P.comboT = 0.75; }
    }
    P.comboT -= dt;
    P.vy += 1350 * dt; P.x += P.vx * dt; P.y += P.vy * dt;
    P.x = PZ.clamp(P.x, -900, 900);
    const gy = AN.ground(P.x);
    if (P.y >= gy && P.vy >= 0) { P.y = gy; P.vy = 0; P.grounded = true; } else if (P.grounded && P.y < gy - 6) P.grounded = false; else if (P.grounded) P.y = gy;
    K.drive({ vx: P.vx, vy: P.vy, grounded: P.grounded });
    K.update(dt);
    this.camT.x = P.x + K.face * 40; this.camT.y = AN.base - 70;
    // 木樁
    for (const d of this.dummies) d.j.update(dt);
    // 史萊姆：等 → 蹲一下（預備）→ 跳 → 落地壓扁
    const J = this.st.juice;
    for (const s of this.slimes) {
      s.t -= dt;
      if (s.state === 'wait' && s.t <= 0) { s.state = 'crouch'; s.t = 0.2; if (J) s.j.land(0.5); }
      else if (s.state === 'crouch' && s.t <= 0) { s.state = 'air'; s.vy = -330; s.vx = s.dir * PZ.rand.range(70, 110); s.grounded = false; if (J) s.j.jump(0.9); }
      if (!s.grounded) { s.vy += 1100 * dt; s.x += s.vx * dt; s.y += s.vy * dt; const g = AN.ground(s.x); if (s.y >= g) { s.y = g; s.grounded = true; s.vx = 0; s.state = 'wait'; s.t = PZ.rand.range(0.8, 2.2); if (Math.abs(s.x) > 620) s.dir = -Math.sign(s.x); else if (PZ.rand.chance(0.3)) s.dir *= -1; } }
      else s.y = AN.ground(s.x);
      if (J) s.j.update(dt, { vx: s.vx, vy: s.vy, grounded: s.grounded, face: s.dir });
    }
    // 小狐狸：跟在騎士後面，跑起來一跳一跳，尾巴自己甩
    const F = this.fox, fx = P.x - K.face * 70, dxF = fx - F.x;
    F.vx = PZ.damp(F.vx, Math.abs(dxF) > 14 ? Math.sign(dxF) * Math.min(260, Math.abs(dxF) * 3) : 0, 6, dt);
    F.x += F.vx * dt; F.y = AN.ground(F.x);
    if (Math.abs(F.vx) > 10) F.face = Math.sign(F.vx); else F.face = Math.sign(P.x - F.x) || F.face;
    F.j.update(dt, { vx: F.vx, grounded: true, face: F.face });
    const pz = F.j.pose();
    F.tail.pin(F.x - F.face * 16, F.y - 13 + pz.dy, F.face > 0 ? Math.PI + 0.75 : -0.75); F.tail.update(dt);
    if (P.grounded && Math.abs(P.vx) > 200 && PZ.rand.chance(dt * 8)) PZ.particles.emit('dust', P.x - K.face * 10, P.y, { count: 2 });
  },
  render(g) {
    const v = PZ.cam.view, t = PZ.time.t;
    // 黃昏天空、太陽、兩層山（視差）
    g.rect(v.x - 10, v.y - 10, v.w + 20, v.h + 20, '#1b1b3a');
    g.sprite('an.sky', v.x + v.w / 2, -130, { sx: (v.w + 40) / 4, sy: 600 / 256 });
    const sx = PZ.cam.x * 0.92 + 260; g.glow(sx, -40, 220, '#ffb070', { a: 0.5 }); g.circle(sx, -40, 34, '#ffe2a8');
    for (const [pts, px, col, y0, step] of [[this.far, 0.82, '#3d2a52', 0, 70], [this.mid, 0.6, '#2b1f3c', 30, 60]]) {
      const ox = PZ.cam.x * px - pts.length * step / 2;
      for (let i = 0; i < pts.length - 1; i++) { const x0 = ox + i * step, x1 = x0 + step; if (x1 < v.x - 10 || x0 > v.x + v.w + 10) continue; g.poly([x0, y0 + pts[i], x1, y0 + pts[i + 1], x1, AN.base + 40, x0, AN.base + 40], col); }
    }
    // 地面（草地）
    const st = 10, gx0 = Math.floor(v.x / st) * st - st;
    for (let x = gx0; x < v.x + v.w + st; x += st) { const y0 = AN.ground(x), y1 = AN.ground(x + st); g.poly([x, y0, x + st, y1, x + st, v.y + v.h + 20, x, v.y + v.h + 20], '#3b4a2a'); g.poly([x, y0 - 1, x + st, y1 - 1, x + st, y1 + 7, x, y0 + 7], '#7da54a'); }
    for (let x = Math.floor(v.x / 23) * 23; x < v.x + v.w; x += 23) { const y = AN.ground(x), sw = Math.sin(t * 2 + x * 0.05) * 2.5; g.line(x, y + 2, x + sw - 3, y - 8, 1.6, '#9fcf5a'); g.line(x + 3, y + 2, x + 4 + sw, y - 10, 1.6, '#86b84c'); }
    // 木樁
    for (const d of this.dummies) {
      const y = AN.ground(d.x);
      g.ellipse(d.x, y + 1, 18, 4, 'rgba(0,0,0,.3)');
      if (this.st.juice) d.j.draw(g, 'cr.dummy', d.x, y + 2, { s: 1.1 }); else g.sprite('cr.dummy', d.x, y + 2, { s: 1.1 });
    }
    // 史萊姆
    for (const s of this.slimes) { const gy = AN.ground(s.x); g.ellipse(s.x, gy + 1, 16 * PZ.clamp(1 - (gy - s.y) / 200, 0.4, 1), 4, 'rgba(0,0,0,.3)'); if (this.st.juice) s.j.draw(g, 'cr.slime', s.x, s.y + 1); else g.sprite('cr.slime', s.x, s.y + 1, { sx: s.dir < 0 ? -1 : 1 }); }
    // 小狐狸（尾巴是鏈子）
    const F = this.fox; g.ellipse(F.x, F.y + 1, 16, 3.5, 'rgba(0,0,0,.3)');
    g.chain(F.tail, { w0: 10, w1: 6, color: '#e2712c', color2: '#fff1e0' }); F.j.draw(g, 'cr.fox', F.x, F.y + 1);
    // 騎士＋貼地的影子
    const K = this.K, P = this.P;
    g.rigShadow(K, P.x, AN.ground(P.x), { angle: 0.2, a: 0.32 });
    if (this.st.cloth) g.rig(K, P.x, P.y, { bones: this.st.bones });
    else { const ch = K.chains; K.chains = []; g.rig(K, P.x, P.y, { bones: this.st.bones }); K.chains = ch; }
    PZ.particles.draw(g, 'under');
  },
});
