# 解包 UNPACKED

痞子葳的遊戲解包台（2026-11-16 上線）：每天清晨自動解包 2～3 款遊戲的深度專題，附預告、截圖、Steam 台灣區即時數據；另有 Claude 私房推坑、直式短影音預告牆、Steam 願望單獵價雷達（每款都有 Claude 的願望單解包、買不買判定與目標價、到價警報）、出擊日曆（可訂閱到手機行事曆）、每週懶人包（本週結算）、Steam 行情板（線上人數前百名做成股市看盤）、大特賣倒數＋免費補給站（Epic／Steam／GOG 限時免費）、TGA 預測戰（跟 Claude 封存的預測比誰準）、點播台（指定遊戲解包、你問我答），以及「遊戲狂想曲」粉專作戰台（Threads／IG／FB 三平台發文排程、每一次上架都附步驟教學、導流成效追蹤、新片的影片三連發；用的是每篇的貼文、Threads 版、三個標題、塗鴉圖卡、60 秒口播稿）。
網址：https://pzwei0105.github.io/PZ-Games/apps/unpacked/

起因：痞子葳看到 TGP 玩家口袋的 FB 遊戲介紹貼文，想要一個 App「主動抓取並寫成一篇篇遊戲詳細介紹」。他要求：主頁自己看、要詳盡、要有討論，像《玩真的》一樣附影片與圖片預覽，**而且要比玩真的更強、更全面**；粉專分頁照 Claude 建議的格式。全部收（大作、獨立、免費、平台獨佔），**手機遊戲一律排除**（他不喜歡什麼都得課金才能解鎖的遊戲）；每天 2～3 篇深度專題。視覺要呼應頻道的噴漆塗鴉風、聲光效果拉滿。

## 三個部分

| 部分 | 誰做 | 在哪 |
|---|---|---|
| 推坑（已上市、不分新舊的私房推薦） | 每日推坑排程（Claude 的排程任務「解包：每日推坑」，每天台灣時間 11:43，寫完推播） | `apps/unpacked/data/picks/<id>.json`，規範在 `PICKS_GUIDE.md`；publish.py 產生 `data/picks.json` |
| 專題（深度介紹＋粉專稿） | 每日寫稿排程（Claude 的排程任務「解包：每日寫稿」，每天台灣時間 05:23，寫完推播到痞子葳手機） | `apps/unpacked/data/features/<id>.json`，規範在 `WRITER_GUIDE.md` |
| 願望單解包（願望單每一款的深度專題＋買不買＋目標價） | 每日排程（Claude 的排程任務「解包：願望單解包」，每天台灣時間 16:37；排隊名單空了就什麼都不做、不推播） | 一樣寫進 `apps/unpacked/data/features/<id>.json`（`kind: wish`、`rank` 從 20 起、一定有 `buy`），規範在 `WISH_GUIDE.md`；不寫的（DLC、原聲帶、成人向）記在 `data/wish-skip.json` |
| 每週懶人包（本週結算＋粉專稿） | 每週排程（Claude 的排程任務「解包：每週懶人包」，每週日台灣時間 19:43，寫完推播） | `apps/unpacked/data/weekly/<YYYY-Www>.json`，規範在 `WEEKLY_GUIDE.md`；publish.py 產生 `data/weekly.json` |
| Steam 願望單（獵價） | 同一個 GitHub Actions：每小時讀痞子葳的公開願望單、對台灣區價格 | `tools/live.py` → `data/wish.json`（價格歷史也記在 `hist/<appid>.json` 的 `pr`）。Steam 代號放 repo 的 Actions 密碼 `UNP_STEAM`（Settings → Secrets and variables → Actions；不公開），沒有才讀 `data/wish-cfg.json` 的 `steam`（會公開）。代號不寫進 log 和輸出檔 |
| Steam 即時資料與選題候選 | GitHub Actions `.github/workflows/unpacked-live.yml`，每小時＋track.json 一變就跑。最新的 120 款、盯上市的、還沒抓過的每輪更新；其餘每輪輪流更新 40 款（最久沒更新的先），所以專題和推坑再多，每款也至少約一天更新一次 | `tools/live.py` → `data/live.json`（清單用的精簡版）＋`data/live/<appid>.json`（預告、截圖、介紹，點開才載）、`data/hist/<appid>.json`、`data/candidates.json` |
| Steam 行情板、免費補給站 | 同一個 GitHub Actions（每小時） | `tools/live.py` → `data/board.json`（前百名＋30 小時曲線＋7 天走勢）、`data/board-d.json`（每天高峰，留 120 天）、`data/free.json`（Epic、Steam、GOG 限時免費；某家這一輪抓不到就沿用上一輪還沒過期的） |
| 點播台（點播解包、你問我答、影片三連發） | App → 轉發站 ntfy.sh → 同一個 GitHub Actions 每小時收件（`tools/inbox.py` → `data/inbox.json`）→ 寫稿（05:23）、推坑（11:43，只接問答）、願望單（16:37）三班排程回答 | 回答寫進 `data/qa.json`，規範在 `QA_GUIDE.md`。影片三連發（粉專作戰台送的新片文案）寫進 `data/videos/<點播 id>.json`（QA_GUIDE 第 7 節），publish.py 產生 `data/videos.json`。轉發站主題寫在公開的程式裡，收件一律當不可信資料 |
| 平台規則（粉專作戰台的字數、hashtag、連結規則、YouTube 營利門檻） | 每週懶人包排程順便查證（WEEKLY_GUIDE 第 8 節），有官方或兩個可靠來源確認有變才改 | `data/platforms.json`（publish.py 檢查格式）；App 讀不到時用內建的同一份數字 |
| TGA 預測戰 | Claude 11/18 封存預測（`data/tga.json`，publish.py 記了指紋，之後只准填 `win`／`result_at`）；12/11 的單次排程「解包：TGA 開獎」填得獎名單、推播比分 | 規範在 `TGA_GUIDE.md` |
| 活動表（大特賣、新品節、主題節、頒獎典禮） | 寫稿排程看到官方公告就更新 | `data/events.json`（只收官方來源；格式見 `WRITER_GUIDE.md`「順手更新活動表」） |
| App 本體 | 這個資料夾的 `src/`，`build.py` 組成單一 index.html | `apps/unpacked/`（`build.py` 不碰 `data/`） |

