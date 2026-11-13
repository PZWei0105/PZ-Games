/* ===================== rhythm & spectrum analysis (done once per song, stored) =====================
   The player never routes music through Web Audio (on iPhone that can silence playback in the
   background). Instead every song is decoded once, measured here, and the visuals read these
   numbers back in sync with the playback clock. */
/* The beat grid (analysis v3). Onsets: a 1024-point FFT every 256 samples (≈86 per second at 22050 Hz), 40 log bands
   in four groups (low = kick, low-mid = bass/toms/piano, mid = snare/claps/vocals, high = hats); the rise of each band
   (log magnitude) is the onset strength. Tempo: autocorrelation peaks (and their ×2, ½, ×1.5, ⅔) are scored by how well a
   steady pulse at that period lines up with the onsets in 8-second windows, weighted by a prior around 116 BPM — this is
   what fixes the old half/double/4:3 mistakes. Beats: dynamic programming (Ellis 2007) that follows the onsets while
   keeping the tempo steady, extended through the intro and outro while there is sound. Downbeats: the beat-in-bar
   phase with the most kick, chord change and onset. Songs on a steady grid (most produced music) get one exact line of
   beats, so an intro of off-beat hats keeps the groove's phase. Each beat has an accent (its onset against the beats
   around it).
   Hits: peaks per group (kick / snare / hat, and 'tone' for the low-mids: bass notes, piano, guitar) for effects that
   follow the instruments themselves. Measured on the demo song and
   synthesized EDM, pop, ballad and hip-hop with known beats (tempo right, every beat found, downbeats right) and on two
   real recordings against librosa. */
