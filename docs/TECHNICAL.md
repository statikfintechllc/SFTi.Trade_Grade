# Technical Documentation

## Architecture Overview

SFTi P.R.E.P is a single-page Progressive Web App (PWA) built with vanilla HTML, CSS, and JavaScript. Features include a "Static Backend Server" architecture for OAuth authentication and CORS bypassing.

### Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Storage:** Browser LocalStorage API (no backend, no IndexedDB)
- **Offline:** Service Workers for PWA functionality
- **AI Integration:** GitHub Models API (REST), Azure Inference API
- **OAuth:** GitHub OAuth with Device Flow and Web Flow
- **Architecture:** 100% client-side with Static Backend Server pattern (no real backend server)
- **CORS Handling:** Public CORS proxies (corsproxy.io, cors.sh, codetabs) with automatic fallback
- **Web Search:** DuckDuckGo JSON API (no authentication required)
- **Web Scraping:** Custom DOM parser-based logic via CORS proxy

---

## Project Structure

```
SFTi.Trade_Grade/
├── index.html              # Main application file (5000+ lines)
├── auth/
│   └── callback/
│       └── index.html      # OAuth callback handler
├── system/
│   ├── img/
│   │   ├── icon-192.png   # PWA icon (192x192)
│   │   └── icon-512.png   # PWA icon (512x512)
│   └── js.on/
│       ├── manifest.json  # PWA manifest
│       └── sw.js          # Service worker
├── docs/
│   ├── README.md          # Project overview
│   ├── USER_GUIDE.md      # User documentation
│   ├── PREPARE_METHODOLOGY.md  # Scoring system
│   ├── AI_ASSISTANT.md    # AI features guide
│   ├── INSTALLATION.md    # Setup instructions
│   ├── TECHNICAL.md       # This file
│   └── API_REFERENCE.md   # API documentation
└── LICENSE                # License file
```

---

## Application Architecture

### Single-File Application

The main application lives in `index.html`:

1. **Lines 1-1800:** CSS Styles
   - Base styles
   - Component styles
   - Chat window styles (model selector bar, messages, input)
   - Modal styles (GitHub, Market API)
   - Syntax highlighting styles
   - Responsive design
   - Animations

2. **Lines 1800-2500:** HTML Structure
   - Header and navigation
   - View containers (Grade, Tracker, Finalize, History, AI)
   - Token access cards (GitHub and Market API)
   - Modals (ticker, trade details, finalize, image viewer, GitHub, Market API)
   - Chat window (model selector bar, chat history, new chat, messages, input)
   - Web Search toggle and More Actions menu

3. **Lines 2500-5000:** JavaScript
   - Configuration
   - State management
   - View switching
   - Trade grading logic
   - Trade plan calculations
   - History management
   - **StaticBackend** - OAuth, token management, API routing
   - **CorsWidget** - CORS proxy management
   - **WebTools** - Web search and crawling
   - AI assistant with tool calling
   - Chat interface with history
   - Modal management
   - Model selector dynamic resizing
   - Syntax highlighting for code blocks
   - Utility functions

### OAuth Callback Handler

The `/auth/callback/index.html` file handles OAuth redirects:

1. **CSS:** Themed loading/success/error states
2. **HTML:** Status display with animations
3. **JavaScript:**
   - CorsWidget (copy of main app)
   - Token exchange via CORS proxy
   - postMessage to parent window
   - localStorage sync
   - Auto-close on success

### Component Breakdown

**Core Components:**
- Grade View (PREPARE scoring)
- Trade Plan (entry/stop/target)
- Finalize Trades (outcome tracking)
- History (search/filter)
- AI Assistant (chat interface with web search)

**New Components:**
- StaticBackend (OAuth, routing)
- CorsWidget (proxy management)
- WebTools (search/crawl)
- Chat History (persistent)
- Code Block Renderer (syntax highlighting)

**Shared Components:**
- Header/Navigation
- Side Menu
- Toast Notifications
- Glass Modals (GitHub, Market API)
- Token Access Cards

---

## Data Flow

### State Management

**Global State:**
```javascript
// PREPARE scores
const state = {
    pattern: 10,
    risk: 10,
    entry: 5,
    performance: 5,
    time: 10,
    catalyst: 5,
    environment: 5
};

// Trade plan state
const trackerState = {
    ticker: '',
    scores: null,
    total: 0,
    screenshot: null,
    stopLossPercent: 7,
    profitTargetPercent: 20,
    entryPrice: 0,
    thoughts: ''
};

// Chat history
let chatHistory = [];
```

