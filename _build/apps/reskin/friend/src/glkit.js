/* ===================== WebGL helpers (the bloom layer and the 3D skins) =====================
   Shaders are written in GLSL ES 1.00 so the same source runs on WebGL 2 (iPhone iOS 15+, computers) and on WebGL 1. */
R.glk = (() => {
  function context(cv, opt) {
    opt = opt || {};
    const attrs = { antialias: false, alpha: !!opt.alpha, depth: !!opt.depth, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: !!opt.preserve, powerPreference: 'high-performance' };
    let gl = null, v2 = false;
    if (opt.v2 !== false) { try { gl = cv.getContext('webgl2', attrs); v2 = !!gl; } catch (e) { gl = null; } }
    if (!gl) { try { gl = cv.getContext('webgl', attrs) || cv.getContext('experimental-webgl', attrs); } catch (e) { gl = null; } }
    if (!gl) return null;
    const G = { gl, v2, cv, lost: false };
    // instanced drawing: built into WebGL 2, an extension on WebGL 1
    if (v2) G.inst = { div: (i, d) => gl.vertexAttribDivisor(i, d), draw: (m, f, c, n) => gl.drawArraysInstanced(m, f, c, n) };
    else { const x = gl.getExtension('ANGLE_instanced_arrays'); if (x) G.inst = { div: (i, d) => x.vertexAttribDivisorANGLE(i, d), draw: (m, f, c, n) => x.drawArraysInstancedANGLE(m, f, c, n) }; }
    if (!v2) gl.getExtension('OES_standard_derivatives');
    cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); G.lost = true; if (G.onlost) G.onlost(); });
    cv.addEventListener('webglcontextrestored', () => { G.lost = false; if (G.onrestored) G.onrestored(); });
    return G;
  }
  function shader(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error('shader: ' + log); }
    return s;
  }
  // { p, u: uniform locations by name, a: attribute locations by name, use() }
  function program(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    const u = {}, a = {};
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const x = gl.getActiveUniform(p, i); u[x.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, x.name); }
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i < n; i++) { const x = gl.getActiveAttrib(p, i); a[x.name] = gl.getAttribLocation(p, x.name); }
    return { p, u, a, use() { gl.useProgram(p); return this; } };
  }
  const FULL_VS = 'attribute vec2 ap; varying vec2 uv; void main(){ uv = ap*.5+.5; gl_Position = vec4(ap, 0., 1.); }';
  // one triangle that covers the screen
  function fullscreen(gl) {
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    return (prog) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); const loc = prog.a.ap; gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  }
  function texture(gl, opt) {
    opt = opt || {};
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    const f = opt.nearest ? gl.NEAREST : gl.LINEAR, wrap = opt.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(opt.fill || [0, 0, 0, 255]));
    return t;
  }
  // put a picture (img, canvas, ImageBitmap) into a texture; false when the browser refuses (tainted, lost)
  function upload(gl, t, src, flip) {
    try {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !!flip);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      return true;
    } catch (e) { return false; }
  }
  // an offscreen target: a texture you can draw into
  function target(gl, w, h) {
    const t = texture(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { t, f, w, h, free() { gl.deleteTexture(t); gl.deleteFramebuffer(f); } };
  }
  // a square picture of the song's cover for a texture (power-of-two, so it can repeat and mip)
  async function coverCanvas(t, n) {
    n = n || 256;
    const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d');
    const im = t ? await R.art.coverImage(t) : null;
    if (im) x.drawImage(im, 0, 0, n, n);
    else { const col = R.art.colorsOf(t); const g = x.createLinearGradient(0, 0, n, n); g.addColorStop(0, col.vibrant); g.addColorStop(1, col.dark); x.fillStyle = g; x.fillRect(0, 0, n, n); }
    return c;
  }
  const hex3 = (h) => R.color.hexToRgb(h).map((v) => v / 255);
  return { context, program, FULL_VS, fullscreen, texture, upload, target, coverCanvas, hex3 };
})();
