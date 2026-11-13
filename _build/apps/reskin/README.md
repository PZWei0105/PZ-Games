# 耳目一新 RESKIN（維護說明）

痞子葳的換膚音樂播放器：播自己的音樂檔，二十三套 Skin 加 DIY，一鍵換裝；每套都踩著這首歌真正的拍子動（節拍追蹤），副歌一到全開，換歌有各自的轉場。
整個 App 有 GPU 泛光、陀螺儀立體感、科幻開機動畫、換 Skin 轉場（傳送門／玻璃碎裂／像素溶解）、鎖屏封面換膚。
功能：卡拉 OK 逐字歌詞、歌曲情報（BPM、調性、能量曲線、跳到副歌）、智慧歌單、聽歌報告、一鍵音樂短片，
還有我的最愛、睡眠定時、改歌曲資訊、分享卡片、DIY 分享碼。
App 裡稱呼使用者一律用「痞子葳」。

- 網頁版：https://pzwei0105.github.io/PZ-Games/apps/reskin/（可加到主畫面、離線聽、鎖屏連播；收藏庫「專屬 App」分頁有入口）
- Claude 版：https://claude.ai/artifact/Dcws22E7CZzxpo9HLH8XUm（slug `66328189-c13f-4f55-ba42-02e7b5b2437a`）。試 Skin 用：沒有 service worker，歌只存在那個瀏覽器，不能鎖屏一直聽。改版就發布到同一個 artifact，不要另開新的。

## 組建與檢查

```bash
python3 _build/apps/reskin/build.py --claude-out /tmp/reskin-claude
python3 _build/apps/reskin/check.py --claude /tmp/reskin-claude        # 全流程檢查，要看到「全部 OK」（約 25 分鐘）
python3 _build/apps/reskin/build.py --icons                            # 只有改圖示才需要（要 playwright、pillow）
python3 _build/apps/reskin/friend/build.py --friend-one /home/claude/out/朋友版/index.html   # 朋友版（凍結、只收除錯，見最下面）
python3 _build/apps/reskin/friend/check.py                             # 朋友版自己的完整檢查
python3 _build/apps/reskin/lockmeter.py [網站資料夾] [標籤] [skin,…] [歌檔 拍長 起 迄]   # 量每套 Skin 跟拍的程度（見「節拍」）
```

- 網頁版輸出到 `apps/reskin/`；`--claude-out` 另外輸出 Claude 版。主版本的 build.py 不再做朋友版（`--friend-*` 會叫你改用 `friend/build.py`）。
- check.py 依序跑：節拍引擎離線測試（node 跑 analysis.js：合成的舞曲 128、切分流行 100、抒情 72、嘻哈 90，速度、每一拍、每小節第一拍都要對）、讀不到檔時的備援、資料夾匯入、新功能（歌詞、最愛、睡眠定時、改資訊、分享卡片、分享碼、副歌、泛光、三種轉場、鎖屏卡、分析第 3 版、節拍格線、拍子事件準時、對拍滑桿方向、「正在對拍」提示、對拍測試、節奏大師計分、粒子封面 WebGL、歌曲情報、智慧歌單、卡拉 OK、景深、聽歌報告、音樂短片）、網頁版全流程（開機動畫、手機直、手機橫、電腦，每套 Skin 都換一次歌），再對 Claude 版跑一次全流程。
- check.py 開 Chromium 時帶 SwiftShader 參數（`GL`），3D Skin 和泛光才畫得出來；軟體算圖很慢，畫質會被自動調低，截圖比真機糊是正常的。

- 截圖在 `/tmp/reskin-check`，改到畫面就逐套看過再上線：手機直、手機橫（844×390）、電腦（1280×800）。
- 發布 Claude 版：`publish_files` 不收 `/tmp` 底下的檔，先把 `/tmp/reskin-claude/index.html` 複製到 `/home/claude/` 底下再發布。
- 只動 `apps/reskin/`，不用重組收藏庫；改了收藏庫上的介紹（`data/catalog_base.json`）才要重組。
- 版本號是組建時間（例如 `2026.11.13-0319`），會寫進頁面和 service worker。

## 最重要的規矩：iPhone 上的播放

- **歌一律用 `<audio>` 播，不能接進 Web Audio**（`createMediaElementSource`）。iPhone 鎖屏後 Web Audio 會被暫停，接進去的歌就跟著沒聲音。
  所以畫面上的頻譜、波形、節拍都是匯入時先分析好的（`analysis.js`，在 Worker 裡跑：22050 Hz 解碼、每秒 30 格、32 個頻帶、48 點波形、起音、BPM），播放時照時間查表（`viz.js`）。還沒分析完的歌，畫面先用合成的律動（`v.synthetic`）。
