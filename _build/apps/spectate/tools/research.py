#!/usr/bin/env python3
"""觀戰 SPECTATE — 找中文遊戲頻道（手動觸發的一次性查詢，給維護精選名單用）

在 GitHub Actions 上跑（沙盒連不到 YouTube）：照關鍵字在 YouTube 搜尋「頻道」，
再抓每個頻道的 RSS 看最近有沒有更新、標題是不是中文、是不是在聊遊戲。結果寫成 research.json。
  python3 research.py --q '遊戲評測,遊戲實況' --out /tmp/research
"""
import argparse, json, os, re, sys, time, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pipeline as P  # noqa: E402
import ytextract as X  # noqa: E402

GAMEY = re.compile(r'遊戲|游戏|攻略|實況|实况|評測|评测|預告|预告|Steam|PS5|Switch|Xbox|魂|RPG|試玩|试玩|通關|通关|劇情|剧情|BOSS|DLC|手把|主機|電競|电竞|玩家|新作|上市|發售|发售', re.I)


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
    if 'simpleText' in x:
        return x['simpleText']
    return ''.join(r.get('text', '') for r in x.get('runs', []))


def search(q, kind):
    sp = {'channel': 'EgIQAg%3D%3D', 'video': 'EgIQAQ%3D%3D'}[kind]
    url = 'https://www.youtube.com/results?search_query=%s&sp=%s&hl=zh-TW&gl=TW' % (urllib.parse.quote(q), sp)
    st, body = P.http_get(url, headers=P.YT_HEADERS)
    h = body.decode('utf-8', 'replace')
    m = re.search(r'var ytInitialData = (\{.*?\});</script>', h)
    if not m:
        return []
    data = json.loads(m.group(1))
    out = []
    if kind == 'channel':
        rs = []
        walk(data, 'channelRenderer', rs)
        for r in rs:
            out.append({'c': r.get('channelId'), 'n': text(r.get('title')), 'subs': text(r.get('videoCountText')) or text(r.get('subscriberCountText')),
                        'h': text(r.get('subscriberCountText')) if text(r.get('subscriberCountText')).startswith('@') else None,
                        'ds': text(r.get('descriptionSnippet'))[:120]})
    else:
        rs = []
        walk(data, 'videoRenderer', rs)
        for r in rs:
            own = (r.get('ownerText') or {}).get('runs') or [{}]
            cid = (((own[0].get('navigationEndpoint') or {}).get('browseEndpoint') or {}).get('browseId'))
            out.append({'c': cid, 'n': own[0].get('text'), 'vt': text(r.get('title'))[:80], 'views': text(r.get('viewCountText'))})
    return [x for x in out if x.get('c')]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--q', required=True)
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    found = {}
    for q in [x.strip() for x in a.q.split(',') if x.strip()]:
        for kind in ('channel', 'video'):
            try:
                rs = search(q, kind)
            except Exception as e:  # noqa: BLE001
                print('搜尋失敗', q, kind, e)
                continue
            for r in rs:
                f = found.setdefault(r['c'], {'c': r['c'], 'n': r.get('n'), 'hits': [], 'meta': {}})
                f['hits'].append(q + ':' + kind)
                for k in ('subs', 'h', 'ds'):
                    if r.get(k):
                        f['meta'][k] = r[k]
            time.sleep(1.0)
        print(q, '→ 累計', len(found), flush=True)
    now = time.time()
    rows = []
    for cid, f in found.items():
        try:
            name, items = P.fetch_rss(cid)
        except Exception as e:  # noqa: BLE001
            f['rss'] = str(e)[:60]
            rows.append(f)
            continue
        ps = [it['p'] for it in items if it.get('p')]
        titles = [it['t'] for it in items]
        f['n'] = name or f['n']
        f['last_days'] = round((now - max(ps)) / 86400, 1) if ps else None
        f['per_month'] = sum(1 for p in ps if now - p < 30 * 86400)
        f['zh'] = sum(1 for t in titles if X.lang_of(t) == 'zh')
        f['gamey'] = sum(1 for t in titles if GAMEY.search(t))
        f['shorts'] = sum(1 for it in items if it.get('short_link'))
        f['n_items'] = len(items)
        f['titles'] = titles[:6]
        rows.append(f)
        time.sleep(0.2)
    rows.sort(key=lambda f: (-(f.get('zh') or 0) - (f.get('gamey') or 0) - len(f['hits'])))
    with open(os.path.join(a.out, 'research.json'), 'w', encoding='utf-8') as fp:
        json.dump(rows, fp, ensure_ascii=False, indent=1)
    print('完成：', len(rows), '個頻道')


if __name__ == '__main__':
    main()
