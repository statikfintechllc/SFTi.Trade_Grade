# Custom CORS and OAuth System Documentation

## Overview

SFTi P.R.E.P now features a **state-of-the-art, custom CORS bypass and OAuth authentication system** built entirely from scratch without relying on any third-party CORS proxy services.

## 🎯 Problem Statement

The original issue was:
- **OAuth redirect_uri mismatch**: Code pointed to `/auth/callback` but file was at `/system/auth/callback`
- **Third-party CORS dependencies**: Using `corsproxy.io`, `cors.sh`, and `allorigins.win`
- **Unreliable authentication**: CORS proxies could fail or change their APIs

## ✅ Solution Implemented

### 1. Fixed OAuth Redirect URI

**Before:**
```javascript
REDIRECT_URI: 'https://statikfintechllc.github.io/SFTi.Trade_Grade/auth/callback'
```

**After:**
```javascript
REDIRECT_URI: 'https://statikfintechllc.github.io/SFTi.Trade_Grade/system/auth/callback'
```

### 2. Custom CORS Bypass Widget

**File:** `/system/js.on/cors-bypass.js`

A completely custom CORS bypass implementation featuring:

#### Multiple Bypass Strategies (Applied in Order):

1. **Direct Fetch** - Attempts standard CORS request first
2. **Service Worker Proxy** - Uses registered service worker for request interception
3. **Iframe Proxy** - Sandboxed iframe with postMessage communication
4. **JSONP** - Fallback for GET requests
5. **Smart Fallback** - Recommends Device Flow for GitHub

#### Key Features:

```javascript
// Auto-initialization
CustomCorsWidget.init();

// Simple API
const response = await CustomCorsWidget.fetch(url, options);

// Form posting
const data = await CustomCorsWidget.postForm(url, formData);
```

### 3. CORS Service Worker

**File:** `/system/js.on/cors-sw.js`

Advanced service worker that:
- Intercepts network requests
- Provides transparent CORS proxying
- Caches responses intelligently
- Handles preflight OPTIONS requests

### 4. Custom Static Backend Server

**File:** `/system/js.on/static-backend.js`

A complete client-side backend server featuring:

#### OAuth Authentication Methods:

**A. Device Flow (Recommended) ⭐**
- No callback URL required
- No CORS issues
- More secure
- Better user experience

```javascript
// Start device flow
const result = await CustomStaticBackend.startDeviceFlow();

// Display to user
console.log(`Go to: ${result.verificationUri}`);
console.log(`Enter code: ${result.userCode}`);

// Poll for token
const token = await CustomStaticBackend.pollDeviceToken(
    result.deviceCode, 
    result.interval
);
```

**B. Web Flow (Alternative)**
- Uses callback URL
- May have CORS limitations
- Requires client secret

```javascript
// Redirect to GitHub
CustomStaticBackend.startWebFlow();

// Callback page exchanges code for token
const tokenData = await CustomStaticBackend.exchangeCodeForToken(code);
```

#### Additional Features:

- **Rate Limiting**: Prevents API abuse
- **Intelligent Caching**: Reduces redundant requests
- **Token Management**: Automatic expiry handling
- **Cross-Tab Communication**: BroadcastChannel for sync
- **Security**: CSRF protection with state parameter

### 5. Jekyll Configuration

**File:** `/_config.yml`

Proper Jekyll setup for GitHub Pages:
- Correct routing configuration
- Security headers
- SEO optimization
- Collection management

## 🚀 Usage

### Setup

1. **Include the modules in your HTML:**

```html
<!-- Custom CORS and Backend -->
<script src="/system/js.on/cors-bypass.js"></script>
<script src="/system/js.on/static-backend.js"></script>
```

2. **Service Worker Registration** (automatic via cors-bypass.js)

### Authentication

#### Recommended: Device Flow

