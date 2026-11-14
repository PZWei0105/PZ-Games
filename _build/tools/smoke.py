#!/usr/bin/env python3
"""PZ 遊戲收藏 smoke test: run it after every build, before pushing.

  cd _build
  python3 tools/smoke.py                         # everything (about 10 minutes)
  python3 tools/smoke.py --shell                 # files + the collection itself, no games (about a minute)
  python3 tools/smoke.py --only clear-bay updraft

It serves the built site (the repo root) on a local port and drives Chromium with Playwright
(`pip install playwright`; the cloud sandbox already has Chromium under PLAYWRIGHT_BROWSERS_PATH).

files       every game page exists and carries the current PZ button (hub.js) tag, every media/ path in
            catalog.json exists, sw.js caches the current hub.js, every game has 遊玩說明 and pictures
collection  at 390 (phone) and 1440 (laptop): boot screen, home, library, apps, every game page (play button,
            no broken pictures), an old #play- link stays on the game page instead of launching, a dedicated
            app opens and closes; then the collection must open again with the server gone (offline)
games       every game, at the screen it is meant for: 開始遊戲 -> the game page loads -> the PZ button is
            there, inside the screen and on top -> its menu opens -> 回到收藏庫 lands on that game's page

Requests to other websites are blocked (the cloud sandbox cannot reach them anyway) and listed apart, so a
game that needs a CDN shows up as such instead of as a mystery error; --net lets them through.
Screenshots and report.json go to --out (default /tmp/pzgc-smoke). Exit code 1 when anything is BAD.
"""
import argparse
import functools
import hashlib
import json
import os
import queue
import re
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

TOOLS = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(os.path.dirname(TOOLS))  # _build/tools -> repo root
LOCAL = {'127.0.0.1', 'localhost'}
PHONE = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
LAND = dict(viewport={'width': 844, 'height': 390}, device_scale_factor=2, is_mobile=True, has_touch=True)
DESK = dict(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
SKIP_BOOT = "try { sessionStorage.setItem('pzgc.booted', '1') } catch (e) {}"

HUB_READY = "(() => { const h = document.querySelector('pz-hub'); return !!(h && h.shadowRoot && h.shadowRoot.querySelector('.hb')); })()"
HUB_BOX = """(() => { const h = document.querySelector('pz-hub'), b = h.shadowRoot.querySelector('.hb').getBoundingClientRect();
  const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
  return { cx, cy, onTop: document.elementFromPoint(cx, cy) === h,
    inView: b.width > 0 && b.left >= -1 && b.top >= -1 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1 }; })()"""
SHEET_OPEN = "document.querySelector('pz-hub').shadowRoot.querySelector('.sheet').classList.contains('on')"
SHEET_SETTLED = "(() => { const r = document.querySelector('pz-hub').shadowRoot.querySelector('.sheet').getBoundingClientRect(); return r.height > 0 && r.bottom <= innerHeight + 1; })()"
HOME_BTN = "(() => { const r = document.querySelector('pz-hub').shadowRoot.querySelector('[data-a=home]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()"


def short(s, n=180):
    s = ' '.join(str(s).split())
    return s if len(s) <= n else s[:n - 1] + '…'


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.webmanifest': 'application/manifest+json',
                      '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.webp': 'image/webp'}

    def log_message(self, *a):
        pass


