# 耳目一新 RESKIN（維護說明）

痞子葳的換膚音樂播放器：播自己的音樂檔，十五套 Skin 加 DIY，一鍵換裝；副歌一到每套都全開，換歌有各自的轉場。
另有歌詞、我的最愛、睡眠定時、改歌曲資訊、分享卡片、DIY 分享碼。
App 裡稱呼使用者一律用「痞子葳」。

- 網頁版：https://pzwei0105.github.io/PZ-Games/apps/reskin/（可加到主畫面、離線聽、鎖屏連播；收藏庫「專屬 App」分頁有入口）
- Claude 版：https://claude.ai/artifact/Dcws22E7CZzxpo9HLH8XUm（slug `66328189-c13f-4f55-ba42-02e7b5b2437a`）。試 Skin 用：沒有 service worker，歌只存在那個瀏覽器，不能鎖屏一直聽。改版就發布到同一個 artifact，不要另開新的。

## 組建與檢查

```bash
python3 _build/apps/reskin/build.py --claude-out /tmp/reskin-claude --friend-out /tmp/reskin-friend --friend-zip /home/claude/out/耳目一新-朋友版.zip
python3 _build/apps/reskin/check.py --claude /tmp/reskin-claude --friend /tmp/reskin-friend   # 全流程檢查，要看到「全部 OK」
python3 _build/apps/reskin/build.py --icons                            # 只有改圖示才需要（要 playwright、pillow）
```

- 網頁版輸出到 `apps/reskin/`；`--claude-out` 另外輸出 Claude 版；`--friend-out`／`--friend-zip` 輸出朋友版（見最下面）。
- check.py 依序跑：讀不到檔時的備援、資料夾匯入、新功能（歌詞、最愛、睡眠定時、改資訊、分享卡片、分享碼、副歌）、網頁版全流程（手機直、手機橫、電腦，每套 Skin 都換一次歌），再對 Claude 版、朋友版各跑一次全流程。

- 截圖在 `/tmp/reskin-check`，改到畫面就逐套看過再上線：手機直、手機橫（844×390）、電腦（1280×800）。
- 發布 Claude 版：`publish_files` 不收 `/tmp` 底下的檔，先把 `/tmp/reskin-claude/index.html` 複製到 `/home/claude/` 底下再發布。
- 只動 `apps/reskin/`，不用重組收藏庫；改了收藏庫上的介紹（`data/catalog_base.json`）才要重組。
- 版本號是組建時間（例如 `2026.11.13-0319`），會寫進頁面和 service worker。

## 最重要的規矩：iPhone 上的播放

- **歌一律用 `<audio>` 播，不能接進 Web Audio**（`createMediaElementSource`）。iPhone 鎖屏後 Web Audio 會被暫停，接進去的歌就跟著沒聲音。
  所以畫面上的頻譜、波形、節拍都是匯入時先分析好的（`analysis.js`，在 Worker 裡跑：22050 Hz 解碼、每秒 30 格、32 個頻帶、48 點波形、起音、BPM），播放時照時間查表（`viz.js`）。還沒分析完的歌，畫面先用合成的律動（`v.synthetic`）。
- **螢幕關著（鎖屏聽歌）和匯入中都不分析節奏**，等畫面打開、匯入結束才接著做。解碼很吃電，iPhone 也可能把在背景拚命做事的頁面停掉，連音樂一起停。不要拿掉這個等待。
- 介面音效（`sfx.js`）才用 Web Audio，跟歌分開；iOS 從背景回來會重建 AudioContext。
- 鎖屏連播（`player.js`）有三種方式，設定頁「鎖屏連播方式」可以切：
  - 單軌換帶 `single`：一首播完，同一個 `<audio>` 換下一首。
  - 雙軌接力 `dual`：下一首先在另一個 `<audio>` 預載；螢幕關著時，在剩不到 0.42 秒時交棒。
  - 自動 `auto`（預設）：先用單軌；偵測到背景換歌沒接上，就自己改成雙軌，並跳出「繼續播放」。
