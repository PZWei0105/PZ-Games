#!/usr/bin/env python3
"""搖桿、鍵盤、跟上我、屏息的測試：python3 tests/joy.py"""
import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run import page, OUT
from flows import PRE
from playwright.async_api import async_playwright

POS = "() => { const m = __sw.W.crew[%d]; return [+(m.x/48).toFixed(2), +(m.y/48).toFixed(2), m.room, m.moving, !!m.driveRun]; }"


async def drag(pg, x0, y0, x1, y1, hold_ms, steps=8):
    await pg.mouse.move(x0, y0); await pg.mouse.down()
    for k in range(1, steps + 1):
        await pg.mouse.move(x0 + (x1 - x0) * k / steps, y0 + (y1 - y0) * k / steps); await pg.wait_for_timeout(16)
    await pg.wait_for_timeout(hold_ms)
    shot = None
    await pg.mouse.up()


async def main():
    ok = True
    async with async_playwright() as pw:
        b, pg, errs = await page(pw, mobile=False)
        print('start', await pg.evaluate(PRE))
        await pg.evaluate("() => { __sw.S.set.hints = false; __sw.selectCrew(0); __sw.S.slowT = 0; }")
        await pg.wait_for_timeout(300)
        p0 = await pg.evaluate(POS % 0)
        # 1) 搖桿往右推一秒（走）
        await pg.mouse.move(110, 520); await pg.mouse.down()
        for k in range(1, 7): await pg.mouse.move(110 + k * 6, 520); await pg.wait_for_timeout(16)
        vis = await pg.evaluate("() => !document.querySelector('#joy').classList.contains('hide')")
        await pg.wait_for_timeout(900)
        await pg.screenshot(path=f'{OUT}/joy_walk.png')
        p1 = await pg.evaluate(POS % 0)
        await pg.mouse.up()
        print('walk right', p0, '->', p1, 'joy shown', vis)
        if not (vis and p1[0] > p0[0] + .4 and abs(p1[1] - p0[1]) < .3): ok = False; print('  !! walk failed')
        # 2) 推到底往下跑到牆（艦橋下緣 y=5，門 d_bridge 在 x 7~9）：撞牆不能穿過
        await pg.evaluate("() => { const m = __sw.W.crew[0]; m.x = 5.5 * 48; m.y = 3.5 * 48; }")
        await pg.mouse.move(110, 520); await pg.mouse.down()
        for k in range(1, 9): await pg.mouse.move(110, 520 + k * 9); await pg.wait_for_timeout(16)
        await pg.wait_for_timeout(1500)
        p2 = await pg.evaluate(POS % 0)
        await pg.mouse.up()
        print('run into wall', p2)
        if not (p2[1] < 5.0 and p2[2] == 0): ok = False; print('  !! wall collision failed')
        # 3) 撞向關著的門：艦長室 d_capt（x 8|9, y 6）
        await pg.evaluate("() => { const W = __sw.W; for (const m of W.crew) m.follow = -1; const m = W.crew[0]; m.x = 8.3 * 48; m.y = 6.5 * 48; const d = SHIP.door.d_capt; d.state = 'closed'; d.open = 0; }")
        await pg.mouse.move(110, 520); await pg.mouse.down()
        for k in range(1, 7): await pg.mouse.move(110 + k * 6, 520); await pg.wait_for_timeout(16)
        await pg.wait_for_timeout(1600)
        p3 = await pg.evaluate(POS % 0)
        dst = await pg.evaluate("() => SHIP.door.d_capt.state")
        await pg.mouse.up()
        print('push door', p3, 'door', dst)
        if not (dst == 'open' and p3[0] > 9.1): ok = False; print('  !! door push failed')
        # 4) 鍵盤 WASD
        await pg.evaluate("() => { const m = __sw.W.crew[0]; m.x = 8 * 48; m.y = 9 * 48; }")
        await pg.keyboard.down('KeyS'); await pg.wait_for_timeout(700); await pg.keyboard.up('KeyS')
        p4 = await pg.evaluate(POS % 0)
        print('keyboard S', p4)
        if not (p4[1] > 9.4): ok = False; print('  !! keyboard failed')
        # 5) 叫大家跟上
        await pg.evaluate("""() => { const W = __sw.W; const L = W.crew[0]; L.x = 8 * 48; L.y = 15 * 48;
           const others = [1, 2]; for (const i of others) { const o = W.crew[i]; cancelTask(o); o.hidden && unhide(o); o.x = (7.4 + i * .3) * 48; o.y = 16.2 * 48; o.path = null; o.stance = 'hold'; }
           __sw.selectCrew(0); }""")
        await pg.wait_for_timeout(300)
        btn = await pg.evaluate("() => [...document.querySelectorAll('#actbar .abtn')].map(b => b.textContent)")
        print('actbar', btn)
        await pg.evaluate("() => { callFollow(__sw.W.crew[0]); }")
        await pg.keyboard.down('KeyS'); await pg.wait_for_timeout(2600); await pg.keyboard.up('KeyS')
        await pg.wait_for_timeout(1500)
        f = await pg.evaluate("() => __sw.W.crew.slice(0, 4).map(m => [m.id, +(m.x/48).toFixed(1), +(m.y/48).toFixed(1), m.follow])")
        print('follow', f)
        L = f[0]
        for o in f[1:3]:
            if not (o[3] == 0 and abs(o[1] - L[1]) + abs(o[2] - L[2]) < 3.2): ok = False; print('  !! follower lagging', o)
        await pg.screenshot(path=f'{OUT}/joy_follow.png')
        # 6) 屏息：鄧伯躲在冷藏庫，牠來查
        async def breath_case(hold):
            await pg.evaluate("""(hold) => { const W = __sw.W; startAct(1); W.phase = 'play'; W.dir.cool = 99;
               W.crew.forEach((m, i) => { m.follow = -1; m.path = null; if (i !== 2) { cancelTask(m); if (m.hidden) unhide(m); m.x = (5 + i) * 48; m.y = 2.5 * 48; m.stance = 'hold'; } });
               const deng = W.crew[2]; cancelTask(deng); const h = SHIP.hides.find(x => x.name === '冷藏庫'); if (deng.hidden) unhide(deng); hide(deng, h); deng.bpm = 110; deng.breath = 1;
               const b = W.beast; b.inVent = false; b.state = 'search'; b.searchT = 99; b.x = 3 * 48; b.y = 18.6 * 48; b.target = null;
               for (const s of b.seg) { s.x = b.x - 20; s.y = b.y; }
               goCheck(b, h, true, false); W.breathHeld = false; }""", hold)
            await pg.wait_for_timeout(1400)
            vis = await pg.evaluate("() => !document.querySelector('#breath').classList.contains('hide')")
            if hold:
                await pg.evaluate("() => { __sw.W.breathHeld = true; }")
                await pg.wait_for_timeout(500)
                await pg.screenshot(path=f'{OUT}/joy_breath.png')
            await pg.wait_for_timeout(4200)
            r = await pg.evaluate("() => { const W = __sw.W, b = W.beast, d = W.crew[2]; return { st: b.state, hidden: !!d.hidden, holds: W.stats.holds, grabbed: d.grabbed, breath: +d.breath.toFixed(2), gasp: d.gaspT > 0 }; }")
            await pg.evaluate("() => { __sw.W.breathHeld = false; }")
            return vis, r
        v1, r1 = await breath_case(True)
        print('breath held: button', v1, r1)
        if not (v1 and r1['hidden'] and r1['holds'] >= 1): ok = False; print('  !! breath hold failed')
        v2, r2 = await breath_case(False)
        print('no breath:', r2)
        if r2['hidden']: ok = False; print('  !! should have been found')
        print('\n'.join(errs[:20]))
        await b.close()
    print('ALL OK' if ok else 'FAILED')

asyncio.run(main())
