// 第二批角色：機甲核心 M／街頭英雄 S／睡衣派對 P
// 每隻：底部在 y=0，高約 0.11～0.15；正面朝 +z
import {
  THREE, V3, rnd, G, star5, rbox, heartGeo, tube, part, surf, onSurf,
  beads, toonEyes, smile, catMouth, blush, dotMouth, paintedFace, mergeGeometries, canvasTex,
  glowMat, wedge, star4, zGeo, bentCone, pillowGeo, flameGeo, bellGeo, decal,
} from './figkit.js';

const PI = Math.PI;
// 部分球殼：用球面座標切一片（phi 從 +x 起算，前方 +z 在 phi=π/2；theta 從頭頂起算）
const shell = (phi0, phiLen, th0, thLen, key) => {
  const k = 'sh' + [phi0, phiLen, th0, thLen].map((x) => x.toFixed(3)).join(',') + (key || '');
  return shellCache[k] || (shellCache[k] = (() => { const g = new THREE.SphereGeometry(1, 48, 24, phi0, phiLen, th0, thLen); g.userData.cached = true; return g; })());
};
const shellCache = {};
// 前方的一條帶子（面罩、眼帶）：寬 wide、上下 tall、中心往上 pitch
const band = (wide, tall, pitch = 0) => shell(PI / 2 - wide / 2, wide, PI / 2 - pitch - tall / 2, tall);
// 頭頂往下 th 的帽子
const cap = (th) => shell(0, PI * 2, 0, th);
// 開在某個方向的帽兜：洞的角半徑 hole（洞在 +y，之後自己轉）
const hood = (hole) => shell(0, PI * 2, hole, PI - hole);
// 粗細會變的管子（狐狸尾巴）
function taperTube(pts, rf, seg = 40, radial = 16) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => V3(...p)));
  const g = new THREE.TubeGeometry(curve, seg, 1, radial, false);
  const P = g.attributes.position, uv = g.attributes.uv, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    const u = uv.getX(i);
    curve.getPointAt(Math.min(1, u), c);
    v.set(P.getX(i), P.getY(i), P.getZ(i)).sub(c).multiplyScalar(rf(u)).add(c);
    P.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
// 睡帽：回傳 { g, tip }；s＝[底半徑, 高]
function nightcap(parent, m, role, trim, { p = [0, 0, 0], r = [0, 0, 0], s = [0.026, 0.05], bend = 0.55, flop = 0.32, pom = null, pomR = 0.0062 } = {}) {
  const g = new THREE.Group(); g.position.set(...p); g.rotation.set(...r); parent.add(g);
  part(g, bentCone(bend, flop), m[role], [0, 0, 0], [s[0], s[1], s[0]]);
  part(g, G.torus(PI * 2, 0.2), trim, [0, 0.0015, 0], [s[0] * 1.04, s[0] * 1.04, s[0] * 1.1], [PI / 2, 0, 0]);
  const tip = new THREE.Group(); tip.position.set(bend * s[0], (1 - flop) * s[1], 0); g.add(tip);
  if (pom) part(tip, pom === 'star' ? star5() : G.sph(), pom === 'star' ? m.star : trim, [0, 0, 0], pom === 'star' ? pomR * 1.3 : pomR);
  return { g, tip };
}
// 金鍊子（一圈小環）
function chain(parent, mat, c, rx, rz, n = 16, link = 0.0026) {
  const out = new THREE.Group(); out.position.set(...c); parent.add(out);
  for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; part(out, G.torus(PI * 2, 0.32), mat, [Math.sin(a) * rx, 0, Math.cos(a) * rz], link, [i % 2 ? PI / 2 : 0, a, 0]); }
  return out;
}
const bob = (t, f, a) => Math.sin(t * f) * a;
const ease = (x) => x * x * (3 - 2 * x);

// ---------------- 小貼圖 ----------------
const stripeTex = () => canvasTex('tigerStripes2', 512, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#1a1416';
  const stroke = (x, y, len, wdt, ang) => { g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(0, -wdt / 2); g.quadraticCurveTo(len * 0.45, -wdt * 0.75, len, 0); g.quadraticCurveTo(len * 0.45, wdt * 0.75, 0, wdt / 2); g.closePath(); g.fill(); g.restore(); };
  // 額頭（帽簷底下、眼睛上面）
  for (const [dx, L] of [[-24, 30], [0, 40], [24, 30]]) stroke(w / 2 + dx, 102, L, 13, PI / 2);
  for (const k of [-1, 1]) {
    stroke(w / 2 + k * 64, 118, 30, 12, k > 0 ? 2.2 : 0.94);
    // 臉頰：從側邊往臉中間
    for (let i = 0; i < 3; i++) stroke(w / 2 + k * (220 - i * 6), 148 + i * 22, 72 - i * 10, 16 - i * 2, k > 0 ? PI + i * 0.08 : -i * 0.08);
    // 頭的兩側與後面
    for (let i = 0; i < 4; i++) stroke(w / 2 + k * (250 - i * 4), 52 + i * 28, 46, 13, k > 0 ? PI - 0.25 + i * 0.1 : 0.25 - i * 0.1);
  }
});
const ballTex = () => canvasTex('basketball', 256, 128, (g, w, h) => {
  g.fillStyle = '#ff7a22'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '120,40,0' : '255,200,140'},.12)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.strokeStyle = '#2a1408'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  for (const x of [w * 0.25, w * 0.75]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (const x of [0, w * 0.5]) { g.beginPath(); g.ellipse(x + w * 0.25, h / 2, w * 0.17, h * 0.5, 0, 0, PI * 2); g.stroke(); }
});
const numTex = (n, fg, edge) => canvasTex('num' + n + fg + edge, 256, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.font = '900 104px "Bungee", "Noto Sans TC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 12; g.strokeStyle = edge; g.strokeText(n, w / 2, h / 2 + 6); g.fillStyle = fg; g.fillText(n, w / 2, h / 2 + 6);
});
const grafTex = () => canvasTex('graffiti', 512, 256, (g, w, h) => {
  g.fillStyle = '#f6f4f8'; g.fillRect(0, 0, w, h);
  const R = rnd(77), cols = ['#ff3fb4', '#3fe0ff', '#b6ff3a', '#ffd23a', '#9a5aff', '#ff7a2a'];
  for (let i = 0; i < 26; i++) { const c = cols[i % cols.length], x = R() * w, y = R() * h * 0.9, r = 10 + R() * 30; g.fillStyle = c; g.globalAlpha = 0.9; g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill(); for (let k = 0; k < 7; k++) { const a = R() * PI * 2, d = r * (1.2 + R()); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 + R() * 5, 0, PI * 2); g.fill(); } }
  // 往下流的油漆
  for (let i = 0; i < 22; i++) { const c = cols[(i * 3) % cols.length], x = R() * w, y0 = R() * h * 0.5, L = 30 + R() * 90, wd = 5 + R() * 8; g.fillStyle = c; g.globalAlpha = 0.95; g.fillRect(x - wd / 2, y0, wd, L); g.beginPath(); g.arc(x, y0 + L, wd * 0.75, 0, PI * 2); g.fill(); }
  // 噴漆線條
  g.globalAlpha = 0.95; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < 6; i++) { g.strokeStyle = cols[(i + 2) % cols.length]; g.lineWidth = 6 + R() * 4; g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (R() - 0.3) * 70; y += (R() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); }
  g.globalAlpha = 1;
});
const splashTex = () => canvasTex('splash', 256, 256, (g, w) => {
  g.clearRect(0, 0, w, w);
  const R = rnd(91), cols = ['#ff3fb4', '#3fe0ff', '#b6ff3a', '#ffd23a', '#9a5aff'];
  for (let i = 0; i < 5; i++) { g.fillStyle = cols[i]; const a = (i / 5) * PI * 2, x = w / 2 + Math.cos(a) * 40, y = w / 2 + Math.sin(a) * 40; g.beginPath(); g.arc(x, y, 34 + R() * 16, 0, PI * 2); g.fill(); for (let k = 0; k < 6; k++) { const b = a + (R() - 0.5) * 1.2, d = 60 + R() * 50; g.beginPath(); g.arc(w / 2 + Math.cos(b) * d, w / 2 + Math.sin(b) * d, 4 + R() * 8, 0, PI * 2); g.fill(); } }
});
const CONF = ['#ff3fb4', '#3fe0ff', '#ffd23a', '#7aff5a', '#b06aff', '#ff7a2a'];