- 背景換歌每次都記在 IndexedDB `kv` 的 `diag`（留最後 30 筆）。設定頁「鎖屏換歌紀錄」會顯示接上、沒接上、被系統暫停各幾次。**痞子葳回報鎖屏斷掉時，先看這裡。**
- 第一次點畫面時，用無聲 WAV 喚醒兩個 `<audio>`（`unlock`）；非同步換歌前先 `prime()`。拿掉任何一步，iPhone 都會擋播放。
- Media Session 只註冊 play、pause、previoustrack、nexttrack、seekto、stop。**不要加 seekbackward／seekforward**：iPhone 鎖屏會把上一首／下一首換成快退／快轉。
- iPhone 不能用程式調音量，所以 iOS 不顯示音量條。
- **歌、封面、DIY 照片一律存成純位元組 `{ buf, type }`，不要存 Blob**（`db.putBytes`／`getRaw`／`getBytes`）。WebKit 把 IndexedDB 裡的 Blob 存成另外的檔案，有些 iPhone 的 web view（Claude App 就是）讀不回來：2026-11-13 痞子葳在 Claude App 匯入 216 首，結果每首都播不了、封面全是「?」。舊版存的 Blob 第一次讀到時會轉存成位元組；讀不出來的標成 `lost`，重新匯入同一首就補回（同一首、同一個位置）。
- 播放用 blob: 連結；某首的 blob: 連結打不開時，同一首改用 data: 連結再試，成功就從此都用 data:（設定 `srcMode`）。圖片開機時先試一張小圖（`R.blobImages`），不行就全用 data:。
- 連續三首播不了就停下來說明（`player.js` 的 `failed`／`explain`），不要一路跳過整個歌庫。Claude 版的說明附網頁版連結。
- 雲端沙盒測不了真的 iPhone 鎖屏。check.py 用「假裝螢幕關著」模擬；真機的狀況要看痞子葳回報和 `diag`。

## 匯入

- 三個入口：空歌庫卡片的「選擇音樂檔」「整個資料夾」、歌庫的「匯入」（選單二選一）、電腦上直接拖檔案或資料夾進視窗。
- 「整個資料夾」用 `<input webkitdirectory>`：iPhone 要 iOS 18.4 以上、Android 的 Chrome 要 132 以上、電腦都可以。不支援的裝置不顯示這個按鈕（`R.canFolder`，判斷寫在 `core.js`；iOS 26 的 Safari 在 user agent 裡把系統版本寫成 18_6，照樣算支援）。
  開檔案選擇器一定要在點擊的當下呼叫（iPhone 的規定），所以選單用 `now` 在點的那一下開，不要改成等選單關掉再開。
- 匯入一首一首做（`lib.importFiles`）：
  - 略過 `._` 開頭的檔、`.DS_Store`、隱藏資料夾、`__MACOSX`、不是音樂的檔；資料夾裡的影片（`video/*`）也略過。
  - 這台裝置播不了的格式（WMA、APE、DSF……，以及 `canPlayType` 說不行的）不放進來，最後的提示會說幾個、什麼格式。
  - 已經在歌庫的歌（看檔案內容的指紋，不看檔名）直接跳過，所以同一個資料夾可以放心重複匯入，只會補上新的。
  - 有資料夾路徑時照資料夾順序（數字照大小：2 在 10 前面）；同一個資料夾的檔名全都以曲序開頭（`01 `、`1-03 `）時，標題去掉曲序。
  - 歌裡沒有封面時，用同一個資料夾（或上一層，給 CD1／CD2 用）的 `cover.jpg`、`folder.jpg`、`AlbumArt_…_Large.jpg`；資料夾裡只有一張圖也算。
  - 超過 4 首會出現「停止匯入」，30 首以上提醒畫面保持開著，匯入中會申請畫面不要自動關（Wake Lock）。
  - 空間不夠（`R.db.isFull`）就停下來跳對話框，剛寫一半的那首會刪乾淨，不留殘檔。
  - 匯入資料夾後的提示有「存成歌單」：用資料夾名稱建歌單（已經有同名歌單就把缺的補進去），已經在歌庫的歌也算。
- 歌庫、歌單、播放佇列都是先畫 150 首，捲到底再一次補 250 首（`library.js` 的 `rowsHTML`、`watchMore`），上千首也開得快。