class Server(ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        pass  # the browser hangs up halfway through files all the time; that is not a finding


def serve(site):
    srv = Server(('127.0.0.1', 0), functools.partial(Handler, directory=site))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, 'http://127.0.0.1:%d/' % srv.server_address[1]


def stop(srv):
    try:
        srv.shutdown()
        srv.server_close()
    except Exception:
        pass


# ───────────── files ─────────────

def check_files(site, R):
    bad, warn = R['bad'], R['warn']
    cat = json.load(open(os.path.join(site, 'catalog.json'), encoding='utf-8'))
    hub = os.path.join(site, 'hub.js')
    hv = hashlib.sha1(open(hub, 'rb').read()).hexdigest()[:8] if os.path.exists(hub) else None
    if not hv:
        bad.append('檔案：網站根目錄沒有 hub.js（要重新 build）')
    sw_path = os.path.join(site, 'sw.js')
    sw = open(sw_path, encoding='utf-8').read() if os.path.exists(sw_path) else ''
    if not sw:
        bad.append('檔案：沒有 sw.js（要重新 build）')
    elif hv and 'hub.js?v=' + hv not in sw:
        bad.append('檔案：sw.js 快取的不是目前的 hub.js（要重新 build）')
    for g in cat.get('games', []):
        for b in g.get('builds', []):
            rel = b.get('path') or 'games/%s/index.html' % b['id']
            p = os.path.join(site, rel)
            if not os.path.exists(p):
                bad.append('檔案：%s 的遊戲檔不見了（%s）' % (g['id'], rel))
                continue
            html = open(p, encoding='utf-8', errors='replace').read()
            tags = re.findall(r'<script src="\.\./\.\./hub\.js\?v=([^"]*)" data-game="([^"]*)" data-build="([^"]*)"', html)
            if len(tags) != 1:
                bad.append('檔案：%s 的 PZ 圓鈕%s（要重新 build）' % (b['id'], '不見了' if not tags else '插了 %d 次' % len(tags)))
            elif hv and tags[0][0] != hv:
                bad.append('檔案：%s 的 PZ 圓鈕不是最新版（要重新 build）' % b['id'])
            elif tags[0][1:] != (g['id'], b['id']):
                bad.append('檔案：%s 的 PZ 圓鈕標錯遊戲（%s / %s）' % (b['id'], tags[0][1], tags[0][2]))
        if g.get('status') != 'failed':
            if not g.get('how'):
                warn.append('內容：%s 沒有遊玩說明（meta/%s.json）' % (g['id'], g['id']))
            if not (g.get('media') or {}).get('cover'):
                warn.append('內容：%s 沒有封面／截圖' % g['id'])
    missing = set()

    def walk(x):
        if isinstance(x, dict):
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
        elif isinstance(x, str) and x.startswith('media/'):
            if not os.path.exists(os.path.join(site, x.split('?')[0].split('#')[0])):
                missing.add(x)
    walk(cat)
    for x in sorted(missing)[:15]:
        bad.append('檔案：catalog.json 指到的圖片不存在：' + x)
    if len(missing) > 15:
        bad.append('檔案：另外還有 %d 張圖片不存在' % (len(missing) - 15))
    return cat


# ───────────── browser helpers ─────────────

def sink():
    return {'err': [], 'console': [], 'missing': [], 'ext': set(), 'dialogs': []}


def watch(pg, s):
    def where():
        return '遊戲' if '/games/' in pg.url else '收藏庫'

    def on_error(e):
        s['err'].append(where() + '：' + short(getattr(e, 'message', None) or e))

    def on_console(m):
        if m.type == 'error' and not m.text.startswith('Failed to load resource'):
            s['console'].append(where() + '：' + short(m.text))

    def on_response(r):
        u = urlparse(r.url)
        if u.hostname in LOCAL and r.status >= 400 and not u.path.endswith('/favicon.ico'):
            s['missing'].append('%d %s' % (r.status, u.path))

    def on_failed(rq):
        u = urlparse(rq.url)
        if u.scheme in ('http', 'https') and u.hostname not in LOCAL:
            s['ext'].add(u.hostname)

    def on_dialog(d):
        s['dialogs'].append(d.type)
        try:
            d.accept()
        except Exception:
            pass
    pg.on('pageerror', on_error)
    pg.on('console', on_console)
    pg.on('response', on_response)
    pg.on('requestfailed', on_failed)
    pg.on('dialog', on_dialog)


def shot(pg, path, on=True):
    if not on:
        return
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        pg.screenshot(path=path, timeout=15000)
    except Exception:
        pass


def tap(pg, touch, x, y):
    if touch:
        pg.touchscreen.tap(x, y)
    else:
        pg.mouse.click(x, y)


# ───────────── the collection ─────────────

def check_shell(br, base, tag, opts, out, cat, R, shots):
    from playwright.sync_api import TimeoutError as Slow
    s = sink()
    ctx = br.new_context(**opts)
    pg = ctx.new_page()
    watch(pg, s)
    touch = bool(opts.get('has_touch'))
    d = os.path.join(out, 'shell')

    def bad(m):
        R['bad'].append('收藏庫 %s：%s' % (tag, m))
    try:
        pg.goto(base, wait_until='domcontentloaded')
        try:
            pg.wait_for_selector('#boot', timeout=10000)
            pg.wait_for_timeout(1500)
            shot(pg, os.path.join(d, 'boot_%s.png' % tag), shots)
            boot = pg.locator('#boot')
            (boot.tap if touch else boot.click)(timeout=5000)
            pg.wait_for_selector('#boot', state='detached', timeout=5000)
        except Slow:
            bad('開機畫面沒出現，或點了關不掉')
        pg.wait_for_timeout(1200)
        home = pg.evaluate("""(() => { const v = document.querySelector('#view-home'), s = [...document.querySelectorAll('#hero .slide')];
            return { on: !!(v && v.classList.contains('on')), slides: s.length, shown: s.filter((x) => getComputedStyle(x).display !== 'none').length,
              shelves: document.querySelectorAll('#view-home .shelf').length }; })()""")
        if not home['on'] or not home['slides'] or not home['shown'] or not home['shelves']:
            bad('首頁沒有正常出現（%s）' % json.dumps(home))
        shot(pg, os.path.join(d, 'home_%s.png' % tag), shots)
        broken = []
        for k, g in enumerate(cat['games']):
            pg.evaluate('(h) => { location.hash = h; }', 'game-' + g['id'])
            try:
                pg.wait_for_function("(id) => location.hash === '#game-' + id && !!document.querySelector('#gamepage.on .play[data-act=play]')", arg=g['id'], timeout=6000)
            except Slow:
                broken.append('%s（遊戲頁沒打開，或沒有開始遊戲鈕）' % g['id'])
                continue
            pg.wait_for_timeout(900 if k == 0 else 300)
            if k == 0:
                shot(pg, os.path.join(d, 'gamepage_%s.png' % tag), shots)
            n = pg.evaluate("[...document.querySelectorAll('#gamepage img')].filter((i) => i.complete && i.getBoundingClientRect().height > 0 && !i.naturalWidth).length")
            if n:
                broken.append('%s（%d 張圖破圖）' % (g['id'], n))
        if broken:
            bad('遊戲頁有問題：' + '、'.join(broken[:10]) + ('…共 %d 款' % len(broken) if len(broken) > 10 else ''))
        pg.evaluate("location.hash = 'library'")
        pg.wait_for_timeout(900)
        if not pg.evaluate("document.querySelectorAll('#view-library .card').length"):
            bad('遊戲庫是空的')
        shot(pg, os.path.join(d, 'library_%s.png' % tag), shots)
        # 重製版（換上 PZ 引擎重做的舊作）：專屬分類、封面上的標示、遊戲頁的說明都要在
        remade = [g['id'] for g in cat.get('games', []) if g.get('remake')]
        if remade:
            pg.evaluate("location.hash = 'library-remake'")
            pg.wait_for_timeout(700)
            got = pg.evaluate("[...document.querySelectorAll('#lib-grid .card')].map((c) => c.dataset.id)")
            if sorted(got) != sorted(remade):
                bad('「重製 2.0」分類不對：應該是 %s，畫面上是 %s' % ('、'.join(remade), '、'.join(got) or '空的'))
            elif pg.evaluate("document.querySelectorAll('#lib-grid .card .chip.remake').length") != len(remade):
                bad('重製版的封面少了「重製」標示')
            shot(pg, os.path.join(d, 'library_remake_%s.png' % tag), shots)
        pg.evaluate("location.hash = 'apps'")
        pg.wait_for_timeout(900)
        if cat.get('apps') and not pg.evaluate("document.querySelectorAll('#view-apps [data-act]').length"):
            bad('專屬 App 分頁是空的')
        shot(pg, os.path.join(d, 'apps_%s.png' % tag), shots)
        # 2.0: the player page (level card, trophy cabinet, charts)
        pg.evaluate("location.hash = 'me'")
        try:
            pg.wait_for_function("document.querySelectorAll('#view-me .trophy').length >= 20 && !!document.querySelector('#view-me .pcard') && !!document.querySelector('#view-me .heat')", timeout=6000)
        except Slow:
            bad('「我的」玩家檔案沒有正常出現')
        shot(pg, os.path.join(d, 'me_%s.png' % tag), shots)
        web = [a for a in cat.get('apps', []) if a.get('type') == 'web' and a.get('url')]
        if web:
            pg.evaluate('(h) => { location.hash = h; }', 'app-' + web[0]['id'])
            try:
                pg.wait_for_function("document.documentElement.classList.contains('in-game') && !!document.querySelector('#launcher iframe')", timeout=8000)
                pg.wait_for_timeout(800)
                pg.evaluate('history.back()')
                pg.wait_for_function("!document.documentElement.classList.contains('in-game') && !document.querySelector('#launcher iframe')", timeout=8000)
            except Slow:
                bad('專屬 App（%s）打不開或關不掉' % web[0]['id'])
        # an old #play- link (a reload after the phone ran out of memory) must stop on the game page
        g0 = cat['games'][0]
        pg.goto('about:blank')
        pg.goto(base + '#play-' + g0['builds'][0]['id'], wait_until='domcontentloaded')
        pg.wait_for_timeout(2500)
        pl = pg.evaluate("({ hash: location.hash, path: location.pathname, launcher: document.querySelector('#launcher').classList.contains('on') })")
        if pl['hash'] != '#game-' + g0['id'] or pl['launcher'] or '/games/' in pl['path']:
            bad('舊的 #play- 連結沒有停在遊戲頁（%s）' % json.dumps(pl, ensure_ascii=False))
    except Exception as e:
        bad('檢查到一半出錯：' + short(e))
    finally:
        ctx.close()
    for m in s['err']:
        bad('程式錯誤 ' + m)
    for m in s['missing'][:8]:
        bad('找不到檔案 ' + m)
    for m in s['console'][:5]:
        R['warn'].append('收藏庫 %s：console 錯誤 %s' % (tag, m))
    for h in s['ext']:
        R['ext'].setdefault(h, set()).add('收藏庫')


def check_player(br, base, cat, out, R, shots):
    """2.0 player system: the results screen after a game session, and the one-time upgrade screen
    someone who used the collection before 2.0 sees."""
    from playwright.sync_api import TimeoutError as Slow
    gid = cat['games'][0]['id']
    now = int(time.time() * 1000)
    seen = [g['id'] for g in cat['games']]

    def ctx(ls, ss):
        js = 'try{' + ''.join('localStorage.setItem(%s, %s);' % (json.dumps('pzgc.v1.' + k), json.dumps(json.dumps(v))) for k, v in ls.items())
        js += ''.join('sessionStorage.setItem(%s, %s);' % (json.dumps(k), json.dumps(v if isinstance(v, str) else json.dumps(v))) for k, v in ss.items()) + '}catch(e){}'
        c = br.new_context(**PHONE)
        c.add_init_script(js)
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(short(getattr(e, 'message', None) or e)))
        return c, pg, errs
    # back from a 30-minute session: the results screen counts up, a tap skips to the end, the next closes it
    c, pg, errs = ctx({'stats': {gid: {'plays': 2, 'ms': 40 * 60000, 'last': now, 'best': 30 * 60000}}, 'trophies': {}, 'seen': seen},
                      {'pzgc.booted': '1', 'pzgc.ms0': {'id': gid, 'ms': 10 * 60000, 'xp': 0, 'tier': 0}})
    try:
        pg.goto(base + '#game-' + gid, wait_until='domcontentloaded')
        pg.wait_for_function("document.querySelector('#results.on .rs-card')", timeout=8000)
        pg.wait_for_timeout(1600)
        shot(pg, os.path.join(out, 'shell', 'results_390.png'), shots)
        pg.mouse.click(195, 300)
        pg.wait_for_function("document.querySelector('#results.done')", timeout=4000)
        pg.mouse.click(195, 300)
        pg.wait_for_function("!document.querySelector('#results.on')", timeout=4000)
    except Slow:
        R['bad'].append('遊玩結算：玩完回來時結算畫面沒出現，或點了關不掉')
    except Exception as e:
        R['bad'].append('遊玩結算：檢查到一半出錯（%s）' % short(e, 120))
    finally:
        c.close()
    for m in errs:
        R['bad'].append('遊玩結算：程式錯誤 ' + m)
    # an existing player opening 2.0 the first time: the system update screen, then 開始 closes it
    c, pg, errs = ctx({'stats': {gid: {'plays': 1, 'ms': 5 * 60000, 'last': now}}, 'seen': seen}, {'pzgc.booted': '1'})
    try:
        pg.goto(base, wait_until='domcontentloaded')
        pg.wait_for_function("document.querySelector('#upgrade.on.done [data-act=up-close]')", timeout=8000)
        shot(pg, os.path.join(out, 'shell', 'upgrade_390.png'), shots)
        pg.click('#upgrade [data-act=up-close]')
        pg.wait_for_function("!document.querySelector('#upgrade.on')", timeout=4000)
    except Slow:
        R['bad'].append('2.0 升級畫面：沒出現，或按「開始」關不掉')
    except Exception as e:
        R['bad'].append('2.0 升級畫面：檢查到一半出錯（%s）' % short(e, 120))
    finally:
        c.close()
    for m in errs:
        R['bad'].append('2.0 升級畫面：程式錯誤 ' + m)


