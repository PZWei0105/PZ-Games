/* ===================== the songs either side: 「上一首 ‹ 歌名」「下一首 › 歌名」 under every skin's title =====================
   Shows exactly what the player will do: shuffle shows the real next song of the shuffled order, single-repeat shows
   「重播這首」, the end of a list with repeat off shows 「播完就停」. Tap a title to go straight to that song. A skin can
   set def.nb = 'next' (only the next song, for tight layouts) or 'off'. */
R.nb = (() => {
  const live = new Set();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function state() {
    const P = R.player, S = P.S, n = S.ids.length;
    if (!n || S.i < 0) return null;
    const get = (i) => (i == null || i < 0 ? null : R.lib.get(S.ids[i]));
    const prev = n > 1 ? get(S.i > 0 ? S.i - 1 : n - 1) : null, pi = n > 1 ? (S.i > 0 ? S.i - 1 : n - 1) : -1;
    let next = null, ni = -1, kind = 'song';
    if (S.repeat === 'one') kind = 'one';
    else if (S.i + 1 < n) { ni = S.i + 1; next = get(ni); }
    else if (S.repeat === 'all' && n > 1) { ni = 0; next = get(0); }
    else if (S.repeat === 'all') kind = 'one';                       // a list of one song plays it again
    else kind = 'end';
    return { prev, pi, next, ni, kind };
  }
  function paint(el) {
    const st = state(), p = el.querySelector('.nb-p'), q = el.querySelector('.nb-n');
    if (!st) { el.hidden = true; return; }
    el.hidden = false;
    // too narrow for both halves: only the next song
    const w = el.clientWidth; if (w) el.dataset.nb = el.dataset.want === 'both' && w < 300 ? 'next' : el.dataset.want;
    const pt = st.prev ? st.prev.title || '' : '', nt = st.kind === 'one' ? '重播這首' : st.kind === 'end' ? '播完就停' : st.next ? st.next.title || '' : '';
    const key = st.pi + '|' + st.ni + '|' + st.kind + '|' + pt + '|' + nt;
    if (el.dataset.key === key) return;
    const changed = !!el.dataset.key; el.dataset.key = key;
    p.hidden = !st.prev; p.dataset.i = st.pi;
    p.querySelector('.nb-t').textContent = pt; p.setAttribute('aria-label', '上一首：' + pt);
    q.dataset.i = st.ni; q.dataset.kind = st.kind; q.disabled = st.kind === 'end';
    q.querySelector('.nb-t').textContent = nt; q.setAttribute('aria-label', st.kind === 'song' ? '下一首：' + nt : nt);
    q.querySelector('i').textContent = st.kind === 'one' ? '單曲' : '下一首';
    if (changed) { el.classList.remove('nb-swap'); void el.offsetWidth; el.classList.add('nb-swap'); }
  }
  function attach(root, def) {
    const mode = def.nb || 'both';
    if (mode === 'off') return;
    const want = typeof mode === 'object' ? mode.mode || 'both' : mode;
    // a skin can name where the row goes (def.nb = { at: '.selector', mode }) when its title is drawn on a canvas
    const at = typeof mode === 'object' && mode.at ? root.querySelector(mode.at) : null;
    const title = root.querySelector('[data-bind="title"]'); if (!at && (!title || !title.parentElement)) return;
    const el = document.createElement('div');
    el.className = 'rs-nb'; el.dataset.ui = ''; el.dataset.want = want; el.dataset.nb = want;
    el.innerHTML = `<button type="button" class="nb-b nb-p"><i>上一首</i><b>‹</b><span class="nb-t"></span></button><button type="button" class="nb-b nb-n"><i>下一首</i><b>›</b><span class="nb-t"></span></button>`;
    if (at) at.insertBefore(el, at.firstChild); else title.parentElement.appendChild(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('.nb-b'); if (!b) return;
      e.stopPropagation();
      if (b.classList.contains('nb-n') && b.dataset.kind === 'one') { R.player.seek(0); R.stage.sfx('prev'); return; }
      const i = +b.dataset.i; if (!(i >= 0)) return;
      R.stage.sfx(b.classList.contains('nb-p') ? 'prev' : 'next'); R.player.playIndex(i);
    });
    live.add(el); paint(el); requestAnimationFrame(() => { delete el.dataset.key; paint(el); });
  }
  function refresh() { for (const el of live) { if (!el.isConnected) { live.delete(el); continue; } paint(el); } }
  for (const ev of ['track', 'queue', 'state', 'track:update', 'library']) R.bus.on(ev, () => refresh());
  addEventListener('resize', () => { for (const el of live) delete el.dataset.key; setTimeout(refresh, 60); });
  return { attach, refresh, state };
})();
