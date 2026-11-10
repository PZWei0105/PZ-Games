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
  async function start() {
    Reader.init(); UI.init();
    try { history.replaceState({ v: 'lib' }, ''); } catch (e) {}
    await Lib.init();
    UI.show({ v: 'lib' });
    sync(false);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - lastSync > 10 * 60000) sync(false); });
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  return { start, sync };
})();
Boot.start();
