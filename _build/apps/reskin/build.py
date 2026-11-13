#!/usr/bin/env python3
"""耳目一新 RESKIN — 組建腳本

把 src/ 的 HTML、CSS、JS、字型內嵌成單一檔案，輸出到 <repo>/apps/reskin/（含 manifest、service worker、圖示）。

用法：
  python3 build.py                          # 網頁版 → apps/reskin/
  python3 build.py --claude-out /tmp/rs-c   # 另外輸出 Claude 版（不註冊 service worker）
  python3 build.py --icons                  # 重新產生圖示（需要 playwright、pillow）
  python3 build.py --friend-out /tmp/rs-f --friend-zip /tmp/耳目一新-朋友版.zip
                                            # 另外輸出給朋友的版本（拖進 Netlify Drop 用）：沒有痞子葳的名字、
                                            # 沒有收藏庫的網址或字樣
"""
import argparse, base64, datetime, json, os, shutil, zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
OUT = os.path.join(REPO, 'apps', 'reskin')

SKINS = ['neon', 'stage', 'mecha', 'nebula', 'fireworks', 'aurora', 'jelly', 'catdj', 'gacha', 'arcade', 'vinyl', 'cassette', 'ink', 'scope', 'glass']
JS_ORDER = ['core.js', 'db.js', 'meta.js', 'art.js', 'lib.js', 'analysis.js', 'player.js', 'viz.js', 'sfx.js', 'demo.js', 'skinkit.js', 'hype.js'] \
    + ['skins/%s.js' % s for s in SKINS] + ['skins/diy.js', 'ui.js', 'library.js', 'wardrobe.js', 'settings.js', 'lyrics.js', 'share.js', 'extras.js', 'main.js']
CSS_ORDER = ['style.css'] + ['skins/%s.css' % s for s in SKINS] + ['skins/diy.css']
FONTS = [  # file, family, weight, style
    ('orbitron-latin-700-normal.woff2', 'Orbitron', 700, 'normal'),
    ('orbitron-latin-900-normal.woff2', 'Orbitron', 900, 'normal'),
    ('share-tech-mono-latin-400-normal.woff2', 'Share Tech Mono', 400, 'normal'),
    ('chakra-petch-latin-600-normal.woff2', 'Chakra Petch', 600, 'normal'),
    ('chakra-petch-latin-700-normal.woff2', 'Chakra Petch', 700, 'normal'),
    ('exo-2-latin-300-normal.woff2', 'Exo 2', 300, 'normal'),
    ('exo-2-latin-600-normal.woff2', 'Exo 2', 600, 'normal'),
    ('fredoka-latin-500-normal.woff2', 'Fredoka', 500, 'normal'),
    ('fredoka-latin-700-normal.woff2', 'Fredoka', 700, 'normal'),
    ('bungee-latin-400-normal.woff2', 'Bungee', 400, 'normal'),
    ('playfair-display-latin-600-italic.woff2', 'Playfair Display', 600, 'italic'),
    ('playfair-display-latin-700-normal.woff2', 'Playfair Display', 700, 'normal'),
    ('permanent-marker-latin-400-normal.woff2', 'Permanent Marker', 400, 'normal'),
    ('vt323-latin-400-normal.woff2', 'VT323', 400, 'normal'),
    ('press-start-2p-latin-400-normal.woff2', 'Press Start 2P', 400, 'normal'),
]


def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()


def exists(name):
    return os.path.exists(os.path.join(SRC, name))


def fonts_css():
    out = []
    for fn, fam, w, st in FONTS:
        with open(os.path.join(SRC, 'fonts', fn), 'rb') as f:
            b64 = base64.b64encode(f.read()).decode('ascii')
        out.append('@font-face{font-family:"%s";font-style:%s;font-weight:%d;font-display:swap;src:url(data:font/woff2;base64,%s) format("woff2")}' % (fam, st, w, b64))
    return '\n'.join(out)


