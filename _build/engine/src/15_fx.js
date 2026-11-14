/* ==========================================================================
   15 手感特效（打擊感）
   一行就有完整的打擊感：
     PZ.fx.hit(x, y, { power: 0.6, dir: 角度, crit: true, kill: false, sound: 'hit' })
       → 打擊停頓 + 震屏 + 鏡頭頓一下 + 火花 + （爆擊）閃光、色差、星芒 + 手機震動 + 音效
     PZ.fx.explode(x, y, { power: 1, radius: 120 })   爆炸：衝擊波扭曲、閃白、火球、碎片、煙
     PZ.fx.number(x, y, 128, { crit: true })          傷害數字（跳出來、彈一下、淡出）
     PZ.fx.hurt(0.5)    主角受傷：紅色暗角、色差、震動
   單項：shake / kick / punch / freeze / slowmo / flash / shockwave / chroma / vignette / text / haptic / rumble
   設定裡「畫面震動」「閃光」「傷害數字」會自動套用（照顧怕暈、怕閃的人）。
   ========================================================================== */
const Fx = PZ.fx = {
  nums: [], _vig: null, _chroma: 0, _chromaT: 0, _chromaD: 0, _flashT: 0, _flashD: 0, _flashA: 0, _waves: [],
  numStyle: { size: 18, weight: 900, color: '#fff', outline: 3, outlineColor: 'rgba(0,0,0,.85)', align: 'center', baseline: 'middle' },
  critStyle: { size: 26, weight: 900, color: '#ffd84a', outline: 4, outlineColor: '#3a0a00', align: 'center', baseline: 'middle' },
  healStyle: { size: 18, weight: 900, color: '#7dffa8', outline: 3, outlineColor: 'rgba(0,40,20,.9)', align: 'center', baseline: 'middle' },
};
Fx.shake = (t) => Cam.shake(t);
Fx.kick = (angle, px) => Cam.kick(angle, px);
Fx.punch = (z) => Cam.punch(z);
Fx.freeze = (ms) => PZ.freeze(ms);
Fx.slowmo = (s, sec, back) => PZ.slowmo(s, sec, back);
Fx.haptic = (k) => Haptics.tap(k);
Fx.rumble = (s, w, ms) => Input.rumble(s, w, ms);
/** 全畫面閃一下：color、強度 a（0～1）、秒數 */
Fx.flash = (color = '#fff', a = 0.5, dur = 0.12) => {
  const c = toColor(color); Post.flash[0] = cR(c) / 255; Post.flash[1] = cG(c) / 255; Post.flash[2] = cB(c) / 255;
  Fx._flashA = Math.max(Fx._flashA * (Fx._flashD > 0 ? 1 - Fx._flashT / Fx._flashD : 0), a); Fx._flashT = 0; Fx._flashD = dur;
};
/** 色差（爆擊、受傷）：amount 約 0.006～0.02 */
Fx.chroma = (amount = 0.012, dur = 0.25) => { Fx._chroma = Math.max(Fx._chroma, amount); Fx._chromaT = 0; Fx._chromaD = dur; };
/** 暗角脈衝：受傷變紅、低血量 */
Fx.vignette = (color = '#a00010', amount = 0.6, dur = 0.5) => { const base = Fx._vig ? Fx._vig.base : null; Fx._vig = { color: toColor(color), amount, dur, t: 0, base }; };
/** 衝擊波扭曲（世界座標）：strength 0.01～0.05、radius 擴散到多大（世界單位） */
Fx.shockwave = (x, y, o = {}) => {
  if (!Post.enabled) return;
  Fx._waves.push({ x, y, t: 0, dur: o.dur || 0.55, radius: o.radius || 260, strength: o.strength != null ? o.strength : 0.03, thick: o.thick || 50 });
  if (Fx._waves.length > 4) Fx._waves.shift();
};
/** 跳出文字（世界座標） */
Fx.text = (x, y, str, style, o = {}) => {
  const n = { x, y, vx: o.vx != null ? o.vx : Rand.spread(20), vy: o.vy != null ? o.vy : -70, t: 0, life: o.life || 0.9, str: String(str), st: style || Fx.numStyle, pop: o.pop != null ? o.pop : 1, grav: o.grav != null ? o.grav : 120 };
  Fx.nums.push(n); if (Fx.nums.length > 160) Fx.nums.shift();
  return n;
};
/** 傷害數字：o { crit, heal, color, size, miss } */
Fx.number = (x, y, value, o = {}) => {
  if (!Settings.get('numbers')) return null;
  const st = o.heal ? Fx.healStyle : o.crit ? Fx.critStyle : Fx.numStyle;
  const style = (o.color || o.size) ? Object.assign({}, st, o.color ? { color: o.color } : null, o.size ? { size: o.size } : null) : st;
  const txt = o.miss ? 'MISS' : (o.heal ? '+' : '') + (typeof value === 'number' ? Math.round(value) : value) + (o.crit ? '!' : '');
  return Fx.text(x, y, txt, style, { vy: o.crit ? -110 : -80, life: o.crit ? 1.05 : 0.8, pop: o.crit ? 1.6 : 1.15 });
};

