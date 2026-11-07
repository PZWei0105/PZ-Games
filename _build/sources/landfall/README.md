# 墜星 LANDFALL — 原始碼

殖民地生存模擬（RimWorld 式、偏經營、可無限經營）。2.5D 等角 Canvas 2D，純 JavaScript，沒有框架、沒有外部函式庫。
收藏庫裡的 `games/landfall/` 是打包後的單檔版本，要改遊戲請改這裡。

## 組建

```bash
python3 build.py      # dist/artifact/index.html（Claude 版）與 dist/web/（獨立網頁版：index.html＋manifest＋圖示）
```

把 `dist/web/*` 複製到 `_build/raw/landfall/`，再照 `_build/README.md` 的流程組收藏庫。
Claude 版：用 artifact 工具發布 `dist/artifact/index.html`（作品：https://claude.ai/artifact/NJ3V9DsJJCabsh1LxP5CCD，宣告了 `db`、`user` 能力做雲端存檔；在獨立網頁版裡這兩個能力不存在，自動退回 localStorage）。

## 結構（`src/` 依檔名順序串成一支 script）

| 檔案 | 內容 |
|---|---|
| `00_head.html` | HTML 骨架與全部 CSS（伴星艦載終端風格介面） |
| `01_util.js` | 亂數、雜訊、顏色、DOM 小工具 |
| `02_data_world.js` | 資源、建築、研究、地形、地圖物件、生物、數值常數 `K` |
| `03_data_people.js` | 特質、16 位手寫角色（`CAST`）、既有關係、隨機殖民者產生器、內心話 |
| `04_data_story.js` | 劇情場景台詞（`SCENES`）、主線目標（`MAIN`）、隨機與角色事件（`EVENTS`）、遠征事件（`EXPED`） |
| `06_world.js` | 地圖生成、格子、A* 尋路、迷霧 |
| `07_sim_core.js` | 遊戲狀態 `G`、人物生成、冬眠艙、心情信任、電力、建築 API |
| `08_sim_ai.js` | 主迴圈、殖民者 AI 與工作、生物與戰鬥、人際、研究、天氣、殘骸雨 |
| `09_story.js` | 劇情導演：目標檢查、場景觸發、事件排程、潮夜、遠征、黑盒子與第一幕結尾、里程碑 |
| `10_render_core.js` | 鏡頭（四向旋轉）、地形、地台側面、星空雙月、夜間光照、特效、點選 |
| `11_render_sprites.js` | 建築（含施工中由下往上長出來）、植物、人物、生物、內心話泡泡、整幀合成與深度排序 |
| `12_portrait.js` | 全像檔案立繪、伴星頭像、建築縮圖、SVG 圖示 |
| `13_audio.js` | WebAudio 即時合成：環境音、生成式配樂、潮夜配樂、音效 |
| `14_save.js` | 存檔（localStorage＋Claude 雲端＋存檔碼） |
| `15_ui.js` | HUD、面板、建造模式、對話、事件卡、甦醒演出、標題與序章 |
| `16_main.js` | 主迴圈、觸控／滑鼠／鍵盤、標題畫面背景 |

## 測試（需要 Playwright＋/usr/bin/google-chrome）

```bash
python3 tests/run.py shots        # 手機尺寸逐步截圖到 shots/
python3 tests/run.py sim 24       # 自動遊玩 24 天，逐日列出資源、人數、死亡、心情、信任、潮夜
python3 tests/seeds.py 11 222     # 多張地圖跑 14 天，看金屬與建築會不會卡住
python3 tests/save.py             # 存檔 → 重新整理 → 讀檔 → 繼續玩，以及存檔碼
python3 tests/story.py            # 施工、潮夜、潮母、事件卡、第一幕結尾截圖
python3 tests/perf.py             # 手機解析度每幀繪製時間
```

收藏庫的六張截圖（在 `_build` 裡）：

```bash
python3 sources/landfall/tests/shots_steps.py > /tmp/landfall_steps.json
python3 tools/shoot.py --game landfall --out shots/landfall --viewport phone --dpr 2 --steps /tmp/landfall_steps.json
```

擺設內容在 `tests/showcase.js`（固定種子 20261107 的黃昏殖民地、`__tideShow()` 潮夜）。

## 第二幕之前要知道的

- 第一幕結尾設定 `G.story.act = 2`，之後切換成里程碑（`MILESTONES`）並持續週期性的潮夜。第二幕「呼喚」的主線可以接在 `09_story.js` 的 `MILESTONES`／`OBJ` 後面。
- 伏筆：伴星讀取艦長冬眠紀錄（`flags.aiCheck`）、石碑讓艦長心跳停兩秒（`flags.ruin`）、晶簇原野裡的第二座石碑（遠征 `lore`）、公開或隱瞞真相（`flags.truth`，隱瞞有洩密事件）。
