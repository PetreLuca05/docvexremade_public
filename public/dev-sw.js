// The admin dashboard's service worker. Registered by dev.html only, with the
// scope /dev.html, so it never controls a public page. It shows Web Push
// notifications (from the `alerts` function, and later from the app's
// `report-dossier`), opens the dashboard when one is tapped, and keeps the
// dashboard's shell for when the network is slow (network first).
//
// Push payload (JSON): { title, body, url, urgent?, tag? }

const CACHE = 'docvex-dev-v1';
const SHELL = ['/dev.html', '/dev.webmanifest', '/dev-icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network first for the dashboard page and the site's own built assets; the
// cached copy only when the network fails. Anything else (Supabase, Stripe,
// Plausible) is left to the browser.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const isShell = url.pathname === '/dev.html' || SHELL.includes(url.pathname);
  const isAsset = url.pathname.startsWith('/assets/');
  if (!isShell && !isAsset) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(event.request, { ignoreSearch: isShell })
          .then((hit) => hit || Response.error()),
      ),
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const urgent = data.urgent === true;
  event.waitUntil(
    self.registration.showNotification(data.title || 'DocVex', {
      body: data.body || '',
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      icon: '/dev-icon-192.png',
      badge: '/dev-icon-192.png',
      data: { url: data.url || '/dev.html' },
      requireInteraction: urgent,
      vibrate: urgent ? [200, 100, 200, 100, 400] : undefined,
    }),
  );
});

// Tapping a notification: an open dashboard goes to its link, else a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/dev.html', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).pathname === '/dev.html');
      if (open) return open.navigate(target).then((w) => (w || open).focus());
      return self.clients.openWindow(target);
    }),
  );
});
