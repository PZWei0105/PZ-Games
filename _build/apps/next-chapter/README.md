# 下回分解 NEXT CHAPTER（維護說明）

專屬的閱讀 App：連載小說寫好一回就上架一回，也能匯入 EPUB、TXT、Markdown 電子書；仿真翻頁、三種紙色、聽說書。
書房最下面有分類分頁、書架可以照時間排；讀的時候有書籤、書內搜尋、前情提要、夜讀（亮度與暖光）、直排，也能複製／分享一整回；簡體書匯入時自動轉繁體。
**書房上了鎖**（2026-11-15 起）：第一次打開要輸入密語；書頁上能把一本書「分享」成**單行本**（只看得到那一本的連結）。
App 裡稱呼使用者一律用「痞子葳」；「魏子葳」是小說主角，跟使用者本人無關。

- 網頁版：https://pzwei0105.github.io/PZ-Games/apps/next-chapter/（可加到主畫面、離線閱讀；收藏庫「專屬 App」分頁有入口）
- 沒有 Claude 版：新章節靠 git push 上架，Claude 版做不到自動更新，所以只做獨立版。

## 分工（重要）

**小說在對話裡寫，App 只負責讀。** 章節由對話裡的 Claude 一次寫一章完整長度，寫完直接上架，不另外給下載檔。App 裡不做「按鍵生成章節」。

## 小說在私人倉庫，這裡只有加密檔（重要）

- **原稿（章節、前情提要、寫作筆記）只放在私人倉庫 PZWei0105/pz-novels。** 上架、改稿、寫提要、看筆記、分享連結、換密語，都用那邊的 `tools/shelf.py`，說明在那邊的 `CLAUDE.md`。
  工作階段裡沒有 pz-novels 就用 add_repo 加進來（要 push 權限），clone 在 PZ-Games 旁邊。
- 這個 repo（公開）只有加密檔：`apps/next-chapter/books/` 的 `keyring.json`、`library.pzx`、每本書一個看不出書名的資料夾（`<pub>/NNN.pzx`、`recaps.pzx`）。都是 pz-novels 的 `shelf.py push` 產生的，**不要手改、不要在這裡上架**；`books/library.json` 是給舊 clone 看的告示。
- **絕不把章節、提要、筆記的純文字 commit 進這個 repo**（也不要寫進 commit 訊息）。2026-11-15 已經把舊的小說檔從 git 歷史裡清掉；舊的 clone 不要 merge／rebase 回來（見 `books/library.json`）。
- 加密、組單行本的程式在這裡（`publish.py`、`tools/pzcrypt.py`），不含任何小說；pz-novels 的 shelf.py 會呼叫它們。

## 書房的鎖、單行本（怎麼運作）

- 格式 `.pzx` = `PZX1` | flags（bit0：先 raw-deflate）| nonce 12 byte | AES-GCM 密文；AAD 是前 5 byte。nonce 由內容算出來（HMAC），**同樣的內容加密出來一模一樣**，重組不會讓 git 每次都變。
  `tools/pzcrypt.py`（Python）和 `src/crypt.js`（App）是同一套，改一邊要改另一邊。
- **書房**：`keyring.json` 用密語（PBKDF2-SHA256 60 萬次）和備用碼各包一份總鑰匙 → 總鑰匙解 `library.pzx`（書架目錄，含每本書的鑰匙 `key`、資料夾 `pub`、單行本代號 `ed`、網站 `site`）→ 書的鑰匙解章節。
  開門以後總鑰匙記在這台裝置（`pznc.v1.km`）；設定裡「在這台裝置上鎖」會清掉鑰匙和解開的目錄（進度、書籤、匯入的書留著）。目錄解不開（總鑰匙換了）就請他重新輸入密語。
- **單行本**：同一份程式，組建時寫進 `window.__PZ_ED`（那本書的公開資料：書名、作者、封面、簡介）。網址 `<site>/<ed>/#k=<書的鑰匙>`，只解得開那一本；
  網站在 Cloudflare Pages（pz-novels 的 `site/`），首頁不列任何書、也沒有任何連到這裡的地方。單行本的儲存前綴是 `pzsb.<ed>.`，外觀設定在幾本單行本之間共用（`pzsb.look`）。
