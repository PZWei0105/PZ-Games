#!/usr/bin/env python3
"""觀戰 SPECTATE — 組建腳本

把 src/ 的 HTML、CSS、JS、英文字型內嵌成單一 index.html，輸出網頁版到 <repo>/apps/spectate/（含 manifest、service worker、圖示）。
**不碰 apps/spectate/data/**：channels.json 手寫，me.json／roster.json 由 GitHub Actions 寫。
影片資料不在 main：管線推到 spectate-data 分支，App 從 raw.githubusercontent.com 讀。

沒有 Claude 版：artifact 裡不能嵌 YouTube 播放器、也讀不到每 20 分鐘更新的資料（同《解包》《全知》的理由）。

用法：
  python3 _build/apps/spectate/build.py            # 網頁版
  python3 _build/apps/spectate/build.py --icons    # 重畫圖示（需要 playwright）
"""
import datetime
import argparse, base64, json, os, re, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
OUT = os.path.join(REPO, 'apps', 'spectate')
JS_ORDER = ['core.js', 'sound.js', 'fx.js', 'player.js', 'views.js', 'storm.js', 'quest.js', 'main.js']
FONTS = [
    ('teko-latin-500-normal.woff2', 'Teko', 500, 'normal'),
    ('teko-latin-600-normal.woff2', 'Teko', 600, 'normal'),
    ('teko-latin-700-normal.woff2', 'Teko', 700, 'normal'),
    ('chakra-petch-latin-600-normal.woff2', 'Chakra Petch', 600, 'normal'),
    ('chakra-petch-latin-600-italic.woff2', 'Chakra Petch', 600, 'italic'),
]
MANIFEST = {
    'name': '觀戰 SPECTATE',
    'short_name': '觀戰',
    'description': '痞子葳的遊戲轉播台：只有遊戲的 YouTube——預告、直播、評測、實況，中文優先；不跟家裡的帳號混在一起，也不被演算法關進同溫層。',
    'lang': 'zh-Hant-TW',
    'start_url': './',
    'scope': './',
    'display': 'standalone',
    'orientation': 'any',
    'background_color': '#06070b',
    'theme_color': '#06070b',
    'icons': [
        {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}


def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()


def fonts_css():
    out = []
    for fn, fam, w, style in FONTS:
        with open(os.path.join(SRC, 'fonts', fn), 'rb') as f:
            b64 = base64.b64encode(f.read()).decode('ascii')
        out.append('@font-face{font-family:"%s";font-style:%s;font-weight:%d;font-display:swap;src:url(data:font/woff2;base64,%s) format("woff2")}' % (fam, style, w, b64))
    return '\n'.join(out)


BUILD = datetime.datetime.now(datetime.timezone.utc).strftime('%y%m%d%H%M%S')   # 這次組建的代號（ver.json 也寫這個）


def version():
    with open(os.path.join(ROOT, 'VERSION'), encoding='utf-8') as f:
        return f.read().strip()


def compose(ver):
    html = read('index.html')
    js = '\n'.join('/* ---- %s ---- */\n' % n + read(n) for n in JS_ORDER)
    css = read('style.css')
    for k, v in (('CSS', css), ('JS', js)):
        assert '</script' not in v.lower(), k + ' contains </script>'
        assert '</style' not in v.lower(), k + ' contains </style>'
    assert "const VERSION = '1.0.0';" in js
    js = js.replace("const VERSION = '1.0.0';", "const VERSION = '%s';" % ver)
    assert "const BUILD = 'dev';" in js
    js = js.replace("const BUILD = 'dev';", "const BUILD = '%s';" % BUILD)
    head = ('<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
            '<link rel="icon" type="image/png" href="icons/icon-192.png">')
    html = html.replace('<!--WEBHEAD-->', head, 1).replace('<!--WEBFLAG-->', '<script>window.SP_WEB = true;</script>', 1)
    return html.replace('/*FONTS*/', fonts_css(), 1).replace('/*CSS*/', css, 1).replace('/*JS*/', js, 1)


ICON_HTML = """<!DOCTYPE html><html><body style="margin:0;background:transparent">
<div id="i" style="width:512px;height:512px;border-radius:RADpx;overflow:hidden;position:relative;background:#07080d">
 <div style="position:absolute;inset:0;transform:scale(SC);transform-origin:50% 50%">
  <div style="position:absolute;left:-60px;top:-40px;width:250px;height:640px;background:#ff2d55;transform:skewX(-22deg)"></div>
  <div style="position:absolute;left:150px;top:-40px;width:46px;height:640px;background:#ffffff;transform:skewX(-22deg)"></div>
  <div style="position:absolute;left:0;right:0;top:0;height:512px;background:repeating-linear-gradient(-60deg,rgba(255,255,255,.05) 0 2px,transparent 2px 14px)"></div>
  <div style="position:absolute;left:52px;top:58px;font:900 300px/1 'Noto Sans CJK TC','Noto Sans TC',sans-serif;color:#fff;letter-spacing:-6px;text-shadow:10px 10px 0 #07080d">觀</div>
  <div style="position:absolute;right:40px;top:44px;display:flex;align-items:center;gap:12px;padding:6px 18px 0;background:#07080d;font:600 54px/1 'Teko',sans-serif;letter-spacing:6px;color:#ff2d55;transform:skewX(-12deg)"><span style="width:22px;height:22px;border-radius:50%;background:#ff2d55;display:inline-block;margin-top:-6px"></span>LIVE</div>
  <div style="position:absolute;left:0;right:0;bottom:34px;display:flex;justify-content:center"><div style="padding:10px 26px 2px;background:#fff;color:#07080d;font:700 66px/1 'Teko',sans-serif;letter-spacing:12px;transform:skewX(-12deg)">SPECTATE</div></div>
 </div>
</div></body></html>"""


def icons():
    from playwright.sync_api import sync_playwright
    from PIL import Image
    os.makedirs(os.path.join(OUT, 'icons'), exist_ok=True)
    face = '<style>' + fonts_css() + '</style>'
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 512, 'height': 512})
        for name, rad, sc, size in (('icon-512.png', 0, 1, 512), ('icon-192.png', 0, 1, 192), ('apple-touch-icon.png', 0, 1, 180), ('maskable-512.png', 0, 0.8, 512)):
            pg.set_content(face + ICON_HTML.replace('RAD', str(rad)).replace('SC', str(sc)))
            pg.wait_for_timeout(400)
            path = os.path.join(OUT, 'icons', name)
            pg.locator('#i').screenshot(path=path, omit_background=True)
            if size != 512:
                Image.open(path).resize((size, size), Image.LANCZOS).save(path)
        b.close()
    print('圖示已更新')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--icons', action='store_true')
    a = ap.parse_args()
    ver = version()
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(os.path.join(OUT, 'data'), exist_ok=True)
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(compose(ver))
    with open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
        json.dump(MANIFEST, f, ensure_ascii=False, indent=1)
    sw = read('sw.js').replace("const CACHE = 'spectate-1.0.0';", "const CACHE = 'spectate-%s';" % ver)
    assert "spectate-%s" % ver in sw
    with open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8') as f:
        f.write(sw)
    with open(os.path.join(OUT, 'ver.json'), 'w', encoding='utf-8') as f:   # App 回到前景時拿來比對有沒有新版
        json.dump({'v': BUILD}, f)
    if a.icons or not os.path.exists(os.path.join(OUT, 'icons', 'icon-512.png')):
        icons()
    size = os.path.getsize(os.path.join(OUT, 'index.html'))
    print('網頁版 → %s（index.html %.0f KB，版本 %s）' % (os.path.relpath(OUT, REPO), size / 1024, ver))


if __name__ == '__main__':
    main()
