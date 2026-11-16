# 解包 UNPACKED

痞子葳的遊戲解包台（2026-11-16 上線）：每天清晨自動解包 2～3 款遊戲的深度專題，附預告、截圖、Steam 台灣區即時數據；另有 Claude 私房推坑、直式短影音預告牆、Steam 願望單獵價雷達、每週懶人包（本週結算），以及「遊戲狂想曲」粉專出稿台（貼文、三個標題、塗鴉圖卡、60 秒口播稿）。
網址：https://pzwei0105.github.io/PZ-Games/apps/unpacked/

起因：痞子葳看到 TGP 玩家口袋的 FB 遊戲介紹貼文，想要一個 App「主動抓取並寫成一篇篇遊戲詳細介紹」。他要求：主頁自己看、要詳盡、要有討論，像《玩真的》一樣附影片與圖片預覽，**而且要比玩真的更強、更全面**；粉專分頁照 Claude 建議的格式。全部收（大作、獨立、免費、平台獨佔），**手機遊戲一律排除**（他不喜歡什麼都得課金才能解鎖的遊戲）；每天 2～3 篇深度專題。視覺要呼應頻道的噴漆塗鴉風、聲光效果拉滿。

## 三個部分

| 部分 | 誰做 | 在哪 |
|---|---|---|
| 推坑（已上市、不分新舊的私房推薦） | 每日推坑排程（Claude 的排程任務「解包：每日推坑」，每天台灣時間 11:43，寫完推播） | `apps/unpacked/data/picks/<id>.json`，規範在 `PICKS_GUIDE.md`；publish.py 產生 `data/picks.json` |
| 專題（深度介紹＋粉專稿） | 每日寫稿排程（Claude 的排程任務「解包：每日寫稿」，每天台灣時間 05:23，寫完推播到痞子葳手機） | `apps/unpacked/data/features/<id>.json`，規範在 `WRITER_GUIDE.md` |
| 每週懶人包（本週結算＋粉專稿） | 每週排程（Claude 的排程任務「解包：每週懶人包」，每週日台灣時間 19:43，寫完推播） | `apps/unpacked/data/weekly/<YYYY-Www>.json`，規範在 `WEEKLY_GUIDE.md`；publish.py 產生 `data/weekly.json` |
| Steam 願望單（獵價） | 同一個 GitHub Actions：每小時讀痞子葳的公開願望單、對台灣區價格 | `tools/live.py` → `data/wish.json`（價格歷史也記在 `hist/<appid>.json` 的 `pr`）。Steam 代號放 repo 的 Actions 密碼 `UNP_STEAM`（Settings → Secrets and variables → Actions；不公開），沒有才讀 `data/wish-cfg.json` 的 `steam`（會公開）。代號不寫進 log 和輸出檔 |
| Steam 即時資料與選題候選 | GitHub Actions `.github/workflows/unpacked-live.yml`，每小時＋track.json 一變就跑。最新的 120 款、盯上市的、還沒抓過的每輪更新；其餘每輪輪流更新 40 款（最久沒更新的先），所以專題和推坑再多，每款也至少約一天更新一次 | `tools/live.py` → `data/live.json`、`data/hist/<appid>.json`、`data/candidates.json` |
| App 本體 | 這個資料夾的 `src/`，`build.py` 組成單一 index.html | `apps/unpacked/`（`build.py` 不碰 `data/`） |

上架工具 `tools/publish.py`：檢查每篇專題（格式、來源、簡體字、農場用語、貼文長度…），重建 `data/index.json`（目錄）和 `data/track.json`（要追蹤的 Steam appid）。**BAD 不准推。**

## 畫面

