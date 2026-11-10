"""產生收藏庫截圖用的步驟檔（給 _build/tools/shoot.py 用）。

用法（在 _build 裡）：
    python3 sources/every-inch/tests/shots_steps.py > /tmp/every-inch_steps.json
    python3 tools/shoot.py --game every-inch --out shots/every-inch --viewport land --dpr 2 --steps /tmp/every-inch_steps.json

01 標題（封面）、02 主視覺（直升機壓上、爆炸）、03 選卡部署、04 放大特寫、05 空襲、06 戰區地圖、07 收編或處決、08 基地升級。
擺設在同資料夾的 showcase.js：戰鬥畫面用固定亂數種子重播，每次拍出來都一樣。
"""
import json
import pathlib

SHOWCASE = (pathlib.Path(__file__).parent / 'showcase.js').read_text(encoding='utf-8')

STEPS = [
    {"wait": 2800}, {"shot": "01"},
    {"eval": SHOWCASE},
    {"eval": "JSON.stringify(__S.shot02())"}, {"wait": 200}, {"shot": "02"},
    {"eval": "JSON.stringify(__S.shot03())"}, {"wait": 200}, {"shot": "03"},
    {"eval": "JSON.stringify(__S.shot04())"}, {"wait": 200}, {"shot": "04"},
    {"eval": "JSON.stringify(__S.shot05())"}, {"wait": 200}, {"shot": "05"},
    {"eval": "__S.shot06()"}, {"wait": 1200}, {"shot": "06"},
    {"eval": "__S.shot07()"}, {"wait": 900}, {"shot": "07"},
    {"eval": "__S.shot08()"}, {"wait": 700}, {"shot": "08"},
]

if __name__ == '__main__':
    print(json.dumps(STEPS, ensure_ascii=False))
