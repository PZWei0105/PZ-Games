#!/usr/bin/env python3
"""耳目一新 RESKIN — 跟拍量測（開發工具，不在 check.py 裡：全部 Skin 量一次要好幾分鐘）

每套 Skin 播一段歌，用 CDP screencast 抓瀏覽器真正合成出來的畫面，把每格的亮度和「跟上一格差多少」照真實的拍子相位
（拍長已知）折疊成 8 格。會跟拍的 Skin，拍上和拍間的差距很明顯；各做各的就幾乎是平的。

  python3 lockmeter.py [網站資料夾] [標籤] [skin,skin|-] [歌檔 拍長秒 起秒 迄秒]
  python3 lockmeter.py                                     # apps/reskin 的示範曲（120 BPM，拍長 0.5 秒）、全部 Skin
  python3 lockmeter.py /tmp/old old - /tmp/pop.mp3 0.6 10 18.5   # 舊版、自己的測試曲（100 BPM）

結果印出來，也存成 /tmp/lock-<標籤>.json，可以跟另一個版本比。SwiftShader 下 WebGL 的畫面會晚幾格，峰值位置不準，只看差距。
"""
import functools, http.server, socketserver, threading, sys, os, io, base64, json
import numpy as np
from playwright.sync_api import sync_playwright
from PIL import Image
root = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'apps', 'reskin'))
label = sys.argv[2] if len(sys.argv) > 2 else 'new'
only = sys.argv[3].split(',') if len(sys.argv) > 3 and sys.argv[3] != '-' else None
song = sys.argv[4] if len(sys.argv) > 4 else None          # a music file to use instead of the demo
period = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5  # its true beat length in seconds (beats at k * period)
t0s, t1s = (float(sys.argv[6]), float(sys.argv[7])) if len(sys.argv) > 7 else (9.3, 15.8)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Q, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = 'http://127.0.0.1:%d/' % srv.server_address[1]
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True, service_workers='block')
    pg = ctx.new_page(); ev = pg.evaluate
    pg.goto(url); pg.wait_for_function("!!window.RESKIN && !document.getElementById('splash')", timeout=30000)
    if song:
        pg.set_input_files('#fileIn', [song])
        pg.wait_for_function('RESKIN.lib.count() === 1 && RESKIN.analysis.left() === 0', timeout=120000)
        ev('() => { const t = RESKIN.lib.all()[0]; RESKIN.player.playFrom([t.id], t.id, {type: "library"}); }'); pg.wait_for_timeout(800)
    else:
        pg.click('#empty [data-act="demo"]')
        pg.wait_for_function('RESKIN.lib.count() === 1 && RESKIN.analysis.left() === 0', timeout=90000)
    ev('() => { const s = RESKIN.settings; if (s) { s.set("tilt", false); } }')
    cdp = ctx.new_cdp_session(pg)
    frames = []
    def on_frame(e):
        frames.append((e['metadata']['timestamp'], e['data']))
        try: cdp.send('Page.screencastFrameAck', {'sessionId': e['sessionId']})
        except Exception: pass
    cdp.on('Page.screencastFrame', on_frame)
    skins = only or ev('RESKIN.skins.list().map(s => s.id)')
    for sk in skins:
        ev('(s) => RESKIN.stage.show(s, {instant: true, silent: true})', sk)
        ev('RESKIN.player.play()'); pg.wait_for_timeout(300); ev('(t) => RESKIN.player.seek(t)', t0s - 0.3); pg.wait_for_timeout(1800)
        frames.clear()
        ev('() => { window.__map = []; window.__mi = setInterval(() => window.__map.push([Date.now() / 1000, RESKIN.player.time()]), 40); }')
        cdp.send('Page.startScreencast', {'format': 'jpeg', 'quality': 60, 'maxWidth': 130, 'maxHeight': 280, 'everyNthFrame': 1})
        pg.wait_for_timeout(7000)
        cdp.send('Page.stopScreencast')
        mp = np.array(ev('() => { clearInterval(window.__mi); return window.__map; }'))
        ev('RESKIN.player.pause()')
        if len(frames) < 20 or len(mp) < 20: print(sk, 'too few frames', len(frames)); continue
        ts = np.array([f[0] for f in frames])
        st = np.interp(ts, mp[:, 0], mp[:, 1])
        imgs = [np.asarray(Image.open(io.BytesIO(base64.b64decode(f[1]))).convert('L'), dtype=np.float32) for f in frames]
        h = min(i.shape[0] for i in imgs); w = min(i.shape[1] for i in imgs)
        imgs = np.stack([i[:h, :w] for i in imgs])
        lum = imgs.mean(axis=(1, 2))
        mot = np.concatenate([[0], np.abs(np.diff(imgs, axis=0)).mean(axis=(1, 2))])
        ok = (st > t0s) & (st < t1s)
        ph = np.mod(st, period) / period
        nb = 8; bins = np.minimum(nb - 1, (ph * nb).astype(int))
        def fold(x):
            m = np.array([x[ok & (bins == k)].mean() if np.any(ok & (bins == k)) else np.nan for k in range(nb)])
            return m
        L, M = fold(lum), fold(mot)
        swingL = (np.nanmax(L) - np.nanmin(L)) / max(1e-6, np.nanmean(L)) * 100
        swingM = (np.nanmax(M) - np.nanmin(M)) / max(1e-6, np.nanmean(M)) * 100
        peakL = int(np.nanargmax(L))
        res[sk] = {'frames': int(ok.sum()), 'lumSwing%': round(float(swingL), 1), 'lumPeakBin': peakL, 'motionSwing%': round(float(swingM), 1), 'lum': [round(float(v), 1) for v in L]}
        print('%-10s frames %3d  brightness swing %5.1f%% (peak bin %d of 8)  motion swing %5.1f%%' % (sk, ok.sum(), swingL, peakL, swingM))
    b.close()
json.dump(res, open('/tmp/lock-%s.json' % label, 'w'), indent=1)
