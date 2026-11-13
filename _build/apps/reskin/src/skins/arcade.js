/* ===================== skin: 像素街機 — the song is a stage in an 8-bit side-scroller: the city's windows are the equalizer, the hero jumps on the beat and grabs notes; the chorus is FEVER TIME ===================== */
R.skins.def({
  id: 'arcade', name: '像素街機', group: '復古', en: 'PIXEL ARCADE',
  desc: '8-bit 橫向卷軸：大樓窗戶就是等化器，主角跟著節拍跳、吃音符；副歌是 FEVER TIME',
  bloom: { s: 0.55, th: 0.55 }, trans: 'pixel',
  theme: { bg: '#140c33', fg: '#ffffff', accent: '#ff4d8d', accent2: '#5ef1ff', ui: 'rgba(22,15,52,.98)', dock: 'rgba(20,12,51,.62)', dockfg: '#ffffff' },
  enterMs: 1900, swapMs: 1450, hype: false,
  emblem: `<svg class="em" viewBox="0 0 116 150" shape-rendering="crispEdges"><rect width="116" height="150" fill="#140c33"/><rect y="38" width="116" height="16" fill="#2a1252"/><rect y="54" width="116" height="14" fill="#4d1a6e"/><rect y="68" width="116" height="12" fill="#7d2483"/><rect y="80" width="116" height="10" fill="#b8367f"/><rect y="90" width="116" height="10" fill="#ea5a72"/><rect x="58" y="72" width="28" height="4" fill="#ffd75e"/><rect x="54" y="78" width="36" height="4" fill="#ffc35e"/><rect x="52" y="84" width="40" height="3" fill="#ffa25e"/><rect x="52" y="90" width="40" height="3" fill="#ff7f6e"/><rect x="54" y="96" width="36" height="2" fill="#ff5f86"/><g fill="#ffffff"><rect x="10" y="12" width="2" height="2"/><rect x="40" y="22" width="2" height="2"/><rect x="88" y="10" width="2" height="2"/><rect x="104" y="28" width="2" height="2"/><rect x="70" y="30" width="2" height="2"/></g><rect x="0" y="86" width="16" height="32" fill="#1d1438"/><rect x="18" y="74" width="14" height="44" fill="#1d1438"/><rect x="80" y="80" width="16" height="38" fill="#1d1438"/><rect x="98" y="92" width="18" height="26" fill="#1d1438"/><g fill="#ffd75e"><rect x="3" y="104" width="3" height="3"/><rect x="9" y="104" width="3" height="3"/><rect x="3" y="110" width="3" height="3"/><rect x="21" y="96" width="3" height="3"/><rect x="26" y="102" width="3" height="3"/><rect x="21" y="108" width="3" height="3"/></g><g fill="#5ef1ff"><rect x="83" y="100" width="3" height="3"/><rect x="89" y="106" width="3" height="3"/><rect x="101" y="108" width="3" height="3"/><rect x="107" y="102" width="3" height="3"/></g><rect y="118" width="116" height="32" fill="#7a4a2a"/><rect y="118" width="116" height="4" fill="#3ddc84"/><g fill="#5c3520"><rect y="128" width="116" height="2"/><rect y="138" width="116" height="2"/><rect x="14" y="122" width="2" height="6"/><rect x="46" y="122" width="2" height="6"/><rect x="78" y="122" width="2" height="6"/><rect x="30" y="130" width="2" height="8"/><rect x="62" y="130" width="2" height="8"/><rect x="94" y="130" width="2" height="8"/></g><rect x="40" y="88" width="16" height="2" fill="#1b1b2f"/><rect x="38" y="90" width="2" height="4" fill="#1b1b2f"/><rect x="56" y="90" width="2" height="4" fill="#1b1b2f"/><rect x="38" y="94" width="20" height="16" fill="#1b1b2f"/><rect x="40" y="96" width="16" height="12" fill="#ffd75e"/><rect x="35" y="98" width="4" height="7" fill="#ff4d8d"/><rect x="57" y="98" width="4" height="7" fill="#ff4d8d"/><rect x="45" y="99" width="3" height="4" fill="#fff"/><rect x="51" y="99" width="3" height="4" fill="#fff"/><rect x="47" y="100" width="1" height="3" fill="#1b1b2f"/><rect x="53" y="100" width="1" height="3" fill="#1b1b2f"/><rect x="40" y="110" width="5" height="3" fill="#1b1b2f"/><rect x="51" y="110" width="5" height="3" fill="#1b1b2f"/><rect x="66" y="96" width="2" height="9" fill="#ffd75e"/><rect x="63" y="104" width="4" height="3" fill="#ffd75e"/><rect x="68" y="96" width="4" height="2" fill="#ffd75e"/></svg>`,
  sfx: {
    tap(s, t) { s.tone(t, { f: 880, dur: 0.05, v: 0.05, type: 'square' }); },
    tick(s, t) { s.tone(t, { f: 1320, dur: 0.03, v: 0.035, type: 'square' }); },
    toggle(s, t) { s.tone(t, { f: 660, dur: 0.05, v: 0.05, type: 'square' }); s.tone(t + 0.05, { f: 990, dur: 0.07, v: 0.05, type: 'square' }); },
    play(s, t) { s.tone(t, { f: 1047, dur: 0.07, v: 0.06, type: 'square' }); s.tone(t + 0.07, { f: 1568, dur: 0.32, v: 0.06, type: 'square' }); },
    pause(s, t) { s.tone(t, { f: 784, dur: 0.07, v: 0.06, type: 'square' }); s.tone(t + 0.08, { f: 392, dur: 0.18, v: 0.06, type: 'square' }); },
    next(s, t) { s.notes(t, [s.hz(72), s.hz(76), s.hz(79), s.hz(84)], { dur: 0.06, v: 0.05, type: 'square', gap: 0.045 }); },
    prev(s, t) { s.notes(t, [s.hz(84), s.hz(79), s.hz(76), s.hz(72)], { dur: 0.06, v: 0.05, type: 'square', gap: 0.045 }); },
    enter(s, t) { s.notes(t, [60, 64, 67, 72, 76, 79, 84].map(s.hz), { dur: 0.09, v: 0.05, type: 'square', gap: 0.07 }); s.tone(t + 0.5, { f: s.hz(84), dur: 0.5, v: 0.05, type: 'square' }); s.tone(t + 0.5, { f: s.hz(76), dur: 0.5, v: 0.035, type: 'triangle' }); },
    open(s, t) { s.tone(t, { f: 300, f2: 900, dur: 0.1, v: 0.045, type: 'square' }); },
    close(s, t) { s.tone(t, { f: 900, f2: 300, dur: 0.1, v: 0.045, type: 'square' }); },
    ok(s, t) { s.notes(t, [s.hz(79), s.hz(83), s.hz(86), s.hz(91)], { dur: 0.08, v: 0.05, type: 'square', gap: 0.06 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="ar-cv"></canvas><div class="ar-crt"></div><i class="ar-probe"></i>
      <div class="ar-sr"><span data-bind="title"></span> <span data-bind="artist"></span></div>
      <div class="ar-panel" data-ui>${R.ui.seek('ar-seek')}${R.ui.ctrl('ar-ctrl')}</div>`;
    const cv = root.querySelector('.ar-cv'), ctx = cv.getContext('2d', { alpha: false }), panel = root.querySelector('.ar-panel'), probe = root.querySelector('.ar-probe');
    const rnd = R.rng(1984), low = api.low();
    const PF = '"Press Start 2P", "PingFang TC", "Hiragino Sans", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    const HAN = /[⺀-鿿가-힯豈-﫿＀-￯]/;
    // the game runs at a low resolution; the canvas is shown scaled up with crisp pixels
    let P = 2, S = 2, W = 160, H = 300, visW = 160, base = 250, ground = 250, topY = 30;
    function resize() {
      const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight;
      P = Math.max(2, Math.round(Math.min(w, h) / 250));
      S = P <= 2 ? 2 : 1;   // sprites keep about the same size on screen
      W = Math.ceil(w / P); H = Math.ceil(h / P);
      cv.width = W; cv.height = H; cv.style.width = W * P + 'px'; cv.style.height = H * P + 'px';
      root.style.setProperty('--px', P + 'px');
      const side = panel.offsetLeft > w * 0.3;   // landscape phone: the control panel stands on the right
      visW = side ? Math.floor(panel.offsetLeft / P) : W;
      base = side ? Math.floor(H * 0.84) : Math.floor(panel.offsetTop / P) - 14;
      if (!ground || Math.abs(ground - base) > H) ground = base;
      topY = Math.ceil(probe.offsetTop / P);   // below the dock and the notch
      sunC = null;
    }
    // ---- thresholded text: canvas text with its anti-aliasing snapped off, so it sits on the pixel grid ----
    const tcache = new Map();
    function txt(str, col, size, ol) {
      const key = str + '|' + col + '|' + size + '|' + (ol || '');
      let c = tcache.get(key); if (c) return c;
      const f = `${size}px ${PF}`, m = document.createElement('canvas').getContext('2d'); m.font = f;
      const w = Math.max(1, Math.ceil(m.measureText(str).width) + 4), h = Math.ceil(size * 1.35) + 4;
      c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.font = f; x.textBaseline = 'top';
      if (ol) { x.fillStyle = ol; for (const [dx, dy] of [[1, 2], [3, 2], [2, 1], [2, 3], [3, 3]]) x.fillText(str, dx, dy); }
      x.fillStyle = col; x.fillText(str, 2, 2);
      const d = x.getImageData(0, 0, w, h), a = d.data;
      for (let i = 3; i < a.length; i += 4) a[i] = a[i] > 110 ? 255 : 0;
      x.putImageData(d, 0, 0);
      tcache.set(key, c); if (tcache.size > 70) tcache.delete(tcache.keys().next().value);
      return c;
    }
    if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"').then(() => tcache.clear()).catch(() => {});
    const blit = (c, x, y) => ctx.drawImage(c, Math.round(x), Math.round(y));
    // ---- pre-rendered bits ----
    const SKY = ['#140c33', '#2a1252', '#4d1a6e', '#7d2483', '#b8367f', '#ea5a72', '#ff8f5e'];
    const dith = SKY.slice(0, -1).map((a, i) => { const c = document.createElement('canvas'); c.width = c.height = 2; const x = c.getContext('2d'); x.fillStyle = a; x.fillRect(0, 0, 2, 2); x.fillStyle = SKY[i + 1]; x.fillRect(1, 0, 1, 1); x.fillRect(0, 1, 1, 1); return ctx.createPattern(c, 'repeat'); });
    const tile = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); return ctx.createPattern(c, 'repeat'); };
    const brick = tile(16, 8, (x) => { x.fillStyle = '#7a4a2a'; x.fillRect(0, 0, 16, 8); x.fillStyle = '#5c3520'; x.fillRect(0, 3, 16, 1); x.fillRect(0, 7, 16, 1); x.fillRect(4, 0, 1, 3); x.fillRect(12, 4, 1, 3); x.fillStyle = '#9a6238'; x.fillRect(1, 1, 2, 1); x.fillRect(8, 5, 2, 1); });
    const grass = tile(8, 3, (x) => { x.fillStyle = '#3ddc84'; x.fillRect(0, 0, 8, 3); x.fillStyle = '#a0ffb0'; x.fillRect(1, 0, 2, 1); x.fillRect(5, 0, 1, 1); x.fillStyle = '#239a5a'; x.fillRect(0, 2, 8, 1); x.fillRect(3, 1, 1, 1); });
    let sunC = null;
    function sunSprite(r) {
      const c = document.createElement('canvas'); c.width = c.height = r * 2 + 2; const x = c.getContext('2d');
      for (let y = -r; y <= r; y++) {
        const f = (y + r) / (2 * r);
        if (y > 0 && (y % Math.max(2, 7 - Math.floor(f * 6))) < Math.floor(1 + f * 2.2)) continue;   // the stripes widen towards the bottom
        const half = Math.floor(Math.sqrt(r * r - y * y));
        x.fillStyle = R.color.mix('#ffe16b', '#ff3d8b', f); x.fillRect(r + 1 - half, r + 1 + y, half * 2, 1);
      }
      return c;
    }
    const mtn = (() => { const L = 256, hs = []; for (let i = 0; i < L; i++) { const a = (i / L) * R.TAU; hs.push(Math.round(14 + 8 * Math.sin(a + 1) + 5 * Math.sin(a * 3 + 2) + 3 * Math.sin(a * 7))); } return hs; })();
    const cloud = (() => {
      const c = document.createElement('canvas'); c.width = 44; c.height = 16; const x = c.getContext('2d');
      const puffs = [[10, 10, 6], [20, 7, 8], [31, 9, 7], [38, 11, 5]];
      const inside = (px, py) => puffs.some(([cx, cy, r]) => (px - cx) ** 2 + (py - cy) ** 2 <= r * r);
      for (let py = 0; py < 16; py++) for (let px = 0; px < 44; px++) {
        if (!inside(px + 0.5, py + 0.5) || py > 13) continue;
        x.fillStyle = !inside(px + 0.5, py - 1.5) ? '#ffe0ee' : py > 11 ? '#c46aa0' : '#ff9ec7'; x.fillRect(px, py, 1, 1);
      }
      return c;
    })();
    const city = (() => { const r = R.rng(7), out = []; let x = 0; while (x < 300) { const w = 10 + Math.floor(r() * 4) * 3, h = 22 + Math.floor(r() * 16) * 3; out.push({ x, w, h, band: Math.floor(r() * 26) + 2, col: ['#ffd75e', '#5ef1ff', '#ff79c6', '#b8ff5e'][Math.floor(r() * 4)], ant: r() < 0.3 }); x += w + 1 + Math.floor(r() * 4); } return { out, L: x + 4 }; })();
    const noteImg = (() => { const c = document.createElement('canvas'); c.width = 9; c.height = 11; const x = c.getContext('2d'); const k = '#1b1b2f', y = '#ffd75e';
      x.fillStyle = k; x.fillRect(4, 0, 4, 2); x.fillRect(4, 0, 2, 9); x.fillRect(0, 6, 6, 5); x.fillRect(7, 0, 2, 4);
      x.fillStyle = y; x.fillRect(5, 1, 1, 7); x.fillRect(6, 1, 2, 1); x.fillRect(7, 1, 1, 2); x.fillRect(1, 7, 4, 3); x.fillStyle = '#fff6c0'; x.fillRect(2, 7, 1, 1); return c; })();
    // ---- the hero: a round little pixel pal in big headphones ----
    function hero(x, y, frame, col, air) {
      const k = '#1b1b2f', px = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
      const bob = !air && frame ? -1 : 0;
      px(3, 0 + bob, 6, 1, k); px(2, 1 + bob, 1, 2, k); px(9, 1 + bob, 1, 2, k);
      px(3, 2 + bob, 6, 1, k); px(2, 3 + bob, 1, 1, k); px(9, 3 + bob, 1, 1, k); px(1, 4 + bob, 1, 5, k); px(10, 4 + bob, 1, 5, k); px(2, 9 + bob, 1, 1, k); px(9, 9 + bob, 1, 1, k); px(3, 10 + bob, 6, 1, k);
      px(3, 3 + bob, 6, 1, col); px(2, 4 + bob, 8, 5, col); px(3, 9 + bob, 6, 1, col);
      px(3, 4 + bob, 2, 1, '#ffffff');
      px(-1, 4 + bob, 2, 4, '#ff4d8d'); px(11, 4 + bob, 2, 4, '#ff4d8d'); px(-1, 4 + bob, 1, 1, '#ff9ab8'); px(11, 4 + bob, 1, 1, '#ff9ab8');
      px(5, 5 + bob, 2, 2, '#ffffff'); px(8, 5 + bob, 2, 2, '#ffffff'); px(6, 6 + bob, 1, 1, k); px(9, 6 + bob, 1, 1, k);
      px(4, 8 + bob, 1, 1, '#ff8fab'); px(7, 8 + bob, 2, 1, k);
      if (air) { px(3, 11, 3, 1, k); px(7, 11, 3, 1, k); }
      else if (frame) { px(2, 11, 3, 1, k); px(8, 11, 3, 1, k); }
      else { px(4, 11, 3, 1, k); px(6, 11, 3, 1, k); }
    }
    // ---- state ----
    let scroll = 0, score = 0, shown = 0, hi = 50000, stage = 1, combo = 0;
    const H0 = { y: 0, vy: 0, air: false, land: 0 };
    const notes = [], parts = [], pops = [];
    let card = null, pending = null, coverPx = null, swapT = 9, enterT = 9, fever = 0, shake = 0;
    const setCard = (tk) => {
      card = tk ? { t: tk.title || '', a: tk.artist || '', id: tk.id } : null; coverPx = null;
      if (!tk) return;
      api.coverImage(tk).then((im) => {
        if (!im || !card || card.id !== tk.id) return;
        const n = 34, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d');
        x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, n, n);
        const d = x.getImageData(0, 0, n, n), a = d.data, q = (v) => Math.round((v / 255) * 4) * 63.75;
        for (let i = 0; i < a.length; i += 4) { a[i] = q(a[i]); a[i + 1] = q(a[i + 1]); a[i + 2] = q(a[i + 2]); }
        x.putImageData(d, 0, 0); coverPx = c;
      }).catch(() => {});
    };
    const burst = (x, y, n, cols, sp) => { for (let i = 0; i < n; i++) { const a = rnd() * R.TAU, s = (sp || 50) * (0.4 + rnd() * 0.8); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.5 + rnd() * 0.6, c: cols[i % cols.length], g: 1 }); } if (parts.length > 500) parts.splice(0, parts.length - 500); };
    const jump = (hgt) => { H0.vy = -Math.sqrt(2 * 420 * S * hgt); H0.air = true; };
    api.on('hot', (on) => { if (on) { shake = 1; for (let i = 0; i < 4; i++) api.later(() => burst(visW * (0.2 + rnd() * 0.6), ground * (0.15 + rnd() * 0.35), low ? 18 : 30, ['#ffd75e', '#ff4d8d', '#5ef1ff', '#b8ff5e', '#ffffff'], 70), i * 140); } });
    api.beat((s) => {
      if (!H0.air) jump(((R.viz.hot > 0.5 ? 24 : 12) + s * 10) * S);
      score += 10;
      if (rnd() < 0.75) notes.push({ x: visW + 4, y: ground - (14 + Math.floor(rnd() * 20)) * S, ph: rnd() * 6 });
      if (R.viz.hot > 0.5 && rnd() < 0.7) burst(visW * (0.15 + rnd() * 0.7), ground * (0.12 + rnd() * 0.4), low ? 14 : 24, [['#ffd75e', '#ff4d8d'], ['#5ef1ff', '#ffffff'], ['#b8ff5e', '#ff79c6']][Math.floor(rnd() * 3)], 55);
    });
    resize();
    setCard(api.track());
    const party = () => document.body.classList.contains('party') && !document.body.classList.contains('peek');
    return {
      enter() { enterT = 0; },
      swap() { swapT = 0; stage++; combo = 0; if (!H0.air) jump(26 * S); },
      onTrack(tk) { if (swapT < 0.75) pending = tk || null; else setCard(tk); },
      onMeta(tk) { if (card && tk && card.id === tk.id) { card.t = tk.title || ''; card.a = tk.artist || ''; } },
      resize,
      frame(dt, t, v) {
        enterT += dt; swapT += dt;
        if (pending && swapT >= 0.75) { setCard(pending); pending = null; }
        fever += ((v.hot > 0.5 ? 1 : 0) - fever) * (1 - Math.exp(-dt * 4));
        const target = party() ? Math.floor(H * 0.86) : base;
        ground += (target - ground) * (1 - Math.exp(-dt * 6));
        const gy = Math.round(ground), hy = gy - 6;
        const speed = (v.playing ? 1 : 0) * 26 * Math.min(1.6, Math.max(0.7, (v.bpm || 110) / 110)) * (1 + fever * 0.8);
        scroll += speed * dt;
        shake *= Math.exp(-dt * 5);
        ctx.imageSmoothingEnabled = false;
        ctx.save();
        if (shake > 0.05) ctx.translate(Math.round((rnd() - 0.5) * 2 * shake), Math.round((rnd() - 0.5) * 2 * shake));
        // sky in dithered bands
        const bh = Math.max(4, Math.floor(hy / SKY.length));
        for (let i = 0; i < SKY.length; i++) { ctx.fillStyle = SKY[i]; ctx.fillRect(0, i * bh, W, i === SKY.length - 1 ? H : bh); }
        for (let i = 0; i < SKY.length - 1; i++) { ctx.fillStyle = dith[i]; ctx.fillRect(0, (i + 1) * bh - 2, W, 4); }
        // stars
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 36; i++) { const sx = (i * 97 + 13) % W, sy = (i * 53 + 7) % Math.max(10, Math.floor(hy * 0.45)); if (R.noise1(t * 1.5 + i * 7.3, i) > 0.35) ctx.fillRect(sx, sy, 1, 1); }
        // the striped sun
        const sr = Math.max(14, Math.round(Math.min(visW, H) * 0.17));
        if (!sunC || sunC.width !== sr * 2 + 2) sunC = sunSprite(sr);
        blit(sunC, Math.round(visW * 0.66) - sr - 1, hy - 58 - sr - Math.round(v.bass * 2));
        for (let i = 0; i < 3; i++) { const cx = ((i * 137 + 40 - scroll * (0.05 + i * 0.02) - t * 2) % (W + 60) + W + 60) % (W + 60) - 50; blit(cloud, cx, Math.round(hy * (0.3 + i * 0.13))); }
        // far hills
        ctx.fillStyle = '#2b1650';
        const mo = Math.floor(scroll * 0.12);
        for (let x = 0; x < W; x++) { const hgt = mtn[(x + mo) % 256]; ctx.fillRect(x, hy - hgt, 1, hgt + 6); }
        ctx.fillStyle = '#41226e';
        for (let x = 0; x < W; x += 1) { const hgt = mtn[(x + mo) % 256]; if (mtn[(x + mo + 1) % 256] < hgt) ctx.fillRect(x, hy - hgt, 1, 1); }
        // the city: every building's lit windows follow one band of the spectrum
        const co = scroll * 0.35;
        for (let k = -1; k * city.L < W + city.L; k++) {
          for (const b of city.out) {
            const x = Math.round(b.x + k * city.L - (co % city.L)); if (x > W || x + b.w < 0) continue;
            const top = hy - b.h + 6;
            ctx.fillStyle = '#1d1438'; ctx.fillRect(x, top, b.w, gy - top);
            ctx.fillStyle = '#2c2152'; ctx.fillRect(x, top, b.w, 1);
            if (b.ant) { ctx.fillStyle = '#2c2152'; ctx.fillRect(x + (b.w >> 1), top - 5, 1, 5); ctx.fillStyle = (t * 2 | 0) % 2 ? '#ff4d4d' : '#5a1a2a'; ctx.fillRect(x + (b.w >> 1), top - 6, 1, 1); }
            const cols = Math.floor((b.w - 2) / 3), rows = Math.floor((gy - top - 4) / 4), lvl = Math.pow(v.bands[b.band], 0.8) * (0.25 + 0.75 * Math.min(1, v.level * 1.4 + 0.2));
            const lit = fever > 0.5 ? rows : Math.round(lvl * rows);
            for (let r = 0; r < rows; r++) {
              const on = r < lit, col = on ? (fever > 0.5 ? SKY[3 + ((r + (t * 8 | 0)) % 4)] : b.col) : '#2a2050';
              ctx.fillStyle = col;
              for (let c = 0; c < cols; c++) ctx.fillRect(x + 2 + c * 3, gy - 6 - r * 4, 2, 2);
            }
          }
        }
        // ground
        ctx.save(); ctx.translate(-Math.floor(scroll % 16), gy + 3); ctx.fillStyle = brick; ctx.fillRect(0, 0, W + 16, H - gy); ctx.restore();
        ctx.save(); ctx.translate(-Math.floor(scroll % 8), gy); ctx.fillStyle = grass; ctx.fillRect(0, 0, W + 8, 3); ctx.restore();
        // hero
        const hx = Math.round(visW * 0.26);
        if (H0.air) { H0.vy += 420 * S * dt; H0.y += H0.vy * dt; if (H0.y >= 0) { H0.y = 0; H0.vy = 0; H0.air = false; burst(hx + 6 * S, gy, 4, ['#d9d2ff'], 14); } }
        const heroY = gy - 12 * S + Math.round(H0.y);
        // notes drifting in from the right; touching one scores
        for (let i = notes.length - 1; i >= 0; i--) {
          const n = notes[i]; n.x -= speed * dt;
          const ny = Math.round(n.y + Math.sin(t * 4 + n.ph) * 2);
          if (n.x < -10) { notes.splice(i, 1); combo = 0; continue; }
          if (n.x < hx + 12 * S && n.x + 9 * S > hx && ny < heroY + 12 * S && ny + 11 * S > heroY) {
            notes.splice(i, 1); combo++; const pts = 100 * Math.min(8, combo); score += pts;
            pops.push({ x: n.x, y: ny, s: '+' + pts, life: 0.9 });
            burst(n.x + 4, ny + 5, 8, ['#ffd75e', '#ffffff'], 40);
            continue;
          }
          ctx.drawImage(noteImg, Math.round(n.x), ny, 9 * S, 11 * S);
        }
        const heroCol = fever > 0.5 ? SKY[3 + ((t * 12 | 0) % 4)] : '#ffd75e';
        if (fever > 0.5 && (t * 20 | 0) % 2) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(hx - 4 * S - ((t * 60) % 3 | 0), heroY + 4 * S, 3 * S, 4 * S); }
        ctx.save(); ctx.translate(hx, heroY); ctx.scale(S, S); hero(0, 0, (scroll / 5 | 0) % 2, heroCol, H0.air); ctx.restore();
        // particles + score pops
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
          p.vy += 90 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.life > 0.3 ? 2 : 1, p.life > 0.3 ? 2 : 1);
        }
        for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.life -= dt; p.y -= 14 * dt; if (p.life <= 0) { pops.splice(i, 1); continue; } blit(txt(p.s, '#ffffff', 8, '#1b1b2f'), p.x - 6, p.y - 8); }
        // HUD: score counts up
        shown += Math.ceil((score - shown) * Math.min(1, dt * 8)); if (shown > score) shown = score; hi = Math.max(hi, shown);
        const pad = (n) => String(Math.min(999999, n)).padStart(6, '0');
        let cardB = 0;
        if (!party()) {
          let y = topY;
          if ((t * 2 | 0) % 2) blit(txt('1UP', '#ff4d6d', 8, '#1b1b2f'), 4, y);
          blit(txt(pad(shown), '#ffffff', 8, '#1b1b2f'), 32, y);
          y += 12; blit(txt('HI ' + pad(hi), '#ffd75e', 8, '#1b1b2f'), 4, y);
          // stage card: cover, stage number, title (scrolls when long), artist
          if (card) {
            const cw = Math.min(visW - 8, 220), x0 = 4, y0 = y + 14, chh = 44;
            cardB = y0 + chh;
            ctx.fillStyle = '#1b1b2f'; ctx.fillRect(x0, y0, cw, chh);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 + 1, y0 + 1, cw - 2, chh - 2);
            ctx.fillStyle = '#28206a'; ctx.fillRect(x0 + 2, y0 + 2, cw - 4, chh - 4);
            ctx.fillStyle = '#1b1b2f'; ctx.fillRect(x0 + 4, y0 + 4, 36, 36);
            if (coverPx) blit(coverPx, x0 + 5, y0 + 5); else { ctx.fillStyle = '#4d1a6e'; ctx.fillRect(x0 + 5, y0 + 5, 34, 34); }
            const tx = x0 + 45, tw = cw - 49;
            blit(txt('STAGE ' + String(stage).padStart(2, '0'), '#ffd75e', 8), tx, y0 + 4);
            const big = HAN.test(card.t), tt = txt(card.t || '—', '#ffffff', big ? 11 : 8);
            ctx.save(); ctx.beginPath(); ctx.rect(tx, y0 + 14, tw, 16); ctx.clip();
            const ty = y0 + (big ? 13 : 16);
            if (tt.width > tw) { const L = tt.width + 24, o = (t * 18) % L; blit(tt, tx - o, ty); blit(tt, tx - o + L, ty); }   // marquee
            else blit(tt, tx, ty);
            ctx.restore();
            const at = txt(card.a || '', '#5ef1ff', HAN.test(card.a) ? 10 : 8);
            ctx.save(); ctx.beginPath(); ctx.rect(tx, y0 + 30, tw, 12); ctx.clip(); blit(at, tx, y0 + 30); ctx.restore();
          }
        }
        // FEVER banner
        if (fever > 0.3) {
          const fc = ['#ffd75e', '#ff4d8d', '#5ef1ff', '#b8ff5e'][(t * 10 | 0) % 4], ft = txt('FEVER!!', fc, 16, '#1b1b2f');
          const fy = Math.min(hy - 40, Math.max(Math.round(hy * 0.42), cardB + 8));
          blit(ft, Math.round(visW / 2 - ft.width / 2), Math.round(fy + Math.sin(t * 9) * 2));
          if (combo > 1) { const ct = txt(combo + ' COMBO', '#ffffff', 8, '#1b1b2f'); blit(ct, Math.round(visW / 2 - ct.width / 2), fy + 22); }
        }
        // song change: STAGE CLEAR, block wipe, next stage
        if (swapT < 1.45) {
          const cell = 8, cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
          let p = swapT < 0.4 ? 0 : swapT < 0.75 ? (swapT - 0.4) / 0.35 : swapT < 0.95 ? 1 : 1 - (swapT - 0.95) / 0.45;
          if (p > 0) {
            ctx.fillStyle = '#0a0618';
            for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const f = (i + j) / (cols + rows); if (f < p * 1.15 - 0.05) ctx.fillRect(i * cell, j * cell, cell, cell); }
          }
          if (swapT < 0.42) { const st = txt('STAGE CLEAR!', '#ffd75e', 8, '#1b1b2f'); blit(st, Math.round(visW / 2 - st.width / 2), Math.round(hy * 0.5)); }
          else if (swapT > 0.72 && swapT < 1.2) { const st = txt('STAGE ' + String(stage).padStart(2, '0'), '#ffffff', 16, '#1b1b2f'); blit(st, Math.round(W / 2 - st.width / 2), Math.round(H * 0.4)); }
        }
        // power on: PRESS START, then the screen opens
        if (enterT < 1.5) {
          const cell = 8, cols = Math.ceil(W / cell), rows = Math.ceil(H / cell), p = enterT < 0.7 ? 1 : 1 - (enterT - 0.7) / 0.6;
          ctx.fillStyle = '#0a0618';
          if (p >= 1) ctx.fillRect(0, 0, W, H);
          else for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const f = (Math.abs(i - cols / 2) + Math.abs(j - rows / 2)) / (cols / 2 + rows / 2); if (f > 1 - p) ctx.fillRect(i * cell, j * cell, cell, cell); }
          if (enterT < 0.7 && (enterT * 6 | 0) % 2 === 0) { const st = txt('PRESS START', '#ffffff', 8, '#1b1b2f'); blit(st, Math.round(W / 2 - st.width / 2), Math.round(H * 0.42)); }
        }
        ctx.restore();
      },
    };
  },
});
