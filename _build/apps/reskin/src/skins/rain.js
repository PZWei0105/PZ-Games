/* ===================== skin: 窗雨 RAIN WINDOW — a rainy window at night =====================
   A street at night seen through wet, fogged glass. Every raindrop on the glass is a little lens: it shows the street
   upside down and sharp (refraction from a normal map of the drops), while the glass round it is soft and grey with
   fog. How hard it rains follows how loud the song is (a slow swell, not a jitter); on the beat a few heavy drops let
   go and slide, on the bar's first beat one runs the whole way down and wipes a clear trail through the mist. The
   street takes its colour from the song's key: cold blue for a minor key, warm amber for a major one. The traffic
   light changes every few bars, cars pass, the billboard across the road shows the cover. In the chorus the rain
   gets heavy and lightning lights the whole pane. Write on the fogged glass with your finger; it fogs over again. */
R.skins.def({
  id: 'rain', name: '窗雨', group: '雅致', en: 'RAIN WINDOW',
  desc: '深夜的窗：每顆雨滴都倒映著街景和封面；雨量跟著音量、拍子讓水珠滑落、副歌打雷；起霧的玻璃可以用手指寫字',
  bloom: { s: 0.42, th: 0.7, tint: '#a8c8ff' }, hero: '.rw-art', trans: 'classic', hype: false,
  theme: { bg: '#05080d', fg: '#e6eef7', accent: '#9cc2ec', accent2: '#ffb36b', ui: 'rgba(8,12,18,.97)', dock: 'rgba(14,20,30,.45)', dockfg: '#dbe7f5' },
  enterMs: 2400, swapMs: 1500, punch: 0,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="rws" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b14"/><stop offset=".55" stop-color="#16233a"/><stop offset="1" stop-color="#0a0f18"/></linearGradient><radialGradient id="rwl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffc77a"/><stop offset="1" stop-color="#ffc77a" stop-opacity="0"/></radialGradient><radialGradient id="rwd" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset=".35" stop-color="#9fc4ff" stop-opacity=".35"/><stop offset="1" stop-color="#0a1220" stop-opacity=".1"/></radialGradient></defs><rect width="116" height="150" fill="url(#rws)"/><rect x="30" y="22" width="46" height="34" fill="#3b2a6e" opacity=".55"/><rect x="34" y="26" width="38" height="26" fill="#ff5ab4" opacity=".35"/><circle cx="18" cy="74" r="16" fill="url(#rwl)"/><circle cx="96" cy="68" r="14" fill="url(#rwl)"/><circle cx="62" cy="88" r="10" fill="#ff4a4a" opacity=".45"/><rect y="96" width="116" height="54" fill="#070a10" opacity=".7"/><g fill="url(#rwd)"><ellipse cx="24" cy="40" rx="5" ry="6"/><ellipse cx="78" cy="30" rx="3.5" ry="4"/><ellipse cx="56" cy="64" rx="7" ry="8.5"/><ellipse cx="92" cy="104" rx="5" ry="6"/><ellipse cx="34" cy="116" rx="4" ry="5"/><ellipse cx="66" cy="128" rx="3" ry="3.5"/></g><path d="M56 73v40" stroke="#bcd6ff" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/><g fill="#cfe2ff" opacity=".45"><circle cx="14" cy="22" r="1"/><circle cx="44" cy="12" r=".8"/><circle cx="100" cy="46" r="1"/><circle cx="84" cy="84" r=".9"/><circle cx="12" cy="132" r="1"/><circle cx="104" cy="138" r=".8"/></g></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 1800, f2: 2600, dur: 0.05, v: 0.035, type: 'sine' }); },
    tick(s, t) { s.tone(t, { f: 2400, f2: 3000, dur: 0.025, v: 0.02, type: 'sine' }); },
    toggle(s, t) { s.tone(t, { f: 900, f2: 1500, dur: 0.07, v: 0.035, type: 'sine' }); },
    play(s, t) { s.notes(t, [s.hz(69), s.hz(76), s.hz(81)], { dur: 0.9, v: 0.03, type: 'sine', gap: 0.11 }); },
    pause(s, t) { s.notes(t, [s.hz(81), s.hz(76), s.hz(69)], { dur: 0.8, v: 0.026, type: 'sine', gap: 0.11 }); },
    next(s, t) { s.tone(t, { f: 1400, f2: 2400, dur: 0.06, v: 0.03, type: 'sine' }); s.noise(t, { f: 6000, dur: 0.25, v: 0.012, q: 0.7 }); },
    prev(s, t) { s.tone(t, { f: 2400, f2: 1400, dur: 0.06, v: 0.03, type: 'sine' }); s.noise(t, { f: 6000, dur: 0.25, v: 0.012, q: 0.7 }); },
    enter(s, t) { s.noise(t, { f: 5000, f2: 3500, dur: 2.2, v: 0.03, q: 0.5 }); for (let i = 0; i < 6; i++) s.tone(t + 0.25 + i * 0.27 + Math.random() * 0.1, { f: 1500 + Math.random() * 1600, f2: 2600 + Math.random() * 900, dur: 0.05, v: 0.02, type: 'sine' }); s.notes(t + 0.6, [s.hz(57), s.hz(64), s.hz(71)], { dur: 1.6, v: 0.02, type: 'sine', gap: 0.3 }); },
    open(s, t) { s.tone(t, { f: 1300, f2: 1900, dur: 0.06, v: 0.025, type: 'sine' }); },
    close(s, t) { s.tone(t, { f: 1900, f2: 1300, dur: 0.06, v: 0.025, type: 'sine' }); },
    ok(s, t) { s.notes(t, [s.hz(76), s.hz(81)], { dur: 0.5, v: 0.025, type: 'sine', gap: 0.1 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="rw-cv"></canvas>
      <div class="rw-hud" data-ui><b data-rw="clock">--:--</b><span data-rw="wx">小雨</span></div>
      <div class="rw-hint">用手指在起霧的玻璃上寫字</div>
      <div class="rw-panel">
        <div class="rw-row" data-ui>
          <div class="rw-art"><img data-bind="cover" alt="" draggable="false"></div>
          <div class="rw-tx"><div class="rw-t" data-bind="title"></div><div class="rw-a" data-bind="artist"></div></div>
        </div>
        ${R.ui.seek('rw-seek')}
        ${R.ui.ctrl('rw-ctrl')}
      </div>`;
    const cvEl = root.querySelector('.rw-cv'), clockEl = root.querySelector('[data-rw="clock"]'), wxEl = root.querySelector('[data-rw="wx"]');
    const rnd = Math.random, mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(2, w | 0); c.height = Math.max(2, h | 0); return c; };

    /* ---------- GL: the glass ---------- */
    const G = R.glk.context(cvEl, { alpha: false, preserve: true });
    const FS = `precision mediump float;
      varying vec2 uv;
      uniform sampler2D bg, bgt, water, fogm;
      uniform vec2 px, pxt; uniform float flash, fogAmt, refr, aspect, enter;
      uniform vec3 tint;
      vec3 blur(vec2 p, float r) {
        vec3 s = texture2D(bg, p).rgb * .5;
        for (int i = 0; i < 8; i++) { float a = float(i) * 2.39996; float q = r * sqrt((float(i) + .5) / 8.); s += texture2D(bg, p + vec2(cos(a), sin(a)) * q * px).rgb; }
        return s / 8.5;
      }
      // the far blur comes from a small copy of the street, so it is smooth however wide it is
      vec3 blurT(vec2 p, float r) {
        vec3 s = texture2D(bgt, p).rgb * .5;
        for (int i = 0; i < 10; i++) { float a = float(i) * 2.39996 + .7; float q = r * sqrt((float(i) + .5) / 10.); s += texture2D(bgt, p + vec2(cos(a), sin(a)) * q * pxt).rgb; }
        return s / 10.5;
      }
      void main() {
        vec2 p = vec2(uv.x, 1. - uv.y);
        vec4 w = texture2D(water, p);
        vec2 n = (w.rg - .5) * 2.; float th = w.b, cov = w.a;
        float clr = texture2D(fogm, p).a;
        vec3 heavy = blurT(p, 3.4), light = blur(p, 2.2);
        float fog = fogAmt * (1. - clr);
        vec3 milk = heavy * .78 + vec3(.085, .095, .118) + heavy * heavy * .4;
        vec3 glass = mix(light * .95, milk, min(1., fog * 1.15));
        // a drop is a lens: the street upside down, sharp and a little brighter, with a dark rim and a highlight
        vec2 off = -n * refr * vec2(1., aspect) * (.6 + .6 * th);
        vec3 dc = texture2D(bg, p + off).rgb * 1.28 + .02 + heavy * .16;
        float m = smoothstep(.1, .3, cov);
        float rim = smoothstep(.6, 1., 1. - th) * .5;
        float caus = smoothstep(.15, .9, n.y) * smoothstep(.45, .05, th) * .45;
        vec3 L = normalize(vec3(-.45, -.65, .62));
        float spec = pow(max(0., dot(normalize(vec3(n * 1.4, th + .15)), L)), 30.) * .9;
        float spec2 = pow(max(0., dot(normalize(vec3(n * 1.4, th + .15)), normalize(vec3(.5, .55, .67)))), 12.) * .12;
        vec3 drop = dc * (1. - rim) + spec + spec2 + caus * (heavy * 1.4 + .08);
        vec3 col = mix(glass, drop, m * enter);
        col *= tint;
        col += flash * vec3(.62, .7, .9) * (.25 + .75 * m) + flash * flash * .12;
        float v = length((uv - .5) * vec2(1., .8));
        col *= 1. - .5 * smoothstep(.45, .95, v);
        col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5) / 160.;
        gl_FragColor = vec4(col, 1.);
      }`;
    let P = null, draw = null, tBg = null, tBgT = null, tWater = null, tFog = null, ok = false;
    function setupGL() {
      const gl = G.gl;
      P = R.glk.program(gl, R.glk.FULL_VS, FS); draw = R.glk.fullscreen(gl);
      tBg = R.glk.texture(gl); tBgT = R.glk.texture(gl); tWater = R.glk.texture(gl, { fill: [128, 128, 0, 0] }); tFog = R.glk.texture(gl, { fill: [0, 0, 0, 0] });
      ok = true;
    }
    if (G) {
      try { setupGL(); } catch (e) { console.warn('rain shader', e); ok = false; }
      G.onrestored = () => { try { setupGL(); } catch (e) { ok = false; } };
    }
    const ctx2 = ok ? null : cvEl.getContext('2d');

    /* ---------- the drop: a normal map (r, g = slope, b = thickness, a = coverage) ---------- */
    const DS = 64, dropC = mk(DS, DS);
    {
      const x = dropC.getContext('2d'), im = x.createImageData(DS, DS);
      for (let j = 0; j < DS; j++) for (let i = 0; i < DS; i++) {
        const dx = (i + 0.5) / DS * 2 - 1, dy = (j + 0.5) / DS * 2 - 1, r = Math.hypot(dx, dy), o = (j * DS + i) * 4;
        if (r >= 1) { im.data[o + 3] = 0; continue; }
        const th = Math.sqrt(1 - r * r), sy = dy + 0.12 * (1 - th);          // a drop sags: its belly is lower
        im.data[o] = 128 + dx * 127; im.data[o + 1] = 128 + Math.max(-1, Math.min(1, sy)) * 127; im.data[o + 2] = th * 255;
        im.data[o + 3] = Math.min(255, (1 - r) * 255 * 6);
      }
      x.putImageData(im, 0, 0);
    }

    /* ---------- sizes, the street, the drops ---------- */
    let W = 1, H = 1, ws = 1, U = 1, bgC = null, bgH = null, bgT = null, bgS = null, bgOld = null, oldA = 0, waterC = null, mistC = null, fogC = null, fs = 0.25, BS = 0.6;
    let pal = null;
    function resize() {
      const r = cvEl.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
      const sc = Math.min(window.devicePixelRatio || 1, 2) * 0.56 * Math.max(0.6, R.quality());
      if (ok) { cvEl.width = Math.max(2, Math.round(W * sc)); cvEl.height = Math.max(2, Math.round(H * sc)); }
      else { cvEl.width = Math.round(W); cvEl.height = Math.round(H); }
      ws = Math.min(1, 520 / Math.max(W, H) * 1.4); U = ws * Math.max(1, Math.min(1.8, Math.min(W, H) / 400));
      bgC = mk(W * BS, H * BS); bgH = mk(W * BS / 2, H * BS / 2); bgT = mk(W * BS / 4, H * BS / 4); waterC = mk(W * ws, H * ws); mistC = mk(W * ws, H * ws); fogC = mk(W * fs, H * fs);
      drops.length = 0;
      buildStreet(); prefill();
    }
    function palette() {
      const t = api.track(), minor = /m$/.test((t && t.mkey) || ''), known = !!(t && t.mkey);
      const warm = known && !minor;
      const col = api.colors();
      return warm
        ? { warm: true, sky: ['#090605', '#1d130c', '#3a2414'], haze: 'rgba(255,150,70,', win: ['#ffcc80', '#ffb35c', '#ffe0a8', '#ffd28f'], lamp: '#ffb25a', neon: '#ff6a8a', tint: [1.06, 1.0, 0.9], bb: col.vibrant }
        : { warm: false, sky: ['#04060b', '#0c1626', '#1a2a42'], haze: 'rgba(110,150,220,', win: ['#cfe6ff', '#9cc8ff', '#ffe0a8', '#bfe8ff'], lamp: '#ffae55', neon: '#48e0ff', tint: known ? [0.9, 0.98, 1.1] : [0.96, 0.99, 1.04], bb: col.vibrant };
    }
    // the street: sky glow, three rows of buildings with lit windows, the billboard with the cover, lamps, wet road
    function buildStreet() {
      if (bgS) { bgOld = bgS; oldA = 1; }
      pal = palette();
      const w = bgC.width, h = bgC.height, c = mk(w, h), x = c.getContext('2d'), R1 = R.rng(R.hashStr(((api.track() || {}).id || 'x') + 'st'));
      const roadY = h * 0.66;
      let g = x.createLinearGradient(0, 0, 0, roadY); g.addColorStop(0, pal.sky[0]); g.addColorStop(0.6, pal.sky[1]); g.addColorStop(1, pal.sky[2]); x.fillStyle = g; x.fillRect(0, 0, w, roadY);
      // three rows of buildings, far to near
      for (let row = 0; row < 3; row++) {
        const base = roadY - h * (0.02 + row * 0.015), dark = ['#0e1420', '#0a0e17', '#06080d'][row];
        let xx = -R1() * 30;
        while (xx < w) {
          const bw = w * (0.12 + R1() * 0.16) * (1 + row * 0.25), bh = h * (0.18 + R1() * (0.32 - row * 0.06)) * (row === 2 ? 0.75 : 1);
          x.fillStyle = pal.warm ? ['#160f0b', '#100b08', '#080605'][row] : dark; x.fillRect(xx, base - bh, bw, bh + h * 0.05);
          const cw = Math.max(2, bw / (7 + R1() * 5)), ch = cw * 1.25;
          for (let yy = base - bh + ch; yy < base - ch; yy += ch * 1.8) for (let wx = xx + cw * 0.6; wx < xx + bw - cw; wx += cw * 1.7) {
            if (R1() < 0.28 - row * 0.05) { x.globalAlpha = 0.35 + R1() * 0.55; x.fillStyle = pal.win[(R1() * pal.win.length) | 0]; x.fillRect(wx, yy, cw, ch); }
          }
          x.globalAlpha = 1; xx += bw + R1() * w * 0.03;
        }
      }
      // the billboard across the road: the cover, framed in light
      const bs = Math.min(w * 0.5, h * 0.24), bx = w * 0.56 - bs / 2, by = h * 0.17;
      x.fillStyle = '#05070b'; x.fillRect(bx - bs * 0.08, by - bs * 0.08, bs * 1.16, bs * 1.16);
      x.fillStyle = '#05070b'; x.fillRect(bx + bs * 0.45, by + bs * 1.08, bs * 0.1, roadY - by - bs);
      if (coverC) x.drawImage(coverC, bx, by, bs, bs); else { x.fillStyle = pal.bb; x.fillRect(bx, by, bs, bs); }
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.5; x.drawImage(api.glow(pal.bb, 64), bx - bs * 0.5, by - bs * 0.5, bs * 2, bs * 2); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      // a neon sign on the near-left building
      x.fillStyle = '#05070b'; x.fillRect(w * 0.04, h * 0.3, w * 0.08, h * 0.2);
      x.fillStyle = pal.neon; for (let i = 0; i < 4; i++) x.fillRect(w * 0.065, h * 0.315 + i * h * 0.045, w * 0.03, h * 0.03);
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.7; x.drawImage(api.glow(pal.neon, 64), w * 0.0, h * 0.27, w * 0.16, h * 0.27); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      // road: wet asphalt, kerb, the city haze over the horizon
      g = x.createLinearGradient(0, roadY, 0, h); g.addColorStop(0, pal.warm ? '#1a120c' : '#0d121b'); g.addColorStop(1, '#030405'); x.fillStyle = g; x.fillRect(0, roadY, w, h - roadY);
      x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(0, roadY + h * 0.035, w, Math.max(1, h * 0.004));
      g = x.createLinearGradient(0, roadY - h * 0.25, 0, roadY); g.addColorStop(0, pal.haze + '0)'); g.addColorStop(1, pal.haze + '.18)'); x.fillStyle = g; x.fillRect(0, roadY - h * 0.25, w, h * 0.25);
      // street lamps and their streaks on the wet road
      lamps = [[0.08, 0.43], [0.52, 0.47], [0.95, 0.42]].map(([lx, ly]) => [lx * w, ly * h]);
      for (const [lx, ly] of lamps) {
        x.strokeStyle = '#05070a'; x.lineWidth = Math.max(1.5, w * 0.008); x.beginPath(); x.moveTo(lx, roadY + h * 0.03); x.lineTo(lx, ly); x.lineTo(lx + w * 0.03, ly - h * 0.005); x.stroke();
        x.globalCompositeOperation = 'lighter';
        x.globalAlpha = 0.95; x.drawImage(api.glow(pal.lamp, 64), lx - w * 0.07, ly - w * 0.06, w * 0.17, w * 0.13);
        x.globalAlpha = 0.35; x.drawImage(api.glow(pal.lamp, 64), lx - w * 0.2, ly - w * 0.16, w * 0.43, w * 0.32);
        streak(x, lx + w * 0.02, roadY, h, w * 0.05, pal.lamp, 0.35);
        x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
      }
      // the window streaks for the billboard and the neon too
      x.globalCompositeOperation = 'lighter'; streak(x, bx + bs / 2, roadY, h, bs * 0.4, pal.bb, 0.18); streak(x, w * 0.08, roadY, h, w * 0.05, pal.neon, 0.25); x.globalCompositeOperation = 'source-over';
      bgS = c; L.roadY = roadY; L.bb = [bx, by, bs];
    }
    function streak(x, cx, y0, h, sw, col, a) {
      const g = x.createLinearGradient(0, y0, 0, h); g.addColorStop(0, R.color.rgba(col, a)); g.addColorStop(0.5, R.color.rgba(col, a * 0.45)); g.addColorStop(1, R.color.rgba(col, 0));
      x.fillStyle = g; x.beginPath(); x.ellipse(cx, (y0 + h) / 2, sw / 2, (h - y0) / 2, 0, 0, R.TAU); x.fill();
    }
    let lamps = [], coverC = null, coverTok = 0;
    const L = { roadY: 0, bb: [0, 0, 0] };
    async function loadCover() {
      const my = ++coverTok, t = api.track();
      const c = await R.glk.coverCanvas(t, 256);
      if (my !== coverTok) return;
      coverC = c; buildStreet(); applyTheme();
    }
    function applyTheme() {
      if (!pal) return;
      api.setTheme(pal.warm ? { accent: '#ffc58a', accent2: '#ffd9a8', dockfg: '#ffe4c4', bg: '#0a0705' } : { accent: '#9cc2ec', accent2: '#ffb36b', dockfg: '#dbe7f5', bg: '#05080d' });
      root.classList.toggle('rw-warm', pal.warm);
    }

    /* ---------- the drops on the glass ---------- */
    const drops = [];
    let rain = 0.3, mistAcc = 0, spawnAcc = 0, fadeAcc = 0, fogAcc = 0;
    function addDrop(x, y, r, v) { drops.push({ x, y, r, v: v || 0, dist: 0, wob: rnd() * 100, sx: 1 }); }
    // the glass is already wet when you arrive
    function prefill() {
      const ww = waterC.width, wh = waterC.height, mx = mistC.getContext('2d');
      for (let i = 0; i < 1300; i++) { const r = (0.9 + rnd() * rnd() * 2.2) * U; mx.drawImage(dropC, rnd() * ww - r, rnd() * wh - r, r * 2, r * 2); }
      for (let i = 0; i < 150; i++) addDrop(rnd() * ww, rnd() * wh, (2 + Math.pow(rnd(), 2.5) * 10) * U);
    }
    function kick(n, s, run) {
      const wh = waterC.height, cand = [];
      for (const d of drops) if (d.v === 0 && d.r > 5 * U && d.y < wh * 0.75) cand.push(d);
      if (!cand.length) return;
      if (run) { cand.sort((a, b) => b.r - a.r); const d = cand.find((q) => q.y < wh * 0.5) || cand[0]; d.v = (150 + 120 * s) * U; d.run = 1; return; }
      for (let i = 0; i < n && cand.length; i++) { const d = cand.splice((rnd() * cand.length) | 0, 1)[0]; d.v = (55 + 90 * s) * U; }
    }
    api.beat((s, info) => { if (!R.player.isPlaying() || !waterC) return; if (info.down) kick(1, s, true); kick(1 + Math.round(s * 1.5), s, false); });
    let flash = 0, bolt = null, boltT = 0, lastHot = false;
    function lightning(big) {
      if (!api.flash()) { flash = Math.max(flash, 0.12); return; }
      flash = big ? 1 : 0.7; boltT = 0.32;
      const w = bgC.width, h = bgC.height, pts = []; let x = w * (0.15 + rnd() * 0.7), y = 0;
      while (y < h * (0.3 + rnd() * 0.15)) { pts.push([x, y]); x += (rnd() - 0.5) * w * 0.08; y += h * (0.015 + rnd() * 0.03); }
      bolt = pts;
    }
    api.on('hot', (on) => { if (on) lightning(true); });

    /* ---------- writing on the fog ---------- */
    let pen = null, wrote = 0;
    const penAt = (e) => { const r = cvEl.getBoundingClientRect(); return [(e.clientX - r.left) * fs, (e.clientY - r.top) * fs]; };
    function stroke(a, b) {
      const x = fogC.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.strokeStyle = '#fff'; x.lineCap = 'round'; x.lineJoin = 'round';
      x.lineWidth = 26 * fs; x.globalAlpha = 0.55; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
      x.lineWidth = 17 * fs; x.globalAlpha = 1; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
      // a finger on the glass also wipes the droplets away
      const m = mistC.getContext('2d'), k = ws / fs; m.globalCompositeOperation = 'destination-out'; m.strokeStyle = '#000'; m.lineCap = 'round'; m.lineWidth = 18 * ws; m.beginPath(); m.moveTo(a[0] * k, a[1] * k); m.lineTo(b[0] * k, b[1] * k); m.stroke(); m.globalCompositeOperation = 'source-over';
      for (const d of drops) { const dx = d.x - b[0] * k, dy = d.y - b[1] * k; if (dx * dx + dy * dy < (14 * ws + d.r) ** 2 && d.r < 9 * U) d.dead = 1; }
    }
    cvEl.addEventListener('pointerdown', (e) => { pen = penAt(e); stroke(pen, [pen[0] + 0.01, pen[1]]); wrote++; try { cvEl.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } root.classList.add('rw-wrote'); });
    cvEl.addEventListener('pointermove', (e) => { if (!pen) return; const p = penAt(e); stroke(pen, p); pen = p; });
    const up = () => { pen = null; };
    cvEl.addEventListener('pointerup', up); cvEl.addEventListener('pointercancel', up);

    /* ---------- per frame: the street, the glass, the drops ---------- */
    const cars = []; let carT = 1;
    function paintStreet(dt, now, v) {
      const x = bgC.getContext('2d'), w = bgC.width, h = bgC.height, roadY = L.roadY;
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.drawImage(bgS, 0, 0);
      if (bgOld && oldA > 0) { oldA = Math.max(0, oldA - dt / 1.4); x.globalAlpha = oldA; x.drawImage(bgOld, 0, 0, w, h); x.globalAlpha = 1; if (!oldA) bgOld = null; }
      x.globalCompositeOperation = 'lighter';
      // traffic light: green for eight bars, amber for one, red for seven
      const bar = Math.floor((v.beatT || 0) / 4) % 16, ph = bar < 8 ? 2 : bar < 9 ? 1 : 0, tl = ['#ff3b30', '#ffb020', '#3bff9c'][ph];
      const tx = w * 0.3, ty = h * 0.5;
      x.globalCompositeOperation = 'source-over'; x.fillStyle = '#05070a'; x.fillRect(tx - w * 0.004, ty, w * 0.008, roadY - ty + h * 0.03); x.fillRect(tx - w * 0.018, ty - h * 0.06, w * 0.036, h * 0.07);
      x.globalCompositeOperation = 'lighter';
      const ly = ty - h * 0.048 + ph * h * 0.02; x.globalAlpha = 0.95; x.drawImage(api.glow(tl, 32), tx - w * 0.03, ly - w * 0.03, w * 0.06, w * 0.06);
      x.globalAlpha = 0.4; x.drawImage(api.glow(tl, 64), tx - w * 0.1, ty - h * 0.09, w * 0.2, w * 0.2);
      x.globalAlpha = 1; streak(x, tx, roadY, h, w * 0.04, tl, 0.3);
      // cars: white headlights coming this way on the near lane, red tail lights going on the far one
      carT -= dt; if (carT < 0 && v.playing) { carT = 2.5 + rnd() * 5; const near = rnd() < 0.55; cars.push({ near, x: near ? w * 1.15 : -w * 0.15, sp: (near ? -1 : 1) * w * (0.22 + rnd() * 0.15) }); }
      for (let i = cars.length - 1; i >= 0; i--) {
        const c = cars[i]; c.x += c.sp * dt; if (c.x < -w * 0.3 || c.x > w * 1.3) { cars.splice(i, 1); continue; }
        const cy = roadY + h * (c.near ? 0.07 : 0.035), col = c.near ? '#fff1d6' : '#ff2a2a', s = w * (c.near ? 0.07 : 0.045);
        for (const o of [-1, 1]) { x.globalAlpha = 0.9; x.drawImage(api.glow(col, 32), c.x + o * s * 0.5 - s / 2, cy - s / 2, s, s); }
        x.globalAlpha = c.near ? 0.25 : 0.15; x.drawImage(api.glow(col, 64), c.x - s * 2.5, cy - s * 1.2, s * 5, s * 2.4);
        x.globalAlpha = 1; streak(x, c.x, cy, h, s * 1.2, col, c.near ? 0.22 : 0.14);
      }
      // lightning: the bolt itself for a moment, and the whole sky lit
      if (boltT > 0 && bolt) {
        boltT -= dt; x.globalAlpha = Math.min(1, boltT * 6) * (0.7 + 0.3 * Math.sin(now * 90));
        x.strokeStyle = '#e8f0ff'; x.lineWidth = Math.max(1, w * 0.006); x.beginPath(); bolt.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.stroke();
        x.lineWidth = Math.max(3, w * 0.02); x.globalAlpha *= 0.25; x.stroke();
      }
      if (flash > 0.01) { x.globalAlpha = flash * 0.55; const g = x.createLinearGradient(0, 0, 0, roadY); g.addColorStop(0, '#b9cbff'); g.addColorStop(1, '#5a6a9a'); x.fillStyle = g; x.fillRect(0, 0, w, roadY); }
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    }
    function stepDrops(dt, now, v, enter) {
      const ww = waterC.width, wh = waterC.height, maxR = 15 * U, minR = 2 * U;
      // new drops land: how many, and how big, follow the rain
      spawnAcc += dt * (3 + 30 * rain * rain) * enter;
      while (spawnAcc > 1) { spawnAcc -= 1; const r = minR + Math.pow(rnd(), 3) * (maxR * 0.5 - minR) * (0.6 + 0.7 * rain); addDrop(rnd() * ww, rnd() * wh * 1.05 - wh * 0.05, r); }
      mistAcc += dt * (22 + 150 * rain) * enter;
      const mx = mistC.getContext('2d');
      while (mistAcc > 1) { mistAcc -= 1; const r = (0.9 + rnd() * rnd() * 2.2) * U; mx.drawImage(dropC, rnd() * ww - r, rnd() * wh - r, r * 2, r * 2); }
      // (canvas alpha is 8-bit: fade in steps, not by a tiny amount every frame)
      mx.globalCompositeOperation = 'destination-out';
      fadeAcc += dt; if (fadeAcc > 0.4) { mx.fillStyle = `rgba(0,0,0,${Math.min(1, fadeAcc * 0.035).toFixed(4)})`; mx.fillRect(0, 0, ww, wh); fadeAcc = 0; }
      mx.fillStyle = '#000';
      // moving drops: stick and slip, swell as they swallow others, leave a trail of droplets
      for (const d of drops) {
        if (d.v === 0 && d.r > 9 * U && rnd() < dt * (d.r - 9 * U) / (maxR - 9 * U) * 0.25) d.v = 30 * U;
        if (d.v > 0) {
          d.v += (d.r / maxR * 160 - 70) * U * dt;
          if (rnd() < dt * 0.5 && !d.run) d.v *= 0.35;
          if (d.v < 6 * U) { d.v = 0; d.run = 0; continue; }
          const dy = d.v * dt; d.y += dy; d.x += (R.noise1(d.wob + d.y * 0.04, 3) - 0.5) * dy * 0.5; d.dist += dy;
          mx.beginPath(); mx.arc(d.x, d.y, d.r * 0.85, 0, R.TAU); mx.fill();
          if (d.dist > d.r * 0.9) { d.dist = 0; const tr = d.r * (0.16 + rnd() * 0.18); if (tr > 0.8 * U) { addDrop(d.x + (rnd() - 0.5) * d.r * 0.3, d.y - d.r * 0.9, tr); d.r = Math.sqrt(Math.max(minR * minR, d.r * d.r - tr * tr * 0.5)); } }
        }
      }
      mx.globalCompositeOperation = 'source-over';
      // merge: the bigger drop swallows the smaller
      drops.sort((a, b) => a.y - b.y);
      for (let i = 0; i < drops.length; i++) {
        const a = drops[i]; if (a.dead) continue;
        for (let j = i + 1; j < drops.length; j++) {
          const b = drops[j]; if (b.y - a.y > maxR * 2.2) break; if (b.dead) continue;
          const dx = a.x - b.x, dy = a.y - b.y, rs = (a.r + b.r) * 0.62;
          if (dx * dx + dy * dy < rs * rs) {
            const big = a.r >= b.r ? a : b, sm = big === a ? b : a;
            big.r = Math.min(maxR * 1.35, Math.sqrt(a.r * a.r + b.r * b.r)); big.v = Math.max(a.v, b.v) + (big.v > 0 ? 10 * U : 0); if (sm.run) big.run = 1; sm.dead = 1;
          }
        }
      }
      for (let i = drops.length - 1; i >= 0; i--) if (drops[i].dead || drops[i].y - drops[i].r > wh) drops.splice(i, 1);
      if (drops.length > 320) { drops.sort((a, b) => a.r - b.r); drops.splice(0, drops.length - 320); }
      // paint the water map
      const x = waterC.getContext('2d'); x.clearRect(0, 0, ww, wh); x.drawImage(mistC, 0, 0);
      for (const d of drops) { const sy = 1 + Math.min(0.45, d.v / (260 * U)); x.drawImage(dropC, d.x - d.r, d.y - d.r * sy * 1.05, d.r * 2, d.r * 2 * sy); }
    }

    let enterT = 0, swapT = 9, lastClock = '', lastWx = '';
    resize(); loadCover();
    const hint = root.querySelector('.rw-hint');

    return {
      enter() { enterT = 0; },
      swap() { swapT = 0; loadCover(); },
      resize() { resize(); },
      frame(dt, now, v) {
        enterT += dt; swapT += dt;
        const r = cvEl.getBoundingClientRect();
        if (Math.abs(r.width - W) > 1 || Math.abs(r.height - H) > 1) resize();
        const enter = Math.min(1, enterT / 2), playing = v.playing, hot = R.reduced ? 0 : v.hot;
        // the rain swells and eases with the song's loudness, slowly
        const want = (playing ? 0.14 + 0.72 * Math.min(1, Math.pow(v.level * 1.15, 1.4)) + 0.3 * hot : 0.12);
        rain += (Math.min(1, want) - rain) * (1 - Math.exp(-dt / 2.4));
        if (hot > 0.6 && playing && !boltT && rnd() < dt * 0.06) lightning(false);
        flash *= Math.exp(-dt * 5.5); if (flash < 0.3 && flash > 0.2 && boltT > 0.15 && rnd() < 0.3) flash = 0.75;
        // fog grows back where it was wiped
        fogAcc += dt; if (fogAcc > 0.3) { const fx = fogC.getContext('2d'); fx.globalCompositeOperation = 'destination-out'; fx.fillStyle = `rgba(0,0,0,${Math.min(1, fogAcc * 0.07).toFixed(4)})`; fx.fillRect(0, 0, fogC.width, fogC.height); fx.globalCompositeOperation = 'source-over'; fogAcc = 0; }
        paintStreet(dt, now, v);
        stepDrops(dt, now, v, enter);
        if (ok && !G.lost) {
          const gl = G.gl;
          gl.viewport(0, 0, cvEl.width, cvEl.height); P.use();
          gl.activeTexture(gl.TEXTURE0); R.glk.upload(gl, tBg, bgC, false); gl.uniform1i(P.u.bg, 0);
          const hx = bgH.getContext('2d'), tx = bgT.getContext('2d'); hx.drawImage(bgC, 0, 0, bgH.width, bgH.height); tx.drawImage(bgH, 0, 0, bgT.width, bgT.height);
          gl.activeTexture(gl.TEXTURE3); R.glk.upload(gl, tBgT, bgT, false); gl.uniform1i(P.u.bgt, 3);
          gl.uniform2f(P.u.pxt, 1 / bgT.width, 1 / bgT.height);
          gl.activeTexture(gl.TEXTURE1); R.glk.upload(gl, tWater, waterC, false); gl.uniform1i(P.u.water, 1);
          gl.activeTexture(gl.TEXTURE2); R.glk.upload(gl, tFog, fogC, false); gl.uniform1i(P.u.fogm, 2);
          gl.uniform2f(P.u.px, 1 / bgC.width, 1 / bgC.height);
          gl.uniform1f(P.u.flash, flash); gl.uniform1f(P.u.fogAmt, 0.85 * enter + 0.15);
          gl.uniform1f(P.u.refr, 0.032); gl.uniform1f(P.u.aspect, W / H); gl.uniform1f(P.u.enter, enter);
          const t = pal ? pal.tint : [1, 1, 1]; gl.uniform3f(P.u.tint, t[0], t[1], t[2]);
          draw(P);
        } else if (ctx2) {
          ctx2.filter = 'blur(8px)'; ctx2.drawImage(bgC, 0, 0, cvEl.width, cvEl.height); ctx2.filter = 'none';
          ctx2.fillStyle = 'rgba(30,40,55,.35)'; ctx2.fillRect(0, 0, cvEl.width, cvEl.height);
          ctx2.globalAlpha = 0.6; ctx2.drawImage(waterC, 0, 0, cvEl.width, cvEl.height); ctx2.globalAlpha = 1;
        }
        // the clock in the corner, and what the rain is doing
        const d = new Date(), ck = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        if (ck !== lastClock) { lastClock = ck; clockEl.textContent = ck; }
        const wx = hot > 0.5 && playing ? '雷雨　THUNDERSTORM' : rain > 0.72 ? '大雨　HEAVY RAIN' : rain > 0.42 ? '小雨　RAIN' : '毛毛雨　DRIZZLE';
        if (wx !== lastWx) { lastWx = wx; wxEl.textContent = wx; }
        if (hint) hint.classList.toggle('on', enterT > 2.6 && enterT < 7.5 && !wrote);
      },
      destroy() { coverTok++; if (G && G.gl) { const x = G.gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } },
    };
  },
});
