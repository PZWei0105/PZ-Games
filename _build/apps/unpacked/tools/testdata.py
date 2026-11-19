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
    items.append(W(4348910, 'Probably Stolen', [27900, 27900, 0], low=27900, added='2026-11-15', tags=('經營', '模擬')))
    wish = {'at': iso(T - 1800), 'ok': True, 'state': 'ok', 'n': len(items), 'items': items}
    # 把「深空當鋪」當成一篇願望單解包：買不買＝等特價、目標價 NT$300（現價 NT$279 → 到價）
    fp = os.path.join(d, 'features', 'probably-stolen.json')
    if os.path.exists(fp):
        f = json.load(open(fp, encoding='utf-8'))
        f['kind'] = 'wish'; f['kind_label'] = '願望單解包'
        f['buy'] = {'call': '等特價', 'target': 30000, 'why': '（測試資料）原價不貴、評價穩，但這類經營小品常常打折；等到 NT$300 以下再買，玩起來沒有負擔。', 'watch': '（測試）出大型更新或評價轉向就改判。'}
        json.dump(f, open(fp, 'w', encoding='utf-8'), ensure_ascii=False)
        ix = json.load(open(os.path.join(d, 'index.json'), encoding='utf-8'))
        for it in ix['items']:
            if it['id'] == 'probably-stolen':
                it.update(kind='wish', kind_label='願望單解包', buy={'call': '等特價', 'target': 30000})
        json.dump(ix, open(os.path.join(d, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False)
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


# ---------------------------------------------------------------- 行情板、免費補給站、點播台、TGA（測試用）
if '--board' in sys.argv:
    T = time.time(); tm = int(T // 60)
    try:
        cand = json.load(open(os.path.join(d, 'candidates.json'), encoding='utf-8'))
    except Exception:  # noqa: BLE001
        cand = {}
    mp = (cand.get('most_played') or [])[:100]
    ix = json.load(open(os.path.join(d, 'index.json'), encoding='utf-8'))
    cov = {int(x['steam']): 'f:' + x['id'] for x in ix['items'] if x.get('steam')}
    R = random.Random(11)
    Tt = [tm - (29 - i) * 60 for i in range(30)]
    Ts = [tm - (41 - i) * 240 for i in range(42)]
    rows = []
    for i, c in enumerate(mp):
        a = c['appid']; base = max(800, int(1_100_000 / (i + 1) ** 1.05))
        trend = R.choice([1.0, 1.0, 1.0, 1.08, 0.94, 1.6, 0.6]) if i not in (3, 7) else (2.1 if i == 3 else 0.55)
        h = [int(base * (1 + 0.22 * math.sin((k + a % 9) / 3.8)) * (1 + (trend - 1) * k / 29)) for k in range(30)]
        sp = [int(base * (1 + 0.25 * math.sin((k + a % 5) / 2.6)) * (0.85 + 0.3 * k / 41)) for k in range(42)]
        sp[-1] = h[-1]
        n = h[-1]; prev = h[5]
        d1 = round((n - prev) * 100 / prev, 1); d7 = round((n - sp[0]) * 100 / sp[0], 1)
        lw = c.get('last_week') if (c.get('last_week') or 0) > 0 else None
        f = []
        if not lw: f.append('new')
        if d1 >= 40 and n >= 3000: f.append('surge')
        elif lw and lw - (c.get('rank') or i + 1) >= 25: f.append('jump')
        if d1 <= -35: f.append('crash')
        if i in (1, 12): f.append('ath')
        r = {'a': a, 'n': n, 'h': h, 'sp': sp, 'd1': d1, 'd7': d7, 'pk': int(max(h) * 1.05), 'r': i + 1, 'rp': c.get('rank'), 'lw': lw, 'f': f or None,
             'ath': [max(h), time.strftime('%Y-%m-%d', time.gmtime(T))] if i in (1, 12) else None, 'nm': c.get('name') or f'App {a}', 'tags': (c.get('tags') or [])[:3] or None,
             'rv': [c['rv']['pct'], c['rv']['n']] if c.get('rv') and c['rv'].get('n') else None, 'free': True if c.get('free') else None,
             'img': f'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{a}/header.jpg', 'zh': c.get('zh'), 'cov': cov.get(a)}
        rows.append({k: v for k, v in r.items() if v is not None})
    rows.sort(key=lambda r: -r['n'])
    for i, r in enumerate(rows):
        r['r'] = i + 1
    tot = sum(r['n'] for r in rows)
    ih = [sum(r['h'][k] for r in rows) for k in range(30)]
    isp = [sum(r['sp'][k] for r in rows) for k in range(42)]
    up = sum(1 for r in rows if r['d1'] > 1); dn = sum(1 for r in rows if r['d1'] < -1)
    agg = {}
    for r in rows:
        for t in (r.get('tags') or [])[:3]:
            g = agg.setdefault(t, {'t': t, 'n': 0, 'k': 0, 'cn': 0, 'pv': 0}); g['n'] += r['n']; g['k'] += 1; g['cn'] += r['n']; g['pv'] += r['h'][5]
    tags = [{'t': g['t'], 'n': g['n'], 'k': g['k'], 'd1': round((g['cn'] - g['pv']) * 100 / g['pv'], 1)} for g in sorted((g for g in agg.values() if g['k'] >= 3), key=lambda g: -g['n'])[:12]]
    board = {'at': iso(T - 1200), 'src': 'concurrent', 'since': time.strftime('%Y-%m-%d', time.gmtime(T - 9 * 86400)), 't': Tt, 's': Ts,
             'idx': {'n': tot, 'd1': round((ih[-1] - ih[5]) * 100 / ih[5], 2), 'up': up, 'dn': dn, 'fl': len(rows) - up - dn, 'h': ih, 'sp': isp}, 'rows': rows, 'tags': tags}
    json.dump(board, open(os.path.join(d, 'board.json'), 'w'), ensure_ascii=False)
    days = [time.strftime('%Y-%m-%d', time.gmtime(T - (12 - k) * 86400)) for k in range(12)]
    json.dump({'days': days, 'pk': {str(r['a']): [int(r['n'] * (0.8 + 0.4 * random.random())) for _ in days] for r in rows}, 'ath': {}, 'nm': {}, 'last': days[-1], 'since': days[0]},
              open(os.path.join(d, 'board-d.json'), 'w'), ensure_ascii=False)
    print('test board →', d, len(rows), 'rows')

if '--free' in sys.argv:
    T = time.time()
    free = {'at': iso(T - 900), 'ok': ['epic', 'steam', 'gog'], 'items': [
        {'id': 'steam:268500', 'store': 'steam', 'title': 'XCOM 2（測試）', 'img': 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/268500/header.jpg', 'url': 'https://store.steampowered.com/app/268500/', 'orig': 89900, 'end': iso(T + 30 * 3600), 'appid': 268500, 'rv': [87, 120000], 'zh': 'tc', 'seen': iso(T - 600)},
        {'id': 'epic:ns1:o1', 'store': 'epic', 'title': 'Hogwarts Legacy（測試）', 'img': 'https://cdn1.epicgames.com/offer/test/wide.jpg', 'url': 'https://store.epicgames.com/zh-Hant/p/test', 'orig_t': 'NT$1,490', 'start': iso(T - 2 * 86400), 'end': iso(T + 5 * 86400), 'seen': iso(T - 3 * 86400)},
        {'id': 'gog:1', 'store': 'gog', 'title': 'Sunless Sea（測試）', 'img': 'https://images.gog-statics.com/test.jpg', 'url': 'https://www.gog.com/', 'orig_t': 'NT$560', 'seen': iso(T - 3600)},
        {'id': 'epic:ns2:o2', 'store': 'epic', 'title': 'Next Week Game（測試）', 'img': 'https://cdn1.epicgames.com/offer/test/next.jpg', 'url': 'https://store.epicgames.com/', 'orig_t': 'NT$799', 'start': iso(T + 5 * 86400), 'end': iso(T + 12 * 86400), 'up': True, 'seen': iso(T)}],
        'past': []}
    json.dump(free, open(os.path.join(d, 'free.json'), 'w'), ensure_ascii=False)
    print('test free →', d)

if '--ask' in sys.argv:
    T = time.time()
    qa = {'at': iso(T - 3600), 'items': [
        {'id': 'dtest01-aaaa1111', 'type': 'ask', 't': iso(T - 9 * 3600), 'q': '（測試）影之刃零跟仁王 3 比，哪個比較適合不擅長拼手速的人？', 'ref': 'f:phantom-blade-zero', 'st': 'done', 'at': iso(T - 2 * 3600), 'by': '推坑編輯',
         'a': '（測試資料）先講結論：兩款都要反應，但影之刃零的招式取消和閃避判定比較寬，失手的代價也比較小。\n仁王 3 的數值和裝備系統比較深，喜歡研究配裝的會更有感；如果你想要的是爽快的連段手感，影之刃零比較友善。',
         'pts': ['影之刃零：閃避判定寬、Boss 戰節奏明快', '仁王 3：配裝深、難度曲線陡'], 'src': [{'t': '（測試）來源 A', 'u': 'https://example.com/a'}, {'t': '（測試）來源 B', 'u': 'https://example.com/b'}]},
        {'id': 'dtest01-bbbb2222', 'type': 'req', 't': iso(T - 30 * 3600), 'q': 'Probably Stolen', 'st': 'done', 'at': iso(T - 20 * 3600), 'by': '寫稿編輯', 'a': '（測試資料）寫好了：當鋪經營加上一點偵探推理，價格不貴、評價穩定。完整專題在今日牆，也附了買不買判定和目標價。', 'link': 'f:probably-stolen', 'src': []},
        {'id': 'dtest02-cccc3333', 'type': 'ask', 't': iso(T - 50 * 3600), 'q': '（測試）幫我改一下 App 的程式', 'st': 'no', 'at': iso(T - 40 * 3600), 'by': '寫稿編輯', 'a': '（測試資料）點播台只回答遊戲相關的問題，App 的修改要另外開工。'}]}
    json.dump(qa, open(os.path.join(d, 'qa.json'), 'w'), ensure_ascii=False)
    inbox = {'v': 1, 'at': iso(T - 1800), 'cursor': 'x', 'events': [
        {'id': 'dtest01-aaaa1111', 'type': 'ask', 't': iso(T - 9 * 3600), 'dev': 'dtest01', 'q': '…'}, {'id': 'dtest01-bbbb2222', 'type': 'req', 't': iso(T - 30 * 3600), 'dev': 'dtest01', 'game': 'Probably Stolen'},
        {'id': 'dtest01-dddd4444', 'type': 'ask', 't': iso(T - 2 * 3600), 'dev': 'dtest01', 'q': '（測試）GTA VI 的 PC 版有消息了嗎？', 'ref': 'f:gta-vi'}]}
    json.dump(inbox, open(os.path.join(d, 'inbox.json'), 'w'), ensure_ascii=False)
    print('test qa/inbox →', d)

if '--tgares' in sys.argv:
    p = os.path.join(d, 'tga.json'); t = json.load(open(p, encoding='utf-8'))
    R = random.Random(3)
    for c in t['cats']:
        c['win'] = c['claude']['c'] if R.random() < 0.55 else R.randrange(len(c['nom']))
    t['result_at'] = iso(time.time() - 3600); t['show'] = iso(time.time() - 5 * 3600); t['vote_end'] = iso(time.time() - 30 * 3600)
    json.dump(t, open(p, 'w', encoding='utf-8'), ensure_ascii=False)
    print('test tga results →', d)

if '--after' in sys.argv:      # 寫稿之後：假的變化紀錄、官方公告、回訪改寫（用 live.py 自己的邏輯產生 stale.json）
    import datetime as _dt
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import live as L
    T = time.time(); H = 3600
    at = lambda h: iso(T - h * H)  # noqa: E731
    lv = L.live_load(d); A = lv['apps']
    def N(t, h, k='patch', x='（測試資料）修正連線斷線、調整平衡，新增兩張地圖與一組成就；完整內容請看 Steam 公告。'):
        return {'t': t, 'd': at(h), 'u': 'https://store.steampowered.com/news/app/0', 'k': k, 'x': x}
    for a in A.values():
        a.setdefault('base', L._snap(a)); a.setdefault('news', [])
    A['4262460'].update(chg=[{'k': 'zh', 'a': 'none', 'b': 'tc', 'd': at(20)}, {'k': 'rv', 'a': 50, 'b': 62, 'd': at(10)}],
                        news=[N('Patch 0.4.2 – Anti-cheat & Performance', 5), N('Halloween Event Recap & What’s Next', 30, 'news', '（測試資料）萬聖節活動回顧，下一季路線圖預告：新地圖、公會系統、排位賽。'), N('Hotfix 0.4.1', 40)])
    A['4348910'].update(ws=True, chg=[{'k': 'ws', 'd': at(8)}], news=[N('Update 1.1: Appraisal Rework', 6)])
    A['1203620']['news'] = [N('Update #6: The Frozen Peaks', 3), N('Winter Sale is live!', 50, 'news', '（測試資料）冬季特賣開跑。')]
    A['268500'].update(chg=[{'k': 'orig', 'a': 89900, 'b': 59900, 'd': at(15)}], news=[N('XCOM 2 Collection Patch Notes', 12)])
    A['2379780']['news'] = [N('Balatro 1.0.2 Patch Notes', 12)]
    L.live_save(d, lv)
    idx = json.load(open(os.path.join(d, 'index.json'), encoding='utf-8')); pk = json.load(open(os.path.join(d, 'picks.json'), encoding='utf-8'))
    p = os.path.join(d, 'features', 'absolum.json')
    if os.path.exists(p):      # 回訪改寫過的樣子
        f = json.load(open(p, encoding='utf-8'))
        f['rev'] = [{'d': time.strftime('%Y-%m-%d', time.gmtime(T + 8 * H)), 't': '（測試）加了繁中，中文段、結論已更新'}]
        f['updated'] = time.strftime('%Y-%m-%dT%H:%M:%S+08:00', time.gmtime(T + 8 * H - 1800))
        json.dump(f, open(p, 'w', encoding='utf-8'), ensure_ascii=False)
        for it in idx['items']:
            if it['id'] == 'absolum':
                it['updated'] = f['updated']
        json.dump(idx, open(os.path.join(d, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        A['1904480']['chg'] = [{'k': 'zh', 'a': 'sc', 'b': 'tc', 'd': at(26)}]   # 回訪前的變化：不該再出現
        L.live_save(d, lv)
    lv['stale'] = L.stale_app(A, idx, pk, _dt.datetime.now(_dt.timezone.utc))
    L.live_save(d, lv)
    print('test after →', d)

if '--info' in sys.argv:       # 遊戲情報卡：假的 Steam 介紹（info/）、名字對照（names.json）、免費遊戲對到 Steam
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import live as L
    T = time.time()
    os.makedirs(os.path.join(d, 'info'), exist_ok=True)
    S = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{}/'
    def INFO(a, name, short, tags, tc=True, rv=(93, 1100000, '壓倒性好評'), price=(0, 0, 0), free=False, rel='2023-09-27', dev='Valve', shots=6, ea=False, soon=False):
        r = {'appid': a, 'name': name, 'url': f'https://store.steampowered.com/app/{a}/', 'short': short, 'tags': tags, 'dev': dev, 'pub': dev,
             'rel': {'date': rel, 'soon': soon, 'ea': ea}, 'langs': {'tc': {'ui': True, 'audio': False, 'sub': True}} if tc else {'sc': {'ui': True}},
             'plat': ['win', 'deck'], 'img': {'header': S.format(a) + 'header.jpg', 'hero': S.format(a) + 'library_hero.jpg'},
             'micro': {'webm': S.format(a) + 'micro.webm'}, 'shots': [S.format(a) + f'ss_{i}.jpg' for i in range(shots)],
             'rv': {'pct': rv[0], 'n': rv[1], 'label': rv[2]}, 'price': {'final': price[0], 'orig': price[1], 'disc': price[2]}}
        if free:
            r['free'] = True
        json.dump(r, open(os.path.join(d, 'info', f'{a}.json'), 'w'), ensure_ascii=False)
    INFO(730, 'Counter-Strike 2', '（測試資料）十多年來全球數百萬玩家的戰術射擊首選：5 對 5 攻守對抗，經濟系統決定每一回合要買什麼槍。', ['FPS', '射擊', '多人', '競技'], free=True, rel='2012-08-21')
    INFO(2412340, 'Knightica', '（測試資料）可愛的騎士團衝撞動作 Roguelite：一邊衝鋒一邊收編夥伴，隊伍越長越強，撞開成群的敵人。', ['動作', 'Roguelite', '可愛'], rv=(88, 2300, '極度好評'), price=(29900, 29900, 0), rel='2025-06-12', dev='Studio Test')
    INFO(3020000, 'CONTROL Resonant', '（測試資料）Remedy 的超自然動作冒險續作：在不斷變形的大樓裡用念力戰鬥，揭開聯邦控制局的秘密。', ['動作', '超自然', '第三人稱'], rv=(0, 0, None), rel='2026-03-12', soon=True, dev='Remedy Entertainment', shots=4)
    INFO(1794680, 'Vampire Survivors', '（測試資料）一個按鍵都不用按的割草神作：自動攻擊、撿經驗、選升級，三十分鐘活下來就贏。', ['Roguelite', '割草', '像素'], rv=(98, 230000, '壓倒性好評'), price=(9900, 9900, 0), rel='2022-10-20', dev='poncle')
    nm = {L.name_key(k): [a, '2026-11-19'] for k, a in [('CONTROL Resonant', 3020000), ('Vampire Survivors', 1794680), ('吸血鬼倖存者', 1794680), ('Knightica', 2412340)]}
    nm.update({L.name_key(k): [0, '2026-11-19'] for k in ['Grand Theft Auto VI', 'The Legend of Zelda: Ocarina of Time', '殺戮尖塔', 'GTA Online']})
    json.dump({'at': iso(T), 'names': nm}, open(os.path.join(d, 'names.json'), 'w'), ensure_ascii=False)
    fp = os.path.join(d, 'free.json'); fr = json.load(open(fp, encoding='utf-8'))
    for x in fr.get('items') or []:
        if 'Knightica' in (x.get('title') or ''):
            x.update(appid=2412340, rv=[88, 2300], zh='tc', tags=['動作', 'Roguelite'], end=iso(T + 16 * 3600))
        elif 'Mark of the Deep' in (x.get('title') or ''):
            x.update(desc='（測試資料）在被詛咒的海底廢墟裡探險的魂系類銀河城：你是一名被浪打上岸的海盜，要在怪物與陷阱之間找回自己的船。', dev='Mad Mimic')
    json.dump(fr, open(fp, 'w'), ensure_ascii=False)
    print('test info →', d)
