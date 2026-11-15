// 天空：漸層、星星、月亮、夕陽、極光、煙火映在天上的光；還有雪
import * as THREE from 'three';
import { U } from './glow.js';

const V3 = (h) => new THREE.Color(h);

// 四種場景
export const MOODS = {
  night: {
    name: '夜晚', top: '#03050f', mid: '#0a1230', hor: '#1d2c55', below: '#05070e',
    sun: '#000000', sunDir: [-0.7, 0.02, -0.7], sunSize: 0, moon: 1, stars: 1, aurora: 0, city: '#5a4630',
    fog: '#0a1022', fogD: 0.0016, hemiSky: '#3a4f8a', hemiGround: '#0b0d14', hemi: 0.55, moonLight: 0.55, lake: '#040812', snow: 0, exposure: 1.0,
  },
  dusk: {
    name: '黃昏', top: '#14204a', mid: '#5a3a7a', hor: '#ff8a4c', below: '#1a1018',
    sun: '#ff7a3a', sunDir: [-0.82, 0.035, -0.57], sunSize: 1, moon: 0.35, stars: 0.18, aurora: 0, city: '#6a4030',
    fog: '#4a3050', fogD: 0.0015, hemiSky: '#ffb090', hemiGround: '#2a1a26', hemi: 1.05, moonLight: 0.25, lake: '#120c18', snow: 0, exposure: 1.0,
  },
  snow: {
    name: '雪夜', top: '#0b1020', mid: '#1c2438', hor: '#3c4866', below: '#141824',
    sun: '#000000', sunDir: [0, -1, 0], sunSize: 0, moon: 0.35, stars: 0.12, aurora: 0, city: '#5a5060',
    fog: '#2a3450', fogD: 0.0038, hemiSky: '#8fa3d0', hemiGround: '#3a4050', hemi: 0.75, moonLight: 0.3, lake: '#0a1020', snow: 1, exposure: 1.0,
  },
  aurora: {
    name: '極光', top: '#01030a', mid: '#05122a', hor: '#0e2a40', below: '#03060a',
    sun: '#000000', sunDir: [0, -1, 0], sunSize: 0, moon: 0.25, stars: 1.3, aurora: 1, city: '#33403a',
    fog: '#06121c', fogD: 0.0012, hemiSky: '#3a7a7a', hemiGround: '#05080c', hemi: 0.55, moonLight: 0.3, lake: '#03100f', snow: 0, exposure: 1.0,
  },
};

const VS = `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }`;
const FS = `
varying vec3 vDir;
uniform vec3 uTop, uMid, uHor, uBelow, uSun, uSunDir, uMoonDir, uFlashDir, uFlashCol, uFlash2Dir, uFlash2Col, uCity;
uniform float uSunSize, uMoon, uStars, uAurora, uTime;
float h13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h12(i), h12(i+vec2(1,0)), f.x), mix(h12(i+vec2(0,1)), h12(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.; for (int i = 0; i < 4; i++){ s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.28, h));
  col = mix(col, uTop, smoothstep(0.22, 0.95, h));
  col = mix(col, uBelow, smoothstep(0.0, -0.08, h));
  // 城市光害貼在地平線
  col += uCity * exp(-abs(h) * 22.0) * 0.55;
  // 夕陽
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSun * (pow(sd, 5.0) * 0.55 + pow(sd, 60.0) * 0.8 + smoothstep(0.9985, 0.9993, sd) * 6.0) * uSunSize;
  // 月亮：圓盤＋月暈，帶一點月海的斑紋
  float md = dot(d, uMoonDir);
  if (uMoon > 0.0) {
    float disc = smoothstep(0.99955, 0.99972, md);
    vec3 mp = d - uMoonDir * md;
    float mare = vn(mp.xy * 2600.0) * 0.35 + vn(mp.yz * 5200.0) * 0.15;
    col += vec3(1.0, 0.96, 0.86) * disc * (2.6 - mare * 1.6) * uMoon;
    col += vec3(0.55, 0.62, 0.85) * (pow(max(md, 0.0), 160.0) * 0.35 + pow(max(md, 0.0), 14.0) * 0.06) * uMoon;
  }
  // 星星
  if (uStars > 0.0 && h > 0.0) {
    vec3 sp = d * 260.0; vec3 cell = floor(sp); float r = h13(cell);
    if (r > 0.972) {
      vec3 c = cell + 0.5 + (vec3(h13(cell + 7.1), h13(cell + 3.3), h13(cell + 1.7)) - 0.5) * 0.5;
      float dd = length(sp - c);
      float tw = 0.65 + 0.35 * sin(uTime * (1.3 + r * 4.0) + r * 91.0);
      float big = (r - 0.972) * 36.0;
      vec3 sc = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.86, 0.7), h13(cell + 9.0));
      col += sc * smoothstep(0.42, 0.0, dd) * tw * uStars * smoothstep(0.02, 0.25, h) * (0.35 + big * 1.6);
    }
    // 銀河
    float band = exp(-pow(dot(d, normalize(vec3(0.35, 0.25, 0.9))) * 3.2, 2.0));
    col += vec3(0.18, 0.2, 0.32) * band * fbm(d.xz * 9.0 + d.y * 4.0) * 0.32 * uStars * smoothstep(0.05, 0.4, h);
  }
  // 極光：投影到天上一個平面，北方（-z）一道會飄的光幕
  if (uAurora > 0.0 && h > 0.0) {
    vec2 p = d.xz / (h + 0.06);
    float acc = 0.0; vec3 ac = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float cx = -2.2 - fi * 0.55 + sin(p.x * (0.35 + fi * 0.1) + uTime * (0.07 + fi * 0.02) + fi * 2.0) * 0.55 + fbm(vec2(p.x * 0.5 + uTime * 0.03, fi * 3.0)) * 0.6;
      float dy = p.y - cx;
      float curtain = dy > 0.0 ? exp(-dy * (2.4 + fi)) : exp(dy * 9.0);
      float rays = 0.45 + 0.55 * fbm(vec2(p.x * 5.0 + uTime * 0.25 * (1.0 + fi * 0.3), fi * 7.0 + uTime * 0.05));
      float a = curtain * rays * (0.9 - fi * 0.22);
      vec3 c = mix(vec3(0.15, 1.0, 0.55), vec3(0.65, 0.3, 1.0), clamp(dy * 1.2, 0.0, 1.0) + fi * 0.15);
      ac += c * a;
    }
    col += ac * 0.75 * uAurora * smoothstep(0.0, 0.12, h) * (1.0 - smoothstep(0.75, 1.0, h));
  }
  // 煙火映在天上（兩盞）
  float f1 = max(dot(d, uFlashDir), 0.0), f2 = max(dot(d, uFlash2Dir), 0.0);
  col += uFlashCol * (pow(f1, 12.0) * 0.45 + pow(f1, 3.0) * 0.025);
  col += uFlash2Col * (pow(f2, 12.0) * 0.45 + pow(f2, 3.0) * 0.025);
  gl_FragColor = vec4(col, 1.0);
}`;

