/* ===================== skin: 星雲 — a spiral galaxy orbits the album; drums blow it outward ===================== */
R.skins.def({
  id: 'nebula', name: '星雲', group: '酷炫', en: 'NEBULA',
  desc: '星雲粒子繞著封面轉，鼓點一下就炸開',
  theme: { bg: '#03030c', fg: '#eef2ff', accent: '#9d8bff', accent2: '#3ff0d0', ui: 'rgba(10,10,28,.97)', dock: 'rgba(20,18,50,.45)', dockfg: '#dcd6ff' },
  enterMs: 2150,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><radialGradient id="nbg" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#ffe6f6"/><stop offset=".12" stop-color="#ff7ac8"/><stop offset=".35" stop-color="#5a3fc0" stop-opacity=".8"/><stop offset="1" stop-color="#03030c" stop-opacity="0"/></radialGradient></defs><rect width="116" height="150" fill="#03030c"/><circle cx="58" cy="62" r="58" fill="url(#nbg)"/><g fill="#bfe9ff"><circle cx="20" cy="20" r=".9"/><circle cx="96" cy="30" r="1.1"/><circle cx="12" cy="110" r=".8"/><circle cx="102" cy="128" r="1"/><circle cx="80" cy="12" r=".7"/></g><g fill="none" stroke-linecap="round"><path d="M58 62c14-2 22 10 16 22s-30 12-40 0" stroke="#9d8bff" stroke-width="3" opacity=".8"/><path d="M58 62c-14 2-22-10-16-22s30-12 40 0" stroke="#3ff0d0" stroke-width="3" opacity=".8"/></g><circle cx="58" cy="62" r="9" fill="#fff"/><path d="M30 128h56" stroke="#eef2ff" stroke-width="2" opacity=".6"/></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 2600, dur: 0.12, v: 0.03, type: 'sine' }); s.tone(t + 0.06, { f: 3900, dur: 0.12, v: 0.015 }); },
    tick(s, t) { s.tone(t, { f: 3100, dur: 0.06, v: 0.02 }); },
    toggle(s, t) { s.notes(t, [s.hz(88), s.hz(95)], { dur: 0.25, v: 0.03, gap: 0.05 }); },
    play(s, t) { [76, 83, 88, 95].forEach((m, i) => { s.tone(t + i * 0.05, { f: s.hz(m), dur: 0.9, v: 0.03, a: 0.04 }); s.tone(t + 0.3 + i * 0.05, { f: s.hz(m), dur: 0.7, v: 0.012, a: 0.04 }); }); },
    pause(s, t) { [95, 88, 83].forEach((m, i) => s.tone(t + i * 0.06, { f: s.hz(m), dur: 0.6, v: 0.025, a: 0.03 })); },
    next(s, t) { s.noise(t, { f: 300, f2: 4000, dur: 0.45, v: 0.06, type: 'lowpass', q: 2, a: 0.15 }); s.tone(t + 0.3, { f: s.hz(91), dur: 0.6, v: 0.03 }); },
    prev(s, t) { s.noise(t, { f: 4000, f2: 300, dur: 0.45, v: 0.06, type: 'lowpass', q: 2, a: 0.15 }); s.tone(t + 0.3, { f: s.hz(84), dur: 0.6, v: 0.03 }); },
    enter(s, t) { s.noise(t, { f: 150, f2: 6000, dur: 1.0, v: 0.08, type: 'bandpass', q: 1.5, a: 0.6 }); [64, 71, 76, 83, 88].forEach((m, i) => s.tone(t + 0.7 + i * 0.07, { f: s.hz(m), dur: 1.4, v: 0.025, a: 0.08 })); },
    open(s, t) { s.tone(t, { f: 1800, f2: 2600, dur: 0.25, v: 0.025 }); },
    close(s, t) { s.tone(t, { f: 2600, f2: 1800, dur: 0.25, v: 0.025 }); },
    ok(s, t) { s.notes(t, [s.hz(88), s.hz(95), s.hz(100)], { dur: 0.5, v: 0.03, gap: 0.07 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="nb-cv"></canvas>
      <div class="nb-core"><svg class="nb-ring" viewBox="0 0 100 100" data-ui><circle class="tr" cx="50" cy="50" r="48"/><circle class="pg" cx="50" cy="50" r="48" transform="rotate(-90 50 50)"/><circle class="kn" cx="50" cy="2" r="2.2"/></svg><div class="nb-art"><img data-bind="cover" alt="" draggable="false"></div></div>
      <div class="nb-info" data-ui><div class="nb-t" data-bind="title"></div><div class="nb-a" data-bind="artist"></div><div class="nb-time"><span data-bind="time">0:00</span><i></i><span data-bind="dur">0:00</span></div></div>
      ${R.ui.ctrl('nb-ctrl')}`;
    const cv = api.canvas(root.querySelector('.nb-cv'), { dprMax: 1.75, alpha: false });
    const core = root.querySelector('.nb-core'), ring = root.querySelector('.nb-ring'), pg = ring.querySelector('.pg'), kn = ring.querySelector('.kn');
    const CIRC = 2 * Math.PI * 48;
    let C = { x: 0, y: 0, r: 100 };
    const measure = () => { const r = core.getBoundingClientRect(); C = { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }; };
    measure();
    const rnd = R.rng(777);
    const lowQ = api.low();
    const NP = lowQ ? 650 : 1400;
    const P = [];
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(R.TAU * rnd());
    for (let i = 0; i < NP; i++) {
      let r, th;
      if (i % 10 < 7) { const arm = i % 2; r = Math.pow(rnd(), 0.85); th = arm * Math.PI + Math.log(r + 0.06) * 2.3 + gauss() * (0.16 + r * 0.42); }
      else { r = Math.pow(rnd(), 0.7); th = rnd() * R.TAU; }
      const bin = r < 0.18 ? 0 : r < 0.42 ? 1 : r < 0.7 ? 2 : 3;
      P.push({ r, th, w: 0.3 / (r + 0.25), z: gauss() * 0.025 * (1 - r * 0.5), s: rnd() < 0.06 ? 2.6 : 0.8 + rnd() * 1.3, bin });
    }
    const BINS = ['rgba(255,236,248,', 'rgba(255,138,208,', 'rgba(157,139,255,', 'rgba(79,227,255,'];
    const stars = []; for (let i = 0; i < (lowQ ? 120 : 240); i++) stars.push({ x: rnd(), y: rnd(), z: 0.2 + rnd() * 0.8, p: rnd() * 6 });
    const cloudCv = document.createElement('canvas');
    const clouds = [['#7b5cff', 0.0], ['#2ee6c5', 1.7], ['#ff5fb0', 3.1], ['#3646ff', 4.4], ['#9d8bff', 5.6]];
    let burst = 0, enterT = 9, rot = 0, drag = null, jumpT = 9;
    api.beat((s) => { burst = Math.min(1.4, burst + s * (s > 0.5 ? 0.9 : 0.4)); });
    // drag along the ring to seek
    const fracAt = (e) => { const a = Math.atan2(e.clientY - C.y, e.clientX - C.x) + Math.PI / 2; return ((a / R.TAU) % 1 + 1) % 1; };
    ring.addEventListener('pointerdown', (e) => { if (!R.player.current()) return; drag = fracAt(e); try { ring.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } R.bus.emit('scrub', drag); e.preventDefault(); });
    ring.addEventListener('pointermove', (e) => { if (drag == null) return; drag = fracAt(e); R.bus.emit('scrub', drag); });
    const end = (ok) => { if (drag == null) return; const f = drag; drag = null; if (ok) { const d = R.player.duration(); if (d) R.player.seek(f * d); api.sfx('tick'); } R.bus.emit('scrub', null); };
    ring.addEventListener('pointerup', () => end(true)); ring.addEventListener('pointercancel', () => end(false));
    return {
      enter() { enterT = 0; },
      swap() { jumpT = 0; },
      resize() { cv.resize(); measure(); },
      frame(dt, t, v) {
        enterT += dt; jumpT += dt;
        const { ctx, w, h } = cv;
        // warp streaks: when the skin opens, and a short jump between songs
        const warp = Math.max(0, 1 - enterT / 1.1, jumpT < 0.9 ? Math.sin((jumpT / 0.9) * Math.PI) * 0.75 : 0);
        const inE = R.ease.out(Math.min(1, enterT / 1.5));
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(3,3,12,${warp > 0 ? 0.55 : 1})`; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';
        // stars (streaks during warp-in)
        for (const s of stars) {
          const x = s.x * w, y = s.y * h;
          if (warp > 0) {
            const dx = x - C.x, dy = y - C.y; const k = warp * 0.35 * s.z;
            ctx.strokeStyle = `rgba(200,220,255,${0.6 * s.z})`; ctx.lineWidth = s.z * 1.3;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dx * k, y - dy * k); ctx.stroke();
          } else {
            const a = (0.25 + 0.5 * s.z) * (0.7 + 0.3 * Math.sin(t * 2 + s.p)) + v.high * 0.3 * s.z;
            ctx.fillStyle = `rgba(210,225,255,${a})`; ctx.fillRect(x, y, s.z * 1.5, s.z * 1.5);
          }
        }
        // nebula clouds: painted small, then stretched once (soft anyway, and far cheaper on fill rate)
        const span = Math.max(w, h), q = 0.25;
        const cw = Math.max(8, Math.round(w * q)), chh = Math.max(8, Math.round(h * q));
        if (cloudCv.width !== cw || cloudCv.height !== chh) { cloudCv.width = cw; cloudCv.height = chh; }
        const cx2 = cloudCv.getContext('2d');
        cx2.globalCompositeOperation = 'source-over'; cx2.clearRect(0, 0, cw, chh); cx2.globalCompositeOperation = 'lighter';
        for (let i = 0; i < clouds.length; i++) {
          const [col, ph] = clouds[i];
          const cx = C.x + Math.cos(t * 0.03 + ph) * span * 0.28, cy = C.y + Math.sin(t * 0.025 + ph * 1.3) * span * 0.22;
          const sz = span * (0.7 + 0.15 * Math.sin(t * 0.1 + ph)) * (1 + v.mid * 0.25);
          cx2.globalAlpha = Math.min(1, (0.16 + v.level * 0.18 + (i === 2 ? v.beat * 0.12 : 0)) * inE);
          cx2.drawImage(api.glow(col, 64), (cx - sz / 2) * q, (cy - sz / 2) * q, sz * q, sz * q);
        }
        cx2.globalAlpha = 1;
        ctx.drawImage(cloudCv, 0, 0, w, h);
        // galaxy
        burst *= Math.exp(-dt * 3.2);
        const speed = (v.playing ? 0.35 + v.level * 0.9 : 0.08);
        rot += dt * speed;
        const R0 = Math.max(C.r * 2.2, Math.min(w, h * 0.9) * 0.64) * (1 + (1 - inE) * 2.5), inner = C.r * 0.86;
        const tilt = 0.44, ca = Math.cos(-0.38), sa = Math.sin(-0.38);
        for (let b = 0; b < 4; b++) {
          ctx.fillStyle = BINS[b] + (0.62 + v.level * 0.38) + ')';
          for (let i = b; i < P.length; i += 1) {
            const p = P[i]; if (p.bin !== b) continue;
            const band = v.bands[Math.min(31, Math.floor(p.r * 30))];
            const rr = (inner + p.r * (R0 - inner)) * (1 + burst * 0.2 * (1.2 - p.r) + band * 0.05);
            const th = p.th + rot * p.w * 3;
            const x0 = Math.cos(th) * rr, y0 = Math.sin(th) * rr * tilt + p.z * R0;
            const x = C.x + x0 * ca - y0 * sa, y = C.y + x0 * sa + y0 * ca;
            const sz = p.s * (1 + band * 0.8);
            ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
          }
        }
        // bright bulge
        const gs = C.r * (3.2 + v.bass * 1.2 + burst * 0.8);
        ctx.globalAlpha = 0.35 + v.bass * 0.3; ctx.drawImage(api.glow('#ffd6f0', 128), C.x - gs / 2, C.y - gs / 2, gs, gs);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        // progress ring
        const p = v.progress;
        pg.style.strokeDashoffset = (CIRC * (1 - (drag != null ? drag : p))).toFixed(2);
        const a = ((drag != null ? drag : p) * R.TAU) - Math.PI / 2;
        kn.setAttribute('cx', (50 + Math.cos(a) * 48).toFixed(2)); kn.setAttribute('cy', (50 + Math.sin(a) * 48).toFixed(2));
        root.style.setProperty('--lv', v.level.toFixed(3));
        root.style.setProperty('--bs', (v.bass + burst * 0.3).toFixed(3));
      },
    };
  },
});
