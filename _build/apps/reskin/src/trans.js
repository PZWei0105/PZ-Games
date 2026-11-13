/* ===================== skin changes: portal, shatter, pixel dissolve (and the classic circle) =====================
   R.stage.show() hands the outgoing layer here. The new skin is already mounted on top; the effect decides how the old
   one gets out of the way. Shatter and pixel work on a snapshot of the old skin (R.snap), so the old DOM can go at once. */
R.trans = (() => {
  const { $, settings } = R;
  const cv = $('#trans'), ctx = cv.getContext('2d');
  let W = 1, H = 1, D = 1, cur = null, last = '', safety = 0;
  const KINDS = ['portal', 'shatter', 'pixel'];
  function size() {
    D = Math.max(1, Math.min(window.devicePixelRatio || 1, 2) * Math.max(0.75, R.quality()));
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * D); cv.height = Math.round(H * D);
    ctx.setTransform(D, 0, 0, D, 0, 0);
  }
  function clear() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(D, 0, 0, D, 0, 0); }
  const pct = (v, ref, def) => { if (v == null) return def * ref; const s = String(v); return s.endsWith('%') ? (parseFloat(s) / 100) * ref : parseFloat(s) || def * ref; };

  function pick(def, opts) {
    const want = settings.get('transFx') || 'auto';
    if (R.reduced) return 'classic';
    if (want !== 'auto') return opts.fast && want === 'shatter' ? 'portal' : want;
    // browsing the wardrobe: only the quick ones
    if (opts.fast) return def.trans === 'pixel' ? 'pixel' : last === 'portal' && Math.random() < 0.5 ? 'pixel' : 'portal';
    if (def.trans && KINDS.includes(def.trans) && Math.random() < 0.7) return def.trans;
    const pool = KINDS.filter((k) => k !== last);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function stop() {
    clearTimeout(safety);
    if (!cur) return;
    const c = cur; cur = null;
    try { c.end(); } catch (e) { console.error(e); }
    clear(); cv.hidden = true;
  }
  function run(prevL, L, opts, release) {
    stop();
    const kind = pick(L.def, opts);
    last = kind;
    let done = false;
    const rel = () => { if (!done) { done = true; release(); } };
    const th = L.def.theme || {};
    const cx = pct(opts.x, innerWidth, 0.5), cy = pct(opts.y, innerHeight, 0.45);
    if (kind === 'classic') {
      L.root.style.setProperty('--rx', opts.x || '50%'); L.root.style.setProperty('--ry', opts.y || '50%');
      L.root.classList.add(opts.fast ? 'reveal-fast' : 'reveal');
      const w = opts.fast ? 460 : 820; setTimeout(rel, w); return w;
    }
    size(); clear(); cv.hidden = false;
    const fx = kind === 'portal' ? portal(prevL, L, cx, cy, opts.fast, th, rel) : kind === 'shatter' ? shatter(prevL, L, cx, cy, opts.fast, th, rel) : pixel(prevL, L, opts.fast, th, rel);
    fx.t = 0; fx.kind = kind;
    const end0 = fx.end;
    fx.end = () => { try { end0(); } finally { rel(); } };
    cur = fx;
    safety = setTimeout(stop, fx.dur * 1000 + 600);
    if (!opts.silent) R.sfx.play(kind);
    return Math.round(fx.dur * 1000);
  }
  function frame(dt) {
    if (!cur) return;
    cur.t += Math.min(dt, 0.05);
    if (cur.t >= cur.dur) { stop(); return; }
    clear();
    cur.draw(cur.t / cur.dur, cur.t);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('resize', () => { if (cur) stop(); });

  /* ---------- portal: the new skin opens up through a glowing ring, the old one is pulled in and darkens ---------- */
  function portal(prevL, L, cx, cy, fast, th, rel) {
    const dur = fast ? 0.56 : 0.95;
    const far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 30;
    const a1 = th.accent || '#7c8cff', a2 = th.accent2 || '#22f3ff';
    prevL.root.style.setProperty('--trd', dur + 's');
    prevL.root.classList.add('tr-sink');
    L.root.style.clipPath = 'circle(0px at ' + cx + 'px ' + cy + 'px)';
    const sparks = [];
    for (let i = 0; i < (fast ? 40 : 90); i++) sparks.push({ a: Math.random() * R.TAU, o: (Math.random() - 0.5) * 30, v: 0.6 + Math.random() * 1.6, s: 1 + Math.random() * 2.2, c: Math.random() < 0.5 ? a1 : a2 });
    const ez = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    return {
      dur,
      draw(p, t) {
        const r = Math.max(0, ez(Math.min(1, p * 1.05)) * far);
        L.root.style.clipPath = 'circle(' + r.toFixed(1) + 'px at ' + cx + 'px ' + cy + 'px)';
        const fade = 1 - Math.max(0, (p - 0.75) / 0.25);
        ctx.globalCompositeOperation = 'lighter';
        // a burst of light where it opens
        if (p < 0.3) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 160); g.addColorStop(0, R.color.rgba('#ffffff', 0.9 * (1 - p / 0.3))); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 160, cy - 160, 320, 320); }
        if (r > 2) {
          // the rim: a wide soft glow, a hot core and two dashed rings turning opposite ways
          for (const [w, a, c] of [[38, 0.18, a1], [14, 0.45, a2], [4, 0.95, '#ffffff']]) { ctx.strokeStyle = R.color.rgba(c, a * fade); ctx.lineWidth = w; ctx.beginPath(); ctx.arc(cx, cy, r, 0, R.TAU); ctx.stroke(); }
          ctx.lineWidth = 3; ctx.setLineDash([18, 12, 4, 12]);
          ctx.strokeStyle = R.color.rgba(a1, 0.8 * fade); ctx.lineDashOffset = -t * 260; ctx.beginPath(); ctx.arc(cx, cy, r + 14, 0, R.TAU); ctx.stroke();
          ctx.strokeStyle = R.color.rgba(a2, 0.6 * fade); ctx.lineDashOffset = t * 200; ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r - 12), 0, R.TAU); ctx.stroke();
          ctx.setLineDash([]);
          // sparks streaming along the rim
          for (const s of sparks) {
            s.a += s.v * 0.05 * (1 + p * 3);
            const rr = r + s.o + Math.sin(t * 9 + s.a * 3) * 6;
            const x = cx + Math.cos(s.a) * rr, y = cy + Math.sin(s.a) * rr;
            ctx.fillStyle = R.color.rgba(s.c, 0.85 * fade);
            ctx.beginPath(); ctx.arc(x, y, s.s, 0, R.TAU); ctx.fill();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      },
      end() { prevL.root.classList.remove('tr-sink'); L.root.style.clipPath = ''; },
    };
  }

  /* ---------- shatter: the old skin cracks from the point you tapped and falls apart as glass ---------- */
  function shatter(prevL, L, cx, cy, fast, th, rel) {
    const dur = fast ? 0.75 : 1.2, crackT = fast ? 0.02 : 0.16;
    const s = Math.min(1.5, D);
    const snap = R.snap.shot(prevL.root, { s, ui: true });
    rel(); // the picture stands in for the old skin from here on
    // glass breaks in rings around the impact: a jittered polar grid, neighbours share corners (no gaps)
    const rnd = R.rng((Math.random() * 1e9) | 0);
    const far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.08;
    const NR = fast ? 5 : 6, NS = fast ? 12 : 16;
    const rings = [0]; for (let k = 1; k <= NR; k++) rings.push(far * Math.pow(k / NR, 1.55));
    const ang = []; for (let j = 0; j < NS; j++) ang.push(((j + (rnd() - 0.5) * 0.7) / NS) * R.TAU);
    const P = rings.map((rr, k) => ang.map((a) => { const jr = k && k < NR ? rr * (1 + (rnd() - 0.5) * 0.22) : rr; const ja = a + (k ? (rnd() - 0.5) * 0.12 : 0); return [cx + Math.cos(ja) * jr, cy + Math.sin(ja) * jr]; }));
    const shards = [];
    for (let k = 0; k < NR; k++) for (let j = 0; j < NS; j++) {
      const j2 = (j + 1) % NS;
      const poly = k === 0 ? [[cx, cy], P[1][j], P[1][j2]] : [P[k][j], P[k + 1][j], P[k + 1][j2], P[k][j2]];
      let mx = 0, my = 0; for (const q of poly) { mx += q[0]; my += q[1]; } mx /= poly.length; my /= poly.length;
      const dx = mx - cx, dy = my - cy, dd = Math.hypot(dx, dy) || 1;
      const push = (fast ? 520 : 420) * (0.35 + 220 / (dd + 160));
      shards.push({ poly: poly.map(([x, y]) => [x - mx, y - my]), mx, my, vx: (dx / dd) * push * (0.6 + rnd() * 0.7) + (rnd() - 0.5) * 80, vy: (dy / dd) * push * (0.5 + rnd() * 0.6) - 60 - rnd() * 120, rot: 0, vr: (rnd() - 0.5) * 7, flip: rnd() * 6, vf: 3 + rnd() * 9, delay: (dd / far) * 0.12, x: 0, y: 0 });
    }
    const cracks = [];
    for (let j = 0; j < NS; j++) cracks.push(P.map((ring) => ring[j]));
    let lastT = 0;
    return {
      dur,
      draw(p, t) {
        const dt = Math.max(0, t - lastT); lastT = t;
        if (t < crackT) {
          // the picture, then the cracks running out from the impact
          ctx.drawImage(snap, 0, 0, W, H);
          const g = t / crackT;
          ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.4; ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
          ctx.beginPath();
          for (const c of cracks) { ctx.moveTo(cx, cy); const n = Math.max(1, Math.ceil(g * 3.2)); for (let k = 1; k <= Math.min(n, c.length - 1); k++) ctx.lineTo(c[k][0], c[k][1]); }
          for (let k = 1; k <= Math.min(NR, Math.ceil(g * 2.5)); k++) { const ring = P[k]; ctx.moveTo(ring[0][0], ring[0][1]); for (let j = 1; j <= NS; j++) ctx.lineTo(ring[j % NS][0], ring[j % NS][1]); }
          ctx.stroke(); ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(255,255,255,${0.3 * (1 - g)})`; ctx.fillRect(0, 0, W, H);
          return;
        }
        const tt = t - crackT;
        const flash = Math.max(0, 0.35 - tt * 2.4);
        for (const sh of shards) {
          const st = tt - sh.delay;
          if (st > 0) { sh.vy += 1500 * dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.rot += sh.vr * dt; sh.flip += sh.vf * dt; }
          const fx = st > 0 ? Math.cos(sh.flip) : 1;
          const fade = Math.max(0, 1 - Math.max(0, p - 0.6) / 0.4);
          if (fade <= 0) continue;
          ctx.save();
          ctx.translate(sh.mx + sh.x, sh.my + sh.y); ctx.rotate(sh.rot); ctx.scale(Math.abs(fx) < 0.08 ? 0.08 : fx, 1);
          ctx.beginPath(); sh.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
          ctx.save(); ctx.clip();
          ctx.globalAlpha = fade;
          ctx.drawImage(snap, -sh.mx, -sh.my, W, H);
          // the far side of the glass is darker; light catches the face as it turns
          if (fx < 0) { ctx.fillStyle = `rgba(0,0,0,${0.45 * -fx})`; ctx.fill(); }
          ctx.fillStyle = `rgba(255,255,255,${0.12 * Math.max(0, Math.sin(sh.flip * 2))})`; ctx.fill();
          ctx.restore();
          ctx.globalAlpha = fade * 0.9; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.1; ctx.stroke();
          ctx.restore();
        }
        if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); }
      },
      end() {},
    };
  }

  /* ---------- pixel dissolve: the old skin glitches, turns to big pixels, and the pixels blink away ---------- */
  function pixel(prevL, L, fast, th, rel) {
    const dur = fast ? 0.62 : 1.0, pixT = fast ? 0.14 : 0.24;
    const snap = R.snap.shot(prevL.root, { s: 0.5, ui: true });
    rel();
    const B = Math.max(12, Math.round(Math.min(W, H) / 22));
    const cols = Math.ceil(W / B), rows = Math.ceil(H / B);
    const tiny = document.createElement('canvas'); tiny.width = cols; tiny.height = rows;
    const tx = tiny.getContext('2d'); tx.imageSmoothingEnabled = true; tx.drawImage(snap, 0, 0, cols, rows);
    let px = null; try { px = tx.getImageData(0, 0, cols, rows).data; } catch (e) { px = null; }
    const rnd = R.rng((Math.random() * 1e9) | 0);
    const dir = rnd() < 0.5 ? 1 : -1;
    const when = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const diag = ((dir > 0 ? x : cols - 1 - x) / cols + y / rows) / 2; when[y * cols + x] = pixT / dur + (0.68 - pixT / dur) * (diag * 0.7 + rnd() * 0.3); }
    const mid = document.createElement('canvas');
    const flashC = th.accent || '#ffffff';
    return {
      dur,
      draw(p, t) {
        if (t < pixT) {
          // glitch slices, then the blocks grow
          const g = t / pixT;
          const b = Math.max(1, Math.round(1 + (B - 1) * g * g));
          const mw = Math.max(1, Math.ceil(W / b)), mh = Math.max(1, Math.ceil(H / b));
          if (mid.width !== mw || mid.height !== mh) { mid.width = mw; mid.height = mh; }
          const mx = mid.getContext('2d'); mx.imageSmoothingEnabled = true; mx.drawImage(snap, 0, 0, mw, mh);
          ctx.imageSmoothingEnabled = false; ctx.drawImage(mid, 0, 0, mw * b, mh * b); ctx.imageSmoothingEnabled = true;
          if (g < 0.5) for (let k = 0; k < 5; k++) { const sy = rnd() * H, sh = 4 + rnd() * 30, off = (rnd() - 0.5) * 40; ctx.drawImage(snap, 0, sy * (snap.height / H), snap.width, sh * (snap.height / H), off, sy, W, sh); }
          return;
        }
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const k = y * cols + x, w0 = when[k];
          if (p > w0 + 0.05) continue;
          if (p > w0) { ctx.fillStyle = R.color.rgba(flashC, 0.9 * (1 - (p - w0) / 0.05)); ctx.fillRect(x * B, y * B, B - 1, B - 1); continue; }
          if (px) { const i = k * 4; ctx.fillStyle = `rgb(${px[i]},${px[i + 1]},${px[i + 2]})`; } else ctx.fillStyle = '#000';
          ctx.fillRect(x * B, y * B, B, B);
        }
      },
      end() {},
    };
  }
  return { run, frame, stop, active: () => !!cur, kind: () => (cur ? cur.kind : null) };
})();
