#!/usr/bin/env python3
"""《解包 UNPACKED》資料管線：GitHub Actions 每小時跑一次（也會在 track.json 變動時跑）。

做四件事，全部只用 Steam 的公開端點（不用金鑰）：
1. 追蹤清單（data/track.json，由 publish.py 從專題自動產生）裡每一款 Steam 遊戲：
   台灣區價格與折扣、全球評價、繁中玩家評價、目前同上人數、主視覺／截圖／預告、語言、標籤。
   → data/live.json（清單用的精簡版）＋ data/live/<appid>.json（預告、截圖、介紹，點開才載）
     ＋ data/hist/<appid>.json（價格、同上、評價的歷史，App 畫曲線、算史低）
2. 給每日寫稿用的選題候選 → data/candidates.json
   （同上排行、熱銷、新品、即將推出、願望清單熱門；已經寫過的標 covered）
3. 痞子葳的 Steam 願望單（獵價分頁）→ data/wish.json：每一款的台灣區價格、特價開始時間與結束時間、
   追蹤以來最低價（價格歷史也記在 hist/<appid>.json 的 pr）。Steam 代號放在 GitHub Actions 的密碼 UNP_STEAM
   （不公開）；沒有設就讀 data/wish-cfg.json 的 steam（會公開在 repo 裡）。代號絕對不寫進 log 和輸出檔。
4. 只在資料真的有變時寫檔（時間戳以外），讓 git 不會每輪都多一個空 commit。

用法：
  python3 live.py --data apps/unpacked/data            # 正式（Actions）
  python3 live.py --data /tmp/x --offline fixtures/    # 本機測試：讀假資料，不連網
"""
import argparse
import datetime as dt
import hashlib
import html as htmllib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

UTC = dt.timezone.utc
TW = dt.timezone(dt.timedelta(hours=8))

GETITEMS = 'https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json='
TAGLIST = 'https://api.steampowered.com/IStoreService/GetTagList/v1/?language=tchinese'
PLAYERS = 'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid={}'
MOSTPLAYED = 'https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/'
FEATURED = 'https://store.steampowered.com/api/featuredcategories/?cc=TW&l=tchinese'
# 舊的 store.steampowered.com/appreviews 在 2026-10-22 停用（會回整頁 HTML），改用官方 WebAPI。
# purchase_type 1＝全部（預設 0 只算 Steam 購買，免費遊戲會變 0 則）；filter 1＝最新（預設的「最有幫助」會只算近 30 天）
REVIEWS = 'https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?input_json='
SEARCH = 'https://store.steampowered.com/search/results/?filter={}&json=1&cc=TW&l=tchinese'
# 推坑候選：照使用者評價排序的遊戲（category1=998 只要遊戲本體），另一份只看特價中的
GEMS = 'https://store.steampowered.com/search/results/?sort_by=Reviews_DESC&category1=998&start=0&count=50&json=1&cc=TW&l=tchinese{}'
# 願望單：公開的願望單不用金鑰（Steam 個人檔案「隱私設定 → 遊戲詳細資料」要是公開）
WISH = 'https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid={}'
VANITY = 'https://steamcommunity.com/id/{}/?xml=1'
WISH_MEDIA = 40            # 特價中的願望單遊戲另外抓動態預告（最多這麼多款）
# 行情板：Steam 線上人數排行（先試一次拿到前百名的現在人數；不行就一款一款問）
CONC = 'https://api.steampowered.com/ISteamChartsService/GetGamesByConcurrentPlayers/v1/?input_json='
BOARD_N = 100
BOARD_H = 30 * 60          # 每小時的樣本留 30 小時（算「比 24 小時前」）
BOARD_SP = 7.2 * 1440      # 走勢線留 7 天多一點
BOARD_SP_GAP = 210         # 走勢線的樣本至少隔 3.5 小時
BOARD_DAYS = 120           # 每日高峰留 120 天
# 免費補給站：三家官方商店的「限時免費領」
# Epic：country=TW 的回傳會漏掉每週送的遊戲（2026-11-18 實測：Knightica、Mark of the Deep 只出現在 US），所以用 US 的清單、中文標題
EPIC_FREE = 'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=zh-Hant&country=US&allowCountries=US'
STEAM_FREE = 'https://store.steampowered.com/search/results/?maxprice=free&specials=1&category1=998&json=1&cc=TW&l=tchinese'
GOG_FREE = 'https://catalog.gog.com/v1/catalog?limit=48&order=desc:trending&discounted=eq:true&price=between:0,0&productType=in:game,pack&page=1&countryCode=TW&locale=zh-Hant&currencyCode=TWD'
ASSET = 'https://shared.akamai.steamstatic.com/store_item_assets/'
VIDEO = 'https://video.akamai.steamstatic.com/store_trailers/'
CTX = {'language': 'tchinese', 'country_code': 'TW', 'steam_realm': 1}
LANG_TC, LANG_SC = 7, 6
ADULT = {3, 4}

HOT_MAX = 120              # 每輪都更新：最近寫的、盯上市的、還沒抓過的（最多這麼多款，新的優先）
FRESH_DAYS = 120           # 「最近寫的」＝這幾天內
ROTATE = 40                # 其餘的每輪輪流更新這麼多款（最久沒更新的先）：再多款也至少一天輪到一次
HIST_PL = 720              # 同上紀錄（每小時一筆 ≈ 30 天）
HIST_PR = 240
HIST_RV = 240
UA = 'Mozilla/5.0 (UNPACKED data pipeline; +https://pzwei0105.github.io/PZ-Games/apps/unpacked/)'

OFFLINE = None
ERRS = []   # 這一輪出錯的地方（寫進 live.json 的 errs，維護時看）


def now():
    return dt.datetime.now(UTC)


def iso(t):
    return t.astimezone(UTC).strftime('%Y-%m-%dT%H:%M:%SZ')


def get_json(url, timeout=40, tries=3):
    if OFFLINE is not None:
        key = re.sub(r'[^a-zA-Z0-9]+', '_', url)[:180]
        p = os.path.join(OFFLINE, key + '.json')
        if os.path.exists(p):
            with open(p, encoding='utf-8') as f:
                return json.load(f)
        raise RuntimeError('offline: no fixture ' + key)
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                raw = r.read().decode('utf-8-sig', 'replace')   # Steam 的評論 API 會帶 BOM
            try:
                return json.loads(raw)
            except ValueError as e:
                raise ValueError(f'不是 JSON（{len(raw)} bytes）：{raw[:70]!r}') from e
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f'{type(last).__name__}: {last}')


def get_text(url, timeout=30, tries=2):
    if OFFLINE is not None:
        key = re.sub(r'[^a-zA-Z0-9]+', '_', url)[:180]
        p = os.path.join(OFFLINE, key + '.txt')
        if os.path.exists(p):
            with open(p, encoding='utf-8') as f:
                return f.read()
        raise RuntimeError('offline: no fixture ' + key)
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f'{type(last).__name__}: {last}')


def api(base, payload):
    return base + urllib.parse.quote(json.dumps(payload, ensure_ascii=False, separators=(',', ':')))


def load(path, default):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return default


def save_if_changed(path, obj, ignore=('at',)):
    """寫檔；如果除了時間戳以外完全一樣就不寫（回傳有沒有寫）。"""
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


# ------------------------------------------------------------------ 寫稿之後（2026-11-18）：官方公告＋變化紀錄
# 每一款都記下「上次確認的樣子」（base），之後每輪比對：加了繁中、上市、推出正式版、改免費、原價調整、評價大轉向、
# 開放工作坊（Mod），就在 chg 記一筆（附時間）。同一個變化要連續兩輪都看到才算數，Steam 偶爾回傳不完整的資料不會變成假消息。
# 官方公告（Steam 社群公告：更新、修正、活動）放 news：每款約 6 小時看一次，沒有新公告就不動檔案。
# App 拿「寫稿（或回訪改寫）之後」的 chg 和 news 做成「寫稿之後」；stale.json 給列表小標、首頁追蹤牆和排程的舊稿回訪用。
NEWS = 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid={}&count=10&maxlength=600&feeds=steam_community_announcements&format=json'
NEWS_N = 8            # 每款留最新幾則
PATCH_RE = re.compile(r'\b(patch(es)?|hot-?fix(es)?|changelog|patch notes)\b|\b(major|big|content|free)\s+update\b|\bv?\d+\.\d+(\.\d+)?\b'
                      r'|更新內容|更新說明|版本更新|大型更新|改版|修正|補丁', re.I)
RV_MIN = 200          # 評論數夠多，好評率的變化才算數
RV_SWING = 8          # 好評率差幾個百分點才算「大轉向」


def _clean_news(s):
    s = re.sub(r'\[(img|video|previewyoutube)\b[^\]]*\].*?\[/\1\]', ' ', s or '', flags=re.I | re.S)
    s = re.sub(r'\{STEAM_CLAN_IMAGE\}\S*', ' ', s)
    s = re.sub(r'\[/?[a-zA-Z0-9*]+(?:[= ][^\]]*)?\]', ' ', s)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = re.sub(r'https?://\S+', ' ', htmllib.unescape(s))
    s = re.sub(r'\s+', ' ', s.replace('\u2019', "'").replace('\u2018', "'")).strip()   # 彎引號在中文字型裡是全形，英文縮寫會開天窗
    return (s[:150].rstrip() + '…') if len(s) > 150 else s


