#!/usr/bin/env python3
"""中途關掉遊戲再回來：存檔不能停在「演到一半」。python3 tests/resume.py [r1 r2 ...]

每一段都是：玩到某個點 → 讓劇情卡在中間（當作玩家停在那句話）→ 看這台裝置上的存檔 → 重新載入頁面 → 按「繼續」→ 看接不接得上。
  r1 走進去打的遭遇，戰後的話講到一半關掉 → 回來從那段話的開頭接著演，不用重打，獎勵不會多拿
  r2 打到一半關掉 → 回來站在開打之前，敵人還在
  r3 從劇情裡打起來的遭遇，講到一半關掉 → 整段劇情當作沒發生；演完則全部都在
  r4 剛到新區域的那段話講到一半關掉 → 回來會補演（營地那段話的最後才開放骸骨坡）
  r5 終幕：層主倒下的那一刻關掉／演到選路那一幕關掉／「第一卷完」那一頁關掉
  r6 在設定裡讀存檔碼：人要站在碼裡存的地方，不是現在站的地方
  r7 不快轉、照真人的速度：接著演沒講完的話、走出窖、營地那段話
"""
import asyncio, os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pw import Game, ROOT
LS = "JSON.parse(localStorage.getItem('fallencourt.v1') || 'null')"
HIDE = "(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); return 1; })()"
IDLE = "S.mode === 'explore' && !S.cut && !S.hold && !S.dialog && !S.panel && G && !G.pend && document.querySelector('#modal').classList.contains('hide')"
fails = []
def check(name, cond, info=''):
    print(('  ok   ' if cond else '  FAIL ') + name + ('  ' + str(info) if info != '' and not cond else ''))
    if not cond: fails.append(name)
async def inject(g, show=False):
    for f in (['showcase.js'] if show else []) + ['bot.js', 'driver.js']: await g.pg.add_script_tag(path=os.path.join(ROOT, 'tests', f))
    await g.js("DRV.setup(); 1")
async def reload(g, show=False, cont=True):
    await g.pg.reload(); await g.wait(500); await inject(g, show)
    return await g.js("[...document.querySelectorAll('#title .bt')].map(b => b.textContent)")
async def idle(g, extra='true', ms=90000): await g.pg.wait_for_function(f"({IDLE}) && ({extra})", timeout=ms)

