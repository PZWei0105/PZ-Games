'use strict';
/* ====== 世界：地圖生成、格子、尋路、迷霧 ====== */
let G = null;            // 遊戲狀態
const N = K.N;
const idx = (x, y) => y * N + x;
const inMap = (x, y) => x >= 0 && y >= 0 && x < N && y < N;

function genWorld(seed) {
  const r = RNG(seed ^ 0x9e3779b9);
  const nz = makeNoise(seed), nz2 = makeNoise(seed + 17), nz3 = makeNoise(seed + 91);
  const ter = new Uint8Array(N * N);
  const W = { ter, nodes: [], nmap: new Int32Array(N * N), bmap: new Int32Array(N * N), fog: new Uint8Array(N * N), deco: new Uint8Array(N * N) };
  // 基底地形
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = fbm(nz, x / 9, y / 9, 3), w = fbm(nz2, x / 6, y / 6, 2);
    let t = T.SOIL;
    if (v > 0.62) t = T.STONE;
    else if (w > 0.66) t = T.MOSS;
    // 東北：晶化地
    const dx = x - 41, dy = y - 7;
    if (Math.hypot(dx, dy) < 7.5 + fbm(nz3, x / 4, y / 4) * 4) t = T.GLASS;
    ter[idx(x, y)] = t;
    W.deco[idx(x, y)] = Math.floor(r() * 256);
  }
  // 光溪：從北邊蜿蜒到南邊（偏東）
  const streamX = y => 33 + Math.sin(y / 6.5) * 3.5 + Math.sin(y / 2.7) * 1.1;
  for (let y = 0; y < N; y++) {
    const cx = streamX(y);
    for (let x = Math.floor(cx - 1.2); x <= Math.ceil(cx + 1.2); x++) {
      if (!inMap(x, y)) continue;
      const d = Math.abs(x + 0.5 - cx);
      if (d < 1.15) ter[idx(x, y)] = T.WATER;
      else if (d < 2.6 && ter[idx(x, y)] !== T.GLASS) ter[idx(x, y)] = T.MOSS;
    }
  }
  // 後段艙位置
  const HX = 20, HY = 22;
  // 墜毀溝：從西北邊界到艙體
  const sx = 2, sy = 5, ex = HX + 1, ey = HY + 1;
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = lerp(sx, ex, t) + Math.sin(t * 7) * 1.2, cy = lerp(sy, ey, t);
    const wid = 1.3 + t * 1.4;
    for (let y = Math.floor(cy - 3); y <= cy + 3; y++) for (let x = Math.floor(cx - 3); x <= cx + 3; x++) {
      if (!inMap(x, y)) continue;
      const d = Math.hypot(x + .5 - cx, y + .5 - cy);
      if (d < wid) ter[idx(x, y)] = T.BURNT;
      else if (d < wid + 1.4 && ter[idx(x, y)] !== T.WATER && r() < 0.6) ter[idx(x, y)] = T.ASH;
    }
  }
  // 艙體周圍清空成灰燼地
  for (let y = HY - 3; y < HY + 6; y++) for (let x = HX - 3; x < HX + 8; x++)
    if (inMap(x, y) && ter[idx(x, y)] !== T.WATER) ter[idx(x, y)] = (Math.hypot(x - HX - 2.5, y - HY - 1.5) < 4.2 ? T.ASH : ter[idx(x, y)] === T.STONE ? T.SOIL : ter[idx(x, y)]);

  G.world = W;
  // 放置後段艙
  placeBuilding('hull', HX, HY, true);

  const free = (x, y, rad = 0) => {
    for (let yy = y - rad; yy <= y + rad; yy++) for (let xx = x - rad; xx <= x + rad; xx++) {
      if (!inMap(xx, yy)) return false;
      if (W.nmap[idx(xx, yy)] || W.bmap[idx(xx, yy)] || ter[idx(xx, yy)] === T.WATER) return false;
    }
    return true;
  };
  const nearHull = (x, y, d) => Math.hypot(x - HX - 2.5, y - HY - 1.5) < d;
  // 殘骸：沿著墜毀溝
  for (let i = 0; i < 70; i++) {
    const t = r();
    const cx = lerp(sx, ex, t) + Math.sin(t * 7) * 1.2 + (r() - .5) * 5, cy = lerp(sy, ey, t) + (r() - .5) * 5;
    const x = Math.round(cx), y = Math.round(cy);
    if (inMap(x, y) && free(x, y) && !nearHull(x, y, 3.6)) addNode(r() < 0.18 ? 'crate' : 'debris', x, y, r);
  }
  // 艙體附近一些殘骸
  for (let i = 0; i < 14; i++) {
    const a = r() * TAU, d = 4 + r() * 5;
    const x = Math.round(HX + 2.5 + Math.cos(a) * d), y = Math.round(HY + 1.5 + Math.sin(a) * d);
    if (inMap(x, y) && free(x, y) && !nearHull(x, y, 3.8)) addNode(r() < 0.25 ? 'crate' : 'debris', x, y, r);
  }
  // 傘菌樹林
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    if (!free(x, y) || nearHull(x, y, 6)) continue;
    const f = fbm(nz3, x / 7 + 10, y / 7 + 3, 3);
    const t = ter[idx(x, y)];
    if (t === T.BURNT || t === T.ASH) continue;
    if (f > 0.6 && r() < 0.55) addNode('tree', x, y, r);
    else if (f > 0.5 && r() < 0.12) addNode('tree', x, y, r);
  }
  // 礦脈岩
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    if (!free(x, y) || nearHull(x, y, 6)) continue;
    if (ter[idx(x, y)] === T.STONE && r() < 0.32) addNode('rock', x, y, r);
  }
  // 晶簇
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!free(x, y)) continue;
    if (ter[idx(x, y)] === T.GLASS && r() < 0.2) addNode('crystal', x, y, r);
  }
  // 營地附近保證幾簇晶簇（樣本任務）
  let near = 0;
  for (let tries = 0; tries < 400 && near < 3; tries++) {
    const x = r.int(HX + 8, HX + 14), y = r.int(HY - 9, HY - 3);
    if (inMap(x, y) && free(x, y, 1)) { ter[idx(x, y)] = T.GLASS; addNode('crystal', x, y, r); near++; }
  }
  // 燈果叢：溪邊與苔地
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    if (!free(x, y) || nearHull(x, y, 4)) continue;
    const t = ter[idx(x, y)];
    if (t === T.MOSS && r() < 0.13) addNode('bush', x, y, r);
    else if (t === T.SOIL && r() < 0.018) addNode('bush', x, y, r);
  }
  // 營地附近保證食物
  let bushes = 0;
  for (let tries = 0; tries < 600 && bushes < 7; tries++) {
    const x = r.int(HX - 8, HX + 12), y = r.int(HY - 6, HY + 10);
    if (inMap(x, y) && free(x, y) && !nearHull(x, y, 4.5) && nearHull(x, y, 11)) { addNode('bush', x, y, r); bushes++; }
  }
  // 石碑
  for (let tries = 0; tries < 200; tries++) {
    const x = r.int(36, 44), y = r.int(12, 18);
    if (free(x, y, 1)) { addNode('ruin', x, y, r); break; }
  }
  // 刺背獸巢
  const nestSpots = [[r.int(3, 8), r.int(38, 44)], [r.int(42, 45), r.int(30, 40)]];
  for (const [x, y] of nestSpots) if (free(x, y)) addNode('nest', x, y, r);

  // 迷霧：艙體周圍
  revealAround(HX + 2.5, HY + 1.5, 10.5);
}

