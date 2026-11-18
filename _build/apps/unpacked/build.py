#!/usr/bin/env python3
"""解包 UNPACKED — 組建腳本

把 src/ 的 HTML、CSS、JS、英文字型內嵌成單一 index.html，輸出到 <repo>/apps/unpacked/
（含 manifest、service worker、圖示、vendor/hls.min.mjs）。**不會碰 apps/unpacked/data/**：
專題由每日寫稿排程寫進 data/features/、Steam 即時資料由 GitHub Actions 寫進 data/live.json。

用法：
  python3 build.py              # 網頁版 → apps/unpacked/
  python3 build.py --icons      # 重畫圖示（需要 playwright、pillow）
  python3 build.py --out /tmp/x # 輸出到別的地方（測試用；會順便複製 data/）

沒有 Claude 版：artifact 沙盒連不到 pzwei0105.github.io，讀不到每天更新的專題與 Steam 資料（和《全知》《下回分解》一樣）。
"""
import argparse, base64, datetime, json, os, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
OUT = os.path.join(REPO, 'apps', 'unpacked')

JS_ORDER = ['core.js', 'audio.js', 'fx.js', 'data.js', 'views.js', 'card.js', 'shorts.js', 'hunt.js', 'weekly.js', 'cal.js', 'market.js', 'deals.js', 'tga.js', 'ask.js', 'ops.js', 'opsstats.js', 'opslearn.js', 'main.js']
FONTS = [
    ('bebas-neue-latin-400-normal.woff2', 'Bebas Neue'),
    ('permanent-marker-latin-400-normal.woff2', 'Permanent Marker'),
    ('rubik-wet-paint-latin-400-normal.woff2', 'Rubik Wet Paint'),
]


def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()


def fonts_css():
    out = []
    for fn, fam in FONTS:
        with open(os.path.join(SRC, 'fonts', fn), 'rb') as f:
            b64 = base64.b64encode(f.read()).decode('ascii')
        out.append('@font-face{font-family:"%s";font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,%s) format("woff2")}' % (fam, b64))
    return '\n'.join(out)


def compose(version):
    html = read('index.html')
    js = '\n'.join('/* ---- %s ---- */\n' % n + read(n) for n in JS_ORDER)
    css = read('style.css')
    for k, v in (('CSS', css), ('JS', js)):
        assert '</script' not in v.lower(), k + ' contains </script>'
        assert '</style' not in v.lower(), k + ' contains </style>'
    assert "const VERSION = '1.0.0';" in js
    js = js.replace("const VERSION = '1.0.0';", "const VERSION = '%s';" % version)
    return html.replace('/*FONTS*/', fonts_css(), 1).replace('/*CSS*/', css, 1).replace('/*JS*/', js, 1)


