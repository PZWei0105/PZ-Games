// ============ 獵手 AI、導演、幕與目標 ============
function beastRoom(b) { return roomIdxW(b.x, b.y); }
function sightR(b) { return roomLit(beastRoom(b)) ? T * 8.5 : T * 4.6; }
function updateBeast(b, dt) {
  if (!b) return;
  const st = STAGES[b.stage];
  b.t += dt;
  b.sonarFx = Math.max(0, b.sonarFx - dt * 1.4);
  b.stun = Math.max(0, b.stun - dt); b.pin = Math.max(0, b.pin - dt); b.frozen = Math.max(0, b.frozen - dt); b.fear = Math.max(0, b.fear - dt);
  b.dmgT -= dt; if (b.dmgT <= 0) b.dmgWin = 0;
  b.regenCd -= dt;
  if (b.regenCd <= 0 && b.inVent && b.state !== 'dead') b.hp = Math.min(b.maxhp, b.hp + dt * (b.stage === 0 ? 1 : b.stage === 1 ? 2.2 : 1.6));
  b.jaw = lerp(b.jaw, (b.state === 'chase' || b.state === 'grab') ? 1 : 0, dt * 5);
  b.crest = lerp(b.crest, (b.state === 'chase' || b.state === 'grab' || b.stage === 2) ? 1 : b.state === 'search' ? .4 : 0, dt * 3);
  b.moving = false; b.speedNow = 0;
  if (b.state === 'dead' || b.state === 'spaced') { updateBeastRig(b, dt); return; }
  if (!b.inVent && b.state !== 'dormant') {
    const r = ROOM.dock; if (dist(b.x, b.y, r.cx, r.cy) < T * 8) b.nearDockT = W.t;
  }
  // 被控制住
  const held = b.stun > 0 || b.pin > 0 || b.frozen > 0;
  if (!b.inVent && held) { if (b.grabV && b.stun > 0) releaseGrab(b, true); updateBeastRig(b, dt); beastSenses(b, dt, true); return; }
  // 聲納
  b.sonarT -= dt;
  if (b.sonarT <= 0 && b.state !== 'dormant') { b.sonarT = b.stage === 0 ? 3.6 : 3; sonarPulse(b); }
  if (!b.inVent) beastSenses(b, dt, false); else ventSenses(b, dt);
  switch (b.state) {
    case 'dormant': stDormant(b, dt); break;
    case 'vent': stVent(b, dt, st); break;
    case 'lurk': stLurk(b, dt); break;
    case 'telegraph': stTelegraph(b, dt); break;
    case 'sink': b.st += dt; if (b.st > .55) { b.inVent = true; b.state = 'lurk'; b.st = 0; b.lurkT = R.f(2, 4); } break;
    case 'prowl': case 'investigate': stWalkTo(b, dt, st, false); break;
    case 'search': stSearch(b, dt, st); break;
    case 'check': stCheck(b, dt, st); break;
    case 'chase': stChase(b, dt, st); break;
    case 'grab': stGrab(b, dt, st); break;
    case 'flee': case 'toVent': stWalkTo(b, dt, st, true); break;
    case 'feed': stFeed(b, dt); break;
    case 'nesting': stWalkTo(b, dt, st, false); break;
  }
  updateBeastRig(b, dt);
  b.wasVisible = b.visible;
  b.visible = beastVisible(b);
  if (b.visible) {
    b.lastSeen = { x: b.x, y: b.y, t: W.t };
    for (const m of W.crew) if (!m.dead && m.cocoon < 0 && canSee(m, b.x, b.y)) { if (m.seen > 6) { bark(m, b.stage === 0 ? 'seeJuv' : 'see'); } m.seen = 0; }
    if (!b.wasVisible) onSighted(b);
  } else if (b.wasVisible && b.lastSeen) W.ghosts.push({ x: b.lastSeen.x, y: b.lastSeen.y, ang: b.ang, t: 0, sc: b.scale });
}
function onSighted(b) {
  const gap = W.t - (W.lastSighting || -99); W.lastSighting = W.t;
  if (gap > 14) { AU.stinger(b.stage); if (b.stage > 0) shake(5); vibrate(40); }
  if (!W.flags['sight' + b.stage]) { W.flags['sight' + b.stage] = true; chron(b.stage === 0 ? '第一次看清楚牠：比貓大一點，全身是濕的。' : b.stage === 1 ? '牠長大了。比人還高。' : '牠又變了。頭上的冠全張開了。'); }
}
function canSee(m, x, y) {
  if (m.dead || m.cocoon >= 0) return false;
  const d = dist(m.x, m.y, x, y);
  if (d > T * 11) return false;
  if (!hasLOS(m.x, m.y, x, y)) return false;
  const ri = roomIdxW(x, y);
  if (roomLit(ri) && d < T * 10) return true;
  if (d < T * 2.2) return true;
  if (m.lampOn && d < T * 6.8 && Math.abs(angDiff(m.ang, Math.atan2(y - m.y, x - m.x))) < .55) return true;
  for (const t of W.traps) if (t.type === 'flare' && dist(t.x, t.y, x, y) < T * 4 && hasLOS(t.x, t.y, x, y)) return true;
  return false;
}
function beastVisible(b) {
  if (b.inVent || b.state === 'dormant') return false;
  if (b.state === 'spaced' || b.state === 'dead') return true;
  for (const m of W.crew) if (canSee(m, b.x, b.y)) return true;
  for (const t of W.traps) if (t.type === 'flare' && dist(t.x, t.y, b.x, b.y) < T * 4 && hasLOS(t.x, t.y, b.x, b.y)) return true;
  return false;
}
function sonarPulse(b) {
  b.sonarFx = 1;
  if (!b.inVent) AU.sonar(b.x, b.y, b.stage);
  const br = beastRoom(b);
  let best = null, bd = Infinity;
  for (const m of W.crew) {
    if (m.dead || m.grabbed || m.cocoon >= 0 || m.inVent) continue;
    let R0 = 90 + Math.max(0, m.bpm - 60) * 2.4;
    if (m.hidden) R0 *= .5;
    const k = Math.min(2, roomCost(br, m.room)); R0 *= Math.pow(.5, k);
    if (b.inVent) R0 *= .65;
    const d = dist(b.x, b.y, m.x, m.y);
    if (d < R0 && d < bd) { bd = d; best = m; }
  }
  if (best) heardCrew(b, best, 'sonar');
}
function heardCrew(b, m, how) {
  b.tmem = { x: m.x, y: m.y, t: W.t, m };
  if (b.stage === 0) { // 幼體：通常躲人；落單、心跳快的人會被偷襲
    const alone = !W.crew.some(o => o !== m && !o.dead && o.cocoon < 0 && o.room === m.room);
    if (alone && !m.hidden && W.actT > 70 && W.t > (b.nextBite || 0) && m.bpm > 88) { b.nextBite = W.t + 55; b.target = m; if (b.inVent) ventToward(b, m.x, m.y, 'bite'); else { b.state = 'chase'; b.st = 0; } return; }
    if (!b.inVent && dist(b.x, b.y, m.x, m.y) < T * 5 && b.state !== 'flee') beastFlee(b, 'avoid');
    return;
  }
  if (W.dir.cool > 0 && b.state !== 'chase' && b.state !== 'grab') return;
  if (m.hidden) { if (b.state !== 'check' && b.state !== 'chase' && b.state !== 'grab') { goCheck(b, m.hidden, true); } return; }
  if (b.inVent) { if (b.state !== 'telegraph') ventToward(b, m.x, m.y, 'hunt'); }
  else if (b.state !== 'chase' && b.state !== 'grab') startChase(b, m);
}
function beastSenses(b, dt, held) {
  if (b.state === 'sink' || b.state === 'dormant') return;
  // 視覺
  const br = beastRoom(b), sr = sightR(b);
  let seen = null, sd = Infinity;
  for (const m of W.crew) {
    if (m.dead || m.grabbed || m.cocoon >= 0 || m.hidden || m.inVent) continue;
    const d = dist(b.x, b.y, m.x, m.y);
    if (d < sr && d < sd && hasLOS(b.x, b.y, m.x, m.y)) { seen = m; sd = d; }
  }
  if (seen) {
    if (b.stage === 0) { if (sd < T * 1.05 && (b.cornered || R.chance(dt * .6))) { juvBite(b, seen); } else if (b.state !== 'flee' && b.state !== 'toVent' && b.state !== 'telegraph' && b.state !== 'chase') beastFlee(b, 'seen'); }
    else if (!held && b.state !== 'grab' && b.state !== 'flee' && b.state !== 'chase' && (W.dir.cool <= 0 || sd < T * 2.5)) startChase(b, seen);
    else if (b.state === 'chase' && b.target !== seen && sd < dist(b.x, b.y, b.target.x, b.target.y) - T) b.target = seen;
    b.tmem = { x: seen.x, y: seen.y, t: W.t, m: seen };
  }
  // 誰躲進去被看到
  for (const m of W.crew) if (m.hidden && m.seenHiding && b.state !== 'check' && b.state !== 'grab' && b.stage > 0) { m.seenHiding = false; goCheck(b, m.hidden, true); }
  if (held) return;
  // 聽覺
  if (b.state === 'chase' || b.state === 'grab' || b.state === 'flee') return;
  const ev = loudestHeard(b, br);
  if (ev) reactNoise(b, ev);
}
function ventSenses(b, dt) {
  if (b.state === 'telegraph') return;
  const ev = loudestHeard(b, beastRoom(b), true);
  if (ev) reactNoise(b, ev);
}
function loudestHeard(b, br, vent) {
  let best = null, bs = 0;
  const list = W.noisePrev ? W.noisePrev.concat(W.noiseEv) : W.noiseEv;
  for (const e of list) {
    if (e.done || e.src === 'beast' || e.src === 'damper') continue;
    e.done = true;
    let k = roomCost(br, e.room); if (vent) k = Math.max(0, k - 1);
    const reff = e.r * Math.pow(.5, Math.min(3, k)) * (vent ? 1.1 : 1);
    const d = dist(b.x, b.y, e.x, e.y);
    if (d < reff) { const s = reff - d; if (s > bs) { bs = s; best = e; } }
  }
  return best;
}
function reactNoise(b, e) {
  const L = W.learn;
  if (e.src === 'lure') { if (L.lure >= (W.stance === 'trap' ? 4 : 3)) return; }
  if (e.src === 'alarm' && L.alarm >= 3) return;
  if (e.src === 'bot' && L.bot >= 1) return;
  if (b.stage === 0) { // 幼體：被聲音嚇到或好奇
    if (e.src === 'lure' || e.src === 'bot' || e.src === 'alarm') { if (b.inVent) ventToward(b, e.x, e.y, 'investigate'); else walkTo(b, e.x, e.y, 'investigate'); b.lure = e.src; }
    return;
  }
  if (W.dir.cool > 0 && e.src !== 'lure' && e.src !== 'alarm' && e.src !== 'scream' && e.src !== 'boom') return;
  if (b.lastHeard && W.t - b.lastHeard.t < 1.5 && dist(b.lastHeard.x, b.lastHeard.y, e.x, e.y) < T * 2) return;
  b.lastHeard = { x: e.x, y: e.y, t: W.t, src: e.src };
  b.lure = (e.src === 'lure' || e.src === 'alarm' || e.src === 'bot') ? e.src : null;
  if (b.inVent) ventToward(b, e.x, e.y, 'investigate');
  else walkTo(b, e.x, e.y, 'investigate');
}
// ---- 狀態 ----
function stDormant(b, dt) {
  b.hideT -= dt;
  const box = SHIP.con.container;
  if (b.hideT < 1.6 && !b.rattled) { b.rattled = true; AU.bang(box.px, box.py, .6); noise(box.px, box.py, T * 3, 'beast'); W.fx.push({ type: 'shakeProp', x: box.px, y: box.py, t: 0, dur: 1.6 }); }
  if (b.hideT <= 0) {
    b.x = 8.9 * T; b.y = 33.4 * T; b.ang = Math.PI;
    for (const s of b.seg) { s.x = b.x + 10; s.y = b.y; }
    for (const L of b.legs) { L.fx = b.x; L.fy = b.y; }
    AU.burst(b.x, b.y); noise(b.x, b.y, T * 5, 'beast');
    const batu = crewById('batu'); if (batu) { batu.seen = 0; say('batu', '艦長……貨櫃裡有東西——牠跑出來了！'); batu.ang = Math.atan2(b.y - batu.y, b.x - batu.x); }
    chron('樣本貨櫃的側板被撐開。某個東西爬了出來，鑽進地板下的通風管。');
    beastFlee(b, 'birth');
  }
}
function walkTo(b, x, y, state) {
  if (b.state === state && b.path && b.goalX != null && dist(b.goalX, b.goalY, x, y) < T * 1.5) return true;
  const p = findPath(Math.floor(b.x / T), Math.floor(b.y / T), Math.floor(x / T), Math.floor(y / T), 'beast');
  if (!p) { if (state !== 'toVent' && state !== 'flee') { b.state = 'search'; b.st = 0; b.searchT = 3; } return false; }
  b.path = pathToPts(p, x, y); b.pi = 0; b.state = state; b.st = 0; b.goalX = x; b.goalY = y;
  return true;
}
function stWalkTo(b, dt, st, toVent) {
  const fast = b.state === 'flee' || (b.state === 'investigate' && b.stage > 0) ? st.run * .85 : b.state === 'toVent' ? st.walk * 1.4 : st.walk;
  if (!b.path) { arriveBeast(b); return; }
  if (!stepPath(b, dt, fast * T)) return;
  if (b.pi >= b.path.length) { b.path = null; arriveBeast(b); }
}
function stepPath(b, dt, sp) {
  const p = b.path[b.pi];
  if (!p) return true;
  if (p[2] != null) {
    const d = doorBetween(p[2], p[3], p[4], p[5]);
    if (d && !doorOpen(d)) {
      if (d.state === 'open') { return false; } // 正在打開
      // 撞門
      if (b.forceDoor !== d) { b.forceDoor = d; b.forceT = 0; if (d.welded) { W.learn.weld++; } }
      b.forceT += dt;
      const need = STAGES[b.stage].force * (d.kind !== 'door' ? 1.6 : 1) * (d.welded ? 3 : 1) * (perkOn('doors') ? 1.5 : 1);
      d.force = b.forceT / need;
      b.bangT = (b.bangT || 0) - dt;
      if (b.bangT <= 0) { b.bangT = .55; AU.bang(d.x, d.y, 1); noise(d.x, d.y, T * 8, 'beast'); shake(2.5); }
      b.ang = lerpAng(b.ang, Math.atan2(d.y - b.y, d.x - b.x), dt * 6);
      if (b.forceT >= need) {
        if (d.welded || R.chance(.35)) { d.broken = true; d.welded = 0; chron('牠撞爛了' + doorName(d) + '。'); } else d.state = 'open';
        d.force = 0; b.forceDoor = null; recomputeRoomCosts(); W.lightVer++;
      }
      return false;
    }
  }
  b.forceDoor = null;
  const dx = p[0] - b.x, dy = p[1] - b.y, d0 = Math.hypot(dx, dy);
  b.moving = true; b.speedNow = sp;
  if (d0 > 1) b.ang = lerpAng(b.ang, Math.atan2(dy, dx), dt * 7);
  const step = sp * dt * (b.frozen > 0 ? .1 : 1);
  if (step >= d0) { b.x = p[0]; b.y = p[1]; b.pi++; } else { b.x += dx / d0 * step; b.y += dy / d0 * step; }
  b.stepT = (b.stepT || 0) - dt;
  if (b.stepT <= 0) { b.stepT = b.stage === 0 ? .28 : .38; if (sp > T * 3) { AU.beastStep(b.x, b.y, b.stage); noise(b.x, b.y, T * 2.5, 'beast'); } }
  return true;
}
function arriveBeast(b) {
  if (b.state === 'flee' || b.state === 'toVent') { tryEnterVent(b); return; }
  if (b.state === 'investigate') {
    learnFromLure(b);
    b.state = 'search'; b.st = 0; b.searchT = b.stage === 0 ? 2 : R.f(3, 5); return;
  }
  if (b.state === 'nesting') { b.state = 'search'; b.st = 0; b.searchT = 2; return; }
  b.state = 'search'; b.st = 0; b.searchT = R.f(2.5, 4);
}
function learnFromLure(b) {
  if (!b.lure) return;
  if (b.lure === 'lure') { W.learn.lure++; if (W.learn.lure === 2) learnToast('lure', '牠在誘餌旁邊停了很久……下次牠可能不會再上當。'); if (W.learn.lure === 3) learnToast('lure2', '牠學會了：噪音誘餌已經騙不了牠。'); }
  else if (b.lure === 'alarm') { W.learn.alarm++; if (W.learn.alarm === 2) learnToast('alarm1', '牠在警報響的地方繞了好幾圈……牠開始起疑了。'); if (W.learn.alarm === 3) learnToast('alarm', '牠學會了：警報騙不了牠了。'); }
  else if (b.lure === 'bot') { W.learn.bot++; learnToast('bot', '牠發現那只是清潔機器人。小蝸騙不了牠了。'); }
  b.lure = null;
}
function stSearch(b, dt, st) {
  b.st += dt;
  b.ang += Math.sin(b.t * 1.3) * dt * 1.6;
  if (b.stage === 0 && b.st > b.searchT) { // 幼體找地方吃東西或回管道
    if (!crewInRoom(beastRoom(b)) && R.chance(.6) && !b.fedHere) { b.state = 'feed'; b.st = 0; b.feedT = R.f(7, 11); b.fedHere = true; return; }
    beastToVent(b); return;
  }
  // 翻躲藏點
  if (b.stage > 0 && !b.checkedRoom) {
    b.checkedRoom = true;
    const ri = beastRoom(b);
    const spots = SHIP.hides.filter(h => h.room === ri && !b.checked.has(h.i));
    for (const h of spots) {
      let p = .12 + .2 * W.learn.hide[h.ht];
      if (h.occ != null) { const m = W.crew[h.occ]; p += Math.max(0, m.bpm - 95) / 160; }
      if (R.chance(Math.min(.92, p))) { goCheck(b, h, false); return; }
    }
  }
  if (b.st > b.searchT) { b.checkedRoom = false; b.checked.clear(); if (b.wary) { b.wary = false; beastToVent(b); return; } decideNext(b); }
}
function goCheck(b, h, sure) {
  if (b.inVent) { ventToward(b, h.sx, h.sy, 'check'); b.checkSpot = h; return; }
  b.checkSpot = h; b.checked.add(h.i);
  if (!walkTo(b, h.sx, h.sy, 'check')) { b.state = 'search'; b.st = 0; return; }
  b.sure = sure;
}
function stCheck(b, dt, st) {
  if (b.path) { if (!stepPath(b, dt, st.walk * 1.5 * T)) return; if (b.pi >= b.path.length) b.path = null; return; }
  b.st += dt;
  const h = b.checkSpot; if (!h) { b.state = 'search'; b.st = 0; return; }
  b.ang = lerpAng(b.ang, Math.atan2(h.py - b.y, h.px - b.x), dt * 6);
  if (b.st > 1.1) {
    if (h.occ != null) {
      const m = W.crew[h.occ];
      unhide(m); m.seen = 0; bark(m, 'found', true);
      W.learn.hide[h.ht]++;
      learnToast('hide' + h.ht + W.learn.hide[h.ht], '牠學會去翻「' + h.name + '」這種地方了。');
      chron('牠把' + CREW[m.ci].name + '從' + h.name + '裡揪了出來。');
      startChase(b, m); b.grabCd = 0;
    } else { b.state = 'search'; b.st = 1; b.checkSpot = null; }
  }
}
function crewInRoom(ri) { return W.crew.some(m => !m.dead && m.cocoon < 0 && m.room === ri); }
function startChase(b, m) {
  if (b.stage === 0) { b.target = m; b.state = 'chase'; b.st = 0; b.repath = 0; b.lostT = 0; return; }
  b.target = m; b.state = 'chase'; b.st = 0; b.repath = 0; b.lostT = 0;
  if (!W.flags.firstChase) { W.flags.firstChase = true; }
}
function stChase(b, dt, st) {
  const m = b.target;
  if (!m || m.dead || m.cocoon >= 0 || m.inVent) { b.target = null; b.state = 'search'; b.st = 0; b.searchT = 3; return; }
  b.st += dt;
  const d = dist(b.x, b.y, m.x, m.y);
  const see = !m.hidden && hasLOS(b.x, b.y, m.x, m.y) && d < T * 9;
  if (see) { b.lostT = 0; b.tmem = { x: m.x, y: m.y, t: W.t, m }; } else b.lostT += dt;
  if (m.hidden) { goCheck(b, m.hidden, true); return; }
  if (b.lostT > 4.5) { const tm = b.tmem; b.target = null; if (tm) walkTo(b, tm.x, tm.y, 'investigate'); else { b.state = 'search'; b.st = 0; } return; }
  // 怕火
  const fl = W.crew.find(o => !o.dead && o.firing && dist(o.x, o.y, b.x, b.y) < T * 3.6);
  if (fl && W.learn.fire > 0 && !b.enraged) { beastFlee(b, 'fire'); return; }
  if (b.stage === 0) { if (d < T * .9) { juvBite(b, m); return; } if (b.st > 6) { beastFlee(b, 'give'); return; } }
  else if (d < T * .95 && (b.grabCd || 0) <= 0) { startGrab(b, m); return; }
  b.grabCd = Math.max(0, (b.grabCd || 0) - dt);
  b.repath -= dt;
  if (b.repath <= 0 || !b.path) {
    b.repath = .4;
    const tx = see ? m.x : b.tmem.x, ty = see ? m.y : b.tmem.y;
    const p = findPath(Math.floor(b.x / T), Math.floor(b.y / T), Math.floor(tx / T), Math.floor(ty / T), 'beast');
    if (p) { b.path = pathToPts(p, tx, ty); b.pi = 0; }
    // 門被焊死：改走管道
    if (p && W.learn.weld > 0 && pathHasWelded(p)) { const n = grateInRoom(beastRoom(b)); if (n) { b.ventIntent = { x: tx, y: ty, why: 'hunt' }; walkTo(b, n.x, n.y, 'toVent'); return; } }
  }
  if (b.path) { stepPath(b, dt, st.run * T * (b.stage === 2 ? 1 : .95)); if (b.pi >= b.path.length) b.path = null; }
}
function pathHasWelded(p) { for (let k = 1; k < p.length; k++) { const d = doorBetween(p[k - 1][0], p[k - 1][1], p[k][0], p[k][1]); if (d && d.welded) return true; } return false; }
function grateInRoom(ri, allowSealed) { let best = null; for (const n of SHIP.vn) if (n.room === ri && (allowSealed || !n.sealed)) best = n; return best; }
function startGrab(b, m) {
  if (m.hidden) unhide(m);
  cancelTask(m); m.path = null; m.goal = null;
  if (W.bridgeOp === m.ci) leaveBridge(m);
  m.grabbed = true; b.grabV = m; b.state = 'grab'; b.st = 0; b.grabT = STAGES[b.stage].grab;
  W.grabbing = m; m.seen = 0;
  AU.grab(m.x, m.y, m.ci); shake(8); vibrate([60, 30, 60]);
  bark(m, 'grabbed', true);
  chron('牠撲倒了' + CREW[m.ci].name + '。');
  // 找最近的格柵
  const ri = beastRoom(b);
  let n = grateInRoom(ri);
  if (!n) { let bd = Infinity; for (const v of SHIP.vn) { if (v.sealed) continue; const dd = dist(v.x, v.y, b.x, b.y); if (dd < bd && dd < T * 10) { bd = dd; n = v; } } }
  b.dragTo = n;
  if (n) { const p = findPath(Math.floor(b.x / T), Math.floor(b.y / T), Math.floor(n.x / T), Math.floor(n.y / T), 'beast'); b.path = p ? pathToPts(p, n.x, n.y) : null; b.pi = 0; }
  // 自救：電擊棒
  if (hasItem(m, 'prod')) { setTimeout(() => { if (W && b.grabV === m && m.grabbed) { const s = hasItem(m, 'prod'); if (s) { s.ch--; if (s.ch <= 0) takeItem(m, 'prod'); stunBeast(b, 2.5); hurtBeast(b, 12, 'prod', m); AU.zap(b.x, b.y); spark(b.x, b.y, '#9fd8ff'); toast(CREW[m.ci].name + '用電擊棒電了牠一下，掙脫了！', 'good'); } } }, 900);
  }
}
function stGrab(b, dt, st) {
  const m = b.grabV;
  if (!m || m.dead) { b.grabV = null; W.grabbing = null; b.state = 'search'; b.st = 0; return; }
  b.st += dt; b.grabT -= dt;
  if (b.path && b.pi < b.path.length) { stepPath(b, dt, T * 1.25); }
  m.x = lerp(m.x, b.x - Math.cos(b.ang) * 14, dt * 12); m.y = lerp(m.y, b.y - Math.sin(b.ang) * 14, dt * 12); m.ang = b.ang + Math.PI;
  const atGrate = b.dragTo && dist(b.x, b.y, b.dragTo.x, b.dragTo.y) < T * .6;
  if ((b.grabT <= 0 && (atGrate || !b.dragTo)) || (atGrate && b.grabT <= 0)) takeVictim(b, m);
  else if (b.grabT < -3) takeVictim(b, m);
}
function takeVictim(b, m) {
  m.grabbed = false; W.grabbing = null; b.grabV = null;
  const def = CREW[m.ci];
  b.fed++; b.hp = Math.min(b.maxhp, b.hp + 30);
  if (W.act === 2 && b.nest) {
    m.cocoon = 90; m.x = b.nest.x + R.f(-18, 18); m.y = b.nest.y + R.f(-18, 18); m.hp = Math.max(1, m.hp - 1);
    toast(`<b>${def.name}</b> 被拖進了通風管……巢在${ROOMS[b.nest.room].name}。90 秒內還救得回來！`, 'bad');
    chron(def.name + '被拖走，包進了' + ROOMS[b.nest.room].name + '的巢裡。');
    AU.drag(); b.inVent = true; b.state = 'lurk'; b.st = 0; b.lurkT = R.f(6, 10); b.vnode = (b.dragTo || nearestVent(b.x, b.y)).i;
  } else {
    killCrew(m, '被拖進了通風管'); m.x = b.dragTo ? b.dragTo.x : m.x; m.y = b.dragTo ? b.dragTo.y : m.y;
    if (b.dragTo) { b.inVent = true; b.vnode = b.dragTo.i; b.state = 'lurk'; b.lurkT = R.f(8, 14); }
    else { b.state = 'search'; b.st = 0; }
  }
  W.dir.cool = R.f(22, 34); W.dir.m = 40;
}
function releaseGrab(b, flee) {
  const m = b.grabV; if (!m) return;
  m.grabbed = false; b.grabV = null; W.grabbing = null; W.stats.rescues++;
  if (m.hp > 1) m.hp -= 1;
  m.saved = 2; bark(m, 'saved', true);
  chron(CREW[m.ci].name + '被救了下來。');
  b.grabCd = 3;
  if (flee) beastFlee(b, 'hurt');
}
function flinch(b, why) {
  if (b.grabV) { releaseGrab(b, true); toast('照明彈的強光讓牠鬆開了！', 'good'); }
  else if (b.stage > 0 && !b.enraged) beastFlee(b, 'flare');
}
function stunBeast(b, s) { b.stun = Math.max(b.stun, s); if (b.grabV) releaseGrab(b, false); }
function hurtBeast(b, dmg, src, by) {
  if (b.state === 'dead' || b.state === 'spaced') return;
  b.hp -= dmg; b.dmgWin += dmg; b.dmgT = 4; b.regenCd = 10; W.stats.dmg += dmg;
  b.lastDmg = src;
  if (src === 'fire' && !b.burnedOnce) { b.burnedOnce = true; W.learn.fire++; chron('牠第一次被火燒到，尖叫著往後退。'); }
  if (W.t - (b.hurtSfx || 0) > .35) { b.hurtSfx = W.t; AU.beastHurt(b.x, b.y, b.stage); }
  W.fx.push({ type: 'ichor', x: b.x + R.f(-10, 10), y: b.y + R.f(-10, 10), t: 0, dur: 25 });
  if (b.grabV && dmg >= 2) { b.grabPain = (b.grabPain || 0) + dmg; if (b.grabPain >= 10 || src === 'harpoon' || src === 'boom') { b.grabPain = 0; releaseGrab(b, true); toast('牠鬆開了！', 'good'); } }
  if (b.hp <= 0) { beastDie(b, src); return; }
  const thr = b.stage === 0 ? 6 : b.stage === 1 ? 38 : 62;
  if (b.dmgWin >= thr && b.state !== 'flee' && !b.inVent) {
    if (isTrapped(b)) { b.enraged = true; b.cornered = true; if (b.stage > 0 && by && !by.dead) startChase(b, by); }
    else beastFlee(b, 'hurt');
  }
}
function isTrapped(b) {
  const ri = beastRoom(b);
  const reach = new Set([ri]); const q = [ri];
  while (q.length) { const r = q.shift(); for (const d of SHIP.doors) { if (!(d.broken || d.state === 'open')) continue; const o = d.ra === r ? d.rb : d.rb === r ? d.ra : -2; if (o >= 0 && !reach.has(o)) { reach.add(o); q.push(o); } } }
  for (const n of SHIP.vn) if (reach.has(n.room) && !n.sealed) { const out = n.links.some(L => !(L.damper && SHIP.dampers[L.damper].closed)); if (out) return false; }
  // 只剩關著的門（沒焊）：撞得開，不算被困住，但要時間
  return true;
}
function beastDie(b, src) {
  b.state = 'dead'; b.hp = 0; b.grabV && releaseGrab(b, false);
  AU.beastDeath(b.x, b.y, b.stage); shake(16); flash(.35); vibrate([100, 60, 200]);
  W.phase = 'cine';
  if (b.stage === 0) { chron('牠還沒長大，就死在了' + (ROOMS[beastRoom(b)] || {}).name + '。'); setTimeout(() => endRun('strangle'), 2600); }
  else { chron((src === 'fire' || src === 'boom' ? '火焰吞沒了牠。' : '牠倒下了，再也沒有爬起來。')); W.killSrc = src; setTimeout(() => endRun('burned'), 2800); }
}
function beastFlee(b, why) {
  if (b.inVent) { ventAway(b); return; }
  b.target = null;
  if (why !== 'birth' && why !== 'avoid' && why !== 'seen') W.dir.cool = Math.max(W.dir.cool, b.stage === 2 ? 12 : 20);
  // 最近、離威脅最遠的格柵
  let best = null, bs = -Infinity;
  const ri = beastRoom(b);
  for (const n of SHIP.vn) {
    if (n.sealed) continue;
    const p = findPath(Math.floor(b.x / T), Math.floor(b.y / T), Math.floor(n.x / T), Math.floor(n.y / T), 'beast');
    if (!p) continue;
    let s = -p.length * 2;
    for (const m of W.crew) if (!m.dead && m.cocoon < 0) s += Math.min(8, dist(m.x, m.y, n.x, n.y) / T) * .5;
    if (n.room === ri) s += 4;
    if (p.length > 22) continue;
    if (s > bs) { bs = s; best = n; }
  }
  if (!best) { b.cornered = true; b.state = 'search'; b.st = 0; b.searchT = 2; return; }
  b.cornered = false;
  walkTo(b, best.x, best.y, 'flee');
  b.fleeWhy = why;
}
function beastToVent(b) {
  const n = grateInRoom(beastRoom(b));
  if (n) walkTo(b, n.x, n.y, 'toVent'); else beastFlee(b, 'leave');
}
function tryEnterVent(b) {
  const n = nearestVent(b.x, b.y, v => !v.sealed);
  if (!n || dist(n.x, n.y, b.x, b.y) > T * 1.2) { b.state = 'search'; b.st = 0; b.searchT = 2; return; }
  b.x = n.x; b.y = n.y; b.vnode = n.i; b.state = 'sink'; b.st = 0;
  AU.ventIn(n.x, n.y); n.shake = .8;
  if (b.ventIntent) { const vi = b.ventIntent; b.ventIntent = null; setTimeout(() => { if (W && b.inVent && b.state === 'lurk') ventToward(b, vi.x, vi.y, vi.why); }, 600); }
}
function ventToward(b, x, y, why) {
  if (!b.inVent) return;
  const goal = nearestVent(x, y, n => !n.sealed && n.room === roomIdxW(x, y)) || nearestVent(x, y, n => !n.sealed);
  if (!goal) return;
  if (b.state === 'vent' && b.vgoal === goal.i) { b.vwhy = why; return; }
  if (b.state === 'telegraph' && b.exitNode === goal.i) return;
  if (goal.i === b.vnode) { startTelegraph(b, goal, why); return; }
  const path = ventPath(b.vnode, goal.i, { bash: false });
  if (!path) { const p2 = ventPath(b.vnode, goal.i, { bash: true }); if (!p2) return; b.vpath = p2; } else b.vpath = path;
  b.vk = 0; b.vd = 0; b.state = 'vent'; b.vwhy = why; b.vgoal = goal.i;
}
function ventAway(b) {
  const reach = ventReach(b.vnode);
  let best = null, bs = -1;
  for (const i of reach) { const n = SHIP.vn[i]; let s = 0; for (const m of W.crew) if (!m.dead && m.cocoon < 0) s += Math.min(14, dist(m.x, m.y, n.x, n.y) / T); s += R.f(0, 6); if (s > bs) { bs = s; best = n; } }
  if (!best || best.i === b.vnode) { b.state = 'lurk'; b.lurkT = R.f(8, 14); return; }
  b.vpath = ventPath(b.vnode, best.i); if (!b.vpath) { b.state = 'lurk'; b.lurkT = 6; return; }
  b.vk = 0; b.vd = 0; b.state = 'vent'; b.vwhy = 'retreat'; b.vgoal = best.i;
}
function stVent(b, dt, st) {
  const L = b.vpath && b.vpath[b.vk];
  if (!L) { b.state = 'lurk'; b.lurkT = R.f(2, 5); return; }
  const from = b.vnode, rev = L.a !== from;
  if (L.damper && SHIP.dampers[L.damper].closed) {
    // 被閘門擋住
    const dm = SHIP.dampers[L.damper];
    if (b.vwhy === 'hunt' || b.vwhy === 'investigate' || W.act === 2) { dm.bash += dt; if ((b.bangT = (b.bangT || 0) - dt) <= 0) { b.bangT = .6; AU.bang(dm.x, dm.y, .7); noise(dm.x, dm.y, T * 6, 'beast'); } if (dm.bash > 10) { dm.closed = false; dm.bash = 0; toast('牠撞開了一道通風閘門。', 'bad'); } }
    else { b.state = 'lurk'; b.lurkT = R.f(2, 4); }
    return;
  }
  const sp = st.vent * T * (b.vwhy === 'retreat' ? 1.1 : 1);
  b.vd += sp * dt; b.moving = true; b.speedNow = sp;
  const u = clamp(b.vd / L.len, 0, 1), pt = polyPointAt(L.pts, rev ? 1 - u : u);
  const pa = Math.atan2(pt[1] - b.y, pt[0] - b.x); if (Math.hypot(pt[0] - b.x, pt[1] - b.y) > .5) b.ang = pa;
  b.x = pt[0]; b.y = pt[1];
  b.crawlT = (b.crawlT || 0) - dt; if (b.crawlT <= 0) { b.crawlT = .5; AU.crawl(b.x, b.y); noise(b.x, b.y, T * 1.6, 'beast'); }
  for (const n of SHIP.vn) if (dist(n.x, n.y, b.x, b.y) < T * .8) n.shake = Math.max(n.shake, .3);
  if (u >= 1) {
    b.vnode = rev ? L.a : L.b; b.vk++; b.vd = 0;
    if (b.vk >= b.vpath.length) {
      const n = SHIP.vn[b.vnode];
      if (b.vwhy === 'retreat' || b.vwhy === 'roam') { b.state = 'lurk'; b.lurkT = b.vwhy === 'retreat' ? R.f(10, 18) : R.f(3, 7); }
      else if (n.sealed) { b.state = 'lurk'; b.lurkT = 2; }
      else startTelegraph(b, n, b.vwhy);
    }
  }
}
function stLurk(b, dt) {
  b.lurkT -= dt;
  if (b.lurkT > 0) return;
  decideNext(b);
}
function startTelegraph(b, n, why) {
  if (n.sealed) { b.state = 'lurk'; b.lurkT = 1.5; return; }
  b.state = 'telegraph'; b.st = 0; b.exitNode = n.i; b.exitWhy = why;
  b.telDur = b.stage === 0 ? R.f(.9, 1.4) : R.f(1.6, 2.4);
  n.drip = 1; AU.ventRattle(n.x, n.y, b.stage);
}
function stTelegraph(b, dt) {
  b.st += dt;
  const n = SHIP.vn[b.exitNode];
  n.shake = 1; n.drip = Math.min(1.5, n.drip + dt);
  if (n.sealed) { b.state = 'lurk'; b.lurkT = 1; return; }
  if (b.st >= b.telDur) {
    b.inVent = false; b.x = n.x; b.y = n.y; b.state = 'search'; b.st = 0; b.searchT = R.f(2.5, 4);
    for (const s of b.seg) { s.x = b.x + R.f(-4, 4); s.y = b.y + R.f(-4, 4); }
    for (const L of b.legs) { L.fx = b.x + R.f(-12, 12); L.fy = b.y + R.f(-12, 12); L.t = 1; }
    AU.emerge(n.x, n.y, b.stage); noise(n.x, n.y, T * 3, 'beast');
    const src = b.lure;
    if (b.exitWhy === 'investigate') learnFromLure(b);
    // 第三幕：牠會察覺陷阱
    if (b.stage === 2 && b.exitWhy === 'investigate' && n.room === ROOM.airlock.i && !W.crew.some(m => !m.dead && m.room === n.room) && R.chance(src === 'alarm' ? .4 : .2) && !SHIP.dampers.D9.closed && !n.sealed) {
      b.state = 'search'; b.st = 0; b.searchT = .9; b.wary = true; toast('牠在氣閘裡停了一下……好像察覺到不對勁。', 'learn');
    }
    if (b.exitWhy === 'check' && b.checkSpot) { goCheck(b, b.checkSpot, true); }
    else if (b.exitWhy === 'nest') { b.state = 'search'; }
    const near = W.crew.filter(m => !m.dead && m.cocoon < 0 && !m.hidden && dist(m.x, m.y, b.x, b.y) < T * 6 && hasLOS(m.x, m.y, b.x, b.y));
    if (b.exitWhy === 'bite' && b.target && !b.target.dead) { startChase(b, b.target); }
    else if (near.length && b.stage > 0) startChase(b, near[0]);
  }
}
function stFeed(b, dt) {
  b.st += dt;
  if ((b.feedSnd = (b.feedSnd || 0) - dt) <= 0) { b.feedSnd = 1.6; AU.feed(b.x, b.y); noise(b.x, b.y, T * 3.2, 'beast');
    const r = ROOMS[beastRoom(b)]; const ear = W.crew.find(m => !m.dead && m.cocoon < 0 && dist(m.x, m.y, b.x, b.y) < T * 7 && m.room !== beastRoom(b)); if (ear && r && (W.feedHeard || 0) < W.t) { W.feedHeard = W.t + 20; say(ear.id, r.name + '那邊……有東西在吃東西的聲音。'); } }
  if (b.st > b.feedT) { b.fedHere = false; beastToVent(b); }
}
// 下一步去哪
function decideNext(b) {
  if (b.inVent) {
    // 導演的提示
    let goalRoom = -1;
    const crew = aliveCrew().filter(m => !m.inVent);
    if (b.stage === 0) {
      // 幼體：找沒人的房間出去吃東西
      const empty = ROOMS.filter(r => !crewInRoom(r.i) && r.kind !== 'hall' && SHIP.vn.some(n => n.room === r.i && !n.sealed));
      if (empty.length && R.chance(.7)) goalRoom = R.pick(empty).i;
    } else if (W.dir.hint != null) { goalRoom = W.dir.hint; W.dir.hint = null; }
    else if (W.dir.cool <= 0 && crew.length && R.chance(b.stage === 2 ? .75 : .55)) { const m = R.pick(crew); goalRoom = m.room; }
    if (goalRoom >= 0) {
      const n = SHIP.vn.find(v => v.room === goalRoom && !v.sealed);
      if (n) { if (n.i === b.vnode) { b.state = 'lurk'; b.lurkT = R.f(2, 4); if (b.stage === 0 || R.chance(.5)) startTelegraph(b, n, 'prowl'); return; } const p = ventPath(b.vnode, n.i); if (p) { b.vpath = p; b.vk = 0; b.vd = 0; b.state = 'vent'; b.vwhy = b.stage === 0 ? 'prowl' : (W.dir.cool > 0 ? 'roam' : 'prowl'); b.vgoal = n.i; return; } }
    }
    // 亂逛
    const reach = Array.from(ventReach(b.vnode)).filter(i => i !== b.vnode);
    if (!reach.length) { b.state = 'lurk'; b.lurkT = 4; b.stuckT = (b.stuckT || 0) + 4; if (b.stuckT > 12) { const n = SHIP.vn[b.vnode]; if (!n.sealed) startTelegraph(b, n, 'prowl'); else { n.sealed = false; toast('牠扯開了一片焊死的格柵。', 'bad'); } b.stuckT = 0; } return; }
    const i = R.pick(reach); b.vpath = ventPath(b.vnode, i); b.vk = 0; b.vd = 0; b.state = 'vent'; b.vwhy = 'roam'; b.vgoal = i;
    return;
  }
  // 在房間裡：通常回管道，有時候走到隔壁房
  if (b.stage > 0 && R.chance(W.dir.cool > 0 ? .1 : .45)) {
    const ri = beastRoom(b);
    const nb = SHIP.doors.filter(d => (d.ra === ri || d.rb === ri) && d.kind !== 'airout').map(d => d.ra === ri ? d.rb : d.ra).filter(x => x >= 0);
    if (nb.length) { const r = ROOMS[R.pick(nb)]; walkTo(b, r.cx + R.f(-T, T), r.cy + R.f(-T, T), 'prowl'); return; }
  }
  beastToVent(b);
}

