#!/usr/bin/env python3
"""App 圖示：霓虹爪子＋金色扭蛋"""
import sys, os, math
from PIL import Image, ImageDraw, ImageFilter

def make(size):
    S = 1024
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    bg = Image.new('RGBA', (S, S))
    d = ImageDraw.Draw(bg)
    for y in range(S):
        t = y / S
        d.line([(0, y), (S, y)], fill=(int(10 + 30 * t), int(8 + 10 * t), int(30 + 40 * (1 - t)), 255))
    mask = Image.new('L', (S, S), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=220, fill=255)
    im.paste(bg, (0, 0), mask)
    glow = Image.new('RGBA', (S, S), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    # 霓虹圈
    g.ellipse([150, 150, S - 150, S - 150], outline=(255, 63, 180, 255), width=34)
    glow = glow.filter(ImageFilter.GaussianBlur(28))
    im.alpha_composite(glow)
    ring = Image.new('RGBA', (S, S), (0, 0, 0, 0)); r = ImageDraw.Draw(ring)
    r.ellipse([150, 150, S - 150, S - 150], outline=(255, 170, 225, 255), width=14)
    im.alpha_composite(ring)
    # 爪子
    claw = Image.new('RGBA', (S, S), (0, 0, 0, 0)); c = ImageDraw.Draw(claw)
    cx = S // 2
    c.line([(cx, 120), (cx, 330)], fill=(220, 228, 240, 255), width=14)
    c.rounded_rectangle([cx - 85, 320, cx + 85, 440], radius=36, fill=(230, 236, 246, 255))
    c.rectangle([cx - 90, 372, cx + 90, 388], fill=(83, 214, 255, 255))
    for side in (-1, 1):
        pts = [(cx + side * 55, 430), (cx + side * 170, 560), (cx + side * 120, 690)]
        c.line(pts, fill=(230, 236, 246, 255), width=34, joint='curve')
        c.ellipse([pts[-1][0] - 22, pts[-1][1] - 22, pts[-1][0] + 22, pts[-1][1] + 22], fill=(40, 42, 54, 255))
    c.line([(cx, 440), (cx, 600)], fill=(230, 236, 246, 255), width=34)
    im.alpha_composite(claw)
    # 金色扭蛋
    cap = Image.new('RGBA', (S, S), (0, 0, 0, 0)); k = ImageDraw.Draw(cap)
    R0 = 150; cy = 700
    k.pieslice([cx - R0, cy - R0, cx + R0, cy + R0], 0, 180, fill=(255, 190, 46, 255))
    k.pieslice([cx - R0, cy - R0, cx + R0, cy + R0], 180, 360, fill=(255, 240, 210, 150))
    k.rectangle([cx - R0, cy - 10, cx + R0, cy + 10], fill=(255, 250, 235, 255))
    k.ellipse([cx - 80, cy - 110, cx - 30, cy - 60], fill=(255, 255, 255, 200))
    cg = cap.filter(ImageFilter.GaussianBlur(40))
    im.alpha_composite(cg); im.alpha_composite(cap)
    return im.resize((size, size), Image.LANCZOS)

out = sys.argv[1] if len(sys.argv) > 1 else 'dist/web'
os.makedirs(out, exist_ok=True)
for n in (192, 512, 180):
    img = make(n)
    if n == 180:
        bgc = Image.new('RGBA', img.size, (10, 8, 30, 255)); bgc.alpha_composite(img); img = bgc
    img.save(os.path.join(out, f'icon-{n}.png'))
print('icons ->', out)
