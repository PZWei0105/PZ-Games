// 煙火：一個大粒子池（活著的永遠排在前面，只上傳用到的那段），十多種花形、拖尾、閃爍、爆裂、分裂、文字；
// 炸開時照亮地面與天空，留下會被後面的煙火照亮的煙
import * as THREE from 'three';
import { glowMaterial, U } from './glow.js';
import { rnd, pick, hsv, TAU, clamp } from './util.js';

export const SHELLS = [
  { id: 'chrys', name: '菊花', en: 'CHRYSANTHEMUM' },
  { id: 'peony', name: '牡丹', en: 'PEONY' },
  { id: 'willow', name: '垂柳', en: 'WILLOW' },
  { id: 'kamuro', name: '錦冠', en: 'KAMURO' },
  { id: 'palm', name: '椰林', en: 'PALM' },
  { id: 'ring', name: '光環', en: 'RING' },
  { id: 'heart', name: '愛心', en: 'HEART' },
  { id: 'star', name: '星星', en: 'STAR' },
  { id: 'saturn', name: '土星', en: 'SATURN' },
  { id: 'smile', name: '笑臉', en: 'SMILE' },
  { id: 'crossette', name: '十字分裂', en: 'CROSSETTE' },
  { id: 'crackle', name: '爆米花', en: 'CRACKLE' },
  { id: 'strobe', name: '閃光', en: 'STROBE' },
  { id: 'multi', name: '千輪', en: 'MULTI-BREAK' },
  { id: 'text', name: '文字', en: 'TEXT' },
];
export const COLORS = [
  { id: 'random', name: '隨機' },
  { id: 'rainbow', name: '彩虹' },
  { id: 'red', name: '紅', c: [1, 0.1, 0.07] },
  { id: 'gold', name: '金', c: [1, 0.58, 0.16] },
  { id: 'silver', name: '銀', c: [0.86, 0.9, 1] },
  { id: 'blue', name: '藍', c: [0.16, 0.38, 1] },
  { id: 'cyan', name: '青', c: [0.15, 0.92, 1] },
  { id: 'green', name: '綠', c: [0.22, 1, 0.3] },
  { id: 'purple', name: '紫', c: [0.68, 0.22, 1] },
  { id: 'pink', name: '粉', c: [1, 0.28, 0.66] },
];
const CMAP = Object.fromEntries(COLORS.filter((c) => c.c).map((c) => [c.id, c.c]));
const PAL = ['red', 'gold', 'silver', 'blue', 'cyan', 'green', 'purple', 'pink'];
const GOLD = [1, 0.55, 0.15];
const VS = 1.45, SZ = 1.7; // 煙火整體放大（速度＝炸開的半徑、火星大小）
const GR = 30; // 火箭的「重力」：比真實快，點了不用等太久

const F_STROBE = 1, F_CRACKLE = 2, F_GLITTER = 4, F_ROCKET = 8, F_EMBER = 16, F_SPLIT = 32;

// 方向：球面均勻分布
function sphereDir(i, n, out) {
  const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996323;
  out[0] = Math.cos(a) * r; out[1] = y; out[2] = Math.sin(a) * r;
  return out;
}

// 文字 → 點陣
const textCache = new Map();
function textPoints(str, maxPts) {
  const key = str + '|' + maxPts;
  if (textCache.has(key)) return textCache.get(key);
  const cv = document.createElement('canvas'), g = cv.getContext('2d');
  const fs = 64; g.font = `900 ${fs}px "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif`;
  const w = Math.ceil(g.measureText(str).width) + 16, h = fs + 24;
  cv.width = w; cv.height = h;
  g.font = `900 ${fs}px "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif`; g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(str, 8, h / 2);
  const d = g.getImageData(0, 0, w, h).data;
  let step = 2, pts;
  for (;;) {
    pts = [];
    for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (d[(y * w + x) * 4 + 3] > 140) pts.push([(x - w / 2) / w, -(y - h / 2) / w]);
    if (pts.length <= maxPts || step > 8) break;
    step++;
  }
  const res = { pts, aspect: h / w };
  textCache.set(key, res);
  return res;
}

