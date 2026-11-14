# PZ 引擎說明書（給之後做遊戲的 Claude）

痞子葳（PZ）所有 **2D 遊戲**共用的引擎。做新遊戲、改舊遊戲之前先讀完這份；細節以 `src/` 每個檔案開頭的說明為準（那裡有每個函式的用法）。
**樣品館**（`lab/`）是會動的範例：打擊感、上千隻怪物、各種操作、戰略鏡頭、聲音、後製、介面劇情，寫法照抄就對了。

---

## 0. 鐵律（先看）

1. **冷眼（repo `coldeye-etf`）永遠獨立，不准用引擎、不准改、不准「順便」動到。** PZ 原話：「冷眼是我最最最最重要‼️的一個APP，無論如何，都是需要獨立去對待的。」收藏庫目錄裡冷眼那一筆、全知（只讀冷眼資料的看板）也一樣不要碰引擎。
2. 新的 2D 遊戲一律用這個引擎。3D 遊戲目前不在範圍（引擎只做 2D；潮界那種真 3D 照舊用 three.js）。
3. 每款遊戲都要有 **Claude 版（artifact）＋獨立網頁版**，並且**自動加進《PZ 遊戲收藏》、推上 GitHub**（不用等 PZ 開口）。流程見第 15 節。
4. 品質門檻：**至少《潮界》的水準**。不能看起來廉價、角色不能太小（手機直拿時主角至少佔畫面短邊的 8～10%；`PZ.cam.fit(360～440)` 是常見範圍）。用程式畫的美術要有光影：漸層、邊光、陰影（照 `lab/src/01_art.js` 的做法）。
5. 遊戲裡所有文字、說明、這份文件：**繁體中文**。寫給玩家看的字不要出現程式用語。
6. 引擎**鎖版本**：遊戲在 `pz.json` 寫 `"engine": "1.0"`，組建時把那一版引擎整份包進遊戲。改引擎不會讓已上架的遊戲壞掉，除非重新組建那款遊戲（第 16 節）。

---

## 1. 檔案地圖

```
_build/engine/
  HANDBOOK.md        這份
  README.md          一頁簡介＋常用指令
  CHANGELOG.md       引擎每一版改了什麼
  VERSION            目前版本（例如 1.0.0）
  src/               引擎原始碼，依檔名順序組成一支 JS（全部包在 IIFE 裡，只公開 window.PZ）
    00_head  01_math  02_color  03_events  04_time  05_screen  06_input  07_gl  08_c2d
    09_art  10_text  11_draw  12_camera  13_tween  14_particles  15_fx  16_audio  17_music
    18_save  19_cloud  20_scene  21_ui(.css/.js)  22_dialogue  23_debug  24_boot
    25_light（光影、陰影、水面）  26_weather（天氣）  27_cinema（調色、黑邊）  28_anim（程序動畫、鏈子、逐格動畫）  29_rig（骨架角色）
    30_world（格子地圖、碰撞、視野、尋路、流場、程序生成）  31_tiles（地圖畫法：2.5D 地牢、洞窟、島嶼、等高線）
  build/pz-engine.js       開發版（每次 build_engine.py 覆蓋）
  releases/pz-engine-X.Y.Z.js   正式版（發了就不再改）
  tools/
    build_engine.py   組引擎（--release 出正式版）
    pzbuild.py        組一款遊戲（Claude 版＋網頁版）
    test_engine.py    引擎全套檢查（--perf 效能、--webkit Safari 引擎）
    webkit_check.py   在 WebKit（iPhone Safari 的引擎）裡跑自我檢查或任一頁
    shot.py / labshot.py   截圖
  tests/unit/         Node 單元測試（數學、顏色、事件、時間、存檔、音效合成）
  tests/browser/      selftest.html（136 項）、interact（真的點擊／觸控）、run_cloud（雲端存檔九種情境）、run_example（範例能玩）
  lab/                樣品館（自己也是一款用引擎做的 App）
  examples/hello/     最小範例（第 3 節那份程式，測試會實際玩它）
```

用到引擎的遊戲原始碼放 `_build/sources/<遊戲 id>/`（第一款：`_build/sources/last-order/`，搬家的完整範例）。

---

## 2. 引擎幫你做好的事（不要自己重寫）

| 面向 | 引擎做了什麼 |
|---|---|
| 畫面 | WebGL2 批次繪圖（3000 貼圖＋3000 粒子 JS 每格約 1 ms、2 次繪圖呼叫）；WebGL 不能用或遺失救不回來時自動換 Canvas2D；圖集自動打包；中文字型圖集＋中文斷行（標點不放行首） |
| 螢幕 | 手機／平板／電腦／4K 電視都正確：裝置像素比上限 2、總像素上限（手機 320 萬、電腦 840 萬）、iPhone 瀏海安全區（CSS 變數 `--pz-safe-t/r/b/l`）、直橫限制提示、全螢幕、螢幕常亮 |
| 時間 | 可變步長（60/120/240Hz 都順）或固定步長、打擊停頓、慢動作、暫停（可帶原因）、計時器、切到背景自動暫停 |
| 畫質 | 自動畫質：連續卡頓就降一階（解析度、泛光、粒子），夠順再升回去；降過的會記在這台裝置 |
| 輸入 | 動作對應（鍵盤＋滑鼠＋手把＋觸控同一套）、浮動／固定虛擬搖桿、觸控按鈕、手勢（點、雙擊、長按、雙指縮放旋轉、滾輪）、手把震動、手機觸覺（iPhone 也有）、失焦自動放開按鍵 |
| 手感 | 震動（trauma 模型）、後座力、鏡頭推近、打擊停頓、慢動作、閃光、色差、暗角、衝擊波扭曲、傷害數字、18 種粒子、一行完整打擊感 `PZ.fx.hit` |
| 聲音 | 第一次點擊同步解鎖、**iPhone 側邊靜音鍵打開也有聲音**、4 條音量匯流排、限幅器、殘響、47 個內建合成音效（背景執行緒算好）、文字寫譜的配樂＋緊張度分層 |
| 存檔 | 自動存＋備份＋版本升級 migrate＋存檔碼（換手機、Claude 版↔網頁版）＋多存檔欄；**Claude 版自動雲端存檔** |
| 設定 | 標準設定頁：音樂、音效、畫面震動、閃光、觸覺、傷害數字、畫質、鎖幀、觸控按鈕大小、存檔碼；新遊戲沿用玩家上次在別款調好的偏好 |
| 介面 | DOM 介面元件（對話框、選擇、提示泡泡、大標題、載入畫面、暫停選單）、主題、手把／鍵盤焦點導覽、劇情對話（打字機、選擇、自動、快轉、紀錄） |
| 除錯 | 出錯時畫面下方跳紅色面板（可複製錯誤給 Claude、繼續玩）、效能面板（網址加 `?debug` 或按 F3）、測試掛鉤 `window.__pz` |
| 收藏庫 | 在《PZ 遊戲收藏》裡打開 PZ 圓鈕選單時自動暫停（`PZ.on('hub', open => …)`） |

---

## 3. 開一款新遊戲

### 3.1 資料夾

```
_build/sources/<遊戲 id>/
  pz.json            遊戲資訊（見下面）
  src/index.html     （可省略）放進 #pz-ui 的 DOM 介面（HUD、選單）
  src/*.css          （可省略）遊戲自己的樣式
  src/*.js           遊戲程式，依檔名順序串起來（建議 01_data、10_art、20_play、99_main 這樣編號）
  assets/            （可省略）圖片、音檔：自動變成 PZ_ASSETS['檔名'] 的 data URL；assets/icon.png（1024×1024）當 App 圖示
  tests/             這款的瀏覽器測試（照 last-order/tests/flow.py）
  README.md          怎麼組建、測試、結構、規矩（照 last-order 的寫）
```

