/* ===================== skin: 聲紋山脈 SPECTRAL RIDGE — fly over the song's spectrum =====================
   A neon wireframe landscape rolls towards you down a highway. Each new ridge on the horizon is the spectrum at that
   moment (highs beside the road, the bass as the big mountains further out), so the song's sound becomes the mountains
   you fly over. The beat's first ridge of every bar is lit, so the bars stream past; the kick lifts the camera, the
   striped sun (with the cover glowing in it) swells with the bass, and in the chorus the speed doubles, the colours
   turn and shooting stars cross the sky. Drawn far to near, each ridge hides what is behind it. */
R.skins.def({
  id: 'ridge', name: '聲紋山脈', group: '酷炫', en: 'SPECTRAL RIDGE',
  desc: '霓虹線框山脈朝你湧來：每一道山稜都是這首歌當下的頻譜，夕陽裡映著封面；每小節第一拍亮一道，副歌加速衝刺',
  bloom: { s: 0.7, th: 0.42, tint: '#ff7ad9' }, hero: '.rg-art', trans: 'portal', hype: 'lite',
  theme: { bg: '#0b0420', fg: '#fdf0ff', accent: '#ff3fd1', accent2: '#3ff2ff', ui: 'rgba(14,6,32,.97)', dock: 'rgba(30,10,52,.5)', dockfg: '#ff9ce8' },
  enterMs: 1900, swapMs: 1300, punch: 0.6,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="rgs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0638"/><stop offset=".55" stop-color="#5a0e6e"/><stop offset="1" stop-color="#ff4f9a"/></linearGradient><linearGradient id="rgu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe76a"/><stop offset="1" stop-color="#ff3fa0"/></linearGradient></defs><rect width="116" height="150" fill="url(#rgs)"/><circle cx="58" cy="62" r="26" fill="url(#rgu)"/>${[66, 72, 77, 81, 85].map((y, i) => `<rect x="30" y="${y}" width="56" height="${1 + i * 0.6}" fill="#3a0a52"/>`).join('')}<rect x="0" y="86" width="116" height="64" fill="#0b0420"/>${Array.from({ length: 7 }, (_, i) => `<line x1="${58 - (i - 3) * 6}" y1="86" x2="${58 + (i - 3) * 30}" y2="150" stroke="#3ff2ff" stroke-width=".8" opacity=".8"/>`).join('')}${[88, 92, 98, 106, 118, 134].map((y) => `<line x1="0" y1="${y}" x2="116" y2="${y}" stroke="#ff3fd1" stroke-width=".9"/>`).join('')}<path d="M0 86 L14 70 L24 80 L36 64 L44 86 Z M116 86 L102 66 L92 78 L80 62 L72 86 Z" fill="#0b0420" stroke="#ff3fd1" stroke-width=".9"/></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 880, f2: 1320, dur: 0.06, v: 0.04, type: 'sawtooth' }); },
    tick(s, t) { s.tone(t, { f: 1760, dur: 0.02, v: 0.02, type: 'square' }); },
    toggle(s, t) { s.notes(t, [s.hz(69), s.hz(76)], { dur: 0.1, v: 0.04, type: 'sawtooth', gap: 0.05 }); },
    play(s, t) { s.notes(t, [s.hz(57), s.hz(64), s.hz(69), s.hz(73), s.hz(76)], { dur: 0.4, v: 0.035, type: 'sawtooth', gap: 0.06 }); s.tone(t, { f: 55, dur: 0.6, v: 0.1, type: 'sine' }); },
    pause(s, t) { s.notes(t, [s.hz(76), s.hz(69), s.hz(64)], { dur: 0.3, v: 0.03, type: 'sawtooth', gap: 0.05 }); },
    next(s, t) { s.tone(t, { f: 200, f2: 1600, dur: 0.3, v: 0.04, type: 'sawtooth' }); s.noise(t, { f: 8000, f2: 2000, dur: 0.3, v: 0.02, q: 1 }); },
    prev(s, t) { s.tone(t, { f: 1600, f2: 200, dur: 0.3, v: 0.04, type: 'sawtooth' }); s.noise(t, { f: 2000, f2: 8000, dur: 0.3, v: 0.02, q: 1 }); },
    enter(s, t) { s.tone(t, { f: 40, f2: 80, dur: 1.4, v: 0.12, type: 'sawtooth', glide: 1.2 }); s.notes(t + 0.9, [s.hz(57), s.hz(61), s.hz(64), s.hz(69), s.hz(73), s.hz(76), s.hz(81)], { dur: 0.7, v: 0.03, type: 'sawtooth', gap: 0.07 }); },
    open(s, t) { s.tone(t, { f: 660, f2: 990, dur: 0.08, v: 0.035, type: 'sawtooth' }); },
    close(s, t) { s.tone(t, { f: 990, f2: 660, dur: 0.08, v: 0.035, type: 'sawtooth' }); },
    ok(s, t) { s.notes(t, [s.hz(69), s.hz(73), s.hz(76), s.hz(81)], { dur: 0.25, v: 0.035, type: 'sawtooth', gap: 0.05 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="rg-cv"></canvas><div class="rg-scrim"></div>
      <div class="rg-hud" data-ui><b>SPECTRAL<i>//</i>RIDGE</b><span><em data-rg="spd">0</em> KM/H · <em data-rg="bar">BAR 001</em></span></div>
      <div class="rg-panel">
        <div class="rg-row" data-ui>
          <div class="rg-art"><img data-bind="cover" alt="" draggable="false"></div>
          <div class="rg-tx"><div class="rg-t" data-bind="title"></div><div class="rg-a" data-bind="artist"></div></div>
          <div class="rg-bpm"><b data-bind="bpm">--</b><small>BPM</small></div>
        </div>
        <div class="seek rg-seek" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div><div class="seek-times"><span data-bind="time">0:00</span><span data-bind="dur">0:00</span></div></div>
        ${R.ui.ctrl('rg-ctrl')}
      </div>`;
    const cv = api.canvas(root.querySelector('.rg-cv'), { dprMax: 2 });
    const spdEl = root.querySelector('[data-rg="spd"]'), barEl = root.querySelector('[data-rg="bar"]');
    const NX = R.quality() < 0.7 ? 40 : 56, NZ = R.quality() < 0.7 ? 42 : 58, DZ = 0.6, XW = 1.7, ROAD = 0.17;
    const XS = new Float32Array(NX); for (let j = 0; j < NX; j++) XS[j] = -XW + (2 * XW * j) / (NX - 1);
    // the rows: heights, how bright (first beat of a bar), and their place
    const rows = [], rnd = R.rng(2048);
    let accent = 0;
    function makeRow(z, bands, playing) {
      const hgt = new Float32Array(NX), seed = rnd() * 100;
      for (let j = 0; j < NX; j++) {
        const ax = Math.abs(XS[j]);
        if (ax < ROAD) { hgt[j] = 0; continue; }
        const u = (ax - ROAD) / (XW - ROAD), side = XS[j] < 0 ? 0 : 1;
        // highs beside the road, the bass furthest out; a gentle base of hills even when it is quiet
        const b = Math.max(0, Math.min(31, Math.round((1 - u) * 26 + side)));
        const val = playing ? Math.pow(bands[b], 1.35) : 0;
        const hill = 0.1 + 0.18 * R.noise1(seed * 0.1 + j * 0.37, side + 1);
        hgt[j] = (val * (0.35 + 2.4 * u * u) + hill * u * 1.3) * Math.min(1, (ax - ROAD) * 9);
      }
      return { z, h: hgt, acc: 0 };
    }
    // the land you start over: soft made-up ridges until the song's own arrive from the horizon
    const fake = new Float32Array(32);
    for (let i = 0; i < NZ; i++) { for (let b = 0; b < 32; b++) fake[b] = 0.25 + 0.4 * R.noise1(i * 0.21 + b * 0.31, 4) * (1 - b / 48); rows.push(makeRow(0.2 + i * DZ, fake, true)); }
    api.beat((s, i) => { accent = Math.max(accent, i.down ? 0.6 + 0.4 * s : 0.25 * s); });

    let L = null, sky = null, sunC = null, sunKey = '', art = null, stars = [], shoot = [];
    function loadArt(t) { art = null; sunKey = ''; if (!t) return; api.coverImage(t).then((im) => { if (api.track() && api.track().id === t.id) { art = im; sunKey = ''; } }); }
    function layout() {
      const { w, h } = cv, land = w > h * 1.15;
      const hy = land ? h * 0.46 : h * 0.4, f = (land ? 0.55 : 0.72) * Math.max(w, h * 0.55);
      L = { w, h, hy, f, cx: w / 2, camH: 0.55, sunR: Math.min(w * (land ? 0.16 : 0.27), h * 0.19) };
      stars = []; const sr = R.rng(7);
      for (let i = 0; i < 90; i++) stars.push({ x: sr() * w, y: sr() * hy * 0.92, r: 0.4 + sr() * 1.1, p: sr() * R.TAU });
      // the sky and the far range, drawn once
      sky = document.createElement('canvas'); const d = Math.min(2, cv.dpr);
      sky.width = Math.max(2, Math.round(w * d)); sky.height = Math.max(2, Math.round(h * d));
      const x = sky.getContext('2d'); x.scale(d, d);
      const g = x.createLinearGradient(0, 0, 0, hy); g.addColorStop(0, '#0b0420'); g.addColorStop(0.55, '#2a0a4a'); g.addColorStop(0.85, '#7a1468'); g.addColorStop(1, '#ff4f8a');
      x.fillStyle = g; x.fillRect(0, 0, w, hy + 1);
      x.fillStyle = '#0b0420'; x.fillRect(0, hy, w, h - hy);
      sunKey = '';
    }
    // the sun: a gradient disc, the cover glowing inside it, stripes cut out of its lower half
    function sunCanvas(r) {
      const key = Math.round(r) + '|' + (art ? art.src : '-');
      if (key === sunKey && sunC) return sunC;
      sunKey = key; const n = Math.max(8, Math.round(r * 2 * Math.min(2, cv.dpr)));
      sunC = document.createElement('canvas'); sunC.width = sunC.height = n; const x = sunC.getContext('2d');
      x.beginPath(); x.arc(n / 2, n / 2, n / 2, 0, R.TAU); x.clip();
      const g = x.createLinearGradient(0, 0, 0, n); g.addColorStop(0, '#fff27a'); g.addColorStop(0.5, '#ff9a3c'); g.addColorStop(1, '#ff2f9b');
      x.fillStyle = g; x.fillRect(0, 0, n, n);
      if (art) { try { x.globalAlpha = 0.42; x.globalCompositeOperation = 'overlay'; x.drawImage(art, 0, 0, n, n); x.globalAlpha = 0.18; x.globalCompositeOperation = 'luminosity'; x.drawImage(art, 0, 0, n, n); } catch (e) { /* ignore */ } }
      return sunC;
    }
    loadArt(api.track());
    layout();
    let speed = 0, enterT = 0, swapT = 9, lastHud = 0, bob = 0, hue = 0;
    return {
      enter() { enterT = 0; },
      swap() { swapT = 0; for (const r of rows) r.acc = Math.max(r.acc, 0.5); },
      onTrack(t) { loadArt(t); },
      resize() { cv.resize(); layout(); },
      frame(dt, now, v) {
        enterT += dt; swapT += dt;
        const { ctx, w, h } = cv;
        if (!L || Math.abs(L.w - w) > 1 || Math.abs(L.h - h) > 1) layout();
        const playing = v.playing, hot = v.hot;
        // speed: rows per second, faster when it is loud, doubled in the chorus
        const want = (playing ? 7 + 9 * Math.min(1, v.local * 1.2) + hot * 12 : 1.2) * DZ;
        speed += (want - speed) * (1 - Math.exp(-dt * 1.5));
        const dz = speed * dt;
        for (const r of rows) r.z -= dz;
        while (rows.length && rows[0].z < 0.16) {
          rows.shift();
          const far = rows.length ? rows[rows.length - 1].z + DZ : NZ * DZ;
          const nr = makeRow(far, v.bands, playing);
          nr.acc = accent; accent = 0;
          rows.push(nr);
        }
        bob += ((playing ? v.kickE * 0.07 + v.pump * 0.02 : 0) - bob) * (1 - Math.exp(-dt * 12));
        hue += dt * (hot > 0.5 ? 40 : 0);
        const { hy, f, cx } = L, camH = L.camH + bob;
        ctx.drawImage(sky, 0, 0, w, h);
        // stars (and shooting stars in the chorus)
        for (const s of stars) { ctx.globalAlpha = 0.35 + 0.35 * Math.sin(now * 1.7 + s.p) + (playing ? v.hatE * 0.3 : 0); ctx.fillStyle = '#ffe8ff'; ctx.fillRect(s.x, s.y, s.r, s.r); }
        ctx.globalAlpha = 1;
        if (hot > 0.5 && Math.random() < dt * 1.2 && shoot.length < 4) shoot.push({ x: Math.random() * w, y: Math.random() * hy * 0.5, vx: -(220 + Math.random() * 200), vy: 90 + Math.random() * 60, life: 0.9 });
        ctx.globalCompositeOperation = 'lighter';
        for (let k = shoot.length - 1; k >= 0; k--) { const s = shoot[k]; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0) { shoot.splice(k, 1); continue; } const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.18, s.y - s.vy * 0.18); g.addColorStop(0, `rgba(255,255,255,${s.life})`); g.addColorStop(1, 'rgba(255,120,220,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.18, s.y - s.vy * 0.18); ctx.stroke(); }
        // the sun swells with the bass
        const sr = L.sunR * (1 + (playing ? v.bass * 0.05 + v.kickE * 0.025 : 0)) * Math.min(1, 0.3 + enterT * 0.7), sy = hy - sr * 0.42;
        ctx.globalAlpha = 0.55 + v.pump * 0.25; ctx.drawImage(api.glow('#ff5aa8', 64), cx - sr * 2.1, sy - sr * 2.1, sr * 4.2, sr * 4.2);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(sunCanvas(sr), cx - sr, sy - sr, sr * 2, sr * 2);
        // stripes sliding down through the lower half of the sun
        ctx.save(); ctx.beginPath(); ctx.arc(cx, sy, sr + 0.5, 0, R.TAU); ctx.clip();
        ctx.fillStyle = '#2a0a4a';
        const off = (now * 0.35) % 1;
        for (let k = 0; k < 7; k++) { const q = (k + off) / 7, yy = sy + sr * (0.05 + q * 0.95), th = sr * (0.012 + q * 0.085); if (yy < hy) ctx.fillRect(cx - sr - 1, yy, sr * 2 + 2, Math.min(th, hy - yy)); }
        ctx.restore();
        ctx.fillStyle = '#0b0420'; ctx.fillRect(0, hy, w, h - hy);
        // the land: far to near; each ridge's ground hides what is behind it
        const P = (X, Y, Z) => [cx + (X * f) / Z, hy + ((camH - Y) * f) / Z];
        const px = new Float32Array(NX), py = new Float32Array(NX), qx = new Float32Array(NX), qy = new Float32Array(NX);
        let have = false;
        const c1 = hot > 0.5 ? R.color.hsl((300 + hue) % 360, 1, 0.62) : '#ff3fd1', c2 = hot > 0.5 ? R.color.hsl((180 + hue) % 360, 1, 0.6) : '#3ff2ff';
        for (let i = rows.length - 1; i >= 0; i--) {
          const r = rows[i], Z = Math.max(0.12, r.z);
          for (let j = 0; j < NX; j++) { const p = P(XS[j], r.h[j], Z); px[j] = p[0]; py[j] = p[1]; }
          const fog = Math.max(0, Math.min(1, 1 - (Z - 2) / (NZ * DZ - 2))), near = Math.max(0, 1 - Z / 7);
          // ground under this ridge
          ctx.beginPath(); ctx.moveTo(px[0], h + 2); for (let j = 0; j < NX; j++) ctx.lineTo(px[j], py[j]); ctx.lineTo(px[NX - 1], h + 2); ctx.closePath();
          ctx.fillStyle = '#0b0420'; ctx.fill();
          // lines along the road from the ridge behind
          if (have) {
            ctx.beginPath(); for (let j = 0; j < NX; j += 1) { ctx.moveTo(qx[j], qy[j]); ctx.lineTo(px[j], py[j]); }
            ctx.strokeStyle = R.color.rgba(c2, 0.12 + 0.55 * fog); ctx.lineWidth = 0.6 + near * 1.2; ctx.stroke();
          }
          // the ridge itself, brighter on the bar's first beat
          const a = Math.min(1, 0.18 + 0.75 * fog + r.acc * 0.8);
          ctx.beginPath(); ctx.moveTo(px[0], py[0]); for (let j = 1; j < NX; j++) ctx.lineTo(px[j], py[j]);
          if (r.acc > 0.3 || near > 0.4) { ctx.strokeStyle = R.color.rgba(r.acc > 0.3 ? '#ffffff' : c1, a * 0.28); ctx.lineWidth = 4 + near * 4; ctx.stroke(); }
          ctx.strokeStyle = R.color.rgba(r.acc > 0.5 ? '#ffd6f6' : c1, a); ctx.lineWidth = 0.8 + near * 1.6 + r.acc * 1.2; ctx.stroke();
          // the road's centre line, dashed
          if (i % 2 === 0 && i > 0) { const n0 = rows[i - 1], Z0 = Math.max(0.12, n0.z), a0 = P(0, 0, Z), b0 = P(0, 0, Z0), wd = Math.max(0.6, 6 / Z); ctx.fillStyle = `rgba(255,240,255,${(0.2 + 0.6 * fog).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(a0[0] - wd * 0.5, a0[1]); ctx.lineTo(a0[0] + wd * 0.5, a0[1]); ctx.lineTo(b0[0] + wd * 0.9, b0[1]); ctx.lineTo(b0[0] - wd * 0.9, b0[1]); ctx.closePath(); ctx.fill(); }
          px.forEach((x, j) => { qx[j] = x; qy[j] = py[j]; }); have = true;
        }
        // horizon glow
        ctx.globalCompositeOperation = 'lighter';
        const hg = ctx.createLinearGradient(0, hy - 30, 0, hy + 30); hg.addColorStop(0, 'rgba(255,80,170,0)'); hg.addColorStop(0.5, `rgba(255,80,170,${(0.25 + v.pump * 0.2).toFixed(3)})`); hg.addColorStop(1, 'rgba(255,80,170,0)');
        ctx.fillStyle = hg; ctx.fillRect(0, hy - 30, w, 60);
        ctx.globalCompositeOperation = 'source-over';
        if (swapT < 0.6) { ctx.fillStyle = `rgba(255,255,255,${(0.5 * (1 - swapT / 0.6)).toFixed(3)})`; ctx.fillRect(0, 0, w, h); }
        if (now - lastHud > 0.2) { lastHud = now; spdEl.textContent = Math.round((speed / DZ) * 14); barEl.textContent = 'BAR ' + String(Math.max(0, Math.floor((Math.floor(v.beatT) - (v.bpos || 0)) / 4 + 0.01)) + 1).padStart(3, '0'); }
      },
    };
  },
});
