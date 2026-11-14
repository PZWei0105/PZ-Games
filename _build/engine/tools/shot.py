#!/usr/bin/env python3
"""用 Chromium 打開一頁、等幾秒、截圖並列出主控台錯誤。
用法：python3 tools/shot.py <檔案或網址> <輸出.png> [寬] [高] [等待毫秒] [dpr]
"""
import sys, os, json, http.server, threading, socketserver, functools
from playwright.sync_api import sync_playwright

def serve(root):
    class Q(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k): super().__init__(*a, directory=root, **k)
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Q)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

def main():
    target, out = sys.argv[1], sys.argv[2]
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 390
    h = int(sys.argv[4]) if len(sys.argv) > 4 else 844
    wait = int(sys.argv[5]) if len(sys.argv) > 5 else 2500
    dpr = float(sys.argv[6]) if len(sys.argv) > 6 else 2
    root = '/home/claude/pz-games'
    httpd = serve(root)
    url = target if target.startswith('http') else f'http://127.0.0.1:{httpd.server_address[1]}/' + os.path.relpath(os.path.abspath(target), root)
    logs = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
        pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=dpr, has_touch=True, is_mobile=w < 600)
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        pg.goto(url)
        pg.wait_for_timeout(wait)
        pg.screenshot(path=out)
        st = pg.evaluate('window.__pz ? JSON.stringify(window.__pz.state()) : "no __pz"')
        print('state', st)
        b.close()
    for l in logs: print(l)

if __name__ == '__main__':
    main()
