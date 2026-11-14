# PZ 引擎（PZ ENGINE）

痞子葳所有 2D 遊戲共用的引擎：一支 JavaScript（約 280 KB），包進每款遊戲的單一 HTML 裡，Claude 版與網頁版是同一份程式。
**要做遊戲、改遊戲、改引擎，先讀 [`HANDBOOK.md`](HANDBOOK.md)。** 冷眼（`coldeye-etf`）永遠不用、不碰這個引擎。

## 常用指令（在這個資料夾裡）

```bash
python3 tools/build_engine.py                    # 組開發版 → build/pz-engine.js
python3 tools/test_engine.py --perf              # 全套檢查：單元、自我檢查 74 項、點擊與觸控、雲端存檔情境、範例、效能
python3 tools/test_engine.py --webkit            # 再加 WebKit（iPhone Safari 的引擎）；要先 apt 裝 WebKitGTK（見 tools/webkit_check.py）
python3 tools/build_engine.py --release          # 發正式版 → releases/pz-engine-<VERSION>.js（發了就不改）
python3 tools/pzbuild.py <遊戲資料夾> [--dev]     # 組一款遊戲 → dist/artifact（Claude 版）＋ dist/web（網頁版）
python3 tools/pzbuild.py lab --dev               # 樣品館
python3 tools/labshot.py impact /tmp/a.png 844 390   # 樣品館某個場景截圖
```

## 裡面有什麼

- 繪圖：WebGL2 批次繪圖＋Canvas2D 後備、圖集、中文字型圖集、後製（泛光、衝擊波、色差、暗角、顆粒、掃描線、調色）
- 時間：可變／固定步長、打擊停頓、慢動作、暫停、計時器、自動畫質
- 輸入：鍵盤、滑鼠、觸控（浮動搖桿、按鈕、手勢）、手把、手機觸覺
- 手感：補間、彈簧、18 種粒子、一行打擊感 `PZ.fx.hit`
- 聲音：iPhone 靜音鍵也有聲音、47 個合成音效、文字寫譜的配樂
- 存檔與設定：備份、版本升級、存檔碼、Claude 版雲端存檔、標準設定頁
- 介面：對話框、選擇、提示、劇情對話、手把焦點導覽、主題
- 除錯：錯誤面板、效能面板、測試掛鉤

## 用到引擎的作品

| 作品 | 原始碼 | 引擎版本 |
|---|---|---|
| 樣品館（引擎展示 App） | `lab/` | 1.0 |
| 最後一單 LAST ORDER 2.0（第一款搬家的舊遊戲） | `_build/sources/last-order/` | 1.0 |

版本紀錄：[`CHANGELOG.md`](CHANGELOG.md)。
