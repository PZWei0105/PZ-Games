// 渲染器：場景 → 景深＋泛光＋暗角 → 畫面
import * as THREE from 'three';

const FS_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const COPY_FRAG = `uniform sampler2D tex; uniform vec2 texel; varying vec2 vUv;
void main(){
  vec4 c = texture2D(tex, vUv + texel*vec2(-0.5,-0.5)) + texture2D(tex, vUv + texel*vec2(0.5,-0.5))
         + texture2D(tex, vUv + texel*vec2(-0.5,0.5)) + texture2D(tex, vUv + texel*vec2(0.5,0.5));
  gl_FragColor = c * 0.25;
}`;

const BRIGHT_FRAG = `uniform sampler2D tex; uniform vec2 texel; uniform float threshold; varying vec2 vUv;
void main(){
  vec3 c = (texture2D(tex, vUv + texel*vec2(-0.5,-0.5)).rgb + texture2D(tex, vUv + texel*vec2(0.5,-0.5)).rgb
         + texture2D(tex, vUv + texel*vec2(-0.5,0.5)).rgb + texture2D(tex, vUv + texel*vec2(0.5,0.5)).rgb) * 0.25;
  float l = max(c.r, max(c.g, c.b));
  float k = smoothstep(threshold, threshold + 0.6, l);
  gl_FragColor = vec4(c * k, 1.0);
}`;

const BLUR_FRAG = `uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
void main(){
  vec4 s = texture2D(tex, vUv) * 0.227027;
  s += texture2D(tex, vUv + dir * 1.3846153846) * 0.3162162162;
  s += texture2D(tex, vUv - dir * 1.3846153846) * 0.3162162162;
  s += texture2D(tex, vUv + dir * 3.2307692308) * 0.0702702703;
  s += texture2D(tex, vUv - dir * 3.2307692308) * 0.0702702703;
  gl_FragColor = s;
}`;

const COMP_FRAG = `#include <packing>
uniform sampler2D tMain; uniform sampler2D tBlur; uniform sampler2D tB1; uniform sampler2D tB2; uniform sampler2D tDepth;
uniform float cNear; uniform float cFar; uniform float focusDist; uniform float focusRange; uniform float dof;
uniform float bloom; uniform float vignette; uniform vec2 res; uniform float time; uniform vec4 flash;
uniform float sat; uniform vec3 lift; uniform vec3 gain; uniform float tilt; uniform float useDof; uniform float useBloom;
uniform float fade;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec4 base = texture2D(tMain, vUv);
  vec3 col = base.rgb;
  if (useDof > 0.5) {
    float d = texture2D(tDepth, vUv).x;
    float vz = -perspectiveDepthToViewZ(d, cNear, cFar);
    float coc = smoothstep(focusRange, focusRange * 2.6, abs(vz - focusDist));
    coc = max(coc, smoothstep(0.86, 1.02, vUv.y) * tilt);
    coc = max(coc, smoothstep(0.10, -0.04, vUv.y) * tilt * 0.6);
    vec3 bl = texture2D(tBlur, vUv).rgb;
    col = mix(col, bl, clamp(coc * dof, 0.0, 1.0));
  }
  if (useBloom > 0.5) {
    col += (texture2D(tB1, vUv).rgb * 0.75 + texture2D(tB2, vUv).rgb * 0.9) * bloom;
  }
  // 調色
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, sat);
  col = col * gain + lift * (1.0 - clamp(col, 0.0, 1.0));
  vec2 q = vUv - 0.5; q.x *= res.x / res.y;
  float v = smoothstep(1.05, 0.25, length(q) * 1.15);
  col *= mix(1.0, v, vignette);
  col = mix(col, flash.rgb, flash.a);
  col *= fade;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash(vUv * res + time) - 0.5) / 255.0;
}`;

function fsMat(frag, uniforms, extra = {}) {
  return new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, ...extra });
}

