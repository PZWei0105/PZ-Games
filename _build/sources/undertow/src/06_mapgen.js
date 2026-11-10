/* ============ 06 研究站地圖生成 ============ */
let GEN_BONUS = 0;
function sectorCfg(si, tier) {
  if (si < 5) return SECTORS[si];
  const t = tier || 1;
  return {
    id: 5, endless: true, tier: t, name: '無盡深潛', en: 'ENDLESS', depth: 8400 + 140 * t, cols: 4, floors: Math.min(6, 4 + Math.floor((t + 1) / 2)),
    T: Math.max(500, 660 - t * 12), col: '#b47cff', themes: ENDLESS_THEMES,
    hunter: { walk: 86, run: Math.min(362, 340 + t * 2), door: 82 + t * 3, hear: 1.7, shriek: true },
    husks: 3 + Math.floor(t / 2), walls: 3, trickle: Math.max(42, 56 - t * 2),
    survivors: [], logs: [], intro: [`無盡深潛・第 ${t} 層`, '瀚淵站底下的舊礦井。沒有地圖，沒有人，只有更深的地方。'],
  };
}

const PROPW = { bunk: 92, locker: 34, desk: 72, table: 104, fridge: 48, counter: 84, bed: 98, cabinet: 46, iv: 22, crate: 48, shelf: 62, barrel: 30, sofa: 92, plant: 26,
  washer: 48, pump: 112, valve: 30, generator: 122, bench: 92, cable: 42, console: 74, speaker: 62, server: 40, mic: 22, tank: 56, optable: 104, freezer: 74, labbench: 104,
  bigtank: 170, hatch: 72, suitrack: 62, podhatch: 74, body: 62, moonpool: 190 };
const SEARCHABLE = { locker: 1, desk: 1, fridge: 1, cabinet: 1, crate: 1, shelf: 1, counter: 1, washer: 1, bench: 1, console: 1, server: 1, tank: 1, freezer: 1, labbench: 1, suitrack: 1, body: 1, barrel: 1, bunk: 1, bed: 1, optable: 1, sofa: 1 };
/* 躲得進去的家具：locker＝關在櫃子裡（最安靜）、bed＝床底、desk＝桌子底下 */
const HIDEABLE = { locker: 'locker', freezer: 'locker', bunk: 'bed', bed: 'bed', sofa: 'bed', desk: 'desk', table: 'desk', counter: 'desk', labbench: 'desk', bench: 'desk', optable: 'desk' };
const HIDE_INFO = {
  locker: { label: '躲進置物櫃', muf: .34, enter: 95, ov: 'locker' },
  bed: { label: '躲到床底', muf: .5, enter: 55, ov: 'low' },
  desk: { label: '躲到桌子下', muf: .62, enter: 45, ov: 'low' },
};
const HIDE_LABEL = { grate: '躲進月池邊的維修坑', freezer: '躲進冷凍櫃', sofa: '躲到沙發後面', table: '躲到桌子下', counter: '躲到流理台下', labbench: '躲到實驗台下', bench: '躲到工作台下', optable: '躲到解剖台下', bunk: '躲到床底' };
/* 開了會一直響的機器：可以拿來引開聆 */
const MACHINES = { washer: '洗衣機', pump: '泵浦', generator: '發電機', speaker: '喇叭' };
const THEME_PROPS = {
  airlock: ['suitrack', 'locker', 'locker', 'crate'],
  pod: ['locker', 'crate', 'locker'],
  dock: [],
  dorm: ['bunk', 'bunk', 'locker', 'locker', 'desk'],
  mess: ['table', 'table', 'fridge', 'counter'],
  med: ['bed', 'bed', 'cabinet', 'iv', 'cabinet'],
  storage: ['crate', 'locker', 'shelf', 'crate', 'barrel'],
  lounge: ['sofa', 'shelf', 'plant', 'table'],
  laundry: ['washer', 'washer', 'washer', 'locker', 'crate'],
  pump: ['pump', 'locker', 'valve', 'barrel'],
  power: ['generator', 'locker', 'cabinet', 'barrel'],
  workshop: ['bench', 'crate', 'shelf', 'barrel'],
  corridor: ['crate', 'locker', 'cable', 'barrel'],
  sonar: ['console', 'speaker', 'desk', 'console'],
  studio: ['console', 'mic', 'desk', 'sofa'],
  archive: ['server', 'server', 'server', 'desk'],
  office: ['desk', 'desk', 'shelf', 'plant'],
  tanks: ['tank', 'locker', 'tank', 'cabinet'],
  autopsy: ['optable', 'cabinet', 'cabinet', 'iv'],
  freezer: ['freezer', 'freezer', 'crate'],
  lab: ['labbench', 'tank', 'cabinet', 'shelf'],
  control: ['console', 'console', 'desk', 'server'],
  server: ['server', 'locker', 'server', 'server', 'cabinet'],
  deep: [],
};

