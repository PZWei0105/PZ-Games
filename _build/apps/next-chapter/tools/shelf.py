#!/usr/bin/env python3
"""下回分解 — 書架工具：把小說章節打包、上架、取回。

章節在 repo 裡不放純文字（repo 是公開的），一律打包成 .pzc：
  b'PZC1' + XOR(raw-deflate(UTF-8 文字))
這不是加密，只是讓搜尋引擎、爬蟲、GitHub 搜尋讀不到全文；App 和這支工具都能直接解開。

用法（在 repo 根目錄或任何地方執行都可以）：
  shelf.py books                                  列出書架上的書
  shelf.py list  <book>                           列出某本書的章節
  shelf.py new   <book> --title 書名 --genre 類型 --blurb 簡介 [--status 連載中] [--cloth '#1f3350'] [--seal 朕] [--motif pass]
  shelf.py add   <book> <章節.md> [--n 9] [--label 第九章] [--name 咽喉] [--date 2026-11-11]
                                                  新章上架；同一章再 add 一次就是改稿（版本會換，App 會重新下載）
  shelf.py cat   <book> <n>                       印出某一章的純文字（要改稿時先取回）
  shelf.py recap <book> <n> <提要.txt>             寫／改某一章的前情提要（一段話，一百多字；用 - 代表從標準輸入讀）
  shelf.py recap <book> <n>                       印出某一章現在的提要
  shelf.py recap <book>                           列出哪幾章有提要、哪幾章還沒有
  shelf.py set   <book> [--genre 架空歷史] [--status 已完結] [--title …] [--blurb …] [--seal …] [--motif …] [--cloth …]
                                                  改書的資料（分類就是 App 書房最下面的分頁）
  shelf.py rm    <book> <n>                       下架一章
  shelf.py check                                  檢查整個書架（解得開、字數、標點、引號成對、提要）

每上架一章，順手寫那一章的前情提要（recap）：App 會在久沒讀的時候先給讀者看「上一回」的提要，
書頁上也有一整排「提要」可以翻。提要只會給讀到那裡的人看，不會先劇透。

章節 .md 的格式（跟對話裡連寫的檔案一樣）：
  # 書名
  ## 第九章　咽喉
  （空一行後是正文；一段一行，段與段空一行；場景切換用單獨一行 ---）
"""
import argparse, datetime, hashlib, json, os, re, sys, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
BOOKS = os.path.join(REPO, 'apps', 'next-chapter', 'books')
LIB = os.path.join(BOOKS, 'library.json')
MAGIC = b'PZC1'
KEY = b'pz-next-chapter!'
TZ = datetime.timezone(datetime.timedelta(hours=8))


def pack(text):
    co = zlib.compressobj(9, zlib.DEFLATED, -15)
    raw = co.compress(text.encode('utf-8')) + co.flush()
    return MAGIC + bytes(b ^ KEY[i % len(KEY)] for i, b in enumerate(raw))


def unpack(data):
    if data[:4] != MAGIC:
        raise ValueError('not a PZC1 file')
    raw = bytes(b ^ KEY[i % len(KEY)] for i, b in enumerate(data[4:]))
    return zlib.decompress(raw, -15).decode('utf-8')


def load():
    if not os.path.exists(LIB):
        return {'v': 1, 'updated': '', 'books': []}
    with open(LIB, encoding='utf-8') as f:
        return json.load(f)


def save(lib):
    lib['updated'] = datetime.datetime.now(TZ).strftime('%Y-%m-%dT%H:%M:%S+08:00')
    os.makedirs(BOOKS, exist_ok=True)
    with open(LIB, 'w', encoding='utf-8') as f:
        json.dump(lib, f, ensure_ascii=False, indent=1)
        f.write('\n')


def book_of(lib, bid):
    for b in lib['books']:
        if b['id'] == bid:
            return b
    sys.exit('書架上沒有這本書：%s（先用 new 建立；現有：%s）' % (bid, '、'.join(b['id'] for b in lib['books']) or '無'))


