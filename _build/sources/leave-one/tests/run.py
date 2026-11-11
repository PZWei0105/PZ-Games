#!/usr/bin/env python3
"""瀏覽器測試：python3 tests/run.py shots [land|desk|phone]
截圖放 /tmp/lo/"""
import sys, os, json, time, asyncio
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = 'file://' + os.path.join(ROOT, 'dist', 'artifact', 'index.html')
OUT = '/tmp/lo'
VP = {'land': (844, 390, 2), 'desk': (1440, 900, 1), 'phone': (390, 844, 2), 'tab': (1180, 820, 2)}
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']


async def open_page(pw, vp):
    w, h, d = VP[vp]
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=d, has_touch=vp != 'desk')
    pg = await ctx.new_page()
    errs = []
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    await pg.goto(HTML)
    await pg.wait_for_timeout(1500)
    return b, pg, errs


async def shots(vp='land'):
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as pw:
        b, pg, errs = await open_page(pw, vp)
        await pg.screenshot(path=f'{OUT}/{vp}_01_title.png')
        await pg.evaluate('__lo.start()')
        await pg.wait_for_timeout(2600)
        await pg.screenshot(path=f'{OUT}/{vp}_02_start.png')
        # 瞄準猛獁
        r = await pg.evaluate("(()=>{const b=__lo.findAim('spear',0,true); if(b){__lo.aimAt('spear',b.a,b.p);} return b&&b.r;})()")
        await pg.wait_for_timeout(400)
        await pg.screenshot(path=f'{OUT}/{vp}_03_aim.png')
        await pg.evaluate('__lo.throwNow()')
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=f'{OUT}/{vp}_04_flight.png')
        await pg.wait_for_timeout(1600)
        await pg.screenshot(path=f'{OUT}/{vp}_05_charge.png')
        await pg.wait_for_timeout(1800)
        # 火牆
        r2 = await pg.evaluate("(()=>{const W=__lo.W; const b=__lo.findAim('fire',W.mam.x-230,false); if(b){__lo.aimAt('fire',b.a,b.p);} return [W.mam.x, W.mam.state, b&&b.r];})()")
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/{vp}_06_aimfire.png')
        await pg.evaluate('__lo.throwNow()')
        await pg.wait_for_timeout(1800)
        await pg.screenshot(path=f'{OUT}/{vp}_07_fire.png')
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'{OUT}/{vp}_08_after.png')
        st = await pg.evaluate("(()=>{const W=__lo.W;return {phase:__lo.S.phase, m:[Math.round(W.mam.x),W.mam.state,Math.round(W.mam.hp)], wind:W.wind.now, tools:W.tools}})()")
        print('aim', r, 'fire', r2, 'state', st)
        print('\n'.join(errs[:20]) or 'no console errors')
        await b.close()


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'shots'
    vp = sys.argv[2] if len(sys.argv) > 2 else 'land'
    if cmd == 'shots':
        asyncio.run(shots(vp))


async def wait_phase(pg, phases, timeout=30):
    t0 = time.time()
    while time.time() - t0 < timeout:
        ph = await pg.evaluate('__lo.S.phase')
        if ph in phases:
            return ph
        await pg.wait_for_timeout(100)
    return None


