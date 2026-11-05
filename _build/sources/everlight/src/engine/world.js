// 地圖建構：地形、海水、建築、道具、燈光、碰撞
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildAtlas, facade, tileCanvas, TS } from './textures.js';
import { Sheet, spriteMaterial, PPU, MAXL } from './sprite3d.js';
import { treePix, tuftPix, flamePix, logsPix } from './propsArt.js';
import { Pix, rng } from './pixel.js';

let ATLAS = null;
export function atlas() {
  if (ATLAS) return ATLAS;
  const a = buildAtlas();
  const t = new THREE.CanvasTexture(a.canvas);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  ATLAS = { tex: t, uv: a.uv, canvas: a.canvas };
  return ATLAS;
}
const repTex = {};
export function repeatTex(name) {
  if (repTex[name]) return repTex[name];
  const t = new THREE.CanvasTexture(tileCanvas(name, 1, 1));
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  repTex[name] = t; return t;
}
function canvasTex(cv) {
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 地面種類：頂面用哪些材質、側面用哪些
export const GROUND = {
  grass: { top: ['grass', 'grass2', 'grass', 'grass2', 'flowers'], side: 'cliff', sideTop: 'clifftop', rot: true },
  meadow: { top: ['grass', 'flowers', 'grass2'], side: 'cliff', sideTop: 'clifftop', rot: true },
  dirt: { top: ['dirt'], side: 'cliff', sideTop: 'cliff', rot: true },
  sand: { top: ['sand'], side: 'sand', sideTop: 'sand', rot: false },
  wetsand: { top: ['wetsand'], side: 'wetsand', sideTop: 'wetsand', rot: false },
  cobble: { top: ['cobble', 'cobble2'], side: 'ruinwall2', sideTop: 'ruinwall2', rot: true },
  slab: { top: ['slab', 'slab', 'slabmoss'], side: 'ruinwall', sideTop: 'ruinwall', rot: false },
  slabdark: { top: ['slabdark', 'slabmoss'], side: 'ruinwall2', sideTop: 'ruinwall2', rot: false },
  planks: { top: ['planks'], side: 'planks2', sideTop: 'planks2', rot: false },
  rock: { top: ['darkrock'], side: 'darkrock', sideTop: 'darkrock', rot: true },
  cliff: { top: ['grass', 'grass2'], side: 'cliff', sideTop: 'clifftop', rot: true },
  kelp: { top: ['kelp', 'wetsand'], side: 'darkrock', sideTop: 'kelp', rot: true },
  rug: { top: ['rug'], side: 'planks2', sideTop: 'planks2', rot: false },
  quay: { top: ['cobble', 'cobble2', 'cobble'], side: 'brick', sideTop: 'brick', rot: true },
  wall: { top: ['slabdark', 'slabmoss'], side: 'ruinwall', sideTop: 'ruinwall2', rot: false },
  hill: { top: ['grass', 'grass2', 'grass'], side: 'cliff', sideTop: 'clifftop', rot: true },
};

// ------- 水面著色器 -------
const WATER_V = `varying vec3 vW;
#include <fog_pars_vertex>
void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const WATER_F = `uniform float time; uniform sampler2D landTex; uniform vec4 rect; uniform vec3 deep; uniform vec3 shallow; uniform vec3 foam;
uniform vec3 lPos[${MAXL}]; uniform vec3 lCol[${MAXL}]; uniform float lRange[${MAXL}]; uniform vec3 skyRefl; uniform float beamA; uniform vec2 beamDir; uniform vec2 beamOrigin; uniform float glow;
varying vec3 vW;
#include <fog_pars_fragment>
void main(){
  vec2 p = floor(vW.xz * 16.0) / 16.0;
  vec2 luv = (p - rect.xy) / rect.zw;
  float land = texture2D(landTex, luv).r;
  float w1 = sin(p.x * 1.6 + time * 0.8 + sin(p.y * 0.55 + time * 0.35) * 1.6);
  float w2 = sin(p.y * 2.2 - time * 1.05 + p.x * 0.45);
  float w3 = sin((p.x + p.y) * 3.1 + time * 1.7);
  float wave = (w1 + w2) * 0.25 + 0.5 + w3 * 0.08;
  vec3 col = mix(deep, shallow, smoothstep(0.02, 0.75, land));
  col += skyRefl * (0.35 + 0.65 * smoothstep(0.55, 0.95, wave));
  float crest = step(0.86, wave + land * 0.15);
  col = mix(col, col * 1.35 + vec3(0.02, 0.04, 0.05), crest * 0.55);
  float band = fract(land * 3.2 - time * 0.28 + w1 * 0.07);
  float f = smoothstep(0.30, 0.62, land) * step(0.55, band);
  f += smoothstep(0.62, 0.8, land) * 0.7;
  col = mix(col, foam, clamp(f, 0.0, 1.0) * 0.8);
  vec3 refl = vec3(0.0);
  for (int i = 0; i < ${MAXL}; i++) {
    vec2 d = vW.xz - lPos[i].xz; d.y *= 0.4;
    float a = clamp(1.0 - length(d) / (lRange[i] * 1.1), 0.0, 1.0);
    refl += lCol[i] * a * a * (0.45 + 0.55 * step(0.5, wave));
  }
  col += refl * 0.5;
  // 燈塔光束掃過海面
  if (beamA > 0.0) {
    vec2 o = vW.xz - beamOrigin; float L = length(o);
    float ang = dot(normalize(o), beamDir);
    float b = smoothstep(0.975, 0.995, ang) * smoothstep(48.0, 6.0, L);
    col += vec3(1.0, 0.86, 0.55) * b * beamA * (0.5 + 0.5 * step(0.45, wave));
  }
  col += vec3(glow);
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`;

function blurGray(data, w, h, r) {
  const out = new Float32Array(w * h);
  const tmp = new Float32Array(w * h);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) { const xx = Math.min(w - 1, Math.max(0, x + k)); s += data[y * w + xx]; n++; }
      tmp[y * w + x] = s / n;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) { const yy = Math.min(h - 1, Math.max(0, y + k)); s += tmp[yy * w + x]; n++; }
      out[y * w + x] = s / n;
    }
    data = out.slice();
  }
  return out;
}

// ------- 地圖 -------
export class World {
  constructor(def, pool) {
    this.def = def;
    this.pool = pool;
    this.group = new THREE.Group();
    this.w = def.rows[0].length; this.h = def.rows.length;
    this.sea = def.sea ?? -0.45;
    this.lightSources = [];
    this.colliders = []; // 圓形碰撞 {x,z,r}
    this.interact = [];  // 可互動物件
    this.anims = [];     // 每格更新函式
    this.parseCells();
    this.buildTerrain();
    if (def.water !== false) this.buildWater();
    for (const b of def.buildings || []) this.buildBuilding(b);
    this.statics = [];
    for (const p of def.props || []) this.buildProp(p);
    this.flushStatics();
  }
  parseCells() {
    const d = this.def, L = d.legend;
    this.cells = [];
    for (let z = 0; z < this.h; z++) {
      const row = [];
      for (let x = 0; x < this.w; x++) {
        const ch = d.rows[z][x];
        const lg = L[ch] || L['.'] || { water: true };
        let h = lg.h ?? 0;
        if (d.heights) { const hc = d.heights[z]?.[x]; if (hc && hc !== ' ' && hc !== '.') h = parseInt(hc, 36) * 0.5; }
        const c = { g: lg.g || 'grass', h: lg.water ? (lg.bed ?? -1.4) : h, water: !!lg.water, block: !!lg.block, stair: !!lg.stair, ch, tag: lg.tag, phase: lg.phase || null };
        row.push(c);
      }
      this.cells.push(row);
    }
  }
  cell(x, z) { return this.cells[z]?.[x]; }
  heightAt(x, z) {
    const c = this.cell(Math.floor(x), Math.floor(z));
    return c ? Math.max(c.h, c.water ? this.sea : -9) : this.sea;
  }
  walkable(x, z, fromH) {
    const c = this.cell(Math.floor(x), Math.floor(z));
    if (!c || c.water || c.block || c.solid) return false;
    if (c.phase && c.phase !== this.phase) return false;
    if (fromH != null && Math.abs(c.h - fromH) > 0.55) return false;
    for (const k of this.colliders) if (k.on !== false && (x - k.x) ** 2 + (z - k.z) ** 2 < k.r * k.r) return false;
    return true;
  }
  buildTerrain() {
    this.phase = this.def.phase || 'D';
    const main = this.terrainGeo((c) => !c.phase);
    const m = new THREE.MeshLambertMaterial({ map: atlas().tex, vertexColors: true });
    const mesh = new THREE.Mesh(main, m);
    mesh.receiveShadow = true; mesh.castShadow = true;
    this.group.add(mesh);
    this.terrain = mesh;
    this.phaseMeshes = {};
    for (const ph of ['L', 'D']) {
      if (!this.cells.some((r) => r.some((c) => c.phase === ph))) continue;
      const g = this.terrainGeo((c) => c.phase === ph);
      const mat = new THREE.MeshLambertMaterial({ map: atlas().tex, vertexColors: true, transparent: true, opacity: 1, emissive: new THREE.Color(ph === 'L' ? '#ffcf6a' : '#8a6aff'), emissiveIntensity: 0.55, color: new THREE.Color(ph === 'L' ? '#fff0c8' : '#b8a8ff') });
      const pm = new THREE.Mesh(g, mat); pm.receiveShadow = true;
      this.group.add(pm); this.phaseMeshes[ph] = pm;
    }
    this.setPhase(this.phase, true);
  }
  setPhase(ph, instant) {
    this.phase = ph;
    for (const [k, m] of Object.entries(this.phaseMeshes || {})) {
      const on = k === ph;
      m.userData.target = on ? 1 : 0;
      if (instant) { m.material.opacity = on ? 1 : 0; m.visible = on; }
    }
  }
  terrainGeo(filter) {
    const A = atlas(), pos = [], uv = [], nor = [], col = [], idx = [];
    const r = rng(this.def.seed || 5);
    const quad = (p, n, u, ao = [1, 1, 1, 1]) => {
      const b = pos.length / 3;
      for (let i = 0; i < 4; i++) { pos.push(...p[i]); nor.push(...n); uv.push(...u[i]); col.push(ao[i], ao[i], ao[i]); }
      idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
    };
    const tUV = (name, rot = 0) => {
      const t = A.uv[name] || A.uv.grass;
      let c = [[t.u0, t.v1], [t.u1, t.v1], [t.u1, t.v0], [t.u0, t.v0]];
      for (let i = 0; i < rot; i++) c = [c[3], c[0], c[1], c[2]];
      return c;
    };
    const H = (x, z) => { const c = this.cell(x, z); return c && !c.phase ? c.h : -1.4; };
    for (let z = 0; z < this.h; z++) for (let x = 0; x < this.w; x++) {
      const c = this.cells[z][x];
      if (!filter(c)) continue;
      const G = GROUND[c.g] || GROUND.grass;
      const h = c.h;
      const pick = G.top[Math.floor(r() * G.top.length)];
      const rot = G.rot ? Math.floor(r() * 4) : 0;
      // 角落遮蔽：鄰格比較高就變暗
      const aoAt = (cx, cz) => {
        let n = 0;
        for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { if (H(cx + dx, cz + dz) > h + 0.3) n++; }
        return 1 - Math.min(n, 2) * 0.2;
      };
      quad([[x, h, z], [x + 1, h, z], [x + 1, h, z + 1], [x, h, z + 1]], [0, 1, 0], tUV(pick, rot),
        [aoAt(x, z), aoAt(x + 1, z), aoAt(x + 1, z + 1), aoAt(x, z + 1)]);
      // 側面
      for (const [dx, dz, n] of [[0, 1, [0, 0, 1]], [0, -1, [0, 0, -1]], [1, 0, [1, 0, 0]], [-1, 0, [-1, 0, 0]]]) {
        const nc = this.cell(x + dx, z + dz);
        let nh = nc ? nc.h : -1.6;
        if (nc && nc.phase && !c.phase) nh = -1.6;
        if (c.phase) nh = Math.max(nh, h - 0.35);
        if (nh >= h - 0.01) continue;
        let yT = h;
        let first = true;
        while (yT > nh + 0.001) {
          const yB = Math.max(nh, yT - 1);
          const name = first ? G.sideTop : G.side;
          const t = A.uv[name] || A.uv.cliff;
          const frac = yT - yB;
          const v1 = t.v1, v0 = t.v1 - (t.v1 - t.v0) * frac;
          let p;
          if (dz === 1) p = [[x, yT, z + 1], [x + 1, yT, z + 1], [x + 1, yB, z + 1], [x, yB, z + 1]];
          else if (dz === -1) p = [[x + 1, yT, z], [x, yT, z], [x, yB, z], [x + 1, yB, z]];
          else if (dx === 1) p = [[x + 1, yT, z + 1], [x + 1, yT, z], [x + 1, yB, z], [x + 1, yB, z + 1]];
          else p = [[x, yT, z], [x, yT, z + 1], [x, yB, z + 1], [x, yB, z]];
          const shadeTop = first ? 1 : 0.92, shadeBot = yB <= nh + 0.01 ? 0.72 : 0.9;
          quad(p, n, [[t.u0, v1], [t.u1, v1], [t.u1, v0], [t.u0, v0]], [shadeTop, shadeTop, shadeBot, shadeBot]);
          yT = yB; first = false;
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    return g;
  }
  buildWater() {
    const d = this.def, S = 4;
    const W = this.w * S, Hh = this.h * S;
    const data = new Float32Array(W * Hh);
    for (let z = 0; z < this.h; z++) for (let x = 0; x < this.w; x++) {
      const c = this.cells[z][x];
      const land = !c.water || c.h > this.sea - 0.2 ? 1 : 0;
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) data[(z * S + j) * W + x * S + i] = land;
    }
    const bl = blurGray(data, W, Hh, 3);
    const px = new Uint8Array(W * Hh * 4);
    for (let i = 0; i < W * Hh; i++) { const v = Math.round(Math.min(1, bl[i]) * 255); px[i * 4] = v; px[i * 4 + 1] = v; px[i * 4 + 2] = v; px[i * 4 + 3] = 255; }
    const lt = new THREE.DataTexture(px, W, Hh, THREE.RGBAFormat);
    lt.magFilter = THREE.LinearFilter; lt.minFilter = THREE.LinearFilter; lt.needsUpdate = true;
    lt.flipY = false;
    const wc = d.waterColors || {};
    const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
    Object.assign(u, {
      time: { value: 0 }, landTex: { value: lt }, rect: { value: new THREE.Vector4(0, 0, this.w, this.h) },
      deep: { value: new THREE.Color(wc.deep || '#0b2236') }, shallow: { value: new THREE.Color(wc.shallow || '#1f5866') }, foam: { value: new THREE.Color(wc.foam || '#cfe6e4') },
      skyRefl: { value: new THREE.Color(wc.sky || '#0c1a2a') },
      lPos: { value: this.pool.uPos }, lCol: { value: this.pool.uCol }, lRange: { value: this.pool.uRange },
      beamA: { value: 0 }, beamDir: { value: new THREE.Vector2(1, 0) }, beamOrigin: { value: new THREE.Vector2() }, glow: { value: 0 },
    });
    const mat = new THREE.ShaderMaterial({ vertexShader: WATER_V, fragmentShader: WATER_F, uniforms: u, fog: true });
    const M = 60;
    const geo = new THREE.PlaneGeometry(this.w + M * 2, this.h + M * 2);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(this.w / 2, this.sea, this.h / 2);
    mesh.receiveShadow = false;
    this.group.add(mesh);
    this.water = mesh;
    // 海床的深色（避免看到地圖邊緣）
    this.anims.push((dt, t) => { u.time.value = t; });
  }
  buildBuilding(b) {
    const base = this.cell(b.x, b.z)?.h ?? 0;
    const g = new THREE.Group();
    const w = b.w, d = b.d, h = b.h;
    const seed = (b.x * 31 + b.z * 17) | 0;
    const wall = b.wall || 'plaster';
    const front = facade({ wall, w, h: Math.ceil(h), windows: b.windows || [], door: b.door, timber: b.timber, seed, sign: b.sign, lit: b.lit ?? 0.7 });
    const side = facade({ wall, w: d, h: Math.ceil(h), windows: b.sideWindows || [{ x: d / 2, y: Math.min(1.1, h * 0.4) }], timber: b.timber, seed: seed + 1, lit: b.lit ?? 0.7 });
    const backF = facade({ wall, w, h: Math.ceil(h), windows: [], timber: b.timber, seed: seed + 2 });
    const mk = (f) => {
      const m = new THREE.MeshLambertMaterial({ map: canvasTex(f.map), emissiveMap: canvasTex(f.emissive), emissive: new THREE.Color(1, 0.85, 0.6), emissiveIntensity: b.glow ?? 1.4 });
      return m;
    };
    const mf = mk(front), ms = mk(side), mb = mk(backF);
    const fh = Math.ceil(h);
    const vscale = h / fh;
    const wallMesh = (W, mat, px, pz, ry) => {
      const geo = new THREE.PlaneGeometry(W, h);
      const uvs = geo.attributes.uv;
      for (let i = 0; i < uvs.count; i++) uvs.setY(i, uvs.getY(i) * vscale + (1 - vscale));
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px, base + h / 2, pz); m.rotation.y = ry;
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
    };
    wallMesh(w, mf, b.x + w / 2, b.z + d, 0);
    wallMesh(w, mb, b.x + w / 2, b.z, Math.PI);
    wallMesh(d, ms, b.x + w, b.z + d / 2, Math.PI / 2);
    wallMesh(d, ms, b.x, b.z + d / 2, -Math.PI / 2);
    // 屋頂（山牆式，屋脊沿 x 軸）
    const rh = b.roofH ?? Math.min(1.8, d * 0.45), ov = 0.32;
    const roofTex = repeatTex(b.roof || 'roofred');
    const rmat = new THREE.MeshLambertMaterial({ map: roofTex, side: THREE.DoubleSide });
    const top = base + h;
    const slope = (z0, z1, flip) => {
      const geo = new THREE.BufferGeometry();
      const x0 = b.x - ov, x1 = b.x + w + ov;
      const zm = b.z + d / 2;
      const yE = top - ov * (rh / (d / 2)), zE = flip ? b.z - ov : b.z + d + ov;
      const p = [x0, top + rh, zm, x1, top + rh, zm, x1, yE, zE, x0, yE, zE];
      const L = Math.hypot(d / 2 + ov, rh + ov * rh / (d / 2));
      const uvA = [0, L, w + ov * 2, L, w + ov * 2, 0, 0, 0];
      geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvA, 2));
      geo.setIndex(flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, rmat); m.castShadow = true; m.receiveShadow = true; g.add(m);
    };
    slope(0, 0, false); slope(0, 0, true);
    // 山牆三角
    const gmat = new THREE.MeshLambertMaterial({ map: repeatTex(wall), side: THREE.DoubleSide });
    for (const gx of [b.x, b.x + w]) {
      const geo = new THREE.BufferGeometry();
      const p = [gx, top, b.z, gx, top, b.z + d, gx, top + rh, b.z + d / 2];
      geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, d, 0, d / 2, rh], 2));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, gmat); m.castShadow = true; g.add(m);
    }
    // 屋脊
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(w + ov * 2 + 0.1, 0.16, 0.22), new THREE.MeshLambertMaterial({ color: 0x3a2e2a }));
    ridge.position.set(b.x + w / 2, top + rh + 0.04, b.z + d / 2); g.add(ridge);
    if (b.chimney) {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), new THREE.MeshLambertMaterial({ map: repeatTex('brick') }));
      ch.position.set(b.x + w * 0.75, top + rh * 0.8, b.z + d * 0.35); ch.castShadow = true; g.add(ch);
    }
    this.group.add(g);
    for (let z = b.z; z < b.z + d; z++) for (let x = b.x; x < b.x + w; x++) { const c = this.cell(x, z); if (c) c.solid = true; }
    if (b.door && b.doorLight !== false) {
      this.lightSources.push({ pos: new THREE.Vector3(b.x + b.door.x, base + 1.6, b.z + d + 0.5), color: new THREE.Color('#ffb860'), intensity: 6, range: 4.2, flicker: true });
    }
    if (b.onDoor) this.interact.push({ x: b.x + (b.door?.x ?? w / 2), z: b.z + d + 0.45, r: 0.9, kind: 'door', id: b.id, label: b.label || '進入', on: b.onDoor });
  }
  // 靜態立牌（樹、草叢）合併成一個網格
  addStatic(pix, x, z, y, scale = 1, key) {
    this.statics.push({ pix, x, z, y, scale, key });
  }
  flushStatics() {
    if (!this.statics.length) return;
    // 打包貼圖
    const uniq = new Map();
    for (const s of this.statics) if (!uniq.has(s.key)) uniq.set(s.key, s.pix);
    const items = [...uniq.entries()];
    let W = 1024, x = 0, y = 0, rowH = 0;
    const placed = {};
    for (const [k, p] of items) {
      if (x + p.w > W) { x = 0; y += rowH + 2; rowH = 0; }
      placed[k] = { x, y, w: p.w, h: p.h }; x += p.w + 2; rowH = Math.max(rowH, p.h);
    }
    const H = Math.pow(2, Math.ceil(Math.log2(y + rowH + 2)));
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d');
    for (const [k, p] of items) cx.putImageData(new ImageData(new Uint8ClampedArray(p.d), p.w, p.h), placed[k].x, placed[k].y);
    const tex = canvasTex(cv);
    const geos = [], shadowGeos = [];
    for (const s of this.statics) {
      const P = placed[s.key], w = (P.w / PPU) * s.scale, h = (P.h / PPU) * s.scale;
      const geo = new THREE.PlaneGeometry(w, h);
      const u0 = P.x / W, u1 = (P.x + P.w) / W, v1 = 1 - P.y / H, v0 = 1 - (P.y + P.h) / H;
      geo.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v1, u1, v1, u0, v0, u1, v0], 2));
      geo.translate(s.x, s.y + h / 2 - (2 / PPU) * s.scale, s.z);
      geos.push(geo);
      if (s.shadow) { const sg = new THREE.PlaneGeometry(s.shadow, s.shadow * 0.5); sg.rotateX(-Math.PI / 2); sg.translate(s.x, s.y + 0.03, s.z); shadowGeos.push(sg); }
    }
    const merged = mergeGeometries(geos);
    const sheet = { tex };
    const mat = spriteMaterial(sheet, this.pool);
    mat.uniforms.frame.value.set(0, 0, 1, 1);
    mat.uniforms.emissive.value = 0;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.renderOrder = 1;
    this.group.add(mesh);
    if (shadowGeos.length) {
      const c2 = document.createElement('canvas'); c2.width = c2.height = 64;
      const g2 = c2.getContext('2d'); const gr = g2.createRadialGradient(32, 32, 2, 32, 32, 31);
      gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
      const sm = new THREE.Mesh(mergeGeometries(shadowGeos), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c2), transparent: true, depthWrite: false }));
      this.group.add(sm);
    }
    this.statics = [];
  }
  buildProp(p) {
    const fn = PROPS[p.type];
    if (fn) fn(this, p);
  }
  groundY(x, z) { const c = this.cell(Math.floor(x), Math.floor(z)); return c ? (c.water ? this.sea : c.h) : this.sea; }
  update(dt, t) {
    for (const f of this.anims) f(dt, t);
    for (const m of Object.values(this.phaseMeshes || {})) {
      const tg = m.userData.target ?? 1;
      m.material.opacity += (tg - m.material.opacity) * Math.min(1, dt * 5);
      m.visible = m.material.opacity > 0.02;
      m.material.emissiveIntensity = 0.45 + Math.sin(t * 3) * 0.12;
    }
  }
}

// ---------- 道具 ----------
const M = {};
function lam(color, opts = {}) { const k = color + JSON.stringify(opts); if (!M[k]) M[k] = new THREE.MeshLambertMaterial({ color, ...opts }); return M[k]; }
function texMat(name) { const k = 't_' + name; if (!M[k]) M[k] = new THREE.MeshLambertMaterial({ map: repeatTex(name) }); return M[k]; }
const treeCache = {};

export const PROPS = {
  tree(W, p) {
    const k = `tree_${p.kind || 'oak'}_${p.v || 1}`;
    if (!treeCache[k]) treeCache[k] = treePix(p.kind || 'oak', p.v || 1);
    const pix = treeCache[k];
    const y = W.groundY(p.x, p.z);
    W.statics.push({ pix, x: p.x + 0.5, z: p.z + 0.5, y, scale: p.s || 1, key: k, shadow: (p.kind === 'pine' ? 1.6 : 2.6) * (p.s || 1) });
    W.colliders.push({ x: p.x + 0.5, z: p.z + 0.5, r: 0.45 });
  },
  bush(W, p) {
    const k = `bush_${p.v || 1}`;
    if (!treeCache[k]) treeCache[k] = treePix('bush', p.v || 1);
    W.statics.push({ pix: treeCache[k], x: p.x + 0.5, z: p.z + 0.5, y: W.groundY(p.x, p.z), scale: p.s || 1, key: k, shadow: 1.2 });
    if (!p.soft) W.colliders.push({ x: p.x + 0.5, z: p.z + 0.5, r: 0.4 });
  },
  tufts(W, p) { // 在一個範圍撒草叢
    const r = rng(p.seed || 3);
    for (let i = 0; i < (p.n || 20); i++) {
      const x = p.x + r() * (p.w || 4), z = p.z + r() * (p.d || 4);
      const c = W.cell(Math.floor(x), Math.floor(z));
      if (!c || c.water || c.solid || !['grass', 'meadow', 'cliff'].includes(c.g)) continue;
      const v = 1 + Math.floor(r() * 6), k = `tuft_${v}_${p.color || ''}`;
      if (!treeCache[k]) treeCache[k] = tuftPix(v, p.color || '#5a8a40');
      W.statics.push({ pix: treeCache[k], x, z, y: c.h, scale: 0.9 + r() * 0.3, key: k });
    }
  },
  rock(W, p) {
    const geo = new THREE.IcosahedronGeometry(0.5, 0);
    const pos = geo.attributes.position, r = rng((p.x * 7 + p.z * 13) | 0);
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * (0.9 + r() * 0.3), pos.getY(i) * (0.8 + r() * 0.3), pos.getZ(i) * (0.9 + r() * 0.3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, texMat(p.tex || 'darkrock'));
    const s = p.s || 1;
    m.scale.set(s * (p.sx || 1), s * (p.sy || 0.8), s * (p.sz || 1));
    m.position.set(p.x + 0.5, W.groundY(p.x, p.z) + 0.2 * s, p.z + 0.5);
    m.rotation.y = r() * 6;
    m.castShadow = true; m.receiveShadow = true;
    W.group.add(m);
    if (!p.soft) W.colliders.push({ x: p.x + 0.5, z: p.z + 0.5, r: 0.45 * s });
  },
  lamp(W, p) {
    const y = W.groundY(p.x, p.z), g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.12), lam(0x2a2a30));
    pole.position.y = 1.1; g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), lam(0x2a2a30)); arm.position.set(0.2, 2.15, 0); g.add(arm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.2), new THREE.MeshLambertMaterial({ color: 0x3a3226, emissive: 0xffb050, emissiveIntensity: 1.5 }));
    head.position.set(0.42, 1.95, 0); g.add(head);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.16, 4), lam(0x23232a)); cap.position.set(0.42, 2.15, 0); cap.rotation.y = Math.PI / 4; g.add(cap);
    g.position.set(p.x + 0.5, y, p.z + 0.5);
    pole.castShadow = true;
    W.group.add(g);
    W.lightSources.push({ pos: new THREE.Vector3(p.x + 0.92, y + 1.85, p.z + 0.5), color: new THREE.Color(p.color || '#ffb45a'), intensity: p.i || 14, range: p.range || 6.5, flicker: true });
    W.colliders.push({ x: p.x + 0.5, z: p.z + 0.5, r: 0.2 });
  },
  light(W, p) { W.lightSources.push({ pos: new THREE.Vector3(p.x, p.y ?? W.groundY(p.x, p.z) + 1.5, p.z), color: new THREE.Color(p.color || '#ffb45a'), intensity: p.i || 10, range: p.range || 6, flicker: p.flicker ?? true, priority: p.priority || 0 }); },
  barrel(W, p) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.75, 10), texMat('planks2'));
    m.position.set(p.x + 0.5, W.groundY(p.x, p.z) + 0.375, p.z + 0.5); m.castShadow = true; m.receiveShadow = true; W.group.add(m);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.06, 10), lam(0x3a3430));
    band.position.copy(m.position); band.position.y += 0.2; W.group.add(band);
    W.colliders.push({ x: p.x + 0.5, z: p.z + 0.5, r: 0.35 });
  },
  crate(W, p) {
    const s = p.s || 0.7;
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), texMat('planks'));
    m.position.set(p.x + 0.5, W.groundY(p.x, p.z) + s / 2 + (p.stack ? s : 0), p.z + 0.5); m.rotation.y = (p.rot || 0); m.castShadow = true; m.receiveShadow = true;
    W.group.add(m);
    W.colliders.push({ x: p.x + 0.5, z: p.z + 0.5, r: 0.42 });
  },
  fence(W, p) {
    const n = p.len || 3, dx = p.dir === 'z' ? 0 : 1, dz = p.dir === 'z' ? 1 : 0;
    for (let i = 0; i <= n; i++) {
      const x = p.x + dx * i, z = p.z + dz * i;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), texMat('planks2'));
      post.position.set(x, W.groundY(x - dx * 0.01, z - dz * 0.01) + 0.4, z); post.castShadow = true; W.group.add(post);
    }
    for (const yy of [0.35, 0.65]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(dx ? n : 0.06, 0.08, dz ? n : 0.06), texMat('planks2'));
      rail.position.set(p.x + dx * n / 2, W.groundY(p.x, p.z) + yy, p.z + dz * n / 2); rail.castShadow = true; W.group.add(rail);
    }
    for (let i = 0; i < n; i++) W.colliders.push({ x: p.x + dx * (i + 0.5), z: p.z + dz * (i + 0.5), r: 0.4 });
  },
  boat(W, p) {
    const L = p.len || 3, g = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(-L / 2, 0); shape.quadraticCurveTo(-L / 2 + 0.3, -0.5, 0, -0.55); shape.quadraticCurveTo(L / 2 - 0.3, -0.5, L / 2 + 0.2, 0.15); shape.lineTo(-L / 2, 0.1);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.0, bevelEnabled: false });
    geo.translate(0, 0.25, -0.5);
    const hull = new THREE.Mesh(geo, texMat('planks2'));
    hull.castShadow = true; g.add(hull);
    if (p.mast) { const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 6), lam(0x5a4030)); mast.position.y = 1.4; g.add(mast); }
    g.position.set(p.x + 0.5, W.sea + 0.05, p.z + 0.5);
    g.rotation.y = p.rot || 0;
    W.group.add(g);
    const base = g.position.y, ph = Math.random() * 6;
    W.anims.push((dt, t) => { g.position.y = base + Math.sin(t * 1.3 + ph) * 0.05; g.rotation.z = Math.sin(t * 1.1 + ph) * 0.04; });
  },
  campfire(W, p) {
    const y = W.groundY(p.x, p.z);
    const logs = new Sheet([logsPix()], { a: 0 }, 1);
    const lm = spriteMaterial(logs, W.pool); lm.uniforms.frame.value.set(0, 0, 1, 1);
    const lg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), lm); lg.position.set(p.x + 0.5, y + 0.25, p.z + 0.5); W.group.add(lg);
    const fr = [0, 1, 2, 3].map((i) => flamePix(i));
    const fs = new Sheet(fr, {}, 4);
    const fm = spriteMaterial(fs, W.pool); fm.uniforms.emissive.value = 1; fm.uniforms.ambient = { value: new THREE.Color(3, 3, 3) };
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.0), fm); fl.position.set(p.x + 0.5, y + 0.55, p.z + 0.52); W.group.add(fl);
    W.anims.push((dt, t) => { const i = Math.floor(t * 10) % 4; const [u, v, du, dv] = fs.frameRect(i); fm.uniforms.frame.value.set(u, v, du, dv); });
    const src = { pos: new THREE.Vector3(p.x + 0.5, y + 0.9, p.z + 0.5), color: new THREE.Color('#ff9a40'), intensity: 16, range: 7, flicker: true, priority: 3 };
    W.lightSources.push(src);
    W.colliders.push({ x: p.x + 0.5, z: p.z + 0.5, r: 0.5 });
    W.interact.push({ x: p.x + 0.5, z: p.z + 0.5, r: 1.4, kind: 'camp', id: p.id || 'camp', label: '營火', on: p.on || 'camp' });
    W.embers = W.embers || [];
    W.embers.push(src.pos);
  },
  pillar(W, p) {
    const h = p.h || 3, y = W.groundY(p.x, p.z);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, h, 10), texMat(p.tex || 'ruinwall'));
    m.position.set(p.x + 0.5, y + h / 2, p.z + 0.5); m.castShadow = true; m.receiveShadow = true; W.group.add(m);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 1.0), texMat('slab')); cap.position.set(p.x + 0.5, y + h + 0.12, p.z + 0.5); cap.castShadow = true;
    if (!p.broken) W.group.add(cap);
    W.colliders.push({ x: p.x + 0.5, z: p.z + 0.5, r: 0.5 });
  },
  box(W, p) { // 通用方塊（牆、台座）
    const m = new THREE.Mesh(new THREE.BoxGeometry(p.w || 1, p.h || 1, p.d || 1), texMat(p.tex || 'ruinwall'));
    m.position.set(p.x + (p.w || 1) / 2, W.groundY(p.x, p.z) + (p.h || 1) / 2 + (p.y || 0), p.z + (p.d || 1) / 2); m.castShadow = true; m.receiveShadow = true; W.group.add(m);
    if (p.solid !== false) for (let z = p.z; z < p.z + (p.d || 1); z++) for (let x = p.x; x < p.x + (p.w || 1); x++) { const c = W.cell(x, z); if (c) c.solid = true; }
    return m;
  },
  stall(W, p) {
    const y = W.groundY(p.x, p.z), g = new THREE.Group();
    for (const [dx, dz] of [[0, 0], [1.8, 0], [0, 1], [1.8, 1]]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.7, 0.1), lam(0x5a4030)); post.position.set(dx, 0.85, dz); post.castShadow = true; g.add(post); }
    const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; const c = cv.getContext('2d');
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#e8e0d0' : (p.color || '#b8443a'); c.fillRect(i * 4, 0, 4, 32); }
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.3), new THREE.MeshLambertMaterial({ map: canvasTex(cv), side: THREE.DoubleSide }));
    cloth.rotation.x = -Math.PI / 2 + 0.35; cloth.position.set(0.9, 1.75, 0.5); cloth.castShadow = true; g.add(cloth);
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.8), texMat('planks')); table.position.set(0.9, 0.8, 0.6); table.castShadow = true; g.add(table);
    for (let i = 0; i < 4; i++) { const it = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.25), lam([0xd9b45a, 0x7aa6c0, 0xc06a4a, 0x9fd0a0][i])); it.position.set(0.3 + i * 0.4, 0.95, 0.6); g.add(it); }
    g.position.set(p.x, y, p.z); W.group.add(g);
    W.colliders.push({ x: p.x + 0.9, z: p.z + 0.5, r: 0.9 });
  },
  chest(W, p) {
    const y = W.groundY(p.x, p.z), g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.48), texMat('planks')); body.position.y = 0.21; body.castShadow = true; g.add(body);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.5), lam(0x8a5a2a)); lid.position.set(0, 0.5, 0); g.add(lid);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.06, 0.52), new THREE.MeshLambertMaterial({ color: 0xd9b45a, emissive: 0x6a4a10, emissiveIntensity: 0.6 })); trim.position.y = 0.42; g.add(trim);
    g.position.set(p.x + 0.5, y, p.z + 0.5); W.group.add(g);
    W.colliders.push({ x: p.x + 0.5, z: p.z + 0.5, r: 0.38 });
    const it = { x: p.x + 0.5, z: p.z + 0.5, r: 1.1, kind: 'chest', id: p.id, label: '打開', on: 'chest', item: p.item, n: p.n || 1, gold: p.gold, lid, open: false };
    W.interact.push(it);
    W.chests = W.chests || {}; W.chests[p.id] = it;
  },
  sign(W, p) {
    const y = W.groundY(p.x, p.z);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), lam(0x5a4030)); post.position.set(p.x + 0.5, y + 0.5, p.z + 0.5); W.group.add(post);
    const bd = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.06), texMat('planks')); bd.position.set(p.x + 0.5, y + 0.95, p.z + 0.55); bd.castShadow = true; W.group.add(bd);
    W.interact.push({ x: p.x + 0.5, z: p.z + 0.5, r: 1.1, kind: 'sign', id: p.id, label: '看看', text: p.text, on: 'sign' });
    W.colliders.push({ x: p.x + 0.5, z: p.z + 0.5, r: 0.25 });
  },
  net(W, p) {
    const y = W.groundY(p.x, p.z);
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 32; const c = cv.getContext('2d');
    c.strokeStyle = '#c8b890'; c.lineWidth = 1;
    for (let i = 0; i < 64; i += 4) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 8, 32); c.stroke(); c.beginPath(); c.moveTo(i + 8, 0); c.lineTo(i, 32); c.stroke(); }
    const t = canvasTex(cv);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
    m.position.set(p.x + 1, y + 0.9, p.z + 0.5); W.group.add(m);
    for (const dx of [0, 2]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), lam(0x5a4030)); post.position.set(p.x + dx, y + 0.75, p.z + 0.5); post.castShadow = true; W.group.add(post); }
  },
  bench(W, p) {
    const y = W.groundY(p.x, p.z);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.4), texMat('planks')); seat.position.set(p.x + 0.7, y + 0.45, p.z + 0.5); seat.castShadow = true; W.group.add(seat);
    for (const dx of [0.15, 1.25]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.35), lam(0x4a3a2a)); l.position.set(p.x + dx, y + 0.22, p.z + 0.5); W.group.add(l); }
    W.colliders.push({ x: p.x + 0.7, z: p.z + 0.5, r: 0.5 });
  },

  lighthouse(W, p) {
    const y = W.groundY(p.x, p.z), g = new THREE.Group(), H = p.h || 11;
    // 塔身條紋貼圖
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; const c = cv.getContext('2d');
    const base = tileCanvas('tower', 2, 8), band = tileCanvas('towerband', 2, 1);
    c.drawImage(base, 0, 0);
    for (const yy of [40, 120, 200]) c.drawImage(band, 0, yy, 64, 22);
    for (let i = 0; i < 4; i++) { c.fillStyle = '#2a3040'; c.fillRect(26, 60 + i * 52, 10, 14); c.fillStyle = '#ffd27a'; c.fillRect(28, 62 + i * 52, 6, 10); }
    const tt = canvasTex(cv); tt.wrapS = THREE.RepeatWrapping; tt.repeat.set(3, 1);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.45, H, 20, 1, true), new THREE.MeshLambertMaterial({ map: tt, emissiveMap: tt, emissive: new THREE.Color(0.08, 0.06, 0.03), side: THREE.DoubleSide }));
    tower.position.y = H / 2; tower.castShadow = true; tower.receiveShadow = true; g.add(tower);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.85, 0.9, 20), texMat('ruinwall2')); plinth.position.y = 0.45; plinth.castShadow = true; g.add(plinth);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.2), lam(0x3a2a20)); door.position.set(0, 1.3, 1.5); g.add(door);
    const gal = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.3, 0.3, 20), lam(0x2a2a34)); gal.position.y = H + 0.1; gal.castShadow = true; g.add(gal);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), lam(0x22222a)); post.position.set(Math.cos(a) * 1.5, H + 0.55, Math.sin(a) * 1.5); g.add(post); }
    const rail = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.04, 4, 24), lam(0x22222a)); rail.rotation.x = Math.PI / 2; rail.position.y = H + 0.85; g.add(rail);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.5, 16, 1, true), new THREE.MeshLambertMaterial({ color: 0x3a3020, emissive: new THREE.Color('#ffcf7a'), emissiveIntensity: p.lit === false ? 0.15 : 2.4, side: THREE.DoubleSide }));
    glass.position.y = H + 1.05; g.add(glass);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.5, 0.07), lam(0x1a1a20)); m.position.set(Math.cos(a) * 0.86, H + 1.05, Math.sin(a) * 0.86); g.add(m); }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.2, 16), lam(0x7a2a24)); roof.position.y = H + 2.4; roof.castShadow = true; g.add(roof);
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), lam(0xd9b45a)); fin.position.y = H + 3.1; g.add(fin);
    g.position.set(p.x, y, p.z);
    W.group.add(g);
    W.lighthouseGlass = glass;
    W.lamp = { x: p.x, y: y + H + 1.05, z: p.z };
    for (let z = Math.floor(p.z - 1.4); z <= Math.floor(p.z + 1.4); z++) for (let x = Math.floor(p.x - 1.4); x <= Math.floor(p.x + 1.4); x++) { const c = W.cell(x, z); if (c && (x + 0.5 - p.x) ** 2 + (z + 0.5 - p.z) ** 2 < 2.6) c.solid = true; }
  },
  bell(W, p) {
    const y = W.groundY(p.x, p.z) + (p.y || 0), g = new THREE.Group(), s = p.s || 1;
    const pts = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2((0.35 + Math.pow(t, 2.4) * 1.25 + (t > 0.93 ? 0.12 : 0)) * s, (1 - t) * 2.6 * s)); }
    const geo = new THREE.LatheGeometry(pts, 24);
    const mat = new THREE.MeshLambertMaterial({ color: 0x5a8a78, emissive: new THREE.Color('#1a3a30'), emissiveIntensity: 0.6, side: THREE.DoubleSide });
    const bell = new THREE.Mesh(geo, mat); bell.castShadow = true; bell.position.y = (p.hang ?? 2.2) * s; g.add(bell);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1.68 * s, 0.1 * s, 6, 24), lam(0x9a7a3a)); lip.rotation.x = Math.PI / 2; lip.position.y = (p.hang ?? 2.2) * s + 0.06; g.add(lip);
    if (p.frame !== false) {
      for (const dx of [-2.3, 2.3]) { const pil = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 6 * s, 0.5 * s), texMat('ruinwall')); pil.position.set(dx * s, 3 * s, 0); pil.castShadow = true; g.add(pil); }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(5.2 * s, 0.5 * s, 0.6 * s), texMat('ruinwall2')); beam.position.y = 6 * s; beam.castShadow = true; g.add(beam);
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.06 * s, (6 - 2.2 - 2.6) * s + 0.3, 6), lam(0x5a5a62)); ch.position.y = (2.2 + 2.6 + (6 - 4.8) / 2) * s; g.add(ch);
    }
    g.position.set(p.x, y, p.z); if (p.rot) g.rotation.y = p.rot; if (p.tilt) bell.rotation.z = p.tilt;
    W.group.add(g);
    W.bellMesh = bell;
    if (p.solid !== false) W.colliders.push({ x: p.x, z: p.z, r: 2.1 * s });
  },
  ship(W, p) {
    const L = p.len || 7, g = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(-L / 2, 0.6); shape.quadraticCurveTo(-L / 2 + 0.6, -1.0, 0, -1.1); shape.quadraticCurveTo(L / 2 - 0.4, -1.0, L / 2 + 0.8, 1.0); shape.lineTo(L / 2 - 0.2, 0.9); shape.lineTo(-L / 2, 0.9);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.2, bevelEnabled: false }); geo.translate(0, 0, -1.1);
    const hull = new THREE.Mesh(geo, texMat('planks2')); hull.castShadow = true; g.add(hull);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(L - 0.4, 0.1, 2.0), texMat('planks')); deck.position.y = 0.85; g.add(deck);
    for (const mx of [-L * 0.2, L * 0.2]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 6), lam(0x4a3426)); mast.position.set(mx, 3.8, 0); g.add(mast);
      const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; const c = cv.getContext('2d');
      c.fillStyle = p.sail || '#e8e0cc'; c.fillRect(0, 0, 32, 32); c.fillStyle = p.mark || '#c9a040'; c.beginPath(); c.arc(16, 16, 7, 0, Math.PI * 2); c.fill();
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3), new THREE.MeshLambertMaterial({ map: canvasTex(cv), side: THREE.DoubleSide })); sail.position.set(mx, 4.2, 0.1); sail.rotation.y = Math.PI / 2 * 0.15; sail.castShadow = true; g.add(sail);
    }
    g.position.set(p.x, W.sea + 0.2, p.z); g.rotation.y = p.rot || 0;
    W.group.add(g);
    if (p.lights !== false) for (const dx of [-L / 2 + 0.4, L / 2 - 0.2]) { const v = new THREE.Vector3(dx, 1.6, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.rot || 0).add(g.position); W.lightSources.push({ pos: v, color: new THREE.Color('#ffb860'), intensity: 12, range: 6, flicker: true }); }
    const base = g.position.y, ph = Math.random() * 6;
    W.anims.push((dt, t) => { g.position.y = base + Math.sin(t * 0.9 + ph) * 0.08; g.rotation.z = Math.sin(t * 0.7 + ph) * 0.025; });
  },
  arch(W, p) {
    const y = W.groundY(p.x, p.z), g = new THREE.Group(), w = p.w || 3, hh = p.h || 3.2;
    for (const dx of [0, w - 0.8]) { const pil = new THREE.Mesh(new THREE.BoxGeometry(0.8, hh, 0.8), texMat('ruinwall')); pil.position.set(dx + 0.4, hh / 2, 0.4); pil.castShadow = true; g.add(pil); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.7, 1.0), texMat('ruinwall2')); top.position.set(w / 2, hh + 0.35, 0.4); top.castShadow = true; g.add(top);
    g.position.set(p.x, y, p.z); W.group.add(g);
    W.colliders.push({ x: p.x + 0.4, z: p.z + 0.4, r: 0.5 }, { x: p.x + w - 0.4, z: p.z + 0.4, r: 0.5 });
  },
  statue(W, p) {
    const y = W.groundY(p.x, p.z), g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 1), texMat('slab')); base.position.y = 0.3; g.add(base);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 1.6, 8), texMat('ruinwall2')); body.position.y = 1.4; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), texMat('ruinwall2')); head.position.y = 2.45; head.castShadow = true; g.add(head);
    if (p.lamp) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.22), new THREE.MeshLambertMaterial({ color: 0x302a20, emissive: 0xffc070, emissiveIntensity: p.lit ? 1.6 : 0.1 })); l.position.set(0.42, 1.7, 0.2); g.add(l); }
    g.position.set(p.x + 0.5, y, p.z + 0.5); W.group.add(g);
    W.colliders.push({ x: p.x + 0.5, z: p.z + 0.5, r: 0.55 });
  },
  mural(W, p) {
    const y = W.groundY(p.x, p.z);
    const cv = document.createElement('canvas'); cv.width = 192; cv.height = 96; const c = cv.getContext('2d');
    c.fillStyle = '#5a6460'; c.fillRect(0, 0, 192, 96);
    const g2 = c.createLinearGradient(0, 0, 0, 96); g2.addColorStop(0, '#1e2a40'); g2.addColorStop(0.55, '#2c3c58'); g2.addColorStop(0.56, '#1a4a5a'); g2.addColorStop(1, '#0e2a36');
    c.fillStyle = g2; c.fillRect(6, 6, 180, 84);
    c.fillStyle = '#e8e6d8'; c.beginPath(); c.arc(70, 46, 15, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#e8e6d8'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(80 - i * 3, 30 - i * 4); c.lineTo(110 - i * 2, 6); c.stroke(); }
    c.fillStyle = '#f2d36a'; c.fillRect(150, 30, 6, 40); c.beginPath(); c.moveTo(146, 30); c.lineTo(160, 30); c.lineTo(153, 22); c.fill();
    c.fillStyle = 'rgba(255,220,140,.35)'; c.beginPath(); c.moveTo(153, 26); c.lineTo(60, 10); c.lineTo(60, 60); c.fill();
    for (let i = 0; i < 9; i++) { c.fillStyle = '#d8e8e0'; c.fillRect(14 + i * 19, 74 + (i % 2) * 3, 10, 2); }
    c.fillStyle = '#3a4440'; for (let i = 0; i < 260; i++) c.fillRect(Math.random() * 192, Math.random() * 96, 1, 1);
    const t = canvasTex(cv);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w || 6, (p.w || 6) / 2), new THREE.MeshLambertMaterial({ map: t, emissive: new THREE.Color('#203040'), emissiveIntensity: 0.4 }));
    m.position.set(p.x, y + (p.y || 2.2), p.z); m.rotation.y = p.rot || 0; W.group.add(m);
  },
  brazier(W, p) {
    const y = W.groundY(p.x, p.z);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.2, 0.3, 8), lam(0x3a3430)); bowl.position.set(p.x + 0.5, y + 0.95, p.z + 0.5); W.group.add(bowl);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.9, 6), lam(0x2a2420)); leg.position.set(p.x + 0.5, y + 0.45, p.z + 0.5); W.group.add(leg);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.6) })); fl.position.set(p.x + 0.5, y + 1.3, p.z + 0.5); W.group.add(fl);
    W.anims.push((dt, t) => { fl.scale.y = 0.85 + Math.sin(t * 13 + p.x) * 0.15; });
    W.lightSources.push({ pos: new THREE.Vector3(p.x + 0.5, y + 1.6, p.z + 0.5), color: new THREE.Color(p.color || '#ff9a40'), intensity: p.i || 13, range: 6.5, flicker: true });
    W.colliders.push({ x: p.x + 0.5, z: p.z + 0.5, r: 0.35 });
  },
  coral(W, p) {
    const r = rng((p.x * 13 + p.z * 7) | 0);
    for (let i = 0; i < (p.n || 4); i++) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.12 + r() * 0.1, 0.5 + r() * 0.6, 5), lam([0xd86a6a, 0xe8a07a, 0xb85aa0, 0xe8d08a][i % 4]));
      m.position.set(p.x + 0.2 + r() * 0.6, W.groundY(p.x, p.z) + 0.3, p.z + 0.2 + r() * 0.6); m.rotation.z = (r() - 0.5) * 0.6; W.group.add(m);
    }
  },
  wreck(W, p) {
    const y = W.groundY(p.x, p.z), g = new THREE.Group();
    for (let i = 0; i < 7; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.09, 4, 10, Math.PI * 0.9), texMat('planks2')); rib.position.set(i * 0.7, 0.1, 0); rib.rotation.y = Math.PI / 2; rib.rotation.z = Math.PI; rib.castShadow = true; g.add(rib); }
    const keel = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 0.25), texMat('planks2')); keel.position.set(2.1, -1.0, 0); g.add(keel);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4, 6), lam(0x4a3426)); mast.position.set(2, 0.6, 0.4); mast.rotation.z = 0.9; mast.castShadow = true; g.add(mast);
    g.position.set(p.x, y + 1.0, p.z); g.rotation.y = p.rot || 0; W.group.add(g);
    for (let i = 0; i < 5; i++) W.colliders.push({ x: p.x + Math.cos(p.rot || 0) * i * 1.0, z: p.z - Math.sin(p.rot || 0) * i * 1.0, r: 0.9 });
  },
  well(W, p) {
    const y = W.groundY(p.x, p.z);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.7, 12, 1, true), texMat('cobble'));
    ring.position.set(p.x + 0.5, y + 0.35, p.z + 0.5); ring.castShadow = true; W.group.add(ring);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12), lam(0x102838)); water.rotation.x = -Math.PI / 2; water.position.set(p.x + 0.5, y + 0.45, p.z + 0.5); W.group.add(water);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.6, 4), texMat('roofbrown')); roof.position.set(p.x + 0.5, y + 1.8, p.z + 0.5); roof.rotation.y = Math.PI / 4; roof.castShadow = true; W.group.add(roof);
    for (const dx of [-0.5, 0.5]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), lam(0x5a4030)); post.position.set(p.x + 0.5 + dx, y + 1.0, p.z + 0.5); W.group.add(post); }
    W.colliders.push({ x: p.x + 0.5, z: p.z + 0.5, r: 0.7 });
  },
};
