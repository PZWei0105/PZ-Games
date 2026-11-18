#!/usr/bin/env python3
"""效能量測：模擬手機（CPU 降速 4 倍、4G 網路、伺服器跟 GitHub Pages 一樣 gzip），量開 App 和各頁要多久、吃多少記憶體。

  python3 _build/apps/unpacked/tools/perf.py <網站根目錄> [--label 名稱] [--json 輸出檔] [--cpu 4] [--net 4g|wifi|none]

量的東西：
- 冷開（第一次開，沒有快取）、熱開（重新整理，有快取）：從開始載入到首頁海報出現的時間。
- 每一頁（庫存、推坑牆、短影音、獵價、日曆、行情板、TGA、點播台、一篇專題、一篇推坑）：換頁到畫面出來的時間、DOM 節點數、JS 記憶體。
外部圖片一律換成 1×1 的小圖、影片不載（只量 App 自己）。
"""
import argparse, gzip, http.server, io, json, os, socketserver, sys, threading, time
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('root')
ap.add_argument('--label', default='')
ap.add_argument('--json', default='')
ap.add_argument('--cpu', type=float, default=4)
ap.add_argument('--net', default='4g')
a = ap.parse_args()
ROOT = os.path.abspath(a.root)
NET = {'4g': (9e6 / 8, 1.5e6 / 8, 60), 'wifi': (40e6 / 8, 10e6 / 8, 20), 'none': None}[a.net]
TINY = bytes.fromhex('ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda0008010100003f00fbfcffd9')


class H(http.server.SimpleHTTPRequestHandler):
    """跟 GitHub Pages 一樣：文字檔 gzip 壓縮後傳。"""
    def __init__(self, *x, **k):
        super().__init__(*x, directory=ROOT, **k)

    def log_message(self, *x):
        pass

    def do_GET(self):
        path = self.translate_path(self.path.split('?')[0])
        if os.path.isdir(path):
            path = os.path.join(path, 'index.html')
        if not os.path.isfile(path):
            return super().do_GET()
        ext = os.path.splitext(path)[1]
        raw = open(path, 'rb').read()
        ctype = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
                 '.webmanifest': 'application/manifest+json', '.ics': 'text/calendar'}.get(ext, self.guess_type(path))
        body, enc = raw, None
        if ext in ('.html', '.js', '.mjs', '.json', '.css', '.webmanifest', '.ics') and 'gzip' in (self.headers.get('Accept-Encoding') or ''):
            body, enc = gzip.compress(raw, 6), 'gzip'
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'max-age=600')
        if enc:
            self.send_header('Content-Encoding', enc)
        self.end_headers()
        self.wfile.write(body)