function genMap(si, seed, tier) {
  const S = sectorCfg(si, tier), rng = RNG(seed);
  const C = S.cols, F = S.floors;
  const M = { S, si, C, F, rooms: [], doors: [], ladders: [], vents: [], seed };
  const idx = (c, f) => f * C + c;
  for (let f = 0; f < F; f++) for (let c = 0; c < C; c++) {
    M.rooms.push({ i: idx(c, f), c, f, x0: c * RW, y0: f * FH, floorY: f * FH + FH - SLAB, theme: null, water: 0, breach: null, collapsed: false, explored: false,
      props: [], spots: [], vent: null, ladUp: null, ladDown: null, doorL: null, doorR: null, special: null, flick: rng.f(), seed: rng.int(1, 1e9), survivor: null, lightDead: false });
  }
  const R = (c, f) => (c < 0 || c >= C || f < 0 || f >= F) ? null : M.rooms[idx(c, f)];
  const sc = rng.int(0, C - 1);
  const start = R(sc, 0);
  const dc = sc < C / 2 ? C - 1 : 0;
  const dock = R(dc, F - 1);
  start.special = 'start'; dock.special = 'dock';
  // 崩塌艙（不能進的格子，讓結構更像迷宮）
  const nCol = C * F >= 20 ? rng.int(1, 2) : rng.int(0, 1);
  for (let k = 0, tries = 0; k < nCol && tries < 40; tries++) {
    const r = R(rng.int(0, C - 1), rng.int(1, F - 1));
    if (r.special || r.collapsed) continue;
    if (Math.abs(r.c - sc) + r.f <= 1) continue;
    r.collapsed = true; k++;
  }
  // 梯井
  const addLadder = (c, f) => {
    const up = R(c, f), dn = R(c, f + 1);
    if (!up || !dn || up.collapsed || dn.collapsed || up.ladDown) return false;
    const opts = [86, RW - 86, RW / 2 + 40, RW / 2 - 40];
    let lx = (dn.special === 'dock' || up.special === 'dock') ? rng.pick([60, RW - 60]) : rng.pick(opts);
    if (dn.ladDown && Math.abs(dn.ladDown.x - (c * RW + lx)) < 70) lx = RW - lx;
    if (up.ladUp && Math.abs(up.ladUp.x - (c * RW + lx)) < 70) lx = RW - lx;
    const L = { c, f, x: c * RW + lx, y1: up.floorY, y2: dn.floorY };
    M.ladders.push(L); up.ladDown = L; dn.ladUp = L; return true;
  };
  for (let f = 0; f < F - 1; f++) {
    const cols = rng.shuffle([...Array(C).keys()]);
    const n = C >= 4 ? rng.int(1, 2) : (rng.chance(.4) ? 2 : 1);
    let made = 0; for (const c of cols) { if (made >= n) break; if (addLadder(c, f)) made++; }
  }
  // 連通性：每間艙都要走得到
  const neighbors = (r) => {
    const out = [];
    const l = R(r.c - 1, r.f), rr = R(r.c + 1, r.f);
    if (l && !l.collapsed) out.push(l); if (rr && !rr.collapsed) out.push(rr);
    if (r.ladDown) out.push(R(r.c, r.f + 1)); if (r.ladUp) out.push(R(r.c, r.f - 1));
    return out;
  };
  const reach = () => { const seen = new Set([start.i]), q = [start]; while (q.length) { const r = q.shift(); for (const n of neighbors(r)) if (!seen.has(n.i)) { seen.add(n.i); q.push(n); } } return seen; };
  for (let guard = 0; guard < 30; guard++) {
    const seen = reach();
    const lost = M.rooms.filter(r => !r.collapsed && !seen.has(r.i));
    if (!lost.length) break;
    let fixed = false;
    for (const r of lost) {
      for (const [dc2, df] of [[0, -1], [0, 1]]) {
        const n = R(r.c + dc2, r.f + df);
        if (n && !n.collapsed && seen.has(n.i)) { if (df < 0 ? addLadder(r.c, r.f - 1) : addLadder(r.c, r.f)) { fixed = true; break; } }
      }
      if (fixed) break;
    }
    if (!fixed) {
      // 被坍塌艙包圍：打通一間相鄰的坍塌艙
      let open = null;
      for (const r of lost) { for (const [dc2, df] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const n = R(r.c + dc2, r.f + df); if (n && n.collapsed) { open = n; break; } } if (open) break; }
      if (!open) break;
      open.collapsed = false;
    }
  }
  // 艙門
  for (let f = 0; f < F; f++) for (let c = 1; c < C; c++) {
    const a = R(c - 1, f), b = R(c, f);
    if (a.collapsed || b.collapsed) continue;
    const d = { i: M.doors.length, c, f, x: c * RW, y: a.floorY, a: a.i, b: b.i, state: rng.chance(.42) ? 'closed' : 'open', lock: null, hp: 100, hpMax: 100, open: 0, hitT: 0, shake: 0, weld: 0 };
    d.open = d.state === 'open' ? 1 : 0;
    M.doors.push(d); a.doorR = d; b.doorL = d;
  }
  // 圖距離
  const gdist = (from) => {
    const D = new Map([[from.i, 0]]), q = [from];
    while (q.length) { const r = q.shift(); for (const n of neighbors(r)) { if (!D.has(n.i)) { D.set(n.i, D.get(r.i) + 1); q.push(n); } } }
    return D;
  };
  const dStart = gdist(start);
  const ok = r => !r.collapsed && !r.special;
  // 上鎖的金庫：邊緣、沒梯井、只有一扇門的死巷
  const vaultCands = M.rooms.filter(r => ok(r) && (r.c === 0 || r.c === C - 1) && !r.ladUp && !r.ladDown && ((r.c === 0 && r.doorR && !r.doorL) || (r.c === C - 1 && r.doorL && !r.doorR)) && (dStart.get(r.i) || 0) >= 2);
  let vault = null;
  if (vaultCands.length) {
    vault = rng.pick(vaultCands); vault.special = 'vault';
    const d = vault.doorL || vault.doorR; d.state = 'locked'; d.lock = 'red'; d.open = 0; d.hp = 999; d.hpMax = 999;
  }
  // 最終區：收容深艙
  let deep = null;
  if (S.final) {
    const cands = M.rooms.filter(r => ok(r) && r.f === F - 1).sort((a, b) => (dStart.get(b.i) || 0) - (dStart.get(a.i) || 0));
    deep = cands[0] || M.rooms.filter(ok).pop(); deep.special = 'deep'; deep.theme = 'deep';
    // 深艙的梯子移到牆邊，中間留給收容槽
    if (deep.ladUp) {
      const up = R(deep.c, deep.f - 1); let lx = RW - 50;
      if (up && up.ladUp && Math.abs(up.ladUp.x - (deep.c * RW + lx)) < 70) lx = 50;
      deep.ladUp.x = deep.c * RW + lx;
    }
  }
  // 逃生艙
  const nPods = C * F >= 18 ? 2 : 1;
  const podC = rng.shuffle(M.rooms.filter(r => ok(r) && (dStart.get(r.i) || 0) >= 2));
  for (let k = 0; k < nPods && k < podC.length; k++) { podC[k].special = 'pod'; }
  // 主題
  const themes = rng.shuffle(S.themes.slice());
  let ti = 0;
  for (const r of M.rooms) {
    if (r.collapsed) continue;
    if (r.special === 'start') r.theme = 'airlock';
    else if (r.special === 'dock') r.theme = 'dock';
    else if (r.special === 'pod') r.theme = 'pod';
    else if (!r.theme) r.theme = themes[ti++ % themes.length];
    const lm = THEMES[r.theme].light;
    r.light = lm; // lit / emer / dark
  }
  // 通風口（獵手的通道）
  for (let f = 0; f < F; f++) {
    const cands = M.rooms.filter(r => r.f === f && !r.collapsed && r.special !== 'start' && r.special !== 'vault');
    if (!cands.length) continue;
    const n = C >= 4 ? 2 : 1;
    rng.shuffle(cands).slice(0, n).forEach(r => { const vx = r.x0 + rng.pick([70, RW - 70, RW / 2]); r.vent = { x: vx, y: r.y0 + 52, room: r.i, shake: 0 }; M.vents.push(r.vent); });
  }
  // 擺設
  GEN_BONUS = S.endless ? .04 + .008 * S.tier : si * .012;
  for (const r of M.rooms) if (!r.collapsed) layoutRoom(r, rng);
  // 生還者
  M.survivors = [];
  const named = S.survivors.filter(id => !G.survivors[id]);
  const nSurv = S.endless ? 2 : S.survivors.length;
  const survRooms = [];
  if (vault) survRooms.push(vault);
  const sc2 = rng.shuffle(M.rooms.filter(r => ok(r) && (dStart.get(r.i) || 0) >= 2 && r !== vault));
  for (const r of sc2) { if (survRooms.length >= nSurv) break; if (!survRooms.some(o => Math.abs(o.c - r.c) + Math.abs(o.f - r.f) < 2)) survRooms.push(r); }
  for (const r of sc2) { if (survRooms.length >= nSurv) break; if (!survRooms.includes(r)) survRooms.push(r); }
  survRooms.slice(0, nSurv).forEach((r, k) => {
    const id = named[k] || null;
    const name = id ? SURV[id].name : rng.pick(GENERIC_SURV);
    const x = r.x0 + freeX(r, rng, [64, RW - 64]);
    const s = { id, name, room: r.i, x, y: r.floorY, state: 'hide', t: 0, hue: id ? SURV[id].hue : rng.int(0, 360) };
    r.survivor = s; M.survivors.push(s);
  });
  // 搜索點：鑰卡、日誌、強化艙、一般
  const spotRooms = M.rooms.filter(r => !r.collapsed && r.spots.length);
  const takeSpot = (r, pref) => { const free = r.spots.filter(s => s.kind === 'loot'); if (!free.length) return null; return pref ? (free.find(pref) || free[0]) : rng.pick(free); };
  if (vault) {
    const dV = gdist(vault);
    const kc = rng.shuffle(spotRooms.filter(r => r !== vault && r.special !== 'start' && (dV.get(r.i) || 0) >= 2));
    const kr = kc[0] || spotRooms.find(r => r !== vault);
    if (kr) { const sp = takeSpot(kr); if (sp) { sp.kind = 'key'; sp.rar = 3; } }
    vault.spots.forEach(s => { if (s.kind === 'loot') s.rar = Math.max(s.rar, rng.chance(.5) ? 4 : 3); });
  }
  const logRooms = rng.shuffle(spotRooms.filter(r => r.special !== 'start'));
  S.logs.forEach((lid, k) => {
    const r = logRooms[k % logRooms.length]; if (!r) return;
    const sp = takeSpot(r, s => ['console', 'desk', 'body', 'server'].includes(s.prop)); if (sp) { sp.kind = 'log'; sp.log = lid; sp.rar = 2; }
  });
  const nCache = 3 + (C * F >= 20 ? 1 : 0);
  rng.shuffle(spotRooms.filter(r => r.special !== 'start')).slice(0, nCache).forEach(r => { const sp = takeSpot(r); if (sp) { sp.kind = 'cache'; sp.rar = 3; } });
  // 陷阱艙：有配電箱的艙，插上保險絲、灌水，就能把聆電死在裡面
  const trapPref = ['pump', 'power', 'laundry', 'workshop', 'tanks', 'freezer', 'storage', 'lab', 'mess', 'server'];
  const trapC = rng.shuffle(M.rooms.filter(r => ok(r) && r.special !== 'vault' && (r.doorL || r.doorR) && (dStart.get(r.i) || 0) >= 1))
    .sort((a, b) => (trapPref.includes(b.theme) ? 1 : 0) - (trapPref.includes(a.theme) ? 1 : 0));
  M.traps = [];
  const nTrap = C * F >= 20 ? 2 : 1;
  for (const r of trapC) {
    if (M.traps.length >= nTrap) break;
    if (M.traps.some(i => { const o = M.rooms[i]; return Math.abs(o.c - r.c) + Math.abs(o.f - r.f) < 2; })) continue;
    const left = !(r.vent && r.vent.x - r.x0 < RW / 2);
    r.trap = { bx: r.x0 + (left ? 62 : RW - 62), by: r.y0 + (r.f === 0 ? 18 : 0) + 104, vx: r.x0 + (left ? RW - 92 : 92), state: 'nofuse', flood: 0, seen: false };
    M.traps.push(r.i);
  }
  // 每個陷阱一定有一根保險絲放在別的艙
  for (const ti of M.traps) {
    const dT = gdist(M.rooms[ti]);
    const fc = rng.shuffle(spotRooms.filter(r => r.i !== ti && r.special !== 'start' && r.special !== 'vault' && (dT.get(r.i) || 0) >= 2 && r.spots.some(s => s.kind === 'loot')));
    const fr = fc[0] || spotRooms.find(r => r.i !== ti && r.spots.some(s => s.kind === 'loot'));
    if (fr) { const sp = takeSpot(fr); if (sp) { sp.kind = 'fuse'; sp.rar = 2; } }
  }
  // 起點房只給一點普通東西
  start.spots.forEach(s => { if (s.kind === 'loot') s.rar = Math.min(s.rar, 1); });
  // 住在站裡的東西：遊蕩的回聲人、長在牆裡的人
  M.residents = [];
  const far = rng.shuffle(M.rooms.filter(r => !r.collapsed && r.special !== 'start' && r.special !== 'dock' && r.special !== 'deep' && !r.survivor && (dStart.get(r.i) || 0) >= 2));
  for (let k = 0; k < S.husks && far.length; k++) { const r = far[k % far.length]; M.residents.push({ room: r.i, type: 'husk', x: r.x0 + rng.int(70, RW - 70) }); }
  let walls = 0;
  for (const r of rng.shuffle(far.slice())) {
    if (walls >= S.walls) break;
    if (M.traps.includes(r.i) || M.residents.some(o => o.room === r.i && o.type === 'wall')) continue;
    const gx = wallGap(r); if (gx == null) continue;
    M.residents.push({ room: r.i, type: 'wall', x: r.x0 + gx }); walls++;
  }
  M.start = start.i; M.dock = dock.i; M.vault = vault ? vault.i : -1; M.deep = deep ? deep.i : -1;
  M.dist = dStart;
  return M;
}

