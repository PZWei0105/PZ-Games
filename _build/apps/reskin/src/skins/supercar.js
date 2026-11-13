/* ===================== skin: 超跑夜奔 NIGHT RUN — a supercar flat out down a night highway, HUD on the windscreen =====================
   A pseudo-3D road (segments projected one by one, curves and hills accumulated as in the old arcade racers) under a
   city skyline. Street lamps, cars to overtake, gantry signs, LED road edges that pulse on the beat. The speed follows
   the song's tempo and loudness; the rev counter climbs and shifts gear on strong beats. Chorus: NITRO — a neon tunnel,
   speed lines, a blue rush. Tilting the phone steers. A new song arrives on an overhead sign. */
R.skins.def({
  id: 'supercar', name: '超跑夜奔', group: '酷炫', en: 'NIGHT RUN',
  desc: '夜間高速公路的超跑視角，時速跟著音量、轉速跟著節拍，副歌按下氮氣衝進霓虹隧道',
  bloom: { s: 0.68, th: 0.55, streak: 0.62, tint: '#ff5a7a' }, trans: 'portal', hype: false,
  theme: { bg: '#05040c', fg: '#f4f1ff', accent: '#ff2d55', accent2: '#29e3ff', ui: 'rgba(10,8,16,.97)', dock: 'rgba(14,10,22,.5)', dockfg: '#ffd1da' },
  enterMs: 2000, swapMs: 1500,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="scs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05030f"/><stop offset=".55" stop-color="#2a0d3d"/><stop offset=".62" stop-color="#ff3d7f"/></linearGradient></defs><rect width="116" height="150" fill="url(#scs)"/><g fill="#0b0716"><rect x="4" y="66" width="12" height="20"/><rect x="18" y="58" width="9" height="28"/><rect x="88" y="60" width="11" height="26"/><rect x="101" y="68" width="12" height="18"/></g><path d="M0 86H116V150H0z" fill="#07060d"/><path d="M50 86L2 150H114L66 86z" fill="#1b1a22"/><path d="M50 86L2 150" stroke="#29e3ff" stroke-width="2"/><path d="M66 86L114 150" stroke="#ff2d55" stroke-width="2"/><g stroke="#e8e8ef" stroke-width="2"><path d="M58 90V96M58 104V114M58 124V140"/></g><circle cx="30" cy="80" r="3" fill="#ffc46b"/><circle cx="86" cy="80" r="3" fill="#ffc46b"/><text x="58" y="44" fill="#29e3ff" font-family="Orbitron, sans-serif" font-weight="900" font-size="24" text-anchor="middle">288</text><text x="58" y="56" fill="#ff2d55" font-family="monospace" font-size="8" text-anchor="middle" letter-spacing="2">KM/H</text></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 1800, dur: 0.03, v: 0.05, type: 'square', lp: 4000 }); },
    tick(s, t) { s.tone(t, { f: 2600, dur: 0.02, v: 0.03, type: 'square', lp: 5000 }); },
    toggle(s, t) { s.tone(t, { f: 900, dur: 0.04, v: 0.06, type: 'square', lp: 3000 }); },
    play(s, t) { s.tone(t, { f: 40, f2: 160, dur: 0.5, v: 0.14, type: 'sawtooth', lp: 500, glide: 0.4 }); s.tone(t + 0.3, { f: 120, f2: 90, dur: 0.4, v: 0.08, type: 'sawtooth', lp: 400 }); },
    pause(s, t) { s.tone(t, { f: 140, f2: 35, dur: 0.6, v: 0.12, type: 'sawtooth', lp: 450 }); },
    next(s, t) { s.tone(t, { f: 90, f2: 260, dur: 0.22, v: 0.1, type: 'sawtooth', lp: 900 }); s.tone(t + 0.2, { f: 150, f2: 320, dur: 0.25, v: 0.08, type: 'sawtooth', lp: 900 }); },
    prev(s, t) { s.tone(t, { f: 260, f2: 90, dur: 0.28, v: 0.1, type: 'sawtooth', lp: 900 }); },
    enter(s, t) { s.tone(t, { f: 30, f2: 90, dur: 0.5, v: 0.14, type: 'sawtooth', lp: 400 }); s.tone(t + 0.45, { f: 70, f2: 260, dur: 0.9, v: 0.12, type: 'sawtooth', lp: 1200, glide: 0.8 }); s.noise(t + 0.45, { f: 300, f2: 2400, dur: 0.9, v: 0.04, q: 1.4 }); },
    open(s, t) { s.tone(t, { f: 700, f2: 1200, dur: 0.08, v: 0.05, type: 'square', lp: 3000 }); },
    close(s, t) { s.tone(t, { f: 1200, f2: 700, dur: 0.08, v: 0.05, type: 'square', lp: 3000 }); },
    ok(s, t) { s.notes(t, [s.hz(76), s.hz(83)], { dur: 0.1, v: 0.06, type: 'square', gap: 0.07, lp: 4000 }); },
  },
  mount(root, api) {
    const I = R.I;
    root.innerHTML = `<canvas class="sc-road"></canvas>
      <div class="scr-top" data-ui><b>NIGHT RUN</b><span data-sc="where">EXPRESSWAY 64 · NORTHBOUND</span></div>
      <div class="scr-panel">
        <div class="scr-head" data-ui>
          <div class="scr-art"><img data-bind="cover" alt="" draggable="false"></div>
          <div class="scr-tx"><div class="scr-t" data-bind="title"></div><div class="scr-a" data-bind="artist"></div></div>
          <div class="scr-trk"><small>TRACK</small><b data-bind="idx">00/00</b></div>
        </div>
        <div class="seek scr-seek" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div><div class="seek-times"><span data-bind="time">0:00</span><span data-bind="rem">-0:00</span></div></div>
        <div class="ctrl scr-ctrl" data-ui>
          <button type="button" class="c-shuf" data-act="shuffle" aria-label="隨機播放">${I.shuffle}</button>
          <button type="button" class="c-prev" data-act="prev" aria-label="上一首">${I.prev}</button>
          <button type="button" class="c-play" data-act="toggle" aria-label="播放／暫停"><b>ENGINE</b><span class="i-play">START</span><span class="i-pause">STOP</span></button>
          <button type="button" class="c-next" data-act="next" aria-label="下一首">${I.next}</button>
          <button type="button" class="c-rep" data-act="repeat" aria-label="循環播放">${I.rep}</button>
        </div>
      </div>`;
    const cv = api.canvas(root.querySelector('.sc-road'), { dprMax: 1.6, alpha: false });
    const where = root.querySelector('[data-sc="where"]');
    const SEG = 200, ROADW = 2100, DRAW = 115, CAMH = 950, DEPTH = 0.84;
    const curve = (z) => Math.sin(z * 0.00017) * 0.95 + Math.sin(z * 0.00049 + 1.3) * 0.5 + Math.sin(z * 0.0011 + 4) * 0.18;
    const hill = (z) => Math.sin(z * 0.00009) * 1100 + Math.sin(z * 0.00027 + 2) * 380;
    const rnd = R.rng(20261113);
    // the skyline behind everything: a strip of towers with lit windows, drawn once per size
    let sky = null, skyW = 0;
    function buildSky(w, h) {
      const c = document.createElement('canvas'); const sw = Math.round(w * 2.2), sh = Math.round(h * 0.2);
      c.width = sw; c.height = sh; const x = c.getContext('2d');
      const r2 = R.rng(77);
      for (let layer = 0; layer < 2; layer++) {
        let px = 0;
        while (px < sw) {
          const bw = 14 + r2() * 46, bh = sh * (layer ? 0.25 + r2() * 0.6 : 0.15 + r2() * 0.4);
          x.fillStyle = layer ? '#0b0918' : '#1a1030'; x.fillRect(px, sh - bh, bw, bh);
          if (layer) { for (let wy = sh - bh + 4; wy < sh - 3; wy += 5) for (let wx = px + 3; wx < px + bw - 3; wx += 4) if (r2() < 0.28) { x.fillStyle = r2() < 0.15 ? '#7fe8ff' : r2() < 0.3 ? '#ff7ad1' : '#ffd38a'; x.fillRect(wx, wy, 1.6, 1.8); } }
          if (layer && r2() < 0.18) { x.fillStyle = '#ff3355'; x.fillRect(px + bw / 2, sh - bh - 6, 2, 2); }
          px += bw + (layer ? r2() * 6 : 0);
        }
      }
      sky = c; skyW = sw;
    }
    // cars ahead in other lanes
    const cars = []; for (let i = 0; i < 5; i++) cars.push({ z: 2500 + i * 3300, lane: [-0.62, 0, 0.62][i % 3], v: 0.45 + rnd() * 0.25, col: ['#c9cfe0', '#ff4d6d', '#1d2433', '#f5f5f5', '#ffb000'][i] });
    let pos = 0, speed = 0, playerX = 0, rpm = 900, gear = 1, gearT = 9, shiftFlash = 0, enterT = 0, nos = 0, bgX = 0, shake = 0, lastWhere = 0;
    let signZ = -1, signText = '', signT = 0;
    const W0 = () => cv.w, H0 = () => cv.h;
    // every beat kicks the revs; the bar's first beat jolts the car
    api.beat((s, i) => {
      rpm = Math.min(8600, rpm + 650 * s);
      if (i.down) shake = Math.min(1, shake + s * 0.55);
    });
    function plateAt(z, text) { signZ = z; signText = text; signT = 0; }
    function project(wx, wy, z, camX, camY, w, h, hor) {
      const sc = DEPTH / z;
      return { x: w / 2 + (wx - camX) * sc * w / 2, y: hor - (wy - camY) * sc * w / 2, s: sc * w / 2 };
    }
    function poly(ctx, x1, y1, w1, x2, y2, w2, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x1 - w1, y1); ctx.lineTo(x2 - w2, y2); ctx.lineTo(x2 + w2, y2); ctx.lineTo(x1 + w1, y1); ctx.closePath(); ctx.fill(); }
    function glowDot(ctx, x, y, r, col, a) {
      const g = api.glow(col, 64); ctx.globalAlpha = a; ctx.drawImage(g, x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
    }
    return {
      enter() { enterT = 0; speed = 0; gear = 1; rpm = 1200; },
      swap(t) { plateAt(pos + SEG * 26, 'NEXT ▸ ' + (t ? t.title : '')); rpm = 7600; shiftFlash = 1; },
      resize() { cv.resize(); sky = null; },
      frame(dt, t, v) {
        enterT += dt;
        const { ctx, w, h } = cv;
        if (!sky || Math.abs(skyW - Math.round(w * 2.2)) > 4) buildSky(w, h);
        const port = h > w;
        const hor = h * (port ? 0.4 : 0.44);
        // speed: tempo and loudness; nitro in the chorus
        nos += ((v.hot > 0.5 && !R.reduced ? 1 : 0) - nos) * (1 - Math.exp(-dt * 2.5));
        const target = v.playing ? (150 + Math.min(150, (v.bpm || 110)) * 0.55 + v.level * 70 + nos * 90) : 0;
        const ramp = Math.min(1, enterT / 1.8);
        speed += (target * ramp - speed) * (1 - Math.exp(-dt * (target > speed ? 1.1 : 0.6)));
        const ups = speed * 32 * (0.7 + 0.65 * v.pump); // world units per second — a surge on every beat
        pos += ups * dt;
        const g2 = speed < 4 ? 1 : Math.max(1, Math.min(6, 1 + Math.floor(speed / 56)));
        if (g2 !== gear) { if (g2 > gear) shiftFlash = 1; gear = g2; gearT = 0; }
        const inGear = gear >= 6 ? Math.min(1, (speed - 280) / 90) : (speed % 56) / 56;
        rpm += ((v.playing ? 3100 + inGear * 4700 + v.kick * 600 : 900) - rpm) * Math.min(1, dt * (gearT < 0.2 ? 18 : 6));
        gearT += dt; shiftFlash *= Math.exp(-dt * 6); shake *= Math.exp(-dt * 6);
        // steering: the car drifts on curves, a lane-keeper pulls it back, the phone's tilt steers
        const c0 = curve(pos);
        playerX -= c0 * (ups / 9000) * dt * 1.4;
        playerX += ((R.tilt.x * 0.55) - playerX) * dt * 1.6;
        playerX = Math.max(-0.9, Math.min(0.9, playerX));
        bgX = (bgX + c0 * ups * dt * 0.0035) % 100000;
        const camX = playerX * ROADW, camY = CAMH + hill(pos);
        const sx = shake * (nos * 3 + 1.5) * (Math.random() - 0.5), sy = shake * (nos * 3 + 1.5) * (Math.random() - 0.5);
        ctx.save(); ctx.translate(sx, sy);
        // sky
        const g = ctx.createLinearGradient(0, 0, 0, hor);
        g.addColorStop(0, '#040310'); g.addColorStop(0.55, '#140a2c'); g.addColorStop(0.86, '#3a1144'); g.addColorStop(1, nos > 0.3 ? '#3a6bff' : '#ff3d7f');
        ctx.fillStyle = g; ctx.fillRect(-4, -4, w + 8, hor + 6);
        // moon and a few stars
        ctx.fillStyle = 'rgba(255,240,220,.9)'; ctx.beginPath(); ctx.arc(w * 0.78 - bgX * 0.02 % w, hor * 0.28, Math.min(w, h) * 0.035, 0, R.TAU); ctx.fill();
        glowDot(ctx, w * 0.78 - bgX * 0.02 % w, hor * 0.28, Math.min(w, h) * 0.12, '#ffe9c8', 0.35);
        // skyline, scrolling sideways on curves
        if (sky) {
          const sh = h * 0.2, off = ((bgX % skyW) + skyW) % skyW;
          const yy = hor - sh + 2;
          ctx.drawImage(sky, off, 0, Math.min(skyW - off, w), sky.height, 0, yy, Math.min(skyW - off, w), sh);
          if (skyW - off < w) ctx.drawImage(sky, 0, 0, w - (skyW - off), sky.height, skyW - off, yy, w - (skyW - off), sh);
        }
        // the road, near to far computed, far to near painted
        const base = Math.floor(pos / SEG), frac = (pos % SEG) / SEG;
        const pts = [];
        let xAcc = 0, dx = -curve(base * SEG) * frac;
        for (let n = 0; n <= DRAW; n++) {
          const i = base + n, z = Math.max(1, i * SEG - pos);
          const p = project(xAcc, hill(i * SEG), z, camX, camY, w, h, hor);
          p.i = i; p.z = z; p.wx = xAcc;
          pts.push(p);
          xAcc += dx; dx += curve(i * SEG) * 0.9;
        }
        const tunnel = nos;
        const hsK = Math.max(0.8, Math.min(1.35, Math.min(w, h) / 390));
        const fogC = nos > 0.3 ? [18, 14, 48] : [32, 12, 46];
        // LED edges: the whole line pulses on the beat and a flash races from the car to the horizon every beat
        const beatGlow = 0.28 + v.pump * 0.6 + v.down * 0.25, wavePos = v.playing ? v.phase : -1;
        const sprites = [];
        for (let n = DRAW - 1; n >= 0; n--) {
          const a = pts[n], b = pts[n + 1];
          if (b.y >= a.y) continue; // facing away (behind a crest)
          const fog = Math.min(1, n / DRAW);
          const mixc = (r, gg, bb) => `rgb(${Math.round(r + (fogC[0] - r) * fog)},${Math.round(gg + (fogC[1] - gg) * fog)},${Math.round(bb + (fogC[2] - bb) * fog)})`;
          const alt = a.i % 2 === 0;
          // ground beside the road, or the tunnel walls
          if (tunnel > 0.05) {
            ctx.fillStyle = mixc(10 + (alt ? 6 : 0), 10, 24);
            ctx.fillRect(-4, b.y, w + 8, a.y - b.y + 1);
          } else { ctx.fillStyle = mixc(alt ? 7 : 5, alt ? 7 : 6, alt ? 14 : 11); ctx.fillRect(-4, b.y, w + 8, a.y - b.y + 1); }
          const rw1 = ROADW * a.s, rw2 = ROADW * b.s;
          poly(ctx, a.x, a.y, rw1 * 1.12, b.x, b.y, rw2 * 1.12, alt ? mixc(196, 24, 47) : mixc(210, 210, 222));
          poly(ctx, a.x, a.y, rw1, b.x, b.y, rw2, alt ? mixc(28, 28, 36) : mixc(24, 24, 31));
          // LED edges along the road, pulsing on the beat
          const near = (1 - fog) * (1 - fog), tall = a.y - b.y;
          const wave = wavePos < 0 ? 0 : Math.exp(-Math.pow(n / DRAW - wavePos * 0.9, 2) * 140) * (0.6 + 0.6 * v.acc);
          ctx.globalCompositeOperation = 'lighter';
          if (tall > 0.6) {
          ctx.fillStyle = R.color.rgba('#29e3ff', Math.min(1, near * beatGlow + wave * (0.35 + near)));
          ctx.beginPath(); ctx.moveTo(a.x - rw1 * 1.02, a.y); ctx.lineTo(b.x - rw2 * 1.02, b.y); ctx.lineTo(b.x - rw2 * 0.98, b.y); ctx.lineTo(a.x - rw1 * 0.98, a.y); ctx.fill();
          ctx.fillStyle = R.color.rgba('#ff2d55', Math.min(1, near * beatGlow + wave * (0.35 + near)));
          ctx.beginPath(); ctx.moveTo(a.x + rw1 * 0.98, a.y); ctx.lineTo(b.x + rw2 * 0.98, b.y); ctx.lineTo(b.x + rw2 * 1.02, b.y); ctx.lineTo(a.x + rw1 * 1.02, a.y); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
          if (a.i % 3 === 0) for (const lx of [-0.34, 0.34]) { ctx.fillStyle = mixc(225, 225, 235); const l1 = rw1 * 0.025, l2 = rw2 * 0.025; poly(ctx, a.x + rw1 * lx, a.y, l1, b.x + rw2 * lx, b.y, l2, ctx.fillStyle); }
          // tunnel rings
          if (tunnel > 0.05 && a.i % 6 === 0) {
            const top = a.y - ROADW * 2.4 * a.s;
            ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = Math.max(1, a.s * 70);
            ctx.strokeStyle = R.color.rgba(a.i % 12 === 0 ? '#29e3ff' : '#ff4fd8', Math.min(1, tunnel * ((1 - fog) * (0.45 + v.pump * 0.5) + wave * 0.9)));
            ctx.beginPath(); ctx.moveTo(a.x - rw1 * 1.4, a.y); ctx.lineTo(a.x - rw1 * 1.4, top + rw1 * 0.5); ctx.quadraticCurveTo(a.x - rw1 * 1.4, top, a.x - rw1 * 0.9, top); ctx.lineTo(a.x + rw1 * 0.9, top); ctx.quadraticCurveTo(a.x + rw1 * 1.4, top, a.x + rw1 * 1.4, top + rw1 * 0.5); ctx.lineTo(a.x + rw1 * 1.4, a.y); ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
          }
          // street lamps on both sides
          if (a.i % 5 === 0 && tunnel < 0.6) for (const side of [-1, 1]) {
            const lx = a.x + side * rw1 * 1.32, hh = ROADW * 1.25 * a.s;
            ctx.strokeStyle = mixc(30, 30, 40); ctx.lineWidth = Math.max(1, a.s * 60);
            ctx.beginPath(); ctx.moveTo(lx, a.y); ctx.lineTo(lx, a.y - hh); ctx.lineTo(lx - side * rw1 * 0.22, a.y - hh); ctx.stroke();
            ctx.globalCompositeOperation = 'lighter';
            // the head glows, small and hot; very close lamps fade so they never fill the screen
            const closeK = Math.min(1, n / 5);
            glowDot(ctx, lx - side * rw1 * 0.22, a.y - hh, Math.min(46 * hsK, Math.max(3, a.s * 520)), '#ffc46b', Math.min(1, near * (1 - tunnel) * closeK * (0.7 + 0.55 * v.pump)));
            if (n > 3 && rw1 < w * 1.2) {
              const pool = ctx.createRadialGradient(lx - side * rw1 * 0.3, a.y, 0, lx - side * rw1 * 0.3, a.y, rw1 * 0.6);
              pool.addColorStop(0, `rgba(255,190,110,${0.12 * near * (1 - tunnel)})`); pool.addColorStop(1, 'rgba(255,190,110,0)');
              ctx.fillStyle = pool; ctx.fillRect(lx - side * rw1 * 0.3 - rw1 * 0.6, a.y - rw1 * 0.3, rw1 * 1.2, rw1 * 0.6);
            }
            ctx.globalCompositeOperation = 'source-over';
          }
          // anything standing on this stretch of road
          for (const c of cars) { if (c.z >= a.i * SEG && c.z < (a.i + 1) * SEG) sprites.push(['car', c, a]); }
          if (signZ > 0 && signZ >= a.i * SEG && signZ < (a.i + 1) * SEG) sprites.push(['sign', null, a]);
          for (let k = sprites.length - 1; k >= 0; k--) {
            const [kind, o, pa] = sprites[k]; sprites.splice(k, 1);
            const rw = ROADW * pa.s;
            if (kind === 'car') {
              const cx = pa.x + o.lane * rw, cw = rw * 0.42, ch = cw * 0.42;
              ctx.fillStyle = '#07070c'; ctx.fillRect(cx - cw / 2, pa.y - ch, cw, ch);
              ctx.fillStyle = o.col; ctx.globalAlpha = 0.35; ctx.fillRect(cx - cw / 2, pa.y - ch, cw, ch * 0.35); ctx.globalAlpha = 1;
              ctx.globalCompositeOperation = 'lighter';
              ctx.fillStyle = '#ff2040'; ctx.fillRect(cx - cw / 2 + cw * 0.05, pa.y - ch * 0.62, cw * 0.9, Math.max(1, ch * 0.1));
              glowDot(ctx, cx - cw * 0.38, pa.y - ch * 0.58, Math.max(2, cw * 0.32), '#ff2040', 0.9);
              glowDot(ctx, cx + cw * 0.38, pa.y - ch * 0.58, Math.max(2, cw * 0.32), '#ff2040', 0.9);
              ctx.globalCompositeOperation = 'source-over';
            } else {
              const hh = ROADW * 1.3 * pa.s, sw2 = rw * 1.5, shh = rw * 0.42;
              ctx.strokeStyle = '#2a2a36'; ctx.lineWidth = Math.max(1, pa.s * 80);
              ctx.beginPath(); ctx.moveTo(pa.x - rw * 1.25, pa.y); ctx.lineTo(pa.x - rw * 1.25, pa.y - hh); ctx.lineTo(pa.x + rw * 1.25, pa.y - hh); ctx.lineTo(pa.x + rw * 1.25, pa.y); ctx.stroke();
              ctx.fillStyle = '#0b6b3a'; ctx.fillRect(pa.x - sw2 / 2, pa.y - hh - shh * 0.3, sw2, shh);
              ctx.strokeStyle = '#e8f5ec'; ctx.lineWidth = Math.max(1, pa.s * 24); ctx.strokeRect(pa.x - sw2 / 2 + shh * 0.06, pa.y - hh - shh * 0.3 + shh * 0.06, sw2 - shh * 0.12, shh * 0.88);
              const fs = Math.max(4, shh * 0.34);
              if (fs > 5) { ctx.fillStyle = '#ffffff'; ctx.font = `700 ${fs.toFixed(1)}px "Chakra Petch", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; let txt = signText; while (txt.length > 4 && ctx.measureText(txt).width > sw2 * 0.9) txt = txt.slice(0, -2) + '…'; ctx.fillText(txt, pa.x, pa.y - hh - shh * 0.3 + shh / 2); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }
            }
          }
        }
        // cars move; the ones passed reappear far ahead
        for (const c of cars) { c.z += ups * c.v * dt; if (c.z < pos - SEG * 2) { c.z = pos + SEG * (DRAW - 5 - rnd() * 30); c.lane = [-0.62, 0, 0.62][Math.floor(rnd() * 3)]; } if (c.z > pos + SEG * DRAW) c.z = pos + SEG * (DRAW - 2); }
        if (signZ > 0 && signZ < pos - SEG) signZ = -1;
        // speed lines at full throttle
        const rush = Math.max(nos * (0.6 + 0.5 * v.pump), Math.min(0.5, (speed - 230) / 200));
        if (rush > 0.03) {
          ctx.globalCompositeOperation = 'lighter';
          const vx = w / 2, vy = hor;
          for (let k = 0; k < 26; k++) {
            const a = rnd() * R.TAU, r0 = Math.max(w, h) * (0.18 + rnd() * 0.3), len = Math.max(w, h) * (0.15 + rnd() * 0.25) * rush;
            ctx.strokeStyle = R.color.rgba(k % 3 ? '#bfeaff' : '#29e3ff', 0.25 * rush); ctx.lineWidth = 1 + rnd() * 1.5;
            ctx.beginPath(); ctx.moveTo(vx + Math.cos(a) * r0, vy + Math.sin(a) * r0); ctx.lineTo(vx + Math.cos(a) * (r0 + len), vy + Math.sin(a) * (r0 + len)); ctx.stroke();
          }
          ctx.globalCompositeOperation = 'source-over';
        }
        // windscreen HUD: speed, rev bar, gear, shift lights, nitro
        const hudY = port ? hor + (h - hor) * 0.2 : hor + (h - hor) * 0.22;
        const hs = hsK;
        const spd = Math.round(speed);
        const on = Math.min(1, Math.max(0, (enterT - 0.3) / 0.6));
        ctx.globalAlpha = on;
        // shift lights
        const lit = Math.round(Math.min(1, Math.max(0, (rpm - 3500) / 4600)) * 10);
        for (let k = 0; k < 10; k++) {
          const lx = w / 2 + (k - 4.5) * 15 * hs, ly = hudY - 70 * hs;
          const col = (rpm > 7700 && Math.floor(t * 12) % 2) || v.down > 0.55 ? '#29e3ff' : k < 4 ? '#3dff7a' : k < 7 ? '#ffd23d' : '#ff2d55';
          ctx.fillStyle = k < lit ? col : 'rgba(255,255,255,.08)';
          ctx.beginPath(); ctx.arc(lx, ly, 4.2 * hs, 0, R.TAU); ctx.fill();
          if (k < lit) glowDot(ctx, lx, ly, 12 * hs, col, 0.55 * on);
        }
        // rev arc
        const ra = 92 * hs, rcx = w / 2, rcy = hudY + 30 * hs;
        for (let k = 0; k < 36; k++) {
          const f = k / 35, a0 = Math.PI * (1.08 + f * 0.84);
          const litK = rpm / 9000 > f;
          ctx.strokeStyle = litK ? (f > 0.84 ? '#ff2d55' : f > 0.66 ? '#ffd23d' : '#29e3ff') : 'rgba(255,255,255,.1)';
          ctx.lineWidth = (k % 4 === 0 ? 7 : 4) * hs;
          ctx.beginPath(); ctx.arc(rcx, rcy, ra, a0, a0 + 0.035); ctx.stroke();
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.font = `900 ${Math.round(58 * hs)}px Orbitron, sans-serif`;
        ctx.shadowColor = nos > 0.3 ? '#29e3ff' : '#ff2d55'; ctx.shadowBlur = 18 * hs;
        ctx.fillStyle = '#f4fbff'; ctx.fillText(String(spd), rcx, rcy + 4 * hs);
        ctx.shadowBlur = 0;
        ctx.font = `700 ${Math.round(11 * hs)}px "Share Tech Mono", monospace`; ctx.fillStyle = '#29e3ff';
        ctx.fillText('KM/H', rcx, rcy + 20 * hs);
        // gear
        ctx.font = `900 ${Math.round(30 * hs)}px Orbitron, sans-serif`;
        ctx.fillStyle = shiftFlash > 0.1 ? '#ffffff' : '#ff2d55';
        ctx.fillText(v.playing ? String(gear) : 'N', rcx + 118 * hs, rcy - 8 * hs);
        ctx.font = `700 ${Math.round(9 * hs)}px "Share Tech Mono", monospace`; ctx.fillStyle = 'rgba(244,241,255,.6)';
        ctx.fillText('GEAR', rcx + 118 * hs, rcy + 6 * hs);
        ctx.fillText(Math.round(rpm / 100) * 100 + ' RPM', rcx - 118 * hs, rcy + 6 * hs);
        ctx.font = `900 ${Math.round(14 * hs)}px Orbitron, sans-serif`; ctx.fillStyle = '#ffd23d';
        ctx.fillText((v.bpm ? Math.round(v.bpm) : '--') + '', rcx - 118 * hs, rcy - 8 * hs);
        // nitro
        if (nos > 0.02) {
          const nw = 150 * hs, nx = rcx - nw / 2, ny = rcy + 34 * hs;
          ctx.fillStyle = 'rgba(41,227,255,.15)'; ctx.fillRect(nx, ny, nw, 6 * hs);
          ctx.fillStyle = '#29e3ff'; ctx.fillRect(nx, ny, nw * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.3))) * nos, 6 * hs);
          ctx.font = `900 ${Math.round(13 * hs)}px Orbitron, sans-serif`; ctx.fillStyle = `rgba(150,240,255,${nos * (0.6 + 0.4 * Math.sin(t * 18))})`;
          ctx.fillText('NITRO', rcx, ny + 24 * hs);
        }
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
        // the windscreen's edge and a blue rush when the nitro kicks in
        const vg = ctx.createRadialGradient(w / 2, hor, Math.min(w, h) * 0.3, w / 2, hor, Math.max(w, h) * 0.85);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, nos > 0.2 ? `rgba(10,40,120,${0.5 * nos})` : 'rgba(0,0,0,.55)');
        ctx.fillStyle = vg; ctx.fillRect(-4, -4, w + 8, h + 8);
        if (shiftFlash > 0.05 && api.flash()) { ctx.fillStyle = `rgba(255,255,255,${shiftFlash * 0.06})`; ctx.fillRect(0, 0, w, h); }
        ctx.restore();
        root.style.setProperty('--lv', v.level.toFixed(3));
        root.classList.toggle('nos', nos > 0.5);
        if (t - lastWhere > 6) { lastWhere = t; where.textContent = ['EXPRESSWAY 64 · NORTHBOUND', 'CITY LOOP · LANE 2', 'HARBOR BRIDGE · 3.2 KM', 'TUNNEL 7 AHEAD', 'COASTAL ROUTE 1'][Math.floor(t / 6) % 5]; }
      },
    };
  },
});
