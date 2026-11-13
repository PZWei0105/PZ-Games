/* ===================== skin: 粒子封面 PARTICLE ART — the cover, taken apart into tens of thousands of points of light =====================
   Every pixel of the cover becomes a particle (WebGL points; all the motion is worked out on the GPU). The sheet breathes
   on every beat, the kick drum blasts it outwards and it springs back, the snare twists it, the hats make random points
   sparkle. Every eight bars, on the bar's first beat, it flows into a new form: sphere, galaxy, torus, double helix, and
   back to the cover. The chorus spins everything into a vortex. A new song explodes the old cover and the new one forms
   out of the cloud. */
R.skins.def({
  id: 'particles', name: '粒子封面', group: '科技', en: 'PARTICLE ART',
  desc: '封面拆成幾萬顆發光粒子：大鼓一下就炸開再聚回來，每八小節變一種形狀，副歌捲成漩渦',
  bloom: { s: 0.66, th: 0.42, tint: '#cdbaff' }, hero: '.pa-art', trans: 'portal', hype: 'lite',
  theme: { bg: '#030308', fg: '#f3f0ff', accent: '#b98cff', accent2: '#4fe3ff', ui: 'rgba(10,8,20,.97)', dock: 'rgba(14,10,28,.45)', dockfg: '#dccbff' },
  enterMs: 1900, swapMs: 1400,
  emblem: `<svg class="em" viewBox="0 0 116 150"><rect width="116" height="150" fill="#04030b"/><g>${(() => { let s = '', seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; const cols = ['#ff5fb0', '#b98cff', '#4fe3ff', '#ffd36b', '#7dffc8']; for (let i = 0; i < 230; i++) { const a = r() * 6.283, d = Math.pow(r(), 0.6) * 44, x = 58 + Math.cos(a) * d * (1 + d / 90), y = 66 + Math.sin(a) * d * 0.95; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.7 + r() * 1.3).toFixed(1)}" fill="${cols[Math.floor(r() * 5)]}" opacity="${(0.45 + r() * 0.55).toFixed(2)}"/>`; } return s; })()}</g><text x="58" y="136" text-anchor="middle" font-family="Orbitron, sans-serif" font-weight="700" font-size="8.5" fill="#dccbff" letter-spacing="2">48,400 PTS</text></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 1400, f2: 2100, dur: 0.05, v: 0.04, type: 'sine' }); s.noise(t, { f: 6000, dur: 0.03, v: 0.015, type: 'highpass' }); },
    tick(s, t) { s.tone(t, { f: 2800, dur: 0.015, v: 0.025, type: 'sine' }); },
    toggle(s, t) { s.notes(t, [s.hz(86), s.hz(93)], { dur: 0.06, v: 0.04, type: 'sine', gap: 0.04 }); },
    play(s, t) { s.notes(t, [s.hz(74), s.hz(81), s.hz(86), s.hz(93), s.hz(98)], { dur: 0.16, v: 0.04, type: 'sine', gap: 0.035 }); s.noise(t, { f: 3000, f2: 9000, dur: 0.3, v: 0.02, q: 2 }); },
    pause(s, t) { s.notes(t, [s.hz(93), s.hz(86), s.hz(81), s.hz(74)], { dur: 0.12, v: 0.035, type: 'sine', gap: 0.03 }); },
    next(s, t) { s.noise(t, { f: 9000, f2: 600, dur: 0.3, v: 0.05, q: 1.5 }); s.tone(t + 0.12, { f: 300, f2: 1600, dur: 0.25, v: 0.04, type: 'sine' }); },
    prev(s, t) { s.noise(t, { f: 600, f2: 9000, dur: 0.3, v: 0.05, q: 1.5 }); s.tone(t + 0.12, { f: 1600, f2: 300, dur: 0.25, v: 0.04, type: 'sine' }); },
    enter(s, t) { s.noise(t, { f: 12000, f2: 400, dur: 1.2, v: 0.05, q: 0.8 }); s.notes(t + 0.6, [s.hz(62), s.hz(69), s.hz(74), s.hz(78), s.hz(81), s.hz(86)], { dur: 0.6, v: 0.03, type: 'sine', gap: 0.07 }); },
    open(s, t) { s.tone(t, { f: 900, f2: 1500, dur: 0.1, v: 0.035, type: 'sine' }); },
    close(s, t) { s.tone(t, { f: 1500, f2: 900, dur: 0.1, v: 0.035, type: 'sine' }); },
    ok(s, t) { s.notes(t, [s.hz(86), s.hz(93), s.hz(98)], { dur: 0.12, v: 0.04, type: 'sine', gap: 0.05 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="pa-cv"></canvas><div class="pa-vig"></div><div class="pa-flatart"><img data-bind="cover" alt="" draggable="false"></div>
      <div class="pa-hud" data-ui><b>PARTICLE<i>//</i>ART</b><span><em data-pa="n">0</em> PARTICLES · <em data-pa="form">COVER</em></span></div>
      <div class="pa-panel">
        <div class="pa-row" data-ui>
          <div class="pa-art"><img data-bind="cover" alt="" draggable="false"></div>
          <div class="pa-tx"><div class="pa-t" data-bind="title"></div><div class="pa-a" data-bind="artist"></div></div>
        </div>
        <div class="seek pa-seek" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div><div class="seek-times"><span data-bind="time">0:00</span><span data-bind="dur">0:00</span></div></div>
        ${R.ui.ctrl('pa-ctrl')}
      </div>`;
    const cvEl = root.querySelector('.pa-cv');
    const nEl = root.querySelector('[data-pa="n"]'), formEl = root.querySelector('[data-pa="form"]');
    const G = R.glk.context(cvEl, { alpha: false, depth: false, preserve: true });
    const GN = R.quality() < 0.7 ? 150 : 220, N = GN * GN;
    nEl.textContent = N.toLocaleString('en-US');
    const VS = `precision highp float;
      attribute vec3 aG; attribute vec3 aC; attribute vec3 aO;
      uniform mat4 uVP; uniform float uDist, uPx, uTime, uFA, uFB, uMorph, uKick, uPump, uSnare, uHat, uHot, uSwap, uCol, uDown, uEnter;
      uniform float uB[16];
      varying vec3 vC; varying float vA;
      #define TAU 6.2831853
      vec3 shape(float k, vec2 q, float r){
        if (k < .5) { vec2 p = q*2. - 1.; return vec3(p.x*1.55, -p.y*1.55, 0.); }
        if (k < 1.5) { float lo = q.x*TAU, la = (q.y - .5)*3.14159; return vec3(cos(la)*sin(lo), -sin(la), cos(la)*cos(lo))*1.32; }
        if (k < 2.5) { float a = q.x*TAU, b = q.y*TAU; return vec3((1.12 + .4*cos(b))*cos(a), .4*sin(b), (1.12 + .4*cos(b))*sin(a)); }
        if (k < 3.5) { float t = q.y*6. - 3., a = t*2.3 + step(.5, q.x)*3.14159, rr = .7 + (fract(q.x*2.) - .5)*.3; return vec3(cos(a)*rr, t*.5, sin(a)*rr); }
        float rad = pow(q.y, .72)*1.85 + .08, ang = step(.5, q.x)*3.14159 + rad*2.5 + (fract(q.x*2.) - .5)*1.3;
        return vec3(cos(ang)*rad, (r - .5)*.14*(2. - rad), sin(ang)*rad);
      }
      void main(){
        vec2 q = aG.xy; float r = aG.z;
        vec3 a = shape(uFA, q, r), b = shape(uFB, q, r);
        float m = smoothstep(0., 1., clamp(uMorph*1.35 - r*.35, 0., 1.));
        vec3 p = mix(a, b, m);
        // the flat cover ripples with the spectrum, row by row
        float sheet = (uFA < .5 ? 1. - m : 0.) + (uFB < .5 ? m : 0.);
        int row = int(clamp(q.y*15.99, 0., 15.));
        float band = 0.; for (int i = 0; i < 16; i++) if (i == row) band = uB[i];
        p.z += sheet*band*.28*(.6 + .4*sin(q.x*9. + uTime*2.));
        float len = length(p) + 1e-4; vec3 dir = p/len;
        p *= 1. + uPump*.075 + uDown*.04;
        p += dir*uKick*(.15 + r*.85)*.62;
        float tw = uSnare*1.1*(q.y - .5);
        p.xz = mat2(cos(tw), -sin(tw), sin(tw), cos(tw))*p.xz;
        if (uHot > .01) {
          float ang = uTime*(.55 + r*.9) + len*2.6 + q.x*6.;
          vec3 v = vec3(cos(ang)*(.35 + len*.9), (r - .5)*2.8 + sin(uTime*.8 + r*TAU)*.25, sin(ang)*(.35 + len*.9));
          p = mix(p, v, uHot*.82);
        }
        p += dir*(uSwap*(1.2 + r*2.6) + (1. - uEnter)*(2.5 + r*6.));
        gl_Position = uVP*vec4(p, 1.);
        float spark = step(.86, r)*uHat;
        gl_PointSize = max(1., uPx*uDist/gl_Position.w*(1. + spark*1.6 + uKick*.25));
        vC = mix(aO, aC, uCol)*(.62 + uPump*.32 + spark*1.1);
        vA = uEnter;
      }`;
    const FS = `precision mediump float; varying vec3 vC; varying float vA;
      void main(){ vec2 d = gl_PointCoord - .5; float e = dot(d, d); if (e > .25) discard; float a = smoothstep(.25, .02, e)*vA; gl_FragColor = vec4(vC*a, a); }`;
    let ok = false, gl = null, P = null, bG = null, bC = null;
    const geo = new Float32Array(N * 3), col = new Uint8Array(N * 6);
    {
      const rnd = R.rng(4848);
      for (let i = 0; i < N; i++) { const x = i % GN, y = (i / GN) | 0; geo[i * 3] = (x + 0.5) / GN; geo[i * 3 + 1] = (y + 0.5) / GN; geo[i * 3 + 2] = rnd(); }
      col.fill(90);
    }
    function setup() {
      gl = G.gl;
      P = R.glk.program(gl, VS, FS);
      bG = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bG); gl.bufferData(gl.ARRAY_BUFFER, geo, gl.STATIC_DRAW);
      bC = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bC); gl.bufferData(gl.ARRAY_BUFFER, col, gl.DYNAMIC_DRAW);
      ok = true;
    }
    if (G) { try { setup(); } catch (e) { console.warn('particles', e); ok = false; } G.onrestored = () => { try { setup(); loadCover(true); } catch (e) { ok = false; } }; }
    if (!ok) root.classList.add('pa-flat'); // no WebGL: the cover itself, glowing on the beat (CSS)
    let W = 1, H = 1, scale = 1;
    function resize() {
      const r = cvEl.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
      scale = Math.min(window.devicePixelRatio || 1, 2) * 0.75 * Math.max(0.65, R.quality());
      cvEl.width = Math.max(2, Math.round(W * scale)); cvEl.height = Math.max(2, Math.round(H * scale));
    }
    resize();
    // the cover's pixels become the particles' colours (the old ones stay for the cross-fade)
    let tok = 0, colT = 1;
    async function loadCover(keep) {
      const my = ++tok, t = api.track();
      const c = await R.glk.coverCanvas(t, GN);
      if (my !== tok) return;
      let d = null; try { d = c.getContext('2d').getImageData(0, 0, GN, GN).data; } catch (e) { d = null; }
      for (let i = 0; i < N; i++) {
        if (!keep) { col[i * 6 + 3] = col[i * 6]; col[i * 6 + 4] = col[i * 6 + 1]; col[i * 6 + 5] = col[i * 6 + 2]; }
        if (d) { col[i * 6] = d[i * 4]; col[i * 6 + 1] = d[i * 4 + 1]; col[i * 6 + 2] = d[i * 4 + 2]; }
      }
      colT = keep ? 1 : 0;
      if (ok && !G.lost) { gl.bindBuffer(gl.ARRAY_BUFFER, bC); gl.bufferSubData(gl.ARRAY_BUFFER, 0, col); }
    }
    loadCover(true);
    // forms: every eight bars on the bar's first beat; a new song goes back to the cover
    const FK = [0, 1, 4, 2, 3], FN = ['COVER', 'SPHERE', 'GALAXY', 'TORUS', 'HELIX'];
    let fi = 0, fa = 0, fb = 0, morph = 1, barN = 0;
    function goForm(k) { fa = morph < 1 ? (morph < 0.5 ? fa : fb) : fb; fi = k; fb = FK[k]; morph = 0; formEl.textContent = FN[k]; }
    api.beat((s, i) => { if (!i.down) return; barN++; if (barN % 8 === 0) goForm((fi + 1) % FK.length); });
    // tiny matrix kit (column-major)
    const persp = (fy, a, n, f) => { const t = 1 / Math.tan(fy / 2), nf = 1 / (n - f); return new Float32Array([t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]); };
    const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    function look(e, c) { const z = norm([e[0] - c[0], e[1] - c[1], e[2] - c[2]]), x = norm(cross([0, 1, 0], z)), y = cross(z, x); return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]); }
    function mul(a, b) { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
    const Bu = new Float32Array(16);
    let t0 = 0, enterT = 0, swapE = 0, orbA = 0, elv = -0.05;
    return {
      enter() { enterT = 0; },
      swap() { swapE = 1; barN = 0; goForm(0); },
      onTrack() { loadCover(false); },
      resize,
      frame(dt, t, v) {
        t0 += dt; enterT += dt;
        swapE *= Math.exp(-dt * 2.6); colT = Math.min(1, colT + dt * 1.3);
        if (morph < 1) morph = Math.min(1, morph + dt / 1.7);
        root.style.setProperty('--lv', v.level.toFixed(3));
        if (!ok || G.lost) return;
        const aspect = W / H, port = aspect < 1;
        // the camera faces the cover; around the other forms it orbits (and comes back round to the front);
        // the phone's tilt swings it; the bar's first beat pushes it in
        const tl = R.tilt, cover = fb === 0 && morph > 0.5;
        if (!cover) orbA += dt * (0.3 + v.hot * 0.45) * (v.playing ? 1 : 0.3);
        else { const tg = Math.round(orbA / R.TAU) * R.TAU; orbA += (tg - orbA) * Math.min(1, dt * 1.1); }
        elv += ((cover ? -0.04 : 0.26) - elv) * Math.min(1, dt * 1.2);
        const yaw = orbA + Math.sin(t0 * 0.21) * 0.2 + tl.x * 0.55;
        // far enough that the cover fills ~80 % of the width (or ~58 % of the height), and lifted above the song panel
        const fov = port ? 0.95 : 0.78, tf = Math.tan(fov / 2);
        const short = !port && H < 520; // a phone on its side: the song panel takes the lower half
        const fit = Math.max(3.1 / (0.8 * 2 * tf * aspect), 3.1 / ((short ? 0.47 : 0.58) * 2 * tf));
        const dist = fit - (R.reduced ? 0 : v.down * 0.3 + v.kickE * 0.14);
        const lift = (port ? 0.26 : short ? 0.36 : 0.17) * tf * fit;
        const el = elv - tl.y * 0.35;
        const eye = [Math.sin(yaw) * Math.cos(el) * dist, Math.sin(el) * dist - lift, Math.cos(yaw) * Math.cos(el) * dist];
        const VP = mul(persp(fov, aspect, 0.1, 80), look(eye, [0, -lift, 0]));
        for (let i = 0; i < 16; i++) Bu[i] = v.bands[Math.min(31, i * 2 + 1)];
        gl.viewport(0, 0, cvEl.width, cvEl.height);
        gl.clearColor(0.012, 0.012, 0.03, 1); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
        P.use();
        const u = P.u;
        gl.uniformMatrix4fv(u.uVP, false, VP);
        gl.uniform1f(u.uDist, dist);
        // a particle's size on screen at the camera's distance: about the gap between neighbours, so the cover reads whole
        gl.uniform1f(u.uPx, ((3.1 / GN) / (2 * Math.tan(fov / 2) * dist)) * cvEl.height * 1.3);
        gl.uniform1f(u.uTime, t0 % 1000); gl.uniform1f(u.uFA, fa); gl.uniform1f(u.uFB, fb); gl.uniform1f(u.uMorph, morph);
        const rd = R.reduced ? 0 : 1;
        gl.uniform1f(u.uKick, v.kickE * rd); gl.uniform1f(u.uPump, v.pump); gl.uniform1f(u.uSnare, v.snareE * rd); gl.uniform1f(u.uHat, v.hatE);
        gl.uniform1f(u.uHot, v.hot * rd); gl.uniform1f(u.uSwap, swapE * rd); gl.uniform1f(u.uCol, colT); gl.uniform1f(u.uDown, v.down * rd);
        gl.uniform1f(u.uEnter, R.ease.out(Math.min(1, enterT / 1.6)));
        gl.uniform1fv(u.uB, Bu);
        gl.bindBuffer(gl.ARRAY_BUFFER, bG); gl.enableVertexAttribArray(P.a.aG); gl.vertexAttribPointer(P.a.aG, 3, gl.FLOAT, false, 12, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, bC);
        gl.enableVertexAttribArray(P.a.aC); gl.vertexAttribPointer(P.a.aC, 3, gl.UNSIGNED_BYTE, true, 6, 0);
        gl.enableVertexAttribArray(P.a.aO); gl.vertexAttribPointer(P.a.aO, 3, gl.UNSIGNED_BYTE, true, 6, 3);
        gl.drawArrays(gl.POINTS, 0, N);
        gl.disableVertexAttribArray(P.a.aG); gl.disableVertexAttribArray(P.a.aC); gl.disableVertexAttribArray(P.a.aO);
        gl.disable(gl.BLEND);
      },
      destroy() { tok++; if (G && G.gl) { const x = G.gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } },
    };
  },
});
