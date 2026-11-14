/* ==========================================================================
   25 光影：動態光源、柔和陰影、投影、光束
     PZ.light.on({ ambient: '#1b2333' })     打開光影；ambient＝沒被照到的地方剩多亮（'#fff'＝白天，看起來跟沒開一樣）
     const lamp = PZ.light.add({ x, y, r: 260, color: '#ffb547', intensity: 1.2, flicker: 0.25, glow: 0.6 })
       lamp.x = …（會動就直接改）  lamp.fade(0, 0.5)  lamp.remove()
     手電筒：PZ.light.add({ follow: hero, r: 460, cone: 0.42, dir: 角度, color: '#fff2d6' })   cone＝半張角（弧度）
     擋光的東西（產生陰影）：
       PZ.light.box(x, y, w, h)、PZ.light.circle(x, y, r)、PZ.light.poly([x0,y0, x1,y1, …])   固定的牆、柱子、箱子（回傳的東西可以改位置、.remove()）
       PZ.light.occluders((g) => { g.sprite('crate', c.x, c.y); … })                        每格畫一次（會動的、要用圖形狀的）
     render(g) { …畫地板、牆、角色… g.lighting(); …畫燈泡、火焰、發光字… }   沒呼叫的話 g.hud() 會自動套用
     PZ.light.zone(x, y, w, h, { ambient: '#fff', soft: 60 })   這一塊換一種環境光（屋內暗、院子亮；側視遊戲的天空、遠景不受影響）
     PZ.light.at(x, y)        這一點有多亮（0＝全黑、1＝原色；潛行遊戲用）    PZ.light.blocked(x0, y0, x1, y1)  兩點之間有沒有被擋（視線）
     g.castShadow('hero', x, y, { len, a })   角色的投影：自動朝「離最亮那盞燈」的方向，沒有燈就用 PZ.light.sun
     g.beam(x, y, 角度, 長度, 起點寬, 終點寬, color, { a, end })   光束（窗戶透進來的光、探照燈、舞台燈）
   做法：每盞燈一個方塊畫進低解析度的「光照圖」，最後跟畫面相乘（2×：光照圖一半＝原色，最亮到兩倍，搭泛光會發光）。
   陰影：擋光的東西先畫成遮光圖，用 JFA 算出「到最近牆的距離」，每個像素往燈的方向跳著走，順便量擦邊多近 → 柔和的半影。
   畫質低時自動降解析度、關陰影；Canvas2D 後備模式只有光、沒有陰影。
   ========================================================================== */
const Light = PZ.light = {
  active: false, ambient: '#ffffff', soak: 10, haze: 0, shadows: true,
  sun: { angle: 0.9, len: 0.75, a: 0.4 },          // 沒有燈的時候，角色投影的方向（白天的太陽）
  lights: [], shapes: [], zones: [], fn: null,
  _list: [], _vis: [], _flash: 0, _flashColor: [0.8, 0.86, 1], _wHaze: 0, _amb: [1, 1, 1],
  /** 每一階畫質：光照圖解析度（scale）、遮光圖解析度（mask，0＝不算陰影）、陰影追蹤步數、距離場最遠量幾格（reach：JFA 從這個步長開始） */
  tiers: [
    { scale: 0.25, mask: 0, steps: 0, reach: 0 },
    { scale: 0.34, mask: 0.25, steps: 14, reach: 32 },
    { scale: 0.5, mask: 0.34, steps: 20, reach: 32 },
    { scale: 0.5, mask: 0.5, steps: 28, reach: 64 },
  ],
};
Light.quality = () => Light.tiers[clamp(Quality.tier, 0, Light.tiers.length - 1)];

/** 打開光影。o: { ambient, soak（光滲進牆面幾單位，預設 10）, shadows（false＝全部不算陰影） } */
Light.on = (o = {}) => {
  Light.active = true;
  if (o.ambient != null) Light.ambient = o.ambient;
  if (o.soak != null) Light.soak = o.soak;
  if (o.shadows != null) Light.shadows = !!o.shadows;
  if (o.haze != null) Light.haze = o.haze;
  return Light;
};
Light.off = () => { Light.active = false; return Light; };
/** 全部清掉（場景切換時引擎會自動呼叫） */
Light.reset = () => {
  for (const l of Light.lights) l.dead = true;
  for (const s of Light.shapes) s.dead = true;
  Light.lights.length = 0; Light.shapes.length = 0; Light.zones.length = 0; Light.fn = null;
  Light.active = false; Light.ambient = '#ffffff'; Light.soak = 10; Light.haze = 0; Light.shadows = true; Light._flash = 0;
  Light.sun = { angle: 0.9, len: 0.75, a: 0.4 };
};

