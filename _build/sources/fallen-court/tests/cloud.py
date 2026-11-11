#!/usr/bin/env python3
"""雲端存檔的情境測試：用假的 window.claude（記憶體裡的 db）跑各種「這台／另一台」的組合。python3 tests/cloud.py"""
import asyncio, os, sys, json
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'artifact', 'index.html')
MOCK = """
window.__db = { docs: %(docs)s, sets: 0, gets: 0, delay: 60, failCode: null };
window.claude = { use: name => new Promise(res => setTimeout(() => {
  if (name === 'user') res({ id: async () => %(uid)s });
  else if (name === 'db') res(%(nodb)s ? null : { doc: path => ({ path,
    get: () => new Promise(r => setTimeout(() => { __db.gets++; const d = __db.docs[path]; r({ exists: !!d, data: () => d, id: 'save', metadata: {} }); }, __db.delay)),
    set: data => new Promise((r, rej) => setTimeout(() => { if (__db.failCode) return rej({ code: __db.failCode, message: 'x' }); __db.docs[path] = JSON.parse(JSON.stringify(data)); __db.sets++; r(); }, __db.delay)) }) });
  else res(null);
}, %(useDelay)d)) };
"""
MKSAVE = """(args) => { const [lv, sec, ts, zone] = args; newGame(); G.lv = lv; G.stat.sec = sec; G.zone = zone; G.disc[zone] = 1; G.flags.met_yuan = 1; G.party.yuan.active = true; G.party.yuan.lv = lv; G.ts = ts; const code = exportSave(), json = JSON.stringify(G); G = null; return [code, json]; }"""
P = 'data/users/u_test/save'
fails = []
def check(name, cond, info=''):
    print(('  ok   ' if cond else '  FAIL ') + name + (' ' + str(info) if info and not cond else ''))
    if not cond: fails.append(name)
async def page_for(b, docs=None, local=None, synced=None, use_delay=40, uid="'u_test'", nodb='false'):
    ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
    await ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort()); await ctx.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    init = MOCK % dict(docs=json.dumps(docs or {}), uid=uid, nodb=nodb, useDelay=use_delay)
    if local is not None: init += "try { localStorage.setItem('fallencourt.v1', %s); } catch (e) {}\n" % json.dumps(local)
    if synced is not None: init += "try { localStorage.setItem('fallencourt.sync', '%d'); } catch (e) {}\n" % synced
    await ctx.add_init_script(init)
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'ERR_' not in m.text and 'fonts' not in m.text else None)
    await pg.goto(URL); await pg.wait_for_timeout(250)
    return ctx, pg, errs
