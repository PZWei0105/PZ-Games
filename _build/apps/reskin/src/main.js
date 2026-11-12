/* ===================== boot, actions, import, party mode ===================== */
R.app = (() => {
  const { $, $$, bus, settings, I, esc } = R;

  // dock icons
  const DOCK = { lib: I.lib, wardrobe: I.hanger, party: I.party, settings: I.gear };
  $$('#dock .dk').forEach((b) => { b.innerHTML = DOCK[b.dataset.act]; });

  /* ---------- first tap unlocks audio (iPhone) ---------- */
  const first = () => {
    R.player.unlock(); R.sfx.unlock();
    for (const ev of ['touchend', 'click', 'keydown']) window.removeEventListener(ev, first, true);
  };
  for (const ev of ['touchend', 'click', 'keydown']) window.addEventListener(ev, first, true);

  /* ---------- actions (data-act anywhere) ---------- */
  const A = {
    toggle() { R.player.toggle(); R.stage.sfx(R.player.wants() ? 'play' : 'pause'); },
    next() { R.player.prime(); R.player.next(); R.stage.sfx('next'); },
    prev() { R.player.prime(); R.player.prev(); R.stage.sfx('prev'); },
    shuffle() { R.player.setShuffle(!R.player.S.shuffle); R.stage.sfx('toggle'); R.toast(R.player.S.shuffle ? '隨機播放：開' : '隨機播放：關', { ms: 1600 }); },
    repeat() { const r = R.player.cycleRepeat(); R.stage.sfx('toggle'); R.toast({ all: '循環整個清單', one: '單曲循環', off: '播完就停' }[r], { ms: 1600 }); },
    lib() { if (R.wardrobe.isOpen()) R.wardrobe.close(true); if (R.ui.sheetKind() === 'lib') R.ui.closeSheet(); else R.library.open(); },
    wardrobe() { if (R.wardrobe.isOpen()) R.wardrobe.close(true); else R.wardrobe.open(); },
    party() { party.toggle(); },
    settings() { if (R.wardrobe.isOpen()) R.wardrobe.close(true); if (R.ui.sheetKind() === 'settings') R.ui.closeSheet(); else R.settingsUI.show(); },
    'sheet-close'() { R.ui.closeSheet(); },
    import() { pickFiles(false); },
    demo() { R.player.prime(); addDemo(); },
  };
  R.actions = A;
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const f = A[b.dataset.act];
    if (!f) return;
    e.preventDefault();
    if (document.body.classList.contains('party')) party.peek();
    f(b, e);
  });

  /* ---------- import ---------- */
  const fileIn = $('#fileIn'), folderIn = $('#folderIn');
  function pickFiles(folder) { (folder ? folderIn : fileIn).click(); }
  for (const inp of [fileIn, folderIn]) inp.addEventListener('change', () => { const fs = Array.from(inp.files || []); inp.value = ''; if (fs.length) importFiles(fs); });

  async function importFiles(files) {
    if (R.ui.sheetKind()) R.ui.closeSheet(true);
    const n = files.filter(R.lib.isAudio).length;
    if (!n) { R.toast('沒有找到音樂檔（支援 MP3、M4A、FLAC、WAV）'); R.sfx.play('err'); return; }
    const wasEmpty = R.lib.count() === 0;
    R.ui.busy('匯入中', `0 / ${n}`, 0);
    let res;
    try { res = await R.lib.importFiles(files, (p) => R.ui.busy('匯入中', `${p.i + 1} / ${p.n}　${p.name}`, p.i / p.n)); }
    catch (e) { R.ui.busy(null); R.toast('匯入失敗：' + (e && e.message ? e.message : e)); return; }
    R.ui.busy(null);
    const parts = [];
    if (res.added.length) parts.push(`加入 ${res.added.length} 首`);
    if (res.dup) parts.push(`${res.dup} 首已經在歌庫`);
    if (res.failed.length) parts.push(`${res.failed.length} 首讀不了`);
    if (res.warn) parts.push(`${res.warn} 首這台裝置可能播不了`);
    R.toast(parts.join('，') || '沒有加入新歌');
    R.sfx.play(res.added.length ? 'ok' : 'err');
    if (res.added.length && (wasEmpty || !R.player.current())) {
      R.player.playFrom(R.lib.list().map((t) => t.id), res.added[0], { type: 'library' }, { autoplay: false });
      setTimeout(() => { if (!R.player.wants()) R.toast('準備好了，按播放鍵開始 ▶'); }, 1800);
    }
    updateEmpty();
  }
  async function addDemo() {
    R.ui.busy('正在合成示範曲', '在你的裝置上現場合成，幾秒鐘就好', null);
    try {
      await R.sleep(60);
      const id = await R.lib.addDemo();
      R.ui.busy(null); updateEmpty();
      R.player.playFrom(R.lib.list().map((t) => t.id), id, { type: 'library' });
      R.toast('示範曲來了：打開衣櫃（右上角衣架）左右滑試穿', { ms: 4500 });
    } catch (e) { console.error(e); R.ui.busy(null); R.toast('示範曲沒有做成功'); }
  }

  /* drag & drop (computer) */
  let dragN = 0;
  const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragN++; $('#drop').hidden = false; });
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; dragN = Math.max(0, dragN - 1); if (!dragN) $('#drop').hidden = true; });
  window.addEventListener('drop', async (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault(); dragN = 0; $('#drop').hidden = true;
    const items = Array.from(e.dataTransfer.items || []);
    const out = [];
    const walk = (entry) => new Promise((res) => {
      if (!entry) return res();
      if (entry.isFile) entry.file((f) => { out.push(f); res(); }, () => res());
      else if (entry.isDirectory) {
        const rd = entry.createReader(); const all = [];
        const more = () => rd.readEntries(async (es) => { if (!es.length) { for (const x of all) await walk(x); res(); } else { all.push(...es); more(); } }, () => res());
        more();
      } else res();
    });
    if (items.length && items[0].webkitGetAsEntry) { for (const it of items) await walk(it.webkitGetAsEntry()); }
    else out.push(...Array.from(e.dataTransfer.files || []));
    if (out.length) importFiles(out);
  });

  /* ---------- empty library ---------- */
  function updateEmpty() {
    const e = $('#empty');
    if (R.lib.count()) { e.hidden = true; return; }
    if (!e.hidden) return;
    e.innerHTML = `<div class="em-ico">${I.lib}</div><h2>痞子葳，歌庫還是空的</h2><p>把手機或電腦裡的音樂檔放進來：<br>MP3、M4A、FLAC、WAV 都可以，Suno 下載的歌也行。<br>放進來之後，不用網路也能聽。</p><div class="btn-row"><button type="button" class="btn pri wide" data-act="import">${I.upload}選擇音樂檔</button><button type="button" class="btn sec wide" data-act="demo">${I.sparkle}先聽示範曲，試穿 Skin</button></div><p class="hint">${R.isTouch ? '' : '也可以直接把檔案拖進這個視窗。'}${R.isIOS && !R.standalone && !R.embedded ? '建議先在 Safari 按「分享 → 加入主畫面」再匯入：主畫面 App 的歌庫跟 Safari 是分開的。' : ''}${R.CLAUDE ? '這是 Claude 上的版本，歌可能不會一直留著；長期用請開網頁版加到主畫面。' : R.embedded && R.isIOS ? '想鎖屏也一直聽，建議把「耳目一新」單獨加到主畫面（在 iPhone 上，它的歌庫跟收藏庫裡這份是分開的）。' : R.embedded && (R.isAndroid || R.isTouch) ? '想鎖屏也一直聽，建議把「耳目一新」單獨加到主畫面。' : ''}</p>`;
    e.hidden = false;
  }
  bus.on('library', updateEmpty);

  /* ---------- which skin to wear ---------- */
  let lastTid = null, booted = false;
  function wantedSkin() {
    const src = R.player.source();
    if (src && src.type === 'playlist') { const p = R.lib.pl.get(src.id); if (p && p.skin && R.skins.get(p.skin)) return p.skin; }
    return null;
  }
  bus.on('source', () => {
    if (!booted || R.wardrobe.isOpen()) return;
    const w = wantedSkin(), cur = (R.stage.current() || {}).id;
    if (w) { if (w !== cur) R.stage.show(w); }
    else if (settings.get('skinMode') === 'fixed' && settings.get('skin') !== cur) R.stage.show(settings.get('skin'));
  });
  bus.on('track', (t) => {
    const id = t ? t.id : null;
    const changed = id !== lastTid; lastTid = id;
    if (!booted || !t || !changed || R.wardrobe.isOpen() || wantedSkin()) return;
    if (settings.get('skinMode') === 'shuffle') {
      const cur = (R.stage.current() || {}).id;
      const pool = R.skins.list().map((d) => d.id).filter((x) => x !== cur);
      if (pool.length) R.stage.show(pool[Math.floor(Math.random() * pool.length)]);
    }
  });
  bus.on('setting', (k, v) => { if (k === 'skinMode' && v === 'fixed' && booted && !R.wardrobe.isOpen() && !wantedSkin() && (R.stage.current() || {}).id !== settings.get('skin')) R.stage.show(settings.get('skin')); });

  /* ---------- party mode ---------- */
  const party = (() => {
    let on = false, peekT = 0, wake = null;
    const lock = async () => { try { if (on && navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; } };
    function peek(ms) { if (!on) return; document.body.classList.add('peek'); clearTimeout(peekT); peekT = setTimeout(() => document.body.classList.remove('peek'), ms || 3200); }
    function title() {
      const el = $('#partyTitle'); const t = R.player.current();
      if (!on || !t) { el.classList.remove('on'); return; }
      el.innerHTML = `<b>${esc(t.title)}</b><span>${esc(t.artist || '')}</span>`;
      el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 5500);
    }
    function toggle(force) {
      const want = force != null ? !!force : !on;
      if (want === on) return;
      on = want;
      document.body.classList.toggle('party', on);
      R.stage.sfx('toggle');
      if (on) {
        if (R.ui.sheetKind()) R.ui.closeSheet(true);
        if (R.wardrobe.isOpen()) R.wardrobe.close(false);
        const de = document.documentElement;
        if (!R.isIOS && de.requestFullscreen && !document.fullscreenElement) { try { const p = de.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
        lock(); peek(2200); title();
        R.toast(R.isTouch ? '派對模式：點一下畫面叫出按鈕' : '派對模式：點一下畫面叫出按鈕，Esc 離開', { ms: 2600 });
      } else {
        document.body.classList.remove('peek');
        $('#partyTitle').classList.remove('on');
        if (document.fullscreenElement && document.exitFullscreen) { try { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
        if (wake) { wake.release().catch(() => {}); wake = null; }
      }
      R.bus.emit('party', on);
    }
    document.addEventListener('pointerdown', (e) => { if (on && !e.target.closest('#dock, [data-ui], #sheet, #modal, #wardrobe')) peek(); }, true);
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && on) toggle(false); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) lock(); });
    bus.on('track', () => { if (on) title(); });
    return { toggle, peek, isOn: () => on };
  })();
  R.party = party;

  /* ---------- keyboard (computer) ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea, select') || R.ui.modalOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === ' ' || e.code === 'Space') { e.preventDefault(); A.toggle(); }
    else if (k === 'ArrowRight') { e.preventDefault(); if (e.shiftKey) A.next(); else R.player.seek(R.player.time() + 5); }
    else if (k === 'ArrowLeft') { e.preventDefault(); if (e.shiftKey) A.prev(); else R.player.seek(R.player.time() - 5); }
    else if (k === 's' || k === 'S') A.wardrobe();
    else if (k === 'l' || k === 'L') A.lib();
    else if (k === 'f' || k === 'F') A.party();
    else if (k === 'Escape') { if (R.wardrobe.isOpen()) R.wardrobe.close(true); else if (R.ui.sheetKind()) R.ui.closeSheet(); else if (party.isOn()) party.toggle(false); }
  });

  /* ---------- boot ---------- */
  async function boot() {
    try { await R.db.open(); }
    catch (e) {
      $('#splash').innerHTML = '<div style="color:#fff;padding:30px;text-align:center;line-height:1.8">這個瀏覽器不讓 App 存歌（可能是私密瀏覽或空間不足）。<br>' +
        (R.CLAUDE ? `請改開網頁版：<br><a href="${R.WEB_URL}" target="_blank" rel="noopener" style="color:#ff8be8;word-break:break-all">${R.WEB_URL}</a>` : '請換一般模式打開，或改用 Safari／Chrome。') + '</div>';
      return;
    }
    await settings.load();
    R.player.S.shuffle = !!settings.get('shuffle');
    R.player.S.repeat = settings.get('repeat') || 'all';
    R.player.setVolume(settings.get('volume') == null ? 1 : settings.get('volume'));
    await R.lib.load();
    try { await R.player.restore(); } catch (e) { console.warn('restore', e); }
    lastTid = R.player.S.tid;
    const want = wantedSkin() || settings.get('skin');
    await R.stage.show(R.skins.get(want) ? want : R.skins.builtin()[0].id, { silent: true, instant: true });
    booted = true;
    R.loop.start();
    setTimeout(() => $('#splash').classList.add('off'), 120);
    setTimeout(() => $('#splash').remove(), 900);
    updateEmpty();
    setTimeout(() => R.analysis.resume(), 1500);
    if (R.lib.count()) {
      if (R.CLAUDE) { /* hint lives in settings */ }
      else if (R.embedded && (R.isIOS || R.isAndroid || R.isTouch) && !settings.get('embedHint')) { settings.set('embedHint', true); setTimeout(() => R.toast('想鎖屏也一直聽：把「耳目一新」單獨加到主畫面，鎖屏控制更完整', { ms: 6500 }), 2500); }
      else if (R.isIOS && !R.standalone && !R.embedded && !settings.get('homeHint')) { settings.set('homeHint', true); setTimeout(() => R.toast('用 Safari「分享 → 加入主畫面」，就能鎖屏一直聽', { ms: 6000 }), 2500); }
    }
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) && !R.CLAUDE) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  return { boot, pickFiles, importFiles, addDemo, updateEmpty };
})();
R.app.boot();
