#!/usr/bin/env python3
"""本機測試用的假 Steam 資料（雲端沙盒連不到 Steam）。只寫進測試輸出資料夾，絕對不要 commit 進 apps/unpacked/data/。
用法：python3 testdata.py /tmp/unp/data            # 假的 ROB RUN 即時資料（其他款保留 repo 裡的真資料）
      python3 testdata.py /tmp/unp/data --hunt     # 再加：假的 Steam 願望單（各種特價狀態）＋一份假週報
      python3 testdata.py /tmp/unp/data --hunt --noweek   # 只要假願望單（測「本週進行中」）
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
try:
    real = json.load(open(os.path.join(d, 'live.json'), encoding='utf-8'))
    for k, v in (real.get('apps') or {}).items():
        live['apps'].setdefault(k, v)
except Exception:  # noqa: BLE001
    pass
if '--hunt' in sys.argv and '268500' in live['apps']:      # XCOM 2 特價、兩天後結束
    live['apps']['268500']['price'].update(final=17900, orig=89900, disc=80, end=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() + 50 * 3600)))
json.dump(live, open(os.path.join(d, 'live.json'), 'w'), ensure_ascii=False)
print('test live data →', d)


def iso(t):
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(t))


if '--hunt' in sys.argv:
    T = time.time(); day = 86400
    S = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/'
    def W(a, name, p, low=None, since=40, sale=None, soon=None, zh='tc', rv=(92, 54000, '壓倒性好評'), added='2025-03-02', tags=('動作', '角色扮演')):
        x = {'appid': a, 'added': added, 'pri': 1, 'name': name, 'img': S.format(a) + 'header.jpg', 'cap': S.format(a) + 'capsule_616x353.jpg',
             'free': False, 'p': list(p), 'rv': list(rv), 'rel': {'date': soon or '2023-05-12', 'soon': bool(soon), 'ea': False, 'text': None},
             'zh': zh, 'tags': list(tags), 'dev': 'Test Studio', 'short': '（測試資料）一段遊戲介紹文字，用來看情報卡的版面長怎樣。', 'deck': True}
        if low is not None:
            x['low'] = [low, time.strftime('%Y-%m-%d', time.gmtime(T - 3 * day)), time.strftime('%Y-%m-%d', time.gmtime(T - since * day))]
        if sale:
            x['sale'] = sale
        return x
    items = [
        W(1086940, 'Baldur\'s Gate 3', [79900, 159900, 50], low=79900, sale={'from': iso(T - 5 * 3600), 'end': iso(T + 20 * 3600)}),
        W(1145350, 'Hades II', [37800, 54000, 30], low=37800, since=6, sale={'from': None, 'end': iso(T + 6 * day)}),
        W(1245620, 'ELDEN RING', [104900, 149900, 30], low=89900, sale={'from': iso(T - 2 * day), 'end': iso(T + 3 * day)}),
        W(413150, 'Stardew Valley', [0, 39800, 100], low=0, sale={'from': iso(T - 3600), 'end': iso(T + 2 * day)}),
        W(2420110, 'Horizon Forbidden West', [149000, 149000, 0], low=99000),
        W(1817070, 'Marvel\'s Spider-Man Remastered', [139000, 139000, 0], low=139000, zh='tc'),
        W(2622380, 'ELDEN RING NIGHTREIGN', [109000, 109000, 0], low=109000, rv=(78, 120000, '大多好評')),
        W(3159330, 'Assassin\'s Creed Shadows', [None, None, 0], soon=time.strftime('%Y-%m-%d', time.gmtime(T + 9 * day)), zh='tc', rv=(None, 0, None)),
        W(2215430, 'Ghost of Yōtei', [None, None, 0], soon=time.strftime('%Y-%m-%d', time.gmtime(T + 40 * day)), rv=(None, 0, None)),
        W(1593500, 'God of War', [99000, 99000, 0], low=49500, zh='tc'),
        W(570940, 'DARK SOULS REMASTERED', [79900, 79900, 0], low=39900, zh='none', rv=(89, 70000, '極度好評')),
    ]
    wish = {'at': iso(T - 1800), 'ok': True, 'state': 'ok', 'n': len(items), 'items': items}
    json.dump(wish, open(os.path.join(d, 'wish.json'), 'w'), ensure_ascii=False)
    now_m = int(T // 60)
    json.dump({'pl': [], 'pr': [[now_m - 40 * 1440, 159900], [now_m - 25 * 1440, 111900], [now_m - 18 * 1440, 159900], [now_m - 5 * 60, 79900]], 'rv': [], 'rt': []},
              open(os.path.join(d, 'hist', '1086940.json'), 'w'))
    print('test wish →', d)
    if '--noweek' not in sys.argv:
        os.makedirs(os.path.join(d, 'weekly'), exist_ok=True)
        import datetime as dtm
        today = dtm.date.today()
        mon = today - dtm.timedelta(days=today.weekday()); sun = mon + dtm.timedelta(days=6)
        y, w, _ = today.isocalendar(); wid = f'{y}-W{w:02d}'
        nx = lambda k: (sun + dtm.timedelta(days=k)).isoformat()
        wk = {'id': wid, 'from': mon.isoformat(), 'to': sun.isoformat(), 'date': sun.isoformat(), 'updated': iso(T),
              'title': '（測試）GTA VI 壓軸、Balatro 當場被推坑的一週',
              'intro': '（測試資料）這週解包了五款新作、推坑三款老遊戲。最大的新聞還是 GTA VI 的上市倒數，但真正讓人放不下手的，是一款只要兩百多塊的撲克牌 Roguelike。',
              'mvp': {'ref': 'f:gta-vi', 'why': '（測試）預告片播放數再破紀錄、預購開跑，整週的話題都繞著它轉；確定上市日之後，下週還有更多實機要看。'},
              'tiers': [{'ref': 'f:gta-vi', 'tier': 'S', 'line': '（測試）不用多說，今年最大的那一款'},
                        {'ref': 'p:balatro', 'tier': 'S', 'line': '（測試）兩百多塊玩到停不下來'},
                        {'ref': 'f:phantom-blade-zero', 'tier': 'A', 'line': '（測試）動作手感看起來真的有料'},
                        {'ref': 'p:octopath-traveler-2', 'tier': 'A', 'line': '（測試）HD-2D 最成熟的一作'},
                        {'ref': 'f:probably-stolen', 'tier': 'A', 'line': '（測試）當鋪經營小品，評價穩'},
                        {'ref': 'p:xcom-2', 'tier': 'B', 'line': '（測試）特價時入手最划算'},
                        {'ref': 'f:unhinged', 'tier': 'B', 'line': '（測試）點子有趣，但還要觀察'},
                        {'ref': 'f:rob-run', 'tier': 'C', 'line': '（測試）評價兩極，先等更新'}],
              'news': [{'h': '（測試）某大作宣布延期', 't': '（測試資料）一則新聞的兩三句說明，講清楚發生什麼事、為什麼重要。', 's': [0]},
                       {'h': '（測試）Steam 秋季特賣日期公布', 't': '（測試資料）特賣從哪天到哪天、有什麼值得等。', 's': [1]},
                       {'h': '（測試）某獨立遊戲銷量破百萬', 't': '（測試資料）賣了多少、花了多久。', 's': [2, 3]}],
              'next': [{'d': nx(2), 'name': '（測試）某動作新作', 't': '（測試）PC／PS5 同步上市，有繁中', 's': [4]},
                       {'d': nx(4), 'name': '（測試）某獨立遊戲正式版', 't': '（測試）搶先體驗兩年後轉正式版', 's': [5]},
                       {'d': nx(6), 'name': '（測試）某大型更新', 't': '（測試）新增合作模式', 's': [4]}],
              'deals': '（測試）Steam 秋季特賣下週開打，願望單上想等史低的可以再忍幾天。',
              'fanpage': {'post': '（測試資料）' + '這是一篇每週懶人包的粉專貼文，' * 14 + '你這週玩了什麼？', 'titles': ['（測試）標題 A', '（測試）標題 B', '（測試）標題 C'],
                          'tags': ['#遊戲狂想曲', '#每週遊戲懶人包', '#GTA6'], 'script': '（測試資料）口播稿。' * 30, 'credit': '（測試）圖片：各遊戲官方',
                          'cover': {'kicker': '每週遊戲懶人包', 'title': 'GTA VI 壓軸\nBalatro 偷走全場'}},
              'sources': [{'t': f'（測試）來源 {k}', 'u': 'https://example.com/' + str(k)} for k in range(7)]}
        json.dump(wk, open(os.path.join(d, 'weekly', wid + '.json'), 'w'), ensure_ascii=False)
        idx = {'at': iso(T), 'n': 1, 'items': [{'id': wid, 'from': wk['from'], 'to': wk['to'], 'date': wk['date'], 'title': wk['title'], 'mvp': 'f:gta-vi', 'mvp_name': '俠盜獵車手 VI',
                                                'top': ['f:gta-vi', 'p:balatro', 'f:phantom-blade-zero', 'p:octopath-traveler-2'], 'updated': wk['updated']}]}
        json.dump(idx, open(os.path.join(d, 'weekly.json'), 'w'), ensure_ascii=False)
        print('test weekly', wid, '→', d)
