// 自動遊玩機器人：搜、救人、開門、最後去撤離塢
window.__bot = (function () {
  const B = { log: [], opts: { god: false, extractAt: 75 }, goal: null, stuck: 0, lastX: 0, t: 0, phase: 'explore' };
  function say(s) { B.log.push(Math.round(W.t) + 's ' + s); if (B.log.length > 40) B.log.shift(); }
  function pNav(fromR, goalR) {
    // 主角走得到的圖：門（鎖住的不算）、梯井
    const N = W.rooms.length, D = new Array(N).fill(1e9), prev = new Array(N).fill(null);
    D[goalR.i] = 0; const q = [goalR.i];
    const edges = r => { const o = []; if (r.doorL && (r.doorL.state !== 'locked' || W.key)) o.push({ to: r.i - 1, door: r.doorL }); if (r.doorR && (r.doorR.state !== 'locked' || W.key)) o.push({ to: r.i + 1, door: r.doorR }); if (r.ladDown) o.push({ to: r.i + W.C, lad: r.ladDown, dir: 1 }); if (r.ladUp) o.push({ to: r.i - W.C, lad: r.ladUp, dir: -1 }); return o; };
    while (q.length) { const i = q.shift(); for (const e of edges(W.rooms[i])) if (D[e.to] > D[i] + 1) { D[e.to] = D[i] + 1; q.push(e.to); } }
    let best = null, bd = 1e9; for (const e of edges(fromR)) if (D[e.to] < bd) { bd = D[e.to]; best = e; }
    return best;
  }
  function pickGoal() {
    const p = W.P, pr = roomAt(p.x, p.y);
    if (W.dock.arrived) { const r = W.rooms[W.dock.room]; return { room: r, x: r.moon ? r.moon.x + 60 : r.x0 + 200, act: 'board' }; }
    if (W.dock.called) return { room: W.rooms[W.dock.room], x: W.rooms[W.dock.room].x0 + 140, act: 'hold' };
    if (W.pressure > B.opts.extractAt || W.ending) return { room: W.rooms[W.dock.room], x: W.rooms[W.dock.room].x0 + 70, act: 'call' };
    if (W.S.final && !W.deepDone && W.M.deep >= 0 && W.pressure > 30) { const r = W.rooms[W.M.deep]; return { room: r, x: r.tank ? r.tank.x - 60 : r.x0 + 180, act: 'deep' }; }
    // 生還者
    for (const s of W.M.survivors) if (s.state === 'hide') { const r = W.rooms[s.room]; if (r.special === 'vault' && !W.key) continue; return { room: r, x: s.x, act: 'rescue' }; }
    // 搜索點（近的優先）
    let best = null, bd = 1e9;
    for (const r of W.rooms) { if (r.collapsed) continue; for (const sp of r.spots) { if (sp.done) continue; if (r.special === 'vault' && !W.key) continue; const d = Math.abs(r.c - pr.c) * 2 + Math.abs(r.f - pr.f) * 3 + Math.abs(sp.x - p.x) / 400; if (d < bd) { bd = d; best = { room: r, x: sp.x, act: 'search', sp }; } } }
    if (best) return best;
    return { room: W.rooms[W.dock.room], x: W.rooms[W.dock.room].x0 + 70, act: 'call' };
  }
  function step() {
    if (!W || __ut.S.mode !== 'dive') return;
    if (B.opts.god) { W.god = true; W.P.hp = Math.max(W.P.hp, 30); }
    // 自動選卡
    const card = document.querySelector('#modal .card'); if (card && (W.lvQ || W.cacheQ)) { const cs = document.querySelectorAll('#modal .card'); cs[Math.floor(Math.random() * cs.length)].click(); return; }
    if (UI.storyOn) { const ch = document.querySelector('#ch-a'); if (ch) { ch.click(); return; } document.querySelector('#story').click(); return; }
    if (W.state !== 'play') return;
    const p = W.P, pr = roomAt(p.x, p.y);
    B.goal = pickGoal();
    const g = B.goal;
    // 低血量用醫療包
    if (p.hp < p.hpMax * .4 && p.med > 0) useMed();
    if (p.climb) { const L = p.climb; INPUT.jx = 0; INPUT.jy = B.climbDir || 1; return; }
    let tx;
    if (pr === g.room) {
      tx = g.x;
      if (Math.abs(p.x - tx) < 14) {
        INPUT.jx = 0; INPUT.jy = 0;
        const it = interactables()[0];
        if (g.act === 'rescue' && it && it.k === 'rescue') doInteract();
        if (g.act === 'call' && it && it.k === 'call') { doInteract(); say('call dock'); }
        if (g.act === 'board' && it && it.k === 'board') { doInteract(); say('board'); }
        if (g.act === 'deep' && it && it.k === 'deep') { doInteract(); say('deep'); }
        return;
      }
    } else {
      const ed = pNav(pr, g.room);
      if (!ed) { INPUT.jx = 0; INPUT.jy = 0; return; }
      if (ed.door) {
        tx = ed.door.x + (ed.door.x > p.x ? 30 : -30);
        if (Math.abs(ed.door.x - p.x) < 50 && (ed.door.state === 'closed' || ed.door.state === 'locked')) { INPUT.jx = 0; doInteract(); return; }
      } else {
        tx = ed.lad.x;
        if (Math.abs(p.x - tx) < 10) { INPUT.jx = 0; INPUT.jy = ed.dir; B.climbDir = ed.dir; return; }
      }
    }
    INPUT.jy = 0;
    INPUT.jx = Math.abs(tx - p.x) < 8 ? 0 : Math.sign(tx - p.x);
    // 卡住偵測
    if (Math.abs(p.x - B.lastX) < 1 && INPUT.jx) { B.stuck++; if (B.stuck > 60) { B.stuck = 0; const it = interactables()[0]; if (it) doInteract(); say('stuck ' + (it ? it.k : '-')); } } else B.stuck = 0;
    B.lastX = p.x;
  }
  B.timer = setInterval(step, 50);
  return B;
})();