// ---------------- 角色 ----------------
export const FIG2 = {
  // ===== 機甲核心 =====
  M1(m) { // 偵察兵：單眼
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const eyeM = glowMat('#ff2f62', 2.4, '#ffd0dc');
    for (const k of [-1, 1]) {
      const l = new THREE.Group(); l.position.set(k * 0.0125, 0.018, 0); body.add(l);
      part(l, G.cyl(), m.rubber, [0, 0.002, 0], [0.0052, 0.012, 0.0052]);
      part(l, rbox(0.017, 0.011, 0.025, 0.4), m.main, [0, -0.0125, 0.003]);
      part(l, rbox(0.0174, 0.004, 0.009, 0.4), m.acc, [0, -0.0145, 0.0125]);
    }
    part(body, rbox(0.036, 0.028, 0.026, 0.32), m.main, [0, 0.037, 0]);
    part(body, rbox(0.026, 0.016, 0.006, 0.4), m.sub, [0, 0.039, 0.012]);
    for (let i = 0; i < 3; i++) part(body, rbox(0.016, 0.0018, 0.002, 0.4), m.rubber, [0, 0.043 - i * 0.004, 0.0152]);
    part(body, rbox(0.04, 0.006, 0.029, 0.4), m.acc2, [0, 0.025, 0]);
    // 背包＋天線
    part(body, rbox(0.026, 0.024, 0.012, 0.35), m.sub, [0, 0.042, -0.017]);
    for (const k of [-1, 1]) part(body, G.cyl(), m.rubber, [k * 0.007, 0.028, -0.019], [0.0042, 0.006, 0.0042]);
    part(body, G.cyl(), m.steel, [0.009, 0.064, -0.02], [0.0009, 0.026, 0.0009]);
    const tipL = part(body, G.sph(), glowMat('#ff2f62', 1.4), [0.009, 0.078, -0.02], 0.0018);
    const arms = [];
    for (const k of [-1, 1]) {
      const a = new THREE.Group(); a.position.set(k * 0.023, 0.046, 0); body.add(a);
      part(a, G.sph(), m.sub, [k * 0.002, 0, 0], 0.0088);
      part(a, G.cyl(), m.rubber, [k * 0.003, -0.01, 0], [0.0038, 0.014, 0.0038]);
      part(a, rbox(0.012, 0.013, 0.013, 0.42), m.main, [k * 0.003, -0.02, 0.002]);
      arms.push(a);
    }
    const head = new THREE.Group(); head.position.set(0, 0.079, 0.001); body.add(head);
    const hs = [0.032, 0.028, 0.029];
    part(head, G.sph(), m.main, [0, 0, 0], hs);
    // 單眼軌道（深色帶）＋會左右掃的單眼
    part(head, band(2.1, 0.42, 0.02), m.lens, [0, 0, 0], [hs[0] * 1.02, hs[1] * 1.02, hs[2] * 1.02]);
    const eye = new THREE.Group(); head.add(eye);
    part(eye, G.sph(), eyeM, [0, 0, 0], [0.0062, 0.0062, 0.0035]);
    part(eye, G.torus(PI * 2, 0.24), m.steel, [0, 0, -0.0005], 0.0068);
    part(eye, G.sphS(), m.hl, [-0.0018, 0.0022, 0.003], 0.0014);
    const placeEye = (yaw) => { const { p, n } = surf([0, 0, 0], [hs[0] * 1.04, hs[1] * 1.04, hs[2] * 1.04], yaw, 0.02); eye.position.copy(p); eye.quaternion.setFromUnitVectors(V3(0, 0, 1), n); };
    placeEye(0);
    part(head, G.sph(), m.sub, [0, -0.0135, 0.015], [0.019, 0.01, 0.014]);
    for (let i = 0; i < 3; i++) part(head, rbox(0.0026, 0.007, 0.002, 0.4), m.rubber, [(i - 1) * 0.0052, -0.015, 0.0285]);
    for (const k of [-1, 1]) { part(head, G.cyl(), m.acc, [k * 0.031, 0.002, 0], [0.0078, 0.006, 0.0078], [0, 0, PI / 2]); part(head, G.cyl(), m.acc2, [k * 0.0345, 0.002, 0], [0.0052, 0.002, 0.0052], [0, 0, PI / 2]); }
    part(head, wedge(0.03, 0.01, 0.003), m.acc, [0, 0.026, -0.004], 1, [0, PI / 2, 0]);
    return {
      g,
      tick: (t) => { placeEye(Math.sin(t * 1.1) * 0.55); tipL.material.emissiveIntensity = Math.sin(t * 5) > 0.4 ? 2.4 : 0.4; },
      act: (t) => { const s = Math.sin(t * 2.2); placeEye(Math.sin(t * 4.4) * 0.6); head.rotation.y = s * 0.45; body.position.y = Math.abs(Math.sin(t * 4.4)) * 0.008; arms[0].rotation.x = -s * 0.5; arms[1].rotation.x = s * 0.5; },
    };
  },
  M2(m) { // 工兵：安全帽＋大扳手
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const led = glowMat('#5aff8a', 2.4, '#d8ffe0');
    for (const k of [-1, 1]) { part(body, rbox(0.019, 0.013, 0.026, 0.42), m.sub, [k * 0.013, 0.0065, 0.003]); part(body, rbox(0.014, 0.012, 0.014, 0.4), m.acc2, [k * 0.013, 0.018, 0]); }
    part(body, rbox(0.044, 0.032, 0.03, 0.34), m.main, [0, 0.038, 0]);
    // 胸前的黃黑警示條紋
    const plate = new THREE.Group(); plate.position.set(0, 0.034, 0.0152); body.add(plate);
    part(plate, rbox(0.034, 0.012, 0.003, 0.3), m.sub, [0, 0, 0]);
    for (let i = 0; i < 5; i++) part(plate, rbox(0.0042, 0.013, 0.0034, 0.2), m.acc, [-0.0136 + i * 0.0068, 0, 0.0004], 1, [0, 0, 0.6]);
    part(body, rbox(0.016, 0.008, 0.004, 0.4), m.acc2, [0, 0.047, 0.0152]);
    for (const k of [-1, 1]) part(body, G.sph(), led, [k * 0.004, 0.047, 0.0172], [0.0016, 0.0016, 0.001]);
    part(body, G.cap(), m.acc, [0, 0.042, -0.02], [0.016, 0.022, 0.016], [0, 0, PI / 2]);
    for (const k of [-1, 1]) part(body, G.sph(), m.sub, [k * 0.024, 0.05, 0], [0.0095, 0.009, 0.011]);
    const head = new THREE.Group(); head.position.set(0, 0.078, 0.002); body.add(head);
    part(head, rbox(0.036, 0.03, 0.032, 0.42), m.sub, [0, -0.002, 0]);
    part(head, cap(PI * 0.5), m.main, [0, 0.002, -0.001], [0.025, 0.024, 0.024]);
    part(head, G.cyl(), m.main, [0, 0.0015, 0.004], [0.027, 0.0025, 0.028]);
    part(head, rbox(0.004, 0.02, 0.026, 0.45), m.acc, [0, 0.016, -0.001]);
    const lampG = new THREE.Group(); lampG.position.set(0, 0.016, 0.02); lampG.rotation.x = 0.5; head.add(lampG);
    part(lampG, G.cyl(), m.steel, [0, 0, 0], [0.0062, 0.006, 0.0062], [PI / 2, 0, 0]);
    const lamp = part(lampG, G.disk(), glowMat('#fff2c0', 2.4, '#ffffff'), [0, 0, 0.0031], 0.0049);
    part(head, rbox(0.03, 0.012, 0.005, 0.45), m.lens, [0, -0.004, 0.0158]);
    for (const k of [-1, 1]) part(head, G.sph(), led, [k * 0.0075, -0.0038, 0.0185], [0.0037, 0.0037, 0.0015]);
    for (const k of [-1, 1]) part(head, G.cyl(), m.acc, [k * 0.019, -0.002, 0], [0.0055, 0.004, 0.0055], [0, 0, PI / 2]);
    // 右手大扳手、左手
    const wr = new THREE.Group(); wr.position.set(0.028, 0.048, 0.004); body.add(wr);
    part(wr, G.cyl(), m.acc2, [0.004, -0.009, 0.003], [0.0042, 0.014, 0.0042], [0.4, 0, -0.3]);
    part(wr, G.sph(), m.main, [0.007, -0.016, 0.008], 0.0068);
    const tool = new THREE.Group(); tool.position.set(0.007, -0.016, 0.008); tool.rotation.set(-0.35, 0, -0.45); wr.add(tool);
    const wM = new THREE.MeshStandardMaterial({ color: '#b8c0cc', metalness: 0.85, roughness: 0.42 });
    part(tool, rbox(0.0058, 0.042, 0.0032, 0.4), wM, [0, 0.018, 0]);
    part(tool, G.torus(PI * 1.42, 0.34), wM, [0, 0.044, 0], 0.0082, [0, 0, PI * 0.79]);
    const la = new THREE.Group(); la.position.set(-0.028, 0.048, 0.004); body.add(la);
    part(la, G.cyl(), m.acc2, [-0.003, -0.01, 0.002], [0.0042, 0.014, 0.0042]);
    part(la, rbox(0.013, 0.013, 0.013, 0.42), m.main, [-0.003, -0.02, 0.004]);
    return {
      g,
      tick: (t) => { lamp.material.emissiveIntensity = 2 + Math.sin(t * 9) * 0.2; tool.rotation.z = -0.45 + Math.sin(t * 1.6) * 0.06; },
      act: (t) => { const s = Math.sin(t * 6); tool.rotation.z = -0.45 + s * 0.5; wr.rotation.x = -0.2 + s * 0.2; body.position.y = Math.abs(Math.sin(t * 3)) * 0.005; body.rotation.z = Math.sin(t * 3) * 0.05; lamp.material.emissiveIntensity = Math.sin(t * 14) > 0 ? 3 : 1.2; },
    };
  },
  M3(m) { // 衛兵：橫向面罩＋大盾
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const vis = glowMat('#2ad7ff', 2.4, '#8af0ff');
    for (const k of [-1, 1]) { part(body, rbox(0.016, 0.014, 0.024, 0.4), m.main, [k * 0.012, 0.007, 0.003]); part(body, rbox(0.012, 0.012, 0.014, 0.4), m.sub, [k * 0.012, 0.019, 0.001]); }
    part(body, rbox(0.038, 0.03, 0.027, 0.32), m.main, [0, 0.039, 0]);
    part(body, rbox(0.03, 0.018, 0.006, 0.4), m.sub, [0, 0.042, 0.012]);
    part(body, star5(), m.acc, [0, 0.042, 0.0155], 0.0045);
    part(body, rbox(0.041, 0.005, 0.029, 0.4), m.acc, [0, 0.025, 0]);
    const head = new THREE.Group(); head.position.set(0, 0.08, 0.001); body.add(head);
    part(head, rbox(0.048, 0.042, 0.044, 0.38), m.main, [0, 0, 0]);
    part(head, rbox(0.04, 0.026, 0.006, 0.4), m.sub, [0, -0.004, 0.0205]);
    part(head, rbox(0.036, 0.0095, 0.004, 0.45), m.lens, [0, 0.0015, 0.0238]);
    const visor = part(head, rbox(0.03, 0.0034, 0.003, 0.45), vis, [0, 0.0015, 0.0262]);
    for (let i = 0; i < 3; i++) part(head, rbox(0.0024, 0.0062, 0.0022, 0.4), m.rubber, [(i - 1) * 0.005, -0.01, 0.024]);
    part(head, wedge(0.036, 0.016, 0.0032, -0.006), m.acc, [0, 0.019, -0.002], 1, [0, PI / 2, 0]);
    for (const k of [-1, 1]) { part(head, G.cyl(), m.acc, [k * 0.0245, -0.002, 0], [0.006, 0.004, 0.006], [0, 0, PI / 2]); }
    // 左手大盾
    const sa = new THREE.Group(); sa.position.set(-0.025, 0.047, 0.003); body.add(sa);
    part(sa, G.sph(), m.sub, [0, 0, 0], 0.009);
    const shield = new THREE.Group(); shield.position.set(-0.01, -0.012, 0.014); shield.rotation.y = -0.55; sa.add(shield);
    part(shield, rbox(0.032, 0.044, 0.006, 0.3), m.acc, [0, 0, 0]);
    part(shield, rbox(0.027, 0.039, 0.007, 0.3), m.sub, [0, 0, 0.0008]);
    part(shield, star5(), m.acc, [0, 0.002, 0.0046], 0.0068);
    part(shield, rbox(0.003, 0.03, 0.002, 0.4), m.main, [0, -0.002, 0.0044]);
    const ra = new THREE.Group(); ra.position.set(0.025, 0.047, 0.003); body.add(ra);
    part(ra, G.sph(), m.sub, [0, 0, 0], 0.009);
    part(ra, G.cyl(), m.rubber, [0.002, -0.011, 0], [0.004, 0.014, 0.004]);
    part(ra, rbox(0.013, 0.013, 0.013, 0.42), m.main, [0.002, -0.021, 0.002]);
    return {
      g,
      tick: (t) => { visor.material.emissiveIntensity = 2 + Math.sin(t * 3) * 0.6; },
      act: (t) => { const ph = (t * 1.2) % 1, hit = Math.sin(Math.min(1, ph / 0.35) * PI); shield.position.z = 0.014 + hit * 0.012; shield.rotation.y = -0.55 + hit * 0.45; body.position.y = hit * 0.006; head.rotation.y = Math.sin(t * 1.4) * 0.25; visor.material.emissiveIntensity = 2.2 + hit * 2; },
    };
  },
  M4(m) { // 疾風：V 字天線＋推進器
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const eyeM = glowMat('#7aff5a', 2.6, '#e8ffd8'), fire = glowMat('#7ad8ff', 3, '#ffffff');
    for (const k of [-1, 1]) {
      part(body, rbox(0.014, 0.014, 0.022, 0.4), m.sub, [k * 0.011, 0.007, 0.001]);
      part(body, wedge(0.013, 0.012, 0.012), m.main, [k * 0.011, 0.004, 0.012], 1, [PI / 2, 0, 0]);
      part(body, rbox(0.011, 0.014, 0.012, 0.4), m.main, [k * 0.011, 0.021, 0]);
    }
    part(body, rbox(0.032, 0.03, 0.023, 0.32), m.main, [0, 0.041, 0]);
    part(body, rbox(0.026, 0.014, 0.006, 0.4), m.acc2, [0, 0.046, 0.0105]);
    for (const k of [-1, 1]) part(body, rbox(0.006, 0.006, 0.003, 0.4), m.acc, [k * 0.0068, 0.046, 0.0142]);
    part(body, rbox(0.012, 0.006, 0.004, 0.4), m.acc, [0, 0.03, 0.0112]);
    for (const k of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(k * 0.024, 0.052, 0); body.add(sh);
      part(sh, rbox(0.016, 0.012, 0.018, 0.4), m.sub, [k * 0.002, 0, 0]);
      part(sh, wedge(0.01, 0.014, 0.003, k * 0.004), m.acc, [k * 0.004, 0.005, 0], 1, [0, 0, -k * 0.35]);
      part(sh, G.cyl(), m.rubber, [k * 0.002, -0.012, 0], [0.0036, 0.014, 0.0036]);
      part(sh, rbox(0.011, 0.012, 0.012, 0.4), m.sub, [k * 0.002, -0.022, 0.001]);
    }
    // 推進器
    const flames = [];
    for (const k of [-1, 1]) {
      part(body, G.cyl(), m.sub, [k * 0.009, 0.046, -0.017], [0.0055, 0.022, 0.0055], [0.25, 0, 0]);
      part(body, G.cyl(), m.rubber, [k * 0.009, 0.034, -0.02], [0.0062, 0.004, 0.0062], [0.25, 0, 0]);
      const f = part(body, flameGeo(), fire, [k * 0.009, 0.03, -0.021], [0.009, 0.012, 0.009], [PI + 0.25, 0, 0]);
      flames.push(f);
    }
    const head = new THREE.Group(); head.position.set(0, 0.082, 0.001); body.add(head);
    part(head, rbox(0.036, 0.032, 0.034, 0.38), m.sub, [0, 0, 0]);
    part(head, rbox(0.038, 0.014, 0.036, 0.4), m.main, [0, 0.011, -0.001]);
    part(head, rbox(0.027, 0.013, 0.005, 0.4), m.lens, [0, 0.0005, 0.0164]);
    for (const k of [-1, 1]) part(head, rbox(0.0095, 0.0034, 0.002, 0.45), eyeM, [k * 0.0066, 0.0012, 0.0192], 1, [0, 0, k * 0.22]);
    part(head, rbox(0.012, 0.007, 0.006, 0.4), m.acc2, [0, -0.011, 0.0155]);
    for (const k of [-1, 1]) part(head, wedge(0.0055, 0.032, 0.0022, 0), m.acc, [k * 0.002, 0.012, 0.0172], 1, [0, 0, -k * 0.85]);
    part(head, G.sph(), m.acc2, [0, 0.012, 0.0182], [0.0045, 0.0045, 0.0028]);
    for (const k of [-1, 1]) part(head, G.cyl(), m.acc, [k * 0.019, 0, 0], [0.006, 0.004, 0.006], [0, 0, PI / 2]);
    return {
      g,
      tick: (t) => { flames.forEach((f, i) => f.scale.set(0.009, 0.012 * (0.85 + Math.abs(Math.sin(t * 17 + i)) * 0.3), 0.009)); },
      act: (t) => { const d = Math.sin(t * 2.4); body.position.y = 0.008 + d * 0.006; body.rotation.x = 0.12 + d * 0.05; body.position.z = Math.max(0, d) * 0.006; flames.forEach((f, i) => f.scale.set(0.011, 0.024 * (0.8 + Math.abs(Math.sin(t * 23 + i)) * 0.5), 0.011)); head.rotation.z = Math.sin(t * 1.2) * 0.06; },
    };
  },
  M5(m) { // 重砲：雙肩大砲（射出紙花）
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const vis = glowMat('#ff8a1a', 2.4, '#ffe0c0');
    for (const k of [-1, 1]) {
      part(body, rbox(0.017, 0.017, 0.044, 0.45), m.rubber, [k * 0.025, 0.0085, 0]);
      for (let i = 0; i < 3; i++) part(body, G.cyl(), m.steel, [k * 0.0338, 0.0085, -0.014 + i * 0.014], [0.0052, 0.002, 0.0052], [0, 0, PI / 2]);
      part(body, rbox(0.019, 0.005, 0.046, 0.4), m.main, [k * 0.025, 0.0178, 0]);
    }
    part(body, rbox(0.062, 0.036, 0.046, 0.42), m.main, [0, 0.039, 0]);
    part(body, rbox(0.04, 0.02, 0.006, 0.42), m.sub, [0, 0.037, 0.022]);
    for (const k of [-1, 1]) part(body, rbox(0.006, 0.014, 0.003, 0.4), m.acc, [k * 0.012, 0.037, 0.0255]);
    part(body, rbox(0.012, 0.006, 0.003, 0.4), m.acc2, [0, 0.03, 0.0255]);
    const head = new THREE.Group(); head.position.set(0, 0.07, 0.004); body.add(head);
    const hs = [0.022, 0.019, 0.021];
    part(head, G.sph(), m.sub, [0, 0, 0], hs);
    const visor = part(head, band(1.9, 0.4, 0.05), vis, [0, 0, 0], [hs[0] * 1.03, hs[1] * 1.03, hs[2] * 1.03]);
    part(head, cap(0.7), m.main, [0, 0.001, 0], [hs[0] * 1.06, hs[1] * 1.06, hs[2] * 1.06]);
    part(head, G.cyl(), m.steel, [0.012, 0.02, -0.006], [0.0009, 0.018, 0.0009]);
    // 兩門大砲＋紙花
    const guns = [], confMats = CONF.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, side: THREE.DoubleSide }));
    for (const k of [-1, 1]) {
      const mount = new THREE.Group(); mount.position.set(k * 0.034, 0.064, -0.004); body.add(mount);
      part(mount, rbox(0.018, 0.014, 0.02, 0.4), m.sub, [0, -0.004, 0]);
      const barrel = new THREE.Group(); barrel.rotation.x = -0.42; mount.add(barrel);
      const tubeG = new THREE.Group(); barrel.add(tubeG);
      part(tubeG, G.cyl(), m.main, [0, 0, 0.018], [0.0088, 0.044, 0.0088], [PI / 2, 0, 0]);
      part(tubeG, G.torus(PI * 2, 0.28), m.acc, [0, 0, 0.04], [0.0094, 0.0094, 0.0094]);
      part(tubeG, G.torus(PI * 2, 0.22), m.acc, [0, 0, 0.004], [0.0094, 0.0094, 0.0094]);
      part(tubeG, G.disk(), m.lens, [0, 0, 0.0402], 0.0068);
      const conf = [];
      const R = rnd(k > 0 ? 3 : 8);
      for (let i = 0; i < 12; i++) { const c = part(barrel, rbox(0.0034, 0.0022, 0.0004, 0.1), confMats[i % confMats.length], [0, 0, 0.042], 0.0001); c.userData.d = V3((R() - 0.5) * 0.6, (R() - 0.2) * 0.6, 1).normalize(); c.userData.sp = 0.05 + R() * 0.04; c.userData.w = V3(R() * 9, R() * 9, R() * 9); conf.push(c); }
      guns.push({ tubeG, conf, k });
    }
    return {
      g,
      tick: (t) => { visor.material.emissiveIntensity = 2 + Math.sin(t * 2.4) * 0.5; },
      act: (t) => {
        guns.forEach((q, i) => {
          const ph = (t * 0.9 + i * 0.5) % 1;
          q.tubeG.position.z = -0.007 * Math.exp(-ph * 14);
          for (const c of q.conf) {
            const tt = ph * 1.1;
            if (tt > 0.85) { c.scale.setScalar(0.0001); continue; }
            const d = c.userData.d, s = c.userData.sp * tt;
            c.position.set(d.x * s, d.y * s - 0.09 * tt * tt * 0.5, 0.042 + d.z * s);
            c.rotation.set(c.userData.w.x * tt, c.userData.w.y * tt, c.userData.w.z * tt);
            c.scale.setScalar(tt < 0.05 ? tt / 0.05 : 1);
          }
        });
        body.position.y = Math.abs(Math.sin(t * 5.6)) * 0.003; head.rotation.y = Math.sin(t * 1.3) * 0.3;
      },
    };
  },
  M6(m) { // 蒼刃：武士機甲＋光刃
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const bc = m._v === 'a' ? '#ff4ad8' : '#3fe0ff';
    const blade = glowMat(bc, 2.8, '#ffffff'), eyeM = glowMat(bc, 2.6);
    for (const k of [-1, 1]) {
      part(body, rbox(0.015, 0.012, 0.024, 0.4), m.main, [k * 0.012, 0.006, 0.003]);
      part(body, rbox(0.012, 0.014, 0.013, 0.4), m.acc2, [k * 0.012, 0.018, 0]);
      part(body, rbox(0.013, 0.009, 0.005, 0.4), m.sub, [k * 0.012, 0.02, 0.007]);
    }
    // 腰甲
    for (const [x, z, ry] of [[-0.011, 0.012, 0.25], [0.011, 0.012, -0.25], [-0.017, -0.004, 1.2], [0.017, -0.004, -1.2], [0, -0.013, 0]]) part(body, rbox(0.016, 0.014, 0.004, 0.3), m.main, [x, 0.022, z], 1, [0.18, ry, 0]);
    part(body, rbox(0.034, 0.028, 0.025, 0.32), m.main, [0, 0.042, 0]);
    part(body, rbox(0.028, 0.014, 0.006, 0.4), m.sub, [0, 0.047, 0.011]);
    part(body, G.torus(PI * 2, 0.28), m.acc, [0, 0.056, 0.001], [0.011, 0.011, 0.011], [PI / 2, 0, 0]);
    part(body, rbox(0.036, 0.004, 0.027, 0.4), m.acc, [0, 0.03, 0]);
    // 肩甲（兩片疊起來）
    for (const k of [-1, 1]) {
      const s = new THREE.Group(); s.position.set(k * 0.026, 0.053, 0); s.rotation.z = -k * 0.38; body.add(s);
      part(s, rbox(0.018, 0.004, 0.022, 0.3), m.main, [k * 0.004, 0, 0]);
      part(s, rbox(0.017, 0.004, 0.021, 0.3), m.sub, [k * 0.006, -0.005, 0]);
      part(s, rbox(0.016, 0.004, 0.02, 0.3), m.main, [k * 0.008, -0.01, 0]);
    }
    // 刀鞘
    part(body, G.cyl(), m.acc2, [-0.02, 0.022, 0.006], [0.003, 0.05, 0.004], [0.2, 0, 1.15]);
    part(body, G.cyl(), m.acc, [-0.002, 0.03, 0.011], [0.0035, 0.004, 0.0045], [0.2, 0, 1.15]);
    const head = new THREE.Group(); head.position.set(0, 0.083, 0.001); body.add(head);
    part(head, rbox(0.034, 0.032, 0.034, 0.42), m.main, [0, 0, 0]);
    part(head, rbox(0.026, 0.018, 0.006, 0.4), m.sub, [0, -0.004, 0.0158]);
    part(head, rbox(0.024, 0.007, 0.004, 0.4), m.lens, [0, 0.0015, 0.0188]);
    for (const k of [-1, 1]) part(head, rbox(0.0085, 0.0026, 0.002, 0.45), eyeM, [k * 0.0058, 0.0016, 0.0208], 1, [0, 0, k * -0.3]);
    for (let i = 0; i < 3; i++) part(head, rbox(0.0018, 0.005, 0.0018, 0.4), m.acc2, [(i - 1) * 0.0045, -0.009, 0.0192]);
    for (const k of [-1, 1]) part(head, rbox(0.004, 0.018, 0.016, 0.4), m.main, [k * 0.019, -0.004, 0.006], 1, [0, k * 0.4, k * 0.2]);
    // 月牙前立
    part(head, G.torus(PI * 1.05, 0.13), m.acc, [0, 0.022, 0.017], 0.021, [0, 0, -PI / 2 - PI * 0.525]);
    part(head, G.sph(), m.acc2, [0, 0.008, 0.0178], [0.0042, 0.0042, 0.0026]);
    // 右手光刃
    const arm = new THREE.Group(); arm.position.set(0.026, 0.05, 0.003); body.add(arm);
    part(arm, G.cyl(), m.acc2, [0.003, -0.009, 0.002], [0.0038, 0.014, 0.0038], [0.4, 0, 0]);
    part(arm, G.sph(), m.main, [0.003, -0.016, 0.009], 0.0065);
    const sword = new THREE.Group(); sword.position.set(0.003, -0.016, 0.009); sword.rotation.set(-0.55, 0, -0.28); arm.add(sword);
    part(sword, G.cyl(), m.acc2, [0, 0.002, 0], [0.0022, 0.016, 0.0022]);
    part(sword, G.cyl(), m.acc, [0, 0.0105, 0], [0.0062, 0.0014, 0.0045]);
    const bl = part(sword, rbox(0.0032, 0.068, 0.0012, 0.45), blade, [0, 0.046, 0]);
    part(sword, G.cone(), blade, [0, 0.0815, 0], [0.0016, 0.004, 0.0006]);
    const la = new THREE.Group(); la.position.set(-0.026, 0.05, 0.003); body.add(la);
    part(la, G.cyl(), m.acc2, [-0.003, -0.01, 0], [0.0038, 0.014, 0.0038]);
    part(la, G.sph(), m.main, [-0.003, -0.019, 0.003], 0.0064);
    return {
      g,
      tick: (t) => { bl.material.emissiveIntensity = 2.6 + Math.sin(t * 6) * 0.4; },
      act: (t) => { const ph = (t * 0.8) % 1; const sw = ph < 0.25 ? ease(ph / 0.25) : ph < 0.55 ? 1 : 1 - ease((ph - 0.55) / 0.45); arm.rotation.x = -1.1 * (1 - sw) + 0.9 * sw; arm.rotation.z = 0.2 - sw * 0.5; body.rotation.y = -0.3 + sw * 0.6; bl.material.emissiveIntensity = 2.6 + (ph > 0.2 && ph < 0.35 ? 3 : 0); },
    };
  },
  M7(m) { // 赤焰：火焰冠＋發熱拳頭
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const eyeM = glowMat('#ffd23a', 2.6, '#fff4c0'), hot = glowMat('#ff5a1a', 2.4, '#ffc080');
    for (const k of [-1, 1]) { part(body, rbox(0.018, 0.014, 0.026, 0.4), m.main, [k * 0.013, 0.007, 0.003]); part(body, rbox(0.014, 0.014, 0.014, 0.4), m.sub, [k * 0.013, 0.02, 0]); }
    part(body, rbox(0.03, 0.012, 0.022, 0.4), m.sub, [0, 0.028, 0]);
    part(body, rbox(0.042, 0.026, 0.028, 0.32), m.main, [0, 0.045, 0]);
    part(body, G.torus(PI * 2, 0.3), m.acc, [0, 0.047, 0.0142], 0.0072);
    const core = part(body, G.sph(), hot, [0, 0.047, 0.0142], [0.0058, 0.0058, 0.003]);
    for (const k of [-1, 1]) part(body, rbox(0.008, 0.012, 0.003, 0.4), m.acc, [k * 0.014, 0.046, 0.0142], 1, [0, 0, k * 0.2]);
    const flames = [];
    for (const k of [-1, 1]) {
      part(body, G.sph(), m.main, [k * 0.027, 0.055, 0], [0.012, 0.011, 0.013]);
      part(body, G.cyl(), m.acc2, [k * 0.012, 0.064, -0.016], [0.0045, 0.016, 0.0045], [-0.35, 0, 0]);
      const f = part(body, flameGeo(), m.flame, [k * 0.012, 0.073, -0.019], [0.008, 0.01, 0.008], [-0.35, 0, 0]); flames.push(f);
    }
    const fists = [];
    for (const k of [-1, 1]) {
      const a = new THREE.Group(); a.position.set(k * 0.03, 0.048, 0.002); body.add(a);
      part(a, G.cyl(), m.sub, [k * 0.002, -0.011, 0.002], [0.0045, 0.016, 0.0045]);
      const fist = new THREE.Group(); fist.position.set(k * 0.003, -0.022, 0.006); a.add(fist);
      part(fist, rbox(0.016, 0.015, 0.016, 0.42), m.main, [0, 0, 0]);
      part(fist, rbox(0.014, 0.004, 0.003, 0.4), hot, [0, 0.003, 0.0082]);
      fists.push({ a, fist, k });
    }
    const head = new THREE.Group(); head.position.set(0, 0.083, 0.002); body.add(head);
    part(head, rbox(0.034, 0.03, 0.032, 0.42), m.main, [0, 0, 0]);
    part(head, rbox(0.026, 0.01, 0.005, 0.4), m.lens, [0, 0.003, 0.0152]);
    for (const k of [-1, 1]) part(head, rbox(0.009, 0.0032, 0.002, 0.45), eyeM, [k * 0.0058, 0.0025, 0.0178], 1, [0, 0, k * 0.32]);
    part(head, rbox(0.02, 0.009, 0.006, 0.4), m.sub, [0, -0.008, 0.0148]);
    for (let i = 0; i < 3; i++) part(head, rbox(0.0016, 0.006, 0.0016, 0.4), m.acc, [(i - 1) * 0.004, -0.008, 0.0182]);
    const crest = new THREE.Group(); crest.position.set(0, 0.014, 0.004); head.add(crest);
    for (const [x, s, r] of [[0, 1.15, 0], [-0.008, 0.85, 0.4], [0.008, 0.85, -0.4]]) part(crest, flameGeo(), m.acc, [x, 0.002, 0], [0.012 * s, 0.014 * s, 0.009 * s], [-0.45, 0, r]);
    return {
      g,
      tick: (t) => { flames.forEach((f, i) => f.scale.set(0.008, 0.01 * (0.85 + Math.abs(Math.sin(t * 13 + i * 2)) * 0.35), 0.008)); core.material.emissiveIntensity = 2.2 + Math.sin(t * 4) * 0.4; },
      act: (t) => {
        fists.forEach((q, i) => { const ph = (t * 2.2 + i * 0.5) % 1, p = Math.sin(Math.min(1, ph / 0.4) * PI); q.a.rotation.x = -p * 1.35; q.fist.position.z = 0.006 + p * 0.004; });
        body.position.x = Math.sin(t * 31) * 0.0006; flames.forEach((f, i) => f.scale.set(0.011, 0.02 * (0.8 + Math.abs(Math.sin(t * 19 + i * 2)) * 0.5), 0.011)); crest.scale.setScalar(1 + Math.abs(Math.sin(t * 8)) * 0.12);
      },
    };
  },
  M8(m) { // 獵鷹核心：發光的翅膀
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const cc = m._v === 'a' ? '#ff6a3a' : '#3fe0ff';
    const core = glowMat(cc, 2.8, '#ffffff'), edge = glowMat(cc, 1.5), eyeM = glowMat(cc, 2.6);
    for (const k of [-1, 1]) {
      const f = new THREE.Group(); f.position.set(k * 0.012, 0, 0.002); body.add(f);
      for (let i = 0; i < 3; i++) part(f, G.cone(), m.acc, [(i - 1) * 0.004, 0.003, 0.009], [0.0024, 0.009, 0.0024], [PI / 2 - 0.3, (i - 1) * 0.4, 0]);
      part(f, rbox(0.012, 0.01, 0.014, 0.4), m.sub, [0, 0.006, 0]);
      part(f, rbox(0.014, 0.014, 0.016, 0.4), m.main, [0, 0.019, 0.001]);
    }
    part(body, rbox(0.03, 0.012, 0.022, 0.4), m.sub, [0, 0.03, 0]);
    part(body, rbox(0.038, 0.03, 0.026, 0.32), m.main, [0, 0.048, 0]);
    part(body, G.torus(PI * 2, 0.3), m.acc, [0, 0.049, 0.013], 0.0085);
    const cr = part(body, G.sph(), core, [0, 0.049, 0.013], [0.0068, 0.0068, 0.0035]);
    for (const k of [-1, 1]) { part(body, rbox(0.012, 0.004, 0.003, 0.4), m.acc, [k * 0.012, 0.058, 0.012], 1, [0, 0, -k * 0.5]); part(body, rbox(0.003, 0.016, 0.003, 0.4), edge, [k * 0.0175, 0.044, 0.0128]); }
    for (const k of [-1, 1]) { part(body, G.sph(), m.sub, [k * 0.024, 0.056, 0], [0.01, 0.009, 0.011]); part(body, G.cyl(), m.sub, [k * 0.026, 0.043, 0.002], [0.004, 0.016, 0.004]); part(body, rbox(0.01, 0.012, 0.011, 0.4), m.main, [k * 0.027, 0.033, 0.003]); }
    // 翅膀：每邊 5 片羽毛
    const wings = [];
    for (const k of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(k * 0.012, 0.058, -0.016); w.rotation.set(0.15, k * 0.5, 0); body.add(w);
      const feathers = [];
      for (let i = 0; i < 5; i++) {
        const piv = new THREE.Group(); w.add(piv);
        const L = 0.058 - i * 0.007;
        const f = new THREE.Group(); f.position.y = L / 2; piv.add(f);
        part(f, rbox(0.009, L, 0.0028, 0.45), i % 2 ? m.main : m.sub, [0, 0, 0]);
        part(f, rbox(0.0022, L * 0.82, 0.0032, 0.4), edge, [k * 0.003, 0, 0]);
        part(f, G.cone(), m.acc, [0, L / 2 + 0.003, 0], [0.0046, 0.008, 0.0016]);
        feathers.push({ piv, base: k * (0.25 + i * 0.32) });
        piv.rotation.z = -feathers[i].base;
      }
      wings.push({ w, feathers, k });
    }
    const tail = new THREE.Group(); tail.position.set(0, 0.028, -0.014); body.add(tail);
    for (let i = 0; i < 3; i++) part(tail, rbox(0.007, 0.03, 0.0025, 0.4), i === 1 ? m.sub : m.main, [(i - 1) * 0.007, -0.012, -0.004], 1, [-0.9, 0, (i - 1) * 0.35]);
    const head = new THREE.Group(); head.position.set(0, 0.086, 0.002); body.add(head);
    const hs = [0.027, 0.025, 0.027];
    part(head, G.sph(), m.main, [0, 0, 0], hs);
    part(head, band(1.7, 0.36, 0.05), m.lens, [0, 0, 0], [hs[0] * 1.02, hs[1] * 1.02, hs[2] * 1.02]);
    for (const k of [-1, 1]) part(head, rbox(0.0082, 0.0028, 0.002, 0.45), eyeM, [k * 0.0088, 0.0018, 0.0262], 1, [0, k * 0.3, k * -0.25]);
    part(head, G.cone(), m.acc, [0, -0.0035, 0.0255], [0.0072, 0.016, 0.0048], [PI / 2 + 0.55, 0, 0]);
    for (let i = 0; i < 3; i++) part(head, wedge(0.007, 0.028 - i * 0.004, 0.0024), m.sub, [(i - 1) * 0.007, 0.018 - Math.abs(i - 1) * 0.004, -0.008], 1, [-1.75, 0, (i - 1) * 0.25]);
    part(head, G.cyl(), m.acc, [0, 0.006, 0], [0.0285, 0.003, 0.0285]);
    return {
      g,
      tick: (t) => { cr.material.emissiveIntensity = 2.4 + Math.sin(t * 2.5) * 0.5; wings.forEach((q) => q.feathers.forEach((f, i) => { f.piv.rotation.z = -f.base * (1 + Math.sin(t * 1.4) * 0.04); })); },
      act: (t) => {
        const fl = Math.sin(t * 5.2);
        wings.forEach((q) => { q.w.rotation.y = q.k * (0.5 + fl * 0.35); q.feathers.forEach((f, i) => { f.piv.rotation.z = -f.base * (1.25 + fl * 0.25) - q.k * i * 0.02 * fl; }); });
        body.position.y = 0.006 + Math.sin(t * 2.6) * 0.006; cr.material.emissiveIntensity = 3 + Math.abs(fl) * 2; head.rotation.x = Math.sin(t * 1.3) * 0.08;
      },
    };
  },
  MH(m) { // 零號機：黑金貓耳原型機＋光環
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const eyeM = glowMat('#ffb21a', 3, '#fff0c0'), halo = glowMat('#ffcf5a', 2.2, '#fff6d8');
    for (const k of [-1, 1]) { part(body, rbox(0.013, 0.01, 0.022, 0.42), m.main, [k * 0.011, 0.005, 0.003]); part(body, rbox(0.0135, 0.004, 0.008, 0.4), m.acc, [k * 0.011, 0.008, 0.012]); part(body, G.cyl(), m.sub, [k * 0.011, 0.017, 0], [0.0045, 0.014, 0.0045]); }
    part(body, G.sph(), m.main, [0, 0.038, 0], [0.025, 0.024, 0.021]);
    part(body, G.torus(PI * 2, 0.22), m.acc, [0, 0.03, 0], [0.024, 0.024, 0.021], [PI / 2, 0, 0]);
    part(body, G.torus(PI * 2, 0.3), m.acc, [0, 0.042, 0.02], 0.0058);
    part(body, G.sph(), eyeM, [0, 0.042, 0.0205], [0.0026, 0.0026, 0.0014]);
    const arms = [];
    for (const k of [-1, 1]) { const a = new THREE.Group(); a.position.set(k * 0.022, 0.048, 0); body.add(a); part(a, G.sph(), m.main, [k * 0.002, 0, 0], 0.0072); part(a, G.cyl(), m.sub, [k * 0.003, -0.011, 0.002], [0.0034, 0.014, 0.0034]); part(a, G.torus(PI * 2, 0.35), m.acc, [k * 0.003, -0.016, 0.002], [0.0042, 0.0042, 0.0042], [PI / 2, 0, 0]); part(a, G.sph(), m.main, [k * 0.003, -0.021, 0.003], 0.005); arms.push(a); }
    // 尾巴：發光的纜線
    const tail = new THREE.Group(); tail.position.set(0, 0.022, -0.018); body.add(tail);
    part(tail, tube([[0, 0, 0], [0.012, -0.006, -0.012], [0.026, 0.004, -0.016], [0.03, 0.022, -0.01]], 0.0026, 20), m.main, [0, 0, 0]);
    const tailTip = part(tail, G.sph(), eyeM, [0.03, 0.024, -0.009], 0.0036);
    const head = new THREE.Group(); head.position.set(0, 0.077, 0.002); body.add(head);
    const hs = [0.031, 0.027, 0.029];
    part(head, G.sph(), m.main, [0, 0, 0], hs);
    part(head, band(2.0, 0.5, 0.02), m.lens, [0, 0, 0], [hs[0] * 1.02, hs[1] * 1.02, hs[2] * 1.02]);
    for (const y of [0.0075, -0.0065]) part(head, G.torus(PI * 0.62, 0.12), m.acc, [0, y, 0], [hs[0] * 1.035, hs[2] * 1.035, 0.001], [PI / 2, 0, PI * 0.19]);
    const eyes = [];
    for (const k of [-1, 1]) {
      const { p, n } = surf([0, 0, 0], [hs[0] * 1.045, hs[1] * 1.045, hs[2] * 1.045], k * 0.4, 0.04);
      const e = new THREE.Group(); e.position.copy(p); e.quaternion.setFromUnitVectors(V3(0, 0, 1), n); head.add(e);
      part(e, G.sph(), eyeM, [0, 0, 0], [0.0082, 0.0072, 0.0024]);
      part(e, G.sph(), m.eye, [0, 0, 0.0016], [0.0016, 0.0058, 0.0012]);
      part(e, G.sphS(), m.hl, [-0.0028, 0.003, 0.0026], 0.0013);
      eyes.push(e);
    }
    const ears = [];
    for (const k of [-1, 1]) { const e = new THREE.Group(); e.position.set(k * 0.019, 0.019, -0.002); e.rotation.z = -k * 0.42; head.add(e); part(e, G.cone(), m.main, [0, 0.011, 0], [0.0135, 0.024, 0.0078]); part(e, G.cone(), m.acc, [0, 0.0098, 0.0045], [0.0074, 0.016, 0.0022]); ears.push(e); }
    part(head, G.torus(PI * 2, 0.32), m.acc, [0, 0.016, 0.023], 0.0036, [-0.6, 0, 0]);
    // 光環
    const hg = new THREE.Group(); hg.position.set(0, 0.08, -0.03); body.add(hg);
    const ring = part(hg, G.torus(PI * 2, 0.06), halo, [0, 0, 0], 0.043);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; part(ring, rbox(0.07, 0.2, 0.07, 0.3), halo, [Math.cos(a), Math.sin(a), 0], 1, [0, 0, a - PI / 2]); }
    return {
      g,
      tick: (t) => { ring.rotation.z = t * 0.3; tailTip.material.emissiveIntensity = 2.6 + Math.sin(t * 3) * 0.6; tail.rotation.y = Math.sin(t * 1.2) * 0.15; const bl = Math.sin(t * 0.9) > 0.97 ? 0.15 : 1; eyes.forEach((e) => (e.scale.y = bl)); },
      act: (t) => { ring.rotation.z = t * 2.4; hg.rotation.x = Math.sin(t * 1.1) * 0.3; ears.forEach((e, i) => (e.rotation.z = (i ? -1 : 1) * 0.38 + (Math.sin(t * 9 + i) > 0.85 ? (i ? -0.25 : 0.25) : 0))); tail.rotation.y = Math.sin(t * 3) * 0.4; body.position.y = 0.004 + Math.sin(t * 1.8) * 0.004; arms[1].rotation.z = 0.4 + Math.sin(t * 5) * 0.3; },
    };
  },
  // ===== 街頭英雄 =====
  S1(m) { // 滑板柴犬
    const g = new THREE.Group(), all = new THREE.Group(), board = new THREE.Group(), rider = new THREE.Group(); g.add(all); all.add(board, rider);
    part(board, rbox(0.064, 0.0042, 0.026, 0.45), m.acc2, [0, 0.0105, 0]);
    for (const k of [-1, 1]) part(board, rbox(0.014, 0.0042, 0.026, 0.45), m.acc2, [k * 0.0375, 0.0126, 0], 1, [0, 0, -k * 0.32]);
    part(board, rbox(0.046, 0.0008, 0.008, 0.4), m.acc3, [0, 0.0128, 0]);
    for (const k of [-1, 1]) { part(board, rbox(0.006, 0.0036, 0.018, 0.3), m.steel, [k * 0.023, 0.0068, 0]); for (const z of [-1, 1]) part(board, G.cyl(), m.acc3, [k * 0.023, 0.0044, z * 0.0105], [0.0044, 0.0042, 0.0044], [PI / 2, 0, 0]); }
    rider.position.y = 0.0126;
    for (const k of [-1, 1]) { part(rider, G.sph(), m.sub, [k * 0.013, 0.004, 0.003], [0.0078, 0.0045, 0.0098]); part(rider, G.cyl(), m.main, [k * 0.012, 0.011, 0], [0.0058, 0.012, 0.0058]); }
    part(rider, G.sph(), m.main, [0, 0.027, 0], [0.022, 0.021, 0.019]);
    part(rider, G.sph(), m.sub, [0, 0.025, 0.007], [0.015, 0.016, 0.014]);
    const arms = [];
    for (const k of [-1, 1]) { const a = new THREE.Group(); a.position.set(k * 0.018, 0.033, 0); a.rotation.z = k * 1.05; rider.add(a); part(a, G.sph(), m.main, [0, -0.009, 0], [0.0058, 0.011, 0.0058]); part(a, G.sph(), m.sub, [0, -0.019, 0], 0.0052); arms.push(a); }
    const tail = part(rider, G.torus(PI * 1.55, 0.34), m.main, [0, 0.034, -0.02], 0.0078, [0, PI / 2, 0.9]);
    const head = new THREE.Group(); head.position.set(0, 0.061, 0.002); rider.add(head);
    const hs = [0.031, 0.026, 0.027];
    const hm = part(head, G.sph(), m.main, [0, 0, 0], hs);
    paintedFace(head, hm, 'S1', { eye: 'half', iris: '#5a3412', iris3: '#c8884a', iris2: '#1e0e04', mouth: 'none', ey: 0.44, ex: 0.21, er: 0.2, lidAt: 0.05, lidTilt: 0.6, blush: 'rgba(255,130,110,.55)' }, { pitch0: 0.06, wide: 1.75 });
    for (const k of [-1, 1]) onSurf(head, G.sph(), m.sub, [0, 0, 0], hs, k * 0.36, 0.5, { inset: 0.0006, scale: [0.0045, 0.0032, 0.0018] });
    const mzc = [0, -0.0095, 0.0135], mzs = [0.0195, 0.0125, 0.0158];
    part(head, G.sph(), m.sub, mzc, mzs);
    for (const k of [-1, 1]) part(head, G.sph(), m.sub, [k * 0.017, -0.006, 0.009], [0.0105, 0.0095, 0.01]);
    part(head, G.sph(), m.eye, [0, -0.0045, 0.0288], [0.0045, 0.0033, 0.003]);
    smile(head, m, mzc, mzs, { pitch: -0.32, w: 0.0052, open: 0.72 });
    const ears = [];
    for (const k of [-1, 1]) { const e = new THREE.Group(); e.position.set(k * 0.0172, 0.019, 0.001); e.rotation.set(0.22, 0, -k * 0.28); head.add(e); part(e, G.cone(), m.main, [0, 0.009, 0], [0.0104, 0.02, 0.0066]); part(e, G.cone(), m.sub, [0, 0.008, 0.0032], [0.006, 0.0135, 0.002]); ears.push(e); }
    const bean = new THREE.Group(); bean.position.set(0, 0.001, -0.011); bean.rotation.x = -1.12; head.add(bean);
    part(bean, cap(1.2), m.acc, [0, 0, 0], [0.0285, 0.026, 0.0275]);
    part(bean, G.torus(PI * 2, 0.3), m.acc, [0, 0.0094, 0], [0.0268, 0.0258, 0.028], [PI / 2, 0, 0]);
    part(bean, G.sph(), m.acc3, [0, 0.0272, 0], 0.0058);
    return {
      g,
      tick: (t) => { tail.rotation.x = Math.sin(t * 6) * 0.15; arms.forEach((a, i) => (a.rotation.z = (i ? 1 : -1) * (1.05 + Math.sin(t * 1.6 + i) * 0.08))); },
      act: (t) => {
        const ph = (t * 1.05) % 1, up = ph < 0.55 ? Math.sin((ph / 0.55) * PI) : 0;
        all.position.y = up * 0.022;
        board.rotation.z = ph < 0.22 ? ease(ph / 0.22) * 0.34 : ph < 0.55 ? 0.34 * (1 - ease((ph - 0.22) / 0.33)) : 0;
        rider.position.y = 0.0126 - (ph > 0.55 ? Math.sin(((ph - 0.55) / 0.45) * PI) * 0.004 : 0);
        arms.forEach((a, i) => (a.rotation.z = (i ? 1 : -1) * (1.05 + up * 0.55)));
        tail.rotation.x = Math.sin(t * 12) * 0.3; head.rotation.z = up * 0.12;
      },
    };
  },
  S2(m) { // 耳機倉鼠
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const bc = [0, 0.043, 0], bs = [0.042, 0.04, 0.037];
    part(body, G.sph(), m.main, bc, bs);
    part(body, G.sph(), m.sub, [0, 0.034, 0.014], [0.033, 0.031, 0.026]);
    for (const k of [-1, 1]) part(body, G.sph(), m.acc3, [k * 0.015, 0.004, 0.022], [0.0085, 0.0042, 0.0095]);
    for (const k of [-1, 1]) { part(body, G.sph(), m.main, [k * 0.023, 0.079, -0.006], [0.0098, 0.0108, 0.005]); part(body, G.sph(), m.acc3, [k * 0.023, 0.079, -0.0018], [0.0058, 0.0068, 0.002]); }
    beads(body, m, bc, bs, { yaw: 0.34, pitch: 0.3, r: 0.0066 });
    onSurf(body, G.sph(), m.acc3, bc, bs, 0, 0.17, { inset: 0.0008, scale: [0.0036, 0.0027, 0.002] });
    catMouth(body, m, bc, bs, { pitch: 0.09, w: 0.0032, gap: 0.06 });
    for (const k of [-1, 1]) part(body, G.sph(), m.sub, [k * 0.025, 0.037, 0.022], 0.0128);
    blush(body, m, bc, bs, { yaw: 0.6, pitch: 0.1, r: 0.0062 });
    // 耳機
    part(body, G.torus(PI, 0.13), m.acc2, [0, 0.054, -0.006], [0.0455, 0.045, 0.04]);
    const cups = [];
    for (const k of [-1, 1]) {
      const c = new THREE.Group(); c.position.set(k * 0.0455, 0.053, -0.006); body.add(c);
      part(c, G.cyl(), m.acc, [0, 0, 0], [0.0138, 0.0105, 0.0138], [0, 0, PI / 2]);
      part(c, G.cyl(), m.acc2, [-k * 0.0062, 0, 0], [0.0122, 0.0036, 0.0122], [0, 0, PI / 2]);
      part(c, G.torus(PI * 2, 0.22), m.acc2, [k * 0.0053, 0, 0], 0.0072, [0, PI / 2, 0]);
      cups.push(c);
    }
    // 抱著瓜子
    for (const k of [-1, 1]) part(body, G.sph(), m.acc3, [k * 0.008, 0.026, 0.036], [0.0058, 0.0052, 0.0052]);
    const seed = new THREE.Group(); seed.position.set(0, 0.031, 0.039); seed.rotation.z = 0.35; body.add(seed);
    part(seed, G.sph(), m.rubber, [0, 0, 0], [0.0048, 0.0085, 0.0032]);
    for (const x of [-0.0018, 0.0018]) part(seed, G.sph(), m.milk, [x, 0, 0.0024], [0.0007, 0.007, 0.0008]);
    return {
      g,
      tick: (t) => { body.rotation.z = Math.sin(t * 2) * 0.03; seed.rotation.z = 0.35 + Math.sin(t * 9) * 0.05; },
      act: (t) => { const s = Math.abs(Math.sin(t * 5.2)); body.scale.set(1 + s * 0.035, 1 - s * 0.05, 1 + s * 0.035); body.rotation.z = Math.sin(t * 2.6) * 0.1; cups.forEach((c) => c.scale.setScalar(1 + s * 0.12)); },
    };
  },
  S3(m) { // 籃球河馬
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const bc = [0, 0.03, 0], bs = [0.031, 0.029, 0.028];
    part(body, G.sph(), m.main, bc, bs);
    const jm = part(body, band(PI * 2, 1.12, -0.12), m.acc, bc, [bs[0] * 1.04, bs[1] * 1.04, bs[2] * 1.05]);
    for (const [th, w] of [[1.13, 0.16], [2.24, 0.14]]) { const y = Math.cos(th) * bs[1] * 1.04, r = Math.sin(th) * 1.045; part(body, G.torus(PI * 2, w), m.acc2, [0, bc[1] + y, 0], [bs[0] * r, bs[2] * r * 1.01, 0.02], [PI / 2, 0, 0]); }
    decal(body, jm, numTex('7', '#ffffff', '#1a1a2a'), { wide: 0.95, tall: 0.62, pitch0: -0.14, off: 1.012 });
    for (const k of [-1, 1]) { part(body, G.sph(), m.main, [k * 0.014, 0.008, 0.008], [0.0098, 0.0075, 0.0108]); part(body, rbox(0.017, 0.0042, 0.022, 0.45), m.acc2, [k * 0.014, 0.0021, 0.009]); }
    part(body, G.sph(), m.main, [-0.029, 0.03, 0.004], [0.007, 0.0125, 0.0078], [0, 0, 0.32]);
    const head = new THREE.Group(); head.position.set(0, 0.07, 0.004); body.add(head);
    const hs = [0.03, 0.026, 0.027];
    part(head, G.sph(), m.main, [0, 0, 0], hs);
    const sc = [0, -0.0095, 0.0165], ss = [0.0255, 0.0168, 0.0162];
    part(head, G.sph(), m.sub, sc, ss);
    for (const k of [-1, 1]) onSurf(head, G.sph(), m.rubber, sc, ss, k * 0.3, 0.42, { inset: 0.0012, scale: [0.0028, 0.0019, 0.0016] });
    smile(head, m, sc, ss, { pitch: -0.22, w: 0.011, t: 0.1, open: 0.56 });
    beads(head, m, [0, 0, 0], hs, { yaw: 0.36, pitch: 0.36, r: 0.0055 });
    for (const k of [-1, 1]) { part(head, G.sph(), m.main, [k * 0.02, 0.021, -0.006], [0.0068, 0.0078, 0.0042]); part(head, G.sph(), m.acc3, [k * 0.02, 0.021, -0.0032], [0.0038, 0.0048, 0.0015]); }
    part(head, G.torus(PI * 2, 0.19), m.acc2, [0, 0.0105, -0.001], [0.0285, 0.0262, 0.024], [PI / 2 + 0.16, 0, 0]);
    part(head, G.torus(PI * 2, 0.08), m.acc, [0, 0.0105, -0.001], [0.0293, 0.027, 0.024], [PI / 2 + 0.16, 0, 0]);
    // 舉起來轉球的手
    const arm = new THREE.Group(); arm.position.set(0.025, 0.042, 0.002); arm.rotation.z = -0.28; body.add(arm);
    part(arm, G.sph(), m.main, [0, 0.014, 0], [0.0068, 0.0165, 0.0068]);
    part(arm, G.cyl(), m.main, [0, 0.033, 0], [0.0019, 0.009, 0.0019]);
    const ballG = new THREE.Group(); ballG.position.set(0, 0.052, 0); arm.add(ballG);
    const ball = part(ballG, G.sph(), new THREE.MeshPhysicalMaterial({ map: ballTex(), roughness: 0.58, clearcoat: 0.25, clearcoatRoughness: 0.4 }), [0, 0, 0], 0.0148, [0.4, 0, 0.2]);
    return {
      g,
      tick: (t) => { ballG.rotation.y = t * 5; },
      act: (t) => { ballG.rotation.y = t * 16; ballG.position.y = 0.052 + Math.abs(Math.sin(t * 4.6)) * 0.012; body.rotation.z = Math.sin(t * 2.3) * 0.07; head.rotation.y = Math.sin(t * 1.15) * 0.25; void ball; },
    };
  },
  S4(m) { // 墨鏡鱷魚
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const bc = [0, 0.03, 0], bs = [0.029, 0.029, 0.026];
    part(body, G.sph(), m.main, bc, bs);
    part(body, G.sph(), m.sub, [0, 0.027, 0.011], [0.021, 0.023, 0.017]);
    for (let i = 0; i < 3; i++) part(body, G.torus(PI * 0.5, 0.12), m.acc2, [0, 0.016 + i * 0.0085, 0.0125], [0.0165, 0.006, 0.006], [0.15, 0, -PI * 0.75]);
    for (const k of [-1, 1]) { part(body, G.sph(), m.main, [k * 0.014, 0.007, 0.01], [0.0102, 0.007, 0.0122]); for (let i = 0; i < 3; i++) part(body, G.sph(), m.main, [k * 0.014 + (i - 1) * 0.0045, 0.003, 0.021], 0.0026); }
    for (const k of [-1, 1]) part(body, G.sph(), m.main, [k * 0.027, 0.03, 0.009], [0.0068, 0.0125, 0.0078], [0.3, 0, k * 0.42]);
    part(body, G.cone(), m.main, [0, 0.013, -0.036], [0.013, 0.036, 0.0088], [-1.28, 0, 0]);
    for (let i = 0; i < 6; i++) { const r = onSurf(body, G.cone(), m.acc, bc, bs, PI, 0.95 - i * 0.26, { inset: -0.0012, scale: [0.0036, 0.0036, 0.0065] }); r.rotateX(PI / 2); }
    for (let i = 0; i < 3; i++) part(body, G.cone(), m.acc, [0, 0.018 - i * 0.003, -0.034 - i * 0.008], [0.003, 0.0065, 0.003], [-0.25, 0, 0]);
    const head = new THREE.Group(); head.position.set(0, 0.07, 0.006); body.add(head);
    part(head, G.sph(), m.main, [0, 0, -0.004], [0.028, 0.023, 0.025]);
    part(head, G.sph(), m.main, [0, -0.007, 0.022], [0.021, 0.012, 0.026]);
    for (const k of [-1, 1]) for (let i = 0; i < 4; i++) { const z = 0.016 + i * 0.0075, w = 0.021 * Math.sqrt(Math.max(0, 1 - Math.pow((z - 0.022) / 0.026, 2))); part(head, G.cone(), m.white, [k * (w - 0.0008), -0.0098, z], [0.0016, 0.0042, 0.0016], [PI, 0, 0]); }
    for (const k of [-1, 1]) { part(head, G.sph(), m.main, [k * 0.006, -0.0008, 0.044], [0.0045, 0.0034, 0.0042]); part(head, G.sph(), m.rubber, [k * 0.0062, 0.0016, 0.0458], [0.0016, 0.0011, 0.001]); }
    for (const k of [-1, 1]) part(head, G.sph(), m.main, [k * 0.0115, 0.0135, 0.0145], 0.0088);
    // 墨鏡底下其實是可愛的眼睛
    for (const k of [-1, 1]) { part(head, G.sph(), m.white, [k * 0.0115, 0.014, 0.0212], [0.0064, 0.007, 0.003]); part(head, G.sph(), m.eye, [k * 0.0109, 0.0135, 0.0238], [0.0044, 0.005, 0.002]); part(head, G.sphS(), m.hl, [k * 0.0109 - 0.0016, 0.016, 0.0254], 0.0015); }
    const sparks = [];
    for (const k of [-1, 1]) { const s2 = part(head, star5(), m.star, [k * 0.023, 0.024, 0.024], 0.0001); sparks.push(s2); }
    const gl = new THREE.Group(); gl.position.set(0, 0.0138, 0.0262); head.add(gl);
    for (const k of [-1, 1]) part(gl, rbox(0.0215, 0.0148, 0.003, 0.45), m.lens, [k * 0.0118, 0, 0]);
    part(gl, rbox(0.0485, 0.0036, 0.0032, 0.45), m.gold, [0, 0.0078, -0.0004]);
    part(gl, G.cyl(), m.gold, [0, 0.003, 0], [0.0012, 0.004, 0.0012], [0, 0, PI / 2]);
    for (const k of [-1, 1]) part(gl, G.cyl(), m.gold, [k * 0.0236, 0.0055, -0.013], [0.0012, 0.026, 0.0012], [PI / 2, 0, 0]);
    chain(body, m.gold, [0, 0.052, 0.002], 0.0235, 0.0205, 18, 0.0024);
    const med = new THREE.Group(); med.position.set(0, 0.044, 0.0245); med.rotation.x = -0.25; body.add(med);
    part(med, G.cyl(), m.gold, [0, 0, 0], [0.0062, 0.0016, 0.0062], [PI / 2, 0, 0]);
    part(med, star5(), m.acc, [0, 0, 0.0012], 0.0032);
    return {
      g,
      tick: (t) => { med.rotation.z = Math.sin(t * 1.6) * 0.15; head.rotation.y = Math.sin(t * 0.8) * 0.08; },
      act: (t) => {
        const p = (t * 0.42) % 1, sl = p < 0.14 ? ease(p / 0.14) : p < 0.62 ? 1 : p < 0.78 ? 1 - ease((p - 0.62) / 0.16) : 0;
        gl.position.set(0, 0.0138 - sl * 0.0125, 0.0262 + sl * 0.0115); gl.rotation.x = sl * 0.38;
        sparks.forEach((s2, i) => { s2.scale.setScalar(Math.max(0.0001, sl * 0.0042 * (1 + Math.sin(t * 9 + i) * 0.25))); s2.rotation.z = t * 3; });
        head.rotation.z = sl * 0.14; head.rotation.x = -sl * 0.08; body.position.y = Math.abs(Math.sin(t * 3)) * 0.003;
      },
    };
  },
  S5(m) { // DJ 貓頭鷹
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const bc = [0, 0.05, -0.006], bs = [0.038, 0.044, 0.034];
    part(body, G.sph(), m.main, bc, bs);
    part(body, G.sph(), m.sub, [0, 0.038, 0.008], [0.028, 0.03, 0.024]);
    for (const k of [-1, 1]) part(body, G.sph(), m.acc, [k * 0.012, 0.004, 0.014], [0.006, 0.004, 0.008]);
    for (const k of [-1, 1]) {
      part(body, G.sph(), m.sub, [k * 0.0135, 0.064, 0.0215], [0.0138, 0.0138, 0.0062]);
      part(body, G.sph(), m.white, [k * 0.0135, 0.064, 0.0258], [0.0098, 0.0098, 0.0036]);
      part(body, G.sph(), m.eye, [k * 0.0128, 0.0632, 0.0288], [0.0058, 0.0062, 0.0022]);
      part(body, G.sphS(), m.hl, [k * 0.0128 - 0.0019, 0.0658, 0.0308], 0.0016);
      part(body, cap(1.18), m.main, [k * 0.0135, 0.0645, 0.0254], [0.0104, 0.0104, 0.0046], [0.12, 0, 0]);
    }
    part(body, G.cone(), m.acc, [0, 0.0545, 0.0318], [0.0052, 0.0115, 0.0046], [2.25, 0, 0]);
    for (const k of [-1, 1]) part(body, G.cone(), m.main, [k * 0.023, 0.09, -0.01], [0.0072, 0.019, 0.005], [0, 0, -k * 0.5]);
    const capG = new THREE.Group(); capG.position.set(0, 0.083, -0.008); capG.rotation.x = 0.16; body.add(capG);
    part(capG, cap(PI * 0.5), m.acc2, [0, 0, 0], [0.03, 0.022, 0.029]);
    part(capG, rbox(0.032, 0.0022, 0.024, 0.45), m.acc2, [0, 0.0012, -0.036], 1, [-0.12, 0, 0]);
    part(capG, G.sph(), m.acc2, [0, 0.022, 0], 0.003);
    part(capG, G.torus(PI, 0.26), m.rubber, [0, 0.0012, 0.0275], 0.0052, [-0.2, 0, 0]);
    part(capG, star5(), m.acc3, [0, 0.011, -0.0262], 0.0045, [0, PI, 0]);
    // 掛在脖子上的耳機
    part(body, G.torus(PI, 0.13), m.acc2, [0, 0.045, 0.004], [0.026, 0.026, 0.026], [PI / 2, 0, 0]);
    for (const k of [-1, 1]) part(body, G.cyl(), m.acc3, [k * 0.026, 0.045, 0.004], [0.0082, 0.0072, 0.0082], [0, 0, PI / 2]);
    // DJ 台
    const deck = new THREE.Group(); deck.position.set(0, 0, 0.036); body.add(deck);
    part(deck, rbox(0.074, 0.02, 0.028, 0.3), m.acc2, [0, 0.01, 0]);
    const led = part(deck, rbox(0.066, 0.0026, 0.002, 0.4), glowMat('#ff3fb4', 2.2), [0, 0.012, 0.0142]);
    const plat = new THREE.Group(); plat.position.set(-0.016, 0.0205, 0); deck.add(plat);
    part(plat, G.cyl(), m.steel, [0, 0, 0], [0.0126, 0.0018, 0.0126]);
    const rec = new THREE.Group(); rec.position.y = 0.0016; plat.add(rec);
    part(rec, G.cyl(), m.lens, [0, 0, 0], [0.0119, 0.0012, 0.0119]);
    part(rec, G.cyl(), m.acc3, [0, 0.0007, 0], [0.0042, 0.0006, 0.0042]);
    part(rec, rbox(0.004, 0.0004, 0.0008, 0.3), m.white, [0.0016, 0.0011, 0]);
    part(deck, G.cyl(), m.steel, [-0.004, 0.024, -0.007], [0.0008, 0.016, 0.0008], [PI / 2, 0.7, 0]);
    for (let i = 0; i < 4; i++) part(deck, G.cyl(), i % 2 ? m.acc3 : m.white, [0.009 + (i % 2) * 0.0085, 0.0215, -0.005 + Math.floor(i / 2) * 0.0085], [0.0022, 0.0028, 0.0022]);
    part(deck, rbox(0.003, 0.0012, 0.012, 0.3), m.steel, [0.026, 0.0206, 0]);
    // 翅膀
    const lw = new THREE.Group(); lw.position.set(-0.031, 0.046, 0.008); lw.rotation.set(-1.15, 0, -0.35); body.add(lw);
    part(lw, G.sph(), m.main, [0, -0.012, 0], [0.0075, 0.018, 0.012]);
    const rw = new THREE.Group(); rw.position.set(0.031, 0.05, 0); rw.rotation.z = 2.35; body.add(rw);
    part(rw, G.sph(), m.main, [0, -0.012, 0], [0.0075, 0.018, 0.012]);
    return {
      g,
      tick: (t) => { rec.rotation.y = -t * 2.5; led.material.emissive.setHSL((t * 0.15) % 1, 0.95, 0.55); },
      act: (t) => { const sc = Math.sin(t * 8.5); rec.rotation.y = sc * 0.9; lw.rotation.z = -0.35 + sc * 0.12; rw.rotation.z = 2.35 + Math.sin(t * 6) * 0.35; const b = Math.abs(Math.sin(t * 4.25)); body.scale.set(1 + b * 0.02, 1 - b * 0.035, 1 + b * 0.02); led.material.emissive.setHSL((t * 0.9) % 1, 0.95, 0.55); led.material.emissiveIntensity = 1.4 + b * 1.4; },
    };
  },
  S6(m) { // 忍者貓
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    part(body, G.sph(), m.main, [0, 0.03, 0], [0.025, 0.027, 0.022]);
    part(body, G.torus(PI * 2, 0.2), m.acc, [0, 0.025, 0], [0.0248, 0.0222, 0.03], [PI / 2, 0, 0]);
    part(body, G.sph(), m.acc, [0.019, 0.025, 0.013], 0.0046);
    for (let i = 0; i < 2; i++) part(body, rbox(0.0042, 0.013, 0.0015, 0.4), m.acc, [0.022 + i * 0.003, 0.017, 0.013], 1, [0, 0, 0.25 + i * 0.35]);
    for (const k of [-1, 1]) part(body, G.sph(), m.main, [k * 0.0115, 0.0072, 0.006], [0.0086, 0.0075, 0.0108]);
    part(body, tube([[0.006, 0.014, -0.018], [0.02, 0.012, -0.03], [0.031, 0.026, -0.028], [0.027, 0.043, -0.02]], 0.0036), m.main, [0, 0, 0]);
    part(body, G.torus(PI * 2, 0.22), m.acc, [0, 0.0505, 0.001], [0.0168, 0.0148, 0.02], [PI / 2, 0, 0]);
    const bell = part(body, G.sph(), m.gold, [0, 0.046, 0.0185], 0.0052);
    part(body, rbox(0.0062, 0.0008, 0.0012, 0.2), m.rubber, [0, 0.0445, 0.0236]);
    const head = new THREE.Group(); head.position.set(0, 0.071, 0.002); body.add(head);
    const hs = [0.031, 0.027, 0.028];
    part(head, G.sph(), m.main, [0, 0, 0], hs);
    part(head, band(1.75, 0.52, 0.05), m.sub, [0, 0, 0], [hs[0] * 1.012, hs[1] * 1.012, hs[2] * 1.012]);
    beads(head, m, [0, 0, 0], [hs[0] * 1.02, hs[1] * 1.02, hs[2] * 1.02], { yaw: 0.35, pitch: 0.06, r: 0.0057 });
    for (const k of [-1, 1]) onSurf(head, rbox(1, 0.24, 0.3, 0.4), m.rubber, [0, 0, 0], hs, k * 0.36, 0.25, { inset: -0.0008, scale: 0.0108, roll: k * 0.34 });
    const ears = [];
    for (const k of [-1, 1]) { const e = new THREE.Group(); e.position.set(k * 0.018, 0.021, -0.003); e.rotation.z = -k * 0.38; head.add(e); part(e, G.cone(), m.main, [0, 0.008, 0], [0.0102, 0.017, 0.0066]); part(e, G.cone(), m.acc2, [0, 0.0072, 0.0033], [0.0056, 0.011, 0.002]); ears.push(e); }
    part(head, G.torus(PI * 2, 0.17), m.acc, [0, 0.0125, -0.001], [hs[0] * 0.915, hs[2] * 0.93, 0.03], [PI / 2 + 0.12, 0, 0]);
    part(head, rbox(0.0145, 0.0062, 0.0022, 0.3), m.steel, [0, 0.0142, 0.0248], 1, [-0.5, 0, 0]);
    part(head, G.sph(), m.acc, [0, 0.0105, -0.0262], 0.0042);
    const tails = new THREE.Group(); tails.position.set(0, 0.0095, -0.028); head.add(tails);
    for (const k of [-1, 1]) part(tails, rbox(0.0042, 0.028, 0.0012, 0.45), m.acc, [k * 0.004, -0.012, -0.004], 1, [0.45, 0, k * 0.32]);
    // 右手手裏劍、左手結印
    const ra = new THREE.Group(); ra.position.set(0.022, 0.044, 0.004); ra.rotation.set(-0.55, 0, 0.75); body.add(ra);
    part(ra, G.sph(), m.main, [0, -0.01, 0], [0.006, 0.012, 0.006]);
    part(ra, G.sph(), m.sub, [0, -0.021, 0], 0.0049);
    const shu = part(ra, star4(), m.steel, [0, -0.029, 0.004], 0.0098, [PI / 2, 0, 0]);
    part(body, G.sph(), m.main, [-0.02, 0.037, 0.011], [0.0062, 0.0062, 0.011], [0.4, -0.4, 0]);
    part(body, G.sph(), m.sub, [-0.015, 0.041, 0.019], 0.0048);
    return {
      g,
      tick: (t) => { shu.rotation.z = t * 2; tails.rotation.x = Math.sin(t * 2.4) * 0.12; tails.rotation.z = Math.sin(t * 1.7) * 0.1; },
      act: (t) => {
        const ph = (t * 0.62) % 1, j = ph < 0.4 ? Math.sin((ph / 0.4) * PI) : 0;
        body.position.y = j * 0.02; body.rotation.y = ph < 0.4 ? ease(ph / 0.4) * PI * 2 : 0;
        shu.rotation.z = t * 14; tails.rotation.x = 0.3 + Math.sin(t * 14) * 0.25; bell.position.y = 0.046 + Math.abs(Math.sin(t * 11)) * 0.0016;
      },
    };
  },
  S7(m) { // 搖滾狼
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const bc = [0, 0.03, 0], bs = [0.026, 0.027, 0.023];
    part(body, G.sph(), m.main, bc, bs);
    part(body, G.sph(), m.sub, [0, 0.032, 0.011], [0.0145, 0.019, 0.0135]);
    part(body, shell(PI / 2 + 0.52, PI * 2 - 1.04, 0.55, 1.5), m.acc2, bc, [bs[0] * 1.06, bs[1] * 1.05, bs[2] * 1.08]);
    for (const k of [-1, 1]) for (let i = 0; i < 3; i++) onSurf(body, G.sph(), m.steel, bc, [bs[0] * 1.07, bs[1] * 1.06, bs[2] * 1.09], k * (0.95 + i * 0.32), 0.6, { inset: -0.0004, scale: 0.0018 });
    for (const k of [-1, 1]) { part(body, G.sph(), m.acc3, [k * 0.012, 0.0075, 0.006], [0.0088, 0.0082, 0.0104]); part(body, rbox(0.0158, 0.0052, 0.02, 0.45), m.acc2, [k * 0.012, 0.0026, 0.008]); }
    const tail = new THREE.Group(); tail.position.set(0.006, 0.016, -0.02); body.add(tail);
    part(tail, G.sph(), m.main, [0.006, -0.002, -0.01], [0.0092, 0.0165, 0.0092], [0.75, 0, -0.65]);
    part(tail, G.sph(), m.sub, [0.0135, -0.011, -0.016], 0.0066);
    const head = new THREE.Group(); head.position.set(0, 0.071, 0.004); body.add(head);
    const hs = [0.029, 0.025, 0.026];
    part(head, G.sph(), m.main, [0, 0, 0], hs);
    const mc = [0, -0.0092, 0.0185], ms = [0.0138, 0.0106, 0.0145];
    part(head, G.sph(), m.sub, mc, ms);
    part(head, G.sph(), m.eye, [0, -0.0042, 0.0325], [0.0046, 0.0034, 0.0032]);
    smile(head, m, mc, ms, { pitch: -0.34, w: 0.0064, open: 0.55 });
    part(head, G.cone(), m.white, [0.0042, -0.0166, 0.0292], [0.0014, 0.0034, 0.0014], [PI, 0, 0]);
    for (const k of [-1, 1]) part(head, G.sph(), m.sub, [k * 0.0205, -0.0075, 0.008], [0.0092, 0.0082, 0.0082]);
    beads(head, m, [0, 0, 0], hs, { yaw: 0.37, pitch: 0.14, r: 0.0054 });
    for (const k of [-1, 1]) onSurf(head, rbox(1, 0.24, 0.3, 0.4), m.rubber, [0, 0, 0], hs, k * 0.38, 0.36, { inset: -0.0008, scale: 0.0102, roll: k * 0.3 });
    for (const k of [-1, 1]) { const e = new THREE.Group(); e.position.set(k * 0.016, 0.02, -0.004); e.rotation.z = -k * 0.3; head.add(e); part(e, G.cone(), m.main, [0, 0.011, 0], [0.0096, 0.024, 0.0066]); part(e, G.cone(), m.sub, [0, 0.009, 0.0032], [0.0052, 0.015, 0.002]); }
    for (let i = 0; i < 4; i++) part(head, G.cone(), m.acc2, [(i - 1.5) * 0.0068, 0.023 + (i % 2) * 0.002, 0.01 - Math.abs(i - 1.5) * 0.002], [0.0052, 0.016, 0.0052], [0.55, 0, (i - 1.5) * -0.28]);
    // 電吉他（V 字）
    const gt = new THREE.Group(); gt.position.set(0.006, 0.03, 0.03); gt.rotation.set(0.15, 0, -2.25); body.add(gt);
    const vs = new THREE.Shape(); vs.moveTo(0, 0); vs.lineTo(-1, 1.25); vs.lineTo(-0.62, 1.32); vs.lineTo(0, 0.5); vs.lineTo(0.62, 1.32); vs.lineTo(1, 1.25); vs.closePath();
    const vg = new THREE.ExtrudeGeometry(vs, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 2 }); vg.translate(0, 0, -0.11);
    part(gt, vg, m.acc, [0, 0, 0], 0.0165);
    part(gt, rbox(0.0042, 0.046, 0.0022, 0.3), m.rubber, [0, -0.022, 0.0005]);
    part(gt, rbox(0.0075, 0.011, 0.0028, 0.3), m.acc, [0, -0.048, 0]);
    for (const y of [0.006, 0.012]) part(gt, rbox(0.009, 0.0028, 0.0012, 0.3), m.steel, [0, y, 0.0028]);
    for (let i = 0; i < 3; i++) part(gt, G.cyl(), m.steel, [0, -0.044 - i * 0.0028, 0.0018], [0.0008, 0.0012, 0.0008], [PI / 2, 0, 0]);
    // 手
    const strum = new THREE.Group(); strum.position.set(0.022, 0.042, 0.006); body.add(strum);
    part(strum, G.sph(), m.main, [0.0, -0.008, 0.01], [0.0062, 0.0062, 0.011], [0.6, 0, 0.4]);
    part(strum, G.sph(), m.sub, [-0.003, -0.012, 0.019], 0.0046);
    part(body, G.sph(), m.main, [-0.022, 0.04, 0.012], [0.0062, 0.0062, 0.011], [0.3, -0.3, 0]);
    part(body, G.sph(), m.sub, [-0.026, 0.047, 0.021], 0.0046);
    return {
      g,
      tick: (t) => { tail.rotation.z = Math.sin(t * 2.2) * 0.2; },
      act: (t) => {
        const ph = (t * 0.5) % 1;
        if (ph < 0.7) { head.rotation.x = Math.abs(Math.sin(t * 9)) * 0.32 - 0.05; strum.rotation.x = Math.sin(t * 18) * 0.35; gt.rotation.z = -2.25 + Math.sin(t * 9) * 0.06; }
        else { const k = Math.sin(((ph - 0.7) / 0.3) * PI); head.rotation.x = -k * 0.7; strum.rotation.x = 0; }
        tail.rotation.z = Math.sin(t * 6) * 0.3; body.position.y = Math.abs(Math.sin(t * 9)) * 0.002;
      },
    };
  },
  S8(m) { // 街頭霸主（老虎）
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const bc = [0, 0.036, 0], bs = [0.033, 0.032, 0.028];
    part(body, G.sph(), m.main, bc, bs);
    part(body, G.sph(), m.sub, [0, 0.035, 0.012], [0.019, 0.022, 0.0165]);
    const jk = part(body, shell(PI / 2 + 0.36, PI * 2 - 0.72, 0.42, 1.78), m.acc, bc, [bs[0] * 1.07, bs[1] * 1.05, bs[2] * 1.09]);
    void jk;
    part(body, G.torus(PI * 2, 0.24), m.acc2, [0, 0.0088, 0], [0.0255, 0.0222, 0.03], [PI / 2, 0, 0]);
    part(body, G.torus(PI * 2, 0.26), m.acc2, [0, 0.062, 0.001], [0.0162, 0.0142, 0.03], [PI / 2, 0, 0]);
    // 胸口的金色皇冠徽章
    const crest = new THREE.Group(); crest.position.set(-0.019, 0.047, 0.0258); crest.rotation.y = -0.55; body.add(crest);
    part(crest, G.cyl(), m.gold, [0, 0, 0], [0.0052, 0.0028, 0.0018]);
    for (let i = 0; i < 3; i++) part(crest, G.cone(), m.gold, [(i - 1) * 0.0034, 0.0034, 0], [0.0016, 0.0042, 0.0012]);
    for (const k of [-1, 1]) { part(body, G.sph(), m.acc3, [k * 0.014, 0.0095, 0.004], [0.0112, 0.0102, 0.0122]); part(body, rbox(0.0175, 0.0072, 0.025, 0.45), m.milk, [k * 0.014, 0.0036, 0.009]); part(body, rbox(0.0177, 0.0016, 0.012, 0.3), m.acc, [k * 0.014, 0.0052, 0.016]); }
    // 左手插口袋
    const la = new THREE.Group(); la.position.set(-0.03, 0.05, 0); la.rotation.z = -0.28; body.add(la);
    part(la, G.sph(), m.acc2, [-0.003, -0.014, 0.004], [0.0088, 0.0172, 0.0094]);
    part(la, G.torus(PI * 2, 0.3), m.acc, [-0.004, -0.028, 0.006], [0.0072, 0.0072, 0.006], [PI / 2, 0, 0]);
    const tail = new THREE.Group(); tail.position.set(0.006, 0.016, -0.022); body.add(tail);
    part(tail, tube([[0, 0, 0], [0.016, -0.004, -0.012], [0.03, 0.008, -0.012], [0.032, 0.024, -0.004]], 0.0042), m.main, [0, 0, 0]);
    for (const [x, y, z] of [[0.012, -0.002, -0.01], [0.024, 0.0, -0.013], [0.031, 0.014, -0.009]]) part(tail, G.torus(PI * 2, 0.3), m.rubber, [x, y, z], 0.0045, [0.4, 0.9, 0]);
    chain(body, m.gold, [0, 0.06, 0.002], 0.0255, 0.0225, 20, 0.0026);
    const med = new THREE.Group(); med.position.set(0, 0.046, 0.0315); med.rotation.x = -0.22; body.add(med);
    part(med, G.cyl(), m.gold, [0, 0, 0], [0.0088, 0.0018, 0.0088], [PI / 2, 0, 0]);
    part(med, star5(), m.acc3, [0, 0, 0.0014], 0.0046);
    const head = new THREE.Group(); head.position.set(0, 0.083, 0.004); body.add(head);
    const hs = [0.035, 0.03, 0.031];
    const hm = part(head, G.sph(), m.main, [0, 0, 0], hs);
    decal(head, hm, stripeTex(), { wide: 3.3, tall: 1.5, pitch0: 0.32, off: 1.008, rough: 0.5 });
    const mc = [0, -0.011, 0.0205], ms = [0.0172, 0.0122, 0.0132];
    part(head, G.sph(), m.sub, mc, ms);
    for (const k of [-1, 1]) part(head, G.sph(), m.sub, [k * 0.0245, -0.0095, 0.012], [0.0115, 0.0094, 0.0094]);
    part(head, G.sph(), m.acc4, [0, -0.0058, 0.0328], [0.0052, 0.0036, 0.0032]);
    catMouth(head, m, mc, ms, { pitch: -0.34, w: 0.0036, gap: 0.12 });
    beads(head, m, [0, 0, 0], hs, { yaw: 0.36, pitch: 0.12, r: 0.006 });
    for (const k of [-1, 1]) onSurf(head, G.sph(), m.sub, [0, 0, 0], hs, k * 0.4, 0.33, { inset: 0.0006, scale: [0.0058, 0.0036, 0.002] });
    for (const k of [-1, 1]) { const e = new THREE.Group(); e.position.set(k * 0.028, 0.016, -0.006); e.rotation.z = -k * 0.5; head.add(e); part(e, G.sph(), m.main, [0, 0, 0], [0.0098, 0.0098, 0.0056]); part(e, G.sph(), m.sub, [0, 0, 0.0028], [0.0056, 0.0056, 0.002]); part(e, G.sph(), m.rubber, [0, 0, -0.0028], [0.0082, 0.0082, 0.002]); }
    const capG = new THREE.Group(); capG.position.set(0, 0.012, -0.002); capG.rotation.set(-0.1, 0.42, 0); head.add(capG);
    part(capG, cap(PI * 0.5), m.acc3, [0, 0, 0], [0.0312, 0.0242, 0.0312]);
    part(capG, rbox(0.034, 0.0025, 0.026, 0.45), m.acc3, [0, 0.0012, 0.036], 1, [0.08, 0, 0]);
    part(capG, G.sph(), m.acc3, [0, 0.0242, 0], 0.0028);
    const logo = new THREE.Group(); logo.position.set(0, 0.012, 0.0292); logo.rotation.x = -0.45; capG.add(logo);
    part(logo, G.cyl(), m.gold, [0, 0, 0], [0.0068, 0.0032, 0.0022]);
    for (let i = 0; i < 3; i++) part(logo, G.cone(), m.gold, [(i - 1) * 0.0045, 0.0042, 0], [0.002, 0.0052, 0.0014]);
    // 右手扛著音響
    const ra = new THREE.Group(); ra.position.set(0.029, 0.054, 0); ra.rotation.z = 2.55; body.add(ra);
    part(ra, G.sph(), m.acc2, [0, -0.012, 0], [0.0086, 0.0165, 0.0092]);
    const bb = new THREE.Group(); bb.position.set(0.038, 0.077, -0.006); bb.rotation.set(0, -0.3, 0.28); body.add(bb);
    part(bb, rbox(0.04, 0.023, 0.013, 0.25), m.acc3, [0, 0, 0]);
    const spk = [];
    for (const k of [-1, 1]) { part(bb, G.cyl(), m.steel, [k * 0.0115, -0.0012, 0.0062], [0.0082, 0.002, 0.0082], [PI / 2, 0, 0]); spk.push(part(bb, G.cyl(), m.rubber, [k * 0.0115, -0.0012, 0.0075], [0.0064, 0.0012, 0.0064], [PI / 2, 0, 0])); }
    const disp = part(bb, rbox(0.011, 0.0048, 0.001, 0.3), glowMat('#3fe0ff', 1.8), [0, 0.0078, 0.0064]);
    part(bb, G.torus(PI, 0.2), m.steel, [0, 0.0112, 0], [0.013, 0.0072, 0.013]);
    return {
      g,
      tick: (t) => { med.rotation.z = Math.sin(t * 1.4) * 0.12; tail.rotation.y = Math.sin(t * 1.3) * 0.15; disp.material.emissiveIntensity = 1.2 + Math.abs(Math.sin(t * 3)) * 0.6; },
      act: (t) => { const b = Math.abs(Math.sin(t * 5.2)); bb.position.y = 0.077 + b * 0.004; spk.forEach((s2) => s2.scale.set(0.0064 * (1 + b * 0.25), 0.0012, 0.0064 * (1 + b * 0.25))); head.rotation.x = b * 0.12 - 0.04; body.rotation.z = Math.sin(t * 2.6) * 0.05; med.rotation.z = Math.sin(t * 5.2) * 0.35; tail.rotation.y = Math.sin(t * 3) * 0.3; },
    };
  },
  SH(m) { // 塗鴉之王（貓）
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const gm = new THREE.MeshPhysicalMaterial({ map: grafTex(), roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.2, envMapIntensity: 0.7 });
    const pud = new THREE.Mesh(new THREE.CircleGeometry(0.046, 40), new THREE.MeshStandardMaterial({ map: splashTex(), transparent: true, roughness: 0.12, depthWrite: false }));
    pud.rotation.x = -PI / 2; pud.position.y = 0.0006; g.add(pud);
    part(body, G.sph(), gm, [0, 0.03, 0], [0.027, 0.028, 0.024]);
    for (const k of [-1, 1]) part(body, G.sph(), gm, [k * 0.012, 0.0072, 0.008], [0.0095, 0.0072, 0.0112]);
    const tail = new THREE.Group(); tail.position.set(0.006, 0.014, -0.018); body.add(tail);
    part(tail, tube([[0, 0, 0], [0.016, -0.002, -0.012], [0.028, 0.012, -0.012], [0.024, 0.03, -0.004]], 0.0042), gm, [0, 0, 0]);
    const head = new THREE.Group(); head.position.set(0, 0.073, 0.003); body.add(head);
    const hs = [0.032, 0.028, 0.029];
    part(head, G.sph(), gm, [0, 0, 0], hs);
    for (const k of [-1, 1]) { part(head, G.cone(), gm, [k * 0.019, 0.025, -0.002], [0.0108, 0.018, 0.0074], [0, 0, -k * 0.4]); part(head, G.cone(), m.acc, [k * 0.019, 0.024, 0.0018], [0.0062, 0.011, 0.002], [0, 0, -k * 0.4]); }
    for (const k of [-1, 1]) {
      const col = k < 0 ? '#ff3fb4' : '#3fe0ff';
      onSurf(head, G.sph(), glowMat(col, 2.4), [0, 0, 0], hs, k * 0.38, 0.1, { inset: 0.001, scale: [0.0068, 0.0078, 0.003] });
      onSurf(head, G.sph(), m.eye, [0, 0, 0], hs, k * 0.38, 0.1, { inset: -0.0013, scale: [0.0016, 0.0062, 0.0015] });
      for (let i = 0; i < 2; i++) onSurf(head, rbox(1, 0.25, 0.3, 0.4), new THREE.MeshStandardMaterial({ color: CONF[(i + (k > 0 ? 2 : 0)) % CONF.length], roughness: 0.4 }), [0, 0, 0], hs, k * 0.66, -0.08 - i * 0.12, { inset: -0.0006, scale: 0.0085, roll: k * 0.2 });
    }
    onSurf(head, G.sph(), m.acc, [0, 0, 0], hs, 0, -0.08, { inset: 0.0006, scale: [0.0028, 0.002, 0.0015] });
    catMouth(head, m, [0, 0, 0], hs, { pitch: -0.2, w: 0.0034, gap: 0.075 });
    // 歪歪的皇冠，滴著油漆
    const cr = new THREE.Group(); cr.position.set(0.006, 0.025, -0.002); cr.rotation.z = -0.28; head.add(cr);
    part(cr, G.cyl(), m.gold, [0, 0.004, 0], [0.0158, 0.008, 0.0158]);
    const gemM = CONF.map((c) => glowMat(c, 1.2));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2 + 0.3; part(cr, G.cone(), m.gold, [Math.cos(a) * 0.0148, 0.0125, Math.sin(a) * 0.0148], [0.0042, 0.0095, 0.0042]); part(cr, G.sph(), gemM[i], [Math.cos(a) * 0.0148, 0.018, Math.sin(a) * 0.0148], 0.0019); }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * PI * 2 + 0.9; part(cr, G.sph(), gemM[(i + 1) % gemM.length], [Math.cos(a) * 0.0162, -0.0012, Math.sin(a) * 0.0162], [0.0017, 0.0048, 0.0017]); }
    // 右手的噴漆罐＋噴出來的顏色
    const arm = new THREE.Group(); arm.position.set(0.023, 0.045, 0.006); arm.rotation.set(-0.95, 0, 0.55); body.add(arm);
    part(arm, G.sph(), gm, [0, -0.009, 0], [0.0062, 0.012, 0.0062]);
    part(arm, G.cyl(), m.acc, [0, -0.026, 0.003], [0.0062, 0.018, 0.0062]);
    part(arm, G.cyl(), m.milk, [0, -0.0145, 0.003], [0.0052, 0.004, 0.0052]);
    part(arm, G.cyl(), m.rubber, [0, -0.0118, 0.0052], [0.0016, 0.0032, 0.0016], [PI / 2, 0, 0]);
    const spray = new THREE.Group(); spray.position.set(0, -0.0118, 0.007); arm.add(spray);
    const R = rnd(5), dots = [];
    for (let i = 0; i < 16; i++) { const d = part(spray, G.sph(), gemM[i % gemM.length], [0, 0, 0], 0.0001); d.userData.o = [(R() - 0.5) * 0.7, (R() - 0.5) * 0.7, R()]; dots.push(d); }
    const puff = (t, sp, n) => dots.forEach((d, i) => { const ph = (t * sp + i / dots.length) % 1, o = d.userData.o; if (i >= n) { d.scale.setScalar(0.0001); return; } d.position.set(o[0] * ph * 0.02, o[1] * ph * 0.02, 0.004 + ph * 0.035); d.scale.setScalar(0.0022 * (1 - ph) + 0.0004); });
    return {
      g,
      tick: (t) => { puff(t, 0.35, 6); tail.rotation.y = Math.sin(t * 1.3) * 0.2; },
      act: (t) => { puff(t, 1.6, 16); cr.position.y = 0.025 + Math.abs(Math.sin(t * 5)) * 0.003; head.rotation.z = Math.sin(t * 2.2) * 0.12; tail.rotation.y = Math.sin(t * 4) * 0.4; arm.rotation.z = 0.55 + Math.sin(t * 6) * 0.15; },
    };
  },
  // ===== 睡衣派對 =====
  P1(m) { // 呵欠海獺
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const bc = [0, 0.03, 0], bs = [0.026, 0.029, 0.023];
    part(body, G.sph(), m.main, bc, bs);
    part(body, G.sph(), m.sub, [0, 0.028, 0.0095], [0.0185, 0.022, 0.016]);
    for (const k of [-1, 1]) part(body, G.sph(), m.main, [k * 0.012, 0.0042, 0.012], [0.0078, 0.0042, 0.0098]);
    part(body, G.sph(), m.main, [0, 0.008, -0.024], [0.0105, 0.0048, 0.019], [0.35, 0, 0]);
    const arms = [];
    for (const k of [-1, 1]) { const a = new THREE.Group(); a.position.set(k * 0.02, 0.047, 0.002); a.rotation.z = k * 2.5; body.add(a); part(a, G.sph(), m.main, [0, -0.011, 0], [0.0058, 0.0125, 0.0058]); part(a, G.sph(), m.main, [0, -0.023, 0], 0.0052); arms.push(a); }
    const head = new THREE.Group(); head.position.set(0, 0.07, 0.002); body.add(head);
    const hs = [0.029, 0.026, 0.026];
    part(head, G.sph(), m.main, [0, 0, 0], hs);
    const fm = part(head, G.sph(), m.sub, [0, -0.005, 0.009], [0.023, 0.019, 0.019]);
    paintedFace(head, fm, 'P1', { eye: 'closed', mouth: 'yawn', ey: 0.38, ex: 0.21, my: 0.78, blush: 'rgba(255,130,140,.6)' }, { pitch0: 0, wide: 1.6, tall: 1.15, rough: 0.8 });
    part(head, G.sph(), m.eye, [0, -0.0032, 0.0282], [0.0042, 0.003, 0.0026]);
    for (const k of [-1, 1]) part(head, G.sph(), m.main, [k * 0.024, 0.01, -0.004], [0.0058, 0.0058, 0.0038]);
    const nc = nightcap(head, m, 'acc', m.acc2, { p: [0.002, 0.016, -0.004], r: [-0.22, 0, -0.28], s: [0.0235, 0.048], bend: 0.72, flop: 0.36, pom: 'ball', pomR: 0.0068 });
    return {
      g,
      tick: (t) => { body.scale.y = 1 + Math.sin(t * 1.6) * 0.012; nc.g.rotation.z = -0.28 + Math.sin(t * 1.6) * 0.04; },
      act: (t) => { const ph = (t * 0.5) % 1, k = Math.sin(Math.min(1, ph / 0.7) * PI); body.scale.set(1 - k * 0.03, 1 + k * 0.09, 1 - k * 0.03); arms.forEach((a, i) => (a.rotation.z = (i ? 1 : -1) * (2.5 + k * 0.35))); head.rotation.x = -k * 0.22; head.rotation.z = ph > 0.7 ? Math.sin((ph - 0.7) * 40) * 0.08 * (1 - ph) * 3 : 0; },
    };
  },
  P2(m) { // 抱枕熊
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    part(body, G.sph(), m.main, [0, 0.028, -0.006], [0.025, 0.027, 0.021]);
    for (const k of [-1, 1]) { part(body, G.sph(), m.main, [k * 0.013, 0.0062, 0.006], [0.0095, 0.0068, 0.011]); part(body, G.sph(), m.sub, [k * 0.013, 0.0058, 0.0168], [0.0056, 0.0042, 0.0018]); }
    const pil = new THREE.Group(); pil.position.set(0, 0.041, 0.021); pil.rotation.z = 0.12; body.add(pil);
    part(pil, pillowGeo(), m.acc, [0, 0, 0], [0.031, 0.028, 0.024]);
    part(pil, heartGeo(), m.acc2, [0, 0.001, 0.0118], 0.0058);
    for (const k of [-1, 1]) { part(body, G.sph(), m.main, [k * 0.027, 0.046, 0.014], [0.0075, 0.0068, 0.012], [0, -k * 0.5, 0]); part(body, G.sph(), m.main, [k * 0.022, 0.047, 0.032], 0.0062); }
    const head = new THREE.Group(); head.position.set(0, 0.073, -0.002); body.add(head);
    const hs = [0.029, 0.026, 0.026];
    const hm = part(head, G.sph(), m.main, [0, 0, 0], hs);
    const mzc = [0, -0.008, 0.02], mzs = [0.012, 0.0088, 0.0082];
    part(head, G.sph(), m.sub, mzc, mzs);
    part(head, G.sph(), m.eye, [0, -0.0048, 0.0276], [0.0036, 0.0026, 0.0022]);
    smile(head, m, mzc, mzs, { pitch: -0.3, w: 0.0042, open: 0.7 });
    paintedFace(head, hm, 'P2', { eye: 'closed', lash: true, mouth: 'none', ey: 0.44, ex: 0.2, blush: 'rgba(255,120,150,.7)' }, { pitch0: -0.05, rough: 0.8 });
    for (const k of [-1, 1]) { part(head, G.sph(), m.main, [k * 0.021, 0.019, -0.004], [0.0088, 0.0088, 0.0058]); part(head, G.sph(), m.sub, [k * 0.021, 0.019, -0.0005], [0.0052, 0.0052, 0.002]); }
    return {
      g,
      tick: (t) => { body.scale.y = 1 + Math.sin(t * 1.5) * 0.01; },
      act: (t) => { const s = Math.abs(Math.sin(t * 2.6)); pil.scale.set(1 - s * 0.12, 1 + s * 0.06, 1 + s * 0.06); body.rotation.z = Math.sin(t * 1.3) * 0.12; head.rotation.z = Math.sin(t * 1.3) * 0.1; head.position.y = 0.073 - s * 0.002; },
    };
  },
  P3(m) { // 數羊小羊
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    for (const [x, z] of [[-0.012, 0.01], [0.012, 0.01], [-0.011, -0.01], [0.011, -0.01]]) { part(body, G.cyl(), m.sub, [x, 0.008, z], [0.0042, 0.014, 0.0042]); part(body, G.cyl(), m.acc2, [x, 0.0016, z], [0.0046, 0.0032, 0.0046]); }
    part(body, G.sph(), m.main, [0, 0.03, 0], [0.025, 0.021, 0.023]);
    const R = rnd(13);
    for (let i = 0; i < 24; i++) { const yaw = i * 2.4 + R(), pitch = -0.55 + (i / 24) * 1.65; const { p } = surf([0, 0.03, 0], [0.025, 0.021, 0.023], yaw, pitch); if (p.z > 0.012 && p.y > 0.033) continue; part(body, G.sph(), m.main, [p.x, p.y, p.z], 0.0085 + R() * 0.003); }
    const head = new THREE.Group(); head.position.set(0, 0.058, 0.016); body.add(head);
    const hs = [0.0185, 0.02, 0.016];
    const hm = part(head, G.sph(), m.sub, [0, 0, 0], hs);
    paintedFace(head, hm, 'P3', { eye: 'closed', mouth: 'w', ey: 0.47, ex: 0.21, er: 0.2, blush: 'rgba(255,130,150,.7)' }, { pitch0: -0.04, wide: 1.8, tall: 1.05, rough: 0.8 });
    for (let i = 0; i < 5; i++) part(head, G.sph(), m.main, [(i - 2) * 0.0062, 0.016 + (i % 2) * 0.003, -0.004], 0.007 + (i % 2) * 0.0015);
    for (const k of [-1, 1]) { part(head, G.sph(), m.sub, [k * 0.02, 0.004, -0.002], [0.0105, 0.0045, 0.0062], [0, 0, -k * 0.45]); part(head, G.sph(), m.acc3, [k * 0.02, 0.0045, 0.0015], [0.0075, 0.0028, 0.003], [0, 0, -k * 0.45]); }
    nightcap(head, m, 'acc', m.main, { p: [-0.004, 0.022, -0.006], r: [-0.1, 0, 0.32], s: [0.0158, 0.034], bend: -0.6, flop: 0.3, pom: 'ball', pomR: 0.0052 });
    // 想像泡泡：小羊跳過柵欄
    const cloudM = new THREE.MeshPhysicalMaterial({ color: '#dceaff', roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), envMapIntensity: 0.5 });
    for (const [x, y, z, r] of [[0.019, 0.08, 0.012, 0.0026], [0.025, 0.088, 0.01, 0.0036]]) part(body, G.sph(), cloudM, [x, y, z], r);
    const tb = new THREE.Group(); tb.position.set(0.031, 0.104, 0.004); body.add(tb);
    for (const [x, y, r] of [[0, 0, 0.0125], [-0.012, -0.003, 0.0092], [0.012, -0.002, 0.0098], [-0.006, 0.008, 0.0082], [0.007, 0.008, 0.0088], [0, -0.006, 0.0092]]) part(tb, G.sph(), cloudM, [x, y, 0], [r, r, r * 0.55]);
    const fence = new THREE.Group(); fence.position.set(0, -0.0058, 0.0075); tb.add(fence);
    for (const k of [-1, 1]) part(fence, rbox(0.0022, 0.0092, 0.0015, 0.3), m.acc2, [k * 0.0052, 0.002, 0]);
    for (const y of [0, 0.0042]) part(fence, rbox(0.0145, 0.0016, 0.0012, 0.3), m.acc2, [0, y, 0.0006]);
    const ms = new THREE.Group(); tb.add(ms);
    part(ms, G.sph(), m.milk, [0, 0, 0], [0.0048, 0.004, 0.004]);
    part(ms, G.sph(), m.rubber, [0.0042, 0.0012, 0], 0.0022);
    for (const k of [-1, 1]) part(ms, G.cyl(), m.rubber, [k * 0.0022, -0.0038, 0], [0.0006, 0.003, 0.0006]);
    const hop = (u) => { ms.position.set(-0.0125 + u * 0.025, -0.0035 + Math.sin(u * PI) * 0.0125, 0.0095); ms.rotation.z = (0.5 - u) * 0.8; };
    return {
      g,
      tick: (t) => { hop((t * 0.45) % 1); head.rotation.x = Math.sin(t * 1.2) * 0.04; tb.position.y = 0.104 + Math.sin(t * 1.5) * 0.0015; },
      act: (t) => { const u = (t * 1.3) % 1; hop(u); head.rotation.x = Math.sin(u * PI) * 0.18; tb.scale.setScalar(1 + Math.sin(u * PI) * 0.06); },
    };
  },
  P4(m) { // 恐龍裝柯基
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const bc = [0, 0.03, 0], bs = [0.027, 0.028, 0.024];
    part(body, G.sph(), m.acc, bc, bs);
    part(body, G.sph(), m.acc3, [0, 0.028, 0.011], [0.019, 0.021, 0.015]);
    for (const k of [-1, 1]) { part(body, G.sph(), m.acc, [k * 0.013, 0.0072, 0.006], [0.0098, 0.0075, 0.0112]); for (let i = 0; i < 3; i++) part(body, G.cone(), m.milk, [k * 0.013 + (i - 1) * 0.0034, 0.0042, 0.0172], [0.0013, 0.0034, 0.0013], [PI / 2, 0, 0]); }
    const tail = new THREE.Group(); tail.position.set(0, 0.016, -0.02); body.add(tail);
    part(tail, G.cone(), m.acc, [0, -0.002, -0.014], [0.0118, 0.03, 0.0088], [-1.2, 0, 0]);
    for (let i = 0; i < 3; i++) part(tail, G.cone(), m.acc2, [0, 0.0048 - i * 0.0028, -0.008 - i * 0.008], [0.0028, 0.0058, 0.0028], [-0.3, 0, 0]);
    for (let i = 0; i < 4; i++) { const r = onSurf(body, G.cone(), m.acc2, bc, bs, PI, 0.85 - i * 0.3, { inset: -0.0012, scale: [0.0042, 0.0042, 0.0075] }); r.rotateX(PI / 2); }
    const arms = [];
    for (const k of [-1, 1]) { const a = new THREE.Group(); a.position.set(k * 0.021, 0.04, 0.008); a.rotation.set(-0.35, 0, k * 0.85); body.add(a); part(a, G.sph(), m.acc, [0, 0.008, 0], [0.0062, 0.011, 0.0066]); for (let i = 0; i < 3; i++) part(a, G.cone(), m.milk, [(i - 1) * 0.0028, 0.019, 0.002], [0.0011, 0.003, 0.0011]); arms.push(a); }
    const head = new THREE.Group(); head.position.set(0, 0.071, 0.004); body.add(head);
    const hs = [0.028, 0.025, 0.026];
    const hm = part(head, G.sph(), m.main, [0, 0, 0], hs);
    part(head, G.sph(), m.sub, [0, -0.0085, 0.0158], [0.0162, 0.0118, 0.0122]);
    onSurf(head, G.sph(), m.sub, [0, 0, 0], hs, 0, 0.36, { inset: 0.0004, scale: [0.0045, 0.0118, 0.002] });
    part(head, G.sph(), m.eye, [0, -0.0042, 0.0282], [0.0042, 0.003, 0.0028]);
    part(head, G.sph(), m.dark, [0, -0.0128, 0.0262], [0.0038, 0.0032, 0.0018]);
    part(head, G.sph(), m.blush, [0, -0.0138, 0.027], [0.0022, 0.0014, 0.001]);
    paintedFace(head, hm, 'P4', { iris: '#5a3412', iris3: '#d0904a', iris2: '#1e0e04', mouth: 'none', ey: 0.42, ex: 0.21, er: 0.18 }, { pitch0: 0, rough: 0.8 });
    const ears = [];
    for (const k of [-1, 1]) { const e = new THREE.Group(); e.position.set(k * 0.017, 0.022, -0.004); e.rotation.z = -k * 0.32; head.add(e); part(e, G.cone(), m.main, [0, 0.012, 0], [0.0115, 0.026, 0.0072]); part(e, G.cone(), m.sub, [0, 0.0105, 0.0036], [0.0065, 0.017, 0.002]); ears.push(e); }
    // 恐龍帽兜（洞開在臉的前面）＋一排牙齒、帽頂的小眼睛、背刺
    const hd = new THREE.Group(); hd.rotation.x = PI / 2 - 0.35; head.add(hd);
    const HS = [0.0335, 0.0322, 0.0315], HOLE = 1.05;
    part(hd, hood(HOLE), m.acc, [0, 0, 0], HS);
    for (let i = 0; i < 7; i++) {
      const ph = -PI / 2 + (i - 3) * 0.32;
      const p = V3(Math.sin(HOLE) * Math.cos(ph) * HS[0], Math.cos(HOLE) * HS[1], Math.sin(HOLE) * Math.sin(ph) * HS[2]);
      const dir = V3(-p.x, 0, -p.z).normalize();
      const tooth = part(hd, G.cone(), m.milk, [p.x * 0.97, p.y + 0.0008, p.z * 0.97], [0.0026, 0.0062, 0.0026]);
      tooth.quaternion.setFromUnitVectors(V3(0, 1, 0), dir);
    }
    for (const k of [-1, 1]) { part(head, G.sph(), m.milk, [k * 0.0115, 0.028, 0.009], 0.0052); part(head, G.sph(), m.eye, [k * 0.0115, 0.0298, 0.0128], 0.0026); }
    for (let i = 0; i < 4; i++) { const a = 1.5 + i * 0.4, n = V3(0, Math.sin(a), Math.cos(a)); const sp = part(head, G.cone(), m.acc2, [0, n.y * HS[1] * 1.0, n.z * HS[2] * 1.0], [0.0052, 0.011 - i * 0.001, 0.0052]); sp.quaternion.setFromUnitVectors(V3(0, 1, 0), n); }
    return {
      g,
      tick: (t) => { tail.rotation.y = Math.sin(t * 3) * 0.2; ears.forEach((e, i) => (e.rotation.z = (i ? -1 : 1) * 0.32 + Math.sin(t * 2 + i) * 0.04)); },
      act: (t) => { const ph = (t * 0.8) % 1, r = Math.sin(Math.min(1, ph / 0.35) * PI); arms.forEach((a, i) => { a.rotation.x = -0.35 - r * 0.9; a.rotation.z = (i ? 1 : -1) * (0.85 + r * 0.3); }); body.rotation.x = -r * 0.12; body.position.y = r * 0.006; tail.rotation.y = Math.sin(t * 9) * 0.35; head.rotation.x = -r * 0.1; },
    };
  },
  P5(m) { // 黑眼圈熊貓
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const bc = [0, 0.03, 0], bs = [0.027, 0.028, 0.024];
    part(body, G.sph(), m.acc, bc, bs);
    part(body, G.torus(PI * 2, 0.26), m.milk, [0, 0.052, 0.002], [0.0162, 0.0142, 0.02], [PI / 2, 0, 0]);
    for (let i = 0; i < 3; i++) onSurf(body, G.sph(), m.milk, bc, bs, 0, 0.45 - i * 0.32, { inset: 0.0004, scale: [0.0022, 0.0022, 0.0014] });
    const R = rnd(21);
    for (let i = 0; i < 7; i++) onSurf(body, star5(), m.acc2, bc, bs, (R() - 0.5) * 5, (R() - 0.5) * 1.2, { inset: -0.0002, scale: 0.0024, roll: R() * 3 });
    for (const k of [-1, 1]) part(body, G.sph(), m.sub, [k * 0.013, 0.0072, 0.006], [0.0098, 0.0078, 0.011]);
    for (const k of [-1, 1]) part(body, G.sph(), m.sub, [k * 0.017, 0.036, 0.018], [0.0072, 0.0068, 0.011], [0.5, -k * 0.5, 0]);
    const mg = new THREE.Group(); mg.position.set(0, 0.034, 0.03); body.add(mg);
    part(mg, G.cyl(), m.milk, [0, 0, 0], [0.0088, 0.016, 0.0088]);
    part(mg, G.cyl(), m.white, [0, 0.0074, 0], [0.0078, 0.0012, 0.0078]);
    part(mg, G.torus(PI * 2, 0.28), m.milk, [0.0098, 0, 0], 0.005);
    part(mg, heartGeo(), m.acc2, [0, 0.0005, 0.0088], 0.0028);
    const head = new THREE.Group(); head.position.set(0, 0.073, 0.003); body.add(head);
    const hs = [0.031, 0.027, 0.028];
    const hm = part(head, G.sph(), m.main, [0, 0, 0], hs);
    for (const k of [-1, 1]) part(head, G.sph(), m.sub, [k * 0.022, 0.02, -0.004], [0.0092, 0.0092, 0.006]);
    const mzc = [0, -0.0092, 0.019], mzs = [0.012, 0.0085, 0.0085];
    part(head, G.sph(), m.main, mzc, mzs);
    part(head, G.sph(), m.eye, [0, -0.0056, 0.0268], [0.0038, 0.0026, 0.0022]);
    smile(head, m, mzc, mzs, { pitch: -0.35, w: 0.0035, open: 0.75 });
    const alt = m._v === 'a';
    paintedFace(head, hm, 'P5' + (alt ? 'a' : ''), { eye: 'half', eyeRim: true, patch: alt ? '#6a3a2a' : '#24242c', iris: '#6a4a38', iris3: '#d8b090', iris2: '#1a1010', mouth: 'none', ey: 0.45, ex: 0.21, er: 0.16, lidAt: -0.08, blush: 'rgba(255,140,170,.55)' }, { pitch0: 0, rough: 0.8 });
    part(head, G.torus(PI * 2, 0.14), m.acc2, [0, 0.0132, -0.002], [hs[0] * 0.92, hs[2] * 0.93, 0.028], [PI / 2 + 0.32, 0, 0]);
    const mk = new THREE.Group(); mk.position.set(0, 0.0175, 0.0205); mk.rotation.x = -0.62; head.add(mk);
    part(mk, rbox(0.032, 0.012, 0.0045, 0.5), m.acc2, [0, 0, 0]);
    for (const k of [-1, 1]) part(mk, G.torus(PI * 0.7, 0.2), m.dark, [k * 0.0075, 0.0018, 0.0024], 0.0034, [0, 0, -PI * 0.85]);
    return {
      g,
      tick: (t) => { body.scale.y = 1 + Math.sin(t * 1.4) * 0.01; },
      act: (t) => {
        const ph = (t * 0.4) % 1;
        if (ph < 0.35) { const k = Math.sin((ph / 0.35) * PI); mg.position.set(0, 0.034 + k * 0.012, 0.03 - k * 0.004); mg.rotation.x = -k * 0.6; head.rotation.x = -k * 0.15; }
        else { mg.position.set(0, 0.034, 0.03); mg.rotation.x = 0; const k2 = (ph - 0.35) / 0.65; head.rotation.x = k2 < 0.85 ? ease(Math.min(1, k2 / 0.7)) * 0.38 : 0.38 * (1 - (k2 - 0.85) / 0.15); }
      },
    };
  },
  P6(m) { // 雲朵兔
    const g = new THREE.Group(), all = new THREE.Group(); g.add(all);
    const cloud = new THREE.Group(); cloud.position.y = 0.04; all.add(cloud);
    for (const [x, y, z, r] of [[0, 0, 0, 0.026], [-0.026, -0.004, 0.002, 0.019], [0.027, -0.003, 0, 0.02], [-0.011, -0.006, 0.019, 0.016], [0.012, -0.006, 0.019, 0.016], [0.002, -0.004, -0.018, 0.019], [-0.041, -0.008, -0.004, 0.012], [0.043, -0.008, 0.004, 0.012], [0.016, 0.004, -0.012, 0.015], [-0.017, 0.003, -0.01, 0.016]]) part(cloud, G.sph(), m.sub, [x, y, z], [r, r * 0.78, r]);
    const stars = [];
    for (const [x, z, L] of [[-0.03, 0.006, 0.013], [0.004, 0.017, 0.017], [0.032, 0.0, 0.011]]) { part(cloud, G.cyl(), m.milk, [x, -0.012 - L / 2, z], [0.0005, L, 0.0005]); stars.push(part(cloud, star5(), m.star, [x, -0.012 - L - 0.0035, z], 0.0042)); }
    const bun = new THREE.Group(); bun.position.set(0, 0.059, 0); all.add(bun);
    part(bun, G.sph(), m.main, [0.006, 0.006, -0.002], [0.024, 0.014, 0.018]);
    const bl = part(bun, cap(1.32), m.acc, [0.009, 0.0045, -0.002], [0.0255, 0.0158, 0.0198]);
    const R = rnd(31);
    for (let i = 0; i < 6; i++) onSurf(bun, star5(), m.acc2, [0.009, 0.0045, -0.002], [0.0255, 0.0158, 0.0198], (R() - 0.5) * 4 + 0.5, 0.35 + R() * 0.7, { inset: -0.0006, scale: 0.0026, roll: R() * 3 });
    for (const z of [-0.006, 0.006]) part(bun, G.sph(), m.main, [0.031, 0.003, z], [0.0062, 0.0045, 0.0055]);
    const hg = new THREE.Group(); hg.position.set(-0.022, 0.013, 0.004); hg.rotation.z = 0.25; bun.add(hg);
    const hs = [0.021, 0.019, 0.019];
    const hm = part(hg, G.sph(), m.main, [0, 0, 0], hs);
    paintedFace(hg, hm, 'P6', { eye: 'closed', lash: true, mouth: 'w', ey: 0.47, ex: 0.21, blush: 'rgba(255,120,160,.75)' }, { pitch0: -0.06, rough: 0.8 });
    const ears = [];
    for (const k of [-1, 1]) { const e = new THREE.Group(); e.position.set(0.004, 0.013, k * 0.0075); e.rotation.set(k * 0.15, 0, -1.25); hg.add(e); part(e, G.sph(), m.main, [0, 0.016, 0], [0.0068, 0.0175, 0.0042]); part(e, G.sph(), m.acc3, [-0.0012, 0.016, 0], [0.0042, 0.013, 0.0032]); ears.push(e); }
    const zm = glowMat('#c8c0ff', 1.0, '#f4f2ff');
    const zs = [0, 1, 2].map(() => part(all, zGeo(), zm, [0, 0, 0], 0.004));
    const zfly = (t, sp) => zs.forEach((z, i) => { const ph = (t * sp + i / 3) % 1; z.position.set(-0.03 + ph * 0.014 + Math.sin(ph * 6 + i) * 0.002, 0.082 + ph * 0.032, 0.006); z.scale.setScalar(0.0026 + ph * 0.0036); z.rotation.z = 0.25 - ph * 0.35; z.visible = ph < 0.9; });
    return {
      g,
      tick: (t) => { all.position.y = Math.sin(t * 1.2) * 0.003; bl.scale.y = 0.0158 * (1 + Math.sin(t * 1.6) * 0.04); zfly(t, 0.22); stars.forEach((s2, i) => (s2.rotation.y = t * 0.8 + i)); },
      act: (t) => { all.position.y = Math.sin(t * 2.2) * 0.006; zfly(t, 0.6); ears.forEach((e, i) => (e.rotation.z = -1.25 + (Math.sin(t * 7 + i * 2) > 0.8 ? 0.35 : 0))); stars.forEach((s2, i) => { s2.rotation.y = t * 5 + i; s2.scale.setScalar(0.0042 * (1 + Math.abs(Math.sin(t * 4 + i)) * 0.4)); }); },
    };
  },
  P7(m) { // 小夢狐
    const g = new THREE.Group(), all = new THREE.Group(); g.add(all);
    part(all, G.sph(), m.main, [0.004, 0.02, -0.006], [0.03, 0.019, 0.024]);
    part(all, G.sph(), m.sub, [-0.004, 0.016, 0.01], [0.018, 0.012, 0.012]);
    for (const k of [-1, 1]) part(all, G.sph(), m.acc2, [-0.012 + k * 0.008, 0.006, 0.02], [0.0055, 0.004, 0.007]);
    const tl = new THREE.Group(); all.add(tl);
    const tg = taperTube([[0.028, 0.016, -0.018], [0.041, 0.016, 0.006], [0.027, 0.017, 0.028], [0.0, 0.018, 0.036], [-0.025, 0.021, 0.029]], (u) => 0.004 + Math.sin(Math.min(1, u * 1.12) * PI) * 0.0115 + u * 0.003, 48, 18);
    part(tl, tg, m.main, [0, 0, 0]);
    part(tl, G.sph(), m.sub, [-0.029, 0.022, 0.026], [0.0095, 0.009, 0.0095]);
    const hd = new THREE.Group(); hd.position.set(-0.014, 0.037, 0.02); hd.rotation.set(0.12, 0.5, 0.26); all.add(hd);
    const hs = [0.022, 0.019, 0.02];
    const hm = part(hd, G.sph(), m.main, [0, 0, 0], hs);
    for (const k of [-1, 1]) part(hd, G.sph(), m.sub, [k * 0.012, -0.007, 0.01], [0.0095, 0.008, 0.008]);
    part(hd, G.sph(), m.sub, [0, -0.0062, 0.017], [0.0085, 0.0068, 0.011]);
    part(hd, G.sph(), m.eye, [0, -0.0036, 0.0275], [0.0028, 0.0022, 0.002]);
    paintedFace(hd, hm, 'P7', { eye: 'closed', lash: true, mouth: 'none', ey: 0.42, ex: 0.21, blush: 'rgba(255,120,140,.65)' }, { pitch0: 0.05, rough: 0.8 });
    for (const k of [-1, 1]) { const e = new THREE.Group(); e.position.set(k * 0.0128, 0.016, -0.003); e.rotation.z = -k * 0.3; hd.add(e); part(e, G.cone(), m.main, [0, 0.008, 0], [0.0085, 0.018, 0.0055]); part(e, G.cone(), m.acc2, [0, 0.0142, 0.0002], [0.0042, 0.0062, 0.0034]); part(e, G.cone(), m.sub, [0, 0.0062, 0.0028], [0.0045, 0.01, 0.0016]); }
    nightcap(hd, m, 'acc', m.sub, { p: [0.003, 0.0135, -0.004], r: [-0.3, 0, -0.5], s: [0.0178, 0.036], bend: 0.8, flop: 0.4, pom: 'star', pomR: 0.0048 });
    // 夢泡泡
    const bubM = new THREE.MeshPhysicalMaterial({ color: '#eef6ff', roughness: 0.08, transmission: 0.92, thickness: 0.003, ior: 1.3, clearcoat: 1, envMapIntensity: 0.7, iridescence: 0.6, iridescenceIOR: 1.4, iridescenceThicknessMinimum: 200, iridescenceThicknessMaximum: 500 });
    part(all, G.sph(), bubM, [0.004, 0.056, 0.014], 0.0026);
    part(all, G.sph(), bubM, [0.011, 0.064, 0.011], 0.0036);
    const db = new THREE.Group(); db.position.set(0.022, 0.08, 0.006); all.add(db);
    part(db, G.sph(), bubM, [0, 0, 0], 0.0165);
    const moonS = new THREE.Shape(); moonS.absarc(0, 0, 1, 0, PI * 2, false); const hole = new THREE.Path(); hole.absarc(0.42, 0.18, 0.86, 0, PI * 2, true); moonS.holes.push(hole);
    const moonG = new THREE.ExtrudeGeometry(moonS, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 3, curveSegments: 24 }); moonG.translate(0, 0, -0.175);
    const inner = new THREE.Group(); db.add(inner);
    part(inner, moonG, glowMat('#ffcf4a', 0.75, '#ffe9a0'), [-0.002, 0, 0], 0.0072, [0, 0, 0.4]);
    const tw = [];
    for (const [x, y] of [[0.007, 0.006], [0.006, -0.006], [-0.008, -0.007]]) tw.push(part(inner, star5(), m.star, [x, y, 0.002], 0.0022));
    return {
      g,
      tick: (t) => { tl.rotation.y = Math.sin(t * 0.9) * 0.04; db.position.y = 0.08 + Math.sin(t * 1.3) * 0.002; all.scale.y = 1 + Math.sin(t * 1.4) * 0.01; tw.forEach((s2, i) => (s2.rotation.z = t + i)); },
      act: (t) => { tl.rotation.y = Math.sin(t * 2.4) * 0.12; db.scale.setScalar(1 + Math.abs(Math.sin(t * 1.8)) * 0.28); inner.rotation.z = Math.sin(t * 1.5) * 0.4; hd.rotation.z = 0.26 + Math.sin(t * 1.2) * 0.08; tw.forEach((s2, i) => s2.scale.setScalar(0.0022 * (1 + Math.abs(Math.sin(t * 5 + i)) * 0.8))); },
    };
  },
  P8(m) { // 枕頭大王（北極熊）
    const g = new THREE.Group(), all = new THREE.Group(); g.add(all);
    const pils = [];
    for (const [y, sx, sz, th, ry, role] of [[0.009, 0.05, 0.04, 0.018, 0.1, 'acc'], [0.0255, 0.045, 0.037, 0.016, -0.22, 'acc2'], [0.0405, 0.04, 0.034, 0.014, 0.15, 'acc3']]) {
      const pg = new THREE.Group(); pg.position.y = y; pg.rotation.y = ry; all.add(pg);
      part(pg, pillowGeo(), m[role], [0, 0, 0], [sx, sz, th], [-PI / 2, 0, 0]);
      if (role === 'acc') for (const [cx, cz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { part(pg, G.sph(), m.gold, [cx * sx * 0.93, 0, cz * sz * 0.93], 0.0024); part(pg, G.cone(), m.gold, [cx * sx * 0.97, -0.004, cz * sz * 0.97], [0.0022, 0.007, 0.0022], [PI, 0, 0]); }
      pils.push(pg);
    }
    const bear = new THREE.Group(); bear.position.y = 0.046; all.add(bear);
    part(bear, G.sph(), m.main, [0, 0.016, -0.004], [0.022, 0.02, 0.019]);
    for (const k of [-1, 1]) { part(bear, G.sph(), m.main, [k * 0.012, 0.004, 0.016], [0.0078, 0.0068, 0.011]); part(bear, G.sph(), m.sub, [k * 0.012, 0.004, 0.0265], [0.0048, 0.0042, 0.0016]); }
    const rp = []; for (let i = 0; i <= 10; i++) { const t = i / 10; rp.push(new THREE.Vector2(0.0165 + 0.0165 * Math.pow(t, 0.9), 0.034 - 0.038 * t)); }
    m.robe.side = THREE.DoubleSide;
    part(bear, new THREE.LatheGeometry(rp, 40, 0.72, PI * 2 - 1.44), m.robe, [0, 0, -0.004]);
    part(bear, G.torus(PI * 2 - 1.44, 0.1), m.gold, [0, -0.0035, -0.004], 0.033, [PI / 2, 0, PI / 2 - (PI * 2 - 0.72)]);
    part(bear, G.torus(PI * 2, 0.45), m.milk, [0, 0.032, -0.002], [0.0135, 0.0125, 0.012], [PI / 2, 0, 0]);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; part(bear, G.sph(), m.rubber, [Math.sin(a) * 0.0155, 0.0345, Math.cos(a) * 0.0142 - 0.002], 0.0012); }
    part(bear, G.sph(), m.main, [-0.02, 0.012, 0.009], [0.0068, 0.011, 0.0072], [0.4, 0, 0.3]);
    const ra = new THREE.Group(); ra.position.set(0.02, 0.024, 0.002); ra.rotation.z = 2.3; bear.add(ra);
    part(ra, G.sph(), m.main, [0, -0.01, 0], [0.0066, 0.012, 0.0068]);
    const sc = new THREE.Group(); sc.position.set(0.0364, 0.0386, 0.004); bear.add(sc);
    part(sc, G.cyl(), m.gold, [0, 0.004, 0], [0.0016, 0.04, 0.0016]);
    part(sc, G.sph(), m.gold, [0, -0.016, 0], 0.0025);
    const sst = part(sc, star5(), m.star, [0, 0.0275, 0], 0.0078);
    part(sc, G.torus(PI * 2, 0.15), m.gold, [0, 0.0275, 0], 0.0105);
    const head = new THREE.Group(); head.position.set(0, 0.048, 0); bear.add(head);
    const hs = [0.028, 0.025, 0.025];
    const hm = part(head, G.sph(), m.main, [0, 0, 0], hs);
    const mzc = [0, -0.0082, 0.018], mzs = [0.012, 0.0088, 0.0085];
    part(head, G.sph(), m.sub, mzc, mzs);
    part(head, G.sph(), m.eye, [0, -0.0048, 0.0258], [0.0038, 0.0027, 0.0022]);
    smile(head, m, mzc, mzs, { pitch: -0.32, w: 0.0042, open: 0.72 });
    paintedFace(head, hm, 'P8', { eye: 'happy', mouth: 'none', ey: 0.44, ex: 0.2, blush: 'rgba(255,120,150,.75)' }, { pitch0: -0.03, rough: 0.8 });
    for (const k of [-1, 1]) { part(head, G.sph(), m.main, [k * 0.02, 0.018, -0.003], [0.0085, 0.0085, 0.0055]); part(head, G.sph(), m.sub, [k * 0.02, 0.018, 0.0002], [0.005, 0.005, 0.002]); }
    const nc = nightcap(head, m, 'robe', m.milk, { p: [0, 0.015, -0.003], r: [-0.15, 0, -0.2], s: [0.0235, 0.044], bend: 0.7, flop: 0.4, pom: 'ball', pomR: 0.0062 });
    const cr = new THREE.Group(); cr.position.set(0, 0.0175, -0.003); cr.rotation.set(-0.15, 0, -0.2); head.add(cr);
    part(cr, G.cyl(), m.gold, [0, 0.003, 0], [0.0248, 0.0062, 0.0248]);
    const gems = [glowMat('#ff3a5a', 1.2), glowMat('#3a8cff', 1.2)];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2 + PI / 2; part(cr, G.cone(), m.gold, [Math.cos(a) * 0.0236, 0.0098, Math.sin(a) * 0.0236], [0.0038, 0.0086, 0.0038]); part(cr, G.sph(), gems[i % 2], [Math.cos(a) * 0.0252, 0.003, Math.sin(a) * 0.0252], 0.0019); }
    return {
      g,
      tick: (t) => { sst.rotation.y = t * 1.2; sst.material.emissiveIntensity = 0.9 + Math.sin(t * 3) * 0.3; bear.scale.y = 1 + Math.sin(t * 1.4) * 0.01; nc.g.rotation.z = -0.2 + Math.sin(t * 1.4) * 0.04; },
      act: (t) => { const w = Math.sin(t * 2.4); sc.rotation.z = w * 0.35; sc.position.y = 0.0386 + Math.abs(w) * 0.006; sst.rotation.y = t * 5; sst.scale.setScalar(0.0078 * (1 + Math.abs(Math.sin(t * 4.8)) * 0.35)); pils.forEach((p, i) => p.scale.set(1, 1 - Math.abs(Math.sin(t * 2.4 + i)) * 0.07, 1)); bear.rotation.z = Math.sin(t * 1.2) * 0.07; cr.position.y = 0.0175 + Math.abs(Math.sin(t * 4.8)) * 0.002; },
    };
  },
  PH(m) { // 夢遊貓
    const g = new THREE.Group(), all = new THREE.Group(); g.add(all);
    const glowStar = glowMat('#fff2a8', 1.5, '#fffbe0');
    const sd = new THREE.Mesh(new THREE.CircleGeometry(0.03, 32), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.28, depthWrite: false }));
    sd.rotation.x = -PI / 2; sd.position.y = 0.0005; g.add(sd);
    const fl = new THREE.Group(); all.add(fl);
    part(fl, bellGeo(0.5, 1, 1, 0.12), m.main, [0, 0.006, 0], [0.026, 0.05, 0.024]);
    part(fl, G.torus(PI * 2, 0.1), m.milk, [0, 0.007, 0], [0.029, 0.0272, 0.03], [PI / 2, 0, 0]);
    const R = rnd(29);
    for (let i = 0; i < 18; i++) {
      const tt = 0.12 + R() * 0.8, a = R() * PI * 2, r = 0.5 + 0.5 * Math.pow(tt, 1.3) + 0.12 * Math.pow(tt, 6);
      const st = part(fl, star5(), glowStar, [Math.sin(a) * r * 0.026 * 1.02, 0.006 + 0.05 * (1 - tt), Math.cos(a) * r * 0.024 * 1.02], 0.0018 + R() * 0.0012);
      st.lookAt(st.position.clone().multiply(V3(2, 0, 2)).add(V3(0, st.position.y, 0)));
    }
    for (const k of [-1, 1]) part(fl, G.sph(), m.sub, [k * 0.008, 0.005, 0.024], [0.0052, 0.0038, 0.0068]);
    for (const k of [-1, 1]) { const s = new THREE.Group(); s.position.set(k * 0.014, 0.05, 0.004); s.rotation.x = 1.35; fl.add(s); part(s, G.cyl(), m.main, [0, 0.011, 0], [0.0052, 0.022, 0.0052]); part(s, G.torus(PI * 2, 0.3), m.milk, [0, 0.022, 0], [0.0056, 0.0056, 0.006], [PI / 2, 0, 0]); part(s, G.sph(), m.sub, [0, 0.026, 0], 0.0048); }
    const lt = new THREE.Group(); lt.position.set(0.014, 0.054, 0.031); fl.add(lt);
    part(lt, G.cyl(), m.gold, [0, -0.005, 0], [0.0005, 0.01, 0.0005]);
    part(lt, G.cone(), m.gold, [0, -0.0105, 0], [0.0056, 0.004, 0.0056]);
    part(lt, G.cyl(), m.glass, [0, -0.017, 0], [0.0048, 0.01, 0.0048]);
    const flame = part(lt, G.sph(), glowMat('#ffb84a', 2.6, '#fff0c0'), [0, -0.017, 0], [0.0024, 0.0034, 0.0024]);
    part(lt, G.cyl(), m.gold, [0, -0.0225, 0], [0.0056, 0.0018, 0.0056]);
    const head = new THREE.Group(); head.position.set(0, 0.074, 0.004); fl.add(head);
    const hs = [0.029, 0.025, 0.026];
    const hm = part(head, G.sph(), m.sub, [0, 0, 0], hs);
    for (const k of [-1, 1]) { part(head, G.cone(), m.sub, [k * 0.018, 0.021, -0.003], [0.0098, 0.016, 0.0066], [0, 0, -k * 0.4]); part(head, G.cone(), m.acc, [k * 0.018, 0.02, 0.0005], [0.0055, 0.01, 0.002], [0, 0, -k * 0.4]); }
    paintedFace(head, hm, 'PH', { eye: 'closed', lash: true, mouth: 'tiny', ey: 0.46, ex: 0.21, blush: 'rgba(255,140,190,.7)' }, { pitch0: -0.05, rough: 0.7 });
    nightcap(head, m, 'main', m.milk, { p: [0, 0.015, -0.004], r: [-0.2, 0, 0.35], s: [0.0245, 0.05], bend: -0.75, flop: 0.42, pom: 'star', pomR: 0.0058 });
    const zm = glowMat('#c8c0ff', 1.2, '#f0eeff');
    const zs = [0, 1, 2].map(() => part(all, zGeo(), zm, [0, 0, 0], 0.004));
    const zfly = (t, sp) => zs.forEach((z, i) => { const ph = (t * sp + i / 3) % 1; z.position.set(0.024 + ph * 0.012 + Math.sin(ph * 6 + i) * 0.002, 0.092 + ph * 0.03, 0.002); z.scale.setScalar(0.0026 + ph * 0.0034); z.rotation.z = -0.2 + ph * 0.3; z.visible = ph < 0.9; });
    const orb = [0, 1, 2, 3].map(() => part(all, star5(), glowStar, [0, 0, 0], 0.0022));
    return {
      g,
      tick: (t) => { fl.position.y = 0.003 + Math.sin(t * 1.4) * 0.003; sd.material.opacity = 0.22 - Math.sin(t * 1.4) * 0.05; lt.rotation.z = Math.sin(t * 1.4) * 0.12; zfly(t, 0.2); orb.forEach((s2, i) => { const a = t * 0.7 + (i / 4) * PI * 2; s2.position.set(Math.cos(a) * 0.04, 0.05 + Math.sin(t * 1.3 + i) * 0.012, Math.sin(a) * 0.034); s2.rotation.y = t * 2; }); flame.material.emissiveIntensity = 2 + Math.sin(t * 11) * 0.2; },
      act: (t) => { fl.position.y = 0.004 + Math.abs(Math.sin(t * 2.4)) * 0.006; fl.position.z = Math.sin(t * 1.2) * 0.006; fl.rotation.z = Math.sin(t * 2.4) * 0.05; lt.rotation.z = Math.sin(t * 2.4) * 0.35; zfly(t, 0.55); head.rotation.z = Math.sin(t * 1.2) * 0.12; orb.forEach((s2, i) => { const a = t * 1.8 + (i / 4) * PI * 2; s2.position.set(Math.cos(a) * 0.045, 0.05 + Math.sin(t * 3 + i) * 0.018, Math.sin(a) * 0.038); }); },
    };
  },
};

