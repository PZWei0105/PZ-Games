"""補番 BINGE — YouTube 抓取與標題判斷的共用工具（研究工具和資料管線都用）

- yt-dlp 的「扁平清單」（不下載影片、不開影片頁）：頻道的影片／播放清單分頁、播放清單內容、搜尋結果。
  GitHub Actions 的機器連得到 YouTube；沙盒連不到，所以本機只測得了下面那些純函式。
- 純函式（不連網）：語言、AI 動畫、影片格式（合輯／單集／短片／預告…）、作品名稱、集數、章節。
  測試：python3 _build/apps/binge/tests/test_ytx.py
"""
import re

# ================================================================ yt-dlp 扁平清單

_YDL = {}


def _ydl(lang):
    """共用一個 YoutubeDL（同一個語言），省掉每次初始化。"""
    if lang in _YDL:
        return _YDL[lang]
    import yt_dlp  # 只在 Actions 上用得到
    opts = {
        'quiet': True, 'no_warnings': True, 'skip_download': True, 'extract_flat': 'in_playlist',
        'socket_timeout': 20, 'retries': 2, 'extractor_retries': 2, 'ignoreerrors': True,
        'extractor_args': {'youtube': {'lang': [lang]}} if lang else {},
        'http_headers': {'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.5'},
    }
    _YDL[lang] = yt_dlp.YoutubeDL(opts)
    return _YDL[lang]


def flat(url, limit=60, lang='zh-TW'):
    """回傳 {'title', 'id', 'entries': [...]}；每筆 entry 是 yt-dlp 的扁平結果（id、title、duration、view_count、
    live_status、availability、url、channel_id…）。抓不到回 None。"""
    y = _ydl(lang)
    y.params['playlistend'] = limit
    try:
        info = y.extract_info(url, download=False, process=True)
    except Exception:  # noqa: BLE001 — yt-dlp 什麼錯都可能丟
        return None
    if not info:
        return None
    ents = [e for e in (info.get('entries') or []) if isinstance(e, dict)]
    return {'title': info.get('title'), 'id': info.get('id'), 'channel_id': info.get('channel_id'),
            'channel': info.get('channel') or info.get('uploader'), 'entries': ents[:limit],
            'count': info.get('playlist_count')}


def entry_kind(e):
    """扁平結果是影片、Shorts、播放清單還是頻道。"""
    url = e.get('url') or ''
    if '/shorts/' in url:
        return 'short'
    if 'list=' in url or e.get('ie_key') == 'YoutubeTab' and str(e.get('id', '')).startswith(('PL', 'OL', 'UU', 'FL')):
        return 'playlist'
    if re.search(r'/(channel/UC|@)', url) or str(e.get('id', '')).startswith('UC') and len(str(e.get('id'))) == 24:
        return 'channel'
    return 'video'


def members_only(e):
    return (e.get('availability') or '') in ('subscriber_only', 'premium_only', 'needs_auth')


# ================================================================ 語言

_KANA = re.compile(r'[぀-ヿ]')
_HAN = re.compile(r'[一-鿿㐀-䶿]')
_HANGUL = re.compile(r'[가-힯]')
_LATIN = re.compile(r'[A-Za-z]')
SIMP_ONLY = set('这个们来说时会对发进过还没为与么样后间应开关现长问题经从动种实头见点业东车电视话语认让给门军龙马鸟鱼战术游戏剧乐级测试评价'
                '体验载资讯钟价买卖亲师团队气质务权条觉万传达费钱网页频图线视设计论边总单况猎难恶灵击败枪弹队员装备阵营帮赛奖宝钥锁灯币购礼'
                '启闭约画帧优质圣复传尽华兴阳阴剑灭场书亿届岁妈爷谁让赵钱孙杨陈刘宫庙凤凰')


def lang_of(text):
    """'zh'、'ja'（有假名）、'ko'、'en'（其他拉丁字母）或 None。"""
    if not text:
        return None
    if _KANA.search(text):
        return 'ja'
    if len(_HAN.findall(text)) >= 2:
        return 'zh'
    if _HANGUL.search(text):
        return 'ko'
    if _LATIN.search(text):
        return 'en'
    return None


