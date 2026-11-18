/* ===================== sound effects: 3D 環繞 · 重低音 · 演唱會現場 — rendered ahead, played by plain <audio> =====================
   On iPhone, music that runs through Web Audio goes quiet on the lock screen, so an effect cannot be applied live.
   Instead a song is rendered once with the effect into a new audio file (16-bit WAV) and the ordinary <audio> element
   plays that file: lock screen, Control Center and car stereo all keep working. The work runs in a Worker, in plain
   JavaScript, so every browser produces the same sound:
     3D 環繞    for headphones: the song comes from speakers placed around you in a studio room. Front speakers at ±45°
                and surrounds at ±120° (fed with the stereo difference, 10–13 ms later) in a 6.5 × 5 m room; every path
                (direct sound, and the walls' reflections up to the second bounce, image-source method) reaches each ear
                through a spherical-head model — time and level difference between the ears, the head's shadow, the outer
                ear's echoes, duller from behind — plus a short decorrelated room tail. The listener sits a little off
                centre, as in a real room, so even the middle of the mix leaves the head. The four responses (left/right
                in → left/right ear) are equalised so the tone matches the original on average, then applied by FFT
                convolution.
     重低音      20 Hz rumble filter, +6 dB shelf below ~105 Hz with a sub peak at 58 Hz, a little less mud at 320 Hz and
                more air at 6.5 kHz, plus soft second-harmonic "virtual bass" (90–350 Hz) that small speakers can play.
     演唱會現場  a big hall: early reflections at full bandwidth, a 2.3-second stereo tail (convolution at half the sample
                rate, darker as it dies away), a faint echo off the far wall, and a PA-like tone on the dry sound.
   Each effect is matched to the original's loudness (K-weighted, measured on excerpts across the song), then a
   look-ahead limiter keeps peaks under −0.5 dBFS and TPDF dither takes it to 16 bits. The timeline moves by under a
   millisecond, so the beat grid and lyrics still fit. */
