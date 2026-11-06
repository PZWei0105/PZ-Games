# 《長明》美術升級藍圖（給筆電 Claude Code）

> 2026-11-06 由聊天端 Claude 依 PZ 的要求與參考圖寫成。
> 你（筆電上的 Claude Code）要照這份藍圖，把《長明 EVERLIGHT》第一章的美術升級到 PZ 給的參考圖等級。
> 同資料夾還有：`ART_BIBLE.md`（要長什麼樣子、評分標準）、`ASSETS.md`（要做哪些東西）、`PROGRESS.md`（做到哪裡）、`LICENSES.md`（授權紀錄）。前四份都要完整讀過再動手。

---

## 0. 任務與成功標準

**任務**：用這台筆電的 RTX 5090（24GB）在本機生成並精修《長明》的立繪、像素人物與動畫、敵人與頭目、場景材質與道具、介面與圖示、特效，換進遊戲，讓第一章整體畫面達到參考圖的質感。

**成功標準**
1. 每一批成品照 `ART_BIBLE.md` 第 8 節打分，全部過關。
2. 換進遊戲後，手機直拿、橫拿的實機截圖跟參考圖並排比較，PZ 認可。
3. iPhone（Safari）與 Android（Chrome）都順暢不閃退，讀取時間合理（第 8 節）。
4. 新版加進《PZ 遊戲收藏》並推上 GitHub；Claude 版也同步（第 10 節）。

---

## 1. 工作守則（PZ 的規矩，一定要遵守）

1. **全程用繁體中文**跟 PZ 溝通，包括進度回報、完工報告、錯誤說明。一個英文段落都不行。
2. **不要丟一堆候選圖讓 PZ 挑**。你自己篩、自己評分，只把過關的成品給他看，並附上「做到參考圖的幾成、差在哪、下一步」。
3. **做不到就直說**，同時提出替代做法；不可以交出跟參考圖方向完全不同的東西，也不可以把沒過關的東西說成過關。
4. **第一關是魏子葳樣板**：他的立繪、表情、像素動畫全部換進遊戲、實機截圖過關後，回報 PZ，**等 PZ 確認才開始量產其他角色**。之後每個里程碑結束回報一次，中間不閒聊、不問可以自己決定的事。
5. **原創**：參考圖只用來對照與評分，不能拿來訓練模型、不能描摹、不能上傳到 GitHub（收藏庫是公開的）。**參考圖也不能當成任何模型的輸入**（img2img、IP-Adapter、編輯模型的參考圖、ControlNet 都不行）。含有參考圖的對照表只存在 `C:\GameStudio\Everlight\work\`，不進 PZ-Games、不發布。角色、怪物、介面都要是《長明》自己的設計。
6. **授權**：只用產出可以商用的模型與工具（PZ 之後可能放上頻道或公開）。每個用到的模型、LoRA、工具，把名稱、來源網址、授權寫進 `art/LICENSES.md`。授權不明的不要用。
7. **安全**：
   - 不改顯示卡驅動、BIOS、Windows 系統設定。
   - 只刪你自己建立的檔案。`C:\GameStudio` 裡還有其他遊戲專案（例如《鋼骸》的資料夾），不要動。
   - 不代 PZ 輸入任何帳號密碼或 token；需要登入（GitHub、Hugging Face、Civitai）時，請他自己在瀏覽器完成。
8. **下載**：M0 一開始把「要下載的全部模型與工具＋大小＋總容量」列成一張清單給 PZ，**他同意一次就全部自動下載**，之後不用每個檔案再問。
9. **筆電長時間跑**：
   - 提醒 PZ 插電、Armoury Crate 開效能模式與電池保養（充電上限 60% 或 80%）、筆電架高或墊散熱墊。
   - 生成工作排進佇列過夜跑。ComfyUI 與佇列腳本要用**獨立的命令視窗**啟動（例如 `start` 開新視窗），不要當成你這個對話的背景程序，否則對話結束時可能被一起關掉。
   - 佇列執行期間要防止 Windows 進入睡眠（佇列腳本呼叫 Windows 的 `SetThreadExecutionState`，跑完再恢復），不要改電源設定。
   - 換不同模型家族之前（例如從 SDXL 換到 Qwen、Wan），呼叫 ComfyUI 的 `POST /free` 釋放顯示記憶體；訓練 LoRA 前先停掉佇列。
   - 美術產線跑的時候不要同時跑 AI 影片工廠（兩邊都要吃滿 24GB 顯示記憶體）。
10. **遊戲裡不能出現設計者的內部說明**（設計理念、開發筆記、「AI 生成」字樣等）。
11. **進度一定要存檔**（第 11 節），這個工作會跨好幾個對話，換對話時要能無縫接上。

---

## 2. 資料夾

```
C:\GameStudio\
├─ PZ-Games\                 ← GitHub repo（PZWei0105/PZ-Games）
│  └─ _build\sources\everlight\
│     ├─ src\                 ← 遊戲程式
│     ├─ assets\              ← 【新增】換進遊戲的最終素材（進 GitHub）
│     ├─ art\                 ← 本藍圖、美術聖經、素材清單、製作清單、進度、授權紀錄（進 GitHub）
│     └─ tools\               ← build.mjs 等
├─ ArtLab\                   ← 共用美術工作站（之後其他遊戲也用）
│  ├─ ComfyUI\               ← ComfyUI 本體（含自己的 Python）
│  ├─ models\                ← 所有模型（checkpoints、loras、vae、upscale…）
│  ├─ training\              ← LoRA 訓練工具與設定
│  ├─ pipeline\              ← 你寫的產線腳本（第 4 節）＋自己的 venv
│  └─ logs\
└─ Everlight\
   ├─ refs\                  ← PZ 放的 6 張參考圖（不進 GitHub）
   ├─ work\                  ← 原始生成圖、候選、資料集、LoRA 權重（不進 GitHub）
   └─ masters\               ← 最終母圖（高解析度，不進 GitHub；定期提醒 PZ 備份）
