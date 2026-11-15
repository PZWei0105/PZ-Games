#!/usr/bin/env python3
"""本機截圖檢查：自己開一個網站，外部圖片（Steam、YouTube）用假圖代替（雲端沙盒連不到），照步驟截圖。
用法：python3 shoot.py <輸出資料夾> <網站根目錄> [phone|land|desk] [步驟 JSON]
步驟：[{"go":"#home"},{"wait":800},{"shot":"home"},{"click":"css"},{"eval":"js"},{"scroll":1200}]
"""
import http.server, io, json, os, random, socketserver, sys, threading
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

out, root = sys.argv[1], sys.argv[2]
vp = sys.argv[3] if len(sys.argv) > 3 else 'phone'
steps = json.loads(sys.argv[4]) if len(sys.argv) > 4 else [{'wait': 1500}, {'shot': 'home'}]
os.makedirs(out, exist_ok=True)
VP = {'phone': (390, 844, 3), 'land': (844, 390, 3), 'desk': (1440, 900, 1)}[vp]


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=root, **k)

    def log_message(self, *a):
        pass


srv = socketserver.TCPServer(('127.0.0.1', 0), H)
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()


def fake_img(seed, w=1280, h=720):
    r = random.Random(seed)
    im = Image.new('RGB', (w, h), (r.randint(20, 90), r.randint(20, 90), r.randint(40, 120)))
    d = ImageDraw.Draw(im)
    for _ in range(40):
        x, y = r.randint(0, w), r.randint(0, h); s = r.randint(20, 200)
        d.ellipse([x, y, x + s, y + s], fill=(r.randint(60, 255), r.randint(40, 200), r.randint(40, 220)))
    d.rectangle([0, h * 0.7, w, h], fill=(20, 20, 30))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=70); return b.getvalue()


errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': VP[0], 'height': VP[1]}, device_scale_factor=VP[2], has_touch=vp != 'desk', is_mobile=vp != 'desk')
    pg = ctx.new_page()
    pg.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errors.append(f'PAGEERROR: {e}'))

    def handle(route):
        u = route.request.url
        if 'i.ytimg.com' in u or 'steamstatic.com' in u or 'images.weserv.nl' in u:
            if u.endswith('.m3u8'):
                return route.abort()
            return route.fulfill(status=200, content_type='image/jpeg', body=fake_img(u), headers={'Access-Control-Allow-Origin': '*'})
        if '127.0.0.1' in u:
            return route.continue_()
        return route.abort()
    pg.route('**/*', handle)
    pg.goto(f'http://127.0.0.1:{port}/index.html?enter=1')
    for s in steps:
        if 'wait' in s: pg.wait_for_timeout(s['wait'])
        if 'go' in s: pg.evaluate(f"location.hash={json.dumps(s['go'])}"); pg.wait_for_timeout(s.get('ms', 1400))
        if 'click' in s:
            try: pg.click(s['click'], timeout=4000)
            except Exception as e: errors.append(f'click fail {s["click"]}: {e}')
            pg.wait_for_timeout(s.get('ms', 700))
        if 'eval' in s:
            try: pg.evaluate(s['eval'])
            except Exception as e: errors.append(f'eval fail: {e}')
            pg.wait_for_timeout(s.get('ms', 400))
        if 'scroll' in s: pg.evaluate(f"scrollTo(0,{s['scroll']})"); pg.wait_for_timeout(s.get('ms', 500))
        if 'savecanvas' in s:
            import base64 as _b
            du = pg.evaluate(f"document.querySelector({json.dumps(s['savecanvas'])}).toDataURL('image/png')")
            open(os.path.join(out, s['name'] + '.png'), 'wb').write(_b.b64decode(du.split(',', 1)[1]))
        if 'shot' in s: pg.screenshot(path=os.path.join(out, f"{vp}_{s['shot']}.png"), full_page=s.get('full', False))
    b.close()
srv.shutdown()
print('\n'.join(errors) or 'no console errors')