`pz.json`：

```json
{
  "id": "night-shift", "title": "夜班", "en": "NIGHT SHIFT", "version": "1.0.0",
  "engine": "1.0",
  "background": "#07090d", "accent": "#ffb547", "orientation": "any", "icon_char": "夜",
  "fonts": { "PZ Sans": "sans-black" },
  "head": "<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Silkscreen&display=swap\">"
}
```

- `engine`：`"1.0"` 用 releases/ 裡最新的 1.0.x；`"1.0.0"` 鎖死這一版；`"dev"` 用開發版（只在改引擎時用）。
- `fonts`：嵌入字型（只留遊戲用到的字，自動子集化）：`sans-regular/medium/bold/black`、`serif-regular/bold/black`，或字型檔路徑。標題用粗體、內文用一般體，不要整款只嵌一個 black（字會全部很粗）。
- `orientation`：`portrait`／`landscape`／`any`（PZ.start 也要給一樣的值，拿錯方向時引擎會蓋提示並暫停）。

### 3.2 最小範例（`examples/hello/src/10_main.js`，測試會實際玩它）

```js
// 1) 美術：用程式畫，收進圖集（在 load 裡畫，繪圖器已經準備好）
function makeArt() {
  PZ.art.make('hero', 48, 56, (c, w, h) => {
    c.fillStyle = '#ffb547'; c.beginPath(); c.roundRect(10, 18, 28, 34, 8); c.fill();
    c.fillStyle = '#ffe0b0'; c.beginPath(); c.arc(w / 2, 14, 11, 0, Math.PI * 2); c.fill();
  });
  PZ.art.make('slime', 44, 34, (c, w, h) => { /* …漸層橢圓… */ });
}

// 2) 場景：enter 準備、update 邏輯、render 畫圖
PZ.scene('play', {
  bg: '#0b0f17',
  enter() {
    this.p = { x: 0, y: 0 }; this.foes = []; this.kills = 0;
    PZ.cam.fit(420);                                   // 短邊看得到 420 個世界單位
    PZ.cam.follow(this.p, { lerp: 8, lead: 0.2 });
    PZ.input.stick({ target: 'move' });                // 手機：浮動搖桿（鍵盤 WASD、手把左類比自動合併）
    PZ.input.button({ action: 'fire', label: '攻擊' });
    PZ.every(1.1, () => { const a = PZ.rand.angle(); this.foes.push({ x: this.p.x + Math.cos(a) * 320, y: this.p.y + Math.sin(a) * 320, hp: 3 }); });
  },
  update(dt) {
    const m = PZ.input.move, p = this.p;
    p.x += m.x * 190 * dt; p.y += m.y * 190 * dt;
    if (PZ.input.pressed('fire')) for (const f of this.foes) if (Math.hypot(f.x - p.x, f.y - p.y) < 80) {
      f.hp--; PZ.fx.hit(f.x, f.y, { power: 0.5, dir: Math.atan2(f.y - p.y, f.x - p.x), kill: f.hp <= 0 });
      PZ.fx.number(f.x, f.y - 24, 1);
    }
    this.foes = this.foes.filter((f) => f.hp > 0);
  },
  render(g) {
    PZ.particles.draw(g, 'under');
    for (const f of this.foes) g.sprite('slime', f.x, f.y);
    g.sprite('hero', this.p.x, this.p.y);
    g.hud();                                           // 之後畫的不受震動與後製影響
    g.text('擊倒 ' + this.kills, 16, 16, { size: 20, weight: 900, color: '#fff', outline: 3 });
  },
});

// 3) 啟動
PZ.start({ id: 'hello-pz', title: '你好 PZ', binds: { fire: ['Space', 'KeyJ', 'PadA', 'Mouse0'] }, async load() { makeArt(); }, first: 'play' });
```

### 3.3 組建

```bash
cd _build/engine
python3 tools/pzbuild.py ../sources/<id>           # → dist/artifact/index.html（Claude 版）＋ dist/web/（網頁版）
python3 tools/pzbuild.py ../sources/<id> --dev     # 用開發版引擎（改引擎時）
```

組建會：串 CSS／JS、把 `index.html` 放進 `#pz-ui`、內嵌素材與子集化字型、設 `window.PZ_GAME`（pz.json 內容）與 `window.PZ_ASSETS`、做 App 圖示（沒給就用 `icon_char`＋`accent` 自動畫）。

---

## 4. 啟動與場景

```js
PZ.start({
  id: 'night-shift',              // 存檔、設定的名字（不要改，改了玩家進度就不見）
  title: '夜班', version: '1.0.0',
  orientation: 'any',             // 'portrait' | 'landscape' | 'any'
  background: '#07090d',
  fit: 420,                       // 等於一開始 PZ.cam.fit(420)
  step: 0,                        // 0＝可變步長（預設，最順）；1/60＝固定步長（要可重現、或沿用舊遊戲的手感）
  theme: 'night',                 // 介面主題名字或 { accent: '#f5a', font: '…', … }
  fonts: ['PZ Sans'],             // 等嵌入字型載好才畫字
  settings: { music: 0.6 },       // 這款的預設設定
  binds: { fire: ['Space', 'PadA', 'Mouse0'] },
  post: { bloom: { strength: 0.5, threshold: 0.8 }, vignette: 0.3, grain: 0.03 },   // 或 false 關掉後製
  quality: 2,                     // （可省略）起始畫質階：0 流暢～3 極致；預設手機 2、電腦 3
  loading: true,                  // 有 load 時顯示載入畫面（false 不顯示）
  async load(progress) { …畫圖、定義音效與配樂… progress(0.5, '畫地圖'); },
  scenes: { title: {...}, play: {...} },   // 也可以另外 PZ.scene()
  first: 'title', firstParams: null, firstTransition: 'fade',
});
```

場景：

```js
PZ.scene('play', {
  bg: '#101418',                  // 底色
  ui: () => '<div class="hud">…</div>',   // 這個場景的 DOM 介面（進場放進 #pz-ui，離場拿掉；PZ.scenes.uiEl 拿得到）
  keepCamera: false,
  enter(params) {},               // 可以 async（載入時轉場蓋著）
  exit() {},
  update(dt) {},                  // 遊戲邏輯；暫停、打擊停頓時不會被呼叫
  render(g) {},                   // 每格畫圖；一開始是世界座標
});
await PZ.go('play', { stage: 2 }, { type: 'fade', time: 0.35, color: '#000' });   // fade｜iris｜wipe｜none
PZ.restartScene();
```

換場景時引擎會清掉：遊戲時間的計時器、補間、屬於上一場景的彈簧、粒子、跳字、震動、按住的按鍵、**在上一場景裡建的**虛擬搖桿與按鈕（在 `load` 裡、或加 `keep: true` 建的會留著；全部拿掉用 `PZ.input.clearTouch()`）。**用 `PZ.on()` 掛的事件要自己在 `exit()` 拿掉**（`PZ.on` 回傳取消函式）。

事件（`PZ.on(名字, fn)` → 回傳取消函式）：`ready` `scene` `resize` `pause` `resume` `hidden` `visible` `device`（輸入裝置換了：touch／mouse／keyboard／gamepad）`pad` `tap` `longpress` `quality` `renderer` `contextlost` `contextrestored` `audio` `audiostate` `bar`（配樂每小節）`setting` `save` `saveload`（存檔碼／雲端讀進來了）`cloud` `hub`（收藏庫選單開關）`error`。

---

