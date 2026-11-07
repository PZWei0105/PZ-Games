/* 自動試玩：一路往上搜、救人、開鎖、打心魔、敲鐘、撐住 */
window.__bot = (() => {
  const B = { log: [], goal: null, t: 0, opts: { god: false }, stats: { picks: 0 } };
  const say = s => { B.log.push(`[${W.t.toFixed(1)}] ${s}`); if (B.log.length > 200) B.log.shift(); };
  const P = () => W.players[0];
  function reach(f, x) { const p = P(), f0 = p.climb ? p.climb.to : p.f, x0 = p.climb ? p.climb.ex : p.x; return svRoute(f0, x0, f, x) !== null; }
  function cost(f, x) { const p = P(); return Math.abs(p.x - x) + Math.abs(p.f - f) * 700; }
  function tasks() {
    const p = P(), out = [];
    for (const s of W.L.spots) if (!s.done && reach(s.f, s.x)) out.push({ k: 'spot', f: s.f, x: s.x, o: s, c: cost(s.f, s.x) });
    for (const v of W.survivors) if (v.state === 'wait' && reach(v.f, v.x)) out.push({ k: 'save', f: v.f, x: v.x, o: v, c: cost(v.f, v.x) - 300 });
    for (const d of W.L.doors) if (d.lock && !d.lock.boss) {
      const ok = d.lock.coins ? W.coins >= d.lock.coins : W.keys >= 1; if (!ok) continue;
      for (const side of [-32, 32]) if (reach(d.f, d.x + side)) { out.push({ k: 'lock', f: d.f, x: d.x + side, o: d, c: cost(d.f, d.x) - 200 }); break; }
    }
    for (const k of W.picks) if (k.k === 'mem' && k.land && reach(k.f, k.x) && (bagUsed() + k.item.size <= W.cap || svSwapPlan(k.item)) && !(k.ign && k.ign > W.t)) out.push({ k: 'mem', f: k.f, x: k.x, o: k, c: cost(k.f, k.x) - 150 });
    out.sort((a, b) => a.c - b.c);
    return out;
  }
  function moveTo(f, x) {
    const p = P();
    if (p.climb) return { mx: 0, my: 0 };
    const r = svRoute(p.f, p.x, f, x);
    if (r === SAME || (r && r.same)) { const dx = x - p.x; return { mx: Math.abs(dx) < 8 ? 0 : clamp(dx / 40, -1, 1), my: 0, at: Math.abs(dx) < 10 }; }
    if (!r) return { mx: 0, my: 0, stuck: true };
    const s = r.s, cx = (s.x0 + s.x1) / 2;
    if (stairAt(p.f, p.x) === s && Math.abs(p.x - cx) < 50) { svClimb(p, r.up); return { mx: 0, my: r.up ? -1 : 1 }; }
    return { mx: clamp((cx - p.x) / 40, -1, 1), my: 0 };
  }
  function danger() {
    const p = P(); let best = null, bd = 1e9;
    for (const e of W.foes) if (!e.dead && e.spawn <= 0 && e.f === p.f && !e.climb) { const d = Math.abs(e.x - p.x); if (d < bd && !doorBetween(p.f, p.x, e.x, blocksFoe)) { bd = d; best = e; } }
    return [best, bd];
  }
  function tick(dt) {
    if (!W || W.out || S.mode !== 'play') return;
    const p = P();
    if (B.opts.god) { p.hp = p.hpMax; }
    // 三選一：點第一張以外的隨機一張
    const card = document.querySelector('#lvup [data-i]');
    if (card && !B.clicking) { B.clicking = true; const cs = document.querySelectorAll('#lvup [data-i]'); const b = cs[Math.random() * cs.length | 0]; setTimeout(() => { b.click(); B.clicking = false; }, 120); return; }
    if (S.paused) return;
    let inp = { mx: 0, my: 0 };
    if (p.hp < p.hpMax * .35 && W.candies > 0) svCandy(p);
    const [fe, fd] = danger();
    if (W.extract) {
      const g = moveTo(3, 700); inp = g;
      if (p.f === 3 && fe && fd < 70) inp = { mx: Math.sign(p.x - fe.x) || 1, my: 0 };
    } else if (W.boss) {
      if (p.f !== 3 || p.climb) inp = moveTo(3, 300);
      else {
        const b = W.boss, d = p.x - b.x, want = b.x + (d >= 0 ? 260 : -260);
        let tx = clamp(want, 200, 960);
        for (const o of W.tele) if (o.k === 'col' && Math.abs(o.x - p.x) < 140) tx = p.x + (p.x > o.x ? 160 : -160) * o.dir * Math.sign(p.x - o.x || 1);
        for (const o of W.tele) if (o.k === 'circ' && !o.fired && Math.abs(o.x - p.x) < o.r + 10) tx = p.x + (p.x >= o.x ? 90 : -90);
        inp = { mx: Math.abs(tx - p.x) < 10 ? 0 : clamp((tx - p.x) / 40, -1, 1), my: 0 };
        if (Math.abs(p.x - b.x) < 150) svDash(p);
      }
    } else if (W.bossDead || (B.goal && B.goal.k === 'bell')) {
      const g = moveTo(3, SV_LEVEL.bell.x - 30); inp = g;
      if (p.act && p.act.k === 'bell') { svRingBell(); say('敲鐘'); }
    } else {
      B.t -= dt;
      if (B.t <= 0 || !B.goal || (B.goal.o && (B.goal.o.done || B.goal.o.dead || (B.goal.k === 'save' && B.goal.o.state !== 'wait') || (B.goal.k === 'lock' && !B.goal.o.lock)))) {
        B.t = .5;
        const ts = tasks();
        const old = B.goal;
        if (W.wake >= 96 && !W.boss) B.goal = { k: 'roof', f: 3, x: 400 };
        else B.goal = ts[0] || { k: 'bell', f: 3, x: SV_LEVEL.bell.x - 30 };
        if (!old || old.k !== B.goal.k || old.o !== B.goal.o) say(`目標 ${B.goal.k} ${B.goal.f}F x${Math.round(B.goal.x)}`);
      }
      const g = B.goal;
      const m = moveTo(g.f, g.x); inp = m;
      if (m.at || (p.f === g.f && Math.abs(p.x - g.x) < 14)) inp = { mx: 0, my: 0 };
      // 夢魘貼臉：退開
      if (fe && fd < 50 && p.hp < p.hpMax * .7 && p.dashCd <= 0) { p.input.mx = Math.sign(p.x - fe.x) || 1; svDash(p); }
    }
    IN.sid = -7; IN.mx = inp.mx; IN.my = inp.my;
  }
  let last = performance.now();
  function loop(now) { const dt = Math.min(.1, (now - last) / 1000); last = now; try { tick(dt * (window.__speed || 1)); } catch (e) { say('ERR ' + e.message); } requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  return B;
})();