## 資料

- 全部存在使用者裝置的 IndexedDB `pz-reskin`，不連任何伺服器（音樂檔、封面、照片都是純位元組，見上面）：
  `tracks`（歌的資料）、`playlists`、`audio`（音樂檔本體）、`covers`、`analysis`（節奏分析）、`images`（DIY 照片）、`kv`（`settings`、`session` 上次播到哪、`diag`）。
- 同一個網域的 App 共用儲存空間：資料庫名稱 `pz-reskin`、service worker 快取前綴 `pzrs-` 都是這個 App 專用，不要跟別的 App 撞名。這個 App 不用 localStorage。
- 在 iPhone 上，每個加到主畫面的 App 都有自己的儲存空間：單獨加到主畫面的耳目一新、Safari、加到主畫面的收藏庫（在它裡面開的那份），歌庫互不相通（系統規定）。Android 和電腦在同一個瀏覽器裡是共用的。空歌庫畫面和設定頁最下面的提示，會照裝置換說法。
- 歌名、歌手、封面、長度讀檔案裡的標籤（`meta.js`）：ID3v1／v2.2～2.4、M4A、FLAC、WAV。Big5／GBK 編的舊標籤會自動判斷，不會變亂碼。
- 播不了的檔（例如這台裝置不支援的格式）會標記起來，提示後跳下一首。

## 副歌全開、換歌轉場

- 副歌偵測（`viz.js` 的 `hotSpans`）：分析好的音量曲線裡，找明顯比整首平均大聲、又撐得夠久的段落。播到那裡 `R.viz.hot` 會漸變到 1，並送出 `'hot'` 事件（進、出各一次）；副歌裡每一拍也會打得比較重。
- 共用特效 `hype.js`：進副歌時衝擊波、（允許的話）閃一下、兩邊彩帶炮；副歌裡重拍再補彩帶、上方光束掃動。每套 Skin 用 `def.hype` 決定：不寫是 `'full'`、`'lite'`（沒有光束和重拍彩帶）、`false`（自己做整套副歌表演，例如煙火夜、水墨、極光、像素街機）。副歌以外完全不畫、不花電。
- 換歌時（從一首換到另一首）每套 Skin 的根元素會加上 `.swap`（`def.swapMs` 後拿掉），並呼叫 `inst.swap(t)` 給 canvas 做動畫。沒有自己寫的，共用樣式會讓歌名和封面淡入。
- `.enter`（開場）和 `.swap` 的 CSS 動畫都要在 `enterMs`／`swapMs` 之內跑完，不然 class 拿掉時會跳一下；加新 Skin 或改動畫後要量過。
- 要「剛好在拍上」發生的效果（例如煙火：發射到炸開要 1 秒），用 `R.viz.upcoming(a, b)` 先讀接下來的拍點（`[時間, 強度, …]`），提前開始。
- 歌名、歌手被改掉時，`data-bind` 的字會自己更新；自己在 canvas 上畫字的 Skin（卡帶標籤、水墨的印章、像素街機的關卡卡片）實作 `onMeta(t)`。

## 歌詞、我的最愛、睡眠定時、改資訊、分享

- 歌詞（`lyrics.js`）：存在歌的 `lrc` 欄位。來源：資料夾匯入時同一個資料夾、同檔名的 `.lrc`（UTF-8、UTF-16、Big5／GBK 都認得）；歌曲檔裡的歌詞標籤（ID3 的 USLT、TXXX:LYRICS／USLT、M4A 的 ©lyr、FLAC 的 LYRICS）；改歌曲資訊時直接貼上。有時間標記的會跟著唱亮、點一句就跳過去。已在歌庫的歌，重新匯入時有新的 .lrc 就補上。
- 我的最愛：歌的 `fav` 欄位（加入的時間）。「我的最愛」歌單（id `fav`）是虛擬的：從 `fav` 算出來，不能改名、刪除、拖順序。H 鍵或按鈕列的愛心切換。
- 睡眠定時（`player.js` 的 `setSleep`）：15／30／60 分鐘或「播完這首」；右上角顯示倒數，點它可以改或取消。
- 改歌曲資訊（`extras.js`）：歌名、歌手、專輯、封面、歌詞。換封面會讓 `coverRev` 加一，正在穿的 Skin 重新掛上，封面才會全部換掉。
- 分享卡片（`share.js`）：1080×1350 的圖（封面、歌名、歌手、App 名稱），手機用系統的分享選單，電腦可以下載。
- DIY 分享碼：`耳目一新Skin:` 後面接 base64url 的 JSON（配色、視覺化樣式、版面、字型、暗度、模糊；照片不會一起過去）。貼的時候夾在聊天訊息裡、被斷行也認得。

