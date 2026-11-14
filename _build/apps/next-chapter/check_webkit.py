#!/usr/bin/env python3
"""下回分解 在 WebKit（iPhone Safari 的引擎）裡走一遍：直排翻頁、書房分頁、搜尋亮字、夜讀、書籤緞帶。

check.py 用 Chromium，測不出 Safari 自己的排版差異（直排、多欄分頁、Highlight API、混色）。
這支用 WebKitGTK 開同一份 App、照痞子葳的用法點一遍，每一步印結果、存截圖。

一台機器裝一次（雲端沙盒可以用 apt）：
  apt-get install -y xvfb gir1.2-webkit2-4.1 python3-gi python3-gi-cairo
執行（從 repo 任何地方都可以；會自己換成 apt 那套 Python）：
  python3 _build/apps/next-chapter/check_webkit.py            # 截圖在 /tmp/pznc-webkit
有 BAD 時 exit code 1；截圖要打開來親眼看。
"""
import functools
import json
import os
import subprocess
import sys
import threading
import time

try:
    import gi
    gi.require_version('Gtk', '3.0')
    gi.require_version('WebKit2', '4.1')
except (ImportError, ValueError):
    for exe in ('/usr/bin/python3.12', '/usr/bin/python3.11', '/usr/bin/python3.10'):
        if os.path.exists(exe) and os.path.realpath(exe) != os.path.realpath(sys.executable) and not os.environ.get('PZNC_WK_REEXEC'):
            os.environ['PZNC_WK_REEXEC'] = '1'
            os.execv(exe, [exe] + sys.argv)
    sys.exit('找不到 WebKitGTK：先執行 apt-get install -y xvfb gir1.2-webkit2-4.1 python3-gi python3-gi-cairo')

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import check  # noqa: E402  （借它的小伺服器：同樣的網址、同樣的檔案）

OUT = '/tmp/pznc-webkit'
W, H, SCALE = 390, 844, 2
IPHONE_UA = ('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 '
             '(KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1')
