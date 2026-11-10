/* 下回分解 service worker — version __VERSION__ */
const V = 'pznc-__VERSION__', BOOKS = 'pznc-books-v1', FONTS = 'pznc-fonts-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('pznc-') && k !== V && k !== BOOKS && k !== FONTS).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  // 字型：存一份，離線也是原本的字
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
  // 說書音軌很大、要能拖進度條：交給瀏覽器自己處理，不經過這裡
  if (/\.(mp3|m4a|ogg|opus|wav)$/i.test(rel)) return;
  // 書架目錄：先拿最新的，斷網時用上次的
  if (rel === 'books/library.json') {
    e.respondWith(fetch(req).then((r) => { if (r && r.ok) { const c = r.clone(); caches.open(BOOKS).then((x) => x.put('books/library.json', c)); } return r; }).catch(() => caches.open(BOOKS).then((x) => x.match('books/library.json')).then((hit) => hit || Response.error())));
    return;
  }
  // 章節與時間軸：網址帶版本碼，內容不會變，存下來就一直用
  if (rel.startsWith('books/')) {
    e.respondWith(caches.open(BOOKS).then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => { if (r && r.ok) c.put(req, r.clone()); return r; }))));
    return;
  }
  // 頁面：先拿最新版，斷網時用存好的
  if (req.mode === 'navigate' || rel === '' || rel === 'index.html') {
    e.respondWith(fetch(req).then((r) => { if (r && r.ok) { const c = r.clone(); caches.open(V).then((x) => x.put('index.html', c)); } return r; }).catch(() => caches.open(V).then((x) => x.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r && r.ok) { const c = r.clone(); caches.open(V).then((x) => x.put(req, c)); } return r; })));
});
