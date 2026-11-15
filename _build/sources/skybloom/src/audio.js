// 全部即時合成：煙火的發射、呼嘯、爆炸（照距離延遲）、爆米花、園區華爾滋、煙火秀配樂、雲霄飛車、人群
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Sound {
  constructor() { this.ctx = null; this.sfxOn = true; this.musicOn = true; this.vol = 0.9; this.mode = 'park'; }

  // 一定要在使用者手勢裡同步呼叫（iPhone）
  unlock() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    const o = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = o; s.connect(c.destination); s.start(0);
    this.master = c.createGain(); this.master.gain.value = this.vol; this.master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25; comp.connect(this.master);
    this.out = comp;
    this.sfx = c.createGain(); this.sfx.gain.value = this.sfxOn ? 1 : 0; this.sfx.connect(comp);
    this.mus = c.createGain(); this.mus.gain.value = this.musicOn ? 0.55 : 0; this.mus.connect(comp);
    this.amb = c.createGain(); this.amb.gain.value = this.sfxOn ? 1 : 0; this.amb.connect(comp);
    // 長殘響：煙火在城市與山之間的回音
    const len = c.sampleRate * 3.2, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) { const t = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (i < c.sampleRate * 0.12 ? 0.3 : 1); } }
    this.rev = c.createConvolver(); this.rev.buffer = ir; this.rev.connect(this.sfx);
    this.revIn = c.createGain(); this.revIn.gain.value = 0.55; this.revIn.connect(this.rev);
    // 音樂用的短殘響
    const ir2 = c.createBuffer(2, c.sampleRate * 1.6, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir2.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.4); }
    this.mrev = c.createConvolver(); this.mrev.buffer = ir2; this.mrev.connect(this.mus);
    this.mrevIn = c.createGain(); this.mrevIn.gain.value = 0.35; this.mrevIn.connect(this.mrev);
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = this.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // 預先做好爆米花的劈啪聲、掌聲
    this.crackBuf = this.mkCrackle(2.2, 160);
    this.clapBuf = this.mkClaps(5);
    this.ambience();
    this.ride = null;
    this.seqT = c.currentTime + 0.1; this.step = 0;
    this.timer = setInterval(() => this.schedule(), 60);
  }
  setVol(v) { this.vol = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }
  setSfx(on) { this.sfxOn = on; if (this.ctx) { this.sfx.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05); this.amb.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05); } }
  setMusic(on) { this.musicOn = on; if (this.ctx) this.mus.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.1); }
  suspend(s) { if (!this.ctx) return; if (s) this.ctx.suspend(); else this.ctx.resume(); }

  mkCrackle(dur, n) {
    const c = this.ctx, b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = b.getChannelData(0);
    for (let k = 0; k < n; k++) {
      const t0 = Math.floor(Math.pow(Math.random(), 0.7) * (d.length - 2000)), A = 0.4 + Math.random() * 0.6, L = 60 + Math.random() * 400;
      for (let i = 0; i < L; i++) d[t0 + i] += (Math.random() * 2 - 1) * A * Math.exp(-i / (L * 0.25));
    }
    return b;
  }
  mkClaps(dur) {
    const c = this.ctx, b = c.createBuffer(2, c.sampleRate * dur, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let k = 0; k < dur * 260; k++) {
        const t = Math.random(), env = t < 0.08 ? t / 0.08 : Math.pow(1 - (t - 0.08) / 0.92, 1.4);
        if (Math.random() > env) continue;
        const t0 = Math.floor(t * (d.length - 1200)), A = 0.15 + Math.random() * 0.3;
        for (let i = 0; i < 900; i++) d[t0 + i] += (Math.random() * 2 - 1) * A * Math.exp(-i / 90);
      }
    }
    return b;
  }

  src(buf, at = 0, rate = 1, offset = 0) { const s = this.ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate; s.start(at, offset); return s; }
  env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  pan(x) { const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : this.ctx.createGain(); if (p.pan) p.pan.value = x; return p; }
  ok() { return this.ctx && this.ctx.state === 'running'; }

  launch(dist, whistle) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + Math.min(0.5, dist / 340 * 0.6), v = 1 / (1 + dist / 90);
    // 砲筒「咚」
    const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
    this.env(g, t, 0.004, 0.55 * v, 0.25); o.connect(g); g.connect(this.sfx); g.connect(this.revIn); o.start(t); o.stop(t + 0.35);
    const n = this.src(this.noise, t, 1, Math.random()), f = c.createBiquadFilter(), gn = c.createGain(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
    this.env(gn, t, 0.002, 0.35 * v, 0.12); n.connect(f); f.connect(gn); gn.connect(this.sfx); n.stop(t + 0.2);
    // 上升的嘶嘶聲／哨音
    const h = this.src(this.noise, t, 1, Math.random()), hf = c.createBiquadFilter(), hg = c.createGain(); hf.type = 'highpass'; hf.frequency.value = 3500;
    hg.gain.setValueAtTime(0.0001, t); hg.gain.linearRampToValueAtTime(0.08 * v, t + 0.2); hg.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    h.connect(hf); hf.connect(hg); hg.connect(this.sfx); h.stop(t + 1.7);
    if (whistle) {
      const w = c.createOscillator(), wg = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      w.type = 'sine'; w.frequency.setValueAtTime(900 + Math.random() * 300, t + 0.05); w.frequency.exponentialRampToValueAtTime(2600 + Math.random() * 900, t + 1.9);
      lfo.frequency.value = 22; lg.gain.value = 40; lfo.connect(lg); lg.connect(w.frequency);
      wg.gain.setValueAtTime(0.0001, t); wg.gain.linearRampToValueAtTime(0.07 * v, t + 0.3); wg.gain.linearRampToValueAtTime(0.05 * v, t + 1.6); wg.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
      w.connect(wg); wg.connect(this.sfx); wg.connect(this.revIn); w.start(t); lfo.start(t); w.stop(t + 2.05); lfo.stop(t + 2.05);
    }
  }

  boom(dist, size, type) {
    if (!this.ok()) return;
    const c = this.ctx, delay = Math.min(1.2, dist / 340 * 0.75), t = c.currentTime + delay, v = Math.min(1.2, size) / (1 + dist / 140);
    const pn = this.pan((Math.random() - 0.5) * 0.6); pn.connect(this.sfx);
    // 尖銳的爆裂
    const cr = this.src(this.noise, t, 1, Math.random()), cf = c.createBiquadFilter(), cg = c.createGain(); cf.type = 'highpass'; cf.frequency.value = 1400;
    this.env(cg, t, 0.001, 0.8 * v, 0.06); cr.connect(cf); cf.connect(cg); cg.connect(pn); cr.stop(t + 0.12);
    // 主體：低通慢慢關
    const b = this.src(this.noise, t, 0.7, Math.random()), bf = c.createBiquadFilter(), bg = c.createGain(); bf.type = 'lowpass'; bf.Q.value = 0.7;
    bf.frequency.setValueAtTime(2400, t); bf.frequency.exponentialRampToValueAtTime(160, t + 0.9);
    this.env(bg, t, 0.003, 1.3 * v, type === 'mini' ? 0.5 : 1.6); b.connect(bf); bf.connect(bg); bg.connect(pn); bg.connect(this.revIn); b.stop(t + 1.9);
    // 胸口的震動
    const s = c.createOscillator(), sg = c.createGain(); s.type = 'sine'; s.frequency.setValueAtTime(82, t); s.frequency.exponentialRampToValueAtTime(34, t + 0.7);
    this.env(sg, t, 0.004, 0.9 * v, 0.8); s.connect(sg); sg.connect(this.sfx); s.start(t); s.stop(t + 0.9);
    // 錦冠、垂柳：落下時細細的沙沙聲
    if (type === 'willow' || type === 'kamuro') {
      const z = this.src(this.noise, t + 0.3, 1, Math.random()), zf = c.createBiquadFilter(), zg = c.createGain(); zf.type = 'bandpass'; zf.frequency.value = 5200; zf.Q.value = 0.6;
      zg.gain.setValueAtTime(0.0001, t + 0.3); zg.gain.linearRampToValueAtTime(0.09 * v, t + 1.2); zg.gain.exponentialRampToValueAtTime(0.0001, t + 4.8);
      z.connect(zf); zf.connect(zg); zg.connect(pn); z.stop(t + 5);
    }
    if (type === 'strobe') this.crackle(dist, 2.6, 0, 0.5);
  }
  crackle(dist, after = 1.4, _n = 0, level = 1) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + Math.min(1.2, dist / 340 * 0.75) + after, v = level / (1 + dist / 140);
    const s = this.src(this.crackBuf, t, 0.9 + Math.random() * 0.25), g = c.createGain(), f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
    g.gain.value = 0.9 * v; s.connect(f); f.connect(g); g.connect(this.sfx); g.connect(this.revIn);
  }
  pop(dist) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + Math.min(1.2, dist / 340 * 0.75), v = 1 / (1 + dist / 140);
    const n = this.src(this.noise, t, 1.3, Math.random()), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.value = 1600;
    this.env(g, t, 0.001, 0.5 * v, 0.15); n.connect(f); f.connect(g); g.connect(this.sfx); g.connect(this.revIn); n.stop(t + 0.2);
  }
  applause(level = 1) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + 0.2;
    const s = this.src(this.clapBuf, t), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 0.5;
    g.gain.value = 0.55 * level; s.connect(f); f.connect(g); g.connect(this.sfx); g.connect(this.revIn);
    this.cheer(level * 0.8, 0.1);
  }
  // 人群「哇——」
  cheer(level = 1, at = 0) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + at;
    for (const [fq, q, k] of [[620, 3, 1], [1150, 4, 0.6], [2500, 5, 0.25]]) {
      const n = this.src(this.noise, t, 1, Math.random()), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.setValueAtTime(fq * 0.85, t); f.frequency.linearRampToValueAtTime(fq, t + 0.6); f.Q.value = q;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32 * level * k, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      n.connect(f); f.connect(g); g.connect(this.amb); g.connect(this.revIn); n.stop(t + 2.7);
    }
  }
  ui(kind = 'tap') {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime;
    const notes = { tap: [88], open: [76, 83], close: [83, 76], pick: [91], shot: [96, 84], rec: [72, 79], start: [72, 76, 79, 84] }[kind] || [88];
    notes.forEach((m, i) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = hz(m); this.env(g, t + i * 0.05, 0.004, 0.12, 0.18); o.connect(g); g.connect(this.sfx); o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.25); });
  }
  // 快門
  shutter() {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime;
    for (const d of [0, 0.07]) { const n = this.src(this.noise, t + d, 1, Math.random()), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.value = 3200; this.env(g, t + d, 0.001, 0.4, 0.05); n.connect(f); f.connect(g); g.connect(this.sfx); n.stop(t + d + 0.08); }
  }

  // 環境：人群低語、風
  ambience() {
    const c = this.ctx;
    const n = this.src(this.noise, 0); n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.6;
    const g = c.createGain(); g.gain.value = 0.045;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 0.018; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    n.connect(f); f.connect(g); g.connect(this.amb);
    this.crowdG = g;
    const w = this.src(this.noise, 0, 0.5); w.loop = true;
    const wf = c.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 500;
    const wg = c.createGain(); wg.gain.value = 0.02;
    const wl = c.createOscillator(), wlg = c.createGain(); wl.frequency.value = 0.07; wlg.gain.value = 250; wl.connect(wlg); wlg.connect(wf.frequency); wl.start();
    w.connect(wf); wf.connect(wg); wg.connect(this.amb);
    this.windG = wg;
    // 乘坐用：轟隆聲、風切
    const r = this.src(this.noise, 0, 0.6); r.loop = true;
    const rf = c.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 220;
    const rg = c.createGain(); rg.gain.value = 0;
    r.connect(rf); rf.connect(rg); rg.connect(this.sfx);
    const s = this.src(this.noise, 0, 1); s.loop = true;
    const sf = c.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 900; sf.Q.value = 0.4;
    const sg = c.createGain(); sg.gain.value = 0;
    s.connect(sf); sf.connect(sg); sg.connect(this.sfx);
    this.rideN = { rf, rg, sf, sg, clack: 0 };
  }
  setWeather(snow) { if (this.windG) this.windG.gain.setTargetAtTime(snow ? 0.07 : 0.02, this.ctx.currentTime, 1); }
  // 乘坐中每格呼叫：speed m/s、lift 是否在鏈條上
  rideUpdate(dt, speed, lift, kind) {
    if (!this.ctx) return;
    const R = this.rideN, t = this.ctx.currentTime;
    const on = kind != null; speed = Math.min(Math.abs(speed) || 0, 45);
    R.rg.gain.setTargetAtTime(on && kind === 'coaster' ? Math.min(0.5, speed * 0.022) : 0, t, 0.08);
    R.rf.frequency.setTargetAtTime(120 + speed * 14, t, 0.1);
    R.sg.gain.setTargetAtTime(on ? Math.min(0.32, speed * speed * 0.0006) : 0, t, 0.1);
    R.sf.frequency.setTargetAtTime(500 + speed * 45, t, 0.1);
    if (lift && on) {
      R.clack += dt;
      if (R.clack > 0.13) { R.clack = 0; const n = this.src(this.noise, t, 1, Math.random()), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 3; this.env(g, t, 0.001, 0.4, 0.04); n.connect(f); f.connect(g); g.connect(this.sfx); n.stop(t + 0.06); }
    }
  }
  clunk() {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    this.env(g, t, 0.002, 0.3, 0.2); o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 0.25);
  }

  // ───── 音樂 ─────
  setMode(m) { if (this.mode === m) return; this.mode = m; if (this.ctx) { this.seqT = this.ctx.currentTime + 0.15; this.step = 0; } }
  startShow() { this.setMode('show'); return this.seqT; }
  schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx;
    if (this.seqT < c.currentTime - 0.5) this.seqT = c.currentTime + 0.05;
    while (this.seqT < c.currentTime + 0.25) {
      if (this.mode === 'show') { this.showStep(this.step, this.seqT); this.seqT += 60 / SHOW_BPM / 4; }
      else if (this.mode === 'park') { this.waltzStep(this.step, this.seqT); this.seqT += 60 / 138; }
      else this.seqT += 0.25;
      this.step++;
    }
  }
  note(m, t, d, type, vol, { att = 0.006, rev = 0.3, dest = null, det = 0, filt = 0 } = {}) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = hz(m); if (det) o.detune.value = det;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    let n = o;
    if (filt) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt; o.connect(f); n = f; }
    n.connect(g); g.connect(dest || this.mus); if (rev) { const s = c.createGain(); s.gain.value = rev; g.connect(s); s.connect(this.mrevIn); }
    o.start(t); o.stop(t + d + 0.05);
  }
  // 園區的華爾滋（原創旋律，三拍子，像音樂盒加手風琴）
  waltzStep(i, t) {
    const bar = Math.floor(i / 3) % 16, beat = i % 3;
    const ch = WALTZ_CH[bar];
    if (beat === 0) { this.note(ch[0] - 12, t, 0.5, 'triangle', 0.16, { rev: 0.1 }); this.note(ch[0] - 24, t, 0.45, 'sine', 0.16, { rev: 0 }); }
    else for (const m of ch.slice(1)) this.note(m, t, 0.22, 'triangle', 0.045, { rev: 0.15, filt: 2200 });
    for (const [b, m, len] of WALTZ_MEL) if (b === bar * 3 + beat) {
      this.note(m, t, Math.max(0.35, len * 0.42), 'triangle', 0.1, { att: 0.004, rev: 0.45 });
      this.note(m + 12, t, 0.5, 'sine', 0.05, { att: 0.002, rev: 0.5 });
    }
  }
  // 煙火秀配樂：小調史詩，31 小節（每小節 16 格）
  showStep(i, t) {
    const bar = Math.floor(i / 16), s = i % 16;
    if (bar >= SHOW_BARS + 1) { if (s === 0 && bar === SHOW_BARS + 1) this.setMode('park'); return; }
    const sec = showSection(bar);
    const ch = SHOW_CH[bar % 4];
    const spb = 60 / SHOW_BPM, barLen = spb * 4;
    if (bar === SHOW_BARS) { // 最後的長和弦
      if (s === 0) { for (const m of [45, 57, 60, 64, 69, 72, 76]) { this.note(m, t, 5.5, 'sawtooth', 0.035, { att: 0.02, rev: 0.6, filt: 2400, det: 8 }); this.note(m, t, 5.5, 'sawtooth', 0.035, { att: 0.02, rev: 0.6, filt: 2400, det: -8 }); } this.crash(t, 0.5); this.kick(t, 1); this.timp(t, 0.9); }
      return;
    }
    if (s === 0) {
      // 和弦墊底
      const pv = [0.03, 0.035, 0.04, 0.045, 0.05][Math.floor(sec)];
      for (const m of ch) for (const d of [-9, 9]) this.note(m, t, barLen * 1.05, 'sawtooth', pv, { att: barLen * 0.3, rev: 0.5, filt: 900 + sec * 500, det: d });
      if (sec >= 1) this.note(ch[0] - 12, t, barLen, 'sine', 0.12, { rev: 0 });
      if (sec >= 2 && bar % 4 === 0) this.crash(t, 0.22 + sec * 0.06);
    }
    // 低音八分音符
    if (sec >= 2 && s % 2 === 0) this.note(ch[0] - 12, t, 0.2, 'sawtooth', 0.07, { rev: 0, filt: 500 + sec * 150 });
    // 琶音
    if (sec >= 1) { const arp = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[1], ch[0] + 12, ch[2]]; if (sec >= 3 || s % 2 === 0) this.note(arp[s % 8] + 12, t, 0.18, 'square', 0.026, { rev: 0.35, filt: 1800 + sec * 600 }); }
    // 鼓
    if (sec >= 1 && s === 0) this.kick(t, 0.9);
    if (sec >= 2) {
      if (s === 8 || (sec >= 3 && (s === 6 || s === 10))) this.kick(t, 0.8);
      if (s === 4 || s === 12) this.snare(t, 0.5);
      if (sec >= 3 && s % 2 === 1) this.hat(t, 0.08);
    }
    if (sec === 2.5 || bar === 19) { // 漸強的小鼓滾奏
      const prog = (bar - 16) / 4, every = prog < 0.5 ? 4 : prog < 0.75 ? 2 : 1;
      if (s % every === 0) this.snare(t, 0.15 + prog * 0.45);
    }
    if (sec >= 3 && s === 0) this.timp(t, 0.6);
    if (bar === 27 && s >= 8 && s % 2 === 0) this.tom(t, 0.5, 52 - (s - 8));
  }
  kick(t, v) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16); this.env(g, t, 0.003, v * 0.5, 0.3); o.connect(g); g.connect(this.mus); o.start(t); o.stop(t + 0.35); }
  snare(t, v) { const c = this.ctx, n = this.src(this.noise, t, 1, Math.random()), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.7; this.env(g, t, 0.002, v * 0.32, 0.16); n.connect(f); f.connect(g); g.connect(this.mus); const s = c.createGain(); s.gain.value = 0.3; g.connect(s); s.connect(this.mrevIn); n.stop(t + 0.2); this.note(50, t, 0.08, 'triangle', v * 0.12, { rev: 0 }); }
  hat(t, v) { const c = this.ctx, n = this.src(this.noise, t, 1, Math.random()), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'highpass'; f.frequency.value = 7000; this.env(g, t, 0.001, v, 0.05); n.connect(f); f.connect(g); g.connect(this.mus); n.stop(t + 0.07); }
  crash(t, v) { const c = this.ctx, n = this.src(this.noise, t, 1, Math.random()), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'highpass'; f.frequency.value = 4500; this.env(g, t, 0.002, v * 0.4, 1.8); n.connect(f); f.connect(g); g.connect(this.mus); const s = c.createGain(); s.gain.value = 0.4; g.connect(s); s.connect(this.mrevIn); n.stop(t + 1.9); }
  timp(t, v) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.5); this.env(g, t, 0.004, v * 0.4, 1.1); o.connect(g); g.connect(this.mus); const s = c.createGain(); s.gain.value = 0.4; g.connect(s); s.connect(this.mrevIn); o.start(t); o.stop(t + 1.2); }
  tom(t, v, m) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(hz(m) * 1.6, t); o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.12); this.env(g, t, 0.003, v * 0.4, 0.3); o.connect(g); g.connect(this.mus); o.start(t); o.stop(t + 0.35); }
}

