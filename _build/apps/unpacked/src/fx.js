/* 解包 — 視覺特效：油漆噴濺粒子、畫面震動、反轉閃光、牆面材質、開場噴漆。
   底線：大衝擊（震動＋閃光）一個畫面最多 2～3 次；閃光每秒不超過 3 次；字永遠清楚可讀。 */
const FX = { cv: null, ctx: null, parts: [], raf: 0, dpr: 1, flashes: [] };
const PINK = '#FF2E88', YEL = '#FFE600', BLK = '#111', RED = '#e3001b';

function fxInit() {
  FX.cv = $('#fx'); FX.ctx = FX.cv.getContext('2d');
  const fit = () => {
    FX.dpr = Math.min(2, window.devicePixelRatio || 1);
    FX.cv.width = Math.round(innerWidth * FX.dpr); FX.cv.height = Math.round(innerHeight * FX.dpr);
  };
  fit(); addEventListener('resize', fit);
  // 牆面材質：一張 256×256 的水泥噪點，只算一次
  try {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const im = g.createImageData(256, 256); const r = rnd(7);
    for (let i = 0; i < im.data.length; i += 4) { const v = 18 + r() * 22; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = r() < 0.5 ? 40 : 0; }
    g.putImageData(im, 0, 0);
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(255,255,255,${0.015 + r() * 0.02})`; g.beginPath(); g.arc(r() * 256, r() * 256, 2 + r() * 14, 0, 7); g.fill(); }
    $('#wall').style.setProperty('--noise', `url(${c.toDataURL('image/png')})`);
  } catch (e) { /* 沒有材質也行 */ }
}

function burst(x, y, cols = [PINK, YEL, BLK], n = 30, pow = 14) {
  if (!fxOn()) return;
  n = Math.min(n, 60);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = (0.35 + Math.random()) * pow;
    FX.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - pow * 0.35, r: 2 + Math.random() * 7, c: cols[i % cols.length], life: 26 + Math.random() * 26, l0: 52 });
  }
  if (FX.parts.length > 260) FX.parts.splice(0, FX.parts.length - 260);
  if (!FX.raf) FX.raf = requestAnimationFrame(fxTick);
}
function burstAt(el, cols, n, pow) {
  if (!el) return; const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, cols, n, pow);
}
function fxTick() {
  const c = FX.ctx, d = FX.dpr;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, FX.cv.width, FX.cv.height); c.setTransform(d, 0, 0, d, 0, 0);
  for (let i = FX.parts.length - 1; i >= 0; i--) {
    const p = FX.parts[i]; p.vy += 0.55; p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.life--;
    c.globalAlpha = Math.max(0, Math.min(1, p.life / 18)); c.fillStyle = p.c;
    c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill();
    if (p.r > 5 && p.vy > 2) { c.fillRect(p.x - p.r * 0.22, p.y - p.r * 1.6, p.r * 0.44, p.r * 1.6); }
    if (p.life <= 0 || p.y > innerHeight + 40) FX.parts.splice(i, 1);
  }
  c.globalAlpha = 1;
  FX.raf = FX.parts.length ? requestAnimationFrame(fxTick) : 0;
  if (!FX.raf) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, FX.cv.width, FX.cv.height); }
}

function shake(amt = 10, ms = 300, el = $('#app')) {
  if (!fxOn() || !el || !el.animate) return;
  const k = []; const n = 7;
  for (let i = 0; i < n; i++) { const f = 1 - i / n; k.push({ transform: `translate(${(Math.random() * 2 - 1) * amt * f}px,${(Math.random() * 2 - 1) * amt * f}px) rotate(${(Math.random() * 2 - 1) * amt * 0.04 * f}deg)` }); }
  k.push({ transform: 'none' });
  el.animate(k, { duration: ms, easing: 'linear' });
}
function flash(col = BLK, o = 0.85) {
  if (!fxOn()) return;
  const now = performance.now(); FX.flashes = FX.flashes.filter((t) => now - t < 1000);
  if (FX.flashes.length >= 3) return;           // 光敏安全：每秒最多 3 次
  FX.flashes.push(now);
  const f = $('#flash'); f.style.background = col;
  f.animate([{ opacity: o }, { opacity: 0 }], { duration: 240, easing: 'ease-out' });
}
/* 一次「大衝擊」：重低音＋拍貼紙＋噴濺＋震動＋閃光 */
function impact(el, cols = [PINK, YEL, BLK], big = true) {
  sfx.drop(); sfx.slap(); haptic(25);
  burstAt(el, cols, big ? 46 : 22, big ? 17 : 11);
  shake(big ? 14 : 6, big ? 380 : 220);
  if (big) flash(BLK, 0.7);
}

/* ---- 噴漆字（開場用）：用文字遮罩決定油漆落點 ---- */
function makeSpray(cv, text, font, col, over) {
  const W = cv.width, H = cv.height, g = cv.getContext('2d');
  const m = document.createElement('canvas'); m.width = W; m.height = H; const mc = m.getContext('2d');
  mc.font = font; mc.textAlign = 'center'; mc.textBaseline = 'middle'; mc.fillText(text, W / 2, H * 0.4);
  const w = mc.measureText(text).width, fs = parseInt(font.match(/(\d+)px/)[1], 10);
  let data; try { data = mc.getImageData(0, 0, W, H).data; } catch (e) { data = null; }
  const x0 = W / 2 - w / 2 - fs * 0.2, x1 = W / 2 + w / 2 + fs * 0.2, cy = H * 0.4; let last = 0;
  const spread = fs * 0.36;
  return {
    pos(p) { return { x: x0 + (x1 - x0) * p, y: cy + Math.sin(p * Math.PI * 2 * 7) * fs * 0.42 }; },
    step(p) {
      if (!data) return this.pos(p);
      for (let s = 1; s <= 3; s++) {
        const q = last + (p - last) * s / 3, n = this.pos(q);
        for (let i = 0; i < 120; i++) {
          const gx = (Math.random() + Math.random() + Math.random() - 1.5) * spread, gy = (Math.random() + Math.random() + Math.random() - 1.5) * spread;
          const x = n.x + gx | 0, y = n.y + gy | 0; if (x < 0 || y < 0 || x >= W || y >= H) continue;
          if (data[(y * W + x) * 4 + 3] > 110) { g.globalAlpha = 0.9; g.fillStyle = col; g.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4); }
          else if (Math.random() < 0.18) { g.globalAlpha = 0.38; g.fillStyle = over; g.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3); }
        }
      }
      g.globalAlpha = 1; last = p; return this.pos(p);
    },
  };
}

const CAN_SVG = '<svg class="can" viewBox="0 0 140 300"><rect x="34" y="0" width="22" height="18" rx="3" fill="#ddd"/><rect x="22" y="14" width="96" height="44" rx="16" fill="#FF2E88" stroke="#111" stroke-width="5"/><rect x="10" y="50" width="120" height="244" rx="20" fill="#111" stroke="#FFE600" stroke-width="4"/><rect x="10" y="112" width="120" height="96" fill="#FFE600"/><text x="70" y="176" font-family="Bebas Neue" font-size="46" text-anchor="middle" fill="#111">SPRAY</text></svg>';

/* 開場：full＝搖罐→噴字→實心字砸下→貼紙→膠帶（約 3.4 秒）；short＝直接砸字（約 1 秒） */
function runIntro(mode, todayCount) {
  return new Promise((done) => {
    const box = document.createElement('div'); box.id = 'intro';
    const n = todayCount || 0;
    box.innerHTML = `<div class="ht" style="position:absolute;inset:0"></div><div class="rays"></div><canvas></canvas>
      <div class="solid">解包</div><div class="drips">${[[30, 120, ''], [41, 170, 'p'], [55, 90, ''], [64, 140, 'p'], [72, 110, '']].map(([l, h, c]) => `<i class="${c}" style="left:${l}%;height:${h}px"></i>`).join('')}</div>
      <div class="stk">UNPACKED</div><div class="tline2"><span>今日解包 ${n} 款 ★ 遊戲狂想曲 ★ GAME RHAPSODY ★ 今日解包 ${n} 款 ★ 遊戲狂想曲 ★</span></div>
      ${CAN_SVG}<div class="skip">點一下跳過</div>`;
    document.body.appendChild(box);
    const cv = $('canvas', box); const d = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d);
    const can = $('.can', box); let ended = false; const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(() => { if (!ended) fn(); }, ms));
    const finish = () => {
      if (ended) return; ended = true; timers.forEach(clearTimeout);
      box.classList.add('out'); sfx.whoosh();
      setTimeout(() => { box.remove(); done(); }, 470);
    };
    box.addEventListener('click', finish);
    const solidGo = () => {
      const s = $('.solid', box); s.classList.add('go');
      setTimeout(() => { if (ended) return; sfx.drop(); sfx.slap(); haptic(30); burstAt(s, [YEL, PINK, '#fff'], 50, 18); shake(16, 380, box); flash(BLK, 0.7); $('.rays', box).classList.add('on');
        const dr = $('.drips', box); dr.classList.add('go'); $$('i', dr).forEach((i, k) => { i.style.transitionDelay = (k * 0.09) + 's'; i.style.transform = 'scaleY(1)'; }); }, 260);
    };
    if (mode === 'short' || !fxOn()) {
      can.style.display = 'none';
      at(60, solidGo);
      at(520, () => { $('.stk', box).classList.add('go'); sfx.slap(); });
      at(1150, finish);
      return;
    }
    // 1 搖罐
    const fs = Math.round(Math.min(innerWidth * 0.34, 230) * d);
    const sp = makeSpray(cv, '解包', `900 ${fs}px "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif`, YEL, PINK);
    const p0 = sp.pos(0);
    can.style.transform = `translate(${p0.x / d - 20}px,${p0.y / d - 20}px) rotate(-15deg)`;
    const shakeCan = can.animate([{ transform: `translate(${p0.x / d - 20}px,${p0.y / d - 10}px) rotate(-30deg)` }, { transform: `translate(${p0.x / d - 20}px,${p0.y / d - 40}px) rotate(20deg)` }], { duration: 90, iterations: 7, direction: 'alternate' });
    sfx.rattle(); at(260, sfx.rattle); at(520, sfx.rattle);
    // 2 噴字
    at(700, () => {
      shakeCan.cancel(); sfx.hiss(1.25);
      const t0 = performance.now(), dur = 1250;
      const loop = (now) => {
        if (ended) return;
        const p = Math.min(1, (now - t0) / dur); const n = sp.step(p);
        can.style.transform = `translate(${n.x / d + 6}px,${n.y / d + 10}px) rotate(-24deg)`;
        if (p < 1) requestAnimationFrame(loop);
        else can.animate([{ transform: can.style.transform }, { transform: `translate(${innerWidth + 120}px,-260px) rotate(80deg)` }], { duration: 420, easing: 'ease-in', fill: 'forwards' });
      };
      requestAnimationFrame(loop);
    });
    at(1700, sfx.riser);
    // 3 實心字砸下
    at(2050, solidGo);
    // 4 貼紙
    at(2620, () => { $('.stk', box).classList.add('go'); sfx.slap(); burstAt($('.stk', box), [PINK, BLK], 18, 10); });
    // 5 膠帶
    at(3000, () => { $('.tline2', box).classList.add('go'); sfx.scratch(); });
    // 2026/11/18：噴完之後，今天的頭條一張張拍上牆（今日解包、推坑、到價、限免都是真的數字）
    let tEnd = 0; try { tEnd = introHeadline(box, at); } catch (e) { tEnd = 0; }
    at(tEnd || 3650, finish);
  });
}
