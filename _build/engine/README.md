# PZ 引擎（PZ ENGINE）

痞子葳所有 2D 遊戲共用的引擎：一支 JavaScript（1.1 版約 530 KB；1.0 版約 290 KB），包進每款遊戲的單一 HTML 裡，Claude 版與網頁版是同一份程式。
**要做遊戲、改遊戲、改引擎，先讀 [`HANDBOOK.md`](HANDBOOK.md)。** 冷眼（`coldeye-etf`）永遠不用、不碰這個引擎。

## 常用指令（在這個資料夾裡）

```bash
python3 tools/build_engine.py                    # 組開發版 → build/pz-engine.js
python3 tools/test_engine.py --perf              # 全套檢查：單元、自我檢查 154 項、點擊與觸控、雲端存檔情境、範例、效能
python3 tools/test_engine.py --webkit            # 再加 WebKit（iPhone Safari 的引擎）；要先 apt 裝 WebKitGTK（見 tools/webkit_check.py）
python3 tools/build_engine.py --release          # 發正式版 → releases/pz-engine-<VERSION>.js（發了就不改）
python3 tools/pzbuild.py <遊戲資料夾> [--dev]     # 組一款遊戲 → dist/artifact（Claude 版）＋ dist/web（網頁版）
python3 tools/pzbuild.py lab                     # 樣品館（改引擎還沒發版時加 --dev 用開發版）
python3 tools/labshot.py impact /tmp/a.png 844 390   # 樣品館某個場景截圖
```

## 裡面有什麼

- 繪圖：WebGL2 批次繪圖＋Canvas2D 後備、圖集、中文字型圖集、後製（泛光、衝擊波、色差、暗角、顆粒、掃描線、調色）
- 時間：可變／固定步長、打擊停頓、慢動作、暫停、計時器、自動畫質
- 輸入：鍵盤、滑鼠、觸控（浮動搖桿、按鈕、手勢）、手把、手機觸覺
- 手感：補間、彈簧、18 種粒子、一行打擊感 `PZ.fx.hit`
- 光影與天氣（1.1）：動態光源＋柔和陰影、手電筒、角色投影、光束；雨雪霧雷；水面倒影、熱浪；電影調色、黑邊
- 角色動畫（1.1）：程序動畫、鏈子（披風、尾巴）、逐格動畫機、骨架角色（七種招式連段、IK 踩地形）、刀光
- 世界與地圖（1.1）：格子地圖、碰撞、視野、A* 尋路、流場、程序生成（地牢、洞窟、島嶼）、2.5D 地圖畫法、材質多邊形
- 聲音：iPhone 靜音鍵也有聲音、64 個合成音效、文字寫譜的配樂（對拍子換歌、回音、跟著大鼓呼吸）、十一種環境音（1.1）
- 存檔與設定：備份、版本升級、存檔碼、Claude 版雲端存檔、標準設定頁
- 介面：對話框、選擇、提示、劇情對話、手把焦點導覽、主題；提示框、閃卡、格子背包、標題畫面、HUD 血條／數字滾動／技能冷卻、八種轉場（1.1）
- 除錯：錯誤面板、效能面板、測試掛鉤

## 用到引擎的作品

| 作品 | 原始碼 | 引擎版本 |
|---|---|---|
| 樣品館（引擎展示 App） | `lab/` | 1.1 |
| 最後一單 LAST ORDER 2.0（第一款搬家的舊遊戲） | `_build/sources/last-order/` | 1.0 |

版本紀錄：[`CHANGELOG.md`](CHANGELOG.md)。
