# 遊戲狂想曲 品牌圖（塗鴉 v3）

2026-11-20 做的頻道門面，跟影片片頭片尾（塗鴉片頭試作）同一套：黃 `#FFE600`、粉 `#FF2E88`、黑 `#111`、網點、放射線、膠帶、噴漆、皇冠。
放在這裡是**備份**：頭像以前弄丟過，之後要換、要改都從這裡拿。

**2026-11-20 痞子葳選了頭像 B（蒙面兜帽），四個平台都已換上。** 這個角色就是頻道吉祥物；筆電影片工廠 `C:\VideoFactory\brand\v3_graffiti\final\` 也已換上新頭像、橫幅、FB 封面，另放一張透明貼紙 `mascot_sticker.png` 給影片零件用（logo、浮水印、片頭不變）。

| 檔案 | 用在哪 | 尺寸 |
|---|---|---|
| `頭像A_狂字.png` | 落選的候選 A，留作紀錄 | 2048×2048 |
| `頭像B_蒙面.png` | **正式頭像**（選定）：GPT 生的蒙面兜帽角色，改成黃粉黑網點貼紙 | 2048×2048 |
| `YouTube橫幅.png` | YouTube 橫幅；手機只顯示中間 1546×423，字和角色都在裡面 | 2560×1440 |
| `FB封面.png` | FB 粉專封面；重點在中間 1522×624，左下角留給大頭貼 | 1640×856 |

Threads、IG 沒有封面，只用頭像。

## 怎麼重做
`src/` 裡有原圖、去背遮罩、貼紙和兩支程式（在 `src/` 裡跑）：
- `tritone.py`：把原圖變成黃粉黑網點，用 `mask.png` 去背，加白邊黑框做成 `sticker.png`。
- `build.py`：用 Chromium 把頭像、橫幅、封面排好算圖。中文字是 Noto Sans CJK TC Black；英文字先 `npm i @fontsource/bebas-neue @fontsource/permanent-marker @fontsource/rubik-wet-paint`。`python3 build.py banner` 可以只算一張。

規則：頻道素材不放本人名字，只用「遊戲狂想曲」／GAME RHAPSODY。
