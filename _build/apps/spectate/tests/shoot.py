#!/usr/bin/env python3
"""觀戰 SPECTATE — 本機截圖與流程檢查（雲端沙盒連不到 YouTube：縮圖換成色塊、播放器換成假的）

  python3 _build/apps/spectate/tests/shoot.py --data /tmp/spsrv/_data --out /tmp/spshots [--only phone]

--data 是一份轉播資料（feed.json、games.json、discover.json、status.json，可再放 me.json）。
會在 /tmp/spsrv 開一個本機網站：apps/spectate → repo 裡組好的網頁版。
"""
import argparse, functools, http.server, io, json, os, socketserver, sys, threading, hashlib

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..'))

FAKE_YT = r"""
(function(){
  function P(id, opts){
    var el = document.getElementById(id);
    var d = document.createElement('div');
    d.id = id; d.className = 'fake-yt';
    d.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;color:#fff;font:800 22px sans-serif;letter-spacing:2px;background:linear-gradient(135deg,#2a1830,#14304a)';
    d.textContent = '▶ ' + opts.videoId;
    el.replaceWith(d);
    this._d = d; this._o = opts; this._s = -1; this._t = 0; var self = this;
    setTimeout(function(){ opts.events.onReady && opts.events.onReady({target:self}); self._set(1); }, 250);
    window.__yt = this;
  }
  P.prototype._set = function(s){ this._s = s; var f = this._o.events.onStateChange; if (f) f({data:s, target:this}); };
  P.prototype.playVideo = function(){ this._set(1); };
  P.prototype.pauseVideo = function(){ this._set(2); };
  P.prototype.stopVideo = function(){ this._s = 5; };
  P.prototype.loadVideoById = function(o){ this._d.textContent = '▶ ' + (o.videoId || o); this._t = 0; var s = this; setTimeout(function(){ s._set(1); }, 120); };
  P.prototype.getPlayerState = function(){ return this._s; };
  P.prototype.getCurrentTime = function(){ return this._t += 5; };
  P.prototype.getDuration = function(){ return 300; };
  P.prototype.loadModule = function(){}; P.prototype.getOption = function(){ return []; }; P.prototype.setOption = function(){};
  P.prototype.end = function(){ this._set(0); };
  window.YT = { Player: P, PlayerState: { ENDED:0, PLAYING:1, PAUSED:2 } };
  setTimeout(function(){ window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(); }, 30);
})();
"""


