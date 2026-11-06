# 長明 EVERLIGHT — 原始碼

HD-2D 像素 JRPG《長明》第一章的原始碼。收藏庫裡的 `games/everlight/` 是打包後的單檔版本，要改遊戲請改這裡。

## 組建

```bash
npm install                # three、esbuild
node tools/build.mjs       # 產生 dist/index.html（Claude 作品版，含雲端存檔）與 dist/web/（獨立網頁版）
python3 tools/icon.py dist/web   # 圖示
```

把 `dist/web/*` 複製到 `_build/raw/everlight/`，再照 `_build/README.md` 的流程組收藏庫。
Claude 版：用 artifact 工具發布 `dist/index.html`（作品：https://claude.ai/artifact/JpjSqpmxbcSjsTppKoRt4J，宣告了 `db`、`user` 能力做雲端存檔）。

## 美術升級（2026-11 起）

`art/` 是第一章美術升級的藍圖、美術聖經、素材清單、進度與授權紀錄，由筆電上的 Claude Code 照著做。換進遊戲的最終素材放 `assets/`（程式有素材就用，沒有就退回原本的程式繪圖）。原始生成圖、資料集、LoRA、母圖、參考圖都不進 GitHub。

## 結構

| 路徑 | 內容 |
|---|---|
| `src/engine/` | 渲染（後製景深／光暈）、像素圖產生器、人物與怪物像素圖、地形與道具、粒子特效、音樂音效、輸入 |
| `src/game/data.js` | 角色、技能、道具、武器、敵人、遭遇、商店、魚 |
| `src/game/battle.js` | 戰鬥規則（明暗相位、架勢、餘暉、轉燈），和畫面分開、可重播（預留好友連線） |
| `src/game/battleScene.js` | 戰鬥畫面、站位與鏡頭（`BL` 表：直拿／橫拿） |
| `src/game/maps.js` | 四張地圖（孤燈岬四種時段、霧港、退潮灘、沉鐘遺跡）與六個戰鬥舞台 |
| `src/game/story.js` | 序章與第一章全部劇情腳本 |
| `src/game/field.js` / `game.js` / `ui.js` | 場景移動與互動、主控（腳本、存檔、標題、營火、釣魚）、介面 |
| `src/game/store.js` / `cloud.js` | 本機存檔與 Claude 版雲端同步 |
| `tools/shot.py` | 無頭瀏覽器截圖／自動試玩（`--land` 橫拿） |