- **螢幕關著（鎖屏聽歌）和匯入中都不分析節奏**，等畫面打開、匯入結束才接著做。解碼很吃電，iPhone 也可能把在背景拚命做事的頁面停掉，連音樂一起停。不要拿掉這個等待。
- 介面音效（`sfx.js`）才用 Web Audio，跟歌分開；iOS 從背景回來會重建 AudioContext。
- 音樂短片（`clip.js`）也用 Web Audio，但**不碰在播的 `<audio>`**：把歌檔另外解碼一次，只取要錄的那一段餵進錄影（`createMediaStreamDestination`），不接喇叭。聽到的還是 `<audio>`。
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

## 光、深度、轉場、開機、鎖屏（全部 Skin 共用）

- **GPU 泛光**（`fx.js`）：每格把 Skin 的 canvas（含副歌層、轉場層）縮小畫進一張小圖（手機約 195×422），上傳成貼圖，在 WebGL 裡門檻（soft knee）→ dual Kawase 模糊（4～5 層）→ 視需要加水平鏡頭光紋 → 合成時加鏡頭色散與抖色，畫在 `#fx`，用 `mix-blend-mode: plus-lighter`（不支援就 `screen`）疊上去，**只會加光**，字和按鈕不會糊。沒有 WebGL 時改成 CSS 濾鏡版（`.fx-css`）。副歌裡重拍會有一瞬間的 RGB 錯位（尊重「閃光特效」開關）。歌詞或聽歌報告打開時泛光會收掉。手機已經降到最低畫質還一直掉格，泛光這次開啟就先關掉（`tired`）。設定「霓虹泛光」可關。
- **景深**：`R.fx.focus(key, on)` 讓 `#stage` 失焦（模糊、變暗、微微放大）；歌詞、聽歌報告用它。歌詞的背景因此變半透明，看得到糊掉的 Skin。
- **陀螺儀立體感**（`tilt.js`）：iPhone 要從點擊裡呼叫 `DeviceOrientationEvent.requestPermission()`，所以第一次開 App 6 秒後會跳一個提示（「打開」按鈕），設定頁也有開關；同意過的話之後每次開 App 的第一下點擊會再要一次（iOS 每次載入都要）。量的是「跟平常拿手機的角度差多少」（慢慢跟上的基準），不用擺正。電腦用滑鼠位置；兩者都沒有時畫面自己輕輕晃。3D Skin（黑洞、液態金屬、霓虹城市、超跑、戰機）直接讀 `R.tilt` 轉鏡頭或打方向盤。嵌在收藏庫或 Claude 裡拿不到陀螺儀（iframe），會說明。
- **換 Skin 轉場**（`trans.js`）：`R.stage.show()` 把舊的那層交給 `R.trans.run()`。傳送門：新 Skin 從光圈裡展開、舊的被吸進去；玻璃碎裂：舊 Skin 先拍成照片（`R.snap`），從點的地方裂開、碎片翻滾掉落；像素溶解：故障閃一下、變大像素、一格一格閃掉；經典：原本的圓形展開。衣櫃試穿（`fast`）只用快的兩種。設定「換 Skin 轉場」可指定。
- **開機動畫**（`boot.js`）：掃描線開機 → 八色環飛入鎖上 → 名字解碼 → 狀態列 → 光環變成傳送門打開。App 還沒好會停在最後一段等，點一下跳過。設定「開機動畫」可關（存在 localStorage `rs-boot`，因為開機時設定還沒讀出來）。
- **鎖屏封面換膚**（`poster.js`）：換歌 1.9 秒後（Skin 的換歌動畫跑完）把 Media Session 的封面換成這套 Skin 風格的卡片（HUD 角框、光環、黑膠封套、卡帶、大像素、宣紙印章、拍立得、毛玻璃、鉻框），背景是 Skin 當下畫面的柔焦。換 Skin 2.6 秒後也會重畫。設定「鎖屏封面換膚」可關。
- **畫面快照**（`snap.js`）：把 Skin 的 canvas、封面、背景色與漸層（含條紋）、邊框、文字（含光暈）、clip-path（polygon／circle／inset）、SVG 畫到一張 canvas。轉場、短片（每格都畫）、鎖屏卡共用。偽元素和 CSS 濾鏡畫不到。
- **WebGL 的 Skin**（黑洞、液態金屬、霓虹城市）開 context 時 `preserve: true`，快照才讀得到畫面；`destroy()` 一定要 `loseContext()`（iPhone 同時能開的 WebGL 有限，衣櫃來回滑會一直開新的）。解析度跟著 `R.quality()`。著色器一律寫 GLSL ES 1.00（WebGL 2、1 都能跑）。

