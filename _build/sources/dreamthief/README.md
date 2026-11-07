# 竊夢者 DREAMTHIEF — 原始碼

搜打撤動作遊戲（潛進別人的夢搜刮、打怪、在夢主醒來以前撤出來）。俯視 2.5D Canvas 2D，純 JavaScript，沒有框架、沒有外部函式庫（只有 Google 字型）。
收藏庫裡的 `games/dreamthief/` 是打包後的單檔版本，要改遊戲請改這裡。完整企劃在 `DESIGN.md`。

## 組建

```bash
python3 build.py      # dist/artifact/index.html（Claude 版）與 dist/web/（獨立網頁版：index.html＋manifest＋圖示）
```

把 `dist/web/*` 複製到 `_build/raw/dreamthief/`，再照 `_build/README.md` 的流程組收藏庫。
Claude 版：用 artifact 工具發布 `dist/artifact/index.html`（作品：https://claude.ai/artifact/7Kbym9Zjg3nFyTsNEJFHdY，宣告了 `db`、`user` 能力做雲端存檔；在獨立網頁版裡這兩個能力不存在，自動退回 localStorage）。

## 結構（`src/` 依檔名順序串成一支 script）

| 檔案 | 內容 |
|---|---|
| `00_head.html` | HTML 骨架、全部 CSS（「夜當」漆黑描金、當票卡片）、遊戲中 HUD |
| `01_util.js` | 數學、亂數（mulberry32）、顏色、DOM 小工具、`Net` 連線空殼 |
| `02_data.js` | 稀有度、夢器、夢具、22 種靈感（`UPS`）、工作台升級（`META`）、夢衛（`FOES`）、副委託（`SIDE`） |
| `03_story.js` | 五位夢主（`CH`：主題色、容器、夢的規則、心魔、記憶池、人生記憶、核心記憶劇情）、晴的記憶、序章、夜當台詞、無線電、三個結局 |
| `04_audio.js` | WebAudio 即時合成：音效、八音盒主題「晴」、各章夢境配樂、頭目鼓點、心跳、雨聲 |
| `05_mapgen.js` | 種子地圖：4×5 格房間、兩格寬走廊與回路、淹水、出口、危險房、櫃子、夢衛預算、裝飾、燈、鏡子、監視器、渡夢人 |
| `06_world.js` | 世界狀態 `W`：移動碰撞、視線、噪音、潛行、背刺、自動瞄準與子彈、靈感效果、夢衛 AI、掉落與撿取、清醒度與崩塌、撤離、下潛、終章背起晴 |
| `07_boss.js` | 五個心魔（值班台、指揮、夜班的自己、收藏家、撤離的人）與預警圈系統 |
| `08_render.js` | 鏡頭、地磚／牆面快取、牆與角色交錯排序、夢燈視野光照、發光層、特效、傷害數字、小地圖 |
| `09_sprites.js` | 主角、夢衛、心魔、櫃子、裝飾、出口、鏡子、監視器、掉落物 |
| `10_ui.js` | 標題、夜當（當鋪、記憶匣、工作台、入夢準備）、HUD、背包與交換、撤離選擇、結算、劇情播放 |
| `11_scenes.js` | 標題與夜當背景、劇情場景（序章、各章核心記憶、那一夜、三個結局） |
| `12_save.js` | 存檔（localStorage＋Claude 雲端＋存檔碼 `DT1:`） |
| `13_main.js` | 浮動搖桿、鍵盤、主迴圈、開機；`window.__dt` 測試掛鉤 |

## 測試（需要 Playwright＋/usr/bin/google-chrome）

```bash
python3 tests/run.py bot 0        # 自動玩第 1 章（搜、打、下潛、撤離），每 6 秒截圖到 /tmp/dt/shots；加 god 不會死
python3 tests/run.py boss 1       # 直接打第 2 章的心魔
python3 tests/run.py perf         # 手機解析度每幀繪製時間
```

收藏庫的七張截圖（在 `_build` 裡）：

```bash
python3 sources/dreamthief/tests/shots_steps.py > /tmp/dreamthief_steps.json
python3 tools/shoot.py --game dreamthief --out shots/dreamthief --viewport phone --dpr 2 --steps /tmp/dreamthief_steps.json
```

擺設在 `tests/showcase.js`（固定地圖種子；戰鬥是即時的，每次拍出來會有一點不同，另外會多拍幾張 `x` 開頭的候選）。`tests/showcase_try.py` 用來挑種子。

## 要知道的事

- 傷害數字：同一隻夢衛短時間內連續挨打會加在同一個數字上，新數字會避開舊數字的位置（`numFx`、`numSpot`）。
- 冷卻扇形用 CSS `conic-gradient` 畫：原本用畫布每格重畫，WebKit 一進夢就會暴衝到 3 GB（iPhone 會閃退），別改回畫布。
- 平衡：心魔血量 `3400 ×（1 + 0.3 × 章）`；升級需求 `xpNeed`；清醒度每秒基本上升量在 `updateWake`。
- 連線合作的預留與接法見 `DESIGN.md` 的「連線預留」。
