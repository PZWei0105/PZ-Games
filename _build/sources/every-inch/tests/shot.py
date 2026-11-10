#!/usr/bin/env python3
"""開發用截圖：python3 tests/shot.py <hash> <out.png> [寬 高] [js...]
例：python3 tests/shot.py '#show=soldiers' /tmp/ei/s.png 1400 760 "__show.step(1.2)"
每個 js 參數依序執行，執行後各拍一張（out 檔名加 -1、-2…）。"""
import sys, os, asyncio
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


async def main():
    h = sys.argv[1]; out = sys.argv[2]
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 844
    hh = int(sys.argv[4]) if len(sys.argv) > 4 else 390
    steps = sys.argv[5:]
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': w, 'height': hh}, device_scale_factor=2)
        logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        await pg.goto('file://' + os.path.join(ROOT, 'dist', 'web', 'index.html') + h)
        await pg.wait_for_timeout(800)
        if not steps:
            await pg.screenshot(path=out)
        for i, s in enumerate(steps):
            r = await pg.evaluate(s)
            if r is not None:
                print('eval:', r)
            await pg.wait_for_timeout(60)
            o = out.replace('.png', f'-{i + 1}.png') if len(steps) > 1 else out
            await pg.screenshot(path=o)
        for l in logs:
            print(l)
        await b.close()

asyncio.run(main())
