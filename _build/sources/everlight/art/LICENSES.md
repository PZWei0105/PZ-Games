# 模型、LoRA、工具授權紀錄

> 原則：只用「產出可以商用」的東西。下表是 2026-11-06 聊天端查證的預定清單；筆電安裝時以官方頁面為準，實際裝了什麼、哪個版本、授權原文連結，都更新在這裡。
> 狀態：預定／已安裝／棄用。

| 名稱 | 用途 | 授權 | 產出可商用 | 來源 | 狀態 |
|---|---|---|---|---|---|
| ComfyUI（Portable NVIDIA） | 生圖平台 | GPL-3.0 | ✅（工具） | github.com/Comfy-Org/ComfyUI | 預定 |
| Illustrious-XL v2.0 | 立繪主模型 | creativeml-openrail-m | ✅ | huggingface.co/OnomaAIResearch/Illustrious-XL-v2.0 | 預定 |
| Anima v1.0 | 立繪備選 | 模型非商用、產出可商用 | ✅ | huggingface.co/circlestone-labs/Anima | 預定（備選） |
| Animagine XL 4.0 Opt | 立繪備選 | CreativeML Open RAIL++-M | ✅ | huggingface.co/cagliostrolab/animagine-xl-4.0 | 預定（備選） |
| NetaYume Lumina | 立繪備選 | Apache-2.0 | ✅ | huggingface.co/duongve/NetaYume-Lumina-Image-2.0 | 預定（備選） |
| WAI-Illustrious | 立繪微調版（選用） | 依版本：須為 FAIPL-1.0-SD 且沒有混 NoobAI | 確認後才算 ✅ | civitai.com（模型 827184） | 待確認 |
| Qwen-Image-Edit-2511 | 編輯、轉面、換裝 | Apache-2.0 | ✅ | huggingface.co/Qwen/Qwen-Image-Edit-2511 | 預定 |
| Qwen-Image-Edit-2511 Lightning LoRA | 編輯加速（4 步） | 待確認 | 待確認 | docs.comfy.org 的 Qwen-Image-Edit-2511 教學 | 待確認 |
| Qwen-Image-Edit-2511 Multiple-Angles LoRA | 轉面 | Apache-2.0 | ✅ | huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA | 預定 |
| FLUX.2 klein 4B | 編輯／像素備選 | Apache-2.0 | ✅ | Black Forest Labs | 預定（備選） |
| pixel-art-xl | 像素 LoRA（SDXL） | OpenRAIL-M | ✅ | huggingface.co/nerijs/pixel-art-xl | 預定 |
| limbicnation/pixel-art-lora | 像素 LoRA（klein 4B） | Apache-2.0 | ✅ | huggingface.co/limbicnation/pixel-art-lora | 預定 |
| ERNIE-Image-Turbo | 像素 LoRA 的底模 | Apache-2.0 | ✅ | Baidu | 預定 |
| pixel_assets_general_ernie_v1 | 像素 LoRA（ERNIE-Image-Turbo） | Apache-2.0 | ✅ | huggingface.co/svntax-dev/pixel_assets_general_ernie_v1 | 預定 |
| Qwen-Image-2512 | 像素 LoRA 的底模（選用） | Apache-2.0 | ✅ | Qwen | 預定（選用） |
| PIXELART-REDMOND-QWENIMAGE | 像素 LoRA（Qwen-Image-2512） | Apache-2.0 | ✅ | huggingface.co/artificialguybr/PIXELART-REDMOND-QWENIMAGE | 預定（選用） |
| Wan 2.2 I2V 14B | 動作草稿影片 | Apache-2.0 | ✅ | Wan-AI | 預定 |
| Lightx2v 加速 LoRA（Wan 2.2） | 影片加速（4 步） | 待確認 | 待確認 | lightx2v | 待確認 |
| Wan-Animate-2 | 參考驅動動畫（選用） | Apache-2.0 | ✅ | ComfyUI 原生 | 預定（選用） |
| Wan2-2-pixel-animate | 像素動畫 LoRA | 待確認 | 待確認 | huggingface.co/styly-agents/Wan2-2-pixel-animate | 待確認 |
| ControlNet-Union（SDXL 或 Qwen-Image 系） | 姿勢控制 | 待確認 | 待確認 | — | 待確認 |
| RealESRGAN_x4plus_anime_6B | 放大 | BSD-3-Clause | ✅ | openmodeldb.info | 預定 |
| BiRefNet_HR-matting | 去背 | MIT | ✅ | huggingface.co/ZhengPeng7/BiRefNet_HR-matting | 預定 |
| ToonOut | 動漫去背 | MIT | ✅ | huggingface.co/joelseytre/toonout | 預定 |
| Anzhc Face/Eyes seg YOLO | 臉部偵測 | AGPL-3.0 | ✅（工具） | huggingface.co/Anzhc/Anzhcs_YOLOs | 預定 |
| SAM 3.1 | 分割 | SAM License | ✅ | ComfyUI 原生 | 預定 |
| Qwen-Image-Layered | 分層 | Apache-2.0 | ✅ | github.com/QwenLM/Qwen-Image-Layered | 預定 |
| Depth Anything 3 Mono-Large | 深度 | Apache-2.0 | ✅ | pypi.org/project/depth-anything-3 | 預定 |
| Sprite2Normal | 法線圖 | Apache-2.0 | ✅ | huggingface.co/longtimedevs/sprite2normal | 預定 |
| spritefusion-sprite-normals | 法線圖 | MIT | ✅ | github.com/Hugo-Dz/spritefusion-sprite-normals | 預定（選用） |
| Hunyuan3D 2.1 | 3D 道具 | Tencent Hunyuan 社群授權（台灣可用） | ✅（不得用產出訓練其他 AI） | Tencent | 預定（選用） |
| wd-eva02-large-tagger-v3 | QA 標註 | Apache-2.0 | ✅ | huggingface.co/SmilingWolf/wd-eva02-large-tagger-v3 | 預定 |
| dghs-imgutils | QA | MIT | ✅ | pypi.org/project/dghs-imgutils | 預定 |
| unfake | 像素清理 | MIT | ✅ | github.com/painebenjamin/unfake.py | 預定 |
| proper-pixel-art | 像素清理（動畫共用格線） | MIT | ✅ | github.com/KennethJAllen/proper-pixel-art | 預定 |
| PixelOE | 大圖轉像素 | Apache-2.0 | ✅ | github.com/KohakuBlueleaf/PixelOE | 預定 |
| spriterrific | 影片拆格（只用 `--existing-video`） | Apache-2.0 | ✅ | pypi.org/project/spriterrific | 預定 |
| kohya_ss／sd-scripts | LoRA 訓練 | Apache-2.0 | ✅（工具） | github.com/bmaltais/kohya_ss | 預定 |
| KTX-Software | KTX2 貼圖 | Apache-2.0 | ✅（工具） | github.com/KhronosGroup/KTX-Software | 預定 |

每個模型搭配的文字編碼器、VAE 也各有授權，安裝時逐一記進上表（例如 Qwen-Image 系用的 Qwen2.5-VL、Wan 用的 umt5）。

## 禁止使用
NoobAI-XL 及其衍生、FLUX.1 Kontext [dev]、FLUX.2 klein 9B、Qwen-Image-2.1、4x-AnimeSharp、2x-AnimeSharpV4、BRIA RMBG-2.0、APISR、TRELLIS.2、Depth Anything V2 Base／Large／Giant、DA3 Large／Giant／Nested、沒有標授權的 Civitai LoRA。FLUX 3 Image Klein 需 PZ 同意才可使用。
