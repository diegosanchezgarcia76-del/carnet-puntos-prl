// ============================================
// SERVICE WORKER - Carnet de Puntos PRL
// Versión: 1.1
// ============================================

const CACHE_NAME = 'carnet-prl-v2';

// Ficheros que se guardan en caché para funcionar offline
const ASSETS_TO_CACHE = [
    '/carnet-puntos-prl/carnet-puntos.html',
    '/carnet-puntos-prl/manifest.json',
    '/carnet-puntos-prl/icons/icon-192.png',
    '/carnet-puntos-prl/icons/icon-512.png',
    'https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.38.3/lib/msal-browser.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// ── Instalación: guarda los assets en caché ──
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // Cachear uno a uno para que un fallo no rompa todo
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(url =>
                    cache.add(url).catch(() => {/* fallo silencioso por asset */})
                )
            );
        })
    );
    self.skipWaiting();
});

// ── Activación: elimina cachés antiguas ──
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// ── Fetch: sirve desde caché, si no va a red ──
self.addEventListener('fetch', event => {
    // Las llamadas a Microsoft siempre van a red (autenticación y datos en tiempo real)
    if (
        event.request.url.includes('graph.microsoft.com') ||
        event.request.url.includes('sharepoint.com') ||
        event.request.url.includes('login.microsoftonline.com') ||
        event.request.url.includes('microsoftonline.com')
    ) {
        return; // Deja pasar sin interceptar
    }

    // Solo interceptar peticiones GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request).then(response => {
                // Solo cachear respuestas válidas
                if (!response || response.status !== 200 || response.type === 'opaque') {
                    return response;
                }
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, response.clone());
                    return response;
                });
            });
        }).catch(() => {
            // Sin conexión y sin caché: devuelve la app principal
            if (event.request.destination === 'document') {
                return caches.match('/carnet-puntos-prl/carnet-puntos.html');
            }
        })
    );
});