## Skin 怎麼做

- 一套 Skin 是 `skins/<id>.js` 加 `skins/<id>.css`，用 `R.skins.def({...})` 註冊。`build.py` 的 `SKINS` 決定順序，衣櫃也照這個順序。
- 共用的按鈕和進度條用屬性接：`data-act`（動作）、`data-bind`（歌名之類）、`data-seek`（進度條）。
  `data-ui` 標的是派對模式要收起來的部分；封面和主視覺不要標。
- 顏色走 CSS 變數，`api.setTheme()` 會跟著封面顏色換。
- canvas 一律用 `R.kit.canvas`（限制 DPR，手機變慢時自動降畫質）。`frame(dt, t, v)` 每一格都拿得到現在的頻譜、節拍、心情（`v`）。
- 換裝是從點的地方用 clip-path 擴散開；衣櫃試穿用 `R.stage.show(id, { fast: true })`。
- DIY（`skins/diy.js`）：底圖（照片或封面）、配色、視覺化樣式、字型，存在 `settings.diy`，照片存在 `images`。
- 加新 Skin：照現有十五套的寫法；三種畫面都要截圖看過，check.py 要全過；閃光類效果要尊重設定頁的「閃光特效」開關（`api.flash()`）。
- 例外：像素街機自己管 canvas（用很低的解析度畫，CSS `image-rendering: pixelated` 放大），沒有用 `R.kit.canvas`；水墨、極光、煙火夜的山、城市、湖面在換尺寸時先畫好，每格只疊動的東西。

## Claude 版

- `build.py --claude-out` 另外輸出一份，最前面多一行 `window.RESKIN_NO_SW = true`（程式裡是 `R.CLAUDE`）：不註冊 service worker（Claude 不允許），設定頁和存不了歌時的提示，改成請他開網頁版。
- Artifact 跑在沙盒裡：瀏覽器的 alert、confirm、prompt 會被擋，所以 App 一律用自己的對話框（`R.ui.confirm`、`R.ui.prompt`）。全螢幕、Wake Lock 都要包 try/catch。
- Artifact 的頁面不能自己給檔案（一般的下載連結、程式存檔都沒作用）。分享卡片在 Claude 版走 artifact 的 `downloads` 能力（artifact 已宣告 `downloads: true`；程式用 `claude.use('downloads')`，拿到 `null` 就不顯示按鈕）：按「存起來或傳出去」會先跳確認，iPhone 上接著出現分享選單、電腦上是下載。網頁版專用的下載連結由 `build.py` 的 `CLAUDE_SUBS` 從 Claude 版拿掉，組建時會檢查裡面沒有 `download=`。

## 檔案

