#!/usr/bin/env python3
"""在 WebKit（iPhone Safari 的引擎）裡檢查引擎：Chromium 過了不代表 iPhone 會過。

用法（在 _build/engine 裡）：
  python3 tools/webkit_check.py selftest                 # 引擎自我檢查（tests/browser/selftest.html）
  python3 tools/webkit_check.py page <網址路徑> [--js 程式] [--wait 秒]
      網址路徑相對 repo 根目錄，例如 _build/sources/last-order/dist/web/index.html
      --js：載入後執行的程式（可以 await；最後 return 的值會印出來）

第一次要先裝（雲端沙盒可以用 apt）：
  apt-get update && apt-get install -y xvfb gir1.2-webkit2-4.1 python3-gi
注意：這是 Linux 版的 WebKit（WebKitGTK），JavaScript 引擎、CSS、WebGL 規則跟 iPhone Safari 同一套，
但記憶體、觸控、聲音的行為不一樣（沒有音效卡、沒有手指）；只用來抓「Safari 才會壞」的程式與畫面問題。
"""
import http.server
import json
import os
import socketserver
import subprocess
import sys
import threading
import time

try:
    import gi
    gi.require_version('Gtk', '3.0')
    gi.require_version('WebKit2', '4.1')
except (ImportError, ValueError):
    # apt 的 python3-gi 是給系統 Python 用的：換成系統 Python 重跑
    for exe in ('/usr/bin/python3.12', '/usr/bin/python3.11', '/usr/bin/python3.10'):
        if os.path.exists(exe) and os.path.realpath(exe) != os.path.realpath(sys.executable) and not os.environ.get('PZ_WK_REEXEC'):
            os.environ['PZ_WK_REEXEC'] = '1'
            os.execv(exe, [exe] + sys.argv)
    sys.exit('找不到 WebKitGTK：先執行 apt-get update && apt-get install -y xvfb gir1.2-webkit2-4.1 python3-gi')

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
IPHONE_UA = ('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 '
             '(KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1')
# 收集錯誤：WebKitGTK 沒有把主控台訊息交給 Python，所以在頁面裡自己記
CATCH = """(() => { window.__wkErr = [];
  const keep = (m) => { try { window.__wkErr.push(String(m).slice(0, 300)); } catch (e) {} };
  addEventListener('error', (e) => keep((e.message || 'error') + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  addEventListener('unhandledrejection', (e) => keep('Promise: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  const ce = console.error; console.error = function () { keep([...arguments].join(' ')); return ce.apply(this, arguments); };
})();"""


