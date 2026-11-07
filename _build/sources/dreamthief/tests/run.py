#!/usr/bin/env python3
"""測試：python3 tests/run.py shots | bot <章> [god] | perf"""
import asyncio, sys, json, os, time
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist/web/index.html')
OUT = '/tmp/dt/shots'
os.makedirs(OUT, exist_ok=True)
BOT = open(os.path.join(ROOT, 'tests/bot.js'), encoding='utf-8').read()

async def page(pw, w=390, h=844):
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--autoplay-policy=no-user-gesture-required', '--no-first-run', '--disable-sync', '--disable-background-networking'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = await ctx.new_page()
    errs = []
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type == 'error' and 'ERR_FILE_NOT_FOUND' not in m.text else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERR: ' + str(e)))
    await pg.goto(URL); await pg.wait_for_timeout(800)
    return b, pg, errs

async def bot(chi, god, secs, shots_every):
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        await pg.evaluate('localStorage.clear()')
        await pg.evaluate(f"""() => {{ G = newG(); G.money = 99999; G.chapters.forEach(c => c.unlocked = true); G.loadout.candies = 3; G.candyStock = 9; saveGame(); S.mode='hub'; UI.startDive({chi}); }}""")
        await pg.wait_for_timeout(1200)
        await pg.evaluate(BOT)
        await pg.evaluate(f"__bot.opts.god = {'true' if god else 'false'}")
        t0 = time.time(); n = 0; last = None
        while time.time() - t0 < secs:
            await pg.wait_for_timeout(shots_every * 1000)
            st = await pg.evaluate("""() => { const W = __dt.W, S = __dt.S; if (!W) return {mode: S.mode}; const p = W.players[0]; return {mode: S.mode, t: Math.round(W.t), depth: W.depth, wake: Math.round(W.wake), hp: Math.round(p.hp), lvl: p.lvl, bag: p.bag.length, used: bagUsed(p), foes: W.foes.filter(e=>!e.dead).length, alert: W.foes.filter(e=>!e.dead&&e.state==='alert').length, kills: W.stats.kills, ass: W.stats.assassins, out: W.out, boss: W.boss ? Math.round(W.boss.hp) + (W.boss.awake?'A':'') : null, coll: Math.round(W.collapse), opened: W.m.containers.filter(c=>c.open).length + '/' + W.m.containers.length, botlog: __bot.log.slice(-2)}; }""")
            print(json.dumps(st, ensure_ascii=False))
            await pg.screenshot(path=f'{OUT}/bot_{chi}_{n:02d}.png'); n += 1
            if st.get('mode') in ('hub', 'result') and st.get('out', True):
                await pg.wait_for_timeout(1500); await pg.screenshot(path=f'{OUT}/bot_{chi}_end.png'); break
        print('\n'.join(errs[:20]))
        await b.close()

async def perf():
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        await pg.evaluate("() => { G = newG(); S.mode='hub'; UI.startDive(0); }")
        await pg.wait_for_timeout(1500)
        r = await pg.evaluate("""() => new Promise(res => { const ts = []; let n = 0; const f = () => { const a = performance.now(); renderDive(.016); ts.push(performance.now() - a); if (++n < 60) requestAnimationFrame(f); else res(ts); }; f(); })""")
        r.sort(); print('render ms median', r[len(r)//2], 'p90', r[int(len(r)*.9)])
        print('\n'.join(errs[:20]))
        await b.close()

async def boss(chi, secs):
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        await pg.evaluate('localStorage.clear()')
        await pg.evaluate(f"""() => {{ G = newG(); G.chapters.forEach(c => c.unlocked = true); saveGame(); S.mode='hub'; UI.startDive({chi}); }}""")
        await pg.wait_for_timeout(1200)
        await pg.evaluate("() => { __dt.depth(2); }")
        await pg.wait_for_timeout(1500)
        await pg.evaluate("() => { __dt.lvl(14); __dt.god(); __dt.toBoss(); }")
        await pg.evaluate(BOT)
        await pg.evaluate("__bot.opts.god = true; __bot.opts.bossOnly = true; __bot.mode = 'boss'")
        for n in range(int(secs / 3)):
            await pg.wait_for_timeout(3000)
            st = await pg.evaluate("() => { const W = __dt.W; if (!W) return {mode: __dt.S.mode}; const b = W.boss; return {mode: __dt.S.mode, t: Math.round(W.t), boss: b ? Math.round(b.hp) + '/' + Math.round(b.hpMax) + (b.awake ? ' awake ' : ' ') + (b.act || '') + ' p' + b.phase : null, dead: W.bossDead, tele: W.tele.length, ebul: W.ebul.length, foes: W.foes.filter(e=>!e.dead).length, out: W.out, qing: !!W.qing}; }")
            print(json.dumps(st, ensure_ascii=False))
            await pg.screenshot(path=f'{OUT}/boss_{chi}_{n:02d}.png')
            if st.get('mode') != 'dive': break
        print('\n'.join(errs[:20]))
        await b.close()

if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'bot'
    if mode == 'bot': asyncio.run(bot(int(sys.argv[2]) if len(sys.argv) > 2 else 0, 'god' in sys.argv, int(os.environ.get('SECS', 150)), float(os.environ.get('EVERY', 6))))
    elif mode == 'perf': asyncio.run(perf())
    elif mode == 'boss': asyncio.run(boss(int(sys.argv[2]) if len(sys.argv) > 2 else 0, int(os.environ.get('SECS', 30))))
