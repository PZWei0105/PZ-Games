/* ===================== skin: 戰機座艙 SKY ACE — the view from a fighter's cockpit, flight HUD on the glass =====================
   Horizon, clouds and sea grid bank and pitch with the aircraft; the green HUD carries a pitch ladder, heading tape,
   speed and altitude boxes and a flight-path marker. The radar sweeps once a bar and the coming beats show up as
   contacts closing in, each reaching the centre exactly on its beat. Chorus: a bogey appears, the HUD locks it and
   strong beats fire missiles. Roll the phone to bank. A new song is a new waypoint. */
R.skins.def({
  id: 'fighter', name: '戰機座艙', group: '科技', en: 'SKY ACE',
  desc: '戰鬥機抬頭顯示器，雷達掃到的光點就是拍子，副歌鎖定目標、發射',
  bloom: { s: 0.62, th: 0.55, streak: 0.22, tint: '#9dffb8' }, trans: 'pixel', hype: false,
  theme: { bg: '#060a10', fg: '#e8fff0', accent: '#7cff9b', accent2: '#ffb347', ui: 'rgba(8,12,14,.97)', dock: 'rgba(8,14,12,.5)', dockfg: '#9dffb8' },
  enterMs: 2100, swapMs: 1600,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="fts" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1730"/><stop offset=".5" stop-color="#3b4d7a"/><stop offset=".62" stop-color="#ff9a5c"/><stop offset=".63" stop-color="#16202e"/><stop offset="1" stop-color="#070b12"/></linearGradient></defs><g transform="rotate(-12 58 75)"><rect x="-30" y="-20" width="176" height="190" fill="url(#fts)"/><g stroke="#7cff9b" stroke-width="1.6" fill="none"><path d="M24 50h22M70 50h22M24 100h22M70 100h22" /><path d="M24 50v4M92 50v4M24 100v-4M92 100v-4" /></g></g><g stroke="#7cff9b" stroke-width="2" fill="none"><circle cx="58" cy="75" r="6"/><path d="M40 75h12M64 75h12M58 69v-6"/><rect x="8" y="64" width="22" height="12"/><rect x="86" y="64" width="22" height="12"/><path d="M34 20h48M46 20v5M58 20v7M70 20v5"/></g><text x="19" y="73" font-family="monospace" font-size="8" fill="#7cff9b" text-anchor="middle">540</text><text x="97" y="73" font-family="monospace" font-size="8" fill="#7cff9b" text-anchor="middle">18K</text><circle cx="26" cy="124" r="16" fill="none" stroke="#7cff9b" stroke-width="1.4" opacity=".7"/><path d="M26 124L38 114" stroke="#7cff9b" stroke-width="1.4"/><circle cx="31" cy="118" r="1.8" fill="#ffb347"/><path d="M76 108l8-4 8 4-8-12z" fill="#ffb347" opacity=".9"/></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 1250, dur: 0.035, v: 0.05, type: 'square', lp: 3500 }); },
    tick(s, t) { s.tone(t, { f: 2000, dur: 0.02, v: 0.035, type: 'square', lp: 4000 }); },
    toggle(s, t) { s.tone(t, { f: 1000, dur: 0.05, v: 0.05, type: 'square', lp: 3000 }); s.tone(t + 0.07, { f: 1500, dur: 0.05, v: 0.05, type: 'square', lp: 3000 }); },
    play(s, t) { s.noise(t, { f: 400, f2: 2200, dur: 0.6, v: 0.07, q: 0.9 }); s.tone(t, { f: 80, f2: 160, dur: 0.6, v: 0.09, type: 'sawtooth', lp: 700 }); },
    pause(s, t) { s.noise(t, { f: 2200, f2: 300, dur: 0.6, v: 0.06, q: 0.9 }); },
    next(s, t) { s.tone(t, { f: 880, dur: 0.07, v: 0.06, type: 'square', lp: 3000 }); s.tone(t + 0.09, { f: 1320, dur: 0.09, v: 0.06, type: 'square', lp: 3000 }); },
    prev(s, t) { s.tone(t, { f: 1320, dur: 0.07, v: 0.06, type: 'square', lp: 3000 }); s.tone(t + 0.09, { f: 880, dur: 0.09, v: 0.06, type: 'square', lp: 3000 }); },
    enter(s, t) { s.noise(t, { f: 200, f2: 3000, dur: 1.4, v: 0.07, q: 0.7 }); s.tone(t, { f: 60, f2: 140, dur: 1.4, v: 0.1, type: 'sawtooth', lp: 600, glide: 1.2 }); s.notes(t + 1, [s.hz(81), s.hz(81), s.hz(88)], { dur: 0.08, v: 0.05, type: 'square', gap: 0.12, lp: 3000 }); },
    open(s, t) { s.tone(t, { f: 1500, dur: 0.05, v: 0.05, type: 'square', lp: 3500 }); },
    close(s, t) { s.tone(t, { f: 1000, dur: 0.05, v: 0.05, type: 'square', lp: 3500 }); },
    ok(s, t) { s.notes(t, [s.hz(88), s.hz(93)], { dur: 0.08, v: 0.06, type: 'square', gap: 0.07, lp: 4000 }); },
  },
  mount(root, api) {
    const I = R.I;
    root.innerHTML = `<canvas class="ft-cv"></canvas><div class="ft-frame" aria-hidden="true"></div>
      <div class="ft-panel">
        <div class="ft-mfd" data-ui>
          <div class="ft-art"><img data-bind="cover" alt="" draggable="false"></div>
          <div class="ft-tx"><small>TGT · <span data-bind="idx">00/00</span></small><div class="ft-t" data-bind="title"></div><div class="ft-a" data-bind="artist"></div></div>
        </div>
        <div class="seek ft-seek" data-seek data-ui><div class="ft-sl"><span>FUEL</span><span><span data-bind="time">0:00</span> / <span data-bind="dur">0:00</span></span></div><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div></div>
        <div class="ctrl ft-ctrl" data-ui>
          <button type="button" class="c-shuf" data-act="shuffle" aria-label="隨機播放">${I.shuffle}<i>RND</i></button>
          <button type="button" class="c-prev" data-act="prev" aria-label="上一首">${I.prev}<i>PREV</i></button>
          <button type="button" class="c-play" data-act="toggle" aria-label="播放／暫停">${I.pp}<i class="i-play">ENGAGE</i><i class="i-pause">HOLD</i></button>
          <button type="button" class="c-next" data-act="next" aria-label="下一首">${I.next}<i>NEXT</i></button>
          <button type="button" class="c-rep" data-act="repeat" aria-label="循環播放">${I.rep}<i>LOOP</i></button>
        </div>
      </div>`;
    const cv = api.canvas(root.querySelector('.ft-cv'), { dprMax: 1.6, alpha: false });
    const G = '#7cff9b', A = '#ffb347', RED = '#ff4d4d';
    const rnd = R.rng(7041);
    const clouds = []; for (let i = 0; i < 26; i++) clouds.push({ x: (rnd() - 0.5) * 5200, y: (rnd() - 0.5) * 900 - 120, z: 300 + rnd() * 5200, s: 0.6 + rnd() * 1.4, a: 0.35 + rnd() * 0.45 });
    // one soft cloud puff, drawn once
    const puff = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); for (let i = 0; i < 9; i++) { const px = 30 + rnd() * 68, py = 44 + rnd() * 40, r = 18 + rnd() * 26; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(150,160,190,.42)'); g.addColorStop(1, 'rgba(150,160,190,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); } return c; })();
    let t0 = 0, enterT = 0, roll = 0, pitch = 0, hdg = 270, hdgAim = 270, gload = 1, msgT = 9, msg = '', grid = 0;
    let lockT = 0, enemy = { x: 0.1, y: -0.18, alive: true, respawn: 0, ph: 0 }, missiles = [], booms = [], pings = [];
    const up = [];
    // every beat: a radar ping and a jolt on the g-meter; in the chorus, once locked, the bar's beats fire missiles
    api.beat((s, i) => {
      gload = Math.min(6.5, gload + s * 1.4);
      pings.push({ r: 2, a: i.down ? 1 : 0.6 });
      if (R.viz.hot > 0.5 && lockT > 1 && enemy.alive && (i.down || i.bpos === 2) && missiles.length < 2 && !R.reduced) missiles.push({ t: 0, sx: (rnd() < 0.5 ? -0.12 : 0.12), dur: 0.55 + rnd() * 0.15, trail: [] });
    });
    function say(m) { msg = m; msgT = 0; }
    function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    function hudStroke(ctx, w, draw) {
      // a wide faint pass, then the sharp line: a cheap glow for vector graphics
      ctx.save(); ctx.globalAlpha *= 0.22; ctx.lineWidth *= 3.2; draw(); ctx.restore(); draw();
    }
    return {
      enter() { enterT = 0; say('HUD ONLINE'); },
      swap(t) { hdgAim = (hdgAim + 50 + rnd() * 80) % 360; say('WAYPOINT ▸ ' + (t ? t.title : '')); },
      resize() { cv.resize(); },
      frame(dt, t, v) {
        t0 += dt; enterT += dt; msgT += dt;
        const { ctx, w, h } = cv;
        const port = h > w;
        const k = Math.max(0.8, Math.min(1.5, Math.min(w, h) / 390));
        // the airframe shudders a little with the kick drum
        const hudCY = h * (port ? 0.36 : 0.42) + (R.reduced ? 0 : (v.kickE * 2.4 + v.down * 1.6) * k);
        // the aircraft: a slow banking pattern on the phrase, the phone's roll on top
        const auto = Math.sin(t0 * 0.21) * 0.35 + Math.sin(t0 * 0.53 + 1) * 0.12;
        const want = auto + R.tilt.x * 0.6;
        roll += (want - roll) * Math.min(1, dt * 1.6);
        pitch += ((Math.sin(t0 * 0.37) * 0.04 - R.tilt.y * 0.14) - pitch) * Math.min(1, dt * 1.4);
        gload += (1 + Math.abs(roll) * 0.9 - gload) * Math.min(1, dt * 2.5);
        hdgAim = (hdgAim - roll * dt * 9 + 360) % 360;
        let dh = ((hdgAim - hdg + 540) % 360) - 180; hdg = (hdg + dh * Math.min(1, dt * 1.2) + 360) % 360;
        // the sea grid moves by exactly one line per beat (eased, so it lurches forward on the beat); clouds surge with it
        const spd = v.playing ? (300 + v.level * 140 + v.hot * 120) * (0.6 + 1.1 * v.pump) : 380;
        grid = v.playing ? (v.stepT % 1 + 1) % 1 : (grid + dt * 1.5) % 1;
        const pxDeg = h * 0.012; // screen pixels per degree of pitch
        const pOff = (pitch * 57.3) * pxDeg;
        // --- the world, rotated with the bank ---
        ctx.save();
        ctx.translate(w / 2, hudCY); ctx.rotate(-roll); ctx.translate(0, pOff);
        const BIG = Math.hypot(w, h) * 1.2;
        const sky = ctx.createLinearGradient(0, -BIG * 0.6, 0, 0);
        sky.addColorStop(0, '#03060f'); sky.addColorStop(0.6, '#0c1630'); sky.addColorStop(0.86, '#25264a'); sky.addColorStop(0.96, '#5a3a52'); sky.addColorStop(1, '#a8584a');
        ctx.fillStyle = sky; ctx.fillRect(-BIG, -BIG * 0.6, BIG * 2, BIG * 0.6 + 1);
        // a few stars high up, and the last of the sun sitting on the horizon
        ctx.fillStyle = 'rgba(220,235,255,.8)';
        for (let i = 0; i < 40; i++) { const sx2 = ((i * 97.3 + hdg * 6) % 360) / 360 * BIG * 2 - BIG, sy2 = -h * 0.12 - ((i * 53.7) % 100) / 100 * h * 0.5; ctx.fillRect(sx2, sy2, i % 5 ? 1 : 1.6, i % 5 ? 1 : 1.6); }
        const sunX = Math.sin(((hdg - 270) * Math.PI) / 180) * w * 1.6, sr = h * 0.022;
        const sg = ctx.createRadialGradient(sunX, -2, 0, sunX, -2, h * 0.16);
        sg.addColorStop(0, 'rgba(255,214,160,.85)'); sg.addColorStop(0.12, 'rgba(255,150,100,.45)'); sg.addColorStop(0.5, 'rgba(200,90,80,.12)'); sg.addColorStop(1, 'rgba(160,70,80,0)');
        ctx.fillStyle = sg; ctx.fillRect(sunX - h * 0.16, -h * 0.16, h * 0.32, h * 0.165);
        ctx.fillStyle = '#ffe2b8'; ctx.beginPath(); ctx.arc(sunX, 0, sr, Math.PI, 0); ctx.fill();
        // sea / ground with a grid rushing at us
        const gr = ctx.createLinearGradient(0, 0, 0, BIG * 0.6);
        gr.addColorStop(0, '#3a2a3a'); gr.addColorStop(0.06, '#141a28'); gr.addColorStop(1, '#04060a');
        ctx.fillStyle = gr; ctx.fillRect(-BIG, 0, BIG * 2, BIG * 0.6);
        ctx.strokeStyle = 'rgba(124,255,155,.12)'; ctx.lineWidth = 1;
        for (let i = 1; i < 18; i++) { const z = (i - grid) / 18; const y = (h * 0.6) * z * z * z + 2; if (y > 1) line(ctx, -BIG, y, BIG, y); }
        for (let i = -14; i <= 14; i++) line(ctx, i * 6, 0, i * w * 0.32, BIG * 0.6);
        ctx.fillStyle = 'rgba(255,170,120,.35)'; ctx.fillRect(-BIG, -1, BIG * 2, 1.5);
        // clouds, near ones streaking past
        ctx.globalCompositeOperation = 'source-over';
        for (const c of clouds) {
          c.z -= spd * dt * 6; if (c.z < 60) { c.z = 5000 + rnd() * 600; c.x = (rnd() - 0.5) * 5200; c.y = (rnd() - 0.5) * 900 - 120; }
          const sc = (w * 0.9) / c.z;
          const x = c.x * sc, y = c.y * sc - pOff * 0, size = 420 * c.s * sc;
          if (size < 4 || Math.abs(x) > BIG) continue;
          ctx.globalAlpha = Math.min(1, c.a * Math.min(1, (5000 - c.z) / 900) * Math.min(1, c.z / 260));
          ctx.drawImage(puff, x - size, y - size * 0.6, size * 2, size * 1.2);
        }
        ctx.globalAlpha = 1;
        // the bogey (chorus): a small dark delta on the horizon line of sight
        if (v.hot > 0.3) {
          enemy.ph += dt;
          if (!enemy.alive) { enemy.respawn -= dt; if (enemy.respawn <= 0) { enemy.alive = true; enemy.x = (rnd() - 0.5) * 0.5; enemy.y = -0.12 - rnd() * 0.12; lockT = 0; } }
          const ex = enemy.x * w + Math.sin(enemy.ph * 0.9) * w * 0.12, ey = enemy.y * h + Math.cos(enemy.ph * 1.3) * h * 0.035 - pOff;
          enemy.sx = ex; enemy.sy = ey;
          if (enemy.alive) { const s2 = 9 * k; ctx.fillStyle = '#121620'; ctx.beginPath(); ctx.moveTo(ex, ey - s2 * 0.4); ctx.lineTo(ex + s2, ey + s2 * 0.35); ctx.lineTo(ex, ey + s2 * 0.15); ctx.lineTo(ex - s2, ey + s2 * 0.35); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ff7a3c'; ctx.fillRect(ex - 1.5, ey + s2 * 0.15, 3, 2); }
        } else { lockT = 0; }
        ctx.restore();
        // --- HUD (glass-fixed) ---
        const on = (i) => Math.max(0, Math.min(1, (enterT - 0.3 - i * 0.14) / 0.25)) * (enterT < 1.6 ? (Math.floor(enterT * 20) % 4 ? 1 : 0.4) : 1);
        ctx.strokeStyle = G; ctx.fillStyle = G; ctx.lineWidth = 1.5 * k; ctx.lineCap = 'round';
        ctx.font = `${Math.round(11 * k)}px "Share Tech Mono", monospace`; ctx.textBaseline = 'middle';
        // pitch ladder rotates with the bank
        ctx.save(); ctx.globalAlpha = on(0);
        ctx.translate(w / 2, hudCY); ctx.rotate(-roll);
        ctx.beginPath(); ctx.rect(-w * 0.32, -h * 0.2 - pOff * 0 - h * 0.02, w * 0.64, h * 0.42); ctx.clip();
        for (let deg = -30; deg <= 30; deg += 5) {
          if (!deg) continue;
          const y = -deg * pxDeg * 2.2 + pOff * 2.2 * 0 + pOff;
          if (Math.abs(y) > h * 0.24) continue;
          const half = w * 0.13, gap = w * 0.05;
          ctx.setLineDash(deg < 0 ? [6 * k, 5 * k] : []);
          hudStroke(ctx, w, () => { line(ctx, -half, y, -gap, y); line(ctx, gap, y, half, y); line(ctx, -half, y, -half, y + (deg > 0 ? 6 : -6) * k); line(ctx, half, y, half, y + (deg > 0 ? 6 : -6) * k); });
          ctx.setLineDash([]);
          ctx.textAlign = 'right'; ctx.fillText(String(Math.abs(deg)), -half - 5 * k, y); ctx.textAlign = 'left'; ctx.fillText(String(Math.abs(deg)), half + 5 * k, y);
        }
        hudStroke(ctx, w, () => { line(ctx, -w * 0.3, pOff, -w * 0.09, pOff); line(ctx, w * 0.09, pOff, w * 0.3, pOff); });
        ctx.restore();
        // flight-path marker
        ctx.globalAlpha = on(1);
        const fx = w / 2 + Math.sin(t0 * 0.9) * 4 * k, fy = hudCY + 12 * k + Math.cos(t0 * 0.7) * 3 * k;
        hudStroke(ctx, w, () => { ctx.beginPath(); ctx.arc(fx, fy, 7 * k, 0, R.TAU); ctx.stroke(); line(ctx, fx - 22 * k, fy, fx - 7 * k, fy); line(ctx, fx + 7 * k, fy, fx + 22 * k, fy); line(ctx, fx, fy - 7 * k, fx, fy - 15 * k); });
        // heading tape
        ctx.globalAlpha = on(2);
        const hy = hudCY - h * 0.25, tw = w * 0.5;
        ctx.save(); ctx.beginPath(); ctx.rect(w / 2 - tw / 2, hy - 20 * k, tw, 40 * k); ctx.clip();
        for (let d = -40; d <= 40; d += 5) {
          const hv = Math.round(hdg / 5) * 5 + d, x = w / 2 + (hv - hdg) * (tw / 60);
          line(ctx, x, hy, x, hy + (hv % 10 === 0 ? 8 : 4) * k);
          if (hv % 10 === 0) { ctx.textAlign = 'center'; ctx.fillText(String(((hv % 360) + 360) % 360 / 10 | 0).padStart(2, '0'), x, hy - 8 * k); }
        }
        ctx.restore();
        ctx.beginPath(); ctx.moveTo(w / 2, hy + 10 * k); ctx.lineTo(w / 2 - 5 * k, hy + 17 * k); ctx.lineTo(w / 2 + 5 * k, hy + 17 * k); ctx.closePath(); ctx.fill();
        // speed and altitude boxes, G, Mach
        ctx.globalAlpha = on(3);
        const bx = w / 2 - w * 0.36, ax = w / 2 + w * 0.36, by = hudCY;
        ctx.textAlign = 'center';
        hudStroke(ctx, w, () => { ctx.strokeRect(bx - 28 * k, by - 11 * k, 56 * k, 22 * k); ctx.strokeRect(ax - 32 * k, by - 11 * k, 64 * k, 22 * k); });
        ctx.font = `${Math.round(14 * k)}px "Share Tech Mono", monospace`;
        ctx.fillText(String(Math.round(spd)), bx, by + 1);
        const alt = Math.round((18000 + Math.sin(t0 * 0.11) * 1400 - pitch * 9000) / 10) * 10;
        ctx.fillText(alt.toLocaleString('en-US'), ax, by + 1);
        ctx.font = `${Math.round(10 * k)}px "Share Tech Mono", monospace`;
        ctx.fillText('KTS', bx, by + 22 * k); ctx.fillText('ALT', ax, by + 22 * k);
        ctx.textAlign = 'left';
        ctx.fillText('G ' + gload.toFixed(1), bx - 28 * k, by + 44 * k);
        ctx.fillText('M ' + (spd / 661).toFixed(2), bx - 28 * k, by + 60 * k);
        ctx.textAlign = 'right'; ctx.fillText((v.bpm ? Math.round(v.bpm) : '---') + ' BPM', ax + 32 * k, by + 44 * k);
        ctx.fillText('ARM ' + (v.hot > 0.5 ? 'HOT' : 'SAFE'), ax + 32 * k, by + 60 * k);
        ctx.textAlign = 'left';
        // radar: one sweep per bar; the coming beats are contacts closing in, landing on the centre on the beat
        ctx.globalAlpha = on(4);
        const rr = Math.min(w, h) * (port ? 0.13 : 0.11), rx = w * (port ? 0.2 : 0.12) + 4, ry = port ? hudCY + h * 0.2 : h - rr - 40 * k;
        ctx.strokeStyle = 'rgba(124,255,155,.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(rx, ry, rr, 0, R.TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(rx, ry, rr * 0.5, 0, R.TAU); ctx.stroke();
        line(ctx, rx - rr, ry, rx + rr, ry); line(ctx, rx, ry - rr, rx, ry + rr);
        // the sweep is the bar itself: straight up on the bar's first beat
        const sw = v.bar * R.TAU - Math.PI / 2;
        const sweep = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
        sweep.addColorStop(0, 'rgba(124,255,155,.0)'); sweep.addColorStop(1, 'rgba(124,255,155,.28)');
        ctx.fillStyle = sweep; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.arc(rx, ry, rr, sw - 0.5, sw); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = G; line(ctx, rx, ry, rx + Math.cos(sw) * rr, ry + Math.sin(sw) * rr);
        R.viz.upcomingBeats(v.t, v.t + 2.4, up);
        for (let i = 0; i < up.length; i += 3) {
          const dtb = up[i] - v.t, s = up[i + 1], down = up[i + 2] === 0, f = dtb / 2.4;
          const hh = Math.sin(up[i] * 12.9898 + 78.233) * 43758.5453, ang = (hh - Math.floor(hh)) * R.TAU;
          const px = rx + Math.cos(ang) * rr * f, py = ry + Math.sin(ang) * rr * f;
          ctx.fillStyle = down ? RED : s > 0.75 ? A : G;
          const sz = (2 + s * 2.5 + (down ? 1.5 : 0)) * k;
          if (down) { ctx.beginPath(); ctx.moveTo(px, py - sz); ctx.lineTo(px + sz, py); ctx.lineTo(px, py + sz); ctx.lineTo(px - sz, py); ctx.closePath(); ctx.fill(); }
          else ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
        }
        for (let i = pings.length - 1; i >= 0; i--) { const p = pings[i]; p.r += dt * rr * 2.2; p.a -= dt * 2.2; if (p.a <= 0) { pings.splice(i, 1); continue; } ctx.strokeStyle = `rgba(124,255,155,${p.a})`; ctx.beginPath(); ctx.arc(rx, ry, p.r, 0, R.TAU); ctx.stroke(); }
        ctx.fillStyle = G; ctx.font = `${Math.round(9 * k)}px "Share Tech Mono", monospace`; ctx.textAlign = 'center';
        ctx.fillText('RDR · ' + (up.length / 3) + ' CONTACTS', rx, ry + rr + 12 * k); ctx.textAlign = 'left';
        // lock-on and missiles (chorus)
        ctx.globalAlpha = 1;
        if (v.hot > 0.3 && enemy.alive && enemy.sx != null) {
          lockT += dt;
          // the enemy's position, back on the glass (rotate it the way the world was rotated)
          const c = Math.cos(-roll), sn = Math.sin(-roll);
          const ex = w / 2 + enemy.sx * c - (enemy.sy + pOff) * sn, ey = hudCY + enemy.sx * sn + (enemy.sy + pOff) * c;
          enemy.gx = ex; enemy.gy = ey;
          const L = Math.max(0, 1 - lockT / 1.1), box = (14 + L * 70) * k;
          const locked = lockT > 1.1;
          ctx.strokeStyle = locked ? RED : A; ctx.lineWidth = 2 * k;
          hudStroke(ctx, w, () => { ctx.save(); ctx.translate(ex, ey); ctx.rotate(L * 1.6); ctx.strokeRect(-box / 2, -box / 2, box, box); ctx.restore(); });
          if (locked) { ctx.fillStyle = RED; ctx.textAlign = 'center'; ctx.font = `700 ${Math.round(12 * k)}px "Share Tech Mono", monospace`; if (Math.floor(t0 * 6) % 2) ctx.fillText('LOCK', ex, ey - box / 2 - 12 * k); ctx.textAlign = 'left'; }
        }
        for (let i = missiles.length - 1; i >= 0; i--) {
          const m = missiles[i]; m.t += dt;
          const f = Math.min(1, m.t / m.dur);
          const sx0 = w / 2 + m.sx * w, sy0 = h * 0.82;
          const tx = enemy.gx != null ? enemy.gx : w / 2, ty = enemy.gy != null ? enemy.gy : hudCY;
          const cx2 = (sx0 + tx) / 2 + m.sx * w * 0.6, cy2 = (sy0 + ty) / 2 + h * 0.05;
          const mx = (1 - f) * (1 - f) * sx0 + 2 * (1 - f) * f * cx2 + f * f * tx, my = (1 - f) * (1 - f) * sy0 + 2 * (1 - f) * f * cy2 + f * f * ty;
          m.trail.push([mx, my, 1]); if (m.trail.length > 30) m.trail.shift();
          ctx.lineCap = 'round';
          for (let j = 1; j < m.trail.length; j++) { const p0 = m.trail[j - 1], p1 = m.trail[j]; p0[2] -= dt * 1.2; ctx.strokeStyle = `rgba(230,235,245,${Math.max(0, p0[2]) * 0.45})`; ctx.lineWidth = (2 + (1 - p0[2]) * 9) * k; line(ctx, p0[0], p0[1], p1[0], p1[1]); }
          ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(mx, my, 3 * k, 0, R.TAU); ctx.fill();
          if (f >= 1) { missiles.splice(i, 1); booms.push({ x: tx, y: ty, t: 0 }); if (enemy.alive) { enemy.alive = false; enemy.respawn = 1.6; say('SPLASH ONE'); } }
        }
        for (let i = booms.length - 1; i >= 0; i--) {
          const b = booms[i]; b.t += dt; if (b.t > 0.9) { booms.splice(i, 1); continue; }
          const r = (10 + b.t * 120) * k, a = 1 - b.t / 0.9;
          const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
          g.addColorStop(0, `rgba(255,250,220,${a})`); g.addColorStop(0.35, `rgba(255,170,70,${a * 0.8})`); g.addColorStop(1, 'rgba(255,90,40,0)');
          ctx.fillStyle = g; ctx.fillRect(b.x - r, b.y - r, r * 2, r * 2);
        }
        // messages: waypoint, splash, HUD on
        if (msgT < 2.6 && msg) {
          ctx.globalAlpha = Math.floor(msgT * 5) % 2 && msgT < 1 ? 0.4 : Math.min(1, (2.6 - msgT) * 2);
          ctx.fillStyle = msg === 'SPLASH ONE' ? A : G; ctx.textAlign = 'center';
          ctx.font = `700 ${Math.round(13 * k)}px "Share Tech Mono", monospace`;
          let m2 = msg; while (m2.length > 6 && ctx.measureText(m2).width > w * 0.8) m2 = m2.slice(0, -2) + '…';
          ctx.fillText(m2, w / 2, hudCY + h * 0.13);
          ctx.textAlign = 'left'; ctx.globalAlpha = 1;
        }
        // the glass: a faint green tint and the combiner's edges
        ctx.fillStyle = 'rgba(124,255,155,.025)'; ctx.fillRect(0, 0, w, h);
        root.style.setProperty('--lv', v.level.toFixed(3));
        root.classList.toggle('hot', v.hot > 0.5);
      },
    };
  },
});