- 單行本的鑰匙同時記在網址（`#k=`）、localStorage、cookie：iPhone 主畫面的 App 跟 Safari 不共用儲存空間，加到主畫面時只帶得走網址，所以 **manifest 不寫 `start_url`**（沒寫就用當下的網址，連同 #k=）。不要加回去。
  網址少了鑰匙就從這台裝置補回網址上；網址的鑰匙壞了、這台記得另一把開得了的，就用記得的；都沒有就請讀者貼上完整連結。
- 書頁「分享」：複製連結、傳到 LINE（`line.me/R/share`，連結加 `?openExternalBrowser=1` 讓 LINE 用外部瀏覽器開，才能加到主畫面）、系統分享、QR code（`lib/qrcode.js`，用到才下載，中間蓋這本書的朱印，容錯 H）。
- 收回連結（pz-novels 的 `shelf.py rekey`）會換鑰匙和代號：舊網址 404，單行本會清掉存下來的書和鑰匙，跟讀者說「這本書換了新的連結」。

## 說書音軌

App 有兩種說書：
1. **預錄音軌**（目錄裡該章有 `au`）：一般的 MP3，鎖屏、背景都能播，有逐句時間軸（唸到哪標到哪、自動翻頁）。
2. **裝置語音**（沒有音軌的章、匯入的書、單行本）：用瀏覽器的 speechSynthesis 逐句唸；手機鎖屏會停。電腦用 Edge 可以選到微軟線上自然語音（含台灣腔的 YunJhe／HsiaoChen）。

- 說書聲音痞子葳還沒定案（Kokoro 只有大陸腔，他想要台灣口音、YT 說書頻道那種男聲；候選見 ROADMAP）。錄音工具 `narrate.py`、`listen.py` 已搬到 pz-novels 的 `tools/legacy/`（舊格式）。
- **音軌也是全文，上架前要加密**：目前 `publish.py` 不放音軌，App 的 `au` 路徑讀的是沒加密的檔（只剩測試在用）。做說書時：音軌加密成 `.pzx`、App 下載解密成 blob 再播（點下去的當下先 `audio.play()` 解鎖，見 narrator.js）。

## 檔案

| 路徑 | 用途 |
|---|---|
| `src/core.js` | 工具、設定與進度（localStorage，前綴 `pznc.v1.`；單行本 `pzsb.<ed>.`）、IndexedDB（`pznc`：匯入的書）、圖示；`ED`（單行本模式） |
| `src/crypt.js` | 解 `.pzx`、用密語／備用碼開 keyring（WebCrypto）；`Vault`：書房的總鑰匙 |
| `src/gate.js` | 門：書房的鎖（密語畫面、扣環打開的動畫）、單行本的連結畫面（少了鑰匙、鑰匙錯了、被收回、第一次載入、離線） |
| `src/covers.js` | 線裝書封面（SVG：布面、題簽、朱印、四眼線裝、圖樣） |
| `src/sound.js` | 音效（Web Audio 合成：翻頁紙聲、開書、驚堂木） |
| `src/books.js` | 書架同步（解 `library.pzx`／單行本的 `book.pzx`）、解章節、分段、斷句、章節 HTML、閱讀進度、時間排序、前情提要、書內搜尋、分類（`Genre`）、書籤（`Marks`） |
| `src/conv.js` | 簡體轉繁體：轉換表 `lib/opencc-cn2t.js`（opencc-js，MIT；字典 Apache-2.0）用到時才下載 |
| `src/importer.js` | 匯入：EPUB、TXT（UTF-8／Big5／GBK、自動分章、硬斷行接回）、Markdown |
| `src/reader.js` | 閱讀器：CSS 多欄分頁、仿真翻頁、捲動模式、直排、位置錨點、說書標示與跟讀、書籤緞帶、搜尋亮字、夜讀 |
| `src/narrator.js` | 說書：音軌播放與時間軸同步、裝置語音、睡眠定時、鎖屏控制（Media Session） |
| `src/ui.js`、`src/main.js` | 書房、書頁（目錄／書籤／搜尋／提要、分享這本書、單行本的說明卡）、抽屜、說書現場、匯入、開機（門、單行本的鑰匙）與同步、iPhone 畫面高度修補 |
| `src/style.css`、`src/index.html`、`src/sw.js`、`src/sw-edition.js` | 樣式、外殼（`<!--HEAD-->`、`<!--EDITION-->` 是單行本換掉的地方）、書房與單行本的離線快取 |
| `src/vendor-fflate.js`、`src/lib/qrcode.js` | 解壓縮（MIT）、QR code（qrcode-generator，MIT，Kazuhiko Arase） |
| `build.py` | 組建書房；`edition_shell()`、`edition_sw()` 給單行本用（拿掉註解） |
| `publish.py`、`tools/pzcrypt.py` | 把書（原稿＋鑰匙，由 pz-novels 給）組成加密書房與單行本網站；畫封面圖示和 LINE 預覽圖（Playwright） |
| `tools/shelf.py` | 已搬家的告示（上架工具在 pz-novels） |
| `check.py`、`check_webkit.py` | 上線前檢查（Chromium）、在 WebKit（iPhone Safari 的引擎）裡走一遍 |

