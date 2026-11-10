# _build：PZ 遊戲收藏的製作工具

這個資料夾是給「之後幫痞子葳加新遊戲的 Claude」看的。網站本身不需要它，GitHub Pages 也不會用到它。

## 資料夾內容

| 路徑 | 用途 |
|---|---|
| `data/catalog_base.json` | 手寫的總表：類型（genres）、遊戲（games）、未上架作品（archive）、專屬 App（apps） |
| `data/changelog.json` | 更新紀錄（最新的放最前面，白話）：build 帶進 `catalog.json`，App 打開時用提示泡泡顯示最新一筆、只顯示一次；第一次打開收藏庫的人不會看到 |
| `data/overrides.json` | 個別遊戲的畫面微調：主視覺用哪張截圖（heroShot）、封面取景（coverFocus）、截圖說明（captions）等 |
| `meta/<遊戲 id>.json` | 每款遊戲實際玩過後寫的遊玩說明：目標、操作、核心玩法、新手提示、遊玩時間、存檔方式、截圖說明 |
| `src/` | App 本體原始碼：`index.html`、`app.css`、`app.js`（純 JavaScript，沒有框架）；`hub.js` 是遊戲裡的浮動圓鈕 |
| `tools/build.py` | 把上面全部組成網站（輸出到 repo 根目錄） |
| `tools/shoot.py` | 用 Playwright 開遊戲、照步驟操作、截圖 |
| `tools/lint_meta.py` | 檢查遊玩說明有沒有寫錯字體、太長、提到開發內部用語 |
| `tools/preview_media.py` | 預覽封面／主視覺／橫幅會怎麼裁切 |
| `tools/smoke.py` | 上線前檢查：檔案、收藏庫本身（手機／電腦／離線）、逐款「開始遊戲 → PZ 圓鈕 → 回收藏庫」（見下面「上線前檢查」） |
| `tools/memory.py` | 用 WebKit（iPhone Safari 的引擎）量遊戲或收藏庫吃多少記憶體，查閃退用 |
| `ROADMAP.md` | 待辦、已知問題、已完成（定期維護時先看、做完記下來） |

截圖原檔（`shots/`）太大沒有放進來；網站用的是 `media/` 裡壓縮過的 WebP。重新 build 時，沒有截圖原檔的遊戲會直接沿用上一版 `catalog.json` 裡的圖片設定，不會壞掉。

遊戲原檔（`raw/`）也沒有放進來：從 GitHub 重新 clone 時，`games/<build>/` 裡的就是目前上架的版本，build 會原封不動保留它（只把 PZ 圓鈕的標籤更新成最新版）。要改一款已上架的遊戲：先把 `games/<build>/` 整個資料夾複製成 `_build/raw/<build>/`，在 raw 裡改，再 build（圓鈕那行 build 會重新插，不用手動處理）。有 `sources/<遊戲 id>/` 的遊戲（長明、差一點、墜星、深艙、偷渡者）改原始碼、照它的 README 組建，不要直接改打包好的檔。Claude 上的版本（`builds[].artifact`）是另一份，能一起更新就一起更新，不能就記在 ROADMAP 的「已知問題」。

## 遊戲怎麼開（重要）

- 收藏庫按「開始遊戲」會播完點火動畫後**整頁切到** `games/<build>/index.html`，不是開在 iframe 裡：收藏庫整頁讓出記憶體，iPhone 上才不會因為「收藏庫＋遊戲」太吃記憶體被系統砍掉（2026-11-05 修正過一大串閃退）。
- build 時會自動在每款遊戲頁 `</body>` 前插入 `<script src="../../hub.js" data-game=… data-build=…>`：遊戲裡那顆可拖動的圓鈕（回收藏庫、怎麼玩、重新載入、全螢幕），也負責記錄遊玩時間。不用手動加，也不要拿掉。
- 新遊戲本身也要顧記憶體：避免對大面積或一直在動的元素用 `filter: drop-shadow/blur`、整頁的 SVG 濾鏡（feTurbulence 之類）每格重算、畫布解析度別超過 devicePixelRatio 2。