def serve(root):
    class Q(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k): super().__init__(*a, directory=root, **k)
        def log_message(self, *a): pass
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Q)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    args = sys.argv[1:]
    if not args or args[0] not in ('selftest', 'page'):
        sys.exit(__doc__)
    mode = args[0]
    path = '_build/engine/tests/browser/selftest.html' if mode == 'selftest' else args[1]
    user_js = args[args.index('--js') + 1] if '--js' in args else ''
    wait = float(args[args.index('--wait') + 1]) if '--wait' in args else 2.5
    W, H, SCALE = 390, 844, 2
    if not os.environ.get('DISPLAY'):
        subprocess.Popen(['Xvfb', ':96', '-screen', '0', '%dx%dx24' % (W * SCALE + 64, H * SCALE + 64)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        os.environ['DISPLAY'] = ':96'; time.sleep(1.5)
    os.environ['GDK_SCALE'] = str(SCALE)
    sys.stdout.reconfigure(line_buffering=True)
    os.dup2(os.open('/tmp/pz-webkit.log', os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644), 2)  # GTK 很吵：stderr 收到檔案
    from gi.repository import GLib, Gtk, WebKit2

    httpd = serve(REPO)
    url = 'http://127.0.0.1:%d/%s' % (httpd.server_address[1], path)
    win = Gtk.Window(); win.set_default_size(W, H)
    ctx = WebKit2.WebContext.new_ephemeral()
    ucm = WebKit2.UserContentManager()
    ucm.add_script(WebKit2.UserScript(CATCH, WebKit2.UserContentInjectedFrames.TOP_FRAME, WebKit2.UserScriptInjectionTime.START, None, None))
    wv = WebKit2.WebView(web_context=ctx, user_content_manager=ucm)
    st = wv.get_settings()
    st.set_hardware_acceleration_policy(WebKit2.HardwareAccelerationPolicy.ALWAYS)
    st.set_enable_webgl(True)
    st.set_user_agent(IPHONE_UA)
    try: st.set_enable_write_console_messages_to_stdout(False)
    except Exception: pass
    win.add(wv); win.show_all()
    state = {'out': None, 'code': 1}

    def js(code, cb):
        def done(view, res, _):
            try:
                v = view.evaluate_javascript_finish(res); val = v.to_string() if v else None
            except Exception as e:
                val = 'JS 錯誤：' + str(e)
            cb(val)
        wv.evaluate_javascript(code, -1, None, None, None, done, None)

    def finish(code):
        state['code'] = code; Gtk.main_quit(); return False

    def poll(t0, timeout):
        def got(v):
            if v and v != 'undefined' and v != 'null':
                report(v); return
            if time.time() - t0 > timeout:
                print('  ✗ 等太久沒有結果（%d 秒）' % timeout); js('JSON.stringify(window.__wkErr)', lambda e: (print('  錯誤：', e), finish(1)))
                return
            GLib.timeout_add(400, lambda: poll(t0, timeout))
        js('window.__wkOut', got)
        return False

    def report(v):
        errs_js = 'JSON.stringify({ errs: window.__wkErr, pz: (window.PZ && PZ.debug) ? PZ.debug.errors.map(e => e.msg) : [], gfx: window.PZ && PZ.gfx ? PZ.gfx.kind : "", webgl2: !!document.createElement("canvas").getContext("webgl2") })'
        def got_errs(e):
            info = json.loads(e) if e else {}
            ok = True
            if mode == 'selftest':
                res = json.loads(v)
                bad = [r for r in res if not r['ok']]
                for r in res:
                    if not r['ok']: print('  ✗ %s（%s）' % (r['name'], r['info']))
                print('  WebKit 自我檢查：%d/%d 通過（繪圖器 %s；這台 WebKit 有 WebGL2：%s）' % (len(res) - len(bad), len(res), info.get('gfx'), info.get('webgl2')))
                ok = not bad
            else:
                print('  結果：', v[:600])
                print('  繪圖器：%s（這台 WebKit 有 WebGL2：%s）' % (info.get('gfx'), info.get('webgl2')))
            errs = (info.get('errs') or []) + (info.get('pz') or [])
            for x in errs[:12]: print('  錯誤：', x)
            if errs: ok = False
            print('全部通過' if ok else '有問題')
            finish(0 if ok else 1)
        js(errs_js, got_errs)

    def loaded(view, ev):
        if ev != WebKit2.LoadEvent.FINISHED: return
        def go():
            if mode == 'selftest':
                js('window.__selftest().then(r => { window.__wkOut = JSON.stringify(r); }, e => { window.__wkOut = JSON.stringify([{ name: "selftest 丟出錯誤", ok: false, info: String(e && e.stack || e) }]); }); "started"', lambda _: None)
                GLib.timeout_add(500, lambda: poll(time.time(), 120))
            else:
                body = user_js or 'return "ok"'
                js('(async () => { %s })().then(r => { window.__wkOut = JSON.stringify(r === undefined ? null : r) || "null"; }, e => { window.__wkOut = JSON.stringify("丟出錯誤：" + (e && e.stack || e)); }); "started"' % body, lambda _: None)
                GLib.timeout_add(500, lambda: poll(time.time(), 90))
            return False
        GLib.timeout_add(int(wait * 1000), go)
    wv.connect('load-changed', loaded)
    wv.connect('web-process-terminated', lambda v, r: (print('  ✗ 網頁程序當掉了：', r), finish(1)))
    print('WebKit：' + path)
    wv.load_uri(url)
    GLib.timeout_add(240000, lambda: (print('  ✗ 整體逾時'), finish(1)))
    Gtk.main()
    httpd.shutdown()
    sys.exit(state['code'])


if __name__ == '__main__':
    main()
