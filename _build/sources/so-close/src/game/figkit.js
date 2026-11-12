// 公仔工具箱：共用幾何、臉、材質（依系列表面＋版本）
// 每隻公仔：底部在 y=0，高約 0.11～0.13；正面朝 +z
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { canvasTex } from '../engine/tex.js';
import { CHAR, SERIES } from './data.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Z = V3(0, 0, 1);
const rnd = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };

// ---------------- 共用幾何（單位大小，用 mesh.scale 放大縮小） ----------------
const GC = {};
// 快取的幾何會被很多隻公仔共用：標記起來，丟掉公仔時不要釋放
const gq = (k, f) => GC[k] || (GC[k] = (() => { const g = f(); g.userData.cached = true; return g; })());
const G = {
  sph: () => gq('sph', () => new THREE.SphereGeometry(1, 48, 32)),
  sphS: () => gq('sphS', () => new THREE.SphereGeometry(1, 20, 14)),
  cone: () => gq('cone', () => new THREE.ConeGeometry(1, 1, 32, 1)),
  cyl: () => gq('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 36)),
  disk: () => gq('disk', () => new THREE.CircleGeometry(1, 32)),
  cap: () => gq('cap', () => new THREE.CapsuleGeometry(0.5, 1, 8, 24)),
  oct: () => gq('oct', () => new THREE.OctahedronGeometry(1, 0)),
  torus: (arc = Math.PI * 2, t = 0.22) => gq('tor' + arc.toFixed(3) + t, () => new THREE.TorusGeometry(1, t, 12, 40, arc)),
};
const star5 = (ro = 1, ri = 0.45, depth = 0.4) => gq('star' + ro + ri + depth, () => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, r = i % 2 ? ri : ro; const x = Math.sin(a) * r, y = Math.cos(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 3 });
  g.translate(0, 0, -depth / 2); return g;
});

const rbox = (w, h, d, r = 0.2) => gq('rb' + w + h + d + r, () => new RoundedBoxGeometry(w, h, d, 4, Math.min(w, h, d) * r));
function gearGeo(teeth, ro, rr, hole, depth) {
  return gq('gear' + teeth + ro + rr + hole + depth, () => {
    const s = new THREE.Shape(), n = teeth * 4;
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, k = i % 4, r = k === 0 || k === 3 ? rr : ro; const da = (k === 1 ? -0.18 : k === 2 ? 0.18 : 0) * (Math.PI * 2 / teeth) / 4; const x = Math.cos(a + da) * r, y = Math.sin(a + da) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
    if (hole) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h); }
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * 0.25, bevelSize: depth * 0.2, bevelSegments: 2, curveSegments: 10 }); g.translate(0, 0, -depth / 2); return g;
  });
}
const heartGeo = () => gq('heart', () => {
  const hs = new THREE.Shape();
  hs.moveTo(0, -0.9); hs.bezierCurveTo(-0.1, -0.7, -1.1, -0.15, -1, 0.45); hs.bezierCurveTo(-0.9, 1.05, -0.15, 1.1, 0, 0.62);
  hs.bezierCurveTo(0.15, 1.1, 0.9, 1.05, 1, 0.45); hs.bezierCurveTo(1.1, -0.15, 0.1, -0.7, 0, -0.9);
  const g = new THREE.ExtrudeGeometry(hs, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.25, bevelSegments: 5, curveSegments: 24 }); g.translate(0, 0, -0.2); return g;
});
const tube = (pts, r, seg = 24) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => V3(...p))), seg, r, 12);
function part(parent, geo, mat, p = [0, 0, 0], s = 1, r = null) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(p[0], p[1], p[2]);
  if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]);
  if (r) m.rotation.set(r[0], r[1], r[2]);
  parent.add(m);
  return m;
}
// 橢球表面上的一點：中心 c、半徑 s（三軸）、左右角 yaw、上下角 pitch
function surf(c, s, yaw, pitch) {
  const d = V3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  return { p: V3(c[0] + d.x * s[0], c[1] + d.y * s[1], c[2] + d.z * s[2]), n: V3(d.x / s[0], d.y / s[1], d.z / s[2]).normalize() };
}
// 貼在表面、朝外
function onSurf(parent, geo, mat, c, s, yaw, pitch, { inset = 0, scale = 1, roll = 0 } = {}) {
  const { p, n } = surf(c, s, yaw, pitch);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(p).addScaledVector(n, -inset);
  m.quaternion.setFromUnitVectors(Z, n);
  if (roll) m.rotateZ(roll);
  if (typeof scale === 'number') m.scale.setScalar(scale); else m.scale.set(scale[0], scale[1], scale[2]);
  parent.add(m);
  return m;
}

