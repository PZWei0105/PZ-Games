// 遊樂園的地面、湖、步道、路燈、樹、攤位、串燈、大門、噴泉、遊客、遠方城市與山
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { glowPoints, snowable, U } from './glow.js';
import { seeded, hsv, hex, canvasTex, TAU } from './util.js';

export const L = {
  lake: { x: 0, z: -82, rx: 74, rz: 32 },
  plaza: { x: 0, z: 12, r: 26 },
  wheel: { x: -62, z: -22, rotY: 0.34 },
  coaster: { x: 85, z: 30 },
  carousel: { x: -26, z: 48 },
  tower: { x: -108, z: 8 },
  swing: { x: -68, z: 76 },
  gate: { z: 134 },
  castle: { x: 0, z: -156 },
  stage: { z: -188, x: 92 },
  ext: 200, // 地面貼圖涵蓋 ±200 公尺
};

const inLake = (x, z, pad = 0) => ((x - L.lake.x) / (L.lake.rx + pad)) ** 2 + ((z - L.lake.z) / (L.lake.rz + pad)) ** 2 < 1;

// 步道（折線）：同時用來畫地面、放路燈、讓遊客走
function ellipsePts(cx, cz, rx, rz, n) { const a = []; for (let i = 0; i <= n; i++) { const t = (i / n) * TAU; a.push([cx + Math.cos(t) * rx, cz + Math.sin(t) * rz]); } return a; }
export const PATHS = [
  { w: 14, pts: [[0, 38], [0, 140]] },                                       // 大道
  { w: 7, pts: ellipsePts(0, -82, 84, 41, 48) },                            // 湖畔步道
  { w: 6, pts: [[0, -14], [0, -42]] },                                      // 廣場 → 湖
  { w: 8, pts: [[0, -123], [0, -128]] },                                    // 湖 → 星辰宮
  { w: 6, pts: [[-18, 2], [-40, -6], [-56, -10]] },                         // 廣場 → 摩天輪
  { w: 6, pts: [[20, 20], [36, 34], [44, 52], [44, 66]] },                  // 廣場 → 雲霄飛車站
  { w: 6, pts: [[-20, 26], [-26, 36]] },                                    // 廣場 → 旋轉木馬
  { w: 5, pts: [[-36, 56], [-52, 66], [-60, 70]] },                         // 木馬 → 飛椅
  { w: 5, pts: [[-74, -20], [-92, -6], [-100, 2]] },                        // 摩天輪 → 自由落體
  { w: 5, pts: [[-26, 60], [-20, 92], [-8, 100]] },                         // 木馬 → 大道
];

export class Park {
  constructor(scene, q) {
    this.scene = scene; this.q = q;
    this.lamps = [];
    this.anim = [];
    const R = seeded(7);
    this.R = R;
    this.collectLamps();
    this.ground();
    this.lake();
    this.lampPosts();
    this.trees();
    this.booths();
    this.strings();
    this.gate();
    this.fountain();
    this.people();
    this.city();
  }