/** 一次完整的「打中了」 */
Fx.hit = (x, y, o = {}) => {
  const p = clamp01(o.power != null ? o.power : 0.4), dir = o.dir != null ? o.dir : Rand.angle(), crit = !!o.crit, kill = !!o.kill;
  const fz = o.freeze != null ? o.freeze : Math.min(140, 18 + p * 50 + (crit ? 40 : 0) + (kill ? 45 : 0));
  if (fz > 0) PZ.freeze(fz);
  Cam.shake(o.shake != null ? o.shake : 0.06 + p * 0.22 + (crit ? 0.14 : 0) + (kill ? 0.1 : 0));
  Cam.kick(dir, 2 + p * 7 + (crit ? 4 : 0));
  const col = o.color;
  Particles.emit('hit', x, y, { angle: dir, scale: 0.8 + p * 0.6, colors: col ? ['#fff', col, Color.alpha(col, 0)] : undefined });
  if (p > 0.45 || crit) Particles.emit('sparks', x, y, { angle: dir, count: Math.round(4 + p * 10), scale: 0.8 + p * 0.5 });
  if (crit) { Particles.emit('flare', x, y, { scale: 1 + p }); Particles.emit('ring', x, y, { scale: 0.8 + p }); Fx.chroma(0.008 + p * 0.008, 0.22); Cam.punch(0.025 + p * 0.02); }
  if (kill) { Particles.emit('ring', x, y, { scale: 0.7 + p * 0.6 }); }
  if (o.blood) Particles.emit('blood', x, y, { angle: dir, scale: 0.8 + p * 0.5, colors: o.blood === true ? undefined : [o.blood, Color.darken(o.blood, 0.5), Color.alpha(o.blood, 0)] });
  if (crit || kill || p > 0.7) Fx.flash('#fff', 0.06 + p * 0.08 + (crit ? 0.06 : 0), 0.07);
  Haptics.tap(crit || kill ? 'medium' : p > 0.6 ? 'medium' : 'light');
  Input.rumble(0.2 + p * 0.6, 0.3 + p * 0.4, 60 + p * 80);
  if (o.sound !== false) { const s = o.sound || 'hit'; if (Sfx.has(s)) Sfx.at(s, x, y, { pitch: 1.08 - p * 0.18 + Rand.spread(0.06), vol: 0.75 + p * 0.35 }); if (crit && Sfx.has('crit')) Sfx.at('crit', x, y); if (kill && Sfx.has('kill')) Sfx.at('kill', x, y, { vol: 0.8 }); }
};
/** 爆炸 */
Fx.explode = (x, y, o = {}) => {
  const p = clamp01(o.power != null ? o.power : 0.8), rad = o.radius || 120;
  PZ.freeze(o.freeze != null ? o.freeze : 40 + p * 70);
  Cam.shake(0.3 + p * 0.5); Cam.punch(0.03 + p * 0.04);
  Fx.shockwave(x, y, { radius: rad * 2.4, strength: 0.018 + p * 0.025, dur: 0.5 + p * 0.2 });
  Fx.flash(o.flashColor || '#fff2d8', 0.18 + p * 0.25, 0.1 + p * 0.06);
  Fx.chroma(0.008 + p * 0.01, 0.3);
  Particles.emit('explosion', x, y, { scale: (0.6 + p * 0.8) * (rad / 120), colors: o.colors });
  Haptics.tap('heavy'); Input.rumble(1, 0.8, 220);
  if (o.sound !== false) { const s = o.sound || 'explosion'; if (Sfx.has(s)) Sfx.at(s, x, y, { vol: 0.8 + p * 0.3, pitch: 1.1 - p * 0.25 }); }
};
/** 主角受傷 */
Fx.hurt = (amount = 0.5, o = {}) => {
  const a = clamp01(amount);
  // 紅暗角要短、要淡：被一群怪連續咬時才不會整個畫面一直是紅的（o.vignette: false 不要暗角）
  if (o.vignette !== false) Fx.vignette(o.color || '#b0001a', 0.28 + a * 0.3, 0.25 + a * 0.25);
  Fx.chroma(0.006 + a * 0.012, 0.25); Cam.shake(0.18 + a * 0.35);
  if (o.dir != null) Cam.kick(o.dir, 4 + a * 8);
  PZ.freeze(o.freeze != null ? o.freeze : 25 + a * 50);
  Haptics.tap(a > 0.5 ? 'heavy' : 'medium'); Input.rumble(0.6 + a * 0.4, 0.5, 140);
  if (o.sound !== false) { const s = o.sound || 'hurt'; if (Sfx.has(s)) Sfx.play(s, { pitch: 1 - a * 0.15 }); }
};
/** 撿到東西 */
Fx.pickup = (x, y, o = {}) => { Particles.emit('pickup', x, y, { colors: o.color ? ['#fff', o.color, Color.alpha(o.color, 0)] : undefined }); if (o.sound !== false) { const s = o.sound || 'pickup'; if (Sfx.has(s)) Sfx.at(s, x, y, { pitch: o.pitch || 1 }); } };
/** 升級、過關的慶祝 */
Fx.celebrate = (x, y, o = {}) => {
  Particles.emit('confetti', x, y, { scale: o.scale || 1 }); Particles.emit('flare', x, y, { scale: 2 }); Particles.emit('shockring', x, y, { scale: 1.5 });
  Fx.flash('#fff', 0.35, 0.18); Cam.punch(0.05); Haptics.tap('success');
  if (o.sound !== false) { const s = o.sound || 'levelup'; if (Sfx.has(s)) Sfx.play(s); }
};

