// Service Worker para Meu Remédio - PWA
const CACHE_NAME = 'meu-remedio-v3.0.1';
const DYNAMIC_CACHE = 'meu-remedio-dynamic-v1';

// Arquivos para cache estático
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-72.png',
  '/icon-96.png', 
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-192.png',
  '/icon-384.png',
  '/icon-512.png',
  '/shortcut-med.png',
  '/shortcut-take.png',
  '/shortcut-consult.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('🟢 Service Worker instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cache estático sendo preenchido');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker instalado com sucesso');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Erro na instalação:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('🟠 Service Worker ativando...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Remove caches antigos
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
            console.log('🗑️ Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('✅ Service Worker ativado');
      return self.clients.claim();
    })
  );
});

// Estratégia de Cache: Network First com Fallback para Cache
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET e de outros domínios
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Para API/JSON, usa Network First
  if (event.request.url.includes('/api/') || event.request.headers.get('accept')?.includes('application/json')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Cache dinâmico para dados da API
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => {
          // Fallback para cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Para recursos estáticos, usa Cache First
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Atualiza cache em background
          fetchAndCache(event.request);
          return cachedResponse;
        }
        
        // Se não está em cache, busca na rede
        return fetchAndCache(event.request);
      })
      .catch(() => {
        // Fallback para página offline
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
        return new Response('Recurso offline', {
          status: 408,
          statusText: 'Offline'
        });
      })
  );
});

// Função para buscar e armazenar em cache
function fetchAndCache(request) {
  return fetch(request)
    .then((networkResponse) => {
      if (!networkResponse || networkResponse.status !== 200) {
        return networkResponse;
      }
      
      const responseToCache = networkResponse.clone();
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          cache.put(request, responseToCache);
        });
      
      return networkResponse;
    });
}

// ================= SISTEMA DE NOTIFICAÇÕES =================

// Evento de push para notificações
self.addEventListener('push', (event) => {
  console.log('📬 Evento push recebido:', event);
  
  if (!event.data) return;
  
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'Meu Remédio',
      body: event.data.text() || 'Nova notificação',
      icon: '/icon-192.png'
    };
  }

  const options = {
    body: data.body || 'Lembrete do Meu Remédio',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-72.png',
    tag: data.tag || 'meu-remedio-notification',
    requireInteraction: true,
    silent: data.silent || false,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'tomei',
        title: '✅ Tomei',
        icon: '/icon-72.png'
      },
      {
        action: 'adiar',
        title: '⏰ Adiar 10min',
        icon: '/icon-72.png'
      }
    ],
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '💊 Meu Remédio', options)
  );
});

// Clique em notificações
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notificação clicada:', event);
  
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data;

  // Ações customizadas
  if (action === 'tomei') {
    // Marcar como tomado via API
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        if (clients.length > 0) {
          clients[0].postMessage({
            type: 'MEDICATION_TAKEN',
            data: notificationData
          });
        }
      })
    );
    return;
  }

  if (action === 'adiar') {
    // Adiar notificação por 10 minutos
    event.waitUntil(
      self.registration.showNotification(event.notification.title, {
        ...event.notification,
        body: '⏰ Adiado por 10 minutos: ' + event.notification.body,
        tag: 'delayed-' + Date.now(),
        showTrigger: new TimestampTrigger(Date.now() + 10 * 60 * 1000) // 10 minutos
      })
    );
    return;
  }

  // Navegação padrão - focar/abrir o app
  event.waitUntil(
    self.clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then((clientList) => {
      // Tentar focar em uma janela existente
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          
          // Enviar dados da notificação para o app
          if (notificationData) {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: notificationData
            });
          }
          return;
        }
      }
      
      // Abrir nova janela se não existir
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Fechamento de notificação
self.addEventListener('notificationclose', (event) => {
  console.log('🔕 Notificação fechada:', event);
  // Aqui você pode registrar analytics ou limpar recursos
});

// ================= SINCRONIZAÇÃO EM BACKGROUND =================

// Sincronização periódica (quando suportado)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-medications') {
    console.log('🔄 Sincronização periódica de medicamentos');
    event.waitUntil(checkPendingMedications());
  }
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  console.log('🔄 Evento sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      checkPendingAlarms()
        .then(() => console.log('✅ Sincronização concluída'))
        .catch(error => console.error('❌ Erro na sincronização:', error))
    );
  }
});

// Verificar alarmes pendentes
async function checkPendingAlarms() {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients.forEach(client => {
        client.postMessage({
          type: 'CHECK_PENDING_ALARMS'
        });
      });
    }
  } catch (error) {
    console.error('Erro ao verificar alarmes:', error);
  }
}

// Verificar medicamentos pendentes
async function checkPendingMedications() {
  const now = new Date();
  const currentTime = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
  
  console.log('⏰ Verificando medicamentos para:', currentTime);
  
  // Esta função seria chamada periodicamente para verificar horários
  try {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients.forEach(client => {
        client.postMessage({
          type: 'CHECK_MEDICATION_TIMES',
          currentTime: currentTime
        });
      });
    }
  } catch (error) {
    console.error('Erro ao verificar medicamentos:', error);
  }
}

// ================= MENSAGENS DO APP =================

// Comunicação com a aplicação
self.addEventListener('message', (event) => {
  console.log('📨 Mensagem recebida no SW:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SCHEDULE_NOTIFICATION':
      scheduleNotification(data);
      break;
      
    case 'CANCEL_NOTIFICATION':
      self.registration.getNotifications({ tag: data.tag })
        .then(notifications => {
          notifications.forEach(notification => notification.close());
        });
      break;
      
    case 'GET_NOTIFICATIONS':
      self.registration.getNotifications()
        .then(notifications => {
          event.ports[0].postMessage({
            type: 'NOTIFICATIONS_LIST',
            data: notifications
          });
        });
      break;
      
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_CLEAR':
      caches.delete(CACHE_NAME)
        .then(() => {
          console.log('🗑️ Cache limpo');
        });
      break;
  }
});

// Agendar notificação
function scheduleNotification(notificationData) {
  const { id, title, body, timestamp, data } = notificationData;
  
  if ('showTrigger' in Notification.prototype) {
    self.registration.showNotification(title, {
      body,
      tag: id,
      showTrigger: new TimestampTrigger(timestamp),
      data: data,
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      requireInteraction: true
    });
  }
}
