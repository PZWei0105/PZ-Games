/* ===================== skin: 重鍛 HEAVY FORGE — a hydraulic forging press that strikes on the kick drum =====================
   A 2400-ton press stands in front of a furnace. The ram falls on every kick drum and lands exactly on it (the strikes
   are read ahead from the song's drum hits, so the fall starts before the hit): the picture holds for a moment, shakes,
   sparks fly off the glowing billet, a shock ring runs across the floor and the pressure gauge jumps. The bar's first
   beat is the heaviest blow; snare hits throw sparks sideways. In the chorus the furnace roars, the ram strikes twice
   as often and the billet — the song's cover pressed into hot steel — is beaten into a round medal; when the chorus
   ends it is quenched in a cloud of steam and held up to the light. Tap the press for a blow of your own. */
R.skins.def({
  id: 'forge', name: '重鍛', group: '酷炫', en: 'HEAVY FORGE',
  desc: '液壓鍛壓機跟著大鼓砸下：頓格、震動、火花、衝擊波、壓力錶；副歌鍛爐全開連打，把封面鍛成一枚徽章',
  bloom: { s: 0.58, th: 0.64, streak: 0.32, tint: '#ff9a3c' }, hero: '.fg-art', trans: 'shatter', hype: false,
  theme: { bg: '#0b0706', fg: '#fff1e2', accent: '#ff7a1f', accent2: '#ffc56b', ui: 'rgba(18,12,9,.97)', dock: 'rgba(30,18,10,.55)', dockfg: '#ffcf96' },
  enterMs: 2000, swapMs: 1200, punch: 0.18,
  emblem: `<svg class="em" viewBox="0 0 116 150"><defs><radialGradient id="fgf" cx=".5" cy=".62" r=".55"><stop offset="0" stop-color="#ffcf6b"/><stop offset=".35" stop-color="#ff6a14" stop-opacity=".8"/><stop offset="1" stop-color="#ff3d00" stop-opacity="0"/></radialGradient><linearGradient id="fgs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b7078"/><stop offset=".5" stop-color="#2c2f34"/><stop offset="1" stop-color="#15171a"/></linearGradient><linearGradient id="fgi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4c8"/><stop offset=".5" stop-color="#ffb030"/><stop offset="1" stop-color="#e2470c"/></linearGradient></defs><rect width="116" height="150" fill="#0d0806"/><path d="M28 112V62a30 30 0 0 1 60 0v50z" fill="#1a0a05"/><ellipse cx="58" cy="96" rx="34" ry="28" fill="url(#fgf)"/><rect x="8" y="14" width="10" height="122" fill="url(#fgs)"/><rect x="98" y="14" width="10" height="122" fill="url(#fgs)"/><rect x="4" y="8" width="108" height="14" fill="url(#fgs)"/><rect x="51" y="22" width="14" height="24" fill="#c9ced6"/><rect x="26" y="44" width="64" height="30" rx="2" fill="url(#fgs)"/><path d="M32 74h52v6H32z" fill="#f2c230"/><path d="M36 74l4 6M46 74l4 6M56 74l4 6M66 74l4 6M76 74l4 6" stroke="#111" stroke-width="2.6"/><rect x="34" y="96" width="48" height="10" rx="1.5" fill="url(#fgi)"/><path d="M24 106h68l-6 8H30z" fill="#2c2f34"/><path d="M38 114h40l4 22H34z" fill="#1d1f23"/><g stroke="#ffd27a" stroke-width="1.4" stroke-linecap="round"><path d="M30 94l-12-10M86 94l13-9M32 99l-16-2M84 99l17-3M40 92l-6-14M76 92l7-13"/></g><circle cx="58" cy="94" r="7" fill="#fff" opacity=".85"/></svg>`,
  sfx: {
    tap(s, t) { s.noise(t, { f: 2400, dur: 0.03, v: 0.06, q: 3 }); s.tone(t, { f: 180, f2: 110, dur: 0.06, v: 0.06, type: 'square', lp: 1600 }); },
    tick(s, t) { s.noise(t, { f: 4200, dur: 0.018, v: 0.04, q: 5 }); },
    toggle(s, t) { s.tone(t, { f: 90, f2: 70, dur: 0.08, v: 0.08, type: 'square', lp: 900 }); s.noise(t, { f: 3000, dur: 0.03, v: 0.05, q: 4 }); },
    play(s, t) { s.noise(t, { f: 800, f2: 200, dur: 0.35, v: 0.06, q: 1 }); s.tone(t, { f: 55, f2: 40, dur: 0.5, v: 0.12, type: 'sine' }); s.tone(t + 0.02, { f: 1250, dur: 0.6, v: 0.025, type: 'triangle' }); },
    pause(s, t) { s.noise(t, { f: 600, f2: 150, dur: 0.5, v: 0.05, q: 1 }); s.tone(t, { f: 70, f2: 45, dur: 0.4, v: 0.08, type: 'sine' }); },
    next(s, t) { s.noise(t, { f: 3000, dur: 0.04, v: 0.07, q: 4 }); s.tone(t, { f: 140, f2: 90, dur: 0.12, v: 0.09, type: 'square', lp: 1200 }); s.tone(t + 0.01, { f: 1480, dur: 0.35, v: 0.02, type: 'triangle' }); },
    prev(s, t) { s.noise(t, { f: 2600, dur: 0.04, v: 0.07, q: 4 }); s.tone(t, { f: 120, f2: 80, dur: 0.12, v: 0.09, type: 'square', lp: 1200 }); },
    enter(s, t) { s.noise(t, { f: 200, f2: 900, dur: 1.2, v: 0.05, q: 0.8 }); s.tone(t, { f: 40, f2: 70, dur: 1.4, v: 0.08, type: 'sawtooth', lp: 300 }); s.noise(t + 1.35, { f: 3200, dur: 0.06, v: 0.12, q: 2 }); s.tone(t + 1.35, { f: 70, f2: 38, dur: 0.5, v: 0.16, type: 'sine' }); s.tone(t + 1.36, { f: 1320, dur: 0.9, v: 0.03, type: 'triangle' }); },
    open(s, t) { s.tone(t, { f: 300, f2: 420, dur: 0.07, v: 0.04, type: 'square', lp: 1800 }); },
    close(s, t) { s.tone(t, { f: 420, f2: 300, dur: 0.07, v: 0.04, type: 'square', lp: 1800 }); },
    ok(s, t) { s.tone(t, { f: 1320, dur: 0.5, v: 0.03, type: 'triangle' }); s.tone(t + 0.08, { f: 1760, dur: 0.5, v: 0.025, type: 'triangle' }); },
    strike(s, t) { s.noise(t, { f: 3600, dur: 0.05, v: 0.12, q: 1.6 }); s.tone(t, { f: 78, f2: 36, dur: 0.35, v: 0.18, type: 'sine' }); s.tone(t, { f: 1180, dur: 0.7, v: 0.035, type: 'triangle' }); s.tone(t, { f: 1770, dur: 0.45, v: 0.02, type: 'triangle' }); },
    hiss(s, t) { s.noise(t, { f: 5200, f2: 2400, dur: 1.6, v: 0.07, q: 0.7 }); s.noise(t, { f: 900, dur: 0.6, v: 0.04, q: 0.6 }); },
  },
  mount(root, api) {
    root.innerHTML = `<canvas class="fg-cv"></canvas>
      <div class="fg-hud" data-ui><b>HEAVY FORGE</b><span>PRESS · <em data-fg="t">0</em> t</span></div>
      <div class="fg-panel">
        <div class="fg-row" data-ui>
          <div class="fg-art"><img data-bind="cover" alt="" draggable="false"></div>
          <div class="fg-tx"><div class="fg-t" data-bind="title"></div><div class="fg-a" data-bind="artist"></div></div>
        </div>
        ${R.ui.seek('fg-seek')}
        ${R.ui.ctrl('fg-ctrl')}
      </div>`;
    const cvEl = root.querySelector('.fg-cv'), cv = api.canvas(cvEl, { dprMax: 2 });
    const panel = root.querySelector('.fg-panel'), tonEl = root.querySelector('[data-fg="t"]');
    const SQ = 0.42;                       // top faces: depth seen from a little above
    const REST = 118, FLOOR_BACK = -64;     // ram lift at rest; where the floor meets the wall
    const rnd = R.rng(77);

    /* ---------- drawing helpers (virtual units: origin on the floor under the anvil, y up is negative) ---------- */
    const rr = (c, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    // a rounded rectangle with elliptical corners (a squashed top face); rx = ry/SQ gives a disc seen from above
    function rrE(c, cx, cy, w, h, rx, ry) {
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
      c.beginPath(); c.moveTo(x0 + rx, y0); c.lineTo(x1 - rx, y0); c.ellipse(x1 - rx, y0 + ry, rx, ry, 0, -Math.PI / 2, 0); c.lineTo(x1, y1 - ry);
      c.ellipse(x1 - rx, y1 - ry, rx, ry, 0, 0, Math.PI / 2); c.lineTo(x0 + rx, y1); c.ellipse(x0 + rx, y1 - ry, rx, ry, 0, Math.PI / 2, Math.PI);
      c.lineTo(x0, y0 + ry); c.ellipse(x0 + rx, y0 + ry, rx, ry, 0, Math.PI, Math.PI * 1.5); c.closePath();
    }
    const steel = (c, x0, y0, x1, y1, a, b, m) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(0.5, m || b); g.addColorStop(1, b); return g; };
    function bolts(c, xs, y, r) { for (const x of xs) { const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, '#9aa0a8'); g.addColorStop(0.6, '#3a3d42'); g.addColorStop(1, '#141518'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, R.TAU); c.fill(); } }
    function hazard(c, x, y, w, h) {
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.fillStyle = '#e8b21c'; c.fillRect(x, y, w, h);
      c.fillStyle = '#121212'; for (let k = -h; k < w + h; k += h * 1.6) { c.beginPath(); c.moveTo(x + k, y + h); c.lineTo(x + k + h * 0.8, y + h); c.lineTo(x + k + h * 1.8, y); c.lineTo(x + k + h, y); c.closePath(); c.fill(); }
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x, y + h * 0.75, w, h * 0.25); c.restore();
    }
    // the colour of hot steel: 0 cold, .5 cherry red, .75 orange, 1 yellow, 1.2 white
    const HEAT = [[0, [42, 40, 40]], [0.32, [92, 18, 8]], [0.52, [190, 38, 10]], [0.72, [255, 104, 18]], [0.9, [255, 186, 64]], [1.08, [255, 236, 186]], [1.3, [255, 255, 245]]];
    function heatRGB(T) {
      T = Math.max(0, Math.min(1.3, T));
      for (let i = 1; i < HEAT.length; i++) if (T <= HEAT[i][0]) { const [t0, a] = HEAT[i - 1], [t1, b] = HEAT[i], f = (T - t0) / (t1 - t0); return [0, 1, 2].map((j) => Math.round(a[j] + (b[j] - a[j]) * f)); }
      return HEAT[HEAT.length - 1][1];
    }
    const SPARK = [0, 1, 2, 3, 4].map((k) => `rgb(${heatRGB(1.25 - (k + 0.5) / 5 * 0.85).join(',')})`);
    const rgb = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a == null ? 1 : a})`;

    /* ---------- layout ---------- */
    let L = null, under = null, mid = null, over = null, ramC = null, rodG = null, coverC = null;
    function layout() {
      const { w, h } = cv, r0 = root.getBoundingClientRect(), pr = panel.getBoundingClientRect();
      const land = w > h * 1.12, st = parseFloat(getComputedStyle(root).getPropertyValue('--st')) || 0;
      const box = land ? { x: 6, y: st + 8, w: Math.max(220, pr.left - r0.left - 12), h: h - st - 14 }
        : { x: 0, y: st + 66, w, h: Math.max(240, pr.top - r0.top - st - 66 - 2) };
      const k = Math.min(box.w / 470, box.h / 590);
      L = { land, box, k, ox: box.x + box.w / 2, oy: box.y + box.h - 18 * k };
      build();
    }
    const VX = (x) => L.ox + x * L.k, VY = (y) => L.oy + y * L.k;
    function mk() { const d = Math.min(2, cv.dpr), c = document.createElement('canvas'); c.width = Math.max(2, Math.round(cv.w * d)); c.height = Math.max(2, Math.round(cv.h * d)); return [c, c.getContext('2d'), d]; }
    const virt = (x, d) => x.setTransform(d * L.k, 0, 0, d * L.k, d * L.ox, d * L.oy);
    const scr = (x, d) => x.setTransform(d, 0, 0, d, 0, 0);
    function archPath(c) { c.beginPath(); c.moveTo(-124, -150); c.lineTo(-124, -262); c.arc(0, -262, 124, Math.PI, 0); c.lineTo(124, -150); c.closePath(); }

    function build() {
      const { w, h } = cv, { k } = L;
      let x, d;
      /* under: brick wall lit by the furnace, the furnace arch (its fire is drawn live), the floor */
      [under, x, d] = mk(); scr(x, d);
      const wallY = VY(FLOOR_BACK);
      x.fillStyle = '#120b08'; x.fillRect(0, 0, w, h);
      const bh = 21 * k, bw = 50 * k;
      for (let row = 0, y = wallY - bh; y > -bh; row++, y -= bh) {
        for (let xx = -((row % 2) * bw / 2) - bw; xx < w + bw; xx += bw) {
          const v = rnd(), c0 = [52 + v * 26, 26 + v * 12, 18 + v * 8];
          x.fillStyle = rgb(c0.map(Math.round)); x.fillRect(xx + 1.2, y + 1.2, bw - 2.4, bh - 2.4);
          x.fillStyle = 'rgba(0,0,0,' + (0.1 + rnd() * 0.25).toFixed(2) + ')'; x.fillRect(xx + 1.2, y + bh * 0.55, bw - 2.4, bh * 0.45 - 1.2);
          if (rnd() < 0.18) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(xx + bw * rnd(), y + 2, 2 + rnd() * 5, 1.5); }
        }
      }
      // light falls off from the furnace; soot above it
      const fx = VX(0), fy = VY(-230);
      let g = x.createRadialGradient(fx, fy, 30 * k, fx, fy, Math.max(w, h) * 0.9);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,.92)'); x.fillStyle = g; x.fillRect(0, 0, w, wallY);
      g = x.createRadialGradient(fx, VY(-420), 0, fx, VY(-420), 260 * k); g.addColorStop(0, 'rgba(5,3,2,.7)'); g.addColorStop(1, 'rgba(5,3,2,0)'); x.fillStyle = g; x.fillRect(0, 0, w, wallY);
      // floor: dark tread plate, the line where it meets the wall, perspective rows
      g = x.createLinearGradient(0, wallY, 0, h); g.addColorStop(0, '#1d1511'); g.addColorStop(0.25, '#120d0a'); g.addColorStop(1, '#060403'); x.fillStyle = g; x.fillRect(0, wallY, w, h - wallY);
      x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(0, wallY - 3 * k, w, 6 * k);
      for (let i = 1, y = wallY; y < h; i++) {
        const gap = (4 + i * 2.2) * k; y += gap;
        x.strokeStyle = `rgba(255,200,150,${(0.035 - Math.min(0.025, i * 0.0015)).toFixed(3)})`; x.lineWidth = Math.max(0.6, gap * 0.12);
        const sp = 16 * k * (0.6 + i * 0.12);
        for (let xx = (i % 2) * sp / 2; xx < w; xx += sp) { x.beginPath(); x.moveTo(xx, y); x.lineTo(xx + sp * 0.35, y - gap * 0.25); x.stroke(); }
      }
      // the furnace arch (virtual units): voussoirs, the hearth sill, a dark mouth
      virt(x, d);
      x.fillStyle = '#0a0302'; archPath(x); x.fill();
      for (let i = 0; i <= 14; i++) {
        const a0 = Math.PI + (i / 15) * Math.PI, a1 = Math.PI + ((i + 1) / 15) * Math.PI - 0.02;
        x.beginPath(); x.arc(0, -262, 146, a0, a1); x.arc(0, -262, 124, a1, a0, true); x.closePath();
        x.fillStyle = i % 2 ? '#3a1f15' : '#4a281b'; x.fill(); x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 1.5; x.stroke();
      }
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { x.fillStyle = i % 2 ? '#3a1f15' : '#4a281b'; x.fillRect(s > 0 ? 124 : -146, -262 + i * 22.4, 22, 21); }
      x.fillStyle = steel(x, 0, -160, 0, -138, '#4a3226', '#1e130e'); x.fillRect(-170, -158, 340, 18);
      x.fillStyle = 'rgba(255,140,60,.18)'; x.fillRect(-170, -158, 340, 2);
      // the floor in front of the wall carries the furnace's light
      g = x.createRadialGradient(0, -40, 10, 0, -40, 260); g.addColorStop(0, 'rgba(255,110,30,.16)'); g.addColorStop(1, 'rgba(255,110,30,0)'); x.fillStyle = g; x.fillRect(-300, FLOOR_BACK, 600, 120);

      /* mid: columns, the anvil */
      [mid, x, d] = mk(); virt(x, d);
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? -206 : 168, cw = 38;
        // shadow on the floor, foot flange, column with guide rail and rivets
        x.fillStyle = 'rgba(0,0,0,.55)'; x.beginPath(); x.ellipse(x0 + cw / 2, 2, 46, 9, 0, 0, R.TAU); x.fill();
        x.fillStyle = steel(x, x0 - 12, 0, x0 + cw + 12, 0, '#2a2d32', '#141518', '#4b5058'); x.fillRect(x0 - 12, -24, cw + 24, 24);
        x.fillStyle = '#5a5f67'; x.fillRect(x0 - 12, -40, cw + 24, 16);
        x.fillStyle = steel(x, x0, 0, x0 + cw, 0, '#1c1e22', '#121316', '#3d4249'); x.fillRect(x0, -478, cw, 440);
        const ri = s < 0 ? x0 + cw - 6 : x0; x.fillStyle = steel(x, ri, 0, ri + 6, 0, '#8e949c', '#3f444b'); x.fillRect(ri, -470, 6, 432);
        // rim light from the furnace on the inner edge
        x.fillStyle = 'rgba(255,120,40,.28)'; x.fillRect(s < 0 ? x0 + cw - 9 : x0 + 6, -470, 3, 432);
        for (let y = -440; y < -60; y += 46) bolts(x, [x0 + 9, x0 + cw - 15].map((v) => v + (s < 0 ? 0 : 6)), y, 3.4);
        hazard(x, x0 - 12, -58, cw + 24, 10);
      }
      // anvil: foot, waist, body, horn, heel, top face
      x.fillStyle = 'rgba(0,0,0,.6)'; x.beginPath(); x.ellipse(0, 3, 120, 14, 0, 0, R.TAU); x.fill();
      x.fillStyle = steel(x, -92, 0, 92, 0, '#1b1c1f', '#101113', '#33363b'); x.beginPath(); x.moveTo(-92, 0); x.lineTo(92, 0); x.lineTo(84, -26); x.lineTo(-84, -26); x.closePath(); x.fill();
      x.fillStyle = '#2b2e33'; x.beginPath(); x.moveTo(-84, -26); x.lineTo(84, -26); x.lineTo(74, -36); x.lineTo(-74, -36); x.closePath(); x.fill();
      x.fillStyle = steel(x, -60, 0, 60, 0, '#17181b', '#0e0f11', '#2b2e33');
      x.beginPath(); x.moveTo(-70, -32); x.quadraticCurveTo(-40, -52, -48, -74); x.lineTo(48, -74); x.quadraticCurveTo(40, -52, 70, -32); x.closePath(); x.fill();
      x.fillStyle = steel(x, -106, 0, 106, 0, '#1d1f23', '#121316', '#3a3e44'); x.fillRect(-106, -114, 212, 42);
      x.beginPath(); x.moveTo(-106, -114); x.quadraticCurveTo(-150, -112, -184, -100); x.quadraticCurveTo(-150, -86, -106, -80); x.closePath(); x.fill();
      x.fillRect(106, -114, 30, 22);
      x.fillStyle = steel(x, 0, -136, 0, -114, '#5a5e65', '#34373c'); x.beginPath(); x.moveTo(-106, -114); x.lineTo(-98, -135); x.lineTo(98, -135); x.lineTo(106, -114); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(-106, -114); x.quadraticCurveTo(-150, -112, -184, -100); x.quadraticCurveTo(-150, -118, -100, -132); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,170,90,.32)'; x.fillRect(-106, -115, 242, 2);
      x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(-100, -134, 196, 3);
      x.fillStyle = 'rgba(255,120,40,.22)'; x.fillRect(-106, -114, 3, 42); x.fillRect(103, -114, 3, 42);
      // tongs leaning on the right column
      x.strokeStyle = '#2a2b2e'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(150, -4); x.lineTo(166, -170); x.moveTo(158, -4); x.lineTo(167, -170); x.stroke();
      x.strokeStyle = 'rgba(255,140,60,.25)'; x.lineWidth = 1; x.beginPath(); x.moveTo(151, -6); x.lineTo(165, -166); x.stroke();

      /* over: crosshead, cylinder, hoses — everything above the ram */
      [over, x, d] = mk(); virt(x, d);
      x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(-230, -470, 460, 14);
      x.fillStyle = steel(x, 0, -548, 0, -528, '#5a5f67', '#33363b'); x.beginPath(); x.moveTo(-230, -526); x.lineTo(-218, -548); x.lineTo(218, -548); x.lineTo(230, -526); x.closePath(); x.fill();
      x.fillStyle = steel(x, 0, -526, 0, -472, '#2f3237', '#15161a', '#22252a'); x.fillRect(-230, -526, 460, 54);
      x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(-230, -526, 460, 2);
      bolts(x, [-214, -186, 186, 214], -512, 4); bolts(x, [-214, -186, 186, 214], -486, 4);
      hazard(x, -230, -480, 460, 8);
      x.font = '700 15px "Orbitron", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(232,178,28,.85)'; x.fillText('RESKIN WORKS  ·  2400 t', 0, -503);
      // hoses from the cylinder's ports down the columns
      for (const s of [-1, 1]) {
        x.lineCap = 'round'; x.strokeStyle = '#0b0b0c'; x.lineWidth = 11;
        x.beginPath(); x.moveTo(s * 58, -438); x.bezierCurveTo(s * 120, -438, s * 150, -430, s * 178, -380); x.lineTo(s * 182, -300); x.stroke();
        x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(s * 58, -441); x.bezierCurveTo(s * 120, -441, s * 148, -433, s * 175, -382); x.lineTo(s * 179, -300); x.stroke();
        x.fillStyle = '#6d727a'; x.fillRect(s * 58 - (s < 0 ? 10 : 0), -446, 10, 16);
      }
      x.fillStyle = steel(x, -66, 0, 66, 0, '#2a2d32', '#15171a', '#5d636c'); x.fillRect(-66, -472, 132, 12);
      x.fillStyle = steel(x, -58, 0, 58, 0, '#24272b', '#121316', '#4e535b'); x.fillRect(-58, -460, 116, 52);
      x.fillStyle = steel(x, -66, 0, 66, 0, '#2a2d32', '#15171a', '#5d636c'); x.fillRect(-66, -410, 132, 12);
      bolts(x, [-56, -30, 30, 56], -466, 2.8); bolts(x, [-56, -30, 30, 56], -404, 2.8);
      x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(-40, -458, 6, 48);
      // the pressure gauge on the left column
      const gx = -187, gy = -330, gr = 30;
      x.fillStyle = 'rgba(0,0,0,.5)'; x.beginPath(); x.arc(gx + 3, gy + 4, gr + 4, 0, R.TAU); x.fill();
      x.fillStyle = steel(x, gx - gr, gy - gr, gx + gr, gy + gr, '#c9ced6', '#3c4047', '#7b818a'); x.beginPath(); x.arc(gx, gy, gr + 4, 0, R.TAU); x.fill();
      x.fillStyle = '#ece4d2'; x.beginPath(); x.arc(gx, gy, gr, 0, R.TAU); x.fill();
      x.strokeStyle = '#c0261d'; x.lineWidth = 4; x.beginPath(); x.arc(gx, gy, gr - 5, gAng(0.78), gAng(1)); x.stroke();
      x.strokeStyle = '#2a2420'; x.lineWidth = 1;
      for (let i = 0; i <= 12; i++) { const a = gAng(i / 12), r1 = i % 3 ? gr - 7 : gr - 10; x.beginPath(); x.moveTo(gx + Math.cos(a) * (gr - 3), gy + Math.sin(a) * (gr - 3)); x.lineTo(gx + Math.cos(a) * r1, gy + Math.sin(a) * r1); x.stroke(); }
      x.font = '700 6px "Share Tech Mono", monospace'; x.fillStyle = '#2a2420'; x.fillText('×100 t', gx, gy + 13); x.fillText('PRESSURE', gx, gy - 11);
      x.fillStyle = '#6d727a'; x.fillRect(gx + gr - 2, gy - 4, 12, 8);

      /* the ram: body, upper die with hazard stripes, guide arms to the columns (drawn at its position each frame) */
      const rw = 470, rh = 150; ramC = document.createElement('canvas'); ramC.width = Math.round(rw * k * d); ramC.height = Math.round(rh * k * d);
      x = ramC.getContext('2d'); x.setTransform(k * d, 0, 0, k * d, rw / 2 * k * d, rh * k * d);
      // (origin at the die's front-bottom edge centre)
      for (const s of [-1, 1]) {
        x.fillStyle = steel(x, 0, -84, 0, -60, '#3e4248', '#17181b'); x.fillRect(s < 0 ? -168 : 92, -82, 76, 20);
        x.fillStyle = steel(x, 0, -92, 0, -52, '#4a4f56', '#1b1d20'); x.fillRect(s < 0 ? -182 : 162, -92, 20, 40);
        x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(s < 0 ? -168 : 92, -82, 76, 2);
      }
      x.fillStyle = steel(x, 0, -122, 0, -96, '#6a7078', '#3a3e44'); x.beginPath(); x.moveTo(-94, -96); x.lineTo(-86, -122); x.lineTo(86, -122); x.lineTo(94, -96); x.closePath(); x.fill();
      x.fillStyle = steel(x, -94, 0, 94, 0, '#24272c', '#141518', '#3d4249'); x.fillRect(-94, -96, 188, 76);
      x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(-94, -96, 188, 2); x.fillRect(-60, -94, 10, 72);
      bolts(x, [-80, -40, 40, 80], -84, 3.2); bolts(x, [-80, 80], -34, 3.2);
      x.font = '900 20px "Orbitron", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(232,178,28,.8)'; x.fillText('07', 0, -58);
      x.fillStyle = steel(x, 0, -20, 0, 0, '#3a3e44', '#121316'); x.fillRect(-78, -20, 156, 20);
      hazard(x, -78, -20, 156, 7);
      x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(-78, -1.5, 156, 1.5);
      L.ramW = rw; L.ramH = rh;
      rodG = null;
    }
    function gAng(p) { return Math.PI * 0.75 + p * Math.PI * 1.5; }

    /* ---------- live state ---------- */
    let enterT = 0, swapT = 9, shake = 0, shX = 0, shY = 0, stopT = 0, flashA = 0, temp = 0.72, flare = 0, squash = 0;
    let gauge = 0.1, peakG = 0, peakT = 0, morph = 0, chorusT = 0, lastT = -1, F = 0, tonShown = -1;
    let med = null;                              // the medal reveal after a chorus
    let tap = null;                              // a strike of your own
    const sparks = [], embers = [], puffs = [], rings = [], strikes = [], tmp = [], tmpB = [];
    function burst(s, side) {
      const n = Math.round((side ? 14 : 34) + s * (side ? 18 : 60)) * (api.low() ? 0.5 : 1);
      for (let i = 0; i < n; i++) {
        const dir = side ? (i % 2 ? 1 : -1) : rnd() < 0.5 ? -1 : 1;
        const sp = (side ? 320 : 380) + rnd() * (side ? 380 : 620) * (0.6 + s * 0.6);
        const a = side ? (rnd() - 0.65) * 0.7 : -Math.PI / 2 + dir * (0.35 + rnd() * 1.2);
        const vx = side ? dir * Math.cos(a) * sp : Math.cos(a) * sp, vy = side ? Math.sin(a) * sp : Math.sin(a) * sp * (0.55 + rnd() * 0.5);
        sparks.push({ x: dir * (side ? 60 : 30 + rnd() * 34), y: contactY() + (rnd() - 0.5) * 6, vx, vy, life: 0, max: 0.45 + rnd() * 0.9, w: 0.9 + rnd() * 1.6, b: 0 });
      }
      if (sparks.length > 700) sparks.splice(0, sparks.length - 700);
    }
    function impact(s, down) {
      s = Math.min(1.25, s * (down ? 1.25 : 1));
      const fx = api.flash();
      stopT = R.reduced ? 0 : 0.035 + 0.035 * Math.min(1, s);
      shake = R.reduced ? 0 : Math.max(shake, 3 + 7 * s);
      flashA = fx ? Math.max(flashA, 0.16 + 0.22 * s) : Math.max(flashA, 0.08);
      flare = Math.max(flare, 0.18 + 0.22 * s); squash = 1;
      gauge = Math.max(gauge, Math.min(1.02, 0.32 + 0.62 * s)); if (gauge >= peakG) { peakG = gauge; peakT = 1.3; }
      burst(s, false);
      rings.push({ r: 20, a: 0.7 * s, v: 520 + 260 * s, y: 0, k: 'floor' }, { r: 10, a: 0.9 * s, v: 380 + 200 * s, y: contactY(), k: 'air' });
      for (let i = 0; i < 3 + s * 4; i++) puffs.push({ x: (rnd() - 0.5) * 220, y: -4, vx: (rnd() - 0.5) * 120, vy: -20 - rnd() * 30, r: 14 + rnd() * 16, g: 40 + rnd() * 40, a: 0.12 + rnd() * 0.08, life: 0, max: 0.9 + rnd() * 0.6, c: 0 });
    }
    api.hit((kind, s) => { if (kind === 'snare' && !med && R.player.isPlaying()) { burst(Math.min(1, s), true); flare = Math.max(flare, 0.08); } });
    api.on('hot', (on) => {
      if (!on && morph > 0.55 && !med) {
        med = { t: 0, cool: 1 }; api.sfx('hiss');
        for (let i = 0; i < 22; i++) puffs.push({ x: (rnd() - 0.5) * 180, y: -150 - rnd() * 30, vx: (rnd() - 0.5) * 160, vy: -60 - rnd() * 120, r: 16 + rnd() * 20, g: 50 + rnd() * 70, a: 0.07 + rnd() * 0.07, life: 0, max: 1.4 + rnd() * 1.2, c: 1 });
      }
    });
    cvEl.addEventListener('pointerdown', (e) => {
      if (med) return;
      tap = { t: performance.now() / 1000 };
    });
    function contactY() { const H = 24 - 10 * morph; return -115 - H * (1 - 0.1 * squash); }

    // where the ram is: the lowest of the strokes around now (each strike falls in ~.1 s, holds, and rises in .28 s)
    function ramGap(t, list) {
      let gap = REST;
      for (let i = 0; i < list.length; i++) {
        const tk = list[i].t, lift = REST * (0.55 + 0.45 * Math.min(1, list[i].s)), dt = t - tk;
        const fall = list[i].fall, hold = 0.045, rise = 0.3;
        let g = REST;
        if (dt < 0 && dt > -fall) { const p = 1 + dt / fall; g = lift * (1 - p * p); }
        else if (dt >= 0 && dt < hold) g = 0;
        else if (dt >= hold && dt < hold + rise) { const p = (dt - hold) / rise; g = lift * (1 - Math.pow(1 - p, 3)); }
        else if (dt <= -fall) g = lift + (REST - lift) * Math.min(1, (-dt - fall) / 0.2);
        if (g < gap) gap = g;
      }
      return gap;
    }
    function gatherStrikes(t, v) {
      strikes.length = 0;
      const a = t - 0.7, b = t + 0.3;
      const hasK = v.hits();
      if (hasK) { v.upcomingHits('kick', a, b, tmp); for (let i = 0; i < tmp.length; i += 2) strikes.push({ t: tmp[i], s: 0.35 + 0.75 * tmp[i + 1], d: false }); }
      v.upcomingBeats(a, b, tmpB);
      for (let i = 0; i < tmpB.length; i += 3) {
        const bt = tmpB[i], bs = tmpB[i + 1], down = tmpB[i + 2] === 0;
        let near = null; for (const s of strikes) if (Math.abs(s.t - bt) < 0.09) { near = s; break; }
        if (near) { if (down) near.d = true; }
        else if (!hasK || down) strikes.push({ t: bt, s: down ? 0.85 : 0.35 + 0.5 * bs, d: down });
        // chorus: the ram strikes between the beats as well
        if (v.hot > 0.5 && i + 3 < tmpB.length) { const mt = (bt + tmpB[i + 3]) / 2; if (!strikes.some((s) => Math.abs(s.t - mt) < 0.08)) strikes.push({ t: mt, s: 0.45, d: false }); }
      }
      strikes.sort((p, q) => p.t - q.t);
      for (let i = 0; i < strikes.length; i++) strikes[i].fall = Math.max(0.05, Math.min(0.11, i ? (strikes[i].t - strikes[i - 1].t) * 0.42 : 0.11));
    }

    function drawFire(c, now, F, hot) {
      c.save(); archPath(c); c.clip();
      let g = c.createLinearGradient(0, -380, 0, -150); g.addColorStop(0, '#0d0302'); g.addColorStop(0.6, rgb([60 + F * 60, 14 + F * 10, 4], 1)); g.addColorStop(1, rgb([150 + F * 90, 50 + F * 40, 10], 1));
      c.fillStyle = g; c.fillRect(-130, -390, 260, 240);
      c.globalCompositeOperation = 'lighter';
      // coal bed
      for (let i = 0; i < 10; i++) { const x = -110 + i * 24, n = R.noise1(now * 1.6 + i * 3.1, 11); c.globalAlpha = 0.25 + n * 0.5 * F; c.drawImage(api.glow(n > 0.6 ? '#ffd27a' : '#ff6a14', 32), x - 14, -170 - n * 6, 28, 22); }
      // flame tongues
      const nT = api.low() ? 6 : 9, cols = ['#fff0b8', '#ffd27a', '#ffa040', '#ff6a14', '#e2400c', '#a8260a'];
      for (let i = 0; i < nT; i++) {
        const bx = -104 + i * (208 / (nT - 1)), n1 = R.noise1(now * 2.3 + i * 7.7, 3), n2 = R.noise1(now * 3.4 + i * 4.3, 9);
        const fh = (50 + n1 * 100) * (0.45 + F * 0.75) * (1 + hot * 0.5), sway = (n2 - 0.5) * 46;
        for (let j = 0; j < 4; j++) {
          const f = j / 3, y = -160 - fh * f, x = bx + sway * Math.pow(f, 1.6), s = 66 * (1 - f * 0.72) * (0.8 + 0.4 * F);
          c.globalAlpha = (0.34 + 0.26 * F) * (1 - f * 0.5); c.drawImage(api.glow(cols[j + 1], 32), x - s / 2, y - s * 0.62, s, s * 1.25);
        }
      }
      c.globalAlpha = Math.min(1, 0.35 + 0.55 * F); c.drawImage(api.glow('#ff8a2a', 64), -150, -330, 300, 220);
      c.restore();
    }

    function drawIngot(c, T, m, now) {
      const W = 132 - 24 * m, D = 58 + 50 * m, H = (24 - 10 * m) * (1 - 0.1 * squash), Ww = W * (1 + 0.05 * squash);
      const front = -115, topC = front - H - D * SQ / 2, rx = 4 + (Ww / 2 - 4) * m, ry = rx * SQ * (D / Ww > 0.99 ? 1 : 1);
      const col = heatRGB(T), dark = heatRGB(T - 0.22), lite = heatRGB(T + 0.16);
      // the glow it throws onto the anvil and the air, behind the metal itself
      c.globalCompositeOperation = 'lighter';
      const gl = Math.max(0, T - 0.35);
      c.globalAlpha = Math.min(1, gl * 0.55); c.drawImage(api.glow('#ff7a1f', 64), -Ww * 2.1, front - 100, Ww * 4.2, 180);
      c.globalAlpha = Math.min(1, gl * 0.5); c.drawImage(api.glow(rgb(col), 64), -Ww * 1.2, topC - 60, Ww * 2.4, 130);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      // sides: the top shape pushed down by the thickness, joined at the widest chord
      c.fillStyle = rgb(dark); rrE(c, 0, topC + H, Ww, D * SQ, rx, ry); c.fill(); c.fillRect(-Ww / 2, topC, Ww, H);
      const sg = c.createLinearGradient(0, topC + D * SQ / 2, 0, front); sg.addColorStop(0, rgb(col)); sg.addColorStop(1, rgb(dark));
      c.fillStyle = sg; c.fillRect(-Ww / 2 + rx * 0.3, topC + D * SQ / 2 - 0.5, Ww - rx * 0.6, front - topC - D * SQ / 2 + 0.5);
      // top: the cover pressed into the hot metal
      c.save(); rrE(c, 0, topC, Ww, D * SQ, rx, ry); c.clip();
      c.fillStyle = rgb(col); c.fillRect(-Ww / 2, topC - D * SQ / 2, Ww, D * SQ);
      if (coverC) { const cs = Math.max(Ww, D); c.globalAlpha = 0.9; c.globalCompositeOperation = 'overlay'; c.drawImage(coverC, -cs / 2, topC - cs * SQ / 2, cs, cs * SQ); c.globalAlpha = 0.25; c.globalCompositeOperation = 'multiply'; c.drawImage(coverC, -cs / 2, topC - cs * SQ / 2, cs, cs * SQ); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
      const hg = c.createLinearGradient(-Ww / 2, 0, Ww / 2, 0); hg.addColorStop(0, rgb(lite, 0)); hg.addColorStop(0.5 + Math.sin(now * 0.7) * 0.2, rgb(lite, 0.35)); hg.addColorStop(1, rgb(lite, 0));
      c.fillStyle = hg; c.fillRect(-Ww / 2, topC - D * SQ / 2, Ww, D * SQ);
      // scale (the dark skin of oxide) floats on cooler steel
      if (T < 0.85) { c.fillStyle = `rgba(20,8,4,${((0.85 - T) * 0.9).toFixed(3)})`; for (let i = 0; i < 9; i++) { const sx = R.noise1(i * 3.7, 2) * Ww - Ww / 2, sy = topC + (R.noise1(i * 5.1, 4) - 0.5) * D * SQ; c.beginPath(); c.ellipse(sx, sy, 6 + i % 4 * 3, 2 + i % 3, 0.2, 0, R.TAU); c.fill(); } }
      c.restore();
      // heat haze shimmer just above the hot face
      const hz = Math.max(0, T - 0.75);
      if (hz > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, hz * 0.8); c.drawImage(api.glow(rgb(lite), 64), -Ww * 0.7, topC - D * SQ / 2 - 26, Ww * 1.4, 40); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
    }

    function drawMedal(c, now) {
      const t = med.t, e = Math.min(1, Math.max(0, (t - 0.35) / 0.9)), ez = 1 - Math.pow(1 - e, 3);
      const out = t > 3.6 ? Math.min(1, (t - 3.6) / 0.6) : 0;
      const r = 96 * (0.4 + 0.6 * ez) * (1 - out * 0.3), cy = -150 - 170 * ez + out * 40, a = Math.min(1, e * 1.6) * (1 - out);
      if (a <= 0) return;
      c.save(); c.globalAlpha = a; c.translate(0, cy); c.rotate(Math.sin(t * 1.3) * 0.04 * (1 - out));
      // shadow, rim, the relief, engraved ring text
      c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.arc(5, 8, r + 4, 0, R.TAU); c.fill();
      let g = c.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#fff0c2'); g.addColorStop(0.3, '#c99a45'); g.addColorStop(0.55, '#6e4a1c'); g.addColorStop(0.8, '#e2b562'); g.addColorStop(1, '#7a5420');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, R.TAU); c.fill();
      c.fillStyle = '#4d3312'; c.beginPath(); c.arc(0, 0, r * 0.8, 0, R.TAU); c.fill();
      c.save(); c.beginPath(); c.arc(0, 0, r * 0.76, 0, R.TAU); c.clip();
      if (coverC) { c.drawImage(coverC, -r * 0.76, -r * 0.76, r * 1.52, r * 1.52); c.globalCompositeOperation = 'color'; c.fillStyle = '#c08a3c'; c.fillRect(-r, -r, r * 2, r * 2); c.globalCompositeOperation = 'source-over'; }
      else { c.fillStyle = '#b07d36'; c.fillRect(-r, -r, r * 2, r * 2); }
      g = c.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.05, 0, 0, r * 0.9); g.addColorStop(0, 'rgba(255,240,200,.55)'); g.addColorStop(0.5, 'rgba(255,220,160,.05)'); g.addColorStop(1, 'rgba(40,20,0,.55)');
      c.fillStyle = g; c.fillRect(-r, -r, r * 2, r * 2);
      // a band of light sweeps across the polished metal
      const sw = ((t * 0.55) % 1.6) - 0.3; g = c.createLinearGradient(-r + sw * r * 2.2, -r, -r + sw * r * 2.2 + r * 0.5, r); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,250,230,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(-r, -r, r * 2, r * 2); c.globalCompositeOperation = 'source-over';
      c.restore();
      c.strokeStyle = 'rgba(255,236,190,.5)'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, r * 0.8, 0, R.TAU); c.stroke();
      const txt = ('HEAVY FORGE  ·  ' + ((api.track() || {}).title || 'RESKIN') + '  ·  ').toUpperCase().slice(0, 46);
      c.font = `700 ${Math.max(7, r * 0.1)}px "Chakra Petch", sans-serif`; c.fillStyle = '#3a2408'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const n = txt.length; for (let i = 0; i < n; i++) { const an = -Math.PI / 2 + (i / n) * R.TAU; c.save(); c.translate(Math.cos(an) * r * 0.9, Math.sin(an) * r * 0.9); c.rotate(an + Math.PI / 2); c.fillText(txt[i], 0, 0); c.restore(); }
      // still glowing from the forge, cooling as you watch
      const glw = Math.max(0, med.cool);
      if (glw > 0.01) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = a * glw * 0.35; c.drawImage(api.glow('#ff6a14', 64), -r * 1.35, -r * 1.35, r * 2.7, r * 2.7); c.globalCompositeOperation = 'source-over'; }
      c.restore();
    }

    async function loadCover() {
      const t = api.track(), my = ++coverTok;
      const c = await R.glk.coverCanvas(t, 256);
      if (my === coverTok) coverC = c;
    }
    let coverTok = 0;
    loadCover();
    layout();

    return {
      enter() { enterT = 0; F = 0; },
      swap() { swapT = 0; loadCover(); morph = 0; med = null; temp = 0.3; flare = 0.4; },
      resize() { cv.resize(); layout(); },
      frame(dt, now, v) {
        enterT += dt; swapT += dt;
        const { ctx, w, h } = cv;
        if (!L || !under || Math.abs(under.width / Math.min(2, cv.dpr) - w) > 1 || Math.abs(under.height / Math.min(2, cv.dpr) - h) > 1) layout();
        const playing = v.playing, t = v.t;
        // the strikes: read ahead so each fall ends exactly on its drum hit
        if (playing && !med) gatherStrikes(t, v); else strikes.length = 0;
        let gap;
        if (tap) { const tt = now - tap.t; gap = ramGap(tt - 0.11, [{ t: 0, s: 0.95, fall: 0.11 }]); if (tt >= 0.11 && !tap.hit) { tap.hit = true; impact(0.95, true); api.sfx('strike'); } if (tt > 0.6) tap = null; }
        else gap = playing && !med ? ramGap(t, strikes) : REST;
        if (enterT < 1.4) gap = REST + (1 - Math.min(1, enterT / 1.2)) * 220;
        // impacts this frame (not on a jump: seeking, resuming)
        if (playing && !med && lastT >= 0 && t > lastT && t - lastT < 0.25) for (const s of strikes) if (s.t > lastT && s.t <= t) impact(s.s, s.d);
        lastT = playing ? t : -1;
        // time, frozen for a moment on impact
        const sdt = stopT > 0 ? 0 : dt; stopT = Math.max(0, stopT - dt);
        // furnace, heat, the medal's progress
        const hot = R.reduced ? v.hot * 0.6 : v.hot;
        const Ft = Math.min(1, enterT / 1.6) * (playing ? 0.55 + 0.3 * Math.min(1, v.level * 1.2) + 0.35 * hot : 0.42);
        F += (Ft - F) * (1 - Math.exp(-dt * 2.5));
        if (hot > 0.5 && playing && !med) { chorusT += dt; morph = Math.min(1, morph + dt / 11); } else chorusT = 0;
        const tT = (playing ? 0.6 + 0.12 * Math.min(1, v.level) + 0.3 * hot : 0.5) + flare;
        temp += (Math.min(1.12, tT) - temp) * (1 - Math.exp(-dt * (tT > temp ? 6 : 1.2)));
        flare *= Math.exp(-dt * 4); squash *= Math.exp(-sdt * 14); flashA *= Math.exp(-dt * 10);
        shake *= Math.exp(-dt * 16); shX = shake * (R.noise1(now * 60, 1) - 0.5) * 2; shY = shake * (R.noise1(now * 60, 7) - 0.5) * 2;
        gauge += ((playing ? 0.08 + 0.16 * v.level : 0.04) - gauge) * (1 - Math.exp(-dt * 1.6)); peakT -= dt; if (peakT < 0) peakG = Math.max(gauge, peakG - dt * 0.6);
        if (med) { med.t += dt; med.cool = Math.max(0, 1 - med.t / 3); if (med.t > 4.2) { med = null; morph = 0; temp = 0.35; } }

        /* ---- draw ---- */
        if (shake > 0.3) { ctx.fillStyle = '#0b0706'; ctx.fillRect(0, 0, w, h); }
        ctx.save(); ctx.translate(shX, shY);
        ctx.drawImage(under, 0, 0, w, h);
        ctx.save(); ctx.translate(L.ox, L.oy); ctx.scale(L.k, L.k);
        drawFire(ctx, now, F, hot);
        ctx.restore();
        // the furnace light on the wall, breathing with the fire
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, 0.12 + 0.3 * F * (0.85 + 0.3 * R.noise1(now * 4, 5)));
        ctx.drawImage(api.glow('#ff6a14', 64), VX(-260), VY(-470), 520 * L.k, 460 * L.k); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(mid, 0, 0, w, h);
        ctx.save(); ctx.translate(L.ox, L.oy); ctx.scale(L.k, L.k);
        // floor shock rings and dust under the anvil
        for (let i = rings.length - 1; i >= 0; i--) {
          const r = rings[i]; r.r += r.v * sdt; r.v *= Math.exp(-sdt * 2.2); r.a *= Math.exp(-sdt * (r.k === 'air' ? 7 : 3.2));
          if (r.a < 0.01) { rings.splice(i, 1); continue; }
          ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = r.k === 'air' ? `rgba(255,230,190,${r.a.toFixed(3)})` : `rgba(255,150,70,${(r.a * 0.6).toFixed(3)})`;
          ctx.lineWidth = r.k === 'air' ? 3 : 5; ctx.beginPath(); r.k === 'air' ? ctx.ellipse(0, r.y, r.r, r.r * 0.55, 0, 0, R.TAU) : ctx.ellipse(0, -10, r.r, r.r * 0.12, 0, 0, R.TAU); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
        }
        if (!med || med.t < 0.5) drawIngot(ctx, temp, morph, now);
        // rod and ram
        const by = contactY() - gap, ramTop = by - 122;
        if (!rodG) { rodG = ctx.createLinearGradient(-17, 0, 17, 0); rodG.addColorStop(0, '#4a4f56'); rodG.addColorStop(0.3, '#eef2f6'); rodG.addColorStop(0.45, '#a9b0b9'); rodG.addColorStop(1, '#2d3035'); }
        ctx.fillStyle = rodG; ctx.fillRect(-17, -400, 34, Math.max(0, ramTop + 14 + 400));
        ctx.fillStyle = 'rgba(255,140,60,.16)'; ctx.fillRect(10, -400, 3, Math.max(0, ramTop + 400));
        ctx.drawImage(ramC, -L.ramW / 2, by - L.ramH, L.ramW, L.ramH);
        // the hot billet lights the die's face from below as the ram comes down
        const near = Math.max(0, 1 - gap / 70) * Math.max(0, temp - 0.4);
        if (near > 0.01) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, near * 1.3); ctx.drawImage(api.glow(rgb(heatRGB(temp)), 64), -95, by - 26, 190, 40); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        // sparks: hot streaks that cool from white to red, bounce once on the floor
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        // (sparks are stroked in five batches by how far they have cooled: five draw calls, not hundreds)
        for (let i = sparks.length - 1; i >= 0; i--) {
          const p = sparks[i]; p.life += sdt;
          if (p.life > p.max) { sparks.splice(i, 1); continue; }
          p.vy += 1150 * sdt; p.vx *= Math.exp(-sdt * 0.8); p.x += p.vx * sdt; p.y += p.vy * sdt;
          if (p.y > -6 && p.vy > 0 && !p.b) { p.y = -6; p.vy *= -0.32; p.vx *= 0.55; p.b = 1; }
        }
        for (let bk = 0; bk < 5; bk++) {
          const f0 = bk / 5, f1 = (bk + 1) / 5, fm = (f0 + f1) / 2;
          ctx.strokeStyle = SPARK[bk]; ctx.lineWidth = 1.7 * (1 - fm * 0.5); ctx.globalAlpha = Math.min(1, 1.3 - fm); ctx.beginPath();
          for (const p of sparks) { const f = p.life / p.max; if (f < f0 || f >= f1) continue; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022); }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // embers rising from the furnace
        if (embers.length < (api.low() ? 30 : 70) * (0.5 + F) && rnd() < dt * (8 + 30 * F * (1 + hot))) embers.push({ x: (rnd() - 0.5) * 220, y: -170, vx: (rnd() - 0.5) * 20, vy: -40 - rnd() * 70, life: 0, max: 2 + rnd() * 3, s: 0.6 + rnd() * 1.4 });
        for (let i = embers.length - 1; i >= 0; i--) {
          const e = embers[i]; e.life += dt; if (e.life > e.max) { embers.splice(i, 1); continue; }
          e.vx += (R.noise1(now * 0.8 + i, 13) - 0.5) * 60 * dt; e.x += e.vx * dt; e.y += e.vy * dt * (1 + hot * 0.8);
          const f = e.life / e.max; ctx.globalAlpha = Math.sin(f * Math.PI) * 0.9; ctx.fillStyle = f < 0.5 ? '#ffd27a' : '#ff6a14';
          ctx.fillRect(e.x, e.y, 1.8 * e.s, 1.8 * e.s);
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        // dust and steam
        for (let i = puffs.length - 1; i >= 0; i--) {
          const p = puffs[i]; p.life += dt; if (p.life > p.max) { puffs.splice(i, 1); continue; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-dt * 1.5); p.r += p.g * dt;
          const f = p.life / p.max; ctx.globalAlpha = p.a * (1 - f) * Math.min(1, p.life * 8);
          ctx.drawImage(api.glow(p.c ? '#9aa2ab' : '#5a4a40', 64), p.x - p.r * 2, p.y - p.r * 2, p.r * 4, p.r * 4);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        ctx.drawImage(over, 0, 0, w, h);
        // gauge needle and peak marker
        ctx.save(); ctx.translate(L.ox, L.oy); ctx.scale(L.k, L.k);
        const gx = -187, gy = -330, ga = gAng(Math.min(1.02, gauge)), pa = gAng(Math.min(1.02, peakG));
        ctx.strokeStyle = 'rgba(192,38,29,.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(gx + Math.cos(pa) * 18, gy + Math.sin(pa) * 18); ctx.lineTo(gx + Math.cos(pa) * 26, gy + Math.sin(pa) * 26); ctx.stroke();
        ctx.strokeStyle = '#141210'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx - Math.cos(ga) * 5, gy - Math.sin(ga) * 5); ctx.lineTo(gx + Math.cos(ga) * 25, gy + Math.sin(ga) * 25); ctx.stroke();
        ctx.fillStyle = '#c0261d'; ctx.beginPath(); ctx.arc(gx, gy, 3.2, 0, R.TAU); ctx.fill();
        const gl = ctx.createLinearGradient(gx - 30, gy - 30, gx + 20, gy + 30); gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(gx, gy, 30, 0, R.TAU); ctx.fill();
        if (med) { const sp = Math.min(1, med.t / 0.6) * (med.t > 3.6 ? Math.max(0, 1 - (med.t - 3.6) / 0.6) : 1); ctx.fillStyle = `rgba(6,3,2,${(0.45 * sp).toFixed(3)})`; ctx.fillRect(-600, -700, 1200, 900); drawMedal(ctx, now); }
        ctx.restore();
        ctx.restore();
        // impact flash over everything, a warm vignette in the chorus
        if (flashA > 0.01) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(0.7, flashA); ctx.drawImage(api.glow('#ffd79a', 64), VX(-300), VY(-330), 600 * L.k, 380 * L.k); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        const ton = Math.round(gauge * 240) * 10;
        if (ton !== tonShown) { tonShown = ton; tonEl.textContent = ton.toLocaleString('en-US'); }
        root.style.setProperty('--heat', Math.min(1, Math.max(0, temp - 0.4)).toFixed(3));
      },
      destroy() { coverTok++; },
    };
  },
});
