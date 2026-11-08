# 重新點火 REIGNITE（維護說明）

痞子葳專屬的減重 App：「數據教練（A）＋遊戲化（B，為主）」，要好玩、不會膩、能持之以恆，而且安全第一、慢慢來。（這個 repo 是公開的：不要把他個人的健康細節寫進程式、文案或這份說明。）

- 網頁版：https://pzwei0105.github.io/PZ-Games/apps/reignite/（可加到主畫面、離線使用；收藏庫「專屬 App」分頁有入口）
- Claude 版：見 `_build/data/catalog_base.json` 裡 `reignite` 的 `claude` 欄位（紀錄跟著 Claude 帳號同步）
- 專屬 App 一律稱呼他「痞子葳」（劇情裡的艦長也是他本人）；「魏子葳」是他小說作品的主角，跟這裡無關。

## 設計的規矩（改之前先看）

- **安全第一**：運動從平地慢走 10 分鐘開始，一階一階解鎖；第 5、6 階要醫生同意才能開。出門前安全檢查（胸痛、胸悶、頭暈 → 停機；血氧低於門檻 → 停機）。停機、提早停止一律算完成、星火一樣多，**絕對不能讓「硬撐」拿到比較多獎勵**。比目標多走不加分。
- **獎勵行為，不獎勵體重數字**：星火只來自記錄、換法、試車、警報、事件。體重只決定船體完整度（7 日均線，不看單日）。
- **少吃不加分**：燃料登錄不算熱量，不能出現「吃越少分數越高」。每餐有青菜、有蛋白質才加分。數據教練看到一週掉超過 1 公斤（或體重 1%）要警告「燃料不夠」。
- **斷掉不歸零**：休整日（每累計 7 天送一張，最多 3 張）會自動補上沒記的日子；補不了就顯示「歡迎歸隊」，累計天數、修好的模組、航誌全部保留。降級路線不會降階。
- **不罵人**：「還是吃了」照實記錄也有星火。所有文案都是陪伴口吻，不說教。
- 這不是醫療器材：數字只看趨勢，醫療判斷請他問醫生（血氧門檻、心率上限、血脂目標都讓醫生的數字優先）。

## 檔案

| 路徑 | 用途 |
|---|---|
| `src/data.js` | 劇情 13 章、貨物 24 件、每週事件 8 種、外食換法、降級路線、引擎階段、船員台詞（**id 不要改，存檔用 id 記**） |
| `src/core.js` | 日期、存檔、規則（7 日均線、趨勢、平台期、預估抵達、船體、章節解鎖、降級路線、事件、血脂魔王、休整日）、示範資料、音效（Web Audio 合成） |
| `src/ship.js` | 餘燼號 SVG（裂縫、燃料艙、氧氣環、引擎火焰、燈塔光束都跟著數據變）、星空、火花特效 |
| `src/game.js` | 嘴饞警報：隕石清除小遊戲、呼吸校準（吸 4 吐 6），三分鐘 |
| `src/ui.js`、`src/ui2.js` | 畫面：艦橋、量體重、燃料登錄、引擎試車、航跡（體重圖）、船塢、航誌、醫療艙、設定與備份、Apple Watch 同步、開場 |
| `src/style.css`、`src/index.html`、`src/sw.js` | 樣式、外殼、網頁版的離線快取 |
| `build.py` | 組成單一檔案：網頁版輸出到 repo 的 `apps/reignite/`，`--claude-out` 另外輸出 Claude 版；`--icons` 重畫圖示 |
| `check.py` | 上線前檢查（規則、每一頁、每個面板、開場、離線、Claude 版） |

## 存檔

- 網頁版：localStorage `pzreignite.v1`。`?demo=1` 是示範資料，存在 `pzreignite.demo`，不會碰到真的紀錄。
- Claude 版：artifact 的資料庫（`claude.use('db')` → `data/users/<id>/progress`），跟著 Claude 帳號同步；網頁版和 Claude 版的紀錄是分開的。
- 設定裡有備份碼（`REIGNITE1:` + base64 JSON）和備份檔；改存檔格式一定要能讀舊的（`migrate()`）。

## Apple Watch

網頁 App 讀不到「健康」資料，所以用 iPhone「捷徑」把數據組成 `REIGNITE w=90.6 o=96 s=5230` 拷貝到剪貼簿，再回 App 按「貼上」。不要用「打開網址」：主畫面 App 跟 Safari 的儲存是分開的。

## 組建、檢查、上線

```bash
python3 _build/apps/reignite/build.py --claude-out /tmp/reignite-claude
python3 _build/apps/reignite/check.py --claude /tmp/reignite-claude     # 沒有 BAD 才能推；截圖在 /tmp/reignite-check
```

- 網頁版：commit `_build/apps/reignite/` 和 `apps/reignite/`，推上 PZ-Games 的 main。只改這個 App 時不用重組收藏庫。
- Claude 版：把 `/tmp/reignite-claude/index.html` 發布到同一個 artifact（不要另外建新的）。沒辦法發布就在 ROADMAP「已知問題」記「Claude 版待同步」。