def news(appid):
    """Steam 社群公告（開發商自己發的）最新幾則，新的在前；讀不到回 None（沿用上一輪的）。"""
    try:
        d = get_json(NEWS.format(appid), timeout=20, tries=1)
    except Exception:  # noqa: BLE001
        return None
    out = []
    for n in (d.get('appnews') or {}).get('newsitems') or []:
        t = re.sub(r'\s+', ' ', htmllib.unescape(n.get('title') or '').replace('\u2019', "'").replace('\u2018', "'")).strip()
        try:
            ts = int(n.get('date') or 0)
        except (TypeError, ValueError):
            ts = 0
        if not t or ts <= 0:
            continue
        u = n.get('url') or ''
        out.append(_nonull({'t': t[:140], 'd': iso(dt.datetime.fromtimestamp(ts, UTC)), 'u': u if u.startswith('https://') else None,
                            'k': 'patch' if ('patchnotes' in (n.get('tags') or []) or PATCH_RE.search(t)) else 'news',
                            'x': _clean_news(n.get('contents')) or None}))
    out.sort(key=lambda r: r['d'], reverse=True)
    return out[:NEWS_N]


def news_due(prev, appid, t0):
    """這一輪要不要看官方公告：沒看過的要；每輪都更新的熱門款每 6 小時一次（照 appid 錯開）；輪流更新的冷門款每次輪到都看。
    不存「上次看的時間」：存了每幾小時就得改一次檔案，典藏越多越拖。"""
    if prev.get('news') is None:
        return True
    try:
        gap = (t0 - dt.datetime.strptime(prev.get('at') or '', '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=UTC)).total_seconds()
    except ValueError:
        return True
    import zlib   # appid 大多是 10 的倍數，直接取餘數會擠在同幾個小時：雜湊一下平均分到 6 個時段
    return gap >= 5 * 3600 or (int(t0.timestamp() // 3600) + zlib.crc32(str(appid).encode())) % 6 == 0


def _snap(x):
    lg, p, rv, rel = x.get('langs') or {}, x.get('price') or {}, x.get('rv') or {}, x.get('rel') or {}
    return {'zh': 'tc' if 'tc' in lg else 'sc' if 'sc' in lg else 'none',
            'soon': bool(rel.get('soon')), 'ea': bool(rel.get('ea')), 'free': bool(x.get('free')),
            # 特價期間 Steam 偶爾把「最划算的買法」換成組合包，原價會跟著跳：特價中不比原價
            'orig': None if x.get('free') or (p.get('disc') or 0) > 0 else p.get('orig'),
            'rv': rv.get('pct') if (rv.get('n') or 0) >= RV_MIN else None,
            'ws': x.get('ws')}            # None＝這輪沒拿到分類資料（不能當成沒有工作坊）


def _moved(k, a, b):
    if a is None or b is None:
        return False
    if k == 'rv':
        return abs(b - a) >= RV_SWING
    if k == 'orig':
        return abs(b - a) >= max(1000, a * 0.1)
    return a != b


def _event(k, a, b, now):
    """確認了的變化裡，值得記下來給人看的。其餘（例如拿掉繁中、免費改付費）只默默更新基準。"""
    if k == 'zh' and (b == 'tc' or (a == 'none' and b == 'sc')):
        return {'k': 'zh', 'a': a, 'b': b}
    if k == 'soon' and a and not b:
        return {'k': 'rel', 'b': 'ea' if now['ea'] else 'out'}
    if k == 'ea' and a and not b and not now['soon']:
        return {'k': 'ea'}
    if k == 'free' and b and not a:
        return {'k': 'free'}
    if k in ('orig', 'rv'):
        return {'k': k, 'a': a, 'b': b}
    if k == 'ws' and b and not a:
        return {'k': 'ws'}
    return None


def track_changes(prev, x, t0):
    """跟上次確認的樣子（base）比；第一次看到（或還沒有 base 的舊資料）只記現況，不算變化。回傳 (base, pend, chg)。"""
    now, base, chg = _snap(x), prev.get('base'), list(prev.get('chg') or [])
    if not base:
        return now, {}, chg
    nb, pend = dict(base), dict(prev.get('pend') or {})
    for k, b in now.items():
        a = base.get(k)
        if b is None:                       # 這輪沒拿到：維持原樣
            continue
        if a is None:                       # 以前不知道（評論不夠、還沒定價、沒分類）：現在知道了就記下，不算變化
            nb[k] = b
            pend.pop(k, None)
            continue
        if not _moved(k, a, b):
            pend.pop(k, None)
            if k not in ('rv', 'orig'):     # 評價、原價的小幅波動不更新基準（不然慢慢漂移就永遠記不到）
                nb[k] = b
            continue
        p = pend.get(k)
        same = (_moved(k, a, p) and (b - a) * (p - a) > 0) if k in ('rv', 'orig') and p is not None else p == b
        if k in pend and same:              # 連兩輪都看到：算數
            pend.pop(k)
            nb[k] = b
            ev = _event(k, a, b, now)
            if ev:
                chg.append(_nonull(dict(ev, d=iso(t0))))
        else:
            pend[k] = b
    return nb, pend, chg[-20:]


def _chg_w(c):
    return {'rel': 3, 'ea': 3, 'free': 3, 'zh': 3 if c.get('b') == 'tc' else 2, 'orig': 2, 'rv': 2, 'ws': 2}.get(c.get('k'), 1)


def _ts(s):
    try:
        t = dt.datetime.fromisoformat(str(s or '').replace('Z', '+00:00'))
    except ValueError:
        return None
    return (t if t.tzinfo else t.replace(tzinfo=TW)).timestamp()


def _tw_md(s):
    t = _ts(s)
    if not t:
        return '?'
    d = dt.datetime.fromtimestamp(t, TW)
    return f'{d.month}/{d.day}'


def _since(it):
    """這篇最後一次對過資料的時間：updated（回訪改寫、更正都會更新它）有時間就用那個時間；
    只有日期就當那天（台灣）結束——寧可漏掉當天的變化，也不要把寫稿前就有的事說成「寫稿之後」。"""
    u = str(it.get('updated') or it.get('date') or '')
    if 'T' in u:
        return _ts(u)
    try:
        return dt.datetime.combine(dt.date.fromisoformat(u[:10]), dt.time(23, 59, 59), TW).timestamp()
    except ValueError:
        return None


def stale_items(apps, idx, pk):
    """每一篇專題、推坑：寫稿（或上次回訪改寫）之後 Steam 上發生了什麼。舊稿回訪（tools/revisit.py）也用這個。"""
    out = {}
    for kind, items in (('f', idx.get('items') or []), ('p', pk.get('items') or [])):
        for it in items:
            x = apps.get(str(it.get('steam'))) if it.get('steam') else None
            s = _since(it) if x else None
            if s is None:
                continue
            ch = [c for c in x.get('chg') or [] if (_ts(c.get('d')) or 0) > s]
            nw = [n for n in x.get('news') or [] if (_ts(n.get('d')) or 0) > s]
            if not ch and not nw:
                continue
            pt = [n for n in nw if n.get('k') == 'patch']
            e = {'since': dt.datetime.fromtimestamp(s, TW).strftime('%Y-%m-%d'), 'last': max([c['d'] for c in ch] + [n['d'] for n in nw]),
                 'score': sum(_chg_w(c) for c in ch) + min(3, len(pt)) + (1 if len(nw) > len(pt) else 0), 'nw': len(nw), 'np': len(pt)}
            if ch:
                e['ch'] = ch
            if pt:
                e['lp'] = {'t': pt[0]['t'], 'd': pt[0]['d']}
            out[f'{kind}:{it["id"]}'] = e
    return out


def stale_app(apps, idx, pk, t0):
    """App 用的（放進 live.json 的 stale，不多開一個檔＝開 App 不多等一趟網路）：只放列表小標和首頁追蹤牆用得到的——
    寫稿之後的變化（少見）、7 天內的官方更新。完整的（分數、幾則公告）給舊稿回訪用，跑 tools/revisit.py 就有，
    不塞給 App：典藏一年後完整版會變成每次開 App 都要多載幾百 KB。"""
    full, out, cut, cut3 = stale_items(apps, idx, pk), {}, t0.timestamp() - 7 * 86400, t0.timestamp() - 3 * 86400
    for ref, e in full.items():
        v = {}
        if e.get('ch'):
            v['ch'] = e['ch']
        lt = _ts((e.get('lp') or {}).get('d')) or 0
        if lt > cut:      # 7 天內的更新：列表標「剛更新」；3 天內的連標題一起（追蹤牆用）
            v['lp'] = e['lp'] if lt > cut3 else {'d': e['lp']['d']}
        if v:
            out[ref] = v
    print(f'寫稿之後：{len(full)} 篇有新動態（{sum(1 for v in full.values() if v.get("ch"))} 篇有變化），列表／追蹤牆用的 {len(out)} 篇')
    return out


# ------------------------------------------------------------------ 即時資料分兩層（典藏升級，2026-11-18）
# live.json 只放每次開 App 都要的（價格、同上、評價、語言、主視覺、動態預告）；預告清單、截圖、介紹、開發商
# 放 live/<appid>.json，App 點開那一款（專題、推坑、短影音、情報卡、圖卡）才載。累積幾千款，開 App 還是一樣快。
END_CAP = 6          # 出擊日曆：解包過的遊戲同一天特價截止最多列幾款（願望單的全部列）
LIVE_SUM = ('name', 'appid', 'free', 'adult', 'price', 'players', 'rv', 'rv_tc', 'rel', 'langs', 'tags', 'at')


def live_split(x):
    s = {k: x[k] for k in LIVE_SUM if k in x}
    img = x.get('img') or {}
    si = {k: img[k] for k in ('hero', 'header') if img.get(k)}
    if si:
        s['img'] = si
    mc = {k: v for k, v in (x.get('micro') or {}).items() if k in ('mp4', 'webm') and v}
    if mc:
        s['micro'] = mc          # mp4 給 iPhone、webm 給沒有 H.264 的瀏覽器，兩個都留（首頁海報、推坑牆直接用）
    return s, {k: v for k, v in x.items() if k not in LIVE_SUM}


def live_load(D):
    """上一輪的完整即時資料（live.json＋live/<appid>.json 合回去）。舊格式（全部都在 live.json）也讀得懂。"""
    base = load(os.path.join(D, 'live.json'), None) or {'apps': {}}
    xd = os.path.join(D, 'live')
    apps = {}
    for a, s in (base.get('apps') or {}).items():
        h = load(os.path.join(xd, f'{a}.json'), None) if os.path.isdir(xd) else None
        if h:
            x = dict(h, **s)
            for k in ('img', 'micro'):
                if h.get(k):
                    x[k] = dict(s.get(k) or {}, **h[k])
            apps[a] = x
        else:
            apps[a] = dict(s)
    base['apps'] = apps
    return base


def live_save(D, live):
    """寫 live.json（精簡）＋ live/<appid>.json（有變才寫；不再追蹤的刪掉）。回傳（live.json 有沒有寫, 寫了幾個 live/）。"""
    xd = os.path.join(D, 'live')
    os.makedirs(xd, exist_ok=True)
    summ, nx = {}, 0
    for a, x in (live.get('apps') or {}).items():
        s, h = live_split(x)
        summ[a] = s
        if h and save_if_changed(os.path.join(xd, f'{a}.json'), h):
            nx += 1
    for fn in os.listdir(xd):
        if fn.endswith('.json') and fn[:-5] not in summ:
            os.remove(os.path.join(xd, fn))
    return save_if_changed(os.path.join(D, 'live.json'), dict(live, apps=summ)), nx


# ------------------------------------------------------------------ Steam GetItems
def _join(base, fmt, name):
    if not name:
        return None
    if re.match(r'https?://', name):
        return name
    path = fmt.replace('${FILENAME}', name) if fmt and '${FILENAME}' in fmt else name
    return base + path.lstrip('/')


def _files(lst):
    out = {}
    for f in lst or []:
        if not isinstance(f, dict):
            continue
        name = f.get('filename') or f.get('cdn_path') or f.get('url')
        kind = (f.get('type') or f.get('encoding') or '').lower()
        if not name:
            continue
        if 'webm' in kind or name.endswith('.webm'):
            out.setdefault('webm', name)
        elif 'mp4' in kind or name.endswith('.mp4'):
            out.setdefault('mp4', name)
        elif 'hls' in kind or name.endswith('.m3u8'):
            out.setdefault('hls', name)
    return out


def trailers(it):
    tr = it.get('trailers') or {}
    lst = [t for t in (tr.get('highlights') or []) + (tr.get('other_trailers') or []) if isinstance(t, dict)]
    lst = [t for t in lst if t.get('all_ages', True) is not False] or lst
    micro, full = None, []
    for t in lst:
        fmt = t.get('trailer_url_format') or ''
        mt = {k: _join(VIDEO, fmt, v) for k, v in _files(t.get('microtrailer')).items() if k in ('mp4', 'webm')}
        if mt and not micro:
            micro = mt
        f = {}
        for key in ('adaptive_trailers', 'trailer_max', 'trailer_480p'):
            for k, v in _files(t.get(key)).items():
                f.setdefault(k, _join(VIDEO, fmt, v))
        if f:
            poster = t.get('screenshot_full') or t.get('screenshot_medium')
            if poster:
                f['poster'] = _join(ASSET, fmt, poster)
            f['name'] = (t.get('trailer_name') or '').strip()[:60]
            full.append({k: v for k, v in f.items() if v})
        if len(full) >= 4:
            break
    return micro, full


_ITEMS = {}   # 這一輪已經問過的（不含預告）：行情板、免費補給站跟選題候選共用，不重複問


def get_items(appids, media=True, ctx=None):
    dr = {'include_basic_info': True, 'include_assets': True, 'include_release': True, 'include_reviews': True,
          'include_tag_count': 12, 'include_supported_languages': True, 'include_platforms': True}
    if media:
        dr.update(include_screenshots=True, include_trailers=True)
    out = {}
    ids = []
    for a in appids:
        if a and a not in ids:
            if not media and a in _ITEMS:
                out[a] = _ITEMS[a]
                continue
            ids.append(a)
    for i in range(0, len(ids), 30):
        part = ids[i:i + 30]
        url = api(GETITEMS, {'ids': [{'appid': a} for a in part], 'context': ctx or CTX, 'data_request': dr})
        try:
            d = get_json(url, timeout=50)
        except Exception as e:  # noqa: BLE001
            print('GetItems fail', part[:3], e, file=sys.stderr)
            ERRS.append(f'GetItems {part[:3]}: {str(e)[:120]}')
            continue
        for it in (d.get('response') or {}).get('store_items') or []:
            if it.get('success') == 1 and (it.get('appid') or it.get('id')):
                out[int(it.get('appid') or it.get('id'))] = it
                if not ctx:
                    _ITEMS[int(it.get('appid') or it.get('id'))] = it
        time.sleep(0.4)
    return out


def norm(it, tagnames):
    """GetItems 的一款 → App 用的欄位。"""
    a = it.get('assets') or {}
    fmt = a.get('asset_url_format')
    pic = lambda k: _join(ASSET, fmt, a.get(k)) if fmt and a.get(k) else None  # noqa: E731
    appid = int(it.get('appid') or it.get('id'))
    info = it.get('basic_info') or {}
    bpo = it.get('best_purchase_option') or {}
    final = int(bpo['final_price_in_cents']) if bpo.get('final_price_in_cents') not in (None, '') else None
    orig = int(bpo['original_price_in_cents']) if bpo.get('original_price_in_cents') not in (None, '') else final
    ends = []
    for d in bpo.get('active_discounts') or []:
        try:
            ends.append(int(d.get('discount_end_date') or 0))
        except (TypeError, ValueError):
            pass
    end = max(ends) if ends and max(ends) > 0 else None
    rv = (it.get('reviews') or {}).get('summary_filtered') or {}
    rel = it.get('release') or {}
    langs = {}
    for x in it.get('supported_languages') or []:
        e = x.get('elanguage')
        if e in (LANG_TC, LANG_SC) and x.get('supported'):
            langs['tc' if e == LANG_TC else 'sc'] = {'ui': True, 'audio': bool(x.get('full_audio')), 'sub': bool(x.get('subtitles'))}
    tags = sorted(it.get('tags') or [], key=lambda t: -(t.get('weight') or 0))
    tag_zh = [tagnames.get(str(t.get('tagid'))) for t in tags]
    short = re.sub(r'\s+', ' ', htmllib.unescape(info.get('short_description') or '')).strip()
    plats = it.get('platforms') or {}
    shots = (it.get('screenshots') or {}).get('all_ages_screenshots') or []
    shots = sorted([s for s in shots if isinstance(s, dict) and s.get('filename')], key=lambda s: s.get('ordinal') or 0)
    micro, full = trailers(it)
    ts = rel.get('steam_release_date')
    x = {
        'appid': appid,
        'name': (it.get('name') or '').strip(),
        'url': f'https://store.steampowered.com/app/{appid}/',
        'free': bool(it.get('is_free')) or (final == 0 and not bpo.get('discount_pct')),
        'price': {'final': final, 'orig': orig, 'disc': int(bpo.get('discount_pct') or 0),
                  'fmt': (bpo.get('formatted_final_price') or '').replace('NT$ ', 'NT$').strip() or None,
                  'end': iso(dt.datetime.fromtimestamp(end, UTC)) if end and int(bpo.get('discount_pct') or 0) > 0 else None},
        'rv': {'n': rv.get('review_count') or 0, 'pct': rv.get('percent_positive') if rv.get('review_count') else None,
               'label': rv.get('review_score_label') if rv.get('review_count') else None},
        'rel': {'date': dt.datetime.fromtimestamp(ts, UTC).strftime('%Y-%m-%d') if ts else None,
                'soon': bool(rel.get('is_coming_soon') or it.get('is_coming_soon')),
                'ea': bool(rel.get('is_early_access')),
                'text': rel.get('custom_release_date_message') or None},
        'langs': langs,
        'tags': [t for t in tag_zh if t][:8],
        'dev': ', '.join((d.get('name') or '').strip() for d in (info.get('developers') or [])[:2]),
        'pub': ', '.join((d.get('name') or '').strip() for d in (info.get('publishers') or [])[:2]),
        'short': short[:300],
        'plat': [k for k, v in (('win', plats.get('windows')), ('mac', plats.get('mac')), ('linux', plats.get('steamos_linux')), ('deck', (plats.get('steam_deck_compat_category') or 0) >= 3)) if v],
        'adult': bool(ADULT & set(it.get('content_descriptorids') or [])),
        'ws': (30 in (it['categories'].get('feature_categoryids') or [])) if isinstance(it.get('categories'), dict) else None,   # Steam 工作坊（可以裝 Mod）
        'img': {k: v for k, v in (('hero', pic('library_hero')), ('header', pic('header')), ('wide', pic('main_capsule')),
                                  ('box', pic('library_capsule')), ('bg', pic('page_background'))) if v},
        'shots': [_join(ASSET, '', s['filename']) for s in shots[:10]],
    }
    if micro:
        x['micro'] = micro
    if full:
        x['trailers'] = full
    if x['ws'] is None:
        del x['ws']
    return x


def tagnames():
    try:
        d = get_json(TAGLIST)
        return {str(t['tagid']): t['name'] for t in (d.get('response') or {}).get('tags') or []}
    except Exception as e:  # noqa: BLE001
        print('taglist fail', e, file=sys.stderr)
        return {}


def players(appid):
    try:
        d = get_json(PLAYERS.format(appid), timeout=20, tries=2)
        r = d.get('response') or {}
        if r.get('result') == 1:
            return int(r.get('player_count') or 0)
    except Exception as e:  # noqa: BLE001
        print('players fail', appid, e, file=sys.stderr)
        ERRS.append(f'players {appid}: {str(e)[:120]}')
    return None


def reviews(appid, lang):
    try:
        d = get_json(api(REVIEWS, {'appid': appid, 'languages': [lang], 'filter': 1, 'purchase_type': 1, 'num_per_page': 1, 'display_language': 'tchinese'}), timeout=25, tries=2)
        d = d.get('response', d)
        q = d.get('query_summary') or {}
        tot = int(q.get('total_reviews') or 0)
        pos = int(q.get('total_positive') or 0)
        return {'n': tot, 'pos': pos, 'pct': round(pos * 100 / tot) if tot else None, 'label': q.get('review_score_desc')}
    except Exception as e:  # noqa: BLE001
        print('reviews fail', appid, lang, e, file=sys.stderr)
        ERRS.append(f'reviews {appid} {lang}: {str(e)[:120]}')
        return None


# ------------------------------------------------------------------ history math
def tmin(t):
    return int(t.timestamp() // 60)


def push_cap(lst, row, cap, dedupe_last=False):
    if dedupe_last and lst and lst[-1][1:] == row[1:]:
        return lst
    lst.append(row)
    return lst[-cap:]


def summarize(h, t_now):
    """從歷史算出：24 小時前後的同上變化、紀錄到的最高、史低、近 7 天新評價的好評率。"""
    out = {}
    pl = h.get('pl') or []
    if pl:
        cur = pl[-1][1]
        peak = max(pl, key=lambda r: r[1])
        out['peak'] = {'n': peak[1], 'at': iso(dt.datetime.fromtimestamp(peak[0] * 60, UTC))}
        target = tmin(t_now) - 24 * 60
        prev = None
        for r in pl:
            if r[0] <= target + 90:
                prev = r
        if prev and prev[1] and prev is not pl[-1]:
            out['d24'] = round((cur - prev[1]) * 100 / prev[1])
    pr = h.get('pr') or []
    vals = [r[1] for r in pr if r[1] is not None]
    if vals:
        lo = min(vals)
        at = next(r[0] for r in pr if r[1] == lo)
        out['low'] = {'v': lo, 'at': iso(dt.datetime.fromtimestamp(at * 60, UTC)), 'since': iso(dt.datetime.fromtimestamp(pr[0][0] * 60, UTC))}
    rv = h.get('rv') or []
    if len(rv) >= 2:
        last = rv[-1]
        base = None
        for r in rv:
            if r[0] <= last[0] - 7 * 24 * 60:
                base = r
        if base is None:
            base = rv[0]
        dn = last[2] - base[2]
        dp = last[1] - base[1]
        if dn >= 40 and last[0] - base[0] >= 24 * 60:
            out['recent'] = {'pct': round(dp * 100 / dn), 'n': dn, 'days': round((last[0] - base[0]) / 1440)}
    return out


# ------------------------------------------------------------------ candidates
def candidates(covered, tagn, picked=frozenset(), mine=frozenset()):
    out = {'at': iso(now())}
    try:
        d = get_json(MOSTPLAYED)
        ranks = (d.get('response') or {}).get('ranks') or []
        out['most_played'] = [{'appid': int(r['appid']), 'rank': r.get('rank'), 'last_week': r.get('last_week_rank'),
                               'peak': r.get('peak_in_game')} for r in ranks[:100] if r.get('appid')]
    except Exception as e:  # noqa: BLE001
        out['most_played_err'] = str(e)[:200]
    try:
        d = get_json(FEATURED)
        for k, key in (('top_sellers', 'top_sellers'), ('new_releases', 'new_releases'), ('coming_soon', 'coming_soon'), ('specials', 'specials')):
            items = (d.get(key) or {}).get('items') or []
            out[k] = [{'appid': int(x['id']), 'name': x.get('name'), 'disc': x.get('discount_percent'),
                       'final': x.get('final_price'), 'img': x.get('header_image')} for x in items[:30] if x.get('id')]
    except Exception as e:  # noqa: BLE001
        out['featured_err'] = str(e)[:200]
    for f in ('popularwishlist', 'popularnew'):
        try:
            d = get_json(SEARCH.format(f))
            items = d.get('items') or []
            lst = []
            for x in items[:30]:
                m = re.search(r'/apps/(\d+)/', x.get('logo') or '')
                if m:
                    lst.append({'appid': int(m.group(1)), 'name': x.get('name')})
            out['wish' if f == 'popularwishlist' else 'trending_new'] = lst
        except Exception as e:  # noqa: BLE001
            out[f + '_err'] = str(e)[:200]
    for key, extra in (('gems', ''), ('gems_sale', '&specials=1')):
        try:
            d = get_json(GEMS.format(extra))
            lst = []
            for x in (d.get('items') or [])[:50]:
                m = re.search(r'/apps/(\d+)/', x.get('logo') or '')
                if m:
                    lst.append({'appid': int(m.group(1)), 'name': x.get('name')})
            out[key] = lst
        except Exception as e:  # noqa: BLE001
            out[key + '_err'] = str(e)[:200]
            ERRS.append(f'{key}: {str(e)[:120]}')
    # 補名字、標籤、評價、價格（同上排行沒有名字）
    need = []
    for k in ('most_played', 'top_sellers', 'new_releases', 'coming_soon', 'specials', 'wish', 'trending_new', 'gems', 'gems_sale'):
        for x in out.get(k) or []:
            if x['appid'] not in need:
                need.append(x['appid'])
    info = get_items(need[:400], media=False) if need else {}
    for k in ('most_played', 'top_sellers', 'new_releases', 'coming_soon', 'specials', 'wish', 'trending_new', 'gems', 'gems_sale'):
        for x in out.get(k) or []:
            it = info.get(x['appid'])
            x['covered'] = x['appid'] in covered
            if x['appid'] in picked:
                x['picked'] = True
            if x['appid'] in mine:
                x['mine'] = True        # 在痞子葳的 Steam 願望單上
            if it:
                n = norm(it, tagn)
                x['name'] = n['name'] or x.get('name')
                x['tags'] = n['tags'][:5]
                x['rv'] = n['rv']
                x['free'] = n['free']
                x['price'] = n['price'].get('fmt')
                if n['price'].get('disc'):
                    x['disc'] = n['price']['disc']
                x['rel'] = n['rel']
                x['zh'] = 'tc' if 'tc' in n['langs'] else 'sc' if 'sc' in n['langs'] else None
                if n['adult']:
                    x['adult'] = True
    return out


# ------------------------------------------------------------------ 願望單（獵價）
def wish_cfg(D):
    """Steam 代號：先看 Actions 的密碼 UNP_STEAM，沒有才看 data/wish-cfg.json。可以是個人檔案網址、自訂網址名稱或 17 位數代號。"""
    raw = (os.environ.get('UNP_STEAM') or '').strip()
    if not raw:
        raw = str((load(os.path.join(D, 'wish-cfg.json'), {}) or {}).get('steam') or '').strip()
    return raw


def resolve_steamid(raw):
    m = re.search(r'(7656119\d{10})', raw)
    if m:
        return m.group(1)
    m = re.search(r'steamcommunity\.com/id/([A-Za-z0-9_-]{2,64})', raw)
    v = m.group(1) if m else (raw if re.fullmatch(r'[A-Za-z0-9_-]{2,64}', raw) else None)
    if not v:
        return None
    t = get_text(VANITY.format(urllib.parse.quote(v)))
    m = re.search(r'<steamID64>\s*(\d{17})\s*</steamID64>', t)
    return m.group(1) if m else None


def wishlist(D, t0, tagn):
    """痞子葳的 Steam 願望單 → data/wish.json。回傳願望單上的 appid（給選題候選標「在願望單上」）。
    輸出檔是公開的：只放遊戲資料，不放 Steam 代號；錯誤訊息也不帶代號。"""
    path = os.path.join(D, 'wish.json')
    old = load(path, {}) or {}
    raw = wish_cfg(D)
    if not raw:
        save_if_changed(path, {'at': iso(t0), 'ok': False, 'state': 'unset', 'n': 0, 'items': []})
        print('wish: 還沒設定 Steam 代號')
        return set()
    try:
        sid = resolve_steamid(raw)
    except Exception as e:  # noqa: BLE001
        sid = None
        ERRS.append(f'wish vanity: {str(e)[:80]}')
    if not sid:
        save_if_changed(path, {'at': iso(t0), 'ok': False, 'state': 'badid', 'n': 0, 'items': old.get('items') or []})
        print('wish: Steam 代號認不出來')
        return {x['appid'] for x in old.get('items') or []}
    if os.environ.get('GITHUB_ACTIONS'):
        print('::add-mask::' + sid)          # 公開 repo 的 log 誰都看得到：遮掉
    try:
        d = get_json(WISH.format(sid), timeout=30)
    except Exception as e:  # noqa: BLE001
        msg = str(e).replace(sid, '…')[:120]
        ERRS.append('wish: ' + msg)
        keep = dict(old, at=iso(t0), ok=bool(old.get('items')), state='stale', err='這一輪讀不到願望單，先顯示上一次的資料')
        save_if_changed(path, keep)
        return {x['appid'] for x in old.get('items') or []}
    rows = (d.get('response') or {}).get('items')
    if not rows:
        save_if_changed(path, {'at': iso(t0), 'ok': False, 'state': 'empty', 'n': 0, 'items': []})
        print('wish: 讀到 0 款（願望單是空的，或「遊戲詳細資料」沒有公開）')
        return set()
    rows = sorted([x for x in rows if x.get('appid')], key=lambda x: (x.get('priority') or 9999, -(x.get('date_added') or 0)))
    appids = [int(x['appid']) for x in rows]
    info = get_items(appids, media=False)
    sale_ids = [a for a in appids if info.get(a) and int(((info[a].get('best_purchase_option') or {}).get('discount_pct')) or 0) > 0][:WISH_MEDIA]
    media = get_items(sale_ids, media=True) if sale_ids else {}
    first = not old.get('ok')
    prev = {x['appid']: x for x in old.get('items') or []}
    items = []
    tm = tmin(t0)
    for x in rows:
        a = int(x['appid'])
        it = info.get(a)
        if not it:
            if a in prev:
                items.append(prev[a])        # 這一輪 Steam 沒回：先留上一次的
            continue
        n = norm(it, tagn)
        pr = n['price']
        hp = os.path.join(D, 'hist', f'{a}.json')
        h = load(hp, {'pl': [], 'pr': [], 'rv': [], 'rt': []})
        if pr['final'] is not None:
            h['pr'] = push_cap(h.get('pr') or [], [tm, pr['final']], HIST_PR, dedupe_last=True)
            save_if_changed(hp, h)
        low = summarize(h, t0).get('low')
        row = {
            'appid': a,
            'added': dt.datetime.fromtimestamp(x['date_added'], UTC).strftime('%Y-%m-%d') if x.get('date_added') else None,
            'pri': x.get('priority'),
            'name': n['name'], 'img': n['img'].get('header'), 'cap': n['img'].get('wide'),
            'free': n['free'], 'p': [pr['final'], pr['orig'], pr['disc']],
            'rv': [n['rv']['pct'], n['rv']['n'], n['rv']['label']],
            'rel': n['rel'], 'zh': 'tc' if 'tc' in n['langs'] else 'sc' if 'sc' in n['langs'] else None,
            'tags': n['tags'][:4], 'dev': n['dev'], 'short': n['short'][:160], 'deck': 'deck' in n['plat'],
        }
        if n['adult']:
            row['adult'] = True
        if low:
            row['low'] = [low['v'], low['at'][:10], low['since'][:10]]
        if pr['disc'] > 0 and not n['free']:
            p0 = prev.get(a)
            if p0 and (p0.get('p') or [0, 0, 0])[2] > 0:
                frm = (p0.get('sale') or {}).get('from')                 # 還在同一波特價
            elif p0 and not first:
                frm = iso(t0)                                            # 上一輪還沒特價 → 這一輪開始
            else:
                frm = None                                               # 第一次抓／剛加進願望單：不知道從什麼時候開始
            row['sale'] = {'from': frm, 'end': pr.get('end')}
        mi = media.get(a)
        if mi:
            mc, _ = trailers(mi)
            if mc:
                row['micro'] = mc
        items.append(row)
    out = {'at': iso(t0), 'ok': True, 'state': 'ok', 'n': len(items), 'items': items}
    wrote = save_if_changed(path, out)
    print(f'wish: {len(items)} 款，特價中 {sum(1 for i in items if i.get("sale"))} 款，wrote={wrote}')
    return set(appids)


# ------------------------------------------------------------------ 行情板（Steam 線上人數前百名）
def _closest(ts, target, tol):
    """ts（分鐘）裡最接近 target 的位置；差超過 tol 分鐘就回 None。"""
    best, bd = None, tol + 1
    for i, t in enumerate(ts):
        d = abs(t - target)
        if d < bd:
            best, bd = i, d
    return best if bd <= tol else None


def _pct(cur, prev):
    if cur is None or not prev:
        return None
    return round((cur - prev) * 100 / prev, 1)


def _nonull(d):
    return {k: v for k, v in d.items() if v is not None}


def board(D, t0, tagn, cov):
    """Steam 線上人數前百名 → data/board.json（每輪）＋ data/board-d.json（每天的高峰、追蹤以來最高；換日那一輪才寫）。
    漲跌比的是 24 小時前同一時間（GitHub 的排程偶爾會晚，找前後 90 分鐘內最接近的一筆）。
    cov：appid → 'f:<id>'／'p:<id>'（解包過、推坑過的，App 可以直接點過去）。"""
    path, dpath = os.path.join(D, 'board.json'), os.path.join(D, 'board-d.json')
    old = load(path, {}) or {}
    hd = load(dpath, {}) or {}
    for k, v in (('days', []), ('pk', {}), ('ath', {}), ('nm', {})):
        hd.setdefault(k, v)
    tm = tmin(t0)
    today = t0.astimezone(TW).strftime('%Y-%m-%d')
    steam = {}
    try:
        d = get_json(MOSTPLAYED, timeout=30)
        for r in ((d.get('response') or {}).get('ranks') or [])[:BOARD_N]:
            if r.get('appid'):
                steam[int(r['appid'])] = r
    except Exception as e:  # noqa: BLE001
        ERRS.append(f'board mostplayed: {str(e)[:100]}')
    conc, src = {}, 'concurrent'
    try:
        d = get_json(api(CONC, {'context': CTX}), timeout=30, tries=2)
        for r in (d.get('response') or {}).get('ranks') or []:
            if r.get('appid') and r.get('concurrent_in_game') is not None:
                conc[int(r['appid'])] = int(r['concurrent_in_game'])
    except Exception as e:  # noqa: BLE001
        print('board concurrent fail', e, file=sys.stderr)
    if len(conc) < 50:
        src, conc = 'players', {}
        nerr = len(ERRS)
        for a in list(steam)[:BOARD_N]:
            n = players(a)
            if n is not None:
                conc[a] = n
            time.sleep(0.12)
        if len(ERRS) - nerr > 2:
            del ERRS[nerr + 2:]
    if len(conc) < 20:
        print(f'board: 這一輪只拿到 {len(conc)} 款的線上人數，先留上一輪的')
        return False
    ids = sorted(conc, key=lambda a: -conc[a])[:BOARD_N]
    info = get_items(ids, media=False)
    miss = [a for a in ids if a not in info]
    notw = set()
    if miss:   # 台灣區沒上架的（GetItems 用台灣查不到）：改用美國區查名稱和圖，標「台灣區沒上架」
        try:
            more = get_items(miss, media=False, ctx=dict(CTX, country_code='US'))
            info.update(more)
            notw = set(more)
        except Exception as e:  # noqa: BLE001
            print('board: 美國區補名稱失敗', e)
    oT, oS = old.get('t') or [], old.get('s') or []
    T = [t for t in oT if t >= tm - BOARD_H]
    cut_h = len(oT) - len(T)
    Ts = [t for t in oS if t >= tm - BOARD_SP]
    cut_s = len(oS) - len(Ts)
    add_s = not Ts or tm - Ts[-1] >= BOARD_SP_GAP
    orow = {r['a']: r for r in old.get('rows') or []}
    rows = []
    for a in ids:
        o = orow.get(a) or {}
        h = (list(o.get('h') or [None] * len(oT)) + [None] * len(oT))[:len(oT)][cut_h:] + [conc[a]]
        sp = (list(o.get('sp') or [None] * len(oS)) + [None] * len(oS))[:len(oS)][cut_s:]
        if add_s:
            sp.append(conc[a])
        rows.append({'a': a, 'n': conc[a], 'h': h, 'sp': sp})
    T.append(tm)
    if add_s:
        Ts.append(tm)
    # 換日：前一天的高峰記進 board-d.json
    last = hd.get('last')
    if not last:
        hd['last'] = hd['since'] = today
    elif last != today:
        d0 = dt.datetime.strptime(last, '%Y-%m-%d').replace(tzinfo=TW)
        lo, hi = tmin(d0), tmin(d0 + dt.timedelta(days=1))
        sl = [i for i, t in enumerate(oT) if lo <= t < hi]
        hd['days'].append(last)
        for k in hd['pk']:
            hd['pk'][k].append(None)
        for r in old.get('rows') or []:
            vals = [r['h'][i] for i in sl if i < len(r.get('h') or []) and r['h'][i] is not None]
            if not vals:
                continue
            k, v = str(r['a']), max(vals)
            hd['pk'].setdefault(k, [None] * len(hd['days']))[-1] = v
            if not hd['ath'].get(k) or v > hd['ath'][k][0]:
                hd['ath'][k] = [v, last]
            if r.get('nm'):
                hd['nm'][k] = r['nm']
        if len(hd['days']) > BOARD_DAYS:
            cut = len(hd['days']) - BOARD_DAYS
            hd['days'] = hd['days'][cut:]
            for k in list(hd['pk']):
                hd['pk'][k] = hd['pk'][k][cut:]
                if not any(v is not None for v in hd['pk'][k]):
                    del hd['pk'][k]
                    hd['ath'].pop(k, None)
                    hd['nm'].pop(k, None)
        hd['last'] = today
    j = _closest(T, tm - 1440, 90)
    js = _closest(Ts, tm - 7 * 1440, 300)
    for i, r in enumerate(rows):
        a, k = r['a'], str(r['a'])
        st = steam.get(a) or {}
        prev = r['h'][j] if j is not None else None
        r['d1'] = _pct(r['n'], prev)
        r['d7'] = _pct(r['n'], r['sp'][js] if js is not None and js < len(r['sp']) else None)
        own = [v for t, v in zip(T, r['h']) if v is not None and t >= tm - 1440]
        r['pk'] = max(own + [int(st.get('peak_in_game') or 0)]) or None
        r['r'] = i + 1
        r['rp'] = st.get('rank')
        lw = st.get('last_week_rank')
        r['lw'] = lw if isinstance(lw, int) and lw > 0 else None
        f = []
        if st.get('rank') and r['lw'] is None:
            f.append('new')
        if r['d1'] is not None and r['d1'] >= 40 and r['n'] >= 3000:
            f.append('surge')
        elif r['lw'] and st.get('rank') and r['lw'] - st['rank'] >= 25:
            f.append('jump')
        if r['d1'] is not None and r['d1'] <= -35 and (prev or 0) >= 3000:
            f.append('crash')
        ath = hd['ath'].get(k)
        tracked = sum(1 for v in hd['pk'].get(k) or [] if v is not None)
        if ath and tracked >= 3 and r['n'] > ath[0]:
            f.append('ath')
        r['f'] = f or None
        r['ath'] = max(ath or [0, None], [r['n'], today], key=lambda x: x[0]) if tracked else None
        it = info.get(a)
        if it:
            x = norm(it, tagn)
            r['nm'] = x['name'] or hd['nm'].get(k)
            r['tags'] = x['tags'][:3] or None
            r['rv'] = [x['rv']['pct'], x['rv']['n']] if x['rv']['n'] else None
            r['free'] = True if x['free'] else None
            pr = x['price']
            r['p'] = [pr['final'], pr['disc']] if pr['final'] is not None and not x['free'] else None
            r['img'] = x['img'].get('header') or x['img'].get('wide')
            r['zh'] = 'tc' if 'tc' in x['langs'] else 'sc' if 'sc' in x['langs'] else None
            if x['adult']:
                r['adult'] = True
            if a in notw:
                r['notw'] = True
                r.pop('p', None)
        else:
            r['nm'] = hd['nm'].get(k) or f'App {a}'
        r['cov'] = cov.get(a)
    rows = [_nonull(r) for r in rows]
    now_sum = sum(r['n'] for r in rows)

    def series(key, n):
        out = []
        for i in range(n):
            have = [r for r in rows if i < len(r.get(key) or []) and r[key][i] is not None]
            base = sum(r['n'] for r in have)
            out.append(round(sum(r[key][i] for r in have) * now_sum / base) if base else None)
        return out
    both = [(r['n'], r['h'][j]) for r in rows if j is not None and r['h'][j]]
    d1 = _pct(sum(x for x, _ in both), sum(y for _, y in both)) if len(both) >= 30 else None
    up = sum(1 for r in rows if r.get('d1') is not None and r['d1'] > 1)
    dn = sum(1 for r in rows if r.get('d1') is not None and r['d1'] < -1)
    fl = sum(1 for r in rows if r.get('d1') is not None) - up - dn
    agg = {}
    for r in rows:
        for t in (r.get('tags') or [])[:3]:
            g = agg.setdefault(t, {'t': t, 'n': 0, 'k': 0, 'cn': 0, 'pv': 0})
            g['n'] += r['n']
            g['k'] += 1
            if j is not None and r['h'][j]:
                g['cn'] += r['n']
                g['pv'] += r['h'][j]
    tags = [{'t': g['t'], 'n': g['n'], 'k': g['k'], 'd1': _pct(g['cn'], g['pv']) if g['pv'] else None}
            for g in sorted((g for g in agg.values() if g['k'] >= 3), key=lambda g: -g['n'])[:12]]
    out = {'at': iso(t0), 'src': src, 'since': hd.get('since'), 't': T, 's': Ts,
           'idx': {'n': now_sum, 'd1': d1, 'up': up, 'dn': dn, 'fl': fl, 'h': series('h', len(T)), 'sp': series('sp', len(Ts))},
           'rows': rows, 'tags': [_nonull(x) for x in tags]}
    wrote = save_if_changed(path, out)
    wrote_d = save_if_changed(dpath, hd)
    print(f'board: {len(rows)} 款（{src}），百大線上 {now_sum}，24h {d1}%，wrote={wrote}/{wrote_d}')
    return True


# ------------------------------------------------------------------ 免費補給站（Epic、Steam、GOG 的限時免費領）
def _iso_any(s):
    try:
        return iso(dt.datetime.fromisoformat(str(s).replace('Z', '+00:00')))
    except Exception:  # noqa: BLE001
        return None


def _usd(s):
    s = (s or '').strip()
    return ('US' + s) if s.startswith('$') else (s or None)


def freebies(D, t0, tagn):
    """三家官方商店現在（和 Epic 下週）限時免費領的遊戲 → data/free.json。哪一家這輪讀不到，就先留那一家上一輪的。"""
    path = os.path.join(D, 'free.json')
    old = load(path, {}) or {}
    now_s = iso(t0)
    seen = {x['id']: x.get('seen') for x in (old.get('items') or []) + (old.get('past') or []) if x.get('id')}
    items, errs, ok, diag = [], [], [], {}
    try:
        d = get_json(EPIC_FREE, timeout=30, tries=2)
        els = ((((d.get('data') or {}).get('Catalog') or {}).get('searchStore') or {}).get('elements')) or []
        dg = diag['epic'] = {'keys': sorted(d)[:6] if isinstance(d, dict) else str(type(d)), 'els': len(els), 'promo': 0, 'offers': []}
        if isinstance(d, dict) and d.get('errors'):
            dg['err'] = str(d['errors'])[:160]
        for e in els:
            pr = e.get('promotions') or {}
            dg['promo'] += 1 if pr else 0
            for key, up in (('promotionalOffers', False), ('upcomingPromotionalOffers', True)):
                for g in pr.get(key) or []:
                    for o in g.get('promotionalOffers') or []:
                        ds = o.get('discountSetting') or {}
                        pct = ds.get('discountPercentage')
                        if len(dg['offers']) < 10:
                            dg['offers'].append([(e.get('title') or '')[:24], 'up' if up else 'now', ds.get('discountType'), pct, str(o.get('startDate'))[:20], str(o.get('endDate'))[:20]])
                        if ds.get('discountType') != 'PERCENTAGE' or pct is None or int(pct) != 0:
                            continue
                        start, end = _iso_any(o.get('startDate')), _iso_any(o.get('endDate'))
                        if end and end <= now_s:
                            continue
                        maps = (e.get('offerMappings') or []) + ((e.get('catalogNs') or {}).get('mappings') or [])
                        slug = e.get('productSlug') or next((m.get('pageSlug') for m in maps if m.get('pageSlug')), None)
                        slug = (slug or '').split('/')[0] or None
                        if slug == '[]':
                            slug = None
                        imgs = {k.get('type'): k.get('url') for k in e.get('keyImages') or [] if k.get('url')}
                        img = next((imgs[t] for t in ('OfferImageWide', 'DieselStoreFrontWide', 'featuredMedia', 'Thumbnail', 'OfferImageTall') if imgs.get(t)), None)
                        title = (e.get('title') or '').strip()
                        tp = (e.get('price') or {}).get('totalPrice') or {}
                        items.append(_nonull({
                            'id': f'epic:{e.get("namespace")}:{e.get("id")}', 'store': 'epic', 'title': title, 'img': img,
                            'url': f'https://store.epicgames.com/zh-Hant/p/{slug}' if slug else 'https://store.epicgames.com/zh-Hant/free-games',
                            'orig_t': _usd((tp.get('fmtPrice') or {}).get('originalPrice')) if (tp.get('originalPrice') or 0) > 0 else None,
                            'start': start, 'end': end, 'up': True if up else None,
                            'mystery': True if (not slug or 'mystery' in title.lower() or '神秘' in title) else None,
                            'dlc': True if e.get('offerType') in ('ADD_ON', 'DLC') else None}))
        ok.append('epic')
    except Exception as e:  # noqa: BLE001
        errs.append(f'epic: {str(e)[:100]}')
    try:
        d = get_json(STEAM_FREE, timeout=30, tries=2)
        ids = []
        for x in (d.get('items') or [])[:40]:
            m = re.search(r'/apps/(\d+)/', x.get('logo') or '')
            if m and int(m.group(1)) not in ids:
                ids.append(int(m.group(1)))
        info = get_items(ids, media=False) if ids else {}
        diag['steam'] = {'items': len(d.get('items') or []), 'ids': len(ids), 'info': len(info), 'sample': [(x.get('name') or '')[:24] for x in (d.get('items') or [])[:4]]}
        for a in ids:
            it = info.get(a)
            if not it:
                continue
            n = norm(it, tagn)
            p = n['price']
            if n['adult'] or not ((p['disc'] or 0) >= 100 or (p['final'] == 0 and (p['orig'] or 0) > 0)):
                continue
            items.append(_nonull({
                'id': f'steam:{a}', 'store': 'steam', 'title': n['name'], 'img': n['img'].get('header') or n['img'].get('wide'), 'url': n['url'],
                'orig': p['orig'], 'end': p.get('end'), 'appid': a, 'rv': [n['rv']['pct'], n['rv']['n']] if n['rv']['n'] else None,
                'zh': 'tc' if 'tc' in n['langs'] else 'sc' if 'sc' in n['langs'] else None, 'tags': n['tags'][:3] or None}))
        ok.append('steam')
    except Exception as e:  # noqa: BLE001
        errs.append(f'steam: {str(e)[:100]}')
    try:
        d = get_json(GOG_FREE, timeout=30, tries=2)

        def amt(m):
            try:
                return float(str((m or {}).get('amount')).replace(',', ''))
            except (TypeError, ValueError):
                return None
        prods = d.get('products') or []
        diag['gog'] = {'products': len(prods), 'sample': [[(p.get('title') or '')[:24], (p.get('price') or {}).get('final'), (p.get('price') or {}).get('base'), str((p.get('price') or {}).get('finalMoney'))[:60]] for p in prods[:3]]}
        for p in prods:
            pr = p.get('price') or {}
            fin, base = amt(pr.get('finalMoney')), amt(pr.get('baseMoney'))
            if fin is None or base is None or fin > 0 or base <= 0:
                continue
            items.append(_nonull({
                'id': f'gog:{p.get("id")}', 'store': 'gog', 'title': (p.get('title') or '').strip(), 'img': p.get('coverHorizontal'),
                'url': p.get('storeLink') or (f'https://www.gog.com/zh/game/{p.get("slug")}' if p.get('slug') else 'https://www.gog.com/'),
                'orig_t': pr.get('base')}))
        ok.append('gog')
    except Exception as e:  # noqa: BLE001
        errs.append(f'gog: {str(e)[:100]}')
    for st in ('epic', 'steam', 'gog'):
        if st not in ok:        # 這一家這輪讀不到：先留上一輪還沒過期的
            items += [x for x in old.get('items') or [] if x.get('store') == st and (not x.get('end') or x['end'] > now_s)]
    uniq = {}
    for x in items:
        x['seen'] = seen.get(x['id']) or now_s
        uniq.setdefault(x['id'], x)
    items = sorted(uniq.values(), key=lambda x: (bool(x.get('up')), x.get('end') or '9999'))
    ids = set(uniq)
    past = [dict(x, gone=now_s) for x in old.get('items') or [] if x['id'] not in ids and not x.get('up')] + list(old.get('past') or [])
    keep_from = iso(t0 - dt.timedelta(days=30))
    pd, past2 = set(), []
    for x in past:
        if x['id'] in pd or x['id'] in ids or (x.get('gone') or '') < keep_from:
            continue
        pd.add(x['id'])
        past2.append(x)
    out = {'at': now_s, 'ok': ok, 'errs': errs or None, 'items': items, 'past': past2[:40], 'diag': diag}
    wrote = save_if_changed(path, _nonull(out), ignore=('at', 'errs', 'diag'))
    print(f'free: {len([x for x in items if not x.get("up")])} 款現在免費、{len([x for x in items if x.get("up")])} 款預告，來源 {ok}，wrote={wrote}', errs or '')
    print('free diag:', json.dumps(diag, ensure_ascii=False)[:2000])


# ------------------------------------------------------------------ 出擊日曆（可訂閱的 .ics）
APPURL = 'https://pzwei0105.github.io/PZ-Games/apps/unpacked/'


def _ics_esc(s):
    return str(s or '').replace('\\', '\\\\').replace(';', '\\;').replace(',', '\\,').replace('\n', '\\n')


def _ics_fold(line):
    out, cur, n = [], '', 0
    for ch in line:
        b = len(ch.encode('utf-8'))
        if n + b > 73:
            out.append(cur)
            cur, n = ' ', 1
        cur += ch
        n += b
    out.append(cur)
    return '\r\n'.join(out)


def calendar(D, t0):
    """上市日（專題、願望單）、特價截止（願望單、解包過的）、下週出擊（最新週報）→ data/calendar.ics。
    手機訂閱一次，之後跟著每小時更新。事件內容沒變就不重寫。"""
    today = t0.astimezone(TW).strftime('%Y-%m-%d')
    tw = lambda iso_s: dt.datetime.strptime(iso_s, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=UTC).astimezone(TW)  # noqa: E731
    idx = load(os.path.join(D, 'index.json'), {}).get('items') or []
    pk = load(os.path.join(D, 'picks.json'), {}).get('items') or []
    names = {int(x['steam']): (x['zh'], 'f/' + x['id']) for x in idx if x.get('steam')}
    for x in pk:
        if x.get('steam'):
            names.setdefault(int(x['steam']), (x['zh'], 'p/' + x['id']))
    ev, seen = [], set()

    def add(kind, d, name, uid, desc, route=''):
        k = (kind, uid, d)
        if k in seen or d < today:
            return
        seen.add(k)
        ev.append((d, kind, name, uid, desc, route))
    for x in idx:
        r = x.get('release') or ''
        if re.fullmatch(r'\d{4}-\d{2}-\d{2}', r):
            add('上市', r, x['zh'], x.get('steam') or x['id'], '、'.join(x.get('platforms') or [])[:80], 'f/' + x['id'])
    w = load(os.path.join(D, 'wish.json'), {})
    for x in (w.get('items') or []) if w.get('ok') or w.get('state') == 'stale' else []:
        if x.get('adult'):
            continue
        nm, route = names.get(x['appid'], (x['name'], ''))
        rel = x.get('rel') or {}
        if rel.get('soon') and re.fullmatch(r'\d{4}-\d{2}-\d{2}', rel.get('date') or ''):
            add('上市', rel['date'], nm, x['appid'], '你的 Steam 願望單', route)
        s = x.get('sale') or {}
        if s.get('end'):
            e = tw(s['end'])
            p = x.get('p') or [None, None, 0]
            add('特價截止', e.strftime('%Y-%m-%d'), nm, x['appid'], ('限時免費' if p[2] >= 100 else f'-{p[2]}%，NT${round((p[0] or 0) / 100)}') + f'，最後到 {e.strftime("%H:%M")}', route)
    # 解包過的特價截止：同一天最多 END_CAP 款（折扣大的先），其他併成一筆——累積幾千款、遇到大特賣也不會洗版
    ends = {}
    for a, lv in ((load(os.path.join(D, 'live.json'), {}).get('apps')) or {}).items():
        pr = lv.get('price') or {}
        if pr.get('disc') and pr.get('end') and int(a) in names:
            e = tw(pr['end'])
            ends.setdefault(e.strftime('%Y-%m-%d'), []).append((pr['disc'], int(a), e, pr))
    for d, rows in sorted(ends.items()):
        rows = sorted((r for r in rows if ('特價截止', r[1], d) not in seen), key=lambda r: (-r[0], r[1]))
        for disc, a, e, pr in rows[:END_CAP]:
            nm, route = names[a]
            add('特價截止', d, nm, a, f'-{disc}%，NT${round((pr.get("final") or 0) / 100)}，最後到 {e.strftime("%H:%M")}', route)
        if len(rows) > END_CAP:
            more = [names[r[1]][0] for r in rows[END_CAP:]]
            add('特價截止', d, f'還有 {len(more)} 款解包過的遊戲', f'more{d}', '同一天特價截止的還有：' + '、'.join(more[:15]) + ('…' if len(more) > 15 else ''), 'hunt')
    wk = (load(os.path.join(D, 'weekly.json'), {}).get('items') or [None])[0]
    if wk:
        for n in load(os.path.join(D, 'weekly', wk['id'] + '.json'), {}).get('next') or []:
            if re.fullmatch(r'\d{4}-\d{2}-\d{2}', n.get('d') or '') and not any(e[1] == '上市' and e[2] == n.get('name') for e in ev):
                add('下週出擊', n['d'], n['name'], n['name'], n.get('t') or '', (n.get('ref') or '').replace(':', '/', 1))
    # 大特賣、Steam 主題節、頒獎典禮（data/events.json，官方公布的日期）；「最後一晚」＝結束前 3 小時那天
    hm = lambda s: tw(s).strftime('%m/%d %H:%M').lstrip('0')  # noqa: E731
    lastday = lambda s: (tw(s) - dt.timedelta(hours=3)).strftime('%Y-%m-%d')  # noqa: E731
    horizon = (t0 + dt.timedelta(days=200)).astimezone(TW).strftime('%Y-%m-%d')
    for e in load(os.path.join(D, 'events.json'), {}).get('items') or []:
        s, en, k = e.get('start'), e.get('end'), e.get('kind')
        if not s or tw(s).strftime('%Y-%m-%d') > horizon:
            continue
        if k == 'sale':
            add('大特賣', tw(s).strftime('%Y-%m-%d'), e['name'] + ' 開打', e['id'] + 's', f'台灣時間 {hm(s)} 開始' + (f'，到 {hm(en)}' if en else ''), 'hunt')
            if en:
                add('大特賣', lastday(en), e['name'] + ' 最後一晚', e['id'] + 'e', f'{hm(en)} 結束', 'hunt')
        elif k == 'fest' and e.get('big'):        # 小型主題節不進行事曆（太雜），只留新品節這種大活動
            add('活動', tw(s).strftime('%Y-%m-%d'), e['name'], e['id'], (e.get('note') + '，' if e.get('note') else '') + f'台灣時間 {hm(s)} 開始' + (f'，到 {hm(en)}' if en else ''), 'hunt')
        elif k == 'show':
            add('頒獎', tw(s).strftime('%Y-%m-%d'), e['name'], e['id'], f'台灣時間 {hm(s)} 開始直播', e.get('route') or 'cal')
        elif k == 'vote':
            add('投票截止', tw(s).strftime('%Y-%m-%d'), e['name'], e['id'], f'台灣時間 {hm(s)} 截止', e.get('route') or 'cal')
    for x in (load(os.path.join(D, 'free.json'), {}).get('items') or []):
        if x.get('end') and not x.get('up') and not x.get('mystery'):
            st = {'epic': 'Epic', 'steam': 'Steam', 'gog': 'GOG'}.get(x.get('store'), '')
            add('免費截止', lastday(x['end']), x['title'], x['id'], f'{st} 限時免費領，{hm(x["end"])} 截止', 'hunt')
    ev.sort()
    L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UNPACKED//Launch Calendar//ZH', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
         _ics_fold('X-WR-CALNAME:解包・出擊日曆'), 'X-WR-TIMEZONE:Asia/Taipei', 'REFRESH-INTERVAL;VALUE=DURATION:PT3H', 'X-PUBLISHED-TTL:PT3H']
    for d, kind, name, uid, desc, route in ev:
        d8 = d.replace('-', '')
        nx = (dt.date.fromisoformat(d) + dt.timedelta(days=1)).strftime('%Y%m%d')
        tag = {'上市': 'rel', '特價截止': 'end', '下週出擊': 'next', '大特賣': 'sale', '活動': 'fest', '頒獎': 'show', '投票截止': 'vote', '免費截止': 'free'}[kind]
        L += ['BEGIN:VEVENT', f'UID:unpacked-{tag}-{re.sub(r"[^A-Za-z0-9]+", "", str(uid)) or hashlib.md5(str(uid).encode()).hexdigest()[:12]}-{d8}@pzwei0105.github.io',
              f'DTSTAMP:{d8}T000000Z', f'DTSTART;VALUE=DATE:{d8}', f'DTEND;VALUE=DATE:{nx}',
              _ics_fold('SUMMARY:' + _ics_esc(f'{kind}｜{name}')), _ics_fold('DESCRIPTION:' + _ics_esc(f'{desc}\n解包 UNPACKED')),
              f'URL:{APPURL}' + (('#' + route) if route else '#hunt'), 'END:VEVENT']
    L.append('END:VCALENDAR')
    body = '\r\n'.join(L) + '\r\n'
    path = os.path.join(D, 'calendar.ics')
    try:
        old = open(path, encoding='utf-8', newline='').read()
    except OSError:
        old = None
    if old != body:
        with open(path, 'w', encoding='utf-8', newline='') as f:
            f.write(body)
    print(f'calendar: {len(ev)} 筆，wrote={old != body}')


# ------------------------------------------------------------------ main
def plan(track, live_old, t0):
    """這一輪要更新哪些。最近寫的、盯上市的、還沒抓過的每輪都更新；其餘照「最久沒更新」輪流，
    每輪 ROTATE 款——追蹤清單再長，每款也會定期更新到（推坑會一直累積，舊的特價資訊不能停在過去）。"""
    old = live_old.get('apps') or {}
    must, hot, cold = [], [], []
    for x in track.get('apps') or []:
        try:
            appid = int(x['appid'])
        except Exception:  # noqa: BLE001
            continue
        if str(appid) not in old:
            must.append(appid)
            continue
        fresh = True
        if x.get('date'):
            try:
                fresh = (t0.date() - dt.date.fromisoformat(x['date'])).days <= FRESH_DAYS
            except ValueError:
                pass
        (hot if fresh or x.get('watch') else cold).append((x.get('date') or '', appid))
    hot.sort(key=lambda r: r[0], reverse=True)            # 新的優先
    cold += hot[HOT_MAX:]
    cold.sort(key=lambda r: (old.get(str(r[1])) or {}).get('at') or '')   # 最久沒更新的先
    out = []
    for a in must + [a for _, a in hot[:HOT_MAX]] + [a for _, a in cold[:ROTATE]]:
        if a not in out:
            out.append(a)
    return out


def main():
    global OFFLINE
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--offline', default=None)
    ap.add_argument('--no-candidates', action='store_true')
    a = ap.parse_args()
    OFFLINE = a.offline
    D = a.data
    t0 = now()
    track = load(os.path.join(D, 'track.json'), {'apps': []})
    live_old = live_load(D)
    idx = load(os.path.join(D, 'index.json'), {'items': []})
    covered = {int(x['steam']) for x in idx.get('items') or [] if x.get('steam')}
    pk = load(os.path.join(D, 'picks.json'), {'items': []})
    picked = {int(x['steam']) for x in pk.get('items') or [] if x.get('steam')}

    apps = plan(track, live_old, t0)

    tagn = tagnames()
    items = get_items(apps, media=True) if apps else {}
    out_apps = dict(live_old.get('apps') or {})
    NSTAT = {'ok': 0, 'cat': 0, 'ws': 0}
    ok = 0
    for appid in apps:
        it = items.get(appid)
        if not it:
            continue
        x = norm(it, tagn)
        n = players(appid)
        time.sleep(0.25)
        rtc = reviews(appid, 'tchinese')
        time.sleep(0.4)
        hp = os.path.join(D, 'hist', f'{appid}.json')
        h = load(hp, {'pl': [], 'pr': [], 'rv': [], 'rt': []})
        tm = tmin(t0)
        if n is not None:
            h['pl'] = push_cap(h.get('pl') or [], [tm, n], HIST_PL)
        if x['price']['final'] is not None:
            h['pr'] = push_cap(h.get('pr') or [], [tm, x['price']['final']], HIST_PR, dedupe_last=True)
        if x['rv']['n']:
            pos = round((x['rv']['pct'] or 0) * x['rv']['n'] / 100)
            if not h.get('rv') or tm - h['rv'][-1][0] >= 20 * 60:     # 評價一天記一筆就夠
                h['rv'] = push_cap(h.get('rv') or [], [tm, pos, x['rv']['n']], HIST_RV)
        if rtc and rtc['n']:
            if not h.get('rt') or tm - h['rt'][-1][0] >= 20 * 60:
                h['rt'] = push_cap(h.get('rt') or [], [tm, rtc['pos'], rtc['n']], HIST_RV)
        save_if_changed(hp, h)
        s = summarize(h, t0)
        x['players'] = {'n': n, 'at': iso(t0)} if n is not None else (out_apps.get(str(appid)) or {}).get('players')
        if s.get('peak'):
            x['players'] = dict(x['players'] or {}, peak=s['peak'])
        if s.get('d24') is not None and x.get('players'):
            x['players']['d24'] = s['d24']
        if s.get('low'):
            x['price']['low'] = s['low']
        if s.get('recent'):
            x['rv']['recent'] = s['recent']
        if rtc:
            x['rv_tc'] = {'n': rtc['n'], 'pct': rtc['pct'], 'label': rtc['label']}
        prev = out_apps.get(str(appid)) or {}
        nw = news(appid) if news_due(prev, appid, t0) else None
        if nw is not None:
            time.sleep(0.15)
            NSTAT['ok'] += 1
        if nw is None and prev.get('news') is not None:
            nw = prev['news']
        if nw is not None:
            x['news'] = nw
        x['base'], pend, chg = track_changes(prev, x, t0)
        if pend:
            x['pend'] = pend
        if chg:
            x['chg'] = chg
        NSTAT['cat'] += x.get('ws') is not None
        NSTAT['ws'] += bool(x.get('ws'))
        x['at'] = iso(t0)
        out_apps[str(appid)] = x
        ok += 1
    # 已經不在追蹤清單裡的拿掉
    keep = {str(int(x['appid'])) for x in track.get('apps') or [] if str(x.get('appid', '')).isdigit()}
    out_apps = {k: v for k, v in out_apps.items() if k in keep}
    try:
        mine = wishlist(D, t0, tagn)
    except Exception as e:  # noqa: BLE001  願望單壞掉不能拖垮整輪
        print('wish fail', e, file=sys.stderr)
        ERRS.append(f'wish: {type(e).__name__}')
        mine = set()
    live = {'at': iso(t0), 'ok': ok, 'asked': len(apps), 'errs': ERRS[:20], 'apps': out_apps}
    try:
        live['stale'] = stale_app(out_apps, idx, pk, t0)
    except Exception as e:  # noqa: BLE001  寫稿之後壞掉不能拖垮整輪
        import traceback
        traceback.print_exc()
        ERRS.append(f'stale: {type(e).__name__}')
    wrote, nx = live_save(D, live)
    print(f'live: asked {len(apps)}, ok {ok}, wrote={wrote}, live/ 更新 {nx} 款；官方公告看了 {NSTAT["ok"]} 款；分類資料 {NSTAT["cat"]} 款（有工作坊 {NSTAT["ws"]}）')

    if not a.no_candidates:
        c = candidates(covered, tagn, picked, mine)
        wrote_c = save_if_changed(os.path.join(D, 'candidates.json'), c)
        print('candidates:', {k: len(v) for k, v in c.items() if isinstance(v, list)}, 'wrote=', wrote_c)
    # 行情板、免費補給站、日曆：各自壞掉都不能拖垮整輪
    cov = {}
    for x in reversed(pk.get('items') or []):          # 目錄是新的在前：倒著放，最新那篇蓋過舊的；專題優先於推坑
        if x.get('steam'):
            cov[int(x['steam'])] = 'p:' + x['id']
    for x in reversed(idx.get('items') or []):
        if x.get('steam'):
            cov[int(x['steam'])] = 'f:' + x['id']
    for name, fn in (('board', lambda: board(D, t0, tagn, cov)), ('free', lambda: freebies(D, t0, tagn)), ('calendar', lambda: calendar(D, t0))):
        try:
            fn()
        except Exception as e:  # noqa: BLE001
            import traceback
            traceback.print_exc()
            print(f'{name} fail', e, file=sys.stderr)


if __name__ == '__main__':
    main()