def normalize(text):
    text = text.replace('﻿', '').replace('\r\n', '\n').replace('\r', '\n')
    lines = [ln.rstrip() for ln in text.split('\n')]
    out, blank = [], 0
    for ln in lines:
        if ln.strip() == '':
            blank += 1
            continue
        if out and blank:
            out.append('')
        blank = 0
        out.append(ln.strip() if ln.strip() in ('---', '***', '* * *') else ln.lstrip('　 ').rstrip())
    return '\n'.join(out).strip() + '\n'


def blocks(body):
    """跟 App 一樣的分段規則：每個非空行是一塊。回傳 [(kind, text)]，kind: p / br / h"""
    out = []
    for ln in body.split('\n'):
        s = ln.strip()
        if not s:
            continue
        if s in ('---', '***', '* * *'):
            out.append(('br', ''))
        elif s.startswith('#'):
            out.append(('h', s.lstrip('#').strip()))
        else:
            out.append(('p', s))
    return out


CN = '零〇一二三四五六七八九十百千兩两'


def cn2int(s):
    s = s.replace('兩', '二').replace('两', '二').replace('〇', '零')
    if s.isdigit():
        return int(s)
    d = {c: i for i, c in enumerate('零一二三四五六七八九')}
    total, cur = 0, 0
    for ch in s:
        if ch in d:
            cur = d[ch]
        elif ch == '十':
            total += (cur or 1) * 10
            cur = 0
        elif ch == '百':
            total += (cur or 1) * 100
            cur = 0
        elif ch == '千':
            total += (cur or 1) * 1000
            cur = 0
    return total + cur


def parse_md(path):
    with open(path, encoding='utf-8') as f:
        text = normalize(f.read())
    lines = text.split('\n')
    title = label = name = None
    i = 0
    while i < len(lines) and (lines[i].strip() == '' or lines[i].startswith('#')):
        s = lines[i].strip()
        if s.startswith('## ') and label is None:
            head = s[3:].strip()
            m = re.match(r'^(\S+?)[　\s]+(.+)$', head)
            label, name = (m.group(1), m.group(2).strip()) if m else (head, '')
        elif s.startswith('# ') and title is None:
            title = s[2:].strip()
        elif s.startswith('#'):
            break
        i += 1
    body = '\n'.join(lines[i:]).strip() + '\n'
    return title, label, name, body


def cmd_books(a):
    lib = load()
    for b in lib['books']:
        chars = sum(c['chars'] for c in b['chapters'])
        au = sum(1 for c in b['chapters'] if c.get('au'))
        rc = len(load_recaps(b))
        print('%-18s 《%s》 %s  %s  %d 章  %d 字  提要 %d 章  說書音軌 %d 章' % (b['id'], b['title'], b.get('status', ''), b.get('genre', '') or '未分類', len(b['chapters']), chars, rc, au))


def cmd_list(a):
    b = book_of(load(), a.book)
    rc = load_recaps(b)
    for c in b['chapters']:
        print('%3d  %s　%s  %d 字  %s%s%s%s' % (c['n'], c['label'], c['name'], c['chars'], c['added'],
                                             '  改稿 ' + c['rev'] if c.get('rev') else '', '  ♪' if c.get('au') else '', '  提要' if str(c['n']) in rc else ''))


def cmd_new(a):
    lib = load()
    if any(b['id'] == a.book for b in lib['books']):
        sys.exit('已經有這本書了：' + a.book)
    lib['books'].append({
        'id': a.book, 'title': a.title, 'author': a.author, 'status': a.status, 'genre': a.genre,
        'blurb': a.blurb, 'cover': {'cloth': a.cloth, 'seal': a.seal or a.title[0], 'motif': a.motif},
        'chapters': [],
    })
    save(lib)
    os.makedirs(os.path.join(BOOKS, a.book), exist_ok=True)
    print('已建立《%s》（%s）' % (a.title, a.book))