def is_simplified(text):
    return sum(1 for ch in (text or '') if ch in SIMP_ONLY) >= 2


# ================================================================ AI 動畫

AI_RX = re.compile(r'(?<![A-Za-z])AI(?![A-Za-z])|AIGC|人工智[能慧]|AI\s*[漫動动短劇剧番影]|仿真人|AI生成|AI製作|AI制作|'
                   r'Seedance|Kling|可靈|可灵|即夢|即梦|Runway|Midjourney|Sora|Veo\s*\d|Vidu|Hailuo|海螺AI', re.I)


def is_ai(title, desc=''):
    return bool(AI_RX.search(title or '') or AI_RX.search((desc or '')[:400]))


# ================================================================ 影片格式

COMP_RX = re.compile(r'合集|合輯|合辑|一口氣|一口气|完整版|全集|全\d+[集話话]|\d+\s*[-~～至到]\s*\d+\s*[集話话回]|連看|连看|馬拉松|马拉松|'
                     r'總集篇|总集篇|大合集|已完結|已完结|完結篇|完结篇|全季|整季|一次看完|看完全部|marathon|compilation|all episodes|full season', re.I)
MOVIE_RX = re.compile(r'劇場版|剧场版|大電影|大电影|動畫電影|动画电影|電影版|电影版|\bthe movie\b|\bmovie\b', re.I)
EP_RX = re.compile(r'(?:\bEP|\bE|第)\s*0*(\d{1,4})\s*(?:[集話话回]|\b)|#\s*0*(\d{1,4})\b|\bEpisode\s*0*(\d{1,4})\b|【\s*0*(\d{1,4})\s*】', re.I)
RANGE_RX = re.compile(r'(?:第\s*)?0*(\d{1,4})\s*[-~～—–至到]\s*0*(\d{1,4})\s*[集話话回]|(?:EP|E)\s*0*(\d{1,4})\s*[-~～—–]\s*(?:EP|E)?\s*0*(\d{1,4})', re.I)
PV_RX = re.compile(r'預告|预告|\bPV\d*\b|\bCM\b|Trailer|Teaser|先導|先导|前導|前导|宣傳|宣传|主題曲|主题曲|片頭曲|片头曲|片尾曲|'
                   r'\bOP\b|\bED\b|ノンクレジット|Non-?credit|MV\b|特報|特报|製作|制作花絮|幕後|幕后|配音員|声優|聲優|直播預告', re.I)
LIVE_RX = re.compile(r'24\s*小時|24\s*小时|24H|24/7|直播|馬拉松|马拉松|LIVE\b|live stream|連播|连播', re.I)
SHORT_HINT = re.compile(r'#shorts?\b|#short\b|#漫劇|#漫剧|#短劇|#短剧', re.I)


def fmt_of(title, dur=None, short=False, live=None):
    """影片格式：live（直播、24 小時連播）、short（直式短片）、comp（長片合輯）、movie（劇場版）、ep（單集）、pv（預告、片頭曲、花絮）、clip（片段）。"""
    t = title or ''
    if live in ('is_live', 'is_upcoming', 'live', 'upcoming'):
        return 'live'
    if short:
        return 'short'
    if dur is None:
        if LIVE_RX.search(t) and COMP_RX.search(t):
            return 'live'
        if COMP_RX.search(t):
            return 'comp'
        if PV_RX.search(t):
            return 'pv'
        return 'ep' if EP_RX.search(t) else 'clip'
    if dur <= 75 and SHORT_HINT.search(t):
        return 'short'
    if dur >= 55 * 60:
        if MOVIE_RX.search(t) and not COMP_RX.search(t):
            return 'movie'
        return 'comp'
    if dur >= 35 * 60:
        if MOVIE_RX.search(t) and not COMP_RX.search(t):
            return 'movie'
        if COMP_RX.search(t) or ep_range(t):
            return 'comp'
        return 'ep'
    if PV_RX.search(t) and dur < 6 * 60:
        return 'pv'
    if dur >= 7 * 60:
        return 'comp' if (COMP_RX.search(t) and dur >= 15 * 60) else 'ep'
    if EP_RX.search(t) and dur >= 60:
        return 'ep'        # 短番、泡麵番：一集兩三分鐘
    return 'clip'


