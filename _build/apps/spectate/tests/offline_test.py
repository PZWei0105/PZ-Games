#!/usr/bin/env python3
"""管線離線測試：用假的 RSS、頻道頁、轉發站訊息跑一次 pipeline.py，檢查輸出。

  python3 _build/apps/spectate/tests/offline_test.py
"""
import json, os, re, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.join(HERE, '..', 'tools')
sys.path.insert(0, TOOLS)
import pipeline as P  # noqa: E402

A = 'UCaaaaaaaaaaaaaaaaaaaaaa'   # 精選（直接給 ID）
B = 'UCbbbbbbbbbbbbbbbbbbbbbb'   # 精選（用 @代號解析）
C = 'UCcccccccccccccccccccccc'   # 痞子葳自己貼網址新增


def name_of(url):
    return re.sub(r'[^a-z0-9]+', '_', url.lower())[-80:]


def rss(cid, title, entries):
    es = []
    for vid, t, pub, views, link in entries:
        es.append(f'''<entry><id>yt:video:{vid}</id><yt:videoId>{vid}</yt:videoId><yt:channelId>{cid}</yt:channelId>
<title>{t}</title><link rel="alternate" href="{link or 'https://www.youtube.com/watch?v=' + vid}"/>
<published>{pub}</published><updated>{pub}</updated>
<media:group><media:title>{t}</media:title><media:description>desc of {vid}</media:description>
<media:community><media:starRating count="12" average="5.00" min="1" max="5"/><media:statistics views="{views}"/></media:community></media:group></entry>''')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
<title>{title}</title><yt:channelId>{cid}</yt:channelId>{''.join(es)}</feed>'''


def main():
    tmp = tempfile.mkdtemp(prefix='spectate-')
    fx = os.path.join(tmp, 'fx')
    repo = os.path.join(tmp, 'repo')
    os.makedirs(fx)
    os.makedirs(os.path.join(repo, 'apps', 'spectate', 'data'))
    with open(os.path.join(repo, 'apps', 'spectate', 'data', 'channels.json'), 'w', encoding='utf-8') as f:
        json.dump({'channels': [
            {'name': '測試官方', 'id': A, 'lang': 'zh', 'kind': 'official', 'tags': ['官方']},
            {'name': '測試創作者', 'try': ['@nope', '@測試台'], 'lang': 'zh', 'kind': 'creator', 'tags': ['實況']},
        ]}, f, ensure_ascii=False)
    now = '2026-11-17T10:00:00+00:00'
    files = {
        A + '.xml': rss(A, '測試官方', [
            ('AAAAAAAAAA1', '《魔物獵人 荒野》第3彈免費大型更新 宣傳影片', now, 120000, None),
            ('AAAAAAAAAA2', 'Monster Hunter Wilds - Official Launch Trailer', '2026-11-10T10:00:00+00:00', 900000, None),
            ('AAAAAAAAAA3', '快來玩 #shorts', now, 50, 'https://www.youtube.com/shorts/AAAAAAAAAA3'),
        ]),
        B + '.xml': rss(B, '測試創作者', [
            ('BBBBBBBBBB1', '【实况】怪物猎人 荒野 #3 太难了', now, 3000, None),
            ('BBBBBBBBBB2', '《魔物獵人 荒野》值不值得買？完整評測', '2026-11-12T10:00:00+00:00', 45000, None),
        ]),
        C + '.xml': rss(C, '新加的台', [('CCCCCCCCCC1', '獨立遊戲推薦 TOP 5', now, 800, None)]),
        name_of('https://www.youtube.com/@%E6%B8%AC%E8%A9%A6%E5%8F%B0'): (
            f'<html><link rel="canonical" href="https://www.youtube.com/channel/{B}"><meta property="og:title" content="測試創作者台">'
            '<meta property="og:image" content="https://yt3.googleusercontent.com/abc=s900-c-k-c0x00ffffff-no-rj">'
            '<meta property="og:description" content="玩遊戲的頻道"></html>'),
        name_of('https://www.youtube.com/channel/' + C): (
            f'<html><link rel="canonical" href="https://www.youtube.com/channel/{C}"><meta property="og:title" content="新加的台">'
            '<meta property="og:image" content="https://yt3.googleusercontent.com/ccc=s900-c-k-c0x00ffffff-no-rj"></html>'),
        name_of('https://www.youtube.com/channel/' + A): (
            f'<html><link rel="canonical" href="https://www.youtube.com/channel/{A}"><meta property="og:title" content="測試官方">'
            '<meta property="og:image" content="https://yt3.googleusercontent.com/aaa=s900-c-k-c0x00ffffff-no-rj"></html>'),
    }
    evs = [
        {'id': 'dtest1-1', 'type': 'sub', 't': 1763400000000, 'ch': A, 'n': '測試官方', 'src': 'pool'},
        {'id': 'dtest1-2', 'type': 'later', 't': 1763400001000, 'v': 'BBBBBBBBBB2', 'on': True},
        {'id': 'dtest1-3', 'type': 'add', 't': 1763400002000, 'q': 'https://www.youtube.com/channel/' + C},
        {'id': 'dtest1-4', 'type': 'sub', 't': 1763400003000, 'ch': 'not-a-channel'},
        {'id': 'dEVIL-5', 'type': 'sub', 't': 1763400004000, 'ch': A},
    ]
    relay = '\n'.join(json.dumps({'id': 'm%d' % i, 'time': 1763400100 + i, 'event': 'message',
                                  'message': json.dumps({'v': 1, 'dev': 'dtest1', 'evs': [e]})}) for i, e in enumerate(evs))
    files[name_of(P.RELAY + '/json?poll=1&since=12h')] = relay
    for k, v in files.items():
        with open(os.path.join(fx, k), 'w', encoding='utf-8') as f:
            f.write(v)
    prev, out = os.path.join(tmp, 'prev'), os.path.join(tmp, 'out')
    os.makedirs(prev)
    r = subprocess.run([sys.executable, os.path.join(TOOLS, 'pipeline.py'), '--repo', repo, '--prev', prev, '--out', out, '--offline', fx],
                       capture_output=True, text=True)
    print(r.stdout[-3000:])
    if r.returncode:
        print(r.stderr[-3000:])
        sys.exit('管線失敗')
    feed = json.load(open(os.path.join(out, 'feed.json'), encoding='utf-8'))
    me = json.load(open(os.path.join(repo, 'apps', 'spectate', 'data', 'me.json'), encoding='utf-8'))
    roster = json.load(open(os.path.join(repo, 'apps', 'spectate', 'data', 'roster.json'), encoding='utf-8'))
    bad = []

    def ok(c, msg):
        print(('✓ ' if c else '✗ ') + msg)
        if not c:
            bad.append(msg)
    ids = {it['i']: it for it in feed['items']}
    ok(len(feed['items']) == 6, '六支影片都進來了（%d）' % len(feed['items']))
    ok(ids['AAAAAAAAAA3'].get('s') == 1, 'Shorts 連結被認出來')
    ok(ids['AAAAAAAAAA1']['l'] == 'trailer' and ids['AAAAAAAAAA1'].get('z') == 'zh', '中文預告：車道與語言')
    ok(ids['BBBBBBBBBB1']['t'].startswith('【實況】魔物獵人') or ids['BBBBBBBBBB1']['t'].startswith('【實況】怪物獵人'), '簡體標題轉繁體：' + ids['BBBBBBBBBB1']['t'])
    ok(ids['BBBBBBBBBB1'].get('t0', '').startswith('【实况】'), '原標題留著')
    ok(ids['BBBBBBBBBB2']['l'] == 'review', '評測車道')
    ok(A in me['subs'] and C in me['subs'], '訂閱與新增頻道都寫進 me.json')
    ok(me['later'].get('BBBBBBBBBB2'), '稍後觀看')
    ok('dtest1-4' not in me['seen'] and 'dEVIL-5' not in me['seen'], '壞事件被擋掉')
    ok(any(a['st'] == 'ok' and a['ch'] == C for a in me['adds']), '新增頻道解析成功')
    ok(roster['channels'].get(B, {}).get('seed') == '測試創作者', '@代號解析成功（第二個才對）')
    ok('=s176-' in (roster['channels'].get(B, {}).get('a') or ''), '頭像縮成小圖')
    ok(feed['ch'][B]['n'] == '測試創作者台', '頻道名稱來自頻道頁')
    # 第二次跑：上一版資料接得上、不重複收事件
    shutil.rmtree(prev)
    shutil.copytree(out, prev)
    out2 = os.path.join(tmp, 'out2')
    r = subprocess.run([sys.executable, os.path.join(TOOLS, 'pipeline.py'), '--repo', repo, '--prev', prev, '--out', out2, '--offline', fx],
                       capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-2000:])
    me2 = json.load(open(os.path.join(repo, 'apps', 'spectate', 'data', 'me.json'), encoding='utf-8'))
    ok(len(me2['seen']) == len(me['seen']), '第二次跑不會重複收同一筆事件')
    feed2 = json.load(open(os.path.join(out2, 'feed.json'), encoding='utf-8'))
    ok(len(feed2['items']) == 6, '第二次跑影片數不變')
    print('\n全部通過' if not bad else '\n%d 項沒過' % len(bad))
    shutil.rmtree(tmp)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
