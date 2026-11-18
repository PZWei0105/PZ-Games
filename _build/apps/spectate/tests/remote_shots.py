#!/usr/bin/env python3
"""觀戰 SPECTATE — 在 GitHub Actions 上對「已上線的網站」截圖（真的縮圖、真的 YouTube 播放器、真的資料）。

由 .github/workflows/spectate-shots.yml 手動觸發，截圖推到 spectate-shots 分支（只留最新一版）。
  python3 remote_shots.py --url https://pzwei0105.github.io/PZ-Games/apps/spectate/ --out /tmp/shots
"""
import argparse, json, os, time


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', required=True)
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    from playwright.sync_api import sync_playwright
    logs = []
    base = a.url.rstrip('/') + '/?skip=1&v=' + str(int(time.time()))
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        for name, opt in (('phone', dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='zh-TW')),
                          ('desk', dict(viewport={'width': 1440, 'height': 900}, device_scale_factor=1, locale='zh-TW'))):
            ctx = b.new_context(**opt)
            pg = ctx.new_page()
            pg.on('console', lambda m, n=name: logs.append('%s %s: %s' % (n, m.type, m.text[:300])) if m.type in ('error', 'warning') else None)
            pg.on('pageerror', lambda e, n=name: logs.append('%s pageerror: %s' % (n, e)))

            def shot(tag, full=False):
                pg.screenshot(path=os.path.join(a.out, '%s-%s.png' % (name, tag)), full_page=full)

            def go(h, wait=2500):
                pg.evaluate("h => { location.hash = h; scrollTo(0,0); }", h)
                pg.wait_for_timeout(wait)
            pg.goto(base, wait_until='domcontentloaded')
            pg.wait_for_timeout(7000)
            shot('01-home')
            pg.mouse.wheel(0, 1000)
            pg.wait_for_timeout(2500)
            shot('02-home-scroll')
            pg.evaluate('scrollTo(0,0)')
            for tag, h in (('03-live', 'live'), ('04-games', 'games'), ('06-rookies', 'rookies'), ('07-me', 'me'), ('08-trailers', 'list/trailer'), ('09-pick', 'pick')):
                go(h)
                shot(tag)
            go('games')
            first = pg.evaluate("() => { const a = document.querySelector('.gt'); return a ? a.getAttribute('href') : null }")
            if first:
                go(first.lstrip('#'), 3500)
                shot('05-game')
            go('home', 3000)
            try:
                pg.click('.hero .go-btn', timeout=5000)
                pg.wait_for_timeout(9000)
                shot('10-player')
            except Exception as e:  # noqa: BLE001
                logs.append('%s player: %s' % (name, e))
            ctx.close()
        b.close()
    with open(os.path.join(a.out, 'log.json'), 'w', encoding='utf-8') as f:
        json.dump(logs, f, ensure_ascii=False, indent=1)
    print('\n'.join(logs[-60:]))


if __name__ == '__main__':
    main()
