/**
 * SFTi P.R.E.P - Custom Static Backend Server
 * State-of-the-art client-side backend without third-party dependencies
 * 
 * This module provides a complete backend server running entirely in the browser,
 * handling OAuth flows, token management, and API routing without external services.
 * 
 * Features:
 * - OAuth Device Flow (recommended for GitHub)
 * - OAuth Web Flow (with custom CORS bypass)
 * - Token management and refresh
 * - API request routing
 * - Rate limiting and caching
 * - Security best practices
 * 
 * @version 3.0.0
 * @author SFTi LLC
 * @license MIT
 */

class CustomStaticBackend {
    constructor() {
        this.config = {
            // GitHub OAuth (configurable)
            OAUTH: {
                // App ID can be overridden via setAppId() method
                APP_ID: localStorage.getItem('oauth_app_id') || '2631011',
                CLIENT_ID: localStorage.getItem('oauth_client_id') || '',
                // Note: Client Secret stored in IndexedDB vault (key: 'oauth_client_secret')
                // Loaded asynchronously on init, persistent across sessions
                // Device Flow (recommended) doesn't require client secret
                CLIENT_SECRET: '', // Loaded from IndexedDB on init
                // Construct redirect URI dynamically based on current location
                REDIRECT_URI: window.location.origin + window.location.pathname.replace('/index.html', '') + '/system/auth/callback',
                SCOPES: ['read:user', 'user:email'],
                DEVICE_CODE_URL: 'https://github.com/login/device/code',
                TOKEN_URL: 'https://github.com/login/oauth/access_token',
                AUTH_URL: 'https://github.com/login/oauth/authorize'
            },
            
            // API Endpoints
            ENDPOINTS: {
                AZURE_INFERENCE: 'https://models.inference.ai.azure.com',
                COPILOT_CHAT: 'https://api.githubcopilot.com/chat/completions',
                GITHUB_API: 'https://api.github.com'
            },
            
            // Storage keys
            STORAGE: {
                GITHUB_TOKEN: 'githubToken',
                COPILOT_TOKEN: 'copilotToken',
                COPILOT_EXPIRY: 'copilotTokenExpiry',
                OAUTH_CLIENT_ID: 'oauth_client_id',
                OAUTH_CLIENT_SECRET: 'oauth_client_secret',
                DEVICE_CODE: 'device_code_data',
                CACHE_PREFIX: 'sfti_cache_'
            },
            
            // Rate limiting completely removed - user is root
            // No client-side limitations - if API has limits, let them 429 us
            
            // Cryptography settings
            CRYPTO: {
                PBKDF2_ITERATIONS: 100000, // Security-critical: PBKDF2 iteration count
                SALT_BYTES: 16 // 128-bit salt for key derivation
            },
            
            // Cache settings
            CACHE: {
                enabled: true,
                ttl: 300000 // 5 minutes
            }
        };
        
        this.state = {
            cache: new Map(),
            pollingIntervals: new Map()
        };
        
        this.init();
    }
    
    /**
     * Initialize the backend server
     */
    async init() {
        console.log('[CustomStaticBackend] Initializing...');
        
        // Load custom CORS widget
        if (window.CustomCorsWidget) {
            this.corsWidget = window.CustomCorsWidget;
        }
        
        // Set up broadcast channel for cross-tab communication
        if ('BroadcastChannel' in window) {
            this.broadcastChannel = new BroadcastChannel('sfti-backend');
            this.broadcastChannel.addEventListener('message', this.handleBroadcastMessage.bind(this));
        }
        
        // Clean up expired cache entries
        this.startCacheCleanup();
        
        // Load CLIENT_SECRET from IndexedDB
        await this.loadClientSecretFromIndexedDB();
        
        console.log('[CustomStaticBackend] Initialized successfully');
    }
    
