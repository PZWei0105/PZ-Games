/* ───────── 畫面：書房、書頁、抽屜、說書現場 ───────── */
const UI = (() => {
  const lib = $('#lib'), bookv = $('#bookv'), sheet = $('#sheet'), sheetBody = $('#sheetBody'), mini = $('#mini'), pop = $('#pop'), gbar = $('#gbar'), menu = $('#menu');
  let state = { v: 'lib' }, sheetKind = '', popT = 0, lastNarr = { active: false };
  let gsel = Store.get('gsel', '');                         // 書房最下面選的分類（'' 是全部）
  let bvTab = 'toc', navTab = 'toc', navBook = '';          // 書頁、閱讀器抽屜各自停在哪個分頁
  const qs = { id: '', q: '', res: null, run: 0 };          // 書內搜尋：記住上一次找的
  let share = null, menuPick = null, menuFrom = null, skipMenu = null, pendingCard = null, qT = 0;
  const chName = (c) => (c.label ? c.label + '　' : '') + (c.name || '');
  const unitOf = (b) => (b.remote ? '回' : '章');
  const RATES = [0.8, 1, 1.15, 1.3, 1.5, 1.75, 2];
  const SORTS = [['upd', '最近更新'], ['read', '最近讀過'], ['old', '最早上架']];
  const RECAP_GAP = 36 * 3600e3;                            // 隔了一天半以上再翻開：先給前情提要
  const Q_HINT = '輸入人名、地名或一句話，從第一回找到最後一回。';
  const SAMPLE = '夜裡的燈芯又短了一截。他把書翻到上回停下的那一頁，指尖還沒碰到紙，窗外的雨就下大了。';
  const pressed = (on) => ' aria-pressed="' + (on ? 'true' : 'false') + '"';

  /* ── 封面 ── */
  function coverHTML(b, extra) {
    const fresh = Lib.freshSet(b.id).length, pct = Prog.pct(b);
    return '<span class="cover" data-cv="' + esc(b.id) + '">' + Cover.svg(b, { k: extra || '' })
      + (fresh ? '<span class="tag">新</span>' : '')
      + (pct > 0.004 ? '<span class="pg"><i style="width:' + Math.round(pct * 100) + '%"></i></span>' : '') + '</span>';
  }
  function hydrateCovers(root) {
    $$('.cover[data-cv]', root).forEach((c) => {
      const b = Lib.find(c.dataset.cv);
      if (!b || !b.cover || !b.cover.img) return;
      Lib.coverURL(b).then((u) => { if (!u || !c.isConnected) return; const old = c.querySelector('svg'); if (old) old.outerHTML = Cover.svg(b, { img: u, k: 'i' }); });
    });
  }

  /* ── 書房：排序 ── */
  function sortOf(sh) { const v = Store.get('sort', {})[sh]; return SORTS.some((s) => s[0] === v) ? v : 'upd'; }
  const sortName = (v) => (SORTS.find((s) => s[0] === v) || SORTS[0])[1];
  function sortBooks(list, how) {
    const key = how === 'read' ? (b) => [Lib.readAt(b), Lib.updated(b)] : how === 'old' ? (b) => [-Lib.created(b), 0] : (b) => [Lib.updated(b), 0];
    return list.map((b) => [b, key(b)]).sort((x, y) => (y[1][0] - x[1][0]) || (y[1][1] - x[1][1]) || x[0].title.localeCompare(y[0].title, 'zh-Hant')).map((x) => x[0]);
  }
  /* 書卡下面那一行時間：照排序方式說最相關的那一件事 */
  function timeLine(b, how) {
    if (how === 'read') { const t = Lib.readAt(b); return t ? fmtAgo(t) + '讀過' : '還沒翻開'; }
    if (!b.remote) return b.added ? fmtDate(b.added) + '收進來' : '';
    const t = how === 'old' ? Lib.created(b) : Lib.updated(b);
    return t ? fmtDate(t) + (how === 'old' ? '上架' : '更新') : '';
  }
  function card(b, how) {
    const i = Prog.index(b), fresh = Lib.freshSet(b.id).length;
    const meta = fresh ? '<b>新到 ' + fresh + ' 回</b>' : i >= 0 ? '讀到 ' + esc(b.chapters[i].label || b.chapters[i].name || ('第 ' + (i + 1) + ' 章')) : b.chapters.length + ' ' + unitOf(b);
    return '<button type="button" class="bk" data-act="book" data-id="' + esc(b.id) + '">' + coverHTML(b) + '<span class="bk-t">' + esc(b.title) + '</span><span class="bk-m">' + meta + '</span><span class="bk-d">' + esc(timeLine(b, how)) + '</span></button>';
  }
  function shelfHTML(key, title, sub, list, tail) {
    const how = sortOf(key);
    return '<section class="shelf" data-shelf="' + key + '"><div class="shelf-h"><h2>' + title + '</h2><span class="sh-sub">' + sub + '</span>'
      + (list.length > 1 ? '<button type="button" class="sortb" data-act="sort" data-shelf="' + key + '" aria-haspopup="menu" aria-label="排序：' + sortName(how) + '">' + sortName(how) + ICON.sort + '</button>' : '')
      + '</div><div class="grid">' + sortBooks(list, how).map((b) => card(b, how)).join('') + (tail || '') + '</div></section>';
  }

  /* ── 書房 ── */
  function renderLib() {
    const all = Lib.all(), gl = Genre.list(all);
    if (gsel && !gl.some((x) => x.g === gsel)) gsel = '';
    const books = gsel ? all.filter((b) => Genre.of(b) === gsel) : all;
    const serial = books.filter((b) => b.remote), mine = books.filter((b) => !b.remote);
    // 上回說到：這個分類裡最近讀的那一本
    let hero = null, best = 0;
    books.forEach((b) => { const t = Lib.readAt(b); if (b.chapters.length && t > best) { best = t; hero = b; } });
    const first = !hero && (serial.find((b) => b.chapters.length) || mine.find((b) => b.chapters.length));
    let h = '<div class="wrap"><header class="lib-top"><div class="brand"><span class="brand-seal" aria-hidden="true">回</span><h1>下回分解</h1></div>'
      + '<div class="lib-acts"><button type="button" class="ib" data-act="import" aria-label="匯入電子書">' + ICON.plus + '</button><button type="button" class="ib" data-act="settings" aria-label="設定">' + ICON.gear + '</button></div></header>';
    if (hero) {
      const p = Prog.get(hero.id), i = Math.max(0, Prog.index(hero)), ch = hero.chapters[i], pct = Prog.pct(hero), fresh = Lib.freshSet(hero.id).length;
      const canHear = Narrator.hasTrack(hero, i) || Narrator.canSpeak();
      h += '<section class="hero" data-id="' + esc(hero.id) + '"><button type="button" class="hero-cover" data-act="continue" aria-label="接著讀《' + esc(hero.title) + '》">' + coverHTML(hero, 'h') + '</button><div>'
        + '<p class="hero-kicker">痞子葳，上回說到</p><h2>' + esc(hero.title) + '</h2><p class="hero-ch">' + esc(chName(ch)) + (fresh ? '　<b style="color:var(--gilt-2)">新到 ' + fresh + ' 回</b>' : '') + '</p>'
        + (p && p.x ? '<blockquote class="hero-x">' + esc(p.x) + '……</blockquote>' : '')
        + '<div class="hero-prog"><span class="bar"><i style="width:' + Math.round(pct * 100) + '%"></i></span><span>全書 ' + Math.round(pct * 100) + '%　' + esc(fmtAgo(p.t)) + '讀的</span></div>'
        + '<div class="hero-btns"><button type="button" class="btn gilt" data-act="continue">接著讀</button>' + (canHear ? '<button type="button" class="btn" data-act="listen">' + ICON.ear + '聽說書</button>' : '') + '</div></div></section>';
    } else if (first) {
      h += '<section class="hero" data-id="' + esc(first.id) + '"><button type="button" class="hero-cover" data-act="continue" aria-label="開始讀《' + esc(first.title) + '》">' + coverHTML(first, 'h') + '</button><div>'
        + '<p class="hero-kicker">痞子葳，今晚從這本開始</p><h2>' + esc(first.title) + '</h2><p class="hero-ch">' + first.chapters.length + ' ' + unitOf(first) + '　' + fmtCount(Lib.total(first)) + '</p>'
        + (first.blurb ? '<blockquote class="hero-x">' + esc(first.blurb) + '</blockquote>' : '')
        + '<div class="hero-btns"><button type="button" class="btn gilt" data-act="continue">開始讀</button></div></div></section>';
    } else if (!all.length) {
      h += '<section class="hero blank"><div><h2>書房還是空的</h2><p>連載小說寫好一回就會自己上架；也可以把手邊的 EPUB、TXT 電子書收進來。</p><div class="hero-btns"><button type="button" class="btn gilt" data-act="import">' + ICON.plus + '匯入電子書</button></div></div></section>';
    }
    if (serial.length) h += shelfHTML('serial', '連載', '寫好一回，上架一回', serial);
    if (!gsel || mine.length) {
      const tail = gsel ? '' : '<button type="button" class="bk add" data-act="import" aria-label="匯入電子書"><span class="cover">' + ICON.plus + '</span><span class="bk-t">匯入電子書</span><span class="bk-m">從這台裝置挑檔案</span></button>';
      h += shelfHTML('mine', '我的藏書', mine.length ? mine.length + ' 本，存在這台裝置' : 'EPUB、TXT、Markdown', mine, tail);
    }
    h += '</div>';
    lib.innerHTML = h; hydrateCovers(lib); renderGbar(gl, all);
  }

  /* ── 書房最下面的分頁：照分類挑書 ── */
  function renderGbar(gl, all) {
    all = all || Lib.all(); gl = gl || Genre.list(all);
    const on = state.v === 'lib' && all.length > 0;
    gbar.hidden = !on; document.body.classList.toggle('gbar-on', on);
    if (!on) return;
    if (gsel && !gl.some((x) => x.g === gsel)) gsel = '';
    const freshIn = (g) => all.some((b) => (!g || Genre.of(b) === g) && Lib.freshSet(b.id).length > 0);
    const tab = (g, label, n) => '<button type="button" class="gb" role="tab" data-act="genre" data-g="' + esc(g) + '" aria-selected="' + (gsel === g) + '"><span>' + esc(label) + (freshIn(g) ? '<b class="dot" title="有新的一回"></b>' : '') + '</span><small>' + n + ' 本</small></button>';
    const html = '<div class="gb-in" role="tablist" aria-label="分類">' + tab('', '全部', all.length) + gl.map((x) => tab(x.g, x.g, x.n)).join('') + '</div>';
    if (gbar.dataset.h !== html) { const x = gbar.firstElementChild ? gbar.firstElementChild.scrollLeft : 0; gbar.innerHTML = html; gbar.dataset.h = html; gbar.firstElementChild.scrollLeft = x; }
    const cur = $('.gb[aria-selected="true"]', gbar), row = gbar.firstElementChild;
    if (cur && row && row.scrollWidth > row.clientWidth) { const l = cur.offsetLeft, r = l + cur.offsetWidth; if (l < row.scrollLeft) row.scrollLeft = l - 12; else if (r > row.scrollLeft + row.clientWidth) row.scrollLeft = r - row.clientWidth + 12; }
  }

  /* ── 小選單（排序） ── */
  function openMenu(anchor, items, pick) {
    menuPick = pick; menuFrom = anchor;
    menu.innerHTML = items.map((x) => '<button type="button" role="menuitemradio" aria-checked="' + !!x.on + '" data-act="menu-pick" data-v="' + esc(x.v) + '">' + ICON.check + '<span>' + esc(x.t) + '</span></button>').join('');
    menu.hidden = false;
    const r = anchor.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
    let top = r.bottom + 6; if (top + mh > innerHeight - 10) top = Math.max(10, r.top - mh - 6);
    menu.style.left = clamp(r.right - mw, 10, innerWidth - mw - 10) + 'px'; menu.style.top = top + 'px';
    const on = $('[aria-checked="true"]', menu); if (on) on.focus({ preventScroll: true });
  }
  function closeMenu() { if (menu.hidden) return; menu.hidden = true; menuPick = null; menuFrom = null; }

  /* ── 書頁 ── */
  function tocHTML(b, withCur) {
    const p = Prog.get(b.id), done = Prog.done(b.id), fresh = Lib.freshSet(b.id);
    return '<ol class="toc">' + b.chapters.map((c, i) => {
      const key = Lib.ck(b, c, i), cur = p && p.ck === key;
      return '<li><button type="button" class="row' + (done.indexOf(key) >= 0 ? ' done' : '') + (cur && withCur !== false ? ' cur' : '') + '" data-act="read" data-id="' + esc(b.id) + '" data-i="' + i + '">'
        + '<span class="r-no">' + esc(c.label || String(i + 1)) + '</span><span class="r-nm">' + esc(c.name || (c.label ? '' : '第 ' + (i + 1) + ' 章')) + (fresh.indexOf(key) >= 0 ? '<span class="new">新</span>' : '') + '</span>'
        + '<span class="r-meta">' + (Narrator.hasTrack(b, i) ? ICON.ear : '') + (done.indexOf(key) >= 0 ? '讀過了' : cur ? Math.round((p.f || 0) * 100) + '%' : fmtMin(c.chars || 0)) + '</span></button></li>';
    }).join('') + '</ol>';
  }
  function tabsHTML(b, tab, ctx) {
    const n = Marks.sorted(b).length, t = [['toc', '目錄'], ['marks', '書籤' + (n ? '<i>' + n + '</i>' : '')], ['search', '搜尋']];
    if (b.remote && b.recaps) t.push(['recap', '提要']);
    return '<div class="tabs" role="tablist">' + t.map((x) => '<button type="button" class="tab" role="tab" data-act="tab" data-ctx="' + ctx + '" data-tab="' + x[0] + '" aria-selected="' + (x[0] === tab) + '">' + x[1] + '</button>').join('') + '</div>';
  }
  function panelHTML(b, tab) {
    if (tab === 'marks') return marksHTML(b);
    if (tab === 'search') return searchHTML(b);
    if (tab === 'recap') return '<div class="rcl-wrap"><p class="empty">正在翻提要……</p></div>';
    return b.chapters.length ? tocHTML(b) : '<p class="empty">第一回還在路上。</p>';
  }
  function afterPanel(b, tab, ctx, panel) {
    if (tab === 'recap') fillRecaps(b, panel, ctx);
    else if (tab === 'search' && qs.id === b.id && qs.q) { if (qs.res) paintSearch(b, qs.res, qs.q, panel); else runSearch(b, qs.q, panel); }
    else if (tab === 'toc' && ctx === 'nav') { const c = $('.row.cur', panel); if (c) c.scrollIntoView({ block: 'center' }); }
  }
  function setTab(ctx, tab, focus) {
    const root = ctx === 'nav' ? sheetBody : bookv, b = ctx === 'nav' ? Reader.book : Lib.find(bookv.dataset.id);
    if (!b) return;
    if (tab === 'recap' && !(b.remote && b.recaps)) tab = 'toc';
    if (ctx === 'nav') navTab = tab; else bvTab = tab;
    const tabs = $('.tabs', root), panel = $('.tabp', root);
    if (!tabs || !panel) return;
    tabs.outerHTML = tabsHTML(b, tab, ctx);
    panel.innerHTML = panelHTML(b, tab); afterPanel(b, tab, ctx, panel);
    if (focus && tab === 'search') { const q = $('.q', panel); if (q && !q.value) q.focus(); }
  }
  function convRow(b) {
    if (b.remote || !b.simp) return '';
    const m = b.conv || '';
    return '<div class="conv"><h3>這是簡體書</h3><div class="seg">' + [['', '原文'], ['tw', '繁體'], ['twp', '臺灣用語']].map((t) => '<button type="button" data-act="conv" data-id="' + esc(b.id) + '" data-v="' + t[0] + '"' + pressed(m === t[0]) + '>' + t[1] + '</button>').join('') + '</div>'
      + '<p class="note">匯入時已經自動轉成繁體。「臺灣用語」再把软件換成軟體、信息換成資訊；偶爾會換過頭，看不順就切回「繁體」。</p></div>';
  }
  function renderBook(id) {
    const b = Lib.find(id);
    if (!b) { go({ v: 'lib' }, true); return; }
    if (bookv.dataset.id !== id) bvTab = 'toc';
    if (bvTab === 'recap' && !(b.remote && b.recaps)) bvTab = 'toc';
    const i = Prog.index(b), tot = Lib.total(b), mins = Math.max(1, Math.round(tot / 450)), tracks = b.chapters.filter((c, j) => Narrator.hasTrack(b, j)).length;
    const canHear = b.chapters.length && (Narrator.hasTrack(b, Math.max(0, i)) || Narrator.canSpeak());
    bookv.innerHTML = '<div class="wrap"><div class="bv-top"><button type="button" class="ib" data-act="back" aria-label="回書房">' + ICON.back + '</button>'
      + (b.remote ? '' : '<button type="button" class="ib" data-act="del-book" data-id="' + esc(b.id) + '" aria-label="把這本書移出藏書">' + ICON.trash + '</button>') + '</div>'
      + '<div class="bv-head"><div class="bv-cover">' + coverHTML(b, 'b') + '</div><div><h1>' + esc(b.title) + '</h1>' + (b.author ? '<p class="bv-by">' + esc(b.author) + '</p>' : '')
      + '<div class="bv-tags">' + (b.remote && b.status ? '<span class="state">' + esc(b.status) + '</span>' : '')
      + '<button type="button" class="gchip" data-act="genre-pick" data-id="' + esc(b.id) + '" aria-label="分類：' + esc(Genre.of(b)) + '，點一下可以改">' + ICON.tag + esc(Genre.of(b)) + '</button></div>'
      + '<ul class="bv-stats"><li><b>' + b.chapters.length + '</b>' + unitOf(b) + '</li><li><b>' + (tot >= 10000 ? (tot / 10000).toFixed(1).replace(/\.0$/, '') + ' 萬' : tot) + '</b>字</li><li><b>' + (mins >= 60 ? (mins / 60).toFixed(1).replace(/\.0$/, '') : mins) + '</b>' + (mins >= 60 ? '小時讀完' : '分鐘讀完') + '</li>'
      + (tracks ? '<li><b>' + tracks + '</b>回有說書</li>' : '') + '</ul></div></div>'
      + '<div class="bv-btns"><button type="button" class="btn gilt" data-act="continue" data-id="' + esc(b.id) + '">' + (i >= 0 ? '接著讀' : '開始讀') + '</button>' + (canHear ? '<button type="button" class="btn" data-act="listen" data-id="' + esc(b.id) + '">' + ICON.ear + '聽說書</button>' : '') + '</div>'
      + '<section class="recap-card" id="bvRecap" hidden></section>'
      + (b.blurb ? '<p class="bv-blurb">' + esc(b.blurb) + '</p>' : '')
      + convRow(b)
      + tabsHTML(b, bvTab, 'bv') + '<div class="tabp">' + panelHTML(b, bvTab) + '</div></div>';
    bookv.dataset.id = id; hydrateCovers(bookv);
    afterPanel(b, bvTab, 'bv', $('.tabp', bookv));
    fillRecapCard(b);
  }

  /* ── 前情提要 ── */
  /* 該給哪一回的提要：這一回讀完了就是這一回，不然是上一回（不先劇透還沒讀的） */
  async function recapNow(b) {
    if (!b.remote || !b.recaps) return null;
    const i = Prog.index(b); if (i < 0) return null;
    const j = Prog.done(b.id).indexOf(Lib.ck(b, b.chapters[i], i)) >= 0 ? i : i - 1;
    if (j < 0) return null;
    const rc = await Lib.recaps(b), c = b.chapters[j];
    return rc && rc[c.n] ? { c, t: rc[c.n] } : null;
  }
  async function fillRecapCard(b) {
    const box = $('#bvRecap', bookv); if (!box) return;
    const r = await recapNow(b);
    if (!r || !box.isConnected) return;
    box.innerHTML = '<p class="rk">前情提要</p><h3><span>' + esc(r.c.label || '') + '</span>' + esc(r.c.name || '') + '</h3><p class="rx">' + esc(r.t) + '</p>'
      + '<button type="button" class="rc-all" data-act="tab" data-ctx="bv" data-tab="recap" data-jump="1">看前面每一回的提要</button>';
    box.hidden = false;
  }
  async function fillRecaps(b, panel, ctx) {
    const box = $('.rcl-wrap', panel); if (!box) return;
    const rc = await Lib.recaps(b);
    if (!box.isConnected) return;
    if (!rc) { box.innerHTML = '<p class="empty">提要下載不下來，連上網路再試一次。</p>'; return; }
    const i = Prog.index(b), done = Prog.done(b.id), rows = [];
    let hidden = 0;
    b.chapters.forEach((c, j) => { const t = rc[c.n]; if (!t) return; if (j < i || done.indexOf(Lib.ck(b, c, j)) >= 0) rows.push([j, c, t]); else hidden++; });
    let h = rows.length
      ? '<ol class="rcl">' + rows.map(([j, c, t]) => '<li><button type="button" class="rc-h" data-act="read" data-id="' + esc(b.id) + '" data-i="' + j + '"><span>' + esc(c.label || '') + '</span>' + esc(c.name || '') + '</button><p>' + esc(t) + '</p></li>').join('') + '</ol>'
      : '<p class="empty">' + (i < 0 ? '還沒開始讀。<br>' : '') + '讀完一回，這裡就會有那一回的提要。</p>';
    if (hidden) h += '<p class="note rc-more">後面還有 ' + hidden + ' 回的提要，讀到了才會出現，不先劇透。</p>';
    box.innerHTML = h;
    if (ctx === 'nav' && rows.length > 1) { const last = $$('.rcl li', box).pop(); if (last) last.scrollIntoView({ block: 'end' }); }
  }
  /* 閱讀器上的提要卡（久沒讀才出現） */
  function showCard(b, r) {
    const box = $('#rdCard');
    box.innerHTML = '<div class="rc-box" data-act="noop" role="dialog" aria-modal="true" aria-label="前情提要"><span class="rc-seal" aria-hidden="true">前情</span><p class="rk">' + esc(b.title) + '　前情提要</p>'
      + '<h3><span>' + esc(r.c.label || '') + '</span>' + esc(r.c.name || '') + '</h3><p class="rx">' + esc(r.t) + '</p>'
      + '<button type="button" class="btn gilt" data-act="card-close">接著讀</button><button type="button" class="rc-off" data-act="recap-off">以後不用自動跳出來</button></div>';
    box.hidden = false; Reader.setChrome(false);
    const btn = $('.btn', box); if (btn) btn.focus({ preventScroll: true });
  }
  function closeCard() { const box = $('#rdCard'); box.hidden = true; box.innerHTML = ''; }

  /* ── 第一次翻開書：怎麼翻、怎麼叫出工具列 ── */
  function showCoach() {
    const c = $('#coach'), V = !!Settings.vert, z = (b, s, cls, arrow) => '<div class="co-z' + (cls ? ' ' + cls : '') + '">' + (arrow ? '<i class="co-a" aria-hidden="true">' + arrow + '</i>' : '') + '<b>' + b + '</b><small>' + s + '</small></div>';
    const mid = z(Reader.paged() ? '叫出工具列' : '上下滑動閱讀', (Reader.paged() ? '點中間' : '點一下叫出工具列') + '<br>Aa 字體、目錄<br>書籤、搜尋', 'co-m');
    const keys = window.matchMedia && matchMedia('(pointer: fine)').matches ? '<p class="co-k">鍵盤：' + (V ? '← 下一頁、→ 上一頁' : '→ 下一頁、← 上一頁') + '，Enter 叫出工具列</p>' : '';
    c.innerHTML = (Reader.paged() ? '<div class="co-zones">' + z(V ? '下一頁' : '上一頁', '點這一邊<br>或往右滑', '', '‹') + mid + z(V ? '上一頁' : '下一頁', '點這一邊<br>或往左滑', '', '›') + '</div>' : '<div class="co-zones one">' + mid + '</div>')
      + '<div class="co-foot"><p>' + ICON.ribbon + '長按一句話：從那裡說書、夾書籤、複製</p>' + keys + '<button type="button" class="btn gilt" data-act="coach-ok">知道了</button></div>';
    c.dataset.act = 'coach-ok'; c.hidden = false; Reader.setChrome(false);
  }
  function dismissCoach() {
    const c = $('#coach'); if (c.hidden) return;
    c.hidden = true; c.innerHTML = ''; Store.set('coach', 1);
    const p = pendingCard; pendingCard = null;
    if (p && Reader.isOpen()) showCard(Reader.book, p);
  }
  async function afterOpen(b, gap) {
    let r = null;
    if (gap && Settings.recap && Date.now() - gap > RECAP_GAP) r = await recapNow(b);
    if (!Reader.isOpen() || !Reader.book || Reader.book.id !== b.id) return;
    if (!Store.get('coach', 0)) { pendingCard = r; showCoach(); } else if (r) showCard(b, r);
  }

  /* ── 書籤 ── */
  function marksHTML(b) {
    const list = Marks.sorted(b);
    if (!list.length) return '<p class="empty">還沒有書籤。<br>讀的時候點上方的緞帶，或長按一句話，就能把那一頁夾起來。</p>';
    return '<ol class="bml">' + list.map((m) => '<li><button type="button" class="bm" data-act="bm-go" data-id="' + esc(b.id) + '" data-t="' + m.t + '"><span class="bm-ch">' + esc(chName(b.chapters[m.ci]) || '第 ' + (m.ci + 1) + ' 章') + '</span><span class="bm-x">' + esc(m.x || '') + '……</span><span class="bm-t">' + esc(fmtAgo(m.t)) + '夾的</span></button>'
      + '<button type="button" class="ib bm-del" data-act="bm-del" data-id="' + esc(b.id) + '" data-t="' + m.t + '" aria-label="拿掉這個書籤">' + ICON.close + '</button></li>').join('') + '</ol>';
  }
  function paintMarkBtn() {
    const btn = $('[data-act="rd-mark"]'); if (!btn || !Reader.book) return;
    const on = Reader.pageMarks().length > 0;
    btn.innerHTML = on ? ICON.ribbonOn : ICON.ribbon; btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.setAttribute('aria-label', on ? '拿掉這一頁的書籤' : '這一頁夾書籤');
  }

  /* ── 書內搜尋 ── */
  function searchHTML(b) {
    const q = qs.id === b.id ? qs.q : '';
    return '<label class="qbox">' + ICON.search + '<input class="q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="找這本書裡的字句" aria-label="找這本書裡的字句" value="' + esc(q) + '" data-id="' + esc(b.id) + '">'
      + '<button type="button" class="qx" data-act="q-clear" aria-label="清掉"' + (q ? '' : ' hidden') + '>' + ICON.close + '</button></label>'
      + '<p class="qstat">' + (q ? '' : Q_HINT) + '</p><ol class="qres"></ol>';
  }
  function onQuery(inp) {
    const b = Lib.find(inp.dataset.id), root = inp.closest('.tabp'); if (!b || !root) return;
    const x = $('.qx', root); if (x) x.hidden = !inp.value;
    const q = inp.value.trim();
    clearTimeout(qT); qT = setTimeout(() => runSearch(b, q, root), q.length > 1 ? 220 : 420);
  }
  async function runSearch(b, q, root) {
    const my = ++qs.run; qs.id = b.id; qs.q = q; qs.res = null;
    const st = $('.qstat', root), list = $('.qres', root); if (!st || !list) return;
    if (!q) { st.textContent = Q_HINT; list.innerHTML = ''; return; }
    st.textContent = '正在找……';
    const res = await Lib.search(b, q, (k, n, hits) => { if (my === qs.run && st.isConnected) st.textContent = '正在找……第 ' + k + ' / ' + n + ' ' + unitOf(b) + '，找到 ' + hits + ' 處'; }, () => my !== qs.run || !st.isConnected);
    if (!res || my !== qs.run || !st.isConnected) return;
    qs.res = res; paintSearch(b, res, q, root);
  }
  function paintSearch(b, res, q, root) {
    const st = $('.qstat', root), list = $('.qres', root); if (!st || !list) return;
    if (!res.hits.length) { st.textContent = '整本書裡找不到「' + q + '」。'; list.innerHTML = ''; return; }
    const per = new Map(); res.hits.forEach((x) => per.set(x.ci, (per.get(x.ci) || 0) + 1));
    st.textContent = res.more ? '找到超過 ' + res.hits.length + ' 處，先列出前 ' + res.hits.length + ' 處；換個長一點的詞會更準。' : '找到 ' + res.hits.length + ' 處，在 ' + per.size + ' ' + unitOf(b) + '裡。';
    let h = '', last = -1;
    res.hits.forEach((x, k) => {
      if (x.ci !== last) { last = x.ci; h += '<li class="qg"><span>' + esc(chName(b.chapters[x.ci]) || '第 ' + (x.ci + 1) + ' 章') + '</span><i>' + per.get(x.ci) + ' 處</i></li>'; }
      h += '<li><button type="button" class="qhit" data-act="q-go" data-k="' + k + '">' + (x.cut ? '…' : '') + esc(x.pre) + '<mark>' + esc(x.hit) + '</mark>' + esc(x.post) + '</button></li>';
    });
    list.innerHTML = h;
  }

  /* 跳到某一回的某一句（書籤、搜尋結果） */
  async function jump(b, ci, a, len) {
    if (sheetKind === 'nav') {
      closeSheet(); Reader.setChrome(false);
      const ok = await Reader.open(b, ci, a, { keep: true });
      if (ok && len) Reader.flash(a, len);
    } else {
      const ok = await openBook(b, ci, a, $('.bv-cover .cover', bookv));
      if (ok) { if (len) Reader.flash(a, len); afterOpen(b, 0); }
    }
  }

  /* ── 剪貼簿、分享 ── */
  function legacyCopy(text) {
    const ta = el('textarea', { readonly: '', 'aria-hidden': 'true', style: 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;font-size:16px' });
    ta.value = text; document.body.appendChild(ta);
    ta.select(); try { ta.setSelectionRange(0, text.length); } catch (e) {}
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return ok;
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, () => legacyCopy(text));
    return Promise.resolve(legacyCopy(text));
  }
  function copyOut(text, msg) { return copyText(text).then((ok) => { toast(ok ? msg : '這個瀏覽器不讓網頁用剪貼簿，複製不了', { kind: ok ? '' : 'bad', ms: ok ? 2400 : 4500 }); return ok; }); }
  function openShare() {
    const b = Reader.book; if (!b) return;
    const i = Reader.ci, c = b.chapters[i];
    share = { b, i, text: null };
    const me = share;
    Lib.chapterText(b, i).then((t) => { me.text = t; }).catch(() => {});      // 先準備好：手機上複製、分享要在按下去的當下完成
    openSheet('share', '<h2>分享這一回</h2><p class="sh-t"><b>《' + esc(b.title) + '》</b>' + esc(chName(c)) + (c.chars ? '<small>' + fmtCount(c.chars) + '</small>' : '') + '</p>'
      + '<div class="sh-btns"><button type="button" class="btn gilt" data-act="share-copy">' + ICON.copy + '複製這一回的全文</button>'
      + (navigator.share ? '<button type="button" class="btn" data-act="share-send">' + ICON.share + '傳給別人…</button>' : '') + '</div>'
      + '<button type="button" class="btn quiet sh-mini" data-act="share-title">只複製書名和回目</button>'
      + '<p class="note">複製下來的是這一回的純文字，可以貼到 LINE、備忘錄或筆記 App。</p>');
  }
  async function shareSend() {
    if (!share || !navigator.share) return;
    const c = share.b.chapters[share.i], title = '《' + share.b.title + '》' + chName(c);
    let text = share.text;
    if (!text) { try { text = await Lib.chapterText(share.b, share.i); } catch (e) { return; } }
    try { await navigator.share({ title, text }); closeSheet(); }
    catch (e) { if (!e || e.name !== 'AbortError') copyOut(text, '這台裝置不能直接分享，已經改成複製全文'); }
  }

  /* ── 換畫面（手機的返回鍵也走這裡） ── */
  function show(s) {
    state = s;
    closeMenu();
    if (s.v !== 'read' && Reader.isOpen()) Reader.close();
    lib.hidden = s.v !== 'lib' && s.v !== 'read';
    bookv.hidden = s.v !== 'book';
    if (s.v === 'lib') renderLib();
    if (s.v === 'book') { const same = bookv.dataset.id === s.id, y = bookv.scrollTop; renderBook(s.id); bookv.scrollTop = same ? y : 0; }
    if (s.v === 'read') { if (s.from === 'book') { lib.hidden = true; bookv.hidden = false; } }
    renderGbar(); syncMini();
  }
  function go(s, replace) { try { history[replace ? 'replaceState' : 'pushState'](s, ''); } catch (e) {} show(s); }
  window.addEventListener('popstate', (e) => {
    if (!sheet.hidden) { closeSheet(); try { history.pushState(state, ''); } catch (x) {} return; }
    show(e.state && e.state.v ? e.state : { v: 'lib' });
  });
  const back = () => { if (history.state && history.state.v && history.state.v !== 'lib') history.back(); else go({ v: 'lib' }, true); };

  /* ── 翻開一本書 ── */
  async function openBook(b, i, anchor, fromEl) {
    if (!b || !b.chapters.length) return false;
    Sound.unlock(); closeMenu();
    if (navBook !== b.id) { navBook = b.id; navTab = 'toc'; }
    go({ v: 'read', id: b.id, from: state.v === 'book' ? 'book' : 'lib' });
    const anim = fromEl && !REDUCED && fromEl.getBoundingClientRect().width > 20 ? opening(b, fromEl) : null;
    const ok = await Reader.open(b, i, anchor);
    if (anim) await anim;
    return ok;
  }
  function resume(b, fromEl) {
    const p = Prog.get(b.id), i = Prog.index(b), gap = p ? p.t : 0;     // 上次讀的時間要在開書之前記下來（開書就會更新）
    return openBook(b, i >= 0 ? i : 0, i >= 0 && p ? { b: p.b, s: p.s } : null, fromEl).then((ok) => ok && afterOpen(b, gap));
  }
  async function opening(b, fromEl) {
    const ov = $('#opening'), r = fromEl.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    const th = Math.min(vh * .62, vw * .78 * 1.5), tw = th / 1.5, sc = tw / r.width;
    const paper = { night: '#131a25', paper: '#e9dfc8', black: '#000' }[Settings.theme] || '#131a25';
    ov.hidden = false;
    const tx = (vw - tw) / 2, ty = (vh - th) / 2, from = 'translate(' + (r.left - tx) + 'px,' + (r.top - ty) + 'px) scale(' + (1 / sc) + ')';
    ov.innerHTML = '<div class="op-bg"></div><div class="op-book" style="left:' + tx + 'px;top:' + ty + 'px;width:' + tw + 'px;height:' + th + 'px;transform-origin:0 0;transform:' + from + '"><div class="op-page" style="background:' + paper + '"></div><div class="op-cover">' + Cover.svg(b, { k: 'op' }) + '</div></div>';
    const bk = $('.op-book', ov), cv = $('.op-cover', ov), bg = $('.op-bg', ov);
    try {
      bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, fill: 'forwards' });
      const mid = 'none';
      await bk.animate([{ transform: from }, { transform: mid }], { duration: 400, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).finished;
      Sound.open();
      cv.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(118deg)' }], { duration: 560, easing: 'cubic-bezier(.5,0,.25,1)', fill: 'forwards' });
      await sleep(250);
      const full = 'translate(' + (-tx) + 'px,' + (-ty) + 'px) scale(' + (vw / tw) + ',' + (vh / th) + ')';
      await bk.animate([{ transform: mid }, { transform: full }], { duration: 380, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' }).finished;
      await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).finished;
    } catch (e) {}
    ov.hidden = true; ov.innerHTML = ''; ov.getAnimations && ov.getAnimations().forEach((a) => a.cancel());
  }

  /* ── 抽屜 ── */
  function openSheet(kind, html) { closeMenu(); hidePop(); sheetKind = kind; sheetBody.innerHTML = html; sheet.hidden = false; document.body.classList.add('sheet-open'); sheetBody.scrollTop = 0; $('.sheet-panel', sheet).focus({ preventScroll: true }); }
  function closeSheet() { sheet.hidden = true; sheetKind = ''; sheetBody.innerHTML = ''; share = null; document.body.classList.remove('sheet-open'); }
  function repaintLook() { if (sheetKind !== 'look') return; const y = sheetBody.scrollTop; sheetBody.innerHTML = lookHTML(); sheetBody.scrollTop = y; paintVeilPreview(); }
  function lookHTML() {
    const S = Settings, V = !!S.vert, vl = Reader.veilOf();
    const bright = Math.round(clamp(+S.bright || 1, .3, 1) * 100), warm = Math.round(clamp(+S.warm || 0, 0, 1) * 100);
    const seg = (k, opts, cur, extra, cls) => '<div class="seg' + (cls ? ' ' + cls : '') + '"' + (extra || '') + '>' + opts.map((t) => '<button type="button" data-act="set" data-k="' + k + '" data-v="' + t[0] + '"' + pressed(cur === t[0]) + '>' + t[1] + '</button>').join('') + '</div>';
    const sl = (k, label, v, min) => '<div class="sl"><span>' + label + '</span><input type="range" class="lk-sl" data-k="' + k + '" min="' + min + '" max="100" step="1" value="' + v + '" style="--p:' + ((v - min) / (100 - min) * 100).toFixed(1) + '%" aria-label="' + label + '"><output>' + v + '%</output></div>';
    return '<h2>字體與外觀</h2>'
      + '<div class="lk-pv' + (V ? ' v' : '') + '" data-theme="' + esc(S.theme) + '" style="--ff:' + esc(Reader.fontOf(S.font)) + ';--fs:' + S.size + 'px;--lh:' + S.lh + '" aria-hidden="true"><p>' + SAMPLE + '</p><i class="pv-d" style="opacity:' + vl.dim.toFixed(3) + '"></i></div>'
      + '<div class="seg themes">' + [['night', '夜間', '#131a25', '#c3cad5'], ['paper', '羊皮紙', '#e9dfc8', '#33291d'], ['black', '純黑', '#000', '#9c9c9c']].map((t) => '<button type="button" data-act="set" data-k="theme" data-v="' + t[0] + '"' + pressed(S.theme === t[0]) + '><i style="background:' + t[2] + ';box-shadow:inset 0 -7px 0 -4px ' + t[3] + '"></i>' + t[1] + '</button>').join('') + '</div>'
      + '<h3>排版</h3>' + seg('vert', [['0', '橫排'], ['1', '直排・由右往左']], V ? '1' : '0')
      + '<h3>翻書的方式</h3>' + seg('mode', [['page', '仿真翻頁'], ['scroll', '上下捲動']], V ? 'page' : S.mode, V ? ' aria-disabled="true"' : '') + (V ? '<p class="note lk-n">直排是一頁一頁翻的，往左翻是下一頁。</p>' : '')
      + '<h3>字體</h3>' + seg('font', [['song', '宋體'], ['hei', '黑體'], ['kai', '楷體']], S.font, '', 'fonts')
      + '<h3>字級</h3><div class="step"><button type="button" data-act="step" data-k="size" data-d="-1" aria-label="字小一點">A</button><output>' + S.size + '</output><button type="button" data-act="step" data-k="size" data-d="1" aria-label="字大一點">A</button></div>'
      + '<h3>行距</h3><div class="step"><button type="button" data-act="step" data-k="lh" data-d="-1" aria-label="行距緊一點">−</button><output>' + S.lh.toFixed(1) + '</output><button type="button" data-act="step" data-k="lh" data-d="1" aria-label="行距鬆一點">＋</button></div>'
      + '<h3>左右邊距</h3><div class="seg">' + ['窄', '適中', '寬'].map((t, i) => '<button type="button" data-act="set" data-k="margin" data-v="' + i + '"' + pressed(S.margin === i) + '>' + t + '</button>').join('') + '</div>'
      + '<h3>夜讀</h3>' + sl('bright', '亮度', bright, 30) + sl('warm', '暖光', warm, 0) + '<p class="note lk-n">睡前讀書：把亮度調低、暖光調高，眼睛比較不累。</p>'
      + '<h3>其他</h3><button type="button" class="sw" role="switch" data-act="sw" data-k="sfx" aria-checked="' + S.sfx + '"><span>翻頁的紙聲</span><i></i></button>';
  }
  function paintVeilPreview() {
    const pv = $('.lk-pv', sheetBody); if (!pv) return;
    Reader.warmVars(pv, Settings.theme);
    const d = $('.pv-d', pv); if (d) d.style.opacity = Reader.veilOf().dim.toFixed(3);
  }
  const swHTML = (k, t, s) => '<button type="button" class="sw" role="switch" data-act="sw" data-k="' + k + '" aria-checked="' + !!Settings[k] + '"><span>' + t + (s ? '<small>' + s + '</small>' : '') + '</span><i></i></button>';
  function settingsHTML() {
    const mine = Lib.all().filter((b) => !b.remote).length;
    return '<h2>設定</h2>'
      + '<button type="button" class="rowl" data-act="look-open"><span>閱讀外觀<small>主題、字體、字級、直排、夜讀的亮度與暖光</small></span>' + ICON.back + '</button>'
      + swHTML('sfx', '音效', '翻頁的紙聲、開書、驚堂木')
      + swHTML('recap', '久沒讀的連載，翻開先看前情提要', '隔了一天半以上再打開，會先給你上一回的提要；書頁上隨時也看得到')
      + swHTML('keepAwake', '用裝置語音朗讀時，螢幕保持開著', '手機鎖屏會讓裝置語音停下來；有預錄音軌的章節不受影響')
      + '<div class="rowb" style="display:flex;gap:10px;margin-top:18px"><button type="button" class="btn" data-act="sync" style="flex:1">看看有沒有新的一回</button></div>'
      + '<button type="button" class="btn quiet st-coach" data-act="coach-again">重看一次閱讀時的操作說明</button>'
      + '<p class="note">連載小說放在你的書架上，寫好一回就會出現在這裡，文字會自動存一份，離線也能讀。<br>匯入的書（現在 ' + mine + ' 本）、閱讀進度、書籤、分類和設定只存在這台裝置的瀏覽器裡，不會上傳；換手機或清除瀏覽器資料就要重新匯入。<br>版本 ' + VERSION + '</p>';
  }
  function genreHTML(b) {
    const cur = Genre.of(b), list = Genre.ORDER.slice();
    if (cur !== '未分類' && list.indexOf(cur) < 0) list.push(cur);
    return '<h2>分類</h2><p class="note gs-n">《' + esc(b.title) + '》放在書房的哪一類？</p>'
      + '<div class="chips gpick">' + list.map((g) => '<button type="button" data-act="genre-set" data-id="' + esc(b.id) + '" data-g="' + esc(g) + '"' + pressed(g === cur) + '>' + esc(g) + '</button>').join('') + '</div>'
      + '<h3>自己取一個名字</h3><div class="qbox gcus"><input class="gin" type="text" maxlength="8" placeholder="例如：推理、輕小說" enterkeyhint="done" autocomplete="off" aria-label="自訂分類" data-id="' + esc(b.id) + '"><button type="button" class="btn" data-act="genre-custom" data-id="' + esc(b.id) + '">好</button></div>'
      + (b.remote && b.genre && cur !== b.genre ? '<button type="button" class="btn quiet gs-back" data-act="genre-set" data-id="' + esc(b.id) + '" data-g="' + esc(b.genre) + '">改回書架上的分類（' + esc(b.genre) + '）</button>' : '')
      + '<p class="note">分類記在這台裝置，用來在書房最下面的分頁挑書。</p>';
  }
  function setGenre(b, g) {
    g = (g || '').trim().slice(0, 8); if (!b || !g) return;
    Genre.set(b, g); closeSheet();
    if (state.v === 'book') renderBook(b.id); else if (state.v === 'lib') renderLib();
    toast('《' + esc(b.title) + '》放進「' + esc(g) + '」了');
  }
  function playerHTML(st) {
    const b = st.book, ch = b.chapters[st.ci], track = st.mode === 'track';
    return '<div class="np"><div class="np-art">' + coverHTML(b, 'np') + '</div><h2>' + esc(chName(ch)) + '</h2><p class="np-sub">' + esc(b.title) + '</p>'
      + '<div class="np-lines"><p id="npPrev"></p><p class="now" id="npNow"></p><p id="npNext"></p></div>'
      + '<input type="range" id="npRange" min="0" max="1000" value="0" aria-label="說書進度">'
      + '<div class="np-time"><span id="npT">0:00</span><span id="npD"></span></div>'
      + '<div class="np-ctl"><button type="button" class="ib" data-act="np-prev" aria-label="上一回">' + ICON.prev + '</button><button type="button" class="ib" data-act="np-back" aria-label="倒回十五秒">' + ICON.back15 + '</button>'
      + '<button type="button" class="ib big" id="npPlay" data-act="np-toggle" aria-label="播放或暫停"></button>'
      + '<button type="button" class="ib" data-act="np-fwd" aria-label="快轉三十秒">' + ICON.fwd30 + '</button><button type="button" class="ib" data-act="np-next" aria-label="下一回">' + ICON.next + '</button></div>'
      + '<h3>語速</h3><div class="chips" id="npRates">' + RATES.map((r) => '<button type="button" data-act="np-rate" data-v="' + r + '"' + pressed(Math.abs(st.rate - r) < .01) + '>' + r + '×</button>').join('') + '</div>'
      + '<h3>睡眠定時</h3><div class="chips" id="npSleep">' + [[0, '不設'], [15, '15 分'], [30, '30 分'], [45, '45 分'], [60, '60 分'], ['ch', '說完這一回']].map((x) => '<button type="button" data-act="np-sleep" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>'
      + (track ? '<p class="np-src">這一回是預錄的說書音軌：鎖屏、切到別的 App 都會繼續說，耳機和鎖屏畫面可以直接控制。</p>'
        : '<h3>聲音</h3><select id="npVoice" aria-label="朗讀的聲音">' + (st.voices || []).map((v) => '<option value="' + esc(v.voiceURI) + '"' + (st.voice && st.voice.voiceURI === v.voiceURI ? ' selected' : '') + '>' + esc(v.name.replace(/Microsoft |Google |\(Natural\)|Online /g, '').trim()) + '（' + esc(v.lang) + '）</option>').join('') + '</select>'
          + '<p class="np-src">這一回用這台裝置內建的語音逐句朗讀，鎖屏後會停。' + (IS_IOS ? '想要好一點的聲音：到 iPhone「設定 → 輔助使用 → 語音內容 → 聲音 → 中文」下載「高音質」版本，再回來選。' : '在電腦用 Edge 開，可以選到最自然的線上語音。') + '</p>')
      + '<div class="rowb"><button type="button" class="btn" data-act="np-goto">' + ICON.target + '看正在說的地方</button><button type="button" class="btn quiet" data-act="np-stop">收攤</button></div></div>';
  }
  function paintPlayer(st, tickOnly) {
    if (sheetKind !== 'player') return;
    if (!st.active) { closeSheet(); return; }
    const set = (id, t) => { const e = $(id); if (e && e.textContent !== t) e.textContent = t; };
    if (!tickOnly) {
      set('#npPrev', st.prevText || ''); set('#npNow', st.head ? '（驚堂木一響）' + chName(st.book.chapters[st.ci]) : st.text || (st.ready ? '' : '正在準備……')); set('#npNext', st.nextText || '');
      const pb = $('#npPlay'); if (pb) { pb.innerHTML = st.playing ? ICON.pause : ICON.play; pb.classList.toggle('wait', !st.ready || st.buffering); }
      $$('#npRates button').forEach((x) => x.setAttribute('aria-pressed', Math.abs(+x.dataset.v - st.rate) < .01 ? 'true' : 'false'));
    }
    const left = st.sleepLeft ? Math.ceil(st.sleepLeft / 60000) : 0;
    $$('#npSleep button').forEach((x) => { const v = x.dataset.v, on = v === 'ch' ? st.sleepCh : v === '0' ? !st.sleepLeft && !st.sleepCh : false; x.setAttribute('aria-pressed', on ? 'true' : 'false'); if (v === '0') x.textContent = left ? '剩 ' + left + ' 分，取消' : '不設'; });
    const rg = $('#npRange');
    if (rg && !rg.matches(':active') && document.activeElement !== rg) { rg.value = Math.round(st.f * 1000); rg.style.setProperty('--p', (st.f * 100).toFixed(1) + '%'); }
    if (st.mode === 'track') { set('#npT', fmtClock(st.time)); set('#npD', st.dur ? '-' + fmtClock((st.dur - st.time) / (st.rate || 1)) : ''); }
    else { set('#npT', '第 ' + (st.ui + 1) + ' 句'); set('#npD', '共 ' + st.n + ' 句'); }
  }
  function openPlayer() { const st = Narrator.state(); if (!st.active) return; openSheet('player', playerHTML(st)); paintPlayer(st); }

  /* ── 迷你播放列 ── */
  function syncMini(st) {
    st = st || lastNarr;
    if (!st.active) { mini.hidden = true; return; }
    const inReader = state.v === 'read';
    mini.hidden = false; mini.classList.toggle('in-reader', inReader);
    const ch = st.book.chapters[st.ci], key = st.book.id + ':' + st.ci + ':' + inReader;
    if (mini.dataset.k !== key) {
      mini.dataset.k = key;
      mini.innerHTML = '<button type="button" class="mi-main" data-act="mi-open" aria-label="打開說書現場"><span class="mi-t">' + esc((inReader ? '說書中　' : st.book.title + '　') + (ch.label || ch.name || '')) + '</span><span class="mi-x"></span></button>'
        + '<button type="button" class="ib play" data-act="mi-toggle" aria-label="播放或暫停"></button><button type="button" class="ib mi-close" data-act="np-stop" aria-label="收攤">' + ICON.close + '</button><div class="mi-bar"><i></i></div>';
    }
    const x = $('.mi-x', mini); if (x) x.textContent = st.head ? chName(ch) : st.text || '';
    $('.play', mini).innerHTML = st.playing ? ICON.pause : ICON.play;
    $('.mi-bar i', mini).style.width = (st.f * 100).toFixed(1) + '%';
  }

  /* ── 閱讀器的工具列 ── */
  function paintChrome(inf) {
    if (!inf || !inf.book) return;
    const ch = inf.book.chapters[inf.ci], V = !!Settings.vert;
    $('#rdBook').textContent = inf.book.title; $('#rdCh').textContent = chName(ch);
    const rg = $('#rdRange');
    rg.dir = V ? 'rtl' : 'ltr'; $('.rd-seek').classList.toggle('rtl', V);
    if (inf.paged) { rg.disabled = false; rg.max = Math.max(0, inf.pages - 1); if (document.activeElement !== rg || !rg.matches(':active')) rg.value = inf.pi; rg.style.setProperty('--p', (inf.pages > 1 ? inf.pi / (inf.pages - 1) * 100 : 100) + '%'); }
    else { rg.disabled = true; rg.max = 1000; rg.value = Math.round(inf.f * 1000); rg.style.setProperty('--p', (inf.f * 100).toFixed(1) + '%'); }
    $('#rdPos').textContent = (inf.paged ? '第 ' + (inf.pi + 1) + ' 頁，共 ' + inf.pages + ' 頁' : '這一回 ' + Math.round(inf.f * 100) + '%') + '　全書 ' + Math.round(Prog.pct(inf.book) * 100) + '%';
    paintMarkBtn(); paintNarrBtn();
  }
  function paintNarrBtn() {
    const b = Reader.book; if (!b) return;
    const st = lastNarr, mine = st.active && st.book.id === b.id, btn = $('[data-act="rd-narr"]');
    btn.innerHTML = ICON.ear + (mine ? '說書現場' : Narrator.hasTrack(b, Reader.ci) ? '聽說書' : '朗讀這一回');
    btn.hidden = !mine && !Narrator.hasTrack(b, Reader.ci) && !Narrator.canSpeak();
  }

  /* ── 匯入 ── */
  async function importFiles(files) {
    files = Array.from(files || []); if (!files.length) return;
    const busy = $('#busy'); let last = null, okN = 0;
    for (const f of files) {
      $('#busyText').textContent = '正在讀《' + f.name.replace(/\.[^.]+$/, '') + '》……'; busy.hidden = false;
      await raf(); await sleep(30);
      try { last = await Importer.importFile(f); okN++; }
      catch (e) { toast(esc(f.name) + '：' + esc(e && e.message ? e.message : '匯入失敗'), { kind: 'bad', ms: 6000 }); }
    }
    busy.hidden = true;
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    if (!okN) return;
    if (gsel) { gsel = ''; Store.set('gsel', ''); }          // 剛收進來的書可能不在現在選的分類裡：回到「全部」
    if (state.v === 'lib') renderLib();
    const b = last;
    toast(okN > 1 ? '收進藏書了，一共 ' + okN + ' 本' : '《' + esc(b.title) + '》收進藏書了，' + b.chapters.length + ' 章' + (b.simp && b.conv ? '（簡體已轉成繁體）' : ''), { action: '打開', onAction: () => go({ v: 'book', id: b.id }) });
    Sound.chime();
  }
  async function convert(b, v) {
    const busy = $('#busy');
    $('#busyText').textContent = v ? '正在轉成繁體……' : '正在換回原文……'; busy.hidden = false;
    try { await Importer.applyConv(b, v); await Lib.saveLocal(b); toast(v === 'twp' ? '轉好了：繁體，詞彙也換成臺灣用語' : v ? '轉好了：繁體' : '換回簡體原文了'); }
    catch (e) { toast(esc(e && e.message ? e.message : '轉換失敗'), { kind: 'bad', ms: 5000 }); }
    busy.hidden = true;
    if (state.v === 'book') renderBook(b.id);
  }

  /* ── 點擊 ── */
  function bookFrom(t) { const h = t.closest('[data-id]'); return Lib.find(t.dataset.id || (h && h.dataset.id) || state.id); }
  function onAct(t, ev) {
    const a = t.dataset.act; let b;
    switch (a) {
      case 'noop': break;
      case 'import': $('#file').value = ''; $('#file').click(); break;
      case 'settings': openSheet('settings', settingsHTML()); break;
      case 'look-open': openSheet('look', lookHTML()); paintVeilPreview(); break;
      case 'book': Sound.unlock(); Sound.tap(); go({ v: 'book', id: t.dataset.id }); break;
      case 'back': back(); break;
      case 'continue': b = bookFrom(t); if (b) resume(b, $('.cover', t.closest('.hero') || $('.bv-cover', bookv) || document)); break;
      case 'read': {
        b = Lib.find(t.dataset.id); const i = +t.dataset.i; if (!b) break;
        const p = Prog.get(b.id), same = p && Prog.index(b) === i, at = same ? { b: p.b, s: p.s } : null;
        if (sheetKind === 'nav') { closeSheet(); Reader.open(b, i, at, { keep: true }); Reader.setChrome(false); }
        else openBook(b, i, at, $('.bv-cover .cover', bookv)).then((ok) => ok && afterOpen(b, 0));
        break;
      }
      case 'listen': { b = bookFrom(t); if (!b) break; Sound.unlock(); const p = Prog.get(b.id), i = Math.max(0, Prog.index(b)); Narrator.start(b, i, p && Prog.index(b) >= 0 ? { b: p.b, s: p.s } : null).then((ok) => ok && openPlayer()); break; }
      case 'del-book': b = Lib.find(t.dataset.id); if (b) openSheet('confirm', '<h2>把《' + esc(b.title) + '》移出藏書？</h2><p class="note" style="margin:0 0 18px">這本書和它的閱讀進度、書籤會從這台裝置刪掉。原本的檔案不受影響，之後可以再匯入。</p><div style="display:flex;gap:10px"><button type="button" class="btn" data-act="sheet-close" style="flex:1">留著</button><button type="button" class="btn danger" data-act="del-yes" data-id="' + esc(b.id) + '" style="flex:1">移出藏書</button></div>'); break;
      case 'del-yes': { const id = t.dataset.id; closeSheet(); if (lastNarr.active && lastNarr.book.id === id) Narrator.stop(); Lib.removeLocal(id).then(() => { toast('已經移出藏書'); go({ v: 'lib' }, true); }).catch(() => toast('刪不掉，再試一次', { kind: 'bad' })); break; }
      case 'sync': closeSheet(); toast('正在看書架……', { ms: 1500 }); Boot.sync(true); break;
      case 'sheet-close': closeSheet(); break;
      case 'coach-again': Store.del('coach'); closeSheet(); toast('好，下次翻開書會再出現一次'); break;
      // 書房：分類、排序
      case 'genre': { const g = t.dataset.g || ''; if (g === gsel) { lib.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); break; } gsel = g; Store.set('gsel', g); Sound.tap(); renderLib(); lib.scrollTop = 0; break; }
      case 'sort': {
        if (skipMenu && skipMenu.el === t && performance.now() - skipMenu.t < 700) { skipMenu = null; break; }
        skipMenu = null;
        const sh = t.dataset.shelf, cur = sortOf(sh);
        openMenu(t, SORTS.map((s) => ({ v: s[0], t: s[1], on: s[0] === cur })), (v) => { const s = Store.get('sort', {}); s[sh] = v; Store.set('sort', s); renderLib(); });
        break;
      }
      case 'menu-pick': { const f = menuPick; closeMenu(); if (f) f(t.dataset.v); break; }
      // 書頁：分類、簡轉繁、分頁
      case 'genre-pick': b = Lib.find(t.dataset.id); if (b) openSheet('genre', genreHTML(b)); break;
      case 'genre-set': setGenre(Lib.find(t.dataset.id), t.dataset.g); break;
      case 'genre-custom': { const inp = $('.gin', sheetBody), v = inp ? inp.value.trim() : ''; if (!v) { if (inp) inp.focus(); break; } setGenre(Lib.find(t.dataset.id), v); break; }
      case 'conv': b = Lib.find(t.dataset.id); if (b && !b.remote && (b.conv || '') !== t.dataset.v) convert(b, t.dataset.v); break;
      case 'tab': {
        setTab(t.dataset.ctx, t.dataset.tab, true);
        if (t.dataset.jump) { const tabs = $('.tabs', bookv); if (tabs) tabs.scrollIntoView({ block: 'start', behavior: REDUCED ? 'auto' : 'smooth' }); }
        break;
      }
      case 'bm-go': { b = Lib.find(t.dataset.id); if (!b) break; const m = Marks.sorted(b).find((x) => String(x.t) === t.dataset.t); if (m) jump(b, m.ci, { b: m.b, s: m.s }); break; }
      case 'bm-del': {
        b = Lib.find(t.dataset.id); if (!b) break;
        Marks.remove(b.id, +t.dataset.t);
        setTab(sheetKind === 'nav' ? 'nav' : 'bv', 'marks');
        if (Reader.isOpen()) { Reader.updRibbon(); paintMarkBtn(); }
        toast('拿掉書籤了', { ms: 1600 });
        break;
      }
      case 'q-clear': { const root = t.closest('.tabp'), inp = root && $('.q', root); if (!inp) break; inp.value = ''; t.hidden = true; const bb = Lib.find(inp.dataset.id); if (bb) runSearch(bb, '', root); inp.focus(); break; }
      case 'q-go': { const x = qs.res && qs.res.hits[+t.dataset.k]; b = Lib.find(qs.id); if (x && b) jump(b, x.ci, { b: x.b, s: x.s }, x.len); break; }
      // 閱讀器
      case 'rd-back': back(); break;
      case 'rd-toc': {
        b = Reader.book; if (!b) break;
        if (navTab === 'recap' && !(b.remote && b.recaps)) navTab = 'toc';
        openSheet('nav', '<h2 class="nav-h">' + esc(b.title) + '</h2>' + tabsHTML(b, navTab, 'nav') + '<div class="tabp">' + panelHTML(b, navTab) + '</div>');
        afterPanel(b, navTab, 'nav', $('.tabp', sheetBody));
        break;
      }
      case 'rd-mark': { const r = Reader.toggleMark(); if (r === null) break; paintMarkBtn(); Sound.tap(); toast(r ? '這一頁夾了書籤' : '拿掉這一頁的書籤', { ms: 1600 }); break; }
      case 'rd-share': openShare(); break;
      case 'rd-look': openSheet('look', lookHTML()); paintVeilPreview(); break;
      case 'rd-prevch': Reader.chapter(-1); break;
      case 'rd-nextch': Reader.chapter(1); break;
      case 'rd-follow': Reader.resumeFollow(); break;
      case 'rd-narr': {
        b = Reader.book; if (!b) break;
        if (lastNarr.active && lastNarr.book.id === b.id) { openPlayer(); break; }
        const w = Reader.where(); Reader.setChrome(false);
        Narrator.start(b, w.ci, w.b >= 0 ? { b: w.b, s: w.s } : null);
        break;
      }
      case 'card-close': closeCard(); break;
      case 'recap-off': Settings.recap = false; saveSettings(); closeCard(); toast('好，之後不會自動跳出來；書頁上的「提要」隨時看得到。', { ms: 4200 }); break;
      case 'coach-ok': dismissCoach(); break;
      case 'share-copy': {
        if (!share) break;
        const me = share, n = me.b.chapters[me.i].chars || 0, msg = '這一回的全文複製好了' + (n ? '（' + fmtCount(n) + '）' : '');
        (me.text ? copyOut(me.text, msg) : Lib.chapterText(me.b, me.i).then((tx) => copyOut(tx, msg))).then((ok) => { if (ok && sheetKind === 'share') closeSheet(); });
        break;
      }
      case 'share-send': shareSend(); break;
      case 'share-title': if (share) copyOut('《' + share.b.title + '》' + chName(share.b.chapters[share.i]), '書名和回目複製好了'); break;
      // 長按一句
      case 'say-here': { const d = pop._d; hidePop(); if (d && Reader.book) Narrator.start(Reader.book, d.ci, { b: d.b, s: d.s }); break; }
      case 'pop-mark': {
        const d = pop._d; hidePop(); if (!d || !Reader.book) break;
        const ok = Marks.add(Reader.book, d.ci, { b: d.b, s: d.s, x: d.x.trim() });
        Reader.updRibbon(); paintMarkBtn(); Sound.tap();
        toast(ok ? '夾了書籤' : '這一句已經夾過書籤了', { ms: 1600 });
        break;
      }
      case 'pop-copy': { const d = pop._d; hidePop(); if (d) copyOut(d.x.trim(), '這一句複製好了'); break; }
      // 說書
      case 'mi-open': openPlayer(); break;
      case 'mi-toggle': case 'np-toggle': Narrator.toggle(); break;
      case 'np-back': Narrator.skip(-15); break;
      case 'np-fwd': Narrator.skip(30); break;
      case 'np-prev': Narrator.chapter(-1); break;
      case 'np-next': Narrator.chapter(1); break;
      case 'np-rate': Narrator.setRate(+t.dataset.v); break;
      case 'np-sleep': Narrator.setSleep(t.dataset.v === 'ch' ? 'ch' : +t.dataset.v); paintPlayer(Narrator.state(), true); break;
      case 'np-stop': Narrator.stop(); break;
      case 'np-goto': { const st = Narrator.state(); if (!st.active) break; closeSheet(); const u = { b: 0, s: 0 }; if (Reader.isOpen() && Reader.book.id === st.book.id) Reader.resumeFollow(); else { const p = Prog.get(st.book.id); openBook(st.book, st.ci, p ? { b: p.b, s: p.s } : u); } break; }
      // 外觀
      case 'set': {
        const k = t.dataset.k; let v = t.dataset.v;
        if (k === 'margin') v = +v; else if (k === 'vert') v = v === '1';
        if (Settings[k] === v) break;
        const relay = k === 'mode' || k === 'vert';
        const at = relay && Reader.isOpen() ? Reader.where() : null;      // 換翻書方式、直排之前，先記住現在讀到哪一句
        Settings[k] = v; saveSettings(); Reader.applyLook(); repaintLook();
        if (relay) Reader.reopen(at); else Reader.relayout();
        break;
      }
      case 'step': {
        const k = t.dataset.k, d = +t.dataset.d;
        if (k === 'size') Settings.size = clamp(Settings.size + d, 14, 32); else Settings.lh = clamp(Math.round((Settings.lh + d * .1) * 10) / 10, 1.4, 2.6);
        saveSettings(); Reader.applyLook(); Reader.relayout(); repaintLook();
        break;
      }
      case 'sw': { const k = t.dataset.k; Settings[k] = !Settings[k]; saveSettings(); t.setAttribute('aria-checked', Settings[k]); if (k === 'sfx' && Settings.sfx) { Sound.unlock(); Sound.page(); } break; }
    }
    void ev;
  }
  function hidePop() { clearTimeout(popT); pop.hidden = true; pop._d = null; }

  function init() {
    $('[data-act="rd-back"]').innerHTML = ICON.back; $('[data-act="rd-toc"]').innerHTML = ICON.toc; $('[data-act="rd-look"]').innerHTML = ICON.aa;
    $('[data-act="rd-mark"]').innerHTML = ICON.ribbon; $('[data-act="rd-share"]').innerHTML = ICON.share;
    document.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-act]'); if (!t || t.closest('#rdScroll')) return; Sound.unlock(); onAct(t, e); });
    document.addEventListener('pointerdown', (e) => {
      const tg = e.target, inside = (s) => tg.closest && tg.closest(s);
      if (!pop.hidden && !inside('#pop')) hidePop();
      if (!menu.hidden && !inside('#menu')) { const s = inside('[data-act="sort"]'); skipMenu = s && s === menuFrom ? { el: s, t: performance.now() } : null; closeMenu(); }
    }, true);
    // 鍵盤：Esc 關掉最上面那一層；提要卡、操作說明按 Enter 也能關
    document.addEventListener('keydown', (e) => {
      const k = e.key, stop = () => { e.preventDefault(); e.stopPropagation(); };
      if (k === 'Enter' && e.target.classList && e.target.classList.contains('gin')) { stop(); setGenre(Lib.find(e.target.dataset.id), e.target.value); return; }
      if (k === 'Enter' && e.target.classList && e.target.classList.contains('q')) { e.preventDefault(); clearTimeout(qT); const root = e.target.closest('.tabp'), bb = Lib.find(e.target.dataset.id); if (bb && root && e.target.value.trim() !== qs.q) runSearch(bb, e.target.value.trim(), root); e.target.blur(); return; }
      if (k !== 'Escape' && k !== 'Enter' && k !== ' ') return;
      if (!menu.hidden && k === 'Escape') { stop(); closeMenu(); return; }
      if (!$('#coach').hidden) { stop(); dismissCoach(); return; }
      if (!$('#rdCard').hidden) { if (k === 'Escape' || !(e.target.closest && e.target.closest('#rdCard button'))) { stop(); closeCard(); } return; }
      if (!sheet.hidden && k === 'Escape') { stop(); closeSheet(); }
    }, true);
    $('#file').addEventListener('change', (e) => importFiles(e.target.files));
    $('#rdRange').addEventListener('input', (e) => { e.target.style.setProperty('--p', (e.target.max > 0 ? e.target.value / e.target.max * 100 : 0) + '%'); Reader.gotoPage(+e.target.value); });
    document.addEventListener('input', (e) => {
      const tg = e.target;
      if (tg.classList.contains('q')) onQuery(tg);
      else if (tg.classList.contains('lk-sl')) {
        Settings[tg.dataset.k] = +tg.value / 100; Reader.applyLook(); paintVeilPreview();
        const o = tg.parentNode.querySelector('output'); if (o) o.textContent = tg.value + '%';
        tg.style.setProperty('--p', ((tg.value - tg.min) / (tg.max - tg.min) * 100).toFixed(1) + '%');
      } else if (tg.id === 'npRange') tg.style.setProperty('--p', (tg.value / 10) + '%');
    });
    document.addEventListener('change', (e) => {
      const tg = e.target;
      if (tg.classList.contains('lk-sl')) saveSettings();
      else if (tg.id === 'npRange') { Narrator.seekFrac(+tg.value / 1000); tg.blur(); }
      else if (tg.id === 'npVoice') Narrator.setVoice(tg.value);
    });
    document.addEventListener('submit', (e) => e.preventDefault());
    lib.addEventListener('scroll', closeMenu, { passive: true });
    // 拖檔案進來（電腦）
    let dragN = 0; const drop = $('#drop');
    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0;
    window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragN++; drop.hidden = false; });
    window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
    window.addEventListener('dragleave', () => { dragN = Math.max(0, dragN - 1); if (!dragN) drop.hidden = true; });
    window.addEventListener('drop', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragN = 0; drop.hidden = true; if (Reader.isOpen()) back(); importFiles(e.dataTransfer.files); });
    window.addEventListener('resize', closeMenu);

    Bus.on('reader:show', paintChrome);
    Bus.on('reader:chapter', () => { paintNarrBtn(); });
    Bus.on('reader:chrome', (on) => { document.body.classList.toggle('chrome-on', on); if (on) paintChrome(Reader.info()); });
    Bus.on('reader:close', () => { document.body.classList.remove('chrome-on'); $('#rdFollow').hidden = true; hidePop(); closeCard(); const c = $('#coach'); c.hidden = true; c.innerHTML = ''; pendingCard = null; if (state.v === 'read') back(); });
    Bus.on('reader:follow', (on) => { $('#rdFollow').hidden = on || !lastNarr.active; });
    Bus.on('reader:end', (b) => toast(b.remote && b.status === '連載中' ? '欲知後事如何，且聽下回分解。' : '這本書讀完了'));
    Bus.on('reader:sentence', (d) => {
      if (!Reader.book) return;
      const canSay = Narrator.hasTrack(Reader.book, d.ci) || Narrator.canSpeak();
      pop._d = d;
      pop.innerHTML = '<div class="popb" role="menu">' + (canSay ? '<button type="button" role="menuitem" data-act="say-here">' + ICON.ear + '從這句說書</button>' : '')
        + '<button type="button" role="menuitem" data-act="pop-mark">' + ICON.ribbon + '書籤</button><button type="button" role="menuitem" data-act="pop-copy">' + ICON.copy + '複製</button></div>';
      pop.hidden = false;
      const w = pop.offsetWidth / 2 + 10;
      pop.style.left = clamp(d.cx, w, innerWidth - w) + 'px'; pop.style.top = Math.max(76, d.cy - 14) + 'px';
      clearTimeout(popT); popT = setTimeout(hidePop, 5200);
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
    });
    Bus.on('narr', (st) => {
      const was = lastNarr; lastNarr = st; syncMini(st); paintPlayer(st);
      if (Reader.isOpen()) paintNarrBtn();
      if (!st.active) $('#rdFollow').hidden = true;
      if (was.active !== st.active && state.v === 'lib') renderLib();
    });
    Bus.on('narr:tick', (st) => { lastNarr = st; if (st.active) { const i = $('.mi-bar i', mini); if (i) i.style.width = (st.f * 100).toFixed(1) + '%'; paintPlayer(st, true); } });
    Bus.on('idb-fail', () => toast('這個瀏覽器不讓網頁存資料（可能是無痕模式），匯入的書存不下來', { kind: 'bad', ms: 7000 }));
  }
  return { init, renderLib, go, show, refresh: () => { if (state.v === 'lib') renderLib(); else if (state.v === 'book') { const y = bookv.scrollTop; renderBook(state.id); bookv.scrollTop = y; } }, get state() { return state; } };
})();
