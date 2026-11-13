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
      // word-by-word stamps of "enhanced" LRC: <01:02.50>word <01:03.10>word …
      let words = null;
      const wre = /<(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)>/g;
      if (wre.test(rest)) {
        words = []; wre.lastIndex = 0; let last = null, k;
        const parts = rest.split(wre);
        if (parts[0].trim()) words.push([null, parts[0]]);
        for (let i = 1; i + 2 < parts.length + 1; i += 3) { k = +parts[i] * 60 + parseFloat(String(parts[i + 1]).replace(':', '.')); last = parts[i + 2] || ''; words.push([Math.max(0, k - offset), last]); }
        if (!words.some((w) => w[0] != null)) words = null;
      }
      rest = rest.replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, '').trim();
      for (const s of ts) synced.push([Math.max(0, s - offset), rest, words]);
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
    tid = t ? t.id : null; L = of(t); cur = -1; timing.clear(); kLine = -1; kEls = null;
    const head = `<div class="ly-head"><button type="button" class="ly-x" data-ly="close" aria-label="關閉歌詞">${I.close}</button>
      <div class="ly-tt"><b>${esc(t ? t.title : '')}</b><span>${esc(t ? t.artist || '' : '')}</span></div>
      ${t ? `<button type="button" class="ly-ed" data-ly="edit" aria-label="編輯歌詞">${I.edit}</button>` : '<i></i>'}</div>`;
    let body;
    if (!t) body = '<div class="ly-none">現在沒有在播的歌。</div>';
    else if (!L) body = `<div class="ly-none"><b>這首沒有歌詞</b><p>可以按右上角的筆貼上歌詞（有時間標記的 LRC 會跟著唱到哪亮到哪）。<br>也可以把同名的 .lrc 歌詞檔跟歌放在同一個資料夾，再匯入一次。</p><button type="button" class="btn pri" data-ly="edit">${I.edit}貼上歌詞</button></div>`;
    else if (L.synced) body = `<div class="ly-list synced">${L.synced.map(([s, l], i) => `<p data-i="${i}" data-s="${s.toFixed(2)}">${l ? Array.from(l).map((c) => (c === ' ' ? '<span class="kc sp"> </span>' : `<span class="kc" data-c="${esc(c)}">${esc(c)}</span>`)).join('') : '♪'}</p>`).join('')}</div>`;
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
    karaoke(i, now - 0.12);
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
  /* ---------- karaoke: the sung line fills in character by character ----------
     With word stamps (enhanced LRC) each word fills over its own time; otherwise the line's time is shared out by
     character weight (a Chinese character counts fully, a Latin letter about half, spaces and marks less). */
  const W8 = (c) => (/\s/.test(c) ? 0.3 : /[\u3000-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/.test(c) ? 1 : /[A-Za-z0-9]/.test(c) ? 0.5 : 0.22);
  const timing = new Map();
  function times(i) {
    if (timing.has(i)) return timing.get(i);
    const out = timesOf(L.synced, i);
    timing.set(i, out);
    return out;
  }
  // start time of every character of line i (plus the end), from word stamps or shared out by weight
  function timesOf(list, i) {
    const [s, text, words] = list[i];
    const chars = Array.from(text || '');
    const next = list[i + 1] ? list[i + 1][0] : s + 4;
    const out = new Float32Array(chars.length + 1);
    if (words && words.length) {
      // every character of a word starts inside that word's span
      let k = 0; const spans = [];
      words.forEach(([t0, w], wi) => { const st = t0 == null ? s : t0; const en = wi + 1 < words.length && words[wi + 1][0] != null ? words[wi + 1][0] : Math.min(next, st + 0.12 * Array.from(w).length + 0.9); spans.push([st, en, Array.from(w)]); });
      for (const [st, en, cs] of spans) { const tw = cs.reduce((a, c) => a + W8(c), 0) || 1; let acc = 0; for (const c of cs) { if (k < chars.length) out[k++] = st + ((en - st) * acc) / tw; acc += W8(c); } }
      while (k < chars.length) out[k++] = next;
      out[chars.length] = spans.length ? spans[spans.length - 1][1] : next;
    } else {
      const tw = chars.reduce((a, c) => a + W8(c), 0) || 1;
      const dur = Math.max(0.4, Math.min(next - s - 0.08, 0.34 * tw + 0.9));
      let acc = 0;
      chars.forEach((c, k) => { out[k] = s + 0.04 + ((dur * 0.92) * acc) / tw; acc += W8(c); });
      out[chars.length] = s + 0.04 + dur * 0.92;
    }
    return out;
  }
  let kLine = -1, kIdx = -1, kEls = null;
  function karaoke(i, now) {
    if (i < 0) return;
    const ps = box.querySelectorAll('.ly-list p');
    if (i !== kLine) {
      if (kEls) for (const e of kEls) e.classList.remove('k1', 'kn');
      kLine = i; kIdx = -1; kEls = ps[i] ? Array.from(ps[i].querySelectorAll('.kc')) : null;
    }
    if (!kEls || !kEls.length) return;
    const T = times(i);
    let k = 0; while (k < kEls.length && T[k + 1] <= now) k++;
    if (k !== kIdx) {
      for (let j = 0; j < kEls.length; j++) { kEls[j].classList.toggle('k1', j < k); kEls[j].classList.toggle('kn', j === k); }
      kIdx = k;
    }
    if (k < kEls.length) { const a = T[k], b = T[k + 1]; kEls[k].style.setProperty('--kp', Math.max(0, Math.min(1, (now - a) / Math.max(0.05, b - a))).toFixed(3)); }
  }
  // the lyric look follows the skin: neon HUD, starlight, pixels, ink on paper, candy, glass, chrome, warm tape
  const LOOK = { hud: 'hud', cosmic: 'cosmic', pixel: 'pixel', ink: 'ink', cute: 'cute', glass: 'glass', chrome: 'chrome', vinyl: 'retro', cassette: 'retro' };
  function look() {
    const d = R.stage.current();
    box.dataset.look = LOOK[R.poster.famOf(d)] || 'glass';
  }
  R.bus.on('skin', () => { if (open) look(); });
  function show() {
    if (open) return;
    look();
    if (R.ui.sheetKind()) R.ui.closeSheet(true);
    open = true; render();
    box.hidden = false; requestAnimationFrame(() => box.classList.add('on'));
    document.body.classList.add('ly-open');   // the skin's own title and buttons step back while the lyrics are up
    R.fx.focus('lyrics', true);                // and the skin goes soft behind them
    R.stage.sfx('open');
    cancelAnimationFrame(raf); raf = requestAnimationFrame(follow);
    bus.emit('lyrics', true);
  }
  function hide() {
    if (!open) return;
    open = false; cancelAnimationFrame(raf);
    box.classList.remove('on'); setTimeout(() => { if (!open) { box.hidden = true; box.innerHTML = ''; } }, 320);
    document.body.classList.remove('ly-open');
    R.fx.focus('lyrics', false);
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
  return { parse, of, kind, readFile, show, hide, toggle: () => (open ? hide() : show()), isOpen: () => open, timesOf };
})();
