/* ==========================================================================
   26 天氣：雨、雪、霧、雷雨
     PZ.weather.set('rain')                  'rain' 雨 | 'drizzle' 毛毛雨 | 'storm' 雷雨 | 'snow' 雪 | 'blizzard' 暴風雪 | 'fog' 濃霧 | 'mist' 薄霧 | 'clear' 放晴
     PZ.weather.set('snow', { amount: 0.6, wind: -0.3, time: 4 })      強度、風、幾秒變過去（預設 2 秒）
     PZ.weather.mix({ rain: 0.5, fog: 0.8, lightning: 0.3 })           自己調配方（0～1）
     PZ.weather.wind = 0.4                   風（-1～1：雨絲斜、雪往旁邊飄、霧流動）
     PZ.weather.strike()                     馬上打一道雷（閃光、照亮、雷聲）
     PZ.weather.ground = (x) => y            側視遊戲：雨滴濺在哪條線上；俯視遊戲不用設（濺在畫面裡隨機的地方）
     顏色：PZ.weather.rainColor / snowColor / fogColor / boltColor
   - 霧畫在光影「之前」：會被燈照亮（手電筒照進霧裡有光柱）；雨、雪畫在光影「之後」：在燈下閃亮、黑暗裡淡淡的。
   - 數量跟著畫質（粒子量）自動調；跟著鏡頭有一點視差，不會像貼在螢幕上。
   - 場景切換時清掉（每個場景在 enter 自己設）。
   ========================================================================== */
const WEATHER_PRESETS = {
  clear: {}, rain: { rain: 1, fog: 0.12 }, drizzle: { rain: 0.35, fog: 0.22 }, storm: { rain: 1, fog: 0.26, lightning: 1, wind: 0.45 },
  snow: { snow: 1, fog: 0.16 }, blizzard: { snow: 1, fog: 0.5, wind: 0.85 }, fog: { fog: 1 }, mist: { fog: 0.5 },
};
const Weather = PZ.weather = {
  name: 'clear', rain: 0, snow: 0, fog: 0, lightning: 0, wind: 0,
  to: { rain: 0, snow: 0, fog: 0, lightning: 0 }, windTo: null, rate: 0.5, density: 1,
  rainColor: '#b4c6de', snowColor: '#f4f8ff', fogColor: '#c3ccd8', boltColor: '#b9ccff',
  ground: null, splashes: true,
  drops: [], flakes: [], spl: [], bolts: [], _t: 0, _strikeIn: 3, _env: null, _cx: null, _cy: 0, _splAcc: 0,
};
Weather.set = (name, o = {}) => {
  const p = WEATHER_PRESETS[name]; if (!p) { warnOnce('weather:' + name, '沒有這種天氣：' + name); return Weather; }
  const k = o.amount != null ? o.amount : 1;
  Weather.name = name;
  Weather.mix({ rain: (p.rain || 0) * k, snow: (p.snow || 0) * k, fog: o.fog != null ? o.fog : Math.min(1, (p.fog || 0) * Math.max(k, 0.5)),
    lightning: o.lightning != null ? o.lightning : p.lightning || 0, wind: o.wind != null ? o.wind : p.wind != null ? p.wind : (name === 'clear' ? 0 : undefined) }, o.time);
  PZ.emit('weather', name);
  return Weather;
};
Weather.mix = (o, time = 2) => {
  for (const k of ['rain', 'snow', 'fog', 'lightning']) if (o[k] != null) Weather.to[k] = clamp01(o[k]);
  if (o.wind != null) Weather.windTo = clamp(o.wind, -1, 1);
  if (!(time > 0)) { for (const k in Weather.to) Weather[k] = Weather.to[k]; if (Weather.windTo != null) { Weather.wind = Weather.windTo; Weather.windTo = null; } }
  Weather.rate = 1 / Math.max(0.01, time || 0.01);
  if (Weather.to.lightning > 0 && Weather._strikeIn > 6) Weather._strikeIn = Rand.range(1.5, 4);
  return Weather;
};
Weather.reset = () => {
  Object.assign(Weather, { name: 'clear', rain: 0, snow: 0, fog: 0, lightning: 0, wind: 0, windTo: null, density: 1, ground: null, splashes: true, _env: null, _cx: null, _strikeIn: 3 });
  Object.assign(Weather.to, { rain: 0, snow: 0, fog: 0, lightning: 0 });
  Object.assign(Weather, { rainColor: '#b4c6de', snowColor: '#f4f8ff', fogColor: '#c3ccd8', boltColor: '#b9ccff' });
  Weather.drops.length = 0; Weather.flakes.length = 0; Weather.spl.length = 0; Weather.bolts.length = 0;
  Light._wHaze = 0;
};
Weather.active = () => Weather.rain > 0.002 || Weather.snow > 0.002 || Weather.fog > 0.002 || Weather.bolts.length > 0 || Weather.spl.length > 0 || Weather.drops.length > 0 || Weather.flakes.length > 0;

