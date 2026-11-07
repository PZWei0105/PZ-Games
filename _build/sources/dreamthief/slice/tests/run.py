#!/usr/bin/env python3
"""試玩關測試：python3 tests/run.py shots | bot [speed] [secs] [god] | land | perf"""
import asyncio, sys, json, os, time, re
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist/index.html')
OUT = '/tmp/sv/shots'
os.makedirs(OUT, exist_ok=True)
BOT = open(os.path.join(ROOT, 'tests/bot.js'), encoding='utf-8').read()

async def page(pw, w=390, h=844, mobile=True, dpr=2):
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--autoplay-policy=no-user-gesture-required', '--no-first-run', '--disable-sync', '--disable-background-networking'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr, is_mobile=mobile, has_touch=mobile)
    await ctx.route(re.compile(r'^https://fonts\.(googleapis|gstatic)\.com/.*'), lambda r: r.abort())
    pg = await ctx.new_page()
    errs = []
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type == 'error' and 'ERR_' not in m.text else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERR: ' + str(e)))
    await pg.goto(URL); await pg.wait_for_timeout(700)
    return b, pg, errs

STATE = """() => { const W = __sv.W, S = __sv.S; if (!W) return {mode: S.mode}; const p = W.players[0];
  return {mode: S.mode, t: Math.round(W.t), f: p.f, x: Math.round(p.x), hp: Math.round(p.hp), wake: Math.round(W.wake), lvl: W.lvl, wave: W.wave.n + W.wave.state[0], foes: W.foes.filter(e=>!e.dead).length,
    kills: W.stats.kills, coins: W.coins, keys: W.keys, parts: W.parts, bag: bagUsed() + '/' + W.cap, pocket: W.pocket ? W.pocket.n : null, xpL: W.xpLvl,
    tools: Object.values(W.tools).map(t => t.id + t.lv).join(','), spots: W.L.spots.filter(s=>s.done).length + '/' + W.L.spots.length,
    surv: W.survivors.map(v => v.state[0]).join(''), boss: W.boss ? Math.round(W.boss.hp) : (W.bossDead ? 'dead' : null), ex: W.extract ? Math.ceil(W.extract.t) : null, out: W.out,
    log: window.__bot ? __bot.log.slice(-3) : null}; }"""

async def shots():
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        await pg.screenshot(path=f'{OUT}/s00_title.png')
        await pg.mouse.click(195, 600); await pg.wait_for_timeout(500)
        await pg.screenshot(path=f'{OUT}/s01_menu.png')
        await pg.evaluate("__sv.start()"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'{OUT}/s02_start.png')
        await pg.evaluate("__sv.step(14)"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/s03_wave1.png')
        await pg.evaluate("__sv.step(6, {mx: 0, my: 0})"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/s04_wave1b.png')
        # 搜索
        await pg.evaluate("__sv.tp(0, 330); __sv.step(1.2, {mx:0,my:0})"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/s05_search.png')
        # 樓梯間
        await pg.evaluate("__sv.tp(0, 80); __sv.step(.3, {mx:0,my:0})"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/s06_stair.png')
        await pg.evaluate("__sv.step(.5, {mx:0,my:-1})"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/s07_climb.png')
        # 7F
        await pg.evaluate("__sv.tp(1, 600); __sv.step(1, {mx:0,my:0})"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/s08_7f.png')
        # 13F
        await pg.evaluate("__sv.tp(2, 300); __sv.step(1, {mx:0,my:0})"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/s09_13f.png')
        # 天台
        await pg.evaluate("__sv.tp(3, 700); __sv.step(1, {mx:0,my:0})"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/s10_roof.png')
        # 心魔
        await pg.evaluate("__sv.W.wake = 99.9; __sv.step(1.5, {mx:0,my:0})"); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f'{OUT}/s11_boss.png')
        await pg.evaluate("__sv.W.players[0].hp = 999; __sv.step(3, {mx:0,my:0})"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/s12_boss2.png')
        print(json.dumps(await pg.evaluate(STATE), ensure_ascii=False))
        print('\n'.join(errs[:20]))
        await b.close()

async def bot(speed, secs, god):
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        await pg.evaluate("__sv.start()"); await pg.wait_for_timeout(800)
        await pg.evaluate(BOT)
        await pg.evaluate(f"window.__speed = {speed}; __bot.opts.god = {'true' if god else 'false'}")
        t0 = time.time(); n = 0
        while time.time() - t0 < secs:
            await pg.wait_for_timeout(4000)
            st = await pg.evaluate(STATE)
            print(json.dumps(st, ensure_ascii=False), flush=True)
            await pg.screenshot(path=f'{OUT}/bot_{n:02d}.png'); n += 1
            if st.get('mode') == 'result':
                await pg.wait_for_timeout(1200); await pg.screenshot(path=f'{OUT}/bot_end.png', full_page=False); break
        print('\n'.join(errs[:30]))
        print('\n'.join(await pg.evaluate("__bot.log.slice(-40)")))
        await b.close()

async def land():
    async with async_playwright() as pw:
        b, pg, errs = await page(pw, 844, 390)
        await pg.screenshot(path=f'{OUT}/l00_title.png')
        await pg.evaluate("__sv.start()"); await pg.wait_for_timeout(1200)
        await pg.evaluate("__sv.step(16, {mx: 0, my: 0})"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/l01_wave.png')
        await pg.evaluate("__sv.tp(1, 700); __sv.step(1, {mx:0,my:0})"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/l02_7f.png')
        print('\n'.join(errs[:20]))
        await b.close()
    async with async_playwright() as pw:
        b, pg, errs = await page(pw, 1440, 900, False, 1)
        await pg.screenshot(path=f'{OUT}/d00_title.png')
        await pg.evaluate("__sv.start()"); await pg.wait_for_timeout(1200)
        await pg.evaluate("__sv.step(16, {mx: 0, my: 0})"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/d01_wave.png')
        print('\n'.join(errs[:20]))
        await b.close()

async def perf():
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        await pg.evaluate("__sv.start()"); await pg.wait_for_timeout(1000)
        await pg.evaluate("__sv.step(20, {mx:0,my:0})")
        r = await pg.evaluate("""() => new Promise(res => { const ts = []; let n = 0; const f = () => { const a = performance.now(); svRender(.016); ts.push(performance.now() - a); if (++n < 90) requestAnimationFrame(f); else res(ts); }; f(); })""")
        r.sort(); print('render ms median', round(r[len(r)//2], 2), 'p90', round(r[int(len(r)*.9)], 2), 'foes', await pg.evaluate("__sv.W.foes.length"))
        print('\n'.join(errs[:20]))
        await b.close()

if __name__ == '__main__':
    a = sys.argv[1:] or ['shots']
    if a[0] == 'shots': asyncio.run(shots())
    elif a[0] == 'bot': asyncio.run(bot(int(a[1]) if len(a) > 1 else 3, int(a[2]) if len(a) > 2 else 120, len(a) > 3 and a[3] == 'god'))
    elif a[0] == 'land': asyncio.run(land())
    elif a[0] == 'perf': asyncio.run(perf())
