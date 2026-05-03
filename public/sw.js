const CACHE_NAME = 'gadget-hub-v6';
const urlsToCache = [
  '/offline.html',
  '/img/log.png',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch(() => {
        // Ignore errors during install, some URLs might fail
        console.log('Some cache URLs failed to load');
      });
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ─── Push Notifications ──────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: '101Hub', body: 'You have a new notification', icon: '/img/log.png', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch { /* fallback */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/img/log.png',
      badge: '/img/log.png',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
      tag: data.tag || 'default',
      renotify: true,
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ── Never intercept these — let the browser/CDN handle them natively ──────
  // 1. API routes (user-specific, authenticated data)
  if (url.pathname.startsWith('/api/')) return;
  // 2. Next.js internals: static chunks, RSC payloads, HMR, image optimiser
  //    Vercel CDN already caches these with immutable headers.
  //    Letting the SW touch them causes stale-chunk errors after deployments.
  if (url.pathname.startsWith('/_next/')) return;
  // 3. RSC navigation requests (query param added by Next.js router)
  if (url.searchParams.has('_rsc')) return;

  // ── For real page navigations: network-only, fall back to offline page ────
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/offline.html').then((r) => r ?? fetch('/offline.html'))
      )
    );
    return;
  }

  // ── For static public assets (images, icons, fonts): cache after first load ─
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type !== 'error') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