async def r1():
    print('r1 戰後的話講到一半關掉 → 回來接著演，不用重打')
    async with Game() as g:
        await inject(g)
        await g.pg.click('#title .bt[data-k=new]')
        await g.js("(async () => { await DRV.sleep(200); await DRV.waitIdle(); await DRV.enc('z0a'); return 1; })()")
        L0 = await g.js(LS); check('saved after the first fight, nothing pending', L0 and L0['zones']['vault']['enc'].get('z0a') == 1 and 'pend' not in L0, L0 and L0.get('pend'))
        await g.js("(() => { window.__n = 0; SCRIPTS.post_z0b = async () => { window.__n++; await new Promise(() => { }); }; DRV.enc('z0b'); return 1; })()")
        await g.pg.wait_for_function("window.__n === 1", timeout=60000); await g.wait(150)
        L = await g.js(LS)
        check('checkpoint: fight won, post-battle talk pending', L.get('pend', {}).get('enc') == 'z0b' and L['zones']['vault']['enc'].get('z0b') == 1 and L['party']['yuan']['active'] and L['flags'].get('met_yuan') == 1, L.get('pend'))
        check('checkpoint holds the rewards but none of the talk', len(L['deeds']) == 0 and (L['xp'], L['lv']) != (L0['xp'], L0['lv']), (L['deeds'], L['xp'], L['lv']))
        await g.js(HIDE); await g.wait(120); L1 = await g.js(LS); check('hiding the page mid-talk writes nothing', L1['ts'] == L['ts'] and len(L1['deeds']) == 0)
        bt = await reload(g); check('title offers 繼續', bt and bt[0] == '繼續', bt)
        await g.js("(() => { window.__n = 0; const o = SCRIPTS.post_z0b; SCRIPTS.post_z0b = async (...a) => { window.__n++; return o(...a); }; DRV.rules = ['「好。」']; return 1; })()")
        await g.pg.click('#title .bt[data-k=cont]'); await idle(g, 'window.__n === 1')
        st = await g.js("({ n: window.__n, deeds: G.deeds.length, xp: G.xp, lv: G.lv, coin: G.coin, items: Object.keys(G.items).length, grp: Z.groups.map(x => x.id), zone: Z.id, hold: S.hold, battles: DRV.stats.battles.length })")
        L2 = await g.js(LS)
        check('the talk replayed once, no second fight', st['n'] == 1 and st['battles'] == 0 and st['zone'] == 'vault' and 'z0b' not in st['grp'], st)
        check('rewards not doubled', (st['xp'], st['lv'], st['coin'], st['items']) == (L['xp'], L['lv'], L['coin'], len(L['items'])), (st, L['xp'], L['lv'], L['coin'], len(L['items'])))
        check('finished state saved, nothing pending', 'pend' not in L2 and len(L2['deeds']) == 1 and st['deeds'] == 1 and st['hold'] == 0, (L2.get('pend'), L2['deeds']))
        # 再載入一次：不會再演
        await reload(g); await g.js("(() => { window.__n = 0; const o = SCRIPTS.post_z0b; SCRIPTS.post_z0b = async (...a) => { window.__n++; return o(...a); }; return 1; })()")
        await g.pg.click('#title .bt[data-k=cont]'); await g.wait(900); await idle(g); check('second reload: nothing replays', await g.js("window.__n") == 0)
        # 停在戰利品那一頁關掉（這一場沒有戰後的話）：贏的那一場已經存了，回來不用重打，也沒有東西要補演
        await g.js("(async () => { DRV.rules = ['「好。」']; await DRV.goto(2, 2, .5); await DRV.sleep(50); await DRV.waitIdle(); await DRV.go('slope'); return 1; })()")
        B0 = await g.js(LS)
        await g.js("(() => { showLoot = () => { window.__loot = 1; return new Promise(() => { }); }; DRV.enc('s1'); return 1; })()")
        await g.pg.wait_for_function("window.__loot === 1", timeout=60000); await g.wait(150); L = await g.js(LS)
        check('loot page open: the win is already saved', L['zone'] == 'slope' and L['zones']['slope']['enc'].get('s1') == 1 and 'pend' not in L and (L['xp'], L['lv'], L['coin']) != (B0['xp'], B0['lv'], B0['coin']), (L['zones'].get('slope'), L.get('pend')))
        await g.js(HIDE); await g.wait(120); check('hiding on the loot page adds nothing', (await g.js(LS))['ts'] == L['ts'])
        await reload(g); await g.pg.click('#title .bt[data-k=cont]'); await g.wait(900); await idle(g)
        st = await g.js("({ grp: Z.groups.map(x => x.id), xp: G.xp, lv: G.lv, coin: G.coin, zone: Z.id, battles: DRV.stats.battles.length })")
        check('back after the win: no rematch, rewards kept', 's1' not in st['grp'] and st['battles'] == 0 and (st['xp'], st['lv'], st['coin'], st['zone']) == (L['xp'], L['lv'], L['coin'], 'slope'), st)
        check('no errors', not g.errs, g.errs[:3])

