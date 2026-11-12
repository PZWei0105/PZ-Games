// 陳列櫃：3D 展示台＋縮圖產生器
import * as THREE from 'three';
import { makeEnv } from '../engine/env.js';
import { tex } from '../engine/tex.js';
import { buildItem, setPrizeScale, M } from './models.js';
import { RARITY, OLD_PRIZE, parseKey } from './data.js';

export class Showcase {
  constructor(game) {
    this.g = game;
    const s = new THREE.Scene();
    this.scene = s;
    s.environment = game.scene.environment;
    s.environmentIntensity = 0.8;
    s.background = new THREE.Color('#06070d');
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
    s.add(new THREE.HemisphereLight('#d0dcff', '#140e0a', 0.55));
    const key = new THREE.SpotLight('#ffffff', 4.2, 3, 0.5, 0.6, 1.2); key.position.set(0.25, 1.1, 0.5); key.target.position.set(0, 0.05, 0); s.add(key, key.target);
    this.rim = new THREE.DirectionalLight('#9fd8ff', 1.2); this.rim.position.set(-0.6, 0.4, -0.7); s.add(this.rim);
    this.pedMat = new THREE.MeshPhysicalMaterial({ color: '#0c0d14', metalness: 0.6, roughness: 0.3, clearcoat: 1 });
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.05, 64), this.pedMat);
    ped.position.y = -0.025; s.add(ped);
    this.pedRing = new THREE.Mesh(new THREE.TorusGeometry(0.111, 0.0025, 8, 96), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    this.pedRing.rotation.x = Math.PI / 2; s.add(this.pedRing);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: tex.dot(), color: '#ffffff', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.set(0, 0.16, -0.3); s.add(halo); this.halo = halo;
    this.holder = new THREE.Group(); s.add(this.holder);
    this.active = false;
    this.spin = 0; this.vel = 0.5;
  }
  // key：收藏的鍵；star：星級（★★ 專屬動作、★★★ 金色底座）
  open(key, star = 1) {
    this.holder.clear();
    this.item = buildItem(key);
    setPrizeScale(this.item, 2.1);
    this.holder.add(this.item.g);
    const k = parseKey(key);
    const tier = k ? k.c.tier : OLD_PRIZE[key]?.rarity || 'N';
    const col = RARITY[tier].glow;
    this.star = star;
    this.pedMat.color.set(star >= 3 ? '#ffcf6a' : '#0c0d14'); this.pedMat.metalness = star >= 3 ? 1 : 0.6; this.pedMat.roughness = star >= 3 ? 0.18 : 0.3;
    this.pedRing.material.color.set(star >= 3 ? '#ffd36a' : col).multiplyScalar(1.6);
    this.halo.material.color.set(col);
    this.rim.color.set(col);
    this.active = true;
    this.vel = 0.5;
    if (this.th0 == null) this.th0 = this.g.R.post.threshold;
    this.g.R.post.threshold = k && k.v === 'g' ? 1.25 : 1.6;
    this.resize();
  }
  close() { this.active = false; this.holder.clear(); if (this.th0 != null) this.g.R.post.threshold = this.th0; }
  drag(dx) { this.vel = dx * 0.02; this.spin += dx * 0.012; }
  resize() {
    const R = this.g.R;
    this.camera.aspect = R.w / R.h;
    const portrait = this.camera.aspect < 1;
    this.camera.fov = portrait ? 34 : 26;
    this.camera.position.set(0, 0.2, portrait ? 0.92 : 0.8);
    this.camera.lookAt(0, 0.12, 0);
    this.camera.updateProjectionMatrix();
    // 模型放在畫面上半部
    const off = portrait ? R.h * 0.2 : 0;
    this.camera.setViewOffset(R.w, R.h, portrait ? 0 : -R.w * 0.2, off, R.w, R.h);
  }
  update(dt, t) {
    this.spin += this.vel * dt; this.vel += (0.5 - this.vel) * Math.min(1, dt * 1.5);
    this.holder.rotation.y = this.spin;
    if (this.star >= 2 && this.item?.act) this.item.act(t); else this.item?.tick?.(t);
    this.g.R.render(this.scene, this.camera, t);
  }
}

// 縮圖（另一個小畫布，產完就保留在記憶體）
let tr = null;
const cache = new Map();
function thumbRig() {
  if (tr) return tr;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(200, 200, false);
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
  const s = new THREE.Scene();
  s.environment = makeEnv(r); s.environmentIntensity = 0.75;
  s.add(new THREE.HemisphereLight('#d0dcff', '#140e0a', 0.7));
  const d = new THREE.DirectionalLight('#ffffff', 1.6); d.position.set(0.4, 1, 0.8); s.add(d);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.01, 10);
  cam.position.set(0, 0.13, 0.37); cam.lookAt(0, 0.058, 0);
  tr = { r, s, cam, sil: new THREE.MeshBasicMaterial({ color: '#232838' }) };
  return tr;
}
export function thumb(key, silhouette) {
  const ck = key + (silhouette ? ':s' : '');
  if (cache.has(ck)) return cache.get(ck);
  const T = thumbRig();
  const b = buildItem(key, { mini: false });
  const fig = !!parseKey(key);
  b.g.rotation.y = fig ? -0.25 : -0.45;
  b.tick?.(2.5);
  if (silhouette) b.g.traverse((o) => { if (o.isPoints || o.isSprite) o.visible = false; if (o.isMesh) o.material = T.sil; });
  T.s.add(b.g);
  T.r.setClearColor(0x000000, 0);
  T.r.render(T.s, T.cam);
  const url = T.r.domElement.toDataURL('image/png');
  T.s.remove(b.g);
  cache.set(ck, url);
  return url;
}
