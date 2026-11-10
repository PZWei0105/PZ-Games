/* ───────────── 展示場：每種小兵、每個動作排一排（開發與截圖檢查用，網址加 #show） ───────────── */
SCENES.show = {
  units: [], mode: '',
  enter(arg) {
    this.mode = arg.replace(/^[=:]/, '') || 'soldiers';
    this.units = []; this.vehs = [];
    if (this.mode === 'veh') return this.enterVeh();
    const pals = ['us', 'red', 'kaz', 'holder', 'ilya', 'severin'];
    const cols = [
      { wk: 'ar', st: 'stand' }, { wk: 'ar', st: 'stand', walk: 26 }, { wk: 'ar', st: 'stand', walk: 60 },
      { wk: 'ar', st: 'kneel', fire: 0.28 }, { wk: 'ar', st: 'stand', fire: 0.35 }, { wk: 'ar', st: 'kneel', act: 'reload' },
      { wk: 'ar', st: 'stand', act: 'throw' }, { wk: 'mg', st: 'prone', fire: 0.09 }, { wk: 'rpg', st: 'kneel', fire: 2.6 },
      { wk: 'sr', st: 'prone', fire: 1.6, act2: 'bolt' }, { wk: 'ft', st: 'stand', fire: 0.05 }, { wk: 'ar', st: 'stand', act: 'cheer' },
      { wk: 'ar', st: 'stand', die: 'shot' }, { wk: 'ar', st: 'stand', die: 'blast' },
    ];
    pals.forEach((pal, row) => {
      cols.forEach((c, col) => {
        const u = { x: 40 + col * 72, y: 70 + row * 78, face: 1, cfg: c, home: 40 + col * 72 };
        newSoldierAnim(u, pal, c.wk);
        setStance(u, c.st); u.stb = 1; u.st0 = c.st;
        if (c.fire) { u.wantAim = true; u.aimTA = -0.05; u.aimA = -0.05; u.aimB = 1; }
        u.timer = rnd(0, 0.3);
        this.units.push(u);
      });
    });
    CAM.z = 1.4; CAM.x = 40 + 6.5 * 72; CAM.y = 70 + 2.6 * 78;
  },
  enterVeh() {
    const mk = (vk, pal, x, y, o) => { const u = Object.assign({ x, y, face: 1 }, o || {}); newVehAnim(u, vk, pal); this.vehs.push(u); return u; };
    mk('tank', 'us', 80, 120, { drive: 30 }); mk('tank', 'holder', 260, 120, { fireT: 1.2, face: -1 });
    mk('apc', 'us', 430, 120, { rampLoop: true }); mk('aa', 'ilya', 600, 120, { aaFire: true });
    mk('truck', 'us', 80, 240, { mlrs: true }); mk('heli', 'us', 270, 190, { hover: true }); mk('heli', 'ilya', 470, 190, { hover: true, face: -1 });
    const w = mk('tank', 'kaz', 620, 250, {}); w.wreck = true;
    CAM.z = 1.5; CAM.x = 350; CAM.y = 170;
  },
  update(dt) {
    for (const u of this.vehs) {
      u.t = (u.t || 0) + dt;
      if (u.drive) { u.vx = Math.sin(u.t * 0.8) > 0 ? u.drive : 0; }
      if (u.fireT) { u.ft = (u.ft || 0) - dt; u.aimTA = 0.06; if (u.ft <= 0) { u.ft = u.fireT; u.recoil = 1; u.antV += 3; const m = vehMuzzle(u); P('flash', m[0], m[1], { rot: m[2], max: 0.08, size: 1.6, spr: FXS.mf1 }); P('glow', m[0], m[1], { max: 0.15, size: 1.2, spr: FXS.gO, add: true }); for (let i = 0; i < 8; i++) P('smoke', m[0], m[1], { vx: Math.cos(m[2]) * rnd(20, 90) + rnd(-20, 20), vy: rnd(-30, 10), drag: 2, max: rnd(0.8, 1.6), size: 0.22, grow: 0.7, alpha: 0.7, spr: FXS.smoke }); } }
      if (u.rampLoop) u.ramp = clamp(Math.sin(u.t * 0.9) * 1.4, 0, 1);
      if (u.aaFire) { u.aimTA = 0.7; u.ft = (u.ft || 0) - dt; if (u.ft <= 0) { u.ft = 0.09; u.gunSide = 1 - u.gunSide; u.recoil = 1; const m = vehMuzzle(u, u.gunSide); P('flash', m[0], m[1], { rot: m[2], max: 0.05, size: 0.7, spr: FXS.mf0 }); } }
      if (u.mlrs) { u.jacks = clamp(Math.sin(u.t * 0.5) * 2, 0, 1); u.pod = u.jacks; }
      if (u.hover) { u.y = 190 + Math.sin(u.t * 1.6) * 4; u.vx = Math.sin(u.t * 0.6) * 40; u.aimTA = 0.25; }
      animVeh(u, dt);
    }
    for (const u of this.units) {
      const c = u.cfg;
      u.timer -= dt;
      if (c.walk) { u.vx = c.walk; u.x += c.walk * dt * 0.0; }
      if (c.fire && u.timer <= 0 && !u.act) {
        u.timer = c.fire; u.rec = 1; setExpr(u, chance(0.3) ? 's' : 'f', 0.4);
        if (typeof fxMuzzle === 'function') fxMuzzle(u);
        if (c.wk === 'rpg') { u.warhead = false; startReload(u); }
        if (c.act2 === 'bolt') startReload(u);
      }
      if (c.act && !u.act && u.timer <= 0) {
        u.timer = 0.6;
        if (c.act === 'reload') startReload(u);
        else if (c.act === 'throw') startThrow(u, u.x + 120, u.y);
        else if (c.act === 'cheer') startCheer(u, 2);
      }
      if (c.die) {
        if (!u.death && u.timer <= 0) { killSoldier(u, c.die, -1, 1); }
        if (u.gone || (u.death && u.death.t > 4)) { const keep = { x: u.home, y: u.y, face: 1, cfg: c, home: u.home }; Object.keys(u).forEach((k) => delete u[k]); Object.assign(u, keep); newSoldierAnim(u, keep.pal || u.pal || 'us', c.wk); }
      }
      animSoldier(u, dt);
      soldierRig(u);
    }
    if (typeof updateFx === 'function') updateFx(dt);
  },
  render(c) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#dfe6ee'; c.fillRect(0, 0, cv.width, cv.height);
    applyCam(c);
    c.lineJoin = 'round'; c.lineCap = 'round';
    for (let row = 0; row < 6; row++) {
      c.fillStyle = 'rgba(0,0,0,.06)'; c.fillRect(0, 70 + row * 78 - 1, 1100, 2);
    }
    for (const u of this.units) { c.fillStyle = 'rgba(30,40,60,.22)'; c.beginPath(); c.ellipse(u.x + (u.death ? u.death.ox || 0 : 0), u.y, 11, 2.6, 0, 0, TAU); c.fill(); }
    for (const u of this.vehs) { c.fillStyle = 'rgba(30,40,60,.22)'; c.beginPath(); c.ellipse(u.x, u.vk === 'heli' ? 250 : u.y, 46, 6, 0, 0, TAU); c.fill(); }
    if (typeof drawFx === 'function') drawFx(c, 0);
    for (const u of this.vehs) drawVehicle(c, u);
    for (const u of this.units) drawSoldier(c, u);
    if (typeof drawFx === 'function') drawFx(c, 1);
  },
};
window.__show = {
  step(sec, n) { G.freeze = true; const k = n || Math.ceil(sec * 60); for (let i = 0; i < k; i++) { G.t += sec / k; SCENES[G.scene].update(sec / k); } SCENES[G.scene].render(ctx); },
  cam(x, y, z) { G.freeze = true; CAM.x = x; CAM.y = y; CAM.z = z; SCENES[G.scene].render(ctx); },
};

