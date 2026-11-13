/* ===================== favourites heart, the "more" menu, sleep timer, editing a song ===================== */
R.extras = (() => {
  const { $, esc, I, bus, settings } = R;

  /* ---------- the heart in the dock ---------- */
  const heartBtn = $('#dock [data-act="fav"]');
  function paintHeart() {
    const t = R.player.current();
    const on = !!(t && t.fav);
    heartBtn.innerHTML = on ? I.heartF : I.heart;
    heartBtn.classList.toggle('on', on);
    heartBtn.setAttribute('aria-label', on ? '移出我的最愛' : '加入我的最愛');
    heartBtn.disabled = !t;
  }
  async function toggleFav() {
    const t = R.player.current();
    if (!t) { R.toast('先放一首歌'); return; }
    const on = !t.fav;
    await R.lib.setFav(t.id, on);
    paintHeart();
    if (on) {
      heartBtn.classList.remove('pop'); void heartBtn.offsetWidth; heartBtn.classList.add('pop');
      R.stage.sfx('ok');
      if (!settings.get('favHint')) { settings.set('favHint', true); R.toast('收進「我的最愛」了：歌庫 →「歌單」裡找得到', { ms: 3200 }); }
    } else R.stage.sfx('tap');
  }
  bus.on('track', paintHeart); bus.on('fav', paintHeart); bus.on('track:update', paintHeart);

  // a dot on "more" when the song has lyrics
  const moreBtn = $('#dock [data-act="more"]');
  function paintMore() {
    const k = R.lyrics.kind(R.player.current());
    let dot = moreBtn.querySelector('.dot');
    if (k && !dot) { dot = document.createElement('i'); dot.className = 'dot'; moreBtn.appendChild(dot); }
    if (!k && dot) dot.remove();
    if (k === 'synced' && !settings.get('lyricHint') && R.player.current()) { settings.set('lyricHint', true); setTimeout(() => R.toast('這首有歌詞：按右上角「⋯」→「歌詞」，唱到哪亮到哪', { ms: 4200 }), 1500); }
  }
  bus.on('track', paintMore); bus.on('track:update', (t) => { const c = R.player.current(); if (c && t && t.id === c.id) paintMore(); });

  /* ---------- sleep timer ---------- */
  const pill = $('#sleepPill');
  let pillT = 0;
  function sleepText() {
    const s = R.player.sleep();
    if (s.end) return '這首播完就停';
    if (s.at) { const m = Math.max(0, Math.ceil((s.at - Date.now()) / 60000)); return `還有 ${m} 分鐘`; }
    return '關閉';
  }
  function paintPill() {
    const s = R.player.sleep();
    clearInterval(pillT);
    if (!s.at && !s.end) { pill.hidden = true; return; }
    const draw = () => {
      const x = R.player.sleep();
      if (x.end) { pill.innerHTML = `${I.moon}<span>這首完</span>`; return; }
      const sec = Math.max(0, Math.round((x.at - Date.now()) / 1000));
      pill.innerHTML = `${I.moon}<span>${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}</span>`;
    };
    draw(); pill.hidden = false; pillT = setInterval(draw, 1000);
  }
  bus.on('sleep', paintPill);
  async function sleepMenu() {
    const s = R.player.sleep();
    const k = await R.ui.menu([
      { key: '15', label: '15 分鐘後停', icon: I.moon, on: false },
      { key: '30', label: '30 分鐘後停', icon: I.moon },
      { key: '60', label: '1 小時後停', icon: I.moon },
      { key: 'end', label: '這首播完就停', icon: I.timer, on: s.end },
      { key: 'off', label: '關掉睡眠定時', icon: I.close },
    ], { title: '睡眠定時', sub: s.at || s.end ? '現在：' + sleepText() + '。鎖住螢幕也照樣算。' : '時間到就停，適合鎖屏聽著睡。' });
    if (!k) return;
    if (k === 'off') { R.player.setSleep(0); R.toast('睡眠定時關掉了', { ms: 1600 }); return; }
    R.player.setSleep(k === 'end' ? 'end' : +k);
    R.toast(k === 'end' ? '這首播完就停 🌙' : `${k === '60' ? '1 小時' : k + ' 分鐘'}後停 🌙`, { ms: 2000 });
    R.stage.sfx('ok');
  }

  /* ---------- the "more" menu ---------- */
  async function moreMenu() {
    const t = R.player.current();
    const lk = R.lyrics.kind(t);
    const s = R.player.sleep();
    const k = await R.ui.menu([
      { key: 'lyrics', label: R.lyrics.isOpen() ? '收起歌詞' : '歌詞', sub: !t ? '先放一首歌' : lk === 'synced' ? '這首有歌詞，唱到哪亮到哪' : lk === 'plain' ? '這首有歌詞' : '這首還沒有歌詞，可以貼上', icon: I.mic },
      { key: 'sleep', label: '睡眠定時', sub: s.at || s.end ? sleepText() : '時間到就停，鎖屏也照樣算', icon: I.moon, on: !!(s.at || s.end) },
      { key: 'share', label: '分享正在聽的歌', sub: '做成一張圖傳給朋友', icon: I.share },
      { key: 'edit', label: '改這首的資訊', sub: '歌名、歌手、封面、歌詞', icon: I.edit },
      { key: 'settings', label: '設定', icon: I.gear },
    ], { title: t ? t.title : '耳目一新' });
    if (k === 'lyrics') { if (t) R.lyrics.toggle(); else R.toast('先放一首歌'); }
    else if (k === 'sleep') sleepMenu();
    else if (k === 'share') { if (t) R.share.open(); else R.toast('先放一首歌'); }
    else if (k === 'edit') { if (t) editTrack(t.id); else R.toast('先放一首歌'); }
    else if (k === 'settings') R.settingsUI.show();
  }

  /* ---------- edit a song: title, artist, album, cover, lyrics ---------- */
  let ed = null;
  async function editTrack(id, focus) {
    const t = R.lib.get(id); if (!t) return;
    ed = { id, cover: null };
    const u = await R.art.coverUrl(t, 'thumb');
    const ly = t.lrc != null ? t.lrc : t.lyrics || '';
    const html = `<div class="sh-head"><h3>改歌曲資訊</h3><button type="button" class="ib" data-ed="cancel" aria-label="取消">${I.close}</button></div>
      <div class="sc">
        <div class="set-g"><div class="set-r"><div class="photo-pick"><div class="ph" data-ed-ph style="background-image:url('${u || ''}')"></div><div class="lb"><b>封面</b><small>換一張圖，播放器、鎖屏畫面都會跟著換</small></div></div><button type="button" class="chipb" data-ed="pic">${I.image}換封面</button></div></div>
        <div class="set-g">
          <div class="set-r set-col"><div class="lb"><b>歌名</b></div><input class="txt-in" type="text" maxlength="200" data-ed-f="title" value="${esc(t.title)}"></div>
          <div class="set-r set-col"><div class="lb"><b>歌手</b></div><input class="txt-in" type="text" maxlength="160" data-ed-f="artist" value="${esc(t.artist || '')}" placeholder="歌手的名字"></div>
          <div class="set-r set-col"><div class="lb"><b>專輯</b></div><input class="txt-in" type="text" maxlength="160" data-ed-f="album" value="${esc(t.album || '')}"></div>
        </div>
        <div class="set-g"><div class="set-r set-col"><div class="lb"><b>歌詞</b><small>直接貼上。有時間標記的 LRC（像 [01:02.50]第一句）會跟著唱到哪亮到哪。</small></div><textarea class="txt-in ed-ly" data-ed-f="lrc" rows="9" placeholder="在這裡貼上歌詞">${esc(ly)}</textarea></div></div>
        <div class="btn-row" style="padding:4px 4px 14px"><button type="button" class="btn pri wide" data-ed="save">${I.check}儲存</button></div>
      </div>
      <input type="file" accept="image/*" data-ed-in hidden>`;
    R.ui.openSheet(html, { kind: 'edit', onClose: () => { ed = null; } });
    if (focus === 'lyrics') setTimeout(() => { const a = R.ui.body().querySelector('[data-ed-f="lrc"]'); if (a) a.focus(); }, 350);
  }
  document.addEventListener('click', async (e) => {
    if (R.ui.sheetKind() !== 'edit' || !ed) return;
    const b = e.target.closest('[data-ed]'); if (!b) return;
    const body = R.ui.body(), a = b.dataset.ed;
    if (a === 'cancel') { R.ui.closeSheet(); return; }
    if (a === 'pic') { body.querySelector('[data-ed-in]').click(); return; }
    if (a === 'save') {
      const t = R.lib.get(ed.id); if (!t) { R.ui.closeSheet(); return; }
      const val = (k) => body.querySelector(`[data-ed-f="${k}"]`).value;
      const patch = { artist: val('artist').trim(), album: val('album').trim() };
      if (val('title').trim()) patch.title = val('title').trim();
      const ly = val('lrc');
      if (ly !== (t.lrc != null ? t.lrc : t.lyrics || '')) patch.lrc = ly.trim() ? ly.slice(0, 60000) : ' '; // ' ' = no lyrics, even if the file has some
      try {
        if (ed.cover) {
          await R.db.putBytes('covers', t.id, ed.cover.full); await R.db.putBytes('covers', t.id + ':t', ed.cover.thumb);
          Object.assign(patch, { cover: 1, colors: ed.cover.colors, coverRev: Date.now() });
          R.art.forget(t.id);
        }
        await R.lib.update(t.id, patch);
      } catch (err) { R.toast(R.db.isFull(err) ? '儲存空間不夠，存不了' : '沒有存成功，再試一次'); return; }
      const isCur = R.player.current() && R.player.current().id === t.id;
      R.ui.closeSheet(); R.stage.sfx('ok'); R.toast('改好了', { ms: 1400 });
      if (isCur) {
        R.player.refreshMeta();
        if (patch.coverRev) { const d = R.stage.current(); if (d) R.stage.show(d.id, { force: true, instant: true, silent: true }); }
      }
      bus.emit('library');
    }
  });
  document.addEventListener('change', async (e) => {
    if (!e.target.matches('[data-ed-in]') || !ed) return;
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const c = await R.art.processCover(f);
      ed.cover = c;
      const ph = R.ui.body().querySelector('[data-ed-ph]');
      if (ph) { const u = await R.imageURL(c.thumb); ph.style.backgroundImage = `url('${u}')`; }
      R.stage.sfx('tick');
    } catch (err) { R.toast('這張圖讀不了，換一張試試'); }
  });

  // keys (the dock buttons are wired in main.js)
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea, select') || R.ui.modalOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'h' || e.key === 'H') toggleFav();
    else if (e.key === 'y' || e.key === 'Y') { if (R.player.current()) R.lyrics.toggle(); }
  });
  return { editTrack, sleepMenu, moreMenu, toggleFav, paint: () => { paintHeart(); paintMore(); paintPill(); } };
})();