export class Fireworks {
  constructor(scene, q, sound) {
    this.q = q; this.sound = sound;
    const M = this.M = 40000;
    const F = () => new Float32Array(M);
    this.a = { px: F(), py: F(), pz: F(), vx: F(), vy: F(), vz: F(), cr: F(), cg: F(), cb: F(), dr: F(), dg: F(), db: F(), tr: F(), tg: F(), tb: F(), age: F(), life: F(), drag: F(), grav: F(), size: F(), trail: F(), tacc: F(), ph: F(), split: F() };
    this.flags = new Uint8Array(M); this.shell = new Int32Array(M);
    this.keys = Object.keys(this.a);
    this.n = 0;
    this.shells = new Map(); this.shellId = 1;
    const g = this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(M * 3); this.col = new Float32Array(M * 3); this.sz = new Float32Array(M);
    const mk = (arr, k) => { const at = new THREE.BufferAttribute(arr, k); at.setUsage(THREE.DynamicDrawUsage); return at; };
    g.setAttribute('position', mk(this.pos, 3)); g.setAttribute('color', mk(this.col, 3)); g.setAttribute('size', mk(this.sz, 1));
    g.setDrawRange(0, 0);
    this.points = new THREE.Points(g, glowMaterial({ core: 1.15 }));
    this.points.frustumCulled = false; this.points.renderOrder = 5;
    this.refl = new THREE.Points(g, glowMaterial({ reflect: true, core: 1.0 }));
    this.refl.frustumCulled = false;
    scene.add(this.points, this.refl);
    // 煙
    this.smoke = new Smoke(scene, q);
    // 閃光：照亮地面的兩盞燈＋天空
    this.flashes = [];
    this.lights = [];
    const nl = q.tier === 'low' ? 1 : 2;
    for (let i = 0; i < nl; i++) { const l = new THREE.PointLight('#ffffff', 0, 0, 1); l.position.set(0, 80, -120); scene.add(l); this.lights.push({ l, I: 0, c: new THREE.Color(), p: new THREE.Vector3(), t: 9 }); }
    this.li = 0;
    this.camR = new THREE.Vector3(1, 0, 0); this.camU = new THREE.Vector3(0, 1, 0); this.camF = new THREE.Vector3(0, 0, -1); this.camP = new THREE.Vector3();
    this.tmp = [0, 0, 0];
    this.pending = [];
    this.text = '火樹銀花';
    this.stats = { bursts: 0 };
    this.onBurst = null;
  }

  get cap() { return this.q.fw.max; }

  spawn(o) {
    if (this.n >= this.cap) return -1;
    const i = this.n++, a = this.a;
    a.px[i] = o.x; a.py[i] = o.y; a.pz[i] = o.z; a.vx[i] = o.vx; a.vy[i] = o.vy; a.vz[i] = o.vz;
    a.cr[i] = o.c[0]; a.cg[i] = o.c[1]; a.cb[i] = o.c[2];
    const d = o.c2 || o.c; a.dr[i] = d[0]; a.dg[i] = d[1]; a.db[i] = d[2];
    const t = o.tc || GOLD; a.tr[i] = t[0]; a.tg[i] = t[1]; a.tb[i] = t[2];
    a.age[i] = 0; a.life[i] = o.life; a.drag[i] = o.drag || 0; a.grav[i] = o.grav || 0; a.size[i] = o.size || 1;
    a.trail[i] = (o.trail || 0) * this.q.fw.trail; a.tacc[i] = Math.random(); a.ph[i] = Math.random(); a.split[i] = o.split || 0;
    this.flags[i] = o.f || 0; this.shell[i] = o.shell || 0;
    return i;
  }

  kill(i) {
    const j = --this.n;
    if (i !== j) { for (const k of this.keys) this.a[k][i] = this.a[k][j]; this.flags[i] = this.flags[j]; this.shell[i] = this.shell[j]; }
  }

  colorOf(spec) {
    if (spec === 'random' || !spec) spec = Math.random() < 0.12 ? 'rainbow' : Math.random() < 0.18 ? 'duo' : pick(PAL);
    if (spec === 'rainbow') return { rainbow: true, base: hsv(Math.random(), 0.9, 1) };
    if (spec === 'duo') { const a = pick(PAL); let b = pick(PAL); while (b === a) b = pick(PAL); return { duo: [CMAP[a], CMAP[b]], base: CMAP[a] }; }
    return { base: CMAP[spec] || GOLD };
  }

