# 耳目一新 RESKIN（維護說明）

痞子葳的換膚音樂播放器：播自己的音樂檔，九套 Skin 加 DIY，一鍵換裝。
App 裡稱呼使用者一律用「痞子葳」。

- 網頁版：https://pzwei0105.github.io/PZ-Games/apps/reskin/（可加到主畫面、離線聽、鎖屏連播；收藏庫「專屬 App」分頁有入口）
- Claude 版：https://claude.ai/artifact/Dcws22E7CZzxpo9HLH8XUm（slug `66328189-c13f-4f55-ba42-02e7b5b2437a`）。試 Skin 用：沒有 service worker，歌只存在那個瀏覽器，不能鎖屏一直聽。改版就發布到同一個 artifact，不要另開新的。

## 組建與檢查

```bash
python3 _build/apps/reskin/build.py --claude-out /tmp/reskin-claude   # 網頁版輸出到 apps/reskin/，Claude 版另外輸出
python3 _build/apps/reskin/check.py --claude /tmp/reskin-claude       # 全流程檢查，手機＋電腦，約 3 分鐘，要看到「全部 OK」
python3 _build/apps/reskin/build.py --icons                            # 只有改圖示才需要（要 playwright、pillow）
```

- 截圖在 `/tmp/reskin-check`，改到畫面就逐套看過再上線：手機直、手機橫（844×390）、電腦（1280×800）。
- 發布 Claude 版：`publish_files` 不收 `/tmp` 底下的檔，先把 `/tmp/reskin-claude/index.html` 複製到 `/home/claude/` 底下再發布。
- 只動 `apps/reskin/`，不用重組收藏庫；改了收藏庫上的介紹（`data/catalog_base.json`）才要重組。
- 版本號是組建時間（例如 `2026.11.13-0319`），會寫進頁面和 service worker。

## 最重要的規矩：iPhone 上的播放

- **歌一律用 `<audio>` 播，不能接進 Web Audio**（`createMediaElementSource`）。iPhone 鎖屏後 Web Audio 會被暫停，接進去的歌就跟著沒聲音。
  所以畫面上的頻譜、波形、節拍都是匯入時先分析好的（`analysis.js`，在 Worker 裡跑：22050 Hz 解碼、每秒 30 格、32 個頻帶、48 點波形、起音、BPM），播放時照時間查表（`viz.js`）。還沒分析完的歌，畫面先用合成的律動（`v.synthetic`）。
- 介面音效（`sfx.js`）才用 Web Audio，跟歌分開；iOS 從背景回來會重建 AudioContext。
- 鎖屏連播（`player.js`）有三種方式，設定頁「鎖屏連播方式」可以切：
  - 單軌換帶 `single`：一首播完，同一個 `<audio>` 換下一首。
  - 雙軌接力 `dual`：下一首先在另一個 `<audio>` 預載；螢幕關著時，在剩不到 0.42 秒時交棒。
  - 自動 `auto`（預設）：先用單軌；偵測到背景換歌沒接上，就自己改成雙軌，並跳出「繼續播放」。
- 背景換歌每次都記在 IndexedDB `kv` 的 `diag`（留最後 30 筆）。設定頁「鎖屏換歌紀錄」會顯示接上、沒接上、被系統暫停各幾次。**痞子葳回報鎖屏斷掉時，先看這裡。**
- 第一次點畫面時，用無聲 WAV 喚醒兩個 `<audio>`（`unlock`）；非同步換歌前先 `prime()`。拿掉任何一步，iPhone 都會擋播放。
- Media Session 只註冊 play、pause、previoustrack、nexttrack、seekto、stop。**不要加 seekbackward／seekforward**：iPhone 鎖屏會把上一首／下一首換成快退／快轉。
- iPhone 不能用程式調音量，所以 iOS 不顯示音量條。
- 雲端沙盒測不了真的 iPhone 鎖屏。check.py 用「假裝螢幕關著」模擬；真機的狀況要看痞子葳回報和 `diag`。

## 資料

- 全部存在使用者裝置的 IndexedDB `pz-reskin`，不連任何伺服器：
  `tracks`（歌的資料）、`playlists`、`audio`（音樂檔本體）、`covers`、`analysis`（節奏分析）、`images`（DIY 照片）、`kv`（`settings`、`session` 上次播到哪、`diag`）。
- 同一個網域的 App 共用儲存空間：資料庫名稱 `pz-reskin`、service worker 快取前綴 `pzrs-` 都是這個 App 專用，不要跟別的 App 撞名。這個 App 不用 localStorage。
- 在 iPhone 上，每個加到主畫面的 App 都有自己的儲存空間：單獨加到主畫面的耳目一新、Safari、加到主畫面的收藏庫（在它裡面開的那份），歌庫互不相通（系統規定）。Android 和電腦在同一個瀏覽器裡是共用的。空歌庫畫面和設定頁最下面的提示，會照裝置換說法。
- 歌名、歌手、封面、長度讀檔案裡的標籤（`meta.js`）：ID3v1／v2.2～2.4、M4A、FLAC、WAV。Big5／GBK 編的舊標籤會自動判斷，不會變亂碼。
- 播不了的檔（例如這台裝置不支援的格式）會標記起來，提示後跳下一首。