function beatCore(x, sr) {
  const N = 1024, H = Math.max(64, Math.round((256 * sr) / 22050)), fps = sr / H;
  const n = Math.max(4, Math.floor(x.length / H));
  const bits = Math.round(Math.log2(N));
  const rev = new Uint16Array(N);
  for (let i = 0; i < N; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
  const cs = new Float32Array(N / 2), sn = new Float32Array(N / 2);
  for (let i = 0; i < N / 2; i++) { cs[i] = Math.cos((-2 * Math.PI * i) / N); sn[i] = Math.sin((-2 * Math.PI * i) / N); }
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const re = new Float32Array(N), im = new Float32Array(N);
  let peak = 1e-6;
  for (let i = 0; i < x.length; i += 2) { const a = x[i] < 0 ? -x[i] : x[i]; if (a > peak) peak = a; }
  const gain = 1 / peak;
  // log-spaced bands 30 Hz .. 11 kHz, grouped: low (kick), low-mid (bass, toms, piano), mid (snare, claps, vocals), high (hats)
  const NBO = 40, f0 = 30, f1 = Math.min(11000, sr / 2 - 1);
  const ed = new Int32Array(NBO + 1);
  for (let b = 0; b <= NBO; b++) ed[b] = Math.max(1, Math.round((f0 * Math.pow(f1 / f0, b / NBO) * N) / sr));
  for (let b = 1; b <= NBO; b++) if (ed[b] <= ed[b - 1]) ed[b] = ed[b - 1] + 1;
  for (let b = 0; b <= NBO; b++) ed[b] = Math.min(ed[b], N / 2);
  const grp = new Int8Array(NBO);
  for (let b = 0; b < NBO; b++) {
    const fc = (Math.sqrt(ed[b] * ed[b + 1]) * sr) / N;
    grp[b] = fc < 150 ? 0 : fc < 1200 ? 1 : fc < 5000 ? 2 : 3;
  }
  const gN = new Float32Array(4); for (let b = 0; b < NBO; b++) gN[grp[b]]++;
  const L1 = new Float32Array(NBO), L2 = new Float32Array(NBO), Lc = new Float32Array(NBO);
  const G = [new Float32Array(n), new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  const rms = new Float32Array(n);
  // pitch classes for a cheap chroma (330 Hz .. 2 kHz), used to find chord changes on downbeats
  const pcBin = new Int8Array(N / 2).fill(-1);
  for (let k = 1; k < N / 2; k++) { const fq = (k * sr) / N; if (fq < 300 || fq > 2100) continue; pcBin[k] = (((Math.round(69 + 12 * Math.log2(fq / 440))) % 12) + 12) % 12; }
  const chromaF = new Float32Array(n * 12);
  for (let f = 0; f < n; f++) {
    const c = f * H, s0 = c - N / 2;
    let e2 = 0;
    for (let i = 0; i < N; i++) { const j = s0 + i; const v = j >= 0 && j < x.length ? x[j] * gain : 0; re[rev[i]] = v * win[i]; im[rev[i]] = 0; if (i >= N / 4 && i < (3 * N) / 4) e2 += v * v; }
    rms[f] = Math.sqrt(e2 / (N / 2));
    for (let size = 2; size <= N; size <<= 1) {
      const half = size >> 1, step = N / size;
      for (let i = 0; i < N; i += size) for (let j = 0, k = 0; j < half; j++, k += step) {
        const a = i + j, b = a + half;
        const tr = re[b] * cs[k] - im[b] * sn[k], ti = re[b] * sn[k] + im[b] * cs[k];
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
    for (let b = 0; b < NBO; b++) {
      let s = 0; for (let k = ed[b]; k < ed[b + 1]; k++) s += re[k] * re[k] + im[k] * im[k];
      Lc[b] = Math.log(1 + Math.sqrt(s / (ed[b + 1] - ed[b])));
    }
    if (f >= 2) for (let b = 0; b < NBO; b++) { const d = Lc[b] - L2[b]; if (d > 0) G[grp[b]][f] += d; }
    for (let b = 0; b < NBO; b++) { L2[b] = L1[b]; L1[b] = Lc[b]; }
    const o12 = f * 12; let tot = 0;
    for (let k = 14; k < 100; k++) { const p = pcBin[k]; if (p < 0) continue; const m = Math.sqrt(re[k] * re[k] + im[k] * im[k]); chromaF[o12 + p] += m; tot += m; }
    if (tot > 1e-6) for (let q = 0; q < 12; q++) chromaF[o12 + q] /= tot;
  }
  for (let g = 0; g < 4; g++) { const a = G[g]; for (let f = 0; f < n; f++) a[f] /= gN[g] || 1; }
  // each group scaled by a robust spread so no single group dominates, then a weighted sum is the onset envelope
  const pct = (a, p) => { const s = []; const st = Math.max(1, Math.floor(a.length / 6000)); for (let i = 0; i < a.length; i += st) s.push(a[i]); s.sort((u, v) => u - v); return s[Math.min(s.length - 1, Math.floor(p * s.length))] || 0; };
  const gs = G.map((a) => pct(a, 0.95) || 1e-6);
  const W8 = [1.0, 0.7, 0.55, 0.15];
  const o = new Float32Array(n);
  for (let f = 0; f < n; f++) { let s = 0; for (let g = 0; g < 4; g++) s += (W8[g] * G[g][f]) / gs[g]; o[f] = s; }
  // remove the slowly varying floor (sustained parts) so only rises count
  const oD = new Float32Array(n);
  { const R2 = Math.round(fps * 0.35); let acc = 0; const q = [];
    for (let f = 0; f < n; f++) { acc += o[f]; q.push(o[f]); if (q.length > 2 * R2 + 1) acc -= q.shift(); }
    // centred moving average
    const pre = new Float64Array(n + 1); for (let f = 0; f < n; f++) pre[f + 1] = pre[f] + o[f];
    for (let f = 0; f < n; f++) { const a = Math.max(0, f - R2), b = Math.min(n, f + R2 + 1); const m = (pre[b] - pre[a]) / (b - a); oD[f] = Math.max(0, o[f] - m * 0.85); }
  }
  // silence (relative to the loudest part) — no beats there
  let rmax = 1e-6; for (let f = 0; f < n; f++) if (rms[f] > rmax) rmax = rms[f];
  const live = new Uint8Array(n); for (let f = 0; f < n; f++) live[f] = rms[f] > rmax * 0.012 ? 1 : 0;

  // ---------- tempo ----------
  const lagMin = Math.floor((60 * fps) / 230), lagMax = Math.ceil((60 * fps) / 42);
  let om = 0; for (let f = 0; f < n; f++) om += oD[f]; om /= n;
  const oz = new Float32Array(n); for (let f = 0; f < n; f++) oz[f] = oD[f] - om;
  const ac = new Float32Array(lagMax + 2);
  for (let L = lagMin; L <= lagMax + 1; L++) { let s = 0; for (let f = L; f < n; f++) s += oz[f] * oz[f - L]; ac[L] = s / (n - L); }
  const cands = [];
  for (let L = lagMin + 1; L <= lagMax; L++) if (ac[L] > ac[L - 1] && ac[L] >= ac[L + 1] && ac[L] > 0) {
    const y0 = ac[L - 1], y1 = ac[L], y2 = ac[L + 1], den = y0 - 2 * y1 + y2;
    const off = den ? Math.max(-0.5, Math.min(0.5, (0.5 * (y0 - y2)) / den)) : 0;
    cands.push({ P: L + off, a: y1 });
  }
  cands.sort((p, q) => q.a - p.a);
  const pool = [];
  const addP = (P) => { const bpm = (60 * fps) / P; if (bpm < 52 || bpm > 215) return; if (pool.some((q) => Math.abs(q - P) / P < 0.015)) return; pool.push(P); };
  for (const c of cands.slice(0, 7)) { addP(c.P); addP(c.P * 2); addP(c.P / 2); addP(c.P * 1.5); addP(c.P / 1.5); }
  // how well a steady pulse at period P lines up with the onsets: best phase per 8-second window, averaged
  const Wf = Math.round(fps * 8), Hf = Math.round(fps * 4);
  function fit(P) {
    let tot = 0, cnt = 0;
    for (let w0 = 0; w0 + Wf <= n || (w0 === 0 && n > P * 4); w0 += Hf) {
      const w1 = Math.min(n, w0 + Wf); let mw = 0; for (let f = w0; f < w1; f++) mw += oD[f]; mw /= w1 - w0;
      if (mw < 1e-4) { if (w1 >= n) break; continue; }
      let best = 0;
      for (let ph = 0; ph < P; ph += 1) {
        let s = 0, c = 0;
        for (let t = w0 + ph; t < w1 - 1; t += P) { const i = Math.round(t); const v = Math.max(oD[i], i > 0 ? oD[i - 1] * 0.7 : 0, oD[i + 1] * 0.7); s += v; c++; }
        if (c && s / c > best) best = s / c;
      }
      tot += best / mw; cnt++;
      if (w1 >= n) break;
    }
    return cnt ? tot / cnt : 0;
  }
  let bestP = 0, bestS = -1, bestF = 0;
  for (const P of pool) {
    const bpm = (60 * fps) / P;
    const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 116) / 0.8, 2));
    const F = fit(P);
    const S = Math.pow(F, 2) * prior;
    if (S > bestS) { bestS = S; bestP = P; bestF = F; }
  }
  if (!bestP) bestP = (60 * fps) / 112;
  // a finer period: try ±2 % around the winner
  { let bp = bestP, bf = fit(bestP); for (let k = -8; k <= 8; k++) { if (!k) continue; const P = bestP * (1 + k * 0.0025); const F = fit(P); if (F > bf * 1.004) { bf = F; bp = P; } } bestP = bp; }
  const P = bestP;

  // ---------- beat tracking (dynamic programming, after Ellis 2007) ----------
  let osd = 0; for (let f = 0; f < n; f++) osd += oD[f] * oD[f]; osd = Math.sqrt(osd / n) || 1;
  const J = Math.round(P), sg = P / 32, gw = new Float32Array(2 * J + 1);
  for (let j = -J; j <= J; j++) gw[j + J] = Math.exp(-0.5 * (j / sg) * (j / sg));
  const loc = new Float32Array(n);
  for (let f = 0; f < n; f++) { let s = 0; const a = Math.max(-J, -f), b = Math.min(J, n - 1 - f); for (let j = a; j <= b; j++) s += oD[f + j] * gw[j + J]; loc[f] = s / osd; }
  const lo = Math.round(2 * P), hi = Math.max(1, Math.round(P / 2)), tight = 120;
  const pen = new Float32Array(lo + 1); for (let d = hi; d <= lo; d++) pen[d] = -tight * Math.pow(Math.log(d / P), 2);
  const cum = new Float32Array(n), back = new Int32Array(n).fill(-1);
  let lmax = 0; for (let f = 0; f < n; f++) if (loc[f] > lmax) lmax = loc[f];
  let first = true;
  for (let f = 0; f < n; f++) {
    let best = -1e30, arg = -1;
    for (let d = hi; d <= lo; d++) { const t = f - d; const v = (t >= 0 ? cum[t] : 0) + pen[d]; if (v > best) { best = v; arg = t; } }
    cum[f] = loc[f] + best;
    if (first && loc[f] < 0.01 * lmax) back[f] = -1; else { back[f] = arg >= 0 ? arg : -1; first = false; }
  }
  // last beat: the last local maximum of the running score that is not weak
  const mx = []; for (let f = 1; f < n - 1; f++) if (cum[f] > cum[f - 1] && cum[f] >= cum[f + 1]) mx.push(f);
  let tail = n - 1;
  if (mx.length) { const vs = mx.map((f) => cum[f]).sort((a, b) => a - b); const med = vs[vs.length >> 1]; for (let i = mx.length - 1; i >= 0; i--) if (cum[mx[i]] * 2 > med) { tail = mx[i]; break; } }
  let bf = []; for (let f = tail; f >= 0; f = back[f]) { bf.push(f); if (back[f] < 0) break; }
  bf.reverse();
  // extend the grid through the edges at the local tempo while there is sound, drop beats in silence
  const ibi = (arr, from, k) => { const d = []; for (let i = Math.max(1, from); i < Math.min(arr.length, from + k); i++) d.push(arr[i] - arr[i - 1]); d.sort((a, b) => a - b); return d.length ? d[d.length >> 1] : P; };
  if (bf.length > 2) {
    const pe = ibi(bf, bf.length - 8, 8); for (let t = bf[bf.length - 1] + pe; t < n - 1; t += pe) bf.push(Math.round(t));
    const ps = ibi(bf, 1, 8); const pre = []; for (let t = bf[0] - ps; t >= 0; t -= ps) pre.push(Math.round(t)); bf = pre.reverse().concat(bf);
  }
  // snap each beat onto the onset peak right next to it (±2 frames), sub-frame by a parabola
  const liveNear = (f) => { for (let k = -Math.round(P / 2); k <= Math.round(P / 2); k++) { const i = f + k; if (i >= 0 && i < n && live[i]) return true; } return false; };
  const beatsF = [];
  for (const f0 of bf) {
    if (!liveNear(f0)) continue;
    let f = f0; for (let k = -2; k <= 2; k++) { const i = f0 + k; if (i > 0 && i < n - 1 && oD[i] > oD[f]) f = i; }
    let off = 0; if (f > 0 && f < n - 1) { const y0 = oD[f - 1], y1 = oD[f], y2 = oD[f + 1], den = y0 - 2 * y1 + y2; if (den < 0) off = Math.max(-0.5, Math.min(0.5, (0.5 * (y0 - y2)) / den)); }
    beatsF.push(f + off);
  }
  // most produced music sits on a fixed grid: when the tracked beats fit one steady line (fit from the middle of the
  // song outwards, off-beat stretches rejected), use that line everywhere — the intro and breaks then keep the groove's
  // phase instead of drifting onto off-beat hats
  {
    const m = beatsF.length;
    if (m > 24) {
      const k = new Float64Array(m); k[0] = 0;
      let p0 = P; { const d = []; for (let i = 1; i < m; i++) d.push(beatsF[i] - beatsF[i - 1]); d.sort((a, b) => a - b); p0 = d[d.length >> 1]; }
      for (let i = 1; i < m; i++) k[i] = k[i - 1] + Math.max(1, Math.round((beatsF[i] - beatsF[i - 1]) / p0));
      let use = new Uint8Array(m); for (let i = Math.floor(m * 0.25); i < Math.ceil(m * 0.75); i++) use[i] = 1;
      let a = 0, q = p0, good = 0, rms = 1e9;
      for (let it = 0; it < 4; it++) {
        let sw = 0, sk = 0, st = 0, skk = 0, skt = 0;
        for (let i = 0; i < m; i++) if (use[i]) { sw++; sk += k[i]; st += beatsF[i]; skk += k[i] * k[i]; skt += k[i] * beatsF[i]; }
        const den = sw * skk - sk * sk; if (sw < 8 || !den) break;
        q = (sw * skt - sk * st) / den; a = (st - q * sk) / sw;
        good = 0; let ss = 0;
        for (let i = 0; i < m; i++) { const r = beatsF[i] - (a + k[i] * q); const ok = Math.abs(r) < 0.12 * q; use[i] = ok ? 1 : 0; if (ok) { good++; ss += r * r; } }
        rms = good ? Math.sqrt(ss / good) : 1e9;
      }
      if (good >= m * 0.72 && rms < 0.035 * q && Math.abs(q / P - 1) < 0.08) {
        let f0 = 0; while (f0 < n && !live[f0]) f0++;
        let f1 = n - 1; while (f1 > 0 && !live[f1]) f1--;
        const kA = Math.ceil((f0 - a) / q - 0.15), kB = Math.floor((f1 - a) / q);
        beatsF.length = 0;
        for (let kk = kA; kk <= kB; kk++) { const f = a + kk * q; if (f >= 0 && f < n) beatsF.push(f); }
      }
    }
  }
  const nb = beatsF.length;
  // ---------- accents, downbeats ----------
  const near = (a, f, r) => { let m = 0; const c = Math.round(f); for (let k = -r; k <= r; k++) { const i = c + k; if (i >= 0 && i < n && a[i] > m) m = a[i]; } return m; };
  const acc = new Float32Array(nb), kk = new Float32Array(nb), hc = new Float32Array(nb), lvB = new Float32Array(nb);
  for (let i = 0; i < nb; i++) {
    const f = beatsF[i]; acc[i] = near(oD, f, 2); kk[i] = near(G[0], f, 2) / gs[0];
    const a = Math.round(i > 0 ? beatsF[i - 1] : f - P), b = Math.round(f), c = Math.round(i < nb - 1 ? beatsF[i + 1] : f + P);
    const ca = new Float32Array(12), cb = new Float32Array(12);
    for (let t = Math.max(0, a); t < Math.min(n, b); t++) for (let q = 0; q < 12; q++) ca[q] += chromaF[t * 12 + q];
    for (let t = Math.max(0, b); t < Math.min(n, c); t++) for (let q = 0; q < 12; q++) cb[q] += chromaF[t * 12 + q];
    let d = 0, na = 0, nb2 = 0; for (let q = 0; q < 12; q++) { d += ca[q] * cb[q]; na += ca[q] * ca[q]; nb2 += cb[q] * cb[q]; }
    hc[i] = na > 0 && nb2 > 0 ? 1 - d / Math.sqrt(na * nb2) : 0;
    lvB[i] = near(rms, f, 3) / rmax;
  }
  const z = (a) => { let m = 0, s = 0; for (const v of a) m += v; m /= a.length || 1; for (const v of a) s += (v - m) * (v - m); s = Math.sqrt(s / (a.length || 1)) || 1; return Array.from(a, (v) => (v - m) / s); };
  const zk = z(kk), zh = z(hc), za = z(acc);
  let phase = 0, pbest = -1e9;
  for (let p = 0; p < 4; p++) { let s = 0, c = 0; for (let i = p; i < nb; i += 4) { s += zk[i] * 0.8 + zh[i] * 1.0 + za[i] * 0.4; c++; } s /= c || 1; if (s > pbest) { pbest = s; phase = p; } }
  const bpos = new Uint8Array(nb); for (let i = 0; i < nb; i++) bpos[i] = (((i - phase) % 4) + 4) % 4;
  // accent: the onset at the beat against the beats around it, softened in quiet passages; downbeats a little stronger
  const conf = Math.max(0, Math.min(1, (bestF - 2.5) / 5));
  const str = new Uint8Array(nb);
  for (let i = 0; i < nb; i++) {
    const w = []; for (let k = Math.max(0, i - 8); k < Math.min(nb, i + 9); k++) w.push(acc[k]); w.sort((a, b) => a - b);
    const ref = w[Math.floor(w.length * 0.85)] || 1e-6;
    const a = Math.min(1, acc[i] / ref);
    let s = (0.42 + 0.58 * a) * (0.55 + 0.45 * Math.min(1, lvB[i] * 1.6));
    if (bpos[i] === 0) s = Math.min(1, s + 0.12);
    s *= 0.45 + 0.55 * conf;
    str[i] = Math.round(Math.max(0.2, Math.min(1, s)) * 255);
  }
  // ---------- drum-like hits per band group ----------
  function hits(a, scale, waitS, delta) {
    const out = [], st = []; const wait = Math.round(fps * waitS); let last = -1e9;
    const pre = new Float64Array(n + 1); for (let f = 0; f < n; f++) pre[f + 1] = pre[f] + a[f];
    for (let f = 3; f < n - 3; f++) {
      const v = a[f]; if (v <= a[f - 1] || v < a[f + 1] || v < a[f - 2] || v < a[f + 2] || v < a[f - 3] || v < a[f + 3]) continue;
      const lo2 = Math.max(0, f - 12), hi2 = Math.min(n, f + 8); const m = (pre[hi2] - pre[lo2]) / (hi2 - lo2);
      if (v < m * 1.25 + delta * scale || f - last < wait) continue;
      out.push(f); st.push(v / scale); last = f;
    }
    // strength against the hits around it
    const S = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) { const w = []; for (let k = Math.max(0, i - 16); k < Math.min(out.length, i + 17); k++) w.push(st[k]); w.sort((p, q) => p - q); const ref = w[Math.floor(w.length * 0.9)] || 1e-6; S[i] = Math.round(Math.min(1, Math.max(0.15, st[i] / ref)) * 255); }
    return [out, S];
  }
  const [kf, ks] = hits(G[0], gs[0], 0.11, 0.35), [sf, ss] = hits(G[2], gs[2], 0.1, 0.3), [hf, hs] = hits(G[3], gs[3], 0.07, 0.25), [tf, tns] = hits(G[1], gs[1], 0.11, 0.35);
  const toT = (fr) => Float32Array.from(fr, (f) => (f * H) / sr);
  // tempo as heard: the median gap between the tracked beats
  let bpm = (60 * fps) / P;
  if (nb > 8) { const d = []; for (let i = 1; i < nb; i++) d.push(beatsF[i] - beatsF[i - 1]); d.sort((a, b) => a - b); bpm = (60 * fps) / d[d.length >> 1]; }
  return {
    bpm: Math.round(bpm * 10) / 10, conf: Math.round(conf * 100) / 100, fit: bestF,
    beats: Float32Array.from(beatsF, (f) => (f * H) / sr), str, bpos,
    kicks: toT(kf), kickS: ks, snares: toT(sf), snareS: ss, hats: toT(hf), hatS: hs, tones: toT(tf), toneS: tns,
  };
}