/* ---------- 燈 ---------- */
let LightSeed = 1;
class PZLight {
  constructor(o) {
    this.x = 0; this.y = 0; this.r = 240; this.color = '#fff'; this.intensity = 1;
    this.flicker = 0; this.flickerSpeed = 9; this.cone = null; this.dir = 0; this.soft = null;
    this.size = 10; this.shadows = true; this.haze = 0; this.glow = 0; this.glowR = null; this.fall = 6;
    this.follow = null; this.ox = 0; this.oy = 0; this.screen = false; this.on = true;
    this.dead = false; this._k = 1; this._fi = 1; this._seed = (LightSeed++ * 7.31) % 100; this._fade = null;
    this.set(o);
  }
  set(o) { if (o) for (const k in o) this[k] = o[k]; return this; }
  get color() { return this._color; }
  set color(v) { this._color = v; this._col = toColor(v); }
  /** 漸亮／漸暗到 k（強度倍率），time 秒；k＝0 且 o.remove 時順便移除 */
  fade(k, time = 0.4, o = {}) { this._fade = { from: this._k, to: k, t: 0, time: Math.max(0.001, time), remove: !!o.remove }; return this; }
  remove() { this.dead = true; const i = Light.lights.indexOf(this); if (i >= 0) Light.lights.splice(i, 1); }
}
/**
 * 加一盞燈。o: { x, y, r（半徑）, color, intensity（1＝把原色照到最亮；2＝曝光過度會發光）,
 *   flicker（0～1 閃爍，火把 0.2、壞掉的燈 0.6）, flickerSpeed, cone（半張角，弧度；不給＝四面八方）, dir（方向）, soft（邊緣柔和，弧度）,
 *   size（光源大小，越大陰影越柔，預設 10）, shadows（false＝這盞不算陰影）, haze（0～1 霧裡看得到的光）,
 *   glow（0～1 光源本身畫一顆光點）, glowR, fall（衰減，越大中心越集中，預設 6）, follow（跟著某個物件）, ox, oy, screen（用螢幕座標） }
 */
Light.add = (o = {}) => {
  const l = new PZLight(o);
  if (l.follow) { l.x = l.follow.x + l.ox; l.y = l.follow.y + l.oy; }
  Light.lights.push(l);
  return l;
};

/* ---------- 擋光的東西 ---------- */
class PZShape {
  constructor(kind, o) { this.kind = kind; Object.assign(this, o); this.dead = false; }
  remove() { this.dead = true; const i = Light.shapes.indexOf(this); if (i >= 0) Light.shapes.splice(i, 1); }
}
/** 方塊（左上角 x, y） */
Light.box = (x, y, w, h) => { const s = new PZShape('box', { x, y, w, h }); Light.shapes.push(s); return s; };
/** 圓柱 */
Light.circle = (x, y, r) => { const s = new PZShape('circle', { x, y, r }); Light.shapes.push(s); return s; };
/** 凸多邊形 [x0,y0, x1,y1, …]（凹的請拆成幾塊） */
Light.poly = (pts) => { const s = new PZShape('poly', { pts: pts.slice() }); Light.shapes.push(s); return s; };
/** 每格自己畫擋光的東西（用平常的 g.sprite / g.rect / g.circle，顏色不重要，看透明度）。回傳取消用的函式 */
Light.occluders = (fn) => { Light.fn = fn; return () => { if (Light.fn === fn) Light.fn = null; }; };

/** 環境光區塊（世界座標的方塊；screen: true 用螢幕座標）。o: { ambient（預設白＝不變暗）, soft（邊緣柔和幾單位，預設 40）, a（0～1 蓋過多少）}。回傳的物件可以改 x/y/w/h/ambient、.remove() */
Light.zone = (x, y, w, h, o = {}) => {
  const z = { x, y, w, h, ambient: o.ambient || '#ffffff', soft: o.soft != null ? o.soft : 40, a: o.a != null ? o.a : 1, screen: !!o.screen, dead: false,
    remove() { this.dead = true; const i = Light.zones.indexOf(this); if (i >= 0) Light.zones.splice(i, 1); } };
  Light.zones.push(z); return z;
};
/** 打雷、爆炸：環境光短暫變亮（amount 0～1，time 秒，color 預設冷白） */
Light.flash = (amount = 0.8, time = 0.25, color) => {
  Light._flash = Math.max(Light._flash, amount * Settings.flashScale()); Light._flashDecay = 1 / Math.max(0.02, time);
  if (color) { const c = toColor(color); Light._flashColor = [cR(c) / 255, cG(c) / 255, cB(c) / 255]; }
};

