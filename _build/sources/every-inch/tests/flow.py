#!/usr/bin/env python3
"""戰役流程測試：開新戰役 → 點過劇情 → 新手戰（自動打）→ 地圖 → 進攻一個據點 → 回地圖。每一步拍照。"""
import asyncio, os, sys
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/ei/flow'

async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2)
        logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        await pg.goto('file://' + os.path.join(ROOT, 'dist', 'web', 'index.html'))
        await pg.wait_for_timeout(1200)
        n = [0]
        async def shot(name):
            n[0] += 1
            await pg.screenshot(path=f'{OUT}/{n[0]:02d}-{name}.png')
        async def click_dlg(times=12):
            for _ in range(times):
                vis = await pg.evaluate("document.querySelector('#dlg').classList.contains('on') && !document.querySelector('#dlg .chs')")
                if not vis: break
                await pg.evaluate("document.querySelector('#dlg').click()"); await pg.wait_for_timeout(40)
                await pg.evaluate("document.querySelector('#dlg').click()"); await pg.wait_for_timeout(40)
        await shot('title')
        await pg.evaluate("document.querySelector('[data-a=new]').click()"); await pg.wait_for_timeout(600)
        await shot('intro')
        await click_dlg()
        await pg.wait_for_timeout(500)
        await shot('tutorial-start')
        await pg.evaluate("G.autoTest = true")
        r = await pg.evaluate("__ei.step(40)"); print('tut 40s', r)
        await shot('tutorial-40s')
        for i in range(8):
            r = await pg.evaluate("__ei.step(30)")
            if r and r['over']: break
        print('tut end', r)
        await pg.evaluate("G.freeze = false")
        await pg.wait_for_timeout(3600)
        await shot('result')
        await pg.evaluate("document.querySelector('#result .btn').click()"); await pg.wait_for_timeout(500)
        await shot('after-result')
        await click_dlg(14)
        await pg.wait_for_timeout(600)
        mb = await pg.evaluate("document.querySelector('#modal').classList.contains('on')")
        if mb:
            await shot('report'); await pg.evaluate("document.querySelector('#modal .btn').click()"); await pg.wait_for_timeout(400)
        await shot('map')
        # 選一個可以進攻的據點
        sid = await pg.evaluate("attackable()[0]")
        print('attackable', await pg.evaluate("attackable()"))
        await pg.evaluate(f"MAPV.sel = '{sid}'; renderMapPanel()")
        await pg.wait_for_timeout(200)
        await shot('map-select')
        await pg.evaluate("document.querySelector('#mAtk').click()"); await pg.wait_for_timeout(500)
        await shot('brief')
        await pg.evaluate("document.querySelector('#bGo').click()"); await pg.wait_for_timeout(500)
        await click_dlg()
        await pg.wait_for_timeout(300)
        await shot('battle2')
        for l in logs[:30]: print(l)
        await b.close()
asyncio.run(main())
