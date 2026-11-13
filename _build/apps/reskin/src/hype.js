/* ===================== chorus overlay: when a song reaches its chorus or drop, every skin goes all out ===================== *
   A shockwave and (if allowed) a flash when the chorus starts, confetti cannons, confetti on strong beats and light beams
   sweeping from the top while it lasts. A skin can turn it down with def.hype: 'lite' (no beams, no beat confetti) or
   false (the skin does its own chorus show). Nothing is drawn, and nothing costs anything, outside a chorus. */
R.hype = (() => {
  const cv = R.$('#hype');
  const ctx = cv.getContext('2d');
  let W = 1, H = 1, D = 1, live = false, flashA = 0, beamA = 0, beamAim = 0, t = 0;
  const conf = [], rings = [];
  const size = () => {
    D = Math.max(0.75, Math.min(window.devicePixelRatio || 1, 2) * R.quality());
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * D); cv.height = Math.round(H * D);
  };
  size();
  window.addEventListener('resize', size);
  R.bus.on('quality', size);
  const mode = () => { const d = R.stage.current(); return !d ? false : d.hype === undefined ? 'full' : d.hype; };
  const palette = () => {
    const d = R.stage.current(), th = (d && d.theme) || {};
    return [th.accent || '#ff2bd6', th.accent2 || '#22f3ff', '#ffffff', '#ffe14d', R.color.mix(th.accent || '#ff2bd6', '#ffffff', 0.4)];
  };
  // confetti from the two bottom corners, aimed up and inwards
  function cannons(n) {
    if (R.reduced) n = Math.round(n / 3);
    const pal = palette();
    for (let i = 0; i < n; i++) {
      const left = i % 2 === 0, a = -Math.PI / 2 + (left ? 1 : -1) * (0.18 + Math.random() * 0.42);
      const sp = H * (1.05 + Math.random() * 0.75);
      conf.push({
        x: left ? -10 : W + 10, y: H + 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: Math.random() * 6.3, vr: (Math.random() - 0.5) * 18, w: 5 + Math.random() * 6, h: 3 + Math.random() * 4,
        col: pal[Math.floor(Math.random() * pal.length)], life: 2.8 + Math.random() * 1.6, sway: Math.random() * 6.3,
      });
    }
    if (conf.length > 420) conf.splice(0, conf.length - 420);
  }
  R.bus.on('hot', (on) => {
    const m = mode();
    if (!on || !m || document.hidden) return;
    rings.push({ r: 0, a: 0.9 }, { r: -60, a: 0.6 });
    if (R.settings.get('flash') && !R.reduced) flashA = 0.32;
    cannons(m === 'full' ? 110 : 70);
    live = true;
  });
  // in the chorus the confetti cannons fire on the bar's 1 and 3 (more on the 1)
  R.viz.onBeat((s, i) => {
    if (R.viz.hot < 0.6 || mode() !== 'full') return;
    if (i && i.bpos >= 0 ? !(i.down || i.bpos === 2) : s < 0.6) return;
    cannons((i && i.down ? 6 : 3) + Math.round(s * 5));
    live = true;
  });
  // one soft light beam, drawn once and reused
  const beam = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 512; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(58, 0); x.lineTo(70, 0); x.lineTo(128, 512); x.lineTo(0, 512); x.closePath(); x.fill();
    return c;
  })();
  const tinted = new Map();
  function beamOf(col) {
    if (tinted.has(col)) return tinted.get(col);
    const c = document.createElement('canvas'); c.width = beam.width; c.height = beam.height; const x = c.getContext('2d');
    x.drawImage(beam, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    tinted.set(col, c); if (tinted.size > 12) tinted.delete(tinted.keys().next().value);
    return c;
  }
  function frame(dt) {
    const v = R.viz, m = mode();
    beamAim = m === 'full' && !R.reduced ? v.hot : 0;
    beamA += (beamAim - beamA) * (1 - Math.exp(-dt * 3));
    if (!live && beamA < 0.01) return;
    t += dt;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(D, 0, 0, D, 0, 0);
    let busy = false;
    if (beamA > 0.01) {
      busy = true;
      const pal = palette(), L = Math.max(W, H) * 1.25;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const left = i < 2, x0 = left ? W * (0.08 + i * 0.1) : W * (0.92 - (i - 2) * 0.1);
        const ang = (left ? 1 : -1) * (0.25 + 0.35 * Math.sin(t * (0.9 + i * 0.23) + i * 1.7));
        ctx.save(); ctx.translate(x0, -20); ctx.rotate(ang);
        ctx.globalAlpha = beamA * (0.1 + v.level * 0.22 + v.beat * 0.12);
        ctx.drawImage(beamOf(pal[i % 2]), -L * 0.12, 0, L * 0.24, L);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
    // shockwave rings from the middle of the screen
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.r += dt * Math.max(W, H) * 1.3; r.a -= dt * 0.9;
      if (r.a <= 0) { rings.splice(i, 1); continue; }
      if (r.r <= 0) continue;
      busy = true;
      ctx.strokeStyle = R.color.rgba(palette()[0], r.a); ctx.lineWidth = 10 * r.a + 2;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, r.r, 0, R.TAU); ctx.stroke();
    }
    if (flashA > 0.004) { busy = true; ctx.fillStyle = `rgba(255,255,255,${flashA})`; ctx.fillRect(0, 0, W, H); flashA *= Math.exp(-dt * 7); }
    // confetti
    const g = H * 1.15;
    for (let i = conf.length - 1; i >= 0; i--) {
      const p = conf[i];
      p.life -= dt;
      if (p.life <= 0 || p.y > H + 40) { conf.splice(i, 1); continue; }
      p.vy += g * dt; p.vx *= Math.exp(-dt * 1.6); p.vy *= Math.exp(-dt * (p.vy > 0 ? 2.6 : 0.9));
      p.sway += dt * 4; p.x += (p.vx + Math.sin(p.sway) * 40) * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      busy = true;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.cos(p.sway * 1.3));
      ctx.globalAlpha = Math.min(1, p.life * 1.5); ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    live = busy || conf.length > 0;
    if (!live && beamA <= 0.01) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); }
  }
  return { frame, burst: () => R.bus.emit('hot', true), count: () => conf.length, live: () => live || beamA > 0.01 };
})();
