#!/usr/bin/env python3
"""下回分解 NEXT CHAPTER — 組建腳本

把 src/ 的 HTML、CSS、JS 內嵌成單一檔案，輸出到 <repo>/apps/next-chapter/（含 manifest、service worker、圖示）。
書（apps/next-chapter/books/）不歸這支腳本管：章節用 tools/shelf.py 上架、音軌用 tools/narrate.py 錄。

用法：
  python3 build.py            # 組建
  python3 build.py --icons    # 重新產生圖示（需要 playwright、pillow）
"""
import argparse, datetime, json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
OUT = os.path.join(REPO, 'apps', 'next-chapter')
JS_ORDER = ['core.js', 'covers.js', 'sound.js', 'books.js', 'importer.js', 'reader.js', 'narrator.js', 'ui.js', 'main.js']


def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()


def compose(version):
    html = read('index.html')
    js = '\n'.join(read(n) for n in JS_ORDER)
    css = read('style.css')
    vendor = read('vendor-fflate.js')
    for k, v in (('CSS', css), ('JS', js), ('VENDOR', vendor)):
        assert '</script' not in v.lower(), k + ' contains </script>'
    assert "const VERSION = '1.0.0';" in js
    js = js.replace("const VERSION = '1.0.0';", "const VERSION = '%s';" % version)
    return html.replace('/*CSS*/', css, 1).replace('/*VENDOR*/', vendor, 1).replace('/*JS*/', js, 1)


MANIFEST = {
    'name': '下回分解',
    'short_name': '下回分解',
    'description': '痞子葳的書房：連載小說寫完就上架，也能匯入自己的電子書；翻頁、聽說書都在這裡。',
    'lang': 'zh-Hant-TW',
    'start_url': './',
    'scope': './',
    'display': 'standalone',
    'orientation': 'any',
    'background_color': '#0b1422',
    'theme_color': '#0b1422',
    'icons': [
        {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}

# 圖示：一冊靛青布面的線裝書，左上宣紙題簽、朱印「回」，右側四眼線裝
ICON_HTML = """<!DOCTYPE html><html><body style="margin:0;background:transparent">
<div id="i" style="width:512px;height:512px;border-radius:RADpx;overflow:hidden;position:relative;
background:radial-gradient(circle at 72% 8%, #3a4f73 0%, #1d2f4a 42%, #0b1422 100%)">
<svg viewBox="0 0 512 512" style="position:absolute;left:0;top:0;width:512px;height:512px">
<defs><pattern id="w" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 1h6M1 0v6" stroke="#fff" stroke-width=".7" opacity=".05"/><path d="M0 4h6" stroke="#000" stroke-width=".7" opacity=".12"/></pattern>
<linearGradient id="l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs>
<g transform="translate(256 256) scale(SC) translate(-256 -256)">
<rect x="96" y="58" width="320" height="396" rx="6" fill="#0a111c" opacity=".55" transform="translate(-10 12)"/>
<rect x="84" y="60" width="12" height="392" fill="#d8cfba"/><rect x="88" y="64" width="4" height="388" fill="#a69c85"/>
<rect x="96" y="54" width="320" height="396" rx="5" fill="#22385a"/>
<rect x="96" y="54" width="320" height="396" rx="5" fill="url(#w)"/>
<path d="M96 388c40-34 74-12 104-40s62-30 96-8 60 10 84-12v122H96z" fill="#16263f" opacity=".7"/>
<rect x="124" y="84" width="92" height="232" rx="3" fill="#ece4d2"/>
<rect x="130" y="90" width="80" height="220" fill="none" stroke="#7b6a48" stroke-width="1.6" opacity=".55"/>
<rect x="142" y="232" width="56" height="56" rx="6" fill="#b3382c"/>
<g fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="square"><rect x="154" y="244" width="32" height="32"/><rect x="164" y="254" width="12" height="12"/></g>
<g fill="#2a2118"><rect x="164" y="108" width="12" height="46" rx="2"/><rect x="152" y="166" width="36" height="9" rx="2"/><rect x="166" y="186" width="8" height="30" rx="2"/></g>
<rect x="378" y="54" width="38" height="396" fill="#000" opacity=".22"/>
<path d="M390 54v396" stroke="#e4dcc8" stroke-width="3"/>
<g stroke="#e4dcc8" stroke-width="3"><path d="M390 98h26M390 198h26M390 300h26M390 404h26"/></g>
<g fill="#0c0f14"><circle cx="390" cy="98" r="4"/><circle cx="390" cy="198" r="4"/><circle cx="390" cy="300" r="4"/><circle cx="390" cy="404" r="4"/></g>
<rect x="96" y="54" width="320" height="396" rx="5" fill="url(#l)"/>
</g></svg></div></body></html>"""


def make_icons(out):
    from playwright.sync_api import sync_playwright
    os.makedirs(out, exist_ok=True)
    jobs = [('icon-512.png', 512, 112, '1'), ('maskable-512.png', 512, 0, '0.76'),
            ('icon-192.png', 192, 112, '1'), ('apple-touch-icon.png', 180, 0, '0.92')]
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, size, rad, sc in jobs:
            pg = b.new_page(viewport={'width': 512, 'height': 512}, device_scale_factor=size / 512)
            pg.set_content(ICON_HTML.replace('RAD', str(rad)).replace('SC', sc))
            pg.locator('#i').screenshot(path=os.path.join(out, name), omit_background=True)
            pg.close()
        b.close()
    try:
        from PIL import Image
        for f in os.listdir(out):
            if f.endswith('.png'):
                Image.open(os.path.join(out, f)).save(os.path.join(out, f), optimize=True)
    except Exception:
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--icons', action='store_true')
    a = ap.parse_args()
    version = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).strftime('%Y.%m.%d-%H%M')
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(compose(version))
    with open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
        json.dump(MANIFEST, f, ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8') as f:
        f.write(read('sw.js').replace('__VERSION__', version))
    icons = os.path.join(OUT, 'icons')
    if a.icons or not os.path.exists(os.path.join(icons, 'icon-512.png')):
        make_icons(icons)
    print('built', version, '->', OUT, '(%d KB)' % (os.path.getsize(os.path.join(OUT, 'index.html')) // 1024))


if __name__ == '__main__':
    main()