async def r2_r3():
    print('r2 打到一半關掉 → 回來站在開打之前')
    async with Game() as g:
        await inject(g)
        await g.pg.click('#title .bt[data-k=new]')
        await g.js("(async () => { await DRV.sleep(200); await DRV.waitIdle(); saveGame(); return 1; })()")
        L0 = await g.js(LS)
        await g.js("(() => { heroInput = () => new Promise(() => { }); DRV.enc('z0a'); return 1; })()")
        await g.pg.wait_for_function("S.mode === 'battle' && B && B.turns >= 0", timeout=60000); await g.wait(1200)
        await g.js(HIDE); await g.wait(150); L = await g.js(LS)
        check('mid-battle: save untouched (no kill mark, no pre-talk mark)', L['ts'] == L0['ts'] and not L['zones'].get('vault', {}).get('enc', {}).get('z0a') and not L['flags'].get('pre_z0a') and 'pend' not in L, L['flags'])
        check('a save is owed for later', await g.js("S.savePend === true && S.hold === 1"))
        await reload(g); await g.pg.click('#title .bt[data-k=cont]'); await g.wait(700); await idle(g)
        st = await g.js("({ grp: Z.groups.map(x => x.id), pre: !!G.flags.pre_z0a, mode: S.mode, hold: S.hold })"); check('back before the fight, enemy still there', 'z0a' in st['grp'] and not st['pre'] and st['hold'] == 0, st)

        print('r3 從劇情裡打起來的遭遇：講到一半關掉 → 整段當作沒發生')
        DEF = "SCRIPTS.__t = async () => { flag('__a'); const r = await fight('z0a'); flag('__b'); return r; }; window.__n = 0; { const o = SCRIPTS.post_z0a; SCRIPTS.post_z0a = async (...a) => { window.__n++; if (window.__block) await new Promise(() => { }); return o(...a); }; }"
        await g.js("(() => { %s window.__block = true; runScript('__t'); return 1; })()" % DEF)
        await g.pg.wait_for_function("window.__n === 1", timeout=60000); await g.wait(150); await g.js(HIDE); await g.wait(150)
        L = await g.js(LS); mem = await g.js("({ a: !!G.flags.__a, enc: !!zs('vault').enc.z0a, pend: !!G.pend, cut: S.cut, hold: S.hold })")
        check('in memory the fight is won', mem['a'] and mem['enc'] and not mem['pend'] and mem['cut'] >= 1, mem)
        check('on disk nothing of it exists', not L['flags'].get('__a') and not L['zones'].get('vault', {}).get('enc', {}).get('z0a') and 'pend' not in L, (L['flags'], L['zones'].get('vault')))
        await reload(g); await g.pg.click('#title .bt[data-k=cont]'); await g.wait(700); await idle(g)
        check('back before the scene', await g.js("Z.groups.some(x => x.id === 'z0a') && !G.flags.__a"))
        await g.js("(async () => { %s window.__block = false; await runScript('__t'); await DRV.waitIdle(); return 1; })()" % DEF); await g.wait(100)
        L = await g.js(LS); check('played to the end: everything saved together', L['flags'].get('__a') == 1 and L['flags'].get('__b') == 1 and L['zones']['vault']['enc'].get('z0a') == 1 and 'pend' not in L and await g.js("S.hold === 0 && S.cut === 0 && !S.savePend"), (L['flags'], L.get('pend')))
        check('no errors', not g.errs, g.errs[:3])

async def r4():
    print('r4 剛到新區域的那段話講到一半關掉 → 回來會補演')
    async with Game() as g:
        await inject(g)
        await g.pg.click('#title .bt[data-k=new]')
        await g.js("(async () => { DRV.rules = ['「好。」']; await DRV.sleep(200); await DRV.waitIdle(); await DRV.enc('z0a'); await DRV.enc('z0b'); return 1; })()")
        # 從窖走棧道去營地（出口本身是一段劇情）：營地那段話卡住
        await g.js("(() => { window.__n = 0; SCRIPTS.arrive_camp = async () => { flag('camp_intro'); window.__n++; await new Promise(() => { }); }; DRV.goto(2, 2, .5); return 1; })()")
        await g.pg.wait_for_function("window.__n === 1", timeout=60000); await g.wait(150); await g.js(HIDE); await g.wait(150); L = await g.js(LS)
        check('camp talk interrupted: save has neither the mark nor a half-arrival', not L['flags'].get('camp_intro') and not L['disc'].get('slope'), (L['zone'], L['flags'].get('camp_intro'), L['disc']))
        await reload(g); await g.js("DRV.rules = ['「好。」']; 1"); await g.pg.click('#title .bt[data-k=cont]'); await g.wait(700); await idle(g)
        z = await g.js("Z.id")
        if z == 'vault': await g.js("(async () => { await DRV.goto(2, 2, .5); await DRV.sleep(50); await DRV.waitIdle(); return 1; })()")
        st = await g.js("({ zone: Z.id, intro: !!G.flags.camp_intro, slope: !!G.disc.slope })"); L = await g.js(LS)
        check('camp talk replays, slope opens', st == {'zone': 'camp', 'intro': True, 'slope': True} and L['disc'].get('slope') == 1 and L['flags'].get('camp_intro') == 1, (z, st))
        # 直接換區（不是從劇情裡）：存檔已經在新區域了，那段話要在「繼續」的時候補上
        await g.js("(() => { window.__n = 0; SCRIPTS.arrive_slope = async () => { flag('slope_intro'); window.__n++; await new Promise(() => { }); }; travel('slope'); return 1; })()")
        await g.pg.wait_for_function("window.__n === 1", timeout=60000); await g.wait(150); await g.js(HIDE); await g.wait(150); L = await g.js(LS)
        check('slope talk interrupted: already in the slope, talk not marked', L['zone'] == 'slope' and not L['flags'].get('slope_intro'), (L['zone'], L['flags'].get('slope_intro')))
        await reload(g); await g.js("(() => { window.__n = 0; const o = SCRIPTS.arrive_slope; SCRIPTS.arrive_slope = async (...a) => { window.__n++; return o(...a); }; return 1; })()")
        await g.pg.click('#title .bt[data-k=cont]'); await idle(g, 'window.__n >= 1 && G.flags.slope_intro === 1')
        L = await g.js(LS); check('slope talk made up on continue and saved', L['flags'].get('slope_intro') == 1 and await g.js("Z.id") == 'slope')
        await reload(g); await g.js("(() => { window.__d = 0; const s0 = say; say = (...a) => { window.__d++; return s0(...a); }; return 1; })()")
        await g.pg.click('#title .bt[data-k=cont]'); await g.wait(900); await idle(g); check('next continue: no talk again', await g.js("window.__d") == 0)
        check('no errors', not g.errs, g.errs[:3])