/* ---------- 雷 ---------- */
function boltPath(x0, y0, x1, y1, depth, disp) {
  let pts = [{ x: x0, y: y0 }, { x: x1, y: y1 }];
  for (let d = 0; d < depth; d++) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], nx = -(b.y - a.y), ny = b.x - a.x, l = Math.hypot(nx, ny) || 1, o = Rand.spread(disp);
      out.push({ x: (a.x + b.x) / 2 + (nx / l) * o, y: (a.y + b.y) / 2 + (ny / l) * o }, b);
    }
    pts = out; disp *= 0.55;
  }
  return pts;
}
/** 打一道雷。o: { x, y（螢幕 CSS px，雷打到哪；不給隨機）, bolt: false 不畫閃電（只閃光）, delay（雷聲延遲秒，不給隨機）, sound: false } */
Weather.strike = (o = {}) => {
  const W = Screen.w, H = Screen.h;
  Weather._env = { t: 0, p: [[0, 1], [0.085, 0.42], [0.165, 0.85]].map(([t, a]) => [t, a * Rand.range(0.75, 1)]) };
  if (o.bolt !== false) {
    const x0 = o.x != null ? o.x + Rand.spread(W * 0.12) : Rand.range(W * 0.12, W * 0.88), x1 = o.x != null ? o.x : x0 + Rand.spread(W * 0.18);
    const y1 = o.y != null ? o.y : Rand.range(H * 0.3, H * 0.62), main = boltPath(x0, -12, x1, y1, 6, (y1 + 12) * 0.2), branches = [];
    for (let k = Rand.int(1, 3); k > 0; k--) {
      const p = main[Rand.int(4, main.length - 8)], a = Math.atan2(y1 + 12, x1 - x0) + Rand.sign() * Rand.range(0.35, 0.9), L = Rand.range(0.12, 0.3) * H;
      branches.push(boltPath(p.x, p.y, p.x + Math.cos(a) * L, p.y + Math.sin(a) * L, 5, L * 0.22));
    }
    Weather.bolts.push({ main, branches, t: 0, life: 0.42 });
    if (Weather.bolts.length > 3) Weather.bolts.shift();
  }
  Fx.flash('#dfe8ff', Light.active ? 0.14 : 0.42, 0.22);
  if (o.sound !== false && Sfx.has('thunder')) {
    const d = o.delay != null ? o.delay : Rand.range(0.2, 1.5);
    PZ.after(d, () => { Sfx.play('thunder', { vol: clamp(1.15 - d * 0.4, 0.35, 1), pitch: Rand.range(0.85, 1.1) }); Cam.shake(Math.max(0, 0.12 - d * 0.06)); }, { real: true });
  }
  PZ.emit('lightning');
};

