#!/usr/bin/env python3
"""金鑰功能離線測試：假的 YouTube API，檢查台灣限定頻道的清單內容、嵌入判斷、全天放送、全網熱補、額度。

  python3 _build/apps/binge/tests/key_test.py
"""
import os, sys, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'tools'))
import pipeline as P  # noqa: E402

G = 'UCgggggggggggggggggggggg'     # 台灣限定頻道
N = 'UCnnnnnnnnnnnnnnnnnnnnnn'     # 一般名單頻道
E1 = 'UCeeeeeeeeeeeeeeeeeeeee1'    # 名單外：直播馬拉松
E2 = 'UCeeeeeeeeeeeeeeeeeeeee2'    # 名單外：長合輯
NOW = P.NOW
PL = 'PLgeo0000000000000000001'


def iso(t):
    import datetime as dt
    return dt.datetime.fromtimestamp(t, dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def vitem(vid, cid, title, dur='PT23M40S', lbc='none', cv=None, embed=True, cat='1', age=False):
    it = {'id': vid, 'snippet': {'channelId': cid, 'channelTitle': '頻道' + cid[-1], 'title': title, 'publishedAt': iso(NOW - 86400),
                                 'liveBroadcastContent': lbc, 'categoryId': cat, 'description': ''},
          'contentDetails': {'duration': dur}, 'statistics': {'viewCount': '54321'}, 'status': {'embeddable': embed}}
    if age:
        it['contentDetails']['contentRating'] = {'ytRating': 'ytAgeRestricted'}
    if lbc == 'live':
        it['liveStreamingDetails'] = {'actualStartTime': iso(NOW - 3600), 'concurrentViewers': str(cv or 0)}
    return it


GEO_EPS = ['geo%08d' % i for i in range(1, 73)]       # 72 集：要讀兩頁
VIDS = {v: vitem(v, G, '葬送的芙莉蓮 第%d集' % (k + 1)) for k, v in enumerate(GEO_EPS)}
VIDS['geo00000003'] = vitem('geo00000003', G, '葬送的芙莉蓮 第3集', embed=False)
VIDS['nnnnnnnnnn1'] = vitem('nnnnnnnnnn1', N, '一般影片', age=True)
VIDS['xlive000001'] = vitem('xlive000001', E1, '【24小時連播】名偵探柯南 動畫 全集', lbc='live', cv=1800, dur='P0D')
VIDS['xlive000002'] = vitem('xlive000002', E1, '動漫 直播 遊戲實況', lbc='live', cv=900, dur='P0D')       # 遊戲：濾掉
VIDS['xlive000003'] = vitem('xlive000003', E1, '動畫 24小時 小台', lbc='live', cv=3, dur='P0D')           # 人太少
VIDS['xcomp000001'] = vitem('xcomp000001', E2, '【一口氣看完】超能力動畫 合集 1-40集', dur='PT6H12M')
VIDS['xcomp000002'] = vitem('xcomp000002', E2, '動畫 合集 短的', dur='PT20M')                              # 太短
VIDS['xcomp000003'] = vitem('xcomp000003', E2, '動漫 全集 合輯', dur='PT3H', cat='20')                      # 遊戲分類
CALLS = []


def fake_http(url, headers=None, timeout=25, tries=3, json_out=False, data=None):
    u = urllib.parse.urlparse(url)
    q = dict(urllib.parse.parse_qsl(u.query))
    path = u.path.rsplit('/', 1)[-1]
    CALLS.append((path, q))
    if path == 'playlists':
        return 200, {'items': [{'id': PL, 'snippet': {'title': '葬送的芙莉蓮｜Muse木棉花 動畫 線上看'}, 'contentDetails': {'itemCount': 72}}]}
    if path == 'playlistItems':
        start = int(q.get('pageToken') or 0)
        page = GEO_EPS[start:start + 50]
        j = {'items': [{'snippet': {'title': VIDS[v]['snippet']['title'], 'resourceId': {'videoId': v}}, 'contentDetails': {'videoId': v, 'videoPublishedAt': iso(NOW - 86400)},
                        'status': {'privacyStatus': 'public'}} for v in page]}
        if start + 50 < len(GEO_EPS):
            j['nextPageToken'] = str(start + 50)
        return 200, j
    if path == 'videos':
        return 200, {'items': [VIDS[i] for i in q['id'].split(',') if i in VIDS]}
    if path == 'search':
        if q.get('eventType') == 'live':
            ids = ['xlive000001', 'xlive000002', 'xlive000003']
        else:
            ids = ['xcomp000001', 'xcomp000002', 'xcomp000003']
        # 跟真的 API 一樣：沒帶 part=snippet 就只回 ID（2026-11-19 踩過）
        return 200, {'items': [dict({'id': {'videoId': i}}, **({'snippet': VIDS[i]['snippet']} if 'snippet' in q.get('part', '') else {})) for i in ids]}
    if path == 'channels':
        return 200, {'items': [{'id': c, 'snippet': {'title': '頻道' + c[-1], 'thumbnails': {'default': {'url': 'https://yt3/a.jpg'}}}, 'statistics': {'subscriberCount': '88000'}}
                               for c in q['id'].split(',')]}
    return 404, None


def main():
    P.KEY = 'test'
    P.http_get = fake_http
    fails = []

    def ok(c, msg):
        print(('  OK  ' if c else '  ✗✗  ') + msg)
        if not c:
            fails.append(msg)
    chans = {G: {'seed': 'Muse', 'n': 'Muse木棉花-TW', 'k': 'jp', 'geo': 1}, N: {'seed': '一般', 'n': '一般台', 'k': 'jp'}}
    cache = {'v': {'nnnnnnnnnn1': {'c': N, 't': '一般影片', 'd': 600, 'p': NOW - 86400, 'fs': NOW - 86400}}, 'ch': {}, 'pl': {}, 'tries': {}, 'api': {}}
    pool = [G, N]
    # 第一次：先列出清單（keep 由 choose_playlists 決定）
    P.api_fill(pool, chans, cache, set())
    ok(PL in cache['pl'], '台灣限定頻道：列出播放清單')
    P.choose_playlists(pool, chans, cache, {})
    ok(cache['pl'][PL].get('keep') == 1, '清單被選進片庫')
    cache['ch'][G]['apl'] = NOW
    P.api_fill(pool, chans, cache, {'nnnnnnnnnn1'})
    p = cache['pl'][PL]
    ok(len(p.get('eps') or []) == 72 and p.get('via') == 'api', '清單內容用 API 讀完兩頁（72 集）')
    ok(len([c for c in CALLS if c[0] == 'playlistItems']) == 2, 'playlistItems 讀兩次')
    ok(cache['v']['geo00000001'].get('d') == 23 * 60 + 40, '新集數補到片長')
    ok(cache['v']['geo00000003'].get('ne') == 'embed', '關掉嵌入的標 ne')
    ok(cache['v']['nnnnnnnnnn1'].get('ne') == 'age', '片庫裡舊的影片也複查（年齡限制）')
    x = cache['ext']['v']
    ok('xlive000001' in x and x['xlive000001'].get('cv') == 1800, '全天放送：收動畫直播馬拉松')
    ok('xlive000002' not in x and 'xlive000003' not in x, '全天放送：遊戲實況、人太少的不收')
    ok('xcomp000001' in x and 'xcomp000002' not in x and 'xcomp000003' not in x, '全網熱補：收一小時以上的動畫合輯，遊戲分類不收')
    ok(cache['ext']['ch'][E2].get('a') == 'https://yt3/a.jpg', '名單外頻道補頭像')
    ok(cache['api']['units'] >= 500, '額度：搜尋一次記 100 點（這次 %d 點）' % cache['api']['units'])
    # 第三次：不該再搜；直播結束就拿掉
    n = len(CALLS)
    VIDS['xlive000001'] = vitem('xlive000001', E1, '【24小時連播】名偵探柯南 動畫 全集', dur='PT30H')
    P.api_fill(pool, chans, cache, set())
    ok(not [c for c in CALLS[n:] if c[0] == 'search'], '四小時內不重搜')
    ok('xlive000001' not in cache['ext']['v'], '直播結束：拿掉')
    ok(len([c for c in CALLS[n:] if c[0] == 'playlistItems']) == 0, '清單剛讀過：不重讀')
    # 輸出
    cache['ext']['v']['xlive000009'] = dict(cache['ext']['v'].get('xcomp000001'), src='live', lv='live', cv=500, lvat=int(NOW), t='【24H】海綿寶寶 卡通 連播')
    roster_chans = dict(chans)
    me = {'blocks': {}, 'follow': {}, 'later': {}, 'hides': {}, 'prog': {}, 'adds': [], 'seen': []}
    cat = P.build_catalog(cache, roster_chans, me)
    ext = cat.get('ext') or {}
    ok(ext and ext['ch'][0].get('ext') == 1, 'catalog.ext：頻道有 ext 標記')
    ok([r[6] for r in ext['vids']] == ['l', 'c'], 'catalog.ext：直播排前面、再來合輯')
    row = next(r for r in cat['vids'] if r[0] == 'geo00000003')
    ok(row[7] & 128, 'catalog：不能嵌入的旗標 128')
    # 額度上限
    cache['api']['units'] = P.API_DAY_CAP - 30
    cache['ext']['live_ts'] = 0
    n = len(CALLS)
    try:
        P.api_fill(pool, chans, cache, set())
    except P.QuotaStop:
        pass
    ok(not [c for c in CALLS[n:] if c[0] == 'search'], '額度快用完時不搜')
    print('\n' + ('全部通過' if not fails else '失敗 %d 項' % len(fails)))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