def compose(version, claude=False):
    html = read('index.html')
    js = '\n'.join('/* ---- %s ---- */\n' % n + read(n) for n in JS_ORDER if exists(n))
    css = '\n'.join(read(n) for n in CSS_ORDER if exists(n))
    for k, v in (('CSS', css), ('JS', js)):
        assert '</script' not in v.lower(), k + ' contains </script>'
        assert '</style' not in v.lower(), k + ' contains </style>'
    assert "const VERSION = '1.0.0';" in js
    js = js.replace("const VERSION = '1.0.0';", "const VERSION = '%s';" % version)
    if claude:
        js = 'window.RESKIN_NO_SW = true;\n' + js
        for old, new in CLAUDE_SUBS:
            assert old in js, 'Claude 版：找不到要換的字 ' + old
            js = js.replace(old, new)
        assert ' download=' not in js, 'Claude 版裡還有 download 連結'
    return html.replace('/*FONTS*/', fonts_css(), 1).replace('/*CSS*/', css, 1).replace('/*JS*/', js, 1)


# 給朋友的版本：把只屬於痞子葳的字眼換掉（每一條都必須找得到，找不到代表原始碼改過，要一起改這裡）
FRIEND_SUBS = [
    ("R.WEB_URL = 'https://pzwei0105.github.io/PZ-Games/apps/reskin/';", "R.WEB_URL = '';"),
    ('content="痞子葳的換膚音樂播放器：', 'content="換膚音樂播放器：'),
    ('<h2>痞子葳，歌庫還是空的</h2>', '<h2>歌庫還是空的</h2>'),
    ('（在 iPhone 上，它的歌庫跟收藏庫裡這份是分開的）', '（在 iPhone 上，主畫面的 App 跟這裡的歌庫是分開的）'),
    ("'你現在是從《PZ 遊戲收藏》裡打開的。' + ", "'' + "),
    ('<br>痞子葳的換膚音樂播放器 · 版本', '<br>換膚音樂播放器 · 版本'),
    ("artist: '痞子葳的換膚音樂播放器' }", "artist: '換膚音樂播放器' }"),
    ('WAKE UP, 痞子葳_', 'WAKE UP_'),
]
FRIEND_NEVER = ['痞子葳', '收藏庫', 'PZ 遊戲收藏', 'pzwei0105', 'PZ-Games']
# the Claude version hands out files only through the artifact's downloads capability: no plain download links in it
CLAUDE_SUBS = [
    ("const webLink = (u, name) => `<a class=\"btn pri wide\" href=\"${u}\" download=\"${esc(name)}\">${I.upload}存成圖片</a>`;", "const webLink = () => '';"),
]


def friendly(html):
    for old, new in FRIEND_SUBS:
        assert old in html, '朋友版：找不到要換的字 ' + old
        html = html.replace(old, new)
    for w in FRIEND_NEVER:
        assert w not in html, '朋友版裡還有「%s」' % w
    return html


