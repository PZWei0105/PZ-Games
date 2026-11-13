/* ===================== skin: 機甲反應爐 — cel-shaded reactor: bass pumps the core, gauges swing ===================== */
R.skins.def({
  id: 'mecha', name: '機甲反應爐', group: '酷炫', en: 'REACTOR RX-09',
  desc: '低音一打核心就脈動，儀表指針跟著甩',
  theme: { bg: '#1c2027', fg: '#f4f1e8', accent: '#ffc21a', accent2: '#3fe3ff', ui: 'rgba(28,31,38,.98)', dock: 'rgba(16,18,22,.75)', dockfg: '#ffc21a' },
  enterMs: 1500,
  emblem: `<svg class="em" viewBox="0 0 116 150"><rect width="116" height="150" fill="#262b33"/><path d="M0 128h116v22H0z" fill="#ffc21a"/><path d="M-6 150l22-22h10l-22 22zM18 150l22-22h10l-22 22zM42 150l22-22h10l-22 22zM66 150l22-22h10l-22 22zM90 150l22-22h10l-22 22z" fill="#15171b"/><circle cx="58" cy="62" r="44" fill="#3b424c" stroke="#0d0f12" stroke-width="4"/><path d="M27 93A44 44 0 0 0 102 62L58 62z" fill="#2c3239"/><circle cx="58" cy="62" r="31" fill="none" stroke="#ffc21a" stroke-width="9" stroke-dasharray="9 7"/><circle cx="58" cy="62" r="31" fill="none" stroke="#0d0f12" stroke-width="2"/><circle cx="58" cy="62" r="18" fill="#3fe3ff" stroke="#0d0f12" stroke-width="3"/><circle cx="58" cy="62" r="9" fill="#e9fdff"/><g fill="#c7ccd3" stroke="#0d0f12" stroke-width="1.5"><circle cx="58" cy="22" r="3.5"/><circle cx="98" cy="62" r="3.5"/><circle cx="58" cy="102" r="3.5"/><circle cx="18" cy="62" r="3.5"/></g></svg>`,
  sfx: {
    tap(s, t) { s.noise(t, { f: 3500, dur: 0.03, v: 0.08, type: 'highpass' }); s.tone(t, { f: 160, f2: 90, dur: 0.06, v: 0.12, type: 'square', lp: 800 }); },
    tick(s, t) { s.noise(t, { f: 4200, dur: 0.02, v: 0.06, type: 'highpass' }); },
    toggle(s, t) { s.noise(t, { f: 2500, dur: 0.04, v: 0.1, q: 3 }); s.tone(t + 0.03, { f: 120, f2: 70, dur: 0.08, v: 0.14, type: 'square', lp: 600 }); },
    play(s, t) { s.noise(t, { f: 300, f2: 2400, dur: 0.45, v: 0.09, q: 1.5, a: 0.2 }); s.tone(t + 0.3, { f: 55, f2: 40, dur: 0.5, v: 0.22, type: 'sine' }); s.tone(t, { f: 220, f2: 880, dur: 0.45, v: 0.04, type: 'sawtooth', lp: 1800 }); },
    pause(s, t) { s.tone(t, { f: 700, f2: 90, dur: 0.5, v: 0.06, type: 'sawtooth', lp: 1500 }); s.noise(t, { f: 2000, f2: 300, dur: 0.4, v: 0.05 }); },
    next(s, t) { s.noise(t, { f: 6000, f2: 1500, dur: 0.25, v: 0.07, type: 'highpass' }); s.tone(t + 0.12, { f: 140, f2: 60, dur: 0.12, v: 0.16, type: 'square', lp: 700 }); },
    prev(s, t) { s.noise(t, { f: 1500, f2: 6000, dur: 0.25, v: 0.07, type: 'highpass' }); s.tone(t + 0.12, { f: 140, f2: 60, dur: 0.12, v: 0.16, type: 'square', lp: 700 }); },
    enter(s, t) { s.tone(t, { f: 90, f2: 45, dur: 0.18, v: 0.25, type: 'square', lp: 500 }); s.tone(t + 0.25, { f: 120, f2: 55, dur: 0.16, v: 0.22, type: 'square', lp: 500 }); s.tone(t + 0.35, { f: 200, f2: 1200, dur: 0.6, v: 0.04, type: 'sawtooth', lp: 2200 }); s.noise(t + 0.75, { f: 400, f2: 3000, dur: 0.5, v: 0.08 }); s.tone(t + 0.95, { f: 60, f2: 38, dur: 0.6, v: 0.22 }); },
    open(s, t) { s.noise(t, { f: 2000, f2: 5000, dur: 0.15, v: 0.06, type: 'highpass' }); s.tone(t, { f: 100, dur: 0.06, v: 0.1, type: 'square', lp: 600 }); },
    close(s, t) { s.tone(t, { f: 110, f2: 70, dur: 0.08, v: 0.14, type: 'square', lp: 600 }); },
    ok(s, t) { s.notes(t, [s.hz(64), s.hz(71)], { dur: 0.12, v: 0.08, type: 'square', gap: 0.08, lp: 2500 }); },
  },
  mount(root, api) {
    const I = R.I;
    root.innerHTML = `
      <div class="mx-bg"></div>
      <div class="mx-head" data-ui><b>RX-09</b><span>REACTOR</span><i class="lamp pwr"></i><i class="lamp sync"></i><i class="lamp heat"></i></div>
      <div class="mx-main">
        <div class="mx-core"><canvas class="mx-cv"></canvas>
          <div class="mx-gauge l"><i class="nd"></i><b>OUTPUT</b></div>
          <div class="mx-gauge r"><i class="nd"></i><b>TORQUE</b></div>
        </div>
        <div class="mx-plate" data-ui><i class="sc a"></i><i class="sc b"></i><div class="mx-t" data-bind="title"></div><div class="mx-a"><span data-bind="artist"></span><em>TRK <span data-bind="idx"></span></em></div></div>
        <div class="mx-heat" data-ui><div class="mx-hl"><span>THERMAL ARRAY</span><span class="mx-mode">STANDBY</span></div><div class="mx-bars">${'<i></i>'.repeat(20)}</div></div>
        <div class="seek mx-seek" data-seek data-ui><div class="mx-sl"><span>ENERGY</span><span><b data-bind="time">0:00</b> / <span data-bind="dur">0:00</span></span></div><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div></div></div>
        <div class="mx-ctrl" data-ui>
          <button type="button" class="lever c-shuf" data-act="shuffle" aria-label="隨機播放"><i></i><span>RND</span></button>
          <button type="button" class="mb c-prev" data-act="prev" aria-label="上一首">${I.prev}</button>
          <button type="button" class="mb big c-play" data-act="toggle" aria-label="播放／暫停">${I.pp}<span class="lb lb-go">IGNITE</span><span class="lb lb-halt">HALT</span></button>
          <button type="button" class="mb c-next" data-act="next" aria-label="下一首">${I.next}</button>
          <button type="button" class="lever c-rep" data-act="repeat" aria-label="循環播放"><i></i><span class="rp-all">LOOP</span><span class="rp-one">LOOP·1</span><span class="rp-off">ONCE</span></button>
        </div>
      </div>`;
    const cv = api.canvas(root.querySelector('.mx-cv'));
    const needles = Array.from(root.querySelectorAll('.mx-gauge .nd'));
    const lampSync = root.querySelector('.lamp.sync'), lampHeat = root.querySelector('.lamp.heat');
    const bars = Array.from(root.querySelectorAll('.mx-bars i')), modeEl = root.querySelector('.mx-mode');
    const MODES = { hype: 'OVERDRIVE', groove: 'CRUISE', sleepy: 'LOW POWER', idle: 'STANDBY' };
    let lastMode = '';
    const N = [{ a: -120, v: 0 }, { a: -120, v: 0 }];
    let art = null, spin = 0, spin2 = 0, enterT = 9, bolts = [];
    const loadArt = (t) => { art = null; if (t) api.coverImage(t).then((im) => { if (api.track() && t && api.track().id === t.id) art = im; }); };
    api.beat((s) => {
      lampSync.classList.remove('on'); void lampSync.offsetWidth; lampSync.classList.add('on');
      if (s > 0.55) { const n = s > 0.8 ? 3 : 2; for (let i = 0; i < n; i++) bolts.push({ a: Math.random() * R.TAU, life: 0.16 + Math.random() * 0.08, seed: Math.random() * 1000 }); }
      for (const nd of N) nd.v += 260 * s;
    });
    const cel = (ctx, x, y, r, c1, c2, ang) => {
      ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x, y, r, 0, R.TAU); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, R.TAU); ctx.clip();
      ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * r * 1.5, y + Math.sin(ang) * r * 1.5); ctx.lineTo(x + Math.cos(ang + Math.PI) * r * 1.5, y + Math.sin(ang + Math.PI) * r * 1.5); ctx.lineTo(x + Math.cos(ang + Math.PI / 2) * r * 2, y + Math.sin(ang + Math.PI / 2) * r * 2); ctx.closePath(); ctx.fill();
      ctx.restore();
    };
    return {
      onTrack: loadArt,
      enter() { enterT = 0; },
      // song change: the reactor powers down and re-ignites with a burst of arcs
      swap() { enterT = 0.3; api.later(() => { for (let i = 0; i < 8; i++) bolts.push({ a: Math.random() * R.TAU, life: 0.2 + Math.random() * 0.12, seed: Math.random() * 1000 }); }, 560); },
      resize() { cv.resize(); },
      frame(dt, t, v) {
        enterT += dt;
        const { ctx, w, h } = cv; cv.clear();
        const cx = w / 2, cy = h / 2, R0 = Math.min(w, h) / 2 * 0.98;
        const ign = Math.min(1, Math.max(0, (enterT - 0.55) / 0.6));
        const on = v.playing ? 1 : 0.15;
        spin += dt * (0.25 + v.level * 2.4 * on) * ign;
        spin2 -= dt * (0.4 + v.bass * 3 * on) * ign;
        const OUT = '#0d0f12';
        ctx.lineJoin = 'round';
        // housing
        cel(ctx, cx, cy, R0 * 0.97, '#4a525d', '#323840', -0.6);
        ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.arc(cx, cy, R0 * 0.97, 0, R.TAU); ctx.stroke();
        // bolts
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * R.TAU + 0.13, bx = cx + Math.cos(a) * R0 * 0.885, by = cy + Math.sin(a) * R0 * 0.885, br = R0 * 0.035;
          ctx.fillStyle = '#c7ccd3'; ctx.beginPath(); ctx.arc(bx, by, br, 0, R.TAU); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx - br * 0.6, by); ctx.lineTo(bx + br * 0.6, by); ctx.lineWidth = 1.5; ctx.stroke();
        }
        // hazard ring
        const r1 = R0 * 0.8, r2 = R0 * 0.66, seg = 24;
        for (let i = 0; i < seg; i++) {
          const a0 = spin + (i / seg) * R.TAU, a1 = a0 + R.TAU / seg;
          ctx.fillStyle = i % 2 ? '#15171b' : '#ffc21a';
          ctx.beginPath(); ctx.arc(cx, cy, r1, a0, a1); ctx.arc(cx, cy, r2, a1, a0, true); ctx.closePath(); ctx.fill();
        }
        ctx.lineWidth = 3; ctx.strokeStyle = OUT;
        ctx.beginPath(); ctx.arc(cx, cy, r1, 0, R.TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, r2, 0, R.TAU); ctx.stroke();
        // energy channel = spectrum
        const e1 = R0 * 0.635, e2 = R0 * 0.5;
        ctx.fillStyle = '#081820'; ctx.beginPath(); ctx.arc(cx, cy, e1, 0, R.TAU); ctx.arc(cx, cy, e2, 0, R.TAU, true); ctx.fill();
        const nb = 32;
        for (let i = 0; i < nb; i++) {
          const b = v.bands[i] * ign;
          const a0 = spin2 + (i / nb) * R.TAU + 0.02, a1 = a0 + R.TAU / nb - 0.05;
          const rr = e2 + (e1 - e2) * (0.25 + 0.75 * b);
          ctx.fillStyle = `rgba(63,227,255,${0.25 + b * 0.75})`;
          ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a1); ctx.arc(cx, cy, e2 + 2, a1, a0, true); ctx.closePath(); ctx.fill();
        }
        ctx.lineWidth = 3; ctx.strokeStyle = OUT;
        ctx.beginPath(); ctx.arc(cx, cy, e1, 0, R.TAU); ctx.stroke();
        // core
        const pump = 1 + v.bass * 0.07 * on + v.kick * 0.05;
        const cr = R0 * 0.44 * pump;
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, cr, 0, R.TAU); ctx.clip();
        ctx.fillStyle = '#0b2a35'; ctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
        if (art) { ctx.globalAlpha = 0.25 + 0.75 * ign; ctx.drawImage(art, cx - cr, cy - cr, cr * 2, cr * 2); ctx.globalAlpha = 1; }
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
        cg.addColorStop(0, `rgba(200,250,255,${(0.15 + v.beat * 0.45) * ign})`); cg.addColorStop(0.6, 'rgba(63,227,255,0)'); cg.addColorStop(1, `rgba(63,227,255,${0.35 + v.level * 0.3})`);
        ctx.fillStyle = cg; ctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
        // cel shadow on the core glass
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(cx - cr, cy + cr * 0.2); ctx.lineTo(cx + cr, cy - cr * 0.6); ctx.lineTo(cx + cr, cy + cr); ctx.lineTo(cx - cr, cy + cr); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(cx - cr * 0.35, cy - cr * 0.45, cr * 0.32, cr * 0.14, -0.6, 0, R.TAU); ctx.fill();
        ctx.restore();
        ctx.lineWidth = 6; ctx.strokeStyle = '#3fe3ff'; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, R.TAU); ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.arc(cx, cy, cr + 3.5, 0, R.TAU); ctx.stroke();
        // glow
        ctx.globalCompositeOperation = 'lighter';
        const gsz = cr * 3.2 * (0.8 + v.level * 0.5);
        ctx.globalAlpha = (0.18 + v.kick * 0.5) * ign * on;
        ctx.drawImage(api.glow('#3fe3ff', 128), cx - gsz / 2, cy - gsz / 2, gsz, gsz);
        ctx.globalAlpha = 1;
        // lightning bolts on hits
        for (let i = bolts.length - 1; i >= 0; i--) {
          const b = bolts[i]; b.life -= dt; if (b.life <= 0) { bolts.splice(i, 1); continue; }
          ctx.strokeStyle = `rgba(220,252,255,${Math.min(1, b.life * 8)})`; ctx.lineWidth = 2.2;
          ctx.beginPath();
          const steps = 7; const rr = R.rng(Math.floor(b.seed + t * 30));
          for (let k = 0; k <= steps; k++) {
            const f = k / steps, rad = cr + (e1 - cr) * f + 6, a = b.a + (rr() - 0.5) * 0.35;
            const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
            if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          }
          ctx.stroke();
        }
        if (enterT > 0.5 && enterT < 0.9) { ctx.fillStyle = `rgba(200,250,255,${(0.9 - enterT) * 2})`; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, R.TAU); ctx.fill(); }
        ctx.globalCompositeOperation = 'source-over';
        // gauges: damped springs
        const tg = [-120 + 240 * Math.min(1, v.level * on * ign), -120 + 240 * Math.min(1, (v.bass * 1.1 + v.kick * 0.2) * on * ign)];
        for (let i = 0; i < 2; i++) {
          const nd = N[i];
          nd.v += ((tg[i] - nd.a) * 190 - nd.v * 13) * dt;
          nd.a += nd.v * dt;
          nd.a = Math.max(-132, Math.min(132, nd.a));
          needles[i].style.transform = `rotate(${nd.a.toFixed(1)}deg)`;
        }
        lampHeat.classList.toggle('on', v.level > 0.86 && v.playing);
        for (let i = 0; i < bars.length; i++) bars[i].style.setProperty('--h', Math.min(1, v.bands[Math.min(31, Math.floor(i * 1.5) + 1)] * 1.08 * ign).toFixed(3));
        if (v.mood !== lastMode) { lastMode = v.mood; modeEl.textContent = MODES[v.mood] || 'STANDBY'; modeEl.dataset.m = v.mood; }
        root.style.setProperty('--lv', v.level.toFixed(3));
      },
    };
  },
});
