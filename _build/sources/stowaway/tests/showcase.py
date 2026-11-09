#!/usr/bin/env python3
"""擺拍：python3 tests/showcase.py → /tmp/sw/shots/sc_*.png"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run import page, OUT
from flows import PRE
from playwright.async_api import async_playwright

SCENES = {
  'juv': """() => { const W = __sw.W, b = W.beast; b.state = 'feed'; b.feedT = 99; b.st = 0; b.inVent = false; b.x = 3.2 * 48; b.y = 21.6 * 48; for (const s of b.seg) { s.x = b.x + 10; s.y = b.y; }
     const m = W.crew[2]; m.x = 5.4 * 48; m.y = 22 * 48; m.ang = Math.PI; m.task = null; m.path = null; __sw.CAM.x = 4 * 48; __sw.CAM.y = 22 * 48; __sw.CAM.tz = __sw.CAM.z = 1.4; __sw.CAM.follow = -1; __sw.CAM.freeT = 999; }""",
  'adult': """() => { const W = __sw.W; startAct(1); const b = W.beast; b.inVent = false; b.state = 'search'; b.searchT = 99; b.st = 0; b.x = 4.2 * 48; b.y = 15.2 * 48; b.ang = .4; for (const s of b.seg) { s.x = b.x - 30; s.y = b.y - 10; }
     __sw.CAM.x = 4 * 48; __sw.CAM.y = 17 * 48; __sw.CAM.tz = __sw.CAM.z = 1.3; __sw.CAM.follow = -1; __sw.CAM.freeT = 999; }""",
  'grab': """() => { const W = __sw.W; startAct(1); const b = W.beast; b.inVent = false; b.x = 3 * 48; b.y = 18.5 * 48; for (const s of b.seg) { s.x = b.x - 30; s.y = b.y; } startGrab(b, W.crew[3]);
     __sw.CAM.x = 4 * 48; __sw.CAM.y = 17 * 48; __sw.CAM.tz = __sw.CAM.z = 1.3; __sw.CAM.follow = -1; __sw.CAM.freeT = 999; }""",
  'final': """() => { const W = __sw.W; W.plan = 'burn'; startAct(1); startAct(2); const b = W.beast; b.inVent = false; b.state = 'chase'; b.target = W.crew[5]; b.x = 8 * 48; b.y = 34 * 48; for (const s of b.seg) { s.x = b.x - 30; s.y = b.y; }
     const m = W.crew[5]; giveItem(m, 'flamer'); m.x = 6 * 48; m.y = 34.4 * 48; m.ang = 0; startFire(m);
     __sw.CAM.x = 7 * 48; __sw.CAM.y = 34 * 48; __sw.CAM.tz = __sw.CAM.z = 1.2; __sw.CAM.follow = -1; __sw.CAM.freeT = 999; }""",
  'bridge': """() => { const W = __sw.W; enterBridge(W.crew[1]); __sw.UI.showVents = true; document.querySelector('#b-bridge').click(); W.blips.push({x: 9*48, y: 20*48, t: .2, vent: true}); }""",
  'dark': """() => { const W = __sw.W; togglePower('lights'); const m = W.crew[3]; __sw.selectCrew(3); __sw.CAM.tz = __sw.CAM.z = 1.2; }""",
  'overview': """() => { document.querySelector('#b-zoom').click(); }""",
}


async def main(which):
    async with async_playwright() as pw:
        for name, js in SCENES.items():
            if which != 'all' and name != which: continue
            b, pg, errs = await page(pw)
            await pg.evaluate(PRE)
            await pg.evaluate(js)
            await pg.wait_for_timeout(1500 if name != 'grab' else 900)
            await pg.screenshot(path=f'{OUT}/sc_{name}.png')
            if errs: print(name, '\n'.join(errs[:10]))
            await b.close()
    print('ok')

if __name__ == '__main__':
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else 'all'))
