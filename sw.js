// IMPORTANT: Bump this version whenever you deploy changes to any of the cached assets below.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `prepare-trading-journal-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// API endpoints that should not be cached
const API_DOMAINS = [
  'models.inference.ai.azure.com',
  'api.github.com'
];

// Install service worker and cache resources
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate and clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName !== CACHE_NAME;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});

// Check if request is to an API domain that should not be cached
function isApiRequest(url) {
  return API_DOMAINS.some(domain => url.hostname.includes(domain));
}

// Fetch from cache first, then network with offline fallback
self.addEventListener('fetch', function(event) {
  const requestUrl = new URL(event.request.url);
  
  // Don't cache API requests - always fetch from network with error handling
  if (isApiRequest(requestUrl)) {
    event.respondWith(
      fetch(event.request).catch(function(error) {
        console.error('API request failed:', error);
        return new Response(JSON.stringify({ error: 'Network unavailable. Please check your connection.' }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(function(response) {
            // Don't cache non-successful responses or opaque responses
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Only cache basic and cors responses (not opaque)
            if (response.type !== 'basic' && response.type !== 'cors') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(function(error) {
            // If both cache and network fail, return the cached index.html for navigation requests
            // This allows the app to work offline
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            // For other requests, return an offline response
            console.error('Fetch failed; returning offline response.', error);
            return new Response('You are offline. Please check your internet connection and try again.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
      })
  );
});