function analyzeCore(x, sr, fps) {
  const N = 1024, NB = 32, NW = 48, hop = sr / fps;
  const frames = Math.max(1, Math.floor(x.length / hop));
  const bits = Math.round(Math.log2(N));
  const rev = new Uint16Array(N);
  for (let i = 0; i < N; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
  const cs = new Float32Array(N / 2), sn = new Float32Array(N / 2);
  for (let i = 0; i < N / 2; i++) { cs[i] = Math.cos((-2 * Math.PI * i) / N); sn[i] = Math.sin((-2 * Math.PI * i) / N); }
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const re = new Float32Array(N), im = new Float32Array(N);
  const fmin = 35, fmax = Math.min(11000, sr / 2 - 1);
  const edges = new Int32Array(NB + 1);
  for (let b = 0; b <= NB; b++) edges[b] = Math.max(1, Math.round((fmin * Math.pow(fmax / fmin, b / NB) * N) / sr));
  for (let b = 1; b <= NB; b++) if (edges[b] <= edges[b - 1]) edges[b] = edges[b - 1] + 1;
  for (let b = 0; b <= NB; b++) edges[b] = Math.min(edges[b], N / 2);

  let peak = 1e-6;
  for (let i = 0; i < x.length; i += 3) { const a = x[i] < 0 ? -x[i] : x[i]; if (a > peak) peak = a; }
  const db = new Float32Array(frames * NB), lv = new Float32Array(frames);
  const wave = new Int8Array(frames * NW);
  const cen = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    const c = Math.floor(f * hop), s0 = c - N / 2;
    let e2 = 0;
    for (let i = 0; i < N; i++) { const j = s0 + i; const v = j >= 0 && j < x.length ? x[j] : 0; re[rev[i]] = v * win[i]; im[rev[i]] = 0; e2 += v * v; }
    for (let size = 2; size <= N; size <<= 1) {
      const half = size >> 1, step = N / size;
      for (let i = 0; i < N; i += size) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const a = i + j, b = a + half;
          const tr = re[b] * cs[k] - im[b] * sn[k], ti = re[b] * sn[k] + im[b] * cs[k];
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        }
      }
    }
    for (let b = 0; b < NB; b++) {
      let s = 0, n = 0;
      for (let k = edges[b]; k < edges[b + 1]; k++) { s += re[k] * re[k] + im[k] * im[k]; n++; }
      const mag = Math.sqrt(s / (n || 1));
      db[f * NB + b] = 20 * Math.log10(mag + 1e-7) + b * 0.78;
    }
    lv[f] = Math.sqrt(e2 / N);
    // brightness: the spectral centroid of this frame
    { let sw = 0, sm = 0; for (let k = 2; k < N / 2; k++) { const m = Math.sqrt(re[k] * re[k] + im[k] * im[k]); sw += m * k; sm += m; } cen[f] = sm > 1e-6 ? (sw / sm) * (sr / N) : 0; }
    const W = 384, ws = c - W / 2, st = W / NW;
    for (let i = 0; i < NW; i++) { const j = Math.floor(ws + i * st); const v = j >= 0 && j < x.length ? x[j] / peak : 0; wave[f * NW + i] = Math.max(-127, Math.min(127, Math.round(v * 127))); }
  }
  // spectrum: map dB to 0..255 against this song's own loudness
  const sample = [];
  for (let i = 0; i < db.length; i += Math.max(1, Math.floor(db.length / 24000))) sample.push(db[i]);
  sample.sort((a, b) => a - b);
  const top = sample[Math.floor(sample.length * 0.985)] + 3, range = 50, floor = top - range;
  const bands = new Uint8Array(frames * NB);
  for (let i = 0; i < db.length; i++) { const v = Math.max(0, Math.min(1, (db[i] - floor) / range)); bands[i] = Math.round(Math.pow(v, 1.35) * 255); }
  // loudness
  let lmax = 1e-6; for (let f = 0; f < frames; f++) if (lv[f] > lmax) lmax = lv[f];
  const level = new Uint8Array(frames); let esum = 0;
  for (let f = 0; f < frames; f++) { const d2 = 20 * Math.log10(lv[f] / lmax + 1e-6); const v = Math.max(0, Math.min(1, (d2 + 36) / 36)); level[f] = Math.round(v * 255); esum += v; }
  const energy = esum / frames;
  const bt = beatCore(x, sr);
  // key: a 12-note chroma from a longer FFT (fine enough to tell notes apart), matched against the Krumhansl profiles
  let key = -1, minor = false, keyConf = 0;
  {
    const N2 = 4096, b2 = 12, rv = new Uint16Array(N2);
    for (let i = 0; i < N2; i++) { let r = 0; for (let b = 0; b < b2; b++) r |= ((i >> b) & 1) << (b2 - 1 - b); rv[i] = r; }
    const c2 = new Float32Array(N2 / 2), s2 = new Float32Array(N2 / 2), w2 = new Float32Array(N2), R2 = new Float32Array(N2), I2 = new Float32Array(N2);
    for (let i = 0; i < N2 / 2; i++) { c2[i] = Math.cos((-2 * Math.PI * i) / N2); s2[i] = Math.sin((-2 * Math.PI * i) / N2); }
    for (let i = 0; i < N2; i++) w2[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N2 - 1));
    const pc = new Int8Array(N2 / 2).fill(-1), pw = new Float32Array(N2 / 2);
    for (let k = 1; k < N2 / 2; k++) { const fq = (k * sr) / N2; if (fq < 60 || fq > 2100) continue; const mi = 69 + 12 * Math.log2(fq / 440); pc[k] = ((Math.round(mi) % 12) + 12) % 12; pw[k] = 1 - Math.min(1, Math.abs(mi - Math.round(mi)) * 1.6); }
    const chroma = new Float64Array(12), one = new Float64Array(12);
    const stepF = Math.max(1, Math.round(fps / 6));
    for (let f = 0; f < frames; f += stepF) {
      const c = Math.floor(f * hop), s0 = c - N2 / 2;
      for (let i = 0; i < N2; i++) { const j = s0 + i; R2[rv[i]] = (j >= 0 && j < x.length ? x[j] : 0) * w2[i]; I2[rv[i]] = 0; }
      for (let size = 2; size <= N2; size <<= 1) {
        const half = size >> 1, step = N2 / size;
        for (let i = 0; i < N2; i += size) for (let j = 0, k = 0; j < half; j++, k += step) {
          const a = i + j, b = a + half, tr = R2[b] * c2[k] - I2[b] * s2[k], ti = R2[b] * s2[k] + I2[b] * c2[k];
          R2[b] = R2[a] - tr; I2[b] = I2[a] - ti; R2[a] += tr; I2[a] += ti;
        }
      }
      one.fill(0); let tot = 0;
      for (let k = 1; k < N2 / 2; k++) if (pc[k] >= 0) { const m = Math.sqrt(R2[k] * R2[k] + I2[k] * I2[k]) * pw[k]; one[pc[k]] += m; tot += m; }
      if (tot > 1e-4) for (let q = 0; q < 12; q++) chroma[q] += one[q] / tot;
    }
    const MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], MIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
    const corr = (prof, t0) => { let ma = 0, mb = 0; for (let q = 0; q < 12; q++) { ma += chroma[(q + t0) % 12]; mb += prof[q]; } ma /= 12; mb /= 12; let n = 0, da = 0, db2 = 0; for (let q = 0; q < 12; q++) { const a = chroma[(q + t0) % 12] - ma, b = prof[q] - mb; n += a * b; da += a * a; db2 += b * b; } return da > 0 ? n / Math.sqrt(da * db2) : 0; };
    let best = -2, second = -2;
    for (let t0 = 0; t0 < 12; t0++) for (const mn of [false, true]) { const c = corr(mn ? MIN : MAJ, t0); if (c > best) { second = best; best = c; key = t0; minor = mn; } else if (c > second) second = c; }
    keyConf = Math.max(0, Math.min(1, (best - second) * 4 + (best - 0.5)));
    if (best < 0.3) key = -1;
  }
  // loudness (dB of the average level while something is playing), brightness, attack, how steady the beat is
  let ls = 0, ln = 0, csum = 0, cnum = 0;
  for (let f = 0; f < frames; f++) { if (lv[f] > 0.003) { ls += lv[f] * lv[f]; ln++; } if (cen[f] > 0 && lv[f] > 0.003) { csum += cen[f]; cnum++; } }
  const loud = ln ? Math.round(20 * Math.log10(Math.sqrt(ls / ln)) * 10) / 10 : -60;
  const bright = cnum ? Math.round(csum / cnum) : 0;
  // drum impact: how far the beats stand out from everything else (a clean drum groove ≈ 1, ambient ≈ 0)
  const punch = Math.round(Math.max(0, Math.min(1, (bt.fit - 2) / 12)) * 1000) / 1000;
  const ov = new Uint8Array(240);
  const seg = Math.max(1, Math.floor(x.length / 240));
  for (let i = 0; i < 240; i++) { let mx = 0; const o = i * seg; for (let j = 0; j < seg && o + j < x.length; j += 2) { const a = x[o + j] < 0 ? -x[o + j] : x[o + j]; if (a > mx) mx = a; } ov[i] = Math.round(Math.min(1, mx / peak) * 255); }
  return {
    v: 3, fps, frames, bands, level, wave, energy, overview: ov, duration: x.length / sr, key, minor, keyConf, loud, bright, punch,
    bpm: bt.bpm, conf: bt.conf, beats: bt.beats, beatStr: bt.str, bpos: bt.bpos,
    kicks: bt.kicks, kickS: bt.kickS, snares: bt.snares, snareS: bt.snareS, hats: bt.hats, hatS: bt.hatS, tones: bt.tones, toneS: bt.toneS,
  };
}

