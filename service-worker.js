// Service Worker para Meu Remédio PWA
const CACHE_NAME = 'meu-remedio-v3.0.1';
const OFFLINE_URL = 'offline.html';

// Assets para cache na instalação
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-192.png',
  '/icon-384.png',
  '/icon-512.png',
  '/css/styles.css',
  '/js/app.js'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Todos os recursos cacheados com sucesso');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Falha ao fazer cache dos recursos:', error);
      })
  );
});

// Ativação do Service Worker
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
    }).then(() => {
      console.log('Service Worker agora controla todas as abas');
      return self.clients.claim();
    })
  );
});

// Estratégia: Cache First, fallback para network
self.addEventListener('fetch', (event) => {
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') return;

  // Para requisições de API/JSON, usar Network First
  if (event.request.url.includes('/api/') || event.request.headers.get('accept')?.includes('application/json')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Se a requisição foi bem sucedida, clone e armazene no cache
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Se a rede falhar, tente buscar do cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Para assets estáticos, usar Cache First
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna do cache se encontrado
        if (response) {
          return response;
        }

        // Se não está no cache, busca da rede
        return fetch(event.request)
          .then((response) => {
            // Verifica se recebemos uma resposta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clona a resposta para armazenar no cache
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Se é uma navegação e offline, mostra página offline
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            // Para outros recursos, retorna resposta vazia ou fallback
            return new Response('Recurso não disponível offline', {
              status: 408,
              statusText: 'Offline'
            });
          });
      })
  );
});

// Background Sync para dados offline
self.addEventListener('sync', (event) => {
  console.log('Background Sync:', event.tag);
  
  if (event.tag === 'sync-medicamentos') {
    event.waitUntil(
      syncMedicamentos()
        .then(() => {
          console.log('Sincronização de medicamentos concluída');
          // Enviar notificação de sucesso
          self.registration.showNotification('Meu Remédio', {
            body: 'Dados sincronizados com sucesso!',
            icon: '/icon-192.png',
            badge: '/icon-72.png'
          });
        })
        .catch((error) => {
          console.error('Falha na sincronização:', error);
        })
    );
  }
});

// Função para sincronizar dados (exemplo)
function syncMedicamentos() {
  // Aqui você implementaria a lógica para sincronizar dados
  // que foram salvos localmente enquanto offline
  return new Promise((resolve) => {
    console.log('Sincronizando dados...');
    // Simulando sincronização
    setTimeout(resolve, 1000);
  });
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('Push notification recebida', event);
  
  let data = {};
  if (event.data) {
    data = event.data.json();
  }
  
  const options = {
    body: data.body || 'Lembrete de medicamento',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      {
        action: 'tomei',
        title: '✅ Tomei',
        icon: '/icon-72.png'
      },
      {
        action: 'adiar',
        title: '⏰ Adiar',
        icon: '/icon-72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Meu Remédio',
      options
    )
  );
});

// Clique em notificações
self.addEventListener('notificationclick', (event) => {
  console.log('Notificação clicada:', event);
  
  event.notification.close();

  if (event.action === 'tomei') {
    // Marcar medicamento como tomado
    console.log('Medicamento marcado como tomado');
    // Aqui você implementaria a lógica para marcar como tomado
  } else if (event.action === 'adiar') {
    // Adiar lembrete
    console.log('Lembrete adiado');
    // Aqui você implementaria a lógica para adiar
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Mensagens do app principal
self.addEventListener('message', (event) => {
  console.log('Mensagem recebida no Service Worker:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_NEW_ASSETS') {
    const assets = event.data.assets;
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(assets))
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
        .catch((error) => {
          event.ports[0].postMessage({ success: false, error: error.message });
        })
    );
  }
});
