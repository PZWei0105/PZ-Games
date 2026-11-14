/* ==========================================================================
   31 地圖的畫法（風格）：給 map.draw(g, style) 用
     PZ.tiles.dungeon({ floor, brick, top, height })          2.5D 地牢：石板地（每格隨機花色、雜物）、牆頂＋磚牆正面、牆腳陰影、亮邊
     PZ.tiles.cave(map, { ground, rock, face, rim, height })   洞窟：圓滑的岩壁（marching squares）、兩段懸崖面、接地陰影、亮邊、地上的碎石菇類
     PZ.tiles.island(map, 高度圖, { levels })                  島嶼：深海 → 淺灘（浪花一進一退）→ 沙灘 → 草地 → 岩石，一層一層的等高線
       style.height：牆高（格子的幾倍）；配光影：dungeon 用 map.lightBoxes({ lift: style.lift(map) })，cave 用 PZ.light.occluders(style.occlude)
     PZ.tiles.marching(g, map, 數值圖, 門檻, { color, dy, rim, rows })   把數值圖畫成圓滑的區塊（做自己的風格用）
     PZ.tiles.soften(map)   0/1 格子 → 柔化的數值圖（岩壁、海岸線變圓）
   顏色都可以換；材質是程式畫的（第一次用到才畫，放進圖集）。
   ========================================================================== */
const tileHash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
const Tiles = PZ.tiles = { hash: tileHash };

/* ---------- marching squares ---------- */
// 角落：A 左上（8）、B 右上（4）、C 右下（2）、D 左下（1）；邊上的點 AB、BC、CD、DA 依數值內插
const MS_POLY = [null, [['DA', 'CD', 'D']], [['BC', 'C', 'CD']], [['DA', 'BC', 'C', 'D']], [['AB', 'B', 'BC']], [['AB', 'B', 'BC'], ['DA', 'CD', 'D']], [['AB', 'B', 'C', 'CD']], [['DA', 'AB', 'B', 'C', 'D']],
  [['A', 'AB', 'DA']], [['A', 'AB', 'CD', 'D']], [['A', 'AB', 'DA'], ['BC', 'C', 'CD']], [['A', 'AB', 'BC', 'C', 'D']], [['A', 'B', 'BC', 'DA']], [['A', 'B', 'BC', 'CD', 'D']], [['A', 'B', 'C', 'CD', 'DA']], null];
const MS_EDGE = [null, [['DA', 'CD']], [['BC', 'CD']], [['DA', 'BC']], [['AB', 'BC']], [['AB', 'BC'], ['DA', 'CD']], [['AB', 'CD']], [['DA', 'AB']], [['AB', 'DA']], [['AB', 'CD']], [['AB', 'DA'], ['BC', 'CD']], [['AB', 'BC']], [['BC', 'DA']], [['BC', 'CD']], [['CD', 'DA']], null];
const MSP = { A: [0, 0], B: [0, 0], C: [0, 0], D: [0, 0], AB: [0, 0], BC: [0, 0], CD: [0, 0], DA: [0, 0] }, MS_A = [], MS_B = [], MS_R = [0, 0, 0, 0, 0, 0, 0, 0];
/** 凸多邊形（扁平陣列）在水平線 yc 切一刀，留下 y ≥ yc（ge）或 y ≤ yc 的那半 */
function msClip(src, yc, ge, dst) {
  dst.length = 0; const n = src.length / 2;
  for (let i = 0; i < n; i++) {
    const ax = src[i * 2], ay = src[i * 2 + 1], j = (i + 1) % n, bx = src[j * 2], by = src[j * 2 + 1];
    const ain = ge ? ay >= yc : ay <= yc, bin = ge ? by >= yc : by <= yc;
    if (ain) dst.push(ax, ay);
    if (ain !== bin) dst.push(ax + (bx - ax) * ((yc - ay) / (by - ay)), yc);
  }
  return dst;
}
/**
 * 把數值圖 field（長寬＝map 的格子，數值取在格子中心）在 thr 以上的地方畫成圓滑的色塊。
 * o = { color, a, dy（整片往下移；負的往上，畫 2.5D 的頂面）, fill（false＝只畫輪廓）, view（格子範圍）, tex（PZ.art.pattern 材質，乘上 color）, texS（材質縮放）,
 *       rows: [y0, y1]（只畫世界座標這段 y 之間的部分，2.5D 一列一列跟角色交錯畫用）,
 *       rim: { color, w, a, back（不朝南的邊亮幾成，預設 0.35）, mode: 'south'（只畫朝南的邊：懸崖底的接地陰影） }, outside（地圖外當成多少） }
 */
