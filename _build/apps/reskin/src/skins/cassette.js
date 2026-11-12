/* ===================== skin: 卡帶隨身聽 — reels shrink and grow with the song; hold FF/REW to wind ===================== */
R.skins.def({
  id: 'cassette', name: '卡帶隨身聽', group: '復古', en: 'TAPE DECK',
  desc: '磁帶捲軸跟著轉，按住快轉鍵兩個捲軸一起狂轉',
  theme: { bg: '#ffb84d', fg: '#2b2230', accent: '#ff5a36', accent2: '#1fb5a6', ui: 'rgba(43,34,48,.98)', dock: 'rgba(255,255,255,.5)', dockfg: '#2b2230' },
  enterMs: 1500,
  emblem: `<svg class="em" viewBox="0 0 116 150"><rect width="116" height="150" fill="#ffc35c"/><g fill="#1fb5a6"><circle cx="16" cy="18" r="5"/><circle cx="100" cy="132" r="7"/></g><path d="M86 10l12 8-12 8" fill="none" stroke="#ff5a36" stroke-width="4"/><rect x="12" y="40" width="92" height="62" rx="7" fill="#2b2b31"/><rect x="18" y="46" width="80" height="34" rx="3" fill="#f4ead2"/><rect x="18" y="46" width="80" height="7" fill="#ff5a36"/><rect x="18" y="53" width="80" height="4" fill="#ffc35c"/><rect x="34" y="62" width="48" height="16" rx="8" fill="#3b2a22"/><circle cx="44" cy="70" r="6" fill="#f2f2f2"/><circle cx="72" cy="70" r="6" fill="#f2f2f2"/><g fill="#555"><circle cx="44" cy="70" r="2"/><circle cx="72" cy="70" r="2"/></g><path d="M40 98h36l-4-10H44z" fill="#4a4a52"/><path d="M26 114q16-8 32 0t32 0" fill="none" stroke="#2b2230" stroke-width="3" stroke-linecap="round"/></svg>`,
  sfx: {
    tap(s, t) { s.noise(t, { f: 1800, dur: 0.03, v: 0.1, q: 1.5 }); s.tone(t, { f: 260, f2: 160, dur: 0.04, v: 0.08, type: 'square', lp: 1200 }); },
    tick(s, t) { s.noise(t, { f: 2600, dur: 0.02, v: 0.06 }); },
    toggle(s, t) { s.noise(t, { f: 2200, dur: 0.03, v: 0.1, q: 2 }); s.tone(t + 0.02, { f: 180, f2: 120, dur: 0.05, v: 0.1, type: 'square', lp: 900 }); },
    play(s, t) { s.noise(t, { f: 1500, dur: 0.04, v: 0.14, q: 1.5 }); s.tone(t, { f: 140, f2: 80, dur: 0.07, v: 0.14, type: 'square', lp: 700 }); s.tone(t + 0.12, { f: 60, dur: 0.3, v: 0.04, type: 'sawtooth', lp: 200 }); },
    pause(s, t) { s.noise(t, { f: 1300, dur: 0.05, v: 0.14, q: 1.5 }); s.tone(t, { f: 120, f2: 70, dur: 0.08, v: 0.14, type: 'square', lp: 700 }); },
    next(s, t) { s.tone(t, { f: 300, f2: 1400, dur: 0.35, v: 0.05, type: 'sawtooth', lp: 2500, glide: 0.3 }); s.noise(t + 0.33, { f: 1500, dur: 0.04, v: 0.12 }); },
    prev(s, t) { s.tone(t, { f: 1400, f2: 300, dur: 0.35, v: 0.05, type: 'sawtooth', lp: 2500, glide: 0.3 }); s.noise(t + 0.33, { f: 1500, dur: 0.04, v: 0.12 }); },
    wind(s, t) { s.tone(t, { f: 900, f2: 1100, dur: 0.12, v: 0.035, type: 'sawtooth', lp: 3000 }); },
    enter(s, t) { s.noise(t, { f: 900, dur: 0.06, v: 0.12 }); s.tone(t + 0.25, { f: 200, f2: 90, dur: 0.12, v: 0.1, type: 'square', lp: 800 }); s.noise(t + 0.55, { f: 2000, dur: 0.05, v: 0.14 }); s.tone(t + 0.56, { f: 150, f2: 90, dur: 0.07, v: 0.12, type: 'square', lp: 700 }); },
    open(s, t) { s.noise(t, { f: 2000, dur: 0.03, v: 0.08 }); },
    close(s, t) { s.noise(t, { f: 1500, dur: 0.03, v: 0.08 }); },
    ok(s, t) { s.notes(t, [s.hz(74), s.hz(79)], { dur: 0.12, v: 0.07, type: 'square', gap: 0.07, lp: 2500 }); },
  },
  mount(root, api) {
    const I = R.I;
    const col = (n) => `<i>${'0123456789'.split('').join('<br>')}</i>`;
    root.innerHTML = `<div class="cs-bg"></div>
      <div class="cs-wrap">
        <div class="cs-dev">
          <div class="cs-keys" data-ui>
            <button type="button" class="key" data-cs="rew" aria-label="倒帶（按住）／上一首">${I.prev}<span>REW</span></button>
            <button type="button" class="key k-play" data-cs="play" aria-label="播放">${I.play}<span>PLAY</span></button>
            <button type="button" class="key" data-cs="stop" aria-label="停止"><svg viewBox="0 0 24 24" class="fi"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg><span>STOP</span></button>
            <button type="button" class="key" data-cs="ff" aria-label="快轉（按住）／下一首">${I.next}<span>FF</span></button>
          </div>
          <div class="cs-face">
            <div class="cs-brand"><b>RESKIN</b><span>STEREO CASSETTE · AUTO REVERSE</span><i class="rec"></i></div>
            <div class="cs-win"><canvas class="cs-cv"></canvas><div class="cs-glass"></div></div>
            <div class="cs-row" data-ui>
              <div class="cs-ctr"><span>${col()}</span><span>${col()}</span><span>${col()}</span></div>
              <div class="cs-vu"><div><i></i></div><div><i></i></div></div>
              <div class="cs-time"><b data-bind="time">0:00</b><small data-bind="rem">-0:00</small></div>
            </div>
            <div class="seek cs-seek" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div></div>
          </div>
        </div>
        <div class="cs-jcard" data-ui><div class="cs-stripes"></div><div class="cs-t" data-bind="title"></div><div class="cs-a" data-bind="artist"></div><div class="cs-sw">
          <button type="button" class="slide c-shuf" data-act="shuffle" aria-label="隨機播放"><i></i>SHUFFLE</button>
          <button type="button" class="slide c-rep" data-act="repeat" aria-label="循環播放"><i></i><span class="rp">LOOP</span></button>
        </div></div>
      </div>`;
    const cv = api.canvas(root.querySelector('.cs-cv'));
    const ctrCols = Array.from(root.querySelectorAll('.cs-ctr span i'));
    const vuEls = Array.from(root.querySelectorAll('.cs-vu i'));
    let aL = 0, aR = 0, wind = 0, hold = null, enterT = 9, label = { t: '', a: '' };
    const setLabel = (t) => { label = t ? { t: t.title, a: t.artist || '' } : { t: R.lib.count() ? 'SIDE A' : 'BLANK TAPE', a: '' }; };
    setLabel(api.track());
    // keys
    const keys = root.querySelector('.cs-keys');
    keys.addEventListener('pointerdown', (e) => {
      const k = e.target.closest('[data-cs]'); if (!k) return;
      const a = k.dataset.cs;
      k.classList.add('down');
      if (a === 'rew' || a === 'ff') {
        const dir = a === 'ff' ? 1 : -1;
        hold = { dir, el: k, t: 0, scrub: false, iv: 0 };
        R.player.prime();
        hold.to = setTimeout(() => {
          if (!hold) return; hold.scrub = true; wind = dir;
          hold.iv = setInterval(() => { if (!hold) return; R.player.seek(R.player.time() + dir * 1.6); api.sfx('wind'); }, 110);
        }, 360);
      }
    });
    const release = (e, cancel) => {
      const k = e.target.closest && e.target.closest('[data-cs]');
      root.querySelectorAll('.key.down').forEach((x) => x.classList.remove('down'));
      if (!hold) return;
      const h = hold; hold = null; clearTimeout(h.to); clearInterval(h.iv); wind = 0;
      if (!h.scrub && !cancel && k === h.el) { if (h.dir > 0) R.actions.next(); else R.actions.prev(); }
    };
    keys.addEventListener('pointerup', (e) => release(e, false));
    keys.addEventListener('pointercancel', (e) => release(e, true));
    keys.addEventListener('pointerleave', (e) => { if (hold && !hold.scrub) release(e, true); });
    keys.addEventListener('click', (e) => {
      const k = e.target.closest('[data-cs]'); if (!k) return;
      if (k.dataset.cs === 'play' && !R.player.wants()) R.actions.toggle();
      if (k.dataset.cs === 'stop' && R.player.wants()) R.actions.toggle();
      if (k.dataset.cs === 'stop' && !R.player.wants()) api.sfx('tap');
    });
    const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    function reel(ctx, x, y, rPack, rHub, a) {
      ctx.fillStyle = '#2e1a10'; ctx.beginPath(); ctx.arc(x, y, rPack, 0, R.TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(170,110,70,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, rPack - 0.8, 0, R.TAU); ctx.stroke();
      const g = ctx.createRadialGradient(x, y, rHub, x, y, rPack); g.addColorStop(0, 'rgba(255,255,255,.04)'); g.addColorStop(0.7, 'rgba(255,220,180,.08)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rPack, 0, R.TAU); ctx.fill();
      ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(x, y, rHub, 0, R.TAU); ctx.fill();
      ctx.fillStyle = '#2b2b31'; ctx.beginPath(); ctx.arc(x, y, rHub * 0.55, 0, R.TAU); ctx.fill();
      ctx.fillStyle = '#f2f2f2';
      for (let i = 0; i < 6; i++) { const t = a + (i / 6) * R.TAU; ctx.save(); ctx.translate(x, y); ctx.rotate(t); ctx.fillRect(-rHub * 0.1, rHub * 0.25, rHub * 0.2, rHub * 0.32); ctx.restore(); }
    }
    return {
      onTrack: setLabel,
      enter() { enterT = 0; },
      resize() { cv.resize(); },
      destroy() { if (hold) { clearTimeout(hold.to); clearInterval(hold.iv); hold = null; } },
      frame(dt, t, v) {
        enterT += dt;
        const { ctx, w, h } = cv; cv.clear();
        const p = Math.min(1, v.progress);
        // cassette shell
        const slide = R.ease.out(Math.min(1, Math.max(0, (enterT - 0.2) / 0.5)));
        ctx.save(); ctx.translate(0, (1 - slide) * -h * 1.1);
        const sx = w * 0.04, sy = h * 0.06, sw = w * 0.92, sh = h * 0.9;
        ctx.fillStyle = '#26262b'; rr(ctx, sx, sy, sw, sh, 10); ctx.fill();
        ctx.fillStyle = '#9aa0a8'; for (const [px, py] of [[sx + 10, sy + 10], [sx + sw - 10, sy + 10], [sx + 10, sy + sh - 10], [sx + sw - 10, sy + sh - 10]]) { ctx.beginPath(); ctx.arc(px, py, 3, 0, R.TAU); ctx.fill(); }
        // label
        const lx = sx + sw * 0.07, ly = sy + sh * 0.08, lw = sw * 0.86, lh = sh * 0.62;
        ctx.fillStyle = '#f4ead2'; rr(ctx, lx, ly, lw, lh, 5); ctx.fill();
        ctx.fillStyle = '#ff5a36'; ctx.fillRect(lx, ly + lh * 0.04, lw, lh * 0.1);
        ctx.fillStyle = '#ffc35c'; ctx.fillRect(lx, ly + lh * 0.14, lw, lh * 0.06);
        ctx.fillStyle = '#1fb5a6'; ctx.fillRect(lx, ly + lh * 0.2, lw, lh * 0.04);
        ctx.fillStyle = '#2b2230'; ctx.font = `400 ${Math.round(lh * 0.13)}px Bungee, sans-serif`; ctx.textBaseline = 'middle'; ctx.fillText('A', lx + lw * 0.03, ly + lh * 0.38);
        ctx.strokeStyle = 'rgba(43,34,48,.18)'; ctx.lineWidth = 1; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(lx + lw * 0.12, ly + lh * (0.44 + k * 0.17)); ctx.lineTo(lx + lw * 0.95, ly + lh * (0.44 + k * 0.17)); ctx.stroke(); }
        ctx.save(); ctx.translate(lx + lw * 0.13, ly + lh * 0.37); ctx.rotate(-0.025);
        ctx.fillStyle = '#1d3f9e';
        let fs = Math.round(lh * 0.16); ctx.font = `400 ${fs}px "Permanent Marker", "PingFang TC", "Noto Sans TC", sans-serif`;
        while (ctx.measureText(label.t).width > lw * 0.8 && fs > 9) { fs--; ctx.font = `400 ${fs}px "Permanent Marker", "PingFang TC", "Noto Sans TC", sans-serif`; }
        ctx.fillText(label.t, 0, 0);
        ctx.font = `400 ${Math.round(lh * 0.1)}px "Permanent Marker", "PingFang TC", sans-serif`; ctx.fillStyle = '#c0392b';
        ctx.fillText(label.a.slice(0, 40), lw * 0.01, lh * 0.17);
        ctx.restore();
        // tape window with reels
        const wx = lx + lw * 0.2, wy = ly + lh * 0.66, ww = lw * 0.6, wh = lh * 0.3;
        const rMax = wh * 1.05, rHub = wh * 0.3;
        const rL = rHub + (rMax - rHub) * Math.sqrt(Math.max(0.02, 1 - p)), rR = rHub + (rMax - rHub) * Math.sqrt(Math.max(0.02, p));
        const speed = wind ? wind * 900 : v.playing ? 46 : 0;
        aL += (speed / rL) * dt; aR += (speed / rR) * dt;
        ctx.save(); rr(ctx, wx, wy, ww, wh, wh / 2); ctx.clip();
        ctx.fillStyle = '#6a6470'; ctx.fillRect(wx, wy, ww, wh);
        ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(wx, wy, ww, wh * 0.45);
        reel(ctx, wx + ww * 0.22, wy + wh / 2, rL, rHub * 0.9, aL);
        reel(ctx, wx + ww * 0.78, wy + wh / 2, rR, rHub * 0.9, aR);
        ctx.restore();
        ctx.strokeStyle = '#2b2230'; ctx.lineWidth = 2; rr(ctx, wx, wy, ww, wh, wh / 2); ctx.stroke();
        // bottom: head opening and tape path
        const by = sy + sh * 0.84;
        ctx.fillStyle = '#3a3a42'; ctx.beginPath(); ctx.moveTo(sx + sw * 0.24, sy + sh); ctx.lineTo(sx + sw * 0.3, by); ctx.lineTo(sx + sw * 0.7, by); ctx.lineTo(sx + sw * 0.76, sy + sh); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#5a3a24'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(sx + sw * 0.27, sy + sh * 0.96); ctx.lineTo(sx + sw * 0.73, sy + sh * 0.96); ctx.stroke();
        ctx.fillStyle = '#c9ced6'; rr(ctx, sx + sw * 0.46, sy + sh * 0.93, sw * 0.08, sh * 0.06, 2); ctx.fill();
        ctx.restore();
        // counter (rolling digits) and LED meters
        const c = Math.floor(R.player.time() * 1.7) % 1000;
        const ds = [Math.floor(c / 100), Math.floor(c / 10) % 10, c % 10];
        for (let i = 0; i < 3; i++) ctrCols[i].style.transform = `translateY(${(-ds[i] * 10).toFixed(2)}%)`;
        const L = Math.min(1, v.level * 0.95 + v.bass * 0.1), Rr = Math.min(1, v.level * 0.9 + v.high * 0.2);
        vuEls[0].style.setProperty('--h', (v.playing ? L : 0).toFixed(3)); vuEls[1].style.setProperty('--h', (v.playing ? Rr : 0).toFixed(3));
      },
    };
  },
});
