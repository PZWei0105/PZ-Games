// 雲霄飛車：軌道、霓虹、支柱、列車與真實的能量守恆（上坡鏈條、下坡加速、迴圈、進站煞車）
import * as THREE from 'three';
import { snowable, glowPoints } from './glow.js';
import { clamp, hex, canvasTex } from './util.js';

const CP = [
  [-35, 4, 40], [-35, 4, 20], [-35, 6.5, 6], [-35, 37, -29], [-34, 40.5, -35.5], [-30, 38, -42], [-20, 21, -51], [-6, 3.4, -55], [12, 3, -55],
  [26, 3.3, -55.2], [38.5, 6.2, -55.8], [43, 15, -56.4], [39.5, 23.6, -57.0], [31, 27, -57.6], [22.5, 23.6, -58.2], [19, 15, -58.8], [22.5, 6.4, -59.4], [33, 3.2, -60],
  [48, 3, -60.5], [62, 6, -54], [70, 11, -40], [68, 15, -22], [56, 17, -12], [40, 13, -8],
  [26, 19, 4], [12, 8, 20], [2, 5, 32], [-8, 7, 48], [-20, 6, 58], [-31, 4.5, 56],
];
const G = 9.81, CAR_GAP = 2.9, CARS = 5;

const NEON_V = `attribute float s; varying float vS; void main(){ vS = s; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const NEON_F = `varying float vS; uniform float uTime, uSide;
vec3 hue(float h){ vec3 k = clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1., 0., 1.); return k*k; }
void main(){ float h = fract(vS / 90.0 - uTime * 0.06 + uSide * 0.5); float chase = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(vS * 0.9 - uTime * 7.0), 2.0); gl_FragColor = vec4(hue(h) * 2.4 * chase, 1.0); }`;

export class Coaster {
  constructor(scene, at, q, U) {
    this.o = new THREE.Vector3(at.x, 0, at.z);
    const curve = this.curve = new THREE.CatmullRomCurve3(CP.map((p) => new THREE.Vector3(p[0] + at.x, p[1], p[2] + at.z)), true, 'centripetal');
    const len = this.len = curve.getLength();
    const N = this.N = Math.ceil(len / 0.25), ds = this.ds = len / N;
    const P = this.P = new Float32Array(N * 3), T = this.T = new Float32Array(N * 3), Nn = this.Nn = new Float32Array(N * 3), B = this.B = new Float32Array(N * 3);
    const v = new THREE.Vector3(), t = new THREE.Vector3();
    for (let i = 0; i < N; i++) { curve.getPointAt(i / N, v); curve.getTangentAt(i / N, t); v.toArray(P, i * 3); t.toArray(T, i * 3); }
    // 平行移動的法線（不會在迴圈裡亂轉），最後把首尾的誤差平均分掉
    const up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3(), t0 = new THREE.Vector3(), t1 = new THREE.Vector3(), ax = new THREE.Vector3(), qq = new THREE.Quaternion();
    t0.fromArray(T, 0); n.copy(up).addScaledVector(t0, -t0.dot(up)).normalize(); n.toArray(Nn, 0);
    const transport = (ta, tb, nv) => { ax.crossVectors(ta, tb); const s = ax.length(); if (s > 1e-7) { const ang = Math.atan2(s, ta.dot(tb)); qq.setFromAxisAngle(ax.divideScalar(s), ang); nv.applyQuaternion(qq); } nv.addScaledVector(tb, -tb.dot(nv)).normalize(); };
    for (let i = 1; i < N; i++) { t0.fromArray(T, (i - 1) * 3); t1.fromArray(T, i * 3); transport(t0, t1, n); n.toArray(Nn, i * 3); }
    t0.fromArray(T, (N - 1) * 3); t1.fromArray(T, 0); const nEnd = n.clone(); transport(t0, t1, nEnd);
    const n0 = new THREE.Vector3().fromArray(Nn, 0);
    const twist = Math.atan2(t1.dot(new THREE.Vector3().crossVectors(nEnd, n0)), nEnd.dot(n0));
    // 傾斜（bank）：彎道往內倒，速度越快倒越多
    const roll = new Float32Array(N), ideal = new THREE.Vector3(), K = new THREE.Vector3(), ta = new THREE.Vector3(), tb = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      t1.fromArray(T, i * 3); n.fromArray(Nn, i * 3); qq.setFromAxisAngle(t1, (twist * i) / N); n.applyQuaternion(qq); n.toArray(Nn, i * 3);
      ta.fromArray(T, ((i - 4 + N) % N) * 3); tb.fromArray(T, ((i + 4) % N) * 3); K.subVectors(tb, ta).divideScalar(8 * ds);
      const y = P[i * 3 + 1], v2 = Math.max(8, 2 * G * (41 - y) * 0.85);
      K.y = 0;
      ideal.set(0, G, 0).addScaledVector(K, v2); ideal.addScaledVector(t1, -t1.dot(ideal)).normalize();
      const w = clamp((n.y - 0.6) / 0.3, 0, 1);
      const r = Math.atan2(t1.dot(new THREE.Vector3().crossVectors(n, ideal)), n.dot(ideal));
      roll[i] = clamp(r, -1.1, 1.1) * w;
    }
    const W = Math.round(10 / ds), sm = new Float32Array(N);
    for (let i = 0; i < N; i++) { let s = 0; for (let k = -W; k <= W; k++) s += roll[(i + k + N) % N]; sm[i] = s / (2 * W + 1); }
    for (let i = 0; i < N; i++) { t1.fromArray(T, i * 3); n.fromArray(Nn, i * 3); qq.setFromAxisAngle(t1, sm[i]); n.applyQuaternion(qq); n.toArray(Nn, i * 3); ax.crossVectors(t1, n).toArray(B, i * 3); }
    // 每個控制點在軌道上的位置（公尺）
    this.sAt = CP.map((c) => { let best = 0, bd = 1e9; for (let i = 0; i < N; i++) { const d = (P[i * 3] - c[0] - at.x) ** 2 + (P[i * 3 + 1] - c[1]) ** 2 + (P[i * 3 + 2] - c[2] - at.z) ** 2; if (d < bd) { bd = d; best = i; } } return best * ds; });
    this.liftA = this.sAt[2] - 2; this.liftB = this.sAt[4] - 1;
    this.sStop = this.sAt[1] - 3;
    this.build(scene, q, U);
    // 列車狀態
    this.s = this.sStop; this.v = 0; this.state = 'dwell'; this.timer = 3;
  }

  // 取得 s 公尺處的位置與座標軸（內插）
  frame(s, P, T, N) {
    const L = this.len; s = ((s % L) + L) % L;
    const f = s / this.ds, i = Math.floor(f) % this.N, j = (i + 1) % this.N, k = f - Math.floor(f);
    const A = this.P, a = i * 3, b = j * 3;
    P.set(A[a] + (A[b] - A[a]) * k, A[a + 1] + (A[b + 1] - A[a + 1]) * k, A[a + 2] + (A[b + 2] - A[a + 2]) * k);
    if (T) T.set(this.T[a] + (this.T[b] - this.T[a]) * k, this.T[a + 1] + (this.T[b + 1] - this.T[a + 1]) * k, this.T[a + 2] + (this.T[b + 2] - this.T[a + 2]) * k).normalize();
    if (N) N.set(this.Nn[a] + (this.Nn[b] - this.Nn[a]) * k, this.Nn[a + 1] + (this.Nn[b + 1] - this.Nn[a + 1]) * k, this.Nn[a + 2] + (this.Nn[b + 2] - this.Nn[a + 2]) * k).normalize();
  }

  build(scene, q, U) {
    const { N, P, Nn, B } = this;
    const grp = this.grp = new THREE.Group(); scene.add(grp);
    // 管子：沿著軌道，在 (b, n) 平面上偏移
    const tube = (ob, on, r, seg, step = 2, withS = false) => {
      const rows = Math.ceil(N / step) + 1, pos = [], nor = [], sArr = [], idx = [];
      const c = new THREE.Vector3(), nb = new THREE.Vector3(), nn = new THREE.Vector3(), d = new THREE.Vector3();
      for (let r0 = 0; r0 < rows; r0++) {
        const i = (r0 * step) % N;
        nn.fromArray(Nn, i * 3); nb.fromArray(B, i * 3);
        c.fromArray(P, i * 3).addScaledVector(nb, ob).addScaledVector(nn, on);
        for (let k = 0; k < seg; k++) {
          const a = (k / seg) * Math.PI * 2;
          d.copy(nb).multiplyScalar(Math.cos(a)).addScaledVector(nn, Math.sin(a));
          pos.push(c.x + d.x * r, c.y + d.y * r, c.z + d.z * r); nor.push(d.x, d.y, d.z); sArr.push(r0 * step * this.ds);
        }
      }
      for (let r0 = 0; r0 < rows - 1; r0++) for (let k = 0; k < seg; k++) { const a = r0 * seg + k, b2 = r0 * seg + ((k + 1) % seg), c2 = a + seg, d2 = b2 + seg; idx.push(a, c2, b2, b2, c2, d2); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      if (withS) g.setAttribute('s', new THREE.Float32BufferAttribute(sArr, 1));
      g.setIndex(idx);
      return g;
    };
    const steel = snowable(new THREE.MeshStandardMaterial({ color: '#eef0f4', roughness: 0.3, metalness: 0.8 }), 0.6);
    const red = snowable(new THREE.MeshStandardMaterial({ color: '#c4203a', roughness: 0.35, metalness: 0.6 }), 0.6);
    grp.add(new THREE.Mesh(tube(0.56, -0.05, 0.11, 8), steel), new THREE.Mesh(tube(-0.56, -0.05, 0.11, 8), steel), new THREE.Mesh(tube(0, -0.62, 0.26, 8), red));
    // 霓虹：沿著兩條軌道外側
    this.neonU = { uTime: U.uTime, uSide: { value: 0 } };
    const nm = (side) => new THREE.ShaderMaterial({ vertexShader: NEON_V, fragmentShader: NEON_F, uniforms: { uTime: U.uTime, uSide: { value: side } } });
    grp.add(new THREE.Mesh(tube(0.72, -0.12, 0.05, 4, 2, true), nm(0)), new THREE.Mesh(tube(-0.72, -0.12, 0.05, 4, 2, true), nm(1)));
    // 枕木
    const tieStep = Math.round(1.1 / this.ds), nt = Math.floor(N / tieStep);
    const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(1.35, 0.1, 0.18).translate(0, -0.14, 0), red, nt);
    const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), t = new THREE.Vector3(), nn = new THREE.Vector3(), xb = new THREE.Vector3();
    for (let k = 0; k < nt; k++) {
      const i = k * tieStep; p.fromArray(P, i * 3); t.fromArray(this.T, i * 3); nn.fromArray(Nn, i * 3); xb.crossVectors(nn, t);
      m4.makeBasis(xb, nn, t).setPosition(p); ties.setMatrixAt(k, m4);
    }
    grp.add(ties);
    // 支柱
    const cols = [];
    const colStep = Math.round(4.5 / this.ds);
    for (let i = 0; i < N; i += colStep) { const y = P[i * 3 + 1], ny = Nn[i * 3 + 1]; if (y > 1.6 && ny > 0.55) cols.push(i); }
    const colGeo = new THREE.CylinderGeometry(0.2, 0.28, 1, 6).translate(0, 0.5, 0);
    const ci = new THREE.InstancedMesh(colGeo, steel, cols.length + 8);
    const sc = new THREE.Vector3(), qI = new THREE.Quaternion();
    cols.forEach((i, k) => { p.fromArray(P, i * 3); nn.fromArray(Nn, i * 3); const top = p.y - 0.7 * nn.y; sc.set(1, top, 1); m4.compose(new THREE.Vector3(p.x - nn.x * 0.7, 0, p.z - nn.z * 0.7), qI, sc); ci.setMatrixAt(k, m4); });
    // 迴圈兩側的斜撐
    let extra = cols.length;
    const loopC = new THREE.Vector3(31 + this.o.x, 15, -57.6 + this.o.z);
    for (const [dx, dz] of [[-9, 5], [9, 5], [-9, -5], [9, -5]]) {
      const top = new THREE.Vector3(loopC.x + dx * 0.9, 15, loopC.z + (dz > 0 ? 2.4 : -2.4)), bot = new THREE.Vector3(loopC.x + dx * 1.25, 0, loopC.z + dz * 1.6);
      const d = new THREE.Vector3().subVectors(top, bot), l = d.length();
      qI.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); sc.set(1.3, l, 1.3); m4.compose(bot, qI, sc); ci.setMatrixAt(extra++, m4);
    }
    qI.identity();
    ci.count = extra;
    grp.add(ci);
    // 車站
    const s0 = new THREE.Vector3(), s1 = new THREE.Vector3();
    this.frame(this.sAt[0] - 2, s0); this.frame(this.sAt[1] + 2, s1);
    const mid = s0.clone().add(s1).multiplyScalar(0.5), slen = s0.distanceTo(s1);
    const st = new THREE.Group(); st.position.set(mid.x, 0, mid.z); st.rotation.y = Math.atan2(s1.x - s0.x, s1.z - s0.z);
    const wood = snowable(new THREE.MeshStandardMaterial({ color: '#3a2f45', roughness: 0.6 }));
    const plat = new THREE.Mesh(new THREE.BoxGeometry(5, 3.0, slen + 4), wood); plat.position.set(-3.6, 1.5, 0); st.add(plat);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, slen + 8), snowable(new THREE.MeshStandardMaterial({ color: '#d02a50', roughness: 0.5 }))); roof.position.set(-1.6, 9.6, 0); st.add(roof);
    for (const z of [-slen / 2 - 2, 0, slen / 2 + 2]) for (const x of [-5.8, 3.2]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6.6, 6), steel); c.position.set(x, 6.4, z); st.add(c); }
    const signT = canvasTex(512, 128, (g, w, h) => { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 78px "Noto Sans TC",sans-serif'; g.shadowColor = '#3fe0ff'; g.shadowBlur = 16; g.fillStyle = '#d8faff'; g.fillText('流星號', w / 2, h / 2); }, {});
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: signT, transparent: true, color: new THREE.Color(2.4, 2.4, 2.4), side: THREE.DoubleSide, depthWrite: false }));
    sign.position.set(-1.6, 10.9, slen / 2 + 4.05); st.add(sign);
    const pos = [], col = [];
    for (let k = 0; k <= 30; k++) { const z = -slen / 2 - 4 + (k / 30) * (slen + 8); for (const x of [-6.6, 3.4]) { pos.push(x, 9.3, z); col.push(...hex(k % 2 ? '#7fe8ff' : '#ff6fd0', 2.6)); } }
    st.add(glowPoints(pos, col, 0.45, { fn: 'col *= 0.5 + 0.5 * step(0.5, fract(uTime * 2.0 + pos.z * 0.3));' }));
    grp.add(st);
    // 列車
    this.cars = [];
    const body = snowable(new THREE.MeshStandardMaterial({ color: '#ffb12a', roughness: 0.25, metalness: 0.55 }), 0.4);
    const seat = new THREE.MeshStandardMaterial({ color: '#1a1a22', roughness: 0.7 });
    const skin = new THREE.MeshStandardMaterial({ color: '#c9a088', roughness: 0.8 });
    for (let c = 0; c < CARS; c++) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.7, 2.4), body); b.position.y = 0.45; g.add(b);
      g.userData.fp = [];
      for (const z of [-0.45, 0.55]) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.16), seat); s.position.set(0, 1.05, z - 0.35); g.add(s); for (const x of [-0.35, 0.35]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), skin); h.position.set(x, 1.35, z - 0.15); g.add(h); if (z > 0) g.userData.fp.push(h); } }
      if (c === 0) { const nose = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.2, 4), body); nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 4; nose.scale.set(1, 1, 0.55); nose.position.set(0, 0.45, 1.75); g.add(nose); }
      const lp = [], lc = [];
      for (let k = 0; k < 6; k++) for (const x of [-0.8, 0.8]) { lp.push(x, 0.5, -1.0 + k * 0.4); lc.push(...hex(c % 2 ? '#7fe8ff' : '#ff6fd0', 2.4)); }
      if (c === 0) { lp.push(-0.45, 0.55, 2.2, 0.45, 0.55, 2.2); lc.push(4, 3.6, 3, 4, 3.6, 3); }
      const gl = glowPoints(lp, lc, 0.35); g.add(gl); g.userData.fp.push(gl);
      g.matrixAutoUpdate = false;
      grp.add(g); this.cars.push(g);
    }
    this.tmp = { P: new THREE.Vector3(), T: new THREE.Vector3(), N: new THREE.Vector3(), X: new THREE.Vector3(), m: new THREE.Matrix4() };
  }

  firstPerson(on) { for (const o of this.cars[0].userData.fp) o.visible = !on; }
  inLift(s) { return s > this.liftA && s < this.liftB; }
  update(dt) {
    const L = this.len, tmp = this.tmp;
    if (this.state === 'dwell') { this.v = 0; this.timer -= dt; if (this.timer <= 0) { this.state = 'run'; this.v = 2.2; this.trav = 0; } }
    else {
      const h = dt / 4;
      for (let k = 0; k < 4; k++) {
        this.frame(this.s, tmp.P, tmp.T);
        let a = -G * tmp.T.y - 0.0011 * this.v * this.v - 0.04;
        this.v += a * h;
        if (this.inLift(this.s)) this.v = Math.max(this.v, 4.6);
        // 進站：照距離慢慢煞
        const toStop = (this.sStop - this.s + L) % L;
        this.trav = (this.trav || 0) + this.v * h;
        if (toStop < 34 && this.trav > 60) {
          this.v = Math.min(this.v, Math.sqrt(2 * 2.6 * toStop) + 0.15);
          if (toStop < 0.2 || toStop > L - 1) { this.s = this.sStop; this.v = 0; this.state = 'dwell'; this.timer = 6; break; }
        }
        // 出站推送／後段的輪胎加速器，避免卡在半路
        this.v = Math.max(this.v, 2.4);
        this.s = (this.s + this.v * h) % L;
      }
    }
    // 車廂
    for (let c = 0; c < CARS; c++) {
      const s = this.s - c * CAR_GAP;
      this.frame(s, tmp.P, tmp.T, tmp.N);
      tmp.X.crossVectors(tmp.N, tmp.T);
      const car = this.cars[c];
      car.matrix.makeBasis(tmp.X, tmp.N, tmp.T).setPosition(tmp.P.x + tmp.N.x * 0.05, tmp.P.y + tmp.N.y * 0.05, tmp.P.z + tmp.N.z * 0.05);
      car.matrixWorldNeedsUpdate = true;
    }
  }
  // 乘坐時：G 力、目前高度
  gforce() {
    const tmp = this.tmp, a = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3(), p = new THREE.Vector3();
    this.frame(this.s - 2, p, a); this.frame(this.s + 2, p, b, n);
    const K = b.sub(a).divideScalar(4);
    return (this.v * this.v * K.dot(n) + G * n.y) / G;
  }
}
