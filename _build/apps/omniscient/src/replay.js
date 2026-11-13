/* 全知 OMNISCIENT — 回放：把某一天真的發生過的事，照時間順序重新演一次
   - 價格：冷眼記下的當天每一輪整股行情（spark.json），回放到幾點就只顯示幾點以前的成交
   - 新聞：冷眼收到的公告與新聞，照發布時間出現
   - 官方資料：各來源當天實際同步成功的時間
   不在資料裡的東西（例如盤中的加權指數）不會被畫出來。 */

const RP = {
  active: false, playing: false, day: null, p: 0, events: [], fired: 0, endMin: 1440, raf: 0, last: 0,
  hi: {}, lo: {}, hiN: 0, opened: {}, reported: false, loopTimer: 0,
  // 進度（0～1）對應到當天幾點：盤前 07:00 起 5%、盤中 80%、盤後 15%（07:00 以前的新聞一開始就已經在畫面上）
  SEG: [[0, 0.05, 420, 540], [0.05, 0.85, 540, 810], [0.85, 1, 810, null]],
  get dur() { return 180 / (settings.speed || 1); },

  minuteOf(p) {
    for (const [a, b, m0, m1] of this.SEG) {
      const end = m1 == null ? this.endMin : m1;
      if (p <= b) return m0 + (end - m0) * clamp((p - a) / (b - a), 0, 1);
    }
    return this.endMin;
  },
  progressOf(m) {
    if (m < this.SEG[0][2]) return 0;
    for (const [a, b, m0, m1] of this.SEG) {
      const end = m1 == null ? this.endMin : m1;
      if (m <= end) return a + (b - a) * clamp((m - m0) / (end - m0 || 1), 0, 1);
    }
    return 1;
  },
  dayMin(ms) { const t = tw(ms); return t.hh * 60 + t.mi + t.ss / 60; },

  build(day) {
    const ev = [];
    const t = tw();
    this.endMin = day === t.ymd ? Math.max(820, Math.min(1440, t.hh * 60 + t.mi)) : 1440;
    // 時段
    ev.push({ m: 540, type: 'open' });
    ev.push({ m: 805, type: 'auction' });
    ev.push({ m: 810, type: 'close' });
    // 新聞與公告
    for (const x of newsOn(day)) {
      const m = x.timed ? this.dayMin(x.ms) : 480;
      if (m <= this.endMin) ev.push({ m, type: 'news', item: x });
    }
    // 官方來源當天同步成功的時間
    for (const s of sourcesList()) {
      if (isFinite(s.ok) && ymdOf(s.ok) === day) { const m = this.dayMin(s.ok); if (m <= this.endMin) ev.push({ m, type: 'src', src: s }); }
    }
    // 收盤批次（規則重新計算）
    if (D.summary && D.summary.asof === day) { const g = parseTs(D.summary.generated); if (isFinite(g) && ymdOf(g) === day) ev.push({ m: this.dayMin(g), type: 'eod' }); }
    // 自選每一檔的每一筆盤中紀錄
    for (const c of watchCodes()) for (const [mm, px] of sparkOf(c)) ev.push({ m: 540 + mm, type: 'px', code: c, px });
    ev.sort((a, b) => a.m - b.m || (a.type === 'px') - (b.type === 'px'));
    this.events = ev;
  },

  start(day, { at = 0, play = true } = {}) {
    this.stop(true);
    this.active = true; this.day = day; this.reported = false;
    this.build(day);
    $('#report').hidden = true;
    UI.view = { mode: 'replay', day, minute: -9999 };
    this.seek(at, true);
    this.playing = play;
    this.last = performance.now();
    this.loop();
    this.renderBar();
    bus.emit('replay-start', day);
  },
  stop(silent) {
    cancelAnimationFrame(this.raf); clearTimeout(this.loopTimer);
    const was = this.active;
    this.active = false; this.playing = false;
    if (was && !silent) { UI.view = { mode: 'live', minute: null, day: null }; bus.emit('replay-stop'); }
    this.renderBar();
  },
  toggle() { if (!this.active) return; if (this.p >= 1) { this.start(this.day); return; } this.playing = !this.playing; this.last = performance.now(); this.renderBar(); },
  loop() {
    cancelAnimationFrame(this.raf);
    const step = (t) => {
      if (!this.active) return;
      const dt = Math.min(0.1, (t - this.last) / 1000); this.last = t;
      if (this.playing && !document.hidden) {
        this.p = Math.min(1, this.p + dt / this.dur);
        this.fireUpTo(this.minuteOf(this.p), false);
        if (this.p >= 1) { this.playing = false; this.finish(); }
      }
      this.renderBar(true);
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  },
  /** 走到 minute：把中間的事件依序觸發（silent＝拖動進度條時不放特效） */
  fireUpTo(minute, silent) {
    const prevSession = UI.view.minute;
    UI.view.minute = minute - 540;
    const fired = [];
    while (this.fired < this.events.length && this.events[this.fired].m <= minute) { fired.push(this.events[this.fired]); this.fired++; }
    const pxCodes = new Set();
    for (const ev of fired) {
      if (ev.type === 'px') { pxCodes.add(ev.code); this.trackExtremes(ev, silent); continue; }
      bus.emit('replay-event', { ev, silent });
    }
    if (pxCodes.size) bus.emit('replay-px', { codes: Array.from(pxCodes), silent });
    if (Math.floor(prevSession / 2) !== Math.floor(UI.view.minute / 2) || fired.length) bus.emit('replay-time', { silent });
  },
  trackExtremes(ev, silent) {
    const c = ev.code;
    if (!this.opened[c]) { this.opened[c] = ev.px; this.hi[c] = ev.px; this.lo[c] = ev.px; return; }
    const m = ev.m - 540;
    if (ev.px > this.hi[c] * 1.003 && m >= 30 && c === watchCodes()[0] && this.hiN < 4) { this.hiN++; bus.emit('replay-event', { ev: { m: ev.m, type: 'high', code: c, px: ev.px }, silent }); }
    if (ev.px < this.lo[c] * 0.997 && m >= 30 && c === watchCodes()[0] && this.hiN < 4) { this.hiN++; bus.emit('replay-event', { ev: { m: ev.m, type: 'low', code: c, px: ev.px }, silent }); }
    this.hi[c] = Math.max(this.hi[c], ev.px); this.lo[c] = Math.min(this.lo[c], ev.px);
  },
  seek(p, silent = true) {
    p = clamp(p, 0, 1);
    this.p = p;
    this.fired = 0; this.hi = {}; this.lo = {}; this.opened = {}; this.hiN = 0;
    UI.shownNews = new Set(); UI.newsReady = false;
    UI.clearLog();
    UI.view.minute = -9999;
    this.fireUpTo(this.minuteOf(p), true);
    UI.newsReady = true;
    bus.emit('replay-seek');
    this.renderBar();
    if (p < 1) { this.reported = false; $('#report').hidden = true; }
  },
  finish() {
    if (this.reported) return;
    this.reported = true;
    bus.emit('replay-end', this.day);
  },

  // ---------------------------------------------------------------- 底列的回放控制
  renderBar(light) {
    const rp = $('#rp');
    if (!rp) return;
    if (!this.active) {
      const ph = marketPhase();
      const day = D.spark && D.spark.d;
      const h = `${day ? `<button type="button" class="rb" data-act="replay" title="回放（R）"><svg viewBox="0 0 16 16"><path d="M4 3v10l9-5z"/></svg></button><span class="rl2">${ph.phase === 'open' ? '盤中即時 · 回看今天到現在' : `回放 ${dateText(day)}（${WD[weekday(day)]}）整天`}</span>` : '<span class="rl2">還沒有可以回放的交易日</span>'}`;
      if (rp.dataset.h !== h) { rp.innerHTML = h; rp.dataset.h = h; }
      return;
    }
    const minute = this.minuteOf(this.p);
    const label = `${minute < 540 ? '盤前' : minute <= 810 ? '盤中' : '盤後'} ${hmText(ymdToMs(this.day, 0, 0) + minute * 60e3)}`;
    if (light && rp.dataset.ready === this.day + ':' + settings.speed + ':' + this.playing + ':' + (this.p >= 1)) {
      $('.sf', rp).style.width = (this.p * 100).toFixed(2) + '%';
      $('.sh', rp).style.left = (this.p * 100).toFixed(2) + '%';
      $('.rl2', rp).textContent = `回放 ${dateText(this.day)} · ${label}`;
      return;
    }
    const marks = this.events.filter((e) => e.type === 'news').map((e) => `<i class="mk${e.item.kind === 'opinion' ? ' op' : ''}" style="left:${(this.progressOf(e.m) * 100).toFixed(2)}%"></i>`).join('');
    const ticks = [[540, '09:00'], [660, '11:00'], [810, '13:30'], [this.endMin, this.endMin >= 1440 ? '24:00' : hmText(ymdToMs(this.day, 0, 0) + this.endMin * 60e3)]].map(([m, t]) => `<span class="tk" style="left:${(this.progressOf(m) * 100).toFixed(1)}%">${t}</span>`).join('');
    const ph = marketPhase();
    rp.innerHTML = `<button type="button" class="rb" data-act="play" title="播放／暫停（空白鍵）">${this.playing ? '<svg viewBox="0 0 16 16"><path d="M4 3h3v10H4zM9 3h3v10H9z"/></svg>' : '<svg viewBox="0 0 16 16"><path d="M4 3v10l9-5z"/></svg>'}</button>`
      + `<button type="button" class="rs" data-act="speed" title="回放速度">${settings.speed}×</button>`
      + `<span class="rl2">回放 ${dateText(this.day)} · ${label}</span>`
      + `<div class="scrub" id="scrub"><i class="sk"></i>${marks}<i class="sf" style="width:${(this.p * 100).toFixed(2)}%"></i><i class="sh" style="left:${(this.p * 100).toFixed(2)}%"></i>${ticks}</div>`
      + `<button type="button" class="golive" data-act="live">${ph.phase === 'open' ? '● 回到即時' : '看最新資料'}</button>`;
    rp.dataset.ready = this.day + ':' + settings.speed + ':' + this.playing + ':' + (this.p >= 1);
    rp.dataset.h = '';
    const sc = $('#scrub', rp);
    const drag = (e) => { const r = sc.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; this.seek(x / r.width, true); };
    sc.addEventListener('pointerdown', (e) => { drag(e); sc.setPointerCapture(e.pointerId); const mv = (ev) => drag(ev); const up = () => { sc.removeEventListener('pointermove', mv); sc.removeEventListener('pointerup', up); }; sc.addEventListener('pointermove', mv); sc.addEventListener('pointerup', up); });
  },
};
