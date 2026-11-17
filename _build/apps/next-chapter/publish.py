#!/usr/bin/env python3
"""下回分解 — 把書組成「加密的書房」和「單行本網站」。

這支程式本身不放任何小說：書（原稿）和鑰匙由呼叫的人給——
  - 私人倉庫 pz-novels 的 tools/shelf.py publish（真的書）
  - check.py（測試用的假書）

  library_files(books, keys, keyring) → {相對 apps/next-chapter/books/ 的路徑: bytes}
  site_files(books, keys, site_dir)   → {相對 site/ 的路徑: bytes}（site_dir 是現有的網站資料夾：圖沒變就沿用）
  sync(folder, files)                 → 寫進資料夾、刪掉不再需要的檔；回傳 (新增, 改了, 刪掉)

書（book）的樣子：
  {'id', 'title', 'author', 'status', 'genre', 'blurb', 'cover': {cloth, seal, motif},
   'chapters': [{'n', 'label', 'name', 'body'(正文), 'chars', 'added', 'at'?, 'rev'?}],
   'recaps': {'1': '…'}}
鑰匙（keys）：{'master', 'site', 'books': {id: {'key', 'pub', 'ed'}}}（pz-novels 的 keys.json）

加密是決定性的（tools/pzcrypt.py）：內容沒變，檔案就一模一樣，重組不會讓 git 每次都變。
"""
import hashlib, html, json, os, re, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'tools'))
sys.path.insert(0, HERE)
import pzcrypt  # noqa: E402

SRC = os.path.join(HERE, 'src')
FONTS = os.path.abspath(os.path.join(HERE, '..', '..', 'tools', 'fonts', 'node_modules', '@fontsource'))

TOMBSTONE = {
    'v': 1, 'books': [],
    'STOP': ('小說已經搬到私人倉庫 PZWei0105/pz-novels，這個資料夾只放加密檔（keyring.json、library.pzx、各書資料夾）。'
             '不要在這裡上架、不要 merge／rebase 舊的提交：PZ-Games 的歷史在 2026-11-15 改寫過（拿掉了舊的小說檔）。'
             '你手上的 clone 如果比那天舊：先 git fetch origin && git reset --hard origin/main（還沒推上去的章節改用 pz-novels 的 tools/shelf.py 上架），'
             '再讀 _build/apps/next-chapter/README.md。'),
}


def ver(blob):
    return hashlib.sha1(blob).hexdigest()[:8]


def _when(c):
    return c.get('at') or (c['added'] + 'T12:00:00+08:00')


def book_payload(book, key):
    """一本書的加密檔（章節、提要）與目錄資料（不含鑰匙）。檔名書房、單行本兩邊一樣。"""
    files, chs = {}, []
    for c in sorted(book['chapters'], key=lambda c: c['n']):
        fn = '%03d.pzx' % c['n']
        blob = pzcrypt.seal(key, c['body'].encode('utf-8'))
        files[fn] = blob
        e = {'n': c['n'], 'label': c['label'], 'name': c.get('name', ''), 'f': fn, 'v': ver(blob), 'chars': c['chars'], 'added': c['added']}
        for k in ('at', 'rev'):
            if c.get(k):
                e[k] = c[k]
        chs.append(e)
    meta = {k: book[k] for k in ('title', 'author', 'status', 'genre', 'blurb', 'cover') if book.get(k) is not None}
    meta['chapters'] = chs
    rc = {k: v for k, v in (book.get('recaps') or {}).items() if v}
    if rc:
        rc = {k: rc[k] for k in sorted(rc, key=int)}
        blob = pzcrypt.seal_json(key, {'v': 1, 'recaps': rc})
        files['recaps.pzx'] = blob
        meta['recaps'] = {'f': 'recaps.pzx', 'v': ver(blob), 'n': len(rc)}
    meta['updated'] = max([_when(c) for c in book['chapters']] or [''])
    return files, meta