## 加一款新遊戲

1. **遊戲檔**：把獨立網頁版放到 `_build/raw/<build-id>/index.html`（有素材資料夾就一起放）。build 時會複製到 `games/<build-id>/`。
   Claude 版本的網址寫在 `builds[].artifact`。
2. **總表**：在 `data/catalog_base.json` 的 `games` 加一筆，欄位照抄其他遊戲：
   `id, title, en, genre, status(shipped/dev/failed), pick, featured, created, updated, tagline, summary, highlights, inspired, verdict, next, palette[3], builds[{id,label,note,artifact}], chat, docs, online`。
   `palette` 是 `[亮色, 暗色, 強調色]`，整個 App 的環境光會跟著它變色。
3. **截圖**：至少 3 張，`01.png` 放標題畫面（做封面），`02.png` 放最好看的遊玩畫面（做主視覺）。
   ```bash
   cd _build
   python3 tools/shoot.py --game <build-id> --out shots/<遊戲 id> --viewport phone --dpr 2 \
     --steps '[{"wait":2500},{"shot":"01"},{"click_text":"開始"},{"wait":3000},{"shot":"02"}]'
   ```
   `--viewport` 可用 `phone`、`land`（手機橫拿）、`desk`（電腦）。步驟支援 wait、shot、click、click_text、tap、drag、key、hold、type、eval、wait_for、dump、repeat、offline、goto、reload。
   shoot.py 需要：`pip install playwright pillow numpy`，以及在 `tools/fonts` 執行
   `npm i @fontsource/noto-sans-tc @fontsource/noto-serif-tc @fontsource/lxgw-wenkai-tc`（遊戲用到的其他 Google 字型也一起裝），
   CDN 函式庫放 `tools/vendor/<網域>/<路徑>`（例如 three.js）。
4. **遊玩說明**：寫 `meta/<遊戲 id>.json`（格式照其他檔案）。要親自玩過再寫；寫給玩家看，不要出現程式、瀏覽器內部名詞。寫完跑 `python3 tools/lint_meta.py <遊戲 id>`。
5. **組網站**：在 `_build` 裡執行
   ```bash
   python3 tools/build.py --out ..            # 網頁版（GitHub Pages）
   python3 tools/build.py --out /tmp/claude-version --mode claude --skip-games   # Claude 版（截圖內嵌、按鈕連到 Claude 上的遊戲）
   ```
6. **檢查**：`python3 tools/smoke.py --only <遊戲 id>` 和 `python3 tools/smoke.py --shell` 都要沒有 BAD（見下面「上線前檢查」）。
7. **推上 GitHub**：`REPO=.. bash tools/deploy.sh "Add 《遊戲名》"`（會把遊戲、圖片、外殼分批 commit 再 push；commit 訊息結尾要附上當次對話規定的署名行）。一兩分鐘後 https://pzwei0105.github.io/PZ-Games/ 就會更新；使用者重新打開收藏庫會跳出「新遊戲入庫」提示。

## 上線前檢查（每次推之前）

```bash
cd _build
python3 tools/smoke.py --shell               # 檔案＋收藏庫本身，約 2 分鐘
python3 tools/smoke.py                       # 再逐款開遊戲，約 10～15 分鐘
python3 tools/smoke.py --only clear-bay ...  # 只開這幾款
```

