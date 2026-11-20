/* ==========================================================================
   50 聲音：Web Audio 即時合成（不放音檔）——冷眼 fx.js、解包 audio.js 的做法
   手機的規矩（違反就沒聲音、甚至卡住）：
   - AudioContext 一定要在**點擊的當下（同步）**建立或 resume；放在 await 後面，iPhone 會擋（畫面還可能卡住）。
     所以 App 在整個頁面掛「任何一次點擊、按鍵都順便 unlock()」（capture），開門、啟動按鈕的 handler 第一行也呼叫。
   - iPhone 從背景回來是 interrupted（不是 suspended），一樣要在點擊當下叫醒。
   - iPhone 側邊靜音開關：audioSession.type = 'ambient' 才會跟著靜音（冷眼這樣）；要蓋過靜音（看預告、說書）用 'playback'。
   - App 到背景就停配樂（visibilitychange），回來再接。
   合成器（makeSynth，配方跟冷眼機甲 HUD 一樣、參數一樣）：tone 振盪器＋包絡＋滑音＋顫音、noise 濾波白噪音、
   pluck 撥弦（Karplus–Strong）、fm 電鋼琴、bell 鐘磬。時間一律是「從現在起幾秒後」。
   音色組：{ 名字: (A) => { A.tone(…); A.noise(…) } }；每一組用 trim（dB）校正到跟原本那一組一樣大聲（OfflineAudioContext 量 RMS）。
     const snd = PZA.sound({ session: 'ambient', bank: MY_SOUNDS, vol: () => 設定的音量(0～1.5) });
     document.addEventListener('pointerdown', () => snd.unlock(), { capture: true });
     snd.play('stamp');
   ========================================================================== */
function makeNoise(c, sec, seed0) {
  const len = Math.floor(c.sampleRate * (sec || 1.2));
  const b = c.createBuffer(1, len, c.sampleRate);
  const ch = b.getChannelData(0);
  let seed = seed0 || 7;   // 固定種子：每次聽起來都一樣
  for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; ch[i] = (seed / 2147483647) * 2 - 1; }
  return b;
}

