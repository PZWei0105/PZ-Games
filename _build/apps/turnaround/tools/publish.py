#!/usr/bin/env python3
"""轉機 TURNAROUND — 上架檢查＋重建目錄

每天的排程寫好 apps/turnaround/data/days/<YYYY-MM-DD>.json 之後跑這支：
  python3 _build/apps/turnaround/tools/publish.py           # 檢查全部、重建 index.json、更新機隊與手冊
  python3 _build/apps/turnaround/tools/publish.py --check   # 只檢查，不寫檔

做的事：
  1. 檢查每一天的格式（航班三班、欄位齊全、長度、簡體字、宮廟民俗題材、守則代號存在、截圖存在…）。BAD 不准推。
  2. 檢修報告提出的新守則（notams）以「待核准」加進 manual.json（已經有的不動）。
  3. 機隊 fleet.json 記下每一架的檢修紀錄。
  4. 重建 data/index.json（App 打開時讀的目錄）。
"""
import argparse, datetime, glob, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
DATA = os.path.join(REPO, 'apps', 'turnaround', 'data')

LANES = {'novel': '小說', 'game': '遊戲', 'free': '自由'}
VERDICTS = {'airworthy', 'service', 'overhaul', 'retire'}
KINDS = {'fix', 'polish', 'cut', 'add'}
WORTH = {'high', 'mid', 'low'}
EFFORT = {'S', 'M', 'L'}
XRAY = {'clear', 'open', 'deny'}
GATE = {'pass', 'warn', 'fail'}
# 一定是簡體的字（繁體不會這樣寫）
SIMP = set('这们来时说为对发会国过还进动种开关车东门问间学实现经应该让头见长无产业与书后际网页题级战选择戏游剧画线节读写贝么吗们让给专业从众优传伤们觉观规认识语误请谁调谈贵买卖钱错难题响顶领风飞饭馆马鸟龙')
BANNED = ['宮廟', '廟會', '乩童', '陣頭', '進香', '遶境', '繞境']

bad, warn = [], []


def B(msg):
    bad.append(msg)


def W(msg):
    warn.append(msg)


def load(p, default=None):
    try:
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def dump(p, data):
    s = json.dumps(data, ensure_ascii=False, indent=1)
    if os.path.exists(p) and open(p, encoding='utf-8').read() == s:
        return False
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)
    return True


def texts(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, dict):
        for v in o.values():
            yield from texts(v)
    elif isinstance(o, list):
        for v in o:
            yield from texts(v)


def check_text(where, o):
    for t in texts(o):
        s = [c for c in t if c in SIMP]
        if s:
            B('%s：有簡體字「%s」：%s' % (where, ''.join(sorted(set(s))), t[:40]))
        for w in BANNED:
            if w in t:
                B('%s：出現「%s」——選題不預設宮廟民俗（飛行手冊 m-x02）' % (where, w))


def need(where, o, keys):
    for k in keys:
        if k not in o or o[k] in (None, '', []):
            B('%s：缺 %s' % (where, k))


