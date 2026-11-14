#!/usr/bin/env python3
"""用真的點擊、觸控檢查：音訊解鎖、背景合成、配樂、虛擬搖桿與按鈕、對話框、劇情對話、設定頁截圖。"""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
from shot import serve
from playwright.sync_api import sync_playwright
httpd = serve('/home/claude/pz-games')
url = f'http://127.0.0.1:{httpd.server_address[1]}/_build/engine/tests/browser/interact.html'
res = []
def ok(name, cond, info=''):
    res.append((name, bool(cond), info)); print(('  ✓ ' if cond else '  ✗ ') + name + ('' if cond else f'  ({info})'))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error',) else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(url); pg.wait_for_timeout(1200)
    ok('還沒碰之前沒有音訊', pg.evaluate('!PZ.audio.ctx'))
    pg.touchscreen.tap(200, 300); pg.wait_for_timeout(300)
    ok('點一下就解鎖音訊', pg.evaluate('PZ.audio.ctx && PZ.audio.ctx.state') == 'running', pg.evaluate('PZ.audio.ctx && PZ.audio.ctx.state'))
    pg.wait_for_timeout(1500)
    n = pg.evaluate('[PZ.sfx.bufs.size, Object.keys(PZ.sfx.defs).length]')
    ok('背景執行緒算好全部音效', n[0] == n[1], n)
    pg.wait_for_timeout(1800)
    pg.evaluate("PZ.sfx.define('lateSound', { layers: [{ w: 'sine', f: 660, t: 0.1 }] })"); pg.wait_for_timeout(800)
    ok('背景執行緒收掉後，新定義的音效還是算得出來', pg.evaluate("PZ.sfx.bufs.has('lateSound')"))
    ok('播放音效', pg.evaluate("!!PZ.sfx.play('hit')"))
    pg.evaluate("PZ.music.play('t', { fade: 0.2 })"); pg.wait_for_timeout(1500)
    ok('配樂在跑', pg.evaluate('PZ.music.cur && PZ.music.cur.step > 8'), pg.evaluate('PZ.music.cur && PZ.music.cur.step'))
    pg.evaluate('PZ.music.intensity(1)'); pg.wait_for_timeout(600)
    ok('緊張度打開旋律層', pg.evaluate("PZ.music.cur.tracks.find(t => t.inst === 'pluck').on"))
    # 觸控按鈕
    box = pg.evaluate("(() => { const r = document.querySelector('.pz-tbtn').getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; })()")
    pg.touchscreen.tap(box[0], box[1]); pg.wait_for_timeout(150)
    ok('觸控按鈕觸發動作', pg.evaluate('window.__log.fire') >= 1, pg.evaluate('window.__log.fire'))
    # 虛擬搖桿：用 CDP 送真的觸控拖曳
    cdp = ctx.new_cdp_session(pg)
    def touch(t, x, y): cdp.send('Input.dispatchTouchEvent', {'type': t, 'touchPoints': [] if t == 'touchEnd' else [{'x': x, 'y': y, 'id': 1}]})
    touch('touchStart', 80, 650)
    for i in range(1, 8): touch('touchMove', 80 + i * 12, 650 - i * 3); pg.wait_for_timeout(30)
    pg.wait_for_timeout(100)
    mag = pg.evaluate('PZ.input.move.mag')
    ok('虛擬搖桿推到底', mag > 0.9, mag)
    touch('touchEnd', 0, 0); pg.wait_for_timeout(100)
    ok('放手就停', pg.evaluate('PZ.input.move.mag') == 0, pg.evaluate('PZ.input.move.mag'))
    # 先用鍵盤（觸控層會藏起來），再直接用手指拖：第一下就要抓到搖桿，不能被畫布吃掉
    pg.evaluate("PZ.input.showTouch('auto')"); pg.keyboard.press('KeyX'); pg.wait_for_timeout(80)
    hidden = pg.evaluate("PZ.screen.touch.classList.contains('pz-hide')")
    touch('touchStart', 80, 650)
    for i in range(1, 8): touch('touchMove', 80 + i * 12, 650 - i * 3); pg.wait_for_timeout(30)
    pg.wait_for_timeout(100)
    mag = pg.evaluate('PZ.input.move.mag')
    ok('換回手指的第一下就抓到搖桿', hidden and mag > 0.9, f'藏起來={hidden} mag={mag}')
    touch('touchEnd', 0, 0); pg.wait_for_timeout(100)
    ok('放手就停（第二次）', pg.evaluate('PZ.input.move.mag') == 0, pg.evaluate('PZ.input.move.mag'))
    # 對話框
    pg.evaluate("() => { window.__cv = null; PZ.ui.confirm({ title: '確定要離開？', body: '進度會自動存檔。', ok: '離開', cancel: '再想想' }).then(v => window.__cv = v); }")
    pg.wait_for_timeout(400)
    ok('對話框出現時暫停', pg.evaluate("PZ.isPaused('modal')"))
    pg.screenshot(path='/tmp/ui_confirm.png')
    pg.click('.pz-modal .pz-btn.primary'); pg.wait_for_timeout(300)
    ok('對話框回傳 true', pg.evaluate('window.__cv') is True, pg.evaluate('window.__cv'))
    ok('關掉後恢復', not pg.evaluate("PZ.isPaused('modal')"))
    # 劇情對話
    pg.evaluate("() => { window.__sayDone = false; PZ.ui.say([['魏子葳', '凌晨三點十二分，手機又亮了。'], [null, '巷口的路燈閃了兩下，像在提醒什麼。'], ['老闆', '這單送完就收工。']]).then(() => window.__sayDone = true); }")
    pg.wait_for_timeout(500); pg.screenshot(path='/tmp/ui_say.png')
    for i in range(8):
        pg.click('.pz-say-box', position={'x': 60, 'y': 60}); pg.wait_for_timeout(250)
        if pg.evaluate('window.__sayDone'): break
    ok('劇情對話點完結束', pg.evaluate('window.__sayDone'))
    ok('對話紀錄', pg.evaluate("PZ.ui.closeSay && true"))
    # 選擇
    pg.evaluate("() => { window.__ask = -1; PZ.ui.ask('要怎麼做？', ['衝進去', '先在門口聽一下', { label: '報警', desc: '手機沒訊號', disabled: true }]).then(i => window.__ask = i); }")
    pg.wait_for_timeout(400); pg.screenshot(path='/tmp/ui_ask.png')
    pg.click('.pz-choices .pz-btn >> nth=1'); pg.wait_for_timeout(200)
    ok('選擇回傳第幾個', pg.evaluate('window.__ask') == 1, pg.evaluate('window.__ask'))
    # 設定頁
    pg.evaluate("() => { PZ.ui.settings({ save: PZ.save.open('interact', { defaults: () => ({ a: 1 }) }) }); }"); pg.wait_for_timeout(500)
    pg.screenshot(path='/tmp/ui_settings.png')
    pg.click('.pz-modal .pz-btn.primary'); pg.wait_for_timeout(200)
    pg.evaluate("() => { PZ.ui.toast('撿到 金幣 ×3', { kind: 'good' }); PZ.ui.banner('BOSS 來襲', { sub: '屍王・陳', style: 'boss' }); }"); pg.wait_for_timeout(450)
    pg.screenshot(path='/tmp/ui_banner.png')
    errs = [l for l in logs if 'favicon' not in l]
    ok('沒有錯誤', not errs and pg.evaluate('PZ.debug.errors.length') == 0, errs[:5])
    b.close()
bad = [r for r in res if not r[1]]
print(f'  互動檢查：{len(res) - len(bad)}/{len(res)} 通過')
sys.exit(1 if bad else 0)
