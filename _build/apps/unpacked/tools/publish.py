#!/usr/bin/env python3
"""《解包》上架工具：檢查每一篇專題的格式與品質，重建目錄（index.json）和追蹤清單（track.json）。

每日寫稿排程寫完專題後一定要跑：
  python3 _build/apps/unpacked/tools/publish.py            # 檢查全部＋重建 index.json、track.json
  python3 _build/apps/unpacked/tools/publish.py --check    # 只檢查，不寫檔
  python3 _build/apps/unpacked/tools/publish.py --only rob-run   # 只檢查這一篇（目錄仍會整份重建）

有 BAD 就不准推。WARN 要看過、能改就改。
"""
import argparse
import datetime as dt
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
DATA = os.path.join(REPO, 'apps', 'unpacked', 'data')
FEAT = os.path.join(DATA, 'features')

KINDS = {'new': '新作', 'ea': '搶先體驗', 'upcoming': '即將推出', 'update': '大型更新', 'exclusive': '平台獨佔',
         'hot': '熱門話題', 'classic': '經典回顧', 'free': '限時免費', 'indie': '獨立黑馬'}
STAMPS = {'推薦', '觀望', '不推薦'}
# 常見簡體字（台灣不用）：出現就要改
SIMPLIFIED = set('这们为说时发会对应关现实体数经过还让头车门开问题页网软视频游戏级买卖钱单双东乐语论设议读谁码线红绿蓝该边远进选连运达战纬结给统络绝继续总务动劳势区团围国图圆场坏块坚坛声处备复够夺奋奖妈娱宁宝审宽导将尔尘尝层岁岛币帅师带帮库废异弃张弹强归当录彻径态恶悬惊惧惨惯户执扩扫扬换据择报担拥挡挤挥损捡掷携摄摆摇撑斗断无旧显晒晓晕书术机杀杂权条来杨构枪极标树样检楼欢欧毁气汇决况泪洁浅济浏测浓涌涛润涨渐渔渊温湾湿满滚灭灯灵灾炉点炼烂热烦烧烫焕爱牵犹狮独猎猫献环玛珑琐电画畅疗疮痒瘫盐监盖盘睁矿砖确礼祸离种秘称积稳穷窃窜竞笔笼筑签简粮紧纠纤约纪纯纱纲纳纵纷纸纹纺练组细织终绍绕绘绩绪维绵综缓编缘缩缴罗罚罢羡翘耸聪肃胜胁脏脑脚腊舆舰艰艺节芦苍苏苹范荣药莱获萝营萧蔼虏虑虽蚁蛮蜡补装亵览觉观规订计认讨训记讲许访证评识诉词译试诗诚话诞询详误请诸课调谈谊谋谜谢谣谦谨贝负贡财责败货质贩贪贫购贯贴贵贸费贺资赋赌赏赔赖赚赛赞赠赢赶趋跃践踪轨轮轻载较辅辆辈辉输辖辩违迟适逊递逻遗遥邓邮邻郁郑酱释钉钓钟钢钥钩钮钻铁铃铜铝铭铺链销锁锅锋错锦键锻镇镜长闪闭闯闲间闷闹闻阀阅队阳阴阵阶际陆陈陕险随隐难雾霁静顶项顺须顾顿颁预领颗额颜风飘飞饥饭饮饰饱饼馆馈驱驶驻驾验骑骗骤鱼鲜鸟鸡鸣鸭麦黄齐齿龙龟')
SIMP_SAFE = set('游')  # 「游」在繁中也用（游泳），另外檢查「游戏」
HYPE = ['史上最強', '神作降臨', '不玩後悔', '震驚', '必玩神作', '爆款']


class Report:
    def __init__(self):
        self.bad, self.warn = [], []

    def B(self, fid, msg):
        self.bad.append(f'{fid}: {msg}')

    def W(self, fid, msg):
        self.warn.append(f'{fid}: {msg}')


def txt_all(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, dict):
        for v in o.values():
            yield from txt_all(v)
    elif isinstance(o, list):
        for v in o:
            yield from txt_all(v)