- 需要 Playwright（`pip install playwright`；雲端沙盒已經裝好 Chromium，不要執行 `playwright install`）。它自己在本機開一個網站，用 Chromium 照 PZ 的用法點一遍：
  - **檔案**：每款遊戲頁都在、PZ 圓鈕標籤是最新版、`catalog.json` 指到的圖片都在、`sw.js` 快取的是目前的 `hub.js`、每款都有遊玩說明和封面。
  - **收藏庫**（390 手機、1440 電腦）：開機畫面、首頁、遊戲庫、專屬 App、每一款的遊戲頁（有開始鈕、沒破圖）、舊的 `#play-` 連結停在遊戲頁不會自己開遊戲、專屬 App 開得了也關得掉；最後把伺服器關掉（離線）再開一次收藏庫。
  - **每款遊戲**（用它該用的畫面：手機直拿、橫拿或電腦）：按開始遊戲 → 遊戲頁載入 → PZ 圓鈕在畫面內、沒被蓋住 → 選單打得開 → 「回到收藏庫」回到這款的遊戲頁。
- `BAD` 一定要修好才能推；`WARN` 要看（遊戲裡的程式錯誤、找不到的檔案）。截圖和 `report.json`（每款每一步花了幾秒）在 `/tmp/pzgc-smoke`，要打開來親眼看。
- 外部網站（Google 字型、CDN）在檢查時一律擋掉、另外列出，不算錯：雲端沙盒本來就連不到。《劍渡雲海》的 three.js 來自 cdn.jsdelivr.net，所以在這裡停在「雲海翻湧中」是正常的。
- 雲端電腦用 CPU 畫 3D：很重的遊戲（夜市三十六計、差一點、墨守…）一款要 1 分鐘上下。卡住的步驟會自動單獨重跑一次、時間放寬，重跑過了只記 WARN。
- 這個檢查用的是 Chromium，量不出 iPhone 的記憶體問題；PZ 說某款「閃退」或出現「重複發生問題」時，用 `tools/memory.py`（WebKit，iPhone Safari 的引擎）量，改之前、改之後各量一次比較：
  ```bash
  apt-get update && apt-get install -y xvfb gir1.2-webkit2-4.1 python3-gi   # 第一次（沒先 update 會找不到套件）
  python3 tools/memory.py --game <遊戲 id>                 # 從收藏庫按開始遊戲，在遊戲裡停 20 秒
  python3 tools/memory.py --game <遊戲 id> --steps s.json  # 進遊戲後照步驟操作（格式見檔案開頭說明）
  ```

## 遊戲原始碼（`sources/`）

多數遊戲只留打包後的單檔版本；需要長期續作的遊戲，原始碼放在 `sources/<遊戲 id>/`，裡面的 README 寫了怎麼組建。

| 遊戲 | 原始碼 |
|---|---|
| 長明 EVERLIGHT（HD-2D JRPG，第一章） | `_build/sources/everlight/`：`node tools/build.mjs` 產生 Claude 版與獨立網頁版；美術升級藍圖在 `art/` |
| 差一點 SO CLOSE（3D 夾娃娃機） | `_build/sources/so-close/`：`node tools/build.mjs` 產生 Claude 版與獨立網頁版；`tools/simtest.mjs` 調爪力 |
| 墜星 LANDFALL（殖民地生存模擬，第一幕） | `_build/sources/landfall/`：`python3 build.py` 產生 Claude 版（`dist/artifact/`）與獨立網頁版（`dist/web/`，複製到 `raw/landfall/`）；`tests/run.py sim 24` 自動玩 24 天看平衡；收藏庫截圖步驟 `tests/shots_steps.py` |
| 深艙 UNDERTOW（深海搜打撤，完整版） | `_build/sources/undertow/`：`python3 build.py` 產生 Claude 版（`dist/artifact/`）與獨立網頁版（`dist/web/`，複製到 `raw/undertow/`）；`tests/run.py bot 0` 自動玩、`tests/fuzz_maps.py` 檢查地圖；收藏庫截圖步驟 `tests/shots_steps.py` |
| 偷渡者 STOWAWAY（太空恐怖生存＋船員指揮，完整版） | `_build/sources/stowaway/`：`python3 build.py` 產生 Claude 版（`dist/artifact/`）與獨立網頁版（`dist/web/`，複製到 `raw/stowaway/`）；`tests/run.py bot 1500` 自動玩一整航、`tests/flows.py all` 跑六條結局路線；收藏庫截圖步驟 `tests/shots_steps.py` |

