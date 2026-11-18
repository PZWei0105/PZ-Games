/* ===================== skin: 毛玻璃 FROSTED — calm, colours taken from the album art ===================== */
R.skins.def({
  id: 'glass', punch: 0.7, name: '毛玻璃', group: '極簡', en: 'FROSTED',
  desc: '自動從專輯封面取色，清爽耐看',
  bloom: { s: 0.2, th: 0.82 }, hero: '.gl-art', trans: 'shatter',
  theme: { bg: '#10131c', fg: '#ffffff', accent: '#9cc2ff', accent2: '#ffc4e6', ui: 'rgba(22,24,34,.97)', dock: 'rgba(255,255,255,.14)', dockfg: '#fff' },
  enterMs: 1200,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><radialGradient id="gla" cx=".3" cy=".25" r=".9"><stop offset="0" stop-color="#ffb3d9"/><stop offset=".5" stop-color="#8db4ff"/><stop offset="1" stop-color="#1b2140"/></radialGradient></defs><rect width="116" height="150" fill="url(#gla)"/><rect x="18" y="26" width="80" height="98" rx="14" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.55)"/><rect x="28" y="36" width="60" height="44" rx="8" fill="rgba(255,255,255,.55)"/><rect x="28" y="88" width="44" height="5" rx="2.5" fill="#fff"/><rect x="28" y="98" width="30" height="4" rx="2" fill="rgba(255,255,255,.6)"/><circle cx="58" cy="113" r="5" fill="#fff"/></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 1500, dur: 0.04, v: 0.05, type: 'sine' }); },
    tick(s, t) { s.tone(t, { f: 2200, dur: 0.02, v: 0.035, type: 'sine' }); },
    toggle(s, t) { s.tone(t, { f: 980, dur: 0.06, v: 0.06, type: 'sine' }); },
    play(s, t) { s.tone(t, { f: 660, f2: 990, dur: 0.18, v: 0.08, type: 'sine', glide: 0.08 }); },
    pause(s, t) { s.tone(t, { f: 990, f2: 620, dur: 0.16, v: 0.07, type: 'sine', glide: 0.08 }); },
    next(s, t) { s.noise(t, { f: 1800, f2: 5200, dur: 0.16, v: 0.05, type: 'bandpass', q: 1.2 }); s.tone(t + 0.02, { f: 1320, dur: 0.08, v: 0.04 }); },
    prev(s, t) { s.noise(t, { f: 5200, f2: 1800, dur: 0.16, v: 0.05, type: 'bandpass', q: 1.2 }); s.tone(t + 0.02, { f: 990, dur: 0.08, v: 0.04 }); },
    enter(s, t) { s.notes(t, [s.hz(76), s.hz(83), s.hz(88)], { dur: 0.5, v: 0.05, type: 'sine', gap: 0.09 }); },
    open(s, t) { s.tone(t, { f: 700, f2: 1050, dur: 0.14, v: 0.05 }); },
    close(s, t) { s.tone(t, { f: 1050, f2: 700, dur: 0.12, v: 0.045 }); },
    ok(s, t) { s.notes(t, [s.hz(81), s.hz(88)], { dur: 0.2, v: 0.06, gap: 0.08 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="gl-bg"></canvas><div class="gl-veil"></div>
      <div class="gl-card">
        <div class="gl-art"><img data-bind="cover" alt="" draggable="false"></div>
        <div class="gl-info" data-ui>
          <div class="gl-now"><span class="gl-dot"></span>正在播放<span class="gl-idx" data-bind="idx"></span></div>
          <div class="gl-t" data-bind="title"></div>
          <div class="gl-a" data-bind="artist"></div>
          <canvas class="gl-spec"></canvas>
          ${R.ui.seek('gl-seek')}
          ${R.ui.ctrl('gl-ctrl')}
        </div>
      </div>`;
    const bg = api.canvas(root.querySelector('.gl-bg'), { dprMax: 1, scale: 0.5, alpha: false });
    const sp = api.canvas(root.querySelector('.gl-spec'));
    const blur = document.createElement('canvas'); blur.width = blur.height = 128;
    let pal = api.colors(), hasArt = false, fade = 0;
    const B = [0, 1, 2, 3].map((i) => ({ s: i * 13.7 }));

    function makeBlur(im) {
      // repeated down/up scaling is a cheap gaussian: no CSS blur filter on a full-screen layer
      const a = document.createElement('canvas'), b = document.createElement('canvas');
      a.width = a.height = 24; b.width = b.height = 6;
      a.getContext('2d').drawImage(im, 0, 0, 24, 24);
      const bx = b.getContext('2d'); bx.imageSmoothingQuality = 'high'; bx.drawImage(a, 0, 0, 6, 6);
      const x = blur.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      const m = document.createElement('canvas'); m.width = m.height = 24;
      m.getContext('2d').drawImage(b, 0, 0, 24, 24);
      x.clearRect(0, 0, 128, 128); x.drawImage(m, 0, 0, 128, 128);
      hasArt = true; fade = 0;
    }
    function onTrack(t) {
      pal = api.colors(t);
      api.setTheme({ accent: pal.vibrant, accent2: pal.light, bg: R.color.mix(pal.dark, '#000000', 0.3) });
      root.style.setProperty('--gl-acc', pal.vibrant);
      if (!t) { hasArt = false; return; }
      api.coverImage(t).then((im) => { if (im && api.track() && api.track().id === t.id) makeBlur(im); });
    }
    return {
      onTrack,
      resize() { bg.resize(); sp.resize(); },
      frame(dt, t, v) {
        const { ctx, w, h } = bg;
        fade = Math.min(1, fade + dt * 1.5);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = pal.dark; ctx.fillRect(0, 0, w, h);
        if (hasArt) {
          const s = Math.max(w, h) * (1.25 + v.bass * 0.06);
          ctx.globalAlpha = 0.85 * fade;
          ctx.drawImage(blur, (w - s) / 2 + Math.sin(t * 0.07) * w * 0.06, (h - s) / 2 + Math.cos(t * 0.05) * h * 0.05, s, s);
          ctx.globalAlpha = 1;
        }
        ctx.globalCompositeOperation = 'screen';
        const cols = [pal.vibrant, pal.light, pal.avg, pal.vibrant];
        for (let i = 0; i < 4; i++) {
          const b = B[i];
          const x = w * (0.2 + 0.6 * R.noise1(t * 0.05 + b.s, 1)), y = h * (0.15 + 0.7 * R.noise1(t * 0.04 + b.s, 2));
          const r = Math.max(w, h) * (0.32 + 0.1 * i / 3) * (1 + v.level * 0.12 + (i === 0 ? v.pump * 0.12 + v.down * 0.05 : i === 1 ? v.kickE * 0.05 : 0));
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, R.color.rgba(cols[i], 0.32 + v.level * 0.12)); g.addColorStop(1, R.color.rgba(cols[i], 0));
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        }
        ctx.globalCompositeOperation = 'source-over';
        // spectrum: one smooth mirrored ribbon
        const sx = sp.ctx; sp.clear();
        const W = sp.w, H = sp.h, n = 24, mid = H / 2;
        sx.beginPath();
        for (let i = 0; i <= n; i++) {
          const b = v.bands[Math.min(31, Math.round((i / n) * 28) + 1)];
          const x = (i / n) * W, y = mid - (2 + Math.min(1, b * 1.35) * mid * 0.95) * (0.3 + 0.7 * Math.sin((i / n) * Math.PI));
          if (i === 0) sx.moveTo(x, y); else { const px = ((i - 0.5) / n) * W; sx.quadraticCurveTo(px, y, x, y); }
        }
        for (let i = n; i >= 0; i--) {
          const b = v.bands[Math.min(31, Math.round((i / n) * 28) + 1)];
          const x = (i / n) * W, y = mid + (2 + Math.min(1, b * 1.35) * mid * 0.95) * (0.3 + 0.7 * Math.sin((i / n) * Math.PI));
          sx.lineTo(x, y);
        }
        sx.closePath();
        const g = sx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, 'rgba(255,255,255,.15)'); g.addColorStop(0.5, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,.15)');
        sx.fillStyle = g; sx.fill();
        root.style.setProperty('--gl-pulse', Math.min(1, v.level * 0.5 + v.pump * 0.45 + v.down * 0.2).toFixed(3));
      },
    };
  },
});
