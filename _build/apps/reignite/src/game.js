/* ═══════════════ game.js — 嘴饞警報：隕石清除小遊戲、呼吸校準 ═══════════════
   嘴饞像海浪，通常幾分鐘就退了。這裡的設計只有一個目的：陪你撐過那三分鐘。
   不會輸、不會扣分；結束後照實記錄就好。
*/
const CRAVE_SEC = 180;
const Crave = {
  what: null, mode: null, t0: 0, raf: 0, timer: 0, score: 0, gold: 0, combo: 0, lastHit: 0,
  open(what) {
    this.what = what || null; this.mode = null; this.score = 0; this.gold = 0;
    Sound.play('alarm'); haptic(30);
    openModal('<div class="crave alarm-in" id="crave"></div>', 'crave');
    this.step1();
  },
  root() { return document.getElementById('crave'); },
  step1() {
    const r = this.root(); if (!r) return;
    r.innerHTML =
      '<div class="cv-top"><div class="siren"><i></i><i></i></div><h2>嘴饞警報</h2><p>偵測到燃料渴望。先別急，告訴我是哪一種。</p></div>' +
      '<div class="cv-pick">' +
      '<button class="big-pick rb" data-act="cr-what" data-v="rb"><b>紅牛</b><span>想要那一罐</span></button>' +
      '<button class="big-pick sw" data-act="cr-what" data-v="sw"><b>甜食餅乾</b><span>嘴巴想咬點甜的</span></button>' +
      '<button class="big-pick ot" data-act="cr-what" data-v="ot"><b>其他</b><span>宵夜、炸物、說不上來</span></button>' +
      '</div><button class="ghost wide" data-act="cr-close">我按錯了</button>';
    if (this.what) this.step2();
  },
  step2() {
    const r = this.root(); if (!r) return;
    const L = this.what === 'rb' ? D.ladders.rb : this.what === 'sw' ? D.ladders.sw : null;
    const subs = L ? L.subs : ['一杯水、無糖茶', '刷牙（真的有用）', '離開廚房或便利商店，走兩分鐘', '跟人講講話'];
    r.innerHTML =
      '<div class="cv-top calm"><h2>先撐三分鐘</h2><p>嘴饞像海浪，通常幾分鐘就會退。選一個陪你撐過去的方法。</p></div>' +
      '<div class="cv-modes">' +
      '<button class="mode-card" data-act="cr-mode" data-v="game"><svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 6 L38 22 L54 26 L42 38 L45 54 L30 46 L15 54 L18 38 L6 26 L22 22 Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg><b>隕石清除</b><span>點爆落下來的糖晶隕石，三分鐘一回合</span></button>' +
      '<button class="mode-card" data-act="cr-mode" data-v="breath"><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="12" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="30" cy="30" r="22" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".5"/></svg><b>呼吸校準</b><span>吸 4 秒、吐 6 秒，跟著圓圈慢慢呼吸</span></button>' +
      '</div>' +
      '<div class="cv-subs"><h3>如果撐不住，先換成這些</h3><ul>' + subs.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul></div>' +
      '<button class="ghost wide" data-act="cr-result">我已經不想了，直接記錄</button>';
  },
  start(mode) {
    this.mode = mode; this.t0 = performance.now();
    const r = this.root(); if (!r) return;
    r.classList.add('playing');
    r.innerHTML =
      '<div class="cv-hud"><div class="cv-time" id="cvTime">3:00</div>' + (mode === 'game' ? '<div class="cv-score"><span id="cvScore">0</span><small id="cvCombo"></small></div>' : '<div class="cv-score"><span id="cvCycles">0</span><small>次呼吸</small></div>') +
      '<button class="cv-end" data-act="cr-result">結束</button></div>' +
      (mode === 'game' ? '<canvas id="cvGame" aria-label="隕石清除：點落下來的隕石"></canvas><p class="cv-hint">點隕石把它打碎。金色的會掉零件。</p>' :
        '<div class="breath"><div class="b-ring"><div class="b-core" id="bCore"></div></div><div class="b-txt" id="bTxt">準備……</div><p class="cv-hint">如果覺得頭暈，就恢復平常的呼吸。</p></div>');
    if (mode === 'game') this.game(); else this.breath();
    this.tickTimer();
  },
  tickTimer() {
    const el = document.getElementById('cvTime'); if (!el) return;
    const left = Math.max(0, CRAVE_SEC - (performance.now() - this.t0) / 1000);
    el.textContent = Math.floor(left / 60) + ':' + pad(Math.floor(left % 60));
    el.classList.toggle('last', left < 20);
    if (left <= 0) { this.result(true); return; }
    this.timer = setTimeout(() => this.tickTimer(), 250);
  },
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; clearTimeout(this.timer); clearTimeout(this.bt); this.bt = 0; },
  result(full) {
    this.stop();
    const r = this.root(); if (!r) return; r.classList.remove('playing');
    const L = this.what === 'rb' ? D.ladders.rb : this.what === 'sw' ? D.ladders.sw : null;
    const subs = L ? L.subs : ['一杯水或無糖茶', '水果', '先去刷牙'];
    const sum = this.mode === 'game' && this.score > 0 ? '<p class="cv-sum">這回合打碎了 ' + Math.round(this.score / 10) + ' 顆隕石' + (this.gold ? '，其中 ' + this.gold + ' 顆是金色的' : '') + '。</p>' : this.mode === 'breath' && this.cycles > 0 ? '<p class="cv-sum">你做了 ' + (this.cycles || 0) + ' 次慢呼吸。</p>' : '';
    r.innerHTML =
      '<div class="cv-top calm"><h2>' + (full ? '三分鐘到了' : '警報解除了嗎？') + '</h2>' + sum + '<p>不管結果是哪一個，照實選就好。按了警報，本身就是進步。</p></div>' +
      '<div class="cv-res">' +
      '<button class="res-btn good" data-act="cr-done" data-v="resist"><b>撐過去了</b><span>不吃了</span><em>+25</em></button>' +
      '<details class="res-sub"><summary class="res-btn mid"><b>換成替代品了</b><span>選一個</span><em>+15</em></summary><div class="sub-list">' + subs.map((s, i) => '<button class="chip" data-act="cr-done" data-v="swap" data-s="' + i + '">' + esc(s) + '</button>').join('') + '</div></details>' +
      '<button class="res-btn plain" data-act="cr-done" data-v="ate"><b>還是吃了</b><span>照實記錄，不扣分</span><em>+5</em></button>' +
      '</div>';
  },
  done(res, subIdx) {
    const k = today(); const d = day(k); d.cr = d.cr || [];
    const L = this.what === 'rb' ? D.ladders.rb : this.what === 'sw' ? D.ladders.sw : null;
    const rec = { what: this.what || 'ot', res, t: Date.now() };
    if (res === 'swap' && L && L.subs[subIdx]) rec.sub = L.subs[subIdx];
    d.cr.push(rec);
    let n = res === 'resist' ? 25 : res === 'swap' ? 15 : 5;
    if (res === 'ate' && (this.what === 'rb' || this.what === 'sw')) d[this.what] = (d[this.what] || 0) + 1;
    gain(n, '嘴饞警報');
    let it = null; if (this.gold && Math.random() < 0.5) it = roll(0.3);
    const line = res === 'resist' ? pick(D.lines.resist) : res === 'swap' ? pick(D.lines.swapIn) : pick(D.lines.ateIt);
    closeModal();
    afterAction({ line, sys: 'fuel', item: it });
  },
  /* ───── 隕石清除 ───── */
  game() {
    const cv = document.getElementById('cvGame'); if (!cv) return;
    const cx = cv.getContext('2d'); const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const fit = () => { const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    fit();
    const ms = [], parts = [], rings = []; let next = 0, last = performance.now(), shake = 0;
    this.score = 0; this.combo = 0; this.gold = 0;
    const spawn = (el) => {
      const g = Math.random() < 0.06; const r = g ? 15 : 12 + Math.random() * 14;
      const pts = []; const n = 6 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) pts.push(0.72 + Math.random() * 0.36);
      ms.push({ x: r + Math.random() * (W - 2 * r), y: -r, r, vy: (0.045 + Math.random() * 0.05) * (1 + el / 260), vx: (Math.random() - 0.5) * 0.02, a: Math.random() * 6.28, va: (Math.random() - 0.5) * 0.004, g, pts });
    };
    const hit = (x, y) => {
      let best = -1, bd = 1e9;
      ms.forEach((m, i) => { const d = Math.hypot(m.x - x, m.y - y); if (d < m.r + 22 && d < bd) { bd = d; best = i; } });
      if (best < 0) return;
      const m = ms.splice(best, 1)[0]; const t = performance.now();
      this.combo = t - this.lastHit < 1300 ? this.combo + 1 : 1; this.lastHit = t;
      this.score += 10 * Math.min(this.combo, 5);
      if (m.g) { this.gold++; Sound.play('gold'); } else Sound.play('pop');
      haptic(6); shake = 6;
      const col = m.g ? ['#ffe08a', '#ffc45c', '#fff'] : ['#ff7aa8', '#ffb3cf', '#fff'];
      for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, v = 0.05 + Math.random() * 0.25; parts.push({ x: m.x, y: m.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: pick(col), r: 1 + Math.random() * 2.4 }); }
      rings.push({ x: m.x, y: m.y, r: m.r, life: 1, c: m.g ? '#ffd27a' : '#ff8ab8' });
      const sc = document.getElementById('cvScore'); if (sc) sc.textContent = Math.round(this.score / 10);
      const cb = document.getElementById('cvCombo'); if (cb) cb.textContent = this.combo > 1 ? '連擊 ×' + Math.min(this.combo, 5) : '';
    };
    cv.addEventListener('pointerdown', (e) => { const r = cv.getBoundingClientRect(); hit(e.clientX - r.left, e.clientY - r.top); });
    const frame = (t) => {
      if (!document.getElementById('cvGame')) return;
      const dt = Math.min(40, t - last); last = t; const el = (t - this.t0) / 1000;
      if (Math.abs(cv.getBoundingClientRect().width - W) > 1) fit();
      const gap = el > 160 ? 260 : Math.max(420, 950 - el * 3.2);
      if (t > next) { spawn(el); if (el > 160 && Math.random() < 0.5) spawn(el); next = t + gap * (0.6 + Math.random() * 0.8); }
      cx.save(); cx.clearRect(0, 0, W, H);
      if (shake > 0) { cx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.82; if (shake < 0.3) shake = 0; }
      // 護盾與船
      const sy = H - 34;
      const grd = cx.createRadialGradient(W / 2, sy + 60, 10, W / 2, sy + 60, W * 0.7); grd.addColorStop(0, 'rgba(87,227,217,.18)'); grd.addColorStop(1, 'rgba(87,227,217,0)');
      cx.fillStyle = grd; cx.fillRect(0, sy - 80, W, 120);
      cx.strokeStyle = 'rgba(87,227,217,.45)'; cx.lineWidth = 1.5; cx.beginPath(); cx.ellipse(W / 2, sy + 40, W * 0.62, 70, 0, Math.PI * 1.08, Math.PI * 1.92); cx.stroke();
      cx.fillStyle = '#c9d3f2'; cx.beginPath(); cx.moveTo(W / 2, sy - 12); cx.lineTo(W / 2 + 22, sy + 10); cx.lineTo(W / 2 - 22, sy + 10); cx.closePath(); cx.fill();
      cx.fillStyle = '#ffb347'; cx.beginPath(); cx.arc(W / 2, sy - 3, 3.2, 0, 6.28); cx.fill();
      // 隕石
      for (let i = ms.length - 1; i >= 0; i--) {
        const m = ms[i]; m.y += m.vy * dt; m.x += m.vx * dt; m.a += m.va * dt;
        if (m.y > sy - 26) { ms.splice(i, 1); this.combo = 0; rings.push({ x: m.x, y: sy - 26, r: 8, life: 0.7, c: '#57E3D9' }); continue; }
        cx.save(); cx.translate(m.x, m.y); cx.rotate(m.a);
        cx.fillStyle = m.g ? 'rgba(255,210,122,.16)' : 'rgba(255,122,168,.14)'; cx.beginPath(); cx.arc(0, 0, m.r * 1.8, 0, 6.28); cx.fill();
        cx.beginPath(); m.pts.forEach((p, j) => { const a = (j / m.pts.length) * 6.283; const x = Math.cos(a) * m.r * p, y = Math.sin(a) * m.r * p; if (j) cx.lineTo(x, y); else cx.moveTo(x, y); }); cx.closePath();
        cx.fillStyle = m.g ? '#ffd27a' : '#ff8ab8'; cx.fill();
        cx.strokeStyle = m.g ? '#fff3c4' : '#ffd1e3'; cx.lineWidth = 1.2; cx.stroke();
        cx.fillStyle = 'rgba(255,255,255,.55)'; cx.beginPath(); cx.moveTo(-m.r * 0.3, -m.r * 0.5); cx.lineTo(m.r * 0.1, -m.r * 0.15); cx.lineTo(-m.r * 0.45, -m.r * 0.05); cx.closePath(); cx.fill();
        cx.restore();
      }
      // 爆炸
      cx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.0002 * dt; p.life -= dt / 700; if (p.life <= 0) { parts.splice(i, 1); continue; } cx.globalAlpha = p.life; cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.28); cx.fill(); }
      for (let i = rings.length - 1; i >= 0; i--) { const g = rings[i]; g.r += dt * 0.09; g.life -= dt / 450; if (g.life <= 0) { rings.splice(i, 1); continue; } cx.globalAlpha = g.life; cx.strokeStyle = g.c; cx.lineWidth = 2; cx.beginPath(); cx.arc(g.x, g.y, g.r, 0, 6.28); cx.stroke(); }
      cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; cx.restore();
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  },
  /* ───── 呼吸校準：吸 4 秒、吐 6 秒 ───── */
  breath() {
    this.cycles = 0;
    const core = document.getElementById('bCore'), txt = document.getElementById('bTxt'); if (!core) return;
    const inhale = () => {
      if (!document.getElementById('bCore')) return;
      core.className = 'b-core in'; txt.textContent = '慢慢吸氣'; Sound.play('breathIn');
      this.bt = setTimeout(exhale, 4000);
    };
    const exhale = () => {
      if (!document.getElementById('bCore')) return;
      core.className = 'b-core out'; txt.textContent = '慢慢吐氣'; Sound.play('breathOut');
      this.bt = setTimeout(() => { this.cycles++; const c = document.getElementById('cvCycles'); if (c) c.textContent = this.cycles; inhale(); }, 6000);
    };
    this.bt = setTimeout(inhale, 900);
  }
};
