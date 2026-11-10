# 下回分解 NEXT CHAPTER（維護說明）

專屬的閱讀 App：連載小說寫好一回就上架一回，也能匯入 EPUB、TXT、Markdown 電子書；仿真翻頁、三種紙色、聽說書。
App 裡稱呼使用者一律用「痞子葳」；「魏子葳」是小說主角，跟使用者本人無關。

- 網頁版：https://pzwei0105.github.io/PZ-Games/apps/next-chapter/（可加到主畫面、離線閱讀；收藏庫「專屬 App」分頁有入口）
- 沒有 Claude 版：新章節靠 git push 上架，Claude 版做不到自動更新，所以只做獨立版。

## 分工（重要）

**小說在對話裡寫，App 只負責讀。** 使用者要的是品質：章節由對話裡的 Claude 一次寫一章完整長度，寫完直接上架，不另外給下載檔。App 裡不做「按鍵生成章節」。

## 新的一回怎麼上架（每寫完一章都要做）

```bash
# 1. 章節存成 .md（放在 repo 外面，例如 /home/claude/work/）。格式：
#      # 書名
#      ## 第九章　咽喉
#      （空一行後是正文；一段一行、段與段空一行；場景切換用單獨一行 ---）
# 2. 上架（同一章再 add 一次就是改稿，App 會重新下載）
python3 _build/apps/next-chapter/tools/shelf.py add <book-id> /home/claude/work/第009章.md
python3 _build/apps/next-chapter/tools/shelf.py check        # 不能有 BAD
# 3. 推上去（只動 apps/next-chapter/books/，不用重組 App 也不用重組收藏庫）
git add apps/next-chapter/books && git commit -m "《書名》第九章上架" && git push origin main
```

- 新書先 `shelf.py new <book-id> --title … --genre … --blurb … --cloth '#1d2f4a' --seal 朕 --motif pass`。
  封面是程式畫的線裝書：`cloth` 布面顏色、`seal` 朱印的字、`motif` 圖樣（pass 關山、belt 環帶、words 浮字、scroll 殘卷、thunder 雷紋、road 海線、moon 孤月、rope 繩紋、waves、cloud、grid、reeds、plain）。要新圖樣就在 `src/covers.js` 的 `motifs` 加一個。
- `shelf.py books`／`list <book>`／`cat <book> <n>`（取回純文字，改稿用）／`rm <book> <n>`。
- 使用者打開 App 會看到「新到 N 回」的提示和封面上的朱印「新」。

### 為什麼章節是 .pzc 而不是純文字

這個 repo 是公開的。章節一律打包成 `.pzc`（raw-deflate 後做 XOR），**不是加密**，只是讓搜尋引擎、爬蟲、GitHub 搜尋讀不到全文；App 頁面也加了 `noindex`。知道網址的人仍然能用 App 讀到。
所以：**純文字的章節檔不要 commit 進 repo**（工作檔放 repo 外面）。使用者如果要真正上鎖，再另外做密語加密（見 ROADMAP）。

## 說書音軌

App 有兩種說書：
1. **預錄音軌**（`library.json` 裡該章有 `au`）：一般的 MP3，鎖屏、背景都能播，有逐句時間軸（唸到哪標到哪、自動翻頁）。
2. **裝置語音**（沒有音軌的章、匯入的書）：用瀏覽器的 speechSynthesis 逐句唸；手機鎖屏會停。電腦用 Edge 可以選到微軟線上自然語音（含台灣腔的 YunJhe／HsiaoChen）。

錄音軌：

```bash
python3 _build/apps/next-chapter/tools/narrate.py <book-id> [章號…]     # 沒給章號＝所有還沒錄的章
python3 _build/apps/next-chapter/tools/narrate.py <book-id> 7 --sample 16 --voice 70 --out-dir /tmp/s   # 試聽，不動書架
python3 _build/apps/next-chapter/tools/listen.py  <book-id> 7            # 用語音辨識逐句聽回來，找讀錯的字
```

- 引擎是 Kokoro v1.1-zh（sherpa-onnx，CPU 就能跑，雙核心約 0.4 倍實際時間）。**它只有大陸腔。**
  使用者（2026-11-11）聽過試聽後問有沒有台灣口音、想要 YT 說書頻道那種男聲，所以**沒有拿它錄整本**；書架上只留一章當示範。聲音定案前不要大量錄。候選方案見 ROADMAP。
