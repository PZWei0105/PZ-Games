/* 本機道場 LOCAL DOJO — 主程式 */
(function () {
  'use strict';
  const D = window.DOJO;
  const { esc, fmt } = D.util;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const VERSION = '1.0.0';

  /* ───────── 圖示 ───────── */
  const sv = (p, f) => '<svg viewBox="0 0 24 24" fill="' + (f ? 'currentColor' : 'none') + '" stroke="' + (f ? 'none' : 'currentColor') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const I = {
    dojo: sv('<path d="M3 10l9-6 9 6"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>'),
    cards: sv('<rect x="3" y="6" width="14" height="14" rx="2.5"/><path d="M7 3h11a3 3 0 0 1 3 3v11"/>'),
    tools: sv('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
    me: sv('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    back: sv('<path d="M15 5l-7 7 7 7"/>'),
    check: sv('<path d="M5 12l5 5 9-10"/>'),
    lock: sv('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    clock: sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    target: sv('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" />'),
    fire: sv('<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 2-5 0 2 1 3 2 3 0-4 1-7 2-10z"/>', 1),
    bolt: sv('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', 1),
    copy: sv('<rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'),
    flag: sv('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>'),
    calc: sv('<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/>'),
    decode: sv('<path d="M4 7h16M4 12h10M4 17h6"/><circle cx="18" cy="16" r="3"/><path d="M20.5 18.5L22 20"/>'),
    speed: sv('<path d="M12 14l4-6"/><path d="M3.5 18a9 9 0 1 1 17 0"/>'),
    video: sv('<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10l5-3v10l-5-3"/>'),
    book: sv('<path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 8h6"/>'),
    sound: sv('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a3 3 0 0 1 0 6M18.5 6.5a7 7 0 0 1 0 11"/>'),
    play: sv('<path d="M7 4l13 8-13 8z"/>', 1),
    spark: sv('<path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z"/>', 1),
    wrong: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
    dice: sv('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>'),
    think: sv('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>'),
    hand: sv('<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11.5V4.5a1.5 1.5 0 0 1 3 0V12"/><path d="M14 11.5V6.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.5a6 6 0 0 1-5-2.7L3.7 15a1.5 1.5 0 0 1 2.4-1.8L8 15"/>'),
    laptop: sv('<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>')
  };

  /* ───────── 腰帶 ───────── */
  const BELTS = [
    { n: '白帶', c: '#f4f4f4' }, { n: '黃帶', c: '#ffd23f' }, { n: '綠帶', c: '#3ee08f' }, { n: '藍帶', c: '#4aa8ff' },
    { n: '紫帶', c: '#b27cff' }, { n: '紅帶', c: '#ff5468' }, { n: '黑帶', c: '#141414', gold: true }
  ];
  let bid = 0;
  function belt(i, stripes = 0) {
    const b = BELTS[i]; const id = 'bg' + (++bid); const c = b.c; const edge = b.gold ? '#f3c44e' : 'rgba(0,0,0,.28)';
    const hi = b.gold ? '#3a3a3a' : 'rgba(255,255,255,.55)';
    let st = '';
    for (let k = 0; k < Math.min(stripes, 4); k++) {
      const t = 0.5 + k * 0.11, cx = 104.5 + 21.5 * t, cy = 60 + 50 * t;
      st += '<line x1="' + (cx - 8.3) + '" y1="' + (cy + 3.6) + '" x2="' + (cx + 8.3) + '" y2="' + (cy - 3.6) + '" stroke="' + (b.gold ? '#f3c44e' : i === 0 ? '#111' : '#fff') + '" stroke-width="3.4" stroke-linecap="round" opacity=".95"/>';
    }
    return '<svg viewBox="0 0 200 116" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + hi + '"/><stop offset=".45" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="M4 38 Q100 24 196 38 L196 58 Q100 44 4 58 Z" fill="' + c + '" stroke="' + edge + '" stroke-width="2"/><path d="M4 38 Q100 24 196 38 L196 58 Q100 44 4 58 Z" fill="url(#' + id + ')"/>' +
      '<path d="M90 56 L64 108 L84 112 L101 64 Z" fill="' + c + '" stroke="' + edge + '" stroke-width="2"/>' +
      '<path d="M110 56 L136 108 L116 112 L99 64 Z" fill="' + c + '" stroke="' + edge + '" stroke-width="2"/>' + st +
      '<rect x="80" y="28" width="40" height="38" rx="9" fill="' + c + '" stroke="' + edge + '" stroke-width="2"/><rect x="80" y="28" width="40" height="38" rx="9" fill="url(#' + id + ')"/>' +
      '<path d="M86 40 Q100 34 114 40 M86 54 Q100 48 114 54" stroke="' + edge + '" stroke-width="2" fill="none" opacity=".7"/>' +
      (b.gold ? '<path d="M4 47 Q100 33 196 47" stroke="#f3c44e" stroke-width="1.2" fill="none" opacity=".8"/>' : '') + '</svg>';
  }

  /* ───────── 狀態 ───────── */
  const KEY = 'pzdojo.v1';
  const fresh = () => ({ v: 1, xp: 0, L: {}, E: {}, wrong: {}, srs: {}, days: [], set: { sound: true }, data: {}, badges: {}, st: { ans: 0, right: 0, cards: 0, wrongEver: 0 }, created: Date.now(), intro: false });
  let mem = null;
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return Object.assign(fresh(), s); } catch (e) { /* ignore */ } return mem || fresh(); }
  let S = load();
  function save() { S.upd = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { mem = S; } Cloud.soon(); }
  /* Claude 版：進度跟著 Claude 帳號同步（每個人自己的私人資料夾） */
  const Cloud = {
    on: false, ref: null, busy: false, again: false, t: 0, last: '', state: window.DOJO_WEB ? 'web' : 'off',
    soon() { if (!this.on) return; clearTimeout(this.t); this.t = setTimeout(() => this.push(), 1500); },
    async push() {
      if (!this.on) return;
      if (this.busy) { this.again = true; return; }
      const body = JSON.stringify(S);
      if (body === this.last) return;
      if (body.length > 240000) { this.state = 'big'; return; }
      this.busy = true;
      try { await this.ref.set({ s: body, upd: S.upd || Date.now() }); this.last = body; this.state = 'ok'; }
      catch (e) { if (e && e.code === 'unavailable') setTimeout(() => this.soon(), 4000 + Math.random() * 3000); else { this.on = false; this.state = 'off'; } }
      this.busy = false;
      if (this.again) { this.again = false; this.soon(); }
    },
    async init() {
      if (window.DOJO_WEB || !window.claude || typeof window.claude.use !== 'function') return;
      this.state = 'connecting';
      let db = null, user = null, uid = null, ref = null, snap = null;
      try { [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); } catch (e) { db = null; }
      if (db && user) { try { uid = await user.id(); } catch (e) { uid = null; } }
      if (uid) { try { ref = db.doc('data/users/' + uid + '/progress'); } catch (e) { ref = null; } }
      if (ref) { try { snap = await Promise.race([ref.get(), new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), 10000))]); } catch (e) { snap = null; } }
      if (!snap) { this.state = 'off'; if (location.hash === '#me') renderMe(); return; }
      this.ref = ref; this.on = true; this.state = 'ok';
      const d = snap.exists ? snap.data() : null;
      let remote = null; try { remote = d && typeof d.s === 'string' ? JSON.parse(d.s) : null; } catch (e) { remote = null; }
      const lx = S.xp || 0, rx = remote && remote.v === 1 ? (remote.xp || 0) : -1;
      if (rx >= 0 && (rx > lx || (rx === lx && (remote.upd || 0) > (S.upd || 0)))) {
        const seen = S.seenLog || '';
        S = Object.assign(fresh(), remote); this.last = d.s;
        if (seen > (S.seenLog || '')) S.seenLog = seen; // 這台裝置已經看過的更新提示，不要再跳一次
        try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { mem = S; }
        $('#sheet').classList.remove('on'); route(); toast('已載入你在其他裝置的進度', '☁');
      } else { if (S.upd) this.push(); if (location.hash === '#me') renderMe(); }
    }
  };
  let saveT = 0; const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 300); };

  const LESSONS = [], BYID = {};
  D.stages.forEach((st, si) => { st.si = si; st.lessons.forEach((l, li) => { l.stage = st; l.si = si; l.li = li; LESSONS.push(l); BYID[l.id] = l; }); });
  const TASKS = LESSONS.filter((l) => l.task);
  const LS = (id) => S.L[id] || (S.L[id] = {});
  const learned = (id) => !!(S.L[id] && S.L[id].read && S.L[id].qd);
  const taskDone = (id) => !!(S.L[id] && S.L[id].td);
  const examPassed = (sid) => !!(S.E[sid] && S.E[sid].pass);
  const beltIdx = () => { let b = 0; for (const st of D.stages) { if (examPassed(st.id)) b++; else break; } return b; };
  const stageOpen = (si) => si === 0 || examPassed(D.stages[si - 1].id);
  const lessonOpen = (l) => l.li === 0 || learned(l.stage.lessons[l.li - 1].id);
  const examOpen = (st) => st.lessons.every((l) => learned(l.id));
  const stageDone = (st) => st.lessons.filter((l) => learned(l.id)).length;
  const today = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
  const dstr = (t) => { const d = new Date(t); return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate(); };
  const winPath = (s) => s.replace(/C:\/[^\s，。、「」（）()"'<>]*/g, (m) => m.replace(/\//g, '\\'));

  /* ───────── 音效 ───────── */
  const Sound = {
    ctx: null, noiseBuf: null,
    ensure() {
      if (!S.set.sound) return null;
      if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    tone(f, d, type, gain, t0, f2) {
      const c = this.ctx; if (!c) return; const t = c.currentTime + (t0 || 0);
      const o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain || 0.08, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.05);
    },
    noise(d, gain, t0, freq) {
      const c = this.ctx; if (!c) return;
      if (!this.noiseBuf) { const b = c.createBuffer(1, c.sampleRate, c.sampleRate); const a = b.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; this.noiseBuf = b; }
      const t = c.currentTime + (t0 || 0); const s = c.createBufferSource(); s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(freq || 2000, t); f.frequency.exponentialRampToValueAtTime((freq || 2000) * 3, t + d);
      const g = c.createGain(); g.gain.setValueAtTime(gain || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(f); f.connect(g); g.connect(c.destination); s.start(t); s.stop(t + d + 0.05);
    },
    play(n) {
      if (!this.ensure()) return;
      const T = this;
      ({
        tick: () => T.tone(1250, 0.045, 'sine', 0.035),
        tap: () => T.tone(680, 0.06, 'triangle', 0.05),
        good: () => { T.tone(660, 0.1, 'triangle', 0.09); T.tone(990, 0.16, 'triangle', 0.09, 0.08); },
        bad: () => T.tone(200, 0.22, 'square', 0.045, 0, 130),
        xp: () => { T.tone(1320, 0.06, 'sine', 0.045); T.tone(1760, 0.09, 'sine', 0.04, 0.05); },
        flip: () => T.noise(0.18, 0.05, 0, 1200),
        win: () => { [523, 659, 784, 1047].forEach((f, i) => T.tone(f, 0.22, 'triangle', 0.08, i * 0.08)); T.noise(0.4, 0.03, 0.3, 3000); },
        promo: () => {
          T.tone(110, 2.4, 'sine', 0.14); T.tone(220, 1.8, 'sine', 0.05); T.tone(331, 1.4, 'sine', 0.03);
          [392, 523, 659, 784, 1047, 1319].forEach((f, i) => T.tone(f, 0.5, 'triangle', 0.07, 0.35 + i * 0.09));
          [523, 659, 784].forEach((f) => T.tone(f, 1.8, 'sine', 0.05, 1.0));
          T.noise(1.2, 0.04, 0.3, 1500);
        }
      }[n] || (() => {}))();
      if (navigator.vibrate && (n === 'good' || n === 'bad' || n === 'promo')) { try { navigator.vibrate(n === 'bad' ? [30, 40, 30] : n === 'promo' ? [40, 60, 40, 60, 120] : 15); } catch (e) { /* ignore */ } }
    }
  };
  document.addEventListener('pointerdown', () => { Sound.ensure(); }, true);

  /* ───────── 回饋 ───────── */
  function toast(msg, x, ms) {
    const box = $('#toasts'); const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = (x ? '<span class="x">' + esc(x) + '</span>' : '') + '<span>' + esc(msg) + '</span>';
    box.appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms || 2400);
  }
  let lastPt = null;
  document.addEventListener('pointerup', (e) => { lastPt = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
  function touchDay() { const d = today(); if (!S.days.includes(d)) { S.days.push(d); S.days = S.days.slice(-400); } }
  function gain(n, why) {
    if (!n) return;
    S.xp += n; touchDay(); saveSoon();
    const f = document.createElement('div'); f.className = 'xpf'; f.textContent = '+' + n + ' 修為';
    const p = lastPt && Date.now() - lastPt.t < 1500 ? lastPt : { x: innerWidth / 2, y: innerHeight * 0.4 };
    f.style.left = p.x + 'px'; f.style.top = (p.y - 20) + 'px'; document.body.appendChild(f); setTimeout(() => f.remove(), 1200);
    Sound.play('xp'); hud();
    if (why) toast(why);
    checkBadges();
  }
  function streak() {
    const set = new Set(S.days); let d = today(); if (!set.has(d)) d--; let n = 0; while (set.has(d)) { n++; d--; } return n;
  }
  function copy(text) {
    const done = () => { toast('已複製，貼到筆電的 Claude Code'); Sound.play('good'); };
    const fb = () => { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;top:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('複製失敗，請長按文字自行複製'); } ta.remove(); };
    try { if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fb); else fb(); } catch (e) { fb(); }
  }
  function sheet(html, onClick) {
    const el = $('#sheet'); el.innerHTML = '<div class="bk"></div><div class="pn">' + html + '</div>'; el.classList.add('on');
    el.onclick = (e) => { if (e.target.classList.contains('bk') || e.target.closest('[data-x]')) { el.classList.remove('on'); return; } const b = e.target.closest('[data-s]'); if (b && onClick) { el.classList.remove('on'); onClick(b.dataset.s); } };
  }
  function confetti(cv, colors) {
    const g = cv.getContext('2d'); const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; g.scale(dpr, dpr);
    const P = Array.from({ length: 140 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.42, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 4, r: Math.random() * 6 + 3, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, c: colors[Math.floor(Math.random() * colors.length)] }));
    const t0 = performance.now();
    const fr = (now) => {
      const t = now - t0; g.clearRect(0, 0, innerWidth, innerHeight);
      P.forEach((p) => { p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.globalAlpha = Math.max(0, 1 - t / 3200); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore(); });
      if (t < 3300 && cv.isConnected) requestAnimationFrame(fr); else g.clearRect(0, 0, innerWidth, innerHeight);
    };
    requestAnimationFrame(fr);
  }
  function ceremony(bi, then) {
    const b = BELTS[bi]; const el = $('#cere'); const st = D.stages[bi - 1];
    el.style.setProperty('--belt', b.gold ? '#f3c44e' : b.c); el.style.setProperty('--belt2', b.gold ? '#f3c44e' : b.c);
    el.innerHTML = '<div class="rays"></div><canvas></canvas><div class="ct"><small>PROMOTION</small><div class="bw">' + belt(bi, 0) + '</div><h2>' + b.n + '</h2><p>' + esc(st ? st.skill : '') + '</p><button class="btn big" data-x>繼續修煉</button></div>';
    el.classList.add('on'); Sound.play('promo'); confetti($('canvas', el), [b.gold ? '#f3c44e' : b.c, '#ffffff', '#ffd23f', '#4aa8ff', '#ff5468']);
    el.onclick = (e) => { if (e.target.closest('[data-x]')) { el.classList.remove('on'); el.innerHTML = ''; if (then) then(); } };
  }

  /* ───────── 徽章 ───────── */
  function checkBadges() {
    const has = (id) => S.badges[id];
    const C = {
      first: () => LESSONS.some((l) => learned(l.id)),
      offline: () => taskDone('2-2'), painter: () => taskDone('3-2'), director: () => taskDone('3-4'), librarian: () => taskDone('4-3'),
      forger: () => taskDone('5-2'), stylist: () => taskDone('5-3'), factory: () => taskDone('6-3'),
      perfect: () => Object.values(S.E).some((e) => e.best === 5), streak7: () => streak() >= 7,
      clean: () => S.st.wrongEver >= 5 && !Object.keys(S.wrong).length, scholar: () => S.st.cards >= 50, blackbelt: () => beltIdx() >= 6
    };
    D.badges.forEach((b) => { if (!has(b.id) && C[b.id] && C[b.id]()) { S.badges[b.id] = Date.now(); saveSoon(); setTimeout(() => { toast('獲得徽章：' + b.t, b.ic); Sound.play('win'); }, 500); } });
  }

  /* ───────── 外框 ───────── */
  document.body.insertAdjacentHTML('afterbegin', '<div id="bg"></div><header id="top"></header><main id="view"></main><nav id="tabs"></nav><div id="toasts"></div><div id="sheet"></div><div id="cere"></div>');
  const view = $('#view');
  const setAcc = (c) => document.documentElement.style.setProperty('--acc', c);
  function curStageColor() { const b = beltIdx(); return D.stages[Math.min(b, 5)].color; }
  function hud() {
    const h = $('#top .hud'); if (!h) return;
    const sk = streak();
    h.innerHTML = (sk ? '<span class="pill fire">' + I.fire + sk + '</span>' : '') + '<span class="pill xp">' + I.bolt + S.xp + '</span>';
  }
  function topBar(mode, title, sub) {
    const t = $('#top');
    if (mode === 'home') t.innerHTML = '<div class="brand"><div class="logo">' + belt(beltIdx()) + '</div><div class="nm"><b>本機道場</b><small>LOCAL DOJO</small></div></div><div class="hud"></div>';
    else t.innerHTML = '<button class="back" data-back aria-label="返回">' + I.back + '</button><div class="brand"><div class="ttl">' + esc(title) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div></div><div class="hud"></div>';
    hud();
  }
  function dueCards() { const d = today(); return availCards().filter((k) => !S.srs[k] || S.srs[k].due <= d); }
  function availCards() { return Object.keys(D.terms).filter((k) => learned(D.terms[k].l)); }
  function tabs(on) {
    const due = dueCards().length;
    $('#tabs').innerHTML = [['#home', 'dojo', '道場'], ['#review', 'cards', '複習', due], ['#tools', 'tools', '工具'], ['#me', 'me', '我']].map((t) => '<button data-go="' + t[0] + '" class="' + (on === t[1] ? 'on' : '') + '">' + I[t[1]] + t[2] + (t[3] ? '<span class="badge">' + t[3] + '</span>' : '') + '</button>').join('');
  }

  /* ───────── 首頁 ───────── */
  function nextStep() {
    for (const st of D.stages) {
      if (!stageOpen(st.si)) return null;
      for (const l of st.lessons) if (!learned(l.id)) return { kind: 'lesson', l };
      if (!examPassed(st.id)) return { kind: 'exam', st };
    }
    const t = TASKS.find((l) => !taskDone(l.id));
    return t ? { kind: 'task', l: t } : null;
  }
  function renderHome() {
    const b = beltIdx(); setAcc(curStageColor());
    topBar('home'); tabs('dojo');
    const st = D.stages[Math.min(b, 5)]; const ns = nextStep();
    const done = b >= 6 ? 4 : stageDone(st); const pct = b >= 6 ? 100 : Math.round((done + (examPassed(st.id) ? 1 : 0)) / 5 * 100);
    const due = dueCards().length, wr = Object.keys(S.wrong).length, sk = streak();
    let nx = '';
    if (ns && ns.kind === 'lesson') nx = '<button class="btn big" data-go="#l-' + ns.l.id + '">' + I.play + '繼續修煉</button></div><div class="nexthint">下一課 <b>' + ns.l.id + '｜' + esc(ns.l.title) + '</b> · 約 ' + ns.l.mins + ' 分鐘';
    else if (ns && ns.kind === 'exam') nx = '<button class="btn big" data-go="#exam-' + ns.st.id + '">' + I.flag + '挑戰關主考驗</button></div><div class="nexthint">通過就晉升 <b>' + ns.st.belt + '</b>';
    else if (ns && ns.kind === 'task') nx = '<button class="btn big" data-go="#l-' + ns.l.id + '--task">' + I.laptop + '補完實作</button></div><div class="nexthint">還沒完成的實作：<b>' + ns.l.id + '｜' + esc(ns.l.task.title) + '</b>';
    else nx = '<button class="btn big" data-go="#me">' + I.spark + '看你的黑帶</button></div><div class="nexthint">六關全部完成。你是黑帶了。';
    const stripes = b >= 6 ? 4 : TASKS.filter((l) => taskDone(l.id) && l.stage === st).length;
    view.innerHTML = '<section class="hero" style="--belt:' + (BELTS[b].gold ? '#f3c44e' : BELTS[b].c) + '"><div class="top"><div class="beltwrap">' + belt(b, stripes) + '</div><div class="rank"><small>目前段位</small><b>' + BELTS[b].n + '</b><span>' + (b >= 6 ? '六關全破' : '修煉中：第 ' + st.n + ' 關「' + esc(st.name) + '」') + '</span></div></div>' +
      (b < 6 ? '<div class="prog"><div class="lbl"><span>晉升 ' + st.belt + '</span><span class="mono">' + done + '/4 課' + (examOpen(st) ? ' · 考驗已開放' : '') + '</span></div><div class="bar" style="--c:' + st.color + '"><i data-w="' + pct + '"></i></div></div>' : '') +
      '<div class="next">' + nx + '</div></section>' +
      '<div class="quick"><button data-go="#review"' + (due ? ' class="hot"' : '') + '><b>' + due + '</b><span>今日複習卡</span></button><button data-go="#review-wrong"' + (wr ? ' class="hot"' : '') + '><b>' + wr + '</b><span>錯題本</span></button><button data-go="#me"><b>' + sk + '</b><span>連續修煉天數</span></button></div>' +
      D.stages.map(stageBlock).join('') +
      '<p class="about">課程內容查證於 2026 年 11 月。模型與工具更新很快，最新的模型推薦請看《版本答案 META》。</p>';
    requestAnimationFrame(() => $$('.bar i[data-w]').forEach((i) => { i.style.width = i.dataset.w + '%'; }));
  }
  function stageBlock(st) {
    const open = stageOpen(st.si); const ex = examPassed(st.id); const black = st.n === 6;
    const nodes = st.lessons.map((l, i) => {
      const ok = learned(l.id), op = open && lessonOpen(l), ls = S.L[l.id] || {};
      const cls = ok ? 'done' : op ? 'open' : 'locked';
      const orb = ok ? I.check : op ? l.id : I.lock;
      return '<button class="node ' + cls + ' l' + i + '" data-l="' + l.id + '" id="n-' + l.id + '"><span class="orb">' + orb + '</span><span class="t"><b>' + esc(l.title) + '</b><span>' + l.id + ' · ' + esc(l.sub) + '</span></span><span class="mk"><i class="' + (ls.read ? 'on' : '') + '" title="看懂"></i><i class="' + (ls.qd ? 'on' : '') + '" title="驗收"></i>' + (l.task ? '<i class="' + (ls.td ? 'on' : '') + '" title="實作"></i>' : '') + '</span></button>';
    }).join('');
    const eo = open && examOpen(st);
    const boss = '<button class="node boss ' + (ex ? 'done' : eo ? 'open' : 'locked') + '" data-exam="' + st.id + '"><span class="orb">' + (ex ? I.check : eo ? I.flag : I.lock) + '</span><span class="t"><b>關主考驗</b><span>5 題答對 4 題，晉升' + st.belt + (ex ? ' · 最佳 ' + S.E[st.id].best + '/5' : '') + '</span></span></button>';
    return '<section class="stage' + (open ? '' : ' locked') + (black ? ' black' : '') + '" style="--c:' + st.color + '"><div class="shead"><div class="num">' + st.n + '</div><div class="tx"><small>STAGE ' + st.n + ' · ' + st.en + '</small><b>' + esc(st.name) + '</b><span>' + stageDone(st) + '/4 課 · 通過可得' + st.belt + '</span></div><div class="bt">' + belt(st.n, 0) + '</div></div>' +
      '<p class="intro">' + esc(st.intro) + '</p><div class="path">' + nodes + boss + '</div></section>';
  }

  /* ───────── 課程頁 ───────── */
  const TAGS = { analogy: '比喻', key: '重點', warn: '注意', num: '數字' };
  function fillPrompt(p) {
    const ph = {
      modelfile: S.data.modelfile || '（先在上面的「角色卡產生器」設定好，這裡會自動帶入）',
      prompt: S.data.prompt || '一名黑衣劍客站在門口回頭，雨夜的客棧，燈籠暖光，低角度仰拍，寫實攝影',
      look: (S.L['3-3'] && S.L['3-3'].think) || '（還沒寫：請回到 3-3 的「想一想」寫下魏子葳的外觀，或在這裡自己補上）',
      grad: S.data.grad || '（先在上面選一個畢業專題）'
    };
    const raw = p.replace(/\{\{(\w+)\}\}/g, (m, k) => ph[k] || '');
    const html = esc(winPath(p)).replace(/\{\{(\w+)\}\}/g, (m, k) => '<mark>' + esc(ph[k] || '') + '</mark>');
    return { raw: winPath(raw), html };
  }
  function renderLesson(id, anchor) {
    const l = BYID[id]; if (!l) return go('#home');
    const st = l.stage, ls = LS(id); setAcc(st.color); S.lastL = id; saveSoon();
    topBar('lesson', 'STAGE ' + st.n + ' · ' + l.id, st.name); document.body.classList.add('inlesson');
    let n = 0; const secs = [['read', '看懂']]; if (l.widget) secs.push(['play', '動手']); if (l.task) secs.push(['task', '實作']); secs.push(['quiz', '驗收'], ['think', '想一想']);
    const okOf = { read: ls.read, play: ls.w, task: ls.td, quiz: ls.qd, think: ls.think };
    const nav = '<nav class="stepnav">' + secs.map((s) => '<a href="#b-' + s[0] + '" data-jump="b-' + s[0] + '" class="' + (okOf[s[0]] ? 'ok' : '') + '"><i></i>' + s[1] + '</a>').join('') + '</nav>';
    const h3 = (k, t, sm) => '<h3><span class="n">' + (++n) + '</span>' + t + (sm ? ' <small>' + sm + '</small>' : '') + '</h3>';
    view.innerHTML = '<div class="lhero" style="--c:' + st.color + '"><div class="kick">STAGE ' + st.n + ' · ' + l.id + '</div><h1>' + esc(l.title) + '</h1><div class="sub">' + esc(l.sub) + '</div>' +
      '<div class="goal">' + I.target + '<div><b>學完你會：</b>' + esc(l.goal) + '</div></div><div class="meta"><span class="chip">' + I.clock + '約 ' + l.mins + ' 分鐘</span>' + (learned(id) ? '<span class="chip ok">' + I.check + '學懂</span>' : '') + (taskDone(id) ? '<span class="chip ok">' + I.check + '做到</span>' : '') + '</div></div>' + nav +
      '<section class="blk" id="b-read" style="--c:' + st.color + '">' + h3('read', '看懂', l.cards.length + ' 張卡') + '<div data-cards></div></section>' +
      (l.widget ? '<section class="blk" id="b-play" style="--c:' + st.color + '">' + h3('play', '動手', '玩一下就懂') + '<div class="wbox" data-widget></div></section>' : '') +
      (l.task ? '<section class="blk" id="b-task" style="--c:' + st.color + '">' + h3('task', '實作', l.task.tool ? '在 App 裡完成' : '在你的筆電上完成') + '<div data-task></div></section>' : '') +
      '<section class="blk" id="b-quiz" style="--c:' + st.color + '">' + h3('quiz', '驗收', '3 題答對 2 題就算學懂') + '<div data-quiz></div></section>' +
      '<section class="blk" id="b-think" style="--c:' + st.color + '">' + h3('think', '想一想', '沒有標準答案') + '<div data-think></div></section>' +
      '<div data-next style="margin-top:28px"></div>';
    drawCards(l); if (l.widget) mountWidget(l); if (l.task) drawTask(l); drawQuiz(l); drawThink(l); drawNext(l);
    if (anchor) setTimeout(() => { const a = document.getElementById(anchor); if (a) a.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
  }
  function stepOk(k, on) { const a = $('.stepnav a[data-jump="b-' + k + '"]'); if (a) a.classList.toggle('ok', !!on); }
  function drawCards(l) {
    const ls = LS(l.id); const box = $('[data-cards]');
    let shown = ls.read ? l.cards.length : Math.max(1, ls.rc || 1);
    const card = (c, i, nw) => '<div class="cc ' + (c.k || '') + (nw ? ' new' : '') + '" data-i="' + i + '"><h4>' + (c.k ? '<span class="tag">' + TAGS[c.k] + '</span>' : '') + esc(c.t) + '</h4><p>' + winPath(c.b) + '</p></div>';
    function draw(nw) {
      box.innerHTML = l.cards.slice(0, shown).map((c, i) => card(c, i, nw && i === shown - 1)).join('') +
        (ls.read ? '' : '<div class="reveal">' + (shown < l.cards.length ? '<button class="btn" data-a="more">下一張 ▸</button><span class="cnt">' + shown + ' / ' + l.cards.length + '</span>' : '<button class="btn" data-a="got">' + I.check + '我看懂了</button><span class="cnt">全部 ' + l.cards.length + ' 張</span>') + '</div>');
    }
    box.onclick = (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'more') { shown++; ls.rc = shown; saveSoon(); Sound.play('flip'); draw(true); }
      if (b.dataset.a === 'got') { ls.read = 1; save(); gain(20); stepOk('read', 1); draw(); afterLearn(l); }
    };
    draw();
  }
  function wapi(l, full) {
    return {
      full: !!full,
      done: () => { if (!l) return; const ls = LS(l.id); if (!ls.w) { ls.w = 1; gain(10); stepOk('play', 1); } },
      get: (k, d) => (S.data[k] !== undefined ? S.data[k] : d),
      set: (k, v) => { S.data[k] = v; saveSoon(); if (l && l.task && /^(modelfile|prompt|grad)$/.test(k)) refreshPrompt(l); },
      sfx: (n) => Sound.play(n), go, toast, copy
    };
  }
  function mountWidget(l) { const el = $('[data-widget]'); try { D.W[l.widget](el, wapi(l)); } catch (e) { el.innerHTML = '<div class="small">這個元件載入失敗：' + esc(e.message) + '</div>'; } }
  function refreshPrompt(l) { const pre = $('[data-task] pre[data-p]'); if (pre && l.task.prompt) pre.innerHTML = fillPrompt(l.task.prompt).html; }
  function drawTask(l) {
    const t = l.task, ls = LS(l.id), box = $('[data-task]');
    ls.ck = ls.ck || [];
    const ck = (c, i) => '<button class="ck' + (ls.ck[i] ? ' on' : '') + '" data-c="' + i + '"><span class="box">' + I.check + '</span><span>' + esc(winPath(c)) + '</span></button>';
    box.innerHTML = '<div class="task" style="--c:' + l.stage.color + '"><h4>' + esc(t.title) + '</h4><div class="why">' + esc(t.why) + '</div>' +
      (t.before ? '<div class="before">' + esc(winPath(t.before)) + '</div>' : '') +
      (t.tool ? '<button class="btn block" data-go="#tool-' + t.tool + '">' + I.calc + '打開顯存計算機</button>' :
        '<div class="prompt"><div class="ph"><span class="grow">貼給筆電上的 Claude Code</span><button class="btn sm" data-a="cp">' + I.copy + '複製指令</button></div><pre data-p>' + fillPrompt(t.prompt).html + '</pre></div><div class="small" style="margin-top:8px">在筆電打開 Claude 桌面版的 Code 分頁，工作資料夾選 ' + winPath('C:/AI') + '，貼上後送出。它做完，你照下面的清單逐項確認。</div>') +
      '<div class="checks">' + t.checks.map(ck).join('') + '</div>' +
      (t.stuck && t.stuck.length ? '<details class="stuck"><summary>' + I.hand + '卡關了怎麼辦</summary>' + t.stuck.map((s) => '<div class="it"><b>' + esc(winPath(s[0])) + '</b>' + esc(winPath(s[1])) + '</div>').join('') + '</details>' : '') +
      (ls.td ? '<div class="donebar">' + I.check + '<div>實戰完成！已放上成果牆。</div></div><div class="fld" style="margin-top:12px"><label>記下心得或實測數字（會顯示在成果牆）</label><textarea class="note" data-n placeholder="例如：實測 38 tok/s，比預測少一點">' + esc(ls.note || '') + '</textarea></div>' : '') + '</div>';
    box.onclick = (e) => {
      if (e.target.closest('[data-a=cp]')) { copy(fillPrompt(t.prompt).raw); return; }
      const b = e.target.closest('[data-c]'); if (!b) return;
      const i = +b.dataset.c; ls.ck[i] = !ls.ck[i]; b.classList.toggle('on', !!ls.ck[i]); Sound.play(ls.ck[i] ? 'tick' : 'tap'); saveSoon();
      if (!ls.td && t.checks.every((_, j) => ls.ck[j])) {
        ls.td = 1; ls.tdAt = Date.now(); save(); Sound.play('win'); gain(50, '實戰完成！腰帶多了一條實戰印記'); stepOk('task', 1); drawTask(l);
      }
    };
    box.oninput = (e) => { if (e.target.dataset.n != null) { ls.note = e.target.value; saveSoon(); } };
  }

  /* ───────── 測驗引擎 ───────── */
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  function qget(qid) {
    const [src, ix] = qid.split(':'); const i = +ix;
    if (src[0] === 'E') { const st = D.stages.find((s) => s.id === src.slice(1)); return st && Object.assign({ qid, from: '第 ' + st.n + ' 關考驗' }, st.exam[i]); }
    const l = BYID[src]; return l && Object.assign({ qid, from: l.id + ' ' + l.title }, l.quiz[i]);
  }
  function runQuiz(box, qs, o) {
    let k = 0; const res = [];
    const keys = 'ABCD';
    function show() {
      const q = qs[k]; const order = shuffle(q.o.map((t, i) => ({ t, i })));
      box.innerHTML = '<div class="quiz"><div class="qhead"><span>' + esc(o.title || '驗收') + ' · 第 ' + (k + 1) + ' / ' + qs.length + ' 題</span><span class="qdots">' + qs.map((_, i) => '<i class="' + (i < res.length ? (res[i] ? 'r' : 'w') : i === k ? 'cur' : '') + '"></i>').join('') + '</span></div>' +
        (q.from && o.showFrom ? '<div class="small" style="margin-bottom:6px">出自：' + esc(q.from) + '</div>' : '') +
        '<div class="qq">' + esc(q.q) + '</div><div class="opts">' + order.map((x, j) => '<button class="opt" data-i="' + x.i + '"><span class="k">' + keys[j] + '</span><span>' + esc(x.t) + '</span></button>').join('') + '</div><div data-why></div></div>';
      box.onclick = (e) => {
        const b = e.target.closest('.opt'); if (!b || b.disabled) return;
        const right = +b.dataset.i === 0; res.push(right);
        $$('.opt', box).forEach((x) => { x.disabled = true; if (+x.dataset.i === 0) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); else x.classList.add('fade'); });
        S.st.ans++; if (right) S.st.right++;
        if (!right && !o.noWrong) { if (!S.wrong[q.qid]) S.st.wrongEver++; S.wrong[q.qid] = { t: Date.now() }; }
        if (right && o.onRight) o.onRight(q);
        Sound.play(right ? 'good' : 'bad'); saveSoon();
        $('[data-why]', box).innerHTML = '<div class="why ' + (right ? 'r' : 'w') + '"><b class="hd">' + (right ? '答對了！' : '差一點。正確答案是：「' + esc(q.o[0]) + '」') + '</b>' + esc(q.why || '') + '</div><div class="row" style="margin-top:12px"><button class="btn" data-nx>' + (k + 1 < qs.length ? '下一題 ▸' : '看結果') + '</button></div>';
        $('[data-nx]', box).onclick = (ev) => { ev.stopPropagation(); k++; if (k < qs.length) show(); else o.end(res); };
        $('[data-why]', box).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
    }
    show();
  }
  function drawQuiz(l) {
    const ls = LS(l.id), box = $('[data-quiz]');
    const qs = l.quiz.map((q, i) => Object.assign({ qid: l.id + ':' + i }, q));
    function start() {
      runQuiz(box, qs, {
        title: l.id + ' 驗收',
        end: (res) => {
          const sc = res.filter(Boolean).length, pass = sc >= 2;
          if (!ls.qx) { ls.qx = 1; gain(sc * 10); }
          ls.qbest = Math.max(ls.qbest || 0, sc);
          if (pass && !ls.qd) { ls.qd = 1; stepOk('quiz', 1); }
          save(); if (pass) Sound.play('win');
          box.innerHTML = '<div class="quiz qres"><div class="score">' + sc + ' / 3</div><p>' + (pass ? (sc === 3 ? '全對！這課你真的懂了。' : '過關！錯的那題已經收進錯題本。') : '還差一點，再看一次卡片，然後重新挑戰。') + '</p><div class="row" style="justify-content:center"><button class="btn ' + (pass ? 'ghost' : '') + '" data-re>再做一次</button>' + (pass ? '<button class="btn" data-jump="b-think">下一步：想一想 ▸</button>' : '') + '</div></div>';
          $('[data-re]', box).onclick = start; afterLearn(l); drawNext(l);
        }
      });
    }
    if (ls.qd) { box.innerHTML = '<div class="quiz"><div class="donebar" style="margin:0">' + I.check + '<div>已通過驗收（最佳 ' + (ls.qbest || 2) + ' / 3）</div></div><div class="row" style="margin-top:12px"><button class="btn ghost" data-re>再做一次</button></div></div>'; $('[data-re]', box).onclick = start; }
    else start();
  }
  function afterLearn(l) { if (learned(l.id)) { const ls = LS(l.id); if (!ls.lAt) { ls.lAt = Date.now(); save(); toast('「' + l.title + '」學懂了！新的複習卡已加入', '✓'); checkBadges(); tabs(null); } } }
  function drawThink(l) {
    const ls = LS(l.id), box = $('[data-think]');
    box.innerHTML = '<div class="cc analogy"><h4><span class="tag">想一想</span>' + esc(l.think) + '</h4><p class="small" style="color:var(--dim)">寫下來會收進「複習 → 我的想法」，之後可以回來看自己想法的變化。</p></div><textarea class="note" data-t placeholder="寫下你的想法……">' + esc(ls.think || '') + '</textarea><div class="row" style="margin-top:10px"><button class="btn" data-s>存下我的想法</button><span class="small" data-o></span></div>';
    $('[data-s]', box).onclick = () => {
      const v = $('[data-t]', box).value.trim(); if (!v) { toast('先寫一點東西'); return; }
      const first = !ls.think; ls.think = v; ls.thinkAt = Date.now(); save(); stepOk('think', 1);
      if (first) gain(5); else { Sound.play('good'); toast('已更新'); }
      $('[data-o]', box).textContent = '已存於 ' + dstr(ls.thinkAt);
    };
    if (ls.thinkAt) $('[data-o]', box).textContent = '上次存於 ' + dstr(ls.thinkAt);
  }
  function drawNext(l) {
    const box = $('[data-next]'); if (!box) return;
    const st = l.stage, nl = st.lessons[l.li + 1];
    let h = '';
    if (nl) h = learned(l.id) ? '<button class="btn big block" data-go="#l-' + nl.id + '">下一課：' + esc(nl.title) + ' ▸</button>' : '<div class="small" style="text-align:center">看完卡片、通過驗收，就會解鎖下一課「' + esc(nl.title) + '」</div>';
    else h = examOpen(st) ? '<button class="btn big block" data-go="#exam-' + st.id + '">' + I.flag + '挑戰第 ' + st.n + ' 關考驗（晉升' + st.belt + '）</button>' : '<div class="small" style="text-align:center">這一關四課都學懂後，就能挑戰關主考驗</div>';
    box.innerHTML = h + '<button class="btn ghost block" style="margin-top:10px" data-go="#home">回到道場</button>';
  }

  /* ───────── 關主考驗 ───────── */
  function renderExam(sid) {
    const st = D.stages.find((s) => s.id === sid); if (!st) return go('#home');
    setAcc(st.color); topBar('lesson', '第 ' + st.n + ' 關 · 關主考驗', '晉升' + st.belt); document.body.classList.add('inlesson');
    const qs = st.exam.map((q, i) => Object.assign({ qid: 'E' + st.id + ':' + i }, q));
    const before = beltIdx();
    view.innerHTML = '<div class="lhero" style="--c:' + st.color + '"><div class="kick">STAGE ' + st.n + ' · BOSS</div><h1>關主考驗</h1><div class="sub">5 題答對 4 題過關，晉升' + st.belt + '。題目是情境題，要真的懂才答得對。</div>' +
      (examOpen(st) ? '' : '<div class="goal">' + I.lock + '<div>建議先把這關四課都學懂再來。你還是可以先試試看。</div></div>') + '</div><div style="margin-top:18px" data-q></div>';
    const box = $('[data-q]');
    function start() {
      runQuiz(box, shuffle(qs), {
        title: '關主考驗',
        end: (res) => {
          const sc = res.filter(Boolean).length, pass = sc >= 4; const E = S.E[st.id] || (S.E[st.id] = {});
          const firstPass = pass && !E.pass; E.best = Math.max(E.best || 0, sc); if (pass) { E.pass = 1; E.at = E.at || Date.now(); }
          save();
          if (firstPass) gain(100); if (sc === 5 && !E.perf) { E.perf = 1; gain(50, '滿分加碼！'); }
          checkBadges();
          box.innerHTML = '<div class="quiz qres"><div class="score">' + sc + ' / 5</div><p>' + (pass ? '過關！' : '要答對 4 題才過關。錯的題目已收進錯題本，複習後再來。') + '</p><div class="row" style="justify-content:center">' + (pass ? '<button class="btn" data-go="#home">回到道場</button>' : '<button class="btn" data-re>再挑戰一次</button><button class="btn ghost" data-go="#review-wrong">去錯題本</button>') + '</div></div>';
          const re = $('[data-re]', box); if (re) re.onclick = start;
          const after = beltIdx();
          if (firstPass && after > before) setTimeout(() => ceremony(after, () => go('#home')), 500); else if (pass) Sound.play('win');
        }
      });
    }
    start();
  }

  /* ───────── 複習 ───────── */
  const IV = [0, 1, 3, 7, 16, 35];
  function renderReview(sub) {
    setAcc(curStageColor()); topBar('home'); tabs('cards');
    const due = dueCards(), wr = Object.keys(S.wrong), avail = availCards();
    const thinks = LESSONS.filter((l) => S.L[l.id] && S.L[l.id].think);
    sub = sub || 'cards';
    view.innerHTML = '<div class="sec" style="margin-top:4px"><h2>複習</h2><small>學過的東西，要反覆想才會變成你的</small></div>' +
      '<div class="seg">' + [['cards', '今日複習卡', due.length], ['wrong', '錯題本', wr.length], ['test', '隨機抽考'], ['think', '我的想法']].map((t) => '<button data-go="#review-' + t[0] + '" class="' + (sub === t[0] ? 'on' : '') + '">' + t[1] + (t[2] ? '<span class="n">' + t[2] + '</span>' : '') + '</button>').join('') + '</div><div data-sub style="margin-top:14px"></div>';
    const box = $('[data-sub]');
    if (sub === 'cards') flashcards(box, due, avail);
    if (sub === 'wrong') wrongBook(box);
    if (sub === 'test') randomTest(box);
    if (sub === 'think') box.innerHTML = thinks.length ? '<div class="list">' + thinks.map((l) => '<div class="li" style="border-left:4px solid ' + l.stage.color + '"><div class="h"><span class="mono">' + l.id + '</span><span>' + esc(l.title) + '</span><span class="grow"></span><span>' + dstr(S.L[l.id].thinkAt || Date.now()) + '</span></div><div class="q" style="margin-bottom:6px">' + esc(l.think) + '</div><p style="margin:0;white-space:pre-wrap;color:#d0d3e2;font-size:14.5px">' + esc(S.L[l.id].think) + '</p><button class="btn ghost sm" style="margin-top:10px" data-go="#l-' + l.id + '--think">回去改寫</button></div>').join('') + '</div>'
      : '<div class="empty"><div class="ic">💭</div><b>還沒有存下任何想法</b>每一課最後的「想一想」，寫下來就會出現在這裡。</div>';
  }
  function flashcards(box, due, avail) {
    if (!avail.length) { box.innerHTML = '<div class="empty"><div class="ic">🃏</div><b>還沒有複習卡</b>每學懂一課，那課的術語就會變成複習卡，照遺忘曲線排程出現。</div>'; return; }
    if (!due.length) {
      const d = today(); const nextD = Math.min(...avail.map((k) => (S.srs[k] ? S.srs[k].due : d)));
      box.innerHTML = '<div class="empty"><div class="ic">✨</div><b>今天的複習都完成了</b>已收集 ' + avail.length + ' 張卡。下一批' + (nextD - d <= 1 ? '明天' : ' ' + (nextD - d) + ' 天後') + '出現。<br><br><button class="btn ghost" data-a="extra">想多練：隨機抽 5 張</button></div>';
      $('[data-a=extra]', box).onclick = () => runCards(box, shuffle(avail).slice(0, 5), true);
      return;
    }
    runCards(box, shuffle(due), false);
  }
  function runCards(box, queue, extra) {
    let q = queue.slice(), n = 0;
    function show() {
      if (!q.length) { box.innerHTML = '<div class="empty"><div class="ic">🏯</div><b>這輪複習完成！</b>複習了 ' + n + ' 張。明天記得回來，間隔越拉越長，記憶就越牢。<br><br><button class="btn" data-go="#home">回到道場</button></div>'; Sound.play('win'); tabs('cards'); return; }
      const k = q[0], t = D.terms[k], s = S.srs[k] || { b: 0 };
      box.innerHTML = '<div class="small" style="text-align:center">還剩 ' + q.length + ' 張' + (extra ? '（加練，不影響排程）' : '') + '</div><div class="flash"><div class="in"><div class="face front"><div class="box5">' + [1, 2, 3, 4, 5].map((i) => '<i class="' + (s.b >= i ? 'on' : '') + '"></i>').join('') + '</div><b>' + esc(t.w) + '</b><small>先在心裡說出它的意思，再點一下翻面</small></div><div class="face back"><p>' + esc(t.d) + '</p><div class="ex">比喻：' + esc(t.ex) + '</div><small class="small" style="margin-top:12px">出自 ' + t.l + ' ' + esc(BYID[t.l].title) + '</small></div></div></div>' +
        '<div class="fbtns" style="visibility:hidden"><button class="btn ghost" data-r="0">' + I.wrong + '忘了</button><button class="btn" data-r="1">' + I.check + '記得</button></div>';
      const fl = $('.flash', box), fb = $('.fbtns', box);
      fl.onclick = () => { fl.classList.toggle('flip'); Sound.play('flip'); fb.style.visibility = 'visible'; };
      fb.onclick = (e) => {
        const b = e.target.closest('[data-r]'); if (!b) return; const ok = b.dataset.r === '1'; n++; S.st.cards++;
        if (!extra) { const cur = S.srs[k] || { b: 0 }; const nb = ok ? Math.min(5, cur.b + 1) : 1; S.srs[k] = { b: nb, due: today() + (ok ? IV[nb] : 0) }; }
        q.shift(); if (!ok && !extra) q.push(k);
        Sound.play(ok ? 'good' : 'tap'); gain(ok ? 2 : 1); saveSoon(); show();
      };
    }
    show();
  }
  function wrongBook(box) {
    const ids = Object.keys(S.wrong).filter((id) => qget(id));
    if (!ids.length) { box.innerHTML = '<div class="empty"><div class="ic">🎯</div><b>錯題本是空的</b>' + (S.st.wrongEver ? '你把錯過的題目全部收服了。' : '答錯的題目會自動收進這裡，直到你答對為止。') + '</div>'; return; }
    box.innerHTML = '<div class="small" style="margin-bottom:10px">共 ' + ids.length + ' 題。答對就會從錯題本移除。</div><button class="btn block" data-a="all">' + I.play + '全部重考一次</button><div class="list" style="margin-top:12px">' + ids.map((id) => { const q = qget(id); return '<div class="li"><div class="h"><span>' + esc(q.from) + '</span></div><div class="q">' + esc(q.q) + '</div></div>'; }).join('') + '</div>';
    $('[data-a=all]', box).onclick = () => runQuiz(box, shuffle(ids.map(qget)), {
      title: '錯題重考', showFrom: true, noWrong: false,
      onRight: (q) => { delete S.wrong[q.qid]; gain(5); },
      end: (res) => { save(); checkBadges(); renderReview('wrong'); toast('收服了 ' + res.filter(Boolean).length + ' 題'); }
    });
  }
  function randomTest(box) {
    const pool = [];
    LESSONS.forEach((l) => { if (learned(l.id)) l.quiz.forEach((q, i) => pool.push(l.id + ':' + i)); });
    D.stages.forEach((st) => { if (examPassed(st.id)) st.exam.forEach((q, i) => pool.push('E' + st.id + ':' + i)); });
    if (pool.length < 3) { box.innerHTML = '<div class="empty"><div class="ic">🎲</div><b>題庫還太少</b>先學懂幾課，這裡就會從學過的內容隨機出題。</div>'; return; }
    const n = Math.min(5, pool.length);
    box.innerHTML = '<div class="empty"><div class="ic">🎲</div><b>從學過的 ' + pool.length + ' 題裡隨機抽 ' + n + ' 題</b>考考自己還記得多少。答錯的會進錯題本。<br><br><button class="btn" data-a="go">開始抽考</button></div>';
    $('[data-a=go]', box).onclick = () => runQuiz(box, shuffle(pool).slice(0, n).map(qget), {
      title: '隨機抽考', showFrom: true,
      end: (res) => { const sc = res.filter(Boolean).length; gain(sc * 3); box.innerHTML = '<div class="quiz qres"><div class="score">' + sc + ' / ' + res.length + '</div><p>' + (sc === res.length ? '全對，記得很牢！' : '錯的題目收進錯題本了。') + '</p><div class="row" style="justify-content:center"><button class="btn" data-go="#review-test">再抽一次</button></div></div>'; }
    });
  }

  /* ───────── 工具 ───────── */
  const TOOLS = [
    { id: 'vram', t: '顯存計算機', d: '這個模型塞不塞得進？跑多快？', ic: 'calc', c: '#ffd23f', w: 'vramTool' },
    { id: 'decode', t: '模型名稱解碼器', d: '貼上檔名，拆解每一段的意思', ic: 'decode', c: '#3ee08f', w: 'decoder' },
    { id: 'speed', t: '速度體感', d: '親眼看 5、35、150 tok/s 的差別', ic: 'speed', c: '#4aa8ff', w: 'speed' },
    { id: 'video', t: '影片預算', d: '一段短片要跑多久？一晚能跑幾段？', ic: 'video', c: '#ff5468', w: 'videobudget' },
    { id: 'gloss', t: '術語辭典', d: D.util.fmt(Object.keys(D.terms).length, 0) + ' 個名詞，全部白話', ic: 'book', c: '#b27cff' }
  ];
  function renderTools() {
    setAcc(curStageColor()); topBar('home'); tabs('tools');
    view.innerHTML = '<div class="sec" style="margin-top:4px"><h2>工具</h2><small>學完之後，每天都用得到</small></div><div class="tgrid">' +
      TOOLS.map((t) => '<button class="tcard" style="--tc:' + t.c + '" data-go="#tool-' + t.id + '"><span class="ic">' + I[t.ic] + '</span><b>' + t.t + '</b><span>' + esc(t.d) + '</span></button>').join('') + '</div>' +
      '<div class="glass" style="padding:14px 16px;margin-top:14px;font-size:14px;color:var(--dim)">計算機的數字是用「頻寬 ÷ 模型大小」估算的上限與合理範圍，以你的 RTX 5090 筆電（24GB、896 GB/s）為準。實際速度會因軟體版本、上下文長度、筆電功耗模式而浮動，最好以你自己實測的數字為準。</div>';
  }
  function renderTool(id) {
    const t = TOOLS.find((x) => x.id === id); if (!t) return go('#tools');
    setAcc(t.c); topBar('lesson', t.t, '工具'); tabs('tools');
    view.innerHTML = '<div class="lhero" style="--c:' + t.c + '"><div class="kick">TOOL</div><h1>' + t.t + '</h1><div class="sub">' + esc(t.d) + '</div></div><div class="wbox" style="margin-top:16px" data-tool></div>';
    const el = $('[data-tool]');
    if (id === 'gloss') return glossary(el);
    D.W[t.w](el, wapi(null, true));
  }
  function glossary(el) {
    const keys = Object.keys(D.terms);
    el.innerHTML = '<input class="inp" data-q placeholder="搜尋，例如：量化、MoE、LoRA"><div class="gloss" data-o></div>';
    const draw = (q) => {
      q = (q || '').trim().toLowerCase();
      $('[data-o]', el).innerHTML = keys.filter((k) => { const t = D.terms[k]; return !q || (t.w + t.d + t.ex).toLowerCase().includes(q); }).map((k) => { const t = D.terms[k]; return '<div class="g' + (learned(t.l) ? '' : ' lock') + '"><span class="l">' + t.l + '</span><b>' + esc(t.w) + '</b><p>' + esc(t.d) + '</p><div class="ex">比喻：' + esc(t.ex) + '</div></div>'; }).join('') || '<div class="small">找不到相符的名詞</div>';
    };
    $('[data-q]', el).oninput = (e) => draw(e.target.value); draw();
  }

  /* ───────── 我 ───────── */
  function renderMe() {
    const b = beltIdx(); setAcc(curStageColor()); topBar('home'); tabs('me');
    const tdone = TASKS.filter((l) => taskDone(l.id)); const lcount = LESSONS.filter((l) => learned(l.id)).length;
    const acc = S.st.ans ? Math.round(S.st.right / S.st.ans * 100) : 0;
    const wall = tdone.slice().sort((a, c) => (S.L[c.id].tdAt || 0) - (S.L[a.id].tdAt || 0));
    view.innerHTML = '<section class="belthero" style="--belt:' + (BELTS[b].gold ? '#f3c44e' : BELTS[b].c) + '"><div class="bw">' + belt(b, Math.min(4, tdone.length)) + '</div><b>' + BELTS[b].n + '</b><span>修為 ' + S.xp + ' · 實戰印記 ' + tdone.length + ' 條</span></section>' +
      '<div class="stats"><div><b>' + lcount + '<small style="font-size:12px;color:var(--dim)">/' + LESSONS.length + '</small></b><span>學懂的課</span></div><div><b>' + tdone.length + '<small style="font-size:12px;color:var(--dim)">/' + TASKS.length + '</small></b><span>完成實作</span></div><div><b>' + b + '<small style="font-size:12px;color:var(--dim)">/6</small></b><span>通過考驗</span></div><div><b>' + streak() + '</b><span>連續天數</span></div><div><b>' + acc + '%</b><span>答題正確率</span></div><div><b>' + S.st.cards + '</b><span>複習卡次數</span></div></div>' +
      '<div class="belts">' + BELTS.map((x, i) => '<div class="' + (i <= b ? '' : 'off') + '">' + belt(i) + '<div>' + x.n + '</div></div>').join('') + '</div>' +
      (b >= 6 ? '<div class="sec"><h2>黑帶證書</h2><small>六關全破</small></div><canvas class="cert" width="1200" height="800"></canvas><div class="row" style="margin-top:10px" data-dlrow></div>' : '') +
      '<div class="sec"><h2>成果牆</h2><small>在筆電上真的做到的事</small></div>' +
      (wall.length ? '<div class="wall">' + wall.map((l) => '<div class="w" style="--c:' + l.stage.color + '"><div class="h"><span class="mono">' + l.id + '</span><span>' + dstr(S.L[l.id].tdAt) + '</span></div><b>' + esc(l.task.title) + '</b>' + (S.L[l.id].note ? '<p>' + esc(S.L[l.id].note) + '</p>' : '<p style="color:var(--dim2)">（還沒寫心得，<a href="#l-' + l.id + '--task" data-go="#l-' + l.id + '--task">去補上</a>）</p>') + '</div>').join('') + '</div>' : '<div class="empty"><div class="ic">🏆</div><b>還沒有成果</b>每完成一個「實作」，就會出現在這裡。這是你真正的修煉紀錄。</div>') +
      '<div class="sec"><h2>徽章</h2><small>' + Object.keys(S.badges).length + ' / ' + D.badges.length + '</small></div><div class="bgrid">' + D.badges.map((x) => '<div class="bdg' + (S.badges[x.id] ? '' : ' off') + '"><div class="m">' + x.ic + '</div><b>' + esc(x.t) + '</b><span>' + esc(x.d) + '</span></div>').join('') + '</div>' +
      '<div class="sec"><h2>設定</h2></div>' +
      syncRow() + '<div class="setrow"><div class="tx"><b>音效</b><span>答對、晉升、翻卡的聲音</span></div><button class="tog' + (S.set.sound ? ' on' : '') + '" data-a="snd" aria-label="音效"></button></div>' +
      '<div class="setrow"><div class="tx"><b>備份碼</b><span>換手機、換瀏覽器時，用它搬移進度</span></div><button class="btn ghost sm" data-a="exp">產生</button><button class="btn ghost sm" data-a="imp">匯入</button></div>' +
      '<div class="setrow"><div class="tx"><b>重新開始</b><span>清除這台裝置上的所有進度</span></div><button class="btn ghost sm" data-a="reset" style="color:var(--bad)">重置</button></div>' +
      '<p class="about">本機道場 LOCAL DOJO　版本 ' + VERSION + '<br>專為 RTX 5090 筆電（24GB）設計的本機 AI 修煉課<br>內容查證於 2026 年 11 月；模型與工具更新很快，最新推薦看《版本答案 META》<br>' + (window.DOJO_WEB ? '進度存在這台裝置的瀏覽器裡，記得偶爾產生備份碼' : 'Claude 版的進度會跟著你的 Claude 帳號同步') + '</p>';
    if (b >= 6) cert($('canvas.cert'), tdone.length, lcount);
  }
  function syncRow() {
    if (window.DOJO_WEB) return '<div class="setrow"><div class="tx"><b>進度存在哪裡</b><span>存在這台裝置的瀏覽器。換手機或換瀏覽器時，用下面的備份碼搬移。</span></div><span class="chip">本機</span></div>';
    const t = { ok: '已開啟：進度跟著你的 Claude 帳號，換裝置打開也會接著上次', connecting: '連線中……', big: '資料太大，暫停同步，請改用備份碼', off: '這次沒有連上雲端，進度先存在這台裝置' }[Cloud.state] || '';
    return '<div class="setrow"><div class="tx"><b>雲端同步</b><span>' + t + '</span></div><span class="chip ' + (Cloud.state === 'ok' ? 'ok' : '') + '">' + (Cloud.state === 'ok' ? '同步中' : '本機') + '</span></div>';
  }
  function cert(cv, tasks, lessons) {
    const g = cv.getContext('2d'); const W0 = 1200, H0 = 800;
    const bgd = g.createRadialGradient(600, 300, 50, 600, 400, 700); bgd.addColorStop(0, '#1d1a10'); bgd.addColorStop(1, '#07070a'); g.fillStyle = bgd; g.fillRect(0, 0, W0, H0);
    g.strokeStyle = '#f3c44e'; g.lineWidth = 6; g.strokeRect(36, 36, W0 - 72, H0 - 72); g.lineWidth = 1.5; g.strokeRect(54, 54, W0 - 108, H0 - 108);
    g.textAlign = 'center'; g.fillStyle = '#f3c44e'; g.font = '600 26px monospace'; g.fillText('L O C A L   D O J O', 600, 130);
    g.fillStyle = '#fff'; g.font = '800 72px "PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText('黑 帶 證 書', 600, 230);
    g.font = '500 30px "PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillStyle = '#d8dbea';
    g.fillText('茲證明', 600, 320); g.fillStyle = '#fff'; g.font = '800 58px "PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillText('痞子葳', 600, 400);
    g.font = '500 28px "PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif'; g.fillStyle = '#d8dbea';
    g.fillText('完成本機道場六關修煉：看懂模型、離線 AI、出圖與影片、', 600, 480); g.fillText('知識庫、微調、Agent 與流水線，晉升黑帶。', 600, 522);
    g.fillStyle = '#f3c44e'; g.font = '600 26px monospace'; g.fillText('修為 ' + S.xp + '　·　學懂 ' + lessons + ' 課　·　實作 ' + tasks + ' 項', 600, 600);
    g.fillStyle = '#9aa0b6'; g.font = '500 24px sans-serif'; g.fillText(dstr(Date.now()) + '　RTX 5090 Laptop · 24GB', 600, 690);
    const img = new Image(); img.onload = () => { g.drawImage(img, 905, 612, 200, 116); g.save(); g.translate(195, 670); g.scale(-1, 1); g.drawImage(img, -100, -58, 200, 116); g.restore(); dlRow(cv); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(belt(6, 4));
  }
  function dlRow(cv) {
    const row = $('[data-dlrow]'); if (!row) return;
    const name = '本機道場黑帶證書.png';
    if (window.DOJO_WEB) { row.innerHTML = '<a class="btn" download="' + name + '" href="' + cv.toDataURL('image/png') + '">下載證書</a>'; return; }
    if (!window.claude || typeof window.claude.use !== 'function') return;
    window.claude.use('downloads').then((dl) => {
      if (!dl || !row.isConnected) return;
      row.innerHTML = '<button class="btn">下載證書</button>';
      row.firstChild.onclick = () => cv.toBlob((b) => { if (!b) return; dl.save({ filename: name, data: b }).then(() => toast('證書已儲存')).catch((e) => { if (!e || e.code !== 'declined') toast('這裡沒辦法儲存，可以截圖保存'); }); }, 'image/png');
    }).catch(() => {});
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]'); if (!a || location.hash !== '#me') return;
    if (a.dataset.a === 'snd') { S.set.sound = !S.set.sound; save(); a.classList.toggle('on', S.set.sound); if (S.set.sound) Sound.play('good'); }
    if (a.dataset.a === 'exp') {
      const code = 'DOJO1:' + btoa(unescape(encodeURIComponent(JSON.stringify(S))));
      sheet('<h3>你的備份碼</h3><p>複製起來存好（例如傳給自己）。到另一台裝置的「匯入」貼上，就能接著修煉。</p><textarea class="note" readonly style="font:12px/1.5 var(--mono);min-height:140px">' + esc(code) + '</textarea><div class="acts" style="margin-top:12px"><button class="btn" data-s="cp">複製備份碼</button><button class="btn ghost" data-x>關閉</button></div>', (s) => { if (s === 'cp') copy(code); });
    }
    if (a.dataset.a === 'imp') {
      sheet('<h3>匯入備份碼</h3><p>貼上以 DOJO1: 開頭的備份碼。<b>這台裝置目前的進度會被取代。</b></p><textarea class="note" id="impc" style="font:12px/1.5 var(--mono);min-height:120px" placeholder="DOJO1:..."></textarea><div class="acts" style="margin-top:12px"><button class="btn" data-s="go">匯入</button><button class="btn ghost" data-x>取消</button></div>');
      $('#sheet [data-s=go]').onclick = (ev) => {
        ev.stopPropagation(); const v = ($('#impc').value || '').trim();
        try { if (!v.startsWith('DOJO1:')) throw 0; const o = JSON.parse(decodeURIComponent(escape(atob(v.slice(6))))); if (!o || o.v !== 1) throw 0; const seen = S.seenLog || ''; S = Object.assign(fresh(), o); if (seen > (S.seenLog || '')) S.seenLog = seen; save(); $('#sheet').classList.remove('on'); toast('匯入成功，歡迎回來'); Sound.play('win'); renderMe(); } catch (err) { toast('備份碼看起來不對，請確認有完整複製'); Sound.play('bad'); }
      };
    }
    if (a.dataset.a === 'reset') sheet('<h3>確定要重新開始？</h3><p>這台裝置上的修為、段位、筆記、成果牆都會清除，而且無法復原。建議先產生備份碼。</p><div class="acts"><button class="btn" data-s="y" style="background:var(--bad);color:#fff">確定清除</button><button class="btn ghost" data-x>取消</button></div>', (s) => { if (s === 'y') { S = fresh(); S.intro = true; S.seenLog = LOG_ID; save(); toast('已重新開始'); go('#home'); } });
  });

  /* ───────── 路由 ───────── */
  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  let lastRoute = '';
  function route() {
    const h = (location.hash || '#home').slice(1);
    document.body.classList.remove('inlesson');
    const from = lastRoute; lastRoute = h;
    view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter');
    let m, anchor = null;
    if ((m = h.match(/^l-(\d-\d)(?:--(\w+))?$/))) { anchor = m[2] ? 'b-' + m[2] : null; renderLesson(m[1], anchor); }
    else if ((m = h.match(/^exam-(s\d)$/))) renderExam(m[1]);
    else if ((m = h.match(/^review(?:-(\w+))?$/))) renderReview(m[1]);
    else if (h === 'tools') renderTools();
    else if ((m = h.match(/^tool-(\w+)$/))) renderTool(m[1]);
    else if (h === 'me') renderMe();
    else renderHome();
    if (!anchor) {
      const fm = from.match(/^l-(\d-\d)/);
      const atHome = !/^(l-|exam-|review|tools?|me)/.test(h);
      if (atHome && fm) { const n = document.getElementById('n-' + fm[1]); if (n) n.scrollIntoView({ block: 'center' }); else scrollTo(0, 0); }
      else scrollTo(0, 0);
    }
    setTimeout(() => view.classList.remove('enter'), 700);
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); Sound.play('tap'); go(g.dataset.go); return; }
    if (e.target.closest('[data-back]')) { Sound.play('tap'); const h = location.hash; if (/^#tool-/.test(h)) go('#tools'); else go('#home'); return; }
    const j = e.target.closest('[data-jump]'); if (j) { e.preventDefault(); const t = document.getElementById(j.dataset.jump); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const n = e.target.closest('[data-l]');
    if (n) {
      const l = BYID[n.dataset.l]; Sound.play('tap');
      if (!stageOpen(l.si)) return sheet('<h3>這一關還沒解鎖</h3><p>建議先通過第 ' + l.si + ' 關的關主考驗。這一關會用到前面學過的東西。</p><div class="acts"><button class="btn" data-s="go">還是先偷看</button><button class="btn ghost" data-x>好，先回去</button></div>', () => go('#l-' + l.id));
      if (!lessonOpen(l)) return sheet('<h3>先完成上一課</h3><p>「' + esc(l.stage.lessons[l.li - 1].title) + '」看完卡片、通過驗收，就會解鎖這一課。</p><div class="acts"><button class="btn" data-s="prev">去上一課</button><button class="btn ghost" data-s="go">還是先偷看</button></div>', (s) => go('#l-' + (s === 'prev' ? l.stage.lessons[l.li - 1].id : l.id)));
      return go('#l-' + l.id);
    }
    const x = e.target.closest('[data-exam]');
    if (x) { const st = D.stages.find((s) => s.id === x.dataset.exam); Sound.play('tap'); if (!stageOpen(st.si) || !examOpen(st)) return sheet('<h3>關主考驗還沒開放</h3><p>這一關四課都學懂（看完卡片＋通過驗收）後才開放。想先挑戰也可以：答錯的題目會收進錯題本，通過的話一樣算晉升。</p><div class="acts"><button class="btn ghost" data-s="go">先試試看</button><button class="btn" data-x>好，先回去</button></div>', () => go('#exam-' + st.id)); return go('#exam-' + st.id); }
  });

  /* ───────── 第一次打開 ───────── */
  function intro() {
    sheet('<div style="width:120px;margin:0 auto 8px">' + belt(0) + '</div><h3 style="text-align:center">歡迎來到本機道場</h3><p style="text-align:center">把那本 DGX Spark 書的內容，改寫成給你的 RTX 5090 筆電的修煉課。</p>' +
      '<div class="list" style="margin-bottom:16px"><div class="li"><b>六關，六條腰帶</b><div class="small">從白帶開始。每關四課，通過關主考驗就晉升：黃、綠、藍、紫、紅，最後是黑帶。</div></div>' +
      '<div class="li"><b>每一課五個步驟</b><div class="small">看懂（白話卡片）→ 動手（互動模擬）→ 實作（複製指令給筆電的 Claude Code）→ 驗收（小測驗）→ 想一想。</div></div>' +
      '<div class="li"><b>會反覆出現的複習卡</b><div class="small">學過的術語照遺忘曲線排程；答錯的題目進錯題本，直到你答對。</div></div></div>' +
      '<div class="acts"><button class="btn big" data-s="go">開始修煉</button></div>', () => { S.intro = true; save(); go('#l-1-1'); });
    S.intro = true; save();
  }

  /* ───────── 獨立網頁版：加到主畫面、離線 ───────── */
  try {
    const host = location.hostname;
    if (window.DOJO_WEB && 'serviceWorker' in navigator && ((location.protocol === 'https:' && /github\.io$/.test(host)) || host === 'localhost' || host === '127.0.0.1')) navigator.serviceWorker.register('sw.js').catch(() => {});
  } catch (e) { /* ignore */ }

  /* ───────── 更新提示：打開時用一句話說最新改了什麼（每筆只說一次） ───────── */
  const LOG = D.changelog || [];
  const LOG_ID = LOG.length ? LOG[0].d : '';
  function whatsNew() {
    if (!LOG_ID || (S.seenLog || '') >= LOG_ID) return;
    S.seenLog = LOG_ID; save();
    setTimeout(() => toast('更新：' + LOG[0].t, '新', 7000), 900);
  }

  route();
  if (!S.intro) { S.seenLog = LOG_ID; setTimeout(() => { if (!S.intro) intro(); }, window.DOJO_WEB ? 350 : 1200); }
  else whatsNew();
  checkBadges();
  Cloud.init();
})();
