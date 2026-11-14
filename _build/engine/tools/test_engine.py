#!/usr/bin/env python3
"""引擎的完整檢查：單元測試（Node）＋瀏覽器自我檢查（Chromium）＋真的點擊與觸控＋雲端存檔情境＋說明書範例＋效能量測。

用法：python3 tools/test_engine.py [--perf] [--webkit] [--quick]
  --perf    另外量 3000 個貼圖＋3000 粒子時 JS 每格花幾毫秒
  --webkit  另外用 WebKitGTK（iPhone Safari 的引擎）跑一次自我檢查（需要 xvfb、gir1.2-webkit2-4.1，見 tools/webkit_check.py）
  --quick   只跑單元測試＋自我檢查（改小地方時）
有任何一項失敗就以非 0 結束。
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from shot import serve  # noqa: E402

CHROME_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']


def unit():
    files = sorted(os.path.join(ROOT, 'tests', 'unit', f) for f in os.listdir(os.path.join(ROOT, 'tests', 'unit')) if f.endswith('.test.mjs'))
    r = subprocess.run(['node', '--test'] + files, capture_output=True, text=True)
    out = r.stdout
    passed = sum(1 for l in out.splitlines() if l.startswith('# pass'))
    for l in out.splitlines():
        if l.startswith('not ok') or l.startswith('# pass') or l.startswith('# fail'):
            print('  ' + l)
    return r.returncode == 0


def browser(perf=False):
    from playwright.sync_api import sync_playwright
    httpd = serve('/home/claude/pz-games')
    url = f'http://127.0.0.1:{httpd.server_address[1]}/_build/engine/tests/browser/selftest.html'
    good = True
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=CHROME_ARGS)
        pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        pg.goto(url)
        res = pg.evaluate('window.__selftest()')
        for r in res:
            mark = '✓' if r['ok'] else '✗'
            if not r['ok']:
                good = False
            print(f'  {mark} {r["name"]}' + (f'  ({r["info"]})' if (not r['ok'] and r['info']) else ''))
        n_ok = sum(1 for r in res if r['ok'])
        print(f'  瀏覽器自我檢查：{n_ok}/{len(res)} 通過')
        bad = [l for l in logs if 'GPU stall' not in l and 'favicon' not in l and 'GL Driver' not in l]
        if bad:
            print('  主控台訊息：')
            for l in bad[:20]:
                print('    ' + l)
        if perf:
            pg2 = b.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
            pg2.goto(url)
            for n, m in [(1000, 1000), (3000, 3000)]:
                r = pg2.evaluate(f'window.__perf({n}, {m})')
                print(f'  效能 {n} 貼圖 + {m} 粒子：每格 {r["ms"]} ms（含軟體 GPU）｜JS 更新 {r["upd"]} ms、繪圖 {r["ren"]} ms｜{r["quads"]} 方塊 {r["draws"]} 批')
        b.close()
    return good


def script(label, args):
    """跑另一支檢查程式，印出它的結果行"""
    print(label)
    r = subprocess.run([sys.executable] + args, capture_output=True, text=True, cwd=ROOT)
    for l in (r.stdout or '').splitlines():
        if l.strip().startswith(('✓', '✗')) and '✓' in l: continue  # 通過的項目不逐條印
        if l.strip(): print('  ' + l.strip() if not l.startswith('  ') else l)
    if r.returncode != 0 and r.stderr: print('  ' + r.stderr.strip().splitlines()[-1])
    return r.returncode == 0


def main():
    perf = '--perf' in sys.argv
    subprocess.run([sys.executable, os.path.join(HERE, 'build_engine.py')], check=True)
    print('單元測試')
    u = unit()
    print('瀏覽器（Chromium）')
    br = browser(perf)
    ok = u and br
    if '--quick' not in sys.argv:
        ok = script('真的點擊與觸控（Chromium）', [os.path.join('tests', 'browser', 'run_interact.py')]) and ok
        ok = script('雲端存檔情境（假的 Claude db）', [os.path.join('tests', 'browser', 'run_cloud.py')]) and ok
        subprocess.run([sys.executable, os.path.join(HERE, 'pzbuild.py'), os.path.join(ROOT, 'examples', 'hello'), '--dev'], check=True, capture_output=True)
        ok = script('說明書的最小範例（examples/hello）', [os.path.join('tests', 'browser', 'run_example.py')]) and ok
    if '--webkit' in sys.argv:
        ok = script('WebKit（iPhone Safari 的引擎）', [os.path.join(HERE, 'webkit_check.py'), 'selftest']) and ok
    if not ok:
        sys.exit('有檢查沒過')
    print('全部通過')


if __name__ == '__main__':
    main()