/* ---------- 每格 ---------- */
function lightNoise(t) { return (noise1(t) + noise1(t * 2.7 + 13.1) * 0.5) * 0.66 * 0.5 + 0.5; } // 約 0～1
/** 換到乾淨的座標空間畫一些東西，畫完把遊戲原本的狀態（變形、透明度、save 堆疊）原封不動還回去 */
function withSpace(g, space, fn) {
  const m = g.m, m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3], m4 = m[4], m5 = m[5], al = g.al, sp = g.space, st = g.stack, bn = g.blendName;
  g.stack = []; g._base(space);
  if (bn !== 'normal') g.blend('normal');
  try { fn(g); } catch (e) { reportError(e, 'light'); }
  if (g.blendName !== bn) g.blend(bn);
  g.stack = st; m[0] = m0; m[1] = m1; m[2] = m2; m[3] = m3; m[4] = m4; m[5] = m5; g.al = al; g.space = sp;
}
function drawOccluders() {
  withSpace(G, 'world', (g) => {
    for (const s of Light.shapes) {
      if (s.dead) continue;
      if (s.kind === 'box') g.rect(s.x, s.y, s.w, s.h, WHITE);
      else if (s.kind === 'circle') g.circle(s.x, s.y, s.r, WHITE);
      else if (s.kind === 'poly') g.poly(s.pts, WHITE);
    }
    if (Light.fn) Light.fn(g);
  });
}
Light._ambient = () => {
  const c = toColor(Light.ambient), a = Light._amb, f = Light._flash, k = Light._flashColor;
  a[0] = cR(c) / 255 + (k[0] - cR(c) / 255) * f; a[1] = cG(c) / 255 + (k[1] - cG(c) / 255) * f; a[2] = cB(c) / 255 + (k[2] - cB(c) / 255) * f;
  return a;
};
addSystem({
  name: 'light', order: 72,
  frame(rdt) {
    if (Light._flash > 0) Light._flash = Math.max(0, Light._flash - rdt * (Light._flashDecay || 4) * Math.max(0.2, Light._flash));
    for (let i = Light.lights.length - 1; i >= 0; i--) {
      const l = Light.lights[i], f = l._fade; if (!f) continue;
      f.t += rdt; const k = clamp01(f.t / f.time); l._k = lerp(f.from, f.to, Ease.inOutQuad(k));
      if (k >= 1) { l._fade = null; if (f.remove) l.remove(); }
    }
  },
});