def audit_payload(book, master):
    """巡查報告：只放書房、用總鑰匙加密（單行本的鑰匙解不開，拿到分享連結的朋友看不到）。
    book['audit'] = {'reports': [{'id', 'from', 'to', 'date', 'kind', 'summary', 'fixed': [...], 'items': [...]}]}"""
    a = book.get('audit') or {}
    reps = [r for r in (a.get('reports') or []) if r]
    if not reps:
        return None, None
    blob = pzcrypt.seal_json(master, {'v': 1, 'reports': reps})
    items = [it for r in reps for it in (r.get('items') or [])]
    meta = {'f': 'audit.pzx', 'v': ver(blob), 'n': len(reps), 'open': sum(1 for it in items if it.get('status', '待決定') == '待決定'),
            'last': reps[-1].get('date', ''), 'upto': max(int(r.get('to') or 0) for r in reps)}
    return blob, meta


def library_files(books, keys, keyring):
    """書房：keyring.json（公開，用密語包著總鑰匙）＋ library.pzx（總鑰匙）＋ 每本書一個看不出書名的資料夾。"""
    out, entries = {}, []
    for b in books:
        k = keys['books'][b['id']]
        files, meta = book_payload(b, k['key'])
        for fn, blob in files.items():
            out[k['pub'] + '/' + fn] = blob
        ablob, ameta = audit_payload(b, keys['master'])
        if ablob:
            out[k['pub'] + '/audit.pzx'] = ablob
            meta = dict(meta, audit=ameta)
        entries.append(dict(meta, id=b['id'], pub=k['pub'], key=k['key'], ed=k['ed']))
    lib = {'v': 2, 'updated': max([e['updated'] for e in entries] or ['']), 'site': (keys.get('site') or '').rstrip('/'), 'books': entries}
    out['library.pzx'] = pzcrypt.seal_json(keys['master'], lib)
    out['keyring.json'] = (json.dumps(keyring, ensure_ascii=False, indent=1) + '\n').encode('utf-8')
    out['library.json'] = (json.dumps(TOMBSTONE, ensure_ascii=False, indent=1) + '\n').encode('utf-8')
    return out


