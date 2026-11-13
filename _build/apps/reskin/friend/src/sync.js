/* ===================== beat sync: the "matching the beat" chip and the sync test (對拍測試) =====================
   Chip: while the song being played has not been measured with the beat grid yet, a small chip says so; when the grid
   lands it says the beat is locked and goes away. Sync test: a click track (120 BPM, accent on 1) plays through an
   <audio> element — the same path as the music, so Bluetooth delay is included — and a ring flashes on each click by
   the same clock the visuals use (playback time + 35 ms − latency setting). Move the slider until click and flash meet. */
R.sync = (() => {
  const { $, settings, bus } = R;
  const chip = document.createElement('div');
  chip.id = 'syncChip'; chip.hidden = true; chip.setAttribute('role', 'status');
  $('#app').appendChild(chip);
  let wait = 0, showing = '', okT = 0, lastId = null;
  const EQ = '<i class="sc-eq"><b></b><b></b><b></b></i>';
  function set(kind) {
    if (kind === showing) return;
    showing = kind;
    if (!kind) { chip.hidden = true; chip.className = ''; return; }
    chip.className = kind;
    chip.innerHTML = kind === 'wait' ? EQ + '<span>正在對拍這首歌…</span>' : '<i class="sc-ok">♪</i><span>拍子對上了</span>';
    chip.hidden = false;
  }
  function tick() {
    const t = R.player.current();
    if (!t || document.hidden) { set(''); wait = 0; return; }
    if (t.id !== lastId) { lastId = t.id; wait = 0; okT = 0; if (showing === 'ok') set(''); }
    const pending = !R.viz.synced && R.player.isPlaying() && t.an !== 2 && !(t.an === -1 && (t.afv || 0) >= R.analysis.AV);
    if (pending) { wait += 0.25; if (wait > 1.5) set('wait'); return; }
    if (showing === 'wait' && R.viz.synced) { set('ok'); okT = 1.6; return; }
    if (showing === 'ok') { okT -= 0.25; if (okT <= 0) set(''); return; }
    wait = 0; if (showing) set('');
  }
  setInterval(tick, 250);

  /* ---------- the sync test ---------- */
  let audio = null, url = '', raf = 0, lastK = -1, resume = false;
  const BPM = 120, BEATS = 16, SPB = 60 / BPM;
  function clickTrack() {
    const sr = 22050, len = Math.round(sr * BEATS * SPB), pcm = new Int16Array(len);
    for (let k = 0; k < BEATS; k++) {
      const o = Math.round(k * SPB * sr), f = k % 4 === 0 ? 2350 : 1500, g = k % 4 === 0 ? 0.92 : 0.62;
      for (let i = 0; i < sr * 0.035 && o + i < len; i++) pcm[o + i] = Math.round(32767 * g * Math.exp(-i / (sr * 0.0065)) * Math.sin((2 * Math.PI * f * i) / sr));
    }
    const buf = new ArrayBuffer(44 + len * 2), dv = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); dv.setUint32(4, 36 + len * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, sr, true);
    dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, len * 2, true);
    new Int16Array(buf, 44).set(pcm);
    return new Blob([buf], { type: 'audio/wav' });
  }
  const lat = () => settings.get('latency') || 0;
  const fmt = (v) => (v > 0 ? '+' : '') + v + ' 毫秒';
  function html() {
    return `<div class="sh-head"><h3>對拍測試</h3><button type="button" class="ib" data-sy="close" aria-label="關閉">${R.I.close}</button></div>
    <div class="sc sy">
      <p class="sy-tip">戴上平常聽歌的耳機，按「開始」，聽滴答聲、看圓圈閃。<br><b>閃光比聲音早</b>就往右調，<b>比聲音晚</b>就往左調，調到「滴」跟「閃」同時發生。</p>
      <div class="sy-stage" aria-hidden="true"><div class="sy-ring"><i></i></div><div class="sy-dots"><b></b><b></b><b></b><b></b></div></div>
      <div class="sy-val"><button type="button" class="sy-b" data-sy="-10">−10</button><output class="sy-out">${fmt(lat())}</output><button type="button" class="sy-b" data-sy="+10">+10</button></div>
      <input type="range" min="-200" max="400" step="5" value="${lat()}" data-sy-range aria-label="畫面延遲（毫秒）">
      <div class="sy-row"><button type="button" class="sy-go" data-sy="play">開始</button><button type="button" class="sy-b" data-sy="zero">歸零</button></div>
      <small class="sy-note">用手機喇叭通常是 0；藍牙耳機（例如 AirPods）多半要往右調一些。測試時會先暫停正在播的歌，關掉後再接著播。</small>
    </div>`;
  }
  function paint() {
    const b = R.ui.body(); if (!b) return;
    const o = $('.sy-out', b), r = $('[data-sy-range]', b);
    if (o) o.textContent = fmt(lat());
    if (r && +r.value !== lat()) r.value = lat();
  }
  function stop() {
    cancelAnimationFrame(raf); raf = 0; lastK = -1;
    if (audio) { try { audio.pause(); } catch (e) { /* ignore */ } }
    const g = R.ui.body() && $('[data-sy="play"]', R.ui.body()); if (g) g.textContent = '開始';
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!audio || audio.paused) return;
    const tt = audio.currentTime + 0.035 - lat() / 1000, L = BEATS * SPB;
    const k = Math.floor((((tt % L) + L) % L) / SPB);
    if (k === lastK) return;
    lastK = k;
    const b = R.ui.body(); if (!b) return;
    const ring = $('.sy-ring', b); if (!ring) return;
    ring.classList.remove('on', 'down'); void ring.offsetWidth; ring.classList.add('on'); if (k % 4 === 0) ring.classList.add('down');
    $$('.sy-dots b', b).forEach((d, i) => d.classList.toggle('on', i === k % 4));
  }
  const $$ = R.$$;
  async function start() {
    if (!audio) {
      const blob = clickTrack();
      url = settings.get('srcMode') === 'data' ? await R.dataURL(blob) : URL.createObjectURL(blob);
      audio = new Audio(); audio.loop = true; audio.preload = 'auto'; audio.src = url; audio.setAttribute('playsinline', '');
    }
    if (R.player.isPlaying()) { resume = true; R.player.pause(); }
    try { audio.currentTime = 0; await audio.play(); } catch (e) { R.toast('播不出測試聲音，再按一次試試'); return; }
    const g = $('[data-sy="play"]', R.ui.body()); if (g) g.textContent = '停止';
    cancelAnimationFrame(raf); loop();
  }
  function open() {
    R.ui.openSheet(html(), {
      kind: 'sync',
      onClose: () => {
        stop();
        if (resume) { resume = false; R.player.play(); }
      },
    });
  }
  document.addEventListener('click', (e) => {
    if (R.ui.sheetKind() !== 'sync') return;
    const b = e.target.closest('[data-sy]'); if (!b) return;
    const a = b.dataset.sy;
    if (a === 'close') R.ui.closeSheet();
    else if (a === 'play') { if (audio && !audio.paused) stop(); else start(); }
    else if (a === 'zero') { settings.set('latency', 0); paint(); }
    else { settings.set('latency', Math.max(-200, Math.min(400, lat() + parseInt(a, 10)))); paint(); }
    R.stage.sfx('tick');
  });
  document.addEventListener('input', (e) => {
    if (R.ui.sheetKind() !== 'sync') return;
    const r = e.target.closest('[data-sy-range]'); if (!r) return;
    settings.set('latency', parseInt(r.value, 10) || 0); paint();
  });
  bus.on('track', () => tick());
  return { open };
})();
