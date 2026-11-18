/* 補番 BINGE — 離線外殼：App 本體 network-first（2.5 秒等不到就先用存好的）、片庫 network-first（斷線時用上一份） */
const CACHE = 'binge-1.2.0';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const DATA = /^https:\/\/raw\.githubusercontent\.com\/PZWei0105\/PZ-Games\/(binge-data|main\/apps\/binge\/data)\//;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('binge-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (DATA.test(req.url)) {
    // 片庫：網址上的 ?t= 只是為了不吃舊快取，存的時候拿掉
    const key = url.origin + url.pathname;
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); }
      return r;
    }).catch(() => caches.match(key).then((m) => m || Response.error())));
    return;
  }
  if (url.origin !== location.origin) return;
  if (!url.pathname.includes('/apps/binge/')) return;
  e.respondWith(Promise.race([fetch(req).then((r) => {
    if (r.ok && (req.mode === 'navigate' || SHELL.some((s) => url.pathname.endsWith(s.replace('./', '/'))))) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? './index.html' : req, copy)); }
    return r;
  }), timeout(2500)]).catch(() => caches.match(req.mode === 'navigate' ? './index.html' : req).then((m) => m || fetch(req))));
});
