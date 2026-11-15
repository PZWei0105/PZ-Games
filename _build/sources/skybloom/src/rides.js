// 旋轉木馬、旋轉飛椅、自由落體塔
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { glowPoints, snowable } from './glow.js';
import { TAU, hsv, hex, canvasTex, clamp, smooth } from './util.js';

const colorize = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); const col = new THREE.Color(c); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); return g; };
const stripeTex = (a, b, n = 16) => canvasTex(512, 128, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect((i * w) / n, 0, w / n + 1, h); } }, {});

function horseGeo() {
  const W = '#f3ede4', M = '#d0a24c', S = '#b3203e';
  const parts = [];
  const add = (g, c, f) => { f && f(g); parts.push(colorize(g, c)); };
  add(new THREE.CapsuleGeometry(0.4, 1.0, 4, 10), W, (g) => g.rotateX(Math.PI / 2).translate(0, 1.55, 0));
  add(new THREE.CylinderGeometry(0.17, 0.26, 0.95, 8), W, (g) => g.rotateX(-0.65).translate(0, 2.05, 0.7));
  add(new THREE.BoxGeometry(0.3, 0.34, 0.72), W, (g) => g.rotateX(0.55).translate(0, 2.45, 1.08));
  add(new THREE.BoxGeometry(0.12, 0.5, 0.6), M, (g) => g.rotateX(-0.65).translate(0, 2.2, 0.55));
  add(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 10, 1, false, 0, Math.PI), S, (g) => g.rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, 1.9, -0.1));
  add(new THREE.ConeGeometry(0.16, 0.8, 6), M, (g) => g.rotateX(-2.4).translate(0, 1.45, -1.05));
  for (const [x, z, a] of [[-0.2, 0.5, 0.9], [0.2, 0.55, 0.5], [-0.2, -0.5, -0.6], [0.2, -0.55, -0.25]]) add(new THREE.CylinderGeometry(0.075, 0.06, 0.95, 6), W, (g) => g.translate(0, -0.45, 0).rotateX(a).translate(x, 1.4, z));
  return mergeGeometries(parts);
}

