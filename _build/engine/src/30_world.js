/* ==========================================================================
   30 世界與地圖：格子地圖、碰撞、射線、視野、尋路、流場、程序生成
     const map = PZ.tilemap({ w: 64, h: 48, size: 32 })        格子地圖（size＝一格幾個世界單位）
       map.set(x, y, 1)  map.get(x, y)  map.layer('deco')     多層（每層一個整數陣列）
       map.fromText(`#####\n#..@#\n#####`, { '#': 1, '.': 0, '@': 0 })   用文字畫地圖；回傳每個符號出現的位置
       map.isSolid(cx, cy)  map.solidAt(wx, wy)  map.cellX(wx)  map.cx(cx)（格子中心的世界座標）
       map.move(body, dx, dy)  方塊角色撞牆滑動（body = { x, y, w, h } 中心點；可設單向平台）
       map.raycast(x0, y0, x1, y1)  map.los(…)  map.fov(cx, cy, 半徑)（視野：哪些格子看得到）
       map.rects()  合併成大方塊；map.lightBoxes({ lift }) 一行讓牆擋光（配 PZ.light；2.5D 牆 lift＝牆高）
       map.nearestOpen(cx, cy)  最近的空地    map.behindWall(x, y, 離地高, 牆高)  2.5D：這一點有沒有被前面的牆擋住
       map.draw(g, style, { actors, drawActor })   畫地圖：2.5D 牆面依前後跟角色交錯（見 31_tiles.js 的風格）
     PZ.path.find(map, sx, sy, tx, ty)   A* 最短路（格子）    PZ.path.smooth(map, cells) 拉直成世界座標的折線
     PZ.path.flow(map, { max })          流場：幾百隻怪同時繞牆追主角，每格只算一次
     PZ.gen.dungeon / caves / island / scatter / noise / distance   程序生成：地牢、洞窟、島嶼、均勻散布（樹、草、寶箱）、離牆多遠
   ========================================================================== */
