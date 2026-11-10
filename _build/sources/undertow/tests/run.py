#!/usr/bin/env python3
"""測試：python3 tests/run.py shots | bot <區> [god] | perf"""
import asyncio, sys, json, os, time
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist/web/index.html')
OUT = os.environ.get('OUT', '/tmp/ut/shots')
os.makedirs(OUT, exist_ok=True)
BOT = open(os.path.join(ROOT, 'tests/bot.js'), encoding='utf-8').read()


async def page(pw, w=390, h=844, mobile=True):
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--autoplay-policy=no-user-gesture-required', '--no-first-run', '--disable-sync', '--disable-background-networking'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=mobile, has_touch=mobile)
    pg = await ctx.new_page()
    errs = []
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type == 'error' and 'ERR_' not in m.text and 'fonts.g' not in m.text else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERR: ' + str(e)))
    await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    await pg.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    await pg.goto(URL)
    await pg.wait_for_timeout(700)
    await pg.evaluate('() => { __ut.S.noAdapt = true; }')
    return b, pg, errs

STATE = """() => { const W = __ut.W; if (!W) return {mode: __ut.S.mode}; const p = W.P, h = W.hunter;
 return {mode: __ut.S.mode, st: W.state, t: Math.round(W.t), pr: Math.round(W.pressure), hp: Math.round(p.hp), gun: p.gun + p.gunLv + ':' + p.ammo, tool: p.tool ? p.tool + ':' + p.toolUses : '-', fl: p.flashes, hide: p.hide ? p.hide.type : '',
  foes: W.foes.filter(e=>!e.dead).map(e=>e.type[0]).join(''), kills: W.kills, bag: Math.round(W.bagVal), resc: W.obj.rescued + '/' + W.obj.survivors, esc: W.escapes, dodge: W.dodges,
  hunter: h ? h.state + (h.know > 0 ? '!' : '') : null, room: roomAt(p.x,p.y).i, dock: W.dock.called ? (W.dock.arrived ? 'arrived' : Math.round(W.dock.t)) : '-', bot: (window.__bot||{log:[]}).log.slice(-2)}; }"""


async def shots():
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.wait_for_timeout(800)
        await pg.screenshot(path=f'{OUT}/s01_title.png')
        await pg.click('#t-go'); await pg.wait_for_timeout(900)
        await pg.screenshot(path=f'{OUT}/s02_prologue.png')
        await pg.click('#st-skip'); await pg.wait_for_timeout(900)
        await pg.screenshot(path=f'{OUT}/s03_hub.png')
        await pg.click('.dive[data-i="0"]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=f'{OUT}/s04_loadout.png')
        await pg.click('#go'); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=f'{OUT}/s05_dive.png')
        for i in range(4):
            await pg.wait_for_timeout(2500)
            await pg.screenshot(path=f'{OUT}/s06_dive_{i}.png')
        print(json.dumps(await pg.evaluate(STATE), ensure_ascii=False))
        print('\n'.join(errs[:30]))
        await b.close()


async def bot(si, god, secs, every):
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.wait_for_timeout(600)
        await pg.evaluate(f"""() => {{ __ut.G.seenPrologue = true; __ut.G.sectors.forEach(s => s.unlocked = true); __ut.G.weapons = (window.__ALLW ? ['rivet','arc','harpoon','torch','drone','cryo','sonic'] : ['rivet','arc','torch']); __ut.G.lastTool = 'torch'; AU.init(); __ut.start({si}); }}""")
        await pg.wait_for_timeout(1500)
        await pg.evaluate(BOT)
        await pg.evaluate(f"__bot.opts.god = {'true' if god else 'false'}; __bot.opts.extractAt = {os.environ.get('EXTRACT', 72)}; __bot.opts.choice = '{os.environ.get('CHOICE', 'a')}'; __bot.opts.stealth = {os.environ.get('STEALTH', 'false')}; __ut.S.speed = {os.environ.get('SPEED', 1)}")
        t0 = time.time(); n = 0
        while time.time() - t0 < secs:
            await pg.wait_for_timeout(every * 1000)
            st = await pg.evaluate(STATE)
            print(json.dumps(st, ensure_ascii=False), flush=True)
            await pg.screenshot(path=f'{OUT}/bot{si}_{n:02d}.png'); n += 1
            if st.get('mode') == 'hub' or (st.get('st') == 'over'):
                await pg.wait_for_timeout(2500); await pg.screenshot(path=f'{OUT}/bot{si}_end.png'); break
        print('\n'.join(errs[:30]))
        await b.close()


async def perf():
    async with async_playwright() as pw:
        b, pg, errs = await page(pw)
        await pg.evaluate("() => { __ut.G.seenPrologue = true; __ut.start(1); }")
        await pg.wait_for_timeout(2500)
        r = await pg.evaluate("""() => new Promise(res => { const ts = []; let n = 0; const f = () => { const a = performance.now(); render(.016); ts.push(performance.now() - a); if (++n < 90) requestAnimationFrame(f); else res(ts); }; f(); })""")
        r.sort(); print('render ms median', round(r[len(r)//2], 2), 'p90', round(r[int(len(r)*.9)], 2))
        u = await pg.evaluate("""() => { const ts=[]; for (let k=0;k<120;k++){ const a=performance.now(); updateWorld(1/60); ts.push(performance.now()-a);} ts.sort((a,b)=>a-b); return [ts[60], ts[108]]; }""")
        print('update ms median/p90', [round(x, 3) for x in u])
        print('\n'.join(errs[:20]))
        await b.close()

if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'shots'
    if mode == 'shots': asyncio.run(shots())
    elif mode == 'bot': asyncio.run(bot(int(sys.argv[2]) if len(sys.argv) > 2 else 0, 'god' in sys.argv, int(os.environ.get('SECS', 120)), float(os.environ.get('EVERY', 5))))
    elif mode == 'perf': asyncio.run(perf())
