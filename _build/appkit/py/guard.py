#!/usr/bin/env python3
"""《PZ App 引擎》護欄（2026-11-21，痞子葳：「以後不管我怎麼更改、更新、增加新功能，都不會把冷眼跟解包搞壞」）

收藏庫（PZ-Games）底下的專屬 App：新的版本推上去之後，GitHub Actions（.github/workflows/app-guard.yml）自動用無頭瀏覽器
照痞子葳的用法打開一遍；**沒過就自動換回上一個好的版本**（只換程式，資料 data/ 一律不動），同一個壞掉的版本不會留在網站上。
冷眼不用這一份：冷眼永遠獨立，它自己的護欄在 coldeye-etf 的 pipeline/guard.py（同一個想法，各自維護）。

指令（在 repo 根目錄）：
  python3 _build/appkit/py/guard.py check <app>        推之前在本機驗一次（用現在工作目錄裡的檔案）。BAD 不准推。
  python3 _build/appkit/py/guard.py run <app>          Actions 用：驗 HEAD；過了記成好的版本，沒過（重驗一次還是沒過、
                                                         上一個好的版本用同一份資料驗得過）就自動換回上一個好的版本並推上去
  python3 _build/appkit/py/guard.py rollback <app> [n] 一鍵回滾：換回第 n 個好的版本（1＝上一個），commit 後自己 push
  python3 _build/appkit/py/guard.py status <app>       好的版本、最近一次沒過的原因
紀錄放在 app-guard 分支的 good.json（每個 App：好的版本〔指紋、commit、時間，留 20 個〕、最近一次沒過的原因）。
「指紋」＝這個 App 資料夾裡、data/ 以外每個檔案的內容雜湊（程式真的變了才會變；每小時的資料更新不會）。
加一個新的 App：在 APPS 加一筆（資料夾、資料、怎麼驗），再把它的路徑加進 app-guard.yml 的 paths。詳見 _build/appkit/HANDBOOK.md。
"""
import datetime as dt
import functools
import hashlib
import http.server
import json
import os
import pathlib
import re
import shutil
import socketserver
import subprocess
import sys
import tarfile
import tempfile
import threading
import time

REPO = pathlib.Path(__file__).resolve().parents[3]
BRANCH = 'app-guard'
KEEP_GOOD = 20
TW = dt.timezone(dt.timedelta(hours=8))
BAD_TEXT = ('undefined', 'NaN', '[object Object]')


def now_iso():
    return dt.datetime.now(TW).isoformat(timespec='seconds')


# ---------------------------------------------------------------- 每個 App 怎麼驗
def _unpacked_init():
    sys.path.insert(0, str(REPO / '_build' / 'apps' / 'unpacked' / 'tools'))
    import lockrec   # noqa: E402 — 上鎖：當作這台裝置記得
    prefs = json.dumps(json.dumps({'intro': 'off', 'huntAlert': False}))
    return [lockrec.trust_js(),
            "(() => { try { const k = (n) => 'unpacked.v1.' + n; if (!localStorage.getItem(k('settings'))) localStorage.setItem(k('settings'), %s);"
            " for (const n of ['tourDone']) localStorage.setItem(k(n), '99'); for (const n of ['stormHello', 'shHint', 'shWantTip']) localStorage.setItem(k(n), '1'); } catch (e) {} })();" % prefs]


def _first_id(root, rel, key):
    try:
        d = json.loads((root / rel).read_text(encoding='utf-8'))
        items = d.get(key) if isinstance(d, dict) else d
        for it in items or []:
            if isinstance(it, dict) and it.get('id'):
                return it['id']
    except Exception:  # noqa: BLE001
        pass
    return None


