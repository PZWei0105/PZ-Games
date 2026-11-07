#!/usr/bin/env python3
"""試玩關（橫版重做）組建：python3 build.py → dist/index.html

共用舊版的：樣式（../src/00_head.html 的 <style>）、工具、記憶稀有度、老韓的故事資料、聲音、角色手繪、標題背景。
試玩關自己的程式在 src/（2x_*.js）。
"""
import os, glob, re

ROOT = os.path.dirname(os.path.abspath(__file__))
OLD = os.path.join(ROOT, '..', 'src')
SHARED = ['01_util.js', '02_data.js', '03_story.js', '04_audio.js', '09_sprites.js', '11_scenes.js']

def build():
    old_head = open(os.path.join(OLD, '00_head.html'), encoding='utf-8').read()
    css_start = old_head.index('<style>')
    css_end = old_head.index('</style>')
    pre = old_head[:css_start].replace('<!--PWA-->', '').replace('<title>竊夢者 DREAMTHIEF</title>', '<title>竊夢者・試玩關</title>')
    base_css = old_head[css_start + len('<style>'):css_end]
    slice_head = open(os.path.join(ROOT, 'src', '00_head.html'), encoding='utf-8').read()
    css, body = slice_head.split('<!--BODY-->')
    js = '\n'.join(open(os.path.join(OLD, f), encoding='utf-8').read() for f in SHARED)
    js += '\n' + '\n'.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(ROOT, 'src', '*.js'))))
    html = pre + '<style>' + base_css + css + '</style>\n</head>\n<body>\n' + body + '\n<script>\n' + js + '\n</script>\n</body>\n</html>\n'
    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    open(os.path.join(ROOT, 'dist', 'index.html'), 'w', encoding='utf-8').write(html)
    open(os.path.join(ROOT, 'dist', 'bundle.js'), 'w', encoding='utf-8').write(js)
    print('built', os.path.getsize(os.path.join(ROOT, 'dist', 'index.html')) // 1024, 'KB')

if __name__ == '__main__':
    build()
