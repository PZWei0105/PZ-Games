// 收藏房間：一間小房間＋一座三層展示櫃（一次放一個系列的 9 格）
// 點公仔：鏡頭靠過去，公仔跳一下、轉一圈、做動作、說一句話；★★ 以上會做專屬動作
import * as THREE from 'three';
import { tex } from '../engine/tex.js';
import { buildFigure, disposeFigure } from './figures.js';
import { CHAR, SERIES, SERIES_ORDER, RARITY, seriesChars, colKey, parseKey, starOf, buddyLines } from './data.js';
import { thumb } from './showcase.js';

const PI = Math.PI;
const SX = 0.235, SY = 0.235, BASE_Y = 0.2, CAB_W = SX * 3, CAB_H = SY * 3, CAB_D = 0.2, CAB_Z = -0.2;
const FIG_S = 1.3;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ease = (x) => 1 - Math.pow(1 - x, 3);
function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

// ---------------- 佈置主題 ----------------
export const THEMES = {
  wood: { wall: ['stripe', '#efe2cc', '#e4d0b2'], floor: ['plank', '#9a6a40'], rug: ['#c8643c', '#f4e2c4'], cab: '#6e4a2c', trim: '#d0a060', back: '#2c1e16', led: '#ffd9a0', hemi: ['#fff0dc', '#4a3020', 0.62], key: '#fff2e0', lamp: '#ffb060', curtain: '#5a8a6a', sky: 'dusk', cushion: '#f2c8a0' },
  night: { wall: ['stars', '#1c2252', '#2a3270'], floor: ['plank', '#4a3a5a'], rug: ['#5a3a9a', '#c8b8ff'], cab: '#262a50', trim: '#ffcf6a', back: '#10143a', led: '#a8c0ff', hemi: ['#c8d0ff', '#1a1430', 0.58], key: '#dfe6ff', lamp: '#ffd08a', curtain: '#3a2a6a', sky: 'night', cushion: '#8a7ae0' },
  candy: { wall: ['stripe', '#ffd8ea', '#fff4f9'], floor: ['plank', '#e8c0a0'], rug: ['#7ad8c0', '#ffffff'], cab: '#fff2f8', trim: '#ff8fc8', back: '#ffe2f0', led: '#ffb0e0', hemi: ['#fff0f8', '#a07080', 0.72], key: '#fff6fa', lamp: '#ff9ad0', curtain: '#ff9ac8', sky: 'day', cushion: '#ffd0e4' },
  neon: { wall: ['grid', '#120f1c', '#ff3fb4', '#3fe0ff'], floor: ['tile', '#18161f'], rug: ['#0a0a10', '#3fe0ff'], cab: '#1a1a22', trim: '#3fe0ff', back: '#0a0a12', led: '#3fe0ff', hemi: ['#b0a8ff', '#100818', 0.48], key: '#e0e4ff', lamp: '#ff3fb4', curtain: '#2a1a3a', sky: 'city', cushion: '#3a2a5a' },
  mech: { wall: ['panel', '#3c4452', '#ffc23a'], floor: ['plate', '#2e323a'], rug: ['#ffc23a', '#1a1c22'], cab: '#4a5262', trim: '#ff8a1a', back: '#181c24', led: '#ffb060', hemi: ['#d0dcf0', '#141820', 0.58], key: '#eef2ff', lamp: '#ff8a1a', curtain: '#2a3038', sky: 'space', cushion: '#5a6274' },
  gold: { wall: ['damask', '#4a0c18', '#c8902a'], floor: ['marble', '#ece6dc'], rug: ['#8a1424', '#ffcf6a'], cab: '#141014', trim: '#ffcf6a', back: '#0c080a', led: '#ffdc8a', hemi: ['#fff0dc', '#3a1a10', 0.62], key: '#fff4e0', lamp: '#ffcf6a', curtain: '#6a0e1e', sky: 'night', cushion: '#a8202e' },
};

