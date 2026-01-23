/**
 * SFTi P.R.E.P - CORS Service Worker - Adversarial Mode
 * Origin spoofing, Host mutation, CORS injection
 * User is root - NO allowlists, fetch everything
 * 
 * This Service Worker acts as a SEPARATE SERVER RUNTIME
 * that intercepts and proxies all network requests
 * 
 * @version 3.0.0 - Adversarial Edition
 * @author SFTi LLC
 * @license MIT
 */

const CACHE_NAME = 'sfti-cors-cache-v2';
const DEBUG = true;
const SERVER_PID = 'SW-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);

// Server statistics
const stats = {
    requestsHandled: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    startTime: Date.now()
};

/**
 * Log helper
 */
function log(...args) {
    if (DEBUG) {
        console.log('[CORS-SW-SERVER ' + SERVER_PID + ']', ...args);
    }
}

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
    log('🚀 CORS PROXY SERVER installing... (PID: ' + SERVER_PID + ')');
    
    // Skip waiting to activate immediately
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            log('✅ Cache storage initialized');
            log('✅ CORS PROXY SERVER installed successfully');
            return cache;
        })
    );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
    log('🔥 CORS PROXY SERVER activating...');
    
    event.waitUntil(
        // Claim clients immediately
        self.clients.claim().then(() => {
            log('✅ CORS PROXY SERVER activated and claimed all clients');
            log('🌐 Server is ONLINE and listening for requests on PID: ' + SERVER_PID);
            log('📊 Server ready to handle CORS-proxied requests');
            
            // Broadcast activation to all clients
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_ACTIVATED',
                        pid: SERVER_PID,
                        timestamp: Date.now()
                    });
                });
                log('📡 Activation broadcast sent to ' + clients.length + ' client(s)');
            });
        })
    );
});

/**
 * Fetch Event Handler
 * Intercepts network requests and provides CORS bypass
 * THIS IS THE KEY - Service Workers intercept BEFORE CORS checks
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    stats.requestsHandled++;
    
    // CRITICAL: Intercept GitHub OAuth token endpoint
    // Service Workers intercept at network layer BEFORE CORS is checked
    if (url.hostname === 'github.com' && url.pathname === '/login/oauth/access_token') {
        log('🎯 INTERCEPTING GitHub OAuth token request!');
        log('📡 URL:', url.href);
        log('📡 Method:', request.method);
        log('🔓 Service Worker will add CORS headers to response');
        
        event.respondWith(
            fetch(request)
                .then(response => {
                    log('✅ GitHub response received - Status:', response.status);
                    
                    // Clone the response so we can modify headers
                    const clonedResponse = response.clone();
                    
                    // Read the body
                    return clonedResponse.text().then(body => {
                        log('📦 Response body length:', body.length, 'bytes');
                        log('📦 Response preview:', body.substring(0, 100));
                        
                        // Create new response with CORS headers added
                        const headers = new Headers(response.headers);
                        headers.set('Access-Control-Allow-Origin', '*');
                        headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                        headers.set('Access-Control-Allow-Headers', '*');
                        headers.set('Access-Control-Expose-Headers', '*');
                        
                        log('✅ CORS headers added - response is now readable by page');
                        
                        return new Response(body, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: headers
                        });
                    });
                })
                .catch(error => {
                    log('❌ Fetch failed:', error.message);
                    stats.errors++;
                    
                    // Return error response with CORS headers
                    return new Response(JSON.stringify({ error: error.message }), {
                        status: 500,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    });
                })
        );
        return;
    }
    
    // Handle OPTIONS preflight requests for any URL
    if (request.method === 'OPTIONS') {
        log('📡 Handling OPTIONS preflight for:', url.href);
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
    
    log('🔄 Intercepting CORS request #' + stats.requestsHandled + ':', request.method, url.href);
    
    event.respondWith(
        handleCorsRequest(request)
            .catch((error) => {
                stats.errors++;
                log('❌ CORS request failed:', error.message);
                return new Response(JSON.stringify({
                    error: error.message,
                    cors: true,
                    serverId: SERVER_PID
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
    const startTime = Date.now();
    
    // Check cache first for GET requests
    if (request.method === 'GET') {
        const cached = await caches.match(request);
        if (cached) {
            stats.cacheHits++;
            const duration = Date.now() - startTime;
            log('✅ Cache HIT (' + duration + 'ms):', url.href);
            return cached;
        } else {
            stats.cacheMisses++;
        }
    }
    
    try {
        log('🌐 Proxying request with origin spoofing...');
        
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
        
        const duration = Date.now() - startTime;
        log('✅ CORS proxy completed (' + duration + 'ms) - Status:', response.status);
        
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
                'Access-Control-Expose-Headers': '*',
                'X-Proxy-Server': SERVER_PID,
                'X-Proxy-Duration-Ms': duration.toString()
            })
        });
        
        // Cache successful GET requests
        if (request.method === 'GET' && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, corsResponse.clone());
            log('💾 Response cached');
        }
        
        return corsResponse;
        
    } catch (error) {
        stats.errors++;
        const duration = Date.now() - startTime;
        log('❌ CORS fetch failed (' + duration + 'ms):', error.message);
        
        // Return error response with CORS headers
        return new Response(JSON.stringify({
            error: error.message,
            note: 'Service worker CORS proxy failed. Consider using Device Flow for GitHub authentication.',
            serverId: SERVER_PID,
            duration: duration
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
                // Health check - respond with status and statistics
                const uptime = Date.now() - stats.startTime;
                safePostMessage(event, { 
                    success: true, 
                    status: 'active',
                    pid: SERVER_PID,
                    uptime: uptime,
                    stats: {
                        requestsHandled: stats.requestsHandled,
                        cacheHits: stats.cacheHits,
                        cacheMisses: stats.cacheMisses,
                        errors: stats.errors,
                        cacheHitRate: stats.cacheHits + stats.cacheMisses > 0 
                            ? (stats.cacheHits / (stats.cacheHits + stats.cacheMisses) * 100).toFixed(2) + '%'
                            : '0%'
                    },
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

log('🚀 CORS Service Worker loaded - Server Runtime Ready (PID: ' + SERVER_PID + ')');