```

`_build/sources/everlight/.gitignore` 已經排除 `node_modules/`、`dist/`、`art/refs/`、`art/work/`。原始生成圖、資料集、LoRA 權重、母圖一律不進 GitHub。

---

## 3. 安裝清單

> 以下是 2026-11-06 查證的結果。安裝時**以官方頁面的現況為準**（版本、檔名、授權都可能更新），有出入就照官方、並記進 `art/LICENSES.md`。
> 「✅」＝產出可以商用；「❌」＝禁止使用。

### 3.1 先檢查環境
| 項目 | 要求 | 不符合時 |
|---|---|---|
| 顯示卡驅動 | `nvidia-smi` 版本 ≥ R580（PyTorch cu130 需要） | **不要自己更新驅動**。請 PZ 用 NVIDIA App 自己更新，更新完再繼續 |
| 硬碟 | `C:` 至少留 250 GB 可用（模型約 120–170 GB，加上工作檔） | 回報 PZ，一起決定刪什麼或改放外接 SSD |
| 基本工具 | Git（含 Git Bash）、GitHub CLI `gh`、Node.js LTS、Python 3.12（給產線腳本用）、7-Zip、VC++ 可轉散發套件 | 用 `winget` 安裝（不需要改系統設定） |

### 3.2 ComfyUI
- 用官方 **Windows Portable（NVIDIA）** 版，裝在 `C:\GameStudio\ArtLab\ComfyUI\`。用最新穩定版（2026-10 是 v0.43.0；**避開 v0.41.0**，有已知問題），內建 Python 3.13＋PyTorch **cu130**。
- 這個版本的套件一律用它自帶的 Python 裝：`python_embeded\python.exe -m pip install …`。
- Manager：先裝 `manager_requirements.txt`，啟動參數加 `--enable-manager`。
- `extra_model_paths.yaml` 指向 `C:\GameStudio\ArtLab\models\`，之後其他遊戲共用。
- 寫一個 `C:\GameStudio\ArtLab\run_comfy.bat`（啟動並開 API），產線腳本都連它。
- 環境變數 `HF_HOME` 指到 `C:\GameStudio\ArtLab\cache\huggingface`，模型快取才不會塞進使用者資料夾。
- 有些模型要先登入 Hugging Face 並同意條款才能下載：請 PZ 自己執行 `hf auth login`（在瀏覽器登入），你不要碰 token。
- 自訂節點（用 Manager 裝）：
  - **ComfyUI-Impact-Pack**、**ComfyUI-Impact-Subpack**：臉部細修（FaceDetailer）。偵測模型放 `models\ultralytics\bbox|segm\`；PyTorch 2.6 以上，舊的 `.pt` 要加進 `model-whitelist.txt` 才能載入。
  - **ComfyUI-RMBG**：去背節點。**只選 BiRefNet 系列模型，不要用 RMBG-2.0**。
  - **Ultimate SD Upscale**：分塊放大重繪。
  - **ComfyUI-seamless-tiling**（spinagon）：無縫材質（對 SDXL 系有效）。
  - **ComfyUI-GGUF**：載入 GGUF 量化模型。
  - **comfyui_controlnet_aux**：骨架、深度前處理。
  - **ComfyUI-VideoHelperSuite**：影片拆格、組合。
  - **ComfyUI-KJNodes**：裡面的「Patch Sage Attention」節點。
- SageAttention 是選配，SDXL 系用不到；要跑 Qwen、Wan 再裝。注意兩個坑：
  - 不要直接 `pip install sageattention`，那樣會裝到會出黑圖的舊版。要裝 woct0rdho 編好的 Windows wheel，版本對應 torch。
  - 不要在全域加 `--use-sage-attention`（跑 Qwen 會黑圖），改用 KJNodes 的節點。
  - 需要的 triton-windows 版本要對應 PyTorch 版本（查它的 release 說明）。

### 3.3 模型
模型與 LoRA 依 docs.comfy.org 對應教學的檔案清單下載（文字編碼器、VAE 也要一起下載）。

| 角色 | 模型 | 授權 | 備註 |
|---|---|---|---|
| **立繪主模型** | Illustrious-XL v2.0（HF：`OnomaAIResearch/Illustrious-XL-v2.0`） | creativeml-openrail-m ✅（不主張產出權利） | SDXL 架構，約 7 GB；動漫角色、LoRA 生態最穩 |
| 立繪備選 | Anima v1.0（HF：`circlestone-labs/Anima`） | 模型非商用，但模型卡明寫產出可商用 ✅（不可拿模型做付費服務） | 厚塗、氛圍好；服裝色會漂移 |
| 立繪備選 | Animagine XL 4.0 Opt（`cagliostrolab/animagine-xl-4.0`）、NetaYume Lumina（`duongve/NetaYume-Lumina-Image-2.0`） | RAIL++-M ✅、Apache-2.0 ✅ | 授權最乾淨的後備 |
| 立繪微調版（選用） | WAI-Illustrious（Civitai） | 只有在該版本頁面確認是 FAIPL-1.0-SD、而且**沒有混 NoobAI** 才能用 | 畫風最接近手遊立繪，但要逐版本確認 |
| **編輯模型** | Qwen-Image-Edit-2511（fp8 約 20 GB，或 GGUF Q6_K 約 18 GB）＋ 4 步 Lightning LoRA | Apache-2.0 ✅ | 轉面、換裝、延伸角度；24 GB 要用量化版並把部分卸到系統記憶體 |
| 轉面 LoRA | `fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA` | Apache-2.0 ✅ | 8 方位 × 4 仰角 × 3 距離 |
| 編輯備選 | FLUX.2 klein **4B**（約 13 GB） | Apache-2.0 ✅ | 注意：klein **9B** 是非商用 ❌ |
| **像素 LoRA**（立繪轉像素） | `nerijs/pixel-art-xl`（SDXL） | OpenRAIL-M ✅ | 搭 Illustrious 做 img2img（重繪強度約 0.6），生成後縮小 8 倍（人物只佔畫面高約 40%，縮小後約 50 px，再裁成 64×64）；2026 年實測是插畫轉像素效果最好的組合 |
| 像素 LoRA | `limbicnation/pixel-art-lora`（FLUX.2 klein 4B） | Apache-2.0 ✅ | 透明背景角色、道具，4 步出圖 |
| 像素 LoRA | `svntax-dev/pixel_assets_general_ernie_v1`（ERNIE-Image-Turbo 8B） | Apache-2.0 ✅ | 角色、物品、圖示、背景都能做 |
| 像素 LoRA（選用） | `artificialguybr/PIXELART-REDMOND-QWENIMAGE`（Qwen-Image-2512） | Apache-2.0 ✅ | 觸發詞 `Pixel Art, PixArFK` |
| **圖生影片**（動作草稿） | Wan 2.2 I2V 14B（GGUF）＋ Lightx2v 4 步 LoRA | Apache-2.0 ✅ | 開放權重目前最新是 2.2；2.5 以後只有 API |
| 像素動畫 LoRA | `styly-agents/Wan2-2-pixel-animate` | 下載前確認授權 | 用像素動畫訓練的 Wan 2.2 LoRA |
| 參考驅動動畫（選用） | Wan-Animate-2（ComfyUI 原生） | Apache-2.0 ✅ | 參考圖＋驅動影片，仍屬實驗性 |
| 姿勢控制 | SDXL 或 Qwen-Image 系的 ControlNet-Union | 下載前確認授權 | 骨架要從 3D 範本**直接渲染**（Q 版大頭比例用偵測的會失準） |
| **放大** | RealESRGAN_x4plus_anime_6B | BSD-3 ✅ | 後接 Ultimate SD Upscale 用底模分塊重繪 |
| **去背** | BiRefNet_HR-matting、ToonOut（動漫版 BiRefNet） | MIT ✅ | 2048 解析度；ToonOut 對動漫邊緣更準 |
| **臉部偵測** | Anzhc Face seg 640 v4、Anzhc Eyes seg hd（`Anzhc/Anzhcs_YOLOs`） | AGPL-3.0（工具授權，不影響產出） | 給 FaceDetailer 用 |
| **分割、分層** | SAM 3.1（ComfyUI 原生 `sam3.1_multiplex_fp16`）、Qwen-Image-Layered | SAM License ✅、Apache-2.0 ✅ | 頭目拆部件；Layered 會補出被遮住的部分 |
| **深度** | Depth Anything 3 **Mono-Large** | Apache-2.0 ✅ | 只能用這個；DA3 Large／Giant 與 DA2 Base 以上是非商用 ❌ |
| **法線** | Sprite2Normal（`longtimedevs/sprite2normal`，ONNX）、spritefusion-sprite-normals | Apache-2.0 ✅、MIT ✅ | 用亮度推法線的工具會把深色腰帶算成凹槽，結果一定要人工看過 |
| 3D 道具（選用） | Hunyuan3D 2.1 | Tencent 社群授權：台灣在授權範圍內、不主張產出權利、不得用產出訓練其他 AI | 只拿來做船、鐘這類複雜道具，再渲染成像素立牌 |
| **QA 標註** | `SmilingWolf/wd-eva02-large-tagger-v3` | Apache-2.0 ✅ | 檢查髮色、瞳色等是否符合設定 |

**禁止使用 ❌**（授權不允許商用，或依賴非商用元件）：
- NoobAI-XL 與它的所有衍生模型（授權連「模型生成的產出」都禁止商用）
- FLUX.1 Kontext [dev]、FLUX.2 klein 9B、Qwen-Image-2.1
- 4x-AnimeSharp、2x-AnimeSharpV4（CC BY-NC-SA）
- BRIA RMBG-2.0（CC BY-NC）、APISR（僅限學術）
- TRELLIS.2（匯出依賴 nvdiffrast 非商用授權）
- Depth Anything V2 Base／Large／Giant、DA3 Large／Giant／Nested
- 沒有標授權的 Civitai LoRA
- FLUX 3 Image Klein：授權有營收門檻與內容審查條款，PZ 同意前不要用

### 3.4 LoRA 訓練
- **kohya_ss GUI**（v26，Windows 原生，用 `gui-uv.bat`）／sd-scripts，裝在 `C:\GameStudio\ArtLab\training\`。
- Illustrious 角色 LoRA 起始參數：
  - rank 16–32、clip skip 2、1000–2000 步。
  - 優化器先用 Prodigy＋cosine。社群實測，原創角色的臉用預設 AdamW8bit 常學不起來；不行再試 AdamW8bit、學習率 1e-4。
  - 資料集 20–60 張。
  - 預估一個 LoRA 15–30 分鐘（推估，沒有實測，M0 時量）。
- 備案：ostris **ai-toolkit**（MIT，Windows 用 `run_windows.bat`，官方標實驗性）。它也能訓練 Qwen-Image-Edit-2511 的 LoRA。

### 3.5 產線腳本環境（`C:\GameStudio\ArtLab\pipeline\venv`，Python 3.12）
`dghs-imgutils` 需要 `numpy<2`，所以不能裝進 ComfyUI 的 Python 3.13，要用這個獨立 venv。
- `dghs-imgutils`（MIT）。會用到：`ccip_*`（角色相似度）、`anime_dbaesthetic`／`get_aesthetic_score`（美感分數）、`laplacian_score`（模糊偵測）、`lpips_*`（差異）、`detect_faces`／`detect_eyes`／`detect_heads`／`detect_hands`、`anime_completeness`、`get_wd14_tags`。onnxruntime 先手動裝 CPU 版。
- 像素工具：`unfake`（MIT，有固定色盤、morph／jaggy 清理）、`proper-pixel-art`（MIT，**動畫所有影格共用同一組格線與色盤，防閃爍**）、`PixelOE`（Apache-2.0，大圖轉像素，頭目、天空用）。Pixel Snapper（Rust，MIT）選用。
- `spriterrific`（Apache-2.0）：**只用 `run --existing-video` 處理本機產生的影片**。不要設定 `FAL_KEY`，它的生成功能走付費雲端。
- 其他：pillow、numpy<2、opencv-python、scikit-image、requests、websocket-client、rectpack（打包圖集）。

### 3.6 其他工具
- **KTX-Software**（Windows 安裝包）：大張貼圖轉 KTX2。v5 已移除舊的 `toktx`，改用 `ktx create`；先跑 `--help` 確認旗標。
- **Blender**（免費）：選用。用來渲染 Q 版 3D 骨架範本（給姿勢控制）與 3D 道具；Claude Code 可以用背景模式腳本操作它。
- **Laigter**（GPL-3.0，免費）：選用，法線圖工具。
- **Aseprite**（US$19.99）：選用。要買請先問 PZ；沒有它也能做，你可以直接用程式修像素。

### 3.7 雲端備案（要花錢，先問 PZ）
- **PixelLab**：每月 US$12–50。有官方 MCP，可以做 4／8 方向角色與走路、待機動畫，產出可商用。
- **Retro Diffusion API**：每張約 US$0.18，動畫每次 US$0.07–0.25。
只有本機方法試過仍達不到標準時才提，並說明要花多少錢、能換到什麼。

### 3.8 裝完要驗證
每個模型各試生成一張，記錄：每張秒數、顯示記憶體峰值、品質是否正常（沒有黑圖、沒有亂碼）。寫進 `art/PROGRESS.md`，並在 M0 回報。

---

## 4. 產線工具（你要寫的腳本）

放在 `C:\GameStudio\ArtLab\pipeline\`，用它自己的 venv。原則：**生成交給佇列在背景跑，你只負責出題與審圖**，這樣過夜可以跑大量批次，又不會耗掉對話額度。

| 腳本 | 功能 |
|---|---|
| `comfy_client.py` | 透過 ComfyUI 的 API（`/prompt`、`/history`、`/view`）送出工作流、輪詢、下載結果；工作流存成 API 格式 JSON 範本，參數由工作單填入 |
| `jobrunner.py` | 讀 `jobs\*.json` 工作單（素材 id、工作流、提示詞、種子、張數）依序執行，可中斷續跑，寫 log |
| `qa.py` | 自動初篩（第 6.1 節），每張圖寫一份分數 JSON |
| `contact.py` | 把候選圖排成有編號的對照表（可並排參考圖裁切），讓你一次審一整批，不要一張一張開 |
| `pixelize.py` | 假像素轉真像素：偵測格線、縮回原生解析度、鎖定色盤、清雜點、補外框（第 5.2 節） |
| `atlas.py` | 影格打包成圖集＋索引 JSON（沿用遊戲現有的影格命名）、產生法線圖與發光遮罩 |
| `portrait.py` | 立繪去背、修邊、表情臉部小圖切割與定位、輸出 WebP |
| `export.py` | 把過關成品輸出到 `_build/sources/everlight/assets/`，並更新遊戲讀取用的 `assets/manifest.json` |

腳本檔名不要取成 `queue.py`、`comfy.py` 這類跟 Python 內建模組或 ComfyUI 套件同名的名字，會互相蓋掉。

**兩份清單不要搞混**
- `art/production.json`：**製作清單**。每個素材的規格、狀態、分數、母圖位置，給你自己追進度用。
- `assets/manifest.json`：**遊戲讀取清單**。只列已經換進遊戲的素材檔案與影格索引，遊戲執行時讀它。

---

## 5. 各產線做法

下面用「角色名稱」稱呼工具（例如「立繪主模型」「像素 LoRA」），實際用哪個模型寫在第 3 節。之後換更好的模型，只要改第 3 節。

### 5.1 立繪
1. **角色設定表**：用立繪主模型加 `ART_BIBLE.md` 第 3 節的設定（外型、配件、色碼）寫提示詞，一批生成 48–96 張全身正面候選（不同種子）。`qa.py` 初篩（臉部偵測、畫質分數、色票距離），`contact.py` 排成對照表，你審出 1 張「定稿」。小問題用局部重繪修（燈鉤、圍巾、扣子、手）。再用編輯模型（Qwen-Image-Edit-2511＋轉面 LoRA）從定稿延伸出側面、背面與配件特寫；編輯模型改完的圖，再用立繪主模型以重繪強度 0.3–0.45 重畫一次，把畫風統一回來。最後拼成設定表。
2. **訓練資料集**：從定稿延伸 25–40 張：不同角度、表情、姿勢、構圖（特寫、半身、全身）、光線。每張都必須是同一個人、服裝細節一致（不一致的刪掉）。寫標註：觸發詞（例如 `zw_everlight`）＋簡短描述。
3. **角色 LoRA**：在立繪主模型上訓練（設定見第 3 節）。用一組固定的 10 個測試提示詞驗證：長相一致（角色相似度達門檻）、換姿勢換表情仍自然、沒有過度擬合（背景、構圖不會被鎖死）。不合格就調資料集重訓。
4. **半身立繪**：
   - 標準姿勢：自然站姿，武器部分入鏡。
   - 批次生成、篩選。
   - 修臉、修眼：FaceDetailer＋Anzhc 臉部／眼睛遮罩。
   - 手要逐張檢查手指數量與姿勢。
   - 放大到 2048 高的母圖：RealESRGAN anime 6B，再用 Ultimate SD Upscale 以底模分塊重繪。
   - 去背：BiRefNet_HR-matting 或 ToonOut。
   - 修邊：不能有白邊、灰邊或殘留綠幕色。
5. **表情**：身體鎖定不動，只對臉部遮罩區局部重繪（角色 LoRA＋表情提示詞），每個表情一批、挑最好的。`portrait.py` 算出跟基準圖的差異範圍，切出臉部小圖與座標。
6. **全身圖**：同 LoRA，給角色選單與標題主視覺用。
7. **輸出**：遊戲用 WebP（960×1440，透明，品質約 90）；母圖存 `masters\`。

### 5.2 像素人物與動畫
這是最難的一段。原則：**AI 負責產生草稿，最後的每一顆像素由你用程式逐格修到乾淨**，就像像素畫家在修圖。
1. **像素定稿**：以立繪定稿為參考，生成 Q 版（約 1:3 頭身）正面候選，背景用純綠幕（角色本身有綠色時改洋紅；諾克的圍巾是青綠，用洋紅）。
   - 首選：立繪主模型＋像素 LoRA 做 img2img（重繪強度約 0.6），再疊角色 LoRA 保住長相。
   - 也試：FLUX.2 klein 4B 或 ERNIE 的像素 LoRA 直接生成。M1 時比較三種，選最好的當標準做法。
   - 生成時控制人物在畫面裡的大小，讓縮回原生解析度後人物高 46–52 px。例如像素 LoRA 每個像素約 8 個生成像素時，人物在 1024 的畫面裡要約 370–420 px 高。
   - `pixelize.py`（以 unfake／proper-pixel-art 為核心）偵測格線、縮回原生解析度、裁成 64×64 畫布、套鎖定色盤、清雜點與鋸齒、補局部彩色外框。
   - 審圖後逐像素修正眼睛、臉、手、燈鉤、圍巾。
   - 正面定稿後，用編輯模型＋轉面 LoRA 做出背面、側面（朝左）的草稿，再同樣像素化、修整成定稿。
2. **鎖定色盤**：從立繪色票加上美術聖經 4.1 節的明暗規則，產生該角色 ≤ 32 色的色盤，所有影格強制使用。
3. **動作**：三種方法都試，哪個效果好用哪個（可以混用）：
   - **A. 姿勢控制**：用 Blender 做一個 Q 版 3D 骨架範本，**直接渲染**出每一格的骨架或深度圖（走路 6 格、攻擊 3 格…）。不要從 Q 版圖片偵測骨架，大頭比例會偵測失準。再用 ControlNet 逐格生成，最後用同一色盤像素化。
   - **B. 圖生影片拆格**：
     - 用定稿圖跑 Wan 2.2 I2V＋像素動畫 LoRA，產出原地動作短片。走路約 2 秒，其他動作約 1 秒；提示詞加「static camera」「seamless loop」；綠幕背景。
     - 拆格交給 `spriterrific run --existing-video` 或 proper-pixel-art，讓所有影格共用同一組格線與色盤。
     - **不要每一格各自裁切、置中、縮放**，否則角色會抖。
   - **C. 部件動畫**：把定稿拆成部件（頭、身體、手、腳、外套、圍巾、燈鉤），用程式做位移與旋轉，每格再做像素清理。待機呼吸、圍巾飄動、頭髮晃動很適合用這招。現有 `src/engine/chars.js` 的關節系統可以參考。
   - 不管哪種，每張都要過這些檢查：同色盤、輪廓不抖、腳底基準線固定、格線乾淨。
   - 走路要有重心起伏、手臂擺動、衣擺延遲。
   - 常見殘留問題是影格間色偏、腳滑、手和武器變形，這些最後都要你逐格修。
4. **法線圖**：依形狀推估再手動調整（頭髮、外套、圍巾的彎曲方向），存成 `_n`。
5. **打包**：`atlas.py` 輸出圖集＋索引（影格命名照美術聖經 4.2 節，舊名稱一定要有）。
6. **配角 NPC**：同一套流程，但只做場景 18 格；可以從共用的 Q 版身體骨架改造型，加快速度。

### 5.3 敵人與頭目
1. **概念圖**：用立繪主模型或通用模型畫出設定（剪影要有辨識度：礁蟹的大鉗、水母的燈籠傘、鐵顎鰻的鐵下顎、沉鐘守的鐘身）。審圖定稿。
2. **像素化**：縮到規格大小、鎖色盤（一般 ≤ 40 色、頭目 ≤ 64 色），逐區修像素（牙齒、眼睛、發光紋、鐵片反光）。
3. **發光遮罩 `_e`**、**法線圖 `_n`**。
4. **頭目部件動畫**：
   - 用 SAM 3.1 把頭目拆成部件，再用 Qwen-Image-Layered 補出被遮住的部分，邊緣手修。
   - 每個部件都用同一組格線與色盤重新像素化。
   - 寫部件 JSON：層次、支點、動作曲線（呼吸、張口、擺尾、鐘身擺動、鎖鏈晃動）。
   - **在電腦上預先把動作烘成影格**：位移取整數像素；旋轉先用適合像素的旋轉演算法（RotSprite 類），再重新對齊格線。不要在遊戲裡即時自由旋轉，否則像素會大小不一。
   - 遊戲裡只做整數像素位移，加上閃白、溶解、發光脈動等著色器效果。
   - 再加 2–3 張關鍵姿勢圖（蓄力、攻擊、受擊）。
5. 紫礁蟹用礁蟹改色加刺，不另外生成。

### 5.4 場景
1. **材質**：
   - 用 SDXL 系模型加無縫節點，生成 1024 的可平鋪材質。
   - 用整數倍數縮小（倍數要能整除邊長，才不會破壞無縫），縮成每格 64×64，再套地區色盤。
   - 平鋪測試：位移半格檢查接縫，拼 3×3 看重複感。
   - 做變體與過渡磚。
   - 遠景背景要做視差分層時，可以用 Depth Anything 3 Mono-Large 估深度。
2. **貼花、道具、植物**：像素立牌（透明背景）＋法線圖；同地區共用色盤；植物做成一叢一叢，程式加風擺。
3. **天空與遠景**：全景天空（寬 2048–4096），繪製風、降解析度後輕微像素化；遠景剪影層。
4. **場景美化**：在 `maps.js` 的地圖資料裡加裝飾：前景遮擋、高低差、道具群、植物群、貼花。用截圖跟參考圖 01、02、04 比細節密度。
   - 大部分道具會自動產生碰撞，所以**新的實體道具只能放在原本就走不到的格子**。
   - 可以走的範圍內，只能放沒有碰撞的貼花，或標了 `soft: true` 的植物。
   - 可走路線、劇情點位、敵人位置都不能變；改完用自動試玩確認每條路都走得通。
5. **光**：長明燈光束（體積光錐，會轉）、霧層、水面（法線貼圖＋燈光倒影）、浮塵、窗光光暈。

### 5.5 介面與圖示
1. **介面零件**：生成黃銅透鏡紋的框、角飾、紋章（高解析）→ 去背 → 切成九宮格 → CSS `border-image`。
2. **圖示**：所有圖示用同一組提示詞模板、同一個底框與打光，風格才會統一；輸出 128×128，另存 256 母圖。
3. **不要讓模型生成文字**（中文會寫錯）；介面上的字一律用遊戲字型排。

### 5.6 特效
貼圖用生成（光束、弧光、水刃、霧），動態用程式（旋轉、縮放、加法混合、泛光）。魔法陣用程式畫乾淨的同心圓、刻度、八芒星，再疊生成的紋路貼圖，比整張生成更乾淨。

### 5.7 主視覺
三位主角＋長明燈的標題畫面：用三個角色 LoRA 分區構圖（區域提示或分別生成再合成），燈塔光束當主光源。標題字用遊戲字型，不讓模型寫字。

---

## 6. 品質關卡

四道關卡，前一關沒過不進下一關。

### 6.1 自動初篩（`qa.py`）
| 類型 | 檢查 |
|---|---|
| 立繪 | 動漫臉偵測（剛好一張臉）、角色相似度（跟定稿比，第 3 節的工具）、畫質美感分數、色票距離（髮色、瞳色、主服色在範圍內）、去背邊緣的白邊比例 |
| 像素 | 格線純度、色數、孤立雜點數、外框連續性、影格之間色盤是否一致、腳底基準線是否一致、縮回實際大小後的剪影辨識 |
| 材質 | 無縫測試（位移半格後的接縫落差）、拼 3×3 後的重複感、色盤 |

只把通過的前幾名排進對照表給你審。

### 6.2 你審圖（照美術聖經第 8 節打分）
- 每批用對照表一次審完，旁邊並排參考圖的對應裁切。
- 最後入選的要看兩種大小：原尺寸，以及手機上的實際大小。
- 寫下每項扣分原因；沒過關的回到產線修，不要降標準。

### 6.3 實機驗收
- 換進遊戲 → `tools/shot.py` 截直拿、橫拿（場景走路、對話換表情、戰鬥待機／攻擊／技能／頭目）→ 跟參考圖並排打分。
- 檢查第 8 節的效能數字。

### 6.4 PZ 驗收
只在里程碑結束時，給他看過關的成品與實機截圖（第 9 節的回報格式）。

---

## 7. 換進遊戲（程式改動）

遊戲是 three.js＋esbuild，原始碼在 `_build/sources/everlight/src/`。原則：**素材有就用，沒有就退回原本的程式繪圖**，所以每一步遊戲都能正常玩。

1. **素材讀取 `src/engine/assets.js`（新檔）**：
   - 讀 `assets/manifest.json`。每個圖集記錄：id、檔名、尺寸、影格寬高、影格索引、`ppu`、有沒有 `_n`／`_e`。
   - 依地區分批預載，離開地區就釋放（`texture.dispose()`）；圖片用 `createImageBitmap` 解碼。
   - 某個素材缺檔時，在主控台印出「缺素材：<id>」並退回程式繪圖；截圖檢查時要掃這行。
2. **像素立牌 `src/engine/sprite3d.js`**：
   - `Sheet` 可以吃圖片圖集＋索引 JSON（現在只吃程式畫的 `Pix` 影格）。
   - `Sheet.frameRect()` 假設等格網格，所以**人物與敵人的圖集維持等格網格**，不要用緊密打包。像素抗鋸齒需要的邊界，改成每一格內容四周留 ≥ 2 px 透明邊（不要在格子外面外擴，否則影格寬高會對不上）。道具、貼花這類圖集可以緊密打包，每塊外擴 2 px。
   - `PPU` 現在是全域常數，`battleScene.js` 第 101、670 行也寫死了 `/32`。改成每個圖集用自己 manifest 裡的 `ppu`。
   - 第 60 行會把接近純白的像素當成發光部位。有 `_e` 發光遮罩的圖集改用遮罩，不要再用亮度猜，否則白衣服會發光。
   - 法線圖在立牌翻轉時，X 分量要反過來。
   - 著色器加：法線圖（對附近的燈光算明暗）、發光遮罩（給泛光）、**像素抗鋸齒取樣**（避免非整數縮放時像素閃爍、粗細不一）。
   - 保留現有的燈光池、受擊閃白、剪影、翻面。
   - 像素抗鋸齒取樣：格子內部取最近點，只在格子邊界混一個螢幕像素（參考 Joren Joestar〈Pixel Art Filtering〉一文的比較）。貼圖要改成 `LinearFilter`＋`LinearMipmapLinearFilter` 並產生 mipmap，圖集的每一塊都要有 2 px 緩衝（人物、敵人用格內透明邊，道具類用外擴，見上方），再在著色器裡用：
     ```glsl
     vec4 sharpTex(sampler2D t, vec2 uv) {
       vec2 sz = vec2(textureSize(t, 0));
       vec2 px = uv * sz, seam = floor(px + 0.5);
       px = seam + clamp((px - seam) / max(fwidth(px), 1e-4), -0.5, 0.5);
       return textureGrad(t, px / sz, dFdx(uv), dFdy(uv));
     }
     ```
     場景材質（three.js 內建材質）用 `onBeforeCompile` 把 `#include <map_fragment>` 整行換掉，改呼叫 `sharpTex`。要換整行 include，不能直接搜尋 `texture2D(map…)`，因為那時 include 還沒展開，會找不到。
