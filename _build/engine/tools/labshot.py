#!/usr/bin/env python3
"""樣品館截圖：python3 tools/labshot.py <場景> <輸出.png> [寬 高] [--steps JS]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shot import serve
from playwright.sync_api import sync_playwright
scene, out = sys.argv[1], sys.argv[2]
w = int(sys.argv[3]) if len(sys.argv) > 3 else 390
h = int(sys.argv[4]) if len(sys.argv) > 4 else 844
js = sys.argv[5] if len(sys.argv) > 5 else ''
httpd = serve('/home/claude/pz-games')
url = f'http://127.0.0.1:{httpd.server_address[1]}/_build/engine/lab/dist/web/index.html'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, has_touch=w < 700, is_mobile=w < 700)
    pg = ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(url); pg.wait_for_timeout(1800)
    if scene != 'hub':
        pg.evaluate(f"() => {{ PZ.go('{scene}', null, {{ type: 'none' }}); }}"); pg.wait_for_timeout(1200)
    if js: pg.evaluate(f"() => {{ {js} }}")
    pg.wait_for_timeout(int(os.environ.get('WAIT', '700')))
    pg.screenshot(path=out)
    print(pg.evaluate('JSON.stringify(__pz.state())'))
    b.close()
for l in logs:
    if 'GL Driver' not in l and 'GPU stall' not in l: print(l)