const wallTex = (th) => tex.canvas('dwall' + th.wall.join(), 512, 512, (g, w, h) => {
  const [kind, a, b, c] = th.wall;
  g.fillStyle = a; g.fillRect(0, 0, w, h);
  const R = rnd(11);
  if (kind === 'stripe') {
    for (let x = 0; x < w; x += 64) { g.fillStyle = b; g.fillRect(x, 0, 32, h); }
    g.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 40; i++) { const x = 16 + Math.floor(R() * 8) * 64, y = R() * h; g.beginPath(); g.arc(x, y, 3, 0, PI * 2); g.fill(); }
  } else if (kind === 'stars') {
    for (let y = 0; y < h; y++) { g.fillStyle = `rgba(${y % 2 ? '255,255,255' : '0,0,0'},0.01)`; g.fillRect(0, y, w, 1); }
    for (let i = 0; i < 90; i++) { const x = R() * w, y = R() * h, r = 0.8 + R() * 2.2; g.fillStyle = `rgba(255,248,220,${0.35 + R() * 0.6})`; g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,230,160,.85)';
    for (let i = 0; i < 10; i++) { const x = R() * w, y = R() * h, r = 7 + R() * 5; g.beginPath(); for (let k = 0; k < 10; k++) { const an = (k / 10) * PI * 2 - PI / 2, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } g.fill(); }
  } else if (kind === 'grid') {
    g.shadowBlur = 10; g.lineWidth = 2;
    for (let y = 0; y <= h; y += 64) { g.strokeStyle = b; g.shadowColor = b; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0; x <= w; x += 64) { g.strokeStyle = c; g.shadowColor = c; g.globalAlpha = 0.35; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.globalAlpha = 1; g.shadowBlur = 0;
  } else if (kind === 'panel') {
    for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 256) {
      const v = 0.92 + R() * 0.12; g.fillStyle = a; g.globalAlpha = 1; g.fillRect(x, y, 256, 128);
      g.fillStyle = `rgba(255,255,255,${(v - 0.92) * 0.6})`; g.fillRect(x + 4, y + 4, 248, 120);
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 4; g.strokeRect(x + 2, y + 2, 252, 124);
      g.fillStyle = 'rgba(255,255,255,.35)'; for (const [px, py] of [[12, 12], [244, 12], [12, 116], [244, 116]]) { g.beginPath(); g.arc(x + px, y + py, 4, 0, PI * 2); g.fill(); }
    }
  } else if (kind === 'damask') {
    g.fillStyle = b; g.globalAlpha = 0.28;
    for (let y = 0; y < h; y += 128) for (let x = (y / 128) % 2 ? 64 : 0; x < w + 64; x += 128) {
      g.beginPath(); g.moveTo(x, y + 8); g.quadraticCurveTo(x + 40, y + 64, x, y + 120); g.quadraticCurveTo(x - 40, y + 64, x, y + 8); g.fill();
      g.beginPath(); g.arc(x, y + 64, 12, 0, PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  }
}, { repeat: [5, 3] });
const floorTex = (th) => tex.canvas('dfloor' + th.floor.join(), 512, 512, (g, w, h) => {
  const [kind, a] = th.floor; const R = rnd(5);
  g.fillStyle = a; g.fillRect(0, 0, w, h);
  if (kind === 'plank') {
    for (let y = 0; y < h; y += 64) {
      const off = (y / 64) % 2 ? 160 : 0;
      for (let x = -off; x < w; x += 320) { const v = (R() - 0.5) * 0.16; g.fillStyle = v > 0 ? `rgba(255,230,190,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(x, y, 320, 64); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y, 3, 64); }
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, y, w, 3);
      for (let k = 0; k < 6; k++) { g.strokeStyle = `rgba(40,20,5,${0.06 + R() * 0.08})`; g.lineWidth = 1 + R() * 2; g.beginPath(); const yy = y + 8 + R() * 48; g.moveTo(0, yy); for (let x = 0; x <= w; x += 32) g.lineTo(x, yy + Math.sin(x * 0.02 + k) * 3); g.stroke(); }
    }
  } else if (kind === 'tile') {
    for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) { const v = 18 + R() * 8; g.fillStyle = `rgb(${v},${v - 2},${v + 8})`; g.fillRect(x + 3, y + 3, 122, 122); }
    g.strokeStyle = 'rgba(63,224,255,.25)'; g.lineWidth = 2; for (let i = 0; i <= w; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  } else if (kind === 'plate') {
    g.fillStyle = 'rgba(255,255,255,.12)';
    for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < w; x += 32) { g.save(); g.translate(x, y); g.rotate(PI / 4); g.fillRect(-9, -2.5, 18, 5); g.restore(); }
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2);
  } else if (kind === 'marble') {
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(120,110,100,${0.08 + R() * 0.16})`; g.lineWidth = 1 + R() * 3; g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (R() - 0.5) * 120; y += (R() - 0.3) * 60; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = 'rgba(200,150,60,.35)'; g.lineWidth = 3; for (let i = 0; i <= w; i += 256) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  }
}, { repeat: [4, 3] });
const rugTex = (th) => tex.canvas('drug' + th.rug.join(), 512, 512, (g, w) => {
  const [a, b] = th.rug, c = w / 2;
  g.clearRect(0, 0, w, w);
  g.fillStyle = a; g.beginPath(); g.arc(c, c, c - 4, 0, PI * 2); g.fill();
  g.strokeStyle = b; g.lineWidth = 14; g.beginPath(); g.arc(c, c, c - 28, 0, PI * 2); g.stroke();
  g.lineWidth = 6; g.beginPath(); g.arc(c, c, c - 58, 0, PI * 2); g.stroke();
  g.fillStyle = b;
  for (let i = 0; i < 16; i++) { const an = (i / 16) * PI * 2; g.beginPath(); g.arc(c + Math.cos(an) * (c - 90), c + Math.sin(an) * (c - 90), 9, 0, PI * 2); g.fill(); }
  g.globalAlpha = 0.5; g.beginPath(); g.arc(c, c, 60, 0, PI * 2); g.fill(); g.globalAlpha = 1;
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},.05)`; g.fillRect(Math.random() * w, Math.random() * w, 2, 2); }
});
const skyTex = (kind) => tex.canvas('dsky' + kind, 256, 320, (g, w, h) => {
  const R = rnd(3);
  const grads = { dusk: ['#2a2a6a', '#c86a8a', '#ffb070'], night: ['#060a24', '#16205a', '#2a3a7a'], day: ['#7ac8ff', '#bfe6ff', '#fff4e0'], city: ['#08060f', '#1a0f2a', '#3a1a4a'], space: ['#020208', '#0a0a1a', '#140f2a'] }[kind];
  const lg = g.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, grads[0]); lg.addColorStop(0.6, grads[1]); lg.addColorStop(1, grads[2]); g.fillStyle = lg; g.fillRect(0, 0, w, h);
  if (kind !== 'day') for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,240,${0.3 + R() * 0.7})`; g.fillRect(R() * w, R() * h * 0.75, 1.5, 1.5); }
  if (kind === 'night' || kind === 'dusk') { g.fillStyle = '#fff4c8'; g.shadowColor = '#fff0b0'; g.shadowBlur = 24; g.beginPath(); g.arc(w * 0.68, h * 0.26, 22, 0, PI * 2); g.fill(); g.shadowBlur = 0; g.fillStyle = grads[0]; g.beginPath(); g.arc(w * 0.68 + 10, h * 0.26 - 6, 19, 0, PI * 2); g.fill(); }
  if (kind === 'day') { g.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y, s] of [[60, 80, 1], [180, 140, 0.8], [120, 220, 1.2]]) { for (const [dx, dy, r] of [[0, 0, 22], [22, 4, 18], [-20, 6, 16], [8, -12, 16]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, PI * 2); g.fill(); } } }
  if (kind === 'city') { for (let x = 0; x < w; x += 22) { const bh = 40 + R() * 120; g.fillStyle = '#0c0816'; g.fillRect(x, h - bh, 20, bh); for (let k = 0; k < 12; k++) { g.fillStyle = R() < 0.5 ? 'rgba(255,63,180,.8)' : 'rgba(63,224,255,.8)'; g.fillRect(x + 3 + Math.floor(R() * 3) * 5, h - bh + 6 + Math.floor(R() * (bh / 10)) * 10, 3, 4); } } }
  if (kind === 'space') { g.fillStyle = '#ff9a5a'; g.beginPath(); g.arc(w * 0.3, h * 0.35, 34, 0, PI * 2); g.fill(); g.strokeStyle = 'rgba(255,220,180,.7)'; g.lineWidth = 4; g.beginPath(); g.ellipse(w * 0.3, h * 0.35, 58, 14, -0.3, 0, PI * 2); g.stroke(); g.fillStyle = '#7ad8ff'; g.beginPath(); g.arc(w * 0.75, h * 0.62, 14, 0, PI * 2); g.fill(); }
});
// 名牌：名字＋稀有度色條
const plateTex = (name, tier, own) => tex.canvas('dplate' + name + tier + own, 256, 72, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  const r = 14; g.fillStyle = own ? '#14121a' : '#1c1c24';
  g.beginPath(); g.moveTo(r, 2); g.lineTo(w - r, 2); g.quadraticCurveTo(w - 2, 2, w - 2, r); g.lineTo(w - 2, h - r); g.quadraticCurveTo(w - 2, h - 2, w - r, h - 2); g.lineTo(r, h - 2); g.quadraticCurveTo(2, h - 2, 2, h - r); g.lineTo(2, r); g.quadraticCurveTo(2, 2, r, 2); g.fill();
  g.strokeStyle = own ? '#d8b060' : '#3a3a48'; g.lineWidth = 3; g.stroke();
  g.fillStyle = RARITY[tier].color; g.fillRect(14, 12, 6, h - 24);
  g.fillStyle = own ? '#f6f2ea' : '#6a6a7a'; g.font = '900 34px "Noto Sans TC", "PingFang TC", sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.fillText(own ? name : tier === 'HID' ? '？？？' : '？？？', w / 2 + 8, h / 2 + 2);
});

