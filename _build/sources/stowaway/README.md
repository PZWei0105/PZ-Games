# 偷渡者 STOWAWAY — 原始碼

太空恐怖生存＋船員指揮（俯視剖面的打撈拖船夜鷺號）。玩家是艦長，指揮六個船員撐過一隻會長大、會學習的東西：牠看得到人，也聽得見心跳。三幕：第一幕幼體＋檢疫封鎖、第二幕成體獵人＋準備最終計畫、第三幕完全體＋巢＋執行計畫。Canvas 2D，純 JavaScript，沒有框架、沒有外部函式庫（只有 Google 字型）。
收藏庫裡的 `games/stowaway/` 是打包後的單檔版本，要改遊戲請改這裡。企劃（研究→設計支柱、核心規則、一航的流程、結局、解鎖、船員）在 `DESIGN.md`。

## 組建

```bash
python3 build.py      # dist/artifact/index.html（Claude 版）與 dist/web/（獨立網頁版：index.html＋manifest＋圖示）
```

把 `dist/web/*` 複製到 `_build/raw/stowaway/`，再照 `_build/README.md` 的流程組收藏庫。
Claude 版：用 artifact 工具發布 `dist/artifact/index.html`（作品：https://claude.ai/artifact/QwWUmvyPSs5Wtig7HR8dkE）。存檔只用 localStorage（`stowaway.v1`，讀寫失敗時退回記憶體）。確認視窗是頁面裡畫的（`askBox`），不要改回瀏覽器的 `confirm`：Claude 上會被擋掉。

## 結構（`src/` 依檔名順序串成一支 script）

| 檔案 | 內容 |
|---|---|
| `00_head.html` | HTML 骨架、全部 CSS（卡帶未來主義：墨黑＋警示橘＋米白＋冷青）、HUD（直拿、橫拿、電腦三種排法）、各畫面 |
| `01_util.js` | 數學、亂數（mulberry32）、顏色、DOM 小工具、`store`（localStorage＋記憶體備援）、全域 `S`、`G`、`W` |
| `02_data.js` | 地圖（18 間房、22 扇門、20 個通風節點與 25 段管道、D1～D10 閘門）、擺設、船員、道具、配方、修理、電力系統、牠的三個階段、三幕、計畫、方針、出航準備、九個結局 |
| `03_story.js` | 船員台詞（`BARK`）、模仿聲、16 份調查檔案（`LORE`）、序章、新手提示、幕間對白、結局文字、墓誌銘 |
| `04_audio.js` | WebAudio 即時合成：跟著緊張度走的環境層、選中船員的心跳、管道爬行聲、約 50 種音效（以鏡頭為中心的距離與左右聲道） |
| `05_save.js` | 存檔、幕間存檔點（`saveCkpt`／`resumeCkpt`） |
| `06_ship.js` | 建船：格子、門、通風網與閘門、擺設；A* 尋路、DDA 射線與可視多邊形、房間隔音成本（Floyd–Warshall）、管道 Dijkstra |
| `07_art.js` | 船體快取（地板、牆、擺設、房名）、門與格柵、船員、牠（程序化的腳與尾巴，三階段配色）、船員頭像、圖示 |
| `08_world.js` | 世界狀態 `W`：開一航、道具、門與電力、船員（心跳、恐慌、走跑、任務、搜索、躲藏）、主控台與修理、艦橋遠端、氣閘循環與洩壓、自毀與逃生艇、陷阱與偵測器、清潔機器人小蝸 |
| `08b_beast.js` | 牠：視覺、聲音、心跳聲納、狀態機（潛伏→預兆→出來→搜索／查看／追擊→撲倒→拖走）、管道移動與撞閘門、學習；導演（壓力值與冷卻）；船員自動反應；三幕流程與目標 |
| `09_render.js` | 鏡頭、半解析度光照（燈、肩燈、照明彈、火）、發光層、聲波圈、偵測光點、提示、門的按鈕、藍圖（總覽與艦橋模式）、畫面效果 |
| `10_ui.js` | 訊息與字幕、HUD、船員卡、行動列、點擊判斷、門／格柵選單、艦橋面板、電力與工作台、幕間、逃生艇的限時選擇、結算、暫停、新手提示佇列、確認視窗 |
| `11_main.js` | 標題與各頁（出航準備、航行日誌、調查檔案、結局、怎麼玩、設定）、觸控／滑鼠／鍵盤、主迴圈（卡頓時自動降解析度）、開機；`window.__sw` 測試掛鉤 |

## 測試（需要 Playwright＋/usr/bin/google-chrome）

```bash
python3 tests/run.py shots          # 標題、序章、開場、選人截圖到 /tmp/sw/shots
SPEED=4 python3 tests/run.py bot 1500   # 自動玩一整航（「拋出去」路線）；SPEED 是時間倍速
python3 tests/flows.py all          # 六條結局路線各跑一次（strangle／airlock／burn／abandon／stowaway／wait）
python3 tests/showcase.py           # 幼體、成體、撲倒、完全體、艦橋、黑暗、總覽的擺拍
python3 tests/run.py perf           # 每幀繪製與更新時間
```

收藏庫的七張截圖（在 `_build` 裡）：

```bash
python3 sources/stowaway/tests/shots_steps.py > /tmp/stowaway_steps.json
python3 tools/shoot.py --game stowaway --out shots/stowaway --viewport phone --dpr 2 --steps /tmp/stowaway_steps.json
```

擺設在 `tests/showcase.js`（`window.__show`）。

## 要知道的事

- 心跳聲納：聽得到的半徑 R = 90 + (心率 − 60) × 2.4 像素；躲著 ×0.5、每隔一道關著的門或牆 ×0.5（最多兩次）、牠在管道裡 ×0.65（`sonarPulse`）。
- 聲音：`noise(x, y, r, src)`；有效半徑 = r × 0.5^關著的門數。陷阱（誘餌、警報、哨戒槍）在牠之後才更新，所以 `worldTick` 開頭把上一格的聲音留在 `W.noisePrev`，`loudestHeard` 兩邊都聽、聽過的標 `done`。
- 牠在管道裡追同一個目標時不要重算路徑（`ventToward`／`walkTo` 目標沒變就跳過），不然一直重設、永遠到不了。
- 氣閘：修好控制盤（4 零件）→ 艦長在艦橋授權（8 秒）→ 電力給氣閘兩格 → 關內門 → 外門 3 秒循環（內門一開就中斷）→ 洩壓。D9 關著時，牠縮進氣閘自己的格柵也會被一起抽出去（`decompress` 的 `pocket`）；D9 開著牠會從管道跑掉。完全體被警報或誘餌引到、從氣閘的格柵鑽出來時，如果 D9 開著、格柵沒焊、裡面沒人，會有 40%（警報）／20%（誘餌）的機率起疑，停一下就鑽回管道。
- 導演：`W.dir` 的壓力值與冷卻；第一幕 50 秒還沒嚇過人會推一把；第二幕開場牠在蛻殼的格柵潛伏 14 秒、冷卻 14 秒。
- 航次解鎖：第 2 航模仿人聲、第 3 航公司的人（溫曼）會暗中破壞（可以當面質問）、第 4 航起每航隨機開局狀況。
- 零件：全船 14～17 個（`rollLoot`），搜一個櫃子 3.2 秒；修氣閘 4、修逃生艇 6。
- HUD：直拿時右側 42% 高度留給收藏庫的 PZ 圓鈕；訊息從左邊按鈕右側開始排。