BOSS = "(() => { __show.base(); DRV.setup(); DRV.rules = %s; S.set.easy = true; FOE.keeper.hp = 60; FOE.keeper.arm = 0; FOE.pylon.hp = 8; FOE.pylon.arm = 0; window.__c = { post: 0, reveal: 0, path: 0, epi: 0 }; return 1; })()"
COUNT = "(() => { window.__c = { post: 0, reveal: 0, path: 0, epi: 0 }; for (const [k, id] of [['post', 'post_boss'], ['reveal', 'sc_reveal'], ['path', 'sc_path'], ['epi', 'sc_epilogue']]) { const o = SCRIPTS[id]; SCRIPTS[id] = async (...a) => { window.__c[k]++; return o(...a); }; } DRV.rules = %s; return 1; })()"
LEG = "({ heart: Object.values(G.items).filter(i => i.leg === 'heart').length, writ: Object.values(G.items).filter(i => i.leg === 'writ').length, blade: Object.values(G.items).filter(i => i.leg === 'anchorblade').length, f: ['boss_done', 'reforged', 'path', 'vol1_done', 'luo_dead', 'luo_stay'].filter(k => G.flags[k]), pend: G.pend || null, luo: G.party.luo.active, wounds: G.party.luo.wounds || 0, deeds: G.deeds.length, lv: G.lv, xp: G.xp, zone: Z.id, hold: S.hold })"
RULES = json.dumps(['（什麼都不說。把劍舉起來。）', '設關', '「留下吧。」'], ensure_ascii=False)
async def r5():
    print('r5a 終幕：層主剛倒下、話才開始就關掉 → 回來整段終幕從頭演，層主不用重打')
    async with Game() as g:
        await inject(g, True); await g.js(BOSS % RULES)
        await g.js("(() => { SCRIPTS.post_boss = async () => { window.__c.post++; await new Promise(() => { }); }; __show.battle('boss'); return 1; })()")
        await g.pg.wait_for_function("window.__c.post === 1", timeout=120000); await g.wait(150); await g.js(HIDE); await g.wait(150); L = await g.js(LS)
        check('checkpoint: boss down, aftermath pending', L and L.get('pend', {}).get('enc') == 'boss' and L['zones']['root']['enc'].get('boss') == 1 and not L['flags'].get('boss_done'), L and (L.get('pend'), L['flags'].get('boss_done')))
        base_deeds, base_lv, base_xp = len(L['deeds']), L['lv'], L['xp']
        bt = await reload(g, True); await g.js(COUNT % RULES); await g.pg.click('#title .bt[data-k=cont]')
        await g.pg.wait_for_function("G && G.flags.vol1_done === 1", timeout=120000); await idle(g)
        st = await g.js(LEG); c = await g.js("window.__c"); L2 = await g.js(LS)
        check('whole ending played once, no second boss fight', c == {'post': 1, 'reveal': 1, 'path': 1, 'epi': 1} and await g.js("DRV.stats.battles.length") == 0 and st['zone'] == 'root', c)
        check('ending complete and consistent', set(['boss_done', 'reforged', 'path', 'vol1_done']) <= set(st['f']) and st['heart'] + st['writ'] == 1 and st['blade'] == 1 and st['pend'] is None and st['hold'] == 0 and (st['lv'], st['xp']) == (base_lv, base_xp), st)
        check('saved as finished', L2['flags'].get('vol1_done') == 1 and 'pend' not in L2 and len(L2['deeds']) == st['deeds'] > base_deeds, (L2.get('pend'), len(L2['deeds'])))
        check('no errors', not g.errs, g.errs[:3])

    print('r5b 終幕演到「這條路給誰走」那一幕關掉 → 回來從那一幕接，前面的不重演')
    async with Game() as g:
        await inject(g, True); await g.js(BOSS % RULES)
        await g.js("(() => { SCRIPTS.sc_path = async () => { window.__c.path++; await new Promise(() => { }); }; __show.battle('boss'); return 1; })()")
        await g.pg.wait_for_function("window.__c.path === 1", timeout=120000); await g.wait(150); await g.js(HIDE); await g.wait(150); L = await g.js(LS); m = await g.js(LEG)
        check('checkpoint after the reveal', L.get('pend') == {'run': 'n_cutlink'} and L['flags'].get('boss_done') == 1 and L['flags'].get('reforged') == 1 and not L['flags'].get('path') and not L['flags'].get('vol1_done'), (L.get('pend'), [k for k in ('boss_done', 'reforged', 'path', 'vol1_done') if L['flags'].get(k)]))
        heart = len([1 for i in L['items'].values() if i.get('leg') in ('heart', 'writ')]); check('the keeper\'s relic is in that save, once', heart == 1, heart)
        await reload(g, True); await g.js(COUNT % RULES); await g.pg.click('#title .bt[data-k=cont]')
        await g.pg.wait_for_function("G && G.flags.vol1_done === 1", timeout=120000); await idle(g)
        st = await g.js(LEG); c = await g.js("window.__c"); L2 = await g.js(LS)
        check('picked up at the path scene; aftermath not replayed', c['post'] == 0 and c['path'] == 1 and c['epi'] == 1, c)
        check('ending complete, nothing doubled', set(['boss_done', 'reforged', 'path', 'vol1_done']) <= set(st['f']) and st['heart'] + st['writ'] == 1 and st['blade'] == 1 and st['pend'] is None and st['luo'] == m['luo'] and st['wounds'] == m['wounds'], (st, m))
        check('saved as finished', L2['flags'].get('vol1_done') == 1 and 'pend' not in L2)
        check('no errors', not g.errs, g.errs[:3])

    print('r5c 停在「第一卷完」那一頁關掉 → 回來已經是通關後，什麼都不重演')
    async with Game() as g:
        await inject(g, True); await g.js(BOSS % RULES)
        await g.js("(() => { const n0 = notice; notice = (t, ...a) => String(t).includes('第一卷') ? (window.__end = 1, new Promise(() => { })) : n0(t, ...a); __show.battle('boss'); return 1; })()")
        await g.pg.wait_for_function("window.__end === 1", timeout=120000); await g.wait(150); await g.js(HIDE); await g.wait(150); L = await g.js(LS)
        check('saved as finished before the last page', L['flags'].get('vol1_done') == 1 and 'pend' not in L, L.get('pend'))
        await reload(g, True); await g.js(COUNT % RULES); await g.pg.click('#title .bt[data-k=cont]'); await g.wait(900); await idle(g)
        c = await g.js("window.__c"); st = await g.js(LEG); check('nothing replays', c == {'post': 0, 'reveal': 0, 'path': 0, 'epi': 0} and st['pend'] is None and st['zone'] == 'root', (c, st))
        # 通關後去摸斷鏈：只是那兩句話，不會把終幕再演一次
        await g.js("(async () => { await runScript('n_cutlink'); return 1; })()"); c = await g.js("window.__c"); check('the cut link afterwards is just a note', c['reveal'] == 0 and c['epi'] == 0, c)
        check('no errors', not g.errs, g.errs[:3])

