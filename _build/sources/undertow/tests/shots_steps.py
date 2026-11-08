"""產生收藏庫截圖用的步驟檔（給 _build/tools/shoot.py 用）。

用法（在 _build 裡）：
    python3 sources/undertow/tests/shots_steps.py > /tmp/undertow_steps.json
    python3 tools/shoot.py --game undertow --out shots/undertow --viewport phone --dpr 2 --steps /tmp/undertow_steps.json

01 標題、02 聆在聽（潛行）、03 水裡的電弧、04 撤離倒數、05 海燕號、06 升級、07 生還者。
擺設在同資料夾的 showcase.js（固定地圖種子）。另外會多拍幾張候選（x 開頭，build 不會用）。
"""
import json
import pathlib

SHOWCASE = (pathlib.Path(__file__).parent / 'showcase.js').read_text(encoding='utf-8')
Q = {"eval": "__show.quiet()"}

STEPS = [
    {"eval": "localStorage.clear(); 'ok'"},
    {"wait": 2400}, {"shot": "01"},
    {"eval": SHOWCASE},
    # 02 聆在聽
    {"eval": "__show.dive(2, 4242)"}, {"wait": 1800},
    {"eval": "__show.listen()"}, {"wait": 700}, Q, {"wait": 500}, {"eval": "__show.freeze()"}, {"wait": 300}, Q, {"wait": 80}, {"shot": "02"},
    # 03 電弧
    {"eval": "__show.dive(1, 777)"}, {"wait": 1800},
    {"eval": "__show.zap()"}, {"wait": 450}, Q, {"wait": 60}, {"shot": "x03a"},
    {"wait": 120}, {"eval": "__show.freeze()"}, Q, {"wait": 80}, {"shot": "03"},
    {"eval": "__ut.S.speed = 1; 'ok'"}, {"wait": 170}, {"eval": "__show.freeze()"}, Q, {"wait": 80}, {"shot": "x03c"},
    {"eval": "__ut.S.speed = 1; 'ok'"}, {"wait": 190}, {"eval": "__show.freeze()"}, Q, {"wait": 80}, {"shot": "x03d"},
    # 04 撤離
    {"eval": "__show.dive(0, 9001)"}, {"wait": 1800},
    {"eval": "__show.extract()"}, {"wait": 1100}, Q, {"wait": 60}, {"eval": "__show.freeze()"}, {"wait": 120}, {"shot": "04"},
    # 06 升級
    {"eval": "__ut.S.speed = 1; __ut.W.lvQ = 1; 'ok'"}, {"wait": 900}, {"shot": "06"},
    {"eval": "UI.closeModal(); __ut.W.lvQ = 0; 'ok'"},
    # 05 海燕號
    {"eval": "__show.hubState(); __ut.W.state = 'over'; UI.hub('dive'); 'ok'"}, {"wait": 1400}, {"shot": "05"},
    {"eval": "UI.hub('crew'); 'ok'"}, {"wait": 900}, {"shot": "07"},
    # 07 序章
    {"eval": "UI.story(PROLOGUE, {}, () => {}); 'ok'"}, {"wait": 1600}, {"shot": "x07"},
]

if __name__ == '__main__':
    print(json.dumps(STEPS, ensure_ascii=False))