上架工具 `tools/publish.py`：檢查每篇專題（格式、來源、簡體字、農場用語、貼文長度…），重建 `data/index.json`（目錄）和 `data/track.json`（要追蹤的 Steam appid）。**BAD 不准推。**

## 畫面

- **開場**（每天第一次完整版）：搖罐、噴出「解包」、實心字砸下、貼紙、膠帶之後，2026-11-18 起再接一段「頭條拍上牆」（`vs.js` 的 `introHeadline`）：今天最新一批的前三款海報一張張從天上拍下來、蓋上推薦／觀望章，最後一排數字貼紙——今日解包幾款、今日推坑幾款、幾款到了目標價（沒有就寫特價中的獵物數）、幾款限時免費，全部是 App 手上的真實資料；沒有的那張貼紙不出現。短版、特效收斂時不播這段。
- **VS 擂台**（`#vs/<左>,<右>`，`f:專題 id` 或 `p:推坑 id`；`vs.js`）：從專題頁、推坑頁的「VS 對決」挑對手（可以搜尋全部專題與推坑），庫存的比較選剛好兩款時也直接上擂台（三款照舊是比較表）；首頁最下面也有「VS 擂台」。兩張海報從左右飛進來、VS 砸下、一局一局比：現在價格（低的贏）、Steam 好評率（至少 50 則）、近期好評率（至少 20 則）、現在同上、中文（繁中＞簡中＞無）、課金（少的贏）各算一局；Claude 的章、遊玩時間、上市只並列不分勝負；任何一邊沒有資料那一局就不算。最後寫「數據上拿下幾局」並註明只比看得到的數字、不代表哪一款比較好玩。下面是粉專「二選一」圖卡（1080×1350，上紅下黃斜切、兩款主視覺、VS 爆炸、價格／好評／中文貼紙、遊戲狂想曲貼紙，不放痞子葳的名字）＋可複製的貼文，可以存圖或分享。
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
  - Claude 判定：有願望單解包（或任何附 `buy` 的專題）的獵物會貼「Claude：等特價 ≤NT$300」；現價小於等於目標價（而且不是「別買」）＝**到價**：雷達正中心、懸賞單「到價」章、警報「N 款到了 Claude 的目標價」、首頁膠帶、分頁數字、每天早上推播。還沒寫解包的顯示「解包排隊 #N」（照加入願望單由新到舊、每天 2 款，跟排程同一套規則），情報卡會寫大約幾天寫好；獵價頁上方有「Claude 願望單解包」進度條。
  - 專題頁的「買不買」卡：判定大字、目標價、現在價格離目標還差多少、價格血條上的綠色目標線、理由、什麼情況會改判；到價時蓋「到價」章。
  - 還沒連結願望單（`wish.json` 的 `state` 不是 `ok`）時，顯示連結說明：Steam「遊戲詳細資料」設成公開，把個人檔案網址給 Claude。
  - 每天清晨的寫稿排程推播會帶上「願望單特價快報」（新特價、史低、快結束、限免）；推坑排程平常不推願望單上的，大特價時一天最多推 1 款「特價入」。
