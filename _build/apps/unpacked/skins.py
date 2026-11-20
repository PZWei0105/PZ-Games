#!/usr/bin/env python3
"""解包 — 換裝系統（2026-11-20）

style.css 照常用塗鴉版的顏色寫（var(--y)、#fff、#333…），App 本體就是原封不動的塗鴉版（開 App 不多花時間）。
組建時這支程式把每一條有顏色的宣告分角色（t 字、b 底色、ba/bt 濃／淡的半透明底、l 框線、h 陰影、o 色塊上的白字），
照下面 SKINS 的規則算出另外三套的顏色，各寫成一個 skins/<名字>.css（只放「跟塗鴉版不一樣的那幾條」，同樣的選擇器、
排在後面所以會蓋過去），換上那一套時才載入。所以**以後任何人加新畫面，照塗鴉版寫就會自動跟著換裝**。
字型也一樣：var(--cjk) 依字重、字級自動分成 --cjkh（大標）、--cjkb（內文）、--cjk（介面），在各套的 :root 定義。

不想跟著換的（影片上的白字、粉專圖卡預覽…）：宣告後面加 /*fixed*/（寫在分號前），或整段包在 /*skin:fixed*/ … /*skin:end*/ 之間。
各套的特殊造型寫在 src/skin-<名字>.css（接在那一套的檔案後面，可以直接寫顏色）；換裝選單的迷你預覽在 src/skin-preview.css（一直生效）。
"""
import colorsys, os, re

SKIN_IDS = ['graffiti', 'pixel', 'neon', 'paper']
BASE_KEYS = ['y', 'p', 'k', 'w', 'r', 'g', 'g2', 't2', 't3', 'up', 'dn', 'gold']
ACCENTS = {'y', 'p', 'r', 'up', 'dn', 'gold'}
NEUTRAL_KEYS = {'k', 'w', 'g', 'g2', 't2', 't3'}

ROLE = {
    'color': 't', 'fill': 't', 'stroke': 't', 'caret-color': 't', 'text-decoration-color': 't', 'accent-color': 't',
    'background': 'b', 'background-color': 'b', 'background-image': 'b',
    'border': 'l', 'border-top': 'l', 'border-right': 'l', 'border-bottom': 'l', 'border-left': 'l', 'border-color': 'l',
    'border-top-color': 'l', 'border-right-color': 'l', 'border-bottom-color': 'l', 'border-left-color': 'l',
    'border-block': 'l', 'border-inline': 'l', 'border-block-end': 'l', 'border-block-start': 'l', 'border-inline-start': 'l', 'border-inline-end': 'l',
    'outline': 'l', 'outline-color': 'l', '-webkit-text-stroke': 'l', '-webkit-text-stroke-color': 'l', 'column-rule': 'l',
    'box-shadow': 'h', 'text-shadow': 'h',
}

# ---------------------------------------------------------------- 顏色小工具
def hx(s):
    s = s.strip().lower().lstrip('#')
    if len(s) in (3, 4):
        s = ''.join(c * 2 for c in s)
    rgb = tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
    a = int(s[6:8], 16) / 255 if len(s) == 8 else 1.0
    return rgb, a


def to_hex(rgb):
    return '#%02x%02x%02x' % tuple(max(0, min(255, round(v))) for v in rgb)


def lum(rgb):   # WCAG 相對亮度
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def light(rgb):   # 灰階用：0（黑）～1（白）
    return sum(rgb) / 765


def is_neutral(rgb):
    return max(rgb) - min(rgb) < 26


def lerp_anchor(anchors, x):
    """anchors：[(位置, '#hex'), …] 位置由小到大"""
    if x <= anchors[0][0]:
        return anchors[0][1]
    for (x0, c0), (x1, c1) in zip(anchors, anchors[1:]):
        if x <= x1:
            t = 0 if x1 == x0 else (x - x0) / (x1 - x0)
            a, b = hx(c0)[0], hx(c1)[0]
            return to_hex([a[i] + (b[i] - a[i]) * t for i in range(3)])
    return anchors[-1][1]


