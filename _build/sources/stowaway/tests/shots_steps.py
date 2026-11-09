"""產生收藏庫截圖用的步驟檔（給 _build/tools/shoot.py 用）。

用法（在 _build 裡）：
    python3 sources/stowaway/tests/shots_steps.py > /tmp/stowaway_steps.json
    python3 tools/shoot.py --game stowaway --out shots/stowaway --viewport phone --dpr 2 --steps /tmp/stowaway_steps.json

01 標題、02 屏息（主視覺）、03 左手搖桿帶隊、04 被抓住的五秒、05 拋出去、06 選最終計畫、07 結局與航行日誌、08 艦橋遠端控制。
擺設在同資料夾的 showcase.js。x 開頭的是候選（build 不會用）。
"""
import json
import pathlib

SHOWCASE = (pathlib.Path(__file__).parent / 'showcase.js').read_text(encoding='utf-8')
Q = {"eval": "__show.quiet()"}
F = {"eval": "__show.freeze()"}

STEPS = [
    {"eval": "localStorage.clear(); 'ok'"},
    {"wait": 2600}, {"shot": "01"},
    {"eval": SHOWCASE},
    {"eval": "__show.start()"}, {"wait": 900},
    # 候選：第一幕的幼體
    {"eval": "__show.juv()"}, {"wait": 260}, F, Q, {"wait": 120}, {"shot": "x01"},
    # 02 主視覺：屏息（牠貼在冷藏庫前面聽）
    {"eval": "__show.breath()"}, {"wait": 260}, F, {"eval": "__show.breathLine()"}, {"wait": 220}, {"shot": "02"},
    {"eval": "__sw.W.breathHeld = false; __show.go(1); 'ok'"},
    # 候選：成體在餐廳聽心跳
    {"eval": "__show.hero()"}, {"wait": 240}, F, {"eval": "__show.heroLine()"}, {"wait": 160}, {"shot": "x02b"},
    # 03 帶隊：左手搖桿
    {"eval": "__show.squad()"}, {"wait": 300}, F, {"eval": "__show.squadStick()"}, {"wait": 220}, {"shot": "03"},
    {"eval": "__show.squadEnd(); __show.go(1); 'ok'"},
    # 04 被抓住
    {"eval": "__show.grab()"}, {"wait": 380}, F, {"eval": "__show.grabLine()"}, {"wait": 160}, {"shot": "04"},
    # 08 艦橋
    {"eval": "__show.bridge()"}, {"wait": 700}, {"eval": "__show.bridgeView()"}, {"wait": 420}, F, Q, {"wait": 120}, {"shot": "08"},
    # 06 幕間：選最終計畫
    {"eval": "__show.go(1)"},
    {"eval": "__show.plans()"}, {"wait": 700}, {"shot": "06"},
    {"eval": "__show.pickPlan('拋出去')"}, {"wait": 1500},
    # 05 拋出去
    {"eval": "__show.airlock()"}, {"eval": "__show.airlockWatch()"}, {"wait": 140}, {"shot": "05"},
    # 07 結局
    {"eval": "__sw.W && (__sw.W.phase = 'cine'); 'ok'"}, {"wait": 4200}, {"shot": "07"},
]

if __name__ == '__main__':
    print(json.dumps(STEPS, ensure_ascii=False))
