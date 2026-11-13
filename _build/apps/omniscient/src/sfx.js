/* 全知 OMNISCIENT — 聲音：全部用 Web Audio 當場合成，沒有任何音檔 */
const SFX = {
  ctx: null, master: null, wet: null, noiseBuf: null, padNodes: null, last: {}, mood: 0,

  /** 一定要在使用者點擊的那一刻同步呼叫（不能放在 await 後面） */
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    let c;
    try { c = new AC(); } catch { return; }
    this.ctx = c;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    comp.connect(c.destination);
    this.master = c.createGain();
    this.master.gain.value = settings.sound ? settings.vol : 0;
    this.master.connect(comp);
    // 簡單的空間感：回授延遲＋低通
    const d1 = c.createDelay(1); d1.delayTime.value = 0.19;
    const fb = c.createGain(); fb.gain.value = 0.38;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    this.wet = c.createGain(); this.wet.gain.value = 0.32;
    this.wet.connect(d1); d1.connect(lp); lp.connect(fb); fb.connect(d1); lp.connect(this.master);
    const n = c.sampleRate * 1.5, b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
    if (c.state === 'suspended') c.resume();
  },
  get on() { return !!(this.ctx && settings.sound); },
  setVolume() {
    if (!this.master) return;
    this.master.gain.setTargetAtTime(settings.sound ? settings.vol : 0, this.ctx.currentTime, 0.05);
    if (this.padNodes) this.padNodes.g.gain.setTargetAtTime(settings.sound && settings.ambient ? 0.05 : 0, this.ctx.currentTime, 0.4);
  },
  /** 同一種聲音太密就略過（例如一大串資料封包同時到） */
  gate(k, ms) { const t = performance.now(); if (this.last[k] && t - this.last[k] < ms) return false; this.last[k] = t; return true; },

  tone({ f = 440, f2 = null, type = 'sine', dur = 0.2, gain = 0.2, at = 0, attack = 0.005, wet = 0.4, pan = 0 } = {}) {
    if (!this.on) return;
    const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
    o.connect(g); out.connect(this.master);
    if (wet) { const w = c.createGain(); w.gain.value = wet; out.connect(w); w.connect(this.wet); }
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise({ dur = 0.3, gain = 0.15, f = 1200, f2 = null, q = 1, type = 'bandpass', at = 0, wet = 0.3 } = {}) {
    if (!this.on) return;
    const c = this.ctx, t = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const bq = c.createBiquadFilter(); bq.type = type; bq.Q.value = q; bq.frequency.setValueAtTime(f, t);
    if (f2) bq.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.04, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bq); bq.connect(g); g.connect(this.master);
    if (wet) { const w = c.createGain(); w.gain.value = wet; g.connect(w); w.connect(this.wet); }
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  },

  // ---------------------------------------------------------------- 音色
  tick(col = 0) { if (!this.gate('tick', 70)) return; this.tone({ f: 1900 + col * 140, type: 'sine', dur: 0.05, gain: 0.035, wet: 0.15, pan: (col - 2) * 0.3 }); },
  blip(col = 0) {
    if (!this.gate('blip' + col, 90)) return;
    const base = [523.25, 587.33, 659.25, 783.99, 880][col % 5];
    this.tone({ f: base * 2, type: 'triangle', dur: 0.16, gain: 0.07, pan: (col - 2) * 0.35 });
    this.tone({ f: base * 3, type: 'sine', dur: 0.1, gain: 0.03, at: 0.03, pan: (col - 2) * 0.35 });
  },
  light(i = 0) { this.tone({ f: 330 * Math.pow(2, (i % 8) / 6), f2: 660 * Math.pow(2, (i % 8) / 6), type: 'sine', dur: 0.22, gain: 0.06, wet: 0.5 }); },
  stamp(kind) {
    if (!this.gate('stamp', 140)) return;
    this.tone({ f: kind === 'opinion' ? 150 : 110, f2: 55, type: 'sine', dur: 0.18, gain: 0.22, wet: 0.1 });
    this.noise({ dur: 0.08, gain: 0.08, f: 2400, q: 0.8 });
    if (kind === 'opinion') this.tone({ f: 740, type: 'square', dur: 0.08, gain: 0.025, at: 0.06 });
    if (kind === 'official') this.tone({ f: 1318.5, type: 'sine', dur: 0.3, gain: 0.04, at: 0.05 });
  },
  chime(dir = 1) {
    const maj = [523.25, 659.25, 783.99, 1046.5], min = [440, 523.25, 659.25, 880];
    (dir >= 0 ? maj : min).forEach((f, i) => this.tone({ f, type: 'triangle', dur: 0.9, gain: 0.07, at: i * 0.09, wet: 0.6 }));
  },
  beam() { if (!this.gate('beam', 600)) return; this.noise({ dur: 1.1, gain: 0.07, f: 300, f2: 4200, q: 3, wet: 0.5 }); this.tone({ f: 90, f2: 180, type: 'sine', dur: 0.9, gain: 0.08 }); },
  alert() { if (!this.gate('alert', 800)) return; this.tone({ f: 880, type: 'square', dur: 0.09, gain: 0.03 }); this.tone({ f: 660, type: 'square', dur: 0.12, gain: 0.03, at: 0.12 }); },
  hover() { if (!this.gate('hover', 60)) return; this.tone({ f: 2600, type: 'sine', dur: 0.03, gain: 0.015, wet: 0 }); },
  click() { this.tone({ f: 1200, f2: 800, type: 'triangle', dur: 0.07, gain: 0.05, wet: 0.1 }); },
  /** 開機：低頻嗡鳴慢慢升起 */
  bootDrone() {
    if (!this.on) return;
    const c = this.ctx, t = c.currentTime;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 2.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 5.6);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(120, t); lp.frequency.exponentialRampToValueAtTime(2400, t + 4.6); lp.Q.value = 6;
    lp.connect(g); g.connect(this.master);
    const w = c.createGain(); w.gain.value = 0.5; g.connect(w); w.connect(this.wet);
    [55, 55.4, 82.4, 110.2].forEach((f, i) => { const o = c.createOscillator(); o.type = i < 2 ? 'sawtooth' : 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2, t + 5); o.connect(lp); o.start(t); o.stop(t + 5.8); });
  },
  /** 眼睛睜開那一下 */
  awaken() {
    this.tone({ f: 55, f2: 38, type: 'sine', dur: 1.6, gain: 0.35, wet: 0.2 });
    this.noise({ dur: 1.4, gain: 0.12, f: 6000, f2: 200, q: 0.7, type: 'lowpass', wet: 0.6 });
    [261.63, 392, 523.25, 783.99, 1046.5].forEach((f, i) => this.tone({ f, type: 'sine', dur: 2.2, gain: 0.05, at: 0.05 + i * 0.05, wet: 0.8 }));
  },
  typeKey() { if (!this.gate('key', 35)) return; this.noise({ dur: 0.025, gain: 0.04, f: 3800 + Math.random() * 1500, q: 2, wet: 0 }); },

  /** 環境底噪：和弦跟著大盤方向（漲＝大調、跌＝小調、平＝懸掛），音量很小 */
  pad(mood = 0) {
    if (!this.ctx) return;
    this.mood = mood;
    const c = this.ctx, t = c.currentTime;
    const chords = { 1: [130.81, 196, 246.94, 329.63], '-1': [110, 164.81, 196, 261.63], 0: [123.47, 185, 246.94, 277.18] };
    const fs = chords[mood > 0 ? 1 : mood < 0 ? -1 : 0];
    if (!this.padNodes) {
      const g = c.createGain(); g.gain.value = 0.0001;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.7;
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 280; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      lp.connect(g); g.connect(this.master);
      const w = c.createGain(); w.gain.value = 0.6; g.connect(w); w.connect(this.wet);
      const oscs = fs.map((f, i) => { const o = c.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (i - 1.5) * 4; o.connect(lp); o.start(); return o; });
      this.padNodes = { g, oscs };
    } else {
      this.padNodes.oscs.forEach((o, i) => o.frequency.setTargetAtTime(fs[i], t, 1.5));
    }
    this.padNodes.g.gain.setTargetAtTime(settings.sound && settings.ambient ? 0.05 : 0, t, 1.2);
  },
};
