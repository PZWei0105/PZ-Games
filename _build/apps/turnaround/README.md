# 轉機 TURNAROUND

痞子葳的轉機航廈（2026-11-17 上線）：每天清晨三班新點子「航班」（小說、遊戲、自由各一）＋一架已完成的舊作品「進廠檢修」。他在 App 裡表態、選航線、核准工單、寫玩後感，這些都會送回塔台，隔天的排程照著調整；檢修學到的教訓經他核准後寫進「飛行手冊」（創作守則），讓之後的作品越做越準。
網址：https://pzwei0105.github.io/PZ-Games/apps/turnaround/
Claude 版：https://claude.ai/artifact/QMXZwgB7viiDsVMFa2prtc（slug `bd1fe71b-9c4b-42c6-b83d-5ae5e22c351d`，已宣告 `{db, user, sample, tts}`）

起因（痞子葳 2026-11-17）：「每天都有創意的主題討論跟創作方向」，而且「除了新的之外，舊的作品依然需要改進跟打磨，這樣往後的作品才能夠越來越知道怎麼去創作」。要跟《解包》一樣超潮、不能只是資訊呈現，但**不要噴漆**，要另一種炫砲的設計。
所以設計語言是「夜間機場」：機場指標黃、Solari 翻牌看板、登機證、安檢 X 光、機庫工單、NOTAM。跟《解包》（塗鴉）、《全知》（全息戰情）、收藏庫（卡匣主機）都不一樣。

## 名詞對照（App 裡也都有白話）

| 機場說法 | 意思 |
|---|---|
| 航班 | 一個新點子（小說 N、遊戲 G、自由 F 三個登機門） |
| 登機／延誤／取消 | 確定想做／方向不錯但時機不對：塔台記住方向、之後換個企劃再提（不囤在畫面上）／換一班（原因只當寫法參考，不封殺題材） |
| 塔台問候 | 照打開的時間：早安／午安／下午好／晚上好／夜深了；最新航班還是昨天的，就說新航班幾點到（`core.js` 的 `towerText`／`announceText`）。稿子本身不寫問候。 |
| 探索航班 | 每天第四班（登機門 X1）：故意飛他沒接觸過的類型；取消不算進口味 |
| 轉機航線 | 這個點子的 2～3 個發展方向 |
| 安檢 X 光 | 紅隊：這個點子最強的反對理由和處置 |
| 起飛前檢查表 | 拿飛行手冊逐條對這個點子 |
| 機庫、進廠、檢修報告 | 一款已完成作品的複盤 |
| 工單：修／磨／減／加 | 除錯／打磨／做減法／加新東西 |
| 簽派放行 | 把核准的工單組成開工指令（複製後貼給 Claude） |
| 機長報告 | 痞子葳的玩後感 |
| 試飛 | 從機庫一點就開那款作品去玩（新視窗） |
| 試飛回報 | 玩完回到轉機自動跳出：每張工單「說中了／說錯了／沒遇到」、儀表自己打分、方向要怎麼調 |
| 複檢 | 隔天排程照試飛回報改那份報告：維持／改寫／撤回／新增，跟原判斷並排 |
| 飛行手冊、NOTAM | 創作守則；NOTAM＝檢修提出、等他核准的新守則 |
| 托運點子 | 他自己丟的粗點子，隔天塔台發展成一班航班 |
| 聯程 | 兩張登機證合體成一個新點子 |

## 畫面

