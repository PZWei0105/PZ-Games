"""產生收藏庫截圖用的步驟檔（給 _build/tools/shoot.py 用）。

用法（在 _build 裡）：
    python3 sources/landfall/tests/shots_steps.py > /tmp/landfall_steps.json
    python3 tools/shoot.py --game landfall --out shots/landfall --viewport phone --dpr 2 --steps /tmp/landfall_steps.json

01 標題、02 入夜的殖民地、03 打開冬眠艙（唐槿）、04 潮夜與潮母、05 船員檔案（安娜）、06 建造選單。
擺設內容在同資料夾的 showcase.js（固定種子 20261107）。
"""
import json
import pathlib

SHOWCASE = (pathlib.Path(__file__).parent / 'showcase.js').read_text(encoding='utf-8')

STEPS = [
    {"wait": 2600}, {"shot": "01"},
    {"eval": SHOWCASE},
    {"eval": "__showcase()"}, {"wait": 2400},
    {"eval": "el('toasts').replaceChildren()"}, {"wait": 300}, {"shot": "02"},
    {"eval": "G.power.stored=300; UI.doWake(G.pods.find(p=>p.key==='tang'&&p.status==='sleep'))"},
    {"wait": 2800}, {"shot": "03"},
    {"eval": "if(UI.modal) UI.modal.done(); UI.q=[]; __tideShow()"}, {"wait": 900}, {"shot": "04"},
    {"eval": "G.tide.phase='done'; G.tide.blackout=false; G.beasts=[]; G.t=(G.day-1)*DAY+10*60; "
             "el('toasts').replaceChildren(); const a=C('anna'); centerOn(a.x,a.y); UI.select({kind:'c',o:a})"},
    {"wait": 1300}, {"shot": "05"},
    {"eval": "UI.closeSheet(); el('toasts').replaceChildren(); UI.buildTab='work'; UI.openSheet('build')"},
    {"wait": 1000}, {"shot": "06"},
]

if __name__ == '__main__':
    print(json.dumps(STEPS, ensure_ascii=False))
