/* ===================== skin: 黑膠唱盤 — spin it, drop the needle, scratch the record to seek ===================== */
R.skins.def({
  id: 'vinyl', punch: 0.5, name: '黑膠唱盤', group: '復古', en: 'TURNTABLE',
  desc: '手指撥唱片就能快轉倒轉，唱臂跟著進度走',
  bloom: { s: 0.22, th: 0.82 }, trans: 'shatter',
  theme: { bg: '#2a170e', fg: '#f3e6d3', accent: '#d9a441', accent2: '#e2583e', ui: 'rgba(36,22,14,.98)', dock: 'rgba(30,16,8,.55)', dockfg: '#f0d9a8' },
  enterMs: 1500,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="vnw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a4528"/><stop offset="1" stop-color="#3a2012"/></linearGradient></defs><rect width="116" height="150" fill="url(#vnw)"/><g stroke="#2a150b" stroke-width="1" opacity=".35"><path d="M0 20q58 10 116 0M0 46q58-8 116 4M0 104q58 10 116-2M0 130q58-6 116 4"/></g><circle cx="54" cy="66" r="44" fill="#c9ccd1"/><circle cx="54" cy="66" r="41" fill="#111"/><g fill="none" stroke="#2b2b2b" stroke-width="1"><circle cx="54" cy="66" r="36"/><circle cx="54" cy="66" r="31"/><circle cx="54" cy="66" r="26"/><circle cx="54" cy="66" r="21"/></g><path d="M54 66L22 38A42 42 0 0 1 40 26z" fill="#fff" opacity=".12"/><circle cx="54" cy="66" r="14" fill="#e2583e"/><circle cx="54" cy="66" r="2.5" fill="#ddd"/><circle cx="100" cy="22" r="7" fill="#c9ccd1" stroke="#555"/><path d="M100 22L84 74l-6 6" stroke="#d6d9de" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="72" y="76" width="10" height="7" rx="1.5" fill="#333" transform="rotate(30 77 79)"/><rect x="14" y="122" width="40" height="14" rx="3" fill="#d6d9de" stroke="#555"/><circle cx="74" cy="129" r="5" fill="#59d36b"/></svg>`,
  sfx: {
    tap(s, t) { s.noise(t, { f: 2600, dur: 0.025, v: 0.08, type: 'highpass' }); s.tone(t, { f: 900, dur: 0.03, v: 0.04, type: 'square', lp: 2500 }); },
    tick(s, t) { s.noise(t, { f: 3500, dur: 0.015, v: 0.05, type: 'highpass' }); },
    toggle(s, t) { s.noise(t, { f: 1800, dur: 0.035, v: 0.1, q: 2 }); s.tone(t, { f: 220, f2: 140, dur: 0.05, v: 0.08, type: 'square', lp: 900 }); },
    play(s, t) { s.tone(t + 0.25, { f: 70, f2: 45, dur: 0.18, v: 0.2 }); s.noise(t + 0.25, { f: 1200, dur: 0.12, v: 0.08 }); for (let i = 0; i < 8; i++) s.noise(t + 0.3 + Math.random() * 0.5, { f: 3000 + Math.random() * 3000, dur: 0.008, v: 0.08, type: 'highpass' }); },
    pause(s, t) { s.tone(t, { f: 300, f2: 60, dur: 0.6, v: 0.05, type: 'sawtooth', lp: 600 }); },
    next(s, t) { s.noise(t, { f: 900, f2: 3000, dur: 0.12, v: 0.08, q: 2 }); s.noise(t + 0.13, { f: 3000, f2: 900, dur: 0.12, v: 0.08, q: 2 }); },
    prev(s, t) { s.noise(t, { f: 3000, f2: 900, dur: 0.12, v: 0.08, q: 2 }); s.noise(t + 0.13, { f: 900, f2: 3000, dur: 0.12, v: 0.08, q: 2 }); },
    scratch(s, t) { s.noise(t, { f: 700 + Math.random() * 1600, dur: 0.06, v: 0.07, q: 3 }); },
    enter(s, t) { s.tone(t + 0.35, { f: 80, f2: 40, dur: 0.25, v: 0.22 }); s.noise(t + 0.35, { f: 900, dur: 0.15, v: 0.08 }); for (let i = 0; i < 10; i++) s.noise(t + 0.6 + i * 0.07, { f: 2500 + Math.random() * 4000, dur: 0.008, v: 0.07, type: 'highpass' }); },
    open(s, t) { s.noise(t, { f: 2000, dur: 0.03, v: 0.07 }); },
    close(s, t) { s.noise(t, { f: 1500, dur: 0.03, v: 0.07 }); },
    ok(s, t) { s.notes(t, [s.hz(76), s.hz(81)], { dur: 0.2, v: 0.06, type: 'triangle', gap: 0.08 }); },
  },
  mount(root, api) {
    const I = R.I;
    root.innerHTML = `<div class="vn-wood"></div>
      <div class="vn-wrap">
        <div class="vn-brand" data-ui><b>RESKIN</b> AUDIO <span>DD-33 · DIRECT DRIVE</span></div>
        <div class="vn-deck">
          <canvas class="vn-cv"></canvas>
          <div class="vn-hit" aria-label="撥動唱片快轉倒轉"></div>
          <svg class="vn-arm" viewBox="0 0 100 100" aria-hidden="true">
            <g class="vn-armg">
              <circle cx="88" cy="12" r="6.5" class="base"/><circle cx="88" cy="12" r="3.6" class="hub"/>
              <rect x="85.6" y="-3" width="4.8" height="8" rx="1.2" class="cw"/>
              <path d="M88 12 L88 62 L84 72" class="tube"/>
              <path d="M88 12 L88 62 L84 72" class="tube hi"/>
              <g transform="translate(84 72) rotate(25)"><rect x="-3.2" y="-1" width="6.4" height="9" rx="1" class="head"/><rect x="-1.2" y="7" width="2.4" height="2.4" class="stylus"/></g>
            </g>
          </svg>
          <div class="vn-rest" aria-hidden="true"></div>
        </div>
        <div class="vn-plate" data-ui><div class="vn-t" data-bind="title"></div><div class="vn-a" data-bind="artist"></div></div>
        <div class="vn-panel" data-ui>
          <div class="vn-vu"><i class="nd"></i><b>L</b></div>
          <div class="seek vn-seek" data-seek><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div><div class="seek-times"><span data-bind="time">0:00</span><span data-bind="dur">0:00</span></div></div>
          <div class="vn-vu"><i class="nd"></i><b>R</b></div>
        </div>
        <div class="vn-ctrl" data-ui>
          <button type="button" class="vn-sw c-shuf" data-act="shuffle" aria-label="隨機播放"><i></i><span>SHUFFLE</span></button>
          <button type="button" class="vn-rb c-prev" data-act="prev" aria-label="上一首">${I.prev}</button>
          <button type="button" class="vn-start c-play" data-act="toggle" aria-label="播放／暫停"><i class="led"></i><span>START·STOP</span></button>
          <button type="button" class="vn-rb c-next" data-act="next" aria-label="下一首">${I.next}</button>
          <button type="button" class="vn-sw c-rep" data-act="repeat" aria-label="循環播放"><i></i><span class="rp">REPEAT</span></button>
          <button type="button" class="vn-sw vn-crk" data-vn="crackle" aria-label="黑膠沙沙聲"><i></i><span>CRACKLE</span></button>
        </div>
      </div>`;
    const cv = api.canvas(root.querySelector('.vn-cv'));
    const deck = root.querySelector('.vn-deck'), hit = root.querySelector('.vn-hit'), armG = root.querySelector('.vn-armg');
    const vu = Array.from(root.querySelectorAll('.vn-vu .nd'));
    const crkBtn = root.querySelector('[data-vn="crackle"]');
    let disc = null, discKey = '', art = null, ang = 0, spd = 0, enterT = 9, scratch = null, armShown = false, armA = -32, armLift = 0;
    const VU = [{ a: -45, v: 0 }, { a: -45, v: 0 }];
    // tonearm geometry (viewBox units): pivot (88,12); stylus = pivot + rotate(path end)
    const PIV = [88, 12], TIP = [84 - 9 * Math.sin(25 * Math.PI / 180), 72 + 9 * Math.cos(25 * Math.PI / 180)];
    const tipAt = (deg) => { const a = (deg * Math.PI) / 180, dx = TIP[0] - PIV[0], dy = TIP[1] - PIV[1]; return [PIV[0] + dx * Math.cos(a) - dy * Math.sin(a), PIV[1] + dx * Math.sin(a) + dy * Math.cos(a)]; };
    const angleFor = (r) => { let best = 0, bd = 1e9; for (let d = -10; d <= 45; d += 0.25) { const p = tipAt(d); const dd = Math.abs(Math.hypot(p[0] - 50, p[1] - 50) - r); if (dd < bd) { bd = dd; best = d; } } return best; };
    const A_OUT = angleFor(43.5), A_IN = angleFor(21), A_REST = -26;

    function buildDisc(size) {
      const n = Math.max(64, Math.round(size)), c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d');
      const r = n / 2;
      x.fillStyle = '#0c0c0d'; x.beginPath(); x.arc(r, r, r * 0.995, 0, R.TAU); x.fill();
      for (let k = 0; k < 140; k++) { const rr = r * (0.42 + (k / 140) * 0.56); x.strokeStyle = k % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.5)'; x.lineWidth = Math.max(0.6, n / 900); x.beginPath(); x.arc(r, r, rr, 0, R.TAU); x.stroke(); }
      for (const g of [0.55, 0.66, 0.78, 0.88]) { x.strokeStyle = 'rgba(255,255,255,.09)'; x.lineWidth = n / 300; x.beginPath(); x.arc(r, r, r * g, 0, R.TAU); x.stroke(); }
      x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = n / 200; x.beginPath(); x.arc(r, r, r * 0.985, 0, R.TAU); x.stroke();
      const lr = r * 0.39;
      x.save(); x.beginPath(); x.arc(r, r, lr, 0, R.TAU); x.clip();
      if (art) x.drawImage(art, r - lr, r - lr, lr * 2, lr * 2); else { x.fillStyle = '#e2583e'; x.fillRect(r - lr, r - lr, lr * 2, lr * 2); }
      const lg = x.createRadialGradient(r, r, lr * 0.2, r, r, lr); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,.25)'); x.fillStyle = lg; x.fillRect(r - lr, r - lr, lr * 2, lr * 2);
      x.restore();
      x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = n / 250; x.beginPath(); x.arc(r, r, lr, 0, R.TAU); x.stroke();
      return c;
    }
    const loadArt = (t) => { art = null; discKey = ''; if (t) api.coverImage(t).then((im) => { if (api.track() && api.track().id === t.id) { art = im; discKey = ''; } }); };

    // scratch: drag the record round to seek (1 turn = 8 seconds)
    let C = { x: 0, y: 0, r: 1 };
    const measure = () => { const r = deck.getBoundingClientRect(); C = { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width * 0.46 }; };
    measure();
    hit.addEventListener('pointerdown', (e) => {
      if (!R.player.current()) return;
      const a = Math.atan2(e.clientY - C.y, e.clientX - C.x);
      scratch = { a, tot: 0, t0: R.player.time(), last: performance.now() };
      try { hit.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      e.preventDefault();
    });
    hit.addEventListener('pointermove', (e) => {
      if (!scratch) return;
      const a = Math.atan2(e.clientY - C.y, e.clientX - C.x); let d = a - scratch.a; if (d > Math.PI) d -= R.TAU; if (d < -Math.PI) d += R.TAU;
      scratch.a = a; scratch.tot += d; ang += d;
      const now = performance.now(); if (Math.abs(d) > 0.05 && now - scratch.last > 70) { scratch.last = now; api.sfx('scratch'); }
      const dur = R.player.duration(); if (dur) R.bus.emit('scrub', Math.max(0, Math.min(1, (scratch.t0 + (scratch.tot / R.TAU) * 8) / dur)));
    });
    const endScratch = (ok) => {
      if (!scratch) return; const s = scratch; scratch = null;
      if (ok && Math.abs(s.tot) > 0.05) { R.player.seek(s.t0 + (s.tot / R.TAU) * 8); }
      R.bus.emit('scrub', null);
    };
    hit.addEventListener('pointerup', () => endScratch(true)); hit.addEventListener('pointercancel', () => endScratch(false));

    // crackle: a quiet looped noise bed through the interface-sound context (never touches the music)
    let crk = null;
    const crkOn = () => !!R.settings.get('vinylCrackle');
    const syncCrackle = () => {
      const want = crkOn() && R.player.isPlaying() && !document.hidden && R.settings.get('sfx');
      crkBtn.classList.toggle('on', crkOn());
      if (want && !crk) {
        const c = R.sfx.ctx(); if (!c || c.state !== 'running') return;
        const n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
        let lp = 0; for (let i = 0; i < n; i++) { lp += 0.05 * ((Math.random() * 2 - 1) - lp); d[i] = lp * 0.25 + (Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.9 : 0); }
        const src = c.createBufferSource(); src.buffer = b; src.loop = true; const g = c.createGain(); g.gain.value = 0.05; src.connect(g); g.connect(c.destination); src.start();
        crk = { src, g };
      } else if (!want && crk) { try { crk.src.stop(); } catch (e) { /* ignore */ } crk = null; }
    };
    crkBtn.addEventListener('click', () => { R.settings.set('vinylCrackle', !crkOn()); api.sfx('toggle'); syncCrackle(); });
    api.on('state', syncCrackle);
    const onVis = () => syncCrackle();
    document.addEventListener('visibilitychange', onVis);
    crkBtn.classList.toggle('on', crkOn());

    return {
      onTrack(t) { loadArt(t); },
      onState() { syncCrackle(); },
      enter() { enterT = 0; armShown = false; },
      swap() { enterT = 0; },
      resize() { cv.resize(); measure(); discKey = ''; },
      destroy() { if (crk) { try { crk.src.stop(); } catch (e) { /* ignore */ } crk = null; } document.removeEventListener('visibilitychange', onVis); },
      frame(dt, t, v) {
        enterT += dt;
        const { ctx, w, h } = cv; cv.clear();
        const cx = w / 2, cy = h / 2, PR = Math.min(w, h) / 2 * 0.98, RR = PR * 0.94;
        const playing = v.playing;
        const target = scratch ? 0 : playing ? (33.333 / 60) * R.TAU : 0;
        spd += (target - spd) * Math.min(1, dt * (playing ? 1.6 : 2.4));
        if (!scratch) ang += spd * dt;
        // platter + strobe dots
        ctx.fillStyle = '#1b1b1d'; ctx.beginPath(); ctx.arc(cx, cy + PR * 0.025, PR, 0, R.TAU); ctx.fill();
        const pg = ctx.createLinearGradient(cx - PR, cy - PR, cx + PR, cy + PR); pg.addColorStop(0, '#e9ecef'); pg.addColorStop(0.5, '#9aa0a8'); pg.addColorStop(1, '#d5d9de');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, cy, PR, 0, R.TAU); ctx.fill();
        const dots = 72, flash = Math.min(1, 0.3 + v.pump * 0.7 + v.down * 0.3);
        ctx.fillStyle = `rgba(40,40,44,${0.55 + flash * 0.4})`;
        for (let i = 0; i < dots; i++) { const a = ang + (i / dots) * R.TAU; const rx = cx + Math.cos(a) * PR * 0.972, ry = cy + Math.sin(a) * PR * 0.972; ctx.fillRect(rx - 1.2, ry - 1.2, 2.4, 2.4); }
        // record (drops in)
        const drop = R.ease.out(Math.min(1, enterT / 0.55));
        const sc = 1 + (1 - drop) * 0.14;
        const size = Math.round(RR * 2 * cv.dpr);
        const key = size + '|' + (art ? art.src : '-');
        if (key !== discKey) { disc = buildDisc(size); discKey = key; }
        ctx.save(); ctx.globalAlpha = drop;
        ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 18 * (1 - drop) + 6; ctx.shadowOffsetY = 6 * sc;
        ctx.translate(cx, cy); ctx.rotate(ang); ctx.scale(sc, sc);
        ctx.drawImage(disc, -RR, -RR, RR * 2, RR * 2);
        ctx.restore();
        // light sheen (does not rotate)
        if (ctx.createConicGradient) {
          const sh = ctx.createConicGradient(-0.9, cx, cy);
          sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.06, 'rgba(255,255,255,.13)'); sh.addColorStop(0.12, 'rgba(255,255,255,0)');
          sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(0.56, 'rgba(255,255,255,.09)'); sh.addColorStop(0.62, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, RR * sc, 0, R.TAU); ctx.arc(cx, cy, RR * 0.39 * sc, 0, R.TAU, true); ctx.clip(); ctx.fillStyle = sh; ctx.fillRect(cx - RR, cy - RR, RR * 2, RR * 2); ctx.restore();
        }
        // spindle
        ctx.fillStyle = '#d9dde2'; ctx.beginPath(); ctx.arc(cx, cy, Math.max(3, RR * 0.025), 0, R.TAU); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(cx + 1, cy + 1, Math.max(1.5, RR * 0.012), 0, R.TAU); ctx.fill();
        // tonearm
        const has = !!R.player.current();
        let want = A_REST;
        if (has && enterT > 0.7) want = A_OUT + (A_IN - A_OUT) * Math.min(1, v.progress);
        armA += (want - armA) * Math.min(1, dt * (Math.abs(want - armA) > 3 ? 3 : 12));
        armLift += ((has && !playing ? 1 : has ? 0 : 0.6) - armLift) * Math.min(1, dt * 5);
        armG.style.transform = `rotate(${armA.toFixed(2)}deg)`;
        deck.style.setProperty('--lift', armLift.toFixed(3));
        if (!armShown && enterT > 0.7 && has && playing) { armShown = true; }
        // VU meters
        const lv = [v.level * 0.86 + v.bass * 0.1 + v.kickE * 0.12, v.level * 0.84 + v.high * 0.12 + v.snareE * 0.12];
        for (let i = 0; i < 2; i++) { const m = VU[i]; const tg = -45 + 90 * Math.min(1.05, lv[i] * (playing ? 1 : 0)); m.v += ((tg - m.a) * 120 - m.v * 14) * dt; m.a += m.v * dt; vu[i].style.transform = `rotate(${Math.max(-48, Math.min(50, m.a)).toFixed(1)}deg)`; }
      },
    };
  },
});
