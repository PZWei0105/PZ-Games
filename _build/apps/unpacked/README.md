# 解包 UNPACKED

痞子葳的遊戲解包台（2026-11-16 上線）：每天清晨自動解包 2～3 款遊戲的深度專題，附預告、截圖、Steam 台灣區即時數據；另一個分頁是「遊戲狂想曲」粉專出稿台（貼文、三個標題、塗鴉圖卡、60 秒口播稿）。
網址：https://pzwei0105.github.io/PZ-Games/apps/unpacked/

起因：痞子葳看到 TGP 玩家口袋的 FB 遊戲介紹貼文，想要一個 App「主動抓取並寫成一篇篇遊戲詳細介紹」。他要求：主頁自己看、要詳盡、要有討論，像《玩真的》一樣附影片與圖片預覽，**而且要比玩真的更強、更全面**；粉專分頁照 Claude 建議的格式。全部收（大作、獨立、免費、平台獨佔），**手機遊戲一律排除**（他不喜歡什麼都得課金才能解鎖的遊戲）；每天 2～3 篇深度專題。視覺要呼應頻道的噴漆塗鴉風、聲光效果拉滿。

## 三個部分

| 部分 | 誰做 | 在哪 |
|---|---|---|
| 推坑（已上市、不分新舊的私房推薦） | 每日推坑排程（Claude 的排程任務「解包：每日推坑」，每天台灣時間 11:43，寫完推播） | `apps/unpacked/data/picks/<id>.json`，規範在 `PICKS_GUIDE.md`；publish.py 產生 `data/picks.json` |
| 專題（深度介紹＋粉專稿） | 每日寫稿排程（Claude 的排程任務「解包：每日寫稿」，每天台灣時間 05:23，寫完推播到痞子葳手機） | `apps/unpacked/data/features/<id>.json`，規範在 `WRITER_GUIDE.md` |
| Steam 即時資料與選題候選 | GitHub Actions `.github/workflows/unpacked-live.yml`，每小時＋track.json 一變就跑 | `tools/live.py` → `data/live.json`、`data/hist/<appid>.json`、`data/candidates.json` |
| App 本體 | 這個資料夾的 `src/`，`build.py` 組成單一 index.html | `apps/unpacked/`（`build.py` 不碰 `data/`） |

上架工具 `tools/publish.py`：檢查每篇專題（格式、來源、簡體字、農場用語、貼文長度…），重建 `data/index.json`（目錄）和 `data/track.json`（要追蹤的 Steam appid）。**BAD 不准推。**

## 畫面

- **今日**：塗鴉牆上一張張海報（撕紙、膠帶、紅色印章結論「推薦／觀望／不推薦」；第一次進來海報一張張拍上牆）。捲到哪張、哪張就動起來：Steam 遊戲播動態預告（靜音循環，一次只播一支），其他遊戲輪播官方截圖與預告畫面；動起來的那張陰影變粉紅。追蹤牆便利貼（上市倒數、同上變化、特價、近期評價轉向，全部從即時資料自動長出來）、之前解包。
- **專題頁**：開啟時有「解包中」轉場（終端機逐行解包 `/資訊 /影像 /玩法…`）。主視覺、情境開場、三秒結論（捲到時印章砸下）、黏性檔案分頁籤。
  - 主視覺：Steam 遊戲直接播動態預告，其他遊戲是官方截圖＋預告畫面的 Ken Burns 輪播（慢慢推近、交叉淡入）。標題下方「一眼看懂」六格：上市倒數、台灣售價、平台、中文、課金、你的 SCAR 18。各段標題捲到時噴漆噴出來。
  - `/資訊`：資訊卡（每條可點開看來源；粉紅問號＝待確認）、Steam 即時數據（台灣售價與史低、同上與 7 天曲線、評價與近期好評率、繁中玩家評價、語言；捲到時數字跳上來、曲線畫出來）、課金雷達（0～4 格）、中文與台灣能不能玩、你的 SCAR 18、遊玩時間、接下來盯這些。
  - `/影像`：YouTube 官方預告（點了才載入）＋ Steam 預告（HLS：iPhone／Android 直接播，電腦用 `vendor/hls.light.min.mjs`）、相簿燈箱（可滑）：Steam 截圖＋專題附的官方圖＋每支 YouTube 預告自動截的 3 張畫面（maxres1～3，沒有就退回 hq，再沒有就拿掉），最多 18 張。
  - `/玩法` 循環貼紙＋拆解、你的第一個小時、跟誰像；`/劇情`（有雷的要「撕開」才看）；`/幕後`＋時間軸；`/風向`；`/討論`（每題可寫自己的想法）＋我的標記（想玩／在玩／玩過／沒興趣）＋筆記；`/來源`＋待確認。
  - 語音導讀（speechSynthesis，zh-TW）。
