// 獎品 3D 模型（全部用程式建出來）＋扭蛋殼、展示盒
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { tex } from '../engine/tex.js';
import { RARITY } from './data.js';

const V = THREE.Vector3;
const mats = new Map();
const cached = (key, make) => { if (!mats.has(key)) mats.set(key, make()); return mats.get(key); };
const std = (color, metalness, roughness, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

export const M = {
  gold: () => cached('gold', () => std('#ffd27a', 1, 0.18)),
  goldDeep: () => cached('goldDeep', () => std('#e0a93a', 1, 0.24)),
  brass: () => cached('brass', () => std('#cf9a45', 1, 0.3)),
  copper: () => cached('copper', () => std('#c8724a', 1, 0.28)),
  silver: () => cached('silver', () => std('#eef2f8', 1, 0.12)),
  steel: () => cached('steel', () => std('#6c7584', 1, 0.28)),
  blued: () => cached('blued', () => std('#203a9a', 0.9, 0.2)),
  ivory: () => cached('ivory', () => std('#f4ecd9', 0, 0.35)),
  black: () => cached('black', () => std('#06060a', 0.5, 0.18)),
  rubber: () => cached('rubber', () => std('#1b1d24', 0, 0.75)),
  cork: () => cached('cork', () => std('#b48a5c', 0, 0.85)),
  stone: () => cached('stone', () => std('#3a3640', 0.1, 0.8, { flatShading: true })),
  pearl: () => cached('pearl', () => new THREE.MeshPhysicalMaterial({ color: '#fff8f2', roughness: 0.18, metalness: 0, clearcoat: 1, iridescence: 0.6, iridescenceIOR: 1.4, sheen: 1, sheenColor: new THREE.Color('#ffd6e8') })),
  wood: (tone = '#4a2a18') => cached('wood' + tone, () => new THREE.MeshStandardMaterial({ map: tex.wood(tone), roughness: 0.5, metalness: 0 })),
  velvet: (tone) => cached('velvet' + tone, () => new THREE.MeshPhysicalMaterial({ color: tone, map: tex.velvet('#ffffff'), roughness: 0.9, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(tone).offsetHSL(0, 0, 0.25) })),
  glass: (tint = '#ffffff', op = 0.2) => cached('glass' + tint + op, () => new THREE.MeshPhysicalMaterial({ color: tint, metalness: 0, roughness: 0.04, transparent: true, opacity: op, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.8, depthWrite: false, side: THREE.DoubleSide })),
  gem: (col, op = 0.94, irid = 0.35, em = 0.18) => cached('gem' + col + op + irid + em, () => new THREE.MeshPhysicalMaterial({ color: col, metalness: 0.05, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0, transparent: op < 1, opacity: op, flatShading: true, envMapIntensity: 2.8, iridescence: irid, iridescenceIOR: 1.8, emissive: col, emissiveIntensity: em, specularIntensity: 1, ior: 2.2 })),
  jade: () => cached('jade', () => new THREE.MeshPhysicalMaterial({ color: '#0c7a46', metalness: 0, roughness: 0.06, clearcoat: 1, flatShading: true, envMapIntensity: 1.6, emissive: '#06402a', emissiveIntensity: 0.6, sheen: 0.5, sheenColor: new THREE.Color('#9effc8') })),
  glow: (col, k = 2) => cached('glow' + col + k, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k) })),
  emis: (col, k = 1.5, base = '#000000') => cached('emis' + col + k + base, () => std(base, 0.2, 0.4, { emissive: col, emissiveIntensity: k })),
  add: (map, col = '#ffffff', k = 1, op = 1) => cached('add' + map.uuid + col + k + op, () => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(col).multiplyScalar(k), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })),
};

const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
const lathe = (pts, segs = 40, phiLen = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs, 0, phiLen);
const torus = (r, t, seg = 48, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 12, seg, arc);
const cyl = (r0, r1, h, seg = 24, open = false) => new THREE.CylinderGeometry(r0, r1, h, seg, 1, open);
const sph = (r, ws = 24, hs = 16) => new THREE.SphereGeometry(r, ws, hs);

function pointsMat(size, op = 1) {
  return new THREE.PointsMaterial({ size, map: tex.dot(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, sizeAttenuation: true, opacity: op });
}
function cloud(pos, cols, size, op = 1) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const p = new THREE.Points(g, pointsMat(size, op));
  p.frustumCulled = false;
  return p;
}
function sprite(map, col, size, k = 1.6, op = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: new THREE.Color(col).multiplyScalar(k), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(size, size, size);
  return s;
}
const R = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };

