/* ===================== skin: 液態金屬 LIQUID CHROME — a ray-marched blob of mirror metal that reflects the cover =====================
   A core and four satellite drops melt into each other (smooth signed-distance union); the surface ripples with the
   bass, strong beats throw droplets that fall back and merge, and in the chorus the core stands up in ferrofluid
   spikes. The chrome reflects a studio (soft boxes, coloured rim lights) and, behind you, the song's cover. Tilting
   the phone swings the camera round, so the reflections slide across the metal. */
R.skins.def({
  id: 'liquid', name: '液態金屬', group: '科技', en: 'LIQUID CHROME',
  desc: '一團會變形的鉻金屬倒映著封面，重拍濺起水珠，副歌長出磁流體尖刺',
  bloom: { s: 0.48, th: 0.76, streak: 0.42, tint: '#dfe8ff' }, hero: '.lq-art', trans: 'shatter', hype: false,
  theme: { bg: '#07080b', fg: '#eef2f8', accent: '#b9c6dc', accent2: '#ff4fd8', ui: 'rgba(12,13,17,.97)', dock: 'rgba(20,22,28,.5)', dockfg: '#e8eef8' },
  enterMs: 2000, swapMs: 1300,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><radialGradient id="lqb" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".18" stop-color="#dfe6f1"/><stop offset=".42" stop-color="#5d6676"/><stop offset=".6" stop-color="#1b1e25"/><stop offset=".8" stop-color="#9aa6ba"/><stop offset="1" stop-color="#2a2e37"/></radialGradient><linearGradient id="lqf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0f14"/><stop offset="1" stop-color="#050608"/></linearGradient></defs><rect width="116" height="150" fill="url(#lqf)"/><ellipse cx="58" cy="122" rx="34" ry="6" fill="#ff4fd8" opacity=".25"/><path d="M58 30c18 0 30 13 30 30 0 9-3 13-1 20 3 9-6 18-17 16-6-1-8 4-14 4-12 0-26-10-27-26-1-10 4-15 3-22C30 40 41 30 58 30z" fill="url(#lqb)"/><circle cx="92" cy="40" r="8" fill="url(#lqb)"/><circle cx="24" cy="96" r="6" fill="url(#lqb)"/><circle cx="96" cy="100" r="4" fill="url(#lqb)"/><path d="M46 44c6-5 14-6 20-3" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".9"/></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 1400, f2: 900, dur: 0.06, v: 0.06, type: 'sine' }); s.tone(t, { f: 2800, dur: 0.03, v: 0.02, type: 'sine' }); },
    tick(s, t) { s.tone(t, { f: 2600, dur: 0.02, v: 0.03, type: 'sine' }); },
    toggle(s, t) { s.tone(t, { f: 600, f2: 1300, dur: 0.1, v: 0.07, type: 'sine' }); },
    play(s, t) { s.tone(t, { f: 220, f2: 880, dur: 0.22, v: 0.08, type: 'sine' }); s.tone(t + 0.12, { f: 1760, f2: 1320, dur: 0.25, v: 0.04, type: 'sine' }); },
    pause(s, t) { s.tone(t, { f: 880, f2: 200, dur: 0.25, v: 0.08, type: 'sine' }); },
    next(s, t) { s.tone(t, { f: 300, f2: 1600, dur: 0.16, v: 0.07, type: 'sine' }); s.noise(t, { f: 4000, dur: 0.1, v: 0.03, q: 6 }); },
    prev(s, t) { s.tone(t, { f: 1600, f2: 300, dur: 0.16, v: 0.07, type: 'sine' }); s.noise(t, { f: 4000, dur: 0.1, v: 0.03, q: 6 }); },
    enter(s, t) { for (let i = 0; i < 4; i++) s.tone(t + i * 0.16, { f: 700 - i * 90, f2: 180, dur: 0.22, v: 0.06, type: 'sine' }); s.tone(t + 0.7, { f: 60, f2: 140, dur: 0.6, v: 0.1, type: 'sine' }); s.noise(t + 0.7, { f: 6000, dur: 0.5, v: 0.02, q: 8 }); },
    open(s, t) { s.tone(t, { f: 900, f2: 1500, dur: 0.12, v: 0.05, type: 'sine' }); },
    close(s, t) { s.tone(t, { f: 1500, f2: 900, dur: 0.12, v: 0.05, type: 'sine' }); },
    ok(s, t) { s.notes(t, [s.hz(84), s.hz(91)], { dur: 0.2, v: 0.05, type: 'sine', gap: 0.08 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="lq-cv"></canvas><div class="lq-vig"></div>
      <div class="lq-top" data-ui><b>LIQUID</b><span>CHROME · T-1000 SERIES</span></div>
      <div class="lq-panel">
        <div class="lq-head" data-ui>
          <div class="lq-art"><img data-bind="cover" alt="" draggable="false"></div>
          <div class="lq-tx"><div class="lq-t" data-bind="title"></div><div class="lq-a" data-bind="artist"></div></div>
        </div>
        <div class="seek lq-seek" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div><div class="seek-times"><span data-bind="time">0:00</span><span data-bind="dur">0:00</span></div></div>
        ${R.ui.ctrl('lq-ctrl')}
      </div>`;
    const cvEl = root.querySelector('.lq-cv');
    const G = R.glk.context(cvEl, { alpha: false, preserve: true });
    const FS = `precision highp float;
      varying vec2 uv;
      uniform vec2 res; uniform vec2 ctr; uniform float fov;
      uniform float time, bass, hot, flash;
      uniform vec4 B[5]; uniform vec4 D[4];
      uniform vec3 cam; uniform sampler2D cover; uniform vec3 a1, a2;
      float smin(float a, float b, float k){ float h = clamp(.5 + .5*(b - a)/k, 0., 1.); return mix(b, a, h) - k*h*(1. - h); }
      float sdf(vec3 p){
        vec3 q = p - B[0].xyz; float l = length(q); vec3 n = q/max(l, 1e-4);
        float rip = sin(n.x*6. + time*1.7)*sin(n.y*7. - time*1.3)*sin(n.z*5. + time)*(.025 + bass*.075);
        float s = sin(n.x*10.5)*sin(n.y*10.5 + 1.)*sin(n.z*10.5 + 2.);
        float spk = s > 0. ? s*s*hot*(.2 + bass*.38) : 0.;
        float d = l - B[0].w - rip - spk;
        for (int i = 1; i < 5; i++) d = smin(d, length(p - B[i].xyz) - B[i].w, .55);
        for (int i = 0; i < 4; i++) if (D[i].w > 0.) d = smin(d, length(p - D[i].xyz) - D[i].w, .32);
        return d;
      }
      vec3 nrm(vec3 p){ vec2 e = vec2(.0015, -.0015);
        return normalize(e.xyy*sdf(p + e.xyy) + e.yyx*sdf(p + e.yyx) + e.yxy*sdf(p + e.yxy) + e.xxx*sdf(p + e.xxx)); }
      vec3 env(vec3 d){
        // a photo studio: a bright ceiling falling off to a white horizon band, a dark floor, big soft boxes, coloured rim strips
        vec3 c = mix(vec3(.05, .055, .07), vec3(.36, .38, .44), smoothstep(-.05, .9, d.y));
        c += vec3(.95, .97, 1.)*smoothstep(.09, .0, abs(d.y - .03))*1.25;
        c += vec3(1.)*smoothstep(.16, .0, abs(d.y - .66))*smoothstep(1., .5, abs(d.x))*2.4;
        c += vec3(1.)*smoothstep(.08, .0, abs(d.y - .34))*smoothstep(.75, .25, abs(d.x + .15))*1.3;
        c += a1*smoothstep(.09, 0., abs(d.x + .8))*smoothstep(-.6, .35, d.y)*1.6;
        c += a2*smoothstep(.09, 0., abs(d.x - .8))*smoothstep(-.6, .35, d.y)*2.;
        // the cover, big, behind the camera
        if (d.z > 0.) {
          vec2 q = vec2(d.x, -d.y)/(1. + d.z)*.9 + .5;
          float m = smoothstep(0., .05, q.x)*smoothstep(1., .95, q.x)*smoothstep(0., .05, q.y)*smoothstep(1., .95, q.y);
          c = mix(c, texture2D(cover, q).rgb*1.35 + .04, m*smoothstep(0., .3, d.z));
        }
        // the floor: dark, with the coloured glow the blob throws
        if (d.y < -.02) c = mix(c, vec3(.015, .016, .02) + (a2*.3 + a1*.12)*exp(-abs(d.x)*3.)*smoothstep(-.02, -.4, d.y), .9);
        return c + flash*vec3(.9, .95, 1.);
      }
      void main(){
        vec2 p = (uv*2. - 1.)*vec2(res.x/res.y, 1.) - ctr;
        float yaw = cam.x, pit = cam.y, dist = cam.z;
        vec3 ro = dist*vec3(sin(yaw)*cos(pit), sin(pit), cos(yaw)*cos(pit));
        vec3 fw = normalize(-ro), rt = normalize(cross(fw, vec3(0., 1., 0.))), up = cross(rt, fw);
        vec3 rd = normalize(fw + (p.x*rt + p.y*up)*fov);
        float t = 0., d = 0.; bool hit = false;
        for (int i = 0; i < 60; i++) {
          d = sdf(ro + rd*t);
          if (d < .0015) { hit = true; break; }
          t += d*.78;
          if (t > dist + 4.) break;
        }
        vec3 col;
        if (hit) {
          vec3 ps = ro + rd*t, n = nrm(ps);
          vec3 r = reflect(rd, n);
          float fr = pow(1. - max(dot(n, -rd), 0.), 3.5);
          col = env(r)*(.7 + .5*fr);
          col += a2*pow(max(dot(n, normalize(vec3(.8, .2, .4))), 0.), 24.)*.4;
          col *= vec3(.94, .97, 1.04);
        } else {
          // backdrop: the floor (with a soft glow under the blob) and a dark room
          if (rd.y < 0.) {
            float k = (-1.75 - ro.y)/rd.y; vec3 fp = ro + rd*k; float g = length(fp.xz - B[0].xz);
            col = vec3(.01, .011, .016) + (a2*.5 + a1*.25)*exp(-g*g*.45)*(.35 + bass*.5) - vec3(.02)*exp(-g*g*2.);
            col = max(col, 0.);
            col = mix(col, vec3(.012, .013, .018), smoothstep(6., 16., k));
          } else col = mix(vec3(.012, .013, .02), vec3(.03, .032, .045), rd.y);
        }
        col = 1. - exp(-col*1.25);
        col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)))*43758.5453) - .5)/255.;
        gl_FragColor = vec4(col, 1.);
      }`;
    let P = null, draw = null, tex = null, ok = false;
    if (G) {
      try { P = R.glk.program(G.gl, R.glk.FULL_VS, FS); draw = R.glk.fullscreen(G.gl); tex = R.glk.texture(G.gl, { fill: [90, 90, 110, 255] }); ok = true; }
      catch (e) { console.warn('liquid shader', e); ok = false; }
      G.onrestored = () => { try { P = R.glk.program(G.gl, R.glk.FULL_VS, FS); draw = R.glk.fullscreen(G.gl); tex = R.glk.texture(G.gl); ok = true; loadCover(); } catch (e) { ok = false; } };
    }
    if (!ok) root.classList.add('lq-flat');
    let W = 1, H = 1;
    function resize() {
      const r = cvEl.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
      const sc = Math.min(window.devicePixelRatio || 1, 2) * 0.5 * Math.max(0.6, R.quality());
      cvEl.width = Math.max(2, Math.round(W * sc)); cvEl.height = Math.max(2, Math.round(H * sc));
    }
    resize();
    let tok = 0;
    async function loadCover() {
      if (!ok) return;
      const my = ++tok;
      const c = await R.glk.coverCanvas(api.track(), 256);
      if (my === tok && ok) R.glk.upload(G.gl, tex, c, false);
    }
    // the satellites, the droplets and the core, simulated here; the shader only draws them
    const sat = [0, 1, 2, 3].map((i) => ({ ph: i * 1.7, w: 0.42 + i * 0.13, r: 0.36 + (i % 2) * 0.1, tilt: 0.5 + i * 0.35, x: 0, y: 0, z: 0 }));
    const drops = [];
    let t0 = 0, enterT = 0, swapT = 9, flash = 0, coreR = 0.95, orbitK = 1;
    const Bu = new Float32Array(20), Du = new Float32Array(16);
    function spawn(s) {
      if (drops.length >= 4) return;
      const a = Math.random() * R.TAU, el = 0.35 + Math.random() * 0.8;
      const dir = [Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el) * 0.6];
      const sp = 1.7 + s * 1.6;
      drops.push({ x: dir[0] * coreR, y: dir[1] * coreR, z: dir[2] * coreR, vx: dir[0] * sp, vy: dir[1] * sp + 0.6, vz: dir[2] * sp, r: 0.11 + Math.random() * 0.1, life: 2.6 });
    }
    api.beat((s) => { if (s > 0.68 && !R.reduced) { spawn(s); if (s > 0.9) spawn(s * 0.8); } });
    return {
      enter() { enterT = 0; },
      swap() { swapT = 0; flash = 0.35; for (let i = 0; i < 3; i++) spawn(1); },
      onTrack: loadCover,
      resize,
      frame(dt, t, v) {
        t0 += dt; enterT += dt; swapT += dt;
        flash *= Math.exp(-dt * 5);
        const e = Math.min(1, enterT / 1.6), ez = 1 - Math.pow(1 - e, 3);
        // song change: everything is sucked into the core, then flung back out
        const sw = swapT < 1.1 ? (swapT < 0.35 ? 1 - swapT / 0.35 : Math.sin(((swapT - 0.35) / 0.75) * Math.PI) * 0.6 + (swapT - 0.35) / 0.75) : 1;
        orbitK += ((swapT < 0.35 ? 0.05 : sw) - orbitK) * Math.min(1, dt * 10);
        coreR += ((0.92 + v.level * 0.14 + v.beat * 0.07) * (0.55 + ez * 0.45) - coreR) * Math.min(1, dt * 12);
        const R0 = (1.32 + v.bass * 0.38 + v.hot * 0.32) * orbitK;
        const spd = v.playing ? 1 + v.level * 0.6 + v.hot * 0.8 : 0.25;
        Bu[0] = 0; Bu[1] = (1 - ez) * 4.5 + Math.sin(t0 * 0.9) * 0.06; Bu[2] = 0; Bu[3] = coreR;
        sat.forEach((s, i) => {
          s.ph += dt * s.w * spd;
          const fall = Math.max(0, 1 - (enterT - 0.15 * i) / 1.2);
          const x = Math.cos(s.ph) * R0, z = Math.sin(s.ph) * R0 * 0.55, y = Math.sin(s.ph * 2 + i) * 0.35 * R0 * s.tilt;
          Bu[4 + i * 4] = x; Bu[5 + i * 4] = y + fall * fall * 6; Bu[6 + i * 4] = z; Bu[7 + i * 4] = (s.r + v.mid * 0.1) * (0.7 + 0.3 * orbitK);
        });
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i]; d.life -= dt;
          d.vy -= 4.4 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
          // pulled back to the core as they fall
          d.vx -= d.x * dt * 1.6; d.vz -= d.z * dt * 1.6;
          if (d.life <= 0 || Math.hypot(d.x, d.y, d.z) < coreR * 0.85 || d.y < -2.2) drops.splice(i, 1);
        }
        for (let i = 0; i < 4; i++) { const d = drops[i]; Du[i * 4] = d ? d.x : 0; Du[i * 4 + 1] = d ? d.y : 0; Du[i * 4 + 2] = d ? d.z : 0; Du[i * 4 + 3] = d ? d.r : -1; }
        root.style.setProperty('--lv', v.level.toFixed(3));
        if (!ok || G.lost) return;
        const gl = G.gl, aspect = W / H, port = aspect < 1;
        gl.viewport(0, 0, cvEl.width, cvEl.height);
        P.use();
        gl.uniform2f(P.u.res, cvEl.width, cvEl.height);
        gl.uniform2f(P.u.ctr, 0, port ? 0.2 : 0.16);
        gl.uniform1f(P.u.fov, port ? Math.max(0.5, 1.25 / (aspect * 3.0)) : 0.5);
        gl.uniform1f(P.u.time, t0 % 1000); gl.uniform1f(P.u.bass, v.bass); gl.uniform1f(P.u.hot, R.reduced ? 0 : v.hot); gl.uniform1f(P.u.flash, flash);
        gl.uniform4fv(P.u.B, Bu); gl.uniform4fv(P.u.D, Du);
        const tl = R.tilt;
        gl.uniform3f(P.u.cam, Math.sin(t0 * 0.13) * 0.25 + tl.x * 0.55, 0.12 - tl.y * 0.3, 5.6);
        const c1 = R.glk.hex3('#ffffff'), c2 = R.glk.hex3(api.colors().vibrant);
        gl.uniform3f(P.u.a1, c1[0] * 0.9, c1[1] * 0.92, c1[2]); gl.uniform3f(P.u.a2, c2[0] * 1.2, c2[1] * 1.2, c2[2] * 1.2);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(P.u.cover, 0);
        draw(P);
      },
      destroy() { tok++; if (G && G.gl) { const x = G.gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } },
    };
  },
});