class TS(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


srv = TS(('127.0.0.1', 0), H)
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

TODAY = time.strftime('%Y-%m-%d', time.gmtime(time.time() + 8 * 3600))
INIT = """(() => { try {
  const k = (n) => 'unpacked.v1.' + n;
  for (const [n, v] of [['huntAlertDay', '%s'], ['introDay', '%s'], ['shHint', 1], ['shWantTip', 1]]) if (localStorage.getItem(k(n)) == null) localStorage.setItem(k(n), JSON.stringify(v));
  const s = JSON.parse(localStorage.getItem(k('settings')) || '{}'); s.intro = 'off'; s.huntAlert = false; localStorage.setItem(k('settings'), JSON.stringify(s));
} catch (e) {}
  window.__homeAt = 0;
  new MutationObserver((m, o) => { if (!window.__homeAt && document.querySelector('.posters')) { window.__homeAt = performance.now(); o.disconnect(); } })
    .observe(document, { childList: true, subtree: true });
})();""" % (TODAY, TODAY)

NAV = """async ([hash, sel]) => {
  document.querySelectorAll(sel).forEach((e) => e.setAttribute('data-perf-old', '1'));   // 舊頁面留下的不算
  const fresh = sel.split(',').map((s) => s.trim() + ':not([data-perf-old])').join(',');
  const want = decodeURIComponent(hash.slice(1));
  const t0 = performance.now(); location.hash = hash;
  const until = t0 + 20000;
  while (performance.now() < until) {
    await new Promise((r) => requestAnimationFrame(r));
    if (typeof ROUTE !== 'undefined' && ROUTE.startsWith(want) && document.querySelector(fresh)) break;
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return Math.round(performance.now() - t0);
}"""


def metrics(cdp):
    m = {x['name']: x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
    return round(m.get('JSHeapUsedSize', 0) / 1e6, 1), int(m.get('Nodes', 0))


def run():
    res = {'label': a.label or os.path.basename(ROOT), 'cpu': a.cpu, 'net': a.net, 'routes': {}}
    data = os.path.join(ROOT, 'data')
    try:
        idx = json.load(open(os.path.join(data, 'index.json'), encoding='utf-8'))
        pk = json.load(open(os.path.join(data, 'picks.json'), encoding='utf-8'))
        res['items'] = {'features': len(idx['items']), 'picks': len(pk['items'])}
        fid, pid = idx['items'][len(idx['items']) // 2]['id'], pk['items'][len(pk['items']) // 2]['id']
    except (FileNotFoundError, ValueError, IndexError, KeyError):
        fid = pid = None
    res['bytes'] = {n: os.path.getsize(os.path.join(data, n)) for n in ('index.json', 'picks.json', 'live.json', 'wish.json') if os.path.exists(os.path.join(data, n))}
    res['gzip'] = {n: len(gzip.compress(open(os.path.join(data, n), 'rb').read(), 6)) for n in res['bytes']}
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
        ctx.add_init_script(INIT)
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))

        def handle(route):
            u = route.request.url
            if '127.0.0.1' in u:
                return route.continue_()
            if any(h in u for h in ('i.ytimg.com', 'steamstatic.com', 'images.weserv.nl', 'gmedia.playstation.com', 'nflximg.net', 'epicgames.com', 'gog-statics.com')) and not any(e in u for e in ('.mp4', '.webm', '.m3u8', '.m4s')):
                return route.fulfill(status=200, content_type='image/jpeg', body=TINY, headers={'Access-Control-Allow-Origin': '*'})
            if 'ntfy.sh' in u:
                return route.fulfill(status=200, body=b'{}', headers={'Access-Control-Allow-Origin': '*'})
            return route.abort()
        pg.route('**/*', handle)
        cdp = ctx.new_cdp_session(pg)
        cdp.send('Performance.enable')
        if a.cpu and a.cpu > 1:
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': a.cpu})
        if NET:
            cdp.send('Network.enable')
            cdp.send('Network.emulateNetworkConditions', {'offline': False, 'downloadThroughput': NET[0], 'uploadThroughput': NET[1], 'latency': NET[2]})
        url = f'http://127.0.0.1:{port}/index.html?enter=1'
        for kind in ('cold', 'warm'):
            if kind == 'cold':
                pg.goto(url, wait_until='commit')
            else:
                pg.reload(wait_until='commit')
            pg.wait_for_function('window.__homeAt > 0', timeout=60000)
            res[kind + '_ms'] = round(pg.evaluate('window.__homeAt'))
            pg.wait_for_timeout(1500)
            res[kind + '_heap_mb'], res[kind + '_nodes'] = metrics(cdp)
        routes = [('#lib', '#libgrid'), ('#picks', '.pks'), ('#shorts', '#shfeed'), ('#hunt', '.radar'), ('#cal', '.ce-b, .cn-b, .empty'),
                  ('#board', '.mk-row, .empty'), ('#tga', '.tg-cats'), ('#ask', '.ask-hero'), ('#fan', '.drafts'), ('#home', '.posters')]
        if fid:
            routes.insert(0, (f'#f/{fid}', '.ftabs'))
        if pid:
            routes.insert(1, (f'#p/{pid}', '.ftabs'))
        for h, sel in routes:
            try:
                ms = pg.evaluate(NAV, [h, sel])
            except Exception as e:  # noqa: BLE001
                ms = None
                errs.append(f'{h}: {e}')
            pg.wait_for_timeout(900)
            heap, nodes = metrics(cdp)
            res['routes'][h.split('/')[0]] = {'ms': ms, 'heap_mb': heap, 'nodes': nodes}
        res['errors'] = errs[:8]
        b.close()
    return res


r = run()
srv.shutdown()
print(f"== {r['label']}（CPU ÷{r['cpu']:g}、網路 {r['net']}）  專題 {r.get('items', {}).get('features')}、推坑 {r.get('items', {}).get('picks')}")
print('   檔案：' + '、'.join(f"{k} {v / 1e6:.2f}MB（壓縮後 {r['gzip'][k] / 1e6:.2f}MB）" for k, v in r['bytes'].items()))
print(f"   冷開 {r['cold_ms']} ms・記憶體 {r['cold_heap_mb']} MB・節點 {r['cold_nodes']}｜熱開 {r['warm_ms']} ms・記憶體 {r['warm_heap_mb']} MB")
for k, v in r['routes'].items():
    print(f"   {k:8s} {str(v['ms']):>6} ms   記憶體 {v['heap_mb']:>6} MB   節點 {v['nodes']}")
if r['errors']:
    print('   錯誤：', r['errors'])
if a.json:
    json.dump(r, open(a.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
