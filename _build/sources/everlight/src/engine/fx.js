// 粒子與特效：火花、碎片、水花、光柱、斬擊弧
import * as THREE from 'three';

const PV = `attribute float size; attribute float alpha; attribute float shape; attribute vec3 color;
varying float vA; varying float vS; varying vec3 vC;
uniform float scale;
void main(){ vA = alpha; vS = shape; vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / max(0.5, -mv.z); gl_Position = projectionMatrix * mv; }`;
const PF = `varying float vA; varying float vS; varying vec3 vC;
void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p);
  float a = vS > 0.5 ? smoothstep(0.5, 0.0, d) : step(max(abs(p.x), abs(p.y)), 0.42);
  if (a < 0.01) discard; gl_FragColor = vec4(vC * a * vA, a * vA); }`;

function arcTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  for (let i = 0; i < 40; i++) {
    const t = i / 40;
    x.strokeStyle = `rgba(255,255,255,${(1 - t) * 0.18})`;
    x.lineWidth = 2 + (1 - t) * 18;
    x.beginPath(); x.arc(128, 150, 120 - t * 30, Math.PI * 1.15, Math.PI * 1.85); x.stroke();
  }
  x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = 4;
  x.beginPath(); x.arc(128, 150, 118, Math.PI * 1.18, Math.PI * 1.82); x.stroke();
  const t = new THREE.CanvasTexture(c); return t;
}
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function ringTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 40, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function pillarTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 256);
  const g2 = x.createLinearGradient(0, 0, 0, 256); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.3, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = g2; x.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}