function juvBite(b, m) {
  if ((b.biteCd || 0) > W.t) return;
  b.biteCd = W.t + 2.5;
  b.ang = Math.atan2(m.y - b.y, m.x - b.x); b.jaw = 1;
  woundCrew(m, '被幼體咬穿了喉嚨'); AU.beastHurt(b.x, b.y, 0); spark(m.x, m.y, '#c84040');
  chron('牠被逼到角落，咬了' + CREW[m.ci].name + '一口。');
  bark(m, 'hurt', true);
  beastFlee(b, 'bite');
}
// ---------- 導演 ----------
function updateDirector(dt) {
  const D = W.dir, b = W.beast;
  if (!b || b.state === 'dormant' || b.state === 'dead') return;
  D.cool = Math.max(0, D.cool - dt);
  let near = Infinity;
  for (const m of W.crew) if (!m.dead && m.cocoon < 0) near = Math.min(near, dist(m.x, m.y, b.x, b.y));
  if (b.visible) D.m += dt * 22; else if (near < T * 5) D.m += dt * 9; else D.m -= dt * 6;
  D.m = clamp(D.m, 0, 100);
  W.tension = lerp(W.tension, clamp((b.visible ? .7 : 0) + (near < T * 8 ? (1 - near / (T * 8)) * .6 : 0) + (b.state === 'chase' || b.state === 'grab' ? .4 : 0), 0, 1), dt * 2);
  if (D.m >= 85) { D.hi += dt; if (D.hi > (W.act === 2 ? 20 : 14) && b.state !== 'grab' && b.stage > 0) { D.hi = 0; D.m = 50; beastFlee(b, 'director'); D.cool = R.f(18, 28); } }
  else D.hi = Math.max(0, D.hi - dt);
  if (D.m < 15) D.lo += dt; else D.lo = 0;
  if (W.act === 0 && W.actT > 50 && !W.flags.sight0 && !W.flags.firstNudge) { W.flags.firstNudge = true; const grp = aliveCrew().filter(m => W.crew.some(o => o !== m && !o.dead && o.room === m.room)); const m = R.pick(grp.length ? grp : aliveCrew()); if (m) { D.hint = m.room; if (b.inVent && b.state === 'lurk') b.lurkT = 0; } }
  const loLim = W.act === 0 ? 55 : W.act === 1 ? 40 : 26;
  if (D.lo > loLim && D.cool <= 0) { D.lo = 0; const crew = aliveCrew(); if (crew.length) { D.hint = R.pick(crew).room; if (b.inVent && b.state === 'lurk') b.lurkT = 0; } }
  // 模仿人聲
  if (W.mods.mimic && W.act >= 1) {
    W.mimicT -= dt;
    if (W.mimicT <= 0 && !b.visible && b.state !== 'grab') { W.mimicT = R.f(55, 90); mimic(b); }
  }
  // 公司的密令
  if (W.mods.agent && W.act === 1 && !W.agentDone && !W.agent && W.actT > 110) {
    const wen = crewById('wen');
    if (wen && !wen.dead && wen.cocoon < 0 && !wen.grabbed) {
      const tgt = W.sys.airlock ? 'airlock' : W.sys.shuttle ? 'shuttle' : null;
      if (tgt && R.chance(dt * .06)) startSabotage(wen, tgt);
    }
  }
}
function mimic(b) {
  const dead = W.crew.filter(m => m.dead), alive = aliveCrew();
  const who = dead.length && R.chance(.6) ? R.pick(dead) : R.pick(alive.filter(m => dist(m.x, m.y, b.x, b.y) > T * 6)) || R.pick(alive);
  if (!who) return;
  const r = ROOMS[beastRoom(b)] || roomAt(b.x, b.y);
  const line = R.pick(MIMIC);
  W.ears.push({ x: b.x, y: b.y, t: 0, who: who.id });
  sayMimic(who.id, (r ? '（' + r.name + '）' : '') + line);
  AU.mimic(b.x, b.y);
  if (!W.flags.mimic) { W.flags.mimic = true; chron('通風管裡傳來' + CREW[who.ci].name + '的聲音。可是' + CREW[who.ci].name + (who.dead ? '已經死了。' : '不在那裡。')); }
  // 有人會想過去看
  for (const m of alive) {
    if (m === who || m.task || m.path || m.hidden || m.stance === 'hold' || W.sel === m.ci) continue;
    const care = REL[m.id] && REL[m.id].includes(who.id);
    if (care && R.chance(.45) && dist(m.x, m.y, b.x, b.y) < T * 16) { bark(m, 'mimicGo', true); orderMove(m, b.x, b.y, false, true); m.mimicLured = true; }
  }
}
function startSabotage(m, what) {
  W.agent = { m, what, t: 0 };
  const c = what === 'airlock' ? SHIP.con.airlock : SHIP.con.shuttle;
  cancelTask(m); m.goal = null;
  m.goal = { kind: 'sab', target: c };
  orderMove(m, c.sx, c.sy, false, true);
  m.secret = true;
}
function doSabotage(m, what) {
  W.sys.sabotaged = what; W.agentDone = true; m.secret = false; W.agent = null;
  if (what === 'airlock') W.sys.airlock = false;
  if (what === 'shuttle') W.sys.shuttle = false;
  toast((what === 'airlock' ? '氣閘控制盤' : '逃生艇') + '突然故障了……保險絲被拔掉了。是誰？', 'bad');
  chron('有人拔掉了' + (what === 'airlock' ? '氣閘控制盤' : '逃生艇') + '的保險絲。');
}
function confront(m) {
  if (!W.agent || W.agent.m !== m) return false;
  W.agent = null; W.agentDone = true; m.secret = false; m.goal = null; m.path = null; cancelTask(m);
  W.confessed = true; chron('溫曼承認了：公司給她的密令，是把樣本活著帶回去。');
  UI.confession();
  return true;
}

