// ============ 聲音：全部即時合成（玻璃琴動機、淵裡的低鳴、打擊音效）============
const AU = { ctx: null, master: null, sfxG: null, musG: null, send: null, drone: null, mode: 'deep', battle: 0, step: 0, nextT: 0, stepDur: .42, timer: null, nbuf: null, walk: 3, last: {} };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume().catch(() => { }); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try { AU.ctx = new AC(); } catch (e) { AU.ctx = null; return; }
  const c = AU.ctx, comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; comp.connect(c.destination);
  AU.master = c.createGain(); AU.master.gain.value = .9; AU.master.connect(comp);
  AU.sfxG = c.createGain(); AU.sfxG.connect(AU.master); AU.musG = c.createGain(); AU.musG.connect(AU.master);
  // 一條帶回授的延遲當殘響（淵很深）
  const dl = c.createDelay(1), fb = c.createGain(), lp = c.createBiquadFilter(); dl.delayTime.value = .37; fb.gain.value = .42; lp.type = 'lowpass'; lp.frequency.value = 2200;
  AU.send = c.createGain(); AU.send.gain.value = .5; AU.send.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(AU.master);
  const nb = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; AU.nbuf = nb;
  // 低鳴：三個振盪器，常駐
  const dg = c.createGain(), df = c.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 260; dg.gain.value = 0; dg.connect(df); df.connect(AU.musG);
  const os = [36.71, 73.42, 110].map((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = f; g.gain.value = [.5, .34, .1][i]; o.connect(g); g.connect(dg); o.start(); return o; });
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .07; lg.gain.value = .05; lfo.connect(lg); lg.connect(dg.gain); lfo.start();
  AU.drone = { g: dg, f: df, os };
  audioVolume(); AU.nextT = c.currentTime + .2; if (!AU.timer) AU.timer = setInterval(musicTick, 90); audioMode();
  document.addEventListener('visibilitychange', () => { if (!AU.ctx) return; if (document.hidden) AU.ctx.suspend().catch(() => { }); else AU.ctx.resume().catch(() => { }); });
}
function audioVolume() { if (!AU.ctx) return; const t = AU.ctx.currentTime; AU.sfxG.gain.setTargetAtTime(S.set.sfx * .9, t, .05); AU.musG.gain.setTargetAtTime(S.set.music * .62, t, .2); }
function audioZone(Zd) { AU.mode = (Zd && Zd.music) || 'explore'; audioMode(); }
function audioBattle(n) { AU.battle = n | 0; audioMode(); }
function audioMode() {
  if (!AU.ctx) return; const t = AU.ctx.currentTime, b = AU.battle, m = AU.mode, D = AU.drone;
  AU.stepDur = b ? (b > 1 ? .26 : .29) : m === 'camp' ? .46 : m === 'town' ? .4 : .42;
  D.g.gain.setTargetAtTime(b ? .32 : m === 'deep' ? .46 : m === 'camp' ? .2 : .34, t, .8); D.f.frequency.setTargetAtTime(b ? 420 : m === 'deep' ? 190 : 280, t, .8);
  D.os[2].frequency.setTargetAtTime(m === 'deep' && !b ? 130.81 : 110, t, .5); // 最深的地方把五度換成小七度，比較暗
}
// 基本發聲
function tone(f, dur, vol, o) {
  const c = AU.ctx; if (!c) return; o = o || {}; const t0 = c.currentTime + (o.t || 0), os = c.createOscillator(), g = c.createGain();
  os.type = o.type || 'sine'; os.frequency.setValueAtTime(f, t0); if (o.f2) os.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t0 + dur);
  g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + (o.a || .006)); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  os.connect(g); g.connect(o.dest || AU.sfxG); if (o.rev) g.connect(AU.send); os.start(t0); os.stop(t0 + dur + .05);
}
function nz(dur, vol, f, o) {
  const c = AU.ctx; if (!c) return; o = o || {}; const t0 = c.currentTime + (o.t || 0), s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = AU.nbuf; s.loop = true; fl.type = o.type || 'bandpass'; fl.Q.value = o.q || 1; fl.frequency.setValueAtTime(f, t0); if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
  g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + (o.a || .004)); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  s.connect(fl); fl.connect(g); g.connect(o.dest || AU.sfxG); if (o.rev) g.connect(AU.send); s.start(t0, Math.random()); s.stop(t0 + dur + .05);
}
// 玻璃：一個基音加幾個不成整數倍的泛音，尾巴長
function glass(f, vol, o) { o = o || {}; const d = o.dur || 1.6; tone(f, d, vol, { t: o.t, rev: true, dest: o.dest }); tone(f * 2.76, d * .45, vol * .28, { t: o.t, rev: true, dest: o.dest }); tone(f * 5.4, d * .2, vol * .12, { t: o.t, dest: o.dest }); }
const arp = (fs, gap, vol, o) => fs.forEach((f, i) => glass(f, vol, Object.assign({ t: i * gap, dur: 1.1 }, o)));
const SFX = {
  ui: () => tone(880, .05, .07, { type: 'triangle' }), uiSoft: () => tone(660, .04, .045, { type: 'triangle' }), confirm: () => { tone(660, .07, .08, { type: 'triangle' }); tone(990, .1, .08, { type: 'triangle', t: .06 }); },
  deny: () => tone(150, .12, .07, { type: 'square' }), talk: () => tone(430, .035, .035, { type: 'triangle' }), turn: () => { tone(523, .07, .05); tone(784, .12, .05, { t: .05 }); },
  zone: () => { tone(73.4, 2.2, .3, { rev: true }); tone(146.8, 1.6, .12, { rev: true }); glass(587, .1, { t: .3, dur: 2.2 }); glass(880, .07, { t: .7, dur: 2.2 }); },
  engage: () => { nz(.35, .22, 300, { f2: 3000 }); tone(90, .4, .4, { f2: 40 }); nz(.12, .12, 3200, { t: .3, q: 6 }); },
  swing: () => nz(.15, .2, 900, { f2: 2800, q: 1.4 }), swingFoe: () => nz(.18, .2, 500, { f2: 1600, q: 1.2 }),
  hit: () => { nz(.09, .3, 1300, { type: 'lowpass' }); tone(150, .11, .3, { f2: 70 }); }, hitHeavy: () => { nz(.16, .4, 900, { type: 'lowpass' }); tone(110, .24, .5, { f2: 42 }); },
  crit: () => { for (let i = 0; i < 6; i++) tone(2200 + Math.random() * 3200, .12 + Math.random() * .2, .06, { t: i * .012, rev: true }); nz(.2, .14, 5000, { type: 'highpass' }); },
  slam: () => { tone(78, .6, .7, { f2: 26 }); nz(.4, .4, 500, { type: 'lowpass', f2: 80 }); tone(196, .5, .1, { t: .03, rev: true }); },
  lift: () => { tone(260, .5, .1, { f2: 1040, rev: true }); tone(390, .5, .06, { f2: 1560, t: .04, rev: true }); tone(650, .4, .04, { f2: 2600, t: .1 }); },
  bolt: () => { nz(.07, .22, 3500, { type: 'highpass' }); tone(1300, .09, .07, { f2: 500 }); }, hook: () => { nz(.2, .18, 1200, { f2: 4000, q: 3 }); tone(900, .05, .08, { type: 'square', t: .16 }); },
  cast: () => { tone(520, .4, .07, { f2: 640, rev: true }); tone(780, .4, .05, { f2: 930, rev: true }); }, explode: () => { nz(.7, .5, 900, { type: 'lowpass', f2: 70 }); tone(70, .5, .5, { f2: 30 }); },
  spit: () => nz(.14, .2, 1700, { f2: 500, q: 2 }), charge: () => { tone(98, .5, .09, { type: 'sawtooth', f2: 196 }); tone(147, .5, .06, { type: 'sawtooth', f2: 294 }); },
  stagger: () => { tone(311, .34, .1, { rev: true }); tone(329, .34, .1); }, mark: () => tone(1568, .14, .08, { rev: true }), interrupt: () => { nz(.1, .25, 2500, { q: 2 }); tone(900, .3, .14, { f2: 280, rev: true }); },
  chip: () => tone(520, .04, .07, { type: 'square' }), reso: () => { glass(784, .07, { dur: .7 }); glass(1175, .05, { t: .05, dur: .7 }); }, shield: () => { tone(392, .28, .08, { type: 'triangle' }); tone(523, .28, .08, { type: 'triangle', t: .03 }); },
  heal: () => arp([523, 659, 784], .07, .06), down: () => tone(300, .55, .22, { f2: 70 }), death: () => { for (let i = 0; i < 5; i++) tone(1100 + i * 260, .5, .04, { f2: 2400 + i * 400, t: i * .03, rev: true }); nz(.25, .1, 6000, { type: 'highpass' }); },
  summon: () => { tone(82, .5, .16, { type: 'sawtooth', f2: 110 }); nz(.4, .12, 400, { q: 2 }); }, chain: () => { for (let i = 0; i < 6; i++) nz(.04, .18, 2600 + Math.random() * 1600, { t: i * .045, q: 8 }); },
  ult: () => { tone(55, 1.1, .5, { f2: 36 }); nz(.8, .18, 300, { f2: 5000 }); arp([293.7, 440, 587.3, 880], .09, .09); }, link: () => { glass(880, .09, { dur: .8 }); glass(1318, .09, { t: .08, dur: .9 }); },
  perfect: () => { arp([880, 1318, 1760], .07, .1); nz(.5, .06, 6000, { type: 'highpass', t: .1 }); }, chest: () => { nz(.2, .15, 320, { q: 3 }); glass(659, .08, { t: .16, dur: 1 }); glass(988, .08, { t: .26, dur: 1.2 }); },
  shard: () => { glass(2093, .1, { dur: 2.4 }); glass(3136, .06, { t: .12, dur: 2.4 }); }, glass: () => arp([1175, 1568, 2093, 2349], .14, .06, { dur: 2 }),
  loot0: () => tone(300, .07, .1, { type: 'triangle' }), loot1: () => glass(659, .1, { dur: .9 }), loot2: () => arp([659, 880], .09, .1), loot3: () => { arp([659, 880, 1175], .09, .1); nz(.4, .04, 7000, { type: 'highpass', t: .15 }); },
  loot4: () => { tone(73, 1.2, .4, { f2: 55, rev: true }); arp([587, 698, 880, 1175, 1397, 1760], .1, .11, { dur: 2 }); nz(.9, .06, 8000, { type: 'highpass', t: .3 }); },
  levelup: () => arp([293.7, 440, 587.3, 698.5, 880], .1, .1, { dur: 1.6 }), talent: () => { glass(440, .08); glass(659, .08, { t: .02 }); glass(880, .08, { t: .04 }); },
  equip: () => { nz(.06, .16, 1800, { q: 2 }); tone(320, .08, .08, { type: 'triangle', t: .03 }); }, craft: () => { for (const t of [0, .2]) { tone(220, .16, .12, { type: 'square', t }); tone(331, .22, .1, { type: 'square', t }); nz(.05, .2, 3000, { t, q: 3 }); } },
  coin: () => { tone(2400, .06, .06); tone(3200, .09, .06, { t: .05 }); }, rest: () => { for (let i = 0; i < 7; i++) nz(.03, .1, 2000 + Math.random() * 2500, { t: i * .11 + Math.random() * .05, q: 4 }); arp([293.7, 440, 587.3], .3, .06, { dur: 2.2 }); },
  join: () => { glass(293.7, .1, { dur: 1.4 }); glass(440, .1, { t: .16, dur: 1.6 }); }, piece: () => { tone(98, 2, .3, { rev: true }); tone(196, 1.6, .16, { rev: true }); glass(1175, .06, { t: .3, dur: 2.4 }); },
  win: () => arp([293.7, 349.2, 440, 587.3], .12, .11, { dur: 1.6 }), lose: () => { tone(146.8, .6, .2, { rev: true }); tone(130.8, .6, .2, { t: .4, rev: true }); tone(110, 1.2, .2, { t: .8, rev: true }); },
  burn: () => { for (let i = 0; i < 3; i++) nz(.04, .12, 2400 + Math.random() * 2000, { t: i * .04, q: 3 }); },
};
function sfx(n) { if (!AU.ctx || AU.ctx.state !== 'running' || !SFX[n] || S.set.sfx <= 0) return; const now = AU.ctx.currentTime; if (AU.last[n] && now - AU.last[n] < .035) return; AU.last[n] = now; try { SFX[n](); } catch (e) { /* 聲音出錯不影響遊戲 */ } }

