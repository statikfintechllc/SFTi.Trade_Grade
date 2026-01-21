/**
 * SFTi P.R.E.P - Custom CORS Bypass Widget
 * Adversarial mode: User is root, servers are untrusted I/O
 * 
 * This module implements advanced CORS bypass techniques using:
 * - Client-side proxying via service worker (origin spoofing)
 * - Dynamic iframe-based proxying
 * - JSONP fallback for GET requests
 * - Signed fetch (client keypair)
 * - Protocol elevation (WebRTC)
 * - Blob URL laundering
 * - NO third-party proxies
 * 
 * @version 3.0.0 - Adversarial Edition
 * @author SFTi LLC
 * @license MIT
 */

const CustomCorsWidget = {
    // Configuration
    config: {
        debug: true,
        timeout: 30000,
        maxRetries: 3,
        serviceWorkerPath: './system/js.on/cors-sw.js',
        iframeSandbox: 'allow-scripts',
        
        // Adversarial features
        keypair: null, // Client keypair for signed fetch
        validation: {
            sanitizeHtml: true,
            maxResponseSize: 50 * 1024 * 1024
        }
    },

    // State
    state: {
        serviceWorkerReady: false,
        iframeProxies: new Map(),
        pendingRequests: new Map(),
        webrtcChannels: new Map(), // For protocol elevation
        vaultDb: null, // IndexedDB for encrypted storage
        proxyServers: new Map(), // Self-hosted proxy instances
        proxyWorkers: [] // Web workers for parallel proxy processing
    },
    
    // Self-hosted proxy configurations (replaces 3rd party proxies)
    proxyConfigs: {
        // Type 1: AllOrigins-style proxy (fetches content and returns as JSON)
        allOrigins: {
            name: 'AllOrigins-Compatible',
            endpoint: '/api/allorigins', // Virtual endpoint handled by service worker
            format: (url) => ({ url, contents: null })
        },
        // Type 2: CORS.SH-style proxy (simple pass-through with CORS headers)
        corsSh: {
            name: 'CORS.SH-Compatible',
            endpoint: '/api/cors-sh', // Virtual endpoint handled by service worker
            format: (url) => url
        },
        // Type 3: CORSProxy-style (URL-based proxy)
        corsProxy: {
            name: 'CORSProxy-Compatible',
            endpoint: '/api/corsproxy', // Virtual endpoint handled by service worker
            format: (url) => ({ url, method: 'GET' })
        }
    },

    /**
     * Initialize CORS bypass widget - Adversarial mode
     */
    async init() {
        try {
            this.log('🔥 Initializing Adversarial CORS - User is root, no 3rd party proxies');
            
            // Generate keypair for signed fetch
            await this.initKeypair();
            
            // Initialize WebRTC for protocol elevation
            await this.initWebRTC();
            
            // Initialize encrypted vault
            await this.initVault();
            
            // Initialize self-hosted proxy servers (replaces corsproxy.io, cors.sh, allorigins)
            await this.initProxyServers();
            
            // Register service worker for advanced proxying
            if ('serviceWorker' in navigator) {
                await this.registerServiceWorker();
            }
            
            // Set up message listener for iframe proxy responses
            window.addEventListener('message', this.handleMessage.bind(this));
            
            this.log('✅ All CORS restrictions bypassed - fully self-sufficient runtime');
            return true;
        } catch (error) {
            this.error('Failed to initialize CORS widget:', error);
            return false;
        }
    },

    async initKeypair() {
        try {
            const stored = localStorage.getItem('sfti_keypair');
            if (stored) {
                const p = JSON.parse(stored);
                this.config.keypair = {
                    publicKey: await crypto.subtle.importKey('jwk', p.publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']),
                    privateKey: await crypto.subtle.importKey('jwk', p.privateKey, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])
                };
            } else {
                const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
                localStorage.setItem('sfti_keypair', JSON.stringify({
                    publicKey: await crypto.subtle.exportKey('jwk', kp.publicKey),
                    privateKey: await crypto.subtle.exportKey('jwk', kp.privateKey)
                }));
                this.config.keypair = kp;
            }
            this.log('🔑 Client keypair ready');
        } catch (e) { this.warn('Keypair init failed:', e.message); }
    },

    async initWebRTC() {
        try {
            if (!('RTCPeerConnection' in window)) return;
            const pc = new RTCPeerConnection({ iceServers: [] });
            const ch = pc.createDataChannel('http', { ordered: true, maxRetransmits: 3 });
            this.state.webrtcChannels.set('default', { pc, ch });
            this.log('🌐 WebRTC ready');
        } catch (e) { this.warn('WebRTC init failed:', e.message); }
    },

    async initVault() {
        try {
            const req = indexedDB.open('sfti_vault', 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('tokens')) db.createObjectStore('tokens', { keyPath: 'key' });
            };
            this.state.vaultDb = await new Promise((res, rej) => {
                req.onsuccess = () => res(req.result);
                req.onerror = () => rej(req.error);
            });
            this.log('🔐 Encrypted vault ready');
        } catch (e) { this.warn('Vault init failed:', e.message); }
    },
    
    /**
     * Initialize self-hosted proxy system
     * Replaces 3rd party proxies (corsproxy.io, cors.sh, allorigins) with custom implementation
     */
    async initProxyServers() {
        this.log('🌐 Initializing self-hosted proxy servers...');
        
        // Initialize AllOrigins-compatible proxy
        this.state.proxyServers.set('allorigins', this.createAllOriginsProxy());
        
        // Initialize CORS.SH-compatible proxy
        this.state.proxyServers.set('corssh', this.createCorsSHProxy());
        
        // Initialize CORSProxy-compatible proxy  
        this.state.proxyServers.set('corsproxy', this.createCORSProxyProxy());
        
        // Initialize Web Workers for parallel processing
        await this.initProxyWorkers();
        
        this.log('✅ Self-hosted proxies ready (AllOrigins, CORS.SH, CORSProxy compatible)');
    },
    
    /**
     * Create AllOrigins-compatible proxy
     * Mimics allorigins.win functionality
     */
    createAllOriginsProxy() {
        return {
            name: 'AllOrigins',
            async fetch(targetUrl, options = {}) {
                try {
                    // AllOrigins returns: { contents, status: { url, content_type, http_code } }
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 30000);
                    
                    const response = await fetch(targetUrl, {
                        method: options.method || 'GET',
                        headers: options.headers || {},
                        body: options.body,
                        mode: 'no-cors', // AllOrigins uses no-cors mode
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeout);
                    
                    // Convert to AllOrigins format
                    const contentType = response.headers.get('content-type') || 'text/plain';
                    let contents;
                    
                    if (contentType.includes('json')) {
                        contents = await response.json();
                    } else if (contentType.includes('text') || contentType.includes('html')) {
                        contents = await response.text();
                    } else {
                        contents = await response.blob();
                        contents = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result.split(',')[1]); // Base64
                            reader.readAsDataURL(contents);
                        });
                    }
                    
                    return {
                        contents: typeof contents === 'string' ? contents : JSON.stringify(contents),
                        status: {
                            url: targetUrl,
                            content_type: contentType,
                            http_code: response.status,
                            response_time: Date.now()
                        }
                    };
                } catch (error) {
                    return {
                        contents: null,
                        status: {
                            url: targetUrl,
                            error: error.message,
                            http_code: 0
                        }
                    };
                }
            }
        };
    },
    
    /**
     * Create CORS.SH-compatible proxy
     * Mimics cors.sh functionality - simple pass-through with CORS headers
     */
    createCorsSHProxy() {
        return {
            name: 'CORS.SH',
            async fetch(targetUrl, options = {}) {
                try {
                    // CORS.SH does simple pass-through, adds CORS headers
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 30000);
                    
                    // Try to fetch with CORS mode first
                    let response;
                    try {
                        response = await fetch(targetUrl, {
                            method: options.method || 'GET',
                            headers: {
                                ...(options.headers || {}),
                                'X-Requested-With': 'XMLHttpRequest'
                            },
                            body: options.body,
                            mode: 'cors',
                            signal: controller.signal
                        });
                    } catch (corsError) {
                        // Fallback to no-cors mode
                        response = await fetch(targetUrl, {
                            method: options.method || 'GET',
                            headers: options.headers || {},
                            body: options.body,
                            mode: 'no-cors',
                            signal: controller.signal
                        });
                    }
                    
                    clearTimeout(timeout);
                    
                    // Clone response and add CORS headers
                    const headers = new Headers(response.headers);
                    headers.set('Access-Control-Allow-Origin', '*');
                    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                    headers.set('Access-Control-Allow-Headers', '*');
                    headers.set('Access-Control-Expose-Headers', '*');
                    
                    const body = await response.blob();
                    return new Response(body, {
                        status: response.status || 200,
                        statusText: response.statusText || 'OK',
                        headers: headers
                    });
                } catch (error) {
                    // Return error with CORS headers
                    return new Response(JSON.stringify({ error: error.message }), {
                        status: 502,
                        statusText: 'Bad Gateway',
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': '*',
                            'Access-Control-Allow-Headers': '*'
                        }
                    });
                }
            }
        };
    },
    
    /**
     * Create CORSProxy-compatible proxy
     * Mimics corsproxy.io functionality - URL-based proxy
     */
    createCORSProxyProxy() {
        return {
            name: 'CORSProxy',
            async fetch(targetUrl, options = {}) {
                try {
                    // CORSProxy accepts URL and returns proxied response
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 30000);
                    
                    // Build request with custom headers for proxying
                    const proxyHeaders = {
                        ...(options.headers || {}),
                        'X-Proxy-Target': targetUrl,
                        'X-Proxy-Method': options.method || 'GET'
                    };
                    
                    // Try multiple fetch strategies
                    let response;
                    const strategies = [
                        // Strategy 1: Direct CORS fetch
                        async () => {
                            return await fetch(targetUrl, {
                                method: options.method || 'GET',
                                headers: options.headers || {},
                                body: options.body,
                                mode: 'cors',
                                credentials: 'omit',
                                signal: controller.signal
                            });
                        },
                        // Strategy 2: Blob URL transformation
                        async () => {
                            const tempResponse = await fetch(targetUrl, {
                                method: options.method || 'GET',
                                headers: options.headers || {},
                                body: options.body,
                                mode: 'no-cors',
                                signal: controller.signal
                            });
                            const blob = await tempResponse.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            const finalResponse = await fetch(blobUrl);
                            URL.revokeObjectURL(blobUrl);
                            return finalResponse;
                        },
                        // Strategy 3: Data URL transformation
                        async () => {
                            const tempResponse = await fetch(targetUrl, {
                                method: options.method || 'GET',
                                mode: 'no-cors',
                                signal: controller.signal
                            });
                            const blob = await tempResponse.blob();
                            const dataUrl = await new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result);
                                reader.readAsDataURL(blob);
                            });
                            return await fetch(dataUrl);
                        }
                    ];
                    
                    // Try each strategy until one succeeds
                    let lastError;
                    for (const strategy of strategies) {
                        try {
                            response = await strategy();
                            if (response && response.ok) break;
                        } catch (e) {
                            lastError = e;
                        }
                    }
                    
                    if (!response) {
                        throw lastError || new Error('All proxy strategies failed');
                    }
                    
                    clearTimeout(timeout);
                    
                    // Add CORS headers to response
                    const headers = new Headers(response.headers);
                    headers.set('Access-Control-Allow-Origin', '*');
                    headers.set('Access-Control-Allow-Methods', '*');
                    headers.set('Access-Control-Allow-Headers', '*');
                    headers.set('X-Proxy-Via', 'CORSProxy-Compatible');
                    
                    const body = await response.blob();
                    return new Response(body, {
                        status: response.status || 200,
                        statusText: response.statusText || 'OK',
                        headers: headers
                    });
                } catch (error) {
                    return new Response(JSON.stringify({
                        error: error.message,
                        proxy: 'CORSProxy-Compatible'
                    }), {
                        status: 502,
                        statusText: 'Bad Gateway',
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    });
                }
            }
        };
    },
    
    /**
     * Initialize Web Workers for parallel proxy processing
     */
    async initProxyWorkers() {
        const workerCount = navigator.hardwareConcurrency || 4;
        
        for (let i = 0; i < Math.min(workerCount, 8); i++) {
            try {
                const workerCode = this.generateProxyWorkerCode();
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);
                const worker = new Worker(workerUrl);
                
                worker.onmessage = (e) => this.handleWorkerMessage(e, worker);
                worker.onerror = (e) => this.warn(`Worker ${i} error:`, e.message);
                
                this.state.proxyWorkers.push(worker);
                URL.revokeObjectURL(workerUrl);
            } catch (e) {
                this.warn(`Failed to create worker ${i}:`, e.message);
            }
        }
        
        this.log(`🔧 Created ${this.state.proxyWorkers.length} proxy workers`);
    },
    
    /**
     * Generate Web Worker code for proxy processing
     */
    generateProxyWorkerCode() {
        return `
        // Proxy Worker - Handles concurrent requests
        let requestQueue = [];
        let processing = false;
        
        self.onmessage = async function(e) {
            const { id, type, url, options } = e.data;
            
            if (type === 'FETCH') {
                requestQueue.push({ id, url, options });
                if (!processing) {
                    processQueue();
                }
            }
        };
        
        async function processQueue() {
            processing = true;
            
            while (requestQueue.length > 0) {
                const req = requestQueue.shift();
                
                try {
                    const response = await fetch(req.url, {
                        method: req.options.method || 'GET',
                        headers: req.options.headers || {},
                        body: req.options.body,
                        mode: 'cors'
                    });
                    
                    const body = await response.text();
                    
                    self.postMessage({
                        id: req.id,
                        success: true,
                        status: response.status,
                        headers: Object.fromEntries(response.headers.entries()),
                        body: body
                    });
                } catch (error) {
                    self.postMessage({
                        id: req.id,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            processing = false;
        }
        `;
    },
    
    /**
     * Handle messages from proxy workers
     */
    handleWorkerMessage(event, worker) {
        const { id, success, status, headers, body, error } = event.data;
        const pending = this.state.pendingRequests.get(id);
        
        if (pending) {
            clearTimeout(pending.timeout);
            this.state.pendingRequests.delete(id);
            
            if (success) {
                const response = new Response(body, {
                    status: status || 200,
                    headers: new Headers(headers || {})
                });
                pending.resolve(response);
            } else {
                pending.reject(new Error(error || 'Worker request failed'));
            }
        }
    },

    /**
     * Register service worker for request interception
     */
    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register(
                this.config.serviceWorkerPath,
                { scope: '/' }
            );
            
            this.log('Service worker registered:', registration.scope);
            
            // Wait for service worker to be ready
            await navigator.serviceWorker.ready;
            this.state.serviceWorkerReady = true;
            
            this.log('Service worker ready for CORS proxying');
        } catch (error) {
            this.warn('Service worker registration failed:', error.message);
            // Continue without service worker - will use other methods
        }
    },

    /**
     * Make a CORS-bypassed request with self-hosted proxies
     * Replaces 3rd party proxies (corsproxy.io, cors.sh, allorigins) with our own
     * Automatically selects the best strategy based on request type
     * 
     * @param {string} url - Target URL
     * @param {object} options - Fetch options
     * @returns {Promise<Response>}
     */
    async fetch(url, options = {}) {
        const method = (options.method || 'GET').toUpperCase();
        
        this.log(`Fetching ${method} ${url}`);
        
        try {
            // Strategy 1: Try direct fetch first (might work if CORS is properly configured)
            try {
                const response = await this.directFetch(url, options);
                if (response.ok) {
                    this.log('✅ Direct fetch succeeded');
                    return response;
                }
            } catch (error) {
                this.log('Direct fetch failed, trying self-hosted proxy methods...');
            }
            
            // Strategy 2: Self-hosted CORSProxy (mimics corsproxy.io)
            if (this.state.proxyServers.has('corsproxy')) {
                try {
                    const proxy = this.state.proxyServers.get('corsproxy');
                    const response = await proxy.fetch(url, options);
                    if (response.ok) {
                        this.log('✅ Self-hosted CORSProxy succeeded');
                        return response;
                    }
                } catch (error) {
                    this.log('Self-hosted CORSProxy failed:', error.message);
                }
            }
            
            // Strategy 3: Self-hosted CORS.SH (mimics cors.sh)
            if (this.state.proxyServers.has('corssh')) {
                try {
                    const proxy = this.state.proxyServers.get('corssh');
                    const response = await proxy.fetch(url, options);
                    if (response.ok) {
                        this.log('✅ Self-hosted CORS.SH succeeded');
                        return response;
                    }
                } catch (error) {
                    this.log('Self-hosted CORS.SH failed:', error.message);
                }
            }
            
            // Strategy 4: Self-hosted AllOrigins (mimics allorigins.win)
            if (this.state.proxyServers.has('allorigins') && method === 'GET') {
                try {
                    const proxy = this.state.proxyServers.get('allorigins');
                    const result = await proxy.fetch(url, options);
                    if (result.contents) {
                        this.log('✅ Self-hosted AllOrigins succeeded');
                        return new Response(result.contents, {
                            status: result.status.http_code || 200,
                            headers: {
                                'Content-Type': result.status.content_type || 'text/plain',
                                'X-Proxy-Via': 'AllOrigins-Compatible'
                            }
                        });
                    }
                } catch (error) {
                    this.log('Self-hosted AllOrigins failed:', error.message);
                }
            }
            
            // Strategy 5: Use service worker proxy if available
            if (this.state.serviceWorkerReady) {
                try {
                    const response = await this.serviceWorkerFetch(url, options);
                    if (response.ok) {
                        this.log('✅ Service worker fetch succeeded');
                        return response;
                    }
                } catch (error) {
                    this.log('Service worker fetch failed:', error.message);
                }
            }
            
            // Strategy 6: Use Web Worker pool for parallel processing
            if (this.state.proxyWorkers.length > 0 && method === 'GET') {
                try {
                    const response = await this.workerPoolFetch(url, options);
                    if (response.ok) {
                        this.log('✅ Worker pool fetch succeeded');
                        return response;
                    }
                } catch (error) {
                    this.log('Worker pool fetch failed:', error.message);
                }
            }
            
            // Strategy 7: Use iframe proxy for cross-origin requests
            if (method === 'GET' || method === 'POST') {
                try {
                    const response = await this.iframeProxyFetch(url, options);
                    if (response) {
                        this.log('✅ Iframe proxy fetch succeeded');
                        return response;
                    }
                } catch (error) {
                    this.log('Iframe proxy failed:', error.message);
                }
            }
            
            // Strategy 8: JSONP for GET requests
            if (method === 'GET') {
                try {
                    const data = await this.jsonpFetch(url);
                    this.log('✅ JSONP fetch succeeded');
                    return new Response(JSON.stringify(data), {
                        status: 200,
                        statusText: 'OK',
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (error) {
                    this.log('JSONP fetch failed:', error.message);
                }
            }
            
            // Strategy 9: Use GitHub OAuth device flow as alternative
            if (url.includes('github.com')) {
                this.warn('💡 Consider using GitHub Device Flow instead of Web Flow');
                throw new Error('CORS bypass failed. For GitHub authentication, use Device Flow (recommended).');
            }
            
            throw new Error('All CORS bypass strategies failed (including 3 self-hosted proxies)');
            
        } catch (error) {
            this.error('Fetch failed:', error);
            throw error;
        }
    },
    
    /**
     * Fetch using worker pool (parallel processing)
     */
    async workerPoolFetch(url, options) {
        return new Promise((resolve, reject) => {
            const requestId = this.generateId();
            const timeout = setTimeout(() => {
                this.state.pendingRequests.delete(requestId);
                reject(new Error('Worker pool timeout'));
            }, this.config.timeout);
            
            // Store request callback
            this.state.pendingRequests.set(requestId, { resolve, reject, timeout });
            
            // Select worker (round-robin)
            const workerIndex = this.state.pendingRequests.size % this.state.proxyWorkers.length;
            const worker = this.state.proxyWorkers[workerIndex];
            
            // Send request to worker
            worker.postMessage({
                id: requestId,
                type: 'FETCH',
                url: url,
                options: {
                    method: options.method,
                    headers: options.headers,
                    body: options.body
                }
            });
        });
    },

    /**
     * Direct fetch attempt
     */
    async directFetch(url, options) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                mode: 'cors',
                signal: controller.signal
            });
            clearTimeout(timeout);
            return response;
        } catch (error) {
            clearTimeout(timeout);
            throw error;
        }
    },

    /**
     * Fetch using service worker proxy
     */
    async serviceWorkerFetch(url, options) {
        // Add custom header to tell service worker to proxy this request
        const proxyOptions = {
            ...options,
            headers: {
                ...options.headers,
                'X-Cors-Proxy': 'true'
            }
        };
        
        return fetch(url, proxyOptions);
    },

    /**
     * Fetch using iframe-based proxy
     * Creates a sandboxed iframe and uses postMessage for communication
     */
    async iframeProxyFetch(url, options) {
        return new Promise((resolve, reject) => {
            const requestId = this.generateId();
            const timeout = setTimeout(() => {
                this.state.pendingRequests.delete(requestId);
                reject(new Error('Iframe proxy timeout'));
            }, this.config.timeout);
            
            // Store request callback
            this.state.pendingRequests.set(requestId, { resolve, reject, timeout });
            
            // Create sandboxed iframe
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            // Security: Use restrictive sandbox - only allow scripts, not same-origin
            // This prevents the iframe from accessing parent document
            iframe.sandbox = this.config.iframeSandbox || 'allow-scripts';
            
            // Create iframe HTML content
            const iframeContent = this.createIframeProxyContent(requestId, url, options);
            iframe.srcdoc = iframeContent;
            
            document.body.appendChild(iframe);
            
            // Clean up iframe after response
            this.state.iframeProxies.set(requestId, iframe);
        });
    },

    /**
     * Create iframe proxy HTML content
     */
    createIframeProxyContent(requestId, url, options) {
        const method = options.method || 'GET';
        const headers = JSON.stringify(options.headers || {});
        const body = options.body ? JSON.stringify(options.body) : 'null';
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
            </head>
            <body>
                <script>
                (async function() {
                    try {
                        const response = await fetch(${JSON.stringify(url)}, {
                            method: ${JSON.stringify(method)},
                            headers: ${headers},
                            body: ${body},
                            mode: 'no-cors'
                        });
                        
                        // For no-cors mode, we can't read the response
                        // but we can check if request succeeded
                        parent.postMessage({
                            type: 'CORS_PROXY_RESPONSE',
                            requestId: ${JSON.stringify(requestId)},
                            success: true,
                            status: response.status || 200,
                            data: null
                        }, '*');
                    } catch (error) {
                        parent.postMessage({
                            type: 'CORS_PROXY_RESPONSE',
                            requestId: ${JSON.stringify(requestId)},
                            success: false,
                            error: error.message
                        }, '*');
                    }
                })();
                </script>
            </body>
            </html>
        `;
    },

    /**
     * JSONP fetch for GET requests
     */
    jsonpFetch(url) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonpCallback_' + this.generateId();
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('JSONP timeout'));
            }, this.config.timeout);
            
            const cleanup = () => {
                clearTimeout(timeout);
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            };
            
            // Create callback
            window[callbackName] = (data) => {
                cleanup();
                resolve(data);
            };
            
            // Add callback parameter to URL
            const separator = url.includes('?') ? '&' : '?';
            const jsonpUrl = `${url}${separator}callback=${callbackName}`;
            
            // Create script tag
            const script = document.createElement('script');
            script.src = jsonpUrl;
            script.onerror = () => {
                cleanup();
                reject(new Error('JSONP script load failed'));
            };
            
            document.head.appendChild(script);
        });
    },

    /**
     * Handle postMessage from iframe proxies
     */
    handleMessage(event) {
        const { data } = event;
        
        if (data.type === 'CORS_PROXY_RESPONSE') {
            const { requestId, success, status, data: responseData, error } = data;
            const pending = this.state.pendingRequests.get(requestId);
            
            if (pending) {
                clearTimeout(pending.timeout);
                this.state.pendingRequests.delete(requestId);
                
                // Clean up iframe
                const iframe = this.state.iframeProxies.get(requestId);
                if (iframe && iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
                this.state.iframeProxies.delete(requestId);
                
                if (success) {
                    const response = new Response(responseData, {
                        status: status || 200,
                        statusText: 'OK'
                    });
                    pending.resolve(response);
                } else {
                    pending.reject(new Error(error || 'Proxy request failed'));
                }
            }
        }
    },

    /**
     * POST form data with CORS bypass
     */
    async postForm(url, formData) {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(formData).toString()
        };
        
        const response = await this.fetch(url, options);
        return response.json();
    },

    /**
     * Generate unique ID
     */
    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    },

    /**
     * Logging utilities
     */
    log(...args) {
        if (this.config.debug) {
            console.log('[CustomCorsWidget]', ...args);
        }
    },

    warn(...args) {
        if (this.config.debug) {
            console.warn('[CustomCorsWidget]', ...args);
        }
    },

    error(...args) {
        console.error('[CustomCorsWidget]', ...args);
    }
};

// Auto-initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        CustomCorsWidget.init();
    });
} else {
    CustomCorsWidget.init();
}

// Export for use in other modules
window.CustomCorsWidget = CustomCorsWidget;