def cmd_add(a):
    lib = load()
    b = book_of(lib, a.book)
    title, label, name, body = parse_md(a.file)
    if title and title != b['title']:
        sys.exit('檔案開頭的書名是「%s」，跟書架上的《%s》不一樣；確認沒放錯書。' % (title, b['title']))
    label = a.label or label
    name = a.name if a.name is not None else (name or '')
    if not label:
        sys.exit('找不到章節標題（檔案要有「## 第九章　咽喉」這一行，或用 --label/--name 指定）')
    n = a.n
    if n is None:
        m = re.match(r'^第([%s0-9０-９]+)[章回卷節集部篇話]' % CN, label)
        n = cn2int(m.group(1).translate(str.maketrans('０１２３４５６７８９', '0123456789'))) if m else (max([c['n'] for c in b['chapters']] + [0]) + 1)
    if not body.strip():
        sys.exit('正文是空的')
    data = pack(body)
    assert unpack(data) == body
    fn = '%03d.pzc' % n
    os.makedirs(os.path.join(BOOKS, a.book), exist_ok=True)
    with open(os.path.join(BOOKS, a.book, fn), 'wb') as f:
        f.write(data)
    now = datetime.datetime.now(TZ)
    today = a.date or now.strftime('%Y-%m-%d')
    ent = {'n': n, 'label': label, 'name': name, 'f': fn, 'v': hashlib.sha1(data).hexdigest()[:8],
           'chars': len(re.sub(r'\s', '', body)), 'added': today,
           'at': (a.date + 'T12:00:00+08:00') if a.date else now.strftime('%Y-%m-%dT%H:%M:%S+08:00')}
    old = next((c for c in b['chapters'] if c['n'] == n), None)
    if old:
        if old['v'] == ent['v'] and old['label'] == label and old['name'] == name:
            print('內容沒有變：%s　%s' % (label, name))
            return
        ent['added'] = old['added']
        if old.get('at'):
            ent['at'] = old['at']
        else:
            del ent['at']                       # 舊的章只有日期：上架時間不知道，就不要亂填
        if old['v'] != ent['v']:
            ent['rev'] = today
            if old.get('au'):
                print('注意：這一章改稿了，舊的說書音軌已經對不上，已拿掉；要重錄請跑 narrate.py %s %d' % (a.book, n))
        elif old.get('au'):
            ent['au'] = old['au']
        b['chapters'][b['chapters'].index(old)] = ent
        print('已改稿：%s　%s（%d 字）' % (label, name, ent['chars']))
    else:
        b['chapters'].append(ent)
        print('已上架：%s　%s（%d 字）' % (label, name, ent['chars']))
    b['chapters'].sort(key=lambda c: c['n'])
    save(lib)
    if not old and str(n) not in load_recaps(b):
        print('提醒：記得寫這一章的前情提要 → shelf.py recap %s %d 提要.txt' % (a.book, n))


def load_recaps(b):
    r = b.get('recaps')
    if not r:
        return {}
    with open(os.path.join(BOOKS, b['id'], r['f']), 'rb') as f:
        return json.loads(unpack(f.read())).get('recaps', {})


def save_recaps(b, rc):
    rc = {k: rc[k] for k in sorted(rc, key=int)}
    data = pack(json.dumps({'v': 1, 'recaps': rc}, ensure_ascii=False, separators=(',', ':')))
    with open(os.path.join(BOOKS, b['id'], 'recaps.pzc'), 'wb') as f:
        f.write(data)
    b['recaps'] = {'f': 'recaps.pzc', 'v': hashlib.sha1(data).hexdigest()[:8], 'n': len(rc)}


