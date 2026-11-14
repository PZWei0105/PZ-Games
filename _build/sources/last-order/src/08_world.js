/* ===== 遊戲主體：迴圈、繪製、HUD、升級、成就 ===== */
const VC = { cv: null, ctx: null, w: 320, h: 200, light: null, lctx: null, sc: 1 };
let G = null;
const RAIN = [];
const DRAW = [];
const SHADOWS = {};

function resizeView() {
  const cw = PZ.screen.w || innerWidth, ch = PZ.screen.h || innerHeight;
  let s = Math.sqrt(cw * ch / 92000); s = Math.min(s, Math.min(cw, ch) / 190); s = Math.max(1, s);
  VC.w = Math.max(160, Math.round(cw / s)); VC.h = Math.max(160, Math.round(ch / s));
  VC.cv.width = VC.w; VC.cv.height = VC.h; VC.ctx.imageSmoothingEnabled = false;
  VC.light.width = VC.w; VC.light.height = VC.h;
  RAIN.length = 0;
  const n = Math.round(VC.w * VC.h / 850);
  for (let i = 0; i < n; i++) RAIN.push({ x: rand(-30, VC.w), y: rand(VC.h), v: rand(240, 340), l: randi(3, 6) });
}

/* ---------- 開局 ---------- */
function beginPlay(chId, opt) {
  opt = opt || {};
  const ch = CHAPTERS[chId];
  const map = ch.build();
  G = {
    chId, ch, map, t: 0, p: null, zs: [], bullets: [], eproj: [], zones: [], teles: [], parts: [], pops: [], pickups: [], hazards: [], pend: [], booms: [], later: [], dl: [], allies: [], tracers: [], markers: [],
    cam: { x: 0, y: 0 }, cx: 0, cy: 0, shake: 0, slow: 1, hitStop: 0, state: 'play', kills: 0, runKills: 0, batKills: 0, fireKills: 0, combo: 0, comboT: 0, maxCombo: 0, dmgTaken: 0,
    zid: 0, pendingLv: 0, lvDelay: 0, rerolls: 1, flags: {}, phase: 'start', spawn: { rate: 0, mix: { walker: 1 } }, spawnAcc: 0, maxZ: IS_TOUCH ? 150 : 190,
    hpMul: ch.hpMul || 1, dmgMul: ch.dmgMul || 1, spdMul: 1, skins: ch.skins, dark: ch.dark, ambient: ch.ambient, rain: ch.rain, flowT: 0, ftx: -1, fty: -1,
    flash: 0, lightT: rand(8, 16), boss: null, bossDead: false, objPt: null, objR: 26, objBias: 0, obj: { text: '', sub: '', prog: null }, lowLine: ch.lowLine, hype: 0, won: false,
    endless: !!ch.endless, fromStory: !!opt.fromStory, power: false, newAch: []
  };
  const p = newPlayer(ch.start[0] * T, ch.start[1] * T); G.p = p;
  for (const gid of ch.guns) giveGun(p, gid, true);
  p.gi = 0;
  if (map.hz) for (const [tx, ty] of map.hz) makeHazard(tx, ty, ch.hazKind || 'drum');
  G.cam.x = p.x; G.cam.y = p.y - 8;
  Grid.init(map);
  flowField(map, [[(p.x / T) | 0, (p.y / T) | 0]], map.dist);
  HUD.reset(); HUD.buildSlots();
  ch.init(G);
  App.go('play');
  Sound.startAmb(ch.sound); Scene.amb = null;
  if (ch.picks > 0) { G.pendingLv = ch.picks; G.pickIntro = ch.picks; G.lvDelay = 0.5; }
  if (!Save.d.tut) showHint();
}
function commitStats() {
  if (!G) return;
  const s = Save.d.st;
  s.kills += G.runKills; s.bat += G.batKills; s.fire += G.fireKills; s.combo = Math.max(s.combo, G.maxCombo);
  G.runKills = 0; G.batKills = 0; G.fireKills = 0;
  Save.save();
}
function playerDie() {
  if (!G || G.state !== 'play') return;
  G.state = 'dying'; G.deadT = 1.5; G.slow = 0.25;
  Save.d.st.deaths++;
  if (G.endless && G.t > Save.d.endless) Save.d.endless = Math.floor(G.t);
  commitStats(); checkAch();
  Sound.play('hurt'); Input.endJoy();
}
function chapterClear() {
  if (!G || G.won || G.state !== 'play') return;
  G.won = true; G.state = 'clearing'; G.clearT = 1.8; G.slow = 0.4;
  const id = G.chId;
  Save.d.cleared[id] = true; Save.d.unlocked = Math.max(Save.d.unlocked, id + 1); Save.d.endlessOpen = true;
  const b = Save.d.best[id]; if (!b || G.t < b) Save.d.best[id] = Math.floor(G.t);
  if (G.dmgTaken < 30) unlockAch('clean');
  commitStats(); checkAch(); Save.save();
  Input.endJoy();
}
function spawnTick(dt) {
  const s = G.spawn; if (!s || s.rate <= 0 || G.state !== 'play') return;
  G.spawnAcc += s.rate * dt;
  while (G.spawnAcc >= 1) { G.spawnAcc -= 1; if (G.zs.length >= G.maxZ) { G.spawnAcc = 0; break; } spawnZombie(wpick(s.mix)); }
}
function once(g, k, cond, fn) { if (cond && !g.flags[k]) { g.flags[k] = 1; fn(); } }
function setObj(text, sub, prog) { G.obj.text = text; G.obj.sub = sub || ''; G.obj.prog = prog; }
function updateAllies(dt) {
  for (const a of G.allies) {
    const p = G.p, tx = p.x - p.face * 18, ty = p.y + 5, dx = tx - a.x, dy = ty - a.y, dd = Math.hypot(dx, dy);
    if (dd > 5) { const sp = Math.min(75, dd * 3.2); a.x += dx / dd * sp * dt; a.y += dy / dd * sp * dt; a.an += dt * 8; }
    collideCircle(G.map, a);
    a.cd -= dt;
    if (a.cd <= 0) {
      let best = null, bd = 135 * 135;
      for (const z of G.zs) { if (z.dead || z.air) continue; const d = d2(z.x, z.y, a.x, a.y); if (d < bd) { bd = d; best = z; } }
      if (best) {
        a.cd = 0.55; const ang = Math.atan2(best.y - best.hh - (a.y - 7), best.x - a.x); a.face = Math.cos(ang) >= 0 ? 1 : -1; a.aim = ang;
        G.bullets.push({ x: a.x + Math.cos(ang) * 8, y: a.y - 7 + Math.sin(ang) * 8, vx: Math.cos(ang) * 360, vy: Math.sin(ang) * 360, spd: 360, dmg: 12 * (1 + G.t / 240), pierce: 0, range: 160, dist: 0, hit: [], kb: 30, col: '#9fe0ff' });
        Sound.play('pistol'); G.dl.push({ x: a.x, y: a.y - 7, r: 36, i: 0.7, life: 0.05, max: 0.05 }); a.mz = 0.05;
      } else a.cd = 0.2;
    }
    if (a.mz > 0) a.mz -= dt;
  }
}