/** 畫傷害數字與跳字（世界座標）；場景沒畫的話 g.hud() 前會自動畫 */
Fx.drawNumbers = (g) => {
  Fx._numsDrawn = true;
  for (const n of Fx.nums) {
    const k = n.t / n.life, popT = Math.min(1, n.t / 0.16);
    const s = (n.pop > 1 ? lerp(n.pop, 1, Ease.outBack(popT)) : 1) * (k > 0.75 ? lerp(1, 0.7, (k - 0.75) / 0.25) : 1);
    const a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    g.save(); g.translate(n.x, n.y); g.scale(s, s); g.alpha(a);
    g.text(n.str, 0, 0, n.st);
    g.restore();
  }
};
/** g.hud() 會呼叫：場景沒自己畫的粒子（over 層）與數字，在這裡補畫 */
Fx._drawAuto = (g) => {
  if (g.space !== 'world') g.world();
  if (!Particles.drawn[1]) Particles.draw(g, 'over');
  if (!Fx._numsDrawn) Fx.drawNumbers(g);
};
addSystem({
  name: 'fx', order: 70,
  update(dt) {
    for (let i = 0; i < Fx.nums.length; i++) { const n = Fx.nums[i]; n.t += dt; n.vy += n.grav * dt; n.x += n.vx * dt; n.y += n.vy * dt; n.vx *= Math.exp(-3 * dt); if (n.t >= n.life) { Fx.nums.splice(i--, 1); } }
  },
  frame(rdt) {
    // 閃光、色差、暗角、衝擊波用真實時間：打擊停頓時照樣在變化
    if (Fx._flashD > 0) { Fx._flashT += rdt; const k = clamp01(Fx._flashT / Fx._flashD); Post.flash[3] = Fx._flashA * (1 - Ease.outQuad(k)); if (k >= 1) { Fx._flashD = 0; Fx._flashA = 0; Post.flash[3] = 0; } }
    if (Fx._chromaD > 0) { Fx._chromaT += rdt; const k = clamp01(Fx._chromaT / Fx._chromaD); Post.chroma = Fx._chroma * (1 - k); if (k >= 1) { Fx._chromaD = 0; Fx._chroma = 0; Post.chroma = 0; } }
    const v = Fx._vig;
    if (v) {
      if (!v.base) v.base = { vig: Post.vignette, col: Post.vignetteColor };
      v.t += rdt; const k = clamp01(v.t / v.dur), e = Math.sin(Math.min(1, k * 4) * Math.PI / 2) * (1 - Ease.inQuad(k));
      Post.vignette = lerp(v.base.vig, Math.max(v.base.vig, v.amount), e); Post.vignetteColor = Color.css(Color.mix(toColor(v.base.col), v.color, e));
      if (k >= 1) { Post.vignette = v.base.vig; Post.vignetteColor = v.base.col; Fx._vig = null; }
    }
    Post.waves.length = 0;
    for (let i = 0; i < Fx._waves.length; i++) {
      const w = Fx._waves[i]; w.t += rdt; const k = w.t / w.dur;
      if (k >= 1) { Fx._waves.splice(i--, 1); continue; }
      const z = Cam.ez || 1;
      Post.waves.push({ x: Cam.toScreenX(w.x, w.y), y: Cam.toScreenY(w.x, w.y), r: w.radius * Ease.outCubic(k) * z, strength: w.strength * (1 - k) * Settings.get('shake'), thick: w.thick * z * (1 - k * 0.5) });
    }
  },
  render() { Particles.drawn[0] = Particles.drawn[1] = false; Fx._numsDrawn = false; },
});