MANIFEST = {
    'name': '耳目一新 RESKIN',
    'short_name': '耳目一新',
    'description': '痞子葳的換膚音樂播放器：十五套 Skin 一鍵換裝，副歌全開特效、歌詞、睡眠定時，播自己的音樂檔，離線也能聽。',
    'lang': 'zh-Hant-TW',
    'start_url': './',
    'scope': './',
    'display': 'standalone',
    'orientation': 'any',
    'background_color': '#07051a',
    'theme_color': '#07051a',
    'icons': [
        {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}

# 圖示：掛在衣架勾上的一圈「布料」——每一段是一套 Skin 的顏色，中間是發光的唱盤心
ICON_HTML = """<!DOCTYPE html><html><body style="margin:0;background:transparent">
<div id="i" style="width:512px;height:512px;border-radius:RADpx;overflow:hidden;position:relative;
background:radial-gradient(circle at 28% 18%, #3a1a6e 0%, #140a33 45%, #06040f 100%)">
<div style="position:absolute;left:0;top:0;width:512px;height:512px;transform:scale(SC);transform-origin:50% 50%">
 <svg viewBox="0 0 512 512" style="position:absolute;left:0;top:0;width:512px;height:512px">
  <path d="M256 168V140c0-13 8-20 19-27 15-10 27-19 27-41a46 46 0 1 0-92 0" fill="none" stroke="#e9edf7" stroke-width="17" stroke-linecap="round"/>
 </svg>
 <div style="position:absolute;left:96px;top:150px;width:320px;height:320px;border-radius:50%;
   background:conic-gradient(from -90deg, #ff2bd6 0 12%, #ff7a1a 12% 24%, #ffe14d 24% 36%, #7cff6b 36% 48%, #22f3ff 48% 60%, #6d7bff 60% 72%, #b06bff 72% 84%, #ffb3d9 84% 100%);
   -webkit-mask:radial-gradient(circle, transparent 0 92px, #000 93px 160px);
   box-shadow:0 0 60px rgba(255,43,214,.35)"></div>
 <div style="position:absolute;left:96px;top:150px;width:320px;height:320px;border-radius:50%;
   background:repeating-radial-gradient(circle, rgba(0,0,0,0) 0 9px, rgba(0,0,0,.22) 10px 11px);
   -webkit-mask:radial-gradient(circle, transparent 0 92px, #000 93px 160px)"></div>
 <div style="position:absolute;left:186px;top:240px;width:140px;height:140px;border-radius:50%;background:#0b0820;box-shadow:inset 0 0 0 6px rgba(255,255,255,.08)"></div>
 <div style="position:absolute;left:226px;top:280px;width:60px;height:60px;border-radius:50%;background:#fff;box-shadow:0 0 34px #fff, 0 0 70px #22f3ff"></div>
</div></div></body></html>"""


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
    ap.add_argument('--claude-out')
    ap.add_argument('--out', default=OUT)
    ap.add_argument('--friend-out')
    ap.add_argument('--friend-zip')
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
    if a.claude_out:
        os.makedirs(a.claude_out, exist_ok=True)
        with open(os.path.join(a.claude_out, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(compose(version, claude=True))
        print('claude version ->', a.claude_out)
    if a.friend_out or a.friend_zip:
        fo = a.friend_out or os.path.join('/tmp', 'reskin-friend')
        if os.path.isdir(fo):
            shutil.rmtree(fo)
        os.makedirs(fo)
        files = {
            'index.html': friendly(compose(version)).encode('utf-8'),
            'manifest.webmanifest': json.dumps(dict(MANIFEST, description=MANIFEST['description'].replace('痞子葳的', '')), ensure_ascii=False, indent=1).encode('utf-8'),
            'sw.js': read('sw.js').replace('__VERSION__', version).encode('utf-8'),
        }
        for n in sorted(os.listdir(icons)):
            with open(os.path.join(icons, n), 'rb') as f:
                files['icons/' + n] = f.read()
        for n, data in files.items():
            assert not any(w.encode('utf-8') in data for w in FRIEND_NEVER), '朋友版的 %s 裡有不該出現的字' % n
            os.makedirs(os.path.dirname(os.path.join(fo, n)) or fo, exist_ok=True)
            with open(os.path.join(fo, n), 'wb') as f:
                f.write(data)
        print('friend version ->', fo)
        if a.friend_zip:
            # files sit at the top of the zip: unzipping gives one folder with index.html directly inside (what Netlify Drop wants)
            with zipfile.ZipFile(a.friend_zip, 'w', zipfile.ZIP_DEFLATED) as z:
                for n, data in sorted(files.items()):
                    z.writestr(n, data)
            print('friend zip ->', a.friend_zip, '(%d KB)' % (os.path.getsize(a.friend_zip) // 1024))


if __name__ == '__main__':
    main()
