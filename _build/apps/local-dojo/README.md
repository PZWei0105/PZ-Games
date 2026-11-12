# 本機道場 LOCAL DOJO（維護說明）

PZ 的本機 AI 修煉課。他沒有程式背景，想透過 Claude 有系統、白話、一步步學會在自己的筆電上跑 AI，所以不買書，改做成這個 App，方便反覆學、反覆想。

- 網頁版：https://pzwei0105.github.io/PZ-Games/apps/local-dojo/（可加到主畫面、離線使用；收藏庫「專屬 App」分頁有入口）
- Claude 版：https://claude.ai/artifact/T6XN5fhrpMU4YM5rJsQ6Tj（進度跟著 Claude 帳號同步）
- 課程裡所有數字都以他的筆電為準：RTX 5090 筆電（24GB VRAM、896 GB/s）、64GB 記憶體、Windows。

## 檔案

| 路徑 | 用途 |
|---|---|
| `src/data1.js` | 第 1～3 關的課程資料 |
| `src/data2.js` | 第 4～6 關、名詞表 `DOJO.terms`、成就 `DOJO.badges` |
| `src/changelog.js` | 更新紀錄 `DOJO.changelog`（最新的放最前面） |
| `src/widgets.js` | 每課「動手」的互動元件 `DOJO.W`，以及工具頁的計算機 |
| `src/app.js` | 畫面、進度、複習卡與錯題本、備份碼、Claude 版雲端同步 |
| `src/style.css`、`src/index.html`、`src/sw.js` | 樣式、外殼、網頁版的離線快取 |
| `build.py` | 把 `src/` 組成單一檔案：網頁版輸出到 repo 的 `apps/local-dojo/`，`--claude-out` 另外輸出 Claude 版 |
| `check.py` | 上線前檢查（見下面） |
| `ROADMAP.md` | 待辦、已知問題、已完成 |

## 課程的規矩

- 六關六條腰帶（黃、綠、藍、紫、紅、黑），每關四課，通過關主考驗（`exam`）晉升。每課五步：看懂（`cards`）→ 動手（`widget`）→ 實作（`task`：複製給筆電上 Claude Code 的指令，在 `C:/AI` 裡做）→ 驗收（`quiz`，3 題答對 2 題算學懂）→ 想一想（`think`）。
- `quiz`／`exam` 的 `o[0]` 永遠是正確答案，畫面上會打亂順序；每題都要有 `why`（解析）。
- 路徑一律寫成 `C:/...`，畫面上會自動轉成 Windows 的反斜線。
- 課裡用到的名詞（`terms`）都要在 `DOJO.terms` 有白話解釋。
- **不要改課程與題目的 id 和順序**：進度用課程 id 記，錯題本和複習用「課程 id:第幾題」、「E關卡 id:第幾題」記。要改題目就原地改內容，要加題目加在最後。
- 工具名稱、版本、指令、安裝步驟、VRAM 與速度數字，一律以官方文件、官方 GitHub、模型卡為準；不知道就不寫，絕不估算或編數字。重新查證過就更新 `app.js` 裡「內容查證於 ○ 年 ○ 月」那一句。
- 「現在最推薦哪個模型」這種一直變的事，交給另一個 App《版本答案 META》；本機道場教不會過期的觀念和手藝，舉例用的模型、工具過時了就換成現在的。
- 實作指令是 PZ 複製給筆電上的 Claude Code 執行的：不能有刪檔、格式化、改系統設定這類危險動作；要下載大檔先說多大、要多少空間。
- 內容巡檢每次至少完整查一關，照第 1～6 關輪流；查到哪一關、下次從哪一關開始，記在 ROADMAP 的「待辦」。
- 名稱解碼器與計算機的量化位元數：計算機清單在 `widgets.js` 的 `QUANTS`，清單外的格式（IQ 系列、Q4_0）在 `QX`；數字要有出處（llama.cpp 的說明或格式定義），查不到的格式寧可讓它退回最接近的等級，也不要自己編。

## 更新紀錄

- 有改東西才在 `src/changelog.js` 最前面加一筆：`d` 日期（同一天第二筆加 `-2`）、`t` 一句白話（改了什麼、在 App 哪裡）。只修小 bug 就合併成一筆「修正」。
- App 打開時用一句提示（toast）告訴 PZ 最新那筆，每筆只出現一次；不要另外做大畫面。看過的記在存檔的 `seenLog`。

## 進度存在哪裡

- 網頁版：瀏覽器的 localStorage（`pzdojo.v1`），換裝置用「我的」頁的備份碼。
- Claude 版：artifact 的資料庫功能（`window.claude.use('db')`），跟著 Claude 帳號同步。
- 不上傳到任何其他伺服器。改了存檔格式一定要能讀舊進度（`S.v`）。
- 存檔欄位只能「加」不能「改意思」：舊存檔沒有的欄位，要由 `fresh()` 補預設值，或在程式裡當成空值處理。2026-11-12 加了 `seenLog`（看過的最新更新紀錄日期），舊存檔沒有它，只會多看到一次更新提示。

## 組建、檢查、上線

```bash
python3 _build/apps/local-dojo/build.py --claude-out /tmp/dojo-claude   # 網頁版 + Claude 版
python3 _build/apps/local-dojo/check.py --claude /tmp/dojo-claude       # 上線前檢查，約 2 分鐘
```

- `check.py` 會檢查課程資料（每關四課、每課有卡片、存在的互動元件、驗收至少 3 題且選項不重複、有解析、名詞都在名詞表），打開每一頁（首頁、24 課、6 個關主考驗、複習、每個工具、我的）看有沒有程式錯誤、互動元件有沒有畫出東西，還有第一次打開的歡迎畫面、離線開啟、Claude 版。沒有 BAD 才能推；截圖在 `/tmp/dojo-check`，要打開來親眼看。
- 網頁版：commit `_build/apps/local-dojo/` 和 `apps/local-dojo/`，推上 PZ-Games 的 main。收藏庫的 `tools/build.py` 不會動到 `apps/`，只改本機道場時不用重組收藏庫。
- Claude 版：把 `/tmp/dojo-claude/index.html` 發布到上面同一個 artifact（用 artifact 工具更新那一個，不要另外建新的）。這次沒辦法發布，就在 ROADMAP「已知問題」記下「Claude 版待同步」。
