#!/usr/bin/env python3
"""下回分解 上線前檢查：build.py 之後、推上去之前跑。

  python3 _build/apps/next-chapter/check.py            # 手機 390 ＋ 電腦 1280，截圖在 /tmp/pznc-check
  python3 _build/apps/next-chapter/check.py --only phone

檢查什麼（照痞子葳的用法點一遍）：
  書房      連載上架、封面、上回說到
  書頁      目錄、字數、按鈕
  閱讀器    開書動畫、分頁、點右邊翻頁、拖著翻（摺頁畫面）、翻到下一回、跨回往回翻、工具列、頁數拉桿
  外觀      夜間／羊皮紙／純黑、字級行距改完位置不跑掉、仿真翻頁 ↔ 上下捲動
  進度      關掉重開回到同一句
  匯入      TXT（UTF-8、Big5、沒有章節標題、硬斷行）、Markdown、EPUB（目錄、圖片、封面），刪書
  說書      有音軌的章：播放、時間在走、唸到的句子有標出來、跟著翻頁、拖進度、語速、睡眠定時、說書現場
  新章      書架多一回 → 提示與「新」標記
  離線      伺服器關掉後還打得開、讀得到存過的章
  新功能    書房最下面的分類分頁、書架排序、第一次開書的操作說明、書籤（緞帶、清單、長按夾）、書內搜尋（亮字）、
            分享／複製這一回、前情提要（久沒讀的提要卡、書頁的提要）、夜讀（亮度、暖光）、直排、簡體書自動轉繁體、改分類
  上鎖      書房的門（密語、備用碼、打錯）、在這台裝置上鎖
  分享      書頁「分享這本書」：QR code 掃得出連結、複製連結、傳到 LINE
  單行本    用連結打開、只看得到那一本、網址少了鑰匙／鑰匙錯了／被收回、離線、新的一回
書都是測試用的假書（fixture()：亂數拼的句子、測試用的鑰匙），不碰真的小說，也不需要私人倉庫。
Safari 的排版另外用 check_webkit.py 在 WebKit 裡走一遍（直排、搜尋亮字、夜讀）。
需要 Playwright（雲端沙盒已裝好 Chromium，不要執行 playwright install）。
字型：在 _build/tools/fonts 執行 npm i @fontsource/noto-serif-tc @fontsource/lxgw-wenkai-tc @fontsource/noto-sans-tc，截圖才是真正的字。
有 BAD 時 exit code 1；截圖要打開來親眼看。
"""
import argparse, functools, http.server, io, json, os, re, shutil, socketserver, sys, threading, time, urllib.parse, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO, '_build', 'tools'))
sys.path.insert(0, os.path.join(HERE, 'tools'))
FONTS = os.path.join(REPO, '_build', 'tools', 'fonts', 'node_modules', '@fontsource')
APP = '/apps/next-chapter/'
PHONE = {'viewport': {'width': 390, 'height': 844}, 'device_scale_factor': 2, 'has_touch': True, 'is_mobile': True}
DESK = {'viewport': {'width': 1280, 'height': 860}, 'device_scale_factor': 1}
BAD, WARN = [], []


class Handler(http.server.SimpleHTTPRequestHandler):
    extra = {}       # 測試用的臨時檔（網址 → bytes）
    books = None     # 書架換成測試用的假書（資料夾）

    def log_message(self, *a):
        pass

    def translate_path(self, path):
        p = urllib.parse.unquote(urllib.parse.urlparse(path).path)
        if p.startswith('/__fs/'):
            return os.path.join(FONTS, p[len('/__fs/'):])
        if Handler.books and p.startswith(APP + 'books/'):
            return os.path.join(Handler.books, p[len(APP + 'books/'):])
        return super().translate_path(path)

    def do_GET(self):
        p = urllib.parse.urlparse(self.path).path
        if p in Handler.extra:
            body = Handler.extra[p]
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.send_header('Cache-Control', 'no-store'); self.end_headers(); self.wfile.write(body)
            return
        rng = self.headers.get('Range')
        fp = self.translate_path(self.path)
        if rng and os.path.isfile(fp):
            m = re.match(r'bytes=(\d*)-(\d*)', rng)
            size = os.path.getsize(fp)
            if m:
                st = int(m.group(1)) if m.group(1) else max(0, size - int(m.group(2) or 0))
                en = min(size - 1, int(m.group(2))) if m.group(1) and m.group(2) else size - 1
                if st <= en:
                    with open(fp, 'rb') as f:
                        f.seek(st); body = f.read(en - st + 1)
                    self.send_response(206); self.send_header('Content-Type', self.guess_type(fp)); self.send_header('Accept-Ranges', 'bytes')
                    self.send_header('Content-Range', 'bytes %d-%d/%d' % (st, en, size)); self.send_header('Content-Length', str(len(body))); self.end_headers()
                    try:
                        self.wfile.write(body)
                    except Exception:
                        pass
                    return
        return super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def bad(msg):
    BAD.append(msg); print('  BAD ', msg, flush=True)


def warn(msg):
    WARN.append(msg); print('  WARN', msg, flush=True)


def ok(cond, msg):
    if not cond:
        bad(msg)
    return cond


# ── 測試用的假書：亂數拼的句子（不是真的小說），加密成書房和單行本 ──
FX_PASS = '測試的密語'
FX_CODE = 'TEST-CODE-2026-K7Q9'
NAMES = ['魏子葳', '沈遙', '老周', '阿九', '許娘子', '韓先生']
PLACES = ['渡口', '城門', '茶棚', '堤上', '舊倉', '巷尾', '鹽場', '驛站']
THINGS = ['油燈', '銅錢', '竹簍', '雨傘', '木匣', '麻繩', '信封', '短刀']
ENDERS, CLOSERS = '。！？!?…⋯', '」』”’）》〉】〕)"\''


def js_sentences(text):
    """跟 books.js 的 sentences() 同一套斷句（時間軸要對得上）"""
    out, st, i, n = [], 0, 0, len(text)
    while i < n:
        if text[i] in ENDERS:
            j = i + 1
            while j < n and (text[j] in ENDERS or text[j] == '—'):
                j += 1
            while j < n and text[j] in CLOSERS:
                j += 1
            if j < n and j - st < 4:
                i = j
                continue
            out.append([st, j]); st = j; i = j
        else:
            i += 1
    if st < n:
        if out and n - st < 3:
            out[-1][1] = n
        else:
            out.append([st, n])
    return out


def fx_body(rnd, n_par):
    ps = []
    for k in range(n_par):
        if k and k % 9 == 0:
            ps.append('---')
            continue
        a, b = rnd.sample(NAMES, 2)
        pl, th = rnd.choice(PLACES), rnd.choice(THINGS)
        bits = [
            '%s在%s站了很久，手裡那盞%s一直沒有放下。' % (a, pl, th),
            '「你早就知道了？」%s問。' % b,
            '%s沒有回答，只把%s往桌上一推，%s的燈火晃了一下。' % (a, th, pl),
            '雨從%s那頭斜斜地打過來，%s數了數腳步聲，一共七個人。' % (pl, b),
            '「明天天亮以前，」%s說，「把%s送到%s。」' % (a, th, rnd.choice(PLACES)),
            '這件事後來被人說了很多年，可那天晚上，%s只覺得冷。' % rnd.choice(NAMES),
        ]
        rnd.shuffle(bits)
        ps.append(''.join(bits[:rnd.randint(3, 6)]))
    return '\n\n'.join(ps) + '\n'


def fixture(out):
    """組一套假書房：回傳 dict（books 原稿、keys、lib 解開的目錄、各資料夾、單行本連結）"""
    import random, subprocess
    import publish, pzcrypt
    rnd = random.Random(20261115)
    specs = [('fx-shuang', '霜橋', '架空歷史', '連載中', '#1d2f4a', '霜', 'pass', 4, '2026-10-0%d'),
             ('fx-deng', '燈塔守', '懸疑', '連載中', '#1e3a34', '燈', 'waves', 2, '2026-10-2%d'),
             ('fx-kong', '空城記', '恐怖', '已完結', '#3b2238', '空', 'moon', 1, '2026-11-0%d')]
    cn = '一二三四五六七八九十'
    books = []
    for bid, title, genre, status, cloth, seal, motif, nch, day in specs:
        chs, rc = [], {}
        for i in range(1, nch + 1):
            body = fx_body(rnd, 46 if bid == 'fx-shuang' else 30)
            chs.append({'n': i, 'label': '第%s章' % cn[i - 1], 'name': rnd.choice(PLACES) + rnd.choice(['夜', '雨', '火', '霜']), 'body': body,
                        'chars': len(re.sub(r'\s', '', body)), 'added': day % i, 'at': (day % i) + 'T1%d:00:00+08:00' % i})
            rc[str(i)] = '上回說到，%s在%s撿到一只%s，%s追了三條街才發現，那只是一個開始。這一回的事，後來全城都知道了。' % (rnd.choice(NAMES), rnd.choice(PLACES), rnd.choice(THINGS), rnd.choice(NAMES))
        books.append({'id': bid, 'title': title, 'author': '測試作者', 'status': status, 'genre': genre,
                      'blurb': '測試用的假書：%s。這裡的句子都是亂數拼出來的，只用來檢查書房和單行本。' % title,
                      'cover': {'cloth': cloth, 'seal': seal, 'motif': motif}, 'chapters': chs, 'recaps': rc})
    # 巡查報告（只在書房，用總鑰匙加密）：第一本有一份
    books[0]['audit'] = {'reports': [{'id': 1, 'kind': '例行巡查', 'from': 1, 'to': 4, 'date': '2026-11-17', 'summary': '測試用的巡查總評：前後大致一致，有兩條要你決定。',
        'fixed': [{'ch': 2, 'what': '「燈火」誤植為「燈伙」', 'why': '錯字'}],
        'items': [{'id': 1, 'type': '前後矛盾', 'level': '重大', 'ch': [1, 3], 'issue': '測試條目一：第一回說是七個人，第三回變成六個人。', 'suggest': '把第三回改回七個人。', 'status': '待決定'},
                  {'id': 2, 'type': '人物', 'level': '一般', 'ch': 4, 'issue': '測試條目二：角色反應不符個性。', 'suggest': '改成先觀察再出手。', 'status': '已修', 'note': '寫作端已照建議修好'}]}]}
    site_dir, books_dir = os.path.join(out, 'fx-site'), os.path.join(out, 'fx-books')
    keys = {'master': pzcrypt.new_master(), 'site': '', 'books': {b['id']: {'key': pzcrypt.new_book_key(), 'pub': pzcrypt.rand_id(12), 'ed': pzcrypt.rand_id(10)} for b in books}}
    ring = pzcrypt.make_keyring(keys['master'], FX_PASS, FX_CODE)
    fx = {'books': books, 'keys': keys, 'ring': ring, 'km': keys['master'], 'books_dir': books_dir, 'site_dir': site_dir}
    publish.sync(site_dir, publish.site_files(books, keys, None, render=False))
    for root, _, fns in os.walk(site_dir):
        assert 'audit.pzx' not in fns, '單行本網站不應該有巡查報告'
    files = publish.library_files(books, keys, ring)
    # 說書音軌（假的，只有靜音）：第一本的第二章
    b0, k0 = books[0], keys['books'][books[0]['id']]
    c2 = b0['chapters'][1]
    units, t = [], 3.2
    for bi, ln in enumerate([x.strip() for x in c2['body'].split('\n') if x.strip()]):
        if ln == '---':
            t += .8
            continue
        for s0, e0 in js_sentences(ln):
            d = .45 + (e0 - s0) * .045
            units.append([bi, s0, e0, round(t, 2), round(t + d, 2)]); t += d + .12
    dur = round(t + 1.5, 2)
    adir = os.path.join(books_dir, k0['pub'], 'audio')
    os.makedirs(adir, exist_ok=True)
    mp3 = os.path.join(adir, '002.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', str(dur), '-b:a', '40k', mp3], check=True)
    lib = pzcrypt.unseal_json(keys['master'], files['library.pzx'])
    v2 = lib['books'][0]['chapters'][1]['v']
    files[k0['pub'] + '/audio/002.json'] = json.dumps({'v': 1, 'dur': dur, 'head': 3.2, 'text': v2, 'units': units}).encode('utf-8')
    files[k0['pub'] + '/audio/002.mp3'] = open(mp3, 'rb').read()
    lib['books'][0]['chapters'][1]['au'] = {'f': 'audio/002.mp3', 'tl': 'audio/002.json', 'v': 'fx1', 'dur': dur, 'bytes': os.path.getsize(mp3), 'voice': 100, 'text': v2}
    fx['set_site'] = lambda url: _fx_site(fx, url)
    fx['lib'] = lib
    files['library.pzx'] = pzcrypt.seal_json(keys['master'], lib)
    publish.sync(books_dir, files)
    return fx


def _fx_site(fx, url):
    """單行本網站的網址（測試伺服器開好以後才知道）：寫進書房的目錄、單行本的頁面"""
    import publish, pzcrypt
    fx['keys']['site'] = url
    fx['lib']['site'] = url
    open(os.path.join(fx['books_dir'], 'library.pzx'), 'wb').write(pzcrypt.seal_json(fx['km'], fx['lib']))
    publish.sync(fx['site_dir'], publish.site_files(fx['books'], fx['keys'], fx['site_dir'], render=False))
    fx['links'] = {b['id']: url + '/' + fx['keys']['books'][b['id']]['ed'] + '/#k=' + fx['keys']['books'][b['id']]['key'] for b in fx['books']}


