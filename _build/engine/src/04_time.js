/* ==========================================================================
   04 時間與主迴圈
   - 預設「可變步長」：每畫一格就更新一次，dt 是這格經過的秒數（長的格子會切成
     不超過 1/60 秒的小段），在 60／120／240Hz 螢幕上都順。要可重現的物理就設
     config.step = 1/60（固定步長），畫面用 PZ.time.alpha 插值。
   - 打擊停頓 PZ.freeze(ms)、慢動作 PZ.slowmo(倍率, 秒數)、暫停 PZ.pause()。
   - 計時器 PZ.after / PZ.every / await PZ.wait(秒)，跟著遊戲時間走（暫停、停頓時不動）；
     要跟著真實時間走就加 { real: true }。
   - 自動畫質：連續卡頓就降一階（解析度、泛光、粒子量），夠順再升回去。
   ========================================================================== */
const Time = PZ.time = {
  t: 0, real: 0, dt: 0, rdt: 1 / 60, frame: 0,
  scale: 1, paused: false, alpha: 1,
  step: 0, maxStep: 1 / 60, maxSub: 6,
  fps: 60, refresh: 60,
  _freeze: 0, _slow: null, _pauseWhy: new Set(),
};

/** 目前實際套用的時間倍率（含慢動作與停頓） */
Time.effScale = () => {
  if (Time._freeze > 0) return 0;
  let s = Time.scale;
  const sm = Time._slow;
  if (sm) s *= sm.cur;
  return s;
};

/** 打擊停頓：世界停住 ms 毫秒（多次呼叫取最長的那個，不會累加） */
PZ.freeze = (ms) => { Time._freeze = Math.max(Time._freeze, ms / 1000); };
/** 慢動作：倍率 scale（例如 0.25）維持 sec 秒，最後 back 秒平滑回到 1 */
PZ.slowmo = (scale, sec = 0.6, back = 0.25) => { Time._slow = { to: scale, cur: Math.min(scale, Time._slow ? Time._slow.cur : 1), hold: sec, back, t: 0 }; };

/** 暫停：可以帶原因（'menu'、'hidden'、'rotate'…），全部原因解除才會恢復 */
PZ.pause = (why = 'game') => {
  const was = Time.paused; Time._pauseWhy.add(why); Time.paused = true;
  if (!was) PZ.emit('pause', why);
};
PZ.resume = (why = 'game') => {
  Time._pauseWhy.delete(why);
  if (why === '*') Time._pauseWhy.clear();
  if (Time.paused && Time._pauseWhy.size === 0) { Time.paused = false; Loop.last = 0; PZ.emit('resume', why); }
};
PZ.isPaused = (why) => (why ? Time._pauseWhy.has(why) : Time.paused);

/* ---------- 計時器 ---------- */
const Timers = { list: [], real: [] };
function addTimer(sec, fn, every, real) {
  const t = { at: (real ? Time.real : Time.t) + Math.max(0, sec), fn, every: every ? Math.max(0.001, sec) : 0, real: !!real, dead: false, cancel() { this.dead = true; } };
  (real ? Timers.real : Timers.list).push(t);
  return t;
}
function runTimers(list, now) {
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (t.dead) { list.splice(i--, 1); continue; }
    if (now >= t.at) {
      safeCall(t.fn, null);
      if (t.every && !t.dead) { t.at += t.every; if (t.at < now) t.at = now + t.every; } else { t.dead = true; list.splice(i--, 1); }
    }
  }
}
PZ.after = (sec, fn, o) => addTimer(sec, fn, false, o && o.real);
PZ.every = (sec, fn, o) => addTimer(sec, fn, true, o && o.real);
PZ.wait = (sec, o) => new Promise((res) => addTimer(sec, res, false, o && o.real));
PZ.waitReal = (sec) => PZ.wait(sec, { real: true });
PZ.nextFrame = () => new Promise((res) => Loop.once.push(res));
/** 換場景時清掉遊戲時間的計時器（不影響 real 的） */
PZ.clearTimers = () => { for (const t of Timers.list) t.dead = true; Timers.list.length = 0; };

/* ---------- 系統登記：各模組把每格要做的事掛上來，依 order 排序 ---------- */
const Systems = [];
/** sys = { name, order, frame(rdt) 每畫面一次（真實時間）, update(dt) 每次遊戲更新, render(g) } */
function addSystem(sys) { Systems.push(sys); Systems.sort((a, b) => (a.order || 0) - (b.order || 0)); return sys; }
PZ.addSystem = addSystem;

