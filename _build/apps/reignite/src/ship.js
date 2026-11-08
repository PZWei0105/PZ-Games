/* ═══════════════ ship.js — 餘燼號（SVG）、星空（Canvas）、火花特效（Canvas） ═══════════════ */
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CRACKS = [
  'M104,124 l4,7 l-3,5 l5,6', 'M131,152 l3,-6 l4,2 l2,-7', 'M176,121 l-2,8 l4,4 l-1,7', 'M197,158 l5,-5 l-1,-6 l4,-4',
  'M222,123 l3,6 l-4,5 l3,6', 'M241,154 l-4,-6 l3,-4 l-2,-6', 'M283,121 l2,7 l5,3', 'M300,151 l4,-4 l-1,-6',
  'M88,147 l6,-3 l2,4', 'M160,129 l5,4 l-2,5 l4,4', 'M318,132 l5,3 l-1,5'
];

const Ship = {
  el: null,
  build() {
    const wins = []; for (let i = 0; i < 16; i++) wins.push('<rect class="win" data-i="' + i + '" x="' + (98 + i * 12) + '" y="131" width="6" height="4" rx="1"/>');
    const cracks = CRACKS.map((d, i) => '<g class="crack" data-i="' + i + '"><path d="' + d + '" class="ck-glow"/><path d="' + d + '" class="ck"/></g>').join('');
    const spokes = [-34, -18, 18, 34].map((dy) => '<line x1="150" y1="' + (140 + dy * 0.62) + '" x2="150" y2="' + (140 + dy) + '" class="spoke"/>').join('');
    const svg =
`<svg class="ship" viewBox="0 0 400 250" role="img" aria-label="餘燼號">
<defs>
  <linearGradient id="gHull" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" style="stop-color:var(--hullHi)"/><stop offset=".45" style="stop-color:var(--hullC)"/><stop offset="1" stop-color="#0b1020"/>
  </linearGradient>
  <linearGradient id="gDeck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hullHi)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--hullC)"/></linearGradient>
  <linearGradient id="gTank" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#c98a1a"/></linearGradient>
  <linearGradient id="gFlame" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff3d1"/><stop offset=".25" stop-color="#ffb347"/><stop offset=".7" stop-color="#ff5a2a" stop-opacity=".75"/><stop offset="1" stop-color="#ff3d2a" stop-opacity="0"/></linearGradient>
  <radialGradient id="gCore" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6d6"/><stop offset=".35" stop-color="#ffc45c" stop-opacity=".85"/><stop offset="1" stop-color="#ff7a2f" stop-opacity="0"/></radialGradient>
  <linearGradient id="gBeam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff2c4" stop-opacity=".85"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></linearGradient>
  <linearGradient id="gBeamL" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff2c4" stop-opacity=".85"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></linearGradient>
  <linearGradient id="gGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3354"/><stop offset="1" stop-color="#131a30"/></linearGradient>
  <clipPath id="cT1"><rect x="150" y="171" width="64" height="14" rx="7"/></clipPath>
  <clipPath id="cT2"><rect x="221" y="171" width="50" height="14" rx="7"/></clipPath>
</defs>
<g class="beams"><g class="beamR"><path d="M262,37 L400,6 L400,70 Z" fill="url(#gBeam)"/></g><g class="beamL"><path d="M262,37 L124,6 L124,70 Z" fill="url(#gBeamL)"/></g></g>
<g class="bob">
  <g class="ring-back"><ellipse cx="150" cy="140" rx="15" ry="46" class="ring-b"/></g>
  <g class="engine">
    <g class="flames">
      <path class="flame f1" d="M35,124 Q-6,131 35,138 Z" fill="url(#gFlame)"/>
      <path class="flame f2" d="M35,142 Q-6,149 35,156 Z" fill="url(#gFlame)"/>
    </g>
    <path d="M45,126 L35,123 L35,139 L45,136 Z" class="noz"/><path d="M45,144 L35,141 L35,157 L45,154 Z" class="noz"/>
    <path d="M80,119 L54,123 L45,132 L45,148 L54,157 L80,161 Z" class="eblock"/>
    <path d="M58,128 L76,126 M58,152 L76,154" class="pl"/>
    <circle cx="66" cy="140" r="4.5" class="ecore"/>
  </g>
  <path d="M120,168 L282,161 L266,171 L136,172 Z" class="keel"/>
  <g class="tanks">
    <line x1="168" y1="166" x2="168" y2="172" class="strut"/><line x1="198" y1="166" x2="198" y2="172" class="strut"/><line x1="236" y1="165" x2="236" y2="172" class="strut"/><line x1="258" y1="164" x2="258" y2="172" class="strut"/>
    <rect x="150" y="171" width="64" height="14" rx="7" class="tank"/><rect x="221" y="171" width="50" height="14" rx="7" class="tank"/>
    <g clip-path="url(#cT1)"><rect class="fuel" x="150" y="171" width="64" height="14" fill="url(#gTank)"/></g>
    <g clip-path="url(#cT2)"><rect class="fuel" x="221" y="171" width="50" height="14" fill="url(#gTank)"/></g>
    <rect x="150" y="171" width="64" height="14" rx="7" class="tank-hl"/><rect x="221" y="171" width="50" height="14" rx="7" class="tank-hl"/>
  </g>
  <path d="M72,121 L300,117 Q346,127 358,140 Q346,153 300,163 L72,159 Q60,140 72,121 Z" class="hull"/>
  <path d="M96,121 L286,118 L270,107 L122,109 Z" class="deck"/>
  <path d="M84,140 L340,140 M110,121 L110,159 M200,119 L200,161 M290,118 L290,162" class="pl"/>
  <g class="wins">${wins.join('')}</g>
  <path d="M312,128 Q336,131 348,140 Q336,149 312,152 Z" class="cockpit"/>
  <path d="M318,133 Q334,135 342,140 Q334,145 318,147 Z" class="cockpit-g"/>
  <g class="cracks">${cracks}</g>
  <g class="dish"><path d="M104,109 L108,98 M100,96 Q108,92 116,98" class="ant"/><circle cx="108" cy="97" r="1.6" class="ant-tip"/></g>
  <g class="tower">
    <path d="M250,109 L256,53 L268,53 L274,109 Z" class="twr"/>
    <path d="M255,96 L269,96 M256,82 L268,82 M257,68 L267,68" class="pl"/>
    <rect x="247" y="47" width="30" height="6" rx="1.5" class="gal"/>
    <rect x="253" y="29" width="18" height="18" rx="2" class="lantern"/>
    <path d="M249,30 L262,19 L275,30 Z" class="roof"/><line x1="262" y1="19" x2="262" y2="11" class="ant"/>
    <circle cx="262" cy="38" r="16" class="core-glow" fill="url(#gCore)"/>
    <circle cx="262" cy="38" r="3.2" class="core"/>
  </g>
  <g class="ring-front"><path d="M150,94 A15,46 0 0 1 150,186" class="ring-f"/><path d="M150,94 A15,46 0 0 1 150,186" class="ring-dash"/>${spokes}</g>
  <circle cx="72" cy="124" r="1.6" class="nav nav-r"/><circle cx="352" cy="140" r="1.6" class="nav nav-g"/>
</g>
<g class="hot" aria-hidden="true">
  <rect x="20" y="110" width="68" height="56" data-sys="engine"/><rect x="128" y="88" width="44" height="104" data-sys="o2"/>
  <rect x="146" y="164" width="130" height="26" data-sys="fuel"/><rect x="240" y="8" width="44" height="100" data-sys="beacon"/>
  <rect x="176" y="112" width="140" height="48" data-sys="hull"/>
</g>
</svg>`;
    const wrap = document.createElement('div');
    wrap.className = 'shipview';
    wrap.innerHTML = svg +
      '<div class="stag" data-t="beacon" style="left:72%;top:6%"><i></i><b>燈塔</b><span></span></div>' +
      '<div class="stag" data-t="o2" style="left:16%;top:24%"><i></i><b>氧氣</b><span></span></div>' +
      '<div class="stag" data-t="hull" style="left:70%;top:63%"><i></i><b>船體</b><span></span></div>' +
      '<div class="stag" data-t="fuel" style="left:26%;top:80%"><i></i><b>燃料</b><span></span></div>' +
      '<div class="stag" data-t="engine" style="left:2%;top:64%"><i></i><b>引擎</b><span></span></div>';
    this.el = wrap;
    return wrap;
  },
  update(st) {
    if (!this.el) this.build();
    const q = (s) => this.el.querySelectorAll(s);
    const vis = Math.ceil(11 * (1 - st.hull) - 1e-9);
    q('.crack').forEach((g, i) => g.classList.toggle('on', i < vis));
    const lit = Math.round(16 * st.mem);
    q('.win').forEach((w, i) => w.classList.toggle('lit', i < lit));
    const lvl = clamp(st.fuel / 8 * 0.72 + (st.todayF ? 0.28 : 0), 0.06, 1);
    q('.fuel').forEach((r) => { r.setAttribute('y', String(171 + 14 * (1 - lvl))); });
    const ring = this.el.querySelector('.ring-dash');
    ring.style.animationDuration = (st.o2 ? (11 - st.o2) : 16) + 's';
    this.el.style.setProperty('--o2', String(0.22 + st.o2 * 0.085 + (st.todayE ? 0.08 : 0)));
    const fl = 0.22 + st.eng * 0.085 + (st.todayE ? 0.18 : 0);
    this.el.style.setProperty('--flame', String(clamp(fl, 0.15, 1)));
    this.el.style.setProperty('--core', String(0.25 + st.beacon * 0.12));
    this.el.classList.toggle('lit', !!st.lit);
    this.el.classList.toggle('dead', st.eng === 0 && !st.todayE);
    const set = (k, txt) => { const t = this.el.querySelector('.stag[data-t="' + k + '"] span'); if (t) t.textContent = txt; };
    set('hull', Math.round(st.hull * 100) + '%');
    set('fuel', st.fuel + '/8');
    set('o2', st.o2 + '/8');
    set('engine', st.eng + '/8');
    set('beacon', st.lit ? '點亮' : st.beacon + '/6');
  },
  pulse(sys) {
    if (!this.el) return; const t = this.el.querySelector('.stag[data-t="' + sys + '"]'); if (!t) return;
    t.classList.remove('ping'); void t.offsetWidth; t.classList.add('ping');
  }
};

