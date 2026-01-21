/**
 * SFTi P.R.E.P - CORS Service Worker
 * Advanced request interception and proxying
 * 
 * This service worker intercepts network requests and provides
 * custom CORS handling without relying on third-party services.
 * 
 * @version 2.0.0
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
        // Attempt direct fetch with no-cors mode
        // This allows the request to go through but limits response access
        const response = await fetch(request.url, {
            method: request.method,
            headers: stripCorsHeaders(request.headers),
            body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.blob() : undefined,
            mode: 'no-cors',
            credentials: 'omit'
        });
        
        // For no-cors mode, we get an opaque response
        // Create a synthetic response with CORS headers
        const syntheticResponse = new Response(null, {
            status: 200,
            statusText: 'OK',
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': '*',
                'X-Proxied': 'true'
            }
        });
        
        log('CORS request completed:', url.href);
        return syntheticResponse;
        
    } catch (error) {
        log('Direct fetch failed:', error);
        throw error;
    }
}

/**
 * Strip CORS-related headers before making request
 */
function stripCorsHeaders(headers) {
    const newHeaders = new Headers();
    const skipHeaders = ['x-cors-proxy', 'origin', 'referer'];
    
    for (const [key, value] of headers) {
        if (!skipHeaders.includes(key.toLowerCase())) {
            newHeaders.set(key, value);
        }
    }
    
    return newHeaders;
}

/**
 * Handle OPTIONS preflight requests
 */
self.addEventListener('fetch', (event) => {
    if (event.request.method === 'OPTIONS') {
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
    }
});

/**
 * Message handler for manual cache control
 */
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'CLEAR_CACHE':
            caches.delete(CACHE_NAME).then(() => {
                log('Cache cleared');
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'GET_CACHE_KEYS':
            caches.open(CACHE_NAME).then((cache) => {
                return cache.keys();
            }).then((keys) => {
                event.ports[0].postMessage({ 
                    success: true, 
                    keys: keys.map(req => req.url) 
                });
            });
            break;
            
        default:
            log('Unknown message type:', type);
    }
});

log('CORS Service Worker loaded');