export class CollectionRoom {
  constructor(game) {
    this.g = game;
    const s = new THREE.Scene();
    this.scene = s;
    s.environment = game.scene.environment; s.environmentIntensity = 0.55;
    s.background = new THREE.Color('#0a0a10');
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.02, 20);
    this.hemi = new THREE.HemisphereLight('#fff0dc', '#4a3020', 0.6); s.add(this.hemi);
    const key = new THREE.DirectionalLight('#fff2e0', 1.25); key.position.set(0.7, 2.2, 1.6); key.target.position.set(0, 0.5, -0.2);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    const sc = key.shadow.camera; sc.left = -1.1; sc.right = 1.1; sc.top = 1.2; sc.bottom = -0.6; sc.near = 0.5; sc.far = 5; key.shadow.bias = -0.0006; key.shadow.normalBias = 0.012;
    s.add(key, key.target); this.key = key;
    this.spot = new THREE.SpotLight('#ffffff', 1.7, 4, 0.55, 0.65, 1.2); this.spot.position.set(0, 1.9, 1.0); this.spot.target.position.set(0, 0.55, CAB_Z); s.add(this.spot, this.spot.target);
    this.lampLight = new THREE.PointLight('#ffb060', 0.9, 1.6, 1.6); s.add(this.lampLight);
    this.mats = {};
    this.buildRoom();
    this.slots = [];
    this.holder = new THREE.Group(); s.add(this.holder);
    this.sil = new THREE.MeshStandardMaterial({ color: '#1a1a24', roughness: 0.6, metalness: 0.1 }); this.sil.userData.shared = true;
    this.ray = new THREE.Raycaster();
    this.cam = { yaw: 0.0, tyaw: 0.0, focus: -1, k: 0, pos: new THREE.Vector3(0, 0.6, 2.6), tgt: new THREE.Vector3(0, 0.55, CAB_Z) };
    this.active = false;
    this.sparkTex = tex.star();
    this.sparks = [];
    const sp = new Float32Array(60 * 3);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.sparkPts = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.022, map: tex.star(), color: new THREE.Color('#fff2b0').multiplyScalar(1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.sparkPts.frustumCulled = false; s.add(this.sparkPts);
    this.sp = Array.from({ length: 60 }, () => ({ p: new THREE.Vector3(0, -9, 0), v: new THREE.Vector3(), life: 0 }));
    this.v = new THREE.Vector3();
  }