- **開門**：跑道進場燈一路閃過來，「點一下・登機」（iPhone 的聲音和語音要在這一下解鎖）。每天第一次打開有翻牌開場（轉機／TURNAROUND／日期）＋機場三音鈴＋塔台廣播（設定可關）。
- **出發**：機場黃指標牌、塔台的話（可收聽廣播：網頁版用手機內建的中文語音，Claude 版用 Claude 的聲音）、今日進度、翻牌看板（時間、航班號、目的地大字、登機門、狀態燈），最後一列是今天的機庫。下面是到站紀錄（之前每一天）。
- **登機證**（`#f/<id>`）：整張登機證（航班號、登機門、條碼、蓋章）、航程簡介、機上亮點、亂流警告、安檢 X 光（捲到時掃描）、起飛前檢查表（逐條打勾）、轉機航線、同航線與規模；下方「取消／延誤／登機」，登機時蓋章＋飛機從按鈕起飛。「拿去聊」把整張航班整理好複製，貼給 Claude 接著聊（Claude 版是「塔台連線」，直接在頁面裡問 Claude）。
- **機庫**：進廠作品（封面、機號牌、檢修等級、結論章）、檢修單、五個儀表、最大問題、為什麼沒再打開、證據照片、工單（核准／駁回）、簽派放行、這次的 NOTAM、機長報告；下面是機隊（所有作品，點了可「排進下一班進廠」）和檢修紀錄。
- **試飛驗證**（2026-11-17 加）：機庫的進廠卡片整塊就是「▶ 試飛」大按鈕（下面也有一顆「試飛《作品》」），機隊裡每一架的抽屜也有「試飛」。按下去記下 `S.flight`、在新視窗打開作品；回到轉機（切回來或重新打開）而且離開超過 20 秒、6 小時內，就播降落動畫、跳出試飛回報。沒填的話出發和機庫上方會掛「你試飛了《作品》」的綠色提示。回報存在 `S.verify[<報告 id>]`（沒檢修過的作品用 `w:<作品 id>`），工單卡上會貼「你：說中了／說錯了」、儀表多一條黃色刻度（你打的分數），開工指令也會帶上【試飛驗證】一段。報告有 `recheck` 時，上方出現藍色「複檢」欄（維持／改寫／撤回／新增的數量、結論改了沒），每張工單底下標「複檢：維持／改寫／撤回」，改寫的顯示新寫法，撤回的劃掉；儀表標「複檢改成 N」。
- **手冊**：鐵律／個案經驗／待核准統計、NOTAM（認同、不認同）、守則清單（全部、通用、小說、遊戲、App）。
- **機長**：護照式機長卡、取消原因統計（口味）、登機證夾（選兩張申請聯程）、托運點子、設定（音效、背景音樂、開場廣播、特效、塔台連線狀態）。

聲音全部 Web Audio 即時合成：翻牌喀啦聲（限流）、機場三音鈴、蓋章、掃描器嗶聲、起飛呼嘯、撕紙、電傳打字聲；背景是候機室的慢氛圍（四個和弦循環＋鐘琴），廣播時自動壓低。
手機記憶體：不用 filter／backdrop-filter／模糊陰影；動畫只動 transform、opacity；特效畫布裝置像素比上限 2，飛完就清掉；跑道動畫只在開門畫面跑。

## 資料（`apps/turnaround/data/`，`build.py` 不碰）

- `days/<YYYY-MM-DD>.json`：每天一份，由每日排程寫（規範在 `INSPECTOR_GUIDE.md`）。
  `{date, made_at, tower, announce, flights:[3], inspection}`
  - 航班：`{id, lane(novel|game|free|explore；探索最多一班), no, time, gate, dest(三個大寫字母), zh(≤6 字), en, kind, hook, pitch, fun[], fail, xray{threat, verdict(clear|open|deny), fix}, checks[{rule(手冊 id 或 null), text?, ok(pass|warn|fail), note}], routes[{id, name, line, trade}], like[], scope, seed}`
  - 複檢（寫回原報告）：`inspection.recheck = {date, note, items{id: {status(kept|revised|withdrawn), note, title?, detail?}}, vitals{名稱: {now(1~5), note}}, verdict?, added[工單]}`；複檢那天的 day 檔加 `rechecks: [{insp, date(原日期), work, summary}]`（看板多一列「複檢」）。規則在 `INSPECTOR_GUIDE.md` 第 4.5 節。
  - 檢修：`{id, work(fleet id), check, check_note, summary, method[], shots[{src, cap}], vitals[{k, v(1~5), note}], core, worst, why_not, items[{id, kind(fix|polish|cut|add), title, detail, worth(high|mid|low), effort(S|M|L), evidence}], verdict(airworthy|service|overhaul|retire), verdict_note, notams[{id(n-XXXX), scope, kind, title, rule, applies?, from}], order}`