## 5. 時間

- `dt`：秒。`PZ.time.t`（遊戲時間）、`PZ.time.real`（真實時間）、`PZ.time.rdt`（這格的真實秒數，畫面動畫用）、`PZ.time.alpha`（固定步長時的插值）。
- `PZ.freeze(ms)` 打擊停頓（取最長、不累加）；`PZ.slowmo(0.25, 秒數, 回復秒數)`；`PZ.pause('menu')` / `PZ.resume('menu')`（多個原因全部解除才恢復）；`PZ.isPaused()`。
- 計時器跟遊戲時間走（暫停、停頓時不動）：`PZ.after(秒, fn)`、`PZ.every(秒, fn)`、`await PZ.wait(秒)`；跟真實時間：加 `{ real: true }` 或 `PZ.waitReal(秒)`。
- 自己的系統：`PZ.addSystem({ name, order, frame(rdt), update(dt, first), render(g) })`。

---

## 6. 畫圖（`render(g)` 的 g）

座標空間：`g.world()`（跟著相機，render 一開始就是）→ `g.screen()`（CSS px，左上 0,0）→ `g.hud()`（**場景畫完時呼叫一次**：做後製；之後畫的 HUD 不受震動與後製影響）。

```js
g.sprite('hero', x, y, { r: 角度, s: 縮放, sx, sy, a: 透明度, color: 上色, add: 發光 0～1, flash: 閃白 0～1, ax, ay })
g.spr(frame, x, y, r, sx, sy, a, color, add, flash)     // 熱迴圈用：不產生物件（frame 先 PZ.art.get('hero') 存起來）
g.tile(frame, x, y, w, h, { … })                        // 重複貼
g.rect(x, y, w, h, color, { a, add, r, ax, ay })   g.fill(color, a)（整個畫面）
g.circle(x, y, r, color, { a, add })   g.ellipse(x, y, rx, ry, color)   g.ring(x, y, r, 粗細, color)
g.glow(x, y, r, color, { a, core })     // 柔光（燈、火、槍口光）；預設疊加發光
g.line(x1, y1, x2, y2, 粗細, color, { a, add, cap: 'round' })   g.poly([x0,y0, x1,y1, …], color)
g.polyTex([x0,y0, …], 'grass', { s, color })            // 任意凸多邊形貼材質（PZ.art.pattern 做的，照世界座標一直重複）
g.trail(點陣列, 頭寬, 尾寬, 頭色, 尾色, { add })        // 刀光、拖尾
g.text('字', x, y, { size, color, weight, outline, outlineColor, shadow, align: 'left|center|right', baseline, maxWidth })
g.bar(x, y, w, h, 比例, { bg, fg, back })               // 血條（back＝受傷時慢慢退的那段）
g.into('decals', () => { …畫進畫布貼圖… })              // 留在地上的血跡、彈孔、迷你地圖
g.save() g.restore() g.translate() g.rotate() g.scale() g.alpha(a) g.blend('add'|'normal')
g.visible(x, y, 邊界)                                   // 在畫面裡才畫（大量物件時先判斷）
```

- **顏色用字串**（`'#ff8800'`、`'rgba(…)'`、`'hsl(…)'`）。直接寫數字 `0xff8800` 會被當成打包格式（0xAABBGGRR）而變透明。熱迴圈裡可以先 `PZ.color('#f80')` 轉好。
- 前後遮擋：每格依 y 排序，用 `PZ.sortBy(陣列, 'y')`（幾乎排好的陣列很快）。
- 大量物件的鄰近查詢：`new PZ.Grid(格子大小)` 的 `insert`／`query`／`nearest`；碰撞小工具 `PZ.hit`；物件池 `PZ.pool(make, reset)`。

### 6.1 美術（圖集）

```js
PZ.art.make('hero', 46, 64, (c, w, h) => { …Canvas2D 畫… }, { scale: 2, anchor: [0.5, 0.9], pixel: false })
PZ.art.sheet('run', 8, 46, 64, (c, w, h, i) => { …第 i 格… })   // 動畫格 run:0～run:7；PZ.anim(frames, fps) → (t) => frame
await PZ.art.image('bg', PZ_ASSETS['bg.png'], { density: 2 })   // 外部圖片
PZ.art.canvas('hero') / PZ.art.url('hero')                      // 轉成 DOM 畫布／圖片網址（頭像、按鈕圖示）
PZ.art.target('decals', w, h)  然後 g.into('decals', …)         // 畫布貼圖
PZ.art.live('world', 畫布, { pixel: true })  每格畫完 f.refresh() // 一直在變的畫布（舊遊戲搬家、動態面板）
PZ.art.pattern('grass', 64, 64, (c, w, h) => { … })              // 會一直重複的材質（自己一張貼圖）：給 g.polyTex、地圖的等高線用
PZ.art.make('floor', 128, 128, draw, { wrap: true })            // 要用 g.tile 鋪滿的地板：留白填上另一邊的內容，接縫不會有細線
```

- 畫圖時 `scale`（像素密度）預設 2：圖在高解析度螢幕上才清楚。像素風用 `pixel: true`（最近鄰，不模糊）。
- WebGL 遺失恢復時引擎會用 draw 函式重畫整個圖集：**draw 函式不要依賴會變的外部狀態**。
- 有質感的程式美術：漸層＋邊光（`rimShape`）＋陰影＋高光，見 `lab/src/01_art.js`（主角、怪物、建築、樹、頭像）。

### 6.2 文字

`g.text` 用中文字型圖集：每個字第一次出現時畫一次，之後跟圖片一樣批次畫。`PZ.text.measure(字串, 樣式)`、`PZ.text.wrap(字串, { size, maxWidth })`（中文斷行規則）。大段文字、可選取的字、輸入框用 DOM（`#pz-ui`）。

### 6.3 光影與陰影（PZ.light）

夜晚、地牢、恐怖、潛行類遊戲的靈魂。開了之後整個畫面先變暗（環境光），燈照到的地方才亮，牆會擋光、影子邊緣是柔的。

```js
PZ.light.on({ ambient: '#1a2234' })                 // 環境光：沒照到的地方剩多亮（'#fff'＝白天，看起來跟沒開一樣）
const torch = PZ.light.add({ x, y, r: 300, color: '#ff9a3c', intensity: 1.3, flicker: 0.22, glow: 0.6 })
const flash = PZ.light.add({ follow: hero, oy: -24, r: 520, cone: 0.4, dir: 角度, color: '#fff1d6', intensity: 1.5 })   // 手電筒
flash.dir = hero.aim;  torch.fade(0, 0.5);  torch.remove();
PZ.light.box(x, y, w, h)  PZ.light.circle(x, y, r)  PZ.light.poly([…])     // 會擋光的牆、柱子、箱子（回傳的物件可以改位置）
PZ.light.occluders((g) => { for (const m of monsters) g.sprite(m.frame, m.x, m.y, { silhouette: true }); })   // 用圖形狀擋光（每格畫一次）
PZ.light.zone(x, y, w, h, { ambient: '#fff', soft: 60 })   // 這一塊換一種環境光：屋內暗、院子亮；側視遊戲的天空與遠景
PZ.light.flash(0.8, 0.25)                           // 打雷、爆炸：環境光瞬間變亮
PZ.light.at(x, y)                                   // 這點多亮（0 全黑、1 原色）：潛行遊戲判斷「主角在不在光裡」、怕光的怪
PZ.light.blocked(x0, y0, x1, y1)                    // 兩點之間有沒有被牆擋（視線、AI）
```

render 裡的順序：

