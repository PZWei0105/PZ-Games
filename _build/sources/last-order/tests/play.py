#!/usr/bin/env python3
"""《最後一單》引擎版：在 Chromium 裡實際玩一段，截圖、列出錯誤。
用法：python3 tests/play.py [phone|land|desk] [輸出資料夾]"""
import sys, os
sys.path.insert(0, '/home/claude/pz-games/_build/engine/tools')
from shot import serve
from playwright.sync_api import sync_playwright
mode = sys.argv[1] if len(sys.argv) > 1 else 'phone'
out = sys.argv[2] if len(sys.argv) > 2 else '/tmp/lo'
os.makedirs(out, exist_ok=True)
VP = {'phone': (390, 844, True), 'land': (844, 390, True), 'desk': (1280, 720, False)}[mode]
httpd = serve('/home/claude/pz-games')
url = f'http://127.0.0.1:{httpd.server_address[1]}/_build/sources/last-order/dist/web/index.html'
logs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': VP[0], 'height': VP[1]}, device_scale_factor=2, has_touch=VP[2], is_mobile=VP[2])
    pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(url); pg.wait_for_timeout(2000)
    pg.screenshot(path=f'{out}/1_title.png')
    pg.click('#bStart'); pg.wait_for_timeout(1200)
    pg.screenshot(path=f'{out}/2_story.png')
    pg.click('#stSkip'); pg.wait_for_timeout(2500)
    st = pg.evaluate('() => ({ screen: App.screen, state: G && G.state, vw: VC.w, vh: VC.h, sc: VC.sc, renderer: PZ.gfx.kind })')
    print('進遊戲：', st)
    pg.keyboard.down('KeyD'); pg.wait_for_timeout(900); pg.keyboard.up('KeyD')
    pg.wait_for_timeout(1500)
    pg.screenshot(path=f'{out}/3_play.png')
    pg.evaluate("() => { const p = G.p; for (let i = 0; i < 6; i++) spawnZombie('walker', { force: true, pos: [p.x + 40 + i * 6, p.y + (i - 3) * 8] }); }")
    pg.wait_for_timeout(1200)
    pg.evaluate("() => explodeAt(G.p.x + 50, G.p.y - 10, 34, 80, 0, 'test')")
    pg.wait_for_timeout(120)
    pg.screenshot(path=f'{out}/4_boom.png')
    pg.wait_for_timeout(1500)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{out}/5_pause.png')
    pg.click('#pSound'); pg.wait_for_timeout(600)
    pg.screenshot(path=f'{out}/6_settings.png')
    st = pg.evaluate('() => ({ screen: App.screen, state: G && G.state, kills: G && G.kills, errors: PZ.debug.errors.map(e => e.msg) , save: Save.store.loadedFrom })')
    print('結束：', st)
    b.close()
bad = [l for l in logs if 'GL Driver' not in l and 'GPU stall' not in l and 'fonts.g' not in l and 'ERR_' not in l]
for l in bad[:30]: print(l)