def verify_unpacked(browser, base, app_root, shots, tag):
    """解包：手機直拿（今日、風暴眼、推坑、短影音、獵價、粉專、一篇專題、一款推坑）、手機橫拿（今日、推坑）、
    另外三套換裝（像素、霓虹、紙本的今日）、電腦（今日、獵價）；沒開過的裝置要停在鎖。"""
    problems = []
    url = base + 'index.html?enter=1'
    fid = _first_id(app_root, 'data/index.json', 'items')
    pid = _first_id(app_root, 'data/picks.json', 'items')

    def ctx(w, h, mobile, trust=True, skin=None):
        c = browser.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile, service_workers='block', locale='zh-TW')
        c.set_default_timeout(25000)
        if skin:   # 換裝：先放好設定（_unpacked_init 看到已經有設定就不蓋）
            c.add_init_script("(() => { try { localStorage.setItem('unpacked.v1.settings', %s); } catch (e) {} })();"
                              % json.dumps(json.dumps({'intro': 'off', 'huntAlert': False, 'skin': skin})))
        if trust:
            for js in _unpacked_init():
                c.add_init_script(js)
        c.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
        return c

    def view_bad(pg, where, sel='#view'):
        try:
            txt = pg.locator(sel).inner_text(timeout=5000)
        except Exception:  # noqa: BLE001
            return f'{where}：畫面是空的'
        if len(txt.strip()) < 20:
            return f'{where}：畫面幾乎是空的'
        for w in BAD_TEXT:
            if re.search(r'(^|[^A-Za-z])' + re.escape(w) + r'($|[^A-Za-z])', txt):
                return f'{where}：畫面上出現「{w}」'
        return None

    for dev, (w, h, mobile, steps) in {'手機': (390, 844, True, ['storm', 'picks', 'shorts', 'hunt', 'fan', 'home']),
                                      '手機橫拿': (844, 390, True, ['picks', 'home']),
                                      '電腦': (1440, 900, False, ['hunt', 'home'])}.items():
        c = ctx(w, h, mobile)
        errs = []
        pg = c.new_page()
        pg.on('pageerror', lambda e, errs=errs: errs.append(str(e)[:160]))
        try:
            pg.goto(url, wait_until='domcontentloaded')
            pg.wait_for_selector('#gate', state='detached', timeout=30000)
            pg.wait_for_selector('#view .posters, #view .poster, #view section', timeout=30000)
            time.sleep(1.5)
            bad = view_bad(pg, f'{dev}・今日')
            if bad:
                problems.append(bad)
            pg.screenshot(path=str(shots / f'{tag}-{dev}-home.png'))
            for t in steps:
                pg.click(f'.tab[data-go="{t}"]')
                time.sleep(1.8)
                bad = view_bad(pg, f'{dev}・{t}', '#shorts' if t == 'shorts' else '#view')
                if bad:
                    problems.append(bad)
                pg.screenshot(path=str(shots / f'{tag}-{dev}-{t}.png'))
            if dev == '手機':
                for kind, i in (('f', fid), ('p', pid)):
                    if not i:
                        continue
                    pg.evaluate('(h) => { location.hash = h; }', f'{kind}/{i}')
                    time.sleep(2.5)
                    bad = view_bad(pg, f'{dev}・{"專題" if kind == "f" else "推坑"} {i}')
                    if bad:
                        problems.append(bad)
                    elif len(pg.locator('#view').inner_text().strip()) < 200:
                        problems.append(f'{dev}・{"專題" if kind == "f" else "推坑"} {i}：內容太少')
                    pg.screenshot(path=str(shots / f'{tag}-{dev}-{kind}.png'))
        except Exception as e:  # noqa: BLE001
            problems.append(f'{dev}：{type(e).__name__} {str(e).splitlines()[0][:140]}')
            try:
                pg.screenshot(path=str(shots / f'{tag}-{dev}-stuck.png'))
            except Exception:  # noqa: BLE001
                pass
        problems += [f'{dev}・程式錯誤：{e}' for e in errs[:4]]
        c.close()
    # 另外三套換裝：今日要畫得出來、換裝真的套上、沒有程式錯誤（塗鴉是本體，上面已經驗過）
    for sk, name in (('pixel', '像素'), ('neon', '霓虹'), ('paper', '紙本')):
        c = ctx(390, 844, True, skin=sk)
        errs = []
        pg = c.new_page()
        pg.on('pageerror', lambda e, errs=errs: errs.append(str(e)[:160]))
        try:
            pg.goto(url, wait_until='domcontentloaded')
            pg.wait_for_selector('#gate', state='detached', timeout=30000)
            pg.wait_for_selector('#view .posters, #view .poster, #view section', timeout=30000)
            pg.wait_for_function('(k) => document.documentElement.dataset.skin === k', arg=sk, timeout=15000)
            time.sleep(1.5)
            bad = view_bad(pg, f'換裝{name}・今日')
            if bad:
                problems.append(bad)
            pg.screenshot(path=str(shots / f'{tag}-skin-{sk}.png'))
        except Exception as e:  # noqa: BLE001
            problems.append(f'換裝{name}：{type(e).__name__} {str(e).splitlines()[0][:140]}')
            try:
                pg.screenshot(path=str(shots / f'{tag}-skin-{sk}-stuck.png'))
            except Exception:  # noqa: BLE001
                pass
        problems += [f'換裝{name}・程式錯誤：{e}' for e in errs[:4]]
        c.close()
    # 沒開過的裝置：要停在鎖（這一版有上鎖才驗）
    html = (app_root / 'index.html').read_text(encoding='utf-8', errors='ignore')
    if 'const UNP_RING' in html:
        c = ctx(390, 844, True, trust=False)
        pg = c.new_page()
        try:
            pg.goto(url, wait_until='domcontentloaded')
            pg.wait_for_selector('#gate.locked .ul-in', timeout=20000)
            time.sleep(2)
            if not pg.locator('#gate.locked').count():
                problems.append('上鎖：?enter=1 繞過了鎖')
            pg.screenshot(path=str(shots / f'{tag}-lock.png'))
        except Exception as e:  # noqa: BLE001
            problems.append(f'上鎖的門：{type(e).__name__} {str(e).splitlines()[0][:140]}')
        c.close()
    return problems


