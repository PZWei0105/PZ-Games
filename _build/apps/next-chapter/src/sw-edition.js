/* 單行本 service worker — __ED__ __VERSION__ */
const P = 'pzsb-__ED__-', V = P + '__VERSION__', DATA = P + 'data', FONTS = 'pzsb-fonts';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith(P) && k !== V && k !== DATA).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (url.origin !== location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scope)) return;
  const rel = url.pathname.slice(scope.length);
  // 這本書的目錄：先拿最新的（新的一回、改稿、完結），斷網時用上次的；被收回（404）就照實回去
  if (rel === 'book.pzx') {
    e.respondWith(fetch(req).then((r) => { if (r && r.ok) { const c = r.clone(); caches.open(DATA).then((x) => x.put('book.pzx', c)); } return r; }).catch(() => caches.open(DATA).then((x) => x.match('book.pzx')).then((hit) => hit || Response.error())));
    return;
  }
  // 章節、提要：網址帶版本碼，存下來就一直用
  if (/\.pzx$/.test(rel)) {
    e.respondWith(caches.open(DATA).then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => { if (r && r.ok) c.put(req, r.clone()); return r; }))));
    return;
  }
  // 頁面：先拿最新版，斷網時用存好的
  if (req.mode === 'navigate' || rel === '' || rel === 'index.html') {
    e.respondWith(fetch(req).then((r) => { if (r && r.ok) { const c = r.clone(); caches.open(V).then((x) => x.put('index.html', c)); } return r; }).catch(() => caches.open(V).then((x) => x.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r && r.ok) { const c = r.clone(); caches.open(V).then((x) => x.put(req, c)); } return r; })));
});
