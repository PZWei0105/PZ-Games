#!/usr/bin/env python3
"""逐畫面截圖檢查：python3 tests/qa.py [w h] [前綴]。先用 JS 直接把存檔推到中盤，再一個一個畫面開。"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pw import Game
SETUP = """(() => {
  const t = document.querySelector('#title'); if (t) t.remove();
  newGame(); const f = G.flags; for (const k of ['met_yuan','camp_intro','slope_intro','r_hammer','r_blind','r_zhu','r_ear','market_seen','scale_met','threejaw_dead','piece1','piece2','c1_done','ledger_saved','warden_hesitated','saw_memorial','met_luchen','sump_intro','gallery_intro']) f[k] = 1;
  G.lv = 6; G.xp = 90; joinHero('yuan'); joinHero('luo'); G.party.wei.lv = 6; G.party.wei.skills = ['w_lift','w_slam','w_dash','w_time']; G.party.wei.ultOk = true; G.party.wei.tal = { w3a: 1, w5b: 1 }; G.party.yuan.tal = { y3b: 1 }; G.pieces = 2;
  rnd = mulberry32(77);
  for (let i = 0; i < 9; i++) giveItem(genItem({ il: 4 + (i % 3), rar: [1,2,3,1,2,0,3,2,1][i], party: ['wei','yuan','luo'] }));
  for (const k of ['collar','chair','patchrobe']) giveItem(genLegend(k));
  equipItem('wei', G.bag.find(u => G.items[u].leg === 'collar')); equipItem('yuan', G.bag.find(u => G.items[u].leg === 'chair'));
  rnd = Math.random;
  G.coin = 486; G.scrap = 34; G.dust = 6; G.lacquer = 2; G.cons = { potion: 3, fire: 1, float: 2 }; G.shards = [1,2,3,5,8]; G.aff = { yuan: 5, luo: 3 }; G.rep = { ji: 2, bang: -1, shou: 0 };
  for (const z of ['camp','slope','market','sump','gallery']) G.disc[z] = 1; for (const k of ['hound','spitter','crab','warden','drone','threejaw','unmoored','moss']) G.seenFoe[k] = 1;
  deed('最底下的窖裡，有一個人醒了過來。岑鳶把他領了回去。'); deed('坡上，他救了繩幫的收稅人，換岑鳶的三頁帳。'); deed('墜碑上有他的名字。刻了三百年了。');
  G.party.luo.wounds = 1; G.party.wei.hp = 96;
  S.set.hints = false; enterZone('camp'); hudMode('explore'); return 'ok'; })()"""
async def main():
    w = int(sys.argv[1]) if len(sys.argv) > 1 else 390; h = int(sys.argv[2]) if len(sys.argv) > 2 else 844; pre = sys.argv[3] if len(sys.argv) > 3 else 'q'
    async with Game(w, h) as g:
        print(await g.js(SETUP)); await g.wait(900)
        await g.shot(pre + '01_camp')
        for tab in ['party', 'bag', 'ledger', 'window', 'codex', 'set']:
            await g.do(f"openMenu('{tab}')"); await g.wait(350); await g.shot(f'{pre}02_menu_{tab}')
        await g.do("openMenu('party'); document.querySelector('#panel .pb').scrollTop = 520"); await g.wait(250); await g.shot(pre + '02_menu_party2')
        await g.do("panelClose(); openEquip('wei','weapon')"); await g.wait(300); await g.shot(pre + '03_equip')
        await g.do("modalClose(); openForge()"); await g.wait(300); await g.shot(pre + '04_forge')
        await g.do("panelClose(); openEngrave()"); await g.wait(300); await g.shot(pre + '05_engrave')
        await g.do("panelClose(); openHerb()"); await g.wait(300); await g.shot(pre + '06_herb')
        await g.do("panelClose(); openBoard()"); await g.wait(300); await g.shot(pre + '07_board')
        await g.do("panelClose(); openShop()"); await g.wait(300); await g.shot(pre + '08_shop')
        await g.do("panelClose(); openLayerMap()"); await g.wait(300); await g.shot(pre + '09_map')
        await g.do("modalClose(); S.cut++; say('yuan', '看到那個光點沒有？這底下每個人都看得到。那就是上面。\\n上面有路可以出去。……有人是這樣說的。')"); await g.wait(1800); await g.shot(pre + '10_say')
        await g.do("Dlg.adv(); Dlg.adv(); choose([{ t: '把油引給鏽錨集。', sub: '集裡的燈會亮。碑前的火會熄。' }, { t: '不動它。', sub: '火留著。集裡只能收繩幫的油——和繩幫開的價。' }, { t: '分渠。一邊一半。', sub: '陸沉答應了。條件是：讓她父親下來。', key: true }, { t: '再想想。' }])"); await g.wait(400); await g.shot(pre + '11_choose')
        await g.do("endTalk(); S.cut = 0; say('luo', '集裡的燈不能滅。\\n我守了四年的門。燈滅了，門就沒有用了。', { right: true })"); await g.wait(1500); await g.shot(pre + '12_say_luo')
        await g.do("endTalk(); showLoot({ title: '精英', xp: 120, coin: 34, mats: { scrap: 3, dust: 1, lacquer: 1 }, ups: [7], items: [genItem({ il: 6, rar: 1 }), genItem({ il: 6, rar: 3 }), genLegend('feather')] })"); await g.wait(3300); await g.shot(pre + '13_loot')
        await g.do("modalClose(); chooseTalent({ id: 'yuan', t: HERO.yuan.talents[1] })"); await g.wait(300); await g.shot(pre + '14_talent')
        await g.do("modalClose(); sceneRose(G.shards.slice(), '殘窗　5 / 12'); say(null, SHARDS[2])"); await g.wait(1600); await g.shot(pre + '15_shard')
        await g.do("endTalk(); sceneOff(); notice('第一卷　壓艙層　完', '<div class=\"end\">' + epilogue().map(a => '<h4>' + a[0] + '</h4>' + a[1]).join('') + '</div>', '留在底層')"); await g.wait(900); await g.shot(pre + '16_end')
        await g.do("modalClose(); zoneTitle(ZONES.sump)"); await g.wait(900); await g.shot(pre + '17_ztitle')
if __name__ == '__main__':
    asyncio.run(main())
