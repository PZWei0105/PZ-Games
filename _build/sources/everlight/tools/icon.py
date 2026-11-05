# 32x32 像素燈塔圖示，放大成 PWA 圖示
from PIL import Image, ImageDraw
import math, os, sys
S = 32
im = Image.new('RGBA', (S, S))
px = im.load()
def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
top, bot = (10, 14, 34), (30, 24, 52)
for y in range(S):
    for x in range(S):
        px[x, y] = mix(top, bot, y / (S - 1)) + (255,)
# 星星
for (x, y) in [(4, 4), (27, 3), (22, 8), (6, 12), (29, 13), (12, 2)]:
    px[x, y] = (200, 210, 255, 255)
# 光束（左右兩道）
cx, cy = 16, 9
for y in range(S):
    for x in range(S):
        dx, dy = x - cx, y - cy
        if abs(dx) < 2: continue
        ang = math.atan2(dy, abs(dx))
        if -0.32 < ang < 0.12:
            d = math.hypot(dx, dy)
            k = max(0, 1 - d / 17) * 0.75
            r, g, b, a = px[x, y]
            px[x, y] = mix((r, g, b), (255, 220, 140), k) + (255,)
# 海
for y in range(25, S):
    for x in range(S):
        c = (16, 40, 66) if (x + y) % 5 else (40, 80, 110)
        px[x, y] = c + (255,)
# 岩石
for y in range(23, 27):
    for x in range(9, 24):
        if abs(x - 16) < 8 - (26 - y) * 0.6: px[x, y] = (58, 56, 70, 255) if (x + y) % 3 else (80, 76, 92, 255)
# 塔身（紅白條紋，往上變窄）
for y in range(11, 24):
    hw = 2 + (y - 11) * 0.22
    for x in range(int(16 - hw), int(16 + hw) + 1):
        band = ((y - 11) // 3) % 2
        base = (190, 52, 48) if band else (236, 230, 216)
        if x < 16 - hw + 1: base = mix(base, (255, 255, 255), 0.25)
        if x > 16 + hw - 1: base = mix(base, (20, 20, 40), 0.35)
        px[x, y] = base + (255,)
# 燈室
for y in range(7, 11):
    for x in range(13, 20):
        px[x, y] = (255, 226, 140, 255) if 14 <= x <= 18 and 8 <= y <= 9 else (60, 50, 44, 255)
for x in range(12, 21): px[x, 11] = (40, 38, 48, 255)
# 屋頂
for y in range(4, 7):
    for x in range(16 - (y - 3), 16 + (y - 3) + 1):
        px[x, y] = (140, 40, 36, 255)
px[16, 3] = (230, 190, 90, 255)
# 光暈
for y in range(4, 14):
    for x in range(10, 23):
        d = math.hypot(x - 16, y - 8.5)
        if d < 6:
            r, g, b, a = px[x, y]
            px[x, y] = mix((r, g, b), (255, 236, 180), max(0, 1 - d / 6) * 0.35) + (255,)
out = sys.argv[1]
for size in (512, 192, 180):
    im.resize((size, size), Image.NEAREST).save(os.path.join(out, f'icon-{size}.png'))
im.resize((96, 96), Image.NEAREST).save('/tmp/icon-preview.png')
print('ok')