def check(f, r):
    fid = f.get('id', '?')
    need = ['id', 'date', 'kind', 'game', 'headline', 'hook', 'verdict', 'facts', 'money', 'zh', 'tw', 'rig', 'media', 'sections', 'fanpage', 'sources']
    for k in need:
        if k not in f:
            r.B(fid, f'少了欄位 {k}')
    if r.bad and any(x.startswith(fid + ': 少了') for x in r.bad):
        return
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{1,48}', fid):
        r.B(fid, 'id 只能用小寫英文、數字、連字號')
    try:
        dt.date.fromisoformat(f['date'])
    except Exception:  # noqa: BLE001
        r.B(fid, 'date 要是 YYYY-MM-DD')
    if f['kind'] not in KINDS:
        r.B(fid, f'kind 要是 {list(KINDS)}')
    g = f['game']
    for k in ('zh', 'en', 'dev', 'pub', 'platforms', 'genres', 'release_text', 'price_text'):
        if not g.get(k):
            r.B(fid, f'game.{k} 不能空')
    if g.get('steam') not in (None, '') and not str(g['steam']).isdigit():
        r.B(fid, 'game.steam 要是數字 appid 或 null')
    if not (8 <= len(f['headline']) <= 48):
        r.W(fid, f'headline 長度 {len(f["headline"])}（建議 12～40 字）')
    if not (40 <= len(f['hook']) <= 180):
        r.W(fid, f'hook 長度 {len(f["hook"])}（建議 50～150 字）')
    v = f['verdict']
    if v.get('stamp') not in STAMPS:
        r.B(fid, f'verdict.stamp 要是 {STAMPS}')
    for k in ('label', 'summary'):
        if not v.get(k):
            r.B(fid, f'verdict.{k} 不能空')
    for k in ('for', 'against'):
        if not isinstance(v.get(k), list) or len(v[k]) < 2:
            r.B(fid, f'verdict.{k} 至少 2 條')
    src = f['sources']
    if not isinstance(src, list) or len(src) < 5:
        r.B(fid, '來源至少 5 個')
    elif len(src) < 8:
        r.W(fid, f'來源只有 {len(src)} 個（寫稿指南要求至少 8 個）')
    for i, s in enumerate(src or []):
        if not s.get('t') or not re.match(r'https?://', s.get('u') or ''):
            r.B(fid, f'sources[{i}] 要有標題與網址')
    facts = f['facts']
    if len(facts) < 8:
        r.B(fid, f'資訊卡只有 {len(facts)} 項（至少 8 項）')
    for i, x in enumerate(facts):
        if not x.get('k') or not x.get('v'):
            r.B(fid, f'facts[{i}] 要有 k 與 v')
        ss = x.get('s')
        if not isinstance(ss, list) or not ss:
            r.B(fid, f'facts[{i}]「{x.get("k")}」沒有標來源')
        else:
            for j in ss:
                if not isinstance(j, int) or j < 0 or j >= len(src):
                    r.B(fid, f'facts[{i}] 來源編號 {j} 不存在')
    m = f['money']
    if m.get('level') not in (None, 0, 1, 2, 3, 4):
        r.B(fid, 'money.level 要是 0～4 或 null（未確認）')
    if not m.get('model') or not m.get('notes'):
        r.B(fid, 'money.model、money.notes 不能空')
    if f['tw'].get('ok') not in (True, False, 'partial'):
        r.B(fid, 'tw.ok 要是 true／false／"partial"')
    if not f['rig'].get('verdict') or not f['rig'].get('note'):
        r.B(fid, 'rig 要有 verdict 與 note')
    yt = (f['media'] or {}).get('yt') or []
    for y in yt:
        if not re.fullmatch(r'[A-Za-z0-9_-]{11}', y.get('id') or ''):
            r.B(fid, f'YouTube id 格式不對：{y.get("id")}')
    imgs = (f['media'] or {}).get('images') or []
    if not yt and not g.get('steam') and not imgs:
        r.W(fid, '沒有預告、沒有 Steam、也沒有圖片：專題會沒有影像')
    elif not g.get('steam') and len(imgs) < 3:
        r.W(fid, '非 Steam 遊戲建議在 media.images 放 3～8 張官方截圖或主視覺（動態主視覺和相簿會用到）')
    for u in imgs:
        if not str(u).startswith('https://'):
            r.B(fid, f'media.images 要是 https 網址：{str(u)[:60]}')
    S = f['sections']
    gp = S.get('gameplay') or {}
    if len(gp.get('loop') or []) < 3:
        r.B(fid, '玩法循環至少 3 步')
    if len(gp.get('body') or []) < 2:
        r.B(fid, '玩法拆解至少 2 段')
    for k, n in (('hour', 2), ('compare', 2), ('studio', 1), ('timeline', 3), ('discuss', 3)):
        if len(S.get(k) or []) < n:
            r.B(fid, f'sections.{k} 至少 {n} 項')
    vo = S.get('voices') or {}
    if len(vo.get('pros') or []) < 2 or len(vo.get('cons') or []) < 2:
        r.B(fid, '玩家風向：誇和罵各至少 2 條')
    for i, c in enumerate(S.get('compare') or []):
        if not (c.get('name') and c.get('same') and c.get('diff')):
            r.B(fid, f'compare[{i}] 要有 name、same、diff')
    for i, t in enumerate(S.get('timeline') or []):
        if not (t.get('d') and t.get('t')):
            r.B(fid, f'timeline[{i}] 要有 d、t')
    for i, q in enumerate(S.get('discuss') or []):
        if not (q.get('q') and q.get('why')):
            r.B(fid, f'discuss[{i}] 要有 q、why')
    fp = f['fanpage']
    post = fp.get('post') or ''
    if not (160 <= len(post) <= 720):
        r.W(fid, f'粉專貼文 {len(post)} 字（建議 200～600）')
    if not post.rstrip().endswith(('？', '?')):
        r.W(fid, '粉專貼文最後一句建議是給讀者的提問')
    if len(fp.get('titles') or []) != 3:
        r.B(fid, '粉專標題要剛好 3 個')
    tags = fp.get('tags') or []
    if not (3 <= len(tags) <= 8) or any(not t.startswith('#') or ' ' in t for t in tags):
        r.B(fid, 'hashtag 要 3～8 個、# 開頭、不能有空格')
    card = fp.get('card') or {}
    for k in ('kicker', 'title', 'sub'):
        if not card.get(k):
            r.B(fid, f'圖卡 card.{k} 不能空')
    if len(card.get('points') or []) < 2:
        r.B(fid, '圖卡重點至少 2 條')
    for ln in (card.get('title') or '').split('\n'):
        if len(ln) > 13:
            r.W(fid, f'圖卡標題一行 {len(ln)} 字，可能太長（建議 ≤ 12）：{ln}')
    if not fp.get('script') or len(fp['script']) < 150:
        r.W(fid, '60 秒口播稿太短')
    if not fp.get('credit'):
        r.W(fid, '圖卡／貼文沒有寫素材來源（credit）')
    # 文字品質
    blob = '\n'.join(txt_all({k: v for k, v in f.items() if k not in ('sources',)}))
    simp = sorted({ch for ch in blob if ch in SIMPLIFIED and ch not in SIMP_SAFE})
    if simp:
        r.B(fid, f'疑似簡體字：{"".join(simp[:30])}')
    if '游戏' in blob:
        r.B(fid, '「游戏」是簡體')
    for h in HYPE:
        if h in blob:
            r.W(fid, f'出現農場用語「{h}」')
    # 貼文不能出現「待確認」的事
    for p in f.get('pending') or []:
        key = re.sub(r'[：:].*$', '', p)[:8]
        if key and key in post and '未' not in post:
            r.W(fid, f'粉專貼文可能提到待確認的事：{key}')


