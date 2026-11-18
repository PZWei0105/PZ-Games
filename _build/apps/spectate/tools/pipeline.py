#!/usr/bin/env python3
"""觀戰 SPECTATE — 轉播資料管線（GitHub Actions `.github/workflows/spectate-feed.yml` 每 20 分鐘跑一次）

做的事：
  1. 收轉發站（ntfy.sh）上 App 送來的訂閱／取消／封鎖／跳過／新增頻道／稍後觀看 → 寫進 me.json（main 分支）
  2. 解析頻道（@代號 → 頻道 ID、名稱、頭像）→ roster.json（main 分支）
  3. 抓每個頻道的 RSS（官方提供、不用金鑰）：新片、觀看數
  4. 判斷 Shorts（問 youtube.com/shorts/<id> 是不是直接打得開）、簡體標題轉繁體、節目類型、遊戲名稱（用 Steam 對成同一款）
  5. 有 YouTube 金鑰（Actions 密碼 YT_KEY）時：片長、直播中／即將直播、中文標題、頻道訂閱數，每天一次全網找新頻道（新秀）
  6. 輸出 feed.json、games.json、discover.json、status.json、cache.json 到 --out（工作流程把它推成 spectate-data 分支，只留最新一版）

本機跑（沙盒連不到 YouTube，只能用假資料測）：
  python3 _build/apps/spectate/tools/pipeline.py --repo . --prev /tmp/prev --out /tmp/out [--offline fixtures/]
"""
import argparse
import concurrent.futures as cf
import datetime as dt
import html as htmlmod
import http.client
import json
import math
import os
import random
import re
import statistics
import sys
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ytextract as X  # noqa: E402

TOPIC = 'pz-spectate-e4431fca8fc4498df14a'
RELAY = 'https://ntfy.sh/' + TOPIC
TW = dt.timezone(dt.timedelta(hours=8))
UA_BROWSER = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
              'Chrome/131.0.0.0 Safari/537.36')
YT_HEADERS = {'User-Agent': UA_BROWSER, 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.6',
              'Cookie': 'CONSENT=YES+cb; SOCS=CAI'}
NS = {'a': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015',
      'm': 'http://search.yahoo.com/mrss/'}
CH_RE = re.compile(r'^UC[A-Za-z0-9_-]{22}$')
VID_RE = re.compile(r'^[A-Za-z0-9_-]{11}$')
EV_RE = re.compile(r'^d[a-z0-9]{3,10}-\d{1,7}$')

KEEP_DAYS = 30            # 影片留幾天
KEEP_PER_CH = 40          # 每個頻道最多留幾支
SHORTS_PER_RUN = 320      # 每次最多查幾支是不是 Shorts
STEAM_PER_RUN = 45        # 每次最多查幾次 Steam
NOT_GAMING_CATS = {'10', '15', '17', '19', '26', '29'}   # 音樂、寵物、運動、旅遊、生活風格、公益

NOW = time.time()
LOG = []
ERRS = []
UNITS = [0]   # 這次用掉的 YouTube API 額度


def log(*a):
    s = ' '.join(str(x) for x in a)
    LOG.append(s)
    print(s, flush=True)


def err(s):
    ERRS.append(s[:300])
    log('！', s)


def iso_epoch(s):
    if not s:
        return None
    try:
        return int(dt.datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp())
    except ValueError:
        return None


def load(p, default):
    try:
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def dump(p, obj, pretty=False):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        if pretty:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        else:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    os.replace(tmp, p)


# ================================================================ 連網

OFFLINE = None   # 測試用：資料夾裡放假的回應


def http_get(url, headers=None, timeout=25, tries=3, json_out=False):
    """GET，遇到 429／5xx／網路錯誤會重試。回傳 (status, body bytes)。"""
    if OFFLINE is not None:
        return offline_get(url, json_out)
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=headers or {'User-Agent': UA_BROWSER})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                body = r.read()
                return r.status, (json.loads(body) if json_out else body)
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (400, 401, 403, 404, 410):
                body = e.read()
                return e.code, (safe_json(body) if json_out else body)
        except (urllib.error.URLError, TimeoutError, ConnectionError, http.client.HTTPException, OSError) as e:
            last = e
        time.sleep(1.2 * (i + 1) + random.random())
    raise RuntimeError('%s: %s' % (url[:90], last))


def safe_json(b):
    try:
        return json.loads(b)
    except ValueError:
        return None


def offline_get(url, json_out):
    """--offline：用網址的雜湊找假檔案（測試 RSS 解析、事件處理用）。"""
    import hashlib
    key = hashlib.sha1(url.encode()).hexdigest()[:16]
    for name in (key, re.sub(r'[^a-z0-9]+', '_', url.lower())[-80:]):
        p = os.path.join(OFFLINE, name)
        if os.path.exists(p):
            with open(p, 'rb') as f:
                b = f.read()
            return 200, (json.loads(b) if json_out else b)
    m = re.search(r'channel_id=(UC[\w-]{22})', url)
    if m and os.path.exists(os.path.join(OFFLINE, m.group(1) + '.xml')):
        with open(os.path.join(OFFLINE, m.group(1) + '.xml'), 'rb') as f:
            return 200, f.read()
    return 404, (None if json_out else b'')


def shorts_status(vid):
    """True＝是 Shorts、False＝一般影片、None＝不確定。youtube.com/shorts/<id> 直接打得開就是 Shorts。"""
    if OFFLINE is not None:
        return None
    for method in ('HEAD', 'GET'):
        try:
            c = http.client.HTTPSConnection('www.youtube.com', timeout=15)
            c.request(method, '/shorts/' + vid, headers=YT_HEADERS)
            r = c.getresponse()
            st = r.status
            c.close()
            if st == 200:
                return True
            if st in (301, 302, 303, 307, 308):
                return False
            if st == 405 and method == 'HEAD':
                continue
            return None
        except (OSError, http.client.HTTPException):
            return None
    return None


# ================================================================ YouTube Data API（有金鑰才用）

KEY = os.environ.get('YT_KEY', '').strip() or None
COST = {'search': 100}


def api(path, **params):
    if not KEY:
        return None
    params['key'] = KEY
    url = 'https://www.googleapis.com/youtube/v3/%s?%s' % (path, urllib.parse.urlencode(params))
    UNITS[0] += COST.get(path, 1)
    try:
        st, j = http_get(url, headers={'User-Agent': 'pz-spectate'}, json_out=True)
    except RuntimeError as e:
        err('API %s：%s' % (path, e))
        return None
    if st != 200 or not isinstance(j, dict):
        reason = ''
        try:
            reason = j['error']['errors'][0]['reason']
        except (TypeError, KeyError, IndexError):
            pass
        err('API %s 回 %s %s' % (path, st, reason))
        if reason in ('quotaExceeded', 'keyInvalid', 'accessNotConfigured', 'forbidden'):
            raise QuotaStop(reason)
        return None
    return j