def hue_family(rgb):
    h, l, s = colorsys.rgb_to_hls(*(v / 255 for v in rgb))
    d = h * 360
    if s < 0.18:
        return None
    if d >= 300 or d < 8:
        return 'pink' if d >= 300 and d < 352 or (rgb[2] > 90 and rgb[0] > 160) else 'red'
    if d < 40:
        return 'orange'
    if d < 70:
        return 'yellow'
    if d < 170:
        return 'green'
    if d < 255:
        return 'blue'
    return 'purple'


def shift_like(src_rgb, fam_base_rgb, target_hex):
    """照「原色相對它那一族基準色」的明暗差，把目標色調亮或調暗"""
    _, l0, _ = colorsys.rgb_to_hls(*(v / 255 for v in fam_base_rgb))
    _, l1, _ = colorsys.rgb_to_hls(*(v / 255 for v in src_rgb))
    th, tl, ts = colorsys.rgb_to_hls(*(v / 255 for v in hx(target_hex)[0]))
    nl = max(0.04, min(0.97, tl + (l1 - l0)))
    return to_hex([v * 255 for v in colorsys.hls_to_rgb(th, nl, ts)])


def ensure_contrast(hexc, bg_hex, need):
    rgb = hx(hexc)[0]; bg = hx(bg_hex)[0]
    h, l, s = colorsys.rgb_to_hls(*(v / 255 for v in rgb))
    darker = lum(bg) > 0.4
    for _ in range(40):
        if contrast(rgb, bg) >= need:
            break
        l = max(0, l - 0.025) if darker else min(1, l + 0.025)
        rgb = tuple(v * 255 for v in colorsys.hls_to_rgb(h, l, s))
    return to_hex(rgb)


# ---------------------------------------------------------------- 四套色票
GRAFFITI_FAM = {'pink': '#ff2e88', 'yellow': '#ffe600', 'red': '#e3001b'}