| 路徑 | 用途 |
|---|---|
| `src/index.html` | 外殼：舞台 `#stage`、下方按鈕列、抽屜 `#sheet`、衣櫃、對話框；`/*FONTS*/`、`/*CSS*/`、`/*JS*/` 由 build.py 填進來 |
| `src/core.js` | 共用工具、平台判斷（`R.isIOS`、`R.embedded`、`R.CLAUDE`）、設定、圖示、提示泡泡 |
| `src/db.js` | IndexedDB（iOS 在背景斷線時會自動重連一次） |
| `src/meta.js` | 讀標籤：歌名、歌手、封面、長度 |
| `src/art.js` | 封面縮圖、取色，沒有封面時畫一張 |
| `src/lib.js` | 歌庫、歌單、匯入 |
| `src/analysis.js` | 每首歌只分析一次：頻譜、波形、節拍、BPM |
| `src/player.js` | 播放器：兩個 `<audio>`、三種鎖屏連播方式、Media Session、診斷紀錄 |
| `src/viz.js` | 照播放時間查分析結果，給 Skin 用 |
| `src/sfx.js` | 介面音效（每套 Skin 不一樣） |
| `src/demo.js` | 示範曲：在裝置上現場合成的 56 秒電子樂 |
| `src/skinkit.js` | Skin 框架：註冊、換裝轉場、canvas、共用控制鈕 |
| `src/skins/` | 十五套 Skin 和 DIY |
| `src/hype.js` | 副歌全開的共用特效（彩帶、光束、衝擊波） |
| `src/lyrics.js` | 歌詞：解析 LRC、讀 .lrc 檔、跟著唱的歌詞畫面 |
| `src/extras.js` | 我的最愛、睡眠定時、「更多」選單、改歌曲資訊 |
| `src/share.js` | 分享卡片 |
| `src/ui.js` | 抽屜、選單、對話框 |
| `src/library.js` | 歌庫畫面：歌曲、歌單（含綁 Skin）、播放佇列 |
| `src/wardrobe.js` | 衣櫃：左右滑，用正在播的歌試穿 |
| `src/settings.js` | 設定頁 |
| `src/main.js` | 啟動、匯入、派對模式、快捷鍵 |
| `src/style.css` | 共用樣式 |
| `src/sw.js` | service worker：頁面網路優先，離線用存好的那份 |
| `src/fonts/` | 內嵌字型（見下面） |
| `build.py` | 組建 |
| `check.py` | 全流程檢查：自己產生測試音檔（含 Big5 標籤、壞檔、內嵌歌詞）和測試資料夾（含 .lrc、子資料夾），跑讀不到時的備援、資料夾匯入、新功能、手機直橫和電腦，最後測離線 |

## 字型

`src/fonts/` 是 @fontsource 的 woff2：Orbitron、Share Tech Mono、Chakra Petch、Exo 2、Fredoka、Bungee、Playfair Display、Permanent Marker、VT323、Press Start 2P。授權是 SIL OFL（Permanent Marker 是 Apache 2.0），組建時內嵌。只有拉丁字母，中文用系統字型。

## 朋友版

- **2026-11-13 起凍結**：痞子葳決定朋友那份就停在 2026-11-13 這版（他自己放上網的單一檔案），之後的改版只更新他自己的網頁版和 Claude 版。不要再做、也不要主動給他新的朋友版，除非他自己說要。朋友版是他放在別的網站上的一份拷貝，我們推上 PZ-Games 的更新不會碰到它。
- 給痞子葳的朋友用的獨立網頁版：沒有痞子葳的名字、沒有收藏庫的網址和按鈕。內容跟網頁版同一份，只是換掉 `FRIEND_SUBS` 列的字；`FRIEND_NEVER` 列的字只要還在，組建就會失敗（改了原本的字，要一起改這兩張表）。
- **給他的是單一檔案**（`build.py --friend-one /home/claude/out/朋友版/index.html`）：一個 index.html 就是整個網站，manifest 和主畫面圖示都內嵌（data: 網址），不註冊 service worker（`window.RESKIN_ONEFILE`），所以要有網路才打得開，打開後歌照樣從裝置裡播。放上網：登入後把這個檔案拖進 https://app.netlify.com/drop（可以只拖一個 HTML 檔），或上傳到一個 GitHub repo 再開 Pages。檔名要維持 index.html。check.py `--one` 會把它單獨放成一個網站（旁邊沒有任何其他檔案）跑完整流程。
- 為什麼不給壓縮檔：2026-11-13 先給的壓縮檔版（`--friend-out`／`--friend-zip`：index.html＋manifest＋sw.js＋icons，能離線開）他回報「無法用」，原因沒查到（多半卡在解壓縮或拖檔）。這個選項還留著，需要離線開的版本時再用：先解壓縮，把有 index.html 的那個資料夾整個拖進 Netlify Drop。
- 以後改版：Netlify 到同一個網站的「Deploys」頁再拖一次新檔；GitHub 就上傳覆蓋 index.html。網址不變。