// ---------------- 臉 ----------------
// 珠子眼（黑色亮面＋高光）
function beads(g, m, c, s, { yaw = 0.42, pitch = 0.08, r = 0.0062, mat = null } = {}) {
  const out = [];
  for (const k of [-1, 1]) {
    const { p, n } = surf(c, s, k * yaw, pitch);
    const e = part(g, G.sph(), mat || m.eye, [p.x - n.x * r * 0.38, p.y - n.y * r * 0.38, p.z - n.z * r * 0.38], [r, r * 1.12, r]);
    const h = p.clone().addScaledVector(n, r * 0.5).add(V3(-0.32 * r, 0.42 * r, 0.05 * r));
    part(g, G.sphS(), m.hl, [h.x, h.y, h.z], r * 0.3);
    out.push(e);
  }
  return out;
}
// 卡通眼（白眼＋黑瞳）
function toonEyes(g, m, c, s, { yaw = 0.36, pitch = 0.1, r = 0.0095, pr = 0.55, look = [0, 0] } = {}) {
  for (const k of [-1, 1]) {
    onSurf(g, G.sph(), m.white, c, s, k * yaw, pitch, { inset: r * 0.25, scale: [r, r * 1.1, r * 0.5] });
    const { p, n } = surf(c, s, k * yaw + look[0], pitch + look[1]);
    const pp = p.clone().addScaledVector(n, r * 0.22);
    part(g, G.sph(), m.eye, [pp.x, pp.y, pp.z], [r * pr, r * pr * 1.1, r * pr * 0.6]).quaternion.setFromUnitVectors(Z, n);
    const h = pp.clone().addScaledVector(n, r * pr * 0.5).add(V3(-0.25 * r * pr, 0.35 * r * pr, 0));
    part(g, G.sphS(), m.hl, [h.x, h.y, h.z], r * pr * 0.32);
  }
}
function smile(g, m, c, s, { pitch = -0.12, w = 0.006, t = 0.24, open = 0.75, yaw = 0, mat = null } = {}) {
  const arc = Math.PI * open;
  const mm = onSurf(g, G.torus(arc, t), mat || m.dark, c, s, yaw, pitch, { inset: w * 0.05, scale: w, roll: Math.PI + (Math.PI - arc) / 2 });
  return mm;
}
// ω 形嘴
function catMouth(g, m, c, s, { pitch = -0.14, w = 0.0042, gap = 0.08 } = {}) {
  for (const k of [-1, 1]) smile(g, m, c, s, { pitch, w, yaw: k * gap, open: 0.85 });
}
function blush(g, m, c, s, { yaw = 0.62, pitch = -0.08, r = 0.0068 } = {}) {
  for (const k of [-1, 1]) onSurf(g, G.disk(), m.blush, c, s, k * yaw, pitch, { inset: -0.0006, scale: [r * 1.5, r, 1] });
}
function dotMouth(g, m, c, s, { pitch = -0.14, r = 0.0032, yaw = 0 } = {}) {
  return onSurf(g, G.sph(), m.dark, c, s, yaw, pitch, { inset: r * 0.3, scale: [r, r * 1.2, r * 0.5] });
}

