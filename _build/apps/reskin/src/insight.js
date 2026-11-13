/* ===================== song intel (歌曲情報) and smart playlists (智慧歌單) =====================
   Everything here comes from the song's own analysis: tempo, key (chroma vs the Krumhansl profiles), loudness,
   brightness (spectral centroid), attack (how hard and how often the onsets hit) and the loudness curve with its
   chorus stretches. The panel shows it as a HUD and jumps to the chorus; the smart playlists sort the library by it. */
R.smart = (() => {
  const { settings, bus } = R;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const KINDS = [
    { id: 'hype', name: '嗨歌', sub: '最炸、最大聲的那幾首', g: ['#ff2d55', '#ff9a3c'], icon: '🔥', skin: 'stage' },
    { id: 'run', name: '運動', sub: '照 BPM 排，越播越快', g: ['#29e3ff', '#3dff7a'], icon: '⚡', skin: 'supercar' },
    { id: 'chill', name: '放鬆', sub: '慢一點、柔一點', g: ['#7c8cff', '#7fffd4'], icon: '🌊', skin: 'aurora' },
    { id: 'night', name: '深夜', sub: '暗一點、小調、適合關燈聽', g: ['#2a1b6b', '#b06bff'], icon: '🌙', skin: 'blackhole' },
  ];
  // 0..1 numbers from a song's measurements (old analyses only have bpm and energy: they still sort, just roughly)
  function feats(t) {
    const bpm = t.bpm || 0;
    const nl = t.loud != null ? clamp((t.loud + 26) / 18, 0, 1) : clamp(((t.energy || 0.6) - 0.45) / 0.45, 0, 1);
    const np = t.punch != null ? t.punch : 0.5;
    const nb = bpm ? clamp((bpm - 70) / 80, 0, 1) : 0.5;
    const nbr = t.bright ? clamp((t.bright - 700) / 2600, 0, 1) : 0.5;
    const minor = /m$/.test(t.mkey || '');
    const hype = 0.4 * nl + 0.27 * np + 0.2 * nb + 0.13 * nbr;
    const chill = 1 - (0.42 * nl + 0.3 * np + 0.28 * nb);
    const night = 0.3 * (minor ? 1 : t.mkey ? 0.25 : 0.5) + 0.35 * (1 - nbr) + 0.35 * (1 - (0.6 * nl + 0.4 * np));
    // songs read at half speed (85 BPM that really drive at 170) count double for running
    let rb = bpm; if (rb && rb < 92 && hype > 0.55) rb *= 2;
    return { hype, chill, night, rb, nl, np, nb, nbr, minor };
  }
  let cache = null;
  const drop = () => { cache = null; };
  bus.on('library', drop); bus.on('analysis', drop); bus.on('track:update', (t) => { if (t && t.an) drop(); });
  function pct(arr, p) { if (!arr.length) return 0; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; }
  function build() {
    if (cache) return cache;
    const all = R.lib.all().filter((t) => t.an === 1 && !t.lost);
    const F = new Map(all.map((t) => [t.id, feats(t)]));
    const few = all.length < 8;
    const thr = (k, p, abs) => (few ? abs : Math.max(abs - 0.12, pct(all.map((t) => F.get(t.id)[k]), p)));
    const hT = thr('hype', 0.68, 0.55), cT = thr('chill', 0.68, 0.55), nT = thr('night', 0.68, 0.55);
    const by = (k) => (a, b) => F.get(b.id)[k] - F.get(a.id)[k];
    const out = {
      hype: all.filter((t) => F.get(t.id).hype >= hT).sort(by('hype')),
      chill: all.filter((t) => F.get(t.id).chill >= cT && (!t.bpm || t.bpm < 118)).sort(by('chill')),
      night: all.filter((t) => F.get(t.id).night >= nT).sort(by('night')),
      run: all.filter((t) => { const f = F.get(t.id); return f.rb >= 116 && f.rb <= 185 && f.hype >= (few ? 0.42 : Math.max(0.4, pct(all.map((x) => F.get(x.id).hype), 0.4))); }).sort((a, b) => F.get(a.id).rb - F.get(b.id).rb),
    };
    cache = { lists: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.map((t) => t.id)])), F, pending: R.lib.all().filter((t) => !t.an).length };
    return cache;
  }
  const skinOf = (k) => { const m = settings.get('smartSkins') || {}; return k in m ? m[k] : (KINDS.find((x) => x.id === k) || {}).skin || null; };
  function pl(id) {
    const k = String(id).replace(/^smart:/, ''), d = KINDS.find((x) => x.id === k); if (!d) return null;
    return { id: 'smart:' + k, name: d.name, ids: build().lists[k] || [], skin: skinOf(k), created: 0, virtual: true, smart: d };
  }
  function bind(id, skin) { const k = String(id).replace(/^smart:/, ''); const m = Object.assign({}, settings.get('smartSkins') || {}); m[k] = skin || null; settings.set('smartSkins', m); bus.emit('playlists'); }
  const of = (t) => (t ? KINDS.filter((k) => (build().lists[k.id] || []).includes(t.id)) : []);
  return { KINDS, feats, pl, bind, of, pending: () => build().pending, all: () => KINDS.map((k) => pl(k.id)) };
})();