  // ---------------- 房間（靜態） ----------------
  std(key, o) { return this.mats[key] || (this.mats[key] = new THREE.MeshStandardMaterial(o)); }
  buildRoom() {
    const s = this.scene, M = this.mats;
    const room = new THREE.Group(); s.add(room); this.room = room;
    const add = (geo, mat, p, r) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (r) m.rotation.set(...r); room.add(m); return m; };
    M.floor = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
    const floor = add(new THREE.PlaneGeometry(4, 3), M.floor, [0, 0, 0.5], [-PI / 2, 0, 0]); floor.receiveShadow = true;
    M.wall = new THREE.MeshStandardMaterial({ roughness: 0.85 });
    const wall = add(new THREE.PlaneGeometry(4, 2.2), M.wall, [0, 1.1, -0.32]); wall.receiveShadow = true;
    for (const k of [-1, 1]) add(new THREE.PlaneGeometry(3, 2.2), M.wall, [k * 1.45, 1.1, 1.1], [0, -k * PI / 2, 0]);
    M.trim = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2 });
    add(new THREE.BoxGeometry(4, 0.06, 0.02), M.trim, [0, 0.03, -0.31]);
    // 地毯
    M.rug = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.95, depthWrite: false });
    const rug = add(new THREE.CircleGeometry(0.62, 48), M.rug, [0, 0.002, 0.22], [-PI / 2, 0, 0]); rug.receiveShadow = true; rug.scale.set(1.25, 0.9, 1);
    // 窗戶（左邊）
    const win = new THREE.Group(); win.position.set(-0.74, 0.86, -0.315); room.add(win);
    M.sky = new THREE.MeshBasicMaterial({});
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.46), M.sky); win.add(sky);
    for (const [w, h, x, y] of [[0.4, 0.025, 0, 0.24], [0.4, 0.025, 0, -0.24], [0.025, 0.5, -0.19, 0], [0.025, 0.5, 0.19, 0], [0.36, 0.014, 0, 0], [0.014, 0.46, 0, 0]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), M.trim); b.position.set(x, y, 0.01); win.add(b); }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.02, 0.07), M.trim); sill.position.set(0, -0.26, 0.03); win.add(sill);
    M.curtain = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide });
    for (const k of [-1, 1]) {
      const cg = new THREE.PlaneGeometry(0.14, 0.58, 12, 1); const P = cg.attributes.position;
      for (let i = 0; i < P.count; i++) P.setZ(i, Math.sin(P.getX(i) * 90) * 0.012);
      cg.computeVertexNormals();
      const c = new THREE.Mesh(cg, M.curtain); c.position.set(k * 0.24, -0.01, 0.04); win.add(c);
    }
    // 海報（展示櫃上方）
    M.poster = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.92, 0.92, 0.92) });
    const pf = new THREE.Group(); pf.position.set(0, 1.12, -0.31); room.add(pf); this.posterG = pf;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.015), M.trim); pf.add(frame);
    this.poster = new THREE.Mesh(new THREE.PlaneGeometry(0.39, 0.21), M.poster); this.poster.position.z = 0.009; pf.add(this.poster);
    // 展示櫃
    const cab = new THREE.Group(); room.add(cab); this.cab = cab;
    M.cab = new THREE.MeshPhysicalMaterial({ roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    M.back = new THREE.MeshStandardMaterial({ roughness: 0.92 });
    M.led = new THREE.MeshBasicMaterial({});
    M.gold = new THREE.MeshStandardMaterial({ color: '#ffcf6a', metalness: 1, roughness: 0.25 });
    const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; cab.add(m); return m; };
    box(CAB_W + 0.07, BASE_Y, CAB_D + 0.02, M.cab, 0, BASE_Y / 2, CAB_Z);
    for (const k of [-1, 1]) { box(CAB_W / 2 - 0.02, BASE_Y - 0.05, 0.012, M.cab, k * (CAB_W / 4 + 0.005), BASE_Y / 2, CAB_Z + CAB_D / 2 + 0.012); box(0.05, 0.012, 0.012, M.gold, k * (CAB_W / 4 + 0.005), BASE_Y / 2 + 0.02, CAB_Z + CAB_D / 2 + 0.022); }
    for (const k of [-1, 1]) box(0.025, CAB_H + 0.02, CAB_D, M.cab, k * (CAB_W / 2 + 0.0125), BASE_Y + CAB_H / 2, CAB_Z);
    box(CAB_W + 0.09, 0.03, CAB_D + 0.03, M.cab, 0, BASE_Y + CAB_H + 0.015, CAB_Z);
    box(CAB_W + 0.1, 0.008, 0.012, M.trim, 0, BASE_Y + CAB_H + 0.034, CAB_Z + CAB_D / 2 + 0.01);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(CAB_W, CAB_H), M.back); back.position.set(0, BASE_Y + CAB_H / 2, CAB_Z - CAB_D / 2 + 0.003); back.receiveShadow = true; cab.add(back);
    for (let i = 0; i <= 3; i++) {
      const y = BASE_Y + i * SY;
      if (i < 3) box(CAB_W, 0.012, CAB_D, M.cab, 0, y + 0.006, CAB_Z);
      box(CAB_W, 0.006, 0.006, M.trim, 0, y + (i < 3 ? 0.009 : -0.004), CAB_Z + CAB_D / 2);
      if (i > 0) { const l = new THREE.Mesh(new THREE.BoxGeometry(CAB_W - 0.02, 0.004, 0.006), M.led); l.position.set(0, y - 0.006, CAB_Z + CAB_D / 2 - 0.02); cab.add(l); }
    }
    // 落地燈（右）、盆栽（左）
    const lamp = new THREE.Group(); lamp.position.set(0.66, 0, -0.08); room.add(lamp); this.lamp = lamp;
    const lampMetal = new THREE.MeshStandardMaterial({ color: '#2a2a30', metalness: 0.7, roughness: 0.35 });
    const at = (mesh, y) => { mesh.position.y = y; mesh.castShadow = true; lamp.add(mesh); return mesh; };
    at(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 32), lampMetal), 0.01);
    at(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.88, 12), lampMetal), 0.45);
    M.shade = new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.4 });
    at(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.13, 32, 1, true), M.shade), 0.92).castShadow = false;
    M.bulb = new THREE.MeshBasicMaterial({});
    at(new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), M.bulb), 0.88).castShadow = false;
    this.lampLight.position.set(0.66, 0.86, -0.04);
    const plant = new THREE.Group(); plant.position.set(-0.66, 0, -0.1); room.add(plant);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.13, 24), new THREE.MeshStandardMaterial({ color: '#e8d8c8', roughness: 0.5 })); pot.position.y = 0.065; pot.castShadow = true; plant.add(pot);
    const leafM = new THREE.MeshStandardMaterial({ color: '#4a9a5a', roughness: 0.55 });
    const R = rnd(17);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * PI * 2 + R(), l = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), leafM); l.scale.set(0.035, 0.11 + R() * 0.05, 0.012); l.position.set(Math.cos(a) * 0.04, 0.2 + R() * 0.05, Math.sin(a) * 0.04); l.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5); l.castShadow = true; plant.add(l); }
    // 夥伴的坐墊
    M.cushion = new THREE.MeshPhysicalMaterial({ roughness: 0.85, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffffff') });
    const cu = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), M.cushion); cu.scale.set(0.12, 0.028, 0.1); cu.position.set(-0.3, 0.026, 0.2); cu.castShadow = true; cu.receiveShadow = true; room.add(cu);
    this.cushionTop = new THREE.Vector3(-0.3, 0.05, 0.2);
    this.buddyG = new THREE.Group(); this.buddyG.position.copy(this.cushionTop); room.add(this.buddyG);
    // 獎盃（收齊的系列）
    this.trophies = new THREE.Group(); this.trophies.position.set(0, BASE_Y + CAB_H + 0.03, CAB_Z + 0.02); room.add(this.trophies);
    // 光點
    const n = 70, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 2; pos[i * 3 + 1] = Math.random() * 1.4; pos[i * 3 + 2] = -0.25 + Math.random() * 1.2; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.motes = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.012, map: tex.dot(), color: new THREE.Color('#ffe8c8').multiplyScalar(0.7), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.motes.frustumCulled = false; s.add(this.motes);
    room.traverse((o) => { if (o.isMesh && !o.material.transparent) o.receiveShadow = true; });
  }
  applyTheme(id) {
    const th = THEMES[id] || THEMES.wood, M = this.mats;
    this.themeId = id;
    M.floor.map = floorTex(th); M.floor.color.set('#ffffff'); M.floor.roughness = th.floor[0] === 'marble' || th.floor[0] === 'tile' ? 0.22 : 0.6; M.floor.needsUpdate = true;
    M.wall.map = wallTex(th); M.wall.needsUpdate = true;
    M.rug.map = rugTex(th); M.rug.needsUpdate = true;
    M.sky.map = skyTex(th.sky); M.sky.needsUpdate = true;
    M.trim.color.set(th.trim); M.cab.color.set(th.cab); M.back.color.set(th.back);
    M.led.color.set(th.led).multiplyScalar(2.2);
    M.curtain.color.set(th.curtain);
    M.shade.color.set(th.lamp); M.shade.emissive.set(th.lamp); M.bulb.color.set(th.lamp).multiplyScalar(2.5);
    M.cushion.color.set(th.cushion);
    this.lampLight.color.set(th.lamp);
    this.hemi.color.set(th.hemi[0]); this.hemi.groundColor.set(th.hemi[1]); this.hemi.intensity = th.hemi[2];
    this.key.color.set(th.key);
    this.scene.background.set(th.wall[1]).multiplyScalar(0.25);
  }

  // ---------------- 展示櫃內容 ----------------
  slotPos(i) { const row = 2 - Math.floor(i / 3), col = i % 3; return new THREE.Vector3((col - 1) * SX, BASE_Y + row * SY + 0.012, CAB_Z + 0.012); }
  clearSlots() {
    for (const sl of this.slots) {
      this.holder.remove(sl.g);
      if (sl.fig) disposeFigure(sl.fig);
      sl.extra?.forEach((o) => { o.geometry?.dispose?.(); if (o.userData.ownMat) o.material.dispose(); });
      if (sl.q) sl.q.material.dispose();
    }
    this.slots = [];
  }
  bestKey(cid) { const P = this.g.P; for (const v of ['m', 'g', 'a', 'n']) if (P.col[colKey(cid, v)]?.n) return colKey(cid, v); return null; }
  fill(series) {
    this.series = series;
    this.clearSlots();
    const P = this.g.P, list = seriesChars(series);
    list.forEach((c, i) => {
      const g = new THREE.Group(); g.position.copy(this.slotPos(i)); this.holder.add(g);
      const own = !!P.ch[c.id]?.got, star = starOf(P.ch[c.id]?.got || 0), key = own ? this.bestKey(c.id) : null;
      const sl = { i, c, own, star, key, g, fig: null, react: -1, pose: new THREE.Group() };
      g.add(sl.pose);
      // 底座：★★★ 金色
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.064, 0.008, 40), star >= 3 ? this.mats.gold : this.std('acrylic', { color: '#f4f2f8', roughness: 0.12, metalness: 0, transparent: true, opacity: 0.85 }));
      base.position.y = 0.004; base.receiveShadow = true; g.add(base);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.031), new THREE.MeshBasicMaterial({ map: plateTex(c.name, c.tier, own), transparent: true }));
      plate.position.set(0, -0.004, CAB_D / 2 - 0.005); plate.rotation.x = -0.25; plate.userData.ownMat = true; g.add(plate);
      sl.extra = [base, plate];
      if (own) {
        const k = parseKey(key); const f = buildFigure(k.cid, k.v);
        if (k.v === 'g') this.softGlow(f);
        f.g.scale.setScalar(FIG_S); f.g.position.y = 0.008; sl.pose.add(f.g); sl.fig = f;
      } else if (c.tier !== 'HID') {
        const f = buildFigure(c.id, 'n');
        f.g.traverse((o) => { if (o.isMesh) o.material = this.sil; if (o.isPoints || o.isSprite) o.visible = false; });
        f.g.scale.setScalar(FIG_S); f.g.position.y = 0.008; sl.pose.add(f.g); sl.fig = f; sl.silhouette = true;
      } else {
        const q = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.qTex(), transparent: true, depthWrite: false }));
        q.scale.setScalar(0.11); q.position.y = 0.085; sl.pose.add(q); sl.q = q;
      }
      sl.g.traverse((o) => { o.userData.slot = i; if (o.isMesh) o.castShadow = true; });
      this.slots.push(sl);
    });
    this.makePoster(series);
    this.makeTrophies();
  }
  // 夜光版在亮的房間裡會過曝：把自發光壓低一點
  softGlow(f) { for (const m of f.mats?._slots || []) m.emissiveIntensity *= 0.45; }
  qTex() {
    return tex.canvas('denQ', 128, 128, (g, w) => {
      g.clearRect(0, 0, w, w);
      const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,170,60,.55)'); r.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = r; g.fillRect(0, 0, w, w);
      g.font = '900 84px "Bungee", "Noto Sans TC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = '#ff8a2a'; g.shadowBlur = 16; g.fillStyle = '#ffe2a8'; g.fillText('?', w / 2, w / 2 + 6);
    });
  }
  makePoster(series) {
    const S = SERIES[series], P = this.g.P, hid = seriesChars(series).find((c) => c.tier === 'HID'), own = !!P.ch[hid.id]?.got;
    const c = document.createElement('canvas'); c.width = 512; c.height = 280;
    const g = c.getContext('2d');
    const draw = (img) => {
      const lg = g.createLinearGradient(0, 0, 512, 280); lg.addColorStop(0, '#0e0e18'); lg.addColorStop(1, S.color); g.fillStyle = lg; g.fillRect(0, 0, 512, 280);
      g.globalAlpha = 0.18; g.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 512, Math.random() * 280, 2, 2); g.globalAlpha = 1;
      g.textBaseline = 'middle';
      g.font = '900 64px "Noto Sans TC", "PingFang TC", sans-serif'; g.fillStyle = '#ffffff'; g.shadowColor = S.color; g.shadowBlur = 18; g.fillText(S.name, 26, 104); g.shadowBlur = 0;
      g.font = '400 26px "Bungee", "Noto Sans TC", sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(S.en, 28, 160);
      const got = seriesChars(series).filter((q) => q.tier !== 'HID' && P.ch[q.id]?.got).length;
      g.font = '700 24px "Noto Sans TC", sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(`收藏 ${got}/8${P.series[series] ? '　✦ 收齊' : ''}`, 28, 214);
      if (img) { g.save(); g.shadowColor = '#ffb84a'; g.shadowBlur = 30; g.drawImage(img, 300, 40, 210, 210); g.restore(); }
      else { g.font = '900 120px "Bungee", sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,220,150,.5)'; g.fillText('?', 410, 150); g.textAlign = 'left'; }
      if (this.poster.material.map) this.poster.material.map.dispose();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      this.poster.material.map = t; this.poster.material.needsUpdate = true;
    };
    draw(null);
    if (own) { const im = new Image(); im.onload = () => { if (this.series === series) draw(im); }; im.src = thumb(colKey(hid.id, 'n')); }
  }
  makeTrophies() {
    this.trophies.clear();
    const P = this.g.P, done = SERIES_ORDER.filter((k) => P.series[k]);
    const cup = this.cupGeo || (this.cupGeo = new THREE.LatheGeometry([[0, 0], [0.018, 0], [0.018, 0.006], [0.006, 0.01], [0.004, 0.026], [0.014, 0.034], [0.02, 0.05], [0.0185, 0.052], [0.012, 0.038], [0, 0.034]].map(([x, y]) => new THREE.Vector2(x, y)), 24));
    done.forEach((k, i) => {
      const t = new THREE.Mesh(cup, this.mats.gold); t.position.set((i - (done.length - 1) / 2) * 0.07, 0, 0); t.castShadow = true; this.trophies.add(t);
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), new THREE.MeshStandardMaterial({ color: SERIES[k].color, emissive: SERIES[k].color, emissiveIntensity: 0.8 })); gem.position.set(t.position.x, 0.04, 0.012); this.trophies.add(gem);
    });
  }
  setBuddy(key) {
    if (this.buddy) { this.buddyG.remove(this.buddy.g); disposeFigure(this.buddy); this.buddy = null; }
    const k = key && parseKey(key);
    if (!k) return;
    this.buddy = buildFigure(k.cid, k.v);
    if (k.v === 'g') this.softGlow(this.buddy);
    this.buddy.g.scale.setScalar(1.65);
    this.buddy.g.traverse((o) => { o.userData.slot = 'buddy'; });
    this.buddyG.add(this.buddy.g);
  }

  // ---------------- 開關 ----------------
  open(series) {
    const R = this.g.R;
    this.active = true;
    if (this.th0 == null) this.th0 = R.post.threshold;
    R.post.threshold = 1.4;
    this.applyTheme(this.g.P.skin.room || 'wood');
    this.fill(series || this.series || 'J');
    this.setBuddy(this.g.P.buddy);
    this.cam.focus = -1; this.cam.k = 0;
    this.resize();
  }
  close() {
    this.active = false;
    this.clearSlots();
    if (this.buddy) { this.buddyG.remove(this.buddy.g); disposeFigure(this.buddy); this.buddy = null; }
    if (this.th0 != null) this.g.R.post.threshold = this.th0;
  }
  resize() {
    const R = this.g.R;
    this.camera.aspect = R.w / R.h;
    this.camera.updateProjectionMatrix();
  }
  drag(dx) { if (this.cam.focus < 0) this.cam.tyaw = Math.max(-0.45, Math.min(0.45, this.cam.tyaw - dx * 0.004)); }
  // ---------------- 點擊 ----------------
  pickAt(x, y) {
    const R = this.g.R;
    this.ray.setFromCamera({ x: (x / R.w) * 2 - 1, y: -(y / R.h) * 2 + 1 }, this.camera);
    const objs = [this.holder, this.buddyG];
    const hit = this.ray.intersectObjects(objs, true)[0];
    if (!hit) return null;
    let o = hit.object; while (o && o.userData.slot == null) o = o.parent;
    return o ? o.userData.slot : null;
  }
  // 回傳：{ kind:'slot'|'buddy'|'none', slot }
  tap(x, y) {
    const s = this.pickAt(x, y);
    if (s === 'buddy') { this.poke(this.buddy, this.buddyG, true); return { kind: 'buddy' }; }
    if (s == null) return { kind: 'none' };
    const sl = this.slots[s];
    if (!sl.own) { this.shake = { sl, t: 0 }; this.g.snd.deny(); return { kind: 'locked', slot: sl }; }
    sl.react = 0;
    this.burst(sl.g.position.clone().add(new THREE.Vector3(0, 0.1, 0.02)));
    this.g.snd.squeak();
    this.cam.focus = s;
    return { kind: 'slot', slot: sl };
  }
  poke(fig, g) { if (!fig) return; this.buddyReact = 0; this.burst(g.position.clone().add(new THREE.Vector3(0, 0.16, 0))); this.g.snd.squeak(); }
  unfocus() { this.cam.focus = -1; }
  burst(p) {
    let n = 0;
    for (const s of this.sp) { if (s.life > 0) continue; s.p.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.04, 0)); s.v.set((Math.random() - 0.5) * 0.5, 0.25 + Math.random() * 0.45, (Math.random() - 0.2) * 0.3); s.life = 0.7 + Math.random() * 0.5; if (++n >= 18) break; }
  }
  // 螢幕座標（給台詞泡泡）
  screenOf(slot) {
    const R = this.g.R;
    let p;
    if (slot === 'buddy') p = this.buddyG.position.clone().add(new THREE.Vector3(0, 0.22, 0));
    else { const sl = this.slots[slot]; if (!sl) return null; p = sl.g.position.clone().add(new THREE.Vector3(0, 0.19, 0)); }
    this.camera.updateMatrixWorld();
    p.project(this.camera);
    return { x: ((p.x + 1) / 2) * R.w, y: ((1 - p.y) / 2) * R.h };
  }

  // ---------------- 每一幀 ----------------
  update(dt, t) {
    const C = this.cam, R = this.g.R, cam = this.camera;
    C.yaw += (C.tyaw - C.yaw) * Math.min(1, dt * 5);
    C.k += ((C.focus >= 0 ? 1 : 0) - C.k) * Math.min(1, dt * 4);
    // 鏡頭：總覽（整座櫃子）↔ 特寫（某一格）
    const vfov = (cam.fov * PI) / 180, tanV = Math.tan(vfov / 2), tanH = tanV * cam.aspect;
    const top = this.g.ui.denTop || 0, bot = this.g.ui.denBottom || 0, side = this.g.ui.denSide || 0;
    const land = cam.aspect > 1;
    const visFrac = Math.max(0.35, (R.h - top - bot) / R.h);
    const dAll = Math.max((CAB_W + 0.3) / 2 / tanH, (land ? 1.04 : 1.32) / 2 / (tanV * visFrac));
    const tAll = new THREE.Vector3(0, land ? 0.6 : 0.57, CAB_Z + 0.05);
    let tgt = tAll, dist = dAll;
    if (C.focus >= 0 && this.slots[C.focus]) {
      const fp = this.slots[C.focus].g.position;
      const tF = new THREE.Vector3(fp.x, fp.y + 0.085, fp.z);
      const dF = Math.max(0.2 / tanH, 0.3 / 2 / (tanV * visFrac));
      tgt = tAll.clone().lerp(tF, C.k); dist = dAll + (dF - dAll) * C.k;
      this.lastFocus = C.focus;
    } else if (C.k > 0.01 && this.lastFocus != null && this.slots[this.lastFocus]) {
      const fp = this.slots[this.lastFocus].g.position;
      tgt = tAll.clone().lerp(new THREE.Vector3(fp.x, fp.y + 0.085, fp.z), C.k); const dF = Math.max(0.2 / tanH, 0.3 / 2 / (tanV * visFrac)); dist = dAll + (dF - dAll) * C.k;
    }
    const pitch = 0.1 + 0.06 * (1 - C.k), yaw = C.yaw * (1 - C.k);
    cam.position.set(tgt.x + Math.sin(yaw) * Math.cos(pitch) * dist, tgt.y + Math.sin(pitch) * dist, tgt.z + Math.cos(yaw) * Math.cos(pitch) * dist);
    cam.lookAt(tgt);
    cam.setViewOffset(R.w, R.h, (side / 2) * C.k, (bot - top) / 2, R.w, R.h);
    // 公仔
    for (const sl of this.slots) {
      const f = sl.fig;
      if (sl.react >= 0) {
        sl.react += dt;
        const k = sl.react, hop = k < 0.5 ? Math.sin((k / 0.5) * PI) : 0;
        sl.pose.position.y = hop * 0.045; sl.pose.rotation.y = k < 0.7 ? ease(k / 0.7) * PI * 2 : 0;
        const sq = k < 0.12 ? 1 - Math.sin((k / 0.12) * PI) * 0.12 : 1;
        sl.pose.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
        if (f && sl.star >= 2 && f.act && k > 0.5) f.act(t); else f?.tick?.(t);
        if (k > 4) { sl.react = -1; sl.pose.position.y = 0; sl.pose.rotation.y = 0; }
      } else if (f && !sl.silhouette) f.tick?.(t);
      if (sl.q) { sl.q.position.y = 0.085 + Math.sin(t * 2 + sl.i) * 0.006; sl.q.material.opacity = 0.75 + Math.sin(t * 3) * 0.25; }
    }
    if (this.shake) { const s = this.shake; s.t += dt; s.sl.pose.position.x = Math.sin(s.t * 40) * 0.004 * Math.max(0, 1 - s.t / 0.4); if (s.t > 0.4) { s.sl.pose.position.x = 0; this.shake = null; } }
    if (this.buddy) {
      if (this.buddyReact != null) { this.buddyReact += dt; const k = this.buddyReact; this.buddyG.position.y = this.cushionTop.y + (k < 0.5 ? Math.sin((k / 0.5) * PI) * 0.05 : 0); this.buddyG.rotation.y = k < 0.7 ? ease(k / 0.7) * PI * 2 : 0; if (k > 3) this.buddyReact = null; }
      if (this.buddyReact != null && this.buddyReact > 0.5 && starOf(this.g.P.ch[this.buddy.cid]?.got || 0) >= 2) this.buddy.act?.(t); else this.buddy.tick?.(t);
    }
    // 光點、星星
    const a = this.motes.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) { a.array[i * 3 + 1] += Math.sin(t * 0.4 + i) * 0.00025; a.array[i * 3] += Math.cos(t * 0.3 + i * 1.7) * 0.0002; }
    a.needsUpdate = true;
    const sa = this.sparkPts.geometry.attributes.position;
    this.sp.forEach((s, i) => {
      if (s.life > 0) { s.life -= dt; s.v.y -= dt * 0.6; s.p.addScaledVector(s.v, dt); }
      const on = s.life > 0;
      sa.array[i * 3] = on ? s.p.x : 0; sa.array[i * 3 + 1] = on ? s.p.y : -9; sa.array[i * 3 + 2] = on ? s.p.z : 0;
    });
    sa.needsUpdate = true;
    this.lampLight.intensity = 0.85 + Math.sin(t * 7.3) * 0.02;
    R.render(this.scene, cam, t);
  }
}
