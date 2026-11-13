# 全知 OMNISCIENT

痞子葳的炫砲戰情看板。本質就是冷眼（repo `PZWei0105/coldeye-etf`）：把冷眼的官方一手資料「攤開來演」。
另外做成獨立 App，是為了**絕對不要把冷眼弄壞**——冷眼是他最重要的 App。

網址：https://pzwei0105.github.io/PZ-Games/apps/omniscient/（同網域讀 `/coldeye-etf/data/*.json`）

## 用途分工（痞子葳說的）

- 真的要即時、要記帳、要看自己的部位 → 冷眼。
- 休市後、或只是想看資訊／數字／新聞，而且想要「一打開就哇～」 → 全知。為筆電 18 吋與大電視全螢幕設計，手機也能開（改成直式捲動）。

## 正確性鐵律（不能退讓）

1. 每個數字都來自冷眼公開的資料檔，旁邊標來源與時間。全知**不自己另外抓任何網站**。
2. 過期就變色、標「已過期」；抓不到標「斷線」，離線時用 Cache Storage 裡上次的那一份並照實標「離線」。不拿舊數字假裝新的、不用亂數補。
3. **動畫不產生數字**：亮的光點（封包）只在真的事件發生時才沿著光纜跑——版本檔每分鐘的連線、資料更新、新聞蓋章、回放走到那一刻的成交與公告。光纜上緩慢流動的微光、跟著配樂呼吸的泛光、換段落時亮一下，都只是裝飾，不帶任何數字；「判斷」欄每 14 秒換看下一檔只是換顯示，不放光點。
4. 回放只演那天真的發生過的事。冷眼沒有盤中加權指數的逐筆紀錄，所以回放時 13:30 以前只顯示昨收（「13:30 揭曉收盤」），不畫假的盤中指數。熱力圖、自選價格、最佳五檔、成交明細都只用回放時間點以前的紀錄。
5. 沒有任何假的獲利數字。
6. **只讀不寫**：不改冷眼的任何東西。只讀這台裝置上冷眼的自選清單（`localStorage['coldeye.settings'].watch`），不讀持股。自己的設定存 `omni.v1.*`（很小）；資料備份放 Cache Storage `omni-data-v1`，**不放 localStorage**（同網域的 App 共用 5MB，不能吃掉冷眼的空間）。

## 資料（全部是冷眼網站 `data/` 底下的檔）

| 檔 | 用在哪 | 時間戳 |
|---|---|---|
| `version.json` | 每分鐘看一次，哪一份的時間戳變了才重抓那一份（和冷眼同一套） | `built`、`files` |
| `summary.json` | 收盤批次：每檔收盤、規則觀點（st/sc/cf/ps）、大盤、三大法人、官方來源抓取紀錄；熱力圖用成交值前 208 檔 | `generated` |
| `live.json` | 盤中：`etfs[代號] = [價, 預估淨值, 折溢價, 時間, 單位變動, 日期]`、加權指數 `taiex{z,y,t}` | `at` |
| `spark.json` | 當天每一檔的盤中走勢 `s[代號] = [分鐘, 價, …]`（分鐘＝距 09:00）——回放的價格就是它 | `at` |
| `tape/<代號>.json` | 冷眼每一輪抓到的盤面快照（成交、量、最佳五檔）：「最佳五檔」「盤面脈動」兩格用它 | 跟著 spark（`?s=at`） |
| `k/<代號>.json` | 日 K（開高低收量）：「判斷」欄的 K 線與 MA20 | 跟著收盤批次（`?b=generated`） |
| `news.json` | 公告與新聞，冷眼後台已分好 official／fact／opinion；全知用同一份 OPINION 字表標出是哪個字 | `generated` |
| `global.json` | 市場溫度、美股、匯率、台指期 | `at` |
| `etf/<代號>.json` | 規則判官的六個面向（`view.components`）、防守線、法人買賣超（`flows`）、回測 | 跟著收盤批次（`?b=generated`） |
| `cal.json`、`track.json` | 開休市日曆、規則戰績 | — |

冷眼改資料格式時（`pipeline/build.py` 的 `make_live`、`tape.py` 的 `make_spark`／`_code_file`、`news` 的分類字表），這裡要跟著改。`src/data.js` 的 `OPINION_WORDS` 要和冷眼 `pipeline/build.py` 的 `OPINION` 一致。

