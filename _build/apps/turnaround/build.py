#!/usr/bin/env python3
"""轉機 TURNAROUND — 組建腳本

把 src/ 的 HTML、CSS、JS、英文字型內嵌成單一 index.html，輸出兩個版本：
  - 網頁版：<repo>/apps/turnaround/（含 manifest、service worker、圖示）。**不碰 apps/turnaround/data/**：
    每天的航班與檢修由排程寫進 data/days/，GitHub Actions 每小時把塔台收到的表態寫進 data/inbox.json。
  - Claude 版（--claude-out）：單一 index.html，資料（最近 7 天、機隊、手冊、檢修截圖、進廠作品的封面）直接內嵌，
    因為 artifact 連不到 github.io。發布後要宣告能力 {db, user, sample, tts}：雲端存檔、塔台連線（直接問 Claude）、Claude 的聲音廣播。

用法：
  python3 build.py                              # 網頁版
  python3 build.py --claude-out /tmp/ta-claude  # 另外輸出 Claude 版
  python3 build.py --icons                      # 重畫圖示（需要 playwright）
"""
import argparse, base64, datetime, glob, json, os, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
OUT = os.path.join(REPO, 'apps', 'turnaround')
DATA = os.path.join(OUT, 'data')
JS_ORDER = ['core.js', 'flap.js', 'views.js', 'radar.js', 'main.js']
FONTS = [
    ('barlow-condensed-latin-600-normal.woff2', 'Barlow Condensed', 600),
    ('barlow-condensed-latin-800-normal.woff2', 'Barlow Condensed', 800),
    ('jetbrains-mono-latin-500-normal.woff2', 'JetBrains Mono', 500),
    ('jetbrains-mono-latin-800-normal.woff2', 'JetBrains Mono', 800),
]
MANIFEST = {
    'name': '轉機 TURNAROUND',
    'short_name': '轉機',
    'description': '痞子葳的轉機航廈：每天三班新點子航班（小說、遊戲、自由），加上一架舊作品進廠檢修；表態、簽派、機長報告，讓之後的作品越做越準。',
    'lang': 'zh-Hant-TW',
    'start_url': './',
    'scope': './',
    'display': 'standalone',
    'orientation': 'any',
    'background_color': '#06080b',
    'theme_color': '#06080b',
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
    for fn, fam, w in FONTS:
        with open(os.path.join(SRC, 'fonts', fn), 'rb') as f:
            b64 = base64.b64encode(f.read()).decode('ascii')
        out.append('@font-face{font-family:"%s";font-style:normal;font-weight:%d;font-display:swap;src:url(data:font/woff2;base64,%s) format("woff2")}' % (fam, w, b64))
    return '\n'.join(out)


def compose(web, version, data_js=''):
    html = read('index.html')
    js = '\n'.join('/* ---- %s ---- */\n' % n + read(n) for n in JS_ORDER)
    css = read('style.css')
    for k, v in (('CSS', css), ('JS', js), ('DATA', data_js)):
        assert '</script' not in v.lower(), k + ' contains </script>'
        assert '</style' not in v.lower(), k + ' contains </style>'
    assert "const VERSION = '1.0.0';" in js
    js = js.replace("const VERSION = '1.0.0';", "const VERSION = '%s';" % version)
    head = ('<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
            '<link rel="icon" type="image/png" href="icons/icon-192.png">') if web else ''
    flag = '<script>window.TA_WEB = true;</script>' if web else '<script>window.TA_DATA = %s;</script>' % data_js
    html = html.replace('<!--WEBHEAD-->', head, 1).replace('<!--WEBFLAG-->', flag, 1)
    return html.replace('/*FONTS*/', fonts_css(), 1).replace('/*CSS*/', css, 1).replace('/*JS*/', js, 1)


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def b64file(p, mime):
    with open(p, 'rb') as f:
        return 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode('ascii'))


