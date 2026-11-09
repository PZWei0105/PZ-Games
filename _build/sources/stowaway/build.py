#!/usr/bin/env python3
"""把 src/ 組成單一 HTML。

輸出：
  dist/artifact/index.html   Claude 版
  dist/web/                  獨立網頁版：index.html、manifest.webmanifest、icon-192/180/512.png
                             （放進 PZ 遊戲收藏時複製到 _build/raw/stowaway/）
"""
import os, glob, json, shutil, math

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'dist')
ASSETS = os.path.join(ROOT, 'assets')

MANIFEST = {
    'name': '偷渡者 STOWAWAY', 'short_name': '偷渡者', 'start_url': './', 'display': 'standalone',
    'orientation': 'any', 'background_color': '#05080c', 'theme_color': '#05080c',
    'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
              {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any maskable'}],
}


def make_icons():
    """圖示：深色底、一道從門縫透出的橘光、門縫裡一顆青色的光點（牠）。"""
    from PIL import Image, ImageDraw, ImageFilter
    os.makedirs(ASSETS, exist_ok=True)
    S = 1024
    im = Image.new('RGB', (S, S), (6, 9, 13))
    d = ImageDraw.Draw(im)
    for y in range(S):
        t = y / S
        d.line([(0, y), (S, y)], fill=(int(8 + 10 * t), int(12 + 8 * t), int(18 + 6 * t)))
    # 兩扇門板
    gap = 64
    d.rectangle([150, 170, S // 2 - gap // 2, 860], fill=(38, 44, 52))
    d.rectangle([S // 2 + gap // 2, 170, S - 150, 860], fill=(38, 44, 52))
    for x0, x1 in ((150, S // 2 - gap // 2), (S // 2 + gap // 2, S - 150)):
        for k in range(6):
            yy = 210 + k * 105
            d.rectangle([x0 + 26, yy, x1 - 26, yy + 10], fill=(58, 66, 76))
    # 警示斜紋
    for k in range(-6, 14):
        x = 150 + k * 70
        d.polygon([(x, 860), (x + 36, 860), (x + 36 + 60, 940), (x + 60, 940)], fill=(255, 106, 26))
    d.rectangle([0, 940, S, S], fill=(6, 9, 13))
    d.rectangle([0, 856, S, 864], fill=(20, 24, 30))
    # 門縫裡的光
    glow = Image.new('RGB', (S, S), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.rectangle([S // 2 - gap // 2 - 30, 150, S // 2 + gap // 2 + 30, 880], fill=(255, 120, 40))
    glow = glow.filter(ImageFilter.GaussianBlur(40))
    im = Image.composite(Image.new('RGB', (S, S), (255, 150, 70)), im, glow.convert('L').point(lambda v: int(v * .55)))
    d = ImageDraw.Draw(im)
    d.rectangle([S // 2 - gap // 2, 170, S // 2 + gap // 2, 860], fill=(255, 180, 110))
    # 牠的光
    cy = 420
    eye = Image.new('RGB', (S, S), (0, 0, 0))
    e = ImageDraw.Draw(eye)
    e.ellipse([S // 2 - 70, cy - 70, S // 2 + 70, cy + 70], fill=(111, 232, 255))
    eye = eye.filter(ImageFilter.GaussianBlur(28))
    im = Image.composite(Image.new('RGB', (S, S), (140, 240, 255)), im, eye.convert('L'))
    d = ImageDraw.Draw(im)
    d.ellipse([S // 2 - 22, cy - 22, S // 2 + 22, cy + 22], fill=(230, 252, 255))
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