Tiles.marching = (g, map, field, thr, o = {}) => {
  const view = o.view || map.view(2), W = map.w, H = map.h, s = map.size, ox = map.ox + s / 2, oy = map.oy + s / 2, dy = o.dy || 0;
  const col = toColor(o.color || '#fff'), al = o.a != null ? o.a : 1, rim = o.rim, fill = o.fill !== false, out = o.outside != null ? o.outside : 0;
  const rc = rim ? toColor(rim.color || '#fff') : 0, rw = rim ? rim.w || 2 : 0, ra = rim ? (rim.a != null ? rim.a : 0.5) : 0, back = rim && rim.back != null ? rim.back : 0.35, southOnly = rim && rim.mode === 'south';
  let ylo = -Infinity, yhi = Infinity, cy0 = view[1] - 1, cy1 = view[3];
  if (o.rows) { ylo = o.rows[0]; yhi = o.rows[1]; cy0 = Math.max(cy0, Math.floor((ylo - oy) / s)); cy1 = Math.min(cy1, Math.ceil((yhi - oy) / s) - 1); }
  const val = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? out : field[y * W + x]);
  const lt = (va, vb) => (vb === va ? 0.5 : clamp01((thr - va) / (vb - va)));
  const P = MSP, fo = { a: al }, lo = { a: 0 }, tex = o.tex ? Art.get(o.tex) : null, to = tex ? { color: col, a: al, s: o.texS || 1 } : null;
  const runOut = (cx0, cx1, y0, y1) => {   // 一排整格：材質的話切成幾段（材質座標不要太大）
    const xa0 = ox + cx0 * s, xb0 = ox + cx1 * s;
    if (!tex) { g.rect(xa0, y0, xb0 - xa0, y1 - y0, col, fo); return; }
    const step = tex.w * to.s * 2;
    for (let xa = xa0; xa < xb0 - 0.01; xa += step) { const xb = Math.min(xb0, xa + step); MS_R[0] = xa; MS_R[1] = y0; MS_R[2] = xb; MS_R[3] = y0; MS_R[4] = xb; MS_R[5] = y1; MS_R[6] = xa; MS_R[7] = y1; g.polyTex(MS_R, tex, to); }
  };
  for (let cy = cy0; cy <= cy1; cy++) {
    const Y = oy + cy * s, ry0 = Math.max(Y, ylo), ry1 = Math.min(Y + s, yhi), clip = Y < ylo || Y + s > yhi;
    if (ry1 <= ry0) continue;
    let run = -1;   // 整格都在裡面（case 15）的連續一排合成一個長方形
    for (let cx = view[0] - 1; cx <= view[2] + 1; cx++) {
      const a = val(cx, cy), b = val(cx + 1, cy), c = val(cx + 1, cy + 1), d = val(cx, cy + 1);
      const k = (a >= thr ? 8 : 0) | (b >= thr ? 4 : 0) | (c >= thr ? 2 : 0) | (d >= thr ? 1 : 0);
      if (k === 15 && cx <= view[2]) { if (run < 0) run = cx; continue; }
      if (run >= 0) { if (fill) runOut(run, cx, ry0 + dy, ry1 + dy); run = -1; }
      if (!k || k === 15) continue;
      const X = ox + cx * s;
      P.A[0] = X; P.A[1] = Y; P.B[0] = X + s; P.B[1] = Y; P.C[0] = X + s; P.C[1] = Y + s; P.D[0] = X; P.D[1] = Y + s;
      P.AB[0] = X + s * lt(a, b); P.AB[1] = Y; P.BC[0] = X + s; P.BC[1] = Y + s * lt(b, c); P.CD[0] = X + s * (1 - lt(c, d)); P.CD[1] = Y + s; P.DA[0] = X; P.DA[1] = Y + s * (1 - lt(d, a));
      if (fill) for (const poly of MS_POLY[k]) {
        let pts = MS_A; pts.length = 0; for (const n of poly) pts.push(P[n][0], P[n][1]);
        if (clip) { if (Y < ylo) pts = msClip(pts, ylo, true, MS_B); if (Y + s > yhi) pts = msClip(pts, yhi, false, pts === MS_A ? MS_B : MS_A); if (pts.length < 6) continue; }
        if (dy) for (let i = 1; i < pts.length; i += 2) pts[i] += dy;
        if (tex) g.polyTex(pts, tex, to); else g.poly(pts, col, fo);
      }
      if (rim) {
        // 朝哪邊：數值往低的方向＝外面；朝南（往下）的邊最亮（懸崖邊緣迎光）
        const gx = b + c - a - d, gy = d + c - a - b, gl = Math.hypot(gx, gy) || 1, south = clamp01(-gy / gl);
        const k2 = southOnly ? south : back + (1 - back) * south; if (k2 <= 0.02) continue;
        lo.a = ra * k2;
        for (const [e0, e1] of MS_EDGE[k]) {
          let x0 = P[e0][0], y0 = P[e0][1], x1 = P[e1][0], y1 = P[e1][1];
          if (clip) {
            if ((y0 < ylo && y1 < ylo) || (y0 > yhi && y1 > yhi)) continue;
            const cl = (yc) => { const t = (yc - y0) / (y1 - y0); return [x0 + (x1 - x0) * t, yc]; };
            if (y0 < ylo) [x0, y0] = cl(ylo); else if (y0 > yhi) [x0, y0] = cl(yhi);
            if (y1 < ylo) [x1, y1] = cl(ylo); else if (y1 > yhi) [x1, y1] = cl(yhi);
          }
          g.line(x0, y0 + dy, x1, y1 + dy, rw, rc, lo);
        }
      }
    }
    if (run >= 0 && fill) runOut(run, view[2] + 1, ry0 + dy, ry1 + dy);
  }
};
/**
 * 等高線快取：地圖不會變，輪廓算一次存起來（按列），之後每格只剩「畫」——比每格重算 Tiles.marching 快很多
 *   const c = PZ.tiles.contour(map, field, 0.5)      c.draw(g, map.view(2), { color, tex, dy, rim })      c.drawRow(g, 列, x0, x1, 層)
 * 層（layer）= { color, a, dy, tex, texS, rim: { color, w, a, back, mode } }（同 Tiles.marching 的選項；第一次用會記住換算好的值，之後別改）
 */
