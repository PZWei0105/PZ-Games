#!/usr/bin/env python3
"""除錯檢視：python3 tests/view.py "<JS 表達式>" out.png [w h]"""
import asyncio, sys, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
async def main():
    js = sys.argv[1]; out = sys.argv[2]; w = int(sys.argv[3]) if len(sys.argv) > 3 else 390; h = int(sys.argv[4]) if len(sys.argv) > 4 else 844
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-first-run'])
        ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2)
        pg = await ctx.new_page(); errs = []
        pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERR: ' + str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort()); await pg.route('**/fonts.gstatic.com/**', lambda r: r.abort())
        await pg.goto('file://' + os.path.join(ROOT, 'dist/web/index.html')); await pg.wait_for_timeout(600)
        r = await pg.evaluate(js); await pg.wait_for_timeout(300)
        await pg.screenshot(path=out)
        if r is not None: print(r)
        print('\n'.join(errs[:20]))
        await b.close()
asyncio.run(main())