/* ---------- 每一步更新 ---------- */
function update(dt) {
  const g = G;
  if (g.hitStop > 0) { g.hitStop -= dt; return; }
  if (g.state === 'dying') { g.deadT -= dt; if (g.deadT <= 0) { g.state = 'dead'; UI.showDead(); return; } }
  if (g.state === 'clearing') { g.clearT -= dt; if (g.clearT <= 0) { g.state = 'clear'; UI.showClear(); return; } }
  const sdt = dt * g.slow; g.slow = Math.min(1, g.slow + dt * 1.1);
  g.t += sdt;
  const p = g.p, m = g.map;
  const ptx = (p.x / T) | 0, pty = (p.y / T) | 0;
  g.flowT -= sdt;
  if ((ptx !== g.ftx || pty !== g.fty) && g.flowT <= 0) { flowField(m, [[ptx, pty]], m.dist); g.ftx = ptx; g.fty = pty; g.flowT = 0.12; }
  if (g.state === 'play') { updatePlayer(sdt); g.ch.update(g, sdt); }
  spawnTick(sdt);
  for (let i = g.pend.length - 1; i >= 0; i--) {
    const q = g.pend[i]; q.t -= sdt;
    if (q.t <= 0) {
      g.pend.splice(i, 1);
      let pos;
      if (q.base) { const x = q.base.x * T + rand(-12, 12), y = q.base.y * T + rand(-12, 12); if (!isSolid(m, (x / T) | 0, (y / T) | 0)) pos = [x, y]; }
      spawnZombie(q.type, Object.assign({ force: g.zs.length < g.maxZ + 40, pos, ring: !q.base }, q.o));
    }
  }
  for (const z of g.zs) if (!z.dead) updateZombie(z, sdt);
  Grid.clear(); for (const z of g.zs) if (!z.dead) Grid.add(z);
  separate();
  updateBullets(sdt); updateEProj(sdt); updateZones(sdt); updateHazards(sdt); updatePickups(sdt);
  for (let i = g.booms.length - 1; i >= 0; i--) { const b = g.booms[i]; b.t -= sdt; if (b.t <= 0) { g.booms.splice(i, 1); explodeAt(b.x, b.y, b.r, b.dz, b.dp, b.src); } }
  for (let i = g.later.length - 1; i >= 0; i--) { const l = g.later[i]; l.t -= sdt; if (l.t <= 0) { g.later.splice(i, 1); l.fn(); } }
  for (let i = g.teles.length - 1; i >= 0; i--) { const q = g.teles[i]; q.t += sdt; if (q.t >= q.dur) g.teles.splice(i, 1); }
  for (let i = g.tracers.length - 1; i >= 0; i--) { const q = g.tracers[i]; q.t -= sdt; if (q.t <= 0) g.tracers.splice(i, 1); }
  updateParts(sdt); updatePops(sdt); updateAllies(sdt);
  let j = 0; for (let i = 0; i < g.zs.length; i++) { const z = g.zs[i]; if (!z.dead) g.zs[j++] = z; } g.zs.length = j;
  if (g.comboT > 0) { g.comboT -= sdt; if (g.comboT <= 0) g.combo = 0; }
  for (let i = g.dl.length - 1; i >= 0; i--) { const l = g.dl[i]; l.life -= sdt; if (l.life <= 0) { g.dl[i] = g.dl[g.dl.length - 1]; g.dl.pop(); } }
  if (g.rain) { g.lightT -= sdt; if (g.lightT <= 0) { g.lightT = rand(11, 24); g.flash = 1; setTimeout(() => Sound.play('thunder'), rand(300, 1300)); } }
  if (g.flash > 0) g.flash = Math.max(0, g.flash - dt * 3.2);
  const cam = g.cam, k = Math.min(1, dt * 9);
  cam.x += (p.x - cam.x) * k; cam.y += (p.y - 8 - cam.y) * k;
  g.shake = Math.max(0, g.shake - dt * 22);
  Sound.tick(dt, g.boss ? 2 : Math.min(2, g.zs.length / 55), p.hp < p.mhp * 0.3 && g.state === 'play');
  if (g.pendingLv > 0 && g.state === 'play') { g.lvDelay -= dt; if (g.lvDelay <= 0) UI.openLevelUp(); }
  g.achT = (g.achT || 0) - dt; if (g.achT <= 0) { g.achT = 1; checkAch(); }
}