SKINS = {
    'graffiti': {'name': '塗鴉街頭', 'dark': True},
    'pixel': {
        'name': '像素掌機', 'dark': True, 'theme': '#0b0d24',
        'base': {'y': '#ffec27', 'p': '#29adff', 'k': '#05061a', 'w': '#fff1e8', 'r': '#ff004d', 'g': '#151a3f', 'g2': '#1c2350',
                 't2': '#c2c3c7', 't3': '#8f86b0', 'up': '#ff004d', 'dn': '#00e436', 'gold': '#ffa300'},
        'acc': {'p': {'h': '#1d6fc2'}, 'y': {'h': '#ab5236'}},
        'special': {('b', 'k'): '#0b0d24', ('l', 'k'): '#000000', ('h', 'k'): '#000000', ('t', 'k'): '#05061a', ('b', 'w'): '#fff1e8'},
        'fam': {'pink': '#ff77a8', 'yellow': '#ffec27', 'red': '#ff004d', 'orange': '#ffa300', 'green': '#00e436', 'blue': '#29adff'},
        'n': {'*': [(0, '#000000'), (0.04, '#080a1e'), (0.07, '#0b0d24'), (0.1, '#121636'), (0.13, '#181e46'), (0.17, '#1f275a'), (0.2, '#28326b'),
                    (0.27, '#36407e'), (0.33, '#45508f'), (0.4, '#5a63a0'), (0.53, '#7d83b6'), (0.6, '#9196c2'), (0.73, '#b4b7d6'), (0.87, '#dcdbe8'), (1, '#fff1e8')]},
    },
    'neon': {
        'name': '霓虹賽博', 'dark': True, 'theme': '#08040f',
        'base': {'y': '#00f0ff', 'p': '#ff2bd6', 'k': '#07030f', 'w': '#ece6ff', 'r': '#ff3d6e', 'g': '#140c26', 'g2': '#1b1133',
                 't2': '#b9b0e3', 't3': '#7f76ad', 'up': '#ff3d6e', 'dn': '#3dffa8', 'gold': '#ffd23f'},
        'acc': {},
        'special': {('b', 'k'): '#08040f', ('l', 'k'): '#07030f', ('h', 'k'): '#000000', ('t', 'k'): '#07030f', ('b', 'w'): '#ece6ff'},
        'fam': {'pink': '#ff2bd6', 'yellow': '#00f0ff', 'red': '#ff3d6e', 'orange': '#ff9f1c', 'green': '#3dffa8', 'blue': '#5b7cff', 'purple': '#b26bff'},
        'n': {'*': [(0, '#030108'), (0.04, '#06030d'), (0.07, '#0b0617'), (0.1, '#110a21'), (0.13, '#170e2c'), (0.17, '#1e1438'), (0.2, '#271b47'),
                    (0.27, '#33275a'), (0.33, '#42356d'), (0.4, '#544881'), (0.53, '#7a6fa6'), (0.6, '#8f85b8'), (0.73, '#b4abd6'), (0.87, '#d9d2f0'), (1, '#f2eeff')]},
    },
    'paper': {
        'name': '紙本雜誌', 'dark': False, 'theme': '#f3eee2', 'paper': '#f3eee2',
        'base': {'y': '#ffd94d', 'p': '#d6262b', 'k': '#1b1813', 'w': '#fffdf8', 'r': '#c4161c', 'g': '#faf6ec', 'g2': '#f1ebdd',
                 't2': '#4f493f', 't3': '#776f62', 'up': '#c4161c', 'dn': '#0b7a43', 'gold': '#c9940a'},
        # 黃色當字會看不見：黃字→雜誌紅、粉紅字→墨水藍；黃框→墨線；彩色陰影→紅／藍套印
        'acc': {'y': {'t': '#c4161c', 'l': '#1b1813', 'h': '#d6262b', 'o': '#1b1813'},
                'p': {'t': '#1f5fa8', 'l': '#d6262b', 'h': '#1f5fa8', 'o': '#fffdf8'},
                'r': {'t': '#b3121a'}, 'up': {'t': '#b3121a'}, 'dn': {'t': '#0b6b3a'}, 'gold': {'t': '#8a6400', 'b': '#ffd94d'}},
        'special': {('b', 'k'): '#fffdf8', ('t', 'k'): '#1b1813', ('l', 'k'): '#1b1813', ('h', 'k'): '#1b1813', ('o', 'k'): '#1b1813',
                    ('b', 'w'): '#fffdf8', ('o', 'w'): '#fffdf8', ('b', '000'): '#1b1813', ('t', '000'): '#1b1813'},
        'fam': {'pink': '#d6262b', 'yellow': '#ffd94d', 'red': '#c4161c', 'orange': '#d9601a', 'green': '#0b7a43', 'blue': '#1f5fa8', 'purple': '#6b3fa0'},
        'n': {
            # 底色：深灰的面（卡片、面板）→ 米白紙；更亮的灰（晶片、按鈕底）→ 深一點的米色；純黑（影片底）保持黑
            'b': [(0, '#1b1813'), (0.025, '#1b1813'), (0.035, '#e9e3d3'), (0.07, '#f3eee2'), (0.1, '#f8f4ea'), (0.13, '#fffdf8'), (0.17, '#f1ebdd'),
                  (0.2, '#ebe4d4'), (0.27, '#e2dac6'), (0.33, '#d8cfba'), (0.4, '#cdc3ac'), (0.53, '#d8cfba'), (0.73, '#ece5d6'), (0.87, '#f6f1e6'), (1, '#fffdf8')],
            # 字：亮灰（黑底上的白字）→ 墨色；暗灰（貼紙上的黑字）維持深色
            't': [(0, '#1b1813'), (0.2, '#2b2620'), (0.33, '#4a443a'), (0.47, '#5d564b'), (0.53, '#6a6356'), (0.6, '#5d564b'), (0.73, '#4a443a'),
                  (0.8, '#3a342b'), (0.87, '#2e2921'), (0.93, '#24201a'), (1, '#1b1813')],
            # 框線：黑底上的暗灰分隔線→淡淡的紙色線；亮灰框→墨線
            'l': [(0, '#1b1813'), (0.03, '#1b1813'), (0.04, '#d6ccb6'), (0.2, '#d6ccb6'), (0.33, '#c4b9a1'), (0.47, '#a89d86'), (0.6, '#7d7465'),
                  (0.8, '#3a342b'), (1, '#1b1813')],
            'h': [(0, '#3b2f1e'), (0.13, '#3b2f1e'), (0.33, '#8a7a60'), (0.73, '#d9cfbb'), (1, '#fffdf8')],
            # 濃的半透明底（黑色面板、白色印章底）→ 淺色紙；淡的（陰影、網點、黑底上的亮面）→ 淡淡的墨色
            'ba': [(0, '#fffdf8'), (1, '#fffdf8')],
            'bt': [(0, '#1b1813'), (1, '#1b1813')],
            'o': [(0, '#1b1813'), (0.5, '#5d564b'), (1, '#fffdf8')],
        },
    },
}


