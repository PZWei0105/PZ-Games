# PZ App 引擎版本紀錄

新的放最上面。版本規則見 `HANDBOOK.md` 第 12 節：已發布的 `releases/` 檔案永遠不改；App 用的是某一版的整份複製，要用新版的 App 自己換檔案、重新組建、重新驗。

## 1.0.0（2026-11-21）

第一版：從冷眼和解包抽出來的做法（冷眼本身不動，永遠獨立）。

- 本機儲存 `PZA.store`：每個 App 自己的前綴，已經有主人的前綴（冷眼、書房、解包、全知、補番、觀戰、一集就好、轉機、本機道場、重新點火、火樹銀花、耳目一新、收藏庫）直接擋下；`update` 先讀最新的再存（好幾個分頁不互蓋）；存不了回傳 false。`PZA.clean` 備份資料逐欄重建。
- 門鎖 `PZA.lockCore`（跟《下回分解》書房同一套 keyring：PBKDF2-SHA256、AES-GCM，密語與備用碼的正規化一字不差）、`PZA.lock` 門鎖畫面：記住這台裝置／離開 5 分鐘／每次離開三種政策、離開時蓋住畫面、鎖著時底下 inert、iPhone 中文輸入法可以打密語、按下的當下叫醒聲音。
- 資料同步 `PZA.sync`（冷眼的做法）：每分鐘看 version.json、只重抓時間戳變了的那一份、網站快取還沒換 2 分鐘後再試、卡住 90 秒重新開始、連續失敗回報；`PZA.dataUrl`、`PZA.fetchJSON`（30 秒逾時）。
- 換新版 `PZA.fresh`（冷眼 swApply、解包 Fresh 的做法）：回到 App 時、每 10 分鐘看 ver.json，安全的時候自動重新載入、不安全時顯示「有新版本」；自動重新載入的保險（30 秒、30 分鐘內 3 次）。
- 聲音 `PZA.sound`：Web Audio 即時合成（冷眼機甲 HUD 的合成器配方：tone、noise、pluck 撥弦、fm 電鋼琴、bell 鐘磬）、點擊當下解鎖、iPhone 靜音開關、到背景停；`PZA.measureSound` 離線量音量對齊音色組。
- 動態與時間 `PZA.motion`（特效設定＋減少動態效果、`countUp` 最後一定停在真的數字）、`PZA.tw` 台灣時間、`PZA.oncePerDay`。
- 護欄 `py/guard.py`＋`.github/workflows/app-guard.yml`：收藏庫 App 推上去之後自動驗收（解包：手機直拿八個畫面、手機橫拿、另外三套換裝、電腦、上鎖），沒過而且上一個好的版本驗得過就自動換回（資料不動）；`check`（推之前）、`rollback`、`status`。
- 設計理念手冊 `HANDBOOK.md`：16 條設計理念、開新 App 的步驟與最小範例、交件檢查清單、冷眼與解包的關係。
