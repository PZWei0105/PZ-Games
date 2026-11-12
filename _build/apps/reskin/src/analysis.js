/* ===================== rhythm & spectrum analysis (done once per song, stored) =====================
   The player never routes music through Web Audio (on iPhone that can silence playback in the
   background). Instead every song is decoded once, measured here, and the visuals read these
   numbers back in sync with the playback clock. */
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
  const db = new Float32Array(frames * NB), lv = new Float32Array(frames), flux = new Float32Array(frames);
  const wave = new Int8Array(frames * NW);
  const prev = new Float32Array(NB);
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
    let fl = 0;
    for (let b = 0; b < NB; b++) {
      let s = 0, n = 0;
      for (let k = edges[b]; k < edges[b + 1]; k++) { s += re[k] * re[k] + im[k] * im[k]; n++; }
      const mag = Math.sqrt(s / (n || 1));
      db[f * NB + b] = 20 * Math.log10(mag + 1e-7) + b * 0.78;
      if (b < 12) { const d = mag - prev[b]; if (d > 0) fl += d * (b < 5 ? 1.6 : 1); }
      prev[b] = mag;
    }
    flux[f] = fl;
    lv[f] = Math.sqrt(e2 / N);
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
  // onsets: spectral flux above a moving threshold
  let fsum = 0; for (let f = 0; f < frames; f++) fsum += flux[f];
  const fmean = fsum / frames || 1e-6;
  const thr = new Float32Array(frames);
  let acc = 0; const Wn = 14;
  for (let f = 0; f < frames; f++) { acc += flux[f]; if (f >= Wn) acc -= flux[f - Wn]; thr[f] = (acc / Math.min(f + 1, Wn)) * 1.32 + fmean * 0.22; }
  const bt = [], bs = []; let last = -99; const gap = Math.max(2, Math.round(fps * 0.11));
  let smax = 1e-6;
  for (let f = 1; f < frames - 1; f++) { const v = flux[f] - thr[f]; if (v > smax) smax = v; }
  for (let f = 1; f < frames - 1; f++) {
    const v = flux[f] - thr[f];
    if (v > 0 && flux[f] >= flux[f - 1] && flux[f] >= flux[f + 1] && f - last >= gap) {
      const s = Math.min(1, v / (smax * 0.55));
      if (s > 0.08) { bt.push(f / fps); bs.push(Math.round(s * 255)); last = f; }
    }
  }
  // tempo: autocorrelation of a 100 Hz low-end onset envelope
  let bpm = 0;
  {
    const er = 100, blk = Math.max(1, Math.floor(sr / er)), m = Math.floor(x.length / blk);
    if (m > er * 6) {
      const env = new Float32Array(m); let lp = 0, pe = 0; const a = 1 - Math.exp((-2 * Math.PI * 180) / sr);
      for (let k = 0; k < m; k++) {
        let s = 0; const o = k * blk;
        for (let i = 0; i < blk; i++) { lp += a * (x[o + i] - lp); s += lp * lp; }
        const e = Math.sqrt(s / blk); env[k] = Math.max(0, e - pe); pe = e;
      }
      let em = 0; for (let k = 0; k < m; k++) em += env[k]; em /= m;
      for (let k = 0; k < m; k++) env[k] -= em;
      let best = 0, bestL = 0; const n = Math.min(m, er * 90);
      const score = new Float32Array(200);
      for (let L = 30; L <= 90; L++) {
        let s = 0; for (let k = L; k < n; k++) s += env[k] * env[k - L];
        const b = (60 * er) / L; const w = Math.exp(-0.5 * Math.pow(Math.log2(b / 118) / 0.9, 2));
        score[L] = s; const sc = s * w;
        if (sc > best) { best = sc; bestL = L; }
      }
      if (bestL) {
        // refine with a parabola around the peak
        const y0 = score[bestL - 1] || 0, y1 = score[bestL], y2 = score[bestL + 1] || 0;
        const den = y0 - 2 * y1 + y2; const off = den ? (0.5 * (y0 - y2)) / den : 0;
        bpm = (60 * er) / (bestL + Math.max(-0.5, Math.min(0.5, off)));
      }
    }
  }
  const ov = new Uint8Array(240);
  const seg = Math.max(1, Math.floor(x.length / 240));
  for (let i = 0; i < 240; i++) { let mx = 0; const o = i * seg; for (let j = 0; j < seg && o + j < x.length; j += 2) { const a = x[o + j] < 0 ? -x[o + j] : x[o + j]; if (a > mx) mx = a; } ov[i] = Math.round(Math.min(1, mx / peak) * 255); }
  return { fps, frames, bands, level, wave, beats: new Float32Array(bt), beatStr: new Uint8Array(bs), bpm: Math.round(bpm * 10) / 10, energy, overview: ov, duration: x.length / sr };
}

R.analysis = (() => {
  const SR = 22050, FPS = 30;
  const cache = new Map();
  const queue = [];
  let busy = false, running = false, worker = null, wfail = false, seq = 0;
  const pending = new Map();

  function getWorker() {
    if (worker || wfail) return worker;
    try {
      const src = analyzeCore.toString() + '\nself.onmessage=function(e){var d=e.data;try{var r=analyzeCore(d.x,d.sr,d.fps);self.postMessage({n:d.n,r:r},[r.bands.buffer,r.level.buffer,r.wave.buffer,r.beats.buffer,r.beatStr.buffer,r.overview.buffer]);}catch(err){self.postMessage({n:d.n,error:String(err)});}};';
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

  async function run(id) {
    const t = R.lib.get(id);
    if (!t || t.an) return;
    const lim = R.isIOS ? 15 * 60 : 40 * 60;
    if (t.duration && t.duration > lim) { await R.lib.update(id, { an: 2 }); return; }
    const blob = await R.db.getAudio(id);
    if (!blob) return;
    let dec;
    try { dec = await decode(await blob.arrayBuffer()); }
    catch (e) { console.warn('decode failed', t.title, e); await R.lib.update(id, { an: -1 }); R.bus.emit('analysis', id); return; }
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
    const patch = { an: 1, bpm: r.bpm, energy: Math.round(r.energy * 1000) / 1000 };
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
        try { await run(id); } catch (e) { console.warn('analysis', e); try { await R.lib.update(id, { an: -1 }); } catch (e2) { /* ignore */ } }
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
  }
  async function get(id) {
    if (cache.has(id)) return cache.get(id);
    const r = await R.db.get('analysis', id).catch(() => null);
    if (r) { cache.set(id, r); trim(); }
    return r || null;
  }
  const left = () => queue.length + (running ? 1 : 0);
  return { enqueue, resume, get, left, core: analyzeCore };
})();