# what is on top at the top bar, the middle of the screen and the tab bar while the catalog is still loading
COVERED = """(() => { const hit = (y) => { const e = document.elementFromPoint(innerWidth / 2, y); return !!(e && e.closest('#prelude')); };
  return hit(30) && hit(innerHeight / 2) && hit(innerHeight - 40); })()"""


def check_launch(br, base, cat, R):
    """The launch backdrop (#prelude): while the catalog is still on its way nothing of the half-built lobby
    may show (it used to flash by on every launch); the boot screen takes over from it, or without a boot
    screen it fades into the lobby; a catalog that doesn't load still gets its error message on screen.
    The boot screen waits for PRESS START: a new-game bubble or a trophy banner must wait for it too,
    instead of playing out unseen underneath it."""
    from playwright.sync_api import TimeoutError as Slow
    ids = [g['id'] for g in cat['games']]
    notes = cat.get('changelog') or []
    # someone who has seen every game but the first, and every update note but the newest
    news = 'try{' + ''.join('localStorage.setItem(%s, %s);' % (json.dumps('pzgc.v1.' + k), json.dumps(json.dumps(v))) for k, v in
                            {'seen': ids[1:], 'trophies': {}, 'noteSeen': notes[1]['id'] if len(notes) > 1 else ''}.items()) + '}catch(e){}'
    for case in ('boot', 'warm', 'fail'):
        c = br.new_context(**PHONE)
        c.add_init_script(news if case == 'boot' else SKIP_BOOT)
        held = []

        def holder(case, held):
            # (Playwright looks at how many arguments a handler takes, so no defaults here)
            def hold(route):
                # only the page's own first request waits; later ones (the service worker caching it) go straight through
                if case == 'fail':
                    route.abort()
                elif held:
                    route.continue_()
                else:
                    held.append(route)
            return hold
        c.route('**/catalog.json*', holder(case, held))
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(short(getattr(e, 'message', None) or e)))
        name = {'boot': '啟動（開機畫面）', 'warm': '啟動（玩完回來）', 'fail': '啟動（收藏庫載入失敗）'}[case]
        try:
            pg.goto(base, wait_until='domcontentloaded')
            if case == 'fail':
                pg.wait_for_function("!document.getElementById('prelude') && !!document.querySelector('#view-home.on .empty')", timeout=6000)
            else:
                for _ in range(60):
                    if held:
                        break
                    pg.wait_for_timeout(50)
                pg.wait_for_timeout(400)
                if not held:
                    R['bad'].append(name + '：沒有去讀收藏庫目錄')
                else:
                    if not pg.evaluate(COVERED):
                        R['bad'].append(name + '：目錄還沒載完，半成品的大廳（頂列、分頁列）就露出來了')
                    held[0].continue_()
                    if case == 'boot':
                        pg.wait_for_selector('#boot', timeout=8000)
                        if pg.evaluate("!!document.getElementById('prelude')"):
                            R['bad'].append(name + '：開機畫面出來了，啟動底圖卻還在')
                        pg.wait_for_timeout(2600)
                        if pg.evaluate("!!document.querySelector('#toast.on') || !!document.querySelector('#tpop .tp')"):
                            R['bad'].append(name + '：還停在 PRESS START，新遊戲提示或獎盃橫幅就在開機畫面底下跳完了')
                        pg.locator('#boot').tap(timeout=5000)
                        try:
                            pg.wait_for_function("(document.querySelector('#toast.on') || {}).textContent && document.querySelector('#toast.on').textContent.includes('新遊戲入庫')", timeout=5000)
                        except Slow:
                            R['bad'].append(name + '：按了 PRESS START 之後，「新遊戲入庫」沒有出現')
                    else:
                        pg.wait_for_function("!document.getElementById('prelude') && !!document.querySelector('#view-home.on')", timeout=6000)
        except Slow:
            R['bad'].append(name + '：啟動底圖沒有讓開（畫面會一直停在暗底）')
        except Exception as e:
            R['bad'].append(name + '：檢查到一半出錯（%s）' % short(e, 120))
        finally:
            c.close()
        for m in errs:
            R['bad'].append(name + '：程式錯誤 ' + m)



