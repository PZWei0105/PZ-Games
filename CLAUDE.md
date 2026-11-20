# PZ 遊戲收藏（PZ-Games）— 給 Claude 的說明

這個 repo 是痞子葳（PZ）的《PZ 遊戲收藏》：GitHub Pages 網站（https://pzwei0105.github.io/PZ-Games/ ）＋所有遊戲（`games/`）＋專屬 App（`apps/`）＋製作工具（`_build/`）。
跟 PZ 說話一律用**繁體中文**，稱呼他「痞子葳」。他多半用手機看，回報要短、先講結果。

## 鐵律

1. **冷眼（repo `coldeye-etf`）是 PZ 最重要的 App，永遠獨立對待：不改、不搬、不套引擎、不「順便」整理。** 收藏庫目錄裡冷眼那一筆、只讀冷眼資料的「全知」也照它們自己的規矩（`_build/apps/omniscient/README.md`），不要動到冷眼本身。
2. 新的 **2D 遊戲一律用《PZ 引擎》**：先讀 `_build/engine/HANDBOOK.md`。舊遊戲（冷眼以外）要改大東西時，評估照 HANDBOOK 第 17 節搬到引擎（範例：`_build/sources/last-order/`）。
3. 每款遊戲、工具 App 都要有 **Claude 版（artifact）＋獨立網頁版**，做好就**自動加進收藏庫、推上 GitHub**（不用等 PZ 說）。commit 訊息結尾附上當次對話規定的署名行。
4. 品質至少要有《潮界》的水準：不能廉價、角色不能太小；手機直拿、橫拿、電腦三種畫面都要截圖親眼看過。
5. 有 `_build/sources/<id>/` 的遊戲改原始碼再組建，**不要直接改 `games/<id>/index.html`**。
6. **做任何新遊戲、新 App、新小說之前，先讀《轉機》的飛行手冊 `apps/turnaround/data/manual.json`**（`status: official` 的每一條；`law` 每款都適用、`case` 只在寫著的類型參考），交件時附一段「對照了哪幾條守則、怎麼做到的」。手冊只管**品質**，不管題材：不准拿它或過去的取消紀錄來縮小題材，痞子葳沒接觸過的類型照樣要提（守則 `m-x06`「不扼殺創意」）。
7. **新的專屬 App（工具、資訊、閱讀、影音類）一律用《PZ App 引擎》**：先讀 `_build/appkit/HANDBOOK.md`（第 2 節的設計理念是從冷眼、解包整理出來的，每款交件都要逐條對照）。App 把引擎某一版**整份複製**進自己的原始碼（鎖版本）。**解包最後才搬**（條件與做法見 HANDBOOK 第 13 節，搬之前先問痞子葳）；冷眼永遠不用。
8. **有護欄的 App（目前：解包）改了程式，推之前先跑 `python3 _build/appkit/py/guard.py check <app>`**（BAD 不准推）；推上去之後看 Actions「App 護欄」那一輪——沒過會自動把網站換回上一個好的版本（資料不動），要修好再推。手動回滾：`python3 _build/appkit/py/guard.py rollback <app> [n]`。
9. **小說原稿只放在私人倉庫 PZWei0105/pz-novels**：這個 repo 是公開的，章節、前情提要、寫作筆記的純文字一律不准 commit 進來（`apps/next-chapter/books/` 只有加密檔，由 pz-novels 的 `tools/shelf.py push` 產生）。

## 從哪裡開始

| 要做的事 | 先看 |
|---|---|
| 收藏庫怎麼組、怎麼上架、上線前檢查 | `_build/README.md` |
| 做 2D 遊戲、用引擎、改引擎 | `_build/engine/HANDBOOK.md`（會動的範例：樣品館 `_build/engine/lab/`） |
| 做專屬 App、用 App 引擎、改 App 引擎、設計理念 | `_build/appkit/HANDBOOK.md` |
| App 改壞了、護欄沒過、要回滾 | `_build/appkit/HANDBOOK.md` 第 10 節（`guard.py check／rollback／status`） |
| 某款有原始碼的遊戲 | `_build/sources/<id>/README.md` |
| 專屬 App | `_build/apps/<App>/README.md` |
| 《解包》每天的遊戲專題（寫稿、查核、上架） | `_build/apps/unpacked/WRITER_GUIDE.md` |
| 《解包》每天的推坑（已上市的私房推薦） | `_build/apps/unpacked/PICKS_GUIDE.md` |
| 《轉機》每天的開題（三班新點子）與機庫檢修（舊作品複盤） | `_build/apps/turnaround/INSPECTOR_GUIDE.md` |
| 寫小說、上架新的一回、分享單行本 | 私人倉庫 PZWei0105/pz-novels 的 `CLAUDE.md`（沒有就 add_repo 加進來，要 push 權限） |
| 頻道門面（頭像、YouTube 橫幅、FB 封面）的檔案和重做方法 | `_build/brand/gaming-rhapsody/README.md` |
| 待辦、已知問題 | `_build/ROADMAP.md` |