Light._apply = (g) => {
  const r = g.r; Light._vis.length = 0;
  if (!Light.active || !r || r.lost || r.inTarget) return;
  const q = Light.quality(), res = Screen.res, M = Cam.mat, z = Cam.ez || 1, W = r.w, H = r.h, T = Time.real;
  const list = Light._list, vis = Light._vis; let n = 0, haze = false;
  const amb = Light._ambient();
  for (const L of Light.lights) {
    if (L.dead || !L.on) continue;
    if (L.follow) { const f = L.follow; if (f.dead || f.removed) { L.follow = null; } else { L.x = f.x + L.ox; L.y = f.y + L.oy; } }
    let fi = 1;
    if (L.flicker > 0) fi = 1 - L.flicker * lightNoise(T * L.flickerSpeed + L._seed);
    L._fi = fi;
    const I = L.intensity * L._k * fi; if (I <= 0.003) continue;
    let sx, sy; const scl = L.screen ? 1 : z;
    if (L.screen) { sx = L.x; sy = L.y; } else { sx = M[0] * L.x + M[2] * L.y + M[4]; sy = M[1] * L.x + M[3] * L.y + M[5]; }
    const sr = L.r * scl * (1 - L.flicker * 0.06 * (1 - fi) * 4), px = sx * res, py = sy * res, pr = sr * res;
    if (px + pr < 0 || px - pr > W || py + pr < 0 || py - pr > H || pr < 1) continue;
    const o = list[n] || (list[n] = { cone: null, _cone: [0, 0, 0, 0] }); n++;
    const c = L._col;
    o.x = px; o.y = py; o.r = pr; o.cr = (cR(c) / 255) * I * 0.5; o.cg = (cG(c) / 255) * I * 0.5; o.cb = (cB(c) / 255) * I * 0.5;
    let dx = 1, dy = 0;
    if (L.cone != null && L.cone < Math.PI - 0.01) {
      dx = Math.cos(L.dir); dy = Math.sin(L.dir);
      if (!L.screen) { const tx = M[0] * dx + M[2] * dy, ty = M[1] * dx + M[3] * dy, l = Math.hypot(tx, ty) || 1; dx = tx / l; dy = ty / l; }
      const soft = L.soft != null ? L.soft : Math.min(0.32, L.cone * 0.45), cn = o._cone;
      cn[0] = dx; cn[1] = dy; cn[2] = Math.cos(Math.min(Math.PI, L.cone + soft * 0.5)); cn[3] = Math.cos(Math.max(0, L.cone - soft * 0.5)); o.cone = cn;
    } else o.cone = null;
    o.size = L.size * scl * res; o.soak = Light.soak * scl * res; o.sh = L.shadows !== false; o.fall = L.fall;
    o.haze = Math.max(0, L.haze + Light.haze + Light._wHaze); if (o.haze > 0.002) haze = true;
    vis.push({ x: sx, y: sy, r: sr, cr: o.cr * 2, cg: o.cg * 2, cb: o.cb * 2, cone: o.cone ? [dx, dy, o.cone[2], o.cone[3]] : null, fall: L.fall });
  }
  const zl = Light._zl || (Light._zl = []); zl.length = 0;
  for (const Z of Light.zones) {
    if (Z.dead) continue;
    let x0, y0, x1, y1;
    if (Z.screen) { x0 = Z.x * res; y0 = Z.y * res; x1 = (Z.x + Z.w) * res; y1 = (Z.y + Z.h) * res; }
    else { const xs = [Z.x, Z.x + Z.w], ys = [Z.y, Z.y + Z.h]; x0 = y0 = Infinity; x1 = y1 = -Infinity; for (const xx of xs) for (const yy of ys) { const X = (M[0] * xx + M[2] * yy + M[4]) * res, Y = (M[1] * xx + M[3] * yy + M[5]) * res; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); } }
    if (x1 < 0 || y1 < 0 || x0 > W || y0 > H) continue;
    const c = toColor(Z.ambient), k = Light._flash, fc = Light._flashColor;
    zl.push({ x0: Math.max(-1e5, x0), y0: Math.max(-1e5, y0), x1: Math.min(1e5, x1), y1: Math.min(1e5, y1), r: lerp(cR(c) / 255, fc[0], k), g: lerp(cG(c) / 255, fc[1], k), b: lerp(cB(c) / 255, fc[2], k), a: Z.a, soft: Math.max(0.5, Z.soft * (Z.screen ? 1 : z) * res) });
  }
  const dark = amb[0] < 0.999 || amb[1] < 0.999 || amb[2] < 0.999 || zl.length > 0;
  if (n || dark) {
    const occ = Light.shadows && q.mask > 0 && (Light.shapes.length > 0 || !!Light.fn);
    r.lighting({ ambient: amb, zones: zl, lights: list, n, scale: q.scale, mask: q.mask, reach: q.reach || 64, shadows: occ, steps: q.steps, drawOcc: occ ? drawOccluders : null, haze });
  }
  // 光源本身的光點（發光、不受明暗影響）
  let anyGlow = false; for (const L of Light.lights) if (L.glow > 0 && L.on && !L.dead) { anyGlow = true; break; }
  if (anyGlow) {
    for (const space of ['world', 'screen']) withSpace(g, space, (gg) => {
      for (const L of Light.lights) {
        if (!(L.glow > 0) || !L.on || L.dead || (space === 'screen') !== !!L.screen) continue;
        const k = L.glow * L._k * L._fi; if (k <= 0.01) continue;
        const gr = L.glowR != null ? L.glowR : Math.max(6, L.r * 0.1);
        gg.glow(L.x, L.y, gr * (0.85 + 0.15 * L._fi), L._col, { a: Math.min(1, k), core: 0.7 });
        gg.glow(L.x, L.y, gr * 2.6, L._col, { a: Math.min(1, k) * 0.22 });
      }
    });
  }
};

