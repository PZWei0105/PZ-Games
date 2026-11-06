// 渲染器：場景 →（多重取樣抗鋸齒）→ 泛光 → 調色 → 畫面
import * as THREE from 'three';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const DOWN = `uniform sampler2D tex; uniform vec2 texel; uniform float threshold; varying vec2 vUv;
vec3 pick(vec2 o){ vec3 c = texture2D(tex, vUv + texel * o).rgb; return c; }
void main(){
  vec3 c = (pick(vec2(-1.,-1.)) + pick(vec2(1.,-1.)) + pick(vec2(-1.,1.)) + pick(vec2(1.,1.))) * 0.25;
  if (threshold > 0.0) { float l = max(c.r, max(c.g, c.b)); c *= smoothstep(threshold, threshold + 0.7, l); }
  gl_FragColor = vec4(c, 1.0);
}`;
const BLUR = `uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
void main(){
  vec4 s = texture2D(tex, vUv) * 0.2270270;
  s += texture2D(tex, vUv + dir * 1.3846153) * 0.3162162; s += texture2D(tex, vUv - dir * 1.3846153) * 0.3162162;
  s += texture2D(tex, vUv + dir * 3.2307692) * 0.0702702; s += texture2D(tex, vUv - dir * 3.2307692) * 0.0702702;
  gl_FragColor = s;
}`;
const COMP = `uniform sampler2D tMain; uniform sampler2D tB1; uniform sampler2D tB2; uniform sampler2D tB3;
uniform float bloom; uniform float vignette; uniform vec2 res; uniform float time; uniform vec4 flash; uniform float fade; uniform float sat; uniform float aberr;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec2 q = vUv - 0.5;
  vec3 col;
  if (aberr > 0.0) {
    vec2 o = q * aberr * 0.012;
    col = vec3(texture2D(tMain, vUv + o).r, texture2D(tMain, vUv).g, texture2D(tMain, vUv - o).b);
  } else col = texture2D(tMain, vUv).rgb;
  col += (texture2D(tB1, vUv).rgb * 0.55 + texture2D(tB2, vUv).rgb * 0.75 + texture2D(tB3, vUv).rgb * 0.9) * bloom;
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, sat);
  q.x *= res.x / res.y;
  col *= mix(1.0, smoothstep(1.15, 0.2, length(q) * 1.1), vignette);
  col = mix(col, flash.rgb, flash.a);
  col *= fade;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash(vUv * res + time) - 0.5) / 255.0;
}`;
const mat = (frag, uniforms, extra = {}) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, ...extra });

export class Renderer {
  constructor(container) {
    const r = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false, preserveDrawingBuffer: false });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.setClearColor(0x04050a, 1);
    container.appendChild(r.domElement);
    r.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
    this.r = r;
    this.container = container;
    const gl = r.getContext();
    this.gl2 = r.capabilities.isWebGL2;
    this.hdr = this.gl2 && !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
    this.quality = 'high';
    this.post = { bloom: 0.6, threshold: 1.15, vignette: 0.42, flash: new THREE.Vector4(1, 1, 1, 0), fade: 1, sat: 1.04, aberr: 0 };
    this.fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.fsScene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.fsScene.add(this.quad);
    this.mDown = mat(DOWN, { tex: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 0 } });
    this.mBlur = mat(BLUR, { tex: { value: null }, dir: { value: new THREE.Vector2() } });
    this.mComp = mat(COMP, {
      tMain: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null }, bloom: { value: 1 }, vignette: { value: 0.4 },
      res: { value: new THREE.Vector2() }, time: { value: 0 }, flash: { value: new THREE.Vector4() }, fade: { value: 1 }, sat: { value: 1 }, aberr: { value: 0 },
    }, { toneMapped: true });
    this.rts = null;
    this.resize();
  }
  setQuality(q) { if (q === this.quality) return; this.quality = q; this.resize(); }
  dpr() {
    const d = window.devicePixelRatio || 1;
    return this.quality === 'high' ? Math.min(d, 2) : this.quality === 'mid' ? Math.min(d, 1.5) : Math.min(d, 1);
  }
  resize() {
    const w = this.container.clientWidth || window.innerWidth, h = this.container.clientHeight || window.innerHeight;
    this.w = w; this.h = h;
    const dpr = this.dpr();
    this.r.setPixelRatio(dpr);
    this.r.setSize(w, h, false);
    const W = Math.max(1, Math.floor(w * dpr)), H = Math.max(1, Math.floor(h * dpr));
    this.W = W; this.H = H;
    if (this.rts) Object.values(this.rts).forEach((t) => t.dispose());
    const type = this.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const mk = (a, b, ms) => new THREE.WebGLRenderTarget(Math.max(1, a), Math.max(1, b), { type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!ms, samples: ms && this.gl2 && this.quality !== 'low' ? 4 : 0 });
    this.rts = {
      main: mk(W, H, true),
      a1: mk(W >> 1, H >> 1), b1: mk(W >> 1, H >> 1),
      a2: mk(W >> 2, H >> 2), b2: mk(W >> 2, H >> 2),
      a3: mk(W >> 3, H >> 3), b3: mk(W >> 3, H >> 3),
    };
    this.mComp.uniforms.res.value.set(W, H);
  }
  pass(m, target) { this.quad.material = m; this.r.setRenderTarget(target); this.r.render(this.fsScene, this.fsCam); }
  down(src, dst, threshold = 0) {
    this.mDown.uniforms.tex.value = src.texture; this.mDown.uniforms.texel.value.set(0.5 / src.width, 0.5 / src.height); this.mDown.uniforms.threshold.value = threshold;
    this.pass(this.mDown, dst);
  }
  blur(a, b, k = 1) {
    this.mBlur.uniforms.tex.value = a.texture; this.mBlur.uniforms.dir.value.set(k / a.width, 0); this.pass(this.mBlur, b);
    this.mBlur.uniforms.tex.value = b.texture; this.mBlur.uniforms.dir.value.set(0, k / a.height); this.pass(this.mBlur, a);
  }
  render(scene, camera, t = 0) {
    const r = this.r, P = this.post, R = this.rts;
    r.setRenderTarget(R.main);
    r.render(scene, camera);
    this.down(R.main, R.a1, P.threshold);
    this.blur(R.a1, R.b1, 1);
    this.down(R.a1, R.a2); this.blur(R.a2, R.b2, 1.2);
    this.down(R.a2, R.a3); this.blur(R.a3, R.b3, 1.4);
    const U = this.mComp.uniforms;
    U.tMain.value = R.main.texture; U.tB1.value = R.a1.texture; U.tB2.value = R.a2.texture; U.tB3.value = R.a3.texture;
    U.bloom.value = P.bloom; U.vignette.value = P.vignette; U.time.value = t % 100; U.flash.value.copy(P.flash); U.fade.value = P.fade; U.sat.value = P.sat; U.aberr.value = P.aberr;
    this.pass(this.mComp, null);
  }
}
