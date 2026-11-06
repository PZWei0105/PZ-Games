#!/usr/bin/env python3
"""無頭瀏覽器截圖／自動試玩（差一點 SO CLOSE）

python3 tools/shot.py --page dev-models.html --out /tmp/m [--land|--desk] [--wait 3000] [--steps '[...]']
steps: {"wait":ms} {"eval":"js"} {"shot":"name"} {"tap":[x,y]} {"key":"KeyZ"} {"hold":["KeyW",ms]}
       {"drag":[x1,y1,x2,y2,ms]} {"down":[x,y]} {"move":[x,y]} {"up":1} {"log":"js expr"}
"""
import argparse, json, os, threading, http.server, socketserver, functools, time
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist')

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--page', default='index.html')
    ap.add_argument('--out', default='/tmp/shot')
    ap.add_argument('--land', action='store_true')
    ap.add_argument('--desk', action='store_true')
    ap.add_argument('--steps', default='[]')
    ap.add_argument('--port', type=int, default=8771)
    ap.add_argument('--dpr', type=float, default=2)
    ap.add_argument('--wait', type=int, default=3000)
    ap.add_argument('--w', type=int, default=0)
    ap.add_argument('--h', type=int, default=0)
    a = ap.parse_args()
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', a.port), functools.partial(Q, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    os.makedirs(a.out, exist_ok=True)
    vp = {'width': 844, 'height': 390} if a.land else {'width': 1280, 'height': 800} if a.desk else {'width': 390, 'height': 844}
    if a.w: vp = {'width': a.w, 'height': a.h}
    logs = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
                              args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'])
        ctx = b.new_context(viewport=vp, device_scale_factor=a.dpr, has_touch=not a.desk, is_mobile=not a.desk)
        pg = ctx.new_page()
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        t0 = time.time()
        pg.goto(f'http://127.0.0.1:{a.port}/{a.page}')
        pg.wait_for_timeout(a.wait)
        steps = json.loads(open(a.steps).read()) if os.path.exists(a.steps) else json.loads(a.steps)
        n = 0
        def run(st):
            nonlocal n
            for s in st:
                if 'wait' in s: pg.wait_for_timeout(s['wait'])
                elif 'eval' in s:
                    try:
                        r = pg.evaluate(s['eval'])
                        if r is not None: print('eval:', r)
                    except Exception as e: print('eval error', e)
                elif 'log' in s:
                    try: print('log:', pg.evaluate(s['log']))
                    except Exception as e: print('log error', e)
                elif 'shot' in s:
                    pg.screenshot(path=os.path.join(a.out, s['shot'] + '.png')); n += 1
                elif 'tap' in s:
                    x, y = s['tap']
                    if a.desk: pg.mouse.click(x, y)
                    else: pg.touchscreen.tap(x, y)
                elif 'key' in s: pg.keyboard.press(s['key'])
                elif 'hold' in s:
                    k, ms = s['hold']; pg.keyboard.down(k); pg.wait_for_timeout(ms); pg.keyboard.up(k)
                elif 'down' in s: pg.mouse.move(*s['down']); pg.mouse.down()
                elif 'move' in s: pg.mouse.move(*s['move'], steps=8)
                elif 'up' in s: pg.mouse.up()
                elif 'drag' in s:
                    x1, y1, x2, y2, ms = s['drag']
                    pg.mouse.move(x1, y1); pg.mouse.down()
                    k = max(2, int(ms / 16))
                    for i in range(1, k + 1):
                        pg.mouse.move(x1 + (x2 - x1) * i / k, y1 + (y2 - y1) * i / k); pg.wait_for_timeout(16)
                    pg.mouse.up()
                elif 'repeat' in s:
                    for _ in range(s['repeat']): run(s['steps'])
        run(steps)
        if n == 0: pg.screenshot(path=os.path.join(a.out, 'shot.png'))
        b.close()
    httpd.shutdown()
    print(f'done in {time.time() - t0:.1f}s')
    errs = [l for l in logs if 'error' in l.lower() or 'pageerror' in l]
    for l in logs[-25:]: print(l)
    if errs: print('ERRORS:', len(errs))

if __name__ == '__main__':
    main()
