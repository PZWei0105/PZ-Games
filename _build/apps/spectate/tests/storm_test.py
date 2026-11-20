#!/usr/bin/env python3
"""特別轉播（2026-11-21）離線測試：假的 YouTube API 回應，檢查《解包》風暴眼指定的那一款會被搜、
比對不到的不收、巴哈姆特不收、名單外搜到的不進一般清單、storm.json 的各排與數字、額度保留、換一款會重來、過期會清。

  python3 _build/apps/spectate/tests/storm_test.py
"""
import json, os, sys, tempfile, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'tools'))
import pipeline as P  # noqa: E402

R = 'UCrrrrrrrrrrrrrrrrrrrrrr'     # 名單內
E1 = 'UCeeeeeeeeeeeeeeeeeeeee1'    # 名單外：中文實況主
E2 = 'UCeeeeeeeeeeeeeeeeeeeee2'    # 名單外：國外大台
BH = 'UCbbbbbbbbbbbbbbbbbbbbbb'    # 巴哈姆特（不收）
NOW = P.NOW


def iso(t):
    import datetime as dt
    return dt.datetime.fromtimestamp(t, dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def vitem(vid, cid, title, ago=3600, lbc='none', cv=None, views=1000, chname=None):
    it = {'id': vid, 'snippet': {'channelId': cid, 'channelTitle': chname or ('頻道' + cid[-1]), 'title': title, 'publishedAt': iso(NOW - ago),
                                 'liveBroadcastContent': lbc, 'categoryId': '20', 'description': ''},
          'contentDetails': {'duration': 'PT21M3S'}, 'statistics': {'viewCount': str(views)}, 'status': {'embeddable': True}}
    if lbc == 'live':
        it['liveStreamingDetails'] = {'actualStartTime': iso(NOW - 1800), 'concurrentViewers': str(cv or 0)}
    return it


VIDS = {
    'zzzzzzzzzz1': vitem('zzzzzzzzzz1', E1, '【GTA6】全破後的十個隱藏彩蛋', ago=5 * 3600, views=180000),
    'zzzzzzzzzz2': vitem('zzzzzzzzzz2', E1, 'GTA 6 新手攻略：前三小時一定要做的事', ago=20 * 3600, views=96000),
    'zzzzzzzzzz3': vitem('zzzzzzzzzz3', E1, '今天來玩寶可夢', ago=3600),                                 # 比對不到：不收
    'bbbbbbbbbb1': vitem('bbbbbbbbbb1', BH, 'GTA6 首日銷量破紀錄', ago=3600, chname='巴哈姆特電玩資訊站'),   # 巴哈：不收
    'tttttttttt1': vitem('tttttttttt1', E2, 'GTA 6 Review', ago=50 * 3600, views=4200000),
    'llllllllll1': vitem('llllllllll1', E2, 'GTA 6 FIRST TIME PLAYING (24 HOUR STREAM)', lbc='live', cv=182000),
    'llllllllll2': vitem('llllllllll2', E1, '【GTA6 直播】第二天 搶銀行', lbc='live', cv=9400),
    'llllllllll3': vitem('llllllllll3', E1, 'GTA6 已經結束的直播', lbc='none'),                         # 搜「直播中」但其實沒在播：不收
}
CALLS = []


def fake_http(url, headers=None, timeout=25, tries=3, json_out=False):
    u = urllib.parse.urlparse(url)
    q = dict(urllib.parse.parse_qsl(u.query))
    path = u.path.rsplit('/', 1)[-1]
    CALLS.append((path, q))
    if path == 'videos':
        return 200, {'items': [VIDS[i] for i in q['id'].split(',') if i in VIDS]}
    if path == 'search':
        if q.get('eventType') == 'live':
            ids = ['llllllllll1', 'llllllllll2', 'llllllllll3']
        elif q.get('order') == 'viewCount':
            ids = ['tttttttttt1', 'zzzzzzzzzz1']
        else:
            ids = ['zzzzzzzzzz1', 'zzzzzzzzzz2', 'zzzzzzzzzz3', 'bbbbbbbbbb1']
        return 200, {'items': [{'id': {'videoId': i}, 'snippet': VIDS[i]['snippet']} for i in ids]}
    if path == 'channels':
        return 200, {'items': []}
    return 404, None


def write_storm(repo, key, rx):
    d = os.path.join(repo, 'apps', 'unpacked', 'data')
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'storm.json'), 'w', encoding='utf-8') as f:
        json.dump({'cur': {'key': key, 'zh': '俠盜獵車手 VI', 'en': 'Grand Theft Auto VI', 'rx': rx, 'yt': {'zh': 'GTA6|GTA 6', 'en': 'GTA 6|GTA VI'}}}, f, ensure_ascii=False)


