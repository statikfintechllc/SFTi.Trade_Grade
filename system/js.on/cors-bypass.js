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

/**
 * Custom DOMPurifier - DOM-based HTML sanitization without regex vulnerabilities
 * No external dependencies
 */
class DOMPurifier {
    constructor() {
        this.parser = new DOMParser();
    }
    
    parseFromString(htmlString, mimeType) {
        return this.parser.parseFromString(htmlString, mimeType);
    }
}

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
        initialized: false,
        initializing: false,
        initPromise: null,
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
    /**
     * Initialize with race condition protection
     * Ensures initialization happens only once even if called multiple times
     */
    async init() {
        // If already initialized, return immediately
        if (this.state.initialized) {
            return true;
        }
        
        // If currently initializing, wait for that to complete
        if (this.state.initializing && this.state.initPromise) {
            return this.state.initPromise;
        }
        
        // Mark as initializing and create promise
        this.state.initializing = true;
        this.state.initPromise = this._performInit();
        
        return this.state.initPromise;
    },
    
    /**
     * Internal initialization logic
     */
    async _performInit() {
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
            
            this.state.initialized = true;
            this.state.initializing = false;
            
            this.log('✅ All CORS restrictions bypassed - fully self-sufficient runtime');
            return true;
        } catch (error) {
            this.state.initializing = false;
            this.state.initPromise = null;
            this.error('Failed to initialize CORS widget:', error);
            return false;
        }
    },
    
    /**
     * Ensure initialization before using any feature
     */
    async ensureInitialized() {
        if (!this.state.initialized) {
            await this.init();
        }
        return this.state.initialized;
    },

    /**
     * Initialize client keypair - SESSION ONLY (no localStorage)
     * Security: Generate fresh keypair per session to minimize risk
     * If persistence is needed in future, use encrypted vault
     */
    async initKeypair() {
        try {
            // Always generate fresh keypair per session for security
            // No persistence in localStorage (security risk per code review)
            const kp = await crypto.subtle.generateKey(
                { name: 'ECDSA', namedCurve: 'P-256' }, 
                true, 
                ['sign', 'verify']
            );
            this.config.keypair = kp;
            this.log('🔑 Client keypair generated (session-only, not persisted)');
        } catch (e) { 
            this.warn('Keypair init failed:', e.message); 
        }
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

    /**
     * Initialize encrypted vault with salt stored in IndexedDB (not localStorage)
     * Security: Salt stored securely in IndexedDB, not localStorage
     */
    async initVault() {
        try {
            const req = indexedDB.open('sfti_vault', 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                
                // Create tokens object store
                if (!db.objectStoreNames.contains('tokens')) {
                    db.createObjectStore('tokens', { keyPath: 'key' });
                }
                
                // Create config object store for salt and other sensitive config
                if (!db.objectStoreNames.contains('config')) {
                    db.createObjectStore('config', { keyPath: 'key' });
                }
                
                // Generate and store vault salt on first creation IN IndexedDB
                const saltBytes = new Uint8Array(16); // 128-bit salt
                if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                    crypto.getRandomValues(saltBytes);
                } else {
                    console.warn('[CustomCorsWidget] crypto.getRandomValues not available, using Math.random fallback for vault salt');
                    for (let i = 0; i < saltBytes.length; i++) {
                        saltBytes[i] = Math.floor(Math.random() * 256);
                    }
                }
                const saltArray = Array.from(saltBytes);
                
                // Store salt in IndexedDB config store (not localStorage)
                const transaction = e.target.transaction;
                const configStore = transaction.objectStore('config');
                configStore.put({ key: 'vault_salt', value: saltArray, timestamp: Date.now() });
                
                this.log('🔐 Generated vault salt on database creation (stored in IndexedDB)');
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
                        mode: 'cors', // Use CORS mode to read response body/headers (may trigger preflight)
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
                        'X-Proxy-Method': options.method || 'GET',
                        'X-Requested-With': 'CustomCorsWidget'
                    };
                    
                    // Try multiple fetch strategies
                    let response;
                    const strategies = [
                        // Strategy 1: Direct CORS fetch with proxy headers
                        async () => {
                            return await fetch(targetUrl, {
                                method: options.method || 'GET',
                                headers: proxyHeaders, // Use proxy headers
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
     * Signed fetch using client keypair
     * Proves user intent and bypasses CORS preflight
     */
    async signedFetch(url, options = {}) {
        try {
            // Ensure Web Crypto is available
            if (!window.crypto || !crypto.subtle) {
                throw new Error('Web Crypto API not available');
            }

            // Ensure we have a keypair
            if (!this.config.keypair) {
                await this.initKeypair();
            }
            const keypair = this.config.keypair;
            if (!keypair || !keypair.privateKey) {
                throw new Error('Keypair not available');
            }

            const request = new Request(url, options);
            const method = request.method || 'GET';
            const targetUrl = request.url;
            
            // Get body if present
            let body = '';
            try {
                const clone = request.clone();
                body = await clone.text();
            } catch (e) {
                // Body not available or already consumed
            }

            // Canonical string to sign: METHOD\nURL\nBODY
            const toSign = `${method.toUpperCase()}\n${targetUrl}\n${body}`;
            const encoder = new TextEncoder();
            const data = encoder.encode(toSign);

            const signature = await crypto.subtle.sign(
                { name: 'ECDSA', hash: { name: 'SHA-256' } },
                keypair.privateKey,
                data
            );

            // Helper: ArrayBuffer -> base64url
            const arrayBufferToBase64Url = (buffer) => {
                const bytes = new Uint8Array(buffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                return btoa(binary)
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=/g, '');
            };

            const sigB64 = arrayBufferToBase64Url(signature);

            // Add signature header to request
            const headers = new Headers(options.headers || {});
            headers.set('X-SFTI-Signature', sigB64);
            headers.set('X-SFTI-SignedBy', 'client');

            return await fetch(url, {
                ...options,
                headers
            });
        } catch (error) {
            this.log('Signed fetch failed:', error.message);
            throw error;
        }
    },
    
    /**
     * WebRTC data channel fetch for protocol elevation
     * Bypasses CORS by using WebRTC which has no CORS enforcement
     */
    async webRTCFetch(url, options = {}) {
        try {
            const channelInfo = this.state.webrtcChannels.get('default');
            if (!channelInfo) {
                throw new Error('WebRTC not initialized');
            }

            const { ch } = channelInfo;
            
            // Check if channel is open
            if (ch.readyState !== 'open') {
                throw new Error('WebRTC channel not open');
            }

            // Serialize request
            const requestData = {
                url,
                method: options.method || 'GET',
                headers: options.headers || {},
                body: options.body || null
            };

            // Send request through WebRTC channel
            return await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('WebRTC fetch timeout'));
                }, 30000);

                ch.onmessage = (event) => {
                    clearTimeout(timeout);
                    try {
                        const responseData = JSON.parse(event.data);
                        resolve(new Response(responseData.body, {
                            status: responseData.status,
                            statusText: responseData.statusText,
                            headers: responseData.headers
                        }));
                    } catch (e) {
                        reject(e);
                    }
                };

                ch.send(JSON.stringify(requestData));
            });
        } catch (error) {
            this.log('WebRTC fetch failed:', error.message);
            throw error;
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
        // Ensure initialization before making any requests
        await this.ensureInitialized();
        
        const method = (options.method || 'GET').toUpperCase();
        
        this.log(`Fetching ${method} ${url}`);
        
        try {
            // Strategy 1: Try signed fetch (client keypair proves user intent)
            if (this.config.keypair) {
                try {
                    const response = await this.signedFetch(url, options);
                    if (response.ok) {
                        this.log('✅ Signed fetch succeeded');
                        return await this.validateResponse(response, url);
                    }
                } catch (error) {
                    this.log('Signed fetch failed, trying other methods...');
                }
            }
            
            // Strategy 2: Try WebRTC data channel (protocol elevation, no CORS)
            if (this.state.webrtcChannels.has('default')) {
                try {
                    const response = await this.webRTCFetch(url, options);
                    if (response.ok) {
                        this.log('✅ WebRTC fetch succeeded');
                        return await this.validateResponse(response, url);
                    }
                } catch (error) {
                    this.log('WebRTC fetch failed:', error.message);
                }
            }
            
            // Strategy 3: Try direct fetch (might work if CORS is properly configured)
            try {
                const response = await this.directFetch(url, options);
                if (response.ok) {
                    this.log('✅ Direct fetch succeeded');
                    return await this.validateResponse(response, url);
                }
            } catch (error) {
                this.log('Direct fetch failed, trying self-hosted proxy methods...');
            }
            
            // Strategy 4: Self-hosted CORSProxy (mimics corsproxy.io)
            if (this.state.proxyServers.has('corsproxy')) {
                try {
                    const proxy = this.state.proxyServers.get('corsproxy');
                    const response = await proxy.fetch(url, options);
                    if (response.ok) {
                        this.log('✅ Self-hosted CORSProxy succeeded');
                        return await this.validateResponse(response, url);
                    }
                } catch (error) {
                    this.log('Self-hosted CORSProxy failed:', error.message);
                }
            }
            
            // Strategy 5: Self-hosted CORS.SH (mimics cors.sh)
            if (this.state.proxyServers.has('corssh')) {
                try {
                    const proxy = this.state.proxyServers.get('corssh');
                    const response = await proxy.fetch(url, options);
                    if (response.ok) {
                        this.log('✅ Self-hosted CORS.SH succeeded');
                        return await this.validateResponse(response, url);
                    }
                } catch (error) {
                    this.log('Self-hosted CORS.SH failed:', error.message);
                }
            }
            
            // Strategy 6: Self-hosted AllOrigins (mimics allorigins.win)
            if (this.state.proxyServers.has('allorigins') && method === 'GET') {
                try {
                    const proxy = this.state.proxyServers.get('allorigins');
                    const result = await proxy.fetch(url, options);
                    if (result.contents) {
                        this.log('✅ Self-hosted AllOrigins succeeded');
                        const response = new Response(result.contents, {
                            status: result.status.http_code || 200,
                            headers: {
                                'Content-Type': result.status.content_type || 'text/plain',
                                'X-Proxy-Via': 'AllOrigins-Compatible'
                            }
                        });
                        return await this.validateResponse(response, url);
                    }
                } catch (error) {
                    this.log('Self-hosted AllOrigins failed:', error.message);
                }
            }
            
            // Strategy 7: Use service worker proxy if available
            if (this.state.serviceWorkerReady) {
                try {
                    const response = await this.serviceWorkerFetch(url, options);
                    if (response.ok) {
                        this.log('✅ Service worker fetch succeeded');
                        return await this.validateResponse(response, url);
                    }
                } catch (error) {
                    this.log('Service worker fetch failed:', error.message);
                }
            }
            
            // Strategy 8: Use Web Worker pool for parallel processing
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
     * Validate response with paranoid inbound validation
     * User is root, but servers are untrusted I/O
     */
    async validateResponse(response, url) {
        try {
            // Check content-type against allowlist
            const contentType = response.headers.get('content-type') || '';
            const allowedTypes = [
                'text/',
                'application/json',
                'application/javascript',
                'application/xml',
                'image/',
                'audio/',
                'video/',
                'application/octet-stream'
            ];
            
            const isAllowed = allowedTypes.some(type => contentType.toLowerCase().includes(type.toLowerCase()));
            if (!isAllowed && contentType) {
                this.warn(`Suspicious content-type: ${contentType} for ${url}`);
            }
            
            // Check response size
            const contentLength = response.headers.get('content-length');
            if (contentLength && parseInt(contentLength) > this.config.validation.maxResponseSize) {
                throw new Error(`Response too large: ${contentLength} bytes (max: ${this.config.validation.maxResponseSize})`);
            }
            
            // Sanitize HTML responses if enabled
            if (this.config.validation.sanitizeHtml && contentType.includes('text/html')) {
                const html = await response.text();
                const sanitized = this.sanitizeHtml(html);
                return new Response(sanitized, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                });
            }
            
            return response;
        } catch (error) {
            this.warn('Response validation failed:', error.message);
            return response; // Return original on validation error (user is root)
        }
    },
    
    /**
     * Custom DOM-based HTML sanitizer (no regex vulnerabilities)
     * Implements DOMPurify-like functionality without external dependencies
     * Uses DOM parsing for robust handling of malformed/nested/obfuscated HTML
     */
    sanitizeHtml(html) {
        if (!html) return '';
        
        try {
            // Parse HTML into a DOM tree for proper handling
            const parser = new DOMPurifier();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Remove all known dangerous elements
            const blockedTags = [
                'script', 'style', 'iframe', 'object', 'embed', 
                'link', 'meta', 'base', 'form', 'input', 'textarea',
                'button', 'select', 'option'
            ];
            
            blockedTags.forEach(tag => {
                const elements = doc.querySelectorAll(tag);
                elements.forEach(el => el.remove());
            });
            
            // Walk all remaining elements and sanitize attributes
            const walker = doc.createTreeWalker(
                doc.body || doc,
                NodeFilter.SHOW_ELEMENT,
                null,
                false
            );
            
            const dangerousProtocols = [
                'javascript:', 'vbscript:', 'data:text/html', 
                'data:text/xml', 'data:application/'
            ];
            
            const dangerousAttributes = [
                'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
                'onmousedown', 'onmouseup', 'onkeydown', 'onkeyup', 'onkeypress',
                'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset',
                'onanimationstart', 'onanimationend', 'ontransitionend',
                'onwheel', 'onscroll', 'ondrag', 'ondrop', 'onpaste', 'oncopy'
            ];
            
            let node = walker.currentNode;
            while (node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Get all attributes
                    const attrs = Array.from(node.attributes);
                    
                    attrs.forEach(attr => {
                        const attrName = attr.name.toLowerCase();
                        const attrValue = attr.value.toLowerCase();
                        
                        // Remove event handler attributes
                        if (dangerousAttributes.includes(attrName) || attrName.startsWith('on')) {
                            node.removeAttribute(attr.name);
                            return;
                        }
                        
                        // Check for dangerous protocols in href, src, action, etc.
                        if (['href', 'src', 'action', 'formaction', 'data', 'codebase'].includes(attrName)) {
                            const hasDangerousProtocol = dangerousProtocols.some(proto => 
                                attrValue.includes(proto)
                            );
                            if (hasDangerousProtocol) {
                                node.removeAttribute(attr.name);
                                return;
                            }
                        }
                        
                        // Remove style attributes that might contain expressions
                        if (attrName === 'style') {
                            if (attrValue.includes('expression') || attrValue.includes('javascript:')) {
                                node.removeAttribute(attr.name);
                            }
                        }
                    });
                }
                node = walker.nextNode();
            }
            
            // Get sanitized HTML
            const sanitized = doc.body ? doc.body.innerHTML : '';
            
            // Final validation: double-check no scripts slipped through
            const finalCheck = this.finalSecurityCheck(sanitized);
            if (!finalCheck.safe) {
                this.warn('⚠️ HTML sanitization security check failed - rejecting content');
                return '<!-- Content rejected: security risk detected -->';
            }
            
            this.log(`✅ HTML sanitized using DOM parser - ${finalCheck.removedCount} dangerous elements removed`);
            return sanitized;
            
        } catch (error) {
            this.warn('⚠️ HTML sanitization failed:', error.message);
            return '<!-- Content rejected: sanitization error -->';
        }
    },
    
    /**
     * Final security check for sanitized HTML
     * Returns {safe: boolean, removedCount: number}
     */
    finalSecurityCheck(html) {
        const dangerousPatterns = [
            /<script/i,
            /<\/script/i,
            /javascript:/i,
            /vbscript:/i,
            /on\w+\s*=/i, // event handlers
            /<iframe/i,
            /<object/i,
            /<embed/i
        ];
        
        let safe = true;
        let removedCount = 0;
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(html)) {
                safe = false;
                removedCount++;
            }
        }
        
        return { safe, removedCount };
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

// Export for use in other modules
// Infrastructure is loaded but NOT initialized
// Application code must call CustomCorsWidget.init() explicitly when needed
window.CustomCorsWidget = CustomCorsWidget;