- `shots/`：檢修的證據照（WebP，每張 60 KB 內）。
- `fleet.json`：機隊（`tools/fleet.py` 從收藏庫總表產生；機號 B-PZ###／B-PA## 不會變；`skip` 是不在機庫範圍的理由；`inspections` 由 publish.py 記）。
- `manual.json`：飛行手冊 `{rules:[{id, scope(all|novel|game|app|inspect〔檢修守則〕), kind(law|case), status(official|proposed), by, date, title, rule, applies?, from}]}`。
- `index.json`：目錄（publish.py 產生）。
- `inbox.json`：塔台收件（GitHub Actions 寫）。

## 塔台同步

- 網頁版：每個動作是一筆事件 `{id: <裝置>-<序號>, t, type, …}`，先存在本機（`localStorage` 的 `turnaround.v1.state`，`out` 是還沒確認的），2.5 秒後送到轉發站 `https://ntfy.sh/pz-turnaround-b53ef251972dad327450`（`no-cors` POST，訊息保留約 12 小時；主題寫在公開的程式裡，不是祕密，所以收件端一律當成不可信資料）。
- GitHub Actions `.github/workflows/turnaround-inbox.yml` 每小時跑 `tools/inbox.py`：收白名單事件、截長度、寫進 `data/inbox.json`。App 每 5 分鐘和每次切回來時讀 `inbox.json`，看到自己的事件就從 `out` 移掉（右上角「塔台」燈：綠＝都收到、黃＝待送、紅＝送不出去）。超過 3 小時沒被確認的事件會重送（收件端用 id 去重）。
- 送不出去時，「機長」頁可以複製還沒送達的紀錄，貼給 Claude 收進 `inbox.json`。
- 事件類型：`vote`（board／delay／cancel／none＋reasons、note）、`route`、`talk`、`item`（approve／reject／none）、`dispatch`、`pirep`、`notam`（agree／disagree／none）、`queue`（on／off）、`idea`、`merge`、`flight`（按了試飛：work、insp）、`verify`（試飛回報：insp、work、items{id: hit／miss／na}、notes{id: 文字}、vitals{儀表名: 1～5}、overall[]、text、mins）、`ping`（測試）。
- Claude 版：整份狀態存在 artifact 的 db `state/main`（`{state: JSON 字串, at, out}`，規則只有擁有者能讀寫）；排程可以用 `db_get` 讀。

## 組建與測試

```bash
python3 _build/apps/turnaround/tools/fleet.py                 # 收藏庫有新作品時更新機隊
python3 _build/apps/turnaround/tools/publish.py               # 檢查每一天＋重建 index、手冊、機隊（BAD 不准推）
python3 _build/apps/turnaround/build.py                       # 網頁版 → apps/turnaround/
python3 _build/apps/turnaround/build.py --claude-out /tmp/ta-claude   # Claude 版（內嵌最近 7 天的資料、證據照、進廠作品封面）
python3 _build/apps/turnaround/build.py --icons               # 重畫圖示
```
網址加 `?enter=1` 跳過開門畫面（測試用）。本機測試：在 repo 根目錄開一個靜態伺服器，用 Playwright 開 `apps/turnaround/index.html?enter=1`；外部網址（轉發站）在沙盒裡會被擋，console 會有一筆 ERR_FAILED，正常。
Claude 版發布：`build.py --claude-out` 後把檔案複製到工作資料夾，用 `publish_files`（slug 見最上面，先拿 `base_version`）；能力已宣告，不用重宣告。

## 排程

Claude 的排程任務「轉機：每日開題與檢修」，每天台灣時間清晨跑，照 `INSPECTOR_GUIDE.md` 寫當天的 `days/*.json`、推上 GitHub、更新 Claude 版，最後推播一句話給痞子葳。
