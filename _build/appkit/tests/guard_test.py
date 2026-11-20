#!/usr/bin/env python3
"""《PZ App 引擎》護欄的測試：python3 _build/appkit/tests/guard_test.py [--browser]
在暫存的 clone 裡（不碰工作目錄、不推任何東西）：
1) 指紋只看程式、不看 data/；紀錄（好的版本、沒過的原因）照規矩排。
2) 換回好的版本（restore）：程式換回去、新版多出來的檔拿掉、data/ 一個檔都不動。
3) --browser：把解包弄壞（開機就丟錯），驗收要不過；上一個 commit 的版本要過。約 1～2 分鐘。
"""
import importlib.util
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

SRC_REPO = pathlib.Path(__file__).resolve().parents[3]
n = 0


def ok(c, msg):
    global n
    if not c:
        print('FAIL', msg, flush=True)
        sys.exit(1)
    n += 1
    print('ok', msg, flush=True)


def git(*a, cwd):
    return subprocess.run(['git', *a], cwd=cwd, text=True, capture_output=True, check=True).stdout.strip()


tmp = pathlib.Path(tempfile.mkdtemp(prefix='appguard-test-'))
try:
    clone = tmp / 'repo'
    subprocess.run(['git', 'clone', '-q', '--depth', '5', 'file://' + str(SRC_REPO), str(clone)], check=True)
    # 工作目錄裡還沒 commit 的護欄程式也放進 clone（測的是現在這一份）
    for rel in ('_build/appkit/py/guard.py',):
        (clone / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(SRC_REPO / rel, clone / rel)
    spec = importlib.util.spec_from_file_location('guard', clone / '_build/appkit/py/guard.py')
    G = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(G)
    ok(G.REPO == clone, '護欄在 clone 裡用的是 clone 的 repo')
    app = clone / 'apps/unpacked'
    keep = G.APPS['unpacked']['keep']
    fp0 = G.fingerprint(app, keep)
    (app / 'data' / 'zz-test.json').write_text('{"x": 1}')
    ok(G.fingerprint(app, keep) == fp0, '資料（data/）變了，指紋不變')
    idx = app / 'index.html'
    html0 = idx.read_text(encoding='utf-8')
    idx.write_text(html0.replace('async function boot() {', 'async function boot() {\n  throw new Error("測試：故意弄壞");', 1), encoding='utf-8')
    (app / 'new-file.js').write_text('新版才有的檔')
    ok(G.fingerprint(app, keep) != fp0, '程式變了，指紋跟著變')

    st = G.record_good({}, 'unpacked', 'aaa', '1' * 40)
    st = G.record_good(st, 'unpacked', 'bbb', '2' * 40)
    st = G.record_good(st, 'unpacked', 'aaa', '3' * 40)
    ok([x['fp'] for x in st['unpacked']['good']] == ['aaa', 'bbb'] and st['unpacked']['good'][0]['sha'] == '3' * 40, '好的版本：最新的排前面、同一個指紋不重複')
    st = G.record_fail(st, 'unpacked', 'ccc', '4' * 40, [f'w{i}' for i in range(30)], '3' * 40)
    ok(st['unpacked']['fail']['fp'] == 'ccc' and len(st['unpacked']['fail']['why']) == 12, '沒過的原因最多留 12 條')
    ok(G.record_good(st, 'unpacked', 'ccc', '5' * 40)['unpacked'].get('fail') is None, '修好之後通過：清掉沒過的紀錄')

    if '--browser' in sys.argv:
        bad = G.verify_dir('unpacked', app, tmp / 'shots', 'bad')
        print('  弄壞的版本：', bad[:3], flush=True)
        ok(bool(bad), '弄壞的版本驗收不過')

    head = git('rev-parse', 'HEAD', cwd=clone)
    data_before = sorted(str(p.relative_to(app)) for p in (app / 'data').rglob('*'))
    changed = G.restore('unpacked', head)
    ok(idx.read_text(encoding='utf-8') == html0, '換回好的版本：index.html 回到原本的樣子')
    ok(not (app / 'new-file.js').exists() and 'new-file.js' in changed, '新版多出來的檔拿掉')
    ok(sorted(str(p.relative_to(app)) for p in (app / 'data').rglob('*')) == data_before and (app / 'data' / 'zz-test.json').exists(), 'data/ 一個檔都不動')
    ok(G.fingerprint(app, keep) == fp0, '換回去之後指紋就是好的那一版')

    if '--browser' in sys.argv:
        good = G.verify_dir('unpacked', app, tmp / 'shots', 'good')
        ok(not good, f'換回來的版本驗收通過 {good[:2]}')
    print(f'\n{n} 個測試通過')
finally:
    shutil.rmtree(tmp, ignore_errors=True)
