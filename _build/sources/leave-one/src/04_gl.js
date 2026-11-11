// ===== WebGL：凹凸的洞壁、會動的火光、把顏料「畫」在岩面上、發光 =====
const WALL = { x0: -560, y0: -380, x1: 2960, y1: 1380, tw: 2048, th: 1024 };
const MAXL = 12;
const GLR = {
  gl: null, ok: false, wallTex: null, decorTex: null, pigTex: null, progComp: null, progGlow: null,
  glowBuf: null, glowData: new Float32Array(8 * 6 * 1400), nGlow: 0, cw: 0, ch: 0, tri: null,
  lp: new Float32Array(MAXL * 4), lc: new Float32Array(MAXL * 4), nl: 0,

  init(canvas) {
    const opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
    const gl = canvas.getContext('webgl2', opts) || canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) return false;
    this.gl = gl;
    const VS = 'attribute vec2 aP; varying vec2 vUv; void main(){ vUv = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }';
    this.progGen = this.prog(VS, GEN_FS);
    this.progComp = this.prog(VS, COMP_FS);
    this.progGlow = this.prog(GLOW_VS, GLOW_FS);
    if (!this.progGen || !this.progComp || !this.progGlow) return false;
    this.tri = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tri);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.glowBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glowBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.glowData.byteLength, gl.DYNAMIC_DRAW);
    this.pigTex = this.tex();
    this.ok = true;
    return true;
  },
  prog(vs, fs) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); return null; }
    p.u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const name = info.name.replace(/\[0\]$/, ''); p.u[name] = gl.getUniformLocation(p, info.name); }
    return p;
  },
  tex() {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  },
  // 產生整面洞壁（只做一次）：RGB 是岩色，A 是高度
  makeWall(seed, decorCanvas) {
    const gl = this.gl;
    this.decorTex = this.tex();
    gl.bindTexture(gl.TEXTURE_2D, this.decorTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, decorCanvas);
    if (this.wallTex) gl.deleteTexture(this.wallTex);
    this.wallTex = this.tex();
    gl.bindTexture(gl.TEXTURE_2D, this.wallTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, WALL.tw, WALL.th, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.wallTex, 0);
    gl.viewport(0, 0, WALL.tw, WALL.th);
    const p = this.progGen;
    gl.useProgram(p);
    gl.uniform2f(p.u.uW0, WALL.x0, WALL.y0);
    gl.uniform2f(p.u.uW1, WALL.x1, WALL.y1);
    gl.uniform1f(p.u.uSeed, (seed % 997) * 0.731);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.decorTex);
    gl.uniform1i(p.u.uDecor, 0);
    this.drawTri(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    gl.deleteTexture(this.decorTex); this.decorTex = null;
  },
  drawTri(p) {
    const gl = this.gl;
    const loc = gl.getAttribLocation(p, 'aP');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tri);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(loc);
  },
  resize(w, h) { this.cw = w; this.ch = h; },
  // 燈：x, y（世界座標）、高度 z、半徑 r、顏色 rgb（已乘上強度）
  clearLights() { this.nl = 0; },
  light(x, y, z, r, cr, cg, cb) {
    if (this.nl >= MAXL) return;
    const i = this.nl++ * 4;
    this.lp[i] = x; this.lp[i + 1] = y; this.lp[i + 2] = z; this.lp[i + 3] = r;
    this.lc[i] = cr; this.lc[i + 1] = cg; this.lc[i + 2] = cb; this.lc[i + 3] = 0;
  },
  clearGlow() { this.nGlow = 0; },
  // 發光點（畫布像素座標）
  glow(x, y, rad, r, g, b, k = 2) {
    if (this.nGlow >= 1400) return;
    const d = this.glowData;
    let o = this.nGlow++ * 48;
    const vx = [-1, 1, 1, -1, 1, -1], vy = [-1, -1, 1, -1, 1, 1];
    for (let i = 0; i < 6; i++) {
      d[o++] = x + vx[i] * rad; d[o++] = y + vy[i] * rad; d[o++] = vx[i]; d[o++] = vy[i];
      d[o++] = r; d[o++] = g; d[o++] = b; d[o++] = k;
    }
  },
  render(cam, pigCanvas, params) {
    const gl = this.gl, p = this.progComp;
    gl.viewport(0, 0, this.cw, this.ch);
    gl.disable(gl.BLEND);
    gl.useProgram(p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.wallTex); gl.uniform1i(p.u.uWall, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.pigTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pigCanvas);
    gl.uniform1i(p.u.uPig, 1);
    gl.uniform2f(p.u.uRes, this.cw, this.ch);
    gl.uniform2f(p.u.uOrg, cam.ox, cam.oy);
    gl.uniform1f(p.u.uScale, cam.k);
    gl.uniform2f(p.u.uW0, WALL.x0, WALL.y0);
    gl.uniform2f(p.u.uW1, WALL.x1, WALL.y1);
    gl.uniform2f(p.u.uTexel, 1 / WALL.tw, 1 / WALL.th);
    gl.uniform4fv(p.u.uLP, this.lp);
    gl.uniform4fv(p.u.uLC, this.lc);
    gl.uniform1i(p.u.uLN, this.nl);
    gl.uniform1f(p.u.uAmb, params.amb);
    gl.uniform1f(p.u.uTime, params.time);
    gl.uniform1f(p.u.uExpo, params.expo);
    gl.uniform1f(p.u.uMural, params.mural || 0);
    this.drawTri(p);
    if (this.nGlow) {
      const g = this.progGlow;
      gl.useProgram(g);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniform2f(g.u.uRes, this.cw, this.ch);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.glowBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.glowData.subarray(0, this.nGlow * 48));
      const a = gl.getAttribLocation(g, 'aP'), u = gl.getAttribLocation(g, 'aUV'), c = gl.getAttribLocation(g, 'aC');
      gl.enableVertexAttribArray(a); gl.enableVertexAttribArray(u); gl.enableVertexAttribArray(c);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(u, 2, gl.FLOAT, false, 32, 8);
      gl.vertexAttribPointer(c, 4, gl.FLOAT, false, 32, 16);
      gl.drawArrays(gl.TRIANGLES, 0, this.nGlow * 6);
      gl.disableVertexAttribArray(a); gl.disableVertexAttribArray(u); gl.disableVertexAttribArray(c);
      gl.disable(gl.BLEND);
    }
  },
};