```js
render(g) {
  畫地板、牆、角色、地上的東西…            // 這些會被照亮／變暗
  g.lighting();                             // ← 套用光影（沒寫的話 g.hud() 會自動套）
  畫燈泡、火焰、霓虹字、怪物的眼睛…         // 之後畫的不受明暗影響：會「發光」
}
```

- 燈的參數：`r` 半徑、`intensity`（1＝把原色照到最亮，超過 1 會曝光、配泛光會發光）、`flicker` 閃爍（火把 0.2、壞掉的燈 0.6）、`cone` 半張角（弧度，不給＝四面八方）、`dir` 方向、`size` 光源大小（越大陰影越柔）、`fall` 衰減（越大光越集中）、`haze` 霧裡看得到的光、`glow` 光源本身畫一顆光點、`shadows: false` 不算陰影、`screen: true` 用螢幕座標。
- 牆上的火把放在牆裡也可以（引擎會忽略燈旁邊那段牆）；牆面、柱子朝燈那一側會有一圈亮邊（`PZ.light.on({ soak })` 調寬度）。
- 角色投影：`g.castShadow('hero', x, y, { len, a })` 自動朝「離最亮那盞燈」的方向拖（沒有燈就用 `PZ.light.sun`）；側視遊戲加 `flat: true`（影子貼在地上）。
- 光束：`g.beam(x, y, 角度, 長度, 起寬, 終寬, color, { a, end })`（窗戶的光、探照燈、路燈下的光柱）。
- 畫質自動調：低畫質時光照圖解析度降低、陰影步數變少，最低一階不算陰影；Canvas2D 後備模式只有光、沒有陰影。
- 側視遊戲：天空與遠景用 `PZ.light.zone()` 圈起來保持原色，燈光只影響近景（範例：樣品館「天氣與水面」）。

### 6.4 天氣（PZ.weather）

```js
PZ.weather.set('rain')                              // 'rain' 'drizzle' 'storm'（雷雨）'snow' 'blizzard' 'fog' 'mist' 'clear'
PZ.weather.set('snow', { amount: 0.6, wind: -0.3, time: 4 })   // 強度、風、幾秒變過去
PZ.weather.mix({ rain: 0.5, fog: 0.8, lightning: 0.3 })        // 自己調配方
PZ.weather.wind = 0.4;  PZ.weather.strike({ x, y })            // 馬上打一道雷（閃光、照亮、延遲的雷聲）
PZ.weather.ground = (x) => y                        // 側視遊戲：雨滴濺在哪條線上（俯視不用設）
```

霧畫在光影之前（會被燈照亮，手電筒照進霧裡有光柱）；雨雪畫在光影之後（燈下閃亮、黑暗裡淡淡的）。數量跟著畫質自動調；場景切換時清掉。

### 6.5 水面與熱浪

```js
g.water(x, y, w, h, { mode: 'mirror', color: '#123a4a', depth: 0.45, reflect: 0.65, ripple: 3, foam: 0.5, sky })   // 側視：倒映水面上方
g.water(x, y, w, h, { mode: 'flat', shape: 'ellipse' })   // 俯視水窪、池塘：波光＋水下扭曲
g.haze(x, y, w, h, { strength: 4 })                        // 火堆上方、沙漠、傳送門的熱浪扭曲
```

水面會「抓」目前畫好的畫面來倒映：**要畫在被倒映的東西後面**（側視：放在 g.lighting() 和發光物之後，倒影裡才有燈和霓虹）。

### 6.6 調色與電影黑邊

```js
PZ.post.grade('cinema')                  // 青橘電影；還有 warm cold noir sepia horror dream night sunset neon toxic vivid bleach retro（PZ.post.grades 有中文名）
PZ.post.grade('noir', { time: 1.5, amount: 0.8 })     // 1.5 秒換過去、強度八成
PZ.post.grade({ temp: 0.4, sat: 1.2, contrast: 0.2, lift: [0, 0, 0.05], split: { shadow: '#0f6f7d', highlight: '#ffad6a', amount: 0.3 } })
PZ.post.grade(null)                      // 回到原色
PZ.fx.letterbox(0.12)                    // 電影黑邊（上下各 12%）；PZ.fx.letterbox(0) 收起來
```

調色是一張 16³ 的調色表（LUT），在後製一次算完，幾乎不花效能；換調色會自動淡入淡出。過場、回憶、夢境、中毒、夜晚都可以用。


---

### 6.7 世界與地圖（格子地圖、碰撞、視野、尋路、程序生成）

```js
const map = PZ.tilemap({ w: 64, h: 48, size: 32 });          // size＝一格幾個世界單位；地圖外預設當成牆
map.fromText(`#####\n#.@.#\n#####`, { '#': 1, '.': 0 })      // 用文字畫，回傳每個字出現的位置；或 map.fromGrid(PZ.gen.dungeon(64, 48).grid)
map.get(x, y)  map.set(x, y, 1)  map.layer('deco')  map.isSolid(x, y)  map.cellX(世界x)  map.cx(格x)（格子中心的世界座標）
map.move(body, dx, dy)          // body = { x, y（中心）, w, h }：撞牆貼著滑，再快也不穿牆；回傳 { left, right, up, down }
                                // 側視遊戲的單向平台：PZ.tilemap({ oneway: (v) => v === 2 })（從下面跳得上去、站得住；body.dropping 往下穿）