def skin_value(sid, role, key, base_hex, base):
    """某一套裡，某個角色色票的顏色"""
    if sid == 'graffiti':
        return base_hex
    sk = SKINS[sid]
    if (role, key) in sk.get('special', {}):
        return sk['special'][(role, key)]
    if key in ACCENTS:
        a = sk.get('acc', {}).get(key, {})
        v = a.get(role) or a.get('*') or sk['base'][key]
        if not sk['dark'] and role in ('t', 'l') and not a.get(role):
            v = ensure_contrast(v, sk['paper'], 4.5 if role == 't' else 3)
        return v
    rgb = hx(base_hex)[0]
    if key in NEUTRAL_KEYS or is_neutral(rgb):
        n = sk['n']
        anchors = n.get(role) or n.get('*') or n.get('b')
        if role == 'o' and 'o' not in n:
            anchors = n.get('*')
        return lerp_anchor(anchors, light(rgb))
    fam = hue_family(rgb)
    tgt = sk['fam'].get(fam) if fam else None
    _, l1, s1 = colorsys.rgb_to_hls(*(v / 255 for v in rgb))
    if not tgt:
        v = base_hex
    elif fam not in GRAFFITI_FAM and (l1 > 0.82 or l1 < 0.2) and (sk['dark'] or (role in ('b', 'ba', 'bt') and l1 > 0.82) or (role in ('t', 'l', 'o') and l1 < 0.2)):
        # 塗鴉版沒有基準色的色族（綠、橘、藍、紫）：粉彩底維持粉彩、深色字維持深色——只換色相，明度照原本的。
        # 不然淺綠底和深綠字會被換成同一個綠（2026-11-21 三套的「誇的」卡片都整塊看不到字）。
        # 淺色的紙本版只保留「淺底、深字」這兩種（深色的底照舊換成色族色，跟紙本把黑底翻成紙色是同一個道理）
        th, _, ts = colorsys.rgb_to_hls(*(v / 255 for v in hx(tgt)[0]))
        v = to_hex([c * 255 for c in colorsys.hls_to_rgb(th, l1, min(ts, s1))])
    else:
        fam_base = hx(GRAFFITI_FAM.get(fam, base_hex))[0] if fam in GRAFFITI_FAM else rgb
        v = shift_like(rgb, fam_base, tgt)
    if not sk['dark']:
        if role == 't':
            v = ensure_contrast(v, sk['paper'], 4.5)
        elif role == 'l':
            v = ensure_contrast(v, sk['paper'], 2.2)
    return v


# ---------------------------------------------------------------- 字型
FONT_FILES = {   # 檔名 → (字族, 字重範圍)；放在 src/fonts/skins/，組建時複製到 fonts/，用到才下載
    'cubic-11.woff2': 'PZ Pixel', 'vt323.woff2': 'PZ Pixel Num', 'press-start-2p.woff2': 'PZ Pixel Logo',
    'teko-600.woff2': 'PZ Neon Num', 'tilt-neon.woff2': 'PZ Neon Hand', 'monoton.woff2': 'PZ Neon Logo',
    'oswald-600.woff2': 'PZ Paper Num', 'caveat-700.woff2': 'PZ Paper Hand', 'playfair-900i.woff2': 'PZ Paper Logo', 'playfair-900.woff2': 'PZ Paper Serif',
}
SANS = '"Noto Sans TC","PingFang TC","Heiti TC","Microsoft JhengHei","Noto Sans CJK TC",sans-serif'
SERIF_TC = '"Noto Serif TC","Songti TC","PMingLiU","MingLiU","Noto Serif CJK TC",serif'
FONTS = {
    'pixel': {'cjk': '"PZ Pixel",' + SANS, 'cjkh': '"PZ Pixel",' + SANS, 'cjkb': SANS,
              'num': '"PZ Pixel Num","PZ Pixel",' + SANS, 'hand': '"PZ Pixel",' + SANS, 'drip': '"PZ Pixel Logo","PZ Pixel",' + SANS},
    'neon': {'cjk': SANS, 'cjkh': SANS, 'cjkb': SANS,
             'num': '"PZ Neon Num",' + SANS, 'hand': '"PZ Neon Hand",' + SANS, 'drip': '"PZ Neon Logo","PZ Neon Hand",' + SANS},
    'paper': {'cjk': SANS, 'cjkh': '"PZ Paper Serif",' + SERIF_TC, 'cjkb': SANS,
              'num': '"PZ Paper Num",' + SANS, 'hand': '"PZ Paper Hand",' + SANS, 'drip': '"PZ Paper Logo","PZ Paper Serif",' + SERIF_TC},
}