def put_lib(fx, lib):
    """換掉書房的目錄（測試「新的一回」）"""
    import pzcrypt
    Handler.extra[APP + 'books/library.pzx'] = pzcrypt.seal_json(fx['km'], lib)


def sample_files(tmp):
    os.makedirs(tmp, exist_ok=True)
    paras = ['臘月的風從嶺上刮下來，刮得堡門上的燈籠直打轉。', '「你說誰？」老卒把碗放下。', '那人沒有回答，只是把斗笠往下壓了壓，轉身走進了雪裡。他走得不快，腳印卻很淺，像是怕驚動了什麼。']
    utf = '《雪夜行》\n作者：測試生\n\n楔子\n\n' + '\n\n'.join(paras) + '\n\n第一章 風雪\n\n' + '\n\n'.join(paras * 14) + '\n\n第二章　故人\n\n' + '\n\n'.join(paras * 12) + '\n\n第三章：歸途\n\n' + '\n\n'.join(paras * 10) + '\n'
    open(os.path.join(tmp, '雪夜行.txt'), 'w', encoding='utf-8').write(utf)
    open(os.path.join(tmp, '舊書_big5.txt'), 'wb').write(('第一回 初見\r\n\r\n' + '\r\n'.join('　　' + p for p in paras * 9) + '\r\n\r\n第二回 再會\r\n\r\n' + '\r\n'.join('　　' + p for p in paras * 9)).encode('big5'))
    long = ''.join(paras) * 400
    open(os.path.join(tmp, '沒有章節.txt'), 'w', encoding='utf-8').write('\n'.join(long[i:i + 180] + '。' for i in range(0, 30000, 180)))
    wrapped = []
    for p in paras * 30:
        s = '　　' + p
        wrapped += [s[i:i + 34] for i in range(0, len(s), 34)]
    open(os.path.join(tmp, '硬斷行.txt'), 'w', encoding='utf-8').write('第一章 測試\n' + '\n'.join(wrapped))
    open(os.path.join(tmp, '筆記.md'), 'w', encoding='utf-8').write('# 山中筆記\n\n## 第一篇　入山\n\n' + '\n\n'.join(paras * 5) + '\n\n---\n\n' + paras[0] + '\n\n## 第二篇　出山\n\n> ' + paras[2] + '\n\n' + '\n\n'.join(paras * 4) + '\n')
    # 最小可用的 EPUB：三個章節檔、目錄（nav＋ncx）、一張內文圖、一張封面
    from PIL import Image, ImageDraw
    def png_of(w, h, c1, c2, label):
        im = Image.new('RGB', (w, h), c1); d = ImageDraw.Draw(im)
        for y in range(h):
            t = y / h; d.line([(0, y), (w, y)], fill=tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)))
        d.ellipse([w * .3, h * .3, w * .7, h * .3 + w * .4], fill=(250, 220, 150)); d.text((10, 10), label, fill=(255, 255, 255))
        o = io.BytesIO(); im.save(o, 'PNG'); return o.getvalue()
    png = png_of(240, 360, (20, 60, 90), (5, 15, 30), 'COVER')
    png2 = png_of(360, 220, (90, 60, 30), (30, 20, 10), 'PIC')
    z = io.BytesIO()
    with zipfile.ZipFile(z, 'w') as f:
        f.writestr('mimetype', 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
        f.writestr('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
        man = ''.join('<item id="c%d" href="text/ch%d.xhtml" media-type="application/xhtml+xml"/>' % (i, i) for i in (1, 2, 3))
        f.writestr('OEBPS/content.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>海上燈</dc:title><dc:creator>林測試</dc:creator><dc:identifier id="id">x</dc:identifier><meta name="cover" content="cov"/></metadata><manifest>' + man + '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="cov" href="img/cover.png" media-type="image/png"/><item id="pic" href="img/pic.png" media-type="image/png"/></manifest><spine toc="ncx"><itemref idref="c1"/><itemref idref="c2"/><itemref idref="c3"/></spine></package>')
        f.writestr('OEBPS/nav.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="text/ch1.xhtml">第一章　出港</a></li><li><a href="text/ch2.xhtml">第二章　霧</a></li><li><a href="text/ch3.xhtml#x">尾聲</a></li></ol></nav></body></html>')
        f.writestr('OEBPS/toc.ncx', '<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/"><navMap><navPoint><navLabel><text>第一章　出港</text></navLabel><content src="text/ch1.xhtml"/></navPoint></navMap></ncx>')
        body = ''.join('<p>%s</p>' % p for p in paras * 8)
        f.writestr('OEBPS/text/ch1.xhtml', '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title><style>p{color:red}</style></head><body><h1>第一章　出港</h1>' + body + '<p>她說：<em>「別回頭。」</em><br/>他果然沒有回頭。</p><div class="pic"><img src="../img/pic.png" alt="港口"/></div><blockquote><p>海上無風三尺浪。</p></blockquote></body></html>')
        f.writestr('OEBPS/text/ch2.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><body><h2>第二章　霧</h2>' + body + '<hr/>' + body + '<p>漢字<ruby>燈<rt>とう</rt></ruby>塔在霧裡亮著。</p></body></html>')
        f.writestr('OEBPS/text/ch3.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><body><p id="x">' + paras[2] + '</p>' + body + '</body></html>')
        f.writestr('OEBPS/img/cover.png', png)
        f.writestr('OEBPS/img/pic.png', png2)
    open(os.path.join(tmp, '海上燈.epub'), 'wb').write(z.getvalue())
    open(os.path.join(tmp, '壞掉.epub'), 'wb').write(b'PK\x03\x04 not really a zip')
    open(os.path.join(tmp, '掃描.pdf'), 'wb').write(b'%PDF-1.4 fake')
    return tmp


def font_router(base):
    try:
        import shoot
    except Exception:
        return None

    def route(r):
        u = urllib.parse.urlparse(r.request.url)
        shoot.FONTS_DIR = FONTS
        r.fulfill(status=200, content_type='text/css; charset=utf-8', body=shoot.font_css(u.query, base))
    return route if os.path.isdir(FONTS) else None


def run(p, name, opts, base, out, tmp, srv, fx):
    print('\n== %s ==' % name, flush=True)
    br = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required', '--disable-gpu-compositing'])
    ctx = br.new_context(locale='zh-TW', timezone_id='Asia/Taipei', **opts)
    fr = font_router(base)
    if fr:
        ctx.route(re.compile(r'^https://fonts\.googleapis\.com/.*'), fr)
    else:
        ctx.route(re.compile(r'^https://fonts\.googleapis\.com/.*'), lambda r: r.abort())
        warn('沒有本機字型，截圖裡的字不是真正的字（見檔案開頭說明）')
    ctx.route(re.compile(r'^https://fonts\.gstatic\.com/.*'), lambda r: r.abort())
    page = ctx.new_page()
    page.add_init_script("localStorage.setItem('pznc.v1.km', JSON.stringify(%s));" % json.dumps(fx['km']))
    errs = []
    page.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text and 'fonts.g' not in m.text else None)
    W, H = opts['viewport']['width'], opts['viewport']['height']
    touch = opts.get('has_touch', False)
    n = [0]

    def shot(tag):
        n[0] += 1
        page.screenshot(path=os.path.join(out, '%s-%02d-%s.png' % (name, n[0], tag)))

    def tap(x, y):
        if touch:
            page.touchscreen.tap(x, y)
        else:
            page.mouse.click(x, y)

    def js(code):
        return page.evaluate(code)

    def info():
        return js("(() => { const r = document.querySelector('#reader'); if (r.hidden) return null; const st = document.querySelector('#rdStage'); const lf = [...document.querySelectorAll('.leaf')].sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0))[0]; const foot = lf.querySelector('.pf-r').textContent.split('/').map((s) => +s.trim()); return { pi: foot[0], pages: foot[1], ch: lf.querySelector('.pf-l').textContent, w: st.clientWidth, scroll: !document.querySelector('#rdScroll').hidden, chrome: r.classList.contains('chrome-on'), loading: r.classList.contains('loading'), firstText: (() => { const vp = lf.querySelector('.vp'), b = vp.getBoundingClientRect(); for (const s of lf.querySelectorAll('.s')) { const q = s.getClientRects()[0]; if (q && q.left >= b.left - 2 && q.left < b.right && q.top >= b.top - 2) return s.textContent.slice(0, 16); } return ''; })() }; })()")

    def page_text():
        return js("(() => { const sc = document.querySelector('#rdScroll'); if (!sc.hidden) { const b = sc.getBoundingClientRect(); return [...sc.querySelectorAll('.s')].filter((s) => { const r = s.getBoundingClientRect(); return r.bottom > b.top && r.top < b.bottom; }).map((s) => s.textContent).join(''); } const lf = [...document.querySelectorAll('.leaf')].sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0))[0], b = lf.querySelector('.vp').getBoundingClientRect(); return [...lf.querySelectorAll('.s')].filter((s) => [...s.getClientRects()].some((r) => r.left >= b.left - 2 && r.left < b.right - 2)).map((s) => s.textContent).join(''); })()")

    def stage_xy(fx, fy):
        b = js("(() => { const b = document.querySelector('#rdStage').getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; })()")
        return b[0] + b[2] * fx, b[1] + b[3] * fy

    def tap_stage(fx, fy=0.5):
        x, y = stage_xy(fx, fy)
        tap(x, y)

    def wait_reader():
        page.wait_for_function("(() => { const r = document.querySelector('#reader'); return !r.hidden && !r.classList.contains('loading') && document.querySelector('#opening').hidden; })()", timeout=15000)
        page.wait_for_timeout(250)

    def turn(direction=1, wait=650):
        tap_stage(0.9 if direction > 0 else 0.08)
        page.wait_for_timeout(wait)

    def act(a, extra=''):
        if a == 'sheet-close':
            page.locator('.sheet-bg').click(position={'x': W / 2, 'y': 10})
            return
        page.locator('[data-act="%s"]%s' % (a, extra)).first.click()

    # ── 書房 ──
    page.goto(base + APP, wait_until='load')
    page.wait_for_selector('.lib-top', timeout=15000)
    page.wait_for_function("document.querySelectorAll('.shelf .bk:not(.add)').length > 0", timeout=15000)
    page.wait_for_timeout(900)
    shot('lib-first')
    lib = fx['lib']
    bk = lib['books'][0]
    ok(js("document.querySelector('.hero h2').textContent") == bk['title'], '第一次打開，書房應該推第一本連載')
    ok(js("document.querySelectorAll('.cover-svg').length") >= 2, '封面沒有畫出來')

    # ── 書頁 ──
    page.locator('.shelf [data-act="book"][data-id="%s"]' % bk['id']).click()
    page.wait_for_selector('#bookv:not([hidden]) .toc .row')
    page.wait_for_timeout(300)
    shot('book')
    ok(js("document.querySelectorAll('#bookv .toc .row').length") == len(bk['chapters']), '目錄的回數跟書架不一樣')

    # ── 開書 ──
    page.locator('#bookv [data-act="continue"]').click()
    page.wait_for_timeout(420)
    shot('opening')
    wait_reader()
    ok(js("!document.querySelector('#coach').hidden"), '第一次開書沒有出現操作說明')
    shot('coach')
    page.locator('#coach .btn[data-act="coach-ok"]').click(); page.wait_for_timeout(250)
    ok(js("document.querySelector('#coach').hidden && localStorage.getItem('pznc.v1.coach') === '1'"), '按「知道了」以後操作說明沒有收起來')
    shot('read-p1')
    a = info()
    ok(a and a['pi'] == 1 and a['pages'] >= 3, '閱讀器沒有分好頁：%s' % a)
    ok(js("document.querySelector('.leaf .ch-nm') && document.querySelector('.leaf .ch-nm').textContent") == bk['chapters'][0]['name'], '章名沒有出現在第一頁')
    turn(1); b = info()
    ok(b['pi'] == 2, '點右邊沒有翻到第 2 頁：%s' % b)
    ok(b['firstText'] and b['firstText'] != a['firstText'], '翻頁後頁首的字沒有換')
    shot('read-p2')
    turn(-1); ok(info()['pi'] == 1, '點左邊沒有翻回第 1 頁')
    # 拖著翻：停在一半拍一張（看摺頁、陰影），放手要翻過去
    x0, y0 = stage_xy(0.92, 0.55); x1, _ = stage_xy(0.38, 0.55)
    if touch:
        cdp = ctx.new_cdp_session(page)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
        for i in range(1, 9):
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + (x1 - x0) * i / 8, 'y': y0}]})
            page.wait_for_timeout(30)
        shot('read-fold')
        ok(js("!document.querySelector('#flapC').classList.contains('off')"), '拖著翻的時候沒有出現摺起來的頁背')
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    else:
        page.mouse.move(x0, y0); page.mouse.down()
        for i in range(1, 9):
            page.mouse.move(x0 + (x1 - x0) * i / 8, y0); page.wait_for_timeout(30)
        shot('read-fold')
        ok(js("!document.querySelector('#flapC').classList.contains('off')"), '拖著翻的時候沒有出現摺起來的頁背')
        page.mouse.up()
    page.wait_for_timeout(700)
    ok(info()['pi'] == 2, '拖過半放手沒有翻到下一頁：%s' % info())
    ok(js("document.querySelector('#flapC').classList.contains('off')"), '翻完以後頁背沒有收起來')
    # 工具列與頁數拉桿
    tap_stage(0.5)
    page.wait_for_timeout(400)
    ok(info()['chrome'], '點中間沒有叫出工具列')
    shot('read-chrome')
    last = info()['pages']
    js("(() => { const r = document.querySelector('#rdRange'); r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); })()")
    page.wait_for_timeout(200)
    ok(info()['pi'] == last, '頁數拉桿拉到底沒有到最後一頁')
    tap_stage(0.5, 0.4); page.wait_for_timeout(350)
    ok(not info()['chrome'], '再點一下沒有收起工具列')
    shot('read-lastpage')
    multi = len(bk['chapters']) > 1
    if multi:
        turn(1, 900); c = info()
        ok(c['pi'] == 1 and c['ch'] != a['ch'], '最後一頁再翻沒有進下一回：%s' % c)
        turn(-1, 900); d = info()
        ok(d['ch'] == a['ch'] and d['pi'] == d['pages'], '下一回第一頁往回翻沒有回到上一回的最後一頁：%s' % d)
    else:
        turn(1, 500)
        ok(js("[...document.querySelectorAll('.toast')].some((t) => /下回分解|讀完/.test(t.textContent))"), '最後一頁再翻沒有出現「且聽下回分解」')

    # ── 外觀 ──
    js("document.querySelector('#rdRange').value = 3; document.querySelector('#rdRange').dispatchEvent(new Event('input', { bubbles: true }))")
    page.wait_for_timeout(200)
    keep = info()['firstText']
    tap_stage(0.5); page.wait_for_timeout(350)
    act('rd-look'); page.wait_for_selector('#sheet:not([hidden]) .seg.themes')
    shot('look-sheet')
    for th in ('paper', 'black', 'night'):
        page.locator('[data-act="set"][data-k="theme"][data-v="%s"]' % th).click(); page.wait_for_timeout(150)
        ok(js("document.querySelector('#reader').dataset.theme") == th, '主題沒有換成 ' + th)
        if th != 'night':
            act('sheet-close'); page.wait_for_timeout(250); shot('theme-' + th); tap_stage(0.5, 0.3) if not info()['chrome'] else None; page.wait_for_timeout(300); act('rd-look'); page.wait_for_selector('#sheet:not([hidden])')
    for _ in range(3):
        page.locator('[data-act="step"][data-k="size"][data-d="1"]').click()
    page.locator('[data-act="set"][data-k="font"][data-v="kai"]').click()
    page.wait_for_timeout(500)
    act('sheet-close'); page.wait_for_timeout(300)
    if info()['chrome']:
        tap_stage(0.5, 0.3); page.wait_for_timeout(300)
    ok(keep[:10] in page_text(), '放大字級、換字體以後，原本頁首那一句不在這一頁了：「%s」' % keep)
    shot('big-kai')
    # 捲動模式
    tap_stage(0.5); page.wait_for_timeout(350); act('rd-look'); page.wait_for_selector('#sheet:not([hidden])')
    page.locator('[data-act="set"][data-k="mode"][data-v="scroll"]').click(); page.wait_for_timeout(700)
    act('sheet-close'); page.wait_for_timeout(300)
    ok(info()['scroll'], '沒有切到上下捲動')
    ok(keep[:10] in page_text(), '切到捲動以後，原本那一句不在畫面上：「%s」' % keep)
    shot('scroll')
    js("document.querySelector('#rdScroll').scrollBy(0, 900)"); page.wait_for_timeout(500)
    keep2 = js("(() => { const sc = document.querySelector('#rdScroll'), t = sc.getBoundingClientRect().top; for (const s of sc.querySelectorAll('.s')) { const r = s.getBoundingClientRect(); if (r.top >= t + 8) return s.textContent.slice(0, 16); } return ''; })()")
    # 進度：整頁重開，接著讀要回到同一句
    page.wait_for_timeout(400)
    page.reload(wait_until='load'); page.wait_for_selector('.hero')
    page.wait_for_timeout(600)
    ok('上回說到' in js("document.querySelector('.hero-kicker').textContent"), '重開以後書房沒有「上回說到」')
    shot('lib-resume')
    page.locator('.hero [data-act="continue"].btn').click(); wait_reader()
    top2 = js("(() => { const sc = document.querySelector('#rdScroll'), t = sc.getBoundingClientRect().top; for (const s of sc.querySelectorAll('.s')) { const r = s.getBoundingClientRect(); if (r.top >= t + 4) return s.textContent.slice(0, 16); } return ''; })()")
    ok(top2[:6] == keep2[:6], '重開以後沒有回到同一句：原本「%s」，現在「%s」' % (keep2, top2))
    # 換回仿真翻頁與預設字級
    js("(() => { document.querySelector('#rdScroll').dispatchEvent(new PointerEvent('pointerdown', { clientX: 200, clientY: 300, bubbles: true })); document.querySelector('#rdScroll').dispatchEvent(new PointerEvent('pointerup', { clientX: 200, clientY: 300, bubbles: true })); })()")
    page.wait_for_timeout(350)
    ok(info()['chrome'], '捲動模式點一下沒有叫出工具列')
    act('rd-look'); page.wait_for_selector('#sheet:not([hidden])')
    page.locator('[data-act="set"][data-k="mode"][data-v="page"]').click(); page.wait_for_timeout(600)
    for _ in range(3):
        page.locator('[data-act="step"][data-k="size"][data-d="-1"]').click()
    page.locator('[data-act="set"][data-k="font"][data-v="song"]').click(); page.wait_for_timeout(400)
    act('sheet-close'); page.wait_for_timeout(300)
    ok(not info()['scroll'] and keep2[:10] in page_text(), '換回仿真翻頁以後，原本那一句不在這一頁：「%s」' % keep2)
    # 目錄
    if not info()['chrome']:
        tap_stage(0.5); page.wait_for_timeout(350)
    act('rd-toc'); page.wait_for_selector('#sheet:not([hidden]) .toc .row.cur')
    shot('toc-sheet')
    act('sheet-close'); page.wait_for_timeout(200)

    # ── 說書（有音軌的章） ──
    track_i = next((i for i, c in enumerate(bk['chapters']) if c.get('au')), None)
    if track_i is None:
        warn('書架上還沒有說書音軌，跳過說書檢查')
    else:
        if info()['chrome']:
            tap_stage(0.5, 0.3); page.wait_for_timeout(300)
        tap_stage(0.5); page.wait_for_timeout(300); act('rd-toc'); page.wait_for_selector('#sheet:not([hidden]) .toc')
        page.locator('#sheet .toc .row').nth(track_i).click(); wait_reader()
        tap_stage(0.5); page.wait_for_timeout(350)
        ok('聽說書' in js("document.querySelector('[data-act=\"rd-narr\"]').textContent"), '有音軌的章，按鈕應該寫「聽說書」')
        act('rd-narr')
        page.wait_for_function("document.querySelector('#mini') && !document.querySelector('#mini').hidden", timeout=8000)
        try:
            page.wait_for_function("document.querySelectorAll('#reader .s.on').length > 0", timeout=20000)
        except Exception:
            bad('說書開始以後，沒有標出正在唸的句子')
        page.wait_for_timeout(1500)
        shot('narr-reading')
        t1 = js("(() => { const a = [...document.querySelectorAll('audio')]; return 0; })()")
        page.locator('#mini [data-act="mi-open"]').click(); page.wait_for_selector('#sheet:not([hidden]) .np')
        page.wait_for_timeout(1200)
        shot('narr-player')
        ta = js("document.querySelector('#npT').textContent"); page.wait_for_timeout(2300); tb = js("document.querySelector('#npT').textContent")
        ok(ta != tb, '說書現場的時間沒有在走：%s → %s' % (ta, tb))
        ok(len(js("document.querySelector('#npNow').textContent")) > 3, '說書現場沒有顯示正在唸的句子')
        page.locator('[data-act="np-rate"][data-v="1.5"]').click(); page.wait_for_timeout(200)
        ok(js("document.querySelector('[data-act=\"np-rate\"][data-v=\"1.5\"]').getAttribute('aria-pressed')") == 'true', '語速沒有切到 1.5×')
        page.locator('[data-act="np-rate"][data-v="1"]').click()
        page.locator('[data-act="np-sleep"][data-v="30"]').click(); page.wait_for_timeout(300)
        ok('剩' in js("document.querySelector('[data-act=\"np-sleep\"][data-v=\"0\"]').textContent"), '睡眠定時沒有顯示剩下幾分鐘')
        page.locator('[data-act="np-sleep"][data-v="0"]').click()
        # 拖到中間：句子與頁面要跟過去
        js("(() => { const r = document.querySelector('#npRange'); r.value = 520; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); })()")
        page.wait_for_timeout(2500)
        now_txt = js("document.querySelector('#npNow').textContent")
        tsec = js("(() => { const p = document.querySelector('#npT').textContent.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; })()")
        dur = bk['chapters'][track_i]['au']['dur']
        ok(abs(tsec - dur * 0.52) < 20, '拖進度條到一半，時間沒有跳過去：現在 %s 秒，整段 %s 秒' % (tsec, dur))
        page.locator('[data-act="np-goto"]').click(); page.wait_for_timeout(1500)
        on = js("(() => { const lf = [...document.querySelectorAll('.leaf')].sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0))[0], vp = lf.querySelector('.vp').getBoundingClientRect(); const s = lf.querySelector('.s.on'); if (!s) return null; const r = s.getClientRects()[0]; return { vis: r.left >= vp.left - 2 && r.left < vp.right, text: s.textContent.slice(0, 10) }; })()")
        ok(on and on['vis'], '拖進度以後，頁面沒有跟到正在唸的那一句：%s（說書現場：%s）' % (on, now_txt[:12]))
        shot('narr-follow')
        page.locator('#mini [data-act="mi-toggle"]').click(); page.wait_for_timeout(500)
        page.locator('#mini [data-act="mi-open"]').click(); page.wait_for_selector('#sheet:not([hidden]) .np')
        ta = js("document.querySelector('#npT').textContent"); page.wait_for_timeout(1300)
        ok(ta == js("document.querySelector('#npT').textContent"), '按了暫停，時間還在走')
        page.locator('#sheet [data-act="np-stop"]').click(); page.wait_for_timeout(400)
        ok(js("document.querySelector('#mini').hidden && document.querySelectorAll('.s.on').length === 0"), '收攤以後播放列或標記還在')

    # ── 回書房、匯入 ──
    if not info()['chrome']:
        tap_stage(0.5); page.wait_for_timeout(350)
    act('rd-back'); page.wait_for_timeout(500)
    ok(js("document.querySelector('#reader').hidden"), '按返回沒有離開閱讀器')
    if js("!document.querySelector('#bookv').hidden"):
        page.locator('#bookv [data-act="back"]').click(); page.wait_for_timeout(400)
    ok(js("!document.querySelector('#lib').hidden && document.querySelector('#bookv').hidden"), '沒有回到書房')
    files = ['雪夜行.txt', '舊書_big5.txt', '沒有章節.txt', '硬斷行.txt', '筆記.md', '海上燈.epub']
    page.set_input_files('#file', [os.path.join(tmp, f) for f in files])
    page.wait_for_function("document.querySelectorAll('.shelf:last-of-type .bk:not(.add)').length >= 6", timeout=30000)
    page.wait_for_timeout(600)
    shot('lib-imported')
    got = js("""(async () => { const db = await new Promise((res) => { const r = indexedDB.open('pznc', 1); r.onsuccess = () => res(r.result); }); const all = await new Promise((res) => { const r = db.transaction('books').objectStore('books').getAll(); r.onsuccess = () => res(r.result); }); const first = async (id) => new Promise((res) => { const r = db.transaction('chaps').objectStore('chaps').get(id + ':00000'); r.onsuccess = () => res(r.result); }); const out = {}; for (const b of all) out[b.title] = { n: b.chapters.length, ch: b.chapters.slice(0, 4).map((c) => c.label + '|' + c.name), author: b.author, img: !!(b.cover && b.cover.img), first: ((await first(b.id)) || { blocks: [] }).blocks.slice(0, 3).map((x) => (x.x || x.t).slice(0, 24)) }; return out; })()""")
    exp = {'雪夜行': 4, '舊書 big5': 2, '筆記': 2, '海上燈': 3, '硬斷行': 1}
    for t, cnt in exp.items():
        key = t if t in got else next((k for k in got if k.replace('_', ' ') == t or t in k), None)
        if not ok(key is not None, '匯入後書架上找不到《%s》：%s' % (t, list(got))):
            continue
        ok(got[key]['n'] == cnt, '《%s》應該有 %d 章，結果 %d 章：%s' % (t, cnt, got[key]['n'], got[key]['ch']))
    if '雪夜行' in got:
        ok(got['雪夜行']['author'] == '測試生', 'TXT 的作者沒有抓到')
        ok(got['雪夜行']['ch'][1] == '第一章|風雪', 'TXT 章名沒有拆成「第一章｜風雪」：%s' % got['雪夜行']['ch'])
    b5 = next((k for k in got if 'big5' in k), None)
    if b5:
        ok(got[b5]['ch'][0] == '第一回|初見' and '臘月' in ''.join(got[b5]['first']), 'Big5 的 TXT 解出來是亂碼：%s' % got[b5])
    nc = next((k for k in got if '沒有章節' in k), None)
    if ok(nc is not None, '沒有章節的 TXT 沒匯入'):
        ok(3 <= got[nc]['n'] <= 6, '沒有章節標題的長文應該自動切成幾段，結果 %d 段' % got[nc]['n'])
    hw = next((k for k in got if '硬斷行' in k), None)
    if hw:
        ok(any(len(x) >= 24 for x in got[hw]['first']) and all(not x.startswith('　') for x in got[hw]['first']), '硬斷行的 TXT 沒有接回完整段落：%s' % got[hw]['first'])
    if '海上燈' in got:
        ok(got['海上燈']['author'] == '林測試' and got['海上燈']['img'], 'EPUB 的作者或封面沒有抓到：%s' % got['海上燈'])
        ok(got['海上燈']['ch'][:3] == ['第一章|出港', '第二章|霧', '尾聲|'], 'EPUB 的目錄不對：%s' % got['海上燈']['ch'])
    # 打不開的檔案要說清楚
    page.set_input_files('#file', [os.path.join(tmp, '壞掉.epub'), os.path.join(tmp, '掃描.pdf')])
    page.wait_for_function("document.querySelectorAll('.toast.bad').length >= 2", timeout=10000)
    shot('import-errors')
    ok(js("[...document.querySelectorAll('.toast.bad')].some((t) => /PDF/.test(t.textContent))"), 'PDF 沒有說明為什麼不支援')
    page.wait_for_timeout(6500)
    # 讀 EPUB：圖片、引文、<br> 斷段
    page.locator('.bk:not(.add)', has_text='海上燈').click(); page.wait_for_selector('#bookv:not([hidden]) .toc .row')
    page.wait_for_timeout(500); shot('book-epub')
    page.locator('#bookv .toc .row').first.click(); wait_reader()
    txt = js("document.querySelector('.leaf .flow').textContent")
    ok('別回頭' in txt and '他果然沒有回頭' in txt and 'color:red' not in txt, 'EPUB 內文不對（樣式表的字跑進來，或段落不見）')
    ok(js("document.querySelectorAll('.leaf .flow .fig img').length") >= 1 and js("document.querySelectorAll('.leaf .flow p.quote').length") >= 1, 'EPUB 的圖片或引文沒有出來')
    ok(js("document.querySelector('.leaf .ch-nm').textContent") == '出港', 'EPUB 的章名沒有顯示')
    shot('read-epub')
    tap_stage(0.5); page.wait_for_timeout(350); act('rd-back'); page.wait_for_timeout(500)
    # 刪書
    act('del-book'); page.wait_for_selector('#sheet:not([hidden]) [data-act="del-yes"]'); shot('delete-confirm')
    act('del-yes'); page.wait_for_function("!document.querySelector('#lib').hidden", timeout=8000); page.wait_for_timeout(500)
    ok(js("![...document.querySelectorAll('.bk-t')].some((e) => e.textContent === '海上燈')"), '刪書以後書還在書架上')

    # ── 新的一回上架 ──
    lib2 = json.loads(json.dumps(lib))
    src = lib2['books'][0]['chapters'][-1]
    lib2['books'][0]['chapters'].append(dict(src, n=src['n'] + 1, label='第九百章', name='測試新回', au=None))
    lib2['books'][0]['chapters'][-1].pop('au', None)
    put_lib(fx, lib2)
    act('settings'); page.wait_for_selector('#sheet:not([hidden]) [data-act="sync"]'); shot('settings')
    act('sync')
    try:
        page.wait_for_function("[...document.querySelectorAll('.toast')].some((t) => /測試新回/.test(t.textContent))", timeout=8000)
    except Exception:
        bad('書架多了一回，沒有跳出提示')
    page.wait_for_timeout(500)
    ok(js("document.querySelectorAll('.cover .tag').length") >= 1, '有新的一回，封面上沒有「新」的印')
    shot('lib-new-chapter')
    Handler.extra.clear()
    js("(async () => { localStorage.removeItem('pznc.v1.fresh'); const k = JSON.parse(localStorage.getItem('pznc.v1.known') || '{}'); Object.keys(k).forEach((id) => { k[id] = k[id].filter((x) => x !== 'n" + str(src['n'] + 1) + "'); }); localStorage.setItem('pznc.v1.known', JSON.stringify(k)); })()")

    # ── 離線 ──
    sw = js("(async () => { if (!navigator.serviceWorker) return 'none'; const r = await navigator.serviceWorker.ready; return r.active ? 'ok' : 'no'; })()")
    ok(sw == 'ok', '離線快取沒有啟動：%s' % sw)
    page.reload(wait_until='load'); page.wait_for_selector('.hero'); page.wait_for_timeout(1500)
    ctx.set_offline(True)
    page.reload(wait_until='load')
    try:
        page.wait_for_selector('.hero', timeout=8000)
        page.wait_for_timeout(500)
        page.locator('.hero [data-act="continue"].btn').click(); wait_reader()
        ok(len(js("document.querySelector('.leaf .flow').textContent")) > 500, '離線時讀不到存過的章')
        shot('offline-read')
    except Exception as ex:
        bad('離線時打不開：%s' % str(ex)[:120])
    ctx.set_offline(False)
    for e in errs:
        bad('程式錯誤：' + e[:300])
    br.close()