export class Renderer {
  constructor(container) {
    const r = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.shadowMap.autoUpdate = false;
    r.setClearColor(0x05070c, 1);
    container.appendChild(r.domElement);
    r.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
    this.r = r;
    this.container = container;
    const gl = r.getContext();
    this.hdr = r.capabilities.isWebGL2 && !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
    this.quality = 'high';
    this.fxScale = 1; // 特效強度
    this.post = {
      focusDist: 14, focusRange: 3.2, dof: 1, bloom: 0.55, vignette: 0.45, sat: 1.0, tilt: 0.35,
      lift: new THREE.Vector3(0.012, 0.012, 0.03), gain: new THREE.Vector3(1, 1, 1), flash: new THREE.Vector4(1, 1, 1, 0), threshold: 0.85, fade: 1,
    };
    this.fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.fsScene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.fsScene.add(this.quad);
    this.mCopy = fsMat(COPY_FRAG, { tex: { value: null }, texel: { value: new THREE.Vector2() } });
    this.mBright = fsMat(BRIGHT_FRAG, { tex: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 0.85 } });
    this.mBlur = fsMat(BLUR_FRAG, { tex: { value: null }, dir: { value: new THREE.Vector2() } });
    this.mComp = fsMat(COMP_FRAG, {
      tMain: { value: null }, tBlur: { value: null }, tB1: { value: null }, tB2: { value: null }, tDepth: { value: null },
      cNear: { value: 0.1 }, cFar: { value: 100 }, focusDist: { value: 14 }, focusRange: { value: 3 }, dof: { value: 1 }, bloom: { value: 0.5 },
      vignette: { value: 0.4 }, res: { value: new THREE.Vector2() }, time: { value: 0 }, flash: { value: new THREE.Vector4() }, sat: { value: 1 },
      lift: { value: new THREE.Vector3() }, gain: { value: new THREE.Vector3(1, 1, 1) }, tilt: { value: 0.3 }, useDof: { value: 1 }, useBloom: { value: 1 }, fade: { value: 1 },
    }, { toneMapped: true });
    this.rts = null;
    this.resize();
  }
  setQuality(q) { this.quality = q; this.resize(); }
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
    const W = Math.floor(w * dpr), H = Math.floor(h * dpr);
    this.W = W; this.H = H;
    if (this.rts) Object.values(this.rts).forEach((t) => t.dispose());
    const type = this.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const mk = (a, b, depth) => {
      const t = new THREE.WebGLRenderTarget(Math.max(1, a), Math.max(1, b), { type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!depth });
      if (depth) { t.depthTexture = new THREE.DepthTexture(Math.max(1, a), Math.max(1, b)); t.depthTexture.type = THREE.UnsignedIntType; }
      return t;
    };
    this.rts = {
      main: mk(W, H, true),
      h1: mk(W >> 1, H >> 1), h2: mk(W >> 1, H >> 1),
      q1: mk(W >> 2, H >> 2), q2: mk(W >> 2, H >> 2),
      e1: mk(W >> 3, H >> 3), e2: mk(W >> 3, H >> 3),
    };
    this.mComp.uniforms.res.value.set(W, H);
  }
  pass(mat, target) {
    this.quad.material = mat;
    this.r.setRenderTarget(target);
    this.r.render(this.fsScene, this.fsCam);
  }
  render(scene, camera, t = 0) {
    const r = this.r, P = this.post;
    const usePost = this.quality !== 'low';
    if (!usePost) {
      r.setRenderTarget(null);
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.render(scene, camera);
      return;
    }
    const R = this.rts;
    r.setRenderTarget(R.main);
    r.render(scene, camera);
    const useDof = P.dof * this.fxScale > 0.01, useBloom = P.bloom * this.fxScale > 0.01;
    // 半解析度（景深模糊）
    this.mCopy.uniforms.tex.value = R.main.texture; this.mCopy.uniforms.texel.value.set(1 / this.W, 1 / this.H);
    this.pass(this.mCopy, R.h1);
    if (useDof) {
      this.mBlur.uniforms.tex.value = R.h1.texture; this.mBlur.uniforms.dir.value.set(1.4 / R.h1.width, 0);
      this.pass(this.mBlur, R.h2);
      this.mBlur.uniforms.tex.value = R.h2.texture; this.mBlur.uniforms.dir.value.set(0, 1.4 / R.h1.height);
      this.pass(this.mBlur, R.h1);
    }
    if (useBloom) {
      this.mBright.uniforms.tex.value = R.h1.texture; this.mBright.uniforms.texel.value.set(1 / R.h1.width, 1 / R.h1.height);
      this.mBright.uniforms.threshold.value = P.threshold;
      this.pass(this.mBright, R.q1);
      this.mBlur.uniforms.tex.value = R.q1.texture; this.mBlur.uniforms.dir.value.set(1 / R.q1.width, 0); this.pass(this.mBlur, R.q2);
      this.mBlur.uniforms.tex.value = R.q2.texture; this.mBlur.uniforms.dir.value.set(0, 1 / R.q1.height); this.pass(this.mBlur, R.q1);
      this.mCopy.uniforms.tex.value = R.q1.texture; this.mCopy.uniforms.texel.value.set(1 / R.q1.width, 1 / R.q1.height); this.pass(this.mCopy, R.e1);
      this.mBlur.uniforms.tex.value = R.e1.texture; this.mBlur.uniforms.dir.value.set(1.5 / R.e1.width, 0); this.pass(this.mBlur, R.e2);
      this.mBlur.uniforms.tex.value = R.e2.texture; this.mBlur.uniforms.dir.value.set(0, 1.5 / R.e1.height); this.pass(this.mBlur, R.e1);
    }
    const U = this.mComp.uniforms;
    U.tMain.value = R.main.texture; U.tBlur.value = R.h1.texture; U.tB1.value = R.q1.texture; U.tB2.value = R.e1.texture; U.tDepth.value = R.main.depthTexture;
    U.cNear.value = camera.near; U.cFar.value = camera.far;
    U.focusDist.value = P.focusDist; U.focusRange.value = P.focusRange; U.dof.value = P.dof * this.fxScale; U.bloom.value = P.bloom * Math.min(1, this.fxScale * 1.2);
    U.vignette.value = P.vignette; U.time.value = t % 100; U.flash.value.copy(P.flash); U.sat.value = P.sat; U.lift.value.copy(P.lift); U.gain.value.copy(P.gain);
    U.tilt.value = P.tilt * this.fxScale; U.useDof.value = useDof ? 1 : 0; U.useBloom.value = useBloom ? 1 : 0; U.fade.value = P.fade;
    this.pass(this.mComp, null);
  }
}
