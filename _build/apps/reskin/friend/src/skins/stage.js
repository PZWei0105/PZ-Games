/* ===================== skin: 演唱會舞台 — your song headlines an arena show: moving heads, lasers, haze, a crowd with light sticks; the chorus sets off the pyro ===================== */
R.skins.def({
  id: 'stage', name: '演唱會舞台', group: '酷炫', en: 'LIVE STAGE',
  desc: '追光、雷射、乾冰，台下觀眾揮螢光棒；副歌一到噴火柱',
  bloom: { s: 0.3, th: 0.72 },
  theme: { bg: '#05040b', fg: '#ffffff', accent: '#ff3d6e', accent2: '#ffd23f', ui: 'rgba(16,10,22,.97)', dock: 'rgba(30,20,40,.5)', dockfg: '#ffe9f0' },
  enterMs: 2000, swapMs: 1400, hype: 'lite',
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><linearGradient id="stb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3d6e" stop-opacity=".9"/><stop offset="1" stop-color="#ff3d6e" stop-opacity="0"/></linearGradient><linearGradient id="stc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd23f" stop-opacity=".9"/><stop offset="1" stop-color="#ffd23f" stop-opacity="0"/></linearGradient></defs><rect width="116" height="150" fill="#06040c"/><path d="M24 14L4 120h40z" fill="url(#stb)" opacity=".7"/><path d="M92 14l20 106H72z" fill="url(#stc)" opacity=".7"/><rect x="6" y="10" width="104" height="6" rx="2" fill="#3a3346"/><rect x="26" y="30" width="64" height="40" rx="3" fill="#120c1c" stroke="#ff3d6e" stroke-width="1.5"/><rect x="45" y="36" width="26" height="28" fill="#ff3d6e" opacity=".85"/><path d="M58 78L20 140M58 78l38 62M58 78v62" stroke="#39ff8f" stroke-width="1.2" opacity=".8"/><g fill="#000"><circle cx="14" cy="128" r="7"/><circle cx="34" cy="124" r="7"/><circle cx="56" cy="130" r="7"/><circle cx="78" cy="125" r="7"/><circle cx="100" cy="129" r="7"/><rect x="0" y="134" width="116" height="16"/></g><path d="M40 112l-4-12M92 110l4-12" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 160, f2: 60, dur: 0.09, v: 0.16, type: 'sine' }); s.noise(t, { f: 4000, dur: 0.03, v: 0.04, type: 'highpass' }); },
    tick(s, t) { s.noise(t, { f: 8000, dur: 0.03, v: 0.05, type: 'highpass' }); },
    toggle(s, t) { s.noise(t, { f: 7000, dur: 0.05, v: 0.06, type: 'highpass' }); s.tone(t, { f: 220, f2: 80, dur: 0.1, v: 0.12 }); },
    play(s, t) { s.noise(t, { f: 900, f2: 2600, dur: 0.9, v: 0.08, type: 'bandpass', q: 0.8, a: 0.2 }); s.notes(t + 0.05, [s.hz(60), s.hz(64), s.hz(67), s.hz(72)], { dur: 0.5, v: 0.05, type: 'sawtooth', lp: 1800, gap: 0.001 }); },
    pause(s, t) { s.tone(t, { f: 110, f2: 45, dur: 0.35, v: 0.18, type: 'sine' }); s.noise(t, { f: 600, f2: 200, dur: 0.4, v: 0.05, type: 'lowpass', a: 0.02 }); },
    next(s, t) { [0, 0.09, 0.18].forEach((d, i) => s.tone(t + d, { f: 240 - i * 50, f2: 90 - i * 15, dur: 0.12, v: 0.14 })); s.noise(t + 0.27, { f: 6000, dur: 0.25, v: 0.07, type: 'highpass' }); },
    prev(s, t) { [0, 0.09, 0.18].forEach((d, i) => s.tone(t + d, { f: 140 + i * 50, f2: 70 + i * 15, dur: 0.12, v: 0.14 })); },
    enter(s, t) { s.noise(t, { f: 500, f2: 3000, dur: 1.8, v: 0.11, type: 'bandpass', q: 0.6, a: 0.5 }); s.tone(t + 0.9, { f: 55, dur: 0.6, v: 0.2 }); s.notes(t + 0.95, [s.hz(48), s.hz(55), s.hz(60), s.hz(64)], { dur: 1.2, v: 0.045, type: 'sawtooth', lp: 1400, gap: 0.001 }); },
    open(s, t) { s.noise(t, { f: 3000, f2: 7000, dur: 0.14, v: 0.05, type: 'highpass' }); },
    close(s, t) { s.noise(t, { f: 7000, f2: 3000, dur: 0.14, v: 0.05, type: 'highpass' }); },
    ok(s, t) { s.noise(t, { f: 1200, f2: 2800, dur: 0.5, v: 0.07, type: 'bandpass', a: 0.08 }); s.notes(t, [s.hz(72), s.hz(76), s.hz(79)], { dur: 0.25, v: 0.05, type: 'square', lp: 2400, gap: 0.05 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="st-cv"></canvas>
      <div class="st-wrap">
        <div class="st-wall"><div class="st-screen"><img data-bind="cover" alt="" draggable="false"><div class="st-led"></div><div class="st-next">NEXT SONG ▶▶</div><div class="st-tag"><i></i>LIVE</div></div></div>
        <div class="st-info" data-ui><div class="st-t" data-bind="title"></div><div class="st-a" data-bind="artist"></div></div>
        <div class="st-fill"></div>
        ${R.ui.seek('st-seek')}
        ${R.ui.ctrl('st-ctrl')}
      </div>`;
    const cv = api.canvas(root.querySelector('.st-cv'), { dprMax: 1.5, alpha: false });
    const wallEl = root.querySelector('.st-wall'), infoEl = root.querySelector('.st-info');
    let Wl = { x: 0, y: 0, w: 100, h: 60 }, lipY = 300, bandS = 0, infoB = 0;
    // layout boxes (offset*), not transformed ones: the wall is mid-animation while the skin enters
    const measure = () => {
      Wl = { x: wallEl.offsetLeft, y: wallEl.offsetTop, w: wallEl.offsetWidth, h: wallEl.offsetHeight };
      const under = infoEl.offsetLeft < Wl.x + Wl.w && infoEl.offsetLeft + infoEl.offsetWidth > Wl.x;   // title under the wall, not beside it
      infoB = under ? infoEl.offsetTop + infoEl.offsetHeight : Wl.y + Wl.h;
      lipY = Math.min(cv.h - 40, Math.max(infoB + 14, Math.round(cv.h * (under ? 0.7 : 0.82))));
      bandS = Math.min(cv.h * 0.2, (lipY - infoB) * 0.62);   // the band only plays where there's room for it (tall screens)
      if (bandS < 80) bandS = 0;
    };
    const rnd = R.rng(31);
    const low = api.low();
    // the crowd: packed rows from the stage lip to the bottom edge; some wave light sticks, some film
    let crowd = [], nRows = 0;
    function people() {
      const { w, h } = cv; crowd = [];
      const k = Math.max(0.7, Math.min(1.15, Math.sqrt(w * h) / 700));
      const top = lipY + 22 * k;
      nRows = h - top > 260 * k ? 4 : 3;
      for (let r = 0; r < nRows; r++) {
        const f = r / (nRows - 1), sc = (0.72 + f * 0.95) * k, hr = 11 * sc;
        const base = top + hr * 2.6 + (h + hr * 0.6 - top - hr * 2.6) * f, gap = 30 * sc, n = Math.ceil(w / gap) + 2, off = rnd() * gap;
        for (let i = 0; i < n; i++) {
          const q = rnd();
          crowd.push({ x: off + (i - 1 + (rnd() - 0.5) * 0.5) * gap, base: base + (rnd() - 0.5) * 8 * sc, sc: sc * (0.88 + rnd() * 0.24), ph: rnd() * 6.3, r,
            stick: q < 0.3, phone: q > 0.92, hands: q >= 0.3 && q < 0.55, hue: rnd() < 0.5 ? 0 : 1, arm: rnd() < 0.5 ? -1 : 1, jump: 0, jv: 0 });
        }
      }
    }
    measure(); people();
    api.later(() => { const e = lipY; measure(); if (Math.abs(lipY - e) > 4) people(); }, 700);   // late fonts can move the title
    const beamSprite = (() => {
      const c = document.createElement('canvas'); c.width = 96; c.height = 512; const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(44, 0); x.lineTo(52, 0); x.lineTo(96, 512); x.lineTo(0, 512); x.closePath(); x.fill();
      return c;
    })();
    const tint = new Map();
    const beamOf = (col) => {
      if (tint.has(col)) return tint.get(col);
      const c = document.createElement('canvas'); c.width = beamSprite.width; c.height = beamSprite.height; const x = c.getContext('2d');
      x.drawImage(beamSprite, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
      tint.set(col, c); if (tint.size > 10) tint.delete(tint.keys().next().value); return c;
    };
    let pal = ['#ff3d6e', '#ffd23f', '#ffffff', '#7a5cff'];
    const setPal = (tk) => { const c = api.colors(tk); pal = ['#ff3d6e', '#ffd23f', c.vibrant, '#ffffff', '#7a5cff']; };
    setPal(api.track());
    const heads = []; for (let i = 0; i < 6; i++) heads.push({ ph: i * 1.3, inten: 0.4 });
    const fire = [];
    let colShift = 0, strobe = 0, enterT = 9, black = 0, shake = 0, hitL = 0, hitR = 0, strum = 0;
    function jet(x, n, big) {
      for (let i = 0; i < n; i++) fire.push({ x: x + (rnd() - 0.5) * 8, y: lipY, vx: (rnd() - 0.5) * 34, vy: -(cv.h * (big ? 0.95 : 0.72)) * (0.6 + rnd() * 0.5), life: 0.5 + rnd() * 0.5, s: 16 + rnd() * 26 });
      if (fire.length > 700) fire.splice(0, fire.length - 700);
    }
    const pyro = (big) => { [0.06, 0.28, 0.72, 0.94].forEach((f, i) => api.later(() => jet(cv.w * f, low ? 18 : 34, big), i * 60)); shake = 1; };
    // a jump is about a head and a half high, whatever the row: v = sqrt(2 g h)
    const hop = (p, k) => { p.jv = -Math.sqrt(1800 * 11 * p.sc * k); };
    const jumpAll = (pow) => { for (const p of crowd) if (rnd() < 0.85) hop(p, (0.8 + rnd() * 0.7) * pow); };
    api.on('hot', (on) => { if (on) { pyro(true); strobe = api.flash() ? 0.6 : 0; jumpAll(1); } });
    let barN = 0;
    api.beat((s, i) => {
      for (const hd of heads) hd.inten = Math.min(1.4, hd.inten + s * (i.down ? 1.2 : 0.8));
      // the light desk changes colour every two bars, on the bar's first beat
      if (i.down && ++barN % 2 === 0) colShift++;
      if (i.bpos % 2) hitL = s; else hitR = s;
      strum = 1;
      if ((R.viz.mood === 'hype' || R.viz.hot > 0.5) && s > 0.5) for (const p of crowd) if (rnd() < (i.down ? 0.7 : 0.4) && !p.jump) hop(p, 0.3 + s * 0.6);
      if (R.viz.hot > 0.6 && (i.down || i.bpos === 2)) { jet(cv.w * (i.down ? 0.28 : 0.72), low ? 10 : 20, false); if (api.flash() && i.down) strobe = Math.max(strobe, 0.35); }
    });
    // ---- the band: thick round-capped strokes read as backlit silhouettes ----
    const seg = (ctx, pts, wd) => { ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
    const arm = (ctx, x1, y1, x2, y2, wd, bend) => { const dx = x2 - x1, dy = y2 - y1; seg(ctx, [x1, y1, (x1 + x2) / 2 - dy * bend, (y1 + y2) / 2 + dx * bend, x2, y2], wd); };
    // standing figure, feet at (x, fy), height s; o.hands(sx, shY, hipY) gives [lx, ly, rx, ry]; o.prop draws an instrument between body and arms
    function person(ctx, x, fy, s, o) {
      const hipY = fy - s * 0.47 + o.bob * 0.4, shY = fy - s * 0.8 + o.bob, sx = x + o.lean * s * 0.3, st = o.stance || 0;
      seg(ctx, [x - s * 0.035, hipY, x - s * (0.07 + st), fy - s * 0.24, x - s * (0.08 + st), fy], s * 0.095);
      seg(ctx, [x + s * 0.035, hipY, x + s * (0.07 + st), fy - s * 0.24, x + s * (0.08 + st), fy], s * 0.095);
      seg(ctx, [x, hipY, sx, shY + s * 0.04], s * 0.2);
      ctx.beginPath(); ctx.arc(sx + o.lean * s * 0.07, shY - s * 0.115, s * 0.082, 0, R.TAU); ctx.fill();
      if (o.prop) o.prop(sx, shY, hipY);
      const hd = o.hands(sx, shY, hipY);
      arm(ctx, sx - s * 0.075, shY + s * 0.02, hd[0], hd[1], s * 0.062, 0.16);
      arm(ctx, sx + s * 0.075, shY + s * 0.02, hd[2], hd[3], s * 0.062, -0.16);
    }
    function guitar(ctx, x, y, s, ang, neck) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.12, s * 0.085, 0, 0, R.TAU); ctx.ellipse(s * 0.075, 0, s * 0.07, s * 0.06, 0, 0, R.TAU); ctx.fill();
      ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-neck * s, 0); ctx.stroke();
      ctx.fillRect(-neck * s - s * 0.07, -s * 0.024, s * 0.08, s * 0.048);
      ctx.restore();
      const c = Math.cos(ang), si = Math.sin(ang);
      return (f) => [x - neck * s * f * c, y - neck * s * f * si];   // a point along the neck
    }
    function drummer(ctx, x, ry, s, v) {
      const hipY = ry - s * 0.27, shY = hipY - s * 0.33, bob = -Math.abs(Math.sin(((v.t * (v.bpm || 118)) / 60) * Math.PI)) * s * 0.015;
      seg(ctx, [x, hipY, x, shY + bob + s * 0.04], s * 0.2);
      ctx.beginPath(); ctx.arc(x, shY + bob - s * 0.115, s * 0.082, 0, R.TAU); ctx.fill();
      // kit in front of him
      ctx.beginPath(); ctx.arc(x, ry - s * 0.15, s * 0.15, 0, R.TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x - s * 0.2, ry - s * 0.33, s * 0.1, s * 0.05, 0.2, 0, R.TAU); ctx.ellipse(x + s * 0.2, ry - s * 0.33, s * 0.1, s * 0.05, -0.2, 0, R.TAU); ctx.fill();
      ctx.lineWidth = s * 0.018;
      ctx.beginPath(); ctx.moveTo(x - s * 0.42, ry); ctx.lineTo(x - s * 0.42, ry - s * 0.52); ctx.moveTo(x + s * 0.44, ry); ctx.lineTo(x + s * 0.44, ry - s * 0.46); ctx.stroke();
      ctx.save(); ctx.translate(x - s * 0.42, ry - s * 0.53 + hitL * s * 0.02); ctx.rotate(-0.12 - hitL * 0.12); ctx.fillRect(-s * 0.15, -s * 0.012, s * 0.3, s * 0.024); ctx.restore();
      ctx.save(); ctx.translate(x + s * 0.44, ry - s * 0.47 + hitR * s * 0.02); ctx.rotate(0.12 + hitR * 0.12); ctx.fillRect(-s * 0.15, -s * 0.012, s * 0.3, s * 0.024); ctx.restore();
      const lh = [x - s * 0.24, shY + s * 0.2 - (1 - hitL) * s * 0.1], rh = [x + s * 0.24, shY + s * 0.2 - (1 - hitR) * s * 0.1];
      arm(ctx, x - s * 0.075, shY + bob + s * 0.02, lh[0], lh[1], s * 0.062, 0.2);
      arm(ctx, x + s * 0.075, shY + bob + s * 0.02, rh[0], rh[1], s * 0.062, -0.2);
      seg(ctx, [lh[0], lh[1], lh[0] - s * 0.12, lh[1] + s * (0.02 + hitL * 0.1)], s * 0.018);
      seg(ctx, [rh[0], rh[1], rh[0] + s * 0.12, rh[1] + s * (0.02 + hitR * 0.1)], s * 0.018);
    }
    function band(ctx, w, t, v, lit, wash) {
      const s = bandS, fy = lipY - 3, cx = w / 2, spread = Math.min(w * 0.31, s * 1.15);
      const bl = 60 / (v.bpm || 118), ph = (v.t / bl) % 1, bob = -Math.abs(Math.sin(ph * Math.PI)) * s * 0.025 * (v.playing ? 1 : 0.2);
      const withDrums = w > s * 3.6, ry = fy - s * 0.3, dx = withDrums ? cx : 0;
      // backlight: a soft glow behind each player, and a follow spot on the singer
      ctx.globalCompositeOperation = 'lighter';
      const bk = (0.3 + v.level * 0.35 + v.hot * 0.2) * lit;
      for (const [x, k] of [[cx - spread, 0], [cx, 1], [cx + spread, 2]]) { ctx.globalAlpha = bk; ctx.drawImage(api.glow(pal[(colShift + k + 1) % pal.length], 64), x - s * 0.7, fy - s * 1.25, s * 1.4, s * 1.3); }
      ctx.globalAlpha = (0.22 + v.hot * 0.3 + v.beat * 0.1) * lit;
      ctx.drawImage(beamOf('#ffffff'), cx - s * 0.5, 0, s, fy + s * 0.05);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = ctx.strokeStyle = '#050309'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (withDrums) {
        ctx.fillRect(cx - s * 0.62, ry, s * 1.24, fy - ry);
        drummer(ctx, dx, ry, s * 0.86, v);
        // keep the singer readable in front of the kit
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = bk * 0.8; ctx.drawImage(api.glow(wash, 64), cx - s * 0.45, fy - s * 1.05, s * 0.9, s * 1.05); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = ctx.strokeStyle = '#050309';
      }
      // guitarist (left): leans back on the big hits
      person(ctx, cx - spread, fy, s * 0.96, { lean: -0.06 - v.beat * 0.12, bob, stance: 0.04,
        prop: (sx, shY, hipY) => { const g = guitar(ctx, sx + s * 0.07, hipY - s * 0.02, s * 0.96, 0.5, 0.42); this_g = g; },
        hands: (sx, shY, hipY) => { const n = this_g(0.72); return [n[0], n[1], sx + s * 0.1, hipY - s * 0.02 + strum * s * 0.05]; } });
      // bassist (right): bobs along
      person(ctx, cx + spread, fy, s * 0.98, { lean: 0.04, bob: bob * 1.4, stance: 0.05,
        prop: (sx, shY, hipY) => { this_g = guitar(ctx, sx + s * 0.06, hipY - s * 0.01, s * 0.98, 0.42, 0.5); },
        hands: (sx, shY, hipY) => { const n = this_g(0.7); return [n[0], n[1], sx + s * 0.09, hipY + s * 0.01 + strum * s * 0.03]; } });
      // singer at the mic; fist up in the chorus
      const pump = v.hot > 0.4;
      seg(ctx, [cx + s * 0.17, fy, cx + s * 0.11, fy - s * 0.82], s * 0.018);
      ctx.beginPath(); ctx.ellipse(cx + s * 0.105, fy - s * 0.84, s * 0.026, s * 0.04, -0.4, 0, R.TAU); ctx.fill();
      person(ctx, cx, fy, s, { lean: 0.05 + bob / s * 2, bob, stance: 0.02,
        hands: (sx, shY) => pump ? [sx - s * 0.3, shY - s * 0.36 - v.beat * s * 0.08, cx + s * 0.1, fy - s * 0.8] : [sx + s * 0.07, shY + s * 0.12, cx + s * 0.1, fy - s * 0.8] });
    }
    let this_g = () => [0, 0];
    const rowCol = [];
    return {
      enter() { enterT = 0; },
      swap() { black = 1; jumpAll(0.8); },
      onTrack(tk) { setPal(tk); },
      resize() { cv.resize(); measure(); people(); },
      frame(dt, t, v) {
        const { ctx, w, h } = cv;
        enterT += dt;
        const lightsOn = Math.min(1, Math.max(0, (enterT - 0.4) / 0.9));
        black = Math.max(0, black - dt * 1.6);
        const lit = lightsOn * (1 - black * 0.85);
        shake *= Math.exp(-dt * 6);
        hitL *= Math.exp(-dt * 10); hitR *= Math.exp(-dt * 10); strum *= Math.exp(-dt * 14);
        const wash = pal[colShift % pal.length];
        const { x: wx, y: wy, w: ww, h: wh } = Wl;
        ctx.save();
        if (shake > 0.02) ctx.translate((rnd() - 0.5) * 6 * shake, (rnd() - 0.5) * 6 * shake);
        // arena, stage deck, wall frame
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#0a0614'); bg.addColorStop(0.55, '#07040d'); bg.addColorStop(1, '#030206');
        ctx.fillStyle = bg; ctx.fillRect(-10, -10, w + 20, h + 20);
        const deckTop = wy + wh + 6;
        if (lipY > deckTop) {
          const fg = ctx.createLinearGradient(0, deckTop, 0, lipY);
          fg.addColorStop(0, '#0e0915'); fg.addColorStop(1, '#1c1325');
          ctx.fillStyle = fg; ctx.fillRect(-10, deckTop, w + 20, lipY - deckTop);
        }
        ctx.fillStyle = '#0c0812'; ctx.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
        ctx.globalCompositeOperation = 'lighter';
        // haze glow behind the wall
        const hz = Math.max(w, ww) * 1.4;
        ctx.globalAlpha = (0.12 + v.level * 0.18) * lit;
        ctx.drawImage(api.glow(wash, 64), w / 2 - hz / 2, wy + wh / 2 - hz / 2, hz, hz);
        // moving heads hanging from the truss
        const trussY = Math.max(6, wy - 30), L = h * 1.15;
        for (let i = 0; i < heads.length; i++) {
          const hd = heads[i];
          hd.inten += (0.35 - hd.inten) * (1 - Math.exp(-dt * 2.5));
          const x0 = w * (0.08 + (i / (heads.length - 1)) * 0.84);
          // the heads swing on the beat: a quick move on each beat, held until the next
          const bp = v.playing ? v.stepT * Math.PI * 0.5 : t * 0.6;
          const ang = Math.sin(bp + hd.ph) * 0.55 + (i < 3 ? 0.18 : -0.18);
          ctx.save(); ctx.translate(x0, trussY); ctx.rotate(ang);
          ctx.globalAlpha = Math.min(1, 0.18 + hd.inten * 0.32 + v.hot * 0.25) * lit;
          ctx.drawImage(beamOf(pal[(colShift + i) % pal.length]), -L * 0.11, 0, L * 0.22, L);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        // lasers when it gets loud, fanned from the back of the stage
        const las = Math.max(v.hot, Math.min(1, Math.max(0, (v.level - 0.55) * 3))) * lit;
        if (las > 0.02) {
          const ox = w / 2, oy = deckTop + 4;
          ctx.lineWidth = 1.6;
          for (let i = 0; i < 9; i++) {
            const a = Math.PI / 2 + Math.sin((v.playing ? v.stepT * Math.PI * 0.5 : t * 1.3) + i * 0.7) * 0.9 + (i - 4) * 0.12;
            ctx.strokeStyle = i % 2 ? `rgba(57,255,143,${0.55 * las})` : `rgba(80,220,255,${0.5 * las})`;
            ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a) * h * 1.5, oy + Math.abs(Math.sin(a)) * h * 1.2 * (i % 3 === 0 ? 0.6 : -1)); ctx.stroke();
          }
          ctx.globalAlpha = las * 0.8; ctx.drawImage(api.glow('#39ff8f', 32), ox - 26, oy - 26, 52, 52); ctx.globalAlpha = 1;
        }
        ctx.globalCompositeOperation = 'source-over';
        // truss + fixtures
        ctx.fillStyle = '#26202f'; ctx.fillRect(0, trussY - 7, w, 9);
        ctx.strokeStyle = '#3b3346'; ctx.lineWidth = 1.2; ctx.beginPath();
        for (let x = 0; x < w; x += 16) { ctx.moveTo(x, trussY - 7); ctx.lineTo(x + 8, trussY + 2); ctx.lineTo(x + 16, trussY - 7); }
        ctx.stroke();
        for (let i = 0; i < heads.length; i++) { const x0 = w * (0.08 + (i / (heads.length - 1)) * 0.84); ctx.fillStyle = '#15111b'; ctx.fillRect(x0 - 7, trussY, 14, 10); ctx.fillStyle = R.color.rgba(pal[(colShift + i) % pal.length], 0.5 + Math.min(0.5, heads[i].inten * 0.4)); ctx.fillRect(x0 - 4, trussY + 8, 8, 3); }
        // LED wall: the cover sits in a DOM image on top, the spectrum columns either side are drawn here
        const n = 14, cw = ww * 0.24, gap = cw / n;
        ctx.globalCompositeOperation = 'lighter';
        for (let side = 0; side < 2; side++) {
          for (let i = 0; i < n; i++) {
            const cells = Math.round(v.bands[Math.min(31, 2 + i * 2)] * lit * 12), col = R.color.rgba(pal[(colShift + i + side) % pal.length], 0.85);
            const x = side ? wx + ww - cw + i * gap : wx + i * gap;
            for (let j = 0; j < 12; j++) {
              ctx.fillStyle = j < cells ? col : 'rgba(255,255,255,.04)';
              ctx.fillRect(x + 1, wy + wh - (j + 1) * (wh / 12) + 1, gap - 2, wh / 12 - 2);
            }
          }
        }
        ctx.globalCompositeOperation = 'source-over';
        if (bandS) band(ctx, w, t, v, lit, wash);
        // the stage lip and its footlights
        ctx.fillStyle = '#2a1f35'; ctx.fillRect(-10, lipY - 2, w + 20, 3);
        ctx.globalCompositeOperation = 'lighter';
        const nf = Math.max(10, Math.round(w / 44));
        for (let i = 0; i < nf; i++) {
          const x = (i + 0.5) * (w / nf), on = 0.25 + v.bands[(i * 3) % 32] * 0.75;
          ctx.globalAlpha = on * lit; ctx.drawImage(api.glow(pal[(colShift + (i >> 2)) % pal.length], 32), x - 9, lipY - 10, 18, 18);
        }
        // haze drifting over the lip
        for (let i = 0; i < 6; i++) {
          const x = ((t * (8 + i * 3) + i * 140) % (w + 300)) - 150, s = 180 + i * 30;
          ctx.globalAlpha = (0.05 + v.level * 0.06) * lit; ctx.drawImage(api.glow('#d8d0ff', 64), x - s / 2, lipY - s * 0.4, s, s * 0.6);
        }
        // pyro columns
        for (let i = fire.length - 1; i >= 0; i--) {
          const p = fire[i]; p.life -= dt; if (p.life <= 0) { fire.splice(i, 1); continue; }
          p.vy += h * 0.9 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          ctx.globalAlpha = Math.min(1, p.life * 1.6);
          ctx.drawImage(api.glow(p.life > 0.45 ? '#ffd46b' : '#ff6a2b', 32), p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        // crowd: the back row catches a little of the stage wash, the front is black
        for (let r = 0; r < nRows; r++) rowCol[r] = R.color.mix(R.color.mix(wash, '#0b0812', 0.86), '#020103', nRows > 1 ? r / (nRows - 1) : 1);
        const bl = 60 / (v.bpm || 118), ph = (v.t / bl) % 1, bob = Math.abs(Math.sin(ph * Math.PI)) * (v.playing ? 1 : 0.15);
        const handsUp = Math.max(v.hot, R.viz.mood === 'hype' ? 0.6 : 0);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const p of crowd) {
          p.jv += 900 * dt; p.jump = Math.min(0, p.jump + p.jv * dt); if (p.jump >= 0) { p.jump = 0; p.jv = 0; }
          const hr = 11 * p.sc, x = p.x, y = p.base + p.jump - bob * 6 * p.sc * (0.4 + v.level);
          const body = rowCol[p.r];
          ctx.fillStyle = body;
          ctx.beginPath();
          ctx.arc(x, y - hr * 2.5, hr, 0, R.TAU);
          ctx.moveTo(x - hr * 2, h + 10);
          ctx.lineTo(x - hr * 2, y - hr * 0.5);
          ctx.quadraticCurveTo(x - hr * 2, y - hr * 1.45, x - hr, y - hr * 1.45);
          ctx.lineTo(x + hr, y - hr * 1.45);
          ctx.quadraticCurveTo(x + hr * 2, y - hr * 1.45, x + hr * 2, y - hr * 0.5);
          ctx.lineTo(x + hr * 2, h + 10);
          ctx.closePath(); ctx.fill();
          const sway = Math.sin(v.t * Math.PI / bl + p.ph) * 0.5 * (v.playing ? 1 : 0.2);
          ctx.strokeStyle = body; ctx.lineWidth = hr * 0.55;
          if (p.hands && handsUp > 0.3) {
            const up = hr * (3.6 + 1.2 * handsUp), wav = sway * hr * 1.4;
            ctx.beginPath(); ctx.moveTo(x - hr * 1.4, y - hr * 1.2); ctx.lineTo(x - hr * 2.2 + wav, y - up); ctx.moveTo(x + hr * 1.4, y - hr * 1.2); ctx.lineTo(x + hr * 2.2 + wav, y - up); ctx.stroke();
          }
          if (p.stick || p.phone) {
            const hx = x + p.arm * hr * 1.4 + sway * hr * 1.6, hy = y - hr * 5;
            ctx.beginPath(); ctx.moveTo(x + p.arm * hr * 1.2, y - hr); ctx.lineTo(hx, hy); ctx.stroke();
            ctx.globalCompositeOperation = 'lighter';
            if (p.stick) {
              const col = pal[p.hue], a = (0.6 + v.level * 0.4) * lit;
              ctx.strokeStyle = R.color.rgba(col, a); ctx.lineWidth = 3.2 * p.sc;
              ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + sway * 10 * p.sc, hy - 22 * p.sc); ctx.stroke();
              ctx.globalAlpha = a * 0.6; ctx.drawImage(api.glow(col, 32), hx - 18 * p.sc, hy - 30 * p.sc, 36 * p.sc, 36 * p.sc);
            } else {
              ctx.globalAlpha = (0.5 + 0.5 * Math.sin(t * 3 + p.ph)) * (1 - v.level * 0.6) * lit; ctx.drawImage(api.glow('#ffffff', 32), hx - 9 * p.sc, hy - 12 * p.sc, 18 * p.sc, 18 * p.sc);
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
          }
        }
        // strobe, and the house lights still down while the skin enters
        strobe *= Math.exp(-dt * 9);
        if (strobe > 0.01) { ctx.fillStyle = `rgba(255,255,255,${strobe})`; ctx.fillRect(-10, -10, w + 20, h + 20); }
        if (lightsOn < 1) { ctx.fillStyle = `rgba(0,0,0,${0.85 * (1 - lightsOn)})`; ctx.fillRect(-10, -10, w + 20, h + 20); }
        ctx.restore();
        root.style.setProperty('--lv', v.level.toFixed(3));
        root.style.setProperty('--bt', v.beat.toFixed(3));
        root.style.setProperty('--hot', v.hot.toFixed(3));
      },
    };
  },
});
