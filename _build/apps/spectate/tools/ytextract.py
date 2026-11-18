"""觀戰 SPECTATE — 從影片標題判斷「節目類型」、抓出遊戲名稱、判斷語言。

全部是純函式（不連網），方便測試：python3 _build/apps/spectate/tests/test_extract.py
"""
import re
import unicodedata

# ---------------------------------------------------------------- 語言

_HIRA_KATA = re.compile(r'[぀-ヿ]')
_HAN = re.compile(r'[一-鿿㐀-䶿]')
_HANGUL = re.compile(r'[가-힯]')
_LATIN = re.compile(r'[A-Za-z]')

# 只出現在簡體字的常用字（夠判斷「這行是簡體」就好，不求完整）
SIMP_ONLY = set('这个们来说时会对发进过还没为与么样后间应开关现长问题经从动种实头见点业东车电视话语认让给门军龙马鸟鱼战术游戏剧乐级测试评价体验载资讯钟价买卖亲师团队气质务权条觉万传达费钱网页频图线视设计论边总单况猎难恶灵击败枪弹队员装备阵营帮赛奖宝钥锁灯币购礼启闭约画帧优质级圣复传龙')


def lang_of(text):
    """'zh'（中文）、'ja'（日文：有假名）、'ko'、'en'（其他拉丁字母）或 None。"""
    if not text:
        return None
    if _HIRA_KATA.search(text):
        return 'ja'
    han = len(_HAN.findall(text))
    if han >= 2:
        return 'zh'
    if _HANGUL.search(text):
        return 'ko'
    if _LATIN.search(text):
        return 'en'
    return None


def is_simplified(text):
    return sum(1 for ch in text if ch in SIMP_ONLY) >= 2


# ---------------------------------------------------------------- 節目類型（車道）

LANES = ('live', 'trailer', 'review', 'guide', 'news', 'deep', 'play')

_RX = {
    'trailer': re.compile(
        r'預告|预告|宣傳片|宣传片|宣傳影片|首曝|上市影片|發售影片|实机演示|實機演示|實機展示|最新影像|紹介映像|最新映像|'
        r'トレーラー|ティザー|プロモーション|\bPV\d*\b|\bCM\b|Trailer|Teaser|Release Date Announce', re.I),
    'review': re.compile(
        r'評測|评测|評價|评价|心得|值不值得|值得買|值得买|推不推薦|推不推荐|入坑|試玩|试玩|開箱|开箱|體驗|体验|'
        r'レビュー|感想|\bReview\b|Before You Buy|Impressions?\b|Hands[- ]?On|\bPreview\b|Should You Buy|Worth It', re.I),
    'guide': re.compile(
        r'攻略|教學|教学|技巧|配裝|配装|打法|解法|速通|全收集|全成就|白金|新手指南|入門|入门|'
        r'\bGuide\b|\bTips\b|Walkthrough|\bBuild\b|Speedrun|How to (Beat|Get|Unlock)|All Collectibles', re.I),
    'news': re.compile(
        r'新聞|新闻|週報|周报|快訊|快讯|情報|情报|消息|盤點|盘点|整理|發表會|发布会|直面會|直面会|發佈會|'
        r'排行|十大|\d+款|本週|本周|每週|每周|\bNews\b|\bDirect\b|State of Play|Showcase|Game Awards|\bTGA\b|'
        r'Nintendo Direct|Xbox Games Showcase|Summer Game Fest|Top ?\d+\b|Everything (We Know|Announced)|Biggest', re.I),
    'deep': re.compile(
        r'解析|分析|劇情|剧情|雜談|杂谈|歷史|历史|考據|考据|紀錄片|纪录片|為什麼|为什么|背後|背后|設計|设计|回顧|回顾|深度|'
        r'始末|起源|真相|\bDocumentary\b|\bEssay\b|Explained|Retrospective|\bHistory of\b|\bAnalysis\b|Deep Dive|Lore\b', re.I),
    'play': re.compile(
        r'實況|实况|遊玩|游玩|直播|全流程|通關|通关|玩了|試玩版|'
        r"Let'?s ?Play|Playthrough|\bGameplay\b|\bPart ?\d+|\bEP ?\d+|#\d+\b|第\s*\d+\s*[集話话回章]|第[一二三四五六七八九十百]+[集話话回章]|"
        r'実況|プレイ', re.I),
}