## Skin 怎麼做

- 一套 Skin 是 `skins/<id>.js` 加 `skins/<id>.css`，用 `R.skins.def({...})` 註冊。`build.py` 的 `SKINS` 決定順序，衣櫃也照這個順序。
- 共用的按鈕和進度條用屬性接：`data-act`（動作）、`data-bind`（歌名之類）、`data-seek`（進度條）。
  `data-ui` 標的是派對模式要收起來的部分；封面和主視覺不要標。
- 顏色走 CSS 變數，`api.setTheme()` 會跟著封面顏色換。
- canvas 一律用 `R.kit.canvas`（限制 DPR，手機變慢時自動降畫質）。`frame(dt, t, v)` 每一格都拿得到現在的頻譜、節拍、心情（`v`）。
- 換裝是從點的地方用 clip-path 擴散開；衣櫃試穿用 `R.stage.show(id, { fast: true })`。
- DIY（`skins/diy.js`）：底圖（照片或封面）、配色、視覺化樣式、字型，存在 `settings.diy`，照片存在 `images`。
- 加新 Skin：照現有九套的寫法；三種畫面都要截圖看過，check.py 要全過；閃光類效果要尊重設定頁的「閃光特效」開關。

## Claude 版

- `build.py --claude-out` 另外輸出一份，最前面多一行 `window.RESKIN_NO_SW = true`（程式裡是 `R.CLAUDE`）：不註冊 service worker（Claude 不允許），設定頁和存不了歌時的提示，改成請他開網頁版。
- Artifact 跑在沙盒裡：瀏覽器的 alert、confirm、prompt 會被擋，所以 App 一律用自己的對話框（`R.ui.confirm`、`R.ui.prompt`）。全螢幕、Wake Lock 都要包 try/catch。

## 檔案

| 路徑 | 用途 |
|---|---|
| `src/index.html` | 外殼：舞台 `#stage`、下方按鈕列、抽屜 `#sheet`、衣櫃、對話框；`/*FONTS*/`、`/*CSS*/`、`/*JS*/` 由 build.py 填進來 |
| `src/core.js` | 共用工具、平台判斷（`R.isIOS`、`R.embedded`、`R.CLAUDE`）、設定、圖示、提示泡泡 |
| `src/db.js` | IndexedDB（iOS 在背景斷線時會自動重連一次） |
| `src/meta.js` | 讀標籤：歌名、歌手、封面、長度 |
| `src/art.js` | 封面縮圖、取色，沒有封面時畫一張 |
| `src/lib.js` | 歌庫、歌單、匯入 |
| `src/analysis.js` | 每首歌只分析一次：頻譜、波形、節拍、BPM |
| `src/player.js` | 播放器：兩個 `<audio>`、三種鎖屏連播方式、Media Session、診斷紀錄 |
| `src/viz.js` | 照播放時間查分析結果，給 Skin 用 |
| `src/sfx.js` | 介面音效（每套 Skin 不一樣） |
| `src/demo.js` | 示範曲：在裝置上現場合成的 56 秒電子樂 |
| `src/skinkit.js` | Skin 框架：註冊、換裝轉場、canvas、共用控制鈕 |
| `src/skins/` | 九套 Skin 和 DIY |
| `src/ui.js` | 抽屜、選單、對話框 |
| `src/library.js` | 歌庫畫面：歌曲、歌單（含綁 Skin）、播放佇列 |
| `src/wardrobe.js` | 衣櫃：左右滑，用正在播的歌試穿 |
| `src/settings.js` | 設定頁 |
| `src/main.js` | 啟動、匯入、派對模式、快捷鍵 |
| `src/style.css` | 共用樣式 |
| `src/sw.js` | service worker：頁面網路優先，離線用存好的那份 |
| `src/fonts/` | 內嵌字型（見下面） |
| `build.py` | 組建 |
| `check.py` | 全流程檢查：自己產生測試音檔（含 Big5 標籤、壞檔），跑手機和電腦，最後測離線 |

## 字型

`src/fonts/` 是 @fontsource 的 woff2：Orbitron、Share Tech Mono、Chakra Petch、Exo 2、Fredoka、Bungee、Playfair Display、Permanent Marker、VT323。授權是 SIL OFL（Permanent Marker 是 Apache 2.0），組建時內嵌。只有拉丁字母，中文用系統字型。
