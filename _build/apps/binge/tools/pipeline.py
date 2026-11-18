#!/usr/bin/env python3
"""補番 BINGE — 片庫資料管線（GitHub Actions `.github/workflows/binge-feed.yml` 每 30 分鐘跑一次）

做的事：
  1. 收轉發站（ntfy.sh）上 App 送來的追番／取消／稍後再看／封鎖／隱藏／長片進度／新增頻道 → me.json（main 分支）
  2. 片源名單（apps/binge/data/channels.json，手寫）＋痞子葳新增的頻道 → roster.json（main 分支）
  3. 每個頻道的 RSS（官方、不用金鑰）：最新 15 支、觀看數、說明欄（章節、播放清單連結）
  4. 在時間預算內用 yt-dlp 抓（不下載影片）：頻道的影片分頁（片長、會員限定）、播放清單分頁、播放清單內容、Shorts、直播
     只在台灣能看的頻道（木棉花、Ani-One 中文）從美國的機器看不到分頁：改從說明欄找播放清單，再抓清單內容（清單看得到）
  5. 沒片長的新片：讀影片頁（片長、直播中、說明欄）
  6. 有 YouTube 金鑰（Actions 密碼 YT_KEY，跟《觀戰》共用）時：用官方 API 補片長、直播狀態、台灣限定頻道的播放清單（每天最多 4,000 點）
  7. 整理：標題（拿掉 hashtag、表情、頻道名，簡體轉繁體）、格式（合輯／單集／劇場版／短劇／預告／直播）、AI、集數、作品（播放清單或同名合輯）
  8. 輸出 catalog.json、status.json、cache.json 到 --out（工作流程推成 binge-data 分支，只留最新一版）

本機跑（沙盒連不到 YouTube，只能用假資料）：
  python3 _build/apps/binge/tools/pipeline.py --repo . --prev /tmp/prev --out /tmp/out --offline fixtures/
"""
import argparse
import collections
import concurrent.futures as cf
import datetime as dt
import hashlib
import html as htmlmod
import http.client
import json
import math
import os
import random
import re
import sys
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ytx as X  # noqa: E402