// ---------- 自動行為 ----------
function autoBehavior(m, dt) {
  const b = W.beast;
  if (m.goal && m.goal.kind === 'sab') { startTask(m, 'sabotage', 8, { what: W.agent ? W.agent.what : 'airlock', crouch: true }); m.goal = null; return; }
  if (!b || b.state === 'dormant' || b.state === 'dead' || m.hidden || m.inVent) return;
  // 格柵在動：先退開
  if (b.state === 'telegraph' && b.exitNode >= 0 && (m.stance === 'guard' || m.panic)) {
    const n = SHIP.vn[b.exitNode];
    if (dist(n.x, n.y, m.x, m.y) < T * 3.6 && hasLOS(m.x, m.y, n.x, n.y) && (m.fleeCd || 0) < W.t) {
      m.fleeCd = W.t + 2;
      if (hasItem(m, 'flamer') || hasItem(m, 'harpoon')) { m.ang = Math.atan2(n.y - m.y, n.x - m.x); bark(m, 'see'); return; }
      const dx = m.x - n.x, dy = m.y - n.y, d = Math.hypot(dx, dy) || 1;
      let tx = m.x + dx / d * T * 3, ty = m.y + dy / d * T * 3;
      const r = ROOMS[m.room]; if (r) { tx = clamp(tx, r.x0 + T * .5, r.x1 - T * .5); ty = clamp(ty, r.y0 + T * .5, r.y1 - T * .5); }
      orderMove(m, tx, ty, true, true); say(m.id, R.pick(['格柵在動！', '地板下面有東西！', '退後——格柵！'])); return;
    }
  }
  const see = !b.inVent && canSee(m, b.x, b.y);
  if (!see) return;
  const d = dist(m.x, m.y, b.x, b.y);
  const guard = m.stance === 'guard' || m.rage;
  // 救人
  if (guard && b.grabV && b.grabV !== m) {
    if (hasItem(m, 'harpoon') && d < T * 6) { shootHarpoon(m); return; }
    if (hasItem(m, 'flamer') && d < T * 3.3) { startFire(m); return; }
    if (hasItem(m, 'flare') && d < T * 6) { throwItem(m, 'flare', b.x, b.y); return; }
    if (hasItem(m, 'prod')) { if (d < T * 1.4) { useProd(m); return; } orderMove(m, b.x, b.y, true, true); return; }
  }
  if (guard && b.stage > 0) {
    if (hasItem(m, 'flamer') && d < T * 3.2 && (b.target === m || d < T * 2.4)) { startFire(m); return; }
    if (hasItem(m, 'prod') && d < T * 1.3) { useProd(m); return; }
    if (hasItem(m, 'harpoon') && b.target === m && d < T * 4.5) { shootHarpoon(m); return; }
  }
  if (guard && b.stage === 0 && d < T * 3) {
    if (hasItem(m, 'flamer') && d < T * 3) { startFire(m); return; }
    if (hasItem(m, 'prod') && d < T * 1.4) { useProd(m); return; }
  }
  // 逃：手上沒有能用的東西、牠衝著自己來
  if (b.stage > 0 && (b.target === m || d < T * 2.6) && !(guard && (hasItem(m, 'flamer') || hasItem(m, 'prod')))) {
    if ((m.fleeCd || 0) > W.t) return;
    m.fleeCd = W.t + 1.2;
    const away = fleeSpot(m, b);
    if (away) { orderMove(m, away[0], away[1], true, true); m.fleeing = true; bark(m, 'flee'); }
  }
}
function fleeSpot(m, b) {
  let best = null, bs = -Infinity;
  for (const r of ROOMS) {
    if (r.kind === 'airlock') continue;
    const d1 = dist(r.cx, r.cy, b.x, b.y), d0 = dist(r.cx, r.cy, m.x, m.y);
    if (d0 > T * 9) continue;
    const s = d1 - d0 * .6 + (r.i === m.room ? -999 : 0);
    if (s > bs) { bs = s; best = [r.cx, r.cy]; }
  }
  return best;
}
// 阿傑爬管道
function startCrawl(m, n) {
  if (m.id !== 'jie') return toast('只有阿傑鑽得進去。', 'bad');
  if (n.sealed) return toast('這片格柵焊死了。', 'bad');
  m.inVent = true; m.vnode = n.i; m.x = n.x; m.y = n.y; m.task = { type: 'crawl', t: 0, dur: 1e9 }; m.hidden = null;
  toast('阿傑鑽進了通風管。點一個格柵讓他爬過去。', ''); AU.ventIn(n.x, n.y);
}
function crawlTo(m, n) {
  const p = ventPath(m.vnode, n.i); if (!p) return toast('閘門關著，爬不過去。', 'bad');
  m.vpath = p; m.vk = 0; m.vd = 0; m.vgoal = n.i; m.task = { type: 'crawl', t: 0, dur: 1e9, moving: true };
}
function updateCrawl(m, dt) {
  if (!m.inVent || !m.vpath) return;
  const L = m.vpath[m.vk]; if (!L) { exitVent(m); return; }
  if (L.damper && SHIP.dampers[L.damper].closed) { m.vpath = null; toast('前面的閘門關了。', 'bad'); return; }
  const from = m.vnode, rev = L.a !== from;
  m.vd += T * 1.5 * dt;
  const u = clamp(m.vd / L.len, 0, 1), pt = polyPointAt(L.pts, rev ? 1 - u : u);
  m.ang = Math.atan2(pt[1] - m.y, pt[0] - m.x); m.x = pt[0]; m.y = pt[1]; m.moving = true; m.walkPh += dt * 8;
  if ((m.stepT -= dt) <= 0) { m.stepT = .6; noise(m.x, m.y, T * 1.2, 'step'); }
  if (u >= 1) { m.vnode = rev ? L.a : L.b; m.vk++; m.vd = 0; if (m.vk >= m.vpath.length) exitVent(m); }
  const b = W.beast; if (b && b.inVent && dist(b.x, b.y, m.x, m.y) < T * 1.2 && b.stage > 0) { m.inVent = false; killCrew(m, '在通風管裡遇上了牠'); }
}
function exitVent(m) {
  const n = SHIP.vn[m.vnode];
  if (n.sealed) { toast('出口焊死了，阿傑只能往回爬。', 'bad'); m.vpath = null; return; }
  m.inVent = false; m.vpath = null; m.task = null; m.x = n.x; m.y = n.y; AU.ventOut(n.x, n.y); toast('阿傑從' + ROOMS[n.room].name + '的格柵爬了出來。');
}