map.raycast(x0, y0, x1, y1)     // { hit, x, y, t, cx, cy, nx, ny }（子彈、雷射、視線）；map.los(…) 看不看得到
map.fov(cx, cy, 半徑, out)        // 視野（戰爭迷霧、潛行）：看得到的格子設 1；第 5 個參數換「什麼擋視線」（島上的海不擋）
map.nearestOpen(cx, cy)  map.mask4 / mask8（自動接邊）  map.rects()（合併成大方塊）  map.forEach((x, y, v) => …)
map.lightBoxes({ lift })        // 牆擋光：一行交給 PZ.light（2.5D 牆給 lift＝牆高，牆面才照得到火把）
map.draw(g, style, { actors, drawActor: (g, a) => … })   // 畫地圖；角色依腳底 y 跟牆一列一列交錯：走到牆後面會被牆頂擋住
```

- **尋路**：`PZ.path.find(map, sx, sy, tx, ty)`（A*，八方向、不切牆角，走不到回 null）→ `PZ.path.smooth(map, 格子)` 拉直成世界座標的折線（看得到就直走）。
- **上百隻怪追同一個目標用流場**（不要每隻跑 A*）：`const f = PZ.path.flow(map, { max: 60 })`；每格 `f.update(主角.x, 主角.y)`（主角換格子才重算）；怪 `const d = f.dirAt(x, y)` 往 `d.x, d.y` 走、`f.distAt(x, y)` 還有幾步（太遠的不追）。怪彼此推開用 `PZ.Grid`，撞牆一樣 `map.move`。
- **程序生成**（同一個 seed 每次一樣）：`PZ.gen.dungeon(w, h, { rooms, min, max, loops, seed })`（房間＋走廊＋幾條環路 → `{ grid, rooms, start, end }`）、`caves(w, h, { fill, steps })`（細胞自動機、只留最大一塊）、`island(w, h)`（高度圖 0～1）、`noise`、`scatter(x, y, w, h, 間距, { test })`（均勻散布：樹、石頭、寶箱）、`distance(grid, w, h)`（離牆多遠：出生點、王房放最空曠的地方）、`regions`（連通區）。斜 45° 視角：`PZ.iso.toScreen / toCell`。
- **畫法 `PZ.tiles`**（材質都是程式畫的）：
  - `dungeon({ floor, cap, brick, height: 0.8 })`：2.5D 地牢——不規則石板地、靠地板的牆畫牆頂（更裡面的實心岩不畫＝黑暗）、朝南的牆畫磚牆正面（苔蘚、裂縫、鐵環）、牆腳陰影、雜物（骨頭、頭骨、排水孔、水窪）。配光影：`map.lightBoxes({ lift: style.lift(map) })`＋`PZ.light.on({ soak: 30 })`（光滲進牆頂，房間輪廓才看得出來）。
  - `cave(map, {…})`：圓滑岩壁（marching squares）、兩段懸崖面＋接地陰影、岩頂材質＋朝南的亮邊、碎石與螢光菇。配光影：`PZ.light.occluders(style.occlude)`；`g.lighting()` 之後呼叫 `style.emissive(g, map)` 畫會發光的菇。
  - `island(map, 高度圖)`：深海（一閃一閃的浪頭）→ 淺灘 → 岸邊白浪一進一退 → 沙灘 → 三層草地 → 岩石，一層一層的等高線，每層有材質。
  - 自己做風格：物件 `{ under, floor(g, map, cx, cy, x, y, s), ground, row(g, map, cy, view), wall(g, map, cx, cy, x, y, s), over }`。圓滑的區塊用 `PZ.tiles.contour(map, 數值圖, 門檻)`：輪廓算一次存起來，`.draw(g, view, { color, tex, dy, rim })`、`.drawRow(g, 列, x0, x1, 層)`（2.5D 跟角色交錯）；每格會變的（浪花）才用 `PZ.tiles.marching` 現算。
- 2.5D 的小細節：會發光的東西（眼睛、火焰）畫在 `g.lighting()` 之後，先用 `map.behindWall(x, y, 離地高度, 牆高)` 看有沒有被前面的牆擋住；戰爭迷霧用一格一像素的 `PZ.art.live` 畫布放大蓋上去（線性內插，邊緣自動柔和）。
- 範例：`lab/src/22_world.js`（地牢／洞窟／島嶼、上百隻怪用流場繞牆追人、點地圖自動找路、戰爭迷霧、小地圖）。

## 7. 相機

```js
PZ.cam.fit(420)                         // 短邊看得到 420 世界單位（手機、平板、電腦看到的範圍一致）
PZ.cam.follow(player, { lerp: 8, lead: 0.25, dead: 0 })   PZ.cam.snap()
PZ.cam.bounds = { x, y, w, h }          // 不要拍到地圖外面
PZ.cam.shake(0.4)                       // trauma：疊加、自己消退；強度平方（小震輕、大震猛）
PZ.cam.kick(角度, px)                   // 往某方向頓一下（後座力、被撞）
PZ.cam.punch(0.06)                      // 推近再彈回
PZ.cam.controls({ pan: true, zoom: [0.5, 3], rotate: true, inertia: true })   // 戰略／模擬類：拖曳、雙指縮放旋轉、滾輪
PZ.cam.toWorldX/Y(sx, sy)  toScreenX/Y(wx, wy)  inView(x, y, 邊界)
PZ.cam.external = true                  // 舊遊戲自己算鏡頭：引擎只提供 PZ.cam.offsetX/Y（震動＋後座力位移）
```

震動幅度 `maxX/maxY/maxR`、衰減 `decay` 可以調。設定頁的「畫面震動」滑桿會自動乘上去。

---

## 8. 手感：補間、彈簧、粒子、打擊感

```js
await PZ.tween(obj, { x: 100, alpha: 0 }, 0.4, 'outBack', { delay, yoyo, repeat: -1, real, from, onUpdate })
PZ.tweens.killOf(obj)
const sp = PZ.spring(1, { k: 320, d: 16 }); sp.target = 1.3;  // 每格讀 sp.value（UI 彈跳、受擊壓扁回彈）
```

粒子：`PZ.particles.emit('sparks', x, y, { angle, spread, count, scale, colors })`。內建：
`sparks hit flare ring blood smoke dust fire debris core explosion magic heal pickup confetti ember muzzle shockring`。
自訂：`PZ.particles.define('myDust', { count, life, speed, angle, spread, drag, grav, size, end, colors, shape, add, stretch, spin, rot, layer, flicker, offset, ease, inherit })`（格式見 `src/14_particles.js` 開頭）。
`under` 層（血、塵土）要在 render 裡自己 `PZ.particles.draw(g, 'under')`；`over` 層沒畫的話 `g.hud()` 前自動補畫。

打擊感（一行就完整）：

```js
PZ.fx.hit(x, y, { power: 0.6, dir: 角度, crit: true, kill: false, sound: 'hit' })   // 停頓＋震屏＋頓鏡＋火花＋（爆擊）閃光色差＋震動＋音效
PZ.fx.explode(x, y, { power: 1, radius: 120 })    // 衝擊波扭曲、閃白、火球、碎片、煙
PZ.fx.hurt(0.5, { dir, sound, freeze, vignette })  // 主角受傷：紅暗角（短、淡；vignette: false 不要）、色差、震動
PZ.fx.number(x, y, 128, { crit, heal, miss, color, size })   PZ.fx.text(x, y, '閃避', 樣式)
PZ.fx.pickup(x, y)   PZ.fx.celebrate(x, y)
// 單項：shake kick punch freeze slowmo flash(color, a, 秒) chroma(量, 秒) vignette(color, 量, 秒) shockwave(x, y, { radius, strength, thick }) haptic rumble
```

- 設定頁的「畫面震動」「閃光」「傷害數字」會自動套用（照顧怕暈、怕閃的人）。自己畫的閃光、數字也要看設定：`PZ.settings.flashScale()`、`PZ.settings.get('numbers')`。
- **一秒好幾發的自動射擊不要每發都震、都頓鏡**，畫面會一直抖；震動留給重的東西（霰彈槍、近戰、爆炸、Boss）。
- 後製參數 `PZ.post`：`bloom: { on, strength, threshold }`、`vignette`、`vignetteColor`、`grain`、`scan`（掃描線）、`warp`（老電視彎曲）、`sat`、`contrast`、`bright`、`tint`。泛光只讓亮過門檻的地方發光（看人眼亮度）：鮮豔的角色主色不會整片發光，疊加發光（`add`）疊出來的白光才會強烈泛光。


### 8.1 角色動畫

讓角色「活」起來的四種工具，從最省事到最完整：

**① 一張圖的角色：`PZ.juice`（程序動畫）**——呼吸、走路一跳一跳、往前傾、轉身像紙片翻過去、起跳拉長、落地壓扁、被打抖動閃白。舊遊戲的角色、怪物、史萊姆、道具，加三行就有生命感：

```js
const j = PZ.juice({ breathe: 0.022, bob: 2.6, lean: 0.1 });    // 參數都可以不給
update(dt) { j.update(dt, { vx, vy, grounded, face }); }        // 都可以不給
render(g) { j.draw(g, 'slime', x, y, { s: 1.2 }); }             // 或 j.pose() 拿 { dx, dy, r, sx, sy, flash } 自己畫
j.hit(0.8, 從哪裡被打的角度)   j.land(0.6)   j.jump()   j.pulse(0.25)
```

**② 會飄的東西：`PZ.chain`**——披風、圍巾、尾巴、頭髮、羽飾、繩子、觸手、旗子：

```js
const tail = PZ.chain({ n: 7, len: 6, gravity: 300, stiff: 0.3 });
每格：tail.pin(x, y, 方向角度); tail.update(dt);    畫：g.chain(tail, { w0: 10, w1: 4, color: '#e2712c', color2: '#fff' })
```

`stiff`（0～1）越大越不容易彎（尾巴、羽飾）；給 `pin` 的角度＝根部朝哪個方向長；`ground` 不會穿到地底；`push(fx, fy)` 爆炸氣流；天氣的風（`PZ.weather.wind`）會吹它。

**③ 逐格動畫：`PZ.animator`**——畫好每一格（`PZ.art.sheet`）的傳統做法：

```js
const an = PZ.animator({ idle: { frames: 'hero_idle', fps: 6 }, attack: { frames: 'hero_atk', fps: 16, loop: false, next: 'idle', events: { 3: 'hit' } } });
an.play('attack');  an.on('hit', () => 判定傷害);  每格 an.update(dt);  g.sprite(an.frame, x, y)
```

**④ 骨架角色：`PZ.rig.humanoid`**（最精緻）——只畫身體各部位，走、跑、跳、落地、蹲、七種招式、受傷、倒下、爬起來全部由引擎算；腳用兩段 IK 踩在地形上，動作之間自動接順，掉幀也不滑步：

```js
const hero = PZ.rig.humanoid({
  scale: 1.15, walkSpeed: 85, runSpeed: 240,
  parts: { head, torso, pelvis, upper, fore, hand, thigh, shin, foot },   // 圖的名字；後面那隻手腳自動調暗（backTint）
  weapon: { frame: 'sword', grip: -1.2, len: 62, trail: '#bfefff' },     // 握在前手；出招自動畫刀光
  cape: { draw: { w0: 14, w1: 30, color: '#9a2234' } },  plume: { off: [-3, -27] },  hair: {…},  scarf: {…},
});
hero.ground = (x) => 地面高度;                            // 腳踩高低不平的地
update(dt) { hero.drive({ vx, vy, grounded, crouch }); hero.update(dt); }
render(g) { g.rigShadow(hero, x, groundY); g.rig(hero, x, y, { bones: false }); }
hero.attack('slash')  // swing thrust upper smash punch cast；出招中再按會接下一招（連段）；回傳 Promise
hero.on('hit', (招式) => 判定傷害)   hero.hurt(角度, 力道)   hero.die()   hero.revive()   hero.jump()
hero.joint('hdF')  hero.tip()        // 前手、武器尖端的世界座標（放特效、判定範圍）
```

部位圖的畫法：**角色面向右**；手腳畫成往下垂的直條，上端關節放在 `anchor`（例如 `[0.5, 0.1]`）；身體、頭、骨盆畫成直立的，跟下一段相接的點在 `anchor`（身體 `[0.5, 0.97]`）；腳畫成橫的、腳尖朝右；武器畫成橫的、尖端朝右、握把在 `anchor`。自訂招式：`hero.attack({ dur, hit, keys: [[時間, { u, f, bu, bf, lean, hx, hy, head, w }, 'outQuint'], …] })`（角度：0 往前、π/2 往下、-π/2 往上）。範例：`lab/src/21_anim.js` 的騎士。

**讓程式畫的圖更有質感**：`PZ.art.make(name, w, h, draw, { outline: 1.5, outlineColor: '#102', rim: { color: '#fff4dc', a: 0.6 }, shade: 0.2 })`——自動外框（圖會大一圈，anchor 自動調好）、朝光那側的亮邊、下半部陰影。刀光、揮擊殘影：`g.swoosh(list, color)`。
---

## 9. 輸入

```js
PZ.input.bind('fire', 'Space', 'KeyJ', 'PadA', 'Mouse0')      // 或 bind({ fire: [...], dash: [...] })
PZ.input.down('fire') / pressed('fire')（這一格剛按）/ released / held('fire')（按住幾秒）
PZ.input.onPress('pause', fn)                                   // 立即回呼，暫停中也會觸發
PZ.input.move  { x, y, mag }      // WASD／方向鍵／左類比／虛擬搖桿合併，已經正規化
PZ.input.aim   { x, y, mag, active }   // 右類比／瞄準搖桿
PZ.input.pointer { x, y, wx, wy, down, pressed, released }      // 滑鼠或主要手指（wx/wy＝世界座標）
PZ.on('tap', (t) => t.wx, t.wy)   PZ.input.doubleTap   PZ.on('longpress', …)   PZ.input.gesture（雙指平移縮放旋轉）  PZ.input.wheel
PZ.input.stick({ target: 'move'|'aim', zone: { l, t, r, b }（0～1）, radius: 56, fixed: false, cls, keep })
PZ.input.button({ action: 'fire', label: '開火', icon: '<svg…>', right: 24, bottom: 110, size: 76, cls, keep })   // b.cooldown(0～1)、b.badge(n)、b.disable(true)
PZ.input.showTouch('auto' | true | false)                      // 虛擬按鈕什麼時候顯示（預設：用手指時才出現）
PZ.input.rumble(強, 弱, 毫秒)   PZ.haptic.tap('light'|'medium'|'heavy'|'success')
PZ.input.device                 // 'touch' | 'mouse' | 'keyboard' | 'gamepad'：提示文字照這個寫
```

預設動作：`up/down/left/right`（WASD、方向鍵、十字鍵）、`confirm`（Enter、空白、A）、`cancel`（Esc、Backspace、B）、`pause`（Esc、P、START）。手把用標準配置（Xbox／PS／Switch Pro 在瀏覽器都是同一套）：`PadA PadB PadX PadY PadLB PadRB PadLT PadRT PadBack PadStart PadLS PadRS PadUp PadDown PadLeft PadRight`。

- 觸控層（`#pz-touch`）在用鍵盤／滑鼠時自動藏起來；手指一碰，**第一下就會抓到搖桿**（不用先點一下叫出來）。
- 介面打開時（`PZ.ui.push` 了一層）觸控按鈕自動淡出、不吃觸控。