## 節拍（分析第 3 版）與跟拍

2026-11-13 痞子葳回報「畫面跟音樂各做各的」。原因：舊版把「低音一冒出來」當一拍（`beats` 其實是起音），速度也常抓錯（流行 100 抓成 80、抒情 72 抓成 109、嘻哈 90 抓成 120），一半的反應落在拍子外；很多 Skin 的主要動作又照固定速度或抓錯的 BPM 跑。現在：

- **節拍引擎**（`analysis.js` 的 `beatCore`，在 Worker 裡跟 `analyzeCore` 一起跑）：1024 點 FFT、每 256 個取樣一格（約 86 格／秒），40 個對數頻帶分四組（低：大鼓；中低：貝斯、鋼琴、吉他；中：小鼓、拍手、人聲；高：鈸），各組先除以自己的 95 百分位，再照 1、0.7、0.55、0.15 加起來（大鼓最重、鈸最輕：鈸跟大鼓一樣響時，速度會被拉到錯的 3:2）。速度：自相關的峰值（加上 ×2、½、×1.5、⅔）逐一用「8 秒窗內穩定脈衝對不對得上起音」評分，乘上以 116 BPM 為中心的先驗；拍子：動態規劃（Ellis 2007，tightness 120）；整首在一條穩定格線上的歌（大多數錄音室作品）直接用那條線（前奏只有反拍鈸也不會走掉）；每小節第一拍：大鼓＋和弦變化＋起音最多的那個相位；每拍的力度跟附近的拍比（大部分落在 0.45～1）；另存四組「打點」：`kicks`、`snares`、`hats`、`tones`（中低音的音符）。結果記 `v: 3`，歌記 `av: 3`。
- **舊歌會自己重量**：`av` 比 3 小的歌，開 App 後在新歌後面慢慢重量；**正在播的那首插隊先量**（`player.js` 的 `setTrack`），通常幾秒就換上新格線。解碼失敗的歌每個版本再試一次（`afv`）。
- **畫面的拍子時鐘**（`viz.js`，`R.viz`）：`beat`（每拍的閃光包絡）、`down`（每小節第一拍）、`phase`（這拍走了多少 0→1）、`bpos`（這小節第幾拍，0 是第一拍）、`bar`（這小節走了多少）、`beatT`（從頭算第幾拍，連續）、`stepT`（同上但每拍先快後慢：拿來移動東西會「踩著拍子」一步一步走）、`pump`（拍上 1、到下一拍前歸 0，乘上力度：拿來做縮放、亮度）、`kickE／snareE／hatE／toneE`（各樂器的打點包絡）、`ibi`（一拍幾秒）、`synced`（是不是用這首自己的格線）。事件：`R.viz.onBeat((s, { down, bpos, idx }) => …)`、`R.viz.onHit((kind, s) => …)`；提前讀：`upcoming(a, b)`、`upcomingBeats(a, b)`（含 bpos）、`upcomingHits(kind, a, b)`。Skin 裡用 `api.beat`、`api.hit`（換 Skin 時自動解除）。
- **全部 Skin 共用的跟拍**：泛光跟著 `pump`／`down` 一明一暗（`fx.js`）；每拍整個 Skin 微微推一下、小節第一拍多一點（`skinkit.js` 的 `punch`，用 `scale` 屬性；`def.punch` 調整、0 關掉；安靜的 Skin 調小）；`def.hero` 的主角每拍放大一點（CSS 變數 `--rp`、`--rd`，量用 `--hp` 調，預設 .045）。Skin 的根元素上另有 `--rk`、`--rs`、`--rh`（大鼓、小鼓、鈸）。系統「減少動態效果」時這些都關掉。
- **對拍滑桿**：正值＝畫面晚一點（給藍牙耳機）。舊版方向寫反了（往右調反而更快），2026-11-13 修正：`t = 播放時間 + 0.035 − latency`。
- **對拍測試**（`sync.js`，設定頁的按鈕）：用 `<audio>` 播 120 BPM 的滴答聲（跟音樂同一條路，所以藍牙延遲算得進去），圓圈照畫面用的同一個時鐘閃；左右調到「滴」跟「閃」同時。會先暫停音樂、關掉再接著播。
- **「正在對拍這首歌…」提示**（`#syncChip`）：在播的歌還沒有新格線時出現（1.5 秒後），格線一到就說「拍子對上了」再收起來。
- **量跟拍程度**：`lockmeter.py` 用 CDP screencast 抓真正合成後的畫面，把亮度與畫面變化量照「真實拍子相位」折疊成 8 格，看拍上與拍間的差距（%）。2026-11-13 用切分節奏的流行測試曲量：二十套的畫面變化量差距中位數 27% → 108%。SwiftShader 下 WebGL 畫面會晚幾格，峰值位置不準，只看差距。
- **做會跟拍的 Skin**：移動用 `stepT`（或速度乘上 `0.5 + 1.5 × pump`）、縮放亮度用 `pump`、大動作放在 `down`（或 `bpos === 2`）、細碎的閃爍給 `hatE`；**不要用 `s > 0.6` 之類的門檻挑拍子**：新的力度是跟附近的拍比的，大部分拍子都會超過。