  // 從地面發射：target 是要炸開的位置
  launch(type, color, target, o = {}) {
    const pad = o.pad || { x: target.x + rnd(-5, 5), z: target.z + rnd(-5, 5) };
    const inLake = ((pad.x - U.uLake.value.x) / U.uLake.value.z) ** 2 + ((pad.z - U.uLake.value.y) / U.uLake.value.w) ** 2 < 1;
    const y0 = inLake ? 0.4 : 0.6;
    const h = Math.max(20, target.y - y0), vy = Math.sqrt(2 * GR * h), T = vy / GR;
    const id = this.shellId++;
    this.shells.set(id, { type, color, scale: o.scale || rnd(0.85, 1.2), text: o.text });
    this.spawn({ x: pad.x, y: y0, z: pad.z, vx: (target.x - pad.x) / T, vy, vz: (target.z - pad.z) / T, c: [2.4, 1.5, 0.7], life: T, grav: GR, size: 0.9, trail: type === 'palm' ? 110 : 55, tc: [1.1, 0.6, 0.25], f: F_ROCKET, shell: id });
    this.sound && this.sound.launch(this.dist(pad.x, y0, pad.z), type === 'palm' || Math.random() < 0.35);
    return T;
  }
  static flight(h) { return Math.sqrt((2 * Math.max(20, h)) / GR); }
  dist(x, y, z) { return Math.hypot(x - this.camP.x, y - this.camP.y, z - this.camP.z); }

