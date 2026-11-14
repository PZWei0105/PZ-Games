# PZ 遊戲收藏（PZ-Games）— 給 Claude 的說明

這個 repo 是痞子葳（PZ）的《PZ 遊戲收藏》：GitHub Pages 網站（https://pzwei0105.github.io/PZ-Games/ ）＋所有遊戲（`games/`）＋專屬 App（`apps/`）＋製作工具（`_build/`）。
跟 PZ 說話一律用**繁體中文**，稱呼他「痞子葳」。他多半用手機看，回報要短、先講結果。

## 鐵律

1. **冷眼（repo `coldeye-etf`）是 PZ 最重要的 App，永遠獨立對待：不改、不搬、不套引擎、不「順便」整理。** 收藏庫目錄裡冷眼那一筆、只讀冷眼資料的「全知」也照它們自己的規矩（`_build/apps/omniscient/README.md`），不要動到冷眼本身。
2. 新的 **2D 遊戲一律用《PZ 引擎》**：先讀 `_build/engine/HANDBOOK.md`。舊遊戲（冷眼以外）要改大東西時，評估照 HANDBOOK 第 17 節搬到引擎（範例：`_build/sources/last-order/`）。
3. 每款遊戲、工具 App 都要有 **Claude 版（artifact）＋獨立網頁版**，做好就**自動加進收藏庫、推上 GitHub**（不用等 PZ 說）。commit 訊息結尾附上當次對話規定的署名行。
4. 品質至少要有《潮界》的水準：不能廉價、角色不能太小；手機直拿、橫拿、電腦三種畫面都要截圖親眼看過。
5. 有 `_build/sources/<id>/` 的遊戲改原始碼再組建，**不要直接改 `games/<id>/index.html`**。

## 從哪裡開始

| 要做的事 | 先看 |
|---|---|
| 收藏庫怎麼組、怎麼上架、上線前檢查 | `_build/README.md` |
| 做 2D 遊戲、用引擎、改引擎 | `_build/engine/HANDBOOK.md`（會動的範例：樣品館 `_build/engine/lab/`） |
| 某款有原始碼的遊戲 | `_build/sources/<id>/README.md` |
| 專屬 App | `_build/apps/<App>/README.md` |
| 待辦、已知問題 | `_build/ROADMAP.md` |