3. **人物與敵人的圖集接口在 `src/game/game.js`**：`sheet()`（人物）與 `monsterSheet()`（敵人）是建立圖集的地方，在這裡先查 manifest、有素材就用圖片圖集。`chars.js` 的 `characterFrames()`、`monsters.js` 的 `monsterFrames()` 只負責程式繪圖，保留當退路。
   - `battleScene.js` 的 `iconOf()`（行動順序小頭像）與 `ultFx()`（絕技特寫）會從 `sheet.canvas` 取圖。圖片圖集也要提供可以拿來畫的來源（圖片元素或保留一張小 canvas），這幾張不要釋放。
4. **場景 `textures.js`、`world.js`**：
   - 材質圖集改成每格 64 px。缺素材的格子，用原本 32 px 的程式繪圖以最近點放大 2 倍填進去（原本的繪圖函式寫死了 32，不要直接改 `TS`）。
   - `world.js` 的道具大小用全域 `PPU` 計算，改成照各圖集的 `ppu`。
   - 加地表貼花、道具立牌（含法線圖）、植物風擺、天空全景與遠景層、燈塔光束體積光、霧層、水面倒影。
   - **可走路線、劇情點位、敵人位置不能動**。
5. **走路與待機動畫**：輪播邏輯在 `sprite3d.js` 的 `Actor.updateField()`（現在寫死走路 `% 4`、待機 `% 2`）與 `game.js` 的 `spawnActor()`。改成照索引裡實際有幾張來輪播（4 或 6 張走路、2 或 4 張待機都能用）。
   - 鏡頭在 `field.js` 的 `camParams()`：依新美術重調。直拿俯角可能要從 46° 降到 38–42°，讓建築立面與遠景露出來；人物大小照美術聖經 1.1 節。