function fxCore(scope) {
  const PI = Math.PI;

  /* ---------- FFT: radix 2, in place, separate real / imaginary arrays (inverse is unscaled) ---------- */
  const ffts = new Map();
  function fft(N) {
    if (ffts.has(N)) return ffts.get(N);
    const bits = Math.round(Math.log2(N)), pr = [];
    for (let i = 0; i < N; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); if (r > i) pr.push(i, r); }
    const PA = Int32Array.from(pr), twr = new Float64Array(N), twi = new Float64Array(N);
    for (let h = 1; h < N; h <<= 1) for (let j = 0; j < h; j++) { twr[h + j] = Math.cos((-PI * j) / h); twi[h + j] = Math.sin((-PI * j) / h); }
    const run = (re, im, inv) => {
      for (let p = 0; p < PA.length; p += 2) { const i = PA[p], j = PA[p + 1]; let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
      for (let i = 0; i < N; i += 2) { const ar = re[i], ai = im[i], br = re[i + 1], bi = im[i + 1]; re[i] = ar + br; im[i] = ai + bi; re[i + 1] = ar - br; im[i + 1] = ai - bi; }
      const s = inv ? -1 : 1;
      for (let i = 0; i < N; i += 4) {
        let ar = re[i], ai = im[i], br = re[i + 2], bi = im[i + 2];
        re[i] = ar + br; im[i] = ai + bi; re[i + 2] = ar - br; im[i + 2] = ai - bi;
        ar = re[i + 1]; ai = im[i + 1]; br = re[i + 3]; bi = im[i + 3];
        const tr = s * bi, ti = -s * br;
        re[i + 1] = ar + tr; im[i + 1] = ai + ti; re[i + 3] = ar - tr; im[i + 3] = ai - ti;
      }
      for (let h = 4; h < N; h <<= 1) {
        const size = h << 1;
        for (let i = 0; i < N; i += size) {
          for (let j = 0; j < h; j++) {
            const a = i + j, b = a + h, c = twr[h + j], sn = s * twi[h + j];
            const xr = re[b], xi = im[b], tr = xr * c - xi * sn, ti = xr * sn + xi * c, ur = re[a], ui = im[a];
            re[b] = ur - tr; im[b] = ui - ti; re[a] = ur + tr; im[a] = ui + ti;
          }
        }
      }
    };
    ffts.set(N, run);
    return run;
  }

  /* ---------- seeded noise ---------- */
  function rand(seed) {
    let x = (seed >>> 0) || 0x9e3779b9;
    const u = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
    u.gauss = () => { let a = u(); if (a < 1e-12) a = 1e-12; return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * PI * u()); };
    return u;
  }

  /* ---------- biquads (RBJ cookbook); shelves take a slope S, 'hsq' takes a Q ---------- */
  function biquad(type, f0, fs, q, db) {
    const A = Math.pow(10, (db || 0) / 40), w = (2 * PI * f0) / fs, cw = Math.cos(w), sw = Math.sin(w);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lp' || type === 'hp' || type === 'peak') {
      const al = sw / (2 * q);
      if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; }
      else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; }
      else { b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; }
      if (type === 'peak') { a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; } else { a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    } else {
      const al = type === 'hsq' ? sw / (2 * q) : (sw / 2) * Math.sqrt((A + 1 / A) * (1 / q - 1) + 2), sa = 2 * Math.sqrt(A) * al;
      if (type === 'ls') { b0 = A * (A + 1 - (A - 1) * cw + sa); b1 = 2 * A * (A - 1 - (A + 1) * cw); b2 = A * (A + 1 - (A - 1) * cw - sa); a0 = A + 1 + (A - 1) * cw + sa; a1 = -2 * (A - 1 + (A + 1) * cw); a2 = A + 1 + (A - 1) * cw - sa; }
      else { b0 = A * (A + 1 + (A - 1) * cw + sa); b1 = -2 * A * (A - 1 + (A + 1) * cw); b2 = A * (A + 1 + (A - 1) * cw - sa); a0 = A + 1 - (A - 1) * cw + sa; a1 = 2 * (A - 1 - (A + 1) * cw); a2 = A + 1 - (A - 1) * cw - sa; }
    }
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  }
  // a chain of biquads for one channel, run in place (transposed direct form II), state kept between calls
  function chain(list) {
    const k = list.length, c = Float64Array.from([].concat(...list)), z = new Float64Array(2 * k);
    return (x, a, n) => {
      for (let s = 0; s < k; s++) {
        const b0 = c[5 * s], b1 = c[5 * s + 1], b2 = c[5 * s + 2], a1 = c[5 * s + 3], a2 = c[5 * s + 4];
        let z1 = z[2 * s], z2 = z[2 * s + 1];
        for (let i = a, e = a + n; i < e; i++) { const xi = x[i], y = b0 * xi + z1; z1 = b1 * xi - a1 * y + z2; z2 = b2 * xi - a2 * y; x[i] = y; }
        z[2 * s] = z1; z[2 * s + 1] = z2;
      }
    };
  }
  // magnitude of a biquad chain at f (for tests)
  function gainAt(list, f, fs) {
    let g = 1;
    for (const [b0, b1, b2, a1, a2] of list) {
      const w = (2 * PI * f) / fs, c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
      const nr = b0 + b1 * c1 + b2 * c2, ni = -(b1 * s1 + b2 * s2), dr = 1 + a1 * c1 + a2 * c2, di = -(a1 * s1 + a2 * s2);
      g *= Math.sqrt((nr * nr + ni * ni) / (dr * dr + di * di));
    }
    return g;
  }

  /* ---------- uniformly partitioned FFT convolution: 1 or 2 inputs → 2 outputs, no latency ----------
     ir[o][i] is the response from input i to output o. Each call takes exactly B input samples (fewer only on the last
     call) and returns the matching B output samples, final at once. Two real inputs share one complex FFT, and the two
     real outputs share one inverse FFT. */
  function convolver(ir, B) {
    const N = 2 * B, f = fft(N), nIn = ir[0].length;
    let len = 1; for (const row of ir) for (const h of row) len = Math.max(len, h.length);
    const P = Math.max(1, Math.ceil(len / B));
    const re = new Float64Array(N), im = new Float64Array(N);
    const spec = (h, p) => { re.fill(0); im.fill(0); for (let k = 0; k < B; k++) { const j = p * B + k; if (j < h.length) re[k] = h[j]; } f(re, im, false); return [re.slice(0, B + 1), im.slice(0, B + 1)]; };
    const H = ir.map((row) => row.map((h) => { const parts = []; for (let p = 0; p < P; p++) parts.push(spec(h, p)); return parts; }));
    const X = []; for (let i = 0; i < nIn; i++) { const ring = []; for (let p = 0; p < P; p++) ring.push([new Float64Array(B + 1), new Float64Array(B + 1)]); X.push(ring); }
    const Y = [[new Float64Array(B + 1), new Float64Array(B + 1)], [new Float64Array(B + 1), new Float64Array(B + 1)]];
    const tail = [new Float64Array(B), new Float64Array(B)];
    let head = 0;
    // a, b: input arrays (b ignored with one input) read at [ia, ia + n); outputs written to oa, ob at [oo, oo + n) — may be the same arrays
    return function block(a, b, ia, n, oa, ob, oo) {
      re.fill(0); im.fill(0);
      for (let k = 0; k < n; k++) re[k] = a[ia + k];
      if (nIn > 1) for (let k = 0; k < n; k++) im[k] = b[ia + k];
      f(re, im, false);
      head = (head + P - 1) % P;
      if (nIn > 1) {
        const xa = X[0][head], xb = X[1][head];
        for (let k = 0; k <= B; k++) {
          const k2 = (N - k) & (N - 1), zr = re[k], zi = im[k], wr = re[k2], wi = im[k2];
          xa[0][k] = (zr + wr) * 0.5; xa[1][k] = (zi - wi) * 0.5; xb[0][k] = (zi + wi) * 0.5; xb[1][k] = (wr - zr) * 0.5;
        }
      } else { const xa = X[0][head]; for (let k = 0; k <= B; k++) { xa[0][k] = re[k]; xa[1][k] = im[k]; } }
      const y0r = Y[0][0], y0i = Y[0][1], y1r = Y[1][0], y1i = Y[1][1];
      y0r.fill(0); y0i.fill(0); y1r.fill(0); y1i.fill(0);
      for (let i = 0; i < nIn; i++) {
        for (let p = 0; p < P; p++) {
          const x = X[i][(head + p) % P], xr = x[0], xi = x[1];
          const h0 = H[0][i][p], h1 = H[1][i][p], h0r = h0[0], h0i = h0[1], h1r = h1[0], h1i = h1[1];
          for (let k = 0; k <= B; k++) {
            const u = xr[k], v = xi[k];
            y0r[k] += u * h0r[k] - v * h0i[k]; y0i[k] += u * h0i[k] + v * h0r[k];
            y1r[k] += u * h1r[k] - v * h1i[k]; y1i[k] += u * h1i[k] + v * h1r[k];
          }
        }
      }
      // pack the two real outputs into one complex spectrum: W = Y0 + j·Y1
      for (let k = 0; k <= B; k++) { re[k] = y0r[k] - y1i[k]; im[k] = y0i[k] + y1r[k]; }
      for (let k = 1; k < B; k++) { re[N - k] = y0r[k] + y1i[k]; im[N - k] = y1r[k] - y0i[k]; }
      f(re, im, true);
      const sc = 1 / N, t0 = tail[0], t1 = tail[1];
      for (let k = 0; k < n; k++) { oa[oo + k] = re[k] * sc + t0[k]; ob[oo + k] = im[k] * sc + t1[k]; }
      // what spills past this block waits for the next one (on a short last block it no longer matters)
      for (let k = 0; k < B; k++) { t0[k] = re[B + k] * sc; t1[k] = im[B + k] * sc; }
    };
  }

  /* ---------- half-band filters: ×½ and ×2 sample rate for the hall's tail (31 taps, Kaiser, 15 samples of delay each) ---------- */
  const HB = (() => {
    const i0 = (x) => { let s = 1, t = 1; for (let k = 1; k < 30; k++) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; } return s; };
    const M = 15, beta = 6.5, odd = [];
    for (let n = 1; n <= M; n += 2) odd.push((Math.sin((PI * n) / 2) / (PI * n)) * (i0(beta * Math.sqrt(1 - (n / (M + 1)) * (n / (M + 1)))) / i0(beta)));
    const s = odd.reduce((a, b) => a + b, 0) * 2;
    return odd.map((v) => (v * 0.5) / s); // taps at ±1, ±3, … ±15 (both sides sum to ½); with the ½ centre the response sums to 1
  })();
  function decimator() {
    const hist = new Float64Array(30); let buf = new Float64Array(0);
    // x[a, a+n) at the full rate (n even) → n/2 samples into y[0, n/2)
    return (x, a, n, y) => {
      if (buf.length < n + 30) buf = new Float64Array(n + 30);
      buf.set(hist, 0); for (let i = 0; i < n; i++) buf[30 + i] = x[a + i];
      for (let k = 0, m = n >> 1; k < m; k++) {
        const c = 30 + 2 * k - 15; let acc = 0.5 * buf[c];
        for (let j = 0; j < 8; j++) { const d = 2 * j + 1; acc += HB[j] * (buf[c - d] + buf[c + d]); }
        y[k] = acc;
      }
      for (let i = 0; i < 30; i++) hist[i] = buf[n + i];
    };
  }
  function interpolator() {
    const hist = new Float64Array(16); let buf = new Float64Array(0);
    // u[0, m) at half rate → 2m samples added into z[a, a+2m) (never past z[a + lim))
    return (u, m, z, a, gain, lim) => {
      if (buf.length < m + 16) buf = new Float64Array(m + 16);
      buf.set(hist, 0); for (let i = 0; i < m; i++) buf[16 + i] = u[i];
      for (let k = 0; k < m; k++) {
        const c = 16 + k - 8; // centre of the even phase, 7.5 input samples (= 15 output samples) back
        let acc = 0;
        for (let j = 0; j < 8; j++) acc += HB[j] * (buf[c - j] + buf[c + 1 + j]);
        if (2 * k < lim) z[a + 2 * k] += gain * 2 * acc;
        if (2 * k + 1 < lim) z[a + 2 * k + 1] += gain * buf[c + 1];
      }
      for (let i = 0; i < 16; i++) hist[i] = buf[m + i];
    };
  }

  /* ---------- 3D: binaural room responses from a spherical-head model ---------- */
  const brirCache = new Map();
  function brir(fs) {
    if (brirCache.has(fs)) return brirCache.get(fs);
    const c = 343, a = 0.0875, LEN = 8192, BODY = LEN - 512, T0 = 40;
    const H = [[new Float64Array(LEN), new Float64Array(LEN)], [new Float64Array(LEN), new Float64Array(LEN)]]; // H[ear][input]: direct sound
    const RF = [[new Float64Array(LEN), new Float64Array(LEN)], [new Float64Array(LEN), new Float64Array(LEN)]]; // reflections and tail
    const room = [6.5, 5.0, 3.0], lis = [3.3, 2.15, 1.2], beta = [0.72, 0.74, 0.6];
    const D0 = 2.0, deg = PI / 180;
    const spk = (az) => [lis[0] + D0 * Math.cos(az * deg), lis[1] + D0 * Math.sin(az * deg), lis[2]];
    const SP = [
      { p: spk(45), g: [1, 0], dly: 0 }, { p: spk(-45), g: [0, 1], dly: 0 },
      { p: spk(120), g: [0.275, -0.275], dly: 0.010 }, { p: spk(-120), g: [-0.275, 0.275], dly: 0.013 },
    ];
    const tmp = new Float64Array(160), sfs = fs / 44100;
    const RHO = [0.5, -1, 0.5, -0.25, 0.25].map((v) => v * 0.45), PA = [1, 5, 5, 5, 5], PB = [2, 4, 7, 11, 13], PD = [1, 0.5, 0.5, 0.5, 0.5];
    const tau = 1 / (2 * (c / a)), K = 2 * fs;
    function arrive(inp, az, el, t, g, fc, into) {
      const ux = Math.cos(el) * Math.cos(az), uy = Math.cos(el) * Math.sin(az);
      const behind = ux < 0;
      for (let ear = 0; ear < 2; ear++) {
        const ce = ear === 0 ? uy : -uy, th = Math.acos(Math.max(-1, Math.min(1, ce)));
        const itd = th < PI / 2 ? -(a / c) * Math.cos(th) : (a / c) * (th - PI / 2);
        const alpha = 1.05 + 0.95 * Math.cos((th / (150 * deg)) * PI);
        const T = (t + itd) * fs + T0, ti = Math.floor(T), fr = T - ti, i0 = ti - 8;
        if (i0 < 0 || i0 + 160 > BODY) continue;
        tmp.fill(0);
        for (let k = -8; k <= 8; k++) { const x = k - fr, w = Math.abs(x) >= 9 ? 0 : 0.5 + 0.5 * Math.cos((PI * x) / 9); tmp[8 + k] = (Math.abs(x) < 1e-9 ? 1 : Math.sin(PI * x) / (PI * x)) * w; }
        // the outer ear: a few short echoes that move with the direction (Brown & Duda), kept gentle
        const azF = Math.max(-PI / 2, Math.min(PI / 2, ear === 0 ? az : -az));
        const echo = new Float64Array(tmp.length);
        for (let q = 0; q < 5; q++) {
          const d = (PA[q] * Math.cos(azF / 2) * Math.sin(PD[q] * (PI / 2 - el)) + PB[q]) * sfs, di = Math.floor(d), df = d - di;
          for (let k = tmp.length - 1; k >= di + 1; k--) echo[k] += RHO[q] * (tmp[k - di] * (1 - df) + tmp[k - di - 1] * df);
        }
        for (let k = 0; k < tmp.length; k++) tmp[k] += echo[k];
        // head shadow: (1 + α s/2ω0) / (1 + s/2ω0), bilinear
        { const b0 = 1 + alpha * K * tau, b1 = 1 - alpha * K * tau, a0 = 1 + K * tau, a1 = 1 - K * tau; let x1 = 0, y1 = 0;
          for (let k = 0; k < tmp.length; k++) { const x = tmp[k], y = (b0 * x + b1 * x1 - a1 * y1) / a0; x1 = x; y1 = y; tmp[k] = y; } }
        // walls swallow the highs; from behind, the ear itself dulls them
        const lp1 = (f, mix) => { const p = Math.exp((-2 * PI * f) / fs); let y = 0; for (let k = 0; k < tmp.length; k++) { y = (1 - p) * tmp[k] + p * y; tmp[k] = tmp[k] * (1 - mix) + y * mix; } };
        if (fc) lp1(fc, 1);
        if (behind) lp1(6000, 0.45);
        const dst = into[ear][inp];
        for (let k = 0; k < tmp.length; k++) dst[i0 + k] += g * tmp[k];
      }
    }
    for (const s of SP) {
      for (let nx = -2; nx <= 2; nx++) for (let qx = 0; qx < 2; qx++) for (let ny = -2; ny <= 2; ny++) for (let qy = 0; qy < 2; qy++) for (let nz = -2; nz <= 2; nz++) for (let qz = 0; qz < 2; qz++) {
        const ox = Math.abs(nx - qx) + Math.abs(nx), oy = Math.abs(ny - qy) + Math.abs(ny), oz = Math.abs(nz - qz) + Math.abs(nz), order = ox + oy + oz;
        if (order > 2) continue;
        const px = (qx ? -s.p[0] : s.p[0]) + 2 * nx * room[0], py = (qy ? -s.p[1] : s.p[1]) + 2 * ny * room[1], pz = (qz ? -s.p[2] : s.p[2]) + 2 * nz * room[2];
        const dx = px - lis[0], dy = py - lis[1], dz = pz - lis[2], dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const g = Math.pow(beta[0], ox) * Math.pow(beta[1], oy) * Math.pow(beta[2], oz) * (D0 / dist);
        const az = Math.atan2(dy, dx), el = Math.asin(dz / dist), t = (dist - D0) / c + s.dly;
        for (let inp = 0; inp < 2; inp++) if (s.g[inp]) arrive(inp, az, el, t, g * s.g[inp], order === 0 ? 0 : order === 1 ? 11000 : 6500, order === 0 ? H : RF);
      }
    }
    // the room's tail: noise that dies away (RT60 ≈ 0.42 s in the lows, 0.3 s mid, 0.2 s highs), alike in both ears below
    // 500 Hz, roughly equal energy per octave; its level makes the direct sound 3 dB stronger than everything after it
    {
      const NF = LEN, f = fft(NF), t0 = Math.round(0.018 * fs) + T0, rnd = rand(4242);
      const band = (sig, lo, hi) => { const re = Float64Array.from(sig), im = new Float64Array(NF); f(re, im, false);
        for (let k = 0; k <= NF / 2; k++) { const hz = (k * fs) / NF; const w = (lo <= 0 ? 1 : 0.5 + 0.5 * Math.tanh((hz - lo) / (lo * 0.25))) * (hi >= fs / 2 ? 1 : 0.5 - 0.5 * Math.tanh((hz - hi) / (hi * 0.25))); re[k] *= w; im[k] *= w; if (k > 0 && k < NF / 2) { re[NF - k] *= w; im[NF - k] *= w; } }
        f(re, im, true); for (let k = 0; k < NF; k++) re[k] /= NF; return re; };
      const noise = () => { const x = new Float64Array(NF); for (let k = 0; k < NF; k++) x[k] = rnd.gauss(); return x; };
      const env = (k, rt) => { if (k < t0) return 0; const u = (k - t0) / fs; return Math.min(1, u / 0.012) * Math.exp((-6.91 * u) / rt) * (k > BODY - 400 ? Math.max(0, (BODY - k) / 400) : 1); };
      const TL = [[new Float64Array(LEN), new Float64Array(LEN)], [new Float64Array(LEN), new Float64Array(LEN)]];
      const oct = (lo, hi) => Math.log2(hi / Math.max(20, lo)), wb = (lo, hi) => Math.sqrt(oct(lo, hi) / (hi - Math.max(20, lo)));
      const W0 = wb(0, 500), W1 = wb(500, 4000), W2 = wb(4000, fs / 2);
      for (let inp = 0; inp < 2; inp++) {
        const low = band(noise(), 0, 500);
        for (let ear = 0; ear < 2; ear++) {
          const n2 = noise(), mid = band(n2, 500, 4000), hi = band(n2, 4000, fs / 2), dst = TL[ear][inp];
          for (let k = 0; k < BODY; k++) dst[k] = W0 * low[k] * env(k, 0.42) + W1 * mid[k] * env(k, 0.3) + W2 * hi[k] * env(k, 0.2);
        }
      }
      // the room stays out of the deep bass (below ~160 Hz only the speakers themselves are heard), so 3D keeps the punch
      for (const row of RF) for (const h of row) chain([biquad('hp', 160, fs, 0.6), biquad('hp', 160, fs, 0.6)])(h, 0, LEN);
      for (const row of TL) for (const h of row) chain([biquad('hp', 160, fs, 0.6), biquad('hp', 160, fs, 0.6)])(h, 0, LEN);
      // direct = the front speaker's direct sound at its near ear; reflections and tail together come 3 dB lower
      const en = (h) => { let s = 0; for (let k = 0; k < LEN; k++) s += h[k] * h[k]; return s; };
      const dir = en(H[0][0]), er = en(RF[0][0]), tl = en(TL[0][0]);
      const want = dir / Math.pow(10, 0.3), g = Math.sqrt(Math.max(want * 0.35, want - er) / tl);
      for (let ear = 0; ear < 2; ear++) for (let inp = 0; inp < 2; inp++) { const d = H[ear][inp], r = RF[ear][inp], t = TL[ear][inp]; for (let k = 0; k < LEN; k++) d[k] += r[k] + g * t[k]; }
    }
    // equalise the average tone (diffuse-field style) so 3D changes where the sound is, not what it sounds like
    {
      const NF = LEN, f = fft(NF), S = H.map((row) => row.map((h) => { const re = Float64Array.from(h), im = new Float64Array(NF); f(re, im, false); return [re, im]; }));
      const nb = NF / 2 + 1, P = new Float64Array(nb);
      for (let k = 0; k < nb; k++) {
        const p2 = (z) => z[0][k] * z[0][k] + z[1][k] * z[1][k];
        const unc = (p2(S[0][0]) + p2(S[0][1]) + p2(S[1][0]) + p2(S[1][1])) / 2;
        const sl = [S[0][0][0][k] + S[0][1][0][k], S[0][0][1][k] + S[0][1][1][k]], sr = [S[1][0][0][k] + S[1][1][0][k], S[1][0][1][k] + S[1][1][1][k]];
        const cor = (sl[0] * sl[0] + sl[1] * sl[1] + sr[0] * sr[0] + sr[1] * sr[1]) / 2;
        P[k] = 0.5 * unc + 0.5 * cor;
      }
      // third-octave smoothing, then the inverse (±6 dB at most), level set by the mid band
      const E = new Float64Array(nb);
      for (let k = 1; k < nb; k++) {
        const hz = Math.min(16000, Math.max(80, (k * fs) / NF)), lo = Math.max(1, Math.floor(((hz / 1.12) * NF) / fs)), hi = Math.min(nb - 1, Math.ceil(((hz * 1.12) * NF) / fs));
        let s = 0; for (let j = lo; j <= hi; j++) s += P[j]; E[k] = s / (hi - lo + 1);
      }
      E[0] = E[1];
      let ref = 0, cnt = 0; for (let k = 0; k < nb; k++) { const hz = (k * fs) / NF; if (hz >= 300 && hz <= 3000) { ref += 10 * Math.log10(E[k]); cnt++; } }
      ref /= cnt;
      const mag = new Float64Array(NF);
      for (let k = 0; k < nb; k++) { const db = Math.max(-6, Math.min(6, -(10 * Math.log10(E[k]) - ref))); mag[k] = db; if (k > 0 && k < NF / 2) mag[NF - k] = db; }
      // minimum phase from the log magnitude (real cepstrum, folded)
      const cr = new Float64Array(NF), ci = new Float64Array(NF);
      for (let k = 0; k < NF; k++) cr[k] = (mag[k] / 20) * Math.LN10;
      f(cr, ci, true); for (let k = 0; k < NF; k++) { cr[k] /= NF; ci[k] = 0; }
      for (let k = 1; k < NF / 2; k++) { cr[k] *= 2; cr[NF - k] = 0; }
      f(cr, ci, false);
      for (let k = 0; k < NF; k++) { const e = Math.exp(cr[k]), ph = ci[k]; cr[k] = e * Math.cos(ph); ci[k] = e * Math.sin(ph); }
      f(cr, ci, true);
      const EQ = new Float64Array(512); for (let k = 0; k < 512; k++) EQ[k] = (cr[k] / NF) * (k < 384 ? 1 : 0.5 + 0.5 * Math.cos((PI * (k - 384)) / 128));
      for (const row of H) for (let i = 0; i < 2; i++) {
        const h = row[i], o = new Float64Array(LEN);
        for (let k = 0; k < BODY; k++) { const v = h[k]; if (v === 0) continue; for (let j = 0; j < 512; j++) o[k + j] += v * EQ[j]; }
        row[i] = o;
      }
    }
    const out = { ll: Float32Array.from(H[0][0]), rl: Float32Array.from(H[0][1]), lr: Float32Array.from(H[1][0]), rr: Float32Array.from(H[1][1]), lag: T0 };
    brirCache.set(fs, out);
    return out;
  }

  /* ---------- the hall: a 2.6 s stereo tail at half the sample rate ---------- */
  const hallCache = new Map();
  function hall(fs2) {
    if (hallCache.has(fs2)) return hallCache.get(fs2);
    const NF = 1 << Math.ceil(Math.log2(2.4 * fs2)), f = fft(NF), len = Math.round(2.3 * fs2);
    const pre = Math.round(0.03 * fs2) - 15; // 30 ms after the dry sound (the resampling already delays it 15 samples)
    const bands = [[0, 250, 2.6], [250, 1000, 2.3], [1000, 3000, 1.9], [3000, 6000, 1.35], [6000, fs2 / 2, 0.85]];
    const out = [];
    for (let ch = 0; ch < 2; ch++) {
      const rnd = rand(7001 + ch * 977), re = new Float64Array(NF), im = new Float64Array(NF);
      for (let k = 0; k < NF; k++) re[k] = rnd.gauss();
      f(re, im, false);
      const h = new Float64Array(len);
      const nb = NF / 2 + 1;
      for (let b = 0; b < bands.length; b++) {
        const [lo, hi, rt] = bands[b], br = new Float64Array(NF), bi = new Float64Array(NF);
        for (let k = 0; k < nb; k++) {
          const hz = (k * fs2) / NF;
          let w = (lo <= 0 ? 1 : 0.5 + 0.5 * Math.tanh((hz - lo) / (lo * 0.2))) * (hi >= fs2 / 2 ? 1 : 0.5 - 0.5 * Math.tanh((hz - hi) / (hi * 0.2)));
          w *= hz < 90 ? Math.pow(hz / 90, 2) : 1; // no booming below 90 Hz
          w *= hz > 7500 ? Math.exp(-(hz - 7500) / 1500) : 1; // the far end of a hall is dark
          br[k] = re[k] * w; bi[k] = im[k] * w; if (k > 0 && k < NF / 2) { br[NF - k] = re[NF - k] * w; bi[NF - k] = im[NF - k] * w; }
        }
        f(br, bi, true);
        for (let k = pre; k < len; k++) {
          const u = (k - pre) / fs2, rise = Math.min(1, u / 0.045), on = rise * rise * (3 - 2 * rise);
          const fade = k > len - fs2 * 0.25 ? (len - k) / (fs2 * 0.25) : 1;
          h[k] += (br[k] / NF) * on * Math.exp((-6.91 * u) / rt) * fade;
        }
      }
      // the far wall answers ~165 ms later, softly and darkly
      const t1 = pre + Math.round(0.165 * fs2), w1 = Math.round(0.03 * fs2), r2 = rand(99 + ch);
      let lp = 0; const p = Math.exp((-2 * PI * 2500) / fs2);
      for (let k = 0; k < w1; k++) { lp = (1 - p) * r2.gauss() + p * lp; h[t1 + k] += lp * 0.11 * Math.sin((PI * k) / w1) * Math.exp((-6.91 * 0.165) / 2.0); }
      out.push(h);
    }
    // level: the tail carries about −9 dB of the dry sound's energy
    let e = 0; for (const h of out) for (let k = 0; k < len; k++) e += h[k] * h[k];
    const g = Math.sqrt(Math.pow(10, -0.9) / (e / 2));
    const res = { l: Float32Array.from(out[0], (v) => v * g), r: Float32Array.from(out[1], (v) => v * g) };
    hallCache.set(fs2, res);
    return res;
  }

  /* ---------- the three effects; run(L, R, a, n) works in place, n a multiple of BLOCK except on the last call ---------- */
  const BLOCK = 16384;
  function bassFx(fs) {
    const eq = () => chain([biquad('hp', 20, fs, 0.707), biquad('ls', 105, fs, 0.9, 6), biquad('peak', 58, fs, 1.1, 2.5), biquad('peak', 320, fs, 1.0, -1.5), biquad('hs', 6500, fs, 0.7, 1)]);
    const eL = eq(), eR = eq();
    const lp = chain([biquad('lp', 90, fs, 0.707), biquad('lp', 90, fs, 0.707)]);
    const bp = chain([biquad('hp', 90, fs, 0.707), biquad('lp', 350, fs, 0.707)]);
    const att = 1 - Math.exp(-1 / (0.003 * fs)), rel = 1 - Math.exp(-1 / (0.06 * fs)), K = 2 / PI, GH = 0.32;
    let env = 0, m = new Float64Array(0);
    return {
      run(L, R, a, n) {
        if (m.length < n) m = new Float64Array(n);
        for (let i = 0; i < n; i++) m[i] = 0.5 * (L[a + i] + R[a + i]);
        lp(m, 0, n);
        // full-wave rectified bass, its average taken off: mostly the second harmonic, as loud as the bass itself
        for (let i = 0; i < n; i++) { const x = m[i], ax = x < 0 ? -x : x; env += (ax - env) * (ax > env ? att : rel); m[i] = ax - K * env; }
        bp(m, 0, n);
        eL(L, a, n); eR(R, a, n);
        for (let i = 0; i < n; i++) { const h = m[i] * GH; L[a + i] += h; R[a + i] += h; }
      },
    };
  }
  function surroundFx(fs) {
    const ir = brir(fs), B = 8192, cv = convolver([[ir.ll, ir.rl], [ir.lr, ir.rr]], B);
    return { run(L, R, a, n) { for (let s = 0; s < n; s += B) cv(L, R, a + s, Math.min(B, n - s), L, R, a + s); } };
  }
  function liveFx(fs) {
    const tone = () => chain([biquad('ls', 100, fs, 0.8, 1.5), biquad('peak', 500, fs, 0.8, -1), biquad('peak', 3000, fs, 0.9, 1.2), biquad('hs', 11000, fs, 0.7, -2)]);
    const tL = tone(), tR = tone();
    // early reflections: [ms, dB, side] — the side walls, balconies and the ceiling of a big room
    const ER = [[11, -17, 0], [13, -17.5, 1], [19, -18.5, 0], [23, -18.5, 1], [28, -19.5, 1], [31, -19.5, 0], [37, -20.5, 0], [42, -20.5, 1], [48, -21.5, 1], [53, -21.5, 0],
      [59, -22.5, 0], [65, -22.5, 1], [71, -23.5, 1], [77, -23.5, 0], [84, -24.5, 0], [90, -24.5, 1], [97, -25.5, 1], [103, -25.5, 0]];
    const side = (k) => { const t = ER.filter((x) => x[2] === k); return { d: Int32Array.from(t, (x) => Math.round((x[0] / 1000) * fs)), g: Float64Array.from(t, (x) => Math.pow(10, x[1] / 20)) }; };
    const TA = side(0), TB = side(1), MD = Math.max(TA.d[TA.d.length - 1], TB.d[TB.d.length - 1]) + 1;
    const hA = new Float64Array(MD + BLOCK), hB = new Float64Array(MD + BLOCK);
    const pe = Math.exp((-2 * PI * 6500) / fs); let lpA = 0, lpB = 0;
    const fs2 = fs / 2, H2 = hall(fs2), B2 = 8192, cv = convolver([[H2.l], [H2.r]], B2);
    const dec = decimator(), upL = interpolator(), upR = interpolator();
    const send = new Float64Array(BLOCK + 2), half = new Float64Array(B2), wl = new Float64Array(B2), wr = new Float64Array(B2), el = new Float64Array(BLOCK), er = new Float64Array(BLOCK);
    return {
      run(L, R, a, n) {
        for (let s = 0; s < n; s += BLOCK) {
          const m = Math.min(BLOCK, n - s), m2 = m + (m & 1), o = a + s;
          // the hall: mono send → half rate → tail → full rate
          for (let i = 0; i < m; i++) send[i] = 0.5 * (L[o + i] + R[o + i]);
          if (m2 > m) send[m] = 0;
          dec(send, 0, m2, half);
          cv(half, null, 0, m2 >> 1, wl, wr, 0);
          // early reflections from the untouched input (each side hears mostly its own half of the stage)
          for (let i = 0; i < m; i++) { const xl = L[o + i], xr = R[o + i]; hA[MD + i] = 0.75 * xl + 0.25 * xr; hB[MD + i] = 0.25 * xl + 0.75 * xr; }
          el.fill(0, 0, m); er.fill(0, 0, m);
          for (let k = 0; k < TA.d.length; k++) { const g = TA.g[k], b = MD - TA.d[k]; for (let i = 0; i < m; i++) el[i] += g * hA[b + i]; }
          for (let k = 0; k < TB.d.length; k++) { const g = TB.g[k], b = MD - TB.d[k]; for (let i = 0; i < m; i++) er[i] += g * hB[b + i]; }
          for (let i = 0; i < m; i++) { lpA = (1 - pe) * el[i] + pe * lpA; el[i] = lpA; lpB = (1 - pe) * er[i] + pe * lpB; er[i] = lpB; }
          hA.copyWithin(0, m, m + MD); hB.copyWithin(0, m, m + MD);
          tL(L, o, m); tR(R, o, m);
          for (let i = 0; i < m; i++) { L[o + i] += el[i]; R[o + i] += er[i]; }
          upL(wl, m2 >> 1, L, o, 1, m); upR(wr, m2 >> 1, R, o, 1, m);
        }
      },
    };
  }
  function effect(mode, fs) { return mode === 'bass' ? bassFx(fs) : mode === '3d' ? surroundFx(fs) : mode === 'live' ? liveFx(fs) : null; }
  const OFFSET = { bass: 1.0, '3d': 0, live: 0 };
  const PRE = { bass: 0.3, '3d': 0.25, live: 2.8 };

  /* ---------- loudness: K-weighted (BS.1770) energy in 400 ms blocks, near-silence left out ---------- */
  function kEnergy(L, R, a, n, fs) {
    const k = [biquad('hsq', 1681.97, fs, 0.7072, 4), biquad('hp', 38.135, fs, 0.5003)];
    const cl = chain(k), cr = chain(k), bl = new Float64Array(Math.min(n, 1 << 16)), br = new Float64Array(bl.length);
    const blk = Math.round(0.4 * fs), list = [];
    let acc = 0, cnt = 0;
    for (let s = 0; s < n; s += bl.length) {
      const m = Math.min(bl.length, n - s);
      for (let i = 0; i < m; i++) { bl[i] = L[a + s + i]; br[i] = R[a + s + i]; }
      cl(bl, 0, m); cr(br, 0, m);
      for (let i = 0; i < m; i++) { acc += bl[i] * bl[i] + br[i] * br[i]; if (++cnt === blk) { list.push(acc / blk); acc = 0; cnt = 0; } }
    }
    if (cnt > blk / 4) list.push(acc / cnt);
    return list;
  }

  /* ---------- look-ahead limiter, then TPDF dither to 16 bits (or plain float) ----------
     The gain needed for each sample (ceiling ÷ peak) goes through a 30 ms running minimum (hold), an exponential release
     (150 ms) and a 2.2 ms moving average, while the sound itself waits 2.2 ms: the gain is already down when a peak
     arrives, and moves smoothly. out is { s16 } (interleaved 16-bit) or { L, R } (float). */
  function finisher(fs, gain, out) {
    const D = Math.max(8, Math.round(0.0022 * fs)), HW = Math.round(0.03 * fs), CEIL = 0.944, rel = 1 - Math.exp(-1 / (0.15 * fs));
    const dl = new Float64Array(D), dr = new Float64Array(D), box = new Float64Array(D).fill(1);
    const QN = HW + 2, qv = new Float64Array(QN), qi = new Float64Array(QN);
    let qh = 0, qt = 0, di = 0, bi = 0, sum = D, r = 1, idx = 0, w = 0, minG = 1, peak = 0, x = 0x2545f491;
    const s16 = out.s16, oL = out.L, oR = out.R, cap = s16 ? s16.length >> 1 : oL.length;
    function run(L, R, a, n, zero) {
      for (let i = a, e = a + n; i < e; i++) {
        const xl = zero ? 0 : L[i] * gain, xr = zero ? 0 : R[i] * gain;
        const al = xl < 0 ? -xl : xl, ar = xr < 0 ? -xr : xr, pk = al > ar ? al : ar, g0 = pk > CEIL ? CEIL / pk : 1;
        while (qt !== qh) { const b = qt === 0 ? QN - 1 : qt - 1; if (qv[b] >= g0) qt = b; else break; }
        qv[qt] = g0; qi[qt] = idx; qt = qt + 1 === QN ? 0 : qt + 1;
        while (qi[qh] < idx - HW) qh = qh + 1 === QN ? 0 : qh + 1;
        const h = qv[qh];
        r = h < r ? h : r + (h - r) * rel;
        sum += r - box[bi]; box[bi] = r; bi = bi + 1 === D ? 0 : bi + 1;
        if ((idx & 65535) === 0) { sum = 0; for (let k = 0; k < D; k++) sum += box[k]; }
        const gg = sum / D, yl = dl[di] * gg, yr = dr[di] * gg;
        dl[di] = xl; dr[di] = xr; di = di + 1 === D ? 0 : di + 1;
        if (idx >= D && w < cap) {
          if (gg < minG) minG = gg;
          const ql = yl < 0 ? -yl : yl, qr = yr < 0 ? -yr : yr; if (ql > peak) peak = ql; if (qr > peak) peak = qr;
          if (s16) {
            // TPDF dither: two uniform 16-bit numbers per channel from two xorshift steps
            x ^= x << 13; x ^= x >>> 17; x ^= x << 5; const v1 = x;
            x ^= x << 13; x ^= x >>> 17; x ^= x << 5; const v2 = x;
            const tl = ((v1 & 65535) - (v1 >>> 16)) * 0.0000152587890625, tr = ((v2 & 65535) - (v2 >>> 16)) * 0.0000152587890625;
            let p = Math.floor(yl * 32767 + tl + 0.5), q = Math.floor(yr * 32767 + tr + 0.5);
            s16[2 * w] = p > 32767 ? 32767 : p < -32768 ? -32768 : p; s16[2 * w + 1] = q > 32767 ? 32767 : q < -32768 ? -32768 : q;
          } else { oL[w] = yl; oR[w] = yr; }
          w++;
        }
        idx++;
      }
    }
    return { run: (L, R, a, n) => run(L, R, a, n, false), end() { run(null, null, 0, D, true); return { minG, peak }; } };
  }
  function wavFile(n, fs) {
    const ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, fs, true); v.setUint32(28, fs * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
    return { ab, s16: new Int16Array(ab, 44, n * 2) };
  }

  /* ---------- the gain that matches the original's loudness, from excerpts ---------- */
  function estimate(mode, fs, parts) {
    let eo = 0, ep = 0;
    for (const pt of parts) {
      const { L, R, pre } = pt, n = L.length - pre;
      if (n <= 0) continue;
      const bo = kEnergy(L, R, pre, n, fs);
      const fx = effect(mode, fs);
      for (let s = 0; s < L.length; s += BLOCK) fx.run(L, R, s, Math.min(BLOCK, L.length - s));
      const bp = kEnergy(L, R, pre, n, fs);
      for (let k = 0; k < Math.min(bo.length, bp.length); k++) if (bo[k] > 2e-7) { eo += bo[k]; ep += bp[k]; }
    }
    const db = eo > 0 && ep > 0 ? 10 * Math.log10(eo / ep) : 0;
    return Math.max(-12, Math.min(6, db + (OFFSET[mode] || 0)));
  }

  /* ---------- jobs (one at a time) ---------- */
  const jobs = new Map();
  function handle(d, post) {
    if (d.cmd === 'est') { post({ job: d.job, gain: estimate(d.mode, d.sr, d.parts) }); return; }
    if (d.cmd === 'begin') {
      const wf = wavFile(d.n, d.sr);
      jobs.set(d.job, { fx: effect(d.mode, d.sr), wf, fin: finisher(d.sr, Math.pow(10, d.gain / 20), { s16: wf.s16 }), done: 0 });
      post({ job: d.job, ok: 1 }); return;
    }
    if (d.cmd === 'chunk') {
      const J = jobs.get(d.job); if (!J) { post({ job: d.job, error: 'gone' }); return; }
      J.fx.run(d.L, d.R, 0, d.L.length); J.fin.run(d.L, d.R, 0, d.L.length); J.done += d.L.length;
      post({ job: d.job, done: J.done }); return;
    }
    if (d.cmd === 'end') {
      const J = jobs.get(d.job); if (!J) { post({ job: d.job, error: 'gone' }); return; }
      const st = J.fin.end(); jobs.delete(d.job);
      post({ job: d.job, wav: J.wf.ab, peak: st.peak, minG: st.minG }, [J.wf.ab]); return;
    }
    if (d.cmd === 'cancel') { jobs.delete(d.job); return; }
    // a short stretch, whole (the music video): float in, float out
    if (d.cmd === 'whole') {
      const L = d.L.slice(), R = d.R.slice();
      const gain = estimate(d.mode, d.sr, [{ L: L.slice(), R: R.slice(), pre: 0 }]);
      const fx = effect(d.mode, d.sr);
      for (let s = 0; s < L.length; s += BLOCK) fx.run(L, R, s, Math.min(BLOCK, L.length - s));
      const OL = new Float32Array(L.length), OR = new Float32Array(L.length);
      const fin = finisher(d.sr, Math.pow(10, gain / 20), { L: OL, R: OR });
      fin.run(L, R, 0, L.length); fin.end();
      post({ job: d.job, L: OL, R: OR }, [OL.buffer, OR.buffer]);
    }
  }
  if (scope && typeof scope.postMessage === 'function') {
    scope.onmessage = (e) => { const d = e.data; try { handle(d, (m, tr) => { m.req = d.req; scope.postMessage(m, tr || []); }); } catch (err) { scope.postMessage({ req: d && d.req, job: d && d.job, error: String((err && err.message) || err) }); } };
  }
  return { fft, biquad, chain, gainAt, convolver, brir, hall, effect, estimate, kEnergy, finisher, wavFile, decimator, interpolator, handle, BLOCK, PRE, OFFSET };
}

