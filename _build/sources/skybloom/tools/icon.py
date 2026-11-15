#!/usr/bin/env python3
"""App 圖示：預設用 tools/icon-src.jpg（遊戲畫面：星辰宮與背後的煙火，1024×1024）；沒有就畫一個簡單版"""
import sys, os, math, random
from PIL import Image, ImageDraw, ImageFilter

def make():
    S = 1024
    random.seed(7)
    bg = Image.new('RGBA', (S, S))
    d = ImageDraw.Draw(bg)
    for y in range(S):
        t = y / S
        d.line([(0, y), (S, y)], fill=(int(8 + 40 * t ** 2), int(8 + 14 * t), int(28 + 46 * t), 255))
    # 星星
    for _ in range(90):
        x, y, r = random.random() * S, random.random() * S * 0.75, random.random() * 2.2 + 0.6
        d.ellipse([x - r, y - r, x + r, y + r], fill=(220, 225, 255, int(120 + random.random() * 120)))
    glow = Image.new('RGBA', (S, S), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    cx, cy = S * 0.5, S * 0.4
    cols = [(255, 120, 200), (255, 200, 110), (140, 210, 255), (255, 230, 170)]
    for i in range(64):
        a = i / 64 * math.tau
        c = cols[i % 4]
        L = 300 + (i % 3) * 22
        for k in range(18):
            t = k / 18
            x = cx + math.cos(a) * L * t; y = cy + math.sin(a) * L * t + t * t * 40
            r = 3 + t * 9
            g.ellipse([x - r, y - r, x + r, y + r], fill=c + (int(60 + 160 * t),))
    soft = glow.filter(ImageFilter.GaussianBlur(14))
    bg.alpha_composite(soft); bg.alpha_composite(soft)
    bg.alpha_composite(glow.filter(ImageFilter.GaussianBlur(2)))
    core = Image.new('RGBA', (S, S), (0, 0, 0, 0)); ImageDraw.Draw(core).ellipse([cx - 60, cy - 60, cx + 60, cy + 60], fill=(255, 245, 230, 255))
    bg.alpha_composite(core.filter(ImageFilter.GaussianBlur(30)))
    # 星辰宮剪影
    cas = Image.new('RGBA', (S, S), (0, 0, 0, 0)); c = ImageDraw.Draw(cas)
    base = S * 0.98
    sil = (16, 10, 34, 255)
    c.rectangle([S * 0.27, S * 0.8, S * 0.73, base], fill=sil)
    c.rectangle([S * 0.44, S * 0.66, S * 0.56, base], fill=sil)
    c.ellipse([S * 0.43, S * 0.61, S * 0.57, S * 0.71], fill=(120, 200, 255, 255))
    c.polygon([(S * 0.5, S * 0.5), (S * 0.485, S * 0.63), (S * 0.515, S * 0.63)], fill=(240, 190, 90, 255))
    for x in (0.31, 0.39, 0.61, 0.69):
        w = 0.035
        c.rectangle([S * (x - w), S * 0.74, S * (x + w), base], fill=sil)
        c.polygon([(S * x, S * 0.64), (S * (x - w - 0.01), S * 0.745), (S * (x + w + 0.01), S * 0.745)], fill=(60, 50, 150, 255))
    for i in range(12):
        x = S * (0.3 + i * 0.036); c.rectangle([x, S * 0.86, x + 10, S * 0.875], fill=(255, 196, 120, 255))
    edge = cas.filter(ImageFilter.GaussianBlur(10))
    tint = Image.new('RGBA', (S, S), (255, 90, 190, 0)); tint.putalpha(edge.split()[3].point(lambda v: int(v * 0.8)))
    bg.alpha_composite(tint)
    bg.alpha_composite(cas)
    return bg

def save(img, path, size, radius=True):
    im = img.resize((size, size), Image.LANCZOS)
    if radius:
        m = Image.new('L', (size, size), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255)
        out = Image.new('RGBA', (size, size), (0, 0, 0, 0)); out.paste(im, (0, 0), m); im = out
    im.save(path)

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'dist/web'
    os.makedirs(out, exist_ok=True)
    src = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icon-src.jpg')
    img = Image.open(src).convert('RGBA') if os.path.exists(src) else make()  # icon-src.jpg：用遊戲畫面截的（castle + 煙火）
    save(img, os.path.join(out, 'icon-512.png'), 512)
    save(img, os.path.join(out, 'icon-192.png'), 192)
    save(img, os.path.join(out, 'icon-180.png'), 180, radius=False)
    print('icons ->', out)
