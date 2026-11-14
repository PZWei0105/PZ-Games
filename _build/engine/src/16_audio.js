/* ==========================================================================
   16 聲音：音訊核心＋合成音效
   - 第一次點擊／按鍵時「同步」建立 AudioContext（放在 await 後面會被瀏覽器擋）。
   - iPhone 側邊靜音鍵打開時網頁遊戲會沒聲音：設 navigator.audioSession.type = 'playback' 解決
     （設定裡「跟其他 App 的音樂一起播」打開時改成 'ambient'：會跟著靜音鍵）。
   - 音效全部用純 JavaScript 合成成聲音片段（可重現、不用檔案、手機也省電），播的時候只是放片段：
       PZ.sfx.play('hit', { vol, pitch, pan })     PZ.sfx.at('explosion', x, y)（依畫面位置左右聲道、遠近音量）
       PZ.sfx.define('myShot', { layers: [...], vol: 0.8, pitchVar: 0.06, max: 4, gap: 0.03 })
   - 同一個音效同時最多幾個聲部（max）、最短間隔（gap），機槍不會疊成爆音；總輸出有限幅器。
   - 匯流排：sfx（音效）、music（配樂）、ui（介面）、amb（環境）；設定裡的音量直接套用。
   ========================================================================== */
const Aud = PZ.audio = { ctx: null, ready: false, failed: false, bus: {}, duckV: 1, _duckT: 0, _unlockers: [], sampleRate: 44100 };

function setSession() {
  try { if (HAS_DOM && navigator.audioSession) navigator.audioSession.type = Settings.get('mixOthers') ? 'ambient' : 'playback'; } catch (e) { /* 不支援 */ }
}
/** 建立音訊（一定要在使用者手勢裡同步呼叫；引擎已經自動掛好了） */
Aud.unlock = () => {
  if (!HAS_DOM || Aud.failed) return false;
  if (Aud.ctx) { if (Aud.ctx.state !== 'running') { try { Aud.ctx.resume(); } catch (e) { /* ignore */ } } return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { Aud.failed = true; return false; }
  setSession();
  let c;
  try { c = new AC({ latencyHint: 'interactive' }); } catch (e) { try { c = new AC(); } catch (er) { Aud.failed = true; return false; } }
  Aud.ctx = c; Aud.sampleRate = c.sampleRate;
  const master = c.createGain(), comp = c.createDynamicsCompressor();
  comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 12; comp.attack.value = 0.002; comp.release.value = 0.18;
  master.connect(comp); comp.connect(c.destination);
  Aud.master = master; Aud.comp = comp;
  for (const k of ['sfx', 'music', 'ui', 'amb']) { const g = c.createGain(); g.connect(master); Aud.bus[k] = g; }
  // 殘響（短的房間感，給需要的音效加一點空間）
  Aud.rev = c.createConvolver(); Aud.rev.buffer = makeIR(c, 1.6, 2.6); Aud.revIn = c.createGain(); Aud.revIn.gain.value = 1;
  Aud.revIn.connect(Aud.rev); Aud.rev.connect(Aud.bus.sfx);
  // iOS：先放一段無聲，正式解鎖
  try { const b = c.createBuffer(1, 1, c.sampleRate), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) { /* ignore */ }
  try { c.resume(); } catch (e) { /* ignore */ }
  c.onstatechange = () => PZ.emit('audiostate', c.state);
  Aud.ready = true;
  Aud.applyVolumes();
  Sfx.prewarm();
  PZ.emit('audio', c);
  return true;
};
function makeIR(c, sec, decay) {
  const len = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, len, c.sampleRate), r = makeRng(99);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0; for (let i = 0; i < len; i++) { lp += ((r.next() * 2 - 1) - lp) * 0.35; d[i] = lp * Math.pow(1 - i / len, decay) * 0.6; } }
  return b;
}
Aud.applyVolumes = () => {
  if (!Aud.ctx) return;
  const t = Aud.ctx.currentTime, set = (g, v) => { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(v, t, 0.03); };
  const mute = Settings.get('mute') ? 0 : 1;
  set(Aud.master, mute * Settings.get('master'));
  set(Aud.bus.sfx, Settings.get('sfx')); set(Aud.bus.ui, Settings.get('sfx') * 0.9); set(Aud.bus.amb, Settings.get('sfx') * 0.85);
  set(Aud.bus.music, Settings.get('music') * Aud.duckV);
};
/** 頻譜分析（音樂視覺化）：回傳 AnalyserNode，接在總輸出上；沒有音訊時回傳 null */
Aud.analyser = (size = 256) => {
  if (!Aud.ctx) return null;
  if (!Aud._an) { Aud._an = Aud.ctx.createAnalyser(); Aud._an.fftSize = size; Aud._an.smoothingTimeConstant = 0.78; Aud.comp.connect(Aud._an); }
  return Aud._an;
};
/** 讓配樂暫時變小聲（大爆炸、劇情對話）：amount 降到幾成、sec 秒後恢復 */
Aud.duck = (amount = 0.45, sec = 0.6) => { Aud.duckV = Math.min(Aud.duckV, amount); Aud._duckT = Math.max(Aud._duckT, sec); Aud.applyVolumes(); };
Aud.now = () => (Aud.ctx ? Aud.ctx.currentTime : 0);
if (HAS_DOM) {
  const unlock = () => { Aud.unlock(); };
  for (const ev of ['pointerdown', 'touchend', 'keydown', 'mousedown']) window.addEventListener(ev, unlock, { capture: true, passive: true });
  PZ.on('hidden', () => { if (Aud.ctx && Aud.ctx.state === 'running') { try { Aud.ctx.suspend(); } catch (e) { /* ignore */ } } });
  PZ.on('visible', () => { if (Aud.ctx && Aud.ctx.state !== 'running') { try { Aud.ctx.resume(); } catch (e) { /* ignore */ } } });
}
addSystem({ name: 'audio', order: 30, frame(rdt) { if (Aud._duckT > 0) { Aud._duckT -= rdt; if (Aud._duckT <= 0) { Aud.duckV = 1; Aud.applyVolumes(); } } } });