---

## 10. 聲音

```js
PZ.sfx.play('hit', { vol, pitch, pan, bus, rev, delay, loop })   // 回傳可以 stop() 的聲部
PZ.sfx.at('explosion', x, y)                                     // 依畫面位置：左右聲道、遠近音量
PZ.uiSound('click')                                              // 介面音效（ui 匯流排）
PZ.sfx.define('myShot', { vol: 0.8, pitchVar: 0.06, max: 4, gap: 0.03, layers: [
  { w: 'noise', t: 0.12, a: 0.001, p: 3, v: 0.8, bp: [2400, 900, 1.2] },        // 噪音＋帶通掃頻
  { w: 'square', f: 180, f1: 60, t: 0.15, v: 0.5, lp: [1800, 400] },           // 方波＋音高下滑＋低通
] });
await PZ.sfx.load('door', PZ_ASSETS['door.mp3'])                 // 外部音檔
PZ.audio.duck(0.45, 0.6)                                         // 配樂暫時變小聲（大爆炸、對話）
```

內建 47 個：`hit hitHeavy crit kill slash clang block shoot rifle shotgun laser reload empty explosion thunder splash glass pickup xp coin powerup levelup heal magic charge whoosh dash jump land step hurt death growl heartbeat click hover confirm cancel error open close tick type notify card alarm bell`。
合成層的欄位：`w` 波形（sine square saw tri noise pink brown）、`f→f1` 音高（`fc: 'lin'` 線性）、`t` 長度、`d` 延遲、`a` 起音、`h` 持續、`p` 衰減曲線、`v` 音量、`lp/hp/bp: [起, 終, Q]` 濾波掃頻、`dist` 失真、`crush` 位元壓縮、`fm: [倍率, 深度, 衰減]`、`vib: [速度, 半音]`、`jump: [[秒, 倍率]]`、`duty`、`hold`。聲音在背景執行緒算好，播的時候只是放片段。

配樂（文字寫譜，即時演奏）：