- **今日**：塗鴉牆上一張張海報（撕紙、膠帶、紅色印章結論「推薦／觀望／不推薦」；第一次進來海報一張張拍上牆）。捲到哪張、哪張就動起來：Steam 遊戲播動態預告（靜音循環，一次只播一支），其他遊戲輪播官方截圖與預告畫面；動起來的那張陰影變粉紅。追蹤牆便利貼（上市倒數、同上變化、特價、近期評價轉向，全部從即時資料自動長出來）、之前解包。
- **專題頁**：開啟時有「解包中」轉場（終端機逐行解包 `/資訊 /影像 /玩法…`）。主視覺、情境開場、三秒結論（捲到時印章砸下）、黏性檔案分頁籤。
  - 主視覺：Steam 遊戲直接播動態預告，其他遊戲是官方截圖＋預告畫面的 Ken Burns 輪播（慢慢推近、交叉淡入）。標題下方「一眼看懂」六格：上市倒數、台灣售價、平台、中文、課金、你的 SCAR 18。各段標題捲到時噴漆噴出來。
  - `/資訊`：資訊卡（每條可點開看來源；粉紅問號＝待確認）、Steam 即時數據（台灣售價與史低、同上與 7 天曲線、評價與近期好評率、繁中玩家評價、語言；捲到時數字跳上來、曲線畫出來）、課金雷達（0～4 格）、中文與台灣能不能玩、你的 SCAR 18、遊玩時間、接下來盯這些。
  - `/影像`：YouTube 官方預告（點了才載入）＋ Steam 預告（HLS：iPhone、Android、新版 Chrome／Edge 直接播，其他瀏覽器用 `vendor/hls.min.mjs`——**一定要完整版**：Steam 預告的聲音是獨立一條音軌，輕量版 hls.light 播出來會沒有聲音，2026-11-16 實測過）＋「用短影音直式滑著看」、相簿燈箱（可滑）：Steam 截圖＋專題附的官方圖＋每支 YouTube 預告自動截的 3 張畫面（maxres1～3，沒有就退回 hq，再沒有就拿掉），最多 18 張。
  - `/玩法` 循環貼紙＋拆解、你的第一個小時、跟誰像；`/劇情`（有雷的要「撕開」才看）；`/幕後`＋時間軸；`/風向`；`/討論`（每題可寫自己的想法）＋我的標記（想玩／在玩／玩過／沒興趣）＋筆記；`/來源`＋待確認。
  - 語音導讀（speechSynthesis，zh-TW）。
- **推坑**：Claude 的私房推薦牆，不分新舊、已經上市、查過評價又合痞子葳口味的遊戲，每天加 2～3 款。卡片有年份大字、推坑章（必玩／閉眼入／特價入／冷門神作）、即時價格與特價、繁中、時長、Steam 評價；篩選有繁中、特價中、15 小時內、40 小時以上、我想玩。第一次進來卡片一張張蓋章拍上牆，捲到的那張播動態預告或輪播。分頁上的數字是最新一批還沒打開的推坑。
  - 推坑頁：「挖寶中」轉場、動態主視覺、一眼看懂（上市年份、售價、平台、中文、時長、SCAR 18）、**推坑信**（Claude 第一人稱，捲到時推坑章砸下）、三個推坑理由；分頁：玩法拆解＋跟誰像、評價（Metacritic／OpenCritic＋Steam 與繁中即時評價、適合你／先別買、玩家和媒體怎麼說）、怎麼玩最好玩（跟朋友玩、版本怎麼選、怎麼買最划算）、劇情與世界觀（不劇透）、影像相簿、資訊卡、幕後與時間軸、玩完可以聊與我的標記、來源。跟主頁專題一樣全面。
  - 首頁「今日推坑」一排小卡；跑馬燈也會念今日推坑。