/* ==========================================================================
   合成：純 JS 的小型合成器（每一層是一個聲音元件，疊起來就是一個音效）
   一層的欄位（全部可省略）：
     w: 'sine'|'tri'|'square'|'saw'|'noise'|'pink'|'brown'  波形（預設 sine）
     f: 起始頻率 Hz、f1: 結束頻率（滑音）、fc: 'exp'|'lin'
     t: 長度（秒）、a: 起音（秒）、h: 持續（秒）、p: 衰減曲線（越大越快，預設 2）
     v: 音量、d: 延遲開始（秒）、duty: 方波佔空比
     vib: [速度 Hz, 深度半音]、jump: [[時間, 頻率倍率], …]（琶音）
     fm: [頻率比, 調變量, 調變衰減速度]（金屬、鐘聲、電子琴）
     lp/hp/bp: [截止頻率, 結束頻率, Q]（濾波，可以掃）
     dist: 0～1（失真）、crush: 位元數（8-bit 味）、hold: 降取樣倍數
   ========================================================================== */
function bq(type, f, q, sr) {
  f = clamp(f, 10, sr * 0.45); const w = TAU * f / sr, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * Math.max(0.05, q));
  let b0, b1, b2; const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
  if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; } else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; } else { b0 = al; b1 = 0; b2 = -al; }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function polyblep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

