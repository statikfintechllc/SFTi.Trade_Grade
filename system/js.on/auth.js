// auth.js - Authentication and token management
// Handles GitHub OAuth, token storage, StaticBackend server for API routing

/**
 * Reload models after authentication
 * Handles both GitHub PAT and OAuth Copilot authentication
 */
async function reloadModelsAfterAuth() {
    try {
        const token = localStorage.getItem('githubToken');
        
        // If we have a GitHub token, validate it first
        if (token) {
            updateModelStatus('loading', 'Loading models...', '#ff9800');
            StaticBackend.setGitHubToken(token);
            const validation = await StaticBackend.validateGitHubToken(token);
            if (!validation.valid) {
                console.error('Token validation failed:', validation.error);
            }
        }
        
        // Always get available models (includes both Azure and Copilot based on what tokens exist)
        const models = await StaticBackend.getAvailableModels();
        
        if (models.length === 0) {
            showToast('No models available. Please configure authentication.', 'warning', 'No Models');
            updateModelStatus('error', 'No models', '#ff4444');
            clearModelPicker();
            return;
        }
        
        // Show success message with model count
        const azureCount = models.filter(m => m.endpoint === 'azure').length;
        const copilotCount = models.filter(m => m.endpoint === 'copilot').length;
        
        let toastMsg = '';
        if (azureCount > 0) {
            toastMsg = `${azureCount} Azure model${azureCount !== 1 ? 's' : ''}`;
        }
        if (copilotCount > 0) {
            toastMsg += (toastMsg ? ' + ' : '') + `${copilotCount} Copilot model${copilotCount !== 1 ? 's' : ''}`;
        }
        
        showToast(toastMsg, 'success', `${models.length} Models Loaded`, 5000);
        updateModelStatus('ready', `${models.length} models ready`, '#00bfa5');
        
        localStorage.setItem('availableModels', JSON.stringify(models));
        populateModelPicker(models);
        
    } catch (error) {
        console.error('Error reloading models:', error);
        showToast('Error loading models: ' + error.message, 'error', 'Load Error');
        updateModelStatus('error', 'Load failed', '#ff4444');
    }
}

/**
 * GitHub Token Modal Management
 */
function showGithubTokenModal() {
    const modal = document.getElementById('githubTokenModal');
    const input = document.getElementById('githubTokenInput');
    // Load existing token if available
    const token = localStorage.getItem('githubToken');
    if (token) {
        input.value = token;
    }
    modal.classList.add('active');
    input.focus();
    // Load OAuth credentials
    updateOAuthUI();
    updateStaticBackendStatus();
}

function hideGithubTokenModal() {
    const modal = document.getElementById('githubTokenModal');
    modal.classList.remove('active');
    // Don't clear the input - preserve it in case user reopens
}

async function saveGithubToken() {
    const token = document.getElementById('githubTokenInput').value.trim();
    if (token) {
        localStorage.setItem('githubToken', token);
        document.getElementById('githubTokenInput').value = ''; // Clear for security after save
        hideGithubTokenModal();
        
        // Update status displays
        updateGithubTokenStatus(true, 'Token configured');
        updateModelStatus('loading', 'Loading models...', '#ff9800');
        
        showToast('Token saved, fetching available models...', 'success', 'Token Saved');
        
        // Fetch and cache user avatar
        await fetchAndCacheUserAvatar(token);
        
        await fetchAvailableModels(token);
    } else {
        showToast('Please enter a valid token', 'warning', 'Invalid Token');
    }
}

/**
 * Fetch and cache GitHub user avatar
 */
async function fetchAndCacheUserAvatar(token) {
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            if (userData.avatar_url) {
                // Cache the avatar URL and username
                localStorage.setItem('githubAvatarUrl', userData.avatar_url);
                localStorage.setItem('githubUsername', userData.login || 'User');
                console.log('GitHub avatar cached:', userData.avatar_url);
            }
        } else {
            console.warn('Could not fetch GitHub user info:', response.status);
        }
    } catch (error) {
        console.error('Error fetching GitHub user avatar:', error);
    }
}

/**
 * Get cached user avatar URL
 */
function getUserAvatarUrl() {
    return localStorage.getItem('githubAvatarUrl');
}

/**
 * Get Copilot SVG for AI avatar
 */
function getCopilotSvg() {
    return `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>`;
}

/**
 * API Token Modal functions
 */
function showApiTokenModal() {
    const modal = document.getElementById('apiTokenModal');
    modal.classList.add('active');
}

function hideApiTokenModal() {
    const modal = document.getElementById('apiTokenModal');
    modal.classList.remove('active');
}

/**
 * Market API Modal functions
 */
function showMarketApiModal() {
    const modal = document.getElementById('marketApiModal');
    modal.classList.add('active');
    updateStaticBackendStatus();
    updateOAuthUI();
}

