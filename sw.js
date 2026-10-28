/* Service worker for the shop. Push while the browser is closed requires a configured push sender/VAPID keys. */
self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let data = { title: 'Старинная Коллекция', body: 'У вас новое сообщение', url: './#lk' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(data.title || 'Старинная Коллекция', {
    body: data.body || 'У вас новое сообщение', icon: './icon-192.png', badge: './icon-192.png',
    data: { url: data.url || './#lk' }, tag: data.tag || 'shop-new-message', renotify: true
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close(); const url = new URL(event.notification.data?.url || './#lk', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const client of list) if ('focus' in client) { client.navigate(url); return client.focus(); }
    return self.clients.openWindow(url);
  }));
});