function makeSynth(c, out, wetIn, nb) {
  const T = (at) => c.currentTime + at;
  const route = (node, o) => {
    let n = node;
    if (o.pan) { try { const p = c.createStereoPanner(); p.pan.value = o.pan; n.connect(p); n = p; } catch (e) { /* 舊瀏覽器 */ } }
    n.connect(o.out || out);
    if (o.wet && (o.wetTo || wetIn)) { const w = c.createGain(); w.gain.value = o.wet; n.connect(w); w.connect(o.wetTo || wetIn); }
  };
  const env = (g, t0, dur, peak, a, o) => {
    if (o.rel) {
      const r = Math.min(o.rel, dur * 0.95);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + a);
      g.gain.setValueAtTime(peak, Math.max(t0 + a, t0 + dur - r));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    } else {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    }
  };
  function tone(f, at, dur, o) {
    o = o || {};
    const t0 = T(at);
    const osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (o.det) osc.detune.setValueAtTime(o.det, t0);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.glide), t0 + (o.glideT || dur));
    if (o.vib) {
      const lfo = c.createOscillator(); lfo.frequency.value = o.vib.rate || 5.5;
      const d = c.createGain(); d.gain.setValueAtTime(0, t0); d.gain.linearRampToValueAtTime(o.vib.depth || 12, t0 + (o.vib.delay || 0.15));
      lfo.connect(d).connect(osc.detune); lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    const g = c.createGain();
    env(g, t0, dur, o.gain == null ? 0.1 : o.gain, o.attack == null ? 0.004 : o.attack, o);
    let node = osc;
    if (o.lp) {
      const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t0);
      if (o.q) fl.Q.value = o.q;
      if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(Math.max(40, o.lpTo), t0 + (o.lpT || dur));
      osc.connect(fl); node = fl;
    }
    node.connect(g);
    route(g, o);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  function noise(at, dur, o) {
    o = o || {};
    const t0 = T(at);
    const src = c.createBufferSource(); src.buffer = nb;
    const fl = c.createBiquadFilter(); fl.type = o.type || 'bandpass';
    fl.frequency.setValueAtTime(o.f || 1200, t0);
    if (o.glide) fl.frequency.exponentialRampToValueAtTime(o.glide, t0 + dur);
    fl.Q.value = o.q == null ? 1 : o.q;
    const g = c.createGain();
    env(g, t0, dur, o.gain == null ? 0.08 : o.gain, o.attack == null ? 0.01 : o.attack, o);
    src.connect(fl).connect(g);
    route(g, o);
    src.start(t0, o.off == null ? Math.random() * 0.2 : o.off); src.stop(t0 + dur + 0.05);
  }
  const plucks = new Map();
  function pluckBuf(f, damp, soft, len) {
    const key = Math.round(f * 10) + '|' + damp + '|' + soft + '|' + len + '|' + c.sampleRate;
    let b = plucks.get(key);
    if (b) return b;
    const sr = c.sampleRate, N = Math.max(2, Math.round(sr / f)), L = Math.floor(sr * len);
    b = c.createBuffer(1, L, sr);
    const y = b.getChannelData(0), ring = new Float32Array(N);
    let seed = 1234 + N;
    for (let i = 0; i < N; i++) { seed = (seed * 16807) % 2147483647; ring[i] = (seed / 2147483647) * 2 - 1; }
    for (let k = 0; k < soft; k++) for (let i = 0; i < N; i++) ring[i] = 0.5 * (ring[i] + ring[(i + 1) % N]);
    let mx = 0;
    for (let i = 0; i < N; i++) mx = Math.max(mx, Math.abs(ring[i]));
    const sc = mx > 0 ? 1 / mx : 1;
    let idx = 0;
    for (let i = 0; i < L; i++) { const cur = ring[idx], nxt = ring[(idx + 1) % N]; y[i] = cur * sc; ring[idx] = damp * 0.5 * (cur + nxt); idx = (idx + 1) % N; }
    if (plucks.size > 80) plucks.delete(plucks.keys().next().value);
    plucks.set(key, b);
    return b;
  }
  function pluck(f, at, o) {
    o = o || {};
    const t0 = T(at), len = o.len || 2.2;
    const src = c.createBufferSource(); src.buffer = pluckBuf(f, o.damp == null ? 0.996 : o.damp, o.soft == null ? 1 : o.soft, len);
    const g = c.createGain(), peak = o.gain == null ? 0.12 : o.gain;
    g.gain.setValueAtTime(peak, t0);
    if (o.dur) { g.gain.setValueAtTime(peak, t0 + Math.max(0.01, o.dur - 0.08)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur); }
    let node = src;
    if (o.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; src.connect(fl); node = fl; }
    node.connect(g);
    route(g, o);
    src.start(t0); src.stop(t0 + (o.dur || len) + 0.05);
  }
  function fm(f, at, dur, o) {
    o = o || {};
    const t0 = T(at);
    const car = c.createOscillator(); car.frequency.setValueAtTime(f, t0);
    const mod = c.createOscillator(); mod.frequency.setValueAtTime(f * (o.ratio || 1), t0);
    const mg = c.createGain(), idx = (o.idx == null ? 2.2 : o.idx) * f;
    mg.gain.setValueAtTime(idx, t0);
    mg.gain.exponentialRampToValueAtTime(Math.max(1, idx * (o.idxEnd == null ? 0.12 : o.idxEnd)), t0 + Math.min(dur, o.idxT || 0.7));
    mod.connect(mg).connect(car.frequency);
    const g = c.createGain();
    env(g, t0, dur, o.gain == null ? 0.08 : o.gain, o.attack == null ? 0.003 : o.attack, o);
    car.connect(g);
    route(g, o);
    car.start(t0); mod.start(t0); car.stop(t0 + dur + 0.05); mod.stop(t0 + dur + 0.05);
  }
  function bell(f, at, dur, o) {
    o = o || {};
    const parts = o.parts || [[1, 1], [2.0, 0.42], [2.76, 0.3], [5.4, 0.14], [8.93, 0.06]];
    const peak = o.gain == null ? 0.06 : o.gain;
    for (const [r, a] of parts) {
      const fr = f * r;
      if (fr > 16000) continue;
      tone(fr, at, dur * (1.1 - Math.min(0.75, r * 0.07)), { gain: peak * a, attack: o.attack == null ? 0.002 : o.attack, out: o.out, wet: o.wet, wetTo: o.wetTo, pan: o.pan });
    }
  }
  return { c, tone, noise, pluck, fm, bell, now: () => c.currentTime };
}

