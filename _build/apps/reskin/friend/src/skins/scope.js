/* ===================== skin: 綠光示波器 — green phosphor CRT: waveform, Lissajous and spectrum modes ===================== */
R.skins.def({
  id: 'scope', punch: 0.8, name: '綠光示波器', group: '復古', en: 'OSCILLOSCOPE',
  desc: '聲音直接畫成磷光波形，還能切李薩如和頻譜',
  theme: { bg: '#1c201d', fg: '#c9f7d2', accent: '#6dff8f', accent2: '#ffd36b', ui: 'rgba(16,22,18,.98)', dock: 'rgba(10,14,11,.6)', dockfg: '#6dff8f' },
  enterMs: 1400,
  emblem: `<svg class="em" viewBox="0 0 116 150"><rect width="116" height="150" fill="#2a2f2b"/><rect x="10" y="16" width="96" height="74" rx="10" fill="#0d0f0e"/><rect x="16" y="22" width="84" height="62" rx="8" fill="#03140a"/><g stroke="#1f5c33" stroke-width=".8"><path d="M16 53h84M58 22v62M37 22v62M79 22v62M16 37h84M16 69h84"/></g><path d="M18 53c6-20 10-20 14 0s8 20 13 0 9-26 13 0 8 18 13 0 8-14 12 0 6 8 9 0" fill="none" stroke="#6dff8f" stroke-width="2.4"/><rect x="10" y="100" width="96" height="40" rx="6" fill="#bfc3bb"/><g fill="#1a1a1a"><circle cx="30" cy="114" r="8"/><circle cx="58" cy="114" r="8"/><circle cx="86" cy="114" r="8"/></g><g stroke="#fff" stroke-width="1.6"><path d="M30 114l4-5M58 114l-5-3M86 114l1-6"/></g><rect x="20" y="128" width="76" height="5" rx="2.5" fill="#333"/><circle cx="96" cy="104" r="2.5" fill="#6dff8f"/></svg>`,
  sfx: {
    tap(s, t) { s.noise(t, { f: 4000, dur: 0.012, v: 0.08, type: 'highpass' }); s.tone(t, { f: 2000, dur: 0.02, v: 0.03, type: 'square', lp: 6000 }); },
    tick(s, t) { s.noise(t, { f: 5000, dur: 0.01, v: 0.06, type: 'highpass' }); },
    toggle(s, t) { s.noise(t, { f: 3500, dur: 0.015, v: 0.09, type: 'highpass' }); s.tone(t + 0.02, { f: 1000, dur: 0.06, v: 0.04, type: 'sine' }); },
    play(s, t) { s.tone(t, { f: 1000, dur: 0.08, v: 0.05 }); s.tone(t + 0.1, { f: 1500, dur: 0.1, v: 0.05 }); },
    pause(s, t) { s.tone(t, { f: 1500, dur: 0.08, v: 0.05 }); s.tone(t + 0.1, { f: 1000, dur: 0.1, v: 0.05 }); },
    next(s, t) { s.noise(t, { f: 4000, dur: 0.012, v: 0.08, type: 'highpass' }); s.tone(t, { f: 600, f2: 2400, dur: 0.12, v: 0.035, type: 'sine' }); },
    prev(s, t) { s.noise(t, { f: 4000, dur: 0.012, v: 0.08, type: 'highpass' }); s.tone(t, { f: 2400, f2: 600, dur: 0.12, v: 0.035, type: 'sine' }); },
    enter(s, t) { s.tone(t, { f: 60, f2: 40, dur: 0.25, v: 0.2 }); s.noise(t, { f: 6000, dur: 0.6, v: 0.02, type: 'highpass', a: 0.2 }); s.tone(t + 0.35, { f: 15000, dur: 0.5, v: 0.008 }); s.tone(t + 0.6, { f: 1000, dur: 0.12, v: 0.04 }); },
    open(s, t) { s.noise(t, { f: 3500, dur: 0.012, v: 0.07, type: 'highpass' }); },
    close(s, t) { s.noise(t, { f: 3000, dur: 0.012, v: 0.07, type: 'highpass' }); },
    ok(s, t) { s.tone(t, { f: 1000, dur: 0.06, v: 0.05 }); s.tone(t + 0.08, { f: 2000, dur: 0.1, v: 0.05 }); },
  },
  mount(root, api) {
    const I = R.I;
    const MODES = ['Y-T', 'X-Y', 'FFT'];
    root.innerHTML = `<div class="sc-case"></div>
      <div class="sc-wrap">
        <div class="sc-label" data-ui><b>RESKIN</b> OSC-24 <span>2 CH · 20 MHz · AUDIO SCOPE</span></div>
        <div class="sc-bezel"><div class="sc-screen">
          <canvas class="sc-cv"></canvas><div class="sc-grat"></div>
          <canvas class="sc-art"></canvas>
          <div class="sc-ro tl"><div>CH1 ▸ <span data-bind="title"></span></div><div class="dim">SRC ▸ <span data-bind="artist"></span></div></div>
          <div class="sc-ro tr"><span class="sc-mode">Y-T</span> · <span class="sc-div">2ms/div</span></div>
          <div class="sc-ro bl"><span data-bind="time">0:00</span> / <span data-bind="dur">0:00</span></div>
          <div class="sc-ro br">BPM <span data-bind="bpm">--</span> <b class="sc-trig">TRIG'D</b></div>
          <div class="sc-boot"></div><div class="sc-curve"></div>
        </div></div>
        <div class="sc-panel" data-ui>
          <div class="sc-knobs"><div class="kn"><i data-k="0"></i><span>VOLTS/DIV</span></div><div class="kn"><i data-k="1"></i><span>TIME/DIV</span></div><div class="kn"><i data-k="2"></i><span>INTENSITY</span></div><div class="sc-pwr"><i></i><span>POWER</span></div></div>
          <div class="seek sc-seek" data-seek><div class="sc-sl"><span>POSITION</span><span data-bind="idx">00/00</span></div><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div></div>
          <div class="sc-btns">
            <button type="button" class="sb c-prev" data-act="prev" aria-label="上一首">${I.prev}<span>PREV</span></button>
            <button type="button" class="sb sb-run c-play" data-act="toggle" aria-label="播放／暫停"><i class="led"></i>${I.pp}<span>RUN/STOP</span></button>
            <button type="button" class="sb c-next" data-act="next" aria-label="下一首">${I.next}<span>NEXT</span></button>
            <button type="button" class="sb sb-mode" data-sc="mode" aria-label="切換顯示模式"><b class="sc-mode2">Y-T</b><span>MODE</span></button>
            <button type="button" class="sb c-shuf" data-act="shuffle" aria-label="隨機播放"><i class="led"></i>${I.shuffle}<span>SHUF</span></button>
            <button type="button" class="sb c-rep" data-act="repeat" aria-label="循環播放"><i class="led"></i>${I.rep}<span>LOOP</span></button>
          </div>
        </div>
      </div>`;
    const cv = api.canvas(root.querySelector('.sc-cv'), { alpha: false });
    const artCv = root.querySelector('.sc-art');
    const modeEls = root.querySelectorAll('.sc-mode, .sc-mode2'), divEl = root.querySelector('.sc-div'), trig = root.querySelector('.sc-trig');
    const knobs = Array.from(root.querySelectorAll('.kn i'));
    let mode = R.settings.get('scopeMode') || 0, enterT = 9, rotK = 0, glowT = 0;
    const setMode = (m) => { mode = (m + 3) % 3; for (const e of modeEls) e.textContent = MODES[mode]; divEl.textContent = mode === 0 ? '2ms/div' : mode === 1 ? 'X 0.5V' : '1kHz/div'; };
    setMode(mode);
    root.querySelector('[data-sc="mode"]').addEventListener('click', () => { setMode(mode + 1); R.settings.set('scopeMode', mode); api.sfx('toggle'); cv.clear(); });
    function dither(im) {
      const n = 56; artCv.width = artCv.height = n; const x = artCv.getContext('2d');
      x.clearRect(0, 0, n, n);
      if (!im) return;
      x.drawImage(im, 0, 0, n, n);
      const d = x.getImageData(0, 0, n, n), p = d.data;
      const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      for (let i = 0; i < n * n; i++) {
        const l = (p[i * 4] * 0.3 + p[i * 4 + 1] * 0.59 + p[i * 4 + 2] * 0.11) / 255;
        const th = (B[(i % n) % 4 + ((Math.floor(i / n)) % 4) * 4] + 0.5) / 16;
        const on = l > th;
        p[i * 4] = 109; p[i * 4 + 1] = 255; p[i * 4 + 2] = 143; p[i * 4 + 3] = on ? 230 : 0;
      }
      x.putImageData(d, 0, 0);
    }
    const loadArt = (t) => { dither(null); if (t) api.coverImage(t).then((im) => { if (api.track() && api.track().id === t.id) dither(im); }); };
    // the trigger lamp fires on every beat; the bar's first beat flares the phosphor longer
    api.beat((s, i) => { glowT = i.down ? 0.16 : 0.09; trig.classList.remove('on'); void trig.offsetWidth; trig.classList.add('on'); });
    const pts = new Float32Array(200);
    function smooth(src, n, out) {
      const m = src.length;
      for (let i = 0; i < n; i++) {
        const f = (i / (n - 1)) * (m - 1), k = Math.floor(f), u = f - k;
        const p0 = src[Math.max(0, k - 1)], p1 = src[k], p2 = src[Math.min(m - 1, k + 1)], p3 = src[Math.min(m - 1, k + 2)];
        out[i] = 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
      }
    }
    function trace(ctx, draw, boost) {
      ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(80,255,120,${0.1 + boost * 0.08})`; ctx.lineWidth = 7; draw(); ctx.stroke();
      ctx.strokeStyle = `rgba(100,255,140,${0.3 + boost * 0.2})`; ctx.lineWidth = 3; draw(); ctx.stroke();
      ctx.strokeStyle = 'rgba(210,255,220,.95)'; ctx.lineWidth = 1.3; draw(); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    return {
      onTrack: loadArt,
      enter() { enterT = 0; cv.clear(); },
      resize() { cv.resize(); },
      frame(dt, t, v) {
        enterT += dt;
        const { ctx, w, h } = cv;
        // phosphor persistence: fade the last frame instead of clearing it
        ctx.fillStyle = `rgba(2,12,5,${mode === 1 ? 0.22 : 0.34})`; ctx.fillRect(0, 0, w, h);
        if (enterT < 0.55) return;
        glowT = Math.max(0, glowT - dt);
        const boost = glowT > 0 ? 1 : 0;
        const cy = h / 2, amp = h * 0.36 * (v.playing ? 1 : 0.15);
        if (mode === 0) {
          const W = v.wave, n = 140;
          smooth(W, n, pts);
          const noise = v.playing ? 0 : 0.012;
          trace(ctx, () => { ctx.beginPath(); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * w, y = cy - (pts[i] + (Math.random() - 0.5) * noise * 40) * amp; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } }, boost);
        } else if (mode === 1) {
          const W = v.wave, m = W.length, k = 11;
          rotK = v.playing ? v.stepT * 0.35 : rotK + dt * 0.25;
          const ca = Math.cos(rotK * 0.3), sa = Math.sin(rotK * 0.3), A = Math.min(w, h) * 0.38 * (v.playing ? 1 : 0.12);
          trace(ctx, () => { ctx.beginPath(); for (let i = 0; i <= m; i++) { const a = W[i % m], b = W[(i + k) % m]; const x0 = a * A, y0 = b * A; const x = w / 2 + x0 * ca - y0 * sa, y = cy + x0 * sa + y0 * ca; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } }, boost);
        } else {
          const B = v.bands, n = 32, base = h * 0.86, top = h * 0.12;
          trace(ctx, () => { ctx.beginPath(); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * w, y = base - B[i] * (base - top); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } }, boost);
          ctx.fillStyle = 'rgba(180,255,190,.85)';
          for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * w, y = base - v.peaks[i] * (base - top); ctx.fillRect(x - 2, y - 1, 4, 2); }
        }
        knobs[0].style.transform = `rotate(${(-130 + Math.min(1, v.level) * 260).toFixed(1)}deg)`;
        knobs[1].style.transform = `rotate(${((v.playing ? v.stepT * 45 : t * 30) % 360).toFixed(1)}deg)`;
        knobs[2].style.transform = `rotate(${(-130 + Math.min(1, v.bass) * 260).toFixed(1)}deg)`;
      },
    };
  },
});
