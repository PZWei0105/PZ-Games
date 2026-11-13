/* ===================== skin: 果凍小怪 — an original jelly critter that dances; fast songs headbang, slow ones doze ===================== */
R.skins.def({
  id: 'jelly', punch: 0.8, name: '果凍小怪', group: '可愛', en: 'JELLY PAL',
  desc: '原創果凍小怪：快歌甩頭蹦跳、慢歌打瞌睡，戳它會笑',
  theme: { bg: '#ffe8f1', fg: '#5b3a5e', accent: '#ff6fae', accent2: '#7fe0c4', ui: 'rgba(60,34,70,.97)', dock: 'rgba(255,255,255,.55)', dockfg: '#7a4a86' },
  enterMs: 1900,
  emblem: `<svg class="em" viewBox="0 0 116 150"><rect width="116" height="150" fill="#ffe3ef"/><g fill="#fff" opacity=".8"><circle cx="18" cy="22" r="5"/><circle cx="98" cy="40" r="7"/><circle cx="20" cy="118" r="4"/></g><ellipse cx="58" cy="118" rx="44" ry="10" fill="#fff" stroke="#f5b8d2" stroke-width="2"/><path d="M24 112c-2-30 12-56 34-56s36 26 34 56c-20 6-48 6-68 0z" fill="#8ff0cf" stroke="#4fc4a3" stroke-width="2.5"/><ellipse cx="44" cy="74" rx="9" ry="5" fill="#fff" opacity=".7" transform="rotate(-25 44 74)"/><ellipse cx="46" cy="92" rx="5" ry="6.5" fill="#3a2440"/><ellipse cx="70" cy="92" rx="5" ry="6.5" fill="#3a2440"/><circle cx="47.5" cy="90" r="1.8" fill="#fff"/><circle cx="71.5" cy="90" r="1.8" fill="#fff"/><ellipse cx="36" cy="100" rx="5" ry="3" fill="#ff9cc4" opacity=".8"/><ellipse cx="80" cy="100" rx="5" ry="3" fill="#ff9cc4" opacity=".8"/><path d="M53 100q2.5 3 5 0q2.5 3 5 0" fill="none" stroke="#3a2440" stroke-width="2" stroke-linecap="round"/><path d="M58 56c0-8 2-14 6-18" fill="none" stroke="#5fbf6a" stroke-width="3" stroke-linecap="round"/><ellipse cx="70" cy="36" rx="8" ry="4.5" fill="#7ad882" transform="rotate(-20 70 36)"/><ellipse cx="56" cy="38" rx="7" ry="4" fill="#7ad882" transform="rotate(30 56 38)"/></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 900, f2: 1300, dur: 0.07, v: 0.08, type: 'sine' }); },
    tick(s, t) { s.tone(t, { f: 1600, dur: 0.03, v: 0.05 }); },
    toggle(s, t) { s.tone(t, { f: 500, f2: 1400, dur: 0.06, v: 0.1, type: 'sine' }); s.noise(t + 0.03, { f: 2500, dur: 0.03, v: 0.05 }); },
    play(s, t) { s.tone(t, { f: s.hz(84), dur: 0.09, v: 0.1, type: 'triangle' }); s.tone(t + 0.1, { f: s.hz(91), dur: 0.14, v: 0.1, type: 'triangle' }); },
    pause(s, t) { s.tone(t, { f: s.hz(91), dur: 0.09, v: 0.09, type: 'triangle' }); s.tone(t + 0.1, { f: s.hz(84), dur: 0.14, v: 0.09, type: 'triangle' }); },
    next(s, t) { s.tone(t, { f: 480, f2: 1600, dur: 0.28, v: 0.08, type: 'sine', glide: 0.24 }); },
    prev(s, t) { s.tone(t, { f: 1600, f2: 480, dur: 0.28, v: 0.08, type: 'sine', glide: 0.24 }); },
    boing(s, t) { s.tone(t, { f: 620, f2: 180, dur: 0.38, v: 0.12, type: 'sine', glide: 0.3 }); s.tone(t, { f: 660, f2: 200, dur: 0.3, v: 0.05, type: 'triangle', glide: 0.25 }); },
    enter(s, t) { s.tone(t + 0.45, { f: 700, f2: 170, dur: 0.42, v: 0.13, type: 'sine', glide: 0.32 }); s.tone(t + 0.9, { f: s.hz(88), dur: 0.08, v: 0.08, type: 'triangle' }); s.tone(t + 1.0, { f: s.hz(93), dur: 0.12, v: 0.08, type: 'triangle' }); },
    open(s, t) { s.tone(t, { f: 700, f2: 1100, dur: 0.1, v: 0.07 }); s.noise(t + 0.05, { f: 3000, dur: 0.03, v: 0.04 }); },
    close(s, t) { s.tone(t, { f: 1100, f2: 600, dur: 0.1, v: 0.06 }); },
    ok(s, t) { s.notes(t, [s.hz(84), s.hz(88), s.hz(91), s.hz(96)], { dur: 0.1, v: 0.07, type: 'triangle', gap: 0.06 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="jl-cv"></canvas>
      <div class="jl-wrap">
        <div class="jl-head" data-ui>
          <div class="jl-pol"><i class="tape"></i><div class="ph"><img data-bind="cover" alt="" draggable="false"></div></div>
          <div class="jl-tx"><div class="jl-t" data-bind="title"></div><div class="jl-a"><span data-bind="artist"></span></div></div>
        </div>
        <div class="jl-stage" aria-label="果凍小怪（戳戳看）"><div class="jl-bubble" data-jl="say"></div></div>
        <div class="seek jl-seek" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div><div class="seek-times"><span data-bind="time">0:00</span><span data-bind="dur">0:00</span></div></div>
        ${R.ui.ctrl('jl-ctrl')}
      </div>`;
    const cv = api.canvas(root.querySelector('.jl-cv'));
    const stage = root.querySelector('.jl-stage');
    const say = root.querySelector('[data-jl="say"]');
    let G = { x: 0, y: 0, w: 0, h: 0 };
    const measure = () => { const r = stage.getBoundingClientRect(); G = { x: r.left + r.width / 2, bottom: r.bottom, top: r.top, w: r.width, h: r.height }; };
    measure();
    const rnd = R.rng(99);
    const bubbles = []; for (let i = 0; i < 16; i++) bubbles.push({ x: rnd(), y: rnd(), r: 5 + rnd() * 16, s: 0.02 + rnd() * 0.04, p: rnd() * 6 });
    const J = { S: 1, Sv: 0, w2: 0, w2v: 0, w3: 0, w3v: 0, ph: 0, y: -900, vy: 0, ground: false, sway: 0, swayT: 0, sprout: 0, sproutV: 0, blink: 0, nextBlink: 2, look: 0, lookT: 0, jumpCd: 0, asleep: 0, yawn: 0, happy: 0 };
    let col = { base: '#8ff0cf', light: '#c9fff0', dark: '#4fc4a3' };
    const fx = []; let zzT = 0, enterT = 9, sayT = 0;
    const setColor = (t) => {
      const c = api.colors(t); const [h] = R.color.rgbToHsl(...R.color.hexToRgb(c.vibrant));
      const hue = t ? h : 160;
      col = { base: R.color.hsl(hue, 0.78, 0.76), light: R.color.hsl(hue, 0.9, 0.9), dark: R.color.hsl(hue, 0.5, 0.52), cheek: R.color.hsl((hue + 330) % 360, 0.9, 0.78) };
    };
    setColor(api.track());
    const LINES = { hype: ['嗨起來！', '蹦蹦蹦～', '停不下來！'], groove: ['這首好聽', '搖搖搖～', '♪～'], sleepy: ['好想睡…', '呼…', 'zzZ'], idle: ['醒來了嗎？', '放首歌嘛', '…'] };
    const talk = (m) => { const a = LINES[m] || LINES.idle; say.textContent = a[Math.floor(Math.random() * a.length)]; say.classList.remove('on'); void say.offsetWidth; say.classList.add('on'); sayT = 3; };
    api.on('mood', (m) => { talk(m); if (m !== 'idle' && J.asleep > 0.5) { J.vy = -380; J.ground = false; } });
    api.on('track', (t) => { setColor(t); J.Sv -= 3; J.w2v += 3; });
    // it squashes on every beat; when the song is lively it hops on the bar's 1 and 3
    api.beat((s, i) => {
      const m = R.viz.mood;
      if (m === 'hype' && (i.down || i.bpos === 2) && J.ground && J.jumpCd <= 0) { const Rb = size(); J.vy = -(Rb * 3.2 + s * Rb * 2.2); J.ground = false; J.Sv += 2.6; J.jumpCd = 0.18; J.happy = 0.4; }
      else if (m === 'groove' || m === 'hype') { J.Sv -= 2.4 * s; J.w2v += 1.2 * s; }
      else if (m === 'sleepy') { J.Sv -= 0.9 * s; }
      if (i.down && m === 'hype') fx.push({ k: 'star', x: (Math.random() - 0.5) * 2.4, y: -1.2 - Math.random(), life: 0.6, vx: (Math.random() - 0.5) * 60, vy: -60 });
    });
    stage.addEventListener('pointerdown', (e) => {
      J.Sv -= 4; J.w2v += 6; J.w3v -= 4; J.happy = 0.9;
      for (let i = 0; i < 4; i++) fx.push({ k: 'heart', x: (Math.random() - 0.5) * 1.6, y: -1.0, life: 1.1 + Math.random() * 0.4, vx: (Math.random() - 0.5) * 50, vy: -70 - Math.random() * 60 });
      api.sfx('boing');
      say.textContent = ['嘻嘻！', '好癢～', '再戳一次？', '❤'][Math.floor(Math.random() * 4)]; say.classList.remove('on'); void say.offsetWidth; say.classList.add('on'); sayT = 2;
    });
    function size() { return Math.max(40, Math.min(G.w * 0.3, G.h * 0.3, 130)); }
    function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

    return {
      enter() { enterT = 0; J.y = -G.bottom - 200; J.vy = 0; J.ground = false; },
      swap() { if (J.ground) { const Rb = size(); J.vy = -Rb * 4.6; J.ground = false; J.Sv += 3; J.happy = 0.8; } J.asleep = 0; },
      resize() { cv.resize(); measure(); },
      onState(st) { if (st.playing) J.asleep = Math.min(J.asleep, 0.4); },
      frame(dt, t, v) {
        enterT += dt;
        const { ctx, w, h } = cv; cv.clear();
        const Rb = size(), cx = G.x, gZone = Math.max(30, Math.min(54, G.h * 0.16)), gy = G.bottom - gZone - Rb * 0.42;
        const mood = v.mood, bpm = v.bpm || 110;
        // background bubbles
        for (const b of bubbles) {
          b.y -= b.s * dt * (0.7 + v.level * 0.6 + v.pump * 0.9); if (b.y < -0.1) { b.y = 1.1; b.x = Math.random(); }
          const x = b.x * w + Math.sin(t * 0.6 + b.p) * 12, y = b.y * h, r = b.r * (1 + v.high * 0.5);
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x, y, r, 0, R.TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, R.TAU); ctx.fill();
        }
        // physics
        J.jumpCd -= dt;
        const swayAmp = mood === 'hype' ? 0.32 : mood === 'groove' ? 0.22 : mood === 'sleepy' ? 0.12 : 0.05;
        // the sway is locked to the beat: leaning one way on the bar's 1, the other way on its 3
        if (mood === 'idle' || !v.playing) J.swayT += dt * 0.25; else J.swayT = v.beatT * 0.5;
        const swTarget = Math.sin(J.swayT * Math.PI) * swayAmp;
        J.sway += (swTarget - J.sway) * Math.min(1, dt * 5);
        J.Sv += (-(J.S - 1) * 240 - J.Sv * 8.5) * dt; J.S += J.Sv * dt; J.S = Math.max(0.55, Math.min(1.5, J.S));
        J.w2v += (-J.w2 * 320 - J.w2v * 6) * dt; J.w2 += J.w2v * dt * 0.02;
        J.w3v += (-J.w3 * 420 - J.w3v * 7) * dt; J.w3 += J.w3v * dt * 0.02;
        J.ph += dt * 3;
        if (!J.ground) {
          J.vy += 2600 * dt; J.y += J.vy * dt;
          if (J.y >= 0) { const imp = Math.min(6, J.vy / 260); J.y = 0; J.ground = true; J.Sv -= imp; J.w2v += imp * 2.5; J.vy = 0; if (enterT < 2) api.sfx('boing'); }
        }
        J.sproutV += ((-J.sway * 1.6 - J.sprout) * 90 - J.sproutV * 5) * dt - J.Sv * 0.4 * dt * 60 * 0.02; J.sprout += J.sproutV * dt;
        J.asleep = mood === 'idle' ? Math.min(1, J.asleep + dt * 0.5) : Math.max(0, J.asleep - dt * 2);
        J.happy = Math.max(0, J.happy - dt);
        J.nextBlink -= dt; if (J.nextBlink <= 0) { J.blink = 0.14; J.nextBlink = 1.5 + Math.random() * 3.5; }
        J.blink = Math.max(0, J.blink - dt);
        J.lookT -= dt; if (J.lookT <= 0) { J.look = (Math.random() - 0.5) * 2; J.lookT = 1 + Math.random() * 2.5; }
        if (mood === 'sleepy' && Math.random() < dt * 0.08) J.yawn = 1.4;
        J.yawn = Math.max(0, J.yawn - dt);
        // plate
        const pw = Rb * 3.1, ph = Rb * 0.5;
        ctx.fillStyle = 'rgba(120,60,110,.12)'; ctx.beginPath(); ctx.ellipse(cx, gy + ph * 0.55, pw * 0.52, ph * 0.62, 0, 0, R.TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx, gy + ph * 0.2, pw / 2, ph / 2, 0, 0, R.TAU); ctx.fill();
        ctx.strokeStyle = '#f7c3d9'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = 'rgba(247,195,217,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, gy + ph * 0.12, pw * 0.34, ph * 0.28, 0, 0, R.TAU); ctx.stroke();
        // shadow on the plate
        const lift = Math.min(1, -J.y / (Rb * 3));
        ctx.fillStyle = `rgba(80,40,90,${0.18 * (1 - lift * 0.7)})`; ctx.beginPath(); ctx.ellipse(cx, gy + 2, Rb * 1.05 * (1 - lift * 0.4), Rb * 0.16 * (1 - lift * 0.4), 0, 0, R.TAU); ctx.fill();
        // body outline points
        const S = J.S, sx = 1 / Math.sqrt(S), by = gy + J.y - 0.62 * Rb * S;
        const pts = [], N = 36;
        for (let i = 0; i < N; i++) {
          const a = (i / N) * R.TAU;
          let ux = Math.cos(a) * 1.1, uy = Math.sin(a); if (uy > 0) uy *= 0.62;
          const k = 1 + J.w2 * Math.cos(2 * a + J.ph) * 0.12 + J.w3 * Math.cos(3 * a - J.ph * 1.3) * 0.08 + (uy < 0 ? v.bass * 0.03 : 0);
          let x = ux * k * sx * Rb, y = uy * k * S * Rb;
          if (uy < 0) x += J.sway * Rb * (-uy) * 0.55;
          pts.push([cx + x, by + y]);
        }
        const path = () => {
          ctx.beginPath();
          const m0 = [(pts[N - 1][0] + pts[0][0]) / 2, (pts[N - 1][1] + pts[0][1]) / 2]; ctx.moveTo(m0[0], m0[1]);
          for (let i = 0; i < N; i++) { const p = pts[i], q = pts[(i + 1) % N]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
          ctx.closePath();
        };
        const topY = by - Rb * S, topX = cx + J.sway * Rb * 0.55;
        // sprout (behind body top)
        const sa = J.sprout - J.sway * 0.4;
        ctx.save(); ctx.translate(topX, topY + 4); ctx.rotate(sa);
        ctx.strokeStyle = '#5fbf6a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(2, -Rb * 0.2, Rb * 0.08, -Rb * 0.32); ctx.stroke();
        ctx.fillStyle = '#7ad882';
        ctx.save(); ctx.translate(Rb * 0.08, -Rb * 0.32); ctx.rotate(-0.5 + Math.sin(t * 2) * 0.1); ctx.beginPath(); ctx.ellipse(Rb * 0.12, 0, Rb * 0.13, Rb * 0.065, 0, 0, R.TAU); ctx.fill(); ctx.rotate(1.9); ctx.beginPath(); ctx.ellipse(Rb * 0.1, 0, Rb * 0.11, Rb * 0.055, 0, 0, R.TAU); ctx.fill(); ctx.restore();
        ctx.restore();
        // body
        path();
        const g = ctx.createLinearGradient(0, topY, 0, gy);
        g.addColorStop(0, col.light); g.addColorStop(0.55, col.base); g.addColorStop(1, col.dark);
        ctx.globalAlpha = 0.95; ctx.fillStyle = g; ctx.fill(); ctx.globalAlpha = 1;
        ctx.lineWidth = 3; ctx.strokeStyle = R.color.rgba(col.dark, 0.7); ctx.stroke();
        ctx.save(); path(); ctx.clip();
        const rg = ctx.createRadialGradient(cx - Rb * 0.4, topY + Rb * 0.35, 0, cx - Rb * 0.4, topY + Rb * 0.35, Rb * 1.3);
        rg.addColorStop(0, 'rgba(255,255,255,.55)'); rg.addColorStop(0.5, 'rgba(255,255,255,0)'); ctx.fillStyle = rg; ctx.fillRect(cx - Rb * 2, topY - Rb, Rb * 4, Rb * 3);
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(cx + J.sway * Rb * 0.2, by + Rb * 0.55 * S, Rb * 0.7, Rb * 0.12, 0, 0, R.TAU); ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(cx - Rb * 0.5 + J.sway * Rb * 0.35, topY + Rb * 0.38 * S, Rb * 0.2, Rb * 0.09, -0.6, 0, R.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - Rb * 0.25 + J.sway * Rb * 0.4, topY + Rb * 0.22 * S, Rb * 0.04, 0, R.TAU); ctx.fill();
        // face
        const fx0 = cx + J.sway * Rb * 0.3, fy = by + Rb * 0.02 * S;
        const ex = Rb * 0.36, er = Rb * 0.13;
        const sleepy = mood === 'sleepy', zz = J.asleep > 0.6;
        const hap = J.happy > 0 || (!J.ground && mood === 'hype');
        ctx.fillStyle = '#3a2440'; ctx.strokeStyle = '#3a2440'; ctx.lineWidth = Math.max(2.5, Rb * 0.045); ctx.lineCap = 'round';
        for (const sgn of [-1, 1]) {
          const exx = fx0 + sgn * ex, eyy = fy;
          if (zz) { ctx.beginPath(); ctx.arc(exx, eyy - er * 0.2, er * 0.75, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
          else if (hap) { ctx.beginPath(); ctx.moveTo(exx - er * 0.8, eyy + er * 0.25); ctx.lineTo(exx, eyy - er * 0.55); ctx.lineTo(exx + er * 0.8, eyy + er * 0.25); ctx.stroke(); }
          else {
            const bl = J.blink > 0 ? 0.12 : 1;
            ctx.beginPath(); ctx.ellipse(exx + J.look * er * 0.18, eyy, er * 0.82, er * 1.05 * bl, 0, 0, R.TAU); ctx.fill();
            if (bl > 0.5) {
              ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(exx + J.look * er * 0.18 + er * 0.28, eyy - er * 0.38, er * 0.3, 0, R.TAU); ctx.fill();
              ctx.beginPath(); ctx.arc(exx + J.look * er * 0.18 - er * 0.25, eyy + er * 0.4, er * 0.14, 0, R.TAU); ctx.fill(); ctx.fillStyle = '#3a2440';
              if (sleepy) { ctx.fillStyle = col.base; ctx.fillRect(exx - er * 1.2, eyy - er * 1.3, er * 2.4, er * 1.25); ctx.fillStyle = '#3a2440'; ctx.beginPath(); ctx.moveTo(exx - er * 0.9, eyy - er * 0.05); ctx.lineTo(exx + er * 0.9, eyy - er * 0.05); ctx.stroke(); }
            }
          }
        }
        // cheeks
        ctx.fillStyle = R.color.rgba(col.cheek || '#ff9cc4', 0.55 + v.level * 0.3);
        for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fx0 + sgn * Rb * 0.6, fy + Rb * 0.16, Rb * 0.12, Rb * 0.07, 0, 0, R.TAU); ctx.fill(); }
        // mouth
        const my = fy + Rb * 0.2; ctx.fillStyle = '#3a2440';
        if (J.yawn > 0 && !zz) { const o = Math.sin(Math.min(1, J.yawn / 1.4) * Math.PI); ctx.beginPath(); ctx.ellipse(fx0, my + Rb * 0.02, Rb * 0.06, Rb * 0.03 + Rb * 0.07 * o, 0, 0, R.TAU); ctx.fill(); }
        else if (zz) { ctx.beginPath(); ctx.moveTo(fx0 - Rb * 0.05, my); ctx.lineTo(fx0 + Rb * 0.05, my); ctx.stroke(); }
        else if (hap || (mood === 'hype' && v.beat > 0.4)) { ctx.beginPath(); ctx.moveTo(fx0 - Rb * 0.11, my - Rb * 0.02); ctx.quadraticCurveTo(fx0, my + Rb * 0.2, fx0 + Rb * 0.11, my - Rb * 0.02); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ff8fb4'; ctx.beginPath(); ctx.ellipse(fx0, my + Rb * 0.08, Rb * 0.05, Rb * 0.03, 0, 0, R.TAU); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(fx0 - Rb * 0.1, my); ctx.quadraticCurveTo(fx0 - Rb * 0.05, my + Rb * 0.07, fx0, my); ctx.quadraticCurveTo(fx0 + Rb * 0.05, my + Rb * 0.07, fx0 + Rb * 0.1, my); ctx.stroke(); }
        // zzz
        if (zz || sleepy) { zzT -= dt; if (zzT <= 0) { zzT = zz ? 1.1 : 2.2; fx.push({ k: 'z', x: 0.6, y: -1.1, life: 2.2, vx: 18, vy: -30 }); } }
        // effects
        for (let i = fx.length - 1; i >= 0; i--) {
          const f = fx[i]; f.life -= dt; if (f.life <= 0) { fx.splice(i, 1); continue; }
          f.ox = (f.ox || 0) + f.vx * dt; f.oy = (f.oy || 0) + f.vy * dt;
          const px = cx + f.x * Rb + f.ox, py = by + f.y * Rb + f.oy, a = Math.min(1, f.life * 2);
          ctx.globalAlpha = a;
          if (f.k === 'heart') { ctx.fillStyle = '#ff5c9a'; const s = Rb * 0.13; ctx.beginPath(); ctx.moveTo(px, py + s * 0.7); ctx.bezierCurveTo(px - s * 1.4, py - s * 0.3, px - s * 0.5, py - s * 1.2, px, py - s * 0.35); ctx.bezierCurveTo(px + s * 0.5, py - s * 1.2, px + s * 1.4, py - s * 0.3, px, py + s * 0.7); ctx.fill(); }
          else if (f.k === 'z') { ctx.fillStyle = '#7a4a86'; ctx.font = `700 ${Math.round(Rb * (0.22 + (2.2 - f.life) * 0.08))}px Fredoka, sans-serif`; ctx.fillText('z', px, py); }
          else { ctx.fillStyle = '#ffd23f'; const s = Rb * 0.1; ctx.beginPath(); for (let k = 0; k < 10; k++) { const rr2 = k % 2 ? s * 0.45 : s; const an = (k / 10) * R.TAU - Math.PI / 2; ctx.lineTo(px + Math.cos(an) * rr2, py + Math.sin(an) * rr2); } ctx.closePath(); ctx.fill(); }
          ctx.globalAlpha = 1;
        }
        // gummy spectrum under the plate
        const n = 14, gw = Math.min(16, (w - 60) / n * 0.62), gap = (Math.min(w - 40, 520) - n * gw) / (n - 1), x0 = cx - (n * gw + (n - 1) * gap) / 2;
        const gb = gy + ph * 0.78 + 6, maxH = Math.max(14, G.bottom - 4 - gb);
        for (let i = 0; i < n; i++) {
          const b = v.bands[1 + i * 2], hh = 6 + b * maxH;
          ctx.fillStyle = R.color.hsl((i / n) * 300 + 330, 0.85, 0.74);
          rr(ctx, x0 + i * (gw + gap), gb + maxH - hh, gw, hh, gw / 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(ctx, x0 + i * (gw + gap) + gw * 0.22, gb + maxH - hh + 3, gw * 0.24, Math.max(2, hh * 0.4), gw * 0.12); ctx.fill();
        }
        if (sayT > 0) { sayT -= dt; if (sayT <= 0) say.classList.remove('on'); }
        root.style.setProperty('--sw', (J.sway * 10).toFixed(2));
        root.style.setProperty('--bt', v.beat.toFixed(3));
      },
    };
  },
});
