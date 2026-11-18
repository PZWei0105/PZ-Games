/* ===================== skin: 真空管 TUBE AMP — a hand-built valve amplifier =====================
   Four power valves glow with the music: the heaters brighten with the loudness (slowly, like real filaments), flare a
   little on the bar's first beat, and in the chorus the blue glow of a hard-driven valve shows round the plates. Two
   backlit VU meters swing with real VU ballistics (300 ms). The INPUT selector is the sound effect: tap it to turn
   through 原音 / 3D / 重低音 / 現場; while the new effect is being prepared the valves dim and warm up again. */
R.skins.def({
  id: 'tube', name: '真空管', group: '復古', en: 'TUBE AMP',
  desc: '手工真空管擴大機：管子隨音樂發光、VU 表指針跟著甩；轉輸入旋鈕就是換音效（3D、重低音、現場）',
  bloom: { s: 0.62, th: 0.62, tint: '#ffb066' }, hero: '.tb-art', trans: 'classic', hype: false,
  theme: { bg: '#0c0907', fg: '#f6ead6', accent: '#ffa94d', accent2: '#e8c27a', ui: 'rgba(20,15,11,.97)', dock: 'rgba(30,22,15,.55)', dockfg: '#ffd39a' },
  enterMs: 2200, swapMs: 1300, punch: 0.45,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><radialGradient id="tbg" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#ffb35c"/><stop offset=".45" stop-color="#ff7a1a" stop-opacity=".55"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient><linearGradient id="tbf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9bf86"/><stop offset="1" stop-color="#a88a4f"/></linearGradient></defs><rect width="116" height="150" fill="#0d0a08"/><rect x="10" y="20" width="96" height="40" rx="5" fill="#16120f"/><text x="58" y="31" text-anchor="middle" font-family="Playfair Display, serif" font-style="italic" font-size="8" fill="#e8c27a">Reskin</text>${[0, 1, 2, 3].map((k) => { const x = 20 + k * 23; return `<circle cx="${x + 8}" cy="66" r="15" fill="url(#tbg)"/><rect x="${x}" y="44" width="16" height="36" rx="8" fill="#211a15" stroke="#5a4a3a" stroke-width=".8" opacity=".95"/><rect x="${x + 4}" y="54" width="8" height="16" rx="1.5" fill="#3b3430"/><rect x="${x + 6.5}" y="55" width="3" height="14" fill="#ffae5a"/><rect x="${x + 2}" y="78" width="12" height="6" rx="1.5" fill="#2a2018"/>`; }).join('')}<rect x="6" y="90" width="104" height="52" rx="4" fill="url(#tbf)"/>${[0, 1].map((k) => `<rect x="${12 + k * 50}" y="96" width="42" height="26" rx="3" fill="#f2dfa9"/><path d="M${18 + k * 50} 114 Q${33 + k * 50} 103 ${48 + k * 50} 114" fill="none" stroke="#3a2a18" stroke-width=".8"/><line x1="${33 + k * 50}" y1="120" x2="${38 + k * 50}" y2="106" stroke="#1a120a" stroke-width="1"/>`).join('')}<circle cx="34" cy="132" r="6" fill="#ddd" stroke="#666"/><circle cx="82" cy="132" r="6" fill="#ddd" stroke="#666"/><circle cx="58" cy="132" r="2.2" fill="#7dff8a"/></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 220, f2: 180, dur: 0.06, v: 0.05, type: 'triangle' }); },
    tick(s, t) { s.noise(t, { f: 3200, dur: 0.02, v: 0.03, q: 3 }); },
    toggle(s, t) { s.tone(t, { f: 120, dur: 0.05, v: 0.06, type: 'square' }); s.noise(t, { f: 2500, dur: 0.03, v: 0.04, q: 2 }); },
    play(s, t) { s.tone(t, { f: 60, f2: 60, dur: 0.5, v: 0.08, type: 'sine' }); s.notes(t + 0.05, [s.hz(57), s.hz(64), s.hz(69)], { dur: 0.5, v: 0.04, type: 'triangle', gap: 0.08 }); },
    pause(s, t) { s.notes(t, [s.hz(69), s.hz(64), s.hz(57)], { dur: 0.35, v: 0.035, type: 'triangle', gap: 0.06 }); },
    next(s, t) { s.noise(t, { f: 2600, dur: 0.03, v: 0.05, q: 2 }); s.tone(t + 0.03, { f: 330, f2: 440, dur: 0.12, v: 0.04, type: 'triangle' }); },
    prev(s, t) { s.noise(t, { f: 2600, dur: 0.03, v: 0.05, q: 2 }); s.tone(t + 0.03, { f: 440, f2: 330, dur: 0.12, v: 0.04, type: 'triangle' }); },
    enter(s, t) { s.tone(t, { f: 50, f2: 60, dur: 1.6, v: 0.07, type: 'sine' }); s.noise(t, { f: 1200, dur: 0.05, v: 0.06, q: 2 }); s.notes(t + 1.1, [s.hz(45), s.hz(52), s.hz(57), s.hz(64)], { dur: 0.9, v: 0.035, type: 'triangle', gap: 0.12 }); },
    open(s, t) { s.tone(t, { f: 330, f2: 392, dur: 0.08, v: 0.035, type: 'triangle' }); },
    close(s, t) { s.tone(t, { f: 392, f2: 330, dur: 0.08, v: 0.035, type: 'triangle' }); },
    ok(s, t) { s.notes(t, [s.hz(64), s.hz(69), s.hz(76)], { dur: 0.25, v: 0.04, type: 'triangle', gap: 0.07 }); },
    clack(s, t) { s.noise(t, { f: 3400, dur: 0.018, v: 0.09, q: 4 }); s.tone(t, { f: 150, f2: 90, dur: 0.05, v: 0.07, type: 'square' }); s.noise(t + 0.045, { f: 2600, dur: 0.012, v: 0.05, q: 4 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="tb-cv"></canvas>
      <div class="tb-hud" data-ui><b>Reskin <i>Audio</i></b><span>CLASS A · <em data-tb="st">STANDBY</em></span></div>
      <button type="button" class="tb-sel" data-ui aria-label="音效"></button>
      <div class="tb-panel">
        <div class="tb-row" data-ui>
          <div class="tb-art"><img data-bind="cover" alt="" draggable="false"></div>
          <div class="tb-tx"><div class="tb-t" data-bind="title"></div><div class="tb-a" data-bind="artist"></div></div>
        </div>
        <div class="seek tb-seek" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div><div class="seek-times"><span data-bind="time">0:00</span><span data-bind="dur">0:00</span></div></div>
        ${R.ui.ctrl('tb-ctrl')}
      </div>`;
    const cv = api.canvas(root.querySelector('.tb-cv'), { dprMax: 2 });
    const panel = root.querySelector('.tb-panel'), stEl = root.querySelector('[data-tb="st"]'), selBtn = root.querySelector('.tb-sel');
    const MODES = ['off', '3d', 'bass', 'live'], LABEL = ['原音', '3D', '重低音', '現場'];
    const rr = (c, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };

    /* ---------- layout ---------- */
    let L = null, under = null, over = null;
    function layout() {
      const { w, h } = cv, r0 = root.getBoundingClientRect(), pt = panel.getBoundingClientRect().top - r0.top;
      const land = w > h * 1.15, st = parseFloat(getComputedStyle(root).getPropertyValue('--st')) || 0;
      const top = (land ? 14 : 62) + st, bot = Math.max(top + 220, pt - 8), M = 18;
      let tz, fp;
      if (!land) { tz = { x: M, y: top, w: w - 2 * M, h: (bot - top) * 0.47 }; fp = { x: M - 6, y: tz.y + tz.h, w: w - 2 * M + 12, h: bot - tz.y - tz.h }; }
      else { tz = { x: M, y: top + 4, w: w * 0.46 - M, h: bot - top - 4 }; fp = { x: w * 0.46 + 6, y: top + 54, w: w * 0.54 - M - 6, h: bot - top - 54 }; }
      const gap = Math.min(18, tz.w * 0.045), tw = Math.min(70, (tz.w - 3 * gap - 24) / 4), th = Math.min(tz.h - 16, tw * 2.55);
      const tx0 = tz.x + (tz.w - (4 * tw + 3 * gap)) / 2, tb = tz.y + tz.h - 8;
      const tubes = [0, 1, 2, 3].map((k) => ({ x: tx0 + k * (tw + gap), y: tb - th, w: tw, h: th }));
      // the knobs (with their labels above and below) get their room first, the meters take the rest
      const kr = Math.max(15, Math.min(34, fp.w * 0.085, fp.h * (land ? 0.11 : 0.12))), below = 2 * kr + 40, my = fp.y + (land ? 12 : 30);
      const mh = Math.max(40, Math.min(Math.min(190, (fp.w - 3 * 12) / 2) * 0.6, fp.y + fp.h - 8 - below - my)), mw = mh / 0.6;
      const mx0 = fp.x + (fp.w - (2 * mw + 14)) / 2;
      const meters = [0, 1].map((k) => ({ x: mx0 + k * (mw + 14), y: my, w: mw, h: mh }));
      const room = fp.y + fp.h - 8 - (my + mh), ky = my + mh + Math.max(kr + 22, room / 2 + 2);
      L = { land, tz, fp, tubes, meters, sel: { x: fp.x + fp.w * 0.24, y: ky, r: kr }, vol: { x: fp.x + fp.w * 0.76, y: ky, r: kr }, led: { x: fp.x + fp.w * 0.5, y: ky } };
      const s = L.sel, pad = s.r + 26;
      Object.assign(selBtn.style, { left: s.x - pad + 'px', top: s.y - pad + 'px', width: pad * 2 + 'px', height: pad * 2 + 'px' });
      build(w, h);
    }

    /* ---------- the still parts, drawn once per size: under the glow, and the glass highlights over it ---------- */
    function build(w, h) {
      const d = Math.min(2, cv.dpr), mk = () => { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w * d)); c.height = Math.max(2, Math.round(h * d)); const x = c.getContext('2d'); x.scale(d, d); return [c, x]; };
      let x; [under, x] = mk();
      // room: dark walnut shelf
      const bg = x.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#120d0a'); bg.addColorStop(0.6, '#0c0907'); bg.addColorStop(1, '#070504'); x.fillStyle = bg; x.fillRect(0, 0, w, h);
      const rnd = R.rng(31);
      for (let k = 0; k < 90; k++) { x.strokeStyle = `rgba(120,80,45,${(0.02 + rnd() * 0.03).toFixed(3)})`; x.lineWidth = 1 + rnd() * 2; x.beginPath(); const yy = rnd() * h; x.moveTo(0, yy); x.bezierCurveTo(w * 0.3, yy + (rnd() - 0.5) * 30, w * 0.7, yy + (rnd() - 0.5) * 30, w, yy + (rnd() - 0.5) * 20); x.stroke(); }
      // chassis top and the transformer covers behind the valves
      const { tz, tubes, fp } = L, T0 = tubes[0], T3 = tubes[3];
      const cx0 = T0.x - 16, cx1 = T3.x + T3.w + 16, cyb = T0.y + T0.h + 6;
      const ch = x.createLinearGradient(0, cyb - 18, 0, cyb + 14); ch.addColorStop(0, '#2c2622'); ch.addColorStop(1, '#0e0b09');
      x.fillStyle = ch; rr(x, cx0, cyb - 16, cx1 - cx0, 26, 6); x.fill();
      const tfH = Math.min(T0.h * 0.5, 120), tfY = cyb - 16 - tfH * 0.86;
      for (const [a, b] of [[cx0 + 4, (cx0 + cx1) / 2 - 4], [(cx0 + cx1) / 2 + 4, cx1 - 4]]) {
        const tg = x.createLinearGradient(a, 0, b, 0); tg.addColorStop(0, '#1b1715'); tg.addColorStop(0.45, '#2f2925'); tg.addColorStop(1, '#141110');
        x.fillStyle = tg; rr(x, a, tfY, b - a, tfH, 8); x.fill(); x.strokeStyle = 'rgba(255,220,170,.06)'; x.stroke();
      }
      // each valve: socket, plate assembly, mica, getter, the dark glass
      for (const T of tubes) {
        const { x: X, y: Y, w: W, h: H } = T, gb = Y + H * 0.86;
        x.fillStyle = 'rgba(0,0,0,.5)'; x.beginPath(); x.ellipse(X + W / 2, gb + H * 0.12, W * 0.62, W * 0.16, 0, 0, R.TAU); x.fill();
        const so = x.createLinearGradient(X, 0, X + W, 0); so.addColorStop(0, '#1d1611'); so.addColorStop(0.4, '#4a3a2c'); so.addColorStop(1, '#16110d');
        x.fillStyle = so; rr(x, X + W * 0.06, gb - 2, W * 0.88, H * 0.12, 4); x.fill();
        // glass body (tinted, nearly black inside)
        x.save(); tubePath(x, T); x.clip();
        const gl = x.createLinearGradient(X, 0, X + W, 0); gl.addColorStop(0, 'rgba(60,48,40,.55)'); gl.addColorStop(0.5, 'rgba(20,16,14,.45)'); gl.addColorStop(1, 'rgba(60,48,40,.55)');
        x.fillStyle = gl; x.fillRect(X, Y, W, H);
        // plate: two dark grey halves with a slot, rods to the mica disc
        const plx = X + W * 0.2, plw = W * 0.6, ply = Y + H * 0.3, plh = H * 0.44;
        x.fillStyle = '#2b2725'; rr(x, plx, ply, plw * 0.42, plh, 3); x.fill(); rr(x, plx + plw * 0.58, ply, plw * 0.42, plh, 3); x.fill();
        x.fillStyle = 'rgba(255,255,255,.05)'; for (let k = 0; k < 6; k++) x.fillRect(plx + 2, ply + 6 + k * (plh / 6), plw * 0.42 - 4, 1);
        x.strokeStyle = '#6b625a'; x.lineWidth = 1;
        for (const rx of [X + W * 0.24, X + W * 0.76]) { x.beginPath(); x.moveTo(rx, Y + H * 0.2); x.lineTo(rx, gb); x.stroke(); }
        x.fillStyle = '#bdb4a8'; x.beginPath(); x.ellipse(X + W / 2, ply - 4, W * 0.36, W * 0.07, 0, 0, R.TAU); x.fill(); x.beginPath(); x.ellipse(X + W / 2, ply + plh + 4, W * 0.36, W * 0.07, 0, 0, R.TAU); x.fill();
        // getter flash: the silver mirror in the dome
        const gt = x.createRadialGradient(X + W * 0.45, Y + W * 0.42, 1, X + W / 2, Y + W * 0.5, W * 0.5); gt.addColorStop(0, 'rgba(210,205,200,.75)'); gt.addColorStop(0.6, 'rgba(120,105,95,.45)'); gt.addColorStop(1, 'rgba(60,50,45,0)');
        x.fillStyle = gt; x.fillRect(X, Y, W, H * 0.3);
        x.restore();
        x.strokeStyle = 'rgba(255,230,200,.14)'; x.lineWidth = 1.2; tubePath(x, T); x.stroke();
      }
      // the faceplate: black glass in a brushed brass frame, gold lettering
      x.fillStyle = 'rgba(0,0,0,.65)'; rr(x, fp.x + 2, fp.y + 7, fp.w, fp.h, 10); x.fill();
      const fr = x.createLinearGradient(0, fp.y, 0, fp.y + fp.h); fr.addColorStop(0, '#c9a463'); fr.addColorStop(0.5, '#7a5a2c'); fr.addColorStop(1, '#b38a48');
      x.fillStyle = fr; rr(x, fp.x, fp.y, fp.w, fp.h, 10); x.fill();
      const fg = x.createLinearGradient(0, fp.y, 0, fp.y + fp.h); fg.addColorStop(0, '#1d1712'); fg.addColorStop(0.5, '#0d0a08'); fg.addColorStop(1, '#130e0b');
      x.fillStyle = fg; rr(x, fp.x + 3, fp.y + 3, fp.w - 6, fp.h - 6, 8); x.fill();
      const gls = x.createLinearGradient(fp.x, fp.y, fp.x + fp.w * 0.6, fp.y + fp.h); gls.addColorStop(0, 'rgba(255,240,220,.07)'); gls.addColorStop(0.45, 'rgba(255,240,220,0)'); x.fillStyle = gls; rr(x, fp.x + 3, fp.y + 3, fp.w - 6, fp.h - 6, 8); x.fill();
      if (!L.land) { x.fillStyle = '#d8b46c'; x.font = 'italic 600 13px "Playfair Display", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Reskin Audio  ·  Integrated Valve Amplifier', fp.x + fp.w / 2, fp.y + 16); }
      // meters: bezel, cream face, scale
      for (let k = 0; k < 2; k++) {
        const m = L.meters[k];
        x.fillStyle = '#060504'; rr(x, m.x - 5, m.y - 5, m.w + 10, m.h + 10, 7); x.fill(); x.strokeStyle = 'rgba(216,180,108,.45)'; x.lineWidth = 1; x.stroke();
        const mf = x.createRadialGradient(m.x + m.w / 2, m.y + m.h * 1.1, m.h * 0.2, m.x + m.w / 2, m.y + m.h * 0.6, m.w * 0.7); mf.addColorStop(0, '#f2c46e'); mf.addColorStop(0.6, '#d99a3e'); mf.addColorStop(1, '#8a5a1e');
        x.fillStyle = mf; rr(x, m.x, m.y, m.w, m.h, 4); x.fill();
        const pv = pivot(m), rad = m.h * 0.86;
        x.lineWidth = 1.4; x.strokeStyle = '#3b2a17'; x.beginPath(); x.arc(pv.x, pv.y, rad, angOf(0) - Math.PI / 2, angOf(0.685) - Math.PI / 2); x.stroke();
        x.strokeStyle = '#c0261d'; x.lineWidth = 3; x.beginPath(); x.arc(pv.x, pv.y, rad, angOf(0.685) - Math.PI / 2, angOf(1) - Math.PI / 2); x.stroke();
        const marks = [[-20, '20'], [-10, '10'], [-7, '7'], [-5, '5'], [-3, '3'], [-1, ''], [0, '0'], [1, ''], [2, ''], [3, '+3']];
        x.font = `600 ${Math.max(7.5, m.h * 0.085)}px "Share Tech Mono", monospace`; x.textAlign = 'center'; x.textBaseline = 'middle';
        for (const [db, lab] of marks) {
          const a = angOf(posOf(db)) - Math.PI / 2, red = db >= 0;
          x.strokeStyle = red ? '#c0261d' : '#3b2a17'; x.lineWidth = 1.2;
          x.beginPath(); x.moveTo(pv.x + Math.cos(a) * rad, pv.y + Math.sin(a) * rad); x.lineTo(pv.x + Math.cos(a) * (rad + m.h * 0.07), pv.y + Math.sin(a) * (rad + m.h * 0.07)); x.stroke();
          if (lab) { x.fillStyle = red ? '#c0261d' : '#3b2a17'; x.fillText(lab, pv.x + Math.cos(a) * (rad + m.h * 0.15), pv.y + Math.sin(a) * (rad + m.h * 0.15)); }
        }
        x.fillStyle = '#3b2a17'; x.font = `italic 700 ${Math.round(m.h * 0.2)}px "Playfair Display", serif`; x.fillText('VU', m.x + m.w / 2, m.y + m.h * 0.72);
        x.font = `600 ${Math.max(7, m.h * 0.08)}px "Share Tech Mono", monospace`; x.fillText(k ? 'R' : 'L', m.x + m.w * 0.1, m.y + m.h * 0.85);
      }
      // labels and knob skirts
      x.fillStyle = '#d8b46c'; x.font = '700 9px "Share Tech Mono", monospace'; x.textAlign = 'center';
      x.fillText('INPUT', L.sel.x, L.sel.y + L.sel.r + 14); x.fillText('VOLUME', L.vol.x, L.vol.y + L.vol.r + 14); x.fillText('POWER', L.led.x, L.led.y + 18);
      for (const K of [L.sel, L.vol]) { x.fillStyle = 'rgba(0,0,0,.6)'; x.beginPath(); x.arc(K.x, K.y + 3, K.r + 5, 0, R.TAU); x.fill(); x.strokeStyle = 'rgba(216,180,108,.35)'; x.lineWidth = 1; x.beginPath(); x.arc(K.x, K.y, K.r + 4, 0, R.TAU); x.stroke(); }
      // the INPUT positions
      x.font = `700 ${Math.max(9, L.sel.r * 0.36)}px "Chakra Petch", sans-serif`;
      MODES.forEach((m, k) => { const a = selAng(k); x.fillStyle = '#b8955a'; x.fillText(LABEL[k], L.sel.x + Math.cos(a) * (L.sel.r + 17), L.sel.y + Math.sin(a) * (L.sel.r + 15)); });
      // glass highlights, drawn over the glow
      [over, x] = mk();
      for (const T of tubes) {
        x.save(); tubePath(x, T); x.clip();
        const hl = x.createLinearGradient(T.x, 0, T.x + T.w, 0); hl.addColorStop(0, 'rgba(255,255,255,0)'); hl.addColorStop(0.16, 'rgba(255,255,255,.22)'); hl.addColorStop(0.26, 'rgba(255,255,255,0)'); hl.addColorStop(0.78, 'rgba(255,255,255,0)'); hl.addColorStop(0.86, 'rgba(255,255,255,.12)'); hl.addColorStop(0.92, 'rgba(255,255,255,0)');
        x.fillStyle = hl; x.fillRect(T.x, T.y, T.w, T.h);
        x.restore();
      }
      for (const m of L.meters) { const gl = x.createLinearGradient(m.x, m.y, m.x + m.w, m.y + m.h); gl.addColorStop(0, 'rgba(255,255,255,.28)'); gl.addColorStop(0.35, 'rgba(255,255,255,.04)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gl; rr(x, m.x, m.y, m.w, m.h, 4); x.fill(); }
    }
    function tubePath(x, T) { const { x: X, y: Y, w: W, h: H } = T, r = W / 2, b = Y + H * 0.88; x.beginPath(); x.moveTo(X, b); x.lineTo(X, Y + r); x.arc(X + r, Y + r, r, Math.PI, 0); x.lineTo(X + W, b); x.closePath(); }
    const pivot = (m) => ({ x: m.x + m.w / 2, y: m.y + m.h * 1.02 });
    const angOf = (p) => -0.82 + p * 1.64;                                  // needle angle from vertical
    const posOf = (db) => (Math.pow(10, db / 20) - 0.1) / (Math.pow(10, 3 / 20) - 0.1);   // VU scale: linear in voltage
    const selAng = (k) => -Math.PI / 2 - 0.95 + k * (1.9 / 3);              // the four INPUT positions, over the knob

    /* ---------- live state ---------- */
    let warm = 0, flare = 0, vu = [0, 0], peak = [0, 0], selA = selAng(MODES.indexOf(R.sound.mode())), selV = 0, enterT = 0, lastSt = '';
    selBtn.addEventListener('click', () => { api.sfx('clack'); R.sound.set(R.sound.next()); });
    api.beat((s, i) => { if (i.down) flare = Math.max(flare, 0.5 * s); });
    function knob(c, K, ang, lit) {
      const { x, y, r } = K;
      const kg = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
      kg.addColorStop(0, '#fbfbfb'); kg.addColorStop(0.55, '#b9b9b9'); kg.addColorStop(1, '#5e5e5e');
      c.fillStyle = kg; c.beginPath(); c.arc(x, y, r, 0, R.TAU); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; for (let k = 0; k < 36; k++) { const a = (k / 36) * R.TAU; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.stroke(); }
      c.fillStyle = '#d9d9d9'; c.beginPath(); c.arc(x, y, r * 0.62, 0, R.TAU); c.fill();
      c.strokeStyle = lit ? '#ff8a1e' : '#2a2a2a'; c.lineWidth = Math.max(2, r * 0.1); c.lineCap = 'round';
      c.beginPath(); c.moveTo(x + Math.cos(ang) * r * 0.2, y + Math.sin(ang) * r * 0.2); c.lineTo(x + Math.cos(ang) * r * 0.8, y + Math.sin(ang) * r * 0.8); c.stroke(); c.lineCap = 'butt';
    }
    layout();
    return {
      enter() { enterT = 0; warm = 0; },
      swap() { flare = 0.8; },
      resize() { cv.resize(); layout(); },
      frame(dt, now, v) {
        enterT += dt;
        const { ctx, w, h } = cv;
        if (!L || !under || Math.abs(under.width / Math.min(2, cv.dpr) - w) > 1) layout();
        const S = R.sound.state(), working = S.kind === 'work', playing = v.playing;
        // heater glow: follows the loudness slowly; dims and warms up while an effect is being prepared
        const target = (playing ? 0.52 + 0.4 * Math.min(1, v.level * 1.15) : 0.3) * (working ? 0.35 + 0.65 * (S.p || 0) : 1) * Math.min(1, enterT / 1.6);
        warm += (target - warm) * (1 - Math.exp(-dt * (target > warm ? 3.2 : 1.6)));
        flare *= Math.exp(-dt * 3);
        const glow = Math.min(1.2, warm + flare * 0.4 + (playing ? v.pump * 0.06 : 0)) * (1 + (R.noise1(now * 7, 3) - 0.5) * 0.06);
        ctx.drawImage(under, 0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 4; k++) {
          const T = L.tubes[k], cx = T.x + T.w / 2, g = glow * (1 + (R.noise1(now * 3 + k * 9, 5) - 0.5) * 0.08);
          // the warm halo round the valve, the slot of the plate, the heater ends
          ctx.globalAlpha = Math.min(1, 0.32 * g); ctx.drawImage(api.glow('#ff7a1a', 64), cx - T.w * 1.3, T.y + T.h * 0.12, T.w * 2.6, T.h * 0.85);
          ctx.globalAlpha = Math.min(1, 0.9 * g); ctx.fillStyle = '#ff9b3d'; ctx.fillRect(cx - T.w * 0.05, T.y + T.h * 0.31, T.w * 0.1, T.h * 0.42);
          ctx.globalAlpha = Math.min(1, 0.75 * g); ctx.drawImage(api.glow('#ffb35c', 32), cx - T.w * 0.4, T.y + T.h * 0.22, T.w * 0.8, T.w * 0.5); ctx.drawImage(api.glow('#ffb35c', 32), cx - T.w * 0.4, T.y + T.h * 0.69, T.w * 0.8, T.w * 0.5);
          // driven hard (chorus, loud peaks): blue glow round the plate
          const blue = Math.max(v.hot * 0.8, playing ? Math.max(0, v.level - 0.8) * 3 : 0) * Math.min(1, warm * 1.5);
          if (blue > 0.02) { ctx.globalAlpha = Math.min(0.85, blue * (0.7 + v.pump * 0.5)); ctx.drawImage(api.glow('#5c7cff', 64), cx - T.w * 0.75, T.y + T.h * 0.24, T.w * 1.5, T.h * 0.56); }
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(over, 0, 0, w, h);
        // VU meters: backlight, needle with 300 ms ballistics, peak lamp
        const lv = playing ? v.level : 0, tilt = (v.bass - v.high) * 0.25;
        for (let k = 0; k < 2; k++) {
          const m = L.meters[k], db = -20 + 24 * Math.pow(Math.min(1.05, lv * (1 + (k ? -tilt : tilt))), 0.7) + (playing ? v.pump * 1.5 : 0);
          const tp = Math.max(0, Math.min(1.04, lv > 0.01 ? posOf(db) : 0));
          vu[k] += (tp - vu[k]) * (1 - Math.exp(-dt / 0.065));
          peak[k] = vu[k] > 0.93 ? 1 : peak[k] * Math.exp(-dt * 3);
          ctx.save(); rr(ctx, m.x, m.y, m.w, m.h, 4); ctx.clip(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.1 + glow * 0.14; ctx.drawImage(api.glow('#ffb35c', 64), m.x, m.y + m.h * 0.2, m.w, m.h * 1.4); ctx.restore();
          const pv = pivot(m), a = angOf(vu[k]) - Math.PI / 2, rad = m.h * 0.93;
          ctx.save(); rr(ctx, m.x, m.y, m.w, m.h, 4); ctx.clip();
          ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(pv.x + 2, pv.y + 1); ctx.lineTo(pv.x + 2 + Math.cos(a) * rad, pv.y + 3 + Math.sin(a) * rad); ctx.stroke();
          ctx.strokeStyle = '#120c06'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(pv.x, pv.y); ctx.lineTo(pv.x + Math.cos(a) * rad, pv.y + Math.sin(a) * rad); ctx.stroke();
          ctx.restore();
          ctx.fillStyle = '#1a140e'; ctx.fillRect(m.x - 4, m.y + m.h - 5, m.w + 8, 9);
          const px = m.x + m.w - 10, py = m.y + 9;
          ctx.globalAlpha = 0.3 + peak[k] * 0.7; ctx.fillStyle = '#ff3b2f'; ctx.beginPath(); ctx.arc(px, py, 3.2, 0, R.TAU); ctx.fill();
          if (peak[k] > 0.1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = peak[k] * 0.8; ctx.drawImage(api.glow('#ff3b2f', 32), px - 10, py - 10, 20, 20); ctx.globalCompositeOperation = 'source-over'; }
          ctx.globalAlpha = 1;
        }
        // INPUT selector (the sound effect) with a sprung pointer; volume knob; power lamp
        const want = selAng(Math.max(0, MODES.indexOf(R.sound.mode())));
        selV += ((want - selA) * 220 - selV * 22) * Math.min(0.05, dt); selA += selV * Math.min(0.05, dt);
        knob(ctx, L.sel, selA, R.sound.mode() !== 'off');
        knob(ctx, L.vol, -Math.PI / 2 + 0.75, false);
        MODES.forEach((m, k) => { if (m !== R.sound.mode()) return; const a = selAng(k), x = L.sel.x + Math.cos(a) * (L.sel.r + 6), y = L.sel.y + Math.sin(a) * (L.sel.r + 6); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9; ctx.drawImage(api.glow('#ff9b3d', 32), x - 8, y - 8, 16, 16); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; });
        const lc = working ? '#ffb020' : playing ? '#6dff7a' : '#ffb020', la = working ? 0.5 + 0.5 * Math.sin(now * 9) : playing ? 1 : 0.7;
        ctx.globalAlpha = la; ctx.fillStyle = lc; ctx.beginPath(); ctx.arc(L.led.x, L.led.y, 5, 0, R.TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = la * 0.8; ctx.drawImage(api.glow(lc, 32), L.led.x - 16, L.led.y - 16, 32, 32); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        const st = working ? 'WARMING UP ' + Math.round((S.p || 0) * 100) + '%' : !playing ? 'STANDBY' : R.sound.mode() === 'off' ? 'DIRECT' : R.sound.name();
        if (st !== lastSt) { lastSt = st; stEl.textContent = st; selBtn.setAttribute('aria-label', '音效：' + R.sound.name() + '（點一下換下一種）'); }
        root.style.setProperty('--glow', glow.toFixed(3));
      },
    };
  },
});
