#!/usr/bin/env python3
"""《解包 UNPACKED》資料管線：GitHub Actions 每小時跑一次（也會在 track.json 變動時跑）。

做三件事，全部只用 Steam 的公開端點（不用金鑰）：
1. 追蹤清單（data/track.json，由 publish.py 從專題自動產生）裡每一款 Steam 遊戲：
   台灣區價格與折扣、全球評價、繁中玩家評價、目前同上人數、主視覺／截圖／預告、語言、標籤。
   → data/live.json（目前的樣子）＋ data/hist/<appid>.json（價格、同上、評價的歷史，App 畫曲線、算史低）
2. 給每日寫稿用的選題候選 → data/candidates.json
   （同上排行、熱銷、新品、即將推出、願望清單熱門；已經寫過的標 covered）
3. 只在資料真的有變時寫檔（時間戳以外），讓 git 不會每輪都多一個空 commit。

用法：
  python3 live.py --data apps/unpacked/data            # 正式（Actions）
  python3 live.py --data /tmp/x --offline fixtures/    # 本機測試：讀假資料，不連網
"""
import argparse
import datetime as dt
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
ASSET = 'https://shared.akamai.steamstatic.com/store_item_assets/'
VIDEO = 'https://video.akamai.steamstatic.com/store_trailers/'
CTX = {'language': 'tchinese', 'country_code': 'TW', 'steam_realm': 1}
LANG_TC, LANG_SC = 7, 6
ADULT = {3, 4}

MAX_PER_RUN = 160          # 一輪最多追幾款
FRESH_DAYS = 120           # 這幾天內寫過的每輪都更新；更舊的一天更新一次
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


def get_items(appids, media=True):
    dr = {'include_basic_info': True, 'include_assets': True, 'include_release': True, 'include_reviews': True,
          'include_tag_count': 12, 'include_supported_languages': True, 'include_platforms': True}
    if media:
        dr.update(include_screenshots=True, include_trailers=True)
    out = {}
    ids = []
    for a in appids:
        if a and a not in ids:
            ids.append(a)
    for i in range(0, len(ids), 30):
        part = ids[i:i + 30]
        url = api(GETITEMS, {'ids': [{'appid': a} for a in part], 'context': CTX, 'data_request': dr})
        try:
            d = get_json(url, timeout=50)
        except Exception as e:  # noqa: BLE001
            print('GetItems fail', part[:3], e, file=sys.stderr)
            ERRS.append(f'GetItems {part[:3]}: {str(e)[:120]}')
            continue
        for it in (d.get('response') or {}).get('store_items') or []:
            if it.get('success') == 1 and (it.get('appid') or it.get('id')):
                out[int(it.get('appid') or it.get('id'))] = it
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
                  'fmt': (bpo.get('formatted_final_price') or '').replace('NT$ ', 'NT$').strip() or None},
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
        'img': {k: v for k, v in (('hero', pic('library_hero')), ('header', pic('header')), ('wide', pic('main_capsule')),
                                  ('box', pic('library_capsule')), ('bg', pic('page_background'))) if v},
        'shots': [_join(ASSET, '', s['filename']) for s in shots[:10]],
    }
    if micro:
        x['micro'] = micro
    if full:
        x['trailers'] = full
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
def candidates(covered, tagn, picked=frozenset()):
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


# ------------------------------------------------------------------ main
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
    live_path = os.path.join(D, 'live.json')
    live_old = load(live_path, {'apps': {}})
    idx = load(os.path.join(D, 'index.json'), {'items': []})
    covered = {int(x['steam']) for x in idx.get('items') or [] if x.get('steam')}
    pk = load(os.path.join(D, 'picks.json'), {'items': []})
    picked = {int(x['steam']) for x in pk.get('items') or [] if x.get('steam')}

    # 這一輪要更新哪些：最近寫的每輪；舊的每天第一輪（UTC 0–3 點）
    apps = []
    daily = t0.hour < 3
    for x in track.get('apps') or []:
        try:
            appid = int(x['appid'])
        except Exception:  # noqa: BLE001
            continue
        fresh = True
        if x.get('date'):
            try:
                age = (t0.date() - dt.date.fromisoformat(x['date'])).days
                fresh = age <= FRESH_DAYS or bool(x.get('watch'))
            except ValueError:
                pass
        if fresh or daily or str(appid) not in (live_old.get('apps') or {}):
            apps.append(appid)
    apps = apps[:MAX_PER_RUN]

    tagn = tagnames()
    items = get_items(apps, media=True) if apps else {}
    out_apps = dict(live_old.get('apps') or {})
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
        x['at'] = iso(t0)
        out_apps[str(appid)] = x
        ok += 1
    # 已經不在追蹤清單裡的拿掉
    keep = {str(int(x['appid'])) for x in track.get('apps') or [] if str(x.get('appid', '')).isdigit()}
    out_apps = {k: v for k, v in out_apps.items() if k in keep}
    live = {'at': iso(t0), 'ok': ok, 'asked': len(apps), 'errs': ERRS[:20], 'apps': out_apps}
    wrote = save_if_changed(live_path, live)
    print(f'live: asked {len(apps)}, ok {ok}, wrote={wrote}')

    if not a.no_candidates:
        c = candidates(covered, tagn, picked)
        wrote_c = save_if_changed(os.path.join(D, 'candidates.json'), c)
        print('candidates:', {k: len(v) for k, v in c.items() if isinstance(v, list)}, 'wrote=', wrote_c)


if __name__ == '__main__':
    main()