TOPIC = 'pz-binge-7e3572039bf2097cf2bf'
RELAY = 'https://ntfy.sh/' + TOPIC
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/131.0.0.0 Safari/537.36')
YT_HEADERS = {'User-Agent': UA, 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.5', 'Cookie': 'CONSENT=YES+cb; SOCS=CAI'}
NS = {'a': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015', 'm': 'http://search.yahoo.com/mrss/'}
CH_RE = re.compile(r'^UC[A-Za-z0-9_-]{22}$')
VID_RE = re.compile(r'^[A-Za-z0-9_-]{11}$')
PL_RE = re.compile(r'^(?:PL|OL|UU|FL)[A-Za-z0-9_-]{16,40}$')
SID_RE = re.compile(r'^[pg]:[A-Za-z0-9_:\-]{4,90}$')
EV_RE = re.compile(r'^d[a-z0-9]{3,10}-\d{1,7}$')

NOW = time.time()
LOG, ERRS = [], []
UNITS = [0]
CLS_VER = 1                 # 分類規則改了就加一（目前每次都重新整理，留著備用）

# 抓取頻率與上限
TAB_EVERY = 20 * 3600       # 影片分頁
PLTAB_EVERY = 24 * 3600     # 播放清單分頁
PL_EVERY = 52 * 3600        # 播放清單內容（頻道有新片時會提早）
SHORTS_EVERY = 12 * 3600
WATCH_PER_RUN = 60
KEEP_DAYS = 150             # 沒有被作品收進去的影片留多久
SHOW_CAPS = {'ai': 40, 'sd': 30, 'mc': 40, 'cn': 45, 'jp': 140, 'toon': 30}      # 每個頻道收幾部作品
EPS_PER_SHOW = 260
API_DAY_CAP = 4000          # 金鑰每天最多用幾點（觀戰也用同一把）


def log(*a):
    s = ' '.join(str(x) for x in a)
    LOG.append(s)
    print(s, flush=True)


def err(s):
    ERRS.append(s[:300])
    log('！', s)


def load(p, default):
    try:
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def dump(p, obj, pretty=False):
    os.makedirs(os.path.dirname(p) or '.', exist_ok=True)
    tmp = p + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        if pretty:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        else:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    os.replace(tmp, p)


def stamp():
    return dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def iso_epoch(s):
    try:
        return int(dt.datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp())
    except (ValueError, AttributeError):
        return None


# ================================================================ 連網

OFFLINE = None


def http_get(url, headers=None, timeout=25, tries=3, json_out=False, data=None):
    if OFFLINE is not None:
        return offline_get(url, json_out)
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=headers or {'User-Agent': UA}, data=data)
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
    key = hashlib.sha1(url.encode()).hexdigest()[:16]
    for name in (key,):
        p = os.path.join(OFFLINE, name)
        if os.path.exists(p):
            with open(p, 'rb') as f:
                b = f.read()
            return 200, (json.loads(b) if json_out else b)
    m = re.search(r'channel_id=(UC[\w-]{22})', url)
    if m and os.path.exists(os.path.join(OFFLINE, m.group(1) + '.xml')):
        with open(os.path.join(OFFLINE, m.group(1) + '.xml'), 'rb') as f:
            return 200, f.read()
    m = re.search(r'watch\?v=([\w-]{11})', url)
    if m and os.path.exists(os.path.join(OFFLINE, 'w_' + m.group(1) + '.html')):
        with open(os.path.join(OFFLINE, 'w_' + m.group(1) + '.html'), 'rb') as f:
            return 200, f.read()
    return 404, (None if json_out else b'')


def flat(url, limit):
    """yt-dlp 扁平清單；離線測試時讀 fixtures/flat_<雜湊>.json。"""
    if OFFLINE is not None:
        p = os.path.join(OFFLINE, 'flat_' + hashlib.sha1(url.encode()).hexdigest()[:12] + '.json')
        if os.path.exists(p):
            return load(p, None)
        return None
    return X.flat(url, limit=limit)


# ================================================================ YouTube Data API（有金鑰才用）

KEY = os.environ.get('YT_KEY', '').strip() or None


class QuotaStop(Exception):
    pass


def api(path, cache, **params):
    if not KEY:
        return None
    day = dt.datetime.now(dt.timezone(dt.timedelta(hours=-8))).strftime('%Y-%m-%d')   # 配額照太平洋時間換日
    a = cache.setdefault('api', {})
    if a.get('day') != day:
        a.update({'day': day, 'units': 0})
    if a['units'] >= API_DAY_CAP:
        raise QuotaStop('今天的額度用完了（%d 點）' % a['units'])
    params['key'] = KEY
    url = 'https://www.googleapis.com/youtube/v3/%s?%s' % (path, urllib.parse.urlencode(params))
    a['units'] += 1
    UNITS[0] += 1
    try:
        st, j = http_get(url, headers={'User-Agent': 'pz-binge'}, json_out=True)
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
        if reason in ('quotaExceeded', 'keyInvalid', 'accessNotConfigured', 'forbidden', 'dailyLimitExceeded'):
            raise QuotaStop(reason)
        return None
    return j


def iso_dur(s):
    m = re.fullmatch(r'P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', s or '')
    if not m:
        return None
    d, h, mi, se = [int(x or 0) for x in m.groups()]
    return d * 86400 + h * 3600 + mi * 60 + se


# ================================================================ 頻道頁

def page_meta(path):
    """抓 youtube.com 頻道頁：頻道 ID、名稱、頭像、簡介（不用金鑰）。"""
    st, body = http_get('https://www.youtube.com' + path, headers=YT_HEADERS)
    if st != 200 or not body:
        return None
    h = body.decode('utf-8', 'replace')
    cid = None
    for rx in (r'<link rel="canonical" href="https://www\.youtube\.com/channel/(UC[\w-]{22})"', r'"externalId":"(UC[\w-]{22})"',
               r'"channelId":"(UC[\w-]{22})"', r'<meta itemprop="identifier" content="(UC[\w-]{22})"'):
        m = re.search(rx, h)
        if m:
            cid = m.group(1)
            break
    if not cid:
        return None

    def meta(prop):
        m = re.search(r'<meta property="og:%s" content="([^"]*)"' % prop, h)
        return htmlmod.unescape(m.group(1)) if m else None
    out = {'id': cid}
    if not (path.startswith('/watch') or path.startswith('/shorts/')):
        out['n'] = meta('title')
        a = meta('image')
        out['a'] = re.sub(r'=s\d+-', '=s176-', a) if a and '=s' in a else a
        out['ds'] = (meta('description') or '')[:200]
        m = re.search(r'"canonicalBaseUrl":"/(@[^"]+)"', h)
        if m:
            out['h'] = urllib.parse.unquote(m.group(1))
    return out


def resolve_query(q):
    q = urllib.parse.unquote((q or '').strip())
    if not q:
        return None
    m = re.search(r'(UC[A-Za-z0-9_-]{22})', q)
    if m:
        return page_meta('/channel/' + m.group(1)) or {'id': m.group(1)}
    m = re.search(r'(?:youtube\.com/)?(@[^/?#\s]+)', q)
    if m:
        return page_meta('/' + urllib.parse.quote(m.group(1), safe='@'))
    m = re.search(r'(?:v=|youtu\.be/|/shorts/|/live/)([A-Za-z0-9_-]{11})', q)
    if m:
        meta = page_meta('/watch?v=' + m.group(1))
        return (page_meta('/channel/' + meta['id']) or meta) if meta else None
    m = re.search(r'youtube\.com/(c|user)/([^/?#\s]+)', q)
    if m:
        return page_meta('/%s/%s' % (m.group(1), urllib.parse.quote(m.group(2))))
    if re.fullmatch(r'[^\s/]{2,40}', q):
        return resolve_query('@' + q.lstrip('@'))
    return None


# ================================================================ RSS

PL_LINK = re.compile(r'list=((?:PL|OL)[A-Za-z0-9_-]{16,40})')


def fetch_rss(cid):
    st, body = http_get('https://www.youtube.com/feeds/videos.xml?channel_id=' + cid,
                        headers={'User-Agent': 'Mozilla/5.0 pz-binge', 'Accept-Language': 'zh-TW'})
    if st != 200 or not body:
        raise RuntimeError('RSS %s' % st)
    root = ET.fromstring(body)
    items = []
    for e in root.findall('a:entry', NS):
        vid = e.findtext('yt:videoId', namespaces=NS)
        if not vid or not VID_RE.match(vid):
            continue
        link = e.find('a:link', NS)
        href = link.get('href') if link is not None else ''
        g = e.find('m:group', NS)
        desc, views = '', None
        if g is not None:
            desc = g.findtext('m:description', default='', namespaces=NS) or ''
            stt = g.find('m:community/m:statistics', NS)
            if stt is not None and stt.get('views', '').isdigit():
                views = int(stt.get('views'))
        items.append({'i': vid, 't': (e.findtext('a:title', namespaces=NS) or '').strip(), 'p': iso_epoch(e.findtext('a:published', namespaces=NS)),
                      'v': views, 'desc': desc, 'short': '/shorts/' in href})
    return root.findtext('a:title', namespaces=NS), items


# ================================================================ 影片頁（沒金鑰時補片長、直播、說明欄）

def watch_meta(vid):
    st, body = http_get('https://www.youtube.com/watch?v=%s&hl=zh-TW&gl=TW' % vid, headers=YT_HEADERS, tries=2)
    if st != 200 or not body:
        return None
    h = body.decode('utf-8', 'replace')
    out = {}
    m = re.search(r'"lengthSeconds":"(\d+)"', h)
    if m and int(m.group(1)) > 0:
        out['d'] = int(m.group(1))
    if re.search(r'"isLiveNow":true', h):
        out['lv'] = 'live'
    elif re.search(r'"isUpcoming":true', h):
        out['lv'] = 'upcoming'
        m = re.search(r'"scheduledStartTime":"(\d+)"', h)
        if m:
            out['st'] = int(m.group(1))
    elif re.search(r'"isLiveContent":true', h):
        out['lv'] = 'was'
    m = re.search(r'"shortDescription":"((?:[^"\\]|\\.)*)"', h)
    if m:
        try:
            out['desc'] = json.loads('"' + m.group(1) + '"')
        except ValueError:
            pass
    m = re.search(r'"playabilityStatus":\{"status":"([A-Z_]+)"', h)
    out['ps'] = m.group(1) if m else None
    if not out.get('d') and out.get('ps') == 'LOGIN_REQUIRED':
        out['age'] = 1
    return out


# ================================================================ 轉發站收件 → me.json

def S(n):
    return lambda v: v.strip()[:n] if isinstance(v, str) and v.strip() else None


def INT(lo, hi):
    return lambda v: int(v) if isinstance(v, (int, float)) and lo <= v <= hi else None


CHF = lambda v: v if isinstance(v, str) and CH_RE.match(v) else None  # noqa: E731
VIDF = lambda v: v if isinstance(v, str) and VID_RE.match(v) else None  # noqa: E731
SIDF = lambda v: v if isinstance(v, str) and SID_RE.match(v) else None  # noqa: E731
FIELDS = {
    'follow': {'s': SIDF, 'n': S(80)}, 'unfollow': {'s': SIDF},
    'later': {'v': VIDF, 'on': lambda v: bool(v) if isinstance(v, bool) else None},
    'block': {'ch': CHF}, 'unblock': {'ch': CHF}, 'hide': {'s': SIDF}, 'unhide': {'s': SIDF},
    'prog': {'v': VIDF, 'pos': INT(0, 200000), 'len': INT(1, 200000), 'dev': S(12)},
    'add': {'q': S(300)}, 'ping': {'note': S(40)},
}
NEED = {'follow': 's', 'unfollow': 's', 'later': 'v', 'block': 'ch', 'unblock': 'ch', 'hide': 's', 'unhide': 's', 'prog': 'v', 'add': 'q'}


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
    if typ == 'prog' and ('pos' not in out or 'len' not in out):
        return None
    return out


def collect_relay(me):
    since = me.get('cursor') or '12h'
    try:
        st, body = http_get(RELAY + '/json?poll=1&since=' + urllib.parse.quote(str(since)), headers={'User-Agent': 'pz-binge-inbox'}, timeout=40)
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
        for ev in (wrap.get('evs') or [])[:40]:
            c = clean_event(ev, dev)
            if c and c['id'].startswith(dev + '-'):
                evs.append(c)
    if last_t:
        me['cursor'] = last_t
    return evs


def new_me():
    return {'v': 1, 'at': None, 'follow': {}, 'later': {}, 'blocks': {}, 'hides': {}, 'prog': {}, 'adds': [], 'seen': [], 'log': [], 'cursor': None}


def apply_events(me, evs):
    seen = set(me.get('seen') or [])
    fresh = sorted([e for e in evs if e['id'] not in seen], key=lambda e: (e['t'], e['id']))
    for e in fresh:
        typ, t = e['type'], e['t']
        if typ == 'follow':
            me['follow'][e['s']] = {'t': t, 'n': e.get('n')}
            me['hides'].pop(e['s'], None)
        elif typ == 'unfollow':
            me['follow'].pop(e['s'], None)
        elif typ == 'later':
            if e.get('on') is False:
                me['later'].pop(e['v'], None)
            else:
                me['later'][e['v']] = t
        elif typ == 'block':
            me['blocks'][e['ch']] = t
        elif typ == 'unblock':
            me['blocks'].pop(e['ch'], None)
        elif typ == 'hide':
            me['hides'][e['s']] = t
            me['follow'].pop(e['s'], None)
        elif typ == 'unhide':
            me['hides'].pop(e['s'], None)
        elif typ == 'prog':
            old = me['prog'].get(e['v'])
            if not old or old[2] < t:
                me['prog'][e['v']] = [e['pos'], e['len'], t, e.get('dev') or e['dev']]
        elif typ == 'add':
            me['adds'].append({'id': e['id'], 'q': e['q'], 't': t, 'st': 'wait'})
        me['seen'].append(e['id'])
        if typ != 'prog':
            me['log'].append({k: e[k] for k in ('id', 'type', 't', 's', 'ch', 'v', 'q') if k in e})
    me['seen'] = me['seen'][-2500:]
    me['log'] = me['log'][-300:]
    me['adds'] = me['adds'][-60:]
    for k, cap in (('later', 300), ('prog', 300)):
        d = me[k]
        while len(d) > cap:
            d.pop(min(d, key=lambda x: d[x] if k == 'later' else d[x][2]))
    return len(fresh)


# ================================================================ 片庫快取

def vrec(cache, vid, cid):
    v = cache['v'].get(vid)
    if v is None:
        v = cache['v'][vid] = {'c': cid, 'fs': int(NOW)}
    elif cid and v.get('c') != cid:
        v['c'] = cid
    return v


def take_desc(v, desc):
    if not desc:
        return
    ch = X.chapters(desc, v.get('d'))
    if ch:
        v['chap'] = [[s, (lb or '')[:32]] for s, lb in ch][:160]
    pls = sorted(set(m for m in PL_LINK.findall(desc) if PL_RE.match(m)))
    if pls:
        v['dpl'] = pls[:8]


def take_flat_entry(cache, e, cid, src):
    vid = e.get('id')
    if not vid or not VID_RE.match(str(vid)):
        return None
    v = vrec(cache, vid, cid)
    if e.get('title') and e.get('title') not in ('[Private video]', '[Deleted video]', '[私人影片]', '[已刪除的影片]'):
        v['t'] = e['title']
        v['tl'] = 1          # zh-TW 的在地化標題（優先用）
    elif e.get('title') in ('[Private video]', '[Deleted video]', '[私人影片]', '[已刪除的影片]'):
        v['gone'] = 1
    if e.get('duration'):
        v['d'] = int(e['duration'])
    if e.get('view_count') is not None:
        v['v'] = int(e['view_count'])
    if X.members_only(e):
        v['mem'] = 1
    ls = e.get('live_status')
    if ls == 'is_live':
        v['lv'] = 'live'
        v['lvat'] = int(NOW)
    elif ls == 'is_upcoming':
        v['lv'] = 'upcoming'
    elif ls == 'was_live' and v.get('lv') in (None, 'live', 'upcoming'):
        v['lv'] = 'was'
    if '/shorts/' in (e.get('url') or '') or src == 'shorts':
        v['sh'] = 1
    v['src'] = v.get('src') or src
    v['seen'] = int(NOW)
    return v


# ================================================================ 主流程

def main():
    global OFFLINE
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', required=True)
    ap.add_argument('--prev', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--offline')
    ap.add_argument('--budget', type=float, default=11.0, help='yt-dlp 抓取的時間預算（分鐘）')
    ap.add_argument('--workers', type=int, default=5)
    a = ap.parse_args()
    OFFLINE = a.offline
    t0 = time.time()
    data_dir = os.path.join(a.repo, 'apps', 'binge', 'data')
    seed = load(os.path.join(data_dir, 'channels.json'), {'channels': []})['channels']
    roster = load(os.path.join(data_dir, 'roster.json'), {'channels': {}})
    roster.setdefault('channels', {})
    me = load(os.path.join(data_dir, 'me.json'), None) or new_me()
    for k, v in new_me().items():
        me.setdefault(k, v)
    cache = load(os.path.join(a.prev, 'cache.json'), {})
    for k in ('v', 'ch', 'pl', 'tries', 'api'):
        cache.setdefault(k, {})
    log('上一版：', '有' if cache['v'] else '沒有（第一次跑）', '｜金鑰：', '有' if KEY else '沒有', '｜快取影片', len(cache['v']))
    roster_before = json.dumps(roster, sort_keys=True, ensure_ascii=False)
    me_before = json.dumps(me, sort_keys=True, ensure_ascii=False)
    stat = {'key': bool(KEY)}

    # ---- 1. 轉發站
    evs = collect_relay(me)
    stat['events'] = apply_events(me, evs)
    log('轉發站：收到 %d 筆、新的 %d 筆' % (len(evs), stat['events']))

    # ---- 2. 名單
    try:
        resolve_roster(seed, roster, me)
    except Exception as e:  # noqa: BLE001
        err('名單：%s' % e)
    chans = roster['channels']
    pool = [c for c in chans if c not in me['blocks'] and (chans[c].get('seed') or chans[c].get('src') == 'add')]

    # ---- 3. RSS
    new_by_ch = rss_all(pool, chans, cache)
    # ---- 4. yt-dlp
    deadline = time.time() + a.budget * 60
    try:
        crawl(pool, chans, cache, new_by_ch, deadline, a.workers)
    except Exception as e:  # noqa: BLE001
        err('抓取：%s\n%s' % (e, traceback.format_exc()[-600:]))
    # ---- 5. 影片頁
    try:
        watch_fill(pool, chans, cache, deadline + 90)
    except Exception as e:  # noqa: BLE001
        err('影片頁：%s' % e)
    # ---- 6. 金鑰
    if KEY:
        try:
            api_fill(pool, chans, cache)
        except QuotaStop as e:
            err('金鑰暫停使用（%s）' % e)
        except Exception as e:  # noqa: BLE001
            err('API：%s' % e)
    # ---- 7、8. 整理與輸出
    prune(cache, chans)
    cat = build_catalog(cache, chans, me)
    dump(os.path.join(a.out, 'catalog.json'), cat)
    dump(os.path.join(a.out, 'cache.json'), cache)
    quiet = []
    for cid in pool:
        cs = cache['ch'].get(cid) or {}
        last = cs.get('last')
        if chans[cid].get('seed') and cs.get('rss') and (not last or NOW - last > 45 * 86400):
            quiet.append('%s（%s）' % (chans[cid].get('seed'), '沒有影片' if not last else '%d 天沒更新' % ((NOW - last) // 86400)))
    pls = [p for p in cache['pl'].values() if p.get('keep')]
    stat.update({
        'v': 1, 'at': stamp(), 'run_s': round(time.time() - t0, 1), 'channels': len(cat['chs']), 'videos': len(cat['vids']), 'shows': len(cat['shows']),
        'cache_videos': len(cache['v']), 'playlists': len(cache['pl']), 'playlists_done': sum(1 for p in pls if p.get('ts')), 'playlists_kept': len(pls),
        'size_kb': round(os.path.getsize(os.path.join(a.out, 'catalog.json')) / 1024), 'units': UNITS[0], 'units_day': cache['api'].get('units', 0),
        'quiet': quiet, 'unresolved': sorted(cache['tries']), 'errors': ERRS[-40:], 'log': LOG[-200:],
    })
    dump(os.path.join(a.out, 'status.json'), stat, pretty=True)
    with open(os.path.join(a.out, 'README.md'), 'w', encoding='utf-8') as f:
        f.write('# 補番 BINGE 片庫資料\n\n這個分支由 GitHub Actions `binge-feed` 自動產生、每次只留最新一版（強制推送）。'
                'App 從 raw.githubusercontent.com 讀。說明見 main 分支的 `_build/apps/binge/README.md`。\n')
    if json.dumps(me, sort_keys=True, ensure_ascii=False) != me_before:
        me['at'] = stamp()
        dump(os.path.join(data_dir, 'me.json'), me, pretty=True)
        log('me.json 有變動')
    if json.dumps(roster, sort_keys=True, ensure_ascii=False) != roster_before:
        roster['at'] = stamp()
        dump(os.path.join(data_dir, 'roster.json'), roster, pretty=True)
        log('roster.json 有變動')
    log('完成：片庫 %d 支、作品 %d 部、%d KB、%.1f 秒、API %d 點' % (len(cat['vids']), len(cat['shows']), stat['size_kb'], time.time() - t0, UNITS[0]))


# ---------------------------------------------------------------- 名單

def resolve_roster(seed, roster, me):
    chans = roster['channels']
    ids = set()
    for s in seed:
        cid = s.get('id')
        if not cid or not CH_RE.match(cid):
            continue
        ids.add(cid)
        r = chans.setdefault(cid, {})
        r.update({'seed': s['name'], 'k': s.get('kind') or 'toon', 'l': s.get('lang') or 'zh'})
        for f in ('geo', 'live', 'kids', 'official'):
            if s.get(f):
                r[f] = s[f]
            else:
                r.pop(f, None)
    for cid, r in list(chans.items()):
        if r.get('seed') and cid not in ids:
            log('名單拿掉：%s' % r.get('seed'))
            r.pop('seed', None)
            if r.get('src') != 'add':
                chans.pop(cid)
    for ad in me['adds']:
        if ad.get('st') != 'wait':
            continue
        try:
            got = resolve_query(ad['q'])
        except RuntimeError as e:
            got = None
            err('新增頻道 %s：%s' % (ad['q'][:40], e))
        if got and got.get('id'):
            r = chans.setdefault(got['id'], {})
            r.update({k: v for k, v in got.items() if k != 'id' and v})
            r.setdefault('src', 'add')
            r.setdefault('k', 'auto')
            r.setdefault('l', 'zh')
            ad.update({'st': 'ok', 'ch': got['id'], 'n': r.get('n')})
            log('新增頻道：%s → %s' % (ad['q'][:40], r.get('n')))
        else:
            ad.update({'st': 'fail', 'why': '找不到這個頻道'})
    miss = [cid for cid, r in chans.items() if (not r.get('a') or not r.get('n')) and NOW - r.get('mt', 0) > 3 * 86400][:60]
    if miss:
        def meta(cid):
            try:
                return cid, page_meta('/channel/' + cid)
            except RuntimeError:
                return cid, None
        with cf.ThreadPoolExecutor(max_workers=6) as ex:
            for cid, g in ex.map(meta, miss):
                chans[cid]['mt'] = int(NOW)
                if g:
                    chans[cid].update({k: v for k, v in g.items() if k in ('n', 'a', 'h', 'ds') and v})


# ---------------------------------------------------------------- RSS

def rss_all(pool, chans, cache):
    new_by_ch = collections.Counter()
    ok, fail = 0, []

    def one(cid):
        try:
            return cid, fetch_rss(cid), None
        except Exception as e:  # noqa: BLE001
            return cid, None, str(e)
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        for cid, got, e in ex.map(one, pool):
            cs = cache['ch'].setdefault(cid, {})
            if not got:
                fail.append('%s（%s）' % (chans[cid].get('seed') or cid, e))
                cs['rss_fail'] = (cs.get('rss_fail') or 0) + 1
                continue
            ok += 1
            name, items = got
            cs['rss'] = int(NOW)
            cs.pop('rss_fail', None)
            if name and not chans[cid].get('n'):
                chans[cid]['n'] = name
            for it in items:
                had = it['i'] in cache['v']
                v = vrec(cache, it['i'], cid)
                if not had:
                    new_by_ch[cid] += 1
                if not v.get('tl'):
                    v['t'] = it['t']
                v['p'] = it['p'] or v.get('p')
                if it['v'] is not None:
                    v['v'] = it['v']
                if it['short']:
                    v['sh'] = 1
                if X.MEMBERS_RX.search(it['t']):
                    v['mem'] = 1
                take_desc(v, it['desc'])
                v['rs'] = int(NOW)
                if it['p']:
                    cs['last'] = max(cs.get('last') or 0, it['p'])
    log('RSS：成功 %d／%d 個頻道，新片 %d 支%s' % (ok, len(pool), sum(new_by_ch.values()), '；失敗：' + '、'.join(fail[:8]) if fail else ''))
    return new_by_ch


# ---------------------------------------------------------------- yt-dlp 抓取

def crawl(pool, chans, cache, new_by_ch, deadline, workers):
    tasks = []      # (優先, 種類, 參數)
    for cid in pool:
        r, cs = chans[cid], cache['ch'].setdefault(cid, {})
        kind = r.get('k') or 'toon'
        long_kind = kind in ('ai', 'sd', 'mc', 'auto')
        if not r.get('geo'):
            if NOW - cs.get('tab', 0) > TAB_EVERY:
                tasks.append((0 if not cs.get('tab') else 2, 'tab', cid, 150 if long_kind else 90))
            if NOW - cs.get('pltab', 0) > PLTAB_EVERY:
                tasks.append((1 if not cs.get('pltab') else 3, 'pltab', cid, 120))
            if long_kind and NOW - cs.get('shorts', 0) > SHORTS_EVERY:
                tasks.append((4, 'shorts', cid, 40))
            if r.get('live'):
                tasks.append((1, 'streams', cid, 12))
    # 說明欄裡出現的播放清單（台灣限定的頻道只能靠這個）
    for vid, v in cache['v'].items():
        for pl in v.get('dpl') or []:
            p = cache['pl'].get(pl)
            if p is None:
                cache['pl'][pl] = {'c': v.get('c'), 'src': 'desc', 'fs': int(NOW), 'refs': 1}
            elif p.get('src') == 'desc':
                p['refs'] = min(999, (p.get('refs') or 0) + (1 if v.get('rs') == int(NOW) else 0))
    tasks.sort(key=lambda x: x[0])
    log('抓取排程：%d 件分頁工作' % len(tasks))

    def run(task):
        _, kind, cid, limit = task
        if time.time() > deadline:
            return kind, cid, None, 'late'
        url = {'tab': '/videos', 'pltab': '/playlists', 'shorts': '/shorts', 'streams': '/streams'}[kind]
        got = flat('https://www.youtube.com/channel/%s%s' % (cid, url), limit)
        return kind, cid, got, None
    done = collections.Counter()
    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        for kind, cid, got, why in ex.map(run, tasks):
            if why == 'late':
                done['late'] += 1
                continue
            cs = cache['ch'].setdefault(cid, {})
            if not got:
                done[kind + '_fail'] += 1
                cs[kind] = int(NOW) - (TAB_EVERY - 3600 if kind != 'streams' else 0)   # 一小時後再試
                continue
            cs[kind] = int(NOW)
            done[kind] += 1
            ents = got.get('entries') or []
            if kind == 'pltab':
                order = []
                for e in ents:
                    pid = str(e.get('id') or '')
                    if not PL_RE.match(pid):
                        continue
                    p = cache['pl'].setdefault(pid, {'c': cid, 'fs': int(NOW)})
                    p.update({'c': cid, 'n': e.get('title') or p.get('n'), 'src': 'tab'})
                    order.append(pid)
                cs['pls'] = order[:150]
            elif kind == 'streams':
                live_now = set()
                for e in ents:
                    v = take_flat_entry(cache, e, cid, 'streams')
                    if v and v.get('lv') == 'live':
                        live_now.add(e['id'])
                for vid, v in cache['v'].items():
                    if v.get('c') == cid and v.get('lv') == 'live' and vid not in live_now and NOW - v.get('lvat', 0) > 3600:
                        v['lv'] = 'was'
            else:
                for e in ents:
                    take_flat_entry(cache, e, cid, kind)
    log('分頁：' + '、'.join('%s %d' % kv for kv in sorted(done.items())))

    # 播放清單內容
    want = choose_playlists(pool, chans, cache, new_by_ch)
    log('播放清單：要抓 %d 個（剩 %.0f 秒）' % (len(want), deadline - time.time()))

    def run_pl(pid):
        if time.time() > deadline:
            return pid, None, 'late'
        return pid, flat('https://www.youtube.com/playlist?list=' + pid, EPS_PER_SHOW + 40), None
    n_ok = n_fail = n_late = 0
    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        for pid, got, why in ex.map(run_pl, want):
            p = cache['pl'][pid]
            if why == 'late':
                n_late += 1
                continue
            if not got or not got.get('entries'):
                n_fail += 1
                p['fail'] = (p.get('fail') or 0) + 1
                p['ts'] = int(NOW) - PL_EVERY + 6 * 3600        # 六小時後再試
                if p['fail'] >= 4:
                    p['dead'] = 1
                continue
            n_ok += 1
            p.pop('fail', None)
            cid = p.get('c') or got.get('channel_id')
            eps = []
            for e in got['entries']:
                v = take_flat_entry(cache, e, cid, 'pl')
                if v and not v.get('gone'):
                    eps.append(e['id'])
            old = set(p.get('eps') or [])
            if p.get('ts') and old:
                for vid in eps:
                    if vid not in old:
                        cache['v'][vid]['newep'] = int(NOW)
                if set(eps) - old:
                    p['upd'] = int(NOW)
            elif not p.get('ts'):
                for vid in eps:
                    cache['v'][vid].setdefault('init', 1)
            p.update({'ts': int(NOW), 'eps': eps[:EPS_PER_SHOW + 40], 'n': got.get('title') or p.get('n'), 'cnt': got.get('count') or len(eps)})
    log('播放清單：成功 %d、失敗 %d、來不及 %d' % (n_ok, n_fail, n_late))


def choose_playlists(pool, chans, cache, new_by_ch):
    """要抓內容的播放清單：沒抓過的先抓，有新片的頻道提早重抓，其他照舊排隊。"""
    out = []
    pool_set = set(pool)
    by_ch = collections.defaultdict(list)
    for pid, p in cache['pl'].items():
        if p.get('c') in pool_set and not p.get('dead'):
            by_ch[p['c']].append(pid)
    for cid, pids in by_ch.items():
        r = chans[cid]
        kind = r.get('k') or 'toon'
        cs = cache['ch'].get(cid) or {}
        order = {pid: i for i, pid in enumerate(cs.get('pls') or [])}
        cap = int(SHOW_CAPS.get(kind, 30) * 1.4)
        cands = []
        for pid in pids:
            p = cache['pl'][pid]
            title = p.get('n') or ''
            if title and X.SKIP_PL.search(title):
                p['keep'] = 0
                continue
            rank = order.get(pid, 500 - min(400, (p.get('refs') or 1) * 10))
            cands.append((rank, pid))
        cands.sort()
        for rank, pid in cands[:cap]:
            p = cache['pl'][pid]
            p['keep'] = 1
            age = NOW - p.get('ts', 0)
            if not p.get('ts'):
                out.append((0, rank, pid))
            elif new_by_ch.get(cid) and age > 5 * 3600:
                out.append((1, rank, pid))
            elif age > PL_EVERY:
                out.append((2, -age, pid))
        for rank, pid in cands[cap:]:
            cache['pl'][pid]['keep'] = 0
    out.sort()
    return [pid for _, _, pid in out]


# ---------------------------------------------------------------- 影片頁

def watch_fill(pool, chans, cache, deadline):
    pool_set = set(pool)
    want = []
    for vid, v in cache['v'].items():
        if v.get('c') not in pool_set or v.get('gone'):
            continue
        r = chans.get(v['c']) or {}
        title = v.get('t') or ''
        need = False
        if not v.get('d') and not v.get('sh') and not v.get('age') and NOW - v.get('wm', 0) > 6 * 3600 and v.get('lv') != 'upcoming':
            need = True
        if v.get('lv') in ('live', 'upcoming') and NOW - v.get('wm', 0) > 25 * 60:
            need = True
        if r.get('live') and X.LIVE_RX.search(title) and not v.get('wm') and NOW - (v.get('p') or 0) < 3 * 86400:
            need = True
        if need:
            want.append((v.get('lv') in ('live', 'upcoming'), v.get('p') or v.get('fs') or 0, vid))
    want.sort(reverse=True)
    want = [vid for _, _, vid in want[:WATCH_PER_RUN]]
    if not want:
        return

    def one(vid):
        if time.time() > deadline:
            return vid, None
        try:
            return vid, watch_meta(vid)
        except RuntimeError:
            return vid, None
    got_n = 0
    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        for vid, m in ex.map(one, want):
            v = cache['v'][vid]
            v['wm'] = int(NOW)
            if not m:
                continue
            got_n += 1
            if m.get('d'):
                v['d'] = m['d']
            if m.get('lv'):
                v['lv'] = m['lv']
                if m['lv'] == 'live':
                    v['lvat'] = int(NOW)
            elif v.get('lv') in ('live', 'upcoming'):
                v['lv'] = 'was'
            if m.get('st'):
                v['st'] = m['st']
            if m.get('age'):
                v['age'] = 1
            take_desc(v, m.get('desc'))
    log('影片頁：讀了 %d／%d 支' % (got_n, len(want)))


# ---------------------------------------------------------------- 金鑰

def api_fill(pool, chans, cache):
    pool_set = set(pool)
    # 台灣限定頻道的播放清單：每天一次
    for cid in pool:
        r, cs = chans[cid], cache['ch'].setdefault(cid, {})
        if not r.get('geo') or NOW - cs.get('apl', 0) < 24 * 3600:
            continue
        order, token = [], None
        for _ in range(4):
            j = api('playlists', cache, part='snippet,contentDetails', channelId=cid, maxResults=50, hl='zh-TW', **({'pageToken': token} if token else {}))
            if not j:
                break
            for it in j.get('items') or []:
                pid = it['id']
                p = cache['pl'].setdefault(pid, {'c': cid, 'fs': int(NOW)})
                sn = it.get('snippet') or {}
                p.update({'c': cid, 'n': (sn.get('localized') or {}).get('title') or sn.get('title'), 'src': 'api', 'cnt': (it.get('contentDetails') or {}).get('itemCount')})
                order.append(pid)
            token = j.get('nextPageToken')
            if not token:
                break
        if order:
            cs['pls'] = order[:150]
            cs['apl'] = int(NOW)
    # 片長、直播狀態：沒片長的、正在直播或即將直播的
    need = [vid for vid, v in cache['v'].items() if v.get('c') in pool_set and not v.get('gone') and
            ((not v.get('d') and not v.get('sh')) or v.get('lv') in ('live', 'upcoming')) and NOW - v.get('am', 0) > 3 * 3600]
    need.sort(key=lambda x: -(cache['v'][x].get('p') or cache['v'][x].get('fs') or 0))
    for i in range(0, min(len(need), 50 * 12), 50):
        ids = need[i:i + 50]
        j = api('videos', cache, part='contentDetails,liveStreamingDetails,statistics,snippet', id=','.join(ids), maxResults=50, hl='zh-TW')
        if not j:
            break
        got = set()
        for it in j.get('items') or []:
            v = cache['v'].get(it['id'])
            if not v:
                continue
            got.add(it['id'])
            v['am'] = int(NOW)
            d = iso_dur((it.get('contentDetails') or {}).get('duration'))
            if d:
                v['d'] = d
            sn = it.get('snippet') or {}
            if (sn.get('localized') or {}).get('title'):
                v['t'] = sn['localized']['title']
                v['tl'] = 1
            lb = sn.get('liveBroadcastContent')
            if lb == 'live':
                v['lv'], v['lvat'] = 'live', int(NOW)
            elif lb == 'upcoming':
                v['lv'] = 'upcoming'
                stt = (it.get('liveStreamingDetails') or {}).get('scheduledStartTime')
                if stt:
                    v['st'] = iso_epoch(stt)
            elif v.get('lv') in ('live', 'upcoming'):
                v['lv'] = 'was'
            stt = it.get('statistics') or {}
            if stt.get('viewCount'):
                v['v'] = int(stt['viewCount'])
            take_desc(v, sn.get('description'))
        for vid in ids:
            if vid not in got:
                cache['v'][vid]['gone'] = 1
    log('API：這次 %d 點、今天 %d 點' % (UNITS[0], cache['api'].get('units', 0)))


# ---------------------------------------------------------------- 整理

def prune(cache, chans):
    keep_pl = set()
    for pid, p in cache['pl'].items():
        if p.get('keep') and p.get('eps'):
            keep_pl.update(p['eps'])
    drop = []
    for vid, v in cache['v'].items():
        if vid in keep_pl:
            continue
        last = max(v.get('p') or 0, v.get('seen') or 0, v.get('rs') or 0, v.get('fs') or 0)
        if v.get('c') not in chans or NOW - last > KEEP_DAYS * 86400:
            drop.append(vid)
    for vid in drop:
        cache['v'].pop(vid, None)
    for pid in [pid for pid, p in cache['pl'].items() if p.get('c') not in chans or (p.get('dead') and NOW - p.get('fs', 0) > 30 * 86400)]:
        cache['pl'].pop(pid, None)
    if drop:
        log('快取：清掉 %d 支舊片' % len(drop))


_OCC = [None]


_FIX = str.maketrans({'臺': '台', '産': '產', '壹': '一'})
_OCC_CH = [None]


def nice_ch(n):
    """頻道名稱：拿掉英文副標、「歡迎訂閱」「Get the APP」之類的尾巴。"""
    if not n:
        return n
    if _OCC_CH[0] is None:
        try:
            from opencc import OpenCC
            _OCC_CH[0] = (OpenCC('s2t'), OpenCC('t2tw'))
        except Exception:  # noqa: BLE001
            _OCC_CH[0] = False
    n0 = n = (_OCC_CH[0][1].convert(_OCC_CH[0][0].convert(n)) if _OCC_CH[0] else n).translate(_FIX)
    n = re.sub(r'\s*[(（][^)）]*[)）]', ' ', n)
    parts = [x.strip() for x in re.split(r'\s+[-–—|｜]\s+|\s*-\s*(?=Get the|APP|歡迎)|\s*[|｜]\s*', n) if x.strip()]
    n = parts[0] if parts else n
    if len(parts) > 1 and re.fullmatch(r'[\u4e00-\u9fff]{1,4}', parts[1]):
        n += parts[1]
    n = re.sub(r'Anime Made By Bilibili|iQIYI Animation|Get the iQIYI APP|歡迎訂閱|APP搶先看|天天看動漫', ' ', n, flags=re.I)
    n = re.sub(r'\s+', ' ', n).strip(' -–—|｜_')
    return n if len(n) >= 2 else n0


def s2t(s):
    """簡體 → 台灣繁體（s2twp），再統一異體字（爲→為、裏→裡、壹口氣→一口氣）。對本來就是繁體的字幾乎不動。"""
    if not s:
        return s
    if _OCC[0] is None:
        try:
            from opencc import OpenCC
            _OCC[0] = (OpenCC('s2twp'), OpenCC('t2tw'))
        except Exception:  # noqa: BLE001
            _OCC[0] = False
    if _OCC[0]:
        try:
            s = _OCC[0][1].convert(_OCC[0][0].convert(s))
        except Exception:  # noqa: BLE001
            pass
    return s.translate(_FIX)


BUDGET = {'ai': 100, 'sd': 100, 'mc': 200, 'cn': 420, 'jp': 700, 'toon': 220}   # 每個頻道收進片庫幾支（含作品裡的集數）
KIDS_BUDGET = 90
EP_CAP = 100              # 一部作品最多收幾集
TITLE_MAX = 56


def build_catalog(cache, chans, me):
    """片庫：頻道、影片（壓縮陣列）、作品、章節。每個頻道有預算，挑最值得看的作品與影片。"""
    pool = {c: r for c, r in chans.items() if r.get('seed') or r.get('src') == 'add'}
    info = {}
    for vid, v in cache['v'].items():
        r = pool.get(v.get('c'))
        if not r or v.get('mem') or v.get('gone') or not v.get('t'):
            continue
        chname = s2t(r.get('n') or r.get('seed') or '')
        raw = s2t(v['t'])
        t = X.clean_title(raw, chname) or raw[:96]
        kind = r.get('k') or 'toon'
        lv = v.get('lv')
        f = X.fmt_of(raw, v.get('d'), bool(v.get('sh')), {'live': 'live', 'upcoming': 'upcoming'}.get(lv))
        f = {'live': 'l', 'short': 's', 'comp': 'c', 'movie': 'm', 'ep': 'e', 'pv': 'p', 'clip': 'x'}[f]
        if kind in ('ai', 'sd', 'mc') and f == 'e' and (v.get('d') or 0) >= 25 * 60:
            f = 'c'
        info[vid] = {'v': v, 'kind': kind, 't': t, 'f': f, 'ai': kind == 'ai' or X.is_ai(raw), 'zh': X.lang_of(t) == 'zh',
                     'ep': X.ep_num(raw), 'rg': X.ep_range(raw), 'show': X.show_name(raw, strict=True)}
    views = collections.defaultdict(list)
    for vid, x in info.items():
        if x['v'].get('v') and x['f'] in ('c', 'e', 'm'):
            views[x['v']['c']].append(x['v']['v'])
    vm = {c: sorted(a)[len(a) // 2] for c, a in views.items() if a}

    def vscore(vid):
        x = cache['v'][vid]
        med = vm.get(x['c']) or 1000
        age = (NOW - x['p']) / 86400 if x.get('p') else 90
        return math.log2(1 + (x.get('v') or 0) / med) + (1.6 if age < 7 else 0.9 if age < 30 else 0.3 if age < 120 else 0)

    # ---- 作品候選：播放清單（要找得到各集共同的作品名；AI 頻道的「題材清單」不是作品）
    cands = collections.defaultdict(list)       # 頻道 → [作品]
    for pid, p in cache['pl'].items():
        cid = p.get('c')
        if not (p.get('keep') and p.get('eps') and cid in pool):
            continue
        r = pool[cid]
        kind = r.get('k') or 'toon'
        eps = [vid for vid in p['eps'] if vid in info and (info[vid]['f'] in ('e', 'c', 'm', 'l') or (info[vid]['f'] == 'x' and info[vid]['ep']))]
        if len(eps) < 2 and not (eps and info[eps[0]]['f'] in ('c', 'm')):
            continue
        if (r.get('l') or 'zh') == 'zh' and sum(1 for v in eps if info[v]['zh']) < len(eps) * 0.5:
            continue          # 中文頻道裡的外語配音清單
        nums = [info[v]['ep'] for v in eps if info[v]['ep']]
        if len(nums) >= 3 and nums[0] > nums[-1]:
            eps = eps[::-1]
        numbered = [v for v in eps if info[v]['ep'] or info[v]['rg']]
        if len(numbered) >= 3 and len(numbered) >= len(eps) * 0.7:
            # 大多有集數：單集照（季、集數）排在前、合輯排在後；沒集數的跟著前一支
            keyv, lastk = {}, (0, 1, 0)
            for i, v in enumerate(eps):
                rg = info[v]['rg']
                n = info[v]['ep'] or (rg[0] if rg else 0)
                if n:
                    lastk = (1 if rg else 0, X.season_of(cache['v'][v].get('t')) or 1, n)
                    keyv[v] = lastk + (0, i)
                else:
                    keyv[v] = lastk + (1, i)
            eps = sorted(eps, key=keyv.get)
        name = X.common_name([info[v]['t'] for v in eps[:40]])
        if not name:
            if kind in ('ai', 'sd', 'mc') or len(eps) > 40:
                continue        # 題材合集、雜燴清單
            name = s2t(X.clean_playlist(p.get('n') or '', r.get('n') or ''))
            if not X._name_ok(X.nice_show(name)):
                continue        # 「限時免費」「搶先看」這種清單名不是作品
        name = X.nice_show(s2t(name or ''))
        if not name or len(name) < 2:
            continue
        cands[cid].append({'id': 'p:' + pid, 'n': name, 'c': cid, 'k': kind, 'pl': pid, 'eps': eps, 'upd': p.get('upd') or 0})
    in_pl = set(v for lst in cands.values() for s in lst for v in s['eps'])
    # ---- 作品候選：同名的合輯、單集（第 1、2 季分開上傳的）
    grp = collections.defaultdict(list)
    for vid, x in info.items():
        if vid in in_pl or x['f'] not in ('c', 'e', 'm') or not x['show']:
            continue
        grp[(x['v']['c'], X.norm(x['show']))].append(vid)
    dupe_in_group = set()
    for (cid, key), vids in grp.items():
        if len(vids) < 2 or not key:
            continue
        vids.sort(key=lambda v: -(cache['v'][v].get('v') or 0))
        keep = []
        for v in vids:
            d = cache['v'][v].get('d') or 0
            rv = info[v]['rg']

            def near(k):
                if (X.season_of(cache['v'][k].get('t')) or 1) != (X.season_of(cache['v'][v].get('t')) or 1):
                    return False      # 不同季
                rk = info[k]['rg']
                if rk and rv and rk[0] == rv[0] and abs(rk[1] - rv[1]) <= max(rk[1], rv[1]) * 0.2:
                    return True      # 同一部的完整合輯，重複上傳（1~38 集、1~41 集）
                return (rk == rv or info[k]['t'] == info[v]['t']) and d and abs((cache['v'][k].get('d') or 0) - d) / d < 0.12
            same = [k for k in keep if near(k)]
            if same:
                dupe_in_group.add(v)
                continue
            keep.append(v)
        vids = keep
        if len(vids) < 2:
            continue
        vids.sort(key=lambda v: ((X.season_of(cache['v'][v].get('t')) or 1), (info[v]['rg'] or (info[v]['ep'] or 0, 0))[0], cache['v'][v].get('p') or 0))
        name = X.nice_show(s2t(info[vids[0]]['show']))
        if name and X._name_ok(name):
            cands[cid].append({'id': 'g:%s:%s' % (cid[2:10], hashlib.sha1(key.encode()).hexdigest()[:10]), 'n': name, 'c': cid,
                               'k': pool[cid].get('k') or 'toon', 'eps': vids, 'upd': 0})
    # 同一個頻道裡同名的作品（全部集數＋分季清單）：留集數多的
    for cid, lst in cands.items():
        best = {}
        for sh in lst:
            k = X.norm(sh['n'])
            if k not in best or len(sh['eps']) > len(best[k]['eps']):
                best[k] = sh
        cands[cid] = list(best.values())

    # ---- 跨頻道重複的合輯（同一部被好幾台搬）：留觀看最多的
    dups = set(dupe_in_group)
    comp_key = collections.defaultdict(list)
    for vid, x in info.items():
        if x['f'] in ('c', 'm') and x['show']:
            comp_key[X.norm(x['show'])].append(vid)
    for key, vids in comp_key.items():
        if len(vids) < 2:
            continue
        vids.sort(key=lambda v: -(cache['v'][v].get('v') or 0))
        bd = cache['v'][vids[0]].get('d') or 0
        for v in vids[1:]:
            d = cache['v'][v].get('d') or 0
            same_ch = cache['v'][v]['c'] == cache['v'][vids[0]]['c']
            if bd and d and abs(d - bd) / bd < (0.03 if same_ch else 0.12) and (not same_ch or info[v]['f'] == 'm'):
                dups.add(v)

    # ---- 每個頻道照預算挑：先挑作品（熱度、新舊、份量），再補單支的新片與熱門
    per_ch = collections.defaultdict(list)
    for vid, x in info.items():
        if vid not in dups:
            per_ch[x['v']['c']].append(vid)
    shows, chosen = [], set()
    for cid in pool:
        r = pool[cid]
        kind = r.get('k') or 'toon'
        budget = KIDS_BUDGET if r.get('kids') else BUDGET.get(kind if kind != 'auto' else 'ai', 120)
        used = 0

        def sscore(sh):
            sc = [vscore(v) for v in sh['eps'][:EP_CAP]]
            latest = max([cache['v'][v].get('p') or 0 for v in sh['eps']] + [sh.get('upd') or 0])
            age = (NOW - latest) / 86400 if latest else 120
            return max(sc) + sum(sorted(sc)[-5:]) / 10 + (1.4 if age < 14 else 0.7 if age < 60 else 0) + min(1, len(sh['eps']) / 24) * 0.5
        for sh in sorted(cands.get(cid, []), key=sscore, reverse=True):
            eps = [v for v in sh['eps'] if v not in dups][:EP_CAP]
            if not eps:
                continue
            n = len([v for v in eps if v not in chosen])
            if used + n > budget * 0.8 and used > 0:
                continue
            sh['eps'] = eps
            shows.append(sh)
            chosen.update(eps)
            used += n
        rest = [v for v in per_ch.get(cid, []) if v not in chosen]
        main_ = sorted([v for v in rest if info[v]['f'] in ('c', 'e', 'm')], key=vscore, reverse=True)
        room = max(24, budget - used)
        chosen.update(main_[:room])
        shorts = sorted([v for v in rest if info[v]['f'] == 's'], key=lambda v: -(cache['v'][v].get('v') or 0))
        chosen.update(shorts[:20])
        lives = [v for v in rest if info[v]['f'] == 'l' or cache['v'][v].get('lv') in ('live', 'upcoming')]
        chosen.update([v for v in lives if cache['v'][v].get('lv') in ('live', 'upcoming') or NOW - (cache['v'][v].get('p') or 0) < 3 * 86400][:6])

    # ---- 輸出
    chs = sorted({info[v]['v']['c'] for v in chosen})
    ci = {c: i for i, c in enumerate(chs)}
    ch_out = []
    for c in chs:
        r = pool[c]
        o = {'n': nice_ch(r.get('n') or r.get('seed') or c), 'a': r.get('a'), 'k': r.get('k') if r.get('k') != 'auto' else 'ai', 'l': r.get('l') or 'zh', 'vm': vm.get(c)}
        for f in ('h', 'geo', 'live', 'kids', 'official'):
            if r.get(f):
                o[f] = r[f]
        if r.get('src') == 'add':
            o['add'] = 1
        ch_out.append({k: v for k, v in o.items() if v is not None})
    vid_list = sorted(chosen, key=lambda v: (ci[info[v]['v']['c']], -(cache['v'][v].get('p') or 0)))
    vi = {v: i for i, v in enumerate(vid_list)}
    show_out, show_of = [], {}
    for sh in shows:
        eps = [v for v in sh['eps'] if v in vi]
        if not eps:
            continue
        k = len(show_out)
        for v in eps:
            show_of.setdefault(v, k)
        ts = [cache['v'][v].get('p') or (cache['v'][v].get('newep') or 0) for v in eps]
        cover = max(eps[:30], key=lambda v: cache['v'][v].get('v') or 0)
        o = {'id': sh['id'], 'n': sh['n'][:60], 'c': ci[sh['c']], 'k': sh['k'] if sh['k'] != 'auto' else 'ai', 'eps': [vi[v] for v in eps], 't': max(ts + [sh.get('upd') or 0]), 'cv': vi[cover]}
        if sh.get('pl'):
            o['pl'] = sh['pl']
        show_out.append(o)
    vids_out, chap = [], {}
    for v in vid_list:
        x = info[v]
        c = cache['v'][v]
        fl = (1 if x['ai'] else 0) | (2 if x['zh'] else 0) | (4 if c.get('chap') else 0) | (8 if c.get('lv') == 'upcoming' else 0) | (16 if c.get('lv') == 'live' else 0)
        p = c.get('p') or c.get('newep') or 0
        if c.get('lv') == 'upcoming' and c.get('st'):
            p = c['st']
        t = x['t']
        sk = show_of.get(v, -1)
        if sk >= 0:
            short = shorten(t, show_out[sk]['n'], x['ep'])
            if short:
                t = short
        rg = x['rg'] or (0, 0)
        t = cut(t, TITLE_MAX)
        vids_out.append([v, ci[c['c']], t, c.get('d') or 0, p, c.get('v') or 0, x['f'], fl, sk, x['ep'] or 0, rg[0], rg[1]])
        if c.get('chap'):
            chap[v] = c['chap']
    return {'v': 1, 'at': stamp(), 'key': bool(KEY), 'chs': chs, 'ch': ch_out, 'vids': vids_out, 'shows': show_out, 'chap': chap}


def shorten(t, show, ep=None):
    """作品裡的單集標題：拿掉作品名（連同包住它的《》【】），只留這一集的資訊（第 12 話【標題】）。"""
    r = _shorten(t, show)
    if r and ep:
        r2 = re.sub(r'^(?:EP|E|Ep|第)\s*0*%d(?![\d季部~～\-])\s*[集話话回]?(?:\s*[｜|:：\-–—]\s*|\s+)' % ep, '', r)
        r2 = re.sub(r'\s*[｜|]\s*S\d{1,2}$', '', r2).strip()
        if len(r2) >= 2:
            r = r2
    return r


def cut(t, n):
    """截斷標題；截到一半的括號整段拿掉。"""
    if len(t) <= n:
        return t
    t = t[:n]
    t = re.sub(r'\s*[\[【《(（「][^\]】》)）」]{0,16}$', '', t)
    return t.rstrip(' ｜|,，、:：-–—')


def _shorten(t, show):
    if not show:
        return None
    base0 = re.sub(r'（[^）]*）$', '', show)
    tail_cut = None
    for cand in (show, base0):
        if len(cand) >= 2:
            t2 = re.sub(r'\s*[《【「『]\s*' + re.escape(cand) + r'\s*[》】」』]\s*$', '', t)      # 結尾的【作品名】
            if t2 != t and len(t2) >= 2:
                t = tail_cut = t2
                break
    base = re.sub(r'（[^）]*）$', '', show)
    for cand in (show, base):
        if len(cand) < 2:
            continue
        k = t.find(cand)
        if k < 0 or k > 16 or (k > 6 and t[k - 1] not in '《【「『'):
            continue
        # 整組括號一起拿掉：《作品名/English》、【作品名】
        m = re.search(r'[《【「『][^》】」』]*' + re.escape(cand) + r'[^》】」』]*[》】」』]', t)
        rest = (t[:m.start()] + ' ' + t[m.end():]) if m else (t[:k] + ' ' + t[k + len(cand):])
        rest = re.sub(r'【\s*】|《\s*》|「\s*」|\(\s*\)|（\s*）', ' ', rest)
        for lang in ('國語', '粵語', '日語'):
            if lang in show:
                rest = rest.replace('【' + lang + '】', ' ')
        rest = re.sub(r'^[\s｜|丨:：\-–—/》】」』]+|[\s｜|丨:：\-–—/《【「『]+$', '', rest)
        rest = re.sub(r'\s+', ' ', rest).strip()
        if len(rest) >= 2:
            return rest
    return tail_cut.strip(' ｜|丨:：-–—') if tail_cut else None


if __name__ == '__main__':
    main()
