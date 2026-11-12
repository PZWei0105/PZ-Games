import * as THREE from 'three';
import { Renderer } from '../engine/render.js';
import { makeEnv } from '../engine/env.js';
import { buildPrize, flattenPrize } from '../game/models.js';
import { OLD_PRIZES as PRIZES } from '../game/data.js';
const app = document.getElementById('app');
const R = new Renderer(app);
const scene = new THREE.Scene();
scene.environment = makeEnv(R.r); scene.environmentIntensity = +(new URLSearchParams(location.search).get('ei') || 0.75);
scene.background = new THREE.Color('#0a0c14');
scene.add(new THREE.HemisphereLight('#b8c8ff', '#201810', 0.6));
const d = new THREE.DirectionalLight('#ffffff', 1.6); d.position.set(0.4, 1, 0.8); scene.add(d);
const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
const items = [];
const cols = 4;
const only = location.hash.slice(1);
const list = only ? PRIZES.filter((p) => only.split(',').includes(p.id)) : PRIZES;
list.forEach((p, i) => {
  const b = buildPrize(p.id);
  const x = (i % cols) * 0.16, y = -Math.floor(i / cols) * 0.17;
  b.g.position.set(x, y, 0);
  scene.add(b.g); items.push(b);
  if (location.search.includes('flat')) { const parts = flattenPrize(p.id); const gg = new THREE.Group(); parts.forEach((q) => gg.add(new THREE.Mesh(q.geo, q.mat))); gg.position.set(x + 0.075, y, 0); gg.scale.setScalar(0.5); scene.add(gg); }
});
const rows = Math.ceil(list.length / cols);
const cx = ((cols - 1) * 0.16) / 2, cy = -((rows - 1) * 0.17) / 2 + 0.06;
function resize() { R.resize(); cam.aspect = R.w / R.h; const fit = Math.max(rows * 0.17 / 2 / Math.tan(15 * Math.PI / 180), cols * 0.16 / 2 / Math.tan(15 * Math.PI / 180) / cam.aspect); cam.position.set(cx, cy + 0.12, fit * 1.05 + 0.1); cam.lookAt(cx, cy, 0); cam.updateProjectionMatrix(); }
resize(); addEventListener('resize', resize);
let t0 = performance.now();
function loop() { const t = (performance.now() - t0) / 1000 + 2; items.forEach((b) => b.tick && b.tick(t)); R.render(scene, cam, t); requestAnimationFrame(loop); }
loop();
window.__ready = true;
