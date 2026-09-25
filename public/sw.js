/* Cache only this public, versioned offline shell. Never cache authenticated HTML,
   RSC, API responses, receipts, login pages or mutations. */
const CACHE = 'parking-public-offline-v2';
const ASSETS = ['/offline.html', '/offline.css', '/offline.js', '/offline-vault.js', '/icon-192.png', '/icon-512.png', '/offline-stay-pricing.js', '/offline-pricing.js', '/offline-pricing.types.js', '/offline-errors.js', '/offline-dayjs-module.js', '/offline-utc-module.js', '/offline-timezone-module.js', '/offline-dayjs-vendor.js', '/offline-utc-vendor.js', '/offline-timezone-vendor.js'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('parking-public-offline-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  if (ASSETS.includes(url.pathname) && !url.search) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(request)));
    return;
  }
  if (request.mode !== 'navigate') return;
  event.respondWith((async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(request, { signal: controller.signal });
      if (response.status < 500) return response;
    } catch { /* Use public fallback; never replay writes. */ }
    finally { clearTimeout(timeout); }
    return (await caches.open(CACHE)).match('/offline.html');
  })());
});