- **短影音**（分頁列正中間）：所有專題＋推坑的預告做成直式一支一支往上滑的牆（像 TikTok，自己看的）。依日期由新到舊、同一天專題和推坑交錯；篩選：全部／專題／推坑／特價中／沒看過／我想玩。分頁上的數字是最新一批還沒在短影音看過的。
  - 每一張：塗鴉大標題＋分類貼紙＋結論章（專題：推薦／觀望／不推薦；推坑：必玩／閉眼入／特價入／冷門神作）、16:9 預告、預告名稱與第幾支、標題文案（點一下展開看開場／推坑理由全文）、即時價格／特價、繁中、上市倒數、Steam 好評率、同上、時長、類型 hashtag、「看完整專題／看推坑全文」與 Steam 按鈕；右邊一排：想玩、聲音、換預告、分享。
  - 一款有好幾支預告：Steam 官方預告（HLS，可完全控制）排前面，再來是專題附的 YouTube（`index.json` 的 `yts`）。沒有預告就輪播精彩畫面；預告讀不到自動換下一支。
  - 操作：往上滑下一款、左右滑換同一款的其他預告、點一下暫停、點兩下收進「我想玩」（愛心噴出來）、按住 2 倍速、拖進度條快轉；電腦：滾輪或 ↑↓／J K 換款、空白鍵暫停、M 靜音、←→ 快轉 5 秒、N／P 換預告、L 想玩、F 全螢幕、Enter 打開專題，右上也有 ▲▼。第一次進來有一張「怎麼滑」說明。
  - 連播（上方開關，設定裡也有）：開＝播完自動滑到下一款；關＝同一支重播。聲音：預設有聲（「靜音進入」時先靜音）；瀏覽器擋有聲自動播放時會先靜音播，跳出「點一下開聲音」。
  - 版面：直拿＝標題在上、預告在中間、資訊在下、右邊一排按鈕（矮手機自動收小）；手機橫拿＝沉浸模式，預告吃滿高度、分頁列收起、字和按鈕疊在上面且不動 2.8 秒會淡掉（左上 ✕ 離開）；電腦／平板橫放＝劇院版，左邊大預告、右邊資訊欄。
  - 網址會跟著換成 `#shorts/f:<id>` 或 `#shorts/p:<id>`：分享出去打開就是那一支；去看專題再按「回牆上」會回到剛剛那一支。專題頁、推坑頁的 `/影像` 也有「用短影音直式滑著看」直接跳過來。
  - 技術：整面牆共用一個 `<video>`（iPhone 點過一次之後，換片也能直接有聲播放；開門畫面、任何一次點擊都會先「解鎖」它），滑到哪張就搬到哪張；只畫目前這張的前一張、後兩張，其他留空殼。底圖是 Steam 橫幅圖縮成 24 格寬的 canvas 再放大（看起來像毛玻璃，不用模糊濾鏡）。YouTube 只能用 iframe，靠 postMessage 聽「播完了」好連播（iPhone 在 iframe 裡不給有聲自動播放，會先靜音並提示點喇叭）。
- **獵價**（分頁列第四個）：Steam 願望單＋App 裡標「想玩」的遊戲（專題、推坑、短影音點兩下）合成一份獵物清單。
  - 雷達：掃描線 4 秒一圈，每一款是一個光點——特價是粉紅（越靠中心折越多）、史低是黃色加粉紅圈、未上市是白色三角形、等降價是灰點；掃到特價的光點會亮一下、嗶一聲。旁邊是特價中、史低、獵物總數和「這波特價一共便宜」（數字跳上來）。
  - 鎖定！正在特價：懸賞單（WANTED、懸賞 -XX%、原價劃掉、省多少、NEW、史低、特價倒數、出手／快收／鎖定章）。價格血條：滿格＝原價，剩下的血＝現在價格，黃線＝追蹤以來最低。
  - 即將上市（上市倒數）、等降價（現價、史低）兩個清單；篩選：特價中、史低、未上市、有繁中、NT$300 內、我想玩；排序：先看該出手的、折扣、便宜、好評、新加入。
  - 點任何一款（或雷達光點）打開情報卡：動態預告、現價／特價到幾點／史低、價格血條、價格紀錄階梯線、介紹；寫過專題或推坑的可以直接打開，標想玩的可以「不想玩了」。
  - 「史低」＝這個 App 開始追蹤以來的最低價，**追蹤滿 14 天才叫史低**，之前只說「追蹤 N 天內最低」（不是 Steam 有史以來的最低價；IsThereAnyDeal 要金鑰，沒接）。特價結束時間來自 Steam（`active_discounts`），專題和推坑的即時數據也會顯示「特價到幾點」。
  - 獵物出現警報：打開 App 時，有沒看過的新特價就跳出黃黑警示膠帶的「獵物出現」（警報聲、最多列 3 款），一天最多一次；設定可以關。進過獵價頁就算看過（分頁上的數字歸零）。首頁也會貼一條「你的獵物 N 款正在特價」的警示膠帶。
  - 還沒連結願望單（`wish.json` 的 `state` 不是 `ok`）時，顯示連結說明：Steam「遊戲詳細資料」設成公開，把個人檔案網址給 Claude。
  - 每天清晨的寫稿排程推播會帶上「願望單特價快報」（新特價、史低、快結束、限免）；推坑排程平常不推願望單上的，大特價時一天最多推 1 款「特價入」。
