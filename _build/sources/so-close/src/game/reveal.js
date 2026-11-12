// 開蛋／拆盲盒／開寶箱的演出：外殼 →（蛋中蛋）→ 公仔 →（變異／隱藏版）→ 證書卡
import * as THREE from 'three';
import { tex } from '../engine/tex.js';
import { buildItem, setPrizeScale, buildBlindBox, buildFoilBag, buildChest, capsuleGeos, capMats, bundleGeos, bundleMats, glowMats, CAPSULE_COLORS, N_COLORS } from './models.js';
import { mixVersion } from './figures.js';
import { RARITY, VERSIONS, BOX_SIZE, OLD_PRIZE, parseKey } from './data.js';

const ease = (x) => 1 - Math.pow(1 - x, 3);
const back = (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const smooth = (x) => x * x * (3 - 2 * x);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const tierOfKey = (key) => { const k = parseKey(key); return k ? k.c.tier : OLD_PRIZE[key]?.rarity || 'N'; };

export class RevealStage {
  constructor(game) {
    this.g = game;
    const s = new THREE.Scene();
    this.scene = s;
    s.environment = game.scene.environment;
    s.environmentIntensity = 0.65;
    s.background = new THREE.Color('#030307');
    const bgm = new THREE.MeshBasicMaterial({ map: tex.dot(), color: new THREE.Color('#2a3a8a').multiplyScalar(0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.bgGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), bgm); this.bgGlow.position.set(0, 0.3, -1.4); s.add(this.bgGlow);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.01, 20);
    this.hemi = new THREE.HemisphereLight('#c8d4ff', '#120c08', 0.6); s.add(this.hemi);
    this.key = new THREE.DirectionalLight('#ffffff', 1.9); this.key.position.set(0.3, 1.2, 0.8); s.add(this.key);
    this.rimLight = new THREE.DirectionalLight('#9fd8ff', 1.1); this.rimLight.position.set(-0.8, 0.5, -0.8); s.add(this.rimLight);
    this.spot = new THREE.SpotLight('#ffffff', 3.4, 3, 0.45, 0.7, 1); this.spot.position.set(0.1, 1.3, 0.6); this.spot.target.position.set(0, 0.1, 0); s.add(this.spot, this.spot.target);
    this.lightBase = { hemi: 0.6, key: 1.9, rim: 1.1, spot: 3.4 };
    const fl = document.createElement('canvas'); fl.width = fl.height = 256;
    { const g = fl.getContext('2d'); const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, '#20232e'); r.addColorStop(0.35, '#0c0d14'); r.addColorStop(1, '#030307'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); }
    const ft = new THREE.CanvasTexture(fl); ft.colorSpace = THREE.SRGBColorSpace;
    this.floor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshBasicMaterial({ map: ft }));
    this.floor.rotation.x = -Math.PI / 2; s.add(this.floor);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.156, 96), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.002; s.add(this.ring);
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), new THREE.MeshBasicMaterial({ map: tex.dot(), color: '#ffffff', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.pool.rotation.x = -Math.PI / 2; this.pool.position.y = 0.003; s.add(this.pool);
    const rayTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); const lg = g.createLinearGradient(0, 256, 0, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.22, 'rgba(255,255,255,.9)'); lg.addColorStop(0.55, 'rgba(255,255,255,.35)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.beginPath(); g.moveTo(28, 256); g.lineTo(36, 256); g.lineTo(64, 0); g.lineTo(0, 0); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    this.rays = new THREE.Group(); this.rays.position.set(0, 0.17, -0.45); s.add(this.rays);
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 1.6), new THREE.MeshBasicMaterial({ map: rayTex, color: '#ffffff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.geometry.translate(0, 0.8, 0); m.rotation.z = (i / 14) * Math.PI * 2; this.rays.add(m);
    }
    // 金色底座（升到 ★★★ 的公仔）
    this.pedestal = new THREE.Group(); s.add(this.pedestal);
    this.pedestal.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.012, 64), new THREE.MeshStandardMaterial({ color: '#ffcf6a', metalness: 1, roughness: 0.2 })));
    this.pedestal.position.y = -0.006; this.pedestal.visible = false;
    const n = 140;
    this.conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.012, 0.02), new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }), n);
    this.conf.count = 0; this.conf.frustumCulled = false; s.add(this.conf);
    this.cp = Array.from({ length: n }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3() }));
    const sp = new Float32Array(300 * 3), sc = new Float32Array(300 * 3);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    this.spark = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.02, map: tex.dot(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.spark.frustumCulled = false; s.add(this.spark);
    this.sparks = Array.from({ length: 300 }, () => ({ p: new THREE.Vector3(0, -9, 0), v: new THREE.Vector3(), life: 0, c: new THREE.Color(), orbit: 0 }));
    this.holder = new THREE.Group(); s.add(this.holder);
    this.geos = capsuleGeos();
    this.bund = bundleGeos();
  }

  clear() {
    this.holder.clear();
    this.prize = null; this.shell = null; this.cap = null; this.box = null; this.chest = null;
    this.conf.count = 0;
    for (const p of this.sparks) p.life = 0;
    this.pedestal.visible = false;
  }
  setLights(k) {
    const B = this.lightBase;
    this.hemi.intensity = B.hemi * k; this.key.intensity = B.key * k; this.rimLight.intensity = B.rim * (0.4 + 0.6 * k); this.spot.intensity = B.spot * k;
  }
  play(info) {
    this.info = info;
    this.clear();
    this.innerDone = false; this.didMorph = false; this.didGlitch = false; this.final = false; this.dim = 0; this.shellGone = false; this.morphHit = false;
    const R = this.g.R;
    if (this.th0 == null) this.th0 = R.post.threshold;
    R.post.threshold = 1.6;
    this.setLights(1);
    this.finalTier = tierOfKey(info.key);
    this.longOpen = ['SSR', 'HID'].includes(this.finalTier) || info.tier === 'BLK' || info.glow || !!info.inner;
    this.makeShell(info.shell, info.tier);
    this.phase = 'enter'; this.pt = 0;
    this.ring.material.color.set('#ffffff'); this.pool.material.color.set('#8090c0'); this.bgGlow.material.color.set('#2a3a8a').multiplyScalar(0.4);
    this.setRays(0, '#ffffff');
    R.post.flash.set(1, 1, 1, 0);
    this.g.ui.openReveal(info);
    this.g.snd.duck(0.25);
    this.resize();
  }
  makeShell(kind, tier) {
    const shell = new THREE.Group(); this.holder.add(shell); this.shell = shell;
    const info = this.info, e = info.entry || {};
    this.kind = kind;
    if (kind === 'box') {
      const size = e.size || BOX_SIZE[tier] || BOX_SIZE.R;
      const k = 0.22 / size.sy;
      const b = buildBlindBox(tier, size, { openable: true, glow: info.glow });
      b.g.scale.setScalar(k); shell.add(b.g);
      const bag = buildFoilBag(info.glow ? '#fff0a8' : '#ffb8de');
      bag.g.scale.setScalar(1.9); bag.g.position.y = 0.0; bag.g.visible = false; shell.add(bag.g);
      this.box = { ...b, bag, k, sy: size.sy * k };
      this.sz = size.sy * k;
      shell.userData.base = this.sz / 2;
      b.g.position.y = 0;
    } else if (kind === 'chest') {
      const c = buildChest();
      c.g.scale.setScalar(1.7); shell.add(c.g);
      this.chest = c;
      this.sz = c.H * 1.7;
      shell.userData.base = 0;
    } else {
      const r = kind === 'inner' ? 0.07 : 0.085;
      const black = tier === 'BLK';
      const glow = info.glow && kind !== 'inner';
      const colr = tier === 'N' ? N_COLORS[(e.uid || 0) % N_COLORS.length] : CAPSULE_COLORS[tier] || '#ffffff';
      const top = new THREE.Mesh(this.geos.top, black ? capMats.blackTop() : glow ? glowMats.top() : capMats.top());
      const botMat = black ? capMats.blackBot() : glow ? glowMats.bot() : new THREE.MeshPhysicalMaterial({ color: colr, metalness: 0.15, roughness: 0.2, clearcoat: 1, envMapIntensity: 1.4 });
      const bot = new THREE.Mesh(this.geos.bot, botMat);
      const seam = new THREE.Mesh(this.geos.seam, black ? capMats.blackSeam() : glow ? glowMats.seam() : capMats.seam());
      const tg = new THREE.Group(), bg = new THREE.Group();
      tg.add(top); bg.add(bot, seam);
      for (const m of [top, bot, seam]) m.scale.setScalar(r);
      if (!black) { const f = new THREE.Mesh(this.bund.foil, bundleMats.foil()), p = new THREE.Mesh(this.bund.paper, bundleMats.paper()); f.scale.setScalar(r); p.scale.setScalar(r); bg.add(f, p); }
      shell.add(tg, bg);
      const glowS = new THREE.Mesh(new THREE.SphereGeometry(r * 0.6, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(black ? '#ffb030' : '#ffffff').multiplyScalar(1.4), transparent: true, opacity: 0.0, depthWrite: false }));
      shell.add(glowS);
      this.cap = { tg, bg, glow: glowS, r, botMat, glowShell: glow };
      this.sz = r * 2;
      shell.userData.base = r;
    }
    shell.position.set(0, 0.9, 0);
    const auraTier = tier === 'BLK' ? 'SSR' : tier;
    this.aura = new THREE.Color(tier === 'BLK' ? '#ffb030' : (RARITY[auraTier] || RARITY.N).glow);
  }
  resize() {
    const R = this.g.R;
    this.camera.aspect = R.w / R.h;
    const portrait = this.camera.aspect < 1;
    this.camera.fov = portrait ? 46 : 30;
    const d = portrait ? 0.34 / Math.tan((this.camera.fov / 2) * Math.PI / 180) / Math.max(0.42, this.camera.aspect * 1.25) : 0.86;
    this.camera.position.set(0, 0.2 + d * 0.12, d);
    this.camera.lookAt(0, 0.13, 0);
    this.camera.setViewOffset(R.w, R.h, 0, portrait ? R.h * 0.17 : R.h * 0.1, R.w, R.h);
    this.camera.updateProjectionMatrix();
  }
  setRays(op, col) { this.rays.children.forEach((m) => { m.material.opacity = op; m.material.color.set(col).multiplyScalar(1.4); }); }
  hint() {
    const k = this.kind;
    return k === 'box' ? (this.phase === 'bag' ? '點一下撕開' : '點一下拆盒') : k === 'chest' ? '點一下打開寶箱' : k === 'inner' ? '裡面還有一顆！點一下' : '點一下打開';
  }
  // 點擊：推進到下一步
  tap() {
    if (this.phase === 'enter' || this.phase === 'bounce') { this.shell.position.y = this.shell.userData.base; this.phase = 'idle'; this.pt = 0; this.g.ui.tapHint(true, this.hint()); return true; }
    if (this.phase === 'idle') {
      const S = this.g.snd;
      if (this.kind === 'box') { this.phase = 'unbox'; this.pt = 0; S.boxOpen(); setTimeout(() => S.crinkle(), 450); }
      else if (this.kind === 'chest') { this.phase = 'unlock'; this.pt = 0; S.chest(); }
      else {
        this.phase = 'twist'; this.pt = 0; this.twistLen = this.longOpen ? (this.kind === 'inner' ? 1.2 : 1.7) : 0.75;
        S.twist();
        if (this.twistLen > 1) { S.rise(this.twistLen); S.rumble(this.twistLen, 0.12); }
      }
      this.g.ui.tapHint(false);
      return true;
    }
    if (this.phase === 'bag') { this.phase = 'tear'; this.pt = 0; this.g.snd.tear(); this.g.ui.tapHint(false); return true; }
    return false;
  }
  // 打開：外殼飛開；有蛋中蛋就先換成內層，沒有就出現公仔
  burst() {
    this.phase = 'burst'; this.pt = 0;
    const info = this.info;
    if (info.inner && !this.innerDone) { this.pendingInner = true; this.g.snd.egg(); this.g.ui.revealBanner('蛋中蛋！', 'gold'); this.prize = null; this.flash = 0.4; this.g.R.post.flash.set(1, 0.9, 0.6, 0.4); return; }
    this.pendingInner = false;
    const key = info.from || info.key;
    const rar = tierOfKey(key);
    this.spawnPrize(key, rar);
    this.g.ui.showCard(info, !info.morph && !info.glitch);
    if (!info.morph && !info.glitch) this.onFinal();
  }
  spawnPrize(key, rar) {
    this.shownRar = rar;
    const R = RARITY[rar] || RARITY.N;
    const col = new THREE.Color(R.glow);
    this.g.snd.pop();
    this.g.snd.reveal(rar);
    this.g.R.post.flash.set(col.r, col.g, col.b, rar === 'N' ? 0.35 : 0.8);
    this.flash = rar === 'N' ? 0.35 : 0.8;
    const p = buildItem(key);
    p.g.scale.setScalar(0.001); p.g.position.set(0, 0, 0);
    this.holder.add(p.g); this.prize = p; this.prizeScale = 2.7;
    this.raysTarget = rar === 'N' ? 0.08 : rar === 'R' ? 0.16 : rar === 'SR' ? 0.26 : 0.38;
    this.rimLight.color.set(R.glow);
    this.ring.material.color.set(R.glow).multiplyScalar(1.6);
    this.pool.material.color.set(R.glow).multiplyScalar(0.8);
    this.bgGlow.material.color.set(R.glow).multiplyScalar(rar === 'N' ? 0.2 : 0.45);
    if (rar !== 'N') this.confetti(rar);
    this.sparkle(rar === 'N' ? 30 : rar === 'R' ? 70 : rar === 'SR' ? 140 : 260, R.glow);
  }
  onFinal() {
    this.final = true;
    const G = this.info.grant || {};
    if (G.starUp >= 3) this.pedestal.visible = true;
    if (G.starUp) setTimeout(() => this.g.snd.starUp(G.starUp), 700);
  }
  spawnInner() {
    for (const o of [this.cap?.tg, this.cap?.bg, this.cap?.glow]) if (o) o.visible = false;
    this.innerDone = true;
    this.makeShell('inner', this.info.inner);
    this.shell.position.y = 0.32;
    this.longOpen = true;
    this.phase = 'enter'; this.pt = 0;
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
  sparkle(n, glow, orbit = 0) {
    const col = new THREE.Color(glow);
    let k = 0;
    for (const s of this.sparks) {
      if (k >= n) break;
      if (s.life > 0) continue;
      s.orbit = orbit;
      if (orbit) { const a = Math.random() * Math.PI * 2, r = 0.16 + Math.random() * 0.12; s.p.set(Math.cos(a) * r, 0.04 + Math.random() * 0.3, Math.sin(a) * r); s.v.set(0, 0, 0); s.life = 0.9 + Math.random() * 0.5; }
      else { s.p.set((Math.random() - 0.5) * 0.06, 0.1 + Math.random() * 0.1, (Math.random() - 0.5) * 0.06); const a = Math.random() * Math.PI * 2, sp = 0.3 + Math.random() * 1.3; s.v.set(Math.cos(a) * sp, (Math.random() - 0.2) * sp, Math.sin(a) * sp * 0.6); s.life = 0.8 + Math.random() * 1.4; }
      s.c.copy(col).lerp(new THREE.Color('#ffffff'), Math.random() * 0.5).multiplyScalar(2);
      k++;
    }
  }
  finish() {
    this.g.snd.duck(1);
    this.g.R.post.threshold = this.th0 ?? 1.15;
    this.g.R.post.aberr = 0;
    this.setLights(1);
    this.g.nextReveal();
  }
  update(dt, t) {
    dt *= this.g.revealSpeed || 1;
    this.pt += dt;
    const P = this.g.R.post, sh = this.shell, info = this.info;
    switch (this.phase) {
      case 'enter': {
        const from = this.kind === 'inner' ? 0.32 : 0.9;
        const k = Math.min(1, this.pt / (this.kind === 'inner' ? 0.4 : 0.55));
        sh.position.y = sh.userData.base + (from - sh.userData.base) * (1 - k * k);
        if (k >= 1) { this.phase = 'bounce'; this.pt = 0; this.g.snd.thump(10); this.g.ui.tapHint(true, this.hint()); }
        break;
      }
      case 'bounce': {
        const b = Math.abs(Math.sin(this.pt * 9)) * Math.exp(-this.pt * 6) * 0.05;
        sh.position.y = sh.userData.base + b;
        if (this.pt > 0.6) { this.phase = 'idle'; this.pt = 0; }
        break;
      }
      case 'idle': {
        sh.rotation.z = Math.sin(t * 2.2) * 0.05; sh.rotation.y += dt * (this.kind === 'box' || this.kind === 'chest' ? 0.35 : 0.6);
        if (this.cap) { this.cap.glow.material.opacity = (this.longOpen ? 0.35 : 0.12) * (0.6 + 0.4 * Math.sin(t * 4)); this.cap.glow.material.color.copy(this.aura).multiplyScalar(1.4); }
        if (this.chest) { this.chest.lid.rotation.x = -Math.abs(Math.sin(t * 3)) * 0.04; }
        break;
      }
      case 'twist': {
        const k = Math.min(1, this.pt / this.twistLen), long = this.twistLen > 1;
        sh.rotation.z = Math.sin(this.pt * (long ? 38 : 24)) * (long ? 0.06 + k * 0.08 : 0.05);
        this.cap.tg.rotation.y = k * Math.PI * 1.5;
        this.cap.glow.material.opacity = 0.2 + k * 0.7;
        if (long) {
          const steps = ['#ffffff', '#59c1ff', '#b26bff', '#ffb81f'];
          const idx = Math.min(steps.length - 1, Math.floor(k * steps.length));
          this.cap.glow.material.color.set(steps[idx]).multiplyScalar(1.6);
          this.setRays(k * 0.3, steps[idx]);
        }
        if (k >= 1) this.burst();
        break;
      }
      case 'unbox': {
        // 掀蓋 → 錫箔袋升起 → 盒子退下 → 袋子落到中間
        const B = this.box, up = B.sy * 1.15, rest = B.sy * 0.4;
        const k1 = clamp01(this.pt / 0.45), k2 = clamp01((this.pt - 0.35) / 0.6), k3 = clamp01((this.pt - 0.8) / 0.4), k4 = clamp01((this.pt - 1.05) / 0.4);
        sh.rotation.y += (0 - sh.rotation.y) * Math.min(1, dt * 8); sh.rotation.z *= 0.8;
        B.lid.rotation.x = -2.1 * ease(k1);
        B.bag.g.visible = this.pt > 0.3;
        B.bag.g.position.y = ease(k2) * up - smooth(k4) * (up - rest);
        B.bag.g.rotation.y = Math.sin(this.pt * 3) * 0.2;
        B.g.position.y = -ease(k3) * B.sy * 1.25;
        if (this.pt > 1.5) { B.g.visible = false; this.phase = 'bag'; this.pt = 0; this.g.ui.tapHint(true, this.hint()); }
        break;
      }
      case 'bag': {
        const B = this.box;
        B.bag.g.rotation.y = Math.sin(t * 1.4) * 0.35; B.bag.g.position.y = B.sy * 0.4 + Math.sin(t * 2.2) * 0.006;
        break;
      }
      case 'tear': {
        const B = this.box, k = clamp01(this.pt / 0.35);
        B.bag.top.position.set(-0.04 * ease(k), B.bag.h / 2 - 0.004 + 0.06 * ease(k), 0); B.bag.top.rotation.z = 1.2 * k;
        B.bag.g.position.x = Math.sin(this.pt * 60) * 0.004 * (1 - k);
        if (k >= 1) this.burst();
        break;
      }
      case 'unlock': {
        const C = this.chest, k = this.pt;
        sh.rotation.y += (0 - sh.rotation.y) * Math.min(1, dt * 6);
        sh.position.x = k < 0.35 ? Math.sin(k * 70) * 0.006 : 0;
        const ko = clamp01((k - 0.35) / 0.6);
        C.lid.rotation.x = -1.95 * ease(ko);
        C.glowIn.material.opacity = ko;
        this.setRays(0.32 * ko, '#ffd36a');
        if (k > 0.5 && Math.random() < dt * 30) this.sparkle(3, '#ffd36a');
        if (k >= 1.15) this.burst();
        break;
      }
      case 'burst': {
        const k = Math.min(1, this.pt / 0.7);
        if (this.cap && !this.shellGone) {
          this.cap.tg.position.set(-0.22 * ease(k), 0.3 * ease(k), -0.2 * k); this.cap.tg.rotation.z = 2.2 * k;
          this.cap.bg.position.set(0.22 * ease(k), -0.02 * k, -0.2 * k); this.cap.bg.rotation.z = -1.4 * k;
          const s2 = Math.max(0.001, 1 - ease(k));
          this.cap.tg.scale.setScalar(s2); this.cap.bg.scale.setScalar(s2);
          this.cap.glow.scale.setScalar(1 + k * 1.2); this.cap.glow.material.opacity = 0.8 * Math.pow(1 - k, 2);
          this.cap.tg.visible = this.cap.bg.visible = k < 0.98;
        }
        if (this.box && !this.shellGone) { const B = this.box; B.bag.g.position.y = B.sy * 0.4 - ease(k) * B.sy * 0.5; B.bag.g.scale.setScalar(Math.max(0.001, 1.9 * (1 - ease(k)))); B.bag.top.position.y += dt * 0.3; }
        if (this.chest && !this.shellGone) { this.chest.g.position.y = -ease(k) * 0.05; }
        if (this.prize) {
          const ps = this.prizeScale * back(Math.min(1, this.pt / 0.55));
          setPrizeScale(this.prize, Math.max(0.001, ps));
          this.prize.g.position.y = (this.chest ? 0.05 * (1 - ease(k)) : 0) + 0.02 * ease(k);
          this.setRays(this.raysTarget * ease(k), RARITY[this.shownRar].glow);
        }
        P.flash.w = this.flash * Math.max(0, 1 - this.pt / 0.35);
        if (k >= 1) {
          if (this.pendingInner) { this.spawnInner(); break; }
          if (this.box) this.box.bag.g.visible = false;
          if (this.chest) this.chest.g.visible = false;
          if (this.cap) { this.cap.tg.visible = this.cap.bg.visible = this.cap.glow.visible = false; }
          this.shellGone = true;
          this.phase = 'show'; this.pt = 0;
        }
        break;
      }
      case 'show': {
        if (info.morph && !this.didMorph && this.pt > 0.85) { this.didMorph = true; this.phase = 'morph'; this.pt = 0; this.g.snd.morph(info.morph); if (info.morph === 'g') setTimeout(() => this.g.snd.dim(), 250); }
        else if (info.glitch && !this.didGlitch && this.pt > 1.4) { this.didGlitch = true; this.phase = 'glitch'; this.pt = 0; this.g.snd.glitch(); }
        break;
      }
      case 'morph': {
        const k = clamp01(this.pt / 1.5), v = info.morph;
        if (this.pt < 0.6 && Math.random() < dt * 60) this.sparkle(4, VERSIONS[v].color, 1);
        const km = smooth(clamp01((this.pt - 0.35) / 0.7));
        mixVersion(this.prize, 'n', v, km);
        if (v === 'g') { this.dim = km; this.setLights(1 - 0.72 * km); P.threshold = 1.6 - 0.45 * km; this.bgGlow.material.color.set('#0a1a3a').multiplyScalar(0.3); this.setRays(this.raysTarget * (1 - 0.75 * km), RARITY[this.shownRar].glow); }
        this.prize.g.rotation.y += dt * (2 + 6 * Math.sin(Math.PI * clamp01(this.pt / 1.2)));
        if (this.pt > 1.05 && !this.morphHit) {
          this.morphHit = true;
          const col = new THREE.Color(VERSIONS[v].color);
          P.flash.set(col.r, col.g, col.b, 0.6); this.flash = 0.6; this.flashT = 0;
          this.g.snd.morphHit(v);
          this.g.ui.revealBanner(v === 'g' ? '夜光版！' : '變異！異色版', v === 'g' ? 'glow' : 'alt');
          this.sparkle(160, VERSIONS[v].color);
          this.ring.material.color.set(VERSIONS[v].color).multiplyScalar(1.6);
        }
        if (this.morphHit) { this.flashT = (this.flashT || 0) + dt; P.flash.w = 0.6 * Math.max(0, 1 - this.flashT / 0.45); }
        if (k >= 1) { this.morphHit = false; this.phase = 'show'; this.pt = 0; this.g.ui.showCard(info, true); this.onFinal(); }
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
          this.spawnPrize(info.key, 'HID');
          this.phase = 'burst'; this.pt = 0; this.pendingInner = false;
          this.g.ui.revealBanner('隱藏版！', 'hid');
          this.g.ui.showCard(info, true);
          this.onFinal();
        }
        break;
      }
    }
    if (this.prize && this.phase !== 'enter') {
      this.prize.g.rotation.y += dt * 0.6;
      if (this.final && info.grant?.starUp) this.prize.act?.(t); else this.prize.tick?.(t);
    }
    this.pedestal.rotation.y += dt * 0.3;
    this.rays.rotation.z += dt * (this.finalTier === 'HID' ? 0.5 : 0.25);
    this.rays.lookAt(this.camera.position);
    this.ring.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
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
      if (s.life > 0) {
        s.life -= dt;
        if (s.orbit) { const a = Math.atan2(s.p.z, s.p.x) + dt * 4, r = Math.hypot(s.p.x, s.p.z) * (1 - dt * 1.6); s.p.x = Math.cos(a) * r; s.p.z = Math.sin(a) * r; s.p.y += (0.14 - s.p.y) * dt * 2; }
        else { s.v.multiplyScalar(1 - dt * 1.8); s.v.y += 0.15 * dt; s.p.addScaledVector(s.v, dt); }
      }
      const a = Math.max(0, Math.min(1, s.life));
      pa.setXYZ(i, s.p.x, s.life > 0 ? s.p.y : -9, s.p.z); ca.setXYZ(i, s.c.r * a, s.c.g * a, s.c.b * a);
    });
    pa.needsUpdate = true; ca.needsUpdate = true;
    if (this.phase === 'show' && Math.random() < dt * (this.shownRar === 'N' ? 2 : 10)) this.sparkle(2, (RARITY[this.shownRar] || RARITY.N).glow);
    this.g.R.render(this.scene, this.camera, t);
  }
}
