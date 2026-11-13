/* ===================== skin: 重低音 SUBWOOFER — a huge speaker with the cover as its dust cap =====================
   The cone is a damped spring kicked by the song's kick drum (and a little by every beat), so it punches out and
   rebounds the way a real woofer does; beads lying on the cone jump off it on every punch and rain back down. An LED
   ring chases round on the beat, flashes on the bar's first beat, and turns into a rainbow in the chorus — the BASS
   DROP, when every kick also fires a shockwave and the whole cabinet shakes. Two tweeters answer the snare and hats. */
R.skins.def({
  id: 'woofer', name: '重低音', group: '科技', en: 'SUBWOOFER',
  desc: '巨大喇叭，封面就是中央的防塵蓋：大鼓一下喇叭整個推出來，上面的粒子跳起來，副歌重低音全開',
  bloom: { s: 0.58, th: 0.55, tint: '#7ad7ff' }, hero: '.wf-art', trans: 'shatter', hype: 'lite',
  theme: { bg: '#07080b', fg: '#eef3fa', accent: '#2fd1ff', accent2: '#ff3b5c', ui: 'rgba(12,13,18,.97)', dock: 'rgba(14,16,22,.5)', dockfg: '#8fe6ff' },
  enterMs: 1700, swapMs: 1200,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><radialGradient id="wfc" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#3a3f4a"/><stop offset=".7" stop-color="#14161b"/><stop offset="1" stop-color="#050608"/></radialGradient><radialGradient id="wfd" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ff7ab0"/><stop offset=".6" stop-color="#7a3cff"/><stop offset="1" stop-color="#1b0b3a"/></radialGradient></defs><rect width="116" height="150" fill="#0b0c10"/><g fill="#1a1c22">${Array.from({ length: 9 }, (_, r) => Array.from({ length: 7 }, (_, c) => `<circle cx="${10 + c * 16}" cy="${8 + r * 16}" r="1.3"/>`).join('')).join('')}</g><circle cx="58" cy="66" r="47" fill="none" stroke="#2fd1ff" stroke-width="3" stroke-dasharray="4 3.4" opacity=".9"/><circle cx="58" cy="66" r="42" fill="#2a2d34"/><circle cx="58" cy="66" r="37" fill="url(#wfc)"/><g fill="none" stroke="#000" stroke-opacity=".45"><circle cx="58" cy="66" r="31"/><circle cx="58" cy="66" r="25"/></g><circle cx="58" cy="66" r="15" fill="url(#wfd)"/><ellipse cx="53" cy="60" rx="6" ry="3" fill="#fff" opacity=".4"/><g fill="#8fe6ff"><circle cx="40" cy="48" r="1.6"/><circle cx="76" cy="54" r="1.4"/><circle cx="70" cy="84" r="1.6"/><circle cx="44" cy="80" r="1.2"/></g><circle cx="24" cy="128" r="9" fill="#23262d" stroke="#555b66"/><circle cx="92" cy="128" r="9" fill="#23262d" stroke="#555b66"/><circle cx="24" cy="128" r="4" fill="#cfd6e0"/><circle cx="92" cy="128" r="4" fill="#cfd6e0"/></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 90, f2: 55, dur: 0.09, v: 0.16, type: 'sine' }); },
    tick(s, t) { s.tone(t, { f: 160, f2: 110, dur: 0.04, v: 0.07, type: 'sine' }); },
    toggle(s, t) { s.tone(t, { f: 70, f2: 140, dur: 0.12, v: 0.12, type: 'sine' }); s.noise(t, { f: 1200, dur: 0.04, v: 0.02, q: 2 }); },
    play(s, t) { s.tone(t, { f: 160, f2: 38, dur: 0.5, v: 0.2, type: 'sine', glide: 0.2 }); s.noise(t, { f: 2500, f2: 600, dur: 0.12, v: 0.03, q: 2 }); },
    pause(s, t) { s.tone(t, { f: 80, f2: 30, dur: 0.4, v: 0.15, type: 'sine', glide: 0.35 }); },
    next(s, t) { s.tone(t, { f: 45, f2: 120, dur: 0.22, v: 0.16, type: 'sine' }); s.tone(t + 0.22, { f: 140, f2: 50, dur: 0.25, v: 0.12, type: 'sine' }); },
    prev(s, t) { s.tone(t, { f: 120, f2: 45, dur: 0.22, v: 0.16, type: 'sine' }); s.tone(t + 0.22, { f: 50, f2: 140, dur: 0.25, v: 0.12, type: 'sine' }); },
    enter(s, t) { s.tone(t, { f: 25, f2: 55, dur: 0.9, v: 0.22, type: 'sine', glide: 0.8 }); for (let k = 0; k < 3; k++) s.tone(t + 0.9 + k * 0.23, { f: 120, f2: 38, dur: 0.2, v: 0.2, type: 'sine' }); s.noise(t + 0.9, { f: 3000, f2: 300, dur: 0.6, v: 0.03, q: 1 }); },
    open(s, t) { s.tone(t, { f: 110, f2: 180, dur: 0.1, v: 0.09, type: 'sine' }); },
    close(s, t) { s.tone(t, { f: 180, f2: 90, dur: 0.1, v: 0.09, type: 'sine' }); },
    ok(s, t) { s.tone(t, { f: 140, f2: 40, dur: 0.3, v: 0.16, type: 'sine' }); s.notes(t + 0.05, [s.hz(69), s.hz(76)], { dur: 0.12, v: 0.04, type: 'triangle', gap: 0.07 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="wf-cv"></canvas>
      <div class="wf-hud" data-ui><b>SUB<i>//</i>WOOFER</b><span><em data-wf="hz">-- Hz</em> · <em data-wf="db">--- dB</em><i class="wf-spec"> · 18" 2400 W</i></span></div>
      <div class="wf-drop" aria-hidden="true">BASS DROP</div>
      <div class="wf-panel">
        <div class="wf-row" data-ui>
          <div class="wf-art"><img data-bind="cover" alt="" draggable="false"></div>
          <div class="wf-tx"><div class="wf-t" data-bind="title"></div><div class="wf-a" data-bind="artist"></div></div>
          <div class="wf-bpm"><b data-bind="bpm">--</b><small>BPM</small></div>
        </div>
        <div class="seek wf-seek" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div><div class="seek-times"><span data-bind="time">0:00</span><span data-bind="dur">0:00</span></div></div>
        ${R.ui.ctrl('wf-ctrl')}
      </div>`;
    const cv = api.canvas(root.querySelector('.wf-cv'), { dprMax: 2 });
    const panel = root.querySelector('.wf-panel');
    const hzEl = root.querySelector('[data-wf="hz"]'), dbEl = root.querySelector('[data-wf="db"]');
    const rnd = R.rng(1818);
    // layout
    let L = null, cab = null;
    function layout() {
      const { w, h } = cv;
      const r0 = root.getBoundingClientRect(), pt = panel.getBoundingClientRect().top - r0.top;
      const land = w > h;
      const top = land ? 22 : 64, bot = Math.max(top + (land ? 150 : 200), pt - 12);
      const area = bot - top;
      const Rw = land ? Math.min(area * 0.38, w * 0.22) : Math.min(w * 0.4, area * 0.36);
      const cx = w / 2, cy = land ? top + area * 0.5 : top + Math.min(area * 0.43, Rw * 1.25 + 16);
      const tw = Rw * 0.15;
      const tweet = land ? [[cx - Rw * 1.75, cy], [cx + Rw * 1.75, cy]] : [[cx - Rw * 0.82, Math.min(bot - tw - 8, cy + Rw * 1.42)], [cx + Rw * 0.82, Math.min(bot - tw - 8, cy + Rw * 1.42)]];
      L = { cx, cy, Rw, tw, tweet, land };
      buildCab(w, h);
    }
    // the cabinet face: dark tolex with a dotted grille, drawn once per size
    function buildCab(w, h) {
      cab = document.createElement('canvas'); const d = Math.min(2, cv.dpr);
      cab.width = Math.max(2, Math.round(w * d)); cab.height = Math.max(2, Math.round(h * d));
      const x = cab.getContext('2d'); x.scale(d, d);
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#101217'); g.addColorStop(0.6, '#0a0b0f'); g.addColorStop(1, '#050608');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,255,255,.045)';
      const s = 11;
      for (let yy = s / 2; yy < h; yy += s) for (let xx = ((yy / s) % 2 ? s / 2 : 0) + s / 2; xx < w; xx += s) { x.beginPath(); x.arc(xx, yy, 1.4, 0, R.TAU); x.fill(); }
      // the woofer's mounting ring and screws (the moving parts are drawn each frame)
      const { cx, cy, Rw } = L;
      x.fillStyle = 'rgba(0,0,0,.6)'; x.beginPath(); x.arc(cx, cy + 4, Rw * 1.13, 0, R.TAU); x.fill();
      const mg = x.createLinearGradient(cx - Rw, cy - Rw, cx + Rw, cy + Rw); mg.addColorStop(0, '#5d636e'); mg.addColorStop(0.5, '#23262d'); mg.addColorStop(1, '#4a505a');
      x.fillStyle = mg; x.beginPath(); x.arc(cx, cy, Rw * 1.09, 0, R.TAU); x.arc(cx, cy, Rw * 0.99, 0, R.TAU, true); x.fill();
      for (let k = 0; k < 8; k++) { const a = (k / 8) * R.TAU + 0.2, sx = cx + Math.cos(a) * Rw * 1.04, sy = cy + Math.sin(a) * Rw * 1.04; x.fillStyle = '#aeb5bf'; x.beginPath(); x.arc(sx, sy, Math.max(2, Rw * 0.022), 0, R.TAU); x.fill(); x.strokeStyle = '#2a2d33'; x.lineWidth = 1; x.beginPath(); x.moveTo(sx - Rw * 0.015, sy); x.lineTo(sx + Rw * 0.015, sy); x.stroke(); }
      for (const [tx, ty] of L.tweet) { x.fillStyle = '#1c1f25'; x.beginPath(); x.arc(tx, ty, L.tw * 1.6, 0, R.TAU); x.fill(); x.strokeStyle = '#4a505a'; x.lineWidth = 2; x.stroke(); }
    }
    // the dust cap: the cover in a circle, re-made when the cover or size changes
    let cap = null, capKey = '', art = null;
    function loadArt(t) { art = null; capKey = ''; if (!t) return; api.coverImage(t).then((im) => { if (api.track() && api.track().id === t.id) { art = im; capKey = ''; } }); }
    function capOf(r) {
      const key = Math.round(r) + '|' + (art ? art.src : '-');
      if (key === capKey && cap) return cap;
      capKey = key; const n = Math.max(8, Math.round(r * 2 * Math.min(2, cv.dpr)));
      cap = document.createElement('canvas'); cap.width = cap.height = n; const x = cap.getContext('2d');
      x.beginPath(); x.arc(n / 2, n / 2, n / 2, 0, R.TAU); x.clip();
      if (art) { try { x.drawImage(art, 0, 0, n, n); } catch (e) { /* ignore */ } } else { const c = api.colors(); const g = x.createLinearGradient(0, 0, n, n); g.addColorStop(0, c.vibrant); g.addColorStop(1, c.dark); x.fillStyle = g; x.fillRect(0, 0, n, n); }
      const sh = x.createRadialGradient(n * 0.38, n * 0.32, 0, n / 2, n / 2, n * 0.55);
      sh.addColorStop(0, 'rgba(255,255,255,.34)'); sh.addColorStop(0.35, 'rgba(255,255,255,.06)'); sh.addColorStop(0.8, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.5)');
      x.fillStyle = sh; x.fillRect(0, 0, n, n);
      return cap;
    }
    // beads on the cone
    const beads = []; for (let i = 0; i < 130; i++) { const a = rnd() * R.TAU, rr = 0.42 + Math.sqrt(rnd()) * 0.42; beads.push({ a, rr, z: 0, vz: 0, hue: rnd() }); }
    // the cone is a damped spring; kicks (and beats) push it
    let ex = 0, ev = 0, enterT = 0, swapT = 9, shake = 0, lastHz = 0;
    const waves = [];
    let pal = api.colors(), tw0 = 0, tw1 = 0;
    api.hit((k, s) => { if (k === 'kick') { ev += 10 * s; if (R.viz.hot > 0.5) waves.push({ r: 1.05, a: 0.55 * s }); } else if (k === 'snare') tw0 = Math.max(tw0, s); else if (k === 'hat') tw1 = Math.max(tw1, s); });
    api.beat((s, i) => { ev += (i.down ? 6.5 : 3.5) * s; if (i.down) { waves.push({ r: 1.05, a: 0.8 * s }); if (R.viz.hot > 0.5) shake = Math.min(1, shake + 0.6); } });
    loadArt(api.track());
    layout();
    return {
      enter() { enterT = 0; ex = -0.4; },
      swap() { swapT = 0; ev += 9; for (const b of beads) b.vz += 1.6 + Math.random() * 1.6; },
      onTrack(t) { loadArt(t); pal = api.colors(t); },
      resize() { cv.resize(); layout(); },
      frame(dt, t, v) {
        enterT += dt; swapT += dt;
        const { ctx, w, h } = cv;
        if (!L || Math.abs(L.cx - w / 2) > 1) layout();
        const { cx, cy, Rw } = L;
        // spring: x'' = -w²x - 2ζw x' (+ pushes)
        const om = 2 * Math.PI * 4.2, ze = 0.32, sub = 4, hd = Math.min(0.05, dt) / sub;
        const playing = v.playing;
        for (let k = 0; k < sub; k++) { const ac = -om * om * ex - 2 * ze * om * ev + (playing ? v.bass * 6 : 0) - (playing ? 0 : 0); ev += ac * hd; ex += ev * hd; }
        ex = Math.max(-0.6, Math.min(1.25, ex));
        const e = R.reduced ? 0 : ex;
        shake *= Math.exp(-dt * 7);
        tw0 *= Math.exp(-dt * 12); tw1 *= Math.exp(-dt * 18);
        const hot = v.hot;
        // cabinet
        ctx.save();
        if (shake > 0.02 && !R.reduced) ctx.translate((Math.random() - 0.5) * 7 * shake, (Math.random() - 0.5) * 7 * shake);
        ctx.drawImage(cab, 0, 0, w, h);
        // shockwaves from the woofer's edge
        ctx.globalCompositeOperation = 'lighter';
        for (let k = waves.length - 1; k >= 0; k--) {
          const q = waves[k]; q.r += dt * 1.6; q.a -= dt * 0.9; if (q.a <= 0) { waves.splice(k, 1); continue; }
          ctx.strokeStyle = R.color.rgba(hot > 0.5 ? R.color.hsl((Math.round(t * 6) * 15) % 360, 1, 0.6) : '#2fd1ff', q.a * 0.6); ctx.lineWidth = 2 + q.a * 6;
          ctx.beginPath(); ctx.arc(cx, cy, Rw * q.r, 0, R.TAU); ctx.stroke();
        }
        // LED ring: chases one step per beat, flashes on the bar's first beat, rainbow in the chorus
        const NL = 48, step = Math.floor(v.beatT * 4), rl = Rw * 1.165;
        for (let k = 0; k < NL; k++) {
          const a = (k / NL) * R.TAU - Math.PI / 2, lx = cx + Math.cos(a) * rl, ly = cy + Math.sin(a) * rl;
          const chase = playing ? (((k - step) % 8) + 8) % 8 === 0 ? 1 : 0 : 0;
          const lit = Math.min(1, 0.22 + v.pump * 0.45 + chase * 0.55 + v.down * 0.5);
          // hues come in 15° steps so the glow sprites stay cached
          const col = hot > 0.5 ? R.color.hsl((Math.round((k * 7.5 + v.stepT * 45) / 15) * 15) % 360, 1, 0.58) : v.down > 0.5 ? '#ffffff' : k % 2 ? '#2fd1ff' : pal.vibrant;
          ctx.globalAlpha = lit; ctx.drawImage(api.glow(col, 32), lx - 9, ly - 9, 18, 18);
          ctx.globalAlpha = Math.min(1, lit + 0.2); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(lx, ly, Math.max(1.5, Rw * 0.014), 0, R.TAU); ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        // surround (the rubber roll): its highlight slides as the cone moves
        const rs = Rw * (0.995 + e * 0.012);
        const sg = ctx.createRadialGradient(cx - Rw * 0.18 * (1 + e * 0.3), cy - Rw * 0.22 * (1 + e * 0.3), Rw * 0.7, cx, cy, rs);
        sg.addColorStop(0, '#0d0e11'); sg.addColorStop(0.55, '#24272e'); sg.addColorStop(0.8, `rgb(${58 + e * 30 | 0},${62 + e * 30 | 0},${70 + e * 30 | 0})`); sg.addColorStop(1, '#0b0c0f');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, rs, 0, R.TAU); ctx.fill();
        // cone: comes out at the centre more than at the edge
        const rc = Rw * 0.86 * (1 + e * 0.035), rin = Rw * 0.36 * (1 + e * 0.13);
        const cg = ctx.createRadialGradient(cx - Rw * 0.2 * (1 - e * 0.4), cy - Rw * 0.25 * (1 - e * 0.4), rin * 0.4, cx, cy, rc);
        cg.addColorStop(0, `rgb(${70 + e * 50 | 0},${74 + e * 50 | 0},${84 + e * 50 | 0})`); cg.addColorStop(0.45, '#1f2228'); cg.addColorStop(1, '#090a0d');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, rc, 0, R.TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.2;
        for (let k = 1; k <= 4; k++) { const r = rin + (rc - rin) * (k / 5) * (1 - e * 0.04 * (5 - k)); ctx.beginPath(); ctx.arc(cx, cy, r, 0, R.TAU); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(255,255,255,.05)';
        for (let k = 1; k <= 4; k++) { const r = rin + (rc - rin) * (k / 5) + 1.5; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 1.05, Math.PI * 1.65); ctx.stroke(); }
        // dust cap = the cover
        const capR = rin * (1 + e * 0.05);
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.arc(cx + 2, cy + 3 + e * 2, capR * 1.04, 0, R.TAU); ctx.fill();
        ctx.drawImage(capOf(capR), cx - capR, cy - capR, capR * 2, capR * 2);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.6, 0.12 + v.pump * 0.3 + Math.max(0, e) * 0.3); ctx.drawImage(api.glow(pal.vibrant, 64), cx - capR * 1.4, cy - capR * 1.4, capR * 2.8, capR * 2.8);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        // beads: thrown off the cone when it punches out, falling back onto it
        const surfV = ev;
        for (const b of beads) {
          const lift = 1 - b.rr * 0.7; // the middle of the cone moves most
          if (b.z <= 0.001 && surfV * lift > b.vz && surfV > 0.6) b.vz = surfV * lift * 0.34 * (0.7 + b.hue * 0.6);
          b.vz -= 9.5 * dt; b.z += b.vz * dt;
          if (b.z < 0) { b.z = 0; b.vz = 0; }
          const r = b.rr * Rw * (1 + e * 0.03), px = cx + Math.cos(b.a) * r, py = cy + Math.sin(b.a) * r;
          const zz = Math.min(2.2, b.z), sz = Math.max(1.4, Rw * 0.016) * (1 + zz * 0.9);
          if (zz > 0.02) { ctx.fillStyle = `rgba(0,0,0,${0.35 * Math.max(0, 1 - zz)})`; ctx.beginPath(); ctx.ellipse(px, py + 2, sz, sz * 0.5, 0, 0, R.TAU); ctx.fill(); }
          const yy = py - zz * Rw * 0.32, col = b.hue < 0.5 ? '#8fe6ff' : pal.light;
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + Math.min(0.5, zz * 0.4); ctx.drawImage(api.glow(col, 32), px - sz * 2, yy - sz * 2, sz * 4, sz * 4);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, yy, sz * 0.55, 0, R.TAU); ctx.fill();
        }
        // tweeters: snare and hats
        for (let k = 0; k < 2; k++) {
          const [tx, ty] = L.tweet[k], tr = L.tw * (1 + (k ? tw1 : tw0) * 0.12), lit = k ? tw1 : tw0;
          const dg = ctx.createRadialGradient(tx - tr * 0.35, ty - tr * 0.4, 0, tx, ty, tr);
          dg.addColorStop(0, '#d9dee6'); dg.addColorStop(0.45, '#6d7480'); dg.addColorStop(1, '#22252b');
          ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(tx, ty, tr, 0, R.TAU); ctx.fill();
          if (lit > 0.03) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = lit * 0.6; ctx.drawImage(api.glow(k ? '#ffd36b' : '#ff3b5c', 64), tx - tr * 2.6, ty - tr * 2.6, tr * 5.2, tr * 5.2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        }
        ctx.restore();
        // readouts
        if (t - lastHz > 0.25) {
          lastHz = t;
          let bi = 0, bm = -1; for (let k = 0; k < 6; k++) if (v.bands[k] > bm) { bm = v.bands[k]; bi = k; }
          const hz = Math.round(35 * Math.pow(11000 / 35, (bi + 0.5) / 32));
          hzEl.textContent = (playing ? hz : '--') + ' Hz'; dbEl.textContent = (playing ? Math.round(92 + v.level * 34 + v.kickE * 6) : '---') + ' dB';
        }
        root.style.setProperty('--lv', v.level.toFixed(3));
        root.classList.toggle('drop', hot > 0.5 && !R.reduced);
      },
    };
  },
});