6. **戰鬥 `battleScene.js`、`fx.js`**：攻擊、施法、勝利播多張影格；倒下影格；頭目部件動畫（用 JSON 描述部件、支點、動作曲線，動作預先烘成影格，見 5.3 節）；明暗翻面的光束掃過；技能特效改用貼圖。
7. **對話 `ui.js`、`story.js`、`game.js`**：
   - `game.js` 第 198 行的劇情介面 `say(name, text)` 現在會丟掉第三個參數，要改成把 `{ face }` 傳給 `ui.say()`。
   - 說話者是中文名字（`story.js` 開頭的 `W = '魏子葳'` 等），要建一張「名字 → 角色 id」對照表，才找得到立繪。
   - `ui.say(name, text, { face })` 顯示說話者立繪與表情，直拿／橫拿各一套版面（美術聖經第 5 節），不說話的一方調暗。
   - 幫 `story.js` 每句台詞標上合適的表情，照角色個性判斷。沒標的用該角色的預設表情（美術聖經第 3 節每個角色表情清單的第一個）。
   - 介面換成黃銅燈塔透鏡風（CSS `border-image` 九宮格切片＋圖示）。
8. **標題畫面**：換上主視覺。
9. **畫質設定**：保留「高／中／低」。低畫質關掉法線圖、景深、部分貼花與粒子，但人物與立繪清晰度不能降。
10. **組建 `tools/build.mjs`**：`assets/` 一起複製到 `dist/web/assets/`；Claude 版改成「`index.html`＋`assets/`」多檔版本輸出到 `dist/claude/`（不要把圖片轉成 base64 塞進單檔）。