def claude_data(days_keep=7):
    index = load(os.path.join(DATA, 'index.json'))
    fleet = load(os.path.join(DATA, 'fleet.json'))
    manual = load(os.path.join(DATA, 'manual.json'))
    keep = [d['date'] for d in index['days'][:days_keep]]
    index = dict(index, days=[d for d in index['days'] if d['date'] in keep])
    days, shots, covers = {}, {}, {}
    for date in keep:
        d = load(os.path.join(DATA, 'days', date + '.json'))
        days[date] = d
        ins = d.get('inspection') or {}
        for s in ins.get('shots') or []:
            p = os.path.join(DATA, s['src'])
            if os.path.exists(p):
                shots[s['src']] = b64file(p, 'image/webp')
        w = next((x for x in fleet['works'] if x['id'] == ins.get('work')), None)
        if w and w.get('cover'):
            p = os.path.normpath(os.path.join(OUT, w['cover']))
            if os.path.exists(p):
                covers[w['id']] = b64file(p, 'image/webp')
    return json.dumps({'index': index, 'days': days, 'fleet': fleet, 'manual': manual, 'shots': shots, 'covers': covers}, ensure_ascii=False, separators=(',', ':'))


ICON_HTML = """<!DOCTYPE html><html><body style="margin:0;background:transparent">
<div id="i" style="width:512px;height:512px;border-radius:RADpx;overflow:hidden;position:relative;background:#ffd21a">
 <div style="position:absolute;left:0;top:0;width:512px;height:512px;transform:scale(SC);transform-origin:50% 50%">
  <div style="position:absolute;left:0;right:0;bottom:0;height:120px;background:#111214"></div>
  <div style="position:absolute;left:0;right:0;bottom:120px;height:14px;background:repeating-linear-gradient(-45deg,#111214 0 14px,#ffd21a 14px 28px)"></div>
  <div style="position:absolute;left:44px;top:34px;font:900 300px/1 'Noto Sans CJK TC','Noto Sans TC',sans-serif;color:#111214;letter-spacing:-6px">轉</div>
  <svg viewBox="0 0 24 24" style="position:absolute;right:30px;top:40px;width:120px;height:120px;fill:#111214;transform:rotate(-8deg)"><path d="M2.5 19h19v1.6h-19zM21.4 9.6c-.3-1-1.4-1.6-2.4-1.3l-5.2 1.4-6.7-6.2-2 .5 4 7-5 1.3-2-1.6-1.5.4 2.6 4.5 16.8-4.5c1-.3 1.7-1.3 1.4-2.3z"/></svg>
  <div style="position:absolute;left:0;right:0;bottom:30px;text-align:center;font:800 54px/1 'Barlow Condensed','Arial Narrow',sans-serif;letter-spacing:14px;color:#ffd21a;padding-left:14px">TURNAROUND</div>
 </div>
</div></body></html>"""


def icons():
    from playwright.sync_api import sync_playwright
    os.makedirs(os.path.join(OUT, 'icons'), exist_ok=True)
    fontdir = os.path.join(SRC, 'fonts')
    face = '<style>@font-face{font-family:"Barlow Condensed";font-weight:800;src:url(file://%s/barlow-condensed-latin-800-normal.woff2)}</style>' % fontdir
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 512, 'height': 512})
        for name, rad, sc, size in (('icon-512.png', 0, 1, 512), ('icon-192.png', 0, 1, 192), ('apple-touch-icon.png', 0, 1, 180), ('maskable-512.png', 0, 0.8, 512)):
            pg.set_content(face + ICON_HTML.replace('RAD', str(rad)).replace('SC', str(sc)))
            pg.wait_for_timeout(300)
            path = os.path.join(OUT, 'icons', name)
            pg.locator('#i').screenshot(path=path, omit_background=True)
            if size != 512:
                from PIL import Image
                Image.open(path).resize((size, size), Image.LANCZOS).save(path)
        b.close()
    print('圖示已更新')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--claude-out')
    ap.add_argument('--icons', action='store_true')
    a = ap.parse_args()
    version = datetime.datetime.now().strftime('1.0.%Y%m%d%H%M')
    os.makedirs(OUT, exist_ok=True)
    if a.icons:
        icons()
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(compose(True, version))
    with open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
        json.dump(MANIFEST, f, ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8') as f:
        f.write(read('sw.js').replace('__VER__', version))
    print('網頁版 →', OUT, '(%d KB)' % (os.path.getsize(os.path.join(OUT, 'index.html')) // 1024))
    if a.claude_out:
        os.makedirs(a.claude_out, exist_ok=True)
        p = os.path.join(a.claude_out, 'index.html')
        with open(p, 'w', encoding='utf-8') as f:
            f.write(compose(False, version, claude_data()))
        print('Claude 版 →', p, '(%d KB)' % (os.path.getsize(p) // 1024))


if __name__ == '__main__':
    main()
