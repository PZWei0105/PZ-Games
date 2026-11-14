/* ───────── 匯入：EPUB、TXT、Markdown 全在這台裝置上解析，不上傳到任何地方 ───────── */
const Importer = (() => {
  const COMMON = '的一是不了人我在有他這中大來上國個到說們為子和你地出道也時年得就那要下以生會自著去之過家學對可她裡後小麼心多天而能好都然沒日於起還發成事只作當想看文無開手十用主行方又如前所本見經頭面公同三已老從動兩長这为来国个说们时会对里后么没于还发当见经头动两长';
  const HEAD_RE = /^(第\s*[零〇一二三四五六七八九十百千萬万两兩0-9０-９]{1,9}\s*[章回卷節节集部篇話话幕][\s　:：、.．]*.{0,30}|序[章言幕曲]?|楔\s*子|引\s*[子言]|前\s*言|後\s*記|后\s*记|尾\s*聲|尾\s*声|終\s*章|终\s*章|番外.{0,24}|卷[一二三四五六七八九十0-9]{1,4}[\s　:：].{0,30}|(?:Chapter|CHAPTER|Prologue|PROLOGUE|Epilogue|EPILOGUE)\b.{0,40})$/;
  const SPLIT_RE = /^(第\s*[^章回卷節节集部篇話话幕\s]{1,9}\s*[章回卷節节集部篇話话幕]|序[章言幕曲]?|楔\s*子|引\s*[子言]|前\s*言|後\s*記|后\s*记|尾\s*聲|尾\s*声|終\s*章|终\s*章|番外|卷[一二三四五六七八九十0-9]{1,4}|(?:Chapter|CHAPTER)\s+[0-9IVXLC]+)[\s　:：、.．\-—]*(.*)$/;
  const splitTitle = (t) => { t = (t || '').replace(/\s+/g, ' ').trim(); const m = t.match(SPLIT_RE); return m && m[2] !== undefined ? { label: m[1].replace(/\s+/g, ''), name: m[2].trim() } : { label: '', name: t }; };
  const countChars = (blocks) => blocks.reduce((s, b) => s + (b.x ? b.x.replace(/\s/g, '').length : 0), 0);
  const cleanName = (fn) => fn.replace(/\.[^.]+$/, '').replace(/[《》]/g, '').replace(/[\[【(（](全本|全集|完結|完结|精校|校對版?|txt|TXT|epub)[^\]】)）]*[\]】)）]/g, '').replace(/[_]+/g, ' ').trim() || '未命名';

  function decodeText(u8) {
    if (u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF) return new TextDecoder('utf-8').decode(u8.subarray(3));
    if (u8[0] === 0xFF && u8[1] === 0xFE) return new TextDecoder('utf-16le').decode(u8.subarray(2));
    if (u8[0] === 0xFE && u8[1] === 0xFF) return new TextDecoder('utf-16be').decode(u8.subarray(2));
    try { return new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch (e) {}
    const sample = u8.subarray(0, Math.min(u8.length, 200000));
    let best = null, bestScore = -1e9;
    ['big5', 'gb18030'].forEach((enc) => {
      let s; try { s = new TextDecoder(enc).decode(sample); } catch (e) { return; }
      let score = 0; for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '�') score -= 8; else if (COMMON.indexOf(c) >= 0) score += 1; }
      if (score > bestScore) { bestScore = score; best = enc; }
    });
    return new TextDecoder(best || 'utf-8').decode(u8);
  }

  /* 有些 TXT 每行固定寬度硬斷行：把它接回完整的段落 */
  function reflow(lines) {
    const lens = lines.filter((l) => l.trim()).map((l) => l.replace(/\s+$/, '').length);
    if (lens.length < 40) return lines;
    const freq = {}; lens.forEach((n) => { freq[n] = (freq[n] || 0) + 1; });
    const mode = +Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];
    const near = lens.filter((n) => Math.abs(n - mode) <= 2).length / lens.length;
    if (mode < 18 || mode > 60 || near < .5) return lines;
    const out = []; let cur = '';
    lines.forEach((raw) => {
      const l = raw.replace(/\s+$/, '');
      if (!l.trim()) { if (cur) out.push(cur); cur = ''; out.push(''); return; }
      const indented = /^(　|\s{2,})/.test(l);
      if (cur && (indented || HEAD_RE.test(l.trim()))) { out.push(cur); cur = ''; }
      cur += l.trim();
      if (l.length < mode - 3 || HEAD_RE.test(l.trim())) { out.push(cur); cur = ''; }
    });
    if (cur) out.push(cur);
    return out;
  }

  function fromText(text, fileName, isMd) {
    text = text.replace(/\r\n?/g, '\n').replace(/\u0000/g, '');
    let lines = text.split('\n');
    if (!isMd) lines = reflow(lines);
    let title = cleanName(fileName), author = '';
    const chapters = []; let cur = null;
    const start = (t) => { cur = { title: t, blocks: [] }; chapters.push(cur); };
    let mdLevel = 0;
    if (isMd) { const h1 = lines.filter((l) => /^#\s+\S/.test(l)).length, h2 = lines.filter((l) => /^##\s+\S/.test(l)).length; mdLevel = h2 >= 2 ? 2 : h1 >= 2 ? 1 : h2 === 1 ? 2 : 0; }
    for (let i = 0; i < lines.length; i++) {
      const s = lines[i].replace(/^[\s　]+|[\s　]+$/g, '');
      if (!s) continue;
      if (i < 12 && !author) { const m = s.match(/^作者[\s　:：]*(.{1,20})$/); if (m) { author = m[1]; continue; } }
      if (isMd) {
        const m = s.match(/^(#{1,6})\s+(.*)$/);
        if (m) {
          const lv = m[1].length, t = m[2].replace(/[*_`]/g, '').trim();
          if (lv === 1 && mdLevel === 2 && !chapters.length) { title = t; continue; }
          if (lv <= mdLevel || (mdLevel === 0 && lv <= 2 && !chapters.length && HEAD_RE.test(t))) { start(t); continue; }
          if (!cur) start('');
          cur.blocks.push({ t: 'h', x: t }); continue;
        }
        if (/^(-{3,}|\*{3,}|\* \* \*|_{3,})$/.test(s)) { if (cur) cur.blocks.push({ t: 'br' }); continue; }
        if (!cur) start('');
        cur.blocks.push(s[0] === '>' ? { t: 'q', x: s.replace(/^>\s*/, '') } : { t: 'p', x: s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1$2') });
        continue;
      }
      if (s.length <= 42 && HEAD_RE.test(s) && !/[，。；]$/.test(s)) { start(s); continue; }
      if (/^(-{3,}|\*{3,}|\* \* \*|={3,}|＊{3,}|※{3,})$/.test(s)) { if (cur) cur.blocks.push({ t: 'br' }); continue; }
      if (!cur) start('');
      cur.blocks.push({ t: 'p', x: s });
    }
    let chs = chapters.filter((c) => c.blocks.some((b) => b.x));
    // 第一個章節標題之前的東西：只有一兩行（書名、作者）就不算一章；有內容才留下來當卷首
    if (chs.length > 1 && !chs[0].title) {
      if (countChars(chs[0].blocks) < 90) { const m = (chs[0].blocks[0].x || '').match(/^《(.{1,30})》$/); if (m) title = m[1]; chs.shift(); }
      else chs[0].title = countChars(chs[0].blocks) < 1500 ? '卷首' : '開頭';
    }
    // 完全沒有章節標題：每八千字左右切一段
    if (chs.length <= 1) {
      const blocks = chs.length ? chs[0].blocks : [];
      const only = chs.length ? chs[0].title : '';
      if (countChars(blocks) > 14000) {
        chs = []; let part = [], n = 0;
        blocks.forEach((b) => { part.push(b); n += b.x ? b.x.length : 0; if (n >= 8000) { chs.push({ title: '第 ' + (chs.length + 1) + ' 段', blocks: part }); part = []; n = 0; } });
        if (part.length) { if (n < 1500 && chs.length) chs[chs.length - 1].blocks = chs[chs.length - 1].blocks.concat(part); else chs.push({ title: '第 ' + (chs.length + 1) + ' 段', blocks: part }); }
      } else chs = [{ title: only || '全文', blocks }];
    }
    if (!chs.length || !countChars(chs[0].blocks) && chs.length === 1) throw new Error('這個檔案裡沒有讀得到的文字');
    return { title, author, chapters: chs, assets: [], coverKey: null };
  }

  /* ── EPUB ── */
  const dirOf = (p) => p.indexOf('/') >= 0 ? p.slice(0, p.lastIndexOf('/') + 1) : '';
  function resolve(base, rel) {
    rel = decodeURIComponent((rel || '').split('#')[0]);
    if (rel[0] === '/') return rel.slice(1);
    const parts = (dirOf(base) + rel).split('/'), out = [];
    parts.forEach((p) => { if (p === '..') out.pop(); else if (p && p !== '.') out.push(p); });
    return out.join('/');
  }
  const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif' };
  const BLOCK = { P: 1, DIV: 1, SECTION: 1, ARTICLE: 1, LI: 1, UL: 1, OL: 1, BLOCKQUOTE: 1, PRE: 1, TABLE: 1, TR: 1, TD: 1, TH: 1, DL: 1, DT: 1, DD: 1, FIGURE: 1, FIGCAPTION: 1, HEADER: 1, FOOTER: 1, MAIN: 1, BODY: 1, ASIDE: 1, CENTER: 1, ADDRESS: 1 };
  const SKIP = { SCRIPT: 1, STYLE: 1, HEAD: 1, RT: 1, RP: 1, NAV: 1, TEMPLATE: 1, NOSCRIPT: 1, IFRAME: 1, OBJECT: 1, AUDIO: 1, VIDEO: 1 };
  const CJK = '[\\u2e80-\\u9fff\\uf900-\\ufaff\\u3000-\\u303f\\uff00-\\uffef]';
  const tidy = (s) => s.replace(/[\s ]+/g, ' ').replace(new RegExp('(' + CJK + ') (?=' + CJK + ')', 'g'), '$1').replace(/^[\s　]+|[\s　]+$/g, '');

  function extract(doc, path, bookId, need) {
    const out = []; let buf = '', quote = 0;
    const flush = (kind, lv) => { const x = tidy(buf); buf = ''; if (!x) return; out.push(kind === 'h' ? { t: 'h', x, lv } : { t: quote ? 'q' : 'p', x }); };
    const walk = (node) => {
      for (let n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) { buf += n.nodeValue; continue; }
        if (n.nodeType !== 1) continue;
        const tag = (n.localName || n.nodeName).toUpperCase();
        if (SKIP[tag]) continue;
        if (tag === 'BR') { flush(); continue; }
        if (tag === 'HR') { flush(); out.push({ t: 'br' }); continue; }
        if (tag === 'IMG' || tag === 'IMAGE') {
          const src = n.getAttribute('src') || n.getAttribute('xlink:href') || n.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || n.getAttribute('href');
          if (src && !/^data:|^https?:/.test(src)) { flush(); const p = resolve(path, src); need.add(p); out.push({ t: 'img', k: bookId + '/' + p, alt: n.getAttribute('alt') || '' }); }
          continue;
        }
        if (/^H[1-6]$/.test(tag)) { flush(); walk(n); flush('h', +tag[1]); continue; }
        if (BLOCK[tag]) { flush(); if (tag === 'BLOCKQUOTE') quote++; walk(n); flush(); if (tag === 'BLOCKQUOTE') quote--; continue; }
        walk(n);
      }
    };
    const body = doc.body || doc.getElementsByTagName('body')[0] || doc.documentElement;
    if (body) { walk(body); flush(); }
    return out;
  }

  function fromEpub(u8, fileName, bookId) {
    let files;
    try { files = fflate.unzipSync(u8); } catch (e) { throw new Error('這個 EPUB 打不開（檔案可能壞了，或是有加密保護）'); }
    const str = (p) => { const f = files[p]; return f ? new TextDecoder('utf-8').decode(f) : null; };
    const xml = (s, type) => new DOMParser().parseFromString(s, type || 'application/xml');
    if (files['META-INF/encryption.xml'] && /EncryptedData/.test(str('META-INF/encryption.xml') || '') && !/font/i.test(str('META-INF/encryption.xml') || '')) throw new Error('這本書有 DRM 加密保護，沒辦法匯入');
    const cont = str('META-INF/container.xml');
    if (!cont) throw new Error('這不是有效的 EPUB 檔');
    const rf = xml(cont).getElementsByTagName('rootfile')[0];
    const opfPath = rf && rf.getAttribute('full-path');
    const opfS = opfPath && str(opfPath);
    if (!opfS) throw new Error('這個 EPUB 缺少書籍資訊檔');
    const opf = xml(opfS);
    const tagText = (n) => { const e = opf.getElementsByTagName(n)[0] || opf.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', n.replace('dc:', ''))[0]; return e ? e.textContent.trim() : ''; };
    const title = tagText('dc:title') || cleanName(fileName), author = tagText('dc:creator');
    const subjects = Array.from(opf.getElementsByTagName('dc:subject')).concat(Array.from(opf.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'subject'))).map((e) => e.textContent.trim()).filter(Boolean);
    const items = {}; let navHref = null, ncxHref = null, coverPath = null;
    Array.from(opf.getElementsByTagName('item')).forEach((it) => {
      const href = resolve(opfPath, it.getAttribute('href') || ''), o = { href, type: it.getAttribute('media-type') || '', props: it.getAttribute('properties') || '' };
      items[it.getAttribute('id')] = o;
      if (/\bnav\b/.test(o.props)) navHref = href;
      if (o.type === 'application/x-dtbncx+xml') ncxHref = href;
      if (/\bcover-image\b/.test(o.props)) coverPath = href;
    });
    if (!coverPath) { const m = Array.from(opf.getElementsByTagName('meta')).find((x) => x.getAttribute('name') === 'cover'); if (m && items[m.getAttribute('content')] && /^image\//.test(items[m.getAttribute('content')].type)) coverPath = items[m.getAttribute('content')].href; }
    // 目錄：章節檔案 → 標題
    const toc = {};
    const put = (href, label) => { const k = href.split('#')[0]; label = (label || '').replace(/\s+/g, ' ').trim(); if (label && !toc[k]) toc[k] = label; };
    if (navHref && str(navHref)) {
      const d = xml(str(navHref), 'application/xhtml+xml');
      const navs = Array.from(d.getElementsByTagName('nav'));
      const nav = navs.find((n) => /toc/.test(n.getAttribute('epub:type') || n.getAttributeNS('http://www.idpf.org/2007/ops', 'type') || '')) || navs[0];
      if (nav) Array.from(nav.getElementsByTagName('a')).forEach((a) => { const h = a.getAttribute('href'); if (h) put(resolve(navHref, h), a.textContent); });
    }
    if (ncxHref && str(ncxHref)) {
      const d = xml(str(ncxHref));
      Array.from(d.getElementsByTagName('navPoint')).forEach((np) => { const c = np.getElementsByTagName('content')[0], t = np.getElementsByTagName('text')[0]; if (c && t) put(resolve(ncxHref, c.getAttribute('src') || ''), t.textContent); });
    }
    const need = new Set(), chapters = [];
    Array.from(opf.getElementsByTagName('itemref')).forEach((ir) => {
      const it = items[ir.getAttribute('idref')];
      if (!it || !/x?html|xml/.test(it.type || 'html')) return;
      const s = str(it.href); if (!s) return;
      let doc = xml(s, 'application/xhtml+xml');
      if (doc.getElementsByTagName('parsererror').length) doc = xml(s, 'text/html');
      const blocks = extract(doc, it.href, bookId, need);
      if (!blocks.length) return;
      const chars = countChars(blocks), hasImg = blocks.some((b) => b.t === 'img');
      if (!chars && !hasImg) return;
      // 一個檔案裡塞了很多章：照大標題切開
      const heads = blocks.map((b, i) => (b.t === 'h' && b.lv <= 2 ? i : -1)).filter((i) => i >= 0);
      if (chars > 20000 && heads.length >= 3) {
        if (heads[0] > 0 && countChars(blocks.slice(0, heads[0])) > 0) chapters.push({ title: toc[it.href] || '', blocks: blocks.slice(0, heads[0]) });
        heads.forEach((hi, k) => chapters.push({ title: blocks[hi].x, blocks: blocks.slice(hi + 1, heads[k + 1] || blocks.length) }));
        return;
      }
      let t = toc[it.href] || '';
      const first = blocks[0];
      if (!t && first.t === 'h') t = first.x;
      if (first.t === 'h' && t && tidy(first.x).replace(/\s/g, '') === t.replace(/\s/g, '')) blocks.shift();
      // 只有一張圖、沒有字的頁（封面、插圖頁）併到下一章開頭，不單獨成章
      if (!chars && chapters.length === 0 && blocks.every((b) => b.t === 'img') && coverPath && blocks.some((b) => b.k === bookId + '/' + coverPath)) return;
      chapters.push({ title: t, blocks });
    });
    // 沒有標題又很短的頁（版權頁、扉頁）接到前後，免得目錄一堆空白
    const merged = [];
    chapters.forEach((c) => { const last = merged[merged.length - 1]; if (!c.title && last && countChars(c.blocks) < 400) last.blocks = last.blocks.concat(c.blocks); else merged.push(c); });
    merged.forEach((c, i) => { if (!c.title) c.title = i === 0 ? '卷首' : '第 ' + (i + 1) + ' 節'; });
    if (!merged.length) throw new Error('這本 EPUB 裡沒有讀得到的文字（可能是純圖片的書）');
    const assets = [];
    if (coverPath) need.add(coverPath);
    need.forEach((p) => { const f = files[p]; if (!f) return; const ext = (p.split('.').pop() || '').toLowerCase(); assets.push({ k: bookId + '/' + p, blob: new Blob([f], { type: MIME[ext] || 'application/octet-stream' }) }); });
    const have = new Set(assets.map((a) => a.k));
    merged.forEach((c) => { c.blocks = c.blocks.filter((b) => b.t !== 'img' || have.has(b.k)); });
    return { title, author, subjects, chapters: merged.filter((c) => c.blocks.length), assets, coverKey: coverPath && have.has(bookId + '/' + coverPath) ? bookId + '/' + coverPath : null };
  }

  async function importFile(file) {
    if (file.size > 120 * 1024 * 1024) throw new Error('檔案超過 120 MB，太大了');
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const u8 = new Uint8Array(await file.arrayBuffer());
    const isZip = u8[0] === 0x50 && u8[1] === 0x4B;
    const id = 'u' + hash32(file.name + '|' + file.size).toString(36) + (u8.length > 64 ? hash32(String.fromCharCode.apply(null, u8.subarray(u8.length - 64))).toString(36) : '');
    let r;
    if (ext === 'epub' || (isZip && ext !== 'txt')) r = fromEpub(u8, file.name, id);
    else if (ext === 'pdf' || (u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46)) throw new Error('PDF 的版面是固定的，重新排版後品質不好，目前不支援；請改用 EPUB 或 TXT');
    else if (/^(mobi|azw3?|kfx)$/.test(ext)) throw new Error('Kindle 格式（' + ext + '）目前不支援；請先轉成 EPUB');
    else if (ext === 'md' || ext === 'markdown') r = fromText(decodeText(u8), file.name, true);
    else r = fromText(decodeText(u8), file.name, false);
    const chMeta = r.chapters.map((c) => Object.assign(splitTitle(c.title), { chars: countChars(c.blocks) }));
    const book = { id, title: r.title, author: r.author || '', src: ext === 'epub' || isZip ? 'epub' : ext === 'md' || ext === 'markdown' ? 'md' : 'txt', added: new Date().toISOString(), cover: Object.assign(Cover.pick(r.title), r.coverKey ? { img: r.coverKey } : {}), chapters: chMeta };
    book.genre = Genre.fromText((r.subjects || []).join(' '));
    // 簡體書：自動轉成臺灣繁體（書頁可以改回原文，或連詞彙一起換成臺灣用語）
    const sample = r.title + r.chapters.slice(0, 8).map((c) => c.blocks.map((b) => b.x || '').join('')).join('').slice(0, 60000);
    book.simp = Conv.looksSimplified(sample);
    if (book.simp) {
      try { await Conv.load(); await applyConv(book, 'tw'); } catch (e) { /* 轉換表下載失敗：先照原文收進來，之後可以在書頁再轉 */ }
    }
    await Lib.addLocal(book, r.chapters.map((c) => c.blocks.map((b) => { const o = { t: b.t }; if (b.x != null) o.x = b.x; if (b.k) { o.k = b.k; o.alt = b.alt; } return o; })), r.assets);
    return book;
  }
  /* 書名、章名跟著轉；原文留一份，改回原文時用 */
  async function applyConv(book, mode) {
    if (book.title0 == null) { book.title0 = book.title; book.author0 = book.author; book.chapters.forEach((c) => { c.label0 = c.label; c.name0 = c.name; }); }
    if (!mode) { book.title = book.title0; book.author = book.author0; book.chapters.forEach((c) => { c.label = c.label0; c.name = c.name0; }); }
    else { const cv = await Conv.converter(mode); book.title = cv(book.title0); book.author = cv(book.author0 || ''); book.chapters.forEach((c) => { c.label = cv(c.label0 || ''); c.name = cv(c.name0 || ''); }); }
    book.conv = mode || '';
    if (!book.cover || !book.cover.img) book.cover = Cover.pick(book.title);
    return book;
  }
  return { importFile, splitTitle, decodeText, fromText, applyConv };
})();