function hideMarketApiModal() {
    const modal = document.getElementById('marketApiModal');
    modal.classList.remove('active');
}

/**
 * Update GitHub token status display
 * @param {boolean} hasToken - Whether a token is configured
 * @param {string} message - Status message to display
 */
function updateGithubTokenStatus(hasToken, message) {
    const statusText = document.getElementById('githubTokenStatusText');
    
    if (statusText) {
        statusText.textContent = message || (hasToken ? 'Token configured' : 'Click to configure');
        statusText.style.color = hasToken ? '#00bfa5' : '#666';
    }
}

/**
 * OAuth Functions
 */
function updateStaticBackendStatus() {
    const statusEl = document.getElementById('staticBackendStatus');
    const copilotEl = document.getElementById('copilotModelStatus');
    
    if (statusEl) {
        const hasToken = !!localStorage.getItem('githubToken');
        statusEl.innerHTML = hasToken ? '● Active' : '○ No Token';
        statusEl.style.color = hasToken ? '#4caf50' : '#888';
    }
    
    if (copilotEl) {
        const hasCopilot = !!localStorage.getItem('copilotToken');
        copilotEl.textContent = hasCopilot ? '4 Available' : 'Auth Required';
        copilotEl.style.color = hasCopilot ? '#00bfa5' : '#888';
    }
}

/**
 * Update OAuth UI based on current state
 */
function updateOAuthUI() {
    const clientIdInput = document.getElementById('oauthClientIdInput');
    const clientSecretInput = document.getElementById('oauthClientSecretInput');
    const clientIdStatus = document.getElementById('oauthClientIdStatus');
    const webFlowBtn = document.getElementById('btnWebFlowAuth');
    const deviceFlowBtn = document.getElementById('btnDeviceFlowAuth');
    const connectedSection = document.getElementById('copilotConnectedSection');
    const deviceSection = document.getElementById('deviceFlowSection');
    
    // Load saved credentials
    const savedClientId = localStorage.getItem('oauth_client_id');
    const savedClientSecret = localStorage.getItem('oauth_client_secret');
    
    if (clientIdInput && savedClientId) {
        clientIdInput.value = savedClientId;
    }
    if (clientSecretInput && savedClientSecret) {
        clientSecretInput.value = savedClientSecret;
    }
    
    // Update status
    if (clientIdStatus) {
        if (savedClientId && savedClientSecret) {
            clientIdStatus.textContent = '✓ OAuth credentials configured';
            clientIdStatus.style.color = '#4caf50';
        } else if (savedClientId) {
            clientIdStatus.textContent = '⚠ Client Secret needed';
            clientIdStatus.style.color = '#ffa000';
        } else {
            clientIdStatus.textContent = 'Enter your OAuth App credentials from GitHub';
            clientIdStatus.style.color = '#666';
        }
    }
    
    // Enable/disable auth buttons based on complete credentials
    const hasCredentials = !!(savedClientId && savedClientSecret);
    if (webFlowBtn) {
        webFlowBtn.disabled = !hasCredentials;
        webFlowBtn.style.opacity = hasCredentials ? '1' : '0.5';
    }
    if (deviceFlowBtn) {
        // Device flow only needs Client ID
        const hasClientId = !!savedClientId;
        deviceFlowBtn.disabled = !hasClientId;
        deviceFlowBtn.style.opacity = hasClientId ? '1' : '0.5';
    }
    
    // Show connected status if Copilot token exists
    const hasCopilotToken = !!localStorage.getItem('copilotToken');
    if (connectedSection) {
        connectedSection.style.display = hasCopilotToken ? 'block' : 'none';
    }
    if (deviceSection && !deviceFlowPolling) {
        deviceSection.style.display = 'none';
    }
}

/**
 * Save OAuth Credentials (Client ID and Secret)
 */
function saveOAuthCredentials() {
    const clientIdInput = document.getElementById('oauthClientIdInput');
    const clientSecretInput = document.getElementById('oauthClientSecretInput');
    const clientId = clientIdInput.value.trim();
    const clientSecret = clientSecretInput.value.trim();
    
    if (!clientId) {
        showToast('Please enter a Client ID', 'warning', 'Missing Client ID');
        return;
    }
    
    if (!clientSecret) {
        showToast('Please enter a Client Secret', 'warning', 'Missing Client Secret');
        return;
    }
    
    // Validate Client ID format (should start with Ov23li or similar)
    // GitHub OAuth App Client IDs can have various formats
    if (clientId.length < 10) {
        showToast('Client ID seems too short', 'warning', 'Check Format');
        return;
    }
    
    // Validate Client Secret format (40-character hex string)
    const hexRegex = /^[a-f0-9]{40}$/i;
    if (!hexRegex.test(clientSecret)) {
        showToast('Client Secret should be a 40-character hex string', 'warning', 'Invalid Format');
        return;
    }
    
    localStorage.setItem('oauth_client_id', clientId);
    localStorage.setItem('oauth_client_secret', clientSecret);
    StaticBackend.setOAuthClientId(clientId);
    showToast('OAuth credentials saved!', 'success', 'Saved');
    updateOAuthUI();
}