class Tilemap {
  constructor(o = {}) {
    this.w = o.w || 32; this.h = o.h || 32; this.size = o.size || 32; this.ox = o.x || 0; this.oy = o.y || 0;
    this.layers = { main: new Int32Array(this.w * this.h) }; if (o.fill) this.layers.main.fill(o.fill);
    this.outside = o.outside != null ? o.outside : 1;       // 地圖外面當成什麼（預設牆）
    this.oneway = o.oneway || null;                        // (v) => true：單向平台（只擋往下掉，從下面跳得上來）
    this.solidFn = o.solid || (this.oneway ? (v) => v > 0 && !this.oneway(v) : (v) => v > 0);
    this.ver = 0; this.field = null;
  }
  idx(cx, cy) { return cx < 0 || cy < 0 || cx >= this.w || cy >= this.h ? -1 : cy * this.w + cx; }
  layer(name, init = 0) { let L = this.layers[name]; if (!L) { L = this.layers[name] = new Int32Array(this.w * this.h); if (init) L.fill(init); } return L; }
  get(cx, cy, layer = 'main') { const i = this.idx(cx, cy); if (i < 0) return layer === 'main' ? this.outside : 0; return this.layers[layer] ? this.layers[layer][i] : 0; }
  set(cx, cy, v, layer = 'main') { const i = this.idx(cx, cy); if (i < 0) return this; this.layer(layer)[i] = v; this.ver++; return this; }
  fill(v, layer = 'main') { this.layer(layer).fill(v); this.ver++; return this; }
  rect(cx, cy, w, h, v, layer = 'main') { for (let y = cy; y < cy + h; y++) for (let x = cx; x < cx + w; x++) this.set(x, y, v, layer); return this; }
  forEach(fn, layer = 'main') { const L = this.layer(layer); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) fn(x, y, L[y * this.w + x]); return this; }
  isSolid(cx, cy) { return this.solidFn(this.get(cx, cy)); }
  cellX(wx) { return Math.floor((wx - this.ox) / this.size); }
  cellY(wy) { return Math.floor((wy - this.oy) / this.size); }
  /** 格子中心的世界座標 */
  cx(cx) { return this.ox + (cx + 0.5) * this.size; }
  cy(cy) { return this.oy + (cy + 0.5) * this.size; }
  get width() { return this.w * this.size; }
  get height() { return this.h * this.size; }
  solidAt(wx, wy) { return this.isSolid(this.cellX(wx), this.cellY(wy)); }
  /** 文字地圖：每行一列、每個字一格；legend: { '#': 1, '.': 0, '~': { v: 2, layer: 'water' } }；回傳 { 字: [[cx, cy]…] } */
  fromText(text, legend = { '#': 1 }) {
    const rows = text.replace(/^\n+|\n+\s*$/g, '').split('\n'), found = {};
    const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
    if (w !== this.w || h !== this.h) { this.w = w; this.h = h; for (const k in this.layers) this.layers[k] = new Int32Array(w * h); }
    rows.forEach((row, y) => { for (let x = 0; x < w; x++) {
      const ch = row[x] || ' ', L = legend[ch];
      if (L != null) { if (typeof L === 'object') this.set(x, y, L.v || 0, L.layer || 'main'); else this.set(x, y, L); }
      (found[ch] || (found[ch] = [])).push([x, y]);
    } });
    this.ver++; return found;
  }
  /** 從 0/1 陣列（例如 PZ.gen 產生的 grid）載入 */
  fromGrid(grid, w = this.w, h = this.h, layer = 'main') { if (w !== this.w || h !== this.h) { this.w = w; this.h = h; for (const k in this.layers) this.layers[k] = new Int32Array(w * h); } this.layer(layer).set(grid); this.ver++; return this; }
  /** 四方向相同（自動接邊）：上 1、右 2、下 4、左 8 */
  mask4(cx, cy, test = (x, y) => this.isSolid(x, y)) { return (test(cx, cy - 1) ? 1 : 0) | (test(cx + 1, cy) ? 2 : 0) | (test(cx, cy + 1) ? 4 : 0) | (test(cx - 1, cy) ? 8 : 0); }
  /** 八方向（47 種接邊）：角落只有兩邊都相連才算 → 回傳 0～255 的遮罩 */
  mask8(cx, cy, test = (x, y) => this.isSolid(x, y)) {
    const n = test(cx, cy - 1), e = test(cx + 1, cy), s = test(cx, cy + 1), w = test(cx - 1, cy);
    let m = (n ? 1 : 0) | (e ? 4 : 0) | (s ? 16 : 0) | (w ? 64 : 0);
    if (n && e && test(cx + 1, cy - 1)) m |= 2; if (s && e && test(cx + 1, cy + 1)) m |= 8; if (s && w && test(cx - 1, cy + 1)) m |= 32; if (n && w && test(cx - 1, cy - 1)) m |= 128;
    return m;
  }
  /** 射線（格子 DDA）：回傳 { hit, x, y, t（0～1）, cx, cy, nx, ny（撞到的面朝哪） } */
  raycast(x0, y0, x1, y1, test) {
    const s = this.size, solid = test || ((x, y) => this.isSolid(x, y));
    let x = (x0 - this.ox) / s, y = (y0 - this.oy) / s; const dx = (x1 - this.ox) / s - x, dy = (y1 - this.oy) / s - y;
    let cx = Math.floor(x), cy = Math.floor(y); const sx = Math.sign(dx), sy = Math.sign(dy);
    const tdx = dx ? Math.abs(1 / dx) : Infinity, tdy = dy ? Math.abs(1 / dy) : Infinity;
    let tx = dx > 0 ? (cx + 1 - x) / dx : dx < 0 ? (x - cx) / -dx : Infinity, ty = dy > 0 ? (cy + 1 - y) / dy : dy < 0 ? (y - cy) / -dy : Infinity;
    const r = this._ray || (this._ray = {});
    if (solid(cx, cy)) { Object.assign(r, { hit: true, t: 0, x: x0, y: y0, cx, cy, nx: 0, ny: 0 }); return r; }
    let nx = 0, ny = 0, t = 0;
    for (let i = 0; i < 4096; i++) {
      if (tx < ty) { t = tx; tx += tdx; cx += sx; nx = -sx; ny = 0; } else { t = ty; ty += tdy; cy += sy; ny = -sy; nx = 0; }
      if (t > 1) break;
      if (solid(cx, cy)) { Object.assign(r, { hit: true, t, x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, cx, cy, nx, ny }); return r; }
    }
    Object.assign(r, { hit: false, t: 1, x: x1, y: y1, cx, cy, nx: 0, ny: 0 }); return r;
  }
  los(x0, y0, x1, y1) { return !this.raycast(x0, y0, x1, y1).hit; }
  /** 視野（遞迴陰影投射）：從 (cx, cy) 看得到哪些格子（含牆面）；out 是 Uint8Array（看得到的設 1），回傳 out */
  fov(ox, oy, r, out, opaque = (x, y) => this.isSolid(x, y)) {
    out = out || new Uint8Array(this.w * this.h);
    const W = this.w, H = this.h, set = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) out[y * W + x] = 1; };
    set(ox, oy);
    const M = [[1, 0, 0, -1, -1, 0, 0, 1], [0, 1, -1, 0, 0, -1, 1, 0], [0, 1, 1, 0, 0, -1, -1, 0], [1, 0, 0, 1, -1, 0, 0, -1]];
    const cast = (row, start, end, xx, xy, yx, yy) => {
      if (start < end) return;
      let newStart = 0;
      for (let j = row; j <= r; j++) {
        let dx = -j - 1; const dy = -j; let blocked = false;
        while (dx <= 0) {
          dx++;
          const X = ox + dx * xx + dy * xy, Y = oy + dx * yx + dy * yy, ls = (dx - 0.5) / (dy + 0.5), rs = (dx + 0.5) / (dy - 0.5);
          if (start < rs) continue; else if (end > ls) break;
          if (dx * dx + dy * dy <= r * r) set(X, Y);
          if (blocked) { if (opaque(X, Y)) { newStart = rs; continue; } blocked = false; start = newStart; }
          else if (opaque(X, Y) && j < r) { blocked = true; cast(j + 1, start, ls, xx, xy, yx, yy); newStart = rs; }
        }
        if (blocked) break;
      }
    };
    for (let o = 0; o < 8; o++) cast(1, 1, 0, M[0][o], M[1][o], M[2][o], M[3][o]);
    return out;
  }
  /**
   * 方塊撞牆：body = { x, y（中心）, w, h }，移動 (dx, dy)，撞到就貼著牆滑；回傳 { left, right, up, down }（down＝站在地上／平台上）
   * 單向平台：map.oneway = (v) => v === 2，只有從上面掉下來時會擋。移動太快時自動分段（不會穿牆）
   */
  move(b, dx, dy) {
    const res = this._mv || (this._mv = {}); res.left = res.right = res.up = res.down = false;
    const s = this.size, steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (s * 0.45)));
    for (let k = 0; k < steps; k++) { this._moveX(b, dx / steps, res); this._moveY(b, dy / steps, res); }
    return res;
  }
  _moveX(b, dx, res) {
    if (!dx) return;
    const hw = b.w / 2, hh = b.h / 2, s = this.size; b.x += dx;
    const y0 = this.cellY(b.y - hh + 0.01), y1 = this.cellY(b.y + hh - 0.01);
    if (dx > 0) { const cx = this.cellX(b.x + hw); for (let cy = y0; cy <= y1; cy++) if (this.isSolid(cx, cy)) { b.x = this.ox + cx * s - hw - 0.001; res.right = true; return; } }
    else { const cx = this.cellX(b.x - hw); for (let cy = y0; cy <= y1; cy++) if (this.isSolid(cx, cy)) { b.x = this.ox + (cx + 1) * s + hw + 0.001; res.left = true; return; } }
  }
  _moveY(b, dy, res) {
    if (!dy) return;
    const hw = b.w / 2, hh = b.h / 2, s = this.size, prevBottom = b.y + hh; b.y += dy;
    const x0 = this.cellX(b.x - hw + 0.01), x1 = this.cellX(b.x + hw - 0.01);
    if (dy > 0) {
      const cy = this.cellY(b.y + hh), top = this.oy + cy * s;
      for (let cx = x0; cx <= x1; cx++) {
        const v = this.get(cx, cy);
        if (this.solidFn(v) || (this.oneway && this.oneway(v) && prevBottom <= top + 0.5 && !b.dropping)) { b.y = top - hh - 0.001; res.down = true; return; }
      }
    } else { const cy = this.cellY(b.y - hh); for (let cx = x0; cx <= x1; cx++) if (this.isSolid(cx, cy)) { b.y = this.oy + (cy + 1) * s + hh + 0.001; res.up = true; return; } }
  }
  /** 把相鄰的格子合併成大方塊（貪婪）：[{ cx, cy, w, h }]（格子單位） */
  rects(test = (x, y) => this.isSolid(x, y)) {
    const W = this.w, H = this.h, used = new Uint8Array(W * H), out = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (used[y * W + x] || !test(x, y)) continue;
      let rw = 1; while (x + rw < W && !used[y * W + x + rw] && test(x + rw, y)) rw++;
      let rh = 1;
      outer: while (y + rh < H) { for (let k = 0; k < rw; k++) if (used[(y + rh) * W + x + k] || !test(x + k, y + rh)) break outer; rh++; }
      for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) used[yy * W + xx] = 1;
      out.push({ cx: x, cy: y, w: rw, h: rh });
    }
    return out;
  }
  /**
   * 牆擋光：合併後的方塊各加一個 PZ.light.box；回傳那些形狀（地圖變了先 .forEach(s => s.remove()) 再重加）
   * o = { test(cx, cy), lift（2.5D 牆往上抬幾單位：擋光的是畫出來的牆頂，牆面留在外面才照得到火把） }
   */
  lightBoxes(o = {}) {
    if (typeof o === 'function') o = { test: o };
    const s = this.size, lift = o.lift || 0;
    return this.rects(o.test).map((r) => Light.box(this.ox + r.cx * s, this.oy + r.cy * s - lift, r.w * s, r.h * s));
  }
  /** 離 (cx, cy) 最近、走得到的格子（點到牆上時用）：回傳 [cx, cy] 或 null */
  nearestOpen(cx, cy, maxR = 6, pass = (x, y) => !this.isSolid(x, y)) {
    if (pass(cx, cy)) return [cx, cy];
    let best = null, bd = Infinity;
    for (let r = 1; r <= maxR && !best; r++) for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r || x < 0 || y < 0 || x >= this.w || y >= this.h || !pass(x, y)) continue;
      const d = (x - cx) * (x - cx) + (y - cy) * (y - cy); if (d < bd) { bd = d; best = [x, y]; }
    }
    return best;
  }
  /** 2.5D：站在 (wx, wy)、離地 z 高的那一點，會不會被前面（南邊）的牆頂擋住（發光的眼睛、頭上的字要不要畫）；wallH＝牆高（世界單位） */
  behindWall(wx, wy, z, wallH) {
    const s = this.size, row = this.cellY(wy), r = Math.floor((wy - z + wallH - this.oy) / s);
    return r > row && this.isSolid(this.cellX(wx), r);
  }
  /** 畫面上看得到的格子範圍（多留 margin 格） */
  view(margin = 1) {
    const v = Cam.view, s = this.size;
    return [Math.max(0, Math.floor((v.x - this.ox) / s) - margin), Math.max(0, Math.floor((v.y - this.oy) / s) - margin), Math.min(this.w - 1, Math.floor((v.x + v.w - this.ox) / s) + margin), Math.min(this.h - 1, Math.floor((v.y + v.h - this.oy) / s) + margin)];
  }
  /**
   * 畫地圖。style（見 PZ.tiles）：{ under(g, map, view), floor(g, map, cx, cy, x, y, s), ground(g, map, view),
   *   row(g, map, cy, view)（一整列的牆，2.5D 用）, wall(g, map, cx, cy, x, y, s)（一格牆）, over(g, map, view) }
   * o = { actors: [...]（有 y＝腳底的物件）, drawActor(g, a) }：牆跟角色一列一列交錯畫——
   *   同一列先畫牆再畫角色（站在牆旁邊不會被切掉），南邊的牆後畫（走到牆後面會被牆頂擋住）
   */
  draw(g, style, o = {}) {
    const view = this.view(style.margin != null ? style.margin : 2), [x0, y0, x1, y1] = view, s = this.size, L = this.layers.main, W = this.w;
    if (style.under) style.under(g, this, view);
    if (style.floor) for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { if (!this.solidFn(L[cy * W + cx])) style.floor(g, this, cx, cy, this.ox + cx * s, this.oy + cy * s, s); }
    if (style.ground) style.ground(g, this, view);
    const actors = o.actors || [], draw = o.drawActor; let ai = 0;
    if (actors.length > 1) PZ.sortBy(actors, (a) => a.y);
    while (ai < actors.length && actors[ai].y < this.oy + y0 * s) draw(g, actors[ai++]);
    for (let cy = y0; cy <= y1; cy++) {
      if (style.row) style.row(g, this, cy, view);
      if (style.wall) for (let cx = x0; cx <= x1; cx++) if (this.solidFn(L[cy * W + cx])) style.wall(g, this, cx, cy, this.ox + cx * s, this.oy + cy * s, s);
      const rowBottom = this.oy + (cy + 1) * s;
      while (ai < actors.length && actors[ai].y < rowBottom) draw(g, actors[ai++]);
    }
    while (ai < actors.length) draw(g, actors[ai++]);
    if (style.over) style.over(g, this, view);
    return this;
  }
}
PZ.tilemap = (o) => new Tilemap(o);
PZ.Tilemap = Tilemap;

