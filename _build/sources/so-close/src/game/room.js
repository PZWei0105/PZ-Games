// 店內：地面、牆、霓虹招牌、空氣中的光點
import * as THREE from 'three';
import { tex, signTex } from '../engine/tex.js';

export function buildRoom(scene, count) {
  const g = new THREE.Group();
  scene.add(g);
  const span = (count - 1) * 1.28;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(span + 12, 10), new THREE.MeshStandardMaterial({ map: tex.tiles(), roughness: 0.32, metalness: 0.25, envMapIntensity: 0.8 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(span / 2, 0, 1.5); floor.receiveShadow = true; g.add(floor);
  // 後牆
  const wallMat = new THREE.MeshStandardMaterial({ color: '#0d0e16', roughness: 0.85, metalness: 0.1 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(span + 12, 6), wallMat); wall.position.set(span / 2, 3, -0.75); g.add(wall);
  // 牆上的直條燈
  const cols = ['#53d6ff', '#ff5fc8', '#ffb35c', '#9b6bff'];
  for (let i = -3; i <= count + 2; i++) {
    const x = i * 1.28 + 0.64;
    const c = new THREE.Color(cols[(i + 8) % cols.length]);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.6, 0.02), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(1.8) }));
    strip.position.set(x, 1.9, -0.72); g.add(strip);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 3.2), new THREE.MeshBasicMaterial({ map: tex.dot(), color: c.clone().multiplyScalar(0.35), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.set(x, 1.9, -0.73); g.add(halo);
  }
  // 大招牌
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: signTex('差一點', { color: '#fff4fb', glow: '#ff3fb4', blur: 40, w: 1024, h: 256, passes: 3 }), transparent: true, depthWrite: false }));
  const sign2 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.3), new THREE.MeshBasicMaterial({ map: signTex('SO CLOSE', { color: '#c9f6ff', glow: '#2ad7ff', blur: 30, font: '900 150px "Bungee", "Noto Sans TC", sans-serif', w: 1024, h: 200, passes: 3 }), transparent: true, depthWrite: false }));
  const signs = [];
  for (let k = 0; k < Math.max(1, Math.ceil(count / 2)); k++) {
    const a = sign.clone(), b = sign2.clone();
    const x = k * 2.56 + 0.64;
    a.position.set(x, 2.78, -0.7); b.position.set(x, 2.43, -0.7);
    g.add(a, b); signs.push(a, b);
  }
  // 天花板的暗光
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(span + 12, 6), new THREE.MeshBasicMaterial({ color: '#05060a' }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(span / 2, 3.6, 1.5); g.add(ceil);
  // 漂浮光點
  const n = 160, pos = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) { pos[i * 3] = -2 + Math.random() * (span + 4); pos[i * 3 + 1] = 0.3 + Math.random() * 2.6; pos[i * 3 + 2] = -0.5 + Math.random() * 3; seed.push(Math.random() * 6); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const motes = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.018, map: tex.dot(), color: new THREE.Color('#ffe6c8').multiplyScalar(0.8), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  motes.frustumCulled = false; g.add(motes);
  return {
    group: g,
    tick(t) {
      const a = pg.attributes.position;
      for (let i = 0; i < n; i++) { a.array[i * 3 + 1] += Math.sin(t * 0.3 + seed[i]) * 0.0004; a.array[i * 3] += Math.cos(t * 0.2 + seed[i]) * 0.0003; }
      a.needsUpdate = true;
      const f = 0.85 + 0.15 * Math.sin(t * 2.1) * Math.sin(t * 7.3);
      signs.forEach((s, i) => { s.material.opacity = i % 2 ? 1 : f; });
    },
  };
}