/**
 * Legacy function for backwards compatibility
 */
function saveOAuthClientId() {
    saveOAuthCredentials();
}

/**
 * Start Web Flow OAuth (using popup mode)
 */
async function startWebFlowAuth() {
    try {
        const clientId = localStorage.getItem('oauth_client_id');
        if (!clientId) {
            showToast('Please configure OAuth Client ID first', 'warning', 'Missing Client ID');
            return;
        }
        
        showToast('Opening GitHub authorization...', 'info', 'OAuth');
        
        // Use popup mode instead of redirect
        const result = await StaticBackend.initiatePopupAuth();
        
        if (result.success) {
            showToast('GitHub Copilot connected!', 'success', 'Connected');
            updateOAuthUI();
            updateStaticBackendStatus();
            await reloadModelsAfterAuth();
        }
    } catch (error) {
        console.error('Web Flow auth error:', error);
        showToast(error.message, 'error', 'Auth Error');
    }
}

/**
 * Device Flow state
 */
let deviceFlowPolling = false;
let deviceFlowAbort = null;

/**
 * Start Device Flow OAuth
 */
async function startDeviceFlowAuth() {
    try {
        const clientId = localStorage.getItem('oauth_client_id');
        if (!clientId) {
            showToast('Please configure OAuth Client ID first', 'warning', 'Missing Client ID');
            return;
        }
        
        const deviceSection = document.getElementById('deviceFlowSection');
        const codeEl = document.getElementById('deviceFlowCode');
        const uriEl = document.getElementById('deviceFlowUri');
        const statusEl = document.getElementById('deviceFlowStatus');
        
        // Show device flow section
        deviceSection.style.display = 'block';
        statusEl.textContent = 'Requesting device code...';
        
        // Initiate device flow
        const authInfo = await StaticBackend.initiateCopilotAuth();
        
        // Display code
        codeEl.textContent = authInfo.user_code;
        uriEl.href = authInfo.verification_uri_complete || authInfo.verification_uri;
        uriEl.textContent = authInfo.verification_uri;
        statusEl.textContent = 'Enter the code above at the link, then wait...';
        
        // Start polling
        deviceFlowPolling = true;
        
        const result = await StaticBackend.startDeviceFlowPolling(
            authInfo.device_code,
            authInfo.interval,
            (progress) => {
                statusEl.textContent = `Waiting for authorization... (${progress.attempts}/${progress.maxAttempts})`;
            }
        );
        
        deviceFlowPolling = false;
        
        if (result.success) {
            showToast('GitHub Copilot connected successfully!', 'success', 'Connected');
            deviceSection.style.display = 'none';
            updateOAuthUI();
            updateStaticBackendStatus();
            await reloadModelsAfterAuth();
        } else {
            showToast(result.error || 'Authentication failed', 'error', 'Auth Failed');
            statusEl.textContent = result.error || 'Authentication failed. Please try again.';
        }
    } catch (error) {
        deviceFlowPolling = false;
        console.error('Device Flow auth error:', error);
        showToast(error.message, 'error', 'Auth Error');
        
        const statusEl = document.getElementById('deviceFlowStatus');
        if (statusEl) {
            statusEl.textContent = error.message;
        }
    }
}

/**
 * Cancel device flow polling
 */
function cancelDeviceFlow() {
    deviceFlowPolling = false;
    localStorage.removeItem('device_code_data');
    
    const deviceSection = document.getElementById('deviceFlowSection');
    if (deviceSection) {
        deviceSection.style.display = 'none';
    }
    
    showToast('Device flow cancelled', 'info', 'Cancelled');
}

/**
 * Disconnect Copilot
 */
function disconnectCopilot() {
    localStorage.removeItem('copilotToken');
    localStorage.removeItem('copilotTokenExpiry');
    StaticBackend.tokens.copilot = null;
    StaticBackend.tokens.copilotExpiry = null;
    
    showToast('Copilot disconnected', 'info', 'Disconnected');
    updateOAuthUI();
    updateStaticBackendStatus();
    
    // Refresh models to show only Azure models (if GitHub token still exists)
    reloadModelsAfterAuth();
}

/**
 * Legacy function - now uses new OAuth system
 */
async function initiateCopilotAuth() {
    showMarketApiModal();
}

/**
 * Quick Actions Popup Management
 */
