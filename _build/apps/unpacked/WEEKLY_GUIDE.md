# 解包 UNPACKED — 每週懶人包指南

每週日晚上的排程（Claude 排程任務「解包：每週懶人包」，台灣時間週日 19:43）照這份做：**結算這一週 → 研究本週大事和下週上市 → 寫週報＋粉專稿 → 獨立查核 → 上架**。
App 會把週報做成遊戲的「本週結算」畫面（WEEK 數字砸下、結算條、MVP、Tier 表、本週大事、下週出擊、特價戰利品、數據王），粉專出稿台另外有封面、Tier 表、下週出擊三張圖卡，適合發成一則多圖貼文。
讀者只有痞子葳（台灣、PC 玩家、經營遊戲頻道「遊戲狂想曲」和它的粉專）。所有內容一律**繁體中文、台灣用語**；稱呼他「痞子葳」。粉專稿是給粉絲看的，不要出現「痞子葳」這個名字。

---

## 0. 準備

1. 用 add_repo 加 `PZWei0105/PZ-Games`（要 push 權限），照工具說明 clone 到 `/home/claude/pz-games`，再用 register_repo_root 登記。
2. 「這一週」＝今天（台灣日期）所在的 ISO 週，週一到週日；`id` 是 `YYYY-Www`（例：`2026-W47`）。用 `python3 -c "import datetime as d; t=d.date.today(); print(t.isocalendar())"` 算（注意台灣時間）。
3. 讀這幾個檔（全部在 `apps/unpacked/data/`）：
   - `index.json`、`picks.json`：這一週（`date` 在週一到週日之間）的專題和推坑——**每一款都要排進 Tier 表**（願望單解包 `kind: wish` 也是專題，一樣要排）；再打開 `features/<id>.json`、`picks/<id>.json` 看結論、評價、風向。
   - `weekly.json`、`weekly/`：之前的週報（語氣、格式照它，不要重複上週的新聞）。
   - `live.json`：Steam 即時數據（同上、評價、特價）。`wish.json`：痞子葳的 Steam 願望單和特價（`p` 是 [現價, 原價, 折扣]，單位「分」＝NT$×100；`sale.end` 是特價結束時間）。`candidates.json`：熱門與即將推出的候選，`mine: true` 是在他願望單上的。
4. 只能新增或修改 `apps/unpacked/data/weekly/`、`weekly.json`，和第 8 節的 `platforms.json`。其他一律不動（專題、推坑、live／wish／hist／candidates、App 本體）。

## 1. 要寫什麼

| 欄位 | 內容 |
|---|---|
| `title` | 這一週一句話（10～32 字），像遊戲結算畫面的標題：抓本週最有感的一兩件事。 |
| `intro` | 80～220 字，Claude 第一人稱、像主持人開場：這週的主線是什麼、哪款最值得、有什麼要小心。 |
| `mvp` | `{ref, why}`：本週 MVP（從這一週的專題／推坑挑一款；`ref` 是 `f:<專題 id>` 或 `p:<推坑 id>`），`why` 40～160 字講為什麼是它。 |
| `tiers` | 這一週**每一款**專題和推坑都要排：`{ref, tier, line}`。`tier` 是 S／A／B／C／D（S＝這週最值得花時間、A＝很值得、B＝看口味、C＝先觀望、D＝先跳過）。排的依據是「痞子葳值不值得花時間玩或關注」：專題結論、評價、風向、價格、中文都要考慮；結論「不推薦」的通常在 C、D。`line` 8～40 字，講排在這一級的理由，不要只是重複名字。 |
| `news` | 本週大事 3～5 則 `{h, t, s}`：PC／主機遊戲圈這一週最重要的新聞（發表、延期、評測解禁、平台政策、Steam 活動、收購、爭議）。`h` ≤ 22 字、`t` 2～3 句，講清楚發生什麼、對玩家有什麼影響。手遊、抽卡新聞不收。已經在這週專題裡講過的不要再列，除非又有新發展。 |
| `next` | 下週出擊 2～8 款 `{d, name, t, s, ref?, steam?}`：下週（週一到週日）要上市的 PC／主機遊戲、大型更新、免費週末、重要活動。`d` 用官方公布的日期 `YYYY-MM-DD`（日期還沒定就不要列）；`t` ≤ 26 字（平台、價格、中文這類重點）；寫過專題的加 `ref`；在 Steam 上的填 `steam`（appid 數字）：沒解包過的那幾款，App 點進去會打開情報卡（Steam 介紹、截圖、評價）；沒填的由資料管線照名字去 Steam 對 |
| `deals` | 選填，1～2 句：這週和下週跟買遊戲有關的重點（Steam 季節特賣、免費領、願望單上值得出手的）。只寫有官方來源的。 |
| `fanpage` | 粉專稿，見第 3 節。 |
| `sources` | 至少 6 個：`news`、`next`、`deals` 用到的每一個事實都要對應來源（`s` 填來源編號）。 |