/* ───────── 星空背景 ───────── */
const Stars = {
  cv: null, cx: null, w: 0, h: 0, layers: [], t: 0, raf: 0, shoot: null, speed: 1,
  init(cv) {
    this.cv = cv; this.cx = cv.getContext('2d');
    this.resize(); window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(this.raf); else this.loop(performance.now()); });
    this.loop(performance.now());
  },
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.cv.width = Math.round(this.w * dpr); this.cv.height = Math.round(this.h * dpr);
    this.cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mk = (n, sp, r, a) => Array.from({ length: n }, () => ({ x: Math.random() * this.w, y: Math.random() * this.h, sp, r: r * (0.6 + Math.random() * 0.8), a: a * (0.5 + Math.random() * 0.5), ph: Math.random() * 6.28 }));
    const area = this.w * this.h / (390 * 844);
    this.layers = [mk(Math.round(80 * area), 0.006, 0.7, 0.55), mk(Math.round(42 * area), 0.016, 1.0, 0.75), mk(Math.round(16 * area), 0.04, 1.5, 0.95)];
    this.draw(0);
  },
  loop(t) {
    const dt = Math.min(64, t - (this.t || t)); this.t = t;
    if (!REDUCED) this.step(dt);
    this.draw(t);
    if (!REDUCED) this.raf = requestAnimationFrame((x) => this.loop(x));
  },
  step(dt) {
    for (const L of this.layers) for (const s of L) { s.x -= s.sp * dt * this.speed; if (s.x < -2) { s.x = this.w + 2; s.y = Math.random() * this.h; } }
    if (!this.shoot && Math.random() < dt / 9000) this.shoot = { x: Math.random() * this.w * 0.8 + this.w * 0.2, y: Math.random() * this.h * 0.4, vx: -0.5, vy: 0.18, life: 1 };
    if (this.shoot) { const s = this.shoot; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt / 900; if (s.life <= 0) this.shoot = null; }
  },
  draw(t) {
    const c = this.cx; c.clearRect(0, 0, this.w, this.h);
    for (const L of this.layers) for (const s of L) {
      const tw = 0.65 + 0.35 * Math.sin(t / 900 + s.ph);
      c.globalAlpha = s.a * tw; c.fillStyle = '#dfe7ff';
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, 6.283); c.fill();
    }
    if (this.shoot) {
      const s = this.shoot; c.globalAlpha = Math.max(0, s.life);
      const g = c.createLinearGradient(s.x, s.y, s.x + 90, s.y - 32); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = g; c.lineWidth = 1.4; c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x + 90, s.y - 32); c.stroke();
    }
    c.globalAlpha = 1;
  }
};

