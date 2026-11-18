/* 轉機 TURNAROUND — 離線：外殼和資料先問網路（拿最新航班），圖片先用存好的 */
const C = 'turnaround-1.0.202611182129';
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest'])).catch(() => {}));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('turnaround-') && k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== location.origin) return;
  if (u.pathname.endsWith('/ver.json')) return;   // 換新版的檢查：直接問網路、不存
  if (/\.(webp|png|jpg|jpeg)$/i.test(u.pathname)) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(C).then((c) => c.put(req, cp)); } return res; })));
    return;
  }
  // App 本體不吃瀏覽器的 10 分鐘快取（GitHub Pages），每次都跟網站確認是不是最新的
  const shell = req.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname);
  e.respondWith(fetch(req, shell ? { cache: 'no-cache' } : undefined).then((res) => {
    if (res.ok) { const cp = res.clone(); caches.open(C).then((c) => c.put(req, cp)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))));
});
