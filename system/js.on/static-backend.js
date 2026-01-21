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
                // Note: Client Secret storage is a security risk on static sites
                // Device Flow (recommended) doesn't require client secret
                CLIENT_SECRET: sessionStorage.getItem('oauth_client_secret') || '', // Using sessionStorage for better security
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
            
            // Rate limiting
            RATE_LIMIT: {
                maxRequests: 60,
                windowMs: 60000 // 1 minute
            },
            
            // Cache settings
            CACHE: {
                enabled: true,
                ttl: 300000 // 5 minutes
            }
        };
        
        this.state = {
            rateLimitCounter: new Map(),
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
        
        console.log('[CustomStaticBackend] Initialized successfully');
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
                        this.storeToken(data.access_token, 'github');
                        
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
     * Store authentication token
     */
    storeToken(token, type = 'copilot') {
        if (type === 'copilot') {
            localStorage.setItem(this.config.STORAGE.COPILOT_TOKEN, token);
            // Set expiry to 8 hours
            const expiry = Date.now() + (8 * 60 * 60 * 1000);
            localStorage.setItem(this.config.STORAGE.COPILOT_EXPIRY, expiry.toString());
        } else {
            localStorage.setItem(this.config.STORAGE.GITHUB_TOKEN, token);
        }
        
        // Broadcast token update to other tabs
        this.broadcast({
            type: 'TOKEN_UPDATE',
            tokenType: type,
            token: token
        });
    }
    
    /**
     * Get stored token
     */
    getToken(type = 'copilot') {
        if (type === 'copilot') {
            const token = localStorage.getItem(this.config.STORAGE.COPILOT_TOKEN);
            const expiry = localStorage.getItem(this.config.STORAGE.COPILOT_EXPIRY);
            
            // Check if expired
            if (token && expiry && Date.now() < parseInt(expiry)) {
                return token;
            }
            
            return null;
        }
        
        return localStorage.getItem(this.config.STORAGE.GITHUB_TOKEN);
    }
    
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
        // Check rate limit
        if (!this.checkRateLimit(endpoint)) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        
        // Check cache for GET requests
        if (options.method === 'GET' || !options.method) {
            const cached = this.getFromCache(endpoint);
            if (cached) {
                console.log('[CustomStaticBackend] Returning cached response');
                return cached;
            }
        }
        
        // Get appropriate token
        const token = this.getToken('copilot') || this.getToken('github');
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
     * Rate limiting
     */
    checkRateLimit(key) {
        const now = Date.now();
        const requests = this.state.rateLimitCounter.get(key) || [];
        
        // Remove old requests outside the window
        const validRequests = requests.filter(
            timestamp => now - timestamp < this.config.RATE_LIMIT.windowMs
        );
        
        // Check if limit exceeded
        if (validRequests.length >= this.config.RATE_LIMIT.maxRequests) {
            return false;
        }
        
        // Add current request
        validRequests.push(now);
        this.state.rateLimitCounter.set(key, validRequests);
        
        return true;
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
     * Set client secret (SECURITY WARNING: sessionStorage only, prefer Device Flow)
     */
    setClientSecret(clientSecret) {
        console.warn('[CustomStaticBackend] Client secret storage is a security risk. Consider using Device Flow instead.');
        this.config.OAUTH.CLIENT_SECRET = clientSecret;
        sessionStorage.setItem(this.config.STORAGE.OAUTH_CLIENT_SECRET, clientSecret);
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