- **出擊日曆**（`#cal`；獵價頁右上、首頁最下面、週報「下週出擊」旁的按鈕）：解包過的上市日、願望單的上市日和特價截止（願望單與解包過的）、最新週報的下週出擊排在一起。最上面是下一個上市的大倒數（D-N），再來是「訂閱到手機行事曆」（`webcal://…/data/calendar.ics`，live.py 每小時重算；內容沒變不重寫）、近五週的日程格（點有事的日子跳到那天）、照日期排的清單，每一筆右邊可以單獨加進行事曆（iPhone 直接開「加入行事曆」畫面，其他瀏覽器下載 .ics），也能全部加入一次。
- **每週懶人包**（`#week`；首頁上方「WEEK 47 結算出爐」橫幅〔結算後 3 天內〕、首頁最下面的按鈕、粉專出稿台）：
  - 結算畫面：WEEK 數字砸下＋噴漆＋重低音、結算條跑完「本週結算 COMPLETE」、解包／推坑／大事／下週上市數字跳上來、Claude 的開場、本週 MVP（旋轉光芒、皇冠、MVP 章蓋下）、Tier 表（S～D，方塊一個個拍上去，點了打開那款）和每一款的排名理由、本週大事、下週出擊、特價戰利品（現在正在特價的獵物和解包過的遊戲）、數據王（同上人數、好評率、24 小時暴漲，用現在的 Steam 即時資料）、歷屆週報。
  - 還沒結算的這一週：上面顯示「WEEK N 進行中」面板（結算倒數到週日 21:00、這週到目前的解包和推坑）。
  - 粉專出稿：`#fan/w:<id>`，貼文、三個標題、hashtag、口播稿、已發佈，圖卡有封面（WEEK 大字＋MVP 撕紙框）、Tier 表、下週出擊三種，可以一次下載或分享三張。
- **行情板**（`#board`；首頁「行情板」小卡、最下面的按鈕）：Steam 線上人數前百名做成股市看盤，**紅漲綠跌**（台灣慣例）。
  - 大盤：前百名總人數（「萬」字縮小、數字跳上來）、比 24 小時前同一時間漲跌幅、30 小時走勢線、上漲／平盤／下跌家數（±1% 以內算平盤）；每天第一次打開敲開盤鐘。
  - 跑馬燈：漲跌最多的；題材熱度：照 Steam 標籤分組的熱力格（同一款最多算三個標籤），點一下篩選。
  - 個股列表：名次、名稱（解包過的用中文名）、現在人數、24 小時與 7 天漲跌、7 天走勢小圖、標記（爆量＝24 小時多 40% 以上且至少 3,000 人、暴衝＝週排名升 25 名以上、新進榜、崩跌、新高＝追蹤滿 3 天後創新高）；篩選全部／爆量／新進榜／解包過／免費；排序名次、漲幅、跌幅、人數。
  - 點一款打開個股卡：數字格、30 小時與 7 天走勢圖、每天高峰長條（board-d.json）、「看解包」或「點播解包這款」、「問 Claude」、Steam 商店頁。
  - 資料：`ISteamChartsService/GetGamesByConcurrentPlayers`（不到 50 筆就改用每款 `GetNumberOfCurrentPlayers`），名稱與標籤來自 `IStoreBrowseService/GetItems`；`src` 會標用了哪一種。
- **大特賣倒數＋免費補給站**（在獵價頁裡）：
  - 下一場大特賣（`events.json` 的 `sale`）：超過 7 天是一條細的倒數，7 天內變大面板（倒數、開打時間、連幾天、你的獵物裡有幾款可能會打折）；特價期間顯示「最後一晚」。專題頁「買不買」判定是等特價／等史低的，卡片下面會提醒下一波大特賣幾號開打、還有幾天。
  - 免費補給站：Epic、Steam、GOG 現在限時免費、領了就永久留在帳號裡的遊戲（不含本來就免費的），橫向滑卡片：商店、剩幾小時、原價、Steam 評價與繁中（Steam 的）、NEW；「我領了」會記住；也列出 Epic 下週要送的（神秘遊戲照官方寫法）。首頁獵價膠帶和分頁數字會算進新出現的免費遊戲。
  - 出擊日曆多了大特賣（開打與最後一晚）、新品節、TGA 頒獎與投票截止、免費截止。
