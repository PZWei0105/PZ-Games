#!/usr/bin/env python3
"""把 src/ 組成單一 HTML。

輸出：
  dist/artifact/index.html   Claude 版
  dist/web/                  獨立網頁版：index.html、manifest.webmanifest、icon-192/180/512.png
                             （放進 PZ 遊戲收藏時複製到 _build/raw/fallen-court/）
"""
import os, glob, json, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'dist')
ASSETS = os.path.join(ROOT, 'assets')

MANIFEST = {
    'name': '墜庭 FALLEN COURT', 'short_name': '墜庭', 'start_url': './', 'display': 'standalone',
    'orientation': 'any', 'background_color': '#07080e', 'theme_color': '#07080e',
    'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
              {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any maskable'}],
}


def build():
    head = open(os.path.join(SRC, '00_head.html'), encoding='utf-8').read()
    css_path = os.path.join(SRC, '00_style.css')
    css = open(css_path, encoding='utf-8').read() if os.path.exists(css_path) else ''
    head = head.replace('/*CSS*/', css)
    js = '\n'.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(SRC, '*.js'))))
    tail = '\n</script>\n</body>\n</html>\n'
    os.makedirs(os.path.join(DIST, 'artifact'), exist_ok=True)
    web = os.path.join(DIST, 'web')
    os.makedirs(web, exist_ok=True)
    open(os.path.join(DIST, 'artifact', 'index.html'), 'w', encoding='utf-8').write(head.replace('<!--PWA-->', '') + js + tail)
    pwa = ('<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png">'
           '<link rel="apple-touch-icon" href="icon-180.png">')
    open(os.path.join(web, 'index.html'), 'w', encoding='utf-8').write(head.replace('<!--PWA-->', pwa) + js + tail)
    json.dump(MANIFEST, open(os.path.join(web, 'manifest.webmanifest'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for s in ('192', '180', '512'):
        p = os.path.join(ASSETS, f'icon-{s}.png')
        if os.path.exists(p):
            shutil.copy(p, os.path.join(web, f'icon-{s}.png'))
    open(os.path.join(DIST, 'bundle.js'), 'w', encoding='utf-8').write(js)
    print('built', os.path.getsize(os.path.join(DIST, 'artifact', 'index.html')) // 1024, 'KB')


if __name__ == '__main__':
    build()
