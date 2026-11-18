/* ===================== light: GPU bloom over every skin, lens aberration on the beat, focus pulls =====================
   Each frame the skin's canvases are gathered into one small picture (no pixels leave the GPU on most browsers),
   the bright parts are cut out (soft threshold), blurred through a mip chain (dual Kawase), and the glow is laid back
   over the page with plus-lighter blending, so it only ever adds light. Text and buttons stay sharp underneath.
   A skin sets its own look with def.bloom: a number (strength) or { s, th, streak, tint, ca }. 0 turns it off. */
R.fx = (() => {
  const { $, settings, bus } = R;
  const cv = $('#fx');
  const gather = document.createElement('canvas');
  const gx = gather.getContext('2d', { alpha: false });
  let G = null, gl = null, P = {}, draw = null, srcT = null, pre = null, mips = [], sA = null, sB = null;
  let gw = 0, gh = 0, gs = 0.5, ok = false, css = false, str = 0, kickA = 0, idle = 0, list = [], listAt = 0, listRoot = null;
  let lastW = 0, lastH = 0;

  const VS = R.glk.FULL_VS;
  const HEAD = 'precision mediump float; varying vec2 uv; uniform sampler2D src; uniform vec2 hp;\n';
  const FS = {
    pre: HEAD + `uniform float th; uniform float knee;
      void main(){
        vec3 c = (texture2D(src, uv+hp).rgb + texture2D(src, uv-hp).rgb + texture2D(src, uv+vec2(hp.x,-hp.y)).rgb + texture2D(src, uv-vec2(hp.x,-hp.y)).rgb)*.25;
        float br = max(c.r, max(c.g, c.b));
        float k = th*knee + 1e-4;
        float s = clamp(br - th + k, 0., 2.*k); s = s*s/(4.*k);
        float w = max(s, br - th)/max(br, 1e-4);
        gl_FragColor = vec4(c*w*.5, 1.);
      }`,
    down: HEAD + `void main(){
        vec3 s = texture2D(src, uv).rgb*4. + texture2D(src, uv-hp).rgb + texture2D(src, uv+hp).rgb + texture2D(src, uv+vec2(hp.x,-hp.y)).rgb + texture2D(src, uv-vec2(hp.x,-hp.y)).rgb;
        gl_FragColor = vec4(s/8., 1.);
      }`,
    up: HEAD + `uniform float w;
      void main(){
        vec3 s = texture2D(src, uv+vec2(-hp.x*2.,0.)).rgb + texture2D(src, uv+vec2(-hp.x,hp.y)).rgb*2. + texture2D(src, uv+vec2(0.,hp.y*2.)).rgb + texture2D(src, uv+vec2(hp.x,hp.y)).rgb*2.
               + texture2D(src, uv+vec2(hp.x*2.,0.)).rgb + texture2D(src, uv+vec2(hp.x,-hp.y)).rgb*2. + texture2D(src, uv+vec2(0.,-hp.y*2.)).rgb + texture2D(src, uv+vec2(-hp.x,-hp.y)).rgb*2.;
        gl_FragColor = vec4(s/12.*w, 1.);
      }`,
    // anamorphic lens streak: a wide horizontal smear of the bright parts
    streak: HEAD + `uniform float d;
      void main(){
        vec2 o = vec2(hp.x*2.*d, 0.);
        vec3 s = texture2D(src, uv).rgb*.28 + (texture2D(src, uv+o).rgb + texture2D(src, uv-o).rgb)*.22 + (texture2D(src, uv+o*2.).rgb + texture2D(src, uv-o*2.).rgb)*.14;
        gl_FragColor = vec4(s, 1.);
      }`,
    comp: `precision mediump float; varying vec2 uv;
      uniform sampler2D bloom; uniform sampler2D streak; uniform sampler2D scene;
      uniform float strength; uniform float sk; uniform vec3 tint; uniform float ca; uniform float kick; uniform float lift; uniform float time;
      void main(){
        vec2 d = uv - .5;
        vec2 o = d*(.006 + ca*.022);
        vec3 b = vec3(texture2D(bloom, uv + o).r, texture2D(bloom, uv).g, texture2D(bloom, uv - o).b);
        vec3 c = b*strength*2.;
        c += texture2D(streak, uv).rgb*tint*sk*2.6;
        if (kick > .01) {
          vec2 g = d*.05*kick + vec2(.008*kick, 0.);
          vec3 s1 = texture2D(scene, uv + g).rgb, s2 = texture2D(scene, uv - g).rgb;
          c += (vec3(s1.r, s1.g*.15, 0.) + vec3(0., s2.g*.35, s2.b))*kick*.9;
        }
        c += lift*vec3(.9, .95, 1.);
        c += (fract(sin(dot(gl_FragCoord.xy + time*61., vec2(12.9898, 78.233)))*43758.5453) - .5)/160.;
        gl_FragColor = vec4(max(c, 0.), 1.);
      }`,
  };

  function init() {
    if (ok || css) return;
    G = R.glk.context(cv, { alpha: false });
    if (G) {
      gl = G.gl;
      try { for (const k of Object.keys(FS)) P[k] = R.glk.program(gl, VS, FS[k]); draw = R.glk.fullscreen(gl); srcT = R.glk.texture(gl); ok = true; }
      catch (e) { console.warn('bloom', e); ok = false; }
      G.onlost = () => { ok = false; };
      G.onrestored = () => { P = {}; mips = []; pre = sA = sB = null; lastW = 0; init(); };
    }
    if (!ok) { // no WebGL: the browser blurs a copy of the bright parts itself
      css = true; cv.hidden = true;
      gather.className = 'fx-css'; gather.setAttribute('aria-hidden', 'true');
      cv.parentNode.insertBefore(gather, cv);
    }
    size();
  }
  function size() {
    const W = innerWidth, H = innerHeight;
    if (W === lastW && H === lastH && gw) return;
    lastW = W; lastH = H;
    gs = Math.max(0.22, Math.min(0.5, 250 / Math.max(1, Math.min(W, H)))) * (R.quality() < 0.8 ? 0.8 : 1);
    gw = Math.max(32, Math.round(W * gs)); gh = Math.max(32, Math.round(H * gs));
    gather.width = gw; gather.height = gh;
    if (!ok) return;
    cv.width = gw; cv.height = gh;
    for (const m of mips) m.free();
    if (pre) pre.free(); if (sA) sA.free(); if (sB) sB.free();
    mips = [];
    const hw = Math.max(8, gw >> 1), hh = Math.max(8, gh >> 1);
    pre = R.glk.target(gl, hw, hh); sA = R.glk.target(gl, hw, hh); sB = R.glk.target(gl, hw, hh);
    let w = hw >> 1, h = hh >> 1;
    for (let i = 0; i < 5 && w >= 3 && h >= 3; i++) { mips.push(R.glk.target(gl, w, h)); w >>= 1; h >>= 1; }
  }
  window.addEventListener('resize', () => { lastW = 0; });
  bus.on('quality', () => { lastW = 0; });

  const DEF = { s: 0.6, th: 0.56, knee: 0.55, streak: 0, tint: null, ca: 0.5 };
  function cfg() {
    const d = R.stage.current();
    let b = d ? d.bloom : undefined;
    if (b === undefined) b = d && d.diy ? 0.45 : DEF.s;
    if (typeof b === 'number') b = { s: b };
    return Object.assign({}, DEF, b || { s: 0 });
  }
  const enabled = () => settings.get('bloom') !== false && !R.reduced;

  // the canvases on screen worth lighting: the skins' (both, during a change), the chorus layer, the transition layer
  function sources(now) {
    const root = R.stage.root();
    if (root === listRoot && now - listAt < 1200) return list;
    listRoot = root; listAt = now;
    list = Array.from(document.querySelectorAll('#stage .skin canvas, #trans'));
    return list;
  }
  function gatherFrame(now) {
    gx.globalAlpha = 1; gx.globalCompositeOperation = 'source-over';
    gx.fillStyle = '#000'; gx.fillRect(0, 0, gw, gh);
    const s = gs;
    for (const c of sources(now)) {
      if (!c.isConnected || c.width < 3 || c.height < 3 || c.hidden) continue;
      if (c.id === 'trans' && !R.trans.active()) continue;
      const r = c.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > lastH) continue;
      try { gx.drawImage(c, r.left * s, r.top * s, r.width * s, r.height * s); } catch (e) { /* a lost context: skip it */ }
    }
    if (R.hype && R.hype.live()) { const h = $('#hype'); try { gx.drawImage(h, 0, 0, gw, gh); } catch (e) { /* ignore */ } }
  }
  function pass(prog, src, dst, uni) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.f : null);
    gl.viewport(0, 0, dst ? dst.w : gw, dst ? dst.h : gh);
    prog.use();
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.t || src);
    if (prog.u.src) gl.uniform1i(prog.u.src, 0);
    if (prog.u.hp && src.w) gl.uniform2f(prog.u.hp, 0.5 / src.w, 0.5 / src.h);
    if (uni) uni(prog.u);
    draw(prog);
  }
  function render(c, strength, kick, lift, t) {
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    R.glk.upload(gl, srcT, gather, true);
    const srcInfo = { t: srcT, w: gw, h: gh };
    pass(P.pre, srcInfo, pre, (u) => { gl.uniform1f(u.th, c.th); gl.uniform1f(u.knee, c.knee); });
    let prev = pre;
    for (const m of mips) { pass(P.down, prev, m); prev = m; }
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = mips.length - 1; i > 0; i--) pass(P.up, mips[i], mips[i - 1], (u) => gl.uniform1f(u.w, 0.9));
    gl.disable(gl.BLEND);
    let sk = 0;
    if (c.streak > 0) {
      sk = c.streak;
      pass(P.streak, pre, sA, (u) => gl.uniform1f(u.d, 1.5));
      pass(P.streak, sA, sB, (u) => gl.uniform1f(u.d, 4.5));
      pass(P.streak, sB, sA, (u) => gl.uniform1f(u.d, 12));
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gw, gh);
    const p = P.comp.use();
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, mips[0] ? mips[0].t : pre.t); gl.uniform1i(p.u.bloom, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, sA.t); gl.uniform1i(p.u.streak, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, pre.t); gl.uniform1i(p.u.scene, 2);
    const tint = c.tint ? R.glk.hex3(c.tint) : [0.55, 0.75, 1];
    gl.uniform1f(p.u.strength, strength); gl.uniform1f(p.u.sk, sk * Math.min(1.4, strength * 1.6)); gl.uniform3f(p.u.tint, tint[0], tint[1], tint[2]);
    gl.uniform1f(p.u.ca, c.ca); gl.uniform1f(p.u.kick, kick); gl.uniform1f(p.u.lift, lift); gl.uniform1f(p.u.time, t % 100);
    draw(p);
    gl.activeTexture(gl.TEXTURE0);
  }

  // an older phone that is already at the lowest resolution and still dropping frames: the glow goes first
  let tAcc = 0, slow = 0, tired = false;
  function frame(dt, t) {
    if (document.hidden) return;
    if (!ok && !css) { if (!enabled()) return; init(); }
    if (G && G.lost) return;
    if (!tired && settings.get('quality') === 'auto' && R.quality() < 0.7) {
      if (dt > 0.03 && dt < 0.25) slow += dt; else slow = Math.max(0, slow - dt);
      if (slow > 4) { tired = true; console.info('bloom: off for this visit (frames too slow)'); }
    }
    if (tired) { if (ok && !cv.hidden) cv.hidden = true; if (css && !gather.hidden) gather.hidden = true; return; }
    const v = R.viz, c = cfg();
    const lyr = document.body.classList.contains('ly-open') || document.body.classList.contains('deep');
    // the glow breathes with the beat: up on every beat (more on the bar's first), back down before the next one
    const fl = settings.get('flash') ? 1 : 0.55;
    const want = enabled() && !lyr && c.s > 0 ? c.s * (0.72 + 0.36 * v.level + fl * (0.5 * v.pump + 0.3 * v.down + 0.22 * v.kickE) + 0.4 * v.hot) : 0;
    str += (want - str) * (1 - Math.exp(-dt * (want > str ? 26 : 7)));
    const k = enabled() && c.ca > 0 && v.hot > 0.4 && settings.get('flash') ? v.kick * v.hot * c.ca : 0;
    kickA = Math.max(kickA * Math.exp(-dt * 9), k);
    if (str < 0.012 && kickA < 0.01) {
      idle += dt;
      if (idle > 0.3) { if (ok && !cv.hidden) cv.hidden = true; if (css && !gather.hidden) gather.hidden = true; }
      return;
    }
    idle = 0;
    size();
    tAcc += dt;
    gatherFrame(performance.now());
    if (ok) {
      if (cv.hidden) cv.hidden = false;
      const lift = settings.get('flash') ? Math.min(0.06, v.kick * v.hot * 0.07) : 0;
      render(c, str, kickA, lift, tAcc);
    } else {
      if (gather.hidden) gather.hidden = false;
      gather.style.opacity = Math.min(1, str * 1.25).toFixed(3);
    }
  }

  /* ---------- focus pulls (depth of field): the skin goes soft behind lyrics and full-screen panels ---------- */
  const stage = $('#stage');
  const holds = new Set();
  function focus(key, on) {
    if (on) holds.add(key); else holds.delete(key);
    stage.classList.toggle('defocus', holds.size > 0);
    document.body.classList.toggle('deep', holds.size > 0 && !holds.has('lyrics'));
  }
  return { frame, focus, ok: () => ok, css: () => css };
})();