def lane_of(title, kind='creator', live=None):
    """影片屬於哪一條車道。live 是 API 給的直播狀態（live / upcoming / None）。"""
    if live in ('live', 'upcoming'):
        return 'live'
    t = title or ''
    hits = [k for k in ('trailer', 'review', 'guide', 'news', 'deep', 'play') if _RX[k].search(t)]
    if kind == 'official':
        # 官方頻道上傳的幾乎都是預告、發表會：不分成實況、攻略
        return 'news' if 'news' in hits and 'trailer' not in hits else 'trailer'
    if 'trailer' in hits:
        # 「實況 + Trailer」幾乎都是預告；「Gameplay Walkthrough」不是
        if 'guide' in hits and kind != 'official':
            return 'guide'
        return 'trailer'
    for k in ('review', 'guide', 'news', 'deep', 'play'):
        if k in hits:
            return k
    return {'official': 'trailer', 'media': 'news'}.get(kind, 'play')


# ---------------------------------------------------------------- 遊戲名稱

# 括號裡常出現、但不是遊戲名的字
LABELS = re.compile(
    r'^(直播|實況|实况|評測|评测|攻略|新聞|新闻|預告|预告|中字|中文字幕|熟肉|生肉|搬運|搬运|精華|精华|合集|全劇情|全剧情|'
    r'劇情|剧情|解說|解说|中文|繁中|簡中|简中|字幕|官方|最新|速報|速报|快訊|快讯|情報|情报|爆料|更新|活動|活动|'
    r'4K|8K|60FPS|120FPS|HDR|PS5|PS4|PC|NS|NS2|Switch|Switch ?2|Xbox|XSX|Steam|DLC|PV|CM|EP\d*|第.+[集話话回章]|上|中|下|完|終|终|'
    r'Live|LIVE|Trailer|Gameplay|Official|Review|News|Shorts?|ネタバレ|実況|字幕付き)$', re.I)

BRACKETS = (('《', '》'), ('『', '』'), ('〈', '〉'), ('「', '」'), ('【', '】'))

_EN_SUFFIX = re.compile(
    r'\s+(?:-|–|—|\||:)?\s*(?:Official\s+)?(?:(?:Announcement|Announce|Launch|Release Date|Reveal|Story|Cinematic|Gameplay|Accolades|'
    r'Overview|Features?|Teaser|Final|Opening|Extended|Showcase|Character|Combat|World|Story|Animated|Live Action|TV|Spot|PS5|PC|Xbox)\s+)*'
    r'(?:Trailer|Teaser|Gameplay|Review|Preview|Walkthrough|Guide|Explained|Impressions|Hands[- ]?On|Before You Buy|Overview|Showcase|Reveal)\b.*$',
    re.I)
_EN_SPLIT = re.compile(r'\s+[-–—|]\s+|\s*\|\s*|:\s+(?=(?:Official|Announcement|Launch|Gameplay|Story|Reveal|Teaser|Trailer|Review|The\s+Final|Release)\b)', re.I)
_JUNK = re.compile(r'\[[^\]]*\]|\([^)]*\)|（[^）]*）|#\S+|\b(?:4K|8K|60FPS|HDR|PS5|PS4|PC|Xbox Series X\|?S?|Nintendo Switch 2|Switch 2|Switch)\b', re.I)
_CJK_JUNK = re.compile(r'【[^】]*】|\[[^\]]*\]|（[^）]*）|\([^)]*\)|#\S+')
_NAME_OK = re.compile(r'[A-Za-z0-9一-鿿぀-ヿ]')

GENERIC_EN = re.compile(
    r'^(?:the|a|an|this|these|my|our|we|i|how|why|what|top|best|every|all|new|latest|biggest|huge|official|game|games|gaming|'
    r'video|news|review|trailer|live|stream|episode|part|chapter|season|update|patch|dlc|nintendo|playstation|xbox|steam|pc|ps5|'
    r'switch|ign|gamespot|daily fix|this week)\b', re.I)