function renderLayer(L, sr, out, rng) {
  const t = L.t != null ? L.t : 0.2, start = Math.floor((L.d || 0) * sr), n = Math.min(out.length - start, Math.floor(t * sr));
  if (n <= 0) return;
  const w = L.w || 'sine', f0 = Math.max(1, L.f || 440), f1 = Math.max(1, L.f1 != null ? L.f1 : f0), expo = (L.fc || 'exp') === 'exp';
  const a = L.a != null ? L.a : 0.002, h = L.h || 0, pw = L.p != null ? L.p : 2, vol = L.v != null ? L.v : 0.7, duty = L.duty || 0.5;
  const fils = []; for (const k of ['lp', 'hp', 'bp']) if (L[k]) { const s = L[k]; fils.push({ type: k, f0: s[0], f1: s[1] != null ? s[1] : s[0], q: s[2] || 0.8, c: bq(k, s[0], s[2] || 0.8, sr), x1: 0, x2: 0, y1: 0, y2: 0 }); }
  const drive = L.dist ? 1 + L.dist * 9 : 0, dn = drive ? Math.tanh(drive) : 1, crush = L.crush ? Math.pow(2, L.crush - 1) : 0, hold = L.hold || 1;
  const jumps = L.jump || null, vib = L.vib || null, fm = L.fm || null;
  let ph = 0, mph = 0, pink = [0, 0, 0, 0, 0, 0, 0], brown = 0, held = 0;
  const decayLen = Math.max(1e-4, t - a - h);
  for (let i = 0; i < n; i++) {
    const tau = i / sr, x = tau / t;
    let fr = expo ? f0 * Math.pow(f1 / f0, x) : f0 + (f1 - f0) * x;
    if (jumps) for (const j of jumps) if (tau >= j[0]) fr *= j[1];
    if (vib) fr *= Math.pow(2, (vib[1] * Math.sin(TAU * vib[0] * tau)) / 12);
    const dt = fr / sr;
    let s;
    if (i % hold === 0) {
      switch (w) {
        case 'noise': s = rng.next() * 2 - 1; break;
        case 'pink': { const wn = rng.next() * 2 - 1; pink[0] = 0.99886 * pink[0] + wn * 0.0555179; pink[1] = 0.99332 * pink[1] + wn * 0.0750759; pink[2] = 0.969 * pink[2] + wn * 0.153852; pink[3] = 0.8665 * pink[3] + wn * 0.3104856; pink[4] = 0.55 * pink[4] + wn * 0.5329522; pink[5] = -0.7616 * pink[5] - wn * 0.016898; s = (pink[0] + pink[1] + pink[2] + pink[3] + pink[4] + pink[5] + pink[6] + wn * 0.5362) * 0.11; pink[6] = wn * 0.115926; break; }
        case 'brown': { brown = (brown + 0.02 * (rng.next() * 2 - 1)) / 1.02; s = brown * 3.5; break; }
        case 'square': s = (ph < duty ? 1 : -1) + polyblep(ph, dt) - polyblep((ph + 1 - duty) % 1, dt); break;
        case 'saw': s = 2 * ph - 1 - polyblep(ph, dt); break;
        case 'tri': s = 1 - 4 * Math.abs(ph - 0.5); break;
        default: {
          let pm = 0;
          if (fm) { const idx = fm[1] * (fm[2] ? Math.exp(-tau * fm[2]) : 1); pm = idx * Math.sin(TAU * mph); mph += fr * fm[0] / sr; mph -= Math.floor(mph); }
          s = Math.sin(TAU * ph + pm);
        }
      }
      held = s;
    } else s = held;
    ph += dt; ph -= Math.floor(ph);
    for (const F of fils) {
      if (F.f1 !== F.f0 && (i & 15) === 0) F.c = bq(F.type, F.f0 * Math.pow(F.f1 / F.f0, x), F.q, sr);
      const c = F.c, y = c[0] * s + c[1] * F.x1 + c[2] * F.x2 - c[3] * F.y1 - c[4] * F.y2;
      F.x2 = F.x1; F.x1 = s; F.y2 = F.y1; F.y1 = y; s = y;
    }
    if (drive) s = Math.tanh(s * drive) / dn;
    if (crush) s = Math.round(s * crush) / crush;
    const env = tau < a ? tau / a : tau < a + h ? 1 : Math.pow(Math.max(0, 1 - (tau - a - h) / decayLen), pw);
    out[start + i] += s * env * vol;
  }
}
/** 把一個音效規格算成取樣（Float32Array）；Node 測試也能跑 */
function synth(spec, sr, seed = 1) {
  const layers = spec.layers || [spec];
  let len = 0; for (const L of layers) len = Math.max(len, (L.d || 0) + (L.t != null ? L.t : 0.2));
  len += spec.tail || 0.01;
  const out = new Float32Array(Math.ceil(len * sr)), rng = makeRng(seed);
  for (const L of layers) renderLayer(L, sr, out, rng);
  // 去直流、正規化、尾端淡出
  let px = 0, py = 0, peak = 0;
  for (let i = 0; i < out.length; i++) { const x = out[i], y = x - px + 0.997 * py; px = x; py = y; out[i] = y; const ab = y < 0 ? -y : y; if (ab > peak) peak = ab; }
  const g = peak > 1e-6 ? (spec.norm === false ? 1 : 0.95 / peak) * (spec.vol != null ? spec.vol : 0.8) : 0;
  const fade = Math.min(out.length, Math.floor(sr * 0.004));
  for (let i = 0; i < out.length; i++) out[i] *= g;
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  return out;
}

const Sfx = PZ.sfx = { defs: {}, bufs: new Map(), voices: [], last: new Map(), maxVoices: 28, _warm: [] };
Sfx.define = (name, spec) => { Sfx.defs[name] = spec; Sfx.bufs.delete(name); if (Aud.ctx) Sfx.prewarm(); return spec; };
Sfx.has = (name) => !!Sfx.defs[name] || Sfx.bufs.has(name);
/** 純取樣（不需要音訊）：測試、匯出用 */
Sfx.render = (name, sr = 44100) => { const sp = Sfx.defs[name]; return sp ? synth(sp, sr, hashStr(name)) : null; };
Sfx.buffer = (name) => {
  let b = Sfx.bufs.get(name);
  if (b) return b;
  const sp = Sfx.defs[name]; if (!sp || !Aud.ctx) return null;
  const data = synth(sp, Aud.ctx.sampleRate, hashStr(name));
  b = Aud.ctx.createBuffer(1, data.length, Aud.ctx.sampleRate); b.getChannelData(0).set(data);
  Sfx.bufs.set(name, b);
  return b;
};
/** 載入外部音效檔（筆電素材工廠做的 mp3/ogg/wav，或 data URL） */
Sfx.load = async (name, url, o = {}) => {
  if (!Aud.ctx) await new Promise((r) => PZ.once('audio', r));
  const res = await fetch(url), ab = await res.arrayBuffer();
  const b = await new Promise((ok, no) => Aud.ctx.decodeAudioData(ab, ok, no));
  Sfx.bufs.set(name, b); Sfx.defs[name] = Sfx.defs[name] || Object.assign({ file: url }, o);
  return b;
};
/* 解鎖後先把所有音效算好：優先丟給背景執行緒（Worker）算，畫面完全不卡；
   不能用 Worker 的環境（某些內嵌頁面）退回主執行緒、每格最多算一個。 */
