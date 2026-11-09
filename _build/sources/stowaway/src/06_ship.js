// ============ 船體：格子、牆、門、通風管、尋路、視線 ============
const SHIP = {};
function buildShip() {
  const grid = new Int16Array(MAPW * MAPH).fill(-1);
  for (const r of ROOMS) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) grid[y * MAPW + x] = r.i;
  const blocked = new Uint8Array(MAPW * MAPH);
  for (const [x, y] of BLOCKED) blocked[y * MAPW + x] = 1;
  SHIP.grid = grid; SHIP.blocked = blocked;
  for (const r of ROOMS) { r.cx = (r.x + r.w / 2) * T; r.cy = (r.y + r.h / 2) * T; r.x0 = r.x * T; r.y0 = r.y * T; r.x1 = (r.x + r.w) * T; r.y1 = (r.y + r.h) * T; }
  // 門
  SHIP.doors = []; SHIP.doorAt = new Map();
  for (const d of DOORS) {
    const [ax, ay] = d.a, [bx, by] = d.b;
    const orient = ax !== bx ? 'v' : 'h';
    const door = { id: d.id, kind: d.kind, orient, edges: [], tiles: [], state: 'open', welded: 0, broken: false, open: 1, force: 0, weldT: 0, remoteCd: 0, jam: false };
    for (let k = 0; k < d.span; k++) {
      const tax = orient === 'v' ? ax : ax + k, tay = orient === 'v' ? ay + k : ay;
      const tbx = orient === 'v' ? bx : bx + k, tby = orient === 'v' ? by + k : by;
      const key = edgeKey(tax, tay, tbx, tby);
      door.edges.push(key); door.tiles.push([tax, tay, tbx, tby]);
      SHIP.doorAt.set(key, door);
    }
    if (orient === 'v') { door.x = Math.max(ax, bx) * T; door.y = (ay + d.span / 2) * T; door.len = d.span * T; }
    else { door.x = (ax + d.span / 2) * T; door.y = Math.max(ay, by) * T; door.len = d.span * T; }
    door.ra = roomIdx(ax, ay); door.rb = roomIdx(bx, by);
    SHIP.doors.push(door);
  }
  SHIP.door = {}; SHIP.doors.forEach(d => SHIP.door[d.id] = d);
  // 通風管
  SHIP.vn = []; SHIP.vnode = {};
  for (const [id, x, y] of VENTS) { const n = { id, x: x * T, y: y * T, room: roomIdx(Math.floor(x), Math.floor(y)), sealed: false, links: [], drip: 0, shake: 0 }; n.i = SHIP.vn.length; SHIP.vn.push(n); SHIP.vnode[id] = n; }
  SHIP.vl = []; SHIP.dampers = {};
  for (const [a, b, d] of VLINKS) {
    const A = SHIP.vnode[a], B = SHIP.vnode[b];
    let corner = [B.x, A.y];
    if (roomIdx(Math.floor(corner[0] / T), Math.floor(corner[1] / T)) < 0) corner = [A.x, B.y];
    const pts = [A.x, A.y, corner[0], corner[1], B.x, B.y];
    const len = Math.abs(corner[0] - A.x) + Math.abs(corner[1] - A.y) + Math.abs(B.x - corner[0]) + Math.abs(B.y - corner[1]);
    const L = { a: A.i, b: B.i, pts, len, damper: d || null };
    L.i = SHIP.vl.length; SHIP.vl.push(L); A.links.push(L); B.links.push(L);
    if (d) SHIP.dampers[d] = { id: d, closed: false, link: L, x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, bash: 0 };
  }
  // 閘門的位置放在管段中點（沿著折線）
  for (const id in SHIP.dampers) { const dm = SHIP.dampers[id]; const p = polyPointAt(dm.link.pts, .5); dm.x = p[0]; dm.y = p[1]; }
  // 物件
  SHIP.props = PROPS.map((p, i) => ({ ...p, i, room: ROOM[p.r].i, sx: p.s[0] * T, sy: p.s[1] * T, px: p.p[0] * T, py: p.p[1] * T, searched: false, loot: null, occ: null, uses: 0 }));
  SHIP.hides = SHIP.props.filter(p => p.k === 'hide');
  SHIP.boxes = SHIP.props.filter(p => p.k === 'box');
  SHIP.cons = SHIP.props.filter(p => p.k === 'con');
  SHIP.con = {}; SHIP.cons.forEach(c => { if (!SHIP.con[c.fn]) SHIP.con[c.fn] = c; });
  SHIP.powerCons = SHIP.cons.filter(c => c.fn === 'power');
  recomputeRoomCosts();
}
function edgeKey(ax, ay, bx, by) { return ax !== bx ? 'v' + Math.max(ax, bx) + ',' + ay : 'h' + ax + ',' + Math.max(ay, by); }
function roomIdx(x, y) { if (x < 0 || y < 0 || x >= MAPW || y >= MAPH) return -1; return SHIP.grid[y * MAPW + x]; }
function roomAt(wx, wy) { const i = roomIdx(Math.floor(wx / T), Math.floor(wy / T)); return i < 0 ? null : ROOMS[i]; }
function tileFree(x, y) { return roomIdx(x, y) >= 0 && !SHIP.blocked[y * MAPW + x]; }
function polyPointAt(pts, t) {
  let total = 0; const seg = [];
  for (let i = 0; i < pts.length - 2; i += 2) { const l = Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]); seg.push(l); total += l; }
  let d = t * total;
  for (let k = 0; k < seg.length; k++) { if (d <= seg[k] || k === seg.length - 1) { const u = seg[k] ? d / seg[k] : 0; return [lerp(pts[k * 2], pts[k * 2 + 2], u), lerp(pts[k * 2 + 1], pts[k * 2 + 3], u)]; } d -= seg[k]; }
  return [pts[0], pts[1]];
}
// 邊的狀態
function doorBetween(ax, ay, bx, by) { return SHIP.doorAt.get(edgeKey(ax, ay, bx, by)) || null; }
function doorOpen(d) { return d.broken || (d.state === 'open' && d.open > .6); }
function sightBlocked(ax, ay, bx, by) {
  const rb = roomIdx(bx, by); if (rb < 0) return true;
  const ra = roomIdx(ax, ay); if (ra === rb) return false;
  const d = doorBetween(ax, ay, bx, by); if (!d) return true;
  return !(d.broken || d.open > .35);
}
// who: 'crew' | 'beast'；回傳移動成本（Infinity＝不能走）
function stepCost(ax, ay, bx, by, who) {
  if (!tileFree(bx, by)) return Infinity;
  const ra = roomIdx(ax, ay), rb = roomIdx(bx, by);
  if (ra === rb) return 1;
  const d = doorBetween(ax, ay, bx, by); if (!d) return Infinity;
  if (d.kind === 'airout') return Infinity;
  if (d.broken || d.state === 'open') return 1;
  if (who === 'crew') return d.welded ? Infinity : (d.jam ? Infinity : 2.5);
  return d.welded ? 26 : (d.kind === 'bulk' || d.kind === 'airin' ? 12 : 7);
}
// A*：回傳格子陣列 [[x,y],...]
function findPath(sx, sy, gx, gy, who) {
  if (!tileFree(gx, gy)) { const n = nearestFree(gx, gy); if (!n) return null; gx = n[0]; gy = n[1]; }
  if (!tileFree(sx, sy)) { const n = nearestFree(sx, sy); if (!n) return null; sx = n[0]; sy = n[1]; }
  const N = MAPW * MAPH, start = sy * MAPW + sx, goal = gy * MAPW + gx;
  if (start === goal) return [[sx, sy]];
  const g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const open = [start]; g[start] = 0;
  const h = i => { const x = i % MAPW, y = (i / MAPW) | 0; return Math.abs(x - gx) + Math.abs(y - gy); };
  const f = new Float32Array(N).fill(Infinity); f[start] = h(start);
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
    const cur = open[bi]; open.splice(bi, 1);
    if (cur === goal) break;
    if (closed[cur]) continue; closed[cur] = 1;
    const cx = cur % MAPW, cy = (cur / MAPW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= MAPW || ny >= MAPH) continue;
      let c;
      if (dx && dy) {
        if (roomIdx(nx, ny) !== roomIdx(cx, cy) || roomIdx(cx + dx, cy) !== roomIdx(cx, cy) || roomIdx(cx, cy + dy) !== roomIdx(cx, cy)) continue;
        if (!tileFree(nx, ny) || !tileFree(cx + dx, cy) || !tileFree(cx, cy + dy)) continue;
        c = 1.414;
      } else c = stepCost(cx, cy, nx, ny, who);
      if (c === Infinity) continue;
      const ni = ny * MAPW + nx, ng = g[cur] + c;
      if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; f[ni] = ng + h(ni); if (!closed[ni]) open.push(ni); }
    }
  }
  if (came[goal] < 0) return null;
  const path = []; let c = goal;
  while (c !== start) { path.push([c % MAPW, (c / MAPW) | 0]); c = came[c]; if (c < 0) return null; }
  path.push([sx, sy]); path.reverse();
  return path;
}
function nearestFree(x, y) {
  for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    if (tileFree(x + dx, y + dy)) return [x + dx, y + dy];
  }
  return null;
}
// 把格子路徑轉成世界座標的路點（去掉共線的點）
function pathToPts(path, fx, fy) {
  const pts = [];
  for (let k = 1; k < path.length; k++) pts.push([(path[k][0] + .5) * T, (path[k][1] + .5) * T, path[k - 1][0], path[k - 1][1], path[k][0], path[k][1]]);
  if (pts.length && fx != null) { const L = pts[pts.length - 1]; L[0] = fx; L[1] = fy; }
  return pts;
}
// 視線：格線 DDA
function castRay(x0, y0, dx, dy, maxD) {
  let tx = Math.floor(x0 / T), ty = Math.floor(y0 / T);
  if (roomIdx(tx, ty) < 0) return 0;
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
  const tdx = dx !== 0 ? Math.abs(T / dx) : Infinity, tdy = dy !== 0 ? Math.abs(T / dy) : Infinity;
  let tmx = dx > 0 ? ((tx + 1) * T - x0) / dx : dx < 0 ? (tx * T - x0) / dx : Infinity;
  let tmy = dy > 0 ? ((ty + 1) * T - y0) / dy : dy < 0 ? (ty * T - y0) / dy : Infinity;
  for (let n = 0; n < 64; n++) {
    if (tmx < tmy) { if (tmx > maxD) return maxD; const nx = tx + sx; if (sightBlocked(tx, ty, nx, ty)) return tmx; tx = nx; tmx += tdx; }
    else { if (tmy > maxD) return maxD; const ny = ty + sy; if (sightBlocked(tx, ty, tx, ny)) return tmy; ty = ny; tmy += tdy; }
  }
  return maxD;
}
function visPoly(x, y, R, n, a0 = 0, a1 = TAU) {
  const pts = []; const full = a1 - a0 >= TAU - 1e-3;
  if (!full) pts.push(x, y);
  const cnt = full ? n : Math.max(6, Math.ceil(n * (a1 - a0) / TAU));
  for (let k = 0; k <= cnt; k++) {
    if (full && k === cnt) break;
    const a = a0 + (a1 - a0) * k / cnt, dx = Math.cos(a), dy = Math.sin(a);
    const d = Math.min(R, castRay(x, y, dx, dy, R) + 6);
    pts.push(x + dx * d, y + dy * d);
  }
  return pts;
}
function hasLOS(ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay); if (d < 1) return true;
  return castRay(ax, ay, (bx - ax) / d, (by - ay) / d, d) >= d - 2;
}
// 房間之間要隔幾道關著的門（聲音衰減、聲納用）
function recomputeRoomCosts() {
  const n = ROOMS.length, M = [];
  for (let i = 0; i < n; i++) { M.push(new Float32Array(n).fill(99)); M[i][i] = 0; }
  for (const d of SHIP.doors) {
    if (d.ra < 0 || d.rb < 0) continue;
    const c = (d.broken || d.state === 'open') ? 0 : d.welded ? 2 : 1;
    if (c < M[d.ra][d.rb]) { M[d.ra][d.rb] = c; M[d.rb][d.ra] = c; }
  }
  // 相鄰但沒門的房間（隔一道牆）
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && M[i][j] > 2 && roomsTouch(ROOMS[i], ROOMS[j])) M[i][j] = 2;
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (M[i][k] + M[k][j] < M[i][j]) M[i][j] = M[i][k] + M[k][j];
  SHIP.rc = M; SHIP.rcVer = (SHIP.rcVer || 0) + 1;
}
function roomsTouch(a, b) {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return (ox === 0 && oy > 0) || (oy === 0 && ox > 0);
}
function roomCost(ra, rb) { if (ra == null || rb == null || ra < 0 || rb < 0) return 9; return SHIP.rc[ra][rb]; }
// 通風管尋路（Dijkstra）：回傳 link 陣列；dmOK 允許穿過關著的閘門（成本高）
function ventPath(from, to, opt = {}) {
  const n = SHIP.vn.length, d = new Float32Array(n).fill(Infinity), via = new Array(n).fill(null), done = new Uint8Array(n);
  d[from] = 0;
  for (let it = 0; it < n; it++) {
    let u = -1; for (let k = 0; k < n; k++) if (!done[k] && (u < 0 || d[k] < d[u])) u = k;
    if (u < 0 || d[u] === Infinity) break; done[u] = 1; if (u === to) break;
    for (const L of SHIP.vn[u].links) {
      const v = L.a === u ? L.b : L.a;
      let c = L.len;
      if (L.damper && SHIP.dampers[L.damper].closed) { if (!opt.bash) continue; c += 900; }
      if (opt.avoid && opt.avoid.has(v)) c += 2000;
      if (d[u] + c < d[v]) { d[v] = d[u] + c; via[v] = L; }
    }
  }
  if (d[to] === Infinity) return null;
  const out = []; let c = to;
  while (c !== from) { const L = via[c]; out.push(L); c = L.a === c ? L.b : L.a; }
  return out.reverse();
}
function ventReach(from) {
  const seen = new Set([from]), q = [from];
  while (q.length) { const u = q.shift(); for (const L of SHIP.vn[u].links) { if (L.damper && SHIP.dampers[L.damper].closed) continue; const v = L.a === u ? L.b : L.a; if (!seen.has(v)) { seen.add(v); q.push(v); } } }
  return seen;
}
function nearestVent(x, y, filter) {
  let best = null, bd = Infinity;
  for (const n of SHIP.vn) { if (filter && !filter(n)) continue; const dd = dist(x, y, n.x, n.y); if (dd < bd) { bd = dd; best = n; } }
  return best;
}
