// sw.js - improved & debug-friendly
self.addEventListener('install', event => {
  self.skipWaiting();
  console.log('[sw] install');
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
  console.log('[sw] activate');
});

self.addEventListener('push', function(event) {
  console.log('[sw] push event:', event);
  let data = { title: 'Notification', body: '', url: '/' };
  try {
    data = event.data.json();
  } catch (e) {
    try { data.body = event.data.text(); } catch(e2) {}
  }

  const title = data.title || 'Agent Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    image: data.image || undefined,
    tag: data.tag || undefined,
    renotify: typeof data.renotify === 'boolean' ? data.renotify : true,
    data: {
      url: data.url || '/',      // page to open when clicked
      chat_id: data.chat_id || null,
      raw: data
    },
    actions: data.actions || []   // array of {action, title, icon}
  };

  // show notification
  event.waitUntil(
    (async () => {
      try {
        const notif = await self.registration.showNotification(title, options);
        console.log('[sw] showNotification done', title, options);
        return notif;
      } catch (err) {
        console.error('[sw] showNotification error', err);
      }
    })()
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[sw] notificationclick', event.notification && event.notification.data);
  event.notification.close();

  const openUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Try to find an existing window/tab for the app and focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If the client URL matches (or startsWith), focus it and optionally navigate
        if (client.url === openUrl || client.url.startsWith(openUrl)) {
          client.focus();
          return client.navigate ? client.navigate(openUrl) : Promise.resolve();
        }
      }
      // Otherwise open a new window/tab
      return clients.openWindow(openUrl);
    }).catch(err => {
      console.error('[sw] clients.matchAll/openWindow error', err);
    })
  );
});

// Optional: handle action clicks (if you use actions in payload)
self.addEventListener('notificationclose', function(event) {
  console.log('[sw] notificationclose', event);
});
