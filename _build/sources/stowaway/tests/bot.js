// 自動玩家：照「氣閘計畫」的路線玩一整局（測試用）
window.__bot = { log: [], stage: 'a1', t: 0 };
(function () {
  const B = window.__bot;
  const L = s => { B.log.push(Math.round(__sw.W.t) + ' ' + s); };
  const C = id => __sw.W.crew.find(m => m.id === id);
  const free = m => m && !m.dead && m.cocoon < 0 && !m.grabbed && !m.task && !m.path && !m.goal && !m.hidden;
  const P = fn => SHIP.props.find(fn);
  function searchNext(m, rooms) {
    const box = SHIP.boxes.filter(b => !b.searched && (!rooms || rooms.includes(ROOMS[b.room].id))).sort((a, b) => dist(a.sx, a.sy, m.x, m.y) - dist(b.sx, b.sy, m.x, m.y))[0];
    if (box) { orderDo(m, 'search', box); return true; }
    return false;
  }
  function tick() {
    const W = __sw.W; if (!W || W.ended) return;
    if (W.phase !== 'play') return;
    const b = W.beast;
    // 救人
    if (W.grabbing) {
      for (const m of W.crew) { if (m.dead || m === W.grabbing || m.cocoon >= 0) continue; if (dist(m.x, m.y, b.x, b.y) < 6 * 48) { if (hasItem(m, 'harpoon') && b.visible) shootHarpoon(m); else if (hasItem(m, 'flare')) throwItem(m, 'flare', b.x, b.y); else if (hasItem(m, 'flamer')) startFire(m); } }
    }
    if (W.act === 0) {
      const su = C('su'), wei = C('wei');
      if (free(su) && W.bridgeOp < 0) orderDo(su, 'con', SHIP.con.bridge);
      for (const id of ['deng', 'jie', 'batu', 'wen']) { const m = C(id); if (free(m)) searchNext(m, id === 'wen' ? ['med', 'capt', 'comms', 'bridge'] : id === 'batu' ? ['cargo', 'quarters', 'lab'] : ['work', 'storage', 'reactor', 'life', 'mess', 'cryo']); }
    } else if (W.act === 1) {
      const wei = C('wei'), su = C('su'), deng = C('deng');
      if (!W.sys.auth && wei && !wei.dead) {
        if (W.bridgeOp >= 0 && W.crew[W.bridgeOp] !== wei) { const op = W.crew[W.bridgeOp]; leaveBridge(op); orderMove(op, 6 * 48, 2.5 * 48); }
        if (free(wei) && W.bridgeOp !== wei.ci) orderDo(wei, 'con', SHIP.con.bridge);
        if (W.bridgeOp === wei.ci && (!wei.task || wei.task.type === 'bridge')) { startTask(wei, 'auth', 5, {}); L('auth'); }
      }
      if (!W.sys.airlock && deng && free(deng)) { if (W.parts >= 3) { orderDo(deng, 'con', SHIP.con.airlock); L('repair airlock'); } else searchNext(deng); }
      if (W.sys.airlock && W.sys.auth && !B.went && W.actT > 1) { B.went = true; L('plan ready'); toInterlude(2); }
      for (const id of ['jie', 'batu', 'wen', 'su']) { const m = C(id); if (free(m) && W.bridgeOp !== (m ? m.ci : -1)) { if (!searchNext(m)) orderMove(m, ROOM.bridge.cx + (m.ci - 3) * 30, ROOM.bridge.cy + 40); } }
    } else if (W.act === 2) {
      if (W.plan !== 'airlock') return;
      if (!W.power.on.airlock) { if (W.power.on.lights) togglePower('lights'); togglePower('airlock'); L('power airlock'); }
      const wei = C('wei');
      if (W.bridgeOp < 0) { const m = (wei && !wei.dead) ? wei : W.crew.find(x => !x.dead && x.cocoon < 0); if (free(m)) orderDo(m, 'con', SHIP.con.bridge); }
      if (!bridgeOn()) return;
      const inner = SHIP.door.a_in, d9 = SHIP.dampers.D9;
      const inAir = !b.inVent && beastRoom(b) === ROOM.airlock.i;
      for (const m of W.crew) if (free(m) && m.ci !== W.bridgeOp) { if (false && hasItem(m, 'lure') && !B.lureT) { orderMove(m, 12.4 * 48, 33.5 * 48, true); B.lureT = W.t; B.lurer = m; } else if (dist(m.x, m.y, ROOM.bridge.cx, ROOM.bridge.cy) > 3 * 48 && m !== B.lurer) orderMove(m, ROOM.bridge.cx + (m.ci - 3) * 30, ROOM.bridge.cy + 40); }
      if (B.lurer && !B.lurer.dead && !B.thrown && dist(B.lurer.x, B.lurer.y, 12.4 * 48, 33.5 * 48) < 30) { throwItem(B.lurer, 'lure', 15.5 * 48, 33.8 * 48); B.thrown = true; L('lure thrown'); orderMove(B.lurer, ROOM.bridge.cx, ROOM.bridge.cy + 40, true); }
      if (!B.baitT || W.t - B.baitT > 30) { if (inner.state === 'open') setDoor(inner, false); if (d9.closed && !inAir) d9.closed = false; remoteAlarm(ROOM.airlock.i); B.baitT = W.t; L('alarm in airlock'); }
      if (inAir) { if (inner.state === 'open') { setDoor(inner, false); L('close inner'); } if (!d9.closed) { d9.closed = true; L('close D9'); } if (inner.open < .05) { L('open outer'); remoteOuter(); } }
    }
  }
  B.iv = setInterval(tick, 250);
})();