/* ---------- 尋路 ---------- */
class Heap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(v, k) { const K = this.k, V = this.v; let i = K.length; K.push(k); V.push(v); while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= k) break; K[i] = K[p]; V[i] = V[p]; i = p; } K[i] = k; V[i] = v; }
  pop() {
    const K = this.k, V = this.v, top = V[0], lk = K.pop(), lv = V.pop(), n = K.length;
    if (n) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && K[c + 1] < K[c]) c++; if (K[c] >= lk) break; K[i] = K[c]; V[i] = V[c]; i = c; } K[i] = lk; V[i] = lv; }
    return top;
  }
}
PZ.Heap = Heap;
const DIRS8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
const Path = PZ.path = {
  /** A*：回傳 [[cx, cy]…]（含起點、終點），走不到回傳 null。o = { diag（預設 true）, passable(cx, cy), cost(cx, cy)（額外成本）, max（最多展開幾格） } */
  find(map, sx, sy, tx, ty, o = {}) {
    const W = map.w, H = map.h, pass = o.passable || ((x, y) => !map.isSolid(x, y)), diag = o.diag !== false, cost = o.cost;
    if (!pass(tx, ty) || !pass(sx, sy)) return null;
    const N = W * H, g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N), heap = new Heap();
    const s = sy * W + sx, t = ty * W + tx, hfn = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return diag ? Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy) : dx + dy; };
    g[s] = 0; heap.push(s, hfn(sx, sy)); let n = 0; const max = o.max || N;
    while (heap.size) {
      const c = heap.pop(); if (closed[c]) continue; closed[c] = 1;
      if (c === t) break; if (++n > max) return null;
      const cx = c % W, cy = (c / W) | 0;
      for (let d = 0; d < (diag ? 8 : 4); d++) {
        const [ddx, ddy, dc] = DIRS8[d], nx = cx + ddx, ny = cy + ddy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || !pass(nx, ny)) continue;
        if (ddx && ddy && (!pass(cx + ddx, cy) || !pass(cx, cy + ddy))) continue;   // 不切牆角
        const ni = ny * W + nx; if (closed[ni]) continue;
        const ng = g[c] + dc + (cost ? cost(nx, ny) : 0);
        if (ng < g[ni]) { g[ni] = ng; from[ni] = c; heap.push(ni, ng + hfn(nx, ny)); }
      }
    }
    if (from[t] < 0 && s !== t) return null;
    const out = []; for (let c = t; c >= 0; c = from[c]) { out.push([c % W, (c / W) | 0]); if (c === s) break; }
    return out.reverse();
  },
  /** 把格子路徑拉直（看得到的就直接走過去）：回傳 [{ x, y }…]（世界座標） */
  smooth(map, cells) {
    if (!cells || !cells.length) return [];
    const pts = cells.map(([x, y]) => ({ x: map.cx(x), y: map.cy(y) })), out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !Path._clear(map, pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
    return out;
  },
  _clear(map, a, b) { const r = map.size * 0.3, nx = -(b.y - a.y), ny = b.x - a.x, l = Math.hypot(nx, ny) || 1; for (const k of [-1, 0, 1]) if (!map.los(a.x + (nx / l) * r * k, a.y + (ny / l) * r * k, b.x + (nx / l) * r * k, b.y + (ny / l) * r * k)) return false; return true; },
  /** 流場：PZ.path.flow(map, { max: 60（最遠算幾步）, passable }) → f.update(目標世界座標) 每格；f.dirAt(x, y) 往目標的方向 */
  flow(map, o = {}) { return new FlowField(map, o); },
};
class FlowField {
  constructor(map, o) {
    this.map = map; this.max = o.max || 1e9; this.pass = o.passable || ((x, y) => !map.isSolid(x, y));
    const N = map.w * map.h; this.dist = new Float32Array(N); this.vx = new Float32Array(N); this.vy = new Float32Array(N); this.tx = 0; this.ty = 0; this.tcx = -1; this.tcy = -1; this.heap = new Heap(); this._v = { x: 0, y: 0 };
  }
  /** 目標換格子才重算（同一格內移動不用算） */
  update(wx, wy, force) {
    const m = this.map, cx = clamp(m.cellX(wx), 0, m.w - 1), cy = clamp(m.cellY(wy), 0, m.h - 1); this.tx = wx; this.ty = wy;
    if (!force && cx === this.tcx && cy === this.tcy) return this;
    this.tcx = cx; this.tcy = cy;
    const W = m.w, H = m.h, D = this.dist, heap = this.heap; D.fill(Infinity);
    const s = cy * W + cx; D[s] = 0; heap.push(s, 0);
    while (heap.size) {
      const c = heap.pop(), dc0 = D[c]; if (dc0 > this.max) continue;
      const x = c % W, y = (c / W) | 0;
      for (const [dx, dy, dc] of DIRS8) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || !this.pass(nx, ny)) continue;
        if (dx && dy && (!this.pass(x + dx, y) || !this.pass(x, y + dy))) continue;
        const ni = ny * W + nx, nd = dc0 + dc; if (nd < D[ni]) { D[ni] = nd; heap.push(ni, nd); }
      }
    }
    // 每格的方向：往距離最小的鄰居
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let best = D[i], bx = 0, by = 0;
      if (best === Infinity) { this.vx[i] = this.vy[i] = 0; continue; }
      for (const [dx, dy] of DIRS8) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (dx && dy && (!this.pass(x + dx, y) || !this.pass(x, y + dy))) continue;
        const d = D[ny * W + nx]; if (d < best) { best = d; bx = dx; by = dy; }
      }
      const l = Math.hypot(bx, by) || 1; this.vx[i] = bx / l; this.vy[i] = by / l;
    }
    return this;
  }
  distAt(wx, wy) { const m = this.map, i = m.idx(m.cellX(wx), m.cellY(wy)); return i < 0 ? Infinity : this.dist[i]; }
  /** 往目標的方向（平滑內插；在目標那一格就直接朝目標點） */
  dirAt(wx, wy) {
    const m = this.map, s = m.size, out = this._v, fx = (wx - m.ox) / s - 0.5, fy = (wy - m.oy) / s - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    if (m.cellX(wx) === this.tcx && m.cellY(wy) === this.tcy) { const dx = this.tx - wx, dy = this.ty - wy, l = Math.hypot(dx, dy) || 1; out.x = dx / l; out.y = dy / l; return out; }
    let vx = 0, vy = 0, wsum = 0;
    const W = m.w, Hh = m.h, D = this.dist, VX = this.vx, VY = this.vy;
    for (let k = 0; k < 4; k++) {   // 四個角（不建陣列：這裡每隻怪每格都會叫）
      const ox = k & 1, oy = k >> 1, x = x0 + ox, y = y0 + oy; if (x < 0 || y < 0 || x >= W || y >= Hh) continue;
      const i = y * W + x; if (D[i] === Infinity || (!VX[i] && !VY[i])) continue;
      const w = (ox ? tx : 1 - tx) * (oy ? ty : 1 - ty); vx += VX[i] * w; vy += VY[i] * w; wsum += w;
    }
    if (!wsum) { const i = m.idx(m.cellX(wx), m.cellY(wy)); vx = i >= 0 ? this.vx[i] : 0; vy = i >= 0 ? this.vy[i] : 0; }
    const l = Math.hypot(vx, vy); out.x = l ? vx / l : 0; out.y = l ? vy / l : 0; return out;
  }
}
PZ.FlowField = FlowField;

