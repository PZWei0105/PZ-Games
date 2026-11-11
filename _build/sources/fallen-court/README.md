# 墜庭 FALLEN COURT — 原始碼

2.5D 斜俯視自由探索、三人小隊、日式回合制（行動順序條）的撿寶 RPG。第一卷「壓艙層」完整：序＋四個戰鬥區＋兩個據點、兩名同伴、五個大抉擇、層主與終幕。
Canvas 2D，純 JavaScript，沒有框架、沒有外部函式庫（只有 Google 字型）。人物、怪物、場景、立繪全部用程式畫（彩窗＋金繼風格）。
收藏庫裡的 `games/fallen-court/` 是打包後的單檔版本，要改遊戲請改這裡。完整企劃（世界觀、戰鬥規則、裝備與詞條、敵人、劇情與五個抉擇）在 `DESIGN.md`。

> PZ 明確要求：**不是戰棋、沒有格子、不走位**。地圖用格子寫只是美術與碰撞的單位，畫面上不能出現格線；戰鬥是站定對打的回合制。改戰鬥或地板貼圖時不要違反這一點。

## 組建

```bash
python3 build.py      # dist/artifact/index.html（Claude 版）與 dist/web/（獨立網頁版：index.html＋manifest＋圖示）
python3 tests/icons.py  # 重畫圖示（用遊戲自己的彩窗），輸出到 assets/
```

把 `dist/web/*` 複製到 `_build/raw/fallen-court/`，再照 `_build/README.md` 的流程組收藏庫；收藏庫的截圖步驟在 `tests/shots_steps.py`（擺設在 `tests/showcase.js`）。
Claude 版：用 artifact 工具發布 `dist/artifact/index.html`（目前在 https://claude.ai/artifact/1jK4LV4iKx7t69VENJdsyB ，slug `05e85dde-b761-4553-bc1a-98b1a43ebcd2`；更新時用同一個 slug 重新發布）。**發布之後要宣告能力 `{db: {}, user: {}}`**（新頁面：先發布、再宣告；之後重新發布會沿用），雲端存檔才會動。確認視窗是頁面裡畫的（`confirmBox`），不要改回瀏覽器的 `confirm`。

### 存檔

- 這台裝置：localStorage（`fallencourt.v1`，設定在 `fallencourt.set`；讀寫失敗時退回記憶體）。戰後、過場、進出區域自動存，另外每 20 秒存一次位置。
- **存檔只寫「接得下去」的狀態**（`saveGame`，`10_world.js`）。劇情跑到一半（`S.cut`）、或一場遭遇從戰前的話到戰後的話結束之前（`S.hold`），要存也先記著不寫，整段結束才存。不這樣做的話，在過場中途關掉遊戲會留下半套進度——第一次發布的版本就有這個洞：在覆舟營第一段話講到一半關掉，骸骨坡永遠不會開放。
  - 打贏、戰利品一入袋就存一次（`engageRun`）；戰後還有話要講的，存檔裡記 `G.pend = { enc }`，讀檔後（`afterLoad` → `resumePend`）從那段話的開頭接著演，不用重打。從別段劇情裡打起來的遭遇（`fight()`）不存：那一整段劇情算一件事。
  - 終幕三幕之間各存一次（`checkpoint('n_cutlink')`），在哪一幕關掉就從哪一幕接；`vol1_done` 一立就存。要在劇情裡加存檔點，只能加在「這之前的事都交代完了」的地方，用 `checkpoint()` 或 `saveHere()`，不要直接呼叫 `saveGame(true)`。
  - 剛到一個區域的那段話（`arrive_<區域>`）讀檔後會補演（它們都用旗標記得自己演過沒有）。新寫的 `arrive_` 劇情一定要照這個寫法：開頭 `if (旗標) return; flag(旗標)`。
  - 頁面被收起來（切到別的 App、鎖螢幕、關分頁）時存一次、雲端那一筆也馬上送。
  - 改這一段、或改了任何會設旗標的劇情流程，要跑 `python3 tests/resume.py`。
