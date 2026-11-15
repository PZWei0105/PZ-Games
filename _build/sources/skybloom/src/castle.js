// 湖北岸的「星辰宮」：煙火就在它背後的天空綻放；牆面打燈會慢慢換色
import * as THREE from 'three';
import { glowPoints, snowable, U } from './glow.js';
import { canvasTex, hex, TAU, hsv } from './util.js';

export class Castle {
  constructor(scene, at, q) {
    const grp = this.grp = new THREE.Group(); grp.position.set(at.x, 0, at.z); scene.add(grp);
    const stoneMap = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#8a8296'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < w; x += 32) { g.fillStyle = `hsl(265,8%,${44 + Math.random() * 14}%)`; g.fillRect(x + 1, y + 1, 30, 14); }
    }, { repeat: [3, 3] });
    // 從下往上打的光：底部亮、往上變暗
    const upTex = canvasTex(4, 128, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#7a7a7a'); gr.addColorStop(1, '#1a1a1a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, {});
    const wall = this.wall = snowable(new THREE.MeshStandardMaterial({ map: stoneMap, roughness: 0.85, emissive: new THREE.Color('#ff5ab8'), emissiveMap: upTex, emissiveIntensity: 0.9 }), 0.8);
    const roofM = snowable(new THREE.MeshStandardMaterial({ color: '#3a3f9a', roughness: 0.4, metalness: 0.4, emissive: '#1a1450', emissiveIntensity: 0.6 }), 1.2);
    const gold = new THREE.MeshStandardMaterial({ color: '#e0b25a', roughness: 0.25, metalness: 1, emissive: '#5a3a10', emissiveIntensity: 1 });
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); grp.add(o); return o; };
    // 基座
    add(new THREE.CylinderGeometry(26, 29, 5, 40), snowable(new THREE.MeshStandardMaterial({ color: '#2a2630', roughness: 0.95 })), 0, 2.5, 0);
    add(new THREE.CylinderGeometry(20, 22, 3, 40), wall, 0, 6.5, 0);
    // 主殿
    add(new THREE.BoxGeometry(28, 16, 15), wall, 0, 16, 0);
    add(new THREE.BoxGeometry(30, 1.4, 17), gold, 0, 24.6, 0);
    // 兩翼
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(12, 11, 11), wall, s * 19, 13.5, 2);
      const r = add(new THREE.ConeGeometry(8.4, 6, 4), roofM, s * 19, 22, 2); r.rotation.y = Math.PI / 4;
    }
    // 四座角塔
    const turrets = [[-14, -7.5, 30], [14, -7.5, 30], [-14, 7.5, 27], [14, 7.5, 27], [-25, 7.5, 22], [25, 7.5, 22]];
    for (const [x, z, h] of turrets) {
      add(new THREE.CylinderGeometry(2.4, 2.7, h, 16), wall, x, 8 + h / 2, z);
      add(new THREE.ConeGeometry(3.2, 9, 16), roofM, x, 8 + h + 4.5, z);
      add(new THREE.ConeGeometry(0.35, 3, 8), gold, x, 8 + h + 10.4, z);
    }
    // 中央高塔與玻璃圓頂
    add(new THREE.CylinderGeometry(5, 5.6, 26, 20), wall, 0, 37, 0);
    add(new THREE.CylinderGeometry(6.2, 6.2, 1.2, 24), gold, 0, 50.4, 0);
    this.domeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 1.4, 2.4), transparent: true, opacity: 0.9 });
    add(new THREE.SphereGeometry(5.6, 24, 14, 0, TAU, 0, Math.PI / 2), this.domeM, 0, 51, 0);
    add(new THREE.ConeGeometry(1.1, 11, 12), gold, 0, 62, 0);
    // 星
    grp.add(glowPoints([0, 69, 0], [6, 5, 3.4], 3.4, { fn: 'col *= 0.8 + 0.2 * sin(uTime * 3.0); sz *= 0.9 + 0.15 * sin(uTime * 2.0);', withReflect: false }));
    // 窗：一格一格的暖光（點）
    const wp = [], wc = [];
    const winRow = (x0, x1, y, z, n) => { for (let i = 0; i < n; i++) { wp.push(x0 + ((x1 - x0) * (i + 0.5)) / n, y, z); wc.push(...hex(Math.random() < 0.15 ? '#9ad6ff' : '#ffc070', 1.6 + Math.random() * 0.8)); } };
    for (const y of [12, 17, 21.5]) winRow(-12, 12, y, 7.6, 9);
    for (const s of [-1, 1]) for (const y of [11, 15.5]) winRow(s * 23.5, s * 14.5, y, 7.6, 3);
    for (let k = 0; k < 3; k++) for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; wp.push(Math.cos(a) * 5.3, 30 + k * 6.5, Math.sin(a) * 5.3); wc.push(...hex('#ffd08a', 1.9)); }
    const win = glowPoints(wp, wc, 1.0, { fn: 'col *= 0.85 + 0.15 * sin(uTime * 0.7 + pos.x * 3.0 + pos.y);', withReflect: true });
    grp.add(win);
    // 外輪廓燈泡
    const bp = [], bc = [], ph = [];
    const line = (a, b, n) => { for (let i = 0; i <= n; i++) { const t = i / n; bp.push(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t); bc.push(...hex('#fff2d0', 2.4)); ph.push(bp.length / 3); } };
    line([-15, 25.4, 8.6], [15, 25.4, 8.6], 40);
    line([-15, 8.2, 8.6], [15, 8.2, 8.6], 40);
    for (const [x, z, h] of turrets) { const top = 8 + h, tip = 8 + h + 9; for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; line([x + Math.cos(a) * 3.3, top + 0.1, z + Math.sin(a) * 3.3], [x, tip, z], 6); } }
    for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; bp.push(Math.cos(a) * 26.4, 5.2, Math.sin(a) * 26.4); bc.push(...hex('#ffd27a', 2.2)); ph.push(i * 2); }
    const bulbs = glowPoints(bp, bc, 0.5, { attrs: 'attribute float ph;', fn: 'col *= 0.55 + 0.45 * step(0.5, fract(uTime * 0.9 - ph * 0.05));', extra: { ph: { data: ph, size: 1 } }, withReflect: true });
    grp.add(bulbs);
    scene.add(win.userData.reflection, bulbs.userData.reflection);
    win.userData.reflection.matrixAutoUpdate = false; bulbs.userData.reflection.matrixAutoUpdate = false;
    grp.updateMatrixWorld(true);
    win.userData.reflection.matrix.copy(win.matrixWorld); bulbs.userData.reflection.matrix.copy(bulbs.matrixWorld);
    // 打在牆上的探照燈光柱
    const beamGeo = new THREE.ConeGeometry(4, 120, 20, 1, true); beamGeo.translate(0, -60, 0);
    const beamM = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uCol: { value: new THREE.Color(0.4, 0.5, 1) } },
      vertexShader: 'varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying float vY; uniform vec3 uCol; void main(){ float a = smoothstep(-120.0, -10.0, vY) * (1.0 - smoothstep(-6.0, 0.0, vY)); gl_FragColor = vec4(uCol * a * 0.07, 1.0); }',
    });
    this.beams = [];
    for (const [x, z, s] of [[-30, 6, 1], [30, 6, -1], [-12, 18, 1], [12, 18, -1]]) {
      const b = new THREE.Mesh(beamGeo, beamM.clone());
      b.position.set(x, 1, z); b.rotation.set(0, 0, Math.PI); grp.add(b);
      this.beams.push({ b, s, ph: Math.random() * 6 });
    }
    this.t = 0;
  }
  update(t) {
    const h = (t * 0.018) % 1, c = hsv(h * 0.6 + 0.75, 0.75, 1);
    this.wall.emissive.setRGB(c[0], c[1], c[2]);
    const d = hsv(h + 0.5, 0.6, 1); this.domeM.color.setRGB(d[0] * 2.2, d[1] * 2.2, d[2] * 2.2);
    for (const B of this.beams) {
      B.b.rotation.z = Math.PI + B.s * (0.35 + 0.25 * Math.sin(t * 0.35 + B.ph));
      B.b.rotation.x = 0.25 * Math.sin(t * 0.27 + B.ph * 2);
      const k = hsv(h + B.ph * 0.1, 0.5, 1); B.b.material.uniforms.uCol.value.setRGB(k[0], k[1], k[2]);
    }
  }
}
