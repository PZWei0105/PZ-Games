#!/usr/bin/env python3
"""金鑰功能離線測試：假的 YouTube API 回應，檢查嵌入判斷、發燒榜、全網直播、額度記帳。

  python3 _build/apps/spectate/tests/key_test.py
"""
import json, os, sys, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'tools'))
import pipeline as P  # noqa: E402

R = 'UCrrrrrrrrrrrrrrrrrrrrrr'     # 名單內
E1 = 'UCeeeeeeeeeeeeeeeeeeeee1'    # 名單外（發燒榜）
E2 = 'UCeeeeeeeeeeeeeeeeeeeee2'    # 名單外（直播）
E3 = 'UCeeeeeeeeeeeeeeeeeeeee3'    # 名單外（小頻道的即將直播）
NOW = P.NOW


def iso(t):
    import datetime as dt
    return dt.datetime.fromtimestamp(t, dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def vitem(vid, cid, title, dur='PT12M3S', lbc='none', cv=None, embed=True, age=False, region=None, st=None):
    cd = {'duration': dur}
    if age:
        cd['contentRating'] = {'ytRating': 'ytAgeRestricted'}
    if region:
        cd['regionRestriction'] = region
    it = {'id': vid, 'snippet': {'channelId': cid, 'channelTitle': '頻道' + cid[-1], 'title': title, 'publishedAt': iso(NOW - 3600),
                                 'liveBroadcastContent': lbc, 'categoryId': '20', 'description': 'd'},
          'contentDetails': cd, 'statistics': {'viewCount': '12345'}, 'status': {'embeddable': embed}}
    if lbc in ('live', 'upcoming'):
        it['liveStreamingDetails'] = {'scheduledStartTime': iso(st or NOW + 7200)}
        if lbc == 'live':
            it['liveStreamingDetails']['actualStartTime'] = iso(NOW - 1800)
            it['liveStreamingDetails']['concurrentViewers'] = str(cv or 0)
    return it


VIDS = {
    'rrrrrrrrrr1': vitem('rrrrrrrrrr1', R, '《魔物獵人 荒野》全武器評測'),
    'rrrrrrrrrr2': vitem('rrrrrrrrrr2', R, '音樂版權預告', embed=False),
    'hhhhhhhhhh1': vitem('hhhhhhhhhh1', E1, '【GTA6】實機新預告逐格分析'),
    'hhhhhhhhhh2': vitem('hhhhhhhhhh2', E1, '恐怖遊戲實況 限制級', age=True),
    'hhhhhhhhhh3': vitem('hhhhhhhhhh3', E1, '短片', dur='PT45S'),
    'llllllllll1': vitem('llllllllll1', E2, '【直播】艾爾登法環 DLC 全破挑戰', lbc='live', cv=4200),
    'llllllllll2': vitem('llllllllll2', E2, '【直播】小台試播', lbc='live', cv=3),
    'uuuuuuuuuu1': vitem('uuuuuuuuuu1', E3, '【首播】新作發表會', lbc='upcoming'),
    'gggggggggg1': vitem('gggggggggg1', E1, '台灣看不到的影片', region={'blocked': ['TW', 'HK']}),
}
CALLS = []


def fake_http(url, headers=None, timeout=25, tries=3, json_out=False):
    u = urllib.parse.urlparse(url)
    q = dict(urllib.parse.parse_qsl(u.query))
    path = u.path.rsplit('/', 1)[-1]
    CALLS.append((path, q))
    if path == 'videos' and q.get('chart') == 'mostPopular':
        return 200, {'items': [VIDS[k] for k in ('rrrrrrrrrr1', 'hhhhhhhhhh1', 'hhhhhhhhhh2', 'hhhhhhhhhh3', 'gggggggggg1')]}
    if path == 'videos':
        return 200, {'items': [VIDS[i] for i in q['id'].split(',') if i in VIDS]}
    if path == 'search':
        if q.get('eventType') == 'live':
            ids = ['llllllllll1', 'llllllllll2']
        else:
            ids = ['uuuuuuuuuu1']
        return 200, {'items': [{'id': {'videoId': i}, 'snippet': VIDS[i]['snippet']} for i in ids]}
    if path == 'channels':
        ids = q['id'].split(',')
        return 200, {'items': [{'id': c, 'snippet': {'title': '頻道' + c[-1], 'thumbnails': {'default': {'url': 'https://yt3/x.jpg'}}},
                                'statistics': {'subscriberCount': '500' if c == E3 else '120000', 'videoCount': '300'}} for c in ids]}
    return 404, None


def main():
    P.KEY = 'test'
    P.http_get = fake_http
    fails = []

    def ok(c, msg):
        print(('  OK  ' if c else '  ✗✗  ') + msg)
        if not c:
            fails.append(msg)
    cache = {k: {} for k in ('videos', 'steam', 'games', 'chstat', 'disc', 'tries', 'api', 'xch', 'ext')}
    P.API_DAY[0] = cache['api']
    roster = {'channels': {R: {'seed': '名單台', 'n': '名單台', 'k': 'media'}}}
    me = {'subs': {}, 'blocks': {}, 'passes': {}, 'later': {}, 'adds': [], 'seen': []}
    for vid in ('rrrrrrrrrr1', 'rrrrrrrrrr2'):
        cache['videos'][vid] = {'i': vid, 'c': R, 't0': VIDS[vid]['snippet']['title'], 'p': NOW - 3600, 's': 0}
    P.web_extras(cache, roster, me)
    P.prune_ext(cache)
    P.prune(cache, roster, me)
    P.enrich_api(cache)
    vids = cache['videos']
    ok(vids['rrrrrrrrrr2'].get('ne') == 'embed', '名單內：關掉嵌入的標 ne=embed')
    ok(not vids['rrrrrrrrrr1'].get('ne'), '名單內：能嵌入的不標')
    ok(vids['hhhhhhhhhh2'].get('ne') == 'age', '年齡限制標 ne=age')
    ok(vids['gggggggggg1'].get('ne') == 'region', '台灣看不到標 ne=region')
    ok(vids['hhhhhhhhhh1'].get('ext') == 'hot' and 'ext' not in vids['rrrrrrrrrr1'], '發燒榜：名單外的標 ext=hot，名單內的不標')
    ok(vids['hhhhhhhhhh3'].get('s') == 1, '發燒榜裡的 45 秒短片當 Shorts')
    ok(cache['ext'].get('hot', [])[:2] == ['rrrrrrrrrr1', 'hhhhhhhhhh1'], '發燒榜照名次記')
    ok('llllllllll1' in vids and vids['llllllllll1'].get('ext') == 'wl' and vids['llllllllll1'].get('cv') == 4200, '全網直播：收大台、有同時觀看')
    ok('llllllllll2' not in vids, '全網直播：同時觀看太少的不收')
    ok(vids.get('uuuuuuuuuu1', {}).get('xx') == 1, '即將直播：小頻道標成濾掉')
    ok(cache['xch'].get(E2, {}).get('subs') == 120000, '名單外頻道：補到訂閱數')
    ok(cache['api']['units'] >= 200 and cache['api']['units'] == P.UNITS[0], '額度：每天記帳（搜尋算 100 點）')
    # 第二次跑：不該再搜（時間還沒到）
    n = len(CALLS)
    P.web_extras(cache, roster, me)
    ok(len([c for c in CALLS[n:] if c[0] == 'search']) == 0, '一小時內不重搜全網直播')
    P.classify(cache, roster)
    feed = P.build_feed(cache, roster, me)
    items = {it['i']: it for it in feed['items']}
    ok(items['hhhhhhhhhh1'].get('ext') == 'hot' and feed['ch'].get(E1, {}).get('ext') == 1, 'feed：名單外影片與頻道都有 ext 標記')
    ok(items['rrrrrrrrrr2'].get('ne') == 'embed', 'feed：帶 ne')
    ok(items['uuuuuuuuuu1'].get('x') == 1, 'feed：小頻道的即將直播被濾掉')
    ok(feed['hot'][0] == 'rrrrrrrrrr1', 'feed：hot 名次')
    # 額度上限
    cache['api']['units'] = P.API_DAY_CAP - 50
    cache['ext']['wl_ts'] = 0
    n = len(CALLS)
    P.web_extras(cache, roster, me)
    ok(len([c for c in CALLS[n:] if c[0] == 'search']) == 0, '額度快用完時不搜')
    # 直播結束、過了六小時：拿掉
    v = vids['llllllllll1']
    v['lv'], v['seen_ext'], v['st'] = None, NOW - 7 * 3600, NOW - 8 * 3600
    P.prune_ext(cache)
    ok('llllllllll1' not in cache['videos'], '全網直播：結束六小時後拿掉')
    print('\n' + ('全部通過' if not fails else '失敗 %d 項' % len(fails)))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