APPS = {
    'unpacked': {'title': '解包', 'dir': 'apps/unpacked', 'keep': ['data'], 'verify': verify_unpacked},
}


# ---------------------------------------------------------------- 指紋、檔案
def code_files(app_dir, keep):
    app_dir = pathlib.Path(app_dir)
    out = []
    for f in sorted(app_dir.rglob('*')):
        if f.is_file() and f.relative_to(app_dir).parts[0] not in keep:
            out.append(f)
    return out


def fingerprint(app_dir, keep):
    app_dir = pathlib.Path(app_dir)
    h = hashlib.sha1()
    for f in code_files(app_dir, keep):
        h.update(str(f.relative_to(app_dir)).encode('utf-8'))
        h.update(f.read_bytes())
    return h.hexdigest()[:12]


def _git(*args, cwd=REPO, check=False):
    r = subprocess.run(['git', *args], cwd=cwd, text=True, capture_output=True)
    if check and r.returncode:
        raise RuntimeError(f'git {" ".join(args)}：{r.stderr.strip()[:300]}')
    return r


def tree_at(sha, rel, dest):
    """某個 commit 的 App 資料夾（拿掉資料）放到 dest；淺層 clone 也行：GitHub 可以直接抓指定 commit。"""
    if _git('cat-file', '-e', f'{sha}^{{commit}}').returncode:
        _git('fetch', '--depth=1', 'origin', sha, check=True)
    dest = pathlib.Path(dest)
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='appguard-x-'))
    tar = tmp / 'a.tar'
    with open(tar, 'wb') as f:
        r = subprocess.run(['git', 'archive', sha, rel], cwd=REPO, stdout=f)
    if r.returncode:
        raise RuntimeError(f'git archive {sha} {rel} 失敗')
    with tarfile.open(tar) as t:
        t.extractall(tmp / 'x', filter='data')
    if dest.exists():
        shutil.rmtree(dest)
    shutil.move(str(tmp / 'x' / rel), str(dest))
    shutil.rmtree(tmp, ignore_errors=True)
    return dest