/** 給天氣用：螢幕上某一點（CSS px）被燈照到多少（不算陰影），回傳 0～ */
Light.glint = (sx, sy) => {
  let v = 0;
  for (const l of Light._vis) {
    const dx = sx - l.x, dy = sy - l.y, d2 = dx * dx + dy * dy, r2 = l.r * l.r; if (d2 >= r2) continue;
    const s2 = d2 / r2, w = 1 - s2 * s2; let att = (w * w) / (1 + l.fall * s2);
    if (l.cone) { const d = Math.sqrt(d2) || 1; att *= smoothstep(l.cone[2], l.cone[3], (dx * l.cone[0] + dy * l.cone[1]) / d); }
    v += att * (0.2126 * l.cr + 0.7152 * l.cg + 0.0722 * l.cb);
  }
  return v;
};

/* ---------- 遊戲邏輯用：亮度、視線 ---------- */
function segBox(x0, y0, x1, y1, b) {
  let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0;
  const p = [-dx, dx, -dy, dy], q = [x0 - b.x, b.x + b.w - x0, y0 - b.y, b.y + b.h - y0];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; continue; }
    const t = q[i] / p[i];
    if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}
function segCircle(x0, y0, x1, y1, cx, cy, r) {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1, t = clamp01(((cx - x0) * dx + (cy - y0) * dy) / l2);
  return dist2(x0 + dx * t, y0 + dy * t, cx, cy) < r * r;
}
function inPoly(x, y, p) {
  let ins = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) { const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins; }
  return ins;
}
function segSeg(ax, ay, bx, by, cx, cy, dx, dy) {
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx); if (d === 0) return false;
  const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d, v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}
function shapeHas(s, x, y) {
  if (s.kind === 'box') return x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
  if (s.kind === 'circle') return dist2(x, y, s.x, s.y) <= s.r * s.r;
  return inPoly(x, y, s.pts);
}
/** (x0,y0) 到 (x1,y1) 中間有沒有被擋光的形狀擋住（只看 box/circle/poly，不看 occluders 函式畫的）。端點所在的那塊不算（牆上的火把、貼牆站） */
Light.blocked = (x0, y0, x1, y1) => {
  for (const s of Light.shapes) {
    if (s.dead || shapeHas(s, x0, y0) || shapeHas(s, x1, y1)) continue;
    if (s.kind === 'box') { if (segBox(x0, y0, x1, y1, s)) return true; }
    else if (s.kind === 'circle') { if (segCircle(x0, y0, x1, y1, s.x, s.y, s.r)) return true; }
    else { const p = s.pts; for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) if (segSeg(x0, y0, x1, y1, p[j], p[j + 1], p[i], p[i + 1])) return true; }
  }
  return false;
};
function lightAtt(L, x, y) {
  const dx = x - L.x, dy = y - L.y, d = Math.hypot(dx, dy), s = d / L.r; if (s >= 1) return 0;
  const w = Math.max(0, 1 - s * s * s * s); let att = (w * w) / (1 + L.fall * s * s);
  if (L.cone != null && L.cone < Math.PI - 0.01) {
    const soft = L.soft != null ? L.soft : Math.min(0.32, L.cone * 0.45), ca = d > 1e-3 ? (dx * Math.cos(L.dir) + dy * Math.sin(L.dir)) / d : 1;
    att *= Math.max(smoothstep(Math.cos(Math.min(Math.PI, L.cone + soft * 0.5)), Math.cos(Math.max(0, L.cone - soft * 0.5)), ca), (1 - smoothstep(0, 0.07, s)) * 0.55);
  }
  return att * L.intensity * L._k * L._fi;
}
/** 世界座標 (x, y) 有多亮：0＝全黑、1＝原色、>1＝曝光。o.shadows: false 不檢查遮擋 */
Light.at = (x, y, o = {}) => {
  if (!Light.active) return 1;
  const a = Light._ambient(); let v = 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  for (const Z of Light.zones) {
    if (Z.dead || Z.screen) continue;
    const d = Math.min(x - Z.x, Z.x + Z.w - x, y - Z.y, Z.y + Z.h - y); if (d <= 0) continue;
    v = lerp(v, Color.luma(Z.ambient), smoothstep(0, Math.max(0.001, Z.soft), d) * Z.a);
  }
  for (const L of Light.lights) {
    if (L.dead || !L.on || L.screen) continue;
    const att = lightAtt(L, x, y); if (att <= 0.002) continue;
    if (o.shadows !== false && L.shadows !== false && Light.blocked(x, y, L.x, L.y)) continue;
    v += att * Color.luma(L._col);
  }
  return v;
};
/** 角色投影的方向：最亮的那盞燈的反方向；白天（環境光亮）用太陽 */
Light.shadowDir = (x, y) => {
  const sun = Light.sun; let best = null, bv = 0;
  const amb = Light.active ? Light._ambient() : [1, 1, 1], sunK = Light.active ? 0.2126 * amb[0] + 0.7152 * amb[1] + 0.0722 * amb[2] : 1;
  if (Light.active) for (const L of Light.lights) { if (L.dead || !L.on || L.screen) continue; const v = lightAtt(L, x, y) * Color.luma(L._col); if (v > bv) { bv = v; best = L; } }
  if (best && bv * 1.4 > sunK * 0.6) {
    const d = Math.hypot(x - best.x, y - best.y);
    return { angle: Math.atan2(y - best.y, x - best.x), len: 0.45 + 1.1 * clamp01(d / best.r), k: clamp01(bv * 1.6) };
  }
  return { angle: sun.angle, len: sun.len, k: sunK * (sun.a / 0.4) };
};

