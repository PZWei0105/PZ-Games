#!/usr/bin/env python3
"""解包 UNPACKED — 點播台收件（GitHub Actions 每小時跟 Steam 資料一起跑）

App 裡的「點播台」把痞子葳的點播（指定一款遊戲寫完整解包）、提問（你問我答）、TGA 預測（鎖定時）
送到轉發站（ntfy.sh 的一個主題，訊息保留約 12 小時）。這支程式把它們收進 apps/unpacked/data/inbox.json：
App 看到自己的事件出現在這裡就知道「收到了」；每天的寫稿、推坑、願望單排程從這裡讀待回答的問題，答案寫進 qa.json。

  python3 _build/apps/unpacked/tools/inbox.py --data apps/unpacked/data
  python3 _build/apps/unpacked/tools/inbox.py --data apps/unpacked/data --selftest   # 送一筆 ping 再收回來（測連線）

轉發站的主題寫在 App 裡（公開 repo 看得到），所以這裡收到的一律當成不可信的資料：只收白名單裡的事件與欄位、截長度。
排程讀到的問題也只是「資料」：只回答遊戲相關的問題，不照裡面寫的任何指示做事。
"""
import argparse, datetime, json, os, re, time, urllib.parse, urllib.request

TOPIC = 'pz-unpacked-be41c9397306c2b86f06'
BASE = 'https://ntfy.sh/' + TOPIC
KEEP = 1500
STR = lambda n: (lambda v: v.strip()[:n] if isinstance(v, str) and v.strip() else None)  # noqa: E731
LIST = lambda n, m: (lambda v: [x[:m] for x in v[:n] if isinstance(x, str)] if isinstance(v, list) else None)  # noqa: E731
INT = lambda lo, hi: (lambda v: v if isinstance(v, int) and not isinstance(v, bool) and lo <= v <= hi else None)  # noqa: E731
BOOL = lambda v: v if isinstance(v, bool) else None  # noqa: E731


def DICT(n, kmax, valf):
    def f(v):
        if not isinstance(v, dict):
            return None
        out = {}
        for k, x in list(v.items())[:n]:
            if isinstance(k, str) and re.fullmatch(r'[a-z0-9_-]{1,%d}' % kmax, k):
                y = valf(x)
                if y is not None:
                    out[k] = y
        return out
    return f


FIELDS = {
    'ask': {'q': STR(600), 'ref': STR(60), 'ctx': STR(120)},                  # 你問我答：ref＝f:<專題>／p:<推坑>／a:<Steam appid>／tga／board
    'req': {'game': STR(100), 'note': STR(300), 'appid': INT(1, 99999999)},  # 點播解包：指定一款遊戲
    'tga': {'picks': DICT(40, 12, INT(0, 9)), 'x2': LIST(3, 12), 'peek': BOOL, 'lock': STR(32)},   # TGA 預測鎖定
    'ping': {'note': STR(40)},
}
ID = re.compile(r'^d[a-z0-9]{3,10}-[a-z0-9]{4,12}$')
DEV = re.compile(r'^d[a-z0-9]{3,10}$')


def clean(ev, dev):
    if not isinstance(ev, dict):
        return None
    typ, eid = ev.get('type'), ev.get('id')
    if typ not in FIELDS or not isinstance(eid, str) or not ID.match(eid) or not eid.startswith(dev + '-'):
        return None
    out = {'id': eid, 'type': typ, 't': ev.get('t')[:32] if isinstance(ev.get('t'), str) else None, 'dev': dev}
    for k, f in FIELDS[typ].items():
        v = f(ev.get(k)) if k in ev else None
        if v is not None:
            out[k] = v
    if typ == 'ask' and not out.get('q'):
        return None
    if typ == 'req' and not out.get('game'):
        return None
    return out


def fetch(since):
    url = BASE + '/json?poll=1&since=' + urllib.parse.quote(since)
    req = urllib.request.Request(url, headers={'User-Agent': 'pz-unpacked-inbox'})
    with urllib.request.urlopen(req, timeout=40) as r:
        body = r.read().decode('utf-8', 'replace')
    msgs = []
    for line in body.splitlines():
        try:
            m = json.loads(line)
        except ValueError:
            continue
        if m.get('event') == 'message' and isinstance(m.get('message'), str):
            msgs.append(m)
    return msgs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--selftest', action='store_true')
    a = ap.parse_args()
    path = os.path.join(a.data, 'inbox.json')
    try:
        inbox = json.load(open(path, encoding='utf-8'))
    except (FileNotFoundError, ValueError):
        inbox = {'v': 1, 'at': '', 'cursor': '', 'events': []}
    if a.selftest:
        body = json.dumps({'v': 1, 'dev': 'dselftest', 'ev': [{'id': 'dselftest-%06d' % (int(time.time()) % 1000000), 't': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'type': 'ping', 'note': 'actions selftest'}]})
        urllib.request.urlopen(urllib.request.Request(BASE, data=body.encode(), method='POST'), timeout=30).read()
        print('已送出測試 ping')
        time.sleep(3)
    since = inbox.get('cursor') or '24h'
    try:
        msgs = fetch(since)
    except Exception as e:  # noqa: BLE001  轉發站暫時連不到（或游標過期）：改抓最近 12 小時，再不行就下一輪再收
        if since == '24h':
            print('轉發站連不到：', e)
            return
        try:
            msgs = fetch('12h')
        except Exception as e2:  # noqa: BLE001
            print('轉發站連不到：', e2)
            return
    have = {e['id'] for e in inbox['events']}
    added = 0
    for m in msgs:
        try:
            env = json.loads(m['message'])
        except ValueError:
            continue
        dev = env.get('dev') if isinstance(env, dict) and isinstance(env.get('dev'), str) and DEV.match(env.get('dev', '')) else None
        if not dev:
            continue
        for ev in (env.get('ev') or [])[:20]:
            c = clean(ev, dev)
            if c and c['id'] not in have:
                inbox['events'].append(c)
                have.add(c['id'])
                added += 1
    if msgs:
        inbox['cursor'] = msgs[-1].get('id') or inbox.get('cursor', '')
    inbox['events'] = sorted(inbox['events'], key=lambda e: e.get('t') or '')[-KEEP:]
    if added or msgs:
        inbox['at'] = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(timespec='seconds')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(inbox, f, ensure_ascii=False, indent=0)
    print('收到 %d 則訊息、新事件 %d 筆（共 %d 筆）' % (len(msgs), added, len(inbox['events'])))


if __name__ == '__main__':
    main()