MANIFEST = {
    'name': '解包 UNPACKED',
    'short_name': '解包',
    'description': '痞子葳的遊戲解包台：每天 2～3 款深度專題、私房推坑、直式短影音預告牆、Steam 願望單獵價雷達與免費補給站、Steam 行情板、TGA 預測戰、點播台、每週懶人包，加上遊戲狂想曲粉專作戰台（三平台排程、上架教學、導流成效）。',
    'lang': 'zh-Hant-TW',
    'start_url': './',
    'scope': './',
    'display': 'standalone',
    'orientation': 'any',
    'background_color': '#111111',
    'theme_color': '#111111',
    'icons': [
        {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}

# 圖示：黑牆上一個黃色噴漆「解」，粉紅階梯影、往下流的油漆、噴點
ICON_HTML = """<!DOCTYPE html><html><body style="margin:0;background:transparent">
<div id="i" style="width:512px;height:512px;border-radius:RADpx;overflow:hidden;position:relative;background:#111">
 <div style="position:absolute;inset:0;background-image:radial-gradient(#ffffff16 22%,transparent 24%);background-size:22px 22px"></div>
 <div style="position:absolute;left:0;top:0;width:512px;height:512px;transform:scale(SC);transform-origin:50% 50%">
  <svg viewBox="0 0 512 512" style="position:absolute;inset:0">
   <circle cx="420" cy="96" r="34" fill="#FF2E88"/><circle cx="462" cy="70" r="9" fill="#FF2E88"/><circle cx="380" cy="60" r="7" fill="#FF2E88"/>
   <circle cx="86" cy="430" r="26" fill="#FFE600"/><circle cx="52" cy="456" r="8" fill="#FFE600"/>
   <rect x="138" y="372" width="22" height="92" rx="11" fill="#FFE600"/><rect x="300" y="380" width="18" height="70" rx="9" fill="#FF2E88"/><rect x="232" y="378" width="16" height="50" rx="8" fill="#FFE600"/>
  </svg>
  <div style="position:absolute;left:0;right:0;top:40px;text-align:center;font:900 380px/1 'Noto Sans CJK TC','Noto Sans CJK HK',sans-serif;color:#FFE600;
   -webkit-text-stroke:22px #111;paint-order:stroke fill;text-shadow:10px 10px 0 #FF2E88,20px 20px 0 #FF2E88,30px 30px 0 #000;transform:rotate(-6deg)">解</div>
  <div style="position:absolute;right:26px;bottom:30px;font:400 64px/1 'Bebas Neue',sans-serif;color:#111;background:#FFE600;padding:6px 14px 2px;transform:rotate(-8deg);border:5px solid #111;letter-spacing:3px">UNPACK</div>
 </div>
</div></body></html>"""


def make_icons(out):
    from playwright.sync_api import sync_playwright
    os.makedirs(out, exist_ok=True)
    jobs = [('icon-512.png', 512, 110, '1'), ('maskable-512.png', 512, 0, '0.8'),
            ('icon-192.png', 192, 110, '1'), ('apple-touch-icon.png', 180, 0, '0.94')]
    fontcss = '@font-face{font-family:"Bebas Neue";src:url(data:font/woff2;base64,%s) format("woff2")}' % base64.b64encode(open(os.path.join(SRC, 'fonts', FONTS[0][0]), 'rb').read()).decode()
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, size, rad, sc in jobs:
            pg = b.new_page(viewport={'width': 512, 'height': 512}, device_scale_factor=size / 512)
            pg.set_content(ICON_HTML.replace('RAD', str(rad)).replace('SC', sc).replace('<body', '<head><style>%s</style></head><body' % fontcss))
            pg.wait_for_timeout(200)
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
    ap.add_argument('--out', default=OUT)
    ap.add_argument('--icons', action='store_true')
    a = ap.parse_args()
    out = a.out
    os.makedirs(out, exist_ok=True)
    version = '1.0.' + datetime.datetime.now(datetime.timezone.utc).strftime('%y%m%d%H%M')
    with open(os.path.join(out, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(compose(version))
    with open(os.path.join(out, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
        json.dump(MANIFEST, f, ensure_ascii=False, indent=1)
    with open(os.path.join(out, 'sw.js'), 'w', encoding='utf-8') as f:
        f.write(read('sw.js').replace('__VERSION__', version))
    os.makedirs(os.path.join(out, 'vendor'), exist_ok=True)
    # 完整版 hls.js（不是 hls.light）：Steam 預告的聲音是獨立音軌，輕量版播出來會沒有聲音
    shutil.copy(os.path.join(SRC, 'vendor', 'hls.min.mjs'), os.path.join(out, 'vendor', 'hls.min.mjs'))
    shutil.copy(os.path.join(SRC, 'vendor', 'hls.LICENSE.txt'), os.path.join(out, 'vendor', 'hls.LICENSE.txt'))
    old_light = os.path.join(out, 'vendor', 'hls.light.min.mjs')
    if os.path.exists(old_light):
        os.remove(old_light)
    icons = os.path.join(out, 'icons')
    if a.icons or not os.path.exists(os.path.join(icons, 'icon-512.png')):
        if out != OUT and os.path.exists(os.path.join(OUT, 'icons', 'icon-512.png')) and not a.icons:
            shutil.copytree(os.path.join(OUT, 'icons'), icons, dirs_exist_ok=True)
        else:
            make_icons(icons)
    if out != OUT and os.path.isdir(os.path.join(OUT, 'data')):
        shutil.copytree(os.path.join(OUT, 'data'), os.path.join(out, 'data'), dirs_exist_ok=True)
    print('built', version, '→', out, f'({os.path.getsize(os.path.join(out, "index.html")) // 1024} KB)')


if __name__ == '__main__':
    main()
