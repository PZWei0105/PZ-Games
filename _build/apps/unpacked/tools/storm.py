#!/usr/bin/env python3
"""解包 — 風暴眼資料管線（2026-11-21）

「現在最熱的那一款遊戲」，每小時收一次：
- 新聞：Google News（繁中台灣版、英文美國版）的標題、來源、時間
- PTT：C_Chat、PlayStation、XBOX 等板的標題搜尋（推文數、時間；不存作者）
- Reddit：遊戲的版的熱門話題（雲端主機常被擋，連得上才有）
- YouTube：讀《觀戰》管線（spectate-data 分支的 storm.json）的 24 小時新片、直播中台數與觀看人數、熱門片
算熱度指數（0～100）與風暴等級（CAT 1～5），記時間軸（每小時一點，留 30 天）。

哪一款：data/storm-pick.json（排程「風暴日報」寫：auto＝自動判斷的那款、games＝每款的搜尋字）；
痞子葳在 App 裡指定一款或換回自動（點播台轉發站的 storm 事件，inbox.py 收進 inbox.json），指定的優先。

寫：data/storm.json（現在是哪一款、摘要、歷屆風暴）、data/storm/<key>.json（明細與時間軸）。
不動：data/storm/<key>.digest.json（風暴日報，排程寫）、data/storm-pick.json。

用法：python3 storm.py --data apps/unpacked/data [--offline 假資料資料夾]
"""
import argparse
import datetime as dt
import html as htmllib
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zlib

UTC = dt.timezone.utc
TW = dt.timezone(dt.timedelta(hours=8))
UA = 'Mozilla/5.0 (UNPACKED storm pipeline; +https://pzwei0105.github.io/PZ-Games/apps/unpacked/)'
UA_BROWSER = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
              'Chrome/131.0 Safari/537.36')
SPECTATE = 'https://raw.githubusercontent.com/PZWei0105/PZ-Games/spectate-data/'
BOARDS = ['C_Chat', 'PlayStation', 'XBOX', 'Steam', 'NSwitch']
KEEP_TL = 30 * 24          # 時間軸最多幾點（每小時一點，30 天）
OFFLINE = None
LOG, ERRS = [], []
NOW = time.time()


def log(*a):
    s = ' '.join(str(x) for x in a)
    LOG.append(s)
    print(s, flush=True)


def err(s):
    ERRS.append(s[:200])
    print('!! ' + s, flush=True)


def load(path, default):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return default


def save_if_changed(path, obj, ignore=('at',)):
    old = load(path, None)

    def strip(o):
        if isinstance(o, dict):
            return {k: strip(v) for k, v in o.items() if k not in ignore}
        if isinstance(o, list):
            return [strip(v) for v in o]
        return o
    if old is not None and strip(old) == strip(obj):
        return False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, path)
    return True


def fixture(url):
    url = re.sub(r'[?&]t=\d+$', '', url)        # 快取用的時間參數不算
    return os.path.join(OFFLINE, re.sub(r'[^a-zA-Z0-9]+', '_', url)[:180] + '.txt')


def get(url, headers=None, timeout=25, tries=2):
    if OFFLINE is not None:
        p = fixture(url)
        if os.path.exists(p):
            with open(p, encoding='utf-8') as f:
                return f.read()
        raise RuntimeError('offline: no fixture ' + os.path.basename(p))
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=dict({'User-Agent': UA}, **(headers or {})))
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:   # 403／429 重試也沒用
            last = e
            if e.code in (403, 404, 429):
                break
            time.sleep(1.5 * (i + 1))
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f'{type(last).__name__}: {str(last)[:120]}')


def iso(ts):
    return dt.datetime.fromtimestamp(ts, UTC).strftime('%Y-%m-%dT%H:%M:%SZ')


def norm(s):
    return re.sub(r'[\s　:：·・\-—_]+', '', (s or '').lower())


# ---------------------------------------------------------------- 哪一款
def slug(s):
    k = re.sub(r'[^a-z0-9]+', '-', (s or '').lower()).strip('-')
    return k[:40] if len(k) >= 3 else 'pin-%08x' % zlib.crc32((s or '').encode('utf-8'))


def default_terms(q):
    """痞子葳指定了一款排程還沒研究過的：先用他打的字搜，下一次風暴日報會補上更好的搜尋字。"""
    qq = q.strip()
    pat = re.escape(qq).replace('\\ ', '\\s?')
    return {'zh': qq, 'en': qq, 'short': qq, 'rx': pat, 'news': {'zh': '"%s"' % qq, 'en': '"%s"' % qq},
            'yt': {'zh': qq, 'en': qq}, 'ptt': [qq], 'boards': BOARDS[:4], 'reddit': None}


