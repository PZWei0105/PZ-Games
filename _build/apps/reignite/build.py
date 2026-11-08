#!/usr/bin/env python3
"""重新點火 REIGNITE — 組建腳本

把 src/ 裡的 HTML、CSS、JS 內嵌成單一檔案，輸出兩個版本：
  - 網頁版（GitHub Pages）：<repo>/apps/reignite/ — 含 manifest、service worker、圖示，可加到主畫面、離線使用
  - Claude 版：--claude-out 指定的資料夾 — 單一 index.html，發布成 Claude artifact 用（紀錄跟著 Claude 帳號同步）

用法：
  python3 build.py                                     # 只輸出網頁版
  python3 build.py --claude-out /tmp/reignite-claude   # 另外輸出 Claude 版
  python3 build.py --icons                             # 重新產生圖示（需要 playwright）
"""
import argparse, json, os, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
WEB_OUT = os.path.join(REPO, 'apps', 'reignite')
JS_ORDER = ['data.js', 'core.js', 'ship.js', 'game.js', 'ui.js', 'ui2.js']


def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()


def compose(web, version):
    html = read('index.html')
    js = '\n'.join(read(n) for n in JS_ORDER)
    css = read('style.css')
    for k, v in (('CSS', css), ('JS', js)):
        assert '</script' not in v.lower(), k + ' contains </script>'
    html = html.replace('/*CSS*/', css, 1).replace('/*JS*/', js, 1)
    head = ('<link rel="manifest" href="manifest.webmanifest">\n'
            '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">') if web else ''
    flag = '<script>window.RG_WEB = true;</script>' if web else ''
    html = html.replace('<!--WEBHEAD-->', head).replace('<!--WEBFLAG-->', flag)
    html = html.replace("const VERSION = '1.0.0';", "const VERSION = '%s';" % version)
    return html


MANIFEST = {
    'name': '重新點火 REIGNITE',
    'short_name': '重新點火',
    'description': '痞子葳專屬的減重 App：每天三個一分鐘的任務，一塊一塊修好燈塔船餘燼號。',
    'lang': 'zh-Hant-TW',
    'start_url': './',
    'scope': './',
    'display': 'standalone',
    'orientation': 'portrait',
    'background_color': '#060a15',
    'theme_color': '#060a15',
    'icons': [
        {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}

ICON_HTML = """<!DOCTYPE html><html><body style="margin:0;background:transparent">
<div id="i" style="width:512px;height:512px;border-radius:RADpx;overflow:hidden;position:relative;
background:radial-gradient(circle at 50% 58%, #4a220c 0%, #1a1530 46%, #060a15 100%)">
<svg viewBox="0 0 512 512" style="position:absolute;left:0;top:0;width:512px;height:512px">
<defs>
 <linearGradient id="f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff5a2a"/><stop offset=".55" stop-color="#ff8a3d"/><stop offset="1" stop-color="#ffd27a"/></linearGradient>
 <radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb35c" stop-opacity=".55"/><stop offset="1" stop-color="#ff7a2f" stop-opacity="0"/></radialGradient>
</defs>
<g transform="translate(256 262) scale(SC) translate(-256 -262)">
<circle cx="256" cy="300" r="210" fill="url(#g)"/>
<ellipse cx="256" cy="318" rx="196" ry="58" fill="none" stroke="#57e3d9" stroke-width="6" stroke-opacity=".55" transform="rotate(-12 256 318)"/>
<path d="M256 70c22 62 92 98 92 192a92 92 0 0 1-184 0c0-38 18-64 40-84 4 34 22 54 44 62-8-60-12-112 8-170z" fill="url(#f)"/>
<path d="M256 238c12 24 34 36 34 64a34 34 0 0 1-68 0c0-16 8-28 16-36 2 12 8 18 16 20-2-18-4-30 2-48z" fill="#fff1c9"/>
<path d="M78 354 A196 58 -12 0 0 434 282" fill="none" stroke="#9ff5e4" stroke-width="7" stroke-linecap="round" transform="rotate(0)"/>
<circle cx="408" cy="236" r="9" fill="#e6ff9e"/>
</g></svg></div></body></html>"""


def make_icons(out):
    from playwright.sync_api import sync_playwright
    os.makedirs(out, exist_ok=True)
    jobs = [('icon-512.png', 512, 112, '1'), ('maskable-512.png', 512, 0, '0.78'),
            ('icon-192.png', 192, 112, '1'), ('apple-touch-icon.png', 180, 0, '0.94')]
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, size, rad, sc in jobs:
            pg = b.new_page(viewport={'width': 512, 'height': 512}, device_scale_factor=size / 512)
            pg.set_content(ICON_HTML.replace('RAD', str(rad)).replace('SC', sc))
            pg.locator('#i').screenshot(path=os.path.join(out, name), omit_background=True)
            pg.close()
        b.close()
    shrink(out)


def shrink(out):
    """圖示壓小一點，離線快取比較輕"""
    from PIL import Image
    for f in os.listdir(out):
        if f.endswith('.png'):
            p = os.path.join(out, f)
            im = Image.open(p).convert('RGBA')
            try:
                im.quantize(256, method=Image.Quantize.LIBIMAGEQUANT, dither=Image.Dither.FLOYDSTEINBERG).save(p, optimize=True)
            except Exception:
                im.save(p, optimize=True)   # 沒有 libimagequant 就只做無損壓縮（避免光暈出現色帶）


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
