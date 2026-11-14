#!/usr/bin/env python3
"""把一款用 PZ 引擎寫的遊戲組成單一 HTML。

用法：python3 _build/engine/tools/pzbuild.py <遊戲資料夾> [--dev]

遊戲資料夾：
  pz.json            遊戲資訊（見下面）
  src/index.html     （可省略）放進 #pz-ui 的 DOM 介面
  src/*.css          （可省略）遊戲自己的樣式
  src/*.js           遊戲程式，依檔名順序串起來
  assets/            （可省略）圖片、音檔：自動變成 PZ_ASSETS['檔名'] 的 data URL；
                     assets/icon.png（建議 1024×1024）當 App 圖示，沒有就自動做一個

pz.json：
  {
    "id": "last-order", "title": "最後一單", "en": "LAST ORDER", "version": "2.0.0",
    "engine": "1.0",                // 用 releases/ 裡 1.0.x 最新的那版；"dev" 用開發版（只在做引擎時用）
    "background": "#07090d", "accent": "#ffb547",
    "orientation": "any",           // manifest 的方向
    "fonts": { "PZ Sans": "sans-black" },  // 嵌入字型（只留用到的字）：sans-regular/bold/black、serif-bold/black，或字型檔路徑
    "head": "<link …>"              // （可省略）原封不動放進 <head>，例如網路字型
  }

輸出：
  dist/artifact/index.html   Claude 版（單檔，沒有 manifest）
  dist/web/                  獨立網頁版：index.html＋manifest.webmanifest＋icon-192/180/512.png
                             放進 PZ 遊戲收藏時整個複製到 _build/raw/<id>/
"""
import argparse
import base64
import datetime
import glob
import io
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys

ENGINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = '/usr/share/fonts/opentype/noto'
FONT_ALIAS = {
    'sans-regular': ('NotoSansCJK-Regular.ttc', 3), 'sans-medium': ('NotoSansCJK-Medium.ttc', 3), 'sans-bold': ('NotoSansCJK-Bold.ttc', 3),
    'sans-black': ('NotoSansCJK-Black.ttc', 3), 'serif-regular': ('NotoSerifCJK-Regular.ttc', 3), 'serif-bold': ('NotoSerifCJK-Bold.ttc', 3),
    'serif-black': ('NotoSerifCJK-Black.ttc', 3),
}
ALWAYS = (''.join(chr(c) for c in range(32, 127)) + '，。、；：！？「」『』（）《》〈〉…—～·．％＋－×÷＝０１２３４５６７８９'
          '設定音樂效畫面震動閃光回饋傷害數字質自平衡精細流暢省電鎖幀觸控按鈕大小存檔複製貼上讀取碼成功不對請整段再一次完成重恢復預暫停繼續確取消好'
          '遊戲出了點問題可以先按玩如果直現給位置新載入中有兩份進度這台裝置另只能留沒選那會被蓋掉接的正在連上你帳號跟著換開自己同步過剛分鐘前'
          '對話紀錄關閉還快轉要麼做把手機轉成橫豎的')


def engine_file(want, dev):
    if dev or want == 'dev':
        f = os.path.join(ENGINE, 'build', 'pz-engine.js')
        if not os.path.exists(f) or '--dev' in sys.argv:
            subprocess.run([sys.executable, os.path.join(ENGINE, 'tools', 'build_engine.py')], check=True, capture_output=True)
        return f, 'dev'
    rels = glob.glob(os.path.join(ENGINE, 'releases', 'pz-engine-*.js'))
    def ver(p): return tuple(int(x) for x in re.search(r'pz-engine-(\d+\.\d+\.\d+)\.js', p).group(1).split('.'))
    want_t = tuple(int(x) for x in str(want).split('.'))
    ok = [p for p in rels if ver(p)[:len(want_t)] == want_t]
    if not ok:
        sys.exit(f'找不到引擎 {want} 的正式版（releases/）。可以用 "engine": "dev" 先開發，或先跑 build_engine.py --release')
    best = max(ok, key=ver)
    return best, '.'.join(map(str, ver(best)))