def ep_num(title):
    """單集的集數（第 12 集、EP12、#12、【12】）；合輯（1-80 集）回 None。"""
    t = title or ''
    if ep_range(t):
        return None
    for m in EP_RX.finditer(t):
        for g in m.groups():
            if g:
                n = int(g)
                if 0 < n < 3000:
                    return n
    return None


def ep_range(title):
    """合輯涵蓋的集數範圍：『1-80集』→ (1, 80)。"""
    m = RANGE_RX.search(title or '')
    if not m:
        return None
    a, b = [int(x) for x in m.groups() if x][:2]
    if 0 <= a < b < 5000:
        return (a, b)
    return None


# ================================================================ 作品名稱（把同一部的單集、上下集、第幾季串起來）

GENERIC = re.compile(r'^(完整版|完整|合集|合輯|合辑|全集|已完結|已完结|完結|完结|高清|中字|中文字幕|繁中|簡中|简中|國語|国语|粵語|粤语|日語|日语|'
                     r'新番|最新|熱門|热门|推薦|推荐|動畫|动画|動漫|动漫|漫劇|漫剧|AI漫劇|AI漫剧|AI動畫|AI动画|沙雕動畫|沙雕动画|動態漫畫|动态漫画|'
                     r'一口氣看完|一口气看完|爽文|熱血|热血|搞笑|甜寵|甜宠|穿越|重生|修仙|末世|系統|系统|都市|玄幻|官方|正版|會員|会员|首播|獨播|独播|'
                     r'Multi ?Sub|ENG ?SUB|SUB|FULL|HD|4K|1080P|Eng Sub|多語字幕|多语字幕|\d+\s*小[時时].*|\d+[hH]\d*|EP\s*\d+.*|第\s*\d+\s*[季集話话部].*)$', re.I)
SEASON_RX = re.compile(r'第\s*([一二三四五六七八九十\d]+)\s*[季部]|Season\s*(\d+)|\bS(\d+)\b|([一二三四五六七八九十\d]+)期', re.I)
_CN = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10}


def cn_int(s):
    if not s:
        return None
    if s.isdigit():
        return int(s)
    if s in _CN:
        return _CN[s]
    if len(s) == 2 and s[0] == '十':
        return 10 + _CN.get(s[1], 0)
    if len(s) == 2 and s[1] == '十':
        return _CN.get(s[0], 0) * 10
    if len(s) == 3 and s[1] == '十':
        return _CN.get(s[0], 0) * 10 + _CN.get(s[2], 0)
    return None


def season_of(title):
    m = SEASON_RX.search(title or '')
    if not m:
        return None
    for g in m.groups():
        if g:
            return cn_int(g)
    return None


def show_name(title):
    """影片標題 → 作品名稱（顯示用，保留原字）。找不到明確名稱回 None。
    優先順序：《》裡的、「」裡的、【】裡不是通用標籤的、去掉集數與標籤後剩下的。"""
    t = (title or '').strip()
    if not t:
        return None
    for rx in (r'《([^《》]{2,40})》', r'「([^「」]{2,40})」', r'『([^『』]{2,40})』'):
        for m in re.finditer(rx, t):
            n = m.group(1).strip()
            if not GENERIC.match(n) and not re.fullmatch(r'[\d\s\-~～]+[集話话]?', n):
                return tidy(n)
    for m in re.finditer(r'【([^【】]{2,48})】', t):
        n = m.group(1).strip()
        if not GENERIC.match(n) and not re.fullmatch(r'[\d\s\-~～]+[集話话]?', n) and not COMP_RX.fullmatch(n):
            return tidy(n)
    rest = re.sub(r'【[^【】]*】|\[[^\]]*\]|（[^（）]*）|\([^()]*\)|#\S+', ' ', t)
    rest = re.split(r'[|｜]', rest)[0]
    rest = re.sub(r'(?:\bEP|\bE|第)\s*\d{1,4}\s*[-~～至到]?\s*\d{0,4}\s*[集話话回]?|Episode\s*\d+|全\d+[集話话]|\d+\s*[-~～]\s*\d+\s*[集話话]', ' ', rest, flags=re.I)
    rest = COMP_RX.sub(' ', rest)
    rest = re.sub(r'一口[氣气]看完|完整版|中文字幕|中字|高清|官方|正版|動畫|动画|沙雕', ' ', rest)
    rest = re.sub(r'\s+', ' ', rest).strip(' -–—:：~～!！?？,，.。、')
    if len(rest) < 2 or GENERIC.match(rest):
        return None
    return tidy(rest[:40])


