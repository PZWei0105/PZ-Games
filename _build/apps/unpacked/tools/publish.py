#!/usr/bin/env python3
"""《解包》上架工具：檢查每一篇專題的格式與品質，重建目錄（index.json）和追蹤清單（track.json）。

每日寫稿排程（專題）和每日推坑排程寫完都一定要跑（兩種一起檢查、一起重建）：
  python3 _build/apps/unpacked/tools/publish.py            # 檢查全部＋重建 index.json、track.json
  python3 _build/apps/unpacked/tools/publish.py --check    # 只檢查，不寫檔
  python3 _build/apps/unpacked/tools/publish.py --only rob-run   # 只檢查這一篇（目錄仍會整份重建）

有 BAD 就不准推。WARN 要看過、能改就改。
推坑（data/picks/<id>.json）另外產生 data/picks.json；推坑的 Steam appid 也會進 track.json。
每週懶人包（data/weekly/<YYYY-Www>.json，WEEKLY_GUIDE.md）也一起檢查，並產生目錄 data/weekly.json。
"""
import hashlib, argparse
import datetime as dt
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
DATA = os.path.join(REPO, 'apps', 'unpacked', 'data')
FEAT = os.path.join(DATA, 'features')
PICKS = os.path.join(DATA, 'picks')      # 推坑：已上市、不分新舊的私房推薦（PICKS_GUIDE.md）
WEEKLY = os.path.join(DATA, 'weekly')    # 每週懶人包（WEEKLY_GUIDE.md）
VIDS = os.path.join(DATA, 'videos')      # 粉專作戰台的影片三連發（QA_GUIDE.md 第 7 節）：檔名＝App 送來的點播 id
VID_KEYS = {'pre': '預告', 'up': '上片', 'talk': '討論'}
URLISH = re.compile(r'https?://|www\.|youtu\.be|youtube\.com', re.I)
SELF_NAME = '痞子葳'      # 粉專、頻道素材一律只用「遊戲狂想曲」，不出現痞子葳本人的名字
FAKE_CROWD = ('留言最多', '最多人問', '很多人問', '很多人說', '大家都在', '有人說', '有觀眾', '吵最兇', '吵最凶', '網友說', '觀眾說')
TIERS = ['S', 'A', 'B', 'C', 'D']

KINDS = {'new': '新作', 'ea': '搶先體驗', 'upcoming': '即將推出', 'update': '大型更新', 'exclusive': '平台獨佔',
         'hot': '熱門話題', 'classic': '經典回顧', 'free': '限時免費', 'indie': '獨立黑馬', 'wish': '願望單解包'}
# 「買不買」：每一篇願望單解包都要有（其他專題可選）。target 是目標價，單位「分」（NT$×100）
BUY_CALLS = {'現在買', '等特價', '等史低', '等上市後評價', '先觀望', '別買'}
STAMPS = {'推薦', '觀望', '不推薦'}
PICK_STAMPS = {'必玩', '閉眼入', '特價入', '冷門神作'}
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
        if c.get('steam') is not None and not str(c['steam']).isdigit():
            r.B(fid, f'compare[{i}].steam 要是 Steam appid（數字）；不在 Steam 上就不要填')
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
    if URLISH.search(post):
        r.B(fid, '粉專貼文不要放網址：粉專作戰台會照各平台的連結規則自己加')
    check_threads(fp.get('threads'), fid, r)
    check_self_name(fp, fid, r, '粉專素材（fanpage）')
    b = f.get('buy')
    if f['kind'] == 'wish' and not b:
        r.B(fid, '願望單解包一定要有 buy（買不買）')
    if b is not None:
        if b.get('call') not in BUY_CALLS:
            r.B(fid, f'buy.call 要是 {sorted(BUY_CALLS)}')
        t = b.get('target')
        if t is not None and (not isinstance(t, int) or t <= 0):
            r.B(fid, 'buy.target 要是正整數（單位「分」：NT$300 寫 30000）或 null')
        if b.get('call') in ('等特價', '等史低') and t is None:
            r.B(fid, 'buy.call 是等特價／等史低時，buy.target 一定要填目標價')
        if not (40 <= len(b.get('why') or '') <= 260):
            r.B(fid, 'buy.why 要寫 40～260 字（為什麼這樣判、目標價怎麼來的）')
        if f['kind'] == 'wish' and not f['game'].get('steam'):
            r.W(fid, '願望單解包沒有 Steam appid：獵價會對不上')
    check_rev(f, fid, r)
    text_quality(f, fid, r)
    # 貼文不能出現「待確認」的事
    for p in f.get('pending') or []:
        key = re.sub(r'[：:].*$', '', p)[:8]
        if key and key in post and '未' not in post:
            r.W(fid, f'粉專貼文可能提到待確認的事：{key}')


def check_rev(f, fid, r):
    """舊稿回訪（WRITER_GUIDE §回訪、PICKS_GUIDE §回訪）：rev 是改寫紀錄 [{d, t}]，App 會在文章上方和「寫稿之後」顯示。
    updated 一定要跟著改到回訪那天之後——App 和資料管線都拿 updated 當「這篇最後一次對過資料的時間」。"""
    rev = f.get('rev')
    if rev is None:
        return
    if not isinstance(rev, list) or not rev:
        r.B(fid, 'rev 要是非空的清單 [{d, t}]')
        return
    today = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=8)).date()
    last = None
    for i, x in enumerate(rev):
        if not isinstance(x, dict) or not x.get('d') or not x.get('t'):
            r.B(fid, f'rev[{i}] 要有 d（日期）和 t（改了什麼）')
            continue
        try:
            d = dt.date.fromisoformat(x['d'])
        except ValueError:
            r.B(fid, f'rev[{i}].d 要是 YYYY-MM-DD')
            continue
        if d < dt.date.fromisoformat(f['date']) or d > today + dt.timedelta(days=1):
            r.B(fid, f'rev[{i}].d 要在寫稿日 {f["date"]} 和今天之間')
        if last and d < last:
            r.B(fid, 'rev 要照日期排（舊的在前）')
        last = d
        if not 4 <= len(x['t']) <= 60:
            r.B(fid, f'rev[{i}].t 用 4～60 字講改了什麼（例如：加了繁中，中文段、結論已更新）')
    if last:
        u = str(f.get('updated') or '')
        try:
            ud = dt.datetime.fromisoformat(u.replace('Z', '+00:00')).date() if 'T' in u else dt.date.fromisoformat(u[:10])
        except ValueError:
            ud = None
        if ud is None or ud < last:
            r.B(fid, f'回訪改寫後 updated 要改到 {last} 或之後（App 從 updated 開始算「寫稿之後」）')