export class FX {
  constructor(scene, cap = 900) {
    this.scene = scene;
    this.cap = cap;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(cap * 3); this.col = new Float32Array(cap * 3); this.size = new Float32Array(cap); this.alpha = new Float32Array(cap); this.shape = new Float32Array(cap);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('shape', new THREE.BufferAttribute(this.shape, 1));
    this.mat = new THREE.ShaderMaterial({ vertexShader: PV, fragmentShader: PF, uniforms: { scale: { value: 300 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false; this.points.renderOrder = 5;
    scene.add(this.points);
    this.ps = []; // 粒子資料
    this.meshes = [];
    this.tex = { arc: arcTex(), glow: glowTex(), ring: ringTex(), pillar: pillarTex() };
  }
  setScale(h, fov = 40) { this.mat.uniforms.scale.value = (h * 0.5 / Math.tan((fov * Math.PI) / 360)) * 2.2; }
  emit(o) {
    const n = o.n || 10;
    for (let i = 0; i < n; i++) {
      if (this.ps.length >= this.cap) this.ps.shift();
      const a = Math.random() * Math.PI * 2, el = (o.cone ?? 1) * (Math.random() - 0.3) * Math.PI;
      const sp = (o.speed || 2) * (0.4 + Math.random() * 0.8);
      const dir = o.dir ? new THREE.Vector3(...o.dir).normalize() : null;
      let v;
      if (dir) v = dir.clone().multiplyScalar(sp).add(new THREE.Vector3((Math.random() - 0.5) * (o.spread ?? 1), (Math.random() - 0.5) * (o.spread ?? 1), (Math.random() - 0.5) * (o.spread ?? 1)).multiplyScalar(sp));
      else v = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el) * 0.8 + (o.up || 0), Math.sin(a) * Math.cos(el) * 0.5).multiplyScalar(sp);
      const cs = o.colors || [o.color || '#ffffff'];
      const c = new THREE.Color(cs[Math.floor(Math.random() * cs.length)]);
      const p = o.pos.clone ? o.pos.clone() : new THREE.Vector3(...o.pos);
      if (o.jitter) p.add(new THREE.Vector3((Math.random() - 0.5) * o.jitter, (Math.random() - 0.5) * o.jitter * (o.jy ?? 1), (Math.random() - 0.5) * o.jitter * 0.5));
      this.ps.push({ p, v, c, life: (o.life || 0.6) * (0.6 + Math.random() * 0.6), t: 0, size: (o.size || 0.25) * (0.6 + Math.random() * 0.8), g: o.gravity ?? 0, drag: o.drag ?? 1.5, shape: o.shape ?? 1, grow: o.grow ?? 0, toward: o.toward || null });
    }
  }
  billboard(tex, pos, o = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(o.color || '#ffffff'), side: THREE.DoubleSide, opacity: o.opacity ?? 1 }));
    m.position.copy(pos);
    m.renderOrder = 6;
    if (o.flat) m.rotation.x = -Math.PI / 2;
    if (o.rot != null) m.rotation.z = o.rot;
    m.scale.set(o.w || 1, o.h || o.w || 1, 1);
    this.scene.add(m);
    this.meshes.push({ m, t: 0, life: o.life || 0.3, grow: o.grow ?? 1.5, w: o.w || 1, h: o.h || o.w || 1, fade: o.fade ?? 1, up: o.up || 0, flat: o.flat });
    return m;
  }
  update(dt, camera) {
    let n = 0;
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const q = this.ps[i];
      q.t += dt;
      if (q.t >= q.life) { this.ps.splice(i, 1); continue; }
      if (q.toward) { const d = q.toward.clone().sub(q.p); q.v.lerp(d.multiplyScalar(4), Math.min(1, dt * 3)); }
      q.v.y -= q.g * dt;
      q.v.multiplyScalar(Math.max(0, 1 - q.drag * dt));
      q.p.addScaledVector(q.v, dt);
    }
    for (const q of this.ps) {
      const k = q.t / q.life;
      this.pos[n * 3] = q.p.x; this.pos[n * 3 + 1] = q.p.y; this.pos[n * 3 + 2] = q.p.z;
      this.col[n * 3] = q.c.r; this.col[n * 3 + 1] = q.c.g; this.col[n * 3 + 2] = q.c.b;
      this.size[n] = q.size * (1 + q.grow * k);
      this.alpha[n] = (1 - k) * (k < 0.1 ? k * 10 : 1);
      this.shape[n] = q.shape;
      n++;
    }
    for (let i = n; i < Math.min(this.cap, n + 4); i++) this.alpha[i] = 0;
    const g = this.points.geometry;
    g.setDrawRange(0, n);
    for (const k of ['position', 'color', 'size', 'alpha', 'shape']) g.attributes[k].needsUpdate = true;
    for (let i = this.meshes.length - 1; i >= 0; i--) {
      const e = this.meshes[i]; e.t += dt;
      const k = e.t / e.life;
      if (k >= 1) { this.scene.remove(e.m); e.m.geometry.dispose(); e.m.material.dispose(); this.meshes.splice(i, 1); continue; }
      const s = 1 + (e.grow - 1) * k;
      e.m.scale.set(e.w * s, e.h * (e.flat ? s : 1 + (e.grow - 1) * k * 0.3), 1);
      e.m.material.opacity = (1 - Math.pow(k, 1.5)) * e.fade;
      e.m.position.y += e.up * dt;
      if (!e.flat && camera) e.m.quaternion.copy(camera.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), e.m.userData.rz || 0));
    }
  }
  // ----- 預設特效 -----
  hitFx(kind, pos, big = false) {
    const P = pos.clone();
    const B = big ? 1.6 : 1;
    switch (kind) {
      case 'slash': {
        const m = this.billboard(this.tex.arc, P, { w: 2.2 * B, h: 1.1 * B, life: 0.22, grow: 1.4, color: '#f4f8ff' });
        m.userData.rz = (Math.random() - 0.5) * 1.2;
        this.emit({ pos: P, n: 14 * B, colors: ['#ffffff', '#cfe4ff'], speed: 5, life: 0.35, size: 0.12, shape: 0, drag: 3 });
        break;
      }
      case 'pierce':
        for (let i = 0; i < 3; i++) { const m = this.billboard(this.tex.pillar, P.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, 0)), { w: 0.18, h: 2.4 * B, life: 0.18, grow: 1.2, color: '#9ff4ff' }); m.userData.rz = Math.PI / 2 + (Math.random() - 0.5) * 0.5; }
        this.emit({ pos: P, n: 12 * B, colors: ['#bffcff', '#ffffff'], speed: 6, life: 0.3, size: 0.1, shape: 0, drag: 4 });
        break;
      case 'blunt': case 'bite':
        this.billboard(this.tex.glow, P, { w: 1.6 * B, life: 0.18, grow: 2, color: '#ffd8a0' });
        this.billboard(this.tex.ring, P.clone().setY(P.y - 0.5), { w: 1.2 * B, life: 0.35, grow: 3, color: '#ffe0b0', flat: true });
        this.emit({ pos: P, n: 18 * B, colors: ['#e8d0a8', '#b89a78', '#ffffff'], speed: 4, life: 0.5, size: 0.14, shape: 0, gravity: 9, drag: 1 });
        break;
      case 'fire':
        this.billboard(this.tex.glow, P, { w: 2.2 * B, life: 0.3, grow: 1.6, color: '#ff8a30' });
        this.emit({ pos: P, n: 34 * B, colors: ['#fff2a0', '#ffb040', '#ff5a20', '#c03010'], speed: 2.5, life: 0.8, size: 0.28, up: 1.2, gravity: -3, drag: 2, jitter: 0.6 });
        break;
      case 'tide':
        this.billboard(this.tex.ring, P.clone().setY(P.y - 0.4), { w: 1.4 * B, life: 0.45, grow: 2.6, color: '#7ac8ff', flat: true });
        this.emit({ pos: P, n: 34 * B, colors: ['#bfe8ff', '#5aa8ff', '#ffffff'], speed: 4.5, life: 0.7, size: 0.16, shape: 0, gravity: 12, up: 1.4, drag: 0.6 });
        break;
      case 'light':
        this.billboard(this.tex.pillar, P.clone().setY(P.y + 1.2), { w: 1.4 * B, h: 5, life: 0.5, grow: 1.3, color: '#ffe08a' });
        this.billboard(this.tex.glow, P, { w: 2.4 * B, life: 0.35, grow: 1.4, color: '#fff2c0' });
        this.emit({ pos: P, n: 26 * B, colors: ['#fff6d0', '#ffd76a'], speed: 2, life: 0.9, size: 0.2, up: 1.5, gravity: -1, drag: 1, jitter: 0.8 });
        break;
      case 'shadow':
        this.billboard(this.tex.glow, P, { w: 2.2 * B, life: 0.4, grow: 0.6, color: '#7a4aff' });
        this.emit({ pos: P, n: 30 * B, colors: ['#b48aff', '#5a2aaa', '#20103a'], speed: 3.5, life: 0.6, size: 0.24, drag: 2, toward: P.clone(), jitter: 2.2 });
        break;
      case 'heal':
        this.emit({ pos: P.clone().setY(P.y - 0.6), n: 22, colors: ['#bfffd0', '#ffffff', '#ffe8a0'], speed: 0.8, life: 1.1, size: 0.18, up: 2, gravity: -2, drag: 0.5, jitter: 0.9, shape: 1 });
        break;
      case 'buff':
        this.emit({ pos: P.clone().setY(P.y - 0.6), n: 16, colors: ['#ffd76a', '#fff6d0'], speed: 0.5, life: 0.9, size: 0.14, up: 3, gravity: -3, drag: 0.2, jitter: 0.8, shape: 0 });
        break;
      case 'guard':
        this.billboard(this.tex.ring, P, { w: 1.6, life: 0.5, grow: 1.4, color: '#9ac8ff' });
        break;
      case 'smoke':
        this.emit({ pos: P, n: 24, colors: ['#8a8a96', '#5a5a66', '#b0b0ba'], speed: 1.2, life: 1.2, size: 0.6, grow: 1.5, drag: 1.5, jitter: 2, shape: 1 });
        break;
      case 'item':
        this.emit({ pos: P, n: 16, colors: ['#ffffff', '#bfe8ff'], speed: 1.2, life: 0.8, size: 0.14, up: 1, drag: 1, shape: 0, jitter: 0.6 });
        break;
      case 'break':
        this.billboard(this.tex.glow, P, { w: 3.2, life: 0.25, grow: 1.8, color: '#ffffff' });
        this.billboard(this.tex.ring, P, { w: 1.5, life: 0.5, grow: 4, color: '#ffd27a' });
        this.emit({ pos: P, n: 46, colors: ['#ffffff', '#cfe0ff', '#8fb0ff', '#ffe08a'], speed: 7, life: 0.9, size: 0.17, shape: 0, gravity: 8, drag: 0.8 });
        break;
      case 'ko':
        this.emit({ pos: P, n: 40, colors: ['#ffffff', '#ffe8c0', '#9ab0d0'], speed: 1.4, life: 1.2, size: 0.16, up: 1.2, gravity: -1.5, drag: 0.8, jitter: 1.2, shape: 0 });
        break;
      default:
        this.emit({ pos: P, n: 12, color: '#ffffff', speed: 3, life: 0.4, size: 0.12 });
    }
  }
  clear() {
    this.ps.length = 0;
    for (const e of this.meshes) this.scene.remove(e.m);
    this.meshes.length = 0;
  }
}