def font_faces(url_prefix='fonts/'):
    out = []
    for fn, fam in FONT_FILES.items():
        out.append('@font-face{font-family:"%s";font-style:normal;font-weight:100 900;font-display:swap;src:url(%s%s) format("woff2")}' % (fam, url_prefix, fn))
    return '\n'.join(out)


# ---------------------------------------------------------------- 讀 :root 的基準色
def parse_base(css):
    base = {}
    for m in re.finditer(r':root\s*\{([^{}]*)\}', css):
        for k, v in re.findall(r'--([a-z0-9]+)\s*:\s*(#[0-9a-fA-F]{3,8})', m.group(1)):
            if k in BASE_KEYS and k not in base:
                base[k] = '#' + ''.join(c * 2 for c in v[1:]) if len(v) == 4 else v.lower()
    miss = [k for k in BASE_KEYS if k not in base]
    assert not miss, 'style.css 的 :root 少了 ' + ','.join(miss)
    base = {k: v.lower() for k, v in base.items()}
    fonts = {}
    m = re.search(r':root\s*\{([^{}]*)\}', css)
    for k in ('cjk', 'num', 'hand', 'drip'):
        mm = re.search(r'--%s\s*:\s*([^;]+);' % k, m.group(1))
        fonts[k] = mm.group(1).strip() if mm else SANS
    return base, fonts


# ---------------------------------------------------------------- 把 CSS 的顏色換成角色色票
COLOR_RE = re.compile(r'var\(--(%s)\)|#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+%%?)\s*)?\)' % '|'.join(sorted(BASE_KEYS, key=len, reverse=True)))
URL_RE = re.compile(r'url\([^)]*\)')


def split_decls(body):
    out, cur, depth, q = [], '', 0, None
    for ch in body:
        if q:
            cur += ch
            if ch == q:
                q = None
            continue
        if ch in '"\'':
            q = ch; cur += ch; continue
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == ';' and depth == 0:
            out.append(cur); cur = ''
        else:
            cur += ch
    out.append(cur)
    return out


