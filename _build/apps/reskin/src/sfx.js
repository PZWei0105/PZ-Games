/* ===================== interface sounds (synthesised; never touches the music) ===================== */
R.sfx = (() => {
  let ctx = null, master = null, noise = null, stale = false;
  const vol = () => (R.settings.get('sfxVol') == null ? 0.55 : R.settings.get('sfxVol'));

  function ensure() {
    if (ctx && !stale && ctx.state !== 'closed') {
      if (ctx.state !== 'running') { try { ctx.resume(); } catch (e) { /* ignore */ } }
      return ctx;
    }
    // iPhone home-screen apps can come back from the background with a dead audio context: make a fresh one
    if (ctx) { try { ctx.close(); } catch (e) { /* ignore */ } }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new AC(); } catch (e2) { ctx = null; return null; } }
    stale = false;
    master = ctx.createGain(); master.gain.value = vol() * 0.8; master.connect(ctx.destination);
    noise = null;
    return ctx;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) { /* ignore */ } } }
    else if (R.isIOS && ctx) stale = true;
  });
  R.bus.on('setting', (k) => { if (k === 'sfxVol' && master) master.gain.value = vol() * 0.8; });

  function noiseBuf() {
    if (noise) return noise;
    const n = ctx.sampleRate; noise = ctx.createBuffer(1, n, n); const d = noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return noise;
  }
  function out(pan) {
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(master); return p; }
    return master;
  }
  const S = {
    // oscillator blip with optional pitch glide
    tone(t, o) {
      o = o || {};
      const dur = o.dur || 0.12, g = ctx.createGain(), osc = ctx.createOscillator();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.f || 440, t);
      if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + (o.glide || dur));
      if (o.detune) osc.detune.value = o.detune;
      const a = o.a || 0.004, v = (o.v == null ? 0.3 : o.v);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let node = g;
      if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); node = f; }
      osc.connect(g); node.connect(out(o.pan));
      osc.start(t); osc.stop(t + dur + 0.05);
    },
    // filtered noise burst
    noise(t, o) {
      o = o || {};
      const dur = o.dur || 0.08, src = ctx.createBufferSource(); src.buffer = noiseBuf();
      const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1200, t); f.Q.value = o.q || 0.8;
      if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t + dur);
      const g = ctx.createGain(), v = (o.v == null ? 0.3 : o.v), a = o.a || 0.002;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(out(o.pan));
      src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
    },
    notes(t, list, o) { list.forEach((n, i) => S.tone(t + i * ((o && o.gap) || 0.07), Object.assign({}, o, { f: n }))); },
  };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  S.hz = hz;

  // fallback set used by shared UI (sheets, wardrobe)
  const DEF = {
    tap(s, t) { s.tone(t, { f: 1700, f2: 1200, dur: 0.05, v: 0.09, type: 'triangle' }); },
    open(s, t) { s.tone(t, { f: 520, f2: 880, dur: 0.16, v: 0.08, type: 'sine' }); s.noise(t, { f: 3000, f2: 6000, dur: 0.12, v: 0.03, type: 'highpass' }); },
    close(s, t) { s.tone(t, { f: 760, f2: 420, dur: 0.14, v: 0.07, type: 'sine' }); },
    play(s, t) { s.notes(t, [hz(72), hz(79)], { dur: 0.14, v: 0.12, type: 'triangle', gap: 0.06 }); },
    pause(s, t) { s.notes(t, [hz(79), hz(72)], { dur: 0.12, v: 0.1, type: 'triangle', gap: 0.05 }); },
    next(s, t) { s.tone(t, { f: 600, f2: 1400, dur: 0.12, v: 0.09, type: 'square', lp: 2600 }); },
    prev(s, t) { s.tone(t, { f: 1400, f2: 600, dur: 0.12, v: 0.09, type: 'square', lp: 2600 }); },
    toggle(s, t) { s.tone(t, { f: 1100, dur: 0.05, v: 0.08, type: 'square', lp: 3000 }); },
    enter(s, t) { s.notes(t, [hz(67), hz(71), hz(74), hz(79)], { dur: 0.2, v: 0.08, type: 'triangle', gap: 0.05 }); },
    ok(s, t) { s.notes(t, [hz(76), hz(84)], { dur: 0.16, v: 0.1, type: 'sine', gap: 0.07 }); },
    err(s, t) { s.tone(t, { f: 220, f2: 150, dur: 0.22, v: 0.12, type: 'sawtooth', lp: 900 }); },
    tick(s, t) { s.tone(t, { f: 2400, dur: 0.025, v: 0.05, type: 'square', lp: 5000 }); },
  };

  function unlock() { const c = ensure(); if (!c) return; try { const b = c.createBuffer(1, 1, 22050); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) { /* ignore */ } }
  function play(name, profile) {
    if (!R.settings.get('sfx') || document.hidden) return;
    const c = ensure(); if (!c) return;
    const fn = (profile && profile[name]) || DEF[name];
    if (!fn) return;
    try { fn(S, c.currentTime + 0.004); } catch (e) { /* ignore */ }
  }
  return { play, unlock, S, DEF, hz, ctx: () => ctx };
})();