- 存檔碼：設定頁可匯出／匯入（Claude 版與網頁版互通）。
- **雲端（只有 Claude 版）**：`10b_cloud.js`。頁面有 `window.claude` 時，把同一份存檔另外寫到 `db` 的 `data/users/<自己>/save`（每個人自己的、別人看不到），換裝置或清掉瀏覽器資料都接得回來。網頁版沒有 `window.claude`，整段不會動——兩個版本是同一份程式。
  - 內容真的變了才寫（只有位置和時鐘在動不寫）、隔幾秒寫一次、一次一筆。寫失敗：暫時的狀況（連不上、太頻繁、不認得的錯誤代碼）自己再試——先隔幾秒，再不行每半分鐘一次；沒有權限、被收回、資料太大這一類（`CLOUD_END`）就當「這次沒有雲端」，遊戲照常。
  - 一份存檔約 5～35 KB，離單筆 256 KiB 的上限很遠。
  - 開機時比兩邊的最後存檔時間（`G.ts`）：雲端新、這台又同步過 → 直接接上；這台有沒同步過的進度、或已經在玩了雲端才回話 → 跳「有兩份進度」讓玩家選。
  - 雲端還沒回話時片頭的按鈕會先等它（最多 5 秒），免得新遊戲蓋掉另一台的進度。
  - 改這一段一定要跑 `python3 tests/cloud.py`（用假的 `window.claude` 跑十一種情境）。

## 結構（`src/` 依檔名順序串成一支 script）

| 檔案 | 內容 |
|---|---|
| `00_head.html`、`00_style.css` | HTML 骨架、全部 CSS（鉛條玻璃＋金繼裂紋介面；直拿、橫拿、電腦三種排法） |
| `01_util.js` | 數學、亂數、顏色、DOM 小工具、`store`、全域 `S`（介面與設定）`G`（存檔）`Z`（目前區域）`B`（目前戰鬥） |
| `02_data.js` | 系、狀態、全部招式（`SK`）、三名角色與天賦（`HERO`）、升級門檻、規則常數（`RULE`） |
| `03_items.js` | 部位、42 條詞條（`AFF`）、16 件金繼（`LEG`）、掉落（稀有度權重、貼心掉落、保底）、強化／重鑄／金繼、`calcHero`（角色最終屬性）、共鳴系 |
| `04_foes.js`、`04b_enc.js` | 敵人（特性、招式、蓄力）、地利（`SCENE`）、每一場遭遇（`ENC`） |
| `05_maps.js` | 七個區域的地圖（用程式蓋）、戰鬥站位（`formation`）、所有可互動的東西與觸發點 |
| `06_story.js`、`06b_story.js`、`06c_story.js` | 劇情：腳本框架（`runScript`、`lines`、`say`／`choose`）、每一段對話與抉擇、營火夜話、終幕（`epilogue`）、十二片殘窗的文字、左上角的目標提示（`currentObjective`） |
| `07_audio.js` | WebAudio 即時合成：低鳴、玻璃琴動機、戰鬥層、約 50 種音效 |
| `08_iso.js` | 斜俯視投影、鏡頭、地塊與物件貼圖（快取）、光照圖、粒子、`renderWorld` |
| `09_units.js`、`09b_glass.js` | 人物與怪物的程序骨架；彩窗半身像、小頭像、片頭與殘窗的大花窗 |
| `10_world.js` | 存檔、區域載入、自由走動與尋路、互動、遭遇偵測、`doBattle`（戰鬥銜接、人手不足時的調整）、戰後掉落 |
| `10b_cloud.js` | 雲端存檔（只有 Claude 版會動，見上面「存檔」） |
| `11_battle.js` | **戰鬥引擎，純邏輯、不碰畫面**：順序條、浮與墜、蓄力與打斷、連攜與共鳴、合體技、所有詞條／金繼／天賦的觸發、敵人 AI、`bPreview`（複製一份試打＝出手前的預覽） |
| `12_present.js` | 戰鬥演出：照引擎吐出的事件列播放（衝上去、命中、浮空、墜擊、特寫）、戰鬥鏡頭（`camFit`；直拿時把隊形收攏讓人畫大一點 `fitFormation`）、頭上的血條／意圖／預覽（意圖牌會自己避開別人的血條） |
| `13_ui.js`、`13b_menus.js` | 探索 HUD、對話、戰鬥指令與敵情、戰利品、選單（隊伍／背包／秤簿／殘窗／圖鑑／設定）、鍛爐、刻台、藥棚、聽風板、秤婆的攤子、層圖 |
| `14_main.js` | 開機、片頭、觸控／滑鼠／鍵盤、主迴圈 |

