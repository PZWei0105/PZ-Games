#!/usr/bin/env python3
"""Headless screenshot + scripted play harness for 長明.

usage: python3 tools/shot.py --out /tmp/s.png [--land] [--steps '[...]'] [--url index.html#x]
steps: {"wait":ms} {"eval":"js"} {"shot":"name"} {"tap":[x,y]} {"key":"KeyZ"} {"hold":["KeyW",ms]}
"""
import argparse, json, os, sys, threading, http.server, socketserver, functools, time
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist')

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

def serve(port):
    h = functools.partial(Q, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', port), h)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='/tmp/shot')
    ap.add_argument('--land', action='store_true')
    ap.add_argument('--desk', action='store_true')
    ap.add_argument('--steps', default='[]')
    ap.add_argument('--url', default='index.html')
    ap.add_argument('--port', type=int, default=8765)
    ap.add_argument('--dpr', type=float, default=2)
    ap.add_argument('--wait', type=int, default=2500)
    a = ap.parse_args()
    httpd = serve(a.port)
    os.makedirs(a.out, exist_ok=True)
    if a.land:
        vp = {'width': 844, 'height': 390}
    elif a.desk:
        vp = {'width': 1280, 'height': 800}
    else:
        vp = {'width': 390, 'height': 844}
    logs = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
                              args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
                                    '--enable-webgl', '--autoplay-policy=no-user-gesture-required'])
        ctx = b.new_context(viewport=vp, device_scale_factor=a.dpr, has_touch=not a.desk, is_mobile=not a.desk)
        pg = ctx.new_page()
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        pg.goto(f'http://127.0.0.1:{a.port}/{a.url}')
        pg.wait_for_timeout(a.wait)
        steps = json.loads(a.steps)
        n = 0
        for s in steps:
            if 'wait' in s:
                pg.wait_for_timeout(s['wait'])
            elif 'eval' in s:
                try:
                    r = pg.evaluate(s['eval'])
                    if r is not None:
                        logs.append(f'[eval] {json.dumps(r, ensure_ascii=False)[:2000]}')
                except Exception as e:
                    logs.append(f'[evalerr] {e}')
            elif 'shot' in s:
                pg.screenshot(path=os.path.join(a.out, s['shot'] + '.png'))
                n += 1
            elif 'tap' in s:
                pg.touchscreen.tap(s['tap'][0], s['tap'][1]) if not a.desk else pg.mouse.click(s['tap'][0], s['tap'][1])
            elif 'click' in s:
                pg.click(s['click'])
            elif 'key' in s:
                pg.keyboard.press(s['key'])
            elif 'hold' in s:
                pg.keyboard.down(s['hold'][0]); pg.wait_for_timeout(s['hold'][1]); pg.keyboard.up(s['hold'][0])
        if n == 0:
            pg.screenshot(path=os.path.join(a.out, 'shot.png'), full_page=True)
        b.close()
    httpd.shutdown()
    print('\n'.join(logs[-80:]))

if __name__ == '__main__':
    main()