/* ---------- 霧的貼圖：可以無縫鋪的雜訊（第一次用到才做） ---------- */
let FogCanvas = null;
function fogFrame() {
  if (Art.frames.has('pz.fog') && Art.frames.get('pz.fog').tex) return Art.frames.get('pz.fog');
  const N = 128;
  if (!FogCanvas) {
    FogCanvas = document.createElement('canvas'); FogCanvas.width = FogCanvas.height = N;
    const x = FogCanvas.getContext('2d'), img = x.createImageData(N, N), d = img.data, R = makeRng(41);
    const octs = [[4, 0.52], [8, 0.27], [16, 0.14], [32, 0.07]], grids = octs.map(([P]) => { const a = new Float32Array(P * P); for (let i = 0; i < a.length; i++) a[i] = R.next(); return a; });
    for (let y = 0; y < N; y++) for (let xx = 0; xx < N; xx++) {
      let v = 0;
      for (let k = 0; k < octs.length; k++) {
        const P = octs[k][0], g = grids[k], fx = (xx / N) * P, fy = (y / N) * P, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
        const i0 = (iy % P) * P, i1 = ((iy + 1) % P) * P, j0 = ix % P, j1 = (ix + 1) % P, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        v += octs[k][1] * lerp(lerp(g[i0 + j0], g[i0 + j1], sx), lerp(g[i1 + j0], g[i1 + j1], sx), sy);
      }
      const i = (y * N + xx) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round((0.18 + 0.82 * smoothstep(0.22, 0.85, v)) * 255);
    }
    x.putImageData(img, 0, 0);
  }
  // 自己一張貼圖（不放圖集：鋪的時候邊緣才不會有縫）；取樣範圍內縮半格
  const f = Art.frames.get('pz.fog') || new Frame('pz.fog'); Art.frames.set('pz.fog', f);
  const tex = Gfx.r.texCreate(N, N, { restore: (t) => { if (Gfx.r.texAlloc && Gfx.r.kind !== 'canvas2d') Gfx.r.texAlloc(t); Gfx.r.texUpload(t, FogCanvas, 0, 0); } });
  Gfx.r.texUpload(tex, FogCanvas, 0, 0);
  f.setRect(tex, 0.5, 0.5, N - 1, N - 1); f.w = N; f.h = N; f.ax = 0; f.ay = 0;
  return f;
}

