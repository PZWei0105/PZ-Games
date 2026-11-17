#!/usr/bin/env python3
"""轉機 TURNAROUND — 機隊名單（fleet.json）

從收藏庫的總表（_build/data/catalog_base.json）和網站的 catalog.json（封面圖）整理出「已完成的作品」，
每一款給一個機號（遊戲 B-PZ###、App B-PA##，照上架日期排、號碼不會變），保留歷次檢修紀錄。

  python3 _build/apps/turnaround/tools/fleet.py            # 更新 apps/turnaround/data/fleet.json

規矩（痞子葳 2026-11-17）：機庫只複盤「已完成」的作品；進行中的在原本的對話裡討論。
- 遊戲：status 是 shipped 的才進機庫；dev（試作、還在做）標 skip。
- App：冷眼永遠不動；有自己維護排程的 App（玩真的、回波、版本答案、下單前、沙盤、本機道場、收藏庫本身）不重複複盤；
  還在密集開發的（解包）先標進行中。其餘照常排進機庫。
新做好的作品不用改這支程式：總表多一筆，下次跑就自動編號入列。
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
BASE = os.path.join(REPO, '_build', 'data', 'catalog_base.json')
SITE = os.path.join(REPO, 'catalog.json')
OUT = os.path.join(REPO, 'apps', 'turnaround', 'data', 'fleet.json')

# 不進機庫的 App（理由會顯示在機隊頁）
APP_SKIP = {
    'coldeye': '冷眼永遠獨立對待，不在機庫範圍',
    'sandtable': '跟冷眼合用維護排程',
    'forreal': '有自己的每週維護排程',
    'echo-radar': '有自己的每週維護排程',
    'ai-meta': '有自己的每週維護排程',
    'before-checkout': '有自己的每週維護排程',
    'local-dojo': '有自己的維護排程',
    'unpacked': '還在密集開發中（進行中的作品在原對話討論）',
    'engine-lab': '引擎展示間，跟著《PZ 引擎》一起更新',
    'pz-host': '舊版總表，已由《PZ 遊戲收藏》取代',
    'ai-game-class': '一次性的查證頁',
    'video-skills': '一次性的查證頁',
    'chat-rename': '一次性的工具頁',
    'maintenance': '一次性的工具頁',
    'turnaround': '就是這個 App 本身',
}


def load(p, default=None):
    try:
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def main():
    base = load(BASE)
    site = load(SITE, {}) or {}
    media = {g['id']: g.get('media') or {} for g in site.get('games', [])}
    genres = base.get('genres', {})
    old = load(OUT, {}) or {}
    old_by = {w['id']: w for w in old.get('works', [])}

    works = []
    games = sorted(base['games'], key=lambda g: (g.get('created') or '', g['id']))
    apps = sorted(base['apps'], key=lambda a: a['id'])

    # 機號：已經有的沿用；新的接在最大號後面
    used_g = [int(m.group(1)) for w in old_by.values() for m in [re.match(r'B-PZ(\d+)$', w.get('reg', ''))] if m]
    used_a = [int(m.group(1)) for w in old_by.values() for m in [re.match(r'B-PA(\d+)$', w.get('reg', ''))] if m]
    nxt_g = max(used_g or [0]) + 1
    nxt_a = max(used_a or [0]) + 1

    for g in games:
        o = old_by.get(g['id'], {})
        reg = o.get('reg')
        if not reg:
            reg = 'B-PZ%03d' % nxt_g
            nxt_g += 1
        m = media.get(g['id'], {})
        builds = g.get('builds') or []
        path = (builds[0].get('path') if builds else None) or ('games/%s/index.html' % (builds[0]['id'] if builds else g['id']))
        gl = genres.get(g.get('genre'), {})
        skip = None
        if g.get('status') != 'shipped':
            skip = '還在做（進行中的作品在原對話討論）'
        works.append({
            'id': g['id'], 'type': 'game', 'reg': reg,
            'zh': g['title'], 'en': g.get('en') or '',
            'genre': g.get('genre'), 'genre_zh': gl.get('label', ''), 'genre_en': gl.get('en', ''),
            'created': g.get('created'), 'updated': g.get('updated'),
            'tagline': g.get('tagline', ''), 'summary': (g.get('summary') or '')[:400],
            'palette': g.get('palette') or ['#cccccc', '#111111', '#ffd21a'],
            'cover': ('../../' + m['cover'].split('?')[0]) if m.get('cover') else None,
            'wide': ('../../' + m['wide'].split('?')[0]) if m.get('wide') else None,
            'url': '../../' + path,
            'remake': bool(g.get('remake')),
            'skip': skip,
            'inspections': o.get('inspections', []),
        })

    for a in apps:
        o = old_by.get(a['id'], {})
        reg = o.get('reg')
        if not reg:
            reg = 'B-PA%02d' % nxt_a
            nxt_a += 1
        works.append({
            'id': a['id'], 'type': 'app', 'reg': reg,
            'zh': a['title'], 'en': a.get('en') or '',
            'genre': 'app', 'genre_zh': '專屬 App', 'genre_en': 'APP',
            'created': o.get('created') or a.get('created'), 'updated': a.get('updated'),
            'tagline': a.get('tagline', ''), 'summary': (a.get('summary') or '')[:400],
            'palette': a.get('palette') or ['#cccccc', '#111111', '#ffd21a'],
            'glyph': a.get('glyph', ''),
            'cover': None, 'wide': None,
            'url': a.get('url'),
            'skip': APP_SKIP.get(a['id']),
            'inspections': o.get('inspections', []),
        })

    # 收藏庫已經刪掉的作品：保留檢修紀錄，標成退場
    ids = {w['id'] for w in works}
    for wid, o in old_by.items():
        if wid not in ids:
            o = dict(o)
            o['skip'] = '已從收藏庫移除'
            works.append(o)

    data = {'v': 1, 'works': works}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    s = json.dumps(data, ensure_ascii=False, indent=1)
    if os.path.exists(OUT) and open(OUT, encoding='utf-8').read() == s:
        print('fleet.json 沒有變動（%d 架）' % len(works))
        return
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(s)
    n_ok = sum(1 for w in works if not w.get('skip'))
    print('fleet.json：%d 架（可進廠 %d）' % (len(works), n_ok))


if __name__ == '__main__':
    main()