def resolve_pin(q, games, D):
    nq = norm(q)
    for k, g in games.items():
        if nq and nq in {norm(k), norm(g.get('zh')), norm(g.get('en')), norm(g.get('short'))}:
            return k, g
    for f in ('index.json', 'picks.json'):
        for it in (load(os.path.join(D, f), {}) or {}).get('items') or []:
            if nq and nq in {norm(it.get('zh')), norm(it.get('en'))}:
                g = default_terms(it.get('zh') or q)
                g.update({'zh': it.get('zh') or q, 'en': it.get('en') or q, 'steam': it.get('steam'), 'img': it.get('img')})
                en = it.get('en') or ''
                if en and en != g['zh']:
                    g['rx'] = '%s|%s' % (re.escape(g['zh']).replace('\\ ', '\\s?'), re.escape(en).replace('\\ ', '\\s?'))
                    g['news'] = {'zh': '"%s"' % g['zh'], 'en': '"%s"' % en}
                    g['yt'] = {'zh': g['zh'], 'en': en}
                return slug(en or g['zh']), g
    return slug(q), default_terms(q)


def pick_current(D, prev):
    pick = load(os.path.join(D, 'storm-pick.json'), {}) or {}
    games = pick.get('games') or {}
    evs = [e for e in (load(os.path.join(D, 'inbox.json'), {}) or {}).get('events') or [] if e.get('type') == 'storm']
    evs.sort(key=lambda e: e.get('t') or '')
    pin = None
    if evs:
        e = evs[-1]
        if e.get('mode') == 'pin' and (e.get('q') or '').strip():
            k, g = resolve_pin(e['q'], games, D)
            pin = dict(g, key=k, pin=1, since=(e.get('t') or iso(NOW))[:10], why='你指定的')
    if pin:
        cur = pin
    else:
        k = pick.get('auto')
        g = games.get(k) if k else None
        if not g:
            return None, pick
        cur = dict(g, key=k, pin=0, why=pick.get('why') or g.get('why') or '')
    # 排程研究過這款就用排程的搜尋字（比痞子葳打的字準）
    if cur['key'] in games and cur.get('pin'):
        cur = dict(games[cur['key']], key=cur['key'], pin=1, since=cur.get('since'), why='你指定的')
    cur.setdefault('since', (prev.get('cur') or {}).get('since') if (prev.get('cur') or {}).get('key') == cur['key'] else iso(NOW)[:10])
    return cur, pick


# ---------------------------------------------------------------- 新聞
def news(q, lang):
    if not q:
        return []
    if lang == 'zh':
        url = 'https://news.google.com/rss/search?' + urllib.parse.urlencode({'q': q + ' when:3d', 'hl': 'zh-TW', 'gl': 'TW', 'ceid': 'TW:zh-Hant'})
    else:
        url = 'https://news.google.com/rss/search?' + urllib.parse.urlencode({'q': q + ' when:2d', 'hl': 'en-US', 'gl': 'US', 'ceid': 'US:en'})
    try:
        root = ET.fromstring(get(url, timeout=25).encode('utf-8'))
    except Exception as e:  # noqa: BLE001
        err('新聞 %s：%s' % (lang, e))
        return []
    out, seen = [], set()
    for it in root.iter('item'):
        t = (it.findtext('title') or '').strip()
        src_el = it.find('source')
        src = (src_el.text or '').strip() if src_el is not None else ''
        su = src_el.get('url') if src_el is not None else ''
        if src and t.endswith(' - ' + src):
            t = t[: -len(src) - 3].strip()
        t = htmllib.unescape(t)
        try:
            ts = dt.datetime.strptime(it.findtext('pubDate') or '', '%a, %d %b %Y %H:%M:%S %Z').replace(tzinfo=UTC).timestamp()
        except ValueError:
            continue
        k = norm(t)[:40]
        if not t or k in seen:
            continue
        seen.add(k)
        x = {'t': t[:140], 's': src[:40], 'su': (su or '')[:80], 'u': (it.findtext('link') or '')[:400], 'ts': int(ts)}
        if news_ok(x):
            out.append(x)
    out.sort(key=lambda x: -x['ts'])
    return out


