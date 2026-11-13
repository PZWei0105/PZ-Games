/* 全知 OMNISCIENT — WebGL2 畫面引擎
   HDR 場景（背景格線、霓虹光纜、光點、掃描光束、開機的眼睛）→ 多層泛光（Dual-Kawase）→ 色調映射合成。
   光纜上緩慢流動的微光只是裝飾；明亮的光點（封包）只在真的事件發生時才發射。 */

const GLX = {
  ok: false, gl: null, cv: null, W: 0, H: 0, sc: 1, pw: 0, ph: 0, hdr: false, fmt: null,
  P: {}, fbo: {}, mips: [], buf: {}, vao: {},
  cables: [], nCab: 0, act: null, actTex: null, cableVerts: 0, cableKey: {},
  nodes: [], pts: [], packets: [], sparks: [], motes: [],
  t: 0, last: 0, running: false, energy: 0, beam: { t0: -1, dur: 1.3 }, flash: 0,
  boot: { on: true, idle: true, t0: 0, open: 0.1, zoom: 0, flash: 0 }, rem: 10,
  quality: 1, bloomN: 6, strength: 0.95, frameMs: [], lost: false,

  init(cv) {
    this.cv = cv;
    const gl = cv.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    if (!gl) return false;
    this.gl = gl;
    this.hdr = !!gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('EXT_color_buffer_half_float');
    this.fmt = this.hdr ? { internal: gl.RGBA16F, type: gl.HALF_FLOAT } : { internal: gl.RGBA8, type: gl.UNSIGNED_BYTE };
    try { this.compile(); } catch (e) { console.error(e); return false; }
    this.buf.cable = gl.createBuffer();
    this.buf.pts = gl.createBuffer();
    this.vao.cable = gl.createVertexArray();
    this.vao.pts = gl.createVertexArray();
    this.vao.empty = gl.createVertexArray();
    this.actTex = gl.createTexture();
    cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; this.ok = false; });
    this.quality = settings.fx === 'low' ? 0.5 : settings.fx === 'std' ? 0.75 : 1;
    this.resize();
    this.ok = true;
    return true;
  },

  // ---------------------------------------------------------------- 著色器
  compile() {
    const gl = this.gl;
    const FS_VERT = `#version 300 es
      const vec2 P[3] = vec2[3](vec2(-1.,-1.), vec2(3.,-1.), vec2(-1.,3.));
      out vec2 uv;
      void main(){ vec2 p = P[gl_VertexID]; uv = p*.5+.5; gl_Position = vec4(p,0.,1.); }`;
    const H = `#version 300 es
      precision highp float;
      in vec2 uv; out vec4 o;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }`;
    const src = {
      bg: [FS_VERT, H + `
        uniform vec2 res; uniform float time; uniform float grid; uniform float lift;
        void main(){
          vec2 px = uv*res;
          vec2 q = (uv - vec2(.5,.45))*vec2(res.x/res.y, 1.);
          vec3 c = mix(vec3(.0016,.0032,.0085), vec3(.006,.013,.034), smoothstep(1.25,0.,length(q)));
          vec2 g = abs(fract(px/grid - .5) - .5)*grid;
          float ln = exp(-min(g.x,g.y)*1.2);
          c += vec3(.010,.022,.055)*ln*.55;
          float dt = exp(-dot(g,g)*.25);
          c += vec3(.03,.07,.16)*dt*.6;
          c += lift*vec3(.004,.008,.02);
          o = vec4(c,1.);
        }`],
      cable: [`#version 300 es
        in vec2 a_pos; in vec2 a_uv; in vec3 a_col; in vec2 a_meta;
        uniform vec2 res;
        out vec2 v_uv; out vec3 v_col; out vec2 v_meta;
        void main(){ vec2 p = a_pos/res*2.-1.; p.y = -p.y; gl_Position = vec4(p,0.,1.); v_uv = a_uv; v_col = a_col; v_meta = a_meta; }`,
      `#version 300 es
        precision highp float;
        in vec2 v_uv; in vec3 v_col; in vec2 v_meta; out vec4 o;
        uniform float time; uniform sampler2D act; uniform float nCab; uniform float energy; uniform float flow;
        void main(){
          vec4 A = texture(act, vec2((v_meta.x+.5)/nCab, .5));
          float rev = A.g;
          if (v_uv.x > rev) discard;
          float d = abs(v_uv.y);
          float core = exp(-d*d*7.);
          float hair = exp(-d*d*60.);
          float s = v_uv.x*v_meta.y/110. - time*.42 + fract(v_meta.x*.618)*9.;
          float pulse = pow(.5+.5*sin(s*6.2831853), 24.) * flow;
          float head = smoothstep(rev-.06, rev, v_uv.x) * step(rev, .999) * 3.;
          float I = core*(.42 + .3*energy) + hair*1.35 + pulse*core*(1.1 + 2.4*A.r) + A.r*(core*2.4 + hair*2.4) + head*core;
          o = vec4(v_col*I, 1.);
        }`],
      pts: [`#version 300 es
        in vec2 a_pos; in float a_size; in vec4 a_col;
        uniform vec2 res;
        out vec4 v_col;
        void main(){ vec2 p = a_pos/res*2.-1.; p.y = -p.y; gl_Position = vec4(p,0.,1.); gl_PointSize = a_size; v_col = a_col; }`,
      `#version 300 es
        precision highp float;
        in vec4 v_col; out vec4 o;
        void main(){
          vec2 q = gl_PointCoord*2.-1.;
          float r2 = dot(q,q);
          if (r2 > 1.) discard;
          float core = exp(-r2*22.);
          float halo = exp(-r2*4.)*(1.-r2);
          o = vec4(v_col.rgb*v_col.a*(core*3.2 + halo*.55), 1.);
        }`],
      beam: [FS_VERT, H + `
        uniform vec2 res; uniform float x; uniform float a;
        void main(){
          float px = uv.x*res.x;
          float d = (px - x)/res.y;
          float core = exp(-d*d*9000.);
          float glow = exp(-d*d*260.);
          float wide = exp(-d*d*18.);
          vec3 c = vec3(.9,.97,1.)*core*14. + vec3(.35,.8,1.)*glow*1.8 + vec3(1.,.75,.3)*wide*.18;
          o = vec4(c*a, 1.);
        }`],
      eye: [FS_VERT, H + `
        uniform vec2 res; uniform float time; uniform float open; uniform float zoom; uniform float scan;
        #define TAU 6.2831853
        float ring(float r, float R, float w){ return exp(-pow((r-R)/w, 2.)); }
        void main(){
          vec2 p = (uv - vec2(.5,.56))*vec2(res.x/res.y, 1.);
          p /= (1. + zoom*3.2);
          float r = length(p);
          float an = atan(p.y, p.x);
          vec3 c = vec3(0.);
          // 掃描線
          c += vec3(.35,.85,1.)*exp(-pow(p.y/.0018,2.))*smoothstep(.0,.01,scan - abs(p.x)*1.2)*(1.-open)*2.5;
          // 眼眶（上下眼皮）
          float W = .44, Hh = .29*open;
          float xn = clamp(p.x/W, -1., 1.);
          float lid = Hh*pow(max(0.,1.-xn*xn), .85);
          float dl = abs(abs(p.y) - lid);
          float inside = step(abs(p.x), W)*step(abs(p.y), lid);
          c += vec3(.27,.83,1.)*exp(-dl*dl*70000.)*step(abs(p.x), W)*2.8*open;
          c += vec3(.15,.5,1.)*exp(-dl*dl*2500.)*step(abs(p.x), W)*.5*open;
          // 虹膜：三圈、方向相反地轉
          float R0 = .19;
          float rot = time*.25;
          float dash1 = step(.35, fract((an+rot)/TAU*48.));
          float dash2 = step(.5, fract((an-rot*1.6)/TAU*120.));
          float ir = ring(r, R0, .0016)*1.6 + ring(r, R0*.86, .0013)*dash1*1.8 + ring(r, R0*.72, .0011)*dash2*1.3;
          float ticks = 0.;
          float k = floor((an+3.14159)/TAU*96.);
          float len = .01 + .045*hash(vec2(k, 3.)) * (.5+.5*sin(time*1.7 + k));
          float ta = abs(fract((an+3.14159)/TAU*96.) - .5);
          ticks = step(ta, .12)*step(R0*1.02, r)*step(r, R0*1.02+len);
          vec3 irisCol = mix(vec3(.3,.85,1.), vec3(1.,.72,.2), step(.66, hash(vec2(k,9.))));
          c += (vec3(.3,.85,1.)*ir + irisCol*ticks*1.6)*inside;
          // 瞳孔
          float pr = .062 + .004*sin(time*2.);
          float po = smoothstep(.15, .9, open);
          c += vec3(.55,.9,1.)*exp(-pow(r/pr, 2.)*2.2)*(.35 + 1.1*po)*inside;
          c += vec3(.15,.5,1.)*exp(-pow(r/(pr*2.4), 2.))*(.15 + .35*po)*inside;
          c += vec3(.9,.98,1.)*exp(-pow((r - pr*.62)/(pr*.06), 2.))*1.6*po*inside;
          c *= 1. - smoothstep(pr*.5, pr*.42, r)*inside*.97;
          o = vec4(c, 1.);
        }`],
      pre: [FS_VERT, H + `
        uniform sampler2D src; uniform vec2 hp; uniform float th;
        void main(){
          vec3 c = texture(src, uv).rgb*.5 + (texture(src, uv+hp).rgb + texture(src, uv-hp).rgb + texture(src, uv+vec2(hp.x,-hp.y)).rgb + texture(src, uv-vec2(hp.x,-hp.y)).rgb)*.125;
          float br = max(c.r, max(c.g, c.b));
          float knee = th*.6;
          float s = clamp(br - th + knee, 0., 2.*knee);
          s = s*s/(4.*knee + 1e-4);
          o = vec4(c*max(s, br-th)/max(br, 1e-4), 1.);
        }`],
      down: [FS_VERT, H + `
        uniform sampler2D src; uniform vec2 hp;
        void main(){
          vec3 s = texture(src, uv).rgb*4. + texture(src, uv-hp).rgb + texture(src, uv+hp).rgb + texture(src, uv+vec2(hp.x,-hp.y)).rgb + texture(src, uv-vec2(hp.x,-hp.y)).rgb;
          o = vec4(s/8., 1.);
        }`],
      up: [FS_VERT, H + `
        uniform sampler2D src; uniform vec2 hp; uniform float w;
        void main(){
          vec3 s = texture(src, uv+vec2(-hp.x*2.,0.)).rgb + texture(src, uv+vec2(-hp.x,hp.y)).rgb*2. + texture(src, uv+vec2(0.,hp.y*2.)).rgb + texture(src, uv+vec2(hp.x,hp.y)).rgb*2.
                 + texture(src, uv+vec2(hp.x*2.,0.)).rgb + texture(src, uv+vec2(hp.x,-hp.y)).rgb*2. + texture(src, uv+vec2(0.,-hp.y*2.)).rgb + texture(src, uv+vec2(-hp.x,-hp.y)).rgb*2.;
          o = vec4(s/12.*w, 1.);
        }`],
      comp: [FS_VERT, H + `
        uniform sampler2D scene; uniform sampler2D bloom; uniform float strength; uniform float time; uniform vec2 res; uniform float flash;
        vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
        void main(){
          vec2 d = (uv-.5);
          float ca = dot(d,d)*.006;
          vec3 b = vec3(texture(bloom, uv+d*ca).r, texture(bloom, uv).g, texture(bloom, uv-d*ca).b);
          vec3 c = texture(scene, uv).rgb + b*strength;
          c += flash*vec3(.9,.97,1.);
          c = aces(c*1.05);
          c = pow(c, vec3(1./2.2));
          c *= mix(1., smoothstep(1.25, .35, length(d*vec2(1.,.9))), .55);
          c += (hash(uv*res + fract(time)*91.) - .5)/180.;
          o = vec4(c, 1.);
        }`],
    };
    const mk = (vs, fs) => {
      const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
      const p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
      return { p, u };
    };
    for (const k of Object.keys(src)) this.P[k] = mk(src[k][0], src[k][1]);
  },

  // ---------------------------------------------------------------- 畫布大小與緩衝
  tex(w, h) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.fmt.internal, w, h, 0, gl.RGBA, this.fmt.type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE && this.hdr) {
      this.hdr = false; this.fmt = { internal: gl.RGBA8, type: gl.UNSIGNED_BYTE };
      gl.deleteTexture(t); gl.deleteFramebuffer(f);
      return this.tex(w, h);
    }
    return { t, f, w, h };
  },
  resize() {
    if (!this.gl) return;
    const gl = this.gl;
    const dpr = window.devicePixelRatio || 1;
    this.W = innerWidth; this.H = innerHeight;
    this.rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;
    // 解析度上限：太大的螢幕（4K）就降一點畫，光纜仍然銳利
    const maxPx = 2.6e6 * this.quality;
    let s = Math.min(dpr, 2) * this.quality;
    if (this.W * this.H * s * s > maxPx) s = Math.sqrt(maxPx / (this.W * this.H));
    this.sc = s;
    this.pw = Math.max(1, Math.round(this.W * s)); this.ph = Math.max(1, Math.round(this.H * s));
    this.cv.width = this.pw; this.cv.height = this.ph;
    for (const k of Object.keys(this.fbo)) { gl.deleteTexture(this.fbo[k].t); gl.deleteFramebuffer(this.fbo[k].f); }
    this.mips.forEach((m) => { gl.deleteTexture(m.t); gl.deleteFramebuffer(m.f); });
    this.fbo.scene = this.tex(this.pw, this.ph);
    this.mips = [];
    let w = this.pw >> 1, h = this.ph >> 1;
    this.bloomN = this.quality < 0.6 ? 4 : 6;
    for (let i = 0; i < this.bloomN && w > 4 && h > 4; i++) { this.mips.push(this.tex(w, h)); w >>= 1; h >>= 1; }
    if (this.cables.length) this.buildCables(this.cables);
  },

  // ---------------------------------------------------------------- 光纜
  /** list：[{x0,y0,x1,y1,col:[r,g,b],a,b}]（CSS 像素）；a/b＝兩端卡片的 id，送封包時用來找路 */
  setCables(list) {
    const old = this.cableKey;
    this.cables = list;
    this.cableKey = {};
    list.forEach((c, i) => { this.cableKey[c.a + '>' + c.b] = i; });
    const prev = this.act;
    this.nCab = Math.max(1, list.length);
    this.act = new Float32Array(this.nCab * 4);
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      const j = old[c.a + '>' + c.b];
      this.act[i * 4 + 1] = prev && j != null ? prev[j * 4 + 1] : (this.revealAll ? 1 : 0);
      this.act[i * 4 + 0] = prev && j != null ? prev[j * 4] : 0;
      c.rd = c.rd || 0;
    }
    this.buildCables(list);
  },
  bez(c, t) {
    const dx = (c.x1 - c.x0) * 0.5;
    const u = 1 - t;
    const x = u * u * u * c.x0 + 3 * u * u * t * (c.x0 + dx) + 3 * u * t * t * (c.x1 - dx) + t * t * t * c.x1;
    const y = u * u * u * c.y0 + 3 * u * u * t * c.y0 + 3 * u * t * t * c.y1 + t * t * t * c.y1;
    return [x, y];
  },
  buildCables(list) {
    const gl = this.gl;
    const SEG = 44;
    const s = this.sc;
    const hw = 4.6 * s;
    const data = new Float32Array(list.length * SEG * 6 * 9);
    let k = 0;
    list.forEach((c, id) => {
      const pts = [];
      let len = 0;
      for (let i = 0; i <= SEG; i++) { const p = this.bez(c, i / SEG); pts.push([p[0] * s, p[1] * s]); if (i) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); }
      const nrm = pts.map((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(SEG, i + 1)];
        let dx = b[0] - a[0], dy = b[1] - a[1];
        const l = Math.hypot(dx, dy) || 1;
        return [-dy / l, dx / l];
      });
      const col = c.col;
      const put = (p, n, u, v) => { data[k++] = p[0] + n[0] * hw * v; data[k++] = p[1] + n[1] * hw * v; data[k++] = u; data[k++] = v; data[k++] = col[0]; data[k++] = col[1]; data[k++] = col[2]; data[k++] = id; data[k++] = len / s; };
      for (let i = 0; i < SEG; i++) {
        const u0 = i / SEG, u1 = (i + 1) / SEG;
        put(pts[i], nrm[i], u0, -1); put(pts[i + 1], nrm[i + 1], u1, -1); put(pts[i + 1], nrm[i + 1], u1, 1);
        put(pts[i], nrm[i], u0, -1); put(pts[i + 1], nrm[i + 1], u1, 1); put(pts[i], nrm[i], u0, 1);
      }
    });
    this.cableVerts = k / 9;
    gl.bindVertexArray(this.vao.cable);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.cable);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, k), gl.STATIC_DRAW);
    const P = this.P.cable.p;
    const at = (name, size, off) => { const l = gl.getAttribLocation(P, name); if (l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 36, off * 4); };
    at('a_pos', 2, 0); at('a_uv', 2, 2); at('a_col', 3, 4); at('a_meta', 2, 7);
    gl.bindVertexArray(null);
    // 兩端的接點
    this.nodes = [];
    list.forEach((c) => { this.nodes.push([c.x0, c.y0, c.col], [c.x1, c.y1, c.col]); });
  },
  /** 開場：光纜依序畫出來 */
  revealCables(stagger = 0.9) {
    this.revealAll = true;
    this.cables.forEach((c, i) => { c.rd = this.t + (c.col0 || 0) * 0.22 + Math.random() * stagger * 0.4; c.rv = 0; });
    this.revealing = true;
  },

  // ---------------------------------------------------------------- 封包與火花
  /** 沿著 a→b 的光纜（沒有就臨時拉一條）送一顆光點 */
  packet(ax, ay, bx, by, col, { dur = 0.8, size = 1, onArrive, cable = -1 } = {}) {
    const path = cable >= 0 ? this.cables[cable] : { x0: ax, y0: ay, x1: bx, y1: by };
    this.packets.push({ path, cable, t: 0, dur: dur * (0.9 + Math.random() * 0.2), col, size, onArrive, trail: [] });
  },
  spark(x, y, col, n = 10, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (40 + Math.random() * 160) * power;
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.4, age: 0, col, size: 3 + Math.random() * 4 });
    }
  },
  /** 開機：四周的光點往眼睛聚過去 */
  converge(n = 220) {
    const cx = this.W / 2, cy = this.H * 0.44;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.max(this.W, this.H) * (0.55 + Math.random() * 0.5);
      this.motes.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, tx: cx + Math.cos(a) * this.H * 0.2, ty: cy + Math.sin(a) * this.H * 0.2, d: 1.1 + Math.random() * 2.4, age: -Math.random() * 1.6, col: Math.random() < 0.75 ? [0.3, 0.85, 1] : [1, 0.72, 0.25] });
    }
  },
  fireBeam() { this.beam.t0 = this.t; },

  // ---------------------------------------------------------------- 每一格
  start() { if (this.running || !this.ok) return; this.running = true; this.last = performance.now(); requestAnimationFrame((t) => this.frame(t)); },
  stop() { this.running = false; },
  frame(now2) {
    if (!this.running) return;
    requestAnimationFrame((t) => this.frame(t));
    if (this.lost || document.hidden) { this.last = now2; return; }
    const dt = Math.min(0.05, (now2 - this.last) / 1000); this.last = now2; this.t += dt;
    const t0 = performance.now();
    this.update(dt);
    this.draw();
    this.adapt(performance.now() - t0, dt);
  },
  update(dt) {
    // 光纜的活化慢慢退、開場慢慢長出來
    const A = this.act;
    if (A) {
      for (let i = 0; i < this.cables.length; i++) {
        A[i * 4] = Math.max(0, A[i * 4] - dt * 0.9);
        if (this.revealing) {
          const c = this.cables[i];
          if (this.t > c.rd) A[i * 4 + 1] = Math.min(1, A[i * 4 + 1] + dt * 1.6);
        } else if (this.revealAll) A[i * 4 + 1] = 1;
      }
      if (this.revealing && this.cables.every((c, i) => A[i * 4 + 1] >= 1)) this.revealing = false;
    }
    // 封包
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i];
      p.t += dt / p.dur;
      const tt = Math.min(1, p.t);
      const e = tt < 0.5 ? 2 * tt * tt : 1 - Math.pow(-2 * tt + 2, 2) / 2;
      const [x, y] = this.bez(p.path, e);
      p.trail.push([x, y]); if (p.trail.length > 16) p.trail.shift();
      p.x = x; p.y = y;
      if (p.cable >= 0 && A) A[p.cable * 4] = Math.min(1, A[p.cable * 4] + dt * 6);
      if (p.t >= 1) { this.packets.splice(i, 1); this.spark(x, y, p.col, 8, 0.7 * p.size); if (p.onArrive) p.onArrive(); }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.9; s.vy *= 0.9;
      if (s.age > s.life) this.sparks.splice(i, 1);
    }
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.age += dt;
      if (m.age > m.d) this.motes.splice(i, 1);
    }
    // 開機的眼睛：還沒喚醒時半睜著呼吸；喚醒後慢慢睜開
    const B = this.boot;
    if (B.on) {
      const s = this.t - B.t0;
      const target = B.idle ? 0.15 + 0.045 * Math.sin(this.t * 1.3) : (s > 0.45 ? 1 : 0.15);
      B.open += (target - B.open) * Math.min(1, dt * (B.idle ? 3 : 2.1));
    }
    B.flash = Math.max(0, B.flash - dt * 2.4);
    this.flash = Math.max(0, this.flash - dt * 1.4);
    if (this.onFrame) this.onFrame(dt);
  },
  draw() {
    const gl = this.gl, S = this.fbo.scene;
    const res = [this.pw, this.ph];
    gl.bindFramebuffer(gl.FRAMEBUFFER, S.f);
    gl.viewport(0, 0, S.w, S.h);
    gl.disable(gl.BLEND);
    // 背景
    let P = this.P.bg;
    gl.useProgram(P.p);
    gl.uniform2f(P.u.res, S.w, S.h); gl.uniform1f(P.u.time, this.t); gl.uniform1f(P.u.grid, 4 * this.rem * this.sc); gl.uniform1f(P.u.lift, this.energy);
    gl.bindVertexArray(this.vao.empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    // 光纜
    if (this.cableVerts) {
      gl.bindTexture(gl.TEXTURE_2D, this.actTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.nCab, 1, 0, gl.RGBA, gl.FLOAT, this.act);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      P = this.P.cable;
      gl.useProgram(P.p);
      gl.uniform2f(P.u.res, S.w, S.h); gl.uniform1f(P.u.time, this.t); gl.uniform1i(P.u.act, 0); gl.uniform1f(P.u.nCab, this.nCab);
      gl.uniform1f(P.u.energy, this.energy); gl.uniform1f(P.u.flow, settings.fx === 'low' ? 0 : 1);
      gl.bindVertexArray(this.vao.cable);
      gl.drawArrays(gl.TRIANGLES, 0, this.cableVerts);
    }
    // 掃描光束
    const bt = (this.t - this.beam.t0) / this.beam.dur;
    if (this.beam.t0 >= 0 && bt >= 0 && bt <= 1) {
      const e = bt < 0.5 ? 2 * bt * bt : 1 - Math.pow(-2 * bt + 2, 2) / 2;
      P = this.P.beam;
      gl.useProgram(P.p);
      gl.uniform2f(P.u.res, S.w, S.h); gl.uniform1f(P.u.x, (-0.03 + 1.06 * e) * S.w); gl.uniform1f(P.u.a, Math.sin(Math.PI * bt) ** 0.6);
      gl.bindVertexArray(this.vao.empty);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // 開機的眼睛
    if (this.boot.on) {
      P = this.P.eye;
      gl.useProgram(P.p);
      gl.uniform2f(P.u.res, S.w, S.h); gl.uniform1f(P.u.time, this.t); gl.uniform1f(P.u.open, this.boot.open); gl.uniform1f(P.u.zoom, this.boot.zoom);
      gl.uniform1f(P.u.scan, this.boot.idle ? 0.45 + 0.1 * Math.sin(this.t * 2.0) : Math.min(1, (this.t - this.boot.t0) / 0.7) * 0.6);
      gl.bindVertexArray(this.vao.empty);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // 光點：接點、封包（含拖尾）、火花、開機聚光
    const s = this.sc;
    const pts = [];
    const push = (x, y, size, c, a) => { pts.push(x * s, y * s, size * s, c[0], c[1], c[2], a); };
    if (!this.boot.on) for (const [x, y, c] of this.nodes) push(x, y, 7, c, 0.55 + this.energy * 0.3);
    for (const p of this.packets) {
      p.trail.forEach(([x, y], k) => { const a = (k + 1) / p.trail.length; push(x, y, 10 * p.size * a + 2, p.col, a * 0.7); });
      push(p.x, p.y, 22 * p.size, p.col, 1.4);
    }
    for (const sp of this.sparks) { const a = 1 - sp.age / sp.life; push(sp.x, sp.y, sp.size * a + 1, sp.col, a * 1.2); }
    for (const m of this.motes) {
      if (m.age < 0) continue;
      const u = Math.min(1, m.age / m.d), e = u * u * u;
      for (let k = 0; k < 4; k++) {
        const uu = Math.max(0, e - k * 0.035);
        push(m.x + (m.tx - m.x) * uu, m.y + (m.ty - m.y) * uu, 6 - k, m.col, (1 - k * 0.22) * Math.sin(Math.PI * u) * 1.2);
      }
    }
    if (pts.length) {
      const arr = new Float32Array(pts);
      P = this.P.pts;
      gl.useProgram(P.p);
      gl.uniform2f(P.u.res, S.w, S.h);
      gl.bindVertexArray(this.vao.pts);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.pts);
      gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
      const at = (name, size, off) => { const l = gl.getAttribLocation(P.p, name); if (l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 28, off * 4); };
      at('a_pos', 2, 0); at('a_size', 1, 2); at('a_col', 4, 3);
      gl.drawArrays(gl.POINTS, 0, arr.length / 7);
    }
    gl.disable(gl.BLEND);
    // 泛光
    const mips = this.mips;
    if (mips.length) {
      P = this.P.pre;
      gl.useProgram(P.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, mips[0].f); gl.viewport(0, 0, mips[0].w, mips[0].h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.t);
      gl.uniform1i(P.u.src, 0); gl.uniform2f(P.u.hp, 0.5 / S.w, 0.5 / S.h); gl.uniform1f(P.u.th, this.hdr ? 0.55 : 0.35);
      gl.bindVertexArray(this.vao.empty);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      P = this.P.down;
      gl.useProgram(P.p);
      for (let i = 1; i < mips.length; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, mips[i].f); gl.viewport(0, 0, mips[i].w, mips[i].h);
        gl.bindTexture(gl.TEXTURE_2D, mips[i - 1].t);
        gl.uniform1i(P.u.src, 0); gl.uniform2f(P.u.hp, 0.5 / mips[i - 1].w, 0.5 / mips[i - 1].h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      P = this.P.up;
      gl.useProgram(P.p);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      for (let i = mips.length - 1; i > 0; i--) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, mips[i - 1].f); gl.viewport(0, 0, mips[i - 1].w, mips[i - 1].h);
        gl.bindTexture(gl.TEXTURE_2D, mips[i].t);
        gl.uniform1i(P.u.src, 0); gl.uniform2f(P.u.hp, 0.5 / mips[i].w, 0.5 / mips[i].h); gl.uniform1f(P.u.w, 1.0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.disable(gl.BLEND);
    }
    // 合成到畫面
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.pw, this.ph);
    P = this.P.comp;
    gl.useProgram(P.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.t);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mips.length ? mips[0].t : S.t);
    gl.uniform1i(P.u.scene, 0); gl.uniform1i(P.u.bloom, 1);
    gl.uniform1f(P.u.strength, mips.length ? this.strength * (1 + this.energy * 0.35) : 0);
    gl.uniform1f(P.u.time, this.t); gl.uniform2f(P.u.res, this.pw, this.ph); gl.uniform1f(P.u.flash, this.flash + this.boot.flash);
    gl.bindVertexArray(this.vao.empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
  },
  /** 太慢就自動降畫質（掛在電視上的瀏覽器有時候很弱） */
  adapt(ms, dt) {
    this.frameMs.push(dt * 1000);
    if (this.frameMs.length < 90) return;
    const avg = this.frameMs.reduce((a, b) => a + b, 0) / this.frameMs.length;
    this.frameMs = [];
    if (avg > 26 && this.quality > 0.5) { this.quality = Math.max(0.5, this.quality - 0.25); this.resize(); }
  },
};
