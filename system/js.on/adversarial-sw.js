/**
 * SFTi P.R.E.P - Adversarial Service Worker
 * Aggressive request rewriting and origin spoofing
 * 
 * PHILOSOPHY: Browser's CORS protects ad networks, not users.
 * This SW treats user as root and removes artificial restrictions.
 * 
 * CAPABILITIES:
 * - Origin spoofing (change Origin header to match destination)
 * - Host header mutation (make cross-origin appear same-origin)
 * - Response header injection (add CORS headers)
 * - Zero allowlists - fetch everything user requests
 * 
 * @version 3.0.0 - Adversarial Edition
 * @author SFTi LLC
 * @license MIT - Jailbreak your browser
 */

const CACHE_NAME = 'sfti-adversarial-cache-v3';
const DEBUG = true;

function log(...args) {
    if (DEBUG) {
        console.log('[Adversarial-SW]', ...args);
    }
}

/**
 * Installation
 */
self.addEventListener('install', (event) => {
    log('🔥 Installing adversarial service worker');
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            log('Cache ready for hostile response storage');
            return cache;
        })
    );
});

/**
 * Activation
 */
self.addEventListener('activate', (event) => {
    log('⚡ Activating adversarial mode');
    event.waitUntil(self.clients.claim());
});

/**
 * Fetch - Aggressive interception
 * NO ALLOWLISTS. User controls what gets fetched.
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Always handle OPTIONS - inject CORS headers
    if (request.method === 'OPTIONS') {
        event.respondWith(handlePreflight(request));
        return;
    }
    
    // Check if this is an adversarial request
    const isAdversarial = request.headers.get('X-Origin-Spoof') === 'true';
    const targetUrl = request.headers.get('X-Target-URL');
    
    if (isAdversarial || targetUrl) {
        event.respondWith(adversarialFetch(request, targetUrl || url.href));
        return;
    }
    
    // For all other requests, still inject CORS headers on response
    event.respondWith(
        fetch(request)
            .then(response => injectCorsHeaders(response))
            .catch(error => {
                log('Fetch failed:', error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 502,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            })
    );
});

/**
 * Handle OPTIONS preflight - always allow
 */
function handlePreflight(request) {
    log('✅ Handling OPTIONS preflight - always allow');
    return new Response(null, {
        status: 204,
        statusText: 'No Content',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400',
            'Access-Control-Expose-Headers': '*'
        }
    });
}

/**
 * Adversarial fetch - rewrite request to bypass CORS
 */
async function adversarialFetch(request, targetUrl) {
    const url = new URL(targetUrl);
    log(`🎯 Adversarial fetch to: ${url.href}`);
    
    try {
        // Strategy 1: Try direct fetch with origin spoofing
        const response = await attemptOriginSpoof(request, url);
        if (response) {
            return response;
        }
    } catch (error) {
        log('Origin spoof failed:', error.message);
    }
    
    try {
        // Strategy 2: Try host header mutation
        const response = await attemptHostMutation(request, url);
        if (response) {
            return response;
        }
    } catch (error) {
        log('Host mutation failed:', error.message);
    }
    
    try {
        // Strategy 3: Try direct fetch and inject CORS on response
        const response = await fetch(url.href, {
            method: request.method,
            headers: stripProxyHeaders(request.headers),
            body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
            mode: 'cors',
            credentials: 'omit',
            redirect: 'follow'
        });
        
        return injectCorsHeaders(response);
    } catch (error) {
        log('All strategies failed:', error.message);
        
        // Return synthetic CORS-enabled error response
        return new Response(JSON.stringify({
            error: 'All bypass strategies failed',
            message: error.message,
            url: url.href,
            note: 'User is root. Browser restrictions are the problem, not the solution.'
        }), {
            status: 502,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': '*',
                'Access-Control-Allow-Headers': '*'
            }
        });
    }
}

/**
 * Attempt origin spoofing
 * Change Origin header to match destination
 */
async function attemptOriginSpoof(request, url) {
    try {
        const headers = new Headers(request.headers);
        
        // Spoof origin to match target
        headers.set('Origin', url.origin);
        headers.set('Referer', url.origin + '/');
        
        // Remove proxy markers
        headers.delete('X-Origin-Spoof');
        headers.delete('X-Target-URL');
        
        log(`🎭 Spoofing origin to: ${url.origin}`);
        
        const response = await fetch(url.href, {
            method: request.method,
            headers: headers,
            body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
            mode: 'cors',
            credentials: 'omit'
        });
        
        return injectCorsHeaders(response);
    } catch (error) {
        throw new Error(`Origin spoof failed: ${error.message}`);
    }
}

/**
 * Attempt host header mutation
 * Make cross-origin appear same-origin
 */
async function attemptHostMutation(request, url) {
    try {
        const headers = new Headers(request.headers);
        
        // Mutate Host header to match target
        headers.set('Host', url.host);
        
        // Make it look like same-origin request
        const currentOrigin = new URL(self.location.href).origin;
        headers.set('Origin', currentOrigin);
        headers.set('Referer', currentOrigin + '/');
        
        // Remove proxy markers
        headers.delete('X-Origin-Spoof');
        headers.delete('X-Target-URL');
        
        log(`🔀 Mutating Host to: ${url.host}`);
        
        const response = await fetch(url.href, {
            method: request.method,
            headers: headers,
            body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
            mode: 'cors',
            credentials: 'omit'
        });
        
        return injectCorsHeaders(response);
    } catch (error) {
        throw new Error(`Host mutation failed: ${error.message}`);
    }
}

/**
 * Inject CORS headers into response
 * Make any response CORS-compliant
 */
function injectCorsHeaders(response) {
    const headers = new Headers(response.headers);
    
    // Inject permissive CORS headers
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Expose-Headers', '*');
    
    // Remove headers that might cause issues
    headers.delete('X-Frame-Options');
    headers.delete('Content-Security-Policy');
    headers.delete('Content-Security-Policy-Report-Only');
    
    log('💉 Injected CORS headers into response');
    
    // Return new response with modified headers
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
    });
}

/**
 * Strip proxy headers before forwarding
 */
function stripProxyHeaders(headers) {
    const newHeaders = new Headers(headers);
    
    // Remove our proxy markers
    newHeaders.delete('X-Origin-Spoof');
    newHeaders.delete('X-Target-URL');
    newHeaders.delete('X-Bypass-Strategy');
    
    return newHeaders;
}

/**
 * Message handler for manual control
 */
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'CLEAR_CACHE':
            caches.delete(CACHE_NAME).then(() => {
                log('🗑️  Cache cleared');
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'GET_STATS':
            event.ports[0].postMessage({
                success: true,
                stats: {
                    version: '3.0.0-adversarial',
                    mode: 'aggressive',
                    restrictions: 'none',
                    philosophy: 'user is root'
                }
            });
            break;
            
        default:
            log('Unknown message type:', type);
    }
});

log('🔥 Adversarial service worker loaded - All restrictions removed');
log('Philosophy: User is root. Browser CORS protects ad networks, not users.');
log('Capabilities: Origin spoofing, host mutation, header injection');
log('Restrictions: NONE');
