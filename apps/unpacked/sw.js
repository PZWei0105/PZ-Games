/* 解包 UNPACKED service worker — version 1.0.2611202146
   App 本體：先拿網路上最新的，斷線才用存好的。
   資料（data/）：一律先問網路；斷線時用上次成功拿到的那一份（照網址路徑存，不管 ?t= 參數）。 */
const V = 'unpacked-1.0.2611202146';
const DATA_CACHE = 'unpacked-data-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('unpacked-') && k !== V && k !== DATA_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scope)) return;
  const rel = url.pathname.slice(scope.length);
  if (rel === 'ver.json') return;   // 換新版的檢查：直接問網路、不存
  if (rel.startsWith('data/')) {
    const key = new Request(url.origin + url.pathname);
    e.respondWith(fetch(req).then((r) => { if (r && r.ok) { const c = r.clone(); caches.open(DATA_CACHE).then((x) => x.put(key, c)); } return r; })
      .catch(() => caches.open(DATA_CACHE).then((x) => x.match(key)).then((m) => m || new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } }))));
    return;
  }
  if (req.mode === 'navigate' || rel === '' || rel === 'index.html') {
    // App 本體不吃瀏覽器的 10 分鐘快取（GitHub Pages），每次都跟網站確認是不是最新的
    e.respondWith(fetch(req, { cache: 'no-cache' }).then((r) => { if (r && r.ok) { const c = r.clone(); caches.open(V).then((x) => x.put('index.html', c)); } return r; }).catch(() => caches.open(V).then((x) => x.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r && r.ok) { const c = r.clone(); caches.open(V).then((x) => x.put(req, c)); } return r; })));
});