- **TGA 預測戰**（`#tga`；首頁 TGA 橫幅、最下面的按鈕）：
  - 頒獎台主視覺（聚光燈、倒數到 12/11 08:30）、痞子葳 vs Claude 比分板。
  - 30 個獎項（照 TGA 官方 11/17 公布的入圍名單）分五組；每一項點一個押，最多 3 張加倍卡；解包過、推坑過的入圍有小標。
  - Claude 的 30 項預測封存在信封裡，**鎖定之後才拆封**（撕開信封、號角、一張張翻牌，跳「你們有 N 項押得不一樣」）；忍不住可以偷看，但成績單會註記。拆封後每一項都看得到 Claude 押誰、信心星數、理由。
  - 計分：年度最佳遊戲 5 分、六項製作大獎 2 分、其他 1 分，加倍卡押中翻倍。開獎後得獎的格子蓋「得獎」章、沒中的變暗，比分跳上來、贏的那邊戴皇冠。
  - 粉專圖卡：預測卡（「遊戲狂想曲先押了」）、開獎後的成績單（猜中幾項、年度最佳押中沒、每項 ✓✗），4:5／1:1，加上可複製的貼文。圖卡和貼文只用「遊戲狂想曲」，不放痞子葳的名字。
  - 鎖定時把他押的送到點播台的收件匣（開獎排程用它算比分推播）。
- **點播台**（右上角收音機圖示；`#ask`）：「你問我答」問任何遊戲問題（可以指定關於哪一款，有快速問題貼紙）、「點播解包」指定一款遊戲請編輯寫完整專題。上方燈號：送出中／已送出等收件／都收到了／送不出去（連上網路自動重送）。每一則顯示狀態（排隊中、下一班是誰幾點、處理中、已回覆），回答有段落、重點、來源、「看那一篇」；有新回答時收音機圖示亮數字、打開 App 會提示。三班的時間表也列在頁面上。
  - 專題頁、推坑頁的「問 Claude」：送到點播台，或「現在就聊」把這款的重點整理好複製、打開 Claude 直接聊；那一款被問過的問答也會出現在專題頁下面。
  - 問答存在公開的 GitHub 上，頁面上有提醒不要寫私人資料。
- **庫存**：搜尋、結論／平台／類型／中文／課金／我的標記篩選、排序，最多 3 款加入比較（比較表）。
- **粉專**（粉專作戰台，下一節）：今日／排程／出稿／成效／教學五個分頁，分頁上的數字是今天還沒發的。每篇的出稿頁（稿子如果是前幾天寫的、又有「倒數幾天」這類會過期的字，上方會提醒先改）有塗鴉圖卡產生器（版型 A 黃牆撕紙框、B 黑牆大圖；4:5／1:1；重噴換濺漆與截圖；下載 PNG、手機可直接分享）、可編輯的原稿（只存這台裝置）、三個標題、hashtag、口播稿、素材標註，上面多了 Threads／IG／FB 三個平台各自的版本和「去上架」。

## 粉專作戰台（2026-11-18）

痞子葳問「粉專要開在哪個平台、怎麼經營、能不能賺錢」之後要的：**三平台發文排程＋導流成效追蹤**，而且**每一次上架都有最基礎的步驟教學**。目標只有一個：把 Threads／IG／FB 的人帶回 YouTube 頻道「遊戲狂想曲」（錢來自 YouTube 營利和業配，粉專本身不賺錢）。原始碼：`src/ops.js`（排程、出稿、上架教學、日曆）、`src/opsstats.js`（成效）、`src/opslearn.js`（教學、影片三連發）。

- **今日**（`#fan`）：下一個時段的倒數（TONIGHT 20:00＋HOT 標）、連發天數、本週進度；今天要發的每一篇（哪個平台、幾點、發哪一篇），按「開始上架」進教學流程；發完蓋章（COMBO 連發特效），今天全部發完有「今天收工」。另外：開站任務的進度條、該回填的成績、週日晚上到週二的「本週成績」回填提醒、明天預告。
- **排程**（`#fan/~plan`）：一週七天 × 三平台的格子。每天 05:23 解包後自動填上當天的專題（Threads 先挑、FB／IG 跟著發同一篇；週日 21:00 那格等 19:43 出爐的週報）；點格子可以換一篇、改時間、跳過。「發文節奏」有起步／標準／衝刺三種（也能自己改每格的時間），「時段加進手機行事曆」下載 .ics（每週重複＋發文前 5 分鐘提醒）。「這些時段怎麼來的？」寫著依據（台灣 Threads 的互動高峰；FB、IG 沒有可靠的台灣數據，先用晚上 8 點，累積成績後看自己的黃金時段）。下面是影片三連發的清單。
- **上架**（`#fan/~go:<日期>.<平台>`、`#fan/~do:<ref>|<平台>`）：圖卡＋那個平台的文字＋一步一步的教學（可以打勾、精簡／完整切換），最後「我發好了」蓋章。三個平台的文字規則不一樣：
  - Threads：500 字上限（超過就照段落拆成串文，或提示用文字附件）、只放一個主題標籤、連結直接放內文最後一行（上片文、討論文）。
  - IG：說明文字裡的網址不能點，改成「連結在個人檔案」；hashtag 最多 5 個（2025-12 起）；上片那天的步驟會提醒把個人檔案連結換成新片。
  - FB 粉專：部分粉專每月只有 2 則能帶外部連結（留言裡的也算，每月 1 號重算），所以只有上片文放影片連結，其他用「YouTube 搜尋遊戲狂想曲」；成效頁可以設定「有沒有這個限制」，額度用完會提醒。發文步驟提醒切換成粉專身分、可用 Meta Business Suite 同時排 FB 和 IG。
  - 文字裡還有「＿＿＿」沒填、或出現「痞子葳」都會警告（粉專只用「遊戲狂想曲」）。