/* ---------- 模擬 ---------- */
addSystem({
  name: 'weather', order: 74,
  update(dt) {
    const W = Weather, st = W.rate * dt;
    for (const k of ['rain', 'snow', 'fog', 'lightning']) W[k] = approach(W[k], W.to[k], st);
    if (W.windTo != null) { W.wind = approach(W.wind, W.windTo, st * 1.2); if (W.wind === W.windTo) W.windTo = null; }
    W._t += dt;
    Light._wHaze = W.fog * 0.13 + W.rain * 0.06 + W.snow * 0.07;
    if (!Weather.active()) { W._cx = null; return; }
    const SW = Screen.w, SH = Screen.h, area = SW * SH, Q = Quality.cur.particles * W.density;
    // 鏡頭視差：近的雨滴跟著世界走多一點
    let px = 0, py = 0;
    if (W._cx != null) { px = (Cam.x - W._cx) * (Cam.ez || 1); py = (Cam.y - W._cy) * (Cam.ez || 1); if (Math.abs(px) > SW || Math.abs(py) > SH) px = py = 0; }
    W._cx = Cam.x; W._cy = Cam.y;
    // 雨
    const nR = Math.round(W.rain * Math.min(520, area / 2100) * Q), D = W.drops, wind = W.wind;
    while (D.length < nR) D.push({ x: Rand.range(-60, SW + 60), y: Rand.range(-SH * 0.6, -10), z: Rand.range(0.3, 1), seed: Rand.next() });
    for (let i = D.length - 1; i >= 0; i--) {
      const d = D[i], sp = 650 + 950 * d.z;
      d.x += (wind * 430 * d.z) * dt - px * (0.3 + 0.7 * d.z); d.y += sp * dt - py * (0.3 + 0.7 * d.z);
      if (d.y > SH + 40 || d.x < -120 || d.x > SW + 120) {
        if (i >= nR) { D.splice(i, 1); continue; }
        d.z = Rand.range(0.3, 1); d.y = Rand.range(-SH * 0.25, -12); d.x = Rand.range(-60, SW + 60) - wind * 430 * d.z * (SH / (650 + 950 * d.z)) * 0.5;
      }
    }
    // 雪
    const nS = Math.round(W.snow * Math.min(420, area / 2500) * Q), Fl = W.flakes;
    while (Fl.length < nS) Fl.push({ x: Rand.range(-20, SW + 20), y: Rand.range(-SH * 0.5, -6), z: Rand.range(0.25, 1), ph: Rand.angle(), f: Rand.range(0.6, 1.6), amp: Rand.range(14, 40) });
    for (let i = Fl.length - 1; i >= 0; i--) {
      const f = Fl[i];
      f.x += (wind * 140 * f.z + Math.cos(W._t * f.f + f.ph) * f.amp * f.z) * dt - px * (0.25 + 0.75 * f.z); f.y += (26 + 78 * f.z) * dt - py * (0.25 + 0.75 * f.z);
      if (f.x < -30) f.x += SW + 60; else if (f.x > SW + 30) f.x -= SW + 60;
      if (f.y > SH + 20) { if (i >= nS) { Fl.splice(i, 1); continue; } f.y = Rand.range(-40, -6); f.x = Rand.range(-20, SW + 20); f.z = Rand.range(0.25, 1); }
    }
    // 水花（世界座標）
    const S = W.spl;
    for (let i = S.length - 1; i >= 0; i--) { S[i].t += dt; if (S[i].t >= S[i].life) S.splice(i, 1); }
    if (W.splashes && W.rain > 0.02) {
      W._splAcc += W.rain * 48 * (area / 360000) * Q * dt;
      const v = Cam.view;
      while (W._splAcc >= 1 && S.length < 160) {
        W._splAcc -= 1;
        const x = v.x + Rand.next() * v.w; let y = v.y + Rand.next() * v.h;
        if (W.ground) { y = W.ground(x); if (y == null || !(y >= v.y - 20 && y <= v.y + v.h + 20)) continue; }
        S.push({ x, y, t: 0, life: Rand.range(0.24, 0.38), s: Rand.range(0.6, 1.25) / Math.max(0.35, Math.min(2.5, Cam.ez || 1)) });
      }
      if (W._splAcc > 4) W._splAcc = 0;
    }
    // 雷
    if (W.lightning > 0.03) { W._strikeIn -= dt; if (W._strikeIn <= 0) { Weather.strike(); W._strikeIn = Rand.range(2.5, 9) / Math.max(0.3, W.lightning); } }
  },
  frame(rdt) {
    const W = Weather;
    for (let i = W.bolts.length - 1; i >= 0; i--) { const b = W.bolts[i]; b.t += rdt; if (b.t >= b.life) W.bolts.splice(i, 1); }
    const e = W._env;
    if (e) {
      e.t += rdt; let v = 0;
      for (const [t0, a] of e.p) if (e.t >= t0) v += a * Math.exp(-(e.t - t0) * 16);
      Light._flash = Math.max(Light._flash, Math.min(1, v * 0.85) * Settings.flashScale()); Light._flashDecay = 6;
      W._envV = v; if (e.t > 1.2) { W._env = null; W._envV = 0; }
    }
  },
});