function addNode(type, x, y, r = R) {
  const d = NODE[type];
  const n = { id: uid(), type, x, y, amt: d.amt || 1, max: d.amt || 1, var: Math.floor(r() * 1000), grow: 1, marked: false, by: 0 };
  G.world.nodes.push(n);
  G.world.nmap[idx(x, y)] = n.id;
  return n;
}
function nodeAt(x, y) { if (!inMap(x, y)) return null; const id = G.world.nmap[idx(x, y)]; return id ? nodeById(id) : null; }
function nodeById(id) { return G._nodeIdx ? G._nodeIdx.get(id) : G.world.nodes.find(n => n.id === id); }
function indexNodes() { G._nodeIdx = new Map(G.world.nodes.map(n => [n.id, n])); }
function removeNode(n) {
  G.world.nmap[idx(n.x, n.y)] = 0;
  const i = G.world.nodes.indexOf(n); if (i >= 0) G.world.nodes.splice(i, 1);
  if (G._nodeIdx) G._nodeIdx.delete(n.id);
  G.dirtyPath = true;
}

/* 建築放置 */
function canPlace(type, x, y) {
  const d = BUILD[type];
  for (let yy = y; yy < y + d.h; yy++) for (let xx = x; xx < x + d.w; xx++) {
    if (!inMap(xx, yy)) return '超出範圍';
    if (G.world.fog[idx(xx, yy)] === 0) return '尚未探索';
    if (G.world.ter[idx(xx, yy)] === T.WATER) return '不能蓋在水上';
    if (G.world.bmap[idx(xx, yy)]) return '和其他建築重疊';
    const n = nodeAt(xx, yy); if (n) return '有' + NODE[n.type].name + '擋著';
  }
  // 牆類以外，至少要有一格可以走到
  if (!d.wall && type !== 'hull' && !accessTiles({ x, y, w: d.w, h: d.h }, true).length) return '四周沒有通道';
  return '';
}
function placeBuilding(type, x, y, done = false) {
  const d = BUILD[type];
  const b = { id: uid(), type, x, y, w: d.w, h: d.h, hp: d.hp, hpMax: d.hp, done, prog: done ? 1 : 0, work: 0,
    active: true, slots: d.slots || 0, grow: 0, store: { food: 0 }, t0: G.t || 0 };
  if (G.tech && G.tech.done.struct) { b.hpMax = Math.round(b.hpMax * 1.3); b.hp = b.hpMax; }
  if (!done) b.hp = Math.max(20, Math.round(b.hpMax * 0.15));
  G.buildings.push(b);
  for (let yy = y; yy < y + d.h; yy++) for (let xx = x; xx < x + d.w; xx++) G.world.bmap[idx(xx, yy)] = b.id;
  G.dirtyPath = true;
  return b;
}
function removeBuilding(b) {
  for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) G.world.bmap[idx(xx, yy)] = 0;
  const i = G.buildings.indexOf(b); if (i >= 0) G.buildings.splice(i, 1);
  G.dirtyPath = true;
}
function bAt(x, y) { if (!inMap(x, y)) return null; const id = G.world.bmap[idx(x, y)]; return id ? G.buildings.find(b => b.id === id) : null; }
function bById(id) { return G.buildings.find(b => b.id === id); }

