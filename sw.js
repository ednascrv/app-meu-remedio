
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// receber notificações do app
self.addEventListener('message', e => {
  if(e.data.type === 'show-notification'){
    self.registration.showNotification(e.data.title, e.data.opts);
  }
});
