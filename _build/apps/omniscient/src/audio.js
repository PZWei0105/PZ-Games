/* 全知 OMNISCIENT — 聲音：主題配樂（串流播放、循環）＋取樣音效（全部 D 小調、跟著音樂的節拍落下） */
const AU = {
  ctx: null, master: null, music: null, musicGain: null, sfxGain: null, an: null, fbuf: null,
  bufs: {}, info: { bpm: 100, beat: 0.6, bar: 2.4, sections: [] }, ready: false, energy: 0, lastSec: null, duckT: 0,

  /** 開頁就先準備（AudioContext 這時候是暫停的，可以先把音效解碼好） */
  prepare() { if (!this.ctx) this.init(true); },
  /** 使用者點下去的那一刻同步呼叫：解除靜音、開始放配樂 */
  unlock() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.playMusic(5.0);
  },
  init(early) {
    if (this.ctx) { if (!early && this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch { try { this.ctx = new AC(); } catch { return; } }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = settings.sound ? 1 : 0;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -6; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(c.destination);
    this.musicGain = c.createGain(); this.musicGain.gain.value = 0;
    this.sfxGain = c.createGain(); this.sfxGain.gain.value = settings.sfxVol;
    this.an = c.createAnalyser(); this.an.fftSize = 1024; this.an.smoothingTimeConstant = 0.6;
    this.fbuf = new Uint8Array(this.an.frequencyBinCount);
    this.musicGain.connect(this.an); this.an.connect(this.master);
    this.sfxGain.connect(this.master);
    // 配樂：<audio> 串流（不必整首解碼進記憶體），接進 Web Audio 好控制音量
    const m = new Audio();
    m.src = 'audio/theme.mp3'; m.loop = true; m.preload = 'auto'; m.crossOrigin = 'anonymous';
    m.setAttribute('playsinline', '');
    this.music = m;
    try { c.createMediaElementSource(m).connect(this.musicGain); } catch { /* 舊瀏覽器：直接播 */ }
    if (!early && c.state === 'suspended') c.resume();
    fetch('audio/theme.json').then((r) => r.json()).then((j) => { this.info = j; }).catch(() => {});
    const names = ['boot_rise', 'boot_hit', 'tick1', 'tick2', 'tick3', 'blip1', 'blip2', 'stamp_official', 'stamp_fact', 'stamp_opinion', 'scan', 'chime_up', 'chime_down', 'alert', 'click', 'report', 'burst', 'panel1', 'panel2', 'panel3', 'panel4', 'panel5', 'panel6'];
    Promise.all(names.map((n) => fetch('audio/' + n + '.mp3').then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => c.decodeAudioData(ab, res, rej))).then((b) => { this.bufs[n] = { b, off: this.leadIn(b) }; }).catch(() => {})))
      .then(() => { this.ready = true; });
  },
  /** MP3 開頭有一小段編碼器補的靜音：找到第一個有聲音的樣本，從那裡開始播，才對得準拍子 */
  leadIn(b) {
    const d = b.getChannelData(0);
    const lim = Math.min(d.length, b.sampleRate * 0.2);
    for (let i = 0; i < lim; i++) if (Math.abs(d[i]) > 0.0015) return Math.max(0, i - 8) / b.sampleRate;
    return 0;
  },
  get on() { return !!(this.ctx && settings.sound); },

  // ---------------------------------------------------------------- 配樂
  playMusic(fade = 2.5) {
    if (!this.music || !settings.music) return;
    const p = this.music.play();
    if (p && p.catch) p.catch(() => {});
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(settings.musicVol, t + fade);
  },
  stopMusic(fade = 1.2) {
    if (!this.music) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => { if (!settings.music) this.music.pause(); }, fade * 1000 + 50);
  },
  /** 戰報、重要時刻：配樂先讓一點位置 */
  duck(amount = 0.45, hold = 1.6) {
    if (!this.ctx || !settings.music) return;
    const g = this.musicGain.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(settings.musicVol * amount, t + 0.15);
    g.setValueAtTime(settings.musicVol * amount, t + hold);
    g.linearRampToValueAtTime(settings.musicVol, t + hold + 1.2);
  },
  setVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(settings.sound ? 1 : 0, t, 0.05);
    this.sfxGain.gain.setTargetAtTime(settings.sfxVol, t, 0.05);
    if (settings.music) { if (this.music.paused && settings.sound) this.playMusic(1.5); else this.musicGain.gain.setTargetAtTime(settings.musicVol, t, 0.1); }
    else this.stopMusic(0.8);
  },
  musicTime() { return this.music && !this.music.paused ? this.music.currentTime : null; },
  /** 配樂現在在哪一段（給畫面跟著音樂呼吸用；不影響任何數字） */
  section() {
    const mt = this.musicTime();
    if (mt == null) return null;
    let cur = null;
    for (const s of this.info.sections || []) if (mt >= s.t) cur = s.name;
    return cur;
  },
  /** 低頻能量（0～1）：泛光跟著鼓點輕輕呼吸 */
  pulse(dt) {
    if (!this.an || !this.music || this.music.paused) { this.energy *= 0.95; return this.energy; }
    this.an.getByteFrequencyData(this.fbuf);
    const bin = this.ctx.sampleRate / this.an.fftSize;
    const hi = Math.max(2, Math.round(150 / bin));
    let s = 0;
    for (let i = 1; i < hi; i++) s += this.fbuf[i];
    const v = Math.min(1, Math.max(0, (s / (hi - 1) / 255 - 0.35) / 0.5));
    this.energy += (v - this.energy) * Math.min(1, dt * (v > this.energy ? 18 : 4));
    return this.energy;
  },

  // ---------------------------------------------------------------- 音效
  /** quant：對齊配樂的 32 分音符（最多延後 75ms）；pan：-1～1 */
  sfx(name, { gain = 1, pan = 0, quant = false, rate = 1, gate = 0 } = {}) {
    if (!this.on) return;
    const e = this.bufs[name];
    if (!e) return;
    if (gate) { const k = 'g_' + name, t = performance.now(); if (this[k] && t - this[k] < gate) return; this[k] = t; }
    const c = this.ctx;
    let when = c.currentTime + 0.005;
    const mt = this.musicTime();
    if (quant && mt != null) {
      const g = (this.info.beat || 0.6) / 8;
      const d = (g - (mt % g)) % g;
      if (d < 0.08) when += d;
    }
    const src = c.createBufferSource();
    src.buffer = e.b; src.playbackRate.value = rate;
    const gn = c.createGain(); gn.gain.value = gain;
    let node = gn;
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); gn.connect(p); node = p; }
    src.connect(gn); node.connect(this.sfxGain);
    src.start(when, e.off);
  },
  /** 依畫面上的位置決定左右（光點從左邊的卡片打到右邊的卡片，聲音也從左到右） */
  panOf(el) {
    if (!el || !el.getBoundingClientRect) return 0;
    const r = el.getBoundingClientRect();
    return clamp(((r.left + r.width / 2) / innerWidth) * 2 - 1, -1, 1) * 0.7;
  },
};
