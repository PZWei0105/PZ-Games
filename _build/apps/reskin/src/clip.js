/* ===================== music video: one tap, a 9:16 clip of the skin playing the chorus, with karaoke lyrics =====================
   The skin plays the chosen stretch on screen as usual; every frame it is painted (R.snap: canvases, cover, text — no
   buttons) into a 720×1280 or 1080×1920 canvas with the lyrics and a small mark on top, which MediaRecorder films.
   The sound is not taken from the speakers: the song file is decoded once and that stretch is fed straight into the
   recording (Web Audio, used only for this, never for the music you hear), started at the exact point the player is at.
   iPhone: Safari 14.5+ records MP4 (H.264 + AAC) and the share sheet saves it to Photos or sends it to IG. */
R.clip = (() => {
  const { esc, I, settings, bus } = R;
  const AC = window.AudioContext || window.webkitAudioContext;
  const can = () => !!(window.MediaRecorder && AC && HTMLCanvasElement.prototype.captureStream);
  const opt = { seg: 'hot', len: 15, lyr: true, hd: false };
  let st = null; // recording state
  let sheetId = null;

  async function open(id) {
    const t = R.lib.get(id || (R.player.current() || {}).id); if (!t) { R.toast('先放一首歌'); return; }
    sheetId = t.id;
    if (!can()) { R.ui.notice({ title: '這裡不能錄影片', sub: R.isIOS ? 'iPhone 要 iOS 14.5 以上的 Safari（或加到主畫面的網頁版）才能錄。' : '這個瀏覽器不支援在網頁裡錄影片，可以換 Chrome、Edge 或 Safari 試試。' }); return; }
    const r = await R.analysis.get(t.id);
    const hot = r ? R.viz.hotSpansOf(r) : [];
    if (!hot.length && opt.seg === 'hot') opt.seg = 'now';
    const L = R.lyrics.of(t), synced = !!(L && L.synced);
    const d = R.stage.current() || {};
    const seg = (k, l, dis) => `<button type="button" data-cl-seg="${k}" class="${opt.seg === k ? 'on' : ''}" ${dis ? 'disabled style="opacity:.4"' : ''}>${l}</button>`;
    R.ui.openSheet(`<div class="sh-head"><h3>做成音樂短片</h3><button type="button" class="ib" data-cl="close" aria-label="關閉">${I.close}</button></div>
      <div class="sc">
        <div class="cl-hero"><div class="cl-frame"><i class="cl-rec"></i><b>9:16</b><small>${esc(d.name || '')}</small></div><div><b>${esc(t.title)}</b><p>用現在這套「${esc(d.name || '')}」錄一段直式短片：Skin 的特效、歌名${synced ? '、逐字亮起的歌詞' : ''}都會錄進去，按鈕不會。</p></div></div>
        <div class="set-g">
          <div class="set-r set-col"><div class="lb"><b>錄哪一段</b><small>${hot.length ? '副歌是從音量起伏自動找的' : '這首找不到明顯的副歌'}</small></div><div class="seg">${seg('hot', '副歌', !hot.length)}${seg('now', '從現在')}${seg('start', '從頭')}</div></div>
          <div class="set-r set-col"><div class="lb"><b>長度</b></div><div class="seg"><button type="button" data-cl-len="15" class="${opt.len === 15 ? 'on' : ''}">15 秒</button><button type="button" data-cl-len="30" class="${opt.len === 30 ? 'on' : ''}">30 秒</button></div></div>
          ${synced ? `<div class="set-r"><div class="lb"><b>卡拉 OK 歌詞</b><small>唱到哪個字亮到哪個字</small></div><button type="button" class="sw${opt.lyr ? ' on' : ''}" data-cl="lyr" role="switch"></button></div>` : ''}
          <div class="set-r"><div class="lb"><b>1080p 高畫質</b><small>${R.isIOS || R.isAndroid ? '檔案比較大，舊手機錄起來可能不順' : '檔案比較大'}</small></div><button type="button" class="sw${opt.hd ? ' on' : ''}" data-cl="hd" role="switch"></button></div>
        </div>
        <div class="btn-row" style="padding:4px 4px 6px"><button type="button" class="btn pri wide" data-cl="go">${I.sparkle}開始錄製</button></div>
        <p class="share-tip">錄的時候畫面會播放這一段，請保持螢幕開著、不要切到別的 App。</p>
      </div>`, { kind: 'clip', onClose: () => { sheetId = null; } });
  }
  document.addEventListener('click', (e) => {
    if (R.ui.sheetKind() !== 'clip') return;
    const b = e.target.closest('[data-cl], [data-cl-seg], [data-cl-len]'); if (!b) return;
    if (b.dataset.clSeg) { opt.seg = b.dataset.clSeg; b.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); R.sfx.play('toggle'); return; }
    if (b.dataset.clLen) { opt.len = +b.dataset.clLen; b.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); R.sfx.play('toggle'); return; }
    const a = b.dataset.cl;
    if (a === 'close') R.ui.closeSheet();
    else if (a === 'lyr' || a === 'hd') { opt[a] = !opt[a]; b.classList.toggle('on', opt[a]); R.sfx.play('toggle'); }
    else if (a === 'go') {
      // the audio context has to be made inside the tap (iPhone)
      let actx = null;
      try { actx = new AC(); if (actx.resume) actx.resume(); } catch (err) { actx = null; }
      if (!actx) { R.toast('這裡開不了錄音的聲音通道'); return; }
      const id = sheetId; R.ui.closeSheet(true);
      R.player.prime();
      record(id, actx).catch((err) => { console.error(err); fail('錄影沒有成功：' + (err && err.message ? err.message : err)); });
    }
  });

  function pickType() {
    if (R.isIOS) return ''; // Safari: let it choose (MP4, H.264 + AAC)
    for (const m of ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) { /* ignore */ } }
    return '';
  }
  async function decodeStretch(actx, id, a, b) {
    const raw = await R.db.getAudioRaw(id);
    if (!raw) throw new Error('讀不到這首歌的檔案');
    const buf = await new Promise((res, rej) => { try { const p = actx.decodeAudioData(raw.buf.slice(0), res, rej); if (p && p.then) p.then(res, rej); } catch (e) { rej(e); } });
    const sr = buf.sampleRate, i0 = Math.max(0, Math.floor(a * sr)), i1 = Math.min(buf.length, Math.ceil(b * sr)), n = Math.max(1, i1 - i0);
    const out = actx.createBuffer(buf.numberOfChannels, n, sr);
    const fi = Math.round(sr * 0.25), fo = Math.round(sr * 0.9);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const src = buf.getChannelData(c).subarray(i0, i1), dst = out.getChannelData(c);
      dst.set(src);
      for (let k = 0; k < fi && k < n; k++) dst[k] *= k / fi;
      for (let k = 0; k < fo && k < n; k++) dst[n - 1 - k] *= k / fo;
    }
    return out;
  }
  function fail(msg) {
    cleanup();
    R.ui.busy(null);
    R.toast(msg, { ms: 6000 }); R.sfx.play('err');
  }
  function cleanup() {
    if (!st) return;
    const s = st; st = null;
    try { if (s.src) s.src.stop(); } catch (e) { /* ignore */ }
    try { if (s.rec && s.rec.state !== 'inactive') s.rec.stop(); } catch (e) { /* ignore */ }
    try { s.stream && s.stream.getTracks().forEach((tr) => tr.stop()); } catch (e) { /* ignore */ }
    try { s.actx && s.actx.close(); } catch (e) { /* ignore */ }
    if (s.cv) s.cv.remove();
    if (s.ui) s.ui.remove();
    if (s.wake) s.wake.release().catch(() => {});
    document.body.classList.remove('rec');
  }

  async function record(id, actx) {
    const t = R.lib.get(id); if (!t) throw new Error('找不到這首歌');
    const r = await R.analysis.get(id);
    const hot = r ? R.viz.hotSpansOf(r) : [];
    const cur = R.player.current();
    const dur = (cur && cur.id === id ? R.player.duration() : 0) || t.duration || (r ? r.duration : 0) || 0;
    let a = opt.seg === 'hot' && hot.length ? Math.max(0, hot[0][0] - 1.2) : opt.seg === 'now' && cur && cur.id === id ? R.player.time() : 0;
    if (dur && a + opt.len > dur) a = Math.max(0, dur - opt.len);
    const b = dur ? Math.min(dur, a + opt.len) : a + opt.len;
    R.ui.busy('準備錄影', '讀取這一段音樂…', null);
    const seg = await decodeStretch(actx, id, a, b);
    // the video canvas: portrait 9:16 (landscape screens record 16:9)
    const land = innerWidth > innerHeight * 1.15;
    const big = opt.hd ? 1920 : 1280, small = opt.hd ? 1080 : 720;
    const cv = document.createElement('canvas'); cv.width = land ? big : small; cv.height = land ? small : big;
    cv.className = 'cl-cv'; document.body.appendChild(cv);
    const ctx = cv.getContext('2d', { alpha: false });
    const stream = cv.captureStream(30);
    const dest = actx.createMediaStreamDestination();
    const src = actx.createBufferSource(); src.buffer = seg; src.connect(dest);
    const at = dest.stream.getAudioTracks()[0]; if (at) stream.addTrack(at);
    const type = pickType();
    let rec;
    try { rec = type ? new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: opt.hd ? 14e6 : 8e6 }) : new MediaRecorder(stream); }
    catch (e) { rec = new MediaRecorder(stream); }
    const chunks = [];
    rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    // the overlay while filming: REC, the seconds, a stop button (none of it is recorded)
    const ui = document.createElement('div'); ui.className = 'cl-ui';
    ui.innerHTML = `<div class="cl-bar"><i class="cl-dot"></i><b>REC</b><span data-cl-t>0:00 / 0:${String(Math.round(b - a)).padStart(2, '0')}</span><button type="button" data-cl-stop>${I.close}停止</button></div><div class="cl-cnt" data-cl-cnt>3</div>`;
    document.getElementById('app').appendChild(ui);
    let wake = null; try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (e) { wake = null; }
    st = { id, t, a, b, cv, ctx, stream, rec, src, actx, ui, wake, chunks, startAt: 0, started: false, plan: null, planAt: 0, wasPlaying: R.player.wants(), lyr: null, type };
    document.body.classList.add('rec');
    R.ui.busy(null);
    if (R.lyrics.isOpen()) R.lyrics.hide();
    // get the player to the start of the stretch and playing
    if (!cur || cur.id !== id) await R.player.playFrom(R.player.queue().includes(id) ? R.player.queue() : [id], id, R.player.source(), { at: a, autoplay: false });
    R.player.seek(a); R.player.pause();
    const L = R.lyrics.of(t); st.lyr = opt.lyr && L && L.synced ? L.synced : null;
    // 3, 2, 1
    const cnt = ui.querySelector('[data-cl-cnt]');
    for (const n of [3, 2, 1]) { if (!st) return; cnt.textContent = n; cnt.classList.remove('go'); void cnt.offsetWidth; cnt.classList.add('go'); R.sfx.play('tick'); await R.sleep(650); }
    if (!st) return;
    cnt.remove();
    R.player.play();
    const t0 = performance.now();
    while (st && !(R.player.isPlaying() && R.player.time() >= a - 0.05)) { if (performance.now() - t0 > 6000) throw new Error('播放沒有開始'); await R.sleep(30); }
    if (!st) return;
    // start the sound at the exact place the player is now, and start filming
    if (actx.state !== 'running') { try { await actx.resume(); } catch (e) { /* ignore */ } }
    const off = Math.max(0, Math.min(seg.duration - 0.05, R.player.time() - a));
    paint(); // one frame before the recorder starts, so the video never opens on black
    rec.start();
    src.start(0, off);
    st.startAt = actx.currentTime - off; st.started = true;
    R.sfx.play('rec');
    src.onended = () => finish();
  }
  // the stop button and leaving the app
  document.addEventListener('click', (e) => { if (st && e.target.closest('[data-cl-stop]')) finish(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && st) { fail('錄影中斷了：錄的時候請留在這個畫面'); } });

  async function finish() {
    if (!st || st.ending) return;
    const s = st; s.ending = true;
    const done = new Promise((res) => { s.rec.onstop = res; });
    try { s.rec.stop(); } catch (e) { /* ignore */ }
    try { s.src.stop(); } catch (e) { /* ignore */ }
    await Promise.race([done, R.sleep(3000)]);
    const blob = new Blob(s.chunks, { type: (s.rec.mimeType || s.type || 'video/mp4').split(';')[0] || 'video/mp4' });
    const keepPlaying = s.wasPlaying;
    cleanup();
    if (!keepPlaying) R.player.pause();
    if (!blob.size) { R.toast('沒有錄到畫面：這台裝置可能不支援，請把結果告訴我', { ms: 6000 }); return; }
    const webm = /webm/.test(blob.type);
    const name = `耳目一新-${(s.t.title || '短片').replace(/[\\/:*?"<>|]/g, '').slice(0, 40)}.${webm ? 'webm' : 'mp4'}`;
    R.share.present({ blob, name, title: s.t.title, text: `${s.t.title}${s.t.artist ? ' — ' + s.t.artist : ''}`, video: true, heading: '音樂短片做好了', note: webm ? '這個瀏覽器錄出來的是 WebM 檔：電腦上看沒問題，要上傳 IG 建議用 iPhone 錄 MP4。' : '' });
  }

  /* ---------- every frame: the skin, the lyrics, the mark ---------- */
  function paint() {
    const s = st; if (!s) return;
    const { ctx, cv } = s, W = cv.width, H = cv.height;
    const root = R.stage.root(); if (!root) return;
    const now = performance.now();
    if (!s.plan || now - s.planAt > 1500 || s.plan.root !== root) { s.plan = R.snap.plan(root, { ui: false }); s.planAt = now; }
    const rb = root.getBoundingClientRect();
    const sc = Math.max(W / rb.width, H / rb.height);
    const ox = rb.left - (W / sc - rb.width) / 2, oy = rb.top - (H / sc - rb.height) / 2;
    const th = (R.stage.current() || {}).theme || {};
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = th.bg || '#000'; ctx.fillRect(0, 0, W, H);
    R.snap.draw(ctx, s.plan, { ox, oy, s: sc });
    const tt = s.started ? s.actx.currentTime - s.startAt : 0, len = s.b - s.a;
    const k = W / 720;
    if (s.lyr) lyrics(ctx, W, H, k, s.a + tt, th);
    // the mark
    ctx.font = `700 ${Math.round(20 * k)}px "Orbitron", sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8 * k;
    ctx.fillText('RESKIN', W - 28 * k, H - 30 * k);
    ctx.font = `600 ${Math.round(15 * k)}px -apple-system, "PingFang TC", sans-serif`; ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillText('耳目一新 · ' + ((R.stage.current() || {}).name || ''), W - 28 * k, H - 58 * k);
    ctx.shadowBlur = 0; ctx.textAlign = 'left';
    // fade in and out
    const fade = Math.max(0, 1 - tt / 0.5, (tt - (len - 0.7)) / 0.7);
    if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`; ctx.fillRect(0, 0, W, H); }
    const tEl = s.ui.querySelector('[data-cl-t]'); if (tEl) tEl.textContent = `${R.fmtTime(Math.max(0, tt))} / ${R.fmtTime(len)}`;
  }
  function lyrics(ctx, W, H, k, now, th) {
    const list = st.lyr; let i = -1;
    for (let j = 0; j < list.length; j++) { if (list[j][0] <= now + 0.1) i = j; else break; }
    if (i < 0) return;
    const T = R.lyrics.timesOf(list, i), text = list[i][1] || '';
    if (!text) return;
    const chars = Array.from(text);
    let n = 0; while (n < chars.length && T[n + 1] <= now) n++;
    const frac = n < chars.length ? Math.max(0, Math.min(1, (now - T[n]) / Math.max(0.05, T[n + 1] - T[n]))) : 0;
    let fs = 50 * k;
    ctx.font = `900 ${fs}px "Chakra Petch", -apple-system, "PingFang TC", sans-serif`;
    while (ctx.measureText(text).width > W * 0.88 && fs > 24 * k) { fs -= 2 * k; ctx.font = `900 ${fs}px "Chakra Petch", -apple-system, "PingFang TC", sans-serif`; }
    const tw = ctx.measureText(text).width, x0 = (W - tw) / 2, y = H * (W > H ? 0.8 : 0.74);
    // where the sung part ends: the width of the finished characters plus a share of the current one
    const done = ctx.measureText(chars.slice(0, n).join('')).width + (n < chars.length ? ctx.measureText(chars[n]).width * frac : 0);
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8 * k; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineJoin = 'round'; ctx.strokeText(text, x0, y);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillText(text, x0, y);
    ctx.save(); ctx.beginPath(); ctx.rect(x0 - 4, y - fs, done + 4, fs * 2); ctx.clip();
    ctx.shadowColor = th.accent || '#ff2bd6'; ctx.shadowBlur = 22 * k; ctx.fillStyle = '#ffffff'; ctx.fillText(text, x0, y);
    ctx.shadowBlur = 0; ctx.restore();
    const nx = list[i + 1] && list[i + 1][1];
    if (nx) { ctx.font = `700 ${Math.round(fs * 0.62)}px "Chakra Petch", -apple-system, "PingFang TC", sans-serif`; ctx.fillStyle = 'rgba(255,255,255,.42)'; ctx.textAlign = 'center'; ctx.fillText(nx.length > 26 ? nx.slice(0, 25) + '…' : nx, W / 2, y + fs * 1.15); ctx.textAlign = 'left'; }
  }
  function frame() { if (st && st.started && !st.ending) paint(); }
  bus.on('skin', () => { if (st) st.plan = null; });
  return { open, frame, can, active: () => !!st };
})();
