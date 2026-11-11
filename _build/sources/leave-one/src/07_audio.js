// ===== 聲音：全部即時合成。鼓就是心跳，獸越躁、鼓越急；洞穴裡有回音 =====
const A = {
  ctx: null, on: store.get('sound', true), noiseBuf: null, drumNext: 0, gustT: 0, gust: 0, tick0: 0,
  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    let c;
    try { c = new AC(); } catch (e) { return; }
    this.ctx = c;
    this.master = c.createGain(); this.master.gain.value = this.on ? 0.9 : 0;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.22;
    this.master.connect(comp); comp.connect(c.destination);
    const len = Math.floor(c.sampleRate * 2);
    const b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
    this.verb = c.createConvolver(); this.verb.buffer = this.impulse(2.8, 2.4);
    this.wet = c.createGain(); this.wet.gain.value = 0.34;
    this.verb.connect(this.wet); this.wet.connect(this.master);
    this.sfx = c.createGain(); this.sfx.connect(this.master); this.sfx.connect(this.verb);
    this.amb = c.createGain(); this.amb.gain.value = 0.85; this.amb.connect(this.master);
    this.mus = c.createGain(); this.mus.gain.value = 0.9; this.mus.connect(this.master);
    this.musVerb = c.createGain(); this.musVerb.gain.value = 0.5; this.mus.connect(this.musVerb); this.musVerb.connect(this.verb);
    this.beds();
    if (c.state !== 'running') c.resume();
  },
  setOn(v) {
    this.on = v; store.set('sound', v);
    if (this.ctx) this.master.gain.setTargetAtTime(v ? 0.9 : 0, this.ctx.currentTime, 0.05);
  },
  impulse(sec, decay) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 400 ? i / 400 : 1);
      }
    }
    return b;
  },
  noise(loop) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = !!loop;
    return s;
  },
  out(pan, bus) {
    const c = this.ctx;
    const g = c.createGain();
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -0.9, 0.9); g.connect(p); p.connect(bus || this.sfx); }
    else g.connect(bus || this.sfx);
    return g;
  },
  env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  },
  filt(type, f, q) { const x = this.ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q) x.Q.value = q; return x; },
  osc(type, f) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; },
  nz(t, dur, type, f, q, peak, a, pan, bus, sweepTo) {
    const n = this.noise(false), fl = this.filt(type, f, q), g = this.out(pan, bus);
    if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    n.connect(fl); fl.connect(g);
    this.env(g, t, a, peak, dur);
    n.start(t, Math.random() * 1.2); n.stop(t + a + dur + 0.05);
  },
  tone(t, type, f0, f1, a, peak, dur, pan, bus) {
    const o = this.osc(type, f0), g = this.out(pan, bus);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + a + dur);
    o.connect(g); this.env(g, t, a, peak, dur);
    o.start(t); o.stop(t + a + dur + 0.05);
  },
  beds() {
    const c = this.ctx;
    const wn = this.noise(true), wf = this.filt('bandpass', 500, 0.7), wg = c.createGain();
    wg.gain.value = 0; wn.connect(wf); wf.connect(wg); wg.connect(this.amb); wn.start(0, Math.random());
    this.windF = wf; this.windG = wg;
    const fn = this.noise(true), ff = this.filt('lowpass', 380, 0.8), fg = c.createGain();
    fg.gain.value = 0; fn.connect(ff); ff.connect(fg); fg.connect(this.amb); fn.start(0, Math.random());
    this.fireG = fg;
    const o1 = this.osc('sawtooth', 55), o2 = this.osc('sawtooth', 55.35), o3 = this.osc('sine', 27.5);
    const df = this.filt('lowpass', 160, 2), dg = c.createGain();
    dg.gain.value = 0;
    o1.connect(df); o2.connect(df); o3.connect(dg); df.connect(dg); dg.connect(this.mus);
    o1.start(); o2.start(); o3.start();
    this.droneF = df; this.droneG = dg;
  },
  T(p, v, tc) { p.setTargetAtTime(v, this.ctx.currentTime, tc); },
  // 每格更新環境聲與鼓
  tick(dt, st) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    this.gustT -= dt;
    if (this.gustT <= 0) { this.gustT = 0.6 + Math.random() * 1.4; this.gust = Math.random(); }
    const aw = Math.abs(st.wind);
    this.T(this.windG.gain, (0.02 + 0.03 * aw) * (0.6 + 0.6 * this.gust) * st.vol, 0.5);
    this.T(this.windF.frequency, 340 + 170 * aw + this.gust * 500, 0.6);
    this.T(this.fireG.gain, Math.min(0.24, st.fire * 0.022) * st.vol, 0.25);
    const rate = 1.5 + st.fire * 4.5;
    let n = 0, acc = rate * dt;
    while (Math.random() < acc && n < 4) { acc -= 1; n++; this.pop(now + Math.random() * dt, 0.03 + Math.min(0.12, st.fire * 0.012), (Math.random() - 0.5) * 0.8); }
    const tn = st.tension;
    this.T(this.droneG.gain, (0.014 + 0.034 * tn) * st.vol, 0.7);
    this.T(this.droneF.frequency, 130 + 560 * tn, 0.7);
    if (st.drums) {
      const bpm = 52 + 112 * tn, iv = 60 / bpm;
      if (this.drumNext < now) this.drumNext = now + 0.05;
      while (this.drumNext < now + 0.16) {
        this.drum(this.drumNext, (0.5 + 0.4 * tn) * st.vol, 0);
        this.drum(this.drumNext + iv * 0.27, (0.28 + 0.26 * tn) * st.vol, 1);
        if (tn > 0.5) this.shaker(this.drumNext + iv * 0.55, tn * st.vol);
        this.drumNext += iv;
      }
    } else this.drumNext = 0;
  },
  drum(t, vel, w) {
    const f0 = w ? 72 : 84;
    const o = this.osc('sine', f0), g = this.out(0, this.mus);
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.5, t + 0.22);
    o.connect(g); this.env(g, t, 0.004, vel * 0.55, 0.42);
    o.start(t); o.stop(t + 0.5);
    this.nz(t, 0.06, 'lowpass', 900, 0.7, vel * 0.1, 0.002, 0, this.mus);
  },
  shaker(t, v) { this.nz(t, 0.07, 'highpass', 5200, 0.7, 0.05 * v, 0.003, 0.3, this.mus); },
  pop(t, v, pan) { this.nz(t, 0.025 + Math.random() * 0.04, 'bandpass', 1500 + Math.random() * 3000, 3, v, 0.001, pan); },
  // ---------- 音效 ----------
  whoosh(power, kind) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (kind === 'fire') { this.nz(t, 0.55, 'bandpass', 240, 1.2, 0.3 * power + 0.1, 0.04, -0.3, null, 900); this.pop(t + 0.1, 0.1, -0.2); this.pop(t + 0.22, 0.08, 0); }
    else this.nz(t, 0.4, 'bandpass', 420, 2, 0.28 * power + 0.12, 0.03, -0.3, null, 2000);
    this.tone(t, 'sine', 160, 90, 0.01, 0.08, 0.12, -0.4);
  },
  thud(kind, pan) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (kind === 'flesh') { this.tone(t, 'sine', 150, 52, 0.003, 0.75, 0.2, pan); this.nz(t, 0.08, 'lowpass', 900, 0.7, 0.45, 0.002, pan); }
    else if (kind === 'rock') { this.nz(t, 0.05, 'bandpass', 2700, 4, 0.5, 0.001, pan); this.tone(t, 'triangle', 1800, 1200, 0.001, 0.18, 0.08, pan); this.tone(t + 0.07, 'triangle', 1500, 1100, 0.001, 0.08, 0.06, pan); }
    else if (kind === 'tusk') { this.tone(t, 'triangle', 980, 700, 0.001, 0.35, 0.14, pan); this.nz(t, 0.05, 'bandpass', 2200, 3, 0.4, 0.001, pan); }
    else if (kind === 'ice') this.crack(1, pan);
    else { this.tone(t, 'sine', 105, 44, 0.003, 0.5, 0.18, pan); this.nz(t, 0.1, 'lowpass', 500, 0.7, 0.3, 0.002, pan); }
  },
  ignite(pan) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.nz(t, 0.9, 'lowpass', 300, 0.8, 0.55, 0.03, pan, null, 2600);
    this.tone(t, 'sine', 70, 50, 0.02, 0.32, 0.6, pan);
    for (let i = 0; i < 6; i++) this.pop(t + 0.1 + Math.random() * 0.6, 0.12, pan);
  },
  hiss(pan) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.nz(t, 1.2, 'highpass', 2600, 0.7, 0.32, 0.01, pan);
    this.nz(t, 0.9, 'bandpass', 6200, 2, 0.18, 0.01, pan);
  },
  crack(lvl, pan) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.nz(t, 0.04, 'highpass', 2000, 0.7, 0.25 + lvl * 0.18, 0.001, pan);
    // 冰特有的「咻」聲
    this.tone(t, 'sine', 2600 + Math.random() * 600, 700 + Math.random() * 300, 0.002, 0.1 + lvl * 0.08, 0.28, pan);
  },
  iceBreak(pan) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.nz(t, 1.2, 'lowpass', 6000, 0.7, 0.95, 0.004, pan, null, 500);
    this.tone(t, 'sine', 62, 34, 0.005, 0.85, 0.9, pan);
    for (let i = 0; i < 6; i++) setTimeout(() => this.crack(2, pan + (Math.random() - 0.5) * 0.4), i * 70 + Math.random() * 60);
  },
  splash(pan, size = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.nz(t, 0.8 * size, 'lowpass', 1500, 0.8, 0.6 * size, 0.01, pan, null, 400);
    for (let i = 0; i < 7 * size; i++) this.tone(t + 0.1 + Math.random() * 0.8, 'sine', 300 + Math.random() * 300, 800 + Math.random() * 500, 0.005, 0.05, 0.08, pan);
  },
  trumpet(kind, pan) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const dur = kind === 'rage' ? 1.35 : kind === 'balk' ? 0.85 : 1.0;
    const base = kind === 'rage' ? 230 : kind === 'balk' ? 300 : 320;
    const o1 = this.osc('sawtooth', base), o2 = this.osc('square', base * 1.012);
    for (const o of [o1, o2]) {
      o.frequency.setValueAtTime(base * 0.75, t);
      o.frequency.linearRampToValueAtTime(base * 1.65, t + 0.13);
      o.frequency.linearRampToValueAtTime(base * 1.45, t + dur * 0.6);
      o.frequency.linearRampToValueAtTime(base * 1.02, t + dur);
    }
    const lfo = this.osc('sine', kind === 'rage' ? 5.5 : 7.5), lg = c.createGain();
    lg.gain.value = 16; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    const sh = c.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = (i / 255) * 2 - 1; curve[i] = Math.tanh(x * 3.2); }
    sh.curve = curve;
    const pre = c.createGain(); pre.gain.value = 0.5;
    const f1 = this.filt('bandpass', 950, 3.5), f2 = this.filt('bandpass', 2400, 4.5), lp = this.filt('lowpass', 4200, 0.7);
    const g = this.out(pan);
    o1.connect(pre); o2.connect(pre); pre.connect(sh); sh.connect(f1); sh.connect(f2); f1.connect(lp); f2.connect(lp); lp.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85, t + 0.06);
    g.gain.setValueAtTime(0.85, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.start(t); o2.start(t); lfo.start(t);
    o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
    this.nz(t, dur * 0.9, 'bandpass', 1600, 1, 0.2, 0.05, pan);
    if (kind === 'rage') this.tone(t, 'sawtooth', 58, 46, 0.1, 0.22, dur, pan);
  },
  stomp(heavy, pan) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(t, 'sine', 58, 34, 0.004, 0.55 * heavy, 0.26, pan);
    this.nz(t, 0.14, 'lowpass', 300, 0.7, 0.3 * heavy, 0.003, pan);
  },
  groan(pan) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.osc('sawtooth', 92), f = this.filt('lowpass', 420, 2), g = this.out(pan);
    o.frequency.exponentialRampToValueAtTime(48, t + 2);
    o.connect(f); f.connect(g); this.env(g, t, 0.15, 0.45, 1.9);
    o.start(t); o.stop(t + 2.2);
  },
  knock() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(t, 'sine', 640, 330, 0.002, 0.25, 0.06, 0);
    this.nz(t, 0.03, 'bandpass', 1800, 3, 0.15, 0.001, 0);
  },
  chime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(t, 'triangle', 1318, 0, 0.004, 0.08, 0.7, 0, this.mus);
    this.tone(t + 0.06, 'triangle', 1976, 0, 0.004, 0.05, 0.6, 0, this.mus);
  },
  gustFx() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.nz(t, 1.3, 'bandpass', 300, 1.2, 0.22, 0.25, 0, this.amb, 1300);
  },
  flute(notes, step = 0.32) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + 0.05;
    notes.forEach((f, i) => {
      if (!f) return;
      const t = t0 + i * step, d = i === notes.length - 1 ? step * 3.5 : step * 1.1;
      const o = this.osc('sine', f), o2 = this.osc('sine', f * 2.01), g = this.out(0, this.mus), g2 = this.ctx.createGain();
      g2.gain.value = 0.12; o2.connect(g2); g2.connect(g);
      const v = this.osc('sine', 5.2), vg = this.ctx.createGain(); vg.gain.value = f * 0.008; v.connect(vg); vg.connect(o.frequency);
      o.connect(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.06);
      g.gain.setValueAtTime(0.16, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.start(t); o2.start(t); v.start(t); o.stop(t + d + 0.05); o2.stop(t + d + 0.05); v.stop(t + d + 0.05);
      this.nz(t, d * 0.8, 'bandpass', f * 2, 2, 0.025, 0.05, 0, this.mus);
    });
  },
  roll() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    let t = t0;
    for (let i = 0; i < 14; i++) { this.drum(t, 0.25 + i * 0.04, i % 2); t += 0.16 - i * 0.008; }
    this.drum(t + 0.05, 1.0, 0); this.drum(t + 0.08, 0.7, 1);
  },
  spray() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) this.nz(t + i * 0.26, 0.2, 'highpass', 2800, 0.7, 0.1, 0.02, 0.2);
  },
  light() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.nz(t, 1.1, 'lowpass', 200, 0.8, 0.5, 0.02, 0, null, 3000);
    for (let i = 0; i < 8; i++) this.pop(t + 0.15 + Math.random() * 0.9, 0.12, (Math.random() - 0.5) * 0.4);
  },
};