  // 炸開
  burst(type, colorSpec, x, y, z, scale = 1, text) {
    const k = this.q.fw.k, col = this.colorOf(colorSpec), id = this.shellId++;
    const S = scale;
    const tmp = this.tmp;
    const cAt = (i, n) => {
      if (col.rainbow) return hsv(i / n + Math.random() * 0.04, 0.85, 1).map((v) => v * 3.4);
      if (col.duo) return col.duo[(i * 7919) % n < n / 2 ? 0 : 1].map((v) => v * 3.3);
      return col.base.map((v) => v * 3.3);
    };
    const star = (dx, dy, dz, v, o) => { v *= VS; return this.spawn({ x, y, z, vx: dx * v, vy: dy * v, vz: dz * v, shell: id, ...o, size: (o.size || 1) * SZ }); };
    const sphere = (n, v, o, jitter = 0.04) => {
      n = Math.max(8, Math.round(n * k));
      for (let i = 0; i < n; i++) {
        sphereDir(i, n, tmp);
        const vv = v * (1 + (Math.random() - 0.5) * jitter * 2);
        const c = o.c || cAt(i, n);
        star(tmp[0], tmp[1], tmp[2], vv, { ...o, c, c2: o.c2 || c.map((q) => q * 0.35), life: o.life * rnd(0.85, 1.12) });
      }
    };
    const R = this.camR, Uu = this.camU;
    const shape = (pts, radius, o) => {
      const drag = o.drag;
      pts.forEach(([u, v], i) => {
        const rr = radius * VS, dx = (R.x * u + Uu.x * v) * rr, dy = (R.y * u + Uu.y * v) * rr, dz = (R.z * u + Uu.z * v) * rr;
        const c = o.c || cAt(i, pts.length);
        this.spawn({ x, y, z, vx: dx * drag, vy: dy * drag, vz: dz * drag, c, c2: o.c2 || c.map((q) => q * 0.4), life: o.life * rnd(0.95, 1.05), drag, grav: o.grav, size: o.size * SZ, trail: o.trail || 0, tc: o.tc, f: o.f || 0, shell: id });
      });
    };
    let flashI = 1, smokeN = 10, boom = 1;
    const base = col.base;
    switch (type) {
      case 'peony': sphere(200 * S, 40 * S, { life: 2.0, drag: 1.6, grav: 4, size: 1.05, c2: null }); break;
      case 'chrys': sphere(170 * S, 42 * S, { life: 2.1, drag: 1.6, grav: 4, size: 0.9, trail: 34, tc: base.map((v) => v * 0.9 + 0.2), c2: GOLD.map((v) => v * 2.2) }); break;
      case 'willow': sphere(130 * S, 30 * S, { life: 4.6, drag: 1.25, grav: 6.5, size: 0.85, trail: 46, c: GOLD.map((v) => v * 2.6), c2: GOLD.map((v) => v * 1.2), tc: [1, 0.5, 0.12], f: F_GLITTER }); boom = 0.9; break;
      case 'kamuro': sphere(240 * S, 36 * S, { life: 5.2, drag: 1.35, grav: 5, size: 0.8, trail: 30, c: [3.2, 2.2, 1.1], c2: [1.6, 0.9, 0.3], tc: [1.2, 0.85, 0.5], f: F_GLITTER }); flashI = 1.5; smokeN = 16; boom = 1.4; break;
      case 'palm': {
        const n = Math.round(11 * S);
        for (let i = 0; i < n; i++) { const a = (i / n) * TAU, el = rnd(0.15, 0.75); const c = cAt(i, n); star(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el), 38 * S, { c, c2: GOLD.map((v) => v * 1.4), life: 2.8, drag: 1.0, grav: 9, size: 1.9, trail: 130, tc: [1.1, 0.6, 0.2] }); }
        sphere(30, 10, { life: 0.8, drag: 2, grav: 3, size: 0.8, c: [3, 2.4, 1.6] });
        break;
      }
      case 'ring': {
        const n = Math.round(110 * S * k), tilt = rnd(-0.7, 0.7), spin = rnd(0, TAU);
        const ax = new THREE.Vector3().copy(R).applyAxisAngle(this.camF, spin), ay = new THREE.Vector3().copy(Uu).applyAxisAngle(this.camF, spin).applyAxisAngle(ax, tilt);
        for (let i = 0; i < n; i++) { const a = (i / n) * TAU, c = cAt(i, n); const dx = ax.x * Math.cos(a) + ay.x * Math.sin(a), dy = ax.y * Math.cos(a) + ay.y * Math.sin(a), dz = ax.z * Math.cos(a) + ay.z * Math.sin(a); star(dx, dy, dz, 40 * S, { c, c2: c.map((q) => q * 0.4), life: 2.0, drag: 1.7, grav: 2.5, size: 1.0 }); }
        sphere(40 * S, 12 * S, { life: 1.6, drag: 1.8, grav: 3, size: 0.9, c: [3, 3, 3.2] });
        break;
      }
      case 'heart': {
        const pts = [], n = Math.round(120 * k);
        for (let i = 0; i < n; i++) { const t = (i / n) * TAU; pts.push([(16 * Math.sin(t) ** 3) / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]); }
        const c = colorSpec === 'random' ? [3.4, 0.5, 1.4] : null;
        shape(pts, 24 * S, { drag: 2.4, life: 2.8, grav: 1.4, size: 1.05, c });
        break;
      }
      case 'star': {
        const pts = [], n = Math.round(130 * k), V = [];
        for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 0.42 : 1; V.push([Math.cos(a) * r, Math.sin(a) * r]); }
        for (let i = 0; i < n; i++) { const f = (i / n) * 10, e = Math.floor(f), t = f - e, A = V[e], B = V[(e + 1) % 10]; pts.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
        shape(pts, 25 * S, { drag: 2.4, life: 2.7, grav: 1.4, size: 1.0 });
        break;
      }
      case 'smile': {
        const pts = [], n = Math.round(90 * k);
        for (let i = 0; i < n; i++) { const a = (i / n) * TAU; pts.push([Math.cos(a), Math.sin(a)]); }
        for (let i = 0; i < 28 * k; i++) { const a = Math.PI * (1.15 + (i / (28 * k)) * 0.7); pts.push([Math.cos(a) * 0.6, Math.sin(a) * 0.6 + 0.02]); }
        for (const ex of [-0.35, 0.35]) for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; pts.push([ex + Math.cos(a) * 0.09, 0.3 + Math.sin(a) * 0.12]); }
        shape(pts, 22 * S, { drag: 2.4, life: 2.8, grav: 1.2, size: 1.0, c: colorSpec === 'random' ? [3.4, 2.6, 0.4] : null });
        break;
      }
      case 'saturn': {
        const c1 = cAt(0, 2), c2 = this.colorOf('random').base.map((v) => v * 3.3);
        sphere(90 * S, 20 * S, { life: 2.2, drag: 1.8, grav: 2.5, size: 1.0, c: c1 });
        const n = Math.round(120 * S * k), tilt = rnd(0.25, 0.55);
        const ax = new THREE.Vector3().copy(R), ay = new THREE.Vector3().crossVectors(R, Uu).normalize().applyAxisAngle(R, -tilt);
        for (let i = 0; i < n; i++) { const a = (i / n) * TAU; star(ax.x * Math.cos(a) + ay.x * Math.sin(a), ax.y * Math.cos(a) + ay.y * Math.sin(a), ax.z * Math.cos(a) + ay.z * Math.sin(a), 46 * S, { c: c2, c2: c2.map((q) => q * 0.4), life: 2.2, drag: 1.6, grav: 2, size: 0.9 }); }
        break;
      }
      case 'crossette': sphere(14 * S, 32 * S, { life: 1.0, drag: 1.3, grav: 4, size: 1.3, trail: 70, tc: [1, 0.7, 0.3], f: F_SPLIT, split: 0.95 }, 0.1); boom = 1.1; break;
      case 'crackle': sphere(150 * S, 36 * S, { life: 1.5, drag: 1.6, grav: 5, size: 0.75, c: GOLD.map((v) => v * 2.4), c2: GOLD.map((v) => v * 1.6), trail: 20, tc: [1, 0.6, 0.25], f: F_CRACKLE }); this.sound && this.sound.crackle(this.dist(x, y, z), 1.5, Math.min(60, Math.round(150 * S * k * 0.35))); break;
      case 'strobe': sphere(170 * S, 34 * S, { life: 3.4, drag: 1.9, grav: 3, size: 0.9, c: [3.2, 3.3, 3.6], c2: [2.6, 2.7, 3.0], f: F_STROBE }); break;
      case 'multi': {
        sphere(40, 14, { life: 0.9, drag: 2, grav: 3, size: 0.9, c: [3.2, 2.6, 1.6] });
        for (let i = 0; i < 7; i++) this.pending.push({ t: 0.25 + i * 0.12 + Math.random() * 0.25, fn: () => this.burst('mini', 'random', x + rnd(-22, 22) * S, y + rnd(-16, 16) * S, z + rnd(-22, 22) * S, 0.5) });
        smokeN = 6; boom = 0.8;
        break;
      }
      case 'mini': sphere(60, 18, { life: 1.1, drag: 1.8, grav: 3, size: 0.85 }); flashI = 0.45; smokeN = 2; boom = 0.45; break;
      case 'text': {
        const { pts } = textPoints(text || this.text || '火樹銀花', Math.round(420 * k + 80));
        const c = colorSpec === 'random' ? (Math.random() < 0.5 ? [3.4, 2.4, 1.0] : null) : null;
        shape(pts, 78 * S, { drag: 3.0, life: 3.6, grav: 0.55, size: 0.95, c, c2: [2.2, 1.2, 0.3] });
        sphere(30, 8, { life: 0.8, drag: 2, grav: 2, size: 0.8, c: [3, 3, 3] });
        flashI = 1.2;
        break;
      }
      default: sphere(150, 36, { life: 2, drag: 1.6, grav: 4, size: 1 });
    }
    this.stats.bursts++;
    // 照亮
    const fc = new THREE.Color(base[0], base[1], base[2]);
    if (col.rainbow || type === 'kamuro' || type === 'willow' || type === 'crackle') fc.setRGB(1, 0.7, 0.4);
    this.flash(x, y, z, fc, flashI * S);
    this.smoke.puff(x, y, z, smokeN * S, 24 * S);
    this.sound && this.sound.boom(this.dist(x, y, z), boom * S, type);
    this.onBurst && this.onBurst(type, x, y, z);
  }

  flash(x, y, z, c, I) {
    const L = this.lights[this.li++ % this.lights.length];
    L.p.set(x, y, z); L.c.copy(c); L.I = I; L.t = 0;
    L.l.position.set(x, y, z); L.l.color.copy(c);
    this.flashes.push({ x, y, z, c: c.clone(), I, t: 0 });
    if (this.flashes.length > 8) this.flashes.shift();
  }

  update(dt) {
    const a = this.a, F = this.flags, pos = this.pos, col = this.col, sz = this.sz;
    // 延遲觸發的子彈
    for (let i = this.pending.length - 1; i >= 0; i--) { const p = this.pending[i]; p.t -= dt; if (p.t <= 0) { this.pending.splice(i, 1); p.fn(); } }
    let i = 0;
    while (i < this.n) {
      a.age[i] += dt;
      const f = F[i];
      if (a.age[i] >= a.life[i]) {
        if (f & F_ROCKET) {
          const sid = this.shell[i], s = this.shells.get(sid); const x = a.px[i], y = a.py[i], z = a.pz[i];
          this.kill(i);
          if (s) { this.shells.delete(sid); this.burst(s.type, s.color, x, y, z, s.scale, s.text); }
          continue;
        }
        if (f & F_SPLIT) {
          const x = a.px[i], y = a.py[i], z = a.pz[i], vx = a.vx[i], vy = a.vy[i], vz = a.vz[i], c = [a.cr[i], a.cg[i], a.cb[i]];
          this.kill(i);
          // 垂直於原本方向的四顆
          const d = new THREE.Vector3(vx, vy, vz).normalize(), u = new THREE.Vector3(0, 1, 0).cross(d).normalize(), w = new THREE.Vector3().crossVectors(d, u);
          for (let k = 0; k < 4; k++) { const ang = (k / 4) * TAU + Math.random() * 0.3, dx = u.x * Math.cos(ang) + w.x * Math.sin(ang), dy = u.y * Math.cos(ang) + w.y * Math.sin(ang), dz = u.z * Math.cos(ang) + w.z * Math.sin(ang); this.spawn({ x, y, z, vx: dx * 30 + vx * 0.3, vy: dy * 30 + vy * 0.3, vz: dz * 30 + vz * 0.3, c: [3.2, 2.2, 0.9], c2: [2, 0.8, 0.2], life: 1.2, drag: 1.4, grav: 6, size: 1.5, trail: 50, tc: [1, 0.6, 0.2] }); }
          this.sound && this.sound.pop(this.dist(x, y, z));
          continue;
        }
        if (f & F_CRACKLE && Math.random() < 0.55) {
          const x = a.px[i], y = a.py[i], z = a.pz[i];
          this.kill(i);
          for (let k = 0; k < 3; k++) this.spawn({ x: x + rnd(-0.6, 0.6), y: y + rnd(-0.6, 0.6), z: z + rnd(-0.6, 0.6), vx: rnd(-6, 6), vy: rnd(-6, 6), vz: rnd(-6, 6), c: [5, 4.6, 4], life: rnd(0.04, 0.12), drag: 3, size: 1.7 });
          continue;
        }
        this.kill(i);
        continue;
      }
      // 物理
      const dk = Math.max(0, 1 - a.drag[i] * dt);
      a.vx[i] *= dk; a.vy[i] = a.vy[i] * dk - a.grav[i] * dt; a.vz[i] *= dk;
      a.px[i] += a.vx[i] * dt; a.py[i] += a.vy[i] * dt; a.pz[i] += a.vz[i] * dt;
      // 拖尾
      if (a.trail[i] > 0) {
        a.tacc[i] += a.trail[i] * dt;
        const k = this.n;
        while (a.tacc[i] >= 1) {
          a.tacc[i] -= 1;
          if (this.n >= this.cap) { a.tacc[i] = 0; break; }
          const rocket = f & F_ROCKET, gl = f & F_GLITTER;
          const tl = rocket ? rnd(0.3, 0.7) : gl ? rnd(0.9, 1.8) : rnd(0.35, 0.8);
          const j = this.spawn({ x: a.px[i] + rnd(-0.15, 0.15), y: a.py[i] + rnd(-0.15, 0.15), z: a.pz[i] + rnd(-0.15, 0.15), vx: a.vx[i] * 0.08 + rnd(-1, 1), vy: a.vy[i] * 0.08 + rnd(-1, 1) - (rocket ? 2 : 0), vz: a.vz[i] * 0.08 + rnd(-1, 1), c: [a.tr[i] * 2.0, a.tg[i] * 2.0, a.tb[i] * 2.0], c2: [a.tr[i] * 0.5, a.tg[i] * 0.3, a.tb[i] * 0.15], life: tl, drag: 2.5, grav: gl ? 3.5 : 2.2, size: rocket ? 0.85 : gl ? 0.8 : 0.85, f: F_EMBER | (gl ? F_GLITTER : 0) });
          if (j < 0) break;
        }
        void k;
      }
      // 顏色與亮度
      const age = a.age[i], life = a.life[i], t = age / life;
      let br;
      if (f & F_ROCKET) br = 0.8 + Math.random() * 0.4;
      else {
        br = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3; br *= br;
        if (t > 0.55 && !(f & F_EMBER)) br *= 0.65 + Math.random() * 0.35;
        if (f & F_STROBE) br *= ((age * 9 + a.ph[i]) % 1) < 0.38 ? 1.5 : 0.04;
        if (f & F_GLITTER) br *= Math.random() < 0.5 ? 1.5 : 0.35;
      }
      const hot = f & (F_EMBER | F_ROCKET) ? 0 : Math.max(0, 1 - age / 0.12) * 4;
      const ct = Math.min(1, t * 1.4);
      const o3 = i * 3;
      col[o3] = (a.cr[i] + (a.dr[i] - a.cr[i]) * ct) * br + hot;
      col[o3 + 1] = (a.cg[i] + (a.dg[i] - a.cg[i]) * ct) * br + hot;
      col[o3 + 2] = (a.cb[i] + (a.db[i] - a.cb[i]) * ct) * br + hot;
      pos[o3] = a.px[i]; pos[o3 + 1] = a.py[i]; pos[o3 + 2] = a.pz[i];
      sz[i] = a.size[i] * (0.65 + 0.35 * br) * (1 + hot * 0.15);
      i++;
    }
    // 先前 kill 搬過來的粒子在同一格繼續處理，所以這裡的陣列已經是緊密的
    const g = this.geo;
    for (const name of ['position', 'color', 'size']) {
      const at = g.attributes[name];
      at.clearUpdateRanges(); at.addUpdateRange(0, this.n * at.itemSize); at.needsUpdate = true;
    }
    g.setDrawRange(0, this.n);
    // 燈光衰減
    for (const L of this.lights) { L.t += dt; L.l.intensity = L.I * 750 * Math.exp(-L.t * 4.2) * (0.85 + Math.random() * 0.3); }
    for (const f of this.flashes) f.t += dt;
    this.flashes = this.flashes.filter((f) => f.t < 2.5);
    this.smoke.update(dt, this.flashes);
  }

  // 天空的反光：取最亮的兩個
  skyFlash(sky, cam) {
    const u = sky.u, fl = this.flashes.map((f) => ({ f, k: f.I * Math.exp(-f.t * 3.5) })).sort((a, b) => b.k - a.k);
    const set = (dir, col, e) => {
      if (!e) { col.value.setRGB(0, 0, 0); return; }
      dir.value.set(e.f.x - cam.position.x, e.f.y - cam.position.y, e.f.z - cam.position.z).normalize();
      col.value.copy(e.f.c).multiplyScalar(Math.min(e.k, 2.2) * 0.4);
    };
    set(u.uFlashDir, u.uFlashCol, fl[0]); set(u.uFlash2Dir, u.uFlash2Col, fl[1]);
    let tot = 0; for (const e of fl) tot += e.k;
    return tot;
  }

  clear() { this.n = 0; this.pending = []; this.shells.clear(); }
}