`date` 是寫稿日（通常就是週日），`updated` 是現在的 UTC 時間（`YYYY-MM-DDTHH:MM:SSZ`）。

**這一週如果一篇專題、推坑都沒有**（例如排程整週失敗）：`mvp` 填 `null`、`tiers` 填 `[]`，其他照寫。

## 2. 研究

- 本週大事：WebSearch 查這一週的遊戲新聞，國外媒體和台灣媒體都看；一定要回到官方來源（開發商、發行商、Steam、PlayStation、Xbox、Nintendo 的公告）確認日期和數字。
- 下週出擊：查官方商店頁或官方公告的上市日期、平台、台灣售價、中文。查不到就不要列，不准猜。
- 每個數字、日期、價格都要有來源；不抄來源原文。

## 3. 粉專稿（`fanpage`）

- `post`：300～650 字，給粉絲看的每週懶人包。結構：**開場**（這週一句話）→ **本週 Tier 前段班**（S、A 各一兩句）→ **本週大事** 2～3 則重點 → **下週出擊** → **結尾提問**（例：你這週玩了哪款？）。段落之間空一行。不能放沒查證的事、不能跟任何來源或其他粉專的句子相像。
- `titles`：剛好 3 個，各 ≤ 28 字：一個資訊型、一個好奇型、一個話題型。
- `tags`：4～6 個 hashtag，固定有 `#每週遊戲懶人包`，最後一個是 `#遊戲狂想曲`。
- `script`：60 秒口播稿，口語、230～300 字，第一句就是鉤子，照 Tier 表從 S 講下來，結尾丟問題。
- `credit`：素材來源（例：圖片來源：各遊戲官方 Steam 商店頁）。
- `cover`：封面圖卡的字：`kicker` ≤ 12 字（例：每週遊戲懶人包）、`title` 兩行用 `\n` 分開、每行 ≤ 11 字、`sub` 選填。
- `threads`：`{post, topic}`，Threads 版（粉專作戰台週日 21:00 發 Threads 時用）。`post` 150～350 字：這週一句話＋S 級是誰＋一則最大的事＋結尾提問；內文**不放 #**。`topic` 一個主題標籤、不含 #（例：遊戲、Steam）。
- 所有粉專文字都**不放網址**（粉專作戰台會照各平台規則自己加），也**不出現「痞子葳」**。publish.py 會擋。

## 4. 格式（`apps/unpacked/data/weekly/<id>.json`，檔名就是 id）