- **每週懶人包**（`#week`；首頁上方「WEEK 47 結算出爐」橫幅〔結算後 3 天內〕、首頁最下面的按鈕、粉專出稿台）：
  - 結算畫面：WEEK 數字砸下＋噴漆＋重低音、結算條跑完「本週結算 COMPLETE」、解包／推坑／大事／下週上市數字跳上來、Claude 的開場、本週 MVP（旋轉光芒、皇冠、MVP 章蓋下）、Tier 表（S～D，方塊一個個拍上去，點了打開那款）和每一款的排名理由、本週大事、下週出擊、特價戰利品（現在正在特價的獵物和解包過的遊戲）、數據王（同上人數、好評率、24 小時暴漲，用現在的 Steam 即時資料）、歷屆週報。
  - 還沒結算的這一週：上面顯示「WEEK N 進行中」面板（結算倒數到週日 21:00、這週到目前的解包和推坑）。
  - 粉專出稿：`#fan/w:<id>`，貼文、三個標題、hashtag、口播稿、已發佈，圖卡有封面（WEEK 大字＋MVP 撕紙框）、Tier 表、下週出擊三種，可以一次下載或分享三張。
- **庫存**：搜尋、結論／平台／類型／中文／課金／我的標記篩選、排序，最多 3 款加入比較（比較表）。
- **粉專**：每篇的出稿台（稿子如果是前幾天寫的、又有「倒數幾天」這類會過期的字，上方會提醒先改）。塗鴉圖卡產生器（版型 A 黃牆撕紙框、B 黑牆大圖；4:5／1:1；重噴換濺漆與截圖；下載 PNG、手機可直接分享）、可編輯的貼文（只存這台裝置）、三個標題、hashtag、口播稿、素材標註、標記已發佈（分頁上的數字是還沒發的篇數）。

## 聲光

- 開門畫面「點我・聲光全開」（iPhone 的 AudioContext 必須在點擊當下建立；`navigator.audioSession.type='playback'` 讓靜音鍵打開也有聲音）。
- 開場：每天第一次完整版（搖罐→噴漆罐真的把「解包」噴上牆→實心字砸下＋重低音＋濺漆＋閃光＋放射線→滴漆→UNPACKED 貼紙→膠帶跑馬燈，約 3.6 秒，點一下跳過），其他時候短版；設定可改。
- 音效全部 Web Audio 即時合成（搖罐、噴漆嘶聲、拍貼紙、蓋章、重低音、刷碟、撕紙、鈴鐺、打字聲）；背景 boom-bap 鼓組（92 BPM，帶搖擺、貝斯、和弦、刷碟、黑膠沙沙聲），看預告、滑短影音、語音導讀時淡出並整個停掉（不在背景空轉），結束再淡入。
- 底線（照頻道的塗鴉規則）：大衝擊（震動＋閃光）一個畫面最多 2～3 次、閃光每秒不超過 3 次、字永遠清楚。設定「特效：收斂」或系統「減少動態效果」時不震動不閃光。
- 手機記憶體：不用 filter／backdrop-filter／mix-blend-mode／模糊陰影；動畫只動 transform 和 opacity；噴濺粒子畫在一張全螢幕畫布上（裝置像素比上限 2，最多 260 顆，沒有粒子就停）。動態預告整個 App 同時最多兩支（主視覺一支、首頁一支，換頁就收掉），App 切到背景就暫停；「特效：收斂」或「減少動態效果」時不播動態預告、不輪播。
- 動態預告來源：Steam 的 microtrailer（`live.json` 的 `micro`，mp4 給 iPhone、webm 給沒有 H.264 的瀏覽器）。

