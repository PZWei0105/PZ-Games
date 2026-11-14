/* ===== 合成音效（WebAudio，必須在點擊當下同步建立） ===== */
const Sound = {
  ctx: null, master: null, sfx: null, mus: null, nb: null, on: true, last: {}, amb: null, beatT: 0, heartT: 0,
  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ping(); return; }
    if (!PZ.audio.unlock()) return; // 引擎在這個點擊裡同步建立音訊，並處理 iPhone 靜音鍵
    this.ctx = PZ.audio.ctx;
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.on ? 1 : 0; this.master.connect(PZ.audio.bus.sfx);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.connect(this.master);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.55; this.sfx.connect(comp);
    this.mus = c.createGain(); this.mus.gain.value = 0.5; this.mus.connect(PZ.audio.bus.music); // 背景音走引擎的「音樂」音量
    const len = c.sampleRate; const b = c.createBuffer(1, len, c.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.nb = b;
    this.ping();
    if (this.want) { const w = this.want; this.want = null; this.startAmb(w); }
  },
  ping() { const c = this.ctx; if (!c) return; try { if (c.state === 'suspended') c.resume(); const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0); } catch (e) { } },
  setOn(v) { this.on = v; if (this.master) this.master.gain.setTargetAtTime(v ? 1 : 0, this.ctx.currentTime, 0.03); },
  ok(n, gap) { if (!this.ctx || !this.on) return false; const t = this.ctx.currentTime; if (this.last[n] !== undefined && t - this.last[n] < gap) return false; this.last[n] = t; return true; },
  env(g, t0, a, peak, dec) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dec); },
  noise(dur, o) {
    o = o || {}; const c = this.ctx, t0 = c.currentTime + (o.when || 0), a = o.a || 0.003;
    const src = c.createBufferSource(); src.buffer = this.nb; src.loop = true;
    const f = c.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.f || 1200, t0);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + a + dur); f.Q.value = o.q || 0.7;
    const g = c.createGain(); this.env(g, t0, a, o.g || 0.4, dur);
    src.connect(f); f.connect(g); g.connect(o.bus || this.sfx);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + a + dur + 0.05);
  },
  tone(freq, dur, o) {
    o = o || {}; const c = this.ctx, t0 = c.currentTime + (o.when || 0), a = o.a || 0.003;
    const os = c.createOscillator(); os.type = o.type || 'square'; os.frequency.setValueAtTime(freq, t0);
    if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t0 + a + dur);
    const g = c.createGain(); this.env(g, t0, a, o.g || 0.2, dur);
    let node = os;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; os.connect(f); node = f; }
    node.connect(g); g.connect(o.bus || this.sfx); os.start(t0); os.stop(t0 + a + dur + 0.05);
  },
  play(n) {
    if (!this.ctx || !this.on) return;
    switch (n) {
      case 'pistol': if (!this.ok(n, 0.045)) return; this.noise(0.13, { f: 2800, f2: 450, g: 0.42 }); this.tone(200, 0.08, { f2: 60, g: 0.16 }); break;
      case 'shotgun': if (!this.ok(n, 0.08)) return; this.noise(0.32, { f: 2000, f2: 260, g: 0.8 }); this.tone(120, 0.2, { type: 'sawtooth', f2: 38, g: 0.22 }); break;
      case 'rifle': if (!this.ok(n, 0.05)) return; this.noise(0.08, { type: 'bandpass', f: 2300, q: 0.8, g: 0.5 }); this.tone(240, 0.05, { f2: 90, g: 0.12 }); break;
      case 'swing': if (!this.ok(n, 0.08)) return; this.noise(0.14, { type: 'bandpass', f: 700, f2: 2600, q: 1.2, g: 0.22 }); break;
      case 'hit': if (!this.ok(n, 0.035)) return; this.noise(0.06, { f: 900, g: 0.28 }); this.tone(95, 0.06, { type: 'sine', f2: 50, g: 0.25 }); break;
      case 'bat': if (!this.ok(n, 0.06)) return; this.tone(150, 0.09, { type: 'triangle', f2: 70, g: 0.4 }); this.noise(0.08, { f: 1500, g: 0.3 }); break;
      case 'splat': if (!this.ok(n, 0.05)) return; this.noise(0.2, { f: 700, f2: 160, g: 0.35 }); break;
      case 'clank': if (!this.ok(n, 0.06)) return; this.tone(1400, 0.05, { type: 'square', f2: 900, g: 0.08 }); this.tone(2100, 0.07, { type: 'triangle', g: 0.07 }); break;
      case 'hurt': if (!this.ok(n, 0.15)) return; this.tone(150, 0.22, { type: 'sawtooth', f2: 55, g: 0.28, lp: 900 }); this.noise(0.18, { f: 500, g: 0.25 }); break;
      case 'boom': if (!this.ok(n, 0.07)) return; this.noise(0.9, { f: 1400, f2: 70, g: 0.95 }); this.tone(80, 0.6, { type: 'sine', f2: 28, g: 0.6 }); break;
      case 'level': this.tone(523, 0.1, { g: 0.12 }); this.tone(659, 0.1, { g: 0.12, when: 0.07 }); this.tone(784, 0.1, { g: 0.12, when: 0.14 }); this.tone(1046, 0.25, { g: 0.13, when: 0.21 }); break;
      case 'pick': if (!this.ok(n, 0.05)) return; this.tone(880, 0.07, { f2: 1320, g: 0.12 }); break;
      case 'reload': if (!this.ok(n, 0.3)) return; this.tone(1300, 0.02, { g: 0.08 }); this.tone(700, 0.03, { g: 0.1, when: 0.12 }); break;
      case 'click': if (!this.ok(n, 0.04)) return; this.tone(900, 0.03, { g: 0.07 }); break;
      case 'boss': this.tone(55, 1.4, { type: 'sawtooth', g: 0.35, lp: 400, a: 0.05 }); this.tone(58.3, 1.4, { type: 'sawtooth', g: 0.3, lp: 400, a: 0.05 }); this.noise(1.2, { f: 300, g: 0.3, a: 0.2 }); break;
      case 'thunder': this.noise(2.6, { f: 380, f2: 50, g: 0.75, a: 0.04 }); break;
      case 'dodge': if (!this.ok(n, 0.1)) return; this.noise(0.14, { type: 'highpass', f: 1400, g: 0.2 }); break;
      case 'molotov': this.noise(0.18, { type: 'highpass', f: 3200, g: 0.3 }); this.noise(0.7, { f: 600, g: 0.45, a: 0.06, when: 0.05 }); break;
      case 'crowd': if (!this.ok(n, 0.6)) return; this.noise(1.6, { type: 'bandpass', f: 1100, q: 0.4, g: 0.35, a: 0.25 }); break;
      case 'siren': this.tone(620, 0.35, { type: 'triangle', f2: 880, g: 0.12 }); this.tone(880, 0.35, { type: 'triangle', f2: 620, g: 0.12, when: 0.38 }); this.tone(620, 0.35, { type: 'triangle', f2: 880, g: 0.12, when: 0.76 }); break;
      case 'ach': this.tone(784, 0.08, { g: 0.1 }); this.tone(1175, 0.18, { g: 0.1, when: 0.08 }); break;
      case 'combo': if (!this.ok(n, 0.3)) return; this.tone(440, 0.08, { g: 0.12 }); this.tone(660, 0.08, { g: 0.12, when: 0.06 }); this.tone(990, 0.16, { g: 0.12, when: 0.12 }); break;
      case 'groan': if (!this.ok(n, 1.2)) return; this.tone(rand(85, 120), 0.6, { type: 'sawtooth', f2: rand(55, 70), g: 0.06, lp: 500, a: 0.08 }); break;
      case 'type': if (!this.ok(n, 0.05)) return; this.tone(rand(1400, 1700), 0.012, { g: 0.025 }); break;
      case 'stun': this.tone(1200, 0.1, { type: 'triangle', f2: 600, g: 0.1 }); this.tone(900, 0.1, { type: 'triangle', f2: 450, g: 0.1, when: 0.1 }); break;
      case 'phone': this.tone(1318, 0.08, { type: 'sine', g: 0.15 }); this.tone(1568, 0.12, { type: 'sine', g: 0.15, when: 0.1 }); break;
    }
  },
  startAmb(kind) {
    this.stopAmb();
    if (!this.ctx) { this.want = kind; return; }
    const c = this.ctx, nodes = [], gains = [];
    const src = c.createBufferSource(); src.buffer = this.nb; src.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = kind === 'rain' ? 450 : 150;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'rain' ? 5200 : kind === 'indoor' ? 600 : 1500;
    const g = c.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(kind === 'rain' ? 0.15 : kind === 'indoor' ? 0.05 : 0.08, c.currentTime, 0.8);
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.mus); src.start();
    nodes.push(src); gains.push(g);
    const o1 = c.createOscillator(), o2 = c.createOscillator(); o1.type = o2.type = 'sawtooth'; o1.frequency.value = 55; o2.frequency.value = 55.7;
    const dl = c.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 170; dl.Q.value = 3;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.06; const lg = c.createGain(); lg.gain.value = 80; lfo.connect(lg); lg.connect(dl.frequency);
    const dg = c.createGain(); dg.gain.value = 0.0001; dg.gain.setTargetAtTime(0.06, c.currentTime, 1.2);
    o1.connect(dl); o2.connect(dl); dl.connect(dg); dg.connect(this.mus); o1.start(); o2.start(); lfo.start();
    nodes.push(o1, o2, lfo); gains.push(dg);
    this.amb = { nodes, gains };
  },
  stopAmb() {
    if (!this.amb || !this.ctx) { this.amb = null; return; }
    const t = this.ctx.currentTime; for (const g of this.amb.gains) g.gain.setTargetAtTime(0.0001, t, 0.25);
    const nodes = this.amb.nodes; setTimeout(() => { for (const n of nodes) { try { n.stop(); } catch (e) { } } }, 1400);
    this.amb = null;
  },
  tick(dt, intensity, low) {
    if (!this.ctx || !this.on) return;
    this.beatT -= dt;
    if (this.beatT <= 0) {
      const gap = intensity > 1.5 ? 0.3 : intensity > 0.6 ? 0.45 : 0.85;
      this.beatT += gap;
      if (intensity > 0.15) this.tone(60, 0.2, { type: 'sine', f2: 38, g: 0.3 * Math.min(1, intensity), bus: this.mus });
      if (intensity > 1.5 && Math.random() < 0.5) this.noise(0.04, { type: 'highpass', f: 6500, g: 0.05, bus: this.mus });
    }
    if (low) {
      this.heartT -= dt;
      if (this.heartT <= 0) { this.heartT = 0.85; this.tone(72, 0.1, { type: 'sine', g: 0.38, f2: 46, bus: this.mus }); this.tone(66, 0.1, { type: 'sine', g: 0.28, f2: 42, when: 0.17, bus: this.mus }); }
    }
  }
};

