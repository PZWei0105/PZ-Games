#!/usr/bin/env python3
"""補番 BINGE — 組建腳本

把 src/ 的 HTML、CSS、JS、顯示字型（Dela Gothic One 的子集）內嵌成單一 index.html，
輸出網頁版到 <repo>/apps/binge/（含 manifest、service worker、圖示）。
**不碰 apps/binge/data/**：channels.json 手寫，me.json／roster.json 由 GitHub Actions 寫。
片庫不在 main：管線推到 binge-data 分支，App 從 raw.githubusercontent.com 讀。

沒有 Claude 版：artifact 裡不能嵌 YouTube 播放器、也讀不到每 30 分鐘更新的片庫（同《觀戰》《解包》）。

顯示字型：只收畫面上固定的大字（標題、按鈕、開場…）用到的字。改了這些字，build 會自己發現少了哪些字、
用 npm 下載 @fontsource/dela-gothic-one 重做子集（src/fonts/display.woff2 ＋ display.txt），沒有網路就沿用舊的（缺的字會用系統字）。

用法：
  python3 _build/apps/binge/build.py            # 網頁版
  python3 _build/apps/binge/build.py --icons    # 重畫圖示（需要 playwright）
"""
import argparse, base64, glob, json, os, re, shutil, subprocess, tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
REPO = os.path.abspath(os.path.join(ROOT, '..', '..', '..'))
OUT = os.path.join(REPO, 'apps', 'binge')
JS_ORDER = ['core.js', 'sound.js', 'fx.js', 'player.js', 'views.js', 'main.js']
FONT = os.path.join(SRC, 'fonts', 'display.woff2')
FONT_CHARS = os.path.join(SRC, 'fonts', 'display.txt')
MANIFEST = {
    'name': '補番 BINGE',
    'short_name': '補番',
    'description': '痞子葳的動畫放映室：AI 漫劇、沙雕動畫、日本動畫、國漫、卡通；好幾十個小時的長片合輯一口氣補完，手機和電腦接著看。',
    'lang': 'zh-Hant-TW',
    'start_url': './',
    'scope': './',
    'display': 'standalone',
    'orientation': 'any',
    'background_color': '#1c1150',
    'theme_color': '#1c1150',
    'icons': [
        {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}
# 一定要有的顯示字（程式裡組出來的字串抓不到的）
EXTRA = ('補番BINGE第話集放映中完食抽中！NEW+次回預告立刻看先不要晚安今天也一口氣看完吧補完計畫開始放映室開門了下一集馬上開播片頭曲'
         '今天補什麼番深夜補番記得留點睡眠你追的部出新集了週末一口氣看完吧早安午安午後好晚上好夜深了，、。「」『』《》？！…·：–—★☆'
         '深夜補番王補番狂戰士一口氣達人追番中新手放映員小時分清晨白天黃昏深夜痞子葳從看起開始接著看下一再看一次轉一下試試手氣接下來以下～ 0123456789')


def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()


def version():
    with open(os.path.join(ROOT, 'VERSION'), encoding='utf-8') as f:
        return f.read().strip()


def display_chars():
    """畫面上用顯示字型（class="d"）的固定文字。"""
    text = EXTRA
    for name in JS_ORDER + ['index.html']:
        s = read(name)
        for m in re.finditer(r'(?:secHead|pageHead|titleCard)\(\s*\'([^\']+)\'', s):
            text += m.group(1)
        for m in re.finditer(r'class="(?:[^"]*\s)?d(?:\s[^"]*)?"[^>]*>([^<]*)<', s):
            text += re.sub(r'\$\{[^}]*\}', '', m.group(1))
        for m in re.finditer(r"\['([^']+)',\s*/", s):        # 題材（GENRES）
            text += m.group(1)
        for m in re.finditer(r"zh: '([^']+)'", s):           # 類別、格式
            text += m.group(1)
        for m in re.finditer(r"\[\['1', '[^\]]+\]\]", s):     # 片長分類
            text += m.group(0)
    for m in re.finditer(r"OP_LINES = \[([^\]]+)\]", read('main.js')):
        text += m.group(1)
    chars = set(ch for ch in text if ord(ch) >= 32 and not ch.isspace()) | set(chr(c) for c in range(32, 127))
    return chars


def make_font(chars):
    """用 npm 的 @fontsource/dela-gothic-one（照字分段的 woff2）合成需要的子集。"""
    from fontTools.ttLib import TTFont
    from fontTools import subset
    from fontTools.merge import Merger
    tmp = tempfile.mkdtemp(prefix='binge-font-')
    try:
        subprocess.run(['npm', 'pack', '@fontsource/dela-gothic-one', '--silent'], cwd=tmp, check=True, capture_output=True, timeout=120)
        tgz = glob.glob(os.path.join(tmp, '*.tgz'))[0]
        subprocess.run(['tar', 'xzf', tgz], cwd=tmp, check=True)
        parts = []
        cps = {ord(c) for c in chars}
        for f in sorted(glob.glob(os.path.join(tmp, 'package', 'files', 'dela-gothic-one-*-400-normal.woff2'))):
            t = TTFont(f)
            inter = sorted(cps & set(t.getBestCmap()))
            if not inter:
                continue
            o = subset.Options()
            o.layout_features = ['*']
            o.notdef_outline = True
            ss = subset.Subsetter(o)
            ss.populate(unicodes=inter)
            ss.subset(t)
            t.flavor = None
            p = os.path.join(tmp, 'part%03d.ttf' % len(parts))
            t.save(p)
            parts.append(p)
        font = Merger().merge(parts)
        font.flavor = 'woff2'
        os.makedirs(os.path.dirname(FONT), exist_ok=True)
        font.save(FONT)
        have = ''.join(sorted(chr(c) for c in font.getBestCmap()))
        with open(FONT_CHARS, 'w', encoding='utf-8') as f:
            f.write(have)
        print('顯示字型：重做子集，%d 字、%.0f KB' % (len(have), os.path.getsize(FONT) / 1024))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def ensure_font():
    chars = display_chars()
    have = set(open(FONT_CHARS, encoding='utf-8').read()) if os.path.exists(FONT_CHARS) else set()
    asked = set(open(FONT_CHARS + '.asked', encoding='utf-8').read()) if os.path.exists(FONT_CHARS + '.asked') else set()
    missing = chars - have - (asked - have)      # 字型本身沒有的字（例如「說」）不要每次都重做
    if missing or not os.path.exists(FONT):
        try:
            make_font(chars | have)
            with open(FONT_CHARS + '.asked', 'w', encoding='utf-8') as f:
                f.write(''.join(sorted(chars | have)))
            have = set(open(FONT_CHARS, encoding='utf-8').read())
        except Exception as e:  # noqa: BLE001
            print('顯示字型：重做失敗（%s），沿用舊的' % e)
    nope = sorted(chars - have)
    if nope:
        print('顯示字型沒有這些字（會用系統字）：' + ''.join(nope[:60]))


def fonts_css():
    with open(FONT, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('ascii')
    return '@font-face{font-family:"BingeD";font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,%s) format("woff2")}' % b64


def compose(ver):
    html = read('index.html')
    js = '\n'.join('/* ---- %s ---- */\n' % n + read(n) for n in JS_ORDER)
    css = read('style.css')
    for k, v in (('CSS', css), ('JS', js)):
        assert '</script' not in v.lower(), k + ' contains </script>'
        assert '</style' not in v.lower(), k + ' contains </style>'
    assert "const VERSION = '1.0.0';" in js
    js = js.replace("const VERSION = '1.0.0';", "const VERSION = '%s';" % ver)
    head = ('<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
            '<link rel="icon" type="image/png" href="icons/icon-192.png">')
    html = html.replace('<!--WEBHEAD-->', head, 1).replace('<!--WEBFLAG-->', '<script>window.BG_WEB = true;</script>', 1)
    return html.replace('/*FONTS*/', fonts_css(), 1).replace('/*CSS*/', css, 1).replace('/*JS*/', js, 1)


ICON_HTML = """<!DOCTYPE html><html><body style="margin:0;background:transparent">
<div id="i" style="width:512px;height:512px;border-radius:RADpx;overflow:hidden;position:relative;background:linear-gradient(180deg,#1c1150 0%,#4a2378 34%,#a23a7e 62%,#ee6a6a 84%,#ffb45e 100%)">
 <div style="position:absolute;inset:0;transform:scale(SC);transform-origin:50% 50%">
  <div style="position:absolute;inset:-30%;background:repeating-conic-gradient(from 0deg at 50% 46%,rgba(255,255,255,.16) 0 2deg,transparent 2deg 11deg)"></div>
  <div style="position:absolute;left:316px;top:56px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,#ffe7a8 0 40%,rgba(255,200,120,.5) 44%,rgba(255,200,120,0) 70%)"></div>
  <div style="position:absolute;left:0;right:0;top:104px;text-align:center;font:400 212px/1 'BingeD';color:#fff;-webkit-text-stroke:34px #17112a;paint-order:stroke fill;text-shadow:16px 16px 0 #ff4f9a;transform:rotate(-6deg);letter-spacing:-8px">補番</div>
  <div style="position:absolute;left:50%;bottom:58px;transform:translateX(-50%) rotate(-3deg);display:flex;align-items:center;gap:14px;padding:12px 26px 10px 16px;background:#ffd23f;border:9px solid #17112a;border-radius:30px;box-shadow:10px 10px 0 #17112a;font:400 60px/1 'BingeD';color:#17112a;letter-spacing:4px">
   <span style="display:grid;place-items:center;width:58px;height:58px;border-radius:50%;background:#17112a;color:#ffd23f;font-size:30px;padding-left:6px">▶</span>BINGE</div>
 </div>
</div></body></html>"""


def icons():
    from playwright.sync_api import sync_playwright
    from PIL import Image
    os.makedirs(os.path.join(OUT, 'icons'), exist_ok=True)
    face = '<style>' + fonts_css() + '</style>'
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 512, 'height': 512})
        for name, rad, sc, size in (('icon-512.png', 0, 1, 512), ('icon-192.png', 0, 1, 192), ('apple-touch-icon.png', 0, 1, 180), ('maskable-512.png', 0, 0.78, 512)):
            pg.set_content(face + ICON_HTML.replace('RAD', str(rad)).replace('SC', str(sc)))
            pg.wait_for_timeout(500)
            path = os.path.join(OUT, 'icons', name)
            pg.locator('#i').screenshot(path=path, omit_background=True)
            if size != 512:
                Image.open(path).resize((size, size), Image.LANCZOS).save(path)
        b.close()
    print('圖示已更新')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--icons', action='store_true')
    a = ap.parse_args()
    ver = version()
    ensure_font()
    os.makedirs(os.path.join(OUT, 'data'), exist_ok=True)
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(compose(ver))
    with open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
        json.dump(MANIFEST, f, ensure_ascii=False, indent=1)
    sw = read('sw.js').replace("const CACHE = 'binge-1.0.0';", "const CACHE = 'binge-%s';" % ver)
    assert 'binge-%s' % ver in sw
    with open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8') as f:
        f.write(sw)
    if a.icons or not os.path.exists(os.path.join(OUT, 'icons', 'icon-512.png')):
        icons()
    size = os.path.getsize(os.path.join(OUT, 'index.html'))
    print('網頁版 → %s（index.html %.0f KB，版本 %s）' % (os.path.relpath(OUT, REPO), size / 1024, ver))


if __name__ == '__main__':
    main()