def text_quality(f, fid, r):
    blob = '\n'.join(txt_all({k: v for k, v in f.items() if k not in ('sources',)}))
    simp = sorted({ch for ch in blob if ch in SIMPLIFIED and ch not in SIMP_SAFE})
    if simp:
        r.B(fid, f'疑似簡體字：{"".join(simp[:30])}')
    if '游戏' in blob:
        r.B(fid, '「游戏」是簡體')
    for h in HYPE:
        if h in blob:
            r.W(fid, f'出現農場用語「{h}」')


def check_sources_facts(f, fid, r, min_facts):
    src = f.get('sources') or []
    if not isinstance(src, list) or len(src) < 5:
        r.B(fid, '來源至少 5 個')
    for i, x in enumerate(src):
        if not x.get('t') or not re.match(r'https?://', x.get('u') or ''):
            r.B(fid, f'sources[{i}] 要有標題與網址')
    facts = f.get('facts') or []
    if len(facts) < min_facts:
        r.B(fid, f'資訊卡只有 {len(facts)} 項（至少 {min_facts} 項）')
    for i, x in enumerate(facts + [dict(sc, k='評分 ' + sc.get('k', '')) for sc in (f.get('scores') or [])]):
        if not x.get('k') or not x.get('v'):
            r.B(fid, f'facts／scores 第 {i} 項要有 k 與 v')
        ss = x.get('s')
        if not isinstance(ss, list) or not ss:
            r.B(fid, f'「{x.get("k")}」沒有標來源')
        else:
            for j in ss:
                if not isinstance(j, int) or j < 0 or j >= len(src):
                    r.B(fid, f'「{x.get("k")}」來源編號 {j} 不存在')


def check_pick_depth(f, fid, r):
    """推坑要跟專題一樣全面：玩法、跟誰像、劇情、幕後、時間軸、玩家風向、版本、多人。"""
    S = f.get('sections')
    if not isinstance(S, dict):
        r.B(fid, '少了 sections（玩法、跟誰像、劇情、幕後、時間軸、玩家風向）')
        return
    gp = S.get('gameplay') or {}
    if len(gp.get('loop') or []) < 4:
        r.B(fid, 'sections.gameplay.loop 玩法循環至少 4 步')
    if len(gp.get('body') or []) < 2:
        r.B(fid, 'sections.gameplay.body 玩法拆解至少 2 段')
    cmp = S.get('compare') or []
    if len(cmp) < 2:
        r.B(fid, 'sections.compare 跟誰像至少 2 款')
    for i, c in enumerate(cmp):
        if not (c.get('name') and c.get('same') and c.get('diff')):
            r.B(fid, f'compare[{i}] 要有 name、same、diff')
        if c.get('steam') is not None and not str(c['steam']).isdigit():
            r.B(fid, f'compare[{i}].steam 要是 Steam appid（數字）；不在 Steam 上就不要填')
    if 'story' not in S:
        r.B(fid, 'sections.story 要寫（沒有劇情的遊戲填 null）')
    elif S['story'] is not None and not (S['story'].get('safe') or []):
        r.B(fid, 'sections.story.safe 至少 1 段（不劇透的設定與開場）')
    if len(S.get('studio') or []) < 1:
        r.B(fid, 'sections.studio 幕後至少 1 段')
    tl = S.get('timeline') or []
    if len(tl) < 4:
        r.B(fid, 'sections.timeline 時間軸至少 4 個時間點')
    for i, t in enumerate(tl):
        if not (t.get('d') and t.get('t')):
            r.B(fid, f'timeline[{i}] 要有 d、t')
        elif not re.fullmatch(r'\d{4}-\d{2}(-\d{2})?', t['d']):
            r.B(fid, f'timeline[{i}].d 要是 YYYY-MM-DD 或 YYYY-MM')
    vo = S.get('voices') or {}
    if len(vo.get('pros') or []) < 3 or len(vo.get('cons') or []) < 2:
        r.B(fid, 'sections.voices 誇至少 3 條、罵至少 2 條')
    eds = f.get('editions') or []
    if not eds:
        r.B(fid, 'editions 版本怎麼選至少 1 項')
    for i, e in enumerate(eds):
        if not (e.get('name') and e.get('what')):
            r.B(fid, f'editions[{i}] 要有 name、what')
    mu = f.get('multi') or {}
    if mu.get('ok') not in (True, False, 'partial') or not mu.get('text'):
        r.B(fid, 'multi 要有 ok（true／false／"partial"）與 text（跟朋友玩的說明）')


