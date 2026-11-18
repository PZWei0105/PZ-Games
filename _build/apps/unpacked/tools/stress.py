#!/usr/bin/env python3
"""壓力測試資料：把真的資料複製很多份，模擬《解包》累積一段時間後的樣子（只寫進你指定的測試網站，絕不碰 repo 的 data/）。

  python3 _build/apps/unpacked/build.py --out /tmp/unp-y1
  python3 _build/apps/unpacked/tools/stress.py /tmp/unp-y1 --days 365
  python3 _build/apps/unpacked/tools/perf.py /tmp/unp-y1          # 量開 App 和各頁的時間、記憶體

預設一天 4 篇專題＋2.5 款推坑（比現在的速度再多一點），每一款都有自己的 Steam 即時資料；願望單 120 款。
"""
import argparse, copy, datetime as dt, json, os, random, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
SRC = os.path.join(REPO, 'apps', 'unpacked', 'data')


def load(p, d=None):
    try:
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, ValueError):
        return d


def dump(p, o):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(o, f, ensure_ascii=False, separators=(',', ':'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('site')
    ap.add_argument('--days', type=int, default=365)
    ap.add_argument('--fpd', type=float, default=4, help='每天幾篇專題')
    ap.add_argument('--ppd', type=float, default=2.5, help='每天幾款推坑')
    ap.add_argument('--wish', type=int, default=120)
    ap.add_argument('--legacy', action='store_true', help='即時資料照舊格式（全部塞在 live.json），比較升級前後用')
    a = ap.parse_args()
    D = os.path.join(os.path.abspath(a.site), 'data')
    if os.path.realpath(D).startswith(os.path.realpath(SRC)) or os.path.realpath(a.site) == os.path.realpath(os.path.join(REPO, 'apps', 'unpacked')):
        raise SystemExit('不准寫進 repo 的資料夾：請先 build.py --out /tmp/…，再對那個資料夾跑')
    if os.path.exists(D):
        shutil.rmtree(D)
    shutil.copytree(SRC, D)
    sys.path.insert(0, HERE)
    import live as L   # noqa: E402
    idx, picks, wish = load(os.path.join(D, 'index.json')), load(os.path.join(D, 'picks.json')), load(os.path.join(D, 'wish.json'), {})
    live = L.live_load(D)      # 新舊格式都讀得懂（合成完整的一份）
    tf = [x for x in idx['items'] if x.get('steam') and str(x['steam']) in live['apps']] or idx['items']
    tp = [x for x in picks['items'] if x.get('steam') and str(x['steam']) in live['apps']] or picks['items']
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date()
    nid = [9_000_000]

    rnd = random.Random(7)

    def clone_live(src_appid):
        """複製一款的即時資料，網址裡的 appid、雜湊、時間戳換成新的（壓縮率才會跟真的一樣，不會因為重複內容被壓得特別小）"""
        nid[0] += 1
        src = live['apps'].get(str(src_appid)) or next(iter(live['apps'].values()))
        s = json.dumps(src, ensure_ascii=False).replace(str(src.get('appid', src_appid)), str(nid[0]))
        s = re.sub(r'[0-9a-f]{40}', lambda m: '%040x' % rnd.getrandbits(160), s)
        s = re.sub(r't=\d{8,}', lambda m: 't=%d' % rnd.randint(1_600_000_000, 1_790_000_000), s)
        x = json.loads(s)
        x['appid'] = nid[0]
        live['apps'][str(nid[0])] = x
        return nid[0]

    fi, pi = list(idx['items']), list(picks['items'])
    nf = np_ = 0
    for d in range(1, a.days + 1):
        day = (today - dt.timedelta(days=d)).isoformat()
        for k in range(int(a.fpd + (d % 2) * (a.fpd % 1))):
            t = tf[(nf + k) % len(tf)]
            x = copy.deepcopy(t)
            x['id'] = f"{t['id']}-y{nf + k}"
            x['date'], x['rank'] = day, k + 1
            x['zh'] = f"{t['zh']} #{nf + k}"
            if t.get('steam'):
                x['steam'] = clone_live(t['steam'])
            fi.append(x)
            shutil.copyfile(os.path.join(D, 'features', t['id'] + '.json'), os.path.join(D, 'features', x['id'] + '.json'))
        nf += int(a.fpd)
        for k in range(int(a.ppd + (d % 2) * (a.ppd % 1))):
            t = tp[(np_ + k) % len(tp)]
            x = copy.deepcopy(t)
            x['id'] = f"{t['id']}-y{np_ + k}"
            x['date'], x['rank'] = day, k + 1
            x['zh'] = f"{t['zh']} #{np_ + k}"
            if t.get('steam'):
                x['steam'] = clone_live(t['steam'])
            pi.append(x)
            shutil.copyfile(os.path.join(D, 'picks', t['id'] + '.json'), os.path.join(D, 'picks', x['id'] + '.json'))
        np_ += int(a.ppd)
    idx['items'] = sorted(fi, key=lambda x: (x['date'], -x.get('rank', 0)), reverse=True)
    idx['n'] = len(idx['items'])
    picks['items'] = sorted(pi, key=lambda x: (x['date'], -x.get('rank', 0)), reverse=True)
    picks['n'] = len(picks['items'])
    w = wish.get('items') or []
    if w:
        base = list(w)
        while len(w) < a.wish:
            t = copy.deepcopy(base[len(w) % len(base)])
            src = t['appid']
            t['appid'] = clone_live(src) if str(src) in live['apps'] else nid[0] + 1
            nid[0] = max(nid[0], t['appid'])
            t['name'] = f"{t['name']} #{len(w)}"
            w.append(t)
        wish['items'], wish['n'] = w, len(w)
    dump(os.path.join(D, 'index.json'), idx)
    dump(os.path.join(D, 'picks.json'), picks)
    if a.legacy:
        dump(os.path.join(D, 'live.json'), live)
    else:   # 跟 GitHub Actions 一樣拆成 live.json（精簡）＋ live/<appid>.json
        sys.path.insert(0, HERE)
        import live as L   # noqa: E402
        if os.path.isdir(os.path.join(D, 'live')):
            shutil.rmtree(os.path.join(D, 'live'))
        L.live_save(D, live)
    dump(os.path.join(D, 'wish.json'), wish)
    sz = lambda n: os.path.getsize(os.path.join(D, n)) / 1e6  # noqa: E731
    print(f'{a.days} 天：專題 {idx["n"]} 篇、推坑 {picks["n"]} 款、即時資料 {len(live["apps"])} 款、願望單 {len(w)} 款')
    print(f'index.json {sz("index.json"):.2f} MB、picks.json {sz("picks.json"):.2f} MB、live.json {sz("live.json"):.2f} MB' + ('' if a.legacy else f'（另有 live/ {len(os.listdir(os.path.join(D, "live")))} 個檔）'))


if __name__ == '__main__':
    main()