/* 圖示：一個小兵在雪地上把綠旗升起來 */
SCENES.icon = {
  enter() { G.scene = 'icon'; this.u = { x: 0, y: 0, face: 1 }; newSoldierAnim(this.u, 'us', 'ar'); startRaise(this.u, 9, 99); this.u.act.t = 0.35; soldierRig(this.u); },
  update() {},
  render(c) {
    const S = Math.min(VIEW.w, VIEW.h), dpr = VIEW.dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, S); g.addColorStop(0, '#1b2a3c'); g.addColorStop(0.6, '#3e5a6e'); g.addColorStop(1, '#9fb6c9'); c.fillStyle = g; c.fillRect(0, 0, VIEW.w, VIEW.h);
    c.fillStyle = 'rgba(255,255,255,.08)'; c.beginPath(); c.arc(S * 0.72, S * 0.28, S * 0.2, 0, TAU); c.fill();
    c.fillStyle = '#5a6e7c'; c.beginPath(); c.moveTo(0, S * 0.7); for (let x = 0; x <= S; x += S / 10) c.lineTo(x, S * (0.6 + 0.07 * Math.sin(x * 0.03))); c.lineTo(S, S); c.lineTo(0, S); c.fill();
    c.fillStyle = '#e8eef3'; c.beginPath(); c.ellipse(S * 0.5, S * 1.02, S * 0.9, S * 0.3, 0, 0, TAU); c.fill();
    const k = S / 120;
    c.save(); c.translate(S * 0.4, S * 0.88); c.scale(k, k); c.lineJoin = 'round'; c.lineCap = 'round';
    // 旗桿＋旗子
    c.strokeStyle = OUT; c.lineWidth = 3.4; c.beginPath(); c.moveTo(14, 0); c.lineTo(14, -84); c.stroke(); c.strokeStyle = '#c9ccd2'; c.lineWidth = 1.6; c.stroke();
    dot(c, 14, -85, 2.4, '#e0c060');
    c.save(); c.translate(14, -82);
    const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([t * 46, Math.sin(1.2 - t * 3.2) * 4 * t]); }
    c.beginPath(); c.moveTo(0, 0); for (const q of pts) c.lineTo(q[0], q[1]); for (let i = 6; i >= 0; i--) c.lineTo(pts[i][0], pts[i][1] + 28); c.closePath();
    c.fillStyle = PAL.us.flagA; c.fill(); c.lineWidth = OW; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = PAL.us.flagB; c.beginPath(); c.moveTo(18, 22); c.lineTo(24, 6); c.lineTo(30, 22); c.closePath(); c.fill();
    c.restore();
    c.fillStyle = 'rgba(40,52,72,.25)'; c.beginPath(); c.ellipse(4, 1, 22, 4, 0, 0, TAU); c.fill();
    this.u.x = 0; this.u.y = 0; drawSoldier(c, this.u);
    c.restore();
  },
};
window.__icon = () => { G.freeze = true; SCENES.icon.enter(); SCENES.icon.render(ctx); };
