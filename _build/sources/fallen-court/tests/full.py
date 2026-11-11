#!/usr/bin/env python3
"""整條主線自動跑一遍：python3 tests/full.py [A|B|C|D|all]"""
import asyncio, sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pw import Game, ROOT
COMMON = ['「好。」', '=過去', '「走吧。」', '坐下', '「我跟妳去找。」', '「淺的是什麼？」', '「不管我是誰，路都是往上。」', '「不管上面是什麼，一起看。」', '「每一天']
VARS = {
 # 善意線：換三頁帳、分渠、整本給她看不插手、攤簿、解令守集
 'A': dict(rules=COMMON + ['撕掉岑鳶的那幾頁', '油，可以分嗎', '「那是我。」', '分渠', '走岑鳶當年逃出來的那條路', '把簿子遞給她。整本', '（不插手。）', '把上貢簿攤給全集的人看', '「有人問了。」', '「下去。去守鏽錨集。」'], bounty=True),
 # 狠線：拿債簿賣回去、賣閘、撕頁、接買賣、斬、封鏈
 'B': dict(rules=COMMON + ['拿走債簿。人留在這裡', '賣。', '把這道閘的位置賣給繩幫', '「我不記得。」', '打進去', '撕掉寫著', '「你的買賣，我接。」', '（什麼都不說。把劍舉起來。）', '封鏈'], sellBook=True),
 # 救算盤、引油、燒簿、動手殺、斬、開鏈
 'C': dict(rules=COMMON + ['搬開板子，救他', '把油引給鏽錨集', '（什麼都不說。）', '付攀稅', '燒掉', '動手', '（殺了他。）', '（什麼都不說。把劍舉起來。）', '開鏈'], bounty=True),
 # 不動閘、站岑鳶（駱山走）、放卓九斤、解令停機；不做支線
 # 兩個同伴都走：站岑鳶（駱山走）→ 接買賣（岑鳶走）→ 一個人上鏈根、斬、設關
 'E': dict(rules=COMMON + ['搬開板子，救他', '把油引給鏽錨集', '「我不記得。」', '付攀稅', '把簿子遞給她。整本', '「岑鳶說得對。」', '「你的買賣，我接。」', '（什麼都不說。把劍舉起來。）', '設關']),
 'D': dict(rules=COMMON + ['拿走債簿。人留在這裡', '把債簿交給她', '不動它', '打進去', '把簿子遞給她。整本', '「岑鳶說得對。」', '動手', '「往上走。別回來。」', '「有人問了。」', '「停機。你守完了。」'], skipSide=True),
}
async def run(name):
    V = VARS[name]; V['name'] = name
    async with Game() as g:
        for fjs in ('bot.js', 'driver.js', 'scenario.js'):
            await g.pg.add_script_tag(path=os.path.join(ROOT, 'tests', fjs))
        g.pg.set_default_timeout(900000)
        try:
            r = await g.pg.evaluate("(V) => playAll(V).then(r => r, e => 'ERR: ' + (e && e.stack || e))", V)
        except Exception as e:
            r = 'EVAL FAIL ' + str(e)
        st = await g.js("JSON.stringify({log: DRV.log, st: DRV.stats, zone: Z && Z.id, lv: G && G.lv, flags: G && Object.keys(G.flags).filter(k => G.flags[k] && !k.startsWith('pre_') && !k.startsWith('seen_')), rep: G && G.rep, aff: G && G.aff, coin: G && G.coin, mats: G && [G.scrap, G.dust, G.lacquer], shards: G && G.shards.length, sh: G && G.shards, legs: G && Object.keys(G.lore), party: G && G.roster.filter(i => G.party[i].active), deeds: G && G.deeds.map(d => d.t), bag: G && G.bag.length, sec: G && Math.round(G.stat.sec)})")
        st = json.loads(st)
        print(f'===== 變體 {name}: {r}')
        print('區域', st['zone'], '等級', st['lv'], '隊伍', st['party'], '銖', st['coin'], '料', st['mats'], '殘窗', st['shards'], '背包', st['bag'])
        print('聲望', st['rep'], '情誼', st['aff'])
        print('金繼', st['legs']); print('殘窗', st.get('sh'))
        if st['log']: print('LOG', st['log'])
        print('敗北', st['st']['defeats'])
        for b in st['st']['battles']:
            print(f"  {b['id']:5} {b['over']:5} lv{b['lv']} {b['n']}人 輪 {b['rounds']:5} 開場血 {b['start']:3}% 失血 {b['loss']:3}% 倒 {b['downs']} 連攜 {b['links']} 墜 {b['slams']}  {b['ms']}ms")
        if '-v' in sys.argv:
            print('旗標', st['flags']); print('\n'.join('  ' + c for c in st['st']['choices'])); print('\n'.join('  秤簿：' + d for d in st['deeds']))
        await g.shot('full_' + name)
        return r
async def main():
    which = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else 'A'
    for n in (VARS.keys() if which == 'all' else [which]):
        await run(n)
if __name__ == '__main__':
    asyncio.run(main())
