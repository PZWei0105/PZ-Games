// 即時合成的音效與配樂（不需要任何音檔）
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Sound {
  constructor() {
    this.ctx = null;
    this.on = true;
    this.musicOn = true;
    this.vol = 0.9;
  }
  // 必須在使用者手勢內同步呼叫
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = new AC();
    this.ctx = c;
    this.master = c.createGain(); this.master.gain.value = this.on ? this.vol : 0; this.master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.connect(this.master);
    this.out = comp;
    this.sfx = c.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(comp);
    this.mus = c.createGain(); this.mus.gain.value = this.musicOn ? 0.32 : 0; this.mus.connect(comp);
    // 殘響
    const len = c.sampleRate * 1.6, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.rev = c.createConvolver(); this.rev.buffer = ir;
    this.revIn = c.createGain(); this.revIn.gain.value = 0.32; this.revIn.connect(this.rev); this.rev.connect(comp);
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // 馬達（持續音）
    const mo = c.createOscillator(); mo.type = 'sawtooth'; mo.frequency.value = 70;
    const mo2 = c.createOscillator(); mo2.type = 'square'; mo2.frequency.value = 141;
    const mf = c.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 600; mf.Q.value = 2;
    const mg = c.createGain(); mg.gain.value = 0;
    const mg2 = c.createGain(); mg2.gain.value = 0.25;
    mo.connect(mf); mo2.connect(mg2); mg2.connect(mf); mf.connect(mg); mg.connect(this.sfx);
    mo.start(); mo2.start();
    this.motorNodes = { mo, mo2, mf, mg };
    if (this.musicOn) this.startMusic();
  }
  setOn(v) { this.on = v; if (this.master) this.master.gain.setTargetAtTime(v ? this.vol : 0, this.ctx.currentTime, 0.05); }
  setMusic(v) { this.musicOn = v; if (!this.mus) return; this.mus.gain.setTargetAtTime(v ? 0.32 : 0, this.ctx.currentTime, 0.2); if (v && !this.seqTimer) this.startMusic(); }
  get t() { return this.ctx ? this.ctx.currentTime : 0; }

  tone(f, d, { type = 'sine', vol = 0.3, at = 0, attack = 0.005, rev = 0, dest = null, slide = 0, curve = 'exp' } = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack);
    if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t + d); else g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(g); g.connect(dest || this.sfx);
    if (rev) { const r = c.createGain(); r.gain.value = rev; g.connect(r); r.connect(this.revIn); }
    o.start(t); o.stop(t + d + 0.05);
  }
  noise(d, { vol = 0.2, at = 0, f = 2000, q = 1, type = 'bandpass', slide = 0, rev = 0, attack = 0.002, dest = null } = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (slide) fl.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t + d);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(dest || this.sfx);
    if (rev) { const r = c.createGain(); r.gain.value = rev; g.connect(r); r.connect(this.revIn); }
    s.start(t, Math.random() * 0.5); s.stop(t + d + 0.05);
  }

  // ---------- 音效 ----------
  click() { this.tone(1800, 0.04, { type: 'square', vol: 0.06 }); this.tone(900, 0.05, { vol: 0.08, at: 0.01 }); }
  soft() { this.tone(660, 0.08, { vol: 0.08 }); this.tone(990, 0.1, { vol: 0.05, at: 0.03 }); }
  coin() {
    this.tone(1976, 0.09, { type: 'square', vol: 0.06 }); this.tone(2637, 0.4, { type: 'triangle', vol: 0.12, at: 0.06, rev: 0.3 });
    this.noise(0.08, { vol: 0.12, f: 6000, q: 2 });
    this.noise(0.1, { vol: 0.1, f: 3000, q: 4, at: 0.18 }); this.tone(330, 0.08, { vol: 0.12, at: 0.2 });
  }
  deny() { this.tone(220, 0.14, { type: 'square', vol: 0.08 }); this.tone(180, 0.18, { type: 'square', vol: 0.08, at: 0.12 }); }
  motor(level, pitch = 1) {
    const n = this.motorNodes; if (!n) return;
    const t = this.ctx.currentTime;
    n.mg.gain.setTargetAtTime(level * 0.11, t, 0.05);
    n.mo.frequency.setTargetAtTime(62 * pitch, t, 0.08); n.mo2.frequency.setTargetAtTime(124 * pitch, t, 0.08);
    n.mf.frequency.setTargetAtTime(380 + 500 * pitch, t, 0.1);
  }
  land() { this.noise(0.12, { vol: 0.18, f: 900, q: 1.2 }); this.tone(110, 0.12, { vol: 0.12 }); }
  servo() { this.tone(300, 0.35, { type: 'sawtooth', vol: 0.05, slide: 1.8 }); this.noise(0.3, { vol: 0.05, f: 1800, q: 3, slide: 1.6 }); this.tone(1400, 0.05, { type: 'square', vol: 0.04, at: 0.34 }); }
  clunk() { this.noise(0.09, { vol: 0.2, f: 500, q: 2 }); this.tone(160, 0.16, { type: 'triangle', vol: 0.16 }); this.tone(95, 0.2, { vol: 0.1, at: 0.02 }); }
  tap(f) { const v = Math.min(0.22, 0.03 + f * 0.012); this.noise(0.06, { vol: v, f: 2200 + Math.random() * 1600, q: 3 }); this.tone(1200 + Math.random() * 900, 0.05, { vol: v * 0.35, type: 'triangle' }); }
  thump(f) { const v = Math.min(0.25, 0.05 + f * 0.01); this.noise(0.1, { vol: v, f: 420, q: 1 }); this.tone(90, 0.12, { vol: v * 0.8 }); }
  tick(urgent) { this.tone(urgent ? 1760 : 1320, 0.05, { type: 'square', vol: urgent ? 0.07 : 0.04 }); }
  grab() { [0, 4, 7].forEach((s, i) => this.tone(hz(72 + s), 0.18, { type: 'triangle', vol: 0.09, at: i * 0.06 })); }
  slip(near) {
    this.tone(near ? 880 : 520, 0.6, { type: 'sawtooth', vol: 0.05, slide: 0.45 });
    if (near) { this.crowd(); }
  }
  crowd() {
    // 「哦——」圍觀嘆氣：帶通雜訊做兩個母音共振峰
    for (const [f, v] of [[520, 0.16], [880, 0.1], [2400, 0.03]]) this.noise(1.3, { vol: v, f, q: 7, attack: 0.15, slide: 0.82, rev: 0.4 });
    this.tone(196, 1.2, { type: 'sawtooth', vol: 0.025, slide: 0.8, attack: 0.15 });
  }
  heart() { this.tone(62, 0.16, { vol: 0.25 }); this.tone(58, 0.16, { vol: 0.18, at: 0.16 }); }
  win() {
    const seq = [72, 76, 79, 84, 79, 84, 88];
    seq.forEach((m, i) => this.tone(hz(m), i === seq.length - 1 ? 0.8 : 0.16, { type: 'square', vol: 0.06, at: i * 0.09, rev: 0.2 }));
    seq.forEach((m, i) => this.tone(hz(m - 12), 0.2, { type: 'triangle', vol: 0.08, at: i * 0.09 }));
    for (let i = 0; i < 10; i++) this.tone(2000 + Math.random() * 3000, 0.25, { vol: 0.03, at: 0.6 + i * 0.05, rev: 0.4 });
  }
  drop() { this.tone(900, 0.35, { type: 'triangle', vol: 0.05, slide: 0.5 }); }
  bell(m, at = 0, vol = 0.1, d = 1.2) { this.tone(hz(m), d, { vol, at, rev: 0.5 }); this.tone(hz(m) * 2.76, d * 0.5, { vol: vol * 0.3, at, rev: 0.5 }); this.tone(hz(m) * 5.4, d * 0.25, { vol: vol * 0.12, at, rev: 0.5 }); }
  twist() { this.noise(0.5, { vol: 0.08, f: 1400, q: 6, slide: 1.4, attack: 0.05 }); this.tone(240, 0.4, { type: 'sawtooth', vol: 0.03, slide: 1.3 }); }
  pop() { this.noise(0.12, { vol: 0.3, f: 1800, q: 0.8 }); this.tone(520, 0.12, { vol: 0.15, slide: 2.4 }); }
  rumble(d = 1.2, v = 0.18) { this.noise(d, { vol: v, f: 120, q: 0.7, type: 'lowpass', attack: d * 0.6 }); this.tone(48, d, { vol: v * 0.8, attack: d * 0.5 }); }
  rise(d = 1.2) { this.tone(220, d, { type: 'sawtooth', vol: 0.04, slide: 4, attack: d * 0.8, curve: 'lin' }); this.noise(d, { vol: 0.06, f: 600, q: 1, slide: 6, attack: d * 0.9 }); }
  reveal(r) {
    if (r === 'N') { this.bell(84, 0, 0.12); return; }
    if (r === 'R') { this.bell(81, 0, 0.12); this.bell(88, 0.12, 0.12); return; }
    if (r === 'SR') { [76, 81, 85, 88, 93].forEach((m, i) => this.bell(m, i * 0.08, 0.1)); return; }
    if (r === 'SSR') {
      [60, 64, 67, 72].forEach((m) => this.tone(hz(m), 2.6, { type: 'sawtooth', vol: 0.035, attack: 0.05, rev: 0.6 }));
      [84, 88, 91, 96, 100].forEach((m, i) => this.bell(m, i * 0.07, 0.12, 2));
      this.noise(1.5, { vol: 0.08, f: 8000, q: 0.5, type: 'highpass', rev: 0.5 });
      this.tone(hz(36), 1.5, { vol: 0.2 });
      return;
    }
    // 隱藏版
    this.tone(hz(31), 3, { vol: 0.3, attack: 0.02 }); this.noise(2.2, { vol: 0.25, f: 160, q: 0.6, type: 'lowpass' });
    [48, 55, 60, 63, 67].forEach((m) => this.tone(hz(m), 3.2, { type: 'sawtooth', vol: 0.03, attack: 0.4, rev: 0.7 }));
    [87, 91, 94, 99, 103].forEach((m, i) => this.bell(m, 0.5 + i * 0.11, 0.12, 2.4));
  }
  glitch() { for (let i = 0; i < 6; i++) this.tone(200 + Math.random() * 2000, 0.04, { type: 'square', vol: 0.06, at: i * 0.05 }); this.noise(0.3, { vol: 0.15, f: 3000, q: 0.5 }); }
  rank() { [72, 76, 79, 84].forEach((m, i) => this.bell(m, i * 0.1, 0.12, 1.4)); }
  toast() { this.tone(1318, 0.12, { vol: 0.05 }); this.tone(1760, 0.18, { vol: 0.05, at: 0.07 }); }
  power() { this.tone(110, 0.6, { type: 'sawtooth', vol: 0.06, slide: 4 }); [79, 83, 86, 91].forEach((m, i) => this.tone(hz(m), 0.2, { type: 'square', vol: 0.05, at: 0.3 + i * 0.07 })); }

  // ---------- 背景音樂：輕快的店內循環 ----------
  startMusic() {
    if (!this.ctx || this.seqTimer) return;
    const bpm = 112, beat = 60 / bpm;
    // I–vi–IV–V 變化
    const prog = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 67]];
    const mel = [[76, 0], [79, 1], [81, 1.5], [79, 2.5], [76, 3], null, [72, 4], [74, 5], [76, 5.5], [72, 6.5], [69, 7], null,
      [77, 8], [76, 9], [74, 9.5], [72, 10.5], [74, 11], null, [76, 12], [79, 13], [81, 13.5], [83, 14.5], [84, 15]];
    let step = 0;
    const lookahead = () => {
      const c = this.ctx;
      while (this.nextT < c.currentTime + 0.25) {
        const t0 = this.nextT, bar = Math.floor(step / 8) % prog.length, sub = step % 8;
        const ch = prog[bar];
        const at = t0 - c.currentTime;
        if (sub % 2 === 0) this.tone(hz(ch[0] - 24), beat * 0.9, { type: 'triangle', vol: 0.16, at, dest: this.mus });
        if (sub === 2 || sub === 6) ch.slice(1).forEach((m) => this.tone(hz(m), beat * 0.5, { type: 'square', vol: 0.022, at, dest: this.mus }));
        this.noise(0.04, { vol: sub % 2 ? 0.02 : 0.035, f: 9000, q: 1, type: 'highpass', at, dest: this.mus });
        if (sub === 0 || sub === 4) this.tone(70, 0.14, { vol: 0.16, at, slide: 0.5, dest: this.mus });
        if (sub === 4) this.noise(0.12, { vol: 0.05, f: 1800, q: 0.8, at, dest: this.mus });
        // 旋律：每 16 拍一輪，隔一輪才出現，避免太吵
        const phrase = Math.floor(step / 32) % 2;
        if (phrase === 1) {
          const beatPos = (step % 32) / 2;
          for (const n of mel) if (n && Math.abs(n[1] - beatPos) < 0.01) this.tone(hz(n[0]), beat * 0.9, { type: 'sine', vol: 0.07, at, rev: 0.25, dest: this.mus });
        }
        step++;
        this.nextT += beat / 2;
      }
    };
    this.nextT = this.ctx.currentTime + 0.1;
    this.seqTimer = setInterval(lookahead, 80);
  }
  duck(v) { if (this.mus) this.mus.gain.setTargetAtTime(this.musicOn ? 0.32 * v : 0, this.ctx.currentTime, 0.3); }
}
