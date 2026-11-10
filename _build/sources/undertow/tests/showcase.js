/* 收藏庫截圖用的擺設（給 _build/tools/shoot.py 的 eval 步驟用） */
window.__show = {
  prep() {
    const G = __ut.G;
    G.seenPrologue = true; G.sectors.forEach(s => s.unlocked = true);
    G.weapons = ['rivet', 'arc', 'harpoon', 'torch', 'drone', 'cryo', 'sonic']; G.lastTool = 'torch';
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
  calm() { const W = __ut.W; W.foes.length = 0; W.spawnT = 999; W.hunter.state = 'away'; W.hunter.awayT = 999; },
  hunterAt(x, y, st) { const h = __ut.W.hunter; Object.assign(h, { state: st || 'search', x, y, tx: x, ty: y, searchT: 0, seen: true, awayCD: 0, know: 0, checkQ: [], checkSp: null, moving: false, quad: 0, atk: 0, lean: 0 }); return h; },
  // 02：躲在桌子底下——牠就站在桌子旁邊，彎下來聽
  hide(kind) {
    const W = __ut.W; this.calm(); __ut.god();
    const type = kind || 'desk';
    const r = this.room(q => q.f >= 1 && q.hides && q.hides.some(s => s.type === type) && q.light !== 'dark' && !q.survivor && q.special !== 'dock');
    const mine = r.hides.find(s => s.type === type);
    this.put(r, mine.x - r.x0);
    const side = (mine.x - r.x0) > RW / 2 ? -1 : 1;
    W.P.face = side; enterHide(mine); W.P.hideT = 1;
    const h = this.hunterAt(mine.x + side * (type === 'locker' ? 40 : 62), r.floorY, 'check');
    h.checkSp = mine; h.checkT = .5; h.checkSnd = type === 'locker'; h.lean = 1; h.face = -side; h.tilt = .5; h.heard = .7;
    W.heart = 146; W.heartProx = 1; W.pressure = 64; W.stage = 2; toggleTracker(true); W.tracker.t = .1;
    holdBreath(true); W.P.breath = .48;
    this.freeze();
  },
  // 03：陷阱——把牠電死在淹水的艙裡（你在隔壁，門關著，腳是乾的）
  trap() {
    const W = __ut.W; this.calm(); __ut.god();
    const r = W.rooms[W.M.traps[0]]; r.explored = true; r.trap.seen = true;
    r.water = .6; r.trap.state = 'armed';
    const door = r.doorL || r.doorR, side = door === r.doorL ? -1 : 1;
    const nb = W.rooms[r.i + side]; door.state = 'closed'; door.open = 0; markDoors();
    W.rooms.forEach(q => { if (q !== r) q.water = Math.min(q.water, .04); });
    this.put(nb, side < 0 ? RW - 46 : 46); W.P.face = -side; nb.explored = true;
    const h = this.hunterAt(r.x0 + (side < 0 ? 84 : RW - 84), r.floorY, 'search'); h.face = side; h.turn = .6;
    W.pressure = 66; W.stage = 2;
  },
  fire() { fireTrap(); },
  // 04：撤離——潛艇快到了，回聲人從走廊另一頭過來
  extract() {
    const W = __ut.W; this.calm(); __ut.god(); __ut.G.settings.nums = false;
    const r = W.rooms[W.dock.room]; this.put(r, r.moon ? (r.moon.x - r.x0 > RW / 2 ? 90 : RW - 90) : 120);
    W.pressure = 86; W.stage = 3; W.dock.called = true; W.dock.t = 9; W.dock.waveT = 99; W.heart = 132;
    const dir = W.P.x - r.x0 > RW / 2 ? -1 : 1;
    for (let k = 0; k < 3; k++) { const e = spawnFoe('husk', W.P.x + dir * (170 + k * 46), r.floorY, true); e.spawnT = 0; e.chase = true; e.hp = e.hpMax = 900; e.face = -dir; e.shoutT = k === 0 ? 1 : 0; }
    W.P.face = dir; setFire(true);
  },
  // 06：管道裡的牠——格柵在震、滴黏液、燈被干擾
  vent() {
    const W = __ut.W; this.calm(); __ut.god();
    const v = W.vents.find(o => { const r = W.rooms[o.room]; return r.f >= 1 && r.light !== 'dark' && !r.survivor && r.special !== 'dock'; }) || W.vents[0];
    const r = W.rooms[v.room]; this.put(r, v.x - r.x0 > RW / 2 ? 70 : RW - 70); W.P.face = v.x > W.P.x ? 1 : -1; toggleStance(true);
    const h = W.hunter; h.state = 'venting'; h.vent = v; h.ventT = 99; h.seen = true;
    toggleTracker(true); W.tracker.t = .1; W.heart = 128; W.heartProx = .8;
  },
  // 08：被發現了——牠四肢著地衝過來
  chase() {
    const W = __ut.W; this.calm(); __ut.god();
    const r = this.room(q => q.f >= 1 && q.doorL && q.doorR && q.light !== 'dark' && !q.survivor && q.special !== 'dock');
    r.doorL.state = 'open'; r.doorL.open = 1; r.doorR.state = 'open'; r.doorR.open = 1; markDoors();
    this.put(r, 96); W.P.face = 1;
    const h = this.hunterAt(r.x0 + 250, r.floorY, 'hunt'); h.face = -1; h.know = 5; h.moving = true; h.quad = 1; h.heard = 1; h.tx = W.P.x; h.ty = W.P.y;
    h.flash = .28; // 被頭燈照到的那一瞬間
    W.pressure = 72; W.stage = 2; W.heart = 158; W.heartProx = .8;
    this.freeze();
  },
  terminal() { UI.readLog('1-2'); },
  // 05：海燕號（中期進度）
  hubState() {
    const G = __ut.G; G.credits = 2460; G.settings.nums = true;
    [0, 1, 2].forEach(i => { G.sectors[i].cleared = true; G.sectors[i].stars = [true, i < 2, i === 0]; G.sectors[i].runs = 3; });
    ['ye', 'amon', 'chen', 'tie', 'lu'].forEach(id => { if (SURV[id]) G.survivors[id] = true; });
    LOG_ORDER.slice(0, 9).forEach(id => G.logs[id] = true);
    G.meta = { hp: 2, armor: 1, quiet: 1, search: 2, lungs: 1 };
  },
};
'ok';