**LocalStorage Schema:**
```javascript
{
  "prepareGrades": [
    {
      "id": "timestamp",
      "ticker": "AAPL",
      "timestamp": "ISO-8601",
      "scores": { pattern: 18, risk: 17, ... },
      "total": 88,
      "screenshot": "data:image/...",
      "plan": {
        "entry": 175,
        "stopLoss": 170,
        "target": 185,
        "stopPercent": 2.9,
        "targetPercent": 5.7,
        "riskReward": "2.0",
        "thoughts": "..."
      },
      "finalized": false,
      "outcome": {
        "result": "target|stop",
        "exitPrice": 185,
        "pnlPercent": 5.7,
        "strategy": "...",
        "positionSize": 100,
        "positionUnit": "shares"
      }
    }
  ],
  "githubToken": "ghp_...",
  "oauthClientId": "Iv1.xxxxx",
  "oauthClientSecret": "xxxxx...",
  "copilotToken": "ghu_...",
  "availableModels": [...],
  "chatHistory": [
    {
      "id": "timestamp",
      "title": "First message preview",
      "messages": [...]
    }
  ],
  "usageStats": {
    "messages": 0,
    "webSearches": 0,
    "tokensUsed": 0
  }
}
```

---

## Key Functions

### StaticBackend

```javascript
const StaticBackend = {
    APP_ID: '2631011',
    ENDPOINTS: {
        AZURE_INFERENCE: 'https://models.inference.ai.azure.com',
        COPILOT_CHAT: 'https://api.githubcopilot.com/chat/completions',
        GITHUB_DEVICE_CODE: 'https://github.com/login/device/code',
        GITHUB_OAUTH_TOKEN: 'https://github.com/login/oauth/access_token'
    },
    MODELS: {
        AZURE: ['gpt-4o', 'gpt-4o-mini', 'Mistral-Nemo-2407'],
        COPILOT: ['claude-3.5-sonnet', 'gemini-2.5-pro', 'gpt-5', ...]
    },
    
    // Initialize backend, setup BroadcastChannel
    init(),
    
    // Validate GitHub token
    validateToken(token),
    
    // Route request to correct endpoint
    routeRequest(model, messages),
    
    // Initiate Device Flow OAuth
    initiateDeviceFlow(clientId),
    
    // Poll for Device Flow completion
    pollDeviceFlow(clientId, deviceCode),
    
    // Initiate Web Flow OAuth (popup)
    initiateWebFlow(clientId)
}
```

### CorsWidget

**Location:** `system/js.on/auth.js` (lines 860-976)

**Important:** Uses **PUBLIC, HOSTED CORS PROXIES** (not custom). These are 3rd party services:

```javascript
const CorsWidget = {
    PROXIES: [
        { 
            name: 'corsproxy.io', 
            urlBuilder: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
            supportsPost: true 
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
            supportsPost: true 
        }
    ],
    activeProxyIndex: 0,
    
    // GET request via CORS proxy with automatic fallback
    async fetch(url, options),
    
    // POST form data via CORS proxy
    async postForm(url, data),
    
    // POST JSON via CORS proxy
    async postJson(url, data)
}
```

**Note:** These proxies are hardcoded and may have rate limits or availability issues. For production use, consider implementing a custom CORS proxy server.

### WebTools

**Location:** `system/js.on/web-search.js`

**Important:** Uses **CUSTOM SCRAPING LOGIC** (not a 3rd party scraping API). Search uses DuckDuckGo's public JSON API.

```javascript
const WebTools = {
    // Execute web search via DuckDuckGo JSON API
    // API: https://api.duckduckgo.com (no authentication required)
    async performWebSearch(query),
    
    // Fetch URL content via CORS proxy (allorigins.win)
    async fetchUrlContent(url),
    
    // Crawl URLs with depth control and link following
    // Uses custom DOM parser heuristics
    async scrapeUrl(url, depth = 0, maxPages = 3, selectors = [], followLinks = false),
    
    // Extract main content using DOM parsing
    // Removes nav, footer, ads; finds <main>, <article>, or highest text density
    extractMainContent(htmlText),
    
    // Execute tool calls from AI (web_search, fetch_url, scrape_url)
    async executeToolCall(toolCall),
    
    // Format and add citations to messages
    formatCitations(citations),
    addCitationsToMessage(message, citations)
}
```