export class Sky {
  constructor(scene) {
    const u = this.u = {
      uTop: { value: V3('#000') }, uMid: { value: V3('#000') }, uHor: { value: V3('#000') }, uBelow: { value: V3('#000') },
      uSun: { value: V3('#000') }, uSunDir: { value: new THREE.Vector3(0, -1, 0) }, uSunSize: { value: 0 },
      uMoonDir: { value: new THREE.Vector3(0.45, 0.42, -0.79).normalize() }, uMoon: { value: 1 }, uStars: { value: 1 }, uAurora: { value: 0 },
      uCity: { value: V3('#000') }, uTime: U.uTime,
      uFlashDir: { value: new THREE.Vector3(0, 1, 0) }, uFlashCol: { value: new THREE.Color(0, 0, 0) },
      uFlash2Dir: { value: new THREE.Vector3(0, 1, 0) }, uFlash2Col: { value: new THREE.Color(0, 0, 0) },
    };
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
    scene.add(this.mesh);
    this.cur = null;
  }
  // 平滑過渡到某個場景（k：0→1）
  blend(a, b, k) {
    const u = this.u, c = new THREE.Color(), c2 = new THREE.Color();
    const mix = (key, uni) => { c.set(a[key]); c2.set(b[key]); uni.value.copy(c).lerp(c2, k); };
    mix('top', u.uTop); mix('mid', u.uMid); mix('hor', u.uHor); mix('below', u.uBelow); mix('sun', u.uSun); mix('city', u.uCity);
    const sd = new THREE.Vector3(...a.sunDir).lerp(new THREE.Vector3(...b.sunDir), k).normalize();
    u.uSunDir.value.copy(sd);
    u.uSunSize.value = a.sunSize + (b.sunSize - a.sunSize) * k;
    u.uMoon.value = a.moon + (b.moon - a.moon) * k;
    u.uStars.value = a.stars + (b.stars - a.stars) * k;
    u.uAurora.value = a.aurora + (b.aurora - a.aurora) * k;
  }
  follow(cam) { this.mesh.position.copy(cam.position); }
}

// 雪：GPU 自己算位置，跟著鏡頭走
export class Snow {
  constructor(scene, count) {
    const pos = new Float32Array(count * 3), seed = new Float32Array(count);
    for (let i = 0; i < count; i++) { pos[i * 3] = Math.random() * 120; pos[i * 3 + 1] = Math.random() * 70; pos[i * 3 + 2] = Math.random() * 120; seed[i] = Math.random(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    this.u = { uTime: U.uTime, uScale: U.uScale, uCam: { value: new THREE.Vector3() }, uAmt: { value: 0 } };
    const m = new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false,
      vertexShader: `attribute float seed; uniform float uTime, uScale, uAmt; uniform vec3 uCam; varying float vA;
        void main(){
          vec3 p = position;
          p.y = mod(p.y - uTime * (1.4 + seed * 1.2), 70.0);
          p.x += sin(uTime * (0.6 + seed) + seed * 40.0) * 1.2 + uTime * 0.6;
          p.z += cos(uTime * (0.5 + seed * 0.7) + seed * 20.0) * 1.2;
          vec3 w = vec3(mod(p.x - uCam.x + 60.0, 120.0) - 60.0 + uCam.x, p.y + max(uCam.y - 35.0, 0.0), mod(p.z - uCam.z + 60.0, 120.0) - 60.0 + uCam.z);
          vec4 mv = viewMatrix * vec4(w, 1.0);
          gl_PointSize = min((0.09 + seed * 0.1) * uScale / max(-mv.z, 0.5), 24.0);
          vA = uAmt * (0.55 + seed * 0.45) * smoothstep(1.0, 4.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA; void main(){ vec2 p = gl_PointCoord*2.-1.; float d = dot(p,p); if (d>1.) discard; gl_FragColor = vec4(vec3(0.95,0.97,1.0)*1.1, (1.0-d) * vA); }`,
    });
    this.pts = new THREE.Points(g, m);
    this.pts.frustumCulled = false;
    this.pts.visible = false;
    scene.add(this.pts);
  }
  update(cam, amt) { this.u.uCam.value.copy(cam.position); this.u.uAmt.value = amt; this.pts.visible = amt > 0.01; }
}