function toggleQuickActionsPopup(event) {
    event.stopPropagation();
    const popup = document.getElementById('quickActionsPopup');
    popup.classList.toggle('active');
    
    // Close popup when clicking outside
    if (popup.classList.contains('active')) {
        document.addEventListener('click', closeQuickActionsPopupOnOutsideClick);
    }
}

function hideQuickActionsPopup() {
    const popup = document.getElementById('quickActionsPopup');
    popup.classList.remove('active');
    document.removeEventListener('click', closeQuickActionsPopupOnOutsideClick);
}

function closeQuickActionsPopupOnOutsideClick(event) {
    const popup = document.getElementById('quickActionsPopup');
    const moreBtn = event.target.closest('.more-menu-btn');
    if (!popup.contains(event.target) && !moreBtn) {
        hideQuickActionsPopup();
    }
}

/**
 * StaticBackend Server Class
 * Handles OAuth, token management, CORS proxy, and device flow
 */
const StaticBackend = {
    // =============================================
    // STATIC BACKEND SERVER - OAuth Configuration
    // =============================================
    // GitHub OAuth App ID: 2631011
    // Homepage: https://statikfintechllc.github.io/SFTi.Trade_Grade/
    // Callback: https://statikfintechllc.github.io/SFTi.Trade_Grade/system/auth/callback
    
    // OAuth Configuration
    OAUTH_CONFIG: {
        // GitHub OAuth App ID (hardcoded)
        APP_ID: '2631011',
        // Client ID - provided by user from their GitHub OAuth App settings
        CLIENT_ID: localStorage.getItem('oauth_client_id') || '',
        // Client Secret - loaded from IndexedDB (persistent across sessions)
        CLIENT_SECRET: '', // Loaded async from IndexedDB
        // IMPORTANT: Callback URL must match EXACTLY what's registered in GitHub OAuth App
        // GitHub OAuth App callback: https://statikfintechllc.github.io/SFTi.Trade_Grade/system/auth/callback
        REDIRECT_URI: (() => {
            // Construct the base path correctly to match GitHub OAuth app configuration
            let basePath = window.location.pathname;
            
            // Remove index.html if present
            if (basePath.endsWith('/index.html')) {
                basePath = basePath.slice(0, -11); // Remove '/index.html'
            }
            
            // Remove trailing slash if present
            if (basePath.endsWith('/')) {
                basePath = basePath.slice(0, -1);
            }
            
            // If we're at root, basePath will be empty, which is correct
            const redirectUri = window.location.origin + basePath + '/system/auth/callback';
            console.log('[OAuth] Constructed redirect_uri:', redirectUri);
            console.log('[OAuth] Expected redirect_uri: https://statikfintechllc.github.io/SFTi.Trade_Grade/system/auth/callback');
            
            return redirectUri;
        })(),
        SCOPES: ['read:user', 'user:email'],
        AUTH_URL: 'https://github.com/login/oauth/authorize',
        TOKEN_URL: 'https://github.com/login/oauth/access_token',
        DEVICE_CODE_URL: 'https://github.com/login/device/code'
    },
    
    // API Endpoints
    ENDPOINTS: {
        // GitHub Models API (via Azure inference)
        AZURE_INFERENCE: 'https://models.inference.ai.azure.com',
        // GitHub Copilot API (requires Copilot subscription)
        COPILOT_CHAT: 'https://api.githubcopilot.com/chat/completions',
        // GitHub REST API for models catalog
        GITHUB_MODELS: 'https://api.github.com/marketplace_listing/plans'
    },
    
    // All available models - curated list from GitHub Models
    ALL_MODELS: {
        // Azure Inference Models (work with GitHub PAT)
        azure: [
            { name: 'gpt-4o', friendly_name: 'GPT-4o', provider: 'OpenAI', endpoint: 'azure' },
            { name: 'gpt-4o-mini', friendly_name: 'GPT-4o mini', provider: 'OpenAI', endpoint: 'azure' },
            { name: 'Mistral-Nemo', friendly_name: 'Mistral Nemo', provider: 'Mistral AI', endpoint: 'azure' }
        ],
        // GitHub Copilot Models (require Copilot subscription + OAuth)
        copilot: [
            { name: 'gpt-4', friendly_name: 'GPT-4', provider: 'OpenAI', endpoint: 'copilot' },
            { name: 'gpt-4o', friendly_name: 'GPT-4o', provider: 'OpenAI', endpoint: 'copilot' },
            { name: 'claude-3.5-sonnet', friendly_name: 'Claude 3.5 Sonnet', provider: 'Anthropic', endpoint: 'copilot' },
            { name: 'gemini-1.5-pro', friendly_name: 'Gemini 1.5 Pro', provider: 'Google', endpoint: 'copilot' }
        ]
    },
    
    // Token storage
    tokens: {
        github: null,      // GitHub PAT (Personal Access Token)
        copilot: null,     // Copilot OAuth token
        copilotExpiry: null
    },
    
    // Initialize the static backend
    async init() {
        console.log('[StaticBackend] Initializing...');
        
        // Load saved tokens
        this.tokens.github = localStorage.getItem('githubToken');
        this.tokens.copilot = localStorage.getItem('copilotToken');
        this.tokens.copilotExpiry = localStorage.getItem('copilotTokenExpiry');
        
        // Check if Copilot token is expired
        if (this.tokens.copilotExpiry && Date.now() > parseInt(this.tokens.copilotExpiry)) {
            console.log('[StaticBackend] Copilot token expired, clearing...');
            this.tokens.copilot = null;
            localStorage.removeItem('copilotToken');
            localStorage.removeItem('copilotTokenExpiry');
        }
        
        // Set up message channel for cross-tab communication
        if ('BroadcastChannel' in window) {
            this.channel = new BroadcastChannel('sfti-backend');
            this.channel.onmessage = (event) => this.handleMessage(event.data);
        }
        
        console.log('[StaticBackend] Initialized', {
            hasGitHubToken: !!this.tokens.github,
            hasCopilotToken: !!this.tokens.copilot
        });
        
        return this;
    },
    
    // Handle cross-tab messages
    handleMessage(data) {
        if (data.type === 'TOKEN_UPDATE') {
            this.tokens[data.tokenType] = data.token;
        }
    },
    
    // Broadcast token updates to other tabs
    broadcastTokenUpdate(tokenType, token) {
        if (this.channel) {
            this.channel.postMessage({ type: 'TOKEN_UPDATE', tokenType, token });
        }
    },
    
    // Get available models based on current authentication
    async getAvailableModels() {
        const models = [];
        
        // Always include Azure models if we have a GitHub token
        if (this.tokens.github) {
            models.push(...this.ALL_MODELS.azure);
        }
        
        // Include Copilot models if we have a Copilot token
        if (this.tokens.copilot) {
            models.push(...this.ALL_MODELS.copilot);
        }
        
        return models;
    },
    
    // Make a chat completion request
    async chatCompletion(model, messages, options = {}) {
        const modelConfig = this.findModel(model);
        
        if (!modelConfig) {
            throw new Error(`Unknown model: ${model}`);
        }
        
        // Route to appropriate endpoint
        if (modelConfig.endpoint === 'copilot' && this.tokens.copilot) {
            return this.copilotCompletion(model, messages, options);
        } else if (modelConfig.endpoint === 'azure' || this.tokens.github) {
            return this.azureCompletion(model, messages, options);
        } else {
            throw new Error('No valid authentication token available');
        }
    },
    
    // Find model configuration
    findModel(modelName) {
        for (const category of Object.values(this.ALL_MODELS)) {
            const found = category.find(m => m.name === modelName);
            if (found) return found;
        }
        return null;
    },
    
    // Azure Inference API completion
    async azureCompletion(model, messages, options = {}) {
        const response = await fetch(`${this.ENDPOINTS.AZURE_INFERENCE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.tokens.github}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                max_tokens: options.max_tokens || 4096,
                temperature: options.temperature || 0.7,
                ...options
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Azure API Error: ${response.status} - ${error}`);
        }
        
        return response.json();
    },
    
    // GitHub Copilot API completion (requires OAuth token)
    async copilotCompletion(model, messages, options = {}) {
        if (!this.tokens.copilot) {
            throw new Error('Copilot authentication required. Please authenticate with GitHub Copilot.');
        }
        
        const response = await fetch(this.ENDPOINTS.COPILOT_CHAT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.tokens.copilot}`,
                'Editor-Version': 'SFTi-PREP/1.0',
                'Editor-Plugin-Version': '1.0.0',
                'Openai-Organization': 'github-copilot',
                'X-GitHub-Api-Version': '2024-12-01'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                max_tokens: options.max_tokens || 4096,
                temperature: options.temperature || 0.7,
                ...options
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Copilot API Error: ${response.status} - ${error}`);
        }
        
        return response.json();
    },
    
    // Set GitHub PAT token
    setGitHubToken(token) {
        this.tokens.github = token;
        localStorage.setItem('githubToken', token);
        this.broadcastTokenUpdate('github', token);
    },
    
    // Validate GitHub token
    async validateGitHubToken(token) {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json'
                }
            });
            
            if (response.ok) {
                const user = await response.json();
                return { valid: true, user };
            }
            return { valid: false, error: 'Invalid token' };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    },
    
    // Set OAuth Client ID (from GitHub App settings)
    setOAuthClientId(clientId) {
        this.OAUTH_CONFIG.CLIENT_ID = clientId;
        localStorage.setItem('oauth_client_id', clientId);
        console.log('[StaticBackend] OAuth Client ID configured');
    },
    
    // Get OAuth Client ID
    getOAuthClientId() {
        return this.OAUTH_CONFIG.CLIENT_ID || localStorage.getItem('oauth_client_id');
    },
    
    // Generate random state for CSRF protection
    generateState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    },
    
    // =============================================
    // OAuth Web Flow (Redirect-based)
    // =============================================
    initiateWebFlowAuth() {
        const clientId = this.getOAuthClientId();
        
        if (!clientId) {
            throw new Error('OAuth Client ID not configured. Please enter your GitHub OAuth App Client ID.');
        }
        
        // Generate and store state for CSRF protection
        const state = this.generateState();
        localStorage.setItem('oauth_state', state);
        
        // Build authorization URL
        const authUrl = new URL(this.OAUTH_CONFIG.AUTH_URL);
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', this.OAUTH_CONFIG.REDIRECT_URI);
        authUrl.searchParams.set('scope', this.OAUTH_CONFIG.SCOPES.join(' '));
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('allow_signup', 'true');
        
        console.log('[StaticBackend] Initiating OAuth Web Flow:', authUrl.toString());
        
        // Redirect to GitHub authorization page
        window.location.href = authUrl.toString();
    },
    
    // Open OAuth in popup window (alternative to redirect)
    initiatePopupAuth() {
        const clientId = this.getOAuthClientId();
        
        if (!clientId) {
            throw new Error('OAuth Client ID not configured. Please enter your GitHub OAuth App Client ID.');
        }
        
        // Generate and store state for CSRF protection
        const state = this.generateState();
        localStorage.setItem('oauth_state', state);
        
        // Build authorization URL
        const authUrl = new URL(this.OAUTH_CONFIG.AUTH_URL);
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', this.OAUTH_CONFIG.REDIRECT_URI);
        authUrl.searchParams.set('scope', this.OAUTH_CONFIG.SCOPES.join(' '));
        authUrl.searchParams.set('state', state);
        
        // Open popup
        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        const popup = window.open(
            authUrl.toString(),
            'github-oauth',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
        );
        
        if (!popup) {
            throw new Error('Popup blocked. Please allow popups or use redirect flow.');
        }
        
        // Listen for OAuth completion message from callback
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('OAuth timeout. Please try again.'));
            }, 300000); // 5 minute timeout
            
            const messageHandler = (event) => {
                // Verify origin
                if (!event.origin.includes('github.io') && !event.origin.includes('localhost')) {
                    return;
                }
                
                if (event.data.type === 'OAUTH_SUCCESS') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    
                    // Store token
                    this.tokens.copilot = event.data.token;
                    localStorage.setItem('copilotToken', event.data.token);
                    this.broadcastTokenUpdate('copilot', event.data.token);
                    
                    resolve({ success: true, token: event.data.token });
                }
                
                if (event.data.type === 'OAUTH_ERROR') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    reject(new Error(event.data.error));
                }
            };
            
            window.addEventListener('message', messageHandler);
            
            // Check if popup was closed without completing
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    
                    // Check if token was stored (callback completed)
                    const token = localStorage.getItem('copilotToken');
                    if (token && token !== this.tokens.copilot) {
                        this.tokens.copilot = token;
                        resolve({ success: true, token });
                    } else {
                        reject(new Error('OAuth cancelled or failed.'));
                    }
                }
            }, 1000);
        });
    },
    
    // =============================================
    // CORS BYPASS WIDGET - Unlocked GitHub Pages
    // =============================================
    // This widget enables CORS-bypassed POST requests from static sites
    // Uses multiple proxy strategies with automatic fallback
    // =============================================
    
    CorsWidget: {
        // Available CORS proxy services (tried in order)
        // These are PUBLIC CORS proxies - for production, consider your own proxy
        PROXIES: [
            {
                name: 'corsproxy.io',
                urlBuilder: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
                supportsPost: true,
                headers: {}
            },
            {
                name: 'cors.sh',
                urlBuilder: (url) => `https://proxy.cors.sh/${url}`,
                supportsPost: true,
                headers: { 'x-cors-api-key': 'temp_demo' }
            },
            {
                name: 'crossorigin.me',
                urlBuilder: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
                supportsPost: true,
                headers: {}
            }
        ],
        
        // Current active proxy index
        activeProxyIndex: 0,
        
        // Make a CORS-bypassed request
        async fetch(url, options = {}) {
            const method = options.method || 'GET';
            const headers = options.headers || {};
            const body = options.body;
            
            // For GET requests, try direct first
            if (method === 'GET') {
                try {
                    const directResponse = await fetch(url, { ...options, mode: 'cors' });
                    if (directResponse.ok) return directResponse;
                } catch (e) {
                    console.log('[CorsWidget] Direct GET failed, using proxy');
                }
            }
            
            // Try proxies in order until one works
            let lastError = null;
            for (let i = 0; i < this.PROXIES.length; i++) {
                const proxyIndex = (this.activeProxyIndex + i) % this.PROXIES.length;
                const proxy = this.PROXIES[proxyIndex];
                
                try {
                    const proxyUrl = proxy.urlBuilder(url);
                    const proxyHeaders = { ...headers, ...proxy.headers };
                    
                    let response;
                    if (method === 'POST' && proxy.supportsPost) {
                        response = await fetch(proxyUrl, {
                            method: 'POST',
                            headers: proxyHeaders,
                            body: body
                        });
                    } else if (method === 'POST' && !proxy.supportsPost) {
                        // For proxies that don't support POST, we need to encode data in URL
                        // This is a limitation - use a POST-supporting proxy first
                        continue;
                    } else {
                        response = await fetch(proxyUrl, {
                            method: 'GET',
                            headers: proxyHeaders
                        });
                    }
                    
                    if (response.ok) {
                        // Remember this working proxy for next time
                        this.activeProxyIndex = proxyIndex;
                        console.log(`[CorsWidget] Success with ${proxy.name}`);
                        return response;
                    }
                } catch (error) {
                    lastError = error;
                    console.log(`[CorsWidget] ${proxy.name} failed:`, error.message);
                }
            }
            
            throw new Error(`All CORS proxies failed. Last error: ${lastError?.message}`);
        },
        
        // POST with JSON body
        async postJson(url, data) {
            const response = await this.fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });
            return response.json();
        },
        
        // POST with form-urlencoded body (for OAuth)
        async postForm(url, data) {
            const formData = new URLSearchParams();
            for (const [key, value] of Object.entries(data)) {
                formData.append(key, value);
            }
            
            const response = await this.fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: formData.toString()
            });
            return response.json();
        }
    },
    
    // =============================================
    // GitHub OAuth Device Flow for Copilot
    // This allows authentication without a backend server!
    // Uses CorsWidget for CORS-bypassed requests
    // =============================================
    
    // Helper: Make CORS-proxied POST request to GitHub OAuth
    async corsProxiedOAuthRequest(endpoint, data) {
        console.log('[StaticBackend] OAuth request to:', endpoint);
        
        try {
            // Use CorsWidget for CORS-bypassed POST
            const result = await this.CorsWidget.postForm(endpoint, data);
            console.log('[StaticBackend] OAuth response:', result);
            return result;
        } catch (error) {
            console.error('[StaticBackend] OAuth request failed:', error);
            throw new Error(`OAuth request failed: ${error.message}`);
        }
    },
    
    async initiateCopilotAuth() {
        const clientId = this.getOAuthClientId();
        
        if (!clientId) {
            throw new Error('OAuth Client ID not configured. Please enter your GitHub OAuth App Client ID in the settings.');
        }
        
        try {
            console.log('[StaticBackend] Initiating Device Flow with Client ID:', clientId);
            
            // Step 1: Request device code from GitHub
            const codeData = await this.corsProxiedOAuthRequest(
                this.OAUTH_CONFIG.DEVICE_CODE_URL,
                {
                    client_id: clientId,
                    scope: this.OAUTH_CONFIG.SCOPES.join(' ')
                }
            );
            
            console.log('[StaticBackend] Device code response:', codeData);
            
            if (codeData.error) {
                throw new Error(codeData.error_description || codeData.error);
            }
            
            if (!codeData.device_code || !codeData.user_code) {
                throw new Error('Invalid response from GitHub: missing device_code or user_code');
            }
            
            // Store device code data for callback handler
            localStorage.setItem('device_code_data', JSON.stringify({
                device_code: codeData.device_code,
                user_code: codeData.user_code,
                expires_at: Date.now() + (codeData.expires_in * 1000)
            }));
            
            // Return device code info for user to complete auth
            return {
                device_code: codeData.device_code,
                user_code: codeData.user_code,
                verification_uri: codeData.verification_uri || 'https://github.com/login/device',
                verification_uri_complete: codeData.verification_uri_complete,
                expires_in: codeData.expires_in,
                interval: codeData.interval || 5
            };
        } catch (error) {
            console.error('[StaticBackend] OAuth Device Flow initiation failed:', error);
            throw new Error(`Device Flow failed: ${error.message}. Make sure your OAuth App has Device Flow enabled in GitHub Developer Settings.`);
        }
    },
    
    // Poll for OAuth Device Flow completion
    async pollCopilotAuth(deviceCode, interval = 5) {
        const clientId = this.getOAuthClientId();
        
        if (!clientId) {
            return { success: false, error: 'OAuth Client ID not configured' };
        }
        
        const poll = async () => {
            try {
                // Use CORS-proxied request for token endpoint
                const data = await this.corsProxiedOAuthRequest(
                    this.OAUTH_CONFIG.TOKEN_URL,
                    {
                        client_id: clientId,
                        device_code: deviceCode,
                        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                    }
                );
                
                console.log('[StaticBackend] Poll response:', data);
                
                if (data.access_token) {
                    // Success! Store the token
                    this.tokens.copilot = data.access_token;
                    localStorage.setItem('copilotToken', data.access_token);
                    
                    // Clear device code data
                    localStorage.removeItem('device_code_data');
                    
                    if (data.expires_in) {
                        const expiry = Date.now() + (data.expires_in * 1000);
                        this.tokens.copilotExpiry = expiry;
                        localStorage.setItem('copilotTokenExpiry', expiry.toString());
                    }
                    
                    this.broadcastTokenUpdate('copilot', data.access_token);
                    return { success: true, token: data.access_token };
                }
                
                if (data.error === 'authorization_pending') {
                    // User hasn't completed auth yet, keep polling
                    return { success: false, pending: true };
                }
                
                if (data.error === 'slow_down') {
                    // Need to slow down polling
                    return { success: false, pending: true, slowDown: true, newInterval: interval + 5 };
                }
                
                if (data.error === 'expired_token') {
                    localStorage.removeItem('device_code_data');
                    return { success: false, error: 'Device code expired. Please try again.' };
                }
                
                if (data.error === 'access_denied') {
                    localStorage.removeItem('device_code_data');
                    return { success: false, error: 'Access denied by user.' };
                }
                
                // Other errors
                return { success: false, error: data.error_description || data.error };
            } catch (error) {
                console.error('[StaticBackend] Poll error:', error);
                return { success: false, error: error.message };
            }
        };
        
        return poll();
    },
    
    // Start continuous polling for device flow
    async startDeviceFlowPolling(deviceCode, interval = 5, onUpdate = null) {
        let currentInterval = interval;
        const maxAttempts = 60; // 5 minutes max
        let attempts = 0;
        
        const doPoll = async () => {
            attempts++;
            
            if (attempts > maxAttempts) {
                return { success: false, error: 'Polling timeout. Please try again.' };
            }
            
            const result = await this.pollCopilotAuth(deviceCode, currentInterval);
            
            if (result.success) {
                return result;
            }
            
            if (result.error && !result.pending) {
                return result;
            }
            
            if (result.slowDown) {
                currentInterval = result.newInterval || currentInterval + 5;
            }
            
            if (onUpdate) {
                onUpdate({ attempts, maxAttempts, interval: currentInterval });
            }
            
            // Wait and poll again
            await new Promise(resolve => setTimeout(resolve, currentInterval * 1000));
            return doPoll();
        };
        
        return doPoll();
    }
};

