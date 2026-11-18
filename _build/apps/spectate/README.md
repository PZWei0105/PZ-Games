# 觀戰 SPECTATE

痞子葳的遊戲轉播台（2026-11-18 上線）：只有遊戲的 YouTube。預告、直播、評測、實況、攻略、新聞、深度，中文為主。
網址：https://pzwei0105.github.io/PZ-Games/apps/spectate/

起因（痞子葳 2026-11-18）：家裡電視接的 YouTube Premium 大家一起用、看到什麼就訂什麼，很雜；演算法又一直推點過的同類內容，容易變成資訊繭房。
他要的是「一個專屬遊戲頻道影片內容的 App」：以我們挑選的頻道為主、**跟電視上的帳號訂閱分開**，但也要能發現沒看過、YouTube 沒推薦過的好頻道。
語言「全收，但盡量以中文為主，或是有中文字幕」；手機為主、筆電為輔；要跟《解包》一樣聲光拉滿，**但不能做成《解包》的樣子**。

## 設計語言：電競賽事轉播

跟《解包》（塗鴉噴漆）、《轉機》（夜間機場）、《全知》（全息戰情）、收藏庫（卡匣主機）都不一樣：
- 黑底＋直播紅（`--red`）、斜切字卡（skewX）、比分條式台標（觀戰｜SPECTATE｜時鐘）、跑馬燈、Lower third 字卡、焦點輪播。
- 導播台用真的轉播術語：PGM（正在播，紅框）、PVW（預覽，綠框）、TAKE（切換）、AUTO（連播）。
- 開場是攝影機觀景窗（CAM 01／REC／STANDBY）→ 3、2、1 倒數 → ON AIR →（2026-11-18 起）「今晚節目單」對戰卡：24 小時新片、其中中文、你的頻道新片（還沒選台時是新預告），三款今晚最多台在聊的焦點遊戲一張張砸進來（`quest.js` 的 `playMatchCard`，全部是資料裡的真實數字，點一下略過）→ 三條斜帶的 Stinger 轉場。
- 新秀是「選秀會」：一張張選秀卡，右滑選進來（蓋章＋火花）、左滑跳過。
- 字型：Teko（數字、英文標籤）、Chakra Petch（小英文）；中文用系統粗體。
- 聲音全部 Web Audio 合成（`sound.js`）：Stinger、TAKE、倒數嗶聲、開播鈴、簽約（訂閱）、跳過、跑馬燈；背景是 A 小調 118 BPM 的賽前配樂，**影片一播放就自動停**，關掉導播台再回來。
- 手機記憶體：不用 filter／backdrop-filter／模糊陰影；動畫只動 transform、opacity；火花畫布用完就拿掉。`[hidden]` 一定要 `display:none !important`（不然 `#pgm` 這種有 `display:flex` 的層會蓋住整頁吃掉點擊）。

## 畫面（`#` 分頁）

| 路由 | 內容 |
|---|---|
| `home` 轉播台 | 焦點輪播（中文預告優先）、直播中、你的頻道新片（還沒選台時播精選名單＋「先選台」提示）、新預告、黑馬、熱門遊戲、新秀試吃、繼續觀看、稍後觀看、評測、深度、攻略、實況、新聞；這週太集中在同三台時出現「破圈」提示 |
| `live` 直播 | 直播中、賽程表（即將直播／首播）、剛結束的重播、直播重播與發表會（沒金鑰時用標題判斷） |
| `games`、`g/<key>` 遊戲 | 同一款遊戲的所有影片：預告、評測、攻略、實況、新聞、深度；「誰在聊這款」可以直接訂閱（從遊戲找人）；有 Steam 的連 Steam、《解包》有專題的連過去 |
| `rookies` 新秀 | 選秀會（全網探勘＋精選名單裡還沒選的，每天換一批）、精選名單（分四組，可整組訂閱）、跳過的 |
| `me` 我的（破圈任務） | 觀戰數據（這週小時數、看了幾台、破圈度儀表）、我的頻道、貼網址新增頻道、稍後觀看、繼續觀看、觀戰紀錄、封鎖、設定、轉播狀態 |
| `pick` 選台 | 第一次用的選台頁 |
| `ch/<UC…>` | 頻道頁 |
| `list/<種類>` | 看全部（subs、pool、trailer、review、guide、play、news、deep、dark、later、cont、hist），可篩車道和語言 |
| `key` | YouTube 金鑰設定教學 |
| `watch/<影片 id>` | 開導播台（蓋在目前的頁面上；關掉就回原頁） |