R.sound = (() => {
  const { bus, settings, $, esc, I } = R;
  const MODES = {
    off: { name: '原音', sub: '照原本的樣子播' },
    '3d': { name: '3D 環繞', tag: '3D', sub: '戴耳機聽：像坐在一圈喇叭中間，聲音跑到頭外面' },
    bass: { name: '重低音', tag: 'BASS', sub: '低音更深更有力，人聲照樣清楚' },
    live: { name: '演唱會現場', tag: 'LIVE', sub: '整首歌搬進大型場館，有空間、有回音' },
  };
  const SR = 44100, CORE = fxCore(null), BLOCK = CORE.BLOCK;
  const LIM = R.isIOS ? 12 * 60 : 40 * 60;                // longer songs play as they are (memory)
  const AHEAD = R.isIOS ? 2 : 3;                          // songs rendered ahead of the one playing
  const BUDGET = (R.isIOS ? 300 : 900) * 1048576;         // rendered audio kept in memory, at most
  const store = new Map();                                // `${id}|${mode}` → { url, bytes, id, mode, at }
  const bad = new Map();                                  // key → why it is played as it is ('long', 'fail')
  let worker = null, wfail = false, seq = 0, job = null, queue = [], busy = false;
  const pending = new Map();

  const mode = () => (MODES[settings.get('sound')] && settings.get('sound') !== 'off' ? settings.get('sound') : 'off');
  const usable = () => (settings.get('srcMode') || 'blob') !== 'data' && !!(window.OfflineAudioContext || window.webkitOfflineAudioContext) && !wfail;
  const keyOf = (id, m) => id + '|' + (m || mode());

  /* ---------- the worker ---------- */
  function getWorker() {
    if (worker || wfail) return worker;
    try {
      const src = fxCore.toString() + '\nfxCore(self);';
      worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      worker.onmessage = (e) => { const d = e.data, p = pending.get(d.req); if (!p) return; pending.delete(d.req); if (d.error) p.rej(new Error(d.error)); else p.res(d); };
      worker.onerror = (e) => { console.warn('sound worker failed', e.message); wfail = true; worker = null; for (const p of pending.values()) p.rej(new Error('worker')); pending.clear(); paint(); };
    } catch (e) { wfail = true; worker = null; }
    return worker;
  }
  function call(msg, tr) {
    return new Promise((res, rej) => {
      const w = getWorker(); if (!w) { rej(new Error('no worker')); return; }
      msg.req = ++seq; pending.set(msg.req, { res, rej });
      w.postMessage(msg, tr || []);
    });
  }
  function decode(buf) {
    const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new AC(2, 2, SR);
    return new Promise((res, rej) => {
      let done = false;
      const ok = (b) => { if (!done) { done = true; res(b); } }, no = (e) => { if (!done) { done = true; rej(e || new Error('decode')); } };
      try { const p = ctx.decodeAudioData(buf, ok, no); if (p && p.then) p.then(ok, no); } catch (e) { no(e); }
    });
  }
  const shown = () => new Promise((res) => { if (!document.hidden) { res(); return; } const f = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', f); res(); } }; document.addEventListener('visibilitychange', f); });

  /* ---------- rendering one song ---------- */
  async function render(J) {
    const t = R.lib.get(J.id);
    if (!t) throw new Error('gone');
    if (t.duration && t.duration > LIM) { J.why = 'long'; return; }
    while (R.lib.importing()) { await R.sleep(500); if (J.stop) return; }
    await shown();
    const raw = await R.db.getAudioRaw(J.id);
    if (!raw || J.stop) return;
    const b = await decode(raw.buf);
    if (J.stop) return;
    if (b.duration > LIM) { J.why = 'long'; return; }
    const n = b.length, nc = b.numberOfChannels, part = (c, a, len) => b.getChannelData(Math.min(c, nc - 1)).slice(a, a + len);
    J.p = 0.06; paint();
    // loudness: excerpts across the song (the whole song when it is short)
    const pre = Math.round(CORE.PRE[J.mode] * SR), M = Math.round(5 * SR), parts = [];
    if (n < 75 * SR) parts.push({ L: part(0, 0, n), R: part(1, 0, n), pre: 0 });
    else for (let k = 0; k < 6; k++) { const c = Math.round((0.08 + (0.84 * (k + 0.5)) / 6) * n), a = Math.max(0, c - M / 2 - pre), e = Math.min(n, c + M / 2); parts.push({ L: part(0, a, e - a), R: part(1, a, e - a), pre: c - M / 2 - a }); }
    const est = await call({ cmd: 'est', mode: J.mode, sr: SR, parts }, [].concat(...parts.map((p) => [p.L.buffer, p.R.buffer])));
    if (J.stop) return;
    J.p = 0.16; paint();
    J.wid = seq + 1;
    await call({ cmd: 'begin', job: J.wid, mode: J.mode, sr: SR, n, gain: est.gain });
    const CH = BLOCK * 27;
    for (let a = 0; a < n; a += CH) {
      if (document.hidden) await shown();   // the phone may stop a page that works hard behind the lock screen
      if (J.stop) { if (worker) worker.postMessage({ cmd: 'cancel', job: J.wid }); return; }
      const len = Math.min(CH, n - a), L = part(0, a, len), Rr = part(1, a, len);
      await call({ cmd: 'chunk', job: J.wid, L, R: Rr }, [L.buffer, Rr.buffer]);
      J.p = 0.16 + (0.82 * (a + len)) / n; paint();
    }
    const res = await call({ cmd: 'end', job: J.wid });
    if (J.stop) return;
    const url = URL.createObjectURL(new Blob([res.wav], { type: 'audio/wav' }));
    store.set(J.key, { url, bytes: res.wav.byteLength, id: J.id, mode: J.mode, at: Date.now() });
    J.ok = true;
  }

  /* ---------- what to render: the song playing, then the next ones; what to keep ---------- */
  const inUse = (u) => R.player.els.some((el) => el.src === u);
  function drop(key) { const e = store.get(key); if (!e) return; store.delete(key); if (inUse(e.url)) setTimeout(() => { if (!inUse(e.url)) URL.revokeObjectURL(e.url); else store.set(key, e); }, 4000); else URL.revokeObjectURL(e.url); }
  function plan() {
    const m = mode();
    let keys = [];
    if (m !== 'off' && usable()) {
      const ids = []; const c = R.player.current(); if (c) ids.push(c.id);
      for (const id of R.player.ahead(AHEAD)) if (!ids.includes(id)) ids.push(id);
      let bytes = 0;
      for (const id of ids) {
        const t = R.lib.get(id), k = keyOf(id, m);
        if (!t || bad.has(k)) continue;
        const need = store.has(k) ? store.get(k).bytes : (t.duration || 240) * SR * 4;
        if (keys.length && bytes + need > BUDGET) break;
        bytes += need; keys.push(k);
      }
    }
    for (const k of Array.from(store.keys())) if (!keys.includes(k) && !inUse(store.get(k).url)) drop(k);
    if (job && !keys.includes(job.key)) job.stop = true;
    queue = keys.filter((k) => !store.has(k) && (!job || job.key !== k));
    paint();
    pump();
  }
  async function pump() {
    if (busy) return;
    busy = true;
    try {
      while (queue.length) {
        const key = queue.shift(), [id, m] = key.split('|');
        if (store.has(key) || bad.has(key) || m !== mode()) continue;
        job = { key, id, mode: m, p: 0, stop: false };
        paint();
        try { await render(job); if (!job.ok && job.why) bad.set(key, job.why); }
        catch (e) { console.warn('sound', e); bad.set(key, 'fail'); }
        const J = job; job = null;
        if (J.ok) { const c = R.player.current(); if (c && c.id === J.id) { R.player.useSource(); setTimeout(plan, 2500); } }
        paint();
        await R.sleep(80);
      }
    } finally { busy = false; paint(); }
  }

  /* ---------- for the player ---------- */
  function urlFor(id) { if (mode() === 'off' || !usable()) return null; const e = store.get(keyOf(id)); return e ? e.url : null; }
  const owns = (u) => { for (const e of store.values()) if (e.url === u) return true; return false; };
  function failed(u) { for (const [k, e] of store) if (e.url === u) { bad.set(k, 'fail'); store.delete(k); setTimeout(() => URL.revokeObjectURL(e.url), 3000); } paint(); }

  /* ---------- the pill: which effect, and how far the song playing is ---------- */
  const pill = document.createElement('button');
  pill.type = 'button'; pill.id = 'soundPill'; pill.hidden = true; pill.setAttribute('aria-label', '音效');
  pill.innerHTML = `${I.phones}<span></span><i class="spb"><b></b></i>`;
  ($('#app') || document.body).appendChild(pill);
  pill.addEventListener('click', () => menu());
  let miniT = 0, lastTxt = '';
  function state() {
    const m = mode(), c = R.player.current();
    if (m === 'off') return { kind: 'off' };
    if (!usable()) return { kind: 'na', txt: MODES[m].name + ' · 這裡用不了' };
    if (!c) return { kind: 'idle', txt: MODES[m].name };
    const k = keyOf(c.id, m);
    if (store.has(k)) return { kind: R.player.playingFx() ? 'on' : 'ready', txt: MODES[m].name };
    if (bad.has(k)) return { kind: 'skip', txt: MODES[m].name + (bad.get(k) === 'long' ? ' · 這首太長，用原音' : ' · 這首用原音') };
    if (job && job.key === k) return { kind: 'work', txt: MODES[m].name + ' · 準備中 ' + Math.round(job.p * 100) + '%', p: job.p };
    return { kind: 'work', txt: MODES[m].name + ' · 排隊中', p: 0 };
  }
  function paint() {
    const s = state();
    pill.hidden = s.kind === 'off';
    if (s.kind === 'off') return;
    const txt = s.txt || '';
    if (txt !== lastTxt) { pill.querySelector('span').textContent = txt; lastTxt = txt; }
    pill.className = 'sp-' + s.kind;
    pill.querySelector('.spb b').style.transform = `scaleX(${(s.p || 0).toFixed(3)})`;
    // once the effect is on, the pill shrinks to a small badge after a few seconds
    clearTimeout(miniT);
    if (s.kind === 'on' || s.kind === 'idle') miniT = setTimeout(() => pill.classList.add('mini'), 4500);
  }

  /* ---------- the menu ---------- */
  async function menu() {
    const m = mode();
    const items = Object.keys(MODES).map((k) => ({ key: k, label: MODES[k].name, sub: MODES[k].sub, icon: k === 'off' ? I.volume : I.phones, on: k === m }));
    const k = await R.ui.menu(items, { title: '音效', sub: usable() ? '整首先算好再播，所以鎖屏也聽得到；換上新音效要等幾秒。' : '這裡（Claude App 裡）放不了算好的音檔；請用網頁版。' });
    if (!k || k === m) return;
    set(k);
  }
  function set(k) {
    if (!MODES[k]) return;
    settings.set('sound', k);
    pill.classList.remove('mini');
    if (k === 'off') R.toast('換回原音', { ms: 1600 });
    else if (!usable()) R.toast('這裡放不了算好的音檔，音效先關著；請用網頁版', { ms: 4200 });
    else R.toast(`${MODES[k].name}：這首算好就換上（幾秒）`, { ms: 3000 });
    R.stage.sfx('ok');
  }
  bus.on('setting', (k) => { if (k === 'sound') { plan(); R.player.useSource(); setTimeout(plan, 2500); } else if (k === 'srcMode') plan(); });
  bus.on('track', () => { pill.classList.remove('mini'); plan(); });
  bus.on('queue', () => plan());
  bus.on('state', () => paint());
  bus.on('library', () => { for (const k of Array.from(store.keys())) if (!R.lib.get(store.get(k).id)) drop(k); plan(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { R.player.useSource(); plan(); } });

  /* ---------- a short stretch, processed whole (the music video uses this) ---------- */
  async function processBuffer(ctx, buf) {
    const m = mode();
    if (m === 'off' || !usable()) return buf;
    const L = buf.getChannelData(0).slice(), Rr = buf.getChannelData(Math.min(1, buf.numberOfChannels - 1)).slice();
    const r = await call({ cmd: 'whole', mode: m, sr: buf.sampleRate, L, R: Rr }, [L.buffer, Rr.buffer]);
    const out = ctx.createBuffer(2, r.L.length, buf.sampleRate);
    out.getChannelData(0).set(r.L); out.getChannelData(1).set(r.R);
    return out;
  }

  // the next effect in the menu's order (the amp skin's selector knob turns through them)
  const next = () => { const ks = Object.keys(MODES); return ks[(ks.indexOf(mode()) + 1) % ks.length]; };
  return { MODES, mode, set, next, menu, usable, urlFor, owns, failed, processBuffer, plan, paint, state, name: () => MODES[mode()].name, stats: () => ({ kept: store.size, bytes: Array.from(store.values()).reduce((a, e) => a + e.bytes, 0), job: job ? { id: job.id, p: job.p } : null, queue: queue.slice(), bad: Array.from(bad.entries()) }) };
})();
