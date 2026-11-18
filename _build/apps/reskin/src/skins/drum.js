/* ===================== skin: 鼓機 BEAT LAB — a groove box that plays the song's own drum pattern =====================
   The 16-step sequencer is programmed, bar by bar, from the drums the analysis found in this song (kick / snare / hats /
   low tones), each hit put on its sixteenth of the bar: you see the song's actual beat, and the playhead runs through it
   on the beat grid. The four pads light with the real hits and can be finger-drummed along. The tempo knob points at
   the song's BPM, the pattern display counts the bars, and in the chorus FILL lights up and the pads go rainbow. */
R.skins.def({
  id: 'drum', name: '鼓機', group: '酷炫', en: 'BEAT LAB',
  desc: '鼓機的十六格編曲盤，鼓點照這首歌的真實鼓聲排好、跟著節拍跑；四顆打擊墊隨大鼓小鼓亮，也能自己敲',
  bloom: { s: 0.6, th: 0.5, tint: '#ffb27a' }, hero: '.dr-art', trans: 'pixel', hype: 'lite',
  theme: { bg: '#0d0e12', fg: '#eef0f4', accent: '#ff6a3d', accent2: '#38e1ff', ui: 'rgba(16,17,22,.97)', dock: 'rgba(22,23,29,.55)', dockfg: '#ffb08f' },
  enterMs: 1700, swapMs: 1200, punch: 0.7,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="drm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2d34"/><stop offset="1" stop-color="#15161b"/></linearGradient></defs><rect width="116" height="150" fill="url(#drm)"/><rect x="8" y="12" width="100" height="44" rx="5" fill="#07080a" stroke="#3a3d45"/>${(() => { const C = ['#ff5a36', '#38e1ff', '#ffd23f', '#b47cff'], P = ['1000100010001010', '0000100000001000', '1010101010101011', '0010000100100000']; let s = ''; for (let r = 0; r < 4; r++) for (let c = 0; c < 16; c++) { const on = P[r][c] === '1'; s += `<rect x="${12 + c * 5.9 + Math.floor(c / 4) * 0.8}" y="${17 + r * 9.4}" width="4.6" height="7" rx="1.2" fill="${on ? C[r] : '#1c1e24'}" opacity="${on ? 1 : 0.9}"/>`; } return s; })()}<rect x="34.4" y="14" width="5.6" height="40" fill="#fff" opacity=".16"/>${[0, 1, 2, 3].map((k) => { const C = ['#ff5a36', '#38e1ff', '#ffd23f', '#b47cff'][k], x = 12 + (k % 2) * 48, y = 66 + Math.floor(k / 2) * 40; return `<rect x="${x}" y="${y}" width="44" height="36" rx="7" fill="#1e2027" stroke="${C}" stroke-opacity="${k === 0 ? 0.95 : 0.35}"/>${k === 0 ? `<rect x="${x + 4}" y="${y + 4}" width="36" height="28" rx="5" fill="${C}" opacity=".35"/>` : ''}`; }).join('')}<text x="58" y="146" text-anchor="middle" font-family="Orbitron, sans-serif" font-weight="700" font-size="7.5" fill="#ffb08f" letter-spacing="2">BEAT LAB</text></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 900, f2: 700, dur: 0.03, v: 0.05, type: 'square' }); },
    tick(s, t) { s.noise(t, { f: 7000, dur: 0.02, v: 0.03, type: 'highpass' }); },
    toggle(s, t) { s.tone(t, { f: 160, f2: 50, dur: 0.12, v: 0.15, type: 'sine' }); },
    play(s, t) { for (let k = 0; k < 4; k++) s.tone(t + k * 0.09, { f: k === 3 ? 180 : 140, f2: 45, dur: 0.16, v: 0.16, type: 'sine' }); s.noise(t + 0.27, { f: 2000, dur: 0.12, v: 0.06, q: 1.2 }); },
    pause(s, t) { s.tone(t, { f: 120, f2: 35, dur: 0.3, v: 0.14, type: 'sine' }); },
    next(s, t) { s.noise(t, { f: 8000, dur: 0.04, v: 0.04, type: 'highpass' }); s.noise(t + 0.08, { f: 8000, dur: 0.04, v: 0.04, type: 'highpass' }); s.noise(t + 0.16, { f: 1800, dur: 0.14, v: 0.07, q: 1.2 }); },
    prev(s, t) { s.noise(t, { f: 1800, dur: 0.14, v: 0.07, q: 1.2 }); s.noise(t + 0.14, { f: 8000, dur: 0.04, v: 0.04, type: 'highpass' }); },
    enter(s, t) { const P = [1, 0, 2, 0, 1, 1, 2, 0]; P.forEach((k, i) => { const u = t + i * 0.11; if (k === 1) s.tone(u, { f: 150, f2: 45, dur: 0.22, v: 0.17, type: 'sine' }); else if (k === 2) s.noise(u, { f: 1900, dur: 0.13, v: 0.07, q: 1.2 }); s.noise(u, { f: 9000, dur: 0.03, v: 0.025, type: 'highpass' }); }); },
    open(s, t) { s.tone(t, { f: 600, f2: 900, dur: 0.05, v: 0.04, type: 'square' }); },
    close(s, t) { s.tone(t, { f: 900, f2: 600, dur: 0.05, v: 0.04, type: 'square' }); },
    ok(s, t) { s.tone(t, { f: 150, f2: 45, dur: 0.2, v: 0.16, type: 'sine' }); s.noise(t + 0.12, { f: 1900, dur: 0.12, v: 0.06, q: 1.2 }); },
    padK(s, t) { s.tone(t, { f: 160, f2: 42, dur: 0.38, v: 0.32, type: 'sine', glide: 0.08 }); s.tone(t, { f: 1200, f2: 300, dur: 0.012, v: 0.05, type: 'square' }); },
    padS(s, t) { s.noise(t, { f: 1900, f2: 1500, dur: 0.2, v: 0.17, q: 0.9 }); s.tone(t, { f: 210, f2: 160, dur: 0.11, v: 0.12, type: 'triangle' }); },
    padH(s, t) { s.noise(t, { f: 9000, dur: 0.06, v: 0.08, type: 'highpass' }); },
    padT(s, t) { s.tone(t, { f: 110, f2: 108, dur: 0.32, v: 0.18, type: 'triangle' }); s.tone(t, { f: 220, dur: 0.18, v: 0.06, type: 'sine' }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="dr-cv"></canvas>
      <div class="dr-hud" data-ui><b>BEAT<i>//</i>LAB</b><span><em data-dr="pat">A-01</em> · STEP <em data-dr="step">01</em>/16<i class="dr-x"> · <em data-dr="bar">BAR 001</em></i></span></div>
      <div class="dr-panel">
        <div class="dr-row" data-ui>
          <div class="dr-art"><img data-bind="cover" alt="" draggable="false"></div>
          <div class="dr-tx"><div class="dr-t" data-bind="title"></div><div class="dr-a" data-bind="artist"></div></div>
          <div class="dr-bpm"><b data-bind="bpm">--</b><small>BPM</small></div>
        </div>
        <div class="seek dr-seek" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div><div class="seek-times"><span data-bind="time">0:00</span><span data-bind="dur">0:00</span></div></div>
        ${R.ui.ctrl('dr-ctrl')}
      </div>`;
    const cv = api.canvas(root.querySelector('.dr-cv'), { dprMax: 2 });
    const panel = root.querySelector('.dr-panel');
    const patEl = root.querySelector('[data-dr="pat"]'), stepEl = root.querySelector('[data-dr="step"]'), barEl = root.querySelector('[data-dr="bar"]');
    const K = ['kick', 'snare', 'hat', 'tone'], NAME = ['KICK', 'SNARE', 'HI-HAT', 'TONE'], COL = ['#ff5a36', '#38e1ff', '#ffd23f', '#b47cff'], SFX = ['padK', 'padS', 'padH', 'padT'];
    const rr = (x, y, w, h, r) => { const c = cv.ctx; r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };

    /* ---------- layout ---------- */
    let L = null, plate = null;
    function layout() {
      const { w, h } = cv, r0 = root.getBoundingClientRect(), pt = panel.getBoundingClientRect().top - r0.top;
      const land = w > h * 1.15, st = parseFloat(getComputedStyle(root).getPropertyValue('--st')) || 0;
      const top = (land ? 16 : 58) + st, bot = Math.max(top + 200, pt - 10), M = 16;
      if (!land) {
        const gx = M, gw = w - 2 * M, gh = Math.min(170, Math.max(118, (bot - top) * 0.32));
        const ky = top + gh + 12, kh = 62;
        const py = ky + kh + 12, ph = bot - py, ps = Math.max(54, Math.min((w - 2 * M - 14) / 2, (ph - 14) / 2, 170));
        const px = (w - (ps * 2 + 14)) / 2;
        L = { land, grid: { x: gx, y: top, w: gw, h: gh }, knobs: { x: M, y: ky, w: w - 2 * M, h: kh }, pads: [0, 1, 2, 3].map((k) => ({ x: px + (k % 2) * (ps + 14), y: py + Math.floor(k / 2) * (ps + 14) + Math.max(0, (ph - 2 * ps - 14) / 2), s: ps })) };
      } else {
        const gw = w * 0.56 - M, gh = Math.min(160, (bot - top) * 0.62), ky = top + gh + 10, kh = Math.max(44, Math.min(62, bot - ky));
        const dockB = top + 50, area = { x: w * 0.56 + 8, y: dockB, w: w * 0.44 - M - 8, h: bot - dockB }; // the dock sits top right
        const ps = Math.max(40, Math.min((area.w - 12) / 2, (area.h - 12) / 2));
        const px = area.x + (area.w - (ps * 2 + 12)) / 2, py = area.y + (area.h - (ps * 2 + 12)) / 2;
        L = { land, grid: { x: M, y: top, w: gw, h: gh }, knobs: { x: M, y: ky, w: gw, h: kh }, pads: [0, 1, 2, 3].map((k) => ({ x: px + (k % 2) * (ps + 12), y: py + Math.floor(k / 2) * (ps + 12), s: ps })) };
      }
      buildPlate(w, h);
    }
    // brushed graphite body, engraved outlines and screws: drawn once per size
    function buildPlate(w, h) {
      plate = document.createElement('canvas'); const d = Math.min(2, cv.dpr);
      plate.width = Math.max(2, Math.round(w * d)); plate.height = Math.max(2, Math.round(h * d));
      const x = plate.getContext('2d'); x.scale(d, d);
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#24262c'); g.addColorStop(0.5, '#1a1b20'); g.addColorStop(1, '#101115');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      const rnd = R.rng(77);
      for (let y = 0; y < h; y += 1.5) { x.fillStyle = `rgba(255,255,255,${(0.012 + rnd() * 0.022).toFixed(3)})`; x.fillRect(0, y, w, 0.6); }
      const eng = (r) => { x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 1.5; x.strokeRect(r.x - 6.5, r.y - 6.5, r.w + 13, r.h + 13); x.strokeStyle = 'rgba(255,255,255,.06)'; x.lineWidth = 1; x.strokeRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10); };
      eng(L.grid);
      const pp = L.pads, pr = { x: pp[0].x, y: pp[0].y, w: pp[1].x + pp[1].s - pp[0].x, h: pp[2].y + pp[2].s - pp[0].y }; eng(pr);
      for (const [sx, sy] of [[9, 9], [w - 9, 9], [9, h - 9], [w - 9, h - 9]]) { x.fillStyle = '#3c3f47'; x.beginPath(); x.arc(sx, sy, 3.6, 0, R.TAU); x.fill(); x.strokeStyle = '#15161a'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(sx - 2.2, sy - 2.2); x.lineTo(sx + 2.2, sy + 2.2); x.stroke(); }
    }

    /* ---------- the pattern of the bar being played, from the song's own hits ---------- */
    let bar = null, prev = null, fadeT = 1, barN = 0, lastCol = -1, flash = new Float32Array(16), tapE = new Float32Array(4);
    const live = [new Float32Array(16), new Float32Array(16), new Float32Array(16), new Float32Array(16)];
    const tmp = [];
    function buildBar(t) {
      const v = R.viz, ib = Math.max(0.2, v.ibi || 0.5);
      const arr = v.upcomingBeats(t - 4.6 * ib, t + 5.2 * ib, tmp);
      let d0 = -1;
      for (let i = 0; i < arr.length; i += 3) { if (arr[i] > t + 0.002) break; if (arr[i + 2] === 0) d0 = i; }
      const B = [];
      if (d0 >= 0) for (let i = d0; i < arr.length && B.length < 5; i += 3) B.push(arr[i]);
      else B.push(t - ((v.bpos || 0) + v.phase) * ib);
      while (B.length < 5) B.push(B[B.length - 1] + (B.length > 1 ? B[B.length - 1] - B[B.length - 2] : ib));
      const cells = K.map(() => new Float32Array(16)), has = R.viz.hits();
      if (has) for (let k = 0; k < 4; k++) {
        const hs = v.upcomingHits(K[k], B[0] - (B[1] - B[0]) / 8, B[4] - (B[4] - B[3]) / 8, []);
        for (let i = 0; i < hs.length; i += 2) { const s = stepAt(hs[i], B, true); if (s >= 0 && s < 16) cells[k][s] = Math.max(cells[k][s], hs[i + 1]); }
      }
      return { t0: B[0], t4: B[4], B, cells, has };
    }
    // the sixteenth of the bar at time t (rounded to the nearest for hits, counted down for the playhead)
    function stepAt(t, B, round) {
      let j = 0; while (j < 3 && t >= B[j + 1]) j++;
      const f = (t - B[j]) / Math.max(0.05, B[j + 1] - B[j]) * 4;
      return 4 * j + (round ? Math.round(f) : Math.floor(f));
    }
    function hitLive(kind, s) {
      if (bar && bar.has) return;
      const k = K.indexOf(kind); if (k < 0 || lastCol < 0) return;
      live[k][lastCol] = Math.max(live[k][lastCol], s);
    }
    api.hit((k, s) => hitLive(k, s));

    /* ---------- tapping the pads ---------- */
    const cvEl = root.querySelector('.dr-cv');
    cvEl.addEventListener('pointerdown', (e) => {
      if (!L) return;
      const r = cvEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      L.pads.forEach((p, k) => { if (x >= p.x && x <= p.x + p.s && y >= p.y && y <= p.y + p.s) { tapE[k] = 1; api.sfx(SFX[k]); } });
    });

    let enterT = 9, swapT = 9, lastHud = 0;
    layout();
    return {
      enter() { enterT = 0; },
      swap() { swapT = 0; prev = bar; bar = null; fadeT = 0; for (const a of live) a.fill(0); },
      resize() { cv.resize(); layout(); },
      frame(dt, now, v) {
        enterT += dt; swapT += dt; fadeT += dt;
        const { ctx, w, h } = cv;
        if (!L || Math.abs(plate.width / Math.min(2, cv.dpr) - w) > 1) layout();
        const t = v.t, playing = v.playing;
        if (!bar || t < bar.t0 - 0.12 || t >= bar.t4 - 0.004) { if (bar) { prev = bar; fadeT = 0; } bar = buildBar(t); for (const a of live) a.fill(0); root.dataset.cells = bar.cells.reduce((s, a) => s + a.filter((x) => x > 0).length, 0); }
        const col = Math.max(0, Math.min(15, stepAt(t, bar.B, false)));
        if (col !== lastCol) { if (playing) for (let k = 0; k < 4; k++) if (bar.cells[k][col] > 0) flash[col] = 1; lastCol = col; }
        for (let c = 0; c < 16; c++) flash[c] *= Math.exp(-dt * 7);
        for (let k = 0; k < 4; k++) tapE[k] *= Math.exp(-dt * 6);
        const hot = v.hot;
        barN = Math.max(0, Math.floor((Math.floor(v.beatT) - (v.bpos || 0)) / 4 + 0.01));
        ctx.drawImage(plate, 0, 0, w, h);
        // ---- the sequencer screen ----
        const G = L.grid;
        rr(G.x, G.y, G.w, G.h, 9);
        const sg = ctx.createLinearGradient(0, G.y, 0, G.y + G.h); sg.addColorStop(0, '#050608'); sg.addColorStop(1, '#0b0c10');
        ctx.fillStyle = sg; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1; ctx.stroke();
        const lw = Math.min(58, G.w * 0.15), hx = G.x + lw, top = G.y + 20, cw = (G.w - lw - 10) / 16, rh = (G.h - 28) / 4;
        ctx.font = `600 ${Math.max(9, Math.min(11, rh * 0.32))}px "Share Tech Mono", monospace`; ctx.textBaseline = 'middle';
        // step numbers; the beat's first step marked
        for (let c = 0; c < 16; c++) { ctx.fillStyle = c === col && playing ? '#ffffff' : c % 4 === 0 ? 'rgba(255,176,143,.85)' : 'rgba(255,255,255,.28)'; ctx.textAlign = 'center'; ctx.fillText(String(c + 1), hx + (c + 0.5) * cw, G.y + 11); }
        const appear = Math.min(1, enterT / 1.1);
        for (let k = 0; k < 4; k++) {
          const y = top + k * rh, cy = y + rh / 2;
          ctx.textAlign = 'left'; ctx.fillStyle = COL[k]; ctx.globalAlpha = 0.85; ctx.fillText(NAME[k], G.x + 9, cy); ctx.globalAlpha = 1;
          for (let c = 0; c < 16; c++) {
            if (c / 16 > appear) break;
            const x = hx + c * cw + (c % 4 === 0 ? 1.2 : 0.6), cwi = cw - 2.4, y0 = y + 3, hh = rh - 6;
            const on = bar.has ? bar.cells[k][c] : live[k][c];
            const was = prev && fadeT < 0.35 ? (prev.has ? prev.cells[k][c] : 0) * (1 - fadeT / 0.35) : 0;
            const passed = playing && c <= col && t >= bar.t0;
            let a = 0.07, fill = '#2a2c34';
            if (on > 0) { fill = hot > 0.5 ? R.color.hsl((c * 22 + k * 60 + Math.round(v.stepT * 2) * 30) % 360, 1, 0.6) : COL[k]; a = passed ? 0.55 + 0.45 * Math.min(1, on * 1.3) : 0.22 + 0.2 * on; }
            else if (was > 0) { fill = COL[k]; a = 0.2 * was; }
            ctx.globalAlpha = a; ctx.fillStyle = fill; rr(x, y0, cwi, hh, 2.5); ctx.fill();
            if (on > 0 && passed && flash[c] > 0.05 && c === col) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = flash[c] * 0.8; ctx.drawImage(api.glow(COL[k], 32), x - cwi * 0.8, y0 - hh * 0.5, cwi * 2.6, hh * 2); ctx.globalCompositeOperation = 'source-over'; }
          }
        }
        ctx.globalAlpha = 1;
        // the playhead
        if (playing || v.synced) {
          const ph = Math.max(0, Math.min(16, (() => { const B = bar.B; let j = 0; while (j < 3 && t >= B[j + 1]) j++; return 4 * j + ((t - B[j]) / Math.max(0.05, B[j + 1] - B[j])) * 4; })()));
          const px = hx + Math.floor(ph) * cw;
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = `rgba(255,255,255,${(0.07 + v.pump * 0.08).toFixed(3)})`; ctx.fillRect(px, top - 1, cw, rh * 4 + 2);
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(px, top - 3, cw, 2);
          ctx.globalCompositeOperation = 'source-over';
        }
        // scanlines
        ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let y = G.y + 2; y < G.y + G.h - 2; y += 3) ctx.fillRect(G.x + 2, y, G.w - 4, 1);
        if (swapT < 0.9) { ctx.globalAlpha = Math.max(0, 1 - swapT / 0.9); ctx.fillStyle = '#ffb08f'; ctx.font = '700 15px "Orbitron", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('LOADING PATTERN', G.x + G.w / 2, G.y + G.h / 2); ctx.globalAlpha = 1; }
        // ---- tempo knob, pattern display, level meter, run lights ----
        const Kn = L.knobs, kr = Math.min(Kn.h * 0.36, 24), kcy = Kn.y + Kn.h * 0.42;
        const knob = (cx, ang, label, val) => {
          ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.arc(cx, kcy + 2.5, kr + 1.5, 0, R.TAU); ctx.fill();
          const kg = ctx.createRadialGradient(cx - kr * 0.35, kcy - kr * 0.4, kr * 0.1, cx, kcy, kr); kg.addColorStop(0, '#5b606b'); kg.addColorStop(0.7, '#2a2d34'); kg.addColorStop(1, '#17181d');
          ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(cx, kcy, kr, 0, R.TAU); ctx.fill();
          for (let k = 0; k <= 10; k++) { const a = -Math.PI * 1.25 + (k / 10) * Math.PI * 1.5, r1 = kr + 4, r2 = kr + (k % 5 ? 6 : 8); ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, kcy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, kcy + Math.sin(a) * r2); ctx.stroke(); }
          ctx.strokeStyle = '#ff6a3d'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * kr * 0.25, kcy + Math.sin(ang) * kr * 0.25); ctx.lineTo(cx + Math.cos(ang) * kr * 0.85, kcy + Math.sin(ang) * kr * 0.85); ctx.stroke(); ctx.lineCap = 'butt';
          ctx.font = '600 9.5px "Share Tech Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillText(label + ' ' + val, cx, Kn.y + Kn.h - 3);
        };
        const bpm = v.bpm || 0;
        knob(Kn.x + kr + 6, -Math.PI * 1.25 + Math.max(0, Math.min(1, (bpm - 60) / 120)) * Math.PI * 1.5, 'TEMPO', bpm ? Math.round(bpm) : '--');
        knob(Kn.x + kr * 3 + 26, -Math.PI * 1.25 + (0.2 + 0.6 * v.level + 0.2 * v.pump) * Math.PI * 1.5, 'DRIVE', Math.round(v.level * 99));
        // pattern LCD
        const lx = Kn.x + kr * 4 + 48, lwid = Math.max(70, Math.min(140, Kn.w - (lx - Kn.x) - 92)), lh = Kn.h * 0.62;
        rr(lx, kcy - lh / 2, lwid, lh, 5); ctx.fillStyle = '#0a1a0f'; ctx.fill(); ctx.strokeStyle = 'rgba(120,255,160,.25)'; ctx.stroke();
        const pat = String.fromCharCode(65 + (Math.floor(barN / 8) % 8)) + '-' + String((barN % 8) + 1).padStart(2, '0');
        ctx.font = `${Math.round(lh * 0.72)}px "VT323", monospace`; ctx.textAlign = 'center'; ctx.fillStyle = '#8dffb0'; ctx.shadowColor = '#3dff7a'; ctx.shadowBlur = 8; ctx.fillText(pat, lx + lwid / 2, kcy + 1); ctx.shadowBlur = 0;
        ctx.font = '600 9.5px "Share Tech Mono", monospace'; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillText('PATTERN', lx + lwid / 2, Kn.y + Kn.h - 3);
        // run lights: PLAY blinks on the beat, FILL in the chorus, and a level ladder
        const ex = Kn.x + Kn.w - 6;
        const lamp = (x, y, c, on, label) => { ctx.globalAlpha = 0.25 + on * 0.75; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 4, 0, R.TAU); ctx.fill(); if (on > 0.2) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = on * 0.7; ctx.drawImage(api.glow(c, 32), x - 12, y - 12, 24, 24); ctx.globalCompositeOperation = 'source-over'; } ctx.globalAlpha = 1; ctx.font = '600 8.5px "Share Tech Mono", monospace'; ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.textAlign = 'right'; ctx.fillText(label, x - 9, y + 0.5); };
        lamp(ex - 4, Kn.y + 10, '#5dff8a', playing ? Math.max(0.15, v.pump) : 0, 'PLAY');
        lamp(ex - 4, Kn.y + 26, '#ff3b5c', playing && v.down > 0.3 ? v.down : 0.05, 'BAR');
        lamp(ex - 4, Kn.y + 42, '#ffd23f', hot, 'FILL');
        // ---- the pads ----
        for (let k = 0; k < 4; k++) {
          const p = L.pads[k], e = Math.min(1, Math.max([v.kickE, v.snareE, v.hatE, v.toneE][k] * (playing ? 1 : 0), tapE[k]));
          const ins = e * 2.2, x = p.x + ins, y = p.y + ins, s = p.s - ins * 2;
          ctx.fillStyle = 'rgba(0,0,0,.55)'; rr(p.x + 1, p.y + 4, p.s, p.s, 15); ctx.fill();
          const pg = ctx.createLinearGradient(x, y, x, y + s); pg.addColorStop(0, '#2c2e36'); pg.addColorStop(1, '#16171c');
          ctx.fillStyle = pg; rr(x, y, s, s, 14); ctx.fill();
          const col = hot > 0.5 ? R.color.hsl((Math.round(v.stepT) * 45 + k * 90) % 360, 1, 0.6) : COL[k];
          if (e > 0.02) {
            ctx.save(); rr(x, y, s, s, 14); ctx.clip();
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, e * 1.1);
            ctx.drawImage(api.glow(col, 64), x - s * 0.35, y - s * 0.35, s * 1.7, s * 1.7);
            ctx.restore();
          }
          ctx.strokeStyle = R.color.rgba(col, 0.28 + e * 0.7); ctx.lineWidth = 1.5 + e * 1.5; rr(x + 0.75, y + 0.75, s - 1.5, s - 1.5, 13.5); ctx.stroke();
          // rubber texture: a few faint dimples
          ctx.fillStyle = 'rgba(255,255,255,.035)'; for (let q = 1; q < 4; q++) for (let r = 1; r < 4; r++) { ctx.beginPath(); ctx.arc(x + (s * q) / 4, y + (s * r) / 4, Math.max(1, s * 0.012), 0, R.TAU); ctx.fill(); }
          ctx.font = `700 ${Math.max(10, Math.min(14, s * 0.1))}px "Chakra Petch", sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = e > 0.3 ? '#ffffff' : R.color.rgba(col, 0.8); ctx.fillText(NAME[k], x + s * 0.09, y + s * 0.9);
          ctx.font = `600 ${Math.max(9, Math.min(11, s * 0.08))}px "Share Tech Mono", monospace`; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillText('0' + (k + 1), x + s * 0.91, y + s * 0.16);
          ctx.textBaseline = 'middle';
        }
        // HUD numbers
        if (now - lastHud > 0.1) { lastHud = now; patEl.textContent = pat; stepEl.textContent = String(col + 1).padStart(2, '0'); barEl.textContent = 'BAR ' + String(barN + 1).padStart(3, '0'); }
        root.classList.toggle('fill', hot > 0.5);
      },
    };
  },
});