**Web Search Details:**
- **Search Engine:** DuckDuckGo's JSON API (free, no auth)
- **CORS Proxy:** `https://api.allorigins.win/raw?url=` (CONFIG.CORS_PROXY)
- **Content Extraction:** Custom DOM parser with heuristic-based main content detection
- **Not Used:** No Yahoo Finance, Alpha Vantage, Polygon.io, or other premium APIs
- **Rate Limiting:** 2-second minimum interval between searches

### Trade Grading

```javascript
// Update slider and calculate total
function updateSlider(id, value, max)
// Updates display and slider track
// Recalculates total score
// Updates score badge color

// Save grade and continue to tracker
// Stores in trackerState for next view
```

### Trade Planning

```javascript
// Initialize tracker view
function initializeTracker()
// Loads grade from previous view
// Sets up sliders and inputs
// Calculates initial plan

// Calculate plan metrics
// Entry, stop, target prices
// Risk/reward ratio
// Percentage calculations

// Save trade plan
function saveTrackerData()
// Combines grade + plan
// Stores in localStorage
// Updates history
```

### History & Filtering

```javascript
// Load and display history
function loadHistory()
// Reads from localStorage
// Applies filters (ticker, grade, status, strategy)
// Renders trade cards
// Attaches event listeners

// Filter functions
let historyFilterTicker = '';
let historyFilterGrade = '';
let historyFilterStatus = '';
let historyFilterStrategy = '';
```

### AI Integration

```javascript
// Send message to AI
async function askAI()
// Validates token
// Gets selected model
// Sends API request
// Handles response
// Updates chat UI

// Format message text
function formatMessageText(text)
// Markdown-like parsing
// Code blocks
// Bold text
// Lists

// Add message to chat
function addChatMessage(role, content)
// Creates message bubble
// Applies formatting
// Scrolls to bottom
// Updates history

// Token modal functions
function showGithubTokenModal()
// Opens GitHub token input modal
// Pre-fills existing token if available
// Auto-focuses input field

function hideGithubTokenModal()
// Closes modal
// Preserves input on cancel

function saveGithubToken()
// Saves token to localStorage
// Fetches available models
// Clears input for security

function showApiTokenModal()
// Opens API token modal (placeholder)

function hideApiTokenModal()
// Closes API modal

// Model selector resizing
function resizeModelSelector()
// Dynamically adjusts dropdown width
// Based on selected model name length
// Maintains responsive max-width
```

---

## CSS Architecture

### Design System

**Colors:**
```css
--primary-red: #cc0000;
--secondary-red: #990000;
--bg-dark: #1a1a1a;
--bg-darker: #0d0d0d;
--text-light: #e0e0e0;
--text-dim: #888;
```

**Gradients:**
```css
linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)  /* Backgrounds */
linear-gradient(135deg, #cc0000 0%, #990000 100%)  /* Buttons */
linear-gradient(135deg, rgba(40, 40, 40, 0.9) 0%, rgba(20, 20, 20, 0.95) 100%)  /* Cards */
```

**Shadows:**
```css
/* Elevation levels */
0 2px 8px rgba(0, 0, 0, 0.3)      /* Low */
0 8px 32px rgba(0, 0, 0, 0.4)     /* Medium */
0 20px 60px rgba(0, 0, 0, 0.6)    /* High */
```

### Component Patterns

**Cards:**
- Glass morphism effect
- Backdrop blur
- Subtle borders
- Hover animations
- Inner glow on hover
- Clickable cards with pointer cursor

**Token Access Cards:**
- Side-by-side flex layout
- SVG icons (GitHub, API)
- Modal triggers on click
- Maintains consistent card height

**Modals:**
- Centered overlay with backdrop blur
- Glass morphism container
- Smooth slide-in animation
- Red accent shimmer effect
- Click-outside-to-close

**Buttons:**
- Gradient backgrounds
- Ripple effect on hover
- Shadow elevation on hover
- Active state scale down
- Disabled state opacity

**Inputs:**
- Dark background
- Focused border glow
- Placeholder dimming
- Auto-resize (textarea)

### Responsive Design

**Breakpoints:**
```css
@media (max-width: 480px) {
  /* Mobile optimizations */
  .chat-window-container { height: 450px; }
  .chat-model-bar { padding: 6px 8px; }
  .chat-model-select { font-size: 11px; max-width: 95%; }
  .chat-bubble { max-width: 85%; font-size: 12px; }
  .chat-input-bar { padding: 8px; }
}
```