def tidy(n):
    n = re.sub(r'\s+', ' ', n).strip(' -–—:：·・')
    n = re.sub(r'\s*[\(（]?(已完[結结]|完[結结]|全集|合集|合輯|合辑)[\)）]?$', '', n)
    return n.strip()


def norm(s):
    """比對用：去掉空白、符號、大小寫；簡繁混用的常見字統一。"""
    s = (s or '').lower()
    s = re.sub(r'[\s\-–—_:：·・!！?？,，.。、~～「」『』《》【】\[\]()（）"\'“”‘’]+', '', s)
    return s.translate(_S2T_MIN)


_S2T_MIN = str.maketrans('这个们来说时会对发进过还没为与么样后间应开关现长问题经从动种实头见点业东车电视话语认让给门军龙马鸟鱼战术游戏剧乐级尽华兴阳阴剑灭场书亿届岁妈爷谁让赵钱孙杨陈刘宫庙凤凰万传达费钱网页频图线视设计论边总单况猎难恶灵击败枪弹队员装备阵营帮赛奖宝钥锁灯币购礼启闭约画帧优质圣复',
                         '這個們來說時會對發進過還沒為與麼樣後間應開關現長問題經從動種實頭見點業東車電視話語認讓給門軍龍馬鳥魚戰術遊戲劇樂級盡華興陽陰劍滅場書億屆歲媽爺誰讓趙錢孫楊陳劉宮廟鳳凰萬傳達費錢網頁頻圖線視設計論邊總單況獵難惡靈擊敗槍彈隊員裝備陣營幫賽獎寶鑰鎖燈幣購禮啟閉約畫幀優質聖復')


# ================================================================ 章節（說明欄裡的時間碼）

TS_RX = re.compile(r'(?:^|\s|\(|（|【|\[)((?:\d{1,2}:)?\d{1,2}:\d{2})(?=\s|$|\)|）|】|\]|[一-鿿]|[-–—|｜:：])\s*[-–—|｜:：]?\s*(.{0,60})', re.M)


def to_sec(ts):
    parts = [int(x) for x in ts.split(':')]
    s = 0
    for p in parts:
        s = s * 60 + p
    return s


def chapters(desc, dur=None):
    """說明欄的時間碼 → [[秒, 標題], ...]。要有 00:00 開頭、至少 3 段、時間遞增才算數。"""
    if not desc:
        return []
    out = []
    for line in desc.splitlines():
        m = TS_RX.search(line)
        if not m:
            continue
        s = to_sec(m.group(1))
        label = re.sub(r'\s+', ' ', (m.group(2) or '')).strip(' -–—|｜:：')
        if not label:
            label = re.sub(r'\s+', ' ', line.replace(m.group(1), '')).strip(' -–—|｜:：')
        out.append([s, label[:40]])
    if len(out) < 3 or out[0][0] > 5:
        return []
    clean = [out[0]]
    for s, lb in out[1:]:
        if s <= clean[-1][0]:
            return []
        if dur and s >= dur:
            break
        clean.append([s, lb])
    return clean if len(clean) >= 3 else []