// 畫在臉上的大眼睛：一塊貼在頭上的球面片
// eye：normal／closed（睡著 ‿）／happy（笑瞇 ︶ 反過來）／half（半睜：睏或很酷）／flat
// mouth：smile／w／o／grin／pout／none／yawn／smirk／tiny／fang
function faceTex(key, o) {
  return canvasTex('face' + key, 512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const ex = o.ex ?? 0.2, ey = o.ey ?? 0.48, er = o.er ?? 0.19;
    const ink = o.ink || '#2a1a22';
    // 熊貓的黑眼圈
    if (o.patch) {
      for (const k of [-1, 1]) {
        g.save(); g.translate(w * (0.5 + k * ex), h * (ey + 0.03)); g.rotate(k * -0.45);
        g.fillStyle = o.patch; g.beginPath(); g.ellipse(0, 0, er * h * 1.62, er * h * 1.22, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
    }
    const eye = (x, y, flip) => {
      const R = er * h * 1.15;
      const line = o.eyeRim ? '#f6f2fa' : ink;
      if (o.eye === 'closed' || o.eye === 'happy') {
        g.strokeStyle = line; g.lineWidth = R * 0.22; g.lineCap = 'round';
        g.beginPath();
        if (o.eye === 'closed') g.arc(x, y - R * 0.2, R * 0.75, 0.15 * Math.PI, 0.85 * Math.PI);
        else g.arc(x, y + R * 0.45, R * 0.75, 1.15 * Math.PI, 1.85 * Math.PI);
        g.stroke();
        if (o.lash && o.eye === 'closed') for (let i = 0; i < 2; i++) { const a = (0.2 + i * 0.16) * Math.PI; const px = x + Math.cos(a) * R * 0.75 * flip, py = y - R * 0.2 + Math.sin(a) * R * 0.75; g.lineWidth = R * 0.12; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * R * 0.3 * flip, py + Math.sin(a) * R * 0.3); g.stroke(); }
        return;
      }
      if (o.eye === 'flat') {
        g.fillStyle = ink; g.beginPath(); g.ellipse(x, y, R * 0.75, R * 0.5, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x - R * 0.25, y - R * 0.15, R * 0.18, R * 0.14, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = o.lid || ink; g.fillRect(x - R, y - R * 1.0, R * 2, R * 0.75);
        return;
      }
      const rx = R * (o.wide ?? 0.82), ry = R;
      const lid = y - ry * (o.lidAt ?? 0.12);
      g.save();
      if (o.eye === 'half') { g.beginPath(); g.rect(x - rx * 2, lid, rx * 4, ry * 3); g.clip(); }
      g.fillStyle = '#1e1420'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
      const gr = g.createLinearGradient(x, y - ry, x, y + ry);
      gr.addColorStop(0, o.iris2 || '#1a1030'); gr.addColorStop(0.55, o.iris || '#7a4aff'); gr.addColorStop(1, o.iris3 || '#e8c8ff');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y + ry * 0.04, rx * 0.86, ry * 0.88, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(10,6,20,.85)'; g.beginPath(); g.ellipse(x, y + ry * 0.08, rx * 0.42, ry * 0.46, 0, 0, Math.PI * 2); g.fill();
      if (o.starPupil) { g.fillStyle = o.starPupil; star(g, x, y + ry * 0.12, ry * 0.36); }
      g.fillStyle = '#ffffff';
      const hy = o.eye === 'half' ? Math.max(y - ry * 0.38, lid + ry * 0.22) : y - ry * 0.38;
      g.beginPath(); g.ellipse(x - rx * 0.32 * flip, hy, rx * 0.34, ry * 0.26, -0.4 * flip, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(x + rx * 0.34 * flip, y + ry * 0.4, rx * 0.14, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 0.6; g.beginPath(); g.arc(x + rx * 0.1 * flip, y - ry * 0.05, rx * 0.07, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      g.restore();
      if (o.eyeRim) { g.strokeStyle = 'rgba(246,242,250,.85)'; g.lineWidth = R * 0.1; g.beginPath(); if (o.eye === 'half') g.ellipse(x, y, rx * 1.04, ry * 1.04, 0, 0, Math.PI); else g.ellipse(x, y, rx * 1.04, ry * 1.04, 0, 0, Math.PI * 2); g.stroke(); }
      if (o.eye === 'half') {
        const tl = (o.lidTilt || 0) * ry * 0.3;
        g.strokeStyle = line; g.lineWidth = R * 0.22; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x - rx * 1.08 * flip, lid + tl); g.quadraticCurveTo(x, lid - ry * 0.1, x + rx * 1.08 * flip, lid - tl); g.stroke();
      }
      if (o.lash) {
        g.strokeStyle = line; g.lineWidth = R * 0.12; g.lineCap = 'round';
        for (let i = 0; i < 2; i++) { const a = -0.55 - i * 0.38; g.beginPath(); g.moveTo(x + Math.cos(a) * rx * flip * 0.95, y + Math.sin(a) * ry * 0.95); g.lineTo(x + Math.cos(a) * rx * 1.42 * flip, y + Math.sin(a) * ry * 1.32); g.stroke(); }
      }
      if (o.brow) { g.strokeStyle = line; g.lineWidth = R * 0.16; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - rx * 0.9 * flip, y - ry * (1.45 + o.brow * 0.25)); g.lineTo(x + rx * 0.7 * flip, y - ry * (1.45 - o.brow * 0.3)); g.stroke(); }
    };
    eye(w * (0.5 - ex), h * ey, 1); eye(w * (0.5 + ex), h * ey, -1);
    // 腮紅
    if (o.blush !== false) {
      for (const k of [-1, 1]) {
        const x = w * (0.5 + k * (ex + 0.06)), y = h * (ey + 0.2);
        const r = g.createRadialGradient(x, y, 0, x, y, h * 0.1);
        r.addColorStop(0, o.blush || 'rgba(255,120,150,.75)'); r.addColorStop(1, 'rgba(255,120,150,0)');
        g.fillStyle = r; g.beginPath(); g.ellipse(x, y, h * 0.12, h * 0.07, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(255,90,130,.55)'; g.lineWidth = 3; g.lineCap = 'round';
        for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x + i * 10 - 3, y + 5); g.lineTo(x + i * 10 + 3, y - 5); g.stroke(); }
      }
    }
    // 嘴
    const mx = w / 2 + (o.mx || 0), my = h * (o.my ?? 0.74);
    const mc = o.mouthInk || '#3a1a22';
    g.strokeStyle = mc; g.fillStyle = mc; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
    if (o.mouth === 'w') { g.beginPath(); g.arc(mx - 11, my - 4, 11, 0.1 * Math.PI, 0.95 * Math.PI); g.stroke(); g.beginPath(); g.arc(mx + 11, my - 4, 11, 0.05 * Math.PI, 0.9 * Math.PI); g.stroke(); }
    else if (o.mouth === 'o') { g.beginPath(); g.ellipse(mx, my, 10, 12, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ff7a9a'; g.beginPath(); g.ellipse(mx, my + 5, 6, 5, 0, 0, Math.PI * 2); g.fill(); }
    else if (o.mouth === 'grin') { g.beginPath(); g.moveTo(mx - 22, my - 6); g.quadraticCurveTo(mx, my + 22, mx + 22, my - 6); g.closePath(); g.fill(); g.fillStyle = '#ff7a9a'; g.beginPath(); g.ellipse(mx, my + 7, 9, 5, 0, 0, Math.PI * 2); g.fill(); }
    else if (o.mouth === 'pout') { g.beginPath(); g.moveTo(mx - 9, my + 3); g.quadraticCurveTo(mx, my - 6, mx + 9, my + 3); g.stroke(); }
    else if (o.mouth === 'yawn') { g.beginPath(); g.ellipse(mx, my + 4, 15, 22, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ff7a9a'; g.beginPath(); g.ellipse(mx, my + 15, 10, 8, 0, 0, Math.PI * 2); g.fill(); }
    else if (o.mouth === 'smirk') { g.beginPath(); g.moveTo(mx - 17, my - 3); g.quadraticCurveTo(mx + 2, my + 9, mx + 19, my - 10); g.stroke(); }
    else if (o.mouth === 'tiny') { g.beginPath(); g.ellipse(mx, my, 6, 7, 0, 0, Math.PI * 2); g.fill(); }
    else if (o.mouth === 'fang') {
      g.beginPath(); g.arc(mx, my - 10, 14, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
      g.fillStyle = '#ffffff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(mx + 2, my + 2.5); g.lineTo(mx + 11, my + 1); g.lineTo(mx + 7, my + 11); g.closePath(); g.fill(); g.stroke();
    }
    else if (o.mouth !== 'none') { g.beginPath(); g.arc(mx, my - 10, 13, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
  });
  function star(g, x, y, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
}
const waffleTex = () => canvasTex('waffle', 128, 128, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(120,60,10,.55)'; g.lineWidth = 6;
  for (let i = -h; i < w + h; i += 22) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); }
}, { repeat: [3, 2] });
function paintedFace(g, headMesh, key, o, { yaw0 = 0, pitch0 = 0.02, wide = 1.7, tall = 0.95, rough = 0.42 } = {}) {
  const geo = new THREE.SphereGeometry(1.012, 40, 20, Math.PI / 2 - wide / 2 + yaw0, wide, Math.PI / 2 - pitch0 - tall / 2, tall);
  const mat = new THREE.MeshStandardMaterial({ map: faceTex(key, o), transparent: true, roughness: rough, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const f = new THREE.Mesh(geo, mat);
  f.position.copy(headMesh.position); f.scale.copy(headMesh.scale); f.quaternion.copy(headMesh.quaternion);
  f.renderOrder = 2;
  g.add(f);
  return f;
}

// ---------------- 材質（依系列表面＋版本） ----------------
const col = (h) => new THREE.Color(h);
function glowOf(hex) {
  const c = col(hex), hsl = {}; c.getHSL(hsl);
  const rgb = {}; c.getRGB(rgb, THREE.SRGBColorSpace);
  const chroma = Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b);
  const gray = chroma < 0.16 || hsl.s < 0.18;
  const h = gray ? 0.47 : hsl.h;
  const base = new THREE.Color().setHSL(h, gray ? 0.62 : Math.min(1, hsl.s * 0.8 + 0.2), gray ? 0.74 : Math.min(0.8, 0.56 + hsl.l * 0.2));
  const em = new THREE.Color().setHSL(h, gray ? 0.95 : Math.min(1, hsl.s + 0.3), 0.5);
  return { base, em };
}
const GOLDS = ['#ffcf6a', '#ffdc8a', '#f2a65a', '#ffd27a', '#e8b44a'];
// 每個上色部位的參數：n 普通、a 異色、g 夜光、m 鍍金
// met：金屬感（機甲烤漆用）；sh：絨毛的反光色（睡衣派對用）
const MET = { metal: 0.5 };
function slotParams(finish, hexN, hexA, i) {
  const out = {};
  const met = MET[finish] ?? 0;
  const sheenOf = (c) => c.clone().lerp(new THREE.Color('#ffffff'), 0.25);
  for (const [v, hex] of [['n', hexN], ['a', hexA]]) {
    const c = col(hex);
    out[v] = { color: c, emissive: finish === 'jelly' ? c.clone().multiplyScalar(0.22) : new THREE.Color(0), ei: 1, att: c, met, sh: sheenOf(c) };
  }
  const gl = glowOf(hexN);
  out.g = { color: gl.base, emissive: gl.em, ei: finish === 'jelly' ? 0.4 : finish === 'flock' ? 0.62 : 0.7, att: gl.base, met: met ? 0.12 : 0, sh: sheenOf(gl.base) };
  out.m = { color: col(GOLDS[i % GOLDS.length]), emissive: new THREE.Color(0), ei: 1, att: col('#ffcf6a'), met: 1, sh: col('#ffffff') };
  return out;
}
function finishMat(finish, v) {
  if (v === 'm') return new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.17, clearcoat: 0.6, clearcoatRoughness: 0.08, envMapIntensity: 1.35 });
  if (finish === 'jelly') return new THREE.MeshPhysicalMaterial({ metalness: 0, roughness: 0.12, transmission: 0.88, thickness: 0.035, ior: 1.36, attenuationDistance: 0.035, clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 1, envMapIntensity: 1.2 });
  if (finish === 'vinyl') return new THREE.MeshPhysicalMaterial({ metalness: 0, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.72 });
  // 機甲：糖果烤漆（金屬底＋透明亮光漆）
  if (finish === 'metal') return new THREE.MeshPhysicalMaterial({ metalness: 0.5, roughness: 0.36, clearcoat: 0.85, clearcoatRoughness: 0.06, envMapIntensity: 0.78 });
  // 街頭：霧面軟膠（設計師公仔那種微微的緞面）
  if (finish === 'street') return new THREE.MeshPhysicalMaterial({ metalness: 0, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.32, sheen: 0.25, sheenRoughness: 0.6, sheenColor: col('#ffffff'), envMapIntensity: 0.62 });
  // 睡衣派對：植絨（絨毛在邊緣會反光）
  if (finish === 'flock') return new THREE.MeshPhysicalMaterial({ metalness: 0, roughness: 0.94, sheen: 0.5, sheenRoughness: 0.55, sheenColor: col('#ffffff'), envMapIntensity: 0.28 });
  return new THREE.MeshPhysicalMaterial({ metalness: 0, roughness: 0.56, clearcoat: 0.18, clearcoatRoughness: 0.5, sheen: 0.15, sheenRoughness: 0.7, sheenColor: col('#ffffff'), envMapIntensity: 0.55 });
}
function setSlot(mat, P) {
  mat.color.copy(P.color); mat.emissive.copy(P.emissive); mat.emissiveIntensity = P.ei;
  if (mat.attenuationColor) mat.attenuationColor.copy(P.att);
  if (mat.userData.metal && P.met != null) mat.metalness = P.met;
  if (mat.userData.flock && P.sh) mat.sheenColor.copy(P.sh);
}
const FIXED = {
  eye: () => new THREE.MeshPhysicalMaterial({ color: '#0a0a12', roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.4 }),
  hl: () => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6) }),
  white: () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.25, clearcoat: 1, envMapIntensity: 0.8 }),
  dark: () => new THREE.MeshStandardMaterial({ color: '#2a1420', roughness: 0.5 }),
  blush: () => new THREE.MeshBasicMaterial({ color: '#ff7aa0', transparent: true, opacity: 0.55, depthWrite: false }),
  brass: () => new THREE.MeshStandardMaterial({ color: '#e0b060', metalness: 1, roughness: 0.34 }),
  steel: () => new THREE.MeshStandardMaterial({ color: '#c8d0dc', metalness: 1, roughness: 0.2 }),
  glass: () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.004, ior: 1.45, clearcoat: 1, specularIntensity: 1, envMapIntensity: 1.6, transparent: true, opacity: 1 }),
  star: () => new THREE.MeshStandardMaterial({ color: '#fff2b0', emissive: '#ffcf4a', emissiveIntensity: 0.9, roughness: 0.35 }),
  flame: () => new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.9, 0.6) }),
  pearl: () => new THREE.MeshPhysicalMaterial({ color: '#e8e2f2', roughness: 0.28, metalness: 0.15, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.5, iridescenceThicknessMinimum: 250, iridescenceThicknessMaximum: 700, sheen: 0.4, sheenColor: col('#ffc6ec'), envMapIntensity: 0.9 }),
  gold: () => new THREE.MeshPhysicalMaterial({ color: '#ffcf6a', metalness: 1, roughness: 0.24, clearcoat: 0.4, envMapIntensity: 1.05 }),
  core: () => new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveIntensity: 0.7, roughness: 1 }),
  sand: () => new THREE.MeshStandardMaterial({ color: '#fff4c8', emissive: '#ffe08a', emissiveIntensity: 2.2, roughness: 0.3 }),
  // 深色亮面鏡片（機甲面罩、墨鏡）
  lens: () => new THREE.MeshPhysicalMaterial({ color: '#0c0e16', metalness: 0.3, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.55, iridescenceIOR: 1.6, iridescenceThicknessMinimum: 280, iridescenceThicknessMaximum: 620, envMapIntensity: 1.5 }),
  // 關節、輪胎：霧黑
  rubber: () => new THREE.MeshStandardMaterial({ color: '#24262e', roughness: 0.72, metalness: 0.1 }),
  milk: () => new THREE.MeshPhysicalMaterial({ color: '#fbfaf6', roughness: 0.3, clearcoat: 0.6, envMapIntensity: 0.7 }),
};

