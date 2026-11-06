// 開蛋／開盒演出
import * as THREE from 'three';
import { tex } from '../engine/tex.js';
import { buildPrize, setPrizeScale, buildBox, capsuleGeos, capMats, CAPSULE_COLORS, N_COLORS, M } from './models.js';
import { PRIZE, RARITY } from './data.js';

const ease = (x) => 1 - Math.pow(1 - x, 3);
const back = (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

export class RevealStage {
  constructor(game) {
    this.g = game;
    const s = new THREE.Scene();
    this.scene = s;
    s.environment = game.scene.environment;
    s.environmentIntensity = 0.7;
    s.background = new THREE.Color('#030307');
    // 背景的柔光雲
    const bgm = new THREE.MeshBasicMaterial({ map: tex.dot(), color: new THREE.Color('#2a3a8a').multiplyScalar(0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.bgGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), bgm); this.bgGlow.position.set(0, 0.3, -1.4); s.add(this.bgGlow);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.01, 20);
    s.add(new THREE.HemisphereLight('#c8d4ff', '#120c08', 0.6));
    const key = new THREE.DirectionalLight('#ffffff', 2.4); key.position.set(0.3, 1.2, 0.8); s.add(key);
    const rim = new THREE.DirectionalLight('#9fd8ff', 1.2); rim.position.set(-0.8, 0.5, -0.8); s.add(rim);
    const spot = new THREE.SpotLight('#ffffff', 5, 3, 0.45, 0.7, 1); spot.position.set(0.1, 1.3, 0.6); spot.target.position.set(0, 0.1, 0); s.add(spot, spot.target);
    this.rimLight = rim;
    // 地板與光圈
    const fl = document.createElement('canvas'); fl.width = fl.height = 256;
    { const g = fl.getContext('2d'); const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, '#20232e'); r.addColorStop(0.35, '#0c0d14'); r.addColorStop(1, '#030307'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); }
    const ft = new THREE.CanvasTexture(fl); ft.colorSpace = THREE.SRGBColorSpace;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshBasicMaterial({ map: ft }));
    floor.rotation.x = -Math.PI / 2; s.add(floor);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.156, 96), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.002; s.add(this.ring);
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), new THREE.MeshBasicMaterial({ map: tex.dot(), color: '#ffffff', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.pool.rotation.x = -Math.PI / 2; this.pool.position.y = 0.003; s.add(this.pool);
    // 背光放射
    const rayTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); const lg = g.createLinearGradient(0, 256, 0, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.22, 'rgba(255,255,255,.9)'); lg.addColorStop(0.55, 'rgba(255,255,255,.35)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.beginPath(); g.moveTo(28, 256); g.lineTo(36, 256); g.lineTo(64, 0); g.lineTo(0, 0); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    this.rays = new THREE.Group(); this.rays.position.set(0, 0.17, -0.45); s.add(this.rays);
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 1.6), new THREE.MeshBasicMaterial({ map: rayTex, color: '#ffffff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.geometry.translate(0, 0.8, 0); m.rotation.z = (i / 14) * Math.PI * 2; this.rays.add(m);
    }
    // 彩帶
    const n = 140;
    this.conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.012, 0.02), new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }), n);
    this.conf.count = 0; this.conf.frustumCulled = false; s.add(this.conf);
    this.cp = Array.from({ length: n }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3() }));
    // 閃光點
    const sp = new Float32Array(300 * 3), sc = new Float32Array(300 * 3);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    this.spark = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.02, map: tex.dot(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.spark.frustumCulled = false; s.add(this.spark);
    this.sparks = Array.from({ length: 300 }, () => ({ p: new THREE.Vector3(0, -9, 0), v: new THREE.Vector3(), life: 0, c: new THREE.Color() }));
    this.holder = new THREE.Group(); s.add(this.holder);
    this.geos = capsuleGeos();
  }

  clear() {
    this.holder.clear();
    this.prize = null; this.shell = null;
    this.conf.count = 0;
    for (const p of this.sparks) p.life = 0;
  }
  play(info) {
    this.info = info;
    this.didUp = false; this.upAt = 0; this.capGone = false; this.boxObj = null; this.cap = null;
    this.clear();
    const it = info.item;
    const baseRar = it.black ? 'BLK' : it.rarity;
    this.base = baseRar;
    this.final = PRIZE[info.pid].rarity;
    // 外殼
    const shell = new THREE.Group(); this.holder.add(shell); this.shell = shell;
    if (it.kind === 'box') {
      const b = buildBox(it.prize, it.rarity, it.size);
      b.g.scale.setScalar(1.6); shell.add(b.g); this.boxObj = b;
      this.sz = it.size.sy * 1.6;
    } else {
      const r = 0.085;
      const top = new THREE.Mesh(this.geos.top, it.black ? capMats.blackTop() : capMats.top());
      const botMat = it.black ? capMats.blackBot() : new THREE.MeshPhysicalMaterial({ color: it.rarity === 'N' ? N_COLORS[it.uid % N_COLORS.length] : CAPSULE_COLORS[it.rarity], metalness: 0.15, roughness: 0.2, clearcoat: 1, envMapIntensity: 1.4 });
      const bot = new THREE.Mesh(this.geos.bot, botMat);
      const seam = new THREE.Mesh(this.geos.seam, it.black ? capMats.blackSeam() : capMats.seam());
      const tg = new THREE.Group(), bg = new THREE.Group();
      tg.add(top); bg.add(bot, seam);
      for (const m of [top, bot, seam]) m.scale.setScalar(r);
      shell.add(tg, bg);
      // 蛋裡的光
      const glow = new THREE.Mesh(new THREE.SphereGeometry(r * 0.6, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(it.black ? '#ffb030' : '#ffffff').multiplyScalar(1.4), transparent: true, opacity: 0.0 }));
      shell.add(glow);
      this.cap = { tg, bg, glow, r };
      this.sz = r * 2;
    }
    shell.position.set(0, 0.9, 0);
    this.phase = 'enter'; this.pt = 0;
    this.aura = new THREE.Color(it.black ? '#ffb030' : RARITY[it.rarity].glow);
    this.ring.material.color.set('#ffffff'); this.pool.material.color.set('#8090c0'); this.bgGlow.material.color.set('#2a3a8a').multiplyScalar(0.4);
    this.setRays(0, '#ffffff');
    this.g.R.post.flash.set(1, 1, 1, 0);
    this.g.ui.openReveal(info);
    this.g.snd.duck(0.25);
    this.resize();
  }
  resize() {
    const R = this.g.R;
    this.camera.aspect = R.w / R.h;
    const portrait = this.camera.aspect < 1;
    this.camera.fov = portrait ? 46 : 30;
    const d = portrait ? 0.34 / Math.tan((this.camera.fov / 2) * Math.PI / 180) / Math.max(0.42, this.camera.aspect * 1.25) : 0.86;
    this.camera.position.set(0, 0.2 + d * 0.12, d);
    this.camera.lookAt(0, 0.13, 0);
    // 下方要放證書卡：把畫面往上推
    this.camera.setViewOffset(R.w, R.h, 0, portrait ? R.h * 0.17 : R.h * 0.1, R.w, R.h);
    this.camera.updateProjectionMatrix();
  }
  setRays(op, col) { this.rays.children.forEach((m) => { m.material.opacity = op; m.material.color.set(col).multiplyScalar(1.4); }); }
  // 點擊：開蛋
  open() {
    if (this.phase !== 'idle') return false;
    const long = ['SSR', 'HID'].includes(this.final) || this.base === 'BLK';
    this.phase = 'twist'; this.pt = 0; this.twistLen = long ? 1.9 : 0.75;
    this.g.snd.twist();
    if (long) { this.g.snd.rise(this.twistLen); this.g.snd.rumble(this.twistLen, 0.12); }
    return true;
  }
  burst(rar, pid) {
    this.phase = 'burst'; this.pt = 0;
    this.shownRar = rar;
    const R = RARITY[rar];
    const col = new THREE.Color(R.glow);
    this.g.snd.pop();
    this.g.snd.reveal(rar);
    this.g.R.post.flash.set(col.r, col.g, col.b, rar === 'N' ? 0.35 : 0.8);
    this.flash = rar === 'N' ? 0.35 : 0.8;
    // 獎品
    const p = buildPrize(pid);
    const s = 2.7;
    p.g.scale.setScalar(0.001); p.g.position.set(0, 0, 0);
    this.holder.add(p.g); this.prize = p; this.prizeScale = s;
    this.setRays(0, R.glow);
    this.raysTarget = rar === 'N' ? 0.08 : rar === 'R' ? 0.16 : rar === 'SR' ? 0.26 : 0.38;
    this.rimLight.color.set(R.glow);
    this.ring.material.color.set(R.glow).multiplyScalar(1.6);
    this.pool.material.color.set(R.glow).multiplyScalar(0.8);
    this.bgGlow.material.color.set(R.glow).multiplyScalar(rar === 'N' ? 0.2 : 0.45);
    if (rar !== 'N') this.confetti(rar);
    this.sparkle(rar === 'N' ? 30 : rar === 'R' ? 70 : rar === 'SR' ? 140 : 260, R);
    this.g.ui.showCard(this.info, pid, pid === this.info.pid);
  }
  confetti(rar) {
    const cols = rar === 'HID' ? ['#ffd36a', '#ff6a2b', '#1a1208', '#fff3c4'] : rar === 'SSR' ? ['#ffd36a', '#fff3c4', '#ff9f3a', '#ffffff'] : rar === 'SR' ? ['#c07bff', '#ff8be0', '#ffffff', '#7ab8ff'] : ['#59c1ff', '#ffffff', '#9fffe6'];
    const n = rar === 'R' ? 60 : rar === 'SR' ? 100 : 140;
    this.conf.count = n;
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const q = this.cp[i];
      q.p.set((Math.random() - 0.5) * 0.1, 0.12, (Math.random() - 0.5) * 0.1);
      q.v.set((Math.random() - 0.5) * 1.6, 1.2 + Math.random() * 1.6, (Math.random() - 0.5) * 1.2);
      q.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); q.w.set(Math.random() * 12, Math.random() * 12, Math.random() * 12);
      this.conf.setColorAt(i, c.set(cols[i % cols.length]).multiplyScalar(1.4));
    }
    this.conf.instanceColor.needsUpdate = true;
  }
  sparkle(n, R) {
    const col = new THREE.Color(R.glow);
    let k = 0;
    for (const s of this.sparks) {
      if (k >= n) break;
      if (s.life > 0) continue;
      s.p.set((Math.random() - 0.5) * 0.06, 0.1 + Math.random() * 0.1, (Math.random() - 0.5) * 0.06);
      const a = Math.random() * Math.PI * 2, sp = 0.3 + Math.random() * 1.3;
      s.v.set(Math.cos(a) * sp, (Math.random() - 0.2) * sp, Math.sin(a) * sp * 0.6);
      s.life = 0.8 + Math.random() * 1.4; s.c.copy(col).lerp(new THREE.Color('#ffffff'), Math.random() * 0.5).multiplyScalar(2);
      k++;
    }
  }
  // 隱藏版：先開出原本的，再「變身」
  upgrade() {
    this.phase = 'glitch'; this.pt = 0;
    this.g.snd.glitch();
  }
  finish() {
    // 收下
    this.g.snd.duck(1);
    this.g.nextReveal();
  }
  update(dt, t) {
    dt *= this.g.revealSpeed || 1;
    this.pt += dt;
    const P = this.g.R.post;
    const sh = this.shell;
    switch (this.phase) {
      case 'enter': {
        const k = Math.min(1, this.pt / 0.55);
        const y = this.sz / 2 + (0.9 - this.sz / 2) * (1 - k * k);
        sh.position.y = y;
        if (k >= 1) { this.phase = 'bounce'; this.pt = 0; this.g.snd.thump(10); this.g.ui.tapHint(true); }
        break;
      }
      case 'bounce': {
        const b = Math.abs(Math.sin(this.pt * 9)) * Math.exp(-this.pt * 6) * 0.05;
        sh.position.y = this.sz / 2 + b;
        if (this.pt > 0.6) { this.phase = 'idle'; this.pt = 0; }
        break;
      }
      case 'idle': {
        sh.rotation.z = Math.sin(t * 2.2) * 0.05; sh.rotation.y += dt * 0.6;
        if (this.cap) { this.cap.glow.material.opacity = (this.base === 'BLK' || this.base === 'SSR' ? 0.35 : 0.12) * (0.6 + 0.4 * Math.sin(t * 4)); this.cap.glow.material.color.copy(this.aura).multiplyScalar(1.4); }
        break;
      }
      case 'twist': {
        const k = Math.min(1, this.pt / this.twistLen);
        const long = this.twistLen > 1;
        sh.rotation.z = Math.sin(this.pt * (long ? 38 : 24)) * (long ? 0.06 + k * 0.08 : 0.05);
        if (this.cap) {
          this.cap.tg.rotation.y = k * Math.PI * 1.5;
          this.cap.glow.material.opacity = 0.2 + k * 0.7;
          // 長的演出：光一路升級顏色
          if (long) {
            const steps = ['#ffffff', '#59c1ff', '#b26bff', '#ffb81f'];
            const idx = Math.min(steps.length - 1, Math.floor(k * steps.length));
            this.cap.glow.material.color.set(steps[idx]).multiplyScalar(1.6);
            this.setRays(k * 0.3, steps[idx]);
          }
        } else if (this.boxObj) { sh.position.y = this.sz / 2 + Math.abs(Math.sin(this.pt * 20)) * 0.01 * k; }
        if (k >= 1) { if (this.info.upgraded) this.burst(PRIZE[this.info.item.prize].rarity, this.info.item.prize); else this.burst(this.final, this.info.pid); }
        break;
      }
      case 'burst': {
        const k = Math.min(1, this.pt / 0.7);
        if (this.cap && !this.capGone) {
          this.cap.tg.position.set(-0.22 * ease(k), 0.3 * ease(k), -0.2 * k); this.cap.tg.rotation.z = 2.2 * k;
          this.cap.bg.position.set(0.22 * ease(k), -0.02 * k, -0.2 * k); this.cap.bg.rotation.z = -1.4 * k;
          const sh = Math.max(0.001, 1 - ease(k));
          this.cap.tg.scale.setScalar(sh); this.cap.bg.scale.setScalar(sh);
          this.cap.glow.scale.setScalar(1 + k * 1.2); this.cap.glow.material.opacity = 0.8 * Math.pow(1 - k, 2);
          this.cap.tg.visible = this.cap.bg.visible = k < 0.98;
        } else if (this.boxObj && !this.capGone) { this.boxObj.g.scale.setScalar(Math.max(0.001, 1.6 * (1 - ease(k)))); this.boxObj.g.rotation.y = k * 3; }
        const ps = this.prizeScale * back(Math.min(1, this.pt / 0.55));
        setPrizeScale(this.prize, Math.max(0.001, ps));
        this.prize.g.position.y = 0.0 + 0.02 * ease(k);
        P.flash.w = this.flash * Math.max(0, 1 - this.pt / 0.35);
        this.setRays(this.raysTarget * ease(k), RARITY[this.shownRar].glow);
        if (k >= 1) {
          this.phase = 'show'; this.pt = 0;
          this.capGone = true;
          if (this.cap) { this.cap.tg.visible = this.cap.bg.visible = this.cap.glow.visible = false; }
          if (this.boxObj) this.boxObj.g.visible = false;
          if (this.info.upgraded && !this.didUp) this.upAt = 1.5;
        }
        break;
      }
      case 'show': {
        if (this.upAt && this.pt > this.upAt && !this.didUp) { this.didUp = true; this.upAt = 0; this.upgrade(); }
        break;
      }
      case 'glitch': {
        const k = Math.min(1, this.pt / 1.3);
        P.aberr = (1 - k) * 3 + Math.random() * 2 * (1 - k);
        P.flash.set(0, 0, 0, k < 0.75 ? 0.4 + Math.random() * 0.4 : 0.95);
        if (this.prize) this.prize.g.position.x = (Math.random() - 0.5) * 0.03 * (1 - k);
        if (k >= 1) {
          P.aberr = 0;
          if (this.prize) this.holder.remove(this.prize.g);
          this.burst('HID', this.info.pid);
        }
        break;
      }
    }
    if (this.prize && this.phase !== 'enter') {
      this.prize.g.rotation.y += dt * 0.6;
      this.prize.tick?.(t);
    }
    this.rays.rotation.z += dt * (this.final === 'HID' ? 0.5 : 0.25);
    this.rays.lookAt(this.camera.position);
    this.ring.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
    // 彩帶物理
    if (this.conf.count) {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < this.conf.count; i++) {
        const c = this.cp[i];
        c.v.y -= 2.4 * dt; c.v.multiplyScalar(1 - dt * 1.4);
        c.p.addScaledVector(c.v, dt);
        if (c.p.y < 0.002) { c.p.y = 0.002; c.v.set(0, 0, 0); } else { c.r.x += c.w.x * dt; c.r.y += c.w.y * dt; c.r.z += c.w.z * dt; }
        q.setFromEuler(c.r); m.compose(c.p, q, new THREE.Vector3(1, 1, 1));
        this.conf.setMatrixAt(i, m);
      }
      this.conf.instanceMatrix.needsUpdate = true;
    }
    const pa = this.spark.geometry.attributes.position, ca = this.spark.geometry.attributes.color;
    this.sparks.forEach((s, i) => {
      if (s.life > 0) { s.life -= dt; s.v.multiplyScalar(1 - dt * 1.8); s.v.y += 0.15 * dt; s.p.addScaledVector(s.v, dt); }
      const a = Math.max(0, Math.min(1, s.life));
      pa.setXYZ(i, s.p.x, s.life > 0 ? s.p.y : -9, s.p.z); ca.setXYZ(i, s.c.r * a, s.c.g * a, s.c.b * a);
    });
    pa.needsUpdate = true; ca.needsUpdate = true;
    if (this.phase === 'show' && Math.random() < dt * (this.final === 'N' ? 2 : 10)) this.sparkle(2, RARITY[this.final]);
    this.g.R.render(this.scene, this.camera, t);
  }
}
