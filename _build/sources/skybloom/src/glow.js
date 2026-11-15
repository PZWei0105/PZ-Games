// 發光點：燈泡、煙火火星、噴泉水珠都用它。REFLECT 版本畫在湖面上的倒影（用同一份幾何，不多花 CPU）
import * as THREE from 'three';

// 全場共用的 uniform
export const U = {
  uScale: { value: 800 },      // 畫面高度（像素）／(2·tan(fov/2))：把公尺換成像素
  uTime: { value: 0 },
  uLake: { value: new THREE.Vector4(0, -82, 74, 32) }, // 湖心 x、z，半徑 x、z
  uWaterY: { value: 0.06 },
  uMax: { value: 90 },          // 單點最大像素
  uSnow: { value: 0 },          // 雪夜：屋頂、樹梢、地面變白
  uReflect: { value: 0.5 },     // 倒影亮度
};

const VERT = (fn, attrs) => `
attribute vec3 color; attribute float size; ${attrs}
uniform float uScale, uTime, uWaterY, uMax, uReflect; uniform vec4 uLake;
varying vec3 vCol;
vec3 hue(float h){ vec3 k = clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1., 0., 1.); return k*k; }
void main(){
  vec3 col = color; float sz = size; vec3 pos = position;
  ${fn}
  vec4 wp = modelMatrix * vec4(pos, 1.0);
#ifdef REFLECT
  vec3 M = vec3(wp.x, 2.0 * uWaterY - wp.y, wp.z);
  vec3 C = cameraPosition;
  float t = (C.y - uWaterY) / max(C.y - M.y, 1e-3);
  vec3 H = C + (M - C) * t;
  vec2 q = (H.xz - uLake.xy) / uLake.zw;
  float inside = 1.0 - smoothstep(0.82, 0.98, length(q));
  if (C.y < uWaterY + 0.3 || wp.y < uWaterY + 0.2) inside = 0.0;
  H.x += sin(uTime * 1.3 + H.z * 0.7) * 0.18;
  H.z += sin(uTime * 0.9 + H.x * 0.5) * 0.35;
  vec4 mv = viewMatrix * vec4(H.x, uWaterY + 0.03, H.z, 1.0);
  gl_PointSize = sz * uScale / max(length(M - C), 0.5) * 1.15;
  col *= uReflect * inside;
#else
  vec4 mv = viewMatrix * wp;
  gl_PointSize = sz * uScale / max(-mv.z, 0.5);
#endif
  gl_PointSize = min(gl_PointSize, uMax);
  if (dot(col, col) < 1e-7 || gl_PointSize < 0.35) { gl_PointSize = 0.0; gl_Position = vec4(2.,2.,2.,1.); vCol = vec3(0.); return; }
  // 小於一個像素的點：放大到一個像素、亮度按面積打折，不會一閃一閃
  if (gl_PointSize < 1.6) { col *= gl_PointSize * gl_PointSize / 2.56; gl_PointSize = 1.6; }
  vCol = col;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
varying vec3 vCol;
uniform float uCore;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  if (d > 1.0) discard;
  float a = exp(-d * 4.5) * 0.75 + exp(-d * 30.0) * uCore;
  gl_FragColor = vec4(vCol * a, 1.0);
}`;

export function glowMaterial({ fn = '', attrs = '', reflect = false, core = 0.9, depthTest = true, uniforms = {} } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT(fn, attrs),
    fragmentShader: FRAG,
    uniforms: { ...U, uCore: { value: core }, ...uniforms },
    defines: reflect ? { REFLECT: 1 } : {},
    transparent: true,
    depthWrite: false,
    depthTest,
    blending: THREE.AdditiveBlending,
  });
}

// positions: number[]、colors: number[]（線性 RGB，可大於 1）、sizes: number|number[]
export function glowPoints(positions, colors, sizes, opts = {}) {
  const g = new THREE.BufferGeometry();
  const n = positions.length / 3;
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const s = typeof sizes === 'number' ? new Array(n).fill(sizes) : sizes;
  g.setAttribute('size', new THREE.Float32BufferAttribute(s, 1));
  if (opts.extra) for (const [k, v] of Object.entries(opts.extra)) g.setAttribute(k, new THREE.Float32BufferAttribute(v.data, v.size));
  const pts = new THREE.Points(g, glowMaterial(opts));
  pts.frustumCulled = false;
  if (opts.reflect !== false && opts.withReflect) {
    const r = new THREE.Points(g, glowMaterial({ ...opts, reflect: true }));
    r.frustumCulled = false;
    pts.userData.reflection = r;
  }
  return pts;
}

// 把材質加上「雪會積在朝上的面」：所有 MeshStandardMaterial 都可以用
export function snowable(mat, amount = 1) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSnow = U.uSnow;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vUpY;')
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\n vUpY = inverseTransformDirection(transformedNormal, viewMatrix).y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vUpY; uniform float uSnow;')
      .replace('#include <color_fragment>', `#include <color_fragment>
  { float sk = uSnow * ${amount.toFixed(2)} * smoothstep(0.25, 0.75, vUpY);
    float lum = dot(diffuseColor.rgb, vec3(0.3,0.59,0.11));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62,0.68,0.78) * (0.75 + lum * 1.5), sk); }`);
  };
  mat.customProgramCacheKey = () => 'snow' + amount;
  return mat;
}
