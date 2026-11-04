#!/usr/bin/env python3
"""
shoot.py — open one game build in headless Chromium, run a list of steps, save screenshots.

Usage:
  python3 /home/claude/pzgc/tools/shoot.py --game tideline --out /home/claude/pzgc/shots/tideline \
      --viewport 390x844 --dpr 2 --steps '[{"wait":2500},{"shot":"01"},{"click_text":"開始"},{"wait":1500},{"shot":"02"}]'
  (--steps may also be a path to a .json file)

Viewport presets: --viewport phone (390x844, touch) | land (844x390, touch) | desk (1280x800, mouse) | WxH
  --touch / --no-touch override touch emulation.

Step types (run in order):
  {"wait": ms}
  {"shot": "name"}                      -> <out>/name.png (viewport)
  {"click": "css selector"}             -> first match, real mouse click on its centre
  {"click_text": "文字"}                -> first visible element whose text contains 文字
  {"tap": [x, y]}                       -> tap/click at CSS-pixel coordinates
  {"dblclick": [x, y]}
  {"drag": [x1, y1, x2, y2, ms]}        -> press, move over ms, release (also works as swipe)
  {"key": "Space"}                      -> press & release (Playwright key names: Enter, ArrowLeft, KeyW, Escape ...)
  {"hold": ["KeyW", ms]}                -> hold a key for ms
  {"keys_down": ["KeyW","KeyD"]} / {"keys_up": [...]}
  {"type": "text"}
  {"eval": "js"}                        -> run JS in the page (result printed)
  {"log": "js expression"}              -> print the value
  {"wait_for": "css selector"}          -> wait up to 8 s
  {"dump": "name"}                      -> <out>/name.txt : visible text + clickable elements with boxes
  {"repeat": n, "steps": [...]}         -> run the inner steps n times
Console errors / page errors are written to <out>/console.txt and summarised on exit.
Fonts from fonts.googleapis.com are served from local copies so screenshots look like the real thing.
"""
import argparse, json, os, re, sys, threading, time, urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial

