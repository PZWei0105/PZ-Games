#!/usr/bin/env python3
"""把《PZ App 引擎》的原始碼 src/ 組成一支 JavaScript（跟《PZ 引擎》build_engine.py 同一套組法）。

用法：
  python3 tools/build_appkit.py            # 開發版 → build/pz-appkit.js（每次都覆蓋）
  python3 tools/build_appkit.py --release  # 正式版 → releases/pz-appkit-<VERSION>.js（已存在而且內容不同就拒絕：改了引擎要把 VERSION 往上加）

組法：src/ 的 .js 照檔名順序串起來、包在一個 IIFE 裡，只對外公開 window.PZA；src/ 的 .css 壓成字串放在 PZA.css（App 要用預設的門鎖樣子時插進 <head>）。
App 用的是 releases/ 裡某一版的**整份複製**（鎖版本）：改引擎不會讓已經上線的 App 壞掉，除非那個 App 重新組建、而且換了版本。
"""
import argparse
import datetime
import glob
import hashlib
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')


def version():
    return open(os.path.join(ROOT, 'VERSION'), encoding='utf-8').read().strip()


def minify_css(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    css = re.sub(r'\s+', ' ', css)
    css = re.sub(r'\s*([{};:,>])\s*', r'\1', css)
    return css.replace(';}', '}').strip()


def assemble(ver=None):
    ver = ver or version()
    js = sorted(glob.glob(os.path.join(SRC, '*.js')))
    css = sorted(glob.glob(os.path.join(SRC, '*.css')))
    body = '\n'.join(f'/* ---- {os.path.basename(f)} ---- */\n' + open(f, encoding='utf-8').read() for f in js)
    style = minify_css('\n'.join(open(f, encoding='utf-8').read() for f in css))
    digest = hashlib.sha1((body + style).encode('utf-8')).hexdigest()[:8]
    stamp = datetime.datetime.now().strftime('%Y-%m-%d') + '.' + digest
    body = body.replace('__PZA_VERSION__', ver).replace('__PZA_BUILD__', stamp)
    head = (f'/*! PZ App Kit v{ver} ({stamp}) — 痞子葳 × Claude 的 App 引擎（門鎖、資料同步、換新版、聲音、動態、本機儲存）。\n'
            f'    說明書：PZ-Games repo 的 _build/appkit/HANDBOOK.md。冷眼不用這一份（冷眼永遠獨立）。 */\n')
    out = (head + '(function (global) {\n\'use strict\';\n' + body + '\nPZA.css = ' + json.dumps(style, ensure_ascii=False) + ';\n'
           + 'global.PZA = PZA;\n})(typeof window !== \'undefined\' ? window : globalThis);\n')
    return out, stamp


def check(path):
    r = subprocess.run(['node', '--check', path], capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr)
        sys.exit('語法錯誤：' + path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--release', action='store_true')
    a = ap.parse_args()
    out, stamp = assemble()
    os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
    dev = os.path.join(ROOT, 'build', 'pz-appkit.js')
    open(dev, 'w', encoding='utf-8').write(out)
    check(dev)
    print(f'dev   build/pz-appkit.js  {len(out.encode("utf-8")) // 1024} KB  ({stamp})')
    if a.release:
        ver = version()
        rel = os.path.join(ROOT, 'releases', f'pz-appkit-{ver}.js')
        if os.path.exists(rel):
            strip = lambda s: re.sub(r'\(\d{4}-\d\d-\d\d\.[0-9a-f]{8}\)|\'\d{4}-\d\d-\d\d\.[0-9a-f]{8}\'', '', s)
            if strip(open(rel, encoding='utf-8').read()) != strip(out):
                sys.exit(f'releases/pz-appkit-{ver}.js 已經存在而且內容不同：改了引擎就要把 VERSION 往上加（見 HANDBOOK「版本」）。')
            print('release 沒有變動')
            return
        open(rel, 'w', encoding='utf-8').write(out)
        check(rel)
        print(f'release releases/pz-appkit-{ver}.js')


if __name__ == '__main__':
    main()