## 幾個容易踩到的地方

- **分段規則兩邊要一樣**：pz-novels `shelf.py` 的 `blocks()` 和 `books.js` 的 `parseBlocks()` 都是「每個非空行一塊」，音軌時間軸用（塊編號、字元起訖）對位。
- **閱讀位置用「句子錨點」記**（塊編號＋字元位置），不是頁碼。改字級、轉螢幕、換翻頁方式都靠 `pin` 回到同一句。
- **翻頁動畫只動 transform**：頁面是 `.leaf`（裁切）包 `.leaf-in`（反向位移），頁背 `.flapc` 裡有一份鏡像的同一頁（`.ghost`）。分頁用 `vp.scrollLeft`。
- **直排**：`.flow.v` 是 `writing-mode: vertical-rl` 的多欄，分頁改用 `vp.scrollTop`。翻頁台 `.rd-stage.rtl` 整個左右鏡像，裡面的 `.vp`、頁腳再鏡像一次把字轉正。直排一定是翻頁模式。
- **搜尋亮字用暫時的 `<mark>`**；不要改成 CSS Highlight API（Safari 在 `user-select: none` 的地方不畫）。
- **暖光是把主題顏色濾掉藍光**（`Reader.warmVars`），調暗是蓋一層黑紗；不要用 `mix-blend-mode`（WebKit 有時不混色）。
- **說書要在點擊當下啟動**：`Narrator.start()` 第一個 await 之前就要 `audio.play()`／`speak()`。
- **密語輸入框是 type="text"**：iPhone 的 password 欄位不給中文輸入法（他的密語是中文）。要遮住用 `-webkit-text-security`（眼睛按鈕）。
- 同網域的 App 共用瀏覽器儲存空間：localStorage 前綴 `pznc.v1.`、IndexedDB `pznc`、快取 `pznc-…`（書架檔快取 `pznc-books-v2`），不要改掉前綴。
- 單行本的程式碼不能出現 PZ-Games、GitHub、收藏庫的網址（朋友看原始碼就找得到）；`build.edition_shell()` 會拿掉註解，`check.py` 也會檢查。

## 組建、檢查、上線

```bash
python3 _build/apps/next-chapter/build.py
python3 _build/apps/next-chapter/check.py          # 沒有 BAD 才能推；截圖在 /tmp/pznc-check，要打開來看
python3 _build/apps/next-chapter/check.py --features    # 只跑新功能（書房分類、排序、書籤、搜尋、提要、夜讀、直排、簡轉繁）＋上鎖、分享、單行本
python3 _build/apps/next-chapter/check.py --secure      # 只跑上鎖、分享、單行本
python3 _build/apps/next-chapter/check_webkit.py   # 動到排版、直排、亮字、夜讀時：在 WebKit 走一遍，截圖在 /tmp/pznc-webkit
```

- check.py 用**測試用的假書**（`fixture()`：亂數拼的句子、測試鑰匙、靜音的假音軌），不碰真的小說，也不需要私人倉庫。
- 字型：`cd _build/tools/fonts && npm i @fontsource/noto-serif-tc @fontsource/lxgw-wenkai-tc @fontsource/noto-sans-tc`（截圖才是真正的字）。
- 只改 App：commit `_build/apps/next-chapter/` 和 `apps/next-chapter/`（不含 books/）推上 main。**改了引擎也要更新單行本**：有 pz-novels 時跑它的 `shelf.py push`（會用新的引擎重組單行本）；沒有的話，下一次有人上架就會帶上。
