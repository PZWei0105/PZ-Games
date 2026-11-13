"""用 Playwright 開全知、照步驟操作、截圖（本機測試用）。
用法：python3 shoot.py <網址> <輸出資料夾> <寬> <高> '[{"wait":7000,"shot":"a"},{"eval":"RP.seek(0.5,true)"},{"sh":"指令"}]'
"""
import sys, json, time, subprocess, os
from playwright.sync_api import sync_playwright
url = sys.argv[1]; out = sys.argv[2]; w = int(sys.argv[3]); h = int(sys.argv[4]); steps = json.loads(sys.argv[5])
os.makedirs(out, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.goto(url)
    for s in steps:
        if 'wait' in s: pg.wait_for_timeout(s['wait'])
        if 'shot' in s: pg.screenshot(path=f"{out}/{s['shot']}.png")
        if 'eval' in s: print('EVAL', s['eval'][:60], '->', pg.evaluate(s['eval']))
        if 'click' in s: pg.click(s['click'])
        if 'key' in s: pg.keyboard.press(s['key'])
        if 'sh' in s: print(subprocess.run(s['sh'], shell=True, capture_output=True, text=True).stdout.strip())
    print('\n'.join(l for l in logs if not l.startswith('debug'))[:4000])
    b.close()