- **推坑**：Claude 的私房推薦牆，不分新舊、已經上市、查過評價又合痞子葳口味的遊戲，每天加 2～3 款。卡片有年份大字、推坑章（必玩／閉眼入／特價入／冷門神作）、即時價格與特價、繁中、時長、Steam 評價；篩選有繁中、特價中、15 小時內、40 小時以上、我想玩。第一次進來卡片一張張蓋章拍上牆，捲到的那張播動態預告或輪播。分頁上的數字是最新一批還沒打開的推坑。
  - 推坑頁：「挖寶中」轉場、動態主視覺、一眼看懂（上市年份、售價、平台、中文、時長、SCAR 18）、**推坑信**（Claude 第一人稱，捲到時推坑章砸下）、三個推坑理由、評價（Metacritic／OpenCritic＋Steam 與繁中即時評價）、適合你／先別買、怎麼玩最好玩、怎麼買最划算、影像相簿、資訊卡、玩完可以聊、我的標記與筆記、來源。
  - 首頁「今日推坑」一排小卡；跑馬燈也會念今日推坑。
- **庫存**：搜尋、結論／平台／類型／中文／課金／我的標記篩選、排序，最多 3 款加入比較（比較表）。
- **粉專**：每篇的出稿台（稿子如果是前幾天寫的、又有「倒數幾天」這類會過期的字，上方會提醒先改）。塗鴉圖卡產生器（版型 A 黃牆撕紙框、B 黑牆大圖；4:5／1:1；重噴換濺漆與截圖；下載 PNG、手機可直接分享）、可編輯的貼文（只存這台裝置）、三個標題、hashtag、口播稿、素材標註、標記已發佈（分頁上的數字是還沒發的篇數）。

## 聲光

- 開門畫面「點我・聲光全開」（iPhone 的 AudioContext 必須在點擊當下建立；`navigator.audioSession.type='playback'` 讓靜音鍵打開也有聲音）。
- 開場：每天第一次完整版（搖罐→噴漆罐真的把「解包」噴上牆→實心字砸下＋重低音＋濺漆＋閃光＋放射線→滴漆→UNPACKED 貼紙→膠帶跑馬燈，約 3.6 秒，點一下跳過），其他時候短版；設定可改。
- 音效全部 Web Audio 即時合成（搖罐、噴漆嘶聲、拍貼紙、蓋章、重低音、刷碟、撕紙、鈴鐺、打字聲）；背景 boom-bap 鼓組（92 BPM，帶搖擺、貝斯、和弦、刷碟、黑膠沙沙聲），看預告與語音導讀時自動靜下來。
- 底線（照頻道的塗鴉規則）：大衝擊（震動＋閃光）一個畫面最多 2～3 次、閃光每秒不超過 3 次、字永遠清楚。設定「特效：收斂」或系統「減少動態效果」時不震動不閃光。
- 手機記憶體：不用 filter／backdrop-filter／mix-blend-mode／模糊陰影；動畫只動 transform 和 opacity；噴濺粒子畫在一張全螢幕畫布上（裝置像素比上限 2，最多 260 顆，沒有粒子就停）。動態預告整個 App 同時最多兩支（主視覺一支、首頁一支，換頁就收掉），App 切到背景就暫停；「特效：收斂」或「減少動態效果」時不播動態預告、不輪播。
- 動態預告來源：Steam 的 microtrailer（`live.json` 的 `micro`，mp4 給 iPhone、webm 給沒有 H.264 的瀏覽器）。