def main():
    P.KEY = 'test'
    P.http_get = fake_http
    fails = []

    def ok(c, msg):
        print(('  OK  ' if c else '  ✗✗  ') + msg)
        if not c:
            fails.append(msg)
    repo = tempfile.mkdtemp()
    ok(P.storm_cfg(repo) is None, '解包還沒有 storm.json：不搜')
    write_storm(repo, 'gta-vi', r'GTA\s?(6|VI|六)(?![0-9])|俠盜獵車手\s?(6|VI|六)')
    cfg = P.storm_cfg(repo)
    ok(cfg and cfg['key'] == 'gta-vi' and cfg['qzh'] == 'GTA6|GTA 6', '讀到《解包》指定的那一款和搜尋字')
    cache = {k: {} for k in ('videos', 'steam', 'games', 'chstat', 'disc', 'tries', 'api', 'xch', 'ext')}
    P.API_DAY[0] = cache['api']
    roster = {'channels': {R: {'seed': '名單台', 'n': '名單台', 'k': 'media'}}}
    me = {'subs': {}, 'blocks': {}, 'passes': {}, 'later': {}, 'adds': [], 'seen': []}
    # 名單內本來就有一支 GTA6 的片（RSS 抓到的）：也算進特別轉播
    cache['videos']['rrrrrrrrrr1'] = {'i': 'rrrrrrrrrr1', 'c': R, 't0': 'GTA6 評測：值得等 13 年嗎', 'p': NOW - 7200, 's': 0, 'v': 50000}
    cache['videos']['rrrrrrrrrr2'] = {'i': 'rrrrrrrrrr2', 'c': R, 't0': '魔物獵人 荒野 新武器', 'p': NOW - 7200, 's': 0}
    P.storm_extras(cache, cfg, me)
    vids = cache['videos']
    searches = [c for c in CALLS if c[0] == 'search']
    ok(len(searches) == 3, '一次跑三種搜尋：中文最新、全球最熱、直播中（實際 %d 次）' % len(searches))
    ok(searches[0][1].get('relevanceLanguage') == 'zh-Hant' and searches[0][1].get('q') == 'GTA6|GTA 6', '中文最新用中文搜尋字、繁中優先')
    ok('zzzzzzzzzz1' in vids and vids['zzzzzzzzzz1'].get('ext') == 'st' and vids['zzzzzzzzzz1'].get('sk') == 'gta-vi', '搜到的名單外影片標 ext=st、sk=這一款')
    ok('zzzzzzzzzz3' not in vids, '標題比對不到的不收')
    ok('bbbbbbbbbb1' not in vids, '巴哈姆特的頻道不收')
    ok('llllllllll1' in vids and vids['llllllllll1'].get('cv') == 182000, '直播中：收、有同時觀看')
    ok('llllllllll3' not in vids, '搜到直播但其實沒在播的不收')
    ok(cache['api']['units'] >= 300, '額度有記帳（三次搜尋 300 點以上）')
    # 第二輪：時間還沒到，不重搜
    n = len(CALLS)
    P.storm_extras(cache, cfg, me)
    ok(not [c for c in CALLS[n:] if c[0] == 'search'], '時間還沒到不重搜')
    P.classify(cache, roster)
    # 發燒榜早就收進來的巴哈姆特影片（名單外、標題對得上）：特別轉播也不能出現
    cache['xch']['UCbahabahabahabahabahaba'] = {'n': '巴哈姆特電玩瘋', 'ts': int(NOW)}
    cache['videos']['bahabahaba1'] = {'i': 'bahabahaba1', 'c': 'UCbahabahabahabahabahaba', 't0': '罪惡市降臨《俠盜獵車手 6》最速評測', 'p': NOW - 3600, 'l': 'review', 'z': 'zh', 'ext': 'hot', 'seen_ext': NOW}
    st = P.build_storm(cache, cfg, roster, me)
    ok('bahabahaba1' not in st['items'], '特別轉播：發燒榜收進來的巴哈姆特影片也不出現')
    ok(st['key'] == 'gta-vi' and st['lc'] == 2 and st['lv'] == 182000 + 9400, 'storm.json：直播中 2 台、觀看人數加總')
    ok(st['live'][0] == 'llllllllll1', '直播照同時觀看排')
    ok('rrrrrrrrrr1' in st['new'] and 'rrrrrrrrrr2' not in st['new'], '名單內的相關影片也算、不相關的不算')
    ok(st['top'][0] == 'tttttttttt1', '全球最熱照觀看數排')
    ok(set(st['cz']) >= {'zzzzzzzzzz1', 'zzzzzzzzzz2'} and 'tttttttttt1' not in st['cz'], '中文最新只有中文片')
    ok(st['n24'] >= 4 and st['items']['zzzzzzzzzz1'].get('ext') == 'st' and st['ch'][E1].get('ext') == 1, 'n24、影片與頻道都帶 ext 標記')
    ok(len(st['tl']) == 1 and st['tl'][0][1] == st['lv'], '時間軸記了一點')
    feed = P.build_feed(cache, roster, me)
    ids = {it['i'] for it in feed['items']}
    ok('zzzzzzzzzz1' not in ids and 'llllllllll1' not in ids and 'rrrrrrrrrr1' in ids, 'feed：特別轉播搜到的名單外影片不進一般清單（名單內的照常）')
    # 額度快用完：不搜
    cache['api']['units'] = P.API_DAY_CAP - P.SX_RESERVE + 10
    cache['ext'].update({'sz_ts': 0, 'st_ts': 0, 'sl_ts': 0})
    n = len(CALLS)
    P.storm_extras(cache, cfg, me)
    ok(not [c for c in CALLS[n:] if c[0] == 'search'], '今天剩不到保留的點數就不搜')
    # 換一款：時間清掉、舊的影片一天後清
    cache['api']['units'] = 0
    write_storm(repo, 'pokemon-za', r'寶可夢')
    cfg2 = P.storm_cfg(repo)
    P.storm_extras(cache, cfg2, me)
    ok(cache['ext']['sk'] == 'pokemon-za' and cache['ext']['stl'] == [], '換一款：重新搜、時間軸重來')
    v = vids['zzzzzzzzzz2']
    v['seen_st'] = NOW - 2 * 86400
    P.prune_ext(cache)
    ok('zzzzzzzzzz2' not in vids, '換了一款，舊的搜尋結果一天後清掉')
    ok('bahabahaba1' not in vids, '名單外的巴哈姆特影片：不管在哪個榜上都清掉')
    ok('llllllllll1' in vids, '還在直播的先留著')
    print('\n' + ('全部通過' if not fails else '失敗 %d 項' % len(fails)))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