/* ---------- 程序生成 ---------- */
const Gen = PZ.gen = {
  /** 地牢：房間＋走廊。o = { rooms: 14, min: 5, max: 11, seed, loops: 0.15（多連幾條形成環） } → { grid（1 牆 0 地）, w, h, rooms, start, end } */
  dungeon(w, h, o = {}) {
    const R = makeRng(o.seed != null ? o.seed : (Math.random() * 1e9) | 0), grid = new Int32Array(w * h).fill(1), rooms = [];
    const minS = o.min || 5, maxS = o.max || 11, want = o.rooms || 14;
    for (let t = 0; t < want * 30 && rooms.length < want; t++) {
      const rw = R.int(minS, maxS), rh = R.int(minS, Math.max(minS, maxS - 2)), rx = R.int(1, w - rw - 2), ry = R.int(1, h - rh - 2);
      if (rooms.some((r) => rx < r.x + r.w + 2 && rx + rw + 2 > r.x && ry < r.y + r.h + 2 && ry + rh + 2 > r.y)) continue;
      rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1) });
    }
    for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) grid[y * w + x] = 0;
    // 最小生成樹把房間接起來，再多接幾條形成環路
    const dig = (a, b) => {
      const horizFirst = R.chance(0.5), wid = R.chance(0.35) ? 2 : 1;
      const line = (x0, y0, x1, y1) => { const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0); let x = x0, y = y0; for (;;) { for (let k = 0; k < wid; k++) { const xx = dy ? x + k : x, yy = dx ? y + k : y; if (xx > 0 && yy > 0 && xx < w - 1 && yy < h - 1) grid[yy * w + xx] = 0; } if (x === x1 && y === y1) break; x += dx; y += dy; } };
      if (horizFirst) { line(a.cx, a.cy, b.cx, a.cy); line(b.cx, a.cy, b.cx, b.cy); } else { line(a.cx, a.cy, a.cx, b.cy); line(a.cx, b.cy, b.cx, b.cy); }
    };
    const inTree = new Set([0]), edges = [];
    while (inTree.size < rooms.length) {
      let best = null, bd = Infinity;
      for (const i of inTree) for (let j = 0; j < rooms.length; j++) { if (inTree.has(j)) continue; const d = dist2(rooms[i].cx, rooms[i].cy, rooms[j].cx, rooms[j].cy); if (d < bd) { bd = d; best = [i, j]; } }
      if (!best) break; inTree.add(best[1]); edges.push(best);
    }
    for (const [i, j] of edges) dig(rooms[i], rooms[j]);
    const loops = Math.round(rooms.length * (o.loops != null ? o.loops : 0.15));
    for (let k = 0; k < loops; k++) { const a = R.pick(rooms), b = R.pick(rooms); if (a !== b) dig(a, b); }
    // 起點：第一間；終點：離起點最遠的一間
    const start = rooms[0]; let end = start, far = -1; for (const r of rooms) { const d = dist2(r.cx, r.cy, start.cx, start.cy); if (d > far) { far = d; end = r; } }
    return { grid, w, h, rooms, start, end };
  },
  /** 洞窟（細胞自動機）：o = { fill: 0.47, steps: 5, seed } → { grid, w, h, regions }；只留最大的一塊連通區 */
  caves(w, h, o = {}) {
    const R = makeRng(o.seed != null ? o.seed : (Math.random() * 1e9) | 0);
    let g = new Int32Array(w * h); for (let i = 0; i < g.length; i++) g[i] = R.chance(o.fill || 0.47) ? 1 : 0;
    const at = (a, x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 1 : a[y * w + x]);
    for (let s = 0; s < (o.steps || 5); s++) {
      const n = new Int32Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) c += at(g, x + dx, y + dy); n[y * w + x] = c > 4 || (c === 4 && g[y * w + x]) ? 1 : 0; }
      g = n;
    }
    for (let x = 0; x < w; x++) { g[x] = 1; g[(h - 1) * w + x] = 1; } for (let y = 0; y < h; y++) { g[y * w] = 1; g[y * w + w - 1] = 1; }
    const regions = Gen.regions(g, w, h, 0); regions.sort((a, b) => b.length - a.length);
    for (let i = 1; i < regions.length; i++) for (const c of regions[i]) g[c] = 1;
    return { grid: g, w, h, regions: regions.slice(0, 1) };
  },
  /** 連通區（四方向）：回傳 [[index…]…] */
  regions(grid, w, h, value = 0) {
    const seen = new Uint8Array(w * h), out = [];
    for (let i = 0; i < grid.length; i++) {
      if (seen[i] || grid[i] !== value) continue;
      const reg = [], st = [i]; seen[i] = 1;
      while (st.length) { const c = st.pop(); reg.push(c); const x = c % w, y = (c / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ni = ny * w + nx; if (nx >= 0 && ny >= 0 && nx < w && ny < h && !seen[ni] && grid[ni] === value) { seen[ni] = 1; st.push(ni); } } }
      out.push(reg);
    }
    return out;
  },
  /** 離牆多遠（格子數，八方向）：grid 裡不是 value 的格子＝牆。找「最空曠的地方」放出生點、王房、營火用 */
  distance(grid, w, h, value = 0) {
    const D = new Float32Array(w * h), BIG = 1e6, d1 = 1, d2 = Math.SQRT2;
    for (let i = 0; i < w * h; i++) D[i] = grid[i] === value ? BIG : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!D[i]) continue; let v = D[i]; if (x > 0) v = Math.min(v, D[i - 1] + d1); else v = Math.min(v, d1); if (y > 0) { v = Math.min(v, D[i - w] + d1); if (x > 0) v = Math.min(v, D[i - w - 1] + d2); if (x < w - 1) v = Math.min(v, D[i - w + 1] + d2); } else v = Math.min(v, d1); D[i] = v; }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!D[i]) continue; let v = D[i]; if (x < w - 1) v = Math.min(v, D[i + 1] + d1); else v = Math.min(v, d1); if (y < h - 1) { v = Math.min(v, D[i + w] + d1); if (x < w - 1) v = Math.min(v, D[i + w + 1] + d2); if (x > 0) v = Math.min(v, D[i + w - 1] + d2); } else v = Math.min(v, d1); D[i] = v; }
    return D;
  },
  /** 雜訊高度圖（0～1）：o = { scale: 0.08, octaves: 4, seed } */
  noise(w, h, o = {}) {
    const out = new Float32Array(w * h), sc = o.scale || 0.08, oc = o.octaves || 4, seed = o.seed != null ? o.seed : (Math.random() * 1e5) | 0;
    const dx = (seed % 997) * 13.7, dy = (seed % 541) * 7.3;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = fbm2(x * sc + dx, y * sc + dy, oc) * 0.5 + 0.5;
    return out;
  },
  /** 島嶼高度圖：雜訊＋中間高、外圈低（海）。o = { scale, seed, falloff: 1.6 } → Float32Array（0～1） */
  island(w, h, o = {}) {
    const n = Gen.noise(w, h, { scale: o.scale || 0.07, octaves: 5, seed: o.seed }), f = o.falloff || 1.6;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const nx = (x / (w - 1)) * 2 - 1, ny = (y / (h - 1)) * 2 - 1, d = Math.min(1, Math.hypot(nx, ny)); n[y * w + x] = clamp01(n[y * w + x] * 1.15 - Math.pow(d, f) * 0.75 + 0.18); }
    return n;
  },
  /** 均勻散布（Poisson disc，Bridson）：在 (x, y, w, h) 範圍、彼此至少相距 r；o = { seed, test(px, py)（要不要這點）, max } → [{ x, y }…] */
  scatter(x, y, w, h, r, o = {}) {
    const R = makeRng(o.seed != null ? o.seed : (Math.random() * 1e9) | 0), cs = r / Math.SQRT2, gw = Math.ceil(w / cs), gh = Math.ceil(h / cs), grid = new Int32Array(gw * gh).fill(-1), pts = [], active = [];
    const ok = (px, py) => {
      if (px < x || py < y || px >= x + w || py >= y + h) return false;
      const gx = Math.floor((px - x) / cs), gy = Math.floor((py - y) / cs);
      for (let yy = Math.max(0, gy - 2); yy <= Math.min(gh - 1, gy + 2); yy++) for (let xx = Math.max(0, gx - 2); xx <= Math.min(gw - 1, gx + 2); xx++) { const i = grid[yy * gw + xx]; if (i >= 0 && dist2(px, py, pts[i].x, pts[i].y) < r * r) return false; }
      return true;
    };
    const add = (px, py) => { pts.push({ x: px, y: py }); active.push(pts.length - 1); grid[Math.floor((py - y) / cs) * gw + Math.floor((px - x) / cs)] = pts.length - 1; };
    add(x + R.next() * w, y + R.next() * h);
    const max = o.max || 1e5;
    while (active.length && pts.length < max) {
      const ai = R.int(0, active.length - 1), p = pts[active[ai]]; let found = false;
      for (let k = 0; k < 24; k++) { const a = R.angle(), d = r * (1 + R.next()), px = p.x + Math.cos(a) * d, py = p.y + Math.sin(a) * d; if (ok(px, py)) { add(px, py); found = true; break; } }
      if (!found) active.splice(ai, 1);
    }
    return o.test ? pts.filter((p) => o.test(p.x, p.y)) : pts;
  },
};

/* ---------- 等角（斜 45°）投影小工具 ---------- */
PZ.iso = {
  /** 格子 (cx, cy, 高度 z) → 畫面座標（世界單位）；tw、th＝菱形的寬、高 */
  toScreen(cx, cy, z = 0, tw = 64, th = 32) { return { x: (cx - cy) * tw / 2, y: (cx + cy) * th / 2 - z }; },
  /** 畫面座標 → 格子（小數） */
  toCell(x, y, tw = 64, th = 32) { return { x: (x / (tw / 2) + y / (th / 2)) / 2, y: (y / (th / 2) - x / (tw / 2)) / 2 }; },
};
