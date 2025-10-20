// service-worker.js
// Service Worker: recebe mensagens e exibe notificações.
// Observação: agendamento permanente (sem push) requer infraestrutura adicional.
// Aqui o SW apenas recebe mensagens do cliente para mostrar notif.

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

self.addEventListener('message', event => {
  const { tipo, dados } = event.data || {};
  if (!tipo) return;
  if (tipo === 'lembrete') {
    mostrarNotificacao('💊 Hora do remédio', `${dados.paciente ? dados.paciente + ' — ' : ''}${dados.nome || ''}`, dados.foto);
  } else if (tipo === 'vencimento') {
    mostrarNotificacao('⚠️ Receita vencida', `Receita de ${dados.nome || ''} está próxima do vencimento.`);
  }
});

function mostrarNotificacao(titulo, corpo, icone) {
  const opts = {
    body: corpo || '',
    icon: icone || 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
    data: { dateOfArrival: Date.now() }
  };
  self.registration.showNotification(titulo, opts);
}



