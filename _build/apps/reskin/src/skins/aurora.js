/* ===================== skin: 極光 — northern lights over a frozen lake: the curtains ripple with the music and mirror in the ice; the chorus opens a corona overhead ===================== */
R.skins.def({
  id: 'aurora', name: '極光', group: '夢幻', en: 'AURORA',
  desc: '冰湖上的北極光，光幕隨音樂起伏、倒映在湖面；副歌時頭頂綻開極光冠',
  bloom: { s: 0.5, th: 0.5 }, hero: '.au-card', trans: 'portal',
  theme: { bg: '#03101a', fg: '#e9fbff', accent: '#5dffc4', accent2: '#b48cff', ui: 'rgba(6,18,30,.97)', dock: 'rgba(10,30,44,.5)', dockfg: '#d8fff3' },
  enterMs: 1800, swapMs: 1300, hype: false,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="aub" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020812"/><stop offset="1" stop-color="#0a2233"/></linearGradient><linearGradient id="aur" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#7dffb8"/><stop offset=".45" stop-color="#3fd8ff" stop-opacity=".6"/><stop offset="1" stop-color="#b46cff" stop-opacity="0"/></linearGradient></defs><rect width="116" height="150" fill="url(#aub)"/><path d="M-4 70C20 50 34 78 58 60S96 40 120 56V20C96 8 80 30 58 22S20 6-4 26Z" fill="url(#aur)" opacity=".85"/><path d="M-4 84C18 70 40 92 64 76S100 62 120 72V50C100 40 80 58 60 50S20 40-4 56Z" fill="url(#aur)" opacity=".5"/><g fill="#fff"><circle cx="12" cy="10" r=".8"/><circle cx="40" cy="6" r=".6"/><circle cx="96" cy="14" r=".8"/><circle cx="72" cy="4" r=".6"/><circle cx="104" cy="34" r=".6"/></g><path d="M0 104L18 86 28 94 46 72 60 88 72 80 90 94 104 84 116 92V104Z" fill="#0b1a2c"/><path d="M46 72l-5 6 5-2 4 3z" fill="#3a5470"/><path d="M0 104h116v10H0z" fill="#06121f"/><path d="M0 108C20 104 30 112 58 108S96 104 116 108" stroke="#7dffb8" stroke-width="1" opacity=".25"/><g fill="#050c15"><path d="M6 104l5-14 5 14zM16 104l4-10 4 10zM96 104l6-16 6 16zM106 104l4-10 4 10z"/></g><rect x="74" y="97" width="12" height="7" fill="#050c15"/><path d="M72 98l8-6 8 6z" fill="#050c15"/><rect x="78" y="99" width="3" height="3" fill="#ffcf7a"/><path d="M0 120c30-6 60 2 116-4v34H0z" fill="#132034"/></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 2093, dur: 0.12, v: 0.035 }); },
    tick(s, t) { s.tone(t, { f: 2637, dur: 0.06, v: 0.025 }); },
    toggle(s, t) { s.notes(t, [s.hz(88), s.hz(95)], { dur: 0.4, v: 0.03, gap: 0.06 }); },
    play(s, t) { s.notes(t, [72, 76, 79, 83, 88].map(s.hz), { dur: 1.3, v: 0.03, a: 0.03, gap: 0.06 }); s.noise(t, { f: 1500, f2: 3000, dur: 1, v: 0.015, a: 0.3 }); },
    pause(s, t) { s.notes(t, [s.hz(83), s.hz(76)], { dur: 0.9, v: 0.03, a: 0.02, gap: 0.1 }); },
    next(s, t) { s.notes(t, [s.hz(79), s.hz(84), s.hz(88)], { dur: 0.6, v: 0.03, gap: 0.05 }); },
    prev(s, t) { s.notes(t, [s.hz(88), s.hz(84), s.hz(79)], { dur: 0.6, v: 0.03, gap: 0.05 }); },
    enter(s, t) { s.noise(t, { f: 500, f2: 1400, dur: 2, v: 0.05, q: 0.5, a: 0.8 }); s.notes(t + 0.3, [60, 67, 72, 76, 79, 83].map(s.hz), { dur: 2.2, v: 0.025, a: 0.25, gap: 0.12 }); },
    open(s, t) { s.tone(t, { f: 1760, f2: 2637, dur: 0.18, v: 0.02 }); },
    close(s, t) { s.tone(t, { f: 2637, f2: 1760, dur: 0.18, v: 0.02 }); },
    ok(s, t) { s.notes(t, [s.hz(84), s.hz(88), s.hz(91), s.hz(96)], { dur: 0.7, v: 0.03, gap: 0.05 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="au-sky"></canvas><canvas class="au-fg"></canvas>
      <div class="au-card"><img data-bind="cover" alt="" draggable="false"></div>
      <div class="au-info" data-ui><div class="au-t" data-bind="title"></div><div class="au-a" data-bind="artist"></div></div>
      <div class="au-dock">${R.ui.seek('au-seek')}${R.ui.ctrl('au-ctrl')}</div>`;
    // the lights are soft, so they render at half resolution and are scaled up smoothly
    const sky = api.canvas(root.querySelector('.au-sky'), { dprMax: 1, scale: 0.5 });
    const fg = api.canvas(root.querySelector('.au-fg'), { dprMax: 2 });
    const low = api.low(), rnd = R.rng(66);
    let Y0 = 500, lakeB = 600, scene = null, K = 1;
    // vertical ray sprites: bright lower edge fading upwards through teal into violet
    const ray = (stops) => { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 256, 0, 0); for (const [o, col] of stops) g.addColorStop(o, col); x.fillStyle = g; x.fillRect(0, 0, 4, 256); return c; };
    const RAY = ray([[0, 'rgba(125,255,184,0)'], [0.04, 'rgba(140,255,190,1)'], [0.22, 'rgba(63,255,208,.75)'], [0.55, 'rgba(74,168,255,.32)'], [1, 'rgba(180,108,255,0)']]);
    const RAY2 = ray([[0, 'rgba(120,255,220,0)'], [0.04, 'rgba(120,240,255,.95)'], [0.3, 'rgba(90,200,255,.6)'], [0.65, 'rgba(150,120,255,.28)'], [1, 'rgba(200,110,255,0)']]);
    const RAYH = ray([[0, 'rgba(255,107,213,0)'], [0.04, 'rgba(255,120,220,1)'], [0.25, 'rgba(200,110,255,.75)'], [0.6, 'rgba(110,140,255,.32)'], [1, 'rgba(90,255,200,0)']]);
    const beam = (() => { const c = document.createElement('canvas'); c.width = 32; c.height = 256; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(15, 0); x.lineTo(17, 0); x.lineTo(32, 256); x.lineTo(0, 256); x.closePath(); x.fill(); return c; })();
    const tints = new Map();
    const tinted = (img, col) => { const k = col; if (tints.has(k)) return tints.get(k); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); tints.set(k, c); return c; };
    const ribbons = [
      { base: 0.3, amp: 0.07, len: 0.34, f: 1.3, sp: 0.16, seed: 1, img: RAY, a: 0.55 },
      { base: 0.44, amp: 0.09, len: 0.4, f: 0.9, sp: -0.11, seed: 2, img: RAY, a: 0.7 },
      { base: 0.56, amp: 0.05, len: 0.28, f: 1.8, sp: 0.21, seed: 3, img: RAY2, a: 0.45 },
    ];
    // mountains, forest, a cabin with its light on, the lake (mirroring the shore) and the snow bank: painted once
    function build() {
      const w = fg.w, h = fg.h, d = fg.dpr, port = h > w * 1.15;
      Y0 = Math.round(h * (port ? 0.62 : 0.7)); lakeB = Math.round(h * (port ? 0.76 : 0.86)); K = Math.max(0.6, Math.min(1.4, Math.min(w, h) / 560));
      const r = R.rng(12);
      const land = document.createElement('canvas'); land.width = Math.ceil(w * d); land.height = Math.ceil((Y0 + 2) * d);
      const x = land.getContext('2d'); x.scale(d, d);
      const ridge = (base, amp, n, seed) => { const pts = []; for (let px = -10; px <= w + 10; px += 4) { let m = 0; for (let k = 1; k <= n; k++) m += Math.sin(px * 0.004 * k * (1 + seed * 0.13) + seed * k) / k; pts.push(px, base - amp * (0.55 + 0.45 * m) - amp * 0.25 * R.noise1(px * 0.02, seed)); } return pts; };
      const fill = (pts, bottom, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(-10, bottom); for (let i = 0; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.lineTo(w + 10, bottom); x.closePath(); x.fill(); };
      for (const [k, rb] of ribbons.entries()) rb.base = (port ? [0.6, 0.73, 0.85] : [0.42, 0.56, 0.7])[k];
      const far = ridge(Y0 - 4, h * (port ? 0.11 : 0.13), 4, 3), near = ridge(Y0, h * 0.05, 3, 7);
      const fgd = x.createLinearGradient(0, Y0 - h * 0.16, 0, Y0); fgd.addColorStop(0, '#173350'); fgd.addColorStop(1, '#0a1828');
      fill(far, Y0 + 2, fgd);
      // snow caps: painted inside the range's outline so they hug the ridge
      x.save(); x.beginPath(); x.moveTo(-10, Y0 + 2); for (let i = 0; i < far.length; i += 2) x.lineTo(far[i], far[i + 1]); x.lineTo(w + 10, Y0 + 2); x.closePath(); x.clip();
      // the ridge catches the light...
      x.strokeStyle = 'rgba(150,215,230,.22)'; x.lineWidth = 7 * K; x.lineJoin = 'round'; x.beginPath();
      for (let i = 0; i < far.length; i += 2) { if (i) x.lineTo(far[i], far[i + 1]); else x.moveTo(far[i], far[i + 1]); }
      x.stroke();
      // ...and the three highest summits keep their snow
      const tops = [];
      for (let i = 2; i < far.length - 2; i += 2) if (far[i + 1] <= far[i - 1] && far[i + 1] <= far[i + 3] && far[i + 1] < Math.min(far[Math.max(1, i - 15)], far[Math.min(far.length - 1, i + 17)]) - 12 * K) tops.push([far[i], far[i + 1]]);   // sharp summits only
      tops.sort((a, b) => a[1] - b[1]);
      x.fillStyle = 'rgba(190,220,240,.42)';
      for (const [px, py] of tops.slice(0, 3)) {
        const cw = 22 * K, ch = 14 * K;
        x.beginPath(); x.moveTo(px - cw, py + ch * 0.9); x.lineTo(px - cw * 0.55, py + ch * 0.62); x.lineTo(px - cw * 0.3, py + ch * 0.95); x.lineTo(px, py + ch * 0.55); x.lineTo(px + cw * 0.28, py + ch * 1.0); x.lineTo(px + cw * 0.62, py + ch * 0.6); x.lineTo(px + cw, py + ch * 0.85); x.lineTo(px + cw, py - ch); x.lineTo(px - cw, py - ch); x.closePath(); x.fill();
      }
      x.restore();
      fill(near, Y0 + 2, '#08131f');
      x.fillStyle = '#040b13';
      for (let px = -6; px < w + 6;) { const th = (8 + r() * 22) * K, tw = th * 0.42; if (r() < 0.78) { x.beginPath(); x.moveTo(px, Y0 + 2); x.lineTo(px + tw / 2, Y0 - th); x.lineTo(px + tw, Y0 + 2); x.closePath(); x.fill(); } px += tw * (0.55 + r() * 0.6); }
      const cx = w * (port ? 0.7 : 0.78), cs = 14 * K;
      x.fillRect(cx, Y0 - cs * 0.8, cs * 1.4, cs * 0.8 + 2); x.beginPath(); x.moveTo(cx - cs * 0.15, Y0 - cs * 0.78); x.lineTo(cx + cs * 0.7, Y0 - cs * 1.35); x.lineTo(cx + cs * 1.55, Y0 - cs * 0.78); x.closePath(); x.fill();
      x.fillRect(cx + cs * 1.05, Y0 - cs * 1.4, cs * 0.18, cs * 0.4);
      x.fillStyle = '#ffcf7a'; x.fillRect(cx + cs * 0.3, Y0 - cs * 0.55, cs * 0.32, cs * 0.3);
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.5; x.drawImage(api.glow('#ffb45c', 64), cx + cs * 0.46 - cs * 1.4, Y0 - cs * 0.4 - cs * 1.4, cs * 2.8, cs * 2.8);
      scene = document.createElement('canvas'); scene.width = Math.ceil(w * d); scene.height = Math.ceil(h * d);
      const s = scene.getContext('2d'); s.scale(d, d);
      s.drawImage(land, 0, 0, w, Y0 + 2);
      const lg = s.createLinearGradient(0, Y0, 0, lakeB); lg.addColorStop(0, '#071524'); lg.addColorStop(1, '#030a12');
      s.fillStyle = lg; s.fillRect(0, Y0 + 1, w, lakeB - Y0);
      // the shore mirrored in the ice
      const mh = Math.min(Y0, h * 0.2);
      s.save(); s.globalAlpha = 0.38; s.translate(0, Y0 * 2 + 2); s.scale(1, -1); s.drawImage(land, 0, (Y0 + 2 - mh) * d, land.width, mh * d, 0, Y0 + 2 - mh, w, mh); s.restore();
      s.strokeStyle = 'rgba(160,220,255,.06)'; s.lineWidth = 1;
      for (let i = 0; i < 9; i++) { const yy = Y0 + 4 + (lakeB - Y0) * (i / 9) ** 1.4; s.beginPath(); s.moveTo(w * r() * 0.3, yy); s.lineTo(w * (0.5 + r() * 0.5), yy); s.stroke(); }
      const bank = (px) => lakeB + 4 * Math.sin(px * 0.02) + 3 * R.noise1(px * 0.05, 4);
      const sg = s.createLinearGradient(0, lakeB, 0, h); sg.addColorStop(0, '#1d2f47'); sg.addColorStop(0.25, '#132235'); sg.addColorStop(1, '#09121e');
      s.fillStyle = sg; s.beginPath(); s.moveTo(-10, h); for (let px = -10; px <= w + 10; px += 8) s.lineTo(px, bank(px)); s.lineTo(w + 10, h); s.closePath(); s.fill();
      s.strokeStyle = 'rgba(190,225,255,.25)'; s.lineWidth = 1.2; s.beginPath();
      for (let px = -10; px <= w + 10; px += 8) { if (px === -10) s.moveTo(px, bank(px)); else s.lineTo(px, bank(px)); }
      s.stroke();
    }
    build();
    const stars = []; for (let i = 0; i < 130; i++) stars.push([rnd(), rnd(), rnd() * 6, 0.25 + rnd() * 0.75, rnd() < 0.08]);
    const snow = []; for (let i = 0; i < (low ? 40 : 90); i++) snow.push({ x: rnd(), y: rnd(), s: 0.6 + rnd() * 1.6, sp: 8 + rnd() * 18, ph: rnd() * 6 });
    const meteors = [];
    let enterT = 9, sweep = -1, corona = 0;
    const meteor = () => { const { w } = fg; meteors.push({ x: w * (0.2 + rnd() * 0.9), y: Y0 * (0.05 + rnd() * 0.3), vx: -(260 + rnd() * 200) * K, vy: (90 + rnd() * 80) * K, life: 0.7 + rnd() * 0.4 }); };
    api.on('hot', (on) => { if (on) { for (let i = 0; i < 3; i++) api.later(meteor, i * 260); } });
    api.beat((s) => { if (R.viz.hot > 0.5 && s > 0.8 && rnd() < 0.35) meteor(); });
    return {
      enter() { enterT = 0; },
      swap() { sweep = 0; },
      resize() { sky.resize(); fg.resize(); build(); },
      frame(dt, t, v) {
        enterT += dt;
        if (sweep >= 0) { sweep += dt * 0.9; if (sweep > 1.4) sweep = -1; }
        corona += ((v.hot > 0.5 ? 1 : 0) - corona) * (1 - Math.exp(-dt * 1.5));
        const fin = Math.min(1, Math.max(0, (enterT - 0.15) / 1.2));
        const c = sky.ctx, w = sky.w, h = sky.h;
        sky.clear();
        // curtains: one ray per column, the lower edge rippling, brightness from the spectrum
        c.globalCompositeOperation = 'lighter';
        const step = low ? 6 : 4, lv = 0.35 + v.level * 0.55;
        for (const rb of ribbons) {
          const amp = rb.amp * Y0, len = rb.len * Y0 * (1 + v.hot * 0.35);
          for (let x = -step; x < w + step; x += step) {
            const u = x / w;
            const yb = Y0 * rb.base + amp * Math.sin(u * R.TAU * rb.f + t * rb.sp * 6 + rb.seed) + amp * 1.2 * (R.noise1(u * 4 + t * 0.12 * Math.sign(rb.sp), rb.seed) - 0.5);
            const e = v.bands[4 + Math.floor(u * 20) % 20];
            let I = (0.2 + 0.8 * R.noise1(u * 6 - t * 0.3, rb.seed + 9)) * (lv + e * 0.6) * rb.a * fin;
            if (sweep >= 0) I *= 1 + 1.6 * Math.exp(-Math.pow((u - (sweep * 1.4 - 0.2)) / 0.12, 2));
            const L = len * (0.55 + 0.6 * R.noise1(u * 5 + t * 0.18, rb.seed + 4)) * (1 + e * 0.35);
            const fl = 0.82 + 0.18 * Math.sin(x * 1.3 + t * 7);
            c.globalAlpha = Math.min(1, I * fl * (1 - v.hot * 0.5));
            c.drawImage(rb.img, x, yb - L, step + 1.5, L * 1.08);
            if (v.hot > 0.05) { c.globalAlpha = Math.min(1, I * fl * v.hot); c.drawImage(RAYH, x, yb - L * 1.1, step + 1.5, L * 1.18); }
          }
        }
        // corona: rays fanning down from overhead
        if (corona > 0.02) {
          const zx = w * 0.5, zy = -Y0 * 0.25;
          for (let i = 0; i < 26; i++) {
            const a = (i / 25 - 0.5) * 2.2 + Math.sin(t * 0.3 + i) * 0.04, L = Y0 * (0.9 + 0.35 * R.noise1(i * 1.7 + t * 0.4, 5));
            c.save(); c.translate(zx, zy); c.rotate(a);
            c.globalAlpha = corona * (0.25 + 0.35 * R.noise1(i * 3.1 - t * 0.8, 6)) * (0.7 + v.level * 0.5);
            c.drawImage(tinted(beam, i % 3 === 0 ? '#ff7ad9' : i % 3 === 1 ? '#a77bff' : '#7dffc8'), -L * 0.05, 0, L * 0.1, L);
            c.restore();
          }
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        // in front, at full resolution: stars, shooting stars, the shore, the lights mirrored in the ice, snowfall
        const g = fg.ctx, W2 = fg.w, H2 = fg.h;
        fg.clear();
        g.fillStyle = '#ffffff';
        for (const [sx, sy, ph, b, big] of stars) { g.globalAlpha = b * (0.5 + 0.5 * Math.sin(t * (0.8 + b) + ph)) * (1 - corona * 0.4) * Math.min(1, enterT); g.fillRect(sx * W2, sy * Y0 * 0.95, big ? 1.8 : 1.1, big ? 1.8 : 1.1); }
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i]; m.life -= dt; if (m.life <= 0) { meteors.splice(i, 1); continue; }
          m.x += m.vx * dt; m.y += m.vy * dt;
          const gr = g.createLinearGradient(m.x, m.y, m.x - m.vx * 0.18, m.y - m.vy * 0.18); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(160,255,230,0)');
          g.globalAlpha = Math.min(1, m.life * 2); g.strokeStyle = gr; g.lineWidth = 1.6; g.beginPath(); g.moveTo(m.x, m.y); g.lineTo(m.x - m.vx * 0.18, m.y - m.vy * 0.18); g.stroke();
        }
        g.globalAlpha = 1;
        g.drawImage(scene, 0, 0, W2, H2);
        const sc = sky.cv, sd = sky.dpr, depth = lakeB - Y0;
        g.globalCompositeOperation = 'lighter';
        const sl = low ? 6 : 3;
        for (let yy = 0; yy < depth; yy += sl) {
          const f = yy / depth, srcY = Y0 - (yy + sl) * 1.1;
          if (srcY < 0) break;
          g.globalAlpha = 0.5 * (1 - f) * fin;
          g.drawImage(sc, 0, srcY * sd, sc.width, sl * 1.1 * sd, Math.sin(t * 1.4 + yy * 0.3) * f * 3, Y0 + 2 + yy, W2, sl);
        }
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = '#e8f6ff';
        for (const f of snow) {
          f.y += (f.sp * dt) / H2; f.x += (Math.sin(t * 0.7 + f.ph) * 6 * dt) / W2;
          if (f.y > 1.02) { f.y = -0.02; f.x = rnd(); }
          g.globalAlpha = 0.35 + f.s * 0.25; g.beginPath(); g.arc(((f.x % 1) + 1) % 1 * W2, f.y * H2, f.s * K, 0, R.TAU); g.fill();
        }
        g.globalAlpha = 1;
        root.style.setProperty('--lv', v.level.toFixed(3));
        root.style.setProperty('--hot', corona.toFixed(3));
      },
    };
  },
});