class Contour {
  constructor(map, field, thr, outside = 0) { this.map = map; this.field = field; this.thr = thr; this.out = outside; this.rows = []; }
  /** 第 r 列（世界 y 在 r×格～(r+1)×格）的幾何：runs [xa, xb, ya, yb…]（整格一長條）、polys [{ x, pts }]、rims [x, x0, y0, x1, y1, 朝南…] */
  row(r) {
    let R = this.rows[r + 1]; if (R) return R;
    R = this.rows[r + 1] = { runs: [], polys: [], rims: [] };
    const m = this.map, s = m.size, ox = m.ox + s / 2, oy = m.oy + s / 2, W = m.w, H = m.h, F = this.field, thr = this.thr, out = this.out, P = MSP;
    const val = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? out : F[y * W + x]);
    const lt = (va, vb) => (vb === va ? 0.5 : clamp01((thr - va) / (vb - va)));
    const ylo = m.oy + r * s, yhi = ylo + s;
    for (let cy = r - 1; cy <= r; cy++) {
      const Y = oy + cy * s, ry0 = Math.max(Y, ylo), ry1 = Math.min(Y + s, yhi); if (ry1 <= ry0) continue;
      let run = -9;
      for (let cx = -1; cx <= W; cx++) {
        const a = val(cx, cy), b = val(cx + 1, cy), c = val(cx + 1, cy + 1), d = val(cx, cy + 1);
        const k = (a >= thr ? 8 : 0) | (b >= thr ? 4 : 0) | (c >= thr ? 2 : 0) | (d >= thr ? 1 : 0);
        if (k === 15) { if (run === -9) run = cx; continue; }
        if (run !== -9) { R.runs.push(ox + run * s, ox + cx * s, ry0, ry1); run = -9; }
        if (!k) continue;
        const X = ox + cx * s;
        P.A[0] = X; P.A[1] = Y; P.B[0] = X + s; P.B[1] = Y; P.C[0] = X + s; P.C[1] = Y + s; P.D[0] = X; P.D[1] = Y + s;
        P.AB[0] = X + s * lt(a, b); P.AB[1] = Y; P.BC[0] = X + s; P.BC[1] = Y + s * lt(b, c); P.CD[0] = X + s * (1 - lt(c, d)); P.CD[1] = Y + s; P.DA[0] = X; P.DA[1] = Y + s * (1 - lt(d, a));
        for (const poly of MS_POLY[k]) {
          let pts = MS_A; pts.length = 0; for (const n of poly) pts.push(P[n][0], P[n][1]);
          if (Y < ylo) pts = msClip(pts, ylo, true, MS_B); if (Y + s > yhi) pts = msClip(pts, yhi, false, pts === MS_A ? MS_B : MS_A);
          if (pts.length >= 6) R.polys.push({ x: X, pts: Float32Array.from(pts) });
        }
        const gx = b + c - a - d, gy = d + c - a - b, south = clamp01(-gy / (Math.hypot(gx, gy) || 1));
        for (const [e0, e1] of MS_EDGE[k]) {
          let x0 = P[e0][0], y0 = P[e0][1], x1 = P[e1][0], y1 = P[e1][1];
          if ((y0 < ylo && y1 < ylo) || (y0 > yhi && y1 > yhi)) continue;
          if (y0 < ylo || y0 > yhi) { const yc = y0 < ylo ? ylo : yhi; x0 += ((x1 - x0) * (yc - y0)) / (y1 - y0); y0 = yc; }
          if (y1 < ylo || y1 > yhi) { const yc = y1 < ylo ? ylo : yhi; x1 = x0 + ((x1 - x0) * (yc - y0)) / (y1 - y0); y1 = yc; }
          if (Math.abs(x1 - x0) + Math.abs(y1 - y0) > 0.01) R.rims.push(X, x0, y0, x1, y1, south);
        }
      }
      if (run !== -9) R.runs.push(ox + run * s, ox + (W + 1) * s, ry0, ry1);
    }
    return R;
  }
  /** 第一次用某一層：把顏色、材質換算好記在層上 */
  _prep(L) {
    if (L._p) return L;
    L._p = true; L._col = toColor(L.color || '#fff'); L._fo = { a: L.a != null ? L.a : 1 }; L._tex = L.tex ? Art.get(L.tex) : null;
    L._to = L._tex ? { color: L._col, a: L._fo.a, s: L.texS || 1 } : null;
    if (L.rim) { const q = L.rim; L._rc = toColor(q.color || '#fff'); L._rw = q.w || 2; L._ra = q.a != null ? q.a : 0.5; L._rb = q.back != null ? q.back : 0.35; L._rs = q.mode === 'south'; L._lo = { a: 0 }; }
    return L;
  }
  drawRow(g, r, x0w, x1w, L) {
    if (r < -1 || r > this.map.h) return;
    const R = this.row(r), s = this.map.size, dy = L.dy || 0; this._prep(L);
    if (L.fill !== false) {
      const runs = R.runs, tex = L._tex;
      for (let i = 0; i < runs.length; i += 4) {
        const xa0 = Math.max(runs[i], x0w), xb0 = Math.min(runs[i + 1], x1w); if (xb0 <= xa0) continue;
        const y0 = runs[i + 2] + dy, y1 = runs[i + 3] + dy;
        if (!tex) { g.rect(xa0, y0, xb0 - xa0, y1 - y0, L._col, L._fo); continue; }
        const step = tex.w * L._to.s * 2;
        for (let xa = xa0; xa < xb0 - 0.01; xa += step) { const xb = Math.min(xb0, xa + step); MS_R[0] = xa; MS_R[1] = y0; MS_R[2] = xb; MS_R[3] = y0; MS_R[4] = xb; MS_R[5] = y1; MS_R[6] = xa; MS_R[7] = y1; g.polyTex(MS_R, tex, L._to); }
      }
      for (const Pg of R.polys) {
        if (Pg.x + s < x0w || Pg.x > x1w) continue;
        const src = Pg.pts, pts = MS_A; pts.length = src.length;
        for (let i = 0; i < src.length; i += 2) { pts[i] = src[i]; pts[i + 1] = src[i + 1] + dy; }
        if (tex) g.polyTex(pts, tex, L._to); else g.poly(pts, L._col, L._fo);
      }
    }
    if (L.rim) {
      const rm = R.rims, lo = L._lo;
      for (let i = 0; i < rm.length; i += 6) {
        if (rm[i] + s < x0w || rm[i] > x1w) continue;
        const k = L._rs ? rm[i + 5] : L._rb + (1 - L._rb) * rm[i + 5]; if (k <= 0.02) continue;
        lo.a = L._ra * k; g.line(rm[i + 1], rm[i + 2] + dy, rm[i + 3], rm[i + 4] + dy, L._rw, L._rc, lo);
      }
    }
  }
  /** 畫整個畫面看得到的範圍（view＝map.view() 的格子範圍） */
  draw(g, view, L) {
    const m = this.map, s = m.size, x0w = m.ox + (view[0] - 1) * s, x1w = m.ox + (view[2] + 2) * s, dy = L.dy || 0;
    const r0 = Math.max(-1, view[1] - 1 - Math.ceil(Math.max(0, dy) / s)), r1 = Math.min(m.h, view[3] + 1 + Math.ceil(Math.max(0, -dy) / s));
    for (let r = r0; r <= r1; r++) this.drawRow(g, r, x0w, x1w, L);
  }
}
Tiles.contour = (map, field, thr, outside) => new Contour(map, field, thr, outside);
Tiles.Contour = Contour;
/** 0/1 格子 → 柔化過的數值圖（洞窟岩壁、海岸線用）：blur 次數越多越圓 */
Tiles.soften = (map, test = (x, y) => map.isSolid(x, y), blur = 1) => {
  const W = map.w, H = map.h; let f = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) f[y * W + x] = test(x, y) ? 1 : 0;
  for (let k = 0; k < blur; k++) {
    const n = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; s += xx < 0 || yy < 0 || xx >= W || yy >= H ? 1 : f[yy * W + xx]; } n[y * W + x] = (s / 9) * 0.6 + f[y * W + x] * 0.4; }
    f = n;
  }
  return f;
};
const MUSH = [[8, 14, 4.2], [14, 11.9, 5.7], [18, 15.2, 3.4]];   // 螢光菇（洞窟雜物第 1 種）三朵菇傘的位置與大小
const tileKey = (...cs) => cs.join('').replace(/[^a-z0-9]/gi, '').slice(0, 40);
/** 一格裡隨機放一個小東西：回傳 0～1 的位置（避開邊緣） */
const tileJit = (h, k) => 0.22 + (((h >>> k) & 255) / 255) * 0.56;