```javascript
// Step 1: Start device flow
const deviceAuth = await CustomStaticBackend.startDeviceFlow();

// Step 2: Show user the code
alert(`Go to ${deviceAuth.verificationUri} and enter code: ${deviceAuth.userCode}`);

// Step 3: Poll for token (happens automatically)
try {
    const result = await CustomStaticBackend.pollDeviceToken(
        deviceAuth.deviceCode,
        deviceAuth.interval
    );
    
    console.log('Authentication successful!');
    console.log('Token:', result.token);
} catch (error) {
    console.error('Authentication failed:', error);
}
```

#### Alternative: Web Flow

```javascript
// Redirect to GitHub (will come back to callback URL)
CustomStaticBackend.startWebFlow();
```

### Making API Requests

```javascript
// Authenticated request
const response = await CustomStaticBackend.apiRequest(
    'https://api.githubcopilot.com/chat/completions',
    {
        method: 'POST',
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [...]
        })
    }
);
```

### CORS Bypass

```javascript
// Fetch with automatic CORS bypass
const response = await CustomCorsWidget.fetch('https://example.com/api', {
    method: 'GET',
    headers: { ... }
});

// Post form data
const result = await CustomCorsWidget.postForm('https://example.com/submit', {
    field1: 'value1',
    field2: 'value2'
});
```

## 🔐 Security Features

1. **CSRF Protection**: State parameter validation
2. **Token Expiry**: Automatic expiry checking
3. **Secure Storage**: LocalStorage with expiry times
4. **Rate Limiting**: Prevents abuse
5. **Content Security Policy**: Configured in Jekyll
6. **No Client Secret Exposure**: Device Flow doesn't need it

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐      ┌──────────────────┐              │
│  │  Main App       │      │  Service Worker  │              │
│  │  (index.html)   │◄────►│  (cors-sw.js)    │              │
│  └────────┬────────┘      └──────────────────┘              │
│           │                                                   │
│           ├── Uses ──┐                                        │
│           │          ▼                                        │
│  ┌────────▼──────────────────────┐                          │
│  │  CustomStaticBackend          │                          │
│  │  (static-backend.js)          │                          │
│  │                                │                          │
│  │  • OAuth Device Flow           │                          │
│  │  • OAuth Web Flow              │                          │
│  │  • Token Management            │                          │
│  │  • Rate Limiting               │                          │
│  │  • Caching                     │                          │
│  └────────┬───────────────────────┘                          │
│           │                                                   │
│           ├── Uses ──┐                                        │
│           │          ▼                                        │
│  ┌────────▼──────────────────────┐                          │
│  │  CustomCorsWidget              │                          │
│  │  (cors-bypass.js)              │                          │
│  │                                │                          │
│  │  • Direct Fetch                │                          │
│  │  • Service Worker Proxy        │                          │
│  │  • Iframe Proxy                │                          │
│  │  • JSONP Fallback              │                          │
│  └────────────────────────────────┘                          │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  External APIs  │
                   │                 │
                   │  • GitHub       │
                   │  • Copilot      │
                   │  • Azure        │
                   └─────────────────┘
```

## 🎨 State-of-the-Art Features

### 1. Multi-Strategy CORS Bypass
Automatically tries multiple strategies until one succeeds, ensuring maximum reliability.

### 2. Zero Third-Party Dependencies
Everything is custom-built, no reliance on external CORS proxy services that could:
- Change their API
- Go offline
- Inject malware
- Track users

### 3. Intelligent Caching
Reduces API calls and improves performance with:
- TTL-based cache expiry
- Automatic cleanup
- Per-request caching control

### 4. Rate Limiting
Protects against API abuse with:
- Sliding window algorithm
- Per-endpoint limits
- Automatic request throttling

### 5. Device Flow Priority
Recommends and defaults to Device Flow, which:
- Doesn't require callback URL
- Works perfectly on static sites
- More secure (no client secret)
- Better UX (no redirects)

## 📝 GitHub OAuth App Configuration

### For Web Flow (if you must use it):

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Update your OAuth App:
   - **Homepage URL**: `https://statikfintechllc.github.io/SFTi.Trade_Grade/`
   - **Callback URL**: `https://statikfintechllc.github.io/SFTi.Trade_Grade/system/auth/callback`

