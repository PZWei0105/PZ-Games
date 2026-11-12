// 角色檢查頁：dev-figs.html#J1,J2?v=n&act=1&cols=4
import * as THREE from 'three';
import { Renderer } from '../engine/render.js';
import { makeEnv } from '../engine/env.js';
import { buildFigure, hasFigure } from '../game/figures.js';
import { CHARS } from '../game/data.js';
const app = document.getElementById('app');
const R = new Renderer(app);
const q = new URLSearchParams(location.search);
const scene = new THREE.Scene();
scene.environment = makeEnv(R.r); scene.environmentIntensity = +(q.get('ei') || 0.7);
scene.background = new THREE.Color(q.get('bg') || '#0b0d16');
scene.add(new THREE.HemisphereLight('#c8d4ff', '#120c08', 0.6));
R.post.threshold = +(q.get('th') || 1.15); R.post.bloom = +(q.get('bl') || 0.6);
const key = new THREE.DirectionalLight('#ffffff', +(q.get('key') || 2.2)); key.position.set(0.3, 1.2, 0.8); scene.add(key);
const rim = new THREE.DirectionalLight('#9fd8ff', 1.1); rim.position.set(-0.8, 0.5, -0.8); scene.add(rim);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({ color: '#141724', roughness: 0.6 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -0.001; if (q.get('floor')) scene.add(floor);
const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
const vers = (q.get('v') || 'n').split(',');
const ids = location.hash ? location.hash.slice(1).split(',') : CHARS.filter((c) => hasFigure(c.id)).map((c) => c.id);
const items = [];
const cols = +(q.get('cols') || Math.min(ids.length * vers.length, 4));
const sp = 0.15;
let i = 0;
for (const id of ids) for (const v of vers) {
  const b = buildFigure(id, v);
  const x = (i % cols) * sp, y = -Math.floor(i / cols) * sp * 1.02;
  b.g.position.set(x, y, 0); b.g.rotation.y = +(q.get('ry') || 0);
  scene.add(b.g); items.push(b); i++;
}
const rows = Math.ceil(i / cols);
const cx = ((cols - 1) * sp) / 2, cy = -((rows - 1) * sp * 1.02) / 2 + 0.055;
function resize() {
  R.resize(); cam.aspect = R.w / R.h;
  const span = Math.max(cols * sp / cam.aspect, rows * sp * 1.02);
  const d = (span / 2 / Math.tan(15 * Math.PI / 180)) * 1.02 + 0.05;
  const el = +(q.get('el') || 0.2);
  cam.position.set(cx, cy + Math.sin(el) * d, Math.cos(el) * d); cam.lookAt(cx, cy, 0);
  cam.updateProjectionMatrix();
}
resize(); addEventListener('resize', resize);
const act = q.get('act') === '1', spin = +(q.get('spin') || 0);
let t0 = performance.now();
function loop() {
  const t = (performance.now() - t0) / 1000 + (+(q.get('t') || 1.3));
  items.forEach((b) => { b.tick?.(t); if (act) b.act?.(t); if (spin) b.g.rotation.y = t * spin; });
  R.render(scene, cam, t);
  if (q.get('once') && ++frames >= +q.get('once')) { window.__done = true; return; }
  requestAnimationFrame(loop);
}
let frames = 0;
loop();
window.__ready = true;
