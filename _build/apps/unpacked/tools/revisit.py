#!/usr/bin/env python3
"""舊稿回訪：列出「寫稿之後 Steam 上變很多」的專題和推坑，給寫稿編輯、推坑編輯每天挑 1～2 篇改寫
（WRITER_GUIDE.md §5b、PICKS_GUIDE.md §回訪）。只讀資料，不改任何檔案。

用法（在 repo 根目錄）：
  python3 _build/apps/unpacked/tools/revisit.py --kind f        # 專題（寫稿編輯）
  python3 _build/apps/unpacked/tools/revisit.py --kind p        # 推坑（推坑編輯）
  加 --n 10 多列幾篇、--json 給程式讀。

規則（跟 App 的「寫稿之後」用同一套資料：GitHub Actions 每小時比對 Steam 記下的變化、收的官方公告）：
  - 寫稿 7 天內的不列：那段時間照寫稿指南「順手更正舊稿」直接改。
  - 有真的變化（加了繁中、上市、正式版、改免費、原價調整、評價大轉向、開放工作坊）→ 列。
  - 只有官方更新（patch）→ 至少 3 則、而且上次對資料是 60 天前以上才列（活躍的遊戲天天在更新，不用每個月重寫）。
  - 分數高的先：變化越重要、更新越多分數越高。
"""
import argparse, datetime as dt, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import live as L  # noqa: E402

REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))


def chg_text(c):
    md = lambda iso: L._tw_md(iso)  # noqa: E731
    k = c.get('k')
    if k == 'zh':
        t = '加了繁中' if c.get('b') == 'tc' else '加了簡中（還沒有繁中）'
    elif k == 'rel':
        t = '上市了（搶先體驗）' if c.get('b') == 'ea' else '正式上市'
    elif k == 'ea':
        t = '結束搶先體驗、推出正式版'
    elif k == 'free':
        t = '改成免費遊玩'
    elif k == 'orig':
        t = f'原價 NT${c["a"] // 100} → NT${c["b"] // 100}'
    elif k == 'rv':
        t = f'Steam 好評率 {c["a"]}% → {c["b"]}%'
    elif k == 'ws':
        t = '開放 Steam 工作坊（Mod）'
    else:
        t = k or '?'
    return f'{t}（{md(c.get("d"))}）'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=os.path.join(REPO, 'apps', 'unpacked', 'data'))
    ap.add_argument('--kind', choices=['f', 'p'])
    ap.add_argument('--n', type=int, default=5)
    ap.add_argument('--json', action='store_true')
    a = ap.parse_args()
    D = a.data
    live = L.live_load(D)
    idx = L.load(os.path.join(D, 'index.json'), {'items': []})
    pk = L.load(os.path.join(D, 'picks.json'), {'items': []})
    full = L.stale_items(live.get('apps') or {}, idx, pk)
    today = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=8)).date()
    info = {'f:' + x['id']: x for x in idx.get('items') or []}
    info.update({'p:' + x['id']: x for x in pk.get('items') or []})
    rows = []
    for ref, e in full.items():
        if a.kind and not ref.startswith(a.kind + ':'):
            continue
        it = info.get(ref) or {}
        try:
            age = (today - dt.date.fromisoformat(it.get('date') or '')).days
            quiet = (today - dt.date.fromisoformat(e['since'])).days
        except ValueError:
            continue
        if age <= 7:
            continue
        if not e.get('ch') and not (e.get('np', 0) >= 3 and quiet >= 60):
            continue
        app = (live.get('apps') or {}).get(str(it.get('steam'))) or {}
        news = [n for n in app.get('news') or [] if (L._ts(n.get('d')) or 0) > (L._since(it) or 0)]
        kind, iid = ref.split(':', 1)
        rows.append({'ref': ref, 'id': iid, 'kind': kind, 'zh': it.get('zh'), 'date': it.get('date'), 'since': e['since'], 'score': e['score'],
                     'last': e['last'], 'steam': it.get('steam'), 'changes': [chg_text(c) for c in e.get('ch') or []],
                     'news': [{'d': L._tw_md(n['d']), 'k': '更新' if n.get('k') == 'patch' else '公告', 't': n['t'], 'u': n.get('u')} for n in news],
                     'file': f'apps/unpacked/data/{"features" if kind == "f" else "picks"}/{iid}.json'})
    rows.sort(key=lambda r: (r['score'], r['last']), reverse=True)
    rows = rows[:a.n]
    if a.json:
        print(json.dumps(rows, ensure_ascii=False, indent=1))
        return
    if not rows:
        print('今天沒有需要回訪的舊稿（寫稿之後 Steam 上沒有夠大的變化）。')
        return
    for i, r in enumerate(rows, 1):
        print(f'{i}. [{"專題" if r["kind"] == "f" else "推坑"}] {r["zh"]}（{r["id"]}，寫於 {r["date"]}，上次對資料 {r["since"]}）分數 {r["score"]}')
        if r['changes']:
            print('   變化：' + '、'.join(r['changes']))
        if r['news']:
            print(f'   官方公告 {len(r["news"])} 則：' + '；'.join(f'{n["d"]} {n["k"]}「{n["t"]}」' for n in r['news'][:4]))
        print(f'   Steam：https://store.steampowered.com/app/{r["steam"]}/ ・公告：https://store.steampowered.com/news/app/{r["steam"]}')
        print(f'   檔案：{r["file"]}')


if __name__ == '__main__':
    main()
