#!/usr/bin/env python3
"""《PZ App 引擎》全套檢查：python3 tools/test_appkit.py [--guard]
1) 組開發版；2) Node 單元測試；3) 瀏覽器自我檢查（門鎖畫面、聲音合成）；4) --guard：護欄（暫存 clone 裡真的開瀏覽器驗解包）。
"""
import functools
import http.server
import pathlib
import socketserver
import subprocess
import sys
import threading

ROOT = pathlib.Path(__file__).resolve().parent.parent
bad = 0


def run(cmd):
    global bad
    print('$', ' '.join(cmd), flush=True)
    r = subprocess.run(cmd, cwd=ROOT)
    if r.returncode:
        bad += 1


run([sys.executable, 'tools/build_appkit.py'])
run(['node', 'tests/unit/kit.test.mjs'])


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Q, directory=str(ROOT)))
srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
from playwright.sync_api import sync_playwright  # noqa: E402
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/tests/browser/selftest.html')
    pg.wait_for_function('window.__result', timeout=60000)
    res = pg.evaluate('window.__result')
    for line in res + [f'FAIL 程式錯誤：{e}' for e in errs]:
        print('  ' + line, flush=True)
    if any(x.startswith('FAIL') for x in res) or errs:
        bad += 1
    b.close()
srv.shutdown()
if '--guard' in sys.argv:
    run([sys.executable, 'tests/guard_test.py', '--browser'])
print('\n全部通過' if not bad else f'\n{bad} 組沒過')
sys.exit(1 if bad else 0)