class Tok:
    def __init__(self, base):
        self.base = base
        self.hex2key = {v: k for k, v in base.items()}
        self.uses = {}            # (role, key) → 塗鴉版的顏色
        self.fonts = {'cjk': 0, 'cjkh': 0, 'cjkb': 0}

    def key_of(self, rgb):
        h = to_hex(rgb)
        if h in self.hex2key:
            return self.hex2key[h], h
        k = h[1:]
        if k[0] == k[1] and k[2] == k[3] and k[4] == k[5]:
            k = k[0] + k[2] + k[4]
        return k, h

    def tok(self, role, key, h, a=1.0):
        # 半透明：每一套各自先算好「顏色＋透明度」的 8 碼色（不用 color-mix，手機算得快）
        aa = '' if a >= 0.999 else '%02x' % max(1, min(254, round(a * 255)))
        name = key + ('_' + aa if aa else '')
        self.uses[(role, name)] = (key, h, aa)
        return 'var(--%s-%s)' % (role, name)

    def color(self, role, m):
        if m.group(1):
            k = m.group(1)
            return self.tok(role, k, self.base[k])
        if m.group(2):
            rgb, a = hx(m.group(2))
        else:
            rgb = (int(m.group(3)), int(m.group(4)), int(m.group(5)))
            av = m.group(6)
            a = 1.0 if av is None else (float(av[:-1]) / 100 if av.endswith('%') else float(av))
        k, h = self.key_of(rgb)
        if a <= 0.001:
            return 'transparent'
        if a < 0.999 and role == 'b':
            # 半透明的底：濃的（深色面板、印章底、圖上的遮罩）→ ba；淡的（陰影、網點、亮面）→ bt
            role = 'ba' if a >= 0.5 else 'bt'
        return self.tok(role, k, h, a)

    def value(self, role, val):
        # url(...) 裡面不動
        parts, last = [], 0
        for um in URL_RE.finditer(val):
            parts.append(('v', val[last:um.start()])); parts.append(('u', um.group(0))); last = um.end()
        parts.append(('v', val[last:]))
        return ''.join(p if t == 'u' else COLOR_RE.sub(lambda m: self.color(role, m), p) for t, p in parts)

    def font(self, val):
        if 'var(--cjk)' not in val:
            return val
        w = re.match(r'\s*(?:italic\s+|normal\s+)?(\d{3}|bold)?\s*', val)
        wt = 700 if (w and w.group(1) == 'bold') else int(w.group(1)) if (w and w.group(1)) else 400
        sizes = [float(x) for x in re.findall(r'([\d.]+)px', val.split('var(')[0])]
        size = max(sizes) if sizes else 16
        lh = re.search(r'/\s*([\d.]+)(?!px)', val)
        lh = float(lh.group(1)) if lh else 1.2
        if wt >= 800 and size >= 20:
            t = 'cjkh'
        elif wt <= 500 and lh >= 1.45 and size >= 13:
            t = 'cjkb'
        else:
            t = 'cjk'
        self.fonts[t] += 1
        return val.replace('var(--cjk)', 'var(--%s)' % t)

    def block(self, sel, body):
        s = re.sub(r'\x00C\d+\x00', '', sel).strip()
        if s.startswith('@font-face') or re.match(r'^:root\b', s):
            return body
        decls = split_decls(body)
        acc_bg = False
        for d in decls:
            if ':' not in d:
                continue
            p, v = d.split(':', 1)
            if p.strip().lower() in ('background', 'background-color') and (re.search(r'var\(--(y|p|r|up|dn|gold)\)', v) or any(
                    not is_neutral(hx(c)[0]) for c in re.findall(r'#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b', v))):
                acc_bg = True
        # 長段文字（行高 1.45 以上、沒指定字型）：像素版用好讀的黑體，其他版跟介面一樣
        props = {}
        for d in decls:
            if ':' in d:
                p, v = d.split(':', 1); props[p.strip().lower()] = v.strip()
        lhv = props.get('line-height', '')
        if 'font' not in props and 'font-family' not in props and re.fullmatch(r'1\.[4-9]\d*|[2-9](\.\d+)?', lhv or '') and float(lhv) >= 1.45:
            decls = decls[:-1] + [decls[-1], 'font-family:var(--cjkb)'] if decls[-1].strip() else decls[:-1] + ['font-family:var(--cjkb)', '']
            self.fonts['cjkb'] += 1
        out = []
        for d in decls:
            if ':' not in d or '\x00FIX' in d:
                out.append(d); continue
            p, v = d.split(':', 1)
            prop = p.strip().lower()
            if prop.startswith('--'):
                out.append(d); continue
            if prop in ('font', 'font-family'):
                out.append(p + ':' + self.font(v)); continue
            role = ROLE.get(prop)
            if not role:
                out.append(d); continue
            if role == 't' and acc_bg:
                # 色塊上的白字：換成 o-（淺色系的套裝裡，紅底上的白字要維持白色）
                def on(m):
                    if m.group(1) in ('w',) or (m.group(2) and is_neutral(hx(m.group(2))[0]) and light(hx(m.group(2))[0]) > 0.8):
                        return self.color('o', m)
                    return self.color('t', m)
                out.append(p + ':' + COLOR_RE.sub(on, v)); continue
            out.append(p + ':' + self.value(role, v))
        return ';'.join(out)