// 建一組材質；pal：普通色、alt：異色
function makeMats(ch, v, pal, alt, opaque = []) {
  const finish = SERIES[ch.s].finish;
  const m = { _slots: [], _finish: finish, _v: v };
  Object.keys(pal).forEach((r, i) => {
    const f = opaque.includes(r) ? 'vinyl' : finish;
    const mat = finishMat(f, v);
    const P = slotParams(f, pal[r], (alt && alt[r]) || pal[r], i);
    mat.userData.P = P;
    if (f === 'metal' && v !== 'm') mat.userData.metal = true;
    if (f === 'flock' && v !== 'm') mat.userData.flock = true;
    setSlot(mat, P[v] || P.n);
    m[r] = mat; m._slots.push(mat);
  });
  for (const k of Object.keys(FIXED)) Object.defineProperty(m, k, { get() { const x = FIXED[k](); Object.defineProperty(m, k, { value: x }); return x; }, configurable: true, enumerable: false });
  if (finish === 'jelly') {
    const main = col(pal.main);
    m.core.emissive.copy(v === 'g' ? glowOf(pal.main).em : v === 'a' ? col((alt && alt.main) || pal.main) : main);
    m.core.emissiveIntensity = v === 'g' ? 1.7 : v === 'm' ? 0 : 0.75;
    m.core.userData.P = { n: [main, 0.75], a: [col((alt && alt.main) || pal.main), 0.75], g: [glowOf(pal.main).em, 1.7] };
  }
  return m;
}
// 變異演出：把材質從 from 版本漸變到 to 版本（0～1）
export function mixVersion(fig, from, to, k) {
  const m = fig.mats;
  if (!m) return;
  for (const mat of m._slots) {
    const A = mat.userData.P[from], B = mat.userData.P[to];
    mat.color.copy(A.color).lerp(B.color, k); mat.emissive.copy(A.emissive).lerp(B.emissive, k);
    mat.emissiveIntensity = A.ei + (B.ei - A.ei) * k;
    if (mat.attenuationColor) mat.attenuationColor.copy(A.att).lerp(B.att, k);
    if (mat.userData.metal) mat.metalness = A.met + (B.met - A.met) * k;
    if (mat.userData.flock) mat.sheenColor.copy(A.sh).lerp(B.sh, k);
  }
  const core = Object.getOwnPropertyDescriptor(m, 'core');
  if (core && 'value' in core && m.core.userData.P) {
    const A = m.core.userData.P[from], B = m.core.userData.P[to];
    m.core.emissive.copy(A[0]).lerp(B[0], k); m.core.emissiveIntensity = A[1] + (B[1] - A[1]) * k;
  }
}