## 畫面

- 沒有角色：**資料本身就是主角**。WebGL2 畫背景格線、霓虹光纜（卡片之間照真實的資料流向接線）、光點與火花、掃描光束、開機的全息眼睛；HDR 加上 Dual-Kawase 泛光、ACES 色調、色差、暗角。太慢時自動降一級畫質（設定裡也能選「標準／省電」）。
- 開機：輕觸喚醒（同時建立 AudioContext、開始播配樂）→ 眼睛睜開、四周光點往眼睛聚、開機紀錄逐行列出真的載入結果 → 重拍＋白光 → 六欄卡片一欄欄閃進來、光纜一條條長出來、掃描光束。
- 六欄：01 蒐集（官方來源燈號）→ 02 查證（交叉核對，全部當場用手上的資料算）→ 03 過濾（新聞蓋章）→ 04 判斷（焦點那一檔：K 線、規則六面向、判決儀表、法人 20 日）→ 05 結論（自選六檔：價格滾動數字＋盤中走勢）→ 06 全局（加權 60 日、美股與避險、市場溫度、規則分布）。
- 頂列：四個環（市場溫度、偏多比例、官方來源、資料新鮮）、加權指數／成交值／三大法人／台指期、成交值前 208 檔熱力圖、模式與時鐘。
- 下排：一則決策的一生（事件紀錄＋judge.py 用真的數值逐行打出來）、最佳五檔＋成交明細、盤面脈動（價格線＋每輪量）。
- 模式：交易日 09:00–13:35 是「盤中即時」；其他時間自動「回放」最近一個交易日（07:00 起 5%、盤中 80%、盤後 15%，1× 約 3 分鐘），播完出「今日戰報」，可自動重播。
- 聲音：全知自己的配樂與音效（D 小調、100 BPM，見下面「配樂與音效」）。配樂用 `<audio>` 串流（不整首解碼，省記憶體），低頻能量讓泛光跟著呼吸；音效對齊配樂的 32 分音符落下。
- 快速鍵：F 全螢幕、M 聲音、空白鍵 播放／暫停、← → 快轉、R 回放、L 最新資料、S 設定、↑↓ 換焦點。

## 配樂與音效（`audio/`）

離線合成（Python：numba 寫的 PolyBLEP 振盪器與 TPT 濾波器、supersaw、FM 鐘聲、卷積殘響、乒乓延遲、側鏈、自己寫的 lookahead limiter，母帶 -16 LUFS、峰值 -1 dBFS），段落：intro → A → B → break → drop → outro，約 3 分鐘循環。

```bash
bash _build/apps/omniscient/audio/make.sh   # theme.py＋sfx.py → out/*.wav → MP3 放進 src/audio/
python3 _build/apps/omniscient/audio/analyze.py   # 每段響度、頻段平衡、頻譜圖（聽不到的時候用看的）
```

需要 numpy、scipy、numba、pedalboard、pyloudnorm、ffmpeg。`audio/out/`（大檔 wav）不進 git。

## 組建與測試

```bash
python3 _build/apps/omniscient/build.py            # → apps/omniscient/（單一 index.html＋audio/＋manifest＋sw.js＋icons）
python3 _build/apps/omniscient/build.py --icons    # 重畫圖示
```

沒有 Claude 版：artifact 沙盒連不到 pzwei0105.github.io，讀不到冷眼的資料。

本機測試（雲端沙盒連不到 github.io）：照 `tools/testdata.py` 開頭的說明從冷眼的 state／tape 分支做測試資料（含 `k/`、`tape/`），
網址加 `?data=/coldeye-etf/data/&auto=1&now=2026-11-13T15:00`（`data`、`auto`、`now` 只在不是正式網址時有效），
再用 `tools/shoot.py` 截圖（1920×1080、1707×1067＠1.5、1440×900、390×844＠3、3840×2160 都要看；第 6 個參數是裝置像素比）。
無頭瀏覽器沒有 GPU、每秒只有幾格，光點會慢很多：要看 60fps 時的真實樣子，先 `GLX.running=false`，再用 `GLX.update(1/60)` 一格一格推、`GLX.draw()` 後截圖。
