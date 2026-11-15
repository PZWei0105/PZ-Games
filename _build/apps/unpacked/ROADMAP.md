# 解包 UNPACKED ROADMAP

定期維護時先看這份；做完的移到「已完成」並寫日期。

## 待辦

- 第一次 GitHub Actions 跑完後，確認 `data/live.json` 有 ROB RUN 的台灣價格、同上、評價、截圖、預告；`candidates.json` 有同上排行與新品。
- 等資料累積一兩週，看追蹤牆便利貼的規則（同上 ±%、特價、近 7 天好評率差 5 分以上）會不會太吵或太少，再調。
- 專題多了以後（例如超過 300 篇），`index.json` 考慮分頁或只放最近 180 天、舊的放 `index-archive.json`。

## 已知問題

- Steam 以外的遊戲（主機獨佔、Netflix）沒有自動即時資料，圖片只能靠 YouTube 縮圖或專題裡寫的 `media.images`。
- 圖卡的遊戲圖靠 Steam／YouTube 的 CORS 或 images.weserv.nl 代理；兩個都失敗時圖卡只畫塗鴉底（不會壞，但沒有遊戲圖）。
- 語音導讀用裝置內建的中文語音，iPhone 和電腦的聲音不一樣。
- Steam 舊的評論網址（store.steampowered.com/appreviews）2026-10-22 起停用、只回整頁 HTML；繁中評價已改用官方 WebAPI `IUserReviewsService/GetAppReviews`（不用金鑰、速率較低，抓不到時 App 會寫「這一輪沒抓到」）。live.json 的 `errs` 會記下每輪抓不到的地方。
- 測試推送時留下一個沒用的分支 `zz-scope-test`（雲端環境刪不掉），痞子葳可以在 GitHub 的 Branches 頁直接刪，留著也不影響。

## 已完成

- 2026-11-16：上線。今日牆、追蹤牆、庫存（搜尋、篩選、比較）、深度專題頁（資訊卡附來源、Steam 即時數據、課金雷達、你的 SCAR 18、預告與截圖、玩法、第一個小時、相似作、劇情防雷、幕後、時間軸、風向、討論、我的標記）、粉專出稿台（塗鴉圖卡 A／B × 4:5／1:1、貼文、標題、hashtag、口播稿、已發佈）；噴漆開場、合成音效、boom-bap 鼓組；GitHub Actions 資料管線；每日寫稿排程與寫稿指南。首批專題：《俠盜獵車手 VI》、《ROB RUN》、《Unhinged》。