# ---------------------------------------------------------------- 紀錄（app-guard 分支）
def load_state():
    r = _git('fetch', '--depth=1', 'origin', f'{BRANCH}:refs/remotes/origin/{BRANCH}')
    if r.returncode:
        return {}
    show = _git('show', f'origin/{BRANCH}:good.json')
    try:
        return json.loads(show.stdout) if show.returncode == 0 else {}
    except Exception:  # noqa: BLE001
        return {}


def save_state(st, message):
    wt = pathlib.Path(tempfile.mkdtemp(prefix='appguard-wt-'))
    try:
        _git('worktree', 'add', '--detach', str(wt), 'HEAD', check=True)
        _git('checkout', '--orphan', f'tmp-{BRANCH}-{os.getpid()}', cwd=wt, check=True)
        _git('rm', '-rf', '-q', '.', cwd=wt)
        for p in wt.iterdir():
            if p.name != '.git':
                shutil.rmtree(p) if p.is_dir() else p.unlink()
        (wt / 'good.json').write_text(json.dumps(st, ensure_ascii=False, indent=1), encoding='utf-8')
        (wt / 'README.md').write_text('《PZ App 引擎》護欄的紀錄（_build/appkit/py/guard.py）：每個 App 驗收過的版本與最近一次沒過的原因。'
                                      '每次只留一個 commit，不要手改。\n', encoding='utf-8')
        _git('add', '-A', cwd=wt, check=True)
        _git('-c', 'user.name=app-guard-bot', '-c', 'user.email=app-guard-bot@users.noreply.github.com', 'commit', '-q', '-m', message, cwd=wt, check=True)
        r = _git('push', '--force', 'origin', f'HEAD:refs/heads/{BRANCH}', cwd=wt)
        print(r.stdout, r.stderr, flush=True)
        return r.returncode == 0
    finally:
        _git('worktree', 'remove', '--force', str(wt))
        shutil.rmtree(wt, ignore_errors=True)


def record_good(st, app, fp, sha):
    a = dict(st.get(app) or {})
    good = [x for x in (a.get('good') or []) if x.get('fp') != fp]
    a['good'] = ([{'fp': fp, 'sha': sha, 'at': now_iso()}] + good)[:KEEP_GOOD]
    if (a.get('fail') or {}).get('fp') == fp:
        a.pop('fail', None)
    return dict(st, **{app: a})


def record_fail(st, app, fp, sha, why, rolled):
    a = dict(st.get(app) or {})
    a['fail'] = {'fp': fp, 'sha': sha, 'at': now_iso(), 'why': why[:12], 'rolled_back_to': rolled}
    return dict(st, **{app: a})


# ---------------------------------------------------------------- 驗收
class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def verify_dir(app, app_root, shots, tag):
    """把 app_root（一份完整的 App 資料夾：程式＋data）放在 /<dir>/ 底下開本機網站，照那個 App 的驗法打開一遍。"""
    from playwright.sync_api import sync_playwright
    spec = APPS[app]
    stage = pathlib.Path(tempfile.mkdtemp(prefix='appguard-site-'))
    target = stage / spec['dir']
    target.parent.mkdir(parents=True, exist_ok=True)
    target.symlink_to(pathlib.Path(app_root).resolve(), target_is_directory=True)
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(_Quiet, directory=str(stage)))
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{srv.server_address[1]}/{spec["dir"]}/'
    shots = pathlib.Path(shots)
    shots.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(args=['--no-sandbox'])
            try:
                return spec['verify'](b, base, pathlib.Path(app_root), shots, tag)
            finally:
                b.close()
    finally:
        srv.shutdown()
        shutil.rmtree(stage, ignore_errors=True)


