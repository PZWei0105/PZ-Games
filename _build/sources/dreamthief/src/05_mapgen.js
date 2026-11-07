'use strict';
/* ====== 夢境生成：房間格狀拼接，完全由種子決定 ====== */
const TV = 0, TF = 1, TW = 2, TS = 3, TWA = 4;   // 虛空、地板、牆、家具、水
const walkable = t => t === TF || t === TWA;

function mapgen(seed, chi, depth, plan) {
  plan = plan || {};
  const R = RNG(seed);
  const final = chi === 4;
  const COLS = 4, ROWS = 5, CW = 12, CHH = 11, M = 2;
  const w = COLS * CW + M * 2, h = ROWS * CHH + M * 2;
  const tiles = new Uint8Array(w * h);
  const roomOf = new Int16Array(w * h).fill(-1);
  const I = (x, y) => y * w + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;

  /* 1. 挑選房間格 */
  const nRooms = clamp((final ? 9 : 10) + depth * 2, 9, 15);
  const cell = Array.from({ length: ROWS }, () => new Array(COLS).fill(-1));
  const cells = [], edges = [];
  const sc = R.int(1, 2), sr = ROWS - 1;
  cell[sr][sc] = 0; cells.push({ c: sc, r: sr });
  const nb = (c, r) => [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < COLS && b < ROWS);
  let guard = 0;
  while (cells.length < nRooms && guard++ < 999) {
    const from = R.weighted(cells, x => 1 + (ROWS - x.r) * .4);
    const opts = nb(from.c, from.r).filter(([a, b]) => cell[b][a] < 0);
    if (!opts.length) continue;
    const [a, b] = R.weighted(opts, o => o[1] < from.r ? 1.6 : 1);
    cell[b][a] = cells.length; cells.push({ c: a, r: b });
    edges.push([cell[from.r][from.c], cell[b][a]]);
  }
  // 多開幾條回路，讓撤退有路可繞
  let loops = 0;
  for (let i = 0; i < cells.length && loops < 3; i++) for (const [a, b] of nb(cells[i].c, cells[i].r)) {
    const j = cell[b][a];
    if (j > i && !edges.some(e => (e[0] === i && e[1] === j) || (e[0] === j && e[1] === i)) && R.chance(.22)) { edges.push([i, j]); loops++; }
  }
  // 格子圖距離，找最遠的格當夢核房
  const cd = new Array(cells.length).fill(99); cd[0] = 0;
  for (let k = 0; k < cells.length; k++) for (const [a, b] of edges) { if (cd[a] + 1 < cd[b]) cd[b] = cd[a] + 1; if (cd[b] + 1 < cd[a]) cd[a] = cd[b] + 1; }
  let far = 0; for (let i = 1; i < cells.length; i++) if (cd[i] > cd[far] || (cd[i] === cd[far] && R.chance(.5))) far = i;
  const bossCell = depth === 2 ? far : -1;

  /* 2. 房間矩形 */
  const rooms = cells.map((cl, i) => {
    const x0 = M + cl.c * CW, y0 = M + cl.r * CHH;
    let rw, rh;
    if (i === bossCell) { rw = CW - 2; rh = CHH - 2; }
    else if (i === 0) { rw = R.int(7, 8); rh = R.int(6, 7); }
    else if (R.chance(.18)) { rw = CW - 3; rh = CHH - 3; }
    else { rw = R.int(6, CW - 4); rh = R.int(5, CHH - 4); }
    const x = x0 + 1 + R.int(0, CW - 2 - rw), y = y0 + 1 + R.int(0, CHH - 2 - rh);
    return { i, cell: cl, x, y, w: rw, h: rh, cx: (x + rw / 2) * T, cy: (y + rh / 2) * T, kind: i === 0 ? 'start' : i === bossCell ? 'boss' : 'normal', dist: cd[i] };
  });
  for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { tiles[I(x, y)] = TF; roomOf[I(x, y)] = r.i; }

  /* 3. 走廊（兩格寬，L 形） */
  const carve = (x, y) => { for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const xx = x + dx, yy = y + dy; if (inb(xx, yy) && tiles[I(xx, yy)] === TV) tiles[I(xx, yy)] = TF; } };
  for (const [a, b] of edges) {
    const A = rooms[a], B = rooms[b];
    const horiz = A.cell.r === B.cell.r;
    if (horiz) {
      const lo = Math.max(A.y, B.y), hi = Math.min(A.y + A.h, B.y + B.h) - 2;
      const L = A.x < B.x ? A : B, Rr = L === A ? B : A;
      if (hi >= lo) { const yy = R.int(lo, hi); for (let x = L.x + L.w - 1; x <= Rr.x; x++) carve(x, yy); }
      else {
        const ay = clamp(Math.floor(L.y + L.h / 2) - 1, L.y, L.y + L.h - 2), bx = Rr.x + R.int(0, Math.max(0, Rr.w - 2));
        for (let x = L.x + L.w - 1; x <= bx; x++) carve(x, ay);
        const y1 = Math.min(ay, Rr.y), y2 = Math.max(ay, Rr.y + Rr.h - 1);
        for (let y = y1; y <= y2; y++) carve(bx, y);
      }
    } else {
      const lo = Math.max(A.x, B.x), hi = Math.min(A.x + A.w, B.x + B.w) - 2;
      const U = A.y < B.y ? A : B, D = U === A ? B : A;
      if (hi >= lo) { const xx = R.int(lo, hi); for (let y = U.y + U.h - 1; y <= D.y; y++) carve(xx, y); }
      else {
        const ax = clamp(Math.floor(U.x + U.w / 2) - 1, U.x, U.x + U.w - 2), by = D.y + R.int(0, Math.max(0, D.h - 2));
        for (let y = U.y + U.h - 1; y <= by; y++) carve(ax, y);
        const x1 = Math.min(ax, D.x), x2 = Math.max(ax, D.x + D.w - 1);
        for (let x = x1; x <= x2; x++) carve(x, by);
      }
    }
  }

  /* 4. 淹水（周護理師） */
  if (chi === 2 || (final && depth === 1)) {
    for (const r of rooms) {
      if (r.kind === 'start' || !R.chance(r.kind === 'boss' ? .7 : .45)) continue;
      const full = R.chance(.4);
      const fx0 = full ? r.x : r.x + R.int(0, r.w - 3), fy0 = full ? r.y : r.y + R.int(0, r.h - 3);
      const fw = full ? r.w : R.int(3, r.w - (fx0 - r.x)), fh = full ? r.h : R.int(3, r.h - (fy0 - r.y));
      for (let y = fy0; y < fy0 + fh; y++) for (let x = fx0; x < fx0 + fw; x++) if (tiles[I(x, y)] === TF) tiles[I(x, y)] = TWA;
      r.wet = true;
    }
  }

  /* 5. 牆 */
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (tiles[I(x, y)] !== TV) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (inb(xx, yy) && walkable(tiles[I(xx, yy)])) { near = true; break; } }
    if (near) tiles[I(x, y)] = TW;
  }

  /* 6. 距離（從入夢點） */
  const spawn = { x: rooms[0].cx, y: rooms[0].cy + T * .5 };
  const dmap = new Int16Array(w * h).fill(-1);
  { const q = [I(Math.floor(spawn.x / T), Math.floor(spawn.y / T))]; dmap[q[0]] = 0;
    for (let qi = 0; qi < q.length; qi++) { const k = q[qi], x = k % w, y = (k / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy, kk = I(xx, yy); if (inb(xx, yy) && dmap[kk] < 0 && walkable(tiles[kk])) { dmap[kk] = dmap[k] + 1; q.push(kk); } } } }
  for (const r of rooms) r.d = dmap[I(Math.floor(r.cx / T), Math.floor(r.cy / T))];

  /* 7. 出口 */
  const byD = rooms.filter(r => r.kind === 'normal').sort((a, b) => a.d - b.d);
  const used = new Set([0, bossCell]);
  const exits = [];
  const wallSpot = r => { // 北牆中段：出口靠牆立著
    const cands = []; for (let x = r.x + 1; x < r.x + r.w - 1; x++) if (tiles[I(x, r.y - 1)] === TW) cands.push(x);
    const x = cands.length ? cands[(cands.length / 2) | 0] : Math.floor(r.x + r.w / 2);
    return { tx: x, ty: r.y };
  };
  if (depth < 2) {
    const sr = byD[byD.length - 1]; used.add(sr.i);
    exits.push({ type: 'stairs', x: sr.cx, y: sr.cy, room: sr.i });
  }
  if (byD.length) {
    const pool = byD.filter(r => !used.has(r.i));
    const br = pool[Math.min(pool.length - 1, Math.floor(pool.length * R.range(.45, .8)))] || pool[0];
    if (br) { used.add(br.i); const s = wallSpot(br); exits.push({ type: 'bell', x: (s.tx + .5) * T, y: (s.ty + .55) * T, room: br.i }); }
    const edgeRooms = byD.filter(r => !used.has(r.i) && (r.cell.c === 0 || r.cell.c === COLS - 1 || r.cell.r === 0));
    const wr = edgeRooms.length ? R.pick(edgeRooms) : byD.find(r => !used.has(r.i));
    if (wr && !(final && depth === 2)) { used.add(wr.i); const s = wallSpot(wr); exits.push({ type: 'window', x: (s.tx + .5) * T, y: (s.ty + .55) * T, room: wr.i }); }
  }
  const reserved = new Set();
  for (const e of exits) { const tx = Math.floor(e.x / T), ty = Math.floor(e.y / T); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) reserved.add(I(tx + dx, ty + dy)); }
  { const tx = Math.floor(spawn.x / T), ty = Math.floor(spawn.y / T); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) reserved.add(I(tx + dx, ty + dy)); }

  /* 8. 夢魘房（有精英、有好東西） */
  const danger = new Set();
  if (depth >= 1) { const cand = byD.filter(r => !used.has(r.i) && r.d > 8); R.shuffle(cand); for (let k = 0; k < Math.min(cand.length, depth >= 2 ? 2 : 1); k++) { danger.add(cand[k].i); cand[k].kind = 'danger'; } }

  /* 9. 櫃子 */
  const ch = CH[chi];
  const nearCorridor = (x, y) => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const k = I(x + dx, y + dy); if (walkable(tiles[k]) && roomOf[k] < 0) return true; } return false; };
  const containers = [];
  const free = (x, y) => inb(x, y) && tiles[I(x, y)] === TF && !reserved.has(I(x, y)) && !nearCorridor(x, y);
  for (const r of rooms) {
    if (r.kind === 'boss') continue;
    let n = r.kind === 'start' ? (depth === 0 ? 1 : 2) : R.int(2, 3) + (r.w * r.h > 50 ? 1 : 0) + (r.kind === 'danger' ? 1 : 0);
    const spots = [];
    for (let x = r.x; x < r.x + r.w; x++) { if (tiles[I(x, r.y - 1)] === TW) spots.push({ x, y: r.y, side: 'n' }); }
    for (let y = r.y + 1; y < r.y + r.h - 1; y++) { if (tiles[I(r.x - 1, y)] === TW) spots.push({ x: r.x, y, side: 'w' }); if (tiles[I(r.x + r.w, y)] === TW) spots.push({ x: r.x + r.w - 1, y, side: 'e' }); }
    R.shuffle(spots);
    let rareDone = false;
    for (const s of spots) {
      if (n <= 0) break;
      const wantRare = r.kind === 'danger' && !rareDone;
      let def = wantRare ? ch.props.find(p => p.rare) : R.weighted(ch.props.filter(p => !p.rare || depth >= 1), p => p.rare ? .25 + depth * .2 : 1);
      if (!def) continue;
      if (def.w === 2 && !(s.side === 'n' && free(s.x + 1, s.y) && tiles[I(s.x + 1, s.y - 1)] === TW)) def = ch.props.find(p => p.w === 1 && !p.rare) || def;
      if (def.w === 2 && !(s.side === 'n' && free(s.x + 1, s.y))) continue;
      if (!free(s.x, s.y)) continue;
      if (containers.some(c => Math.abs(c.tx - s.x) < (c.w + 1) && Math.abs(c.ty - s.y) < 2)) continue;
      for (let k = 0; k < def.w; k++) { tiles[I(s.x + k, s.y)] = TS; }
      const q = depth * .95 + def.q + R.range(0, 1) + (r.kind === 'danger' ? .9 : 0) + (r.kind === 'start' ? -.6 : 0) + (final ? .8 : 0);
      containers.push({ id: containers.length, def, tx: s.x, ty: s.y, w: def.w, side: s.side, room: r.i, q, t: def.t, prog: 0, open: false, special: null,
        x: (s.x + def.w / 2) * T, y: (s.y + .5) * T });
      if (def.rare) rareDone = true;
      n--;
    }
  }
  // 人生記憶（深眠以下，每層最多一段）
  if (plan.life && plan.life.length) {
    const c = containers.filter(c => rooms[c.room].kind !== 'start');
    if (c.length) { const pick = R.weighted(c, x => 1 + x.q); pick.special = plan.life[0]; }
  }

  /* 10. 夢衛 */
  const foes = [];
  const freeTile = (r, tries = 30) => { for (let k = 0; k < tries; k++) { const x = R.int(r.x, r.x + r.w - 1), y = R.int(r.y, r.y + r.h - 1); if (walkable(tiles[I(x, y)]) && !reserved.has(I(x, y))) return { x: (x + .5) * T, y: (y + .5) * T }; } return null; };
  const watchW = chi === 0 ? 2.2 : 1;
  for (const r of rooms) {
    if (r.kind === 'start' || r.kind === 'boss') continue;
    let budget = 1.3 + depth * 1.25 + chi * .3 + (r.w * r.h) / 40 + R.range(0, 1.4) + (r.kind === 'danger' ? 3 : 0) + (final ? 1 : 0);
    if (r.d < 10 && depth === 0) budget *= .6;
    let warden = r.kind === 'danger';
    while (budget > .9) {
      if (warden) { const p = freeTile(r); if (p) foes.push({ type: 'warden', ...p, state: 'sleep', elite: true, room: r.i }); budget -= 5; warden = false; continue; }
      const t = R.weighted(['shade', 'watcher', 'ripper', 'echo', 'cocoon'], k => ({ shade: 3, watcher: 1.4 * watchW, ripper: depth >= 1 || chi >= 1 ? 1.1 : .5, echo: depth >= 1 || chi >= 2 ? 1 : .35, cocoon: .7 }[k]));
      const cost = { shade: 1, watcher: 2, ripper: 1.8, echo: 1.8, cocoon: 1.4 }[t];
      if (t === 'shade') {
        const n = Math.min(R.int(1, 3), Math.floor(budget));
        const c = freeTile(r); if (!c) break;
        for (let k = 0; k < n; k++) foes.push({ type: 'shade', x: c.x + R.range(-30, 30), y: c.y + R.range(-24, 24), state: R.chance(.65) ? 'sleep' : 'wander', room: r.i });
        budget -= n;
      } else if (t === 'watcher') {
        const pad = .9;
        const pts = [[r.x + pad, r.y + pad], [r.x + r.w - pad, r.y + pad], [r.x + r.w - pad, r.y + r.h - pad], [r.x + pad, r.y + r.h - pad]].map(([x, y]) => ({ x: x * T, y: y * T }));
        if (R.chance(.5)) pts.reverse();
        const st = R.int(0, 3);
        foes.push({ type: 'watcher', x: pts[st].x, y: pts[st].y, state: 'patrol', patrol: pts, pi: (st + 1) % 4, room: r.i });
        budget -= cost;
      } else if (t === 'cocoon') {
        const p = freeTile(r); if (p) foes.push({ type: 'cocoon', ...p, state: 'sleep', room: r.i }); budget -= cost;
      } else {
        const p = freeTile(r); if (p) foes.push({ type: t, ...p, state: R.chance(.5) ? 'sleep' : 'wander', room: r.i }); budget -= cost;
      }
    }
  }
  // 走廊上的巡夜者
  if (depth >= 1 || chi === 0) {
    const cor = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = I(x, y); if (tiles[k] === TF && roomOf[k] < 0 && !reserved.has(k) && dmap[k] > 14) cor.push(k); }
    for (let k = 0; k < (chi === 0 ? 3 : 1) + depth && cor.length; k++) {
      const s = R.pick(cor), x = s % w, y = (s / w) | 0;
      foes.push({ type: k % 2 ? 'shade' : 'watcher', x: (x + .5) * T, y: (y + .5) * T, state: 'wander', room: -1 });
    }
  }

  /* 11. 擺設、燈、鏡子、監視器 */
  const decor = [], lights = [], mirrors = [], cams = [];
  for (const r of rooms) {
    const n = r.kind === 'boss' ? 0 : R.int(1, 3);
    for (let k = 0; k < n; k++) { const p = freeTile(r, 12); if (p && !containers.some(c => dist(c.x, c.y, p.x, p.y) < T * 1.2)) decor.push({ k: R.pick(ch.decor), x: p.x + R.range(-10, 10), y: p.y + R.range(-8, 8), f: R.next() }); }
    r.dark = r.kind !== 'start' && r.kind !== 'boss' && R.chance(.22);
    if (!r.dark) lights.push({ x: r.cx, y: r.y * T + Math.min(r.h, 4) * T * .45, r: Math.max(r.w, r.h) * T * .62, c: r.kind === 'danger' ? '#ff6a7a' : (R.chance(.2) ? ch.th.lamp2 : ch.th.lamp), room: r.i, flick: chi === 0 ? R.range(0, 1) : R.chance(.15) ? R.range(0, 1) : 0, ph: R.range(0, 9) });
    if (chi === 3 && r.kind !== 'start' && r.kind !== 'boss' && R.chance(.6)) {
      const xs = []; for (let x = r.x + 1; x < r.x + r.w - 1; x++) if (tiles[I(x, r.y - 1)] === TW && tiles[I(x, r.y)] === TF && !containers.some(c => c.ty === r.y && x >= c.tx - 1 && x <= c.tx + c.w)) xs.push(x);
      if (xs.length) { const x = R.pick(xs); mirrors.push({ id: mirrors.length, tx: x, ty: r.y - 1, x: (x + .5) * T, y: r.y * T, hp: 26, broken: false, cd: R.range(4, 10), room: r.i, loot: R.chance(.55) }); }
    }
    if (chi === 0 && r.kind !== 'start' && r.kind !== 'boss' && R.chance(.4 + depth * .15)) {
      const x = r.x + (R.chance(.5) ? 0 : r.w - 1);
      cams.push({ id: cams.length, x: (x + .5) * T, y: r.y * T + 6, base: x === r.x ? .5 : Math.PI - .5, sweep: R.range(.6, 1.0), ph: R.range(0, TAU), hp: 22, dead: false, room: r.i, aware: 0 });
    }
  }

  /* 12. 渡夢人 */
  let ferry = null;
  if (!final && R.chance(depth === 0 ? .3 : .45)) { const r = byD[Math.floor(byD.length * R.range(.3, .9))]; if (r) { const p = freeTile(r); if (p) ferry = { x: p.x, y: p.y, room: r.i }; } }

  return { seed, chi, depth, w, h, tiles, roomOf, rooms, spawn, exits, containers, foes, decor, lights, mirrors, cams, ferry, bossRoom: bossCell >= 0 ? rooms[bossCell] : null, dmap };
}
