const CACHE_NAME = 'meu-remedio-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/alert.mp3',
  '/icon-192.png',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/tesseract.js@v4.1.1/dist/tesseract.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});

self.addEventListener('message', event => {
  if(event.data.type==='REMINDER_MULTI'){
    event.data.lista.forEach(rem=>{
      const title = `${rem.paciente||'Paciente'} tomar ${rem.nome}`;
      const options = {
        body: 'Horário do medicamento!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate:[200,100,200],
        tag: rem.id
      };
      self.registration.showNotification(title, options);
    });
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(clientList=>{
      if(clientList.length>0) clientList[0].focus();
      else clients.openWindow('/');
    })
  );
});