## 放在這個網站裡的專屬 App（`apps/`）

有些專屬 App 沒有自己的 GitHub repo，就直接放在這個網站的 `apps/<App>/` 底下，網址是 `https://pzwei0105.github.io/PZ-Games/apps/<App>/`。它們有自己的 manifest 和 service worker（scope 只到自己的資料夾），所以可以單獨加到主畫面；`tools/build.py` 不會動到 `apps/`。

- 原始碼放 `_build/apps/<App>/`，各自有 `build.py`，輸出到 repo 根目錄的 `apps/<App>/`。
- 收藏庫的「專屬 App」分頁照常在 `data/catalog_base.json` 的 `apps` 加一筆（`kind: "web"`、`url` 指向上面的網址）；`claude` 欄位記 Claude 版網址（收藏庫不讀它，只是備忘）。
- 同一個網域（pzwei0105.github.io）的 App 共用瀏覽器儲存空間，localStorage 一律加自己的前綴（例如本機道場用 `pzdojo.v1`）。

目前有：

| App | 原始碼 | 組建 |
|---|---|---|
| 本機道場 LOCAL DOJO（本機 AI 修煉課） | `_build/apps/local-dojo/src/`（課程內容在 `data1.js`、`data2.js`） | `python3 _build/apps/local-dojo/build.py --claude-out /tmp/dojo-claude`：網頁版輸出到 `apps/local-dojo/`，Claude 版（雲端同步進度）另外輸出，發布到 https://claude.ai/artifact/T6XN5fhrpMU4YM5rJsQ6Tj；檢查 `python3 _build/apps/local-dojo/check.py --claude /tmp/dojo-claude`；維護規矩見 `_build/apps/local-dojo/README.md`、`ROADMAP.md` |
| 重新點火 REIGNITE（痞子葳專屬的減重 App，燈塔船修復遊戲化） | `_build/apps/reignite/src/`（劇情、貨物、事件、換法在 `data.js`；規則在 `core.js`） | `python3 _build/apps/reignite/build.py --claude-out /tmp/reignite-claude`：網頁版輸出到 `apps/reignite/`，Claude 版（雲端同步紀錄）另外輸出，發布到 https://claude.ai/artifact/WhsJtzRqYda9tvteFMFXGP；檢查 `python3 _build/apps/reignite/check.py --claude /tmp/reignite-claude`；安全與「不獎勵少吃」的規矩見 `_build/apps/reignite/README.md` |

## App 怎麼運作（改程式前先看）

- 單頁 App，網址用 `#` 分頁：`#library`、`#library-<類型>`、`#apps`、`#game-<id>`、`#app-<id>`。舊的 `#play-<build>` 網址只會被改回 `#game-<id>`、停在遊戲頁，**不會自動重開遊戲**（記憶體不夠被重新載入時，自動重開會變成一直閃退的迴圈）。
- 遊戲是**整頁切過去**開（`games/<build>/index.html`，見上面「遊戲怎麼開」），不是 iframe；遊戲頁裡右上角的 PZ 圓鈕是組建時自動插入的 `hub.js`：回收藏庫、看玩法與存檔說明、重新載入、全螢幕（iPhone 沒有全螢幕），也記遊玩時間。專屬 App 比較輕，仍在收藏庫裡用全螢幕 iframe 開。
- 遊玩紀錄、最愛、設定都存在使用者瀏覽器的 localStorage（前綴 `pzgc.v1.`）。
- 音效與背景音樂全部用 Web Audio 即時合成，背景音樂的調性跟著目前選中遊戲的顏色走。
- `sw.js` 讓 App 能離線開啟：外殼走 network-first，圖片 cache-first；遊戲頁面網路 2.5 秒內有回應就用最新版，不然先用存好的那份（新版照樣在背景下載），遊戲其他檔案 stale-while-revalidate。