def placeholder(key, w, h, kind='thumb'):
    from PIL import Image, ImageDraw
    hsh = int(hashlib.md5(key.encode()).hexdigest()[:8], 16)
    import colorsys
    hue = (hsh % 360) / 360
    c1 = tuple(int(x * 255) for x in colorsys.hsv_to_rgb(hue, .55, .55))
    c2 = tuple(int(x * 255) for x in colorsys.hsv_to_rgb((hue + .12) % 1, .7, .22))
    im = Image.new('RGB', (w, h), c2)
    d = ImageDraw.Draw(im)
    for i in range(0, w + h, max(8, w // 16)):
        d.line([(i, 0), (i - h, h)], fill=c1, width=max(2, w // 60))
    if kind == 'thumb':
        d.rectangle([w * .08, h * .62, w * .7, h * .82], fill=(245, 245, 250))
        d.rectangle([w * .08, h * .62, w * .08 + w * .62 * ((hsh % 70 + 30) / 100), h * .82], fill=c1)
        d.ellipse([w * .72, h * .18, w * .92, h * .18 + w * .2], fill=(255, 255, 255))
    b = io.BytesIO()
    im.save(b, 'JPEG', quality=70)
    return b.getvalue()


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve(root, port):
    socketserver.TCPServer.allow_reuse_address = True
    h = functools.partial(Quiet, directory=root)
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', port), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--out', default='/tmp/spshots')
    ap.add_argument('--only', default='')
    ap.add_argument('--port', type=int, default=8765)
    a = ap.parse_args()
    root = '/tmp/spsrv'
    os.makedirs(os.path.join(root, 'apps'), exist_ok=True)
    link = os.path.join(root, 'apps', 'spectate')
    if not os.path.islink(link):
        os.symlink(os.path.join(REPO, 'apps', 'spectate'), link)
    dlink = os.path.join(root, '_data')
    if os.path.abspath(a.data) != dlink:
        if os.path.islink(dlink):
            os.remove(dlink)
        if not os.path.exists(dlink):
            os.symlink(os.path.abspath(a.data), dlink)
    srv = serve(root, a.port)
    os.makedirs(a.out, exist_ok=True)
    from playwright.sync_api import sync_playwright
    base = 'http://127.0.0.1:%d/apps/spectate/index.html?data=/_data/&main=/_data/' % a.port
    errors = []

    def route(r):
        u = r.request.url
        if '127.0.0.1' in u:
            return r.continue_()
        if 'i.ytimg.com' in u:
            vid = u.split('/vi/')[1].split('/')[0]
            big = 'maxres' in u or 'hqdefault' in u
            return r.fulfill(status=200, body=placeholder(vid, 640 if big else 320, 360 if big else 180), content_type='image/jpeg')
        if 'googleusercontent' in u or 'ggpht' in u:
            return r.fulfill(status=200, body=placeholder(u, 88, 88, 'av'), content_type='image/jpeg')
        if 'steamstatic' in u:
            return r.fulfill(status=200, body=placeholder(u, 460, 215), content_type='image/jpeg')
        if 'youtube.com/iframe_api' in u:
            return r.fulfill(status=200, body=FAKE_YT, content_type='text/javascript')
        if 'ntfy.sh' in u:
            return r.fulfill(status=200, body='{}', content_type='application/json')
        return r.abort()

    shots = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        views = {'phone': dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True),
                 'land': dict(viewport={'width': 844, 'height': 390}, device_scale_factor=2, is_mobile=True, has_touch=True),
                 'desk': dict(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)}
        for name, opt in views.items():
            if a.only and name not in a.only.split(','):
                continue
            ctx = b.new_context(**opt)
            ctx.route('**/*', route)
            pg = ctx.new_page()
            pg.on('console', lambda m, n=name: errors.append('%s console %s: %s' % (n, m.type, m.text)) if m.type in ('error', 'warning') else None)
            pg.on('pageerror', lambda e, n=name: errors.append('%s pageerror: %s' % (n, e)))

            def shot(tag, full=False):
                path = os.path.join(a.out, '%s-%s.png' % (name, tag))
                pg.screenshot(path=path, full_page=full)
                shots.append(path)

            def go(h, wait=900):
                pg.evaluate("h => { location.hash = h; }", h)
                pg.wait_for_timeout(wait)

            # 開場（只在手機拍）
            if name == 'phone':
                pg.goto(base)
                pg.wait_for_timeout(1200)
                shot('00-gate')
                pg.click('#gateBtn')
                pg.wait_for_timeout(700)
                shot('01-count')
                pg.wait_for_timeout(2200)
                shot('02-onair')
                pg.wait_for_timeout(1800)
                shot('03-home')
            else:
                pg.goto(base + '&skip=1')
                pg.wait_for_timeout(1800)
                shot('03-home')
            pg.mouse.wheel(0, 900 if name != 'land' else 500)
            pg.wait_for_timeout(700)
            shot('04-home-scroll')
            pg.evaluate('scrollTo(0,0)')
            for tag, h in (('05-live', 'live'), ('06-games', 'games'), ('08-rookies', 'rookies'), ('09-me', 'me'), ('10-pick', 'pick'), ('11-trailers', 'list/trailer'), ('12-key', 'key')):
                go(h)
                shot(tag)
            go('games')
            first = pg.evaluate("() => { const a = document.querySelector('.gt'); return a ? a.getAttribute('href') : null }")
            if first:
                go(first.lstrip('#'))
                shot('07-game')
            # 導播台
            go('home')
            pg.evaluate('scrollTo(0,0)')
            pg.wait_for_timeout(500)
            pg.click('.hero .go-btn')
            pg.wait_for_timeout(1500)
            shot('13-player')
            pg.evaluate("() => window.__yt && window.__yt.end()")
            pg.wait_for_timeout(900)
            shot('14-player-next')
            pg.click('.nx-go')
            pg.wait_for_timeout(1200)
            shot('15-player-take')
            pg.click('#pgmClose')
            pg.wait_for_timeout(700)
            # 搜尋
            pg.click('#btnSearch')
            pg.wait_for_timeout(400)
            pg.fill('#srQ', 'Monster' if False else 'GTA')
            pg.wait_for_timeout(700)
            shot('16-search')
            ctx.close()
        b.close()
    srv.shutdown()
    print('\n'.join(shots))
    print('--- console ---')
    print('\n'.join(errors) if errors else '（沒有錯誤）')


if __name__ == '__main__':
    main()