def summary(lines):
    text = '\n'.join(lines)
    print(text, flush=True)
    path = os.environ.get('GITHUB_STEP_SUMMARY')
    if path:
        with open(path, 'a', encoding='utf-8') as f:
            f.write('### App 護欄\n' + text + '\n')


def restore(app, sha):
    """把 App 的程式換回某個 commit 的樣子（資料不動），回傳改了哪些檔。"""
    spec = APPS[app]
    app_dir = REPO / spec['dir']
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='appguard-old-'))
    old = tree_at(sha, spec['dir'], tmp / 'app')
    want = {str(f.relative_to(old)) for f in code_files(old, spec['keep'])}
    changed = []
    for rel in sorted(want):
        src, dst = old / rel, app_dir / rel
        if not dst.exists() or dst.read_bytes() != src.read_bytes():
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            changed.append(rel)
    for f in code_files(app_dir, spec['keep']):
        rel = str(f.relative_to(app_dir))
        if rel not in want:
            f.unlink()
            changed.append(rel)
    shutil.rmtree(tmp, ignore_errors=True)
    return changed


def commit_push(paths, message, tries=4):
    _git('add', '-A', *paths, check=True)
    if not _git('diff', '--cached', '--quiet').returncode:
        return True
    _git('-c', 'user.name=app-guard-bot', '-c', 'user.email=app-guard-bot@users.noreply.github.com', 'commit', '-q', '-m', message, check=True)
    for i in range(tries):
        if _git('push', 'origin', 'HEAD:main').returncode == 0:
            return True
        _git('fetch', '--depth=50', 'origin', 'main')
        if _git('rebase', 'origin/main').returncode:
            _git('rebase', '--abort')
            print('[guard] 回滾跟別人剛推的東西衝突：不硬推（新的推送會自己再驗一次）', flush=True)
            return False
        time.sleep(3 + i * 3)
    return False


def cmd_check(app):
    spec = APPS[app]
    app_dir = REPO / spec['dir']
    shots = pathlib.Path(tempfile.gettempdir()) / f'appguard-{app}'
    t0 = time.time()
    problems = verify_dir(app, app_dir, shots, 'check')
    print(f'[guard] {spec["title"]} {fingerprint(app_dir, spec["keep"])}：{"過了" if not problems else "BAD"}（{time.time() - t0:.0f} 秒，截圖在 {shots}）', flush=True)
    for w in problems:
        print('  BAD', w, flush=True)
    return 1 if problems else 0


