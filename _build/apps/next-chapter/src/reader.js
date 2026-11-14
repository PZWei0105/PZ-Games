/* ───────── 閱讀器：仿真翻頁（兩片紙＋摺起來的頁背）與捲動 ───────── */
const Reader = (() => {
  const GAP = 64;
  let root, stage, flapC, flap, foldSh, scroller, scFlow, ribbon, veil;
  let book = null, ci = 0;
  const L = [];                       // 兩片頁面
  const G = { vp: null, flow: null, ghost: null, ci: -1 };   // 頁背：鏡像的同一頁，淡淡透出字來
  let cur = 0;
  let W = 0, cw = 0, chh = 0, stride = 1;
  let turning = null, animId = 0, token = 0;
  let marks = null, followPaused = false;
  let pin = null;                     // 讀到哪一句：翻頁時更新；改字級、轉螢幕時靠它回到同一句
  let scEls = [], scTick = 0, relayT = 0;
  const FONTS = { song: '"Noto Serif TC", "Songti TC", "PMingLiU", serif', hei: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif', kai: '"LXGW WenKai TC", "Kaiti TC", "DFKai-SB", serif' };
  const THEME_COLOR = { night: '#131a25', paper: '#e9dfc8', black: '#000000' };
  const vert = () => !!Settings.vert;                    // 直排：由右到左，一定是翻頁
  const paged = () => Settings.mode !== 'scroll' || vert();
  const isOpen = () => !!book && !root.hidden;

  function init() {
    root = $('#reader'); stage = $('#rdStage'); flapC = $('#flapC'); flap = flapC.firstElementChild; foldSh = $('#foldSh');
    scroller = $('#rdScroll'); scFlow = $('#scFlow'); ribbon = $('#rdRibbon'); veil = $('#rdVeil');
    ['#leafA', '#leafB'].forEach((id) => {
      const e = $(id);
      L.push({ el: e, inner: $('.leaf-in', e), vp: $('.vp', e), flow: $('.flow', e), footL: $('.pf-l', e), footR: $('.pf-r', e), ci: -1, pages: 1, pi: 0, els: [], map: [], bs: [], ss: [], es: [] });
    });
    G.ghost = $('.ghost', flapC); G.vp = $('.vp', flapC); G.flow = $('.flow', flapC);
    bindPointer(); bindKeys();
    scroller.addEventListener('scroll', () => { if (!scTick) scTick = setTimeout(() => { scTick = 0; onScrolled(); }, 160); }, { passive: true });
    window.addEventListener('resize', () => { clearTimeout(relayT); relayT = setTimeout(() => isOpen() && relayout(), 160); });
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { clearTimeout(relayT); relayT = setTimeout(() => isOpen() && relayout(), 120); });
    applyLook();
  }

  /* ── 外觀 ── */
  function applyLook() {
    const r = root || $('#reader');
    r.dataset.theme = Settings.theme; r.dataset.mode = Settings.mode;
    r.style.setProperty('--fs', Settings.size + 'px');
    r.style.setProperty('--lh', Settings.lh);
    r.style.setProperty('--mx', [16, 24, 34][Settings.margin] + 'px');
    r.style.setProperty('--ff', FONTS[Settings.font] || FONTS.song);
    r.classList.toggle('vert', vert());
    if (stage) stage.classList.toggle('rtl', vert());
    // 夜讀：調暗＋暖光（蓋在整個閱讀器上，點擊會穿過去）
    const vl = veilOf();
    r.style.setProperty('--dim', vl.dim.toFixed(3)); r.classList.toggle('veil', vl.dim > 0);
    warmVars(r, Settings.theme);
    r.style.setProperty('--img-f', vl.warm > 0 ? 'sepia(' + (vl.warm * .55).toFixed(2) + ')' : 'none');
    if (Settings.font === 'hei' && !$('#fontHei')) document.head.appendChild(el('link', { id: 'fontHei', rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap' }));
    if (r.hidden === false) setThemeColor(THEME_COLOR[Settings.theme]);
  }
  /* 夜讀：調暗是蓋一層黑紗；暖光是把這個主題的每個顏色都濾掉一些藍光（像手機的夜覽），不靠混色，哪個瀏覽器都一樣 */
  const PAL = {
    night: { bg: [19, 26, 37, 1], fg: [195, 202, 213, 1], dim: [102, 114, 127, 1], acc: [201, 164, 92, 1], outer: [10, 15, 23, 1], flap: [26, 35, 49, 1], on: [201, 164, 92, .2], bar: [16, 23, 34, .94] },
    paper: { bg: [233, 223, 200, 1], fg: [51, 41, 29, 1], dim: [143, 127, 102, 1], acc: [156, 59, 42, 1], outer: [205, 191, 159, 1], flap: [217, 205, 177, 1], on: [156, 59, 42, .15], bar: [240, 231, 210, .96] },
    black: { bg: [0, 0, 0, 1], fg: [156, 156, 156, 1], dim: [76, 76, 76, 1], acc: [141, 119, 72, 1], outer: [0, 0, 0, 1], flap: [12, 12, 12, 1], on: [255, 255, 255, .13], bar: [10, 10, 10, .96] },
  };
  function veilOf() { return { dim: (1 - clamp(+Settings.bright || 1, .3, 1)) * .92, warm: clamp(+Settings.warm || 0, 0, 1) }; }
  function warmVars(e, theme) {
    const w = veilOf().warm, p = PAL[theme] || PAL.night;
    Object.keys(p).forEach((k) => {
      if (w <= 0) { e.style.removeProperty('--rd-' + k); return; }
      const c = p[k], f = [1, 1 - .36 * w, 1 - .7 * w];       // 紅不動、綠少一點、藍少很多
      e.style.setProperty('--rd-' + k, 'rgba(' + Math.round(c[0] * f[0]) + ',' + Math.round(c[1] * f[1]) + ',' + Math.round(c[2] * f[2]) + ',' + c[3] + ')');
    });
  }
  function setThemeColor(c) { const m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', c); }

  /* ── 排版與分頁 ── */
  function measure() {
    W = stage.clientWidth; const vp = L[0].vp;
    cw = Math.max(120, vp.clientWidth); chh = Math.max(160, vp.clientHeight); stride = (vert() ? chh : cw) + GAP;
  }
  /* 橫排：欄往右排、一欄一頁；直排：文字由右到左排，欄往下排、一欄一頁 */
  function sizeFlow(lf) { const s = lf.flow.style; lf.flow.classList.toggle('v', vert()); s.height = chh + 'px'; s.width = cw + 'px'; s.columnWidth = (vert() ? chh : cw) + 'px'; s.columnGap = GAP + 'px'; }
  function paginate(lf) {
    lf.vp.scrollLeft = 0; lf.vp.scrollTop = 0;
    const V = vert(), fr = lf.flow.getBoundingClientRect(), base = V ? fr.top : fr.left;
    lf.els = $$('.s, .brk, .fig, .ch-head, .endmark', lf.flow);
    lf.map = new Array(lf.els.length); lf.bs = new Array(lf.els.length); lf.ss = new Array(lf.els.length); lf.es = new Array(lf.els.length);
    let last = 0;
    for (let i = 0; i < lf.els.length; i++) {
      const e = lf.els[i], rs = e.getClientRects(), r0 = rs[0] || e.getBoundingClientRect(), r1 = rs[rs.length - 1] || r0;
      const p0 = V ? r0.top : r0.left, p1 = V ? r1.top : r1.left;
      lf.map[i] = Math.max(0, Math.floor((p0 - base + .5) / stride));      // 用無條件捨去：一句話從行的後半段開始，也還是這一頁
      last = Math.max(last, Math.floor((p1 - base + .5) / stride));
      lf.bs[i] = +e.dataset.b; lf.ss[i] = e.dataset.s ? +e.dataset.s : 0; lf.es[i] = e.dataset.e ? +e.dataset.e : 1e9;
    }
    lf.pages = Math.max(1, last + 1);
  }
  function fill(lf, i, data) {
    lf.ci = i;
    lf.flow.innerHTML = htmlOf(i, data);
    lf.footL.textContent = (book.chapters[i].label ? book.chapters[i].label + '　' : '') + (book.chapters[i].name || '');
    sizeFlow(lf); paginate(lf);
    $$('img', lf.flow).forEach((im) => { if (!im.complete) im.addEventListener('load', () => { clearTimeout(relayT); relayT = setTimeout(() => isOpen() && relayout(), 80); }, { once: true }); });
    if (marks && marks.ci === i) paint(lf.flow);
  }
  const htmlOf = (i, data) => data.html || (data.html = chapterHTML(book.chapters[i], data.blocks, Lib.imgURL));
  function fillGhost(i, data) { G.ci = i; G.flow.innerHTML = htmlOf(i, data); sizeFlow(G); }
  function show(lf, pi) {
    lf.pi = clamp(pi, 0, lf.pages - 1);
    if (vert()) { lf.vp.scrollLeft = 0; lf.vp.scrollTop = lf.pi * stride; } else { lf.vp.scrollTop = 0; lf.vp.scrollLeft = lf.pi * stride; }
    lf.footR.textContent = (lf.pi + 1) + ' / ' + lf.pages;
  }
  function idxOf(lf, a) {
    if (!a) return 0;
    let first = -1;
    for (let i = 0; i < lf.els.length; i++) { if (lf.bs[i] !== a.b) continue; if (first < 0) first = i; if ((a.s || 0) < lf.es[i]) return i; }
    if (first >= 0) return first;
    for (let i = 0; i < lf.els.length; i++) if (lf.bs[i] > a.b) return i;   // 那一塊不見了（改稿後）：落在它後面最近的地方
    return Math.max(0, lf.els.length - 1);
  }
  const pageOf = (lf, a) => (a && lf.els.length ? lf.map[idxOf(lf, a)] : 0);
  function anchorAt(lf, pi) {
    let k = -1;
    for (let i = 0; i < lf.els.length; i++) { if (lf.map[i] === pi) { k = i; break; } if (lf.map[i] > pi) { k = Math.max(0, i - 1); break; } }
    if (k < 0) k = lf.els.length - 1;
    if (k < 0) return { b: -1, s: 0, x: '' };
    return pinOf(lf, k);
  }
  /* 第 k 個元素當錨點。頁首是分隔線或插圖時，改用同一頁的第一句（換字級、直排後，讀的那一句才會在畫面上）；
     章名（b = -1）照舊，代表這一回的開頭。引文一律抓第一句正文。 */
  function pinOf(lf, k) {
    let t = k; while (t < lf.els.length && !lf.els[t].classList.contains('s')) t++;
    const use = t < lf.els.length && t !== k && lf.bs[k] >= 0 && lf.map[t] === lf.map[k] ? t : k;
    return { b: lf.bs[use], s: lf.ss[use], x: t < lf.els.length ? lf.els[t].textContent.slice(0, 44) : '' };
  }
  function setPin(a) {
    if (paged()) { const lf = L[cur]; if (a && a !== 'end' && a.b >= 0 && lf.els.length) pin = pinOf(lf, idxOf(lf, a)); else pin = anchorAt(lf, lf.pi); }
    else pin = scAnchor();
  }

  /* ── 開書、換章 ── */
  async function open(b, i, anchor, opt) {
    const my = ++token;
    book = b; followPaused = false;
    i = clamp(i, 0, b.chapters.length - 1);
    root.hidden = false; root.classList.add('loading'); applyLook();
    let data;
    try { data = await Lib.chapter(b, i); } catch (e) { if (my === token) { root.classList.remove('loading'); toast(esc(e.message || '讀不到這一章'), { kind: 'bad' }); if (!(opt && opt.keep)) close(); } return false; }
    if (my !== token) return false;
    stopTurn(); ci = i;
    if (paged()) {
      scroller.hidden = true; stage.hidden = false;
      measure(); fill(L[cur], i, data); show(L[cur], anchor === 'end' ? 1e9 : pageOf(L[cur], anchor)); resetLayers();
      const other = L[1 - cur]; other.ci = -1;
      idle(() => { if (my === token && !turning && other.ci !== ci) { fill(other, ci, data); show(other, L[cur].pi); } if (my === token && G.ci !== ci) fillGhost(ci, data); });
    } else {
      stage.hidden = true; scroller.hidden = false;
      scFlow.innerHTML = chapterHTML(b.chapters[i], data.blocks, Lib.imgURL) + endNav();
      scEls = $$('.s, .brk, .fig, .ch-head, .endmark', scFlow);
      if (marks && marks.ci === i) paint(scFlow);
      await raf();
      if (anchor === 'end') scroller.scrollTop = scroller.scrollHeight; else if (anchor && anchor.b >= 0) { const e = scElOf(anchor); scroller.scrollTop = e ? Math.max(0, e.offsetTop - 28) : 0; } else scroller.scrollTop = 0;
    }
    root.classList.remove('loading'); setPin(anchor);
    Lib.clearFresh(b.id, Lib.ck(b, b.chapters[i], i));
    afterShow(true);
    if (i + 1 < b.chapters.length) idle(() => Lib.chapter(b, i + 1).catch(() => {}));
    return true;
  }
  const idle = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 400 }) : setTimeout(f, 60));
  function endNav() {
    const last = ci >= book.chapters.length - 1, nx = !last && book.chapters[ci + 1];
    return '<div class="sc-end">' + (last
      ? '<p class="sc-fin">' + (book.remote && book.status === '連載中' ? '欲知後事如何，且聽下回分解。' : '全書完') + '</p>'
      : '<button type="button" class="btn sc-next" data-act="next-ch"><small>下一回</small>' + esc((nx.label ? nx.label + '　' : '') + (nx.name || '')) + '</button>') + '</div>';
  }
  function close() {
    if (!book) return;
    save(); token++; stopTurn(); pin = null;
    root.hidden = true; root.classList.remove('chrome-on');
    setThemeColor('#0b1422');
    const b = book; book = null;
    L.forEach((lf) => { lf.flow.innerHTML = ''; lf.ci = -1; lf.els = []; }); G.flow.innerHTML = ''; G.ci = -1; scFlow.innerHTML = ''; scEls = [];
    Bus.emit('reader:close', b);
  }

  function relayout() {
    if (!book) return;
    stopTurn();
    if (!paged()) return;
    const a = pin || anchorAt(L[cur], L[cur].pi);
    measure();
    L.forEach((lf) => { if (lf.ci >= 0) { sizeFlow(lf); paginate(lf); show(lf, lf === L[cur] ? pageOf(lf, a) : 0); } });
    if (G.ci >= 0) sizeFlow(G);
    resetLayers(); emitShow();
  }
  /* 換了翻頁／捲動，或換章：整個重開在同一個位置 */
  function reopen(at) { if (!book) return; const a = at || where(); return open(book, ci, a, { keep: true }); }

  function where() {
    if (!book) return null;
    return Object.assign({ ci }, pin || (paged() ? anchorAt(L[cur], L[cur].pi) : scAnchor()));
  }
  function frac() {
    if (paged()) { const lf = L[cur]; return lf.pages > 1 ? lf.pi / (lf.pages - 1) : 1; }
    const max = scroller.scrollHeight - scroller.clientHeight; return max > 4 ? clamp(scroller.scrollTop / max, 0, 1) : 1;
  }
  function save() {
    if (!book) return;
    const a = where(), ch = book.chapters[ci], key = Lib.ck(book, ch, ci), f = frac();
    Prog.set(book.id, { ck: key, b: a.b, s: a.s, x: a.x, f });
    if (f >= .995) Prog.markDone(book.id, key);
  }
  function emitShow() { updRibbon(); Bus.emit('reader:show', info()); }

  /* ── 書籤：這一頁有沒有書籤（頁角的紅緞帶） ── */
  function pageMarks() {
    if (!book) return [];
    const list = Marks.sorted(book).filter((mk) => mk.ci === ci);
    if (!list.length) return [];
    if (paged()) { const lf = L[cur]; return list.filter((mk) => pageOf(lf, mk) === lf.pi); }
    const top = scroller.scrollTop, bot = top + scroller.clientHeight * .6;
    return list.filter((mk) => { const e = scElOf(mk); return e && e.offsetTop >= top - 4 && e.offsetTop < bot; });
  }
  function updRibbon() { if (ribbon) ribbon.classList.toggle('on', pageMarks().length > 0); }
  /* 加書籤：這一頁第一句；這一頁已經有了就拿掉 */
  function toggleMark() {
    if (!book) return null;
    const on = pageMarks();
    if (on.length) { on.forEach((mk) => Marks.remove(book.id, mk.t)); updRibbon(); return false; }
    const a = where(); if (!a || a.b < 0) return null;
    Marks.add(book, ci, a); updRibbon(); return true;
  }

  /* ── 搜尋跳過來時，把找到的字亮一下 ── */
  // 只亮找到的那幾個字：暫時把那一句拆成「前面＋<mark>找到的字</mark>＋後面」，幾秒後還原（不影響排版）。
  // 不用 CSS Highlight API：Safari 在不能選取文字（user-select: none）的地方不畫它。
  let flashT = 0, flashed = null;
  function unflash() { clearTimeout(flashT); if (flashed && flashed.sp.isConnected) flashed.sp.textContent = flashed.t; flashed = null; }
  function flash(a, len) {
    unflash();
    const rootEl = paged() ? L[cur].flow : scFlow;
    const sp = $$('.s[data-b="' + a.b + '"]', rootEl).find((x) => +x.dataset.s <= a.s && +x.dataset.e > a.s);
    if (!sp) return;
    const t = sp.textContent, off = clamp(a.s - +sp.dataset.s, 0, t.length - 1), end = Math.min(t.length, off + Math.max(1, len || 1));
    sp.innerHTML = esc(t.slice(0, off)) + '<mark class="hitm">' + esc(t.slice(off, end)) + '</mark>' + esc(t.slice(end));
    flashed = { sp, t }; flashT = setTimeout(unflash, 4600);
  }
  function afterShow(chapterChanged) { save(); if (chapterChanged) Bus.emit('reader:chapter', info()); emitShow(); }
  function info() { const lf = L[cur]; return { book, ci, pi: paged() ? lf.pi : 0, pages: paged() ? lf.pages : 1, f: book ? frac() : 0, paged: paged() }; }

  /* ── 捲動模式 ── */
  function scElOf(a) { for (const e of scEls) { if (+e.dataset.b === a.b && (a.s || 0) < (e.dataset.e ? +e.dataset.e : 1e9)) return e; } return null; }
  function scAnchor() {
    const top = scroller.scrollTop + 8; let lo = 0, hi = scEls.length - 1, k = hi;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (scEls[m].offsetTop >= top) { k = m; hi = m - 1; } else lo = m + 1; }
    if (k < 0) return { b: -1, s: 0, x: '' };
    const e = scEls[k]; let t = k; while (t < scEls.length && !scEls[t].classList.contains('s')) t++;
    return { b: +e.dataset.b, s: e.dataset.s ? +e.dataset.s : 0, x: t < scEls.length ? scEls[t].textContent.slice(0, 44) : '' };
  }
  function onScrolled() { if (!book || paged()) return; setPin(); save(); emitShow(); }

  /* ── 翻頁 ── */
  function target(dir) {
    const c = L[cur];
    if (dir > 0) { if (c.pi < c.pages - 1) return { ci: c.ci, pi: c.pi + 1 }; if (c.ci < book.chapters.length - 1) return { ci: c.ci + 1, pi: 0 }; return null; }
    if (c.pi > 0) return { ci: c.ci, pi: c.pi - 1 }; if (c.ci > 0) return { ci: c.ci - 1, pi: -1 }; return null;
  }
  function resetLayers() {
    L.forEach((lf) => { lf.el.style.transform = ''; lf.inner.style.transform = ''; });
    L[cur].el.style.zIndex = 2; L[1 - cur].el.style.zIndex = 1;
    flapC.classList.add('off'); foldSh.classList.add('off');
  }
  function frame(t) {
    const dir = turning.dir, xf = Math.round(dir > 0 ? W * (1 - t) : W * t), off = W - xf;
    const top = dir > 0 ? L[cur] : L[1 - cur];
    top.el.style.transform = 'translate3d(' + (-off - 1) + 'px,0,0)';        // 多收一像素，摺線邊緣才不會露出一條字
    top.inner.style.transform = 'translate3d(' + (off + 1) + 'px,0,0)';
    flapC.style.transform = 'translate3d(' + (xf - W) + 'px,0,0)';
    flap.style.transform = 'translate3d(' + xf + 'px,0,0)';
    foldSh.style.transform = 'translate3d(' + xf + 'px,0,0)';
    const k = Math.sin(Math.PI * clamp(off / W, 0, 1));
    flapC.style.opacity = off < 1 ? 0 : 1;
    foldSh.style.opacity = xf > 2 && off > 1 ? (.3 + .7 * k).toFixed(3) : 0;
    turning.t = t;
  }
  function setup(dir) {
    const c = L[cur], a = L[1 - cur];
    if (dir > 0) { c.el.style.zIndex = 2; a.el.style.zIndex = 1; } else { a.el.style.zIndex = 2; c.el.style.zIndex = 1; }
    const tl = dir > 0 ? c : a;
    if (G.ci === tl.ci) { if (vert()) G.vp.scrollTop = tl.pi * stride; else G.vp.scrollLeft = tl.pi * stride; G.ghost.style.visibility = ''; } else G.ghost.style.visibility = 'hidden';
    flapC.classList.remove('off'); foldSh.classList.remove('off'); frame(0);
    if (ribbon) ribbon.classList.remove('on');           // 書籤緞帶跟著頁面走：翻頁時先收起來
  }
  /* 準備好另一片（要翻到的那一頁）；同一章是同步完成的 */
  function prepare(tg) {
    const alt = L[1 - cur];
    const go = () => { show(alt, tg.pi < 0 ? alt.pages - 1 : tg.pi); return true; };
    if (alt.ci === tg.ci) return go();
    return Lib.chapter(book, tg.ci).then((d) => { if (!turning || turning.tg !== tg) return false; fill(alt, tg.ci, d); return go(); });
  }
  function commit() {
    const old = L[cur]; cur = 1 - cur; const now = L[cur], changed = now.ci !== ci;
    turning = null; resetLayers(); setPin();
    if (changed) { ci = now.ci; Lib.clearFresh(book.id, Lib.ck(book, book.chapters[ci], ci)); if (ci + 1 < book.chapters.length) idle(() => book && Lib.chapter(book, ci + 1).catch(() => {})); }
    afterShow(changed);
    const my = token;
    idle(() => { if (my !== token || turning || !book || (old.ci === L[cur].ci && G.ci === L[cur].ci)) return; Lib.chapter(book, L[cur].ci).then((d) => { if (my !== token || turning || !book) return; if (L[1 - cur] === old && old.ci !== L[cur].ci) { fill(old, L[cur].ci, d); show(old, L[cur].pi); } if (G.ci !== L[cur].ci) fillGhost(L[cur].ci, d); }); });
  }
  function cancel() { turning = null; resetLayers(); updRibbon(); }
  function stopTurn() { if (animId) cancelAnimationFrame(animId); animId = 0; if (turning) { if (turning.live && turning.to === 1) commit(); else cancel(); } }
  function animate(to, ms, ease) {
    const from = turning.t, t0 = performance.now(); turning.to = to; turning.live = true;
    const step = (now) => {
      if (!turning) return;
      const p = clamp((now - t0) / ms, 0, 1), e = ease === 'out' ? 1 - Math.pow(1 - p, 3) : (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
      frame(from + (to - from) * e);
      if (p < 1) animId = requestAnimationFrame(step); else { animId = 0; if (to === 1) commit(); else cancel(); }
    };
    animId = requestAnimationFrame(step);
  }
  function edge(dir) {
    const lf = L[cur].inner;
    lf.style.transition = 'transform .16s ease-out'; lf.style.transform = 'translate3d(' + (dir > 0 ? -14 : 14) + 'px,0,0)';
    setTimeout(() => { lf.style.transform = ''; setTimeout(() => { lf.style.transition = ''; }, 180); }, 160);
    if (dir > 0) Bus.emit('reader:end', book); else toast('這是第一頁');
  }
  async function turn(dir, userAct) {
    if (!book) return;
    if (!paged()) { scroller.scrollBy({ top: dir * (scroller.clientHeight - 64), behavior: REDUCED ? 'auto' : 'smooth' }); return; }
    stopTurn();
    const tg = target(dir);
    if (!tg) return edge(dir);
    turning = { dir, tg, t: 0 };
    let ok;
    try { ok = prepare(tg); if (ok && ok.then) ok = await ok; } catch (e) { turning = null; toast(esc(e.message || '讀不到下一章'), { kind: 'bad' }); return; }
    if (!ok || !turning || turning.tg !== tg) return;
    if (userAct) userTurned();
    setup(dir);
    if (REDUCED) { commit(); return; }
    Sound.page(dir < 0);
    animate(1, 430, 'inout');
  }
  function gotoPage(pi) { if (!paged() || !book) return; stopTurn(); show(L[cur], pi); setPin(); afterShow(); }
  function userTurned() { if (marks && Bus) { followPaused = true; Bus.emit('reader:follow', false); } }
  function resumeFollow() { followPaused = false; Bus.emit('reader:follow', true); if (marks) reveal(marks, true); }

  /* ── 說書時標出正在唸的那一句，並跟著翻頁 ── */
  function paint(rootEl) {
    $$('.s.on', rootEl).forEach((e) => e.classList.remove('on'));
    if (!marks) return;
    $$('.s[data-b="' + marks.b + '"]', rootEl).forEach((sp) => { if (+sp.dataset.s < marks.e && +sp.dataset.e > marks.s) sp.classList.add('on'); });
  }
  function mark(m) {
    marks = m;
    if (!book || !m || m.bookId !== book.id) { if (book) unpaint(); return; }
    if (paged()) L.forEach((lf) => { if (lf.ci === m.ci) paint(lf.flow); else $$('.s.on', lf.flow).forEach((e) => e.classList.remove('on')); });
    else if (m.ci === ci) paint(scFlow); else unpaint();
    if (Settings.follow && !followPaused) reveal(m);
  }
  function unpaint() { $$('.s.on', root).forEach((e) => e.classList.remove('on')); }
  function unmark() { marks = null; followPaused = false; if (root) unpaint(); }
  function reveal(m, force) {
    if (!book || m.bookId !== book.id) return;
    if (m.ci !== ci) { if (!turning) { if (paged() && m.ci === ci + 1 && L[cur].pi === L[cur].pages - 1 && !force) turn(1); else open(book, m.ci, { b: m.b, s: m.s }, { keep: true }); } return; }
    if (paged()) {
      if (turning) return;
      const lf = L[cur], pg = pageOf(lf, { b: m.b, s: m.s });
      if (pg === lf.pi) return;
      if (pg === lf.pi + 1 && !force) turn(1); else gotoPage(pg);
    } else {
      const e = scElOf({ b: m.b, s: m.s }); if (!e) return;
      const y = e.offsetTop - scroller.scrollTop, h = scroller.clientHeight;
      if (force || y < h * .12 || y > h * .7) scroller.scrollTo({ top: Math.max(0, e.offsetTop - h * .3), behavior: REDUCED ? 'auto' : 'smooth' });
    }
  }

  /* ── 手勢 ── */
  const sx = () => (vert() ? -1 : 1);     // 直排的翻頁方向左右相反
  function bindPointer() {
    let p = null, lpT = 0;
    const clearLP = () => { if (lpT) { clearTimeout(lpT); lpT = 0; } };
    stage.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || !book) return;
      Sound.unlock();
      p = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), mode: '', lx: e.clientX, lt: performance.now(), vx: 0 };
      clearLP();
      lpT = setTimeout(() => { lpT = 0; if (!p || p.mode) return; const hit = document.elementFromPoint(p.x, p.y), sp = hit && hit.closest ? hit.closest('.s') : null; if (sp) { p.mode = 'long'; Bus.emit('reader:sentence', { ci: L[cur].ci, b: +sp.dataset.b, s: +sp.dataset.s, x: sp.textContent, cx: p.x, cy: p.y }); } }, 560);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!p || e.pointerId !== p.id) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y, now = performance.now();
      if (now > p.lt) { p.vx = (e.clientX - p.lx) / (now - p.lt); p.lx = e.clientX; p.lt = now; }
      if (!p.mode) {
        if (Math.abs(dx) < 9 && Math.abs(dy) < 9) return;
        clearLP();
        if (Math.abs(dx) <= Math.abs(dy)) { p.mode = 'v'; return; }
        const dir = dx * sx() < 0 ? 1 : -1;
        stopTurn();
        const tg = target(dir);
        if (!tg) { p.mode = 'edge'; edge(dir); return; }
        p.mode = 'drag'; p.dir = dir; turning = { dir, tg, t: 0, drag: true };
        try { stage.setPointerCapture(p.id); } catch (x) {}
        let ok; try { ok = prepare(tg); } catch (x) { ok = false; }
        const start = (v) => { if (!v || !turning || turning.tg !== tg) { if (turning && turning.tg === tg) turning = null; return; } userTurned(); setup(dir); turning.ready = true; if (!p || p.mode !== 'drag') { Sound.page(dir < 0); animate(1, 380, 'inout'); } };
        if (ok && ok.then) ok.then(start, () => { turning = null; }); else start(ok);
      }
      if (p.mode === 'drag' && turning && turning.ready && !turning.live) frame(clamp(Math.abs(dx) / (W * .86), 0, 1) * (dx * sx() * p.dir < 0 ? 1 : 0));
    });
    const up = (e) => {
      if (!p || e.pointerId !== p.id) return;
      clearLP();
      const q = p; p = null;
      if (q.mode === 'drag') {
        if (!turning || !turning.ready || turning.live) return;
        const fast = q.vx * sx() * q.dir < -.35, go = e.type !== 'pointercancel' && (turning.t > .28 || (fast && turning.t > .04));
        if (go) Sound.page(q.dir < 0);
        animate(go ? 1 : 0, 150 + 230 * (go ? 1 - turning.t : turning.t), 'out');
        return;
      }
      if (q.mode || e.type === 'pointercancel' || performance.now() - q.t > 500) return;
      const r = stage.getBoundingClientRect(), fx0 = (e.clientX - r.left) / r.width, fx = vert() ? 1 - fx0 : fx0;
      if (root.classList.contains('chrome-on')) { setChrome(false); return; }
      if (fx < .28) turn(-1, true); else if (fx > .72) turn(1, true); else setChrome(true);
    };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', (e) => { if (!book || !paged() || turning) return; if (Math.abs(e.deltaY) + Math.abs(e.deltaX) > 20) turn((Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) > 0 ? 1 : -1, true); }, { passive: true });
    // 捲動模式：點一下叫出工具列；長按一句可以從那裡開始說書
    let sp = null, slp = 0;
    scroller.addEventListener('pointerdown', (e) => { Sound.unlock(); sp = { x: e.clientX, y: e.clientY, t: performance.now(), top: scroller.scrollTop }; clearTimeout(slp); slp = setTimeout(() => { if (!sp || Math.abs(scroller.scrollTop - sp.top) > 4) return; const hit = document.elementFromPoint(sp.x, sp.y), s = hit && hit.closest ? hit.closest('.s') : null; if (s) { Bus.emit('reader:sentence', { ci, b: +s.dataset.b, s: +s.dataset.s, x: s.textContent, cx: sp.x, cy: sp.y }); sp = null; } }, 560); }, { passive: true });
    scroller.addEventListener('pointermove', (e) => { if (sp && (Math.abs(e.clientX - sp.x) > 9 || Math.abs(e.clientY - sp.y) > 9)) { clearTimeout(slp); } }, { passive: true });
    scroller.addEventListener('pointerup', (e) => {
      clearTimeout(slp);
      if (!sp) return; const q = sp; sp = null;
      if (Math.abs(e.clientX - q.x) > 8 || Math.abs(e.clientY - q.y) > 8 || performance.now() - q.t > 450 || Math.abs(scroller.scrollTop - q.top) > 4) { if (marks) userTurned(); return; }
      const act = e.target.closest && e.target.closest('[data-act]');
      if (act) { if (act.dataset.act === 'next-ch') chapter(1); return; }
      setChrome(!root.classList.contains('chrome-on'));
    });
  }
  function bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (!isOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.body.classList.contains('sheet-open')) return;
      const k = e.key;
      const fwd = vert() ? 'ArrowLeft' : 'ArrowRight', bwd = vert() ? 'ArrowRight' : 'ArrowLeft';
      if (k === fwd || k === 'PageDown' || k === ' ' || k === 'ArrowDown' && paged()) { e.preventDefault(); turn(1, true); }
      else if (k === bwd || k === 'PageUp' || k === 'ArrowUp' && paged()) { e.preventDefault(); turn(-1, true); }
      else if (k === 'Escape') { if (root.classList.contains('chrome-on')) setChrome(false); else close(); }
      else if (k === 'Enter') setChrome(!root.classList.contains('chrome-on'));
    });
  }
  function setChrome(on) { root.classList.toggle('chrome-on', !!on); Bus.emit('reader:chrome', !!on); }
  function chapter(d) {
    if (!book) return;
    const n = ci + d;
    if (n < 0) return toast('這是第一回');
    if (n >= book.chapters.length) return Bus.emit('reader:end', book);
    open(book, n, null, { keep: true });
  }

  return { init, open, close, reopen, relayout, applyLook, where, info, turn, gotoPage, chapter, mark, unmark, resumeFollow, setChrome, isOpen, toggleMark, pageMarks, flash, updRibbon, paged, veilOf, warmVars, fontOf: (k) => FONTS[k] || FONTS.song, get book() { return book; }, get ci() { return ci; }, get following() { return !followPaused; } };
})();
