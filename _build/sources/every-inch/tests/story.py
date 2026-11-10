#!/usr/bin/env python3
"""劇情流程：打下卡茲大本營 → 對話 → 處置選擇 → 戰術準則 → 地圖；最終戰 → 結局。"""
import asyncio, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = '/tmp/ei/story'

async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + os.path.join(ROOT, 'dist', 'web', 'index.html'))
        await pg.wait_for_timeout(900)
        n = [0]
        async def shot(name):
            n[0] += 1; await pg.screenshot(path=f'{OUT}/{n[0]:02d}-{name}.png')
        async def clicks(k):
            for _ in range(k):
                await pg.evaluate("document.querySelector('#dlg').click()"); await pg.wait_for_timeout(30)
        await pg.evaluate("campNew(); CAMP.tutorial=false; CAMP.own.scrap='us'; goMap(); capitalTaken('kaz','scrap')")
        await pg.wait_for_timeout(500); await shot('post-kaz')
        await clicks(8); await pg.wait_for_timeout(300); await shot('fate-choice')
        await pg.evaluate("document.querySelector('#dlg .chs .btn').click()"); await pg.wait_for_timeout(300)
        await shot('fate-react'); await clicks(4); await pg.wait_for_timeout(300); await shot('doctrine')
        await pg.evaluate("document.querySelector('#dlg .chs .btn').click()"); await pg.wait_for_timeout(300)
        await shot('teacher'); await clicks(12); await pg.wait_for_timeout(400)
        m = await pg.evaluate("document.querySelector('#modal').classList.contains('on')")
        if m: await shot('report'); await pg.evaluate("document.querySelector('#modal .btn').click()"); await pg.wait_for_timeout(300)
        await shot('map'); print('heroes', await pg.evaluate("CAMP.heroes"), 'own', await pg.evaluate("owned('us').length"), 'day', await pg.evaluate("CAMP.day"))
        await pg.evaluate("goBase()"); await pg.wait_for_timeout(300); await shot('base')
        await pg.evaluate("chooseEnding()"); await pg.wait_for_timeout(300); await shot('ending-choice')
        await pg.evaluate("document.querySelectorAll('#dlg .chs .btn')[1].click()"); await pg.wait_for_timeout(500); await shot('ending')
        await clicks(14); await pg.wait_for_timeout(400); await shot('end')
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
