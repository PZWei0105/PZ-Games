// 測試用的英雄機器人：列出所有（招式, 目標），用預覽試打一次，挑分數最高的。
function botIncoming(h) { // 下一輪大概會吃多少傷害（照敵人頭上的意圖）
  let single = 0, aoe = 0, melee = 0, big = 0;
  for (const f of realFoes()) { const it = intentInfo(f); if (!it) continue; const d = it.dmg[h.id] || 0; if (!d) continue; if (it.mv.tgt === 'all') aoe += d; else single += d; if (it.mv.melee) melee++; if (it.charging && d > h.hp * .4) big += d; }
  return { single, aoe, melee, big, total: single + aoe };
}
function botChoose(u) {
  const cmds = heroCommands(u).filter(c => !c.no);
  let best = null;
  const canSlamSoon = liveHeroes().some(h => h.skills.concat([HERO[h.hero].basic]).some(id => SK[id].slam) && h.mom >= 1);
  const inc = botIncoming(u);
  for (const c of cmds) {
    const sk = c.sk, T0 = skillTargets(u, sk);
    let opts = [];
    if (T0.all) opts = [T0.units[0] != null ? T0.units[0] : u.id];
    else opts = T0.units.slice();
    for (const i of T0.scene) opts.push({ scene: i });
    if (sk.tg === 'self' || sk.tg === 'allies' || sk.tg === 'foes') opts = [sk.tg === 'self' ? u.id : (T0.units[0] != null ? T0.units[0] : null)].filter(x => x != null);
    for (const tg of opts) {
      const p = bPreview(u.id, sk.id, tg);
      let s = 0;
      for (const f of B.units) {
        const r = p.units[f.id]; if (!r) continue;
        if (f.side === 'foe' && !f.dead) {
          const loss = Math.min(r.loss, f.hp + f.shield);
          s += (f.object ? loss * .7 : loss);
          if (r.dead) s += f.object ? 60 : 45 + f.atk * 2;
          if (r.aloft && !f.s.aloft) s += canSlamSoon ? 30 + f.w * 6 : 6;
          else if (!r.aloft && r.lift > f.s.lift) s += canSlamSoon ? 24 * (r.lift / Math.max(1, f.w)) : 2;
        } else if (f.side === 'hero') {
          if (r.loss < 0) s += -r.loss * (f.hp < f.hpMax * .45 ? 1.4 : .5);
          if (f.down && !U(f.id).down) s += 0;
        }
      }
      for (const n of p.notes) { if (n === '打斷') s += 90; if (n === '完美連攜') s += 12; if (n === '打落深淵') s += 20; }
      // 復活
      if (sk.revive && typeof tg === 'number' && U(tg).down) s += 160;
      if (sk.heal && typeof tg === 'number' && !U(tg).down) { const h = U(tg); if (h.hp > h.hpMax * .6) s -= 60; }
      if (sk.shieldPct) s += liveHeroes().length * u.hpMax * sk.shieldPct * (inc.total > 0 ? .6 : .2);
      if (sk.stance === 'guard') s += inc.total * .5 - 6 + (inc.big ? inc.big * .5 : 0);
      if (sk.stance === 'riposte') s += inc.total * .3 + inc.melee * u.atk * .9;
      if (sk.stance === 'oathdr') { let o = 0; for (const h of liveHeroes()) if (h !== u) o += botIncoming(h).single; s += o * .55; }
      if (sk.stance === 'evade') s += inc.single * .9 + u.atk * .5;
      if (sk.stance === 'gate') { let o = 0; for (const h of liveHeroes()) o += botIncoming(h).total; s += o * .9 + 30; }
      if (sk.mark && typeof tg === 'number' && !U(tg).s.mark) s += 10 + u.atk * .5;
      if (sk.id === 'c_wait') s -= 25;
      if (sk.item) s -= 12;
      if (sk.unison) s += 40;
      s += (p.mom - u.mom) * 3;
      s -= sk.delay * .13;
      if (p.over === 'win') s += 500;
      if (!best || s > best.s) best = { s, sk: sk.id, tgt: tg };
    }
  }
  return best || { sk: HERO[u.hero].basic, tgt: realFoes()[0].id };
}
function botBattle(cfg, maxTurns) {
  battleNew(cfg);
  let n = 0;
  while (!B.over && n++ < (maxTurns || 500)) {
    const r = bNext(); if (!r.u) continue; if (B.over) break;
    if (r.u.side === 'hero') { const a = botChoose(r.u); bAct(r.u.id, a.sk, a.tgt); }
    else foeAct(r.u);
    if (B.parley && !B.parleyDone) { B.parleyDone = true; B.parley = false; }
  }
  if (!B.over) B.over = 'timeout';
  return B;
}