## 分析第 2 版、歌曲情報、智慧歌單

- `analysis.js` 第 2 版多量：調性（4096 點 FFT 的 12 音級 chroma，對 Krumhansl 大小調輪廓，存成 `mkey`，例如 `Am`；**不要用 `key`**，那是檔案指紋）、響度 `loud`（dB）、亮度 `bright`（頻譜重心 Hz）、鼓點衝擊 `punch`（0～1）。歌的資料記 `av: 2`；舊版分析過的歌開 App 後會在新歌後面慢慢補量（只在畫面開著時）。
- 歌曲情報（`R.insight.open(id)`）：BPM、調性（中文、記號、Camelot）、能量、響度、音色、鼓點；能量曲線（點一下跳過去）標出副歌；「跳到副歌」跳到現在之後的下一段副歌；「做成短片」。「更多」選單和歌的「⋯」選單都進得去。
- 智慧歌單（`R.smart`）：嗨歌、運動（照 BPM 由慢到快，慢歌但很嗨的算兩倍速）、放鬆、深夜，門檻用整個歌庫的百分位（歌少於 8 首時用固定門檻）。是虛擬歌單（id `smart:hype` 這樣），不能加歌、改名；可以綁 Skin，預設綁好：嗨歌→演唱會舞台、運動→超跑夜奔、放鬆→極光、深夜→黑洞（存在設定 `smartSkins`）。

## 卡拉 OK、聽歌報告、音樂短片

