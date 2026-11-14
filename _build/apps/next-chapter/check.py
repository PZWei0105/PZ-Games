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

    def log_message(self, *a):
        pass

    def translate_path(self, path):
        p = urllib.parse.unquote(urllib.parse.urlparse(path).path)
        if p.startswith('/__fs/'):
            return os.path.join(FONTS, p[len('/__fs/'):])
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


def run(p, name, opts, base, out, tmp, srv):
    import shelf
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
    lib = shelf.load()
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
    Handler.extra[APP + 'books/library.json'] = json.dumps(lib2, ensure_ascii=False).encode('utf-8')
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


def run_features(p, name, opts, base, out, tmp):
    import shelf
    print('\n== %s：新功能 ==' % name, flush=True)
    lib = shelf.load()
    zb = next((b for b in lib['books'] if b['id'] == 'zhen-zi-bianguan'), lib['books'][0])
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
    page.add_init_script("if (!sessionStorage.getItem('pznc.t')) { sessionStorage.setItem('pznc.t', '1'); localStorage.setItem('pznc.v1.coach', '1'); }")
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
    want_tabs = ['toc', 'marks', 'search'] + (['recap'] if zb.get('recaps') else [])
    ok(js("[...document.querySelectorAll('#bookv .tab')].map((e) => e.dataset.tab)") == want_tabs, '書頁的分頁不對')
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
        rc = json.loads(shelf.unpack(open(os.path.join(shelf.BOOKS, zb['id'], zb['recaps']['f']), 'rb').read()))['recaps']
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='/tmp/pznc-check')
    ap.add_argument('--only')
    ap.add_argument('--features', action='store_true', help='只跑新功能那一段')
    a = ap.parse_args()
    from playwright.sync_api import sync_playwright
    shutil.rmtree(a.out, ignore_errors=True); os.makedirs(a.out)
    tmp = sample_files(os.path.join(a.out, 'files'))
    srv = Server(('127.0.0.1', 0), functools.partial(Handler, directory=REPO))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:%d' % srv.server_address[1]
    with sync_playwright() as p:
        for name, opts in (('phone', PHONE), ('desk', DESK)):
            if a.only and a.only != name:
                continue
            if not a.features:
                try:
                    run(p, name, opts, base, a.out, tmp, srv)
                except Exception as ex:
                    bad('%s：檢查中斷：%s' % (name, str(ex)[:400]))
            try:
                run_features(p, name, opts, base, a.out, tmp)
            except Exception as ex:
                bad('%s：新功能檢查中斷：%s' % (name, str(ex)[:400]))
    srv.shutdown()
    print('\n%d BAD, %d WARN；截圖在 %s' % (len(BAD), len(WARN), a.out))
    sys.exit(1 if BAD else 0)


if __name__ == '__main__':
    main()