def cmd_run(app):
    spec = APPS[app]
    app_dir = REPO / spec['dir']
    sha = os.environ.get('GITHUB_SHA') or _git('rev-parse', 'HEAD').stdout.strip()
    fp = fingerprint(app_dir, spec['keep'])
    st = load_state()
    a = st.get(app) or {}
    if any(x.get('fp') == fp for x in a.get('good') or []):
        summary([f'- {spec["title"]} {fp}（{sha[:7]}）：驗收過了'])
        return 0
    shots = REPO / 'guard-shots'
    problems = verify_dir(app, app_dir, shots, 'new')
    if problems:   # 再驗一次，排除偶發的慢
        print('[guard] 第一次沒過，再驗一次：', problems, flush=True)
        problems = verify_dir(app, app_dir, shots, 'new2')
    if not problems:
        save_state(record_good(st, app, fp, sha), f'app-guard: {app} 驗收通過 {fp}（{sha[:7]}）')
        summary([f'- {spec["title"]} 新版本 {fp}（{sha[:7]}）驗收通過。'])
        return 0
    good = (a.get('good') or [None])[0]
    lines = [f'- **{spec["title"]} 新版本 {fp}（{sha[:7]}）驗收沒過**：'] + [f'  - {w}' for w in problems]
    if not good:
        save_state(record_fail(st, app, fp, sha, problems, None), f'app-guard: {app} 驗收沒過 {fp}，還沒有好的版本')
        summary(lines + ['  還沒有驗收過的好版本可以換回去，先留著（請修好再推）。'])
        return 1
    # 上一個好的版本用同一份資料驗得過，才確定是新程式的問題
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='appguard-good-'))
    old = tree_at(good['sha'], spec['dir'], tmp / 'app')
    for k in spec['keep']:   # 舊程式＋現在的資料
        if (old / k).exists():
            shutil.rmtree(old / k)
        if (app_dir / k).exists():
            (old / k).symlink_to((app_dir / k).resolve(), target_is_directory=True)
    old_problems = verify_dir(app, old, shots, 'good')
    shutil.rmtree(tmp, ignore_errors=True)
    if old_problems:
        save_state(record_fail(st, app, fp, sha, problems, None), f'app-guard: {app} 新舊版本都沒過（資料的問題？）')
        summary(lines + [f'  上一個好的版本 {good["fp"]} 用同一份資料也沒過：比較像資料的問題，這次不自動換回。'] + [f'  - {w}' for w in old_problems])
        return 1
    changed = restore(app, good['sha'])
    ok = commit_push([spec['dir']], f'護欄：{spec["title"]}新版本沒通過自動驗收，先換回 {good["sha"][:7]} 的版本（資料不動）\n\n'
                     + '\n'.join(f'- {w}' for w in problems[:8]) + f'\n\n沒過的版本：{sha[:7]}（指紋 {fp}）。修好程式、重新組建再推，會再驗一次。')
    save_state(record_fail(st, app, fp, sha, problems, good['sha'] if ok else None),
               f'app-guard: {app} 沒過 {fp}，{"換回" if ok else "想換回但推不上去"} {good["fp"]}')
    summary(lines + [f'  **已自動換回上一個好的版本 {good["fp"]}（{good["sha"][:7]}）**，改了 {len(changed)} 個檔，資料不動。' if ok
                     else '  想自動換回，但推不上去（剛好有人推了新的版本，那一版會再驗一次）。'])
    return 1


def cmd_rollback(app, n=1):
    spec = APPS[app]
    st = load_state()
    fp = fingerprint(REPO / spec['dir'], spec['keep'])
    cands = [x for x in ((st.get(app) or {}).get('good') or []) if x.get('fp') != fp]
    if n < 1 or n > len(cands):
        print(f'沒有第 {n} 個好的版本（有 {len(cands)} 個）', file=sys.stderr)
        return 1
    pick = cands[n - 1]
    changed = restore(app, pick['sha'])
    print(f'{spec["title"]}換回 {pick["fp"]}（{pick["sha"][:7]}，{pick["at"]} 驗收過），改了 {len(changed)} 個檔。'
          f'確認後 git add {spec["dir"]}、commit、push。原始碼（_build/）沒有跟著退，記得在原始碼修好再組建。', flush=True)
    return 0


def cmd_status(app):
    st = load_state()
    print(json.dumps({'head': fingerprint(REPO / APPS[app]['dir'], APPS[app]['keep']), **(st.get(app) or {})}, ensure_ascii=False, indent=1))
    return 0


def main(argv):
    if len(argv) < 3 or argv[1] not in ('check', 'run', 'rollback', 'status') or argv[2] not in APPS:
        print(__doc__)
        print('App：', '、'.join(APPS))
        return 2
    cmd, app = argv[1], argv[2]
    if cmd == 'check':
        return cmd_check(app)
    if cmd == 'run':
        return cmd_run(app)
    if cmd == 'rollback':
        return cmd_rollback(app, int(argv[3]) if len(argv) > 3 else 1)
    return cmd_status(app)


if __name__ == '__main__':
    sys.exit(main(sys.argv))
