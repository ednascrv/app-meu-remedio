const CACHE_NAME = 'meu-remedio-v1.2.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker ativado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.startsWith('http')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(event.request).then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          });
        })
    );
  }
});

// Sistema de alarmes em background
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_ALARM') {
    const { id, time, title, body, medId } = event.data;
    scheduleAlarm(id, time, title, body, medId);
  }
});

function scheduleAlarm(id, time, title, body, medId) {
  const now = Date.now();
  const targetTime = new Date(time).getTime();
  const timeout = targetTime - now;

  if (timeout > 0 && timeout < 24 * 60 * 60 * 1000) { // Máximo 24h
    console.log(`Agendando alarme: ${title} para ${new Date(time)}`);
    
    setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: id,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        actions: [
          { action: 'tomei', title: '✅ Tomei' },
          { action: 'adiar', title: '⏰ Adiar 10min' }
        ],
        data: { medId: medId }
      });
    }, timeout);
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'tomei') {
    // Marcar como tomado
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'MEDICATION_TAKEN',
            medId: event.notification.data.medId || event.notification.tag
          });
        });
      })
    );
  } else if (event.action === 'adiar') {
    // Reagendar para 10 minutos
    const newTime = new Date(Date.now() + 10 * 60 * 1000);
    scheduleAlarm(
      event.notification.tag + '_delay', 
      newTime, 
      event.notification.title, 
      '🕙 Lembrete adiado: ' + event.notification.body,
      event.notification.data.medId
    );
  } else {
    // Focar na app
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        if (clients.length > 0) {
          return clients[0].focus();
        } else {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});
