/* ===================== skin: 煙火夜 — a fireworks show over the harbour, every shell timed to burst on a beat; the chorus is the finale ===================== */
R.skins.def({
  id: 'fireworks', punch: 0.6, name: '煙火夜', group: '夢幻', en: 'FIREWORKS',
  desc: '港灣夜空的煙火秀，每一發都剛好在節拍上炸開；副歌就是壓軸連發',
  bloom: { s: 0.72, th: 0.48 }, hero: '.fw-moon', trans: 'portal',
  theme: { bg: '#070a1f', fg: '#ffffff', accent: '#ffd36b', accent2: '#ff4f7b', ui: 'rgba(12,14,36,.97)', dock: 'rgba(14,16,44,.5)', dockfg: '#ffe9b0' },
  enterMs: 1700, swapMs: 1500, hype: false,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="fws" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04061a"/><stop offset=".7" stop-color="#21154a"/><stop offset="1" stop-color="#3a1c4f"/></linearGradient><radialGradient id="fwm"><stop offset="0" stop-color="#fff2c8"/><stop offset="1" stop-color="#ffd36b"/></radialGradient></defs><rect width="116" height="150" fill="url(#fws)"/><rect y="104" width="116" height="46" fill="#070b24"/><circle cx="22" cy="24" r="11" fill="url(#fwm)" opacity=".95"/><g stroke-linecap="round" stroke-width="1.6"><g stroke="#ff4f7b" transform="translate(74 42)"><path d="M0-6v-14M0 6v14M-6 0h-14M6 0h14M4 4l10 10M-4-4l-10-10M4-4l10-10M-4 4l-10 10"/></g><g stroke="#ffd36b" transform="translate(40 60) scale(.7)"><path d="M0-6v-14M0 6v14M-6 0h-14M6 0h14M4 4l10 10M-4-4l-10-10M4-4l10-10M-4 4l-10 10"/></g><g stroke="#7ad7ff" transform="translate(96 72) scale(.55)"><path d="M0-6v-14M0 6v14M-6 0h-14M6 0h14M4 4l10 10M-4-4l-10-10M4-4l10-10M-4 4l-10 10"/></g></g><path d="M74 104V58" stroke="#ffd36b" stroke-width="1" stroke-dasharray="2 3" opacity=".7"/><path d="M0 104V92h10v-8h8v20h6V80h10v24h8V88h12v16h10V70h4V60h2v10h4v34h8V86h12v18h12V94h10v10z" fill="#05060f"/><circle cx="18" cy="84" r="13" fill="none" stroke="#05060f" stroke-width="2"/><g fill="#ffd36b" opacity=".85"><circle cx="18" cy="71" r="1.2"/><circle cx="31" cy="84" r="1.2"/><circle cx="18" cy="97" r="1.2"/><circle cx="5" cy="84" r="1.2"/></g><g stroke="#ff4f7b" stroke-width="1.2" opacity=".35"><path d="M66 112h16M70 118h8M60 124h24"/></g><g stroke="#ffd36b" stroke-width="1.2" opacity=".3"><path d="M30 114h14M34 120h8"/></g></svg>`,
  sfx: {
    tap(s, t) { s.noise(t, { f: 6000, dur: 0.03, v: 0.04, type: 'highpass' }); },
    tick(s, t) { s.noise(t, { f: 8000, dur: 0.02, v: 0.03, type: 'highpass' }); },
    toggle(s, t) { s.noise(t, { f: 5000, dur: 0.06, v: 0.05, type: 'highpass' }); s.tone(t, { f: 1400, dur: 0.06, v: 0.03 }); },
    play(s, t) { s.tone(t, { f: 700, f2: 2600, dur: 0.38, v: 0.03 }); s.noise(t + 0.38, { f: 260, f2: 70, dur: 0.6, v: 0.14, type: 'lowpass' }); for (let i = 0; i < 6; i++) s.noise(t + 0.5 + i * 0.05 + Math.random() * 0.03, { f: 5000, dur: 0.02, v: 0.04, type: 'highpass' }); },
    pause(s, t) { s.noise(t, { f: 220, f2: 60, dur: 0.5, v: 0.1, type: 'lowpass' }); },
    next(s, t) { s.tone(t, { f: 900, f2: 2200, dur: 0.22, v: 0.03 }); s.noise(t + 0.22, { f: 300, f2: 90, dur: 0.3, v: 0.08, type: 'lowpass' }); },
    prev(s, t) { s.tone(t, { f: 2200, f2: 900, dur: 0.22, v: 0.03 }); s.noise(t + 0.22, { f: 300, f2: 90, dur: 0.3, v: 0.08, type: 'lowpass' }); },
    enter(s, t) { s.tone(t, { f: 500, f2: 3000, dur: 0.9, v: 0.03, a: 0.05 }); s.noise(t + 0.9, { f: 240, f2: 50, dur: 1.2, v: 0.16, type: 'lowpass' }); for (let i = 0; i < 14; i++) s.noise(t + 1 + i * 0.045 + Math.random() * 0.04, { f: 4000 + Math.random() * 4000, dur: 0.02, v: 0.035, type: 'highpass' }); },
    open(s, t) { s.noise(t, { f: 6000, f2: 9000, dur: 0.12, v: 0.03, type: 'highpass' }); },
    close(s, t) { s.noise(t, { f: 9000, f2: 6000, dur: 0.12, v: 0.03, type: 'highpass' }); },
    ok(s, t) { s.notes(t, [s.hz(84), s.hz(88), s.hz(91)], { dur: 0.4, v: 0.04, type: 'sine', gap: 0.05 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="fw-fx"></canvas><canvas class="fw-fg"></canvas>
      <div class="fw-moon"><img data-bind="cover" alt="" draggable="false"><i class="fw-shade"></i></div>
      <div class="fw-info" data-ui><div class="fw-t" data-bind="title"></div><div class="fw-a" data-bind="artist"></div></div>
      <div class="fw-dock">${R.ui.seek('fw-seek')}${R.ui.ctrl('fw-ctrl')}</div>`;
    const fx = api.canvas(root.querySelector('.fw-fx'), { dprMax: 1.5 });
    const fg = api.canvas(root.querySelector('.fw-fg'), { dprMax: 2 });
    const moonEl = root.querySelector('.fw-moon'), infoEl = root.querySelector('.fw-info');
    const low = api.low(), rnd = R.rng(2024);
    let Y0 = 400, K = 1, scene = null, wheel = { x: 0, y: 0, r: 30 }, Mn = { x: 0, y: 0, r: 0 }, avoid = [];
    let pal = [];
    const setPal = (tk) => { const c = api.colors(tk); pal = [c.vibrant, c.light, '#ff4f7b', '#ffd36b', '#7ad7ff', '#b98cff', '#7dffb0', '#ff9a3f']; };
    setPal(api.track());
    // harbour skyline, its reflection and the water, painted once
    function build() {
      const w = fg.w, h = fg.h, d = fg.dpr;
      Y0 = Math.round(h * (h > w * 1.15 ? 0.62 : 0.72)); K = Math.max(0.6, Math.min(1.5, Math.min(w, h) / 560));
      root.style.setProperty('--hz', Y0 + 'px');
      Mn = { x: moonEl.offsetLeft + moonEl.offsetWidth / 2, y: moonEl.offsetTop + moonEl.offsetHeight / 2, r: moonEl.offsetWidth / 2 };
      // keep bursts off the moon and off the title when the title sits in the sky
      avoid = [[moonEl.offsetLeft - 40, moonEl.offsetTop - 40, moonEl.offsetWidth + 80, moonEl.offsetHeight + 80]];
      if (infoEl.offsetTop < Y0) avoid.push([infoEl.offsetLeft - 30, infoEl.offsetTop - 50, Math.min(infoEl.offsetWidth, 520) + 60, infoEl.offsetHeight + 100]);
      const r = R.rng(77), maxH = Math.min(h * 0.17, Y0 * 0.3);
      const sky = document.createElement('canvas'); sky.width = Math.ceil(w * d); sky.height = Math.ceil(Y0 * d);
      const x = sky.getContext('2d'); x.scale(d, d);
      x.fillStyle = '#05060f';
      const bld = []; let bx = -10;
      while (bx < w + 10) { const bw = 14 + r() * 32, bh = maxH * (0.22 + r() * 0.6) * (r() < 0.12 ? 1.4 : 1); bld.push([bx, bw, bh]); bx += bw + r() * 3; }
      for (const [b0, bw, bh] of bld) x.fillRect(b0, Y0 - bh, bw, bh);
      const tx = w * 0.76, th = maxH * 1.9;
      x.fillRect(tx - 4, Y0 - th, 8, th);
      x.beginPath(); x.moveTo(tx - 13, Y0 - th * 0.66); x.lineTo(tx + 13, Y0 - th * 0.66); x.lineTo(tx + 8, Y0 - th * 0.58); x.lineTo(tx - 8, Y0 - th * 0.58); x.closePath(); x.fill();
      x.fillRect(tx - 1, Y0 - th - 22 * K, 2, 22 * K);
      for (const [b0, bw, bh] of bld) for (let yy = Y0 - bh + 4; yy < Y0 - 4; yy += 6) for (let xx = b0 + 3; xx < b0 + bw - 3; xx += 5) if (r() < 0.2) { x.fillStyle = r() < 0.72 ? 'rgba(255,212,140,.78)' : 'rgba(170,210,255,.62)'; x.fillRect(xx, yy, 2, 2.6); }
      x.fillStyle = 'rgba(255,90,90,.9)'; x.fillRect(tx - 1.5, Y0 - th - 23 * K, 3, 3);
      wheel = { x: w * (h > w * 1.15 ? 0.17 : 0.12), r: maxH * 0.62, y: 0 }; wheel.y = Y0 - wheel.r - 6;
      x.strokeStyle = '#05060f'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(wheel.x - wheel.r * 0.6, Y0); x.lineTo(wheel.x, wheel.y); x.lineTo(wheel.x + wheel.r * 0.6, Y0); x.stroke();
      scene = document.createElement('canvas'); scene.width = Math.ceil(w * d); scene.height = Math.ceil(h * d);
      const s = scene.getContext('2d'); s.scale(d, d);
      const wg = s.createLinearGradient(0, Y0, 0, h); wg.addColorStop(0, '#0e1338'); wg.addColorStop(0.35, '#080b24'); wg.addColorStop(1, '#02030a');
      s.fillStyle = wg; s.fillRect(0, Y0, w, h - Y0);
      // the skyline's reflection, broken into ripples
      for (let yy = 0; yy < Math.min(h - Y0, maxH * 2.2); yy += 3) {
        const sy = Y0 - yy * 0.9 - 3, dx = Math.sin(yy * 0.7) * 2.5;
        s.globalAlpha = 0.42 * (1 - yy / (maxH * 2.2));
        s.drawImage(sky, 0, Math.max(0, sy * d), sky.width, 3 * d, dx, Y0 + yy, w, 2);
      }
      s.globalAlpha = 1; s.drawImage(sky, 0, 0, w, Y0);
      s.fillStyle = 'rgba(160,170,255,.18)'; s.fillRect(0, Y0, w, 1);
    }
    build();
    // ---- fireworks ----
    const shells = [], parts = [], flashes = [], smoke = [];
    const MAXP = low ? 700 : 1600;
    const add = (p) => { if (parts.length < MAXP) parts.push(p); };
    const pick = () => pal[Math.floor(rnd() * pal.length)];
    function launch(F, s, hot, kind) {
      const { w } = fx;
      let bx = 0, by = 0;
      for (let k = 0; k < 6; k++) {
        bx = w * (0.1 + rnd() * 0.8); by = Y0 * (0.14 + rnd() * 0.46);
        if (!avoid.some(([ax, ay, aw, ah]) => bx > ax && bx < ax + aw && by > ay && by < ay + ah)) break;
      }
      const x0 = bx + (rnd() - 0.5) * w * 0.08, g = 70;
      const kinds = hot ? ['peony', 'chrys', 'ring', 'palm', 'willow', 'heart', 'glitter', 'crossette'] : ['peony', 'peony', 'chrys', 'willow', 'ring', 'palm', 'crossette'];
      kind = kind || kinds[Math.floor(rnd() * kinds.length)];
      shells.push({ x: x0, y: Y0, vx: (bx - x0) / F, vy: (by - Y0 - 0.5 * g * F * F) / F, g, left: F, s, hot, kind, c1: pick(), c2: pick() });
    }
    function burst(sh) {
      const { x, y, s, kind } = sh, sp = (95 + s * 90) * K, n = Math.round((low ? 36 : 70) * (0.6 + s * 0.6) * (sh.hot ? 1.15 : 1));
      const P = (vx, vy, life, c, o) => add(Object.assign({ x, y, vx, vy, life, max: life, c, sz: 7 * K, drag: 1.5, g: 34 * K, tw: 0 }, o));
      if (kind === 'willow') for (let i = 0; i < n; i++) { const a = rnd() * R.TAU, v = sp * 0.62 * (0.8 + rnd() * 0.2); P(Math.cos(a) * v, Math.sin(a) * v, 2.4 + rnd() * 0.8, '#ffcf6b', { drag: 2.2, g: 46 * K, sz: 8 * K }); }
      else if (kind === 'ring') { const tilt = 0.3 + rnd() * 0.6, rot = rnd() * R.TAU; for (let i = 0; i < n * 0.7; i++) { const a = (i / (n * 0.7)) * R.TAU, ux = Math.cos(a), uy = Math.sin(a) * tilt; P((ux * Math.cos(rot) - uy * Math.sin(rot)) * sp, (ux * Math.sin(rot) + uy * Math.cos(rot)) * sp, 1.3 + rnd() * 0.3, i % 2 ? sh.c1 : sh.c2); } }
      else if (kind === 'heart') { for (let i = 0; i < n; i++) { const a = (i / n) * R.TAU, hx = 16 * Math.pow(Math.sin(a), 3), hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); P(hx / 17 * sp, hy / 17 * sp, 1.5 + rnd() * 0.2, '#ff5c8a', { g: 18 * K }); } }
      else if (kind === 'palm') { for (let i = 0; i < 9; i++) { const a = (i / 9) * R.TAU + rnd() * 0.3, v = sp * 1.05; P(Math.cos(a) * v, Math.sin(a) * v - 20, 1.3 + rnd() * 0.3, '#ffd36b', { sz: 13 * K, g: 70 * K, drag: 1.1, comet: 1 }); } }
      else if (kind === 'glitter') { for (let i = 0; i < n; i++) { const a = rnd() * R.TAU, v = sp * (0.3 + rnd() * 0.7); P(Math.cos(a) * v, Math.sin(a) * v, 1 + rnd() * 0.8, '#ffffff', { tw: 1, sz: 5 * K, drag: 2 }); } }
      else if (kind === 'crossette') { for (let i = 0; i < 6; i++) { const a = (i / 6) * R.TAU + rnd(), v = sp * 0.9; P(Math.cos(a) * v, Math.sin(a) * v, 0.7, sh.c1, { sz: 10 * K, split: 1 }); } }
      else { const two = rnd() < 0.5; for (let i = 0; i < n; i++) { const a = rnd() * R.TAU, v = sp * (0.82 + rnd() * 0.18); P(Math.cos(a) * v, Math.sin(a) * v, (kind === 'chrys' ? 1.7 : 1.25) + rnd() * 0.4, two && i % 2 ? sh.c2 : sh.c1, kind === 'chrys' ? { trail: 1 } : null); } }
      flashes.push({ x, y, r: (130 + s * 170) * K, a: 0.32 + s * 0.12, c: kind === 'willow' ? '#ffcf6b' : sh.c1 });
      for (let i = 0; i < 2; i++) smoke.push({ x: x + (rnd() - 0.5) * 40 * K, y: y + (rnd() - 0.2) * 30 * K, r: (50 + rnd() * 50) * K, a: 0.11, life: 5 });
      if (smoke.length > 24) smoke.splice(0, smoke.length - 24);
      glowC = kind === 'willow' ? '#ffcf6b' : sh.c1; glowA = Math.min(1, glowA + 0.5 + s * 0.3);
    }
    // shells are launched ahead of time so that they burst on the beat
    let schedTo = -1, lastSongT = -1, enterT = 9, glowC = '#ffd36b', glowA = 0, lastGlow = '';
    const ahead = [];
    const inHot = (bt) => { for (const sp of (R.viz.hotSpans || [])) if (bt >= sp[0] - 0.05 && bt < sp[1]) return true; return false; };
    function schedule(v) {
      const t = v.t;
      if (lastSongT < 0 || t < lastSongT - 0.25 || t > lastSongT + 1.5) schedTo = t + 0.85;
      lastSongT = t;
      if (!v.playing) { schedTo = Math.max(schedTo, t + 0.85); return; }
      const to = t + 1.25; if (to <= schedTo) return;
      // shells are fired early so they burst exactly on the beat: the bar's first beat always, the third on a strong
      // bar, the rest now and then; in the chorus every beat, doubled on the bar's first, with glitter
      R.viz.upcomingBeats(schedTo, to, ahead); schedTo = to;
      for (let i = 0; i < ahead.length; i += 3) {
        const bt = ahead[i], s = ahead[i + 1], pos = ahead[i + 2], F = Math.max(0.6, bt - t);
        if (inHot(bt)) { launch(F, s, true); if (pos === 0) launch(F, s * 0.85, true); if (!low && (pos === 2 || rnd() < 0.3)) launch(F, 0.5, true, 'glitter'); }
        else if (pos === 0 || (pos === 2 && s > 0.75) || (s > 0.9 && rnd() < 0.3)) launch(F, s, false);
      }
    }
    const salvo = (n, kind) => { for (let i = 0; i < n; i++) launch(0.95 + i * 0.12, 0.85, true, kind || (i === 2 ? 'heart' : null)); };
    api.on('hot', (on) => { if (on) salvo(low ? 3 : 5, 'willow'); });
    const stars = []; for (let i = 0; i < 70; i++) stars.push([rnd(), rnd() * 0.75, rnd() * 6, 0.4 + rnd() * 0.6]);
    return {
      enter() { enterT = 0; salvo(3); },
      swap() { salvo(low ? 3 : 4); },
      onTrack(tk) { setPal(tk); },
      resize() { fx.resize(); fg.resize(); build(); },
      frame(dt, t, v) {
        enterT += dt;
        schedule(v);
        const c = fx.ctx, w = fx.w, h = fx.h;
        // fade what is there (the trails), then add light
        c.globalCompositeOperation = 'destination-out';
        c.fillStyle = `rgba(0,0,0,${1 - Math.exp(-dt * 9)})`; c.fillRect(0, 0, w, h);
        c.globalCompositeOperation = 'lighter';
        for (let i = flashes.length - 1; i >= 0; i--) { const f = flashes[i]; f.a -= dt * 1.6; if (f.a <= 0) { flashes.splice(i, 1); continue; } c.globalAlpha = f.a * 0.35; c.drawImage(api.glow(f.c, 64), f.x - f.r, f.y - f.r, f.r * 2, f.r * 2); }
        for (let i = shells.length - 1; i >= 0; i--) {
          const sh = shells[i]; sh.left -= dt; sh.vy += sh.g * dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt;
          if (sh.left <= 0) { shells.splice(i, 1); burst(sh); continue; }
          c.globalAlpha = 0.95; c.drawImage(api.glow('#ffe7a8', 32), sh.x - 4 * K, sh.y - 4 * K, 8 * K, 8 * K);
          if (rnd() < 0.8) add({ x: sh.x, y: sh.y + 3, vx: (rnd() - 0.5) * 14, vy: 10 + rnd() * 16, life: 0.35, max: 0.35, c: '#ffb35c', sz: 4 * K, drag: 2, g: 20, tw: 0 });
        }
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i]; p.life -= dt;
          if (p.life <= 0) {
            if (p.split) for (let k = 0; k < 4; k++) { const a = (k / 4) * R.TAU + 0.6, vv = 70 * K; add({ x: p.x, y: p.y, vx: Math.cos(a) * vv + p.vx * 0.3, vy: Math.sin(a) * vv + p.vy * 0.3, life: 0.9, max: 0.9, c: p.c, sz: 7 * K, drag: 1.6, g: 40 * K, tw: 0 }); }
            parts.splice(i, 1); continue;
          }
          const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy = p.vy * k + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if ((p.trail || p.comet) && rnd() < 0.5) add({ x: p.x, y: p.y, vx: 0, vy: 6, life: 0.4, max: 0.4, c: p.comet ? '#ff9a3f' : p.c, sz: 3.5 * K, drag: 3, g: 12, tw: 0 });
          const f = p.life / p.max; let a = Math.pow(f, 0.6);
          if (p.tw) a *= (Math.sin(t * 46 + i) > 0 ? 1 : 0.15);
          const sz = p.sz * (0.5 + 0.5 * f);
          c.globalAlpha = a; c.drawImage(api.glow(p.c, 32), p.x - sz / 2, p.y - sz / 2, sz, sz);
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        // the scene in front: stars, drifting smoke, the reflections on the water, the skyline, the wheel
        const g = fg.ctx, W2 = fg.w, H2 = fg.h;
        fg.clear();
        for (const [sx, sy, ph, b] of stars) { g.globalAlpha = b * (0.55 + 0.45 * Math.sin(t * 1.3 + ph)) * Math.min(1, enterT); g.fillStyle = '#ffffff'; g.fillRect(sx * W2, sy * Y0, 1.3, 1.3); }
        for (let i = smoke.length - 1; i >= 0; i--) { const m = smoke[i]; m.life -= dt; m.y -= 4 * dt; m.x += 3 * dt; m.r += 5 * dt; if (m.life <= 0) { smoke.splice(i, 1); continue; } g.globalAlpha = m.a * Math.min(1, m.life / 2); g.drawImage(api.glow('#8d8aa8', 64), m.x - m.r, m.y - m.r * 0.7, m.r * 2, m.r * 1.4); }
        g.globalAlpha = 1;
        g.drawImage(scene, 0, 0, W2, H2);
        const fxc = fx.cv, fd = fx.dpr, water = H2 - Y0;
        if (low) { g.save(); g.globalAlpha = 0.3; g.translate(0, Y0 * 2); g.scale(1, -0.85); g.drawImage(fxc, 0, 0, fxc.width, Y0 * fd, 0, 0, W2, Y0); g.restore(); }
        else {
          g.globalCompositeOperation = 'lighter';
          const sl = 4;
          for (let yy = 0; yy < water; yy += sl) {
            const f = yy / water, srcY = Y0 - (yy + sl) * 0.85;
            if (srcY < 0) break;
            g.globalAlpha = 0.62 * (1 - f) * (1 - f);
            g.drawImage(fxc, 0, srcY * fd, fxc.width, sl * 0.85 * fd, Math.sin(t * 2.2 + yy * 0.25) * (2 + f * 6), Y0 + yy, W2, sl);
          }
          g.globalCompositeOperation = 'source-over';
        }
        // ferris wheel
        const wr = wheel.r, rot = t * 0.15;
        g.strokeStyle = '#141633'; g.lineWidth = 2.2; g.beginPath(); g.arc(wheel.x, wheel.y, wr, 0, R.TAU); g.arc(wheel.x, wheel.y, wr * 0.92, 0, R.TAU); g.stroke();
        g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 12; i++) { const a = rot + (i / 12) * R.TAU; g.moveTo(wheel.x, wheel.y); g.lineTo(wheel.x + Math.cos(a) * wr, wheel.y + Math.sin(a) * wr); } g.stroke();
        g.fillStyle = '#141633';
        for (let i = 0; i < 12; i++) { const a = rot + (i / 12) * R.TAU; g.fillRect(wheel.x + Math.cos(a) * wr - 3, wheel.y + Math.sin(a) * wr, 6, 5); }
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 24; i++) { const a = rot + (i / 24) * R.TAU, on = (i + Math.floor(t * 5)) % 4, col = on === 0 ? '#ff4f7b' : on === 1 ? '#ffd36b' : on === 2 ? '#7ad7ff' : '#ffffff'; g.globalAlpha = 0.9; g.drawImage(api.glow(col, 32), wheel.x + Math.cos(a) * wr - 4, wheel.y + Math.sin(a) * wr - 4, 8, 8); }
        g.globalAlpha = 0.8; g.drawImage(api.glow('#ffd36b', 32), wheel.x - 5, wheel.y - 5, 10, 10);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        // the moon catches the colour of the last burst
        glowA *= Math.exp(-dt * 1.8);
        const gk = glowC + '|' + Math.round(glowA * 20);
        if (gk !== lastGlow) { lastGlow = gk; root.style.setProperty('--fwc', R.color.rgba(glowC, 0.25 + glowA * 0.45)); root.style.setProperty('--fwa', (glowA).toFixed(2)); }
      },
    };
  },
});