    /**
     * Load CLIENT_SECRET from IndexedDB for persistence
     * Retries if vault not ready
     */
    async loadClientSecretFromIndexedDB(retryCount = 0) {
        try {
            if (!window.CustomCorsWidget?.state.vaultDb) {
                // Vault not ready yet, retry up to 3 times with delay
                if (retryCount < 3) {
                    console.log(`[CustomStaticBackend] Vault not ready, retrying CLIENT_SECRET load (attempt ${retryCount + 1}/3)...`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                    return await this.loadClientSecretFromIndexedDB(retryCount + 1);
                } else {
                    console.warn('[CustomStaticBackend] Vault not ready after 3 retries, CLIENT_SECRET not loaded');
                    return;
                }
            }
            
            const db = window.CustomCorsWidget.state.vaultDb;
            const transaction = db.transaction(['tokens'], 'readonly');
            const store = transaction.objectStore('tokens');
            const request = store.get('oauth_client_secret');
            
            const result = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            if (result && result.value) {
                this.config.OAUTH.CLIENT_SECRET = result.value;
                console.log('[CustomStaticBackend] CLIENT_SECRET loaded from IndexedDB');
            }
        } catch (e) {
            console.warn('[CustomStaticBackend] Failed to load CLIENT_SECRET from IndexedDB:', e.message);
        }
    }
    
    /**
     * GitHub Device Flow OAuth (RECOMMENDED)
     * No CORS issues, no redirect required
     */
    async startDeviceFlow() {
        try {
            console.log('[DeviceFlow] Starting device flow authentication...');
            
            const clientId = this.getClientId();
            if (!clientId) {
                throw new Error('OAuth Client ID not configured. Please enter your GitHub OAuth App Client ID.');
            }
            
            // Step 1: Request device code
            const deviceData = await this.requestDeviceCode(clientId);
            
            // Store device code data
            localStorage.setItem(this.config.STORAGE.DEVICE_CODE, JSON.stringify(deviceData));
            
            // Return device code and user code for display
            return {
                success: true,
                deviceCode: deviceData.device_code,
                userCode: deviceData.user_code,
                verificationUri: deviceData.verification_uri,
                expiresIn: deviceData.expires_in,
                interval: deviceData.interval
            };
            
        } catch (error) {
            console.error('[DeviceFlow] Failed:', error);
            throw error;
        }
    }
    
    /**
     * Request device code from GitHub
     */
    async requestDeviceCode(clientId) {
        const response = await fetch(this.config.OAUTH.DEVICE_CODE_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: clientId,
                scope: this.config.OAUTH.SCOPES.join(' ')
            })
        });
        
        if (!response.ok) {
            throw new Error(`Device code request failed: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    /**
     * Poll for device flow token
     */
    async pollDeviceToken(deviceCode, interval = 5) {
        const clientId = this.getClientId();
        
        return new Promise((resolve, reject) => {
            const pollInterval = setInterval(async () => {
                try {
                    const response = await fetch(this.config.OAUTH.TOKEN_URL, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            client_id: clientId,
                            device_code: deviceCode,
                            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.access_token) {
                        // Success!
                        clearInterval(pollInterval);
                        this.state.pollingIntervals.delete(deviceCode);
                        
                        // Store token (Device Flow provides GitHub token)
                        await this.storeToken(data.access_token, 'github');
                        
                        resolve({
                            success: true,
                            token: data.access_token,
                            tokenType: data.token_type
                        });
                        
                    } else if (data.error === 'authorization_pending') {
                        // Still waiting for user to authorize
                        console.log('[DeviceFlow] Waiting for authorization...');
                        
                    } else if (data.error === 'slow_down') {
                        // Need to slow down polling
                        console.log('[DeviceFlow] Slowing down polling...');
                        clearInterval(pollInterval);
                        
                        // Restart with longer interval
                        setTimeout(() => {
                            this.pollDeviceToken(deviceCode, interval + 5)
                                .then(resolve)
                                .catch(reject);
                        }, (interval + 5) * 1000);
                        
                    } else if (data.error === 'expired_token') {
                        // Device code expired
                        clearInterval(pollInterval);
                        this.state.pollingIntervals.delete(deviceCode);
                        reject(new Error('Device code expired. Please try again.'));
                        
                    } else if (data.error === 'access_denied') {
                        // User denied access
                        clearInterval(pollInterval);
                        this.state.pollingIntervals.delete(deviceCode);
                        reject(new Error('Access denied by user.'));
                        
                    } else {
                        // Unknown error
                        clearInterval(pollInterval);
                        this.state.pollingIntervals.delete(deviceCode);
                        reject(new Error(data.error_description || data.error || 'Unknown error'));
                    }
                    
                } catch (error) {
                    clearInterval(pollInterval);
                    this.state.pollingIntervals.delete(deviceCode);
                    reject(error);
                }
            }, interval * 1000);
            
            // Store interval reference for cleanup
            this.state.pollingIntervals.set(deviceCode, pollInterval);
        });
    }
    
    /**
     * OAuth Web Flow (Alternative, requires CORS bypass)
     */
    async startWebFlow() {
        const clientId = this.getClientId();
        if (!clientId) {
            throw new Error('OAuth Client ID not configured');
        }
        
        // Generate state for CSRF protection
        const state = this.generateState();
        localStorage.setItem('oauth_state', state);
        
        // Build authorization URL
        const authUrl = new URL(this.config.OAUTH.AUTH_URL);
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', this.config.OAUTH.REDIRECT_URI);
        authUrl.searchParams.set('scope', this.config.OAUTH.SCOPES.join(' '));
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('allow_signup', 'true');
        
        // Redirect to GitHub
        window.location.href = authUrl.toString();
    }
    
    /**
     * Exchange authorization code for token (called by callback page)
     */
    async exchangeCodeForToken(code) {
        const clientId = this.getClientId();
        const clientSecret = sessionStorage.getItem(this.config.STORAGE.OAUTH_CLIENT_SECRET);
        
        if (!clientId || !clientSecret) {
            throw new Error('OAuth credentials not configured. Note: For better security, use Device Flow which does not require client secret.');
        }
        
        // Use custom CORS widget for token exchange
        if (this.corsWidget) {
            try {
                return await this.corsWidget.postForm(this.config.OAUTH.TOKEN_URL, {
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: code,
                    redirect_uri: this.config.OAUTH.REDIRECT_URI
                });
            } catch (error) {
                console.error('[CustomStaticBackend] Token exchange via CORS widget failed:', error);
                throw new Error('Token exchange failed. Consider using Device Flow instead.');
            }
        }
        
        // Fallback to direct fetch (will likely fail due to CORS)
        const response = await fetch(this.config.OAUTH.TOKEN_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: this.config.OAUTH.REDIRECT_URI
            })
        });
        
        if (!response.ok) {
            throw new Error(`Token exchange failed: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    /**
     * Store authentication token - VAULT ONLY (no localStorage fallback)
     * Security: Tokens are only stored in encrypted vault
     */
    async storeToken(token, type = 'copilot', passphrase = null) {
        try {
            // Ensure vault is available
            if (!window.CustomCorsWidget || !window.CustomCorsWidget.state.vaultDb) {
                throw new Error('Encrypted vault not initialized. Cannot store token securely.');
            }
            
            // Require passphrase for security
            if (!passphrase) {
                throw new Error('Passphrase required for secure token storage.');
            }
            
            const db = window.CustomCorsWidget.state.vaultDb;
            const cryptoKey = await this.deriveVaultKey(passphrase);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv }, 
                cryptoKey, 
                new TextEncoder().encode(token)
            );
            
            const transaction = db.transaction(['tokens'], 'readwrite');
            const store = transaction.objectStore('tokens');
            
            await new Promise((resolve, reject) => {
                const req = store.put({ 
                    key: `token_${type}`, 
                    encrypted: { 
                        iv: Array.from(iv), 
                        data: Array.from(new Uint8Array(encrypted)) 
                    }, 
                    timestamp: Date.now() 
                });
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
            
            console.log(`[Backend] 🔐 Token stored in encrypted vault: ${type}`);
            
            // Only broadcast AFTER successful storage
            this.broadcast({ type: 'TOKEN_UPDATE', tokenType: type });
        } catch (error) {
            console.error(`[Backend] Failed to store token securely:`, error.message);
            throw error; // Propagate error to caller
        }
    },
    
    /**
     * Get stored token - VAULT ONLY (no localStorage fallback)
     * Security: Tokens are only retrieved from encrypted vault
     */
    async getToken(type = 'copilot', passphrase = null) {
        try {
            // Ensure vault is available
            if (!window.CustomCorsWidget || !window.CustomCorsWidget.state.vaultDb) {
                throw new Error('Encrypted vault not initialized');
            }
            
            // Require passphrase
            if (!passphrase) {
                console.warn('[Backend] Passphrase required to retrieve token from vault');
                return null;
            }
            
            const db = window.CustomCorsWidget.state.vaultDb;
            const transaction = db.transaction(['tokens'], 'readonly');
            const store = transaction.objectStore('tokens');
            
            const record = await new Promise((resolve, reject) => {
                const req = store.get(`token_${type}`);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            
            if (!record) {
                console.log(`[Backend] No token found in vault: ${type}`);
                return null;
            }
            
            const cryptoKey = await this.deriveVaultKey(passphrase);
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(record.encrypted.iv) }, 
                cryptoKey, 
                new Uint8Array(record.encrypted.data)
            );
            
            console.log(`[Backend] 🔓 Token retrieved from vault: ${type}`);
            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error(`[Backend] Failed to retrieve token:`, error.message);
            return null;
        }
    },
    
    /**
     * Validate GitHub token
     */
    async validateGitHubToken(token) {
        try {
            const response = await fetch(this.config.ENDPOINTS.GITHUB_API + '/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                return {
                    valid: true,
                    user: userData
                };
            }
            
            return {
                valid: false,
                error: 'Invalid token'
            };
            
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }
    
    /**
     * Make API request with authentication
     */
    async apiRequest(endpoint, options = {}) {
        // Check cache for GET requests
        if (options.method === 'GET' || !options.method) {
            const cached = this.getFromCache(endpoint);
            if (cached) {
                console.log('[CustomStaticBackend] Returning cached response');
                return cached;
            }
        }
        
        // Get appropriate token (async)
        const token = await this.getToken('copilot') || await this.getToken('github');
        if (!token) {
            throw new Error('No authentication token available');
        }
        
        // Make request
        const response = await fetch(endpoint, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Cache successful GET requests
        if (options.method === 'GET' || !options.method) {
            this.setCache(endpoint, data);
        }
        
        return data;
    }
    
    /**
     * Cache management
     */
    getFromCache(key) {
        if (!this.config.CACHE.enabled) return null;
        
        const cached = this.state.cache.get(key);
        if (!cached) return null;
        
        // Check if expired
        if (Date.now() > cached.expiry) {
            this.state.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    setCache(key, data) {
        if (!this.config.CACHE.enabled) return;
        
        this.state.cache.set(key, {
            data: data,
            expiry: Date.now() + this.config.CACHE.ttl
        });
    }
    
    startCacheCleanup() {
        // Clean up expired cache entries periodically
        // Only if cache is enabled and has entries
        setInterval(() => {
            if (!this.config.CACHE.enabled || this.state.cache.size === 0) {
                return; // Skip if cache disabled or empty
            }
            
            const now = Date.now();
            let cleaned = 0;
            
            for (const [key, value] of this.state.cache.entries()) {
                if (now > value.expiry) {
                    this.state.cache.delete(key);
                    cleaned++;
                }
            }
            
            if (cleaned > 0 && this.config.debug) {
                console.log(`[CustomStaticBackend] Cleaned ${cleaned} expired cache entries`);
            }
        }, 60000); // Clean up every minute
    }
    
    /**
     * Broadcast message to other tabs
     */
    broadcast(message) {
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage(message);
        }
    }
    
    /**
     * Handle broadcast messages from other tabs
     */
    handleBroadcastMessage(event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'TOKEN_UPDATE':
                console.log('[CustomStaticBackend] Token updated in another tab');
                break;
                
            case 'CACHE_INVALIDATE':
                this.state.cache.delete(data.key);
                break;
        }
    }
    
    /**
     * Utility methods
     */
    getClientId() {
        return this.config.OAUTH.CLIENT_ID || localStorage.getItem(this.config.STORAGE.OAUTH_CLIENT_ID);
    }
    
    setClientId(clientId) {
        this.config.OAUTH.CLIENT_ID = clientId;
        localStorage.setItem(this.config.STORAGE.OAUTH_CLIENT_ID, clientId);
    }
    
    /**
     * Set OAuth App ID (for custom OAuth apps)
     */
    setAppId(appId) {
        this.config.OAUTH.APP_ID = appId;
        localStorage.setItem('oauth_app_id', appId);
    }
    
    /**
     * Derive vault encryption key from passphrase
     */
    async deriveVaultKey(passphrase) {
        // Check if vault is initialized
        const hasVault = !!(window.CustomCorsWidget?.state.vaultDb);
        if (!hasVault) {
            throw new Error('Vault not initialized');
        }

        // Get or create salt
        let saltArray = [];
        try {
            const storedSalt = localStorage.getItem('sfti_vault_salt');
            if (storedSalt) {
                saltArray = JSON.parse(storedSalt);
            }
        } catch (e) {
            // If parsing fails, we'll regenerate the salt below
            saltArray = [];
        }

        if (!Array.isArray(saltArray) || saltArray.length === 0) {
            // Generate a new cryptographically secure salt and persist it
            const saltBytes = new Uint8Array(this.config.CRYPTO.SALT_BYTES);
            if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                crypto.getRandomValues(saltBytes);
            } else {
                // Fallback for older browsers (less secure)
                console.warn('[CustomStaticBackend] crypto.getRandomValues not available, using Math.random fallback for vault salt');
                for (let i = 0; i < saltBytes.length; i++) {
                    saltBytes[i] = Math.floor(Math.random() * 256);
                }
            }
            saltArray = Array.from(saltBytes);
            localStorage.setItem('sfti_vault_salt', JSON.stringify(saltArray));
            console.log('[CustomStaticBackend] Generated and stored new vault salt');
        }

        const salt = new Uint8Array(saltArray);
        const passphraseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
        return await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: this.config.CRYPTO.PBKDF2_ITERATIONS, hash: 'SHA-256' }, passphraseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }
    
    /**
     * Set client secret (SECURITY WARNING: prefer Device Flow)
     * Stores in IndexedDB for persistence across sessions
     */
    async setClientSecret(clientSecret) {
        console.warn('[Backend] Client secret storage is a security risk. Use Device Flow instead.');
        this.config.OAUTH.CLIENT_SECRET = clientSecret;
        
        // Store in IndexedDB for persistence
        try {
            if (!window.CustomCorsWidget?.state.vaultDb) {
                throw new Error('Vault not initialized');
            }
            
            const db = window.CustomCorsWidget.state.vaultDb;
            const transaction = db.transaction(['tokens'], 'readwrite');
            const store = transaction.objectStore('tokens');
            store.put({ key: 'oauth_client_secret', value: clientSecret });
            
            await new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
            
            console.log('[Backend] CLIENT_SECRET stored in IndexedDB');
        } catch (e) {
            console.error('[Backend] Failed to store CLIENT_SECRET in IndexedDB:', e.message);
            // Fallback to sessionStorage (less persistent)
            sessionStorage.setItem(this.config.STORAGE.OAUTH_CLIENT_SECRET, clientSecret);
        }
    }
    
    generateState() {
        // Use crypto.getRandomValues if available, fallback to Math.random
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        } else {
            // Fallback for older browsers (less secure)
            console.warn('[CustomStaticBackend] crypto.getRandomValues not available, using Math.random fallback');
            return Array.from({ length: 32 }, () => 
                Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
            ).join('');
        }
    }
}

// Create global instance
const customStaticBackend = new CustomStaticBackend();
window.CustomStaticBackend = customStaticBackend;

console.log('[CustomStaticBackend] Module loaded and ready');
