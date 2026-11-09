#!/usr/bin/env python3
"""測試：python3 tests/run.py shots | sim [秒] | perf"""
import asyncio, sys, json, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist/web/index.html')
OUT = os.environ.get('OUT', '/tmp/sw/shots')
os.makedirs(OUT, exist_ok=True)


async def page(pw, w=390, h=844, mobile=True):
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--autoplay-policy=no-user-gesture-required', '--no-first-run'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=mobile, has_touch=mobile)
    pg = await ctx.new_page()
    errs = []
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type == 'error' and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERR: ' + str(e)))
    await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    await pg.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    await pg.goto(URL)
    await pg.wait_for_timeout(2200)
    await pg.evaluate('() => { __sw.S.noAdapt = true; }')
    return b, pg, errs

STATE = """() => { const W = __sw.W; if (!W) return {mode: __sw.S.mode}; const b = W.beast;
 return {t: Math.round(W.t), act: W.act, phase: W.phase, beast: b ? (b.state + (b.inVent?'@vent':'') + ' hp' + Math.round(b.hp) + ' st' + b.stage) : null,
  crew: W.crew.map(m => m.id + ':' + (m.dead ? 'X' : Math.round(m.bpm) + 'h' + m.hp + (m.task ? '/' + m.task.type : '') + (m.hidden ? '/H' : ''))).join(' '),
  parts: W.parts, objs: W.objs.length, over: W.over}; }"""


async def shots():
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        await pg.screenshot(path=f'{OUT}/01_title.png')
        await pg.click('#t-go'); await pg.wait_for_timeout(700)
        await pg.screenshot(path=f'{OUT}/02_prologue.png')
        for i in range(5):
            await pg.mouse.click(200, 300); await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(800)
        await pg.screenshot(path=f'{OUT}/03_start.png')
        await pg.evaluate('() => __sw.selectCrew(1)')
        await pg.wait_for_timeout(600)
        await pg.screenshot(path=f'{OUT}/04_select.png')
        await pg.wait_for_timeout(9000)
        await pg.screenshot(path=f'{OUT}/05_t10.png')
        print(json.dumps(await pg.evaluate(STATE), ensure_ascii=False))
        print('\n'.join(errs[:30]))
        await b.close()


async def sim(secs):
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        await pg.evaluate("() => { localStorage.clear(); }")
        await pg.click('#t-go'); await pg.wait_for_timeout(500)
        for i in range(6):
            await pg.mouse.click(200, 300); await pg.wait_for_timeout(150)
        await pg.evaluate(f"() => {{ __sw.S.speed = {os.environ.get('SPEED', 4)}; }}")
        step = 10
        for k in range(int(secs / step)):
            await pg.wait_for_timeout(int(step * 1000 / float(os.environ.get('SPEED', 4))))
            st = await pg.evaluate(STATE)
            print(json.dumps(st, ensure_ascii=False))
            ph = st.get('phase')
            if ph == 'scene':
                # 幕間：點完台詞、選第一個能選的
                for i in range(12):
                    await pg.mouse.click(200, 200); await pg.wait_for_timeout(120)
                    c = await pg.query_selector('.choice:not([disabled])')
                    if c:
                        await c.click(); break
            if st.get('mode') == 'result' or ph == 'over':
                break
        await pg.screenshot(path=f'{OUT}/sim_end.png')
        print('\n'.join(errs[:40]))
        await b.close()


async def perf():
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        await pg.click('#t-go'); await pg.wait_for_timeout(500)
        for i in range(6):
            await pg.mouse.click(200, 300); await pg.wait_for_timeout(150)
        await pg.wait_for_timeout(3000)
        r = await pg.evaluate("""() => { const t0 = performance.now(); for (let i = 0; i < 60; i++) __sw.render(.016); const t1 = performance.now(); for (let i = 0; i < 120; i++) __sw.worldTick(1/60); const t2 = performance.now(); return {render: ((t1-t0)/60).toFixed(2), tick: ((t2-t1)/120).toFixed(2)}; }""")
        print(r)
        print('\n'.join(errs[:20]))
        await b.close()

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'shots'
    if cmd == 'shots': asyncio.run(shots())
    elif cmd == 'sim': asyncio.run(sim(float(sys.argv[2]) if len(sys.argv) > 2 else 120))
    elif cmd == 'perf': asyncio.run(perf())


async def botrun(secs):
    BOT = open(os.path.join(ROOT, 'tests/bot.js'), encoding='utf-8').read()
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        await pg.evaluate("() => { localStorage.clear(); }")
        await pg.click('#t-go'); await pg.wait_for_timeout(400)
        for i in range(6):
            await pg.mouse.click(200, 300); await pg.wait_for_timeout(120)
        await pg.evaluate(BOT)
        sp = float(os.environ.get('SPEED', 4))
        await pg.evaluate(f"() => {{ __sw.S.speed = {sp}; }}")
        for k in range(int(secs / 10)):
            await pg.wait_for_timeout(int(10000 / sp))
            st = await pg.evaluate(STATE)
            lg = await pg.evaluate("() => __bot.log.splice(0)")
            print(json.dumps(st, ensure_ascii=False), lg)
            if st.get('phase') == 'scene':
                pick = '拋出去' if st.get('act') == 1 else '分頭'
                for i in range(14):
                    c = await pg.query_selector_all('.choice:not([disabled])')
                    if c:
                        tgt = None
                        for e in c:
                            if pick in (await e.inner_text()): tgt = e
                        await (tgt or c[0]).click(); break
                    await pg.mouse.click(200, 200); await pg.wait_for_timeout(120)
            if st.get('mode') == 'result' or st.get('phase') == 'over':
                break
        res = await pg.evaluate("() => ({ mode: __sw.S.mode, end: (__sw.G.runs[0] || {}).end, chron: (__sw.G.runs[0] || {}).chron })")
        print(json.dumps(res, ensure_ascii=False, indent=0))
        await pg.screenshot(path=f'{OUT}/bot_end.png')
        print('\n'.join(errs[:30]))
        await b.close()

if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] == 'bot':
    asyncio.run(botrun(float(sys.argv[2]) if len(sys.argv) > 2 else 1200))