export const PAL2 = {
  M1: [{ main: '#6f8a52', sub: '#d8dcd2', acc: '#e8a83a', acc2: '#3a3f48' }, { main: '#c8a46a', sub: '#f0e8d8', acc: '#3a8cff', acc2: '#4a3a30' }, ['sub', 'acc2']],
  M2: [{ main: '#ffc23a', sub: '#3a3e48', acc: '#ff7a1a', acc2: '#2a2c32' }, { main: '#36cfa0', sub: '#2a3440', acc: '#f4f6fb', acc2: '#1a2028' }, ['sub', 'acc2']],
  M3: [{ main: '#2a4aa0', sub: '#eef0f6', acc: '#ffcf4a', acc2: '#30343e' }, { main: '#8a2a3a', sub: '#f6efe2', acc: '#c8d0dc', acc2: '#2a2a30' }, ['sub']],
  M4: [{ main: '#3a9cff', sub: '#f4f6fb', acc: '#ffd23a', acc2: '#e8333a' }, { main: '#28d49c', sub: '#232838', acc: '#ff8a1a', acc2: '#ffffff' }, ['sub']],
  M5: [{ main: '#5a6a7c', sub: '#c8ccd4', acc: '#ff8a1a', acc2: '#2a2e36' }, { main: '#4f6a3a', sub: '#ddd4bc', acc: '#ffd23a', acc2: '#2a2a24' }, ['sub']],
  M6: [{ main: '#2a5aff', sub: '#f2f4fa', acc: '#ffcf4a', acc2: '#20242e' }, { main: '#7a2aff', sub: '#20202c', acc: '#d8dee8', acc2: '#ff4a8a' }, ['sub', 'acc2']],
  M7: [{ main: '#e8333a', sub: '#2c2e36', acc: '#ffc23a', acc2: '#4a4e58' }, { main: '#1c1c24', sub: '#e8333a', acc: '#ff8a1a', acc2: '#c8ccd4' }, ['sub']],
  M8: [{ main: '#f2f4fc', sub: '#1c2c5e', acc: '#ffcf5a', acc2: '#9ab0d8' }, { main: '#262632', sub: '#7a1e32', acc: '#ffcf5a', acc2: '#ff6a4a' }, ['main', 'sub']],
  MH: [{ main: '#141418', sub: '#2a2a34', acc: '#ffcf5a' }, null],
  S1: [{ main: '#e8a050', sub: '#fff1dc', acc: '#ff4a5a', acc2: '#2a3a5a', acc3: '#ffd23a' }, { main: '#3a3236', sub: '#f2e2c8', acc: '#3ac8ff', acc2: '#ff7a2a', acc3: '#ffffff' }, ['acc2', 'acc3']],
  S2: [{ main: '#f2b25a', sub: '#fffaf0', acc: '#b6ff3a', acc2: '#24262e', acc3: '#ffb0b8' }, { main: '#e2dce8', sub: '#ffffff', acc: '#ff5ac8', acc2: '#2a2a3a', acc3: '#ffb0c8' }, ['acc', 'acc2']],
  S3: [{ main: '#a8a0dc', sub: '#e6e0ff', acc: '#ff3a4a', acc2: '#ffffff', acc3: '#ffb0c8' }, { main: '#86cc9e', sub: '#e0fff0', acc: '#2a5aff', acc2: '#ffd23a', acc3: '#ffb0b8' }],
  S4: [{ main: '#4fb84a', sub: '#f2f0a8', acc: '#2f8a3a', acc2: '#c8c070' }, { main: '#5a6aff', sub: '#e0e8ff', acc: '#2a3aa8', acc2: '#a8b0e0' }],
  S5: [{ main: '#6a4aff', sub: '#d4c8ff', acc: '#ffc23a', acc2: '#1c1c26', acc3: '#ff3fb4' }, { main: '#ff8a3a', sub: '#ffe4c8', acc: '#ffd23a', acc2: '#1a2a4a', acc3: '#3fe0ff' }, ['acc2']],
  S6: [{ main: '#262a40', sub: '#ffffff', acc: '#e8333a', acc2: '#ffb0c8' }, { main: '#f2f2f6', sub: '#2a2a34', acc: '#3a8cff', acc2: '#ff8ac0' }],
  S7: [{ main: '#8a9ab8', sub: '#f0f4fa', acc: '#e8333a', acc2: '#1c1c22', acc3: '#3a4a7a' }, { main: '#3a3448', sub: '#d8d0e8', acc: '#3fe0ff', acc2: '#e8e8f0', acc3: '#5a2a4a' }, ['acc', 'acc2']],
  S8: [{ main: '#ff9a2a', sub: '#fff6e8', acc: '#1e2a5a', acc2: '#f2e6c8', acc3: '#1a1a1e', acc4: '#ff8aa0' }, { main: '#f4f4f8', sub: '#ffffff', acc: '#5a1a2a', acc2: '#1a1a1e', acc3: '#ffcf5a', acc4: '#ff9ab0' }, ['acc3']],
  SH: [{ main: '#f8f8fa', acc: '#ff3fb4', sub: '#3fe0ff' }, null],
  P1: [{ main: '#a0704a', sub: '#f6e4cc', acc: '#5a8aff', acc2: '#ffffff' }, { main: '#d6c4b0', sub: '#fffaf2', acc: '#ff7ab0', acc2: '#ffffff' }],
  P2: [{ main: '#f2c8a0', sub: '#fff0e2', acc: '#8ac8ff', acc2: '#ff8aa8' }, { main: '#c8b0f0', sub: '#f4ecff', acc: '#ffb0c8', acc2: '#ffe07a' }, ['acc2']],
  P3: [{ main: '#efe8dc', sub: '#f2d6c4', acc: '#6a8aff', acc2: '#8a5a3a', acc3: '#ffb0c0' }, { main: '#ffe0ee', sub: '#fff0e6', acc: '#ffb84a', acc2: '#6a8aff', acc3: '#ffa0b8' }, ['acc2']],
  P4: [{ main: '#f2a24a', sub: '#fff6ea', acc: '#5ac85a', acc2: '#ffe14a', acc3: '#c8f0a0' }, { main: '#e8d0b0', sub: '#ffffff', acc: '#ff7ab0', acc2: '#8a6aff', acc3: '#ffd0e4' }],
  P5: [{ main: '#eeeef2', sub: '#24242c', acc: '#a8d8ff', acc2: '#ffa8c8' }, { main: '#fff4e8', sub: '#6a3a2a', acc: '#c8f0b0', acc2: '#ffd27a' }],
  P6: [{ main: '#f4e6ec', sub: '#e2eaf8', acc: '#b8a0ff', acc2: '#ffe07a', acc3: '#ffb0c8' }, { main: '#d8c4a8', sub: '#ffe8f2', acc: '#7ad8ff', acc2: '#ffffff', acc3: '#ffb0b8' }],
  P7: [{ main: '#ff7a3a', sub: '#fff6ee', acc: '#7a5aff', acc2: '#3a2a2a' }, { main: '#e8eef8', sub: '#ffffff', acc: '#3fa8ff', acc2: '#8a96b0' }],
  P8: [{ main: '#e4e8f2', sub: '#f4e8d4', acc: '#ffb0cf', acc2: '#a8f0d4', acc3: '#c8b8ff', robe: '#6a3ad8' }, { main: '#f2d8b0', sub: '#fff8ec', acc: '#8ac8ff', acc2: '#ffe08a', acc3: '#ffb08a', robe: '#c8203a' }],
  PH: [{ main: '#1e2058', sub: '#ccc6e8', acc: '#ffb8d8' }, null],
};
