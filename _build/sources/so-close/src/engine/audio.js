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
    this.mus = c.createGain(); this.mus.gain.value = this.musicOn ? 0.5 : 0; this.mus.connect(comp);
    // 殘響
    const len = c.sampleRate * 1.6, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.rev = c.createConvolver(); this.rev.buffer = ir;
    this.revIn = c.createGain(); this.revIn.gain.value = 0.32; this.revIn.connect(this.rev); this.rev.connect(comp);
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // 小馬達：輕柔的「嗡——」＋皮帶的細沙聲（音量刻意壓在配樂底下）
    const mo = c.createOscillator(); mo.type = 'sine'; mo.frequency.value = 190;
    const mo2 = c.createOscillator(); mo2.type = 'triangle'; mo2.frequency.value = 381;
    const g2 = c.createGain(); g2.gain.value = 0.12;
    const ns = c.createBufferSource(); ns.buffer = this.noiseBuf; ns.loop = true;
    const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1400; nf.Q.value = 1.4;
    const ng = c.createGain(); ng.gain.value = 0.22;
    const lfo = c.createOscillator(); lfo.frequency.value = 9; const lg = c.createGain(); lg.gain.value = 0.08;
    const mf = c.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 1800; mf.Q.value = 0.5;
    const mg = c.createGain(); mg.gain.value = 0;
    const trem = c.createGain(); trem.gain.value = 1;
    mo.connect(mf); mo2.connect(g2); g2.connect(mf); ns.connect(nf); nf.connect(ng); ng.connect(mf);
    lfo.connect(lg); lg.connect(trem.gain);
    mf.connect(trem); trem.connect(mg); mg.connect(this.sfx);
    mo.start(); mo2.start(); ns.start(); lfo.start();
    this.motorNodes = { mo, mo2, mf, mg, nf };
    this.motorOn = false;
    if (this.musicOn) this.startMusic();
  }
  setOn(v) { this.on = v; if (this.master) this.master.gain.setTargetAtTime(v ? this.vol : 0, this.ctx.currentTime, 0.05); }
  setMusic(v) { this.musicOn = v; if (!this.mus) return; this.mus.gain.setTargetAtTime(v ? 0.5 : 0, this.ctx.currentTime, 0.2); if (v && !this.seqTimer) this.startMusic(); }
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
    const on = level > 0.06;
    if (on !== this.motorOn) { this.motorOn = on; this.motorTick(on); }
    n.mg.gain.setTargetAtTime(on ? 0.005 + level * 0.009 : 0, t, on ? 0.06 : 0.09);
    const f = 250 * pitch * (0.94 + level * 0.1);
    n.mo.frequency.setTargetAtTime(f, t, 0.12); n.mo2.frequency.setTargetAtTime(f * 2.005, t, 0.12);
    n.nf.frequency.setTargetAtTime(1100 + 500 * pitch, t, 0.15);
  }
  // 馬達啟動／停下時的輕「喀」
  motorTick(on) { this.tone(on ? 2400 : 1900, 0.025, { type: 'triangle', vol: 0.025 }); this.noise(0.03, { vol: 0.02, f: 3200, q: 3 }); }
  land() { this.noise(0.12, { vol: 0.18, f: 900, q: 1.2 }); this.tone(110, 0.12, { vol: 0.12 }); }
  servo() { this.tone(420, 0.32, { type: 'triangle', vol: 0.035, slide: 1.5 }); this.noise(0.28, { vol: 0.02, f: 1600, q: 2, slide: 1.4 }); this.tone(1800, 0.04, { type: 'triangle', vol: 0.03, at: 0.32 }); }
  clunk() { this.noise(0.09, { vol: 0.2, f: 500, q: 2 }); this.tone(160, 0.16, { type: 'triangle', vol: 0.16 }); this.tone(95, 0.2, { vol: 0.1, at: 0.02 }); }
  tap(f) { const v = Math.min(0.22, 0.03 + f * 0.012); this.noise(0.06, { vol: v, f: 2200 + Math.random() * 1600, q: 3 }); this.tone(1200 + Math.random() * 900, 0.05, { vol: v * 0.35, type: 'triangle' }); }
  thump(f) { const v = Math.min(0.25, 0.05 + f * 0.01); this.noise(0.1, { vol: v, f: 420, q: 1 }); this.tone(90, 0.12, { vol: v * 0.8 }); }
  tick(urgent) { this.tone(urgent ? 1760 : 1320, 0.05, { type: 'square', vol: urgent ? 0.07 : 0.04 }); }
  grab() { [0, 4, 7].forEach((s, i) => this.tone(hz(72 + s), 0.18, { type: 'triangle', vol: 0.09, at: i * 0.06 })); }
  slip(near) {
    this.tone(near ? 880 : 520, 0.6, { type: 'triangle', vol: 0.06, slide: 0.45 });
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
  // ---------- 開蛋變異、盲盒、鑰匙、寶箱 ----------
  morph(v) {
    const seq = v === 'g' ? [72, 76, 79, 83, 86, 91] : [74, 78, 81, 85, 88, 93];
    seq.forEach((m, i) => this.tone(hz(m), 0.32, { type: 'triangle', vol: 0.045, at: i * 0.07, rev: 0.45 }));
    this.noise(1.0, { vol: 0.06, f: 2600, q: 2, slide: 2.6, attack: 0.6, rev: 0.4 });
  }
  morphHit(v) {
    if (v === 'g') { this.tone(hz(43), 1.8, { vol: 0.14, attack: 0.02 }); [79, 84, 88, 91, 96].forEach((m, i) => this.bell(m, 0.05 + i * 0.06, 0.1, 2.4)); }
    else [76, 80, 83, 88, 92].forEach((m, i) => this.bell(m, i * 0.06, 0.1, 1.8));
    this.noise(0.3, { vol: 0.12, f: 5200, q: 0.7, rev: 0.4 });
  }
  dim() { this.tone(160, 0.9, { type: 'sine', vol: 0.09, slide: 0.45 }); this.noise(0.7, { vol: 0.05, f: 500, q: 1, type: 'lowpass', slide: 0.4 }); }
  key() { this.tone(2093, 0.12, { type: 'triangle', vol: 0.06 }); this.tone(3136, 0.6, { vol: 0.05, at: 0.07, rev: 0.5 }); this.noise(0.05, { vol: 0.08, f: 7000, q: 3, at: 0.02 }); }
  goldShot() { [67, 72, 76, 79, 84].forEach((m, i) => this.tone(hz(m), 0.22, { type: 'square', vol: 0.04, at: i * 0.07 })); this.bell(91, 0.42, 0.12, 1.8); }
  boxOpen() { this.noise(0.16, { vol: 0.16, f: 700, q: 1.4 }); this.tone(140, 0.12, { type: 'triangle', vol: 0.1 }); this.noise(0.3, { vol: 0.06, f: 2400, q: 1.5, at: 0.14, slide: 1.5 }); }
  crinkle() { for (let i = 0; i < 6; i++) this.noise(0.04, { vol: 0.05, f: 4200 + Math.random() * 3000, q: 3, at: i * 0.05 + Math.random() * 0.02 }); }
  tear() { this.noise(0.3, { vol: 0.24, f: 3600, q: 0.9, slide: 0.55 }); this.noise(0.14, { vol: 0.1, f: 6800, q: 2, at: 0.04 }); this.tone(900, 0.08, { type: 'triangle', vol: 0.03 }); }
  chest() { this.noise(0.7, { vol: 0.07, f: 320, q: 5, slide: 1.9 }); this.tone(hz(43), 1.3, { vol: 0.14 }); [60, 64, 67, 72, 76, 79].forEach((m, i) => this.tone(hz(m), 2.6, { type: 'sine', vol: 0.035, at: 0.35 + i * 0.05, attack: 0.35, rev: 0.6 })); }
  starUp(n) { [84, 88, 91, 96].slice(0, n + 1).forEach((m, i) => this.bell(m, i * 0.1, 0.12, 1.5)); }
  glowSpawn() { [88, 91, 95].forEach((m, i) => this.bell(m, i * 0.13, 0.08, 2)); this.noise(0.9, { vol: 0.04, f: 6000, q: 1, rev: 0.6 }); }
  egg() { this.pop(); this.tone(780, 0.14, { vol: 0.12, slide: 2.2, at: 0.12 }); [84, 91].forEach((m, i) => this.bell(m, 0.18 + i * 0.08, 0.09)); }
  // ---------- 第二波：夥伴、收藏房間、外觀 ----------
  // 軟膠公仔被捏一下的「啾」
  squeak() { const f = 820 + Math.random() * 260; this.tone(f, 0.13, { type: 'triangle', vol: 0.07, slide: 1.45 }); this.tone(f * 1.5, 0.09, { vol: 0.03, at: 0.02, slide: 1.3 }); }
  boing() { this.tone(260, 0.28, { type: 'sine', vol: 0.12, slide: 2.6 }); this.tone(520, 0.18, { type: 'triangle', vol: 0.04, at: 0.04, slide: 1.8 }); }
  cheer() { [76, 81, 86].forEach((m, i) => this.tone(hz(m), 0.16, { type: 'triangle', vol: 0.06, at: 0.05 + i * 0.07 })); this.bell(93, 0.28, 0.06, 0.9); }
  aww() { this.tone(hz(74), 0.22, { type: 'triangle', vol: 0.05 }); this.tone(hz(69), 0.42, { type: 'triangle', vol: 0.05, at: 0.18, slide: 0.94 }); }
  buy() { this.coin(); [84, 88, 91].forEach((m, i) => this.bell(m, 0.15 + i * 0.07, 0.08, 1.1)); }
  paint() { this.noise(0.35, { vol: 0.08, f: 5200, q: 0.8, slide: 0.7 }); this.tone(hz(84), 0.5, { vol: 0.05, at: 0.25, rev: 0.4 }); }

  // ---------- 背景音樂：輕快、柔和的店內循環 ----------
  // 木琴般的分解和弦＋柔和低音＋偶爾出現的鐵琴旋律，沒有重鼓、沒有方波
  pluck(m, at, vol, d = 0.45, dest = this.mus) {
    const f = hz(m);
    this.tone(f, d, { type: 'sine', vol, at, attack: 0.004, dest });
    this.tone(f * 4, d * 0.25, { type: 'sine', vol: vol * 0.18, at, attack: 0.002, dest });
  }
  startMusic() {
    if (!this.ctx || this.seqTimer) return;
    const bpm = 108, beat = 60 / bpm, eighth = beat / 2;
    // I – vi – IV – V，C 大調
    const prog = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62], [60, 64, 67], [57, 60, 64], [62, 65, 69], [55, 59, 62, 65]];
    const arp = [0, 1, 2, 1, 0, 2, 1, 2];
    // 旋律（八分音符位置, 音高）兩小節一句
    const tune = [
      [[0, 76], [2, 79], [3, 81], [4, 79], [6, 76], [8, 72], [10, 74], [11, 76], [12, 74]],
      [[0, 77], [2, 76], [3, 74], [4, 72], [6, 74], [8, 76], [10, 79], [12, 77], [13, 76], [14, 74]],
      [[0, 76], [2, 79], [3, 81], [4, 84], [6, 81], [8, 79], [10, 76], [11, 77], [12, 79]],
      [[0, 77], [2, 74], [4, 76], [6, 72], [8, 74], [10, 71], [12, 72]],
    ];
    let step = 0;
    const lookahead = () => {
      const c = this.ctx;
      while (this.nextT < c.currentTime + 0.3) {
        const at = this.nextT - c.currentTime;
        const bar = Math.floor(step / 8), sub = step % 8;
        const ch = prog[bar % prog.length];
        // 分解和弦
        this.pluck(ch[arp[sub] % ch.length] + 12, at, sub === 0 ? 0.05 : 0.034, 0.5);
        // 低音：第 1、3 拍
        if (sub === 0 || sub === 4) this.tone(hz(ch[0] - 24), beat * 1.6, { type: 'triangle', vol: 0.07, at, attack: 0.01, dest: this.mus });
        // 很輕的沙鈴，只在反拍
        if (sub % 2 === 1) this.noise(0.035, { vol: 0.006, f: 7000, q: 1.2, type: 'bandpass', at, dest: this.mus });
        // 旋律：每 4 小節中有 2 小節出現，讓耳朵休息
        const phrase = Math.floor(bar / 2) % 4, inPhrase = (bar % 2) * 8 + sub;
        if ((Math.floor(bar / 8) % 2 === 0) || bar % 8 >= 4) {
          for (const [pos, m] of tune[phrase]) if (pos === inPhrase) { this.pluck(m, at, 0.04, 0.7); this.tone(hz(m) * 2, 0.6, { type: 'sine', vol: 0.008, at, rev: 0.4, dest: this.mus }); }
        }
        step++;
        this.nextT += eighth;
      }
    };
    this.nextT = this.ctx.currentTime + 0.1;
    this.seqTimer = setInterval(lookahead, 90);
  }
  duck(v) { if (this.mus) this.mus.gain.setTargetAtTime(this.musicOn ? 0.5 * v : 0, this.ctx.currentTime, 0.3); }
}