ROOT = os.environ.get('PZ_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAMES_DIR = os.path.join(ROOT, 'raw')
FONTS_DIR = os.path.join(ROOT, 'tools/fonts/node_modules/@fontsource')
VENDOR_DIR = os.path.join(ROOT, 'tools/vendor')


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def translate_path(self, path):
        p = urllib.parse.unquote(urllib.parse.urlparse(path).path)
        for prefix, base in (('/__fs/', FONTS_DIR), ('/__vendor/', VENDOR_DIR), ('/__app/', getattr(self.server, 'app_dir', ROOT))):
            if p.startswith(prefix):
                return os.path.join(base, p[len(prefix):])
        site = getattr(self.server, 'site_dir', None)
        if site:
            return os.path.join(site, p.lstrip('/'))
        if p.startswith('/games/'):
            return os.path.join(GAMES_DIR, p[len('/games/'):])
        return os.path.join(GAMES_DIR, p.lstrip('/'))

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()


def start_server(app_dir=None, site_dir=None):
    srv = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    srv.app_dir = app_dir or ROOT
    srv.site_dir = site_dir
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    return srv, srv.server_address[1]


def font_css(query, base):
    """Build @font-face CSS for a fonts.googleapis.com css/css2 query from local fontsource files."""
    qs = urllib.parse.parse_qs(query)
    out = []
    for fam in qs.get('family', []):
        for one in fam.split('|'):
            name, _, spec = one.partition(':')
            name = name.replace('+', ' ').strip()
            pkg = name.lower().replace(' ', '-')
            weights, italics = set(), set()
            if spec:
                axes, _, vals = spec.partition('@')
                axes = axes.split(',')
                for tup in vals.split(';'):
                    if not tup:
                        continue
                    parts = tup.split(',')
                    d = dict(zip(axes, parts))
                    w = d.get('wght', '400')
                    if '..' in w:  # range -> include common weights
                        lo, hi = [int(float(x)) for x in w.split('..')]
                        ws = [x for x in range(100, 1000, 100) if lo <= x <= hi]
                    else:
                        try:
                            ws = [int(float(w))]
                        except ValueError:
                            ws = [400]
                    for x in ws:
                        (italics if d.get('ital') == '1' else weights).add(x)
                    if not vals:
                        weights.add(400)
                # legacy css?family=Name:400,700
                if not vals and axes and all(a.strip().rstrip('i').isdigit() for a in axes if a.strip()):
                    for a in axes:
                        a = a.strip()
                        if a.endswith('i'):
                            italics.add(int(a[:-1]))
                        elif a:
                            weights.add(int(a))
            if not weights and not italics:
                weights.add(400)
            pdir = os.path.join(FONTS_DIR, pkg)
            if not os.path.isdir(pdir):
                local = {'chiron sung hk': 'Noto Serif CJK TC'}.get(name.lower())
                if local:
                    for w in sorted(weights or {400}):
                        out.append("@font-face{font-family:'%s';font-weight:%d;src:local('%s');}" % (name, w, local))
                continue
            for w, it in [(w, False) for w in sorted(weights)] + [(w, True) for w in sorted(italics)]:
                fn = os.path.join(pdir, '%d%s.css' % (w, '-italic' if it else ''))
                if not os.path.exists(fn):
                    fn = os.path.join(pdir, '400.css')
                if not os.path.exists(fn):
                    continue
                css = open(fn, encoding='utf-8').read()
                css = css.replace('url(./files/', 'url(%s/__fs/%s/files/' % (base, pkg))
                if not os.path.exists(os.path.join(pdir, '%d%s.css' % (w, '-italic' if it else ''))):
                    css = re.sub(r'font-weight:\s*\d+', 'font-weight: %d' % w, css)
                out.append(css)
    return '\n'.join(out)


def parse_viewport(v):
    presets = {'phone': (390, 844, True), 'land': (844, 390, True), 'desk': (1280, 800, False)}
    if v in presets:
        return presets[v]
    w, h = [int(x) for x in v.lower().split('x')]
    return w, h, w < 1000


DUMP_JS = r"""
() => {
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 &&
      r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
  const out = [];
  const seen = new Set();
  const cands = document.querySelectorAll('button,a,[role=button],[onclick],input,select,textarea,[data-act],[data-action],.btn,[class*=btn],[class*=card],[tabindex]');
  for (const el of cands) {
    if (!vis(el) || seen.has(el)) continue; seen.add(el);
    const r = el.getBoundingClientRect();
    const t = (el.innerText || el.value || el.getAttribute('aria-label') || el.title || '').trim().replace(/\s+/g, ' ').slice(0, 50);
    out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} [${Math.round(r.x + r.width / 2)},${Math.round(r.y + r.height / 2)}] ${Math.round(r.width)}x${Math.round(r.height)} "${t}"`);
    if (out.length > 120) break;
  }
  const canv = [...document.querySelectorAll('canvas')].filter(vis).map(c => { const r = c.getBoundingClientRect(); return `canvas ${Math.round(r.width)}x${Math.round(r.height)} @${Math.round(r.x)},${Math.round(r.y)}`; });
  const text = (document.body ? document.body.innerText : '').replace(/\n{3,}/g, '\n\n').slice(0, 3000);
  return 'CLICKABLE:\n' + out.join('\n') + '\n\nCANVAS:\n' + canv.join('\n') + '\n\nVISIBLE TEXT:\n' + text;
}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--game', required=True, help='build folder under raw/, e.g. tideline (or a path under /games/...)')
    ap.add_argument('--out', required=True)
    ap.add_argument('--viewport', default='phone')
    ap.add_argument('--dpr', type=float, default=1)
    ap.add_argument('--touch', dest='touch', action='store_true', default=None)
    ap.add_argument('--no-touch', dest='touch', action='store_false')
    ap.add_argument('--steps', default='[]')
    ap.add_argument('--query', default='', help='extra ?query for the page URL')
    ap.add_argument('--init', default='', help='JS to run before any page script (e.g. seed localStorage)')
    ap.add_argument('--timeout', type=int, default=180)
    ap.add_argument('--site', default='', help='serve this directory at / instead of raw games (for testing the library app)')
    ap.add_argument('--path', default='index.html', help='with --site: page path (may include #hash)')
    a = ap.parse_args()

    steps = json.load(open(a.steps)) if os.path.exists(a.steps) else json.loads(a.steps)
    os.makedirs(a.out, exist_ok=True)
    w, h, touch = parse_viewport(a.viewport)
    if a.touch is not None:
        touch = a.touch
    srv, port = start_server(site_dir=a.site or None)
    base = 'http://127.0.0.1:%d' % port
    if a.site:
        url = '%s/%s' % (base, a.path.lstrip('/'))
    else:
        url = '%s/games/%s/index.html%s' % (base, a.game.strip('/'), ('?' + a.query) if a.query else '')
    logs = []

    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        mode = os.environ.get('PZ_GPU', 'soft')
        if mode == 'full':      # old behaviour: everything through SwiftShader (slow under load)
            args = ['--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-webgl']
        elif mode == 'nogpu':   # fastest; no WebGL
            args = ['--autoplay-policy=no-user-gesture-required', '--disable-gpu', '--disable-gpu-compositing']
        else:                   # default: software compositing (fast) but WebGL still available through SwiftShader
            args = ['--autoplay-policy=no-user-gesture-required', '--disable-gpu-compositing', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl']
        br = p.chromium.launch(args=args)
        ctx = br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=a.dpr,
                             is_mobile=touch, has_touch=touch, locale='zh-TW', timezone_id='Asia/Taipei',
                             user_agent=('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' if touch else None))

        def route_fonts(route):
            u = urllib.parse.urlparse(route.request.url)
            route.fulfill(status=200, content_type='text/css; charset=utf-8', body=font_css(u.query, base))

        def route_vendor(route):
            # map CDN libraries to local copies under tools/vendor/<host>/<path>
            u = urllib.parse.urlparse(route.request.url)
            local = os.path.join(VENDOR_DIR, u.netloc, u.path.lstrip('/'))
            if os.path.isfile(local):
                ct = 'application/javascript' if local.endswith(('.js', '.mjs')) else 'application/octet-stream'
                route.fulfill(status=200, content_type=ct, body=open(local, 'rb').read(), headers={'Access-Control-Allow-Origin': '*'})
            else:
                logs.append('[blocked-cdn] ' + route.request.url)
                route.abort()

        ctx.route(re.compile(r'^https://fonts\.googleapis\.com/.*'), route_fonts)
        ctx.route(re.compile(r'^https://fonts\.gstatic\.com/.*'), lambda r: r.abort())
        ctx.route(re.compile(r'^https://(cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|esm\.sh)/.*'), route_vendor)
        if a.init:
            ctx.add_init_script(a.init)
        page = ctx.new_page()
        page.on('console', lambda m: logs.append('[%s] %s' % (m.type, m.text)) if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: logs.append('[pageerror] %s' % e))
        if os.environ.get('PZ_NETLOG'):
            page.on('requestfailed', lambda r: logs.append('[reqfail] %s %s' % (r.url[:160], r.failure)))
            page.on('response', lambda r: logs.append('[http%d] %s' % (r.status, r.url[:160])) if r.status >= 400 else None)
        page.set_default_timeout(15000)
        t0 = time.time()
        page.goto(url, wait_until='load', timeout=60000)

        def run(steps):
            for st in steps:
                if time.time() - t0 > a.timeout:
                    print('!! timeout, stopping'); return
                k = next(iter(st))
                v = st[k]
                try:
                    if k == 'wait':
                        page.wait_for_timeout(v)
                    elif k == 'shot':
                        fn = os.path.join(a.out, v + ('' if v.endswith('.png') else '.png'))
                        page.screenshot(path=fn, timeout=120000)
                        print('shot', fn)
                    elif k == 'click':
                        page.locator(v).first.click(timeout=6000, force=True)
                    elif k == 'click_text':
                        loc = page.get_by_text(v, exact=False)
                        n = loc.count(); done = False
                        for i in range(min(n, 12)):
                            el = loc.nth(i)
                            if el.is_visible():
                                el.click(timeout=6000, force=True); done = True; break
                        if not done:
                            print('!! click_text not found/visible:', v)
                    elif k in ('tap', 'dblclick'):
                        x, y = v
                        if k == 'dblclick':
                            page.mouse.dblclick(x, y)
                        elif touch:
                            page.touchscreen.tap(x, y)
                        else:
                            page.mouse.click(x, y)
                    elif k == 'drag':
                        x1, y1, x2, y2 = v[:4]; ms = v[4] if len(v) > 4 else 300
                        if touch:
                            cdp = ctx.new_cdp_session(page)
                            def tp(t, x, y):
                                cdp.send('Input.dispatchTouchEvent', {'type': t, 'touchPoints': ([] if t == 'touchEnd' else [{'x': x, 'y': y}])})
                            tp('touchStart', x1, y1)
                            n = max(4, int(ms / 16))
                            for i in range(1, n + 1):
                                tp('touchMove', x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n); page.wait_for_timeout(16)
                            tp('touchEnd', x2, y2)
                        else:
                            page.mouse.move(x1, y1); page.mouse.down()
                            n = max(4, int(ms / 16))
                            for i in range(1, n + 1):
                                page.mouse.move(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n); page.wait_for_timeout(16)
                            page.mouse.up()
                    elif k == 'key':
                        page.keyboard.press(v)
                    elif k == 'hold':
                        page.keyboard.down(v[0]); page.wait_for_timeout(v[1]); page.keyboard.up(v[0])
                    elif k == 'keys_down':
                        for kk in v: page.keyboard.down(kk)
                    elif k == 'keys_up':
                        for kk in v: page.keyboard.up(kk)
                    elif k == 'type':
                        page.keyboard.type(v)
                    elif k == 'eval':
                        r = page.evaluate(v)
                        if r is not None: print('eval ->', str(r)[:500])
                    elif k == 'log':
                        print('log', v, '->', str(page.evaluate(v))[:800])
                    elif k == 'wait_for':
                        page.wait_for_selector(v, timeout=8000, state='visible')
                    elif k == 'dump':
                        txt = page.evaluate(DUMP_JS)
                        fn = os.path.join(a.out, v + '.txt')
                        open(fn, 'w', encoding='utf-8').write(txt)
                        print('dump', fn, '(%d chars)' % len(txt))
                    elif k == 'move':
                        page.mouse.move(v[0], v[1], steps=int(v[2]) if len(v) > 2 else 8)
                    elif k == 'offline':
                        ctx.set_offline(bool(v))
                    elif k == 'goto':
                        page.goto(base + '/' + str(v).lstrip('/'), wait_until='load', timeout=60000)
                    elif k == 'reload':
                        page.reload(wait_until='load', timeout=60000)
                    elif k == 'repeat':
                        for _ in range(int(v)):
                            run(st.get('steps', []))
                    else:
                        print('!! unknown step', st)
                except Exception as e:
                    print('!! step failed', st, '->', str(e).split('\n')[0][:300])
        run(steps)
        open(os.path.join(a.out, 'console.txt'), 'w', encoding='utf-8').write('\n'.join(logs))
        errs = [l for l in logs if l.startswith('[pageerror]') or l.startswith('[error]')]
        print('console: %d lines, %d errors%s' % (len(logs), len(errs), (' — first: ' + errs[0][:300]) if errs else ''))
        br.close()
    srv.shutdown()


if __name__ == '__main__':
    main()
