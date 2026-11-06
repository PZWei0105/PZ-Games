# 差一點 SO CLOSE — 原始碼

3D 夾娃娃機遊戲（three.js 畫面＋Rapier 物理）。收藏庫裡的 `games/so-close/` 是打包後的單檔版本，要改遊戲請改這裡。

## 組建

```bash
npm install                      # three、@dimforge/rapier3d-compat@0.12、esbuild
node tools/build.mjs             # dist/index.html（Claude 作品版，含雲端存檔）與 dist/web/（獨立網頁版）
python3 tools/icon.py dist/web   # 圖示
```

把 `dist/web/*` 複製到 `_build/raw/so-close/`，再照 `_build/README.md` 的流程組收藏庫。
Claude 版：用 artifact 工具發布 `dist/index.html`（作品：https://claude.ai/artifact/Kjq9ZYZj2cZvC1bxZzjdgu，宣告了 `db`、`user` 能力做雲端存檔）。

## 結構

| 路徑 | 內容 |
|---|---|
| `src/game/sim.js` | 機台物理與爪子邏輯（不含畫面）：張爪、下降、收爪卡住就停、到頂鬆爪、鐘擺晃動、搬運、放開；Node 也能跑 |
| `src/game/data.js` | 稀有度、三個系列 20＋3 件獎品、四台機台（爪力、保夾門檻、補貨比例）、段位、經濟、每日任務 |
| `src/game/models.js` | 全部獎品的程式建模、扭蛋殼、展示盒 |
| `src/game/cabinet.js` | 機台外觀、爪子、機台內獎品（扭蛋用 instancing） |
| `src/game/game.js` | 主控：投幣、一局流程、保夾、差一點、開獎、補貨、存檔 |
| `src/game/reveal.js` / `showcase.js` | 開蛋演出（含隱藏版變身）／陳列櫃 3D 展示與縮圖 |
| `src/game/ui.js` | 介面、搖桿、教學提示、陳列櫃、任務、設定 |
| `src/engine/` | 渲染（泛光後製）、環境光、程式貼圖、合成音效與配樂 |
| `tools/simtest.mjs`、`shelftest.mjs`、`trace.mjs` | 無頭物理調校：批次自動夾取，統計成功率與推落次數 |
| `tools/shot.py` | 無頭瀏覽器截圖（網址可加 `?fast=24&skip=3&rs=4` 加速測試） |

## 調整難度

`src/game/data.js` 的 `MACHINES[].power`（一般爪力：g 收爪、l 上升、c 到頂）與 `strong`（強爪）、`meter`（保夾門檻）。
改完用 `node tools/simtest.mjs n=50 smart=1 g=1 l=0.84 c=0.52 err=0.012` 看成功率。
