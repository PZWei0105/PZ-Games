#!/usr/bin/env python3
"""把引擎原始碼 src/ 組成一支 JavaScript。

用法：
  python3 tools/build_engine.py            # 開發版 → build/pz-engine.js（每次都覆蓋）
  python3 tools/build_engine.py --release  # 正式版 → releases/pz-engine-<VERSION>.js（已存在且內容不同就拒絕，避免改到舊版）

組法：src/ 裡的 .js 依檔名順序串起來、包在一個 IIFE 裡，只對外公開 window.PZ；
src/ 裡的 .css 會壓成字串，取代程式裡的 __PZ_CSS__（UI 模組啟動時插進 <head>）。
組好之後用 node --check 檢查語法。
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
    css = css.replace(';}', '}')
    return css.strip()


def assemble(ver=None):
    ver = ver or version()
    js_files = sorted(glob.glob(os.path.join(SRC, '*.js')))
    css_files = sorted(glob.glob(os.path.join(SRC, '*.css')))
    parts = []
    for f in js_files:
        parts.append(f'/* ---- {os.path.basename(f)} ---- */\n' + open(f, encoding='utf-8').read())
    body = '\n'.join(parts)
    css = minify_css('\n'.join(open(f, encoding='utf-8').read() for f in css_files))
    digest = hashlib.sha1((body + css).encode('utf-8')).hexdigest()[:8]
    stamp = datetime.datetime.now().strftime('%Y-%m-%d') + '.' + digest
    body = body.replace('__PZ_VERSION__', ver).replace('__PZ_BUILD__', stamp)
    body = body.replace('__PZ_CSS__', json.dumps(css, ensure_ascii=False))
    head = (f'/*! PZ Engine v{ver} ({stamp}) — 痞子葳 × Claude 的 2D 遊戲引擎。\n'
            f'    說明書：PZ-Games repo 的 _build/engine/HANDBOOK.md */\n')
    out = head + '(function (global) {\n\'use strict\';\n' + body + \
        '\nglobal.PZ = PZ;\n})(typeof window !== \'undefined\' ? window : globalThis);\n'
    return out, stamp


def check(path):
    r = subprocess.run(['node', '--check', path], capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr)
        sys.exit('語法錯誤：' + path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--release', action='store_true')
    ap.add_argument('--force', action='store_true', help='正式版已存在時仍覆蓋（只在這個版本還沒交付給任何遊戲時用）')
    a = ap.parse_args()
    out, stamp = assemble()
    os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
    dev = os.path.join(ROOT, 'build', 'pz-engine.js')
    open(dev, 'w', encoding='utf-8').write(out)
    check(dev)
    print(f'dev   build/pz-engine.js  {len(out.encode("utf-8")) // 1024} KB  ({stamp})')
    if a.release:
        ver = version()
        rel = os.path.join(ROOT, 'releases', f'pz-engine-{ver}.js')
        if os.path.exists(rel) and not a.force:
            old = open(rel, encoding='utf-8').read()
            strip = lambda s: re.sub(r'\(\d{4}-\d\d-\d\d\.[0-9a-f]{8}\)|\'\d{4}-\d\d-\d\d\.[0-9a-f]{8}\'', '', s)
            if strip(old) != strip(out):
                sys.exit(f'releases/pz-engine-{ver}.js 已經存在而且內容不同：改了引擎就要把 VERSION 往上加（見 HANDBOOK「版本」）。')
            print('release 沒有變動')
            return
        open(rel, 'w', encoding='utf-8').write(out)
        check(rel)
        print(f'release releases/pz-engine-{ver}.js')


if __name__ == '__main__':
    main()
