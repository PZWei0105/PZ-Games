/* PZ 遊戲收藏 service worker — version db1a0a89037e */
const V = 'db1a0a89037e';
const SHELL = 'pzgc-shell-' + V, MEDIA = 'pzgc-media-v1', GAMES = 'pzgc-games-v1', FONTS = 'pzgc-fonts-v1';
const SHELL_FILES = ['./', 'index.html', 'app.css?v=db1a0a89037e', 'app.js?v=db1a0a89037e', 'hub.js?v=037e0d20', 'catalog.json', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/apple-touch-icon.png', 'icons/favicon.svg'];
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
// game pages: the newest version if the network answers quickly, otherwise the saved copy right away
// (a slow phone connection shouldn't keep a game you have played before from starting); the download
// still finishes in the background so the next launch has it
const netQuick = (e, req, cacheName, ms) => {
  const work = (async () => {
    const c = await caches.open(cacheName);
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((r) => { if (r && r.ok) return c.put(req, r.clone()).then(() => r); return r; });
    e.waitUntil(net.catch(() => {}));
    if (!hit) return net;
    return Promise.race([net.then((r) => (r && r.ok ? r : hit)).catch(() => hit), new Promise((res) => setTimeout(() => res(hit), ms))]);
  })();
  return work;
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
    // game pages: newest version when the network is quick, the saved copy when it is slow or offline
    if (rel.startsWith('games/')) return e.respondWith(/(\.html?|\/)$/i.test(rel) ? netQuick(e, req, GAMES, 2500) : swr(req, GAMES));
    return e.respondWith(netFirst(req, SHELL));
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdn.jsdelivr.net') {
    return e.respondWith(cacheFirst(req, FONTS));
  }
});
