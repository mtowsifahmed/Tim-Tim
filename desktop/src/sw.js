const CACHE_NAME = 'tim-tim-v1';
self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});
self.addEventListener('fetch', (e) => {
  // Pass-through network first
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
