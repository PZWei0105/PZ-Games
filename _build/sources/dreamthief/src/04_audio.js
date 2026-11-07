'use strict';
/* ====== 聲音：全部即時合成 ====== */
const AU = {
  ctx: null, ready: false, master: null, sfxG: null, musG: null, ambG: null, nb: null, last: {}, seq: null, tension: 0, hbT: 0, rain: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      const c = this.ctx = new C();
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(c.destination);
      this.master = c.createGain(); this.master.gain.value = .9; this.master.connect(comp);
      this.sfxG = c.createGain(); this.musG = c.createGain(); this.ambG = c.createGain();
      this.sfxG.connect(this.master); this.musG.connect(this.master); this.ambG.connect(this.master);
      // 簡單殘響
      const conv = c.createConvolver(); const len = c.sampleRate * 2.4, ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      conv.buffer = ir; this.rev = c.createGain(); this.rev.gain.value = .28; this.rev.connect(conv); conv.connect(this.master);
      const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.nb = nb;
      this.ready = true; this.applyVol();
      setInterval(() => this.tick(), 60);
      if (this.want) { const w = this.want; this.want = null; this.music(...w); }
    } catch (e) { this.ready = false; }
  },
  applyVol() { if (!this.ready || !G) return; const s = G.settings; this.sfxG.gain.value = s.sfx ? .9 : 0; this.musG.gain.value = s.music ? .55 : 0; this.ambG.gain.value = s.music ? .5 : 0; },
  t() { return this.ctx.currentTime; },
  tone(f, dur, o = {}) {
    if (!this.ready) return;
    const c = this.ctx, t0 = (o.at || this.t()), osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t0 + dur);
    if (o.det) osc.detune.value = o.det;
    const v = o.v ?? .3, a = o.a ?? .004;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + a); g.gain.exponentialRampToValueAtTime(.0005, t0 + dur);
    let node = osc;
    if (o.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; osc.connect(fl); node = fl; }
    node.connect(g); g.connect(o.bus || this.sfxG); if (o.rev) g.connect(this.rev);
    osc.start(t0); osc.stop(t0 + dur + .05);
  },
  noise(dur, o = {}) {
    if (!this.ready) return;
    const c = this.ctx, t0 = (o.at || this.t()), src = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter();
    src.buffer = this.nb; src.playbackRate.value = o.rate || 1;
    fl.type = o.ft || 'lowpass'; fl.frequency.setValueAtTime(o.f || 2000, t0); if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur); fl.Q.value = o.q || .8;
    const v = o.v ?? .3;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + (o.a ?? .003)); g.gain.exponentialRampToValueAtTime(.0005, t0 + dur);
    src.connect(fl); fl.connect(g); g.connect(o.bus || this.sfxG); if (o.rev) g.connect(this.rev);
    src.start(t0, Math.random() * 1.5); src.stop(t0 + dur + .05);
  },
  bell(f, at, v = .14, bus) { this.tone(f, 1.8, { at, v, bus: bus || this.musG, rev: 1 }); this.tone(f * 2.76, .9, { at, v: v * .35, bus: bus || this.musG, rev: 1 }); this.tone(f * 5.4, .4, { at, v: v * .12, bus: bus || this.musG }); },
  sfx(n, arg) {
    if (!this.ready) return;
    const now = performance.now(), lim = { hit: 35, xp: 45, rummage: 120, step: 80, zap: 60, blade: 70, tick: 0, crit: 40, wallhit: 50, land: 40, drop: 30 }[n] ?? 25;
    if (this.last[n] && now - this.last[n] < lim) return; this.last[n] = now;
    const T0 = this.t();
    switch (n) {
      case 'shot': {
        if (arg === 'crossbow') { this.noise(.12, { f: 3200, ft: 'bandpass', q: 2, v: .22 }); this.tone(220, .09, { type: 'triangle', slide: 120, v: .2 }); break; }
        if (arg === 'needle') { this.noise(.05, { f: 4000, ft: 'highpass', v: .14 }); this.tone(900, .04, { type: 'square', slide: 400, v: .05 }); break; }
        const big = arg === 'shotgun';
        this.noise(big ? .32 : .2, { f: big ? 1800 : 2600, f2: 300, v: big ? .5 : .38 });
        this.tone(big ? 110 : 150, big ? .25 : .16, { type: 'sine', slide: 40, v: big ? .55 : .42 });
        this.noise(.05, { f: 6000, ft: 'highpass', v: .12, at: T0 + .005 });
        break;
      }
      case 'reload': this.tone(1200, .03, { type: 'square', v: .05 }); this.noise(.06, { f: 2500, ft: 'bandpass', q: 3, v: .1, at: T0 + .06 }); break;
      case 'reloadDone': this.tone(1600, .03, { type: 'square', v: .06 }); this.tone(900, .04, { type: 'square', v: .05, at: T0 + .05 }); break;
      case 'hit': this.noise(.07, { f: 1400, ft: 'bandpass', q: 1.2, v: .22 }); this.tone(200, .06, { type: 'triangle', slide: 90, v: .16 }); break;
      case 'crit': this.noise(.1, { f: 3000, ft: 'bandpass', q: 1.5, v: .25 }); this.tone(520, .12, { type: 'square', slide: 260, v: .08 }); break;
      case 'wallhit': this.noise(.05, { f: 1800, ft: 'bandpass', v: .08 }); break;
      case 'kill': this.noise(.3, { f: 900, f2: 120, v: .3 }); this.tone(160, .28, { type: 'sine', slide: 50, v: .25 }); break;
      case 'kill2': this.noise(.2, { f: 700, f2: 100, v: .26 }); break;
      case 'stab': this.noise(.09, { f: 5000, ft: 'highpass', v: .25 }); this.tone(90, .2, { slide: 45, v: .4 }); this.tone(1800, .06, { type: 'triangle', slide: 900, v: .07 }); break;
      case 'swipe': this.noise(.12, { f: 2400, ft: 'bandpass', q: .7, v: .16 }); break;
      case 'lunge': this.noise(.16, { f: 1000, f2: 3000, ft: 'bandpass', v: .14 }); break;
      case 'orb': this.tone(420, .3, { type: 'sine', slide: 260, v: .1, rev: 1 }); break;
      case 'slam': this.tone(70, .5, { slide: 30, v: .6 }); this.noise(.4, { f: 500, f2: 60, v: .4 }); break;
      case 'zap': this.noise(.12, { f: 5000, ft: 'highpass', v: .12 }); this.tone(1400, .08, { type: 'sawtooth', slide: 300, v: .05 }); break;
      case 'blade': this.noise(.05, { f: 6000, ft: 'highpass', v: .07 }); break;
      case 'boom': this.tone(60, .45, { slide: 30, v: .5 }); this.noise(.45, { f: 1200, f2: 80, v: .4 }); break;
      case 'scream': this.tone(780, .9, { type: 'sawtooth', slide: 1300, v: .1, lp: 2400, rev: 1 }); this.tone(1170, .8, { type: 'sawtooth', slide: 900, v: .07, lp: 2400 }); this.noise(.8, { f: 3000, ft: 'bandpass', v: .12, rev: 1 }); break;
      case 'alarm': for (let i = 0; i < 4; i++) this.tone(i % 2 ? 660 : 880, .16, { type: 'square', v: .07, at: T0 + i * .18, lp: 2000 }); break;
      case 'alert': this.tone(520, .1, { type: 'triangle', v: .09 }); this.tone(780, .14, { type: 'triangle', v: .09, at: T0 + .07 }); break;
      case 'hurt': this.tone(110, .3, { type: 'sawtooth', slide: 50, v: .25, lp: 900 }); this.noise(.2, { f: 700, v: .3 }); break;
      case 'dash': this.noise(.18, { f: 800, f2: 3200, ft: 'bandpass', q: .8, v: .22 }); break;
      case 'step': this.noise(.04, { f: 600, v: .05 }); break;
      case 'rummage': this.noise(.08, { f: 1200 + Math.random() * 1500, ft: 'bandpass', q: 3, v: .07 }); break;
      case 'open': this.tone(660, .2, { type: 'triangle', v: .12 }); this.tone(990, .3, { type: 'sine', v: .1, at: T0 + .06, rev: 1 }); this.noise(.1, { f: 2000, v: .1 }); break;
      case 'drop': this.tone([523, 587, 659, 784][arg] || 523, .25, { type: 'sine', v: .08, rev: 1 }); break;
      case 'land': if (arg >= 2) this.tone([0, 0, 1046, 1318, 1568][arg] || 1046, .5, { v: .07, rev: 1 }); break;
      case 'goldDrop': [784, 988, 1175, 1568].forEach((f, i) => this.bell(f, T0 + i * .09, .12, this.sfxG)); this.tone(98, 1.6, { type: 'triangle', v: .2, rev: 1 }); break;
      case 'pick': { const fs = [[660], [660, 880], [660, 880, 1046], [784, 988, 1318], [784, 1046, 1318, 1568], [523, 659, 784, 1046, 1318]][arg] || [660]; fs.forEach((f, i) => this.tone(f, .3, { type: 'sine', v: .09, at: T0 + i * .05, rev: 1 })); break; }
      case 'xp': this.tone(1200 + Math.random() * 400, .06, { type: 'sine', v: .045 }); break;
      case 'candy': this.tone(880, .12, { type: 'triangle', v: .1 }); this.tone(1320, .2, { type: 'triangle', v: .08, at: T0 + .08 }); break;
      case 'levelup': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .35, { type: 'triangle', v: .1, at: T0 + i * .07, rev: 1 })); break;
      case 'stage': this.tone(55, 1.4, { type: 'sawtooth', v: .18, lp: 400 }); this.tone(58, 1.4, { type: 'sawtooth', v: .14, lp: 400 }); break;
      case 'collapse': this.bellToll(); this.tone(40, 3, { type: 'sawtooth', v: .3, lp: 300, slide: 30 }); break;
      case 'bell': this.bellToll(); break;
      case 'bellTick': this.tone(1760, .05, { type: 'square', v: .03 }); break;
      case 'extract': [392, 523, 659, 784, 1046].forEach((f, i) => this.bell(f, T0 + i * .08, .12, this.sfxG)); break;
      case 'fall': this.noise(1.2, { f: 400, f2: 3000, ft: 'bandpass', v: .2 }); this.tone(400, 1.2, { slide: 80, v: .12 }); break;
      case 'lost': this.tone(220, 2.2, { type: 'sawtooth', slide: 55, v: .2, lp: 700, rev: 1 }); this.noise(2, { f: 300, v: .15, rev: 1 }); break;
      case 'descend': this.tone(300, 1.6, { slide: 60, v: .2, rev: 1 }); this.noise(1.4, { f: 1200, f2: 200, v: .15, rev: 1 }); break;
      case 'tick': this.tone(arg ? 1500 : 1100, .03, { type: 'square', v: arg ? .045 : .03 }); break;
      case 'roar': this.tone(80, 1.4, { type: 'sawtooth', slide: 50, v: .3, lp: 600, rev: 1 }); this.noise(1.2, { f: 500, v: .25, rev: 1 }); break;
      case 'bossDie': this.tone(60, 3, { slide: 25, v: .5, rev: 1 }); this.noise(2.5, { f: 1500, f2: 100, v: .4, rev: 1 }); [523, 659, 784].forEach((f, i) => this.bell(f, T0 + .6 + i * .15, .14, this.sfxG)); break;
      case 'beam': this.tone(240, 2.4, { type: 'sawtooth', v: .06, lp: 1200 }); break;
      case 'static': this.noise(.12, { f: 6000, ft: 'highpass', v: .1 }); break;
      case 'lock': this.tone(1800, .5, { type: 'square', v: .04, slide: 2400 }); break;
      case 'summon': this.tone(120, .8, { type: 'sawtooth', slide: 240, v: .12, lp: 800, rev: 1 }); break;
      case 'note': this.tone(880 * Math.pow(2, [0, 3, 5, 7, 10][(Math.random() * 5) | 0] / 12), .3, { type: 'triangle', v: .07, rev: 1 }); break;
      case 'staff': this.tone(220, .3, { type: 'triangle', v: .1 }); break;
      case 'ringwave': this.tone(160, 1, { type: 'sine', slide: 320, v: .2, rev: 1 }); break;
      case 'lash': this.noise(.25, { f: 3000, f2: 900, ft: 'bandpass', v: .2 }); break;
      case 'drip': this.tone(1400, .12, { slide: 700, v: .08, rev: 1 }); break;
      case 'splash': this.noise(.25, { f: 2500, f2: 600, v: .18 }); break;
      case 'thud': this.tone(90, .25, { slide: 40, v: .3 }); break;
      case 'blink': this.tone(1600, .3, { slide: 200, v: .07, rev: 1 }); break;
      case 'toss': this.noise(.2, { f: 1500, ft: 'bandpass', v: .08 }); break;
      case 'sack': this.noise(.4, { f: 800, v: .2 }); this.tone(200, .4, { slide: 120, v: .15 }); break;
      case 'glass': case 'glassTink': this.tone(2400 + Math.random() * 800, n === 'glass' ? .4 : .15, { v: .09, rev: 1 }); if (n === 'glass') this.noise(.4, { f: 5000, ft: 'highpass', v: .2 }); break;
      case 'mirrorSpawn': this.tone(1800, .6, { slide: 400, v: .06, rev: 1 }); this.noise(.3, { f: 4000, ft: 'highpass', v: .08 }); break;
      case 'hatch': this.noise(.35, { f: 600, v: .25 }); break;
      case 'throw': this.noise(.12, { f: 2000, ft: 'bandpass', v: .1 }); break;
      case 'incense': this.tone(392, 1.6, { type: 'sine', v: .1, rev: 1 }); this.tone(587, 1.8, { type: 'sine', v: .07, rev: 1, at: T0 + .2 }); break;
      case 'mirror': this.tone(2000, .6, { slide: 1000, v: .06, rev: 1 }); break;
      case 'stun': for (let i = 0; i < 5; i++) this.noise(.05, { f: 6000, ft: 'highpass', v: .08, at: T0 + i * .03 }); break;
      case 'ward': this.tone(1200, .3, { type: 'triangle', v: .1, rev: 1 }); break;
      case 'carry': this.tone(330, .8, { v: .12, rev: 1 }); this.tone(415, .8, { v: .08, rev: 1, at: T0 + .15 }); break;
      case 'ui': this.tone(1000, .04, { type: 'triangle', v: .05 }); break;
      case 'uiOpen': this.tone(600, .08, { type: 'triangle', v: .06 }); this.tone(900, .1, { type: 'triangle', v: .05, at: T0 + .05 }); break;
      case 'sell': this.tone(1318, .1, { type: 'triangle', v: .08 }); this.tone(1760, .2, { type: 'triangle', v: .07, at: T0 + .06 }); break;
      case 'keep': this.bell(659, T0, .1, this.sfxG); break;
      case 'buy': this.tone(523, .15, { type: 'triangle', v: .1 }); this.tone(784, .25, { type: 'triangle', v: .1, at: T0 + .08 }); break;
      case 'page': this.noise(.12, { f: 3000, ft: 'bandpass', v: .06 }); break;
    }
  },
  bellToll() { const T0 = this.t(); this.tone(220, 3, { v: .25, rev: 1 }); this.tone(220 * 2.76, 1.5, { v: .1, rev: 1 }); this.tone(220 * 5.4, .8, { v: .04 }); this.tone(110, 3, { type: 'triangle', v: .12, rev: 1, at: T0 }); },

  /* ---------- 音樂 ---------- */
  music(mode, chi, depth) {
    if (!this.ready) { this.want = [mode, chi, depth]; return; }
    const key = mode + ':' + chi + ':' + (mode === 'dream' ? depth : '');
    if (this.seq && this.seq.key === key) return;
    this.seq = { key, mode, chi: chi || 0, depth: depth || 0, next: this.t() + .3, step: 0 };
    this.rainOn(mode === 'dream' && chi === 4 || mode === 'scene');
  },
  rainOn(on) {
    if (!this.ready) return;
    if (on && !this.rain) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.nb; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = .5; const g = c.createGain(); g.gain.value = .06; s.connect(f); f.connect(g); g.connect(this.ambG); s.start(); this.rain = { s, g }; }
    if (!on && this.rain) { try { this.rain.s.stop(); } catch (e) {} this.rain = null; }
  },
  setTension(x) { this.tension = x; },
  tick() {
    if (!this.ready || !this.seq) return;
    const s = this.seq, now = this.t();
    while (s.next < now + .25) { this.playStep(s, s.next); }
    // 心跳
    if (this.tension >= 2 && s.mode !== 'title' && s.mode !== 'hub') {
      if (now > this.hbT) { const iv = this.tension >= 4 ? .45 : this.tension >= 3 ? .6 : .85; this.hbT = now + iv; this.tone(55, .18, { v: .28, bus: this.ambG }); this.tone(50, .16, { v: .2, bus: this.ambG, at: now + .16 }); }
    }
  },
  playStep(s, at) {
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    if (s.mode === 'title' || s.mode === 'hub' || s.mode === 'scene') {
      // 主題「晴」：音樂盒 3/4 拍
      const beat = .74;
      const mel = [[69, 1], [72, 1], [76, 1], [74, 2], [72, 1], [71, 1], [72, 1], [74, 1], [76, 3], [81, 1], [79, 1], [76, 1], [74, 2], [72, 1], [71, 1], [67, 1], [71, 1], [69, 3]];
      const bass = [45, 41, 43, 48, 41, 38, 40, 45];
      if (s.i == null) { s.i = 0; s.bar = 0; s.beatInBar = 0; }
      const [m, d] = mel[s.i % mel.length];
      if (s.mode !== 'scene' || s.i % 2 === 0) this.bell(mtof(m + 12), at, s.mode === 'hub' ? .07 : .09);
      if (s.beatInBar === 0) { const b = bass[s.bar % bass.length]; this.tone(mtof(b), beat * 3, { type: 'triangle', v: .09, bus: this.musG, lp: 600, at }); this.tone(mtof(b + 7), beat * 3, { type: 'sine', v: .04, bus: this.musG, at }); }
      if (Math.random() < .35) this.noise(.02, { f: 3000, ft: 'highpass', v: .015, bus: this.musG, at: at + Math.random() * beat });
      s.next = at + d * beat; s.i++;
      s.beatInBar += d; while (s.beatInBar >= 3) { s.beatInBar -= 3; s.bar++; }
      return;
    }
    if (s.mode === 'dream') {
      const roots = [45, 43, 41, 38, 40], r = roots[s.chi] - s.depth;
      const len = 1.6;
      const chord = [[0, 7, 15], [0, 5, 12], [-2, 5, 14], [0, 7, 14]][s.step % 4];
      if (s.step % 4 === 0) chord.forEach((iv, i) => this.tone(mtof(r + iv), len * 4.2, { type: i ? 'triangle' : 'sawtooth', v: i ? .035 : .05, bus: this.musG, lp: 700 + this.tension * 120, a: 1.2, at }));
      const tex = s.chi;
      if (tex === 0 && Math.random() < .25) this.tone(mtof(r + 36 + [0, 3, 7][(Math.random() * 3) | 0]), .25, { type: 'square', v: .012, bus: this.musG, lp: 3000, at: at + Math.random() });
      if (tex === 1) { const n = [0, 3, 7, 10, 12, 15][(Math.random() * 6) | 0]; if (Math.random() < .7) this.tone(mtof(r + 24 + n), 1.2, { type: 'triangle', v: .05, bus: this.musG, rev: 1, at: at + .2, det: (Math.random() - .5) * 30 }); }
      if (tex === 2) { this.tone(1046, .09, { type: 'sine', v: .02, bus: this.musG, at }); if (Math.random() < .5) this.tone(1800 + Math.random() * 600, .1, { v: .02, bus: this.musG, rev: 1, at: at + .7 }); }
      if (tex === 3) { if (Math.random() < .6) this.bell(mtof(r + 36 + [0, 4, 7, 11][(Math.random() * 4) | 0]), at + Math.random(), .04); if (s.step % 8 === 0) this.tone(mtof(r - 5), 3, { type: 'sine', v: .06, bus: this.musG, slide: mtof(r - 3), rev: 1, at }); }
      if (tex === 4) { const mel = [81, 79, 76, 74, 76, 72, 71, 69]; if (s.step % 2 === 0) this.bell(mtof(mel[(s.step / 2) % 8] - 12), at, .045); }
      s.next = at + len; s.step++;
      return;
    }
    if (s.mode === 'boss') {
      const b = .36, r = [45, 43, 41, 38, 40][s.chi];
      const st = s.step % 16;
      if (st % 4 === 0) { this.tone(70, .22, { slide: 35, v: .4, bus: this.musG, at }); }
      if (st % 8 === 4) this.noise(.15, { f: 2500, ft: 'bandpass', v: .14, bus: this.musG, at });
      if (st % 2 === 1) this.noise(.03, { f: 7000, ft: 'highpass', v: .03, bus: this.musG, at });
      const bl = [0, 0, 3, 0, 7, 0, 5, 3][st % 8];
      this.tone(mtof(r - 12 + bl), b * .9, { type: 'sawtooth', v: .07, lp: 500, bus: this.musG, at });
      if (st === 0) [0, 3, 7].forEach(iv => this.tone(mtof(r + 12 + iv), b * 15, { type: 'sawtooth', v: .022, lp: 1400, a: .5, bus: this.musG, at }));
      if (st % 4 === 2 && Math.random() < .5) this.bell(mtof(r + 24 + [0, 3, 7, 10][(Math.random() * 4) | 0]), at, .04);
      s.next = at + b; s.step++;
    }
  },
};