def check_pick(f, r):
    """推坑稿：已經上市、不分新舊，Claude 查過評價、挑過才推的遊戲。格式見 PICKS_GUIDE.md。"""
    fid = f.get('id', '?')
    need = ['id', 'date', 'game', 'stamp', 'label', 'pitch', 'why', 'reasons', 'fit', 'facts', 'zh', 'tw', 'money', 'rig', 'time', 'howto', 'deals', 'media', 'sources']
    miss = [k for k in need if k not in f]
    if miss:
        r.B(fid, f'少了欄位 {"、".join(miss)}')
        return
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{1,48}', fid):
        r.B(fid, 'id 只能用小寫英文、數字、連字號')
    try:
        dt.date.fromisoformat(f['date'])
    except Exception:  # noqa: BLE001
        r.B(fid, 'date 要是 YYYY-MM-DD')
    g = f['game']
    for k in ('zh', 'en', 'dev', 'pub', 'platforms', 'genres', 'release', 'year', 'price_text'):
        if not g.get(k):
            r.B(fid, f'game.{k} 不能空')
    try:
        if dt.date.fromisoformat(g.get('release') or '') > dt.date.fromisoformat(f['date']):
            r.B(fid, '推坑只收已經上市的遊戲（release 在 date 之後）')
    except ValueError:
        r.B(fid, 'game.release 要是 YYYY-MM-DD')
    if g.get('steam') not in (None, '') and not str(g['steam']).isdigit():
        r.B(fid, 'game.steam 要是數字 appid 或 null')
    if f['stamp'] not in PICK_STAMPS:
        r.B(fid, f'stamp 要是 {PICK_STAMPS}')
    if not (12 <= len(f['pitch']) <= 60):
        r.W(fid, f'pitch 長度 {len(f["pitch"])}（建議 15～50 字）')
    if not (120 <= len(f['why']) <= 380):
        r.W(fid, f'推坑信 why 長度 {len(f["why"])}（建議 150～320 字）')
    rs = f['reasons']
    if len(rs) != 3 or any(not (x.get('h') and x.get('t')) for x in rs):
        r.B(fid, 'reasons 要剛好 3 條，每條有 h、t')
    for x in rs:
        if len(x.get('h') or '') > 12:
            r.W(fid, f'推坑理由標題太長（≤ 12 字）：{x.get("h")}')
    fit = f['fit']
    if len(fit.get('for') or []) < 2 or len(fit.get('against') or []) < 2:
        r.B(fid, 'fit.for、fit.against 各至少 2 條')
    if len(f['howto']) < 3:
        r.B(fid, 'howto（怎麼玩最好玩）至少 3 條')
    check_sources_facts(f, fid, r, 8)
    if len(f.get('sources') or []) < 8:
        r.B(fid, f'推坑來源至少 8 個（現在 {len(f.get("sources") or [])} 個）')
    check_pick_depth(f, fid, r)
    m = f['money']
    if m.get('level') not in (None, 0, 1, 2, 3, 4):
        r.B(fid, 'money.level 要是 0～4 或 null')
    if m.get('level') in (3, 4):
        r.B(fid, '付費加速、抽卡變強的遊戲不推坑（痞子葳不喜歡課金才能解鎖的遊戲）')
    if f['tw'].get('ok') not in (True, False, 'partial'):
        r.B(fid, 'tw.ok 要是 true／false／"partial"')
    if not f['rig'].get('verdict') or not f['rig'].get('note'):
        r.B(fid, 'rig 要有 verdict 與 note')
    yt = (f['media'] or {}).get('yt') or []
    for y in yt:
        if not re.fullmatch(r'[A-Za-z0-9_-]{11}', y.get('id') or ''):
            r.B(fid, f'YouTube id 格式不對：{y.get("id")}')
    imgs = (f['media'] or {}).get('images') or []
    if not g.get('steam') and len(imgs) < 3:
        r.W(fid, '非 Steam 遊戲建議在 media.images 放 3～8 張官方截圖或主視覺')
    for u in imgs:
        if not str(u).startswith('https://'):
            r.B(fid, f'media.images 要是 https 網址：{str(u)[:60]}')
    for i, q in enumerate(f.get('talk') or []):
        if not (q.get('q') and q.get('why')):
            r.B(fid, f'talk[{i}] 要有 q、why')
    check_rev(f, fid, r)
    text_quality(f, fid, r)


# ------------------------------------------------------------------ 點播台問答、TGA 預測戰、活動時程
QA_ID = re.compile(r'^d[a-z0-9]{3,10}-[a-z0-9]{4,12}$')
QA_BY = {'寫稿編輯', '推坑編輯', '願望單編輯', '週報編輯', 'TGA 開獎'}
ISO_Z = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$')
ISO_ANY = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$')


def simp_check(text, fid, r):
    simp = sorted({ch for ch in text if ch in SIMPLIFIED and ch not in SIMP_SAFE})
    if simp:
        r.B(fid, f'疑似簡體字：{"".join(simp[:30])}')


def check_qa(qa, r, refs):
    """data/qa.json：點播台的回答（QA_GUIDE.md）。排程寫，App 照 id 對上痞子葳送出的問題。"""
    fid = 'qa.json'
    if not isinstance(qa, dict) or not isinstance(qa.get('items'), list):
        r.B(fid, '格式要是 {"at": ..., "items": [...]}')
        return
    seen = set()
    for i, x in enumerate(qa['items']):
        k = f'{fid}#{i}'
        if not isinstance(x, dict):
            r.B(k, '每一筆要是物件')
            continue
        if not QA_ID.match(str(x.get('id') or '')):
            r.B(k, 'id 要照抄 inbox.json 那一筆的 id')
        if x.get('id') in seen:
            r.B(k, '重複的 id')
        seen.add(x.get('id'))
        if x.get('type') not in ('ask', 'req', 'vid'):
            r.B(k, 'type 要是 ask（問答）、req（點播解包）或 vid（影片三連發）')
        if x.get('st') not in ('done', 'no', 'wip'):
            r.B(k, 'st 要是 done／no／wip')
        if not isinstance(x.get('q'), str) or not x['q'].strip():
            r.B(k, 'q（原本的問題或點播的遊戲）不能空白')
        if x.get('st') in ('done', 'no'):
            if not ISO_ANY.match(str(x.get('at') or '')):
                r.B(k, 'at（回答時間）要是 ISO 時間')
            if x.get('by') not in QA_BY:
                r.B(k, f'by 要是 {"／".join(sorted(QA_BY))} 其中之一')
            a = x.get('a') or ''
            lo, hi = (40, 1800) if x['st'] == 'done' else (10, 400)
            if not isinstance(a, str) or not lo <= len(a) <= hi:
                r.B(k, f'a（回答）要 {lo}～{hi} 字')
            simp_check(a + ''.join(x.get('pts') or []), k, r)
        src = x.get('src') or []
        if not isinstance(src, list) or any(not isinstance(s, dict) or not s.get('t') or not re.match(r'https?://', s.get('u') or '') for s in src):
            r.B(k, 'src 每一項要有 t（標題）和 u（網址）')
        if x.get('st') == 'done' and x.get('type') == 'ask' and not src and not x.get('link'):
            r.B(k, '回答至少要附 1 個來源（或連到寫好的專題）')
        if x.get('link') and x['link'] not in refs:
            r.B(k, f'link {x["link"]} 找不到（要是 f:<專題 id>、p:<推坑 id> 或 v:<影片三連發 id>）')
        if x.get('st') == 'done' and x.get('type') == 'req' and not str(x.get('link') or '').startswith(('f:', 'p:')):
            r.B(k, '點播解包寫好了就要有 link: f:<專題 id>（已經有推坑的就連 p:<推坑 id>）')
        if x.get('st') == 'done' and x.get('type') == 'vid' and x.get('link') != 'v:' + str(x.get('id')):
            r.B(k, '影片三連發寫好了就要有 link: v:<這筆的 id>（檔案放 data/videos/<id>.json）')
        if x.get('ref') and not re.match(r'^(f:|p:|a:\d+$|tga$|board$|w:)', str(x['ref'])):
            r.W(k, f'ref 格式看不懂：{x["ref"]}')


