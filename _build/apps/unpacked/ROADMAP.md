# 解包 UNPACKED ROADMAP

定期維護時先看這份；做完的移到「已完成」並寫日期。

## 待辦

- `gems` 照 Steam 好評率排序，前段多是小品（好評率 99%）；推坑排程跑幾天後看選題會不會太偏小品，需要的話改成「評論數夠多再排好評率」。
- 推坑多了以後，考慮讓「庫存」也能搜尋推坑。
- 等資料累積一兩週，看追蹤牆便利貼的規則（同上 ±%、特價、近 7 天好評率差 5 分以上）會不會太吵或太少，再調。
- 專題多了以後（例如超過 300 篇），`index.json` 考慮分頁或只放最近 180 天、舊的放 `index-archive.json`。

## 已知問題

- Steam 以外的遊戲（主機獨佔、Netflix）沒有自動即時資料，圖片只能靠 YouTube 縮圖或專題裡寫的 `media.images`。
- 圖卡的遊戲圖靠 Steam／YouTube 的 CORS 或 images.weserv.nl 代理；兩個都失敗時圖卡只畫塗鴉底（不會壞，但沒有遊戲圖）。
- 語音導讀用裝置內建的中文語音，iPhone 和電腦的聲音不一樣。
- Steam 舊的評論網址（store.steampowered.com/appreviews）2026-10-22 起停用、只回整頁 HTML；繁中評價已改用官方 WebAPI `IUserReviewsService/GetAppReviews`（不用金鑰、速率較低，抓不到時 App 會寫「這一輪沒抓到」）。live.json 的 `errs` 會記下每輪抓不到的地方。
- 測試推送時留下一個沒用的分支 `zz-scope-test`（雲端環境刪不掉），痞子葳可以在 GitHub 的 Branches 頁直接刪，留著也不影響。

## 已完成

- 2026-11-16：新增「推坑」分頁（痞子葳要求：不分新舊、已上市、查過評價又值得玩的私房推薦，每天 2～3 款）。推坑牆、推坑頁、首頁今日推坑、跑馬燈、分頁新數字；publish.py 檢查推坑並產生 picks.json、推坑的 Steam appid 進 track.json；Actions 候選加 `gems`／`gems_sale`；`PICKS_GUIDE.md` 與每日推坑排程（11:43）。首批：《Balatro》、《歧路旅人 II》、《XCOM 2》。publish.py 改成內容沒變就不重寫 index.json／picks.json（免得弄髒 git、擋到 pull --rebase）。

- 2026-11-16：聲光與影像加強（痞子葳要求「深度介紹、影片圖片、聲光效果都要拉滿」）。專題頁主視覺改成動態（Steam 動態預告／官方圖 Ken Burns 輪播）、「一眼看懂」六格、段落標題噴漆噴出、即時數字跳動與曲線繪製、相簿最多 18 張（加上 YouTube 預告畫面）、播預告時噴漆＋音效；首頁海報拍上牆、捲到的那張播動態預告或輪播；粉專稿過期提醒。修掉膠帶跑馬燈讓頁面寬出 4px 的問題。資料管線改成每小時（GitHub 會跳過部分排程，排密一點資料才新）；繁中評價改用官方 IUserReviewsService（舊 appreviews 網址 10/22 停用）。首批三篇照獨立查核修正（GTA VI 預載 11/10、容量 212GB、GTA+ 是數位版都送、主線約 80 小時；Unhinged 沒有中文、故事開場照官方；ROB RUN 亞洲伺服器評估中等），GTA VI 與 Unhinged 補上官方截圖。

- 2026-11-16：上線。今日牆、追蹤牆、庫存（搜尋、篩選、比較）、深度專題頁（資訊卡附來源、Steam 即時數據、課金雷達、你的 SCAR 18、預告與截圖、玩法、第一個小時、相似作、劇情防雷、幕後、時間軸、風向、討論、我的標記）、粉專出稿台（塗鴉圖卡 A／B × 4:5／1:1、貼文、標題、hashtag、口播稿、已發佈）；噴漆開場、合成音效、boom-bap 鼓組；GitHub Actions 資料管線；每日寫稿排程與寫稿指南。首批專題：《俠盜獵車手 VI》、《ROB RUN》、《Unhinged》。
