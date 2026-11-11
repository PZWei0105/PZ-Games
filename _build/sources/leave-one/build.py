#!/usr/bin/env python3
"""把 src/ 組成單一 HTML（字型子集內嵌）。

輸出：
  dist/artifact/index.html   Claude 版
  dist/web/                  獨立網頁版：index.html、manifest.webmanifest、icon-192/180/512.png
                             （放進 PZ 遊戲收藏時複製到 _build/raw/leave-one/）
"""
import os, glob, json, shutil, base64, io, re

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'dist')
ASSETS = os.path.join(ROOT, 'assets')
FONTS = {
    'LOSerif': ('/usr/share/fonts/opentype/noto/NotoSerifCJK-Black.ttc', 3),
    'LOBody': ('/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc', 3),
}
MANIFEST = {
    'name': '留一口 LEAVE ONE', 'short_name': '留一口', 'start_url': './', 'display': 'standalone',
    'orientation': 'landscape', 'background_color': '#0b0806', 'theme_color': '#0b0806',
    'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
              {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any maskable'}],
}


def subset_font(path, idx, text):
    from fontTools.ttLib import TTFont
    from fontTools import subset
    f = TTFont(path, fontNumber=idx)
    opts = subset.Options()
    opts.flavor = 'woff'
    opts.layout_features = ['*']
    opts.name_IDs = []
    opts.notdef_outline = True
    s = subset.Subsetter(opts)
    s.populate(text=text)
    s.subset(f)
    buf = io.BytesIO()
    f.flavor = 'woff'
    f.save(buf)
    return base64.b64encode(buf.getvalue()).decode()


def build():
    head = open(os.path.join(SRC, '00_head.html'), encoding='utf-8').read()
    js = '\n'.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(SRC, '*.js'))))
    # 只收畫面上會出現的字：HTML 全部 + JS 裡的字串（註解不算）
    js_str = ''.join(re.findall(r"'([^'\\]*(?:\\.[^'\\]*)*)'", js)) + ''.join(re.findall(r'`([^`]*)`', js))
    chars = set(head + js_str)
    chars |= set('0123456789０１２３４５６７８９ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz −・，。！？：；（）「」—…→←▸')
    text = ''.join(sorted(c for c in chars if c.isprintable()))
    faces = []
    total = 0
    for fam, (path, idx) in FONTS.items():
        b64 = subset_font(path, idx, text)
        total += len(b64)
        faces.append("@font-face{font-family:'%s';src:url(data:font/woff;base64,%s) format('woff');font-display:block}" % (fam, b64))
    head = head.replace('/*FONTS*/', '\n'.join(faces))
    tail = '\n</script>\n</body>\n</html>\n'
    os.makedirs(os.path.join(DIST, 'artifact'), exist_ok=True)
    web = os.path.join(DIST, 'web')
    os.makedirs(web, exist_ok=True)
    open(os.path.join(DIST, 'artifact', 'index.html'), 'w', encoding='utf-8').write(head.replace('<!--PWA-->', '') + js + tail)
    pwa = ('<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png">'
           '<link rel="apple-touch-icon" href="icon-180.png">')
    open(os.path.join(web, 'index.html'), 'w', encoding='utf-8').write(head.replace('<!--PWA-->', pwa) + js + tail)
    json.dump(MANIFEST, open(os.path.join(web, 'manifest.webmanifest'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for s in ('192', '180', '512'):
        src = os.path.join(ASSETS, f'icon-{s}.png')
        if os.path.exists(src):
            shutil.copy(src, os.path.join(web, f'icon-{s}.png'))
    open(os.path.join(DIST, 'bundle.js'), 'w', encoding='utf-8').write(js)
    print('built', os.path.getsize(os.path.join(DIST, 'artifact', 'index.html')) // 1024, 'KB', '(fonts', total // 1024, 'KB,', len(text), 'chars)')


if __name__ == '__main__':
    build()