- **出稿**（`#fan/~drafts`）：原本的出稿台清單（專題、週報），從這裡挑一篇多發或換別篇；每篇的出稿頁上方有三個平台的分頁。
- **成效**（`#fan/~stats`）：導流漏斗（三平台粉絲 → 帶到 YouTube 的觀看 → 訂閱）、每週回填（粉絲數、近 7 天觀看、從 Threads／IG／FB 來的觀看、公開觀看時數；每格都寫著在 YouTube 工作室哪裡看）、各平台帶來的觀看長條、粉絲與訂閱的折線、YouTube 營利進度（粉絲贊助 500 訂閱＋3,000 小時、廣告分潤 1,000＋4,000 小時，2027-02-01 起新申請改 8,000 小時，照 `platforms.json`）、黃金時段熱力圖（用每篇回填的觀看算）、教練建議、發文紀錄（每篇回填觀看／互動／新粉絲）、FB 本月連結額度、備份碼匯出匯入。
- **教學**（`#fan/~learn`）：開站任務 7 步（開 IG 創作者帳號、開 Threads、開 FB 粉專、個人檔案連結、YouTube 網址、行事曆、發第一篇；每步都有白話步驟和可複製的名稱／簡介）、平台規則（讀 `platforms.json`，附來源和查證日期）、經營觀念、上片清單 8 項。
- **影片三連發**（`#fan/~vid:<id>`）：上新片時填標題和上片時間，App 自動排「前一天 20:00 預告、當天上片文、隔天 20:30 討論」三平台各一篇（`v:<影片>:pre|up|talk`）。可以勾「請 Claude 照這集內容寫」走點播台（`vid` 事件，寫稿或願望單那一班寫進 `data/videos/<點播 id>.json`），寫好前先用 App 的範本；上片後貼上 YouTube 網址，連結會照各平台規則自動加；說明欄和置頂留言可以一鍵複製。
- **資料只在這台裝置**：排程、發文紀錄、成績、影片清單都存在 localStorage（`unpacked.v1.ops`），不上傳；換手機用成效頁的備份碼（`GR1:` 開頭）搬。影片三連發如果請 Claude 寫，標題和內容會走點播台、存在公開的 GitHub 上（勾選處有寫）。

## 累積不變慢（典藏升級，2026-11-18）

解包的內容只會累積、不刪（專題、推坑、短影音全部留著）。為了一年、幾年後打開還是一樣快，照這幾條做：
- **即時資料分兩層**：`live.json` 只放每次開 App 都要的（價格、同上、評價、語言、主視覺、動態預告）；預告清單、截圖、介紹、開發商放 `live/<appid>.json`，點開那一款（專題、推坑、短影音、情報卡、圖卡）才載，載好併進 `live.json` 那一筆。開完 App 閒下來時，先預載今天的專題和推坑、「想玩」的、短影音最前面幾支。舊格式（全部在 live.json）也讀得懂。
- **長清單分批畫**：庫存一次 48 張、推坑牆 24 張、出稿台 40 篇，捲到離底 1600px 就接著畫；回到那一頁照上次畫到的數量畫，捲動位置回得去。
- **開 App 的資料一次發出去**（以前分三批排隊）；專題、推坑的資料在解包動畫播的時候就開始載。
- **日曆不洗版**：解包過的遊戲同一天特價截止最多列 6 款（「想玩」的一定列），其他併成一筆（App 和訂閱的 calendar.ics 都一樣）；願望單的全部列。
- 粉專分頁的數字只算最近兩週還沒發的；點播台的「關於哪一款」選單只列最近 60 篇專題、40 款推坑（更早的到那一款的頁面按「問 Claude」會自動帶入）。
- `publish.py` 會檢查每次開 App 都要載的檔案：`index.json` 超過 3 MB、`picks.json` 超過 2 MB、`live.json` 超過 6 MB 就 WARN（到時候再把舊的分到典藏檔）。

