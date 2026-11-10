/* ───────── 音效：全部即時合成（翻頁的紙聲、說書人的驚堂木、輕點） ───────── */
const Sound = (() => {
  let ctx = null, noiseBuf = null;
  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    const n = Math.floor(ctx.sampleRate * .6); noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  const ok = () => ctx && Settings.sfx && ctx.state === 'running';
  function noise(dur, f0, f1, q, gain, when) {
    const t = ctx.currentTime + (when || 0), src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.playbackRate.value = .7 + Math.random() * .5;
    bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + dur * .22); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(ctx.destination); src.start(t, Math.random() * .3, dur + .05);
  }
  function tone(freq, dur, gain, type, when) {
    const t = ctx.currentTime + (when || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * .82, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + .02);
  }
  return {
    unlock,
    page(back) { if (!ok()) return; noise(.2, back ? 900 : 2400, back ? 2200 : 800, .8, .05); noise(.09, 5200, 3000, 1.2, .018, .1); },
    /* 驚堂木：一聲脆響，後面跟著桌面的悶響 */
    knock() { if (!ok()) return; noise(.03, 3200, 1800, 1.5, .5); tone(940, .07, .32, 'triangle'); tone(1880, .04, .12, 'sine'); tone(170, .16, .4, 'sine', .004); },
    tap() { if (!ok()) return; tone(660, .05, .05, 'sine'); },
    open() { if (!ok()) return; noise(.32, 500, 1600, .6, .045); tone(196, .5, .05, 'sine', .05); tone(294, .6, .035, 'sine', .12); },
    chime() { if (!ok()) return; [523, 784, 1047].forEach((f, i) => tone(f, .5, .05, 'sine', i * .09)); },
  };
})();
