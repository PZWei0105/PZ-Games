/* ===================== visual frame: spectrum, waveform, beats — in sync with playback ===================== */
R.viz = (() => {
  const NB = 32, NW = 48;
  const v = {
    NB, NW,
    bands: new Float32Array(NB), peaks: new Float32Array(NB), wave: new Float32Array(NW),
    level: 0, bass: 0, mid: 0, high: 0, beat: 0, kick: 0, beatN: 0, bpm: 0, energy: 0.6, local: 0,
    playing: false, t: 0, dur: 0, progress: 0, synthetic: true, mood: 'idle', moodT: 0, overview: null,
    hot: 0, hotOn: false, hotT: 0, hotSpans: [],
  };
  let data = null, dataId = null, lastT = -1, bi = 0, loadTok = 0;
  const beatFns = new Set();
  const onBeat = (f) => { beatFns.add(f); return () => beatFns.delete(f); };

  // The song's most intense stretches (choruses, drops), found from its loudness curve: a stretch has to stay
  // clearly louder than the song's usual level for at least 6 seconds. Songs that are equally loud throughout get none.
  function hotSpans(r) {
    const L = r.level, fps = r.fps || 30, n = Math.min(r.frames | 0, L ? L.length : 0);
    if (!L || n < fps * 20) return [];
    const half = Math.round(fps * 1.5), pre = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + L[i];
    const E = new Float32Array(n);
    for (let i = 0; i < n; i++) { const a = Math.max(0, i - half), b = Math.min(n, i + half + 1); E[i] = (pre[b] - pre[a]) / (b - a); }
    const sorted = Array.from(E).sort((a, b) => a - b), q = (p) => sorted[Math.min(n - 1, Math.floor(p * n))];
    const med = q(0.5), top = q(0.97);
    if (top - med < 12) return [];
    const thr = Math.max(q(0.78), med + (top - med) * 0.55);
    const spans = []; let s0 = -1;
    for (let i = 0; i <= n; i++) {
      const on = i < n && E[i] >= thr;
      if (on && s0 < 0) s0 = i;
      if (!on && s0 >= 0) { const last = spans[spans.length - 1]; if (last && s0 - last[1] < fps * 2.5) last[1] = i; else spans.push([s0, i]); s0 = -1; }
    }
    return spans.filter(([a, b]) => b - a >= fps * 6 && a > fps * 6).slice(0, 6).map(([a, b]) => [a / fps, b / fps]);
  }

  async function load(id) {
    const my = ++loadTok;
    data = null; dataId = id; v.synthetic = true; v.overview = null; v.hotSpans = [];
    if (!id) return;
    const r = await R.analysis.get(id);
    if (my !== loadTok) return;
    if (r && r.bands && r.frames) {
      data = r; v.synthetic = false; v.bpm = r.bpm || v.bpm; v.energy = r.energy || 0.6; v.overview = r.overview || null;
      if (!r.hot) r.hot = hotSpans(r);
      v.hotSpans = r.hot;
      seekTo(R.player.time());
      R.bus.emit('viz:data', id);
    }
  }
  R.bus.on('track', (t) => { v.bpm = (t && t.bpm) || 0; v.energy = (t && t.energy) || 0.6; load(t && t.id); });
  R.bus.on('analysis', (id) => { if (id === dataId) load(id); });
  R.bus.on('seek', (t) => seekTo(t));

  function seekTo(t) {
    lastT = t;
    if (!data) return;
    const b = data.beats; let lo = 0, hi = b.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (b[m] <= t) lo = m + 1; else hi = m; }
    bi = lo;
  }
  function fire(s) {
    s = Math.min(1.5, s * (1 + v.hot * 0.45)); // in the chorus every beat lands harder
    v.beat = Math.max(v.beat, s);
    if (s > 0.42) v.kick = Math.max(v.kick, s);
    v.beatN++;
    for (const f of beatFns) { try { f(s); } catch (e) { console.error(e); } }
  }

  function synth(t, dt, up, dn) {
    const bpm = v.bpm || 112, bl = 60 / bpm, ph = t / bl, bp = ph - Math.floor(ph);
    if (lastT >= 0 && t > lastT && Math.floor(ph) !== Math.floor(lastT / bl)) fire(Math.floor(ph) % 4 === 0 ? 0.9 : 0.55);
    const env = Math.exp(-bp * 5);
    for (let b = 0; b < NB; b++) {
      const base = 0.62 - b * 0.011 + 0.2 * R.noise1(t * 1.3 + b * 0.37, 3) - 0.1;
      const x = Math.max(0, Math.min(1, base * (0.5 + 0.5 * (b < 8 ? env : R.noise1(t * 4 + b, 7)))));
      v.bands[b] += (x - v.bands[b]) * (x > v.bands[b] ? up : dn);
    }
    for (let w = 0; w < NW; w++) v.wave[w] = Math.sin(w * 0.55 + t * 9) * 0.5 * (0.4 + env * 0.6) + Math.sin(w * 1.7 + t * 23) * 0.18;
    const L = 0.55 + 0.3 * env; v.level += (L - v.level) * (L > v.level ? up : dn);
  }

  function update(dt) {
    const p = R.player;
    const playing = p.isPlaying();
    v.playing = playing;
    const lat = (R.settings.get('latency') || 0) / 1000;
    const t = p.time() + (playing ? 0.035 + lat : 0);
    v.t = t; v.dur = p.duration(); v.progress = v.dur ? Math.min(1, Math.max(0, p.time() / v.dur)) : 0;
    const up = 1 - Math.exp(-dt * 34), dn = 1 - Math.exp(-dt * 7.5);
    if (playing && data) {
      const f = Math.max(0, t) * data.fps; let i0 = Math.floor(f); const fr = f - i0;
      i0 = Math.max(0, Math.min(data.frames - 1, i0)); const i1 = Math.min(data.frames - 1, i0 + 1);
      const B = data.bands;
      for (let b = 0; b < NB; b++) { const x = (B[i0 * NB + b] * (1 - fr) + B[i1 * NB + b] * fr) / 255; v.bands[b] += (x - v.bands[b]) * (x > v.bands[b] ? up : dn); }
      const W = data.wave;
      for (let w = 0; w < NW; w++) v.wave[w] = W[i0 * NW + w] / 127;
      const L = (data.level[i0] * (1 - fr) + data.level[i1] * fr) / 255;
      v.level += (L - v.level) * (L > v.level ? up : dn);
      if (t < lastT - 0.08 || t > lastT + 1.0) seekTo(t);
      const bt = data.beats, bs = data.beatStr;
      while (bi < bt.length && bt[bi] <= t) { if (bt[bi] > lastT - 0.001) fire(bs[bi] / 255); bi++; }
    } else if (playing) {
      synth(t, dt, up, dn);
    } else {
      const k = Math.exp(-dt * 3.2);
      for (let b = 0; b < NB; b++) v.bands[b] *= k;
      for (let w = 0; w < NW; w++) v.wave[w] *= Math.exp(-dt * 6);
      v.level *= Math.exp(-dt * 3);
    }
    lastT = t;
    let s0 = 0, s1 = 0, s2 = 0;
    for (let b = 0; b < 6; b++) s0 += v.bands[b];
    for (let b = 6; b < 18; b++) s1 += v.bands[b];
    for (let b = 18; b < NB; b++) s2 += v.bands[b];
    v.bass = s0 / 6; v.mid = s1 / 12; v.high = s2 / 14;
    for (let b = 0; b < NB; b++) v.peaks[b] = Math.max(v.bands[b], v.peaks[b] - dt * 0.5);
    v.beat *= Math.exp(-dt * 7.5); v.kick *= Math.exp(-dt * 10);
    // chorus / drop: v.hot eases towards 1 inside a hot stretch; 'hot' fires when one starts and ends
    let inHot = false;
    if (playing) for (const [a, b] of v.hotSpans) if (t >= a - 0.12 && t < b) { inHot = true; break; }
    v.hot += ((inHot ? 1 : 0) - v.hot) * (1 - Math.exp(-dt * (inHot ? 5 : 1.6)));
    if (inHot !== v.hotOn) { v.hotOn = inHot; v.hotT = 0; R.bus.emit('hot', inHot); }
    else v.hotT += dt;
    v.local += ((playing ? v.level : 0) - v.local) * (1 - Math.exp(-dt / 2.2));
    let m;
    if (!playing) m = 'idle';
    else {
      const bpm = v.bpm || 110;
      if (bpm < 88 || v.local < 0.42) m = 'sleepy';
      else if (bpm >= 106 && v.local > 0.6) m = 'hype';
      else m = 'groove';
    }
    if (m !== v.mood) { v.moodT += dt; if (v.moodT > (m === 'idle' ? 2.2 : 1.4)) { v.mood = m; v.moodT = 0; R.bus.emit('mood', m); } }
    else v.moodT = 0;
  }
  // beats due in (a, b] of song time, as [time, strength, ...] — for effects that must start early to land on the beat
  function upcoming(a, b, out) {
    out = out || []; out.length = 0;
    if (data && data.beats) {
      const B = data.beats, S = data.beatStr; let lo = 0, hi = B.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (B[m] <= a) lo = m + 1; else hi = m; }
      for (let i = lo; i < B.length && B[i] <= b; i++) out.push(B[i], S[i] / 255);
    } else {
      const bl = 60 / (v.bpm || 112);
      for (let k = Math.floor(a / bl) + 1; k * bl <= b; k++) out.push(k * bl, k % 4 === 0 ? 0.9 : 0.55);
    }
    return out;
  }
  return Object.assign(v, { update, onBeat, upcoming, has: () => !!data });
})();
