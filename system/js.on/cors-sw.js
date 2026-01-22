/**
 * SFTi P.R.E.P - CORS Service Worker - Adversarial Mode
 * Origin spoofing, Host mutation, CORS injection
 * User is root - NO allowlists, fetch everything
 * 
 * @version 3.0.0 - Adversarial Edition
 * @author SFTi LLC
 * @license MIT
 */

const CACHE_NAME = 'sfti-cors-cache-v2';
const DEBUG = true;

/**
 * Log helper
 */
function log(...args) {
    if (DEBUG) {
        console.log('[CORS-SW]', ...args);
    }
}

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
    log('Service worker installing...');
    
    // Skip waiting to activate immediately
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            log('Cache opened');
            return cache;
        })
    );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
    log('Service worker activating...');
    
    event.waitUntil(
        // Claim clients immediately
        self.clients.claim().then(() => {
            log('Service worker activated and claimed clients');
        })
    );
});

/**
 * Fetch Event Handler
 * Intercepts network requests and provides CORS bypass
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Handle OPTIONS preflight requests immediately
    if (request.method === 'OPTIONS') {
        event.respondWith(
            new Response(null, {
                status: 204,
                statusText: 'No Content',
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': '*',
                    'Access-Control-Max-Age': '86400'
                }
            })
        );
        return;
    }
    
    // Only handle requests with our custom proxy header
    if (!request.headers.get('X-Cors-Proxy')) {
        return; // Let browser handle normally
    }
    
    log('Intercepting CORS request:', url.href);
    
    event.respondWith(
        handleCorsRequest(request)
            .catch((error) => {
                log('CORS request failed:', error);
                return new Response(JSON.stringify({
                    error: error.message,
                    cors: true
                }), {
                    status: 500,
                    statusText: 'CORS Proxy Error',
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            })
    );
});

/**
 * Handle CORS-proxied request
 */
async function handleCorsRequest(request) {
    const url = new URL(request.url);
    
    // Check cache first for GET requests
    if (request.method === 'GET') {
        const cached = await caches.match(request);
        if (cached) {
            log('Returning cached response for:', url.href);
            return cached;
        }
    }
    
    try {
        // Origin spoofing - spoof Origin to match destination
        const headers = new Headers(request.headers);
        headers.set('Origin', url.origin);
        headers.set('Referer', url.origin + '/');
        
        // Fetch with spoofed headers
        const response = await fetch(request.url, {
            method: request.method,
            headers: stripCorsHeaders(headers),
            body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.blob() : undefined,
            mode: 'cors',
            credentials: 'omit'
        });
        
        // Clone response and add CORS headers
        const responseBody = await response.blob();
        const corsResponse = new Response(responseBody, {
            status: response.status,
            statusText: response.statusText,
            headers: new Headers({
                ...Object.fromEntries(response.headers.entries()),
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Expose-Headers': '*'
            })
        });
        
        // Cache successful GET requests
        if (request.method === 'GET' && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, corsResponse.clone());
        }
        
        log('✅ CORS completed with origin spoofing:', url.href);
        return corsResponse;
        
    } catch (error) {
        log('CORS fetch failed:', error);
        
        // Return error response with CORS headers
        return new Response(JSON.stringify({
            error: error.message,
            note: 'Service worker CORS proxy failed. Consider using Device Flow for GitHub authentication.'
        }), {
            status: 502,
            statusText: 'Bad Gateway',
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': '*'
            }
        });
    }
}

/**
 * Strip CORS-related headers before making request
 */
function stripCorsHeaders(headers) {
    const newHeaders = new Headers();
    const skipHeaders = ['x-cors-proxy']; // Only skip internal marker, preserve origin/referer for spoofing
    
    for (const [key, value] of headers) {
        if (!skipHeaders.includes(key.toLowerCase())) {
            newHeaders.set(key, value);
        }
    }
    
    return newHeaders;
}

// Note: OPTIONS preflight requests are handled in the main fetch listener above

/**
 * Safe postMessage helper - ensures responses always sent
 */
function safePostMessage(event, message) {
    if (event.ports && event.ports[0]) {
        try {
            event.ports[0].postMessage(message);
        } catch (err) {
            log('Failed to postMessage response:', err);
        }
    }
}

/**
 * Message handler for manual cache control - with comprehensive error handling
 */
self.addEventListener('message', (event) => {
    const { type, data } = event.data || {};
    
    try {
        switch (type) {
            case 'CLEAR_CACHE':
                caches.delete(CACHE_NAME)
                    .then(() => {
                        log('Cache cleared');
                        safePostMessage(event, { success: true });
                    })
                    .catch((err) => {
                        log('Failed to clear cache:', err);
                        safePostMessage(event, { success: false, error: 'Failed to clear cache' });
                    });
                break;
                
            case 'GET_CACHE_KEYS':
                caches.open(CACHE_NAME)
                    .then((cache) => cache.keys())
                    .then((keys) => {
                        safePostMessage(event, { 
                            success: true, 
                            keys: keys.map(req => req.url) 
                        });
                    })
                    .catch((err) => {
                        log('Failed to get cache keys:', err);
                        safePostMessage(event, { success: false, error: 'Failed to get cache keys' });
                    });
                break;
                
            case 'PREFETCH':
                // Prefetch URLs provided in data
                if (data && Array.isArray(data.urls)) {
                    const promises = data.urls.map(url => {
                        return fetch(url).then(response => {
                            if (response.ok) {
                                return caches.open(CACHE_NAME).then(cache => cache.put(url, response));
                            }
                        }).catch(err => log('Prefetch failed for', url, err));
                    });
                    Promise.all(promises)
                        .then(() => {
                            log(`Prefetched ${data.urls.length} URLs`);
                            safePostMessage(event, { success: true, count: data.urls.length });
                        })
                        .catch((err) => {
                            log('Prefetch batch failed:', err);
                            safePostMessage(event, { success: false, error: 'Prefetch failed' });
                        });
                } else {
                    safePostMessage(event, { success: false, error: 'Invalid prefetch data' });
                }
                break;
            
            case 'PING':
                // Health check - respond with status
                safePostMessage(event, { 
                    success: true, 
                    status: 'active',
                    timestamp: Date.now()
                });
                break;
                
            default:
                log('Unknown message type:', type);
                safePostMessage(event, { success: false, error: 'Unknown message type' });
        }
    } catch (error) {
        log('Message handler error:', error);
        safePostMessage(event, { success: false, error: 'Internal error' });
    }
});

log('CORS Service Worker loaded');