let synthWorker = null, workerTried = false, workerUrl = '', workerIdle = 0;
const pendingW = new Set();
// 算完就收掉背景執行緒（手機省記憶體）；之後又有新音效要算時再開一個
function retireWorker() { if (pendingW.size || !synthWorker) return; try { synthWorker.terminate(); } catch (e) { /* ignore */ } synthWorker = null; workerTried = false; try { URL.revokeObjectURL(workerUrl); } catch (e) { /* ignore */ } workerUrl = ''; }
function makeWorker() {
  if (workerTried) return synthWorker; workerTried = true;
  try {
    const src = `const TAU=${TAU};const clamp=${clamp.toString()};${makeRng.toString()}${bq.toString()}${polyblep.toString()}${renderLayer.toString()}${synth.toString()}
onmessage=(e)=>{const m=e.data;try{const d=synth(m.spec,m.sr,m.seed);postMessage({name:m.name,d},[d.buffer]);}catch(err){postMessage({name:m.name,err:String(err)});}};`;
    const url = workerUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    synthWorker = new Worker(url);
    synthWorker.onmessage = (e) => {
      const { name, d, err } = e.data; pendingW.delete(name);
      if (!pendingW.size) { clearTimeout(workerIdle); workerIdle = setTimeout(retireWorker, 1500); }
      if (err || !d || !Aud.ctx || Sfx.bufs.has(name)) return;
      const b = Aud.ctx.createBuffer(1, d.length, Aud.ctx.sampleRate); b.getChannelData(0).set(d); Sfx.bufs.set(name, b);
    };
    synthWorker.onerror = () => { synthWorker = null; for (const n of pendingW) Sfx._warm.push(n); pendingW.clear(); };
  } catch (e) { synthWorker = null; }
  return synthWorker;
}
Sfx.prewarm = () => {
  clearTimeout(workerIdle);
  const w = HAS_DOM && typeof Worker === 'function' ? makeWorker() : null;
  for (const k in Sfx.defs) {
    if (Sfx.bufs.has(k) || pendingW.has(k) || Sfx.defs[k].file) continue;
    if (w) { pendingW.add(k); try { w.postMessage({ name: k, spec: Sfx.defs[k], sr: Aud.ctx.sampleRate, seed: hashStr(k) }); } catch (e) { pendingW.delete(k); Sfx._warm.push(k); } }
    else Sfx._warm.push(k);
  }
};
addSystem({ name: 'sfx-warm', order: 31, frame() { if (!Aud.ctx || !Sfx._warm.length) return; const k = Sfx._warm.shift(); if (!Sfx.bufs.has(k)) Sfx.buffer(k); } });

/**
 * 播放：o { vol, pitch（倍率）, pan（-1～1）, bus, rev（殘響量）, delay（秒）, loop }
 * 回傳一個可以 stop() 的聲部（播不了回傳 null）
 */
Sfx.play = (name, o = {}) => {
  if (!Aud.ctx || Aud.ctx.state === 'closed') return null;
  const sp = Sfx.defs[name] || {}, buf = Sfx.buffer(name); if (!buf) return null;
  const c = Aud.ctx, now = c.currentTime;
  const gap = sp.gap != null ? sp.gap : 0.025, lt = Sfx.last.get(name) || -1;
  if (now - lt < gap && !o.force) return null;
  Sfx.last.set(name, now);
  // 同一音效的聲部上限：停掉最舊的
  const max = sp.max || 6, mine = Sfx.voices.filter((v) => v.name === name);
  if (mine.length >= max) mine[0].stop(0.02);
  if (Sfx.voices.length >= Sfx.maxVoices) Sfx.voices[0].stop(0.02);
  const src = c.createBufferSource(); src.buffer = buf;
  const pv = sp.pitchVar != null ? sp.pitchVar : 0.05;
  src.playbackRate.value = Math.max(0.1, (o.pitch || 1) * (1 + Rand.spread(pv)));
  if (o.loop) src.loop = true;
  const g = c.createGain(); g.gain.value = (o.vol != null ? o.vol : 1);
  src.connect(g);
  let node = g;
  if (o.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); g.connect(p); node = p; }
  node.connect(Aud.bus[o.bus || sp.bus || 'sfx'] || Aud.bus.sfx);
  const rv = o.rev != null ? o.rev : sp.rev || 0;
  if (rv > 0) { const rg = c.createGain(); rg.gain.value = rv; node.connect(rg); rg.connect(Aud.revIn); }
  const at = now + (o.delay || 0);
  src.start(at);
  const v = { name, src, g, end: at + buf.duration / src.playbackRate.value, stop(fade = 0.03) { try { const t = c.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade); src.stop(t + fade + 0.01); } catch (e) { /* 已經停了 */ } rm(); } };
  const rm = () => { const i = Sfx.voices.indexOf(v); if (i >= 0) Sfx.voices.splice(i, 1); };
  src.onended = rm;
  Sfx.voices.push(v);
  return v;
};
/** 依世界座標播放：左右聲道跟著畫面位置，離畫面越遠越小聲 */
Sfx.at = (name, x, y, o = {}) => {
  const sx = Cam.toScreenX(x, y), sy = Cam.toScreenY(x, y), w = Screen.w || 1, h = Screen.h || 1;
  const pan = clamp((sx - w / 2) / (w / 2), -1, 1) * 0.55;
  const dx = Math.max(0, Math.abs(sx - w / 2) - w / 2), dy = Math.max(0, Math.abs(sy - h / 2) - h / 2), off = Math.hypot(dx, dy) / Math.max(w, h);
  const vol = (o.vol != null ? o.vol : 1) * clamp(1 - off * 1.6, 0.12, 1);
  return Sfx.play(name, Object.assign({}, o, { pan, vol }));
};
Sfx.stopAll = (name) => { for (const v of Sfx.voices.slice()) if (!name || v.name === name) v.stop(); };
/** 介面音效（走 ui 匯流排） */
PZ.uiSound = (name, o) => Sfx.play(name, Object.assign({ bus: 'ui' }, o));

