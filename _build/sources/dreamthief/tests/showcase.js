/* 收藏庫截圖用的擺設（tests/shots_steps.py 會把這支注入遊戲頁）。
   都是用遊戲本身的函式擺出來的真實畫面，不另外畫東西。 */
window.__show = (() => {
  const SH = {};
  // 一個玩了一陣子的存檔：前四個夢都開了、有錢、工作台升過幾樣
  SH.save = (o = {}) => {
    try { localStorage.clear(); } catch (e) {}
    G = newG();
    G.money = o.money ?? 12480;
    G.chapters.forEach((c, i) => { c.unlocked = i <= (o.ch ?? 3); });
    G.chapters[0].core = true; G.chapters[0].dives = 6; G.chapters[0].best = 2;
    G.chapters[1].dives = 3; G.chapters[1].best = 1;
    G.weapons.revolver.lvl = 3; G.weapons.crossbow.owned = true; G.weapons.crossbow.lvl = 2;
    G.tools.incense = true; G.meta.bag = 1; G.meta.lantern = 1; G.meta.hp = 1;
    G.loadout = { weapon: o.weapon || 'revolver', tool: 'decoy', candies: 3 }; G.candyStock = 7;
    G.stats = { dives: 11, extracts: 8, lost: 3, kills: 142, assassins: 37, earned: 23650, time: 0 };
    G.flags.tut = 1;
    saveGame();
  };
  SH.dive = (chi) => { S.mode = 'hub'; UI.startDive(chi); };
  // 換成指定種子的地圖（同一個種子，每次擺出來都一樣）
  SH.layer = (seed, depth = 0, wake = 30) => {
    W.seed = seed >>> 0; W.depth = depth; buildLayer();
    W.said = {}; for (let s = 1; s <= 3; s++) for (let d = 0; d < 3; d++) W.said['wake' + s + d] = 1;
    W.wake = wake; W.stage = wake >= 75 ? 3 : wake >= 50 ? 2 : wake >= 25 ? 1 : 0;
    RAD.q = []; RAD.cur = null; $('#radio').classList.remove('show');
    R.snap = true; updateVis(true); UI.hudInit();
  };
  const roomFoes = (r) => W.foes.filter(e => !e.dead && !e.boss && W.m.roomOf[Math.floor(e.y / T) * W.m.w + Math.floor(e.x / T)] === r.i);
  SH.rooms = () => W.m.rooms.map(r => ({ i: r.i, kind: r.kind, w: r.w, h: r.h, foes: roomFoes(r).map(e => e.type).join(',') }));
  // 把主角放進一個有夢衛的房間，讓牠們發現主角（自動射擊會開始）
  SH.fight = (o = {}) => {
    const p = W.players[0], rows = Math.max(...W.m.rooms.map(r => r.cell.r));
    let rooms = W.m.rooms.filter(r => r.kind === 'normal' && (o.edge || (r.cell.r > 0 && r.cell.r < rows))).map(r => ({ r, f: roomFoes(r) })).filter(x => x.f.length);
    rooms.sort((a, b) => b.f.length - a.f.length);
    const pick = rooms[Math.min(o.room || 0, rooms.length - 1)]; if (!pick) return 'no room';
    const { r, f } = pick;
    const mx = f.reduce((s, e) => s + e.x, 0) / f.length, my = f.reduce((s, e) => s + e.y, 0) / f.length;
    let best = null, bs = 1e9;
    for (let ty = r.y; ty < r.y + r.h; ty++) for (let tx = r.x; tx < r.x + r.w; tx++) {
      const x = (tx + .5) * T, y = (ty + .5) * T;
      if (!walkable(W.m.tiles[ty * W.m.w + tx]) || boxHits(x, y, 16)) continue;
      const d = dist(x, y, mx, my), want = (o.d || 3) * T;
      const sc = Math.abs(d - want) + dist(x, y, r.cx, r.cy) * .35 + (los(x, y, mx, my) ? 0 : 400) + (o.below && y < my ? 60 : 0);
      if (sc < bs) { bs = sc; best = { x, y }; }
    }
    if (!best) return 'no spot';
    p.x = best.x; p.y = best.y; p.vx = p.vy = 0; R.snap = true;
    p.lvl = o.lvl || 7; p.xp = Math.round(xpNeed(p.lvl) * .62);
    p.ups = Object.assign({ chain: 2, rate: 2, blades: 1, burn: 1 }, o.ups || {}); calcStats(p);
    p.hp = Math.round(p.hpMax * (o.hp ?? .82));
    for (const e of f) {
      e.hpMax *= (o.tough || 5); e.hp = e.hpMax;
      e.state = 'alert'; e.tgt = p; e.last = { x: p.x, y: p.y }; e.lostT = 0; e.alertT = 0; if (e.type === 'watcher') e.screamed = true;
    }
    updateVis(true);
    return { room: r.i, cell: r.cell, foes: f.map(e => e.type) };
  };
  // 主角附近的地方當作已經走過（地圖上看得到暗暗的輪廓）
  SH.reveal = (rad = 14) => {
    const p = W.players[0], tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
    for (let y = ty - rad; y <= ty + rad; y++) for (let x = tx - rad; x <= tx + rad; x++) if (x >= 0 && y >= 0 && x < W.m.w && y < W.m.h) W.seen[y * W.m.w + x] = 1;
  };
  // 清醒度升高後追來的影民
  SH.horde = (n = 4, type = 'shade') => {
    const p = W.players[0]; let k = 0;
    for (let i = 0; i < 60 && k < n; i++) {
      const a = rnd.range(0, TAU), r = rnd.range(2.6, 4.2) * T, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      if (!walkable(tileAt(x, y)) || boxHits(x, y, 16) || !los(p.x, p.y, x, y)) continue;
      const e = addFoe(type, x, y, {}); if (!e) continue;
      e.hpMax *= 5; e.hp = e.hpMax; e.spawn = 0; e.state = 'alert'; e.tgt = p; e.last = { x: p.x, y: p.y }; e.alertT = 0; k++;
    }
    return k;
  };
  // 潛行：睡著的影民、拿燈巡夜的巡夜者，主角蹲在櫃子前翻東西，旁邊一個櫃子剛翻開
  SH.stealth = (o = {}) => {
    const p = W.players[0];
    const inRoom = (c, r) => W.m.roomOf[c.ty * W.m.w + c.tx] === r.i;
    let cands = W.m.rooms.filter(r => r.kind === 'normal').map(r => {
      const f = roomFoes(r), cont = W.m.containers.filter(c => !c.open && inRoom(c, r));
      const sleep = f.filter(e => e.state === 'sleep').length, watch = f.filter(e => e.type === 'watcher').length;
      return { r, f, cont, sleep, watch, sc: sleep + watch * 2.2 + cont.length * .6 };
    }).filter(x => x.cont.length >= 2 && x.f.length >= 2 && (o.watch ? x.watch : 1));
    cands.sort((a, b) => b.sc - a.sc);
    const pick = cands[Math.min(o.room || 0, cands.length - 1)]; if (!pick) return 'no room';
    const front = c => c.side === 'w' ? { x: c.x + T * .95, y: c.y + T * .25 } : c.side === 'e' ? { x: c.x - T * .95, y: c.y + T * .25 } : { x: c.x, y: c.y + T * .95 };
    // 離夢衛最遠的兩個櫃子：一個翻開、一個正在翻
    const far = c => Math.min(...pick.f.map(e => dist(e.x, e.y, c.x, c.y)));
    const cs = pick.cont.slice().sort((a, b) => far(b) - far(a));
    const c2 = cs[0], c1 = cs.find(c => c !== c2 && dist(c.x, c.y, c2.x, c2.y) > 2.2 * T) || cs[1];
    const f2 = front(c2);
    p.x = f2.x; p.y = f2.y; p.vx = p.vy = 0; p.face = c2.x < p.x ? -1 : 1; R.snap = true;
    p.lvl = o.lvl || 4; p.xp = Math.round(xpNeed(p.lvl) * .4); p.ups = Object.assign({ shadow: 2, hands: 1 }, o.ups || {}); calcStats(p);
    openContainer(c1, p);
    p.still = 1; p.search = c2; c2.prog = o.prog ?? .45;
    updateVis(true);
    return { room: pick.r.i, foes: pick.f.map(e => e.type + ':' + e.state), cont: pick.cont.length };
  };
  // 撤離：敲了鐘門，守住倒數，夢衛從四面湧來；背包裡裝了不少
  SH.bell = (o = {}) => {
    const p = W.players[0], e = W.m.exits.find(x => x.type === 'bell'); if (!e) return 'no bell';
    let best = null, bs = 1e9;
    for (let k = 0; k < 40; k++) {
      const x = e.x + rnd.range(-1.2, 1.2) * T, y = e.y + rnd.range(1.1, 2.0) * T;
      if (!walkable(tileAt(x, y)) || boxHits(x, y, 16)) continue;
      const sc = Math.abs(x - e.x) + Math.abs(y - e.y - 1.5 * T); if (sc < bs) { bs = sc; best = { x, y }; }
    }
    if (!best) return 'no spot';
    p.x = best.x; p.y = best.y; p.vx = p.vy = 0; R.snap = true;
    p.lvl = o.lvl || 9; p.ups = Object.assign({ chain: 2, rate: 2, blades: 1, power: 1 }, o.ups || {}); calcStats(p);
    p.hp = Math.round(p.hpMax * (o.hp ?? .66));
    const bag = (o.bag || [[4, 2], [3, 2], [2, 1], [2, 1], [1, 1], [0, 1]]).map(([r, sz]) => makeMemory(r, W.chi, { size: sz })); bag[0].pocket = true; p.bag = bag;
    startChannel(p, e); W.channel.t = o.t ?? 7.2; W.channel.waveT = 99;
    updateVis(true);
    return { bag: bagUsed(p) + '/' + p.cap };
  };
  // 截圖前把無線電字幕、橫幅、提示立刻收掉（不等淡出）
  SH.quiet = () => {
    RAD.q = []; RAD.cur = null; RAD.gap = 9;
    for (const id of ['#radio', '#banner', '#hint']) { const n = $(id); n.style.transition = 'none'; n.classList.remove('show'); void n.offsetWidth; setTimeout(() => { n.style.transition = ''; }, 80); }
    $('#toast').innerHTML = '';
  };
  // 在主角身邊丟幾段記憶（會從空中落下、立起光柱）
  SH.loot = (rars = [2, 3, 4], R0 = 2.3) => {
    const p = W.players[0];
    rars.forEach((rar, i) => {
      for (let k = 0; k < 30; k++) {
        const a = -Math.PI * .5 + (i - (rars.length - 1) / 2) * 1.1 + rnd.range(-.25, .25), rr = R0 * T * rnd.range(.9, 1.15);
        const x = p.x + Math.cos(a) * rr, y = p.y + Math.sin(a) * rr * .9;
        if (walkable(tileAt(x, y)) && !boxHits(x, y, 14)) { const it = makeMemory(rar, W.chi); W.picks.push({ k: 'mem', x, y, z: 0, vz: null, vx: 0, vy: 0, t: 1, item: it, beam: 1, ign: 0 }); break; }
      }
    });
  };
  // 直接站到頭目房裡、叫醒它
  SH.boss = (o = {}) => {
    const p = W.players[0], b = W.boss; if (!b) return 'no boss';
    p.x = b.room.cx + (o.dx || 0) * T; p.y = (b.room.y + b.room.h - (o.up || 2.2)) * T; R.snap = true;
    p.lvl = o.lvl || 12; p.ups = Object.assign({ chain: 2, power: 3, rate: 3, blades: 2, burn: 2, crit: 2 }, o.ups || {}); calcStats(p);
    p.hp = Math.round(p.hpMax * (o.hp ?? .74));
    updateVis(true);
    return 'ok';
  };
  // 讓頭目馬上出某一招（截圖用）
  SH.act = (a) => { const b = W.boss; if (!b) return; b.act = a; b.actT = 0; b.n = 0; b.k = 0; b.last = a; b.awake = true; };
  SH.god = () => { const p = W.players[0]; p.inv = 999; };
  // 當鋪櫃台上擺幾段剛帶回來的記憶
  SH.counter = () => {
    W = { usedNames: new Set(), depth: 1 };
    const mk = (rar, chi, o) => { const it = makeMemory(rar, chi, o); it.d = 1; return it; };
    const life = (() => { const c = CH[1], [n, f] = c.life.items[2]; return { id: uid() + '_l', n, f, rar: 3, size: 2, val: 1180, ch: 1, key: 'lin_life2', kind: 'life', pocket: false }; })();
    G.pending = [mk(4, 1), life, mk(2, 1), mk(2, 0), mk(1, 1), mk(0, 1)];
    W = null;
    saveGame();
  };
  return SH;
})();