def check_threads(th, fid, r, what='fanpage.threads'):
    """Threads 版（選填；沒寫的話 App 直接用 post）：一則 ≤ 480 字、內文不放 #、主題標籤一個。"""
    if th is None:
        return
    if not isinstance(th, dict):
        r.B(fid, f'{what} 要是 {{"post": ..., "topic": ...}}')
        return
    p = th.get('post')
    if not isinstance(p, str) or not 20 <= len(p.strip()) <= 480:
        r.B(fid, f'{what}.post 要 20～480 字（Threads 一則上限 500）')
        p = p if isinstance(p, str) else ''
    if '#' in p:
        r.B(fid, f'{what}.post 不要放 #：Threads 一篇只吃一個主題標籤，寫在 topic')
    if URLISH.search(p):
        r.B(fid, f'{what}.post 不要放網址（App 發文時會自己加）')
    t = th.get('topic')
    if t is not None and (not isinstance(t, str) or not 1 <= len(t.strip()) <= 20 or '#' in t):
        r.B(fid, f'{what}.topic 要 1～20 字、不含 #（例：遊戲、Steam、獨立遊戲）')
    simp_check(p, fid, r)


def check_self_name(o, fid, r, what):
    if SELF_NAME in json.dumps(o, ensure_ascii=False):
        r.B(fid, f'{what}出現「{SELF_NAME}」：粉專和頻道素材一律只用「遊戲狂想曲」')


def check_video(v, fid, r):
    """data/videos/<點播 id>.json：影片三連發（前一天預告、當天上片、隔天討論），寫稿／願望單那一班照點播寫。"""
    if not isinstance(v, dict):
        r.B(fid, '要是物件')
        return
    for k in ('title', 'at', 'updated', 'by', 'posts'):
        if not v.get(k):
            r.B(fid, f'缺 {k}')
    if not QA_ID.match(str(v.get('id') or '')):
        r.B(fid, 'id 要照抄 inbox.json 那一筆 vid 點播的 id')
    if not ISO_ANY.match(str(v.get('at') or '')):
        r.B(fid, 'at（上片時間）要是 ISO 時間：照抄點播的 when')
    if not ISO_ANY.match(str(v.get('updated') or '')):
        r.B(fid, 'updated 要是 ISO 時間')
    if v.get('by') not in QA_BY:
        r.B(fid, f'by 要是 {"／".join(sorted(QA_BY))} 其中之一')
    posts = v.get('posts') if isinstance(v.get('posts'), dict) else {}
    if set(posts) != set(VID_KEYS):
        r.B(fid, 'posts 要剛好三篇：pre（預告）、up（上片）、talk（討論）')
    for k, name in VID_KEYS.items():
        p = posts.get(k)
        if not isinstance(p, dict):
            continue
        w = f'posts.{k}（{name}）'
        post = p.get('post') if isinstance(p.get('post'), str) else ''
        if not 40 <= len(post) <= 600:
            r.B(fid, f'{w}.post 要 40～600 字（FB、IG 用這段）')
        if URLISH.search(post):
            r.B(fid, f'{w}.post 不要放網址：App 會照各平台規則自己加（FB 留給上片文、Threads 放內文、IG 放個人檔案）')
        if '#' in post:
            r.B(fid, f'{w}.post 不要放 #：hashtag 寫在 tags')
        if not post.rstrip().endswith(('？', '?')):
            r.W(fid, f'{w}.post 最後一句建議是給觀眾的提問')
        check_threads({'post': p.get('threads'), 'topic': p.get('topic')}, fid, r, f'{w}的 Threads 版')
        tags = p.get('tags') or []
        if not isinstance(tags, list) or not 2 <= len(tags) <= 5 or any(not isinstance(t, str) or not t.startswith('#') or ' ' in t or len(t) > 20 for t in tags):
            r.B(fid, f'{w}.tags 要 2～5 個（IG 一篇最多 5 個）、# 開頭、沒有空格')
        elif '#遊戲狂想曲' not in tags:
            r.W(fid, f'{w}.tags 建議放 #遊戲狂想曲')
        card = p.get('card')
        if card is not None:
            if not isinstance(card, dict) or not card.get('kicker') or not card.get('title'):
                r.B(fid, f'{w}.card 要有 kicker、title（不寫 card 的話 App 會用影片標題自己排）')
            else:
                for ln in str(card['title']).split('\n'):
                    if len(ln) > 13:
                        r.W(fid, f'{w}.card.title 一行 {len(ln)} 字，可能太長（建議 ≤ 12）：{ln}')
        simp_check(post, fid, r)
    talk = posts.get('talk') if isinstance(posts.get('talk'), dict) else {}
    tt = str(talk.get('post') or '') + str(talk.get('threads') or '')
    for w in FAKE_CROWD:
        if w in tt:
            r.B(fid, f'討論文不能捏造觀眾反應（「{w}」）：寫的時候影片還沒上，改成丟出這集的一個論點讓大家站隊')
    yt = v.get('yt')
    if yt is not None:
        if not isinstance(yt, dict) or not 60 <= len(yt.get('desc') or '') <= 1500 or not 10 <= len(yt.get('pin') or '') <= 300:
            r.B(fid, 'yt.desc（說明欄）要 60～1500 字、yt.pin（置頂留言）要 10～300 字')
        elif URLISH.search(yt['desc'] + yt['pin']):
            r.B(fid, 'yt 說明欄／置頂留言不要放網址：Threads、IG、FB 的連結痞子葳自己貼')
    check_self_name({'posts': posts, 'yt': yt}, fid, r, '影片三連發的文案')
    src = v.get('sources') or []
    if not isinstance(src, list) or any(not isinstance(s, dict) or not s.get('t') or not re.match(r'https?://', s.get('u') or '') for s in src):
        r.B(fid, 'sources 每一項要有 t（標題）和 u（網址）')