## 粉專圖卡

`src/card.js`。1080×1350（4:5）或 1080×1080。先量好標題、副標、標籤、重點紙條的高度，再決定放幾條重點、圖多高（字一定要清楚，放不下就少放一條）。
遊戲圖要能畫進畫布再匯出：先直接載（`crossOrigin=anonymous`），不行就走 `images.weserv.nl` 圖片代理，再不行就只畫塗鴉底（不會讓畫布變成無法匯出）。

## 資料格式

- `data/index.json`：`{at, n, items:[{id,date,rank,kind,kind_label,zh,en,steam,platforms,genres,release,price_text,headline,stamp,label,money,zhs,tw,yt,yts,img,gal,updated}]}`（publish.py 產生；`img` 是 `media.images` 第一張，`gal` 是第 2～6 張，首頁海報輪播用；`yts` 是 `media.yt` 的 `[{id,t}]` 最多 4 支，短影音用）。
- `data/features/<id>.json`：見 `WRITER_GUIDE.md` 第 3、4 節；範例 `rob-run`、`gta-vi`、`unhinged`。
- `data/picks/<id>.json`：見 `PICKS_GUIDE.md` 第 3 節；範例 `balatro`、`octopath-traveler-2`、`xcom-2`。`data/picks.json`：`{at, n, items:[{id,date,rank,zh,en,steam,year,release,genres,platforms,stamp,label,pitch,zhs,hours,price_text,money,yt,yts,img,gal,updated}]}`（publish.py 產生）。
- `data/wish.json`：`{at, ok, state(ok/unset/badid/empty/stale), n, items:[{appid, added, pri, name, img, cap, free, p:[現價,原價,折扣], low:[最低價,那天,開始追蹤日], sale:{from,end}, rv:[%,則數,標籤], rel, zh, tags, dev, short, deck, micro?}]}`（live.py 產生；價格單位「分」）。`sale.from` 是我們看到它開始特價的時間（第一次抓或剛加進願望單時不知道，是 null）。
- `data/weekly/<YYYY-Www>.json`：見 `WEEKLY_GUIDE.md` 第 4 節。`data/weekly.json`：`{at, n, items:[{id, from, to, date, title, mvp, mvp_name, top, updated}]}`（publish.py 產生；`top` 是 Tier 表前 4 名，首頁橫幅用）。
- `data/candidates.json` 另有 `gems`（Steam 評價最高的遊戲）、`gems_sale`（評價最高又正在特價），推坑選題用；`picked: true` 是推過的；每份清單的 `mine: true` 是在痞子葳的 Steam 願望單上。
- `data/live.json`：`{at, apps:{appid:{name,free,price{final,orig,disc,fmt,low},rv{n,pct,label,recent},rv_tc,players{n,at,peak,d24},rel,langs{tc,sc},tags,img{hero,header,wide,box},shots[],micro,trailers[{hls,mp4,poster,name}],…}}}`；價格單位是「分」（NT$ × 100）。
- `data/hist/<appid>.json`：`pl` 同上 `[分鐘時間戳, 人數]`、`pr` 價格（有變才記）、`rv`／`rt` 全球與繁中評價 `[時間, 好評數, 總數]`（一天一筆）。
- localStorage 前綴 `unpacked.v1.`：`settings`（含短影音的 `shAuto` 連播、`shSound` 聲音）、`marks`、`notes`、`thoughts`、`posted`、`edits`、`cmp`、`seen`（專題 `<id>`、推坑 `p:<id>`、短影音 `v:f:<id>`／`v:p:<id>`）、`introDay`、`shHint`、`shWantTip`、`huntSeen`（看過的特價：`appid:價格`）、`huntAlertDay`（獵物出現警報今天跳過了沒）；設定多了 `huntAlert`。粉專的 `posted`、`edits` 也用 `w:<週 id>` 存週報。

