#!/usr/bin/env python3
"""轉機 TURNAROUND — 塔台收件（GitHub Actions 每小時跑一次）

App 把痞子葳的每一個動作（登機／延誤／取消、航線、工單核准、簽派、機長報告、NOTAM、排隊進廠、托運點子、聯程）
送到轉發站（ntfy.sh 的一個主題，訊息保留約 12 小時）。這支程式把它們收進 apps/turnaround/data/inbox.json，
App 看到自己的事件出現在這裡，就知道「塔台收到了」；每天的排程也從這裡讀他的表態。

  python3 _build/apps/turnaround/tools/inbox.py --data apps/turnaround/data
  python3 _build/apps/turnaround/tools/inbox.py --data apps/turnaround/data --selftest   # 送一筆 ping 再收回來（測連線）

轉發站的主題寫在 App 裡（公開 repo 看得到），所以這裡收到的一律當成不可信的資料：只收白名單裡的事件與欄位、截長度。
"""
import argparse, datetime, json, os, re, sys, time, urllib.parse, urllib.request

TOPIC = 'pz-turnaround-b53ef251972dad327450'
BASE = 'https://ntfy.sh/' + TOPIC
KEEP = 3000
STR = lambda n: (lambda v: v[:n] if isinstance(v, str) else None)
LIST = lambda n, m: (lambda v: [x[:m] for x in v[:n] if isinstance(x, str)] if isinstance(v, list) else None)
ENUM = lambda *a: (lambda v: v if v in a else None)
FIELDS = {
    'vote': {'card': STR(40), 'v': ENUM('board', 'delay', 'cancel', 'none'), 'reasons': LIST(8, 20), 'note': STR(300), 'lane': ENUM('novel', 'game', 'free'), 'zh': STR(12), 'prev': STR(10)},
    'route': {'card': STR(40), 'route': STR(4), 'zh': STR(12)},
    'talk': {'card': STR(40)},
    'item': {'insp': STR(60), 'work': STR(40), 'item': STR(10), 'v': ENUM('approve', 'reject', 'none')},
    'dispatch': {'insp': STR(60), 'work': STR(40), 'items': LIST(20, 10)},
    'pirep': {'work': STR(40), 'text': STR(600), 'chips': LIST(9, 12)},
    'notam': {'rule': STR(12), 'v': ENUM('agree', 'disagree', 'none')},
    'queue': {'work': STR(40), 'v': ENUM('on', 'off')},
    'idea': {'lane': ENUM('novel', 'game', 'free'), 'text': STR(500)},
    'merge': {'a': STR(40), 'b': STR(40), 'za': STR(12), 'zb': STR(12)},
    'ping': {'note': STR(40)},
}
ID = re.compile(r'^d[a-z0-9]{3,10}-\d{1,7}$')


def clean(ev, dev):
    if not isinstance(ev, dict):
        return None
    typ, eid = ev.get('type'), ev.get('id')
    if typ not in FIELDS or not isinstance(eid, str) or not ID.match(eid):
        return None
    out = {'id': eid, 'type': typ, 't': ev.get('t')[:32] if isinstance(ev.get('t'), str) else None, 'dev': dev}
    for k, f in FIELDS[typ].items():
        v = f(ev.get(k)) if k in ev else None
        if v is not None:
            out[k] = v
    return out


def fetch(since):
    url = BASE + '/json?poll=1&since=' + urllib.parse.quote(since)
    req = urllib.request.Request(url, headers={'User-Agent': 'pz-turnaround-inbox'})
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
        body = json.dumps({'v': 1, 'dev': 'dselftest', 'ev': [{'id': 'dselftest-%d' % (int(time.time()) % 1000000), 't': datetime.datetime.utcnow().isoformat() + 'Z', 'type': 'ping', 'note': 'actions selftest'}]})
        urllib.request.urlopen(urllib.request.Request(BASE, data=body.encode(), method='POST'), timeout=30).read()
        print('已送出測試 ping')
        time.sleep(3)
    since = inbox.get('cursor') or '24h'
    try:
        msgs = fetch(since)
    except Exception as e:  # 轉發站暫時連不到：下一輪再收
        if since != '24h':
            try:
                msgs = fetch('12h')
            except Exception as e2:
                print('轉發站連不到：', e2)
                return
        else:
            print('轉發站連不到：', e)
            return
    have = {e['id'] for e in inbox['events']}
    added = 0
    for m in msgs:
        try:
            env = json.loads(m['message'])
        except ValueError:
            continue
        dev = env.get('dev') if isinstance(env, dict) and isinstance(env.get('dev'), str) and re.match(r'^d[a-z0-9]{3,10}$', env.get('dev', '')) else None
        if not dev:
            continue
        for ev in env.get('ev') or []:
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
