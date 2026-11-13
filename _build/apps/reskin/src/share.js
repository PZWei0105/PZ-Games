/* ===================== share card: the song you are listening to, as a picture in the style of the current skin ===================== */
R.share = (() => {
  const { I, esc } = R;
  const W = 1080, H = 1350;
  const FONT = '-apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';

  // the biggest canvas the skin is drawing on, i.e. what the screen looks like right now (minus text and buttons)
  function skinCanvas() {
    const root = R.stage.root(); if (!root) return null;
    let best = null, area = 0;
    for (const c of root.querySelectorAll('canvas')) {
      const r = c.getBoundingClientRect(), a = r.width * r.height;
      if (a > area && c.width > 2 && c.height > 2) { best = c; area = a; }
    }
    return best;
  }
  const rr = (x, l, t, w, h, r) => { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); };
  // CJK-friendly wrapping: break anywhere, prefer spaces in Latin text
  function wrap(x, text, max, lines) {
    const out = []; let cur = '';
    for (const ch of Array.from(text)) {
      if (x.measureText(cur + ch).width > max && cur) {
        const sp = cur.lastIndexOf(' ');
        if (/[A-Za-z0-9]/.test(ch) && sp > 0) { out.push(cur.slice(0, sp)); cur = cur.slice(sp + 1) + ch; } else { out.push(cur); cur = ch; }
        if (out.length === lines) break;
      } else cur += ch;
    }
    if (out.length < lines && cur) out.push(cur);
    if (out.length === lines && Array.from(text).length > out.join('').length + out.length) { let l = out[lines - 1]; while (l && x.measureText(l + '…').width > max) l = l.slice(0, -1); out[lines - 1] = l + '…'; }
    return out;
  }

  async function make() {
    const t = R.player.current(); if (!t) return null;
    const d = R.stage.current() || { name: '', theme: {} };
    const th = d.theme || {}, col = R.art.colorsOf(t);
    const accent = th.accent || col.vibrant, accent2 = th.accent2 || col.light;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    // background: the skin itself, or the cover's colours
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, R.color.mix(col.vibrant, '#000000', 0.35)); g.addColorStop(1, R.color.mix(col.dark || '#000000', '#000000', 0.5));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const sc = skinCanvas();
    if (sc) {
      try {
        const s = Math.max(W / sc.width, H / sc.height);
        x.imageSmoothingEnabled = sc.width >= 400;
        x.drawImage(sc, (W - sc.width * s) / 2, (H - sc.height * s) / 2, sc.width * s, sc.height * s);
        x.imageSmoothingEnabled = true;
      } catch (e) { /* a canvas we may not read: keep the colours */ }
    }
    const shade = x.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, 'rgba(0,0,0,.25)'); shade.addColorStop(0.55, 'rgba(0,0,0,.35)'); shade.addColorStop(1, 'rgba(0,0,0,.78)');
    x.fillStyle = shade; x.fillRect(0, 0, W, H);
    // cover
    const im = await R.art.coverImage(t);
    const S = 600, cx = (W - S) / 2, cy = 150;
    x.save(); x.shadowColor = R.color.rgba(accent, 0.55); x.shadowBlur = 90; x.fillStyle = '#000'; rr(x, cx, cy, S, S, 44); x.fill(); x.restore();
    x.save(); rr(x, cx, cy, S, S, 44); x.clip();
    if (im) x.drawImage(im, cx, cy, S, S); else { x.fillStyle = accent; x.fillRect(cx, cy, S, S); }
    x.restore();
    x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 3; rr(x, cx, cy, S, S, 44); x.stroke();
    // title, artist
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    let fs = 64; x.font = `800 ${fs}px ${FONT}`;
    let lines = wrap(x, t.title, W - 160, 2);
    if (lines.length > 1) { fs = 54; x.font = `800 ${fs}px ${FONT}`; lines = wrap(x, t.title, W - 160, 2); }
    let y = cy + S + 112;
    x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 18;
    for (const l of lines) { x.fillText(l, W / 2, y); y += fs * 1.22; }
    x.font = `600 34px ${FONT}`; x.fillStyle = accent2;
    x.fillText(wrap(x, t.artist || '未知歌手', W - 200, 1)[0] || '', W / 2, y + 6);
    x.shadowBlur = 0;
    // the song's loudness from start to end
    const ov = R.viz.overview;
    const n = 56, bw = (W - 220) / n, base = H - 190;
    for (let i = 0; i < n; i++) {
      const v = ov && ov.length ? ov[Math.floor((i / n) * ov.length)] / 255 : 0.25 + 0.55 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23));
      const h = 10 + v * 92, past = i / n <= R.viz.progress;
      x.fillStyle = past ? accent : 'rgba(255,255,255,.32)';
      rr(x, 110 + i * bw + bw * 0.18, base - h, bw * 0.64, h, Math.min(6, bw * 0.3)); x.fill();
    }
    // footer
    x.textAlign = 'left'; x.font = `700 30px ${FONT}`; x.fillStyle = 'rgba(255,255,255,.9)';
    x.fillText('正在聽' + (d.name ? `　·　${d.name}` : ''), 110, H - 92);
    x.textAlign = 'right'; x.font = `800 28px ${FONT}`; x.fillStyle = 'rgba(255,255,255,.6)';
    x.fillText('耳目一新 RESKIN', W - 110, H - 92);
    const blob = await R.art.toBlob(c, 'image/png');
    return blob ? { blob, title: t.title, artist: t.artist || '' } : null;
  }

  // In the Claude app the page may not hand out files itself: the picture goes out through the artifact's
  // downloads capability (the viewer confirms, then gets the share sheet on iPhone or a download on a computer).
  let dlCap = null;
  if (R.CLAUDE && window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then((d) => { dlCap = d || null; }).catch(() => {});
  // web version only (build.py drops it from the Claude version)
  const webLink = (u, name, label) => `<a class="btn pri wide" href="${u}" download="${esc(name)}">${I.upload}${label || '存成圖片'}</a>`;

  // a picture or a video, ready to go out: the share sheet (phones), the Claude downloads capability, or a download
  let cur = null;
  async function present(o) {
    const type = o.blob.type || (o.video ? 'video/mp4' : 'image/png');
    const file = new File([o.blob], o.name, { type });
    const viaCap = !!(R.CLAUDE && dlCap);
    const canShare = !viaCap && !!(navigator.canShare && (() => { try { return navigator.canShare({ files: [file] }); } catch (e) { return false; } })());
    const u = o.video ? URL.createObjectURL(o.blob) : await R.imageURL(o.blob);
    const dl = !canShare && !R.CLAUDE && !R.isIOS;
    const media = o.video ? `<video class="share-img share-vid" src="${u}" playsinline controls loop autoplay muted></video>` : `<img class="share-img" src="${u}" alt="${esc(o.title || '')}">`;
    const tip = viaCap ? '' : o.video ? (canShare ? '按上面的按鈕就能存到相簿，或直接傳到 IG、YouTube Shorts。' : dl ? '' : '在影片上長按或按右鍵就能存起來。') : `${canShare ? '也可以' : ''}${R.isTouch ? '長按圖片就能存起來或傳出去。' : canShare || dl ? '' : '在圖片上按右鍵就能存起來。'}`;
    R.ui.openSheet(`<div class="sh-head"><h3>${esc(o.heading || '分享')}</h3><button type="button" class="ib" data-sh="close" aria-label="關閉">${I.close}</button></div>
      <div class="sc share-sc">${media}
        <div class="btn-row" style="padding:12px 4px 4px">
          ${viaCap ? `<button type="button" class="btn pri wide" data-sh="save">${I.share}存起來或傳出去</button>` : ''}
          ${canShare ? `<button type="button" class="btn pri wide" data-sh="go">${I.share}${o.video ? '存到相簿或分享' : '傳給朋友'}</button>` : ''}
          ${dl ? webLink(u, file.name, o.video ? '下載影片' : '存成圖片') : ''}
        </div>
        <p class="share-tip">${tip}</p>${o.note ? `<p class="share-tip">${esc(o.note)}</p>` : ''}</div>`, { kind: 'share', onClose: () => { if (o.video) URL.revokeObjectURL(u); else R.dropURL(u); cur = null; if (o.onClose) o.onClose(); } });
    R.stage.sfx('ok');
    cur = { file, blob: o.blob, title: o.title || '', text: o.text || '' };
  }
  async function open() {
    R.ui.busy('做分享圖中', '一下就好', null);
    let card = null;
    try { card = await make(); } catch (e) { console.error(e); card = null; }
    R.ui.busy(null);
    if (!card) { R.toast('分享圖沒做成功，再試一次'); return; }
    present({ blob: card.blob, name: `耳目一新-${card.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 40) || '正在聽'}.png`, title: card.title, text: `正在聽：${card.title}${card.artist ? ' — ' + card.artist : ''}`, heading: '分享正在聽的歌' });
  }
  document.addEventListener('click', async (e) => {
    if (R.ui.sheetKind() !== 'share') return;
    const b = e.target.closest('[data-sh]'); if (!b) return;
    if (b.dataset.sh === 'close') { R.ui.closeSheet(); return; }
    if (b.dataset.sh === 'save' && cur && dlCap) {
      try { const r = await dlCap.save({ filename: cur.file.name, data: cur.blob }); if (r && r.status === 'saved') R.toast('好了：檔案交出去了'); }
      catch (err) {
        const code = err && err.code;
        if (code === 'declined') return;
        if (code === 'rate_limited') { R.toast('上一個確認視窗還開著，稍等一下再按'); return; }
        b.remove(); R.toast('這裡存不了：長按試試，或打開網頁版');
      }
      return;
    }
    if (b.dataset.sh === 'go' && cur && cur.file) {
      try { await navigator.share({ files: [cur.file], title: cur.title, text: cur.text }); }
      catch (err) { if (err && err.name !== 'AbortError') R.toast('沒有分享出去，可以長按存起來再傳'); }
    }
  });
  return { open, make, present };
})();