R.analysis = (() => {
  const SR = 22050, FPS = 30, AV = 3;
  const stale = (t) => !!t && t.an === 1 && (t.av || 1) < AV;
  const cache = new Map();
  const queue = [];
  let busy = false, running = false, worker = null, wfail = false, seq = 0;
  const pending = new Map();

  function getWorker() {
    if (worker || wfail) return worker;
    try {
      const src = beatCore.toString() + '\n' + analyzeCore.toString() + '\nself.onmessage=function(e){var d=e.data;try{var r=analyzeCore(d.x,d.sr,d.fps);self.postMessage({n:d.n,r:r},[r.bands,r.level,r.wave,r.beats,r.beatStr,r.overview,r.bpos,r.kicks,r.kickS,r.snares,r.snareS,r.hats,r.hatS,r.tones,r.toneS].map(function(a){return a.buffer;}));}catch(err){self.postMessage({n:d.n,error:String(err)});}};';
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      worker = new Worker(url);
      worker.onmessage = (e) => { const p = pending.get(e.data.n); if (!p) return; pending.delete(e.data.n); if (e.data.error) p.rej(new Error(e.data.error)); else p.res(e.data.r); };
      worker.onerror = (e) => { console.warn('analysis worker failed', e.message); wfail = true; worker = null; for (const p of pending.values()) p.rej(new Error('worker')); pending.clear(); };
    } catch (e) { wfail = true; worker = null; }
    return worker;
  }
  function measure(x) {
    const w = getWorker();
    if (!w) return new Promise((res) => setTimeout(() => res(analyzeCore(x, SR, FPS)), 30));
    return new Promise((res, rej) => { const n = ++seq; pending.set(n, { res, rej }); w.postMessage({ n, x, sr: SR, fps: FPS }, [x.buffer]); });
  }

  function decode(buf) {
    const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AC) return Promise.reject(new Error('no audio decoder'));
    let ctx, rate = SR;
    try { ctx = new AC(1, 2, SR); } catch (e) { rate = 44100; ctx = new AC(1, 2, 44100); }
    return new Promise((res, rej) => {
      let done = false;
      const ok = (b) => { if (!done) { done = true; res({ b, rate }); } };
      const no = (e) => { if (!done) { done = true; rej(e || new Error('decode failed')); } };
      try { const p = ctx.decodeAudioData(buf, ok, no); if (p && p.then) p.then(ok, no); } catch (e) { no(e); }
    });
  }

  const retry = (t) => !!t && t.an === -1 && (t.afv || 0) < AV;
  async function run(id) {
    const t = R.lib.get(id);
    if (!t || (t.an && !stale(t) && !retry(t))) return;
    const lim = R.isIOS ? 15 * 60 : 40 * 60;
    if (t.duration && t.duration > lim) { await R.lib.update(id, { an: 2 }); return; }
    let raw;
    try { raw = await R.db.getAudioRaw(id); } catch (e) { if (e && e.lost) { await R.lib.update(id, { lost: 1 }); return; } throw e; }
    if (!raw) return;
    let dec;
    try { dec = await decode(raw.buf); }
    catch (e) { console.warn('decode failed', t.title, e); await R.lib.update(id, { an: -1, afv: AV }); R.bus.emit('analysis', id); return; }
    const { b, rate } = dec;
    if (b.duration > lim) { await R.lib.update(id, { an: 2, duration: b.duration }); return; }
    const n = b.length, ch = b.numberOfChannels;
    const step = rate === SR ? 1 : 2;
    const m = Math.floor(n / step);
    const x = new Float32Array(m);
    for (let c = 0; c < ch; c++) {
      const d = b.getChannelData(c);
      if (step === 1) for (let i = 0; i < m; i++) x[i] += d[i];
      else for (let i = 0; i < m; i++) x[i] += (d[2 * i] + d[2 * i + 1]) * 0.5;
    }
    if (ch > 1) for (let i = 0; i < m; i++) x[i] /= ch;
    const dur = b.duration;
    const r = await measure(x);
    await R.db.put('analysis', r, id);
    cache.set(id, r); trim();
    const patch = { an: 1, av: AV, bpm: r.bpm, energy: Math.round(r.energy * 1000) / 1000, loud: r.loud, bright: r.bright, punch: r.punch, mkey: R.analysis.keyName(r.key, r.minor), kc: Math.round((r.keyConf || 0) * 100) / 100 };
    if (!t.duration || Math.abs(t.duration - dur) > 1.5) patch.duration = dur;
    await R.lib.update(id, patch);
    R.bus.emit('analysis', id);
  }
  function trim() { while (cache.size > 5) cache.delete(cache.keys().next().value); }

  // Decoding is heavy. With the screen off (lock-screen listening) it would drain the battery, and iOS may stop a page
  // that works hard in the background, music included. So it waits for the screen, and for an import to finish.
  const shown = () => new Promise((res) => {
    const f = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', f); res(); } };
    document.addEventListener('visibilitychange', f);
  });
  async function pump() {
    if (busy) return;
    busy = true;
    try {
      while (queue.length) {
        if (document.hidden) await shown();
        while (R.lib.importing()) await R.sleep(500);
        if (!queue.length) break;
        const id = queue.shift(); inQ.delete(id);
        R.bus.emit('analysis:progress', { left: queue.length + 1 });
        running = true;
        try { await run(id); } catch (e) { console.warn('analysis', e); try { await R.lib.update(id, { an: -1, afv: AV }); } catch (e2) { /* ignore */ } }
        running = false;
        await R.sleep(60);
      }
    } finally { busy = false; R.bus.emit('analysis:progress', { left: 0 }); }
  }
  const inQ = new Set();
  function enqueue(id, front) {
    if (inQ.has(id)) { if (front) { queue.splice(queue.indexOf(id), 1); queue.unshift(id); } return; }
    inQ.add(id);
    if (front) queue.unshift(id); else queue.push(id);
    setTimeout(pump, 50);
  }
  function resume() {
    for (const t of R.lib.all()) if (!t.an) enqueue(t.id);
    // songs measured by an older version get the new measurements (beat grid, key, loudness …) after the new songs;
    // a song that could not be decoded gets one more try with each new version
    for (const t of R.lib.all()) if (stale(t)) enqueue(t.id);
    for (const t of R.lib.all()) if (retry(t)) enqueue(t.id);
  }
  // musical key: 'Am', 'E♭' … ; Chinese name; Camelot wheel code (8A, 8B …)
  const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  function keyName(k, mn) { return k == null || k < 0 ? '' : NOTE[k] + (mn ? 'm' : ''); }
  function keyInfo(mkey) {
    const m = /^([A-G][♯♭]?)(m?)$/.exec(mkey || ''); if (!m) return null;
    const k = NOTE.indexOf(m[1]); if (k < 0) return null;
    const minor = !!m[2], maj = minor ? (k + 3) % 12 : k;
    const cam = (((maj * 7) % 12) + 7) % 12 + 1;
    return { k, minor, zh: NOTE[k] + (minor ? ' 小調' : ' 大調'), camelot: cam + (minor ? 'A' : 'B') };
  }
  async function get(id) {
    if (cache.has(id)) return cache.get(id);
    const r = await R.db.get('analysis', id).catch(() => null);
    if (r) { cache.set(id, r); trim(); }
    return r || null;
  }
  const left = () => queue.length + (running ? 1 : 0);
  return { enqueue, resume, get, left, core: analyzeCore, beats: beatCore, stale, keyName, keyInfo, AV };
})();
