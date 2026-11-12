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
| `src/game/data.js` | 稀有度、版本（普通／異色／夜光／鍍金）、三個系列 27 隻角色、初代 20 件獎品、四台機台、開蛋機率 `ODDS`、經濟 `ECON`（兌換券、價格）、段位、每日任務 |
| `src/game/figures.js` | 27 隻角色的程式建模：果凍（透光＋發光芯＋星砂）、搪膠、彩繪大眼；版本材質與變異漸變 `mixVersion`；每隻的小動畫 `tick` 與 ★★ 專屬動作 `act` |
| `src/game/models.js` | 初代獎品建模、扭蛋殼與裡面的錫箔小包、發光扭蛋、盲盒（含掀蓋版）、錫箔袋、祕密寶箱；`buildItem(key)` 統一入口 |
| `src/game/cabinet.js` | 機台外觀、爪子、機台內獎品（扭蛋用 instancing） |
| `src/game/game.js` | 主控：投幣、一局流程、保夾、黃金一夾、差一點、開獎（`resolve` 決定開出什麼、`grant` 收進陳列櫃）、發光扭蛋、祕密寶箱、兌換櫃台、補貨、存檔與 v1→v2 存檔轉換 |
| `src/game/reveal.js` / `showcase.js` | 開蛋／拆盲盒（掀蓋→撕錫箔袋→翻卡）／開寶箱、蛋中蛋、變異漸變、隱藏版變身／陳列櫃 3D 展示（★★ 專屬動作、★★★ 金色底座）與縮圖 |
| `src/game/ui.js` | 介面、搖桿、教學提示、陳列櫃、任務、設定 |
| `src/engine/` | 渲染（泛光後製）、環境光、程式貼圖、合成音效與配樂 |
| `tools/simtest.mjs`、`shelftest.mjs`、`powertest.mjs`、`trace.mjs` | 無頭物理調校：批次自動夾取，統計成功率、推落次數、推落台強爪一次夾起的機率 |
| `src/dev/figs.js` | 角色檢查頁：`node tools/devbuild.mjs src/dev/figs.js dist/dev-figs.html`，網址 `dev-figs.html?v=n,a,g,m&act=1&th=1.7#J1,W6` |
| `tools/shot.py` | 無頭瀏覽器截圖（網址可加 `?fast=24&skip=3&rs=4` 加速測試） |

## 調整難度

`src/game/data.js` 的 `MACHINES[].power`（一般爪力：g 收爪、l 上升、c 到頂）與 `strong`（強爪）、`meter`（保夾門檻）。
改完用 `node tools/simtest.mjs n=50 smart=1 g=1 l=0.84 c=0.52 err=0.012` 看成功率。

## v2.0：角色公仔改版

- 扭蛋顏色＝稀有度；裡面是哪一隻、版本、加碼，打開時才由 `Game.resolve()` 決定（機率都在 `data.js` 的 `ODDS`）。
- 版本：普通、異色（`a`）、夜光（`g`）、鍍金（`m`，只出在黑金庫）；收藏鍵是 `角色.版本`（例：`J3.a`）。
- 重複（同一個版本）→ 兌換券；同一隻角色累積 3／6 隻升 ★★／★★★。
- 加碼（每顆最多一個）：鑰匙碎片（5 片開祕密寶箱）、黃金一夾、蛋中蛋、一次三隻。
- 發光扭蛋／盲盒：每局結束有機率出現（`MACHINES[].glowChance`），必定變異。
- 推落台：盲盒變小、3 盒、保夾 7 次；強爪 `{g:1,l:1,c:1}` 對準正中間約 85～90% 直接夾起（`node tools/powertest.mjs`）。
- 舊存檔（`profile.v === 1`）：初代獎品留在陳列櫃「初代」分頁，重複的換成兌換券；推落台舊的大盒子清掉重補。
- 測試用：`__game.forceVersion='g'`、`forceEv='egg'`、`forceHidden=true`、`forceGlow=true`。
