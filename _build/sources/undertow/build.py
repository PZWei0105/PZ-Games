#!/usr/bin/env python3
"""把 src/ 組成單一 HTML。

輸出：
  dist/artifact/index.html   Claude 版
  dist/web/                  獨立網頁版：index.html、manifest.webmanifest、icon-192/180/512.png
                             （放進 PZ 遊戲收藏時複製到 _build/raw/undertow/）
"""
import os, glob, json, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'dist')
ASSETS = os.path.join(ROOT, 'assets')

MANIFEST = {
    'name': '深艙 UNDERTOW', 'short_name': '深艙', 'start_url': './', 'display': 'standalone',
    'orientation': 'any', 'background_color': '#02070b', 'theme_color': '#02070b',
    'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
              {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any maskable'}],
}


def make_icons():
    from PIL import Image, ImageDraw, ImageFilter
    os.makedirs(ASSETS, exist_ok=True)
    S = 1024
    im = Image.new('RGB', (S, S), (2, 9, 14))
    d = ImageDraw.Draw(im)
    for y in range(S):
        t = y / S
        d.line([(0, y), (S, y)], fill=(int(4 + 6 * (1 - t)), int(22 + 30 * (1 - t)), int(34 + 40 * (1 - t))))
    glow = Image.new('RGB', (S, S), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    cx, cy = S // 2, int(S * .47)
    for k, (rx, ry) in enumerate([(330, 380), (230, 265), (130, 150)]):
        col = (95, 231, 255) if k < 2 else (255, 77, 94)
        g.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=col, width=26)
    glow = glow.filter(ImageFilter.GaussianBlur(22))
    im.paste(glow, (0, 0), glow.convert('L'))
    d = ImageDraw.Draw(im)
    for k, (rx, ry) in enumerate([(330, 380), (230, 265), (130, 150)]):
        col = (196, 248, 255) if k < 2 else (255, 140, 150)
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=col, width=10)
    d.ellipse([cx - 34, cy - 40, cx + 34, cy + 40], fill=(255, 210, 215))
    d.rectangle([0, int(S * .86), S, S], fill=(10, 18, 22))
    d.rectangle([0, int(S * .86), S, int(S * .86) + 8], fill=(255, 176, 58))
    for s in (512, 192, 180):
        im.resize((s, s), Image.LANCZOS).save(os.path.join(ASSETS, f'icon-{s}.png'))


def build():
    if not os.path.exists(os.path.join(ASSETS, 'icon-512.png')):
        make_icons()
    head = open(os.path.join(SRC, '00_head.html'), encoding='utf-8').read()
    js = '\n'.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(SRC, '*.js'))))
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
        shutil.copy(os.path.join(ASSETS, f'icon-{s}.png'), os.path.join(web, f'icon-{s}.png'))
    open(os.path.join(DIST, 'bundle.js'), 'w', encoding='utf-8').write(js)
    print('built', os.path.getsize(os.path.join(DIST, 'artifact', 'index.html')) // 1024, 'KB')


if __name__ == '__main__':
    build()
