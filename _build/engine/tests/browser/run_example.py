#!/usr/bin/env python3
"""說明書的最小範例（examples/hello）要真的能玩：開起來、走得動、打得到、沒有錯誤。"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
from shot import serve
from playwright.sync_api import sync_playwright
httpd = serve('/home/claude/pz-games')
url = f'http://127.0.0.1:{httpd.server_address[1]}/_build/engine/examples/hello/dist/web/index.html'
res, logs = [], []
def ok(name, cond, info=''):
    res.append(bool(cond)); print(('  ✓ ' if cond else '  ✗ ') + name + ('' if cond else f'  ({info})'))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 900, 'height': 600})
    pg.on('console', lambda m: logs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: logs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(1500)
    ok('進到 play 場景', pg.evaluate('PZ.scenes.name') == 'play')
    x0 = pg.evaluate('PZ.scenes.cur.p.x')
    pg.keyboard.down('KeyD'); pg.wait_for_timeout(600); pg.keyboard.up('KeyD')
    ok('D 鍵往右走', pg.evaluate('PZ.scenes.cur.p.x') > x0 + 30, pg.evaluate('PZ.scenes.cur.p.x'))
    pg.evaluate("() => { const s = PZ.scenes.cur; s.foes.push({ x: s.p.x + 30, y: s.p.y, hp: 1 }); }")
    pg.keyboard.press('Space'); pg.wait_for_timeout(300)
    ok('空白鍵打倒史萊姆', pg.evaluate('PZ.scenes.cur.kills') >= 1, pg.evaluate('PZ.scenes.cur.kills'))
    pg.screenshot(path='/tmp/hello.png')
    ok('沒有錯誤', not logs and not pg.evaluate('PZ.debug.errors.length'), logs)
    b.close()
print('  範例檢查：%d/%d 通過' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