// 齒輪形狀
function gearShape(teeth, ro, rr, hole, spokes = 0) {
  const s = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = i % 4;
    const r = k === 0 || k === 3 ? rr : ro;
    const da = (k === 1 ? -0.18 : k === 2 ? 0.18 : 0) * (Math.PI * 2 / teeth) / 4;
    const x = Math.cos(a + da) * r, y = Math.sin(a + da) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  if (hole) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h); }
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2, rm = (rr + hole) / 2 + 0.002, w = (rr - hole) * 0.33;
    const h = new THREE.Path();
    h.absarc(Math.cos(a) * rm, Math.sin(a) * rm, w, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  return s;
}
const extrude = (shape, depth, bevel = 0.0015) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 18 });
  g.translate(0, 0, -depth / 2);
  return g;
};
// 明亮式切工
function brilliant(r, h, segs = 16) {
  const g = lathe([[0, -h * 0.62], [r, -0.02 * h], [r, 0.02 * h], [r * 0.56, h * 0.36], [0, h * 0.36]], segs);
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------
// 各獎品模型：底部在 y=0，高約 0.12
// ------------------------------------------------------------
const BUILD = {
  A1(o) { // 藍沙漏
    const g = new THREE.Group(), wood = M.wood('#3d2416'), gold = M.gold();
    const cap = cyl(0.041, 0.041, 0.009, 40);
    g.add(mesh(cap, wood, 0, 0.0045, 0), mesh(cap, wood, 0, 0.1155, 0));
    for (const y of [0.009, 0.111]) { const t = mesh(torus(0.041, 0.0018), gold, 0, y, 0); t.rotation.x = Math.PI / 2; g.add(t); }
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.5; g.add(mesh(cyl(0.0032, 0.0032, 0.102, 10), gold, Math.cos(a) * 0.034, 0.06, Math.sin(a) * 0.034)); }
    const sand = M.emis('#2aa6ff', 2.2, '#0a3a7a');
    g.add(mesh(lathe([[0, 0.0095], [0.024, 0.0095], [0.02, 0.018], [0.011, 0.028], [0, 0.033]], 28), sand));
    g.add(mesh(lathe([[0, 0.0635], [0.005, 0.066], [0.019, 0.076], [0.024, 0.084], [0, 0.084]], 28), sand));
    g.add(mesh(cyl(0.0011, 0.0011, 0.03, 6), M.glow('#6cc8ff', 3), 0, 0.048, 0));
    g.add(mesh(lathe([[0.004, 0.009], [0.02, 0.012], [0.0285, 0.022], [0.0285, 0.036], [0.02, 0.049], [0.006, 0.057], [0.0035, 0.06], [0.006, 0.063], [0.02, 0.071], [0.0285, 0.084], [0.0285, 0.098], [0.02, 0.108], [0.004, 0.111]], 36), M.glass('#d8f0ff', 0.22)));
    return { g };
  },
  A2(o) { // 月光小瓶
    const g = new THREE.Group();
    const moonMat = cached('moon', () => new THREE.MeshStandardMaterial({ color: '#fff3c8', emissive: '#ffe2a0', emissiveIntensity: 0.75, roughness: 0.95 }));
    g.add(mesh(sph(0.019, 28, 20), moonMat, 0, 0.034, 0));
    if (!o.mini) { const s = sprite(tex.dot(), '#ffd98a', 0.07, 0.8, 0.45); s.position.set(0, 0.034, 0); g.add(s); }
    g.add(mesh(lathe([[0.004, 0.002], [0.02, 0.004], [0.033, 0.014], [0.038, 0.032], [0.033, 0.05], [0.02, 0.061], [0.011, 0.068], [0.0105, 0.1], [0.0125, 0.103]], 40), M.glass('#cfe2ff', 0.12)));
    g.add(mesh(cyl(0.0105, 0.0092, 0.018, 18), M.cork(), 0, 0.106, 0));
    const r1 = mesh(torus(0.0118, 0.0016), M.silver(), 0, 0.094, 0); r1.rotation.x = Math.PI / 2; g.add(r1);
    const tag = mesh(new THREE.BoxGeometry(0.014, 0.02, 0.0012), M.silver(), 0.016, 0.083, 0.008); tag.rotation.set(0.1, 0.4, -0.3); g.add(tag);
    return { g };
  },
  A3(o) { // 螢火罐
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, 0.002], [0.03, 0.002], [0.035, 0.008], [0.035, 0.074], [0.03, 0.084], [0.026, 0.088], [0.026, 0.094]], 40), M.glass('#dfffd0', 0.1)));
    g.add(mesh(cyl(0.0285, 0.0285, 0.012, 36), M.brass(), 0, 0.099, 0));
    for (const y of [0.095, 0.099, 0.103]) { const t = mesh(torus(0.0287, 0.0012, 40), M.goldDeep(), 0, y, 0); t.rotation.x = Math.PI / 2; g.add(t); }
    const handle = mesh(torus(0.022, 0.0016, 24, Math.PI), M.steel(), 0, 0.106, 0); g.add(handle);
    // 小樹枝
    const twig = mesh(cyl(0.0022, 0.0035, 0.07, 6), M.wood('#5a3a20'), 0.004, 0.04, -0.004); twig.rotation.z = 0.35; g.add(twig);
    const leaf = mesh(new THREE.SphereGeometry(0.009, 10, 6), cached('leaf', () => std('#4c9a3c', 0, 0.5)), 0.016, 0.066, -0.002); leaf.scale.set(1, 0.3, 0.55); g.add(leaf);
    const rr = R(3), pos = [], col = [];
    const flies = [];
    for (let i = 0; i < 27; i++) {
      const a = rr() * 6.28, r = Math.sqrt(rr()) * 0.026, y = 0.012 + rr() * 0.068;
      flies.push({ a, r, y, s: 0.5 + rr(), p: rr() * 6.28 });
      pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
      const c = new THREE.Color().setHSL(0.17 + rr() * 0.08, 1, 0.62).multiplyScalar(2.2); col.push(c.r, c.g, c.b);
    }
    if (o.mini) {
      const fm = M.glow('#d8ff6a', 3);
      for (let i = 0; i < 9; i++) { const f = flies[i * 3]; g.add(mesh(sph(0.0028, 8, 6), fm, Math.cos(f.a) * f.r, f.y, Math.sin(f.a) * f.r)); }
      return { g };
    }
    const pts = cloud(pos, col, 0.02, 1);
    g.add(pts);
    const P = pts.geometry.attributes.position;
    return { g, tick: (t) => { flies.forEach((f, i) => { const a = f.a + t * 0.3 * f.s, w = Math.sin(t * f.s * 1.3 + f.p) * 0.004; P.setXYZ(i, Math.cos(a) * (f.r + w), f.y + Math.sin(t * f.s + f.p) * 0.006, Math.sin(a) * (f.r + w)); }); P.needsUpdate = true; } };
  },
  A4(o) { // 極光燈
    const g = new THREE.Group(), frame = M.brass(), dark = M.black();
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.008, 0.06), dark, 0, 0.004, 0));
    g.add(mesh(new THREE.BoxGeometry(0.052, 0.005, 0.052), frame, 0, 0.0095, 0));
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.add(mesh(new THREE.BoxGeometry(0.004, 0.072, 0.004), frame, x * 0.026, 0.047, z * 0.026));
    g.add(mesh(new THREE.BoxGeometry(0.056, 0.004, 0.056), frame, 0, 0.084, 0));
    const roof = mesh(new THREE.ConeGeometry(0.044, 0.02, 4, 1), dark, 0, 0.096, 0); roof.rotation.y = Math.PI / 4; g.add(roof);
    g.add(mesh(cyl(0.006, 0.008, 0.008, 12), frame, 0, 0.108, 0));
    const ring = mesh(torus(0.009, 0.0015, 24), frame, 0, 0.12, 0); g.add(ring);
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.07, 0.05), M.glass('#d8fff0', 0.07), 0, 0.047, 0));
    const am = cached('auroraMat', () => new THREE.MeshBasicMaterial({ map: tex.aurora(), color: new THREE.Color(2.4, 2.4, 2.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const cur = mesh(cyl(0.017, 0.017, 0.062, 32, true), am, 0, 0.046, 0); g.add(cur);
    const core = mesh(sph(0.005, 16, 12), M.glow('#7affd8', 1.6), 0, 0.03, 0); g.add(core);
    if (o.mini) return { g };
    const s = sprite(tex.dot(), '#3fffc0', 0.1, 0.6, 0.35); s.position.y = 0.047; g.add(s);
    return { g, tick: (t) => { am.map.offset.x = (t * 0.03) % 1; cur.rotation.y = t * 0.2; } };
  },
  A5(o) { // 星雲水晶球
    const g = new THREE.Group(), sil = M.silver();
    g.add(mesh(lathe([[0, 0], [0.032, 0], [0.034, 0.004], [0.028, 0.008], [0.016, 0.014], [0.012, 0.024], [0.018, 0.03], [0, 0.03]], 40), M.black()));
    const rim = mesh(torus(0.033, 0.0018), M.gold(), 0, 0.003, 0); rim.rotation.x = Math.PI / 2; g.add(rim);
    for (let k = 0; k < 3; k++) { const c = mesh(torus(0.03, 0.0026, 24, Math.PI * 0.42), sil, 0, 0.068, 0); c.rotation.set(0, k * 2.094, -Math.PI * 0.79); g.add(c); }
    g.add(mesh(sph(0.042, 40, 28), M.glass('#e6d8ff', 0.1), 0, 0.072, 0));
    if (o.mini) { g.add(mesh(sph(0.02, 16, 12), M.glow('#c46bff', 1.8), 0, 0.072, 0)); return { g }; }
    const rr = R(9), pos = [], col = [];
    for (let i = 0; i < 520; i++) {
      const arm = i % 3, t = rr(), a = arm * 2.094 + t * 4.2 + (rr() - 0.5) * 0.7, r = 0.004 + t * 0.034;
      pos.push(Math.cos(a) * r, (rr() - 0.5) * 0.02 * (1 - t * 0.5), Math.sin(a) * r);
      const c = new THREE.Color().setHSL(0.75 + rr() * 0.2 - t * 0.15, 0.95, 0.55 + rr() * 0.2).multiplyScalar(1.8); col.push(c.r, c.g, c.b);
    }
    const neb = cloud(pos, col, 0.013, 0.9); neb.position.y = 0.072; neb.rotation.x = 0.5; g.add(neb);
    const s = sprite(tex.dot(), '#e5a0ff', 0.05, 1.6); s.position.y = 0.072; g.add(s);
    return { g, tick: (t) => { neb.rotation.y = t * 0.25; } };
  },
  A6(o) { // 銀河瓶
    const g = new THREE.Group();
    g.add(mesh(lathe([[0.004, 0.001], [0.028, 0.002], [0.034, 0.012], [0.035, 0.06], [0.03, 0.078], [0.016, 0.092], [0.0115, 0.104], [0.0115, 0.118], [0.014, 0.121]], 48), M.glass('#0b1640', 0.55)));
    g.add(mesh(lathe([[0, 0], [0.03, 0], [0.034, 0.006], [0, 0.006]], 40), M.gold()));
    for (const y of [0.106, 0.114]) { const t = mesh(torus(0.0124, 0.0016, 32), M.gold(), 0, y, 0); t.rotation.x = Math.PI / 2; g.add(t); }
    g.add(mesh(cyl(0.0105, 0.009, 0.012, 20), M.gold(), 0, 0.124, 0));
    g.add(mesh(sph(0.0085, 20, 16), M.gold(), 0, 0.134, 0));
    g.add(mesh(sph(0.0035, 12, 8), M.gem('#7ab8ff', 1, 0.6, 0.6), 0, 0.142, 0));
    if (o.mini) { const d = mesh(new THREE.CircleGeometry(0.026, 24), M.add(tex.dot(), '#9fb8ff', 2.2), 0, 0.045, 0); d.rotation.x = -Math.PI / 2.4; g.add(d); return { g }; }
    const rr = R(17), pos = [], col = [];
    for (let i = 0; i < 1600; i++) {
      const arm = i % 2, t = Math.pow(rr(), 0.8), a = arm * Math.PI + t * 6.5 + (rr() - 0.5) * 0.55 * (1 - t * 0.4), r = 0.002 + t * 0.03;
      pos.push(Math.cos(a) * r, (rr() - 0.5) * 0.006 * (1.4 - t), Math.sin(a) * r);
      const c = new THREE.Color().setHSL(t < 0.18 ? 0.1 : 0.58 + rr() * 0.16, t < 0.18 ? 0.8 : 0.95, 0.55 + rr() * 0.3).multiplyScalar(2.2); col.push(c.r, c.g, c.b);
    }
    const gal = cloud(pos, col, 0.0085, 1); gal.position.y = 0.046; gal.rotation.x = 0.5; gal.scale.setScalar(1.05); g.add(gal);
    const core = sprite(tex.star(), '#fff1c8', 0.05, 2.2); core.position.y = 0.046; g.add(core);
    return { g, tick: (t) => { gal.rotation.y = -t * 0.35; core.material.rotation = t * 0.2; } };
  },
  A7(o) { // 事件視界
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, 0], [0.036, 0], [0.038, 0.006], [0.034, 0.012], [0.022, 0.02], [0.02, 0.028], [0, 0.028]], 48), M.black()));
    for (const [y, r] of [[0.004, 0.0375], [0.013, 0.03]]) { const t = mesh(torus(r, 0.0018, 48), M.gold(), 0, y, 0); t.rotation.x = Math.PI / 2; g.add(t); }
    g.add(mesh(sph(0.045, 40, 28), M.glass('#1a0e08', 0.5), 0, 0.072, 0));
    g.add(mesh(sph(0.013, 28, 20), cached('void', () => new THREE.MeshBasicMaterial({ color: '#000000' })), 0, 0.072, 0));
    const dm = M.add(tex.disk(), '#ffffff', 2.6);
    const disk = mesh(new THREE.PlaneGeometry(0.086, 0.086), dm, 0, 0.072, 0); disk.rotation.x = -Math.PI / 2 + 0.22; g.add(disk);
    const halo = mesh(torus(0.0158, 0.0018, 48), M.glow('#ffd29a', 3.4), 0, 0.072, 0.002); g.add(halo);
    if (o.mini) return { g };
    const lens = sprite(tex.dot(), '#ff8a3a', 0.11, 0.9, 0.6); lens.position.y = 0.072; g.add(lens);
    const rr = R(29), pos = [], col = [];
    for (let i = 0; i < 160; i++) { const a = rr() * 6.28, r = 0.02 + rr() * 0.02; pos.push(Math.cos(a) * r, (rr() - 0.5) * 0.003, Math.sin(a) * r); col.push(1, 0.75 + rr() * 0.25, 0.4); }
    const sw = cloud(pos, col, 0.004, 1); sw.position.y = 0.072; sw.rotation.x = 0.22; g.add(sw);
    return { g, tick: (t) => { disk.rotation.z = t * 0.6; sw.rotation.y = t * 1.2; } };
  },

  B1(o) { // 黃銅齒輪
    const g = new THREE.Group();
    const gear = mesh(extrude(gearShape(18, 0.047, 0.041, 0.011, 5), 0.011), M.brass(), 0, 0.058, 0); g.add(gear);
    const hub = mesh(cyl(0.016, 0.016, 0.016, 28), M.goldDeep(), 0, 0.058, 0); hub.rotation.x = Math.PI / 2; g.add(hub);
    const ax = mesh(cyl(0.006, 0.006, 0.024, 16), M.steel(), 0, 0.058, 0); ax.rotation.x = Math.PI / 2; g.add(ax);
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.012, 0.03), M.wood('#3a2416'), 0, 0.006, 0));
    g.add(mesh(new THREE.BoxGeometry(0.006, 0.014, 0.02), M.steel(), 0, 0.016, 0));
    if (o.mini) return { g };
    return { g, tick: (t) => { gear.rotation.z = t * 0.4; } };
  },
  B2(o) { // 發條鑰匙
    const g = new THREE.Group(), b = M.brass();
    const bow = new THREE.Shape();
    bow.absellipse(0, 0, 0.018, 0.013, 0, Math.PI * 2);
    const hole = new THREE.Path(); hole.absellipse(0, 0, 0.009, 0.006, 0, Math.PI * 2, true); bow.holes.push(hole);
    for (const s of [-1, 1]) { const w = mesh(extrude(bow, 0.005), b, s * 0.017, 0.088, 0); w.rotation.z = s * 0.25; g.add(w); }
    g.add(mesh(sph(0.007, 16, 12), M.goldDeep(), 0, 0.086, 0));
    g.add(mesh(cyl(0.0042, 0.0042, 0.07, 16), M.steel(), 0, 0.048, 0));
    for (const y of [0.076, 0.07, 0.02]) g.add(mesh(cyl(0.0065, 0.0065, 0.004, 20), M.goldDeep(), 0, y, 0));
    g.add(mesh(new THREE.BoxGeometry(0.008, 0.012, 0.008), M.steel(), 0, 0.01, 0));
    g.add(mesh(cyl(0.024, 0.028, 0.006, 32), M.black(), 0, 0.003, 0));
    return { g };
  },
  B3(o) { // 懷錶
    const g = new THREE.Group(), gold = M.gold();
    const face = new THREE.Group(); face.position.y = 0.058; face.rotation.x = -0.12; g.add(face);
    const caseG = lathe([[0, -0.009], [0.036, -0.009], [0.042, -0.004], [0.043, 0.002], [0.04, 0.007], [0.036, 0.008], [0, 0.008]], 56); caseG.rotateX(Math.PI / 2);
    face.add(mesh(caseG, gold));
    const dial = mesh(new THREE.CircleGeometry(0.034, 48), cached('dialMat', () => new THREE.MeshStandardMaterial({ map: tex.dial(), roughness: 0.55, metalness: 0, envMapIntensity: 0.6 })), 0, 0, 0.0082); face.add(dial);
    const hm = M.blued();
    const hh = mesh(new THREE.BoxGeometry(0.003, 0.018, 0.001), hm, 0, 0.008, 0.0092), mh = mesh(new THREE.BoxGeometry(0.0022, 0.026, 0.001), hm, 0, 0.012, 0.0096);
    const hg = new THREE.Group(), mg = new THREE.Group(); hg.position.z = mg.position.z = 0; hg.add(hh); mg.add(mh); face.add(hg, mg);
    hg.rotation.z = -1.2; mg.rotation.z = 2.2;
    face.add(mesh(cyl(0.0026, 0.0026, 0.002, 12), gold, 0, 0, 0.0098).rotateX(Math.PI / 2));
    const dome = mesh(new THREE.SphereGeometry(0.036, 40, 12, 0, Math.PI * 2, 0, 0.42), cached('domeGlass', () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, transparent: true, opacity: 0.06, clearcoat: 0.6, envMapIntensity: 0.5, depthWrite: false })), 0, 0, -0.025); dome.rotation.x = Math.PI / 2; face.add(dome);
    face.add(mesh(cyl(0.006, 0.006, 0.01, 16), M.goldDeep(), 0, 0.047, 0));
    face.add(mesh(torus(0.011, 0.002, 28), gold, 0, 0.062, 0));
    // 錶鏈
    for (let i = 0; i < 7; i++) { const l = mesh(torus(0.0045, 0.0011, 12), gold, 0.012 + i * 0.006, 0.072 - i * 0.011, -0.004); l.rotation.set(i % 2 ? Math.PI / 2 : 0, 0.3, 0.6); g.add(l); }
    g.add(mesh(cyl(0.03, 0.034, 0.008, 40), M.velvet('#1a2a5a'), 0, 0.004, 0));
    if (o.mini) return { g };
    return { g, tick: (t) => { mg.rotation.z = 2.2 - t * 0.05; hg.rotation.z = -1.2 - t * 0.004; } };
  },
  B4(o) { // 發條小鳥
    const g = new THREE.Group(), b = M.brass(), cu = M.copper();
    g.add(mesh(cyl(0.026, 0.03, 0.008, 36), M.wood('#3a2416'), 0, 0.004, 0));
    const perch = mesh(cyl(0.004, 0.004, 0.05, 10), M.wood('#5a3a22'), 0, 0.03, 0); perch.rotation.z = Math.PI / 2; g.add(perch);
    for (const s of [-1, 1]) g.add(mesh(cyl(0.0035, 0.0035, 0.026, 8), M.steel(), s * 0.02, 0.017, 0));
    const body = mesh(sph(0.026, 28, 20), b, 0, 0.06, 0); body.scale.set(1.15, 0.9, 0.85); body.rotation.z = 0.25; g.add(body);
    const head = mesh(sph(0.016, 24, 18), b, 0.025, 0.083, 0); g.add(head);
    const beak = mesh(new THREE.ConeGeometry(0.0055, 0.016, 12), M.gold(), 0.044, 0.082, 0); beak.rotation.z = -Math.PI / 2; g.add(beak);
    for (const s of [-1, 1]) { g.add(mesh(sph(0.0042, 12, 10), M.black(), 0.033, 0.088, s * 0.011)); g.add(mesh(sph(0.0013, 8, 6), M.glow('#ffffff', 2), 0.0355, 0.0895, s * 0.0135)); }
    const wing = new THREE.Shape(); wing.moveTo(0, 0); wing.quadraticCurveTo(-0.01, 0.022, -0.042, 0.014); wing.quadraticCurveTo(-0.03, 0.004, -0.046, -0.004); wing.quadraticCurveTo(-0.022, -0.006, 0, 0);
    for (const s of [-1, 1]) { const w = mesh(extrude(wing, 0.003, 0.001), cu, 0.006, 0.066, s * 0.022); w.rotation.set(s * 0.25, 0, 0.18); g.add(w); }
    for (let i = 0; i < 3; i++) { const tl = mesh(new THREE.BoxGeometry(0.03, 0.002, 0.007), cu, -0.038, 0.05, (i - 1) * 0.006); tl.rotation.set((i - 1) * 0.3, (i - 1) * 0.25, 0.5); g.add(tl); }
    // 背上的發條
    const key = new THREE.Group(); key.position.set(-0.012, 0.087, 0); g.add(key);
    key.add(mesh(cyl(0.002, 0.002, 0.012, 8), M.steel(), 0, 0.004, 0));
    for (const s of [-1, 1]) key.add(mesh(torus(0.0045, 0.0013, 12), M.gold(), 0, 0.012, s * 0.005));
    if (o.mini) return { g };
    return { g, tick: (t) => { key.rotation.y = t * 1.5; head.rotation.z = Math.sin(t * 1.3) * 0.12; } };
  },
  B5(o) { // 八音盒
    const g = new THREE.Group(), wood = M.wood('#5a2c18'), gold = M.gold();
    g.add(mesh(new THREE.BoxGeometry(0.084, 0.04, 0.056), wood, 0, 0.022, 0));
    for (const y of [0.003, 0.041]) g.add(mesh(new THREE.BoxGeometry(0.086, 0.004, 0.058), M.goldDeep(), 0, y, 0));
    g.add(mesh(new THREE.BoxGeometry(0.076, 0.002, 0.048), M.velvet('#7a1430'), 0, 0.041, 0));
    const lid = new THREE.Group(); lid.position.set(0, 0.043, -0.028); lid.rotation.x = -1.9; g.add(lid);
    lid.add(mesh(new THREE.BoxGeometry(0.084, 0.008, 0.056), wood, 0, 0.004, 0.028));
    lid.add(mesh(new THREE.BoxGeometry(0.07, 0.001, 0.044), M.velvet('#7a1430'), 0, -0.0005, 0.028));
    // 音筒與音梳
    const drum = mesh(cyl(0.008, 0.008, 0.05, 24), M.brass(), -0.006, 0.05, -0.006); drum.rotation.z = Math.PI / 2; g.add(drum);
    if (!o.mini) {
      const pins = [];
      const rr = R(41);
      for (let i = 0; i < 70; i++) { const a = rr() * 6.28, x = (rr() - 0.5) * 0.046; pins.push(new THREE.Vector3(x, Math.cos(a) * 0.0085, Math.sin(a) * 0.0085)); }
      const pg = new THREE.BufferGeometry().setFromPoints(pins);
      const pm = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#fff1c0', size: 0.0016 }));
      drum.add(pm); pm.rotation.z = -Math.PI / 2;
    }
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.003, 0.012), M.silver(), -0.006, 0.046, 0.012));
    for (let i = 0; i < 12; i++) g.add(mesh(new THREE.BoxGeometry(0.0026, 0.0018, 0.014), M.silver(), -0.03 + i * 0.0043, 0.048, 0.006));
    // 旋轉的小星星
    const star = new THREE.Group(); star.position.set(0.026, 0.056, 0.006); g.add(star);
    star.add(mesh(cyl(0.0015, 0.0015, 0.014, 6), gold, 0, -0.007, 0));
    const st = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, r = i % 2 ? 0.005 : 0.012; i ? st.lineTo(Math.sin(a) * r, Math.cos(a) * r) : st.moveTo(Math.sin(a) * r, Math.cos(a) * r); }
    star.add(mesh(extrude(st, 0.003, 0.001), M.gem('#ffe27a', 1, 0.5, 0.5), 0, 0.006, 0));
    const crank = new THREE.Group(); crank.position.set(0.044, 0.022, 0); g.add(crank);
    crank.add(mesh(cyl(0.002, 0.002, 0.01, 8), gold, 0.005, 0, 0).rotateZ(Math.PI / 2));
    crank.add(mesh(new THREE.BoxGeometry(0.003, 0.018, 0.003), gold, 0.01, 0.008, 0));
    crank.add(mesh(sph(0.003, 10, 8), M.ivory(), 0.012, 0.017, 0));
    if (o.mini) return { g };
    return { g, tick: (t) => { star.rotation.y = t * 1.6; drum.rotation.x = t * 0.8; crank.rotation.x = t * 0.8; } };
  },
  B6(o) { // 天體儀
    const g = new THREE.Group(), gold = M.gold();
    g.add(mesh(lathe([[0, 0], [0.042, 0], [0.044, 0.005], [0.036, 0.01], [0.02, 0.014], [0.012, 0.022], [0, 0.022]], 48), M.wood('#2e1a10')));
    const base = mesh(torus(0.043, 0.002, 56), gold, 0, 0.003, 0); base.rotation.x = Math.PI / 2; g.add(base);
    g.add(mesh(cyl(0.004, 0.006, 0.05, 16), gold, 0, 0.046, 0));
    const sunMat = cached('sun', () => new THREE.MeshStandardMaterial({ color: '#ffb340', emissive: '#ff8a1a', emissiveIntensity: 2.6, roughness: 0.6 }));
    g.add(mesh(sph(0.013, 28, 20), sunMat, 0, 0.083, 0));
    if (!o.mini) { const s = sprite(tex.dot(), '#ffb050', 0.08, 1.4, 0.8); s.position.y = 0.083; g.add(s); }
    const planets = [
      { r: 0.024, s: 0.0042, c: '#c9b28c', y: 0.075, sp: 1.6 },
      { r: 0.034, s: 0.0058, c: '#3a8bff', y: 0.068, sp: 1.0, moon: true },
      { r: 0.043, s: 0.005, c: '#e05a3a', y: 0.062, sp: 0.7 },
      { r: 0.052, s: 0.009, c: '#e6c28a', y: 0.056, sp: 0.45, ring: true },
    ];
    const arms = [];
    planets.forEach((p, i) => {
      const arm = new THREE.Group(); arm.position.y = p.y; arm.rotation.y = i * 1.7; g.add(arm); arms.push({ arm, sp: p.sp });
      const rod = mesh(cyl(0.0012, 0.0012, p.r, 6), gold, p.r / 2, 0, 0); rod.rotation.z = Math.PI / 2; arm.add(rod);
      arm.add(mesh(cyl(0.0012, 0.0012, 0.012, 6), gold, p.r, 0.006, 0));
      const pl = mesh(sph(p.s, 20, 14), cached('pl' + p.c, () => std(p.c, 0.1, 0.5)), p.r, 0.013, 0); arm.add(pl);
      if (p.ring) { const rg = mesh(torus(p.s * 1.7, p.s * 0.28, 28), gold, p.r, 0.013, 0); rg.rotation.x = 1.2; arm.add(rg); }
      if (p.moon) arm.add(mesh(sph(0.0018, 10, 8), M.silver(), p.r + 0.009, 0.016, 0));
      if (!o.mini) { const orbit = mesh(torus(p.r, 0.0006, 72), M.goldDeep(), 0, p.y + 0.013, 0); orbit.rotation.x = Math.PI / 2; g.add(orbit); }
    });
    const ringA = mesh(torus(0.056, 0.0016, 72), gold, 0, 0.083, 0); ringA.rotation.x = Math.PI / 2 + 0.4; g.add(ringA);
    if (o.mini) return { g };
    return { g, tick: (t) => { arms.forEach((a, i) => { a.arm.rotation.y = i * 1.7 + t * a.sp * 0.5; }); ringA.rotation.z = t * 0.1; } };
  },
  B7(o) { // 永動之心
    const g = new THREE.Group();
    const hs = new THREE.Shape();
    hs.moveTo(0, -0.03); hs.bezierCurveTo(-0.004, -0.022, -0.04, -0.004, -0.036, 0.016); hs.bezierCurveTo(-0.032, 0.036, -0.006, 0.038, 0, 0.022);
    hs.bezierCurveTo(0.006, 0.038, 0.032, 0.036, 0.036, 0.016); hs.bezierCurveTo(0.04, -0.004, 0.004, -0.022, 0, -0.03);
    const hg = new THREE.ExtrudeGeometry(hs, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.009, bevelSegments: 6, curveSegments: 28 });
    hg.translate(0, 0, -0.007);
    const heart = new THREE.Group(); heart.position.y = 0.074; g.add(heart);
    heart.add(mesh(hg, M.copper()));
    const coreM = cached('heartCore', () => new THREE.MeshStandardMaterial({ color: '#ff3a2a', emissive: '#ff2a1a', emissiveIntensity: 3, roughness: 0.4 }));
    const core = mesh(sph(0.011, 20, 14), coreM, 0, 0.006, 0.019); heart.add(core);
    heart.add(mesh(torus(0.012, 0.0022, 32), M.gold(), 0, 0.006, 0.02));
    for (const [x, y, s, z] of [[-0.018, 0.018, 0.011, 0.016], [0.02, 0.016, 0.009, 0.017], [0.006, -0.012, 0.008, 0.019]]) {
      const ge = mesh(extrude(gearShape(10, s, s * 0.82, s * 0.3, 0), 0.0025, 0.0006), M.brass(), x, y, z); heart.add(ge); ge.userData.spin = (x > 0 ? 1 : -1) * (0.02 / s);
    }
    for (const [x, a] of [[-0.012, 0.3], [0.012, -0.3]]) { const p = mesh(cyl(0.0035, 0.0035, 0.02, 12), M.brass(), x, 0.036, 0); p.rotation.z = a; heart.add(p); }
    g.add(mesh(lathe([[0, 0], [0.032, 0], [0.034, 0.006], [0.026, 0.01], [0.012, 0.016], [0.01, 0.034], [0, 0.034]], 40), M.black()));
    const rim = mesh(torus(0.033, 0.0018, 48), M.gold(), 0, 0.004, 0); rim.rotation.x = Math.PI / 2; g.add(rim);
    if (o.mini) return { g };
    const glow = sprite(tex.dot(), '#ff4a2a', 0.08, 1.2, 0.7); glow.position.set(0, 0.08, 0.02); g.add(glow);
    return { g, tick: (t) => {
      const beat = Math.pow(Math.max(0, Math.sin(t * 5.2)), 12) + 0.5 * Math.pow(Math.max(0, Math.sin(t * 5.2 - 0.6)), 12);
      heart.scale.setScalar(1 + beat * 0.05); coreM.emissiveIntensity = 2.4 + beat * 3; glow.material.opacity = 0.5 + beat * 0.5;
      heart.children.forEach((c) => { if (c.userData.spin) c.rotation.z = t * c.userData.spin; });
    } };
  },

  C1(o) { // 紫晶簇
    const g = new THREE.Group();
    const rock = mesh(new THREE.DodecahedronGeometry(0.036, 0), M.stone(), 0, 0.012, 0); rock.scale.set(1.25, 0.45, 1); g.add(rock);
    const gm = M.gem('#a35cff', 0.88, 0.5, 0.3);
    const xs = [[0, 0.09, 0, 0, 0.011], [0.016, 0.07, 0.008, -0.35, 0.009], [-0.017, 0.066, 0.005, 0.4, 0.009], [0.006, 0.056, -0.016, -0.2, 0.008], [-0.008, 0.05, 0.017, 0.3, 0.007], [0.026, 0.044, -0.006, -0.6, 0.007], [-0.026, 0.04, -0.01, 0.65, 0.006]];
    for (const [x, h, z, tilt, r] of xs) {
      const c = new THREE.Group(); c.position.set(x, 0.016, z); c.rotation.set(z * 12, 0, tilt); g.add(c);
      c.add(mesh(cyl(r, r * 1.05, h * 0.75, 6), gm, 0, h * 0.375, 0));
      c.add(mesh(new THREE.ConeGeometry(r, h * 0.25, 6), gm, 0, h * 0.75 + h * 0.125, 0));
    }
    return { g };
  },
  C2(o) { // 翡翠骰
    const g = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(0.042, 0);
    const d = mesh(geo, M.jade(), 0, 0.058, 0); d.rotation.set(0.3, 0.2, 0.1); g.add(d);
    // 金色鑲邊
    const pos = geo.attributes.position, edges = new Map(), parts = [];
    for (let i = 0; i < pos.count; i += 3) for (let k = 0; k < 3; k++) {
      const a = new V().fromBufferAttribute(pos, i + k), b = new V().fromBufferAttribute(pos, i + ((k + 1) % 3));
      const key = [a, b].map((v) => v.toArray().map((n) => n.toFixed(3)).join(',')).sort().join('|');
      if (edges.has(key)) continue; edges.set(key, 1);
      const len = a.distanceTo(b), e = new THREE.CylinderGeometry(0.0017, 0.0017, len, 6);
      e.rotateX(Math.PI / 2); e.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new V(0, 0, 1), b.clone().sub(a).normalize())));
      e.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      parts.push(e);
    }
    const rim = mesh(mergeGeometries(parts), M.gold()); d.add(rim);
    g.add(mesh(cyl(0.028, 0.032, 0.012, 6), M.black(), 0, 0.006, 0));
    if (o.mini) return { g };
    return { g, tick: (t) => { d.rotation.y = 0.2 + t * 0.3; } };
  },
  C3(o) { // 藍寶石戒
    const g = new THREE.Group();
    const cush = mesh(new THREE.SphereGeometry(0.03, 32, 16), M.velvet('#14244f'), 0, 0.016, 0); cush.scale.set(1.2, 0.55, 1); g.add(cush);
    const ring = new THREE.Group(); ring.position.y = 0.052; g.add(ring);
    ring.add(mesh(torus(0.026, 0.0045, 64), M.gold()));
    const setting = new THREE.Group(); setting.position.y = 0.029; ring.add(setting);
    setting.add(mesh(cyl(0.006, 0.008, 0.008, 16), M.gold(), 0, 0.002, 0));
    for (let k = 0; k < 4; k++) { const a = k * 1.571 + 0.785; const p = mesh(cyl(0.0012, 0.0012, 0.014, 6), M.gold(), Math.cos(a) * 0.0085, 0.009, Math.sin(a) * 0.0085); p.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); setting.add(p); }
    const gem = mesh(brilliant(0.0155, 0.028, 12), M.gem('#1d4dff', 0.95, 0.4, 0.35), 0, 0.019, 0); gem.scale.set(1, 1, 0.82); setting.add(gem);
    for (const d of [-0.62, -0.42, -0.24, 0.24, 0.42, 0.62]) { const a = Math.PI / 2 + d; ring.add(mesh(new THREE.OctahedronGeometry(0.0026, 0), M.gem('#ffffff', 1, 0.7, 0.4), Math.cos(a) * 0.0272, Math.sin(a) * 0.0272, 0.0032)); }
    if (o.mini) return { g };
    const st = sprite(tex.star(), '#bcd2ff', 0.03, 1.4, 0.9); st.position.set(0.004, 0.085, 0.01); g.add(st);
    return { g, tick: (t) => { ring.rotation.y = Math.sin(t * 0.6) * 0.5; st.material.opacity = 0.4 + 0.6 * Math.pow(Math.max(0, Math.sin(t * 2.3)), 6); } };
  },
  C4(o) { // 紅寶石王冠
    const g = new THREE.Group(), gold = M.gold();
    g.add(mesh(new THREE.SphereGeometry(0.033, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.velvet('#8a0f22'), 0, 0.03, 0));
    g.add(mesh(cyl(0.036, 0.034, 0.024, 48, true), gold, 0, 0.03, 0));
    for (const y of [0.019, 0.041]) { const t = mesh(torus(0.0355, 0.002, 56), M.goldDeep(), 0, y, 0); t.rotation.x = Math.PI / 2; g.add(t); }
    const ruby = M.gem('#ff1438', 0.96, 0.3, 0.3);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const sp = new THREE.Shape(); sp.moveTo(-0.012, 0); sp.lineTo(0, 0.026); sp.lineTo(0.012, 0); sp.lineTo(-0.012, 0);
      const s = mesh(extrude(sp, 0.002, 0.0008), gold, Math.cos(a) * 0.035, 0.042, Math.sin(a) * 0.035); s.rotation.y = -a + Math.PI / 2; g.add(s);
      g.add(mesh(sph(0.0034, 14, 10), M.pearl(), Math.cos(a) * 0.035, 0.07, Math.sin(a) * 0.035));
      const r = mesh(new THREE.OctahedronGeometry(0.0045, 0), ruby, Math.cos(a + 0.39) * 0.037, 0.03, Math.sin(a + 0.39) * 0.037); r.rotation.y = -a; r.scale.set(1, 1.3, 0.6); g.add(r);
    }
    g.add(mesh(cyl(0.003, 0.003, 0.016, 8), gold, 0, 0.064, 0));
    g.add(mesh(sph(0.008, 20, 14), gold, 0, 0.074, 0));
    g.add(mesh(new THREE.OctahedronGeometry(0.006, 0), ruby, 0, 0.086, 0));
    g.add(mesh(cyl(0.03, 0.034, 0.016, 40), M.velvet('#3a0a14'), 0, 0.008, 0));
    return { g };
  },
  C5(o) { // 帝王之心
    const g = new THREE.Group();
    const cush = mesh(new THREE.BoxGeometry(0.07, 0.016, 0.07, 1, 1, 1), M.velvet('#8a0f22'), 0, 0.012, 0); g.add(cush);
    const top = mesh(new THREE.SphereGeometry(0.04, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.velvet('#a3122a'), 0, 0.019, 0); top.scale.set(1.1, 0.3, 1.1); g.add(top);
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { g.add(mesh(sph(0.004, 10, 8), M.gold(), x * 0.035, 0.02, z * 0.035)); const ts = mesh(new THREE.ConeGeometry(0.0035, 0.014, 8), M.gold(), x * 0.038, 0.01, z * 0.038); g.add(ts); }
    const dm = cached('diamondMat', () => new THREE.MeshPhysicalMaterial({ color: '#dcecff', metalness: 0.15, roughness: 0, transparent: true, opacity: 0.82, ior: 2.4, flatShading: true, envMapIntensity: 1.25, iridescence: 0.7, iridescenceIOR: 2.0, iridescenceThicknessMap: tex.iri(), iridescenceThicknessMinimum: 250, iridescenceThicknessMaximum: 700,  clearcoat: 0.5, specularIntensity: 1, emissive: '#9fc8ff', emissiveIntensity: 0.02 }));
    const dia = mesh(brilliant(0.034, 0.06, 24), dm, 0, 0.068, 0); dia.rotation.x = 0.35; g.add(dia);
    if (o.mini) return { g };
    const sp = [];
    for (let i = 0; i < 5; i++) { const s = sprite(tex.star(), i % 2 ? '#ffd8f8' : '#d8f0ff', 0.03, 1.8, 0); s.position.set((Math.random() - 0.5) * 0.05, 0.065 + Math.random() * 0.03, 0.02 + Math.random() * 0.01); g.add(s); sp.push({ s, p: Math.random() * 6 }); }
    return { g, tick: (t) => { dia.rotation.y = t * 0.45; sp.forEach((k) => { k.s.material.opacity = Math.pow(Math.max(0, Math.sin(t * 1.7 + k.p * 3)), 10); }); } };
  },
  C6(o) { // 虹色黑鑽
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, 0], [0.034, 0], [0.036, 0.005], [0.026, 0.01], [0.014, 0.018], [0.018, 0.026], [0.024, 0.03], [0, 0.03]], 48), M.black()));
    for (const [y, r] of [[0.003, 0.0355], [0.028, 0.024]]) { const t = mesh(torus(r, 0.0018, 48), M.gold(), 0, y, 0); t.rotation.x = Math.PI / 2; g.add(t); }
    const bm = cached('blackDia', () => new THREE.MeshPhysicalMaterial({ color: '#020203', metalness: 0.55, roughness: 0.03, flatShading: true, envMapIntensity: 1.9, iridescence: 1, iridescenceIOR: 1.9, iridescenceThicknessMap: tex.iri(), iridescenceThicknessMinimum: 180, iridescenceThicknessMaximum: 950, clearcoat: 1, clearcoatRoughness: 0, specularIntensity: 1 }));
    const dia = mesh(brilliant(0.03, 0.054, 24), bm, 0, 0.074, 0); g.add(dia);
    if (o.mini) return { g };
    const rr = R(77), pos = [], col = [];
    for (let i = 0; i < 90; i++) { const a = rr() * 6.28, r = 0.036 + rr() * 0.01; pos.push(Math.cos(a) * r, (rr() - 0.5) * 0.01, Math.sin(a) * r); const c = new THREE.Color().setHSL(rr(), 1, 0.6).multiplyScalar(2); col.push(c.r, c.g, c.b); }
    const ring = cloud(pos, col, 0.007, 1); ring.position.y = 0.074; g.add(ring);
    const sp = [];
    for (let i = 0; i < 6; i++) { const s = sprite(tex.star(), '#ffffff', 0.034, 2.2, 0); s.position.set((Math.random() - 0.5) * 0.04, 0.07 + Math.random() * 0.03, 0.022); g.add(s); sp.push({ s, p: Math.random() * 6, h: i / 6 }); }
    return { g, tick: (t) => {
      dia.rotation.y = t * 0.5; dia.position.y = 0.074 + Math.sin(t * 1.6) * 0.003; ring.rotation.y = -t * 0.8;
      sp.forEach((k) => { k.s.material.opacity = Math.pow(Math.max(0, Math.sin(t * 1.9 + k.p * 3)), 12); k.s.material.color.setHSL((k.h + t * 0.15) % 1, 1, 0.6).multiplyScalar(2.4); });
    } };
  },
};

