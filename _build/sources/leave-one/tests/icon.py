#!/usr/bin/env python3
"""用遊戲自己的畫面做 App 圖示：python3 tests/icon.py → assets/icon-512/192/180.png"""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from run import ARGS, HTML
from playwright.async_api import async_playwright
from PIL import Image, ImageFilter, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSE = """(()=>{
  ignite(); S.light = 1; S.flash = 0;
  for (const id of ['#hud','#labels','#hint','#title']) document.querySelector(id).style.display='none';
  W.mam.x = 1000; W.mam.y = W.groundAt(1000); W.mam.face = -1; W.mam.fv = -1; W.mam.vx = 0; W.mam.state = 'alert'; W.mam.trumpT = 999; W.mam.rage = 0;
  W.ignite(1215, 36);
  for (const s of W.grass) if (s.st === 1) { s.t = 0.6; s.I = 1; }
  S.phase = 'pose';
  S.camLock = { x: 962, y: 452, z: 1024 / 610 };
})()"""

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
        ctx = await b.new_context(viewport={'width': 1024, 'height': 1024}, device_scale_factor=1)
        pg = await ctx.new_page()
        await pg.goto(HTML)
        await pg.wait_for_timeout(1200)
        await pg.evaluate(POSE)
        await pg.wait_for_timeout(2500)
        await pg.evaluate("S.phase='pose'; document.querySelector('#hud').style.display='none'; document.querySelector('#labels').style.display='none'; document.querySelector('#hint').style.display='none';")
        await pg.wait_for_timeout(300)
        await pg.screenshot(path='/tmp/lo/icon_raw.png')
        await b.close()
    im = Image.open('/tmp/lo/icon_raw.png').convert('RGB')
    # 暗角，讓縮小以後輪廓還清楚
    w, h = im.size
    mask = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse([-w * 0.15, -h * 0.15, w * 1.15, h * 1.15], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(120))
    dark = Image.new('RGB', (w, h), (12, 8, 6))
    im = Image.composite(im, dark, mask)
    for s in (512, 192, 180):
        im.resize((s, s), Image.LANCZOS).save(os.path.join(ROOT, 'assets', f'icon-{s}.png'))
    print('icons ok')

asyncio.run(main())