SIMP_PARAS = ['这是一个简体中文的测试文件，我们用它来看看转换对不对。', '软件更新以后，信息会自动同步到手机上，他们说这样比较方便。',
              '他们走过长长的马路，听见远处的鸟在叫，风吹过来的时候很凉快。', '「你还记得吗？」她问。「当然记得，那时候我们都还很年轻。」']


def run_features(p, name, opts, base, out, tmp, fx):
    print('\n== %s：新功能 ==' % name, flush=True)
    lib = fx['lib']
    zb = lib['books'][0]
    br = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required', '--disable-gpu-compositing'])
    ctx = br.new_context(locale='zh-TW', timezone_id='Asia/Taipei', **opts)
    clip_ok = True
    try:
        ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin=base)
    except Exception:
        clip_ok = False
        warn('開不了剪貼簿權限，複製的檢查跳過')
    fr = font_router(base)
    ctx.route(re.compile(r'^https://fonts\.googleapis\.com/.*'), fr if fr else (lambda r: r.abort()))
    ctx.route(re.compile(r'^https://fonts\.gstatic\.com/.*'), lambda r: r.abort())
    page = ctx.new_page()
    page.add_init_script("if (!sessionStorage.getItem('pznc.t')) { sessionStorage.setItem('pznc.t', '1'); localStorage.setItem('pznc.v1.coach', '1'); localStorage.setItem('pznc.v1.km', JSON.stringify(%s)); }" % json.dumps(fx['km']))
    errs = []
    page.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text and 'fonts.g' not in m.text else None)
    W = opts['viewport']['width']
    touch = opts.get('has_touch', False)
    n = [0]
    TOP = "[...document.querySelectorAll('.leaf')].sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0))[0]"

    def shot(tag):
        n[0] += 1
        page.screenshot(path=os.path.join(out, '%s-f%02d-%s.png' % (name, n[0], tag)))

    def js(code):
        return page.evaluate(code)

    def tap(x, y):
        if touch:
            page.touchscreen.tap(x, y)
        else:
            page.mouse.click(x, y)

    def stage_xy(fx, fy=0.5):
        b = js("(() => { const b = document.querySelector('#rdStage').getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; })()")
        return b[0] + b[2] * fx, b[1] + b[3] * fy

    def tap_stage(fx, fy=0.5):
        tap(*stage_xy(fx, fy))

    def info():
        return js("(() => { const lf = " + TOP + ", f = lf.querySelector('.pf-r').textContent.split('/').map((s) => +s.trim()), r = document.querySelector('#reader'); return { pi: f[0], pages: f[1], ch: lf.querySelector('.pf-l').textContent, chrome: r.classList.contains('chrome-on'), rtl: document.querySelector('#rdStage').classList.contains('rtl'), v: !!lf.querySelector('.flow.v'), ribbon: document.querySelector('#rdRibbon').classList.contains('on') }; })()")

    def seen():  # 這一頁看得到的句子（橫排、直排都適用）
        return js("(() => { const lf = " + TOP + ", b = lf.querySelector('.vp').getBoundingClientRect(); return [...lf.querySelectorAll('.s')].filter((s) => [...s.getClientRects()].some((q) => q.right > b.left + 2 && q.left < b.right - 2 && q.bottom > b.top + 2 && q.top < b.bottom - 2)).map((s) => s.textContent); })()")

    def first_start():  # 這一頁第一個「從這一頁開始」的句子（上一頁接過來的半句不算）
        return js("(() => { const lf = " + TOP + ", b = lf.querySelector('.vp').getBoundingClientRect(); for (const s of lf.querySelectorAll('.s')) { const q = s.getClientRects()[0]; if (q && q.right > b.left + 2 && q.left < b.right - 2 && q.bottom > b.top + 2 && q.top < b.bottom - 2) return s.textContent; } return ''; })()")

    def wait_reader():
        page.wait_for_function("(() => { const r = document.querySelector('#reader'); return !r.hidden && !r.classList.contains('loading') && document.querySelector('#opening').hidden; })()", timeout=15000)
        page.wait_for_timeout(350)

    def chrome(on):
        if info()['chrome'] != on:
            tap_stage(0.5, 0.45)
            page.wait_for_timeout(380)

    def turn(d, wait=700):
        chrome(False)
        tap_stage(0.9 if d > 0 else 0.08)
        page.wait_for_timeout(wait)

    def close_sheet():
        page.locator('.sheet-bg').click(position={'x': W / 2, 'y': 10})
        page.wait_for_timeout(300)

    def look(k, v):
        chrome(True)
        page.locator('[data-act="rd-look"]').click(); page.wait_for_selector('#sheet:not([hidden]) .lk-pv')
        page.locator('#sheet [data-act="set"][data-k="%s"][data-v="%s"]' % (k, v)).click(); page.wait_for_timeout(900)
        close_sheet()

    def sliders(bright, warm):
        js("(() => { for (const [k, v] of [['bright', %d], ['warm', %d]]) { const r = document.querySelector('.lk-sl[data-k=\"' + k + '\"]'); r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); } })()" % (bright, warm))
        page.wait_for_timeout(250)

    def long_press(x, y):
        if touch:
            cdp = ctx.new_cdp_session(page)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
            page.wait_for_timeout(760)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        else:
            page.mouse.move(x, y); page.mouse.down(); page.wait_for_timeout(760); page.mouse.up()
        page.wait_for_timeout(200)

    def mid_sentence():
        return js("(() => { const lf = " + TOP + ", b = lf.querySelector('.vp').getBoundingClientRect(); for (const s of lf.querySelectorAll('.s')) { const q = s.getClientRects()[0]; if (q && q.top > b.top + b.height * .35 && q.bottom < b.bottom - 20 && q.left > b.left && q.right < b.right && q.width > 30 && q.height > 10) return { x: q.left + Math.min(q.width, 60) / 2, y: q.top + q.height / 2, t: s.textContent }; } return null; })()")

    def clip():
        try:
            return page.evaluate('navigator.clipboard.readText()')
        except Exception as e:
            return 'ERR ' + str(e)

    def t_ms(c):
        import datetime
        s = c.get('at') or (c['added'] + 'T12:00:00+08:00')
        return datetime.datetime.fromisoformat(s).timestamp() * 1000

    # ── 書房：分類分頁 ──
    page.goto(base + APP, wait_until='load')
    page.wait_for_function("document.querySelectorAll('.shelf .bk:not(.add)').length > 0", timeout=15000)
    page.wait_for_timeout(800)
    tabs = js("[...document.querySelectorAll('#gbar .gb span')].map((e) => e.textContent)")
    genres = sorted(set(b.get('genre') or '未分類' for b in lib['books']))
    ok(not js("document.querySelector('#gbar').hidden") and tabs[:1] == ['全部'] and all(g in tabs for g in genres), '書房最下面的分類分頁不對：%s（書架上的分類：%s）' % (tabs, genres))
    ok(js("[...document.querySelectorAll('.bk-d')].every((e) => e.textContent.length > 1)"), '書卡下面沒有時間（幾天前更新）')
    shot('lib')
    other = next((b for b in lib['books'] if (b.get('genre') or '未分類') != (zb.get('genre') or '未分類')), None)
    if other:
        g = other.get('genre') or '未分類'
        page.locator('#gbar .gb[data-g="%s"]' % g).click(); page.wait_for_timeout(400)
        want = sorted(b['title'] for b in lib['books'] if (b.get('genre') or '未分類') == g)
        got = sorted(js("[...document.querySelectorAll('.bk:not(.add) .bk-t')].map((e) => e.textContent)"))
        ok(got == want and js("document.querySelector('.hero h2').textContent") in want, '選了「%s」，書架應該只剩 %s，結果 %s' % (g, want, got))
        ok(js("localStorage.getItem('pznc.v1.gsel')") == json.dumps(g, ensure_ascii=False), '選的分類沒有記住')
        shot('lib-genre')
        page.locator('#gbar .gb[data-g=""]').click(); page.wait_for_timeout(300)
    # ── 書架排序 ──
    if len(lib['books']) > 1:
        page.locator('.shelf[data-shelf="serial"] .sortb').click(); page.wait_for_selector('#menu:not([hidden])')
        shot('sort-menu')
        page.locator('#menu [data-v="old"]').click(); page.wait_for_timeout(300)
        exp = [b['id'] for b in sorted(lib['books'], key=lambda b: min(t_ms(c) for c in b['chapters']))]
        ok(js("[...document.querySelectorAll('.shelf[data-shelf=serial] .bk')].map((e) => e.dataset.id)") == exp, '「最早上架」的順序不對')
        ok('上架' in js("document.querySelector('.shelf[data-shelf=serial] .bk-d').textContent"), '排「最早上架」時，書卡下面應該寫幾月幾日上架')
        page.locator('.shelf[data-shelf="serial"] .sortb').click(); page.locator('#menu [data-v="upd"]').click(); page.wait_for_timeout(300)
        exp = [b['id'] for b in sorted(lib['books'], key=lambda b: -max(t_ms(c) + c['n'] for c in b['chapters']))]
        ok(js("[...document.querySelectorAll('.shelf[data-shelf=serial] .bk')].map((e) => e.dataset.id)") == exp, '「最近更新」的順序不對')
        ok(json.loads(js("localStorage.getItem('pznc.v1.sort')") or '{}').get('serial') == 'upd', '排序方式沒有記住')

    # ── 書頁：分類、分頁、提要不劇透 ──
    page.locator('.shelf [data-act="book"][data-id="%s"]' % zb['id']).click(); page.wait_for_selector('#bookv:not([hidden]) .tabs')
    page.wait_for_timeout(400)
    ok(js("document.querySelector('#bookv .gchip').textContent") == (zb.get('genre') or '未分類'), '書頁上的分類不對')
    want_tabs = ['toc', 'marks', 'search'] + (['recap'] if zb.get('recaps') else []) + (['audit'] if zb.get('audit') else [])
    ok(js("[...document.querySelectorAll('#bookv .tab')].map((e) => e.dataset.tab)") == want_tabs, '書頁的分頁不對')
    if zb.get('audit'):
        ok(js("!!document.querySelector('#bookv .aud-banner.fresh')"), '有新的巡查報告，書頁上應該有亮著的「新的巡查報告」')
        ok(js("document.querySelector('#bookv .tab[data-tab=audit] i').textContent") == '1', '巡查分頁的數字應該是待決定的條數（1）')
        shot('audit-banner')
        page.locator('#bookv .aud-banner').click(); page.wait_for_selector('#bookv .aud-rep')
        page.wait_for_timeout(400)
        ok(js("document.querySelectorAll('#bookv .aud-it').length") == 2, '巡查報告應該列出兩條')
        ok(js("document.querySelectorAll('#bookv .aud-it.wait').length") == 1 and js("document.querySelectorAll('#bookv .aud-it.done').length") == 1, '待決定／已修的樣子不對')
        ok('測試條目一' in js("document.querySelector('#bookv .aud-wrap').textContent") and '燈伙' in js("document.querySelector('#bookv .aud-fx').textContent"), '巡查報告的內容沒有解出來')
        ok(not js("document.querySelector('#bookv .aud-banner').classList.contains('fresh')"), '看過報告以後「新的」應該熄掉')
        page.locator('#bookv .aud-fx summary').click(); page.wait_for_timeout(200)
        shot('audit-tab')
        ok(js("[...document.querySelectorAll('#bookv .aud-ch button')].map((e) => e.dataset.act + ':' + e.dataset.i).join(',')") == 'read:0,read:2,read:3', '巡查條目上的章名應該能點開那一回')
        ok(js("document.querySelectorAll('#bookv .aud-pk button').length") == 2, '只有待決定的條目才有「要修／不修」')
        page.locator('#bookv .aud-pk [data-v="要修"]').click(); page.wait_for_selector('#bookv .aud-bar')
        ok(js("document.querySelector('#bookv .aud-it.pk-fix') != null") and '要修 1 條' in js("document.querySelector('#bookv .aud-bar').textContent"), '按「要修」以後應該亮起來、下面出現複製列')
        page.locator('#bookv [data-act="aud-copy"]').click(); page.wait_for_timeout(400)
        amsg = js("navigator.clipboard.readText()") if clip_ok else ''
        ok(not clip_ok or (amsg.startswith('照《%s》巡查修以下這一條' % zb['title']) and '第 1 條' in amsg and '建議：把第三回改回七個人' in amsg), '複製給寫作端的內容不對：%s' % amsg[:80])
        shot('audit-pick')
        page.locator('#bookv .aud-pk [data-v="不修"]').click(); page.wait_for_timeout(200)
        page.locator('#bookv [data-act="aud-copy"]').click(); page.wait_for_timeout(400)
        ok(not clip_ok or js("navigator.clipboard.readText()") == '《%s》巡查第 1 條不修。' % zb['title'], '只挑「不修」時複製的內容不對')
        page.locator('#bookv [data-act="aud-clear"]').click(); page.wait_for_timeout(200)
        ok(js("document.querySelector('#bookv .aud-bar') == null"), '按「清掉」以後複製列應該收起來')
        page.locator('#bookv .tab[data-tab="toc"]').click(); page.wait_for_timeout(200)
    ok(js("document.querySelector('#bvRecap').hidden"), '還沒讀過，書頁不應該先給前情提要')
    if zb.get('recaps'):
        page.locator('#bookv .tab[data-tab="recap"]').click(); page.wait_for_selector('#bookv .rcl-wrap .empty:not(:empty), #bookv .rcl')
        page.wait_for_timeout(300)
        ok(js("document.querySelectorAll('#bookv .rcl li').length") == 0 and '還有' in js("(document.querySelector('#bookv .rc-more') || {}).textContent || ''"), '還沒讀過，提要分頁不應該列出任何一回（會劇透）')
    # ── 書內搜尋 ──
    page.locator('#bookv .tab[data-tab="search"]').click(); page.wait_for_selector('#bookv .q')
    ok(js("document.activeElement && document.activeElement.classList.contains('q')"), '點「搜尋」以後游標沒有放進搜尋框')
    page.locator('#bookv .q').fill('魏子葳')
    page.wait_for_selector('#bookv .qhit', timeout=20000); page.wait_for_timeout(900)
    nhit = js("document.querySelectorAll('#bookv .qhit').length")
    ok(nhit > 0 and '找到' in js("document.querySelector('#bookv .qstat').textContent"), '書內搜尋找不到「魏子葳」')
    shot('search')
    k = min(4, nhit - 1)
    page.locator('#bookv .qhit').nth(k).click(); wait_reader()
    m = js("(() => { const lf = " + TOP + ", m = lf.querySelector('mark.hitm'); if (!m) return ''; const r = m.getBoundingClientRect(), v = lf.querySelector('.vp').getBoundingClientRect(); return m.textContent + (r.left >= v.left - 2 && r.right <= v.right + 2 && r.top >= v.top - 2 && r.bottom <= v.bottom + 2 ? '|在這一頁' : '|不在這一頁'); })()")
    ok(m == '魏子葳|在這一頁', '點搜尋結果以後，找到的字沒有亮在這一頁：%s' % m)
    shot('search-hit')
    page.wait_for_timeout(4800)
    ok(js("!document.querySelector('mark.hitm')"), '亮起來的字過了幾秒沒有還原')

    # ── 書籤 ──
    chrome(True)
    page.locator('[data-act="rd-mark"]').click(); page.wait_for_timeout(500)
    a = info()
    ok(a['ribbon'] and js("document.querySelector('[data-act=\"rd-mark\"]').getAttribute('aria-pressed')") == 'true', '夾了書籤，頁角沒有緞帶、按鈕也沒有變')
    shot('ribbon')
    turn(1); ok(not info()['ribbon'], '翻到下一頁，緞帶應該收起來')
    turn(-1); ok(info()['ribbon'], '翻回夾書籤的那一頁，緞帶沒有出來')
    turn(1); turn(1)
    chrome(True); page.locator('[data-act="rd-toc"]').click(); page.wait_for_selector('#sheet:not([hidden]) .tabs')
    page.locator('#sheet .tab[data-tab="marks"]').click(); page.wait_for_selector('#sheet .bml .bm')
    ok(js("document.querySelectorAll('#sheet .bm').length") == 1, '書籤清單應該有一個')
    shot('marks')
    page.locator('#sheet .bm').first.click(); page.wait_for_timeout(900)
    b2 = info()
    ok(b2['pi'] == a['pi'] and b2['ribbon'], '從書籤清單跳回去，沒有回到夾書籤的那一頁：%s → %s' % (a['pi'], b2['pi']))
    # ── 長按一句：說書、書籤、複製 ──
    ms = mid_sentence()
    if ok(ms is not None, '這一頁找不到可以長按的句子'):
        long_press(ms['x'], ms['y'])
        ok(js("!document.querySelector('#pop').hidden"), '長按一句沒有跳出選單')
        acts = js("[...document.querySelectorAll('#pop button')].map((b) => b.dataset.act)")
        ok('pop-mark' in acts and 'pop-copy' in acts, '長按選單少了書籤或複製：%s' % acts)
        shot('longpress')
        page.locator('#pop [data-act="pop-copy"]').click(); page.wait_for_timeout(400)
        if clip_ok:
            ok(clip().strip() == ms['t'].strip(), '長按「複製」複製到的不是那一句')
        long_press(ms['x'], ms['y'])
        page.locator('#pop [data-act="pop-mark"]').click(); page.wait_for_timeout(400)
        ok(js("Object.values(JSON.parse(localStorage.getItem('pznc.v1.bm') || '{}')).flat().length") == 2, '長按「書籤」沒有多一個書籤')
    # 刪書籤
    chrome(True); page.locator('[data-act="rd-toc"]').click(); page.wait_for_selector('#sheet:not([hidden]) .tabs')
    page.locator('#sheet .tab[data-tab="marks"]').click(); page.wait_for_selector('#sheet .bml')
    page.locator('#sheet .bm-del').first.click(); page.wait_for_timeout(400)
    ok(js("document.querySelectorAll('#sheet .bm').length") == 1, '刪掉一個書籤以後清單沒有更新')
    close_sheet()

    # ── 分享這一回 ──
    chrome(True); page.locator('[data-act="rd-share"]').click(); page.wait_for_selector('#sheet:not([hidden]) [data-act="share-copy"]')
    page.wait_for_timeout(500)
    shot('share')
    page.locator('#sheet [data-act="share-copy"]').click(); page.wait_for_timeout(700)
    if clip_ok:
        c = clip()
        ok(c.startswith('《%s》' % zb['title']) and len(c) > 800, '「複製這一回的全文」複製到的內容不對（%d 字）' % len(c))
    ok(js("document.querySelector('#sheet').hidden"), '複製完分享抽屜沒有收起來')

    # ── 夜讀 ──
    chrome(True); page.locator('[data-act="rd-look"]').click(); page.wait_for_selector('#sheet:not([hidden]) .lk-pv')
    base_bg = js("getComputedStyle(" + TOP + ".querySelector('.leaf-in')).backgroundColor")
    sliders(50, 80)
    night = js("({ veil: document.querySelector('#reader').classList.contains('veil'), dim: +getComputedStyle(document.querySelector('.rd-veil')).opacity, bg: getComputedStyle(" + TOP + ".querySelector('.leaf-in')).backgroundColor, pv: getComputedStyle(document.querySelector('.lk-pv')).backgroundColor })")
    ok(night['veil'] and night['dim'] > .3 and night['bg'] != base_bg and night['pv'] == night['bg'], '夜讀（亮度、暖光）沒有作用，或預覽框跟頁面不一樣：%s' % night)
    shot('night-sheet')
    close_sheet(); shot('night')
    chrome(True); page.locator('[data-act="rd-look"]').click(); page.wait_for_selector('#sheet:not([hidden]) .lk-pv')
    sliders(100, 0)
    ok(not js("document.querySelector('#reader').classList.contains('veil')") and js("getComputedStyle(" + TOP + ".querySelector('.leaf-in')).backgroundColor") == base_bg, '夜讀調回來以後顏色沒有還原')
    ok(json.loads(js("localStorage.getItem('pznc.v1.settings')"))['warm'] == 0, '夜讀的設定沒有存起來')
    close_sheet()

    # ── 直排（先正常翻一頁：剛從書籤、搜尋跳過來時，記住的是那一句，不是頁首） ──
    turn(1)
    keep = first_start()[:10]
    look('vert', '1')
    a = info()
    ok(a['rtl'] and a['v'], '沒有切到直排')
    ok(any(keep in s for s in seen()), '切到直排以後，原本那一句不在這一頁：「%s」' % keep)
    shot('vert')
    chrome(False)
    tap_stage(0.1); page.wait_for_timeout(750)
    ok(info()['pi'] == a['pi'] + 1, '直排點左邊沒有翻到下一頁')
    tap_stage(0.9); page.wait_for_timeout(750)
    ok(info()['pi'] == a['pi'], '直排點右邊沒有翻回上一頁')
    x0, y0 = stage_xy(0.07, 0.55); x1, _ = stage_xy(0.6, 0.55)
    if touch:
        cdp = ctx.new_cdp_session(page)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
        for i in range(1, 9):
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + (x1 - x0) * i / 8, 'y': y0}]}); page.wait_for_timeout(30)
        shot('vert-fold')
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    else:
        page.mouse.move(x0, y0); page.mouse.down()
        for i in range(1, 9):
            page.mouse.move(x0 + (x1 - x0) * i / 8, y0); page.wait_for_timeout(30)
        shot('vert-fold')
        page.mouse.up()
    page.wait_for_timeout(800)
    ok(info()['pi'] == a['pi'] + 1, '直排從左往右拖過半，沒有翻到下一頁')
    keep = first_start()[:10]
    look('vert', '0')
    ok(not info()['rtl'] and any(keep in s for s in seen()), '換回橫排以後，原本那一句不在這一頁：「%s」' % keep)

    # ── 前情提要（久沒讀才跳出來） ──
    if zb.get('recaps') and len(zb['chapters']) >= 3:
        rc = next(b for b in fx['books'] if b['id'] == zb['id'])['recaps']
        c2, c3 = zb['chapters'][1], zb['chapters'][2]
        chrome(True); page.locator('[data-act="rd-back"]').click(); page.wait_for_timeout(500)
        js("(() => { const p = JSON.parse(localStorage.getItem('pznc.v1.prog') || '{}'); p['%s'] = { t: Date.now() - 3 * 864e5, ck: 'n%d', b: 0, s: 0, x: '', f: .2 }; localStorage.setItem('pznc.v1.prog', JSON.stringify(p)); const d = JSON.parse(localStorage.getItem('pznc.v1.done') || '{}'); delete d['%s']; localStorage.setItem('pznc.v1.done', JSON.stringify(d)); localStorage.removeItem('pznc.v1.gsel'); })()" % (zb['id'], c3['n'], zb['id']))
        page.reload(wait_until='load'); page.wait_for_selector('.hero'); page.wait_for_timeout(700)
        ok(js("document.querySelector('.hero h2').textContent") == zb['title'], '書房的「上回說到」應該是剛剛讀的那本')
        page.locator('.hero [data-act="continue"].btn').click(); wait_reader()
        try:
            page.wait_for_selector('#rdCard:not([hidden]) .rc-box', timeout=5000)
            card = js("document.querySelector('#rdCard').textContent")
            ok(c2['label'] in card and rc[str(c2['n'])][:12] in card, '前情提要卡給的不是上一回（%s）' % c2['label'])
            shot('recap-card')
            page.locator('#rdCard [data-act="card-close"]').click(); page.wait_for_timeout(300)
            ok(js("document.querySelector('#rdCard').hidden"), '按「接著讀」以後提要卡沒有收起來')
        except Exception:
            bad('隔了三天再翻開，沒有跳出前情提要卡')
        ok(info()['ch'].startswith(c3['label']), '前情提要以後沒有回到原本讀的那一回')
        chrome(True); page.locator('[data-act="rd-back"]').click(); page.wait_for_timeout(500)
        page.locator('.shelf [data-act="book"][data-id="%s"]' % zb['id']).click(); page.wait_for_selector('#bookv:not([hidden]) .tabs')
        page.wait_for_timeout(600)
        ok(js("!document.querySelector('#bvRecap').hidden && document.querySelector('#bvRecap').textContent.includes('%s')" % c2['label']), '書頁上沒有上一回的前情提要')
        page.locator('#bvRecap [data-act="tab"]').click(); page.wait_for_selector('#bookv .rcl li')
        page.wait_for_timeout(400)
        ok(js("document.querySelectorAll('#bookv .rcl li').length") == 2, '讀到第三回，提要應該只列前兩回（不劇透）')
        shot('recap-tab')
        page.locator('#bookv [data-act="back"]').click(); page.wait_for_timeout(400)
        # 排序：最近讀過
        page.locator('.shelf[data-shelf="serial"] .sortb').click(); page.locator('#menu [data-v="read"]').click(); page.wait_for_timeout(300)
        ok(js("document.querySelector('.shelf[data-shelf=serial] .bk').dataset.id") == zb['id'], '「最近讀過」應該把剛讀的那本排第一')
        ok('讀過' in js("document.querySelector('.shelf[data-shelf=serial] .bk-d').textContent"), '排「最近讀過」時，書卡下面應該寫幾分鐘前讀過')

    # ── 簡體書：自動轉繁體、可以換回原文、臺灣用語 ──
    simp = os.path.join(tmp, '简体测试.txt')
    open(simp, 'w', encoding='utf-8').write('第一章 开始\n\n' + '\n\n'.join(SIMP_PARAS * 6) + '\n\n第二章 结束\n\n' + '\n\n'.join(SIMP_PARAS * 5) + '\n')
    page.set_input_files('#file', [simp])
    page.wait_for_function("[...document.querySelectorAll('.bk-t')].some((e) => e.textContent === '簡體測試')", timeout=20000)
    page.wait_for_timeout(500)
    shot('lib-simp')
    page.locator('.bk:not(.add)', has_text='簡體測試').click(); page.wait_for_selector('#bookv:not([hidden]) .conv')
    ok(js("document.querySelector('#bookv .conv [data-v=\"tw\"]').getAttribute('aria-pressed')") == 'true', '簡體書匯入以後應該自動轉成繁體')
    shot('book-simp')

    def chapter_text():
        page.locator('#bookv .tab[data-tab="toc"]').click()
        page.locator('#bookv .toc .row').first.click(); wait_reader()
        t = js("document.querySelector('.leaf .flow').textContent")
        chrome(True); page.locator('[data-act="rd-back"]').click(); page.wait_for_selector('#bookv:not([hidden]) .conv')
        return t
    t = chapter_text()
    ok('這是一個簡體中文' in t and '这是' not in t, '簡體書的內文沒有轉成繁體')
    page.locator('#bookv .conv [data-v=""]').click(); page.wait_for_function("document.querySelector('#busy').hidden && document.querySelector('#bookv .conv [data-v=\"\"]').getAttribute('aria-pressed') === 'true'", timeout=10000)
    t = chapter_text()
    ok('这是一个简体中文' in t, '換回「原文」以後內文不是原本的簡體字')
    page.locator('#bookv .conv [data-v="twp"]').click(); page.wait_for_function("document.querySelector('#busy').hidden && document.querySelector('#bookv .conv [data-v=\"twp\"]').getAttribute('aria-pressed') === 'true'", timeout=10000)
    t = chapter_text()
    ok('軟體' in t and '資訊' in t, '「繁體＋臺灣用語」沒有把软件、信息換成軟體、資訊')
    # ── 改分類 ──
    page.locator('#bookv .gchip').click(); page.wait_for_selector('#sheet:not([hidden]) .gpick')
    shot('genre-sheet')
    page.locator('#sheet .gpick [data-g="科幻"]').click(); page.wait_for_timeout(400)
    ok(js("document.querySelector('#bookv .gchip').textContent") == '科幻', '改了分類，書頁上沒有變')
    page.locator('#bookv [data-act="back"]').click(); page.wait_for_timeout(400)
    page.locator('#gbar .gb[data-g="科幻"]').click(); page.wait_for_timeout(400)
    ok(js("[...document.querySelectorAll('.bk:not(.add) .bk-t')].map((e) => e.textContent)") == ['簡體測試'], '「科幻」分頁裡應該只有剛剛那本')
    shot('lib-scifi')
    page.locator('#gbar .gb[data-g=""]').click(); page.wait_for_timeout(300)
    # ── 書房設定裡的閱讀外觀 ──
    page.locator('[data-act="settings"]').click(); page.wait_for_selector('#sheet:not([hidden]) [data-act="look-open"]')
    shot('settings')
    page.locator('#sheet [data-act="look-open"]').click(); page.wait_for_selector('#sheet:not([hidden]) .lk-pv')
    shot('settings-look')
    close_sheet()
    for e in errs:
        bad('程式錯誤：' + e[:300])
    br.close()

