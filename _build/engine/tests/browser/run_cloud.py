#!/usr/bin/env python3
"""雲端存檔（Claude 版）情境測試：用假的 window.claude（記憶體裡的 db）跑「這台／另一台」的各種組合。
python3 tests/browser/run_cloud.py"""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
from shot import serve
from playwright.sync_api import sync_playwright
httpd = serve('/home/claude/pz-games')
URL = f'http://127.0.0.1:{httpd.server_address[1]}/_build/engine/tests/browser/cloud.html'
P = 'data/users/u_test/save'
MOCK = """
window.__db = { docs: %(docs)s, sets: 0, gets: 0, delay: 40, failCode: %(fail)s };
window.claude = { use: (name) => new Promise((res) => setTimeout(() => {
  if (name === 'user') res(%(nouser)s ? null : { id: async () => 'u_test' });
  else if (name === 'db') res(%(nodb)s ? null : { doc: (path) => ({ path,
    get: () => new Promise((r) => setTimeout(() => { __db.gets++; const d = __db.docs[path]; r({ exists: !!d, data: () => d }); }, __db.delay)),
    set: (data) => new Promise((r, rej) => setTimeout(() => { if (__db.failCode) return rej({ code: __db.failCode, message: 'x' }); __db.docs[path] = JSON.parse(JSON.stringify(data)); __db.sets++; r(); }, __db.delay)) }) });
  else res(null);
}, 30)) };
"""
fails = []
def ok(name, cond, info=''):
    print(('  ✓ ' if cond else '  ✗ ') + name + ('' if cond else f'  （{info}）'))
    if not cond: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    def page(docs=None, local=None, synced=None, fail='null', nodb='false', nouser='false'):
        ctx = b.new_context(viewport={'width': 390, 'height': 844})
        init = MOCK % dict(docs=json.dumps(docs or {}), fail=fail, nodb=nodb, nouser=nouser)
        if local is not None: init += "try { localStorage.setItem('pz.cloudtest.save.main', %s); } catch (e) {}\n" % json.dumps(json.dumps(local))
        if synced is not None: init += "try { localStorage.setItem('pz.cloudtest.sync.main', '%d'); } catch (e) {}\n" % synced
        ctx.add_init_script(init)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_function('window.__ready === true', timeout=15000)
        return ctx, pg, errs
    J = lambda pg, js: pg.evaluate('() => { ' + js + ' }')

    # 先造幾份存檔碼（用引擎自己的 code()）
    ctx, pg, _ = page(nodb='true')
    codes = J(pg, "const mk = (lv, ts) => { S.data = Object.assign(S.fresh(), { lv, gold: lv * 10, _ts: ts }); return S.code(); }; return { old: mk(3, 1000), mid: mk(5, 1500), new: mk(7, 2000) };")
    ctx.close()
    doc = lambda code, ts: {P: {'v': 1, 'code': code, 'ts': ts, 'note': 'x'}}
    loc = lambda lv, ts: {'lv': lv, 'gold': lv * 10, '_v': 1, '_ts': ts}

    print('A 雲端是空的、這台有進度 → 推上去一次')
    ctx, pg, errs = page(local=loc(3, 1000)); pg.wait_for_timeout(500)
    st = J(pg, f"return {{ s: S.cloud.state, sets: __db.sets, ts: (__db.docs['{P}'] || {{}}).ts, sync: localStorage.getItem('pz.cloudtest.sync.main'), lv: S.data.lv }}")
    ok('雲端接上', st['s'] == 'on', st); ok('推上去一次、時間對', st['sets'] == 1 and st['ts'] == 1000, st); ok('記下同步點', st['sync'] == '1000', st); ok('這台進度不變', st['lv'] == 3, st); ok('沒有錯誤', not errs, errs); ctx.close()

    print('B 雲端有進度、這台沒有 → 直接接上，不寫回去')
    ctx, pg, errs = page(docs=doc(codes['new'], 2000)); pg.wait_for_timeout(400)
    st = J(pg, "return { lv: S.data.lv, from: S.loadedFrom, sets: __db.sets, loads: __loads, local: JSON.parse(localStorage.getItem('pz.cloudtest.save.main') || '{}').lv }")
    ok('接上雲端的進度', st['lv'] == 7 and st['from'] == 'cloud', st); ok('本機也寫好', st['local'] == 7, st); ok('沒有寫回雲端', st['sets'] == 0, st); ok('發出 saveload', st['loads'] >= 1, st); ok('沒有錯誤', not errs, errs); ctx.close()

    print('C 這台同步過的舊進度、雲端比較新 → 直接接上')
    ctx, pg, errs = page(docs=doc(codes['new'], 2000), local=loc(3, 1000), synced=1000); pg.wait_for_timeout(400)
    st = J(pg, "return { lv: S.data.lv, sets: __db.sets, dlg: !!document.querySelector('.pz-modal') }")
    ok('換成雲端的進度、不問', st['lv'] == 7 and not st['dlg'] and st['sets'] == 0, st); ctx.close()

    print('D 這台有沒同步的新進度、雲端比較舊 → 推上去')
    ctx, pg, errs = page(docs=doc(codes['old'], 1000), local=loc(5, 1500), synced=1000); pg.wait_for_timeout(500)
    st = J(pg, f"return {{ lv: S.data.lv, sets: __db.sets, ts: __db.docs['{P}'].ts }}")
    ok('留這台、推上去', st['lv'] == 5 and st['sets'] == 1 and st['ts'] == 1500, st); ctx.close()

    print('E 兩邊都有沒同步的進度 → 問玩家（選「接另一台的」）')
    ctx, pg, errs = page(docs=doc(codes['new'], 2000), local=loc(5, 1500), synced=900); pg.wait_for_timeout(500)
    dlg = J(pg, "const m = document.querySelector('.pz-modal'); return m ? m.textContent : ''")
    ok('跳出「有兩份進度」', '兩份進度' in dlg and 'LV 5' in dlg and 'LV 7' in dlg, dlg[:80])
    pg.click('.pz-modal .pz-btn.primary'); pg.wait_for_timeout(300)
    st = J(pg, "return { lv: S.data.lv, sets: __db.sets }")
    ok('接上另一台的進度', st['lv'] == 7 and st['sets'] == 0, st); ok('沒有錯誤', not errs, errs); ctx.close()

    print('E2 同上，選「留這台的」')
    ctx, pg, errs = page(docs=doc(codes['new'], 2000), local=loc(5, 1500), synced=900); pg.wait_for_timeout(500)
    pg.click('.pz-modal .pz-btn:not(.primary)'); pg.wait_for_timeout(400)
    st = J(pg, f"return {{ lv: S.data.lv, sets: __db.sets, ts: __db.docs['{P}'].ts }}")
    ok('留這台、蓋掉雲端', st['lv'] == 5 and st['sets'] == 1 and st['ts'] == 1500, st); ctx.close()

    print('F 沒有雲端（db 拿不到）→ 照常玩，只存這台')
    ctx, pg, errs = page(nodb='true', local=loc(3, 1000)); pg.wait_for_timeout(200)
    st = J(pg, "S.data.gold = 99; S.write(true); return { s: S.cloud.state, lv: S.data.lv, note: S.cloud.note(), local: JSON.parse(localStorage.getItem('pz.cloudtest.save.main')).gold }")
    ok('雲端關著、本機照存', st['s'] == 'off' and st['local'] == 99, st); ok('設定頁說明這次沒連上', '沒連上' in st['note'], st['note']); ok('沒有錯誤', not errs, errs); ctx.close()

    print('G 一般存檔：內容真的變了才寫、隔幾秒一筆；頁面收起來馬上送')
    ctx, pg, errs = page(local=loc(3, 1000)); pg.wait_for_timeout(500)
    n0 = J(pg, "return __db.sets")
    J(pg, "S.data.gold += 1; S.write(true); S.data.gold += 1; S.write(true);"); pg.wait_for_timeout(600)
    n1 = J(pg, "return __db.sets")
    ok('連續寫不會馬上一直送（等幾秒合併）', n1 == n0, (n0, n1))
    J(pg, "PZ.emit('hidden')"); pg.wait_for_timeout(400)
    st = J(pg, f"return {{ sets: __db.sets, gold: (() => {{ const c = __db.docs['{P}'].code; return S.decode(c).gold; }})() }}")
    ok('頁面收起來：馬上送出最新的', st['sets'] == n0 + 1 and st['gold'] == 32, st)
    J(pg, "PZ.emit('hidden')"); pg.wait_for_timeout(300)
    ok('沒變就不再送', J(pg, "return __db.sets") == n0 + 1); ctx.close()

    print('H 寫入被拒（沒有權限）→ 當成這次沒有雲端，遊戲照常')
    ctx, pg, errs = page(local=loc(3, 1000), fail="'permission_denied'"); pg.wait_for_timeout(600)
    st = J(pg, "return { s: S.cloud.state, lv: S.data.lv }")
    ok('雲端關掉、進度還在', st['s'] == 'off' and st['lv'] == 3, st); ok('沒有錯誤', not errs, errs); ctx.close()

    print('I 暫時連不上（unavailable）→ 自己重試')
    ctx, pg, errs = page(local=loc(3, 1000), fail="'unavailable'"); pg.wait_for_timeout(400)
    J(pg, "__db.failCode = null"); pg.wait_for_timeout(5500)
    st = J(pg, f"return {{ s: S.cloud.state, sets: __db.sets, ts: (__db.docs['{P}'] || {{}}).ts }}")
    ok('重試後寫上去', st['s'] == 'on' and st['sets'] == 1 and st['ts'] == 1000, st); ctx.close()
    b.close()
print('  雲端存檔檢查：' + ('全部通過' if not fails else f'失敗 {len(fails)} 項：' + '、'.join(fails)))
sys.exit(1 if fails else 0)
