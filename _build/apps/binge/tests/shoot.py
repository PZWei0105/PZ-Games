#!/usr/bin/env python3
"""補番 BINGE — 本機截圖與流程檢查（雲端沙盒連不到 YouTube：縮圖換成色塊、播放器換成假的）

  python3 _build/apps/binge/tests/shoot.py --data /tmp/bdata --out /tmp/bshots [--only phone,land,desk] [--sky night]

--data 是一份片庫（catalog.json，可再放 me.json）；拿真資料：
  gh api "repos/PZWei0105/PZ-Games/contents/catalog.json?ref=binge-data" -H "Accept: application/vnd.github.raw" > /tmp/bdata/catalog.json
會在 /tmp/bgsrv 開一個本機網站：apps/binge → repo 裡組好的網頁版。
"""
import argparse, colorsys, functools, hashlib, http.server, io, json, os, socketserver, threading

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..'))

FAKE_YT = r"""
(function(){
  function P(id, opts){
    var el = document.getElementById(id);
    var d = document.createElement('div');
    d.id = id; d.className = 'fake-yt';
    d.style.cssText = (id === 'ytp' ? '' : 'position:absolute;inset:0;') + 'display:grid;place-items:center;color:#fff;font:800 20px sans-serif;letter-spacing:2px;background:linear-gradient(135deg,#3a1d5c,#13405e)';
    d.textContent = '▶ ' + opts.videoId;
    el.replaceWith(d);
    this._d = d; this._o = opts; this._s = -1; this._t = (opts.playerVars && opts.playerVars.start) || 0; var self = this;
    setTimeout(function(){ opts.events.onReady && opts.events.onReady({target:self}); self._set(1); }, 900);
    window.__yt = window.__yt || this; if (id === 'swp') window.__swp = this; else window.__yt = this;
  }
  P.prototype._set = function(s){ this._s = s; var f = this._o.events.onStateChange; if (f) f({data:s, target:this}); };
  P.prototype.playVideo = function(){ this._set(1); };
  P.prototype.pauseVideo = function(){ this._set(2); };
  P.prototype.stopVideo = function(){ this._s = 5; };
  P.prototype.loadVideoById = function(o){ this._d.textContent = '▶ ' + (o.videoId || o); this._t = (o && o.startSeconds) || 0; var s = this; setTimeout(function(){ s._set(1); }, 700); };
  P.prototype.getPlayerState = function(){ return this._s; };
  P.prototype.getCurrentTime = function(){ if (this._s === 1) this._t += 1; return this._t; };
  P.prototype.getDuration = function(){ return window.__dur || 9000; };
  P.prototype.seekTo = function(s){ this._t = s; };
  P.prototype.getVolume = function(){ return 100; }; P.prototype.setVolume = function(){};
  P.prototype.setPlaybackRate = function(){};
  P.prototype.getIframe = function(){ return this._d; };
  P.prototype.loadModule = function(){}; P.prototype.getOption = function(){ return []; }; P.prototype.setOption = function(){};
  P.prototype.end = function(){ this._set(0); };
  window.YT = { Player: P, PlayerState: { ENDED:0, PLAYING:1, PAUSED:2 } };
  setTimeout(function(){ window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(); }, 30);
})();
"""


GLYPH_JS = r"""() => {
  const out = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const el = n.parentElement;
    if (!el || !n.nodeValue.trim()) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (!getComputedStyle(el).fontFamily.includes('BingeD')) continue;
    for (const ch of n.nodeValue) out.add(ch);
  }
  return [...out];
}"""


