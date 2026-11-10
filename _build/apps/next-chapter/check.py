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
    act('book')
    page.wait_for_selector('#bookv:not([hidden]) .toc .row')
    page.wait_for_timeout(300)
    shot('book')
    ok(js("document.querySelectorAll('#bookv .toc .row').length") == len(bk['chapters']), '目錄的回數跟書架不一樣')

    # ── 開書 ──
    page.locator('#bookv [data-act="continue"]').click()
    page.wait_for_timeout(420)
    shot('opening')
    wait_reader()
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='/tmp/pznc-check')
    ap.add_argument('--only')
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
            try:
                run(p, name, opts, base, a.out, tmp, srv)
            except Exception as ex:
                bad('%s：檢查中斷：%s' % (name, str(ex)[:400]))
    srv.shutdown()
    print('\n%d BAD, %d WARN；截圖在 %s' % (len(BAD), len(WARN), a.out))
    sys.exit(1 if BAD else 0)


if __name__ == '__main__':
    main()