def check_arrange(br, base, cat, out, R, shots):
    """3.0 cartridges: hold a cartridge to pull it out and move it on the rack, drop one into the console,
    leave arrange mode, the order survives a reload, a tap still opens the App, the home console mirrors
    the dock, favourite covers reorder by holding; and the one-time 3.0 screen for someone who had 2.0."""
    from playwright.sync_api import TimeoutError as Slow
    ids = [g['id'] for g in cat['games']]
    apps = cat.get('apps') or []
    if len(apps) < 6:
        return
    def ctx(ls):
        js = 'try{' + ''.join('localStorage.setItem(%s, %s);' % (json.dumps('pzgc.v1.' + k), json.dumps(json.dumps(v))) for k, v in ls.items()) + "sessionStorage.setItem('pzgc.booted','1');}catch(e){}"
        c = br.new_context(**PHONE)
        c.add_init_script(js)
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(short(getattr(e, 'message', None) or e)))
        return c, pg, errs
    def mid(pg, sel):
        b = pg.locator(sel).first.bounding_box()
        return b['x'] + b['width'] / 2, b['y'] + b['height'] / 2
    def carry(pg, a, b, hold=600, steps=16):
        pg.mouse.move(*a); pg.mouse.down(); pg.wait_for_timeout(hold)
        for i in range(1, steps + 1):
            pg.mouse.move(a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps); pg.wait_for_timeout(30)
        pg.wait_for_timeout(200); pg.mouse.up(); pg.wait_for_timeout(900)
    store = lambda pg, k: pg.evaluate("(k) => JSON.parse(localStorage.getItem('pzgc.v1.' + k) || 'null')", k)
    order = "[...document.querySelectorAll('%s [data-cart]')].map((e) => e.dataset.cart)"
    bad = lambda m: R['bad'].append('卡匣與主機：' + m)
    seen = ids
    note = ((cat.get('changelog') or [{}])[0]).get('id', '')
    c, pg, errs = ctx({'seen': seen, 'trophies': {}, 'v3': True, 'favs': ids[:3], 'noteSeen': note})
    try:
        pg.goto(base + '#apps', wait_until='domcontentloaded')
        pg.wait_for_function("document.querySelectorAll('#console .slot').length === 4 && document.querySelectorAll('#rack [data-cart]').length > 0", timeout=8000)
        n = pg.evaluate("document.querySelectorAll('#view-apps [data-cart]').length")
        if n != len(apps):
            bad('主機加卡匣架一共 %d 片，目錄裡有 %d 個 App' % (n, len(apps)))
        rack0 = pg.evaluate(order % '#rack')
        carry(pg, mid(pg, '#rack [data-cart="%s"]' % rack0[2]), mid(pg, '#rack [data-cart="%s"]' % rack0[0]))
        shot(pg, os.path.join(out, 'shell', 'arrange_390.png'), shots)
        if not pg.evaluate("document.querySelector('#view-apps').classList.contains('editing')"):
            bad('按住卡匣沒有進入整理模式')
        o = store(pg, 'appOrder')
        if not o or o[0] != rack0[2]:
            bad('按住拖到卡匣架最前面，順序沒有存起來（%s）' % (o[:3] if o else o))
        r1 = pg.evaluate(order % '#rack')
        carry(pg, mid(pg, '#rack [data-cart="%s"]' % r1[1]), mid(pg, '#console .slot[data-slot="1"]'), hold=0)
        d = store(pg, 'dock')
        if not d or d[1] != r1[1]:
            bad('整理模式裡把卡匣拖進主機第 2 格，沒有插上去（%s）' % d)
        pg.click('#editbar [data-act="ed-done"]'); pg.wait_for_timeout(500)
        if pg.evaluate("document.querySelector('#view-apps').classList.contains('editing')"):
            bad('按「完成」沒有離開整理模式')
        want = pg.evaluate(order % '#view-apps')
        pg.reload(wait_until='domcontentloaded')
        pg.wait_for_function("document.querySelectorAll('#view-apps [data-cart]').length > 0", timeout=8000)
        if pg.evaluate(order % '#view-apps') != want:
            bad('重新打開後，主機和卡匣架的順序跑掉了')
        web = [a['id'] for a in apps if (a.get('type') or a.get('kind')) == 'web']
        if web:
            pg.click('#view-apps [data-cart="%s"]' % web[0])
            try:
                pg.wait_for_function("document.querySelector('#launcher.on')", timeout=5000)
            except Slow:
                bad('平常點卡匣，App 沒有打開')
            pg.evaluate('history.back()'); pg.wait_for_timeout(900)
        pg.evaluate("location.hash = ''")
        pg.wait_for_function("!!document.querySelector('#minicon')", timeout=6000)
        hd = pg.evaluate("[...document.querySelectorAll('#minicon .slot')].map((s) => s.querySelector('[data-cart]') ? s.querySelector('[data-cart]').dataset.cart : null)")
        if hd != store(pg, 'dock'):
            bad('首頁的小主機跟 App 頁的主機不一樣')
        pg.evaluate("document.querySelector('.sortable').scrollIntoView({block: 'center'})"); pg.wait_for_timeout(500)
        f0 = pg.evaluate("[...document.querySelectorAll('.sortable .row .card')].map((e) => e.dataset.id)")
        carry(pg, mid(pg, '.sortable .card[data-id="%s"]' % f0[2]), mid(pg, '.sortable .card[data-id="%s"]' % f0[0]))
        f1 = store(pg, 'favs')
        if not f1 or f1[0] != f0[2]:
            bad('首頁「我的最愛」按住拖曳沒有換順序（%s → %s）' % (f0, f1))
    except Slow:
        bad('App 頁的主機或卡匣架沒有出現')
    except Exception as e:
        bad('檢查到一半出錯（%s）' % short(e, 120))
    finally:
        c.close()
    for m in errs:
        bad('程式錯誤 ' + m)
    # someone who had 2.0 opens 3.0 for the first time
    c, pg, errs = ctx({'seen': seen, 'trophies': {'boot': 1}, 'noteSeen': note})
    try:
        pg.goto(base, wait_until='domcontentloaded')
        pg.wait_for_function("document.querySelector('#upgrade.on.done .up-in.v3') && document.querySelector('#upgrade .console.preview')", timeout=8000)
        shot(pg, os.path.join(out, 'shell', 'upgrade3_390.png'), shots)
        pg.click('#upgrade [data-act=up-close]')
        pg.wait_for_function("!document.querySelector('#upgrade.on')", timeout=4000)
    except Slow:
        bad('3.0 升級畫面沒出現，或按「開始」關不掉')
    except Exception as e:
        bad('3.0 升級畫面檢查到一半出錯（%s）' % short(e, 120))
    finally:
        c.close()
    for m in errs:
        bad('3.0 升級畫面：程式錯誤 ' + m)