/* ---------- 共用材質（淡色，乘上地形的顏色）：岩石、草、沙 ---------- */
/** 左右上下接得起來地畫：fn 在九個位置各畫一次（超出邊界的部分會從另一邊冒出來） */
const wrapDraw = (c, w, h, fn) => { for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { c.save(); c.translate(ox, oy); fn(); c.restore(); } };
Tiles.patterns = () => {
  if (Art.has('tl.pat.rock')) return;
  Art.pattern('tl.pat.rock', 64, 64, (c, w, h) => {
    const R = makeRng(12); c.fillStyle = '#e4e4e4'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) { const x = R.range(0, w), y = R.range(0, h), r = R.range(6, 16), a = R.range(0.05, 0.13), dark = R.chance(0.6); wrapDraw(c, w, h, () => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${dark ? '0,0,0' : '255,255,255'},${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }); }
    for (let i = 0; i < 7; i++) { const pts = [[R.range(0, w), R.range(0, h)]]; for (let k = 0; k < 4; k++) { const [px, py] = pts[pts.length - 1]; pts.push([px + R.spread(9), py + R.spread(9)]); } wrapDraw(c, w, h, () => { c.strokeStyle = 'rgba(0,0,0,.32)'; c.lineWidth = 0.9; c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 0.6; c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x + 0.8, y + 0.8) : c.moveTo(x + 0.8, y + 0.8))); c.stroke(); }); }
    for (let i = 0; i < 90; i++) { const x = R.range(0, w), y = R.range(0, h), r = R.range(0.4, 1.4); c.fillStyle = `rgba(${R.chance(0.5) ? '0,0,0' : '255,255,255'},${R.range(0.08, 0.2)})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  });
  Art.pattern('tl.pat.grass', 64, 64, (c, w, h) => {
    const R = makeRng(21); c.fillStyle = '#ececec'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) { const x = R.range(0, w), y = R.range(0, h), r = R.range(8, 18), a = R.range(0.04, 0.1), dark = R.chance(0.5); wrapDraw(c, w, h, () => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${dark ? '0,0,0' : '255,255,255'},${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }); }
    for (let i = 0; i < 220; i++) { const x = R.range(0, w), y = R.range(0, h), l = R.range(1.6, 3.6), b = R.spread(1.2), dark = R.chance(0.55); wrapDraw(c, w, h, () => { c.strokeStyle = `rgba(${dark ? '0,40,0' : '255,255,230'},${R.range(0.1, 0.22)})`; c.lineWidth = 0.7; c.beginPath(); c.moveTo(x, y); c.lineTo(x + b, y - l); c.stroke(); }); }
  });
  Art.pattern('tl.pat.sand', 64, 64, (c, w, h) => {
    const R = makeRng(33); c.fillStyle = '#f2f2f2'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 6; k++) { const y0 = R.range(0, h), amp = R.range(1, 2.4), ph = R.angle(); wrapDraw(c, w, h, () => { c.strokeStyle = 'rgba(120,90,40,.12)'; c.lineWidth = 1.1; c.beginPath(); for (let x = 0; x <= w; x += 2) { const y = y0 + Math.sin((x / w) * TAU * 2 + ph) * amp; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }); }
    for (let i = 0; i < 320; i++) { c.fillStyle = `rgba(${R.chance(0.6) ? '90,70,40' : '255,255,255'},${R.range(0.08, 0.24)})`; c.fillRect(R.range(0, w), R.range(0, h), R.range(0.4, 1), R.range(0.4, 1)); }
  });
};

/* ---------- 2.5D 地牢 ---------- */
// 靠近地板的牆畫「牆頂」（石材＋亮邊），更裡面的實心岩不畫（深色背景＝看不見的黑暗）；朝南、底下是地板的牆畫磚牆正面
Tiles.dungeon = (o = {}) => {
  const C = Object.assign({ floor: '#3f434e', cap: '#4a4e5a', brick: '#6a5248', height: 0.8, rim: 'rgba(255,238,215,.4)', deco: 0.07 }, o);
  const key = 'tl.dg' + tileKey(C.floor, C.cap, C.brick);
  if (!Art.has(key + '.floor')) {
    // 地板：128×128 一整片不規則石板（四格一循環，跟世界座標對齊，看不出格子）
    Art.make(key + '.floor', 128, 128, (c, w, h) => {
      const R = makeRng(31), base = toColor(C.floor);
      c.fillStyle = Color.css(Color.darken(base, 0.62)); c.fillRect(0, 0, w, h);
      const stone = (x, y, sw, sh) => {
        const l = R.range(-12, 10), col = Color.mix(base, l > 0 ? '#ffffff' : '#000000', Math.abs(l) / 100), warm = R.range(-6, 6);
        const gr = c.createLinearGradient(x, y, x + sw, y + sh); gr.addColorStop(0, Color.css(Color.lighten(col, 0.06))); gr.addColorStop(1, Color.css(Color.darken(col, 0.1 + warm / 200)));
        for (const ox of [0, -w]) {
          c.fillStyle = gr; c.save(); c.translate(ox, 0); c.beginPath(); c.roundRect(x + 1.1, y + 1.1, sw - 2.2, sh - 2.2, 2.2); c.fill();
          c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(x + 2, y + 1.3, sw - 4, 1); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x + 2, y + sh - 2.4, sw - 4, 1.1);
          c.restore();
        }
      };
      let y = 0;
      for (const rh of [30, 22, 40, 36]) { let x = -R.range(0, 20); const x0 = x; while (x < x0 + w) { const sw = Math.min(R.range(22, 44), x0 + w - x); if (sw > 6) stone(x < 0 ? x + w : x, y, sw, rh); x += sw; } y += rh; }
      for (let n = 0; n < 260; n++) { c.fillStyle = `rgba(${R.chance(0.5) ? '255,255,255' : '0,0,0'},${R.range(0.03, 0.08)})`; c.fillRect(R.range(0, w), R.range(0, h), R.range(0.5, 2), R.range(0.5, 2)); }
      c.strokeStyle = 'rgba(0,0,0,.42)'; c.lineWidth = 0.9;
      for (let k = 0; k < 5; k++) { let px = R.range(8, w - 8), py = R.range(8, h - 8); c.beginPath(); c.moveTo(px, py); for (let j = 0; j < 4; j++) { px += R.spread(8); py += R.range(3, 8); c.lineTo(px, py); } c.stroke(); }
      for (let k = 0; k < 4; k++) { const x = R.range(10, w - 10), y2 = R.range(10, h - 10), gr = c.createRadialGradient(x, y2, 0, x, y2, R.range(10, 18)); gr.addColorStop(0, 'rgba(84,124,62,.26)'); gr.addColorStop(1, 'rgba(84,124,62,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }
    }, { anchor: [0, 0], wrap: true });
    Art.make(key + '.cap', 32, 32, (c, w, h) => {
      const R = makeRng(5); c.fillStyle = C.cap; c.fillRect(0, 0, w, h);
      for (let n = 0; n < 7; n++) { const x = R.range(0, w), y = R.range(0, h), gr = c.createRadialGradient(x, y, 0, x, y, R.range(6, 12)); gr.addColorStop(0, `rgba(${R.chance(0.5) ? '255,255,255' : '0,0,0'},${R.range(0.03, 0.06)})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }
      for (let n = 0; n < 60; n++) { c.fillStyle = `rgba(${R.chance(0.5) ? '255,255,255' : '0,0,0'},${R.range(0.03, 0.08)})`; c.fillRect(R.range(0, w), R.range(0, h), R.range(0.6, 2.4), R.range(0.6, 1.6)); }
    }, { anchor: [0, 0], wrap: true });
    Art.make(key + '.face', 32, 16, (c, w, h) => {
      const base = toColor(C.brick), R = makeRng(9); c.fillStyle = Color.css(Color.darken(base, 0.6)); c.fillRect(0, 0, w, h);
      for (let row = 0; row < 2; row++) for (let i = -1; i < 3; i++) { const x = i * 16 + (row ? 8 : 0), y = row * 8; c.fillStyle = Color.css(Color.mix(base, '#000', R.range(0, 0.32))); c.fillRect(x + 0.6, y + 0.6, 14.8, 6.8); c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(x + 0.6, y + 0.6, 14.8, 0.8); c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(x + 0.6, y + 6.6, 14.8, 0.8); }
    }, { anchor: [0, 0], wrap: true });
    Art.make(key + '.ao', 8, 16, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.62)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }, { anchor: [0, 0], scale: 1 });
    // 地上的雜物：骨頭、頭骨、碎石、排水孔、水窪、苔蘚
    Art.sheet(key + '.deco', 6, 24, 24, (c, w, h, i) => {
      const R = makeRng(70 + i);
      if (i === 0) { c.strokeStyle = '#d8cdb4'; c.lineCap = 'round'; c.lineWidth = 2.4; for (const [a, b, d, e] of [[4, 17, 19, 8], [6, 7, 18, 18]]) { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); } c.fillStyle = '#e9e0c8'; for (const [x, y] of [[4, 17], [19, 8], [6, 7], [18, 18]]) { c.beginPath(); c.arc(x, y, 1.9, 0, TAU); c.fill(); } }
      if (i === 1) { c.fillStyle = '#e2d8be'; c.beginPath(); c.arc(12, 10, 6.5, 0, TAU); c.fill(); c.fillRect(8.5, 13, 7, 5); c.fillStyle = '#1b1612'; c.beginPath(); c.arc(9.6, 10.5, 1.7, 0, TAU); c.arc(14.4, 10.5, 1.7, 0, TAU); c.fill(); c.fillRect(10, 16, 1, 2); c.fillRect(12.5, 16, 1, 2); }
      if (i === 2) for (let k = 0; k < 6; k++) { const x = R.range(4, 20), y = R.range(6, 20), r = R.range(1.5, 3.5); c.fillStyle = `hsl(220,6%,${R.range(28, 44)}%)`; c.beginPath(); c.moveTo(x - r, y); c.lineTo(x - r * 0.3, y - r); c.lineTo(x + r, y - r * 0.4); c.lineTo(x + r * 0.6, y + r * 0.7); c.closePath(); c.fill(); }
      if (i === 3) { c.fillStyle = '#121418'; c.fillRect(3, 3, 18, 18); c.fillStyle = '#4b5059'; for (let x = 4; x < 21; x += 4) c.fillRect(x, 3, 2, 18); c.strokeStyle = '#5e646e'; c.lineWidth = 1.4; c.strokeRect(3, 3, 18, 18); }
      if (i === 4) { c.fillStyle = 'rgba(30,48,70,.75)'; c.beginPath(); c.ellipse(12, 13, 10, 6, 0.2, 0, TAU); c.fill(); c.fillStyle = 'rgba(170,210,255,.28)'; c.beginPath(); c.ellipse(9, 11, 4, 1.5, 0.2, 0, TAU); c.fill(); }
      if (i === 5) for (let k = 0; k < 5; k++) { const x = R.range(4, 20), y = R.range(4, 20), gr = c.createRadialGradient(x, y, 0, x, y, R.range(4, 8)); gr.addColorStop(0, 'rgba(96,140,64,.55)'); gr.addColorStop(1, 'rgba(96,140,64,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }
    }, { anchor: [0.5, 0.5] });
    // 牆面上的東西：滴下來的苔蘚、裂縫、鐵環
    Art.sheet(key + '.fdeco', 3, 32, 20, (c, w, h, i) => {
      if (i === 0) { const R = makeRng(4); for (let k = 0; k < 4; k++) { const x = R.range(4, 28), l = R.range(5, 15); c.fillStyle = 'rgba(80,130,60,.55)'; c.fillRect(x, 0, R.range(2, 4), l); c.beginPath(); c.arc(x + 1.5, l, 1.8, 0, TAU); c.fill(); } c.fillStyle = 'rgba(80,130,60,.6)'; c.fillRect(0, 0, w, 2.5); }
      if (i === 1) { c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(18, 0); c.lineTo(15, 5); c.lineTo(19, 9); c.lineTo(14, 15); c.moveTo(19, 9); c.lineTo(24, 12); c.stroke(); }
      if (i === 2) { c.strokeStyle = '#2b2b2f'; c.lineWidth = 2; c.beginPath(); c.arc(16, 9, 4.5, 0, TAU); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 0.8; c.beginPath(); c.arc(16, 9, 4.5, Math.PI * 1.1, Math.PI * 1.6); c.stroke(); c.fillStyle = '#2b2b2f'; c.fillRect(14.5, 2.5, 3, 3); }
    }, { anchor: [0, 0] });
  }
  const floor = Art.get(key + '.floor'), cap = Art.get(key + '.cap'), face = Art.get(key + '.face'), ao = Art.get(key + '.ao');
  const deco = [0, 1, 2, 3, 4, 5].map((i) => Art.get(key + '.deco:' + i)), fdeco = [0, 1, 2].map((i) => Art.get(key + '.fdeco:' + i));
  const fo = { s: 1 }, flo = { s: 1, ox: 0, oy: 0 }, decoK = Math.round(C.deco * 1000), rimC = toColor(C.rim), lipC = Color.alpha(C.rim, Color.a(C.rim) * 0.7);
  return {
    margin: 2, height: C.height,
    lift: (m) => m.size * C.height,
    floor(g, m, cx, cy, x, y, s) {
      flo.s = s / 32; flo.ox = x; flo.oy = y; g.tile(floor, x, y, s, s, flo);
      const h = tileHash(cx, cy);
      if (((h >>> 9) % 1000) < decoK) { const d = deco[(h >>> 19) % 6]; g.spr(d, x + s * tileJit(h, 2), y + s * tileJit(h, 12), ((h >>> 22) % 628) / 100, s / 34, s / 34); }
      if (m.isSolid(cx, cy - 1)) g.spr(ao, x, y, 0, s / ao.w, (s * 0.62) / ao.h);           // 牆腳的陰影
      if (m.isSolid(cx - 1, cy)) g.spr(ao, x, y + s, -Math.PI / 2, s / ao.w, (s * 0.3) / ao.h);
      if (m.isSolid(cx + 1, cy)) g.spr(ao, x + s, y, Math.PI / 2, s / ao.w, (s * 0.3) / ao.h);
    },
    wall(g, m, cx, cy, x, y, s) {
      const n = !m.isSolid(cx, cy - 1), e = !m.isSolid(cx + 1, cy), so = !m.isSolid(cx, cy + 1), w = !m.isSolid(cx - 1, cy);
      // 八方向都是牆＝實心岩裡面：不畫（黑暗）
      if (!(n || e || so || w || !m.isSolid(cx - 1, cy - 1) || !m.isSolid(cx + 1, cy - 1) || !m.isSolid(cx - 1, cy + 1) || !m.isSolid(cx + 1, cy + 1))) return;
      const H = s * C.height;
      if (so) {
        fo.s = s / face.w; g.tile(face, x, y + s - H, s, H, fo);
        const h = tileHash(cx, cy); if ((h >>> 5) % 100 < 16) { const d = fdeco[(h >>> 13) % 3]; g.spr(d, x, y + s - H, 0, s / d.w, (H * 0.8) / d.h); }
        g.rect(x, y + s - H * 0.32, s, H * 0.32, 'rgba(0,0,0,.3)'); g.rect(x, y + s - H, s, 1.6, 'rgba(0,0,0,.55)');
        if (w) g.rect(x, y + s - H, 1.4, H, 'rgba(255,240,220,.1)');
        if (e) g.rect(x + s - 1.4, y + s - H, 1.4, H, 'rgba(0,0,0,.32)');
      }
      g.spr(cap, x, y - H, 0, s / cap.w, s / cap.h);
      // 牆頂的邊：朝地板的那幾邊有亮邊（看得出牆的厚度）；朝南、下面是牆面的那條是「牆緣」
      if (n) g.rect(x, y - H, s, 1.8, rimC);
      if (w) g.rect(x, y - H, 1.8, s, rimC);
      if (e) g.rect(x + s - 1.8, y - H, 1.8, s, rimC);
      if (so) { g.rect(x, y + s - H - 2.2, s, 2.2, lipC); g.rect(x, y + s - H - 0.2, s, 0.8, 'rgba(0,0,0,.6)'); }
    },
  };
};

