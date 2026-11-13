/* ===================== skin: 節奏大師 BEAT RUSH — the song plays its own rhythm game =====================
   A neon note highway in perspective. The chart is written from the song's measured hits: kick drum on the left lane,
   bass / piano notes next, then snare, then hats; every note reaches the judgment line exactly when that sound plays.
   The beat grid scrolls down the highway as lines (the bar's first beat brightest). Each note lands as a PERFECT with
   sparks, the combo climbs, the score rolls; the chorus is FEVER — gold lanes, double score, speed lines. */
R.skins.def({
  id: 'rhythm', name: '節奏大師', group: '科技', en: 'BEAT RUSH',
  desc: '音樂遊戲的霓虹軌道：音符照這首歌的鼓聲寫成，剛好在聲音響起時落到判定線，副歌進入 FEVER',
  bloom: { s: 0.72, th: 0.5, streak: 0.3, tint: '#8af6ff' }, hero: '.rr-jacket', depth: [['.rr-score', 0.9], ['.rr-card', 0.5]], trans: 'pixel', hype: false,
  theme: { bg: '#060313', fg: '#f2f0ff', accent: '#22e5ff', accent2: '#ff3fa4', ui: 'rgba(12,8,30,.97)', dock: 'rgba(16,8,40,.5)', dockfg: '#8af6ff' },
  enterMs: 1800, swapMs: 1300,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="rre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140a33"/><stop offset="1" stop-color="#05020f"/></linearGradient><linearGradient id="rrl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22e5ff" stop-opacity="0"/><stop offset="1" stop-color="#22e5ff"/></linearGradient></defs><rect width="116" height="150" fill="url(#rre)"/><polygon points="50,20 66,20 112,124 4,124" fill="#0e0828" stroke="url(#rrl)" stroke-width="1.6"/><g stroke="#8a7bff" stroke-opacity=".35" stroke-width="1"><path d="M54 20L31 124M58 20V124M62 20L85 124"/></g><g stroke="#fff" stroke-opacity=".18"><path d="M45 40H71M37 62H79M25 92H91"/></g><rect x="9" y="104" width="23" height="7" rx="3" fill="#22e5ff"/><rect x="40" y="76" width="16" height="6" rx="3" fill="#a46bff"/><rect x="62" y="56" width="12" height="5" rx="2.5" fill="#ff3fa4"/><rect x="83" y="96" width="21" height="7" rx="3" fill="#ffd23f"/><rect x="2" y="122" width="112" height="4" fill="#fff"/><text x="58" y="142" text-anchor="middle" font-family="Orbitron, sans-serif" font-weight="900" font-size="10" fill="#ffd23f" letter-spacing="1.5">PERFECT</text></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 1760, dur: 0.03, v: 0.05, type: 'square', lp: 6000 }); },
    tick(s, t) { s.tone(t, { f: 2640, dur: 0.018, v: 0.035, type: 'square', lp: 7000 }); },
    toggle(s, t) { s.notes(t, [s.hz(81), s.hz(88)], { dur: 0.05, v: 0.05, type: 'square', gap: 0.04, lp: 6000 }); },
    play(s, t) { s.notes(t, [s.hz(72), s.hz(76), s.hz(79), s.hz(84)], { dur: 0.08, v: 0.06, type: 'square', gap: 0.06, lp: 5000 }); s.tone(t + 0.26, { f: s.hz(96), dur: 0.22, v: 0.05, type: 'triangle' }); },
    pause(s, t) { s.notes(t, [s.hz(84), s.hz(79), s.hz(72)], { dur: 0.07, v: 0.05, type: 'square', gap: 0.05, lp: 4500 }); },
    next(s, t) { s.tone(t, { f: 600, f2: 2400, dur: 0.14, v: 0.06, type: 'square', lp: 5000 }); s.noise(t, { f: 2000, f2: 8000, dur: 0.12, v: 0.04, q: 3 }); },
    prev(s, t) { s.tone(t, { f: 2400, f2: 600, dur: 0.14, v: 0.06, type: 'square', lp: 5000 }); s.noise(t, { f: 8000, f2: 2000, dur: 0.12, v: 0.04, q: 3 }); },
    enter(s, t) { s.notes(t, [s.hz(60), s.hz(67), s.hz(72), s.hz(76), s.hz(79), s.hz(84)], { dur: 0.1, v: 0.05, type: 'square', gap: 0.07, lp: 5000 }); s.tone(t + 0.5, { f: s.hz(88), dur: 0.5, v: 0.05, type: 'triangle' }); s.noise(t, { f: 4000, dur: 0.25, v: 0.025, type: 'highpass' }); },
    open(s, t) { s.tone(t, { f: 1200, f2: 2000, dur: 0.07, v: 0.04, type: 'square', lp: 5000 }); },
    close(s, t) { s.tone(t, { f: 2000, f2: 1200, dur: 0.07, v: 0.04, type: 'square', lp: 5000 }); },
    ok(s, t) { s.notes(t, [s.hz(84), s.hz(91), s.hz(96)], { dur: 0.08, v: 0.05, type: 'square', gap: 0.05, lp: 6000 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="rr-cv"></canvas>
      <div class="rr-top" data-ui><b>BEAT<i>//</i>RUSH</b><span>AUTO PLAY · <em data-rr="lv">LV --</em></span></div>
      <div class="rr-score" aria-hidden="true"><small>SCORE</small><b data-rr="score">0000000</b><span data-rr="acc">ALL PERFECT</span></div>
      <div class="rr-card" data-ui>
        <div class="rr-jacket"><img data-bind="cover" alt="" draggable="false"></div>
        <div class="rr-tx"><div class="rr-t" data-bind="title"></div><div class="rr-a" data-bind="artist"></div><div class="rr-meta"><span data-bind="bpm">--</span> BPM · <span data-bind="idx">00/00</span></div></div>
      </div>
      <div class="rr-panel">
        <div class="seek rr-seek" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div><div class="seek-times"><span data-bind="time">0:00</span><span data-bind="dur">0:00</span></div></div>
        ${R.ui.ctrl('rr-ctrl')}
      </div>`;
    const cv = api.canvas(root.querySelector('.rr-cv'), { dprMax: 2 });
    const card = root.querySelector('.rr-card'), panel = root.querySelector('.rr-panel');
    const scoreEl = root.querySelector('[data-rr="score"]'), lvEl = root.querySelector('[data-rr="lv"]');
    const LC = ['#22e5ff', '#a46bff', '#ff3fa4', '#ffd23f'], GOLD = '#ffd23f';
    let box = { top: 140, bot: 560 };
    function measure() {
      const r = root.getBoundingClientRect(), a = card.getBoundingClientRect(), b = panel.getBoundingClientRect();
      // a phone on its side: the card sits to the left, so the highway can start right at the top, narrower
      const land = r.height < 520 && r.width > r.height;
      box = { top: land ? 16 : a.bottom - r.top + 10, bot: b.top - r.top - (land ? 40 : 16), land };
    }
    measure();

    // ---------- the chart: written once per song from its measured hits ----------
    let chart = null, chartId = null;
    function build(r) {
      const B = r.beats; let ib = 0.5;
      if (B && B.length > 8) { const d = []; for (let i = 1; i < B.length; i++) d.push(B[i] - B[i - 1]); d.sort((a, b) => a - b); ib = d[d.length >> 1]; }
      const L = [[], [], [], []];
      const take = (A, S, lane, thr, gap) => { if (!A) return; let last = -9; for (let i = 0; i < A.length; i++) { const s = S[i] / 255; if (s < thr || A[i] - last < gap) continue; L[lane].push(A[i], s); last = A[i]; } };
      take(r.kicks, r.kickS, 0, 0.56, ib * 0.24);
      take(r.tones, r.toneS, 1, 0.68, ib * 0.24);
      take(r.snares, r.snareS, 2, 0.6, ib * 0.24);
      take(r.hats, r.hatS, 3, 0.8, ib * 0.48);
      let n = L.reduce((a, l) => a + l.length / 2, 0);
      // nothing measured to go on (an older analysis): the beat grid on a pattern
      if (n < 16 && B && B.length) { for (const l of L) l.length = 0; for (let i = 0; i < B.length; i++) { const p = r.bpos ? r.bpos[i] : i % 4; L[[0, 2, 1, 3][p]].push(B[i], (r.beatStr ? r.beatStr[i] : 200) / 255); } n = B.length; }
      const dur = r.duration || (r.frames && r.fps ? r.frames / r.fps : 0) || 1;
      const lv = Math.max(1, Math.min(15, Math.round((n / dur) * 1.5 + 60 / ib / 50)));
      return { lanes: L.map((l) => Float32Array.from(l)), ib, lv, n };
    }
    async function loadChart() {
      const t = api.track(), id = t && t.id;
      chartId = id; chart = null; lvEl.textContent = 'LV --';
      if (!id) return;
      const r = await R.analysis.get(id);
      if (chartId !== id || !r || !r.beats) return;
      chart = build(r);
      lvEl.textContent = 'LV ' + chart.lv;
    }
    api.on('viz:data', (id) => { const t = api.track(); if (t && t.id === id) loadChart(); });
    const lowerBound = (A, t) => { let lo = 0, hi = A.length >> 1; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m * 2] <= t) lo = m + 1; else hi = m; } return lo; };

    // ---------- play state ----------
    let lastT = -1, combo = 0, maxCombo = 0, score = 0, shown = 0, enterT = 0, swapT = 9, fever = 0, feverT = 9, comboK = 0, wasHot = false;
    const keys = [0, 0, 0, 0], pops = [null, null, null, null], sparks = [], rings = [];
    const tmp = [];
    function hit(i, s, x, y, wl) {
      keys[i] = 1; combo++; maxCombo = Math.max(maxCombo, combo); comboK = 1;
      score += Math.round((100 + Math.min(combo, 120) * 2) * (fever > 0.5 ? 2 : 1) * (0.8 + s * 0.4));
      pops[i] = { life: 0.5, fever: fever > 0.5 };
      rings.push({ i, r: 0, a: 1 });
      if (!R.reduced) { const n = api.low() ? 4 : 8; for (let k = 0; k < n; k++) { const a = -Math.PI * (0.15 + Math.random() * 0.7); sparks.push({ x: x + (Math.random() - 0.5) * wl * 0.6, y, vx: Math.cos(a) * (60 + Math.random() * 160), vy: Math.sin(a) * (120 + Math.random() * 220), life: 0.35 + Math.random() * 0.3, c: fever > 0.5 && k % 2 ? GOLD : LC[i] }); } }
      if (sparks.length > 160) sparks.splice(0, sparks.length - 160);
    }
    const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    let art = null;
    const small = document.createElement('canvas'); small.width = small.height = 12;
    function loadArt(t) { art = null; if (!t) return; api.coverImage(t).then((im) => { if (api.track() && api.track().id === t.id) { art = im; const x = small.getContext('2d'); x.clearRect(0, 0, 12, 12); try { x.drawImage(im, 0, 0, 12, 12); } catch (e) { /* ignore */ } } }); }
    loadArt(api.track()); loadChart();

    return {
      enter() { enterT = 0; },
      swap() { swapT = 0; combo = 0; },
      onTrack(t) { loadArt(t); loadChart(); },
      resize() { cv.resize(); measure(); },
      frame(dt, t, v) {
        enterT += dt; swapT += dt; feverT += dt;
        const { ctx, w, h } = cv;
        const st = v.t;
        if (v.hot > 0.5 && !wasHot) feverT = 0;
        wasHot = v.hot > 0.5;
        fever += ((v.hot > 0.5 ? 1 : 0) - fever) * (1 - Math.exp(-dt * 3));
        // background: night purple, the cover as a soft glow far down the highway, side lights on the beat
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#05020f'); bg.addColorStop(0.45, fever > 0.3 ? '#1d0d2e' : '#120a2c'); bg.addColorStop(1, '#05020c');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        const kh = Math.min(26, Math.max(14, h * 0.028));
        const yJ = Math.max(box.top + (box.land ? 120 : 140), Math.min(h - 40, box.bot - kh - 10)), yV = box.top + 4;
        const cx = w / 2, WJ = box.land ? Math.min(w * 0.5, 470) : Math.min(w * 0.94, 470), K = 5.2, s1 = 1 / (1 + K);
        const sOf = (z) => 1 / (1 + K * z);
        const yOf = (z) => yV + (yJ - yV) * ((sOf(z) - s1) / (1 - s1));
        if (art) { ctx.globalAlpha = 0.28 + v.pump * 0.12; const S = Math.max(w, (yJ - yV) * 1.6); ctx.drawImage(small, cx - S / 2, yV - S * 0.42, S, S * 0.84); ctx.globalAlpha = 1; }
        ctx.globalCompositeOperation = 'lighter';
        for (const side of [-1, 1]) {
          const x = cx + side * (WJ / 2 + Math.max(10, (w - WJ) / 4));
          for (let k = 0; k < 7; k++) {
            const y = yV + ((yJ - yV) * (k + 0.5)) / 7, on = 0.12 + v.pump * 0.5 * (k % 2 ? 1 : 0.7) + v.down * 0.35;
            ctx.globalAlpha = Math.min(1, on); ctx.drawImage(api.glow(fever > 0.5 ? GOLD : side < 0 ? LC[0] : LC[2], 64), x - 16, y - 16, 32, 32);
          }
        }
        ctx.globalAlpha = 1;
        // FEVER: rays rushing out from the far end
        if (fever > 0.05 && !R.reduced) {
          ctx.strokeStyle = R.color.rgba(GOLD, 0.16 * fever); ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let k = 0; k < 18; k++) { const a = (k / 18) * R.TAU + v.beatT * 0.25, r0 = 30 + ((v.beatT * 2 + k * 0.37) % 1) * Math.max(w, h) * 0.6; ctx.moveTo(cx + Math.cos(a) * r0, yV + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * (r0 + 60), yV + Math.sin(a) * (r0 + 60)); }
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        // the highway (it lights up from the judgment line on entering)
        const reveal = R.ease.out(Math.min(1, enterT / 1.1));
        const zTop = Math.max(0.0001, reveal);
        ctx.save();
        ctx.beginPath(); ctx.rect(0, yOf(zTop) - 2, w, h); ctx.clip();
        const x0 = (z, u) => cx + u * WJ * sOf(z);
        ctx.fillStyle = 'rgba(10,6,28,.88)';
        ctx.beginPath(); ctx.moveTo(x0(1, -0.5), yOf(1)); ctx.lineTo(x0(1, 0.5), yOf(1)); ctx.lineTo(x0(0, 0.5), yJ); ctx.lineTo(x0(0, -0.5), yJ); ctx.closePath(); ctx.fill();
        // lanes: a faint floor tint, brighter when its key is hit
        for (let i = 0; i < 4; i++) {
          const u0 = -0.5 + i / 4, u1 = u0 + 0.25, k = keys[i];
          const g = ctx.createLinearGradient(0, yOf(1), 0, yJ);
          g.addColorStop(0, R.color.rgba(LC[i], 0)); g.addColorStop(1, R.color.rgba(fever > 0.5 ? GOLD : LC[i], 0.06 + k * 0.32));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(x0(1, u0), yOf(1)); ctx.lineTo(x0(1, u1), yOf(1)); ctx.lineTo(x0(0, u1), yJ); ctx.lineTo(x0(0, u0), yJ); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(150,140,255,.18)'; ctx.lineWidth = 1;
        ctx.beginPath(); for (let i = 1; i < 4; i++) { const u = -0.5 + i / 4; ctx.moveTo(x0(1, u), yOf(1)); ctx.lineTo(x0(0, u), yJ); } ctx.stroke();
        // the beat grid scrolling down (the bar's first beat bright)
        const AHEAD = Math.max(1.05, Math.min(2.1, (chart ? chart.ib : v.ibi) * 3.2));
        R.viz.upcomingBeats(st - 0.01, st + AHEAD, tmp);
        for (let k = 0; k < tmp.length; k += 3) {
          const z = (tmp[k] - st) / AHEAD; if (z < 0 || z > 1) continue;
          const y = yOf(z), sc = sOf(z), dn = tmp[k + 2] === 0;
          ctx.strokeStyle = dn ? `rgba(255,255,255,${0.22 + 0.4 * (1 - z)})` : `rgba(170,160,255,${0.08 + 0.16 * (1 - z)})`;
          ctx.lineWidth = dn ? Math.max(1, 2.4 * sc + 0.6) : 1;
          ctx.beginPath(); ctx.moveTo(cx - (WJ / 2) * sc, y); ctx.lineTo(cx + (WJ / 2) * sc, y); ctx.stroke();
        }
        // highway edges: neon rails that breathe with the beat
        ctx.globalCompositeOperation = 'lighter';
        for (const [u, col] of [[-0.5, fever > 0.5 ? GOLD : LC[0]], [0.5, fever > 0.5 ? GOLD : LC[2]]]) {
          ctx.strokeStyle = R.color.rgba(col, Math.min(1, 0.55 + v.pump * 0.4)); ctx.lineWidth = 2 + v.pump * 1.5;
          ctx.beginPath(); ctx.moveTo(x0(1, u), yOf(1)); ctx.lineTo(x0(0, u), yJ); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        // notes
        const lanes = chart ? chart.lanes : null;
        const wl = (WJ / 4) * 0.84;
        const doHits = v.playing && lastT >= 0 && st > lastT && st - lastT < 0.4;
        for (let i = 0; i < 4; i++) {
          let A;
          if (lanes) A = lanes[i];
          else { // not measured yet: the stand-in beat on a pattern
            R.viz.upcomingBeats(st - 0.4, st + AHEAD, tmp); const arr = [];
            for (let k = 0; k < tmp.length; k += 3) if ([0, 2, 1, 3][tmp[k + 2]] === i) arr.push(tmp[k], tmp[k + 1]);
            A = arr;
          }
          const uC = -0.5 + (i + 0.5) / 4, col = fever > 0.5 ? (i % 2 ? GOLD : '#fff3b0') : LC[i];
          const n = A.length >> 1;
          let j = lanes ? lowerBound(A, Math.min(lastT, st) - 0.001) : 0;
          for (; j < n; j++) {
            const tn = A[j * 2], s = A[j * 2 + 1];
            if (tn > st + AHEAD) break;
            if (tn <= st) { if (doHits && tn > lastT) hit(i, s, cx + uC * WJ, yJ, wl); continue; }
            const z = (tn - st) / AHEAD, sc = sOf(z), y = yOf(z), x = cx + uC * WJ * sc;
            if (y < yOf(zTop)) continue;
            const nw = wl * sc, nh = Math.max(3, 15 * sc + 2), fade = Math.min(1, (1 - z) * 6);
            ctx.globalAlpha = fade;
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(api.glow(col, 64), x - nw * 0.75, y - nh * 2, nw * 1.5, nh * 4);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = col; rr(ctx, x - nw / 2, y - nh / 2, nw, nh, Math.min(nh / 2, 6 * sc + 1)); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.85)'; rr(ctx, x - nw * 0.42, y - nh * 0.32, nw * 0.84, Math.max(1, nh * 0.22), Math.max(1, nh * 0.11)); ctx.fill();
            if (s > 0.92) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, 1.6 * sc); rr(ctx, x - nw / 2 - 2, y - nh / 2 - 2, nw + 4, nh + 4, Math.min(nh / 2 + 2, 7)); ctx.stroke(); }
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        if (v.playing && lastT >= 0 && Math.abs(st - lastT) > 0.4) combo = 0; // a seek breaks the combo
        lastT = v.playing ? st : -1;
        // judgment line and the four keys
        ctx.globalCompositeOperation = 'lighter';
        const lineCol = fever > 0.5 ? GOLD : '#ffffff';
        ctx.globalAlpha = reveal; ctx.drawImage(api.glow(lineCol, 64), cx - WJ * 0.6, yJ - 14, WJ * 1.2, 28); ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = R.color.rgba(lineCol, 0.9 * reveal); ctx.fillRect(cx - WJ / 2, yJ - 1.5, WJ, 3);
        for (let i = 0; i < 4; i++) {
          keys[i] = Math.max(0, keys[i] - dt * 6);
          const kx = cx - WJ / 2 + (WJ / 4) * i + 4, kw = WJ / 4 - 8, k = keys[i];
          ctx.fillStyle = R.color.rgba(fever > 0.5 ? GOLD : LC[i], 0.16 + k * 0.7);
          rr(ctx, kx, yJ + 6, kw, kh, 6); ctx.fill();
          ctx.strokeStyle = R.color.rgba(LC[i], 0.6 + k * 0.4); ctx.lineWidth = 1.2; ctx.stroke();
        }
        // hit rings, sparks, PERFECT
        ctx.globalCompositeOperation = 'lighter';
        for (let k = rings.length - 1; k >= 0; k--) {
          const g = rings[k]; g.r += dt * 260; g.a -= dt * 2.6; if (g.a <= 0) { rings.splice(k, 1); continue; }
          const x = cx - WJ / 2 + (WJ / 4) * (g.i + 0.5);
          ctx.strokeStyle = R.color.rgba(fever > 0.5 ? GOLD : LC[g.i], g.a); ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.ellipse(x, yJ, 10 + g.r * 0.6, 4 + g.r * 0.18, 0, 0, R.TAU); ctx.stroke();
        }
        for (let k = sparks.length - 1; k >= 0; k--) {
          const p = sparks[k]; p.life -= dt; if (p.life <= 0) { sparks.splice(k, 1); continue; }
          p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          ctx.globalAlpha = Math.min(1, p.life * 3); ctx.fillStyle = p.c; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const fs = Math.max(11, Math.min(17, WJ / 26));
        for (let i = 0; i < 4; i++) {
          const p = pops[i]; if (!p) continue;
          p.life -= dt; if (p.life <= 0) { pops[i] = null; continue; }
          const x = cx - WJ / 2 + (WJ / 4) * (i + 0.5), y = yJ - 26 - (0.5 - p.life) * 40;
          ctx.globalAlpha = Math.min(1, p.life * 4);
          ctx.font = `900 ${fs}px Orbitron, sans-serif`;
          ctx.fillStyle = p.fever ? GOLD : '#ffffff'; ctx.shadowColor = p.fever ? GOLD : LC[i]; ctx.shadowBlur = 12;
          ctx.fillText('PERFECT', x, y);
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
        // combo, big in the middle of the highway
        comboK = Math.max(0, comboK - dt * 5);
        if (combo >= 4) {
          const cy = yV + (yJ - yV) * 0.42, size = Math.min(64, Math.max(34, WJ / 8)) * (1 + comboK * 0.18);
          ctx.globalAlpha = 0.9;
          ctx.font = `900 ${size.toFixed(1)}px Orbitron, sans-serif`;
          const g = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
          g.addColorStop(0, '#ffffff'); g.addColorStop(1, fever > 0.5 ? GOLD : '#8af6ff');
          ctx.fillStyle = g; ctx.shadowColor = fever > 0.5 ? GOLD : '#22e5ff'; ctx.shadowBlur = 18;
          ctx.fillText(String(combo), cx, cy);
          ctx.shadowBlur = 0;
          ctx.font = `700 ${Math.round(size * 0.24)}px Orbitron, sans-serif`; ctx.fillStyle = 'rgba(242,240,255,.75)';
          ctx.fillText('COMBO', cx, cy + size * 0.62);
          ctx.globalAlpha = 1;
        }
        // FEVER banner when the chorus starts, then a steady tag that flashes on the beat
        if (fever > 0.05) {
          const a = feverT < 1.3 ? Math.min(1, feverT * 6) * (feverT > 1 ? (1.3 - feverT) / 0.3 : 1) : 0;
          if (a > 0) {
            const sz = Math.min(72, WJ / 6) * (1 + Math.max(0, 0.3 - feverT) * 1.5);
            ctx.globalAlpha = a; ctx.font = `900 ${sz.toFixed(1)}px Orbitron, sans-serif`;
            ctx.fillStyle = GOLD; ctx.shadowColor = '#ff8a00'; ctx.shadowBlur = 24; ctx.fillText('FEVER!!', cx, yV + (yJ - yV) * 0.22); ctx.shadowBlur = 0;
          }
          ctx.globalAlpha = fever * (0.55 + v.pump * 0.45); ctx.font = `900 ${Math.round(fs * 0.95)}px Orbitron, sans-serif`;
          ctx.fillStyle = GOLD; ctx.fillText('FEVER ×2', cx, yOf(1) + 14);
          ctx.globalAlpha = 1;
        }
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        // a song change sweeps a white wave up the highway
        if (swapT < 0.7) { const z = swapT / 0.7, y = yOf(z); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - z) * 0.8; ctx.drawImage(api.glow('#ffffff', 64), cx - WJ * 0.7 * sOf(z), y - 20, WJ * 1.4 * sOf(z), 40); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        // score, rolling up
        shown += (score - shown) * Math.min(1, dt * 9);
        const sv = String(Math.round(shown)).padStart(7, '0');
        if (scoreEl.textContent !== sv) scoreEl.textContent = sv;
      },
    };
  },
});