def build_videos(vids):
    items = [{'id': v['id'], 'title': v.get('title'), 'at': v.get('at'), 'updated': v.get('updated')} for v in vids if v.get('id')]
    items.sort(key=lambda x: x['at'] or '', reverse=True)
    return {'at': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'n': len(items), 'items': items}


def check_platforms(p, r):
    """data/platforms.json：三平台＋YouTube 的規則（粉專作戰台讀；每週懶人包那一班查證、有變才改）。"""
    fid = 'platforms.json'
    if not isinstance(p, dict):
        r.B(fid, '要是物件')
        return
    try:
        dt.date.fromisoformat(str(p.get('checked')))
    except ValueError:
        r.B(fid, 'checked（最後查證日）要是 YYYY-MM-DD')
    num = lambda o, k, lo, hi: isinstance((o or {}).get(k), int) and lo <= o[k] <= hi   # noqa: E731
    th, ig, fb, yt = (p.get(k) or {} for k in ('th', 'ig', 'fb', 'yt'))
    if not (num(th, 'chars', 200, 5000) and num(th, 'links', 0, 50) and num(th, 'topics', 0, 10)):
        r.B(fid, 'th 要有 chars（一則字數上限）、links、topics（數字）')
    if not (num(ig, 'caption', 500, 10000) and num(ig, 'hashtags', 1, 60) and num(ig, 'bio_links', 1, 20)):
        r.B(fid, 'ig 要有 caption、hashtags、bio_links（數字）')
    if fb.get('link_free') is not None and not num(fb, 'link_free', 0, 1000):
        r.B(fid, 'fb.link_free 要是數字（每月免費的外部連結則數）或 null（沒有限制）')
    for k in ('fan', 'ads', 'ads_new'):
        if k in yt and not (num(yt[k], 'subs', 1, 10 ** 7) and num(yt[k], 'hours', 0, 10 ** 6)):
            r.B(fid, f'yt.{k} 要有 subs、hours（數字）')
    for k in ('th', 'ig', 'fb', 'yt'):
        sec = p.get(k) or {}
        src = sec.get('src') or []
        if not src or any(not isinstance(s, dict) or not s.get('t') or not re.match(r'https?://', s.get('u') or '') for s in src):
            r.B(fid, f'{k}.src 至少 1 個來源，每一項要有 t（標題）和 u（網址）')
        if any(not isinstance(n, str) or SELF_NAME in n for n in sec.get('notes') or []):
            r.B(fid, f'{k}.notes 每條要是文字、不放本人名字')


TGA_SEAL = 'ed568151dca547e8'   # 2026-11-18 封存時 Claude 的 30 項預測（獎項、入圍、押誰）的指紋：之後只准填 win／result_at