每改完一段，用 `tools/shot.py` 截圖自己檢查（直拿＋`--land` 橫拿，一律加 `--url web/index.html`，因為預設的單檔版本沒有 `assets/`，會默默顯示舊美術），並跑一次自動試玩，確認從開場到第一章結局都正常。

---

## 8. 手機效能預算

iPhone Safari 沒有公開的記憶體上限，超過就會被系統直接關掉重載（收藏庫 2026-11-05 才修過一大串這種閃退）。以下是安全範圍：

| 項目 | 上限 |
|---|---|
| 同時在顯示記憶體裡的貼圖 | 150–200 MB（以解碼後計算：寬×高×4 bytes，有 mipmap 再乘 1.33） |
| 整個頁面 | 500 MB 以內 |
| 單張貼圖 | 主力 2048×2048，最大 4096（部分 Android 不支援更大） |
| 畫布（canvas）總量 | iOS 上限約 384 MB。素材換成圖片後，不要再建立程式繪圖用的 canvas；必要的 canvas 上傳到 GPU 後把寬高設成 1 釋放 |
| 下載量 | 第一章全部素材目標 ≤ 30 MB；按地區分批載入，開場第一個畫面 ≤ 8 MB |
| 畫面更新率 | 中階手機 ≥ 30 fps、高階 60 fps；畫質「中」是手機預設 |