/* ---------- 畫 ---------- */
/** 霧：光影之前（會被燈照亮） */
Weather._drawUnder = (g) => {
  if (Weather.fog < 0.004) return;
  const f = fogFrame(); if (!f || !f.tex) return;
  withSpace(g, 'world', (gg) => {
    const v = Cam.view, t = Weather._t, w = Weather.wind, pad = 80, a = Weather.fog;
    const x = v.x - pad, y = v.y - pad, W = v.w + pad * 2, H = v.h + pad * 2;
    gg.rect(x, y, W, H, Weather.fogColor, { a: a * 0.12 });
    gg.tile(f, x, y, W, H, { s: 6, ox: -t * (9 + w * 70), oy: -t * 3, a: a * 0.27, color: Weather.fogColor });
    gg.tile(f, x, y, W, H, { s: 3.6, ox: -t * (16 + w * 110) + 300, oy: t * 2.5 + 170, a: a * 0.17, color: Weather.fogColor });
  });
};
/** 雨、雪、水花、閃電：光影之後 */
Weather._drawOver = (g) => {
  const W = Weather;
  if (!W.drops.length && !W.flakes.length && !W.spl.length && !W.bolts.length) return;
  const lit = Light.active, amb = lit ? Light._ambient() : null, e = lit ? clamp(0.16 + (0.2126 * amb[0] + 0.7152 * amb[1] + 0.0722 * amb[2]), 0.16, 1.15) : 1;
  const glint = lit && Light._vis.length > 0;
  if (W.spl.length) withSpace(g, 'world', (gg) => {
    const col = toColor(W.rainColor);
    for (const s of W.spl) {
      const k = s.t / s.life, r = (2 + 11 * Ease.outQuad(k)) * s.s, al = (1 - k) * 0.55 * Math.min(1, e + (glint ? Light.glint(Cam.toScreenX(s.x, s.y), Cam.toScreenY(s.x, s.y)) * 1.5 : 0));
      if (al < 0.01) continue;
      gg.save(); gg.translate(s.x, s.y); gg.scale(1, 0.38); gg.ring(0, 0, r, 1.2 * s.s, col, { a: al }); gg.restore();
      const hy = (16 * k - 22 * k * k) * s.s * 1.4, hx = 6 * k * s.s;
      if (hy > 0) { gg.circle(s.x - hx, s.y - hy, 0.9 * s.s, col, { a: al }); gg.circle(s.x + hx * 0.8, s.y - hy * 0.85, 0.8 * s.s, col, { a: al }); }
    }
  });
  if (W.drops.length || W.flakes.length || W.bolts.length) withSpace(g, 'screen', (gg) => {
    if (W.drops.length) {
      const col = toColor(W.rainColor), wind = W.wind;
      for (const d of W.drops) {
        const sp = 650 + 950 * d.z, vx = wind * 430 * d.z, l = Math.hypot(vx, sp), len = (9 + 24 * d.z) * (0.7 + 0.3 * W.rain);
        let b = e; if (glint) b = Math.min(1.6, e + Light.glint(d.x, d.y) * 1.6);
        const al = (0.1 + 0.34 * d.z) * b * Math.min(1, W.rain * 3);
        if (al < 0.012) continue;
        gg.line(d.x, d.y, d.x - (vx / l) * len, d.y - (sp / l) * len, 0.8 + d.z * 1.1, col, { a: Math.min(0.85, al), add: b > 1 ? 0.5 : 0 });
      }
    }
    if (W.flakes.length) {
      const col = toColor(W.snowColor);
      for (const f of W.flakes) {
        let b = e; if (glint) b = Math.min(1.5, e + Light.glint(f.x, f.y) * 1.4);
        const r = 1 + f.z * 2.8, al = (0.4 + 0.5 * f.z) * b * Math.min(1, W.snow * 3);
        if (al < 0.015) continue;
        if (f.z > 0.82) gg.glow(f.x, f.y, r * 2.6, col, { a: al * 0.55, add: 0.35 });
        else gg.circle(f.x, f.y, r, col, { a: Math.min(1, al) });
      }
    }
    for (const bo of W.bolts) {
      const k = bo.t / bo.life, v = (1 - k) * (0.55 + 0.45 * (Math.sin(bo.t * 70) > -0.3 ? 1 : 0.2));
      const seg = (pts, w) => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; gg.line(a.x, a.y, b.x, b.y, w * 5, W.boltColor, { a: 0.14 * v, add: 1 }); gg.line(a.x, a.y, b.x, b.y, w, '#fff', { a: 0.95 * v, add: 1 }); } };
      seg(bo.main, 2.4); for (const br of bo.branches) seg(br, 1.3);
    }
  });
};
