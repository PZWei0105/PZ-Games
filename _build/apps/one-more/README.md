# 一集就好 ONE MORE

痞子葳給朋友用的 AI 動漫劇集播放器（2026-11-19 上線）。網址：https://pzwei0105.github.io/PZ-Games/apps/one-more/

跟《補番》（痞子葳的專屬版）分開：朋友只要看影片，所以做減法——沒有追番同步、扭蛋、睡前定時、後台狀態，也不叫「痞子葳」。

## 設計

- **手帳感**：奶油紙底＋點點格線、圓角紙卡、細線、實心淡陰影、紙膠帶；標題用明體（Noto Serif TC／宋體），內文黑體。不走夢幻少女風（不用螢光粉、亮片、愛心滿天飛）。
- **兩款顏色**（`data-skin`）：抹茶綠 `matcha`（鼠尾草綠＋奶油白）、乾燥玫瑰 `rose`（霧粉＋杏色）。右上角圓點一鍵換，換的時候從點的位置漾開一圈。
- **配樂**（`sound.js`）：Web Audio 即時合成的 lo-fi，電鋼琴和弦＋木琴旋律＋圓圓的低音＋很輕的大鼓，兩款顏色各一組和弦。**不用任何白噪音**。第一次碰畫面才開始（瀏覽器規定），開始看影片就淡出、收起播放器再回來；收藏頁可以關、調音量。
- 手機記憶體：不用 filter、backdrop-filter、模糊陰影；動畫只動 transform、opacity；`html, body { overflow-x: clip }`、`[hidden] { display:none !important }`。

## 畫面

| 頁 | 內容 |
|---|---|
| 首頁 | 問候＋「今天看了幾集」吐槽（說好一集就好？）、置頂「站長的頻道」卡（遊戲狂想曲＋最新一支）、繼續看、今天就這部（每天換、可「換一部」）、一口氣看完（40 分鐘以上的合輯）、一集一集追（3 集以上的系列）、短短一集（直式短劇）、新上架 |
| 分類 | 格式（全部／一口氣看完／一集一集追／短短一集／新上架）× 題材（甜寵、古風、穿越、重生、爆笑、懸疑、修仙、玄幻、都市、末世、系統、科幻）× 片長 |
| 收藏 | 收藏、看過的、設定（顏色、點影片時、音樂、音效、清除紀錄） |
| 播放器 | YouTube 官方播放器、接著上次的秒數播、系列列出全部集數、播完 6 秒自動下一集、直式短劇用直的畫面；不能嵌入的（補番片庫的旗標 128、或播放器回報）直接開 YouTube |

## iPhone 與 YouTube Premium

App 不能替使用者登入 YouTube（Google 不開放），iPhone 主畫面 App 和 Safari 又會擋嵌入播放器讀登入。所以 iPhone 第一次點影片會問「有沒有 YouTube Premium」：有就「交給 YouTube App」（沒廣告，App 只記看過哪幾集），沒有就在 App 裡播（記住秒數）。收藏頁可以改。

## 資料（沒有自己的管線、不花金鑰）

- 片單：`https://raw.githubusercontent.com/PZWei0105/PZ-Games/binge-data/catalog.json`（《補番》的），只取頻道類別 `ai`／`sd`／`mc`、格式 `c`／`e`／`m`／`s`。補番改 catalog 格式時這裡要一起改（`indexCat`）。
- 置頂頻道：`spectate-data/mine.json`（《觀戰》管線的 `build_mine`：名單上標 `mine` 的頻道＋最新 6 支）。讀不到時卡片照樣顯示頻道名和「去頻道看看」。
- localStorage 前綴 `onemore.v1.`：`set`（設定）、`hist`（vid → [時間, 秒數, 片長, 看完]，最多 400 支）、`fav`（`s:作品` 或 `v:影片`）、`cnt`（今天看了幾集）、`catAt`（上一份片單的時間）。

## 組建與測試

```
python3 _build/apps/one-more/build.py            # 網頁版 → apps/one-more/
python3 _build/apps/one-more/build.py --icons    # 重畫圖示
mkdir -p /tmp/omdata
gh api "repos/PZWei0105/PZ-Games/contents/catalog.json?ref=binge-data" -H "Accept: application/vnd.github.raw" > /tmp/omdata/catalog.json
gh api "repos/PZWei0105/PZ-Games/contents/mine.json?ref=spectate-data" -H "Accept: application/vnd.github.raw" > /tmp/omdata/mine.json
python3 _build/apps/one-more/tests/shoot.py --data /tmp/omdata --out /tmp/omshots   # 手機直（iPhone）、橫、電腦三種＋播放流程
```

## 朋友版（Netlify Drop）

`python3 _build/apps/one-more/build.py --drop <資料夾>` 會另外打包 `一集就好-網頁版-vX.zip`（index.html、manifest、sw.js、圖示都在根目錄）。解壓縮後把整個資料夾拖進 https://app.netlify.com/drop 就上線，網址和畫面上都不會出現《PZ 遊戲收藏》（2026-11-07 痞子葳說過：給朋友的版本不要帶收藏庫網址或按鈕，有 Netlify 徽章沒關係）。片單照樣從 GitHub 自動更新，不用重新上傳；只有 App 本身改版時才需要重新打包、重新拖一次。`sw.js` 只管自己範圍內的檔案，放在根目錄或 `apps/one-more/` 都能用。

沒有 Claude 版：artifact 裡不能嵌 YouTube 播放器，也讀不到每 30 分鐘更新的片單（同《補番》《觀戰》）。