export function buildPrize(id, opts = {}) {
  const b = BUILD[id]({ mini: !!opts.mini });
  b.g.userData.prize = id;
  b.points = [];
  b.g.traverse((o) => { if (o.isPoints) { o.material = o.material.clone(); o.userData.base = o.material.size; b.points.push(o); } });
  return b;
}
// 點雲的大小不會跟著物件縮放，要自己乘上去
export function setPrizeScale(b, s) {
  b.g.scale.setScalar(s);
  for (const p of b.points || []) p.material.size = p.userData.base * s;
}

// 把模型壓平成「每種材質一個幾何」——給扭蛋內的小模型做 instancing
export function flattenPrize(id) {
  const { g } = buildPrize(id, { mini: true });
  g.updateMatrixWorld(true);
  const byMat = new Map();
  g.traverse((o) => {
    if (!o.isMesh || o.isSprite) return;
    const geo = o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    const ng = geo.index ? geo.toNonIndexed() : geo;
    if (!ng.attributes.normal) ng.computeVertexNormals();
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(ng);
  });
  const parts = [];
  for (const [mat, list] of byMat) parts.push({ mat, geo: mergeGeometries(list) });
  return parts;
}

// 扭蛋殼
export const CAPSULE_COLORS = { N: '#ff9fba', R: '#1f7dff', SR: '#9442ff', SSR: '#ffbe2e' };
export const N_COLORS = ['#ff9fba', '#8fe8c4', '#ffc49a', '#fff09a', '#ffb0e6', '#a8f0ff'];
export function capsuleGeos() {
  const top = new THREE.SphereGeometry(1, 26, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const bot = new THREE.SphereGeometry(1, 26, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const seam = new THREE.TorusGeometry(1.0, 0.035, 6, 30); seam.rotateX(Math.PI / 2);
  return { top, bot, seam };
}
export const capMats = {
  top: () => cached('capTop', () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.06, transparent: true, opacity: 0.32, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.8, depthWrite: false })),
  bot: () => cached('capBot', () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0.1, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.9 })),
  seam: () => cached('capSeam', () => std('#ffffff', 0.4, 0.3)),
  blackTop: () => cached('blkTop', () => new THREE.MeshPhysicalMaterial({ color: '#141008', map: tex.glitter(), metalness: 0.7, roughness: 0.28, clearcoat: 1, envMapIntensity: 1.8 })),
  blackBot: () => cached('blkBot', () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: tex.glitter(), metalness: 0.75, roughness: 0.3, clearcoat: 1, envMapIntensity: 1.8 })),
  blackSeam: () => cached('blkSeam', () => std('#ffcf5a', 1, 0.18, { emissive: '#ff9a1a', emissiveIntensity: 0.6 })),
};