export class Carousel {
  constructor(scene, at, q) {
    const grp = this.grp = new THREE.Group(); grp.position.set(at.x, 0, at.z); scene.add(grp);
    const gold = new THREE.MeshStandardMaterial({ color: '#d9a94e', roughness: 0.3, metalness: 0.9, emissive: '#3a2408', emissiveIntensity: 0.8 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(10.4, 10.8, 0.7, 48), snowable(new THREE.MeshStandardMaterial({ color: '#3a2a3e', roughness: 0.6 })));
    base.position.y = 0.35; grp.add(base);
    const rot = this.rot = new THREE.Group(); grp.add(rot);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(9.8, 9.8, 0.18, 48), new THREE.MeshStandardMaterial({ color: '#6a3a2a', roughness: 0.5 })); deck.position.y = 0.8; rot.add(deck);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 7, 12), new THREE.MeshStandardMaterial({ color: '#ffe8c0', emissive: '#ffb860', emissiveIntensity: 1.1, roughness: 0.2, metalness: 0.4 })); col.position.y = 4.3; rot.add(col);
    const roofTex = stripeTex('#f4ead8', '#c8264a', 24);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(11.4, 4.2, 24, 1, true), snowable(new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.6, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: roofTex, emissiveIntensity: 0.18 }), 1.2));
    roof.position.y = 9.9; rot.add(roof);
    const val = new THREE.Mesh(new THREE.CylinderGeometry(11.0, 11.0, 1.3, 48, 1, true), new THREE.MeshStandardMaterial({ map: stripeTex('#d9a94e', '#7a1830', 48), side: THREE.DoubleSide, roughness: 0.5, metalness: 0.3 }));
    val.position.y = 7.6; rot.add(val);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), gold); crown.position.y = 12.3; rot.add(crown);
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.2, 8), gold); flag.position.y = 13.4; rot.add(flag);
    // 木馬與柱子
    const slots = [];
    for (let i = 0; i < 12; i++) slots.push([(i / 12) * TAU, 7.6]);
    for (let i = 0; i < 8; i++) slots.push([(i / 8) * TAU + 0.2, 4.9]);
    this.slots = slots;
    this.horses = new THREE.InstancedMesh(horseGeo(), snowable(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.1 }), 0.3), slots.length);
    const c = new THREE.Color();
    slots.forEach((s, i) => { const h = hsv(i * 0.13, 0.25, 1); c.setRGB(h[0], h[1], h[2]); this.horses.setColorAt(i, c); });
    this.poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.06, 6.6, 6).translate(0, 4.1, 0), gold, slots.length);
    const m4 = new THREE.Matrix4();
    slots.forEach(([a, r], i) => { m4.makeTranslation(Math.cos(a) * r, 0, Math.sin(a) * r); this.poles.setMatrixAt(i, m4); });
    rot.add(this.horses, this.poles);
    // 燈泡
    const pos = [], cl = [], ph = [];
    for (let k = 0; k < 96; k++) { const a = (k / 96) * TAU; for (const y of [7.05, 8.15]) { pos.push(Math.cos(a) * 11.15, y, Math.sin(a) * 11.15); cl.push(...hex(k % 2 ? '#ffe6a8' : '#ffb35a', 2.7)); ph.push(k); } }
    for (let r = 0; r < 24; r++) { const a = (r / 24) * TAU; for (let k = 1; k < 10; k++) { const t = k / 10; pos.push(Math.cos(a) * 11.2 * (1 - t), 7.9 + t * 4.15, Math.sin(a) * 11.2 * (1 - t)); cl.push(...hex('#fff0c8', 2.4)); ph.push(k * 3 + r); } }
    rot.add(glowPoints(pos, cl, 0.38, { attrs: 'attribute float ph;', fn: 'col *= 0.55 + 0.45 * step(0.5, fract(uTime * 1.1 + ph * 0.25));', extra: { ph: { data: ph, size: 1 } } }));
    if (q.tier !== 'low') { const l = new THREE.PointLight('#ffb870', 90, 34, 1.1); l.position.set(0, 5.4, 0); grp.add(l); }
    this.ang = 0;
  }
  update(t, dt) {
    this.ang += dt * 0.32;
    this.rot.rotation.y = this.ang;
    const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), qq = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    this.slots.forEach(([a, r], i) => {
      p.set(Math.cos(a) * r, 0.25 + Math.sin(t * 2.1 + i * 1.7) * 0.42, Math.sin(a) * r);
      qq.setFromAxisAngle(up, -a + Math.PI);
      m4.compose(p, qq, s); this.horses.setMatrixAt(i, m4);
    });
    this.horses.instanceMatrix.needsUpdate = true;
  }
}

