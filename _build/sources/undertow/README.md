# 深艙 UNDERTOW — 原始碼

深海搜打撤（側視剖面的研究站，一間一間艙室往下搜、救人、撤離）。壓力不靠滿地的怪，靠聲音：站裡的獵手「聆」看不見，只會走到最後聽到聲音的地方。Canvas 2D，純 JavaScript，沒有框架、沒有外部函式庫（只有 Google 字型）。
收藏庫裡的 `games/undertow/` 是打包後的單檔版本，要改遊戲請改這裡。完整企劃（取捨、數值骨架、武器、敵人、劇情、三個結局）在 `DESIGN.md`。

## 組建

```bash
python3 build.py      # dist/artifact/index.html（Claude 版）與 dist/web/（獨立網頁版：index.html＋manifest＋圖示）
```

把 `dist/web/*` 複製到 `_build/raw/undertow/`，再照 `_build/README.md` 的流程組收藏庫。
Claude 版：用 artifact 工具發布 `dist/artifact/index.html`（作品：https://claude.ai/artifact/NFGBYfw3gAVWvaHSmQwGqD）。存檔只用 localStorage（`undertow.v1`，讀寫失敗時退回記憶體），換裝置靠存檔碼 `UT1:`。

## 結構（`src/` 依檔名順序串成一支 script）

| 檔案 | 內容 |
|---|---|
| `00_head.html` | HTML 骨架、全部 CSS（深海青＋警示橘）、HUD（直拿、橫拿、電腦三種排法） |
| `01_util.js` | 數學、亂數（mulberry32）、顏色、DOM 小工具 |
| `02_data.js` | 房間尺寸、稀有度、7 種武器、10 種被動、5 種怪、5 個艙段（含聆的血量與聽力）、無盡模式、24 種艙室主題、12 位生還者、藏品、整備升級（`META`）、藍圖 |
| `03_story.js` | 24 段錄音・日誌（`LOGS`）、老韓的無線電提示（`RADIO`）、序章、最終場景、選擇後的對白、三個結局 |
| `04_audio.js` | WebAudio 即時合成：音效（帶距離與左右聲道）、殘響、各艙段環境音、跟著緊張度走的配樂、心跳 |
| `05_save.js` | 存檔、整備等級、藏品與生還者加成、存檔碼 |
| `06_mapgen.js` | 種子地圖：C×F 格艙室、坍塌艙、梯井（保證全部走得到）、艙門、上鎖的金庫、撤離塢、深艙、逃生艙、主題與擺設、生還者、搜索點、躲藏點、機器、陷阱艙與保險絲、站裡的回聲人與牆裡的人 |
| `07_art.js` | 房間背景快取（`paintRoom`）、各種擺設、潛水員、聆、怪、生還者、林汐、圖示與頭像 |
| `08_world.js` | 世界狀態 `W`：移動與爬梯、聲音傳播（房間圖的隔音成本）、槍與保命工具、怪的尋路、聆的狀態機（躲藏、憋氣、心跳、會學）、陷阱、深壓與進水、搜索與互動、撤離、最終場景與母聆 |
| `09_render.js` | 鏡頭（上下會讓出 HUD 的空間）、站體外殼與海床、房間動態、門、水、半解析度光照與光暈層、聲波圈、提示、邊緣指示、小地圖 |
| `10_ui.js` | 標題、海燕號（下潛／整備／生還者／檔案／藏品）、出發準備、HUD、字幕佇列（緊急的無線電會插隊）、強化艙三選一、暫停、設定、結算、劇情播放 |
| `11_main.js` | 浮動搖桿、鍵盤、主迴圈（固定 1/60 秒更新、卡頓時自動降解析度）、開機；`window.__ut` 測試掛鉤 |

## 測試（需要 Playwright＋/usr/bin/google-chrome）

```bash
python3 tests/run.py shots              # 標題、序章、海燕號、出發準備、下潛畫面截圖到 /tmp/ut/shots
SPEED=3 SECS=170 python3 tests/run.py bot 0   # 自動玩第 1 艙段（搜、救、打、呼叫潛艇、登艇）；加 god 不會死；SPEED 是時間倍速
python3 tests/run.py perf               # 每幀繪製與更新時間
python3 tests/scenarios.py              # v2.0 核心規則：後退開火會被追上、子彈打聆無效、躲＋憋氣、陷阱、機器、震爆彈、牠會學、實際灌水
```

收藏庫的七張截圖（在 `_build` 裡）：

```bash
python3 sources/undertow/tests/shots_steps.py > /tmp/undertow_steps.json
python3 tools/shoot.py --game undertow --out shots/undertow --viewport phone --dpr 2 --steps /tmp/undertow_steps.json
```

擺設在 `tests/showcase.js`（固定地圖種子，`window.__seed`）。

## 要知道的事

- 聲音：`emitNoise(x, y, 半徑)`；有效半徑 = 半徑 × 0.5^隔音成本（關著的門 1、上鎖或牆 2、梯井 0.5、樓板 1.5，`soundCost` 用 Floyd–Warshall 算好快取，門一開關就重算）。
- 聆（v2.0）：`away → venting（管道先震）→ drop → search/check/hunt → attack → grab`；打不死，子彈只會讓牠知道你在哪。躲藏、憋氣、心跳、牠會學、陷阱、保命工具的規則寫在 `DESIGN.md` 的「v2.0 獵食者更新」。截圖擺設用 `__show.freeze()` 讓遊戲時間停住（`S.speed = 0`）。
- 地圖保證：撤離塢一定有月池、深艙一定有收容槽（梯子會被移到牆邊）、所有艙室都走得到（被坍塌艙包圍時會打通一間）。改 `06_mapgen.js` 後跑 `python3 tests/fuzz_maps.py`（1500 張地圖，`nbad` 要是 0）。
- 平衡：深壓每秒上升量與五個階段在 `updatePressure`（約 10 分鐘到 100%，之後 95 秒崩塌）；聆的速度與聽力在 `SECTORS[].hunter`；強化艙的卡在 `rollCards`。
- HUD：直拿時右側 42% 高度留給收藏庫的 PZ 圓鈕；右下是大圓鈕（按住開火，躲起來時變成憋氣）、潛行、工具、誘餌、醫療包，偵測器鈕在情境按鈕上方，陷阱準備好時跳出「通電」。
- v1.1 異形氛圍（偵測器、管道爬行、剪影、警示燈、頻閃、蒸氣、光柱、站內廣播、CRT 終端機）的規則寫在 `DESIGN.md` 的 v1.1 一節。偵測器在 `updateTracker`，預兆在 `updateOmens`／`updateSteam`，廣播是 `say()`＋`AU.speak()`，剪影是 `hunterSil()`＋`drawHunter(…, sil)`。
- 聲音：`04_audio.js` 的 WaveShaper 曲線要用 257 點（奇數），輸入 0 才會落在正中央，不然會有直流偏移。
