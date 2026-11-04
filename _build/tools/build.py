#!/usr/bin/env python3
"""
build.py — assemble 《PZ遊戲收藏》 into a deployable site.

  python3 tools/build.py [--out /home/claude/pz-games] [--mode web|claude] [--skip-games] [--only id,id]

Inputs (all under /home/claude/pzgc):
  data/catalog_base.json   games / archive / apps, written by hand
  data/overrides.json      optional per-game tweaks (heroShot, coverShot, focus, captions …)
  meta/<id>.json           how-to-play metadata from the research pass
  shots/<id>/0N.png        real screenshots (01 = title screen)
  raw/<build>/             the game builds themselves
  src/                     index.html, app.css, app.js
Outputs (into --out): index.html app.css app.js catalog.json sw.js manifest.webmanifest icons/ media/ games/ README.md
"""
import argparse, glob, hashlib, json, os, re, shutil, subprocess, sys, time
from datetime import datetime, timezone, timedelta

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.environ.get('PZ_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TZ = timezone(timedelta(hours=8))


def log(*a):
    print('[build]', *a, flush=True)


def load_json(p, d=None):
    try:
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return d
    except json.JSONDecodeError as e:
        log('!! bad json', p, e)
        return d


# ───────────── image helpers ─────────────
def energy_map(img):
    w, h = img.size
    sw, sh = max(8, w // 6), max(8, h // 6)
    a = np.asarray(img.convert('RGB').resize((sw, sh), Image.BILINEAR)).astype(np.float32) / 255.0
    gray = a.mean(axis=2)
    gx = np.abs(np.diff(gray, axis=1, append=gray[:, -1:]))
    gy = np.abs(np.diff(gray, axis=0, append=gray[-1:, :]))
    edge = gx + gy
    sat = a.max(axis=2) - a.min(axis=2)
    e = edge * 1.0 + sat * 0.18 + gray * 0.08
    # mild centre bias so empty frames fall back to the middle
    yy, xx = np.mgrid[0:sh, 0:sw]
    cb = np.exp(-(((xx - sw / 2) / (sw * 0.6)) ** 2 + ((yy - sh * 0.45) / (sh * 0.6)) ** 2))
    return e * (0.65 + 0.35 * cb)


def best_window(img, aspect):
    """Return (left, top, width, height) in image pixels of the most interesting window with width/height = aspect."""
    W, H = img.size
    if W / H > aspect:
        wh, ww = H, int(round(H * aspect))
    else:
        ww, wh = W, int(round(W / aspect))
    e = energy_map(img)
    sh, sw = e.shape
    kx, ky = W / sw, H / sh
    bw, bh = max(1, int(round(ww / kx))), max(1, int(round(wh / ky)))
    ii = np.zeros((sh + 1, sw + 1), dtype=np.float64)
    ii[1:, 1:] = e.cumsum(0).cumsum(1)
    best, bx, by = -1, 0, 0
    for y in range(0, sh - bh + 1):
        for x in range(0, sw - bw + 1):
            s = ii[y + bh, x + bw] - ii[y, x + bw] - ii[y + bh, x] + ii[y, x]
            if s > best:
                best, bx, by = s, x, y
    left = int(round(bx * kx)); top = int(round(by * ky))
    left = max(0, min(W - ww, left)); top = max(0, min(H - wh, top))
    return left, top, ww, wh


def object_position(img, aspect, focus=None):
    """CSS object-position (x%, y%) for showing this image with object-fit:cover in a box of the given aspect."""
    W, H = img.size
    if focus:
        cx, cy = focus[0] / 100.0, focus[1] / 100.0
        if W / H > aspect:
            s = (H * aspect) / W
            px = 50 if s >= 1 else (cx - s / 2) / (1 - s) * 100
            return [round(max(0, min(100, px)), 1), 50]
        s = (W / aspect) / H
        py = 50 if s >= 1 else (cy - s / 2) / (1 - s) * 100
        return [50, round(max(0, min(100, py)), 1)]
    l, t, ww, wh = best_window(img, aspect)
    px = 50 if W == ww else l / (W - ww) * 100
    py = 50 if H == wh else t / (H - wh) * 100
    return [round(px, 1), round(py, 1)]


def save_webp(img, path, max_w=None, max_h=None, q=80):
    im = img.convert('RGB')
    if max_w and im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    if max_h and im.height > max_h:
        im = im.resize((round(im.width * max_h / im.height), max_h), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'WEBP', quality=q, method=6)
    return im.size


def _rounded(im, r):
    m = Image.new('L', im.size, 0)
    from PIL import ImageDraw
    ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    im = im.convert('RGBA'); im.putalpha(m)
    return im


def _phone(path, h):
    """Screenshot as a framed phone screen: rounded, thin light rim."""
    from PIL import ImageDraw
    im = Image.open(path).convert('RGB')
    w = round(im.width * h / im.height)
    im = im.resize((w, h), Image.LANCZOS)
    r = max(10, h // 22)
    rim = Image.new('RGBA', (w + 6, h + 6), (0, 0, 0, 0))
    ImageDraw.Draw(rim).rounded_rectangle((0, 0, w + 5, h + 5), r + 3, fill=(255, 255, 255, 46))
    rim.alpha_composite(_rounded(im, r), (3, 3))
    return rim


def _shadow(size, box, r, blur=18, alpha=150):
    from PIL import ImageDraw
    s = Image.new('RGBA', size, (0, 0, 0, 0))
    ImageDraw.Draw(s).rounded_rectangle(box, r, fill=(0, 0, 0, alpha))
    return s.filter(ImageFilter.GaussianBlur(blur))


def wide_composite(paths, out_path, W=720, H=405):
    """16:9 key art for portrait games: blurred backdrop + two phone screens on the right, left side kept dark for text."""
    bg = Image.open(paths[0]).convert('RGB')
    s = max(W / bg.width, H / bg.height) * 1.15
    bg = bg.resize((round(bg.width * s), round(bg.height * s)), Image.LANCZOS)
    l = (bg.width - W) // 2; t = int((bg.height - H) * 0.4)
    bg = bg.crop((l, t, l + W, t + H)).filter(ImageFilter.GaussianBlur(22))
    arr = np.asarray(bg).astype(np.float32)
    xs = np.linspace(0, 1, W)[None, :, None]
    ys = np.linspace(0, 1, H)[:, None, None]
    shade = 0.40 + 0.30 * xs  # darker on the left where the title sits
    shade = shade * (1 - 0.40 * ys ** 2)
    g = arr.mean(axis=2, keepdims=True)
    arr = (g + (arr - g) * 1.35) * shade
    canvas = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert('RGBA')
    front = _phone(paths[0], int(H * 0.92))
    back = _phone(paths[1] if len(paths) > 1 else paths[0], int(H * 0.78))
    # dim the back phone a little
    bk = np.asarray(back).astype(np.float32); bk[..., :3] *= 0.62
    back = Image.fromarray(bk.astype(np.uint8), 'RGBA')
    fx = W - front.width - int(W * 0.07); fy = (H - front.height) // 2 + 6
    bx = fx - int(back.width * 0.62); by = (H - back.height) // 2 + 14
    canvas.alpha_composite(_shadow((W, H), (bx + 6, by + 14, bx + back.width + 6, by + back.height + 14), 20, 16, 140))
    canvas.alpha_composite(back, (bx, by))
    canvas.alpha_composite(_shadow((W, H), (fx + 8, fy + 18, fx + front.width + 8, fy + front.height + 18), 24, 20, 170))
    canvas.alpha_composite(front, (fx, fy))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.convert('RGB').save(out_path, 'WEBP', quality=82, method=6)


def file_hash(path):
    h = hashlib.sha1()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()[:10]


def build_media(g, out, ov):
    gid = g['id']
    sdir = os.path.join(os.environ.get('SHOTS_DIR', os.path.join(ROOT, 'shots')), gid)
    files = sorted(f for f in glob.glob(os.path.join(sdir, '[0-9][0-9].png')))
    if not files:
        return None
    meta = g.get('_meta') or {}
    vp = meta.get('viewport') or ''
    first = Image.open(files[0])
    if vp in ('phone', 'p'):
        orient = 'p'
    elif vp in ('land', 'l'):
        orient = 'l'
    elif vp in ('desk', 'd'):
        orient = 'd'
    else:
        orient = 'p' if first.height > first.width else ('l' if first.width / first.height > 1.9 else 'd')
    mdir = os.path.join(out, 'media', gid)
    if os.path.isdir(mdir):
        shutil.rmtree(mdir)
    caps = {s.get('file'): s.get('caption', '') for s in (meta.get('shots') or []) if isinstance(s, dict)}
    caps.update(ov.get('captions', {}))
    order = ov.get('order')
    if order:
        files = [os.path.join(sdir, f) for f in order if os.path.exists(os.path.join(sdir, f))] + [f for f in files if os.path.basename(f) not in order]
    drop = set(ov.get('drop', []))
    files = [f for f in files if os.path.basename(f) not in drop]
    shots = []
    for i, f in enumerate(files, 1):
        im = Image.open(f)
        if orient == 'p':
            size = save_webp(im, os.path.join(mdir, 's%d.webp' % i), max_w=720, q=80)
        else:
            size = save_webp(im, os.path.join(mdir, 's%d.webp' % i), max_w=1600, q=80)
        src = 'media/%s/s%d.webp' % (gid, i)
        shots.append({'src': src + '?v=' + file_hash(os.path.join(out, src)), 'w': size[0], 'h': size[1], 'cap': caps.get(os.path.basename(f), '')})
    hero_name = ov.get('heroShot') or os.path.basename(files[1 if len(files) > 1 else 0])
    hero_path = os.path.join(sdir, hero_name) if os.path.exists(os.path.join(sdir, hero_name)) else files[0]
    hero_ix = [os.path.basename(f) for f in files].index(os.path.basename(hero_path)) if os.path.basename(hero_path) in [os.path.basename(f) for f in files] else 0
    hero_img = Image.open(hero_path)
    hero_src = shots[hero_ix]['src'] if hero_ix < len(shots) else shots[0]['src']
    hero_aspect = 0.6 if orient == 'p' else 1.75
    hero_focus = object_position(hero_img, hero_aspect, ov.get('heroFocus'))
    if orient == 'p' and not ov.get('heroFocus'):
        # phone screenshots carry the game's HUD along the top edge: sit the crop a little low so it slides under the app's own bar
        hero_focus = [50, 60]
    # cover: 2:3 window of the cover shot
    cov_name = ov.get('coverShot') or os.path.basename(files[0])
    cov_img = Image.open(os.path.join(sdir, cov_name) if os.path.exists(os.path.join(sdir, cov_name)) else files[0]).convert('RGB')
    if ov.get('coverFocus'):
        fx, fy = ov['coverFocus']
        W, H = cov_img.size
        if W / H > 2 / 3:
            ww, wh = int(H * 2 / 3), H
        else:
            ww, wh = W, int(W * 1.5)
        l = int(max(0, min(W - ww, fx / 100 * W - ww / 2))); t = int(max(0, min(H - wh, fy / 100 * H - wh / 2)))
    else:
        l, t, ww, wh = best_window(cov_img, 2 / 3)
    cov = cov_img.crop((l, t, l + ww, t + wh)).resize((420, 630), Image.LANCZOS)
    save_webp(cov, os.path.join(mdir, 'cover.webp'), q=82)
    blur = cov_img.resize((36, 54), Image.BILINEAR).filter(ImageFilter.GaussianBlur(1.2))
    save_webp(blur, os.path.join(mdir, 'blur.webp'), q=70)
    alts = {}  # alt-<build>.png title shots are kept as reference only; the app doesn't show them
    v = lambda p: p + '?v=' + file_hash(os.path.join(out, p))
    wide_ix = 2 if len(files) > 2 else (1 if len(files) > 1 else 0)
    wide_name = ov.get('wideShot') or os.path.basename(files[wide_ix])
    wpath = os.path.join(sdir, wide_name) if os.path.exists(os.path.join(sdir, wide_name)) else files[wide_ix]
    wnames = [os.path.basename(f) for f in files]
    wide_src = shots[wnames.index(os.path.basename(wpath))]['src'] if os.path.basename(wpath) in wnames else shots[0]['src']
    wide_focus = object_position(Image.open(wpath), 16 / 9, ov.get('wideFocus'))
    if orient == 'p' and not ov.get('wideCrop'):
        # portrait screens make poor 16:9 strips — compose framed phone screens instead
        pair = [hero_path, wpath] if os.path.basename(wpath) != os.path.basename(hero_path) else [hero_path, files[0]]
        if ov.get('widePair'):
            pair = [os.path.join(sdir, n) for n in ov['widePair']]
        wide_composite(pair, os.path.join(mdir, 'wide.webp'))
        wide_src = v('media/%s/wide.webp' % gid)
        wide_focus = [50, 50]
    return {
        'wide': wide_src,
        'wideFocus': wide_focus,
        'orient': orient,
        'cover': v('media/%s/cover.webp' % gid),
        'blur': v('media/%s/blur.webp' % gid),
        'hero': hero_src,
        'heroFocus': hero_focus,
        'shots': shots,
        'alts': {k: v(p) for k, p in alts.items()},
    }


# ───────────── icons ─────────────
ICON_SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#18204a"/><stop offset=".55" stop-color="#0a0d1e"/><stop offset="1" stop-color="#04050a"/></linearGradient>
<radialGradient id="glow" cx=".47" cy=".48" r=".5"><stop offset="0" stop-color="#8fd3ff" stop-opacity=".55"/><stop offset=".55" stop-color="#5a7cff" stop-opacity=".16"/><stop offset="1" stop-color="#5a7cff" stop-opacity="0"/></radialGradient>
<linearGradient id="ln" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe7a8"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#8fd3ff"/></linearGradient>
<filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
</defs>
<rect width="512" height="512" rx="__RX__" fill="url(#bg)"/>
<circle cx="250" cy="256" r="230" fill="url(#glow)"/>
<path d="M200 150 372 256 200 362z" fill="none" stroke="#8fd3ff" stroke-width="34" stroke-linejoin="round" opacity=".55" filter="url(#b)"/>
<path d="M200 150 372 256 200 362z" fill="none" stroke="url(#ln)" stroke-width="26" stroke-linejoin="round"/>
<path d="M226 206 300 256 226 306z" fill="#ffffff" opacity=".12"/>
</svg>'''


def build_icons(out):
    idir = os.path.join(out, 'icons')
    os.makedirs(idir, exist_ok=True)
    fav = ICON_SVG.replace('__RX__', '112')
    open(os.path.join(idir, 'favicon.svg'), 'w', encoding='utf-8').write(fav)
    from playwright.sync_api import sync_playwright
    jobs = [('icon-512.png', 512, '112'), ('icon-192.png', 192, '112'), ('apple-touch-icon.png', 180, '0'), ('maskable-512.png', 512, '0')]
    with sync_playwright() as p:
        br = p.chromium.launch()
        for name, size, rx in jobs:
            svg = ICON_SVG.replace('__RX__', rx)
            if name.startswith('maskable'):
                svg = svg.replace('viewBox="0 0 512 512"', 'viewBox="-64 -64 640 640"').replace('<rect width="512" height="512"', '<rect x="-64" y="-64" width="640" height="640"')
            pg = br.new_page(viewport={'width': size, 'height': size})
            pg.set_content('<html><body style="margin:0;background:transparent">%s</body></html>' % svg.replace('<svg ', '<svg width="%d" height="%d" ' % (size, size)))
            pg.screenshot(path=os.path.join(idir, name), omit_background=(rx != '0'))
            pg.close()
        br.close()


SW_JS = r"""/* PZ 遊戲收藏 service worker — version __VERSION__ */
const V = '__VERSION__';
const SHELL = 'pzgc-shell-' + V, MEDIA = 'pzgc-media-v1', GAMES = 'pzgc-games-v1', FONTS = 'pzgc-fonts-v1';
const SHELL_FILES = ['./', 'index.html', 'app.css?v=__VERSION__', 'app.js?v=__VERSION__', 'catalog.json', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/apple-touch-icon.png', 'icons/favicon.svg'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('pzgc-shell-') && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const netFirst = async (req, cacheName) => {
  const c = await caches.open(cacheName);
  try {
    const r = await fetch(req);
    if (r && r.ok) c.put(req, r.clone());
    return r;
  } catch (e) {
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    throw e;
  }
};
const cacheFirst = async (req, cacheName) => {
  const c = await caches.open(cacheName);
  const hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
  return r;
};
const swr = async (req, cacheName) => {
  const c = await caches.open(cacheName);
  const hit = await c.match(req);
  const net = fetch(req).then((r) => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
  return hit || net;
};
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    const scope = new URL(self.registration.scope).pathname;
    if (!url.pathname.startsWith(scope)) return;
    const rel = url.pathname.slice(scope.length);
    if (/\.(mp4|mp3|m4a|ogg|wav|webm)$/i.test(rel)) return;
    if (rel.startsWith('media/')) return e.respondWith(cacheFirst(req, MEDIA));
    // game pages: always try for the newest version (a cheap 304 when unchanged), fall back to the cached copy offline
    if (rel.startsWith('games/')) return e.respondWith(/(\.html?|\/)$/i.test(rel) ? netFirst(req, GAMES) : swr(req, GAMES));
    return e.respondWith(netFirst(req, SHELL));
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdn.jsdelivr.net') {
    return e.respondWith(cacheFirst(req, FONTS));
  }
});
"""

README = """# PZ 遊戲收藏

痞子葳和 Claude 一起做的遊戲收藏庫：__COUNT__ 款遊戲、__APPS__ 個專屬 App，像 Steam 一樣一鍵開玩。

**網址：https://pzwei0105.github.io/PZ-Games/**

- iPhone：用 Safari 打開 →「分享」→「加入主畫面」，之後從主畫面點開就是獨立 App。
- Android：用 Chrome 打開 → 右上角選單 →「加到主畫面」或「安裝應用程式」。
- 電腦：Chrome／Edge 網址列右側的「安裝」圖示，可以裝成桌面 App。

## 裡面有什麼

- `index.html`、`app.css`、`app.js`：收藏庫本體（首頁、全部遊戲、專屬 App、遊戲介紹、預告、命運轉盤、遊戲啟動器）
- `catalog.json`：每款遊戲的資料（簡介、怎麼玩、截圖、版本）
- `games/<遊戲>/`：每款遊戲的獨立網頁版，收藏庫直接在 App 裡全螢幕開啟
- `media/<遊戲>/`：截圖、封面、主視覺
- `sw.js`、`manifest.webmanifest`、`icons/`：讓它能加到主畫面、玩過的遊戲離線也能開
- `_build/`：製作工具與原始資料（給 Claude 用的，見 `_build/README.md`）

## 新遊戲怎麼入庫

做好新遊戲後，跟 Claude 說「把《遊戲名》放進 PZ 遊戲收藏」。Claude 會照 `_build/README.md` 的步驟：實際玩過、拍預覽、寫遊玩說明、重新組好網站再推上來。重新打開收藏庫就會跳出「新遊戲入庫」。

最後更新：__DATE__
"""


def export_pipeline(out):
    """Copy the source data + tools into <out>/_build so a future session can rebuild from the repo alone."""
    dst = os.path.join(out, '_build')
    if os.path.abspath(dst) == os.path.abspath(ROOT):
        return  # already running from the repo copy
    for sub in ('data', 'meta', 'src'):
        d = os.path.join(dst, sub)
        if os.path.isdir(d):
            shutil.rmtree(d)
        shutil.copytree(os.path.join(ROOT, sub), d)
    os.makedirs(os.path.join(dst, 'tools'), exist_ok=True)
    for f in ('build.py', 'shoot.py', 'lint_meta.py', 'preview_media.py', 'deploy.sh'):
        shutil.copy2(os.path.join(ROOT, 'tools', f), os.path.join(dst, 'tools', f))
    if os.path.exists(os.path.join(ROOT, 'BUILD_README.md')):
        shutil.copy2(os.path.join(ROOT, 'BUILD_README.md'), os.path.join(dst, 'README.md'))
    open(os.path.join(dst, '.gitignore'), 'w').write('shots/\nraw/\nwork/\ntools/fonts/\ntools/vendor/\n__pycache__/\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='/home/claude/pz-games')
    ap.add_argument('--mode', default='web', choices=['web', 'claude'])
    ap.add_argument('--skip-games', action='store_true')
    ap.add_argument('--skip-icons', action='store_true')
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    out = a.out
    os.makedirs(out, exist_ok=True)
    base = load_json(os.path.join(ROOT, 'data/catalog_base.json'))
    overrides = load_json(os.path.join(ROOT, 'data/overrides.json'), {}) or {}
    only = set(x for x in a.only.split(',') if x)
    # media from the previous build is reused for games whose screenshots aren't on this machine
    prev = load_json(os.path.join(out, 'catalog.json'), {}) or {}
    prev_media = {g['id']: g.get('media') for g in prev.get('games', []) if g.get('media')}
    games = []
    for g in base['games']:
        g = json.loads(json.dumps(g))
        meta = load_json(os.path.join(ROOT, 'meta', g['id'] + '.json'), {}) or {}
        g['_meta'] = meta
        ov = overrides.get(g['id'], {})
        if meta.get('tagline'):
            g['tagline'] = meta['tagline'] if not g.get('tagline') or ov.get('useMetaTagline') else g['tagline']
        if meta.get('summary_fix'):
            g['summary'] = meta['summary_fix']
        if meta.get('highlights_fix'):
            g['highlights'] = meta['highlights_fix']
        for k in ('tagline', 'summary', 'highlights', 'en', 'verdict', 'next'):
            if k in ov:
                g[k] = ov[k]
        how = {}
        for k in ('goal', 'controls', 'systems', 'tips', 'playtime', 'save', 'input', 'device', 'orientation'):
            if meta.get(k):
                how[k] = meta[k]
        if ov.get('how'):
            how.update(ov['how'])
        g['how'] = how
        media = build_media(g, out, ov) if (not only or g['id'] in only) else None
        if not media and prev_media.get(g['id']):
            pm = prev_media[g['id']]
            if os.path.exists(os.path.join(out, pm.get('cover', '').split('?')[0])):
                media = pm
        if media:
            g['media'] = media
        if g.get('pick'):
            g['pick'] = True
        g.pop('_meta', None)
        # copy builds
        for b in g['builds']:
            b['path'] = 'games/%s/index.html' % b['id']
            if not a.skip_games:
                src = os.path.join(ROOT, 'raw', b['id'])
                dst = os.path.join(out, 'games', b['id'])
                if a.mode == 'web':
                    if not os.path.isdir(src):
                        if not os.path.exists(os.path.join(dst, 'index.html')):
                            log('!! missing build', b['id'])
                        continue
                    if os.path.isdir(dst):
                        shutil.rmtree(dst)
                    shutil.copytree(src, dst)
        games.append(g)
        log('game', g['id'], 'media' if g.get('media') else 'NO MEDIA', 'how' if g['how'] else 'NO HOW')
    pal = {
        'pizixiuxian': ['#3a2a5a', '#0e0a18', '#c9a6ff'], 'feitu': ['#4a3a22', '#120d07', '#e8a33a'], 'xueyue': ['#4a0e14', '#120305', '#ff3b4e'],
        'wuxia-text': ['#4a2a2a', '#140a0a', '#ffb46a'], 'zishi': ['#26201c', '#0a0807', '#c8a14a'], 'fuanli': ['#3a4a2a', '#0e1408', '#ffd06a'],
        'yanyu': ['#2f4a4a', '#0a1414', '#bfe3d8'], 'startup-monopoly': ['#1d3a6a', '#08101f', '#4dd0ff'], 'jieming': ['#2a1a3a', '#0a0610', '#e8d27a'],
        'jinjie': ['#4a1f10', '#140704', '#ff7a3a'], 'chaojie2': ['#0a3a4a', '#02121a', '#5ef0d0'], 'one-night': ['#1a2a3a', '#060a10', '#ff5a6a'],
        'grid-duel': ['#1f3550', '#070b12', '#8fd0ff'], 'mecha-defense': ['#2a2f3a', '#0a0c10', '#ff9a3c'],
    }
    archive = []
    for x in base['archive']:
        x = dict(x); x['palette'] = pal.get(x['id'], ['#2a2d3a', '#0a0b10', '#c9cedd']); archive.append(x)
    apps = []
    for x in base['apps']:
        x = dict(x); x['type'] = x.pop('kind'); apps.append(x)
    now = datetime.now(TZ)
    ver = now.strftime('%Y.%m.%d-%H%M')
    cat = {'version': ver, 'updated': now.strftime('%Y-%m-%d'), 'genres': base['genres'], 'games': games, 'archive': archive, 'apps': apps}
    cat_json = json.dumps(cat, ensure_ascii=False, separators=(',', ':'))
    if a.mode == 'claude':
        # artifact files are served by plain relative path: drop cache-busting queries
        cat_json = re.sub(r'(media/[^"?]+)\?v=[0-9a-f]+', r'\1', cat_json)
    open(os.path.join(out, 'catalog.json'), 'w', encoding='utf-8').write(cat_json)
    # shell
    src = os.path.join(ROOT, 'src')
    css = open(os.path.join(src, 'app.css'), encoding='utf-8').read()
    js = open(os.path.join(src, 'app.js'), encoding='utf-8').read()
    shell_v = hashlib.sha1((css + js + cat_json).encode('utf-8')).hexdigest()[:8]
    version = ver + '-' + shell_v
    html = open(os.path.join(src, 'index.html'), encoding='utf-8').read().replace('__V__', shell_v)
    if a.mode == 'claude':
        html = html.replace('?v=' + shell_v, '')
    if a.mode == 'web':
        html = html.replace('<!--MANIFEST-->', '<link rel="manifest" href="manifest.webmanifest">').replace('<!--MODE-->', '')
    else:
        inline = '<script>window.PZ_MODE="claude";window.PZ_CATALOG=%s;</script>' % cat_json.replace('</', '<\\/')
        html = html.replace('<!--MANIFEST-->', '').replace('<!--MODE-->', inline)
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(html)
    open(os.path.join(out, 'app.css'), 'w', encoding='utf-8').write(css)
    open(os.path.join(out, 'app.js'), 'w', encoding='utf-8').write(js)
    if a.mode == 'web':
        open(os.path.join(out, 'sw.js'), 'w', encoding='utf-8').write(SW_JS.replace('__VERSION__', shell_v))
        manifest = {
            'name': 'PZ 遊戲收藏', 'short_name': '遊戲收藏', 'description': '痞子葳和 Claude 一起做的所有遊戲，點開就能玩。',
            'lang': 'zh-Hant-TW', 'start_url': './', 'scope': './', 'display': 'standalone', 'orientation': 'any',
            'background_color': '#05060c', 'theme_color': '#05060c',
            'icons': [
                {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
                {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
                {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
            ],
        }
        open(os.path.join(out, 'manifest.webmanifest'), 'w', encoding='utf-8').write(json.dumps(manifest, ensure_ascii=False, indent=1))
        open(os.path.join(out, 'README.md'), 'w', encoding='utf-8').write(README.replace('__DATE__', now.strftime('%Y-%m-%d %H:%M')).replace('__COUNT__', str(len(games))).replace('__APPS__', str(len(apps))))
        open(os.path.join(out, '.nojekyll'), 'w').write('')
        export_pipeline(out)
    if not a.skip_icons:
        build_icons(out)
    log('done', version, '->', out, '| games', len(games), '| with media', sum(1 for g in games if g.get('media')), '| with how', sum(1 for g in games if g.get('how')))


if __name__ == '__main__':
    main()
