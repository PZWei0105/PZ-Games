/* 收藏庫截圖用的擺設（給 _build/tools/shoot.py 的 eval 步驟用） */
window.__show = {
  prep() {
    const G = __ut.G;
    G.seenPrologue = true; G.sectors.forEach(s => s.unlocked = true);
    G.weapons = ['rivet', 'arc', 'harpoon', 'torch', 'drone', 'cryo', 'sonic'];
    Object.keys(RADIO).forEach(k => G.tips[k] = true);
    __ut.S.noAdapt = true;
  },
  quiet() {
    if (__ut.W) __ut.W.subs.length = 0;
    UI.subQ = []; UI.subCur = null;
    ['#subtitle', '#banner', '#toasts'].forEach(q => { const e = document.querySelector(q); if (e) e.innerHTML = ''; });
    const j = document.querySelector('#joyhint'); if (j) j.classList.add('hidden');
  },
  dive(si, seed) { this.prep(); window.__seed = seed; __ut.S.speed = 1; __ut.start(si); },
  freeze() { __ut.S.speed = 0; },
  room(pred) { const W = __ut.W; return W.rooms.find(r => !r.collapsed && r.special !== 'vault' && pred(r)); },
  put(r, dx) { const p = __ut.W.P; p.x = r.x0 + dx; p.y = r.floorY; p.climb = null; p.vx = 0; R.snapCam = true; r.explored = true; },
  calm() { const W = __ut.W; W.foes.forEach(e => e.dead = true); W.waveT = 23.6; W.hunter.state = 'away'; W.hunter.awayT = 999; },
  // 02：聆在聽——潛行中，牠就在旁邊
  listen() {
    const W = __ut.W; this.calm(); __ut.god();
    const r = this.room(q => q.f >= 1 && q.doorL && q.doorR && q.light !== 'dark' && !q.survivor && q.special !== 'dock');
    r.doorL.state = 'open'; r.doorL.open = 1; r.doorR.state = 'open'; r.doorR.open = 1; markDoors();
    this.put(r, 92); W.P.face = 1; toggleStance(true);
    const h = W.hunter; h.state = 'search'; h.x = r.x0 + 262; h.y = r.floorY; h.tx = h.x - 40; h.ty = h.y; h.searchT = 0; h.face = -1; h.seen = true; h.turn = -.6; h.awayCD = 0;
    W.heart = 134; W.heartProx = .9; W.pressure = 63; toggleTracker(true); W.tracker.t = .1;
  },
  // 06：管道裡的牠——格柵在震、滴黏液、燈被干擾
  vent() {
    const W = __ut.W; this.calm(); __ut.god();
    const v = W.vents.find(o => { const r = W.rooms[o.room]; return r.f >= 1 && r.light !== 'dark' && !r.survivor && r.special !== 'dock'; }) || W.vents[0];
    const r = W.rooms[v.room]; this.put(r, v.x - r.x0 > RW / 2 ? 70 : RW - 70); W.P.face = v.x > W.P.x ? 1 : -1; toggleStance(true);
    const h = W.hunter; h.state = 'venting'; h.vent = v; h.ventT = 99; h.seen = true;
    toggleTracker(true); W.tracker.t = .1; W.heart = 128; W.heartProx = .8;
  },
  // 03：水裡的電弧
  zap() {
    const W = __ut.W; this.calm(); __ut.god(); __ut.G.settings.nums = false;
    ['arc', 'harpoon'].forEach(id => __ut.give(id)); __ut.lv('arc', 4); __ut.lv('harpoon', 3); __ut.lv('rivet', 3);
    const r = this.room(q => q.f >= 1 && q.special !== 'dock' && !q.survivor && q.light !== 'dark');
    this.put(r, 70); W.P.face = 1;
    r.water = .42; r.breach = { x: r.x0 + RW - 50, y: r.floorY - 130, rate: .004, t: 0 };
    for (let k = 0; k < 7; k++) { const e = spawnFoe(k % 3 === 0 ? 'eel' : k % 3 === 1 ? 'iso' : 'crab', r.x0 + 200 + k * 22, r.floorY, true); e.spawnT = 0; e.hp = e.hpMax = 900; }
    W.pressure = 44;
  },
  // 04：撤離——潛艇快到了
  extract() {
    const W = __ut.W; this.calm(); __ut.god(); __ut.G.settings.nums = false; __ut.give('harpoon'); __ut.lv('harpoon', 3); __ut.lv('rivet', 4);
    const r = W.rooms[W.dock.room]; this.put(r, r.moon ? (r.moon.x - r.x0 > RW / 2 ? 90 : RW - 90) : 120);
    W.pressure = 76; W.dock.called = true; W.dock.t = 9; W.dock.waveT = 99; W.heart = 120;
    const dir = W.P.x - r.x0 > RW / 2 ? -1 : 1;
    for (let k = 0; k < 6; k++) { const e = spawnFoe(k % 2 ? 'crab' : 'iso', W.P.x + dir * (150 + k * 30), r.floorY, true); e.spawnT = 0; e.hp = e.hpMax = 900; }
    W.P.face = dir;
  },
  terminal() { UI.readLog('1-2'); },
  // 05：海燕號（中期進度）
  hubState() {
    const G = __ut.G; G.credits = 2460; G.settings.nums = true;
    [0, 1, 2].forEach(i => { G.sectors[i].cleared = true; G.sectors[i].stars = [true, i < 2, i === 0]; G.sectors[i].runs = 3; });
    ['ye', 'amon', 'chen', 'tie', 'lu'].forEach(id => { if (SURV[id]) G.survivors[id] = true; });
    LOG_ORDER.slice(0, 9).forEach(id => G.logs[id] = true);
    G.meta = { hp: 2, armor: 1, quiet: 1, search: 2 };
  },
};
'ok';
