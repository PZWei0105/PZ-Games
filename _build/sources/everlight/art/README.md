# 《長明》美術升級資料夾

| 檔案 | 內容 |
|---|---|
| `BLUEPRINT.md` | 給筆電 Claude Code 的完整藍圖：守則、安裝、產線、品質關卡、換進遊戲、效能、里程碑、發佈 |
| `ART_BIBLE.md` | 美術聖經：參考圖拆解、原創視覺方向、角色設定、像素與立繪規格、評分標準 |
| `ASSETS.md` | 第一章要做的全部素材清單與優先順序 |
| `PROGRESS.md` | 進度紀錄（筆電 Code 邊做邊更新） |
| `LICENSES.md` | 每個模型、LoRA、工具的來源與授權 |

參考圖不放在這裡（別家遊戲的版權圖，收藏庫又是公開的），放在筆電的 `C:\GameStudio\Everlight\refs\`。

## 在筆電上開始

1. 把 6 張參考圖放進 `C:\GameStudio\Everlight\refs\`。
2. 打開 Claude 桌面版的 **Code** 分頁，開新對話，工作資料夾選 `C:\GameStudio`。
3. 貼上下面這段：

```
這是《長明 EVERLIGHT》第一章的美術升級工作。請照順序開始：
1. 確認電腦有 Git。把 https://github.com/PZWei0105/PZ-Games clone 到 C:\GameStudio\PZ-Games（已經有了就 git pull 更新）。
2. 完整讀完 C:\GameStudio\PZ-Games\_build\sources\everlight\art\ 裡的 BLUEPRINT.md、ART_BIBLE.md、ASSETS.md、PROGRESS.md。
3. 參考圖在 C:\GameStudio\Everlight\refs\（6 張）。沒看到就先停下來問我。
4. 從 BLUEPRINT.md 的 M0 開始做。全程用繁體中文跟我回報。
```

之後換新對話接著做，只要貼：

```
繼續《長明》美術升級：先在 C:\GameStudio\PZ-Games 執行 git pull --rebase origin main，再讀 _build\sources\everlight\art\ 的 BLUEPRINT.md、ART_BIBLE.md、ASSETS.md、PROGRESS.md，從 PROGRESS.md 記錄的地方接著做。全程用繁體中文回報。
```