def check_offline(br, site, out, R, shots):
    """Open the collection once, take the server away, open it again: the service worker must carry it."""
    srv, base = serve(site)
    ctx = br.new_context(**PHONE)
    ctx.add_init_script(SKIP_BOOT)
    pg = ctx.new_page()
    try:
        pg.goto(base, wait_until='load')
        ready = pg.evaluate("""() => new Promise((res) => { if (!('serviceWorker' in navigator)) return res(false);
            navigator.serviceWorker.ready.then(() => res(true)); setTimeout(() => res(false), 20000); })""")
        if not ready:
            R['bad'].append('離線：service worker 沒有啟動（快取清單裡可能有不存在的檔案）')
            return
        pg.wait_for_timeout(3000)
        stop(srv)
        pg.reload(wait_until='domcontentloaded')
        pg.wait_for_function("!!document.querySelector('#view-home.on .shelf')", timeout=15000)
        shot(pg, os.path.join(out, 'shell', 'offline_390.png'), shots)
    except Exception as e:
        R['bad'].append('離線：沒有網路時收藏庫打不開（%s）' % short(e, 120))
    finally:
        ctx.close()
        stop(srv)


# ───────────── games ─────────────

def check_game(br, base, g, out, shots, slow=1.0):
    """slow stretches every time limit: the cloud machine draws 3D on the CPU, so a heavy game can take
    a minute here that takes a few seconds on PZ's phone. Stuck steps are retried later on their own."""
    from playwright.sync_api import TimeoutError as Slow
    how = g.get('how') or {}
    if how.get('device') == 'desktop':
        opts, touch, screen = DESK, False, '電腦'
    elif how.get('orientation') == 'landscape':
        opts, touch, screen = LAND, True, '手機橫拿'
    else:
        opts, touch, screen = PHONE, True, '手機'
    r = {'id': g['id'], 'title': g.get('title', ''), 'screen': screen, 'bad': [], 'warn': [], 'ext': [], 'steps': [], 'stuck': None}
    s = sink()
    ctx = br.new_context(**opts)
    ctx.add_init_script(SKIP_BOOT)
    pg = ctx.new_page()
    watch(pg, s)
    t0 = last = time.time()
    step = '打開遊戲頁'

    def ms(sec):
        return int(sec * 1000 * slow)

    def next_step(name):
        nonlocal step, last
        now = time.time()
        r['steps'].append([step, round(now - last, 1)])
        step, last = name, now
    try:
        pg.goto(base + '#game-' + g['id'], wait_until='domcontentloaded')
        btn = pg.locator('#gamepage.on .play[data-act=play]').first
        btn.wait_for(state='visible', timeout=ms(15))
        pg.wait_for_timeout(500)
        next_step('按開始遊戲')
        (btn.tap if touch else btn.click)(timeout=ms(8))
        next_step('進入遊戲')
        pg.wait_for_url(re.compile(r'/games/'), timeout=ms(30), wait_until='commit')
        r['build'] = urlparse(pg.url).path.split('/games/')[-1].split('/')[0]
        next_step('等 PZ 圓鈕出現')
        pg.wait_for_function(HUB_READY, timeout=ms(45))
        pg.wait_for_timeout(1500)
        hb = pg.evaluate(HUB_BOX)
        if not hb['inView']:
            r['bad'].append('PZ 圓鈕跑到畫面外面')
        elif not hb['onTop']:
            r['bad'].append('PZ 圓鈕被遊戲畫面蓋住，按不到')
        shot(pg, os.path.join(out, 'games', g['id'] + '.png'), shots)
        next_step('打開 PZ 選單')
        tap(pg, touch, hb['cx'], hb['cy'])
        pg.wait_for_function(SHEET_OPEN, timeout=ms(25))
        pg.wait_for_function(SHEET_SETTLED, timeout=ms(30))
        next_step('按回到收藏庫')
        x, y = pg.evaluate(HOME_BTN)
        tap(pg, touch, x, y)
        pg.wait_for_url(re.compile(r'#game-'), timeout=ms(45), wait_until='commit')
        next_step('回到這款的遊戲頁')
        pg.wait_for_function("(id) => location.hash === '#game-' + id && !!document.querySelector('#gamepage.on')", arg=g['id'], timeout=ms(30))
        next_step('完成')
    except Slow:
        r['stuck'] = step
        r['bad'].append('「%s」這一步卡住了' % step)
    except Exception as e:
        r['bad'].append('「%s」出錯：%s' % (step, short(e, 140)))
    finally:
        r['secs'] = round(time.time() - t0, 1)
        try:
            ctx.close()
        except Exception:
            pass
    for m in s['err'][:3]:
        r['warn'].append('程式錯誤 ' + m)
    for m in s['missing'][:3]:
        r['warn'].append('找不到檔案 ' + m)
    for m in s['console'][:2]:
        r['warn'].append('console 錯誤 ' + m)
    if 'beforeunload' in s['dialogs']:
        r['warn'].append('離開遊戲時會跳出「確定要離開嗎」')
    r['ext'] = sorted(s['ext'])
    return r


