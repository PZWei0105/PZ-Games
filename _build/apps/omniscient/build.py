#!/usr/bin/env python3
"""全知 OMNISCIENT — 組建腳本

把 src/ 的 HTML、CSS、JS、字型內嵌成單一檔案，輸出到 <repo>/apps/omniscient/（含 manifest、service worker、圖示）。

用法：
  python3 build.py              # 網頁版 → apps/omniscient/
  python3 build.py --icons      # 重新產生圖示（需要 playwright、pillow）
  python3 build.py --out /tmp/x # 輸出到別的地方（測試用）

沒有 Claude 版：Claude 的 artifact 沙盒連不到 pzwei0105.github.io，讀不到冷眼的資料。
"""
import argparse, base64, datetime, json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
OUT = os.path.join(REPO, 'apps', 'omniscient')

JS_ORDER = ['core.js', 'data.js', 'sfx.js', 'ui.js', 'fx.js', 'replay.js', 'main.js']
CSS_ORDER = ['style.css']
FONTS = [  # file, family, weight, style
    ('orbitron-latin-700-normal.woff2', 'Orbitron', 700, 'normal'),
    ('orbitron-latin-900-normal.woff2', 'Orbitron', 900, 'normal'),
    ('share-tech-mono-latin-400-normal.woff2', 'Share Tech Mono', 400, 'normal'),
    ('chakra-petch-latin-600-normal.woff2', 'Chakra Petch', 600, 'normal'),
    ('chakra-petch-latin-700-normal.woff2', 'Chakra Petch', 700, 'normal'),
]


def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()


def fonts_css():
    out = []
    for fn, fam, w, st in FONTS:
        with open(os.path.join(SRC, 'fonts', fn), 'rb') as f:
            b64 = base64.b64encode(f.read()).decode('ascii')
        out.append('@font-face{font-family:"%s";font-style:%s;font-weight:%d;font-display:swap;src:url(data:font/woff2;base64,%s) format("woff2")}' % (fam, st, w, b64))
    # Chakra Petch 沒有 400：一般字重也用 600 那一份（中文字走系統字型）
    return '\n'.join(out)


def compose(version):
    html = read('index.html')
    js = '\n'.join('/* ---- %s ---- */\n' % n + read(n) for n in JS_ORDER)
    css = '\n'.join(read(n) for n in CSS_ORDER)
    for k, v in (('CSS', css), ('JS', js)):
        assert '</script' not in v.lower(), k + ' contains </script>'
        assert '</style' not in v.lower(), k + ' contains </style>'
    assert "const VERSION = '1.0.0';" in js
    js = js.replace("const VERSION = '1.0.0';", "const VERSION = '%s';" % version)
    return html.replace('/*FONTS*/', fonts_css(), 1).replace('/*CSS*/', css, 1).replace('/*JS*/', js, 1)


MANIFEST = {
    'name': '全知 OMNISCIENT',
    'short_name': '全知',
    'description': '痞子葳的戰情看板：冷眼的官方一手資料，攤開來演給你看。盤中即時、收盤後回放當天。',
    'lang': 'zh-Hant-TW',
    'start_url': './',
    'scope': './',
    'display': 'fullscreen',
    'orientation': 'landscape',
    'background_color': '#03060d',
    'theme_color': '#03060d',
    'icons': [
        {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}

# 圖示：深空裡一隻睜開的眼睛——青色眼眶、琥珀色刻度虹膜、白色瞳光
ICON_HTML = """<!DOCTYPE html><html><body style="margin:0;background:transparent">
<div id="i" style="width:512px;height:512px;border-radius:RADpx;overflow:hidden;position:relative;
background:radial-gradient(circle at 50% 42%, #0f2350 0%, #060c1d 52%, #02050b 100%)">
<div style="position:absolute;left:0;top:0;width:512px;height:512px;transform:scale(SC);transform-origin:50% 50%">
 <svg viewBox="0 0 512 512" style="position:absolute;left:0;top:0;width:512px;height:512px">
  <defs>
   <radialGradient id="p" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#bff4ff"/><stop offset=".6" stop-color="#46d4ff" stop-opacity=".5"/><stop offset="1" stop-color="#46d4ff" stop-opacity="0"/></radialGradient>
   <filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>
  <g filter="url(#g)" opacity=".8"><path d="M44 256C110 150 180 112 256 112s146 38 212 144c-66 106-136 144-212 144S110 362 44 256z" fill="none" stroke="#46d4ff" stroke-width="18"/></g>
  <path d="M44 256C110 150 180 112 256 112s146 38 212 144c-66 106-136 144-212 144S110 362 44 256z" fill="none" stroke="#8fe8ff" stroke-width="12"/>
  <circle cx="256" cy="256" r="98" fill="none" stroke="#ffbf3c" stroke-width="10" stroke-dasharray="26 10"/>
  <circle cx="256" cy="256" r="74" fill="none" stroke="#46d4ff" stroke-opacity=".7" stroke-width="4"/>
  <circle cx="256" cy="256" r="88" fill="url(#p)"/>
  <circle cx="256" cy="256" r="22" fill="#02050b"/>
  <circle cx="236" cy="234" r="9" fill="#fff"/>
 </svg>
</div></div></body></html>"""


def make_icons(out):
    from playwright.sync_api import sync_playwright
    os.makedirs(out, exist_ok=True)
    jobs = [('icon-512.png', 512, 112, '1'), ('maskable-512.png', 512, 0, '0.8'),
            ('icon-192.png', 192, 112, '1'), ('apple-touch-icon.png', 180, 0, '0.94')]
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
    ap.add_argument('--out', default=OUT)
    a = ap.parse_args()
    version = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).strftime('%Y.%m.%d-%H%M')
    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(compose(version))
    with open(os.path.join(a.out, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
        json.dump(MANIFEST, f, ensure_ascii=False, indent=1)
    with open(os.path.join(a.out, 'sw.js'), 'w', encoding='utf-8') as f:
        f.write(read('sw.js').replace('__VERSION__', version))
    icons = os.path.join(a.out, 'icons')
    if a.icons or not os.path.exists(os.path.join(icons, 'icon-512.png')):
        make_icons(icons)
    print('built', version, '->', a.out, '(%d KB)' % (os.path.getsize(os.path.join(a.out, 'index.html')) // 1024))


if __name__ == '__main__':
    main()