/* ---------- 內建音效庫 ---------- */
const S = Sfx.define;
// 打擊
S('hit', { vol: 0.75, pitchVar: 0.08, max: 6, gap: 0.02, layers: [
  { w: 'noise', t: 0.018, a: 0.0005, p: 1.5, v: 0.55, hp: [1800, 1800, 0.7] },
  { w: 'tri', f: 240, f1: 70, t: 0.11, a: 0.001, p: 2.2, v: 1, dist: 0.35 },
  { w: 'noise', t: 0.08, a: 0.001, p: 2.5, v: 0.45, lp: [3200, 500, 0.8] }] });
S('hitHeavy', { vol: 0.9, pitchVar: 0.06, max: 4, layers: [
  { w: 'noise', t: 0.025, a: 0.0005, p: 1.5, v: 0.6, hp: [1400, 1400, 0.7] },
  { w: 'sine', f: 170, f1: 42, t: 0.22, a: 0.001, p: 2, v: 1, dist: 0.5 },
  { w: 'brown', t: 0.18, a: 0.002, p: 2, v: 0.8, lp: [1800, 250, 0.7] }] });
S('crit', { vol: 0.65, pitchVar: 0.04, max: 3, layers: [
  { w: 'sine', f: 1900, t: 0.32, a: 0.001, p: 3, v: 0.5, fm: [3.51, 2.4, 9] },
  { w: 'sine', f: 2850, t: 0.18, a: 0.001, p: 3, v: 0.25, fm: [2.01, 1.5, 12] },
  { w: 'noise', t: 0.05, a: 0.0005, p: 2, v: 0.35, hp: [5000, 5000, 0.7] }] });
S('kill', { vol: 0.7, pitchVar: 0.1, max: 5, layers: [
  { w: 'noise', t: 0.13, a: 0.001, p: 1.8, v: 0.8, bp: [1100, 260, 1.1] },
  { w: 'sine', f: 330, f1: 70, t: 0.14, a: 0.001, p: 2, v: 0.8, dist: 0.2 }] });
S('slash', { vol: 0.6, pitchVar: 0.08, max: 4, layers: [
  { w: 'noise', t: 0.16, a: 0.04, p: 2, v: 1, bp: [600, 3800, 1.4] },
  { w: 'noise', t: 0.05, d: 0.06, a: 0.002, p: 2, v: 0.4, hp: [4000, 4000, 0.7] }] });
S('clang', { vol: 0.6, pitchVar: 0.05, max: 3, layers: [
  { w: 'sine', f: 760, t: 0.55, a: 0.001, p: 2.6, v: 0.6, fm: [1.41, 4.5, 6] },
  { w: 'sine', f: 1520, t: 0.3, a: 0.001, p: 3, v: 0.3, fm: [2.73, 2, 8] },
  { w: 'noise', t: 0.04, a: 0.0005, p: 2, v: 0.5, hp: [3000, 3000, 0.7] }] });
S('block', { vol: 0.55, pitchVar: 0.05, max: 3, layers: [
  { w: 'sine', f: 520, t: 0.18, a: 0.001, p: 2.5, v: 0.6, fm: [1.7, 3, 14] },
  { w: 'noise', t: 0.06, a: 0.001, p: 2, v: 0.5, bp: [2400, 1200, 1] }] });
// 射擊
S('shoot', { vol: 0.55, pitchVar: 0.07, max: 5, gap: 0.03, layers: [
  { w: 'noise', t: 0.09, a: 0.0005, p: 2.2, v: 1, lp: [7000, 1400, 0.7], dist: 0.35 },
  { w: 'sine', f: 980, f1: 130, t: 0.06, a: 0.0005, p: 2, v: 0.5 },
  { w: 'sine', f: 120, f1: 55, t: 0.08, a: 0.001, p: 2, v: 0.6 }] });