/* ---------- 畫圖 API ---------- */
/**
 * 角色的投影（貼在地上的剪影）：o = { angle（不給＝自動）, len（相對身高，預設 0.7）, a（濃度，預設 0.42）, color, s/sx/sy, soft（預設 true：靠腳深、尾巴淡）,
 *   flat（側視遊戲：影子落在地面上、從側面看是扁扁一條，往離燈的方向拖；flatY 扁的程度，預設 0.07） }
 */
Graphics.prototype.castShadow = function (f, x, y, o = {}) {
  if (typeof f === 'string') f = Art.get(f); if (!f.tex) return this;
  let ang = o.angle, len = o.len != null ? o.len : 0.7, a = o.a != null ? o.a : 0.42;
  if (ang == null) { const s = Light.shadowDir(x, y); ang = s.angle; len *= s.len / 0.75; a *= Math.min(1, s.k); }
  if (a <= 0.004 || len <= 0.01) return this;
  const sc = o.s != null ? o.s : 1, Wd = f.w * sc * (o.sx || 1), Ht = f.h * sc * (o.sy || 1), dx = Math.cos(ang), dy = Math.sin(ang);
  const col = o.color || '#000', layers = o.soft === false ? [[1, a]] : [[1, 0], [0.78, 0], [0.56, 0]];
  if (o.soft !== false) { const k = 1 - Math.pow(1 - a, 1 / 3); for (const L of layers) L[1] = k; }
  const fy = o.flatY != null ? o.flatY : 0.07;
  for (const [lk, al] of layers) {
    const la = o.flat ? Wd : -dy * Wd, lb = o.flat ? 0 : dx * Wd, lc = o.flat ? -dx * len * lk * Ht : -dx * len * lk * Ht, ld = o.flat ? -fy * Ht : -dy * len * lk * Ht;
    this._emit(f.tex, la, lb, lc, ld, x - f.ax * la - f.ay * lc, y - f.ax * lb - f.ay * ld, f.u0, f.v0, f.u1, f.v1, this._col(col, al), MODE.silhouette, 0, 0);
  }
  return this;
};
/** 光束：從 (x, y) 往 angle 方向 len 長，寬度 w0 → w1；o = { a, add（預設 1 發光）, end（尾端濃度，預設 0）, color2（尾端顏色） } */
Graphics.prototype.beam = function (x, y, angle, len, w0, w1, color, o) {
  const a = o && o.a != null ? o.a : 1, add = o && o.add != null ? o.add : 1;
  let c0 = this._col(color, a), c1 = this._col(o && o.color2 != null ? o.color2 : color, a * (o && o.end != null ? o.end : 0));
  let dx = Math.cos(angle), dy = Math.sin(angle), hx = x, hy = y, n0 = Math.max(0.01, w0 / 2), n1 = Math.max(0.01, w1 / 2);
  if (n0 > n1) { hx = x + dx * len; hy = y + dy * len; dx = -dx; dy = -dy; let t = n0; n0 = n1; n1 = t; t = c0; c0 = c1; c1 = t; }
  const tx = hx + dx * len, ty = hy + dy * len, nx = -dy, ny = dx, k = n0 / n1, m = this.m;
  const X = (px, py) => m[0] * px + m[2] * py + m[4], Y = (px, py) => m[1] * px + m[3] * py + m[5];
  const ax = hx - nx * n0, ay = hy - ny * n0, bx = tx - nx * n1, by = ty - ny * n1, cx = tx + nx * n1, cy = ty + ny * n1, ex = hx + nx * n0, ey = hy + ny * n0;
  this.r.quadv(null, X(ax, ay), Y(ax, ay), 0, -k, X(bx, by), Y(bx, by), 1, -1, X(cx, cy), Y(cx, cy), 1, 1, X(ex, ey), Y(ex, ey), 0, k, c0, c1, MODE.beam, clamp01(add), k);
  return this;
};