// ---------- 音樂：稀疏的玻璃琴（D 多利亞），戰鬥時加低鼓與頑固低音 ----------
const SCALE = [146.83, 164.81, 174.61, 196, 220, 246.94, 261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25, 587.33];
const OST = [73.42, 73.42, 87.31, 73.42, 65.41, 65.41, 55, 65.41];
function musicTick() { const c = AU.ctx; if (!c || c.state !== 'running') return; if (AU.nextT < c.currentTime - .5) AU.nextT = c.currentTime + .05; while (AU.nextT < c.currentTime + .28) { musicStep(AU.step++, AU.nextT - c.currentTime); AU.nextT += AU.stepDur; } }
function musicStep(i, t) {
  if (S.set.music <= 0) return; const M = AU.musG, b = AU.battle, m = AU.mode, r = Math.random;
  const mel = (p, lo, hi, vol) => { if (r() > p) return; AU.walk = clamp(AU.walk + (r() < .5 ? -1 : 1) * (r() < .3 ? 2 : 1), lo, hi); glass(SCALE[AU.walk], vol, { t, dest: M, dur: 2.4 }); if (r() < .22) glass(SCALE[Math.min(SCALE.length - 1, AU.walk + 4)], vol * .6, { t: t + AU.stepDur, dest: M, dur: 2.4 }); };
  if (b) {
    const s = i % 8; tone(OST[s], AU.stepDur * .9, .2, { t, type: 'triangle', dest: M });
    if (s === 0 || s === 5) tone(64, .22, .5, { t, f2: 34, dest: M }); if (s % 2 === 1) nz(.03, .05, 6000, { t, type: 'highpass', dest: M });
    if (b > 1) { if (i % 16 === 12) for (let k = 0; k < 4; k++) nz(.04, .16, 2400 + r() * 1400, { t: t + k * .05, q: 8, dest: M }); if (i % 16 === 0) tone(49, .9, .4, { t, f2: 36, dest: M }); if (i % 16 === 8) tone(98, .5, .16, { t, type: 'sawtooth', f2: 92, dest: M }); }
    if (i % 4 === 0) mel(b > 1 ? .5 : .38, 5, 12, .07);
    return;
  }
  if (m === 'camp') { const pat = [146.83, 220, 293.66, 349.23, 293.66, 220, 196, 220]; if (i % 2 === 0) tone(pat[(i / 2) % 8], 1.1, .06, { t, type: 'triangle', dest: M, rev: true }); mel(.14, 7, 13, .05); if (r() < .3) nz(.03, .05, 1800 + r() * 2600, { t: t + r() * .3, q: 5, dest: M }); return; }
  if (m === 'town') { if (i % 4 === 0) tone([146.83, 196, 174.61, 220][(i / 4) % 4], 1.4, .07, { t, type: 'triangle', dest: M, rev: true }); mel(.2, 5, 12, .055); return; }
  mel(m === 'deep' ? .09 : .15, m === 'deep' ? 1 : 3, m === 'deep' ? 8 : 12, m === 'deep' ? .06 : .055);
  if (r() < .012) { tone(82 + r() * 20, 2.6, .1, { t, f2: 70, type: 'sawtooth', dest: M, rev: true }); }      // 遠處的金屬在呻吟
  if (r() < .03) tone(1800 + r() * 900, .09, .035, { t, f2: 900, dest: M, rev: true });                         // 滴水
}
