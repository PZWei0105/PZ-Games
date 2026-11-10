"""產生收藏庫截圖用的步驟檔（給 _build/tools/shoot.py 用）。

用法（在 _build 裡）：
    python3 sources/undertow/tests/shots_steps.py > /tmp/undertow_steps.json
    python3 tools/shoot.py --game undertow --out shots/undertow --viewport phone --dpr 2 --steps /tmp/undertow_steps.json

01 標題、02 躲在桌子底下（牠就在旁邊聽）、03 陷阱通電、04 撤離時回聲人湧過來、05 海燕號、06 被發現了（牠衝過來）、07 檔案終端。
擺設在同資料夾的 showcase.js（固定地圖種子）；__show.freeze() 會讓遊戲時間停住，畫面照樣在畫。
另外會多拍幾張候選（x 開頭，build 不會用）。
"""
import json
import pathlib

SHOWCASE = (pathlib.Path(__file__).parent / 'showcase.js').read_text(encoding='utf-8')
Q = {"eval": "__show.quiet()"}
GO = {"eval": "__ut.S.speed = 1; 'ok'"}

STEPS = [
    {"eval": "localStorage.clear(); 'ok'"},
    {"wait": 2400}, {"shot": "01"},
    {"eval": SHOWCASE},
    # 02 躲在桌子底下，牠就站在旁邊
    {"eval": "__show.dive(2, 4242)"}, {"wait": 1800},
    {"eval": "__show.hide()"}, {"wait": 700}, Q, {"wait": 80}, {"shot": "02"},
    # 候選：置物櫃
    {"eval": "__show.dive(2, 4242)"}, {"wait": 1800},
    {"eval": "__show.hide('locker')"}, {"wait": 700}, Q, {"wait": 80}, {"shot": "x02b"},
    # 03 陷阱通電
    {"eval": "__show.dive(1, 777)"}, {"wait": 1800},
    {"eval": "__show.trap()"}, {"wait": 300}, Q, {"wait": 60}, {"eval": "__show.freeze()"}, {"wait": 60}, {"shot": "x03a"},
    GO, {"eval": "__show.fire()"}, {"wait": 420}, {"eval": "__show.freeze()"}, Q, {"wait": 80}, {"shot": "03"},
    GO, {"wait": 220}, {"eval": "__show.freeze()"}, Q, {"wait": 80}, {"shot": "x03c"},
    # 04 撤離：回聲人從走廊另一頭湧過來
    {"eval": "__show.dive(0, 9001)"}, {"wait": 1800},
    {"eval": "__show.extract()"}, {"wait": 1100}, Q, {"wait": 60}, {"eval": "__show.freeze()"}, {"wait": 120}, {"shot": "04"},
    # 06 被發現了：牠四肢著地衝過來
    {"eval": "__show.dive(2, 31337)"}, {"wait": 1800},
    {"eval": "__show.chase()"}, {"wait": 260}, Q, {"wait": 60}, {"shot": "06"},
    # 候選：管道裡的牠
    {"eval": "__show.dive(1, 2468)"}, {"wait": 1800},
    {"eval": "__show.vent()"}, {"wait": 1400}, Q, {"wait": 60}, {"eval": "__show.freeze()"}, {"wait": 100}, {"shot": "x06v"},
    # 候選：強化艙三選一
    GO, {"eval": "__ut.W.cacheQ = 1; 'ok'"}, {"wait": 900}, {"shot": "x06b"},
    {"eval": "UI.closeModal(); __ut.W.cacheQ = 0; 'ok'"},
    # 05 海燕號
    {"eval": "__show.hubState(); __ut.W.state = 'over'; UI.hub('dive'); 'ok'"}, {"wait": 1400}, {"shot": "05"},
    {"eval": "UI.hub('crew'); 'ok'"}, {"wait": 900}, {"shot": "x07b"},
    {"eval": "UI.hub('files'); __show.terminal(); 'ok'"}, {"wait": 3600}, {"shot": "07"},
    {"eval": "UI.closeModal(); 'ok'"},
    # 序章（候選）
    {"eval": "UI.story(PROLOGUE, {}, () => {}); 'ok'"}, {"wait": 1600}, {"shot": "x07"},
]

if __name__ == '__main__':
    print(json.dumps(STEPS, ensure_ascii=False))