async def title_buttons(pg): return await pg.evaluate("[...document.querySelectorAll('#title .bt')].map(b => b.textContent)")
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--autoplay-policy=no-user-gesture-required'])
        # 先造幾份存檔
        ctx, pg, errs = await page_for(b)
        old, old_json = await pg.evaluate(MKSAVE, [3, 1200, 1000000, 'slope'])
        new, new_json = await pg.evaluate(MKSAVE, [7, 9000, 2000000, 'gallery'])
        mid, mid_json = await pg.evaluate(MKSAVE, [5, 5000, 1500000, 'sump'])
        print('存檔碼長度', len(new)); await ctx.close()
        doc = lambda code, ts, lv=1: {P: {'v': 1, 'code': code, 'ts': ts, 'lv': lv, 'zone': 'x', 'sec': 0}}

        print('A 雲端是空的、這台有進度 → 推上去')
        ctx, pg, errs = await page_for(b, local=old_json); await pg.wait_for_timeout(900)
        st = await pg.evaluate("({ s: CLOUD.state, sets: __db.sets, has: !!__db.docs['%s'], ts: (__db.docs['%s'] || {}).ts, sync: localStorage.getItem('fallencourt.sync') })" % (P, P))
        check('state on', st['s'] == 'on', st); check('pushed once', st['sets'] == 1 and st['ts'] == 1000000, st); check('sync marker', st['sync'] == '1000000', st)
        check('title keeps 繼續', (await title_buttons(pg))[0] == '繼續'); check('no errors', not errs, errs); await ctx.close()

        print('B 雲端有進度、這台沒有 → 直接接上')
        ctx, pg, errs = await page_for(b, docs=doc(new, 2000000)); bt0 = await title_buttons(pg); await pg.wait_for_timeout(900)
        bt = await title_buttons(pg); st = await pg.evaluate("({ lv: JSON.parse(localStorage.getItem('fallencourt.v1') || '{}').lv, sets: __db.sets, toast: document.querySelector('#toast') ? document.querySelector('#toast').textContent : '' })")
        check('title becomes 繼續', bt[0] == '繼續', (bt0, bt)); check('local adopted', st['lv'] == 7, st); check('no write back', st['sets'] == 0, st)
        await pg.click('#title .bt[data-k=cont]'); await pg.wait_for_timeout(1500)
        st = await pg.evaluate("({ mode: S.mode, zone: Z && Z.id, lv: G && G.lv })"); check('continue loads cloud save', st == {'mode': 'explore', 'zone': 'gallery', 'lv': 7}, st); check('no errors', not errs, errs); await ctx.close()

        print('C 這台同步過的舊進度、雲端比較新 → 直接接上')
        ctx, pg, errs = await page_for(b, docs=doc(new, 2000000), local=old_json, synced=1000000); await pg.wait_for_timeout(900)
        st = await pg.evaluate("({ lv: JSON.parse(localStorage.getItem('fallencourt.v1')).lv, ask: !!CLOUD.ask, sets: __db.sets })"); check('adopted silently', st == {'lv': 7, 'ask': False, 'sets': 0}, st); check('no errors', not errs, errs); await ctx.close()

        print('D 這台有沒同步過的進度、雲端比較新 → 問；留這台的')
        ctx, pg, errs = await page_for(b, docs=doc(new, 2000000), local=mid_json, synced=1000000); await pg.wait_for_timeout(2200)
        txt = await pg.evaluate("document.querySelector('#modal') ? document.querySelector('#modal').innerText : ''"); check('dialog shown', '有兩份進度' in txt and '第 5 級' in txt and '第 7 級' in txt, txt)
        await pg.click('#modal .bt[data-k="0"]'); await pg.wait_for_timeout(700)
        st = await pg.evaluate("({ lv: JSON.parse(localStorage.getItem('fallencourt.v1')).lv, cloudTs: __db.docs['%s'].ts, sets: __db.sets, ask: !!CLOUD.ask })" % P); check('kept local, cloud overwritten', st == {'lv': 5, 'cloudTs': 1500000, 'sets': 1, 'ask': False}, st); check('no errors', not errs, errs); await ctx.close()

        print('D2 同上；接另一台的')
        ctx, pg, errs = await page_for(b, docs=doc(new, 2000000), local=mid_json, synced=1000000); await pg.wait_for_timeout(2200)
        await pg.click('#modal .bt[data-k="1"]'); await pg.wait_for_timeout(700)
        st = await pg.evaluate("({ lv: JSON.parse(localStorage.getItem('fallencourt.v1')).lv, sets: __db.sets, mode: S.mode })"); check('adopted remote', st == {'lv': 7, 'sets': 0, 'mode': 'title'}, st); check('no errors', not errs, errs); await ctx.close()

        print('E 這台比較新 → 推上去')
        ctx, pg, errs = await page_for(b, docs=doc(old, 1000000), local=new_json, synced=1000000); await pg.wait_for_timeout(900)
        st = await pg.evaluate("({ cloudTs: __db.docs['%s'].ts, sets: __db.sets, ask: !!CLOUD.ask })" % P); check('pushed newer local', st == {'cloudTs': 2000000, 'sets': 1, 'ask': False}, st); await ctx.close()

        print('F 雲端慢（2 秒才回）、馬上按「醒來」→ 等它，不開新遊戲')
        ctx, pg, errs = await page_for(b, docs=doc(new, 2000000), use_delay=2000)
        check('title shows 醒來 first', (await title_buttons(pg))[0] == '醒來'); await pg.click('#title .bt[data-k=new]'); await pg.wait_for_timeout(600)
        st = await pg.evaluate("({ mode: S.mode, state: CLOUD.state })"); check('still on title while waiting', st == {'mode': 'title', 'state': 'wait'}, st)
        await pg.wait_for_timeout(2600); bt = await title_buttons(pg); st = await pg.evaluate("({ mode: S.mode, lv: JSON.parse(localStorage.getItem('fallencourt.v1') || '{}').lv, sets: __db.sets })")
        check('no new game; cloud save offered', st == {'mode': 'title', 'lv': 7, 'sets': 0} and bt[0] == '繼續', (st, bt)); check('no errors', not errs, errs); await ctx.close()

        print('G 雲端很慢（7 秒）、按「醒來」→ 等 5 秒後開新遊戲；雲端回來之後要問，而且在問之前不能蓋掉雲端')
        ctx, pg, errs = await page_for(b, docs=doc(new, 2000000), use_delay=7000)
        await pg.click('#title .bt[data-k=new]'); await pg.wait_for_timeout(5900)
        st = await pg.evaluate("({ mode: S.mode, state: CLOUD.state })"); check('new game started after 5s', st['mode'] == 'explore' and st['state'] == 'wait', st)
        await pg.evaluate("(() => { Dlg.skip && Dlg.skip(); saveGame(); return 1; })()"); await pg.wait_for_timeout(2600)
        st = await pg.evaluate("({ state: CLOUD.state, ask: !!CLOUD.ask, sets: __db.sets, cloudTs: __db.docs['%s'].ts })" % P); check('cloud untouched, ask pending', st == {'state': 'on', 'ask': True, 'sets': 0, 'cloudTs': 2000000}, st)
        # 把開場劇情快轉掉，站著沒事的時候才會問
        await pg.evaluate("(() => { try { endTalk(); } catch (e) {} S.cut = 0; S.dialog = false; UI.dlg.classList.add('hide'); UI.scene.classList.remove('on'); hudMode('explore'); return 1; })()"); await pg.wait_for_timeout(1800)
        txt = await pg.evaluate("document.querySelector('#modal').innerText"); check('dialog shown mid-play', '有兩份進度' in txt and '第 7 級' in txt, txt)
        await pg.click('#modal .bt[data-k="1"]'); await pg.wait_for_timeout(1600)
        st = await pg.evaluate("({ mode: S.mode, zone: Z && Z.id, lv: G && G.lv, sets: __db.sets })"); check('switched to cloud save in place', st == {'mode': 'explore', 'zone': 'gallery', 'lv': 7, 'sets': 0}, st); check('no errors', not errs, errs); await ctx.close()

        print('H 遊戲中存檔：內容變了才寫；只有位置和時鐘在動不寫；寫失敗不影響遊戲')
        ctx, pg, errs = await page_for(b, docs=doc(new, 2000000), local=new_json, synced=2000000); await pg.wait_for_timeout(700)
        await pg.click('#title .bt[data-k=cont]'); await pg.wait_for_timeout(1500)
        # 進區域本身會改到存檔（這一區「來過了」），先讓那一筆寫完當基準
        await pg.evaluate("(() => { saveGame(); return 1; })()"); await pg.wait_for_timeout(4600); base = await pg.evaluate("__db.sets")
        await pg.evaluate("(() => { Z.leader.x += .5; G.stat.sec += 30; saveGame(); return 1; })()"); await pg.wait_for_timeout(4600); s0 = await pg.evaluate("__db.sets")
        await pg.evaluate("(() => { G.coin += 50; saveGame(); G.coin += 1; saveGame(); return 1; })()"); await pg.wait_for_timeout(4800); s1 = await pg.evaluate("[__db.sets, JSON.parse(decodeURIComponent(escape(atob(__db.docs['%s'].code.slice(4))))).coin, G.coin]" % P)
        check('position-only save not written', s0 == base, (base, s0)); check('two quick changes → one write with the latest', s1[0] == base + 1 and s1[1] == s1[2], (base, s1))
        await pg.evaluate("(() => { __db.failCode = 'unavailable'; G.coin += 5; saveGame(); return 1; })()"); await pg.wait_for_timeout(4800)
        st = await pg.evaluate("({ state: CLOUD.state, dirty: CLOUD.dirty, sets: __db.sets, local: JSON.parse(localStorage.getItem('fallencourt.v1')).coin === G.coin })"); check('transient failure: stays on, local saved', st == {'state': 'on', 'dirty': True, 'sets': base + 1, 'local': True}, st)
        await pg.evaluate("(() => { __db.failCode = 'revoked'; CLOUD.failAt = 0; G.coin += 5; saveGame(); return 1; })()"); await pg.wait_for_timeout(4800)
        st = await pg.evaluate("({ state: CLOUD.state, mode: S.mode, note: cloudNote() })"); check('revoked: cloud off, game goes on', st['state'] == 'off' and st['mode'] == 'explore', st); check('no errors', not errs, errs); await ctx.close()

        print('I 沒有 db（沒宣告／沒登入）→ 當成沒有雲端')
        ctx, pg, errs = await page_for(b, nodb='true'); await pg.wait_for_timeout(500)
        st = await pg.evaluate("({ state: CLOUD.state, note: cloudNote() })"); check('off without db', st['state'] == 'off', st)
        await pg.click('#title .bt[data-k=new]'); await pg.wait_for_timeout(1500); check('new game starts', await pg.evaluate("S.mode") == 'explore'); check('no errors', not errs, errs); await ctx.close()
        ctx, pg, errs = await page_for(b, uid='null'); await pg.wait_for_timeout(500); check('off without id', await pg.evaluate("CLOUD.state") == 'off'); await ctx.close()
        await b.close()
    print('\n' + ('全部通過' if not fails else '失敗：' + ', '.join(fails)))
if __name__ == '__main__':
    asyncio.run(main())