- 卡拉 OK（`lyrics.js`）：有時間標記的歌詞，唱到的那一句一個字一個字亮。enhanced LRC 的逐字時間（`<01:02.50>`）照用；沒有就把那句的時間照字的份量分（中文字 1、英文字母約一半、空白和標點更少）。正在唱的那個字用 `::after` 疊一份亮色、用 clip-path 擦過去（不要改回 `background-clip: text`，在某些字型下會變成方塊）。歌詞外觀跟著 Skin（`#lyrics[data-look]`：hud、cosmic、pixel、ink、cute、glass、chrome、retro），水墨是宣紙底黑字。**歌詞框本身的屬性不要叫 `data-ly`**，點歌詞的處理會把它當成按鈕。
- 聽歌紀錄（`stats.js`）：照 `<audio>` 自己的時間算（`timeupdate` 鎖屏也有），每天存一筆：秒數、聽完幾首（聽滿 30 秒或短歌的一半算一首）、24 小時分布、每首、每套 Skin。存在 `kv` 的 `stats`。刪掉的歌會從紀錄裡拿掉。
- 聽歌報告（`report.js`）：本週／本月／今年／全部；總時數、主打歌、前五名、最愛歌手、最愛 Skin、聽歌時鐘、音樂人格、1080×1920 分享圖。點右邊下一張、左邊上一張、左右滑也行，按住暫停。
- 音樂短片（`clip.js`）：選副歌（自動）／從現在／從頭、15 或 30 秒、要不要卡拉 OK 歌詞、1080p。倒數 3 秒後播放器跳到那一段播放，每格用 `R.snap` 把 Skin（不含按鈕）畫進 720×1280（或 1080×1920；橫螢幕錄 16:9）的 canvas，疊上歌詞和小浮水印，`captureStream(30)` 加解碼出來的那段音訊，`MediaRecorder` 錄。iPhone 不指定格式（Safari 自己用 MP4：H.264＋AAC），錄好用分享選單存到相簿或傳 IG；電腦 Chrome 能錄 MP4 就錄 MP4，不行才是 WebM（會提示）。錄的時候切走 App 會中斷。**iPhone 真機能不能錄，要看痞子葳實測回報。**

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
- 加新 Skin：照現有二十三套的寫法；三種畫面都要截圖看過，check.py 要全過；閃光類效果要尊重設定頁的「閃光特效」開關（`api.flash()`）；主要動作要踩拍子（見「節拍」最後一點）。
- 2026-11-13 加的三套都是圍著拍子設計的：**節奏大師**（`rhythm`：把這首的 kicks／tones／snares／hats 寫成四條軌道的譜，音符剛好在聲音響起時落到判定線，拍子格線也跟著捲動；副歌 FEVER；舊分析沒有打點時用拍子格線排譜）、**粒子封面**（`particles`：封面每個像素一顆 WebGL 點，形狀在頂點著色器裡算；每八小節的第一拍換形狀：封面→球→星系→甜甜圈→雙螺旋；GLSL 裡 `flat` 是保留字，別拿來當變數）、**重低音**（`woofer`：錐盆是被大鼓踢動的阻尼彈簧，上面的珠子被彈起來；LED 環每拍跑一格、副歌變彩虹，顏色量化成 15° 一階，光暈圖才能快取）。
- Skin 定義裡還可以寫：`bloom`（泛光強度，數字或 `{ s, th, streak, tint, ca }`，0 就不發光；水墨是 0）、`hero`（陀螺儀時會 3D 傾斜、有反光的元素）、`glare: false`（不要反光）、`depth`（`[選擇器, 深度]`，正的跟著傾斜方向、負的反方向）、`trans`（「自動」轉場時偏好的那一種）。
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
| `src/analysis.js` | 每首歌只分析一次：頻譜、波形、節拍格線（第 3 版：速度、每一拍、每小節第一拍、四組打點）、調性、響度、亮度、鼓點衝擊 |
| `src/player.js` | 播放器：兩個 `<audio>`、三種鎖屏連播方式、Media Session、診斷紀錄 |
| `src/viz.js` | 照播放時間查分析結果，給 Skin 用；拍子時鐘（phase、stepT、pump、down、各樂器打點） |
| `src/sfx.js` | 介面音效（每套 Skin 不一樣） |
| `src/demo.js` | 示範曲：在裝置上現場合成的 56 秒電子樂 |
| `src/boot.js` | 開機動畫（取代原本的 splash；`#splash` 跑完才拿掉，check.py 靠這個判斷開好了） |
| `src/glkit.js` | WebGL 小工具：開 context（WebGL 2，不行就 1）、編譯、全螢幕三角形、貼圖、封面貼圖 |
| `src/tilt.js` | 陀螺儀立體感：`R.tilt.x/y`、CSS 變數 `--tx/--ty`、`def.depth`／`def.hero` |
| `src/skinkit.js` | Skin 框架：註冊、換裝（交給 trans.js）、canvas、共用控制鈕、主迴圈 |
| `src/snap.js` | 把 Skin 畫成一張圖（轉場、短片、鎖屏卡共用） |
| `src/fx.js` | GPU 泛光層、副歌鏡頭色散、景深（`R.fx.focus`） |
| `src/trans.js` | 換 Skin 轉場：傳送門、玻璃碎裂、像素溶解、經典 |
| `src/skins/` | 二十三套 Skin 和 DIY |
| `src/sync.js` | 「正在對拍」提示、對拍測試 |
| `src/hype.js` | 副歌全開的共用特效（彩帶、光束、衝擊波） |
| `src/lyrics.js` | 歌詞：解析 LRC（含逐字時間）、讀 .lrc 檔、卡拉 OK 逐字亮、每套 Skin 的歌詞外觀 |
| `src/extras.js` | 我的最愛、睡眠定時、「更多」選單、改歌曲資訊 |
| `src/share.js` | 分享卡片；`R.share.present()` 是圖片和影片共用的「存起來／分享」抽屜 |
| `src/poster.js` | Skin 風格的封面卡（鎖屏、控制中心） |
| `src/insight.js` | 歌曲情報（`R.insight`）、智慧歌單（`R.smart`） |
| `src/stats.js` | 聽歌紀錄（鎖屏聽也算） |
| `src/report.js` | 聽歌報告（故事卡片＋分享圖） |
| `src/clip.js` | 一鍵音樂短片 |
| `src/ui.js` | 抽屜、選單、對話框 |
| `src/library.js` | 歌庫畫面：歌曲、歌單（含綁 Skin）、播放佇列 |
| `src/wardrobe.js` | 衣櫃：左右滑，用正在播的歌試穿 |
| `src/settings.js` | 設定頁 |
| `src/main.js` | 啟動、匯入、派對模式、快捷鍵 |
| `src/style.css` | 共用樣式 |
| `src/sw.js` | service worker：頁面網路優先，離線用存好的那份 |
| `src/fonts/` | 內嵌字型（見下面） |
| `build.py` | 組建 |
| `lockmeter.py` | 量每套 Skin 跟拍的程度（畫面照拍子相位折疊） |
| `friend/` | 朋友版（凍結的十五套版本，只收除錯）：`src/`、`build.py`、`check.py` |
| `check.py` | 全流程檢查：自己產生測試音檔（含 Big5 標籤、壞檔、內嵌歌詞）和測試資料夾（含 .lrc、子資料夾），跑讀不到時的備援、資料夾匯入、新功能、手機直橫和電腦，最後測離線 |

