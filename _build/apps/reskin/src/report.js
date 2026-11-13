/* ===================== the listening report: a story of cards, like a year-end recap, for any period =====================
   Tap the right side (or swipe left) for the next card, the left side to go back; a card moves on by itself after a few
   seconds, holding a finger on it pauses. The last card is a picture to share. */
R.report = (() => {
  const { esc, I, fmtTime } = R;
  let el = null, i = 0, n = 0, timer = 0, period = 'month', S = null, P = null, paused = false, hold = 0, downX = 0, downT = 0;
  const DUR = 6500;
  const hm = (sec) => { const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? `${h}<small>小時</small>${m ? ` ${m}<small>分</small>` : ''}` : `${m}<small>分鐘</small>`; };
  const hourName = (h) => (h < 5 ? '凌晨' : h < 11 ? '早上' : h < 13 ? '中午' : h < 18 ? '下午' : h < 23 ? '晚上' : '深夜') + ' ' + h + ' 點';
  function slides() {
    const out = [];
    const th = (R.stage.current() || {}).theme || {};
    const periods = Object.entries(R.stats.PERIOD).map(([k, v]) => `<button type="button" class="${k === period ? 'on' : ''}" data-rp-p="${k}">${v}</button>`).join('');
    const since = new Date(S.since);
    out.push(`<section class="rp-s rp-intro"><div class="rp-kick">耳目一新 RESKIN</div><h1>痞子葳的<br>聽歌報告</h1><div class="rp-per">${periods}</div><p>從 ${since.getFullYear()}/${since.getMonth() + 1}/${since.getDate()} 開始記錄${S.total < 60 ? '' : `　·　${S.label}聽完 ${S.plays} 首`}</p><div class="rp-tap">點右邊看下一張 ▸</div></section>`);
    if (S.total < 60) {
      out.push(`<section class="rp-s"><div class="rp-kick">${esc(S.label)}</div><h2>還沒有足夠的資料</h2><p class="rp-big-p">聽歌報告從今天開始記錄。<br>多聽幾首歌、鎖屏聽也算，<br>報告就會一張一張長出來。</p><div class="rp-emoji">🎧</div></section>`);
      return out;
    }
    const songs = Math.max(1, Math.round(S.total / 210));
    out.push(`<section class="rp-s rp-total"><div class="rp-kick">${esc(S.label)}你一共聽了</div><div class="rp-huge" data-count="${Math.round(S.total)}" data-fmt="hm">${hm(S.total)}</div><p class="rp-big-p">大約是 <b>${songs}</b> 首歌的長度<br><b>${S.days}</b> 天有開歌${S.streak > 1 ? `，已經連續 <b>${S.streak}</b> 天` : ''}</p>${S.best ? `<p class="rp-small">聽最多的一天是 ${S.best.k.slice(5).replace('-', '/')}，聽了 ${fmtTime(S.best.s)}</p>` : ''}</section>`);
    const top = S.topTracks[0];
    if (top) {
      const col = R.art.colorsOf(top.t);
      out.push(`<section class="rp-s rp-top" style="--c1:${col.vibrant};--c2:${col.dark || '#000'}"><div class="rp-kick">${esc(S.label)}的主打歌</div><div class="rp-cover"><img data-rp-art="${top.t.id}" alt=""></div><h2>${esc(top.t.title)}</h2><p class="rp-sub">${esc(top.t.artist || '未知歌手')}</p><div class="rp-chips"><span><b data-count="${top.n}">${top.n}</b> 次</span><span><b>${Math.round(top.s / 60)}</b> 分鐘</span>${top.t.bpm ? `<span><b>${Math.round(top.t.bpm)}</b> BPM</span>` : ''}</div></section>`);
    }
    if (S.topTracks.length > 1) {
      const max = S.topTracks[0].s || 1;
      out.push(`<section class="rp-s rp-list"><div class="rp-kick">最常聽的 ${Math.min(5, S.topTracks.length)} 首</div><ol>${S.topTracks.slice(0, 5).map((x, k) => `<li style="--d:${k * 0.12}s"><em>${k + 1}</em><i data-rp-art="${x.t.id}"></i><div><b>${esc(x.t.title)}</b><small>${esc(x.t.artist || '未知歌手')} · ${x.n} 次</small><u style="--w:${Math.round((x.s / max) * 100)}%"></u></div></li>`).join('')}</ol></section>`);
    }
    if (S.topArtists.length) {
      const a = S.topArtists[0];
      out.push(`<section class="rp-s rp-art"><div class="rp-kick">${esc(S.label)}最愛的歌手</div><h2 class="rp-name">${esc(a.name)}</h2><p class="rp-big-p">聽了 <b>${hm(a.s)}</b>，${a.songs} 首歌</p>${S.topArtists.length > 1 ? `<div class="rp-others">${S.topArtists.slice(1, 5).map((x, k) => `<span><em>${k + 2}</em>${esc(x.name)}</span>`).join('')}</div>` : ''}</section>`);
    }
    if (S.topSkins.length) {
      const k = S.topSkins[0], tot = S.topSkins.reduce((s, x) => s + x.s, 0) || 1;
      out.push(`<section class="rp-s rp-skin" style="--a1:${k.def.theme.accent};--a2:${k.def.theme.accent2}"><div class="rp-kick">你最常穿的 Skin</div><div class="rp-emb">${R.wardrobe.emblemOf ? R.wardrobe.emblemOf(k.def) : ''}</div><h2>${esc(k.def.name)}</h2><p class="rp-big-p">穿了 <b>${hm(k.s)}</b>（${Math.round((k.s / tot) * 100)}%）</p>${S.topSkins.length > 1 ? `<div class="rp-others">${S.topSkins.slice(1, 4).map((x) => `<span>${esc(x.def.name)} ${Math.round((x.s / tot) * 100)}%</span>`).join('')}</div>` : ''}</section>`);
    }
    out.push(`<section class="rp-s rp-clock"><div class="rp-kick">你的聽歌時鐘</div><canvas class="rp-cv" data-rp="clock"></canvas><h2>${hourName(S.peak)}</h2><p class="rp-big-p">${S.night > 0.35 ? '夜越深，歌越好聽' : S.morning > 0.3 ? '一早就把音樂打開' : '這個時段你最常戴上耳機'}</p></section>`);
    out.push(`<section class="rp-s rp-persona"><div class="rp-kick">你的音樂人格</div><div class="rp-emoji">${P.icon}</div><h2>${esc(P.name)}</h2><p class="rp-big-p">${esc(P.line)}</p><div class="rp-chips">${S.avgBpm ? `<span>平均 <b>${S.avgBpm}</b> BPM</span>` : ''}<span>小調 <b>${Math.round(S.minorShare * 100)}%</b></span><span>能量 <b>${Math.round(S.hype * 100)}</b></span></div></section>`);
    out.push(`<section class="rp-s rp-end"><div class="rp-kick">${esc(S.label)}總結</div><div class="rp-card"><div class="busy-ring"></div></div><div class="rp-btns" data-rp="btns"></div></section>`);
    void th;
    return out;
  }
  function render() {
    S = R.stats.summary(period); P = R.stats.persona(S);
    const ss = slides(); n = ss.length;
    el.querySelector('.rp-bars').innerHTML = ss.map(() => '<i><b></b></i>').join('');
    el.querySelector('.rp-slides').innerHTML = ss.join('');
    for (const im of el.querySelectorAll('[data-rp-art]')) { const t = R.lib.get(im.dataset.rpArt); R.art.coverUrl(t, im.tagName === 'IMG' ? 'full' : 'thumb').then((u) => { if (!u) return; if (im.tagName === 'IMG') im.src = u; else im.style.backgroundImage = `url("${u}")`; }); }
    go(Math.min(i, n - 1), true);
  }
  function go(k, quiet) {
    clearTimeout(timer);
    i = Math.max(0, Math.min(n - 1, k));
    const secs = el.querySelectorAll('.rp-s'), bars = el.querySelectorAll('.rp-bars > i');
    secs.forEach((s, j) => { s.classList.toggle('on', j === i); s.classList.toggle('past', j < i); });
    bars.forEach((b, j) => { b.className = j < i ? 'done' : j === i ? 'run' : ''; });
    const bar = bars[i] && bars[i].querySelector('b'); if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; bar.style.animationDuration = DUR + 'ms'; }
    const s = secs[i];
    if (s) {
      for (const c of s.querySelectorAll('[data-count]')) count(c);
      if (s.classList.contains('rp-clock')) clock(s.querySelector('canvas'));
      if (s.classList.contains('rp-end')) card(s);
    }
    if (!quiet) R.sfx.play('tick');
    if (i < n - 1) timer = setTimeout(() => { if (!paused) go(i + 1); }, DUR);
  }
  function count(c) {
    const to = +c.dataset.count, fmt = c.dataset.fmt, t0 = performance.now();
    const step = (now) => { if (!el) return; const f = Math.min(1, (now - t0) / 1200), e = 1 - Math.pow(1 - f, 3), v = to * e; c.innerHTML = fmt === 'hm' ? hm(v) : String(Math.round(v)); if (f < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function clock(cv) {
    if (!cv) return;
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1), N = Math.min(r.width, r.height);
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0);
    const cx = r.width / 2, cy = r.height / 2, R0 = N * 0.2, R1 = N * 0.46, max = Math.max(...S.hours) || 1;
    const acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff2bd6', acc2 = getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim() || '#22f3ff';
    const t0 = performance.now();
    const step = (now) => {
      if (!el) return;
      const f = Math.min(1, (now - t0) / 1100), e = 1 - Math.pow(1 - f, 3);
      x.clearRect(0, 0, r.width, r.height);
      x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 1;
      for (const rr of [R0, (R0 + R1) / 2, R1]) { x.beginPath(); x.arc(cx, cy, rr, 0, R.TAU); x.stroke(); }
      for (let h = 0; h < 24; h++) {
        const a0 = (h / 24) * R.TAU - Math.PI / 2, a1 = ((h + 1) / 24) * R.TAU - Math.PI / 2 - 0.035;
        const v = S.hours[h] / max, rr = R0 + (R1 - R0) * v * e;
        const g = x.createRadialGradient(cx, cy, R0, cx, cy, R1); g.addColorStop(0, acc2); g.addColorStop(1, acc);
        x.fillStyle = h === S.peak ? '#ffffff' : g; x.globalAlpha = 0.35 + 0.65 * v;
        x.beginPath(); x.arc(cx, cy, R0, a0, a1); x.arc(cx, cy, Math.max(R0 + 2, rr), a1, a0, true); x.closePath(); x.fill();
      }
      x.globalAlpha = 1; x.fillStyle = 'rgba(255,255,255,.6)'; x.font = `700 ${Math.round(N * 0.04)}px ${getComputedStyle(document.body).fontFamily}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (const [h, l] of [[0, '0'], [6, '6'], [12, '12'], [18, '18']]) { const a = (h / 24) * R.TAU - Math.PI / 2; x.fillText(l, cx + Math.cos(a) * (R0 - N * 0.05), cy + Math.sin(a) * (R0 - N * 0.05)); }
      if (f < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  // the share picture: a story-sized card (1080 × 1920)
  async function picture() {
    const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), th = (R.stage.current() || {}).theme || {};
    const a1 = th.accent || '#ff2bd6', a2 = th.accent2 || '#22f3ff';
    const FONT = '-apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", sans-serif';
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, R.color.mix(a1, '#000000', 0.55)); g.addColorStop(0.5, '#0a0814'); g.addColorStop(1, R.color.mix(a2, '#000000', 0.6));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (const [cx, cy, r, col] of [[180, 260, 520, a1], [920, 1500, 600, a2], [900, 300, 300, '#ffffff']]) { const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, R.color.rgba(col, 0.32)); rg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H); }
    x.textBaseline = 'alphabetic'; x.fillStyle = '#fff';
    x.font = `800 40px ${FONT}`; x.fillStyle = R.color.mix(a2, '#ffffff', 0.4); x.fillText('耳目一新 RESKIN · ' + S.label, 90, 150);
    x.font = `900 104px ${FONT}`; x.fillStyle = '#fff'; x.fillText('痞子葳的', 90, 290); x.fillText('聽歌報告', 90, 410);
    const hh = Math.floor(S.total / 3600), mm = Math.round((S.total % 3600) / 60);
    x.font = `900 190px Orbitron, ${FONT}`; x.fillStyle = a1; x.fillText(String(hh || mm), 90, 650);
    const w0 = x.measureText(String(hh || mm)).width;
    x.font = `800 60px ${FONT}`; x.fillStyle = '#fff'; x.fillText(hh ? '小時' + (mm ? ` ${mm} 分` : '') : '分鐘', 110 + w0, 640);
    x.font = `600 38px ${FONT}`; x.fillStyle = 'rgba(255,255,255,.7)'; x.fillText(`聽完 ${S.plays} 首 · ${S.days} 天有開歌`, 94, 720);
    const top = S.topTracks[0];
    if (top) {
      const im = await R.art.coverImage(top.t);
      x.save(); x.shadowColor = R.color.rgba(a1, 0.6); x.shadowBlur = 60; x.fillStyle = '#000'; R.snap.rrect(x, 90, 800, 360, 360, [28, 28, 28, 28]); x.fill(); x.restore();
      x.save(); R.snap.rrect(x, 90, 800, 360, 360, [28, 28, 28, 28]); x.clip(); if (im) R.snap.cover(x, im, 90, 800, 360, 360); x.restore();
      x.font = `700 34px ${FONT}`; x.fillStyle = R.color.mix(a2, '#ffffff', 0.3); x.fillText('主打歌', 500, 860);
      const wrap = (txt, max, y, size) => { x.font = `900 ${size}px ${FONT}`; let line = '', yy = y; for (const ch of Array.from(txt)) { if (x.measureText(line + ch).width > max && line) { x.fillText(line, 500, yy); yy += size * 1.2; line = ch; if (yy > y + size * 2.4) { line = '…'; break; } } else line += ch; } x.fillText(line, 500, yy); return yy; };
      x.fillStyle = '#fff'; const yy = wrap(top.t.title, 500, 930, 58);
      x.font = `600 34px ${FONT}`; x.fillStyle = 'rgba(255,255,255,.7)'; x.fillText(`${top.t.artist || '未知歌手'} · ${top.n} 次`, 500, yy + 56);
    }
    let y = 1270;
    const row = (k, v) => { x.font = `700 34px ${FONT}`; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillText(k, 90, y); x.font = `900 52px ${FONT}`; x.fillStyle = '#fff'; let vv = v; while (vv.length > 2 && x.measureText(vv).width > 880) vv = vv.slice(0, -2) + '…'; x.fillText(vv, 90, y + 66); y += 160; };
    if (S.topArtists[0]) row('最愛的歌手', S.topArtists[0].name);
    if (S.topSkins[0]) row('最常穿的 Skin', S.topSkins[0].def.name);
    row('音樂人格', P.icon + ' ' + P.name);
    x.font = `700 30px ${FONT}`; x.fillStyle = 'rgba(255,255,255,.45)'; x.fillText('耳目一新 RESKIN', 90, H - 90);
    x.textAlign = 'right'; x.fillText(new Date().toLocaleDateString('zh-TW'), W - 90, H - 90); x.textAlign = 'left';
    return R.art.toBlob(c, 'image/png');
  }
  let shot = null;
  async function card(s) {
    const box = s.querySelector('.rp-card'); if (!box || box.dataset.done === period) return;
    box.dataset.done = period;
    const blob = await picture(); if (!blob || !el) return;
    shot = blob;
    const u = await R.imageURL(blob);
    box.innerHTML = `<img src="${u}" alt="聽歌報告分享圖">`;
    s.querySelector('[data-rp="btns"]').innerHTML = `<button type="button" class="btn pri wide" data-rp-go="share">${I.share}分享或存起來</button>`;
  }
  function open() {
    if (el) return;
    if (R.ui.sheetKind()) R.ui.closeSheet(true);
    if (R.lyrics.isOpen()) R.lyrics.hide();
    if (R.wardrobe.isOpen()) R.wardrobe.close(true);
    el = document.createElement('div'); el.id = 'report'; el.className = 'rp';
    el.innerHTML = `<div class="rp-bg"><i></i><i></i><i></i></div><div class="rp-bars"></div><button type="button" class="rp-x" aria-label="關閉">${I.close}</button><div class="rp-slides"></div>`;
    document.getElementById('app').appendChild(el);
    R.fx.focus('report', true);
    i = 0; render();
    requestAnimationFrame(() => el && el.classList.add('in'));
    R.sfx.play('open');
    el.addEventListener('pointerdown', (e) => { if (e.target.closest('button, a, [data-rp-p]')) return; downX = e.clientX; downT = performance.now(); paused = true; el.classList.add('hold'); clearTimeout(hold); });
    el.addEventListener('pointerup', (e) => {
      if (e.target.closest('button, a, [data-rp-p]')) return;
      el.classList.remove('hold'); paused = false;
      const dx = e.clientX - downX, long = performance.now() - downT > 350;
      if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
      else if (!long) go(i + (e.clientX > innerWidth * 0.32 ? 1 : -1));
      else go(i, true);
    });
    el.addEventListener('click', async (e) => {
      if (e.target.closest('.rp-x')) { close(); return; }
      const p = e.target.closest('[data-rp-p]'); if (p) { period = p.dataset.rpP; i = 0; render(); R.sfx.play('toggle'); return; }
      if (e.target.closest('[data-rp-go="share"]') && shot) { clearTimeout(timer); R.share.present({ blob: shot, name: `耳目一新-聽歌報告-${S.label}.png`, title: '痞子葳的聽歌報告', text: `我的聽歌報告（${S.label}）`, heading: '分享聽歌報告' }); }
    });
  }
  function close() {
    if (!el) return;
    clearTimeout(timer);
    const e0 = el; el = null; shot = null;
    e0.classList.remove('in'); setTimeout(() => e0.remove(), 380);
    R.fx.focus('report', false);
    R.sfx.play('close');
  }
  document.addEventListener('keydown', (e) => { if (!el) return; if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(i + 1); else if (e.key === 'ArrowLeft') go(i - 1); });
  return { open, close, isOpen: () => !!el };
})();