## 劇情怎麼寫

每段劇情是 `SCRIPTS.<id> = async () => { await lines(['yuan', '…'], [null, '旁白'], ['?luo', '他在隊上才會說']); const k = await choose([...]); … }`。
地圖上的東西用 `script` 指到 id；遭遇前後自動找 `pre_<遭遇 id>`、`post_<遭遇 id>`；第一次進區域找 `arrive_<區域>`。
世界記帳：`flag()`、`addRep('ji'|'bang'|'shou', n)`、`addAff('yuan'|'luo', n)`、`deed('秤簿上的一行')`。玩家只看得到秤簿的敘述句，看不到數字。
在腳本裡開打用 `await fight('<遭遇 id>')`，打完的後續一律寫在 `post_<遭遇 id>`（輸了回營再回來打，也會走到）。

## 測試（需要 Node、Playwright＋/usr/bin/google-chrome）

```bash
node tests/maps.js                 # 地圖：連通、遭遇站位、殘窗與出口站得上去
node tests/sim.js all 30           # 機器人把每一場遭遇打 30 次：勝率、輪數、失血；最後一行是等級曲線
node tests/sim_short.js            # 同伴離隊後（兩人、一人）打後段與層主
python3 tests/full.py all          # 在瀏覽器裡自動玩完整條主線，五種抉擇組合（A～E）各一遍，約 20 分鐘
python3 tests/qa.py 390 844 q      # 選單、對話、戰利品等畫面逐一截圖到 /tmp/fc
python3 tests/qa_battle.py 390 844 b o3   # 戰鬥畫面（也可以 844 390、1280 720）
python3 tests/qa_zones.py          # 各區域截圖
python3 tests/cloud.py             # 雲端存檔的十一種情境（假的 window.claude）
python3 tests/resume.py            # 中途關掉再回來：戰後的話、打到一半、終幕的每一幕、剛到新區域、讀存檔碼（約 1 分鐘）
node tests/dump.js                 # 把定案數值倒成表（核對 DESIGN.md 用）
```

`tests/driver.js` 是瀏覽器裡的自動玩家（對話自動過、選項照關鍵字選、戰鬥交給 `tests/bot.js`、走路快轉）；`tests/scenario.js` 是整條主線的步驟。改了劇情旗標或地圖物件 id，這兩支要跟著改。

## 平衡的幾個旋鈕

- 升級門檻 `xpNeed`（`02_data.js`）、敵人隨區域等級的成長 `foeHp`／`foeAtk`（`04_foes.js`）。
- 頭幾場特別放軟：`ENC.<id>.atkK`。
- 同伴離隊後：`doBattle` 裡的 `hpK`／`atkK`，加上 `encFoes`（四個以上的敵群少來一兩個）。
- 目標（機器人的數字，真人大約輪數 ×1.5、失血 ×2）：一般遭遇 2～5 輪、失血 10～35%；精英 6～9 輪；層主 12～16 輪。