/* ───────── 火花特效（完成任務時飛向星火計數器） ───────── */
const FX = {
  cv: null, cx: null, ps: [], raf: 0, w: 0, h: 0,
  init(cv) { this.cv = cv; this.cx = cv.getContext('2d'); this.resize(); window.addEventListener('resize', () => this.resize()); },
  resize() { const dpr = Math.min(window.devicePixelRatio || 1, 2); this.w = window.innerWidth; this.h = window.innerHeight; this.cv.width = Math.round(this.w * dpr); this.cv.height = Math.round(this.h * dpr); this.cx.setTransform(dpr, 0, 0, dpr, 0, 0); },
  burst(x, y, color, n, spread) {
    if (REDUCED) return;
    for (let i = 0; i < (n || 24); i++) { const a = Math.random() * 6.283, v = (0.05 + Math.random() * 0.25) * (spread || 1); this.ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.05, life: 1, dec: 0.0012 + Math.random() * 0.0012, r: 1 + Math.random() * 2.2, c: color || '#ffb347', g: 0.00025 }); }
    this.go();
  },
  fly(x0, y0, x1, y1, n, color, done) {
    if (REDUCED) { if (done) done(); return; }
    let left = n || 10;
    for (let i = 0; i < (n || 10); i++) {
      const a = Math.random() * 6.283, sp = 0.12 + Math.random() * 0.2;
      this.ps.push({ x: x0, y: y0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, dec: 0, r: 1.6 + Math.random() * 1.6, c: color || '#ffc45c', home: { x: x1, y: y1 }, delay: i * 26, age: 0, cb: () => { left--; if (left === 0 && done) done(); } });
    }
    this.go();
  },
  go() { if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame((t) => this.tick(t)); } },
  tick(t) {
    const dt = Math.min(40, t - this.last); this.last = t; const c = this.cx;
    c.clearRect(0, 0, this.w, this.h); c.globalCompositeOperation = 'lighter';
    this.ps = this.ps.filter((p) => {
      if (p.home) {
        p.age += dt; if (p.age < p.delay) return true;
        const k = Math.min(1, (p.age - p.delay) / 520);
        const dx = p.home.x - p.x, dy = p.home.y - p.y;
        p.vx = p.vx * 0.9 + dx * 0.0016 * (0.5 + k * 3); p.vy = p.vy * 0.9 + dy * 0.0016 * (0.5 + k * 3);
        p.x += p.vx * dt * 0.06 * (1 + k * 6); p.y += p.vy * dt * 0.06 * (1 + k * 6);
        if (Math.hypot(dx, dy) < 10 || p.age > 2200) { p.cb && p.cb(); return false; }
      } else {
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= p.dec * dt; if (p.life <= 0) return false;
      }
      c.globalAlpha = Math.max(0, Math.min(1, p.life)); c.fillStyle = p.c;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
      c.globalAlpha *= 0.35; c.beginPath(); c.arc(p.x, p.y, p.r * 3, 0, 6.283); c.fill();
      return true;
    });
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    if (this.ps.length) this.raf = requestAnimationFrame((x) => this.tick(x)); else { this.raf = 0; c.clearRect(0, 0, this.w, this.h); }
  }
};
