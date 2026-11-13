/* ===================== skin-styled cover cards: the lock screen wears the skin too =====================
   R.poster.card(t, def, n) paints the song's cover the way the current skin would frame it (HUD brackets, a glowing
   ring, a record sleeve, a cassette, big pixels, a paper scroll with a seal, a polaroid, frosted glass, chrome) over a
   soft copy of what the skin looks like right now. The lock screen (Media Session artwork) shows it. */
R.poster = (() => {
  const { color, settings, bus } = R;
  const FAM = { neon: 'hud', mecha: 'hud', scope: 'hud', fighter: 'hud', supercar: 'hud', neoncity: 'hud', nebula: 'cosmic', blackhole: 'cosmic', aurora: 'cosmic', fireworks: 'cosmic', stage: 'cosmic', vinyl: 'vinyl', cassette: 'cassette', arcade: 'pixel', ink: 'ink', jelly: 'cute', gacha: 'cute', catdj: 'cute', glass: 'glass', liquid: 'chrome', rhythm: 'hud', particles: 'cosmic', woofer: 'chrome' };
  const famOf = (def) => (def ? FAM[def.base || def.id] || (def.diy ? 'glass' : 'glass') : 'glass');
  const SANS = '-apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", sans-serif';
  const rr = (x, l, t, w, h, r) => R.snap.rrect(x, l, t, w, h, [r, r, r, r]);

  // a very soft copy of the skin as it looks now (downscale → upscale = cheap blur)
  function backdrop(x, n, th) {
    x.fillStyle = th.bg || '#0a0a12'; x.fillRect(0, 0, n, n);
    const root = R.stage.root(); if (!root) return;
    try {
      const shot = R.snap.shot(root, { s: 0.3, ui: false, text: false });
      const tiny = document.createElement('canvas'); tiny.width = 36; tiny.height = Math.max(1, Math.round((36 * shot.height) / shot.width));
      tiny.getContext('2d').drawImage(shot, 0, 0, tiny.width, tiny.height);
      const s = Math.max(n / tiny.width, n / tiny.height);
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(tiny, (n - tiny.width * s) / 2, (n - tiny.height * s) / 2, tiny.width * s, tiny.height * s);
    } catch (e) { /* keep the plain colour */ }
  }
  function art(x, im, l, t, w, h, col) { if (im) R.snap.cover(x, im, l, t, w, h); else { const g = x.createLinearGradient(l, t, l + w, t + h); g.addColorStop(0, col.vibrant); g.addColorStop(1, col.dark); x.fillStyle = g; x.fillRect(l, t, w, h); } }
  function spectrum(x, l, b, w, h, c, n) {
    const ov = R.viz.overview; n = n || 40; const bw = w / n;
    x.fillStyle = c;
    for (let i = 0; i < n; i++) { const v = ov && ov.length ? ov[Math.floor((i / n) * ov.length)] / 255 : 0.3 + 0.5 * Math.abs(Math.sin(i * 0.9)); const hh = 3 + v * h; x.fillRect(l + i * bw + bw * 0.2, b - hh, bw * 0.6, hh); }
  }

  async function card(t, def, n) {
    n = n || 600;
    def = def || R.stage.current() || { id: 'glass', theme: {} };
    const th = def.theme || {}, col = R.art.colorsOf(t);
    const a1 = th.accent || col.vibrant, a2 = th.accent2 || col.light;
    const c = document.createElement('canvas'); c.width = c.height = n;
    const x = c.getContext('2d');
    const im = await R.art.coverImage(t);
    const fam = famOf(def), k = n / 600;
    backdrop(x, n, th);
    x.save(); x.scale(k, k);
    const N = 600;
    if (fam === 'hud') {
      x.fillStyle = 'rgba(2,3,10,.55)'; x.fillRect(0, 0, N, N);
      x.fillStyle = 'rgba(255,255,255,.04)'; for (let y = 0; y < N; y += 4) x.fillRect(0, y, N, 1);
      const L = 110, S = 380;
      x.save(); x.shadowColor = a1; x.shadowBlur = 40; x.fillStyle = '#000'; x.fillRect(L, 92, S, S); x.restore();
      art(x, im, L, 92, S, S, col);
      x.strokeStyle = color.rgba(a2, 0.7); x.lineWidth = 2; x.strokeRect(L - 10, 82, S + 20, S + 20);
      x.strokeStyle = a1; x.lineWidth = 6; x.lineCap = 'square';
      const br = (px, py, dx, dy) => { x.beginPath(); x.moveTo(px + dx * 46, py); x.lineTo(px, py); x.lineTo(px, py + dy * 46); x.stroke(); };
      br(L - 22, 70, 1, 1); br(L + S + 22, 70, -1, 1); br(L - 22, 92 + S + 22, 1, -1); br(L + S + 22, 92 + S + 22, -1, -1);
      x.font = '700 15px "Share Tech Mono", monospace'; x.fillStyle = a2; x.textBaseline = 'alphabetic';
      x.fillText('RESKIN // ' + (def.en || def.name || '').toUpperCase(), 40, 44);
      x.textAlign = 'right'; x.fillText((t && t.bpm ? Math.round(t.bpm) + ' BPM' : '') + (t && t.mkey ? '  ' + t.mkey : ''), N - 40, 44); x.textAlign = 'left';
      spectrum(x, 110, 566, 380, 34, color.rgba(a1, 0.85), 48);
    } else if (fam === 'cosmic') {
      x.fillStyle = 'rgba(0,0,8,.35)'; x.fillRect(0, 0, N, N);
      const rnd = R.rng(R.hashStr(t ? t.id : 'x'));
      x.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { x.globalAlpha = 0.3 + rnd() * 0.7; x.fillRect(rnd() * N, rnd() * N, rnd() < 0.15 ? 2 : 1, rnd() < 0.15 ? 2 : 1); } x.globalAlpha = 1;
      const cx = 300, cy = 290, r = 182;
      const g = x.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.7); g.addColorStop(0, color.rgba(a1, 0.85)); g.addColorStop(0.35, color.rgba(a2, 0.35)); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, N, N);
      x.save(); x.beginPath(); x.arc(cx, cy, r, 0, R.TAU); x.clip(); art(x, im, cx - r, cy - r, r * 2, r * 2, col); x.restore();
      x.lineWidth = 5; x.strokeStyle = '#fff'; x.shadowColor = a1; x.shadowBlur = 30; x.beginPath(); x.arc(cx, cy, r + 3, 0, R.TAU); x.stroke(); x.shadowBlur = 0;
      x.font = '700 16px Orbitron, sans-serif'; x.textAlign = 'center'; x.fillStyle = 'rgba(255,255,255,.75)'; x.fillText((def.en || '').toUpperCase(), cx, 556); x.textAlign = 'left';
    } else if (fam === 'vinyl') {
      x.fillStyle = 'rgba(10,6,2,.45)'; x.fillRect(0, 0, N, N);
      const S = 360, L = 70, T = 120;
      // the record slides out of its sleeve
      const rx = L + S * 0.72, ry = T + S / 2, rr0 = S * 0.48;
      x.fillStyle = '#0b0b0d'; x.beginPath(); x.arc(rx, ry, rr0, 0, R.TAU); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.06)'; x.lineWidth = 1; for (let r = rr0 * 0.4; r < rr0; r += 4) { x.beginPath(); x.arc(rx, ry, r, 0, R.TAU); x.stroke(); }
      const sh = x.createLinearGradient(rx - rr0, ry - rr0, rx + rr0, ry + rr0); sh.addColorStop(0.3, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,.12)'); sh.addColorStop(0.7, 'rgba(255,255,255,0)'); x.fillStyle = sh; x.beginPath(); x.arc(rx, ry, rr0, 0, R.TAU); x.fill();
      x.save(); x.beginPath(); x.arc(rx, ry, rr0 * 0.33, 0, R.TAU); x.clip(); art(x, im, rx - rr0 * 0.33, ry - rr0 * 0.33, rr0 * 0.66, rr0 * 0.66, col); x.restore();
      x.fillStyle = '#d8d0c0'; x.beginPath(); x.arc(rx, ry, 5, 0, R.TAU); x.fill();
      x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 30; x.shadowOffsetX = 10; x.fillStyle = '#000'; x.fillRect(L, T, S, S); x.restore();
      art(x, im, L, T, S, S, col);
      x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(L, T, S, 6);
    } else if (fam === 'cassette') {
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 0, N, N);
      const L = 50, T = 140, Wd = 500, Hd = 320;
      x.fillStyle = th.accent ? color.mix(th.bg || '#222', '#000', 0.2) : '#222'; rr(x, L, T, Wd, Hd, 22); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 2; rr(x, L, T, Wd, Hd, 22); x.stroke();
      x.save(); rr(x, L + 30, T + 28, Wd - 60, 170, 10); x.clip(); art(x, im, L + 30, T + 28 - 60, Wd - 60, Wd - 60, col); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(L + 30, T + 28, Wd - 60, 170); x.restore();
      x.fillStyle = '#16120f'; rr(x, L + 120, T + 92, Wd - 240, 64, 32); x.fill();
      for (const cx2 of [L + 168, L + Wd - 168]) { x.fillStyle = '#e8e2d6'; x.beginPath(); x.arc(cx2, T + 124, 24, 0, R.TAU); x.fill(); x.fillStyle = '#16120f'; for (let i = 0; i < 6; i++) { const a = (i / 6) * R.TAU; x.fillRect(cx2 + Math.cos(a) * 14 - 3, T + 124 + Math.sin(a) * 14 - 3, 6, 6); } }
      x.fillStyle = a1; x.fillRect(L + 30, T + 220, Wd - 60, 10); x.fillStyle = a2; x.fillRect(L + 30, T + 236, Wd - 60, 6);
      x.font = '800 22px ' + SANS; x.fillStyle = 'rgba(255,255,255,.9)'; x.fillText('A', L + 34, T + 290);
    } else if (fam === 'pixel') {
      x.fillStyle = '#0d0a1f'; x.fillRect(0, 0, N, N);
      const tiny = document.createElement('canvas'); tiny.width = tiny.height = 40; const tx = tiny.getContext('2d'); if (im) R.snap.cover(tx, im, 0, 0, 40, 40); else { tx.fillStyle = col.vibrant; tx.fillRect(0, 0, 40, 40); }
      x.fillStyle = a1; x.fillRect(84, 84, 432, 432); x.fillStyle = '#000'; x.fillRect(96, 96, 408, 408);
      x.imageSmoothingEnabled = false; x.drawImage(tiny, 100, 100, 400, 400); x.imageSmoothingEnabled = true;
      x.font = '16px "Press Start 2P", monospace'; x.fillStyle = '#fff'; x.fillText('1UP', 40, 52); x.fillStyle = a2; x.textAlign = 'right'; x.fillText('HI-SCORE', N - 40, 52); x.textAlign = 'center'; x.fillStyle = '#ffe14d'; x.fillText('NOW PLAYING', 300, 566); x.textAlign = 'left';
    } else if (fam === 'ink') {
      x.fillStyle = '#efe6d2'; x.fillRect(0, 0, N, N);
      x.globalAlpha = 0.25; x.globalCompositeOperation = 'multiply'; backdrop(x, N, th); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
      const rnd = R.rng(7); x.fillStyle = 'rgba(40,30,20,.05)'; for (let i = 0; i < 400; i++) x.fillRect(rnd() * N, rnd() * N, 1 + rnd() * 2, 1);
      x.save(); x.beginPath(); for (let i = 0; i <= 64; i++) { const a = (i / 64) * R.TAU, rad = 200 + Math.sin(i * 1.7) * 5 + Math.cos(i * 3.1) * 4; x.lineTo(300 + Math.cos(a) * rad * 1.02, 290 + Math.sin(a) * rad); } x.closePath(); x.clip(); art(x, im, 96, 86, 408, 408, col); x.restore();
      x.strokeStyle = 'rgba(20,16,12,.85)'; x.lineWidth = 7; x.beginPath(); x.arc(300, 290, 206, -1.2, 4.6); x.stroke();
      x.fillStyle = '#b5291e'; rr(x, 448, 470, 92, 92, 8); x.fill();
      x.fillStyle = '#efe6d2'; x.font = '700 54px "Kaiti TC", "STKaiti", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(((t && t.title) || '樂').trim().charAt(0), 494, 518); x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    } else if (fam === 'cute') {
      x.fillStyle = color.rgba(color.mix(a1, '#ffffff', 0.7), 0.55); x.fillRect(0, 0, N, N);
      x.save(); x.translate(300, 300); x.rotate(-0.05);
      x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 24; x.shadowOffsetY = 8; x.fillStyle = '#fffaf2'; rr(x, -200, -220, 400, 460, 14); x.fill(); x.shadowColor = 'transparent';
      x.save(); rr(x, -176, -196, 352, 352, 8); x.clip(); art(x, im, -176, -196, 352, 352, col); x.restore();
      x.fillStyle = color.rgba(a2, 0.75); x.save(); x.rotate(0.1); x.fillRect(-60, -238, 120, 38); x.restore();
      x.font = '700 30px Fredoka, ' + SANS; x.fillStyle = color.mix(a1, '#000000', 0.25); x.textAlign = 'center'; x.fillText('♪ ♡ ♪', 0, 205); x.textAlign = 'left';
      x.restore();
      const star = (sx, sy, r, c2) => { x.fillStyle = c2; x.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * R.TAU - Math.PI / 2, rad = i % 2 ? r * 0.45 : r; x.lineTo(sx + Math.cos(a) * rad, sy + Math.sin(a) * rad); } x.closePath(); x.fill(); };
      star(82, 96, 34, '#ffe14d'); star(528, 520, 26, a1); star(530, 88, 18, a2);
    } else if (fam === 'chrome') {
      x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, N, N);
      const g = x.createLinearGradient(80, 70, 520, 530); ['#3b3f47', '#f4f6fa', '#6b7280', '#ffffff', '#2b2f36', '#d9dde4'].forEach((cc, i) => g.addColorStop(i / 5, cc));
      x.fillStyle = g; rr(x, 80, 70, 440, 440, 60); x.fill();
      x.save(); rr(x, 100, 90, 400, 400, 44); x.clip(); art(x, im, 100, 90, 400, 400, col); x.restore();
      const sh = x.createLinearGradient(100, 90, 500, 490); sh.addColorStop(0, 'rgba(255,255,255,.22)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); x.fillStyle = sh; rr(x, 100, 90, 400, 400, 44); x.fill();
      x.font = '600 15px "Exo 2", sans-serif'; x.fillStyle = 'rgba(255,255,255,.7)'; x.textAlign = 'center'; x.fillText((def.en || '').toUpperCase(), 300, 556); x.textAlign = 'left';
    } else {
      x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(0, 0, N, N);
      x.fillStyle = 'rgba(255,255,255,.14)'; rr(x, 60, 60, 480, 480, 40); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 2; rr(x, 60, 60, 480, 480, 40); x.stroke();
      x.save(); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 30; x.fillStyle = '#000'; rr(x, 110, 110, 380, 380, 26); x.fill(); x.restore();
      x.save(); rr(x, 110, 110, 380, 380, 26); x.clip(); art(x, im, 110, 110, 380, 380, col); x.restore();
    }
    x.restore();
    return c;
  }

  // lock screen: one card per song + skin, made a moment after either changes (so the skin has finished arriving)
  const cache = new Map();
  async function lock(t) {
    if (!t || settings.get('lockArt') === false) return null;
    const def = R.stage.current(); if (!def) return null;
    const key = t.id + ':' + (t.coverRev || 0) + ':' + def.id;
    if (cache.has(key)) return cache.get(key);
    const c = await card(t, def, 600);
    const blob = await R.art.toBlob(c, 'image/jpeg', 0.88);
    if (!blob) return null;
    const u = await R.imageURL(blob);
    cache.set(key, u);
    while (cache.size > 6) { const k0 = cache.keys().next().value; const u0 = cache.get(k0); cache.delete(k0); setTimeout(() => R.dropURL(u0), 30000); }
    return u;
  }
  let skinT = 0;
  bus.on('skin', () => { clearTimeout(skinT); skinT = setTimeout(() => { if (R.player.current() && !R.wardrobe.isOpen()) R.player.refreshMeta(); }, 2600); });
  return { card, lock, famOf };
})();
