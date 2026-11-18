#!/usr/bin/env python3
"""本機截圖檢查：自己開一個網站，外部圖片（Steam、YouTube）用假圖代替（雲端沙盒連不到），照步驟截圖。
用法：python3 shoot.py <輸出資料夾> <網站根目錄> [phone|land|desk] [步驟 JSON]
步驟：[{"go":"#home"},{"wait":800},{"shot":"home"},{"click":"css"},{"tap":"css"},{"key":"ArrowDown"},
       {"eval":"js"},{"print":"js 運算式，結果印出來"},{"scroll":1200}]
Steam 預告（.m3u8）：環境變數 UNP_HLS 指到一個本機 HLS 資料夾（master.m3u8＋stream_*/），就用它代替；
  做法：ffmpeg 產生聲音獨立一條的 fMP4 HLS（跟 Steam 一樣），見 _build/apps/unpacked/README.md「短影音測試」。
YouTube：嵌入頁換成假的播放器，會回 onReady／播放中，UNP_YT_END 秒後回「播完了」。
UNP_AUTOPLAY=1：瀏覽器不擋有聲自動播放（預設會擋，用來測「點一下開聲音」）。
"""
import http.server, io, json, os, random, socketserver, sys, threading
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

out, root = sys.argv[1], sys.argv[2]
vp = sys.argv[3] if len(sys.argv) > 3 else 'phone'
steps = json.loads(sys.argv[4]) if len(sys.argv) > 4 else [{'wait': 1500}, {'shot': 'home'}]
os.makedirs(out, exist_ok=True)
VP = {'phone': (390, 844, 3), 'phone1': (390, 844, 1), 'land': (844, 390, 3), 'desk': (1440, 900, 1),
      'se': (375, 667, 2), 'android': (412, 915, 2.625), 'pad': (820, 1180, 2)}[vp]   # phone1：整頁長截圖用；se：小手機


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


TESTVID = open(os.environ.get('UNP_TESTVID', '/tmp/unp_test.webm'), 'rb').read() if os.path.exists(os.environ.get('UNP_TESTVID', '/tmp/unp_test.webm')) else b''
HLS = os.environ.get('UNP_HLS', '/tmp/hlst')
HLS = HLS if os.path.exists(os.path.join(HLS, 'master.m3u8')) else None
YT_END = float(os.environ.get('UNP_YT_END', '6'))
FAKE_YT = """<!doctype html><html><body style="margin:0;background:#200;color:#fff;font:700 22px sans-serif;display:grid;place-items:center;height:100vh">
<div>FAKE YOUTUBE <span id=i></span></div><script>
document.getElementById('i').textContent = location.pathname.split('/').pop();
let p = null; const send = (o) => p && p.postMessage(JSON.stringify(o), '*');
addEventListener('message', (e) => { let d = {}; try { d = JSON.parse(e.data); } catch (x) {}
  if (d.event === 'listening' && !p) { p = e.source; send({event:'onReady'}); send({event:'infoDelivery',info:{playerState:1}});
    setTimeout(() => send({event:'onStateChange',info:0}), %d); }
  if (d.event === 'command') { window.top.postMessage(JSON.stringify({event:'fakeCmd',func:d.func}), '*'); } });
</script></body></html>""" % int(YT_END * 1000)
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'] if os.environ.get('UNP_AUTOPLAY') else [])
    ctx = b.new_context(viewport={'width': VP[0], 'height': VP[1]}, device_scale_factor=VP[2], has_touch=vp != 'desk', is_mobile=vp != 'desk')
    pg = ctx.new_page()
    pg.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errors.append(f'PAGEERROR: {e}'))

    def handle(route):
        u = route.request.url
        if '.webm' in u:      # 動態預告：本機用一段測試影片代替
            return route.fulfill(status=200, content_type='video/webm', body=TESTVID, headers={'Access-Control-Allow-Origin': '*'})
        if HLS and 'steamstatic.com' in u and ('.m3u8' in u or '.m4s' in u or '/init_' in u):
            path = u.split('?')[0]
            rel = 'master.m3u8' if path.endswith('_master.m3u8') else path[path.index('/stream_') + 1:] if '/stream_' in path else None
            fp = os.path.join(HLS, rel) if rel else None
            if fp and os.path.exists(fp):
                ct = 'application/vnd.apple.mpegurl' if fp.endswith('.m3u8') else 'video/mp4'
                return route.fulfill(status=200, content_type=ct, body=open(fp, 'rb').read(), headers={'Access-Control-Allow-Origin': '*'})
            return route.fulfill(status=404, body=b'')
        if 'youtube-nocookie.com/embed/' in u:
            return route.fulfill(status=200, content_type='text/html', body=FAKE_YT)
        if '.mp4' in u or '.m3u8' in u:
            return route.fulfill(status=404, body=b'')
        if 'ntfy.sh' in u:      # 點播台的轉發站：假裝送到了
            return route.fulfill(status=200, content_type='application/json', body=b'{}', headers={'Access-Control-Allow-Origin': '*'})
        if any(h in u for h in ('i.ytimg.com', 'steamstatic.com', 'images.weserv.nl', 'gmedia.playstation.com', 'nflximg.net', 'epicgames.com', 'gog-statics.com')):
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
        if 'tap' in s:
            try: pg.tap(s['tap'], timeout=4000)
            except Exception as e: errors.append(f'tap fail {s["tap"]}: {e}')
            pg.wait_for_timeout(s.get('ms', 700))
        if 'key' in s: pg.keyboard.press(s['key']); pg.wait_for_timeout(s.get('ms', 700))
        if 'print' in s:
            try: print(s.get('label', 'print'), json.dumps(pg.evaluate(s['print']), ensure_ascii=False))
            except Exception as e: errors.append(f'print fail: {e}')
        if 'scroll' in s: pg.evaluate(f"scrollTo(0,{s['scroll']})"); pg.wait_for_timeout(s.get('ms', 500))
        if 'savecanvas' in s:
            import base64 as _b
            du = pg.evaluate(f"document.querySelector({json.dumps(s['savecanvas'])}).toDataURL('image/png')")
            open(os.path.join(out, s['name'] + '.png'), 'wb').write(_b.b64decode(du.split(',', 1)[1]))
        if 'shot' in s: pg.screenshot(path=os.path.join(out, f"{vp}_{s['shot']}.png"), full_page=s.get('full', False))
    b.close()
srv.shutdown()
print('\n'.join(errors) or 'no console errors')
