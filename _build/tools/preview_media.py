#!/usr/bin/env python3
"""Contact sheet of how each game's cover / hero / wide crops will look (same maths as build.py).

usage: python3 tools/preview_media.py OUT.png id1 id2 ...
"""
import json, os, sys, glob
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(__file__))
import build  # noqa: E402

ROOT = '/home/claude/pzgc'
FONT = None
for p in glob.glob(ROOT + '/tools/fonts/node_modules/@fontsource/noto-sans-tc/files/*chinese-traditional-700-normal.woff*'):
    pass
try:
    FONT = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 15)
except Exception:
    FONT = ImageFont.load_default()


def crop_pos(img, aspect, pos):
    W, H = img.size
    if W / H > aspect:
        ww, wh = int(H * aspect), H
    else:
        ww, wh = W, int(W / aspect)
    l = int((W - ww) * pos[0] / 100); t = int((H - wh) * pos[1] / 100)
    return img.crop((l, t, l + ww, t + wh))


def main():
    out, ids = sys.argv[1], sys.argv[2:]
    ovs = build.load_json(os.path.join(ROOT, 'data/overrides.json'), {}) or {}
    H = 200
    rows = []
    for gid in ids:
        sdir = os.path.join(ROOT, 'shots', gid)
        files = sorted(glob.glob(os.path.join(sdir, '[0-9][0-9].png')))
        if not files:
            continue
        ov = ovs.get(gid, {})
        meta = build.load_json(os.path.join(ROOT, 'meta', gid + '.json'), {}) or {}
        first = Image.open(files[0])
        vp = meta.get('viewport', '')
        orient = 'p' if vp == 'phone' else ('l' if vp == 'land' else ('d' if vp == 'desk' else ('p' if first.height > first.width else 'd')))
        names = [os.path.basename(f) for f in files]
        hero_name = ov.get('heroShot') or names[1 if len(names) > 1 else 0]
        himg = Image.open(os.path.join(sdir, hero_name)).convert('RGB')
        ha = 0.6 if orient == 'p' else 1.75
        hpos = build.object_position(himg, ha, ov.get('heroFocus'))
        hero = crop_pos(himg, ha, hpos)
        cov_name = ov.get('coverShot') or names[0]
        cimg = Image.open(os.path.join(sdir, cov_name)).convert('RGB')
        if ov.get('coverFocus'):
            fx, fy = ov['coverFocus']
            W, Hh = cimg.size
            ww, wh = (int(Hh * 2 / 3), Hh) if W / Hh > 2 / 3 else (W, int(W * 1.5))
            l = int(max(0, min(W - ww, fx / 100 * W - ww / 2))); t = int(max(0, min(Hh - wh, fy / 100 * Hh - wh / 2)))
        else:
            l, t, ww, wh = build.best_window(cimg, 2 / 3)
        cov = cimg.crop((l, t, l + ww, t + wh))
        wix = 2 if len(names) > 2 else (1 if len(names) > 1 else 0)
        wname = ov.get('wideShot') or names[wix]
        wimg = Image.open(os.path.join(sdir, wname)).convert('RGB')
        wpos = build.object_position(wimg, 16 / 9, ov.get('wideFocus'))
        wide = crop_pos(wimg, 16 / 9, wpos)
        tiles = [('cover ' + cov_name, cov.resize((int(H * 2 / 3), H))),
                 ('hero ' + hero_name, hero.resize((int(H * ha) if ha < 1 else int(H * 1.75), H))),
                 ('wide ' + wname, wide.resize((int(H * 16 / 9), H)))]
        # all shots thumbnails
        for f in names:
            im = Image.open(os.path.join(sdir, f)).convert('RGB')
            im.thumbnail((int(H * 1.8), H))
            tiles.append((f, im))
        rows.append((gid + ' [' + orient + ']', tiles))
    if not rows:
        return
    pad = 8
    width = max(sum(t[1].width + pad for t in r[1]) for r in rows) + pad
    height = len(rows) * (H + 26 + pad) + pad
    sheet = Image.new('RGB', (width, height), (14, 16, 24))
    d = ImageDraw.Draw(sheet)
    y = pad
    for label, tiles in rows:
        x = pad
        d.text((x, y), label, fill=(255, 220, 120), font=FONT)
        for name, im in tiles:
            sheet.paste(im, (x, y + 22))
            d.text((x + 3, y + 22 + H - 18), name, fill=(255, 255, 255), font=FONT, stroke_width=2, stroke_fill=(0, 0, 0))
            x += im.width + pad
        y += H + 26 + pad
    sheet.save(out)
    print(out, sheet.size)


if __name__ == '__main__':
    main()
