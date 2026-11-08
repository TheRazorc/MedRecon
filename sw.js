const CACHE_NAME = 'medrecon-suite-v31';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/triangulacion/index.html',
  '/planificador-sar/index.html',
  '/navegacion/index.html',
  '/navegacion/three.min.js',
  '/navegacion/OrbitControls.js',
  '/assets/CCBE_MEDRECON.jpg',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[MedRecon SW] Pre-caching core assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[MedRecon SW] Pre-caching warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[MedRecon SW] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Estrategia Network-First robusta (sin riesgo de ERR_FAILED)
self.addEventListener('fetch', (event) => {
  // Ignorar métodos no GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignorar llamadas a la API de backend (/api/...) para que vayan directo a Cloudflare Functions
  if (url.pathname.startsWith('/api/')) return;

  // Ignorar extensiones de navegador u orígenes extraños
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Si la respuesta es válida, la guardamos en caché
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback a caché si la red falla
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // Fallback si es navegación HTML
        if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
          const indexCached = await caches.match('/index.html') || await caches.match('./index.html');
          if (indexCached) return indexCached;
        }

        // Si nada funciona, devolver una respuesta vacía válida en vez de undefined para no romper Chromium
        return new Response('Red no disponible / Conexión interrumpida', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});