// ---------- 幕 ----------
function updateActs(dt) {
  const A = ACTS[W.act];
  if (W.act === 0) {
    if (W.actT > 270 && !W.flags.moltWarn) { W.flags.moltWarn = true; toast('通風管裡傳來喀啦、喀啦的聲音……像是有東西在脫殼。', 'bad'); AU.molt(); }
    if (W.actT >= A.dur) { const b = W.beast; if (!b.inVent && b.state !== 'sink') { if (b.state !== 'toVent' && b.state !== 'flee') beastToVent(b); if (W.actT < A.dur + 20) return; } toInterlude(1); }
  } else if (W.act === 1) {
    if (W.actT >= A.dur - 60 && !W.flags.frenzyWarn) { W.flags.frenzyWarn = true; toast('還剩一分鐘。牠越來越躁動了——再不執行計畫，牠就要築巢。', 'bad'); }
    if (W.actT >= A.dur && !W.grabbing) toInterlude(2);
    W.finalPlanReady = Object.keys(PLANS).some(p => p !== 'wait' && planReady(p));
  } else if (W.act === 2) {
    if (W.sys.sd >= 0) { W.sys.sd -= dt; if (W.sys.sd <= 30 && !W.flags.sd30) { W.flags.sd30 = true; toast('自毀倒數 30 秒！', 'bad'); } if (W.sys.sd <= 0) { W.sys.sd = -2; selfDestructBoom(); } }
    if (W.plan === 'wait' && W.sys.rescue >= 0) { W.sys.rescue -= dt; if (W.sys.rescue <= 0 && W.phase === 'play') { W.phase = 'cine'; chron('公司的船靠上來了。'); setTimeout(() => endRun('company'), 1500); } }
  }
  for (const m of W.crew) if (m.inVent) updateCrawl(m, dt);
}
function selfDestructBoom() {
  W.phase = 'cine';
  flash(1); shake(30); AU.boom(W.crew[0].x, W.crew[0].y, true);
  const aboard = W.crew.filter(m => m.aboard && !m.dead);
  if (!aboard.length) { for (const m of W.crew) if (!m.dead) killCrew(m, '和夜鷺號一起炸成了碎片'); setTimeout(() => endRun('lost'), 1800); }
}
function planReady(p) {
  const S0 = W.sys;
  if (p === 'airlock') return S0.airlock && S0.auth;
  if (p === 'burn') { let f = 0, fuel = 0; for (const m of aliveCrew()) { for (const s of m.inv) { if (s.it === 'flamer') f++; if (s.it === 'fuel') fuel++; } } fuel += W.items.filter(i => i.it === 'fuel').length + W.traps.filter(t => t.type === 'fuel').length; return f >= 2 || (f >= 1 && fuel >= 1); }
  if (p === 'abandon') return S0.shuttle;
  return true;
}
function toInterlude(n) {
  W.phase = 'scene';
  for (const m of W.crew) { if (m.grabbed && W.beast.grabV === m) releaseGrab(W.beast, false); m.panic = null; m.freeze = 0; }
  UI.interlude(n);
}
function startAct(n) {
  W.act = n; W.actT = 0; W.phase = 'play';
  const b = W.beast;
  const far = SHIP.vn.slice().sort((a, c) => { const s = v => Math.min(...aliveCrew().map(m => dist(m.x, m.y, v.x, v.y))); return s(c) - s(a); })[0];
  if (n === 1) {
    const molt = b && b.inVent && b.vnode >= 0 ? SHIP.vn[b.vnode] : far;
    const nb = makeBeast(molt.x, molt.y, 1); nb.inVent = true; nb.vnode = molt.i; nb.state = 'lurk'; nb.lurkT = 14; W.beast = nb;
    W.dir.cool = 14; W.dir.m = 0; W.sys.lock = false; W.moltRoom = molt.room;
    setTimeout(() => toast('艦長解除了檢疫封鎖：氣閘控制盤和逃生艇現在修得了。', 'good'), 1500);
    // 船員在餐廳集合
    gatherAt(ROOM.mess);
    chron('牠在通風管裡蛻了殼。殼有一個人那麼長。');
    if (W.stance === 'trap') { for (const m of aliveCrew()) { if (giveItem(m, 'lure')) break; } for (const m of aliveCrew().reverse()) { if (giveItem(m, 'lure')) break; } }
  }
  if (n === 2) {
    const ob = b; const nb = makeBeast(ob.x, ob.y, 2); nb.inVent = ob.inVent; nb.vnode = ob.vnode >= 0 ? ob.vnode : far.i; if (!nb.inVent) { nb.inVent = true; nb.vnode = far.i; nb.x = far.x; nb.y = far.y; } nb.state = 'lurk'; nb.lurkT = 8;
    nb.learnCarry = true; W.beast = nb;
    // 巢
    const cands = ['lab', 'storage', 'life', 'cryo'].map(id => ROOM[id]).sort((a, c) => { const s = r => Math.min(...aliveCrew().map(m => dist(m.x, m.y, r.cx, r.cy))); return s(c) - s(a); });
    const nr = cands[0]; const nv = SHIP.vn.find(v => v.room === nr.i) || { x: nr.cx, y: nr.cy };
    nb.nest = { room: nr.i, x: nr.cx, y: nr.cy };
    W.nest = nb.nest;
    if (W.plan === 'wait') W.sys.rescue = 210;
    if (W.plan === 'airlock' && !W.power.on.airlock) toast('記得：要打開氣閘外門，得先在電力配置把「氣閘」打開（兩格）。', '');
    chron('牠又變了一次。' + nr.name + '裡開始長出黏膩的東西——牠在築巢。');
  }
  if (n === 1) { CAM.x = ROOM.mess.cx; CAM.y = ROOM.mess.cy; CAM.follow = -1; CAM.freeT = 0; W.sel = -1; }
  UI.onAct();
}
function gatherAt(r) {
  let k = 0;
  for (const m of W.crew) {
    if (m.dead || m.cocoon >= 0) continue;
    if (m.hidden) unhide(m);
    m.inVent = false; m.task = null; m.path = null; m.goal = null; m.grabbed = false;
    const spots = [[2, 15], [5.5, 15], [2, 18.6], [5.5, 18.6], [2.2, 16.8], [5.6, 16.8]];
    const s = spots[k++ % spots.length]; m.x = (s[0] + .5) * T; m.y = (s[1] + .5) * T; m.ang = Math.atan2(17 * T - m.y, 4 * T - m.x);
    m.bpm = Math.min(m.bpm, 100); m.virtueTried = false; if (!m.virtue) m.virtue = false;
  }
  W.bridgeOp = -1;
}
function learnToast(key, text) { if (W.flags['L' + key]) return; W.flags['L' + key] = true; toast(text, 'learn'); chron(text.replace(/。$/, '') + '。'); }