量測（`tools/stress.py` 造出一年份的資料：專題 1,473 篇、推坑 921 款、即時資料 2,438 款；`tools/perf.py` 模擬手機：CPU 降速 4 倍、4G、跟 GitHub Pages 一樣 gzip）：

| | 現在・升級前 | 現在・升級後 | 一年後・升級前 | 一年後・升級後 |
|---|---|---|---|---|
| 冷開（到首頁海報出來） | 1.16 秒 | 1.02 秒 | 4.88 秒 | 1.97 秒 |
| 熱開 | 0.89 秒 | 0.69 秒 | 4.66 秒 | 1.50 秒 |
| 打開專題頁 | 1.14 秒 | 0.97 秒 | 1.37 秒 | 1.01 秒 |
| 庫存／推坑牆／出稿台 | 0.09／0.24／0.05 秒 | 0.08／0.17／0.06 秒 | 2.95／3.46／2.00 秒 | 0.13／0.26／0.20 秒 |
| 最高記憶體 | 5.4 MB | 5.3 MB | 46.7 MB | 23.4 MB |

（專題頁的時間含解包轉場動畫約 0.8 秒。）

## 寫稿之後（2026-11-18）

專題和推坑寫完就固定了，可是遊戲會變：加了繁中、推出正式版、改價、評價翻盤、開放工作坊（Mod）、官方一直出更新。這一塊讓舊稿不會「看起來還是當時的樣子」：
- **自動記變化**：`live.py` 每款記一份「上次確認的樣子」（`base`：中文、即將推出、搶先體驗、免費、原價、好評率、工作坊），每次更新那一款就比對。**同一個變化要連續兩輪都看到才算數**（`pend`），Steam 偶爾回傳不完整的資料不會變成假消息；評價小幅波動、特價期間的原價跳動都不算。算數的寫進 `chg`（最多 20 筆）。第一次看到的遊戲只記現況、不算變化。
- **收官方公告**：Steam 社群公告（`ISteamNews/GetNewsForApp`，開發商自己發的：更新、修正、活動、路線圖），每款約 6 小時看一次（照 appid 雜湊錯開；輪流更新的冷門款每次輪到都看），最新 8 則放 `news`；標題或 Steam 標籤看得出是更新的標「更新」，其他標「公告」。不存「上次看的時間」，沒有新公告就不動檔案。
- **App 怎麼用**：專題頁、推坑頁頂部有變化或有官方更新就貼一條「寫稿之後」橫幅（點了跳到資訊卡裡的「寫稿之後・自動追蹤」，列出寫稿之後的每個變化和官方公告，點公告開 Steam 全文）；回訪改寫過的顯示「✓ 回訪改寫」。庫存小卡、推坑牆貼「加了繁中」「剛更新」小標；首頁追蹤牆多了「最近 7 天的變化」（同一款一張）和「3 天內的官方更新」（最多兩張）。有 Steam 工作坊的，即時數據下面標「MOD」（沒有工作坊不代表不能裝 Mod，所以只標有的）。
- **寫稿時間怎麼算**：用文章的 `updated`（回訪改寫、7 天內更正都會改它）；只有日期的當那天（台灣）結束——寧可漏掉當天的變化，也不要把寫稿前就有的事說成「寫稿之後」。
- **舊稿回訪**：寫稿編輯、推坑編輯每天跑 `tools/revisit.py` 挑 1～2 篇變化大的舊稿改成現在的樣子（`WRITER_GUIDE.md` §5b、`PICKS_GUIDE.md` §4b），`updated` 跟著改、`rev` 記一筆，App 顯示「11/30 回訪改寫：…」。`publish.py` 檢查 `rev` 格式、`updated` 有沒有跟著改。
- **不拖慢 App**：列表和追蹤牆要的（`live.json` 的 `stale`：寫稿之後的變化、7 天內的更新，3 天內的才帶標題）跟著 `live.json` 一起來，不多開一個檔；完整的（每篇幾則公告、分數）只在 `revisit.py` 算，不塞給 App。一年份的量測：`stale` 約 77 KB（gzip 16 KB）。

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
- `data/calendar.ics`：出擊日曆的訂閱檔（live.py 產生，全天事件；UID 固定，訂閱的手機會跟著更新、不會重複）。`data/wish-skip.json`：`{"appid": "不寫解包的理由"}`（願望單解包排程寫）。專題多了 `buy`：`{call, target(分), why, watch}`，目錄只帶 `{call, target}`。
- `data/weekly/<YYYY-Www>.json`：見 `WEEKLY_GUIDE.md` 第 4 節。`data/weekly.json`：`{at, n, items:[{id, from, to, date, title, mvp, mvp_name, top, updated}]}`（publish.py 產生；`top` 是 Tier 表前 4 名，首頁橫幅用）。
- `data/candidates.json` 另有 `gems`（Steam 評價最高的遊戲）、`gems_sale`（評價最高又正在特價），推坑選題用；`picked: true` 是推過的；每份清單的 `mine: true` 是在痞子葳的 Steam 願望單上。
- `data/live.json`：`{at, ok, asked, errs, apps:{appid:{name,appid,free,adult,price{final,orig,disc,fmt,low,end},rv{n,pct,label,recent},rv_tc,players{n,at,peak,d24},rel,langs{tc,sc},tags,at,img{hero,header},micro{mp4,webm}}}}`（清單用的精簡版）；價格單位是「分」（NT$ × 100）。
- `data/live/<appid>.json`：同一款的其他欄位 `{img{hero,header,wide,box},micro,shots[],trailers[{hls,mp4,webm,poster,name}],short,dev,pub,plat,url,ws,news[{t,d,u,k(patch/news),x}],base{zh,soon,ea,free,orig,rv,ws},pend,chg[{k(zh/rel/ea/free/orig/rv/ws),a,b,d}]}`，App 點開才載（`liveLoad()`），live.py 有變才重寫、不再追蹤的刪掉（`live_load()`／`live_save()` 負責拆和合）。`ws`：有 Steam 工作坊（true／false；沒拿到分類資料就沒有這個欄位）。
- `data/live.json` 的 `stale`：`{"f:<id>"／"p:<id>": {ch:[寫稿之後的變化], lp:{t?, d}（7 天內最新的官方更新，3 天內才帶標題）}}`（寫稿之後，列表小標和追蹤牆用）。
- `data/hist/<appid>.json`：`pl` 同上 `[分鐘時間戳, 人數]`、`pr` 價格（有變才記）、`rv`／`rt` 全球與繁中評價 `[時間, 好評數, 總數]`（一天一筆）。
- `data/board.json`：`{at, src(concurrent/players), since, t:[時間], s:[走勢時間], idx:{n,d1,up,dn,fl,h,sp}, rows:[{a(appid), n, h(30 小時), sp(7 天), d1, d7, pk, r, rp, lw, f:[標記], ath, nm, tags, rv, free, p, img, zh, adult, cov(f:/p:)}], tags:[{t, n, k, d1}]}`；`data/board-d.json`：`{days, pk:{appid:[每天高峰]}, ath, nm, last, since}`。
- `data/free.json`：`{at, ok, errs, items:[{id(epic:…/steam:…/gog:…), store, title, img, url, orig 或 orig_t, start, end, up(下週才送), mystery, dlc, appid, rv, zh, tags, seen}], past}`。
- `data/events.json`：`{at, note, items:[{id, kind(sale/fest/show/vote), name, en, start, end, big, note, src:{t,u}}]}`（時間都是 UTC）。
- `data/tga.json`：`{show, vote_end, venue, vote_url, sealed, result_at, intro, rules, cats:[{id, zh, en, pt, grp, nom:[{n, zh, sub, ref}], claude:{c, conf, why, s}, win}], sources}`。
- `data/inbox.json`：`{v, at, cursor, events:[{id, type(ask/req/vid/tga/ping), t, dev, …}]}`（inbox.py 產生，欄位見 `QA_GUIDE.md`；`vid` 是 `{title, when, note?, games?, url?}`，`url` 只收 YouTube 網址）；`data/qa.json`：`{at, items:[{id, type(ask/req/vid), t, q, ref, st(done/no/wip), at, by, a, pts, src, link}]}`（排程寫；`link` 可以是 `f:`／`p:`／`v:<影片三連發 id>`）。
- `data/videos/<點播 id>.json`：影片三連發 `{id, title, at, updated, by, posts:{pre|up|talk:{post, threads, topic, tags, card?}}, yt:{desc, pin}, sources}`（QA_GUIDE 第 7 節）；`data/videos.json`：`{at, n, items:[{id, title, at, updated}]}`（publish.py 產生，App 靠它知道哪幾支寫好了）。
- `data/platforms.json`：`{v, checked, by, th:{chars, attach, topics, links, notes, src}, ig:{caption, hashtags, bio_links, caption_links, ratio, notes, src}, fb:{link_free, notes, src}, yt:{fan, ads, ads_new:{from,…}, notes, src}, times:{th:{note, src}, other}}`（每週懶人包排程查證）。
- 專題和週報的 `fanpage` 可以多一個 `threads: {post, topic}`（Threads 版，120～300 字、不放 #、一個主題標籤）；所有粉專文字不放網址、不出現「痞子葳」（publish.py 擋）。
- localStorage 前綴 `unpacked.v1.`：`tga`（押注、加倍卡、鎖定時間、偷看過沒）、`ask`（裝置代號、待送、已送、自己的點播、看過的回答）、`freeGot`（領過的免費遊戲）、`freeSeen`、`mkBell`（今天敲過開盤鐘沒）；`settings`（含短影音的 `shAuto` 連播、`shSound` 聲音）、`marks`、`notes`、`thoughts`、`posted`、`edits`、`cmp`、`seen`（專題 `<id>`、推坑 `p:<id>`、短影音 `v:f:<id>`／`v:p:<id>`）、`introDay`、`shHint`、`shWantTip`、`huntSeen`（看過的特價：`appid:價格`）、`huntAlertDay`（獵物出現警報今天跳過了沒）；設定多了 `huntAlert`。粉專的 `posted`、`edits` 也用 `w:<週 id>` 存週報。
- `unpacked.v1.ops`（粉專作戰台）：`{v, since(開始用的那天), cad(發文節奏：th/fb/ig 各 7 格、週日到週六、null＝不發), pin({日期:{平台:{r(內容；'-'＝跳過), at, add}}}), log([{id, ref, pf, d, k(pre/up/talk), at, link, s:{v 觀看, e 互動, f 新粉絲}}]), wk({週 id:{th, ig, fb, yt, ytv, rth, rig, rfb, yth}}), vids([{id, t, at(YYYY-MM-DDTHH:MM), url, note, games, ev(點播 id), made}]), setup(開站任務), prof(個人檔案網址), fbLimit(unknown/yes/no), guide(full/lite), ed({ref|平台: 改過的文字}), vchk(上片清單打勾)}`；內容代號 `f:<專題>`、`w:<週>`、`v:<影片>:<pre|up|talk>`。