```js
PZ.music.define('battle', { bpm: 128, tracks: [
  { inst: 'kick',  pat: 'x...x...x...x...' },
  { inst: 'hat',   pat: 'x.x.x.x.x.x.x.x.', vol: 0.35, min: 0.4 },     // 緊張度 ≥ 0.4 才出現
  { inst: 'bass',  notes: 'A1 . A1 . . . G1 . F1 - - . F1 . G1 .' },   // 一格一字：音名、. 休止、- 延長
  { inst: 'pad',   chords: 'Am F C G', vol: 0.3 },                      // 一小節一個和弦
] });
PZ.music.play('battle', { fade: 1.5, intensity: 0.5 });  PZ.music.intensity(0.8);  PZ.music.stop({ fade: 2 });
PZ.music.stinger('win');  PZ.music.file('theme', PZ_ASSETS['theme.mp3']);  PZ.music.onBeat(fn);
```

樂器：取樣式 `kick snare hat ohat clap tom crash shaker rim bass sub pluck harp zither keys bell marimba arp stab`；即時合成 `pad strings lead choir flute organ`。和弦：`A Am A7 Am7 Amaj7 Asus2 Asus4 Adim Aaug A6 Am6 A9 Aadd9`，可加 `/E`。範例：`lab/src/02_music.js`（四首）。

- **不要自己 `new AudioContext()`**：引擎在第一次點擊時同步建立（iPhone 一定要這樣），並設 `navigator.audioSession.type = 'playback'`（側邊靜音鍵打開也有聲音）。舊遊戲自己的 WebAudio 程式：改用 `PZ.audio.ctx`，輸出接 `PZ.audio.bus.sfx`／`bus.music`（音量才會跟設定走）。
- 玩家自己的音樂檔（例如重新點火、耳目一新）**不要接進 Web Audio**（iPhone 鎖屏會沒聲音），用 `<audio>`。

---

## 11. 存檔、設定、雲端

```js
const save = PZ.save.open('night-shift', {
  version: 2, defaults: () => ({ chapter: 1, gold: 0, flags: {} }),
  migrate(d, from) { if (from < 2) d.flags = {}; return d; },
  code: 'NS',                                   // 存檔碼開頭
  describe: (d) => `第 ${d.chapter} 章・金幣 ${d.gold}`,   // 「有兩份進度」時給玩家看
  canSave: (d) => !inCutscene,                  // 劇情演到一半先不寫（一秒後再試）
});
save.data.gold += 10; save.write();             // 自動合併頻繁寫入；save.write(true) 立刻寫
save.code() / save.load(code)                   // 存檔碼（換手機、Claude 版↔網頁版）
save.slots() / save.use('slot2') / save.remove('slot2') / save.reset()
save.loadedFrom                                 // 'new' | 'local' | 'backup' | 'code' | 'cloud'
await save.ready                                // Claude 版：等雲端回話（最多 5 秒）再開始新遊戲
PZ.on('saveload', (s) => { …存檔碼或雲端讀進來了：刷新畫面… })

PZ.settings.get('sfx')  PZ.settings.set('shake', 0.5)  PZ.settings.set('sfx', 0, { local: true })（只改這款）
PZ.on('setting', (k, v) => …)
```

- 主存檔壞掉自動用備份；頁面收起來（切 App、鎖螢幕）自動寫；寫不進去時退回記憶體，`save.persistent` 變 false。
- **只存「接得下去」的狀態**：劇情演到一半、戰鬥進行中不要存半套（用 `canSave` 或在安全點才 `write`）。
- **Claude 版雲端存檔**：`PZ.save.open` 在 Claude 頁面裡自動接上 `window.claude` 的 db（`data/users/<自己>/save`）。**發布到 Claude 之後要宣告能力 `{ db: {}, user: {} }`** 才會動（第 15 節）。
- 存檔 key 是 `pz.<id>.save.<欄>`、設定 `pz.<id>.settings`；同網域的遊戲共用瀏覽器儲存空間，**`id` 不能跟別款重複**。

---

## 12. 介面（DOM，疊在畫布上）

```js
PZ.ui.theme('night' | 'ink' | 'neon' | 'steel' | 'paper')  或  PZ.ui.theme({ accent, accent2, text, dim, faint, bg, panel, panel2, line, 'on-accent', radius, 'radius-s', shadow, font })
await PZ.ui.alert('標題', '內容')
await PZ.ui.confirm({ title, body, ok, cancel })              // true / false
await PZ.ui.choose({ title, body, options: [{ label, value, desc, disabled }] })
await PZ.ui.modal({ title, body, buttons: [{ label, value, primary, ghost, onClick }], wide, pause })
PZ.ui.toast('撿到 金幣 ×3', { kind: 'good' | 'bad' })     await PZ.ui.banner('BOSS 來襲', { sub, style: 'boss' })
PZ.ui.settings({ save, extra: [{ head: '劇情' }, { label: '文字速度', sub, control: DOM 元素 }] })   // 標準設定頁
PZ.ui.pause({ items: [{ label, onClick }], save })            // 標準暫停選單
const L = PZ.ui.loading('標題', '載入中'); L.progress(0.5, '畫地圖'); L.done();
await PZ.ui.say([['魏子葳', '……又是凌晨三點。'], [null, '旁白'], ['老闆', '這單送完就收工。', { face: 'boss_face', side: 'right' }]], { faces: { 魏子葳: 'face_wei' } })
const i = await PZ.ui.ask('要怎麼做？', ['衝進去', '先觀察'])
```

- 按鈕加 class `pz-btn`（或 `pz-focusable`）就有按下音效、觸覺、按壓動畫，手把／鍵盤也選得到。
- 自己做的選單層：`const layer = PZ.ui.push(元素, 返回函式)`、關掉時 `PZ.ui.pop(layer)`；方向鍵移動焦點、A／Enter 按、B／Esc 呼叫返回函式。`PZ.ui.setFocus(元素)`。
- 對話框預設會暫停遊戲（`pause: false` 不暫停）。劇情對話時遊戲自動暫停；點一下：字還在跑就一次顯示完，跑完下一句；按住快轉；右上角有自動、快轉、紀錄。
- 安全區：HUD 的位置加上 `var(--pz-safe-t)` 等（iPhone 瀏海、圓角、Home 條）。收藏庫的 PZ 圓鈕預設在右邊 42% 高度（`PZ.screen.hub()` 拿得到位置），HUD 不要放那裡。

---

## 13. 手機與各平台的坑（引擎已經處理的＋遊戲自己要注意的）

已經處理：iPhone 靜音鍵、音訊要在點擊時同步建立、畫布記憶體上限（像素上限）、安全區、切背景暫停與存檔、雙擊縮放與雙指縮放頁面（已擋）、失焦卡鍵、WebGL 遺失（恢復或換 Canvas2D）、觸覺（iPhone 用系統開關觸感，只在按按鈕的當下有效）、螢幕常亮（`PZ.screen.keepAwake(true)`，玩的時候開、選單關）、在 Claude 頁面框裡要點一下畫面鍵盤才收得到（引擎會把焦點拿回來）。

遊戲自己要注意：
- **記憶體**（iPhone 閃退的頭號原因）：大圖用一張圖集、不要每格 new 大量物件（用 `PZ.pool`）、不要對大面積或一直在動的 DOM 用 `filter: blur/drop-shadow`。懷疑記憶體時用 `_build/tools/memory.py`（WebKit）量改前改後（`--url` 可以直接量單一頁，`--steps` 照步驟進遊戲）。參考：引擎本身（WebGL＋後製）比純 Canvas2D 多約 60 MB；《最後一單》遊戲中最高約 590 MB，比收藏庫裡多數遊戲（1.1～1.3 GB）低很多。
- **畫面比例**：直拿（390×844）、橫拿（844×390）、電腦（1280×720 以上）三種都要截圖看過；矮螢幕的 HUD 很容易互相壓到（最後一單就修過 Boss 血條和連殺數字）。
- 觸控目標至少 44×44 px；重要按鈕放拇指搆得到的下半部。
- 文字最小 12px，說明文字 14px 以上；中文不要用很細的字重配深色背景。
- 外部網站（Google 字型、CDN）在雲端測試時連不到：一定要有後備字型，不能因為字型沒載到就壞掉。

