#!/usr/bin/env python3
"""《最後一單》引擎版：完整流程檢查（舊存檔搬家、鍵盤選單、觸控搖桿、升級、Boss、死亡、效能）。
用法：python3 tests/flow.py [phone|land|desk] [輸出資料夾]
每一項印 ✓／✗，最後印「全部通過」或失敗數；截圖放在輸出資料夾。"""
import sys, os, json
sys.path.insert(0, '/home/claude/pz-games/_build/engine/tools')
from shot import serve
from playwright.sync_api import sync_playwright

mode = sys.argv[1] if len(sys.argv) > 1 else 'phone'
out = sys.argv[2] if len(sys.argv) > 2 else '/tmp/lo-flow'
os.makedirs(out, exist_ok=True)
VP = {'phone': (390, 844, True), 'land': (844, 390, True), 'desk': (1280, 720, False)}[mode]
httpd = serve('/home/claude/pz-games')
url = f'http://127.0.0.1:{httpd.server_address[1]}/_build/sources/last-order/dist/web/index.html'
fails, logs = [], []

def ok(name, cond, info=''):
    print(('  ✓ ' if cond else '  ✗ ') + name + ('' if cond else f'  （{info}）'))
    if not cond: fails.append(name)

OLD = {'unlocked': 3, 'cleared': {'1': True, '2': True}, 'best': {'1': 400}, 'ach': {'first': 1}, 'st': {'kills': 512, 'bat': 40, 'fire': 9, 'deaths': 3, 'combo': 61}, 'endless': 0, 'endlessOpen': True, 'sound': False, 'ending': None, 'tut': True}

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': VP[0], 'height': VP[1]}, device_scale_factor=2 if VP[2] else 1, has_touch=VP[2], is_mobile=VP[2])
    # 舊版（引擎版之前）的存檔放進 localStorage
    ctx.add_init_script(f"if (!localStorage.getItem('lastorder.v1')) localStorage.setItem('lastorder.v1', {json.dumps(json.dumps(OLD))});")
    pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    cdp = ctx.new_cdp_session(pg)
    def touch(t, x, y): cdp.send('Input.dispatchTouchEvent', {'type': t, 'touchPoints': [] if t == 'touchEnd' else [{'x': x, 'y': y, 'id': 1}]})
    J = lambda js: pg.evaluate('() => { ' + js + ' }')
    def until(cond, ms=8000):
        # 等到條件成立（無頭瀏覽器算圖很慢，用遊戲狀態等，不用固定秒數）
        try: pg.wait_for_function('() => { try { return !!(' + cond + '); } catch (e) { return false; } }', timeout=ms); return True
        except Exception: return False
    def settle():
        # 打死殭屍會升級：把升級卡選完再往下測
        for _ in range(12):
            if J("return !G || G.state !== 'levelup'"): return
            pg.wait_for_timeout(420); J("UI.pickCard(0)"); pg.wait_for_timeout(200)

    pg.goto(url); pg.wait_for_timeout(2200)
    J("PZ.settings.set('quality', 'high')")  # 無頭瀏覽器很慢，畫質會自動降；測試要看完整特效
    print('【舊存檔搬家】')
    st = J("return { un: Save.d.unlocked, kills: Save.d.st.kills, ach: Object.keys(Save.d.ach).length, from: Save.store.loadedFrom, sfx: PZ.settings.get('sfx'), music: PZ.settings.get('music'), shared: localStorage.getItem('pz.settings.last'), btn: $('bStart').textContent, sound: Save.d.sound }")
    ok('進度搬過來（解鎖到第三章）', st['un'] == 3, st)
    ok('統計搬過來（擊倒 512）', st['kills'] == 512, st)
    ok('成就搬過來', st['ach'] == 1, st)
    ok('舊版「音效：關」→ 這款音量 0', st['sfx'] == 0 and st['music'] == 0, st)
    ok('不會把靜音帶到別款遊戲', not st['shared'] or 'sfx' not in json.loads(st['shared']), st['shared'])
    ok('標題按鈕顯示「繼續故事」', '繼續' in st['btn'], st['btn'])
    J("PZ.settings.set('sfx', 0.9); PZ.settings.set('music', 0.7);")
    pg.reload(); pg.wait_for_timeout(2000)
    st = J("return { un: Save.d.unlocked, from: Save.store.loadedFrom, sfx: PZ.settings.get('sfx') }")
    ok('第二次開：讀新存檔、不再重搬', st['un'] == 3 and st['from'] in ('local', 'main', 'storage') and st['sfx'] == 0.9, st)
    pg.screenshot(path=f'{out}/1_title.png')

    print('【鍵盤／手把選單】')
    pg.wait_for_timeout(500)
    pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(120)
    f1 = J("return PZ.ui.focus && PZ.ui.focus.id")
    pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(120)
    f2 = J("return PZ.ui.focus && PZ.ui.focus.id")
    ok('方向鍵移動焦點', bool(f1) and f1 != f2, f'{f1} → {f2}')
    J("PZ.ui.setFocus($('bChapters'))"); pg.keyboard.press('Enter'); pg.wait_for_timeout(700)
    ok('Enter 進章節選擇', J("return App.screen") == 'chapters', J("return App.screen"))
    pg.screenshot(path=f'{out}/2_chapters.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    ok('Esc 回標題', J("return App.screen") == 'title', J("return App.screen"))

    print('【劇情】')
    pg.click('#bStart'); pg.wait_for_timeout(900)
    ok('進劇情', J("return App.screen") == 'story')
    t0 = J("return $('stText').textContent.length + ($('stCard').hidden ? 0 : 1000)")
    pg.keyboard.press('Space'); pg.wait_for_timeout(300); pg.keyboard.press('Space'); pg.wait_for_timeout(300)
    ok('空白鍵推進劇情（沒有被當成「跳過」）', J("return App.screen") == 'story', J("return App.screen"))
    pg.screenshot(path=f'{out}/3_story.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(1600)
    ok('Esc 跳過劇情進遊戲', J("return App.screen") == 'play' and J("return G && G.state") in ('play', 'levelup'), J("return [App.screen, G && G.state]"))
    # 第三章開場有「起始強化」：先選完
    for _ in range(6):
        if J("return G.state") != 'levelup': break
        pg.wait_for_timeout(450); pg.keyboard.press('Digit1'); pg.wait_for_timeout(350)
    ok('起始強化選完', J("return G.state") == 'play', J("return G.state"))

    print('【觸控搖桿】')
    if VP[2]:
        x0 = J("return G.p.x")
        touch('touchStart', VP[0] * 0.5, VP[1] * 0.6); pg.wait_for_timeout(60)
        for i in range(1, 8): touch('touchMove', VP[0] * 0.5 - i * 8, VP[1] * 0.6); pg.wait_for_timeout(40)
        pg.wait_for_timeout(700)
        mv = J("return { x: G.p.x, stick: PZ.input.move.x, vis: getComputedStyle(document.querySelector('.lo-stick')).opacity }")
        pg.screenshot(path=f'{out}/4_stick.png')
        touch('touchEnd', 0, 0); pg.wait_for_timeout(200)
        ok('拖曳搖桿：主角往左走', mv['x'] < x0 - 8, f'{x0} → {mv}')
        ok('放開後停下', J("return PZ.input.move.mag") == 0)
    else:
        x0 = J("return G.p.x"); pg.keyboard.down('KeyA'); pg.wait_for_timeout(700); pg.keyboard.up('KeyA')
        ok('A 鍵往左走', J("return G.p.x") < x0 - 8)

    print('【升級卡（防誤選）】')
    J("gainXP(G.p.xpNext + 1)")
    ok('跳出升級', until("G.state === 'levelup' && !$('mLv').hidden"), J("return G.state"))
    pg.keyboard.press('Space'); pg.wait_for_timeout(80)
    ok('剛跳出來時狂按空白鍵不會誤選', J("return G.state") == 'levelup', J("return G.state"))
    ok('等一下之後鍵盤焦點落在第一張卡', until("PZ.ui.focus && PZ.ui.focus.classList.contains('upg')", 4000), J("return PZ.ui.focus && PZ.ui.focus.className"))
    pg.screenshot(path=f'{out}/5_levelup.png')
    pg.keyboard.press('ArrowRight' if VP[0] > VP[1] else 'ArrowDown'); pg.wait_for_timeout(100)
    foc = J("return PZ.ui.focus && PZ.ui.focus.className")
    pg.keyboard.press('Enter')
    ok('方向鍵移到下一張＋Enter 選卡', 'upg' in (foc or '') and until("G.state === 'play'", 3000), f'{foc} / {J("return G.state")}')

    print('【Boss、爆炸、打擊感】')
    J("for (let i = 0; i < 40; i++) spawnAround(G.p.x, G.p.y, 'walker', {}, 1); bossEnter('riotboss', G.p.x + 70, G.p.y - 20, 1);")
    pg.wait_for_timeout(900)
    pg.screenshot(path=f'{out}/6_boss.png')
    sw = J("explodeAt(G.p.x + 40, G.p.y, 34, 80, 0, 'test'); return { wave: PZ.fx._waves.length, trauma: PZ.cam.trauma }")
    pg.wait_for_timeout(60)
    pg.screenshot(path=f'{out}/7_explosion.png')
    ok('爆炸有衝擊波＋震動', sw['wave'] >= 1 and sw['trauma'] > 0.4, sw)
    settle()
    bd = J("const b = G.boss; if (!b) return null; hitZombie(b, 99999, { src: 'gun' }); return { slow: G.slow, boss: !!G.boss, waves: PZ.fx._waves.length }")
    ok('擊倒 Boss：慢動作＋衝擊波', bd and bd['slow'] < 0.5 and not bd['boss'] and bd['waves'] >= 1, bd)
    pg.wait_for_timeout(120)
    pg.screenshot(path=f'{out}/8_bossdown.png')
    pg.wait_for_timeout(1500); settle()

    print('【效能】')
    J("for (let i = 0; i < 160; i++) spawnZombie('walker', { force: true }); G.p.inv = 9999;")
    pg.wait_for_timeout(1500); settle()
    perf = J("const t0 = performance.now(); let n = 0; return new Promise(r => { const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r({ fps: n / 3, upd: +PZ.perf.upd.toFixed(2), ren: +PZ.perf.ren.toFixed(2), zs: G.zs.length, tier: PZ.quality.tier }); }; requestAnimationFrame(f); });")
    print('   ', perf, '（無頭瀏覽器用軟體算圖，fps 只供參考；upd／ren 是遊戲邏輯／繪製的 JS 毫秒）')
    ok('遊戲邏輯＋繪製 JS 每格 < 8ms', perf['upd'] + perf['ren'] < 8, perf)

    print('【暫停、設定、死亡】')
    settle(); J("G.p.inv = 0; G.p.xpNext = 1e9")  # 接下來不要再升級
    pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    ok('Esc 暫停', J("return G.state") == 'paused')
    pg.wait_for_timeout(400); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    ok('Esc 繼續（只繼續一次、不會出錯）', J("return G.state") == 'play', J("return G.state"))
    settle(); J("G.p.inv = 0; G.p.roll = 0; G.p.hp = 1; hurtPlayer(60, G.p.x + 6, G.p.y)")
    ok('死亡畫面', until("!$('mDead').hidden", 20000), J("return [G && G.state, $('mDead').hidden]"))
    pg.screenshot(path=f'{out}/9_dead.png')
    deaths = J("return Save.d.st.deaths")
    ok('死亡次數存進存檔', deaths >= 4, deaths)

    errs = J("return PZ.debug.errors.map(e => e.msg)")
    ok('引擎沒有記到錯誤', not errs, errs)
    b.close()

bad = [l for l in logs if 'GL Driver' not in l and 'GPU stall' not in l and 'fonts.g' not in l and 'ERR_' not in l and 'willReadFrequently' not in l]
ok('主控台沒有錯誤', not [l for l in bad if l.startswith('[error]') or l.startswith('[pageerror]')], bad[:8])
print('全部通過' if not fails else f'失敗 {len(fails)} 項：' + '、'.join(fails))
sys.exit(1 if fails else 0)
