/* ===================== boot: a sci-fi power-on every time the app opens (tap to skip) =====================
   A scan line switches the screen on, eight coloured segments fly in and lock into the RESKIN ring, the name decodes
   itself, a status line reports in, then the ring opens as a portal onto the skin. It waits for the app if loading takes
   longer, never the other way round. Off in settings (開機動畫) or with reduced motion: a plain quick fade. */
R.boot = (() => {
  const sp = document.getElementById('splash');
  let off = false;
  try { off = localStorage.getItem('rs-boot') === '0'; } catch (e) { off = false; }
  const plain = off || R.reduced || !sp;
  const COLS = ['#ff2bd6', '#ff7a1a', '#ffe14d', '#7cff6b', '#22f3ff', '#6d7bff', '#b06bff', '#ffb3d9'];
  const GLYPH = '▓▒░█◆◇◈⌬⏣01ABCDEF光聲影音樂新耳目換膚';
  let cv = null, ctx = null, W = 1, H = 1, D = 1, t = 0, last = 0, info = null, readyAt = -1, skip = false, openAt = -1, done = false, raf = 0;
  const TXT = '耳目一新';

  if (!plain) {
    sp.classList.add('boot');
    sp.innerHTML = `<canvas class="bt-cv"></canvas><div class="bt-txt"><b class="bt-name">${Array.from(TXT).map(() => '<span></span>').join('')}</b><small class="bt-en">RESKIN</small><div class="bt-line"></div><div class="bt-bar"><i></i></div></div><div class="bt-skip">輕點跳過</div>`;
    cv = sp.querySelector('.bt-cv'); ctx = cv.getContext('2d');
    const size = () => { D = Math.min(window.devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = Math.round(W * D); cv.height = Math.round(H * D); };
    size(); window.addEventListener('resize', size);
    sp.addEventListener('pointerdown', () => { skip = true; });
    raf = requestAnimationFrame(loop);
  }
  const segs = COLS.map((c, i) => ({ c, a0: (i / 8) * Math.PI * 2 - Math.PI / 2, fromA: Math.random() * Math.PI * 2, fromR: 1.4 + Math.random() * 0.8, at: 0.28 + i * 0.07 + Math.random() * 0.05 }));
  const easeBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  let spin = 0, clicked = new Set(), typed = 0;

  function loop(now) {
    if (done) return;
    if (!cv || !cv.isConnected) { done = true; return; }
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    t += dt;
    const ready = readyAt >= 0;
    // the portal opens once the app is ready and the show had its moment (or the person tapped)
    if (openAt < 0 && ready && (t >= 1.62 || (skip && t > 0.15))) { openAt = t; sp.classList.add('opening'); }
    const o = openAt >= 0 ? Math.min(1, (t - openAt) / 0.5) : 0;
    if (o >= 1) { finish(); return; }
    paint(dt, o, ready);
  }
  function paint(dt, o, ready) {
    const x = ctx, cx = W / 2, cy = H * 0.43, R0 = Math.min(W, H) * 0.13 + 22;
    x.setTransform(D, 0, 0, D, 0, 0);
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#04030b'; x.fillRect(0, 0, W, H);
    // faint grid that drifts up
    x.strokeStyle = 'rgba(80,90,200,.07)'; x.lineWidth = 1; x.beginPath();
    const gs = 34, off = (t * 18) % gs;
    for (let gx = (W / 2) % gs; gx < W; gx += gs) { x.moveTo(gx, 0); x.lineTo(gx, H); }
    for (let gy = -off; gy < H; gy += gs) { x.moveTo(0, gy); x.lineTo(W, gy); }
    x.stroke();
    x.globalCompositeOperation = 'lighter';
    // 1) power-on: a scan line opens across the middle
    const p1 = Math.min(1, t / 0.32);
    if (t < 0.7) {
      const a = t < 0.32 ? 1 : Math.max(0, 1 - (t - 0.32) / 0.38);
      const lw = W * easeOut(p1);
      const g = x.createLinearGradient(cx - lw / 2, 0, cx + lw / 2, 0); g.addColorStop(0, 'rgba(120,200,255,0)'); g.addColorStop(0.5, `rgba(220,240,255,${0.95 * a})`); g.addColorStop(1, 'rgba(120,200,255,0)');
      x.fillStyle = g; x.fillRect(cx - lw / 2, cy - 1.5, lw, 3);
      const h2 = 70 * Math.max(0, t - 0.2) * a; if (h2 > 0) { const g2 = x.createLinearGradient(0, cy - h2, 0, cy + h2); g2.addColorStop(0, 'rgba(60,120,255,0)'); g2.addColorStop(0.5, `rgba(80,140,255,${0.2 * a})`); g2.addColorStop(1, 'rgba(60,120,255,0)'); x.fillStyle = g2; x.fillRect(0, cy - h2, W, h2 * 2); }
    }
    // 2) the ring: eight segments fly in on curved paths and lock with a flash
    const spinV = ready && t > 1.25 ? 0.6 + Math.min(14, (t - 1.25) * 9) + o * 30 : 0.6;
    spin += dt * spinV;
    const ringR = R0 * (1 + easeOut(o) * (Math.hypot(W, H) / R0));
    const thick = Math.max(2, R0 * 0.36 * (1 - o * 0.85));
    for (const s of segs) {
      const k = Math.max(0, Math.min(1, (t - s.at) / 0.42));
      if (k <= 0) continue;
      const e = easeBack(k);
      const a = s.a0 + spin + (1 - e) * (s.fromA * 0.6 + 2.2);
      const r = ringR * (s.fromR + (1 - s.fromR) * e);
      x.strokeStyle = s.c; x.lineWidth = thick; x.lineCap = 'butt';
      x.globalAlpha = Math.min(1, k * 2) * (1 - o * 0.4);
      x.shadowColor = s.c; x.shadowBlur = 18;
      x.beginPath(); x.arc(cx, cy, r, a + 0.05, a + Math.PI / 4 - 0.05); x.stroke();
      x.shadowBlur = 0;
      if (k >= 1 && !clicked.has(s)) { clicked.add(s); s.flash = 1; }
      if (s.flash > 0) { s.flash -= dt * 4; const mx = cx + Math.cos(a + Math.PI / 8) * r, my = cy + Math.sin(a + Math.PI / 8) * r; const g = x.createRadialGradient(mx, my, 0, mx, my, 40); g.addColorStop(0, R.color.rgba('#ffffff', 0.8 * Math.max(0, s.flash))); g.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = 1; x.fillStyle = g; x.fillRect(mx - 40, my - 40, 80, 80); }
    }
    x.globalAlpha = 1;
    // grooves over the ring
    if (t > 0.6 && o < 0.6) { x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; for (let r = ringR - thick / 2 + 4; r < ringR + thick / 2; r += 5) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke(); } }
    // 3) the core lights up
    const c = Math.max(0, Math.min(1, (t - 0.9) / 0.25));
    if (c > 0) {
      const pulse = 1 + 0.08 * Math.sin(t * 9);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, R0 * 0.7 * pulse); g.addColorStop(0, `rgba(255,255,255,${c})`); g.addColorStop(0.32, `rgba(255,255,255,${0.9 * c})`); g.addColorStop(0.45, `rgba(34,243,255,${0.45 * c})`); g.addColorStop(1, 'rgba(34,243,255,0)');
      x.fillStyle = g; x.fillRect(cx - R0, cy - R0, R0 * 2, R0 * 2);
      if (t < 1.25) { const f = 1 - (t - 0.9) / 0.35; x.fillStyle = `rgba(200,240,255,${0.5 * f})`; x.fillRect(cx - W * f, cy - 1, W * 2 * f, 2); }
    }
    // the opening portal: everything inside the ring is cut away, showing the skin
    if (o > 0) {
      x.globalCompositeOperation = 'destination-out';
      x.fillStyle = '#000'; x.beginPath(); x.arc(cx, cy, Math.max(0, ringR - thick * 0.6), 0, Math.PI * 2); x.fill();
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, ringR - thick * 0.6, 0, Math.PI * 2); x.stroke();
    }
    x.globalCompositeOperation = 'source-over';
    // 4) text: the name decodes, RESKIN tightens, the status types itself
    const spans = sp.querySelectorAll('.bt-name span');
    spans.forEach((el, i) => {
      const at = 0.55 + i * 0.12;
      if (t < at - 0.25) { el.textContent = ''; return; }
      el.textContent = t < at ? GLYPH[Math.floor(Math.random() * GLYPH.length)] : TXT[i];
      el.classList.toggle('lit', t >= at);
    });
    sp.classList.toggle('t1', t > 0.5); sp.classList.toggle('t2', t > 0.95);
    const line = sp.querySelector('.bt-line');
    const msg = info ? `SYSTEM ONLINE · ${info.skins} SKINS · ${info.songs ? info.songs + ' 首' : 'NO TRACKS'} · ${info.skin}` : 'LOADING';
    if (t > 0.95) { typed = Math.min(msg.length, typed + dt * 70); line.textContent = '> ' + msg.slice(0, Math.floor(typed)) + (Math.floor(t * 4) % 2 ? '_' : ''); }
    const bar = sp.querySelector('.bt-bar i');
    bar.style.width = (ready ? Math.min(100, Math.max(0, (t - 0.6) / 0.9) * 100) : (30 + 40 * Math.abs(Math.sin(t * 1.6)))).toFixed(1) + '%';
  }
  function finish() {
    if (done) return;
    done = true; cancelAnimationFrame(raf);
    sp.classList.add('off');
    setTimeout(() => sp.remove(), plain ? 600 : 350);
  }
  // main.js: the skin is on screen (info: what to report)
  function ready(i) {
    info = i;
    if (plain) { setTimeout(() => sp.classList.add('off'), 120); setTimeout(() => sp.remove(), 900); return; }
    readyAt = t;
    if (R.settings.get('sfx') && R.sfx.ctx() && R.sfx.ctx().state === 'running') R.sfx.play('boot');
  }
  function setEnabled(on) { try { localStorage.setItem('rs-boot', on ? '1' : '0'); } catch (e) { /* ignore */ } }
  const enabled = () => { try { return localStorage.getItem('rs-boot') !== '0'; } catch (e) { return true; } };
  return { ready, setEnabled, enabled, active: () => !done && !plain };
})();
