/* ===================== skin: 貓咪 DJ — a cat in big headphones spins your song: head bobbing on the beat, paw on the record, the cover glowing on the booth; paws up in the chorus, asleep when you pause ===================== */
R.skins.def({
  id: 'catdj', punch: 0.8, name: '貓咪 DJ', group: '可愛', en: 'DJ MEOW',
  desc: '戴耳機的貓咪 DJ 跟著節拍點頭刷碟，封面亮在 DJ 台上；副歌舉雙手，暫停就睡著',
  theme: { bg: '#2b1a4f', fg: '#ffffff', accent: '#ff7eb6', accent2: '#5ce1e6', ui: 'rgba(43,26,79,.97)', dock: 'rgba(255,255,255,.16)', dockfg: '#ffffff' },
  enterMs: 1800, swapMs: 1200, hype: 'full',
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="cdb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1a4f"/><stop offset="1" stop-color="#5a2a86"/></linearGradient></defs><rect width="116" height="150" fill="url(#cdb)"/><g fill="#fff" opacity=".35"><circle cx="16" cy="20" r="5"/><circle cx="98" cy="30" r="7"/><circle cx="88" cy="60" r="3"/><circle cx="20" cy="66" r="3"/></g><line x1="58" y1="0" x2="58" y2="12" stroke="#ccc" stroke-width="1"/><circle cx="58" cy="19" r="7" fill="#cfd6ea"/><path d="M53 15h10M51 19h14M53 23h10" stroke="#8d97b5" stroke-width=".8"/><g stroke="#4a3046" stroke-width="2.4" stroke-linejoin="round"><path d="M30 64l6-26 16 14zM86 64l-6-26-16 14z" fill="#fff4e6"/><ellipse cx="58" cy="74" rx="32" ry="27" fill="#fff4e6"/></g><path d="M30 64l6-26 9 8c-6 4-11 10-15 18z" fill="#ffb35c"/><path d="M36 44l3-3 6 6z" fill="#ffb3c7"/><path d="M80 44l-3-3-6 6z" fill="#ffb3c7"/><path d="M24 68a34 34 0 0 1 68 0" fill="none" stroke="#5ce1e6" stroke-width="5"/><rect x="20" y="64" width="10" height="20" rx="4" fill="#ff7eb6" stroke="#4a3046" stroke-width="2"/><rect x="86" y="64" width="10" height="20" rx="4" fill="#ff7eb6" stroke="#4a3046" stroke-width="2"/><ellipse cx="46" cy="76" rx="5" ry="6.5" fill="#2b1d33"/><ellipse cx="70" cy="76" rx="5" ry="6.5" fill="#2b1d33"/><circle cx="47.6" cy="73.6" r="2" fill="#fff"/><circle cx="71.6" cy="73.6" r="2" fill="#fff"/><path d="M56 84h4l-2 2.4z" fill="#ff8fab"/><path d="M53 88q2.5 2.6 5 0q2.5 2.6 5 0" fill="none" stroke="#4a3046" stroke-width="1.4"/><ellipse cx="38" cy="84" rx="5" ry="3" fill="#ff8fab" opacity=".5"/><ellipse cx="78" cy="84" rx="5" ry="3" fill="#ff8fab" opacity=".5"/><path d="M10 100h96l6 12H4z" fill="#7d5cf0"/><ellipse cx="32" cy="104" rx="15" ry="4" fill="#1d1430"/><ellipse cx="84" cy="104" rx="15" ry="4" fill="#1d1430"/><circle cx="32" cy="104" r="2.4" fill="#ff7eb6"/><rect x="4" y="112" width="108" height="30" rx="6" fill="#6b4bd8"/><rect x="45" y="115" width="26" height="24" rx="4" fill="#ffd36b"/><g fill="#5ce1e6"><rect x="12" y="128" width="4" height="10"/><rect x="19" y="122" width="4" height="16"/><rect x="26" y="126" width="4" height="12"/><rect x="33" y="119" width="4" height="19"/></g><g fill="#ff7eb6"><rect x="79" y="124" width="4" height="14"/><rect x="86" y="119" width="4" height="19"/><rect x="93" y="127" width="4" height="11"/><rect x="100" y="122" width="4" height="16"/></g></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 620, f2: 940, dur: 0.07, v: 0.06 }); },
    tick(s, t) { s.tone(t, { f: 1250, dur: 0.035, v: 0.035 }); },
    toggle(s, t) { s.tone(t, { f: 700, dur: 0.06, v: 0.05, type: 'triangle' }); s.tone(t + 0.07, { f: 1050, dur: 0.08, v: 0.05, type: 'triangle' }); },
    // a little synthesized "nyaa"
    play(s, t) { s.tone(t, { f: 520, f2: 900, glide: 0.16, dur: 0.2, v: 0.045, type: 'sawtooth', lp: 1900 }); s.tone(t + 0.16, { f: 900, f2: 430, glide: 0.34, dur: 0.38, v: 0.045, type: 'sawtooth', lp: 1600 }); },
    pause(s, t) { s.tone(t, { f: 760, f2: 480, glide: 0.24, dur: 0.28, v: 0.04, type: 'sawtooth', lp: 1400 }); },
    next(s, t) { s.noise(t, { f: 500, f2: 3200, dur: 0.09, v: 0.09, q: 2.5 }); s.noise(t + 0.09, { f: 3200, f2: 600, dur: 0.12, v: 0.08, q: 2.5 }); },
    prev(s, t) { s.noise(t, { f: 3200, f2: 500, dur: 0.1, v: 0.09, q: 2.5 }); s.noise(t + 0.1, { f: 600, f2: 2800, dur: 0.1, v: 0.07, q: 2.5 }); },
    enter(s, t) { s.notes(t, [72, 76, 79, 84].map(s.hz), { dur: 0.16, v: 0.05, type: 'triangle', gap: 0.08 }); s.tone(t + 0.4, { f: 540, f2: 960, glide: 0.18, dur: 0.22, v: 0.05, type: 'sawtooth', lp: 2000 }); s.tone(t + 0.58, { f: 960, f2: 450, glide: 0.4, dur: 0.45, v: 0.05, type: 'sawtooth', lp: 1700 }); },
    open(s, t) { s.tone(t, { f: 500, f2: 1200, dur: 0.09, v: 0.045 }); },
    close(s, t) { s.tone(t, { f: 1200, f2: 500, dur: 0.09, v: 0.045 }); },
    ok(s, t) { s.notes(t, [s.hz(79), s.hz(84), s.hz(88), s.hz(91)], { dur: 0.18, v: 0.05, type: 'triangle', gap: 0.07 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="cd-cv"></canvas>
      <div class="cd-sign" data-ui><div class="cd-np">♪ NOW PLAYING</div><div class="cd-t" data-bind="title"></div><div class="cd-a" data-bind="artist"></div></div>
      <div class="cd-bub"></div>
      <div class="cd-dock">${R.ui.seek('cd-seek')}${R.ui.ctrl('cd-ctrl')}</div>`;
    const cv = api.canvas(root.querySelector('.cd-cv'), { dprMax: 2 });
    const bub = root.querySelector('.cd-bub');
    const low = api.low(), rnd = R.rng(7);
    const INK = '#4a3046', FUR = '#fff4e6', PATCH = '#ffb35c', PINK = '#ff8fab';
    let G = { cx: 0, deskY: 0, s: 1, port: true, short: false };
    const geo = () => {
      const { w, h } = cv, port = h > w * 1.15, short = !port && h <= 500;
      let s, cx, deskY;
      if (port) { s = Math.min(w * 0.9, h * 0.5) / 400; cx = w / 2; deskY = Math.round(h * 0.58); }
      else if (short) { s = Math.min(h * 0.52, w * 0.5) / 400; cx = w * 0.32; deskY = Math.round(h * 0.7); }
      else { s = Math.min(h * 0.5, w * 0.6) / 400; cx = w / 2; deskY = Math.round(h * 0.62); }
      G = { cx, deskY, s, port, short };
      // the speech bubble sits by the cat's head
      bub.style.left = Math.round(cx + 80 * s) + 'px'; bub.style.top = Math.round(deskY - 270 * s) + 'px';
    };
    geo();
    let cover = null;
    const loadCover = (tk) => { cover = null; if (tk) api.coverImage(tk).then((im) => { const c = api.track(); if (im && c && c.id === tk.id) cover = im; }).catch(() => {}); };
    loadCover(api.track());
    // ---- state ----
    let enterT = 9, swapT = 9, blinkT = 2 + rnd() * 3, blink = 0, earL = 0, earR = 0, earV = 0, scratch = 0, sleepK = 0, hotK = 0, disco = 0;
    const notes = [], zzz = [], bokeh = [];
    for (let i = 0; i < 18; i++) bokeh.push({ x: rnd(), y: rnd() * 0.7, r: 8 + rnd() * 26, sp: 3 + rnd() * 8, ph: rnd() * 6, c: ['#ff7eb6', '#5ce1e6', '#ffd36b', '#b98cff', '#7dffb0'][i % 5] });
    const say = (txt, ms) => { bub.textContent = txt; bub.classList.remove('on'); void bub.offsetWidth; bub.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => bub.classList.remove('on'), ms || 1400); };
    api.on('hot', (on) => { if (on) say('NYA~♪', 1800); });
    // the ears twitch on every beat; the bar's first beat gets a scratch
    api.beat((s, i) => {
      earV = -(2.5 + s * (i.down ? 7 : 3.5));
      if (i.down) scratch = 1;
      if (rnd() < 0.55 + R.viz.hot * 0.4) notes.push({ x: G.cx + (rnd() < 0.5 ? -1 : 1) * (60 + rnd() * 140) * G.s, y: G.deskY - 20 * G.s, vx: (rnd() - 0.5) * 30, vy: -(40 + rnd() * 40), life: 2.2, c: ['#ff7eb6', '#5ce1e6', '#ffd36b', '#b98cff'][Math.floor(rnd() * 4)], k: rnd() < 0.5 ? 1 : 2, rot: (rnd() - 0.5) * 0.6 });
      if (notes.length > 40) notes.shift();
    });
    // ---- drawing helpers (cat-local units: 1 = G.s px, head centre at 0,0) ----
    const outlined = (ctx, fill, lw, path) => { ctx.lineWidth = lw; ctx.strokeStyle = INK; path(); ctx.stroke(); ctx.fillStyle = fill; path(); ctx.fill(); };
    function note(ctx, x, y, k, col, a, rot) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 4.5, -0.4, 0, R.TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(5, -1); ctx.lineTo(5, -20); ctx.stroke();
      if (k === 2) { ctx.beginPath(); ctx.ellipse(17, -3, 6, 4.5, -0.4, 0, R.TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(22, -4); ctx.lineTo(22, -23); ctx.stroke(); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(5, -20); ctx.lineTo(22, -23); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(5, -20); ctx.quadraticCurveTo(14, -14, 11, -6); ctx.stroke(); }
      ctx.restore();
    }
    function cat(ctx, t, v, pose) {
      const { s } = G;
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // tail swishing behind
      ctx.save(); ctx.translate(110, 120);
      const sw = Math.sin(t * (v.playing ? 3.2 : 1)) * 0.35;
      ctx.lineWidth = 26; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(40, -20, 30 + sw * 40, -80, 60 + sw * 60, -110); ctx.stroke();
      ctx.lineWidth = 20; ctx.strokeStyle = PATCH; ctx.stroke();
      ctx.restore();
      // shoulders
      outlined(ctx, FUR, 7, () => { ctx.beginPath(); ctx.ellipse(0, 150, 96, 92, 0, Math.PI, 0); ctx.closePath(); });
      ctx.save(); ctx.translate(0, pose.headY); ctx.rotate(pose.tilt);
      // ears (spring-loaded twitch)
      const ear = (side, rot) => {
        ctx.save(); ctx.translate(side * 58, -52); ctx.rotate(side * 0.12 + rot * side);
        outlined(ctx, FUR, 7, () => { ctx.beginPath(); ctx.moveTo(-side * 28, 20); ctx.quadraticCurveTo(-side * 8, -50, side * 6, -58); ctx.quadraticCurveTo(side * 22, -20, side * 36, 14); ctx.closePath(); });
        if (side < 0) { ctx.fillStyle = PATCH; ctx.beginPath(); ctx.moveTo(28, 20); ctx.quadraticCurveTo(8, -50, -6, -58); ctx.quadraticCurveTo(-18, -24, -26, 10); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = '#ffb3c7'; ctx.beginPath(); ctx.moveTo(-side * 14, 12); ctx.quadraticCurveTo(-side * 2, -30, side * 6, -38); ctx.quadraticCurveTo(side * 14, -12, side * 20, 10); ctx.closePath(); ctx.fill();
        ctx.restore();
      };
      ear(-1, earL); ear(1, earR);
      // head with a ginger patch
      outlined(ctx, FUR, 7, () => { ctx.beginPath(); ctx.ellipse(0, 0, 94, 78, 0, 0, R.TAU); });
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 90.5, 74.5, 0, 0, R.TAU); ctx.clip();
      ctx.fillStyle = PATCH; ctx.beginPath(); ctx.ellipse(-62, -52, 52, 44, 0.5, 0, R.TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(70, 60, 26, 20, 0, 0, R.TAU); ctx.fill();
      ctx.restore();
      // headphones
      ctx.lineWidth = 20; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(0, 4, 104, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.lineWidth = 13; ctx.strokeStyle = '#5ce1e6'; ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(0, 4, 104, Math.PI * 1.3, Math.PI * 1.55); ctx.stroke();
      for (const side of [-1, 1]) outlined(ctx, '#ff7eb6', 6, () => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(side * 100 - 15, -26, 30, 58, 13) : ctx.rect(side * 100 - 15, -26, 30, 58); });
      for (const side of [-1, 1]) { ctx.fillStyle = '#ffb3d4'; ctx.beginPath(); ctx.ellipse(side * 100 - side * 4, -4, 5, 14, 0, 0, R.TAU); ctx.fill(); }
      // face
      ctx.fillStyle = PINK; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.ellipse(-56, 30, 15, 9, 0, 0, R.TAU); ctx.ellipse(56, 30, 15, 9, 0, 0, R.TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = INK; ctx.lineWidth = 5;
      if (pose.eyes === 'happy') { for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 36 - 14, 10); ctx.quadraticCurveTo(side * 36, -10, side * 36 + 14, 10); ctx.stroke(); } }
      else if (pose.eyes === 'sleep') { for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 36 - 14, 6); ctx.quadraticCurveTo(side * 36, 16, side * 36 + 14, 6); ctx.stroke(); } }
      else {
        const sy = Math.max(0.08, 1 - pose.blink);
        for (const side of [-1, 1]) {
          ctx.save(); ctx.translate(side * 36, 6); ctx.scale(1, sy);
          ctx.fillStyle = '#2b1d33'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 19, 0, 0, R.TAU); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(5, -7, 6, 0, R.TAU); ctx.fill(); ctx.beginPath(); ctx.arc(-5, 7, 3, 0, R.TAU); ctx.fill();
          ctx.restore();
        }
      }
      ctx.fillStyle = PINK; ctx.beginPath(); ctx.moveTo(-6, 24); ctx.lineTo(6, 24); ctx.lineTo(0, 31); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 4;
      if (pose.mouth === 'open') { ctx.fillStyle = '#6b2a45'; ctx.beginPath(); ctx.moveTo(-12, 35); ctx.quadraticCurveTo(0, 58, 12, 35); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = PINK; ctx.beginPath(); ctx.ellipse(0, 46, 6, 4, 0, 0, R.TAU); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(-12, 33); ctx.quadraticCurveTo(-6, 40, 0, 33); ctx.quadraticCurveTo(6, 40, 12, 33); ctx.stroke(); }
      ctx.lineWidth = 2.5; ctx.globalAlpha = 0.7;
      for (const side of [-1, 1]) for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(side * 62, 30 + k * 7); ctx.lineTo(side * 98, 26 + k * 11); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.restore();
    }
    function paw(ctx, x, y, up) {
      outlined(ctx, FUR, 6, () => { ctx.beginPath(); ctx.ellipse(x, y, 20, up ? 18 : 13, 0, 0, R.TAU); });
      ctx.fillStyle = PINK;
      if (up) { ctx.beginPath(); ctx.ellipse(x, y + 4, 7, 6, 0, 0, R.TAU); ctx.fill(); for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(x + k * 8, y - 8 + Math.abs(k) * 2, 3.2, 0, R.TAU); ctx.fill(); } }
      else { ctx.strokeStyle = INK; ctx.lineWidth = 2.5; for (let k = -1; k <= 1; k += 2) { ctx.beginPath(); ctx.moveTo(x + k * 5, y - 10); ctx.lineTo(x + k * 5, y - 4); ctx.stroke(); } }
    }
    function arm(ctx, x0, y0, x1, y1) {
      ctx.lineCap = 'round'; ctx.lineWidth = 34; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.lineWidth = 26; ctx.strokeStyle = FUR; ctx.stroke();
    }
    function frameScene(ctx, t, v, dt) {
      const { w, h } = cv, { cx, deskY, s } = G;
      // room
      const bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#24154a'); bg.addColorStop(0.6, '#4a2475'); bg.addColorStop(1, '#2a1846');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      // bokeh
      ctx.globalCompositeOperation = 'lighter';
      for (const b of bokeh) { const y = ((b.y * h - t * b.sp) % (h * 0.8) + h * 0.8) % (h * 0.8); ctx.globalAlpha = 0.12 + 0.1 * Math.sin(t + b.ph) + v.level * 0.08; ctx.drawImage(api.glow(b.c, 64), b.x * w - b.r, y - b.r, b.r * 2, b.r * 2); }
      // disco ball: spots sweeping the walls
      disco += (0.4 + v.level * 0.8 + hotK) * dt;
      const bx = cx, by = Math.max(40, deskY - 330 * s) - 26 * s, br = 26 * s;
      for (let i = 0; i < 14; i++) { const a = disco + (i / 14) * R.TAU, rx = Math.cos(a), px = bx + rx * w * 0.6, py = by + 60 + Math.sin(a * 2 + i) * h * 0.22; if (Math.sin(a) < -0.2) continue; ctx.globalAlpha = (0.25 + v.beat * 0.25) * Math.max(0, Math.sin(a)); ctx.drawImage(api.glow(['#ffffff', '#ff7eb6', '#5ce1e6', '#ffd36b'][i % 4], 32), px - 10, py - 10, 20, 20); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(220,220,255,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, by - br); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.arc(bx, by, br, 0, R.TAU); ctx.clip();
      ctx.fillStyle = '#8d97b5'; ctx.fillRect(bx - br, by - br, br * 2, br * 2);
      const tile = Math.max(4, br / 4);
      for (let yy = -br; yy < br; yy += tile) for (let xx = -br; xx < br; xx += tile) { const k = (Math.floor((xx + disco * 40) / tile) + Math.floor(yy / tile)) % 3; ctx.fillStyle = k === 0 ? '#e8ecff' : k === 1 ? '#b7c0dd' : '#7a84a6'; ctx.fillRect(bx + xx + ((disco * 40) % tile) - tile, by + yy, tile - 1, tile - 1); }
      ctx.restore();
      // speakers when there is room
      if (w > 560 * s) for (const side of [-1, 1]) {
        const sx = cx + side * 300 * s, sw = 110 * s, sh = 230 * s, top = deskY + 120 * s - sh;
        ctx.fillStyle = '#1d1430'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(sx - sw / 2, top, sw, sh, 12 * s) : ctx.rect(sx - sw / 2, top, sw, sh); ctx.fill();
        for (const [k, rr] of [[0.3, 30], [0.72, 40]]) { const pump = 1 + v.bass * 0.12 + v.kick * 0.08; ctx.fillStyle = '#3a2a5a'; ctx.beginPath(); ctx.arc(sx, top + sh * k, rr * s, 0, R.TAU); ctx.fill(); ctx.fillStyle = '#120c20'; ctx.beginPath(); ctx.arc(sx, top + sh * k, rr * s * 0.72 * pump, 0, R.TAU); ctx.fill(); ctx.fillStyle = '#ff7eb6'; ctx.beginPath(); ctx.arc(sx, top + sh * k, rr * s * 0.18 * pump, 0, R.TAU); ctx.fill(); }
      }
      // floor, with the booth's glow pooled under it
      const fl = deskY + 118 * s, fg = ctx.createLinearGradient(0, fl, 0, h); fg.addColorStop(0, '#2a1846'); fg.addColorStop(1, '#140b26');
      ctx.fillStyle = fg; ctx.fillRect(0, fl, w, h - fl);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28 + v.level * 0.25;
      ctx.drawImage(api.glow('#b06bff', 64), cx - 260 * s, fl - 30 * s, 520 * s, 110 * s);
      ctx.globalAlpha = 0.18 + v.beat * 0.2; ctx.drawImage(api.glow('#ff7eb6', 64), cx - 150 * s, fl - 16 * s, 300 * s, 50 * s);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    return {
      enter() { enterT = 0; },
      swap() { swapT = 0; say('NEXT~!', 1100); scratch = 1; earV = -8; },
      onTrack(tk) { loadCover(tk); },
      resize() { cv.resize(); geo(); },
      frame(dt, t, v) {
        const ctx = cv.ctx, { w, h } = cv, { cx, deskY, s } = G;
        enterT += dt; swapT += dt;
        const asleep = !v.playing && enterT > 1.2;
        sleepK += ((asleep ? 1 : 0) - sleepK) * (1 - Math.exp(-dt * 2.5));
        hotK += ((v.hot > 0.5 ? 1 : 0) - hotK) * (1 - Math.exp(-dt * 5));
        root.classList.toggle('cd-hot', hotK > 0.5);
        frameScene(ctx, t, v, dt);
        // the cat: pops up from behind the booth when the skin opens
        const pop = enterT < 1.2 ? R.ease.elastic(Math.min(1, Math.max(0, (enterT - 0.25) / 0.95))) : 1;
        // the head nods on the song's own beat grid: down on every beat
        const ph = v.phase, bob = Math.abs(Math.sin(ph * Math.PI)) * (v.playing ? 1 : 0);
        earV += (-earL * 120 - earV * 9) * dt; earL += earV * dt; earR = earL * 0.8;
        blinkT -= dt; if (blinkT < 0) { blink = 1; blinkT = 2.5 + rnd() * 3.5; } blink = Math.max(0, blink - dt * 7);
        scratch = Math.max(0, scratch - dt * 2.5);
        const pose = {
          headY: -bob * 8 + sleepK * 14 - (v.hot > 0.5 ? bob * 6 : 0),
          tilt: (v.playing ? (Math.floor(v.beatT) % 2 ? 1 : -1) * 0.07 * bob * (0.5 + v.level) : 0) + sleepK * 0.18,
          eyes: sleepK > 0.5 ? 'sleep' : hotK > 0.5 ? 'happy' : 'open',
          mouth: hotK > 0.5 || swapT < 0.6 ? 'open' : 'w',
          blink: blink > 0.5 ? 1 : 0,
        };
        const shY = deskY - 150 * s + (1 - pop) * 260 * s + 92 * s;
        if (hotK > 0.5) {   // paws up, waving beside the head (drawn behind it)
          const wav = Math.sin(t * 9) * 12 * s;
          for (const side of [-1, 1]) { const px = cx + side * 132 * s + wav * side, py = deskY - 205 * s + bob * 10 * s + (1 - pop) * 260 * s; arm(ctx, cx + side * 66 * s, shY, px, py + 12 * s); ctx.save(); ctx.translate(px, py); ctx.scale(s, s); paw(ctx, 0, 0, true); ctx.restore(); }
        }
        ctx.save(); ctx.translate(cx, deskY - 150 * s + (1 - pop) * 260 * s); ctx.scale(s, s);
        cat(ctx, t, v, pose);
        ctx.restore();
        // booth top: two decks and a mixer
        const top = deskY - 34 * s;
        ctx.fillStyle = '#7d5cf0'; ctx.beginPath(); ctx.moveTo(cx - 176 * s, top); ctx.lineTo(cx + 176 * s, top); ctx.lineTo(cx + 196 * s, deskY); ctx.lineTo(cx - 196 * s, deskY); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(cx - 176 * s, top, 352 * s, 2.5 * s);
        const spin = t * (v.playing ? 5.5 : 0.4) - scratch * Math.sin(t * 40) * 0.8;
        for (const side of [-1, 1]) {
          const dx = cx + side * 108 * s, dy = deskY - 16 * s;
          ctx.fillStyle = '#2a1e46'; ctx.beginPath(); ctx.ellipse(dx, dy + 3 * s, 72 * s, 20 * s, 0, 0, R.TAU); ctx.fill();
          ctx.fillStyle = '#141020'; ctx.beginPath(); ctx.ellipse(dx, dy, 64 * s, 17 * s, 0, 0, R.TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; for (const rr of [0.55, 0.75, 0.9]) { ctx.beginPath(); ctx.ellipse(dx, dy, 64 * s * rr, 17 * s * rr, 0, 0, R.TAU); ctx.stroke(); }
          // label: the cover on the left deck, spinning
          ctx.save(); ctx.translate(dx, dy); ctx.scale(1, 17 / 64); ctx.rotate(spin * (side < 0 ? 1 : 0.9));
          ctx.beginPath(); ctx.arc(0, 0, 24 * s, 0, R.TAU); ctx.clip();
          if (side < 0 && cover) ctx.drawImage(cover, -24 * s, -24 * s, 48 * s, 48 * s); else { ctx.fillStyle = side < 0 ? '#ff7eb6' : '#5ce1e6'; ctx.fillRect(-24 * s, -24 * s, 48 * s, 48 * s); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-2 * s, -24 * s, 4 * s, 20 * s); }
          ctx.restore();
          ctx.fillStyle = '#e8e8f4'; ctx.beginPath(); ctx.ellipse(dx, dy, 2.5 * s, 1.2 * s, 0, 0, R.TAU); ctx.fill();
          ctx.strokeStyle = '#cfd3e6'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(dx + side * 70 * s, dy - 12 * s); ctx.lineTo(dx + side * 40 * s, dy + 4 * s); ctx.stroke();
        }
        ctx.fillStyle = '#3b2d63'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - 28 * s, deskY - 30 * s, 56 * s, 24 * s, 5 * s) : ctx.rect(cx - 28 * s, deskY - 30 * s, 56 * s, 24 * s); ctx.fill();
        for (let k = 0; k < 4; k++) { ctx.fillStyle = ['#ff7eb6', '#5ce1e6', '#ffd36b', '#7dffb0'][k]; ctx.beginPath(); ctx.arc(cx - 18 * s + k * 12 * s, deskY - 22 * s, 3.2 * s, 0, R.TAU); ctx.fill(); }
        // paws: on the decks, scratching on the beat — or both up in the chorus
        if (hotK <= 0.5) {
          const lx = cx - 108 * s + Math.sin(t * 22) * scratch * 14 * s - 10 * s, ly = deskY - 22 * s - (sleepK > 0.5 ? 0 : bob * 3 * s);
          const rx = cx + 40 * s + Math.sin(t * 3) * 4 * s * (v.playing ? 1 : 0), ry = deskY - 26 * s - (v.playing ? bob * 5 * s : 0);
          arm(ctx, cx - 70 * s, shY, lx, ly); arm(ctx, cx + 70 * s, shY, rx, ry);
          ctx.save(); ctx.translate(lx, ly); ctx.scale(s, s); paw(ctx, 0, 0, false); ctx.restore();
          ctx.save(); ctx.translate(rx, ry); ctx.scale(s, s); paw(ctx, 0, 0, false); ctx.restore();
        }
        // booth front: the cover in the middle, an LED meter each side
        const fy = deskY, fh = 118 * s, fw = 392 * s;
        ctx.fillStyle = '#6b4bd8'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - fw / 2, fy, fw, fh, 16 * s) : ctx.rect(cx - fw / 2, fy, fw, fh); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(cx - fw / 2 + 12 * s, fy + 5 * s, fw - 24 * s, 3 * s);
        const cs = 92 * s, cxx = cx - cs / 2, cyy = fy + (fh - cs) / 2;
        ctx.save(); ctx.shadowColor = '#ffd36b'; ctx.shadowBlur = (12 + v.level * 18) * s; ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cxx - 5 * s, cyy - 5 * s, cs + 10 * s, cs + 10 * s, 14 * s) : ctx.rect(cxx - 5 * s, cyy - 5 * s, cs + 10 * s, cs + 10 * s); ctx.fill(); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cxx, cyy, cs, cs, 10 * s) : ctx.rect(cxx, cyy, cs, cs); ctx.clip();
        if (cover) ctx.drawImage(cover, cxx, cyy, cs, cs); else { ctx.fillStyle = '#2b1a4f'; ctx.fillRect(cxx, cyy, cs, cs); }
        ctx.restore();
        const cols = 7, rows = 8, cw = 14 * s, chh = 9 * s;
        for (const side of [-1, 1]) for (let c = 0; c < cols; c++) {
          const b = v.bands[(side < 0 ? c : cols - 1 - c) * 3 + 2], lit = Math.round(Math.min(1, b * 1.15) * rows);
          const x = side < 0 ? cx - fw / 2 + 18 * s + c * (cw + 4 * s) : cx + cs / 2 + 18 * s + c * (cw + 4 * s);
          for (let r = 0; r < rows; r++) { ctx.fillStyle = r < lit ? (r > 5 ? '#ff7eb6' : r > 3 ? '#ffd36b' : '#5ce1e6') : 'rgba(20,12,40,.45)'; ctx.fillRect(x, fy + fh - 16 * s - (r + 1) * (chh + 3 * s), cw, chh); }
        }
        // floating notes and, when asleep, Zzz
        for (let i = notes.length - 1; i >= 0; i--) { const n = notes[i]; n.life -= dt; if (n.life <= 0) { notes.splice(i, 1); continue; } n.x += n.vx * dt + Math.sin(t * 3 + i) * 0.4; n.y += n.vy * dt; note(ctx, n.x, n.y, n.k, n.c, Math.min(1, n.life), n.rot); }
        if (sleepK > 0.5 && rnd() < dt * 1.2) zzz.push({ x: cx + 70 * s, y: deskY - 250 * s, life: 2.4, k: 10 + rnd() * 8 });
        ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle';
        for (let i = zzz.length - 1; i >= 0; i--) { const z = zzz[i]; z.life -= dt; if (z.life <= 0) { zzz.splice(i, 1); continue; } z.y -= 18 * dt; z.x += Math.sin(t * 2 + i) * 0.4; ctx.globalAlpha = Math.min(1, z.life) * sleepK; ctx.font = `700 ${Math.round(z.k * (1.6 - z.life * 0.25) * Math.max(0.7, s))}px Fredoka, sans-serif`; ctx.fillText('z', z.x, z.y); }
        ctx.globalAlpha = 1;
        root.style.setProperty('--lv', v.level.toFixed(3));
        root.style.setProperty('--bt', v.beat.toFixed(3));
      },
    };
  },
});
