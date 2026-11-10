/* ───────── 畫面：書房、書頁、抽屜、說書現場 ───────── */
const UI = (() => {
  const lib = $('#lib'), bookv = $('#bookv'), sheet = $('#sheet'), sheetBody = $('#sheetBody'), mini = $('#mini'), pop = $('#pop');
  let state = { v: 'lib' }, sheetKind = '', popT = 0, lastNarr = { active: false };
  const chName = (c) => (c.label ? c.label + '　' : '') + (c.name || '');
  const RATES = [0.8, 1, 1.15, 1.3, 1.5, 1.75, 2];

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

  /* ── 書房 ── */
  function renderLib() {
    const books = Lib.all(), serial = books.filter((b) => b.remote), mine = books.filter((b) => !b.remote);
    let hero = Lib.find(Prog.last());
    if (hero && !hero.chapters.length) hero = null;
    const first = !hero && serial.find((b) => b.chapters.length);
    let h = '<div class="wrap"><header class="lib-top"><div class="brand"><span class="brand-seal" aria-hidden="true">回</span><h1>下回分解</h1></div>'
      + '<div class="lib-acts"><button type="button" class="ib" data-act="import" aria-label="匯入電子書">' + ICON.plus + '</button><button type="button" class="ib" data-act="settings" aria-label="設定">' + ICON.gear + '</button></div></header>';
    if (hero) {
      const p = Prog.get(hero.id), i = Math.max(0, Prog.index(hero)), ch = hero.chapters[i], pct = Prog.pct(hero), fresh = Lib.freshSet(hero.id).length;
      const canHear = Narrator.hasTrack(hero, i) || Narrator.canSpeak();
      h += '<section class="hero" data-id="' + esc(hero.id) + '"><button type="button" class="hero-cover" data-act="continue" aria-label="接著讀《' + esc(hero.title) + '》">' + coverHTML(hero, 'h') + '</button><div>'
        + '<p class="hero-kicker">痞子葳，上回說到</p><h2>' + esc(hero.title) + '</h2><p class="hero-ch">' + esc(chName(ch)) + (fresh ? '　<b style="color:var(--gilt-2)">新到 ' + fresh + ' 回</b>' : '') + '</p>'
        + (p && p.x ? '<blockquote class="hero-x">' + esc(p.x) + '……</blockquote>' : '')
        + '<div class="hero-prog"><span class="bar"><i style="width:' + Math.round(pct * 100) + '%"></i></span><span>全書 ' + Math.round(pct * 100) + '%</span></div>'
        + '<div class="hero-btns"><button type="button" class="btn gilt" data-act="continue">接著讀</button>' + (canHear ? '<button type="button" class="btn" data-act="listen">' + ICON.ear + '聽說書</button>' : '') + '</div></div></section>';
    } else if (first) {
      h += '<section class="hero" data-id="' + esc(first.id) + '"><button type="button" class="hero-cover" data-act="continue" aria-label="開始讀《' + esc(first.title) + '》">' + coverHTML(first, 'h') + '</button><div>'
        + '<p class="hero-kicker">痞子葳，今晚從這本開始</p><h2>' + esc(first.title) + '</h2><p class="hero-ch">' + first.chapters.length + ' 回　' + fmtCount(Lib.total(first)) + '</p>'
        + (first.blurb ? '<blockquote class="hero-x">' + esc(first.blurb) + '</blockquote>' : '')
        + '<div class="hero-btns"><button type="button" class="btn gilt" data-act="continue">開始讀</button></div></div></section>';
    } else {
      h += '<section class="hero blank"><div><h2>書房還是空的</h2><p>連載小說寫好一回就會自己上架；也可以把手邊的 EPUB、TXT 電子書收進來。</p><div class="hero-btns"><button type="button" class="btn gilt" data-act="import">' + ICON.plus + '匯入電子書</button></div></div></section>';
    }
    const card = (b) => {
      const i = Prog.index(b), fresh = Lib.freshSet(b.id).length, unit = b.remote ? ' 回' : ' 章';
      const meta = fresh ? '<b>新到 ' + fresh + ' 回</b>' : i >= 0 ? '讀到 ' + esc(b.chapters[i].label || b.chapters[i].name || ('第 ' + (i + 1) + ' 章')) : b.chapters.length + unit;
      return '<button type="button" class="bk" data-act="book" data-id="' + esc(b.id) + '">' + coverHTML(b) + '<span class="bk-t">' + esc(b.title) + '</span><span class="bk-m">' + meta + '</span></button>';
    };
    if (serial.length) h += '<section class="shelf"><div class="shelf-h"><h2>連載</h2><span>寫好一回，上架一回</span></div><div class="grid">' + serial.map(card).join('') + '</div></section>';
    h += '<section class="shelf"><div class="shelf-h"><h2>我的藏書</h2><span>' + (mine.length ? mine.length + ' 本，存在這台裝置' : 'EPUB、TXT、Markdown') + '</span></div><div class="grid">' + mine.map(card).join('')
      + '<button type="button" class="bk add" data-act="import" aria-label="匯入電子書"><span class="cover">' + ICON.plus + '</span><span class="bk-t">匯入電子書</span><span class="bk-m">從這台裝置挑檔案</span></button></div></section>';
    h += '</div>';
    lib.innerHTML = h; hydrateCovers(lib);
  }

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
  function renderBook(id) {
    const b = Lib.find(id);
    if (!b) { go({ v: 'lib' }, true); return; }
    const i = Prog.index(b), tot = Lib.total(b), tracks = b.chapters.filter((c, j) => Narrator.hasTrack(b, j)).length;
    const canHear = b.chapters.length && (Narrator.hasTrack(b, Math.max(0, i)) || Narrator.canSpeak());
    bookv.innerHTML = '<div class="wrap"><div class="bv-top"><button type="button" class="ib" data-act="back" aria-label="回書房">' + ICON.back + '</button>'
      + (b.remote ? '' : '<button type="button" class="ib" data-act="del-book" data-id="' + esc(b.id) + '" aria-label="把這本書移出藏書">' + ICON.trash + '</button>') + '</div>'
      + '<div class="bv-head"><div class="bv-cover">' + coverHTML(b, 'b') + '</div><div><h1>' + esc(b.title) + '</h1>' + (b.author ? '<p class="bv-by">' + esc(b.author) + '</p>' : '')
      + (b.remote && b.status ? '<span class="state">' + esc(b.status) + '</span>' : '')
      + '<ul class="bv-stats"><li><b>' + b.chapters.length + '</b>' + (b.remote ? '回' : '章') + '</li><li><b>' + (tot >= 10000 ? (tot / 10000).toFixed(1).replace(/\.0$/, '') + ' 萬' : tot) + '</b>字</li><li><b>' + fmtMin(tot).replace(/ (小時|分鐘|分)/g, '') + '</b>' + (tot / 450 >= 60 ? '小時讀完' : '分鐘讀完') + '</li>'
      + (tracks ? '<li><b>' + tracks + '</b>回有說書</li>' : '') + '</ul></div></div>'
      + '<div class="bv-btns"><button type="button" class="btn gilt" data-act="continue" data-id="' + esc(b.id) + '">' + (i >= 0 ? '接著讀' : '開始讀') + '</button>' + (canHear ? '<button type="button" class="btn" data-act="listen" data-id="' + esc(b.id) + '">' + ICON.ear + '聽說書</button>' : '') + '</div>'
      + (b.blurb ? '<p class="bv-blurb">' + esc(b.blurb) + '</p>' : '')
      + '<div class="toc-h"><h2>目錄</h2></div>' + (b.chapters.length ? tocHTML(b) : '<p class="empty">第一回還在路上。</p>') + '</div>';
    bookv.dataset.id = id; hydrateCovers(bookv);
  }

  /* ── 換畫面（手機的返回鍵也走這裡） ── */
  function show(s) {
    state = s;
    if (s.v !== 'read' && Reader.isOpen()) Reader.close();
    lib.hidden = s.v !== 'lib' && s.v !== 'read';
    bookv.hidden = s.v !== 'book';
    if (s.v === 'lib') renderLib();
    if (s.v === 'book') { renderBook(s.id); bookv.scrollTop = 0; }
    if (s.v === 'read') { if (s.from === 'book') { lib.hidden = true; bookv.hidden = false; } }
    syncMini();
  }
  function go(s, replace) { try { history[replace ? 'replaceState' : 'pushState'](s, ''); } catch (e) {} show(s); }
  window.addEventListener('popstate', (e) => {
    if (!sheet.hidden) { closeSheet(); try { history.pushState(state, ''); } catch (x) {} return; }
    show(e.state && e.state.v ? e.state : { v: 'lib' });
  });
  const back = () => { if (history.state && history.state.v && history.state.v !== 'lib') history.back(); else go({ v: 'lib' }, true); };

  /* ── 翻開一本書 ── */
  async function openBook(b, i, anchor, fromEl) {
    if (!b || !b.chapters.length) return;
    Sound.unlock();
    go({ v: 'read', id: b.id, from: state.v === 'book' ? 'book' : 'lib' });
    const anim = fromEl && !REDUCED && fromEl.getBoundingClientRect().width > 20 ? opening(b, fromEl) : null;
    await Reader.open(b, i, anchor);
    if (anim) await anim;
  }
  function resume(b, fromEl) {
    const p = Prog.get(b.id), i = Prog.index(b);
    return openBook(b, i >= 0 ? i : 0, i >= 0 && p ? { b: p.b, s: p.s } : null, fromEl);
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
  function openSheet(kind, html) { sheetKind = kind; sheetBody.innerHTML = html; sheet.hidden = false; document.body.classList.add('sheet-open'); sheetBody.scrollTop = 0; $('.sheet-panel', sheet).focus({ preventScroll: true }); }
  function closeSheet() { sheet.hidden = true; sheetKind = ''; sheetBody.innerHTML = ''; document.body.classList.remove('sheet-open'); }
  const pressed = (on) => ' aria-pressed="' + (on ? 'true' : 'false') + '"';
  function lookHTML() {
    const S = Settings;
    return '<h2>字體與外觀</h2>'
      + '<div class="seg themes">' + [['night', '夜間', '#131a25', '#c3cad5'], ['paper', '羊皮紙', '#e9dfc8', '#33291d'], ['black', '純黑', '#000', '#9c9c9c']].map((t) => '<button type="button" data-act="set" data-k="theme" data-v="' + t[0] + '"' + pressed(S.theme === t[0]) + '><i style="background:' + t[2] + ';box-shadow:inset 0 -7px 0 -4px ' + t[3] + '"></i>' + t[1] + '</button>').join('') + '</div>'
      + '<h3>翻書的方式</h3><div class="seg">' + [['page', '仿真翻頁'], ['scroll', '上下捲動']].map((t) => '<button type="button" data-act="set" data-k="mode" data-v="' + t[0] + '"' + pressed(S.mode === t[0]) + '>' + t[1] + '</button>').join('') + '</div>'
      + '<h3>字體</h3><div class="seg fonts">' + [['song', '宋體'], ['hei', '黑體'], ['kai', '楷體']].map((t) => '<button type="button" data-act="set" data-k="font" data-v="' + t[0] + '"' + pressed(S.font === t[0]) + '>' + t[1] + '</button>').join('') + '</div>'
      + '<h3>字級</h3><div class="step"><button type="button" data-act="step" data-k="size" data-d="-1" aria-label="字小一點">A</button><output>' + S.size + '</output><button type="button" data-act="step" data-k="size" data-d="1" aria-label="字大一點">A</button></div>'
      + '<h3>行距</h3><div class="step"><button type="button" data-act="step" data-k="lh" data-d="-1" aria-label="行距緊一點">−</button><output>' + S.lh.toFixed(1) + '</output><button type="button" data-act="step" data-k="lh" data-d="1" aria-label="行距鬆一點">＋</button></div>'
      + '<h3>左右邊距</h3><div class="seg">' + ['窄', '適中', '寬'].map((t, i) => '<button type="button" data-act="set" data-k="margin" data-v="' + i + '"' + pressed(S.margin === i) + '>' + t + '</button>').join('') + '</div>'
      + '<h3>其他</h3><button type="button" class="sw" role="switch" data-act="sw" data-k="sfx" aria-checked="' + S.sfx + '"><span>翻頁的紙聲</span><i></i></button>';
  }
  function settingsHTML() {
    const mine = Lib.all().filter((b) => !b.remote).length;
    return '<h2>設定</h2>'
      + '<button type="button" class="sw" role="switch" data-act="sw" data-k="sfx" aria-checked="' + Settings.sfx + '"><span>音效<small>翻頁的紙聲、開書、驚堂木</small></span><i></i></button>'
      + '<button type="button" class="sw" role="switch" data-act="sw" data-k="keepAwake" aria-checked="' + Settings.keepAwake + '"><span>用裝置語音朗讀時，螢幕保持開著<small>手機鎖屏會讓裝置語音停下來；有預錄音軌的章節不受影響</small></span><i></i></button>'
      + '<div class="rowb" style="display:flex;gap:10px;margin-top:18px"><button type="button" class="btn" data-act="sync" style="flex:1">看看有沒有新的一回</button></div>'
      + '<p class="note">連載小說放在你的書架上，寫好一回就會出現在這裡，文字會自動存一份，離線也能讀。<br>匯入的書（現在 ' + mine + ' 本）、閱讀進度和設定只存在這台裝置的瀏覽器裡，不會上傳；換手機或清除瀏覽器資料就要重新匯入。<br>版本 ' + VERSION + '</p>';
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
    const ch = inf.book.chapters[inf.ci];
    $('#rdBook').textContent = inf.book.title; $('#rdCh').textContent = chName(ch);
    const rg = $('#rdRange');
    if (inf.paged) { rg.disabled = false; rg.max = Math.max(0, inf.pages - 1); if (document.activeElement !== rg || !rg.matches(':active')) rg.value = inf.pi; rg.style.setProperty('--p', (inf.pages > 1 ? inf.pi / (inf.pages - 1) * 100 : 100) + '%'); }
    else { rg.disabled = true; rg.max = 1000; rg.value = Math.round(inf.f * 1000); rg.style.setProperty('--p', (inf.f * 100).toFixed(1) + '%'); }
    $('#rdPos').textContent = (inf.paged ? '第 ' + (inf.pi + 1) + ' 頁，共 ' + inf.pages + ' 頁' : '這一回 ' + Math.round(inf.f * 100) + '%') + '　全書 ' + Math.round(Prog.pct(inf.book) * 100) + '%';
    paintNarrBtn();
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
    if (state.v === 'lib') renderLib();
    const b = last;
    toast(okN > 1 ? '收進藏書了，一共 ' + okN + ' 本' : '《' + esc(b.title) + '》收進藏書了，' + b.chapters.length + ' 章', { action: '打開', onAction: () => go({ v: 'book', id: b.id }) });
    Sound.chime();
  }

  /* ── 點擊 ── */
  function bookFrom(t) { const h = t.closest('[data-id]'); return Lib.find(t.dataset.id || (h && h.dataset.id) || state.id); }
  function onAct(t, ev) {
    const a = t.dataset.act; let b;
    switch (a) {
      case 'import': $('#file').value = ''; $('#file').click(); break;
      case 'settings': openSheet('settings', settingsHTML()); break;
      case 'book': Sound.unlock(); Sound.tap(); go({ v: 'book', id: t.dataset.id }); break;
      case 'back': back(); break;
      case 'continue': b = bookFrom(t); if (b) resume(b, $('.cover', t.closest('.hero') || $('.bv-cover', bookv) || document)); break;
      case 'read': {
        b = Lib.find(t.dataset.id); const i = +t.dataset.i; if (!b) break;
        const p = Prog.get(b.id), same = p && Prog.index(b) === i;
        if (sheetKind === 'toc') { closeSheet(); Reader.open(b, i, same ? { b: p.b, s: p.s } : null, { keep: true }); Reader.setChrome(false); }
        else openBook(b, i, same ? { b: p.b, s: p.s } : null, $('.bv-cover .cover', bookv));
        break;
      }
      case 'listen': { b = bookFrom(t); if (!b) break; Sound.unlock(); const p = Prog.get(b.id), i = Math.max(0, Prog.index(b)); Narrator.start(b, i, p && Prog.index(b) >= 0 ? { b: p.b, s: p.s } : null).then((ok) => ok && openPlayer()); break; }
      case 'del-book': b = Lib.find(t.dataset.id); if (b) openSheet('confirm', '<h2>把《' + esc(b.title) + '》移出藏書？</h2><p class="note" style="margin:0 0 18px">這本書和它的閱讀進度會從這台裝置刪掉。原本的檔案不受影響，之後可以再匯入。</p><div style="display:flex;gap:10px"><button type="button" class="btn" data-act="sheet-close" style="flex:1">留著</button><button type="button" class="btn danger" data-act="del-yes" data-id="' + esc(b.id) + '" style="flex:1">移出藏書</button></div>'); break;
      case 'del-yes': { const id = t.dataset.id; closeSheet(); if (lastNarr.active && lastNarr.book.id === id) Narrator.stop(); Lib.removeLocal(id).then(() => { toast('已經移出藏書'); go({ v: 'lib' }, true); }).catch(() => toast('刪不掉，再試一次', { kind: 'bad' })); break; }
      case 'sync': closeSheet(); toast('正在看書架……', { ms: 1500 }); Boot.sync(true); break;
      case 'sheet-close': closeSheet(); break;
      case 'rd-back': back(); break;
      case 'rd-toc': b = Reader.book; if (b) { openSheet('toc', '<h2>' + esc(b.title) + '</h2>' + tocHTML(b)); const c = $('.row.cur', sheetBody); if (c) c.scrollIntoView({ block: 'center' }); } break;
      case 'rd-look': openSheet('look', lookHTML()); break;
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
      case 'say-here': { const d = pop._d; hidePop(); if (d && Reader.book) Narrator.start(Reader.book, d.ci, { b: d.b, s: d.s }); break; }
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
      case 'set': {
        const k = t.dataset.k, v = k === 'margin' ? +t.dataset.v : t.dataset.v, modeChanged = k === 'mode' && Settings.mode !== v;
        const at = modeChanged ? Reader.where() : null;      // 換翻書方式之前，先記住現在讀到哪一句
        Settings[k] = v; saveSettings(); Reader.applyLook(); sheetBody.innerHTML = lookHTML();
        if (modeChanged) Reader.reopen(at); else Reader.relayout();
        break;
      }
      case 'step': {
        const k = t.dataset.k, d = +t.dataset.d;
        if (k === 'size') Settings.size = clamp(Settings.size + d, 14, 32); else Settings.lh = clamp(Math.round((Settings.lh + d * .1) * 10) / 10, 1.4, 2.6);
        saveSettings(); Reader.applyLook(); Reader.relayout(); sheetBody.innerHTML = lookHTML();
        break;
      }
      case 'sw': { const k = t.dataset.k; Settings[k] = !Settings[k]; saveSettings(); t.setAttribute('aria-checked', Settings[k]); if (k === 'sfx' && Settings.sfx) { Sound.unlock(); Sound.page(); } break; }
    }
    void ev;
  }
  function hidePop() { clearTimeout(popT); pop.hidden = true; pop._d = null; }

  function init() {
    $('[data-act="rd-back"]').innerHTML = ICON.back; $('[data-act="rd-toc"]').innerHTML = ICON.toc; $('[data-act="rd-look"]').innerHTML = ICON.aa;
    document.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-act]'); if (!t || t.closest('#rdScroll')) return; Sound.unlock(); onAct(t, e); });
    document.addEventListener('pointerdown', (e) => { if (!pop.hidden && !(e.target.closest && e.target.closest('#pop'))) hidePop(); }, true);
    $('#file').addEventListener('change', (e) => importFiles(e.target.files));
    $('#rdRange').addEventListener('input', (e) => { e.target.style.setProperty('--p', (e.target.max > 0 ? e.target.value / e.target.max * 100 : 0) + '%'); Reader.gotoPage(+e.target.value); });
    sheet.addEventListener('input', (e) => { if (e.target.id === 'npRange') { e.target.style.setProperty('--p', (e.target.value / 10) + '%'); } });
    sheet.addEventListener('change', (e) => { if (e.target.id === 'npRange') { Narrator.seekFrac(+e.target.value / 1000); e.target.blur(); } else if (e.target.id === 'npVoice') Narrator.setVoice(e.target.value); });
    // 拖檔案進來（電腦）
    let dragN = 0; const drop = $('#drop');
    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0;
    window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragN++; drop.hidden = false; });
    window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
    window.addEventListener('dragleave', () => { dragN = Math.max(0, dragN - 1); if (!dragN) drop.hidden = true; });
    window.addEventListener('drop', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragN = 0; drop.hidden = true; if (Reader.isOpen()) back(); importFiles(e.dataTransfer.files); });

    Bus.on('reader:show', paintChrome);
    Bus.on('reader:chapter', () => { paintNarrBtn(); });
    Bus.on('reader:chrome', (on) => { document.body.classList.toggle('chrome-on', on); if (on) paintChrome(Reader.info()); });
    Bus.on('reader:close', () => { document.body.classList.remove('chrome-on'); $('#rdFollow').hidden = true; hidePop(); if (state.v === 'read') back(); });
    Bus.on('reader:follow', (on) => { $('#rdFollow').hidden = on || !lastNarr.active; });
    Bus.on('reader:end', (b) => toast(b.remote && b.status === '連載中' ? '欲知後事如何，且聽下回分解。' : '這本書讀完了'));
    Bus.on('reader:sentence', (d) => {
      if (!Reader.book || (!Narrator.hasTrack(Reader.book, d.ci) && !Narrator.canSpeak())) return;
      pop._d = d; pop.innerHTML = '<button type="button" data-act="say-here">' + ICON.ear + '從這句開始說書</button>';
      pop.style.left = clamp(d.cx, 96, innerWidth - 96) + 'px'; pop.style.top = Math.max(70, d.cy - 14) + 'px'; pop.hidden = false;
      clearTimeout(popT); popT = setTimeout(hidePop, 4200);
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
  return { init, renderLib, go, show, refresh: () => { if (state.v === 'lib') renderLib(); else if (state.v === 'book') renderBook(state.id); }, get state() { return state; } };
})();