// 推落台的展示盒（開窗彩盒）
export function buildBox(prizeId, rarity, size) {
  const { sx, sy, sz } = size;
  const g = new THREE.Group();
  const rc = RARITY[rarity];
  const tone = new THREE.Color(rc.color);
  const boxMat = cached('box' + rarity, () => new THREE.MeshPhysicalMaterial({ color: tone.clone().multiplyScalar(0.55), metalness: 0.35, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 1.2 }));
  const trim = cached('trim' + rarity, () => std(rarity === 'SSR' ? '#ffd27a' : rarity === 'SR' ? '#e8d4ff' : '#cfe8ff', 1, 0.2));
  const t = 0.004;
  // 背板、頂、底、兩側；正面開窗
  g.add(mesh(new THREE.BoxGeometry(sx, sy, t), boxMat, 0, 0, -sz / 2 + t / 2));
  g.add(mesh(new THREE.BoxGeometry(sx, t, sz), boxMat, 0, sy / 2 - t / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(sx, t * 2, sz), boxMat, 0, -sy / 2 + t, 0));
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(t, sy, sz), boxMat, s * (sx / 2 - t / 2), 0, 0));
  // 正面框
  const fw = 0.016;
  g.add(mesh(new THREE.BoxGeometry(sx, fw, t), boxMat, 0, sy / 2 - fw / 2, sz / 2 - t / 2));
  g.add(mesh(new THREE.BoxGeometry(sx, fw * 1.6, t), boxMat, 0, -sy / 2 + fw * 0.8, sz / 2 - t / 2));
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(fw, sy, t), boxMat, s * (sx / 2 - fw / 2), 0, sz / 2 - t / 2));
  // 金邊
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(sx + 0.002, 0.003, 0.003), trim, 0, s * (sy / 2), sz / 2));
    g.add(mesh(new THREE.BoxGeometry(0.003, sy, 0.003), trim, s * (sx / 2), 0, sz / 2));
  }
  g.add(mesh(new THREE.PlaneGeometry(sx - fw * 2, sy - fw * 2.6), M.glass('#ffffff', 0.12), 0, fw * 0.3, sz / 2 - 0.001));
  // 裡面的展示台與獎品
  g.add(mesh(new THREE.BoxGeometry(sx - 0.02, 0.012, sz - 0.02), M.velvet(rarity === 'SSR' ? '#5a0d1c' : '#141c38'), 0, -sy / 2 + 0.014, 0));
  const p = buildPrize(prizeId, { mini: true });
  const s = Math.min((sy - 0.03) / 0.13, (sx - 0.03) / 0.11);
  p.g.scale.setScalar(s); p.g.position.y = -sy / 2 + 0.02; g.add(p.g);
  // 盒上的稀有度標
  const tag = mesh(new THREE.PlaneGeometry(0.05, 0.012), M.glow(rc.color, 1.6), 0, -sy / 2 + fw * 0.8, sz / 2 + 0.0006); g.add(tag);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { g, prize: p };
}
