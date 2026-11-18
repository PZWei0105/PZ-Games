'use strict';
/* 一集就好 — 配樂與音效（Web Audio 即時合成）
   溫柔的 lo-fi：電鋼琴和弦、木琴旋律、圓圓的低音、很輕的大鼓。
   規則：不用任何白噪音（沒有黑膠底噪、腳踏鈸、噪音小鼓、雨聲）；影片一播就停，收起播放器再慢慢回來。 */
const Snd = (() => {
  let ctx = null, master = null, bus = null, timer = 0, on = false, ducked = false, step = 0, nextT = 0, vol = 0.35, skin = 'matcha';
  const BPM = 74, SPB = 60 / BPM / 2;          // 一格＝八分音符
  const PROG = {
    matcha: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],      // Fmaj7 Em7 Dm7 Cmaj7
    rose: [[51, 55, 58, 62], [50, 53, 57, 60], [48, 51, 55, 58], [46, 50, 53, 57]],        // Ebmaj7 Dm7 Cm7 Bbmaj7
  };
  const SCALE = { matcha: [72, 74, 76, 79, 81, 84], rose: [70, 72, 74, 77, 79, 82] };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.4;
    bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(lp); lp.connect(comp); comp.connect(master); master.connect(ctx.destination);
    return true;
  }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function voice(type, f, t, a, peak, d, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    env(g, t, a, peak, d);
    o.connect(g); g.connect(dest || bus);
    o.start(t); o.stop(t + a + d + 0.05);
  }
  function chord(notes, t) {
    for (const m of notes) {
      voice('triangle', hz(m), t, 0.04, 0.035, 2.6);
      voice('sine', hz(m) * 1.003, t, 0.06, 0.03, 3.0);
      voice('sine', hz(m + 12), t, 0.01, 0.008, 0.9);        // 電鋼琴的「叮」
    }
  }
  function pluck(m, t, peak) {
    voice('sine', hz(m), t, 0.005, peak, 0.7);
    voice('sine', hz(m) * 4, t, 0.002, peak * 0.18, 0.12);  // 木琴的木頭聲
  }
  function bass(m, t) { voice('sine', hz(m - 12), t, 0.02, 0.09, 0.9); }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.18);
    env(g, t, 0.004, 0.16, 0.24);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + 0.3);
  }
  let lastNote = 2;
  function tick() {
    if (!ctx) return;
    while (nextT < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 8), s = step % 8, prog = PROG[skin] || PROG.matcha;
      const ch = prog[bar % prog.length];
      if (s === 0) { chord(ch, nextT); bass(ch[0], nextT); kick(nextT); }
      if (s === 4) { bass(ch[0] + 7, nextT); kick(nextT); }
      if (s === 6 && Math.random() < 0.35) bass(ch[0] + 5, nextT);
      // 旋律：多數格子留白，只在偶爾冒出一兩個音
      const want = (s % 2 === 0 ? 0.42 : 0.16) * (bar % 4 === 3 ? 0.5 : 1);
      if (Math.random() < want) {
        const sc = SCALE[skin] || SCALE.matcha;
        lastNote = Math.max(0, Math.min(sc.length - 1, lastNote + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
        pluck(sc[lastNote], nextT + (s % 2 ? 0.02 : 0), 0.05 + Math.random() * 0.02);
      }
      nextT += SPB;
      step++;
    }
  }
  function level() {
    if (!master) return;
    const target = on && !ducked ? vol * 0.9 : 0.0001;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(target, ctx.currentTime, ducked ? 0.25 : 1.2);
  }
  return {
    get on() { return on; },
    start() {
      if (!init()) return;
      if (ctx.state === 'suspended') ctx.resume();
      on = true;
      if (!timer) { nextT = ctx.currentTime + 0.1; step = 0; timer = setInterval(tick, 90); }
      level();
    },
    stop() {
      on = false; level();
      clearTimeout(this._st);
      this._st = setTimeout(() => { if (!on) { clearInterval(timer); timer = 0; } }, 3000);
    },
    duck(d) { ducked = !!d; level(); },
    setVol(v) { vol = Math.max(0, Math.min(1, v)); level(); },
    setSkin(s) { skin = s; },
    tap() { if (!init() || !SET.sfx) return; if (ctx.state === 'suspended') ctx.resume(); const t = ctx.currentTime; const g = ctx.createGain(); g.gain.value = 0.6; g.connect(ctx.destination); voice('sine', 880, t, 0.003, 0.05, 0.12, g); },
    pop() { if (!init() || !SET.sfx) return; const t = ctx.currentTime; const g = ctx.createGain(); g.gain.value = 0.7; g.connect(ctx.destination); voice('sine', 660, t, 0.004, 0.06, 0.18, g); voice('sine', 990, t + 0.07, 0.004, 0.05, 0.25, g); },
    chime() { if (!init() || !SET.sfx) return; const t = ctx.currentTime; const g = ctx.createGain(); g.gain.value = 0.7; g.connect(ctx.destination); [0, 4, 7, 12].forEach((k, i) => voice('sine', hz((skin === 'rose' ? 75 : 77) + k), t + i * 0.07, 0.004, 0.045, 0.5, g)); },
  };
})();
