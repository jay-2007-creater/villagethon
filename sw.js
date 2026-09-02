// CityAssist Service Worker - Background Notifications & Offline Sync Engine
const CACHE_NAME = 'cityassist-v5';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Intercept fetch requests for offline resiliency
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// 1. Web Push Notification Event (Triggered by Server / Webhook even when app is closed)
self.addEventListener('push', (event) => {
  let data = {
    title: '🚚 Garbage Truck Approaching!',
    body: 'Vehicle MH-12-EA-4920 is entering your street in Talegaon.',
    icon: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120',
    tag: 'cityassist-push-arrival',
    data: { url: './#garbage' }
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120',
    badge: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120',
    tag: data.tag || 'cityassist-alert',
    vibrate: [200, 100, 200, 100, 300],
    requireInteraction: true,
    data: data.data || { url: './#garbage' },
    actions: [
      { action: 'track', title: '👀 Track Live' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 2. Notification Click Handler: Opens App to Live Screen
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing open tab if available
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE_TO', screen: 'garbage' });
          return;
        }
      }
      // Otherwise open a fresh window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. Message Channel: Allows App to Schedule Background Notifications Before Closing
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_BACKGROUND_NOTIFICATION') {
    const delay = event.data.delayMs || 3000;
    const payload = event.data.payload || {};

    setTimeout(() => {
      self.registration.showNotification(payload.title || '🚚 Garbage Truck Arrival Alert', {
        body: payload.body || 'Vehicle MH-12-EA-4920 is at your doorstep.',
        icon: payload.icon || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120',
        badge: payload.badge || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120',
        tag: payload.tag || `background-${Date.now()}`,
        vibrate: payload.vibrate || [200, 100, 200, 100, 300],
        requireInteraction: true,
        data: payload.data || { url: './#garbage' },
        actions: [
          { action: 'track', title: '👀 Track Live' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });
    }, delay);
  }
});
