// 自動遊玩：翻櫃子、撿東西、下潛、打心魔、敲鐘撤離（測試用）
window.__bot = (function () {
  const B = { on: true, goal: null, path: null, pathT: 0, log: [], stuck: 0, lx: 0, ly: 0, mode: 'loot', opts: { deep: 2, god: false } };
  function setJoy(dx, dy, mag) { const l = Math.hypot(dx, dy) || 1; IN.joy = { on: true, id: -1, ox: 0, oy: 0, x: dx / l * 58 * mag, y: dy / l * 58 * mag, kx: 0, ky: 0 }; }
  function stop() { IN.joy = { on: false }; }
  function tick() {
    if (!B.on) return;
    try {
      // 介面
      const lv = document.querySelector('#lvup [data-u]'); if (lv) { lv.click(); return; }
      const sw = document.querySelector('#swap [data-sw]'); if (sw) { sw.click(); return; }
      const no = document.querySelector('#swap [data-no]'); if (no) { no.click(); return; }
      const sc = document.querySelector('#scene'); if (sc) { sc.click(); return; }
      const wp = document.querySelector('#winp [data-y]'); if (wp) { wp.click(); return; }
      if (S.mode !== 'dive' || !W || W.out || S.paused) { stop(); return; }
      const p = W.players[0];
      if (B.opts.god) { p.hp = p.hpMax; }
      if (p.hp < p.hpMax * .4 && p.candies) useCandy(p);
      // 撤離中：待在鐘旁
      if (W.channel) { const e = W.channel.e; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d > 1.2 * T) setJoy(e.x - p.x, e.y - p.y, 1); else stop(); return; }
      // 夢崩：去鐘門或窗戶
      if (p.act) {
        if (p.act.k === 'stairs' && W.depth < B.opts.deep && (B.mode === 'leave' || W.t > 40)) { doAct(p); B.goal = null; B.mode = 'loot'; return; }
        if (p.act.k === 'bell' && B.mode === 'leave') { doAct(p); return; }
        if (p.act.k === 'window' && (B.mode === 'leave' && W.collapse)) { doAct(p); return; }
        if (p.act.k === 'qing') { doAct(p); B.mode = 'leave'; return; }
      }
      // 正在搜
      if (p.near && !p.near.open && p.near.prog > 0 && !W.collapse) { stop(); return; }
      // 決定目標
      const near = W.foes.filter(e => !e.dead && e.state === 'alert' && Math.hypot(e.x - p.x, e.y - p.y) < 2.2 * T);
      if (near.length && p.hp < p.hpMax * .5 && p.dash) playerDash(p);
      let goal = null;
      if (W.qing && !W.qing.carried) goal = { x: W.qing.x, y: W.qing.y, k: 'qing' };
      const mems = W.picks.filter(k => k.k === 'mem' && !k.z && (k.ign || 0) < W.t && !(p.carry));
      if (!goal && mems.length && B.mode === 'loot' && !B.opts.bossOnly) { mems.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)); goal = { x: mems[0].x, y: mems[0].y, k: 'mem' }; }
      const conts = W.m.containers.filter(c => !c.open);
      if ((W.wake > 70 || W.collapse || bagUsed(p) >= p.cap) && !(B.opts.bossOnly && W.boss && !W.boss.dead)) B.mode = 'leave';
      if (!goal && B.mode === 'loot' && !B.opts.bossOnly && conts.length && !(W.depth === 2 && W.boss && !W.boss.dead && W.t > 60)) {
        conts.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)); const c = conts[0]; goal = { x: c.x, y: (c.ty + 1.6) * T, k: 'cont' };
      }
      if (!goal && W.depth === 2 && W.boss && !W.boss.dead && B.mode !== 'leave') { const b = W.boss; goal = { x: b.room.cx, y: (b.room.y + b.room.h - 1.6) * T, k: 'boss' }; if (b.awake) { const d = Math.hypot(b.x - p.x, b.y - p.y); if (d < 3 * T) { setJoy(p.x - b.x + Math.sin(W.t * 2) * 60, p.y - b.y, 1); return; } } }
      if (!goal) {
        const ex = W.m.exits;
        let e = null;
        if (W.depth < B.opts.deep && !W.collapse) e = ex.find(x => x.type === 'stairs');
        if (!e) e = (W.collapse && W.finalPhase < 2) ? ex.find(x => x.type === 'window') : ex.find(x => x.type === 'bell');
        if (!e) e = ex[0];
        B.mode = 'leave'; goal = { x: e.x, y: e.y + 10, k: 'exit' };
      }
      // 尋路
      if (!B.goal || Math.hypot(B.goal.x - goal.x, B.goal.y - goal.y) > 20 || W.t > B.pathT) { B.goal = goal; B.path = pathTo(p.x, p.y, goal.x, goal.y) || []; B.pathT = W.t + 1.2; }
      let nx = B.path[0];
      while (nx && Math.hypot(nx.x - p.x, nx.y - p.y) < 18) { B.path.shift(); nx = B.path[0]; }
      if (!nx) nx = goal;
      if (Math.hypot(goal.x - p.x, goal.y - p.y) < 14) { stop(); return; }
      const sneak = W.foes.some(e => !e.dead && e.state === 'sleep' && Math.hypot(e.x - p.x, e.y - p.y) < 3 * T);
      setJoy(nx.x - p.x, nx.y - p.y, sneak ? .5 : 1);
      if (Math.hypot(p.x - B.lx, p.y - B.ly) < 2) { B.stuck++; if (B.stuck > 40) { B.path = pathTo(p.x, p.y, goal.x, goal.y) || []; B.stuck = 0; setJoy(Math.random() - .5, Math.random() - .5, 1); } } else B.stuck = 0;
      B.lx = p.x; B.ly = p.y;
    } catch (e) { B.log.push(String(e && e.stack || e)); }
  }
  setInterval(tick, 50);
  return B;
})();
