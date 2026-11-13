/* ===================== lyrics: from the song file, a .lrc file beside it, or pasted in; synced lines light up as they are sung ===================== */
R.lyrics = (() => {
  const { $, $$, esc, I, bus } = R;

  // LRC: "[01:02.50]line" (a line may carry several stamps), [offset:+250] in ms; anything without stamps is plain text
  function parse(text) {
    if (!text || !String(text).trim()) return null;
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    const synced = []; let offset = 0;
    const stamp = /^\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/;
    for (const raw of lines) {
      const line = raw.trim();
      const off = /^\[offset:\s*([+-]?\d+)\s*\]$/i.exec(line);
      if (off) { offset = +off[1] / 1000; continue; }
      const ts = []; let rest = line, m;
      while ((m = stamp.exec(rest))) { ts.push(+m[1] * 60 + parseFloat(m[2].replace(':', '.'))); rest = rest.slice(m[0].length); }
      rest = rest.replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, '').trim(); // word-by-word stamps of "enhanced" LRC
      for (const s of ts) synced.push([Math.max(0, s - offset), rest]);
    }
    if (synced.length >= 3) return { synced: synced.sort((a, b) => a[0] - b[0]) };
    const plain = [];
    for (const raw of lines) {
      const l = raw.replace(/^\[[a-z#]+:.*\]$/i, '').trim();
      if (l || (plain.length && plain[plain.length - 1])) plain.push(l);
    }
    while (plain.length && !plain[plain.length - 1]) plain.pop();
    return plain.length ? { plain } : null;
  }
  const of = (t) => (t ? parse(t.lrc || t.lyrics || '') : null);
  // what the "more" menu says about the current song
  const kind = (t) => { const L = of(t); return !L ? '' : L.synced ? 'synced' : 'plain'; };

  // text of a .lrc file: UTF-8 (with or without BOM), UTF-16 with BOM, or old Big5 / GBK
  async function readFile(f) {
    const b = new Uint8Array(await f.arrayBuffer());
    try {
      if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(b.subarray(2));
      if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(b.subarray(2));
    } catch (e) { /* fall through */ }
    return R.meta.smart(b);
  }

  /* ---------- the overlay ---------- */
  const box = $('#lyrics');
  let open = false, L = null, tid = null, cur = -1, raf = 0, userScroll = 0;
  function render() {
    const t = R.player.current();
    tid = t ? t.id : null; L = of(t); cur = -1;
    const head = `<div class="ly-head"><button type="button" class="ly-x" data-ly="close" aria-label="關閉歌詞">${I.close}</button>
      <div class="ly-tt"><b>${esc(t ? t.title : '')}</b><span>${esc(t ? t.artist || '' : '')}</span></div>
      ${t ? `<button type="button" class="ly-ed" data-ly="edit" aria-label="編輯歌詞">${I.edit}</button>` : '<i></i>'}</div>`;
    let body;
    if (!t) body = '<div class="ly-none">現在沒有在播的歌。</div>';
    else if (!L) body = `<div class="ly-none"><b>這首沒有歌詞</b><p>可以按右上角的筆貼上歌詞（有時間標記的 LRC 會跟著唱到哪亮到哪）。<br>也可以把同名的 .lrc 歌詞檔跟歌放在同一個資料夾，再匯入一次。</p><button type="button" class="btn pri" data-ly="edit">${I.edit}貼上歌詞</button></div>`;
    else if (L.synced) body = `<div class="ly-list synced">${L.synced.map(([s, l], i) => `<p data-i="${i}" data-s="${s.toFixed(2)}">${l ? esc(l) : '♪'}</p>`).join('')}</div>`;
    else body = `<div class="ly-list plain">${L.plain.map((l) => (l ? `<p>${esc(l)}</p>` : '<p class="gap"></p>')).join('')}<small>這份歌詞沒有時間標記，所以不會跟著亮</small></div>`;
    box.innerHTML = head + `<div class="ly-sc">${body}</div>`;
    const sc = $('.ly-sc', box);
    sc.addEventListener('scroll', () => { if (!sc._auto) userScroll = performance.now(); }, { passive: true });
  }
  function follow() {
    if (!open) return;
    raf = requestAnimationFrame(follow);
    const t = R.player.current();
    if ((t ? t.id : null) !== tid) { render(); return; }
    if (!L || !L.synced) return;
    const now = R.player.time() + 0.15;
    let i = -1, lo = 0, hi = L.synced.length - 1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (L.synced[m][0] <= now) { i = m; lo = m + 1; } else hi = m - 1; }
    if (i === cur) return;
    const ps = $$('.ly-list p', box);
    if (ps[cur]) ps[cur].classList.remove('on');
    cur = i;
    if (!ps[i]) return;
    ps[i].classList.add('on');
    for (let k = 0; k < ps.length; k++) ps[k].classList.toggle('past', k < i);
    // keep the sung line a little above the middle, unless the person is scrolling on their own
    if (performance.now() - userScroll < 3500) return;
    const sc = $('.ly-sc', box), p = ps[i];
    const top = p.offsetTop - sc.clientHeight * 0.4 + p.offsetHeight / 2;
    sc._auto = true; sc.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }); setTimeout(() => { sc._auto = false; }, 700);
  }
  function show() {
    if (open) return;
    if (R.ui.sheetKind()) R.ui.closeSheet(true);
    open = true; render();
    box.hidden = false; requestAnimationFrame(() => box.classList.add('on'));
    document.body.classList.add('ly-open');   // the skin's own title and buttons step back while the lyrics are up
    R.stage.sfx('open');
    cancelAnimationFrame(raf); raf = requestAnimationFrame(follow);
    bus.emit('lyrics', true);
  }
  function hide() {
    if (!open) return;
    open = false; cancelAnimationFrame(raf);
    box.classList.remove('on'); setTimeout(() => { if (!open) { box.hidden = true; box.innerHTML = ''; } }, 320);
    document.body.classList.remove('ly-open');
    R.stage.sfx('close');
    bus.emit('lyrics', false);
  }
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ly]');
    if (b) { if (b.dataset.ly === 'close') hide(); else if (b.dataset.ly === 'edit') { const t = R.player.current(); if (t) { hide(); R.extras.editTrack(t.id, 'lyrics'); } } return; }
    const p = e.target.closest('.ly-list.synced p');
    if (p) { R.player.prime(); R.player.seek(+p.dataset.s); if (!R.player.wants()) R.player.play(); userScroll = 0; R.stage.sfx('tick'); }
  });
  bus.on('track:update', (t) => { if (open && t && t.id === tid) render(); });
  return { parse, of, kind, readFile, show, hide, toggle: () => (open ? hide() : show()), isOpen: () => open };
})();