async def r6():
    print('r6 在設定裡讀存檔碼 → 站在碼裡存的地方')
    async with Game() as g:
        await inject(g, True)
        code = await g.js("(() => { __show.base(); __show.zone('market', 16, 22); G.coin = 4321; saveGame(true); return exportSave(); })()")
        pos = await g.js("({ zone: G.zone, x: Math.round(G.pos.x), y: Math.round(G.pos.y) })")
        await g.js("(() => { __show.zone('camp', 11, 15); G.coin = 5; saveGame(true); return 1; })()")
        await g.js("(() => { openMenu('set'); return 1; })()"); await g.wait(200)
        await g.pg.fill('#svin', code); await g.pg.click('#svload'); await g.wait(1600); await idle(g)
        st = await g.js("({ zone: Z.id, x: Math.round(Z.leader.x), y: Math.round(Z.leader.y), coin: G.coin })"); L = await g.js(LS)
        check('loaded where the code was saved', st == dict(pos, coin=4321) and L['zone'] == pos['zone'] and L['coin'] == 4321, (st, pos, L['zone']))
        check('no errors', not g.errs, g.errs[:3])

async def r7():
    print('r7 照真人的速度走一遍（不快轉）：有戰後的話沒講完的存檔 → 繼續 → 用點的把話講完 → 走出窖 → 營地那段話')
    async with Game() as g:
        await g.js("(() => { newGame(); G.lv = 2; G.zone = 'vault'; G.pos = { x: 14, y: 14 }; G.flags.met_yuan = 1; G.flags.pre_z0a = 1; G.flags.pre_z0b = 1; G.party.yuan.active = true; G.party.yuan.lv = 2; G.party.yuan.hp = 60; zs('vault').enc = { z0a: 1, z0b: 1 }; G.pend = { enc: 'z0b' }; G.ts = Date.now(); localStorage.setItem('fallencourt.v1', JSON.stringify(G)); G = null; return 1; })()")
        await g.pg.reload(); await g.wait(600); await g.pg.click('#title .bt[data-k=cont]'); await g.wait(1300)
        st = await g.js("({ cut: S.cut, hold: S.hold, dlg: S.dialog, text: document.querySelector('#dlg').innerText.slice(0, 40) })"); check('talk started by itself after the fade', st['cut'] == 1 and st['hold'] == 1 and st['dlg'] and '岑鳶' in st['text'], st)
        await g.shot('resume_talk')
        for _ in range(8):
            r = await g.talk_through(80)
            if not r or not r['d']: break
            if r['c']: await g.pg.locator('#dlg .dc').first.click(); await g.wait(250)
        await g.wait(600); L = await g.js(LS); st = await g.js("({ cut: S.cut, hold: S.hold, dlg: S.dialog, mode: S.mode, deeds: G.deeds.length, pend: !!G.pend })")
        check('talk finished by tapping; saved clean', st == {'cut': 0, 'hold': 0, 'dlg': False, 'mode': 'explore', 'deeds': 1, 'pend': False} and 'pend' not in L and len(L['deeds']) == 1, (st, L.get('pend')))
        # 走去出口（真的走、真的淡出淡入），營地那段話用點的講完
        await g.js("(() => { walkTo(2, 2); return 1; })()")
        await g.pg.wait_for_function("Z && Z.id === 'camp' && S.dialog", timeout=40000); await g.wait(300)
        mid = await g.js(LS); check('while the camp talk is open the save is still the one before leaving', mid['zone'] == 'vault' and not mid['flags'].get('camp_intro'), (mid['zone'], mid['flags'].get('camp_intro')))
        for _ in range(4):
            r = await g.talk_through(80)
            if not r or not r['d']: break
        await g.wait(900); L = await g.js(LS); st = await g.js("({ zone: Z.id, cut: S.cut, hold: S.hold, slope: !!G.disc.slope, pend: S.savePend })")
        check('arrived, talk done, slope open, saved', st == {'zone': 'camp', 'cut': 0, 'hold': 0, 'slope': True, 'pend': False} and L['zone'] == 'camp' and L['disc'].get('slope') == 1 and L['flags'].get('camp_intro') == 1, (st, L['zone'], L['disc']))
        check('no errors', not g.errs, g.errs[:3])

async def main():
    want = [a for a in sys.argv[1:] if not a.startswith('-')]
    for name, fn in (('r1', r1), ('r2', r2_r3), ('r4', r4), ('r5', r5), ('r6', r6), ('r7', r7)):
        if not want or name in want or (name == 'r2' and 'r3' in want): await fn()
    print('\n' + ('全部通過' if not fails else '失敗：' + ', '.join(fails)))
if __name__ == '__main__':
    asyncio.run(main())
