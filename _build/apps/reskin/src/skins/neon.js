/* ===================== skin: 霓虹 HUD — the spectrum is a city skyline, strong beats glitch the screen ===================== */
R.skins.def({
  id: 'neon', name: '霓虹 HUD', group: '酷炫', en: 'NEON HUD',
  desc: '頻譜化成城市天際線，重拍時畫面故障閃爍',
  bloom: { s: 0.62, streak: 0.45, tint: '#22f3ff' }, hero: '.nx-hex', depth: [['.nx-rings', 1.5], ['.nx-hexo', 0.8], ['.nx-tag', 1.1]], trans: 'pixel',
  theme: { bg: '#07041a', fg: '#eaf6ff', accent: '#ff2bd6', accent2: '#22f3ff', ui: 'rgba(14,8,38,.97)', dock: 'rgba(20,6,46,.55)', dockfg: '#22f3ff' },
  enterMs: 1850,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="nxs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05030f"/><stop offset=".72" stop-color="#2b0a45"/><stop offset="1" stop-color="#05030f"/></linearGradient></defs><rect width="116" height="150" fill="url(#nxs)"/><polygon points="40,22 76,22 92,50 76,78 40,78 24,50" fill="none" stroke="#22f3ff" stroke-width="2.5"/><polygon points="45,30 71,30 83,50 71,70 45,70 33,50" fill="#ff2bd6" opacity=".35"/><g fill="#0d0620" stroke="#ff2bd6" stroke-width="1.6"><rect x="6" y="96" width="12" height="20"/><rect x="20" y="84" width="10" height="32"/><rect x="32" y="102" width="9" height="14"/><rect x="43" y="88" width="12" height="28"/><rect x="57" y="76" width="9" height="40"/><rect x="68" y="94" width="11" height="22"/><rect x="81" y="86" width="9" height="30"/><rect x="92" y="98" width="16" height="18"/></g><g fill="#ffe9a8"><rect x="22" y="90" width="2" height="2"/><rect x="26" y="96" width="2" height="2"/><rect x="59" y="82" width="2" height="2"/><rect x="62" y="92" width="2" height="2"/><rect x="46" y="94" width="2" height="2"/><rect x="84" y="92" width="2" height="2"/></g><path d="M0 116H116" stroke="#ff2bd6" stroke-width="2"/><g stroke="#ff2bd6" stroke-width="1" opacity=".5"><path d="M58 116L0 150M58 116L30 150M58 116L58 150M58 116L86 150M58 116L116 150M0 128H116M0 140H116"/></g></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 2100, dur: 0.035, v: 0.06, type: 'square', lp: 6000 }); },
    tick(s, t) { s.tone(t, { f: 3200, dur: 0.02, v: 0.04, type: 'square', lp: 7000 }); },
    toggle(s, t) { s.tone(t, { f: 1500, dur: 0.03, v: 0.06, type: 'square' }); s.tone(t + 0.05, { f: 2300, dur: 0.03, v: 0.06, type: 'square' }); },
    play(s, t) { s.notes(t, [s.hz(69), s.hz(76), s.hz(81), s.hz(88)], { dur: 0.09, v: 0.07, type: 'square', gap: 0.04, lp: 5000 }); },
    pause(s, t) { s.notes(t, [s.hz(88), s.hz(81), s.hz(76)], { dur: 0.08, v: 0.06, type: 'square', gap: 0.04, lp: 4500 }); },
    next(s, t) { s.noise(t, { f: 800, f2: 7000, dur: 0.18, v: 0.08, q: 4 }); s.tone(t, { f: 400, f2: 2400, dur: 0.14, v: 0.05, type: 'sawtooth', lp: 5000 }); },
    prev(s, t) { s.noise(t, { f: 7000, f2: 800, dur: 0.18, v: 0.08, q: 4 }); s.tone(t, { f: 2400, f2: 400, dur: 0.14, v: 0.05, type: 'sawtooth', lp: 5000 }); },
    enter(s, t) { s.tone(t, { f: 110, f2: 880, dur: 0.6, v: 0.07, type: 'sawtooth', lp: 3000, glide: 0.5 }); s.notes(t + 0.35, [s.hz(81), s.hz(84), s.hz(88), s.hz(93)], { dur: 0.12, v: 0.05, type: 'square', gap: 0.06, lp: 6000 }); s.noise(t, { f: 3000, dur: 0.3, v: 0.03, type: 'highpass' }); },
    open(s, t) { s.tone(t, { f: 900, f2: 1800, dur: 0.1, v: 0.05, type: 'square', lp: 5000 }); },
    close(s, t) { s.tone(t, { f: 1800, f2: 900, dur: 0.1, v: 0.05, type: 'square', lp: 5000 }); },
    ok(s, t) { s.notes(t, [s.hz(84), s.hz(91)], { dur: 0.1, v: 0.06, type: 'square', gap: 0.06, lp: 6000 }); },
  },
  mount(root, api) {
    const I = R.I;
    root.innerHTML = `<canvas class="nx-bg"></canvas><div class="nx-scan"></div>
      <div class="nx-hud">
        <div class="nx-top" data-ui><b>RESKIN</b><i>//</i>NEON<span class="nx-clock" data-nx="clock">--:--</span></div>
        <div class="nx-core">
          <svg class="nx-rings" viewBox="0 0 200 200" aria-hidden="true">
            <g class="rg rg1"><circle cx="100" cy="100" r="97" /></g>
            <g class="rg rg2"><circle cx="100" cy="100" r="91" /></g>
            <g class="rg rg3"><circle cx="100" cy="100" r="85" /></g>
            <g class="rg rg4"><path d="M100 6 A94 94 0 0 1 181 53" /><path d="M100 194 A94 94 0 0 1 19 147" /></g>
          </svg>
          <svg class="nx-hexo" viewBox="0 0 100 100" aria-hidden="true"><polygon points="25,6 75,6 100,50 75,94 25,94 0,50" /></svg>
          <div class="nx-hex"><img data-bind="cover" alt="" draggable="false"><i class="nx-sweep"></i></div>
          <span class="nx-tag tl">TRK <b data-bind="idx">00/00</b></span><span class="nx-tag tr">BPM <b data-bind="bpm">--</b></span>
          <span class="nx-tag bl">SIG <b class="nx-sig"><i></i><i></i><i></i><i></i><i></i></b></span><span class="nx-tag br">SYNC <b class="nx-sync">●</b></span>
        </div>
        <div class="nx-info" data-ui><div class="nx-title" data-bind="title"></div><div class="nx-artist"><span>&gt;&gt;</span> <span data-bind="artist"></span></div></div>
        <div class="nx-city"></div>
        <div class="nx-meta" data-ui><span data-bind="time">0:00</span><span class="nx-lv"><i></i></span><span data-bind="rem">-0:00</span></div>
        <div class="seek nx-seek" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div></div>
        ${R.ui.ctrl('nx-ctrl')}
      </div>
      <div class="nx-boot" aria-hidden="true"><p>&gt; RESKIN OS 1.0</p><p>&gt; AUDIO BUS LINK ........ OK</p><p>&gt; SKIN: NEON HUD ........ LOADED</p><p class="go">&gt; WAKE UP, 痞子葳_</p></div>`;
    const cv = api.canvas(root.querySelector('.nx-bg'), { dprMax: 1.6, alpha: false });
    const city = root.querySelector('.nx-city');
    const clock = root.querySelector('[data-nx="clock"]');
    let box = null;
    const measure = () => { const r = city.getBoundingClientRect(); box = r.height > 20 ? { top: r.top, bottom: r.bottom } : null; };
    measure();
    // a fixed city: per-building width, window pattern, roof colour
    const rnd = R.rng(20261113);
    const B = [], BG = [];
    for (let i = 0; i < 32; i++) B.push({ w: 0.72 + rnd() * 0.5, base: 0.12 + rnd() * 0.22, seed: Math.floor(rnd() * 1e6), roof: rnd() < 0.55 ? '#ff2bd6' : '#22f3ff', ant: rnd() < 0.22, h: 0, win: null, cols: 0 });
    for (let i = 0; i < 22; i++) BG.push({ x: rnd(), w: 0.03 + rnd() * 0.05, h: 0.25 + rnd() * 0.55 });
    const stars = []; for (let i = 0; i < 90; i++) stars.push({ x: rnd(), y: rnd() * 0.75, r: rnd() < 0.15 ? 1.4 : 0.8, p: rnd() * 6 });
    let enterT = 0, glitch = 0, gridOff = 0, lastClock = 0;
    const hash = (a, b, c) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296; };

    api.beat((s) => {
      if (s > 0.62 && api.flash()) { glitch = 0.18; root.classList.add('glitch'); api.later(() => root.classList.remove('glitch'), 150); }
      const sy = root.querySelector('.nx-sync'); if (sy) { sy.classList.remove('hit'); void sy.offsetWidth; sy.classList.add('hit'); }
    });
    return {
      enter() { enterT = 0; },
      resize() { cv.resize(); measure(); },
      frame(dt, t, v) {
        enterT += dt;
        const { ctx, w, h } = cv;
        const rise = Math.min(1, Math.max(0, (enterT - 0.45) / 0.7));
        const horizon = box ? box.bottom : h * 0.8, cityH = box ? Math.max(60, box.bottom - box.top) : h * 0.45;
        // sky
        const g = ctx.createLinearGradient(0, 0, 0, horizon);
        g.addColorStop(0, '#04020d'); g.addColorStop(0.55, '#12062b'); g.addColorStop(1, '#3a0b4f');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, horizon);
        ctx.fillStyle = '#05020c'; ctx.fillRect(0, horizon, w, h - horizon);
        ctx.fillStyle = '#c8e6ff';
        for (const s of stars) { ctx.globalAlpha = Math.max(0, Math.min(1, 0.35 + 0.35 * Math.sin(t * 1.7 + s.p) + v.high * 0.3)); ctx.fillRect(s.x * w, s.y * horizon, s.r, s.r); }
        ctx.globalAlpha = 1;
        // horizon haze
        const hz = ctx.createLinearGradient(0, horizon - cityH * 0.9, 0, horizon);
        hz.addColorStop(0, 'rgba(255,43,214,0)'); hz.addColorStop(1, `rgba(255,43,214,${0.18 + v.bass * 0.25})`);
        ctx.fillStyle = hz; ctx.fillRect(0, horizon - cityH * 0.9, w, cityH * 0.9);
        // far city
        ctx.fillStyle = '#1a0a33';
        for (const b of BG) { const bh = b.h * cityH * 0.7 * rise; ctx.fillRect(b.x * w, horizon - bh, b.w * w, bh); }
        // near city = spectrum
        const n = B.length, unit = w / B.reduce((s, b) => s + b.w, 0);
        let x = 0;
        const low = api.low();
        for (let i = 0; i < n; i++) {
          const b = B[i], bw = b.w * unit;
          const band = v.bands[Math.min(31, Math.floor(i * 0.9) + 1)];
          const target = (b.base + band * 0.82) * cityH * rise;
          b.h += (target - b.h) * Math.min(1, dt * 14);
          const bh = Math.max(4, b.h), top = horizon - bh, gx = x + 1, gw = bw - 2;
          ctx.fillStyle = '#0c0520'; ctx.fillRect(gx, top, gw, bh);
          // windows: a fixed list per building sorted by how easily each one lights up,
          // so the lit ones are always a prefix of the list (one colour change per group)
          if (gw > 5) {
            const cols = Math.max(1, Math.floor((gw - 3) / 4)), rows = Math.floor((bh - 6) / 5);
            if (!b.win || b.cols !== cols) {
              b.cols = cols; b.win = [];
              for (let r = 0; r < 60; r++) for (let c = 0; c < cols; c++) b.win.push([hash(b.seed, r, c), r, c]);
              b.win.sort((p, q) => p[0] - q[0]);
            }
            const lit = 0.18 + band * 0.7, W = b.win;
            let k = 0;
            ctx.fillStyle = '#22f3ff';
            for (; k < W.length && W[k][0] < 0.04; k++) { const [, r, c] = W[k]; if (r < rows && (!low || r % 2 === 0)) ctx.fillRect(gx + 2 + c * 4, top + 4 + r * 5, 2, 2); }
            ctx.fillStyle = '#ff7ae8';
            for (; k < W.length && W[k][0] < 0.08; k++) { const [, r, c] = W[k]; if (r < rows && (!low || r % 2 === 0)) ctx.fillRect(gx + 2 + c * 4, top + 4 + r * 5, 2, 2); }
            ctx.fillStyle = `rgba(255,233,168,${(0.55 + band * 0.45).toFixed(2)})`;
            for (; k < W.length && W[k][0] < lit; k++) { const [, r, c] = W[k]; if (r < rows && (!low || r % 2 === 0)) ctx.fillRect(gx + 2 + c * 4, top + 4 + r * 5, 2, 2); }
          }
          // neon roof
          ctx.fillStyle = R.color.rgba(b.roof, 0.25 + band * 0.5); ctx.fillRect(gx - 1, top - 2, gw + 2, 5);
          ctx.fillStyle = b.roof; ctx.fillRect(gx, top, gw, 1.5);
          if (b.ant) { ctx.fillStyle = '#5a3a7a'; ctx.fillRect(gx + gw / 2, top - 14, 1, 14); ctx.fillStyle = v.beat > 0.4 ? '#ff4060' : '#661826'; ctx.fillRect(gx + gw / 2 - 1.5, top - 16, 4, 3); }
          // reflection
          ctx.fillStyle = R.color.rgba(b.roof, 0.08 + band * 0.12);
          ctx.fillRect(gx, horizon + 2, gw, Math.min(bh * 0.35, (h - horizon) * 0.5));
          x += bw;
        }
        // horizon line + grid floor
        ctx.fillStyle = `rgba(255,43,214,${0.35 + v.bass * 0.4})`; ctx.fillRect(0, horizon - 1, w, 4);
        ctx.fillStyle = '#ff6af0'; ctx.fillRect(0, horizon, w, 1.2);
        gridOff = (gridOff + dt * ((v.bpm || 110) / 60) * (v.playing ? 1 : 0.15)) % 1;
        ctx.strokeStyle = `rgba(255,43,214,${0.25 + v.level * 0.25})`; ctx.lineWidth = 1;
        ctx.beginPath();
        const vx = w / 2, fh = h - horizon;
        for (let k = -10; k <= 10; k++) { ctx.moveTo(vx + k * w * 0.02, horizon); ctx.lineTo(vx + k * w * 0.32, h); }
        for (let k = 0; k < 9; k++) { const z = (k + 1 - gridOff) / 9; const y = horizon + fh * z * z; ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();
        // glitch slices
        if (glitch > 0) {
          glitch -= dt;
          const d = cv.dpr;
          for (let k = 0; k < 3; k++) {
            const sy = Math.random() * h, sh = 6 + Math.random() * 26, off = (Math.random() - 0.5) * 34;
            try { ctx.drawImage(cv.cv, 0, sy * d, cv.cv.width, sh * d, off, sy, w, sh); } catch (e) { /* ignore */ }
          }
          ctx.fillStyle = 'rgba(34,243,255,.06)'; ctx.fillRect(0, Math.random() * h, w, 2);
        }
        root.style.setProperty('--lv', v.level.toFixed(3));
        root.style.setProperty('--bt', v.beat.toFixed(3));
        if (t - lastClock > 1) { lastClock = t; const d = new Date(); clock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
      },
    };
  },
});