S('rifle', { vol: 0.5, pitchVar: 0.06, max: 6, gap: 0.04, layers: [
  { w: 'noise', t: 0.07, a: 0.0005, p: 2.4, v: 1, hp: [700, 700, 0.6], dist: 0.45 },
  { w: 'square', f: 420, f1: 140, t: 0.04, a: 0.0005, p: 2, v: 0.25 },
  { w: 'sine', f: 140, f1: 60, t: 0.06, a: 0.001, p: 2, v: 0.5 }] });
S('shotgun', { vol: 0.7, pitchVar: 0.05, max: 3, gap: 0.08, layers: [
  { w: 'noise', t: 0.26, a: 0.001, p: 2.2, v: 1, lp: [4500, 500, 0.7], dist: 0.6 },
  { w: 'sine', f: 120, f1: 38, t: 0.22, a: 0.001, p: 2, v: 0.9 }] });
S('laser', { vol: 0.45, pitchVar: 0.06, max: 5, gap: 0.03, layers: [
  { w: 'square', f: 1500, f1: 260, t: 0.16, a: 0.001, p: 1.6, v: 0.6, lp: [6000, 1500, 0.8], duty: 0.35 },
  { w: 'sine', f: 2200, f1: 500, t: 0.12, a: 0.001, p: 2, v: 0.4 }] });
S('reload', { vol: 0.45, layers: [
  { w: 'noise', t: 0.02, a: 0.0005, p: 2, v: 0.8, bp: [3200, 3200, 2] },
  { w: 'noise', t: 0.12, d: 0.05, a: 0.02, p: 1.5, v: 0.35, bp: [1400, 2600, 1.2] },
  { w: 'noise', t: 0.025, d: 0.2, a: 0.0005, p: 2, v: 0.9, bp: [2600, 2600, 2] },
  { w: 'sine', f: 900, t: 0.03, d: 0.2, a: 0.0005, p: 2, v: 0.3 }] });
S('empty', { vol: 0.35, layers: [{ w: 'noise', t: 0.015, a: 0.0005, p: 2, v: 1, bp: [4200, 4200, 3] }, { w: 'sine', f: 1400, t: 0.02, p: 2, v: 0.4 }] });
// 爆炸、環境
S('explosion', { vol: 0.95, pitchVar: 0.06, max: 3, gap: 0.05, rev: 0.25, layers: [
  { w: 'noise', t: 0.05, a: 0.0005, p: 1.5, v: 0.7, hp: [1500, 1500, 0.6], dist: 0.4 },
  { w: 'brown', t: 1.2, a: 0.003, p: 2.2, v: 1, lp: [1600, 90, 0.7], dist: 0.35 },
  { w: 'sine', f: 75, f1: 26, t: 0.9, a: 0.002, p: 1.8, v: 0.9 },
  { w: 'noise', t: 0.6, d: 0.04, a: 0.01, p: 2.5, v: 0.25, bp: [900, 300, 0.7] }] });
S('thunder', { vol: 0.9, max: 2, rev: 0.4, layers: [
  { w: 'noise', t: 0.08, a: 0.001, p: 1.5, v: 0.9, hp: [1200, 1200, 0.6], dist: 0.5 },
  { w: 'brown', t: 2.4, a: 0.05, p: 1.6, v: 1, lp: [900, 60, 0.7] }] });
S('splash', { vol: 0.6, pitchVar: 0.08, max: 3, layers: [
  { w: 'noise', t: 0.35, a: 0.005, p: 2, v: 1, bp: [1800, 400, 0.9] },
  { w: 'sine', f: 600, f1: 1200, t: 0.06, d: 0.08, p: 2, v: 0.25 },
  { w: 'sine', f: 800, f1: 1600, t: 0.05, d: 0.16, p: 2, v: 0.2 }] });
S('glass', { vol: 0.55, max: 3, layers: [
  { w: 'sine', f: 2600, t: 0.6, a: 0.001, p: 3, v: 0.4, fm: [2.76, 2.5, 6] },
  { w: 'sine', f: 3700, t: 0.4, d: 0.03, a: 0.001, p: 3, v: 0.3, fm: [1.93, 2, 8] },
  { w: 'noise', t: 0.25, a: 0.001, p: 2.5, v: 0.5, hp: [5500, 3000, 0.8] }] });
// 拾取、獎勵
S('pickup', { vol: 0.42, pitchVar: 0.03, max: 4, gap: 0.03, bus: 'sfx', layers: [
  { w: 'sine', f: 1046, f1: 1568, t: 0.07, a: 0.001, p: 1.6, v: 0.8 },
  { w: 'sine', f: 1568, f1: 2093, t: 0.09, d: 0.045, a: 0.001, p: 1.8, v: 0.6 }] });