# 社群平台的貼文（Google News 偶爾會收 FB、YouTube）不算新聞；政論、選舉跟《觀戰》一樣收起來（不分黨派，名單同 pipeline.py 的 OFFTOPIC）
SOCIAL = re.compile(r'^(facebook|youtube|instagram|threads|x|twitter|tiktok|dcard)$', re.I)
SOCIAL_U = re.compile(r'(?:^|[/.])(?:facebook|youtube|instagram|threads|tiktok|x|twitter)\.(?:com|net)(?:[/:]|$)', re.I)
OFFTOPIC = re.compile(r'民眾黨|民众党|國民黨|国民党|民進黨|民进党|時代力量|立委|立法院|總統府|总统府|選舉|选举|罷免|罢免|政論|政论|柯文哲|賴清德|赖清德|侯友宜|鄭麗文|黃國昌|黄国昌')
OFFICIAL_U = re.compile(r'(?:^|[/.])(?:rockstargames|playstation|xbox|nintendo|steampowered|take2games)\.com(?:[/:]|$)', re.I)


def news_ok(x):
    return not (SOCIAL.search((x.get('s') or '').strip()) or SOCIAL_U.search(x.get('su') or '') or OFFTOPIC.search(x.get('t') or ''))


# ---------------------------------------------------------------- PTT
ENT = re.compile(r'<div class="r-ent">(.*?)<div class="mark">', re.S)


def ptt_n(s):
    s = (s or '').strip()
    if s == '爆':
        return 100
    if s.startswith('X'):
        return -100 if s == 'XX' else -10 * int(s[1:] or 1) if s[1:].isdigit() else -10
    return int(s) if s.isdigit() else 0


def ptt(boards, terms, rx):
    out, seen = [], set()
    for b in boards:
        for q in terms:
            url = 'https://www.ptt.cc/bbs/%s/search?%s' % (b, urllib.parse.urlencode({'q': q}))
            try:
                h = get(url, headers={'Cookie': 'over18=1', 'User-Agent': UA_BROWSER}, timeout=20)
            except Exception as e:  # noqa: BLE001
                err('PTT %s「%s」：%s' % (b, q, e))
                continue
            for blk in ENT.findall(h):
                m = re.search(r'<a href="(/bbs/[^"]+/M\.(\d+)\.A\.[0-9A-F]+\.html)">(.*?)</a>', blk, re.S)
                if not m:
                    continue
                href, ts, t = m.group(1), int(m.group(2)), htmllib.unescape(re.sub(r'<[^>]+>', '', m.group(3))).strip()
                if href in seen or not re.search(rx, t, re.I):
                    continue
                seen.add(href)
                n = re.search(r'<div class="nrec">(?:<span[^>]*>)?([^<]*)', blk)
                out.append({'t': t[:120], 'b': b, 'n': ptt_n(n.group(1) if n else ''), 'u': 'https://www.ptt.cc' + href, 'ts': ts})
            time.sleep(0.4)
    out.sort(key=lambda x: -x['ts'])
    return out


# ---------------------------------------------------------------- Reddit
def reddit(sub):
    if not sub:
        return {'ok': 0, 'why': '沒有對應的版', 'items': []}
    try:
        j = json.loads(get('https://www.reddit.com/r/%s/hot.json?limit=30&raw_json=1' % urllib.parse.quote(sub),
                           headers={'User-Agent': 'unpacked-storm/1.0 (personal app; GitHub Actions)', 'Accept': 'application/json'}, timeout=20, tries=1))
    except Exception as e:  # noqa: BLE001
        return {'ok': 0, 'why': str(e)[:80], 'items': []}
    items = []
    for c in ((j.get('data') or {}).get('children') or []):
        d = c.get('data') or {}
        if d.get('stickied') or d.get('over_18'):
            continue
        items.append({'t': (d.get('title') or '')[:160], 'n': int(d.get('score') or 0), 'c': int(d.get('num_comments') or 0),
                      'f': (d.get('link_flair_text') or '')[:24] or None, 'u': 'https://www.reddit.com' + (d.get('permalink') or ''),
                      'ts': int(d.get('created_utc') or 0)})
    items.sort(key=lambda x: -x['n'])
    return {'ok': 1, 'sub': sub, 'items': items[:15]}


