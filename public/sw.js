const CACHE_NAME = 'leia-frances-shell-v3';
const ASSETS = ['/', '/favicon.ico', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('leia-frances-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'teacher-cache-check' && event.ports[0]) {
    event.ports[0].postMessage('teacher-cache-safe-v1');
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never cache authenticated requests, Supabase data, or dynamic application pages.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin ||
      event.request.headers.has('authorization') || !url.pathname.startsWith('/_next/static/')) {
    return;
  }
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => {
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) await cache.put(event.request, response.clone());
    return response;
  }));
});