S('xp', { vol: 0.32, pitchVar: 0.02, max: 6, gap: 0.015, layers: [{ w: 'sine', f: 1318, t: 0.06, a: 0.001, p: 2, v: 0.9, fm: [2, 0.6, 20] }] });
S('coin', { vol: 0.4, pitchVar: 0.01, max: 4, layers: [{ w: 'square', f: 988, t: 0.32, a: 0.001, h: 0.05, p: 2.2, v: 0.5, jump: [[0.06, 1.335]], lp: [6000, 3000, 0.7], duty: 0.5 }] });
S('powerup', { vol: 0.45, max: 2, layers: [{ w: 'square', f: 523, t: 0.42, a: 0.002, h: 0.2, p: 1.6, v: 0.45, jump: [[0.07, 1.26], [0.14, 1.19], [0.21, 1.335]], vib: [8, 0.15], lp: [5000, 2500, 0.7] }, { w: 'sine', f: 1046, t: 0.42, a: 0.002, h: 0.2, p: 1.6, v: 0.3, jump: [[0.07, 1.26], [0.14, 1.19], [0.21, 1.335]] }] });
S('levelup', { vol: 0.55, max: 1, rev: 0.3, layers: [
  { w: 'sine', f: 523, t: 0.5, a: 0.002, p: 2.4, v: 0.5, fm: [2, 1.2, 4] },
  { w: 'sine', f: 659, t: 0.5, d: 0.08, a: 0.002, p: 2.4, v: 0.5, fm: [2, 1.2, 4] },
  { w: 'sine', f: 784, t: 0.55, d: 0.16, a: 0.002, p: 2.4, v: 0.5, fm: [2, 1.2, 4] },
  { w: 'sine', f: 1046, t: 0.9, d: 0.24, a: 0.002, p: 2.2, v: 0.55, fm: [3.5, 1.4, 3] },
  { w: 'noise', t: 0.8, d: 0.2, a: 0.1, p: 2, v: 0.12, hp: [7000, 9000, 0.7] }] });
S('heal', { vol: 0.4, max: 2, rev: 0.3, layers: [
  { w: 'sine', f: 660, f1: 990, t: 0.5, a: 0.05, p: 2, v: 0.5, vib: [6, 0.2] },
  { w: 'sine', f: 1320, f1: 1980, t: 0.5, d: 0.05, a: 0.05, p: 2, v: 0.25 },
  { w: 'noise', t: 0.5, a: 0.1, p: 2, v: 0.1, hp: [6000, 8000, 0.7] }] });
S('magic', { vol: 0.5, pitchVar: 0.05, max: 3, rev: 0.35, layers: [
  { w: 'sine', f: 400, f1: 1600, t: 0.45, a: 0.03, p: 1.8, v: 0.5, fm: [1.5, 2, 3] },
  { w: 'noise', t: 0.45, a: 0.05, p: 2, v: 0.25, bp: [2000, 7000, 2] }] });
S('charge', { vol: 0.4, max: 1, layers: [{ w: 'saw', f: 140, f1: 620, t: 0.9, a: 0.3, p: 0.8, v: 0.4, lp: [600, 4000, 1.5], vib: [9, 0.3] }, { w: 'sine', f: 280, f1: 1240, t: 0.9, a: 0.3, p: 0.8, v: 0.3 }] });
// 動作
S('whoosh', { vol: 0.5, pitchVar: 0.1, max: 4, layers: [{ w: 'noise', t: 0.2, a: 0.07, p: 1.6, v: 1, bp: [400, 2400, 1.2] }] });
S('dash', { vol: 0.5, pitchVar: 0.06, max: 2, layers: [{ w: 'noise', t: 0.22, a: 0.01, p: 1.8, v: 1, bp: [2600, 500, 1] }, { w: 'sine', f: 320, f1: 140, t: 0.15, a: 0.002, p: 2, v: 0.4 }] });
S('jump', { vol: 0.4, pitchVar: 0.04, max: 2, layers: [{ w: 'square', f: 300, f1: 640, t: 0.13, a: 0.002, p: 1.6, v: 0.4, lp: [3000, 3000, 0.7] }] });
S('land', { vol: 0.5, pitchVar: 0.08, max: 2, layers: [{ w: 'noise', t: 0.09, a: 0.001, p: 2, v: 0.8, lp: [700, 200, 0.7] }, { w: 'sine', f: 95, f1: 50, t: 0.1, a: 0.001, p: 2, v: 0.7 }] });
S('step', { vol: 0.22, pitchVar: 0.15, max: 3, gap: 0.08, layers: [{ w: 'noise', t: 0.045, a: 0.001, p: 2, v: 1, lp: [900, 300, 0.7] }] });
S('hurt', { vol: 0.6, pitchVar: 0.06, max: 2, gap: 0.08, layers: [
  { w: 'saw', f: 320, f1: 110, t: 0.22, a: 0.002, p: 1.8, v: 0.5, lp: [2400, 600, 0.8], dist: 0.3 },
  { w: 'noise', t: 0.1, a: 0.001, p: 2, v: 0.5, bp: [1200, 500, 0.9] }] });
S('death', { vol: 0.7, max: 1, rev: 0.4, layers: [
  { w: 'saw', f: 420, f1: 55, t: 0.9, a: 0.005, p: 1.4, v: 0.5, lp: [2200, 200, 0.8], vib: [7, 0.6] },
  { w: 'brown', t: 0.9, a: 0.01, p: 1.6, v: 0.6, lp: [800, 100, 0.7] }] });
