#!/usr/bin/env python3
"""補番 BINGE — 資料管線離線測試（假的 RSS、頻道分頁、播放清單、影片頁、轉發站）

  python3 _build/apps/binge/tests/offline_test.py            # 跑一次、檢查輸出
  python3 _build/apps/binge/tests/offline_test.py --keep /tmp/binge-fake   # 留下假片庫（給 App 截圖用）

假資料涵蓋：AI 漫劇頻道（長片合輯＋Shorts）、台灣限定的日本動畫頻道（分頁看不到，只能從說明欄找清單）、國漫頻道（播放清單）、卡通頻道。
"""
import argparse, hashlib, json, os, shutil, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.join(HERE, '..', 'tools')
NOW = int(time.time())

AI, JP, CN, TOON = 'UC' + 'a' * 22, 'UC' + 'b' * 22, 'UC' + 'c' * 22, 'UC' + 'd' * 22
SEED = {'channels': [
    {'id': AI, 'name': '測試漫劇台', 'kind': 'ai', 'lang': 'zh'},
    {'id': JP, 'name': '測試木棉花', 'kind': 'jp', 'lang': 'zh', 'geo': 'TW', 'live': 1, 'official': 1},
    {'id': CN, 'name': '測試國漫', 'kind': 'cn', 'lang': 'zh', 'official': 1},
    {'id': TOON, 'name': '測試卡通', 'kind': 'toon', 'lang': 'zh'},
]}
SHOWS = ['冰封末日：我的房車是生存堡壘', '我在邊關造裝甲', '仙眼', '重生之我在末世當城主', '全員惡仙：我有一座種仙觀', '修仙界沒有正常人']


def vid(*a):
    return hashlib.sha1('-'.join(map(str, a)).encode()).hexdigest()[:11].replace('a', 'A').replace('b', '_').replace('c', '-')


def h12(url):
    return hashlib.sha1(url.encode()).hexdigest()[:12]


def rss(cid, name, items):
    ents = []
    for it in items:
        ents.append('''<entry><yt:videoId>%s</yt:videoId><title>%s</title><link rel="alternate" href="https://www.youtube.com/%s"/>
<published>%s</published><media:group><media:description>%s</media:description><media:community><media:statistics views="%d"/></media:community></media:group></entry>''' % (
            it['i'], it['t'], ('shorts/' if it.get('short') else 'watch?v=') + it['i'],
            time.strftime('%Y-%m-%dT%H:%M:%S+00:00', time.gmtime(it['p'])), it.get('desc', ''), it.get('v', 1000)))
    return ('<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">'
            '<title>%s</title>%s</feed>' % (name, ''.join(ents))).encode()