class QuotaStop(Exception):
    pass


# ================================================================ 頻道解析

def page_meta(path):
    """抓 youtube.com 上的頻道頁，讀出頻道 ID、名稱、頭像、簡介（不用金鑰）。"""
    url = 'https://www.youtube.com' + path
    st, body = http_get(url, headers=YT_HEADERS)
    if st != 200 or not body:
        return None
    h = body.decode('utf-8', 'replace')
    cid = None
    for rx in (r'<link rel="canonical" href="https://www\.youtube\.com/channel/(UC[\w-]{22})"',
               r'"externalId":"(UC[\w-]{22})"', r'"channelId":"(UC[\w-]{22})"',
               r'<meta itemprop="identifier" content="(UC[\w-]{22})"'):
        m = re.search(rx, h)
        if m:
            cid = m.group(1)
            break
    if not cid:
        return None

    def meta(prop):
        m = re.search(r'<meta property="og:%s" content="([^"]*)"' % prop, h)
        return htmlmod.unescape(m.group(1)) if m else None
    is_watch = path.startswith('/watch') or path.startswith('/shorts/')
    out = {'id': cid}
    if not is_watch:
        out['n'] = meta('title')
        out['a'] = small_avatar(meta('image'))
        out['ds'] = (meta('description') or '')[:200]
        m = re.search(r'"canonicalBaseUrl":"/(@[^"]+)"', h) or re.search(r'"vanityChannelUrl":"https?://www\.youtube\.com/(@[^"]+)"', h)
        if m:
            out['h'] = urllib.parse.unquote(m.group(1))
    return out


def small_avatar(u):
    if not u:
        return None
    return re.sub(r'=s\d+-', '=s176-', u) if '=s' in u else u


def api_channels(ids=None, handle=None):
    """用 API 讀頻道：名稱、頭像、訂閱數、影片數、國家。"""
    out = {}
    if handle:
        j = api('channels', part='snippet,statistics', forHandle=handle)
        items = (j or {}).get('items') or []
    else:
        items = []
        ids = list(ids or [])
        for i in range(0, len(ids), 50):
            j = api('channels', part='snippet,statistics', id=','.join(ids[i:i + 50]), maxResults=50)
            items += (j or {}).get('items') or []
    for it in items:
        sn, stt = it.get('snippet') or {}, it.get('statistics') or {}
        th = (sn.get('thumbnails') or {})
        av = (th.get('medium') or th.get('default') or {}).get('url')
        out[it['id']] = {
            'id': it['id'], 'n': sn.get('title'), 'a': av, 'ds': (sn.get('description') or '')[:200],
            'h': sn.get('customUrl'), 'country': sn.get('country'),
            'subs': None if stt.get('hiddenSubscriberCount') else int(stt.get('subscriberCount') or 0),
            'vids': int(stt.get('videoCount') or 0), 'ts': int(NOW),
        }
    return out


def resolve_query(q):
    """把痞子葳貼上的東西（網址、@代號、頻道 ID、影片網址）變成頻道。回傳 dict 或 None。"""
    q = (q or '').strip()
    if not q:
        return None
    q = urllib.parse.unquote(q)
    m = re.search(r'(UC[A-Za-z0-9_-]{22})', q)
    if m:
        cid = m.group(1)
        info = api_channels([cid]).get(cid) if KEY else None
        return info or page_meta('/channel/' + cid) or {'id': cid}
    m = re.search(r'(?:youtube\.com/)?(@[^/?#\s]+)', q)
    if m:
        h = m.group(1)
        if KEY:
            got = api_channels(handle=h)
            if got:
                return next(iter(got.values()))
        return page_meta('/' + urllib.parse.quote(h, safe='@'))
    m = re.search(r'(?:v=|youtu\.be/|/shorts/|/live/)([A-Za-z0-9_-]{11})', q)
    if m:
        vid = m.group(1)
        if KEY:
            j = api('videos', part='snippet', id=vid)
            its = (j or {}).get('items') or []
            if its:
                cid = its[0]['snippet']['channelId']
                return api_channels([cid]).get(cid) or {'id': cid}
        meta = page_meta('/watch?v=' + vid)
        if meta:
            return page_meta('/channel/' + meta['id']) or meta
        return None
    m = re.search(r'youtube\.com/(c|user)/([^/?#\s]+)', q)
    if m:
        return page_meta('/%s/%s' % (m.group(1), urllib.parse.quote(m.group(2))))
    if re.fullmatch(r'[^\s/]{2,40}', q):
        return resolve_query('@' + q.lstrip('@'))
    return None


# ================================================================ RSS

def fetch_rss(cid):
    url = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + cid
    st, body = http_get(url, headers={'User-Agent': 'Mozilla/5.0 pz-spectate', 'Accept-Language': 'zh-TW'})
    if st != 200 or not body:
        raise RuntimeError('RSS %s' % st)
    root = ET.fromstring(body)
    name = root.findtext('a:title', namespaces=NS)
    items = []
    for e in root.findall('a:entry', NS):
        vid = e.findtext('yt:videoId', namespaces=NS)
        if not vid or not VID_RE.match(vid):
            continue
        link = e.find('a:link', NS)
        href = link.get('href') if link is not None else ''
        g = e.find('m:group', NS)
        desc, views, likes = '', None, None
        if g is not None:
            desc = g.findtext('m:description', default='', namespaces=NS) or ''
            stt = g.find('m:community/m:statistics', NS)
            if stt is not None and stt.get('views', '').isdigit():
                views = int(stt.get('views'))
            star = g.find('m:community/m:starRating', NS)
            if star is not None and star.get('count', '').isdigit():
                likes = int(star.get('count'))
        items.append({
            'i': vid, 'c': cid, 't': (e.findtext('a:title', namespaces=NS) or '').strip(),
            'p': iso_epoch(e.findtext('a:published', namespaces=NS)), 'v': views, 'lk': likes,
            'ds': re.sub(r'\s+', ' ', desc)[:240], 'short_link': '/shorts/' in href,
        })
    return name, items


# ================================================================ 轉發站收件 → me.json

def S(n):
    return lambda v: v.strip()[:n] if isinstance(v, str) and v.strip() else None


FIELDS = {
    'sub': {'ch': lambda v: v if isinstance(v, str) and CH_RE.match(v) else None, 'n': S(80), 'src': S(12)},
    'unsub': {'ch': lambda v: v if isinstance(v, str) and CH_RE.match(v) else None},
    'block': {'ch': lambda v: v if isinstance(v, str) and CH_RE.match(v) else None, 'n': S(80)},
    'unblock': {'ch': lambda v: v if isinstance(v, str) and CH_RE.match(v) else None},
    'pass': {'ch': lambda v: v if isinstance(v, str) and CH_RE.match(v) else None},
    'unpass': {'ch': lambda v: v if isinstance(v, str) and CH_RE.match(v) else None},
    'add': {'q': S(300)},
    'later': {'v': lambda v: v if isinstance(v, str) and VID_RE.match(v) else None, 'on': lambda v: bool(v) if isinstance(v, bool) else None},
    'ping': {'note': S(40)},
}
NEED = {'sub': 'ch', 'unsub': 'ch', 'block': 'ch', 'unblock': 'ch', 'pass': 'ch', 'unpass': 'ch', 'add': 'q', 'later': 'v'}


