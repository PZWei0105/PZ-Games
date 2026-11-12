#!/usr/bin/env python3
"""本機道場 LOCAL DOJO 上線前檢查：build.py 之後、推上去之前跑。

  python3 _build/apps/local-dojo/check.py                              # 網頁版（apps/local-dojo/），手機 390、電腦 1440
  python3 _build/apps/local-dojo/check.py --claude /tmp/dojo-claude    # 另外檢查 build.py --claude-out 輸出的 Claude 版

課程資料  六關、每關四課；每課有卡片、存在的互動元件、驗收（至少 3 題、選項不重複、有解析）、想一想；
          用到的名詞都在名詞表；關主考驗的選項不重複
每一頁    首頁、24 課、6 個關主考驗、複習、工具（每一個）、我的：打開沒有程式錯誤；每課的互動元件真的畫出東西，
          沒有出現「這個元件載入失敗」
其他      第一次打開會出現歡迎畫面；網頁版關掉伺服器（離線）還打得開；Claude 版沒有雲端時退回只存本機也能用
需要 Playwright（雲端沙盒已裝好 Chromium，不要執行 playwright install）。截圖在 --out（預設 /tmp/dojo-check）。
有 BAD 時 exit code 1。
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO, '_build', 'tools'))
from smoke import DESK, PHONE, serve, short, stop  # noqa: E402  (standard library only)

SKIP_INTRO = "try { if (!localStorage.getItem('pzdojo.v1')) localStorage.setItem('pzdojo.v1', JSON.stringify({ v: 1, intro: true, seenLog: '9999' })); } catch (e) {}"  # 跳過歡迎畫面和更新提示，截圖才不會被蓋住
LINT = r"""(() => {
  const D = window.DOJO, bad = [];
  if (!D || !D.stages) return ['讀不到課程資料（window.DOJO）'];
  if (D.stages.length !== 6) bad.push('關數不是 6，而是 ' + D.stages.length);
  const terms = D.terms || {};
  const opts = (at, x, i) => { const o = x.o || []; if (o.length < 2) bad.push(at + ' 第 ' + (i + 1) + ' 題選項不到 2 個');
    if (new Set(o).size !== o.length) bad.push(at + ' 第 ' + (i + 1) + ' 題有重複選項'); };
  for (const s of D.stages) {
    if ((s.lessons || []).length !== 4) bad.push('第 ' + s.n + ' 關不是四課');
    for (const l of s.lessons || []) {
      const at = l.id + '《' + l.title + '》';
      if (!(l.cards || []).length) bad.push(at + ' 沒有卡片');
      if (l.widget && !(D.W && D.W[l.widget])) bad.push(at + ' 的互動元件 ' + l.widget + ' 不存在');
      const q = l.quiz || [];
      if (q.length < 3) bad.push(at + ' 驗收少於 3 題');
      q.forEach((x, i) => { opts(at + ' 驗收', x, i); if (!x.why) bad.push(at + ' 驗收第 ' + (i + 1) + ' 題沒有解析'); });
      if (!l.think) bad.push(at + ' 沒有「想一想」');
      (l.terms || []).forEach((t) => { if (!terms[t]) bad.push(at + ' 用到的名詞「' + t + '」不在名詞表'); });
    }
    (s.exam || []).forEach((x, i) => opts('第 ' + s.n + ' 關關主考驗', x, i));
    if (!(s.exam || []).length) bad.push('第 ' + s.n + ' 關沒有關主考驗');
  }
  const log = D.changelog || [];
  if (log.length && !(log[0].d && log[0].t)) bad.push('更新紀錄最前面那筆少了日期或說明');
  return bad;
})()"""


def pages_of(pg):
    info = pg.evaluate("""(() => ({ lessons: DOJO.stages.flatMap((s) => s.lessons.map((l) => l.id)), stages: DOJO.stages.map((s) => s.id) }))()""")
    pg.evaluate("location.hash = 'tools'")
    pg.wait_for_timeout(400)
    tools = pg.evaluate("[...document.querySelectorAll('[data-go^=\"#tool-\"]')].map((b) => b.dataset.go.slice(1))")
    pages = ['home'] + ['l-' + x for x in info['lessons']] + ['exam-' + x for x in info['stages']] + ['review', 'tools'] + tools + ['me']
    first_lessons = {'l-%s-1' % s[1:] for s in info['stages']}  # one screenshot per stage
    return pages, first_lessons


def walk(br, base, tag, opts, out, R, label, every=True):
    """open every page of one build at one screen size"""
    ctx = br.new_context(**opts)
    ctx.add_init_script(SKIP_INTRO)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(short(getattr(e, 'message', None) or e)))
    d = os.path.join(out, label + '_' + tag)
    os.makedirs(d, exist_ok=True)

    def bad(m):
        R['bad'].append('%s %s：%s' % (label, tag, m))
    try:
        pg.goto(base, wait_until='load')
        pg.wait_for_function("!!(window.DOJO && document.querySelector('#view [data-l]'))", timeout=15000)
        for m in pg.evaluate(LINT) if tag == '390' else []:
            bad('課程資料 ' + m)
        pages, shots = pages_of(pg)
        if not every:
            pages = [p for p in pages if p in ('home', 'l-1-1', 'tools', 'me')]
        for h in pages:
            n0 = len(errs)
            pg.evaluate('(h) => { location.hash = h; }', h)
            pg.wait_for_timeout(450)
            if not pg.evaluate("document.querySelector('#view').children.length"):
                bad('「%s」是空白頁' % h)
            if h.startswith('l-'):
                w = pg.evaluate("""(() => { const el = document.querySelector('[data-widget]'); if (!el) return 'none';
                    if (/元件載入失敗/.test(el.textContent)) return 'fail:' + el.textContent.trim().slice(0, 120);
                    return el.children.length ? 'ok' : 'empty'; })()""")
                if w == 'empty':
                    bad('「%s」的互動元件沒有畫出東西' % h)
                elif w.startswith('fail:'):
                    bad('「%s」%s' % (h, w[5:]))
            if h in shots or h in ('home', 'tools', 'me', 'exam-s1', 'review'):
                try:
                    pg.screenshot(path=os.path.join(d, h + '.png'), timeout=15000)
                except Exception:
                    pass
            for m in errs[n0:]:
                bad('「%s」程式錯誤：%s' % (h, m))
    except Exception as e:
        bad('檢查到一半出錯：' + short(e))
    finally:
        ctx.close()


def first_open(br, base, R):
    ctx = br.new_context(**PHONE)
    pg = ctx.new_page()
    try:
        pg.goto(base, wait_until='load')
        pg.wait_for_function("(() => { const s = document.querySelector('#sheet.on'); return !!(s && /歡迎來到本機道場/.test(s.textContent)); })()", timeout=8000)
    except Exception:
        R['bad'].append('第一次打開沒有出現歡迎畫面')
    finally:
        ctx.close()


def offline(br, site, R, out):
    srv, base = serve(site)
    ctx = br.new_context(**PHONE)
    ctx.add_init_script(SKIP_INTRO)
    pg = ctx.new_page()
    try:
        pg.goto(base + 'apps/local-dojo/', wait_until='load')
        ok = pg.evaluate("""() => new Promise((res) => { if (!('serviceWorker' in navigator)) return res(false);
            navigator.serviceWorker.ready.then(() => res(true)); setTimeout(() => res(false), 20000); })""")
        if not ok:
            R['bad'].append('離線：service worker 沒有啟動（快取清單裡可能有不存在的檔案）')
            return
        pg.wait_for_timeout(1500)
        stop(srv)
        pg.reload(wait_until='domcontentloaded')
        pg.wait_for_function("!!document.querySelector('#view [data-l]')", timeout=15000)
        pg.screenshot(path=os.path.join(out, 'offline_390.png'), timeout=15000)
    except Exception as e:
        R['bad'].append('離線：沒有網路時打不開（%s）' % short(e, 120))
    finally:
        ctx.close()
        stop(srv)


def main():
    ap = argparse.ArgumentParser(description='本機道場的上線前檢查')
    ap.add_argument('--claude', metavar='DIR', help='build.py --claude-out 輸出的資料夾，一起檢查 Claude 版')
    ap.add_argument('--out', default='/tmp/dojo-check')
    a = ap.parse_args()
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)
    if not os.path.exists(os.path.join(REPO, 'apps', 'local-dojo', 'index.html')):
        sys.exit('還沒有網頁版：先執行 python3 _build/apps/local-dojo/build.py')
    R = {'bad': []}
    launch = {'proxy': {'server': 'http://127.0.0.1:9', 'bypass': '127.0.0.1,localhost'}}  # other websites: blocked
    srv, base = serve(REPO)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        br = p.chromium.launch(**launch)
        print('網頁版：每一頁（390、1440）…', flush=True)
        walk(br, base + 'apps/local-dojo/', '390', PHONE, out, R, '網頁版')
        walk(br, base + 'apps/local-dojo/', '1440', DESK, out, R, '網頁版')
        first_open(br, base + 'apps/local-dojo/', R)
        print('網頁版：離線…', flush=True)
        offline(br, REPO, R, out)
        if a.claude:
            print('Claude 版…', flush=True)
            csrv, cbase = serve(os.path.abspath(a.claude))
            walk(br, cbase, '390', PHONE, out, R, 'Claude 版', every=False)
            stop(csrv)
        br.close()
    stop(srv)
    print('\n== 結果 ==')
    if not R['bad']:
        print('沒有問題')
    for m in R['bad']:
        print('  BAD  ' + m)
    print('截圖：' + out)
    json.dump(R, open(os.path.join(out, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sys.exit(1 if R['bad'] else 0)


if __name__ == '__main__':
    main()