/**
 * Load token from localStorage and initialize UI
 * Called when AI view is activated
 */
function loadToken() {
    const token = localStorage.getItem('githubToken');
    if (token) {
        // Update token status
        updateGithubTokenStatus(true, 'Token configured');
        // Fetch avatar if not already cached
        if (!localStorage.getItem('githubAvatarUrl')) {
            fetchAndCacheUserAvatar(token);
        }
        // Fetch models on load if token exists
        fetchAvailableModels(token);
    } else {
        // No token available, clear model picker
        updateGithubTokenStatus(false);
        updateModelStatus('none', 'Configure token first', '#666');
        clearModelPicker();
    }
}

// Expose all functions and StaticBackend globally
window.showGithubTokenModal = showGithubTokenModal;
window.hideGithubTokenModal = hideGithubTokenModal;
window.saveGithubToken = saveGithubToken;
window.fetchAndCacheUserAvatar = fetchAndCacheUserAvatar;
window.getUserAvatarUrl = getUserAvatarUrl;
window.getCopilotSvg = getCopilotSvg;
window.showApiTokenModal = showApiTokenModal;
window.hideApiTokenModal = hideApiTokenModal;
window.showMarketApiModal = showMarketApiModal;
window.hideMarketApiModal = hideMarketApiModal;
window.updateGithubTokenStatus = updateGithubTokenStatus;
window.updateStaticBackendStatus = updateStaticBackendStatus;
window.updateOAuthUI = updateOAuthUI;
window.saveOAuthCredentials = saveOAuthCredentials;
window.saveOAuthClientId = saveOAuthClientId;
window.startWebFlowAuth = startWebFlowAuth;
window.startDeviceFlowAuth = startDeviceFlowAuth;
window.cancelDeviceFlow = cancelDeviceFlow;
window.disconnectCopilot = disconnectCopilot;
window.initiateCopilotAuth = initiateCopilotAuth;
window.toggleQuickActionsPopup = toggleQuickActionsPopup;
window.hideQuickActionsPopup = hideQuickActionsPopup;
window.closeQuickActionsPopupOnOutsideClick = closeQuickActionsPopupOnOutsideClick;
window.loadToken = loadToken;
window.StaticBackend = StaticBackend;
