/* ===================== visual frame: spectrum, waveform, beats — in sync with playback ===================== */
R.viz = (() => {
  const NB = 32, NW = 48;
  const v = {
    NB, NW,
    bands: new Float32Array(NB), peaks: new Float32Array(NB), wave: new Float32Array(NW),
    level: 0, bass: 0, mid: 0, high: 0, beat: 0, kick: 0, beatN: 0, bpm: 0, energy: 0.6, local: 0,
    playing: false, t: 0, dur: 0, progress: 0, synthetic: true, mood: 'idle', moodT: 0, overview: null,
  };
  let data = null, dataId = null, lastT = -1, bi = 0, loadTok = 0;
  const beatFns = new Set();
  const onBeat = (f) => { beatFns.add(f); return () => beatFns.delete(f); };

  async function load(id) {
    const my = ++loadTok;
    data = null; dataId = id; v.synthetic = true; v.overview = null;
    if (!id) return;
    const r = await R.analysis.get(id);
    if (my !== loadTok) return;
    if (r && r.bands && r.frames) {
      data = r; v.synthetic = false; v.bpm = r.bpm || v.bpm; v.energy = r.energy || 0.6; v.overview = r.overview || null;
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
  return Object.assign(v, { update, onBeat, has: () => !!data });
})();
