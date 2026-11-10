/* ───────── 書架資料：連載（從 GitHub 上的書架抓）＋匯入的書（存在這台裝置） ───────── */
const KEY = [112, 122, 45, 110, 101, 120, 116, 45, 99, 104, 97, 112, 116, 101, 114, 33]; // "pz-next-chapter!"

function unpackPZC(buf) {
  const u = new Uint8Array(buf);
  if (u[0] !== 80 || u[1] !== 90 || u[2] !== 67 || u[3] !== 49) throw new Error('章節檔格式不對');
  const raw = new Uint8Array(u.length - 4);
  for (let i = 0; i < raw.length; i++) raw[i] = u[i + 4] ^ KEY[i % 16];
  return new TextDecoder('utf-8').decode(fflate.inflateSync(raw));
}

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
    try { local = (await DB.all('books')) || []; local.sort((a, b) => (b.added || '').localeCompare(a.added || '')); } catch (e) { local = []; Bus.emit('idb-fail', e); }
  }

  /* 向書架要最新的目錄；回傳這次新到的章節 */
  async function sync() {
    let fresh;
    try {
      const r = await fetch('books/library.json?t=' + Math.floor(Date.now() / 60000), { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      fresh = await r.json();
    } catch (e) { return { ok: false, news: [] }; }
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
    const ch = book.chapters[i], key = book.id + ':' + (book.remote ? ch.v : i);
    if (mem.has(key)) return mem.get(key);
    let blocks;
    if (book.remote) {
      const r = await fetch('books/' + book.id + '/' + ch.f + '?v=' + ch.v);
      if (!r.ok) throw new Error('這一章還沒下載，連上網路再試一次');
      blocks = parseBlocks(unpackPZC(await r.arrayBuffer()));
    } else {
      const rec = await DB.get('chaps', book.id + ':' + String(i).padStart(5, '0'));
      if (!rec) throw new Error('找不到這一章的內容');
      blocks = rec.blocks;
      for (const b of blocks) if (b.t === 'img' && !urls.has(b.k)) { try { const blob = await DB.get('assets', b.k); if (blob) urls.set(b.k, URL.createObjectURL(blob)); } catch (e) {} }
    }
    const val = { blocks };
    mem.set(key, val); if (mem.size > 8) mem.delete(mem.keys().next().value);
    return val;
  }
  const imgURL = (k) => urls.get(k);

  async function timeline(book, i) {
    const ch = book.chapters[i];
    if (!book.remote || !ch.au) return null;
    try { const r = await fetch('books/' + book.id + '/' + ch.au.tl + '?v=' + ch.au.v); if (!r.ok) return null; return await r.json(); } catch (e) { return null; }
  }
  const audioURL = (book, i) => { const ch = book.chapters[i]; return book.remote && ch.au ? 'books/' + book.id + '/' + ch.au.f + '?v=' + ch.au.v : null; };

  /* 把連載的文字全部先抓下來，離線也能讀（一章只有幾 KB） */
  async function prefetch() {
    const got = Store.get('cached', {});
    let n = 0;
    for (const b of (remote.books || [])) for (const c of b.chapters) {
      const k = b.id + '/' + c.f;
      if (got[k] === c.v) continue;
      try { const r = await fetch('books/' + b.id + '/' + c.f + '?v=' + c.v); if (r.ok) { await r.arrayBuffer(); got[k] = c.v; n++; } } catch (e) { Store.set('cached', got); return n; }
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
  }
  async function coverURL(book) {
    if (!book.cover || !book.cover.img) return null;
    if (urls.has(book.cover.img)) return urls.get(book.cover.img);
    try { const blob = await DB.get('assets', book.cover.img); if (blob) { const u = URL.createObjectURL(blob); urls.set(book.cover.img, u); return u; } } catch (e) {}
    return null;
  }
  return { all, find, total, init, sync, chapter, timeline, audioURL, prefetch, addLocal, removeLocal, imgURL, coverURL, ck, freshSet, clearFresh, hasRemote: () => (remote.books || []).length > 0 };
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