def build(fx):
    os.makedirs(fx, exist_ok=True)
    w = lambda name, data: open(os.path.join(fx, name), 'wb' if isinstance(data, bytes) else 'w', **({} if isinstance(data, bytes) else {'encoding': 'utf-8'})).write(data)
    # ---- AI：RSS 15 支合輯（2～9 小時，第一部有章節）＋影片分頁 40 支＋Shorts
    items = []
    for k in range(15):
        name = SHOWS[k % len(SHOWS)]
        season = k // len(SHOWS) + 1
        t = '🔥一口气看完《%s》第%d季 第1-80集 #漫剧 #AI漫剧 #一口气看完' % (name, season) if season > 1 else '【完整版】一口氣看完《%s》1-80集（已完結）#AI漫劇' % name
        desc = '00:00 第1集\n03:12 第2集\n06:30 第3集\n09:45 第4集' if k == 0 else '好看的漫劇'
        items.append({'i': vid('ai', k), 't': t, 'p': NOW - k * 20000, 'v': 5000 + k * 900, 'desc': desc})
    items.append({'i': vid('ai', 'short'), 't': '絕境逆襲！#shorts #漫劇', 'p': NOW - 3000, 'v': 90000, 'short': True})
    w(AI + '.xml', rss(AI, '測試漫劇台', items))
    tab = [{'id': it['i'], 'title': it['t'], 'duration': 7200 + k * 1800, 'view_count': it['v'], 'url': 'https://www.youtube.com/watch?v=' + it['i']} for k, it in enumerate(items[:15])]
    tab += [{'id': vid('ai-old', k), 'title': '一口氣看完《舊作%d：開局簽到荒古聖體》全集' % k, 'duration': 10800 + k * 600, 'view_count': 20000 + k * 3000,
             'url': 'https://www.youtube.com/watch?v=' + vid('ai-old', k)} for k in range(25)]
    w('flat_%s.json' % h12('https://www.youtube.com/channel/%s/videos' % AI), json.dumps({'entries': tab}))
    w('flat_%s.json' % h12('https://www.youtube.com/channel/%s/shorts' % AI), json.dumps({'entries': [
        {'id': vid('ai-sh', k), 'title': '第%d集 被休棄的她攜子歸來 #AI漫劇' % (k + 1), 'view_count': 30000 + k, 'url': 'https://www.youtube.com/shorts/' + vid('ai-sh', k)} for k in range(12)]}))
    w('flat_%s.json' % h12('https://www.youtube.com/channel/%s/playlists' % AI), json.dumps({'entries': []}))
    # ---- 日本動畫（台灣限定）：RSS 有說明欄的清單連結；清單內容抓得到；影片頁給片長；一場馬拉松直播
    pl_a = 'PL12UaAf_xzfor6SdQvoC7pr7Hwfowmr5Q'
    pl_b = 'PL12UaAf_xzfr1wiFH5rlDMACeM8EP2Wdb'
    jp = []
    for k in range(10):
        jp.append({'i': vid('jp', k), 't': 'Re:從零開始的異世界生活 第四季 喪失編 第%02d話【標題%d】｜Muse木棉花 動畫 線上看' % (k + 1, k + 1),
                   'p': NOW - (10 - k) * 7 * 86400, 'v': 80000 - k * 3000, 'desc': '完整播放清單：https://www.youtube.com/playlist?list=%s' % pl_a})
    jp.append({'i': vid('jp', 'live'), 't': '《無職轉生 S1-S3》馬拉松直播✨｜Muse木棉花', 'p': NOW - 3600, 'v': 12000, 'desc': 'https://www.youtube.com/playlist?list=' + pl_b})
    jp.append({'i': vid('jp', 'pv'), 't': '戀上換裝娃娃 Season 2 第22話預告｜Muse木棉花 動畫 線上看', 'p': NOW - 7200, 'v': 3000})
    w(JP + '.xml', rss(JP, 'Muse木棉花-TW', jp))
    w('flat_%s.json' % h12('https://www.youtube.com/playlist?list=' + pl_a), json.dumps({'title': 'Re:從零開始的異世界生活 第四季｜Muse木棉花 動畫 線上看', 'count': 12, 'entries': [
        {'id': vid('jp', k), 'title': 'Re:從零開始的異世界生活 第四季 喪失編 第%02d話【標題%d】｜Muse木棉花 動畫 線上看' % (k + 1, k + 1), 'duration': 1421, 'view_count': 80000 - k * 3000} for k in range(12)]}))
    w('flat_%s.json' % h12('https://www.youtube.com/playlist?list=' + pl_b), json.dumps({'title': '第一神拳(全部集數)｜Muse木棉花 動畫 線上看', 'count': 30, 'entries': [
        {'id': vid('hajime', k), 'title': '第一神拳 第%02d話【回合%d】｜Muse木棉花 動畫 線上看' % (k + 1, k + 1), 'duration': 1444, 'view_count': 20000 - k * 100} for k in range(30)]}))
    w('w_%s.html' % vid('jp', 'live'), '<script>var x={"lengthSeconds":"0","isLiveNow":true,"playabilityStatus":{"status":"UNPLAYABLE"},"shortDescription":"馬拉松"}</script>')
    for k in range(10):
        w('w_%s.html' % vid('jp', k), '<script>{"lengthSeconds":"1421","playabilityStatus":{"status":"UNPLAYABLE"},"shortDescription":"Re:Zero"}</script>')
    # ---- 國漫：分頁＋播放清單（新到舊排）
    cn_eps = [{'id': vid('cn', k), 'title': '九陽武神 | EP%02d：第%d戰 | 愛奇藝國漫 iQIYI Animation' % (k + 1, k + 1), 'duration': 600, 'view_count': 9000 + k} for k in range(52)]
    w(CN + '.xml', rss(CN, '愛奇藝國漫', [{'i': e['id'], 't': e['title'], 'p': NOW - (52 - k) * 86400, 'v': e['view_count']} for k, e in enumerate(cn_eps[-15:])]))
    w('flat_%s.json' % h12('https://www.youtube.com/channel/%s/videos' % CN), json.dumps({'entries': cn_eps[::-1][:40] + [
        {'id': vid('cn', 'vip'), 'title': '【会员专享】九陽武神 EP53', 'duration': 600, 'availability': 'subscriber_only'},
        {'id': vid('cn', 'comp'), 'title': '女帝殘軀 三魂歸位 | 絕世戰魂 | EP101-170 | iQIYI Anime Asia', 'duration': 46769, 'view_count': 5702}]}))
    pl_cn, pl_vip = 'PL' + 'x' * 32, 'PL' + 'y' * 32
    w('flat_%s.json' % h12('https://www.youtube.com/channel/%s/playlists' % CN), json.dumps({'entries': [
        {'id': pl_cn, 'title': '【💚🌌Gale Rush | Every Tue.】《九陽武神》', 'url': 'https://www.youtube.com/playlist?list=' + pl_cn},
        {'id': pl_vip, 'title': '【👑PLATIN MEMBER ONLY | Every Thur.】《絕世戰魂 第二季》', 'url': 'https://www.youtube.com/playlist?list=' + pl_vip}]}))
    w('flat_%s.json' % h12('https://www.youtube.com/playlist?list=' + pl_cn), json.dumps({'title': '【💚🌌Gale Rush | Every Tue.】《九陽武神》', 'entries': cn_eps[::-1]}))
    w('flat_%s.json' % h12('https://www.youtube.com/channel/%s/streams' % CN), json.dumps({'entries': [
        {'id': vid('cn', 'live'), 'title': '【LIVE】《邪王追妻》全系列合集', 'live_status': 'is_live'}]}))
    # ---- 卡通：只有 RSS（片長要讀影片頁）
    w(TOON + '.xml', rss(TOON, '測試卡通', [{'i': vid('toon', k), 't': '熊出沒之秋日團團轉 第%d集' % (k + 1), 'p': NOW - k * 86400, 'v': 4000} for k in range(6)]))
    for k in range(6):
        w('w_%s.html' % vid('toon', k), '{"lengthSeconds":"720","playabilityStatus":{"status":"OK"}}')
    # ---- 轉發站：一筆追番、一筆長片進度、一筆不合格的
    relay = 'https://ntfy.sh/pz-binge-7e3572039bf2097cf2bf/json?poll=1&since=12h'
    msgs = [{'event': 'message', 'time': NOW, 'message': json.dumps({'v': 1, 'dev': 'dtest01', 'evs': [
        {'id': 'dtest01-1', 'type': 'follow', 's': 'p:' + pl_a, 'n': 'Re:從零', 't': NOW * 1000},
        {'id': 'dtest01-2', 'type': 'prog', 'v': vid('ai', 1), 'pos': 3600, 'len': 9000, 't': NOW * 1000},
        {'id': 'bad', 'type': 'follow', 's': 'x', 't': NOW * 1000}]})}]
    w(hashlib.sha1(relay.encode()).hexdigest()[:16], '\n'.join(json.dumps(m) for m in msgs))
    return pl_a, pl_b, pl_cn, pl_vip


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--keep')
    a = ap.parse_args()
    tmp = tempfile.mkdtemp(prefix='binge-test-')
    fx, repo, prev, out = (os.path.join(tmp, x) for x in ('fx', 'repo', 'prev', 'out'))
    os.makedirs(os.path.join(repo, 'apps', 'binge', 'data'))
    os.makedirs(prev)
    json.dump(SEED, open(os.path.join(repo, 'apps', 'binge', 'data', 'channels.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    pl_a, pl_b, pl_cn, pl_vip = build(fx)
    cmd = [sys.executable, os.path.join(TOOLS, 'pipeline.py'), '--repo', repo, '--prev', prev, '--out', out, '--offline', fx, '--budget', '1']
    r = subprocess.run(cmd, capture_output=True, text=True)
    print(r.stdout[-3000:])
    if r.returncode:
        print(r.stderr[-3000:])
        sys.exit('管線失敗')
    cat = json.load(open(os.path.join(out, 'catalog.json'), encoding='utf-8'))
    me = json.load(open(os.path.join(repo, 'apps', 'binge', 'data', 'me.json'), encoding='utf-8'))
    bad = []
    ok = lambda cond, msg: None if cond else bad.append(msg)
    shows = {s['id']: s for s in cat['shows']}
    vids = cat['vids']
    byid = {v[0]: v for v in vids}
    ok('p:' + pl_a in shows, '台灣限定頻道的清單（從說明欄找到的）要變成作品')
    ok('p:' + pl_b in shows, '馬拉松直播說明欄的清單也要抓')
    ok('p:' + pl_cn in shows, '國漫的清單要變成作品')
    ok('p:' + pl_vip not in shows, '會員限定的清單不收')
    if 'p:' + pl_cn in shows:
        s = shows['p:' + pl_cn]
        first = vids[s['eps'][0]]
        ok(first[9] == 1, '新到舊排的清單要倒過來（第 1 集在前），現在是第 %s 集' % first[9])
        ok(s['n'] == '九陽武神', '作品名要從各集標題找共同的名字，現在是「%s」' % s['n'])
        ok(first[2].startswith('EP01'), '作品裡的單集標題要拿掉作品名，現在是「%s」' % first[2])
    if 'p:' + pl_a in shows:
        ok(shows['p:' + pl_a]['n'].startswith('Re:從零開始的異世界生活 第四季'), 'Re:Zero 作品名：%s' % shows['p:' + pl_a]['n'])
    ok(not any('会员' in v[2] or '會員' in v[2] for v in vids), '會員限定影片不收')
    comps = [v for v in vids if v[6] == 'c']
    ok(len(comps) >= 20, 'AI 合輯要收進來（%d 支）' % len(comps))
    ok(any(v[10] == 1 and v[11] == 80 for v in vids), '合輯的集數範圍（1-80 集）')
    ok(any(v[0] in cat['chap'] for v in comps), '說明欄有時間碼的合輯要有章節')
    ok(any(v[6] == 's' for v in vids), 'Shorts（直式短劇）要收')
    ok(any(v[7] & 16 for v in vids), '直播中的馬拉松要標成直播')
    ok(all('#' not in v[2] for v in vids), '標題不能留 hashtag')
    ok(all('Muse木棉花 動畫 線上看' not in v[2] for v in vids), '標題不能留頻道名尾巴')
    ok(any('冰封末日' in s['n'] for s in cat['shows']), '同一部的第 1、2 季合輯要合成一部作品')
    ok(byid.get(vid('toon', 0), [0, 0, 0, 0])[3] == 720, '只有 RSS 的影片要從影片頁補片長')
    ok('p:' + pl_a in me['follow'], '轉發站的追番要寫進 me.json')
    ok(vid('ai', 1) in me['prog'], '長片進度要寫進 me.json')
    ok(len(me['seen']) == 2, '不合格的事件要丟掉')
    simp = [v[2] for v in vids if any(ch in v[2] for ch in '这个们来说时会对发进过还没为')]
    ok(not simp, '簡體標題要轉繁體：%s' % simp[:3])
    st = json.load(open(os.path.join(out, 'status.json'), encoding='utf-8'))
    print('片庫：%d 支、作品 %d 部、%d KB' % (len(vids), len(cat['shows']), st['size_kb']))
    for s in cat['shows'][:12]:
        print('  作品', s['id'][:24], s['n'], len(s['eps']), '集')
    # 第二次跑（有上一版快取）：不能壞
    shutil.copy(os.path.join(out, 'cache.json'), os.path.join(prev, 'cache.json'))
    r2 = subprocess.run(cmd, capture_output=True, text=True)
    ok(r2.returncode == 0, '第二次跑失敗：' + r2.stderr[-600:])
    if a.keep:
        os.makedirs(a.keep, exist_ok=True)
        shutil.copy(os.path.join(out, 'catalog.json'), a.keep)
        shutil.copy(os.path.join(repo, 'apps', 'binge', 'data', 'me.json'), a.keep)
        print('假片庫留在', a.keep)
    shutil.rmtree(tmp)
    if bad:
        print('\n'.join('BAD ' + b for b in bad))
        sys.exit(1)
    print('OK 全部通過')


if __name__ == '__main__':
    main()