# ---------------------------------------------------------------- 《觀戰》的 YouTube 數字
def spectate(key):
    try:
        s = json.loads(get(SPECTATE + 'storm.json?t=%d' % int(NOW // 600), timeout=25))
    except Exception as e:  # noqa: BLE001
        err('觀戰的風暴資料：%s' % e)
        return None
    if s.get('key') != key:
        log('觀戰的風暴資料還是上一款（%s），等它下一輪' % s.get('key'))
        return None
    items, ch = s.get('items') or {}, s.get('ch') or {}

    def pack(ids, n):
        out = []
        for v in ids[:n]:
            it = items.get(v)
            if not it:
                continue
            c = ch.get(it.get('c')) or {}
            out.append({k: x for k, x in {'i': v, 't': it.get('t'), 'cn': c.get('n'), 'p': it.get('p'), 'v': it.get('v'), 'cv': it.get('cv'),
                                         'l': it.get('l'), 'z': it.get('z'), 'lv': it.get('lv'), 'ne': it.get('ne')}.items() if x is not None})
        return out
    return {'at': s.get('at'), 'n24': s.get('n24') or 0, 'n72': s.get('n72') or 0, 'lv': s.get('lv') or 0, 'lc': s.get('lc') or 0, 'zl': s.get('zl') or 0,
            'live': pack(s.get('live') or [], 12), 'cz': pack(s.get('cz') or [], 16), 'top': pack(s.get('top') or [], 12),
            'lanes': {k: len(v) for k, v in (s.get('lanes') or {}).items()}}


def spectate_cands(cur_key, cur):
    """《觀戰》這兩週大家在聊的遊戲（給 App 的「換一場風暴」和排程當參考）。"""
    try:
        g = json.loads(get(SPECTATE + 'games.json?t=%d' % int(NOW // 3600), timeout=25))
    except Exception as e:  # noqa: BLE001
        err('觀戰的熱門遊戲：%s' % e)
        return []
    rx = re.compile(cur.get('rx') or '^$', re.I) if cur else None
    out = []
    for x in (g.get('games') or [])[:20]:
        name = x.get('zh') or x.get('en') or ''
        if rx and (rx.search(name) or rx.search(x.get('en') or '')):
            continue
        out.append({'zh': name, 'en': x.get('en'), 'n': x.get('n'), 'chs': x.get('chs')})
        if len(out) >= 6:
            break
    return out


# ---------------------------------------------------------------- 熱度
def f(x, top):
    return max(0.0, min(1.0, math.log10(1 + max(0, x)) / math.log10(1 + top)))


def heat(news24, lv, n24, ptt24):
    """熱度指數 0～100：新聞量 35%、直播觀看 35%、24 小時新片 15%、PTT 討論 15%（都取對數，滿分＝新聞 150 則、觀看 20 萬人、新片 150 支、PTT 60 篇）。"""
    return round(100 * (0.35 * f(news24, 150) + 0.35 * f(lv, 200000) + 0.15 * f(n24, 150) + 0.15 * f(ptt24, 60)))


def cat(h):
    return 5 if h >= 80 else 4 if h >= 62 else 3 if h >= 45 else 2 if h >= 28 else 1


# ---------------------------------------------------------------- 主程式
def main():
    global OFFLINE
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--offline')
    a = ap.parse_args()
    OFFLINE = a.offline
    D = a.data
    prev = load(os.path.join(D, 'storm.json'), {}) or {}
    cur, pick = pick_current(D, prev)
    if not cur:
        log('還沒有風暴（storm-pick.json 沒有 auto），這輪跳過')
        return
    key = cur['key']
    rx = cur.get('rx') or re.escape(cur.get('zh') or key)
    try:
        re.compile(rx)
    except re.error:
        rx = re.escape(cur.get('zh') or key)
    detail_p = os.path.join(D, 'storm', key + '.json')
    old = load(detail_p, {}) or {}

    nz = news((cur.get('news') or {}).get('zh'), 'zh')
    ne = news((cur.get('news') or {}).get('en'), 'en')
    pt = ptt(cur.get('boards') or BOARDS[:4], cur.get('ptt') or [cur.get('short') or cur.get('zh')], rx)
    rd = reddit(cur.get('reddit'))
    if not rd['ok'] and (old.get('reddit') or {}).get('ok') and NOW - (old.get('reddit') or {}).get('ts', 0) < 12 * 3600:
        rd = dict(old['reddit'], stale=1)        # 這輪被擋：12 小時內的上一份先留著
    elif rd['ok']:
        rd['ts'] = int(NOW)
    yt = spectate(key) or (old.get('yt') if (old.get('yt') or {}).get('at') else None)

    day = NOW - 86400
    news24 = sum(1 for x in nz + ne if x['ts'] > day)
    ptt24 = sum(1 for x in pt if x['ts'] > day)
    lv, lc, n24 = (yt or {}).get('lv', 0), (yt or {}).get('lc', 0), (yt or {}).get('n24', 0)
    h = heat(news24, lv, n24, ptt24)
    tl = [p for p in (old.get('tl') or []) if p[0] > (NOW - 30 * 86400) / 60][-KEEP_TL:]
    if not tl or NOW / 60 - tl[-1][0] >= 50:
        tl.append([int(NOW // 60), h, news24, lv, n24, ptt24])
    else:
        tl[-1] = [tl[-1][0], h, news24, lv, n24, ptt24]
    ago = [p for p in tl if p[0] <= NOW / 60 - 23.5 * 60]
    d24 = h - ago[-1][1] if ago else None

    det = {'v': 1, 'at': iso(NOW), 'key': key,
           'news': {'zh': nz[:30], 'en': ne[:30]},
           'off': [x for x in nz + ne if OFFICIAL_U.search(x.get('su') or '')][:10],   # 官方網域才算（purexbox.com 這種不算）
           'ptt': pt[:40], 'reddit': rd, 'yt': yt, 'tl': tl}
    wrote = save_if_changed(detail_p, det)

    # 風暴日報的最新一則標題（首頁、分頁的一句話）
    dg = load(os.path.join(D, 'storm', key + '.digest.json'), {}) or {}
    last = (dg.get('items') or [None])[0]
    hist = [x for x in (prev.get('hist') or []) if x.get('key') != key][:12]
    pc = prev.get('cur') or {}
    if pc.get('key') and pc.get('key') != key:
        hist.insert(0, {'key': pc['key'], 'zh': pc.get('zh'), 'from': pc.get('since'), 'to': iso(NOW)[:10], 'peak': prev.get('peak')})
        log('換風暴：%s → %s' % (pc.get('key'), key))
    peak = max(h, prev.get('peak') or 0) if pc.get('key') == key else h
    feats = []
    for it in (load(os.path.join(D, 'index.json'), {}) or {}).get('items') or []:
        if re.search(rx, (it.get('zh') or '') + ' ' + (it.get('en') or ''), re.I):
            feats.append({'id': it['id'], 'd': it.get('date'), 'k': 'f'})
    for it in (load(os.path.join(D, 'picks.json'), {}) or {}).get('items') or []:
        if re.search(rx, (it.get('zh') or '') + ' ' + (it.get('en') or ''), re.I):
            feats.append({'id': it['id'], 'd': it.get('date'), 'k': 'p'})
    feats.sort(key=lambda x: x.get('d') or '', reverse=True)
    summ = {'v': 1, 'at': iso(NOW),
            'cur': {k: cur.get(k) for k in ('key', 'zh', 'en', 'short', 'since', 'rel', 'plat', 'steam', 'img', 'yt_id', 'pin', 'why', 'rx', 'news', 'yt', 'ptt', 'boards', 'reddit') if cur.get(k) is not None},
            's': {'heat': h, 'cat': cat(h), 'd24': d24, 'news24': news24, 'lv': lv, 'lc': lc, 'n24': n24, 'ptt24': ptt24},
            'peak': peak, 'feats': feats[:6], 'hist': hist,
            'head': {'t': last.get('title'), 'at': last.get('at'), 'tldr': (last.get('tldr') or '')[:120]} if last else None,
            'cands': spectate_cands(key, cur), 'errs': ERRS[-12:]}
    wrote2 = save_if_changed(os.path.join(D, 'storm.json'), summ, ignore=('at', 'errs'))
    log('風暴眼：%s（%s）熱度 %d・CAT %d｜新聞 %d、直播 %d 台 %d 人、24 小時新片 %d、PTT %d｜Reddit %s｜寫了 %s' % (
        cur.get('zh'), '指定' if cur.get('pin') else '自動', h, cat(h), news24, lc, lv, n24, ptt24,
        '有' if rd.get('ok') else '沒有（%s）' % rd.get('why', ''), '、'.join(x for x, w in (('明細', wrote), ('摘要', wrote2)) if w) or '沒有變動'))


if __name__ == '__main__':
    try:
        main()
    except Exception as e:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        print('風暴眼這輪失敗：%s' % e)
        sys.exit(0)        # 不擋住整條管線