def clean_event(ev, dev):
    if not isinstance(ev, dict):
        return None
    typ, eid = ev.get('type'), ev.get('id')
    if typ not in FIELDS or not isinstance(eid, str) or not EV_RE.match(eid):
        return None
    t = ev.get('t')
    out = {'id': eid, 'type': typ, 't': int(t) if isinstance(t, (int, float)) and 1.6e12 < t < 4e12 else int(NOW * 1000), 'dev': dev}
    for k, f in FIELDS[typ].items():
        if k in ev:
            v = f(ev.get(k))
            if v is not None:
                out[k] = v
    if typ in NEED and NEED[typ] not in out:
        return None
    return out


def collect_relay(me):
    """從轉發站拿 App 送來的事件。轉發站只留約 12 小時。"""
    since = me.get('cursor') or '12h'
    try:
        st, body = http_get(RELAY + '/json?poll=1&since=' + urllib.parse.quote(str(since)),
                            headers={'User-Agent': 'pz-spectate-inbox'}, timeout=40)
    except RuntimeError as e:
        err('轉發站連不上：%s' % e)
        return []
    if st != 200:
        err('轉發站回 %s' % st)
        return []
    evs, last_t = [], None
    for line in (body or b'').decode('utf-8', 'replace').splitlines():
        try:
            m = json.loads(line)
        except ValueError:
            continue
        if m.get('event') != 'message':
            continue
        last_t = max(last_t or 0, int(m.get('time') or 0))
        try:
            wrap = json.loads(m.get('message') or '')
        except ValueError:
            continue
        if not isinstance(wrap, dict) or wrap.get('v') != 1:
            continue
        dev = wrap.get('dev') if isinstance(wrap.get('dev'), str) and re.fullmatch(r'd[a-z0-9]{3,10}', wrap.get('dev')) else None
        if not dev:
            continue
        for ev in (wrap.get('evs') or [wrap.get('ev')]):
            c = clean_event(ev, dev)
            if c and c['id'].startswith(dev + '-'):
                evs.append(c)
    if last_t:
        me['cursor'] = last_t
    return evs


def apply_events(me, evs):
    seen = set(me.get('seen') or [])
    fresh = [e for e in evs if e['id'] not in seen]
    fresh.sort(key=lambda e: (e['t'], e['id']))
    changed = False
    for e in fresh:
        typ, t = e['type'], e['t']
        if typ == 'sub':
            me['subs'][e['ch']] = {'t': t, 'n': e.get('n'), 'src': e.get('src') or 'app'}
            me['blocks'].pop(e['ch'], None)
            me['passes'].pop(e['ch'], None)
        elif typ == 'unsub':
            me['subs'].pop(e['ch'], None)
        elif typ == 'block':
            me['blocks'][e['ch']] = t
            me['subs'].pop(e['ch'], None)
        elif typ == 'unblock':
            me['blocks'].pop(e['ch'], None)
        elif typ == 'pass':
            me['passes'][e['ch']] = t
        elif typ == 'unpass':
            me['passes'].pop(e['ch'], None)
        elif typ == 'later':
            if e.get('on') is False:
                me['later'].pop(e['v'], None)
            else:
                me['later'][e['v']] = t
        elif typ == 'add':
            me['adds'].append({'id': e['id'], 'q': e['q'], 't': t, 'st': 'wait'})
        me['seen'].append(e['id'])
        me['log'].append({k: e[k] for k in ('id', 'type', 't', 'ch', 'v', 'q') if k in e})
        changed = True
    me['seen'] = me['seen'][-1500:]
    me['log'] = me['log'][-300:]
    me['adds'] = me['adds'][-60:]
    while len(me['later']) > 300:
        me['later'].pop(min(me['later'], key=me['later'].get))
    return changed, len(fresh)


def new_me():
    return {'v': 1, 'at': None, 'subs': {}, 'blocks': {}, 'passes': {}, 'later': {}, 'adds': [], 'seen': [], 'log': [], 'cursor': None}


# ================================================================ Steam：把遊戲名稱對成同一款

STEAM_LEFT = [STEAM_PER_RUN]


def steam_search(term, lang):
    if STEAM_LEFT[0] <= 0:
        return 'budget'
    STEAM_LEFT[0] -= 1
    url = 'https://store.steampowered.com/api/storesearch/?' + urllib.parse.urlencode({'term': term, 'l': lang, 'cc': 'TW'})
    try:
        st, j = http_get(url, headers={'User-Agent': 'pz-spectate'}, json_out=True, tries=2)
    except RuntimeError as e:
        err('Steam 搜尋：%s' % e)
        return 'budget'
    time.sleep(0.35)
    if st != 200 or not isinstance(j, dict):
        return 'budget'
    return [it for it in (j.get('items') or []) if it.get('type') == 'app']


def steam_name(appid, lang):
    if STEAM_LEFT[0] <= 0:
        return None
    STEAM_LEFT[0] -= 1
    url = 'https://store.steampowered.com/api/appdetails?' + urllib.parse.urlencode({'appids': appid, 'l': lang, 'cc': 'TW', 'filters': 'basic'})
    try:
        st, j = http_get(url, headers={'User-Agent': 'pz-spectate'}, json_out=True, tries=2)
    except RuntimeError:
        return None
    time.sleep(0.35)
    try:
        d = j[str(appid)]['data']
        return {'n': d.get('name'), 'img': d.get('header_image')}
    except (TypeError, KeyError):
        return None


def clean_title(n):
    """Steam 上有些中文名自己帶書名號或空白：顯示時拿掉。"""
    if not n:
        return n
    n = n.strip()
    if n.startswith('《') and n.endswith('》'):
        n = n[1:-1].strip()
    return n


