#!/usr/bin/env python3
"""一集就好 — 本機截圖與流程檢查（雲端沙盒連不到 YouTube：縮圖換成色塊、播放器換成假的）

  python3 _build/apps/one-more/tests/shoot.py --data /tmp/omdata --out /tmp/omshots [--only phone,land,desk]

--data 資料夾放 catalog.json（補番的片庫，binge-data 分支）和 mine.json（spectate-data 分支；沒有就用假的）：
  gh api "repos/PZWei0105/PZ-Games/contents/catalog.json?ref=binge-data" -H "Accept: application/vnd.github.raw" > /tmp/omdata/catalog.json
手機直拿用 iPhone 的 User-Agent（會出現「有沒有 Premium」的詢問）。
"""
import argparse, functools, http.server, json, os, socketserver, sys, threading

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO, '_build', 'apps', 'binge', 'tests'))
from shoot import FAKE_YT, placeholder  # noqa: E402  補番的假播放器和假縮圖

IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
FAKE_MINE = {'v': 1, 'at': '2026-11-19T00:00:00Z', 'ch': [{'c': 'UC8qZlMVw7C6FAh2eQtffbIw', 'n': '遊戲狂想曲', 'a': 'https://yt3.ggpht.com/fake-avatar', 'h': '@gaming-rhapsody', 'subs': 128,
                                                          'items': [{'i': 'MINEvideo01', 't': '2026 年 11 月新遊戲推薦！GTA 以外買什麼？推薦 5 款、首發別衝 5 款', 'p': 1795000000, 'd': 963, 'v': 412}]}]}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve(root, port):
    h = functools.partial(Quiet, directory=root)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(('127.0.0.1', port), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--out', default='/tmp/omshots')
    ap.add_argument('--only', default='')
    ap.add_argument('--port', type=int, default=8777)
    a = ap.parse_args()
    from playwright.sync_api import sync_playwright
    os.makedirs(a.out, exist_ok=True)
    root = '/tmp/omsrv'
    os.makedirs(os.path.join(root, 'apps'), exist_ok=True)
    link = os.path.join(root, 'apps', 'one-more')
    if not os.path.islink(link):
        os.symlink(os.path.join(REPO, 'apps', 'one-more'), link)
    data = os.path.join(root, '_data')
    os.makedirs(data, exist_ok=True)
    with open(os.path.join(a.data, 'catalog.json'), 'rb') as f, open(os.path.join(data, 'catalog.json'), 'wb') as g:
        g.write(f.read())
    mine = os.path.join(a.data, 'mine.json')
    with open(os.path.join(data, 'mine.json'), 'w', encoding='utf-8') as g:
        if os.path.exists(mine):
            m = json.load(open(mine, encoding='utf-8'))
            if not (m.get('ch') and m['ch'][0].get('items')):
                m = FAKE_MINE
        else:
            m = FAKE_MINE
        json.dump(m, g, ensure_ascii=False)
    srv = serve(root, a.port)
    base = 'http://127.0.0.1:%d/apps/one-more/index.html?cat=/_data/catalog.json&mine=/_data/mine.json' % a.port
    errors = []

    def route(r):
        u = r.request.url
        if '127.0.0.1' in u:
            return r.continue_()
        if 'i.ytimg.com' in u:
            vid = u.split('/vi/')[1].split('/')[0]
            big = 'hqdefault' in u
            return r.fulfill(status=200, body=placeholder(vid, 640 if big else 320, 480 if big else 180), content_type='image/jpeg')
        if 'ggpht' in u or 'googleusercontent' in u:
            return r.fulfill(status=200, body=placeholder(u, 88, 88, 'av'), content_type='image/jpeg')
        if 'youtube.com/iframe_api' in u:
            return r.fulfill(status=200, body=FAKE_YT, content_type='text/javascript')
        return r.abort()

    with sync_playwright() as p:
        b = p.chromium.launch()
        views = {'phone': dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=IPHONE),
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
                pg.screenshot(path=os.path.join(a.out, '%s-%s.png' % (name, tag)), full_page=full)

            def go(h, wait=700):
                pg.evaluate("h => { location.hash = h; }", h)
                pg.wait_for_timeout(wait)
            pg.goto(base)
            pg.wait_for_timeout(1800)
            shot('01-home')
            pg.mouse.wheel(0, 700); pg.wait_for_timeout(500); shot('02-home-scroll')
            pg.mouse.wheel(0, 900); pg.wait_for_timeout(500); shot('03-home-scroll2')
            pg.evaluate('scrollTo(0,0)')
            if pg.locator('[data-act=reroll]').count():
                pg.locator('[data-act=reroll]').first.click()
                pg.wait_for_timeout(600)
                pg.locator('#hero').scroll_into_view_if_needed()
                shot('04-reroll')
            go('browse'); shot('05-browse')
            pg.locator('[data-act=genre][data-k="甜寵"]').click(); pg.wait_for_timeout(500); shot('06-browse-genre')
            pg.locator('[data-act=fmt][data-k="shows"]').click(); pg.wait_for_timeout(500); shot('07-browse-shows')
            pg.locator('[data-act=fmt][data-k="s"]').click(); pg.wait_for_timeout(500); shot('08-browse-shorts')
            pg.locator('[data-act=genre][data-k=""]').click(); pg.wait_for_timeout(300)
            go('home')
            # 播放：一口氣看完的第一支
            card = pg.locator('.vc[data-ctx=comps]').first
            card.click(); pg.wait_for_timeout(700)
            if pg.locator('#sheet.in').count():
                shot('09-ask-premium')
                pg.locator('[data-act=ask][data-v=app]').click(); pg.wait_for_timeout(1600)
            else:
                pg.wait_for_timeout(1000)
            shot('10-player')
            pg.evaluate("() => { window.__dur = 30; }")
            pg.locator('[data-act=fav]').click(); pg.wait_for_timeout(300)
            pg.evaluate("() => window.__yt && window.__yt._set(0)"); pg.wait_for_timeout(900)
            shot('11-player-next')
            pg.locator('[data-act=close]').click(); pg.wait_for_timeout(700)
            # 系列：一集一集追
            s = pg.locator('.vc[data-s]').first
            if s.count():
                s.click(); pg.wait_for_timeout(1600)
                shot('12-player-show')
                pg.locator('[data-act=close]').click(); pg.wait_for_timeout(700)
            # 短劇
            sh = pg.locator('.vs').first
            if sh.count():
                sh.click(); pg.wait_for_timeout(1600)
                shot('13-player-short')
                pg.locator('[data-act=close]').click(); pg.wait_for_timeout(700)
            # 站長頻道
            pg.evaluate('scrollTo(0,0)')
            if pg.locator('.pin-v').count():
                pg.locator('.pin-v').click(); pg.wait_for_timeout(1600)
                shot('14-player-mine')
                pg.locator('[data-act=close]').click(); pg.wait_for_timeout(700)
            pg.evaluate('scrollTo(0,0)')
            shot('15-home-after')
            go('saved'); shot('16-saved')
            pg.mouse.wheel(0, 900); pg.wait_for_timeout(400); shot('17-saved-settings')
            pg.locator('#btnSkin').click(); pg.wait_for_timeout(900)
            go('home'); pg.evaluate('scrollTo(0,0)'); pg.wait_for_timeout(500); shot('18-rose-home')
            pg.mouse.wheel(0, 700); pg.wait_for_timeout(500); shot('19-rose-scroll')
            go('browse'); shot('20-rose-browse')
            pg.locator('#btnSearch').click(); pg.wait_for_timeout(500)
            pg.locator('#q').fill('重生'); pg.wait_for_timeout(700); shot('21-search')
            ctx.close()
        b.close()
    srv.shutdown()
    print('--- console ---')
    print('\n'.join(errors) if errors else '（沒有錯誤）')


if __name__ == '__main__':
    main()