def build_index(feats):
    items = []
    for f in feats:
        g = f['game']
        zh = f.get('zh') or {}
        zhs = 'tc' if zh.get('sub') or zh.get('ui') else ('none' if zh.get('ui') is False and zh.get('sub') is False else '?')
        yt = ((f.get('media') or {}).get('yt') or [{}])[0].get('id')
        items.append({
            'id': f['id'], 'date': f['date'], 'rank': f.get('rank', 9), 'kind': f['kind'],
            'kind_label': f.get('kind_label') or KINDS.get(f['kind']),
            'zh': g['zh'], 'en': g['en'], 'steam': int(g['steam']) if g.get('steam') else None,
            'platforms': g['platforms'], 'genres': g['genres'], 'release': g.get('release'),
            'price_text': g.get('price_text'), 'headline': f['headline'],
            'stamp': f['verdict']['stamp'], 'label': f['verdict']['label'],
            'money': (f.get('money') or {}).get('level'), 'zhs': zhs, 'tw': (f.get('tw') or {}).get('ok'),
            'yt': yt, 'img': ((f.get('media') or {}).get('images') or [None])[0],
            'gal': ((f.get('media') or {}).get('images') or [])[1:6],
            'updated': f.get('updated'),
        })
    items.sort(key=lambda x: (x['date'], -x['rank']), reverse=True)
    return {'at': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'n': len(items), 'items': items}


