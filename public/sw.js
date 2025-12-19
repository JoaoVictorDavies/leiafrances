const CACHE_NAME = 'leia-frances-v2'; // Incrementado para forçar atualização
const DATA_CACHE_NAME = 'leia-frances-content-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/globals.css',
  '/favicon.ico',
  '/manifest.webmanifest' // Nome padrão gerado pelo app/manifest.ts do Next.js
];

// 1. Instalação e Cache do "App Shell" (Estrutura estática)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Limpeza de caches antigos ao ativar
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
          console.log('[SW] Removendo cache antigo:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// 3. Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ESTRATÉGIA PARA DADOS (Supabase)
  // Se a URL contém 'supabase.co', aplicamos a persistência de conteúdo
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            // Se a rede respondeu, clonamos a resposta e guardamos no cache de dados
            if (response.status === 200) {
              cache.put(event.request.url, response.clone());
            }
            return response;
          })
          .catch(() => {
            // Se a rede falhar (OFFLINE), tentamos encontrar este texto no cache
            console.log('[SW] Modo Offline: Recuperando conteúdo do cache');
            return cache.match(event.request.url);
          });
      })
    );
    return;
  }

  // ESTRATÉGIA PARA ARQUIVOS ESTÁTICOS (Layout, CSS, JS)
  // Cache First: Se está no cache, entrega. Se não, busca na rede.
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});