def cmd_recap(a):
    lib = load()
    b = book_of(lib, a.book)
    rc = load_recaps(b)
    if a.n is None:
        have = [c['n'] for c in b['chapters'] if str(c['n']) in rc]
        miss = [c['n'] for c in b['chapters'] if str(c['n']) not in rc]
        print('《%s》有提要：%s' % (b['title'], have or '無'))
        print('還沒有：%s' % (miss or '無'))
        return
    c = next((c for c in b['chapters'] if c['n'] == a.n), None)
    if not c:
        sys.exit('沒有第 %d 章' % a.n)
    if a.file is None:
        print(rc.get(str(a.n), '（第 %d 章還沒有提要）' % a.n))
        return
    raw = sys.stdin.read() if a.file == '-' else open(a.file, encoding='utf-8').read()
    text = ''.join(ln.strip() for ln in raw.replace('\r', '').replace('\ufeff', '').split('\n')).strip()
    if not text:
        sys.exit('提要是空的')
    half = sorted(set(re.findall(r'[,;:!?"()]', text)))
    if half:
        print('注意：提要裡有半形標點：', ' '.join(half))
    if not 40 <= len(text) <= 240:
        print('注意：提要 %d 字（建議一百到一百五十字，一段話）' % len(text))
    old = rc.get(str(a.n))
    if old == text:
        print('提要沒有變：%s　%s' % (c['label'], c['name']))
        return
    rc[str(a.n)] = text
    save_recaps(b, rc)
    save(lib)
    print('%s：%s　%s 的前情提要（%d 字）' % ('已改' if old else '已寫好', c['label'], c['name'], len(text)))


def cmd_set(a):
    lib = load()
    b = book_of(lib, a.book)
    changed = []
    for k in ('title', 'author', 'status', 'genre', 'blurb'):
        v = getattr(a, k)
        if v is not None and b.get(k) != v:
            b[k] = v
            changed.append(k)
    for k in ('cloth', 'seal', 'motif'):
        v = getattr(a, k)
        if v is not None and b['cover'].get(k) != v:
            b['cover'][k] = v
            changed.append(k)
    if not changed:
        print('沒有要改的')
        return
    save(lib)
    print('已更新《%s》：%s' % (b['title'], '、'.join(changed)))


def cmd_cat(a):
    b = book_of(load(), a.book)
    c = next((c for c in b['chapters'] if c['n'] == a.n), None)
    if not c:
        sys.exit('沒有第 %d 章' % a.n)
    with open(os.path.join(BOOKS, a.book, c['f']), 'rb') as f:
        body = unpack(f.read())
    sys.stdout.write('# %s\n\n## %s　%s\n\n%s' % (b['title'], c['label'], c['name'], body))


def cmd_rm(a):
    lib = load()
    b = book_of(lib, a.book)
    c = next((c for c in b['chapters'] if c['n'] == a.n), None)
    if not c:
        sys.exit('沒有第 %d 章' % a.n)
    b['chapters'].remove(c)
    for fn in [c['f']] + ([c['au']['f'], c['au']['tl']] if c.get('au') else []):
        p = os.path.join(BOOKS, a.book, fn)
        if os.path.exists(p):
            os.remove(p)
    rc = load_recaps(b)
    if str(a.n) in rc:
        del rc[str(a.n)]
        save_recaps(b, rc)
    save(lib)
    print('已下架：%s　%s' % (c['label'], c['name']))


