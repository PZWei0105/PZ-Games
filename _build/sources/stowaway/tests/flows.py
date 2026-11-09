#!/usr/bin/env python3
"""各結局流程：python3 tests/flows.py [airlock|burn|abandon|stowaway|wait|strangle|all]"""
import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run import page, OUT
from playwright.async_api import async_playwright

PRE = """async () => {
  localStorage.clear(); __sw.G.ckpt = null;
  document.querySelector('#t-go').click();
  await new Promise(r => setTimeout(r, 300));
  for (let i = 0; i < 8; i++) { document.querySelector('#s-scene').click(); await new Promise(r => setTimeout(r, 60)); }
  return __sw.W.phase;
}"""
SKIP = """async (pick) => {
  for (let i = 0; i < 14; i++) {
    const c = [...document.querySelectorAll('.choice:not([disabled])')];
    if (c.length) { const t = c.find(x => x.textContent.includes(pick)) || c[0]; t.click(); break; }
    document.querySelector('#s-scene').click(); await new Promise(r => setTimeout(r, 80));
  }
  await new Promise(r => setTimeout(r, 200));
  return __sw.W.act + ' ' + __sw.W.phase + ' ' + __sw.W.plan;
}"""


async def flow(name):
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        print(name, await pg.evaluate(PRE))
        if name == 'strangle':
            await pg.evaluate("""() => { const W = __sw.W, b = W.beast; b.state = 'search'; b.inVent = false; b.x = 4 * 48; b.y = 22 * 48; b.st = 0; }""")
            await pg.wait_for_timeout(200)
            await pg.evaluate("""() => { const b = __sw.W.beast; hurtBeast(b, 50, 'prod'); }""")
            await pg.wait_for_timeout(3500)
        else:
            await pg.evaluate("() => toInterlude(1)")
            print(' act1', await pg.evaluate(SKIP, '分頭'))
            if name == 'airlock':
                await pg.evaluate("() => { __sw.W.sys.airlock = true; __sw.W.sys.auth = true; }")
            if name == 'burn':
                await pg.evaluate("() => { const W = __sw.W; giveItem(W.crew[5], 'flamer'); giveItem(W.crew[0], 'flamer'); }")
            if name in ('abandon', 'stowaway'):
                await pg.evaluate("() => { __sw.W.sys.shuttle = true; }")
            await pg.evaluate("() => toInterlude(2)")
            pick = {'airlock': '拋出去', 'burn': '燒乾淨', 'abandon': '棄船', 'stowaway': '棄船', 'wait': '撐到天亮'}[name]
            print(' act2', await pg.evaluate(SKIP, pick))
            await pg.wait_for_timeout(600)
            await pg.screenshot(path=f'{OUT}/flow_{name}_act3.png')
            if name == 'airlock':
                await pg.evaluate("""() => { const W = __sw.W; togglePower('lights'); togglePower('airlock');
                  const b = W.beast; b.inVent = false; b.x = 15.5 * 48; b.y = 33.5 * 48; b.state = 'search'; b.st = 0;
                  const d = SHIP.door.a_in; d.state = 'closed'; d.open = 0; SHIP.dampers.D9.closed = true; openOuterDoor(W.crew[0]); }""")
                await pg.wait_for_timeout(3600)
                await pg.screenshot(path=f'{OUT}/flow_airlock_boom.png')
                await pg.wait_for_timeout(4200)
            if name == 'burn':
                await pg.evaluate("""() => { const W = __sw.W, b = W.beast; b.inVent = false; b.x = W.crew[5].x + 60; b.y = W.crew[5].y; b.state = 'search'; hurtBeast(b, 999, 'fire'); }""")
                await pg.wait_for_timeout(3500)
            if name in ('abandon', 'stowaway'):
                await pg.evaluate("""() => { const W = __sw.W; startSelfDestruct(W.crew[0]); for (const m of W.crew) { m.aboard = true; } }""")
                if name == 'stowaway':
                    await pg.evaluate("""() => { const W = __sw.W, b = W.beast; b.inVent = false; b.x = 7 * 48; b.y = 38.5 * 48; }""")
                await pg.evaluate("() => launchShuttle()")
                await pg.wait_for_timeout(2400)
                await pg.screenshot(path=f'{OUT}/flow_{name}_mid.png')
                if name == 'stowaway':
                    for k in range(3):
                        c = await pg.query_selector('.choice:not([disabled])')
                        if c: await c.click()
                        await pg.wait_for_timeout(500)
                    await pg.wait_for_timeout(1500)
            if name == 'wait':
                await pg.evaluate("() => { __sw.W.sys.rescue = 1; }")
                await pg.wait_for_timeout(3000)
        await pg.wait_for_timeout(800)
        await pg.screenshot(path=f'{OUT}/flow_{name}_result.png', full_page=False)
        res = await pg.evaluate("() => ({ mode: __sw.S.mode, end: (__sw.G.runs[0] || {}).end, money: __sw.G.money, lore: __sw.G.lore.length })")
        print(' result', res)
        print('\n'.join(errs[:20]))
        await b.close()

if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    names = ['strangle', 'airlock', 'burn', 'abandon', 'stowaway', 'wait'] if which == 'all' else [which]
    for n in names:
        asyncio.run(flow(n))