## 組建與測試

```bash
python3 _build/apps/unpacked/build.py                    # → apps/unpacked/（不碰 data/）
python3 _build/apps/unpacked/build.py --icons            # 重畫圖示
python3 _build/apps/unpacked/tools/publish.py            # 專題檢查＋重建目錄
# 本機看畫面（雲端沙盒連不到 Steam、YouTube、github.io：外部圖片用假圖代替）
python3 _build/apps/unpacked/build.py --out /tmp/unp && python3 _build/apps/unpacked/tools/testdata.py /tmp/unp/data --hunt   # --hunt：假願望單＋假週報；再加 --noweek 測「本週進行中」
# 新功能的假資料：--board（行情板）、--free（免費補給站）、--ask（點播台問答）、--tgares（TGA 隨機開獎）、--after（寫稿之後：變化、官方公告、回訪改寫）；只寫進 /tmp，絕不 commit
# 舊稿回訪的候選（只讀）：--kind f 專題、--kind p 推坑
python3 _build/apps/unpacked/tools/revisit.py --kind f
# 效能：造一年份的資料再量（--legacy 用舊格式比較）；perf.py 也能量現在的
python3 _build/apps/unpacked/build.py --out /tmp/unp-y1 && python3 _build/apps/unpacked/tools/stress.py /tmp/unp-y1 --days 365
python3 _build/apps/unpacked/tools/perf.py /tmp/unp-y1 --label 一年後
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

## 換新版與開場版本（2026-11-18）
- **回到 App 就換新版**：加到主畫面的 App 切回來不會重新載入（2026-11-18 痞子葳更新後一直看到舊畫面）。`main.js` 最後的 `Fresh`：回到 App（離開超過 2 秒）時抓 `ver.json?t=…`（`cache: 'no-store'`，組建時寫進去的版本），和這一份的 `VERSION` 不一樣就重新載入——剛切回來、沒在打字、沒開著底部抽屜、不在短影音、開場播完才自動換，不然頂端出「有新版本・點一下更新」；一分鐘最多看一次，自動重新載入後 60 秒內不再自動換（網站快取還沒換完不會一直重整）。開著的時候每 10 分鐘也看一次（只出按鈕、不自動換）。`sw.js`：`ver.json` 不經過快取；App 本體用 `cache: 'no-cache'` 跟網站確認（GitHub Pages 讓瀏覽器快取 10 分鐘）。
- **開場版本 `INTRO_REV`**：開場加了新段落時把它加一，更新後第一次打開照樣播完整開場（不用等到明天）；目前是 2（頭條拍上牆）。
- **VS 擂台的入口**：頂端列的「VS」按鈕（每一頁都看得到）、首頁第二張海報後面的「今日對決」（今天最新兩款直接上擂台，`vs.js` 的 `vsStrip`；大螢幕第一張整排、後面兩兩一排，所以對決條排在第二排之後），還有專題／推坑頁的「⚔ VS 對決」與首頁最底下的按鈕。
