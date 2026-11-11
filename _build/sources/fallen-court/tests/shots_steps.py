"""產生收藏庫截圖用的步驟檔（給 _build/tools/shoot.py 用）。

用法（在 _build 裡）：
    python3 sources/fallen-court/tests/shots_steps.py > /tmp/fallen_steps.json
    python3 tools/shoot.py --game fallen-court --out shots/fallen-court --viewport phone --dpr 2 --timeout 300 --steps /tmp/fallen_steps.json

01 標題、02 戰鬥（選招時的預覽）、03 骸骨坡、04 抉擇、05 覆舟營、06 戰利品、07 層主、08 對話。
擺設在同資料夾的 showcase.js。x 開頭的是候選（build 不會用）。
雲端沙盒是用 CPU 算圖，戰鬥開場要等久一點；等待時間抓得寬，慢的機器也拍得到。
"""
import json
import pathlib

SHOWCASE = (pathlib.Path(__file__).parent / 'showcase.js').read_text(encoding='utf-8')
Q = {"eval": "__show.quiet()"}
END_BATTLE = {"eval": "(() => { if (typeof BI !== 'undefined' && BI) { const r = BI.res; BI = null; BV.sel = null; r('flee'); } return 'ok'; })()"}


def explore(zone, x, y, wx, wy, name, cy=.52, zk=1, look=None):
    """站到 (x, y)、走到 (wx, wy)（讓同伴散開跟上），拍一張。look＝鏡頭改看哪裡（不跟人）"""
    return [{"eval": "__show.zone('%s', %s, %s)" % (zone, x, y)}, {"eval": "__show.frame(%s, %s)" % (cy, zk)}, {"wait": 250},
            {"eval": "__show.walk(%s, %s)" % (wx, wy)}, {"wait": 3600},
            *([{"eval": "__show.look(%s, %s)" % look}, {"wait": 200}] if look else []), Q, {"wait": 80}, {"shot": name}]


def fight(enc, first, sk, ti, name, wait=5600):
    """開一場戰鬥、讓 first 先動、選好招與目標（看得到出手前的預覽），拍一張，然後撤退"""
    return [{"eval": "__show.battle('%s', '%s')" % (enc, first)}, {"wait": wait}, Q, {"eval": "__show.mom(3)"}, {"wait": 150}, {"log": "__show.hero()"},
            {"eval": "__show.act('%s', %d)" % (sk, ti)}, {"wait": 700}, {"shot": name}, END_BATTLE, {"wait": 1800}]


STEPS = [
    {"eval": "(() => { try { localStorage.clear(); } catch (e) {} S.set.gfx = 'hi'; resize(); return 'ok'; })()"},
    {"wait": 2600}, {"shot": "01"},
    {"eval": SHOWCASE},
    {"eval": "__show.base()"}, {"wait": 900}, {"eval": "__show.calm(true)"},
    # 05 覆舟營
    *explore('camp', 12.3, 19.6, 11.3, 15.5, '05', .6, .9, (12.3, 13.5)),
    # 03 骸骨坡：從背後摸近負骸蟹與兩隻吐酸蜥（地上那片紅是牠們看得到的範圍）
    *explore('slope', 33, 20.5, 33.3, 18.0, '03', .6, 1, (31.9, 17.3)),
    # 08 對話：岑鳶的彩窗立繪
    *explore('slope', 30.5, 24.5, 33.2, 20.6, 'x08a', .4),
    {"eval": "__show.talk('yuan', '看到那個光點沒有？這底下每個人都看得到。那就是上面。\\n上面有路可以出去。……有人是這樣說的。')"}, {"wait": 2800}, Q, {"shot": "08"},
    {"eval": "__show.done()"}, {"wait": 200},
    # 候選：骸骨坡另一處、鏽錨集、懸骸廊、墜碑
    *explore('slope', 25.6, 15, 21.4, 13.8, 'x03a'),
    *explore('market', 16, 24.5, 16, 17.6, 'x03b'),
    *explore('gallery', 19, 24.6, 19, 20.8, 'x03c'),
    *explore('sump', 14.5, 12.8, 10, 11, 'x03d', .62),
    # 04 抉擇：沉油渠的閘
    *explore('sump', 11.5, 10.5, 8, 12.8, 'x04a', .44),
    {"eval": "__show.pick([{ t: '把油引給鏽錨集。', sub: '集裡的燈會亮。碑前的火會熄。' }, { t: '不動它。', sub: '火留著。集裡只能收繩幫的油——和繩幫開的價。' }, { t: '分渠。一邊一半。', sub: '陸沉答應了。條件是：讓她父親下來。', key: true }, { t: '再想想。' }])"},
    {"wait": 700}, Q, {"wait": 80}, {"shot": "04"},
    {"eval": "__show.done()"}, {"wait": 200},
    # 06 戰利品
    {"eval": "(() => { rnd = mulberry32(5); showLoot({ title: '精英', xp: 120, coin: 34, mats: { scrap: 3, dust: 1, lacquer: 1 }, ups: [8], items: [genItem({ il: 6, rar: 1 }), genItem({ il: 6, rar: 3 }), genLegend('feather')] }); rnd = Math.random; return 'ok'; })()"},
    {"wait": 3800}, {"shot": "06"},
    {"eval": "(() => { modalClose(); return 'ok'; })()"}, {"wait": 200},
    # 候選：殘窗、隊伍、剖面圖
    {"eval": "(() => { sceneRose(G.shards.slice(), '殘窗　6 / 12'); S.cut++; say(null, SHARDS[2]); return 'ok'; })()"}, {"wait": 2400}, {"shot": "x06b"},
    {"eval": "(() => { endTalk(); sceneOff(); S.cut = 0; return 'ok'; })()"}, {"wait": 800},
    {"eval": "(() => { openMenu('party'); return 'ok'; })()"}, {"wait": 600}, {"shot": "x06c"},
    {"eval": "(() => { panelClose(); openLayerMap(); return 'ok'; })()"}, {"wait": 500}, {"shot": "x06d"},
    {"eval": "(() => { modalClose(); return 'ok'; })()"}, {"wait": 200},
    # 02 戰鬥：骸骨坡頂的三顎。魏子葳選了「挑月」，看得到出手前的預覽
    {"eval": "(() => { G.flags.threejaw_dead = 0; return 'ok'; })()"},
    *fight('s6', 'wei', 'w_lift', 1, '02'),
    # 候選：懸骸廊的把頭、沉油渠的苔
    *fight('h3', 'wei', 'w_lift', 0, 'x02a'),
    *fight('o4', 'yuan', 'y_mark', 0, 'x02b'),
    # 07 層主
    *fight('boss', 'yuan', 'y_mark', 0, '07', 6000),
]

if __name__ == '__main__':
    print(json.dumps(STEPS, ensure_ascii=False))