// 煙：普通混色（不是發光），被附近的煙火照亮
class Smoke {
  constructor(scene, q) {
    const M = this.M = 520; this.q = q;
    this.n = 0;
    this.p = new Float32Array(M * 3); this.v = new Float32Array(M * 3); this.age = new Float32Array(M); this.life = new Float32Array(M); this.s0 = new Float32Array(M); this.seed = new Float32Array(M);
    const g = this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(M * 3); this.col = new Float32Array(M * 4); this.sz = new Float32Array(M); this.sd = new Float32Array(M);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('rgba', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.sz, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('seed', new THREE.BufferAttribute(this.sd, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.base = new THREE.Color(0.03, 0.035, 0.05);
    const m = new THREE.ShaderMaterial({
      uniforms: { uScale: U.uScale, uMax: { value: 600 } }, transparent: true, depthWrite: false,
      vertexShader: `attribute vec4 rgba; attribute float size; attribute float seed; uniform float uScale, uMax; varying vec4 vC; varying float vS;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = min(size * uScale / max(-mv.z, 1.0), uMax); vC = rgba; vS = seed; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec4 vC; varying float vS;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; float d = dot(p,p); if (d > 1.0) discard;
          float n = n2(p * 2.5 + vS * 17.0) * 0.6 + n2(p * 5.0 - vS * 9.0) * 0.4;
          float a = (1.0 - d) * (1.0 - d) * (0.45 + n * 0.75) * vC.a;
          gl_FragColor = vec4(vC.rgb, a); }`,
    });
    this.pts = new THREE.Points(g, m); this.pts.frustumCulled = false; this.pts.renderOrder = 4;
    scene.add(this.pts);
  }
  puff(x, y, z, n, r) {
    n = Math.round(n);
    for (let k = 0; k < n; k++) {
      if (this.n >= Math.min(this.M, this.q.fw.smoke)) this.killOldest();
      const i = this.n++;
      const a = Math.random() * TAU, e = Math.random() * 2 - 1, rr = Math.cbrt(Math.random()) * r * 0.75, ce = Math.sqrt(1 - e * e);
      this.p[i * 3] = x + Math.cos(a) * ce * rr; this.p[i * 3 + 1] = y + e * rr * 0.7; this.p[i * 3 + 2] = z + Math.sin(a) * ce * rr;
      this.v[i * 3] = rnd(-0.5, 0.5) + 1.2; this.v[i * 3 + 1] = rnd(-0.2, 0.4); this.v[i * 3 + 2] = rnd(-0.5, 0.5) + 0.4;
      this.age[i] = 0; this.life[i] = rnd(10, 18); this.s0[i] = rnd(5, 9) * (r / 24); this.seed[i] = Math.random();
    }
  }
  killOldest() { let o = 0; for (let i = 1; i < this.n; i++) if (this.age[i] / this.life[i] > this.age[o] / this.life[o]) o = i; this.remove(o); }
  remove(i) {
    const j = --this.n; if (i === j) return;
    for (const A of [this.p, this.v]) { A[i * 3] = A[j * 3]; A[i * 3 + 1] = A[j * 3 + 1]; A[i * 3 + 2] = A[j * 3 + 2]; }
    this.age[i] = this.age[j]; this.life[i] = this.life[j]; this.s0[i] = this.s0[j]; this.seed[i] = this.seed[j];
  }
  update(dt, flashes) {
    let i = 0;
    const B = this.base;
    while (i < this.n) {
      this.age[i] += dt;
      const t = this.age[i] / this.life[i];
      if (t >= 1) { this.remove(i); continue; }
      const o = i * 3;
      this.p[o] += this.v[o] * dt; this.p[o + 1] += this.v[o + 1] * dt; this.p[o + 2] += this.v[o + 2] * dt;
      let r = B.r, g = B.g, b = B.b;
      for (const f of flashes) {
        const dx = f.x - this.p[o], dy = f.y - this.p[o + 1], dz = f.z - this.p[o + 2], d2 = dx * dx + dy * dy + dz * dz;
        const k = f.I * Math.exp(-f.t * 2.6) * 1.0 / (1 + d2 / 900);
        r += f.c.r * k; g += f.c.g * k; b += f.c.b * k;
      }
      this.pos[o] = this.p[o]; this.pos[o + 1] = this.p[o + 1]; this.pos[o + 2] = this.p[o + 2];
      const a4 = i * 4;
      this.col[a4] = Math.min(r, 1.3); this.col[a4 + 1] = Math.min(g, 1.3); this.col[a4 + 2] = Math.min(b, 1.3);
      this.col[a4 + 3] = 0.17 * Math.min(1, t * 8) * (1 - t) * (1 - t);
      this.sz[i] = this.s0[i] * (1 + t * 2.2);
      this.sd[i] = this.seed[i];
      i++;
    }
    const g = this.geo;
    for (const name of ['position', 'rgba', 'size', 'seed']) { const at = g.attributes[name]; at.clearUpdateRanges(); at.addUpdateRange(0, this.n * at.itemSize); at.needsUpdate = true; }
    g.setDrawRange(0, this.n);
  }
}