def cmd_check(a):
    lib = load()
    bad = 0
    for b in lib['books']:
        seen = set()
        for c in b['chapters']:
            p = os.path.join(BOOKS, b['id'], c['f'])
            tag = '《%s》%s' % (b['title'], c['label'])
            try:
                with open(p, 'rb') as f:
                    data = f.read()
                body = unpack(data)
            except Exception as e:
                print('BAD ', tag, '解不開：', e)
                bad += 1
                continue
            if hashlib.sha1(data).hexdigest()[:8] != c['v']:
                print('BAD ', tag, '版本碼跟檔案不符（忘了用 add？）')
                bad += 1
            if c['n'] in seen:
                print('BAD ', tag, '章號重複')
                bad += 1
            seen.add(c['n'])
            chars = len(re.sub(r'\s', '', body))
            if chars != c['chars']:
                print('BAD ', tag, '字數不符', chars, c['chars'])
                bad += 1
            if body.count('「') != body.count('」') or body.count('『') != body.count('』'):
                print('WARN', tag, '引號不成對：「%d 」%d 『%d 』%d' % (body.count('「'), body.count('」'), body.count('『'), body.count('』')))
            half = sorted(set(re.findall(r'[,;:!?"()]', body)))
            if half:
                print('WARN', tag, '有半形標點：', ' '.join(half))
            if '�' in body:
                print('BAD ', tag, '有亂碼字元')
                bad += 1
            if c.get('au'):
                for k in ('f', 'tl'):
                    if not os.path.exists(os.path.join(BOOKS, b['id'], c['au'][k])):
                        print('BAD ', tag, '說書音軌檔案不見了：', c['au'][k])
                        bad += 1
        if b.get('recaps'):
            p = os.path.join(BOOKS, b['id'], b['recaps']['f'])
            try:
                with open(p, 'rb') as f:
                    data = f.read()
                rc = json.loads(unpack(data)).get('recaps', {})
                if hashlib.sha1(data).hexdigest()[:8] != b['recaps']['v']:
                    print('BAD ', '《%s》前情提要的版本碼跟檔案不符（忘了用 recap？）' % b['title'])
                    bad += 1
                miss = [c['n'] for c in b['chapters'] if str(c['n']) not in rc]
                if miss:
                    print('WARN', '《%s》這幾章還沒寫前情提要：%s' % (b['title'], miss))
            except Exception as e:
                print('BAD ', '《%s》前情提要解不開：' % b['title'], e)
                bad += 1
        elif b['chapters']:
            print('WARN', '《%s》還沒有前情提要（shelf.py recap %s <n> 提要.txt）' % (b['title'], b['id']))
        ns = [c['n'] for c in b['chapters']]
        gaps = [n for n in range(1, max(ns + [0]) + 1) if n not in ns]
        if gaps:
            print('WARN 《%s》缺章：%s' % (b['title'], gaps))
        print('ok   《%s》 %d 章 %d 字' % (b['title'], len(ns), sum(c['chars'] for c in b['chapters'])))
    sys.exit(1 if bad else 0)


def main():
    ap = argparse.ArgumentParser(description='下回分解 書架工具')
    sp = ap.add_subparsers(dest='cmd', required=True)
    sp.add_parser('books').set_defaults(fn=cmd_books)
    p = sp.add_parser('list'); p.add_argument('book'); p.set_defaults(fn=cmd_list)
    p = sp.add_parser('new'); p.add_argument('book'); p.add_argument('--title', required=True)
    p.add_argument('--author', default='痞子葳 × Claude'); p.add_argument('--status', default='連載中')
    p.add_argument('--genre', default=''); p.add_argument('--blurb', default='')
    p.add_argument('--cloth', default='#1f3350'); p.add_argument('--seal', default=''); p.add_argument('--motif', default='plain')
    p.set_defaults(fn=cmd_new)
    p = sp.add_parser('add'); p.add_argument('book'); p.add_argument('file'); p.add_argument('--n', type=int)
    p.add_argument('--label'); p.add_argument('--name'); p.add_argument('--date'); p.set_defaults(fn=cmd_add)
    p = sp.add_parser('cat'); p.add_argument('book'); p.add_argument('n', type=int); p.set_defaults(fn=cmd_cat)
    p = sp.add_parser('rm'); p.add_argument('book'); p.add_argument('n', type=int); p.set_defaults(fn=cmd_rm)
    p = sp.add_parser('recap'); p.add_argument('book'); p.add_argument('n', type=int, nargs='?'); p.add_argument('file', nargs='?')
    p.set_defaults(fn=cmd_recap)
    p = sp.add_parser('set'); p.add_argument('book')
    for k in ('title', 'author', 'status', 'genre', 'blurb', 'cloth', 'seal', 'motif'):
        p.add_argument('--' + k)
    p.set_defaults(fn=cmd_set)
    sp.add_parser('check').set_defaults(fn=cmd_check)
    a = ap.parse_args()
    a.fn(a)


if __name__ == '__main__':
    main()