**格式**
- 像素人物、敵人、小張材質：無損 PNG（可用索引色 PNG8 縮小檔案）。**不能用有損壓縮**，會毀掉像素。
- 立繪、介面、圖示（顯示在網頁介面上的圖）：WebP。
- WebGL 裡的大張貼圖（頭目、場景圖集、天空）：可以用 KTX2 的 **UASTC**（品質 4、zstd 18、關掉 RDO 或 λ ≤ 0.5）省下約四分之三的顯示記憶體。**不要用 ETC1S**，它在像素畫相鄰飽和色的地方會壞掉。
  - 用之前先比對像素有沒有糊掉。
  - KTX2 尺寸要是 4 的倍數。
  - mipmap 要在轉檔時就產生（`ktx create` 的 `--generate-mipmap`），遊戲裡不能再自動產生。
  - KTX2 貼圖不能翻轉 Y 軸，立牌的 UV 要自己翻，或編碼前先把圖上下翻轉。
  - three.js 的 KTX2 解碼器檔案（`three/examples/jsm/libs/basis/` 裡的 `basis_transcoder.js` 與 `.wasm`）要一起複製進 `dist/web/` 與 `dist/claude/`，並在程式裡設定解碼器路徑。

**渲染**
- 解析度上限：高畫質 2 倍、中 1.5 倍、低 1 倍（現有設定），後製一律半解析度。
- 不要用點光源陰影（每盞燈要多畫 6 次場景；有 iPhone 因此直接閃退的案例）；人物、道具用現有的圓形假陰影，或依光源方向斜切的剪影陰影。
- 光束、光柱用加法混合的漸層面片加捲動雜訊，不要用逐像素的 god rays 後製。
- 水面倒影用假的（翻轉的倒影立牌加法線擾動），不要用會把場景重畫一次的 Reflector。
- 立牌要維持 alpha 小於 0.5 就丟棄、而且寫入深度，景深才會正確。
- 現有的後製（景深＋泛光＋暗角）保留。要換成 pmndrs postprocessing（把多個效果合成一個 pass）可以，但不要用 three.js 的 `BokehPass`，它會讓立牌周圍出現方框狀的暈。