/* ---------- 效能監測與自動畫質 ---------- */
const Quality = PZ.quality = {
  tier: 3, start: 3, auto: true, ups: 0,
  // 每一階：解析度倍率、泛光、後製、粒子量
  tiers: [
    { name: '流暢', res: 0.6, bloom: 0, post: false, particles: 0.45 },
    { name: '平衡', res: 0.75, bloom: 0, post: true, particles: 0.65 },
    { name: '精細', res: 0.88, bloom: 1, post: true, particles: 0.85 },
    { name: '極致', res: 1.0, bloom: 2, post: true, particles: 1.0 },
  ],
  get cur() { return Quality.tiers[Quality.tier]; },
  set(t, why) {
    t = clamp(t | 0, 0, Quality.tiers.length - 1);
    if (t === Quality.tier) return;
    Quality.tier = t; Perf.reset();
    PZ.emit('quality', t, why);
  },
};
const Perf = PZ.perf = {
  ema: 1 / 60, slowT: 0, fastT: 0, work: 0, workEma: 0, upd: 0, ren: 0, hold: 1.5,
  samples: [],
  reset() { this.slowT = 0; this.fastT = 0; this.hold = 1.5; },
  frame(rdt) {
    // 剛開始、剛恢復時前幾秒不算（載入、編譯著色器都會卡）
    if (this.hold > 0) { this.hold -= rdt; return; }
    this.ema = this.ema * 0.92 + rdt * 0.08;
    // 估算螢幕更新率
    if (this.samples.length < 120) { this.samples.push(rdt); if (this.samples.length === 120) { const s = this.samples.slice().sort((a, b) => a - b); const m = s[60]; Time.refresh = m > 0 ? Math.round(1 / m) : 60; } }
    if (!Quality.auto || Time.paused) return;
    if (this.ema > 1 / 48) { this.slowT += rdt; this.fastT = 0; } else { this.slowT = Math.max(0, this.slowT - rdt * 0.5); }
    if (this.ema < 1 / 57) this.fastT += rdt; else this.fastT = 0;
    if (this.slowT > 2.5 && Quality.tier > 0) { Quality.set(Quality.tier - 1, 'slow'); }
    else if (this.fastT > 18 && Quality.tier < Quality.start && Quality.ups < 2) { Quality.ups++; Quality.set(Quality.tier + 1, 'fast'); }
  },
};

/* ---------- 主迴圈 ---------- */
const Loop = PZ.loop = { running: false, last: 0, raf: 0, acc: 0, once: [], fpsCap: 0, _skip: 0, onUpdate: null, onRender: null };

function stepUpdate(dt, first) {
  Time.dt = dt; Time.t += dt;
  runTimers(Timers.list, Time.t);
  for (const s of Systems) if (s.update) { try { s.update(dt, first); } catch (e) { reportError(e, s.name + '.update'); } }
}

function tick(rdt) {
  const t0 = nowMs();
  Time.rdt = rdt; Time.real += rdt; Time.frame++;
  if (rdt > 0) Time.fps = Time.fps * 0.9 + (1 / rdt) * 0.1;
  Perf.frame(rdt);
  // 慢動作與停頓用真實時間倒數
  if (Time._freeze > 0) Time._freeze = Math.max(0, Time._freeze - rdt);
  const sm = Time._slow;
  if (sm) {
    sm.t += rdt;
    if (sm.t < 0.06) sm.cur = lerp(sm.cur, sm.to, clamp01(sm.t / 0.06));
    else if (sm.t < sm.hold) sm.cur = sm.to;
    else if (sm.t < sm.hold + sm.back) sm.cur = lerp(sm.to, 1, Ease.inOutQuad((sm.t - sm.hold) / sm.back));
    else Time._slow = null;
  }
  runTimers(Timers.real, Time.real);
  for (const s of Systems) if (s.frame) { try { s.frame(rdt); } catch (e) { reportError(e, s.name + '.frame'); } }
  const t1 = nowMs();
  if (!Time.paused) {
    const gdt = rdt * Time.effScale();
    if (Time.step > 0) {
      Loop.acc += gdt; let n = 0;
      while (Loop.acc >= Time.step && n < Time.maxSub) { stepUpdate(Time.step, n === 0); Loop.acc -= Time.step; n++; }
      if (n >= Time.maxSub) Loop.acc = 0;
      Time.alpha = Loop.acc / Time.step;
    } else if (gdt > 0) {
      const n = Math.min(Time.maxSub, Math.ceil(gdt / Time.maxStep - 1e-6));
      const sub = gdt / n;
      for (let i = 0; i < n; i++) stepUpdate(sub, i === 0);
      Time.alpha = 1;
    } else {
      Time.dt = 0;
    }
  }
  const t2 = nowMs();
  for (const s of Systems) if (s.render) { try { s.render(); } catch (e) { reportError(e, s.name + '.render'); } }
  const t3 = nowMs();
  Perf.upd = Perf.upd * 0.9 + (t2 - t1) * 0.1; Perf.ren = Perf.ren * 0.9 + (t3 - t2) * 0.1; Perf.work = Perf.work * 0.9 + (t3 - t0) * 0.1;
  if (Loop.once.length) { const a = Loop.once; Loop.once = []; for (const f of a) f(); }
}

function frame(ts) {
  if (!Loop.running) return;
  Loop.raf = requestAnimationFrame(frame);
  const t = ts / 1000;
  let rdt = Loop.last ? t - Loop.last : 1 / 60;
  // 鎖幀（省電）：太早到的格子先跳過
  if (Loop.fpsCap > 0 && Loop.last && rdt < 1 / Loop.fpsCap - 0.002) return;
  Loop.last = t;
  if (rdt < 0) rdt = 0;
  if (rdt > 0.1) rdt = 0.1; // 切回來、卡很久：最多算 0.1 秒，不讓世界一次跳太遠
  tick(rdt);
}

Loop.start = () => {
  if (Loop.running) return;
  Loop.running = true; Loop.last = 0;
  if (HAS_DOM && typeof requestAnimationFrame === 'function') Loop.raf = requestAnimationFrame(frame);
};
Loop.stop = () => { Loop.running = false; if (HAS_DOM) cancelAnimationFrame(Loop.raf); };
/** 測試用：不經過 requestAnimationFrame，直接跑 n 格（每格 dt 秒） */
Loop.step = (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) tick(dt); };
Loop.tick = tick;

/* 頁面被收起來／切回來 */
if (HAS_DOM) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { PZ.emit('hidden'); }
    else { Loop.last = 0; Perf.reset(); PZ.emit('visible'); }
  });
  window.addEventListener('pagehide', () => PZ.emit('hidden', 'pagehide'));
  window.addEventListener('pageshow', (e) => { if (e.persisted) { Loop.last = 0; PZ.emit('visible', 'pageshow'); } });
}
