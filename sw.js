const CACHE_NAME='meu-remedio-cache-v3';
const OFFLINE_URL='/offline.html';
const ASSETS=['/','/index.html','/alert.mp3','/offline.html','/icon.png'];

self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||caches.match(OFFLINE_URL))));
});
self.addEventListener('message', e=>{
  const data=e.data;
  if(data && data.type==='REMINDER_MULTI'){
    data.lista.forEach(remedio=>{
      self.registration.showNotification('Hora do remédio 💊',{body:`${remedio.paciente||'Paciente'} tomar ${remedio.nome}`,icon:'icon.png',tag:`lembrete-${remedio.id}`,vibrate:[200,100,200]});
    });
  }
});
self.addEventListener('notificationclick', e=>{ e.notification.close(); e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(c=>c.length?c[0].focus():clients.openWindow('/'))); });



