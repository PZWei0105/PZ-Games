/* ───────── 開機 ───────── */
const Boot = (() => {
  let lastSync = 0;
  function announce(news) {
    const real = news.filter((x) => !x.first);
    if (!real.length) return;
    const by = {}; real.forEach((x) => { (by[x.book.id] = by[x.book.id] || { book: x.book, list: [] }).list.push(x.ch); });
    Object.keys(by).forEach((id) => {
      const g = by[id], c = g.list[g.list.length - 1];
      toast('《' + esc(g.book.title) + '》' + (g.list.length > 1 ? '新到 ' + g.list.length + ' 回' : '新的一回：' + esc((c.label || '') + (c.name ? '　' + c.name : ''))), { action: '去看', onAction: () => UI.go({ v: 'book', id }), ms: 9000 });
    });
    Sound.chime();
  }
  async function sync(manual) {
    lastSync = Date.now();
    const r = await Lib.sync();
    if (!r.ok) { if (manual || !Lib.hasRemote()) toast(navigator.onLine === false ? '現在沒有網路，先讀已經存下來的' : '連不上書架，等一下再試', { kind: manual ? 'bad' : '' }); return; }
    if (r.changed || r.news.length) UI.refresh();
    announce(r.news);
    if (manual && !r.news.filter((x) => !x.first).length) toast('書架沒有新的一回');
    Lib.prefetch();
  }
  /* 這次更新之前就匯入的書：看看是不是簡體，是的話一樣轉成繁體 */
  async function legacySimp() {
    for (const b of Lib.all().filter((x) => !x.remote && x.simp === undefined)) {
      let sample = b.title || '';
      try { for (let i = 0; i < Math.min(4, b.chapters.length) && sample.length < 60000; i++) sample += (await Lib.chapter(b, i)).blocks.map((x) => x.x || '').join(''); } catch (e) { continue; }
      b.simp = Conv.looksSimplified(sample);
      try { if (b.simp) await Importer.applyConv(b, 'tw'); await Lib.saveLocal(b); } catch (e) { continue; }
      if (b.simp) { UI.refresh(); toast('《' + esc(b.title) + '》是簡體書，已經轉成繁體；書頁上可以換回原文', { ms: 6500 }); }
    }
  }

  /* iPhone 加到主畫面的 App：鍵盤收起來、或從背景切回來之後，畫面偶爾縮短一截，底下露出黑邊。
     看到畫面比原本矮，就把捲動歸零、把版面重排一次。 */
  const Heal = (() => {
    let maxH = innerHeight, w = innerWidth, t1 = 0, t2 = 0;
    function typing() { const a = document.activeElement; return a && (a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || (a.tagName === 'INPUT' && !/^(range|button|checkbox|radio|file)$/.test(a.type))); }
    function heal() {
      if (typing() || (window.visualViewport && visualViewport.scale > 1.01)) return;     // 正在打字、或手指放大著：不動
      if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
      const se = document.scrollingElement; if (se && se.scrollTop) se.scrollTop = 0;
      if (innerHeight >= maxH - 4) return;
      const app = $('#app'), keep = $$('.view, #sheetBody, .rd-scroll, .gb-in').map((e) => [e, e.scrollTop, e.scrollLeft]);
      app.style.display = 'none'; void app.offsetHeight; app.style.display = '';
      keep.forEach((k) => { k[0].scrollTop = k[1]; k[0].scrollLeft = k[2]; });
      if (Reader.isOpen()) Reader.relayout();
    }
    const soon = () => { clearTimeout(t1); clearTimeout(t2); t1 = setTimeout(heal, 140); t2 = setTimeout(heal, 600); };
    function init() {
      if (!IS_IOS) return;
      window.addEventListener('resize', () => { if (Math.abs(innerWidth - w) > 4) { w = innerWidth; maxH = innerHeight; } else if (innerHeight > maxH) maxH = innerHeight; });
      document.addEventListener('focusout', soon);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') soon(); });
      window.addEventListener('pageshow', soon);
      if (window.visualViewport) visualViewport.addEventListener('resize', () => { if (!typing()) soon(); });
    }
    return { init, heal };
  })();

  async function start() {
    Reader.init(); UI.init(); Heal.init();
    try { history.replaceState({ v: 'lib' }, ''); } catch (e) {}
    await Lib.init();
    UI.show({ v: 'lib' });
    sync(false);
    setTimeout(() => legacySimp().catch(() => {}), 1500);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - lastSync > 10 * 60000) sync(false); });
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  return { start, sync };
})();
Boot.start();
