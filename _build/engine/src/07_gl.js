/* ==========================================================================
   07 WebGL2 繪圖器
   - 所有東西都是「四邊形」：貼圖、圓、光暈、線、文字都走同一個批次，一次畫完。
   - 一般混合與「加亮（發光）」可以在同一批裡混著畫（預乘透明度的技巧），粒子不會打斷批次。
   - 同一批最多 8 張貼圖；換貼圖不必重送資料。
   - 後製：場景先畫到離屏畫布，再一次做泛光、衝擊波扭曲、色差、調色、暗角、閃白、顆粒。
   - iPhone 切到背景可能弄丟 WebGL（context lost）：會自動重建；一直救不回來就換成 Canvas2D。
   ========================================================================== */
const MAX_QUADS = 8192, VERT_WORDS = 6, QUAD_WORDS = VERT_WORDS * 4;
const BLEND = { normal: 0, multiply: 1, screen: 2, erase: 3, add: 4 };
const MODE = { sprite: 0, solid: 1, circle: 2, ring: 3, glow: 4, line: 5, silhouette: 6 };

const SPRITE_VS = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in vec4 aCol;
layout(location=3) in vec4 aExt;
uniform vec2 uView;
uniform vec2 uOff;
out vec2 vUV; out vec4 vCol; flat out int vTex; flat out int vMode; out float vAdd; out float vParam;
void main(){
  gl_Position = vec4(aPos * uView + uOff, 0.0, 1.0);
  vUV = aUV; vCol = aCol;
  vTex = int(aExt.x * 255.0 + 0.5); vMode = int(aExt.y * 255.0 + 0.5); vAdd = aExt.z; vParam = aExt.w;
}`;
const SPRITE_FS = `#version 300 es
precision mediump float;
uniform sampler2D uT[8];
in vec2 vUV; in vec4 vCol; flat in int vTex; flat in int vMode; in float vAdd; in float vParam;
out vec4 o;
vec4 tx(int i, vec2 uv){
  if(i==0) return texture(uT[0],uv); if(i==1) return texture(uT[1],uv); if(i==2) return texture(uT[2],uv); if(i==3) return texture(uT[3],uv);
  if(i==4) return texture(uT[4],uv); if(i==5) return texture(uT[5],uv); if(i==6) return texture(uT[6],uv); return texture(uT[7],uv);
}
void main(){
  vec4 col = vec4(vCol.rgb * vCol.a, vCol.a);
  vec4 c;
  if (vMode == 0) {
    c = tx(vTex, vUV) * col;
    if (vParam > 0.0) c.rgb = mix(c.rgb, vec3(c.a), vParam);
  } else if (vMode == 1) {
    c = col;
  } else if (vMode == 2) {
    float d = length(vUV); float aa = max(fwidth(d), 1e-4);
    c = col * (1.0 - smoothstep(1.0 - aa, 1.0, d));
  } else if (vMode == 3) {
    float d = length(vUV); float aa = max(fwidth(d), 1e-4); float inner = 1.0 - max(vParam, aa * 1.5);
    c = col * (smoothstep(inner - aa, inner, d) * (1.0 - smoothstep(1.0 - aa, 1.0, d)));
  } else if (vMode == 4) {
    float d = length(vUV); float a = max(0.0, 1.0 - d); a = a * a * (1.0 + vParam * 3.0 * a);
    c = col * a;
  } else if (vMode == 5) {
    float d = abs(vUV.y); float aa = max(fwidth(d), 1e-4);
    c = col * (1.0 - smoothstep(1.0 - aa, 1.0, d));
  } else {
    c = col * tx(vTex, vUV).a;
  }
  c.a *= (1.0 - vAdd);
  o = c;
}`;
const FULL_VS = `#version 300 es
out vec2 vUV;
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUV = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
const BRIGHT_FS = `#version 300 es
precision mediump float;
uniform sampler2D uTex; uniform vec2 uTexel; uniform float uThresh; in vec2 vUV; out vec4 o;
void main(){
  vec3 c = texture(uTex, vUV + uTexel * vec2(-0.5,-0.5)).rgb + texture(uTex, vUV + uTexel * vec2(0.5,-0.5)).rgb
         + texture(uTex, vUV + uTexel * vec2(-0.5,0.5)).rgb + texture(uTex, vUV + uTexel * vec2(0.5,0.5)).rgb;
  c *= 0.25;
  // 亮度：以人眼亮度為主（飽和的橘、紅這類「顏色很鮮但不是光」的美術不會整片發光），
  // 再參考最亮的通道（霓虹、火光這種純色光還是會微微發光）；疊加發光（add）疊出來的白光照樣強烈泛光
  float l = max(dot(c, vec3(0.2126, 0.7152, 0.0722)), max(c.r, max(c.g, c.b)) * 0.85);
  float k = smoothstep(uThresh, uThresh + 0.3, l) * (0.35 + 0.65 * min(l, 1.0));
  o = vec4(c * k, 1.0);
}`;
const DOWN_FS = `#version 300 es
precision mediump float;
uniform sampler2D uTex; uniform vec2 uTexel; in vec2 vUV; out vec4 o;
void main(){
  vec3 s = texture(uTex, vUV).rgb * 4.0;
  s += texture(uTex, vUV - uTexel).rgb; s += texture(uTex, vUV + uTexel).rgb;
  s += texture(uTex, vUV + vec2(uTexel.x, -uTexel.y)).rgb; s += texture(uTex, vUV - vec2(uTexel.x, -uTexel.y)).rgb;
  o = vec4(s / 8.0, 1.0);
}`;
const UP_FS = `#version 300 es
precision mediump float;
uniform sampler2D uTex; uniform vec2 uTexel; in vec2 vUV; out vec4 o;
void main(){
  vec2 h = uTexel * 0.5; vec3 s = vec3(0.0);
  s += texture(uTex, vUV + vec2(-h.x * 2.0, 0.0)).rgb; s += texture(uTex, vUV + vec2(-h.x, h.y)).rgb * 2.0;
  s += texture(uTex, vUV + vec2(0.0, h.y * 2.0)).rgb; s += texture(uTex, vUV + vec2(h.x, h.y)).rgb * 2.0;
  s += texture(uTex, vUV + vec2(h.x * 2.0, 0.0)).rgb; s += texture(uTex, vUV + vec2(h.x, -h.y)).rgb * 2.0;
  s += texture(uTex, vUV + vec2(0.0, -h.y * 2.0)).rgb; s += texture(uTex, vUV + vec2(-h.x, -h.y)).rgb * 2.0;
  o = vec4(s / 12.0, 1.0);
}`;
const COMP_FS = `#version 300 es
precision mediump float;
uniform sampler2D uScene; uniform sampler2D uBloom;
uniform vec2 uRes; uniform float uTime; uniform float uAspect;
uniform vec4 uWave[4]; uniform vec4 uWaveP[4]; uniform int uWaves;
uniform float uChroma; uniform float uBloomAmt; uniform float uVig; uniform vec3 uVigCol; uniform float uGrain;
uniform float uSat; uniform float uContrast; uniform float uBright; uniform vec3 uTint; uniform vec4 uFlash; uniform float uScan; uniform float uWarp;
in vec2 vUV; out vec4 o;
void main(){
  vec2 uv = vUV;
  if (uWarp > 0.0) { vec2 c = uv - 0.5; uv = 0.5 + c * (1.0 + dot(c, c) * uWarp); }
  for (int i = 0; i < 4; i++) {
    if (i >= uWaves) break;
    vec4 w = uWave[i]; vec2 d = uv - w.xy; d.x *= uAspect; float dist = length(d);
    float th = uWaveP[i].x; float k = 1.0 - smoothstep(0.0, th, abs(dist - w.z));
    if (dist > 0.0001) { vec2 n = d / dist; n.x /= uAspect; uv -= n * k * w.w; }
  }
  vec3 col;
  if (uChroma > 0.0) { vec2 off = (uv - 0.5) * uChroma; col = vec3(texture(uScene, uv + off).r, texture(uScene, uv).g, texture(uScene, uv - off).b); }
  else col = texture(uScene, uv).rgb;
  if (uBloomAmt > 0.0) col += texture(uBloom, uv).rgb * uBloomAmt;
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSat);
  col = (col - 0.5) * uContrast + 0.5 + uBright;
  col *= uTint;
  if (uVig > 0.0) { vec2 q = vUV - 0.5; q.x *= mix(1.0, uAspect, 0.5); float v = 1.0 - smoothstep(0.2, 0.85, length(q) * 1.15); col = mix(uVigCol, col, mix(1.0, v, uVig)); }
  if (uScan > 0.0) col *= 1.0 - uScan * (0.5 + 0.5 * sin(vUV.y * uRes.y * 3.14159));
  col = mix(col, uFlash.rgb, uFlash.a);
  if (uGrain > 0.0) { float n = fract(sin(dot(vUV * uRes + fract(uTime) * 91.7, vec2(12.9898, 78.233))) * 43758.5453); col += (n - 0.5) * uGrain; }
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

/** 後製參數（PZ.post）：特效模組會去動它們；遊戲也可以直接設 */
const Post = PZ.post = {
  enabled: true,
  bloom: { on: true, strength: 0.6, threshold: 0.78 },
  vignette: 0.35, vignetteColor: '#000', chroma: 0, grain: 0.035, scan: 0, warp: 0,
  sat: 1, contrast: 1, bright: 0, tint: [1, 1, 1],
  flash: [1, 1, 1, 0],
  waves: [], // {x, y（螢幕 px）, r, strength, thick}
};

function compile(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) { const log = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error('著色器編譯失敗：' + log); }
  return s;
}
function program(gl, vs, fs, names) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error('著色器連結失敗：' + gl.getProgramInfoLog(p));
  const u = {}; for (const n of names) u[n] = gl.getUniformLocation(p, n);
  return { p, u };
}

class GLRenderer {
  constructor(canvas) {
    this.kind = 'webgl2'; this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance', desynchronized: false });
    if (!gl) throw new Error('這台裝置不支援 WebGL2');
    this.gl = gl;
    this.textures = new Set();
    this.stats = { draws: 0, quads: 0, flushes: 0, tex: 0 };
    this.buf = new ArrayBuffer(MAX_QUADS * QUAD_WORDS * 4);
    this.f32 = new Float32Array(this.buf); this.u32 = new Uint32Array(this.buf);
    this.n = 0; this.slots = []; this.blend = 0; this.target = null; this.inScene = false; this.lost = false;
    this.w = canvas.width; this.h = canvas.height;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; this.lostAt = Time.real; PZ.emit('contextlost'); }, false);
    canvas.addEventListener('webglcontextrestored', () => { try { this.lost = false; this.setup(); for (const t of [...this.textures]) { t.gl = null; t.fb = null; if (t.restore) t.restore(t); else this.texAlloc(t); } PZ.emit('contextrestored'); } catch (e) { reportError(e, 'contextrestored'); } }, false);
    this.setup();
  }
  setup() {
    const gl = this.gl;
    this.maxSlots = Math.min(8, gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) || 8);
    this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
    this.sp = program(gl, SPRITE_VS, SPRITE_FS, ['uView', 'uOff', 'uT']);
    gl.useProgram(this.sp.p); gl.uniform1iv(this.sp.u.uT, [0, 1, 2, 3, 4, 5, 6, 7]);
    this.pBright = program(gl, FULL_VS, BRIGHT_FS, ['uTex', 'uTexel', 'uThresh']);
    this.pDown = program(gl, FULL_VS, DOWN_FS, ['uTex', 'uTexel']);
    this.pUp = program(gl, FULL_VS, UP_FS, ['uTex', 'uTexel']);
    this.pComp = program(gl, FULL_VS, COMP_FS, ['uScene', 'uBloom', 'uRes', 'uTime', 'uAspect', 'uWave', 'uWaveP', 'uWaves', 'uChroma', 'uBloomAmt', 'uVig', 'uVigCol', 'uGrain', 'uSat', 'uContrast', 'uBright', 'uTint', 'uFlash', 'uScan', 'uWarp']);
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    this.vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferData(gl.ARRAY_BUFFER, this.buf.byteLength, gl.DYNAMIC_DRAW);
    const stride = VERT_WORDS * 4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, stride, 16);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, stride, 20);
    const idx = new Uint16Array(MAX_QUADS * 6);
    for (let i = 0, v = 0; i < idx.length; i += 6, v += 4) { idx[i] = v; idx[i + 1] = v + 1; idx[i + 2] = v + 2; idx[i + 3] = v; idx[i + 4] = v + 2; idx[i + 5] = v + 3; }
    this.ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.emptyVao = gl.createVertexArray();
    // 1×1 白色貼圖：形狀用、沒用到的貼圖槽也綁它
    this.white = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.white);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND);
    this.applyBlend(0);
    this.fbo = {}; // 場景、泛光鏈
    this.fboSize = '';
  }
  /* ---- 貼圖 ---- */
  texCreate(w, h, o = {}) {
    const t = { id: ++TexId, w, h, gl: null, nearest: !!o.nearest, rt: !!o.rt, restore: o.restore || null, fb: null };
    this.texAlloc(t); this.textures.add(t); return t;
  }
  texAlloc(t) {
    const gl = this.gl; t.gl = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t.gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, t.w, t.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const f = t.nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (t.rt) { t.fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.gl, 0); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
  }
  /** 把 canvas／圖片貼到貼圖的 (x, y)（整張來源） */
  texUpload(t, src, x = 0, y = 0) {
    if (this.lost) return;
    const gl = this.gl; this.flush();
    if (!t.gl) this.texAlloc(t);
    gl.bindTexture(gl.TEXTURE_2D, t.gl);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  }
  texClear(t) { if (this.lost || !t.gl) return; this.flush(); const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, t.gl); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, t.w, t.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); }
  texDelete(t) { if (t.gl && !this.lost) { this.flush(); this.gl.deleteTexture(t.gl); if (t.fb) this.gl.deleteFramebuffer(t.fb); } t.gl = null; t.fb = null; this.textures.delete(t); }
  /* ---- 離屏畫布（場景、泛光）---- */
  ensureFbos() {
    const key = this.w + 'x' + this.h + ':' + (Quality.cur.bloom || 0);
    if (key === this.fboSize) return;
    this.fboSize = key;
    const gl = this.gl;
    for (const k in this.fbo) { const f = this.fbo[k]; gl.deleteTexture(f.tex); gl.deleteFramebuffer(f.fb); }
    this.fbo = {};
    const mk = (name, w, h) => {
      w = Math.max(1, w | 0); h = Math.max(1, h | 0);
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      this.fbo[name] = { tex, fb, w, h };
    };
    mk('scene', this.w, this.h);
    const b = Quality.cur.bloom || 0;
    if (b) { const d = b >= 2 ? 2 : 4; mk('b0', this.w / d, this.h / d); mk('b1', this.w / d / 2, this.h / d / 2); mk('b2', this.w / d / 4, this.h / d / 4); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  /* ---- 一格的開始與結束 ---- */
  usePost() { return Post.enabled && Quality.cur.post && !this.lost; }
  begin(clear) {
    if (this.lost) return;
    const gl = this.gl;
    this.w = this.canvas.width; this.h = this.canvas.height;
    this.stats.draws = this.stats.quads = this.stats.flushes = 0;
    this.n = 0; this.slots.length = 0;
    this.inScene = this.usePost();
    if (this.inScene) { this.ensureFbos(); this.bindTarget(this.fbo.scene.fb, this.w, this.h, false); }
    else this.bindTarget(null, this.w, this.h, false);
    const c = toColor(clear == null ? '#000' : clear);
    gl.clearColor(cR(c) / 255, cG(c) / 255, cB(c) / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  }
  bindTarget(fb, w, h, rt) {
    const gl = this.gl; this.flush();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, w, h);
    gl.useProgram(this.sp.p); gl.bindVertexArray(this.vao);
    // 畫到貼圖（rt）時 y 不翻：貼圖第 0 列在下面，之後當貼圖用時 UV 翻一下
    gl.uniform2f(this.sp.u.uView, 2 / w, rt ? 2 / h : -2 / h); gl.uniform2f(this.sp.u.uOff, -1, rt ? -1 : 1);
    this.curW = w; this.curH = h;
    this.applyBlend(this.blend, true);
  }
  /** 開始畫到某張貼圖（rt：用 texCreate(w, h, {rt:true}) 建的）；endTarget() 回到原本的地方 */
  beginTarget(t, clear) {
    if (this.lost) return;
    this.flush(); this._prevTarget = this.inScene ? this.fbo.scene : null;
    if (!t.gl) this.texAlloc(t);
    this.bindTarget(t.fb, t.w, t.h, true);
    if (clear !== undefined) { const gl = this.gl, c = toColor(clear); gl.clearColor(cR(c) / 255 * cA(c), cG(c) / 255 * cA(c), cB(c) / 255 * cA(c), cA(c)); gl.clear(gl.COLOR_BUFFER_BIT); }
  }
  endTarget() { if (this.lost) return; const p = this._prevTarget; this.bindTarget(p ? p.fb : null, this.w, this.h, false); }
  applyBlend(b, force) {
    if (b === this.blend && !force) return;
    this.flush(); this.blend = b; const gl = this.gl;
    if (b === 1) gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA);
    else if (b === 2) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    else if (b === 3) gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
    else if (b === 4) gl.blendFunc(gl.ONE, gl.ONE);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  setBlend(name) { this.applyBlend(BLEND[name] || 0); }
  slotOf(t) {
    if (!t) return 0;
    const s = this.slots; for (let i = 0; i < s.length; i++) if (s[i] === t) return i;
    if (s.length >= this.maxSlots) this.flush();
    s.push(t); return s.length - 1;
  }
  /**
   * 畫一個四邊形：單位正方形 (0,0)-(1,1) 經過仿射矩陣 [a c e; b d f] 變成畫面上的位置（畫布像素）。
   * u0,v0,u1,v1：貼圖座標；形狀模式時是 -1～1。color：打包顏色；mode：MODE；add：0～1 發光；param：模式參數（閃白、環的粗細…）
   */
  quad(t, a, b, c, d, e, f, u0, v0, u1, v1, color, mode, add, param) {
    if (this.lost) return;
    if (t && !t.gl) { if (t.restore) t.restore(t); if (!t.gl) return; }
    if (this.n >= MAX_QUADS) this.flush();
    const slot = this.slotOf(t);
    const ext = ((((param * 255) & 255) << 24) | (((add * 255) & 255) << 16) | ((mode & 255) << 8) | slot) >>> 0;
    const F = this.f32, U = this.u32; let i = this.n * QUAD_WORDS;
    F[i] = e; F[i + 1] = f; F[i + 2] = u0; F[i + 3] = v0; U[i + 4] = color; U[i + 5] = ext; i += 6;
    F[i] = a + e; F[i + 1] = b + f; F[i + 2] = u1; F[i + 3] = v0; U[i + 4] = color; U[i + 5] = ext; i += 6;
    F[i] = a + c + e; F[i + 1] = b + d + f; F[i + 2] = u1; F[i + 3] = v1; U[i + 4] = color; U[i + 5] = ext; i += 6;
    F[i] = c + e; F[i + 1] = d + f; F[i + 2] = u0; F[i + 3] = v1; U[i + 4] = color; U[i + 5] = ext;
    this.n++;
  }
  /** 任意四個角的四邊形（拖尾、梯形光束）：0→1→2→3 順時針；c0 給 0、3 角，c1 給 1、2 角（可以一頭濃一頭淡） */
  quad4(t, x0, y0, x1, y1, x2, y2, x3, y3, u0, v0, u1, v1, c0, c1, mode, add, param) {
    if (this.lost) return;
    if (t && !t.gl) { if (t.restore) t.restore(t); if (!t.gl) return; }
    if (this.n >= MAX_QUADS) this.flush();
    const slot = this.slotOf(t);
    const ext = ((((param * 255) & 255) << 24) | (((add * 255) & 255) << 16) | ((mode & 255) << 8) | slot) >>> 0;
    const F = this.f32, U = this.u32; let i = this.n * QUAD_WORDS;
    F[i] = x0; F[i + 1] = y0; F[i + 2] = u0; F[i + 3] = v0; U[i + 4] = c0; U[i + 5] = ext; i += 6;
    F[i] = x1; F[i + 1] = y1; F[i + 2] = u1; F[i + 3] = v0; U[i + 4] = c1; U[i + 5] = ext; i += 6;
    F[i] = x2; F[i + 1] = y2; F[i + 2] = u1; F[i + 3] = v1; U[i + 4] = c1; U[i + 5] = ext; i += 6;
    F[i] = x3; F[i + 1] = y3; F[i + 2] = u0; F[i + 3] = v1; U[i + 4] = c0; U[i + 5] = ext;
    this.n++;
  }
  /** 實心三角形（多邊形拆成三角形用）：第二個三角形退化 */
  tri(x1, y1, x2, y2, x3, y3, color, add) {
    if (this.lost) return;
    if (this.n >= MAX_QUADS) this.flush();
    const ext = ((((add * 255) & 255) << 16) | (MODE.solid << 8)) >>> 0;
    const F = this.f32, U = this.u32; let i = this.n * QUAD_WORDS;
    const put = (x, y) => { F[i] = x; F[i + 1] = y; F[i + 2] = 0; F[i + 3] = 0; U[i + 4] = color; U[i + 5] = ext; i += 6; };
    put(x1, y1); put(x2, y2); put(x3, y3); put(x3, y3);
    this.n++;
  }
  flush() {
    if (!this.n || this.lost) { this.n = 0; return; }
    const gl = this.gl;
    for (let i = 0; i < this.maxSlots; i++) { gl.activeTexture(gl.TEXTURE0 + i); const t = this.slots[i]; gl.bindTexture(gl.TEXTURE_2D, t && t.gl ? t.gl : this.white); }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.f32, 0, this.n * QUAD_WORDS);
    gl.drawElements(gl.TRIANGLES, this.n * 6, gl.UNSIGNED_SHORT, 0);
    this.stats.draws++; this.stats.quads += this.n;
    this.n = 0; this.slots.length = 0;
  }
  /** 場景畫完：做後製並換到螢幕；之後畫的東西（HUD）不受震動、色差影響 */
  hud() {
    if (this.lost) return;
    if (!this.inScene) { this.flashOverlay(); return; }
    this.flush(); this.inScene = false;
    const gl = this.gl, S = this.fbo.scene;
    gl.bindVertexArray(this.emptyVao); gl.disable(gl.BLEND);
    let bloomTex = null;
    const bq = Quality.cur.bloom || 0;
    if (bq && Post.bloom.on && Post.bloom.strength > 0 && this.fbo.b0) {
      const pass = (prog, src, dst, uni) => { gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, dst.w, dst.h); gl.useProgram(prog.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tex); gl.uniform1i(prog.u.uTex, 0); gl.uniform2f(prog.u.uTexel, 1 / src.w, 1 / src.h); if (uni) uni(prog); gl.drawArrays(gl.TRIANGLES, 0, 3); };
      const { b0, b1, b2 } = this.fbo;
      pass(this.pBright, S, b0, (p) => gl.uniform1f(p.u.uThresh, Post.bloom.threshold));
      pass(this.pDown, b0, b1); pass(this.pDown, b1, b2);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      pass(this.pUp, b2, b1); pass(this.pUp, b1, b0);
      gl.disable(gl.BLEND);
      bloomTex = b0.tex;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.w, this.h);
    const P = this.pComp, u = P.u; gl.useProgram(P.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.tex); gl.uniform1i(u.uScene, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bloomTex || this.white); gl.uniform1i(u.uBloom, 1);
    gl.uniform2f(u.uRes, this.w, this.h); gl.uniform1f(u.uTime, Time.real); gl.uniform1f(u.uAspect, this.w / this.h);
    const ws = Post.waves, n = Math.min(4, ws.length), W = this._W || (this._W = new Float32Array(16)), WP = this._WP || (this._WP = new Float32Array(16)), sw = Screen.w || 1, sh = Screen.h || 1;
    for (let i = 0; i < n; i++) { const w = ws[i]; W[i * 4] = w.x / sw; W[i * 4 + 1] = 1 - w.y / sh; W[i * 4 + 2] = w.r / sh; W[i * 4 + 3] = w.strength; WP[i * 4] = Math.max(0.002, w.thick / sh); }
    gl.uniform4fv(u.uWave, W); gl.uniform4fv(u.uWaveP, WP); gl.uniform1i(u.uWaves, n);
    gl.uniform1f(u.uChroma, Post.chroma * Settings.flashScale()); gl.uniform1f(u.uBloomAmt, bloomTex ? Post.bloom.strength : 0);
    const vc = toColor(Post.vignetteColor);
    gl.uniform1f(u.uVig, Post.vignette); gl.uniform3f(u.uVigCol, cR(vc) / 255, cG(vc) / 255, cB(vc) / 255); gl.uniform1f(u.uGrain, Post.grain);
    gl.uniform1f(u.uSat, Post.sat); gl.uniform1f(u.uContrast, Post.contrast); gl.uniform1f(u.uBright, Post.bright);
    gl.uniform3f(u.uTint, Post.tint[0], Post.tint[1], Post.tint[2]);
    const fl = Post.flash; gl.uniform4f(u.uFlash, fl[0], fl[1], fl[2], fl[3] * Settings.flashScale());
    gl.uniform1f(u.uScan, Post.scan); gl.uniform1f(u.uWarp, Post.warp);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.BLEND);
    this.bindTarget(null, this.w, this.h, false);
  }
  /** 沒有後製時：閃白用一個全螢幕方塊蓋上去 */
  flashOverlay() {
    const fl = Post.flash, a = fl[3] * Settings.flashScale();
    if (a <= 0.001) return;
    this.quad(null, this.w, 0, 0, this.h, 0, 0, 0, 0, 1, 1, pack(fl[0] * 255, fl[1] * 255, fl[2] * 255, a), MODE.solid, 0, 0);
  }
  end() { if (this.lost) return; if (this.inScene) this.hud(); this.flush(); }
  destroy() { const ext = this.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }
}
let TexId = 0;
