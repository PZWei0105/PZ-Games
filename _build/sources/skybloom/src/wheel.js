// 摩天輪：上千顆燈泡會換花樣，32 個車廂永遠保持水平
import * as THREE from 'three';
import { glowPoints, snowable } from './glow.js';
import { TAU, hsv } from './util.js';

export const WHEEL = { R: 23, hubY: 27, n: 32, period: 110 };

// 燈泡花樣：每 9 秒換一種，交叉淡入
const PATTERN = `
  float tt = uTime;
  float slot = floor(tt / 9.0), fr = fract(tt / 9.0);
  float pA = mod(slot, 6.0), pB = mod(slot + 1.0, 6.0);
  float mixk = smoothstep(0.82, 1.0, fr);
  vec3 cA = wheelPat(pA, tt), cB = wheelPat(pB, tt);
  col = mix(cA, cB, mixk);
  sz = size;
`;
const HELP = `
attribute float ang; attribute float rad; attribute float idx;
vec3 hue2(float h){ vec3 k = clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1., 0., 1.); return k*k; }
float hs(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
vec3 wheelPat(float p, float t){
  float a = ang / 6.28318;
  if (p < 0.5) return hue2(fract(a + t * 0.08 + rad * 0.15)) * 2.8;                                  // 彩虹轉圈
  if (p < 1.5) { float w = fract(rad * 2.2 - t * 0.7); return mix(vec3(1.0,0.35,0.85), vec3(0.3,0.9,1.0), step(0.5, fract(rad*1.1 - t*0.35))) * (0.25 + 2.8 * smoothstep(0.75, 1.0, w)); } // 由內往外的波
  if (p < 2.5) { float s = step(0.86, hs(idx + floor(t * 9.0))); return vec3(1.0, 0.78, 0.42) * (0.55 + 3.2 * s); }               // 金色閃爍
  if (p < 3.5) return hue2(fract(a * 2.0 - rad * 0.8 - t * 0.22)) * 2.8;                             // 螺旋
  if (p < 4.5) { float k = mod(floor(a * 32.0 + t * 5.0), 2.0); return mix(vec3(1.0,0.25,0.65), vec3(0.25,0.85,1.0), k) * 2.6; } // 雙色追逐
  float beat = pow(1.0 - fract(t * 1.6), 3.0); return hue2(fract(t * 0.03 + a * 0.25)) * (0.8 + 2.6 * beat * step(0.5, fract(a * 8.0 + rad))); // 節拍
}`;