def placeholder(key, w, h, kind='thumb'):
    """動畫感的假縮圖：漸層天空＋人物剪影色塊＋標題字卡。"""
    from PIL import Image, ImageDraw
    hsh = int(hashlib.md5(key.encode()).hexdigest()[:8], 16)
    hue = (hsh % 360) / 360
    c1 = tuple(int(x * 255) for x in colorsys.hsv_to_rgb(hue, .55, .95))
    c2 = tuple(int(x * 255) for x in colorsys.hsv_to_rgb((hue + .5) % 1, .65, .45))
    im = Image.new('RGB', (w, h), c2)
    d = ImageDraw.Draw(im)
    for y in range(h):
        k = y / h
        d.line([(0, y), (w, y)], fill=tuple(int(c1[i] * (1 - k) + c2[i] * k) for i in range(3)))
    if kind == 'thumb':
        cx = w * (0.3 + (hsh % 40) / 100)
        d.ellipse([cx - h * .18, h * .18, cx + h * .18, h * .54], fill=(255, 226, 205), outline=(30, 20, 40), width=max(2, w // 120))
        d.polygon([(cx - h * .34, h), (cx - h * .22, h * .56), (cx + h * .22, h * .56), (cx + h * .34, h)], fill=c2, outline=(30, 20, 40))
        d.pieslice([cx - h * .2, h * .12, cx + h * .2, h * .44], 180, 360, fill=tuple(int(x * 255) for x in colorsys.hsv_to_rgb((hue + .8) % 1, .7, .35)))
        d.rectangle([w * .56, h * .62, w * .95, h * .86], fill=(255, 210, 63), outline=(23, 17, 42), width=max(2, w // 100))
        d.rectangle([w * .6, h * .68, w * .9, h * .72], fill=(23, 17, 42))
        d.rectangle([w * .6, h * .76, w * .8, h * .8], fill=(23, 17, 42))
    b = io.BytesIO()
    im.save(b, 'JPEG', quality=72)
    return b.getvalue()


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve(root, port):
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', port), functools.partial(Quiet, directory=root))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
ANDROID_UA = 'Mozilla/5.0 (Linux; Android 15; ASUS_AI2501) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36'
TILT = """async (seq) => { for (const [b, g, ms] of seq) { window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: b, gamma: g })); await new Promise((r) => setTimeout(r, ms)); } }"""


def fsx_checks(b, base, route, out, shots, errors):
    """橫放全螢幕：iPhone（轉 90 度）、Android（真的全螢幕）、陀螺儀自動進出、合輯的「下一集」鍵。"""
    res = []

    def ok(name, cond):
        res.append(('PASS ' if cond else 'FAIL ') + name)

    def open_comp(pg):
        # 找一支有章節或集數範圍的合輯（才有「下一集」）
        mc = pg.evaluate("() => { const v = [...IDX.byId.values()].find((x) => x.f === 'c' && ((x.chap && x.chap.length) || x.r)); return v ? v.i : null; }")
        pg.evaluate("() => { window.__dur = 25000; }")
        pg.evaluate("h => { location.hash = h; }", 'watch/' + (mc or ''))
        pg.wait_for_timeout(2600)
        return mc

    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=IPHONE_UA)
    # 模擬 iPhone 之前已經允許過「動作與方向」
    ctx.add_init_script("window.DeviceOrientationEvent && (DeviceOrientationEvent.requestPermission = () => Promise.resolve('granted')); localStorage.setItem('binge.v1.motion', JSON.stringify('granted'));")
    ctx.route('**/*', route)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append('fsx pageerror: %s' % e))
    pg.goto(base + '&skip=1')
    pg.wait_for_timeout(2200)
    mc = open_comp(pg)
    ok('有長片合輯可以測', bool(mc))
    st = lambda: pg.evaluate("() => ({ mode: Land.mode, dir: Land.dir, cls: document.getElementById('theater').className, tf: getComputedStyle(document.getElementById('thFrame')).transform })")
    pg.evaluate(TILT, [[90, 0, 60]] * 3 + [[0, -90, 250]] * 3)
    s = st()
    ok('iPhone 從直的轉成橫的 → 自動橫放、轉 90 度', s['mode'] == 'rot' and s['dir'] == 90 and 'fsx' in s['cls'] and s['tf'].startswith('matrix(0'))
    vis = pg.evaluate("() => ['fxComp', 'fxNext', 'fxFlip'].map((i) => getComputedStyle(document.getElementById(i)).display !== 'none')")
    ok('合輯：右邊有「下一集」、沒有「下一支」、有「反過來」', vis == [True, False, True])
    pg.wait_for_timeout(900)
    path = os.path.join(out, 'iphone-26-fsx.png'); pg.screenshot(path=path); shots.append(path)
    pg.click('#fxComp')
    pg.wait_for_timeout(300)
    tip = pg.evaluate("() => { const t = document.getElementById('thTip'); return [t.textContent, t.classList.contains('on')]; }")
    ok('按「下一集」→ 提示寫在播放器裡（%s）' % tip[0], tip[1] and '跳到' in tip[0])
    pg.evaluate(TILT, [[0, -90, 120]] * 3 + [[90, 0, 250]] * 4)
    ok('很快轉回直的 → 自動退出', st()['mode'] == '')
    pg.wait_for_timeout(2600)
    pg.click('#thFull')
    pg.wait_for_timeout(400)
    ok('按全螢幕鍵 → 橫放', st()['mode'] == 'rot')
    pg.evaluate(TILT, [[0, -90, 250]] * 3 + [[90, 0, 250]] * 4)
    ok('按鍵進來的 → 轉回直的不會自己退出', st()['mode'] == 'rot')
    pg.click('#fxExit')
    pg.wait_for_timeout(300)
    ok('按 ✕ → 退出', st()['mode'] == '' and 'fsx' not in st()['cls'])
    pg.click('#thClose')
    pg.wait_for_timeout(600)
    # 直式短劇不受影響
    pg.evaluate("h => { location.hash = h; }", 'ai')
    pg.wait_for_timeout(1200)
    if pg.evaluate("() => !!document.querySelector('.swipe-entry')"):
        pg.click('.swipe-entry')
        pg.wait_for_timeout(1500)
        pg.evaluate(TILT, [[90, 0, 60]] * 3 + [[0, -90, 250]] * 3)
        ok('直式短劇：轉手機不會橫放', st()['mode'] == '')
    ctx.close()

    ctx = b.new_context(viewport={'width': 412, 'height': 915}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=ANDROID_UA)
    ctx.route('**/*', route)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append('fsx-android pageerror: %s' % e))
    pg.goto(base + '&skip=1')
    pg.wait_for_timeout(2200)
    open_comp(pg)
    pg.click('#thFull')
    pg.wait_for_timeout(1300)
    s = pg.evaluate("() => ({ mode: Land.mode, fs: (document.fullscreenElement || {}).id || '' })")
    ok('Android 按全螢幕鍵 → 放映機真的全螢幕、系統不給轉就轉 90 度（%s）' % s['mode'], s['fs'] == 'theater' and s['mode'] in ('rot', 'fill'))
    path = os.path.join(out, 'android-26-fsx.png'); pg.screenshot(path=path); shots.append(path)
    pg.click('#fxExit')
    pg.wait_for_timeout(500)
    ok('Android 按 ✕ → 退出全螢幕', pg.evaluate("() => Land.mode === '' && !document.fullscreenElement"))
    ctx.close()

    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    ctx.route('**/*', route)
    pg = ctx.new_page()
    pg.goto(base + '&skip=1')
    pg.wait_for_timeout(1500)
    ok('電腦不用橫放模式', pg.evaluate("() => TOUCH === false"))
    ctx.close()
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--out', default='/tmp/bshots')
    ap.add_argument('--only', default='')
    ap.add_argument('--sky', default='')
    ap.add_argument('--port', type=int, default=8766)
    a = ap.parse_args()
    root = '/tmp/bgsrv'
    os.makedirs(os.path.join(root, 'apps'), exist_ok=True)
    link = os.path.join(root, 'apps', 'binge')
    if not os.path.islink(link):
        os.symlink(os.path.join(REPO, 'apps', 'binge'), link)
    dlink = os.path.join(root, '_data')
    if os.path.islink(dlink):
        os.remove(dlink)
    os.symlink(os.path.abspath(a.data), dlink)
    srv = serve(root, a.port)
    os.makedirs(a.out, exist_ok=True)
    from playwright.sync_api import sync_playwright
    base = 'http://127.0.0.1:%d/apps/binge/index.html?data=/_data/&main=/_data/' % a.port
    errors, shots, disp = [], [], set()

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
        if 'youtube.com/iframe_api' in u:
            return r.fulfill(status=200, body=FAKE_YT, content_type='text/javascript')
        if 'ntfy.sh' in u:
            return r.fulfill(status=200, body='{}', content_type='application/json')
        return r.abort()

    sky_js = "localStorage.setItem('binge.v1.set', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('binge.v1.set')||'{}'), {sky:'%s'})))" % a.sky if a.sky else ''
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
            if sky_js:
                ctx.add_init_script(sky_js)
            pg = ctx.new_page()
            pg.on('console', lambda m, n=name: errors.append('%s console %s: %s' % (n, m.type, m.text)) if m.type in ('error', 'warning') else None)
            pg.on('pageerror', lambda e, n=name: errors.append('%s pageerror: %s' % (n, e)))

            def shot(tag, full=False):
                path = os.path.join(a.out, '%s-%s.png' % (name, tag))
                pg.screenshot(path=path, full_page=full)
                shots.append(path)
                try:
                    disp.update(pg.evaluate(GLYPH_JS))
                except Exception:  # noqa: BLE001
                    pass

            def go(h, wait=1100):
                pg.evaluate("h => { location.hash = h; }", h)
                pg.wait_for_timeout(wait)

            if name == 'phone':
                pg.goto(base)
                pg.wait_for_timeout(1800)
                shot('00-gate')
                pg.click('#gateBtn', force=True)
                pg.wait_for_timeout(250)
                shot('01-op-flash')
                pg.wait_for_timeout(700)
                shot('02-op-cuts')
                pg.wait_for_timeout(1300)
                shot('03-op-iris')
                pg.wait_for_timeout(1500)
                shot('04-home')
            else:
                pg.goto(base + '&skip=1')
                pg.wait_for_timeout(2200)
                shot('04-home')
            pg.mouse.wheel(0, 760 if name != 'land' else 420)
            pg.wait_for_timeout(800)
            shot('05-home-scroll')
            pg.mouse.wheel(0, 1600 if name != 'land' else 800)
            pg.wait_for_timeout(800)
            shot('06-home-scroll2')
            # 扭蛋
            if pg.locator('.gacha .g-machine').count():
                pg.locator('.gacha .g-machine').first.scroll_into_view_if_needed()
                pg.locator('.gacha .g-machine').first.click()
                pg.wait_for_timeout(1300)
                shot('07-gacha')
            pg.evaluate('scrollTo(0,0)')
            go('ai', 1300)
            shot('08-ai')
            pg.mouse.wheel(0, 900 if name != 'land' else 420)
            pg.wait_for_timeout(700)
            shot('09-ai-scroll')
            go('ani', 1300)
            shot('10-ani')
            pg.mouse.wheel(0, 900 if name != 'land' else 420)
            pg.wait_for_timeout(700)
            shot('11-ani-scroll')
            first = pg.evaluate("() => { const a = document.querySelector('.sc'); return a ? a.getAttribute('href') : null }")
            if first:
                go(first.lstrip('#'), 1300)
                shot('12-show')
                pg.mouse.wheel(0, 700 if name != 'land' else 360)
                pg.wait_for_timeout(600)
                shot('13-show-eps')
                pg.click('.kv .chip.fol')
                pg.wait_for_timeout(700)
                shot('14-show-followed')
                pg.evaluate('scrollTo(0,0)')
                pg.wait_for_timeout(300)
                # 放映機
                pg.click('.kv .go-btn')
                pg.wait_for_timeout(500)
                shot('15-player-eyecatch')
                pg.wait_for_timeout(1800)
                shot('16-player')
                pg.evaluate("() => window.__yt && window.__yt.end()")
                pg.wait_for_timeout(900)
                shot('17-player-next')
                pg.wait_for_timeout(1500)
                shot('17b-player-next')
                pg.click('#thClose')
                pg.wait_for_timeout(800)
            # 長片合輯（有時間軸）
            go('list/comps:ai', 1200)
            shot('18-comps')
            mc = pg.evaluate("() => { const a = document.querySelector('.mc'); return a ? a.dataset.v : null }")
            if mc:
                pg.evaluate("() => { window.__dur = 25000; }")
                go('watch/' + mc, 2600)
                shot('19-player-comp')
                pg.click('[data-act=sleep-menu]')
                pg.wait_for_timeout(600)
                shot('20-sleep-sheet')
                pg.click('[data-act=sleep-set][data-k="15"]')
                pg.wait_for_timeout(500)
                pg.click('#thClose')
                pg.wait_for_timeout(700)
            # 直式滑看
            go('ai', 1200)
            if pg.locator('.swipe-entry').count():
                pg.click('.swipe-entry')
                pg.wait_for_timeout(1600)
                shot('21-swipe')
                pg.keyboard.press('ArrowDown')
                pg.wait_for_timeout(1300)
                shot('22-swipe-next')
                pg.click('[data-act=sw-close]')
                pg.wait_for_timeout(600)
            go('mine', 1300)
            shot('23-mine')
            pg.mouse.wheel(0, 1400 if name != 'land' else 700)
            pg.wait_for_timeout(700)
            shot('24-mine-scroll')
            go('home', 1200)
            pg.click('#btnSearch')
            pg.wait_for_timeout(500)
            pg.fill('#sq', '修仙')
            pg.wait_for_timeout(900)
            shot('25-search')
            ctx.close()
        fsx = []
        if not a.only or 'fsx' in a.only.split(','):
            fsx = fsx_checks(b, base, route, a.out, shots, errors)
        b.close()
    srv.shutdown()
    print('\n'.join(shots))
    try:
        from fontTools.ttLib import TTFont
        cmap = TTFont(os.path.join(REPO, '_build', 'apps', 'binge', 'src', 'fonts', 'display.woff2')).getBestCmap()
        miss = sorted(c for c in disp if ord(c) not in cmap and not c.isspace())
        print('--- 顯示字型缺字 ---')
        print(''.join(miss) or '（沒有）')
    except Exception as e:  # noqa: BLE001
        print('字型檢查失敗', e)
    if fsx:
        print('--- 橫放全螢幕 ---')
        print('\n'.join(fsx))
    print('--- console ---')
    print('\n'.join(e for e in errors if 'ERR_FAILED' not in e and 'net::' not in e) or '（沒有錯誤）')


if __name__ == '__main__':
    main()