/* ---------- 繪製 ---------- */
function shadowImg(r) {
  r = Math.max(3, Math.round(r)); if (SHADOWS[r]) return SHADOWS[r];
  const c = mkCanvas(r * 2 + 2, r + 2), x = c.getContext('2d'); shadowOval(x, r + 1, (r + 2) >> 1, r, Math.max(1, (r / 2.4) | 0), 0.4);
  return (SHADOWS[r] = c);
}
function blitMap(ctx, src, cx, cy) {
  const w = VC.w, h = VC.h;
  let sx = cx, sy = cy, dx = 0, dy = 0, sw = w, sh = h;
  if (sx < 0) { dx = -sx; sw += sx; sx = 0; } if (sy < 0) { dy = -sy; sh += sy; sy = 0; }
  if (sx + sw > src.width) sw = src.width - sx; if (sy + sh > src.height) sh = src.height - sy;
  if (sw > 0 && sh > 0) ctx.drawImage(src, sx, sy, sw, sh, dx, dy, sw, sh);
}
function drawChar(ctx, spr, x, y, face, an, hf, cx, cy, jz) {
  const fr = spr.fr[(an | 0) & 1];
  const img = hf > 0 ? (face > 0 ? fr.wn : fr.wf) : (face > 0 ? fr.n : fr.f);
  ctx.drawImage(img, Math.round(x - img.width / 2 - cx), Math.round(y - img.height + 1 - cy - (jz || 0)));
  return img;
}
function drawGun(ctx, x, y, a, len, cx, cy, col) {
  const hx = x - cx, hy = y - cy, c = Math.cos(a), s = Math.sin(a);
  ctx.fillStyle = OUTLINE; for (let i = 0; i <= len; i++) ctx.fillRect(Math.round(hx + c * i) - 1, Math.round(hy + s * i) - 1, 3, 3);
  ctx.fillStyle = col || '#8b93a1'; for (let i = 1; i <= len; i++) ctx.fillRect(Math.round(hx + c * i), Math.round(hy + s * i), 1, 1);
}
function poolItem(i) { if (!DRAW[i]) DRAW[i] = { o: null, t: 0, y: 0 }; return DRAW[i]; }
function render(dt) {
  const ctx = VC.ctx, w = VC.w, h = VC.h, g = G, m = g.map, p = g.p;
  let cx = g.cam.x - w / 2, cy = g.cam.y - h / 2;
  cx = m.pw <= w ? (m.pw - w) / 2 : clamp(cx, 0, m.pw - w);
  cy = m.ph <= h ? (m.ph - h) / 2 : clamp(cy, 0, m.ph - h);
  cx += PZ.cam.offsetX / VC.sc; cy += PZ.cam.offsetY / VC.sc; // 引擎的震動與後座力（平滑雜訊，不是亂跳）
  cx = Math.round(cx); cy = Math.round(cy); g.cx = cx; g.cy = cy;
  ctx.fillStyle = m.bg; ctx.fillRect(0, 0, w, h);
  blitMap(ctx, m.fl, cx, cy); blitMap(ctx, m.dec, cx, cy);
  if (m.dyn) m.dyn(ctx, cx, cy, g);
  drawZonesTeles(ctx, cx, cy);
  let n = 0;
  for (const pr of m.props) { if (pr.x - cx > w || pr.x + pr.img.width - cx < 0 || pr.y - cy > h || pr.y + pr.img.height - cy < 0) continue; const d = poolItem(n++); d.o = pr; d.t = 0; d.y = pr.sy; }
  for (const z of g.zs) { if (z.x - cx < -40 || z.x - cx > w + 40 || z.y - cy < -10 || z.y - cy > h + 50) continue; const d = poolItem(n++); d.o = z; d.t = 1; d.y = z.y; }
  { const d = poolItem(n++); d.o = p; d.t = 2; d.y = p.y; }
  for (const k of g.pickups) { const d = poolItem(n++); d.o = k; d.t = 3; d.y = k.y + 3; }
  for (const hz of g.hazards) { if (hz.dead) continue; const d = poolItem(n++); d.o = hz; d.t = 4; d.y = hz.y; }
  for (const a of g.allies) { const d = poolItem(n++); d.o = a; d.t = 5; d.y = a.y; }
  const L = DRAW.slice(0, n).sort((a, b) => a.y - b.y);
  for (const d of L) {
    const o = d.o;
    if (d.t === 0) { ctx.drawImage(o.img, o.x - cx, o.y - cy); if (o.kind === 'amb') { drawAmbLights(ctx, o, cx, cy, g.t); if (g.ambMax) { const f = clamp(g.ambHp / g.ambMax, 0, 1); R(ctx, OUTLINE, o.x - cx + 5, o.y - cy - 6, 40, 4); R(ctx, f > 0.35 ? '#8fdc6a' : '#d8423c', o.x - cx + 6, o.y - cy - 5, Math.round(38 * f), 2); } } }
    else if (d.t === 1) drawZombie(ctx, o, cx, cy);
    else if (d.t === 2) drawPlayer(ctx, p, cx, cy);
    else if (d.t === 3) { const bob = Math.round(Math.sin(o.t * 5) * 1.5), fz = o.fz || 0; ctx.drawImage(shadowImg(5), Math.round(o.x - 6 - cx), Math.round(o.y - 1 - cy)); ctx.drawImage(o.img, Math.round(o.x - o.img.width / 2 - cx), Math.round(o.y - o.img.height - 2 + bob - cy - fz)); }
    else if (d.t === 4) ctx.drawImage(o.img, Math.round(o.x - o.img.width / 2 - cx), Math.round(o.y - o.img.height + 2 - cy));
    else if (d.t === 5) { ctx.drawImage(shadowImg(5), Math.round(o.x - 6 - cx), Math.round(o.y - 2 - cy)); drawChar(ctx, o.spr, o.x, o.y, o.face, o.an, 0, cx, cy); drawGun(ctx, o.x + o.face * 2, o.y - 8, o.aim || 0, 5, cx, cy); if (o.mz > 0) R(ctx, '#fff4c0', Math.round(o.x + Math.cos(o.aim) * 7 - cx) - 1, Math.round(o.y - 8 + Math.sin(o.aim) * 7 - cy) - 1, 3, 3); }
  }
  drawProjectiles(ctx, cx, cy);
  drawParts(ctx, cx, cy);
  renderLight(ctx, cx, cy);
  if (g.rain) drawRain(ctx, dt);
  if (g.flash > 0) { ctx.fillStyle = `rgba(210,225,255,${(g.flash * 0.42 * PZ.settings.flashScale()).toFixed(3)})`; ctx.fillRect(0, 0, w, h); } // 設定：閃光關掉時閃電只剩兩成五
  for (const q of g.pops) {
    const a = q.t > 0.5 ? 1 - (q.t - 0.5) / 0.25 : 1; if (a <= 0) continue;
    ctx.globalAlpha = a;
    const col = q.kind === 'crit' ? '#ffd23a' : q.kind === 'block' ? '#8a939e' : q.kind === 'heal' ? '#8fdc6a' : q.kind === 'ammo' ? '#ffb347' : q.kind === 'fire' ? '#ff8a3c' : '#f4f1e8';
    drawNum(ctx, q.s, q.x - cx, q.y - cy, col, q.kind === 'crit' ? 2 : 1);
  }
  ctx.globalAlpha = 1;
  drawMarkers(ctx, cx, cy);
}
function drawZombie(ctx, z, cx, cy) {
  const jz = z.jz || 0;
  ctx.drawImage(shadowImg(z.r + 1), Math.round(z.x - z.r - 2 - cx), Math.round(z.y - (z.r + 2) / 2 - cy));
  if (z.kind === 'abiao' && z.st === 'spin') {
    const R0 = 56;
    for (let k = 0; k < 20; k++) { const a = z.spinA + k * TAU / 20; R(ctx, '#6d737b', Math.round(z.x + Math.cos(a) * R0 - cx), Math.round(z.y - 8 + Math.sin(a) * R0 * 0.6 - cy), 1, 1); }
    for (let i = 0; i <= 12; i++) { const r = R0 * i / 12, a = z.spinA; R(ctx, i % 2 ? '#a3a9b1' : '#5c6168', Math.round(z.x + Math.cos(a) * r - cx), Math.round(z.y - 8 + Math.sin(a) * r * 0.6 - cy), 2, 2); }
  }
  const img = drawChar(ctx, z.spr, z.x, z.y, z.face, z.an, z.hf, cx, cy, jz);
  if (z.burn > 0 && Math.random() < 0.5) R(ctx, pick(['#ff8a3c', '#ffcf5a']), Math.round(z.x + rand(-4, 4) - cx), Math.round(z.y - rand(4, 14) - cy - jz), 1, 2);
  if (z.stun > 0) { const t = G.t * 8; for (let k = 0; k < 3; k++) { const a = t + k * TAU / 3; R(ctx, '#ffd23a', Math.round(z.x + Math.cos(a) * 7 - cx), Math.round(z.y - img.height - 3 + Math.sin(a) * 2 - cy), 2, 2); } }
  if (!z.boss && z.elite && z.hp < z.mhp) { const f = z.hp / z.mhp; R(ctx, OUTLINE, Math.round(z.x - 7 - cx), Math.round(z.y - img.height - 3 - cy), 14, 3); R(ctx, '#d8423c', Math.round(z.x - 6 - cx), Math.round(z.y - img.height - 2 - cy), Math.round(12 * f), 1); }
}
function drawPlayer(ctx, p, cx, cy) {
  const g = G;
  if (g.state === 'dying' || g.state === 'dead') { const img = p.face > 0 ? PSPR.corpse : PSPR.corpseF; ctx.drawImage(img, Math.round(p.x - img.width / 2 - cx), Math.round(p.y - img.height / 2 - cy)); return; }
  ctx.drawImage(shadowImg(6), Math.round(p.x - 7 - cx), Math.round(p.y - 3 - cy));
  if (p.inv > 0 && p.roll <= 0 && ((g.t * 16) | 0) % 2) return;
  const gs = p.guns[p.gi], glen = gs ? (gs.id === 'rifle' ? 10 : gs.id === 'shotgun' ? 9 : 6) : 6;
  const behind = Math.sin(p.aim) < -0.3;
  if (p.roll > 0) {
    const fr = PSPR.fr[0], img = p.face > 0 ? fr.n : fr.f, k = 1 - p.roll / 0.28;
    ctx.save(); ctx.translate(Math.round(p.x - cx), Math.round(p.y - 9 - cy)); ctx.rotate(k * TAU * (p.face > 0 ? 1 : -1)); ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2)); ctx.restore();
    return;
  }
  if (behind) drawGun(ctx, p.x + p.face * 2, p.y - 8, p.aim, glen, cx, cy);
  drawChar(ctx, PSPR, p.x, p.y, p.face, p.moving ? p.an : 0, 0, cx, cy);
  if (!behind) drawGun(ctx, p.x + p.face * 2, p.y - 8, p.aim, glen, cx, cy);
  if (p.muzzle > 0) { const mx = Math.round(p.x + p.face * 2 + Math.cos(p.aim) * (glen + 2) - cx), my = Math.round(p.y - 8 + Math.sin(p.aim) * (glen + 2) - cy); R(ctx, '#fff4c0', mx - 2, my - 1, 5, 3); R(ctx, '#fff4c0', mx - 1, my - 2, 3, 5); R(ctx, '#ffffff', mx, my, 1, 1); }
  if (p.reload > 0) { const f = 1 - p.reload / p.reloadMax; R(ctx, OUTLINE, Math.round(p.x - 8 - cx), Math.round(p.y - 27 - cy), 16, 3); R(ctx, '#ffb347', Math.round(p.x - 7 - cx), Math.round(p.y - 26 - cy), Math.round(14 * f), 1); }
  if (p.swing > 0) {
    const k = 1 - p.swing / 0.16, reach = 19 * p.st.batR + 4;
    for (let i = 0; i <= 10; i++) { const a = p.swingA - 1.1 + 2.2 * i / 10; if (i / 10 > k + 0.15) break; const alpha = 1 - Math.abs(i / 10 - k); ctx.fillStyle = `rgba(240,240,230,${Math.max(0.15, alpha).toFixed(2)})`; ctx.fillRect(Math.round(p.x + Math.cos(a) * reach - cx), Math.round(p.y - 7 + Math.sin(a) * reach * 0.8 - cy), 2, 2); }
    const ba = p.swingA - 1.1 + 2.2 * k; drawGun(ctx, p.x, p.y - 8, ba, 12, cx, cy, '#d9dee6');
  }
}
function drawZonesTeles(ctx, cx, cy) {
  const g = G, t = g.t;
  for (const z of g.zones) {
    const a = Math.min(1, z.life / 0.6);
    if (z.k === 'fire') { ctx.fillStyle = `rgba(255,110,40,${(0.18 * a).toFixed(3)})`; ovalFill(ctx, z.x - cx, z.y - cy, z.r, z.r * 0.55); for (let i = 0; i < 6; i++) R(ctx, pick(['#ff8a3c', '#ffcf5a', '#e0402c']), Math.round(z.x + rand(-z.r, z.r) * 0.8 - cx), Math.round(z.y + rand(-z.r, z.r) * 0.45 - cy), 1, 2); }
    else { ctx.fillStyle = `rgba(150,230,70,${(0.3 * a).toFixed(3)})`; ovalFill(ctx, z.x - cx, z.y - cy, z.r, z.r * 0.55); if (Math.random() < 0.3) R(ctx, '#c8ff7a', Math.round(z.x + rand(-z.r, z.r) * 0.6 - cx), Math.round(z.y + rand(-z.r, z.r) * 0.3 - cy), 1, 1); }
  }
  for (const q of g.teles) {
    const k = q.t / q.dur, blink = ((t * 12) | 0) % 2 ? 0.55 : 0.35;
    ctx.fillStyle = `rgba(230,40,40,${(0.12 + 0.25 * k).toFixed(3)})`; ctx.strokeStyle = `rgba(255,70,60,${blink})`;
    if (q.k === 'circle' || q.k === 'ring') { ovalFill(ctx, q.x - cx, q.y - cy, q.r * (q.k === 'ring' ? 1 : k), q.r * 0.6 * (q.k === 'ring' ? 1 : k)); ovalRing(ctx, q.x - cx, q.y - cy, q.r, q.r * 0.6, `rgba(255,70,60,${blink})`); }
    else if (q.k === 'line') { ctx.save(); ctx.translate(q.x - cx, q.y - cy); ctx.rotate(q.a); ctx.fillRect(0, -q.w / 2, q.r * k, q.w); ctx.fillStyle = `rgba(255,70,60,${blink})`; ctx.fillRect(0, -q.w / 2, q.r, 1); ctx.fillRect(0, q.w / 2 - 1, q.r, 1); ctx.restore(); }
    else if (q.k === 'cone' || q.k === 'arc') { ctx.beginPath(); ctx.moveTo(q.x - cx, q.y - cy); ctx.arc(q.x - cx, q.y - cy, q.r * (q.k === 'arc' ? 1 : k), q.a - q.w, q.a + q.w); ctx.closePath(); ctx.fill(); }
  }
}
function ovalFill(ctx, x, y, rx, ry) { rx = Math.max(1, rx); ry = Math.max(1, ry); for (let j = -Math.round(ry); j <= Math.round(ry); j++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry)))); ctx.fillRect(Math.round(x - hw), Math.round(y + j), hw * 2, 1); } }
function ovalRing(ctx, x, y, rx, ry, col) { ctx.fillStyle = col; const n = Math.max(16, (rx * 1.2) | 0); for (let i = 0; i < n; i++) { const a = i / n * TAU; ctx.fillRect(Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), 1, 1); } }
function drawProjectiles(ctx, cx, cy) {
  const g = G;
  for (const b of g.bullets) { const l = 3.2 / b.spd; ctx.fillStyle = b.col; for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(b.x - b.vx * l * i - cx), Math.round(b.y - b.vy * l * i - cy), 1, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(b.x - cx), Math.round(b.y - cy), 1, 1); }
  for (const e of g.eproj) {
    if (e.k === 'acid') { R(ctx, OUTLINE, Math.round(e.x - cx) - 2, Math.round(e.y - cy) - 2, 5, 5); R(ctx, '#a3e84e', Math.round(e.x - cx) - 1, Math.round(e.y - cy) - 1, 3, 3); }
    else if (e.k === 'molo') { ctx.drawImage(shadowImg(3), Math.round(e.x - 4 - cx), Math.round(lerp(e.sy + 8, e.ty, e.t / e.dur) - cy)); R(ctx, OUTLINE, Math.round(e.x - cx) - 2, Math.round(e.y - e.z - cy) - 3, 5, 7); R(ctx, '#7a4a22', Math.round(e.x - cx) - 1, Math.round(e.y - e.z - cy) - 2, 3, 5); R(ctx, '#ffcf5a', Math.round(e.x - cx), Math.round(e.y - e.z - cy) - 4, 1, 2); }
    else if (e.k === 'car') { ctx.drawImage(shadowImg(14), Math.round(e.x - 15 - cx), Math.round(lerp(e.sy + 20, e.ty, e.t / e.dur) - 4 - cy)); ctx.drawImage(e.img, Math.round(e.x - e.img.width / 2 - cx), Math.round(e.y - e.z - e.img.height / 2 - cy)); }
    else if (e.k === 'anchor') {
      const o = e.ox; const n = Math.max(2, (e.d / 5) | 0);
      for (let i = 0; i < n; i++) { const r = e.d * i / n; R(ctx, i % 2 ? '#a3a9b1' : '#5c6168', Math.round(o.x + Math.cos(e.a) * r - cx), Math.round(o.y - 8 + Math.sin(e.a) * r - cy), 2, 2); }
      R(ctx, OUTLINE, Math.round(e.x - cx) - 4, Math.round(e.y - cy) - 4, 9, 9); R(ctx, '#8c929a', Math.round(e.x - cx) - 3, Math.round(e.y - cy) - 3, 7, 7); R(ctx, '#c8ccd2', Math.round(e.x - cx) - 1, Math.round(e.y - cy) - 3, 2, 5);
    }
  }
  for (const q of g.tracers) { ctx.strokeStyle = 'rgba(255,230,150,0.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q.x1 - cx, q.y1 - cy); ctx.lineTo(q.x2 - cx, q.y2 - cy); ctx.stroke(); }
}
function drawParts(ctx, cx, cy) {
  for (const q of G.parts) {
    const x = Math.round(q.x - cx), y = Math.round(q.y - q.z - cy), f = q.life / q.max;
    switch (q.k) {
      case 'flame': ctx.fillStyle = f < 0.3 ? '#fff0a0' : f < 0.6 ? '#ff9a3c' : '#c8322b'; ctx.fillRect(x, y, q.s, q.s + 1); break;
      case 'smoke': ctx.globalAlpha = (1 - f) * 0.6; ctx.fillStyle = '#2c2c30'; ctx.fillRect(x, y, q.s + (f * 3 | 0), q.s + (f * 3 | 0)); ctx.globalAlpha = 1; break;
      case 'ring': { const r = q.r * (0.3 + f * 0.9); ovalRing(ctx, q.x - cx, q.y - cy, r, r * 0.55, `rgba(255,240,220,${(1 - f).toFixed(2)})`); break; }
      case 'sweep': { ctx.fillStyle = `rgba(230,236,240,${(1 - f) * 0.8})`; for (let i = 0; i < 24; i++) { const a = q.a - 1.6 + 3.2 * i / 24; ctx.fillRect(Math.round(q.x + Math.cos(a) * q.r - cx), Math.round(q.y + Math.sin(a) * q.r * 0.6 - cy), 2, 2); } break; }
      default: ctx.fillStyle = q.col; ctx.fillRect(x, y, q.s, q.s);
    }
  }
}
function drawMarkers(ctx, cx, cy) {
  const g = G; if (!g.markers || !g.markers.length) return;
  const w = VC.w, h = VC.h, p = g.p;
  let best = null, bd = Infinity;
  for (const mk of g.markers) { const dd = d2(mk.x, mk.y, p.x, p.y); if (dd < bd) { bd = dd; best = mk; } }
  for (const mk of g.markers) {
    const sx = mk.x - cx, sy = mk.y - cy - 16;
    if (sx > 6 && sx < w - 6 && sy > 6 && sy < h - 6) { const b = Math.round(Math.sin(g.t * 6) * 2); R(ctx, OUTLINE, sx - 3, sy - 5 + b, 7, 5); R(ctx, '#ffb347', sx - 2, sy - 4 + b, 5, 1); R(ctx, '#ffb347', sx - 1, sy - 3 + b, 3, 1); R(ctx, '#ffb347', sx, sy - 2 + b, 1, 1); }
    else if (mk === best) {
      const a = Math.atan2(sy - h / 2, sx - w / 2), ex = clamp(w / 2 + Math.cos(a) * w, 10, w - 10), ey = clamp(h / 2 + Math.sin(a) * h, 26, h - 70);
      ctx.save(); ctx.translate(Math.round(ex), Math.round(ey)); ctx.rotate(a);
      ctx.fillStyle = OUTLINE; ctx.fillRect(-5, -4, 10, 9); ctx.fillStyle = '#ffb347'; for (let i = 0; i < 5; i++) ctx.fillRect(-3 + i, -3 + i * 0.6, 1, 7 - i * 1.2);
      ctx.restore();
    }
  }
}
function drawRain(ctx, dt) {
  const w = VC.w, h = VC.h;
  ctx.fillStyle = 'rgba(175,200,235,0.32)';
  for (const d of RAIN) {
    d.y += d.v * dt; d.x += d.v * 0.22 * dt;
    if (d.y > h + 6) { d.y = rand(-20, -4); d.x = rand(-40, w); }
    for (let k = 0; k < d.l; k++) ctx.fillRect(Math.round(d.x - k * 0.22), Math.round(d.y - k), 1, 1);
  }
  ctx.fillStyle = 'rgba(200,220,255,0.35)';
  for (let i = 0; i < 6; i++) ctx.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, 2, 1);
}
function punch(L, x, y, r, i) { if (r <= 0) return; const g = L.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(0,0,0,${i})`); g.addColorStop(0.5, `rgba(0,0,0,${i * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)'); L.fillStyle = g; L.fillRect(x - r, y - r, r * 2, r * 2); }
function renderLight(ctx, cx, cy) {
  const g = G, L = VC.lctx, w = VC.w, h = VC.h, m = g.map, p = g.p, t = g.t;
  if (g.dark <= 0.02) return;
  L.globalCompositeOperation = 'source-over'; L.clearRect(0, 0, w, h);
  L.fillStyle = `rgba(${g.ambient},${g.dark})`; L.fillRect(0, 0, w, h);
  L.globalCompositeOperation = 'destination-out';
  const px = p.x - cx, py = p.y - 8 - cy;
  punch(L, px, py, 62, 0.95);
  { const a = p.aim, len = 150, gr = L.createRadialGradient(px, py, 4, px, py, len); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); L.fillStyle = gr; L.beginPath(); L.moveTo(px, py); L.arc(px, py, len, a - 0.42, a + 0.42); L.closePath(); L.fill(); }
  const glows = [];
  for (const l of m.lights) {
    if (l.pw && !g.power) { if (Math.random() > 0.015) continue; }
    let r = l.r; if (!r) continue;
    const lx = l.x - cx, ly = l.y - cy; if (lx < -r || ly < -r || lx > w + r || ly > h + r) continue;
    if (l.f) { const fl = Math.random() < l.f * 0.3 ? 0.4 : 1; r *= (0.94 + Math.random() * 0.06) * fl; }
    punch(L, lx, ly, r, l.i); if (l.col) glows.push(lx, ly, r, l.col);
  }
  for (const l of g.dl) { const k = l.life / l.max; punch(L, l.x - cx, l.y - cy, l.r * (0.6 + 0.4 * k), l.i * k); }
  for (const z of g.zones) if (z.k === 'fire') punch(L, z.x - cx, z.y - cy, z.r * 2.2, 0.75);
  for (const f of m.fires) punch(L, f.x - cx, f.y - cy, 60 + Math.random() * 6, 0.7);
  for (const k of g.pickups) punch(L, k.x - cx, k.y - 6 - cy, 16, 0.6);
  for (const a of g.allies) punch(L, a.x - cx, a.y - 8 - cy, 40, 0.7);
  L.globalCompositeOperation = 'source-over';
  ctx.drawImage(VC.light, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < glows.length; i += 4) {
    const x = glows[i], y = glows[i + 1], r = glows[i + 2] * 0.8, c = hexRGB(glows[i + 3]);
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0.22)`); gr.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (const f of m.fires) { const x = f.x - cx, y = f.y - cy, r = 46; const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,120,40,0.28)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); if (Math.random() < 0.5) addPart('flame', f.x + rand(-8, 8), f.y + rand(-4, 4), { vx: rand(-6, 6), vy: rand(-6, 0) }); }
  for (const l of g.dl) { if (!l.col) continue; const k = l.life / l.max, c = hexRGB(l.col), x = l.x - cx, y = l.y - cy, r = l.r * 0.5; const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.35 * k})`); gr.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  ctx.globalCompositeOperation = 'source-over';
}

