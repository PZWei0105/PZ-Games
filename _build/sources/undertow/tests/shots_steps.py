"""產生收藏庫截圖用的步驟檔（給 _build/tools/shoot.py 用）。
06 會拍 x06a／x06c／x06d 三張（燈在閃，每張亮度不同），用 pick06.py 挑最亮的一張當 06。

用法（在 _build 裡）：
    python3 sources/undertow/tests/shots_steps.py > /tmp/undertow_steps.json
    python3 tools/shoot.py --game undertow --out shots/undertow --viewport phone --dpr 2 --steps /tmp/undertow_steps.json

01 標題、02 聆在聽（潛行＋偵測器＋警示燈）、03 水裡的電弧、04 撤離倒數、05 海燕號、06 管道裡的牠、07 檔案終端。
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
    {"eval": "__show.listen()"}, {"wait": 900}, Q, {"wait": 700}, {"eval": "__show.freeze()"}, {"wait": 300}, Q, {"wait": 80}, {"shot": "02"},
    {"eval": "__ut.S.speed = 1; 'ok'"}, {"wait": 450}, {"eval": "__show.freeze()"}, Q, {"wait": 80}, {"shot": "x02b"},
    # 03 電弧
    {"eval": "__show.dive(1, 777)"}, {"wait": 1800},
    {"eval": "__show.zap()"}, {"wait": 450}, Q, {"wait": 60}, {"shot": "x03a"},
    {"wait": 120}, {"eval": "__show.freeze()"}, Q, {"wait": 80}, {"shot": "03"},
    {"eval": "__ut.S.speed = 1; 'ok'"}, {"wait": 170}, {"eval": "__show.freeze()"}, Q, {"wait": 80}, {"shot": "x03c"},
    {"eval": "__ut.S.speed = 1; 'ok'"}, {"wait": 190}, {"eval": "__show.freeze()"}, Q, {"wait": 80}, {"shot": "x03d"},
    # 04 撤離
    {"eval": "__show.dive(0, 9001)"}, {"wait": 1800},
    {"eval": "__show.extract()"}, {"wait": 1100}, Q, {"wait": 60}, {"eval": "__show.freeze()"}, {"wait": 120}, {"shot": "04"},
    # 06 管道裡的牠
    {"eval": "__show.dive(1, 2468)"}, {"wait": 1800},
    {"eval": "__show.vent()"}, {"wait": 1400}, Q, {"wait": 60}, {"eval": "__show.freeze()"}, {"wait": 100}, {"shot": "x06a"},
    {"eval": "__ut.S.speed = 1; 'ok'"}, {"wait": 130}, {"eval": "__show.freeze()"}, {"wait": 60}, {"shot": "x06c"},
    {"eval": "__ut.S.speed = 1; 'ok'"}, {"wait": 170}, {"eval": "__show.freeze()"}, {"wait": 60}, {"shot": "x06d"},
    # 升級（候選）
    {"eval": "__ut.S.speed = 1; __ut.W.lvQ = 1; 'ok'"}, {"wait": 900}, {"shot": "x06b"},
    {"eval": "UI.closeModal(); __ut.W.lvQ = 0; 'ok'"},
    # 05 海燕號
    {"eval": "__show.hubState(); __ut.W.state = 'over'; UI.hub('dive'); 'ok'"}, {"wait": 1400}, {"shot": "05"},
    {"eval": "UI.hub('crew'); 'ok'"}, {"wait": 900}, {"shot": "x07b"},
    {"eval": "UI.hub('files'); __show.terminal(); 'ok'"}, {"wait": 3600}, {"shot": "07"},
    {"eval": "UI.closeModal(); 'ok'"},
    # 07 序章
    {"eval": "UI.story(PROLOGUE, {}, () => {}); 'ok'"}, {"wait": 1600}, {"shot": "x07"},
]

if __name__ == '__main__':
    print(json.dumps(STEPS, ensure_ascii=False))
