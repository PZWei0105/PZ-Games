# 觀戰 SPECTATE — 待辦與已知問題

## 待辦
- 痞子葳接上 YouTube 金鑰（Actions 密碼 `YT_KEY`）之後：確認直播雷達、片長、中文標題、新秀探勘都有資料（看 `spectate-data` 分支的 `status.json`：`key: true`、`units`）。
- 精選名單：中文創作者還偏少。等金鑰的新秀探勘跑幾天，把痞子葳選進來的、表現好的補進 `channels.json`；`quiet` 裡長期不更新的換掉。
- 痞子葳實際在 iPhone／ROG Phone 上用過後：確認 Premium 有沒有被認出來（有沒有廣告）、觀看紀錄會不會影響電視上的推薦。

## 已知問題
- iPhone 的 Safari／主畫面 App 擋 YouTube 的第三方 cookie：內嵌播放器可能有廣告。解法是設定「點影片時：交給 YouTube App」。
- 沒有金鑰時：沒有直播中／即將直播、片長；新秀只從精選名單裡挑。
- 遊戲歸類靠標題＋Steam：不在 Steam 上、標題又沒寫名字的影片歸不到遊戲（別名表在 `tools/ytextract.py` 的 `ALIASES`）。

## 已完成
- 2026-11-18 1.0.0 上線：轉播台、直播、遊戲、新秀選秀會、我的；導播台（PGM／PVW／TAKE／AUTO）；轉發站訂閱同步；資料管線（RSS、Shorts、簡轉繁、車道、遊戲、黑馬、金鑰功能）。
