/* ===================== library sheet: songs, playlists, queue ===================== */
R.library = (() => {
  const { $, $$, esc, I, fmtTime, bus } = R;
  const st = { tab: 'songs', q: '', view: null, sel: null, pick: null };
  let io = null, offs = [];

  const SORTS = [['added', '最新加入'], ['title', '歌名'], ['artist', '歌手'], ['plays', '最常播放']];
  const sub = (t) => {
    const parts = [t.artist || '未知歌手'];
    if (t.duration) parts.push(fmtTime(t.duration));
    return esc(parts.join(' · ')) + (t.warn ? ' <span class="warn">· 這台可能播不了</span>' : '');
  };
  const row = (t, o) => {
    o = o || {};
    const cur = R.player.current();
    const isCur = cur && cur.id === t.id;
    const lead = o.check ? `<div class="r-chk">${I.check}</div>` : '';
    return `<div class="row${isCur ? ' cur' : ''}${o.check && st.sel && st.sel.has(t.id) ? ' sel' : ''}" data-tid="${t.id}" ${o.idx != null ? `data-idx="${o.idx}"` : ''} role="button" tabindex="0" style="${o.check ? 'grid-template-columns:26px 48px 1fr auto' : o.grip ? 'grid-template-columns:48px 1fr auto auto' : ''}">
      ${lead}<div class="r-art" data-art="${t.id}"></div>
      <div class="r-tx"><div class="r-t">${esc(t.title)}</div><div class="r-s">${sub(t)}</div></div>
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

  function songsHTML() {
    const all = R.lib.list(null, st.q);
    const n = R.lib.count();
    const sortL = (SORTS.find((s) => s[0] === R.settings.get('sort')) || SORTS[0])[1];
    const selMode = !!st.sel;
    const tools = selMode
      ? `<div class="tools"><button type="button" class="chipb" data-l="sel-all">${I.check}全選</button><button type="button" class="chipb" data-l="sel-pl">${I.playlist}加入歌單</button><button type="button" class="chipb" data-l="sel-del" style="color:#ff8a8a">${I.trash}刪除</button><button type="button" class="chipb pri" data-l="sel-end">完成（${st.sel.size}）</button></div>`
      : `<div class="tools"><button type="button" class="chipb pri" data-l="play-all">${I.play}全部播放</button><button type="button" class="chipb" data-l="shuf-all">${I.shuffle}隨機</button><button type="button" class="chipb" data-l="import">${I.upload}匯入</button><button type="button" class="chipb" data-l="sort">${I.sort}${esc(sortL)}</button>${n ? `<button type="button" class="chipb" data-l="sel">${I.check}選取</button>` : ''}</div>`;
    const list = !n
      ? `<div class="blank">歌庫還是空的。<br>按「匯入」把手機或電腦裡的音樂檔放進來，<br>放進來之後不用網路也能聽。<br><br><button type="button" class="btn pri" data-l="import">${I.upload}選擇音樂檔</button>${R.isTouch ? '' : ` <button type="button" class="btn sec" data-l="folder">${I.folder}整個資料夾</button>`}<br><br><button type="button" class="btn sec" data-l="demo">${I.sparkle}先放示範曲進來</button></div>`
      : all.length ? all.map((t) => row(t, { check: selMode })).join('') : `<div class="blank">找不到「${esc(st.q)}」</div>`;
    return head(`歌庫 <small style="font-size:13px;color:rgba(255,255,255,.5);font-weight:600">${n} 首</small>`) + tabs() + tools + (n ? `<div class="search">${I.search}<input type="search" placeholder="搜尋歌名、歌手、專輯" value="${esc(st.q)}" data-l="q" enterkeyhint="search"></div>` : '') + `<div class="sc" data-list>${list}</div>`;
  }
  function listsHTML() {
    const pls = R.lib.pl.all();
    const skinName = (id) => { const d = id && R.skins.get(id); return d ? d.name : ''; };
    const body = pls.length
      ? pls.map((p) => `<div class="pl-card" data-pl="${p.id}" role="button" tabindex="0">${mosaic(p.ids)}<div style="min-width:0"><b>${esc(p.name)}</b><small>${p.ids.length} 首${p.ids.length ? ' · ' + fmtTime(R.lib.pl.duration(p.id)) : ''}${p.skin && skinName(p.skin) ? `<span class="badge">${I.hanger}${esc(skinName(p.skin))}</span>` : ''}</small></div><span style="color:rgba(255,255,255,.4);font-size:18px">${I.chev}</span></div>`).join('')
      : `<div class="blank">還沒有歌單。<br>做一個歌單，還可以幫它綁一套 Skin：<br>一播這個歌單，播放器就自動換上那套衣服。</div>`;
    return head('歌單') + tabs() + `<div class="tools"><button type="button" class="chipb pri" data-l="pl-new">${I.plus}新歌單</button></div><div class="sc">${body}</div>`;
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
      body = `<div class="sec-t">正在播放 · 來自${esc(srcName)}</div>${row(cur)}<div class="sec-t">接下來（${rest.length}）</div>${rest.length ? rest.map((t, k) => row(t, { idx: i + 1 + k })).join('') : '<div class="blank" style="padding:16px">這是最後一首' + (R.player.S.repeat === 'all' ? '，播完會從頭再來' : '') + '</div>'}`;
    }
    return head('播放佇列') + tabs() + `<div class="sc">${body}</div>`;
  }
  function playlistHTML(id) {
    const p = R.lib.pl.get(id);
    if (!p) { st.view = null; return listsHTML(); }
    const ts = R.lib.pl.tracks(id);
    const sk = p.skin ? R.skins.get(p.skin) : null;
    return head(esc(p.name), `<button type="button" class="ib" data-l="back" aria-label="返回">${I.back}</button>`, `<button type="button" class="ib" data-l="pl-more" aria-label="歌單選項">${I.more}</button>`)
      + `<div class="pl-hero">${mosaic(p.ids)}<div><b>${esc(p.name)}</b><small>${ts.length} 首 · ${fmtTime(R.lib.pl.duration(id))}</small><div style="margin-top:8px"><button type="button" class="chipb" data-l="pl-skin">${I.hanger}${sk ? '綁定：' + esc(sk.name) : '綁定 Skin'}</button></div></div></div>`
      + `<div class="tools"><button type="button" class="chipb pri" data-l="pl-play" ${ts.length ? '' : 'disabled'}>${I.play}播放</button><button type="button" class="chipb" data-l="pl-shuf" ${ts.length ? '' : 'disabled'}>${I.shuffle}隨機</button><button type="button" class="chipb" data-l="pl-add">${I.plus}加歌</button></div>`
      + `<div class="sc" data-plist="${id}">${ts.length ? ts.map((t, k) => row(t, { grip: true, idx: k })).join('') : '<div class="blank">這個歌單還是空的，按「加歌」挑幾首進來。</div>'}</div>`;
  }
  function pickHTML(id) {
    const p = R.lib.pl.get(id);
    const all = R.lib.list(null, st.q);
    return head('加歌到「' + esc(p ? p.name : '') + '」', `<button type="button" class="ib" data-l="pick-cancel" aria-label="返回">${I.back}</button>`)
      + `<div class="tools"><button type="button" class="chipb pri" data-l="pick-done">${I.check}加入（${st.pick.size}）</button></div>`
      + `<div class="search">${I.search}<input type="search" placeholder="搜尋" value="${esc(st.q)}" data-l="q"></div>`
      + `<div class="sc">${all.map((t) => `<div class="row${st.pick.has(t.id) ? ' sel' : ''}${p && p.ids.includes(t.id) ? ' in' : ''}" data-pick="${t.id}" style="grid-template-columns:26px 48px 1fr" role="button" tabindex="0"><div class="r-chk">${I.check}</div><div class="r-art" data-art="${t.id}"></div><div class="r-tx"><div class="r-t">${esc(t.title)}</div><div class="r-s">${p && p.ids.includes(t.id) ? '已在歌單裡' : sub(t)}</div></div></div>`).join('')}</div>`;
  }

  function html() {
    if (st.view && st.view.type === 'playlist') return playlistHTML(st.view.id);
    if (st.view && st.view.type === 'pick') return pickHTML(st.view.id);
    return st.tab === 'lists' ? listsHTML() : st.tab === 'queue' ? queueHTML() : songsHTML();
  }

  function arts(root) {
    if (io) io.disconnect();
    const load = (el) => {
      const id = el.dataset.art; if (!id) return;
      const t = R.lib.get(id); if (!t) return;
      R.art.coverUrl(t, 'thumb').then((u) => { if (u) el.style.backgroundImage = `url("${u}")`; });
    };
    const els = $$('[data-art]', root);
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); load(e.target); } }, { root: $('.sc', root), rootMargin: '300px' });
      els.forEach((el) => (el.closest('.sc') ? io.observe(el) : load(el)));
    } else els.forEach(load);
  }

  let scrollKeep = 0;
  function render(first, keepScroll) {
    const sc0 = $('.sc', R.ui.body());
    scrollKeep = keepScroll && sc0 ? sc0.scrollTop : 0;
    const h = html();
    if (first || R.ui.sheetKind() !== 'lib') R.ui.openSheet(h, { kind: 'lib', onClose });
    else R.ui.body().innerHTML = h;
    const b = R.ui.body();
    const sc = $('.sc', b); if (sc && scrollKeep) sc.scrollTop = scrollKeep;
    arts(b);
    if (st.view && st.view.type === 'playlist') grips($('[data-plist]', b));
  }
  function onClose() {
    for (const f of offs) f(); offs = [];
    if (io) { io.disconnect(); io = null; }
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
    const items = [{ key: 'next', label: '下一首播放', icon: I.next2 }, { key: 'pl', label: '加入歌單…', icon: I.playlist }];
    if (ctx && ctx.pl) items.push({ key: 'unpl', label: '移出這個歌單', icon: I.close });
    items.push({ key: 'info', label: '歌曲資訊', icon: I.info }, { key: 'del', label: '從歌庫刪除', icon: I.trash, danger: true });
    const k = await R.ui.menu(items, { title: t.title, sub: t.artist || '' });
    if (k === 'next') { R.player.playNext(id); R.toast('會在這首之後播放'); }
    else if (k === 'pl') addToPlaylist([id]);
    else if (k === 'unpl') { const p = R.lib.pl.get(ctx.pl); if (p) { p.ids = p.ids.filter((x) => x !== id); await R.lib.pl.save(p); } }
    else if (k === 'info') {
      const an = t.an === 1 ? `${t.bpm ? Math.round(t.bpm) + ' BPM' : '完成'}` : t.an === -1 ? '這個格式讀不出節奏（畫面用模擬律動）' : t.an === 2 ? '太長了，跳過（畫面用模擬律動）' : '分析中…';
      R.ui.info(t.title, [['歌手', t.artist || '—'], ['專輯', t.album || '—'], ['長度', t.duration ? fmtTime(t.duration) : '—'], ['節奏', an], ['格式', (t.type || '').replace('audio/', '').toUpperCase() + (t.warn ? '（這台裝置可能播不了）' : '')], ['大小', (t.size / 1048576).toFixed(1) + ' MB'], ['檔名', t.name || '—'], ['播放', (t.plays || 0) + ' 次']]);
    } else if (k === 'del') {
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
      if (a === 'import' || a === 'folder') { R.app.pickFiles(a === 'folder'); return; }
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
    if (st.view && st.view.type === 'pick') {
      const all = R.lib.list(null, st.q); const p = R.lib.pl.get(st.view.id);
      sc.innerHTML = all.map((t) => `<div class="row${st.pick.has(t.id) ? ' sel' : ''}" data-pick="${t.id}" style="grid-template-columns:26px 48px 1fr" role="button" tabindex="0"><div class="r-chk">${I.check}</div><div class="r-art" data-art="${t.id}"></div><div class="r-tx"><div class="r-t">${esc(t.title)}</div><div class="r-s">${p && p.ids.includes(t.id) ? '已在歌單裡' : sub(t)}</div></div></div>`).join('');
    } else {
      const all = R.lib.list(null, st.q);
      sc.innerHTML = all.length ? all.map((t) => row(t, { check: !!st.sel })).join('') : `<div class="blank">找不到「${esc(st.q)}」</div>`;
    }
    arts(b);
  });

  return { open, trackMenu, addToPlaylist };
})();
