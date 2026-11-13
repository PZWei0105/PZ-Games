/* ===================== skin: 扭蛋機 — every song is a capsule; turn the crank for the next one ===================== */
R.skins.def({
  id: 'gacha', name: '扭蛋機', group: '可愛', en: 'SONG GACHA',
  desc: '每首歌都是一顆扭蛋，轉一下把手就換下一首',
  theme: { bg: '#ffe9b8', fg: '#4a1d1f', accent: '#ff3b4a', accent2: '#2fc4b2', ui: 'rgba(70,24,30,.97)', dock: 'rgba(255,255,255,.6)', dockfg: '#c4232f' },
  enterMs: 1600,
  emblem: `<svg class="em" viewBox="0 0 116 150"><rect width="116" height="150" fill="#ffd970"/><g opacity=".35" fill="#fff"><path d="M58 70L0 30V0h20zM58 70L60 0h30zM58 70L116 20v30zM58 70L116 110v30zM58 70L40 150H10zM58 70L0 110V80z"/></g><rect x="26" y="10" width="64" height="16" rx="6" fill="#e8323f" stroke="#fff3dc" stroke-width="2"/><g fill="#fff6c8"><circle cx="34" cy="18" r="2"/><circle cx="46" cy="18" r="2"/><circle cx="58" cy="18" r="2"/><circle cx="70" cy="18" r="2"/><circle cx="82" cy="18" r="2"/></g><circle cx="58" cy="58" r="30" fill="#e9fbff" fill-opacity=".55" stroke="#fff" stroke-width="3"/><g><circle cx="46" cy="68" r="8" fill="#ff7aa8"/><circle cx="64" cy="72" r="8" fill="#2fc4b2"/><circle cx="56" cy="54" r="8" fill="#ffc31f"/><circle cx="70" cy="56" r="7" fill="#7a6bff"/><circle cx="44" cy="52" r="6" fill="#ff8a3d"/></g><path d="M30 86h56l6 50H24z" fill="#e8323f" stroke="#7a1218" stroke-width="2"/><circle cx="58" cy="104" r="9" fill="#d9dde3" stroke="#5c6670" stroke-width="2"/><rect x="54" y="92" width="8" height="24" rx="3" fill="#f2f4f7" stroke="#5c6670" stroke-width="1.5"/><rect x="44" y="120" width="28" height="12" rx="5" fill="#3a1416"/></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 1250, dur: 0.05, v: 0.08, type: 'square', lp: 3500 }); },
    tick(s, t) { s.noise(t, { f: 3000, dur: 0.02, v: 0.07, q: 3 }); },
    toggle(s, t) { s.tone(t, { f: 900, dur: 0.05, v: 0.08, type: 'square', lp: 3000 }); s.tone(t + 0.06, { f: 1350, dur: 0.06, v: 0.08, type: 'square', lp: 3000 }); },
    play(s, t) { s.notes(t, [s.hz(72), s.hz(76), s.hz(79), s.hz(84)], { dur: 0.1, v: 0.08, type: 'square', gap: 0.07, lp: 4000 }); },
    pause(s, t) { s.notes(t, [s.hz(79), s.hz(72)], { dur: 0.12, v: 0.08, type: 'square', gap: 0.08, lp: 3500 }); },
    ratchet(s, t) { for (let i = 0; i < 6; i++) s.noise(t + i * 0.07, { f: 2400 + i * 120, dur: 0.025, v: 0.12, q: 4 }); },
    next(s, t) { for (let i = 0; i < 6; i++) s.noise(t + i * 0.07, { f: 2400 + i * 120, dur: 0.025, v: 0.12, q: 4 }); s.tone(t + 0.5, { f: 300, f2: 120, dur: 0.12, v: 0.12, type: 'sine' }); s.tone(t + 0.75, { f: 1100, f2: 1600, dur: 0.08, v: 0.08 }); s.noise(t + 0.75, { f: 3500, dur: 0.05, v: 0.08 }); },
    prev(s, t) { for (let i = 0; i < 4; i++) s.noise(t + i * 0.07, { f: 3000 - i * 150, dur: 0.025, v: 0.1, q: 4 }); s.tone(t + 0.35, { f: 1100, f2: 1600, dur: 0.08, v: 0.07 }); },
    enter(s, t) { s.tone(t, { f: s.hz(84), dur: 0.05, v: 0.06, type: 'sine' }); s.tone(t + 0.05, { f: s.hz(91), dur: 0.05, v: 0.06 }); s.tone(t + 0.1, { f: s.hz(96), dur: 0.3, v: 0.06 }); for (let i = 0; i < 8; i++) s.tone(t + 0.4 + i * 0.05, { f: 600 + i * 90, dur: 0.05, v: 0.04, type: 'square', lp: 3000 }); },
    open(s, t) { s.tone(t, { f: 900, f2: 1400, dur: 0.08, v: 0.07, type: 'square', lp: 3000 }); },
    close(s, t) { s.tone(t, { f: 1400, f2: 900, dur: 0.08, v: 0.07, type: 'square', lp: 3000 }); },
    ok(s, t) { s.notes(t, [s.hz(79), s.hz(84), s.hz(88), s.hz(91)], { dur: 0.1, v: 0.08, type: 'square', gap: 0.06, lp: 4000 }); },
  },
  mount(root, api) {
    root.innerHTML = `<div class="gc-sun"></div><canvas class="gc-cv"></canvas>
      <div class="gc-wrap">
        <div class="gc-machine">
          <button type="button" class="gc-crank" aria-label="轉把手換下一首"><i></i></button>
          <div class="gc-cap"><div class="gc-art"><img data-bind="cover" alt="" draggable="false"></div><i class="gc-top"></i></div>
        </div>
        <div class="gc-ticket" data-ui><span class="no">No.<b data-bind="idx">00/00</b></span><div class="gc-t" data-bind="title"></div><div class="gc-a" data-bind="artist"></div></div>
        <div class="seek gc-seek" data-seek data-ui><div class="seek-track" data-seek-track><div class="seek-fill" data-seek-fill></div><div class="seek-knob" data-seek-knob></div></div><div class="seek-times"><span data-bind="time">0:00</span><span data-bind="dur">0:00</span></div></div>
        ${R.ui.ctrl('gc-ctrl')}
      </div>`;
    const cv = api.canvas(root.querySelector('.gc-cv'));
    const mach = root.querySelector('.gc-machine'), crank = root.querySelector('.gc-crank'), cap = root.querySelector('.gc-cap');
    let M = null;
    const layout = () => {
      const r = mach.getBoundingClientRect();
      const W = Math.min(r.width, r.height * 0.74, 420), H = Math.min(r.height, W * 1.36);
      const x0 = r.left + (r.width - W) / 2, y0 = r.top + (r.height - H) / 2;
      const domeR = Math.min(W * 0.4, H * 0.27);
      const dome = { x: x0 + W / 2, y: y0 + H * 0.15 + domeR + 6, r: domeR };
      const body = { x: x0 + W * 0.12, y: dome.y + domeR * 0.78, w: W * 0.76, h: y0 + H - (dome.y + domeR * 0.78) };
      M = { x0, y0, W, H, dome, body };
      const ck = Math.min(body.h * 0.42, W * 0.22);
      Object.assign(crank.style, { left: (dome.x - r.left - ck / 2) + 'px', top: (body.y - r.top + body.h * 0.12) + 'px', width: ck + 'px', height: ck + 'px' });
      const cp = Math.min(body.h * 0.36, W * 0.2);
      Object.assign(cap.style, { left: (dome.x - r.left - cp / 2 + W * 0.22) + 'px', top: (body.y - r.top + body.h - cp - body.h * 0.08) + 'px', width: cp + 'px', height: cp + 'px' });
    };
    layout();
    const caps = [];
    const capColor = (t, i) => { if (t) return api.colors(t).vibrant; return R.color.hsl((i * 47) % 360, 0.8, 0.62); };
    function fill() {
      const q = R.player.queue().slice(0, 16).map(R.lib.get).filter(Boolean);
      const n = Math.max(9, Math.min(16, q.length || 9));
      while (caps.length < n) { const a = Math.random() * R.TAU, d = Math.random() * 0.5; caps.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, vx: 0, vy: 0, rot: Math.random() * R.TAU, col: '#fff' }); }
      caps.length = n;
      caps.forEach((c, i) => { c.col = capColor(q[i], i); });
    }
    fill();
    api.on('queue', fill);
    let drop = null, turn = 0, crankA = 0, drag = null, enterT = 9;
    api.beat((s) => { for (const c of caps) { c.vx += (Math.random() - 0.5) * s * 2.2; c.vy -= s * (1.2 + Math.random() * 1.6); } });
    const spin = () => { turn = 1; drop = { t: 0, col: capColor(api.track(), 0) }; cap.classList.remove('pop'); void cap.offsetWidth; cap.classList.add('pop'); };
    api.on('track', () => spin());
    // crank: tap = next, or drag it round
    crank.addEventListener('pointerdown', (e) => {
      const r = crank.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      drag = { cx, cy, a: Math.atan2(e.clientY - cy, e.clientX - cx), tot: 0, moved: 0, x: e.clientX, y: e.clientY };
      try { crank.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      e.preventDefault();
    });
    crank.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const a = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx); let d = a - drag.a; if (d > Math.PI) d -= R.TAU; if (d < -Math.PI) d += R.TAU;
      drag.a = a; drag.tot += Math.max(0, d); crankA += Math.max(0, d) * 57.3; drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y); drag.x = e.clientX; drag.y = e.clientY;
      if (Math.floor(crankA / 40) !== Math.floor((crankA - Math.max(0, d) * 57.3) / 40)) api.sfx('tick');
    });
    const up = () => {
      if (!drag) return;
      const d = drag; drag = null;
      if (d.tot > 4.4 || d.moved < 12) { R.player.prime(); R.player.next(); api.sfx('next'); }
    };
    crank.addEventListener('pointerup', up); crank.addEventListener('pointercancel', () => { drag = null; });
    const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    return {
      enter() { enterT = 0; for (const c of caps) { c.y = -2.5 - Math.random() * 2; c.vy = 0; } },
      resize() { cv.resize(); layout(); },
      frame(dt, t, v) {
        enterT += dt;
        const { ctx } = cv; cv.clear();
        if (!M) return;
        const { x0, y0, W, H, dome, body } = M;
        const rise = R.ease.back(Math.min(1, enterT / 0.7));
        ctx.save(); ctx.translate(0, (1 - rise) * 300);
        // body
        ctx.lineJoin = 'round';
        ctx.fillStyle = '#7a1218'; rr(ctx, body.x - 4, body.y + 6, body.w + 8, body.h, 22); ctx.fill();
        const bg = ctx.createLinearGradient(body.x, 0, body.x + body.w, 0); bg.addColorStop(0, '#c91f2c'); bg.addColorStop(0.35, '#ff4a57'); bg.addColorStop(1, '#c91f2c');
        ctx.fillStyle = bg; rr(ctx, body.x, body.y, body.w, body.h - 6, 20); ctx.fill();
        ctx.strokeStyle = '#7a1218'; ctx.lineWidth = 3; ctx.stroke();
        // side lights = spectrum
        for (let side = 0; side < 2; side++) for (let i = 0; i < 7; i++) {
          const b = v.bands[2 + i * 4 + side]; const lx = side ? body.x + body.w - 14 : body.x + 14, ly = body.y + 20 + i * ((body.h - 46) / 6);
          ctx.fillStyle = b > 0.35 ? R.color.hsl(45 + i * 6, 1, 0.55 + b * 0.25) : '#8f1a22'; ctx.beginPath(); ctx.arc(lx, ly, 4.5, 0, R.TAU); ctx.fill();
          if (b > 0.35) { ctx.globalAlpha = b * 0.6; ctx.drawImage(api.glow('#ffd23f', 64), lx - 14, ly - 14, 28, 28); ctx.globalAlpha = 1; }
        }
        // coin plate + chute
        const cpW = body.w * 0.26, cpX = body.x + body.w * 0.12, cpY = body.y + body.h * 0.18;
        ctx.fillStyle = '#fff3dc'; rr(ctx, cpX, cpY, cpW, body.h * 0.36, 10); ctx.fill(); ctx.strokeStyle = '#7a1218'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#3a1416'; rr(ctx, cpX + cpW * 0.42, cpY + body.h * 0.06, cpW * 0.16, body.h * 0.16, 3); ctx.fill();
        ctx.fillStyle = '#c4232f'; ctx.font = `700 ${Math.max(9, cpW * 0.15)}px Bungee, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('1 TURN', cpX + cpW / 2, cpY + body.h * 0.31);
        const chW = body.w * 0.36, chH = body.h * 0.42, chX = dome.x + W * 0.22 - chW / 2, chY = body.y + body.h - chH - body.h * 0.05;
        ctx.fillStyle = '#3a1416'; rr(ctx, chX, chY, chW, chH, 14); ctx.fill(); ctx.strokeStyle = '#fff3dc'; ctx.lineWidth = 3; ctx.stroke();
        // neck
        ctx.fillStyle = '#fff3dc'; rr(ctx, dome.x - dome.r * 0.78, body.y - 8, dome.r * 1.56, 18, 8); ctx.fill(); ctx.strokeStyle = '#7a1218'; ctx.lineWidth = 2.5; ctx.stroke();
        // dome + capsules
        const cr = dome.r * 0.21;
        ctx.save(); ctx.beginPath(); ctx.arc(dome.x, dome.y, dome.r, 0, R.TAU); ctx.clip();
        ctx.fillStyle = 'rgba(225,248,255,.55)'; ctx.fillRect(dome.x - dome.r, dome.y - dome.r, dome.r * 2, dome.r * 2);
        const lim = 1 - cr / dome.r;
        for (const c of caps) {
          c.vy += 4.2 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= 0.995; c.rot += c.vx * dt * 3;
          const d = Math.hypot(c.x, c.y); if (d > lim) { const nx = c.x / d, ny = c.y / d; c.x = nx * lim; c.y = ny * lim; const dot = c.vx * nx + c.vy * ny; if (dot > 0) { c.vx -= 1.5 * dot * nx; c.vy -= 1.5 * dot * ny; } c.vx *= 0.92; }
        }
        const rad = cr / dome.r;
        for (let it = 0; it < 2; it++) for (let i = 0; i < caps.length; i++) for (let j = i + 1; j < caps.length; j++) {
          const a = caps[i], b = caps[j]; const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1e-4;
          if (d < rad * 2) { const o = (rad * 2 - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o; const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rv < 0) { a.vx += rv * nx * 0.5; a.vy += rv * ny * 0.5; b.vx -= rv * nx * 0.5; b.vy -= rv * ny * 0.5; } }
        }
        for (const c of caps) {
          const px = dome.x + c.x * dome.r, py = dome.y + c.y * dome.r;
          ctx.save(); ctx.translate(px, py); ctx.rotate(c.rot);
          ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(0, 0, cr, Math.PI, 0); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(0, 0, cr, 0, Math.PI); ctx.fill();
          ctx.strokeStyle = 'rgba(90,30,40,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, cr, 0, R.TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-cr, 0); ctx.lineTo(cr, 0); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-cr * 0.35, -cr * 0.45, cr * 0.25, cr * 0.13, -0.5, 0, R.TAU); ctx.fill();
          ctx.restore();
        }
        ctx.restore();
        ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(dome.x, dome.y, dome.r, 0, R.TAU); ctx.stroke();
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#7a1218'; ctx.beginPath(); ctx.arc(dome.x, dome.y, dome.r + 3.5, 0, R.TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(dome.x, dome.y, dome.r * 0.8, -2.6, -1.9); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(dome.x, dome.y, dome.r * 0.8, -1.75, -1.6); ctx.stroke();
        // marquee
        const mqW = W * 0.82, mqH = H * 0.11, mqX = x0 + (W - mqW) / 2, mqY = dome.y - dome.r - mqH - 4;
        ctx.fillStyle = '#7a1218'; rr(ctx, mqX - 3, mqY + 4, mqW + 6, mqH, 14); ctx.fill();
        ctx.fillStyle = '#e8323f'; rr(ctx, mqX, mqY, mqW, mqH, 12); ctx.fill(); ctx.strokeStyle = '#fff3dc'; ctx.lineWidth = 3; ctx.stroke();
        const nb = 14;
        for (let i = 0; i < nb; i++) {
          const on = ((Math.floor(t * (v.playing ? 6 : 1.5)) + i) % 3 === 0) || v.bands[1 + i * 2] > 0.62;
          for (const yy of [mqY + 6, mqY + mqH - 6]) { const bx = mqX + 12 + i * ((mqW - 24) / (nb - 1)); ctx.fillStyle = on ? '#fff6c8' : '#b8323b'; ctx.beginPath(); ctx.arc(bx, yy, 3, 0, R.TAU); ctx.fill(); }
        }
        ctx.fillStyle = '#fff6c8'; ctx.font = `400 ${Math.round(mqH * 0.42)}px Bungee, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('SONG GACHA', mqX + mqW / 2, mqY + mqH / 2 + 1);
        ctx.textBaseline = 'alphabetic';
        // falling capsule on a new song
        if (drop) {
          drop.t += dt; const p = Math.min(1, drop.t / 0.55);
          const sx = dome.x, sy = dome.y + dome.r * 0.7, ex = chX + chW / 2, ey = chY + chH / 2;
          const px = R.lerp(sx, ex, p), py = R.lerp(sy, ey, p) - Math.sin(p * Math.PI) * 30;
          if (p < 1) { ctx.fillStyle = drop.col; ctx.beginPath(); ctx.arc(px, py, cr, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, cr, 0, Math.PI); ctx.fill(); }
          else drop = null;
        }
        ctx.restore();
        turn = Math.max(0, turn - dt * 1.6);
        if (!drag) crankA += turn * dt * 900;
        crank.style.transform = `translateY(${((1 - rise) * 300).toFixed(1)}px) rotate(${crankA.toFixed(1)}deg)`;
        cap.style.translate = `0 ${((1 - rise) * 300).toFixed(1)}px`;
        root.style.setProperty('--lv', v.level.toFixed(3));
      },
    };
  },
});