export class Swing {
  constructor(scene, at, q) {
    const grp = this.grp = new THREE.Group(); grp.position.set(at.x, 0, at.z); scene.add(grp);
    const steel = snowable(new THREE.MeshStandardMaterial({ color: '#d6dbe6', roughness: 0.35, metalness: 0.8 }));
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.6, 1.2, 24), snowable(new THREE.MeshStandardMaterial({ color: '#283048' }))); base.position.y = 0.6; grp.add(base);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 15, 16), steel); mast.position.y = 7.5; grp.add(mast);
    const top = this.top = new THREE.Group(); top.position.y = 15; grp.add(top);
    const spin = this.spin = new THREE.Group(); top.add(spin);
    const ct = stripeTex('#38c8ff', '#f4f6ff', 20);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(7.4, 2.8, 20, 1, true), snowable(new THREE.MeshStandardMaterial({ map: ct, side: THREE.DoubleSide, roughness: 0.6, emissive: '#fff', emissiveMap: ct, emissiveIntensity: 0.15 }), 1.2));
    canopy.position.y = 1.6; spin.add(canopy);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.18, 6, 48), steel); ring.rotation.x = Math.PI / 2; spin.add(ring);
    const pos = [], cl = [];
    for (let k = 0; k < 64; k++) { const a = (k / 64) * TAU; pos.push(Math.cos(a) * 7.45, 0.25, Math.sin(a) * 7.45); cl.push(...hex(k % 2 ? '#7fe8ff' : '#ffffff', 2.6)); }
    for (let r = 0; r < 16; r++) { const a = (r / 16) * TAU; for (let k = 1; k < 8; k++) { const t = k / 8; pos.push(Math.cos(a) * 7.3 * (1 - t), 0.25 + t * 2.75, Math.sin(a) * 7.3 * (1 - t)); cl.push(...hex('#bff4ff', 2.2)); } }
    spin.add(glowPoints(pos, cl, 0.4, { fn: 'col *= 0.5 + 0.5 * sin(uTime * 4.0 + atan(pos.z, pos.x) * 6.0);' }));
    this.n = 16; this.L = 7.5; this.R0 = 6.2;
    const seatG = mergeGeometries([
      colorize(new THREE.BoxGeometry(0.8, 0.12, 0.7), '#e8e8f0'),
      colorize(new THREE.BoxGeometry(0.8, 0.7, 0.1).translate(0, 0.35, -0.32), '#e8e8f0'),
      colorize(new THREE.CapsuleGeometry(0.2, 0.4, 3, 8).translate(0, 0.42, 0), '#2a3a5a'),
      colorize(new THREE.SphereGeometry(0.16, 8, 6).translate(0, 0.9, 0.02), '#c9a088'),
    ]);
    this.chairs = new THREE.InstancedMesh(seatG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), this.n);
    const c = new THREE.Color(); for (let i = 0; i < this.n; i++) { const h = hsv(i / this.n, 0.6, 1); c.setRGB(h[0], h[1], h[2]); this.chairs.setColorAt(i, c); }
    grp.add(this.chairs);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.n * 12), 3));
    this.chains = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#9aa3b8' })); this.chains.frustumCulled = false;
    grp.add(this.chains);
    this.ang = 0; this.w = 0; this.theta = 0; this.cycle = 8;
  }
  update(t, dt) {
    this.cycle = (this.cycle + dt) % 44;
    const k = this.cycle, wMax = 1.35;
    const target = k < 6 ? 0 : k < 14 ? wMax * smooth(6, 14, k) : k < 34 ? wMax : k < 41 ? wMax * (1 - smooth(34, 41, k)) : 0;
    this.w += (target - this.w) * Math.min(1, dt * 2);
    this.ang += this.w * dt;
    // tanθ = ω²·r／g，r 又跟 θ 有關：迭代幾次就收斂
    let th = this.theta;
    for (let i = 0; i < 4; i++) { const r = this.R0 + this.L * Math.sin(th); th = Math.atan((this.w * this.w * r) / 9.81); }
    this.theta += (th - this.theta) * Math.min(1, dt * 1.5);
    this.spin.rotation.y = this.ang;
    this.top.rotation.x = Math.sin(t * 0.5) * 0.08 * (this.w / wMax);
    this.top.rotation.z = Math.cos(t * 0.5) * 0.08 * (this.w / wMax);
    this.top.updateMatrixWorld();
    const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), a = new THREE.Vector3(), qq = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1);
    const arr = this.chains.geometry.attributes.position.array, inv = new THREE.Matrix4().copy(this.grp.matrixWorld).invert();
    for (let i = 0; i < this.n; i++) {
      const ang = this.ang + (i / this.n) * TAU, st = Math.sin(this.theta), ct2 = Math.cos(this.theta);
      a.set(Math.cos(ang) * this.R0, 0, Math.sin(ang) * this.R0).applyMatrix4(this.top.matrixWorld).applyMatrix4(inv);
      p.set(a.x + Math.cos(ang) * this.L * st, a.y - this.L * ct2, a.z + Math.sin(ang) * this.L * st);
      e.set(0, -ang + Math.PI / 2, 0, 'YXZ'); qq.setFromEuler(e);
      const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.sin(ang), 0, -Math.cos(ang)), -this.theta);
      qq.premultiply(tilt);
      m4.compose(p, qq, s); this.chairs.setMatrixAt(i, m4);
      const side = new THREE.Vector3(-Math.sin(ang) * 0.35, 0, Math.cos(ang) * 0.35);
      for (let j = 0; j < 2; j++) { const sg = j ? 1 : -1, o = i * 12 + j * 6; arr[o] = a.x + side.x * sg; arr[o + 1] = a.y; arr[o + 2] = a.z + side.z * sg; arr[o + 3] = p.x + side.x * sg; arr[o + 4] = p.y + 0.6; arr[o + 5] = p.z + side.z * sg; }
    }
    this.chairs.instanceMatrix.needsUpdate = true; this.chains.geometry.attributes.position.needsUpdate = true;
  }
}

