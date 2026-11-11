#!/usr/bin/env python3
"""戰鬥畫面截圖：python3 tests/qa_battle.py [w h] [前綴] [遭遇]"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pw import Game
from qa import SETUP
async def main():
    w = int(sys.argv[1]) if len(sys.argv) > 1 else 390; h = int(sys.argv[2]) if len(sys.argv) > 2 else 844; pre = sys.argv[3] if len(sys.argv) > 3 else 'b'; enc = sys.argv[4] if len(sys.argv) > 4 else 'o3'
    async with Game(w, h) as g:
        print(await g.js(SETUP)); await g.wait(300)
        zone = await g.js(f"ENC['{enc}'].zone")
        await g.do(f"for (const k in SCRIPTS) if (k.startsWith('pre_') || k.startsWith('arrive_') || k.startsWith('tr_') || k === 'e_boss') SCRIPTS[k] = async () => {{}}; G.party.wei.hp = heroNow('wei').hpMax; flag('b07_on'); flag('bcity_on'); flag('zhuo_fight'); flag('elder_fight'); enterZone('{zone}'); hudMode('explore'); const gp = Z.groups.find(x => x.id === '{enc}'); teleport(gp.e.x - 3, gp.e.y + 3); engage(gp, 0)")
        await g.wait(2600); await g.shot(pre + '1_start')
        print(await g.js("JSON.stringify({mode: S.mode, BI: !!BI, cur: B && B.cur, foes: B && B.units.filter(u => u.side === 'foe').map(u => u.type + ':' + u.row)})"))
        # 等到輪到自己人
        for _ in range(40):
            if await g.js("!!BI"): break
            await g.wait(300)
        await g.shot(pre + '2_cmd')
        # 選第二招，看預覽
        await g.do("const c = BI.cmds.find(x => !x.no && x.sk.tg === 'foe' && x.sk.id !== HERO[BI.u.hero].basic) || BI.cmds[0]; pickCmd(c); const T0 = skillTargets(BI.u, c.sk); if (T0.units.length) setPick(T0.units[T0.units.length - 1])")
        await g.wait(400); await g.shot(pre + '3_preview')
        await g.do("openIntel()"); await g.wait(300); await g.shot(pre + '4_intel')
        await g.do("modalClose(); confirmAct()"); await g.wait(700); await g.shot(pre + '5_act')
        await g.wait(900); await g.shot(pre + '6_act2')
        # 直接看奧義特寫與合體技
        for _ in range(40):
            if await g.js("!!BI"): break
            await g.wait(300)
        await g.do("for (const u of allHeroes()) { u.mom = 5; u.ultOk = true; } B.reso = B.resoMax; renderCmds(); uiBattleRefresh()"); await g.wait(200); await g.shot(pre + '7_full')
        await g.do("const u = BI.u; const c = BI.cmds.find(x => x.sk.id === 'c_unison'); renderCmds(); pickCmd(BI.cmds.find(x => x.sk.id === 'c_unison')); confirmAct()")
        await g.wait(500); await g.shot(pre + '8_cutin'); await g.wait(1100); await g.shot(pre + '9_unison'); await g.wait(1500); await g.shot(pre + '9b_after')
if __name__ == '__main__':
    asyncio.run(main())