/** 給一個音色組的聲音：dB 轉倍數（trim） */
const dbGain = (db) => Math.pow(10, (db || 0) / 20);

function makeSound(o) {
  o = o || {};
  let ctx = null, master = null, A = null, unlocked = false;
  const subs = new Set();
  function ensure() {
    if (ctx) return ctx;
    const AC = HAS_DOM && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = o.session || 'ambient'; } catch (e) { /* 舊版 Safari */ }
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = o.vol ? o.vol() : 0.85;
    master.connect(comp).connect(ctx.destination);
    const dly = ctx.createDelay(0.5); dly.delayTime.value = 0.13;   // 一點點迴音，讓重要的聲音有尾巴
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    const wet = ctx.createGain();
    wet.connect(dly); dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(master);
    A = makeSynth(ctx, master, wet, makeNoise(ctx));
    return ctx;
  }
  /** 在點擊、按鍵的當下（同步）呼叫 */
  function unlock() {
    const c = ensure();
    if (!c) return;
    if (c.state !== 'running') c.resume().then(() => subs.forEach((fn) => { try { fn(); } catch (e) { /* */ } })).catch(() => {});
    if (!unlocked) {
      try { const b = c.createBuffer(1, 1, c.sampleRate); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) { /* */ }
      unlocked = true;
    }
  }
  const ready = () => !!(ctx && ctx.state === 'running');
  function play(name) {
    if (!ready() || (o.on && !o.on())) return false;
    const fn = (o.bank || {})[name];
    if (!fn) return false;
    master.gain.value = (o.vol ? o.vol() : 0.85) * dbGain((o.trim || {})[name]);
    try { fn(A); return true; } catch (e) { return false; }
  }
  if (HAS_DOM) document.addEventListener('visibilitychange', () => { if (ctx && document.visibilityState === 'hidden' && o.pauseHidden !== false) ctx.suspend().catch(() => {}); });
  return { unlock, ready, play, onUnlock: (fn) => { subs.add(fn); return () => subs.delete(fn); }, ctx: () => ensure(), synth: () => (ensure() ? A : null) };
}

/** 量一個聲音有多大聲（OfflineAudioContext）：0.3 秒一窗的 RMS 取最大，回傳 dB。音色組之間對音量用 */
async function measure(fn, sec) {
  const OAC = typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : null;
  if (!OAC) return null;
  const sr = 48000, c = new OAC(2, Math.floor(sr * (sec || 1.5)), sr);
  const out = c.createGain(); out.connect(c.destination);
  const wet = c.createGain(); wet.connect(out);
  fn(makeSynth(c, out, wet, makeNoise(c)));
  const buf = await c.startRendering();
  const d = buf.getChannelData(0), win = Math.floor(sr * 0.3);
  let best = 0, nan = 0;
  for (let i = 0; i + win <= d.length; i += Math.floor(win / 2)) {
    let ss = 0;
    for (let k = i; k < i + win; k++) { const v = d[k]; if (!isFinite(v)) { nan++; continue; } ss += v * v; }
    best = Math.max(best, Math.sqrt(ss / win));
  }
  return { db: 20 * Math.log10(best + 1e-12), nan };
}
PZA.sound = makeSound;
PZA.synth = makeSynth;
PZA.measureSound = measure;