export const SHOW_BPM = 96, SHOW_BARS = 30;
export const showSection = (bar) => (bar < 4 ? 0 : bar < 8 ? 1 : bar < 16 ? 2 : bar < 20 ? 2.5 : bar < 28 ? 3 : 4);
const SHOW_CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G
// 華爾滋：每小節的和弦（根音、和弦音）
const C_ = [48, 64, 67, 72], G_ = [43, 62, 67, 71], F_ = [41, 60, 65, 69], Dm = [50, 62, 65, 69], Am = [45, 60, 64, 69], Em = [40, 59, 64, 67], G7 = [43, 59, 65, 67];
const WALTZ_CH = [C_, G_, F_, C_, Dm, F_, G_, C_, Am, Em, F_, C_, Dm, G_, G7, C_];
// [第幾拍, 音高, 拍長]
const WALTZ_MEL = (() => {
  const bars = [
    [[76, 1], [79, 1], [84, 1]], [[83, 2], [79, 1]], [[81, 1], [77, 1], [81, 1]], [[79, 3]],
    [[77, 1], [81, 1], [86, 1]], [[84, 2], [81, 1]], [[83, 1], [79, 1], [83, 1]], [[84, 3]],
    [[88, 1], [86, 1], [84, 1]], [[83, 2], [81, 1]], [[81, 1], [79, 1], [77, 1]], [[76, 3]],
    [[74, 1], [76, 1], [77, 1]], [[79, 1], [81, 1], [83, 1]], [[86, 2], [83, 1]], [[84, 3]],
  ];
  const out = [];
  bars.forEach((b, i) => { let beat = i * 3; for (const [m, l] of b) { out.push([beat, m, l]); beat += l; } });
  return out;
})();
