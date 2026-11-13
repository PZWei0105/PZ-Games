/* ===================== skin: 霓虹城市 3D NEON METROPOLIS — fly down a cyberpunk avenue in real 3D =====================
   Two rows of towers on each side (instanced boxes, recycled ahead of the camera as it passes), every window and neon
   edge lit in the shader, some towers carrying giant screens that show the song's cover. Rain, flying traffic in
   four lanes, a magenta haze. The camera's speed follows the tempo; the beat pulses the neon; in the chorus the camera
   climbs over the rooftops and looks down on the whole city. Tilt the phone to look around. */
R.skins.def({
  id: 'neoncity', name: '霓虹城市', group: '酷炫', en: 'NEON METROPOLIS',
  desc: '在賽博城市的大樓之間穿梭飛行，路邊大螢幕播著你的封面，副歌飛上天際',
  bloom: { s: 0.78, th: 0.5, streak: 0.55, tint: '#ff6ad5' }, hero: '.nc-art', trans: 'portal', hype: false,
  theme: { bg: '#07031a', fg: '#f3ecff', accent: '#ff2bd6', accent2: '#00e5ff', ui: 'rgba(14,6,34,.97)', dock: 'rgba(24,8,52,.5)', dockfg: '#9ff6ff' },
  enterMs: 2200, swapMs: 1400,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="ncs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07031a"/><stop offset=".7" stop-color="#3a0b5c"/><stop offset="1" stop-color="#ff2bd6"/></linearGradient></defs><rect width="116" height="150" fill="url(#ncs)"/><path d="M0 150V40h22v110z" fill="#0d0820"/><path d="M94 150V30h22v120z" fill="#0d0820"/><path d="M24 150V70h14v80zM78 150V62h14v88z" fill="#140b2e"/><path d="M40 150V96h8v54zM68 150V92h8v58z" fill="#1d1040"/><g fill="#ffd38a"><rect x="4" y="50" width="3" height="3"/><rect x="12" y="62" width="3" height="3"/><rect x="98" y="44" width="3" height="3"/><rect x="106" y="70" width="3" height="3"/><rect x="28" y="80" width="2" height="2"/><rect x="84" y="74" width="2" height="2"/></g><rect x="96" y="80" width="18" height="18" fill="#00e5ff" opacity=".85"/><path d="M22 40v110M94 30v120" stroke="#ff2bd6" stroke-width="2"/><path d="M58 150L52 110h12z" fill="#ff2bd6" opacity=".35"/><g stroke="#9ff6ff" stroke-width=".8" opacity=".5"><path d="M10 20l-2 9M30 12l-2 9M60 22l-2 9M84 8l-2 9M104 18l-2 9"/></g><circle cx="56" cy="64" r="2" fill="#ff4060"/><circle cx="62" cy="64" r="2" fill="#ff4060"/></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 1600, dur: 0.04, v: 0.05, type: 'triangle' }); },
    tick(s, t) { s.tone(t, { f: 2800, dur: 0.02, v: 0.03, type: 'triangle' }); },
    toggle(s, t) { s.tone(t, { f: 700, f2: 1400, dur: 0.08, v: 0.06, type: 'sawtooth', lp: 3000 }); },
    play(s, t) { s.notes(t, [s.hz(62), s.hz(69), s.hz(74), s.hz(81)], { dur: 0.16, v: 0.06, type: 'sawtooth', gap: 0.05, lp: 2600 }); },
    pause(s, t) { s.notes(t, [s.hz(81), s.hz(74), s.hz(69)], { dur: 0.14, v: 0.06, type: 'sawtooth', gap: 0.05, lp: 2400 }); },
    next(s, t) { s.noise(t, { f: 600, f2: 6000, dur: 0.25, v: 0.06, q: 3 }); s.tone(t, { f: 300, f2: 1500, dur: 0.2, v: 0.05, type: 'sawtooth', lp: 3000 }); },
    prev(s, t) { s.noise(t, { f: 6000, f2: 600, dur: 0.25, v: 0.06, q: 3 }); s.tone(t, { f: 1500, f2: 300, dur: 0.2, v: 0.05, type: 'sawtooth', lp: 3000 }); },
    enter(s, t) { s.noise(t, { f: 2500, dur: 1.6, v: 0.025, type: 'highpass' }); s.tone(t, { f: 45, f2: 90, dur: 1.4, v: 0.12, type: 'sawtooth', lp: 500 }); s.notes(t + 0.8, [s.hz(57), s.hz(64), s.hz(69), s.hz(76), s.hz(81)], { dur: 0.25, v: 0.04, type: 'sawtooth', gap: 0.08, lp: 2200 }); },
    open(s, t) { s.tone(t, { f: 900, f2: 1600, dur: 0.1, v: 0.05, type: 'triangle' }); },
    close(s, t) { s.tone(t, { f: 1600, f2: 900, dur: 0.1, v: 0.05, type: 'triangle' }); },
    ok(s, t) { s.notes(t, [s.hz(81), s.hz(88)], { dur: 0.14, v: 0.06, type: 'triangle', gap: 0.07 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="nc-cv"></canvas><div class="nc-scan"></div>
      <div class="nc-top" data-ui><b>NEON<i>//</i>METRO<span class="nc-full">POLIS</span></b><span data-nc="where">DISTRICT 9 · --:-- AM</span></div>
      <div class="nc-panel">
        <div class="nc-card" data-ui>
          <div class="nc-art"><img data-bind="cover" alt="" draggable="false"></div>
          <div class="nc-tx"><div class="nc-t" data-bind="title"></div><div class="nc-a" data-bind="artist"></div><div class="nc-meta"><span data-bind="bpm">--</span> BPM · <span data-bind="idx">00/00</span></div></div>
        </div>
        <div class="seek nc-seek" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div><div class="seek-times"><span data-bind="time">0:00</span><span data-bind="dur">0:00</span></div></div>
        ${R.ui.ctrl('nc-ctrl')}
      </div>`;
    const cvEl = root.querySelector('.nc-cv');
    const whereEl = root.querySelector('[data-nc="where"]');
    const G = R.glk.context(cvEl, { alpha: false, depth: true, preserve: true });
    let ok = false, gl = null, P = {}, buf = {}, tex = null, draw = null;
    const NB = 100;
    const inst = new Float32Array(NB * 8);
    const B = [];
    const rnd = R.rng(90210);
    // the avenue: row 1 hugs the street, row 2 stands behind it, taller
    const ROW = [{ n: 30, x0: 10, gap: [3, 9], w: [7, 13], d: [8, 15], h: [14, 60] }, { n: 20, x0: 30, gap: [4, 12], w: [10, 18], d: [12, 22], h: [40, 120] }];
    function reseed(b) {
      const r = ROW[b.row];
      b.w = r.w[0] + rnd() * (r.w[1] - r.w[0]); b.d = r.d[0] + rnd() * (r.d[1] - r.d[0]);
      b.h = r.h[0] + Math.pow(rnd(), 1.6) * (r.h[1] - r.h[0]);
      b.seed = rnd() * 100; b.kind = b.row === 0 && rnd() < 0.28 ? 1 : 0;
      b.x = b.side * (r.x0 + b.w / 2 + rnd() * 2);
    }
    for (const side of [-1, 1]) for (let row = 0; row < 2; row++) {
      let z = -20;
      for (let i = 0; i < ROW[row].n; i++) { const b = { side, row, z: 0 }; reseed(b); b.z = z + b.d / 2; z += b.d + ROW[row].gap[0] + rnd() * (ROW[row].gap[1] - ROW[row].gap[0]); B.push(b); }
      B.filter((b) => b.side === side && b.row === row).forEach((b) => { b.span = z + 20; });
    }
    // traffic: road cars and three flying lanes; rain
    const cars = []; for (let i = 0; i < 46; i++) { const lane = i % 4; cars.push({ x: (lane === 0 ? 3 : 4 + lane) * (i % 2 ? 1 : -1), y: [1.1, 9, 16, 25][lane], z: rnd() * 420, v: (i % 2 ? 1 : -1) * (14 + rnd() * 22), toward: i % 2 === 0 }); }
    const NR = 220, rain = new Float32Array(NR * 6), drops = []; for (let i = 0; i < NR; i++) drops.push({ x: (rnd() - 0.5) * 60, y: rnd() * 40, z: rnd() * 80 });
    const carBuf = new Float32Array(cars.length * 7);
    const VS_B = `attribute vec3 aP; attribute vec3 aN; attribute vec4 iA; attribute vec4 iB;
      uniform mat4 uVP; varying vec3 vW; varying vec3 vN; varying vec3 vL; varying vec4 vB; varying vec3 vS;
      void main(){ vec3 s = vec3(iA.z, iB.x, iA.w); vec3 l = (aP + vec3(0., .5, 0.))*s; vec3 w = vec3(iA.x, 0., iA.y) + l;
        vW = w; vN = aN; vL = l; vB = iB; vS = s; gl_Position = uVP*vec4(w, 1.); }`;
    const FS_B = `precision highp float;
      varying vec3 vW; varying vec3 vN; varying vec3 vL; varying vec4 vB; varying vec3 vS;
      uniform vec3 uCam; uniform float uTime, uLit, uBeat, uPPU; uniform vec3 uHaze, uC1, uC2; uniform sampler2D uCover;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
      void main(){
        float seed = vB.y;
        vec3 col = vec3(.016, .016, .03) + vec3(.012, .008, .02)*h(vec2(seed, 1.));
        if (abs(vN.y) < .5) {
          float side = abs(vN.x) > .5 ? 1. : 0.;
          vec2 fc = side > .5 ? vec2(vL.z + vS.z*.5, vL.y) : vec2(vL.x + vS.x*.5, vL.y);
          float fw = side > .5 ? vS.z : vS.x;
          vec2 g = fc/vec2(2.3, 3.1), cell = floor(g), f = fract(g);
          float win = step(.16, f.x)*step(f.x, .84)*step(.24, f.y)*step(f.y, .78);
          float r = h(cell + seed*13.1 + vN.xz*7.);
          float lit = step(1. - uLit*(.3 + .55*h(vec2(seed, 3.))), r);
          vec3 wc = r > .965 ? uC2 : r > .92 ? uC1 : mix(vec3(1., .78, .5), vec3(.7, .85, 1.), step(.6, h(vec2(seed, 9.))));
          // far away a window is smaller than a pixel: fade to the average glow instead of shimmering
          float px = 3.1*uPPU/max(length(vW - uCam), 1.);
          float lod = smoothstep(2.2, 5.5, px);
          vec3 avg = mix(vec3(1., .8, .55), vec3(.75, .8, 1.), .3)*uLit*.42*.5;
          col += mix(avg, wc*win*lit*(1.05 + .25*sin(uTime*1.5 + r*40.)), lod);
          // neon: a strip up one corner, a band round the roof
          vec3 nc = fract(seed*7.31) > .5 ? uC1 : uC2;
          float edge = smoothstep(.3, .0, min(fc.x, fw - fc.x))*step(.5, fract(seed*3.17));
          float roof = smoothstep(.4, .0, abs(fc.y - vS.y + .5));
          float band = smoothstep(.25, .0, abs(fc.y - vS.y*(.3 + .4*fract(seed*1.7))))*step(.7, fract(seed*5.3));
          col += nc*(edge + roof*.9 + band*.8)*(1.15 + uBeat*1.6);
          // a giant screen with the cover
          if (vB.z > .5 && side > .5) {
            vec2 q = (fc - vec2(fw*.5, vS.y*.58))/vec2(fw*.82);
            if (abs(q.x) < .5 && abs(q.y) < .5) {
              vec3 cv = texture2D(uCover, vec2(q.x*sign(vN.x) + .5, .5 - q.y)).rgb;
              float sc = .86 + .14*sin(fc.y*30. - uTime*6.);
              col = cv*1.3*sc + nc*.1*(1. + uBeat);
              col += nc*.9*smoothstep(.47, .5, max(abs(q.x), abs(q.y)));
            }
          }
        } else col += uC1*.03;
        float d = length(vW - uCam);
        col = mix(col, uHaze, 1. - exp(-d*.0048));
        gl_FragColor = vec4(col, 1.);
      }`;
    const VS_G = `attribute vec3 aP; uniform mat4 uVP; varying vec3 vW; void main(){ vW = aP; gl_Position = uVP*vec4(aP, 1.); }`;
    const FS_G = `precision highp float; varying vec3 vW; uniform vec3 uCam; uniform vec3 uHaze, uC1, uC2; uniform float uTime, uBeat;
      void main(){
        float x = abs(vW.x);
        vec3 col = x < 8.5 ? vec3(.03, .028, .045) : vec3(.02, .018, .03);
        float lane = step(.88, fract(vW.z*.08 + uTime*.0))*step(abs(abs(vW.x) - 2.8), .12)*step(x, 8.);
        col += vec3(.75, .72, .8)*lane*.6;
        col += vec3(.9, .85, .7)*step(abs(x - 8.4), .08)*.5;
        // wet street: the neon smeared in long streaks
        float st = sin(vW.z*.05 + vW.x*1.7)*.5 + .5;
        col += (uC1*smoothstep(8., 2., x) + uC2*smoothstep(3., 9., x))*.06*(.6 + st*.8)*(1. + uBeat*.6);
        float d = length(vW - uCam);
        col = mix(col, uHaze, 1. - exp(-d*.006));
        gl_FragColor = vec4(col, 1.);
      }`;
    const FS_S = `precision highp float; varying vec2 uv; uniform vec3 uHaze, uC1, uC2; uniform float uYaw, uTime, uPitch, uAsp;
      float h(float p){ return fract(sin(p*127.1)*43758.5453); }
      void main(){
        float y = uv.y + uPitch;
        vec3 col = mix(uHaze*1.15, vec3(.02, .01, .06), smoothstep(.35, 1., y));
        col += uC1*.25*exp(-pow((y - .42)*7., 2.));
        // a far skyline in silhouette, turning with the camera
        float x = (uv.x - .5)*uAsp + uYaw*1.2;
        float c = floor(x*38.), bh = .36 + .2*h(c) + .1*h(c*1.7)*step(.8, h(c*3.1));
        if (y < bh && y > .25) { col = mix(uHaze*.75, vec3(.03, .02, .07), .55); if (h(floor(x*260.) + floor(y*140.)*31.) > .93) col += vec3(1., .75, .5)*.35; }
        // stars
        vec2 g = floor(uv*vec2(140., 90.)); if (h(g.x + g.y*137.) > .996 && y > .6) col += vec3(.8);
        gl_FragColor = vec4(col, 1.);
      }`;
    const VS_P = `attribute vec3 aP; attribute vec3 aC; attribute float aS; uniform mat4 uVP; uniform vec3 uCam; varying vec3 vC;
      void main(){ gl_Position = uVP*vec4(aP, 1.); float d = length(aP - uCam); gl_PointSize = clamp(aS*240./max(d, 1.), 1., 48.); vC = aC*clamp(1.4 - d*.003, .1, 1.); }`;
    const FS_P = `precision mediump float; varying vec3 vC; void main(){ vec2 q = gl_PointCoord*2. - 1.; float r = dot(q, q); if (r > 1.) discard; gl_FragColor = vec4(vC*(exp(-r*4.)*1.4 + .2), 1.); }`;
    const VS_R = `attribute vec3 aP; uniform mat4 uVP; void main(){ gl_Position = uVP*vec4(aP, 1.); }`;
    const FS_R = `precision mediump float; uniform float uA; void main(){ gl_FragColor = vec4(vec3(.55, .75, .95)*uA, 1.); }`;
    const CUBE = (() => {
      const f = [[[1, 0, 0], [[.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5], [.5, -.5, .5]]], [[-1, 0, 0], [[-.5, -.5, .5], [-.5, .5, .5], [-.5, .5, -.5], [-.5, -.5, -.5]]],
        [[0, 1, 0], [[-.5, .5, -.5], [-.5, .5, .5], [.5, .5, .5], [.5, .5, -.5]]], [[0, 0, 1], [[.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5], [-.5, -.5, .5]]], [[0, 0, -1], [[-.5, -.5, -.5], [-.5, .5, -.5], [.5, .5, -.5], [.5, -.5, -.5]]]];
      const out = [];
      for (const [n, q] of f) for (const k of [0, 1, 2, 0, 2, 3]) out.push(...q[k], ...n);
      return new Float32Array(out);
    })();
    function setup() {
      gl = G.gl;
      P.b = R.glk.program(gl, VS_B, FS_B); P.g = R.glk.program(gl, VS_G, FS_G); P.s = R.glk.program(gl, R.glk.FULL_VS, FS_S);
      P.p = R.glk.program(gl, VS_P, FS_P); P.r = R.glk.program(gl, VS_R, FS_R);
      draw = R.glk.fullscreen(gl);
      buf.cube = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf.cube); gl.bufferData(gl.ARRAY_BUFFER, CUBE, gl.STATIC_DRAW);
      buf.inst = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf.inst); gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW);
      buf.ground = gl.createBuffer(); buf.cars = gl.createBuffer(); buf.rain = gl.createBuffer();
      tex = R.glk.texture(gl, { fill: [255, 43, 214, 255] });
      ok = true;
    }
    if (G) { try { setup(); } catch (e) { console.warn('neoncity', e); ok = false; } G.onrestored = () => { try { setup(); loadCover(); } catch (e) { ok = false; } }; }
    if (!ok) root.classList.add('nc-flat');
    let W = 1, H = 1;
    function resize() {
      const r = cvEl.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
      const sc = Math.min(window.devicePixelRatio || 1, 1.5) * Math.max(0.6, R.quality());
      cvEl.width = Math.max(2, Math.round(W * sc)); cvEl.height = Math.max(2, Math.round(H * sc));
    }
    resize();
    let tok = 0;
    async function loadCover() { if (!ok) return; const my = ++tok; const c = await R.glk.coverCanvas(api.track(), 256); if (my === tok && ok) R.glk.upload(gl, tex, c, false); }
    // tiny matrix kit (column-major)
    const persp = (fy, a, n, f) => { const t = 1 / Math.tan(fy / 2), nf = 1 / (n - f); return new Float32Array([t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]); };
    const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    function look(e, c) { const z = norm([e[0] - c[0], e[1] - c[1], e[2] - c[2]]), x = norm(cross([0, 1, 0], z)), y = cross(z, x); return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]); }
    function mul(a, b) { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
    const off = (prog) => { for (const k of Object.keys(prog.a)) { const l = prog.a[k]; if (l >= 0) { gl.disableVertexAttribArray(l); if (G.inst) G.inst.div(l, 0); } } };
    function attr(prog, name, size, stride, off, div) { const loc = prog.a[name]; if (loc == null || loc < 0) return; gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off); if (G.inst) G.inst.div(loc, div || 0); }
    let camZ = 0, rise = 0, enterT = 0, flash = 0, t0 = 0, lastWhere = 0;
    const c1 = R.glk.hex3('#ff2bd6'), c2 = R.glk.hex3('#00e5ff'), haze = [0.16, 0.05, 0.22];
    return {
      enter() { enterT = 0; },
      swap() { flash = 1; },
      onTrack: loadCover,
      resize,
      frame(dt, t, v) {
        t0 += dt; enterT += dt; flash *= Math.exp(-dt * 3);
        const spd = v.playing ? 16 + Math.min(150, v.bpm || 110) * 0.16 + v.level * 10 + v.hot * 18 : 3;
        const ez = Math.min(1, enterT / 2);
        camZ += dt * spd * (0.3 + ez * 0.7) + dt * flash * 60;
        rise += ((v.hot > 0.5 && !R.reduced ? 1 : 0) - rise) * (1 - Math.exp(-dt * 0.8));
        root.style.setProperty('--lv', v.level.toFixed(3));
        if (t0 - lastWhere > 20 || !lastWhere) { lastWhere = t0; const d = new Date(); whereEl.textContent = 'DISTRICT 9 · ' + String(d.getHours() % 12 || 12).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + (d.getHours() < 12 ? ' AM' : ' PM'); }
        if (!ok || G.lost) return;
        // recycle towers that fell behind the camera
        for (const b of B) if (b.z + b.d / 2 < camZ - 12) { b.z += b.span; reseed(b); }
        B.forEach((b, i) => { inst.set([b.x, b.z, b.w, b.d, b.h, b.seed, b.kind, 0], i * 8); });
        // camera: down the avenue, or high over the roofs in the chorus
        const tl = R.tilt, ey = 6.5 + rise * 30 + (1 - ez) * 40, ex = Math.sin(t0 * 0.23) * 1.4;
        const eye = [ex, ey, camZ];
        const yaw = tl.x * 0.5 + Math.sin(t0 * 0.17) * 0.06, pit = -0.04 - rise * 0.42 - tl.y * 0.25 - (1 - ez) * 0.5;
        const ctr = [ex + Math.sin(yaw) * 10, ey + Math.sin(pit) * 10, camZ + Math.cos(yaw) * 10];
        const aspect = cvEl.width / cvEl.height;
        const fovy = aspect < 1 ? 1.25 : 0.95;
        const VP = mul(persp(fovy, aspect, 0.5, 900), look(eye, ctr));
        gl.viewport(0, 0, cvEl.width, cvEl.height);
        gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // sky
        gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
        P.s.use(); gl.uniform3f(P.s.u.uHaze, haze[0], haze[1], haze[2]); gl.uniform3f(P.s.u.uC1, c1[0], c1[1], c1[2]); gl.uniform3f(P.s.u.uC2, c2[0], c2[1], c2[2]);
        gl.uniform1f(P.s.u.uYaw, yaw); gl.uniform1f(P.s.u.uTime, t0); gl.uniform1f(P.s.u.uPitch, -pit * 0.9); gl.uniform1f(P.s.u.uAsp, aspect);
        draw(P.s); off(P.s);
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
        // street
        const gz0 = camZ - 30, gz1 = camZ + 700;
        const gv = new Float32Array([-400, 0, gz0, 400, 0, gz0, 400, 0, gz1, -400, 0, gz0, 400, 0, gz1, -400, 0, gz1]);
        P.g.use(); gl.uniformMatrix4fv(P.g.u.uVP, false, VP); gl.uniform3f(P.g.u.uCam, eye[0], eye[1], eye[2]);
        gl.uniform3f(P.g.u.uHaze, haze[0], haze[1], haze[2]); gl.uniform3f(P.g.u.uC1, c1[0], c1[1], c1[2]); gl.uniform3f(P.g.u.uC2, c2[0], c2[1], c2[2]);
        gl.uniform1f(P.g.u.uTime, t0); gl.uniform1f(P.g.u.uBeat, v.beat);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.ground); gl.bufferData(gl.ARRAY_BUFFER, gv, gl.DYNAMIC_DRAW);
        attr(P.g, 'aP', 3, 12, 0); gl.drawArrays(gl.TRIANGLES, 0, 6); off(P.g);
        // towers
        P.b.use(); gl.uniformMatrix4fv(P.b.u.uVP, false, VP); gl.uniform3f(P.b.u.uCam, eye[0], eye[1], eye[2]);
        gl.uniform1f(P.b.u.uPPU, cvEl.height / (2 * Math.tan(fovy / 2))); gl.uniform1f(P.b.u.uTime, t0); gl.uniform1f(P.b.u.uLit, 0.42 + v.level * 0.38 + v.hot * 0.15); gl.uniform1f(P.b.u.uBeat, v.beat + flash * 0.8);
        gl.uniform3f(P.b.u.uHaze, haze[0], haze[1], haze[2]); gl.uniform3f(P.b.u.uC1, c1[0], c1[1], c1[2]); gl.uniform3f(P.b.u.uC2, c2[0], c2[1], c2[2]);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(P.b.u.uCover, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.cube); attr(P.b, 'aP', 3, 24, 0); attr(P.b, 'aN', 3, 24, 12);
        if (G.inst) {
          gl.bindBuffer(gl.ARRAY_BUFFER, buf.inst); gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst);
          attr(P.b, 'iA', 4, 32, 0, 1); attr(P.b, 'iB', 4, 32, 16, 1);
          G.inst.draw(gl.TRIANGLES, 0, 30, NB);
        } else {
          gl.disableVertexAttribArray(P.b.a.iA); gl.disableVertexAttribArray(P.b.a.iB);
          for (let i = 0; i < NB; i++) { gl.vertexAttrib4f(P.b.a.iA, inst[i * 8], inst[i * 8 + 1], inst[i * 8 + 2], inst[i * 8 + 3]); gl.vertexAttrib4f(P.b.a.iB, inst[i * 8 + 4], inst[i * 8 + 5], inst[i * 8 + 6], 0); gl.drawArrays(gl.TRIANGLES, 0, 30); }
        }
        off(P.b);
        // traffic lights and rain, added on top
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
        cars.forEach((c, i) => {
          c.z += c.v * dt * (v.playing ? 1 : 0.3);
          if (c.z < camZ - 20) c.z += 460; if (c.z > camZ + 440) c.z -= 460;
          const col = c.toward ? [1, 0.95, 0.85] : [1, 0.12, 0.2];
          carBuf.set([c.x, c.y, c.z, col[0], col[1], col[2], c.y > 2 ? 2.6 : 1.8], i * 7);
        });
        P.p.use(); gl.uniformMatrix4fv(P.p.u.uVP, false, VP); gl.uniform3f(P.p.u.uCam, eye[0], eye[1], eye[2]);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.cars); gl.bufferData(gl.ARRAY_BUFFER, carBuf, gl.DYNAMIC_DRAW);
        attr(P.p, 'aP', 3, 28, 0); attr(P.p, 'aC', 3, 28, 12); attr(P.p, 'aS', 1, 28, 24);
        gl.drawArrays(gl.POINTS, 0, cars.length); off(P.p);
        if (!R.reduced) {
          for (let i = 0; i < NR; i++) {
            const d = drops[i]; d.y -= dt * 34; if (d.y < 0) { d.y += 40; d.x = (rnd() - 0.5) * 60; d.z = rnd() * 80; }
            const x = eye[0] + d.x, z = camZ + d.z + 4, y = eye[1] - 18 + d.y;
            rain.set([x, y, z, x - 0.1, y - 1.6, z - 0.3], i * 6);
          }
          P.r.use(); gl.uniformMatrix4fv(P.r.u.uVP, false, VP); gl.uniform1f(P.r.u.uA, 0.16);
          gl.bindBuffer(gl.ARRAY_BUFFER, buf.rain); gl.bufferData(gl.ARRAY_BUFFER, rain, gl.DYNAMIC_DRAW);
          attr(P.r, 'aP', 3, 12, 0); gl.drawArrays(gl.LINES, 0, NR * 2); off(P.r);
        }
        gl.depthMask(true); gl.disable(gl.BLEND);
      },
      destroy() { tok++; if (G && G.gl) { const x = G.gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } },
    };
  },
});
