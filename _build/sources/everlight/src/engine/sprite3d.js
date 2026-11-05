// 3D 場景中的像素立牌：自製著色器，吃附近燈光、會閃白、可翻面
import * as THREE from 'three';
import { sheet as makeSheet } from './pixel.js';

export const PPU = 32; // 每單位幾個像素
export const MAXL = 6;

// 燈光池：場景裡的燈很多，但每一格只啟用最靠近鏡頭焦點的幾盞
export class LightPool {
  constructor(scene) {
    this.lights = [];
    this.uPos = Array.from({ length: MAXL }, () => new THREE.Vector3(0, -100, 0));
    this.uCol = Array.from({ length: MAXL }, () => new THREE.Vector3());
    this.uRange = new Array(MAXL).fill(1);
    this.ambient = new THREE.Color(0.5, 0.5, 0.6);
    this.three = [];
    for (let i = 0; i < MAXL; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 6, 2);
      l.castShadow = false;
      scene.add(l); this.three.push(l);
    }
    this.sources = []; // {pos:Vector3, color:Color, intensity, range, flicker}
  }
  setSources(src) { this.sources = src; }
  update(focus, t) {
    const sorted = this.sources.filter((s) => s.on !== false).map((s) => ({ s, d: s.pos.distanceToSquared(focus) - (s.priority || 0) }))
      .sort((a, b) => a.d - b.d).slice(0, MAXL);
    for (let i = 0; i < MAXL; i++) {
      const L = this.three[i];
      const e = sorted[i];
      if (!e) { L.intensity = 0; this.uCol[i].set(0, 0, 0); this.uPos[i].set(0, -100, 0); continue; }
      const s = e.s;
      let k = 1;
      if (s.flicker) k = 0.86 + 0.14 * Math.sin(t * 9.1 + s.pos.x * 3) * Math.sin(t * 5.3 + s.pos.z);
      if (s.mul != null) k *= s.mul;
      L.position.copy(s.pos); L.color.copy(s.color); L.distance = s.range; L.intensity = s.intensity * k;
      this.uPos[i].copy(s.pos);
      this.uCol[i].set(s.color.r, s.color.g, s.color.b).multiplyScalar((s.spriteBoost ?? 1) * k * Math.min(1.6, s.intensity / 10));
      this.uRange[i] = s.range * 0.95;
    }
  }
}

const SV = `varying vec2 vUv; varying vec3 vW;
#include <fog_pars_vertex>
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const SF = `uniform sampler2D map; uniform vec4 frame; uniform float flip; uniform vec3 tint; uniform vec4 flash; uniform float opacity;
uniform vec3 ambient; uniform vec3 lPos[${MAXL}]; uniform vec3 lCol[${MAXL}]; uniform float lRange[${MAXL}]; uniform float emissive; uniform float silhouette;
varying vec2 vUv; varying vec3 vW;
#include <fog_pars_fragment>
void main(){
  vec2 uv = vec2(flip > 0.5 ? 1.0 - vUv.x : vUv.x, vUv.y);
  vec4 c = texture2D(map, frame.xy + uv * frame.zw);
  if (c.a < 0.5) discard;
  vec3 lit = ambient;
  for (int i = 0; i < ${MAXL}; i++) { float d = distance(vW, lPos[i]); float a = clamp(1.0 - d / lRange[i], 0.0, 1.0); lit += lCol[i] * a * a; }
  // 發光像素（燈籠、眼睛）：顏色很亮時不吃環境光
  float bright = smoothstep(0.82, 0.98, max(c.r, max(c.g, c.b))) * step(0.55, c.r) * emissive;
  vec3 col = c.rgb * mix(lit, vec3(2.4), bright) * tint;
  col = mix(col, vec3(0.02, 0.02, 0.05), silhouette);
  col = mix(col, flash.rgb, flash.a);
  gl_FragColor = vec4(col, opacity);
  #include <fog_fragment>
}`;

export class Sheet {
  constructor(frames, index, cols = 8) {
    const s = makeSheet(frames, cols);
    this.canvas = s.canvas; this.cols = s.cols; this.rows = s.rows; this.fw = s.fw; this.fh = s.fh; this.index = index;
    const t = new THREE.CanvasTexture(s.canvas);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
    this.tex = t;
  }
  frameRect(i) {
    const c = i % this.cols, r = Math.floor(i / this.cols);
    return [c / this.cols, 1 - (r + 1) / this.rows, 1 / this.cols, 1 / this.rows];
  }
}

export function spriteMaterial(sheet, pool) {
  const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  Object.assign(u, {
    map: { value: sheet.tex }, frame: { value: new THREE.Vector4(0, 0, 1, 1) }, flip: { value: 0 }, tint: { value: new THREE.Color(1, 1, 1) },
    flash: { value: new THREE.Vector4(1, 1, 1, 0) }, opacity: { value: 1 }, ambient: { value: pool.ambient },
    lPos: { value: pool.uPos }, lCol: { value: pool.uCol }, lRange: { value: pool.uRange }, emissive: { value: 1 }, silhouette: { value: 0 },
  });
  return new THREE.ShaderMaterial({ vertexShader: SV, fragmentShader: SF, uniforms: u, fog: true, transparent: false, side: THREE.DoubleSide });
}

let blobTex = null;
function blob() {
  if (blobTex) return blobTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.6, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  blobTex = new THREE.CanvasTexture(c);
  return blobTex;
}

// 一個立牌角色
export class Actor {
  constructor(sheet, pool, opts = {}) {
    this.sheet = sheet;
    const w = sheet.fw / PPU, h = sheet.fh / PPU;
    const geo = new THREE.PlaneGeometry(w, h);
    const baseline = opts.baseline ?? 3; // 腳底距離圖片底部幾像素
    geo.translate(0, h / 2 - baseline / PPU, 0);
    this.mat = spriteMaterial(sheet, pool);
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.renderOrder = 2;
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    this.scaleY = opts.scaleY ?? 1.12;
    this.mesh.scale.set(opts.scale ?? 1, (opts.scale ?? 1) * this.scaleY, 1);
    if (opts.shadow !== false) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blob(), transparent: true, depthWrite: false }));
      s.rotation.x = -Math.PI / 2; s.position.y = 0.02;
      const sw = opts.shadowSize ?? 0.9;
      s.scale.set(sw, sw * 0.55, 1);
      this.shadow = s; this.group.add(s);
    }
    this.frame = -1; this.setFrame(0);
    this.dir = 'down'; this.anim = 'idle'; this.t = Math.random() * 3; this.moving = false;
  }
  setFrame(i) {
    if (typeof i === 'string') i = this.sheet.index[i] ?? 0;
    if (i === this.frame) return;
    this.frame = i;
    const [u, v, du, dv] = this.sheet.frameRect(i);
    this.mat.uniforms.frame.value.set(u, v, du, dv);
  }
  set flip(f) { this.mat.uniforms.flip.value = f ? 1 : 0; }
  get position() { return this.group.position; }
  // 場景走路動畫：依方向與移動狀態挑影格
  updateField(dt, camYaw = 0) {
    this.t += dt;
    const view = this.dir === 'up' ? 'back' : this.dir === 'down' ? 'front' : 'side';
    this.flip = this.dir === 'right';
    const ix = this.sheet.index;
    if (this.moving && ix[`${view}_walk0`] != null) this.setFrame(`${view}_walk${Math.floor(this.t * 8) % 4}`);
    else if (ix[`${view}_idle0`] != null) this.setFrame(`${view}_idle${Math.floor(this.t * 1.6) % 2}`);
    this.mesh.rotation.y = camYaw;
  }
}