def line(r):
    tag = 'BAD ' if r['bad'] else ('WARN' if r['warn'] else 'OK  ')
    txt = '%s %-20s %5.1fs  %s' % (tag, r['id'], r['secs'], r['screen'])
    if r['bad']:
        txt += '  ' + '；'.join(r['bad'])
    if r['ext']:
        txt += '  (需要外部網站：%s)' % ', '.join(r['ext'])
    print(txt, flush=True)
    for w in r['warn'][:5]:
        print('       · ' + w, flush=True)


def worker(q, base, out, shots, launch, R, lock):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        br = p.chromium.launch(**launch)
        n = 0
        while True:
            try:
                g = q.get_nowait()
            except queue.Empty:
                break
            r = check_game(br, base, g, out, shots)
            with lock:
                R['games'].append(r)
                line(r)
            n += 1
            if n % 12 == 0:  # a fresh browser now and then, so one heavy game cannot slow down the rest
                br.close()
                br = p.chromium.launch(**launch)
        br.close()


def main():
    ap = argparse.ArgumentParser(description='PZ 遊戲收藏的上線前檢查')
    ap.add_argument('--site', default=SITE, help='組好的網站（預設是 repo 根目錄）')
    ap.add_argument('--out', default='/tmp/pzgc-smoke', help='截圖與 report.json 放哪裡')
    ap.add_argument('--shell', action='store_true', help='只檢查檔案與收藏庫本身，不逐款開遊戲')
    ap.add_argument('--only', nargs='+', metavar='ID', help='只開這幾款遊戲（遊戲 id）')
    ap.add_argument('--jobs', type=int, default=1, help='同時開幾個瀏覽器跑遊戲（預設 1，最穩）')
    ap.add_argument('--no-shots', action='store_true', help='不截圖')
    ap.add_argument('--net', action='store_true', help='讓外部網站的請求通過（預設擋掉）')
    a = ap.parse_args()
    site, out, shots = os.path.abspath(a.site), os.path.abspath(a.out), not a.no_shots
    os.makedirs(out, exist_ok=True)
    R = {'bad': [], 'warn': [], 'games': [], 'ext': {}}
    t0 = time.time()
    cat = check_files(site, R)
    games = [g for g in cat['games'] if g.get('builds')]
    if a.only:
        unknown = [x for x in a.only if x not in {g['id'] for g in games}]
        if unknown:
            sys.exit('沒有這些遊戲 id：' + ', '.join(unknown))
        games = [g for g in games if g['id'] in a.only]
    launch = {} if a.net else {'proxy': {'server': 'http://127.0.0.1:9', 'bypass': '127.0.0.1,localhost'}}
    srv, base = serve(site)
    from playwright.sync_api import sync_playwright
    if not a.only:
        print('檢查收藏庫本身（390 手機、1440 電腦、離線）…', flush=True)
        with sync_playwright() as p:
            br = p.chromium.launch(**launch)
            check_shell(br, base, '390', PHONE, out, cat, R, shots)
            check_shell(br, base, '1440', DESK, out, cat, R, shots)
            check_player(br, base, cat, out, R, shots)
            check_launch(br, base, cat, R)
            check_arrange(br, base, cat, out, R, shots)
            check_offline(br, site, out, R, shots)
            br.close()
    if not a.shell:
        print('逐款開遊戲（%d 款）…' % len(games), flush=True)
        q = queue.Queue()
        for g in games:
            q.put(g)
        lock = threading.Lock()
        ts = [threading.Thread(target=worker, args=(q, base, out, shots, launch, R, lock)) for _ in range(max(1, a.jobs))]
        for t in ts:
            t.start()
        for t in ts:
            t.join()
        # a step that timed out gets one more try, alone and with more time, before it counts as broken
        again = [r for r in R['games'] if r['stuck']]
        if again:
            print('單獨重跑卡住的 %d 款（時間放寬）…' % len(again), flush=True)
            byid = {g['id']: g for g in games}
            with sync_playwright() as p:
                br = p.chromium.launch(**launch)
                for r in again:
                    r2 = check_game(br, base, byid[r['id']], out, shots, slow=2.0)
                    if not r2['bad']:
                        r2['warn'].insert(0, '第一次在「%s」卡住，單獨重跑就過了（雲端電腦用 CPU 畫 3D 很慢，通常不是遊戲的問題）' % r['stuck'])
                    R['games'][R['games'].index(r)] = r2
                    line(r2)
                br.close()
    stop(srv)
    for r in R['games']:
        for h in r['ext']:
            R['ext'].setdefault(h, set()).add(r['id'])
    nb = [r for r in R['games'] if r['bad']]
    nw = [r for r in R['games'] if r['warn'] and not r['bad']]
    print('\n== 結果（%d 秒）==' % round(time.time() - t0))
    print('檔案與收藏庫：' + ('沒有問題' if not R['bad'] else '%d 個問題' % len(R['bad'])))
    for m in R['bad']:
        print('  BAD  ' + m)
    for m in R['warn']:
        print('  WARN ' + m)
    if R['games']:
        print('遊戲：%d 款，正常 %d、有問題 %d、有警告 %d' % (len(R['games']), len(R['games']) - len(nb) - len(nw), len(nb), len(nw)))
        for r in sorted(nb, key=lambda r: r['id']):
            print('  BAD  %s《%s》：%s' % (r['id'], r['title'], '；'.join(r['bad'])))
    if R['ext']:
        print('需要外部網站（這次擋掉了，不算錯；網址前面的是用到它的地方）：')
        for h, who in sorted(R['ext'].items()):
            print('  %s ← %s' % (h, '、'.join(sorted(who))))
    rep = {'bad': R['bad'], 'warn': R['warn'], 'games': sorted(R['games'], key=lambda r: r['id']),
           'external': {h: sorted(v) for h, v in R['ext'].items()}}
    json.dump(rep, open(os.path.join(out, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('截圖與 report.json：' + out)
    sys.exit(1 if R['bad'] or nb else 0)


if __name__ == '__main__':
    main()