## 字型

`src/fonts/` 是 @fontsource 的 woff2：Orbitron、Share Tech Mono、Chakra Petch、Exo 2、Fredoka、Bungee、Playfair Display、Permanent Marker、VT323、Press Start 2P。授權是 SIL OFL（Permanent Marker 是 Apache 2.0），組建時內嵌。只有拉丁字母，中文用系統字型。

## 朋友版

- **2026-11-13 起凍結在十五套 Skin 的版本，只收除錯**：痞子葳決定朋友那份停在 2026-11-13 那版（commit 360fb9f，他自己放上網的單一檔案），之後的新 Skin、新功能都不給朋友；同一天他又說「朋友那一版，請妳除錯就好」：**修正要一起修進朋友版，新東西不要**。朋友版是他放在別的網站上的一份拷貝，我們推上 PZ-Games 的更新不會碰到它，所以每次除錯後要把新的單一檔案傳給他，請他重新上傳。
- **原始碼在 `_build/apps/reskin/friend/`**：`src/` 是 360fb9f 的十五套版本加上修正（字型借用 `../src/fonts`，主畫面圖示借用 `apps/reskin/icons`）；`build.py` 只輸出朋友版（`--friend-one`、`--friend-out`、`--friend-zip`），不會碰 `apps/reskin/`；`check.py` 組好兩種、跑完整流程（含共用的節拍引擎測試）。主版本修了什麼共用的東西（`analysis.js`、`viz.js`、`sync.js`、Skin 的修正），要判斷是不是「除錯」，是的話一起改進朋友版、跑 `friend/check.py`。
- 2026-11-13 第一次除錯：節拍引擎（`analysis.js`、`viz.js` 跟主版本同一份）、十五套 Skin 重新接上拍子、整個 Skin 每拍微推、副歌彩帶在第 1、3 拍、對拍滑桿方向、對拍測試與「正在對拍」提示。主版本的泛光、陀螺儀、新 Skin、新功能都沒有放進去。
- 給痞子葳的朋友用的獨立網頁版：沒有痞子葳的名字、沒有收藏庫的網址和按鈕。換掉 `FRIEND_SUBS` 列的字；`FRIEND_NEVER` 列的字只要還在，組建就會失敗（改了原本的字，要一起改這兩張表）。
- **給他的是單一檔案**（`friend/build.py --friend-one /home/claude/out/朋友版/index.html`）：一個 index.html 就是整個網站，manifest 和主畫面圖示都內嵌（data: 網址），不註冊 service worker（`window.RESKIN_ONEFILE`），所以要有網路才打得開，打開後歌照樣從裝置裡播。放上網：登入後把這個檔案拖進 https://app.netlify.com/drop（可以只拖一個 HTML 檔），或上傳到一個 GitHub repo 再開 Pages。檔名要維持 index.html。
- 為什麼不給壓縮檔：2026-11-13 先給的壓縮檔版（`--friend-out`／`--friend-zip`：index.html＋manifest＋sw.js＋icons，能離線開）他回報「無法用」，原因沒查到（多半卡在解壓縮或拖檔）。這個選項還留著，需要離線開的版本時再用：先解壓縮，把有 index.html 的那個資料夾整個拖進 Netlify Drop。
- 改版上線：Netlify 到同一個網站的「Deploys」頁再拖一次新檔；GitHub 就上傳覆蓋 index.html。網址不變。朋友手機上已經有的歌庫不受影響，舊歌會在打開時慢慢重量節拍。
