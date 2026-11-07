"""產生收藏庫截圖用的步驟檔（給 _build/tools/shoot.py 用）。

用法（在 _build 裡）：
    python3 sources/dreamthief/tests/shots_steps.py > /tmp/dreamthief_steps.json
    python3 tools/shoot.py --game dreamthief --out shots/dreamthief --viewport phone --dpr 2 --steps /tmp/dreamthief_steps.json

01 標題、02 林老師的琴房（開打、記憶光柱）、03 老韓的夜班（敲鐘撤離）、04 頭目「指揮」、05 夜當、06 當鋪、07 序章。
擺設在同資料夾的 showcase.js（固定地圖種子）。另外會多拍幾張候選（x 開頭，build 不會用），想換的話改名成對應的編號。
"""
import json
import pathlib

SHOWCASE = (pathlib.Path(__file__).parent / 'showcase.js').read_text(encoding='utf-8')
Q = {"eval": "__show.quiet()"}

STEPS = [
    {"wait": 2600}, {"shot": "01"},
    {"eval": SHOWCASE},
    # 02 開打：琴房、深眠、記憶光柱
    {"eval": "__show.save(); __show.dive(1)"}, {"wait": 3100},
    {"eval": "__show.layer(404, 1, 34); __show.fight({lvl: 10, d: 3.4, ups: {chain: 3, blades: 2, burn: 1, rate: 3}}); __show.loot([2, 4, 3]); __show.reveal(16); __show.horde(1)"},
    {"wait": 450}, Q, {"wait": 60}, {"shot": "x02a"},
    {"wait": 350}, Q, {"wait": 60}, {"shot": "02"},
    # 03 撤離：老韓的夜班、敲鐘守住
    {"eval": "__show.save(); __show.dive(0)"}, {"wait": 3100},
    {"eval": "__show.layer(22, 1, 64); __show.bell({}); __show.reveal(16); __show.horde(3)"},
    {"wait": 850}, Q, {"wait": 60}, {"shot": "03"},
    {"wait": 400}, Q, {"wait": 60}, {"shot": "x03b"},
    # 04 頭目：林老師的夢核「指揮」
    {"eval": "__show.save(); __show.dive(1)"}, {"wait": 3100},
    {"eval": "__show.layer(31, 2, 46); __show.boss({}); __show.god(); __show.reveal(16)"},
    {"wait": 3200}, {"eval": "__show.act('ring')"},
    {"wait": 500}, Q, {"wait": 60}, {"shot": "x04a"},
    {"wait": 350}, Q, {"wait": 60}, {"shot": "04"},
    {"wait": 350}, Q, {"wait": 60}, {"shot": "x04c"},
    {"wait": 350}, Q, {"wait": 60}, {"shot": "x04d"},
    {"wait": 700}, {"eval": "__show.act('staff')"},
    {"wait": 600}, Q, {"wait": 60}, {"shot": "x04e"},
    {"wait": 500}, Q, {"wait": 60}, {"shot": "x04f"},
    # 05 夜當
    {"eval": "__show.save(); W = null; UI.hub([['shen', '有些東西留著，比賣掉值錢。我說的不是錢。']])"}, {"wait": 1600}, {"shot": "05"},
    # 06 當鋪
    {"eval": "__show.counter(); UI.pawn()"}, {"wait": 1200}, {"shot": "06"},
    # 07 序章
    {"eval": "closeSheet('pawn'); UI.playScene({ lines: PROLOGUE, scene: 'prologue' }, () => {})"}, {"wait": 2600}, {"shot": "07"},
    {"eval": "$('#scene').click()"}, {"wait": 2200}, {"shot": "x07b"},
    {"eval": "$('#scene').click()"}, {"wait": 2600}, {"shot": "x07c"},
    {"eval": "$('#scene').click()"}, {"wait": 2600}, {"shot": "x07d"},
]

if __name__ == '__main__':
    print(json.dumps(STEPS, ensure_ascii=False))
