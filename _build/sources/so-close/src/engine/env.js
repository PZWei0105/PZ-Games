// 環境光（反射用）：攝影棚＋霓虹色塊
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function makeEnv(renderer, opts = {}) {
  const pm = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  // 加幾塊彩色燈板，讓金屬與寶石反射出店內的霓虹
  const addPanel = (col, k, x, y, z, w, h, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.y = ry; room.add(m);
  };
  if (opts.neon !== false) {
    addPanel('#3fd3ff', 2.2, -4.5, 3, 2, 2.5, 1.2, Math.PI / 2);
    addPanel('#ff4fd2', 2.2, 4.5, 2.5, -2, 2.5, 1.2, -Math.PI / 2);
    addPanel('#ffc65a', 1.6, 0, 5.5, 0, 3, 3);
  }
  const rt = pm.fromScene(room, 0.035);
  room.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  pm.dispose();
  return rt.texture;
}
