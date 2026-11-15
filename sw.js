// YJGB service worker: network-first for the app page (so updates land), cache-first for static assets.
const CACHE = 'yjgb-v0.4.2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './fonts/anton.woff2', './img/splash.png', './fonts/montserrat-900-italic.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put('./index.html', c)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); return res; })));
});

// Real Web Push (inactive until a push server exists). Payload: { title, body, tag, data: { action, goalId, nid } }
self.addEventListener('push', e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (_) { p = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(p.title || 'YJGB', { body: p.body || '', tag: p.tag, data: p.data || {}, icon: 'icon-192.png', badge: 'icon-192.png' }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data = e.notification.data || {};
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    if (cs[0]) { cs[0].postMessage({ type: 'notificationclick', data }); return cs[0].focus(); }
    return clients.openWindow('./#n-' + (data.action || 'open'));
  }));
});