# ── 單行本網站 ──
def _mix(hexc, to, a):
    c = [int(hexc[i:i + 2], 16) for i in (1, 3, 5)]
    t = [int(to[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join('%02x' % round(v + (t[i] - v) * a) for i, v in enumerate(c))


def _cloth(b):
    c = (b.get('cover') or {}).get('cloth') or '#1d2f4a'
    return c if re.match(r'^#[0-9a-fA-F]{6}$', c) else '#1d2f4a'


def art_key(b):
    """封面圖示、預覽圖要不要重畫：書名、作者、簡介、狀態、封面設定變了才重畫。"""
    raw = json.dumps([b.get('title'), b.get('author'), b.get('blurb'), b.get('status'), b.get('cover')], ensure_ascii=False)
    return hashlib.sha1(raw.encode('utf-8')).hexdigest()[:8]


def _short(s, n):
    s = re.sub(r'\s+', '', s or '')
    return s if len(s) <= n else s[:n - 1] + '…'


def edition_html(shell, b, ed, site, art):
    e = html.escape
    title, blurb = b['title'], _short(b.get('blurb', ''), 110)
    base = (site.rstrip('/') + '/' + ed + '/') if site else ''
    cloth = _cloth(b)
    head = '\n'.join([
        '<title>《%s》</title>' % e(title),
        '<meta name="description" content="%s">' % e(blurb),
        '<meta name="robots" content="noindex, nofollow, noarchive">',
        '<meta name="referrer" content="no-referrer">',
        '<meta name="theme-color" content="%s">' % _mix(cloth, '#000000', .45),
        '<meta name="color-scheme" content="dark">',
        '<meta name="mobile-web-app-capable" content="yes">',
        '<meta name="apple-mobile-web-app-capable" content="yes">',
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
        '<meta name="apple-mobile-web-app-title" content="%s">' % e(_short(title, 12)),
        '<meta property="og:type" content="book">',
        '<meta property="og:title" content="《%s》">' % e(title),
        '<meta property="og:description" content="%s">' % e(blurb),
        '<meta property="og:image" content="%sog.png?v=%s">' % (e(base), art),
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
    ] + (['<meta property="og:url" content="%s">' % e(base)] if base else []) + [
        '<meta name="twitter:card" content="summary_large_image">',
        '<link rel="icon" type="image/png" href="icon-192.png?v=%s">' % art,
        '<link rel="manifest" href="manifest.webmanifest?v=%s">' % art,
        '<link rel="apple-touch-icon" href="apple-touch-icon.png?v=%s">' % art,
    ]) + '\n'
    pub = {'ed': ed, 'title': title, 'author': b.get('author', ''), 'cover': b.get('cover') or {}, 'genre': b.get('genre', ''), 'status': b.get('status', ''), 'blurb': b.get('blurb', '')}
    js = json.dumps(pub, ensure_ascii=False).replace('</', '<\\/')
    s = re.sub(r'<!--HEAD-->.*?<!--/HEAD-->\n', lambda m: head, shell, count=1, flags=re.S)
    return s.replace('<!--EDITION-->', '<script>window.__PZ_ED = ' + js + ';</script>', 1)


def edition_manifest(b, ed, art):
    cloth = _cloth(b)
    m = {
        'id': '/' + ed + '/',
        'name': '《' + b['title'] + '》',
        'short_name': _short(b['title'], 12),
        'description': _short(b.get('blurb', ''), 120),
        'lang': 'zh-Hant-TW',
        'scope': './',
        'display': 'standalone',
        'orientation': 'any',
        'background_color': _mix(cloth, '#000000', .55),
        'theme_color': _mix(cloth, '#000000', .45),
        'icons': [
            {'src': 'icon-192.png?v=' + art, 'sizes': '192x192', 'type': 'image/png'},
            {'src': 'icon-512.png?v=' + art, 'sizes': '512x512', 'type': 'image/png'},
            {'src': 'maskable-512.png?v=' + art, 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
        ],
    }
    # 不寫 start_url：沒有它，加到主畫面時用的就是當下的網址（連同 #k= 鑰匙）；iPhone 主畫面的 App 跟 Safari 不共用儲存空間，鑰匙只能跟著網址走。
    return (json.dumps(m, ensure_ascii=False, indent=1) + '\n').encode('utf-8')


ROOT_HTML = """<!DOCTYPE html>
<html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>單行本</title><meta name="robots" content="noindex, nofollow"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#0b1422">
<style>html,body{margin:0;height:100%;background:#0b1422;color:#dfe6ee;font:16px/1.8 "Noto Serif TC","Songti TC","PMingLiU",serif}
main{min-height:100%;display:grid;place-items:center;padding:32px 24px;box-sizing:border-box;text-align:center;
background:radial-gradient(60% 40% at 50% 28%,rgba(255,186,110,.14),transparent 70%),radial-gradient(90% 60% at 50% 110%,rgba(46,82,128,.5),transparent 72%)}
.s{width:46px;height:46px;margin:0 auto 18px;border-radius:7px;background:#b3382c;color:#fff;font:700 27px/46px serif;box-shadow:inset 0 0 0 2px rgba(255,255,255,.28)}
h1{margin:0;font-size:24px;letter-spacing:.3em}p{margin:10px auto 0;max-width:320px;color:#8fa0b5;font-size:14.5px}</style></head>
<body><main><div><div class="s">書</div><h1>__H__</h1><p>__P__</p></div></main></body></html>
"""

HEADERS = """/*
  X-Robots-Tag: noindex, nofollow, noarchive
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
/*/sw.js
  Cache-Control: no-cache
/*/book.pzx
  Cache-Control: no-cache
/*/manifest.webmanifest
  Content-Type: application/manifest+json
"""


def _fonts_ok():
    return os.path.isfile(os.path.join(FONTS, 'lxgw-wenkai-tc', '700.css')) and os.path.isfile(os.path.join(FONTS, 'noto-serif-tc', '700.css'))


ART_PAGE = """<!DOCTYPE html><html><head><meta charset="utf-8">__FONTS__
<style>
body{margin:0;background:transparent}
:root{--kai:"LXGW WenKai TC","Noto Serif CJK TC","Noto Sans CJK TC",serif;--song:"Noto Serif TC","Noto Serif CJK TC","Noto Sans CJK TC",serif}
.cv-t{font-family:var(--kai);font-weight:700;fill:#2a2118}.cv-s{font-family:var(--kai);font-weight:700;fill:#fff}
.cover-svg{width:100%;height:100%;display:block}
#ic{width:512px;height:512px;position:relative;overflow:hidden}
#ic .bg{position:absolute;inset:0}
#ic .bk{position:absolute;left:50%;top:50%;border-radius:4px;overflow:hidden;box-shadow:0 22px 44px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.06)}
#og{width:1200px;height:630px;position:relative;overflow:hidden;display:flex;align-items:center;gap:64px;padding:0 84px 0 104px;box-sizing:border-box;color:#ece4d2}
#og .bg{position:absolute;inset:0}
#og .bk{flex:none;position:relative;width:300px;height:450px;border-radius:4px;overflow:hidden;transform:rotate(-2.5deg);box-shadow:0 34px 60px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.07)}
#og .tx{position:relative;min-width:0;flex:1}
#og .k{font:400 24px/1 var(--kai);letter-spacing:.4em;color:#e3c88a;opacity:.95}
#og h1{margin:22px 0 0;font:700 78px/1.15 var(--kai);letter-spacing:.06em;color:#f3ecdc;text-shadow:0 4px 30px rgba(0,0,0,.45)}
#og .by{margin:14px 0 0;font:400 26px/1.4 var(--kai);color:#c9a45c;letter-spacing:.08em}
#og p{margin:26px 0 0;font:400 25px/1.75 var(--song);color:#c7d0dc;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
#og .seal{position:absolute;right:46px;bottom:40px;width:64px;height:64px;border-radius:9px;background:#b3382c;color:#fff;font:700 40px/64px var(--kai);text-align:center;box-shadow:inset 0 0 0 2.5px rgba(255,255,255,.3)}
</style></head><body><div id="ic"><div class="bg"></div><div class="bk"></div></div><div id="og"><div class="bg"></div><div class="bk"></div><div class="tx"><div class="k"></div><h1></h1><div class="by"></div><p></p></div><div class="seal"></div></div>
<script>
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=(s)=>String(s==null?'':s).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hash32(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
__COVERS__
function mix(hex,to,a){const p=(h)=>[1,3,5].map((i)=>parseInt(h.slice(i,i+2),16));const c=p(hex),t=p(to);return '#'+c.map((v,i)=>Math.round(v+(t[i]-v)*a).toString(16).padStart(2,'0')).join('');}
function paint(b, mode){
  const cloth=(b.cover&&b.cover.cloth)||'#1d2f4a';
  const bg='radial-gradient(circle at 74% 8%, '+mix(cloth,'#ffffff',.22)+' 0%, '+cloth+' 42%, '+mix(cloth,'#000000',.62)+' 100%)';
  const ic=document.querySelector('#ic');
  ic.style.borderRadius=mode.rad+'px';
  ic.querySelector('.bg').style.background=bg;
  const bk=ic.querySelector('.bk'), h=512*mode.sc, w=h/1.5;
  bk.style.width=w+'px';bk.style.height=h+'px';bk.style.transform='translate(-50%,-50%) rotate('+(mode.tilt||0)+'deg)';
  bk.innerHTML=Cover.svg(b,{k:'ic'});
  const og=document.querySelector('#og');
  og.querySelector('.bg').style.background='radial-gradient(70% 90% at 22% 40%, '+mix(cloth,'#ffffff',.16)+' 0%, '+mix(cloth,'#000000',.35)+' 55%, '+mix(cloth,'#000000',.72)+' 100%)';
  og.querySelector('.bk').innerHTML=Cover.svg(b,{k:'og'});
  og.querySelector('.k').textContent='單行本・'+(b.status||'連載中');
  const h1=og.querySelector('h1'), tx=og.querySelector('.tx');
  h1.textContent='《'+b.title+'》'; h1.style.whiteSpace='nowrap';
  let fs=78; h1.style.fontSize=fs+'px';
  while(h1.scrollWidth>tx.clientWidth&&fs>44){fs-=2;h1.style.fontSize=fs+'px';}
  if(h1.scrollWidth>tx.clientWidth) h1.style.whiteSpace='normal';
  og.querySelector('.by').textContent=b.author||'';
  og.querySelector('p').textContent=b.blurb||'';
  og.querySelector('.seal').textContent=(b.cover&&b.cover.seal)||Array.from(b.title)[0];
}
</script></body></html>"""


def render_art(books):
    """畫每本書的主畫面圖示（四種尺寸）和 LINE 預覽圖（1200×630）。要 Playwright；字型用 _build/tools/fonts 的 fontsource（沒有就用系統字）。"""
    from playwright.sync_api import sync_playwright
    fonts = ''
    if not _fonts_ok():                                    # 字型沒裝：先裝（npm，幾秒鐘），圖示上的書名才是楷體
        import subprocess
        try:
            os.makedirs(os.path.dirname(os.path.dirname(FONTS)), exist_ok=True)
            subprocess.run(['npm', 'i', '--silent', '@fontsource/noto-serif-tc', '@fontsource/lxgw-wenkai-tc', '@fontsource/noto-sans-tc'],
                           cwd=os.path.dirname(os.path.dirname(FONTS)), timeout=240, check=False, capture_output=True)
        except Exception:
            pass
    if _fonts_ok():
        for pkg, w in (('lxgw-wenkai-tc', '400'), ('lxgw-wenkai-tc', '700'), ('noto-serif-tc', '400'), ('noto-serif-tc', '700')):
            fonts += '<link rel="stylesheet" href="file://%s">' % os.path.join(FONTS, pkg, w + '.css')
    else:
        print('注意：沒有找到 fontsource 字型（_build/tools/fonts），圖示上的字會用系統字型')
    covers = open(os.path.join(SRC, 'covers.js'), encoding='utf-8').read()
    page_html = ART_PAGE.replace('__FONTS__', fonts).replace('__COVERS__', covers)
    out = {}
    with tempfile.TemporaryDirectory() as td:
        path = os.path.join(td, 'art.html')
        open(path, 'w', encoding='utf-8').write(page_html)
        with sync_playwright() as p:
            br = p.chromium.launch()
            for b in books:
                bb = {k: b.get(k) for k in ('id', 'title', 'author', 'status', 'blurb', 'cover')}
                res = {}
                for name, size, mode in (('icon-512.png', 512, {'rad': 0, 'sc': .74, 'tilt': -3}), ('icon-192.png', 192, {'rad': 0, 'sc': .74, 'tilt': -3}),
                                         ('maskable-512.png', 512, {'rad': 0, 'sc': .58, 'tilt': -3}), ('apple-touch-icon.png', 180, {'rad': 0, 'sc': .74, 'tilt': -3})):
                    pg = br.new_page(viewport={'width': 512, 'height': 512}, device_scale_factor=size / 512)
                    pg.goto('file://' + path)
                    pg.evaluate('([b, m]) => paint(b, m)', [bb, mode])
                    pg.evaluate('document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 120)))')
                    res[name] = pg.locator('#ic').screenshot(type='png')
                    pg.close()
                pg = br.new_page(viewport={'width': 1200, 'height': 630})
                pg.goto('file://' + path)
                pg.evaluate('([b, m]) => paint(b, m)', [bb, {'rad': 0, 'sc': .74}])
                pg.evaluate('document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 150)))')
                res['og.png'] = pg.locator('#og').screenshot(type='png')
                pg.close()
                out[b['id']] = res
            br.close()
    try:
        from PIL import Image
        import io
        for res in out.values():
            for k, v in list(res.items()):
                im = Image.open(io.BytesIO(v))
                o = io.BytesIO()
                (im.convert('RGB') if k == 'og.png' or k == 'apple-touch-icon.png' else im).save(o, 'PNG', optimize=True)
                res[k] = o.getvalue()
    except Exception:
        pass
    return out


def _stub_art(b):
    """畫不了圖（沒有 Playwright）時先放純色圖；版本記成 stub，下次能畫的時候就會重畫"""
    from PIL import Image
    import io
    out = {}
    for n, sz in (('icon-512.png', (512, 512)), ('icon-192.png', (192, 192)), ('maskable-512.png', (512, 512)), ('apple-touch-icon.png', (180, 180)), ('og.png', (1200, 630))):
        o = io.BytesIO()
        Image.new('RGB', sz, _cloth(b)).save(o, 'PNG')
        out[n] = o.getvalue()
    return out


def _old_art(site_dir, ed):
    """這本書現在網站上的圖是用哪一版畫的（manifest 裡 ?v=）"""
    try:
        m = json.load(open(os.path.join(site_dir, ed, 'manifest.webmanifest'), encoding='utf-8'))
        v = m['icons'][0]['src'].split('?v=')[1]
        names = ('icon-512.png', 'icon-192.png', 'maskable-512.png', 'apple-touch-icon.png', 'og.png')
        if all(os.path.isfile(os.path.join(site_dir, ed, n)) for n in names):
            return v, {n: open(os.path.join(site_dir, ed, n), 'rb').read() for n in names}
    except Exception:
        pass
    return None, None


def site_files(books, keys, site_dir, shell=None, render=True):
    """單行本網站：每本書一個資料夾（代號是亂數），網站首頁什麼書都不列。"""
    import build
    if shell is None:
        probe = build.edition_shell('0')
        version = 'e' + hashlib.sha1(probe.encode('utf-8')).hexdigest()[:7]
        shell = build.edition_shell(version)
    else:
        version = 'e' + hashlib.sha1(shell.encode('utf-8')).hexdigest()[:7]
    site = (keys.get('site') or '').rstrip('/')
    out = {
        'index.html': ROOT_HTML.replace('__H__', '單行本').replace('__P__', '每一本書都有自己的連結。<br>請向分享給你的人要。').encode('utf-8'),
        '404.html': ROOT_HTML.replace('__H__', '找不到這本書').replace('__P__', '這個連結可能已經換了新的。<br>請向分享給你的人要新的連結。').encode('utf-8'),
        'robots.txt': b'User-agent: *\nDisallow: /\n',
        '_headers': HEADERS.encode('utf-8'),
    }
    need, arts, ver_of = [], {}, {}
    for b in books:
        ed = keys['books'][b['id']]['ed']
        want = art_key(b)
        have, files = _old_art(site_dir, ed) if site_dir else (None, None)
        if have == want or (have == 'stub' and not render):
            arts[b['id']], ver_of[b['id']] = files, have
        else:
            need.append(b)
    if need and render:
        try:
            arts.update(render_art(need))
            ver_of.update({b['id']: art_key(b) for b in need})
        except Exception as ex:
            print('注意：封面圖示畫不出來（%s），先放純色圖，下次 publish 會再試' % str(ex)[:120])
            render = False
    for b in need:
        if b['id'] not in arts:
            arts[b['id']], ver_of[b['id']] = _stub_art(b), 'stub'
    for b in books:
        k = keys['books'][b['id']]
        ed, art = k['ed'], ver_of[b['id']]
        files, meta = book_payload(b, k['key'])
        for fn, blob in files.items():
            out[ed + '/' + fn] = blob
        out[ed + '/book.pzx'] = pzcrypt.seal_json(k['key'], {'v': 2, 'updated': meta['updated'], 'book': dict(meta, id=ed)})
        out[ed + '/index.html'] = edition_html(shell, b, ed, site, art).encode('utf-8')
        out[ed + '/manifest.webmanifest'] = edition_manifest(b, ed, art)
        out[ed + '/sw.js'] = build.edition_sw(version, ed).encode('utf-8')
        for n, blob in (arts.get(b['id']) or {}).items():
            out[ed + '/' + n] = blob
    return out


def sync(folder, files):
    """把 files 寫進 folder：一樣的不動、不一樣的覆蓋、多出來的刪掉（只動 folder 裡面）。"""
    added, changed, removed = [], [], []
    os.makedirs(folder, exist_ok=True)
    for rel, blob in sorted(files.items()):
        p = os.path.join(folder, rel)
        if os.path.isfile(p):
            if open(p, 'rb').read() == blob:
                continue
            changed.append(rel)
        else:
            added.append(rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'wb') as f:
            f.write(blob)
    for root, dirs, fns in os.walk(folder, topdown=False):
        for fn in fns:
            rel = os.path.relpath(os.path.join(root, fn), folder).replace(os.sep, '/')
            if rel not in files:
                os.remove(os.path.join(root, fn))
                removed.append(rel)
        if root != folder and not os.listdir(root):
            os.rmdir(root)
    return added, changed, removed
