#!/usr/bin/env python3
"""本機道場 LOCAL DOJO — 組建腳本

把 src/ 裡的 HTML、CSS、JS 內嵌成單一檔案，輸出兩個版本：
  - 網頁版（GitHub Pages）：<repo>/apps/local-dojo/ — 含 manifest、service worker、圖示，可加到主畫面、離線使用
  - Claude 版：--claude-out 指定的資料夾 — 單一 index.html，發布成 Claude artifact 用

用法：
  python3 build.py                                  # 只輸出網頁版
  python3 build.py --claude-out /tmp/dojo-claude    # 另外輸出 Claude 版
  python3 build.py --icons                          # 重新產生圖示（需要 playwright）
"""
import argparse, json, os, re, shutil, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
WEB_OUT = os.path.join(REPO, 'apps', 'local-dojo')


def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()


def compose(web, version):
    html = read('index.html')
    parts = {
        '/*CSS*/': read('style.css'),
        '/*DATA1*/': read('data1.js'),
        '/*DATA2*/': read('data2.js'),
        '/*WIDGETS*/': read('widgets.js'),
        '/*APP*/': read('app.js'),
    }
    for k, v in parts.items():
        assert '</script' not in v.lower(), k + ' contains </script>'
        html = html.replace(k, v, 1)
    head = ('<link rel="manifest" href="manifest.webmanifest">\n'
            '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">') if web else ''
    flag = '<script>window.DOJO_WEB = true;</script>' if web else ''
    html = html.replace('<!--WEBHEAD-->', head).replace('<!--WEBFLAG-->', flag)
    html = html.replace("const VERSION = '1.0.0';", "const VERSION = '%s';" % version)
    return html


MANIFEST = {
    'name': '本機道場 LOCAL DOJO',
    'short_name': '本機道場',
    'description': '給 RTX 5090 筆電的本機 AI 修煉課：六關六條腰帶。',
    'lang': 'zh-Hant-TW',
    'start_url': './',
    'scope': './',
    'display': 'standalone',
    'orientation': 'any',
    'background_color': '#05060c',
    'theme_color': '#05060c',
    'icons': [
        {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}

ICON_HTML = """<!DOCTYPE html><html><body style="margin:0;background:transparent">
<div id="i" style="width:512px;height:512px;border-radius:RADpx;overflow:hidden;position:relative;
background:radial-gradient(circle at 50% 38%, #3a2e0c 0%, #12132a 52%, #05060c 100%)">
<div style="position:absolute;left:-30%;right:-30%;bottom:-8%;height:46%;
background-image:linear-gradient(rgba(243,196,78,.35) 2px,transparent 2px),linear-gradient(90deg,rgba(243,196,78,.35) 2px,transparent 2px);
background-size:64px 64px;transform:perspective(360px) rotateX(62deg);transform-origin:50% 100%;
-webkit-mask-image:linear-gradient(to top,rgba(0,0,0,.7),transparent 90%)"></div>
<svg viewBox="0 0 200 116" style="position:absolute;left:SVGLpx;top:SVGTpx;width:SVGWpx;filter:drop-shadow(0 18px 40px rgba(243,196,78,.45))">
<path d="M4 38 Q100 24 196 38 L196 58 Q100 44 4 58 Z" fill="#141414" stroke="#f3c44e" stroke-width="2.4"/>
<path d="M4 47 Q100 33 196 47" stroke="#f3c44e" stroke-width="1.2" fill="none" opacity=".8"/>
<path d="M90 56 L64 108 L84 112 L101 64 Z" fill="#141414" stroke="#f3c44e" stroke-width="2.4"/>
<path d="M110 56 L136 108 L116 112 L99 64 Z" fill="#141414" stroke="#f3c44e" stroke-width="2.4"/>
<line x1="107.7" y1="88.6" x2="124.3" y2="81.4" stroke="#f3c44e" stroke-width="3.4" stroke-linecap="round"/>
<line x1="110.1" y1="94.1" x2="126.7" y2="86.9" stroke="#f3c44e" stroke-width="3.4" stroke-linecap="round"/>
<rect x="80" y="28" width="40" height="38" rx="9" fill="#141414" stroke="#f3c44e" stroke-width="2.4"/>
<path d="M86 40 Q100 34 114 40 M86 54 Q100 48 114 54" stroke="#f3c44e" stroke-width="2" fill="none" opacity=".7"/>
</svg></div></body></html>"""


def make_icons(out):
    from playwright.sync_api import sync_playwright
    os.makedirs(out, exist_ok=True)
    jobs = [('icon-512.png', 512, 112, 56, 150, 400), ('maskable-512.png', 512, 0, 106, 168, 300),
            ('icon-192.png', 192, 112, 56, 150, 400), ('apple-touch-icon.png', 180, 0, 56, 150, 400)]
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, size, rad, l, t, w in jobs:
            pg = b.new_page(viewport={'width': 512, 'height': 512}, device_scale_factor=size / 512)
            pg.set_content(ICON_HTML.replace('RAD', str(rad)).replace('SVGL', str(l)).replace('SVGT', str(t)).replace('SVGW', str(w)))
            pg.locator('#i').screenshot(path=os.path.join(out, name), omit_background=True)
            pg.close()
        b.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--claude-out')
    ap.add_argument('--icons', action='store_true')
    a = ap.parse_args()
    version = datetime.datetime.now().strftime('%Y.%m.%d-%H%M')
    os.makedirs(WEB_OUT, exist_ok=True)
    with open(os.path.join(WEB_OUT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(compose(True, version))
    with open(os.path.join(WEB_OUT, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
        json.dump(MANIFEST, f, ensure_ascii=False, indent=1)
    with open(os.path.join(WEB_OUT, 'sw.js'), 'w', encoding='utf-8') as f:
        f.write(read('sw.js').replace('__VERSION__', version))
    icons = os.path.join(WEB_OUT, 'icons')
    if a.icons or not os.path.exists(os.path.join(icons, 'icon-512.png')):
        make_icons(icons)
    if a.claude_out:
        os.makedirs(a.claude_out, exist_ok=True)
        with open(os.path.join(a.claude_out, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(compose(False, version))
    print('built', version, '->', WEB_OUT, '| claude:', a.claude_out or '-')


if __name__ == '__main__':
    main()