網址加 `?skip=1` 跳過開場；`?data=<網址>&main=<網址>` 改讀別處的資料（測試用）。

## 破圈任務（2026-11-18，`quest.js`）

痞子葳做觀戰的起因就是不想被綁在同幾台，所以任務全部在鼓勵「看沒看過的」。每天三個（照日期決定，同一天都一樣）：破圈組（新秀試鏡：沒訂閱的頻道滿 2 分鐘／沒看過的遊戲：以前沒看過的遊戲滿 2 分鐘／換台三連：3 個頻道各 1 分鐘）、深度組（深度時間：深度或評測滿 3 分鐘／看到最後：看完一支）、輕鬆組（預告巡禮：3 支預告各 30 秒／情報員：2 支新聞或節目各 1 分鐘）。
進度只看這台裝置的 `hist`、`wt`；看完片關掉導播台、打開 App 時檢查（`questCheck`），新完成的跳字卡＋火花。每個 100 XP、三個全完成再 100；等級：見習觀眾→場邊觀眾→轉播助理→現場導播→主播→總導播→傳奇評論席（300／900／1800／3000／4500／6300 XP）；連續天數＝三個都完成的連續天數（今天還沒做完不算斷）。存在 `spectate.v1.quest`（`{xp, days}`，留 60 天）。首頁有一條進度（`questStripHtml`），我的有完整卡片（`questPanelHtml`）。**不拿任務紀錄推片**。

## 資料

### 管線：`.github/workflows/spectate-feed.yml`（每 20 分鐘，第 7、27、47 分）

`tools/pipeline.py`：
1. **轉發站收件**：App 把訂閱／取消／封鎖／跳過／新增頻道／稍後觀看送到 `https://ntfy.sh/pz-spectate-e4431fca8fc4498df14a`（no-cors POST，`{v:1, dev, evs:[…]}`），管線收白名單事件寫進 `apps/spectate/data/me.json`（main 分支）。主題在公開程式裡，所以收件一律當不可信資料（頻道 ID、影片 ID 格式檢查、截長度）。
2. **頻道解析**：`apps/spectate/data/channels.json`（手寫的精選名單，目前 80 台、52 台中文；優先寫 `id`（UC 開頭的頻道 ID），沒有 ID 才寫 `try` 要試的 @代號）→ `roster.json`（main 分支）。同名頻道換了 ID，會自動換掉舊的。沒金鑰時讀頻道頁的 canonical 連結；有金鑰用 `channels.list?forHandle=`。解析失敗的一天重試一次（記在 cache 的 `tries`）。名單上拿掉的頻道，下一次執行會從精選移除。
3. **RSS**：YouTube 官方的 `feeds/videos.xml?channel_id=`（不用金鑰，最新 15 支＋觀看數）。抓的是精選＋訂閱＋新增＋這兩週的新秀候選；封鎖的不抓。
4. **整理**：Shorts（RSS 連結是 `/shorts/` 就是；其他用 `youtube.com/shorts/<id>` 是否直接打得開判斷）、簡體標題轉繁體（OpenCC s2twp，原標題留在 `t0`）、語言、車道（`ytextract.lane_of`，官方頻道只分預告／新聞）、遊戲名稱（書名號、英文「名稱 - Trailer」、別名表）→ Steam 搜尋對成同一款（`s<appid>`，一次最多 45 次查詢，查不到的記 14 天），沒上 Steam 但兩台以上都在聊的用 `n:<名稱>`。
5. **有金鑰（Actions 密碼 `YT_KEY`）才做**：`videos.list`（片長、直播中／即將直播、同時觀看、分類、官方給的中文標題 `tz`、觀看數）、頻道訂閱數（每天）、**新秀探勘**（每天台灣時間 5 點後一次：熱門遊戲 4 個＋類型輪替 3 個＋黑馬 2 個搜尋，`relevanceLanguage=zh-Hant`、`regionCode=TW`、遊戲分類；濾掉搬運、兌換碼、抽卡、Shorts 頻道；選 5 位）。一天大約 2,000～3,000 點（免費額度 1 萬）。
6. **輸出**：`feed.json`、`games.json`、`discover.json`、`status.json`、`cache.json` 推到 **`spectate-data` 分支**（每次強制推送、只留最新一版，repo 不會越長越大、也不會每 20 分鐘觸發一次 Pages）。App 從 `raw.githubusercontent.com/PZWei0105/PZ-Games/spectate-data/` 讀。