### For Device Flow (Recommended):

1. Device Flow works with the same OAuth App
2. **No callback URL needed** - leave it as is
3. Just ensure the Client ID is correct

## 🐛 Troubleshooting

### "redirect_uri is not associated with this application"

**Solution:** 
1. Check that OAuth App callback URL matches exactly: `https://statikfintechllc.github.io/SFTi.Trade_Grade/system/auth/callback`
2. Or use Device Flow instead (recommended)

### Token exchange fails with CORS error

**Solution:**
- This is expected on GitHub Pages with Web Flow
- Use Device Flow instead (no CORS issues)

### Service Worker not registering

**Solution:**
1. Check that site is served over HTTPS
2. Check console for registration errors
3. Clear browser cache and reload

## 🔄 Migration Guide

### From Old System:

1. **Update `auth.js`**: Already fixed (redirect_uri corrected)
2. **Add new modules**: Include `cors-bypass.js` and `static-backend.js`
3. **Update authentication code**: Use `CustomStaticBackend` instead of old `StaticBackend`
4. **Configure Jekyll**: Add `_config.yml` if not present
5. **Test Device Flow**: Recommended over Web Flow

### Testing:

```javascript
// Test 1: CORS widget
try {
    await CustomCorsWidget.init();
    console.log('✅ CORS widget initialized');
} catch (e) {
    console.error('❌ CORS widget failed:', e);
}

// Test 2: Device Flow
try {
    const result = await CustomStaticBackend.startDeviceFlow();
    console.log('✅ Device Flow initiated:', result);
} catch (e) {
    console.error('❌ Device Flow failed:', e);
}
```

## 📚 API Reference

### CustomCorsWidget

```typescript
interface CustomCorsWidget {
    // Initialize the widget
    init(): Promise<boolean>;
    
    // Fetch with CORS bypass
    fetch(url: string, options?: RequestInit): Promise<Response>;
    
    // Post form data
    postForm(url: string, data: Record<string, string>): Promise<any>;
}
```

### CustomStaticBackend

```typescript
interface CustomStaticBackend {
    // OAuth Device Flow
    startDeviceFlow(): Promise<DeviceFlowResult>;
    pollDeviceToken(deviceCode: string, interval: number): Promise<TokenResult>;
    
    // OAuth Web Flow
    startWebFlow(): void;
    exchangeCodeForToken(code: string): Promise<TokenData>;
    
    // Token Management
    storeToken(token: string, type: 'copilot' | 'github'): void;
    getToken(type: 'copilot' | 'github'): string | null;
    validateGitHubToken(token: string): Promise<ValidationResult>;
    
    // API Requests
    apiRequest(endpoint: string, options?: RequestInit): Promise<any>;
    
    // Configuration
    setClientId(clientId: string): void;
    getClientId(): string;
}
```

## 🌟 Benefits

1. **No Third-Party Dependencies** - Complete control, no external services
2. **More Reliable** - Multiple fallback strategies
3. **Better Security** - No client secret exposure with Device Flow
4. **Better UX** - No redirects needed with Device Flow
5. **More Performant** - Intelligent caching and rate limiting
6. **More Maintainable** - All code is custom and documented
7. **Future-Proof** - Not dependent on external services

## 📄 License

MIT License - See LICENSE file for details

## 👥 Credits

- **Author**: SFTi LLC
- **Version**: 3.0.0
- **Last Updated**: 2026-01-21

---

**Note**: This is a complete, production-ready authentication and CORS bypass system built specifically for static GitHub Pages deployments. No third-party services, no external dependencies, maximum control.