const NOISE_GLSL = `
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
`;
const GEN_FS = `precision highp float;
varying vec2 vUv;
uniform vec2 uW0, uW1;
uniform float uSeed;
uniform sampler2D uDecor;
${NOISE_GLSL}
float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 6; i++) { v += a * noise(p); p = m * p + uSeed; a *= 0.5; } return v; }
void main(){
  vec2 w = mix(uW0, uW1, vUv);
  vec2 p = w * 0.0026;
  vec2 q = vec2(fbm(p + 1.7), fbm(p + 9.2));
  float big = fbm(p + q * 1.3);
  float mid = fbm(w * 0.011 + q * 1.4);
  float fine = noise(w * 0.075) * 0.5 + noise(w * 0.19) * 0.3 + noise(w * 0.43) * 0.2;
  // 只有少數地方有細細的裂縫
  float rg = 1.0 - abs(noise(w * 0.0062 + q * 1.6) * 2.0 - 1.0);
  float mask = smoothstep(0.58, 0.8, noise(w * 0.0019 + 31.0 + uSeed));
  float crack = smoothstep(0.972, 0.996, rg) * mask;
  float h = big * 0.62 + mid * 0.28 + fine * 0.1 - crack * 0.08;
  vec3 lime = vec3(0.79, 0.69, 0.54), cream = vec3(0.89, 0.83, 0.71), stain = vec3(0.70, 0.46, 0.29), grey = vec3(0.60, 0.57, 0.52), warm = vec3(0.74, 0.58, 0.42);
  float s1 = smoothstep(0.5, 0.8, fbm(p * 2.2 + 5.0));
  float s2 = smoothstep(0.55, 0.85, fbm(p * 1.3 + 11.0));
  float s3 = smoothstep(0.45, 0.75, fbm(p * 3.7 + 21.0));
  vec3 col = mix(lime, cream, smoothstep(0.3, 0.75, big));
  col = mix(col, stain, s1 * 0.42);
  col = mix(col, grey, s2 * 0.34);
  col = mix(col, warm, s3 * 0.25);
  // 鐘乳石般往下流的白色條紋
  float streak = noise(vec2(w.x * 0.03, w.y * 0.0022) + q * 0.6);
  col = mix(col, cream * 1.05, smoothstep(0.74, 0.97, streak) * 0.32);
  col *= 0.88 + 0.2 * mid + 0.07 * fine;
  col *= mix(0.86, 1.04, smoothstep(0.25, 0.7, big));
  col = mix(col, col * 0.62, crack);
  vec4 d = texture2D(uDecor, vec2(vUv.x, vUv.y));
  col = mix(col, d.rgb, d.a);
  gl_FragColor = vec4(col, clamp(h, 0.0, 1.0));
}`;
const COMP_FS = `precision highp float;
varying vec2 vUv;
uniform sampler2D uWall, uPig;
uniform vec2 uRes, uOrg, uW0, uW1, uTexel;
uniform float uScale, uAmb, uTime, uExpo, uMural;
uniform vec4 uLP[${MAXL}];
uniform vec4 uLC[${MAXL}];
uniform int uLN;
${NOISE_GLSL}
void main(){
  vec2 sp = vec2(vUv.x, 1.0 - vUv.y);
  vec2 w = uOrg + sp * uRes / uScale;
  vec2 uv = (w - uW0) / (uW1 - uW0);
  vec4 wall = texture2D(uWall, uv);
  float hx = texture2D(uWall, uv + vec2(uTexel.x, 0.0)).a - texture2D(uWall, uv - vec2(uTexel.x, 0.0)).a;
  float hy = texture2D(uWall, uv + vec2(0.0, uTexel.y)).a - texture2D(uWall, uv - vec2(0.0, uTexel.y)).a;
  float dn = noise(w * 0.42), dn2 = noise(w * 1.3 + 4.0);
  vec3 N = normalize(vec3(-hx * 5.5 - (dn - 0.5) * 0.2 - (dn2 - 0.5) * 0.08, -hy * 5.5 - (noise(w * 0.42 + 9.0) - 0.5) * 0.2 - (noise(w * 1.3 + 2.0) - 0.5) * 0.08, 1.0));
  vec4 pig = texture2D(uPig, sp);
  float grain = noise(w * 0.55 + 3.1) * 0.6 + noise(w * 1.7) * 0.4;
  float pa = clamp(pig.a * (0.5 + 0.75 * grain) - (1.0 - wall.a) * 0.12, 0.0, 1.0);
  vec3 pc = pig.a > 0.001 ? pig.rgb / pig.a : vec3(0.0);
  vec3 base = wall.rgb * (0.92 + 0.14 * dn2);
  vec3 alb = mix(base, pc * (0.8 + 0.32 * wall.r), pa);
  vec3 P = vec3(w, wall.a * 46.0);
  vec3 lit = vec3(uAmb * 0.9, uAmb * 0.82, uAmb * 0.86);
  for (int i = 0; i < ${MAXL}; i++) {
    if (i >= uLN) break;
    vec3 L = uLP[i].xyz - P;
    float d = length(L);
    float r = uLP[i].w;
    float diff = max(dot(N, L / d), 0.0);
    float att = 1.0 / (1.0 + (d * d) / (r * r));
    att *= smoothstep(r * 3.4, r * 0.8, d);
    lit += uLC[i].rgb * diff * att;
  }
  lit = mix(lit, vec3(1.02, 0.86, 0.66), uMural * 0.55);
  vec3 col = alb * lit * uExpo;
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  vec2 c = vUv - 0.5;
  col *= 1.0 - dot(c, c) * mix(0.85, 0.55, uMural);
  col += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.018;
  gl_FragColor = vec4(col, 1.0);
}`;
const GLOW_VS = `attribute vec2 aP; attribute vec2 aUV; attribute vec4 aC;
uniform vec2 uRes; varying vec2 vUV; varying vec4 vC;
void main(){ vUV = aUV; vC = aC; vec2 c = aP / uRes * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); }`;
const GLOW_FS = `precision mediump float;
varying vec2 vUV; varying vec4 vC;
void main(){ float d = length(vUV); float f = pow(max(0.0, 1.0 - d), vC.a); gl_FragColor = vec4(vC.rgb * f, 1.0); }`;
