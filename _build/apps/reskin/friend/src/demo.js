/* ===================== demo song: synthesised on the device, 120 BPM, 56 s =====================
   intro (pad) → groove → quiet breakdown → riser → drop → outro, so every skin shows calm and wild moments */
R.demo = (() => {
  const SR = 44100, BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 28;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const CH = [ // Am F C G
    { root: 45, pad: [57, 60, 64, 69], arp: [69, 72, 76, 81] },
    { root: 41, pad: [53, 57, 60, 65], arp: [65, 69, 72, 77] },
    { root: 48, pad: [55, 60, 64, 67], arp: [67, 72, 76, 79] },
    { root: 43, pad: [55, 59, 62, 67], arp: [67, 71, 74, 79] },
  ];

  function render() {
    return new Promise((resolve) => setTimeout(() => resolve(make()), 20));
  }
  function make() {
    const N = Math.ceil((BARS * BAR + 2.5) * SR);
    const dL = new Float32Array(N), dR = new Float32Array(N);   // drums
    const bs = new Float32Array(N);                               // bass
    const pL = new Float32Array(N), pR = new Float32Array(N);   // pads
    const aL = new Float32Array(N), aR = new Float32Array(N);   // arp
    const kicks = [];
    let seed = 7;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };

    const kick = (t0, g) => {
      kicks.push(t0);
      const s0 = Math.floor(t0 * SR), n = Math.floor(0.45 * SR); let ph = 0;
      for (let i = 0; i < n && s0 + i < N; i++) {
        const t = i / SR; const f = 46 + 120 * Math.exp(-t * 30); ph += (2 * Math.PI * f) / SR;
        const v = (Math.sin(ph) * Math.exp(-t * 7) + (i < 120 ? rnd() * 0.5 * (1 - i / 120) : 0)) * g;
        dL[s0 + i] += v; dR[s0 + i] += v;
      }
    };
    const clap = (t0, g) => {
      const s0 = Math.floor(t0 * SR), n = Math.floor(0.3 * SR); let lp = 0, hp = 0, prev = 0;
      for (let i = 0; i < n && s0 + i < N; i++) {
        const t = i / SR; const x = rnd();
        lp += 0.35 * (x - lp); hp = 0.85 * (hp + lp - prev); prev = lp;
        let e = Math.exp(-t * 16);
        if (t < 0.03) e = Math.max(e * 0.4, Math.exp(-((t * 1000) % 10) * 0.45));
        const tone = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 40) * 0.35;
        const v = (hp * 1.6 * e + tone) * g;
        dL[s0 + i] += v * 0.9; dR[s0 + i] += v * 1.1;
      }
    };
    const hat = (t0, g, open, pan) => {
      const s0 = Math.floor(t0 * SR), n = Math.floor((open ? 0.22 : 0.06) * SR); let prev = 0, hp = 0;
      for (let i = 0; i < n && s0 + i < N; i++) {
        const t = i / SR; const x = rnd(); hp = 0.6 * (hp + x - prev); prev = x;
        const v = hp * Math.exp(-t * (open ? 14 : 70)) * g;
        dL[s0 + i] += v * (1 - pan); dR[s0 + i] += v * (1 + pan);
      }
    };
    const bass = (t0, dur, m, g) => {
      const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR), f = hz(m); let ph = 0, lp = 0, lp2 = 0;
      for (let i = 0; i < n && s0 + i < N; i++) {
        const t = i / SR; ph += f / SR; ph -= Math.floor(ph);
        const saw = 2 * ph - 1, sq = ph < 0.5 ? 1 : -1;
        const cut = 0.05 + 0.12 * Math.exp(-t * 14);
        lp += cut * (saw * 0.7 + sq * 0.3 - lp); lp2 += cut * (lp - lp2);
        const env = Math.min(1, t / 0.004) * (t > dur - 0.03 ? Math.max(0, (dur - t) / 0.03) : 1) * (0.75 + 0.25 * Math.exp(-t * 6));
        bs[s0 + i] += lp2 * env * g;
      }
    };
    const pad = (t0, dur, notes, g, cut0, cut1) => {
      const s0 = Math.floor(t0 * SR), n = Math.floor((dur + 0.7) * SR);
      notes.forEach((m, k) => {
        const f = hz(m), dets = [-0.0042, 0, 0.0046], phs = [Math.random(), Math.random(), Math.random()];
        let l1 = 0, l2 = 0, r1 = 0, r2 = 0;
        for (let i = 0; i < n && s0 + i < N; i++) {
          const t = i / SR;
          let sL = 0, sR = 0;
          for (let o = 0; o < 3; o++) { phs[o] += (f * (1 + dets[o])) / SR; phs[o] -= Math.floor(phs[o]); const w = 2 * phs[o] - 1; if (o === 0) sL += w; else if (o === 2) sR += w; else { sL += w * 0.6; sR += w * 0.6; } }
          const c = cut0 + (cut1 - cut0) * Math.min(1, t / dur);
          l1 += c * (sL - l1); l2 += c * (l1 - l2); r1 += c * (sR - r1); r2 += c * (r1 - r2);
          const env = Math.min(1, t / 0.35) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.7) : 1);
          const v = env * g * (k === 0 ? 1 : 0.8);
          pL[s0 + i] += l2 * v; pR[s0 + i] += r2 * v;
        }
      });
    };
    const pluck = (t0, m, g, pan) => {
      const s0 = Math.floor(t0 * SR), n = Math.floor(0.4 * SR), f = hz(m); let ph = 0, lp = 0;
      for (let i = 0; i < n && s0 + i < N; i++) {
        const t = i / SR; ph += f / SR; ph -= Math.floor(ph);
        const w = ph < 0.3 ? 1 : -1; const c = 0.04 + 0.4 * Math.exp(-t * 18);
        lp += c * (w - lp);
        const v = lp * Math.exp(-t * 9) * g * Math.min(1, t / 0.002);
        aL[s0 + i] += v * (1 - pan); aR[s0 + i] += v * (1 + pan);
      }
    };
    const riser = (t0, dur, g) => {
      const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR); let prev = 0, hp = 0;
      for (let i = 0; i < n && s0 + i < N; i++) {
        const t = i / SR, p = t / dur, x = rnd(); const a = 0.2 + 0.75 * p;
        hp = a * (hp + x - prev); prev = x;
        const v = hp * p * p * g;
        dL[s0 + i] += v; dR[s0 + i] += v;
      }
    };

    for (let bar = 0; bar < BARS; bar++) {
      const t = bar * BAR, ch = CH[bar % 4];
      const intro = bar < 4, groove = bar >= 4 && bar < 12, brk = bar >= 12 && bar < 16, drop = bar >= 16 && bar < 24, outro = bar >= 24;
      const padG = intro ? 0.05 + bar * 0.01 : brk ? 0.085 : outro ? 0.07 : 0.06;
      pad(t, BAR, ch.pad, padG, intro ? 0.01 + bar * 0.006 : brk ? 0.02 : 0.045, intro ? 0.02 + bar * 0.008 : brk ? 0.04 : 0.07);
      for (let b = 0; b < 4; b++) {
        const tb = t + b * BEAT;
        if (groove || drop || (outro && bar < 27)) kick(tb, drop ? 0.95 : 0.85);
        if ((groove || drop) && (b === 1 || b === 3)) clap(tb, drop ? 0.5 : 0.42);
        if (!brk) {
          const lvl = intro ? 0.05 + bar * 0.02 : outro ? 0.12 - (bar - 24) * 0.02 : 0.13;
          hat(tb + BEAT / 2, lvl, drop && b % 2 === 1, 0.25);
          if (drop) { hat(tb + BEAT / 4, 0.06, false, -0.3); hat(tb + (3 * BEAT) / 4, 0.06, false, -0.3); }
          else if (!intro) hat(tb, 0.05, false, -0.25);
        }
        if (groove || drop) for (let e = 0; e < 2; e++) bass(tb + (e * BEAT) / 2, BEAT / 2 - 0.02, ch.root + (drop && e === 1 ? 12 : 0), drop ? 0.5 : 0.42);
      }
      if (brk || drop) {
        const pat = [0, 1, 2, 3, 2, 1, 2, 3];
        for (let s = 0; s < 16; s++) {
          if (brk && s % 2) continue;
          const m = ch.arp[pat[s % 8]] - (brk ? 12 : 0);
          pluck(t + (s * BEAT) / 4, m, brk ? 0.09 : 0.075, s % 2 ? 0.35 : -0.35);
        }
      }
      if (bar === 15) {
        riser(t, BAR, 0.32);
        for (let r = 0; r < 8; r++) clap(t + 2 * BEAT + (r * BEAT) / 4, 0.16 + r * 0.035);
      }
    }
    // final chord
    pad(BARS * BAR, 1.6, CH[0].pad, 0.07, 0.03, 0.01);
    // sidechain pump from the kicks
    const duck = new Float32Array(N).fill(1);
    for (const k of kicks) { const s0 = Math.floor(k * SR), n = Math.floor(0.38 * SR); for (let i = 0; i < n && s0 + i < N; i++) { const d = 1 - 0.6 * Math.exp(-(i / SR) * 9); if (d < duck[s0 + i]) duck[s0 + i] = d; } }
    // ping-pong echo on the arp (3/16 note)
    const dly = Math.floor(BEAT * 0.75 * SR);
    for (let i = dly; i < N; i++) { aL[i] += aR[i - dly] * 0.38; aR[i] += aL[i - dly] * 0.34; }
    const L = new Float32Array(N), Rr = new Float32Array(N); let pk = 1e-6;
    for (let i = 0; i < N; i++) {
      const p = duck[i];
      const l = dL[i] + bs[i] * p + pL[i] * (0.4 + 0.6 * p) + aL[i];
      const r = dR[i] + bs[i] * p + pR[i] * (0.4 + 0.6 * p) + aR[i];
      L[i] = Math.tanh(l * 1.15); Rr[i] = Math.tanh(r * 1.15);
      const m = Math.max(Math.abs(L[i]), Math.abs(Rr[i])); if (m > pk) pk = m;
    }
    const gain = 0.89 / pk;
    // 16-bit stereo WAV
    const bytes = new ArrayBuffer(44 + N * 4), v = new DataView(bytes);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + N * 4, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, N * 4, true);
    const fade = Math.floor(0.05 * SR);
    for (let i = 0, o = 44; i < N; i++, o += 4) {
      const f = i < fade ? i / fade : i > N - fade ? (N - i) / fade : 1;
      v.setInt16(o, Math.max(-32767, Math.min(32767, Math.round(L[i] * gain * f * 32767))), true);
      v.setInt16(o + 2, Math.max(-32767, Math.min(32767, Math.round(Rr[i] * gain * f * 32767))), true);
    }
    return new Blob([bytes], { type: 'audio/wav' });
  }

  // sleeve art for the demo
  function cover() {
    const n = 640, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, n, n); g.addColorStop(0, '#2a0b4a'); g.addColorStop(0.55, '#0b0820'); g.addColorStop(1, '#03222b');
    x.fillStyle = g; x.fillRect(0, 0, n, n);
    const cols = ['#ff2bd6', '#22f3ff', '#ffe14d', '#7cff6b', '#ff7a1a'];
    for (let i = 0; i < 5; i++) {
      x.strokeStyle = cols[i]; x.lineWidth = 16; x.globalAlpha = 0.9;
      x.beginPath(); x.arc(n / 2, n / 2, 70 + i * 42, -Math.PI / 2 + i * 0.7, Math.PI * 1.2 + i * 0.7); x.stroke();
    }
    x.globalAlpha = 1; x.fillStyle = '#fff'; x.beginPath(); x.arc(n / 2, n / 2, 34, 0, Math.PI * 2); x.fill();
    x.font = '700 64px "Orbitron", sans-serif'; x.textAlign = 'center'; x.fillStyle = '#fff'; x.fillText('RESKIN', n / 2, n - 52);
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }
  return { render, cover, BPM };
})();