## 粉專圖卡

`src/card.js`。1080×1350（4:5）或 1080×1080。先量好標題、副標、標籤、重點紙條的高度，再決定放幾條重點、圖多高（字一定要清楚，放不下就少放一條）。
遊戲圖要能畫進畫布再匯出：先直接載（`crossOrigin=anonymous`），不行就走 `images.weserv.nl` 圖片代理，再不行就只畫塗鴉底（不會讓畫布變成無法匯出）。

## 資料格式

- `data/index.json`：`{at, n, items:[{id,date,rank,kind,kind_label,zh,en,steam,platforms,genres,release,price_text,headline,stamp,label,money,zhs,tw,yt,img,gal,updated}]}`（publish.py 產生；`img` 是 `media.images` 第一張，`gal` 是第 2～6 張，首頁海報輪播用）。
- `data/features/<id>.json`：見 `WRITER_GUIDE.md` 第 3、4 節；範例 `rob-run`、`gta-vi`、`unhinged`。
- `data/picks/<id>.json`：見 `PICKS_GUIDE.md` 第 3 節；範例 `balatro`、`octopath-traveler-2`、`xcom-2`。`data/picks.json`：`{at, n, items:[{id,date,rank,zh,en,steam,year,release,genres,platforms,stamp,label,pitch,zhs,hours,price_text,money,yt,img,gal,updated}]}`（publish.py 產生）。
- `data/candidates.json` 另有 `gems`（Steam 評價最高的遊戲）、`gems_sale`（評價最高又正在特價），推坑選題用；`picked: true` 是推過的。
- `data/live.json`：`{at, apps:{appid:{name,free,price{final,orig,disc,fmt,low},rv{n,pct,label,recent},rv_tc,players{n,at,peak,d24},rel,langs{tc,sc},tags,img{hero,header,wide,box},shots[],micro,trailers[{hls,mp4,poster,name}],…}}}`；價格單位是「分」（NT$ × 100）。
- `data/hist/<appid>.json`：`pl` 同上 `[分鐘時間戳, 人數]`、`pr` 價格（有變才記）、`rv`／`rt` 全球與繁中評價 `[時間, 好評數, 總數]`（一天一筆）。
- localStorage 前綴 `unpacked.v1.`：`settings`、`marks`、`notes`、`thoughts`、`posted`、`edits`、`cmp`、`seen`、`introDay`。

## 組建與測試

```bash
python3 _build/apps/unpacked/build.py                    # → apps/unpacked/（不碰 data/）
python3 _build/apps/unpacked/build.py --icons            # 重畫圖示
python3 _build/apps/unpacked/tools/publish.py            # 專題檢查＋重建目錄
# 本機看畫面（雲端沙盒連不到 Steam、YouTube、github.io：外部圖片用假圖代替）
python3 _build/apps/unpacked/build.py --out /tmp/unp && python3 _build/apps/unpacked/tools/testdata.py /tmp/unp/data
python3 _build/apps/unpacked/tools/shoot.py /tmp/shots /tmp/unp phone '[{"wait":4800},{"shot":"home"},{"go":"#f/rob-run","ms":2500},{"shot":"feat"}]'
```
`shoot.py` 的畫面：`phone`（390×844 @3）、`land`（844×390 @3）、`desk`（1440×900）；步驟支援 wait、go、click、eval、scroll、shot、savecanvas（把圖卡存成 PNG）。
網址加 `?enter=1` 會自動跳過開門畫面（測試用）；不是正式網址時可用 `?data=` 指定資料資料夾。

沒有 Claude 版：artifact 沙盒連不到 pzwei0105.github.io，讀不到每天更新的專題與 Steam 資料（和《全知》《下回分解》一樣）。