/* 牆上空著、可以「長」一個人的位置（不擋家具、通風口、梯子） */
function wallGap(r) {
  const busy = r.props.map(p => [p.x - 10, p.x + p.w + 10]);
  if (r.vent) busy.push([r.vent.x - r.x0 - 44, r.vent.x - r.x0 + 44]);
  if (r.ladUp) busy.push([r.ladUp.x - r.x0 - 40, r.ladUp.x - r.x0 + 40]);
  if (r.ladDown) busy.push([r.ladDown.x - r.x0 - 40, r.ladDown.x - r.x0 + 40]);
  if (r.survivor) busy.push([r.survivor.x - r.x0 - 50, r.survivor.x - r.x0 + 50]);
  for (const x of [RW / 2, 120, RW - 120, 90, RW - 90, 150, RW - 150]) if (busy.every(([a, b]) => x + 30 < a || x - 30 > b)) return x;
  return null;
}
function freeX(r, rng, pref) {
  const bad = [];
  if (r.ladUp) bad.push(r.ladUp.x - r.x0); if (r.ladDown) bad.push(r.ladDown.x - r.x0);
  for (const p of pref) if (bad.every(b => Math.abs(b - p) > 50)) return p;
  return RW / 2;
}

function layoutRoom(r, rng) {
  const forb = [[0, 40], [RW - 40, RW]];
  if (r.ladUp) forb.push([r.ladUp.x - r.x0 - 30, r.ladUp.x - r.x0 + 30]);
  if (r.ladDown) forb.push([r.ladDown.x - r.x0 - 34, r.ladDown.x - r.x0 + 34]);
  const props = [];
  const fits = (x, w) => forb.every(([a, b]) => x + w <= a || x >= b) && props.every(p => x + w + 6 <= p.x || x >= p.x + p.w + 6);
  const place = (kind, x) => { const w = PROPW[kind]; if (x >= 34 && x + w <= RW - 34 && fits(x, w)) { props.push({ kind, x, w }); forb.push([x - 4, x + w + 4]); return true; } return false; };
  const must = (kind, xs) => { for (const x of xs) if (place(kind, x)) return; const x = xs[0], w = PROPW[kind]; for (let k = props.length - 1; k >= 0; k--) { const q = props[k]; if (!(x + w + 6 <= q.x || x >= q.x + q.w + 6)) props.splice(k, 1); } props.push({ kind, x, w }); forb.push([x - 4, x + w + 4]); };
  if (r.theme === 'dock') {
    for (const mx of [RW / 2 - PROPW.moonpool / 2 + 20, 128, 136, 112, 60, 48, 40]) if (place('moonpool', mx)) break;
    if (!props.some(p => p.kind === 'moonpool')) { props.push({ kind: 'moonpool', x: 128, w: PROPW.moonpool }); forb.push([124, 128 + PROPW.moonpool + 4]); }
    for (const cx of [44, 40, 250, 270]) if (place('console', cx)) break;
    // 撤離塢也要有地方躲：撐倒數的時候牠一定會來
    for (const lx of [126, 84, 270, 300, 240, 50]) if (place('locker', lx)) break;
  }
  else if (r.theme === 'deep') {
    const lad = r.ladUp ? r.ladUp.x - r.x0 : null;
    must('bigtank', lad == null ? [95, 110, 80] : lad > RW / 2 ? [100, 90, 80, 70] : [120, 130, 140, 150]);
  }
  else if (r.theme === 'pod') { must('podhatch', [RW / 2 - 37, 110, 180, 60, 230, 250]); }
  else if (r.theme === 'airlock') { must('hatch', r.c === 0 ? [40, 120, 200, 250] : [RW - 40 - 72, 160, 90, 40]); }
  const list = THEME_PROPS[r.theme] || ['crate'];
  for (let k = 0; k < 9; k++) {
    const kind = list[k % list.length];
    const w = PROPW[kind];
    let placed = false;
    for (let t = 0; t < 8 && !placed; t++) placed = place(kind, rng.int(40, RW - 40 - w));
  }
  if (rng.chance(.22) && r.special !== 'start') { for (let t = 0; t < 6; t++) if (place('body', rng.int(40, RW - 100))) break; }
  props.sort((a, b) => a.x - b.x);
  r.props = props;
  r.hides = props.filter(p => HIDEABLE[p.kind]).map(p => ({ x: r.x0 + p.x + p.w / 2, w: p.w, kind: p.kind, type: HIDEABLE[p.kind], room: r.i }));
  // 撤離塢：月池邊的維修坑也能躲（撐倒數的時候牠一定會來）
  const mp = props.find(p => p.kind === 'moonpool');
  if (mp) r.hides.push({ x: r.x0 + mp.x + mp.w - 24, w: 40, kind: 'grate', type: 'bed', room: r.i });
  r.machines = props.filter(p => MACHINES[p.kind]).map(p => ({ x: r.x0 + p.x + p.w / 2, kind: p.kind, room: r.i, on: 0, cd: 0, broken: false, pulse: 0 }));
  // 搜索點：每間 1～3 個
  const sp = props.filter(p => SEARCHABLE[p.kind]);
  rng.shuffle(sp);
  const n = r.special === 'dock' ? 0 : Math.min(sp.length, r.theme === 'pod' ? 1 : rng.int(1, 3));
  for (let k = 0; k < n; k++) {
    const p = sp[k];
    r.spots.push({ x: r.x0 + p.x + p.w / 2, y: r.floorY, prop: p.kind, kind: 'loot', rar: rollRarity(rng, GEN_BONUS), t: 0, done: false, room: r.i });
  }
}
function rollRarity(rng, bonus) {
  const x = rng.f() - (bonus || 0);
  return x < .015 ? 5 : x < .045 ? 4 : x < .13 ? 3 : x < .32 ? 2 : x < .62 ? 1 : 0;
}