export class Wheel {
  constructor(scene, at, q) {
    const { R, hubY, n } = WHEEL;
    this.grp = new THREE.Group();
    this.grp.position.set(at.x, 0, at.z);
    this.grp.rotation.y = at.rotY;
    scene.add(this.grp);
    const steel = snowable(new THREE.MeshStandardMaterial({ color: '#d8dce6', roughness: 0.35, metalness: 0.75 }), 0.5);
    const dark = snowable(new THREE.MeshStandardMaterial({ color: '#30333c', roughness: 0.5, metalness: 0.6 }));
    // 腳架：兩組 A 字
    const leg = (a, b, r) => {
      const d = new THREE.Vector3().subVectors(b, a), len = d.length();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.2, len, 8), steel);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      this.grp.add(m);
    };
    const hub = new THREE.Vector3(0, hubY, 0);
    for (const z of [-3.2, 3.2]) {
      for (const x of [-10.5, 10.5]) leg(new THREE.Vector3(x, 0, z * 1.6), new THREE.Vector3(0, hubY, z), 0.42);
      leg(new THREE.Vector3(-6, 12, z * 1.35), new THREE.Vector3(6, 12, z * 1.35), 0.22);
    }
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 7.4, 16), dark); axle.rotation.x = Math.PI / 2; axle.position.copy(hub); this.grp.add(axle);
    // 底座與售票亭
    const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 0.6, 32), dark); base.position.y = 0.3; this.grp.add(base);
    const booth = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 3), snowable(new THREE.MeshStandardMaterial({ color: '#58306a' }))); booth.position.set(0, 1.9, 6); this.grp.add(booth);

    // 轉動的部分
    const rot = this.rot = new THREE.Group(); rot.position.copy(hub); this.grp.add(rot);
    for (const z of [-2.1, 2.1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.28, 6, 160), steel); rim.position.z = z; rot.add(rim);
      const rim2 = new THREE.Mesh(new THREE.TorusGeometry(R * 0.9, 0.16, 5, 140), steel); rim2.position.z = z; rot.add(rim2);
      const inner = new THREE.Mesh(new THREE.TorusGeometry(R * 0.28, 0.2, 6, 64), steel); inner.position.z = z; rot.add(inner);
    }
    // 輻條（雙面）＋橫樑
    const sp = new THREE.CylinderGeometry(0.09, 0.09, R * 0.72, 4); sp.translate(0, R * 0.28 + R * 0.36, 0);
    const spokes = new THREE.InstancedMesh(sp, steel, n * 2);
    const cross = new THREE.CylinderGeometry(0.12, 0.12, 4.2, 5); cross.rotateX(Math.PI / 2);
    const crosses = new THREE.InstancedMesh(cross, steel, n);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), zAx = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      for (let s = 0; s < 2; s++) {
        const tilt = (s ? 1 : -1) * 0.06;
        q4.setFromAxisAngle(zAx, a - Math.PI / 2 + tilt);
        m4.makeRotationFromQuaternion(q4).setPosition(0, 0, s ? 2.1 : -2.1);
        spokes.setMatrixAt(i * 2 + s, m4);
      }
      m4.makeTranslation(Math.cos(a) * R, Math.sin(a) * R, 0); crosses.setMatrixAt(i, m4);
    }
    rot.add(spokes, crosses);
    // 燈泡
    const pos = [], col = [], ang = [], rad = [], idx = [], szs = [];
    let k = 0;
    const bulb = (x, y, z, r, s = 0.5) => { pos.push(x, y, z); col.push(1, 1, 1); ang.push((Math.atan2(y, x) + TAU) % TAU); rad.push(r); idx.push(k++); szs.push(s); };
    const rimN = q.tier === 'low' ? 140 : 220;
    for (const z of [-2.35, 2.35]) {
      for (let i = 0; i < rimN; i++) { const a = (i / rimN) * TAU; bulb(Math.cos(a) * R, Math.sin(a) * R, z, 1, 0.55); }
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        for (let j = 0; j < 9; j++) { const r = R * (0.3 + 0.68 * (j / 8)); bulb(Math.cos(a) * r, Math.sin(a) * r, z * 1.02, r / R, 0.42); }
      }
      for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU; bulb(Math.cos(a) * R * 0.28, Math.sin(a) * R * 0.28, z, 0.28, 0.5); }
    }
    // 中心的星
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; for (let j = 1; j <= 5; j++) bulb(Math.cos(a) * j * 0.95, Math.sin(a) * j * 0.95, 3.75, j * 0.04, 0.5); }
    const extra = { ang: { data: ang, size: 1 }, rad: { data: rad, size: 1 }, idx: { data: idx, size: 1 } };
    this.bulbs = glowPoints(pos, col, szs, { attrs: HELP, fn: PATTERN, extra, withReflect: true });
    rot.add(this.bulbs);
    scene.add(this.bulbs.userData.reflection);
    this.bulbs.userData.reflection.matrixAutoUpdate = false;

    // 車廂
    const cab = new THREE.CylinderGeometry(1.25, 1.1, 2.3, 12); cab.translate(0, -1.25, 0);
    const roof = new THREE.ConeGeometry(1.35, 0.9, 12); roof.translate(0, 0.25, 0);
    const hang = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 4); hang.translate(0, 0.8, 0);
    this.cabs = new THREE.InstancedMesh(cab, snowable(new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 })), n);
    this.roofs = new THREE.InstancedMesh(roof, snowable(new THREE.MeshStandardMaterial({ color: '#e8e8f0', roughness: 0.4, metalness: 0.5 })), n);
    this.hangs = new THREE.InstancedMesh(hang, dark, n);
    const win = new THREE.CylinderGeometry(1.27, 1.14, 0.75, 12, 1, true); win.translate(0, -1.0, 0);
    this.wins = new THREE.InstancedMesh(win, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.0, 0.65), side: THREE.DoubleSide }), n);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) { const h = hsv(i / n, 0.55, 0.95); c.setRGB(h[0], h[1], h[2]); this.cabs.setColorAt(i, c); }
    this.grp.add(this.cabs, this.roofs, this.hangs, this.wins);
    this.angle = 0;
    this.light = new THREE.PointLight('#ff6ad5', q.tier === 'low' ? 0 : 60, 70, 1.2);
    this.light.position.set(0, hubY, 5);
    if (q.tier !== 'low') this.grp.add(this.light);
    this.tmp = { m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(1, 1, 1), z: new THREE.Vector3(0, 0, 0), e: new THREE.Euler() };
    this.hide = -1;
  }
  // 第 i 個車廂的位置（在 grp 座標裡）
  cabPos(i, out) {
    const a = this.angle + (i / WHEEL.n) * TAU;
    return out.set(Math.cos(a) * WHEEL.R, WHEEL.hubY + Math.sin(a) * WHEEL.R, 0);
  }
  // 正在往上升、快到頂的那一節車廂
  bestCab() { let best = 0, bd = 9; for (let i = 0; i < WHEEL.n; i++) { let a = (this.angle + (i / WHEEL.n) * TAU) % TAU; if (a < 0) a += TAU; const d = Math.abs(a - (Math.PI - 0.55)); if (d < bd) { bd = d; best = i; } } return best; }
  update(t, dt) {
    this.angle -= (TAU / WHEEL.period) * dt;
    this.rot.rotation.z = this.angle;
    const T = this.tmp;
    for (let i = 0; i < WHEEL.n; i++) {
      this.cabPos(i, T.p);
      T.e.set(0, 0, Math.sin(t * 0.8 + i) * 0.025); T.q.setFromEuler(T.e);
      T.m.compose(T.p, T.q, i === this.hide ? T.z : T.s);
      this.cabs.setMatrixAt(i, T.m); this.roofs.setMatrixAt(i, T.m); this.hangs.setMatrixAt(i, T.m); this.wins.setMatrixAt(i, T.m);
    }
    for (const im of [this.cabs, this.roofs, this.hangs, this.wins]) im.instanceMatrix.needsUpdate = true;
    // 倒影跟著輪子轉
    this.bulbs.updateWorldMatrix(true, false);
    this.bulbs.userData.reflection.matrix.copy(this.bulbs.matrixWorld);
    this.bulbs.userData.reflection.matrixWorld.copy(this.bulbs.matrixWorld);
    const h = (t * 0.05) % 1, c = hsv(h, 0.7, 1);
    this.light.color.setRGB(c[0], c[1], c[2]);
  }
}
