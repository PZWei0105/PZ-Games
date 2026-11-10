#!/usr/bin/env python3
"""觸控測試：點卡片 → 點戰場部署；拖曳鏡頭；技能。直拿（旋轉）和橫拿都測。"""
import asyncio, os, sys
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

async def run(w, h):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=2, has_touch=True)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + os.path.join(ROOT, 'dist', 'web', 'index.html') + '#test-kaz')
        await pg.wait_for_timeout(800)
        await pg.evaluate("B.cfg.autoUs = false; B.units = B.units.filter(u => u.side === 1); B.supply[0] = 10;")
        n0 = await pg.evaluate("B.units.filter(u => u.side === 0).length")
        # 點第一張卡（步槍班）
        box = await pg.evaluate("(() => { const r = UI.cardEls[0].el.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; })()")
        await pg.mouse.click(box[0], box[1]); await pg.wait_for_timeout(100)
        sel = await pg.evaluate("B.sel")
        # 點戰場上中路的位置（世界座標轉螢幕座標，再轉成真正的螢幕點）
        pt = await pg.evaluate("(() => { CAM.follow = false; CAM.userT = 99; const [lx, ly] = worldToScreen(CAM.x - 150, LANES[1]); if (!VIEW.rot) return [lx, ly]; return [innerWidth - ly, lx]; })()")
        await pg.mouse.click(pt[0], pt[1]); await pg.wait_for_timeout(200)
        n1 = await pg.evaluate("B.units.filter(u => u.side === 0).length")
        lane = await pg.evaluate("(B.units.filter(u => u.side === 0)[0] || {}).lane")
        # 拖曳鏡頭
        cx0 = await pg.evaluate("CAM.x")
        mid = await pg.evaluate("VIEW.rot ? [innerWidth/2, innerHeight/2] : [innerWidth/2, innerHeight/2]")
        await pg.mouse.move(mid[0], mid[1]); await pg.mouse.down(); 
        for i in range(8): await pg.mouse.move(mid[0] - (0 if await pg.evaluate('VIEW.rot') else 20*i), mid[1] - (20*i if await pg.evaluate('VIEW.rot') else 0))
        await pg.mouse.up(); await pg.wait_for_timeout(100)
        cx1 = await pg.evaluate("CAM.x")
        print(f'{w}x{h}: sel={sel} deployed {n0}->{n1} lane={lane} cam {cx0:.0f}->{cx1:.0f} errors={errs[:3]}')
        await b.close()

async def main():
    await run(844, 390)
    await run(390, 844)
asyncio.run(main())