`status.json` 有 `log`（這次執行的紀錄）、`errors`、`quiet`（精選名單裡 30 天沒更新的頻道）、`unresolved`（解析不到的名單）——**維護時先看這個**，再決定名單要不要換人。

### 欄位

- `feed.json`：`{at, key, ch:{UC…:{n 名稱, a 頭像, l 語言, k 類型, tags, seed 精選, cand 新秀候選, subs, ds}}, items:[{i, c, t 標題, t0 原標題, tz 官方中文標題, p 發布秒, v 觀看, d 片長, l 車道, g 遊戲, z 語言, s Shorts, x 濾掉, lv live/upcoming, st 開播秒, cv 同時觀看, rp 重播, dh 黑馬倍數}], games:{key:{zh, en, id, img}}}`
- `games.json`：`{games:[{k, zh, en, id, img, n, chs, lanes, hot, last, cover, gacha}]}`
- `discover.json`：`{day, key, picks:[{c, n, a, subs, vids, country, ds, why[], ratio, score, sample:{i,t,p,v,d}, day}]}`
- `me.json`：`{subs:{UC:{t,n,src}}, blocks, passes, later:{影片:t}, adds:[{id,q,t,st:wait/ok/fail,ch,n}], seen:[事件 id], cursor}`

### App 這邊（localStorage 前綴 `spectate.v1.`）

`set` 設定、`dev` 裝置代號、`seq` 事件序號、`out` 還沒被管線確認的事件、`base` 上一份 me.json、`hist`（影片：[最後看、看到第幾秒、片長、看完、累積毫秒、頻道]，最多 900 支）、`wt`（每天每台看了幾毫秒，留 35 天）、`visit`、`boot`、`picked`。
畫面上的訂閱狀態＝`base`＋還沒確認的 `out`（同一套 `applyEv`）；看到 me.json 的 `seen` 有自己的事件就從 `out` 移掉，3 小時沒確認的會重送。右上角燈號：綠＝都同步、黃＝等管線收件、紅＝送不出去。

## 播放

- 用 YouTube 官方 IFrame 播放器（`youtube.com/embed`，不是 nocookie）：瀏覽器登入了 Premium 就沒有廣告。iPhone 的 Safari 擋第三方 cookie，所以 iPhone 可能還是會有廣告——設定「點影片時：交給 YouTube App」就直接開 YouTube App。
- 外語片會嘗試自動開中文字幕（`cc_lang_pref=zh-Hant`，再用字幕清單挑 zh-Hant／zh-TW／zh）。
- 不能嵌入的影片（錯誤 101／150，常見於有年齡限制的預告）會顯示「這支要到 YouTube 看」。
- 看過的進度存在這台裝置，下次從上次停的地方接著播；看超過 90% 算看完（REPLAY）。