def parse_tree(css):
    """把（註解已經收起來的）CSS 拆成：('rule', 選擇器, 內容)、('group', '@media…', [子節點])、('kf', '@keyframes…', 內容)、('skip', …)"""
    nodes, i, start, n = [], 0, 0, len(css)
    while i < n:
        c = css[i]
        if c == '{':
            pre = css[start:i].strip()
            j, d = i + 1, 1
            while j < n and d:
                if css[j] == '{':
                    d += 1
                elif css[j] == '}':
                    d -= 1
                j += 1
            inner = css[i + 1:j - 1]
            pl = pre.lstrip()
            if pl.startswith(('@media', '@supports', '@container', '@layer')):
                nodes.append(('group', pre, parse_tree(inner)))
            elif re.match(r'@(-webkit-)?keyframes', pl):
                nodes.append(('kf', pre, inner))
            elif pl.startswith('@'):
                nodes.append(('skip', pre, inner))
            else:
                nodes.append(('rule', pre, inner))
            i = start = j
            continue
        if c == ';':
            start = i + 1
        i += 1
    return nodes


ROLE_VAR = re.compile(r'var\(--(t|b|l|h|o|ba|bt)-([0-9a-z_]+)\)')


def build_skins(src_dir):
    """回傳（App 本體的 CSS、{套: 那一套的 CSS}、Tok）"""
    css = open(os.path.join(src_dir, 'style.css'), encoding='utf-8').read()
    base, fonts = parse_base(css)
    tk = Tok(base)
    comments = []

    def keep(m):
        c = m.group(0)
        comments.append(c)
        tag = '\x00FIX' if c.replace(' ', '') == '/*fixed*/' else ''
        return '%s\x00C%d\x00' % (tag, len(comments) - 1)
    work = re.sub(r'/\*.*?\*/', keep, css, flags=re.S)
    starts = [i for i, c in enumerate(comments) if c.replace(' ', '') == '/*skin:fixed*/']
    ends = [i for i, c in enumerate(comments) if c.replace(' ', '') == '/*skin:end*/']
    for a, b in zip(starts, ends):
        work = re.sub(re.escape('\x00C%d\x00' % a) + r'.*?' + re.escape('\x00C%d\x00' % b), '', work, flags=re.S)
    work = re.sub(r'\x00C\d+\x00', ' ', work)

    items = []   # (外層 @media 們, 選擇器, [(屬性, 換好角色的值)]) 或 ('kf', 外層, @keyframes 開頭, 換好角色的內容)

    def walk(nodes, ctx):
        for kind, pre, body in nodes:
            if kind == 'group':
                walk(body, ctx + [pre])
            elif kind == 'rule':
                sel = re.sub(r'\s+', ' ', pre).strip()
                if not sel or re.match(r'^:root\b', sel):
                    continue
                out = tk.block(sel, body)
                if out == body:
                    continue
                o_decls, n_decls = split_decls(body), split_decls(out)
                diff = []
                o_map = {}
                for d in o_decls:
                    if ':' in d:
                        p, v = d.split(':', 1); o_map.setdefault(p.strip().lower(), v.strip())
                for d in n_decls:
                    if ':' not in d or '\x00FIX' in d:
                        continue
                    p, v = d.split(':', 1); p = p.strip().lower(); v = v.strip()
                    if p.startswith('--'):
                        continue
                    if o_map.get(p) != v:
                        diff.append((p, v))
                if diff:
                    full = {}
                    for d in n_decls:
                        if ':' in d:
                            p, v = d.split(':', 1); full[p.strip().lower()] = v.strip()
                    items.append(('rule', ctx, sel, diff, full, o_map))
            elif kind == 'kf':
                out = re.sub(r'([^{}]*)\{([^{}]*)\}', lambda m: m.group(1) + '{' + tk.block('kf', m.group(2)) + '}', body)
                if out != body:
                    items.append(('kf', ctx, pre.strip(), out))
    walk(parse_tree(work), [])

    def lit(sid, v):
        return ROLE_VAR.sub(lambda m: tk_val(sid, m.group(1), m.group(2)), v)

    def tk_val(sid, role, name):
        key, h, aa = tk.uses[(role, name)]
        return skin_value(sid, role, key, h, base) + aa

    def solid(v):
        if not v or '\x00' in v:
            return None
        imp = '!important' in v
        m = re.fullmatch(r'\s*(#[0-9a-fA-F]{3,8})\s*(?:!important)?\s*', v)
        return (m.group(1), imp) if m else None

    def gval(v):   # 塗鴉版的實際顏色
        return re.sub(r'var\(--([a-z0-9]+)\)', lambda m: base.get(m.group(1), m.group(0)), v or '')

    def fix_contrast(sid, full, orig):
        """同一條規則裡「底色＋字色」換完幾乎同色（對比 < 1.8，塗鴉版原本 ≥ 3）→ 字改成那一套的墨色或紙白，哪個清楚用哪個。
        2026-11-21：三套的「誇的」卡片、紙本版黑底白字的小標，都換成同色看不到字"""
        bgv = full.get('background-color') or full.get('background')
        fgv = full.get('color')
        b, f = solid(lit(sid, bgv) if bgv else None), solid(lit(sid, fgv) if fgv else None)
        ob, of = solid(gval(orig.get('background-color') or orig.get('background'))), solid(gval(orig.get('color')))
        if not (b and f and ob and of):
            return None
        (brgb, ba), (frgb, fa) = hx(b[0]), hx(f[0])
        if ba < 0.95 or fa < 0.95 or contrast(brgb, frgb) >= 1.8:
            return None
        if contrast(hx(ob[0])[0], hx(of[0])[0]) < 3:
            return None   # 塗鴉版本來就是淡淡的（故意的）
        sk = SKINS[sid]
        best = max((sk['base']['k'], sk['base']['w']), key=lambda c: contrast(hx(c)[0], brgb))
        return best + (' !important' if f[1] else '')

    sheets = {}
    for sid in SKIN_IDS[1:]:
        sk, f = SKINS[sid], FONTS[sid]
        root = ';'.join(['--%s:%s' % (k, sk['base'][k]) for k in BASE_KEYS] + ['--%s:%s' % (k, f[k]) for k in ('cjk', 'cjkh', 'cjkb', 'num', 'hand', 'drip')])
        parts = ['/* 解包 換裝：%s（skins.py 自動產生，不要手改） */' % sk['name'], ':root{%s}' % root]
        for it in items:
            if it[0] == 'rule':
                _, ctx, sel, diff, full, orig = it
                fx = fix_contrast(sid, full, orig)
                if fx:
                    diff = [(p, v) for p, v in diff if p != 'color'] + [('color', fx)]
                txt = '%s{%s}' % (sel, ';'.join('%s:%s' % (p, lit(sid, v)) for p, v in diff))
            else:
                _, ctx, pre, inner = it
                txt = '%s{%s}' % (pre, lit(sid, inner))
            for c in reversed(ctx):
                txt = '%s{%s}' % (c, txt)
            parts.append(txt)
        fn = os.path.join(src_dir, 'skin-%s.css' % sid)
        if os.path.exists(fn):
            parts.append('/* ---- skin-%s.css ---- */\n' % sid + open(fn, encoding='utf-8').read())
        sheets[sid] = '\n'.join(parts)
    pv = os.path.join(src_dir, 'skin-preview.css')
    app_css = '\n'.join([font_faces(), css] + ([open(pv, encoding='utf-8').read()] if os.path.exists(pv) else []))
    # 塗鴉版也要有 --cjkh／--cjkb（各套的特殊造型會用到）
    app_css += '\n:root{--cjkh:var(--cjk);--cjkb:var(--cjk)}'
    return app_css, sheets, tk


HEX_INLINE = re.compile(r'style=\\?"[^"]*?(?:#[0-9a-fA-F]{3,8}\b|var\(--(?:y|p|k|w|r|g|g2|t2|t3|up|dn|gold)\))')


def check_js(js_files):
    """JS 裡寫死在 style="" 的顏色換裝時不會跟著變：列出來（組建會印警告）"""
    bad = []
    for name, src in js_files:
        for i, line in enumerate(src.split('\n'), 1):
            if HEX_INLINE.search(line) and 'skin:ok' not in line:
                bad.append('%s:%d' % (name, i))
    return bad


if __name__ == '__main__':
    import sys
    src = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src')
    app, sheets, tk = build_skins(src)
    print('色票', len(tk.uses), '個；字型', tk.fonts, '；App 本體 CSS', len(app) // 1024, 'KB；', '、'.join('%s %d KB' % (k, len(v) // 1024) for k, v in sheets.items()))
    if '--dump' in sys.argv:
        for (r, n), (k, h, aa) in sorted(tk.uses.items()):
            print(r, n, h, ' '.join(skin_value(s, r, k, h, parse_base(open(os.path.join(src, 'style.css')).read())[0]) + aa for s in SKIN_IDS[1:]))