const TOWER_V = `attribute float s; varying float vS; void main(){ vS = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const TOWER_F = `varying float vS; uniform float uTime, uPhase;
void main(){ float c = pow(0.5 + 0.5 * sin(vS * 0.5 - uTime * 6.0 + uPhase), 3.0); gl_FragColor = vec4(mix(vec3(1.0,0.15,0.35), vec3(1.0,0.75,0.3), c) * (0.5 + 2.6 * c), 1.0); }`;

export class Tower {
  constructor(scene, at, q, U) {
    const grp = this.grp = new THREE.Group(); grp.position.set(at.x, 0, at.z); scene.add(grp);
    this.H = 64;
    const steel = snowable(new THREE.MeshStandardMaterial({ color: '#2a2e3a', roughness: 0.45, metalness: 0.8 }), 0.5);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(3.2, this.H, 3.2), steel); shaft.position.y = this.H / 2; grp.add(shaft);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.22, this.H - 4, 0.22), new THREE.ShaderMaterial({ vertexShader: TOWER_V, fragmentShader: TOWER_F, uniforms: { uTime: U.uTime, uPhase: { value: i * 1.6 } } }));
      strip.position.set(Math.cos(a) * 2.3, this.H / 2, Math.sin(a) * 2.3); grp.add(strip);
    }
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 3, 3.5, 16), steel); crown.position.y = this.H + 1.4; grp.add(crown);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 1, 24), snowable(new THREE.MeshStandardMaterial({ color: '#3a2a3a' }))); base.position.y = 0.5; grp.add(base);
    const pos = [], cl = [];
    for (let k = 0; k < 48; k++) { const a = (k / 48) * TAU; for (const y of [this.H, this.H + 2.8]) { pos.push(Math.cos(a) * 4.25, y, Math.sin(a) * 4.25); cl.push(...hex(k % 2 ? '#ff4a7a' : '#ffd27a', 2.6)); } }
    grp.add(glowPoints(pos, cl, 0.55, { fn: 'col *= 0.5 + 0.5 * step(0.5, fract(uTime * 1.5 + atan(pos.z, pos.x) * 1.27));' }));
    grp.add(glowPoints([0, this.H + 4, 0], [6, 0.3, 0.2], 2.2, { fn: 'col *= step(0.6, fract(uTime * 0.8));' }));
    // 座椅環
    const car = this.car = new THREE.Group(); grp.add(car);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.7, 1.4, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#d0d4e0', metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide })); car.add(ring);
    const seats = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; seats.push(colorize(new THREE.BoxGeometry(0.8, 1.4, 0.3).translate(0, 0.1, 0.25).rotateY(-a + Math.PI / 2).translate(Math.cos(a) * 3.9, 0, Math.sin(a) * 3.9), '#c4203a')); seats.push(colorize(new THREE.SphereGeometry(0.17, 8, 6).translate(Math.cos(a) * 4.2, 0.55, Math.sin(a) * 4.2), '#c9a088')); }
    car.add(new THREE.Mesh(mergeGeometries(seats), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 })));
    const rp = [], rc = [];
    for (let k = 0; k < 40; k++) { const a = (k / 40) * TAU; rp.push(Math.cos(a) * 3.75, -0.75, Math.sin(a) * 3.75); rc.push(...hex('#ffffff', 2.4)); }
    car.add(glowPoints(rp, rc, 0.4, { fn: 'col = mix(vec3(2.6,0.4,0.9), vec3(0.4,2.4,2.8), step(0.5, fract(uTime * 3.0 + pos.x)));' }));
    this.t = 0; this.y = 1.5; this.vy = 0;
    this.seatAng = Math.atan2(-125 - at.z, 10 - at.x); // 乘客面向園區中心、湖
  }
  update(t, dt) {
    this.t = (this.t + dt) % 36;
    const k = this.t, top = this.H - 7, low = 1.5;
    let y;
    if (k < 6) y = low;
    else if (k < 20) y = low + (top - low) * smooth(6, 20, k);
    else if (k < 24) y = top + Math.sin((k - 20) * 3) * 0.08;
    else {
      const f = k - 24, freeT = Math.sqrt((2 * (top - 16)) / 9.81);
      if (f < freeT) y = top - 0.5 * 9.81 * f * f;
      else { const b = f - freeT, vb = 9.81 * freeT, dec = (vb * vb) / (2 * 13); const tb = vb / dec; y = b < tb ? 16 - (vb * b - 0.5 * dec * b * b) : Math.max(low, 3 - (b - tb) * 0.6); }
    }
    this.vy = (y - this.y) / Math.max(dt, 1e-3);
    this.y = y;
    this.car.position.y = y;
  }
}
