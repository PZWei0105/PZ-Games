#!/usr/bin/env python3
"""一集就好 ONE MORE — 組建腳本

把 src/ 的 HTML、CSS、JS 內嵌成單一 index.html，輸出網頁版到 <repo>/apps/one-more/（含 manifest、service worker、圖示）。
片單不在這裡：讀《補番》管線推到 binge-data 分支的 catalog.json（只取 AI 漫劇、沙雕、動態漫畫），
置頂頻道讀《觀戰》管線推到 spectate-data 分支的 mine.json。不另外花 YouTube 金鑰、不用自己的管線。

沒有 Claude 版：artifact 裡不能嵌 YouTube 播放器、也讀不到每 30 分鐘更新的片單（同《補番》《觀戰》）。

用法：
  python3 _build/apps/one-more/build.py            # 網頁版
  python3 _build/apps/one-more/build.py --icons    # 重畫圖示（需要 playwright）
"""
import argparse, json, os, time

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
OUT = os.path.join(REPO, 'apps', 'one-more')
JS_ORDER = ['sound.js', 'app.js']
MANIFEST = {
    'name': '一集就好 ONE MORE',
    'short_name': '一集就好',
    'description': 'AI 動漫劇集播放器：AI 漫劇、沙雕動畫、動態漫畫，長片合輯一口氣看完、短劇一集一集追。說好，一集就好。',
    'lang': 'zh-Hant-TW', 'start_url': './', 'scope': './', 'display': 'standalone', 'orientation': 'any',
    'background_color': '#f3efe4', 'theme_color': '#f3efe4',
    'icons': [
        {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}


def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()


def version():
    with open(os.path.join(ROOT, 'VERSION'), encoding='utf-8') as f:
        return f.read().strip()


def compose(ver, build):
    html, css = read('index.html'), read('style.css')
    js = '\n'.join('/* ---- %s ---- */\n' % n + read(n) for n in JS_ORDER)
    for k, v in (('CSS', css), ('JS', js)):
        assert '</script' not in v.lower(), k + ' contains </script>'
        assert '</style' not in v.lower(), k + ' contains </style>'
    assert "const VERSION = '1.0.0';" in js and "const BUILD = 'dev';" in js
    js = js.replace("const VERSION = '1.0.0';", "const VERSION = '%s';" % ver).replace("const BUILD = 'dev';", "const BUILD = '%s';" % build)
    head = ('<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
            '<link rel="icon" type="image/png" href="icons/icon-192.png">')
    html = html.replace('<!--WEBHEAD-->', head, 1).replace('<!--WEBFLAG-->', '<script>window.OM_WEB = true;</script>', 1)
    return html.replace('/*CSS*/', css, 1).replace('/*JS*/', js, 1)


ICON_HTML = """<!DOCTYPE html><html><body style="margin:0;background:transparent">
<div id="i" style="width:512px;height:512px;border-radius:RADpx;overflow:hidden;position:relative;background:#f3efe4">
 <div style="position:absolute;inset:0;transform:scale(SC);transform-origin:50% 50%">
  <div style="position:absolute;inset:0;background-image:radial-gradient(rgba(46,58,51,.12) 3px,transparent 3.5px);background-size:44px 44px"></div>
  <div style="position:absolute;left:66px;top:96px;width:380px;height:300px;border-radius:56px;background:#fffdf7;border:6px solid rgba(46,58,51,.14);box-shadow:0 16px 0 rgba(79,122,92,.22)"></div>
  <div style="position:absolute;left:96px;top:72px;width:150px;height:44px;background:rgba(196,214,160,.9);transform:rotate(-6deg)"></div>
  <div style="position:absolute;right:92px;top:76px;width:120px;height:44px;background:rgba(240,196,190,.92);transform:rotate(7deg)"></div>
  <div style="position:absolute;left:0;right:0;top:150px;text-align:center;font:700 150px/1 'Noto Serif CJK TC','Noto Serif TC',serif;color:#2e3a33;letter-spacing:-4px">一集</div>
  <div style="position:absolute;left:50%;top:312px;transform:translateX(-50%);display:flex;align-items:center;gap:14px;padding:14px 30px;border-radius:999px;background:#6f9a7a;color:#fff;font:800 46px/1 'Noto Sans CJK TC',sans-serif;letter-spacing:6px;box-shadow:0 8px 0 #4f7a5c">
   <span style="width:0;height:0;border-left:30px solid #fff;border-top:19px solid transparent;border-bottom:19px solid transparent"></span>就好</div>
  <div style="position:absolute;left:58px;bottom:60px;width:70px;height:34px;border-radius:0 100% 0 100%;background:#a9c39a;transform:rotate(-24deg)"></div>
 </div>
</div></body></html>"""


def icons():
    from playwright.sync_api import sync_playwright
    from PIL import Image
    os.makedirs(os.path.join(OUT, 'icons'), exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 512, 'height': 512})
        for name, rad, sc, size in (('icon-512.png', 0, 1, 512), ('icon-192.png', 0, 1, 192), ('apple-touch-icon.png', 0, 1, 180), ('maskable-512.png', 0, 0.8, 512)):
            pg.set_content(ICON_HTML.replace('RAD', str(rad)).replace('SC', str(sc)))
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
    build = time.strftime('%Y%m%d%H%M%S')
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(compose(ver, build))
    with open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
        json.dump(MANIFEST, f, ensure_ascii=False, indent=1)
    sw = read('sw.js').replace("const CACHE = 'onemore-1.0.0';", "const CACHE = 'onemore-%s';" % ver)
    assert 'onemore-%s' % ver in sw
    with open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8') as f:
        f.write(sw)
    if a.icons or not os.path.exists(os.path.join(OUT, 'icons', 'icon-512.png')):
        icons()
    print('網頁版 → %s（index.html %.0f KB，版本 %s）' % (os.path.relpath(OUT, REPO), os.path.getsize(os.path.join(OUT, 'index.html')) / 1024, ver))


if __name__ == '__main__':
    main()