## 組建與測試

```bash
python3 _build/apps/unpacked/build.py                    # → apps/unpacked/（不碰 data/）
python3 _build/apps/unpacked/build.py --icons            # 重畫圖示
python3 _build/apps/unpacked/tools/publish.py            # 專題檢查＋重建目錄
# 本機看畫面（雲端沙盒連不到 Steam、YouTube、github.io：外部圖片用假圖代替）
python3 _build/apps/unpacked/build.py --out /tmp/unp && python3 _build/apps/unpacked/tools/testdata.py /tmp/unp/data --hunt   # --hunt：假願望單＋假週報；再加 --noweek 測「本週進行中」
python3 _build/apps/unpacked/tools/shoot.py /tmp/shots /tmp/unp phone '[{"wait":4800},{"shot":"home"},{"go":"#f/rob-run","ms":2500},{"shot":"feat"}]'
```
`shoot.py` 的畫面：`phone`（390×844 @3）、`se`（375×667，小手機）、`android`（412×915）、`land`（844×390 @3）、`pad`（820×1180）、`desk`（1440×900）；步驟支援 wait、go、click、tap（觸控點擊）、key（按鍵）、eval、print（把運算結果印出來，用來驗證狀態）、scroll、shot、savecanvas（把圖卡存成 PNG）。注意 Playwright 的 eval 算「使用者點擊」，要測「有聲自動播放被擋」得自己把 `HTMLMediaElement.prototype.play` 換成會擋的版本。
網址加 `?enter=1` 會自動跳過開門畫面（測試用）；不是正式網址時可用 `?data=` 指定資料資料夾；`?hlsjs=1` 強制走 hls.js（測電腦瀏覽器的串流路線）。

**短影音測試**（沙盒連不到 Steam 影片）：先做一段跟 Steam 一樣「聲音獨立一條音軌」的 fMP4 HLS，shoot.py 會拿它代替所有 Steam 預告；YouTube 會換成假播放器（`UNP_YT_END` 秒後回報播完）。
```bash
mkdir -p /tmp/hlst && cd /tmp/hlst && ffmpeg -f lavfi -i "testsrc2=size=1280x720:rate=30:duration=10" -f lavfi -i "sine=frequency=440:duration=10" \
  -map 0:v -map 1:a -c:v libx264 -preset veryfast -g 60 -c:a aac -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_type fmp4 \
  -hls_fmp4_init_filename init.mp4 -master_pl_name master.m3u8 -var_stream_map "v:0,agroup:aud a:0,agroup:aud,default:yes" \
  -hls_segment_filename 'stream_%v/seg_%03d.m4s' 'stream_%v/index.m3u8'
python3 _build/apps/unpacked/tools/shoot.py /tmp/shots /tmp/unp phone '[{"wait":1500},{"go":"#shorts","ms":3000},{"print":"({i:SH.i,key:SH.key,playing:SV&&!SV.paused,audio:SV&&SV.webkitAudioDecodedByteCount})"},{"shot":"shorts"}]'
```
（`UNP_HLS` 可指定別的 HLS 資料夾，`UNP_AUTOPLAY=1` 讓瀏覽器不擋有聲自動播放。）

沒有 Claude 版：artifact 沙盒連不到 pzwei0105.github.io，讀不到每天更新的專題與 Steam 資料（和《全知》《下回分解》一樣）。