def tga_digest(t):
    return hashlib.sha256(json.dumps([[c['id'], [n['n'] for n in c['nom']], c['claude']['c']] for c in t['cats']], ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()[:16]


def check_tga(t, r, refs):
    fid = 'tga.json'
    try:
        if tga_digest(t) != TGA_SEAL:
            r.B(fid, 'Claude 的 TGA 預測已經封存（11/18），獎項、入圍和 claude.c 都不准改；開獎只能填 win 和 result_at')
    except (KeyError, TypeError):
        r.B(fid, '獎項格式壞了（cats／nom／claude）')
    for key in ('show', 'vote_end', 'sealed'):
        if not ISO_Z.match(str(t.get(key) or '')):
            r.B(fid, f'{key} 要是 UTC 的 ISO 時間（…Z）')
    src = t.get('sources') or []
    if any(not s.get('t') or not re.match(r'https?://', s.get('u') or '') for s in src):
        r.B(fid, 'sources 每一項要有標題和網址')
    ids = set()
    for c in t.get('cats') or []:
        k = f'{fid}#{c.get("id")}'
        if not re.fullmatch(r'[a-z0-9]{2,12}', str(c.get('id') or '')) or c.get('id') in ids:
            r.B(k, 'id 要是 2～12 個小寫英數、不能重複')
        ids.add(c.get('id'))
        if c.get('pt') not in (1, 2, 5):
            r.B(k, 'pt 要是 1、2 或 5')
        if c.get('grp') not in ('main', 'indie', 'genre', 'more', 'extra'):
            r.B(k, 'grp 要是 main／indie／genre／more／extra')
        nom = c.get('nom') or []
        if not 2 <= len(nom) <= 8 or any(not isinstance(n, dict) or not n.get('n') for n in nom):
            r.B(k, '入圍要 2～8 個，每個要有 n（名稱）')
        for n in nom:
            if n.get('ref') and n['ref'] not in refs:
                r.B(k, f'{n["n"]} 的 ref {n["ref"]} 找不到')
        cl = c.get('claude') or {}
        if not isinstance(cl.get('c'), int) or not 0 <= cl['c'] < len(nom):
            r.B(k, 'claude.c 要是入圍名單裡的位置')
        if cl.get('conf') not in (1, 2, 3):
            r.B(k, 'claude.conf 要是 1～3')
        if not 20 <= len(cl.get('why') or '') <= 220:
            r.B(k, 'claude.why 要 20～220 字')
        for j in cl.get('s') or []:
            if not isinstance(j, int) or not 0 <= j < len(src):
                r.B(k, f'claude.s 的來源 {j} 不存在')
        w = c.get('win')
        if w is not None and (not isinstance(w, int) or not 0 <= w < len(nom)):
            r.B(k, 'win 要是 null 或入圍名單裡的位置')
    if len(ids) < 10:
        r.B(fid, '獎項太少，是不是檔案壞了？')
    if t.get('result_at') is not None and not ISO_ANY.match(str(t['result_at'])):
        r.B(fid, 'result_at 要是 null 或 ISO 時間')
    if t.get('result_at') and any(c.get('win') is None for c in t.get('cats') or []):
        r.W(fid, '已經寫了 result_at，但還有獎項沒填 win')
    simp_check(''.join(txt_all({k: v for k, v in t.items() if k != 'sources'})), fid, r)


def check_events(e, r):
    fid = 'events.json'
    ids = set()
    for x in e.get('items') or []:
        k = f'{fid}#{x.get("id")}'
        if not x.get('id') or x['id'] in ids:
            r.B(k, 'id 不能空白或重複')
        ids.add(x.get('id'))
        if x.get('kind') not in ('sale', 'fest', 'show', 'vote'):
            r.B(k, 'kind 要是 sale／fest／show／vote')
        if not ISO_Z.match(str(x.get('start') or '')):
            r.B(k, 'start 要是 UTC 的 ISO 時間（…Z）')
        if x.get('end') and (not ISO_Z.match(str(x['end'])) or x['end'] <= x.get('start', '')):
            r.B(k, 'end 要是 UTC 的 ISO 時間，而且晚於 start')
        s = x.get('src') or {}
        if not s.get('t') or not re.match(r'https?://', s.get('u') or ''):
            r.B(k, 'src 要有官方或可靠來源的標題與網址')
        if not x.get('name'):
            r.B(k, 'name 不能空白')
    simp_check(''.join(txt_all(e)), fid, r)


def iso_week(d):
    y, w, _ = d.isocalendar()
    mon = d - dt.timedelta(days=d.weekday())
    return f'{y}-W{w:02d}', mon, mon + dt.timedelta(days=6)


def check_week(w, r, refs):
    """每週懶人包：本週結算（MVP、Tier 表、本週大事、下週出擊）＋粉專稿。格式見 WEEKLY_GUIDE.md。"""
    wid = 'weekly/' + str(w.get('id', '?'))
    need = ['id', 'from', 'to', 'date', 'title', 'intro', 'mvp', 'tiers', 'news', 'next', 'fanpage', 'sources']
    miss = [k for k in need if k not in w]
    if miss:
        r.B(wid, f'少了欄位 {"、".join(miss)}')
        return
    try:
        fr, to = dt.date.fromisoformat(w['from']), dt.date.fromisoformat(w['to'])
        dt.date.fromisoformat(w['date'])
    except ValueError:
        r.B(wid, 'from、to、date 要是 YYYY-MM-DD')
        return
    i, mon, sun = iso_week(fr)
    if w['id'] != i or fr != mon or to != sun:
        r.B(wid, f'id／from／to 要對上同一個 ISO 週（週一到週日）：{i} {mon}～{sun}')
    if not (8 <= len(w['title']) <= 40):
        r.W(wid, f'title {len(w["title"])} 字（建議 10～32）')
    if not (60 <= len(w['intro']) <= 280):
        r.W(wid, f'intro {len(w["intro"])} 字（建議 80～220）')
    src = w['sources']
    if not isinstance(src, list) or len(src) < 6:
        r.B(wid, '來源至少 6 個')
    for k, s in enumerate(src or []):
        if not s.get('t') or not re.match(r'https?://', s.get('u') or ''):
            r.B(wid, f'sources[{k}] 要有標題與網址')

    def srcs_ok(ss, what):
        if not isinstance(ss, list) or not ss:
            r.B(wid, f'{what} 沒有標來源')
            return
        for j in ss:
            if not isinstance(j, int) or j < 0 or j >= len(src):
                r.B(wid, f'{what} 來源編號 {j} 不存在')
    week_refs = {k for k, v in refs.items() if w['from'] <= v['date'] <= w['to']}
    m = w['mvp'] or {}
    if not week_refs:
        if w['mvp'] is not None or w['tiers']:
            r.B(wid, '這一週沒有專題和推坑：mvp 要是 null、tiers 要是 []')
    elif m.get('ref') not in week_refs:
        r.B(wid, f'mvp.ref 要是這一週的專題或推坑（f:<id> 或 p:<id>）：{m.get("ref")}')
    elif not (20 <= len(m.get('why') or '') <= 220):
        r.B(wid, 'mvp.why 要寫 20～220 字')
    seen = set()
    for k, t in enumerate(w['tiers']):
        if t.get('ref') not in refs:
            r.B(wid, f'tiers[{k}].ref 不存在：{t.get("ref")}')
        elif t['ref'] not in week_refs:
            r.B(wid, f'tiers[{k}] {t["ref"]} 不是這一週的')
        if t.get('ref') in seen:
            r.B(wid, f'tiers 重複：{t.get("ref")}')
        seen.add(t.get('ref'))
        if t.get('tier') not in TIERS:
            r.B(wid, f'tiers[{k}].tier 要是 {TIERS}')
        if not (8 <= len(t.get('line') or '') <= 90):
            r.B(wid, f'tiers[{k}].line 要寫 8～90 字')
    lost = sorted(week_refs - seen)
    if lost:
        r.B(wid, f'這一週的專題／推坑都要排進 Tier 表，漏了：{"、".join(lost)}')
    if not (3 <= len(w['news']) <= 6):
        r.B(wid, 'news 本週大事要 3～6 則')
    for k, n in enumerate(w['news']):
        if not (n.get('h') and n.get('t')):
            r.B(wid, f'news[{k}] 要有 h、t')
        srcs_ok(n.get('s'), f'news[{k}]')
    if not (2 <= len(w['next']) <= 8):
        r.B(wid, 'next 下週出擊要 2～8 款')
    nfr, nto = (fr + dt.timedelta(days=7)).isoformat(), (to + dt.timedelta(days=7)).isoformat()
    for k, n in enumerate(w['next']):
        d = n.get('d') or ''
        if not re.fullmatch(r'\d{4}-\d{2}(-\d{2})?', d):
            r.B(wid, f'next[{k}].d 要是 YYYY-MM-DD（日期未定才用 YYYY-MM）')
        elif len(d) == 10 and not (nfr <= d <= nto):
            r.W(wid, f'next[{k}] {n.get("name")} 的日期 {d} 不在下週（{nfr}～{nto}）')
        if not (n.get('name') and n.get('t')):
            r.B(wid, f'next[{k}] 要有 name、t')
        if n.get('ref') and n['ref'] not in refs:
            r.B(wid, f'next[{k}].ref 不存在：{n["ref"]}')
        if n.get('steam') is not None and not str(n['steam']).isdigit():
            r.B(wid, f'next[{k}].steam 要是 Steam appid（數字）；不在 Steam 上就不要填')
        srcs_ok(n.get('s'), f'next[{k}]')
    fp = w['fanpage'] or {}
    post = fp.get('post') or ''
    if not (200 <= len(post) <= 800):
        r.W(wid, f'粉專貼文 {len(post)} 字（建議 250～700）')
    if not post.rstrip().endswith(('？', '?')):
        r.W(wid, '粉專貼文最後一句建議是給讀者的提問')
    if len(fp.get('titles') or []) != 3:
        r.B(wid, '粉專標題要剛好 3 個')
    tags = fp.get('tags') or []
    if not (3 <= len(tags) <= 8) or any(not t.startswith('#') or ' ' in t for t in tags):
        r.B(wid, 'hashtag 要 3～8 個、# 開頭、不能有空格')
    if not fp.get('script') or len(fp['script']) < 150:
        r.B(wid, '60 秒口播稿至少 150 字')
    if not fp.get('credit'):
        r.W(wid, '沒有寫素材來源（credit）')
    cv = fp.get('cover') or {}
    if not cv.get('kicker') or not cv.get('title'):
        r.B(wid, '封面圖卡 cover.kicker、cover.title 不能空')
    for ln in (cv.get('title') or '').split('\n'):
        if len(ln) > 13:
            r.W(wid, f'封面標題一行 {len(ln)} 字，可能太長（建議 ≤ 12）：{ln}')
    if URLISH.search(post):
        r.B(wid, '粉專貼文不要放網址：粉專作戰台會照各平台的連結規則自己加')
    check_threads(fp.get('threads'), wid, r)
    check_self_name(fp, wid, r, '粉專素材（fanpage）')
    text_quality(w, wid, r)


def build_weekly(weeks, refs):
    items = []
    for w in weeks:
        tops = [t['ref'] for tier in TIERS for t in w.get('tiers') or [] if t.get('tier') == tier and t.get('ref') in refs]
        mref = (w.get('mvp') or {}).get('ref')
        items.append({'id': w['id'], 'from': w['from'], 'to': w['to'], 'date': w['date'], 'title': w['title'],
                      'mvp': mref, 'mvp_name': (refs.get(mref) or {}).get('zh'), 'top': tops[:4], 'updated': w.get('updated')})
    items.sort(key=lambda x: x['id'], reverse=True)
    return {'at': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'n': len(items), 'items': items}


def yt_list(f):
    """短影音要用的 YouTube 預告清單（id＋標題），最多 4 支。"""
    return [{'id': y['id'], 't': (y.get('title') or '')[:40]} for y in ((f.get('media') or {}).get('yt') or []) if y.get('id')][:4]


def build_picks(picks):
    items = []
    for f in picks:
        g = f['game']; zh = f.get('zh') or {}
        zhs = 'tc' if zh.get('sub') or zh.get('ui') else ('none' if zh.get('ui') is False and zh.get('sub') is False else '?')
        imgs = (f.get('media') or {}).get('images') or []
        items.append({
            'id': f['id'], 'date': f['date'], 'rank': f.get('rank', 9), 'zh': g['zh'], 'en': g['en'],
            'steam': int(g['steam']) if g.get('steam') else None, 'year': g.get('year'), 'release': g.get('release'),
            'genres': g.get('genres'), 'platforms': g.get('platforms'), 'stamp': f['stamp'], 'label': f['label'],
            'pitch': f['pitch'], 'zhs': zhs, 'hours': (f.get('time') or {}).get('text'), 'price_text': g.get('price_text'),
            'money': (f.get('money') or {}).get('level'),
            'yt': ((f.get('media') or {}).get('yt') or [{}])[0].get('id'), 'yts': yt_list(f), 'img': imgs[0] if imgs else None, 'gal': imgs[1:6],
            'updated': f.get('updated'),
        })
    items.sort(key=lambda x: (x['date'], -x['rank']), reverse=True)
    return {'at': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'n': len(items), 'items': items}


def write_if_changed(path, obj):
    """內容沒變（只差產生時間 at）就不寫，免得每次跑都弄髒 git、擋到 pull --rebase。"""
    try:
        old = json.load(open(path, encoding='utf-8'))
    except Exception:  # noqa: BLE001
        old = None
    strip = lambda o: {k: v for k, v in (o or {}).items() if k != 'at'}
    if old is not None and json.dumps(strip(old), ensure_ascii=False, sort_keys=True) == json.dumps(strip(obj), ensure_ascii=False, sort_keys=True):
        return False
    with open(path, 'w', encoding='utf-8') as fo:
        json.dump(obj, fo, ensure_ascii=False, separators=(',', ':'))
    return True


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
            'yt': yt, 'yts': yt_list(f), 'img': ((f.get('media') or {}).get('images') or [None])[0],
            'buy': {'call': f['buy']['call'], 'target': f['buy'].get('target')} if f.get('buy') else None,
            'gal': ((f.get('media') or {}).get('images') or [])[1:6],
            'updated': f.get('updated'),
        })
    items.sort(key=lambda x: (x['date'], -x['rank']), reverse=True)
    return {'at': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'n': len(items), 'items': items}