## 組建與測試

```bash
python3 _build/apps/spectate/build.py               # 網頁版 → apps/spectate/（不碰 data/）
python3 _build/apps/spectate/build.py --icons       # 重畫圖示
python3 _build/apps/spectate/tests/test_extract.py  # 車道、遊戲名稱、語言判斷
python3 _build/apps/spectate/tests/offline_test.py  # 管線離線測試（假 RSS、假頻道頁、假轉發站）
python3 _build/apps/spectate/tests/shoot.py --data <資料夾> --out /tmp/spshots   # 手機直、橫、電腦截圖＋導播台流程（縮圖換色塊、播放器換假的）
```
沙盒連不到 YouTube／raw.githubusercontent.com：拿真資料測試時，用 `gh api "repos/PZWei0105/PZ-Games/contents/feed.json?ref=spectate-data" -H "Accept: application/vnd.github.raw"` 抓下來放進 `--data` 的資料夾。

沒有 Claude 版：artifact 不能嵌別的網站的 iframe（YouTube 播放器）、圖片要內嵌、也讀不到每 20 分鐘更新的資料（同《解包》《全知》）。

## 維護時注意

- **中文優先**是核心：焦點先排中文預告；同一台 3 小時內的多語版本、同一款遊戲 3 天內的預告，有中文版就收掉外文版（設定可關）。
- 不要做成「看你點過什麼就推什麼」：新秀和黑馬都不看痞子葳的觀看紀錄，觀看紀錄只用來標 REPLAY、續播和破圈度。
- 精選名單換人：改 `apps/spectate/data/channels.json`，推上去會觸發管線（push 路徑過濾）。先看 `status.json` 的 `quiet`、`unresolved`。找新的中文頻道：手動跑 Actions 的 `spectate-research`（輸入關鍵字，用逗號分開），結果在 `spectate-research` 分支的 `research.json`（頻道 ID、名稱、最近更新、觀看數）。
- 分類規則（車道、遊戲名稱）改了：把 `pipeline.py` 的 `CLS_VER` 加一，下一次執行會把影片庫全部重新判斷（Steam 結果有快取，不多花額度）。
- 截圖檢查時記得 `?skip=1` 跳過開場。
- **每週維護排程**（週二晚上 20:17，台灣時間）：巡檢後台與分類、手機直拿／橫拿／電腦三種畫面親眼看、精選名單換血（封鎖的、60 天沒更新的下架；用 `spectate-research` 找合格的中文新頻道，每週最多 5 台，紀錄在 ROADMAP 的「名單換血紀錄」），真加分才加功能。`me.json` 裡痞子葳的封鎖、跳過會被尊重：封鎖的下架、跳過的不再當新人推。

## 換新版與開場版本（2026-11-18）
- **回到 App 就換新版**：加到主畫面的 App 切回來不會重新載入（2026-11-18 痞子葳更新後一直看到舊畫面）。`main.js` 最後的 `Fresh`：回到 App（離開超過 2 秒）時抓 `ver.json?t=…`（`cache: 'no-store'`，組建時寫進去的版本），和這一份的 `BUILD（每次組建不一樣；VERSION 是給人看的版號）` 不一樣就重新載入——剛切回來、沒在打字、導播台（播放器）沒開著才自動換，不然頂端出「有新版本・點一下更新」；一分鐘最多看一次，自動重新載入後 60 秒內不再自動換（網站快取還沒換完不會一直重整）。開著的時候每 10 分鐘也看一次（只出按鈕、不自動換）。`sw.js`：`ver.json` 不經過快取；App 本體用 `cache: 'no-cache'` 跟網站確認（GitHub Pages 讓瀏覽器快取 10 分鐘）。
- **開場版本 `INTRO_REV`**：開場加了新段落時把它加一，更新後第一次打開照樣播完整開場（不用等到明天）；目前是 2（今晚節目單）。