def _ctx(p, opts, base, clip=False):
    br = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required', '--disable-gpu-compositing'])
    ctx = br.new_context(locale='zh-TW', timezone_id='Asia/Taipei', **opts)
    if clip:
        try:
            ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin=base)
        except Exception:
            pass
    fr = font_router(base)
    ctx.route(re.compile(r'^https://fonts\.googleapis\.com/.*'), fr if fr else (lambda r: r.abort()))
    ctx.route(re.compile(r'^https://fonts\.gstatic\.com/.*'), lambda r: r.abort())
    return br, ctx


def _watch(page, errs, tag=''):
    page.on('pageerror', lambda e: errs.append(tag + 'pageerror: ' + str(e)))
    page.on('console', lambda m: errs.append(tag + 'console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text and 'fonts.g' not in m.text else None)


def qr_text(png_bytes):
    """把 QR code 截圖解回文字（OpenCV；沒裝就回 None）"""
    try:
        import cv2, numpy as np
    except Exception:
        return None
    img = cv2.imdecode(np.frombuffer(png_bytes, np.uint8), cv2.IMREAD_COLOR)
    img = cv2.copyMakeBorder(img, 40, 40, 40, 40, cv2.BORDER_CONSTANT, value=(244, 236, 218))
    for scale in (1, 2, 3):
        im = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST) if scale > 1 else img
        t, _, _ = cv2.QRCodeDetector().detectAndDecode(im)
        if t:
            return t
    return ''


def run_update(p, name, opts, base, out, tmp, fx):
    """匯入的書出新版：書頁「更新這本書」、直接匯入時認出同一本、對不上時要先問"""
    print('\n== %s：匯入的書更新 ==' % name, flush=True)
    br = p.chromium.launch(args=['--disable-gpu-compositing'])
    ctx = br.new_context(locale='zh-TW', timezone_id='Asia/Taipei', **opts)
    ctx.route(re.compile(r'^https://fonts\.(googleapis|gstatic)\.com/.*'), lambda r: r.abort())
    page = ctx.new_page()
    page.add_init_script("if (!sessionStorage.getItem('pznc.t')) { sessionStorage.setItem('pznc.t', '1'); localStorage.setItem('pznc.v1.coach', '1'); localStorage.setItem('pznc.v1.hello', '1'); localStorage.setItem('pznc.v1.km', JSON.stringify(%s)); }" % json.dumps(fx['km']))
    errs = []
    page.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text and 'fonts.g' not in m.text else None)
    n = [0]
    js = page.evaluate

    def shot(tag):
        n[0] += 1
        page.screenshot(path=os.path.join(out, '%s-u%02d-%s.png' % (name, n[0], tag)))

    para = '雪落在城牆上，守夜的人把手縮進袖子裡，聽著遠處的馬蹄聲一陣緊過一陣。' * 4

    def txt(fn, names):
        path = os.path.join(tmp, fn)
        open(path, 'w', encoding='utf-8').write('\n\n'.join('%s\n\n%s\n\n%s' % (h, para, para) for h in names) + '\n')
        return path

    v1 = ['第%d章 標題%d' % (i, i) for i in range(1, 6)]
    v2 = v1[:2] + ['番外 雪夜'] + v1[2:] + ['第6章 標題6', '第7章 標題7']
    v3 = v2 + ['第8章 標題8', '第9章 標題9']
    store = lambda k: js("JSON.parse(localStorage.getItem('pznc.v1.%s') || 'null')" % k)
    local = lambda: js("""(async () => { const db = await new Promise((res) => { const r = indexedDB.open('pznc', 1); r.onsuccess = () => res(r.result); }); return await new Promise((res) => { const r = db.transaction('books').objectStore('books').getAll(); r.onsuccess = () => res(r.result.map((b) => ({ id: b.id, title: b.title, n: b.chapters.length, upd: b.upd || '', last: b.chapters[b.chapters.length - 1].label }))); }); })()""")
    toast = lambda: js("[...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' / ')")

    def wait_toast(sub, ms=15000):
        try:
            page.wait_for_function("[...document.querySelectorAll('.toast')].some((t) => t.textContent.includes(%s))" % json.dumps(sub), timeout=ms)
            return True
        except Exception:
            return False

    try:
        page.goto(base + APP, wait_until='load')
        page.wait_for_selector('#lib:not([hidden])', timeout=20000)
        page.set_input_files('#file', [txt('連載測試.txt', v1)])
        page.wait_for_function("[...document.querySelectorAll('.bk-t')].some((e) => e.textContent === '連載測試')", timeout=20000)
        bk = [b for b in local() if b['title'] == '連載測試']
        if not ok(len(bk) == 1 and bk[0]['n'] == 5, '第一版應該有 5 章：%s' % local()):
            return
        bid = bk[0]['id']
        # 假裝讀到第 4 章、在第 5 章放了書籤、第 3 章讀完
        js("(() => { const s = (k, v) => localStorage.setItem('pznc.v1.' + k, JSON.stringify(v)); const id = %s; const p = JSON.parse(localStorage.getItem('pznc.v1.prog') || '{}'); p[id] = { ck: 'i3', b: 1, s: 5, x: '雪落', f: .4, t: Date.now() }; s('prog', p); s('bm', { [id]: [{ ck: 'i4', b: 0, s: 0, x: '雪', t: 1 }] }); s('done', { [id]: ['i2'] }); })()" % json.dumps(bid))
        page.reload(wait_until='load'); page.wait_for_selector('#lib:not([hidden])')
        page.locator('.bk:not(.add)', has_text='連載測試').first.click()
        page.wait_for_selector('#bookv:not([hidden]) [data-act="upd-book"]', timeout=8000)
        ok(js("!!document.querySelector('#bookv [data-act=\"del-book\"]')"), '更新按鈕旁邊的垃圾桶不見了')
        shot('book-before')
        # ── 書頁按「更新這本書」──
        with page.expect_file_chooser() as fc:
            page.locator('#bookv [data-act="upd-book"]').click()
        fc.value.set_files(txt('連載測試_更新至第7章.txt', v2))
        ok(wait_toast('多了 3 章'), '書頁更新後應該說「多了 3 章」：%s' % toast())
        ok('最新到第7章' in toast(), '提示應該說最新到第7章：%s' % toast())
        page.wait_for_timeout(500)
        shot('book-updated')
        bk = [b for b in local() if b['title'] == '連載測試']
        ok(len(bk) == 1 and bk[0]['id'] == bid and bk[0]['n'] == 8 and bk[0]['upd'], '更新後應該還是同一本、8 章：%s' % local())
        prog = (store('prog') or {}).get(bid) or {}
        ok(prog.get('ck') == 'i4' and prog.get('b') == 1 and prog.get('s') == 5, '第 4 章前面插了番外，進度應該跟到新的 i4、位置不變：%s' % prog)
        ok(((store('bm') or {}).get(bid) or [{}])[0].get('ck') == 'i5', '書籤應該跟著搬到新的第 5 章（i5）：%s' % store('bm'))
        ok((store('done') or {}).get(bid) == ['i3'], '讀完的第 3 章應該搬到 i3：%s' % store('done'))
        ok(sorted((store('fresh') or {}).get(bid) or []) == ['i2', 'i6', 'i7'], '番外和第 6、7 章應該標成「新」：%s' % store('fresh'))
        ok(js("document.querySelectorAll('#bookv .toc .new').length") == 3, '目錄上應該有 3 個「新」')
        ok(js("document.querySelector('#bookv h1').textContent") == '連載測試', '書名不應該被檔名「更新至第7章」換掉')
        # ── 從「＋」直接匯入新版：認出是同一本、問要不要更新 ──
        page.locator('#bookv [data-act="back"]').click(); page.wait_for_selector('#lib:not([hidden])')
        page.set_input_files('#file', [txt('連載測試（最新）.txt', v3)])
        page.wait_for_selector('#sheet:not([hidden]) [data-act="ask"][data-v="up"]', timeout=15000)
        shot('ask-same')
        page.locator('#sheet [data-act="ask"][data-v="up"]').click()
        ok(wait_toast('多了 2 章'), '匯入時選「更新原本那本」應該多 2 章：%s' % toast())
        bk = [b for b in local() if b['title'] == '連載測試']
        ok(len(bk) == 1 and bk[0]['n'] == 10, '選更新以後不應該多出一本：%s' % local())
        ok(sorted((store('fresh') or {}).get(bid) or []) == ['i2', 'i6', 'i7', 'i8', 'i9'], '還沒讀的「新」要留著、再加上第 8、9 章：%s' % store('fresh'))
        # 同一個檔案再收一次：直接說已經是最新的
        js("document.querySelector('#file').value = ''")
        page.set_input_files('#file', [os.path.join(tmp, '連載測試（最新）.txt')])
        page.wait_for_selector('#sheet:not([hidden]) [data-act="ask"][data-v="up"]', timeout=15000)
        page.locator('#sheet [data-act="ask"][data-v="up"]').click()
        ok(wait_toast('已經是最新的'), '沒有新章節應該說已經是最新的：%s' % toast())
        # 選「另外收一本」
        page.set_input_files('#file', [txt('連載測試 精校版.txt', v1)])
        page.wait_for_selector('#sheet:not([hidden]) [data-act="ask"][data-v="new"]', timeout=15000)
        page.locator('#sheet [data-act="ask"][data-v="new"]').click()
        page.wait_for_timeout(1200)
        ok(len([b for b in local() if '連載測試' in b['title']]) == 2, '選「另外收一本」應該多一本：%s' % local())
        # 取消：什麼都不動
        page.set_input_files('#file', [txt('連載測試 更新.txt', v3)])
        page.wait_for_selector('#sheet:not([hidden]) [data-act="ask"][data-v="cancel"]', timeout=15000)
        page.locator('#sheet [data-act="ask"][data-v="cancel"]').click(); page.wait_for_timeout(800)
        ok(len([b for b in local() if '連載測試' in b['title']]) == 2, '按取消不應該動到藏書：%s' % local())
        # ── 拿一本不相干的書來更新：要先警告 ──
        page.locator('.bk[data-id="%s"]' % bid).first.click()
        page.wait_for_selector('#bookv:not([hidden]) [data-act="upd-book"]')
        cur = page.evaluate("document.querySelector('#bookv [data-act=\"upd-book\"]').dataset.id")
        before = [b for b in local() if b['id'] == cur][0]
        with page.expect_file_chooser() as fc:
            page.locator('#bookv [data-act="upd-book"]').click()
        fc.value.set_files(txt('別本書.txt', ['第一回 開場', '第二回 收場']))
        page.wait_for_selector('#sheet:not([hidden]) [data-act="ask"][data-v="go"]', timeout=15000)
        ok('對不上' in js("document.querySelector('#sheet').textContent"), '不相干的檔案應該警告章節對不上')
        shot('ask-mismatch')
        page.locator('#sheet [data-act="ask"][data-v="cancel"]').click(); page.wait_for_timeout(800)
        ok([b for b in local() if b['id'] == cur][0]['n'] == before['n'], '按「先不要」不應該換掉內容')
        # 讀起來：打開新的第 7 章看得到內容
        page.locator('#bookv .tab[data-tab="toc"]').click()
        page.locator('#bookv .toc .row').nth(7).click()
        page.wait_for_function("(() => { const r = document.querySelector('#reader'); return !r.hidden && !r.classList.contains('loading') && document.querySelector('#opening').hidden; })()", timeout=15000)
        ok('雪落在城牆上' in js("document.querySelector('.leaf .flow').textContent"), '更新後的新章節打不開')
        shot('read-new')
    except Exception:
        shot('FAIL'); print('   toast:', toast(), ' local:', local(), flush=True); raise
    finally:
        for e in errs:
            bad('%s：%s' % (name, e))
        br.close()