```json
{
  "id": "2026-W47", "from": "2026-11-16", "to": "2026-11-22", "date": "2026-11-22", "updated": "2026-11-22T12:10:00Z",
  "title": "……", "intro": "……",
  "mvp": {"ref": "f:gta-vi", "why": "……"},
  "tiers": [{"ref": "p:balatro", "tier": "S", "line": "……"}, {"ref": "f:rob-run", "tier": "C", "line": "……"}],
  "news": [{"h": "……", "t": "……", "s": [0, 2]}],
  "next": [{"d": "2026-11-25", "name": "……", "t": "……", "s": [3], "ref": "f:……"}, {"d": "2026-11-27", "name": "……", "t": "……", "s": [4], "steam": 1234560}],
  "deals": "……",
  "fanpage": {"post": "……", "titles": ["……", "……", "……"], "tags": ["#每週遊戲懶人包", "#遊戲狂想曲"], "script": "……", "credit": "……",
              "cover": {"kicker": "每週遊戲懶人包", "title": "第一行\n第二行"}, "threads": {"post": "……", "topic": "遊戲"}},
  "sources": [{"t": "來源標題", "u": "https://……", "d": "2026-11-20"}]
}
```

## 5. 獨立查核（一定要做）

寫完以後，用 Agent 工具開一個**沒看過寫作過程**的子代理，只給它週報 JSON 的路徑，請它：
1. 逐條打開 `news`、`next`、`deals` 標的來源，確認日期、平台、價格、數字都被來源支持。
2. 檢查 `fanpage` 的貼文和口播稿裡每個硬資訊都對得上。
3. 回報不被支持或寫錯的地方。

照它的回報修：錯的改掉；查不到的拿掉。

## 6. 上架

```bash
cd /home/claude/pz-games
python3 _build/apps/unpacked/tools/publish.py      # 週報也會檢查（Tier 表有沒有漏排、來源編號、字數），並重建 weekly.json；BAD 一定要修
git status                                          # 只該有 weekly/、weekly.json（和 platforms.json）的變動；別的用 git checkout -- <檔案> 還原
git add apps/unpacked/data/weekly apps/unpacked/data/weekly.json apps/unpacked/data/platforms.json
git commit -m "解包：W47 每週懶人包（11/16–11/22）"   # 結尾附上當次規定的署名行
git pull --rebase origin main && git -c push.negotiate=true push origin HEAD:main
```

push 失敗：`git pull --rebase origin main` 再推，最多重試 3 次。

## 7. 回報

最後用 PushNotification 推播給痞子葳（一行、200 字以內、繁體中文）：開頭「本週懶人包出爐：MVP ○○」，接著一句 S 級有誰、一句下週最值得等的；粉專稿和三張圖卡已經在出稿台準備好也一句帶過；第 8 節查到平台規則有變，加一句「平台規則有變：○○」。不寫技術細節。沒推上去就照實說原因。

## 8. 平台規則查證（每週一次，上架前做）

粉專作戰台的教學、字數上限、hashtag 數、連結規則、YouTube 營利門檻，都讀 `apps/unpacked/data/platforms.json`。平台常改規則，每週查一次：

1. 用 WebSearch 查這四件事最近有沒有變（只看 Meta、Instagram、Threads、YouTube 的官方說明或公告，和大型科技媒體的報導）：
   - Threads：一則字數上限、主題標籤（topic）數、連結數、文字附件、排程功能。
   - Instagram：每篇 hashtag 上限、說明文字字數、個人檔案連結數、說明文字裡的連結能不能點。
   - Facebook 粉專：帶外部連結的貼文／留言每月幾則、哪些不算。
   - YouTube 合作夥伴計畫：粉絲贊助與廣告分潤的門檻（訂閱、觀看時數、Shorts 觀看）、生效日。
2. **有官方或兩個以上可靠來源確認有變**才改：只改變了的那個數字或 `notes` 那一條，`src` 換成新的來源（`{t, u}`），`checked` 改成今天（`YYYY-MM-DD`），`by` 寫「每週懶人包查證」。沒變：只把 `checked` 改成今天。
3. 只是傳聞、測試中、只有少數地區：不改數字，可以在 `notes` 加一條「（測試中）……」。
4. `notes` 是給痞子葳看的，一條一句、繁體中文、講「對發文有什麼影響」。不准出現「痞子葳」以外的人名帳號、不放推銷。
5. publish.py 會檢查 `platforms.json` 的格式；改壞了一定要修到 BAD 0。