**Mobile Optimizations:**
- Reduced chat window height
- Compact model selector
- Larger tap targets (44px minimum)
- Simplified layouts
- Optimized font sizes
- Touch-friendly controls

**Chat Window:**
- Model selector sticky at top
- Auto-resize based on model name
- Messages scroll independently
- Input bar fixed at bottom

---

## Service Worker

### PWA Functionality

**File:** `system/js.on/sw.js`

**Capabilities:**
- Offline asset caching
- Background sync preparation
- Install prompt management
- Update notification

**Cache Strategy:**
```javascript
// Cache-first for static assets
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

### Manifest Configuration

**File:** `system/js.on/manifest.json`

```json
{
  "name": "PREPARE Trading Journal",
  "short_name": "P.R.E.P",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#cc0000",
  "icons": [
    {
      "src": "/system/img/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/system/img/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## External Dependencies

### Third-Party APIs

| Service | Type | Purpose | Authentication | Cost |
|---------|------|---------|----------------|------|
| **GitHub Models API** | AI/LLM | Chat completions via Azure Inference endpoint | GitHub Personal Access Token (PAT) | Free tier available |
| **GitHub Copilot API** | AI/LLM | Premium models (Claude, Gemini, GPT-4) | OAuth 2.0 (Device Flow) | Requires Copilot subscription |
| **DuckDuckGo Search** | Search | Web search for market data/news | None (public API) | Free |
| **GitHub REST API** | Identity | User validation, avatar fetching | GitHub PAT (Bearer token) | Free |

### Third-Party CORS Proxies (Public)

**Important:** These are **PUBLIC, HOSTED services** (not custom infrastructure)

| Service | URL | Reliability | Notes |
|---------|-----|-------------|-------|
| **corsproxy.io** | `https://corsproxy.io/?{url}` | Primary | No auth, rate limits unknown |
| **cors.sh** | `https://proxy.cors.sh/{url}` | Fallback #1 | Requires `x-cors-api-key: temp_demo` |
| **codetabs** | `https://api.codetabs.com/v1/proxy?quest={url}` | Fallback #2 | Free tier |
| **allorigins.win** | `https://api.allorigins.win/raw?url={url}` | Web scraping | Used for content fetching |

**Risks:**
- Public proxies may rate-limit or block requests
- No SLA or uptime guarantee
- Privacy concerns (proxies can log requests)
- **Recommendation:** Implement custom CORS proxy for production use

### Internal Components (No External Services)

| Component | Implementation | Location |
|-----------|----------------|----------|
| **StaticBackend** | Client-side OAuth handler | `system/js.on/auth.js:485-1159` |
| **CorsWidget** | CORS proxy router with fallback | `system/js.on/auth.js:860-976` |
| **WebTools** | Custom DOM parser for scraping | `system/js.on/web-search.js` |

---

## Storage Architecture

### Storage Type: **localStorage Only**

**No Backend Storage:** This application uses **NO server-side database**. All data persists exclusively in the browser's localStorage.

### What's Stored

```javascript
// LocalStorage Schema
{
  // Trade Data
  "prepareGrades": [...]         // All trade evaluations and plans
  
  // Authentication
  "githubToken": "ghp_...",      // GitHub Personal Access Token
  "copilotToken": "gho_...",     // OAuth token for Copilot
  "copilotTokenExpiry": 1699999999999,
  "oauth_client_id": "Ov23li...",
  "oauth_client_secret": "...",
  
  // User Data
  "githubAvatarUrl": "https://...",
  "githubUsername": "user123",
  
  // AI Configuration
  "availableModels": [...],      // Cached model list
  "selectedModel": "gpt-4o-mini",
  
  // Chat History
  "chatHistory": [...]           // All AI conversations
  
  // Usage Stats
  "usageStats": {
    "messages": 42,
    "webSearches": 15,
    "tokensUsed": 12500
  }
}
```

### Storage Limits

- **Browser Limit:** ~5-10MB per domain (varies by browser)
- **Current Usage:** Typical user data < 2MB
- **Image Storage:** Screenshots stored as base64 (increases size significantly)
- **Quota Management:** No automatic cleanup; user must manually delete old trades

### Cross-Tab Synchronization

- **BroadcastChannel API:** Used for token updates across tabs
- **No real-time sync:** localStorage changes don't automatically sync between tabs
- **Refresh required:** Users must refresh other tabs to see new data

### Data Persistence

✅ **Persists:**
- Until user clears browser data
- Until user deletes localStorage manually
- Survives browser restart

❌ **Does NOT Persist:**
- Across different browsers
- Across different devices
- After localStorage is cleared
- In private/incognito mode (cleared on session end)

### Backup & Recovery

**No Automatic Backup:**
- No cloud sync
- No export/import feature (could be added)
- No database backups
- **Risk:** All data can be permanently lost

**Manual Backup (Developer):**
```javascript
// Export all data
const backup = {
  grades: localStorage.getItem('prepareGrades'),
  chatHistory: localStorage.getItem('chatHistory'),
  settings: {
    selectedModel: localStorage.getItem('selectedModel'),
    // ... other settings
  }
};
console.log(JSON.stringify(backup));

// Import data
localStorage.setItem('prepareGrades', backup.grades);
```

---

## AI Integration

### Supported Endpoints

**Azure Inference API:**
```
https://models.inference.ai.azure.com/chat/completions
```

**GitHub Copilot API (after OAuth):**
```
https://api.githubcopilot.com/chat/completions
```

### Authentication

**Azure Inference (GitHub Token):**
```javascript
headers: {
  'Authorization': `Bearer ${githubToken}`,
  'Content-Type': 'application/json'
}
```

**Copilot API (OAuth Token):**
```javascript
headers: {
  'Authorization': `Bearer ${copilotToken}`,
  'Content-Type': 'application/json',
  'Copilot-Integration-Id': 'vscode-chat'
}
```

### Request Format

```javascript
{
  model: "gpt-4o-mini",
  messages: [
    {
      role: "system",
      content: "System prompt..."
    },
    {
      role: "user",
      content: "User message..."
    }
  ],
  max_tokens: 1500,
  temperature: 0.7,
  tools: webSearchEnabled ? [{
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" }
        },
        required: ["query"]
      }
    }
  }] : undefined
}
```

### Response Format

```javascript
{
  choices: [
    {
      message: {
        role: "assistant",
        content: "AI response...",
        tool_calls: [{  // If tools were invoked
          id: "call_xxx",
          type: "function",
          function: {
            name: "web_search",
            arguments: '{"query": "AAPL stock price"}'
          }
        }]
      }
    }
  ]
}
```

### Tool Calling Flow

```javascript
// 1. User sends message with tools enabled
const response = await sendMessage(userMessage, { tools: webTools });

// 2. Check if AI wants to use tools
if (response.tool_calls) {
  for (const toolCall of response.tool_calls) {
    // 3. Execute tool
    const result = await executeWebTool(toolCall);
    
    // 4. Send result back to AI
    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: result
    });
  }
  
  // 5. Get final response
  const finalResponse = await sendMessage(messages);
}
```

### Model Selection

**Azure Models (Working with GitHub Token):**
- `gpt-4o` (balanced)
- `gpt-4o-mini` (default, fastest)
- `Mistral-Nemo-2407` (efficient)

**Copilot Models (Require OAuth):**
- `claude-3.5-sonnet`
- `claude-opus-4.5`
- `gemini-2.5-pro`
- `gpt-5` series
- `grok-code-fast-1`

---

## Performance

### Metrics

**Initial Load:**
- Time to Interactive: < 1s
- First Contentful Paint: < 500ms
- Total Bundle Size: ~150KB (HTML only)

**Runtime:**
- View switching: < 50ms
- Grade calculation: < 5ms
- History rendering: < 100ms (100 items)
- AI response: 2-10s (network dependent)

### Optimization Techniques

1. **No Framework Overhead**
   - Zero dependencies
   - Minimal JavaScript
   - Direct DOM manipulation

2. **Efficient Rendering**
   - Template literals for HTML
   - Minimal reflows
   - Debounced inputs

3. **Smart Caching**
   - Service worker caching
   - LocalStorage for data
   - Computed values cached

4. **Image Optimization**
   - 2MB file size limit
   - Base64 encoding
   - Lazy rendering

---

## Browser Compatibility

### Feature Detection

```javascript
// Check for required APIs
if ('serviceWorker' in navigator) {
  // Register service worker
}

if ('localStorage' in window) {
  // Use local storage
}

if ('FileReader' in window) {
  // Handle file uploads
}
```

### Polyfills

None required for modern browsers. Graceful degradation:
- Service worker: Optional, app works without
- File upload: Fallback to no-screenshot mode
- Fetch API: Required (all modern browsers)

---

## Security

### Data Security

**Storage:**
- **100% client-side:** All data stored in browser LocalStorage only
- **No backend database:** No server-side storage or persistence
- **No IndexedDB:** Not used in this application
- **No cookies:** Authentication tokens stored in localStorage
- **Token security:** Tokens stored in plain text in localStorage (browser-level encryption only)
- **Data portability:** All data can be exported/imported via JSON
- **Data loss risk:** If localStorage is cleared, all data is permanently lost

**Security Considerations:**
- GitHub tokens in localStorage are accessible via JavaScript (XSS vulnerability)
- No server-side token refresh mechanism
- OAuth tokens expire and must be re-authenticated
- Public CORS proxies may log requests (privacy concern)

**API Calls:**
- HTTPS only
- Token not exposed in logs
- Rate limiting by GitHub
- No sensitive data in prompts

### Input Validation

```javascript
// Ticker symbol
ticker.trim().toUpperCase()
// Max length, alphanumeric only

// File upload
if (file.size > CONFIG.MAX_SCREENSHOT_SIZE) {
  // Reject
}

// User input sanitization
function escapeHtml(text) {
  // Prevent XSS
}
```

---

## Development

### Local Development

```bash
# Start development server
python3 -m http.server 8080

# Or use any static file server
npx http-server -p 8080
```

### Debugging

**Browser DevTools:**
- Console for errors
- Network tab for API calls
- Application tab for storage
- Lighthouse for performance

**Service Worker:**
```javascript
// Check registration
navigator.serviceWorker.getRegistrations()
  .then(regs => console.log(regs));

// Unregister
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(r => r.unregister()));
```

### Testing

**Manual Testing:**
1. Grade a stock
2. Create trade plan
3. Save and finalize
4. Search history
5. Use AI assistant
6. Test offline mode

**Browser Testing:**
- Chrome (primary)
- Firefox
- Safari (iOS)
- Edge

---

## Deployment

### Build Process

**None Required!**
- No compilation
- No bundling
- No minification
- Direct deployment

### Deployment Checklist

- [ ] Update version numbers
- [ ] Test all features
- [ ] Verify PWA manifest
- [ ] Check service worker
- [ ] Test on mobile
- [ ] Verify HTTPS
- [ ] Update documentation

---

## Customization

### Theme Customization

Edit CSS variables in `<style>` section:

```css
:root {
  --primary-color: #cc0000;  /* Change to your color */
  --secondary-color: #990000;
  /* ... more variables ... */
}
```

### Configuration

Edit CONFIG object (~line 1670):

```javascript
const CONFIG = {
  AI_MODEL: 'gpt-4o-mini',     // Default model
  AI_MAX_TOKENS: 1500,         // Response length
  MAX_SCREENSHOT_SIZE: 2MB,    // File size limit
  // ... more options ...
};
```

### Feature Flags

Add boolean flags for optional features:

```javascript
const FEATURES = {
  AI_ASSISTANT: true,
  FILE_UPLOAD: true,
  PWA_INSTALL: true,
  // Add your features here
};
```

---

## Troubleshooting

### Common Issues

**Issue: Service worker not registering**
```javascript
// Check registration
navigator.serviceWorker.register('/system/js.on/sw.js')
  .then(reg => console.log('Registered:', reg))
  .catch(err => console.error('Failed:', err));
```

**Issue: LocalStorage quota exceeded**
```javascript
// Check storage usage
navigator.storage.estimate()
  .then(est => console.log(est.usage, est.quota));
```

**Issue: AI not responding**
- Verify token
- Check console errors
- Test with curl
- Try different model

---

## Future Enhancements

### Planned Features
- [ ] Export/import trades (JSON/CSV)
- [ ] Advanced filtering
- [ ] Performance analytics dashboard
- [ ] Trade statistics
- [ ] Multiple portfolios
- [ ] Cloud sync (optional)
- [ ] Mobile app (React Native)

### Technical Debt
- Consider TypeScript migration
- Add automated testing
- Implement proper state management
- Modularize codebase
- Add build process for optimization

---

## Contributing

### Code Style

- Use 4 spaces for indentation
- camelCase for variables/functions
- PascalCase for classes
- Meaningful variable names
- Comment complex logic

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
git add .
git commit -m "Add feature X"

# Push and create PR
git push origin feature/my-feature
```

---

**Last Updated:** January 2026  
**Version:** 2.0.0
