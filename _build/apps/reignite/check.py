#!/usr/bin/env python3
"""重新點火 REIGNITE 上線前檢查：build.py 之後、推上去之前跑。

  python3 _build/apps/reignite/check.py                                # 網頁版（apps/reignite/），手機 390、電腦 1280
  python3 _build/apps/reignite/check.py --claude /tmp/reignite-claude  # 另外檢查 build.py --claude-out 輸出的 Claude 版

規則      趨勢線、平台期、掉太快、偏航、單日跳動、休整日自動補、歡迎歸隊、降級路線升階、章節照順序解鎖、
          抵達目標後第 13 章、魔王血條、Apple Watch 文字、備份碼來回
每一頁    艦橋、航跡、船塢、航誌、醫療艙（示範資料）打開沒有程式錯誤
每個面板  量體重、燃料登錄（存一餐）、引擎試車（安全檢查→計時→記錄；停機路線）、嘴饞警報（小遊戲、呼吸）、
          補給艙、修復模組、閱讀章節、抽血報告、血氧、同步、設定
第一次    開場五步→按住點火→第一章
其他      網頁版關掉伺服器（離線）還打得開；Claude 版沒有雲端時只存本機也能用
需要 Playwright（雲端沙盒已裝好 Chromium，不要執行 playwright install）。截圖在 --out（預設 /tmp/reignite-check）。
有 BAD 時 exit code 1。
"""
import argparse
import functools
import http.server
import json
import os
import socketserver
import sys
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
PHONE = {'viewport': {'width': 390, 'height': 844}, 'device_scale_factor': 2, 'has_touch': True, 'is_mobile': True}
DESK = {'viewport': {'width': 1280, 'height': 860}}