// 果凍：外殼＋發光的芯；記下橢球給星砂用
function jel(g, m, role, geo, p, s, r = null, { core = 0.7, keep = null } = {}) {
  const mesh = part(g, geo, m[role], p, s, r);
  if (core && m._finish === 'jelly' && m._v !== 'm') {
    const c = new THREE.Mesh(geo, m.core); c.scale.setScalar(core); mesh.add(c);
  }
  if (keep) keep.push({ p, s: typeof s === 'number' ? [s, s, s] : s });
  return mesh;
}
// 星砂：果凍裡的小亮點
function sand(g, m, vols, n, seed, size = 0.0022) {
  if (m._finish !== 'jelly' || m._v === 'm' || !vols.length) return;
  const R = rnd(seed), list = [];
  for (let i = 0; i < n; i++) {
    const v = vols[Math.floor(R() * vols.length)];
    let x, y, z;
    do { x = R() * 2 - 1; y = R() * 2 - 1; z = R() * 2 - 1; } while (x * x + y * y + z * z > 1);
    const k = 0.72;
    const o = new THREE.OctahedronGeometry(size * (0.55 + R() * 0.8), 0);
    o.rotateX(R() * 3); o.rotateY(R() * 3);
    o.translate(v.p[0] + x * v.s[0] * k, v.p[1] + y * v.s[1] * k, v.p[2] + z * v.s[2] * k);
    list.push(o);
  }
  const mm = new THREE.Mesh(mergeGeometries(list), m.sand);
  g.add(mm);
  return mm;
}
// 發條鑰匙（背上）
function windKey(g, m, p, size = 1, mat = null) {
  const k = new THREE.Group(); k.position.set(p[0], p[1], p[2]); g.add(k);
  const b = mat || m.brass;
  part(k, G.cyl(), b, [0, 0, -0.006 * size], [0.0024 * size, 0.012 * size, 0.0024 * size], [Math.PI / 2, 0, 0]);
  part(k, G.cyl(), b, [0, 0, -0.0005 * size], [0.0045 * size, 0.003 * size, 0.0045 * size], [Math.PI / 2, 0, 0]);
  const bow = new THREE.Group(); bow.position.z = -0.012 * size; k.add(bow);
  for (const s of [-1, 1]) part(bow, G.torus(Math.PI * 2, 0.32), b, [s * 0.0068 * size, 0, 0], [0.006 * size, 0.0075 * size, 0.006 * size], [0, Math.PI / 2, 0]);
  part(bow, G.sph(), b, [0, 0, 0], 0.0028 * size);
  return bow;
}