def read(p): return open(p, encoding='utf-8').read()


def subset_font(spec, text):
    from fontTools.ttLib import TTFont
    from fontTools import subset
    if spec in FONT_ALIAS:
        path, idx = os.path.join(FONT_DIR, FONT_ALIAS[spec][0]), FONT_ALIAS[spec][1]
    else:
        path, idx = spec, 0
    f = TTFont(path, fontNumber=idx) if path.endswith('.ttc') else TTFont(path)
    opts = subset.Options()
    try:
        import brotli  # noqa: F401
        flavor, mime = 'woff2', 'font/woff2'
    except ImportError:
        flavor, mime = 'woff', 'font/woff'
    opts.flavor = flavor
    opts.layout_features = ['*']
    opts.name_IDs = []
    opts.notdef_outline = True
    s = subset.Subsetter(opts)
    s.populate(text=text)
    s.subset(f)
    f.flavor = flavor
    buf = io.BytesIO()
    f.save(buf)
    return base64.b64encode(buf.getvalue()).decode(), mime, flavor


def make_icon(meta, out_dir):
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    S = 1024
    bg = meta.get('background', '#0b0e14')
    ac = meta.get('accent', '#ffb547')
    h2 = lambda c: tuple(int(c.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)) if len(c.lstrip('#')) == 6 else (16, 18, 24)
    b, a = h2(bg), h2(ac)
    im = Image.new('RGB', (S, S), b)
    d = ImageDraw.Draw(im)
    for y in range(S):
        t = y / S
        d.line([(0, y), (S, y)], fill=tuple(int(b[i] * (1 - t * 0.5) + a[i] * 0.10 * (1 - t)) for i in range(3)))
    glow = Image.new('RGB', (S, S), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse([S * .16, S * .16, S * .84, S * .84], outline=a, width=34)
    glow = glow.filter(ImageFilter.GaussianBlur(28))
    im = Image.composite(Image.new('RGB', (S, S), a), im, glow.convert('L').point(lambda v: min(255, v * 2)))
    d = ImageDraw.Draw(im)
    d.ellipse([S * .16, S * .16, S * .84, S * .84], outline=tuple(min(255, int(c * 1.15) + 20) for c in a), width=12)
    ch = (meta.get('icon_char') or meta.get('title', 'P') or 'P')[0]
    try:
        font = ImageFont.truetype(os.path.join(FONT_DIR, 'NotoSansCJK-Black.ttc'), 470, index=3)
    except Exception:
        font = ImageFont.load_default()
    bb = d.textbbox((0, 0), ch, font=font)
    d.text(((S - (bb[2] - bb[0])) / 2 - bb[0], (S - (bb[3] - bb[1])) / 2 - bb[1] - 10), ch, font=font, fill=(250, 248, 244))
    return im


def build(game, dev=False):
    game = os.path.abspath(game)
    meta = json.load(open(os.path.join(game, 'pz.json'), encoding='utf-8'))
    gid, title = meta['id'], meta.get('title', meta['id'])
    src = os.path.join(game, 'src')
    eng_path, eng_ver = engine_file(meta.get('engine', '1.0'), dev)
    engine_js = read(eng_path)
    js_files = sorted(glob.glob(os.path.join(src, '*.js')))
    css_files = sorted(glob.glob(os.path.join(src, '*.css')))
    body = read(os.path.join(src, 'index.html')) if os.path.exists(os.path.join(src, 'index.html')) else ''
    game_js = '\n'.join(f'/* ---- {os.path.basename(f)} ---- */\n' + read(f) for f in js_files)
    game_css = '\n'.join(read(f) for f in css_files)
    # 素材 → data URL
    assets = {}
    adir = os.path.join(game, 'assets')
    if os.path.isdir(adir):
        for f in sorted(glob.glob(os.path.join(adir, '**', '*'), recursive=True)):
            if os.path.isdir(f) or os.path.basename(f).startswith('icon'):
                continue
            rel = os.path.relpath(f, adir).replace(os.sep, '/')
            mime = mimetypes.guess_type(f)[0] or 'application/octet-stream'
            assets[rel] = f'data:{mime};base64,' + base64.b64encode(open(f, 'rb').read()).decode()
    stamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    head_js = f'window.PZ_GAME = {json.dumps({"id": gid, "title": title, "version": meta.get("version", "1.0.0"), "engine": eng_ver, "built": stamp}, ensure_ascii=False)};\n'
    if assets:
        head_js += 'window.PZ_ASSETS = ' + json.dumps(assets) + ';\n'
    # 字型
    fonts_css = ''
    if meta.get('fonts'):
        text = ALWAYS + ''.join(re.findall(r'[^\x00-\x7f]', game_js + body + game_css + json.dumps(meta, ensure_ascii=False)))
        text = ''.join(sorted(set(text)))
        for fam, spec in meta['fonts'].items():
            b64, mime, flavor = subset_font(spec, text)
            fonts_css += f"@font-face{{font-family:'{fam}';src:url(data:{mime};base64,{b64}) format('{flavor}');font-display:block}}\n"
        print(f'  字型：{len(meta["fonts"])} 套、{len(text)} 個字、{len(fonts_css) // 1024} KB')
    bg = meta.get('background', '#000')
    page = f'''<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="{bg}"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="{title}">
<meta name="format-detection" content="telephone=no">
<title>{title}</title>
{meta.get('head', '')}
<!--PWA-->
<style>{fonts_css}html,body{{background:{bg}}}
{game_css}</style></head>
<body><div id="pz-root"><div id="pz-ui">{body}</div></div>
<script>/* PZ Engine {eng_ver} */
{engine_js}</script>
<script>{head_js}{game_js}</script>
</body></html>
'''
    dist = os.path.join(game, 'dist')
    art_dir, web_dir = os.path.join(dist, 'artifact'), os.path.join(dist, 'web')
    for d in (art_dir, web_dir):
        os.makedirs(d, exist_ok=True)
    open(os.path.join(art_dir, 'index.html'), 'w', encoding='utf-8').write(page.replace('<!--PWA-->', '<link rel="icon" href="data:,">'))
    pwa = ('<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png">'
           '<link rel="apple-touch-icon" href="icon-180.png">')
    open(os.path.join(web_dir, 'index.html'), 'w', encoding='utf-8').write(page.replace('<!--PWA-->', pwa))
    manifest = {'name': f'{title} {meta.get("en", "")}'.strip(), 'short_name': title, 'start_url': './', 'scope': './', 'display': 'standalone',
                'orientation': meta.get('orientation', 'any'), 'background_color': bg, 'theme_color': bg,
                'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any maskable'}]}
    json.dump(manifest, open(os.path.join(web_dir, 'manifest.webmanifest'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    from PIL import Image
    icon_src = os.path.join(adir, 'icon.png')
    im = Image.open(icon_src).convert('RGB') if os.path.exists(icon_src) else make_icon(meta, web_dir)
    for s in (512, 192, 180):
        im.resize((s, s), Image.LANCZOS).save(os.path.join(web_dir, f'icon-{s}.png'))
    kb = os.path.getsize(os.path.join(art_dir, 'index.html')) // 1024
    print(f'  {title}：引擎 {eng_ver}、{len(js_files)} 支程式、{len(assets)} 個素材 → {kb} KB')
    return meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('game')
    ap.add_argument('--dev', action='store_true', help='用開發版引擎（build/pz-engine.js）')
    a = ap.parse_args()
    build(a.game, a.dev)


if __name__ == '__main__':
    main()
