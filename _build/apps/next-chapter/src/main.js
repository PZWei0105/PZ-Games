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
  async function sync(manual, first) {
    lastSync = Date.now();
    const r = await Lib.sync();
    if (!r.ok) {
      if (r.locked) return r;
      if (ED && (r.badKey || r.gone)) { if (!first) await Edition.dead(r.gone ? 'gone' : 'bad'); return r; }
      if (r.badKey) {                                          // 書房換了鎖（總鑰匙換了）：收起舊書架，請他輸入新的密語
        Vault.clear(); Lib.forget(); Narrator.stop(); UI.show({ v: 'lib' });
        await Gate.lock('書房換了新的鎖，請輸入新的密語。');
        const r2 = await sync(true); Gate.open(); return r2;
      }
      if (manual || !Lib.hasRemote()) toast(navigator.onLine === false ? '現在沒有網路，先讀已經存下來的' : '連不上書架，等一下再試', { kind: manual ? 'bad' : '' });
      return r;
    }
    if (r.changed || r.news.length) UI.refresh();
    announce(r.news);
    if (manual && !r.news.filter((x) => !x.first).length) toast(ED ? '還沒有新的一回' : '書架沒有新的一回');
    Lib.prefetch();
    return r;
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

  const later = () => document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - lastSync > 10 * 60000) sync(false); });
  const sw = () => { if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {}); };

  async function start() {
    Reader.init(); UI.init(); Gate.init(); Heal.init();
    if (ED) return Edition.start();
    try { history.replaceState({ v: 'lib' }, ''); } catch (e) {}
    sw();
    if (!Crypt.ok()) { toast('這個瀏覽器不支援加密，打不開書架；請用 Safari 或 Chrome 開', { kind: 'bad', ms: 12000 }); }
    else if (!Vault.km()) {                                  // 還沒輸入過密語：先關在門外，連舊的書架目錄也不留
      Lib.forget();
      await Gate.lock();
      await Lib.init(); UI.show({ v: 'lib' });
      await sync(false);
      UI.show({ v: 'lib' }); await Gate.open();
      later(); setTimeout(() => legacySimp().catch(() => {}), 1500);
      return;
    }
    await Lib.init();
    UI.show({ v: 'lib' });
    sync(false);
    setTimeout(() => legacySimp().catch(() => {}), 1500);
    later();
  }

  /* ── 單行本：鑰匙在網址 #k= 後面；記在這台裝置，網址少了也補回去（加到主畫面才帶得走） ── */
  const Edition = {
    /* 網址的鑰匙優先；網址沒有就用這台裝置記得的（也寫回網址，加到主畫面才帶得走） */
    key() {
      const m = location.hash.match(/k=([A-Za-z0-9_-]{22})/), had = Store.get('k', null);
      const k = m && Crypt.validKey(m[1]) ? m[1] : had && Crypt.validKey(had) ? had : null;
      if (k) Edition.keep(k);
      return k;
    },
    keep(k) {
      if (!/k=[A-Za-z0-9_-]{22}/.test(location.hash) || location.hash.indexOf('k=' + k) < 0) { try { history.replaceState(history.state, '', location.pathname + location.search + '#k=' + k); } catch (e) {} }
      try { document.cookie = 'pzsb_' + ED.ed + '=' + k + '; path=' + location.pathname.replace(/[^/]*$/, '') + '; max-age=315360000; samesite=lax' + (location.protocol === 'https:' ? '; secure' : ''); } catch (e) {}
    },
    cookie() { const m = document.cookie.match(new RegExp('(?:^|; )pzsb_' + ED.ed + '=([A-Za-z0-9_-]{22})')); return m ? m[1] : null; },
    async start() {
      try { history.replaceState({ v: 'book', id: ED.ed }, ''); } catch (e) {}
      document.body.classList.add('ed');
      if (ED.cover && /^#[0-9a-f]{6}$/i.test(ED.cover.cloth || '')) document.body.style.setProperty('--cloth', ED.cover.cloth);
      if (!Crypt.ok()) { Gate.edition('offline'); toast('這個瀏覽器不支援加密，請用 Safari 或 Chrome 打開', { kind: 'bad', ms: 12000 }); return; }
      const k = Edition.key() || Edition.cookie();
      if (!k) { Gate.edition('missing'); return; }
      ED.k = k; Edition.keep(k);
      sw();
      if (Store.get('k', null) !== k) Lib.forget();           // 換了一把鑰匙：舊的目錄不能用
      const had = Lib.hasRemote();
      if (had) UI.show({ v: 'book', id: ED.ed }); else Gate.edition('load');
      let r = await sync(false, true);
      // 網址上的鑰匙開不了、但這台裝置記得另一把開得了的：用記得的那把（網址可能被剪壞了）
      const alt = [Store.get('k', null), Edition.cookie()].find((x) => x && x !== ED.k && Crypt.validKey(x));
      if (r && r.badKey && alt) { ED.k = alt; Edition.keep(alt); r = await sync(false, true); }
      if (r && r.ok) Store.set('k', ED.k);
      else if (r && (r.badKey || r.gone)) { await Edition.dead(r.gone ? 'gone' : 'bad'); return; }
      if (r && r.ok) { if (!had) { UI.show({ v: 'book', id: ED.ed }); Gate.fade(); } }
      else if (r && !r.badKey && !r.gone && !had) Gate.edition('offline');
      later();
    },
    /* 連結被收回、換了鑰匙：把存下來的書和鑰匙都清掉，跟讀者說要新的連結 */
    async dead(kind) {
      Narrator.stop(); Lib.forget(); Store.del('k'); Store.del('cached');
      try { document.cookie = 'pzsb_' + ED.ed + '=; path=' + location.pathname.replace(/[^/]*$/, '') + '; max-age=0'; } catch (e) {}
      if (Reader.isOpen()) Reader.close();
      Gate.edition(kind);
      if (kind !== 'gone') return;
      try { const ks = await caches.keys(); await Promise.all(ks.filter((x) => x.indexOf('pzsb-' + ED.ed + '-') === 0).map((x) => caches.delete(x))); } catch (e) {}
      try { const rs = await navigator.serviceWorker.getRegistrations(); rs.forEach((r) => { if (new URL(r.scope).pathname === location.pathname.replace(/[^/]*$/, '')) r.unregister(); }); } catch (e) {}
    },
  };
  return { start, sync };
})();
Boot.start();
