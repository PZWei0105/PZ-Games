// 收藏庫截圖的擺拍工具（給 tests/shots_steps.py 用）：在遊戲頁裡執行，掛在 window.__show
(() => {
  const TT = 48;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const S = __sw.S, CAM = __sw.CAM;
  const crew = id => __sw.W.crew.find(c => c.id === id);

  function quiet() { for (const id of ['#toasts', '#subs']) { const e = document.querySelector(id); if (e) e.innerHTML = ''; } return 'ok'; }
  function freeze() { S.paused = true; return 'ok'; }
  function go(sp = 1) { S.paused = false; S.speed = sp; return 'ok'; }
  function cam(x, y, z) { CAM.x = x * TT; CAM.y = y * TT; CAM.tz = CAM.z = z; CAM.follow = -1; CAM.freeT = 999; CAM.focus = null; }

  // 讓牠沿著一段弧線走到 (x, y)，腳和尾巴自然落位
  function pose(b, x, y, ang, from = ang, len = 2.6) {
    x *= TT; y *= TT;
    b.inVent = false; b.vnode = -1; b.vpath = null; b.path = null; b.target = null; b.ang = ang;
    const N = 60, step = len * TT / N, P = [[x, y]];
    for (let i = N; i > 0; i--) { const h = from + (ang - from) * (i / N), [px, py] = P[0]; P.unshift([px - Math.cos(h) * step, py - Math.sin(h) * step]); }
    b.x = P[0][0]; b.y = P[0][1];
    for (let k = 0; k < b.seg.length; k++) { b.seg[k].x = b.x - Math.cos(from) * k * 11 * b.scale; b.seg[k].y = b.y - Math.sin(from) * k * 11 * b.scale; }
    for (const g of b.legs) { g.fx = g.ox = g.tx = b.x; g.fy = g.oy = g.ty = b.y; g.t = 1; }
    b.moving = true;
    for (let i = 1; i <= N; i++) { b.x = P[i][0]; b.y = P[i][1]; b.ang = from + (ang - from) * (i / N); b.t += 1 / 30; updateBeastRig(b, 1 / 30); }
    b.moving = false; for (let i = 0; i < 8; i++) { b.t += 1 / 30; updateBeastRig(b, 1 / 30); }
    b.visible = true;
    return b;
  }
  function place(id, x, y, o = {}) {
    const m = crew(id);
    if (m.hidden) unhide(m);
    cancelTask(m); m.path = null; m.goal = null; m.panic = null; m.wait = null;
    m.x = x * TT; m.y = y * TT; m.room = roomIdxW(m.x, m.y);
    m.lampOn = o.lamp !== false; m.stance = o.stance || 'walk'; m.follow = o.follow ?? -1;
    if (o.inv) { m.inv = []; for (const it of o.inv) giveItem(m, it); refreshHeld(m); }
    if (o.bpm) m.bpm = o.bpm;
    if (o.at) m.ang = Math.atan2(o.at[1] * TT - m.y, o.at[0] * TT - m.x); else if (o.ang != null) m.ang = o.ang;
    return m;
  }
  function hideIn(id, name) { const m = crew(id); const h = SHIP.hides.find(x => x.name === name); cancelTask(m); m.path = null; m.stance = 'walk'; hide(m, h); return m; }
  function park(id, x, y) { return place(id, x, y, { lamp: false, ang: Math.PI / 2 }); }

  async function start() {
    try { localStorage.clear(); } catch (e) { }
    __sw.G.ckpt = null;
    S.set.hints = false; S.noAdapt = true;
    document.querySelector('#t-go').click();
    await sleep(350);
    for (let i = 0; i < 14 && !(__sw.W && __sw.W.phase === 'play' && !document.querySelector('#s-scene:not(.hide)')); i++) { const sc = document.querySelector('#s-scene'); if (sc) sc.click(); await sleep(90); }
    quiet();
    return __sw.W ? __sw.W.phase : 'none';
  }

  // 第一幕：幼體在貨櫃旁邊
  function juv() {
    const W = __sw.W; go(1);
    const b = W.beast; b.state = 'feed'; b.feedT = 99; b.st = 0;
    pose(b, 9.6, 35.3, Math.PI * .92, Math.PI * .55, 1.6);
    place('batu', 6.0, 34.6, { at: [9.4, 35.2], inv: ['flare'], bpm: 104 });
    place('deng', 5.2, 33.2, { at: [9.4, 35.2], bpm: 96 });
    for (const id of ['wei', 'su', 'jie', 'wen']) park(id, id === 'wei' ? 7 : id === 'su' ? 9 : id === 'jie' ? 2 : 11, 2.5);
    cam(8.2, 34.4, 1.42); quiet();
    return 'ok';
  }

  // 第二幕：成體在餐廳裡聽心跳（主視覺）
  function hero() {
    const W = __sw.W;
    startAct(1); W.phase = 'play'; W.dir.cool = 30; go(1);
    const b = W.beast; b.state = 'search'; b.searchT = 40; b.st = 0;
    pose(b, 5.35, 15.2, -2.35, -Math.PI / 2, 2.8);
    place('wei', 2.55, 14.95, { at: [5.1, 15.3], inv: ['prod'], bpm: 112 });
    place('su', 1.9, 18.95, { at: [5.2, 15.6], inv: ['tracker'], bpm: 120 });
    hideIn('jie', '餐桌底下'); hideIn('deng', '冷藏庫');
    park('wen', 3.0, 11.5); park('batu', 8.0, 23.5);
    cam(3.95, 17.0, 1.36); quiet();
    return 'ok';
  }
  function heroLine() { quiet(); say('su', '別出聲……牠在聽心跳。'); const b = __sw.W.beast; b.sonarFx = .55; return 'ok'; }

  // 屏息：牠貼在冷藏庫前面聽，桌下還躲著一個
  function breath() {
    const W = __sw.W;
    if (W.act !== 1) { startAct(1); }
    W.phase = 'play'; W.dir.cool = 30; go(1);
    hideIn('deng', '冷藏庫'); hideIn('jie', '餐桌底下');
    crew('deng').bpm = 132; crew('jie').bpm = 118;
    park('wei', 8.0, 11.5); park('su', 9.5, 2.5); park('wen', 3.0, 11.5); park('batu', 8.0, 23.5);
    const b = W.beast; const h = SHIP.hides.find(x => x.name === '冷藏庫');
    pose(b, 6.05, 19.05, Math.PI * .22, Math.PI * .95, 2.6);
    b.state = 'check'; b.checkSpot = h; b.checkSaw = false; b.path = null; b.st = .95; b.visible = true;
    W.breathHeld = true; crew('deng').breath = .62; crew('jie').breath = .7;
    cam(4.15, 17.55, 1.36); quiet();
    return 'ok';
  }
  function breathLine() { quiet(); const b = __sw.W.beast; b.sonarFx = .5; __sw.W.breathAlert = { t: __sw.W.t, h: b.checkSpot }; return 'ok'; }

  // 帶隊：左手搖桿，大家跟著走
  function squad() {
    const W = __sw.W; go(1);
    if (W.power.on.lights) togglePower('lights');
    const b = W.beast; b.inVent = true; b.state = 'lurk'; b.lurkT = 99; b.visible = false; b.x = SHIP.vnode.vg1.x; b.y = SHIP.vnode.vg1.y; b.vnode = SHIP.vnode.vg1.i;
    for (const id of ['deng', 'jie']) { const m = crew(id); if (m.hidden) unhide(m); }
    const L = place('wei', 8.0, 26.6, { ang: Math.PI / 2, inv: ['prod', 'flare'], bpm: 96 });
    const a = place('su', 7.55, 25.35, { ang: Math.PI / 2, inv: ['tracker'], bpm: 92 });
    const c = place('batu', 8.45, 25.2, { ang: Math.PI / 2, inv: ['flamer'], bpm: 90 });
    a.follow = L.ci; c.follow = L.ci; a.runPref = c.runPref = false;
    park('deng', 12.5, 11.2); park('jie', 3.5, 11.5); park('wen', 3.0, 9.8);
    __sw.selectCrew(0); S.slowT = 0;
    cam(8.0, 26.9, 1.3); quiet();
    return 'ok';
  }
  function squadStick() {
    const p = joyHome(); joyStart(-7, p[0], p[1]); joyMove(p[0] + 4, p[1] + 40);
    const W = __sw.W; W.crew[0].moving = true; W.crew[0].walkPh = 2.1;
    for (const m of W.crew) if (m.follow === 0) { m.moving = true; m.walkPh = 1.2; }
    quiet(); say('wei', '跟緊我。別跑。');
    return 'ok';
  }
  function squadEnd() { joyEnd(); return 'ok'; }

  // 被抓住：五秒內救人
  function grab() {
    const W = __sw.W; go(1);
    const b = W.beast; b.state = 'search'; b.searchT = 40;
    pose(b, 3.55, 27.3, Math.PI * .97, Math.PI * .6, 2.4);
    const v = place('jie', 2.6, 27.25, { ang: 0, bpm: 150 });
    place('wei', 5.6, 25.4, { at: [3.3, 27.3], inv: ['prod'], bpm: 128 });
    place('batu', 6.05, 27.9, { at: [3.3, 27.3], inv: ['flare'], bpm: 122 });
    park('su', 9.4, 2.2); park('deng', 12, 11.2); park('wen', 3.5, 11.5);
    startGrab(b, v); b.grabT = 4.2;
    cam(3.9, 26.6, 1.36); quiet();
    return 'ok';
  }
  function grabLine() { quiet(); say('wei', '巴圖！照明彈——丟牠臉上！'); return 'ok'; }

  // 艦橋：遠端開關門、閘門、燈與警報
  function bridge() {
    const W = __sw.W;
    if (W.grabbing) { releaseGrab(W.beast); }
    W.grabbing = null; go(1);
    const b = W.beast; b.inVent = true; b.state = 'lurk'; b.lurkT = 99; b.x = SHIP.vnode.vg2.x; b.y = SHIP.vnode.vg2.y; b.vnode = SHIP.vnode.vg2.i; b.visible = false;
    place('wei', 7.4, 2.5, { ang: Math.PI / 2 }); place('su', 9.4, 2.2, { ang: Math.PI / 2 });
    place('jie', 3.2, 25.4, { ang: -1 }); place('deng', 12.3, 26.2, { ang: 2 }); place('wen', 11.8, 11.2, { ang: 0 }); place('batu', 6.0, 34.4, { ang: 0 });
    enterBridge(crew('su')); W.sel = -1; refreshActbar(true);
    for (const id of ['b_aft', 'd_store', 'a_in']) { const d = SHIP.door[id]; d.state = 'closed'; d.open = 0; }
    SHIP.dampers.D7.closed = true; SHIP.dampers.D9.closed = true;
    W.lights[ROOM.cargo.i].on = false; W.lights[ROOM.airlock.i].on = false; W.lightVer = (W.lightVer || 0) + 1;
    const bb = document.querySelector('#b-bridge'); if (bb) bb.click();
    quiet();
    return 'ok';
  }
  function bridgeView() {
    const W = __sw.W;
    CAM.x = 8.5 * TT; CAM.y = 23.5 * TT; CAM.tz = CAM.z = .5; CAM.follow = -1; CAM.freeT = 999;
    W.blips.length = 0; W.blips.push({ x: 12.6 * TT, y: 32.2 * TT, t: .35, vent: true });
    quiet();
    return 'ok';
  }

  // 幕間：選最終計畫
  async function plans() {
    const W = __sw.W;
    if (UI.bridgeMode) closeBridgeMode();
    leaveBridge(crew('su'));
    W.sys.airlock = true; W.sys.auth = true; W.parts = 5;
    for (const m of W.crew) if (m.hidden) unhide(m);
    toInterlude(2);
    for (let i = 0; i < 24 && !document.querySelector('.choice'); i++) { await sleep(120); const sc = document.querySelector('#s-scene'); if (sc && !document.querySelector('.choice')) sc.click(); }
    await sleep(500);
    return document.querySelectorAll('.choice').length;
  }
  async function pickPlan(name) {
    const c = [...document.querySelectorAll('.choice:not([disabled])')].find(x => x.textContent.includes(name));
    if (!c) return 'no-choice';
    c.click(); await sleep(400);
    for (let i = 0; i < 6 && __sw.W.phase !== 'play'; i++) { const sc = document.querySelector('#s-scene'); if (sc) sc.click(); await sleep(100); }
    return __sw.W.act + ' ' + __sw.W.plan + ' ' + __sw.W.phase;
  }

  // 第三幕：拋出去
  function airlock() {
    const W = __sw.W; go(1);
    if (W.power.on.lights) togglePower('lights');
    if (!W.power.on.airlock) togglePower('airlock');
    const b = W.beast; b.state = 'search'; b.searchT = 99; b.st = 0;
    pose(b, 15.15, 33.75, Math.PI, Math.PI * .7, 1.4);
    place('wei', 13.0, 33.55, { at: [15, 33.7], bpm: 118 });
    place('su', 12.2, 34.9, { at: [15, 33.7], inv: ['tracker'], bpm: 110 });
    place('batu', 12.0, 32.4, { at: [15, 33.4], inv: ['flare'], bpm: 116 });
    park('jie', 5, 34); park('deng', 4.4, 36.5); park('wen', 6, 32.2);
    const d = SHIP.door.a_in; d.state = 'closed'; d.open = 0; SHIP.dampers.D9.closed = true;
    openOuterDoor(crew('wei'));
    cam(15.0, 33.8, 1.15);
    return W.sys.cycle;
  }
  async function airlockWatch() {
    const W = __sw.W;
    for (let i = 0; i < 400; i++) { const b = W.beast; if (b.state === 'spaced' && b.st > .32) break; await sleep(16); }
    W.phase = 'freeze'; quiet();
    return W.beast.state + ' ' + W.beast.st.toFixed(2);
  }

  window.__show = { start, juv, hero, heroLine, breath, breathLine, squad, squadStick, squadEnd, grab, grabLine, bridge, bridgeView, plans, pickPlan, airlock, airlockWatch, quiet, freeze, go, cam, pose, place };
  return 'show ready';
})();
