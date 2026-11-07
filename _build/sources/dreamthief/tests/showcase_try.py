#!/usr/bin/env python3
"""挑收藏庫截圖用的種子：python3 tests/showcase_try.py fight 0,1,2,3 11,22,33
                       python3 tests/showcase_try.py boss 1 5,6,7
截圖存到 /tmp/dt/show/。"""
import asyncio, sys, os, json
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist/web/index.html')
OUT = '/tmp/dt/show'
os.makedirs(OUT, exist_ok=True)
SHOW = open(os.path.join(ROOT, 'tests/showcase.js'), encoding='utf-8').read()


async def main(kind, chis, seeds, extra):
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR: ' + str(e)))
        await pg.route(lambda u: 'fonts.g' in u, lambda r: r.abort())
        await pg.goto(URL); await pg.wait_for_timeout(700)
        await pg.evaluate(SHOW)
        for chi in chis:
            for seed in seeds:
                await pg.evaluate(f"__show.save(); __show.dive({chi})")
                await pg.wait_for_timeout(1300)
                await pg.wait_for_timeout(int(extra.get('pre', 0)))
                if kind == 'stealth':
                    r = await pg.evaluate(f"__show.layer({seed}, {extra.get('depth', 1)}, {extra.get('wake', 18)}); __show.stealth({json.dumps(extra.get('so', {}))})")
                    await pg.evaluate("__show.reveal(16)")
                    times = extra.get('times', [700])
                    last = 0
                    for i, tm in enumerate(times):
                        await pg.wait_for_timeout(tm - last); last = tm
                        await pg.evaluate("__show.quiet()")
                        await pg.screenshot(path=f'{OUT}/{kind}_{chi}_{seed}_{i}.png')
                elif kind == 'bell':
                    r = await pg.evaluate(f"__show.layer({seed}, {extra.get('depth', 1)}, {extra.get('wake', 64)}); __show.bell({json.dumps(extra.get('bo', {}))})")
                    await pg.evaluate(f"__show.reveal(16); __show.horde({extra.get('horde', 3)})")
                    times = extra.get('times', [900])
                    last = 0
                    for i, tm in enumerate(times):
                        await pg.wait_for_timeout(tm - last); last = tm
                        await pg.evaluate("__show.quiet()")
                        await pg.screenshot(path=f'{OUT}/{kind}_{chi}_{seed}_{i}.png')
                elif kind == 'fight':
                    r = await pg.evaluate(f"__show.layer({seed}, {extra.get('depth', 1)}, {extra.get('wake', 34)}); __show.fight({json.dumps(extra.get('fo', {}))})")
                    await pg.wait_for_timeout(250)
                    await pg.evaluate(f"__show.loot({json.dumps(extra.get('loot', [2, 4]))}); __show.reveal(16); __show.horde({extra.get('horde', 0)})")
                    times = extra.get('times')
                    if times:
                        last = 0
                        for i, tm in enumerate(times):
                            await pg.wait_for_timeout(tm - last); last = tm
                            await pg.evaluate("__show.quiet()")
                            await pg.screenshot(path=f'{OUT}/{kind}_{chi}_{seed}_{i}.png')
                    await pg.wait_for_timeout(int(extra.get('wait', 1400)))
                    await pg.evaluate("__show.quiet()")
                else:
                    r = await pg.evaluate(f"__show.layer({seed}, 2, {extra.get('wake', 46)}); __show.boss({json.dumps(extra.get('bo', {}))}); __show.god(); __show.reveal(16)")
                    times = extra.get('times', [5200])
                    last = 0
                    for i, tm in enumerate(times):
                        await pg.wait_for_timeout(tm - last); last = tm
                        await pg.evaluate("__show.quiet()")
                        await pg.screenshot(path=f'{OUT}/{kind}_{chi}_{seed}_{i}.png')
                    r = await pg.evaluate("({r: __dt.W.boss && __dt.W.boss.act, tele: __dt.W.tele.length, eb: __dt.W.ebul.length})")
                print(kind, chi, seed, r)
                await pg.screenshot(path=f'{OUT}/{kind}_{chi}_{seed}.png')
        print('\n'.join(errs[:10]))
        await b.close()

if __name__ == '__main__':
    kind = sys.argv[1]
    chis = [int(x) for x in sys.argv[2].split(',')]
    seeds = [int(x) for x in sys.argv[3].split(',')]
    extra = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
    asyncio.run(main(kind, chis, seeds, extra))
