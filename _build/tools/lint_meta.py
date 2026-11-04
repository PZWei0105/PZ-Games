#!/usr/bin/env python3
"""Check meta/<id>.json write-ups for problems before they go into the library."""
import json, glob, os, re, sys

ROOT = '/home/claude/pzgc'
BAD = [r'claude', r'artifact', r'localstorage', r'console', r'debug', r'iframe', r'webgl', r'javascript', r'\bjs\b', r'\bapi\b',
       r'開發者', r'程式碼', r'原始碼', r'設計者', r'內部', r'headless', r'playwright', r'swiftshader', r'雲端存檔']
SIMPLIFIED = '这们说话还进没为会时对过发现后样经关点开问题间实学种样达给让这'
REQ = ['goal', 'controls', 'systems', 'tips', 'shots']
TEXT_FIELDS = ['tagline', 'summary_fix', 'goal', 'playtime', 'save']


def texts(m):
    out = []
    for k in TEXT_FIELDS:
        if m.get(k):
            out.append((k, m[k]))
    for c in m.get('controls') or []:
        out.append(('controls', '%s｜%s' % (c.get('action', ''), c.get('effect', ''))))
    for s in m.get('systems') or []:
        out.append(('systems', '%s｜%s' % (s.get('name', ''), s.get('desc', ''))))
    for t in m.get('tips') or []:
        out.append(('tips', t))
    for h in m.get('highlights_fix') or []:
        out.append(('highlights_fix', h))
    for s in m.get('shots') or []:
        out.append(('caption', s.get('caption', '')))
    return out


def main():
    base = {g['id']: g for g in json.load(open(os.path.join(ROOT, 'data/catalog_base.json')))['games']}
    ids = sys.argv[1:] or sorted(base)
    for gid in ids:
        p = os.path.join(ROOT, 'meta', gid + '.json')
        if not os.path.exists(p):
            print('%-20s  (no meta yet)' % gid)
            continue
        try:
            m = json.load(open(p, encoding='utf-8'))
        except Exception as e:
            print('%-20s  !! JSON ERROR %s' % (gid, e)); continue
        probs = []
        for k in REQ:
            if not m.get(k):
                probs.append('missing ' + k)
        shots = sorted(glob.glob(os.path.join(ROOT, 'shots', gid, '[0-9][0-9].png')))
        listed = [s.get('file') for s in m.get('shots') or []]
        if len(shots) < 3:
            probs.append('only %d shots' % len(shots))
        for f in listed:
            if not os.path.exists(os.path.join(ROOT, 'shots', gid, f)):
                probs.append('listed shot missing ' + f)
        for k, t in texts(m):
            low = t.lower()
            for b in BAD:
                if re.search(b, low):
                    probs.append('%s mentions "%s": %s' % (k, b, t[:60]))
            if any(ch in SIMPLIFIED for ch in t):
                probs.append('%s simplified chars: %s' % (k, t[:50]))
            if k == 'caption' and len(t) > 14:
                probs.append('caption long (%d): %s' % (len(t), t))
            if k == 'tips' and len(t) > 90:
                probs.append('tip long (%d)' % len(t))
            if k == 'goal' and len(t) > 140:
                probs.append('goal long (%d)' % len(t))
        if len(m.get('controls') or []) > 7:
            probs.append('%d controls rows' % len(m['controls']))
        if m.get('issues'):
            probs.append('ISSUES: ' + m['issues'][:160])
        vp = m.get('viewport')
        print('%-20s  %s  shots=%d vp=%s ori=%s dev=%s%s' % (gid, 'OK ' if not probs else '!! ', len(shots), vp, m.get('orientation'), m.get('device'),
                                                       ''.join('\n      - ' + x for x in probs)))


if __name__ == '__main__':
    main()