def steam_match(name, lang, cache):
    """名稱 → {'id': appid, 'zh': 繁中名, 'en': 英文名, 'img': 橫幅} 或 None（查不到）。結果記在 cache['steam']。"""
    k = X.norm(name)
    if not k or len(k) < 2:
        return None
    hit = cache['steam'].get(k)
    if hit is not None and (hit.get('id') or NOW - hit.get('ts', 0) < 14 * 86400):
        return hit if hit.get('id') else None
    langs = ['tchinese', 'schinese'] if lang == 'zh' else (['japanese', 'english'] if lang == 'ja' else ['english'])
    found = None
    for l in langs:
        items = steam_search(name, l)
        if items == 'budget':
            return None
        for it in items[:6]:
            if X.similar(it.get('name') or '', name):
                found = (it['id'], it.get('name'), l)
                break
        if found:
            break
    if not found:
        cache['steam'][k] = {'id': None, 'ts': int(NOW)}
        return None
    appid, nm, l = found
    rec = {'id': appid, 'ts': int(NOW), 'img': 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/%d/header.jpg' % appid}
    g = cache['games'].get('s%d' % appid) or {}
    if l == 'tchinese':
        rec['zh'] = clean_title(nm)
    elif l == 'english':
        rec['en'] = clean_title(nm)
    if not g.get('imgok'):
        # 新上架的遊戲只有帶雜湊的圖片網址：用 appdetails 拿正確的橫幅，順便拿繁中名稱
        d = steam_name(appid, 'tchinese')
        if d:
            if d.get('n') and not rec.get('zh'):
                rec['zh'] = clean_title(d['n'])
            if d.get('img'):
                rec['img'] = d['img']
                g['imgok'] = 1
    if not (rec.get('en') or g.get('en')):
        d = steam_name(appid, 'english')
        if d and d.get('n'):
            rec['en'] = clean_title(d['n'])
    cache['steam'][k] = rec
    g.update({kk: vv for kk, vv in rec.items() if kk in ('zh', 'en', 'img') and vv})
    g['id'] = appid
    cache['games']['s%d' % appid] = g
    return rec


# ================================================================ 主流程

def main():
    global OFFLINE
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', required=True)
    ap.add_argument('--prev', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--offline')
    ap.add_argument('--max-rss', type=int, default=0, help='測試用：最多抓幾個頻道')
    args = ap.parse_args()
    OFFLINE = args.offline
    t0 = time.time()
    data_dir = os.path.join(args.repo, 'apps', 'spectate', 'data')
    seed = load(os.path.join(data_dir, 'channels.json'), {'channels': []})['channels']
    roster = load(os.path.join(data_dir, 'roster.json'), {'channels': {}})
    roster.setdefault('channels', {})
    roster.pop('tries', None)
    me = load(os.path.join(data_dir, 'me.json'), None) or new_me()
    for k, v in new_me().items():
        me.setdefault(k, v)
    cache = load(os.path.join(args.prev, 'cache.json'), {})
    for k in ('videos', 'steam', 'games', 'chstat', 'disc', 'tries'):
        cache.setdefault(k, {})
    prev_feed_ok = os.path.exists(os.path.join(args.prev, 'cache.json'))
    log('上一版資料：', '有' if prev_feed_ok else '沒有（第一次跑）', '｜金鑰：', '有' if KEY else '沒有')
    roster_before = json.dumps(roster, sort_keys=True, ensure_ascii=False)
    me_before = json.dumps(me, sort_keys=True, ensure_ascii=False)
    stat = {'key': bool(KEY)}

    # ---- 1. 轉發站
    evs = collect_relay(me)
    changed, n_new = apply_events(me, evs)
    stat['events'] = n_new
    log('轉發站：收到 %d 筆、新的 %d 筆' % (len(evs), n_new))

    try:
        # ---- 2. 頻道解析
        resolve_roster(seed, roster, me, cache)
        # ---- 3. RSS
        pool = build_pool(roster, me, cache, args.max_rss)
        rss_ok, rss_fail = fetch_all_rss(pool, roster, cache)
        stat['rss_ok'], stat['rss_fail'] = rss_ok, rss_fail[:30]
        # ---- 4. 整理影片
        prune(cache, roster, me)
        check_shorts(cache)
        if KEY:
            enrich_api(cache)
            refresh_channel_stats(roster, cache)
        classify(cache, roster)
        repair_images(cache, {v.get('g') for v in cache['videos'].values() if v.get('g') and NOW - (v.get('p') or 0) < 14 * 86400})
        games = build_games(cache, roster)
        # ---- 5. 新秀（有金鑰、每天一次）
        if KEY:
            discover(cache, roster, me, games)
    except QuotaStop as e:
        err('YouTube 金鑰暫停使用（%s）：這次只用 RSS' % e)
        classify(cache, roster)
        games = build_games(cache, roster)

    # ---- 6. 輸出
    out = args.out
    feed = build_feed(cache, roster, me)
    dump(os.path.join(out, 'feed.json'), feed)
    dump(os.path.join(out, 'games.json'), {'v': 1, 'at': stamp(), 'games': games})
    dump(os.path.join(out, 'discover.json'), build_discover(cache))
    dump(os.path.join(out, 'cache.json'), cache)
    quiet = []
    for cid, r in roster['channels'].items():
        cs = cache['chstat'].get(cid) or {}
        if r.get('seed') and cs.get('rss'):
            last = cs.get('last')
            if not last or NOW - last > 30 * 86400:
                quiet.append('%s（%s）' % (r.get('seed'), '沒有影片' if not last else '%d 天沒更新' % ((NOW - last) // 86400)))
    stat['quiet'] = quiet
    stat['unresolved'] = sorted(cache['tries'])
    stat.update({'v': 1, 'at': stamp(), 'run_s': round(time.time() - t0, 1), 'videos': len(feed['items']),
                 'channels': len(feed['ch']), 'units': UNITS[0], 'steam_left': STEAM_LEFT[0], 'errors': ERRS[-40:], 'log': LOG[-160:]})
    dump(os.path.join(out, 'status.json'), stat, pretty=True)
    with open(os.path.join(out, 'README.md'), 'w', encoding='utf-8') as f:
        f.write('# 觀戰 SPECTATE 轉播資料\n\n這個分支由 GitHub Actions `spectate-feed` 自動產生、每次只留最新一版（強制推送）。'
                'App 從 raw.githubusercontent.com 讀。說明見 main 分支的 `_build/apps/spectate/README.md`。\n')

    me['at'] = me.get('at')
    if json.dumps(me, sort_keys=True, ensure_ascii=False) != me_before:
        me['at'] = stamp()
        dump(os.path.join(data_dir, 'me.json'), me, pretty=True)
        log('me.json 有變動')
    if json.dumps(roster, sort_keys=True, ensure_ascii=False) != roster_before:
        roster['at'] = stamp()
        dump(os.path.join(data_dir, 'roster.json'), roster, pretty=True)
        log('roster.json 有變動')
    log('完成：%d 支影片、%d 個頻道、%.1f 秒、API %d 點' % (len(feed['items']), len(feed['ch']), time.time() - t0, UNITS[0]))


def stamp():
    return dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def resolve_roster(seed, roster, me, cache):
    """精選名單、訂閱、新增的頻道，都解析成頻道 ID ＋名稱＋頭像。"""
    chans = roster['channels']
    # 名單上拿掉的頻道：不再算精選（訂閱的照留）
    names = {s['name'] for s in seed}
    by_id = {s['name']: s['id'] for s in seed if s.get('id')}
    for cid, r in list(chans.items()):
        if r.get('seed') and (r['seed'] not in names or (r['seed'] in by_id and by_id[r['seed']] != cid)):
            log('精選名單拿掉：%s（%s）' % (r['seed'], r.get('n')))
            r.pop('seed', None)
            if cid not in me['subs']:
                chans.pop(cid)
    # 精選名單
    want = []
    for s in seed:
        key = s['name']
        if s.get('id') and CH_RE.match(s['id']):
            cid = s['id']
            rec = chans.get(cid) or {}
            rec.update({'seed': key, 'l': s.get('lang'), 'k': s.get('kind'), 'tags': s.get('tags') or []})
            chans[cid] = rec
            continue
        done = next((cid for cid, r in chans.items() if r.get('seed') == key), None)
        if done:
            r = chans[done]
            r.update({'l': s.get('lang'), 'k': s.get('kind'), 'tags': s.get('tags') or []})
            continue
        tr = cache['tries'].get(key) or {}
        if NOW - tr.get('ts', 0) < 20 * 3600 and tr.get('fail'):
            continue      # 一天試一次
        want.append(s)
    random.shuffle(want)

    def try_seed(s):
        got, tried = None, []
        for h in s.get('try') or []:
            tried.append(h)
            try:
                if KEY:
                    r = api_channels(handle=h)
                    got = next(iter(r.values())) if r else None
                else:
                    got = page_meta('/' + urllib.parse.quote(h, safe='@'))
            except QuotaStop:
                raise
            except RuntimeError as e:
                err('解析 %s：%s' % (h, e))
                got = None
            if got:
                got.setdefault('h', h)
                break
        return s, got, tried
    with cf.ThreadPoolExecutor(max_workers=1 if KEY else 6) as ex:
        results = list(ex.map(try_seed, want[:45]))
    for s, got, tried in results:
        key = s['name']
        if not got:
            cache['tries'][key] = {'ts': int(NOW), 'fail': tried}
            log('找不到頻道：%s（試了 %s）' % (key, '、'.join(tried)))
            continue
        cid = got['id']
        rec = chans.get(cid) or {}
        if rec.get('seed') and rec.get('seed') != key:
            log('重複：%s 和 %s 是同一個頻道 %s' % (key, rec['seed'], cid))
            continue
        rec.update({k: v for k, v in got.items() if k != 'id' and v is not None})
        rec.update({'seed': key, 'l': s.get('lang'), 'k': s.get('kind'), 'tags': s.get('tags') or [], 'got': int(NOW)})
        chans[cid] = rec
        cache['tries'].pop(key, None)
        log('解析：%s → %s「%s」' % (key, cid, rec.get('n')))
    # 痞子葳自己訂的、新增的
    for cid, s in me['subs'].items():
        rec = chans.setdefault(cid, {})
        rec.setdefault('src', s.get('src') or 'sub')
        if s.get('n') and not rec.get('n'):
            rec['n'] = s['n']
    for a in me['adds']:
        if a.get('st') != 'wait':
            continue
        try:
            got = resolve_query(a['q'])
        except QuotaStop:
            raise
        except RuntimeError as e:
            got = None
            err('新增頻道 %s：%s' % (a['q'][:40], e))
        if got and got.get('id'):
            cid = got['id']
            rec = chans.setdefault(cid, {})
            rec.update({k: v for k, v in got.items() if k != 'id' and v is not None})
            rec.setdefault('src', 'add')
            a.update({'st': 'ok', 'ch': cid, 'n': rec.get('n')})
            if cid not in me['subs']:
                me['subs'][cid] = {'t': a['t'], 'n': rec.get('n'), 'src': 'add'}
            log('新增頻道：%s → %s' % (a['q'][:40], rec.get('n')))
        else:
            a.update({'st': 'fail', 'why': '找不到這個頻道'})
    # 缺頭像的補一下（不用金鑰時一次最多 60 個）
    miss = [cid for cid, r in chans.items() if not r.get('a') and not r.get('noa')]
    if miss:
        if KEY:
            got = api_channels(miss)
            for cid, g in got.items():
                chans[cid].update({k: v for k, v in g.items() if k != 'id' and v is not None})
        else:
            def meta(cid):
                try:
                    return cid, page_meta('/channel/' + cid)
                except RuntimeError:
                    return cid, None
            with cf.ThreadPoolExecutor(max_workers=6) as ex:
                for cid, g in ex.map(meta, miss[:60]):
                    if g:
                        keep_n = chans[cid].get('n')
                        chans[cid].update({k: v for k, v in g.items() if k != 'id' and v is not None})
                        if keep_n and chans[cid].get('seed'):
                            chans[cid]['n'] = g.get('n') or keep_n
                    else:
                        chans[cid]['noa'] = 1


def build_pool(roster, me, cache, max_rss):
    """這次要抓 RSS 的頻道：精選＋訂閱＋這兩週的新秀候選；封鎖的不抓。"""
    blocks = set(me['blocks'])
    pool = []
    for cid, r in roster['channels'].items():
        if cid in blocks:
            continue
        if r.get('seed') or cid in me['subs'] or r.get('src') in ('add',):
            pool.append(cid)
    for p in (cache['disc'].get('picks') or []):
        if p['c'] not in blocks and p['c'] not in pool and NOW - p.get('ts', 0) < 15 * 86400:
            pool.append(p['c'])
    if max_rss:
        pool = pool[:max_rss]
    return pool


def fetch_all_rss(pool, roster, cache):
    vids = cache['videos']
    ok, fail = 0, []

    def one(cid):
        return cid, fetch_rss(cid)
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        futs = [ex.submit(one, cid) for cid in pool]
        for fu in cf.as_completed(futs):
            try:
                cid, (name, items) = fu.result()
            except Exception as e:   # noqa: BLE001
                fail.append(str(e)[:80])
                continue
            ok += 1
            rec = roster['channels'].setdefault(cid, {})
            if name and not rec.get('n'):
                rec['n'] = name
            cs = cache['chstat'].setdefault(cid, {})
            cs['rss'] = int(NOW)
            cs['rssn'] = len(items)
            ps = [it['p'] for it in items if it.get('p')]
            cs['last'] = max(ps) if ps else cs.get('last')
            for it in items:
                old = vids.get(it['i'])
                if old:
                    if it.get('v') is not None:
                        old['v'] = it['v']
                    if it.get('lk') is not None:
                        old['lk'] = it['lk']
                    if it['t'] and it['t'] != old.get('t0'):
                        old['t0'] = it['t']
                        old.pop('cls', None)      # 標題改了，重新判斷
                    continue
                it['first'] = int(NOW)
                it['t0'] = it['t']
                if it.pop('short_link', False):
                    it['s'] = 1
                vids[it['i']] = it
    if fail:
        log('RSS 失敗 %d 個：%s' % (len(fail), '；'.join(fail[:5])))
    log('RSS：成功 %d／%d 個頻道，影片庫 %d 支' % (ok, len(pool), len(vids)))
    return ok, fail


def prune(cache, roster, me):
    vids = cache['videos']
    later = set(me['later'])
    pool = set(roster['channels']) | {p['c'] for p in cache['disc'].get('picks') or []}
    keep_days = KEEP_DAYS * 86400
    by_ch = {}
    newest = {}
    for v in vids.values():
        newest.setdefault(v['c'], []).append(v.get('p') or 0)
    keep3 = {c: sorted(ps, reverse=True)[:3] for c, ps in newest.items()}
    for vid, v in list(vids.items()):
        if vid in later:
            continue
        p = v.get('p') or v.get('first') or 0
        recent3 = p in keep3.get(v['c'], ()) and NOW - p < 180 * 86400
        if (NOW - p > keep_days and not recent3) or v['c'] not in pool:
            del vids[vid]
            continue
        by_ch.setdefault(v['c'], []).append(v)
    for cid, lst in by_ch.items():
        if len(lst) > KEEP_PER_CH:
            lst.sort(key=lambda v: v.get('p') or 0, reverse=True)
            for v in lst[KEEP_PER_CH:]:
                if v['i'] not in later:
                    vids.pop(v['i'], None)


def check_shorts(cache):
    todo = [v for v in cache['videos'].values() if 's' not in v]
    for v in todo:
        if re.search(r'#shorts?\b', (v.get('t0') or '') + ' ' + (v.get('ds') or ''), re.I):
            v['s'] = 1
    todo = [v for v in todo if 's' not in v]
    todo.sort(key=lambda v: v.get('p') or 0, reverse=True)
    todo = todo[:SHORTS_PER_RUN]
    if not todo:
        return
    n = [0, 0]
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        for v, r in zip(todo, ex.map(lambda v: shorts_status(v['i']), todo)):
            if r is None:
                continue
            v['s'] = 1 if r else 0
            n[0 if r else 1] += 1
    log('Shorts 檢查：%d 支，其中 Shorts %d 支' % (len(todo), n[0]))


def enrich_api(cache):
    """有金鑰：片長、直播狀態、分類、標籤、中文標題、觀看數。"""
    vids = cache['videos']
    need = []
    for v in vids.values():
        p = v.get('p') or 0
        if 'en' not in v:
            need.append(v)
        elif v.get('lv') in ('live', 'upcoming'):
            need.append(v)
        elif NOW - p < 6 * 3600 and NOW - v.get('en', 0) > 1100:
            need.append(v)
        elif NOW - v.get('en', 0) > 3 * 86400 and NOW - p < 10 * 86400:
            need.append(v)        # 觀看數三天更新一次
    need.sort(key=lambda v: (v.get('lv') not in ('live', 'upcoming'), -(v.get('p') or 0)))
    need = need[:1000]
    n = 0
    for i in range(0, len(need), 50):
        chunk = need[i:i + 50]
        j = api('videos', part='snippet,contentDetails,liveStreamingDetails,statistics', id=','.join(v['i'] for v in chunk), hl='zh-TW', maxResults=50)
        if not j:
            continue
        got = {it['id']: it for it in j.get('items') or []}
        for v in chunk:
            it = got.get(v['i'])
            v['en'] = int(NOW)
            if not it:
                v['gone'] = 1          # 被刪除或設成私人
                continue
            sn, cd, ls, stt = it.get('snippet') or {}, it.get('contentDetails') or {}, it.get('liveStreamingDetails') or {}, it.get('statistics') or {}
            v['d'] = X.iso_dur(cd.get('duration'))
            lbc = sn.get('liveBroadcastContent')
            v['lv'] = lbc if lbc in ('live', 'upcoming') else None
            if ls:
                v['st'] = iso_epoch(ls.get('actualStartTime') or ls.get('scheduledStartTime'))
                if ls.get('actualEndTime'):
                    v['rp'] = 1
                if ls.get('concurrentViewers', '').isdigit():
                    v['cv'] = int(ls['concurrentViewers'])
                elif v.get('lv') != 'live':
                    v.pop('cv', None)
            v['cat'] = sn.get('categoryId')
            v['tags'] = (sn.get('tags') or [])[:12]
            v['al'] = (sn.get('defaultAudioLanguage') or sn.get('defaultLanguage') or '')[:5]
            loc = (sn.get('localized') or {}).get('title')
            if loc and loc != sn.get('title') and X.lang_of(loc) == 'zh' and X.lang_of(sn.get('title')) != 'zh':
                v['tz'] = loc
            if stt.get('viewCount', '').isdigit():
                v['v'] = int(stt['viewCount'])
            v.pop('cls', None)
            n += 1
    if need:
        log('API 補資料：%d 支' % n)


def refresh_channel_stats(roster, cache):
    chans = roster['channels']
    stale = [cid for cid, r in chans.items() if NOW - (cache['chstat'].get(cid) or {}).get('ts', 0) > 86400]
    if not stale:
        return
    got = api_channels(stale[:500])
    for cid, g in got.items():
        cache['chstat'][cid] = {'subs': g.get('subs'), 'vids': g.get('vids'), 'country': g.get('country'), 'ts': int(NOW)}
        if g.get('a'):
            chans[cid]['a'] = g['a']
        if g.get('n'):
            chans[cid]['n'] = g['n']


OPENCC = []


def to_trad(s):
    """簡體標題轉繁體（台灣用語）。原本就是繁體的，轉了也幾乎不會變，變動不到兩個字就當作原本是繁體。"""
    if not OPENCC:
        try:
            import opencc   # pip install opencc-python-reimplemented
            OPENCC.append(opencc.OpenCC('s2twp'))
        except Exception:   # noqa: BLE001
            OPENCC.append(None)
    cv = OPENCC[0]
    if not cv:
        return s
    t = cv.convert(s)
    diff = sum(1 for a, b in zip(s, t) if a != b) + abs(len(s) - len(t))
    return t if diff >= 2 or (diff and X.is_simplified(s)) else s


def classify(cache, roster):
    """標題 → 繁體、語言、車道、遊戲名稱；遊戲名稱拿去 Steam 對。"""
    chans = roster['channels']
    vids = cache['videos']
    fresh = [v for v in vids.values() if 'cls' not in v]
    for v in fresh:
        t0 = v.get('t0') or v.get('t') or ''
        t = to_trad(t0) if X.lang_of(t0) == 'zh' else t0
        v['t'] = t
        kind = (chans.get(v['c']) or {}).get('k') or 'creator'
        v['z'] = X.lang_of(v.get('tz') or t) or X.lang_of(v.get('ds') or '') or (chans.get(v['c']) or {}).get('l')
        v['l'] = X.lane_of(t + ' ' + (v.get('tz') or ''), kind, v.get('lv'))
        names = X.names_in(t) or X.names_in(t0)
        if not names and v.get('tz'):
            names = X.names_in(v['tz'])
        v['nm'] = list(dict.fromkeys(X.canonical(n) for n in names))[:3]
        v['spam'] = 1 if X.SPAM.search(t) else 0
        v['gacha'] = 1 if X.GACHA.search(t) else 0
        v['cls'] = 1
    # 遊戲：先用 API 標籤、名稱去 Steam 對；同一個名稱在兩個以上頻道出現也算一款
    name_chs = {}
    for v in vids.values():
        for n in v.get('nm') or []:
            name_chs.setdefault(X.norm(n), set()).add(v['c'])
    order = sorted([v for v in vids.values() if 'g' not in v and v.get('nm')], key=lambda v: -(v.get('p') or 0))
    for v in order:
        lang = v.get('z') or 'en'
        for n in v['nm']:
            hit = steam_match(n, X.lang_of(n) or lang, cache)
            if hit:
                v['g'] = 's%d' % hit['id']
                break
        else:
            if STEAM_LEFT[0] <= 0 and not all(cache['steam'].get(X.norm(n)) is not None for n in v['nm']):
                continue   # Steam 額度用完了，下次再對
            for n in v['nm']:
                k = X.norm(n)
                if len(name_chs.get(k, ())) >= 2 and len(k) >= 2:
                    v['g'] = 'n:' + k
                    g = cache['games'].setdefault('n:' + k, {})
                    if X.lang_of(n) == 'zh':
                        g.setdefault('zh', n)
                    else:
                        g.setdefault('en', n)
                    break
            else:
                v['g'] = None


def repair_images(cache, used):
    """之前存的 Steam 橫幅網址沒有雜湊（新遊戲會 404）：有額度就補拿正確的。"""
    for k in [k for k in used if k.startswith('s')]:
        g = cache['games'].get(k) or {}
        if g.get('imgok') or STEAM_LEFT[0] <= 0:
            continue
        d = steam_name(int(k[1:]), 'tchinese')
        if d and d.get('img'):
            g['img'] = d['img']
            g['imgok'] = 1
            if d.get('n') and not g.get('zh'):
                g['zh'] = clean_title(d['n'])


def build_games(cache, roster):
    vids = cache['videos']
    per = {}
    for v in vids.values():
        k = v.get('g')
        if not k or v.get('s') == 1 or v.get('spam'):
            continue
        per.setdefault(k, []).append(v)
    out = []
    for k, lst in per.items():
        recent = [v for v in lst if NOW - (v.get('p') or 0) < 14 * 86400]
        if not recent:
            continue
        chs = {v['c'] for v in recent}
        views = sum(v.get('v') or 0 for v in recent)
        lanes = {}
        for v in recent:
            lanes[v.get('l') or 'play'] = lanes.get(v.get('l') or 'play', 0) + 1
        meta = cache['games'].get(k) or {}
        zh = clean_title(meta.get('zh'))
        en = clean_title(meta.get('en'))
        if not (zh or en):
            continue
        best = max(recent, key=lambda v: ((v.get('l') == 'trailer') * 2 + (v.get('z') == 'zh'), v.get('v') or 0))
        hot = len(chs) * 3 + len(recent) + math.log10(views + 10) * 2
        out.append({'k': k, 'zh': zh, 'en': en, 'id': meta.get('id'), 'img': meta.get('img'), 'n': len(recent), 'chs': len(chs),
                    'lanes': lanes, 'hot': round(hot, 2), 'last': max(v.get('p') or 0 for v in recent), 'cover': best['i'],
                    'gacha': 1 if X.GACHA.search((zh or '') + ' ' + (en or '')) else 0})
    out.sort(key=lambda g: -g['hot'])
    return out[:80]


# ================================================================ 新秀（全網找新頻道，有金鑰才做）

GENRES = [
    '恐怖遊戲 實況', '獨立遊戲 推薦', '魂系遊戲 攻略', '策略遊戲 實況', '模擬經營 遊戲', '動作遊戲 評測', 'RPG 劇情 解析',
    '格鬥遊戲 對戰', '賽車遊戲', '射擊遊戲 評測', 'Roguelike 推薦', '生存建造 遊戲', '解謎遊戲 推薦', '像素遊戲 推薦',
    '開放世界 遊戲 評測', 'Switch 遊戲 推薦', 'PS5 遊戲 評測', 'Steam 新遊戲 推薦', '懷舊遊戲 回顧', '遊戲史 紀錄片',
    '速通 Speedrun 中文', '遊戲新聞 週報', '卡牌構築 遊戲', '銀河惡魔城 遊戲', '戰棋遊戲 推薦', '劇情向 遊戲 推薦',
    '合作遊戲 推薦', '遊戲設計 分析', '冷門遊戲 推薦', '遊戲配樂 解析',
]


def tw_today():
    return dt.datetime.now(TW).strftime('%Y-%m-%d')


def discover(cache, roster, me, games):
    d = cache['disc']
    today = tw_today()
    if d.get('day') == today or dt.datetime.now(TW).hour < 5:
        return
    known = set(roster['channels']) | set(me['blocks']) | set(me['passes']) | set(me['subs'])
    seen = d.setdefault('seen', {})
    known |= {c for c, ts in seen.items() if NOW - ts < 60 * 86400}
    after = dt.datetime.fromtimestamp(NOW - 21 * 86400, dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    week = dt.datetime.fromtimestamp(NOW - 7 * 86400, dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    day_n = int(dt.datetime.now(TW).strftime('%j'))
    queries = []
    hot = [g for g in games if not g.get('gacha') and g.get('zh')]
    asked = d.setdefault('asked', {})
    for g in hot[:12]:
        if NOW - asked.get(g['k'], 0) > 3 * 86400:
            queries.append(('game', g['zh'] + ' 評測 實況', after, 'relevance', g))
            asked[g['k']] = int(NOW)
        if sum(1 for q in queries if q[0] == 'game') >= 4:
            break
    for i in range(3):
        queries.append(('genre', GENRES[(day_n * 3 + i) % len(GENRES)], after, 'relevance', None))
    queries.append(('dark', '遊戲', week, 'viewCount', None))
    queries.append(('dark', '遊戲 評測', week, 'viewCount', None))
    found = {}
    for kind, q, since, order, g in queries:
        j = api('search', part='snippet', q=q, type='video', videoCategoryId='20', relevanceLanguage='zh-Hant', regionCode='TW',
                publishedAfter=since, order=order, maxResults=25, safeSearch='moderate', videoDuration='medium' if kind != 'dark' else 'any')
        for it in (j or {}).get('items') or []:
            sn = it.get('snippet') or {}
            cid, vid = sn.get('channelId'), (it.get('id') or {}).get('videoId')
            if not cid or not vid or cid in known:
                continue
            title = htmlmod.unescape(sn.get('title') or '')
            if X.SPAM.search(title) or X.GACHA.search(title):
                continue
            if X.lang_of(title) not in ('zh',):
                continue
            rec = found.setdefault(cid, {'c': cid, 'name': htmlmod.unescape(sn.get('channelTitle') or ''), 'hits': 0, 'videos': [], 'why': []})
            rec['hits'] += 1
            rec['videos'].append({'i': vid, 't': title, 'p': iso_epoch(sn.get('publishedAt'))})
            label = {'game': '從《%s》找到' % (g['zh'] if g else ''), 'genre': '類型輪替：%s' % q.split(' ')[0], 'dark': '這週的黑馬'}[kind]
            if label not in rec['why']:
                rec['why'].append(label)
    if not found:
        d['day'] = today
        return
    ids = list(found)
    info = api_channels(ids)
    vids = [v['i'] for r in found.values() for v in r['videos'][:2]]
    stats = {}
    for i in range(0, len(vids), 50):
        j = api('videos', part='statistics,contentDetails', id=','.join(vids[i:i + 50]))
        for it in (j or {}).get('items') or []:
            stats[it['id']] = {'v': int((it.get('statistics') or {}).get('viewCount') or 0), 'd': X.iso_dur((it.get('contentDetails') or {}).get('duration'))}
    cands = []
    for cid, r in found.items():
        ci = info.get(cid) or {}
        subs, nv = ci.get('subs'), ci.get('vids') or 0
        if nv < 12 or (subs is not None and subs < 2000):
            continue
        best = max(r['videos'], key=lambda v: (stats.get(v['i']) or {}).get('v', 0))
        bv = (stats.get(best['i']) or {}).get('v', 0)
        if (stats.get(best['i']) or {}).get('d') and stats[best['i']]['d'] < 70:
            continue                      # 代表作是短片：多半是 Shorts 頻道
        ratio = bv / max(subs or 1, 500)
        score = min(ratio, 6) * 2 + r['hits'] + (1.5 if ci.get('country') in ('TW', 'HK', 'MO') else 0) + random.random()
        cands.append({'c': cid, 'n': ci.get('n') or r['name'], 'a': ci.get('a'), 'subs': subs, 'vids': nv, 'country': ci.get('country'),
                      'ds': (ci.get('ds') or '')[:140], 'why': r['why'][:2], 'ratio': round(ratio, 2), 'score': round(score, 2),
                      'sample': {'i': best['i'], 't': best['t'], 'p': best['p'], 'v': bv, 'd': (stats.get(best['i']) or {}).get('d')}})
    cands.sort(key=lambda c: -c['score'])
    picks = cands[:5]
    for p in picks:
        p['day'] = today
        p['ts'] = int(NOW)
        seen[p['c']] = int(NOW)
        if bv_label(p):
            p['why'].append(bv_label(p))
    old = [p for p in (d.get('picks') or []) if NOW - p.get('ts', 0) < 15 * 86400 and p['c'] not in me['subs'] and p['c'] not in me['passes'] and p['c'] not in me['blocks']]
    d['picks'] = (picks + old)[:40]
    d['day'] = today
    log('新秀：候選 %d 個，選出 %d 個' % (len(cands), len(picks)))


def bv_label(p):
    r = p.get('ratio') or 0
    if r >= 2:
        return '代表作觀看是訂閱數的 %.1f 倍' % r
    return None


def build_discover(cache):
    d = cache['disc']
    return {'v': 1, 'at': stamp(), 'day': d.get('day'), 'key': bool(KEY), 'picks': d.get('picks') or []}


# ================================================================ 給 App 的 feed.json

def build_feed(cache, roster, me):
    chans = roster['channels']
    vids = cache['videos']
    # 黑馬：每個頻道的觀看數中位數
    med = {}
    by_ch = {}
    for v in vids.values():
        if v.get('s') == 1 or v.get('v') is None or v.get('lv'):
            continue
        age = NOW - (v.get('p') or NOW)
        if 2 * 86400 < age < 30 * 86400:
            by_ch.setdefault(v['c'], []).append(v['v'])
    for c, xs in by_ch.items():
        if len(xs) >= 4:
            med[c] = statistics.median(xs)
    items = []
    blocks = set(me['blocks'])
    for v in sorted(vids.values(), key=lambda v: -(v.get('p') or 0)):
        if v.get('gone') or v['c'] in blocks:
            continue
        r = chans.get(v['c']) or {}
        it = {'i': v['i'], 'c': v['c'], 't': v.get('t') or v.get('t0'), 'p': v.get('p')}
        for k in ('v', 'd', 'lv', 'st', 'cv', 'tz', 'g', 'z'):
            if v.get(k) is not None:
                it[k] = v[k]
        it['l'] = v.get('l') or 'play'
        if v.get('s') == 1:
            it['s'] = 1
        if v.get('rp'):
            it['rp'] = 1
        if v.get('spam') or v.get('gacha'):
            it['x'] = 1
        if v.get('cat') in NOT_GAMING_CATS and r.get('k') not in ('official',):
            it['x'] = 1
        if v.get('t0') and v.get('t0') != it['t']:
            it['t0'] = v['t0']
        m = med.get(v['c'])
        age = NOW - (v.get('p') or NOW)
        if m and v.get('v') and v.get('s') != 1 and 86400 < age < 21 * 86400:
            ratio = v['v'] / max(m, 300)
            if ratio >= 2.2 and v['v'] >= 3000:
                it['dh'] = round(ratio, 1)
        items.append(it)
    pick_ch = {p['c']: p for p in (cache['disc'].get('picks') or [])}
    ch = {}
    used = {it['c'] for it in items}
    for cid, r in chans.items():
        if not (r.get('seed') or cid in me['subs'] or cid in used):
            continue
        st = cache['chstat'].get(cid) or {}
        langs = [it.get('z') for it in items if it['c'] == cid and it.get('z')]
        l = max(set(langs), key=langs.count) if len(langs) >= 3 else r.get('l')
        ch[cid] = {k: v for k, v in {'n': r.get('n') or r.get('seed'), 'a': r.get('a'), 'l': l, 'k': r.get('k') or 'creator',
                                     'tags': r.get('tags') or None, 'seed': 1 if r.get('seed') else None, 'h': r.get('h'),
                                     'subs': st.get('subs'), 'ds': (r.get('ds') or '')[:140] or None}.items() if v is not None}
    for cid, p in pick_ch.items():
        if cid not in ch:
            ch[cid] = {k: v for k, v in {'n': p.get('n'), 'a': p.get('a'), 'l': 'zh', 'k': 'creator', 'cand': 1, 'subs': p.get('subs'),
                                         'ds': p.get('ds') or None}.items() if v is not None}
    gk = {it.get('g') for it in items if it.get('g')}
    return {'v': 1, 'at': stamp(), 'key': bool(KEY), 'ch': ch, 'items': items,
            'games': {k: {kk: vv for kk, vv in g.items() if kk in ('zh', 'en', 'id', 'img')} for k, g in cache['games'].items() if k in gk}}


if __name__ == '__main__':
    try:
        main()
    except Exception:   # noqa: BLE001
        traceback.print_exc()
        sys.exit(1)