/* 通行 */
function walkCost(x, y, beast) {
  if (!inMap(x, y)) return 0;
  const i = idx(x, y);
  const bid = G.world.bmap[i];
  if (bid) {
    if (!beast) return 0;
    const b = bById(bid);
    return b && BUILD[b.type].wall ? 14 : 22;     // 生物會選擇咬穿
  }
  const nid = G.world.nmap[i];
  if (nid) { const n = nodeById(nid); if (n && NODE[n.type].block) return 0; }
  return TERRAIN[G.world.ter[i]].walk;
}
function passable(x, y) { return walkCost(x, y, false) > 0; }

// 建築或節點周圍可站立的格子
function accessTiles(rect, ignoreUnits) {
  const out = [];
  for (let y = rect.y - 1; y <= rect.y + rect.h; y++) for (let x = rect.x - 1; x <= rect.x + rect.w; x++) {
    const inside = x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
    if (inside || !inMap(x, y)) continue;
    const diag = (x < rect.x || x >= rect.x + rect.w) && (y < rect.y || y >= rect.y + rect.h);
    if (diag) continue;
    if (passable(x, y)) out.push([x, y]);
  }
  return out;
}

/* A* 尋路（8 方向，二元堆） */
const PF = { g: new Float32Array(N * N), seen: new Uint32Array(N * N), closed: new Uint32Array(N * N), from: new Int32Array(N * N), gen: 1 };
function heapPush(hp, node, f) { hp.push([f, node]); let i = hp.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hp[p][0] <= hp[i][0]) break; [hp[p], hp[i]] = [hp[i], hp[p]]; i = p; } }
function heapPop(hp) { const top = hp[0]; const last = hp.pop(); if (hp.length) { hp[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < hp.length && hp[l][0] < hp[m][0]) m = l; if (r < hp.length && hp[r][0] < hp[m][0]) m = r; if (m === i) break; [hp[m], hp[i]] = [hp[i], hp[m]]; i = m; } } return top; }
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
function findPath(sx, sy, goals, beast = false, maxIter = 6000) {
  sx = clamp(Math.floor(sx), 0, N - 1); sy = clamp(Math.floor(sy), 0, N - 1);
  if (!goals.length) return null;
  const gset = new Set(goals.map(([x, y]) => idx(x, y)));
  if (gset.has(idx(sx, sy))) return [[sx, sy]];
  const gen = ++PF.gen;
  const hfn = (x, y) => { let m = 1e9; for (const [gx, gy] of goals) { const dx = Math.abs(gx - x), dy = Math.abs(gy - y); const d = Math.max(dx, dy) + 0.414 * Math.min(dx, dy); if (d < m) m = d; } return m; };
  const hp = [];
  const s = idx(sx, sy);
  PF.g[s] = 0; PF.seen[s] = gen; PF.from[s] = -1;
  heapPush(hp, s, hfn(sx, sy));
  let iter = 0;
  while (hp.length && iter++ < maxIter) {
    const [, cur] = heapPop(hp);
    if (PF.closed[cur] === gen) continue;
    PF.closed[cur] = gen;
    if (gset.has(cur)) {
      const path = []; let c = cur;
      while (c !== -1) { path.push([c % N, Math.floor(c / N)]); c = PF.from[c]; }
      return path.reverse();
    }
    const cx = cur % N, cy = Math.floor(cur / N);
    for (const [dx, dy, dc] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!inMap(nx, ny)) continue;
      let w = walkCost(nx, ny, beast);
      const ni = idx(nx, ny);
      if (w <= 0 && !gset.has(ni)) continue;
      if (w <= 0) w = 1;
      if (dx && dy && (walkCost(cx + dx, cy, beast) <= 0 || walkCost(cx, cy + dy, beast) <= 0)) continue;
      const ng = PF.g[cur] + dc * w;
      if (PF.seen[ni] !== gen || ng < PF.g[ni]) {
        PF.seen[ni] = gen; PF.g[ni] = ng; PF.from[ni] = cur;
        heapPush(hp, ni, ng + hfn(nx, ny));
      }
    }
  }
  return null;
}

/* 迷霧 */
function revealAround(cx, cy, r) {
  const f = G.world.fog;
  let changed = false;
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    if (!inMap(x, y)) continue;
    if (Math.hypot(x + .5 - cx, y + .5 - cy) <= r && !f[idx(x, y)]) { f[idx(x, y)] = 1; changed = true; }
  }
  if (changed) G.fogDirty = true;
}
function revealAll() { G.world.fog.fill(1); G.fogDirty = true; }
function explored(x, y) { return inMap(x, y) && G.world.fog[idx(x, y)] > 0; }
