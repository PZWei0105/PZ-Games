/* ============ 04 聲音（Web Audio 即時合成） ============ */
const AU = {
  ctx: null, on: false, last: {}, under: false, tension: 0, ambOn: false, musOn: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || this.failed) return;
    try { this.build(new AC()); } catch (e) { this.failed = true; this.ctx = null; }
  },
  build(c) {
    this.ctx = c;
    this.master = c.createGain(); this.master.gain.value = .9;
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = .5;
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.ratio.value = 5; this.comp.attack.value = .004; this.comp.release.value = .2;
    this.sfx = c.createGain(); this.mus = c.createGain(); this.amb = c.createGain();
    this.sfx.connect(this.lp); this.mus.connect(this.lp); this.amb.connect(this.lp);
    this.lp.connect(this.comp); this.comp.connect(this.master); this.master.connect(c.destination);
    // 殘響
    this.rev = c.createConvolver(); this.rev.buffer = this.makeIR(2.6, 2.2);
    this.revIn = c.createGain(); this.revIn.gain.value = .55; this.revIn.connect(this.rev); this.rev.connect(this.lp);
    // 白噪音
    const n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.nbuf = b;
    // 棕噪音（海底低鳴）
    const bb = c.createBuffer(1, n, c.sampleRate), bd = bb.getChannelData(0); let last = 0;
    for (let i = 0; i < n; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.2; }
    this.bbuf = bb;
    this.shaper = c.createWaveShaper(); const cv = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cv[i] = Math.tanh(x * 3.5); } this.shaper.curve = cv;
    this.shaper.connect(this.sfx);
    this.applyVol(); this.on = true;
  },
  makeIR(sec, decay) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  },
  applyVol() {
    if (!this.ctx) return;
    const s = (G && G.settings) || { music: .7, sfx: .9 };
    this.sfx.gain.value = s.sfx; this.amb.gain.value = .9 * s.music + .1 * s.sfx; this.mus.gain.value = s.music * .9;
    this.revIn.gain.value = .55 * s.sfx;
  },
  t() { return this.ctx.currentTime; },
  ok(name, gap) { const t = performance.now(); if (this.last[name] && t - this.last[name] < gap) return false; this.last[name] = t; return true; },
  env(g, t0, a, peak, d, sus = 0, rel = 0) {
    g.gain.cancelScheduledValues(t0); g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t0 + a);
    g.gain.exponentialRampToValueAtTime(Math.max(.0001, sus || .0001), t0 + a + d);
    if (rel) g.gain.exponentialRampToValueAtTime(.0001, t0 + a + d + rel);
  },
  out(bus, pan, rev) {
    let node = bus || this.sfx;
    if (pan) { const p = this.ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(node); node = p; }
    return node;
  },
  tone(o) {
    const c = this.ctx, t0 = this.t() + (o.at || 0), osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + (o.glide || o.dur));
    if (o.det) osc.detune.value = o.det;
    let dst = this.out(o.bus, o.pan);
    if (o.filt) { const f = c.createBiquadFilter(); f.type = o.filt; f.frequency.value = o.ff || 1000; f.Q.value = o.q || 1; f.connect(dst); dst = f; }
    osc.connect(g); g.connect(dst);
    if (o.rev) { const r = c.createGain(); r.gain.value = o.rev; g.connect(r); r.connect(this.revIn); }
    this.env(g, t0, o.a || .005, o.vol || .2, o.dur || .2);
    osc.start(t0); osc.stop(t0 + (o.a || .005) + (o.dur || .2) + .05);
    return osc;
  },
  noise(o) {
    const c = this.ctx, t0 = this.t() + (o.at || 0), s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    s.buffer = o.brown ? this.bbuf : this.nbuf; s.loop = true;
    s.playbackRate.value = o.rate || 1;
    f.type = o.filt || 'lowpass'; f.frequency.setValueAtTime(o.f || 1000, t0); f.Q.value = o.q || 1;
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t0 + (o.dur || .2));
    s.connect(f); f.connect(g); g.connect(o.dist ? this.shaper : this.out(o.bus, o.pan));
    if (o.rev) { const r = c.createGain(); r.gain.value = o.rev; g.connect(r); r.connect(this.revIn); }
    this.env(g, t0, o.a || .003, o.vol || .2, o.dur || .2);
    s.start(t0, Math.random() * 1.5); s.stop(t0 + (o.a || .003) + (o.dur || .2) + .05);
  },
  play(name, o = {}) {
    if (!this.on || !this.ctx) return;
    const v = o.vol == null ? 1 : o.vol, pan = o.pan || 0, P = (1 + (Math.random() - .5) * .12);
    if (v < .02) return;
    switch (name) {
      case 'rivet': if (!this.ok(name, 55)) return;
        this.noise({ f: 2200 * P, filt: 'bandpass', q: .9, dur: .05, vol: .26 * v, pan });
        this.tone({ f: 150 * P, f2: 55, type: 'square', dur: .05, vol: .07 * v, filt: 'lowpass', ff: 900, pan });
        this.tone({ f: 110, f2: 45, dur: .09, vol: .26 * v, pan }); break;
      case 'arc': if (!this.ok(name, 70)) return;
        for (let i = 0; i < 4; i++) this.noise({ f: 3200 + i * 900, filt: 'highpass', dur: .025, vol: .16 * v, at: i * .028, pan });
        this.tone({ f: 1800 * P, f2: 260, type: 'sawtooth', dur: .12, vol: .05 * v, filt: 'bandpass', ff: 1500, q: 2, pan }); break;
      case 'harpoon':
        this.tone({ f: 170 * P, f2: 55, dur: .16, vol: .45 * v, pan });
        this.noise({ f: 900, dur: .1, vol: .25 * v, pan });
        this.tone({ f: 860 * P, type: 'triangle', dur: .5, vol: .045 * v, pan, rev: .4 });
        this.tone({ f: 1290 * P, type: 'triangle', dur: .35, vol: .03 * v, pan }); break;
      case 'sonic':
        this.tone({ f: 85, f2: 28, dur: .7, vol: .75 * v, rev: .5 });
        this.noise({ f: 1400, f2: 90, dur: .55, vol: .45 * v, rev: .6 });
        this.tone({ f: 420, f2: 60, type: 'sawtooth', dur: .35, vol: .06 * v, filt: 'lowpass', ff: 900 }); break;
      case 'drone': if (!this.ok(name, 60)) return; this.tone({ f: 1700 * P, f2: 900, type: 'square', dur: .05, vol: .035 * v, filt: 'lowpass', ff: 3000, pan }); break;
      case 'cryo': this.noise({ f: 5000, filt: 'highpass', dur: .4, vol: .14 * v, a: .03 });
        for (let i = 0; i < 4; i++) this.tone({ f: 2400 + i * 520, type: 'sine', dur: .12, vol: .03 * v, at: .04 * i }); break;
      case 'hit': if (!this.ok(name, 35)) return; this.noise({ f: 700 * P, dur: .05, vol: .16 * v, pan }); break;
      case 'crit': if (!this.ok(name, 60)) return; this.noise({ f: 900, dur: .06, vol: .2 * v, pan }); this.tone({ f: 2200, type: 'triangle', dur: .08, vol: .06 * v, pan }); break;
      case 'armor': if (!this.ok(name, 60)) return; this.tone({ f: 1500 * P, type: 'triangle', dur: .12, vol: .05 * v, pan }); break;
      case 'kill': if (!this.ok(name, 45)) return; this.noise({ f: 600 * P, f2: 140, filt: 'bandpass', q: 2, dur: .18, vol: .26 * v, pan }); this.tone({ f: 300 * P, f2: 70, dur: .12, vol: .14 * v, pan }); break;
      case 'pop': this.noise({ f: 900, f2: 120, dur: .35, vol: .45 * v, pan, rev: .3 }); this.tone({ f: 95, f2: 35, dur: .35, vol: .45 * v, pan }); break;
      case 'door_close': this.noise({ f: 420, filt: 'bandpass', q: 4, dur: .16, vol: .32 * v, pan });
        this.tone({ f: 95, f2: 55, type: 'square', dur: .12, vol: .1 * v, filt: 'lowpass', ff: 600, pan });
        this.tone({ f: 213, type: 'triangle', dur: .6, vol: .05 * v, rev: .5, pan }); this.tone({ f: 331, type: 'triangle', dur: .45, vol: .03 * v, pan }); break;
      case 'door_open': this.noise({ f: 1700, filt: 'highpass', dur: .28, vol: .1 * v, a: .02, pan }); this.tone({ f: 160, f2: 90, type: 'square', dur: .08, vol: .06 * v, filt: 'lowpass', ff: 500, pan }); break;
      case 'door_hit': if (!this.ok(name, 110)) return; this.noise({ f: 520, dur: .12, vol: .34 * v, pan, rev: .2 }); this.tone({ f: 82, f2: 48, dur: .14, vol: .34 * v, pan }); break;
      case 'door_break': this.noise({ f: 1800, f2: 160, dur: .7, vol: .55 * v, pan, rev: .5 });
        for (let i = 0; i < 3; i++) this.tone({ f: 300 + i * 170, type: 'triangle', dur: .6, vol: .05 * v, at: .02 * i, pan }); break;
      case 'weld': if (!this.ok(name, 140)) return; this.noise({ f: 4200, filt: 'highpass', dur: .05, vol: .05 * v }); break;
      case 'tick': if (!this.ok(name, 90)) return; this.tone({ f: 980, dur: .025, vol: .035 * v }); break;
      case 'loot': { const r = o.r || 0, notes = [523, 659, 784, 988, 1175, 1568];
        for (let i = 0; i <= Math.min(5, r + 1); i++) this.tone({ f: notes[i] * (r >= 4 ? 1 : 1), type: r >= 3 ? 'triangle' : 'sine', dur: .2 + r * .05, vol: (.07 + r * .015) * v, at: i * .055, rev: r >= 3 ? .35 : .1 });
        if (r >= 3) this.noise({ f: 6000, filt: 'highpass', dur: .5, vol: .05 * v, a: .05, at: .1 }); break; }
      case 'pickup': if (!this.ok(name, 60)) return; this.tone({ f: 880, f2: 1320, dur: .07, vol: .06 * v }); break;
      case 'xp': if (!this.ok(name, 40)) return; this.tone({ f: 1200 + (o.k || 0) * 40, dur: .04, vol: .025 * v }); break;
      case 'levelup': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone({ f, type: 'triangle', dur: .3, vol: .09, at: i * .07, rev: .3 }));
        this.noise({ f: 7000, filt: 'highpass', dur: .6, vol: .05, a: .1 }); break;
      case 'ui': this.tone({ f: 1250, dur: .035, vol: .06 }); break;
      case 'ui2': this.tone({ f: 880, dur: .05, vol: .07 }); this.tone({ f: 1320, dur: .08, vol: .07, at: .06 }); break;
      case 'buy': [660, 880, 1320].forEach((f, i) => this.tone({ f, type: 'triangle', dur: .12, vol: .07, at: i * .05 })); break;
      case 'deny': this.tone({ f: 180, type: 'square', dur: .12, vol: .05, filt: 'lowpass', ff: 700 }); break;
      case 'alarm': for (let i = 0; i < 4; i++) this.tone({ f: i % 2 ? 440 : 660, type: 'square', dur: .2, vol: .07 * v, at: i * .22, filt: 'lowpass', ff: 1500 }); break;
      case 'vent': for (let i = 0; i < 9; i++) this.noise({ f: 1100 + Math.random() * 2400, filt: 'bandpass', q: 6, dur: .04, vol: .22 * v, at: i * .09 + Math.random() * .04, pan });
        this.tone({ f: 70, f2: 50, dur: .25, vol: .2 * v, pan }); this.tone({ f: 60, f2: 45, dur: .25, vol: .18 * v, at: .45, pan }); break;
      case 'shriek': this.noise({ f: 700, f2: 2800, filt: 'bandpass', q: 3, dur: .5, vol: .4 * v, dist: true });
        this.noise({ f: 2800, f2: 500, filt: 'bandpass', q: 3, dur: .9, vol: .35 * v, at: .5, dist: true });
        this.tone({ f: 240, f2: 820, type: 'sawtooth', dur: .7, vol: .08 * v, filt: 'bandpass', ff: 1200, q: 2, rev: .4 }); break;
      case 'charge': this.tone({ f: 200, f2: 1600, type: 'sine', dur: 1.4, vol: .1 * v, glide: 1.4, rev: .3 }); this.noise({ f: 400, f2: 3000, filt: 'bandpass', q: 5, dur: 1.4, vol: .08 * v }); break;
      case 'growl': if (!this.ok(name, 400)) return; this.tone({ f: 55, f2: 42, type: 'sawtooth', dur: .5, vol: .16 * v, filt: 'lowpass', ff: 260, pan }); this.noise({ f: 300, filt: 'bandpass', q: 3, dur: .4, vol: .12 * v, pan }); break;
      case 'click': if (!this.ok(name, 300)) return; for (let i = 0; i < 3; i++) this.noise({ f: 2600 + i * 300, filt: 'bandpass', q: 8, dur: .02, vol: .16 * v, at: i * .07, pan }); break;
      case 'step': if (!this.ok(name, 180)) return; this.tone({ f: 55, f2: 34, dur: .16, vol: .32 * v, pan }); this.noise({ f: 240, dur: .08, vol: .1 * v, pan }); break;
      case 'swipe': this.noise({ f: 600, f2: 2400, filt: 'bandpass', q: 1, dur: .2, vol: .35 * v, pan }); this.tone({ f: 90, f2: 40, dur: .25, vol: .4 * v, pan }); break;
      case 'heart': this.tone({ f: 62, f2: 38, dur: .1, vol: .5 * v, bus: this.mus }); this.tone({ f: 56, f2: 36, dur: .11, vol: .38 * v, at: .17, bus: this.mus }); break;
      case 'hurt': this.noise({ f: 500, dur: .18, vol: .4 * v, dist: true }); this.tone({ f: 120, f2: 50, dur: .2, vol: .3 * v }); break;
      case 'breach': this.noise({ f: 3000, filt: 'highpass', dur: .25, vol: .3 * v, pan }); this.noise({ f: 900, f2: 300, dur: 1.2, vol: .18 * v, a: .1, at: .1, pan, rev: .3 }); break;
      case 'patched': this.tone({ f: 660, dur: .08, vol: .07 }); this.tone({ f: 990, dur: .12, vol: .07, at: .08 }); break;
      case 'radio': this.noise({ f: 1800, filt: 'bandpass', q: 2, dur: .22, vol: .09 }); this.tone({ f: 1400, dur: .05, vol: .04, at: .22 }); break;
      case 'sonar': this.tone({ f: 1320, dur: .9, vol: .035 * v, rev: .6, bus: this.amb }); break;
      case 'pod': this.noise({ f: 300, f2: 3000, dur: 1.4, vol: .4, a: .3, rev: .3 }); this.tone({ f: 80, f2: 160, type: 'sawtooth', dur: 1.4, vol: .1, filt: 'lowpass', ff: 600 }); break;
      case 'sub': this.tone({ f: 55, type: 'sawtooth', dur: 2.2, vol: .22, a: .3, filt: 'lowpass', ff: 380, rev: .6 }); this.tone({ f: 82.4, type: 'sawtooth', dur: 2.2, vol: .16, a: .3, filt: 'lowpass', ff: 380 }); break;
      case 'decoy': this.tone({ f: 1760, dur: .07, vol: .06 * v, pan }); this.tone({ f: 1320, dur: .07, vol: .05 * v, at: .09, pan }); break;
      case 'throw': this.noise({ f: 800, f2: 2400, filt: 'bandpass', dur: .18, vol: .1 }); break;
      case 'med': this.noise({ f: 2600, filt: 'highpass', dur: .5, vol: .1, a: .05 }); [880, 1175].forEach((f, i) => this.tone({ f, dur: .18, vol: .06, at: .25 + i * .1 })); break;
      case 'stance_q': this.noise({ f: 900, f2: 300, dur: .3, vol: .1, a: .05 }); this.tone({ f: 520, f2: 260, dur: .2, vol: .05 }); break;
      case 'stance_f': this.noise({ f: 2500, filt: 'bandpass', q: 4, dur: .04, vol: .2 }); this.noise({ f: 1800, filt: 'bandpass', q: 4, dur: .05, vol: .2, at: .09 }); break;
      case 'shout': this.noise({ f: 700, filt: 'bandpass', q: 6, dur: .9, vol: .22 * v, a: .1, pan, rev: .5 });
        this.tone({ f: 190, f2: 150, type: 'sawtooth', dur: .9, vol: .05 * v, filt: 'bandpass', ff: 1100, q: 4, pan, rev: .5 }); break;
      case 'splash': if (!this.ok(name, 200)) return; this.noise({ f: 1400, f2: 400, dur: .25, vol: .14 * v, pan }); break;
      case 'bubble': if (!this.ok(name, 120)) return; this.tone({ f: 300 + Math.random() * 500, f2: 900, dur: .06, vol: .04 * v }); break;
      case 'rescue': [523, 784, 1047].forEach((f, i) => this.tone({ f, type: 'triangle', dur: .3, vol: .07, at: i * .1, rev: .3 })); break;
      case 'star': [784, 988, 1175, 1568].forEach((f, i) => this.tone({ f, type: 'triangle', dur: .4, vol: .08, at: i * .09, rev: .4 })); break;
      case 'fail': [392, 330, 262, 196].forEach((f, i) => this.tone({ f, type: 'triangle', dur: .5, vol: .07, at: i * .18, rev: .5 })); break;
      case 'whale': this.tone({ f: 92 + Math.random() * 30, f2: 58, type: 'sine', dur: 3.2, vol: .1 * v, a: .6, rev: .9, bus: this.amb, glide: 3 }); break;
      case 'motif': { // 三短一長
        const b = o.f || 196;
        for (let i = 0; i < 3; i++) this.tone({ f: b, type: 'sine', dur: .22, a: .04, vol: .09 * v, at: i * .36, rev: .8, bus: this.amb });
        this.tone({ f: b * .75, type: 'sine', dur: 1.4, a: .1, vol: .1 * v, at: 1.15, rev: .9, bus: this.amb }); break; }
      case 'groan': this.noise({ f: 240, f2: 110, filt: 'bandpass', q: 9, dur: 1.6, vol: .12 * v, a: .3, rev: .6, bus: this.amb }); break;
    }
  },
  /* 世界座標的聲音：距離衰減＋左右聲道 */
  at(name, x, y, o = {}) {
    if (!this.on || !W || !W.P) return;
    const p = W.P, d = Math.hypot(x - p.x, (y - p.y) * 1.3);
    const v = Math.pow(clamp(1 - d / (o.range || 1000), 0, 1), 1.3) * (o.vol == null ? 1 : o.vol);
    this.play(name, Object.assign({}, o, { vol: v, pan: clamp((x - p.x) / 520, -1, 1) * .7 }));
  },
  setUnder(on) {
    if (!this.ctx || on === this.under) return; this.under = on;
    this.lp.frequency.setTargetAtTime(on ? 650 : 20000, this.t(), .15);
  },
  /* ---------- 環境音與配樂 ---------- */
  startAmb(sec) {
    if (!this.ctx) return; this.stopAmb();
    const c = this.ctx, t0 = this.t();
    const s = c.createBufferSource(); s.buffer = this.bbuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 170; f.Q.value = .7;
    const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(.55, t0 + 2);
    s.connect(f); f.connect(g); g.connect(this.amb); s.start();
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .07; lg.gain.value = 60; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    const hum = c.createOscillator(), hg = c.createGain(); hum.frequency.value = 50; hg.gain.value = .018; hum.connect(hg); hg.connect(this.amb); hum.start();
    const hum2 = c.createOscillator(), hg2 = c.createGain(); hum2.frequency.value = 100.6; hg2.gain.value = .008; hum2.connect(hg2); hg2.connect(this.amb); hum2.start();
    this.ambNodes = [s, lfo, hum, hum2]; this.ambGain = g; this.ambOn = true; this.sec = sec || 0;
    this.nextCreak = 5; this.nextWhale = 12 + Math.random() * 10; this.nextMotif = 40;
    this.startMusic();
  },
  stopAmb() {
    if (this.ambNodes) { const t = this.t(); try { this.ambGain.gain.linearRampToValueAtTime(0, t + .6); } catch (e) { } const n = this.ambNodes; setTimeout(() => n.forEach(x => { try { x.stop(); } catch (e) { } }), 700); }
    this.ambNodes = null; this.ambOn = false; this.stopMusic();
  },
  tickAmb(dt) {
    if (!this.ambOn) return;
    this.nextCreak -= dt; this.nextWhale -= dt; this.nextMotif -= dt;
    if (this.nextCreak <= 0) { this.nextCreak = 6 + Math.random() * 10; this.play('groan', { vol: .7 + Math.random() * .5 }); }
    if (this.nextWhale <= 0) { this.nextWhale = 22 + Math.random() * 26; this.play('whale', { vol: .8 }); }
    if (this.sec >= 2 && this.nextMotif <= 0) { this.nextMotif = 70 + Math.random() * 60; this.play('motif', { vol: .7 }); }
  },
  startMusic() {
    if (!this.ctx) return; this.stopMusic();
    const c = this.ctx;
    this.padGain = c.createGain(); this.padGain.gain.value = 0;
    this.padF = c.createBiquadFilter(); this.padF.type = 'lowpass'; this.padF.frequency.value = 380; this.padF.Q.value = 2;
    this.padF.connect(this.padGain); this.padGain.connect(this.mus);
    const rv = c.createGain(); rv.gain.value = .35; this.padGain.connect(rv); rv.connect(this.revIn);
    this.padOsc = [];
    const notes = [73.42, 110, 174.6, 220];
    notes.forEach((f, i) => { for (const d of [-7, 7]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d + i; o.connect(this.padF); o.start(); this.padOsc.push(o); } });
    this.chord = 0; this.chordT = 0; this.beatT = 0; this.musOn = true;
    this.padGain.gain.linearRampToValueAtTime(.05, this.t() + 3);
  },
  stopMusic() {
    if (this.padOsc) { const o = this.padOsc; try { this.padGain.gain.linearRampToValueAtTime(0, this.t() + .5); } catch (e) { } setTimeout(() => o.forEach(x => { try { x.stop(); } catch (e) { } }), 600); }
    this.padOsc = null; this.musOn = false;
  },
  CHORDS: [[73.42, 110, 174.6, 220], [65.41, 98, 155.6, 196], [58.27, 87.31, 146.8, 174.6], [69.3, 103.8, 164.8, 207.7]],
  tickMusic(dt, tension) {
    if (!this.musOn || !this.padOsc) return;
    this.tension = lerp(this.tension, tension, Math.min(1, dt * 1.5));
    const T = this.tension, t = this.t();
    this.padF.frequency.setTargetAtTime(300 + T * 1500, t, .4);
    this.padGain.gain.setTargetAtTime(.04 + T * .05, t, .5);
    this.chordT += dt;
    if (this.chordT > 9) {
      this.chordT = 0; this.chord = (this.chord + 1) % this.CHORDS.length;
      const ch = this.CHORDS[this.chord];
      this.padOsc.forEach((o, i) => o.frequency.setTargetAtTime(ch[i >> 1], t, 1.2));
    }
    if (T > .28) {
      this.beatT -= dt;
      if (this.beatT <= 0) {
        const bpm = 72 + T * 70; this.beatT = 60 / bpm / 2;
        this.beatN = (this.beatN || 0) + 1;
        const root = this.CHORDS[this.chord][0];
        this.tone({ f: root * (this.beatN % 8 === 4 ? 1.5 : 1), type: 'triangle', dur: .16, vol: (.05 + T * .09), bus: this.mus, filt: 'lowpass', ff: 300 + T * 600 });
        if (T > .7 && this.beatN % 2 === 0) this.noise({ f: 7000, filt: 'highpass', dur: .03, vol: .025 * T, bus: this.mus });
      }
    }
  },
};
