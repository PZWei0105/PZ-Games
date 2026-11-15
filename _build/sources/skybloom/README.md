# 火樹銀花 SKYBLOOM — 原始碼

3D 夜間遊樂園＋煙火（three.js，自己寫的泛光後製，音效與配樂全部用 Web Audio 即時合成）。收藏庫裡的 `games/skybloom/` 是打包後的單檔，要改請改這裡。

## 組建

```bash
npm install                    # three、esbuild
node tools/build.mjs           # dist/artifact/index.html（Claude 版）＋ dist/web/（獨立網頁版）
python3 tools/icon.py dist/web # 圖示（來源 tools/icon-src.jpg：遊戲畫面截的）
```

把 `dist/web/*` 複製到 `_build/raw/skybloom/`，再照 `_build/README.md` 組收藏庫。Claude 版發布在 https://claude.ai/artifact/CUwrkQK1FNvDRDZfBanPnk （用 publish_files 發 `dist/artifact/index.html`）。

## 結構

| 檔案 | 內容 |
|---|---|
| `src/main.js` | 主控：畫質分級（手機標準、電腦極致，太卡自動降）、四種天空過渡、點天空→天上的點、連發、自動煙火、乘坐鏡頭、煙火秀與錄製、介面 |
| `src/fireworks.js` | 煙火：粒子池（活著的排在前面，只上傳用到的那段）、十四種花形＋文字、拖尾、閃爍、分裂、爆米花、照亮地面的燈、會被照亮的煙 |
| `src/glow.js` | 所有發光點（燈泡、火花、水珠）共用的 shader；`REFLECT` 版算湖面倒影（同一份幾何）；`snowable()` 讓材質積雪 |
| `src/park.js` | 版面 `L`、步道、地面貼圖（路燈光暈烘在自發光貼圖）、湖、路燈、樹、攤位、串燈、大門、噴泉、遊客、遠方城市與山 |
| `src/castle.js` | 湖北岸的星辰宮：會換色的打燈、窗、輪廓燈泡、探照燈 |
| `src/wheel.js` | 摩天輪：六種燈泡花樣、32 個保持水平的車廂 |
| `src/coaster.js` | 雲霄飛車：平行移動的軌道座標（迴圈不會亂轉）＋彎道傾斜、霓虹、支柱、車站、能量守恆的列車 |
| `src/rides.js` | 旋轉木馬、旋轉飛椅（tanθ＝ω²r／g）、自由落體塔 |
| `src/sky.js` | 天空（星星、銀河、月亮、夕陽、極光、煙火反光）、四種天空 `MOODS`、雪 |
| `src/audio.js` | 發射、哨音、爆炸（照距離延遲）、爆米花、掌聲、人群、華爾滋、煙火秀配樂（96 BPM、30 小節） |
| `src/show.js` | 大會煙火秀的編排（跟配樂小節對拍）、播放器、錄製 |
| `src/camera.js` | 拖曳／捏合／點一下／按住、電影運鏡的鏡頭清單 |
| `tools/shot.py` | 無頭截圖：`python3 tools/shot.py --out /tmp/x --steps '[...]'`（`--desk`、`--land`） |

## 測試小技巧

無頭瀏覽器用 CPU 畫，一秒只有幾格：在步驟裡用 `window.__noAuto=1; window.__simClock=1;`（不自動降畫質、煙火秀照模擬時間走），再用 `__sky.advance(秒)` 快轉。`__sky` 還有 `fw`（`fw.launch(type, color, {x,y,z})`）、`startRide('coaster'|'wheel'|'tower')`、`startGrand()`、`setMood('night'|'dusk'|'snow'|'aurora')`。

雲霄飛車一圈：最高時速約 96 km/h、迴圈頂端約 43 km/h、一圈約 50 秒（含進站 6 秒）。