def check_day(path, manual_ids, fleet):
    name = os.path.basename(path)
    d = load(path)
    if not isinstance(d, dict):
        B('%s：不是 JSON 物件' % name)
        return None
    date = name[:-5]
    if d.get('date') != date:
        B('%s：date 跟檔名不同' % name)
    need(name, d, ['tower', 'announce', 'flights', 'inspection'])
    check_text(name, d)
    if len(d.get('announce', '')) > 600:
        W('%s：廣播稿太長（%d 字，建議 300 字內）' % (name, len(d['announce'])))
    fl = d.get('flights') or []
    lanes = [f.get('lane') for f in fl]
    if sorted(lanes) != sorted(LANES):
        B('%s：航班要剛好三班：小說、遊戲、自由各一（現在是 %s）' % (name, lanes))
    seen = set()
    for f in fl:
        w = '%s 航班 %s' % (name, f.get('id'))
        need(w, f, ['id', 'lane', 'no', 'time', 'gate', 'dest', 'zh', 'en', 'kind', 'hook', 'pitch', 'fun', 'fail', 'xray', 'checks', 'routes', 'scope'])
        if f.get('id') in seen:
            B('%s：id 重複' % w)
        seen.add(f.get('id'))
        if not str(f.get('id', '')).startswith(date):
            B('%s：id 要以日期開頭' % w)
        if len(f.get('zh', '')) > 6:
            B('%s：中文名「%s」太長（翻牌板最多 6 字）' % (w, f.get('zh')))
        if len(f.get('en', '')) > 22:
            W('%s：英文名太長（%d 字元）' % (w, len(f.get('en', ''))))
        if not re.fullmatch(r'[A-Z]{3}', f.get('dest', '')):
            B('%s：dest 要是三個大寫英文字母' % w)
        if not re.fullmatch(r'[NGF]\d', f.get('gate', '')):
            B('%s：gate（登機門）要像 N1、G1、F1' % w)
        if len(f.get('hook', '')) > 70:
            W('%s：鉤子太長（%d 字）' % (w, len(f.get('hook', ''))))
        x = f.get('xray') or {}
        need(w + ' 安檢', x, ['threat', 'verdict', 'fix'])
        if x.get('verdict') not in XRAY:
            B('%s：xray.verdict 只能是 %s' % (w, sorted(XRAY)))
        for g in f.get('checks') or []:
            if g.get('ok') not in GATE:
                B('%s：檢查表 ok 只能是 pass／warn／fail' % w)
            if g.get('rule') and g['rule'] not in manual_ids:
                B('%s：檢查表引用了不存在的守則 %s' % (w, g['rule']))
            if not g.get('rule') and not g.get('text'):
                B('%s：自訂的檢查項要寫 text' % w)
        rs = f.get('routes') or []
        if not 2 <= len(rs) <= 3:
            B('%s：轉機航線要 2～3 條' % w)
        for r in rs:
            need(w + ' 航線', r, ['id', 'name', 'line', 'trade'])
        if f.get('lane') == 'novel':
            body = f.get('pitch', '') + f.get('hook', '') + f.get('seed', '')
            if '魏子葳' not in body:
                W('%s：小說航班沒提到主角魏子葳（男主角一律叫魏子葳，m-n07）' % w)
    ins = d.get('inspection')
    if ins:
        w = '%s 檢修' % name
        need(w, ins, ['id', 'work', 'check', 'summary', 'method', 'vitals', 'core', 'worst', 'why_not', 'items', 'verdict', 'verdict_note', 'order'])
        wk = fleet.get(ins.get('work'))
        if not wk:
            B('%s：機隊裡沒有 %s' % (w, ins.get('work')))
        elif wk.get('skip'):
            B('%s：%s 不在機庫範圍（%s）' % (w, ins.get('work'), wk['skip']))
        if ins.get('verdict') not in VERDICTS:
            B('%s：verdict 只能是 %s' % (w, sorted(VERDICTS)))
        ids = set()
        for it in ins.get('items') or []:
            need(w + ' 工單', it, ['id', 'kind', 'title', 'detail', 'worth', 'effort'])
            if it.get('kind') not in KINDS:
                B('%s：工單 kind 只能是 fix／polish／cut／add' % w)
            if it.get('worth') not in WORTH:
                B('%s：工單 worth 只能是 high／mid／low' % w)
            if it.get('effort') not in EFFORT:
                B('%s：工單 effort 只能是 S／M／L' % w)
            if it.get('id') in ids:
                B('%s：工單 id 重複 %s' % (w, it.get('id')))
            ids.add(it.get('id'))
        for v in ins.get('vitals') or []:
            if not (isinstance(v.get('v'), int) and 1 <= v['v'] <= 5):
                B('%s：儀表 %s 的 v 要是 1～5' % (w, v.get('k')))
        for s in ins.get('shots') or []:
            if not os.path.exists(os.path.join(DATA, s.get('src', ''))):
                B('%s：找不到截圖 %s' % (w, s.get('src')))
        for n in ins.get('notams') or []:
            need(w + ' NOTAM', n, ['id', 'scope', 'kind', 'title', 'rule', 'from'])
            if not re.fullmatch(r'n-\d{4}', n.get('id', '')):
                B('%s：NOTAM id 要像 n-0001' % w)
    else:
        W('%s：今天沒有檢修報告' % name)
    return d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()

    manual = load(os.path.join(DATA, 'manual.json'))
    fleet_doc = load(os.path.join(DATA, 'fleet.json'))
    fleet = {w['id']: w for w in fleet_doc['works']}
    manual_ids = {r['id'] for r in manual['rules']}
    # 先把所有天的 NOTAM 收進來，檢查表才能引用它們
    paths = sorted(glob.glob(os.path.join(DATA, 'days', '*.json')))
    for p in paths:
        d = load(p) or {}
        for n in (d.get('inspection') or {}).get('notams') or []:
            manual_ids.add(n.get('id'))
    days = []
    for p in paths:
        d = check_day(p, manual_ids, fleet)
        if d:
            days.append(d)

    today = datetime.date.today().isoformat()
    if days and days[-1]['date'] > today:
        W('最新一天 %s 比今天 %s 還晚' % (days[-1]['date'], today))

    for m in warn:
        print('WARN', m)
    for m in bad:
        print('BAD ', m)
    if bad:
        print('\n有 %d 個 BAD，不准推。' % len(bad))
        sys.exit(1)
    if a.check:
        print('檢查通過（%d 天）' % len(days))
        return

    # 手冊：新 NOTAM 以待核准加入
    have = {r['id'] for r in manual['rules']}
    for d in days:
        for n in (d.get('inspection') or {}).get('notams') or []:
            if n['id'] not in have:
                r = dict(n)
                r.update({'status': 'proposed', 'by': 'inspection', 'date': d['date']})
                manual['rules'].append(r)
                have.add(n['id'])
    ch_m = dump(os.path.join(DATA, 'manual.json'), manual)

    # 機隊：檢修紀錄
    for d in days:
        ins = d.get('inspection')
        if not ins:
            continue
        w = fleet[ins['work']]
        rec = {'date': d['date'], 'id': ins['id'], 'verdict': ins['verdict'], 'check': ins['check'], 'n': len(ins.get('items') or [])}
        w['inspections'] = [x for x in w.get('inspections', []) if x.get('id') != ins['id']] + [rec]
        w['inspections'].sort(key=lambda x: x['date'])
    ch_f = dump(os.path.join(DATA, 'fleet.json'), fleet_doc)

    # 目錄
    idx_days = []
    for i, d in enumerate(days):
        ins = d.get('inspection')
        h = None
        if ins:
            w = fleet[ins['work']]
            h = {'id': ins['id'], 'work': ins['work'], 'zh': w['zh'], 'en': w['en'], 'reg': w['reg'], 'verdict': ins['verdict'],
                 'check': ins['check'], 'summary': ins['summary']}
        idx_days.append({
            'date': d['date'], 'no': i + 1, 'tower': d['tower'],
            'flights': [{k: f.get(k) for k in ('id', 'lane', 'no', 'time', 'gate', 'dest', 'zh', 'en', 'kind', 'hook')} for f in d['flights']],
            'hangar': h,
        })
    idx_days.reverse()
    index = {
        'v': 1,
        'at': datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(timespec='seconds'),
        'latest': idx_days[0]['date'] if idx_days else None,
        'days': idx_days,
        'counts': {
            'days': len(days),
            'flights': sum(len(d['flights']) for d in days),
            'inspections': sum(1 for d in days if d.get('inspection')),
            'rules': sum(1 for r in manual['rules'] if r.get('status') == 'official'),
            'notams': sum(1 for r in manual['rules'] if r.get('status') == 'proposed'),
        },
    }
    old = load(os.path.join(DATA, 'index.json'), {}) or {}
    if {k: v for k, v in old.items() if k != 'at'} == {k: v for k, v in index.items() if k != 'at'}:
        index['at'] = old.get('at', index['at'])
    ch_i = dump(os.path.join(DATA, 'index.json'), index)
    print('上架完成：%d 天、手冊%s、機隊%s、目錄%s' % (len(days), '已更新' if ch_m else '沒變', '已更新' if ch_f else '沒變', '已更新' if ch_i else '沒變'))


if __name__ == '__main__':
    main()