/* ---------- 水面、熱浪（把畫面抓下來扭曲；要畫在被倒映的東西「之後」） ---------- */
/**
 * 水面：x, y, w, h 是水的範圍（世界座標，y＝水面那條線）。
 * o = { mode: 'mirror'（側視：倒映水面上方的東西，預設）| 'flat'（俯視：波光＋水下扭曲）, shape: 'ellipse'（水窪、池塘：橢圓、邊緣柔和）,
 *       color（水色，預設深藍綠）, depth（水色多濃 0～1，預設 0.45）, reflect（倒影多清楚 0～1，預設 0.65）,
 *       ripple（波紋幅度，世界單位，預設 3）, speed（預設 1）, foam（水面亮線 0～1，預設 0.5）, sky（倒影超出畫面時用的顏色） }
 */
Graphics.prototype.water = function (x, y, w, h, o = {}) {
  const m = this.m, X = (px, py) => m[0] * px + m[2] * py + m[4], Y = (px, py) => m[1] * px + m[3] * py + m[5];
  const xs = [X(x, y), X(x + w, y), X(x, y + h), X(x + w, y + h)], ys = [Y(x, y), Y(x + w, y), Y(x, y + h), Y(x + w, y + h)];
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), scale = Math.hypot(m[0], m[1]) || 1;
  if (x1 <= 0 || y1 <= 0 || x0 >= this.r.w || y0 >= this.r.h) return this;
  const mode = o.mode === 'flat' ? 1 : 0, amp = (o.ripple != null ? o.ripple : 3) * scale, c = toColor(o.color || '#123a4a'), sk = toColor(o.sky || '#05070c');
  const src = mode === 0 ? [x0 - amp * 2, y0 - (y1 - y0) - amp * 3, x1 + amp * 2, y1 + amp * 2] : [x0 - amp * 2, y0 - amp * 2, x1 + amp * 2, y1 + amp * 2];
  this.r.grab({ mode, rect: [x0, y0, x1, y1], src, time: Time.t, col: [cR(c) / 255, cG(c) / 255, cB(c) / 255, o.depth != null ? o.depth : 0.45],
    amp, reflect: o.reflect != null ? o.reflect : 0.65, foam: o.foam != null ? o.foam : 0.5, scale, wx: x, wy: y, speed: o.speed != null ? o.speed : 1, sky: [cR(sk) / 255, cG(sk) / 255, cB(sk) / 255], shape: o.shape === 'ellipse' ? 1 : 0 });
  return this;
};
/** 熱浪／扭曲（火堆上方、沙漠、傳送門）：o = { strength（世界單位，預設 4）, speed（預設 1）, shape: 'ellipse' } */
Graphics.prototype.haze = function (x, y, w, h, o = {}) {
  const m = this.m, scale = Math.hypot(m[0], m[1]) || 1, x0 = m[0] * x + m[2] * y + m[4], y0 = m[1] * x + m[3] * y + m[5], x1 = x0 + w * scale, y1 = y0 + h * scale, amp = (o.strength != null ? o.strength : 4) * scale;
  if (x1 <= 0 || y1 <= 0 || x0 >= this.r.w || y0 >= this.r.h) return this;
  this.r.grab({ mode: 2, rect: [x0, y0, x1, y1], src: [x0 - amp, y0 - amp, x1 + amp, y1 + amp], time: Time.t, col: [0, 0, 0, 0], amp, reflect: 0, foam: 0, scale, wx: x, wy: y, speed: o.speed != null ? o.speed : 1, sky: [0, 0, 0], shape: o.shape === 'ellipse' ? 1 : 0 });
  return this;
};
