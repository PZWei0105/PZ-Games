'use strict';
/* 觀戰 SPECTATE — 聲音：全部用 Web Audio 即時合成（轉播台的轉場、倒數、開播鈴、賽前配樂） */

const Snd = (() => {
  let ctx = null, master = null, sfxBus = null, bgmBus = null, comp = null, noiseBuf = null, verb = null;
  let bgmOn = false, bgmTimer = 0, nextT = 0, step = 0, ducked = false, hidden = false;

  function init() {
    // 一定要在點擊的當下同步呼叫（iPhone 才會解鎖聲音）
    if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { return; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = SET.vol;
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = SET.sfx ? 0.9 : 0; sfxBus.connect(master);
    bgmBus = ctx.createGain(); bgmBus.gain.value = 0; bgmBus.connect(master);
    verb = makeVerb();
    const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
    s.buffer = b; s.connect(ctx.destination); s.start(0);
    try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) { /* */ }
  }
  const ready = () => !!ctx && ctx.state === 'running';

  function makeVerb() {
    // 短短的空間感：兩條回授延遲
    const inp = ctx.createGain(), out = ctx.createGain();
    out.gain.value = 0.22;
    [0.073, 0.111].forEach((t, i) => {
      const d = ctx.createDelay(1); d.delayTime.value = t;
      const fb = ctx.createGain(); fb.gain.value = 0.35;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200 - i * 900;
      inp.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(out);
    });
    out.connect(master);
    return inp;
  }
  function noise() {
    if (noiseBuf) return noiseBuf;
    const n = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function tone(type, f0, f1, len, vol, at = 0, dest, opt = {}) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + len);
    if (opt.detune) o.detune.value = opt.detune;
    const a = opt.a || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(dest || sfxBus);
    if (opt.verb) g.connect(verb);
    o.start(t); o.stop(t + len + 0.05);
    return g;
  }
  function burst(len, f0, f1, q, vol, at = 0, type = 'bandpass', dest, opt = {}) {
    const t = ctx.currentTime + at;
    const s = ctx.createBufferSource(); s.buffer = noise();
    s.playbackRate.value = opt.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + len);
    const g = ctx.createGain();
    const a = opt.a || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(dest || sfxBus);
    if (opt.verb) g.connect(verb);
    s.start(t, Math.random() * 1.5); s.stop(t + len + 0.05);
  }
  function fm(freq, len, vol, at = 0, ratio = 3.5, index = 220) {
    // 金屬感的鐘聲（轉場的閃光、開播鈴）
    const t = ctx.currentTime + at;
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    car.frequency.value = freq; mod.frequency.value = freq * ratio;
    mg.gain.setValueAtTime(index, t); mg.gain.exponentialRampToValueAtTime(1, t + len);
    mod.connect(mg); mg.connect(car.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    car.connect(g); g.connect(sfxBus); g.connect(verb);
    car.start(t); mod.start(t); car.stop(t + len + 0.05); mod.stop(t + len + 0.05);
  }

  const last = {};
  const S = {
    tick() { tone('square', 2600, 2200, 0.025, 0.035); },
    tap() { tone('triangle', 1250, 1500, 0.05, 0.08); tone('sine', 2500, 2500, 0.03, 0.03, 0.01); },
    select() { tone('triangle', 880, 880, 0.06, 0.1); tone('triangle', 1320, 1320, 0.09, 0.09, 0.055); },
    back() { tone('triangle', 900, 520, 0.11, 0.09); },
    tab() { burst(0.16, 900, 5200, 1.4, 0.16); tone('sine', 300, 180, 0.12, 0.12, 0.02); },
    whoosh() { burst(0.38, 280, 6500, 1.1, 0.32, 0, 'bandpass', null, { a: 0.14 }); },
    impact() {
      tone('sine', 140, 38, 0.42, 0.75);
      burst(0.08, 3000, 900, 0.8, 0.35);
      burst(0.5, 1800, 600, 0.5, 0.12, 0.02, 'lowpass', null, { verb: true });
    },
    stinger() {
      burst(0.32, 300, 7000, 1.0, 0.34, 0, 'bandpass', null, { a: 0.18 });
      setTimeout(() => S.impact(), 230);
      fm(1568, 0.7, 0.07, 0.27, 2.01, 400);
    },
    take() {
      tone('sine', 110, 44, 0.3, 0.6);
      burst(0.05, 4500, 1500, 0.9, 0.3);
      fm(1046, 0.5, 0.06, 0.02, 3.01, 300);
      burst(0.22, 6000, 9000, 2, 0.08, 0.03, 'highpass');
    },
    beep() { tone('square', 1000, 1000, 0.12, 0.09); tone('sine', 1000, 1000, 0.12, 0.08); },
    go() { tone('square', 1500, 1500, 0.45, 0.1); tone('sine', 750, 750, 0.45, 0.12); },
    onair() {
      // 開播鈴：兩聲上行＋光亮的和弦
      [[659, 0], [988, 0.13], [1319, 0.26]].forEach(([f, a]) => { tone('triangle', f, f, 0.5, 0.12, a, null, { verb: true }); fm(f, 0.45, 0.04, a); });
      burst(0.9, 6000, 12000, 0.7, 0.05, 0.25, 'highpass', null, { a: 0.3 });
    },
    sub() {
      // 簽下這台：蓋章＋上行三和弦＋觀眾一聲歡呼
      tone('sine', 160, 60, 0.18, 0.6);
      burst(0.05, 1500, 600, 1, 0.3);
      [[523, 0.06], [659, 0.12], [784, 0.18], [1046, 0.26]].forEach(([f, a]) => tone('triangle', f, f, 0.35, 0.1, a, null, { verb: true }));
      burst(0.9, 900, 1600, 0.5, 0.08, 0.12, 'bandpass', null, { a: 0.25 });
    },
    unsub() { tone('triangle', 660, 330, 0.2, 0.1); tone('triangle', 440, 220, 0.25, 0.08, 0.08); },
    pass() { burst(0.28, 4000, 400, 1.3, 0.22, 0, 'bandpass', null, { a: 0.02 }); },
    later() { tone('sine', 1760, 1760, 0.07, 0.06); tone('sine', 2349, 2349, 0.1, 0.06, 0.07); },
    stat() { burst(0.26, 2000, 2000, 0.3, 0.18, 0, 'highpass'); tone('square', 60, 60, 0.18, 0.04); },
    err() { tone('sawtooth', 160, 120, 0.22, 0.08); tone('sawtooth', 165, 125, 0.22, 0.06, 0.02); },
    swipe() { burst(0.14, 1800, 3800, 1.6, 0.12); },
    count() { tone('square', 1200, 1200, 0.04, 0.04); },
  };
  function play(name) {
    if (!ctx || !SET.sfx) return;
    if (ctx.state !== 'running') { ctx.resume(); return; }
    const t = performance.now();
    if (last[name] && t - last[name] < 40) return;
    last[name] = t;
    try { S[name] && S[name](); } catch (e) { /* */ }
  }

  /* ---------------- 賽前配樂：A 小調、118 BPM、八小節一輪 ---------------- */
  const BPM = 118, SPB = 60 / BPM / 4;      // 十六分音符
  const PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const BASS = [0, 0, 12, 0, 0, 12, 0, 7];
  const ARP = [0, 1, 2, 1, 0, 2, 1, 2];

  function sched() {
    if (!ctx) return;
    while (nextT < ctx.currentTime + 0.14) { note(step, nextT); nextT += SPB; step = (step + 1) % 128; }
  }
  function note(s, t) {
    const bar = Math.floor(s / 16), pos = s % 16, ch = PROG[bar % 8];
    const B = bgmBus;
    const env = (g, a, peak, len) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + len); };
    // 大鼓
    if (pos % 4 === 0) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
      env(g, 0.003, 0.55, 0.3); o.connect(g); g.connect(B); o.start(t); o.stop(t + 0.32);
    }
    // 拍手
    if (pos === 4 || pos === 12) {
      const sN = ctx.createBufferSource(); sN.buffer = noise();
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 0.9;
      const g = ctx.createGain(); env(g, 0.002, 0.22, 0.16);
      sN.connect(f); f.connect(g); g.connect(B); g.connect(verb); sN.start(t, Math.random()); sN.stop(t + 0.2);
    }
    // 鈸
    if (pos % 2 === 1 || pos % 4 === 2) {
      const sN = ctx.createBufferSource(); sN.buffer = noise();
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500;
      const g = ctx.createGain(); env(g, 0.001, pos % 4 === 2 ? 0.07 : 0.03, 0.05);
      sN.connect(f); f.connect(g); g.connect(B); sN.start(t, Math.random()); sN.stop(t + 0.07);
    }
    // 貝斯（八分音符，大鼓時壓一下）
    if (pos % 2 === 0) {
      const m = ch[0] - 24 + BASS[(pos / 2) | 0];
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = mtof(m);
      f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(260, t + SPB * 1.8); f.Q.value = 6;
      const v = pos % 4 === 0 ? 0.09 : 0.16;
      env(g, 0.006, v, SPB * 1.9);
      o.connect(f); f.connect(g); g.connect(B); o.start(t); o.stop(t + SPB * 2);
    }
    // 琶音（後四小節才進來）
    if (bar % 8 >= 2) {
      const m = ch[ARP[pos % 8]] + 12 + (pos >= 8 && bar % 2 ? 12 : 0);
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = mtof(m);
      f.type = 'lowpass'; f.frequency.value = 2600;
      env(g, 0.003, 0.028, SPB * 0.9);
      o.connect(f); f.connect(g); g.connect(B); g.connect(verb); o.start(t); o.stop(t + SPB);
    }
    // 鋪底和弦（每小節一次）
    if (pos === 0) {
      ch.forEach((m, i) => {
        [-6, 6].forEach((dt) => {
          const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
          o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt;
          f.type = 'lowpass'; f.frequency.value = 1100;
          const L = SPB * 16;
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012 - i * 0.002, t + 0.5); g.gain.setValueAtTime(0.012 - i * 0.002, t + L - 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + L);
          o.connect(f); f.connect(g); g.connect(B); o.start(t); o.stop(t + L + 0.05);
        });
      });
    }
    // 八小節的最後一小節：上衝的噪音，接回第一拍的鈸
    if (bar % 8 === 7 && pos === 0) {
      const sN = ctx.createBufferSource(); sN.buffer = noise();
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(7000, t + SPB * 16);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + SPB * 15.5); g.gain.exponentialRampToValueAtTime(0.0001, t + SPB * 16);
      sN.connect(f); f.connect(g); g.connect(B); sN.start(t); sN.stop(t + SPB * 16 + 0.05);
    }
    if (bar % 8 === 0 && pos === 0 && s > 0) {
      const sN = ctx.createBufferSource(); sN.buffer = noise();
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5000;
      const g = ctx.createGain(); env(g, 0.002, 0.06, 1.4);
      sN.connect(f); f.connect(g); g.connect(B); g.connect(verb); sN.start(t); sN.stop(t + 1.5);
    }
  }
  function bgmTarget() { return SET.bgm && !ducked && !hidden ? 0.32 : 0; }
  function bgmStart() {
    if (!ctx || bgmOn) return;
    if (!SET.bgm) return;
    bgmOn = true;
    nextT = ctx.currentTime + 0.08;
    step = 0;
    bgmBus.gain.cancelScheduledValues(ctx.currentTime);
    bgmBus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bgmBus.gain.exponentialRampToValueAtTime(Math.max(bgmTarget(), 0.0001), ctx.currentTime + 1.6);
    clearInterval(bgmTimer);
    bgmTimer = setInterval(sched, 30);
  }
  function bgmStop(fade = 0.6) {
    if (!ctx || !bgmOn) return;
    bgmOn = false;
    const t = ctx.currentTime;
    bgmBus.gain.cancelScheduledValues(t);
    bgmBus.gain.setValueAtTime(Math.max(bgmBus.gain.value, 0.0001), t);
    bgmBus.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    setTimeout(() => { if (!bgmOn) clearInterval(bgmTimer); }, fade * 1000 + 80);
  }
  function refresh() {
    if (!ctx) return;
    const want = bgmTarget();
    if (want > 0 && !bgmOn) bgmStart();
    else if (want === 0 && bgmOn) bgmStop();
    sfxBus.gain.value = SET.sfx ? 0.9 : 0;
    master.gain.value = SET.vol;
  }
  function duck(on) { ducked = on; refresh(); }
  function setHidden(h) { hidden = h; if (ctx) { if (h) bgmStop(0.2); else { if (ctx.state !== 'running') ctx.resume(); refresh(); } } }
  return { init, ready, play, bgmStart, bgmStop, refresh, duck, setHidden, get ctx() { return ctx; } };
})();
