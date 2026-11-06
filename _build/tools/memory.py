#!/usr/bin/env python3
"""How much memory a game (or the collection) takes in WebKit, the engine of Safari on PZ's iPhone.

When a game 「閃退」 on the iPhone, or Safari shows 「重複發生問題」, the page ran out of memory. Use this to
find what is heavy and to prove that a fix helps. Chromium (smoke.py) cannot answer that: its memory is
nothing like Safari's.

Setup, once per machine (the cloud sandbox allows apt):
  apt-get install -y xvfb gir1.2-webkit2-4.1 python3-gi
Run (from _build; the script finds the Python that apt's WebKit bindings belong to by itself):
  python3 tools/memory.py --game clear-bay               # collection -> 開始遊戲 -> sit 20 s in the game
  python3 tools/memory.py --game clear-bay --steps s.json  # then run scripted steps inside the game
  python3 tools/memory.py --home                         # the collection's home page for 30 s
  python3 tools/memory.py --url http://127.0.0.1:8000/x/ # any page, e.g. an old copy to compare with

Steps file: a JSON list of {"label": "...", "js": "run this first", "wait": ms, "reset": true, "probe": "js"}.
"reset" starts a new peak from that step; "probe" is evaluated after the wait and printed (return a string).
It prints, per step, the WebKit web process' resident memory (rss) and its peak since the last reset, in MB.
These are not iPhone numbers (GTK keeps freed memory), so only compare before vs after on the same machine.
For scale: when the 2026-11-05 crash fixes moved games out of the collection's iframe into their own page,
"collection + game" here went from about 2.1 GB to about 1.1 GB.
"""
import argparse
import json
import os
import subprocess
import sys
import time

try:
    import gi
    gi.require_version('Gtk', '3.0')
    gi.require_version('WebKit2', '4.1')
except (ImportError, ValueError):
    # apt's python3-gi is built for the system Python; re-run under it when this one cannot load it
    for exe in ('/usr/bin/python3.12', '/usr/bin/python3.11', '/usr/bin/python3.10'):
        if os.path.exists(exe) and os.path.realpath(exe) != os.path.realpath(sys.executable) and not os.environ.get('PZGC_MEM_REEXEC'):
            os.environ['PZGC_MEM_REEXEC'] = '1'
            os.execv(exe, [exe] + sys.argv)
    sys.exit('找不到 WebKitGTK：先執行 apt-get install -y xvfb gir1.2-webkit2-4.1 python3-gi')

TOOLS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLS)
from smoke import SITE, serve, stop  # noqa: E402  (standard library only)

SKIP_BOOT = "try { sessionStorage.setItem('pzgc.booted', '1') } catch (e) {}"
IPHONE_UA = ('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 '
             '(KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1')


def descendant(pid, me):
    for _ in range(12):
        try:
            pid = next(int(l.split()[1]) for l in open('/proc/%d/status' % pid) if l.startswith('PPid:'))
        except Exception:
            return False
        if pid == me:
            return True
        if pid <= 1:
            return False
    return False


def web_mem(me):
    """(rss, peak) in MB summed over this run's WebKit web processes"""
    rss = peak = 0
    for p in os.listdir('/proc'):
        if not p.isdigit():
            continue
        try:
            st = dict(l.split(':', 1) for l in open('/proc/%s/status' % p).read().splitlines() if ':' in l)
        except Exception:
            continue
        if 'WebProc' not in st.get('Name', '') or not descendant(int(p), me):
            continue
        rss += int(st.get('VmRSS', '0 kB').split()[0]) // 1024
        peak += int(st.get('VmHWM', '0 kB').split()[0]) // 1024
    return rss, peak


def reset_peak(me):
    for p in os.listdir('/proc'):
        if p.isdigit():
            try:
                if 'WebProc' in open('/proc/%s/comm' % p).read() and descendant(int(p), me):
                    open('/proc/%s/clear_refs' % p, 'w').write('5')
            except Exception:
                pass