- 讀錯的字：把修正寫進 `tools/lexicon.txt`（`原文=同音替身`，只影響聲音），重錄那一章。
- 章節改稿後 `shelf.py add` 會自動拿掉舊音軌（時間軸對不上了），要重錄。
- 音軌一章約 6～12 MB，放在 `apps/next-chapter/books/<book>/audio/`。GitHub Pages 整站上限約 1 GB，錄多了要搬到別的地方（見 ROADMAP）。

## 檔案

| 路徑 | 用途 |
|---|---|
| `src/core.js` | 工具、設定與進度（localStorage，前綴 `pznc.v1.`）、IndexedDB（`pznc`：匯入的書、章節、圖片）、圖示 |
| `src/covers.js` | 線裝書封面（SVG：布面、題簽、朱印、四眼線裝、圖樣） |
| `src/sound.js` | 音效（Web Audio 合成：翻頁紙聲、開書、驚堂木） |
| `src/books.js` | 書架同步（`books/library.json`）、解 .pzc、分段、斷句、章節 HTML、閱讀進度 |
| `src/importer.js` | 匯入：EPUB（解壓、目錄、圖片、封面）、TXT（UTF-8／Big5／GBK、自動分章、硬斷行接回）、Markdown |
| `src/reader.js` | 閱讀器：CSS 多欄分頁、兩片頁面＋摺起來的頁背做仿真翻頁、捲動模式、位置錨點、說書標示與跟讀 |
| `src/narrator.js` | 說書：音軌播放與時間軸同步、裝置語音、睡眠定時、鎖屏控制（Media Session） |
| `src/ui.js`、`src/main.js` | 書房、書頁、抽屜、說書現場、匯入流程、開機與同步 |
| `src/style.css`、`src/index.html`、`src/sw.js` | 樣式、外殼、離線快取 |
| `src/vendor-fflate.js` | 解壓縮（MIT，EPUB 與 .pzc 用） |
| `tools/shelf.py`、`tools/narrate.py`、`tools/listen.py` | 上架、錄音軌、聽回檢查 |
| `build.py`、`check.py` | 組建、上線前檢查 |

## 幾個容易踩到的地方

- **分段規則兩邊要一樣**：`shelf.py` 的 `blocks()` 和 `books.js` 的 `parseBlocks()` 都是「每個非空行一塊」，音軌時間軸用（塊編號、字元起訖）對位，改一邊要改另一邊。
- **閱讀位置用「句子錨點」記**（塊編號＋字元位置），不是頁碼。改字級、轉螢幕、換翻頁方式都靠 `pin` 回到同一句；不要改成每次從畫面重新算，會越跑越前面。
- **翻頁動畫只動 transform**：頁面是 `.leaf`（裁切）包 `.leaf-in`（反向位移），頁背 `.flapc` 裡有一份鏡像的同一頁（`.ghost`）。分頁用 `vp.scrollLeft`，不要用 transform 移整章（圖層會太大）。
- **說書要在點擊當下啟動**：`Narrator.start()` 第一個 await 之前就要 `audio.play()`／`speak()`，不然手機不准自動接著播。
- **音軌不經過 service worker**（要支援拖進度條的 Range 請求）；章節檔網址帶版本碼、存了就一直用；`library.json` 先連網路、斷網用舊的。
- 同網域的 App 共用瀏覽器儲存空間：localStorage 前綴 `pznc.v1.`、IndexedDB 名稱 `pznc`、快取名稱 `pznc-…`，不要改掉前綴。

## 組建、檢查、上線

```bash
python3 _build/apps/next-chapter/build.py
python3 _build/apps/next-chapter/check.py        # 沒有 BAD 才能推；截圖在 /tmp/pznc-check，要打開來看
```

- 字型：`cd _build/tools/fonts && npm i @fontsource/noto-serif-tc @fontsource/lxgw-wenkai-tc @fontsource/noto-sans-tc`（截圖才是真正的字）。
- commit `_build/apps/next-chapter/` 和 `apps/next-chapter/`，推上 PZ-Games 的 main。只改這個 App 時不用重組收藏庫。
