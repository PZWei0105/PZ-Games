// ============ 聲音：WebAudio 即時合成 ============
const AU = (() => {
  let ac = null, master, comp, rev, revGain, musicGain, sfxGain, nb = null, amb = null, ready = false;
  const vol = { m: .8, s: 1 };
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = .9;
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .2;
    master.connect(comp); comp.connect(ac.destination);
    sfxGain = ac.createGain(); sfxGain.connect(master);
    musicGain = ac.createGain(); musicGain.connect(master);
    rev = ac.createConvolver(); rev.buffer = impulse(2.6, 2.4); revGain = ac.createGain(); revGain.gain.value = .28; rev.connect(revGain); revGain.connect(master);
    nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setVol(S.set ? S.set.music : .8, S.set ? S.set.sfx : 1);
    startAmbient(); ready = true;
  }
  function setVol(m, s) { vol.m = m; vol.s = s; if (!ac) return; musicGain.gain.value = m * .7; sfxGain.gain.value = s; }
  function impulse(sec, decay) { const n = ac.sampleRate * sec, b = ac.createBuffer(2, n, ac.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); } return b; }
  // 空間化：以鏡頭中心為聽者
  function spatial(x, y) {
    if (x == null || !CAM) return { pan: 0, g: 1 };
    const dx = (x - CAM.x) / T, dy = (y - CAM.y) / T, d = Math.hypot(dx, dy);
    return { pan: clamp(dx / 9, -1, 1), g: clamp(1.15 - d / 16, .05, 1) };
  }
  function out(node, x, y, wet = .3, gmul = 1) {
    const sp = spatial(x, y), g = ac.createGain(); g.gain.value = sp.g * gmul;
    let p = null; if (ac.createStereoPanner) { p = ac.createStereoPanner(); p.pan.value = sp.pan; node.connect(p); p.connect(g); } else node.connect(g);
    g.connect(sfxGain);
    if (wet > 0) { const w = ac.createGain(); w.gain.value = wet * sp.g * gmul; g.connect(w); w.connect(rev); }
    return g;
  }
  function env(g, t0, a, peak, d, end = .0001) { g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(end, t0 + a + d); }
  function tone(f, dur, type, v, x, y, o = {}) {
    if (!ready) return; const t0 = ac.currentTime + (o.delay || 0);
    const os = ac.createOscillator(); os.type = type; os.frequency.setValueAtTime(f, t0);
    if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
    if (o.det) os.detune.value = o.det;
    const g = ac.createGain(); env(g, t0, o.a || .005, v, dur);
    let n = os; if (o.lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; fl.Q.value = o.q || 1; os.connect(fl); n = fl; }
    n.connect(g); out(g, x, y, o.wet ?? .25); os.start(t0); os.stop(t0 + dur + .05);
  }
  function noiseB(dur, v, ft, f, q, x, y, o = {}) {
    if (!ready) return; const t0 = ac.currentTime + (o.delay || 0);
    const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; s.playbackRate.value = o.rate || 1;
    const fl = ac.createBiquadFilter(); fl.type = ft; fl.frequency.setValueAtTime(f, t0); fl.Q.value = q || 1;
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
    const g = ac.createGain(); env(g, t0, o.a || .005, v, dur);
    s.connect(fl); fl.connect(g); out(g, x, y, o.wet ?? .3); s.start(t0, Math.random()); s.stop(t0 + dur + .1);
  }
  // ---------- 環境音與配樂 ----------
  function startAmbient() {
    amb = {};
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
    const g = ac.createGain(); g.gain.value = .16; lp.connect(g); g.connect(musicGain);
    for (const [f, dt] of [[41.2, -6], [41.2, 7], [61.7, 0]]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(lp); o.start(); }
    // 空調嘶聲
    const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = .5;
    const hg = ac.createGain(); hg.gain.value = .022; s.connect(bp); bp.connect(hg); hg.connect(musicGain); s.start();
    // 緊張層：高頻玻璃音
    const glass = ac.createGain(); glass.gain.value = 0; glass.connect(musicGain); glass.connect(rev);
    for (const f of [1760, 2349, 1975]) { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f; const tg = ac.createGain(); tg.gain.value = .015; const lfo = ac.createOscillator(); lfo.frequency.value = .2 + Math.random() * .4; const lg = ac.createGain(); lg.gain.value = .012; lfo.connect(lg); lg.connect(tg.gain); o.connect(tg); tg.connect(glass); o.start(); lfo.start(); }
    // 低頻脈動
    const sub = ac.createOscillator(); sub.type = 'sine'; sub.frequency.value = 36; const sg = ac.createGain(); sg.gain.value = 0; sub.connect(sg); sg.connect(musicGain); sub.start();
    // 顫音弦（解諧的方波經過低通）
    const str = ac.createGain(); str.gain.value = 0; const slp = ac.createBiquadFilter(); slp.type = 'lowpass'; slp.frequency.value = 700; str.connect(slp); slp.connect(musicGain); slp.connect(rev);
    for (const [f, d] of [[110, -9], [116.5, 6], [164.8, 3]]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d; const tr = ac.createGain(); tr.gain.value = .5; const lfo = ac.createOscillator(); lfo.frequency.value = 6.5; const lg = ac.createGain(); lg.gain.value = .35; lfo.connect(lg); lg.connect(tr.gain); o.connect(tr); tr.connect(str); o.start(); lfo.start(); }
    amb = { hum: g, glass, sub: sg, str, hiss: hg };
  }
  let hbT = 0, dripT = 3, creakT = 6, sonT = 0;
  function update(dt) {
    if (!ready || !W) return;
    const tn = W.phase === 'play' ? W.tension : 0, t = ac.currentTime;
    amb.glass.gain.setTargetAtTime(clamp((tn - .15) * .9, 0, .6), t, .8);
    amb.sub.gain.setTargetAtTime(clamp((tn - .35) * .5, 0, .3), t, .5);
    amb.str.gain.setTargetAtTime(clamp((tn - .55) * .11, 0, .05), t, .6);
    amb.hum.gain.setTargetAtTime(W.power.on.lights ? .16 : .1, t, 1);
    // 屏息：配樂壓到最低，只剩心跳
    const holder = W.phase === 'play' ? W.crew.find(x => x.holding) : null;
    musicGain.gain.setTargetAtTime(vol.m * .7 * (holder ? .22 : 1), t, holder ? .12 : .7);
    // 心跳：被選中的人（屏息時是屏息的人）
    const m = holder || (W.sel >= 0 ? W.crew[W.sel] : null);
    const bpm = m && !m.dead ? m.bpm : Math.max(...W.crew.filter(x => !x.dead).map(x => x.bpm), 60);
    hbT -= dt;
    if ((bpm > 108 || holder) && hbT <= 0 && W.phase === 'play') { hbT = 60 / bpm; const v = holder ? .62 : clamp((bpm - 100) / 80, .05, .55); tone(58, .14, 'sine', v, null, null, { f2: 38, wet: 0 }); tone(52, .12, 'sine', v * .6, null, null, { f2: 34, delay: .16, wet: 0 }); }
    // 船體的聲音
    dripT -= dt; if (dripT <= 0) { dripT = R.f(4, 11); tone(R.f(1200, 2200), .08, 'sine', .04, CAM.x + R.f(-400, 400), CAM.y + R.f(-400, 400), { f2: 600, wet: .7 }); }
    creakT -= dt; if (creakT <= 0) { creakT = R.f(7, 16); noiseB(R.f(.6, 1.4), .05, 'bandpass', R.f(180, 420), 8, CAM.x + R.f(-500, 500), CAM.y + R.f(-500, 500), { f2: R.f(120, 300), wet: .6, a: .2 }); }
    // 牠在附近時的喀喀聲
    const b = W.beast;
    if (b && b.state !== 'dormant' && b.state !== 'dead' && b.state !== 'spaced') { sonT -= dt; if (sonT <= 0) { sonT = R.f(.8, 1.8); const d = Math.hypot(b.x - CAM.x, b.y - CAM.y) / T; if (d < 10) { for (let k = 0; k < 3; k++) tone(R.f(2600, 3400), .018, 'square', .02 * (b.inVent ? .5 : 1), b.x, b.y, { delay: k * .05, lp: 4000, wet: .4 }); } } }
  }
  // ---------- 音效 ----------
  const A = {
    init, setVol, update,
    ui(k) { if (!ready) return; const f = { ok: [880, 1320], power: [440, 660], pick: [660, 990], place: [330, 440], light: [520, 520], sel: [700, 900], tap: [500, 560], bad: [220, 180] }[k] || [600, 800]; tone(f[0], .06, 'square', .05, null, null, { lp: 3000, wet: 0 }); tone(f[1], .07, 'square', .04, null, null, { delay: .06, lp: 3000, wet: 0 }); },
    door(x, y, open, heavy) { noiseB(heavy ? .7 : .45, heavy ? .22 : .14, 'lowpass', open ? 900 : 700, 1, x, y, { f2: open ? 300 : 200 }); tone(heavy ? 70 : 110, heavy ? .25 : .12, 'sine', .25, x, y, { delay: heavy ? .55 : .35, f2: 50 }); },
    step(x, y, run) { tone(R.f(90, 130), .05, 'triangle', run ? .1 : .04, x, y, { f2: 60, wet: .15 }); noiseB(.04, run ? .06 : .02, 'highpass', 2500, 1, x, y, { wet: .1 }); },
    beastStep(x, y, st) { tone(R.f(60, 90), .06, 'sine', .14 + st * .04, x, y, { f2: 40 }); noiseB(.05, .05, 'bandpass', 3000, 3, x, y); },
    scream(x, y, ci) { const f = [190, 330, 150, 360, 300, 160][ci] || 250; tone(f, .9, 'sawtooth', .16, x, y, { f2: f * 1.6, lp: 2000, a: .03, wet: .5 }); noiseB(.8, .08, 'bandpass', 1400, 2, x, y, { a: .03 }); },
    hurt(x, y, ci) { tone(([180, 300, 140, 320, 280, 150][ci] || 220), .25, 'sawtooth', .14, x, y, { f2: 120, lp: 1500 }); noiseB(.15, .16, 'lowpass', 500, 1, x, y); },
    death(x, y) { tone(80, 1.2, 'sine', .25, x, y, { f2: 30 }); noiseB(1.2, .1, 'lowpass', 400, 1, x, y, { f2: 100, wet: .6 }); A.stab(.8); },
    gasp(x, y) { noiseB(.42, .22, 'bandpass', 700, 1.4, x, y, { a: .015, f2: 1700, wet: .35 }); noiseB(.5, .12, 'bandpass', 1300, 2, x, y, { delay: .45, f2: 500, a: .05, wet: .3 }); },
    search(x, y) { for (let k = 0; k < 4; k++) noiseB(.08, .05, 'bandpass', R.f(1500, 3000), 4, x, y, { delay: k * .18 + R.f(0, .08) }); },
    hide(x, y) { noiseB(.3, .06, 'lowpass', 700, 1, x, y); tone(140, .1, 'triangle', .06, x, y, { delay: .2 }); },
    weld(x, y) { noiseB(.9, .12, 'highpass', 3500, 1, x, y, { wet: .2 }); for (let k = 0; k < 5; k++) tone(R.f(3000, 5000), .02, 'square', .03, x, y, { delay: R.f(0, .8), wet: 0 }); },
    work(x, y) { for (let k = 0; k < 3; k++) { tone(R.f(300, 600), .05, 'square', .06, x, y, { delay: k * .22, lp: 1500 }); noiseB(.06, .06, 'bandpass', 2000, 4, x, y, { delay: k * .22 }); } },
    loot(r) { const base = r >= 3 ? 523 : r === 2 ? 440 : 392; const seq = r >= 3 ? [0, 4, 7, 12, 16] : r === 2 ? [0, 4, 7] : [0, 7]; seq.forEach((s, k) => tone(base * Math.pow(2, s / 12), .18, 'triangle', .08, null, null, { delay: k * .07, wet: .5 })); },
    tracker(d) { if (!ready) return; tone(1180, .09, 'sine', .07, null, null, { f2: 1100, wet: .35 }); if (d >= 0) { const f = 1400 + clamp(1 - d / 12, 0, 1) * 900; tone(f, .12, 'sine', .11, null, null, { delay: .32, wet: .4 }); if (d < 5) tone(f, .1, 'sine', .1, null, null, { delay: .5, wet: .4 }); } },
    botBeep(x, y) { tone(1600, .06, 'square', .04, x, y, { lp: 3000 }); tone(1200, .06, 'square', .04, x, y, { delay: .1, lp: 3000 }); },
    lure(x, y) { tone(980, .12, 'square', .07, x, y, { lp: 2500 }); tone(740, .12, 'square', .06, x, y, { delay: .16, lp: 2500 }); },
    alarmPing(x, y) { tone(660, .3, 'sawtooth', .07, x, y, { lp: 1800 }); tone(880, .3, 'sawtooth', .06, x, y, { delay: .32, lp: 1800 }); },
    alarm(on) { if (!on) return; for (let k = 0; k < 4; k++) tone(k % 2 ? 520 : 780, .45, 'sawtooth', .08, null, null, { delay: k * .5, lp: 2000 }); },
    flare(x, y) { noiseB(1.2, .16, 'bandpass', 2500, 1, x, y, { a: .05 }); tone(180, .2, 'sine', .1, x, y); },
    freeze(x, y) { noiseB(1, .2, 'highpass', 4000, 1, x, y, { f2: 8000 }); tone(2400, .4, 'sine', .06, x, y, { f2: 1200 }); },
    gun(x, y) { noiseB(.05, .2, 'bandpass', 1600, 1.4, x, y, { wet: .2 }); tone(140, .05, 'square', .1, x, y, { f2: 60, wet: 0 }); },
    boom(x, y, big) { noiseB(big ? 3 : 1.4, big ? .6 : .45, 'lowpass', 900, 1, x, y, { f2: 60, wet: .6 }); tone(55, big ? 2 : 1, 'sine', .5, x, y, { f2: 25 }); },
    zap(x, y) { for (let k = 0; k < 6; k++) tone(R.f(800, 2400), .04, 'sawtooth', .07, x, y, { delay: k * .04 }); noiseB(.3, .1, 'highpass', 3000, 1, x, y); },
    harpoon(x, y) { noiseB(.12, .3, 'bandpass', 900, 1, x, y); tone(300, .2, 'sawtooth', .1, x, y, { f2: 80 }); },
    flame(x, y) { noiseB(.6, .2, 'lowpass', 1400, .7, x, y, { a: .05, wet: .2 }); noiseB(.6, .06, 'highpass', 4000, 1, x, y); },
    stab(v = 1) { if (!ready) return; const t0 = ac.currentTime; for (const [f, d] of [[146.8, -8], [155.6, 9], [220, 0], [311, 5]]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d; const g = ac.createGain(); env(g, t0, .01, .12 * v, 1.6); const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3000, t0); lp.frequency.exponentialRampToValueAtTime(300, t0 + 1.6); o.connect(lp); lp.connect(g); g.connect(musicGain); g.connect(rev); o.start(t0); o.stop(t0 + 1.8); } noiseB(.4, .12 * v, 'lowpass', 2000, 1, null, null, { f2: 200, wet: .6 }); },
    stinger(st) { A.stab(st === 0 ? .55 : 1); tone(36, 1.5, 'sine', .3, null, null, { f2: 28, wet: 0 }); },
    sonar(x, y, st) { tone(st === 0 ? 2600 : 1900, .14, 'sine', .05 + st * .02, x, y, { f2: st === 0 ? 3400 : 2600, wet: .6 }); },
    bang(x, y, s = 1) { tone(70, .25, 'square', .22 * s, x, y, { f2: 40, lp: 600 }); noiseB(.3, .25 * s, 'lowpass', 600, 1, x, y, { wet: .5 }); },
    burst(x, y) { A.bang(x, y, 1.2); noiseB(.8, .2, 'bandpass', 1200, 2, x, y, { f2: 3000 }); A.scream(x, y, 1); },
    ventIn(x, y) { noiseB(.4, .12, 'bandpass', 800, 3, x, y, { f2: 300 }); tone(120, .2, 'square', .08, x, y, { lp: 500 }); },
    ventOut(x, y) { noiseB(.4, .12, 'bandpass', 500, 3, x, y, { f2: 1200 }); },
    ventRattle(x, y, st) { for (let k = 0; k < 10; k++) tone(R.f(200, 360), .04, 'square', .09, x, y, { delay: k * .13 + R.f(0, .05), lp: 900 }); noiseB(1.6, .05, 'bandpass', 2400, 5, x, y, { a: .4 }); },
    crawl(x, y) { noiseB(.25, .04, 'bandpass', R.f(1500, 2600), 6, x, y, { wet: .5 }); },
    emerge(x, y, st) { noiseB(.5, .18, 'lowpass', 1200, 1, x, y, { f2: 400 }); tone(st === 0 ? 900 : 420, .5, 'sawtooth', .1, x, y, { f2: st === 0 ? 1400 : 700, lp: 1800 }); },
    feed(x, y) { noiseB(.5, .08, 'bandpass', 700, 6, x, y, { f2: 400 }); tone(160, .1, 'sine', .05, x, y, { delay: .2 }); },
    grab(x, y) { A.stab(1.1); noiseB(.6, .3, 'lowpass', 1000, 1, x, y); tone(320, .6, 'sawtooth', .14, x, y, { f2: 900, lp: 2200 }); },
    drag() { noiseB(2, .1, 'lowpass', 400, 1, null, null, { f2: 150, wet: .6 }); },
    beastHurt(x, y, st) { tone(st === 0 ? 1200 : 600, .4, 'sawtooth', .14, x, y, { f2: st === 0 ? 1800 : 1100, lp: 2600 }); noiseB(.3, .12, 'bandpass', 2200, 2, x, y); },
    beastDeath(x, y, st) { tone(st === 0 ? 1400 : 700, 2.2, 'sawtooth', .18, x, y, { f2: 90, lp: 2400, wet: .7 }); noiseB(2, .15, 'bandpass', 1800, 1.5, x, y, { f2: 200 }); },
    mimic(x, y) { const t0 = .0; for (let k = 0; k < 5; k++) tone(R.f(180, 320), .18, 'sawtooth', .05, x, y, { delay: t0 + k * .2, f2: R.f(150, 350), lp: 1100, wet: .7 }); },
    molt() { for (let k = 0; k < 8; k++) noiseB(.08, .08, 'bandpass', R.f(1200, 2400), 6, null, null, { delay: k * .3 + R.f(0, .1), wet: .7 }); },
    damper(x, y, closed) { tone(closed ? 180 : 240, .12, 'square', .08, x, y, { lp: 800 }); noiseB(.2, .06, 'bandpass', 900, 3, x, y); },
    decompress() { noiseB(3.5, .5, 'lowpass', 3000, .7, null, null, { f2: 120, a: .02, wet: .5 }); tone(40, 3, 'sine', .4, null, null, { f2: 25 }); },
    launch() { noiseB(3, .4, 'lowpass', 600, 1, null, null, { f2: 2000, a: .5 }); tone(60, 3, 'sawtooth', .15, null, null, { f2: 120, lp: 400 }); },
  };
  return A;
})();