R.insight = (() => {
  const { $, esc, I, fmtTime, bus } = R;
  let id = null, rec = null, raf = 0, drag = false;
  const word = (v, a) => a[Math.min(a.length - 1, Math.floor(v * a.length))];
  function stat(label, value, sub, frac, col) {
    return `<div class="in-st"><small>${label}</small><b>${value}</b>${sub ? `<span>${sub}</span>` : ''}${frac != null ? `<i class="in-bar"><i style="width:${Math.round(Math.max(0.03, Math.min(1, frac)) * 100)}%;background:${col || 'var(--accent)'}"></i></i>` : ''}</div>`;
  }
  async function html(t) {
    const u = await R.art.coverUrl(t, 'thumb');
    const an = t.an === 1, stale = R.analysis.stale(t);
    const f = R.smart.feats(t);
    const ki = R.analysis.keyInfo(t.mkey);
    const bpm = t.bpm ? Math.round(t.bpm) : null;
    const tags = R.smart.of(t).map((k) => `<span class="in-tag" style="background:linear-gradient(135deg,${k.g[0]},${k.g[1]})">${k.icon} ${k.name}</span>`).join('');
    const kbps = t.duration && t.size ? Math.round((t.size * 8) / t.duration / 1000) : 0;
    const status = !t.an ? '<div class="in-wait"><i class="busy-ring"></i>這首還在分析，好了會自動出現</div>' : t.an === -1 ? '<div class="in-wait">這個格式讀不出節奏，畫面用模擬律動</div>' : t.an === 2 ? '<div class="in-wait">這首太長了，跳過分析</div>' : stale ? '<div class="in-wait"><i class="busy-ring"></i>正在補量調性、響度…</div>' : '';
    return `<div class="sh-head"><h3>歌曲情報</h3><button type="button" class="ib" data-in="close" aria-label="關閉">${I.close}</button></div>
      <div class="sc in-sc">
        <div class="in-hero"><div class="in-art" style="background-image:url('${u || ''}')"></div><div class="in-hd"><b>${esc(t.title)}</b><span>${esc(t.artist || '未知歌手')}</span><div class="in-tags">${tags || (an ? '<span class="in-tag dim">還沒有被分進智慧歌單</span>' : '')}</div></div></div>
        ${status}
        ${an ? `<div class="in-grid">
          ${stat('BPM 節奏', bpm || '--', bpm ? word(f.nb, ['很慢', '慢板', '中板', '輕快', '快板', '飆速']) : '', f.nb, 'linear-gradient(90deg,#29e3ff,#ff2bd6)')}
          ${stat('調性', ki ? esc(ki.zh) : stale ? '…' : '--', ki ? `${esc(t.mkey)} · Camelot ${ki.camelot}` : '', null)}
          ${stat('能量', Math.round(f.hype * 100), word(f.hype, ['安靜', '溫和', '中等', '有勁', '很嗨', '爆表']), f.hype, 'linear-gradient(90deg,#ff9a3c,#ff2d55)')}
          ${stat('響度', t.loud != null ? t.loud.toFixed(1) + '<small>dB</small>' : '--', t.loud != null ? word(f.nl, ['很小聲', '偏小聲', '適中', '偏大聲', '很大聲']) : '', t.loud != null ? f.nl : null, '#ffd23d')}
          ${stat('音色', t.bright ? word(f.nbr, ['低沉', '溫暖', '均衡', '明亮', '刺亮']) : '--', t.bright ? t.bright + ' Hz 重心' : '', t.bright ? f.nbr : null, '#7fffd4')}
          ${stat('鼓點衝擊', t.punch != null ? Math.round(t.punch * 100) : '--', t.punch != null ? word(t.punch, ['鬆散', '輕柔', '紮實', '強勁', '狂暴']) : '', t.punch != null ? t.punch : null, '#b06bff')}
        </div>
        <div class="sec-t">能量曲線 · 點一下跳過去</div>
        <div class="in-curve"><canvas data-in="curve"></canvas></div>
        <div class="btn-row in-act"><div class="btn-pair"><button type="button" class="btn pri" data-in="chorus">${I.party}跳到副歌</button><button type="button" class="btn sec" data-in="clip">${I.sparkle}做成短片</button></div></div>` : ''}
        <div class="set-g in-file">
          <div class="set-r"><div class="lb"><b>長度</b></div><span>${t.duration ? fmtTime(t.duration) : '—'}</span></div>
          <div class="set-r"><div class="lb"><b>格式</b></div><span>${esc((t.type || '').replace('audio/', '').toUpperCase() || '—')}${kbps ? ' · 約 ' + kbps + ' kbps' : ''}</span></div>
          <div class="set-r"><div class="lb"><b>大小</b></div><span>${((t.size || 0) / 1048576).toFixed(1)} MB</span></div>
          <div class="set-r"><div class="lb"><b>播放</b></div><span>${t.plays || 0} 次${t.last ? ' · 上次 ' + new Date(t.last).toLocaleDateString('zh-TW') : ''}</span></div>
          <div class="set-r"><div class="lb"><b>檔名</b></div><span style="word-break:break-all;text-align:right;max-width:65%">${esc(t.name || '—')}</span></div>
        </div>
      </div>`;
  }
  function curve() {
    const c = R.ui.body().querySelector('[data-in="curve"]'); if (!c || !rec) return;
    const r = c.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(r.width * d)) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); }
    const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0);
    const W = r.width, H = r.height, L = rec.level, n = Math.min(L.length, rec.frames), dur = n / rec.fps;
    x.clearRect(0, 0, W, H);
    // chorus stretches
    const hot = rec.hot || [];
    hot.forEach(([a, b], i) => { x.fillStyle = 'rgba(255,43,214,.16)'; x.fillRect((a / dur) * W, 0, ((b - a) / dur) * W, H); x.fillStyle = 'rgba(255,170,230,.85)'; x.font = '700 10px ' + getComputedStyle(document.body).fontFamily; x.fillText('副歌 ' + (i + 1), (a / dur) * W + 4, 12); });
    // the curve, smoothed to the width
    const cols = Math.max(20, Math.floor(W / 2)), ys = [];
    for (let i = 0; i < cols; i++) { const a = Math.floor((i / cols) * n), b = Math.max(a + 1, Math.floor(((i + 1) / cols) * n)); let s = 0; for (let k = a; k < b; k++) s += L[k]; ys.push(s / (b - a) / 255); }
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, R.color.rgba(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff2bd6', 0.85)); g.addColorStop(1, 'rgba(255,255,255,.02)');
    x.beginPath(); x.moveTo(0, H);
    ys.forEach((v, i) => x.lineTo((i / (cols - 1)) * W, H - 4 - Math.pow(v, 1.4) * (H - 18)));
    x.lineTo(W, H); x.closePath(); x.fillStyle = g; x.fill();
    x.beginPath(); ys.forEach((v, i) => (i ? x.lineTo : x.moveTo).call(x, (i / (cols - 1)) * W, H - 4 - Math.pow(v, 1.4) * (H - 18))); x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 1.4; x.stroke();
    // where the song is now
    const cur = R.player.current();
    if (cur && cur.id === id) { const px = (R.player.time() / (R.player.duration() || dur)) * W; x.fillStyle = '#fff'; x.fillRect(px - 1, 0, 2, H); x.beginPath(); x.arc(px, 6, 4, 0, R.TAU); x.fill(); }
  }
  function loop() { if (!id) return; if (R.ui.sheetKind() === 'insight') curve(); raf = requestAnimationFrame(loop); }
  async function render() {
    const t = R.lib.get(id); if (!t) { R.ui.closeSheet(); return; }
    rec = await R.analysis.get(id);
    if (rec && !rec.hot && R.viz) rec.hot = R.viz.hotSpansOf ? R.viz.hotSpansOf(rec) : [];
    const h = await html(t);
    if (R.ui.sheetKind() === 'insight') { const sc = $('.sc', R.ui.body()); const top = sc ? sc.scrollTop : 0; R.ui.body().innerHTML = h; const s2 = $('.sc', R.ui.body()); if (s2) s2.scrollTop = top; }
    else R.ui.openSheet(h, { kind: 'insight', onClose: () => { cancelAnimationFrame(raf); id = null; } });
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  async function open(tid) {
    const t = tid ? R.lib.get(tid) : R.player.current(); if (!t) { R.toast('先放一首歌'); return; }
    id = t.id;
    if (!t.an || R.analysis.stale(t)) R.analysis.enqueue(t.id, true);
    await render();
  }
  bus.on('analysis', (aid) => { if (aid === id && R.ui.sheetKind() === 'insight') render(); });
  // seek on the curve
  document.addEventListener('pointerdown', (e) => {
    const c = e.target.closest && e.target.closest('[data-in="curve"]'); if (!c || !rec) return;
    const cur = R.player.current();
    const go = (ev) => { const r = c.getBoundingClientRect(), f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), d = rec.frames / rec.fps; if (cur && cur.id === id) R.player.seek(f * (R.player.duration() || d)); else { R.player.prime(); R.player.playFrom(R.player.queue().length ? R.player.queue() : [id], id, R.player.source(), { at: f * d }); } };
    drag = true; go(e); R.stage.sfx('tick');
    const mv = (ev) => { if (drag) go(ev); }, up = () => { drag = false; window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });
  document.addEventListener('click', (e) => {
    if (R.ui.sheetKind() !== 'insight') return;
    const b = e.target.closest('[data-in]'); if (!b) return;
    const a = b.dataset.in;
    if (a === 'close') R.ui.closeSheet();
    else if (a === 'chorus') chorus(id);
    else if (a === 'clip') { R.ui.closeSheet(true); R.clip.open(id); }
  });
  // jump to the next chorus after where the song is (or the first one)
  async function chorus(tid) {
    const t = R.lib.get(tid || (R.player.current() || {}).id); if (!t) return;
    const r = await R.analysis.get(t.id);
    const hot = r ? r.hot || (R.viz.hotSpansOf ? R.viz.hotSpansOf(r) : []) : [];
    if (!hot.length) { R.toast('這首的音量起伏不大，找不到明顯的副歌'); return; }
    const cur = R.player.current(), now = cur && cur.id === t.id ? R.player.time() : -1;
    const next = hot.find(([a]) => a > now + 1) || hot[0];
    R.player.prime();
    if (cur && cur.id === t.id) { R.player.seek(Math.max(0, next[0] - 0.4)); if (!R.player.wants()) R.player.play(); }
    else R.player.playFrom(R.player.queue().includes(t.id) ? R.player.queue() : [t.id], t.id, R.player.source(), { at: Math.max(0, next[0] - 0.4) });
    R.stage.sfx('next'); R.toast('副歌 ' + (hot.indexOf(next) + 1) + ' ▶', { ms: 1400 });
  }
  return { open, chorus };
})();