def main():
    ap = argparse.ArgumentParser(description='量遊戲或收藏庫在 WebKit（iPhone Safari 的引擎）裡吃多少記憶體')
    what = ap.add_mutually_exclusive_group(required=True)
    what.add_argument('--game', metavar='ID', help='從收藏庫按開始遊戲進這款')
    what.add_argument('--home', action='store_true', help='收藏庫首頁')
    what.add_argument('--url', help='任意網址')
    ap.add_argument('--steps', help='進到遊戲（或網頁）後依序執行的步驟（JSON 檔）')
    ap.add_argument('--sit', type=int, default=20, help='沒有 steps 時停留幾秒（預設 20）')
    ap.add_argument('--size', default='390x844', help='畫面大小（CSS px，預設 iPhone 直拿 390x844）')
    ap.add_argument('--scale', type=int, default=3, help='像素倍率（預設 3，跟 iPhone 一樣）')
    ap.add_argument('--site', default=SITE)
    ap.add_argument('--out', help='每一步的結果另存成 JSON')
    a = ap.parse_args()
    W, H = (int(x) for x in a.size.lower().split('x'))
    xvfb = None
    if not os.environ.get('DISPLAY'):
        xvfb = subprocess.Popen(['Xvfb', ':97', '-screen', '0', '%dx%dx24' % (W * a.scale + 64, H * a.scale + 64)],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        os.environ['DISPLAY'] = ':97'
        time.sleep(1.5)
    os.environ['GDK_SCALE'] = str(a.scale)
    # WebKit, GTK and the sound system talk a lot on stderr (no sound card, no GPU here): keep it in a file
    log = '/tmp/pzgc-memory-webkit.log'
    sys.stdout.reconfigure(line_buffering=True)
    os.dup2(os.open(log, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644), 2)
    from gi.repository import GLib, Gtk, WebKit2

    srv, base = (None, None)
    if not a.url:
        srv, base = serve(os.path.abspath(a.site))
    user = json.load(open(a.steps, encoding='utf-8')) if a.steps else None
    if a.game:
        cat = json.load(open(os.path.join(os.path.abspath(a.site), 'catalog.json'), encoding='utf-8'))
        if a.game not in {g['id'] for g in cat['games']}:
            sys.exit('沒有這款遊戲：' + a.game)
        url = base + '#game-' + a.game
        scen = [{'label': '收藏庫的遊戲頁', 'wait': 5000},
                {'label': '按開始遊戲→遊戲裡', 'reset': True, 'js': '__pz.launch(%s); "go"' % json.dumps(a.game),
                 'wait': (8000 if user else a.sit * 1000),
                 'probe': 'location.pathname + (document.querySelector("pz-hub") ? " (PZ 圓鈕在)" : "")'}]
    elif a.home:
        url = base
        scen = [{'label': '首頁', 'wait': 6000}, {'label': '首頁停 %d 秒' % a.sit, 'reset': True, 'wait': a.sit * 1000}]
    else:
        url = a.url
        scen = [{'label': '打開', 'wait': (5000 if user else a.sit * 1000)}]
    scen += user or []

    me = os.getpid()
    win = Gtk.Window()
    win.set_default_size(W, H)
    ctx = WebKit2.WebContext.new_ephemeral()
    ctx.set_cache_model(WebKit2.CacheModel.WEB_BROWSER)
    ucm = WebKit2.UserContentManager()
    ucm.add_script(WebKit2.UserScript(SKIP_BOOT, WebKit2.UserContentInjectedFrames.TOP_FRAME,
                                      WebKit2.UserScriptInjectionTime.START, None, None))
    wv = WebKit2.WebView(web_context=ctx, user_content_manager=ucm)
    s = wv.get_settings()
    s.set_hardware_acceleration_policy(WebKit2.HardwareAccelerationPolicy.ALWAYS)
    s.set_user_agent(IPHONE_UA)
    win.add(wv)
    win.show_all()
    results, state = [], {'i': -1, 'crashed': False, 'done': False}

    def finish():
        if state['done']:
            return
        state['done'] = True
        if a.out:
            json.dump(results, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        peak = max([r['peak'] for r in results if 'peak' in r] or [0])
        print('\n最高峰值：%d MB%s' % (peak, '（中途當掉了）' if state['crashed'] else ''), flush=True)
        Gtk.main_quit()

    def crashed(view, reason):
        state['crashed'] = True
        results.append({'label': 'CRASH', 'reason': str(reason)})
        print('!! 網頁程序被系統砍掉了（%s）——這就是手機上的閃退' % reason, flush=True)
    wv.connect('web-process-terminated', crashed)

    def js(code, cb):
        def done(view, res, _):
            try:
                v = view.evaluate_javascript_finish(res)
                val = v.to_string() if v else None
            except Exception as e:
                val = 'JS 錯誤：' + str(e)
            cb(val)
        wv.evaluate_javascript(code, -1, None, None, None, done, None)

    def step():
        state['i'] += 1
        if state['i'] >= len(scen) or state['crashed']:
            finish()
            return False
        st = scen[state['i']]
        if st.get('reset'):
            reset_peak(me)

        def measured(pv):
            rss, peak = web_mem(me)
            rec = {'label': st.get('label', 'step %d' % state['i']), 'rss': rss, 'peak': peak, 'probe': pv}
            results.append(rec)
            print('%-22s rss %5d MB   peak %5d MB   %s' % (rec['label'], rss, peak, (pv or '')[:160]), flush=True)
            GLib.timeout_add(50, step)

        def waited():
            if st.get('probe'):
                js(st['probe'], measured)
            else:
                measured(None)
            return False

        def ran(_):
            GLib.timeout_add(int(st.get('wait', 1000)), waited)
        if st.get('js'):
            js(st['js'], ran)
        else:
            ran(None)
        return False

    def loaded(view, ev):
        if ev == WebKit2.LoadEvent.FINISHED and state['i'] < 0:
            GLib.timeout_add(500, step)
    wv.connect('load-changed', loaded)
    GLib.timeout_add_seconds(900, lambda: (finish(), False)[1])
    print('量測 %s（%dx%d @%dx）…' % (a.game or ('首頁' if a.home else url), W, H, a.scale), flush=True)
    wv.load_uri(url)
    Gtk.main()
    if srv:
        stop(srv)
    if xvfb:
        xvfb.terminate()


if __name__ == '__main__':
    main()