/* ---------- 洞窟：圓滑岩壁 ---------- */
Tiles.cave = (map, o = {}) => {
  const C = Object.assign({ ground: '#4a4037', rock: '#544d46', rock2: '#615950', face: '#14110e', face2: '#231d19', rim: '#d2b796', height: 0.6, deco: 0.1, glow: '#5ff2dc' }, o);
  const field = C.field || Tiles.soften(map, undefined, 2), lift = map.size * C.height;
  const key = 'tl.cv' + tileKey(C.ground, C.rock);
  if (!Art.has(key + '.g')) {
    Art.make(key + '.g', 64, 64, (c, w, h) => {
      const R = makeRng(17); c.fillStyle = C.ground; c.fillRect(0, 0, w, h);
      for (let n = 0; n < 6; n++) { const x = R.range(0, w), y = R.range(0, h), gr = c.createRadialGradient(x, y, 0, x, y, R.range(10, 22)); gr.addColorStop(0, `rgba(0,0,0,${R.range(0.08, 0.16)})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { c.save(); c.translate(ox, oy); c.fillRect(-ox, -oy, w, h); c.restore(); } }
      for (let n = 0; n < 140; n++) { c.fillStyle = `rgba(${R.chance(0.5) ? '255,240,220' : '0,0,0'},${R.range(0.03, 0.09)})`; c.beginPath(); c.arc(R.range(0, w), R.range(0, h), R.range(0.4, 2.2), 0, TAU); c.fill(); }
    }, { anchor: [0, 0], wrap: true });
    // 地上：碎石、會發光的小菇、骨頭、水窪
    Art.sheet(key + '.deco', 4, 24, 24, (c, w, h, i) => {
      const R = makeRng(90 + i);
      if (i === 0) for (let k = 0; k < 5; k++) { const x = R.range(4, 20), y = R.range(8, 20), r = R.range(1.6, 3.6); c.fillStyle = `hsl(28,12%,${R.range(26, 40)}%)`; c.beginPath(); c.ellipse(x, y, r * 1.2, r * 0.8, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,240,220,.18)'; c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.3, r * 0.5, r * 0.3, 0, 0, TAU); c.fill(); }
      if (i === 1) for (const [x, s] of [[8, 1], [14, 1.35], [18, 0.8]]) { c.fillStyle = '#d9d1c0'; c.fillRect(x - 1, 20 - 6 * s, 2, 6 * s); const gr = c.createRadialGradient(x, 20 - 6 * s, 0, x, 20 - 6 * s, 4.5 * s); gr.addColorStop(0, '#b6fff1'); gr.addColorStop(1, '#2bb6a8'); c.fillStyle = gr; c.beginPath(); c.ellipse(x, 20 - 6 * s, 4.2 * s, 2.6 * s, 0, Math.PI, 0); c.fill(); }
      if (i === 2) { c.strokeStyle = '#cfc4aa'; c.lineCap = 'round'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(5, 16); c.lineTo(19, 10); c.stroke(); c.fillStyle = '#ddd2b8'; for (const [x, y] of [[5, 16], [19, 10]]) { c.beginPath(); c.arc(x, y, 1.8, 0, TAU); c.fill(); } }
      if (i === 3) { c.fillStyle = 'rgba(22,30,40,.7)'; c.beginPath(); c.ellipse(12, 13, 10, 5.5, -0.15, 0, TAU); c.fill(); c.fillStyle = 'rgba(160,200,255,.22)'; c.beginPath(); c.ellipse(9, 11.5, 4, 1.4, -0.15, 0, TAU); c.fill(); }
    }, { anchor: [0.5, 0.5] });
  }
  Tiles.patterns();
  const gtex = Art.get(key + '.g'), deco = [0, 1, 2, 3].map((i) => Art.get(key + '.deco:' + i)), decoK = Math.round(C.deco * 1000);
  const C5 = new Contour(map, field, 0.5, 1), C7 = new Contour(map, field, 0.74, 1);
  const LY = [
    [C5, { color: '#000', a: 0.3, dy: 7 }],                                                                  // 接地陰影
    [C5, { color: C.face, rim: { color: '#000', a: 0.5, w: 3, mode: 'south' } }],                           // 懸崖面（下半，最暗）＋懸崖底的陰影線
    [C5, { color: C.face2, dy: -lift * 0.55 }],                                                             // 懸崖面（上半）
    [C5, { color: C.rock, tex: 'tl.pat.rock', texS: 1.1, dy: -lift, rim: { color: C.rim, a: 0.9, w: 2.4, back: 0.38 } }],   // 岩頂
    [C7, { color: C.rock2, tex: 'tl.pat.rock', texS: 1.1, dy: -lift, rim: { color: C.rim, a: 0.16, w: 1.4, back: 0.5 } }],  // 岩頂內圈（厚度）
  ];
  const OCC = { color: '#fff', dy: -lift };
  const st = {
    field, margin: 3, height: C.height, lift: () => lift, contour: C5,
    under(g, m, view) { const s = m.size, x = m.ox + view[0] * s, y = m.oy + view[1] * s; g.tile(gtex, x, y, (view[2] - view[0] + 1) * s, (view[3] - view[1] + 1) * s, { s: 1.25, ox: -x, oy: -y }); },
    floor(g, m, cx, cy, x, y, s) {
      const h = tileHash(cx, cy); if (((h >>> 9) % 1000) >= decoK) return;
      const i = (h >>> 19) % 4; g.spr(deco[i], x + s * tileJit(h, 2), y + s * tileJit(h, 12), i === 1 ? 0 : ((h >>> 22) % 628) / 100, s / 30, s / 30);
    },
    /** 一列一列畫（跟角色交錯）：接地陰影 → 懸崖面（兩段深淺）→ 岩頂（材質＋亮邊）→ 岩頂的內圈（看起來有厚度） */
    row(g, m, cy, view) {
      const s = m.size, x0w = m.ox + (view[0] - 1) * s, x1w = m.ox + (view[2] + 2) * s;
      for (const [c, L] of LY) c.drawRow(g, cy, x0w, x1w, L);
    },
    /** 擋光用：PZ.light.occluders(style.occlude)（擋光的是畫出來的岩頂，懸崖面照得到） */
    occlude: (g) => C5.draw(g, map.view(2), OCC),
    /** 會自己發光的東西（螢光菇）：在 g.lighting() 之後呼叫 */
    emissive(g, m) {
      const [x0, y0, x1, y1] = m.view(1), s = m.size, k = s / 30, t = Time.t;
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        if (m.isSolid(cx, cy)) continue;
        const h = tileHash(cx, cy); if (((h >>> 9) % 1000) >= decoK || (h >>> 19) % 4 !== 1) continue;
        const px = m.ox + cx * s + s * tileJit(h, 2), py = m.oy + cy * s + s * tileJit(h, 12);
        if (m.behindWall(px, py, 6, lift)) continue;
        const pulse = 0.75 + 0.25 * Math.sin(t * 1.7 + (h & 63));
        for (const [ax, ay, r] of MUSH) g.glow(px + (ax - 12) * k, py + (ay - 12) * k, r * k * 2.2, C.glow, { a: 0.55 * pulse, core: 0.7 });
      }
    },
  };
  return st;
};

/* ---------- 島嶼：一層一層的等高線 ---------- */
Tiles.island = (map, height, o = {}) => {
  // [門檻, 顏色, 亮邊, 材質]
  const L = o.levels || [[0.42, '#f0dca6', 0.5, 'sand'], [0.47, '#8fc463', 0.32, 'grass'], [0.57, '#74b253', 0.22, 'grass'], [0.68, '#5d9a45', 0.22, 'grass'], [0.78, '#a59a87', 0.42, 'rock'], [0.88, '#d3cbbb', 0.45, 'rock']];
  Tiles.patterns();
  const key = 'tl.is';
  if (!Art.has(key + '.tuft:0')) {
    Art.sheet(key + '.tuft', 3, 20, 16, (c, w, h, i) => {
      const R = makeRng(40 + i);
      for (let k = 0; k < 7; k++) { const x = R.range(4, 16), l = R.range(6, 13), b = R.spread(4); c.strokeStyle = `hsl(${R.range(88, 110)},${R.range(40, 55)}%,${R.range(30, 46)}%)`; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, h - 1); c.quadraticCurveTo(x + b * 0.3, h - l * 0.6, x + b, h - l); c.stroke(); }
    }, { anchor: [0.5, 0.9] });
    Art.sheet(key + '.flower', 3, 14, 14, (c, w, h, i) => {
      const col = ['#ffe27a', '#ff8fb8', '#ffffff'][i];
      c.strokeStyle = '#3f7a34'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(7, 13); c.lineTo(7, 7); c.stroke();
      c.fillStyle = col; for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; c.beginPath(); c.arc(7 + Math.cos(a) * 2.4, 5 + Math.sin(a) * 2.4, 1.8, 0, TAU); c.fill(); }
      c.fillStyle = '#f2a33a'; c.beginPath(); c.arc(7, 5, 1.3, 0, TAU); c.fill();
    }, { anchor: [0.5, 0.92] });
    Art.make(key + '.shell', 10, 8, (c) => { c.fillStyle = '#f6e7d6'; c.beginPath(); c.moveTo(1, 7); c.quadraticCurveTo(5, -3, 9, 7); c.closePath(); c.fill(); c.strokeStyle = 'rgba(160,120,100,.6)'; c.lineWidth = 0.7; for (const x of [3.5, 5, 6.5]) { c.beginPath(); c.moveTo(5, 7); c.lineTo(x, 2); c.stroke(); } }, { anchor: [0.5, 0.8] });
  }
  const tufts = [0, 1, 2].map((i) => Art.get(key + '.tuft:' + i)), flowers = [0, 1, 2].map((i) => Art.get(key + '.flower:' + i)), shell = Art.get(key + '.shell');
  const crest = { a: 0 }, s0 = map.size;
  const SEA = [[0.27, '#1b6888'], [0.35, '#2585a6'], [0.395, '#3ea3bd']].map(([t, c]) => [new Contour(map, height, t), { color: c }]);
  const LV = L.map(([thr, col, ra, pat]) => [new Contour(map, height, thr), { color: Color.darken(col, 0.32), dy: s0 * 0.16 }, { color: col, tex: pat ? 'tl.pat.' + pat : null, texS: 1.2, rim: { color: '#ffffff', w: 1.6, a: ra * 0.55, back: 0.5 } }]);
  return {
    margin: 2, field: height, height: 0,
    under(g, m, view) {
      const s = m.size, x = m.ox + view[0] * s, y = m.oy + view[1] * s, w = (view[2] - view[0] + 1) * s, h = (view[3] - view[1] + 1) * s, t = Time.t;
      g.rect(x, y, w, h, o.sea || '#155a7c');
      for (const [c, Ly] of SEA) c.draw(g, view, Ly);
      // 浪：海面上一閃一閃的浪頭；岸邊的白浪一進一退
      for (let cy = view[1]; cy <= view[3]; cy++) for (let cx = view[0]; cx <= view[2]; cx++) {
        const i = cy * m.w + cx, hh = height[i]; if (hh > 0.36) continue;
        const k = tileHash(cx, cy); if (k % 4) continue;
        const ph = ((k >>> 8) % 1000) / 1000, v = Math.sin((t * 0.35 + ph) * TAU); if (v < 0.35) continue;
        crest.a = (v - 0.35) * 0.6; const px = m.ox + (cx + tileJit(k, 3)) * s, py = m.oy + (cy + tileJit(k, 13)) * s;
        g.line(px - 5, py, px + 5, py - 0.8, 1.6, '#d8f6ff', crest);
      }
      const wv = Math.sin(t * 1.25);
      Tiles.marching(g, m, height, 0.402 - wv * 0.012, { fill: false, view, rim: { color: '#ffffff', a: 0.55 + wv * 0.15, w: 2.6, back: 1 } });
      Tiles.marching(g, m, height, 0.37 - wv * 0.012, { fill: false, view, rim: { color: '#e6fbff', a: 0.22, w: 1.6, back: 1 } });
    },
    ground(g, m, view) {
      for (const [c, under, top] of LV) { c.draw(g, view, under); c.draw(g, view, top); }
      const s = m.size;
      for (let cy = view[1]; cy <= view[3]; cy++) for (let cx = view[0]; cx <= view[2]; cx++) {
        const i = cy * m.w + cx, hh = height[i], k = tileHash(cx, cy), px = m.ox + (cx + tileJit(k, 3)) * s, py = m.oy + (cy + tileJit(k, 13)) * s;
        if (hh > 0.5 && hh < 0.77) { if (k % 3 === 0) g.spr(tufts[(k >>> 5) % 3], px, py, 0, (k & 32) ? -1 : 1, 1); else if (k % 11 === 1) g.spr(flowers[(k >>> 7) % 3], px, py); }
        else if (hh > 0.43 && hh < 0.47 && k % 9 === 0) g.spr(shell, px, py, ((k >>> 9) % 100) / 30);
      }
    },
  };
};