// ---------- 目標 ----------
function updateObjectives() {
  const O = [];
  if (W.act === 0) {
    O.push({ t: '派人坐上<b>艦橋主控台</b>（看全船感測器、遠端開關門）', done: !!W.flags.bridged });
    O.push({ t: `搜刮裝備（已翻 ${W.stats.searched} 處）`, done: W.stats.searched >= 4 });
    O.push({ t: '可選：趁牠還小，把牠困在房間裡解決掉', opt: true });
    O.push({ t: '氣閘、逃生艇被檢疫封鎖，第二幕才修得了', tip: true });
    O.push({ t: '牠 ' + fmtT(Math.max(0, ACTS[0].dur - W.actT)) + ' 後長大', info: true, timer: true });
  } else if (W.act === 1) {
    O.push({ t: '準備一個最終計畫（任選一個）：', head: true });
    O.push({ t: `氣閘：修好<b>氣閘控制盤</b>（⚙4），再讓艦長在艦橋<b>授權</b>`, done: planReady('airlock'), sub: true, part: (W.sys.airlock ? 1 : 0) + (W.sys.auth ? 1 : 0) });
    O.push({ t: '燒殺：兩把<b>火焰噴射器</b>，或一把加一罐燃料罐', done: planReady('burn'), sub: true });
    O.push({ t: '棄船：修好<b>逃生艇</b>（⚙6）', done: planReady('abandon'), sub: true });
    if (W.sys.sabotaged) O.push({ t: (W.sys.sabotaged === 'airlock' ? '氣閘控制盤' : '逃生艇') + '被破壞了：到那裡重修（⚙2）', bad: true });
    O.push({ t: '牠 ' + fmtT(Math.max(0, ACTS[1].dur - W.actT)) + ' 後築巢', info: true, timer: true });
  } else {
    const b = W.beast;
    if (W.plan === 'airlock') {
      O.push({ t: '電力配置打開<b>氣閘</b>（兩格）', done: !!W.power.on.airlock });
      O.push({ t: '把牠引進<b>氣閘</b>（誘餌、警報、小蝸……或人當誘餌）', done: !b.inVent && beastRoom(b) === ROOM.airlock.i });
      O.push({ t: '關上<b>氣閘內門</b>，再從艦橋或氣閘控制盤打開外門', done: SHIP.door.a_in.state === 'closed' });
      O.push({ t: '牠一進氣閘就關 D9 閘門（或先焊死氣閘格柵）', tip: true });
      O.push({ t: '噪音誘餌比警報更騙得到牠；最好的誘餌……是人', tip: true });
    } else if (W.plan === 'burn') {
      O.push({ t: '把牠困在一個房間：關門、焊死格柵或關閘門', done: !b.inVent && isTrapped(b) });
      O.push({ t: `燒到牠倒下（牠還剩 ${Math.max(0, Math.round(b.hp / b.maxhp * 100))}%）`, done: false });
    } else if (W.plan === 'abandon') {
      O.push({ t: '艦長到反應爐啟動<b>自毀裝置</b>', done: W.sys.sd >= 0 || W.sys.sd === -2 });
      O.push({ t: W.sys.sd >= 0 ? `所有人上<b>逃生艇</b>（自毀 ${fmtT(W.sys.sd)}）` : '所有人上<b>逃生艇</b>', done: false });
      O.push({ t: '人到齊了就在艇門口按「發射」', tip: true });
    } else {
      O.push({ t: `撐到公司的船來`, done: false }); O.push({ t: '船 ' + fmtT(Math.max(0, W.sys.rescue)) + ' 後到', info: true, timer: true });
    }
    const cc = W.crew.filter(m => m.cocoon >= 0);
    for (const m of cc) O.push({ t: `救出 <b>${CREW[m.ci].name}</b>（巢在${ROOMS[W.nest.room].name}，剩 ${Math.ceil(m.cocoon)} 秒）`, bad: true });
  }
  W.objs = O;
}