def run_secure(p, name, opts, base, out, fx):
    """書房的門（密語、備用碼）、在這台裝置上鎖、書房換鎖、分享這本書（QR、複製、LINE）"""
    import pzcrypt
    print('\n== %s：上鎖、分享 ==' % name, flush=True)
    br, ctx = _ctx(p, opts, base, clip=True)
    page = ctx.new_page()
    page.add_init_script("if (!sessionStorage.getItem('pznc.s')) { sessionStorage.setItem('pznc.s', '1'); localStorage.setItem('pznc.v1.coach', '1'); }")
    errs = []
    _watch(page, errs)
    W = opts['viewport']['width']
    n = [0]

    def shot(tag):
        n[0] += 1
        page.screenshot(path=os.path.join(out, '%s-s%02d-%s.png' % (name, n[0], tag)))

    def js(code):
        return page.evaluate(code)

    def close_sheet():
        page.locator('.sheet-bg').click(position={'x': W / 2, 'y': 10}); page.wait_for_timeout(300)

    def unlock(text):
        page.fill('#gtIn', text); page.locator('.gt-go').click()

    # ── 第一次打開：門 ──
    page.goto(base + APP, wait_until='load')
    page.wait_for_selector('#gate:not([hidden]) #gtIn', timeout=15000); page.wait_for_timeout(700)
    ok(js("document.querySelectorAll('.shelf .bk').length") == 0, '還沒開門，書架就排出來了')
    ok(js("!localStorage.getItem('pznc.v1.lib')"), '還沒開門，這台裝置就存了書架目錄')
    shot('lock')
    unlock('這不是密語')
    try:
        page.wait_for_function("document.querySelector('.gt-msg').classList.contains('bad')", timeout=20000)
        ok('不對' in js("document.querySelector('.gt-msg').textContent"), '打錯密語，應該說「密語不對」')
    except Exception:
        bad('打錯密語沒有任何反應')
    page.wait_for_timeout(450); shot('lock-wrong')
    unlock(FX_CODE.lower().replace('-', ' '))                       # 備用碼：小寫、空白也要認得
    try:
        page.wait_for_selector('#gate', state='hidden', timeout=25000)
    except Exception:
        bad('用備用碼開不了書房')
    page.wait_for_function("document.querySelectorAll('.shelf .bk:not(.add)').length >= %d" % len(fx['books']), timeout=15000); page.wait_for_timeout(500)
    ok(js("JSON.parse(localStorage.getItem('pznc.v1.km'))") == fx['km'], '開了門，這台裝置沒有記住鑰匙')
    shot('unlocked')

    # ── 分享這本書 ──
    b0 = fx['books'][0]
    page.locator('.shelf [data-act="book"][data-id="%s"]' % b0['id']).click(); page.wait_for_selector('#bookv:not([hidden]) .toc'); page.wait_for_timeout(300)
    ok(js("!!document.querySelector('#bookv .bv-btns [data-act=\"share-book\"]')"), '連載的書頁上沒有「分享」')
    page.locator('#bookv .bv-btns [data-act="share-book"]').click()
    try:
        page.wait_for_selector('#sbQr svg', timeout=10000)
    except Exception:
        bad('分享抽屜的 QR code 沒有畫出來')
    page.wait_for_timeout(500); shot('share')
    link = js("document.querySelector('.sb-link').textContent")
    ok(link == fx['links'][b0['id']], '分享連結不對：%s' % link)
    q = qr_text(page.locator('#sbQr').screenshot())
    if q is None:
        warn('沒有 OpenCV，QR code 沒有試掃')
    else:
        ok(q == link, 'QR code 掃出來的不是這本書的連結：%r' % q)
    page.locator('#sheet [data-act="sb-copy"]').first.click(); page.wait_for_timeout(400)
    try:
        ok(js('navigator.clipboard.readText()') == link, '「複製連結」複製到的不是這本書的連結')
    except Exception:
        warn('讀不到剪貼簿，「複製連結」沒有檢查')
    js("window.__opened = []; window.open = (u) => { window.__opened.push(u); return {}; }; 1")
    page.locator('#sheet [data-act="sb-line"]').click(); page.wait_for_timeout(200)
    u = (js('window.__opened') or [''])[-1] or ''
    txt = urllib.parse.unquote(u.split('text=', 1)[1]) if 'text=' in u else ''
    ok(u.startswith('https://line.me/R/share?text=') and '《%s》' % b0['title'] in txt and link.replace('/#k=', '/?openExternalBrowser=1#k=') in txt, '「傳到 LINE」的網址不對：%s' % u[:160])
    close_sheet()
    ok(js("!document.querySelector('#bookv .bv-top [data-act=\"del-book\"]')"), '連載不應該有「移出藏書」')

    # ── 在這台裝置上鎖 ──
    page.locator('#bookv [data-act="back"]').click(); page.wait_for_timeout(400)
    page.locator('.lib-top [data-act="settings"]').click(); page.wait_for_selector('#sheet:not([hidden]) [data-act="lock-ask"]')
    shot('settings')
    page.locator('#sheet [data-act="lock-ask"]').click(); page.wait_for_selector('#sheet:not([hidden]) [data-act="lock-yes"]')
    shot('lock-ask')
    page.locator('#sheet [data-act="lock-yes"]').click()
    page.wait_for_selector('#gate:not([hidden]) #gtIn', timeout=15000); page.wait_for_timeout(500)
    ok(js("!localStorage.getItem('pznc.v1.km') && !localStorage.getItem('pznc.v1.lib')"), '上鎖以後，鑰匙或書架目錄還留在這台裝置')
    ok(js("document.querySelectorAll('.shelf .bk').length") == 0, '上鎖以後書架還看得到')
    shot('locked-again')
    unlock(FX_PASS)
    try:
        page.wait_for_selector('#gate', state='hidden', timeout=25000)
        page.wait_for_function("document.querySelectorAll('.shelf .bk:not(.add)').length >= %d" % len(fx['books']), timeout=15000)
    except Exception:
        bad('上鎖以後用密語開不回來')

    # ── 書房換了鎖（總鑰匙換了）：舊的鑰匙解不開，要重新輸入 ──
    other = pzcrypt.new_master()
    Handler.extra[APP + 'books/library.pzx'] = pzcrypt.seal_json(other, fx['lib'])
    page.locator('.lib-top [data-act="settings"]').click(); page.wait_for_selector('#sheet:not([hidden]) [data-act="sync"]')
    page.locator('#sheet [data-act="sync"]').click()
    try:
        page.wait_for_selector('#gate:not([hidden]) #gtIn', timeout=15000)
        ok('換了新的鎖' in js("document.querySelector('.gt-sub').textContent"), '書房換鎖時，門上沒有說「換了新的鎖」')
        ok(js("!localStorage.getItem('pznc.v1.km')"), '書房換鎖以後，舊鑰匙還留著')
        page.wait_for_timeout(500)
        ok(js("getComputedStyle(document.querySelector('#gate')).opacity") == '1', '書房換鎖時，門擋著卻是透明的（看不見）')
        shot('rekeyed')
    except Exception:
        bad('書房換了鎖，沒有請他重新輸入密語')
    Handler.extra.clear()
    if js("!document.querySelector('#gate').hidden"):
        unlock(FX_PASS)
        try:
            page.wait_for_selector('#gate', state='hidden', timeout=25000)
        except Exception:
            bad('換鎖以後用密語開不回來')
    for e in errs:
        bad('程式錯誤：' + e[:300])
    br.close()