def norm(name):
    """遊戲名稱比對用的鍵：全形轉半形、小寫、只留文字和數字。"""
    s = re.sub(r'[™®©]', '', name or '')
    s = unicodedata.normalize('NFKC', s).lower()
    s = re.sub(r'[^0-9a-z一-鿿㐀-䶿぀-ヿ가-힯]+', '', s)
    return s


def _clean_name(n):
    n = unicodedata.normalize('NFKC', n).strip(' \t-–—|:：·・,，.。!！?？~～"“”\'')
    n = re.sub(r'\s+', ' ', n)
    return n


def names_in(title):
    """從標題抓出可能的遊戲名稱（照可信度排）。"""
    t = title or ''
    out = []
    for a, b in BRACKETS:
        for m in re.finditer(re.escape(a) + r'([^' + re.escape(a + b) + r']{2,40})' + re.escape(b), t):
            n = _clean_name(m.group(1))
            if len(n) < 2 or LABELS.match(n) or not _NAME_OK.search(n):
                continue
            # 【】裡多半是標籤：只收看起來像作品名的（有中英文且不是一整句）
            if a == '【' and (len(n) > 18 or re.search(r'[，,。！!？?]', n)):
                continue
            out.append(n)
    if out:
        return _dedupe(out)
    # 沒有書名號：英文標題「Name - Official Trailer」「Name Review」
    s = _JUNK.sub(' ', t)
    s = re.sub(r'\s+', ' ', s).strip()
    if _LATIN.search(s) and len(_HAN.findall(s)) < 2:
        parts = [p.strip() for p in _EN_SPLIT.split(s) if p and p.strip()]
        cand = None
        if len(parts) >= 2:
            # 第一段通常是遊戲名；如果第一段才是節目名（像 IGN Daily Fix），改看最後一段
            cand = parts[0] if not GENERIC_EN.match(parts[0]) else parts[-1]
        else:
            m = _EN_SUFFIX.search(s)
            if m and m.start() > 2:
                cand = s[:m.start()]
            elif ': ' in s:
                head = s.split(': ')[0].strip()
                if 1 <= len(head.split()) <= 5 and head[:1].isupper():
                    cand = head
        if cand:
            cand = _EN_SUFFIX.sub('', cand).strip()
            cand = _clean_name(cand)
            words = cand.split()
            if 1 <= len(words) <= 7 and len(cand) >= 3 and not GENERIC_EN.match(cand) and not re.search(r'\b(?:I|we|you|my|is|are|was|were)\b', cand):
                out.append(cand)
                # 「Grand Theft Auto VI: The Festival」→ 也試冒號前的「Grand Theft Auto VI」
                if ': ' in cand:
                    head = _clean_name(cand.split(': ')[0])
                    if len(head) >= 3 and not GENERIC_EN.match(head):
                        out.append(head)
        # 常見的縮寫，例如 GTA 6
        for rx, full in EN_ALIAS:
            if rx.search(s) and full not in out:
                out.append(full)
    else:
        # 中文標題沒有書名號：試「遊戲名：副標」或「遊戲名 - 預告」
        s2 = _CJK_JUNK.sub(' ', t).strip()
        m = re.match(r'^([^\s：:｜|\-–—]{2,14})\s*[：:｜|\-–—]\s*\S', s2)
        if m:
            n = _clean_name(m.group(1))
            if not LABELS.match(n) and _HAN.search(n):
                out.append(n)
    return _dedupe(out)


EN_ALIAS = [
    (re.compile(r'\bGTA ?(?:6|VI)\b', re.I), 'Grand Theft Auto VI'),
    (re.compile(r'\bRDR ?2\b', re.I), 'Red Dead Redemption 2'),
    (re.compile(r'\bBotW\b'), 'The Legend of Zelda: Breath of the Wild'),
    (re.compile(r'\bTotK\b'), 'The Legend of Zelda: Tears of the Kingdom'),
    (re.compile(r'\bFF ?7 ?Rebirth\b', re.I), 'Final Fantasy VII Rebirth'),
]

