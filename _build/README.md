# _build：PZ 遊戲收藏的製作工具

這個資料夾是給「之後幫痞子葳加新遊戲的 Claude」看的。網站本身不需要它，GitHub Pages 也不會用到它。

## 資料夾內容

| 路徑 | 用途 |
|---|---|
| `data/catalog_base.json` | 手寫的總表：類型（genres）、遊戲（games）、未上架作品（archive）、專屬 App（apps） |
| `data/overrides.json` | 個別遊戲的畫面微調：主視覺用哪張截圖（heroShot）、封面取景（coverFocus）、截圖說明（captions）等 |
| `meta/<遊戲 id>.json` | 每款遊戲實際玩過後寫的遊玩說明：目標、操作、核心玩法、新手提示、遊玩時間、存檔方式、截圖說明 |
| `src/` | App 本體原始碼：`index.html`、`app.css`、`app.js`（純 JavaScript，沒有框架）；`hub.js` 是遊戲裡的浮動圓鈕 |
| `tools/build.py` | 把上面全部組成網站（輸出到 repo 根目錄） |
| `tools/shoot.py` | 用 Playwright 開遊戲、照步驟操作、截圖 |
| `tools/lint_meta.py` | 檢查遊玩說明有沒有寫錯字體、太長、提到開發內部用語 |
| `tools/preview_media.py` | 預覽封面／主視覺／橫幅會怎麼裁切 |

截圖原檔（`shots/`）太大沒有放進來；網站用的是 `media/` 裡壓縮過的 WebP。重新 build 時，沒有截圖原檔的遊戲會直接沿用上一版 `catalog.json` 裡的圖片設定，不會壞掉。

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
6. **推上 GitHub**：`REPO=.. bash tools/deploy.sh "Add 《遊戲名》"`（會把遊戲、圖片、外殼分批 commit 再 push；commit 訊息結尾要附上當次對話規定的署名行）。一兩分鐘後 https://pzwei0105.github.io/PZ-Games/ 就會更新；使用者重新打開收藏庫會跳出「新遊戲入庫」提示。

## App 怎麼運作（改程式前先看）

- 單頁 App，網址用 `#` 分頁：`#library`、`#library-<類型>`、`#apps`、`#game-<id>`、`#play-<build>`。
- 遊戲在 App 裡用全螢幕 iframe 開（`games/<build>/index.html`），右上角浮動的 PZ 圓鈕可以回收藏庫、重新載入、全螢幕。
- 遊玩紀錄、最愛、設定都存在使用者瀏覽器的 localStorage（前綴 `pzgc.v1.`）。
- 音效與背景音樂全部用 Web Audio 即時合成，背景音樂的調性跟著目前選中遊戲的顏色走。
- `sw.js` 讓 App 能離線開啟：外殼走 network-first，圖片 cache-first，遊戲 stale-while-revalidate。