  collectLamps() {
    const add = (x, z) => { if (!inLake(x, z, 1) && !this.lamps.some((l) => Math.hypot(l[0] - x, l[1] - z) < 7)) this.lamps.push([x, z]); };
    for (let z = 44; z <= 128; z += 12) { add(-8.5, z); add(8.5, z); }
    for (let i = 0; i < 14; i++) { const t = (i / 14) * TAU; add(L.plaza.x + Math.cos(t) * (L.plaza.r + 1.5), L.plaza.z + Math.sin(t) * (L.plaza.r + 1.5)); }
    for (let i = 0; i < 26; i++) { const t = (i / 26) * TAU; add(Math.cos(t) * 88.5, -82 + Math.sin(t) * 45); }
    for (const p of PATHS.slice(2)) {
      for (let k = 0; k < p.pts.length - 1; k++) {
        const [a, b] = [p.pts[k], p.pts[k + 1]], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let s = 6; s < len; s += 13) { const t = s / len, nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len; add(a[0] + (b[0] - a[0]) * t + nx * 4, a[1] + (b[1] - a[1]) * t + nz * 4); }
      }
    }
  }

  ground() {
    const S = this.q.tier === 'high' ? 2048 : 1024, E = L.ext;
    const W = (x) => ((x + E) / (2 * E)) * S;
    const sc = S / (2 * E);
    const R = seeded(3);
    const paths = (g, col, extra = 0) => {
      g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
      for (const p of PATHS) { g.lineWidth = (p.w + extra) * sc; g.beginPath(); p.pts.forEach(([x, z], i) => (i ? g.lineTo(W(x), W(z)) : g.moveTo(W(x), W(z)))); g.stroke(); }
      g.fillStyle = col; g.beginPath(); g.arc(W(L.plaza.x), W(L.plaza.z), (L.plaza.r + extra / 2) * sc, 0, TAU); g.fill();
      // 設施底下的鋪面
      for (const [x, z, r] of [[L.carousel.x, L.carousel.z, 14], [L.swing.x, L.swing.z, 13], [L.tower.x, L.tower.z, 10], [L.wheel.x, L.wheel.z, 16]]) { g.beginPath(); g.arc(W(x), W(z), (r + extra / 2) * sc, 0, TAU); g.fill(); }
      g.fillRect(W(-8 - extra / 2), W(128), 16 * sc + extra * sc, 30 * sc);
    };
    const map = canvasTex(S, S, (g) => {
      g.fillStyle = '#0b1611'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < S * 6; i++) { const v = R(); g.fillStyle = v < 0.5 ? 'rgba(20,40,28,.55)' : v < 0.8 ? 'rgba(6,12,9,.6)' : 'rgba(34,52,36,.35)'; const r = 1 + R() * 3 * sc; g.fillRect(R() * S, R() * S, r, r); }
      // 雲霄飛車區碎石
      g.fillStyle = '#17181a'; g.beginPath(); g.ellipse(W(L.coaster.x + 18), W(L.coaster.z + 2), 70 * sc, 68 * sc, 0, 0, TAU); g.fill();
      for (let i = 0; i < S * 1.5; i++) { const x = W(L.coaster.x + 18) + (R() - 0.5) * 140 * sc, y = W(L.coaster.z + 2) + (R() - 0.5) * 136 * sc; g.fillStyle = R() < 0.5 ? '#222326' : '#101113'; g.fillRect(x, y, 1.5, 1.5); }
      paths(g, '#2a2724', 1.6);
      paths(g, '#4a443e');
      // 石磚紋
      g.globalAlpha = 0.18; g.strokeStyle = '#1c1916'; g.lineWidth = Math.max(1, sc * 0.12);
      for (let x = 0; x < S; x += sc * 1.6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); }
      for (let y = 0; y < S; y += sc * 1.6) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
      g.globalAlpha = 1;
      // 廣場同心圓
      g.strokeStyle = 'rgba(120,100,80,.35)'; g.lineWidth = sc * 0.5;
      for (let r = 6; r < L.plaza.r; r += 5) { g.beginPath(); g.arc(W(L.plaza.x), W(L.plaza.z), r * sc, 0, TAU); g.stroke(); }
      // 湖岸
      g.fillStyle = '#252428'; g.beginPath(); g.ellipse(W(L.lake.x), W(L.lake.z), (L.lake.rx + 3) * sc, (L.lake.rz + 3) * sc, 0, 0, TAU); g.fill();
      g.fillStyle = '#05080b'; g.beginPath(); g.ellipse(W(L.lake.x), W(L.lake.z), L.lake.rx * sc, L.lake.rz * sc, 0, 0, TAU); g.fill();
    }, {});
    // 自發光：路燈底下的光暈、攤位前的暖光、設施底下的彩光
    const emi = canvasTex(S, S, (g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
      g.globalCompositeOperation = 'lighter';
      const pool = (x, z, r, c, a) => { const gr = g.createRadialGradient(W(x), W(z), 0, W(x), W(z), r * sc); gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(W(x) - r * sc, W(z) - r * sc, r * 2 * sc, r * 2 * sc); };
      for (const [x, z] of this.lamps) pool(x, z, 9, '255,176,96', 0.55);
      for (let z = 46; z <= 124; z += 9.5) { pool(-11, z + 3, 7, '255,140,60', 0.4); pool(11, z + 3, 7, '255,140,60', 0.4); }
      pool(0, 82, 46, '255,190,120', 0.16);
      pool(L.plaza.x, L.plaza.z, 22, '120,170,255', 0.22);
      pool(L.carousel.x, L.carousel.z, 16, '255,200,110', 0.5);
      pool(L.wheel.x, L.wheel.z + 2, 26, '255,80,200', 0.22);
      pool(L.swing.x, L.swing.z, 14, '120,220,255', 0.3);
      pool(L.tower.x, L.tower.z, 12, '255,60,90', 0.3);
      pool(0, 134, 18, '255,120,200', 0.4);
    }, {});
    const mat = snowable(new THREE.MeshStandardMaterial({ map, emissiveMap: emi, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 1.1, roughness: 0.92, metalness: 0 }), 0.85);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2 * E, 2 * E), mat);
    plane.rotation.x = -Math.PI / 2;
    this.scene.add(plane);
    this.groundMat = mat;
    // 外圍的草地
    const outer = new THREE.Mesh(new THREE.RingGeometry(E * 0.98, 1400, 64, 1), snowable(new THREE.MeshStandardMaterial({ color: '#0a130f', roughness: 1 }), 0.8));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02;
    this.scene.add(outer);
    // 遠山
    const mg = new THREE.CylinderGeometry(780, 780, 1, 160, 1, true);
    const p = mg.attributes.position, R2 = seeded(11);
    const ridge = []; for (let i = 0; i <= 160; i++) ridge.push(R2());
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) > 0) {
        const a = Math.atan2(p.getZ(i), p.getX(i)), f = (a / TAU + 1) % 1;
        const n = Math.sin(f * TAU * 3) * 0.5 + Math.sin(f * TAU * 7 + 1) * 0.3 + Math.sin(f * TAU * 17 + 2) * 0.15 + ridge[Math.round(f * 160)] * 0.1;
        p.setY(i, 26 + n * 20 + (f > 0.62 && f < 0.82 ? 14 * Math.sin((f - 0.62) / 0.2 * Math.PI) : 0));
      } else p.setY(i, -8);
    }
    mg.computeVertexNormals();
    this.mountains = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: '#070a14', side: THREE.BackSide }));
    this.scene.add(this.mountains);
  }

  lake() {
    const lk = L.lake;
    // 水面：細小的波紋法線，讓月光、燈光有一條條的反光
    const nrm = canvasTex(512, 512, (g, w, h) => {
      const img = g.createImageData(w, h), R = seeded(5);
      const waves = Array.from({ length: 14 }, () => [R() * 6.28, (R() - 0.5) * 0.3, 2 + R() * 9, R() * 6.28]);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let dx = 0, dy = 0;
        for (const [a, sk, f, ph] of waves) { const u = (Math.cos(a) * x + Math.sin(a) * y) / w * f * 6.28 + ph; const c = Math.cos(u) * 0.12; dx += Math.cos(a) * c; dy += Math.sin(a) * c; }
        const i = (y * w + x) * 4; img.data[i] = 128 + dx * 127; img.data[i + 1] = 128 + dy * 127; img.data[i + 2] = 255; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, { repeat: [10, 5], srgb: false });
    const m = new THREE.MeshStandardMaterial({ color: '#040812', roughness: 0.06, metalness: 0.6, normalMap: nrm, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 0 });
    const g = new THREE.CircleGeometry(1, 96);
    const mesh = new THREE.Mesh(g, m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.set(lk.rx, lk.rz, 1);
    mesh.position.set(lk.x, U.uWaterY.value, lk.z);
    this.scene.add(mesh);
    this.water = mesh; this.waterMat = m;
    this.anim.push((t) => { nrm.offset.set(t * 0.004, t * 0.0025); });
    // 湖上的蓮花燈（漂浮的小燈）
    const R = this.R, pos = [], col = [], sz = [], ph = [];
    for (let i = 0; i < (this.q.tier === 'low' ? 30 : 60); i++) {
      const a = R() * TAU, r = Math.sqrt(R()) * 0.85;
      pos.push(lk.x + Math.cos(a) * lk.rx * r, 0.25, lk.z + Math.sin(a) * lk.rz * r);
      const c = hsv(0.05 + R() * 0.08, 0.75, 1); col.push(c[0] * 2.4, c[1] * 2.4, c[2] * 2.4); sz.push(0.9); ph.push(R() * 6.28);
    }
    const lan = glowPoints(pos, col, sz, { attrs: 'attribute float ph;', fn: 'pos.x += sin(uTime*0.05+ph)*3.0; pos.z += cos(uTime*0.04+ph*1.3)*2.0; col *= 0.75+0.25*sin(uTime*2.0+ph*5.0);', extra: { ph: { data: ph, size: 1 } }, withReflect: true });
    this.scene.add(lan, lan.userData.reflection);
  }

  lampPosts() {
    const n = this.lamps.length;
    const post = new THREE.CylinderGeometry(0.08, 0.13, 4.6, 6); post.translate(0, 2.3, 0);
    const arm = new THREE.BoxGeometry(0.06, 0.06, 0.7); arm.translate(0, 4.5, 0.3);
    const cap = new THREE.ConeGeometry(0.32, 0.35, 8); cap.translate(0, 4.75, 0.62);
    const geo = mergeGeometries([post, arm, cap]);
    const im = new THREE.InstancedMesh(geo, snowable(new THREE.MeshStandardMaterial({ color: '#1c1e24', roughness: 0.5, metalness: 0.7 })), n);
    const m4 = new THREE.Matrix4(), pos = [], col = [];
    this.lamps.forEach(([x, z], i) => {
      const a = Math.atan2(-x, -z + 10);
      m4.makeRotationY(a).setPosition(x, 0, z); im.setMatrixAt(i, m4);
      pos.push(x + Math.sin(a) * 0.62, 4.5, z + Math.cos(a) * 0.62);
      col.push(...hex('#ffc27a', 3.2));
    });
    this.scene.add(im);
    const glow = glowPoints(pos, col, 1.5, { withReflect: true });
    this.scene.add(glow, glow.userData.reflection);
    // 一點點會照到地上的暖光：實際的燈只放少數
  }

  trees() {
    const R = this.R;
    const cnt = { low: 170, mid: 280, high: 420 }[this.q.tier];
    const colorize = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); const col = new THREE.Color(c); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
    const trunk = colorize(new THREE.CylinderGeometry(0.18, 0.26, 2.2, 6).translate(0, 1.1, 0), '#2a1d14');
    const c1 = colorize(new THREE.ConeGeometry(2.1, 3.6, 8).translate(0, 3.4, 0), '#173a26');
    const c2 = colorize(new THREE.ConeGeometry(1.6, 3.0, 8).translate(0, 5.0, 0), '#1c4630');
    const c3 = colorize(new THREE.ConeGeometry(1.0, 2.4, 8).translate(0, 6.4, 0), '#22533a');
    const pine = mergeGeometries([trunk, c1, c2, c3]);
    const ball = mergeGeometries([colorize(new THREE.CylinderGeometry(0.2, 0.3, 2.6, 6).translate(0, 1.3, 0), '#2e2016'), colorize(new THREE.SphereGeometry(2.2, 8, 6).translate(0, 4.0, 0), '#1d4a2c')]);
    for (const g of [pine, ball]) g.deleteAttribute('uv');
    const mat = snowable(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }));
    const spots = [];
    const blocked = (x, z) => {
      if (inLake(x, z, 9)) return true;
      if (Math.abs(x) < 20 && z > 36 && z < 150) return true; // 大道與攤位
      if (Math.hypot(x - L.plaza.x, z - L.plaza.z) < L.plaza.r + 6) return true;
      for (const [cx, cz, r] of [[L.castle.x, L.castle.z, 36], [L.wheel.x, L.wheel.z, 26], [L.carousel.x, L.carousel.z, 17], [L.swing.x, L.swing.z, 18], [L.tower.x, L.tower.z, 13]]) if (Math.hypot(x - cx, z - cz) < r) return true;
      if (x > 42 && x < 160 && z > -40 && z < 96) return true; // 雲霄飛車
      for (const p of PATHS) for (let k = 0; k < p.pts.length - 1; k++) {
        const [a, b] = [p.pts[k], p.pts[k + 1]], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2));
        if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < p.w / 2 + 3) return true;
      }
      return spots.some((s) => Math.hypot(s[0] - x, s[1] - z) < 4.2);
    };
    let tries = 0;
    while (spots.length < cnt && tries++ < cnt * 40) {
      const ring = R() < 0.45;
      const a = R() * TAU, r = ring ? 165 + R() * 30 : Math.sqrt(R()) * 175;
      const x = Math.cos(a) * r, z = Math.sin(a) * r - 5;
      if (!blocked(x, z)) spots.push([x, z]);
    }
    const imP = new THREE.InstancedMesh(pine, mat, spots.length), imB = new THREE.InstancedMesh(ball, mat, spots.length);
    let np = 0, nb = 0;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), col = new THREE.Color();
    const fairy = [], fcol = [];
    for (const [x, z] of spots) {
      const sc = 0.8 + R() * 0.8; e.set(0, R() * TAU, 0); q.setFromEuler(e); s.set(sc, sc * (0.85 + R() * 0.35), sc); p.set(x, 0, z);
      m4.compose(p, q, s);
      col.setHSL(0.36 + R() * 0.08, 0.3 + R() * 0.3, 0.35 + R() * 0.3);
      if (R() < 0.65) { imP.setMatrixAt(np, m4); imP.setColorAt(np++, col); } else { imB.setMatrixAt(nb, m4); imB.setColorAt(nb++, col); }
      // 靠近廣場、大道的樹掛小燈
      const near = Math.hypot(x, z - 40) < 95 && R() < 0.5;
      if (near) {
        const hue = R();
        for (let k = 0; k < 26; k++) { const t = k / 26, ang = t * TAU * 3.2, rr = (2.1 - t * 1.6) * sc; fairy.push(x + Math.cos(ang) * rr, (2.2 + t * 5.2) * s.y, z + Math.sin(ang) * rr); const c = hsv(hue + t * 0.2, 0.6, 1); fcol.push(c[0] * 1.8, c[1] * 1.8, c[2] * 1.8); }
      }
    }
    imP.count = np; imB.count = nb;
    this.scene.add(imP, imB);
    if (fairy.length) {
      const f = glowPoints(fairy, fcol, 0.32, { attrs: '', fn: 'col *= 0.6 + 0.4 * sin(uTime * 3.0 + pos.x * 7.0 + pos.y * 3.0);', withReflect: true });
      this.scene.add(f, f.userData.reflection);
    }
  }

  booths() {
    const R = this.R, list = [];
    for (let z = 46; z <= 124; z += 9.5) { list.push([-14.5, z, 1]); list.push([14.5, z, -1]); }
    const n = list.length;
    const body = new THREE.BoxGeometry(4, 3, 7.2); body.translate(0, 1.5, 0);
    const roof = new THREE.BoxGeometry(4.6, 0.25, 7.8); roof.translate(0, 3.15, 0);
    const bodyGeo = mergeGeometries([body, roof]);
    const stripes = canvasTex(256, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#3a2a2a'; g.fillRect((i * w) / 8, 0, w / 8, h); } g.fillStyle = '#fff'; for (let i = 0; i < 16; i++) { g.beginPath(); g.arc((i + 0.5) * w / 16, h, w / 32, Math.PI, 0); g.fill(); } }, {});
    const awn = new THREE.PlaneGeometry(7.6, 2.4); awn.rotateY(Math.PI / 2); awn.rotateZ(-0.5); awn.translate(2.9, 2.9, 0);
    const counter = new THREE.BoxGeometry(0.1, 1.3, 6.4); counter.translate(2.02, 1.75, 0);
    const sign = new THREE.BoxGeometry(0.3, 0.9, 4.2); sign.translate(1.6, 3.9, 0);
    const mBody = snowable(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }));
    const mAwn = snowable(new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide, roughness: 0.8, emissive: '#ffffff', emissiveMap: stripes, emissiveIntensity: 0.12 }), 1.2);
    const mCounter = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.6, 0.8) });
    const mSign = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.4, 2.4) });
    const ib = new THREE.InstancedMesh(bodyGeo, mBody, n), ia = new THREE.InstancedMesh(awn, mAwn, n), ic = new THREE.InstancedMesh(counter, mCounter, n), is = new THREE.InstancedMesh(sign, mSign, n);
    const m4 = new THREE.Matrix4(), c = new THREE.Color();
    const pos = [], col = [];
    list.forEach(([x, z, side], i) => {
      m4.makeRotationY(side > 0 ? 0 : Math.PI).setPosition(x, 0, z);
      for (const im of [ib, ia, ic, is]) im.setMatrixAt(i, m4);
      const h = R();
      c.setHSL(h, 0.35, 0.32); ib.setColorAt(i, c);
      c.setHSL(h, 0.85, 0.55); ia.setColorAt(i, c);
      c.setHSL((h + 0.5) % 1, 0.9, 0.6); is.setColorAt(i, c);
      ic.setColorAt(i, new THREE.Color(1, 1, 1));
      // 遮雨棚邊緣的小燈
      for (let k = 0; k < 9; k++) { pos.push(x + side * 4.0, 2.25, z - 3.6 + k * 0.9); col.push(...hex(k % 2 ? '#ffd28a' : '#ff8a5a', 2.6)); }
    });
    this.scene.add(ib, ia, ic, is);
    const g = glowPoints(pos, col, 0.42, { fn: 'col *= 0.7 + 0.3 * step(0.5, fract(uTime * 1.5 + pos.z * 0.55));' });
    this.scene.add(g);
  }

  strings() {
    // 大道上方的串燈：左右路燈之間拉成 Z 字形，有下垂
    const pos = [], col = [], ph = [];
    const line = (a, b, n, sag, hueBase, warm) => {
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pos.push(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t);
        const c = warm ? hex(i % 3 === 0 ? '#ffe2a8' : i % 3 === 1 ? '#ff9e5e' : '#ffd070', 2.4) : hsv(hueBase + i * 0.07, 0.75, 1).map((v) => v * 2.6);
        col.push(...c); ph.push(i);
      }
    };
    const zs = []; for (let z = 44; z <= 128; z += 12) zs.push(z);
    zs.forEach((z, i) => {
      line([-8.5, 4.6, z], [8.5, 4.6, z], 22, 1.1, i * 0.13, i % 2 === 0);
      if (i < zs.length - 1) line([8.5, 4.6, z], [-8.5, 4.6, zs[i + 1]], 26, 1.4, i * 0.21, i % 2 === 1);
    });
    // 廣場一圈
    for (let i = 0; i < 14; i++) {
      const a0 = (i / 14) * TAU, a1 = ((i + 1) / 14) * TAU, r = L.plaza.r + 1.5;
      line([Math.cos(a0) * r, 4.6, L.plaza.z + Math.sin(a0) * r], [Math.cos(a1) * r, 4.6, L.plaza.z + Math.sin(a1) * r], 14, 0.8, i / 14, false);
    }
    const g = glowPoints(pos, col, 0.36, { attrs: 'attribute float ph;', fn: 'col *= 0.62 + 0.38 * sin(uTime * 2.2 - ph * 0.6);', extra: { ph: { data: ph, size: 1 } }, withReflect: true });
    this.scene.add(g, g.userData.reflection);
    // 電線
    const lg = new THREE.BufferGeometry(); const lp = [];
    for (let i = 0; i < pos.length / 3 - 1; i++) { if (ph[i + 1] === 0) continue; lp.push(pos[i * 3], pos[i * 3 + 1] + 0.12, pos[i * 3 + 2], pos[i * 3 + 3], pos[i * 3 + 4] + 0.12, pos[i * 3 + 5]); }
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    this.scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#15171c' })));
  }

  gate() {
    const grp = new THREE.Group(); grp.position.set(0, 0, L.gate.z);
    const m = snowable(new THREE.MeshStandardMaterial({ color: '#2a1838', roughness: 0.45, metalness: 0.5 }));
    const gold = new THREE.MeshStandardMaterial({ color: '#c89a4a', roughness: 0.35, metalness: 0.9, emissive: '#3a2410', emissiveIntensity: 0.6 });
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(2.6, 15, 2.6), m); p.position.set(sx * 11, 7.5, 0); grp.add(p);
      const c = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.2, 4), gold); c.position.set(sx * 11, 16.6, 0); c.rotation.y = Math.PI / 4; grp.add(c);
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 2.6) })); o.position.set(sx * 11, 18.5, 0); grp.add(o);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 2.2), m); beam.position.set(0, 10.2, 0); grp.add(beam);
    // 招牌：拱形霓虹
    const signTex = canvasTex(1024, 300, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '900 150px "Noto Serif TC","Songti TC","PMingLiU",serif';
      g.shadowColor = '#ff3fb4'; g.shadowBlur = 28; g.fillStyle = '#ffd6f0'; g.fillText('火樹銀花', w / 2, h * 0.42);
      g.shadowBlur = 0; g.fillStyle = '#fff'; g.fillText('火樹銀花', w / 2, h * 0.42);
      g.font = '700 44px "Noto Sans TC",sans-serif'; g.shadowColor = '#3fe0ff'; g.shadowBlur = 18; g.fillStyle = '#c8f6ff';
      g.fillText('S K Y B L O O M   P A R K', w / 2, h * 0.85);
    }, { mips: true });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(22, 6.4), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, color: new THREE.Color(2.2, 2.2, 2.2), depthWrite: false, side: THREE.DoubleSide }));
    sign.position.set(0, 13.6, 1.25); grp.add(sign);
    const back = new THREE.Mesh(new THREE.BoxGeometry(23, 6.8, 0.6), m); back.position.set(0, 13.6, 0.8); grp.add(back);
    // 拱門燈泡
    const pos = [], col = [], ph = [];
    for (let i = 0; i <= 60; i++) { const t = i / 60, x = -11.5 + t * 23; pos.push(x, 17.2 + Math.sin(t * Math.PI) * 1.4, 1.2); col.push(...hex(i % 2 ? '#ffd27a' : '#ff6fd0', 2.8)); ph.push(i); }
    for (const sx of [-1, 1]) for (let i = 0; i < 26; i++) { pos.push(sx * 11 + sx * 1.35, 0.6 + i * 0.56, 1.35); col.push(...hex(i % 2 ? '#ffd27a' : '#7fe8ff', 2.6)); ph.push(i * 2); }
    const g = glowPoints(pos, col, 0.55, { attrs: 'attribute float ph;', fn: 'col *= 0.45 + 0.55 * step(0.5, fract(uTime * 1.2 - ph * 0.125));', extra: { ph: { data: ph, size: 1 } } });
    grp.add(g);
    this.scene.add(grp);
  }

  fountain() {
    const { x, z } = L.plaza;
    const stone = snowable(new THREE.MeshStandardMaterial({ color: '#5a5550', roughness: 0.8 }));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(7, 0.45, 8, 48), stone); rim.rotation.x = Math.PI / 2; rim.position.set(x, 0.5, z);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.2, 0.6, 48, 1, true), stone); wall.position.set(x, 0.3, z);
    const water = new THREE.Mesh(new THREE.CircleGeometry(6.9, 48), new THREE.MeshStandardMaterial({ color: '#0a1a30', roughness: 0.1, metalness: 0.5, emissive: '#0a3a6a', emissiveIntensity: 0.6 }));
    water.rotation.x = -Math.PI / 2; water.position.set(x, 0.45, z);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 1.6, 16), stone); ped.position.set(x, 0.8, z);
    this.scene.add(rim, wall, water, ped);
    // 水柱：每顆水珠自己算拋物線
    const N = this.q.tier === 'low' ? 900 : 2200;
    const pos = [], col = [], sz = [], jet = [], ph = [];
    for (let i = 0; i < N; i++) { const j = i % 13; pos.push(x, 0, z); col.push(1, 1, 1); sz.push(0.16 + Math.random() * 0.1); jet.push(j); ph.push(Math.random()); }
    const fn = `
      float j = jet; float t = fract(uTime * (j < 0.5 ? 0.42 : 0.6) + ph);
      vec3 o; vec3 v;
      if (j < 0.5) { o = vec3(0.0, 1.6, 0.0); float a = ph * 40.0; v = vec3(cos(a)*0.6, 13.0, sin(a)*0.6); t *= 2.6; }
      else { float a = (j - 1.0) / 12.0 * 6.2831; o = vec3(cos(a)*6.2, 0.6, sin(a)*6.2); v = vec3(-cos(a)*3.0, 7.5, -sin(a)*3.0) + vec3(sin(ph*50.)*.25, sin(ph*31.)*.3, cos(ph*70.)*.25); t *= 1.65; }
      pos += o + v * t + vec3(0.0, -4.9, 0.0) * t * t;
      float k = mod(floor(uTime / 6.0), 4.0);
      vec3 c = hue(fract(uTime * 0.05 + j * 0.077));
      col = mix(vec3(0.75,0.85,1.0), c, 0.55) * 1.7 * (1.0 - fract(uTime * 0.6 + ph) * 0.4);
      if (pos.y < 0.5) col = vec3(0.0);
    `;
    const f = glowPoints(pos, col, sz, { attrs: 'attribute float jet; attribute float ph;', fn, extra: { jet: { data: jet, size: 1 }, ph: { data: ph, size: 1 } }, core: 0.5 });
    f.position.set(0, 0, 0);
    this.scene.add(f);
    // 水底燈
    const lp = [], lc = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; lp.push(x + Math.cos(a) * 5.5, 0.55, z + Math.sin(a) * 5.5); lc.push(...hsv(i / 12, 0.7, 1).map((v) => v * 2.4)); }
    this.scene.add(glowPoints(lp, lc, 1.4, { fn: 'col = hue(fract(uTime * 0.05 + pos.x * 0.02)) * 2.2;' }));
  }

  people() {
    const n = { low: 50, mid: 110, high: 180 }[this.q.tier];
    const R = this.R;
    // 走路的網：每條步道切成點，讓人在上面來回逛
    const nodes = [], adj = [];
    const node = (x, z) => { for (let i = 0; i < nodes.length; i++) if (Math.hypot(nodes[i][0] - x, nodes[i][1] - z) < 4) return i; nodes.push([x, z]); adj.push([]); return nodes.length - 1; };
    const link = (a, b) => { if (a !== b && !adj[a].includes(b)) { adj[a].push(b); adj[b].push(a); } };
    for (const p of PATHS) {
      let prev = -1;
      for (let k = 0; k < p.pts.length - 1; k++) {
        const [a, b] = [p.pts[k], p.pts[k + 1]], len = Math.hypot(b[0] - a[0], b[1] - a[1]), steps = Math.max(1, Math.round(len / 10));
        for (let s = 0; s <= steps; s++) { const id = node(a[0] + (b[0] - a[0]) * s / steps, a[1] + (b[1] - a[1]) * s / steps); if (prev >= 0) link(prev, id); prev = id; }
      }
    }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, b = ((i + 1) / 12) * TAU, r = L.plaza.r - 4; link(node(Math.cos(a) * r, L.plaza.z + Math.sin(a) * r), node(Math.cos(b) * r, L.plaza.z + Math.sin(b) * r)); }
    // 把孤立的點接到最近的點
    for (let i = 0; i < nodes.length; i++) if (adj[i].length < 2) { let best = -1, bd = 1e9; for (let j = 0; j < nodes.length; j++) if (j !== i && !adj[i].includes(j)) { const d = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1]); if (d < bd) { bd = d; best = j; } } if (bd < 16) link(i, best); }
    const geo = mergeGeometries([new THREE.CapsuleGeometry(0.24, 0.9, 3, 8).translate(0, 0.75, 0), new THREE.SphereGeometry(0.2, 10, 8).translate(0, 1.58, 0)]);
    const im = new THREE.InstancedMesh(geo, snowable(new THREE.MeshStandardMaterial({ roughness: 0.8 }), 0.4), n);
    const agents = [];
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = (R() * nodes.length) | 0, b = adj[a][(R() * adj[a].length) | 0] ?? a;
      agents.push({ a, b, t: R(), sp: 0.9 + R() * 0.7, off: (R() - 0.5) * 3, h: 0.85 + R() * 0.3, stick: R() < 0.4 ? R() : -1, bob: R() * 6 });
      c.setHSL(R(), 0.25 + R() * 0.35, 0.2 + R() * 0.25); im.setColorAt(i, c);
    }
    this.scene.add(im);
    // 螢光棒
    const sticks = agents.filter((a) => a.stick >= 0);
    const sp = new Float32Array(sticks.length * 3), scol = [];
    sticks.forEach((a) => scol.push(...hsv(a.stick, 0.85, 1).map((v) => v * 2.4)));
    const sg = glowPoints(Array.from(sp), scol, 0.45, { withReflect: true });
    this.scene.add(sg, sg.userData.reflection);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    this.anim.push((t, dt) => {
      let si = 0;
      const arr = sg.geometry.attributes.position.array;
      agents.forEach((ag, i) => {
        const A = nodes[ag.a], B = nodes[ag.b], len = Math.max(0.1, Math.hypot(B[0] - A[0], B[1] - A[1]));
        ag.t += (ag.sp * dt) / len;
        if (ag.t >= 1) { const nx = adj[ag.b].filter((k) => k !== ag.a); ag.a = ag.b; ag.b = nx.length && Math.random() < 0.9 ? nx[(Math.random() * nx.length) | 0] : adj[ag.b][0] ?? ag.a; ag.t = 0; }
        const dx = (B[0] - A[0]) / len, dz = (B[1] - A[1]) / len;
        const x = A[0] + (B[0] - A[0]) * ag.t - dz * ag.off, z = A[1] + (B[1] - A[1]) * ag.t + dx * ag.off;
        q.setFromAxisAngle(up, Math.atan2(dx, dz)); p.set(x, Math.abs(Math.sin(t * 7 * ag.sp + ag.bob)) * 0.05, z); s.set(1, ag.h, 1);
        m4.compose(p, q, s); im.setMatrixAt(i, m4);
        if (ag.stick >= 0) { arr[si * 3] = x + dz * 0.3; arr[si * 3 + 1] = 1.9 * ag.h + 0.35 + Math.sin(t * 3 + ag.bob) * 0.25; arr[si * 3 + 2] = z - dx * 0.3; si++; }
      });
      im.instanceMatrix.needsUpdate = true;
      sg.geometry.attributes.position.needsUpdate = true;
    });
  }

  city() {
    const R = this.R, n = { low: 110, mid: 170, high: 240 }[this.q.tier];
    const win = canvasTex(128, 256, (g, w, h) => {
      g.fillStyle = '#05060a'; g.fillRect(0, 0, w, h);
      for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) { const r = Math.random(); if (r < 0.32) { g.fillStyle = r < 0.08 ? '#a8c8ff' : r < 0.2 ? '#ffcf86' : '#ffe9b8'; g.globalAlpha = 0.5 + Math.random() * 0.5; g.fillRect(x, y, 4, 5); } }
      g.globalAlpha = 1;
    }, {});
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshBasicMaterial({ map: win, color: new THREE.Color(1.5, 1.5, 1.5) });
    const im = new THREE.InstancedMesh(geo, mat, n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    const tops = [], tcol = [];
    for (let i = 0; i < n; i++) {
      // 城市在南邊與東西兩側，北邊留給山與煙火
      let a = R() * TAU; if (Math.sin(a) < -0.15) a = -a;
      const r = 470 + R() * 220, hgt = 18 + Math.pow(R(), 2.2) * 150, w = 14 + R() * 26;
      p.set(Math.cos(a) * r, 0, Math.sin(a) * r); e.set(0, -a, 0); q.setFromEuler(e); s.set(w, hgt, 12 + R() * 22);
      m4.compose(p, q, s); im.setMatrixAt(i, m4);
      if (hgt > 90) { tops.push(p.x, hgt + 3, p.z); tcol.push(4, 0.2, 0.15); }
    }
    this.scene.add(im);
    if (tops.length) this.scene.add(glowPoints(tops, tcol, 2.6, { fn: 'col *= step(0.55, fract(uTime * 0.7 + pos.x * 0.01));' }));
  }

  update(t, dt) { for (const f of this.anim) f(t, dt); }
}