// 波浪下擺（幽靈）
function ghostGeo() {
  return gq('ghost', () => {
    const pts = [[0, 0.074], [0.011, 0.0733], [0.021, 0.0703], [0.0295, 0.0645], [0.0355, 0.0565], [0.0388, 0.0465], [0.0398, 0.034], [0.0408, 0.021], [0.0432, 0.009], [0.0452, 0.002], [0.043, 0.0], [0.03, 0.002], [0, 0.004]];
    const geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 64, Math.PI);
    const P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      if (y < 0.02) { const a = Math.atan2(x, z); const k = 1 - y / 0.02; P.setY(i, y + Math.sin(a * 6) * 0.0045 * k + 0.0045 * k); }
    }
    geo.computeVertexNormals();
    return geo;
  });
}


// ---------------- 第二波用的形狀 ----------------
// 發光件（面罩、燈、能量刃）
const glowMat = (hex, ei = 1.6, base = null) => new THREE.MeshStandardMaterial({ color: base || new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), 0.3), emissive: hex, emissiveIntensity: ei * 0.8, roughness: 0.3 });
// 三角片（機甲的天線、鰭、冠）：底在原點、尖端朝 +y
const wedge = (w = 1, h = 1, d = 0.2, lean = 0) => gq('wedge' + w + h + d + lean, () => {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(lean, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: d * 0.3, bevelSize: Math.min(w, h) * 0.06, bevelSegments: 2 }); g.translate(0, 0, -d / 2); return g;
});
// 四角手裏劍
const star4 = () => gq('star4', () => {
  const s = new THREE.Shape();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 4, r = i % 2 ? 0.3 : 1; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const h = new THREE.Path(); h.absarc(0, 0, 0.12, 0, Math.PI * 2, true); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 }); g.translate(0, 0, -0.06); return g;
});
// 立體的「Z」
const zGeo = () => gq('zz', () => {
  const s = new THREE.Shape();
  [[-0.5, 0.5], [0.5, 0.5], [0.5, 0.3], [-0.16, -0.3], [0.5, -0.3], [0.5, -0.5], [-0.5, -0.5], [-0.5, -0.3], [0.16, 0.3], [-0.5, 0.3]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2 }); g.translate(0, 0, -0.11); return g;
});
// 彎的睡帽：底半徑 1、高 1，往 +x 彎（底在 y=0）
const bentCone = (bend = 0.6, flop = 0.25) => gq('bcone' + bend + flop, () => {
  const g = new THREE.ConeGeometry(1, 1, 32, 12, true); g.translate(0, 0.5, 0);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); const t = y; P.setX(i, x + bend * t * t); P.setY(i, y - flop * t * t * t); }
  g.computeVertexNormals(); return g;
});
// 枕頭：四角尖尖、中間鼓起來；寬 2、高 2（xy），厚度沿 z
const pillowGeo = () => gq('pillow', () => {
  const g = new THREE.SphereGeometry(1, 40, 28);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const X = Math.sign(x) * Math.pow(Math.abs(x), 0.62), Y = Math.sign(y) * Math.pow(Math.abs(y), 0.62);
    const edge = Math.max(Math.abs(X), Math.abs(Y));
    P.setXYZ(i, X, Y, z * 0.5 * (1 - 0.55 * edge * edge));
  }
  g.computeVertexNormals(); return g;
});
// 火焰（尖尖的水滴）
const flameGeo = () => gq('flame', () => {
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(Math.sin(t * Math.PI) * (1 - t * 0.55) * 0.5, t * 1.6 - 0.35)); }
  return new THREE.LatheGeometry(pts, 20);
});
// 鐘形（睡袍、裙襬）：上窄下寬
const bellGeo = (top = 0.5, bot = 1, h = 1, flare = 0.15) => gq('bell' + top + bot + h + flare, () => {
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; const r = top + (bot - top) * Math.pow(t, 1.3) + flare * Math.pow(t, 6); pts.push(new THREE.Vector2(r, h * (1 - t))); }
  pts.push(new THREE.Vector2(0.001, 0)); pts.unshift(new THREE.Vector2(0.001, h));
  return new THREE.LatheGeometry(pts, 40);
});
// 貼在球面上的圖（老虎條紋、塗鴉、星星睡衣）：用法和 paintedFace 一樣
function decal(g, mesh, texture, { yaw0 = 0, pitch0 = 0, wide = 1.7, tall = 0.95, rough = 0.55, glow = 0, off = 1.012, order = 2 } = {}) {
  const geo = new THREE.SphereGeometry(off, 48, 24, Math.PI / 2 - wide / 2 + yaw0, wide, Math.PI / 2 - pitch0 - tall / 2, tall);
  const mat = new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: rough, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  if (glow) { mat.emissiveMap = texture; mat.emissive.set('#ffffff'); mat.emissiveIntensity = glow; }
  const f = new THREE.Mesh(geo, mat);
  f.position.copy(mesh.position); f.scale.copy(mesh.scale); f.quaternion.copy(mesh.quaternion);
  f.renderOrder = order;
  g.add(f);
  return f;
}
// 丟掉一隻公仔：釋放它自己的幾何與材質（共用的幾何、貼圖不動）
export function disposeFigure(b) {
  if (!b || !b.g) return;
  const mats = new Set();
  b.g.traverse((o) => {
    if (o.geometry && !o.geometry.userData.cached) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((x) => mats.add(x));
  });
  for (const x of mats) if (!x.userData.shared) x.dispose();
}

export {
  THREE, V3, Z, rnd, G, gq, star5, rbox, gearGeo, heartGeo, tube, part, surf, onSurf,
  beads, toonEyes, smile, catMouth, blush, dotMouth, faceTex, waffleTex, paintedFace,
  col, glowOf, makeMats, jel, sand, windKey, ghostGeo,
  glowMat, wedge, star4, zGeo, bentCone, pillowGeo, flameGeo, bellGeo, decal, mergeGeometries, canvasTex,
};