LOGIC = r"""(() => {
  const out = {}, bad = []; const t = RG.today();
  const A = (k, n) => { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const keep = RG.S;
  const base = () => { const s = JSON.parse(JSON.stringify(keep)); Object.assign(s, { intro: true, days: {}, ch: { 1: 1 }, rest: 2, labs: [], wk: null, bestHull: 0, goalAt: null });
    s.p = { name: '痞子葳', w0: 92.5, goal: 83, start: A(t, -140), age: null, rb0: 3, sw0: 2 }; s.lad = { rb: { i: 0, at: A(t, -140) }, sw: { i: 0, at: A(t, -140) } }; return s; };
  const ok = (c, m) => { if (!c) bad.push(m); };
  let s = base(); for (let i = -6; i <= -2; i++) s.days[A(t, i)] = { w: 92 }; s.lastOpen = A(t, -2); RG.S = s;
  let r = RG.dailyCheck(); ok(r.saved === 1 && RG.S.rest === 1 && RG.streak() === 6, '休整日自動補上一天失敗：' + JSON.stringify(r));
  s = base(); for (let i = -9; i <= -5; i++) s.days[A(t, i)] = { w: 92 }; s.lastOpen = A(t, -5); RG.S = s;
  r = RG.dailyCheck(); ok(r.welcome === 4 && RG.S.rest === 2 && RG.totalDays() === 5, '離開四天應該顯示歡迎歸隊、不扣休整日：' + JSON.stringify(r));
  s = base(); s.lad.rb = { i: 0, at: A(t, -8) }; for (let i = -7; i <= -1; i++) s.days[A(t, i)] = { rb: i < -3 ? 3 : 2 }; s.lastOpen = A(t, -1); RG.S = s;
  r = RG.dailyCheck(); ok(r.ups.length === 1 && RG.S.lad.rb.i === 1, '紅牛降級路線第一階沒有升級');
  s = base(); for (let i = -30; i <= 0; i++) s.days[A(t, i)] = { w: 90 + (i % 2 ? 0.3 : -0.2) }; RG.S = s;
  ok(/平台期/.test(RG.coach().head), '平台期沒有偵測到');
  s = base(); for (let i = -30; i <= 0; i++) s.days[A(t, i)] = { w: 88 - i * 0.23 }; RG.S = s;
  ok(RG.coach().tone === 'warn', '一週掉 1.6 公斤沒有警告');
  s = base(); for (let i = -20; i <= 0; i++) s.days[A(t, i)] = { w: 90 + (i > -7 ? 0.6 : 0) }; RG.S = s;
  ok(/偏航/.test(RG.coach().head), '均線上升沒有說偏航');
  s = base(); for (let i = -20; i <= -1; i++) s.days[A(t, i)] = { w: 90 - (i + 20) * 0.05 }; s.days[t] = { w: 90.4 }; RG.S = s;
  ok(/水分/.test(RG.coach().lines[0]), '單日跳動沒有放在第一句解釋');
  s = base(); s.labs = [{ k: A(t, -60), ldl: 160, tg: 200, hdl: 35 }, { k: A(t, -1), ldl: 145, tg: 150, hdl: 38 }]; RG.S = s;
  ok(Math.abs(RG.bossHP() - 0.3) < 1e-6, '魔王血條算錯：' + RG.bossHP());
  s = base(); for (let i = -60; i <= 0; i++) s.days[A(t, i)] = { w: 92.4 }; RG.S = s;
  ok(JSON.stringify(RG.refresh().map((c) => c.id)) === '[2,3]', '章節沒有照順序（船體不夠時應停在第 3 章）');
  s = base(); for (let i = -130; i <= 0; i++) s.days[A(t, i)] = { w: Math.max(82.5, 92.5 - (i + 130) * 0.1) }; RG.S = s;
  const got = RG.refresh().map((c) => c.id); ok(got[got.length - 1] === 12 && RG.S.goalAt === t, '抵達目標沒有解鎖第 12 章');
  RG.S.goalAt = A(t, -31); ok(JSON.stringify(RG.refresh().map((c) => c.id)) === '[13]', '維持 30 天沒有解鎖第 13 章');
  const p = RG.parseSync('REIGNITE w=92.4 kg o=96% s=5,320'); ok(p.w === 92.4 && p.o === 96 && p.s === 5320, 'Apple Watch 文字解析錯誤');
  ok(RG.parseSync('血氧 0.95').o === 95, '血氧小數沒有換算成百分比');
  s = base(); s.days[t] = { w: 90.1 }; RG.S = s; ok(RG.readBackup(RG.backupCode()).days[t].w === 90.1, '備份碼來回失敗');
  RG.S = keep;
  return bad;
})()"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):  # noqa: D401
        pass


def serve(root):
    handler = functools.partial(Quiet, directory=root)
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), handler)
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--claude')
    ap.add_argument('--out', default='/tmp/reignite-check')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    from playwright.sync_api import sync_playwright
    bad, warn = [], []
    srv = serve(REPO); base = 'http://127.0.0.1:%d/apps/reignite/' % srv.server_address[1]

    def page(b, ctx_kw, tag):
        ctx = b.new_context(**ctx_kw)
        ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort()); ctx.route('**/fonts.gstatic.com/**', lambda r: r.abort())
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: bad.append('%s：程式錯誤 %s' % (tag, e)))
        pg.on('console', lambda m: warn.append('%s：%s' % (tag, m.text)) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
        return ctx, pg

    def step(pg, name, fn):
        try:
            fn()
        except Exception as e:  # noqa: BLE001
            bad.append('%s 失敗：%s' % (name, str(e).splitlines()[0]))
            try:
                pg.screenshot(path=os.path.join(a.out, 'fail-%s.png' % name))
            except Exception:  # noqa: BLE001
                pass

    with sync_playwright() as p:
        b = p.chromium.launch()
        # ───── 規則 ─────
        ctx, pg = page(b, PHONE, '規則')
        pg.goto(base); pg.wait_for_timeout(1200)
        for m in pg.evaluate(LOGIC):
            bad.append('規則：' + m)
        ctx.close()
        # ───── 示範資料：每一頁、每個面板 ─────
        for kw, tag in ((PHONE, '手機'), (DESK, '電腦')):
            ctx, pg = page(b, kw, tag)
            pg.goto(base + '?demo=1'); pg.wait_for_timeout(1500)
            for t in ('bridge', 'log', 'dock', 'story', 'med'):
                pg.evaluate("RG.go('%s')" % t); pg.wait_for_timeout(500)
                pg.screenshot(path=os.path.join(a.out, '%s-%s.png' % (tag, t)))
                w = pg.evaluate("document.getElementById('view').scrollWidth - document.getElementById('view').clientWidth")
                if w > 1:
                    bad.append('%s %s 分頁左右超出畫面 %dpx' % (tag, t, w))
            ctx.close()
        ctx, pg = page(b, PHONE, '操作')
        pg.goto(base + '?demo=1#bridge'); pg.wait_for_timeout(1200)
        c = lambda s: pg.click(s)  # noqa: E731

        def weigh():
            c('[data-act="open-w"]'); pg.wait_for_timeout(300); c('[data-act="w-save"]'); pg.wait_for_timeout(800)

        def fuel():
            n0 = pg.evaluate("(RG.S.days[RG.today()].m || []).length")
            c('[data-act="open-f"]'); pg.wait_for_timeout(300); c('[data-act="f-type"][data-v="noodle"]'); c('[data-act="f-tag"][data-v="veg"]'); c('[data-act="f-swap"][data-i="2"]')
            pg.screenshot(path=os.path.join(a.out, 'sheet-fuel.png')); c('[data-act="f-save"]'); pg.wait_for_timeout(900)
            assert pg.evaluate("(RG.S.days[RG.today()].m || []).length") == n0 + 1, '沒有存到這一餐'

        def walk():
            c('[data-act="open-e"]'); pg.wait_for_timeout(300); c('[data-act="e-q"][data-k="q1"][data-v="no"]'); c('[data-act="e-q"][data-k="q2"][data-v="no"]')
            c('[data-act="e-start"]'); pg.wait_for_timeout(1200); pg.screenshot(path=os.path.join(a.out, 'sheet-walk.png'))
            c('[data-act="e-stop"]'); pg.wait_for_timeout(300); c('[data-act="e-feel"][data-v="ok"]'); c('[data-act="e-save"]'); pg.wait_for_timeout(1000)
            assert pg.evaluate("RG.S.days[RG.today()].walk.slice(-1)[0].st") == 'stop', '安全停機沒有記成 stop'
            c('[data-act="open-e"]'); pg.wait_for_timeout(300); c('[data-act="e-q"][data-k="q1"][data-v="yes"]'); pg.wait_for_timeout(200)
            assert pg.query_selector('[data-act="e-skip"]'), '有胸悶頭暈時沒有出現停機'
            c('[data-act="sheet-close"]'); pg.wait_for_timeout(300)

        def crave():
            c('[data-act="crave"]'); pg.wait_for_timeout(400); c('[data-act="cr-what"][data-v="rb"]'); c('[data-act="cr-mode"][data-v="game"]'); pg.wait_for_timeout(2500)
            for i in range(10):
                pg.mouse.click(195, 280 + (i % 5) * 50); pg.wait_for_timeout(100)
            pg.screenshot(path=os.path.join(a.out, 'crave-game.png'))
            c('[data-act="cr-result"]'); pg.wait_for_timeout(200); c('[data-act="cr-done"][data-v="resist"]'); pg.wait_for_timeout(900)
            c('[data-act="crave"]'); pg.wait_for_timeout(300); c('[data-act="cr-what"][data-v="sw"]'); c('[data-act="cr-mode"][data-v="breath"]'); pg.wait_for_timeout(1500)
            pg.screenshot(path=os.path.join(a.out, 'crave-breath.png'))
            c('[data-act="cr-result"]'); pg.wait_for_timeout(200); c('[data-act="cr-done"][data-v="ate"]'); pg.wait_for_timeout(900)
            assert not pg.evaluate("document.body.classList.contains('m-on')"), '嘴饞警報結束後畫面沒有回來'

        def misc():
            if pg.query_selector('[data-act="supply"]'):
                c('[data-act="supply"]'); pg.wait_for_timeout(800)
            pg.evaluate("RG.go('dock')"); pg.wait_for_timeout(300)
            btn = pg.query_selector('[data-act="repair"]:not([disabled])')
            if btn:
                btn.click(); pg.wait_for_timeout(600)
            pg.evaluate("RG.go('story')"); pg.wait_for_timeout(300); c('[data-act="read"][data-id="2"]'); pg.wait_for_timeout(400)
            pg.screenshot(path=os.path.join(a.out, 'reader.png')); c('.reader [data-act="modal-close"]'); pg.wait_for_timeout(300)
            pg.evaluate("RG.go('med')"); pg.wait_for_timeout(300)
            c('[data-act="lab-add"]'); pg.wait_for_timeout(300); pg.fill('#l_ldl', '139'); c('[data-act="lab-save"]'); pg.wait_for_timeout(800)
            c('[data-act="o2-add"]'); pg.wait_for_timeout(300); pg.fill('#o2In', '96'); c('[data-act="o2-save"]'); pg.wait_for_timeout(800)
            c('[data-act="sync"]'); pg.wait_for_timeout(300); pg.fill('#syncTxt', 'REIGNITE w=90.4 o=95'); c('[data-act="sync-apply"]'); pg.wait_for_timeout(800)
            c('[data-act="settings"]'); pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(a.out, 'settings.png')); c('[data-act="sheet-close"]')

        for name, fn in (('量體重', weigh), ('燃料登錄', fuel), ('引擎試車', walk), ('嘴饞警報', crave), ('其他面板', misc)):
            step(pg, name, fn)
        ctx.close()
        # ───── 第一次打開 ─────
        ctx, pg = page(b, PHONE, '第一次')

        def first():
            pg.goto(base); pg.wait_for_timeout(6800); pg.screenshot(path=os.path.join(a.out, 'first-wake.png'))
            c('[data-act="in-next"]'); pg.fill('#iW', '93.4'); pg.fill('#iGoal', '84'); c('[data-act="in-next"]'); c('[data-act="in-next"]')
            pg.check('#iAck'); c('[data-act="in-next"]'); pg.wait_for_timeout(300)
            bb = pg.query_selector('#holdBtn').bounding_box(); pg.mouse.move(bb['x'] + 40, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(1600); pg.mouse.up()
            pg.wait_for_timeout(3200); pg.screenshot(path=os.path.join(a.out, 'first-ch1.png'))
            st = pg.evaluate("({ intro: RG.S.intro, w: RG.S.days[RG.today()].w, ch1: !!RG.S.ch[1], reader: !!document.querySelector('.reader') })")
            assert st['intro'] and st['w'] == 93.4 and st['ch1'] and st['reader'], json.dumps(st)
            # 離線再開一次（service worker）
            pg.wait_for_timeout(800); ctx.set_offline(True); pg.reload(); pg.wait_for_timeout(1500)
            assert pg.evaluate("!!window.RG && RG.S.intro"), '離線打不開'
            ctx.set_offline(False)
        step(pg, '第一次打開', first)
        ctx.close()
        # ───── Claude 版 ─────
        if a.claude:
            csrv = serve(a.claude); ctx, pg = page(b, PHONE, 'Claude 版')

            def claude():
                pg.goto('http://127.0.0.1:%d/index.html' % csrv.server_address[1]); pg.wait_for_timeout(1500)
                assert pg.evaluate("!!window.RG && !window.RG_WEB"), 'Claude 版沒有載入'
                assert pg.query_selector('#intro'), 'Claude 版沒有出現開場'
            step(pg, 'Claude 版', claude)
            ctx.close(); csrv.shutdown()
        b.close()
    srv.shutdown()
    for w in warn:
        print('WARN', w)
    for x in bad:
        print('BAD ', x)
    print('檢查完成：%d 個 BAD、%d 個 WARN。截圖在 %s' % (len(bad), len(warn), a.out))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
