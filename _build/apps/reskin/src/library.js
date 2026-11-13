/* ===================== library sheet: songs, playlists, queue ===================== */
R.library = (() => {
  const { $, $$, esc, I, fmtTime, bus } = R;
  const st = { tab: 'songs', q: '', view: null, sel: null, pick: null };
  let io = null, offs = [];

  const SORTS = [['added', '最新加入'], ['title', '歌名'], ['artist', '歌手'], ['plays', '最常播放']];
  const sub = (t) => {
    const parts = [t.artist || '未知歌手'];
    if (t.duration) parts.push(fmtTime(t.duration));
    return esc(parts.join(' · ')) + (t.lost ? ' <span class="warn">· 檔案讀不到，重新匯入就會補回</span>' : t.warn ? ' <span class="warn">· 這台可能播不了</span>' : '');
  };
  const row = (t, o) => {
    o = o || {};
    const cur = R.player.current();
    const isCur = cur && cur.id === t.id;
    const lead = o.check ? `<div class="r-chk">${I.check}</div>` : '';
    const bpmTag = o.bpm && t.bpm ? `<span class="r-bpm">${Math.round(t.bpm < 92 && R.smart.feats(t).rb > t.bpm ? t.bpm * 2 : t.bpm)}</span>` : '';
    return `<div class="row${isCur ? ' cur' : ''}${o.check && st.sel && st.sel.has(t.id) ? ' sel' : ''}" data-tid="${t.id}" ${o.idx != null ? `data-idx="${o.idx}"` : ''} role="button" tabindex="0" style="${o.check ? 'grid-template-columns:26px 48px 1fr auto' : o.grip ? 'grid-template-columns:48px 1fr auto auto' : ''}">
      ${lead}<div class="r-art" data-art="${t.id}"></div>
      <div class="r-tx"><div class="r-t">${bpmTag}${t.fav ? `<i class="r-fav">${I.heartF}</i>` : ''}${esc(t.title)}</div><div class="r-s">${sub(t)}</div></div>
      ${o.check ? '' : `<button type="button" class="r-m" data-more="${t.id}" aria-label="更多">${I.more}</button>`}
      ${o.grip ? `<div class="r-g" data-grip aria-label="拖動排序">${I.grip}</div>` : ''}
    </div>`;
  };
  const head = (title, left, right) => `<div class="sh-head">${left || ''}<h3>${title}</h3>${right || ''}<button type="button" class="ib" data-act="sheet-close" aria-label="關閉">${I.close}</button></div>`;
  const tabs = () => `<div class="tabs" role="tablist">${[['songs', '歌曲'], ['lists', '歌單'], ['queue', '播放佇列']].map(([k, l]) => `<button type="button" class="${st.tab === k ? 'on' : ''}" data-lt="${k}" role="tab">${l}</button>`).join('')}</div>`;
  const mosaic = (ids, cls) => {
    const a = ids.slice(0, 4);
    if (a.length < 4) return `<div class="pl-art one ${cls || ''}"><i data-art="${a[0] || ''}"></i></div>`;
    return `<div class="pl-art ${cls || ''}">${a.map((id) => `<i data-art="${id}"></i>`).join('')}</div>`;
  };

  // Long lists (a folder of thousands of songs) draw their first rows right away and the rest as they scroll into view.
  const FIRST = 150, MORE = 250;
  let lazy = null, keepRows = 0, moreIO = null;
  function rowsHTML(items, make) {
    const n = Math.min(items.length, Math.max(FIRST, keepRows));
    let h = '';
    for (let k = 0; k < n; k++) h += make(items[k], k);
    lazy = n < items.length ? { items, make, done: n } : null;
    return h + (lazy ? '<div class="more-rows" data-more-rows></div>' : '');
  }
  function watchMore(root) {
    if (moreIO) { moreIO.disconnect(); moreIO = null; }
    const s = $('[data-more-rows]', root), L = lazy;
    if (!s || !L) return;
    const sc = s.closest('.sc') || root;
    const add = () => {
      if (lazy !== L || !s.isConnected) return false;
      const end = Math.min(L.items.length, L.done + MORE);
      let h = '';
      for (let k = L.done; k < end; k++) h += L.make(L.items[k], k);
      s.insertAdjacentHTML('beforebegin', h);
      L.done = end;
      watchArts(sc);
      if (end < L.items.length) return true;
      s.remove(); lazy = null;
      if (moreIO) { moreIO.disconnect(); moreIO = null; }
      return false;
    };
    if (!('IntersectionObserver' in window)) { while (add()); return; }
    // keep adding while the end of the list is still near the bottom of the screen
    const near = () => s.isConnected && s.getBoundingClientRect().top < sc.getBoundingClientRect().bottom + 1500;
    const go = () => { if (add() && near()) requestAnimationFrame(go); };
    moreIO = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) go(); }, { root: sc, rootMargin: '0px 0px 1500px 0px' });
    moreIO.observe(s);
  }
  const pickRow = (t, inP) => `<div class="row${st.pick.has(t.id) ? ' sel' : ''}${inP.has(t.id) ? ' in' : ''}" data-pick="${t.id}" style="grid-template-columns:26px 48px 1fr" role="button" tabindex="0"><div class="r-chk">${I.check}</div><div class="r-art" data-art="${t.id}"></div><div class="r-tx"><div class="r-t">${esc(t.title)}</div><div class="r-s">${inP.has(t.id) ? '已在歌單裡' : sub(t)}</div></div></div>`;

  function songsHTML() {
    const all = R.lib.list(null, st.q);
    const n = R.lib.count();
    const sortL = (SORTS.find((s) => s[0] === R.settings.get('sort')) || SORTS[0])[1];
    const selMode = !!st.sel;
    const tools = selMode
      ? `<div class="tools"><button type="button" class="chipb" data-l="sel-all">${I.check}全選</button><button type="button" class="chipb" data-l="sel-pl">${I.playlist}加入歌單</button><button type="button" class="chipb" data-l="sel-del" style="color:#ff8a8a">${I.trash}刪除</button><button type="button" class="chipb pri" data-l="sel-end">完成（${st.sel.size}）</button></div>`
      : `<div class="tools"><button type="button" class="chipb pri" data-l="play-all">${I.play}全部播放</button><button type="button" class="chipb" data-l="shuf-all">${I.shuffle}隨機</button><button type="button" class="chipb" data-l="import">${I.upload}匯入</button><button type="button" class="chipb" data-l="sort">${I.sort}${esc(sortL)}</button>${n ? `<button type="button" class="chipb" data-l="sel">${I.check}選取</button>` : ''}</div>`;
    const list = !n
      ? `<div class="blank">歌庫還是空的。<br>把手機或電腦裡的音樂檔放進來，<br>${R.canFolder ? '一首首選或整個資料夾都可以，' : ''}放進來之後不用網路也能聽。<br><br><button type="button" class="btn pri" data-l="files">${I.upload}選擇音樂檔</button>${R.canFolder ? ` <button type="button" class="btn sec" data-l="folder">${I.folder}整個資料夾</button>` : ''}<br><br><button type="button" class="btn sec" data-l="demo">${I.sparkle}先放示範曲進來</button></div>`
      : all.length ? rowsHTML(all, (t) => row(t, { check: selMode })) : `<div class="blank">找不到「${esc(st.q)}」</div>`;
    return head(`歌庫 <small style="font-size:13px;color:rgba(255,255,255,.5);font-weight:600">${n} 首</small>`) + tabs() + tools + (n ? `<div class="search">${I.search}<input type="search" placeholder="搜尋歌名、歌手、專輯" value="${esc(st.q)}" data-l="q" enterkeyhint="search"></div>` : '') + `<div class="sc" data-list>${list}</div>`;
  }
  function listsHTML() {
    const pls = R.lib.pl.all();
    const skinName = (id) => { const d = id && R.skins.get(id); return d ? d.name : ''; };
    const fv = R.lib.pl.get('fav');
    const favCard = `<div class="pl-card fav" data-pl="fav" role="button" tabindex="0"><div class="pl-art one fav-art"><i>${I.heartF}</i></div><div style="min-width:0"><b>我的最愛</b><small>${fv.ids.length ? `${fv.ids.length} 首 · ${fmtTime(R.lib.pl.duration('fav'))}` : '播歌時按右上角的 ♡ 就會收進來'}${fv.skin && skinName(fv.skin) ? `<span class="badge">${I.hanger}${esc(skinName(fv.skin))}</span>` : ''}</small></div><span style="color:rgba(255,255,255,.4);font-size:18px">${I.chev}</span></div>`;
    const body = favCard + (pls.length
      ? pls.map((p) => `<div class="pl-card" data-pl="${p.id}" role="button" tabindex="0">${mosaic(p.ids)}<div style="min-width:0"><b>${esc(p.name)}</b><small>${p.ids.length} 首${p.ids.length ? ' · ' + fmtTime(R.lib.pl.duration(p.id)) : ''}${p.skin && skinName(p.skin) ? `<span class="badge">${I.hanger}${esc(skinName(p.skin))}</span>` : ''}</small></div><span style="color:rgba(255,255,255,.4);font-size:18px">${I.chev}</span></div>`).join('')
      : `<div class="blank">還沒有自己的歌單。<br>做一個歌單，還可以幫它綁一套 Skin：<br>一播這個歌單，播放器就自動換上那套衣服。</div>`);
    // smart playlists: sorted by the songs' own measurements
    const pend = R.smart.pending();
    const smart = `<div class="sec-t">智慧歌單 · 自動分類${pend ? `<small class="sm-pend">還有 ${pend} 首在分析</small>` : ''}</div><div class="sm-grid">${R.smart.all().map((p) => `<div class="sm-card" data-pl="${p.id}" role="button" tabindex="0" style="--g1:${p.smart.g[0]};--g2:${p.smart.g[1]}"><i>${p.smart.icon}</i><b>${p.smart.name}</b><small>${p.ids.length} 首${p.skin && skinName(p.skin) ? ' · ' + esc(skinName(p.skin)) : ''}</small></div>`).join('')}</div><div class="sec-t">我的歌單</div>`;
    return head('歌單') + tabs() + `<div class="tools"><button type="button" class="chipb pri" data-l="pl-new">${I.plus}新歌單</button><button type="button" class="chipb" data-l="report">${I.sparkle}聽歌報告</button></div><div class="sc">${smart}${body}</div>`;
  }
  function queueHTML() {
    const ids = R.player.queue(), i = R.player.index();
    const cur = R.player.current();
    const src = R.player.source();
    const srcName = src.type === 'playlist' ? (R.lib.pl.get(src.id) || {}).name || '歌單' : '歌庫';
    let body;
    if (!cur) body = `<div class="blank">現在沒有在播的歌。</div>`;
    else {
      const rest = ids.slice(i + 1).map(R.lib.get).filter(Boolean);
      body = `<div class="sec-t">正在播放 · 來自${esc(srcName)}</div>${row(cur)}<div class="sec-t">接下來（${rest.length}）</div>${rest.length ? rowsHTML(rest, (t, k) => row(t, { idx: i + 1 + k })) : '<div class="blank" style="padding:16px">這是最後一首' + (R.player.S.repeat === 'all' ? '，播完會從頭再來' : '') + '</div>'}`;
    }
    return head('播放佇列') + tabs() + `<div class="sc">${body}</div>`;
  }
  function playlistHTML(id) {
    const p = R.lib.pl.get(id);
    if (!p) { st.view = null; return listsHTML(); }
    const ts = R.lib.pl.tracks(id);
    const sk = p.skin ? R.skins.get(p.skin) : null;
    const smartNote = p.smart ? `<div class="sm-note">${esc(p.smart.sub)}。歌曲分析完會自動分進來${p.smart.id === 'run' ? '，照節奏由慢到快排好' : ''}。</div>` : '';
    return head(esc(p.name), `<button type="button" class="ib" data-l="back" aria-label="返回">${I.back}</button>`, p.virtual ? '' : `<button type="button" class="ib" data-l="pl-more" aria-label="歌單選項">${I.more}</button>`)
      + `<div class="pl-hero">${mosaic(p.ids)}<div><b>${esc(p.name)}</b><small>${ts.length} 首 · ${fmtTime(R.lib.pl.duration(id))}</small><div style="margin-top:8px"><button type="button" class="chipb" data-l="pl-skin">${I.hanger}${sk ? '綁定：' + esc(sk.name) : '綁定 Skin'}</button></div></div></div>`
      + `<div class="tools"><button type="button" class="chipb pri" data-l="pl-play" ${ts.length ? '' : 'disabled'}>${I.play}播放</button><button type="button" class="chipb" data-l="pl-shuf" ${ts.length ? '' : 'disabled'}>${I.shuffle}隨機</button>${p.smart ? '' : `<button type="button" class="chipb" data-l="pl-add">${I.plus}加歌</button>`}</div>`
      + `<div class="sc" data-plist="${id}">${smartNote}${ts.length ? rowsHTML(ts, (t, k) => row(t, { grip: !p.virtual, idx: k, bpm: p.smart && p.smart.id === 'run' })) : p.smart ? '<div class="blank">現在還沒有符合的歌。<br>歌多一點、分析完，就會自動分進來。</div>' : p.virtual ? '<div class="blank">還沒有最愛的歌。<br>播歌時按右上角的 ♡，或在歌曲的「⋯」選單裡加入。</div>' : '<div class="blank">這個歌單還是空的，按「加歌」挑幾首進來。</div>'}</div>`;
  }
  function pickHTML(id) {
    const p = R.lib.pl.get(id);
    const all = R.lib.list(null, st.q), inP = new Set(p ? p.ids : []);
    return head('加歌到「' + esc(p ? p.name : '') + '」', `<button type="button" class="ib" data-l="pick-cancel" aria-label="返回">${I.back}</button>`)
      + `<div class="tools"><button type="button" class="chipb pri" data-l="pick-done">${I.check}加入（${st.pick.size}）</button></div>`
      + `<div class="search">${I.search}<input type="search" placeholder="搜尋" value="${esc(st.q)}" data-l="q"></div>`
      + `<div class="sc">${rowsHTML(all, (t) => pickRow(t, inP))}</div>`;
  }

  function html() {
    if (st.view && st.view.type === 'playlist') return playlistHTML(st.view.id);
    if (st.view && st.view.type === 'pick') return pickHTML(st.view.id);
    return st.tab === 'lists' ? listsHTML() : st.tab === 'queue' ? queueHTML() : songsHTML();
  }

  const loadArt = (el) => {
    const id = el.dataset.art; if (!id) return;
    const t = R.lib.get(id); if (!t) return;
    R.art.coverUrl(t, 'thumb').then((u) => { if (u) el.style.backgroundImage = `url("${u}")`; });
  };
  function arts(root) {
    if (io) { io.disconnect(); io = null; }
    watchArts(root);
  }
  // covers load as their rows come near the screen
  function watchArts(root) {
    const els = $$('[data-art]:not([data-aw])', root);
    for (const el of els) el.setAttribute('data-aw', '');
    if (!('IntersectionObserver' in window)) { els.forEach(loadArt); return; }
    if (!io) {
      const sc = $('.sc', R.ui.body());
      io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); loadArt(e.target); } }, { root: sc, rootMargin: '300px' });
    }
    els.forEach((el) => (el.closest('.sc') ? io.observe(el) : loadArt(el)));
  }

  let scrollKeep = 0;
  function render(first, keepScroll) {
    const sc0 = $('.sc', R.ui.body());
    scrollKeep = keepScroll && sc0 ? sc0.scrollTop : 0;
    keepRows = keepScroll && sc0 ? $$('.row', sc0).length : 0;
    lazy = null;
    const h = html();
    keepRows = 0;
    if (first || R.ui.sheetKind() !== 'lib') R.ui.openSheet(h, { kind: 'lib', onClose });
    else R.ui.body().innerHTML = h;
    const b = R.ui.body();
    const sc = $('.sc', b); if (sc && scrollKeep) sc.scrollTop = scrollKeep;
    arts(b); watchMore(b);
    if (st.view && st.view.type === 'playlist') grips($('[data-plist]', b));
  }
  function onClose() {
    for (const f of offs) f(); offs = [];
    if (io) { io.disconnect(); io = null; }
    if (moreIO) { moreIO.disconnect(); moreIO = null; }
    lazy = null;
    st.sel = null; st.pick = null;
    if (st.view && st.view.type === 'pick') st.view = { type: 'playlist', id: st.view.id };
  }
  function open(tab) {
    if (tab) { st.tab = tab; st.view = null; }
    st.sel = null;
    render(true);
    const re = R.debounce(() => { if (R.ui.sheetKind() === 'lib') render(false, true); }, 120);
    offs.push(bus.on('library', re), bus.on('playlists', re), bus.on('queue', () => { if (st.tab === 'queue' && !st.view) re(); }),
      bus.on('track', () => { const b = R.ui.body(); const cur = R.player.current(); $$('.row', b).forEach((r) => r.classList.toggle('cur', !!cur && r.dataset.tid === cur.id)); if (st.tab === 'queue' && !st.view) re(); }),
      bus.on('track:update', R.debounce(() => { if (R.ui.sheetKind() === 'lib' && !st.sel) render(false, true); }, 400)));
  }

  // drag to reorder inside a playlist
  function grips(list) {
    if (!list) return;
    list.addEventListener('pointerdown', (e) => {
      const g = e.target.closest('[data-grip]'); if (!g) return;
      const rowEl = g.closest('.row'); const rows = $$('.row', list); const from = rows.indexOf(rowEl);
      const h = rowEl.getBoundingClientRect().height; const y0 = e.clientY; let to = from;
      rowEl.classList.add('dragging'); e.preventDefault();
      try { g.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      const mv = (ev) => {
        const dy = ev.clientY - y0; rowEl.style.transform = `translateY(${dy}px)`;
        to = Math.max(0, Math.min(rows.length - 1, from + Math.round(dy / h)));
        rows.forEach((r, k) => { if (r === rowEl) return; let s = 0; if (from < to && k > from && k <= to) s = -h; if (from > to && k < from && k >= to) s = h; r.style.transform = s ? `translateY(${s}px)` : ''; r.style.transition = 'transform .15s'; });
      };
      const up = async () => {
        g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up);
        rows.forEach((r) => { r.style.transform = ''; r.style.transition = ''; }); rowEl.classList.remove('dragging');
        if (to !== from) {
          const p = R.lib.pl.get(list.dataset.plist); if (!p) return;
          const ids = p.ids.slice(); const [x] = ids.splice(from, 1); ids.splice(to, 0, x); p.ids = ids;
          R.stage.sfx('tick'); await R.lib.pl.save(p);
        }
      };
      g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
    });
  }

  async function trackMenu(id, ctx) {
    const t = R.lib.get(id); if (!t) return;
    const items = [{ key: 'next', label: '下一首播放', icon: I.next2 }, { key: 'fav', label: t.fav ? '移出我的最愛' : '加入我的最愛', icon: t.fav ? I.heartF : I.heart }, { key: 'pl', label: '加入歌單…', icon: I.playlist }];
    if (ctx && ctx.pl && ctx.pl !== 'fav') items.push({ key: 'unpl', label: '移出這個歌單', icon: I.close });
    items.push({ key: 'edit', label: '改歌名、歌手、封面、歌詞', icon: I.edit }, { key: 'info', label: '歌曲情報', sub: 'BPM、調性、能量曲線、副歌在哪', icon: I.info }, { key: 'del', label: '從歌庫刪除', icon: I.trash, danger: true });
    const k = await R.ui.menu(items, { title: t.title, sub: t.artist || '' });
    if (k === 'next') { R.player.playNext(id); R.toast('會在這首之後播放'); }
    else if (k === 'fav') { await R.lib.setFav(id, !t.fav); R.toast(t.fav ? '加入我的最愛 ♥' : '移出我的最愛', { ms: 1600 }); }
    else if (k === 'edit') R.extras.editTrack(id);
    else if (k === 'pl') addToPlaylist([id]);
    else if (k === 'unpl') { const p = R.lib.pl.get(ctx.pl); if (p) { p.ids = p.ids.filter((x) => x !== id); await R.lib.pl.save(p); } }
    else if (k === 'info') R.insight.open(id);
    else if (k === 'del') {
      if (await R.ui.confirm({ title: `刪除《${t.title}》？`, sub: '只會從這個 App 的歌庫刪掉，不會動到你手機或電腦裡的原始檔。', ok: '刪除', danger: true })) { await R.lib.remove([id]); R.toast('已刪除'); }
    }
  }
  async function addToPlaylist(ids) {
    const pls = R.lib.pl.all();
    const items = pls.map((p) => ({ key: p.id, label: `${p.name}（${p.ids.length}）`, icon: I.playlist }));
    items.unshift({ key: '+', label: '新歌單…', icon: I.plus });
    const k = await R.ui.menu(items, { title: ids.length > 1 ? `加入 ${ids.length} 首到歌單` : '加入歌單' });
    if (!k) return false;
    if (k === '+') {
      const name = await R.ui.prompt({ title: '新歌單', placeholder: '例如：開車聽、深夜、健身', ok: '建立' });
      if (name == null) return false;
      const p = await R.lib.pl.create(name || '新歌單', ids);
      R.toast(`已建立「${p.name}」`);
      return true;
    }
    const n = await R.lib.pl.add(k, ids);
    R.toast(n ? `加入了 ${n} 首` : '這些歌已經在歌單裡');
    return true;
  }
  async function playlistMenu(id) {
    const p = R.lib.pl.get(id); if (!p) return;
    const k = await R.ui.menu([{ key: 'ren', label: '重新命名', icon: I.edit }, { key: 'skin', label: '綁定 Skin', icon: I.hanger }, { key: 'del', label: '刪除歌單', icon: I.trash, danger: true }], { title: p.name });
    if (k === 'ren') { const n = await R.ui.prompt({ title: '歌單名稱', value: p.name, ok: '儲存' }); if (n) { p.name = n; await R.lib.pl.save(p); } }
    else if (k === 'skin') bindSkin(id);
    else if (k === 'del') { if (await R.ui.confirm({ title: `刪除歌單「${p.name}」？`, sub: '只刪歌單，歌還會留在歌庫裡。', ok: '刪除', danger: true })) { await R.lib.pl.remove(id); st.view = null; render(false); } }
  }
  async function bindSkin(id) {
    const p = R.lib.pl.get(id); if (!p) return;
    const items = [{ key: '-', label: '不綁定（照衣櫃的設定）', icon: I.close, on: !p.skin }].concat(R.skins.list().map((d) => ({ key: d.id, label: d.name, icon: I.hanger, on: p.skin === d.id })));
    const k = await R.ui.menu(items, { title: '這個歌單要穿哪一套？', sub: '播這個歌單時，播放器會自動換上這套 Skin。' });
    if (!k) return;
    p.skin = k === '-' ? null : k;
    await R.lib.pl.save(p);
    if (R.player.source().type === 'playlist' && R.player.source().id === id) R.bus.emit('source', R.player.source());
  }

  // one click handler for the whole sheet (delegated)
  document.addEventListener('click', async (e) => {
    if (R.ui.sheetKind() !== 'lib') return;
    const b = R.ui.body(); if (!b.contains(e.target)) return;
    const lt = e.target.closest('[data-lt]');
    if (lt) { st.tab = lt.dataset.lt; st.view = null; st.sel = null; R.sfx.play('tap'); render(false); return; }
    const more = e.target.closest('[data-more]');
    if (more) { e.stopPropagation(); trackMenu(more.dataset.more, st.view && st.view.type === 'playlist' ? { pl: st.view.id } : null); return; }
    const l = e.target.closest('[data-l]');
    if (l) {
      const a = l.dataset.l;
      if (a === 'q') return;
      if (a === 'import') { R.app.importMenu(); return; }
      if (a === 'files' || a === 'folder') { R.app.pickFiles(a === 'folder'); return; }
      if (a === 'demo') { R.ui.closeSheet(true); R.app.addDemo(); return; }
      if (a === 'play-all' || a === 'shuf-all') {
        const all = R.lib.list(null, st.q); if (!all.length) return;
        R.player.prime();
        if (a === 'shuf-all' && !R.player.S.shuffle) R.player.setShuffle(true);
        if (a === 'play-all' && R.player.S.shuffle) R.player.setShuffle(false);
        const start = a === 'shuf-all' ? all[Math.floor(Math.random() * all.length)].id : all[0].id;
        R.player.playFrom(all.map((t) => t.id), start, { type: 'library' });
        R.ui.closeSheet(); return;
      }
      if (a === 'sort') {
        const k = await R.ui.menu(SORTS.map(([key, label]) => ({ key, label, on: R.settings.get('sort') === key, icon: I.sort })), { title: '排序' });
        if (k) { R.settings.set('sort', k); render(false); }
        return;
      }
      if (a === 'sel') { st.sel = new Set(); render(false); return; }
      if (a === 'sel-end') { st.sel = null; render(false, true); return; }
      if (a === 'sel-all') { const all = R.lib.list(null, st.q); st.sel = st.sel.size === all.length ? new Set() : new Set(all.map((t) => t.id)); render(false, true); return; }
      if (a === 'sel-pl') { if (!st.sel.size) return; if (await addToPlaylist(Array.from(st.sel))) { st.sel = null; render(false, true); } return; }
      if (a === 'sel-del') {
        if (!st.sel.size) return;
        if (await R.ui.confirm({ title: `刪除 ${st.sel.size} 首歌？`, sub: '只會從這個 App 的歌庫刪掉，不會動到原始檔。', ok: '刪除', danger: true })) { const ids = Array.from(st.sel); st.sel = null; await R.lib.remove(ids); R.toast(`已刪除 ${ids.length} 首`); }
        return;
      }
      if (a === 'report') { R.ui.closeSheet(true); R.report.open(); return; }
      if (a === 'pl-new') { const name = await R.ui.prompt({ title: '新歌單', placeholder: '例如：開車聽、深夜、健身', ok: '建立' }); if (name != null) { const p = await R.lib.pl.create(name); st.view = { type: 'playlist', id: p.id }; render(false); } return; }
      if (a === 'back') { st.view = null; st.tab = 'lists'; R.sfx.play('tap'); render(false); return; }
      if (a === 'pl-more') { playlistMenu(st.view.id); return; }
      if (a === 'pl-skin') { bindSkin(st.view.id); return; }
      if (a === 'pl-play' || a === 'pl-shuf') {
        const p = R.lib.pl.get(st.view.id); if (!p || !p.ids.length) return;
        R.player.prime();
        if (a === 'pl-shuf' && !R.player.S.shuffle) R.player.setShuffle(true);
        if (a === 'pl-play' && R.player.S.shuffle) R.player.setShuffle(false);
        R.player.playFrom(p.ids, a === 'pl-shuf' ? p.ids[Math.floor(Math.random() * p.ids.length)] : p.ids[0], { type: 'playlist', id: p.id });
        R.ui.closeSheet(); return;
      }
      if (a === 'pl-add') { st.pick = new Set(); st.q = ''; st.view = { type: 'pick', id: st.view.id }; render(false); return; }
      if (a === 'pick-cancel') { st.pick = null; st.view = { type: 'playlist', id: st.view.id }; render(false); return; }
      if (a === 'pick-done') { const id = st.view.id; if (st.pick.size) { const n = await R.lib.pl.add(id, Array.from(st.pick)); R.toast(`加入了 ${n} 首`); } st.pick = null; st.q = ''; st.view = { type: 'playlist', id }; render(false); return; }
      return;
    }
    const pk = e.target.closest('[data-pick]');
    if (pk) { const id = pk.dataset.pick; if (st.pick.has(id)) st.pick.delete(id); else st.pick.add(id); pk.classList.toggle('sel'); const d = $('[data-l="pick-done"]', b); if (d) d.innerHTML = `${I.check}加入（${st.pick.size}）`; R.sfx.play('tick'); return; }
    const pl = e.target.closest('[data-pl]');
    if (pl) { st.view = { type: 'playlist', id: pl.dataset.pl }; R.sfx.play('tap'); render(false); return; }
    const r = e.target.closest('.row[data-tid]');
    if (r) {
      const id = r.dataset.tid;
      if (st.sel) { if (st.sel.has(id)) st.sel.delete(id); else st.sel.add(id); r.classList.toggle('sel'); const d = $('[data-l="sel-end"]', b); if (d) d.textContent = `完成（${st.sel.size}）`; R.sfx.play('tick'); return; }
      R.player.prime();
      if (st.view && st.view.type === 'playlist') { const p = R.lib.pl.get(st.view.id); R.player.playFrom(p.ids, id, { type: 'playlist', id: p.id }); }
      else if (st.tab === 'queue' && r.dataset.idx != null) R.player.jump(+r.dataset.idx);
      else if (st.tab === 'queue') { /* current song: nothing */ }
      else R.player.playFrom(R.lib.list(null, st.q).map((t) => t.id), id, { type: 'library' });
      $$('.row', b).forEach((x) => x.classList.toggle('cur', x === r));
      setTimeout(() => R.ui.closeSheet(), 180);
    }
  });
  document.addEventListener('input', (e) => {
    if (R.ui.sheetKind() !== 'lib' || !e.target.matches('[data-l="q"]')) return;
    st.q = e.target.value;
    const b = R.ui.body(); const sc = $('.sc', b);
    keepRows = 0;
    if (st.view && st.view.type === 'pick') {
      const all = R.lib.list(null, st.q), p = R.lib.pl.get(st.view.id), inP = new Set(p ? p.ids : []);
      sc.innerHTML = rowsHTML(all, (t) => pickRow(t, inP));
    } else {
      const all = R.lib.list(null, st.q);
      lazy = null;
      sc.innerHTML = all.length ? rowsHTML(all, (t) => row(t, { check: !!st.sel })) : `<div class="blank">找不到「${esc(st.q)}」</div>`;
    }
    sc.scrollTop = 0;
    arts(b); watchMore(b);
  });

  return { open, trackMenu, addToPlaylist };
})();
