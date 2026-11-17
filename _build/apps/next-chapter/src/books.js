/* ───────── 書架資料：連載（加密的書架，解開才看得到）＋匯入的書（存在這台裝置） ─────────
   書房：books/library.pzx（總鑰匙）→ 每本書的資料夾 books/<pub>/、鑰匙 key、單行本代號 ed。
   單行本：同一個資料夾裡的 book.pzx（這一本的鑰匙），章節檔名跟書房一樣。 */

/* 跟 tools/shelf.py 的 blocks() 同一套規則：每個非空行是一塊 */
function parseBlocks(body) {
  const out = [];
  body.split('\n').forEach((ln) => {
    const s = ln.trim();
    if (!s) return;
    if (s === '---' || s === '***' || s === '* * *') out.push({ t: 'br' });
    else if (s[0] === '#') out.push({ t: 'h', x: s.replace(/^#+\s*/, '') });
    else if (/^[（(]\s*第.{1,12}[章回卷節]\s*完\s*[）)]$/.test(s) || /^[（(]\s*(全書完|未完待續|本卷完|卷.{1,6}完)\s*[）)]$/.test(s)) out.push({ t: 'end', x: s });
    else out.push({ t: 'p', x: s });
  });
  return out;
}

/* 斷句：句末標點（連同後面的引號、括號）算一句 */
const ENDERS = '。！？!?…⋯', CLOSERS = '」』”’）》〉】〕)"\'';
function sentences(text) {
  const out = []; let st = 0, i = 0; const n = text.length;
  while (i < n) {
    if (ENDERS.indexOf(text[i]) >= 0) {
      let j = i + 1;
      while (j < n && (ENDERS.indexOf(text[j]) >= 0 || text[j] === '—')) j++;
      while (j < n && CLOSERS.indexOf(text[j]) >= 0) j++;
      // 「……」後面緊接著「他說」這類短尾巴也可以是下一句；這裡只管切
      if (j < n && j - st < 4) { i = j; continue; }
      out.push([st, j]); st = j; i = j;
    } else i++;
  }
  if (st < n) { if (out.length && n - st < 3) out[out.length - 1][1] = n; else out.push([st, n]); }
  return out;
}

function chapterHTML(ch, blocks, imgURL) {
  let h = '<header class="ch-head" data-b="-1"><div class="ch-no">' + esc(ch.label || '') + '</div>' + (ch.name ? '<h2 class="ch-nm">' + esc(ch.name) + '</h2>' : '') + '<div class="ch-orn" aria-hidden="true"><i></i><b></b><i></i></div></header>';
  blocks.forEach((b, i) => {
    if (b.t === 'p' || b.t === 'q') {
      const ss = sentences(b.x); let inner = '';
      ss.forEach((r) => { inner += '<span class="s" data-b="' + i + '" data-s="' + r[0] + '" data-e="' + r[1] + '">' + esc(b.x.slice(r[0], r[1])) + '</span>'; });
      h += '<p' + (b.t === 'q' ? ' class="quote"' : '') + ' data-b="' + i + '">' + inner + '</p>';
    } else if (b.t === 'br') h += '<div class="brk" data-b="' + i + '" aria-hidden="true"><i></i><i></i><i></i></div>';
    else if (b.t === 'h') h += '<h3 class="sub" data-b="' + i + '"><span class="s" data-b="' + i + '" data-s="0" data-e="' + b.x.length + '">' + esc(b.x) + '</span></h3>';
    else if (b.t === 'end') h += '<p class="endmark" data-b="' + i + '">' + esc(b.x.replace(/^[（(]\s*|\s*[）)]$/g, '')) + '</p>';
    else if (b.t === 'img') { const u = imgURL && imgURL(b.k); if (u) h += '<figure class="fig" data-b="' + i + '"><img src="' + u + '" alt="' + esc(b.alt || '') + '"></figure>'; }
  });
  return h;
}

const Lib = (() => {
  let remote = Store.get('lib', null) || { books: [] };
  if (remote.v !== 2) remote = { books: [] };                 // 上鎖以前的舊目錄：不用
  let local = [];
  const mem = new Map();           // 章節內容的小快取
  const urls = new Map();          // 匯入書的圖片 blob URL
  const ck = (book, ch, i) => book.remote ? 'n' + ch.n : 'i' + i;

  function all() {
    const r = (remote.books || []).map((b) => Object.assign({ remote: true }, b));
    return r.concat(local);
  }
  const find = (id) => all().find((b) => b.id === id);
  const total = (b) => b.chapters.reduce((s, c) => s + (c.chars || 0), 0);

  async function init() {
    if (ED) return;                                            // 單行本沒有匯入的書
    try { local = (await DB.all('books')) || []; local.sort((a, b) => (b.added || '').localeCompare(a.added || '')); } catch (e) { local = []; Bus.emit('idb-fail', e); }
  }

  /* 向書架要最新的目錄（解開）；回傳這次新到的章節。
     locked：還沒輸入密語；badKey：鑰匙換了（書房換鎖、單行本連結被收回）；gone：單行本已經下架 */
  async function sync() {
    let fresh;
    const t = '?t=' + Math.floor(Date.now() / 60000);
    try {
      if (ED) {
        if (!ED.k) return { ok: false, badKey: true, news: [] };
        const r = await fetch('book.pzx' + t, { cache: 'no-store' });
        if (r.status === 404 || r.status === 410) return { ok: false, gone: true, news: [] };
        if (!r.ok) throw new Error(r.status);
        const j = await Crypt.json(ED.k, await r.arrayBuffer());
        fresh = { v: 2, updated: j.updated, books: [Object.assign(j.book, { id: ED.ed, key: ED.k, base: '' })] };
      } else {
        const km = Vault.km();
        if (!km) return { ok: false, locked: true, news: [] };
        const r = await fetch('books/library.pzx' + t, { cache: 'no-store' });
        if (!r.ok) throw new Error(r.status);
        fresh = await Crypt.json(km, await r.arrayBuffer());
        (fresh.books || []).forEach((b) => { b.base = 'books/' + b.pub + '/'; });
      }
    } catch (e) { return { ok: false, badKey: e && e.code === 'key', news: [] }; }
    const known = Store.get('known', null), news = [], next = known || {};
    (fresh.books || []).forEach((b) => {
      const have = next[b.id];
      if (!have) { next[b.id] = b.chapters.map((c) => 'n' + c.n); if (known) b.chapters.forEach((c) => news.push({ book: b, ch: c, first: true })); return; }
      b.chapters.forEach((c) => { if (have.indexOf('n' + c.n) < 0) { have.push('n' + c.n); news.push({ book: b, ch: c }); } });
    });
    Store.set('known', next);
    if (news.length) { const fl = Store.get('fresh', {}); news.forEach((x) => { (fl[x.book.id] = fl[x.book.id] || []).push('n' + x.ch.n); }); Store.set('fresh', fl); }
    const changed = JSON.stringify(fresh) !== JSON.stringify(remote);
    remote = fresh; Store.set('lib', fresh);
    return { ok: true, news, changed };
  }

  function freshSet(id) { return (Store.get('fresh', {})[id]) || []; }
  function clearFresh(id, key) { const fl = Store.get('fresh', {}); if (!fl[id]) return; fl[id] = fl[id].filter((k) => k !== key); if (!fl[id].length) delete fl[id]; Store.set('fresh', fl); }

  async function chapter(book, i) {
    const ch = book.chapters[i], key = book.id + ':' + (book.remote ? ch.v : i + ':' + (book.conv || ''));
    if (mem.has(key)) return mem.get(key);
    let blocks;
    if (book.remote) {
      const r = await fetch(book.base + ch.f + '?v=' + ch.v);
      if (!r.ok) throw new Error('這一回還沒下載，連上網路再試一次');
      blocks = parseBlocks(await Crypt.text(book.key, await r.arrayBuffer()));
    } else {
      const rec = await DB.get('chaps', book.id + ':' + String(i).padStart(5, '0'));
      if (!rec) throw new Error('找不到這一章的內容');
      blocks = rec.blocks;
      for (const b of blocks) if (b.t === 'img' && !urls.has(b.k)) { try { const blob = await DB.get('assets', b.k); if (blob) urls.set(b.k, URL.createObjectURL(blob)); } catch (e) {} }
      if (book.conv) { const cv = await Conv.converter(book.conv); blocks = blocks.map((b) => (b.x ? Object.assign({}, b, { x: cv(b.x) }) : b)); }
    }
    const val = { blocks };
    mem.set(key, val); if (mem.size > 8) mem.delete(mem.keys().next().value);
    return val;
  }
  const imgURL = (k) => urls.get(k);

  async function timeline(book, i) {
    const ch = book.chapters[i];
    if (!book.remote || !ch.au) return null;
    try { const r = await fetch(book.base + ch.au.tl + '?v=' + ch.au.v); if (!r.ok) return null; return await r.json(); } catch (e) { return null; }
  }
  const audioURL = (book, i) => { const ch = book.chapters[i]; return book.remote && ch.au ? book.base + ch.au.f + '?v=' + ch.au.v : null; };

  /* 把連載的文字全部先抓下來，離線也能讀（一章只有幾 KB） */
  async function prefetch() {
    const got = Store.get('cached', {});
    let n = 0;
    for (const b of (remote.books || [])) for (const c of b.chapters) {
      const k = b.base + c.f;
      if (got[k] === c.v) continue;
      try { const r = await fetch(b.base + c.f + '?v=' + c.v); if (r.ok) { await r.arrayBuffer(); got[k] = c.v; n++; } } catch (e) { Store.set('cached', got); return n; }
    }
    // 前情提要也存一份，離線一樣看得到
    for (const b of (remote.books || [])) {
      if (!b.recaps) continue;
      const k = b.base + b.recaps.f;
      if (got[k] === b.recaps.v) continue;
      try { const r = await fetch(b.base + b.recaps.f + '?v=' + b.recaps.v); if (r.ok) { await r.arrayBuffer(); got[k] = b.recaps.v; } } catch (e) { break; }
    }
    for (const b of (remote.books || [])) {
      if (!b.audit) continue;
      const k = b.base + b.audit.f;
      if (got[k] === b.audit.v) continue;
      try { const r = await fetch(b.base + b.audit.f + '?v=' + b.audit.v); if (r.ok) { await r.arrayBuffer(); got[k] = b.audit.v; } } catch (e) { break; }
    }
    Store.set('cached', got);
    return n;
  }

  async function addLocal(book, chapBlocks, assets) {
    const items = [['books', book.id, book]];
    chapBlocks.forEach((blocks, i) => items.push(['chaps', book.id + ':' + String(i).padStart(5, '0'), { blocks }]));
    (assets || []).forEach((a) => items.push(['assets', a.k, a.blob]));
    await DB.putMany(items);
    local = local.filter((b) => b.id !== book.id); local.unshift(book);
  }
  async function removeLocal(id) {
    await DB.del('books', id); await DB.delPrefix('chaps', id + ':'); await DB.delPrefix('assets', id + '/');
    local = local.filter((b) => b.id !== id);
    const p = Store.get('prog', {}); delete p[id]; Store.set('prog', p);
    const d = Store.get('done', {}); delete d[id]; Store.set('done', d);
    const bm = Store.get('bm', {}); delete bm[id]; Store.set('bm', bm);
    const g = Store.get('genre', {}); delete g[id]; Store.set('genre', g);
  }
  /* 匯入書的資料改了（分類、簡轉繁）：存回這台裝置 */
  async function saveLocal(book) {
    const clean = Object.assign({}, book); delete clean.remote;
    await DB.put('books', book.id, clean);
    const k = local.findIndex((b) => b.id === book.id); if (k >= 0) local[k] = clean;
    for (const key of Array.from(mem.keys())) if (key.indexOf(book.id + ':') === 0) mem.delete(key);
    return clean;
  }

  /* ── 匯入的書出了新版（例如連載的 TXT 更新了）：換成新版，進度、書籤、分類、繁簡都留著 ──
     章節照章名對：原文章名（轉繁體前）一樣、順序往後的就是同一章；作者改了章名或插了番外，其他章照樣對得上 */
  const chName0 = (c) => (((c.label0 != null ? c.label0 : c.label) || '') + '|' + ((c.name0 != null ? c.name0 : c.name) || '')).replace(/\s+/g, '');
  function matchChapters(oldCh, newCh) {
    const pos = new Map();
    newCh.forEach((c, j) => { const k = chName0(c); if (!pos.has(k)) pos.set(k, []); pos.get(k).push(j); });
    const map = [], used = new Set(); let after = -1, hit = 0;
    oldCh.forEach((c) => {
      const list = pos.get(chName0(c)) || [], j = list.find((x) => x > after && !used.has(x));
      if (j == null) { map.push(null); return; }
      map.push(j); used.add(j); after = j; hit++;
    });
    return { map, used, hit };
  }
  /* 先算一遍，不動資料：給畫面判斷「是不是同一本書」、預告會多幾章 */
  function previewUpdate(old, nb) {
    const m = matchChapters(old.chapters, nb.chapters);
    return { hit: m.hit, oldN: old.chapters.length, newN: nb.chapters.length, added: nb.chapters.length - m.used.size };
  }
  async function replaceLocal(old, nb, chapBlocks, assets) {
    const id = old.id, m = matchChapters(old.chapters, nb.chapters);
    // 找不到的舊章（被作者刪掉或改名）：落在前面最近一個對得上的章
    const near = m.map.slice(); let lastJ = 0;
    near.forEach((j, i) => { if (j == null) near[i] = Math.min(lastJ, Math.max(0, nb.chapters.length - 1)); else lastJ = j; });
    const remap = (key) => { const i = /^i(\d+)$/.test(key || '') ? +key.slice(1) : -1; return i >= 0 && i < near.length ? 'i' + near[i] : null; };
    // 書的資料：章節換新，書名、作者、封面、加入日期照舊（TXT 的書名常常是檔名，像「更新至358章」）
    const book = Object.assign({}, nb, { id, title: old.title, author: old.author || nb.author, title0: old.title0 != null ? old.title0 : nb.title0, author0: old.author0 != null ? old.author0 : nb.author0,
      added: old.added, upd: new Date().toISOString(), cover: nb.cover && nb.cover.img ? nb.cover : old.cover, genre: old.genre || nb.genre });
    delete book.remote;
    const items = [['books', id, book]];
    chapBlocks.forEach((blocks, i) => items.push(['chaps', id + ':' + String(i).padStart(5, '0'), { blocks }]));
    (assets || []).forEach((a) => items.push(['assets', a.k, a.blob]));
    await DB.putMany(items);                                   // 先寫新的，寫成功才清掉多出來的舊章
    for (let i = chapBlocks.length; i < old.chapters.length; i++) { try { await DB.del('chaps', id + ':' + String(i).padStart(5, '0')); } catch (e) {} }
    // 進度、讀完的章、書籤搬到新的章號
    const p = Store.get('prog', {});
    if (p[id]) { const ok = m.map[+String(p[id].ck).slice(1)] != null, k = remap(p[id].ck); if (k) { p[id].ck = k; if (!ok) { p[id].b = 0; p[id].s = 0; p[id].f = 0; } } Store.set('prog', p); }
    const d = Store.get('done', {});
    if (d[id]) { d[id] = d[id].map((k) => { const i = +String(k).slice(1); return m.map[i] != null ? 'i' + m.map[i] : null; }).filter(Boolean); Store.set('done', d); }
    const bm = Store.get('bm', {});
    if (bm[id]) { bm[id].forEach((x) => { const i = +String(x.ck).slice(1); if (m.map[i] != null) x.ck = 'i' + m.map[i]; else { const k = remap(x.ck); if (k) { x.ck = k; x.b = 0; x.s = 0; } } }); Store.set('bm', bm); }
    // 新出現的章節標上「新」（之前還沒讀的「新」也搬過去）
    const fl = Store.get('fresh', {}), keep = (fl[id] || []).map((k) => { const i = +String(k).slice(1); return m.map[i] != null ? 'i' + m.map[i] : null; }).filter(Boolean);
    const added = []; nb.chapters.forEach((c, j) => { if (!m.used.has(j)) added.push('i' + j); });
    const all = Array.from(new Set(keep.concat(added)));
    if (all.length) fl[id] = all; else delete fl[id];
    Store.set('fresh', fl);
    local = local.filter((b) => b.id !== id); local.unshift(book);
    for (const key of Array.from(mem.keys())) if (key.indexOf(id + ':') === 0) mem.delete(key);
    return { book, added: added.length, hit: m.hit };
  }
  /* 藏書裡同一本書（照書名對，轉繁體前的原名也算） */
  function sameTitle(nb) {
    const norm = (t) => String(t || '').replace(/^(.+?)[（(【\[_\-—－\s]+(更新|最新|連載|连载|完結|完结|全本|完本|全集|精校|校對|校对|txt).*$/i, '$1').replace(/^(.+?)(?:[_\-—－\s]+\d+(?:[-~～]\d+)?|[_\-—－\s]*第\d+[章回卷節节])$/, '$1').replace(/[\s《》「」『』【】\[\]（）()_\-—－·・.,，。:：!！?？]/g, '').toLowerCase();
    const a = [norm(nb.title), norm(nb.title0)].filter(Boolean);
    return local.find((b) => b.id !== nb.id && [norm(b.title), norm(b.title0)].some((t) => t && a.indexOf(t) >= 0)) || null;
  }

  /* ── 時間：最近更新、最早上架、最近讀過 ── */
  const chAt = (c) => toMs(c.at || c.added);
  function updated(b) { if (!b.remote) return toMs(b.upd || b.added); let t = 0; b.chapters.forEach((c) => { t = Math.max(t, chAt(c) + c.n); }); return t; }
  function created(b) { if (!b.remote) return toMs(b.added); let t = Infinity; b.chapters.forEach((c) => { t = Math.min(t, chAt(c)); }); return isFinite(t) ? t : 0; }
  function readAt(b) { const p = Prog.get(b.id); return p ? p.t || 0 : 0; }

  /* ── 前情提要（連載才有；加密在書的資料夾 recaps.pzx） ── */
  const recapMem = {};
  async function recaps(b) {
    if (!b.remote || !b.recaps) return null;
    const k = b.id + ':' + b.recaps.v;
    if (recapMem[k]) return recapMem[k];
    try { const r = await fetch(b.base + b.recaps.f + '?v=' + b.recaps.v); if (!r.ok) return null; const j = await Crypt.json(b.key, await r.arrayBuffer()); recapMem[k] = j.recaps || {}; return recapMem[k]; } catch (e) { return null; }
  }

  /* ── 整回的純文字（複製、分享用） ── */
  async function chapterText(b, i) {
    const ch = b.chapters[i], d = await chapter(b, i), out = [];
    out.push('《' + b.title + '》' + (ch.label ? ch.label + '　' : '') + (ch.name || ''));
    d.blocks.forEach((x) => {
      if (x.t === 'p' || x.t === 'q' || x.t === 'h') out.push(x.x);
      else if (x.t === 'br') out.push('＊　＊　＊');
      else if (x.t === 'end') out.push(x.x);
    });
    return out.join('\n\n') + '\n';
  }

  /* ── 書內搜尋：一回一回找，找到的位置可以直接翻過去 ── */
  async function search(b, q, onStep, isStale) {
    q = (q || '').trim(); if (!q) return { hits: [], more: false };
    const hits = [], LIMIT = 300, low = /[a-z]/i.test(q), qq = low ? q.toLowerCase() : q;
    for (let i = 0; i < b.chapters.length; i++) {
      if (isStale && isStale()) return null;
      let d; try { d = await chapter(b, i); } catch (e) { continue; }
      d.blocks.forEach((x, bi) => {
        if (!x.x || (x.t !== 'p' && x.t !== 'q' && x.t !== 'h') || hits.length > LIMIT) return;
        const hay = low ? x.x.toLowerCase() : x.x; let at = hay.indexOf(qq);
        while (at >= 0 && hits.length <= LIMIT) { hits.push({ ci: i, b: bi, s: at, len: q.length, pre: x.x.slice(Math.max(0, at - 16), at), hit: x.x.substr(at, q.length), post: x.x.slice(at + q.length, at + q.length + 30), cut: at > 16 }); at = hay.indexOf(qq, at + q.length); }
      });
      if (onStep) onStep(i + 1, b.chapters.length, hits.length);
      if (hits.length > LIMIT) break;
    }
    return { hits: hits.slice(0, LIMIT), more: hits.length > LIMIT };
  }

  async function coverURL(book) {
    if (!book.cover || !book.cover.img) return null;
    if (urls.has(book.cover.img)) return urls.get(book.cover.img);
    try { const blob = await DB.get('assets', book.cover.img); if (blob) { const u = URL.createObjectURL(blob); urls.set(book.cover.img, u); return u; } } catch (e) {}
    return null;
  }
  /* 書房上鎖、單行本失效：把解開的目錄從這台裝置拿掉 */
  /* ── 巡查報告（只有書房有；用總鑰匙加密在書的資料夾 audit.pzx，單行本的鑰匙解不開） ── */
  const auditMem = {};
  async function audits(b) {
    if (ED || !b.remote || !b.audit) return null;
    const km = Vault.km(); if (!km) return null;
    const k = b.id + ':' + b.audit.v;
    if (auditMem[k]) return auditMem[k];
    try { const r = await fetch(b.base + b.audit.f + '?v=' + b.audit.v); if (!r.ok) return null; const j = await Crypt.json(km, await r.arrayBuffer()); auditMem[k] = j.reports || []; return auditMem[k]; } catch (e) { return null; }
  }

  function forget() { remote = { books: [] }; mem.clear(); Object.keys(recapMem).forEach((k) => delete recapMem[k]); Object.keys(auditMem).forEach((k) => delete auditMem[k]); Store.del('lib'); }
  const site = () => remote.site || '';
  return { all, find, total, init, sync, chapter, timeline, audioURL, prefetch, addLocal, removeLocal, saveLocal, replaceLocal, previewUpdate, sameTitle, imgURL, coverURL, ck, freshSet, clearFresh, updated, created, readAt, recaps, audits, chapterText, search, forget, site, hasRemote: () => (remote.books || []).length > 0 };
})();

/* ── 閱讀進度：每本書記到哪一章、哪一句 ── */
const Prog = {
  get(id) { return Store.get('prog', {})[id] || null; },
  set(id, v) { const p = Store.get('prog', {}); p[id] = Object.assign({ t: Date.now() }, v); Store.set('prog', p); Store.set('last', id); },
  index(book) { const p = Prog.get(book.id); if (!p) return -1; const i = book.chapters.findIndex((c, j) => Lib.ck(book, c, j) === p.ck); return i; },
  done(id) { return Store.get('done', {})[id] || []; },
  markDone(id, key) { const d = Store.get('done', {}); const a = d[id] = d[id] || []; if (a.indexOf(key) < 0) { a.push(key); Store.set('done', d); } },
  /* 整本書讀了幾成（照字數算） */
  pct(book) {
    const p = Prog.get(book.id); if (!p) return 0;
    const i = Prog.index(book); if (i < 0) return 0;
    const tot = Lib.total(book) || 1; let before = 0;
    for (let j = 0; j < i; j++) before += book.chapters[j].chars || 0;
    return clamp((before + (book.chapters[i].chars || 0) * (p.f || 0)) / tot, 0, 1);
  },
  last() { return Store.get('last', null); },
};

/* ── 分類：連載用書架上寫的，匯入的書自己選；也可以在這台裝置上改 ── */
const Genre = (() => {
  const ORDER = ['科幻', '奇幻', '仙俠', '武俠', '架空歷史', '歷史', '懸疑', '恐怖', '都市', '言情', '喜劇', '文學', '知識', '其他'];
  const MAP = [
    [/科幻|science.?fiction|sci-?fi|太空|星際/i, '科幻'], [/仙俠|仙侠|修仙|修真/, '仙俠'], [/武俠|武侠|wuxia/i, '武俠'],
    [/奇幻|魔幻|玄幻|fantasy/i, '奇幻'], [/架空|穿越/, '架空歷史'], [/歷史|历史|history|historical/i, '歷史'],
    [/懸疑|悬疑|推理|偵探|侦探|犯罪|驚悚|惊悚|mystery|thriller|crime|detective/i, '懸疑'], [/恐怖|靈異|灵异|鬼|horror/i, '恐怖'],
    [/言情|愛情|爱情|romance/i, '言情'], [/喜劇|喜剧|幽默|搞笑|comedy|humou?r/i, '喜劇'], [/都市|現代|现代|urban/i, '都市'],
    [/商業|商业|理財|理财|投資|投资|心理|傳記|传记|自我|成長|成长|科普|non-?fiction|business|biography|self-help|science|economics|psychology/i, '知識'],
    [/文學|文学|小說|小说|fiction|literature|literary|novel/i, '文學'],
  ];
  const fromText = (s) => { for (const [re, g] of MAP) if (re.test(s || '')) return g; return ''; };
  const over = () => Store.get('genre', {});
  function of(b) { const o = over()[b.id]; return o || b.genre || '未分類'; }
  function set(b, g) { const o = over(); if (!g || (b.remote && g === b.genre)) delete o[b.id]; else o[b.id] = g; Store.set('genre', o); }
  function rank(g) { const i = ORDER.indexOf(g); return i < 0 ? (g === '未分類' ? 999 : 500) : i; }
  function list(books) {
    const m = new Map();
    books.forEach((b) => { const g = of(b); m.set(g, (m.get(g) || 0) + 1); });
    return Array.from(m.entries()).sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0], 'zh-Hant')).map(([g, n]) => ({ g, n }));
  }
  return { ORDER, of, set, list, fromText };
})();

/* ── 書籤：記在這台裝置，用「哪一回、哪一塊、第幾個字」記位置，改字級也不會跑 ── */
const Marks = {
  all() { return Store.get('bm', {}); },
  of(id) { return (Marks.all()[id] || []).slice(); },
  add(book, ci, a) {
    const m = Marks.all(), list = m[book.id] = m[book.id] || [], ck = Lib.ck(book, book.chapters[ci], ci);
    if (list.some((x) => x.ck === ck && x.b === a.b && x.s === a.s)) return false;
    list.push({ ck, b: a.b, s: a.s || 0, x: (a.x || '').slice(0, 60), t: Date.now() });
    Store.set('bm', m); return true;
  },
  remove(id, t) { const m = Marks.all(); if (!m[id]) return; m[id] = m[id].filter((x) => x.t !== t); if (!m[id].length) delete m[id]; Store.set('bm', m); },
  /* 書籤在第幾回（找不到那一回就是 -1，例如匯入的書被刪掉重來） */
  index(book, mk) { return book.chapters.findIndex((c, j) => Lib.ck(book, c, j) === mk.ck); },
  sorted(book) { return Marks.of(book.id).map((mk) => Object.assign({ ci: Marks.index(book, mk) }, mk)).filter((mk) => mk.ci >= 0).sort((a, b) => a.ci - b.ci || a.b - b.b || a.s - b.s); },
};
