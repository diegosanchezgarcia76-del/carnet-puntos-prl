// ============================================
// SERVICE WORKER - Carnet de Puntos PRL
// Versión: 1.0
// ============================================

const CACHE_NAME = 'carnet-prl-v1';

// Ficheros que se guardan en caché para funcionar offline
const ASSETS_TO_CACHE = [
    '/carnet-puntos.html',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    'https://alcdn.msauth.net/browser/2.37.0/js/msal-browser.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// ── Instalación: guarda los assets en caché ──
self.addEventListener('install', event => {
    console.log('[SW] Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Cacheando assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// ── Activación: elimina cachés antiguas ──
self.addEventListener('activate', event => {
    console.log('[SW] Activando...');
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] Eliminando caché antigua:', key);
                        return caches.delete(key);
                    })
            )
        )
    );
    self.clients.claim();
});

// ── Fetch: sirve desde caché, si no va a red ──
self.addEventListener('fetch', event => {
    // Las llamadas a Microsoft Graph y SharePoint siempre van a red (datos en tiempo real)
    if (
        event.request.url.includes('graph.microsoft.com') ||
        event.request.url.includes('sharepoint.com') ||
        event.request.url.includes('login.microsoftonline.com')
    ) {
        return; // Deja pasar sin interceptar
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) {
                console.log('[SW] Sirviendo desde caché:', event.request.url);
                return cached;
            }
            return fetch(event.request).then(response => {
                // Guarda en caché la respuesta nueva
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, response.clone());
                    return response;
                });
            });
        }).catch(() => {
            // Sin conexión y sin caché: muestra página offline
            if (event.request.destination === 'document') {
                return caches.match('/carnet-puntos.html');
            }
        })
    );
});