# 同一款遊戲的不同叫法（多半是不在 Steam 上、對不到的主機大作）→ 統一用第一個名字
ALIASES = {
    'Grand Theft Auto VI': ['GTA 6', 'GTA VI', 'GTA6', '俠盜獵車手6', '俠盜獵車手 6', '俠盜獵車手VI', '侠盗猎车手6', 'グランド・セフト・オートVI', 'Grand Theft Auto 6'],
    'Ghost of Yōtei': ['Ghost of Yotei', '對馬戰鬼 羊蹄山', '羊蹄山戰鬼', 'Ghost of Yōtei Legends'],
    'Mario Kart World': ['瑪利歐賽車 世界', 'マリオカート ワールド'],
    'Pokémon Legends: Z-A': ['寶可夢傳說 Z-A', 'Pokemon Legends Z-A', 'ポケモンレジェンズ Z-A'],
    'Donkey Kong Bananza': ['咚奇剛 蕉力全開', 'ドンキーコング バナンザ'],
}
ALIAS_KEY = {}
for _main, _alts in ALIASES.items():
    for _a in [_main] + _alts:
        ALIAS_KEY[None] = None
        ALIAS_KEY[re.sub(r'[^0-9a-z\u4e00-\u9fff\u3040-\u30ff]+', '', unicodedata.normalize('NFKC', _a).lower())] = _main
ALIAS_KEY.pop(None, None)


def canonical(name):
    """別名 → 統一名稱（沒有別名就原樣）。"""
    return ALIAS_KEY.get(norm(name), name)


def _dedupe(xs):
    seen, out = set(), []
    for x in xs:
        k = norm(x)
        if k and k not in seen:
            seen.add(k)
            out.append(x)
    return out


def similar(a, b):
    """兩個遊戲名稱算不算同一款（給 Steam 比對用）。"""
    na, nb = norm(a), norm(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    short, long_ = sorted((na, nb), key=len)
    if len(short) >= 4 and long_.startswith(short):
        rest = long_[len(short):]
        # 只有「版本字」可以多：豪華版、完整版、GOTY…；多了數字或羅馬數字就是續作
        return bool(re.fullmatch(EDITION, rest))
    if re.search(r'(?:\d|ii|iii|iv|vi|vii|viii|ix|x)$', na) != re.search(r'(?:\d|ii|iii|iv|vi|vii|viii|ix|x)$', nb):
        return False
    from difflib import SequenceMatcher
    return SequenceMatcher(None, na, nb).ratio() >= 0.9


EDITION = (r'(?:deluxe|digital|standard|ultimate|complete|definitive|goty|gameoftheyear|premium|gold|special|collectors|'
           r'directorscut|enhanced|remastered|edition|版|豪華版|豪华版|完全版|完整版|決定版|决定版|年度版|數位|数字|'
           r'終極版|终极版|標準版|标准版|典藏版|ps5|ps4|pc|switch|xbox)+')


# ---------------------------------------------------------------- 濾掉不想要的

SPAM = re.compile(r'搬運|搬运|转载|轉載|reupload|盜版|盗版|破解版|外掛|外挂|免費領取|免费领取|兌換碼|兑换码|禮包碼|礼包码|序號|首抽|刷首抽|抽卡|轉蛋|转蛋|代儲|代储|賺錢|赚钱', re.I)
GACHA = re.compile(r'原神|崩壞|崩坏|星穹鐵道|星穹铁道|絕區零|绝区零|鳴潮|鸣潮|明日方舟|蔚藍檔案|蔚蓝档案|碧藍航線|碧蓝航线|賽馬娘|赛马娘|FGO|天堂M|天堂W|Genshin|Honkai|Zenless|Wuthering|Arknights|Blue Archive|Uma Musume', re.I)


def iso_dur(s):
    """ISO 8601 片長（PT1H2M3S）→ 秒。"""
    if not s:
        return None
    m = re.match(r'^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$', s)
    if not m:
        return None
    d, h, mi, se = (int(x) if x else 0 for x in m.groups())
    return d * 86400 + h * 3600 + mi * 60 + se
