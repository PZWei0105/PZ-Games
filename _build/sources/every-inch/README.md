# 寸土 EVERY INCH — 原始碼

橫向 2.5D 前線推進戰略（受《Top Force：最強統帥》啟發，只跟 AI 玩）。三條線、九個旗點、兩座指揮部：點卡片在綠色範圍部署，小兵自己推進、找掩體、開火、搶旗；佔越多旗點補給回得越快，打爆對方指揮部或時間到時旗點較多的一方獲勝。戰役是 17 個據點的白嶺凍原地圖：四個昔日同窗（火鼬卡茲、鐵砧霍爾德、白隼伊莉亞、老師塞弗林）各據一方，會互相攻打、也會打你；打下大本營後可以收編／放逐／處決，最後在白棋學院選擇三種結局。

Canvas 2D，純 JavaScript，沒有框架、沒有外部函式庫（只有 Google 字型）。收藏庫裡的 `games/every-inch/` 是打包後的單檔版本，要改遊戲請改這裡。

## 組建

```bash
python3 build.py      # dist/artifact/index.html（Claude 版）與 dist/web/（獨立網頁版：index.html＋manifest＋圖示）
```

把 `dist/web/*` 複製到 `_build/raw/every-inch/`，再照 `_build/README.md` 的流程組收藏庫。
Claude 版：用 artifact 工具發布 `dist/artifact/index.html`。存檔只用 localStorage（前綴 `everyinch.v1.`，讀寫失敗時退回記憶體）。確認視窗都是頁面裡畫的（`openModal`），不要用瀏覽器的 `confirm`。

## 結構（`src/` 依檔名順序串成一支 script）

| 檔案 | 內容 |
|---|---|
| `00_head.html` | HTML 骨架、全部 CSS（HUD、標題、地圖、基地、出擊準備、對話、結算）。直拿手機時 `#app` 整個轉 90 度（`.rot`），安全區 CSS 變數跟著換方向 |
| `01_util.js` | 數學、IK（`ik2`）、亂數、顏色、`store`、物件池、全域 `G`／`VIEW`／`SCENES` |
| `02_audio.js` | Web Audio 即時合成：約 40 種槍聲／爆炸／介面音效（以鏡頭為中心的距離與左右聲道），持續音（旋翼、引擎、火、風） |
| `03_art.js` | 外框畫風、圖塊快取 `mkSpr`／`dspr`、各勢力配色 `PAL`（含英雄）、柔光／煙／槍口焰圖塊 |
| `04_soldier.js` | **小兵骨架動畫**：零件圖塊（軀幹、頭＋六種頭飾、背包、武器）＋程序化姿勢（站／跪／蹲／趴、走跑步態）、雙手 IK 握槍、後座、換彈（彈匣掉落）、拉槍機、丟手榴彈、升旗拉繩、歡呼、迫擊砲裝填、四種陣亡（中彈後倒、跪倒、炸飛、燒倒，頭盔會飛掉、槍會掉在地上）。畫的時候用自己算的矩陣 `mPart`，不用 save/restore |
| `05_fx.js` | 粒子：槍口焰、彈殼（落地後印到地面圖層）、煙、爆炸（閃光＋火球＋黑煙＋碎片＋衝擊波＋焦痕）、火焰；地面痕跡圖層 `DECAL`（雪會慢慢蓋掉） |
| `06_vehicles.js` | 坦克（履帶片會流動、負重輪轉、砲管仰角與後座、彈簧天線、車身點頭）、裝甲運兵車（後門放人）、防空砲車（雷達轉、雙管輪流）、火箭砲車（支撐腳＋發射箱升起）、武裝直升機（透視旋翼、尾旋翼、傾斜、墜毀旋轉）、戰機、殘骸 |
| `07_data.js` | 傷害表 `DMUL`、兵種 `UDEF`、技能 `ABIL`、英雄 `HERO`、四個對手 `RIVAL`（牌組、AI 個性、台詞）、我方無線電 |
| `07b_story.js` | 戰役地圖（17 據點、道路）、基地建築 `BLD`、戰術準則、全部劇情、處置選擇、三種結局與尾聲 |
| `08_battle.js` | 戰場模擬：部署區、索敵（同線優先、可打相鄰線）、開火循環、掩體、壓制、旗點佔領（拉繩子的人）、指揮部機槍與重砲、投射物、範圍傷害、技能、英雄大招、敵方指揮官 AI、逆轉機制（主場減傷、少旗點補給加速） |
| `09_render.js` | 場景背景（四種主題）、道具、旗子、鏡頭（跟隨前線）、依深度排序繪製、彈道、雪 |
| `10_ui.js` | 指揮官頭像（側臉）、卡片縮圖（直接畫單位）、戰鬥 HUD、觸控（拖曳、雙指縮放、點一下部署） |
| `11_scenes.js` | 標題（背景自動對打）、戰鬥場景、結算、遭遇戰、設定、自動指揮 `autoPlayer` |
| `12_main.js` | 版面與旋轉、主迴圈、自動降解析度、`window.__ei` 測試掛鉤 |
| `13_campaign.js` | 戰役：地圖場景、回合（收入、敵方勢力互攻、進攻預警）、基地、出擊準備（編隊）、劇情對話、處置、結局 |
| `90_show.js` | 展示場（`#show=soldiers`、`#show=veh`）與圖示畫面 |

## 測試（需要 Playwright＋/usr/bin/google-chrome）

```bash
python3 tests/shot.py '#show=soldiers' /tmp/s.png 1400 760 "__show.step(1)"   # 每種小兵每個動作
python3 tests/shot.py '#show=veh' /tmp/v.png 1400 760 "__show.step(1.2)"       # 載具
python3 tests/shot.py '#test-holder' /tmp/b.png 844 390 "__ei.step(60)"         # 自動對打 60 秒
python3 tests/flow.py      # 新戰役 → 劇情 → 新手戰 → 地圖 → 出擊準備 → 第二戰
python3 tests/story.py     # 大本營 → 處置 → 戰術準則 → 結局
python3 tests/input.py     # 橫拿、直拿的點卡片部署與拖曳鏡頭
```

`#test-<對手>` 會開一場雙方自動指揮的戰鬥；`__ei.step(秒)` 凍結即時迴圈後快轉，回傳兵力、補給、旗點、指揮部血量。

## 收藏庫截圖

```bash
cd ../..   # 回到 _build
python3 sources/every-inch/tests/shots_steps.py > /tmp/every-inch_steps.json
python3 tools/shoot.py --game every-inch --out shots/every-inch --viewport land --dpr 2 --steps /tmp/every-inch_steps.json
```

擺設在 `tests/showcase.js`。戰鬥畫面用固定亂數種子：先完整跑一次暖身，再找出那一場最熱鬧的一格，從頭重播到那一格再拍，所以每次拍出來都一樣。改了戰鬥規則之後畫面會變，重拍後要親眼看過再上架。
