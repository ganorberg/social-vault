const VERSION = 1;
const CACHE_NAME = `Social-Vault-v${VERSION}`;
const filesToCache = [
  '/',
  '/app.js',
  '/style.css',
  '/favicon.ico'
];

/* 
 * GLOBAL NOTE: The identifier "caches" is an attribute of the service worker's 
 * WorkerGlobalScope. It holds the CacheStorage object, by which it can 
 * access the CacheStorage interface.
 */

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(filesToCache);
    })
  );
});

// Required for cleanup when we create a new cache, perhaps to include new files
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating');
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then(keyList => Promise.all(keyList.map(key => {
      if (!cacheWhitelist.includes(key)) { return caches.delete(key); }
    })))
  );
});

// "Cache, fall back to network, then cache" strategy:
self.addEventListener('fetch', (event) => {
  console.log('[ServiceWorker] Fetching', event.request.url);

  event.respondWith(
    caches
      .match(event.request)
      .then(response => response ||
        fetch(event.request)
          // This isn't required but opportunistically caches files from the network
          .then(response => caches.open(CACHE_NAME)
            .then(cache => {
              // Need to clone res because req/res streams can only be read once
              cache.put(event.request, response.clone());
              return response;
            })
          // Could use caches.match to show file we know is in cache from install.
          // TODO: notify user to try again later.  
          ).catch(() => console.error("Cache and network failed."))
      )
  );
});