def build_track(feats, old):
    today = dt.date.today()
    keep = {int(x['appid']): x for x in (old.get('apps') or []) if str(x.get('appid', '')).isdigit()}
    out = {}
    for f in feats:
        s = f['game'].get('steam')
        if not s:
            continue
        s = int(s)
        watch = f['kind'] in ('ea', 'upcoming')
        try:
            rel = dt.date.fromisoformat(f['game'].get('release') or '')
            if abs((rel - today).days) <= 30:
                watch = True
        except ValueError:
            pass
        prev = out.get(s)
        row = {'appid': s, 'id': f['id'], 'date': f['date'], 'watch': watch}
        if not prev or row['date'] > prev['date']:
            out[s] = row
    for s, x in keep.items():
        if s not in out and x.get('extra'):
            out[s] = x
    return {'apps': sorted(out.values(), key=lambda x: x['date'], reverse=True)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--only')
    a = ap.parse_args()
    r = Report()
    feats = []
    ids = set()
    for fn in sorted(os.listdir(FEAT)):
        if not fn.endswith('.json'):
            continue
        p = os.path.join(FEAT, fn)
        try:
            f = json.load(open(p, encoding='utf-8'))
        except Exception as e:  # noqa: BLE001
            r.B(fn, f'JSON 壞掉：{e}')
            continue
        if f.get('id') != fn[:-5]:
            r.B(fn, f'檔名要和 id 一樣（{f.get("id")}）')
        if f.get('id') in ids:
            r.B(fn, '重複的 id')
        ids.add(f.get('id'))
        if not a.only or f.get('id') == a.only:
            check(f, r)
        feats.append(f)
    for w in r.warn:
        print('WARN', w)
    for b in r.bad:
        print('BAD ', b)
    print(f'{len(feats)} 篇專題，BAD {len(r.bad)}，WARN {len(r.warn)}')
    if r.bad:
        sys.exit(1)
    if a.check:
        return
    idx = build_index(feats)
    with open(os.path.join(DATA, 'index.json'), 'w', encoding='utf-8') as fo:
        json.dump(idx, fo, ensure_ascii=False, separators=(',', ':'))
    tp = os.path.join(DATA, 'track.json')
    old = json.load(open(tp, encoding='utf-8')) if os.path.exists(tp) else {}
    tr = build_track(feats, old)
    old_s = json.dumps(old, ensure_ascii=False, sort_keys=True)
    new_s = json.dumps(tr, ensure_ascii=False, sort_keys=True)
    if old_s != new_s:
        with open(tp, 'w', encoding='utf-8') as fo:
            json.dump(tr, fo, ensure_ascii=False, indent=1)
        print('track.json 更新（推上去後 Actions 會自動抓 Steam 資料）')
    print('index.json：', idx['n'], '篇')


if __name__ == '__main__':
    main()
