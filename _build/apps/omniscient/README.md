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
3. **動畫不產生數字**：光點（封包）只在真的事件發生時才發——版本檔每分鐘的連線、資料更新、新聞蓋章、回放走到那一刻。背景線條只是底紋。
4. 回放只演那天真的發生過的事。冷眼沒有盤中加權指數的逐筆紀錄，所以回放時 13:30 以前只顯示昨收（「13:30 揭曉收盤」），不畫假的盤中指數。
5. 沒有任何假的獲利數字。
6. **只讀不寫**：不改冷眼的任何東西。只讀這台裝置上冷眼的自選清單（`localStorage['coldeye.settings'].watch`），不讀持股。自己的設定存 `omni.v1.*`（很小）；資料備份放 Cache Storage `omni-data-v1`，**不放 localStorage**（同網域的 App 共用 5MB，不能吃掉冷眼的空間）。

## 資料（全部是冷眼網站 `data/` 底下的檔）

| 檔 | 用在哪 | 時間戳 |
|---|---|---|
| `version.json` | 每分鐘看一次，哪一份的時間戳變了才重抓那一份（和冷眼同一套） | `built`、`files` |
| `summary.json` | 收盤批次：每檔收盤、規則觀點（st/sc/cf/ps）、大盤、三大法人、官方來源抓取紀錄 | `generated` |
| `live.json` | 盤中：`etfs[代號] = [價, 預估淨值, 折溢價, 時間, 單位變動, 日期]`、加權指數 `taiex{z,y,t}` | `at` |
| `spark.json` | 當天每一檔的盤中走勢 `s[代號] = [分鐘, 價, …]`（分鐘＝距 09:00）——回放的價格就是它 | `at` |
| `news.json` | 公告與新聞，冷眼後台已分好 official／fact／opinion；全知用同一份 OPINION 字表標出是哪個字 | `generated` |
| `global.json` | 市場溫度、美股、匯率、台指期 | `at` |
| `etf/<代號>.json` | 規則判官的六個面向（`view.components`）、回測 | 跟著收盤批次（`?b=generated`） |
| `cal.json`、`track.json` | 開休市日曆、規則戰績 | — |

冷眼改資料格式時（`pipeline/build.py` 的 `make_live`、`tape.py` 的 `make_spark`、`news` 的分類字表），這裡要跟著改。`src/data.js` 的 `OPINION_WORDS` 要和冷眼 `pipeline/build.py` 的 `OPINION` 一致。

## 畫面

- 開機：輕觸喚醒（同時建立 AudioContext）→ 眼睛睜開、開機紀錄逐行列出真的載入結果 → 白光 → 五欄依序點亮、掃描光束。
- 五欄：01 蒐集（官方來源燈號）→ 02 查證（六項交叉核對，全部當場用手上的資料算）→ 03 過濾（新聞蓋章）→ 04 判斷（焦點那一檔的規則六面向，每 14 秒換下一檔）→ 05 結論（自選六檔）。
- 下排：一則決策的一生（事件紀錄）、代理人網路、盤面脈動。
- 五隻水母＝代理人：鴞 OWL、天秤 LIBRA、水母 MEDUSA、判官 JUDGE、核心 CORE；有事時游到那一格，頭上標籤寫它在做什麼。
- 模式：交易日 09:00–13:35 是「盤中即時」；其他時間自動「回放」最近一個交易日（07:00 起 5%、盤中 80%、盤後 15%，1× 約 3 分鐘），播完出「今日戰報」，可自動重播。
- 音效全部 Web Audio 合成；環境底音的和弦跟著大盤（漲大調、跌小調）。
- 快速鍵：F 全螢幕、M 音效、空白鍵 播放／暫停、← → 快轉、R 回放、L 最新資料、S 設定、↑↓ 換焦點。

## 組建與測試

```bash
python3 _build/apps/omniscient/build.py            # → apps/omniscient/（單一 index.html＋manifest＋sw.js＋icons）
python3 _build/apps/omniscient/build.py --icons    # 重畫圖示
```

沒有 Claude 版：artifact 沙盒連不到 pzwei0105.github.io，讀不到冷眼的資料。

本機測試（雲端沙盒連不到 github.io）：照 `tools/testdata.py` 開頭的說明從冷眼的 state／tape 分支做測試資料，
網址加 `?data=/coldeye-etf/data/&auto=1&now=2026-11-13T15:00`（`data`、`auto`、`now` 只在不是正式網址時有效），
再用 `tools/shoot.py` 截圖（1920×1080、1440×900、390×844、3840×2160 都要看）。