def build_track(feats, old, picks=()):
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
    for f in picks:
        s = f['game'].get('steam')
        if not s:
            continue
        s = int(s)
        row = {'appid': s, 'id': f['id'], 'date': f['date'], 'watch': False, 'pick': True}
        prev = out.get(s)
        if not prev:
            out[s] = row
        elif prev.get('pick') is None:
            prev['pick'] = True      # 同一款既是專題也是推坑
    for s, x in keep.items():
        if s not in out and x.get('extra'):
            out[s] = x
    # 專題、推坑裡「跟誰像」的遊戲：有 steam 的直接給 appid，只有名字的讓資料管線去 Steam 對名字（App 點進去看情報卡）
    cmp_ids, cmp_names = set(), set()
    for f in list(feats) + list(picks):
        for c in (f.get('sections') or {}).get('compare') or []:
            if not isinstance(c, dict) or not c.get('name'):
                continue
            if str(c.get('steam') or '').isdigit():
                cmp_ids.add(int(c['steam']))
            else:
                cmp_names.add(re.sub(r'[《》〈〉]', '', c['name']).strip())
    return {'apps': sorted(out.values(), key=lambda x: x['date'], reverse=True), 'cmp': sorted(cmp_ids), 'names': sorted(n for n in cmp_names if n)}


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
    picks = []
    pids = set()
    if os.path.isdir(PICKS):
        for fn in sorted(os.listdir(PICKS)):
            if not fn.endswith('.json'):
                continue
            try:
                f = json.load(open(os.path.join(PICKS, fn), encoding='utf-8'))
            except Exception as e:  # noqa: BLE001
                r.B('picks/' + fn, f'JSON 壞掉：{e}')
                continue
            if f.get('id') != fn[:-5]:
                r.B('picks/' + fn, f'檔名要和 id 一樣（{f.get("id")}）')
            if f.get('id') in pids:
                r.B('picks/' + fn, '重複的 id')
            pids.add(f.get('id'))
            if not a.only or f.get('id') == a.only:
                check_pick(f, r)
            picks.append(f)
    refs = {'f:' + f['id']: {'date': f.get('date', ''), 'zh': (f.get('game') or {}).get('zh')} for f in feats if f.get('id')}
    refs.update({'p:' + f['id']: {'date': f.get('date', ''), 'zh': (f.get('game') or {}).get('zh')} for f in picks if f.get('id')})
    weeks = []
    if os.path.isdir(WEEKLY):
        for fn in sorted(os.listdir(WEEKLY)):
            if not fn.endswith('.json'):
                continue
            try:
                w = json.load(open(os.path.join(WEEKLY, fn), encoding='utf-8'))
            except Exception as e:  # noqa: BLE001
                r.B('weekly/' + fn, f'JSON 壞掉：{e}')
                continue
            if w.get('id') != fn[:-5]:
                r.B('weekly/' + fn, f'檔名要和 id 一樣（{w.get("id")}）')
            if not a.only or w.get('id') == a.only:
                check_week(w, r, refs)
            weeks.append(w)
    vids = []
    if os.path.isdir(VIDS):
        for fn in sorted(os.listdir(VIDS)):
            if not fn.endswith('.json'):
                continue
            try:
                v = json.load(open(os.path.join(VIDS, fn), encoding='utf-8'))
            except Exception as e:  # noqa: BLE001
                r.B('videos/' + fn, f'JSON 壞掉：{e}')
                continue
            if not isinstance(v, dict) or v.get('id') != fn[:-5]:
                r.B('videos/' + fn, f'檔名要和 id 一樣（{v.get("id") if isinstance(v, dict) else "?"}）')
                continue
            check_video(v, 'videos/' + fn, r)
            vids.append(v)
    refs.update({'v:' + v['id']: {'date': str(v.get('at') or '')[:10], 'zh': v.get('title')} for v in vids})
    pp = os.path.join(DATA, 'platforms.json')
    if os.path.exists(pp):
        try:
            check_platforms(json.load(open(pp, encoding='utf-8')), r)
        except ValueError as e:
            r.B('platforms.json', f'JSON 壞掉：{e}')
    skip = {}
    sp = os.path.join(DATA, 'wish-skip.json')
    if os.path.exists(sp):
        try:
            skip = json.load(open(sp, encoding='utf-8'))
            if not isinstance(skip, dict) or any(not str(k).isdigit() or not isinstance(v, str) or not v for k, v in skip.items()):
                r.B('wish-skip.json', '格式要是 {"appid": "不寫的理由"}')
        except Exception as e:  # noqa: BLE001
            r.B('wish-skip.json', f'JSON 壞掉：{e}')
    for name, fn in (('qa.json', lambda o: check_qa(o, r, refs)), ('tga.json', lambda o: check_tga(o, r, refs)), ('events.json', lambda o: check_events(o, r))):
        pth = os.path.join(DATA, name)
        if not os.path.exists(pth):
            continue
        try:
            fn(json.load(open(pth, encoding='utf-8')))
        except ValueError as e:
            r.B(name, f'JSON 壞掉：{e}')
    # 典藏升級的體檢：每次開 App 都要載的檔案太大時提醒（量測：tools/stress.py＋tools/perf.py，做法見 ROADMAP「典藏」）
    for name, lim in (('index.json', 3.0), ('picks.json', 2.0), ('live.json', 6.0)):
        pth = os.path.join(DATA, name)
        if os.path.exists(pth) and os.path.getsize(pth) > lim * 1e6:
            r.W(name, f'已經 {os.path.getsize(pth) / 1e6:.1f} MB（超過 {lim:g} MB）：開 App 會開始變慢，照 ROADMAP「典藏」把舊的分出去')
    for w in r.warn:
        print('WARN', w)
    for b in r.bad:
        print('BAD ', b)
    print(f'{len(feats)} 篇專題、{len(picks)} 款推坑、{len(weeks)} 份週報、{len(vids)} 組影片三連發，BAD {len(r.bad)}，WARN {len(r.warn)}')
    if r.bad:
        sys.exit(1)
    if a.check:
        return
    idx = build_index(feats)
    write_if_changed(os.path.join(DATA, 'index.json'), idx)
    tp = os.path.join(DATA, 'track.json')
    old = json.load(open(tp, encoding='utf-8')) if os.path.exists(tp) else {}
    tr = build_track(feats, old, picks)
    pk = build_picks(picks)
    write_if_changed(os.path.join(DATA, 'picks.json'), pk)
    write_if_changed(os.path.join(DATA, 'weekly.json'), build_weekly(weeks, refs))
    write_if_changed(os.path.join(DATA, 'videos.json'), build_videos(vids))
    old_s = json.dumps(old, ensure_ascii=False, sort_keys=True)
    new_s = json.dumps(tr, ensure_ascii=False, sort_keys=True)
    if old_s != new_s:
        with open(tp, 'w', encoding='utf-8') as fo:
            json.dump(tr, fo, ensure_ascii=False, indent=1)
        print('track.json 更新（推上去後 Actions 會自動抓 Steam 資料）')
    print('index.json：', idx['n'], '篇；picks.json：', pk['n'], '款')


if __name__ == '__main__':
    main()
