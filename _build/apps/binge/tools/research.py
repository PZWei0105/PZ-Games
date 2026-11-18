#!/usr/bin/env python3
"""補番 BINGE — 找動畫頻道（研究用，在 GitHub Actions 上跑：沙盒連不到 YouTube）

讀 research/queue.json：
  queries：關鍵字（在 YouTube 搜「頻道」和「影片」，影片結果帶片長）
  handles：要直接查的 @代號或頻道 ID
  deep：要深入看的頻道（影片分頁前 60 支的片長分布、播放清單分頁前 60 個）
每個找到的頻道再抓 RSS（最新 15 支：中文比例、AI 比例、合輯比例、多久沒更新）與影片分頁（片長、會員限定）。
結果寫成 research.json ＋ summary.md，工作流程推到 binge-research 分支。
  python3 research.py --queue research/queue.json --out /tmp/research
"""
import argparse
import collections
import concurrent.futures as cf
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ytx as X  # noqa: E402

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/131.0.0.0 Safari/537.36')
HDR = {'User-Agent': UA, 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.5', 'Cookie': 'CONSENT=YES+cb; SOCS=CAI'}
NS = {'a': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015', 'm': 'http://search.yahoo.com/mrss/'}
NOW = time.time()


def get(url, headers=None, timeout=25):
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers=headers or HDR)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            if e.code in (400, 403, 404, 410):
                return e.code, b''
        except Exception:  # noqa: BLE001
            pass
        time.sleep(1.5 * (i + 1))
    return 0, b''


def walk(o, key, out):
    if isinstance(o, dict):
        for k, v in o.items():
            if k == key:
                out.append(v)
            walk(v, key, out)
    elif isinstance(o, list):
        for v in o:
            walk(v, key, out)


def text(x):
    if not x:
        return ''
    if isinstance(x, str):
        return x
    if 'simpleText' in x:
        return x['simpleText']
    if 'content' in x:
        return x['content']
    return ''.join(r.get('text', '') for r in x.get('runs', []))


def search_channels(q):
    """YouTube 搜尋（只要頻道）。"""
    url = 'https://www.youtube.com/results?search_query=%s&sp=EgIQAg%%3D%%3D&hl=zh-TW&gl=TW' % urllib.parse.quote(q)
    st, body = get(url)
    h = body.decode('utf-8', 'replace')
    m = re.search(r'var ytInitialData = (\{.*?\});</script>', h)
    if not m:
        return []
    data = json.loads(m.group(1))
    rs, out = [], []
    walk(data, 'channelRenderer', rs)
    for r in rs:
        sub = text(r.get('subscriberCountText'))
        vc = text(r.get('videoCountText'))
        out.append({'c': r.get('channelId'), 'n': text(r.get('title')), 'h': sub if sub.startswith('@') else None,
                    'subs': vc if sub.startswith('@') else sub, 'ds': text(r.get('descriptionSnippet'))[:140]})
    return [x for x in out if x.get('c')]


def rss(cid):
    st, body = get('https://www.youtube.com/feeds/videos.xml?channel_id=' + cid, headers={'User-Agent': 'Mozilla/5.0 pz-binge'})
    if st != 200 or not body:
        return None
    root = ET.fromstring(body)
    items = []
    for e in root.findall('a:entry', NS):
        vid = e.findtext('yt:videoId', namespaces=NS)
        link = e.find('a:link', NS)
        g = e.find('m:group', NS)
        views = None
        desc = ''
        if g is not None:
            desc = g.findtext('m:description', default='', namespaces=NS) or ''
            stt = g.find('m:community/m:statistics', NS)
            if stt is not None and stt.get('views', '').isdigit():
                views = int(stt.get('views'))
        pub = e.findtext('a:published', namespaces=NS)
        try:
            p = int(dt.datetime.fromisoformat(pub.replace('Z', '+00:00')).timestamp())
        except (ValueError, AttributeError):
            p = None
        items.append({'i': vid, 't': (e.findtext('a:title', namespaces=NS) or '').strip(), 'p': p, 'v': views,
                      'short': '/shorts/' in (link.get('href') if link is not None else ''), 'chap': len(X.chapters(desc))})
    return {'n': root.findtext('a:title', namespaces=NS), 'items': items}


def page_id(handle):
    """@代號 → 頻道 ID、名稱、頭像、簡介。"""
    path = '/' + urllib.parse.quote(handle, safe='@') if handle.startswith('@') else '/channel/' + handle
    st, body = get('https://www.youtube.com' + path)
    if st != 200:
        return None
    h = body.decode('utf-8', 'replace')
    m = re.search(r'<link rel="canonical" href="https://www\.youtube\.com/channel/(UC[\w-]{22})"', h) or re.search(r'"externalId":"(UC[\w-]{22})"', h)
    if not m:
        return None
    t = re.search(r'<meta property="og:title" content="([^"]*)"', h)
    d = re.search(r'<meta property="og:description" content="([^"]*)"', h)
    a = re.search(r'<meta property="og:image" content="([^"]*)"', h)
    import html as H
    return {'c': m.group(1), 'n': H.unescape(t.group(1)) if t else None, 'ds': H.unescape(d.group(1))[:200] if d else '',
            'a': a.group(1) if a else None, 'h': handle if handle.startswith('@') else None}


def tab_stats(cid):
    """影片分頁前 60 支：片長分布、會員限定、Shorts；播放清單分頁前 60 個。"""
    out = {}
    v = X.flat('https://www.youtube.com/channel/%s/videos' % cid, limit=60)
    if v:
        es = v['entries']
        durs = [e.get('duration') for e in es if e.get('duration')]
        out['videos'] = len(es)
        out['dur_med'] = sorted(durs)[len(durs) // 2] if durs else None
        out['long'] = sum(1 for d in durs if d >= 40 * 60)
        out['xlong'] = sum(1 for d in durs if d >= 3 * 3600)
        out['max_h'] = round(max(durs) / 3600, 1) if durs else None
        out['members'] = sum(1 for e in es if X.members_only(e))
        out['fmt'] = dict(collections.Counter(X.fmt_of(e.get('title'), e.get('duration'), False, e.get('live_status')) for e in es))
        out['ai'] = sum(1 for e in es if X.is_ai(e.get('title')))
        out['sample'] = [[e.get('id'), (e.get('title') or '')[:70], e.get('duration'), e.get('view_count')] for e in es[:14]]
        out['views_med'] = sorted([e.get('view_count') or 0 for e in es])[len(es) // 2] if es else None
    else:
        out['videos_err'] = 1
    p = X.flat('https://www.youtube.com/channel/%s/playlists' % cid, limit=60)
    if p:
        out['playlists'] = [[e.get('id'), (e.get('title') or '')[:60]] for e in p['entries']][:60]
    s = X.flat('https://www.youtube.com/channel/%s/shorts' % cid, limit=30)
    if s:
        out['shorts'] = len(s['entries'])
        out['shorts_sample'] = [[e.get('id'), (e.get('title') or '')[:60], e.get('view_count')] for e in s['entries'][:6]]
    st = X.flat('https://www.youtube.com/channel/%s/streams' % cid, limit=20)
    if st:
        out['streams'] = [[e.get('id'), (e.get('title') or '')[:60], e.get('duration'), e.get('live_status')] for e in st['entries'][:8]]
    return out


def watch_meta(vid):
    """影片頁：片長、說明欄（章節）、直播狀態、能不能播（美國機房看台灣限定的片）。"""
    st, body = get('https://www.youtube.com/watch?v=%s&hl=zh-TW&gl=TW' % vid)
    h = body.decode('utf-8', 'replace')
    out = {'http': st, 'size': len(h)}
    m = re.search(r'"lengthSeconds":"(\d+)"', h)
    out['len'] = int(m.group(1)) if m else None
    m = re.search(r'"playabilityStatus":\{"status":"([A-Z_]+)"', h)
    out['play'] = m.group(1) if m else None
    m = re.search(r'"shortDescription":"((?:[^"\\]|\\.)*)"', h)
    if m:
        try:
            desc = json.loads('"' + m.group(1) + '"')
        except ValueError:
            desc = ''
        out['desc_len'] = len(desc)
        out['chap'] = len(X.chapters(desc, out['len']))
        out['pl_links'] = sorted(set(re.findall(r'list=((?:PL|OL)[\w-]{10,40})', desc)))[:6]
    out['live'] = bool(re.search(r'"isLiveNow":true', h))
    out['upcoming'] = bool(re.search(r'"isUpcoming":true', h))
    out['botcheck'] = 'confirm you' in h.lower() and 'bot' in h.lower()
    return out


def probes(q, log):
    res = {}
    for cid in q.get('probe_rss_watch', []):
        r = rss(cid)
        ids = [x['i'] for x in (r or {}).get('items', [])][:4]
        res['watch:' + cid] = [[i, watch_meta(i)] for i in ids]
        log.append('影片頁探測 %s：%s' % (cid, [(i, m.get('len'), m.get('play'), m.get('chap')) for i, m in res['watch:' + cid]]))
    for pl in q.get('probe_playlists', []):
        f = X.flat('https://www.youtube.com/playlist?list=' + pl, limit=300)
        st, body = get('https://www.youtube.com/feeds/videos.xml?playlist_id=' + pl, headers={'User-Agent': 'Mozilla/5.0 pz-binge'})
        n_rss = body.count(b'<entry>') if st == 200 else None
        res['pl:' + pl] = {'flat': len((f or {}).get('entries') or []), 'count': (f or {}).get('count'), 'title': (f or {}).get('title'),
                           'rss': n_rss, 'sample': [[e.get('id'), (e.get('title') or '')[:50], e.get('duration')] for e in ((f or {}).get('entries') or [])[:5]]}
        log.append('清單探測 %s：flat %s、count %s、RSS %s' % (pl, res['pl:' + pl]['flat'], res['pl:' + pl]['count'], n_rss))
    for cid in q.get('probe_playlist_tab', []):
        f = X.flat('https://www.youtube.com/channel/%s/playlists' % cid, limit=400)
        es = (f or {}).get('entries') or []
        res['pltab:' + cid] = [[e.get('id'), (e.get('title') or '')[:60]] for e in es]
        log.append('清單分頁 %s：%d 個' % (cid, len(es)))
    for kw in q.get('search_top', []):
        rs = search_channels(kw)[:5]
        res['top:' + kw] = rs
        log.append('搜頻道 %s：%s' % (kw, [(r['c'], r['n'], r.get('subs')) for r in rs[:3]]))
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--queue', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--max', type=int, default=140)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    q = json.load(open(a.queue, encoding='utf-8'))
    found = {}
    log = []

    def hit(c, n, why, meta=None):
        f = found.setdefault(c, {'c': c, 'n': n, 'hits': [], 'meta': {}, 'vids': []})
        if why not in f['hits']:
            f['hits'].append(why)
        if n and not f.get('n'):
            f['n'] = n
        for k, v in (meta or {}).items():
            if v and not f['meta'].get(k):
                f['meta'][k] = v
        return f

    # 1. 直接查的代號
    for h in q.get('handles', []):
        r = page_id(h)
        if r:
            hit(r['c'], r['n'], 'handle:' + h, {'h': r.get('h'), 'ds': r.get('ds'), 'a': r.get('a')})
            log.append('代號 %s → %s %s' % (h, r['c'], r['n']))
        else:
            log.append('代號 %s 找不到' % h)
        time.sleep(0.4)
    # 2. 搜尋
    for kw in q.get('queries', []):
        try:
            for r in search_channels(kw)[:12]:
                hit(r['c'], r['n'], 'ch:' + kw, {'h': r.get('h'), 'subs': r.get('subs'), 'ds': r.get('ds')})
        except Exception as e:  # noqa: BLE001
            log.append('頻道搜尋失敗 %s：%s' % (kw, e))
        res = X.flat('ytsearch40:' + kw, limit=40)
        n_long = 0
        for e in (res or {}).get('entries', []):
            c = e.get('channel_id')
            if not c:
                continue
            f = hit(c, e.get('channel') or e.get('uploader'), 'v:' + kw)
            d = e.get('duration')
            if d and d >= 40 * 60:
                n_long += 1
            if len(f['vids']) < 6:
                f['vids'].append([e.get('id'), (e.get('title') or '')[:70], d, e.get('view_count')])
        log.append('搜尋 %s：頻道 %d、影片 %d（長片 %d）' % (kw, len(found), len((res or {}).get('entries', [])), n_long))
        time.sleep(0.8)

    probe_res = probes(q, log)
    rows = list(found.values())
    for c in q.get('deep', []):
        if c not in found:
            r = page_id(c) if c.startswith('@') else {'c': c, 'n': None}
            if r:
                rows.append({'c': r['c'], 'n': r.get('n'), 'hits': ['deep'], 'meta': {}, 'vids': []})
    rows.sort(key=lambda f: -len(f['hits']))
    rows = rows[:a.max]

    def one(f):
        r = rss(f['c'])
        if r:
            its = r['items']
            ps = [x['p'] for x in its if x.get('p')]
            ts = [x['t'] for x in its]
            f['n'] = r['n'] or f['n']
            f['rss'] = {
                'n': len(its), 'last_days': round((NOW - max(ps)) / 86400, 1) if ps else None,
                'per_month': sum(1 for p in ps if NOW - p < 30 * 86400), 'zh': sum(1 for t in ts if X.lang_of(t) == 'zh'),
                'simp': sum(1 for t in ts if X.is_simplified(t)), 'ai': sum(1 for t in ts if X.is_ai(t)),
                'comp_t': sum(1 for t in ts if X.COMP_RX.search(t)), 'shorts': sum(1 for x in its if x['short']),
                'chap': sum(1 for x in its if x['chap']), 'titles': ts[:8],
                'views_med': sorted([x['v'] or 0 for x in its])[len(its) // 2] if its else None,
            }
        else:
            f['rss'] = None
        f['tab'] = tab_stats(f['c'])
        return f

    with cf.ThreadPoolExecutor(max_workers=4) as ex:
        rows = list(ex.map(one, rows))
    json.dump({'at': dt.datetime.utcnow().isoformat() + 'Z', 'log': log, 'probe': probe_res, 'rows': rows}, open(os.path.join(a.out, 'research.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    lines = ['# 補番 研究結果', '', '時間：%s' % dt.datetime.utcnow().isoformat(), '']
    lines += ['- ' + x for x in log] + ['']
    for f in rows:
        r, t = f.get('rss') or {}, f.get('tab') or {}
        lines.append('## %s `%s` %s' % (f.get('n'), f['c'], f['meta'].get('h') or ''))
        lines.append('命中 %d：%s' % (len(f['hits']), '、'.join(f['hits'][:8])))
        if r:
            lines.append('RSS：%s 天前更新、月更 %s、中文 %s/15、簡體 %s、AI %s、合輯字 %s、Shorts %s、章節 %s、觀看中位 %s' % (
                r.get('last_days'), r.get('per_month'), r.get('zh'), r.get('simp'), r.get('ai'), r.get('comp_t'), r.get('shorts'), r.get('chap'), r.get('views_med')))
        if t:
            lines.append('分頁：影片 %s、片長中位 %s 秒、長片 %s、3 小時以上 %s、最長 %s 小時、會員 %s、格式 %s、AI %s、Shorts %s、清單 %s' % (
                t.get('videos'), t.get('dur_med'), t.get('long'), t.get('xlong'), t.get('max_h'), t.get('members'), t.get('fmt'), t.get('ai'), t.get('shorts'), len(t.get('playlists') or [])))
            for s in (t.get('sample') or [])[:6]:
                lines.append('  - %s｜%s 秒｜%s 次｜%s' % (s[1], s[2], s[3], s[0]))
        lines.append('')
    open(os.path.join(a.out, 'summary.md'), 'w', encoding='utf-8').write('\n'.join(lines))
    print('完成', len(rows))


if __name__ == '__main__':
    main()