def run_edition(p, name, opts, base, out, fx):
    """單行本：用連結打開、只有這一本、讀、設定、網址少了／錯了鑰匙、新的一回、離線、被收回、全新裝置貼連結"""
    import pzcrypt
    print('\n== %s：單行本 ==' % name, flush=True)
    b0 = fx['books'][0]
    k0 = fx['keys']['books'][b0['id']]
    link = fx['links'][b0['id']]
    bare = link.split('#')[0]
    site_base = bare.rsplit('/' + k0['ed'] + '/', 1)[0]
    br, ctx = _ctx(p, opts, site_base)
    page = ctx.new_page()
    page.add_init_script("try { if (!sessionStorage.getItem('pzsb.t')) { sessionStorage.setItem('pzsb.t', '1'); localStorage.setItem('pzsb.%s.coach', '1'); } } catch (e) {}" % k0['ed'])
    errs = []
    _watch(page, errs, 'ED ')
    W = opts['viewport']['width']
    n = [0]

    def shot(tag, pg=None):
        n[0] += 1
        (pg or page).screenshot(path=os.path.join(out, '%s-e%02d-%s.png' % (name, n[0], tag)))

    def js(code, pg=None):
        return (pg or page).evaluate(code)

    def wait_book(pg=None):
        (pg or page).wait_for_selector('#bookv:not([hidden]) .toc .row', timeout=20000); (pg or page).wait_for_timeout(500)

    def wait_reader():
        page.wait_for_function("(() => { const r = document.querySelector('#reader'); return !r.hidden && !r.classList.contains('loading') && document.querySelector('#opening').hidden; })()", timeout=15000)
        page.wait_for_timeout(400)

    def close_sheet():
        page.locator('.sheet-bg').click(position={'x': W / 2, 'y': 10}); page.wait_for_timeout(300)

    html = open(os.path.join(fx['site_dir'], k0['ed'], 'index.html'), encoding='utf-8').read().lower()
    for w in ('github', 'pz-games', 'pzwei0105', 'apps/next-chapter', '收藏庫'):
        ok(w not in html, '單行本的頁面裡有「%s」（朋友看原始碼就找得到書房）' % w)
    page.goto(link, wait_until='load'); wait_book()
    shot('book')
    ok(page.title() == '《%s》' % b0['title'], '單行本的頁面標題不對：%s' % page.title())
    ok(js("document.querySelectorAll('#bookv .toc .row').length") == len(b0['chapters']), '單行本的目錄回數不對')
    ok(js("!document.querySelector('#bookv [data-act=\"back\"]') && !!document.querySelector('#bookv [data-act=\"settings\"]')"), '單行本的書頁不應該有「回書房」，要有設定')
    ok(js("document.querySelector('#lib').hidden && document.querySelector('#gbar').hidden"), '單行本不應該看得到書房或分類分頁')
    ok(js("!document.querySelector('[data-act=\"share-book\"]') && !document.querySelector('[data-act=\"import\"]')"), '單行本不應該有分享、匯入')
    ok(js("!!document.querySelector('#bookv .hello')"), '第一次打開單行本，沒有說明卡')
    others = [b['title'] for b in fx['books'][1:]]
    ok(not any(t in js("JSON.stringify(localStorage) + document.body.innerHTML") for t in others), '單行本裡看得到別本書的書名')
    ok(('k=' + k0['key']) in js('location.hash'), '網址上的鑰匙不見了')

    page.locator('#bookv .bv-btns [data-act="continue"]').click(); wait_reader()
    ok(len(js("document.querySelector('.leaf .flow').textContent")) > 500, '單行本打不開第一回')
    ok(js("document.querySelector('[data-act=\"rd-share\"]').hidden"), '單行本不應該有「複製整回」')
    shot('read')
    if not js("document.querySelector('#reader').classList.contains('chrome-on')"):
        bb = page.locator('#rdStage').bounding_box()
        page.locator('#rdStage').click(position={'x': bb['width'] / 2, 'y': bb['height'] * .45}); page.wait_for_timeout(400)
    page.locator('[data-act="rd-back"]').click(); page.wait_for_timeout(500)
    ok(js("!document.querySelector('#bookv').hidden && document.querySelector('#reader').hidden"), '從閱讀器返回，沒有回到書頁')

    page.locator('#bookv [data-act="settings"]').click(); page.wait_for_selector('#sheet:not([hidden]) [data-act="look-open"]')
    ok(js("!document.querySelector('#sheet [data-act=\"lock-ask\"]') && document.querySelector('#sheetBody').textContent.includes('自動更新')"), '單行本的設定不對')
    shot('settings')
    close_sheet()
    page.locator('#bookv [data-act="hello-ok"]').click(); page.wait_for_timeout(200)
    page.reload(wait_until='load'); wait_book()
    ok(js("!document.querySelector('#bookv .hello')"), '按了「知道了」，重開說明卡又出現')

    # 網址少了鑰匙：這台裝置記得，而且補回網址上（加到主畫面才帶得走）
    page.goto(bare, wait_until='load'); wait_book()
    ok(('k=' + k0['key']) in js('location.hash'), '網址少了鑰匙，沒有用這台裝置記得的補回去')
    # 網址上的鑰匙被剪壞：用這台裝置記得的那把
    page.goto('about:blank'); page.goto(bare + '#k=' + 'B' * 22, wait_until='load'); wait_book()
    ok(('k=' + k0['key']) in js('location.hash'), '網址上的鑰匙壞了，沒有換回這台裝置記得的那把')

    # 新的一回上架：打開或回到前景就會看到
    bk = pzcrypt.unseal_json(k0['key'], open(os.path.join(fx['site_dir'], k0['ed'], 'book.pzx'), 'rb').read())
    src = bk['book']['chapters'][-1]
    bk['book']['chapters'].append(dict(src, n=src['n'] + 1, label='第九百章', name='測試新回'))
    Handler.extra['/' + k0['ed'] + '/book.pzx'] = pzcrypt.seal_json(k0['key'], bk)
    page.locator('#bookv [data-act="settings"]').click(); page.wait_for_selector('#sheet:not([hidden]) [data-act="sync"]')
    page.locator('#sheet [data-act="sync"]').click()
    try:
        page.wait_for_function("[...document.querySelectorAll('.toast')].some((t) => /測試新回/.test(t.textContent))", timeout=8000)
        page.wait_for_timeout(400)
        ok(js("document.querySelectorAll('#bookv .toc .row').length") == len(b0['chapters']) + 1, '新的一回沒有出現在目錄')
        shot('new-chapter')
    except Exception:
        bad('單行本有新的一回，沒有跳出提示')
    Handler.extra.clear()
    page.reload(wait_until='load'); wait_book()

    # 離線
    sw = js("(async () => { if (!navigator.serviceWorker) return 'none'; const r = await navigator.serviceWorker.ready; return r.active ? 'ok' : 'no'; })()")
    ok(sw == 'ok', '單行本的離線快取沒有啟動：%s' % sw)
    page.reload(wait_until='load'); wait_book(); page.wait_for_timeout(1200)
    ctx.set_offline(True)
    try:
        page.reload(wait_until='load'); wait_book()
        page.locator('#bookv .bv-btns [data-act="continue"]').click(); wait_reader()
        ok(len(js("document.querySelector('.leaf .flow').textContent")) > 500, '單行本離線時讀不到存過的章')
        shot('offline')
    except Exception as ex:
        bad('單行本離線時打不開：%s' % str(ex)[:120])
    ctx.set_offline(False)

    # 被收回（換了連結、舊的下架）：清掉存下來的書，跟讀者說要新的連結
    ctx.route(re.compile(r'.*/book\.pzx(\?.*)?$'), lambda r: r.fulfill(status=404, body='gone'))
    page.goto('about:blank'); page.goto(link, wait_until='load')
    try:
        page.wait_for_selector('#gate.edg.gone:not([hidden])', timeout=10000); page.wait_for_timeout(600)
        ok(js("!localStorage.getItem('pzsb.%s.k') && !localStorage.getItem('pzsb.%s.lib')" % (k0['ed'], k0['ed'])), '連結被收回以後，鑰匙或目錄還留在這台裝置')
        shot('gone')
    except Exception:
        bad('單行本被收回，沒有跟讀者說')
    ctx.unroute(re.compile(r'.*/book\.pzx(\?.*)?$'))

    # 全新的裝置：連結少了鑰匙 → 貼上完整連結
    ctx2 = br.new_context(locale='zh-TW', timezone_id='Asia/Taipei', **opts)
    fr = font_router(site_base)
    ctx2.route(re.compile(r'^https://fonts\.googleapis\.com/.*'), fr if fr else (lambda r: r.abort()))
    q = ctx2.new_page()
    _watch(q, errs, 'ED2 ')
    q.goto(bare, wait_until='load')
    try:
        q.wait_for_selector('#gate.edg.missing:not([hidden]) #gtIn', timeout=10000); q.wait_for_timeout(500)
        shot('missing', q)
        q.fill('#gtIn', '給你看這本：' + link + '　很好看'); q.locator('.gt-go').click()
        wait_book(q)
        ok(q.title() == '《%s》' % b0['title'], '貼上完整連結以後沒有打開這本書')
    except Exception as ex:
        bad('連結少了鑰匙，沒有讓讀者貼上完整連結：%s' % str(ex)[:120])
    # 鑰匙是錯的、這台裝置什麼都沒記
    ctx3 = br.new_context(locale='zh-TW', timezone_id='Asia/Taipei', **opts)
    ctx3.route(re.compile(r'^https://fonts\.googleapis\.com/.*'), fr if fr else (lambda r: r.abort()))
    r3 = ctx3.new_page()
    _watch(r3, errs, 'ED3 ')
    r3.goto(bare + '#k=' + 'C' * 22, wait_until='load')
    try:
        r3.wait_for_selector('#gate.edg.bad:not([hidden])', timeout=10000); r3.wait_for_timeout(400)
        shot('badkey', r3)
    except Exception:
        bad('鑰匙錯了，沒有跟讀者說連結打不開')
    for e in errs:
        bad('程式錯誤：' + e[:300])
    br.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='/tmp/pznc-check')
    ap.add_argument('--only')
    ap.add_argument('--features', action='store_true', help='只跑新功能那一段（＋上鎖、分享、單行本）')
    ap.add_argument('--secure', action='store_true', help='只跑上鎖、分享、單行本')
    ap.add_argument('--update', action='store_true', help='只跑匯入的書更新''')
    ap.add_argument('--fixture', help='只組假書房到這個資料夾（check_webkit.py 用）')
    ap.add_argument('--site', help='配 --fixture：單行本網站的網址')
    a = ap.parse_args()
    if a.fixture:
        fx = fixture(a.fixture)
        if a.site:
            fx['set_site'](a.site)
        json.dump({'km': fx['km'], 'books_dir': fx['books_dir'], 'site_dir': fx['site_dir'], 'lib': fx['lib'], 'links': fx.get('links', {}), 'pass': FX_PASS},
                  open(os.path.join(a.fixture, 'fixture.json'), 'w'), ensure_ascii=False)
        return
    from playwright.sync_api import sync_playwright
    shutil.rmtree(a.out, ignore_errors=True); os.makedirs(a.out)
    tmp = sample_files(os.path.join(a.out, 'files'))
    fx = fixture(os.path.join(a.out, 'fx'))
    Handler.books = fx['books_dir']
    srv = Server(('127.0.0.1', 0), functools.partial(Handler, directory=REPO))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:%d' % srv.server_address[1]
    site = Server(('127.0.0.1', 0), functools.partial(Handler, directory=fx['site_dir']))      # 單行本網站：另一個網域（port）
    threading.Thread(target=site.serve_forever, daemon=True).start()
    fx['set_site']('http://127.0.0.1:%d' % site.server_address[1])
    with sync_playwright() as p:
        for name, opts in (('phone', PHONE), ('desk', DESK)):
            if a.only and a.only != name:
                continue
            if a.update or not a.secure:
                try:
                    run_update(p, name, opts, base, a.out, tmp, fx)
                except Exception as ex:
                    bad('%s：更新檢查中斷：%s' % (name, str(ex)[:400]))
            if a.update:
                continue
            if not a.features and not a.secure:
                try:
                    run(p, name, opts, base, a.out, tmp, srv, fx)
                except Exception as ex:
                    bad('%s：檢查中斷：%s' % (name, str(ex)[:400]))
            if not a.secure:
                try:
                    run_features(p, name, opts, base, a.out, tmp, fx)
                except Exception as ex:
                    bad('%s：新功能檢查中斷：%s' % (name, str(ex)[:400]))
            try:
                run_secure(p, name, opts, base, a.out, fx)
            except Exception as ex:
                bad('%s：上鎖／分享檢查中斷：%s' % (name, str(ex)[:400]))
            try:
                run_edition(p, name, opts, base, a.out, fx)
            except Exception as ex:
                bad('%s：單行本檢查中斷：%s' % (name, str(ex)[:400]))
    srv.shutdown(); site.shutdown()
    print('\n%d BAD, %d WARN；截圖在 %s' % (len(BAD), len(WARN), a.out))
    sys.exit(1 if BAD else 0)


if __name__ == '__main__':
    main()
