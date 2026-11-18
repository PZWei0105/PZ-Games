'use strict';
/* 補番 BINGE — 聲音：全部 Web Audio 即時合成
   音效走動畫的語彙：キラキラ的閃光、太鼓「咚！」、眼睛貼（Eyecatch）的木琴小段、次回預告的「鏘——」、扭蛋的喀啦聲。
   背景是 Lo-fi 動畫咖啡廳：電鋼琴七和弦、搖擺的鼓、卡林巴旋律（不加黑膠底噪：一直沙沙響聽起來像水聲，痞子葳嫌吵，2026-11-18 拿掉）；白天輕快一點，深夜慢一點。看片時自動停。 */

const Snd = (() => {
  let ctx = null, master = null, sfxBus = null, bgmBus = null, comp = null, noiseBuf = null, verb = null;
  let bgmOn = false, bgmTimer = 0, nextT = 0, step = 0, ducked = false, hidden = false, mood = 'day', seedRnd = Math.random;

  function init() {
    // 一定要在點擊的當下同步呼叫（iPhone 才會解鎖聲音）
    if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { return; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.25;
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
    const inp = ctx.createGain(), out = ctx.createGain();
    out.gain.value = 0.26;
    [0.061, 0.097, 0.143].forEach((t, i) => {
      const d = ctx.createDelay(1); d.delayTime.value = t;
      const fb = ctx.createGain(); fb.gain.value = 0.38 - i * 0.05;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400 - i * 700;
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
  function env(g, t, a, peak, len, hold) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    if (hold) g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  }
  function tone(type, f0, f1, len, vol, at = 0, dest, opt = {}) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + (opt.glide || len));
    if (opt.detune) o.detune.value = opt.detune;
    env(g, t, opt.a || 0.004, vol, len);
    o.connect(g); g.connect(dest || sfxBus);
    if (opt.verb) g.connect(verb);
    o.start(t); o.stop(t + len + 0.05);
    return o;
  }
  function burst(len, f0, f1, q, vol, at = 0, type = 'bandpass', dest, opt = {}) {
    const t = ctx.currentTime + at;
    const s = ctx.createBufferSource(); s.buffer = noise();
    s.playbackRate.value = opt.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + len);
    const g = ctx.createGain();
    env(g, t, opt.a || 0.004, vol, len);
    s.connect(f); f.connect(g); g.connect(dest || sfxBus);
    if (opt.verb) g.connect(verb);
    s.start(t, Math.random() * 1.5); s.stop(t + len + 0.05);
  }
  /* 鐘、閃光：FM */
  function bell(freq, len, vol, at = 0, ratio = 3.5, index = 260, dest) {
    const t = ctx.currentTime + at;
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    car.frequency.value = freq; mod.frequency.value = freq * ratio;
    mg.gain.setValueAtTime(index, t); mg.gain.exponentialRampToValueAtTime(1, t + len);
    mod.connect(mg); mg.connect(car.frequency);
    env(g, t, 0.004, vol, len);
    car.connect(g); g.connect(dest || sfxBus); g.connect(verb);
    car.start(t); mod.start(t); car.stop(t + len + 0.05); mod.stop(t + len + 0.05);
  }
  /* 木琴（眼睛貼用）：正弦＋第四泛音、很快衰減 */
  function marimba(freq, vol, at = 0, dest) {
    const t = ctx.currentTime + at;
    [[1, 1, 0.55], [4, 0.3, 0.12], [9.9, 0.08, 0.05]].forEach(([m, v, len]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = freq * m;
      env(g, t, 0.003, vol * v, len);
      o.connect(g); g.connect(dest || sfxBus); g.connect(verb);
      o.start(t); o.stop(t + len + 0.05);
    });
  }
  /* 太鼓：咚 */
  function taiko(vol = 0.8, at = 0, pitch = 1) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130 * pitch, t); o.frequency.exponentialRampToValueAtTime(48 * pitch, t + 0.35);
    env(g, t, 0.003, vol, 0.55);
    o.connect(g); g.connect(sfxBus); g.connect(verb);
    o.start(t); o.stop(t + 0.6);
    burst(0.09, 1200, 400, 0.7, vol * 0.35, at, 'lowpass');
  }

  const last = {};
  const S = {
    tick() { tone('sine', 2500, 2100, 0.03, 0.03); },
    tap() { tone('sine', 520, 1180, 0.07, 0.11, 0, null, { glide: 0.05 }); burst(0.02, 3000, 3000, 1, 0.05); },
    select() { marimba(1318.5, 0.09); marimba(1975.5, 0.07, 0.06); },
    back() { tone('sine', 1150, 480, 0.13, 0.09); },
    tab() {
      burst(0.26, 500, 6200, 1.2, 0.2, 0, 'bandpass', null, { a: 0.08 });
      tone('sine', 420, 640, 0.14, 0.12, 0.12, null, { verb: true });
    },
    iris() { burst(0.22, 5000, 600, 1.4, 0.16, 0, 'bandpass', null, { a: 0.03 }); tone('triangle', 900, 300, 0.18, 0.06, 0.03); },
    kira() {
      // キラキラ：五聲音階快速往上、尾巴一片閃光
      [1046.5, 1174.7, 1318.5, 1568, 1760, 2093].forEach((f, i) => bell(f, 0.5, 0.05, i * 0.045, 3.5, 300));
      burst(0.7, 7000, 11000, 0.8, 0.05, 0.08, 'highpass', null, { a: 0.1, verb: true });
    },
    unkira() { bell(1318.5, 0.3, 0.05, 0, 2.5, 120); bell(880, 0.4, 0.05, 0.09, 2.5, 120); },
    impact() { taiko(0.9); burst(0.6, 2500, 500, 0.5, 0.12, 0.01, 'lowpass', null, { verb: true }); },
    dodon() { taiko(0.8, 0); taiko(0.95, 0.16, 0.92); },
    slam() {
      // 開場的大字砸下來：太鼓＋鈸＋閃光
      taiko(1, 0, 0.9);
      burst(1.1, 9000, 4000, 0.6, 0.16, 0, 'highpass', null, { a: 0.003, verb: true });
      bell(784, 0.9, 0.06, 0.02, 2.01, 500); bell(1568, 0.7, 0.04, 0.04, 3.01, 300);
    },
    whoosh() { burst(0.42, 260, 7000, 1.0, 0.3, 0, 'bandpass', null, { a: 0.15 }); },
    eyecatch() {
      // 眼睛貼：木琴的小段落（G C E G — C）
      [[784, 0], [1046.5, 0.11], [1318.5, 0.22], [1568, 0.33], [2093, 0.5]].forEach(([f, a], i) => marimba(f, i === 4 ? 0.14 : 0.1, a));
      bell(2093, 0.9, 0.03, 0.5, 4.01, 200);
    },
    nextep() {
      // 次回預告：低音和弦一擊＋上衝
      [130.8, 155.6, 196, 261.6].forEach((f) => { tone('sawtooth', f, f, 0.7, 0.035, 0.02, null, { verb: true }); });
      taiko(0.7, 0.02, 0.8);
      burst(0.9, 300, 6000, 1.1, 0.12, 0.05, 'bandpass', null, { a: 0.6 });
      bell(523.3, 1.2, 0.05, 0.75, 2.01, 400); bell(784, 1.2, 0.04, 0.77, 2.01, 400);
    },
    gacha() {
      // 扭蛋：轉三圈的喀啦聲
      for (let i = 0; i < 9; i++) burst(0.035, 2600 + Math.random() * 1500, 2000, 3, 0.11, i * 0.075 + Math.random() * 0.02, 'bandpass');
    },
    pop() {
      tone('sine', 300, 900, 0.12, 0.2, 0, null, { glide: 0.06 });
      [523.3, 659.3, 784, 1046.5].forEach((f, i) => marimba(f, 0.1, 0.08 + i * 0.07));
      burst(0.8, 7000, 12000, 0.7, 0.05, 0.12, 'highpass', null, { a: 0.1, verb: true });
    },
    stamp() { taiko(0.5, 0, 1.4); marimba(1568, 0.08, 0.05); marimba(2093, 0.07, 0.12); },
    later() { tone('sine', 1760, 1760, 0.08, 0.06); tone('sine', 2349, 2349, 0.12, 0.06, 0.07); },
    err() {
      // 搞笑的「啵嗡」
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.4);
      lfo.frequency.value = 16; lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency);
      env(g, t, 0.005, 0.12, 0.45);
      o.connect(g); g.connect(sfxBus); o.start(t); lfo.start(t); o.stop(t + 0.5); lfo.stop(t + 0.5);
    },
    count() { burst(0.04, 1900, 1900, 6, 0.12, 0, 'bandpass'); },
    swipe() { burst(0.16, 1500, 5200, 1.4, 0.12); },
    sleep() { [1568, 1318.5, 1046.5, 784].forEach((f, i) => bell(f, 0.9, 0.035, i * 0.22, 4.01, 60)); },
    seek() { tone('sine', 880, 1320, 0.05, 0.05); },
  };
  function play(name) {
    if (!ctx || !SET.sfx) return;
    if (ctx.state !== 'running') { ctx.resume(); return; }
    const t = performance.now();
    if (last[name] && t - last[name] < 40) return;
    last[name] = t;
    try { S[name] && S[name](); } catch (e) { /* */ }
  }

  /* ---------------- Lo-fi 動畫咖啡廳 ---------------- */
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // 八小節：Fmaj7 Em7 Dm7 Cmaj7 | Fmaj7 Em7 Am9 G13sus
  const PROG = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59], [53, 57, 60, 64], [52, 55, 59, 62], [45, 48, 52, 55, 59], [43, 48, 50, 53, 57]];
  const PENTA = [72, 74, 76, 79, 81, 84, 86, 88];
  let melody = [];
  function bpm() { return mood === 'night' ? 70 : mood === 'dusk' ? 76 : 82; }
  function spb() { return 60 / bpm() / 4; }        // 十六分音符
  function makeMelody() {
    // 每天換一段卡林巴旋律（同一天聽起來是同一首）
    const r = seeded(hash32(dayKey() + mood));
    melody = [];
    let k = 3;
    for (let i = 0; i < 64; i++) {
      if (r() < (mood === 'night' ? 0.22 : 0.3)) { k = clamp(k + Math.floor(r() * 5) - 2, 0, PENTA.length - 1); melody.push(PENTA[k]); } else melody.push(0);
    }
  }
  function sched() {
    if (!ctx) return;
    const S16 = spb();
    while (nextT < ctx.currentTime + 0.16) {
      const swing = step % 2 === 1 ? S16 * 0.18 : 0;
      note(step, nextT + swing);
      nextT += S16;
      step = (step + 1) % 128;
    }
  }
  function rhodes(m, t, len, vol, dest) {
    // 電鋼琴：FM（1:1）＋一點震音
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    const f = mtof(m);
    car.frequency.value = f; mod.frequency.value = f;
    mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.6);
    mod.connect(mg); mg.connect(car.frequency);
    lp.type = 'lowpass'; lp.frequency.value = mood === 'night' ? 1500 : 2400;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(vol * 0.55, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    car.connect(lp); lp.connect(g); g.connect(dest); g.connect(verb);
    car.start(t); mod.start(t); car.stop(t + len + 0.05); mod.stop(t + len + 0.05);
  }
  function note(s, t) {
    const bar = Math.floor(s / 16), pos = s % 16, ch = PROG[bar % 8], B = bgmBus, S16 = spb();
    const night = mood === 'night';
    // 和弦：每小節第一拍、第三拍後半再補一下
    if (pos === 0) ch.forEach((m, i) => rhodes(m, t + i * 0.012, S16 * 15, 0.028 - i * 0.002, B));
    if (pos === 10 && bar % 2 === 1) ch.slice(1).forEach((m, i) => rhodes(m + 12, t + i * 0.01, S16 * 5, 0.012, B));
    // 大鼓：1、2 拍半
    if (pos === 0 || pos === 6 || (pos === 10 && bar % 4 === 3)) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.2);
      env(g, t, 0.004, night ? 0.32 : 0.42, 0.3); o.connect(g); g.connect(B); o.start(t); o.stop(t + 0.32);
    }
    // 小鼓（悶悶的）：2、4 拍
    if (pos === 4 || pos === 12) {
      const sN = ctx.createBufferSource(); sN.buffer = noise();
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = night ? 1300 : 1700; f.Q.value = 0.8;
      const g = ctx.createGain(); env(g, t, 0.003, night ? 0.08 : 0.12, 0.18);
      sN.connect(f); f.connect(g); g.connect(B); g.connect(verb); sN.start(t, Math.random()); sN.stop(t + 0.2);
      const o = ctx.createOscillator(), g2 = ctx.createGain(); o.frequency.value = 190; env(g2, t, 0.002, 0.05, 0.08); o.connect(g2); g2.connect(B); o.start(t); o.stop(t + 0.1);
    }
    // 腳踏鈸：搖擺八分音符（深夜不打）
    if (!night && pos % 2 === 0) {
      const sN = ctx.createBufferSource(); sN.buffer = noise();
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000;
      const g = ctx.createGain(); env(g, t, 0.001, pos % 4 === 2 ? 0.035 : 0.018, 0.045);
      sN.connect(f); f.connect(g); g.connect(B); sN.start(t, Math.random()); sN.stop(t + 0.06);
    }
    // 貝斯：根音，第一拍與第三拍
    if (pos === 0 || pos === 8 || (pos === 14 && bar % 2 === 0)) {
      const m = ch[0] - 12 + (pos === 14 ? 7 : 0);
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'triangle'; o.frequency.value = mtof(m);
      f.type = 'lowpass'; f.frequency.value = 600;
      env(g, t, 0.01, 0.13, S16 * (pos === 14 ? 2 : 6));
      o.connect(f); f.connect(g); g.connect(B); o.start(t); o.stop(t + S16 * 7);
    }
    // 卡林巴旋律：第三小節開始
    if (bar % 8 >= 2 && pos % 2 === 0) {
      const m = melody[((bar % 4) * 8 + pos / 2) % melody.length];
      if (m) {
        const tt = t;
        [[1, 0.05, 0.9], [3.01, 0.012, 0.25], [5.4, 0.006, 0.12]].forEach(([mul, v, len]) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.value = mtof(m) * mul;
          env(g, tt, 0.003, night ? v * 0.8 : v, len);
          o.connect(g); g.connect(B); g.connect(verb); o.start(tt); o.stop(tt + len + 0.05);
        });
      }
    }
  }
  function bgmTarget() { return SET.bgm && !ducked && !hidden ? 0.34 : 0; }
  function bgmStart() {
    if (!ctx || bgmOn || !SET.bgm || ducked) return;
    bgmOn = true;
    makeMelody();
    nextT = ctx.currentTime + 0.08;
    step = 0;
    bgmBus.gain.cancelScheduledValues(ctx.currentTime);
    bgmBus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bgmBus.gain.exponentialRampToValueAtTime(Math.max(bgmTarget(), 0.0001), ctx.currentTime + 2.2);
    clearInterval(bgmTimer);
    bgmTimer = setInterval(sched, 30);
  }
  function bgmStop(fade = 0.7) {
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
  function setMood(m) { if (m === mood) return; mood = m; makeMelody(); }
  function duck(on) { ducked = on; refresh(); }
  function setHidden(h) { hidden = h; if (ctx) { if (h) bgmStop(0.2); else { if (ctx.state !== 'running') ctx.resume(); refresh(); } } }
  return { init, ready, play, bgmStart, bgmStop, refresh, duck, setHidden, setMood, get ctx() { return ctx; } };
})();
