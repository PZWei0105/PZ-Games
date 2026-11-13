/* ===================== skin: 黑洞 EVENT HORIZON — a ray-traced black hole; light bends round it, the song's cover swirls in the disk =====================
   Every pixel's light ray is bent step by step on its way past the hole (Schwarzschild photon paths), so the far side of
   the accretion disk is lensed up over the top and under the bottom, and a thin photon ring hugs the shadow. The disk
   spins with the bass and carries the cover's colours; strong beats send gravitational-wave ripples across the screen;
   the chorus fires jets from the poles. Tilt the phone and the camera swings round the hole. */
R.skins.def({
  id: 'blackhole', name: '黑洞', group: '科技', en: 'EVENT HORIZON',
  desc: '光線被重力彎曲的 3D 黑洞，吸積盤跟著低音轉，副歌兩極噴出能量柱',
  bloom: { s: 0.82, th: 0.5, streak: 0.32, tint: '#ffc98a' }, hero: '.bh-art', trans: 'portal', hype: false,
  theme: { bg: '#020207', fg: '#f6efe4', accent: '#ff9d42', accent2: '#8fd8ff', ui: 'rgba(10,8,14,.97)', dock: 'rgba(12,8,16,.45)', dockfg: '#ffd9a8' },
  enterMs: 2200, swapMs: 1500,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><radialGradient id="bhe" cx=".5" cy=".46" r=".6"><stop offset="0" stop-color="#000"/><stop offset=".23" stop-color="#000"/><stop offset=".27" stop-color="#fff3d6"/><stop offset=".33" stop-color="#ff9d42" stop-opacity=".9"/><stop offset=".6" stop-color="#5a1c06" stop-opacity=".35"/><stop offset="1" stop-color="#020207" stop-opacity="0"/></radialGradient><linearGradient id="bhd" x1="0" x2="1"><stop offset="0" stop-color="#ff7a1a" stop-opacity="0"/><stop offset=".25" stop-color="#ffb35c"/><stop offset=".5" stop-color="#fff6e0"/><stop offset=".75" stop-color="#ff8a2a"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></linearGradient></defs><rect width="116" height="150" fill="#020207"/><g fill="#fff" opacity=".7"><circle cx="14" cy="22" r=".8"/><circle cx="96" cy="16" r="1"/><circle cx="104" cy="120" r=".8"/><circle cx="20" cy="128" r="1"/><circle cx="70" cy="132" r=".6"/></g><circle cx="58" cy="69" r="46" fill="url(#bhe)"/><ellipse cx="58" cy="69" rx="52" ry="7" fill="url(#bhd)"/><path d="M26 66 A32 22 0 0 1 90 66" fill="none" stroke="#ffcf8a" stroke-width="3" opacity=".8"/><circle cx="58" cy="69" r="12.5" fill="#000" stroke="#fff3d6" stroke-width="1.6"/><rect x="56.5" y="8" width="3" height="40" fill="#8fd8ff" opacity=".35"/><rect x="56.5" y="92" width="3" height="40" fill="#8fd8ff" opacity=".35"/></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 320, f2: 240, dur: 0.07, v: 0.07, type: 'sine' }); },
    tick(s, t) { s.tone(t, { f: 900, dur: 0.02, v: 0.03, type: 'sine' }); },
    toggle(s, t) { s.tone(t, { f: 180, f2: 360, dur: 0.12, v: 0.08, type: 'sine' }); },
    play(s, t) { s.tone(t, { f: 50, f2: 110, dur: 0.6, v: 0.13, type: 'sine', glide: 0.5 }); s.notes(t + 0.1, [s.hz(64), s.hz(71), s.hz(76)], { dur: 0.4, v: 0.04, type: 'sine', gap: 0.09 }); },
    pause(s, t) { s.tone(t, { f: 160, f2: 40, dur: 0.55, v: 0.12, type: 'sine', glide: 0.5 }); },
    next(s, t) { s.tone(t, { f: 60, f2: 240, dur: 0.35, v: 0.1, type: 'sawtooth', lp: 900 }); s.noise(t, { f: 300, f2: 3000, dur: 0.35, v: 0.04, q: 2 }); },
    prev(s, t) { s.tone(t, { f: 240, f2: 60, dur: 0.35, v: 0.1, type: 'sawtooth', lp: 900 }); s.noise(t, { f: 3000, f2: 300, dur: 0.35, v: 0.04, q: 2 }); },
    enter(s, t) { s.tone(t, { f: 30, f2: 70, dur: 1.6, v: 0.16, type: 'sine', glide: 1.4 }); s.noise(t, { f: 200, f2: 1600, dur: 1.4, v: 0.05, q: 1.2 }); s.notes(t + 0.9, [s.hz(57), s.hz(64), s.hz(69), s.hz(76)], { dur: 0.9, v: 0.035, type: 'sine', gap: 0.12 }); },
    open(s, t) { s.tone(t, { f: 260, f2: 420, dur: 0.18, v: 0.06, type: 'sine' }); },
    close(s, t) { s.tone(t, { f: 420, f2: 220, dur: 0.18, v: 0.06, type: 'sine' }); },
    ok(s, t) { s.notes(t, [s.hz(69), s.hz(76)], { dur: 0.3, v: 0.06, type: 'sine', gap: 0.1 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="bh-cv"></canvas><div class="bh-vig"></div>
      <div class="bh-hud" data-ui><b>EVENT HORIZON</b><span>SGR A* · 26 670 LY</span></div>
      <div class="bh-read" aria-hidden="true"><span>TIME DILATION <b data-bh="td">×1.00</b></span><span>SPIN <b>a = 0.998</b></span><span>DISK <b data-bh="tk">0 K</b></span></div>
      <div class="bh-panel">
        <div class="bh-row" data-ui>
          <div class="bh-art"><img data-bind="cover" alt="" draggable="false"></div>
          <div class="bh-tx"><div class="bh-t" data-bind="title"></div><div class="bh-a" data-bind="artist"></div></div>
        </div>
        <div class="seek bh-seek" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div><div class="seek-times"><span data-bind="time">0:00</span><span data-bind="dur">0:00</span></div></div>
        ${R.ui.ctrl('bh-ctrl')}
      </div>`;
    const cvEl = root.querySelector('.bh-cv');
    const td = root.querySelector('[data-bh="td"]'), tk = root.querySelector('[data-bh="tk"]');
    const G = R.glk.context(cvEl, { alpha: false, preserve: true });
    const FS = `precision highp float;
      varying vec2 uv;
      uniform vec2 res; uniform vec2 ctr; uniform float fov;
      uniform float time, spin, bass, level, hot, flare, ripT, ripA;
      uniform vec3 cam; uniform sampler2D cover; uniform vec3 c2;
      #define TAU 6.2831853
      float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
        return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a*n2(p); p = p*2.03 + vec2(1.7, 9.2); a *= .5; } return s; }
      vec3 sky(vec3 d){
        float u = atan(d.z, d.x)/TAU + .5, v = asin(clamp(d.y, -1., 1.))/3.14159 + .5;
        vec3 col = vec3(0.);
        for (int k = 0; k < 2; k++) {
          float sc = k == 0 ? 90. : 230.;
          vec2 g = vec2(u*sc*2., v*sc), id = floor(g), f = fract(g) - .5;
          float h = h21(id + float(k)*17.);
          vec2 o = vec2(h21(id + 3.1), h21(id + 7.7)) - .5;
          float st = smoothstep(.09, 0., length(f - o*.7))*step(.9, h);
          col += st*mix(vec3(.65, .78, 1.), vec3(1., .82, .6), h21(id + 1.3))*(k == 0 ? 1.6 : .9);
        }
        float neb = fbm(vec2(u*7., v*4.5));
        col += c2*pow(neb, 3.)*.32 + vec3(.22, .1, .3)*pow(fbm(vec2(u*3. + 5., v*2.2)), 4.)*.5;
        return col;
      }
      void main(){
        vec2 p = (uv*2. - 1.)*vec2(res.x/res.y, 1.) - ctr;
        // a gravitational wave after a strong beat: a ring that bends the picture as it spreads
        float rr = length(p), rp = ripT*1.25;
        float wv = sin((rr - rp)*34.)*exp(-pow((rr - rp)*5.5, 2.))*ripA;
        if (rr > 1e-4) p += (p/rr)*wv*.03;
        float az = cam.x, inc = cam.y, dist = cam.z;
        vec3 ro = dist*vec3(cos(inc)*sin(az), sin(inc), cos(inc)*cos(az));
        vec3 fw = normalize(-ro), rt = normalize(cross(fw, vec3(0., 1., 0.))), up = cross(rt, fw);
        vec3 pos = ro, vel = normalize(fw + (p.x*rt + p.y*up)*fov);
        vec3 hv = cross(pos, vel); float h2 = dot(hv, hv);
        vec3 col = vec3(0.), jet = vec3(0.); float acc = 0., minr = 1e9; bool hole = false;
        float rin = 2.35, rout = 9.5;
        for (int i = 0; i < 96; i++) {
          float r2 = dot(pos, pos), r = sqrt(r2);
          minr = min(minr, r);
          if (r < 1.) { hole = true; break; }
          if (r > dist*1.5 && dot(pos, vel) > 0.) break;
          float dt = clamp(.085*r, .035, 1.8);
          vec3 pp = pos;
          vel += (-1.5*h2*pos/(r2*r2*r))*dt;
          pos += vel*dt;
          if (hot > .01) {
            float ay = abs(pos.y);
            if (ay > 1.1) { float d = length(pos.xz), w = .22 + ay*.07;
              jet += vec3(.45, .74, 1.)*exp(-d*d/(w*w))*dt*hot*(.6 + .4*sin(ay*1.4 - time*16.))*smoothstep(1.1, 3., ay)*exp(-ay*.06)*.55; }
          }
          if (pp.y*pos.y < 0. && acc < .985) {
            vec3 hp = mix(pp, pos, pp.y/(pp.y - pos.y));
            float hr = length(hp.xz);
            if (hr > rin && hr < rout) {
              float a2 = atan(hp.z, hp.x) + spin*4.6/pow(hr, 1.5);
              float n = fbm(vec2(hr*1.7 - time*.08, a2*4.));
              float sk = fbm(vec2(hr*8., a2*1.3));
              float temp = pow(rin/hr, .85);
              vec3 bb = mix(vec3(.85, .22, .04), vec3(1., .6, .24), smoothstep(.2, .62, temp));
              bb = mix(bb, vec3(1., .95, .86), smoothstep(.62, .96, temp));
              vec3 cc = texture2D(cover, vec2(fract(a2/TAU), clamp((hr - rin)/(rout - rin), 0., 1.))).rgb;
              bb = mix(bb, bb*.45 + cc*1.05, .3);
              vec3 tng = normalize(vec3(-hp.z, 0., hp.x));
              float vk = .62*sqrt(.5/(hr - 1.));
              float dop = clamp(1./(1. - vk*dot(tng, -normalize(vel))), .35, 2.2);
              float dens = smoothstep(rin, rin + .55, hr)*smoothstep(rout, rout - 3.2, hr)*(.3 + .95*n)*(.72 + .55*sk);
              float I = (1.05 + bass*1.5 + flare*2.6)*temp*dop*dop;
              float al = clamp(dens*1.35, 0., 1.);
              col += (1. - acc)*bb*I*al;
              acc += (1. - acc)*al;
            }
          }
        }
        if (!hole) col += (1. - acc)*sky(normalize(vel));
        if (!hole) col += vec3(1., .78, .5)*exp(-(minr - 1.47)*7.)*(.3 + level*.5 + flare*1.2);
        col += jet;
        col = 1. - exp(-col*1.15);
        gl_FragColor = vec4(col, 1.);
      }`;
    let P = null, draw = null, tex = null, ok = false;
    if (G) {
      try { P = R.glk.program(G.gl, R.glk.FULL_VS, FS); draw = R.glk.fullscreen(G.gl); tex = R.glk.texture(G.gl, { repeat: true, fill: [120, 60, 30, 255] }); ok = true; }
      catch (e) { console.warn('blackhole shader', e); ok = false; }
      G.onrestored = () => { try { P = R.glk.program(G.gl, R.glk.FULL_VS, FS); draw = R.glk.fullscreen(G.gl); tex = R.glk.texture(G.gl, { repeat: true }); ok = true; loadCover(); } catch (e) { ok = false; } };
    }
    if (!ok) root.classList.add('bh-flat'); // no WebGL: a painted still of the hole (CSS)
    let W = 1, H = 1, scale = 0.5, c2 = [0.5, 0.3, 0.6];
    function resize() {
      const r = cvEl.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
      scale = Math.min(window.devicePixelRatio || 1, 2) * 0.5 * Math.max(0.6, R.quality());
      cvEl.width = Math.max(2, Math.round(W * scale)); cvEl.height = Math.max(2, Math.round(H * scale));
    }
    resize();
    let tok = 0;
    async function loadCover() {
      if (!ok) return;
      const my = ++tok, t = api.track();
      const c = await R.glk.coverCanvas(t, 256);
      if (my !== tok || !ok) return;
      R.glk.upload(G.gl, tex, c, false);
      const col = api.colors(t);
      c2 = R.glk.hex3(col.vibrant).map((v) => v * 0.9);
    }
    let t0 = 0, spin = 0, flare = 0.8, ripT = 9, ripA = 0, zoom = 0, az = 0.35, enterT = 0, lastRead = 0;
    api.beat((s) => { if (s > 0.62) { ripT = 0; ripA = Math.min(1, s * 0.8); } });
    return {
      enter() { enterT = 0; zoom = 0; flare = 1.2; },
      swap() { flare = 1.6; ripT = 0; ripA = 1; },
      onTrack: loadCover,
      resize,
      frame(dt, t, v) {
        t0 += dt; enterT += dt;
        spin += dt * (0.35 + v.bass * 1.4 + v.hot * 0.9 + flare * 1.5) * (v.playing ? 1 : 0.25);
        flare *= Math.exp(-dt * 1.6);
        ripT += dt; ripA *= Math.exp(-dt * 1.4);
        zoom = Math.min(1, enterT / 1.9);
        const ez = 1 - Math.pow(1 - zoom, 3);
        az += dt * (0.045 + v.hot * 0.08);
        const tl = R.tilt;
        const aspect = W / H;
        const dist = 24 + (1 - ez) * 60;
        const fov = Math.max(9 / (24 * 1.22 * aspect), 0.46);
        const port = aspect < 1;
        // readouts
        if (t0 - lastRead > 0.25) {
          lastRead = t0;
          const rObs = 1.25 + (1 - v.level) * 5.5;
          td.textContent = '×' + (1 / Math.sqrt(1 - 1 / rObs)).toFixed(2);
          tk.textContent = Math.round(9000 + v.level * 21000 + v.hot * 14000).toLocaleString('en-US') + ' K';
        }
        root.style.setProperty('--lv', v.level.toFixed(3));
        if (!ok || G.lost) return;
        const gl = G.gl;
        gl.viewport(0, 0, cvEl.width, cvEl.height);
        P.use();
        gl.uniform2f(P.u.res, cvEl.width, cvEl.height);
        gl.uniform2f(P.u.ctr, 0, port ? 0.2 : 0.14);
        gl.uniform1f(P.u.fov, fov);
        gl.uniform1f(P.u.time, t0 % 1000); gl.uniform1f(P.u.spin, spin % 10000);
        gl.uniform1f(P.u.bass, v.bass); gl.uniform1f(P.u.level, v.level); gl.uniform1f(P.u.hot, R.reduced ? 0 : v.hot);
        gl.uniform1f(P.u.flare, flare); gl.uniform1f(P.u.ripT, ripT); gl.uniform1f(P.u.ripA, R.reduced ? 0 : ripA);
        gl.uniform3f(P.u.cam, az + tl.x * 0.42, 0.13 - tl.y * 0.1 + (1 - ez) * 0.25, dist);
        gl.uniform3f(P.u.c2, c2[0], c2[1], c2[2]);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(P.u.cover, 0);
        draw(P);
      },
      destroy() { tok++; if (G && G.gl) { const x = G.gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } },
    };
  },
});