S('growl', { vol: 0.45, pitchVar: 0.15, max: 3, gap: 0.25, layers: [{ w: 'saw', f: 95, f1: 70, t: 0.5, a: 0.06, p: 1.2, v: 0.6, lp: [700, 400, 2], vib: [13, 1.2] }, { w: 'noise', t: 0.5, a: 0.08, p: 1.4, v: 0.35, bp: [500, 350, 2] }] });
S('heartbeat', { vol: 0.6, max: 1, gap: 0.5, layers: [{ w: 'sine', f: 70, f1: 42, t: 0.14, a: 0.003, p: 2, v: 1 }, { w: 'sine', f: 65, f1: 40, t: 0.16, d: 0.2, a: 0.003, p: 2, v: 0.8 }] });
// 介面
S('click', { vol: 0.3, pitchVar: 0.02, bus: 'ui', max: 3, layers: [{ w: 'sine', f: 1250, t: 0.035, a: 0.0005, p: 2, v: 0.8 }, { w: 'noise', t: 0.008, a: 0.0002, p: 1, v: 0.4, hp: [4000, 4000, 0.7] }] });
S('hover', { vol: 0.12, pitchVar: 0.02, bus: 'ui', max: 2, gap: 0.04, layers: [{ w: 'sine', f: 2100, t: 0.02, a: 0.001, p: 2, v: 1 }] });
S('confirm', { vol: 0.35, bus: 'ui', max: 2, layers: [{ w: 'tri', f: 660, t: 0.07, a: 0.002, p: 1.5, v: 0.7 }, { w: 'tri', f: 990, t: 0.12, d: 0.06, a: 0.002, p: 2, v: 0.7 }] });
S('cancel', { vol: 0.3, bus: 'ui', max: 2, layers: [{ w: 'tri', f: 660, t: 0.07, a: 0.002, p: 1.5, v: 0.7 }, { w: 'tri', f: 440, t: 0.12, d: 0.06, a: 0.002, p: 2, v: 0.7 }] });
S('error', { vol: 0.3, bus: 'ui', max: 1, layers: [{ w: 'square', f: 196, t: 0.08, a: 0.001, h: 0.04, p: 1, v: 0.5, lp: [1800, 1800, 0.7] }, { w: 'square', f: 185, t: 0.1, d: 0.11, a: 0.001, h: 0.04, p: 1, v: 0.5, lp: [1800, 1800, 0.7] }] });
S('open', { vol: 0.3, bus: 'ui', max: 2, layers: [{ w: 'noise', t: 0.12, a: 0.02, p: 2, v: 0.6, bp: [900, 3000, 1.2] }, { w: 'sine', f: 520, f1: 880, t: 0.1, a: 0.005, p: 2, v: 0.4 }] });
S('close', { vol: 0.28, bus: 'ui', max: 2, layers: [{ w: 'noise', t: 0.1, a: 0.01, p: 2, v: 0.6, bp: [2600, 800, 1.2] }, { w: 'sine', f: 760, f1: 480, t: 0.09, a: 0.005, p: 2, v: 0.4 }] });
S('tick', { vol: 0.18, bus: 'ui', max: 4, gap: 0.03, layers: [{ w: 'sine', f: 1600, t: 0.014, a: 0.0005, p: 1.5, v: 1 }] });
S('type', { vol: 0.1, bus: 'ui', pitchVar: 0.12, max: 2, gap: 0.035, layers: [{ w: 'noise', t: 0.012, a: 0.0005, p: 2, v: 1, bp: [3200, 3200, 1.5] }, { w: 'sine', f: 1700, t: 0.012, p: 2, v: 0.3 }] });
S('notify', { vol: 0.35, bus: 'ui', max: 1, rev: 0.2, layers: [{ w: 'sine', f: 880, t: 0.2, a: 0.002, p: 2, v: 0.6, fm: [2, 0.8, 8] }, { w: 'sine', f: 1320, t: 0.3, d: 0.1, a: 0.002, p: 2, v: 0.5, fm: [2, 0.8, 8] }] });
S('card', { vol: 0.35, pitchVar: 0.1, max: 4, gap: 0.03, layers: [{ w: 'noise', t: 0.07, a: 0.01, p: 2, v: 1, bp: [2600, 4200, 1.2] }] });
S('alarm', { vol: 0.35, max: 1, layers: [{ w: 'square', f: 880, t: 0.7, a: 0.002, h: 0.65, p: 1, v: 0.35, jump: [[0.175, 0.75], [0.35, 1.333], [0.525, 0.75]], lp: [2500, 2500, 0.7] }] });
S('bell', { vol: 0.5, max: 2, rev: 0.4, layers: [{ w: 'sine', f: 660, t: 1.6, a: 0.001, p: 2.6, v: 0.7, fm: [3.5, 2.2, 2.2] }, { w: 'sine', f: 1320, t: 1.1, a: 0.001, p: 3, v: 0.25, fm: [2.4, 1, 3] }] });