**驗收**：每個里程碑用截圖工具量每格耗時，並請 PZ 用 iPhone 實際玩 5 分鐘，回報有沒有發燙、卡頓、閃退。

---

## 9. 里程碑與回報

| 里程碑 | 內容 | 結束時 |
|---|---|---|
| **M0 安裝與試跑**（約半天，含下載） | 環境檢查 → 下載清單給 PZ 同意 → 安裝 → 每個模型試生成、量速度 → 產線腳本骨架 → 修好遊戲工具的 Windows 問題（見下方）→ 遊戲能在筆電組建、截圖、自動試玩 | 回報：裝了什麼、佔多少空間、各模型速度、遇到的問題。不用等 PZ，直接進 M1 |
| **M1 魏子葳樣板**（約 1–3 天） | 設定表 → LoRA → 立繪＋8 表情＋全身 → 像素全套＋法線圖 → 換進遊戲（含對話立繪、戰鬥多影格）→ 實機截圖驗收 | 回報給 PZ 看（只放過關的成品與截圖）。**等 PZ 確認才進 M2** |
| **M2 其他角色**（約 3–5 天） | 莉瑟、諾克、歐文、卡斯坦、葛雷、配角、人類敵人 | 回報 |
| **M3 敵人與頭目**（約 3–5 天） | 9 種敵人＋鐵顎鰻、沉鐘守（部件動畫、發光） | 回報 |
| **M4 場景**（約 1 週） | 材質、貼花、道具、植物、天空、遠景、光束、水面、場景美化、戰鬥舞台 | 回報 |
| **M5 介面、圖示、特效、主視覺**（約 3–5 天） | 黃銅燈塔透鏡介面、49 個圖示＋6 個紋章、技能與魔法陣、標題主視覺 | 回報 |
| **M6 整合與發佈**（約 1–2 天） | 全章自動試玩、效能驗收、正式取代舊版、更新收藏庫、發布 Claude 版 | 完工報告 |