# 開機前：略過第一次的操作說明、直接用直排
PRESET = "try { if (!sessionStorage.getItem('pznc.wk')) { sessionStorage.setItem('pznc.wk', '1'); localStorage.clear(); localStorage.setItem('pznc.v1.coach', '1'); localStorage.setItem('pznc.v1.settings', JSON.stringify({ vert: true })); } } catch (e) {}"
HELP = r"""
window.__st = () => document.querySelector('#rdStage');
window.__pt = (type, fx, fy) => { const st = __st(), r = st.getBoundingClientRect(); st.dispatchEvent(new PointerEvent(type, { clientX: r.left + r.width * fx, clientY: r.top + r.height * (fy || .55), pointerId: 7, bubbles: true, isPrimary: true, button: 0, pointerType: 'touch' })); };
window.__tap = (fx) => { __pt('pointerdown', fx); __pt('pointerup', fx); };
window.__drag = (a, b, hold) => { __pt('pointerdown', a); for (let i = 1; i <= 8; i++) __pt('pointermove', a + (b - a) * i / 8); if (!hold) __pt('pointerup', b); };
window.__top = () => [...document.querySelectorAll('.leaf')].sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0))[0];
window.__info = () => { const lf = __top(), vp = lf.querySelector('.vp'), f = lf.querySelector('.pf-r').textContent.split('/').map((s) => +s.trim());
  const b = vp.getBoundingClientRect(), vis = [...lf.querySelectorAll('.s')].filter((s) => [...s.getClientRects()].some((q) => q.right > b.left + 2 && q.left < b.right - 2 && q.bottom > b.top + 2 && q.top < b.bottom - 2));
  return { pi: f[0], pages: f[1], rtl: __st().classList.contains('rtl'), v: !!lf.querySelector('.flow.v'), text: vis.map((s) => s.textContent).join('').slice(0, 400), n: vis.length, chrome: document.querySelector('#reader').classList.contains('chrome-on') }; };
'ok';
"""


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))
    xvfb = None
    if not os.environ.get('DISPLAY'):
        xvfb = subprocess.Popen(['Xvfb', ':96', '-screen', '0', '%dx%dx24' % (W * SCALE + 64, H * SCALE + 64)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        os.environ['DISPLAY'] = ':96'
        time.sleep(1.5)
    os.environ['GDK_SCALE'] = str(SCALE)
    sys.stdout.reconfigure(line_buffering=True)
    os.dup2(os.open('/tmp/pznc-webkit.log', os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644), 2)
    from gi.repository import GLib, Gtk, WebKit2

    srv = check.Server(('127.0.0.1', 0), functools.partial(check.Handler, directory=check.REPO))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = 'http://127.0.0.1:%d%s' % (srv.server_address[1], check.APP)

    win = Gtk.Window()
    win.set_default_size(W, H)
    ctx = WebKit2.WebContext.new_ephemeral()
    ucm = WebKit2.UserContentManager()
    ucm.add_script(WebKit2.UserScript(PRESET, WebKit2.UserContentInjectedFrames.TOP_FRAME, WebKit2.UserScriptInjectionTime.START, None, None))
    wv = WebKit2.WebView(web_context=ctx, user_content_manager=ucm)
    s = wv.get_settings()
    s.set_user_agent(IPHONE_UA)
    s.set_enable_write_console_messages_to_stdout(True)
    win.add(wv)
    win.show_all()
    bad, n = [], [0]
    state = {'i': -1}

    def js(code, cb):
        def done(view, res, _):
            try:
                v = view.evaluate_javascript_finish(res)
                val = v.to_string() if v else None
            except Exception as e:
                val = 'JSERR ' + str(e)
            cb(val)
        wv.evaluate_javascript(code, -1, None, None, None, done, None)

    def shot(tag, cb):
        def done(view, res, _):
            try:
                n[0] += 1
                view.get_snapshot_finish(res).write_to_png(os.path.join(OUT, '%02d-%s.png' % (n[0], tag)))
            except Exception as e:
                print('  (截圖失敗：%s)' % e)
            cb()
        wv.get_snapshot(WebKit2.SnapshotRegion.VISIBLE, WebKit2.SnapshotOptions.NONE, None, done, None)

    def info_ok(cond, msg):
        if not cond:
            bad.append(msg)
            print('  BAD ', msg)

    mem = {}
    steps = [
        {'label': '書房', 'wait': 4500, 'js': HELP,
         'probe': "JSON.stringify({ tabs: [...document.querySelectorAll('.gb span')].map((e) => e.textContent), cards: document.querySelectorAll('.bk:not(.add)').length, gbar: !document.querySelector('#gbar').hidden, sort: !!document.querySelector('.sortb') })",
         'check': lambda r: info_ok(r['gbar'] and r['tabs'][:1] == ['全部'] and len(r['tabs']) >= 3 and r['cards'] >= 2 and r['sort'], '書房最下面的分頁或排序沒有出來：%s' % r), 'shot': 'lib'},
        {'label': '分類：恐怖', 'wait': 900, 'js': "[...document.querySelectorAll('.gb')].find((b) => /恐怖/.test(b.textContent)).click(); 'ok'",
         'probe': "JSON.stringify({ titles: [...document.querySelectorAll('.bk:not(.add) .bk-t')].map((e) => e.textContent) })",
         'check': lambda r: info_ok(len(r['titles']) == 1, '選了「恐怖」，書架應該只剩一本：%s' % r), 'shot': 'lib-horror'},
        {'label': '回全部、翻開書（直排）', 'wait': 5000, 'js': "[...document.querySelectorAll('.gb')][0].click(); setTimeout(() => document.querySelector('.hero [data-act=\"continue\"].btn').click(), 300); 'ok'",
         'probe': 'JSON.stringify(__info())', 'check': lambda r: (mem.update(p1=r), info_ok(r['rtl'] and r['v'] and r['pages'] > 8 and r['pi'] == 1 and r['n'] >= 2, '直排沒有排好：%s' % {k: r[k] for k in r if k != 'text'})), 'shot': 'vert-p1'},
        {'label': '直排：點左邊＝下一頁', 'wait': 1200, 'js': '__tap(.1); "ok"', 'probe': 'JSON.stringify(__info())',
         'check': lambda r: (mem.update(p2=r), info_ok(r['pi'] == 2 and r['text'][:20] != mem['p1']['text'][:20], '直排點左邊沒有翻到下一頁：%s' % {k: r[k] for k in r if k != 'text'})), 'shot': 'vert-p2'},
        {'label': '直排：點右邊＝上一頁', 'wait': 1200, 'js': '__tap(.9); "ok"', 'probe': 'JSON.stringify(__info())',
         'check': lambda r: info_ok(r['pi'] == 1, '直排點右邊沒有翻回上一頁：%s' % {k: r[k] for k in r if k != 'text'})},
        {'label': '直排：從左往右拖（停在半路）', 'wait': 300, 'js': '__drag(.08, .62, true); "ok"',
         'probe': "JSON.stringify({ flap: !document.querySelector('#flapC').classList.contains('off') })",
         'check': lambda r: info_ok(r['flap'], '直排拖著翻沒有出現摺起來的頁背'), 'shot': 'vert-fold'},
        {'label': '放手', 'wait': 1100, 'js': "__pt('pointerup', .62); 'ok'", 'probe': 'JSON.stringify(__info())',
         'check': lambda r: info_ok(r['pi'] == 2, '直排拖過半放手沒有翻過去：%s' % {k: r[k] for k in r if k != 'text'})},
        {'label': '書籤緞帶', 'wait': 900, 'js': "document.querySelector('[data-act=\"rd-mark\"]').click(); 'ok'",
         'probe': "JSON.stringify({ on: document.querySelector('#rdRibbon').classList.contains('on'), btn: document.querySelector('[data-act=\"rd-mark\"]').getAttribute('aria-pressed') })",
         'check': lambda r: info_ok(r['on'] and r['btn'] == 'true', '夾了書籤，頁角沒有緞帶：%s' % r), 'shot': 'vert-ribbon'},
        {'label': '搜尋「九皇子」', 'wait': 3500,
         'js': "document.querySelector('[data-act=\"rd-toc\"]').click(); setTimeout(() => { document.querySelector('#sheet .tab[data-tab=\"search\"]').click(); const q = document.querySelector('#sheet .q'); q.value = '九皇子'; q.dispatchEvent(new Event('input', { bubbles: true })); }, 400); 'ok'",
         'probe': "JSON.stringify({ hits: document.querySelectorAll('#sheet .qhit').length, stat: (document.querySelector('#sheet .qstat') || {}).textContent })",
         'check': lambda r: info_ok(r['hits'] > 0, '搜尋沒有結果：%s' % r), 'shot': 'search'},
        {'label': '跳到第一個結果', 'wait': 2500, 'js': "document.querySelector('#sheet .qhit').click(); 'ok'",
         'probe': "JSON.stringify(Object.assign(__info(), { mark: (() => { const m = __top().querySelector('mark.hitm'); if (!m) return ''; const r = m.getBoundingClientRect(), v = __top().querySelector('.vp').getBoundingClientRect(); return m.textContent + (r.left >= v.left - 2 && r.right <= v.right + 2 && r.top >= v.top - 2 && r.bottom <= v.bottom + 2 ? '|在這一頁' : '|不在這一頁'); })() }))",
         'check': lambda r: info_ok(r['mark'] == '九皇子|在這一頁', '跳到搜尋結果以後，找到的字沒有亮在這一頁：%s' % {k: r[k] for k in r if k != 'text'}), 'shot': 'search-hit'},
        {'label': '夜讀：亮度 55%、暖光 70%', 'wait': 900,
         'js': "document.querySelector('[data-act=\"rd-look\"]').click(); setTimeout(() => { for (const [k, v] of [['bright', 55], ['warm', 70]]) { const r = document.querySelector('.lk-sl[data-k=\"' + k + '\"]'); r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); } }, 300); 'ok'",
         'probe': "JSON.stringify({ veil: document.querySelector('#reader').classList.contains('veil'), d: +getComputedStyle(document.querySelector('.rd-veil')).opacity, bg: getComputedStyle(__top().querySelector('.leaf-in')).backgroundColor, pv: getComputedStyle(document.querySelector('.lk-pv')).backgroundColor })",
         'check': lambda r: info_ok(r['veil'] and r['d'] > .3 and r['bg'] not in ('rgb(19, 26, 37)', 'rgba(19, 26, 37, 1)') and r['pv'] == r['bg'], '夜讀的調暗或暖光沒有作用（或預覽框跟頁面不一樣）：%s' % r), 'shot': 'night-sheet'},
        {'label': '夜讀的頁面', 'wait': 700, 'js': "document.querySelector('.sheet-bg').click(); 'ok'", 'probe': "'ok'", 'check': None, 'shot': 'night-page'},
        {'label': '換回橫排、夜讀關掉', 'wait': 2000,
         'js': "document.querySelector('[data-act=\"rd-look\"]').click(); setTimeout(() => { document.querySelector('[data-act=\"set\"][data-k=\"vert\"][data-v=\"0\"]').click(); for (const [k, v] of [['bright', 100], ['warm', 0]]) { const r = document.querySelector('.lk-sl[data-k=\"' + k + '\"]'); r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); } setTimeout(() => document.querySelector('.sheet-bg').click(), 400); }, 300); 'ok'",
         'probe': "JSON.stringify(Object.assign(__info(), { veil: document.querySelector('#reader').classList.contains('veil') }))",
         'check': lambda r: info_ok(not r['rtl'] and not r['v'] and not r['veil'] and '九皇子' in r['text'], '換回橫排以後版面不對，或沒有停在同一句：%s' % {k: r[k] for k in r if k != 'text'}), 'shot': 'horizontal'},
        {'label': '橫排：點右邊＝下一頁', 'wait': 1200, 'js': '__tap(.9); "ok"', 'probe': 'JSON.stringify(__info())',
         'check': lambda r: info_ok(r['pi'] >= 2 or r['text'], '橫排翻頁不動：%s' % {k: r[k] for k in r if k != 'text'})},
    ]

    def step():
        state['i'] += 1
        if state['i'] >= len(steps):
            print('\n%d BAD；截圖在 %s' % (len(bad), OUT))
            state['code'] = 1 if bad else 0
            Gtk.main_quit()
            return False
        st = steps[state['i']]

        def after_probe(val):
            try:
                r = json.loads(val) if val and val[:1] in '{[' else val
            except Exception:
                r = val
            print('%-22s %s' % (st['label'], json.dumps({k: v for k, v in r.items() if k != 'text'}, ensure_ascii=False)[:220] if isinstance(r, dict) else str(r)[:220]))
            if st.get('check') and isinstance(r, dict):
                try:
                    st['check'](r)
                except Exception as e:
                    info_ok(False, '%s：檢查出錯 %s' % (st['label'], e))
            elif st.get('check'):
                info_ok(False, '%s：拿不到結果 %s' % (st['label'], r))
            if st.get('shot'):
                shot(st['shot'], lambda: GLib.timeout_add(80, step))
            else:
                GLib.timeout_add(80, step)

        def waited():
            js(st['probe'], after_probe)
            return False

        def ran(_):
            GLib.timeout_add(st.get('wait', 500), waited)
        js(st['js'], ran) if st.get('js') else ran(None)
        return False

    def loaded(view, ev):
        if ev == WebKit2.LoadEvent.FINISHED and state['i'] < 0:
            GLib.timeout_add(200, step)
    wv.connect('load-changed', loaded)
    wv.load_uri(url)
    GLib.timeout_add(120000, lambda: (print('逾時'), bad.append('逾時'), Gtk.main_quit()))
    Gtk.main()
    srv.shutdown()
    if xvfb:
        xvfb.terminate()
    sys.exit(state.get('code', 1))


if __name__ == '__main__':
    main()