---

## 14. 效能預算（手機 60 幀）

- 一格 16.7 ms：**JS（更新＋繪圖）目標 ≤ 6 ms**，留給 GPU 與瀏覽器。效能面板（`?debug`、F3、三指點一下）看 `upd`／`ren`／繪圖呼叫／粒子。
- 同屏建議：貼圖 3000、粒子 3000、繪圖呼叫個位數（同一張圖集、同一種混合模式會併成一批；交錯畫不同圖集會拆批）。
- 不要每格建立字串、陣列、物件（熱迴圈用 `g.spr`、先存好 frame）；大量物件用 `PZ.Grid` 查鄰近。
- 自動畫質會在卡的裝置上降解析度與特效；遊戲不要假設一定是最高畫質（例如 `PZ.quality.tier` 低時少生一點裝飾粒子）。

---

## 15. 測試與發布

### 15.1 測試（每款遊戲都要有）

- 照 `_build/sources/last-order/tests/flow.py` 寫：用 Playwright 開 `dist/web/index.html`，**直拿、橫拿、電腦**三種都跑，實際操作（點擊、CDP 觸控拖曳、鍵盤），檢查狀態、讀 `PZ.debug.errors`、截圖親眼看。
- 等遊戲狀態要用 `page.wait_for_function`（雲端是軟體算圖，很慢），不要寫死秒數。
- iPhone Safari 的引擎：`python3 _build/engine/tools/webkit_check.py page <路徑> --js '…'`（要先 apt 裝 WebKitGTK，見檔案開頭）。

### 15.2 發布（三個地方都要）

1. **組建**：`python3 tools/pzbuild.py ../sources/<id>`（`pz.json` 的 `engine` 不要留 `"dev"`）。
2. **Claude 版**：用 artifact 工具發布 `dist/artifact/index.html`（先讀 artifact 工具的 `guide`）。已經有 Claude 版的遊戲用同一個 slug 重新發布（網址在 `_build/data/catalog_base.json` 的 `builds[].artifact`）。**發布後宣告能力 `{ db: {}, user: {} }`**，雲端存檔才會動。
3. **收藏庫（網頁版）**：`dist/web/*` 整包複製到 `_build/raw/<build-id>/`，照 `_build/README.md`：`catalog_base.json`（新遊戲加一筆）、截圖、`meta/<id>.json`、`tools/build.py --out ..`、`smoke.py`、`deploy.sh`。

---

## 16. 版本與鎖版

- 版本號 `主.次.修`。**修**（1.0.1）：修 bug、不改用法——寫 `"engine": "1.0"` 的遊戲下次組建自動用到。**次**（1.1.0）：加新功能、舊寫法照常能用——遊戲要自己把 `pz.json` 改成 `"1.1"` 才會用。**主**（2.0.0）：改了用法——舊遊戲不受影響，要搬才搬。
- 遊戲組建時把引擎整份包進去：**已上架的遊戲不會因為引擎更新而改變**，重新組建那款才會。重新組建＝要重新測那款。
- 發正式版：改 `VERSION` → 寫 `CHANGELOG.md` → `python3 tools/test_engine.py --perf`（有 WebKit 就加 `--webkit`）全過 → `python3 tools/build_engine.py --release`。
- **已經發出去的 `releases/pz-engine-X.Y.Z.js` 永遠不改**（build_engine.py 會拒絕；不要用 `--force` 蓋已發布的版本）。要修就發下一個修訂版。

---

## 17. 舊遊戲搬到引擎（照《最後一單》的做法）

目標：PZ 已經玩過、喜歡的遊戲，**玩法、關卡、數值、美術一個都不改**，只換掉底下的平台，讓手感、聲音、相容性、存檔變好。分兩階段：

**第一階段：換平台、不換畫法**（最後一單已完成，細節在 `_build/sources/last-order/README.md`）
1. 把單檔拆成 `src/`：CSS、介面標記（`index.html`）、程式依區段分檔（照原本的註解標題切）。
2. 原本的 Canvas2D 世界畫在離屏畫布（原本 `<canvas>` 拿掉）→ `PZ.art.live('world', 畫布, { pixel: true })`，每格 `refresh()` 後 `g.screen(); g.spr(world, 0, 0, 0, 放大, 放大)`，引擎的後製就套上去了。
3. 主迴圈交給引擎：`PZ.start({ step: 1/60 })`（固定步長＝手感跟原本一樣），場景的 `update(dt)` 呼叫原本的 update、`render(g)` 呼叫原本的 render。
4. 鏡頭：`PZ.cam.external = true`，原本的鏡頭位置加上 `PZ.cam.offsetX/Y`（換算成遊戲像素）；設好 `PZ.cam.zoom/x/y` 對齊後，`g.world()` 畫的光暈、粒子會疊在對的位置。
5. 震動改成引擎的 trauma（`shake(v)` → `PZ.cam.shake(…)`），**幅度要換算到跟原本差不多**；再在重要的時刻加上打擊感（受傷、爆炸、Boss、升級）。
6. 聲音：原本的 AudioContext 換成 `PZ.audio.ctx`、輸出接 `PZ.audio.bus.sfx/music`。
7. 輸入：觸控搖桿換 `PZ.input.stick`（用 `cls` 保留原本的樣子），加手把。原本的 DOM 選單用 `PZ.ui.push` 登記成介面層，讓手把能選（畫面出現後等 0.35～0.6 秒才接手，避免誤按）。
8. 存檔：`PZ.save.open`，**第一次開新版時把舊的 localStorage 存檔整份搬過來**（舊 key 不要刪，萬一要退回舊版）。設定按鈕改開 `PZ.ui.settings`。
9. 測試：舊存檔搬家、三種畫面比例、觸控／鍵盤／手把、整條流程（標題→劇情→戰鬥→升級→暫停→死亡／過關）、沒有錯誤；再用 WebKit 跑一次。
10. 上架時**標成重製版**：`_build/data/catalog_base.json` 那一款加 `"remake": { "ver": "2.0", "date": …, "engine": "PZ 引擎", "what": … }`，收藏庫會自動放進「重製 2.0」分類、封面加標示（PZ 要求的，見 `_build/README.md`）。

**第二階段（之後）**：把角色、怪物、粒子改成引擎的圖集＋批次繪製（同屏數量、光照、特效才能再往上）。做之前先寫計畫、PZ 同意再動。

---

## 18. 改引擎本身的規矩

1. 改 `src/`，**每個新功能、每個修過的 bug 都要在 `tests/browser/selftest.html`（或 unit、interact）加檢查**。
2. `python3 tools/test_engine.py --perf` 全部通過（有 WebKit 就加 `--webkit`）；樣品館 `python3 tools/pzbuild.py lab --dev` 重新組建、截圖看過（`tools/labshot.py <場景> out.png [寬 高]`）。
3. 不破壞現有用法：要換名字就留舊名字當別名。改了行為要更新這份說明書與檔案開頭的說明。
4. 照第 16 節發版。用到引擎的遊戲（目前：最後一單、樣品館）要用新版重新組建、跑它們的測試，再發布。