時間是估計，以品質為準，不用為了趕時間降低標準。

**M0 要先修好的 Windows 問題**（遊戲工具原本是在 Linux 上寫的）
- `tools/build.mjs` 第 5 行用 `new URL(import.meta.url).pathname` 算路徑，在 Windows 會變成 `C:\C:\…`。改用 `fileURLToPath(import.meta.url)`。
- `tools/shot.py` 寫死了 `/usr/bin/google-chrome` 與軟體繪圖（SwiftShader）參數。改用 Playwright 內建的 Chromium；量效能時拿掉 SwiftShader 參數，用筆電的顯示卡跑，數字才有意義。
- `tools/icon.py` 把預覽圖存到 `/tmp/`，Windows 沒有這個資料夾，改存到 `dist/`。
- 現在沒有「從開場打到第一章結局」的自動試玩腳本，只有遊戲裡的 `window.__game` 介面。寫一份自動試玩步驟檔放在 `tools/`，之後每個里程碑都跑它。
- 這些修改跟美術無關但必要，一樣 commit 進 GitHub。

**每次回報的格式**（繁體中文）
1. 這次完成了什麼（一句話）
2. 成品：只放過關的；附實機截圖（直拿＋橫拿）
3. 分數：美術聖經第 8 節的 8 項分數，加一句「整體做到參考圖的幾成」
4. 還差在哪、下一步怎麼補
5. 需要 PZ 決定的事（沒有就不寫）

**PZ 想在手機上看進度**：M1 起，每個里程碑結束就把目前版本以「美術升級版（製作中）」加進收藏庫的網頁版（第 10 節），原本的第一章不動；Claude 版也維持原狀，M6 才一起正式更新。

---

## 10. 發佈

### 10.1 推上 GitHub 與更新收藏庫
照 `_build/README.md` 的流程，在筆電上的做法：
0. **先同步遠端**：聊天端也會往同一個 repo 推新遊戲，所以每次發佈前（以及每次開新對話時）先在 `C:\GameStudio\PZ-Games` 執行 `git pull --rebase origin main`。
   - 有衝突時，`_build/data/catalog_base.json` 以遠端為準，只把長明那筆的修改加回去。
   - `catalog.json`、根目錄的 `index.html`、`app.js`、`sw.js`、`README.md` 是 build.py 產生的檔案：不要手動合併，以遠端版本為準，之後重跑 build.py 產生。
1. `_build/sources/everlight` 裡 `npm install`（第一次）→ `node tools/build.mjs` → `python tools/icon.py dist/web`。
2. 把 `dist/web/` 全部複製到 `_build/raw/<build-id>/`。製作中的版本用 build id `everlight-hd`；M6 正式版改回 `everlight`。
3. `_build/data/catalog_base.json` 的長明那筆：
   - 製作中：在 `builds` 多加一個 `{ "id": "everlight-hd", "label": "美術升級版", "note": "製作中，每個階段更新" }`。
   - 這個版本沒有 Claude 版網址。收藏庫的 Claude 模式遇到沒有 `artifact` 的版本會出現空連結：第一次加入時，順手在 `_build/src/app.js` 讓 Claude 模式略過沒有 `artifact` 的版本（只改這一點）。
   - M6：移除 `everlight-hd` 這筆，更新主版本，並更新 `updated`、`highlights`、截圖；`games/everlight-hd/` 與 `_build/raw/everlight-hd/` 要手動刪掉。
4. 截圖：`_build/tools/shoot.py`（README 有用法與需要的套件、字型；它也寫死了 Linux 的 Chrome 路徑，比照 M0 的修法改用 Playwright 內建 Chromium）。
5. 組網站：`cd _build` → `python tools/build.py --out .. --only everlight`（沒有原始建置檔的其他遊戲會自動沿用現有版本，不會壞）。
6. 推上（在 Git Bash 執行）：
   - `REPO` 一定要給絕對路徑，`MSG_TAIL` 放**你這次對話規定的署名行**，不要沿用腳本裡的舊預設值：
     `REPO=/c/GameStudio/PZ-Games MSG_TAIL=$'\n\n<署名行>' bash tools/deploy.sh "Update 《長明》美術升級版"`
   - 腳本裡用 `python3`。如果 Git Bash 裡 `python3 --version` 不是 Python 3（Windows 上常是 Microsoft Store 的捷徑），先執行 `python3() { py -3 "$@"; }; export -f python3` 再跑。
   - 如果出現 `$'\r': command not found`，是換行符號被轉成 Windows 格式，先執行 `sed -i 's/\r$//' tools/deploy.sh`。
7. 一兩分鐘後 https://pzwei0105.github.io/PZ-Games/ 會更新，用手機開一次確認。

GitHub 要能 push：先檢查 `gh auth status`；沒登入就請 PZ 自己執行 `gh auth login` 在瀏覽器完成。

### 10.2 Claude 版
Claude 版網址：https://claude.ai/artifact/JpjSqpmxbcSjsTppKoRt4J（有雲端存檔，發布時要保留 `db`、`user` 能力）。**只在 M6 更新**，製作中不動它。
- 你的工具裡如果有 Artifact／發布檔案的工具，就用 `dist/claude/` 的多檔版本發布到同一個網址。
- 沒有的話，在完工報告最後提醒 PZ：「回到聊天跟 Claude 說『同步長明 Claude 版』」。`dist/` 不進 GitHub，所以聊天端會從 GitHub 上的 `src/`＋`assets/` 重新組建再發布；請確認組建需要的東西都已經推上去。

---

## 11. 進度存檔與接續

- 進度寫在 `art/PROGRESS.md`：目前里程碑、做過的決定、試過但失敗的方法、下一步。每完成一件事就更新，並 commit。
- 每個素材的狀態寫在 `art/production.json`（製作清單，第 4 節）。
- 換新對話時，先讀 `art/` 裡的四份文件（本藍圖、美術聖經、素材清單、進度），再接著做。
- `art/LICENSES.md`：每個模型、LoRA、工具的名稱、版本、來源網址、授權、是否可商用。
