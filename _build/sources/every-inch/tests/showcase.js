/* 收藏庫截圖用的擺設：tools/shoot.py 用 eval 載入，不在遊戲本體裡。
   戰鬥截圖用固定亂數種子重播：先完整跑一次暖身（讓延遲建立的圖都先建好），
   再從頭跑一次找出這場最熱鬧的一格，最後從頭重播到那一格再拍。 */
(() => {
  const S = window.__S = {};
  let ex = [];
  if (!window.__S_hook) {
    const of = fxExplosion;
    window.fxExplosion = function (x, y, size, o) { ex.push({ x, y, s: size || 1, t: G.t }); return of(x, y, size, o); };
    window.__S_hook = true;
  }
  S.clean = () => {
    document.querySelectorAll('.bub').forEach((b) => b.classList.remove('on'));
    const bn = document.getElementById('banner'); if (bn) { bn.classList.remove('go'); bn.style.opacity = 0; }
    const h = document.getElementById('hint'); if (h && !(B && B.sel)) h.classList.remove('on');
    if (B) B.msgQ.length = 0;
  };
  S.seed = (s) => {
    let a = s >>> 0;
    Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };
  S.upd = (dt) => { G.freeze = true; G.rt += dt; G.t += dt; G.dt = dt; SCENES[G.scene].update(dt, dt); ex = ex.filter((e) => G.t - e.t < 1); };
  S.start = (seed, cfg) => { PT.items.length = 0; PT.free.length = 0; S.seed(seed); G.t = 1000; G.rt = 1000; ex = []; SCENES.battle.enter(cfg); };

  /* 遠景：兩邊都有一群人、有載具、正中間剛好在爆炸 */
  S.wide = (half) => {
    const us = B.units.filter((u) => u.alive);
    let best = [-1, 0, 1];
    for (let x = 520; x < 1760; x += 40) {
      let a = 0, b = 0, v0 = 0, v1 = 0, air = 0, e = 0;
      for (const u of us) if (Math.abs(u.x - x) < half - 30) { if (u.side === 0) a++; else b++; if (u.isVeh && u.cls !== 'air') { if (u.side === 0) v0++; else v1++; } if (u.cls === 'air') air++; }
      for (const q of ex) if (G.t - q.t < 0.25 && Math.abs(q.x - x) < half * 0.5) e += Math.min(2.5, q.s);
      const s = (Math.min(a, b) * 3 + Math.min(v0, 2) * 10 + Math.min(v1, 3) * 6 + Math.min(e, 5) * 6 + Math.min(air, 1) * 10) * (a >= 5 && b >= 5 && e >= 1 ? 1 : 0.4);
      if (s > best[0]) best = [s, x, 1];
    }
    return best;
  };
  /* 特寫：同一條線上兩邊的步兵正在對射 */
  S.close = (half) => {
    const us = B.units.filter((u) => u.alive && u.cls === 'inf' && !u.para);
    let best = [-1, 0, 1];
    for (let l = 0; l < 3; l++) for (let x = 420; x < 1840; x += 30) {
      let a = 0, b = 0, f = 0;
      for (const u of us) if (Math.abs(u.x - x) < half - 24 && Math.abs(u.y - LANES[l]) < 38) { if (u.side === 0) a++; else b++; }
      for (const p of B.projs) if (p.k === 'bullet' && Math.abs(p.x - x) < half && Math.abs(p.y - LANES[l]) < 60) f++;
      const s = (Math.min(a, b) * 4 + a + b + Math.min(f, 10)) * (a >= 3 && b >= 3 ? 1 : 0.3);
      if (s > best[0]) best = [s, x, l];
    }
    return best;
  };
  S.hunt = (seed, cfg, t0, t1, scorer, half) => {
    S.start(seed, cfg); while (B.t < t1 && !B.over) S.upd(1 / 30);
    S.start(seed, cfg);
    let n = 0, top = null;
    while (B.t < t1 && !B.over) {
      S.upd(1 / 30); n++;
      if (B.t < t0) continue;
      const s = scorer(half);
      if (!top || s[0] > top.s) top = { s: s[0], x: s[1], lane: s[2], n, t: +B.t.toFixed(1) };
    }
    S.start(seed, cfg);
    for (let i = 0; i < top.n; i++) S.upd(1 / 30);
    return top;
  };
  S.render = () => { SCENES[G.scene].render(ctx); S.clean(); };
  /* 鏡頭：z 倍、畫面上緣（56px，頂部介面下方）對到世界座標 topW */
  S.frame = (x, z, topW) => {
    CAM.follow = false; CAM.userT = 999; CAM.z = z; CAM.y = topW + (VIEW.h / 2 - 56) / z; CAM.x = x;
    clampCam(); S.render();
  };
  const DECK = ['rifle', 'tank', 'at', 'mg', 'heli', 'boiler', 'apc', 'airstrike'];

  /* 02 主視覺：直升機壓上、爆炸把敵人掀飛 */
  S.shot02 = () => {
    const cfg = { rival: 'holder', deck: DECK, autoUs: true, theme: 'dusk', seed: 5, regen: 0.9, aiRegen: 1.6 };
    const z = 1.18, t = S.hunt(4, cfg, 30, 170, S.wide, VIEW.w / 2 / z);
    S.frame(t.x, z, 6);
    return t;
  };
  /* 03 部署：選了坦克卡，綠色部署範圍和落點箭頭 */
  S.shot03 = () => {
    const cfg = { rival: 'kaz', deck: ['rifle', 'mg', 'at', 'tank', 'heli', 'boiler', 'mortar', 'airstrike'], autoUs: true, theme: 'snow', seed: 3, regen: 0.8, aiRegen: 1.25 };
    S.start(12, cfg);
    while (B.t < 31) S.upd(1 / 30);
    B.cfg.autoUs = false; B.supply[0] = 8.4; updateHUD(0.016);
    selectCard('tank');
    const front = Math.max(deployZone(0, 0)[1], deployZone(0, 1)[1], deployZone(0, 2)[1]);
    B.aim = { x: deployZone(0, 1)[1] - 36, lane: 1 };
    const z = CAM.z;
    S.frame(front + VIEW.w / z * 0.16, z, 4);
    return front;
  };
  /* 04 特寫：放大到看得清楚換彈匣、拋彈殼、臥倒 */
  S.shot04 = () => {
    const cfg = { rival: 'kaz', deck: ['rifle', 'mg', 'at', 'sniper', 'flame', 'mortar', 'smoke', 'medic'], autoUs: true, theme: 'ruins', seed: 8, regen: 0.8, aiRegen: 1.4 };
    const z = 2.3, t = S.hunt(7, cfg, 25, 120, S.close, VIEW.w / 2 / z);
    S.frame(t.x, z, LANES[t.lane] - 95);
    return t;
  };
  /* 05 空襲：戰機拉過去，五顆炸彈沿著瞄準圈落下 */
  S.shot05 = () => {
    const cfg = { rival: 'ilya', deck: DECK, autoUs: true, theme: 'night', seed: 6, regen: 0.9, aiRegen: 1.5 };
    const t = S.hunt(3, cfg, 35, 120, S.wide, VIEW.w / 2 / 1.06);
    const c = clusterTarget(1, 3) || { lane: 1, x: t.x };
    useAbility(0, 'airstrike', c.lane, c.x);
    for (let i = 0; i < 54; i++) S.upd(1 / 30);
    S.frame(c.x + 60, 1.06, 4);
    return [t.t, Math.round(c.x), c.lane];
  };

  /* 戰役畫面用的進度：第 12 天，打下焦土幫、收編了卡茲 */
  S.camp = (beforeFate) => {
    G.freeze = false; G.paused = false;
    campNew();
    Object.assign(CAMP, { day: 12, money: 385, wins: 8, losses: 1, kills: 436, tutorial: false });
    for (const k of ['fox', 'oil', 'lake', 'ford', 'radar']) CAMP.own[k] = 'us';
    CAMP.bld = { hq: 3, bar: 3, mot: 2, air: 1, art: 2 };
    CAMP.heroes = ['boiler', 'sparrow'];
    CAMP.deck = ['rifle', 'mg', 'at', 'tank', 'mortar', 'boiler', 'sparrow', 'barrage'];
    CAMP.seen = { intro: true, tutorialWin: true, firstCapture: true, pre_kaz: true };
    if (!beforeFate) {
      CAMP.own.scrap = 'us'; CAMP.beaten = ['kaz']; CAMP.fates = { kaz: 'recruit' }; CAMP.heroes.push('kaz'); CAMP.seen.teacher1 = true; CAMP.seen.post_kaz = true;
      CAMP.doctrines = ['inch'];
      CAMP.threats = [{ fac: 'holder', from: 'foundry', to: 'ford', day: 13 }];
      CAMP.log = [
        { d: 11, t: '白隼航空隊轟炸了鐵砧兵團的貨運站。' },
        { d: 11, t: '拿下冰河渡口。鐵砧兵團的履帶印還沒被雪蓋掉。' },
        { d: 10, t: '焦土幫併入第七前哨。' },
        { d: 9, t: '打下廢鐵場。地下室裡有六十幾個孩子。' },
        { d: 8, t: '佔領雷達站。白隼的眼睛，現在是我們的了。' },
      ];
    }
    campSave();
  };
  S.shot06 = () => { S.camp(false); MAPV.sel = null; goMap(); return CAMP.day; };
  S.shot07 = () => {
    S.camp(true); CAMP.own.scrap = 'us';
    const cfg = { rival: 'kaz', deck: ['rifle', 'mg', 'at', 'tank', 'mortar', 'boiler', 'sparrow', 'barrage'], autoUs: true, theme: 'ruins', seed: 4, regen: 1.6, aiRegen: 0.55 };
    S.start(21, cfg);
    while (B.t < 80 && !B.over) S.upd(1 / 30);
    const ours = B.units.filter((u) => u.alive && u.side === 0).map((u) => u.x).sort((a, b) => b - a);
    S.frame((ours[Math.min(3, ours.length - 1)] || 1400) - 120, CAM.z, 4);
    const F = FATE.kaz;
    askChoice(`怎麼處置${F.q}？`, F.opts.map((o) => [o[1], o[2], () => {}]));
    return [B.t.toFixed(1), ours.length];
  };
  S.shot08 = () => { S.camp(false); goBase(); return CAMP.money; };
})();
