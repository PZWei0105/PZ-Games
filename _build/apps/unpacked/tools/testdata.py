#!/usr/bin/env python3
"""本機測試用的假 Steam 資料（雲端沙盒連不到 Steam）。只寫進測試輸出資料夾，絕對不要 commit 進 apps/unpacked/data/。
用法：python3 testdata.py /tmp/unp/data
"""
import json, math, os, random, sys, time

d = sys.argv[1]
os.makedirs(os.path.join(d, 'hist'), exist_ok=True)
now = int(time.time() // 60)
rows = []
for i in range(60):
    t = now - (59 - i) * 180
    base = 160000 - i * 1100 + 30000 * math.sin(i / 4)
    rows.append([t, int(base + random.randint(-5000, 5000))])
hist = {'pl': rows, 'pr': [[now - 5000, 0]], 'rv': [[now - 8000, 11000, 22000], [now - 10, 13100, 26100]], 'rt': [[now - 10, 120, 340]]}
json.dump(hist, open(os.path.join(d, 'hist', '4262460.json'), 'w'))
A = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4262460/'
live = {'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() - 3600 * 2)), 'ok': 1, 'asked': 1, 'apps': {'4262460': {
    'appid': 4262460, 'name': 'ROB RUN', 'free': True,
    'price': {'final': 0, 'orig': 0, 'disc': 0, 'fmt': '免費'},
    'rv': {'n': 26100, 'pct': 50, 'label': '褒貶不一', 'recent': {'pct': 54, 'n': 4100, 'days': 7}},
    'rv_tc': {'n': 340, 'pct': 35, 'label': '褒貶不一'},
    'rel': {'date': '2026-11-04', 'soon': False, 'ea': True},
    'langs': {}, 'tags': ['開放世界', '犯罪', 'PvP', '搜刮'], 'dev': 'Kefir', 'pub': 'Kefir',
    'img': {'hero': A + 'library_hero.jpg', 'header': A + 'header.jpg'},
    'shots': [A + 'ss_1.jpg', A + 'ss_2.jpg', A + 'ss_3.jpg', A + 'ss_4.jpg'],
    'trailers': [{'hls': 'https://video.akamai.steamstatic.com/store_trailers/4262460/x/hls.m3u8', 'poster': A + 'ss_5.jpg', 'name': 'Early Access Trailer'}],
    'players': {'n': rows[-1][1], 'at': live_at if (live_at := None) else time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() - 3600 * 2)), 'peak': {'n': max(r[1] for r in rows), 'at': '2026-11-11T13:00:00Z'}, 'd24': -12},
    'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() - 3600 * 2)),
}}}
json.dump(live, open(os.path.join(d, 'live.json'), 'w'), ensure_ascii=False)
print('test live data →', d)
