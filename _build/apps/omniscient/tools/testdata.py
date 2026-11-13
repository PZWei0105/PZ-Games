#!/usr/bin/env python3
"""測試資料：從冷眼 repo 的 state／tape 分支做出一份和網站一樣的 data/ 資料夾，給本機測試全知用（不會上線）。

雲端沙盒連不到 pzwei0105.github.io，但連得到 GitHub：
  git clone --depth 1 -b state https://github.com/PZWei0105/coldeye-etf /tmp/cestate
  git clone --depth 1 -b tape  https://github.com/PZWei0105/coldeye-etf /tmp/cetape
  git clone --depth 1          https://github.com/PZWei0105/coldeye-etf /tmp/ce
  python3 testdata.py --ce /tmp/ce --state /tmp/cestate --tape /tmp/cetape --out /tmp/omni-site/coldeye-etf/data
  （再把 build.py --out /tmp/omni-site/PZ-Games/apps/omniscient，在 /tmp/omni-site 開 python3 -m http.server）
  打開 http://localhost:8765/PZ-Games/apps/omniscient/?data=/coldeye-etf/data/&auto=1&now=2026-11-13T15:00

global.json、spark.json 用冷眼自己的程式（pipeline/globalmkt.py、tape.py）從原始資料算出來；
live.json 只有測試用的近似（盤中價取 tape 最後一筆，預估淨值用收盤批次的折溢價反推，加權指數用 --taiex 指定）。
"""
import argparse, gzip, json, pathlib, shutil, sys, datetime as dt

ap = argparse.ArgumentParser()
ap.add_argument('--ce', required=True); ap.add_argument('--state', required=True); ap.add_argument('--tape', required=True)
ap.add_argument('--out', required=True); ap.add_argument('--taiex', type=float, default=None)
a = ap.parse_args()
out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
so = pathlib.Path(a.state) / 'out'
for f in ('summary', 'news', 'track', 'cal', 'divs', 'rules'):
    shutil.copy(so / f'{f}.json', out / f'{f}.json')
shutil.copytree(so / 'etf', out / 'etf', dirs_exist_ok=True)
sys.path.insert(0, a.ce)
from pipeline.state import State
from pipeline import globalmkt, tape
from pipeline.util import TW, now_tw
st = State(pathlib.Path(a.state))
json.dump(globalmkt.build_out(st, now=now_tw()), open(out / 'global.json', 'w'), ensure_ascii=False)
t = json.load(gzip.open(pathlib.Path(a.tape) / 'tape.json.gz', 'rt'))
sp = tape.make_spark(t['cur'])
json.dump(sp, open(out / 'spark.json', 'w'))
s = json.load(open(out / 'summary.json'))
pr = {e['c']: e.get('pr') for e in s['etfs']}
etfs = {}
for c, r in t['last']['reg'].items():
    z = r.get('z') or r.get('pz')
    if not z:
        continue
    nav = round(z / (1 + (pr.get(c) or 0) / 100), 2)
    tm = str(r.get('t') or 133000).zfill(6)
    etfs[c] = [z, nav, round((z - nav) / nav * 100, 2), f'{tm[:2]}:{tm[2:4]}:{tm[4:]}', 0, r['d']]
at = dt.datetime.fromtimestamp(t['last']['at'], TW).isoformat(timespec='seconds')
m = s['market']
live = {'at': at, 'mode': 'intraday', 'open': False, 'date': sp['d'], 'etfs': etfs,
        'taiex': {'z': a.taiex, 'y': m['close'], 't': '13:30:00'} if a.taiex else None}
json.dump(live, open(out / 'live.json', 'w'))
files = {n: json.load(open(out / f'{n}.json')).get(k) for n, k in (('summary', 'generated'), ('live', 'at'), ('news', 'generated'), ('global', 'at'), ('spark', 'at'))}
json.dump({'built': at, 'mode': 'intraday', 'files': files}, open(out / 'version.json', 'w'))
print('test data ->', out, files)