async def flow(kind='ice', vp='land'):
    """自動玩一整場：ice＝順風火攻趕上冰；bleed＝扎矛放血＋火牆"""
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as pw:
        b, pg, errs = await open_page(pw, vp)
        await pg.evaluate('__lo.start()')
        await pg.wait_for_timeout(2600)
        shot_sink = False
        for turn in range(16):
            ph = await wait_phase(pg, ['aim', 'end', 'dying'], 40)
            if ph != 'aim':
                break
            act = await pg.evaluate("""((kind)=>{
              const W=__lo.W, m=W.mam; const burning=W.grass.some(s=>s.st===1);
              if (kind==='ice') {
                if (W.tools.fire>0 && W.wind.now>0 && !burning) { const b=__lo.findAim('fire', m.x-180, false); if (b) { __lo.aimAt('fire', b.a, b.p); return 'fire'; } }
                return 'wait';
              } else {
                const between = W.flames.some(fx => fx < m.x && fx > W.hunter.x + 150);
                if (m.state==='charge' && !between && W.tools.fire>0) { const b=__lo.findAim('fire', m.x-230, false); if (b) { __lo.aimAt('fire', b.a, b.p); return 'fire'; } }
                if (W.tools.spear>0 && (m.state!=='charge' || between)) { const b=__lo.findAim('spear', 0, true); if (b && b.r.zone!=='tusk') { __lo.aimAt('spear', b.a, b.p); return 'spear'; } }
                return 'wait';
              }
            })('""" + kind + "')")
            await pg.wait_for_timeout(350)
            if act != 'wait':
                if turn < 2:
                    await pg.screenshot(path=f'{OUT}/{vp}_{kind}_aim{turn}.png')
                await pg.evaluate('__lo.throwNow()')
            else:
                await pg.evaluate('__lo.wait()')
            # 在世界回合裡看有沒有掉進冰湖
            for _ in range(60):
                st = await pg.evaluate('[__lo.S.phase, __lo.W.mam.state, __lo.W.mam.sinkT]')
                if st[1] == 'sink' and not shot_sink and st[2] > 0.25:
                    await pg.screenshot(path=f'{OUT}/{vp}_{kind}_sink.png'); shot_sink = True
                if st[0] in ('aim', 'end'):
                    break
                await pg.wait_for_timeout(120)
            if turn in (1, 3):
                await pg.screenshot(path=f'{OUT}/{vp}_{kind}_t{turn}.png')
        await wait_phase(pg, ['end'], 20)
        await pg.wait_for_timeout(3200)
        await pg.screenshot(path=f'{OUT}/{vp}_{kind}_end.png')
        res = await pg.evaluate("(()=>{const W=__lo.W;return {over:W.over, stats:W.stats, harvest:W.harvest(), m:[Math.round(W.mam.x),W.mam.state,W.mam.how]}})()")
        print(kind, json.dumps(res, ensure_ascii=False))
        print('\n'.join(e for e in errs if 'GPU stall' not in e)[:2000] or 'no console errors')
        await b.close()

if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] == 'flow':
    asyncio.run(flow(sys.argv[2] if len(sys.argv) > 2 else 'ice', sys.argv[3] if len(sys.argv) > 3 else 'land'))


async def perf(vp='land'):
    """量每一格 JS 花多少時間（模擬＋畫顏料層；不含 GPU）"""
    async with async_playwright() as pw:
        b, pg, errs = await open_page(pw, vp)
        await pg.evaluate('__lo.start()')
        await pg.wait_for_timeout(2600)
        # 點一把火，讓畫面最忙
        await pg.evaluate("(()=>{const W=__lo.W; const b=__lo.findAim('fire', W.mam.x-150, false); __lo.aimAt('fire', b.a, b.p); __lo.throwNow();})()")
        await pg.wait_for_timeout(2500)
        r = await pg.evaluate("""(()=>{
          const W=__lo.W; const t=[]; const t2=[];
          for (let i=0;i<120;i++){ const a=performance.now(); W.step(1/60); W.anim(1/60); FX.update(1/60, W, {x0:0,x1:1500,y0:0,y1:900}); const b=performance.now(); render(); const c=performance.now(); t.push(b-a); t2.push(c-b); }
          t.sort((x,y)=>x-y); t2.sort((x,y)=>x-y);
          return {sim_med:t[60].toFixed(2), sim_p95:t[114].toFixed(2), render_med:t2[60].toFixed(2), render_p95:t2[114].toFixed(2), canvas:[CV.width, CV.height], burning: W.grass.filter(s=>s.st===1).length, embers: FX.emb.length};
        })()""")
        print(vp, r)
        await b.close()

if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] == 'perf':
    asyncio.run(perf(sys.argv[2] if len(sys.argv) > 2 else 'land'))
