# Dependencies and Architecture Summary

## Executive Summary

This document answers specific questions about external dependencies, CORS proxies, web scraping, and storage mechanisms in the SFTi P.R.E.P. Trading Journal application.

---

## Question 1: External Dependencies

### Does the CORS widget use custom proxies or hosted proxies?

**Answer:** The CORS widget uses **PUBLIC, HOSTED PROXIES** (not custom infrastructure).

**Proxy Services Used:**

| Service | URL | Type | Notes |
|---------|-----|------|-------|
| **corsproxy.io** | `https://corsproxy.io/?{url}` | Public | Primary proxy |
| **cors.sh** | `https://proxy.cors.sh/{url}` | Public | Fallback #1 |
| **codetabs** | `https://api.codetabs.com/v1/proxy?quest={url}` | Public | Fallback #2 |
| **allorigins.win** | `https://api.allorigins.win/raw?url={url}` | Public | Web scraping |

**Implementation:** `CorsWidget` object in `system/js.on/auth.js` (lines 860-976)

**Fallback Strategy:**
1. Try primary proxy (corsproxy.io)
2. If fails, try fallback #1 (cors.sh)
3. If fails, try fallback #2 (codetabs)
4. If all fail, return error

**Code Location:**
```javascript
// auth.js, lines 860-976
CorsWidget: {
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
    ]
}
```

**Important Notes:**
- ❌ **NOT custom infrastructure** - relies on 3rd party services
- ⚠️ **Rate limiting risk** - public services may throttle or block
- ⚠️ **Privacy concern** - proxies can log all requests
- ⚠️ **Reliability** - no SLA, services may go down
- ✅ **Free to use** - no authentication required

**Recommendation:** For production, implement a custom CORS proxy server.

---

## Question 2: Web Scraping Implementation

### Does the scraper use custom logic or a 3rd party scraping API?

**Answer:** The scraper uses **CUSTOM LOGIC** (not a 3rd party scraping API).

**Search Engine:** DuckDuckGo's free public JSON API (no authentication)

**Content Extraction:** Custom DOM parsing with heuristics

**Implementation Details:**

| Function | Purpose | Location |
|----------|---------|----------|
| `performWebSearch()` | Search via DuckDuckGo | web-search.js:79 |
| `fetchUrlContent()` | Fetch URL via CORS proxy | web-search.js:179 |
| `extractMainContent()` | Parse HTML and extract main content | web-search.js:218 |
| `scrapeUrl()` | Recursive crawler with depth control | web-search.js:300 |

**Custom Scraping Logic:**
```javascript
// web-search.js, lines 218-299
function extractMainContent(htmlText) {
    // 1. Parse HTML with DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    
    // 2. Remove unwanted elements
    const unwanted = doc.querySelectorAll('script, style, nav, footer, header, aside, .ad, .advertisement');
    unwanted.forEach(el => el.remove());
    
    // 3. Find main content
    let mainContent = doc.querySelector('main, article, [role="main"]');
    
    // 4. Fallback: find element with most text
    if (!mainContent) {
        // Heuristic-based selection
        // Find element with highest text density
    }
    
    // 5. Extract text and metadata
    const text = mainContent.textContent.trim();
    const title = doc.querySelector('title')?.textContent || '';
    const description = doc.querySelector('meta[name="description"]')?.content || '';
    
    // 6. Truncate to 4000 characters
    return {
        title,
        description,
        content: text.substring(0, 4000)
    };
}
```

**NOT Using:**
- ❌ ScraperAPI
- ❌ Bright Data (formerly Luminati)
- ❌ Apify
- ❌ ParseHub
- ❌ Octoparse
- ❌ Diffbot
- ❌ Any paid scraping service

**DuckDuckGo API:**
- **Endpoint:** `https://api.duckduckgo.com/?q={query}&format=json`
- **Authentication:** None required (free public API)
- **Cost:** Free
- **Rate Limits:** Unknown (public API)

**CORS Proxy for Content:**
- Uses `allorigins.win` to fetch URL content
- Public service, no authentication
- Potential rate limiting

**Summary:**
- ✅ **Custom implementation** - all scraping logic written in-house
- ✅ **Free** - no paid scraping APIs
- ✅ **DuckDuckGo** - free search engine
- ⚠️ **Limited** - basic heuristics, may miss complex layouts
- ⚠️ **Rate limits** - public services may throttle

---

## Question 3: Storage Mechanism

### Does the system use real storage or just localStorage/IndexedDB?

**Answer:** The system uses **ONLY localStorage** (real browser storage, no backend).

**Storage Type:**
- ✅ **localStorage** - Primary and only storage mechanism
- ❌ **IndexedDB** - NOT used
- ❌ **Backend database** - NOT used (no server)
- ❌ **Cloud storage** - NOT used
- ❌ **sessionStorage** - NOT used
- ❌ **Cookies** - NOT used

**Architecture:**
```
┌─────────────────┐
│   Browser       │
│  ┌───────────┐  │
│  │localStorage│  │  ← ALL data stored here
│  └───────────┘  │
│                 │
│  NO Backend     │
│  NO Database    │
│  NO Cloud Sync  │
└─────────────────┘
```

**What's Stored:**

```javascript
// Complete localStorage schema
{
  // Trade Data
  "prepareGrades": [
    {
      id: "1699999999999",
      ticker: "AAPL",
      timestamp: 1699999999999,
      scores: { pattern: 15, risk: 18, ... },
      total: 75,
      grade: "B",
      screenshot: "data:image/png;base64,...",
      plan: {
        entry: 150.50,
        stopLoss: 140.00,
        target: 181.60,
        riskReward: 2.9
      },
      thoughts: "Strong breakout...",
      status: "pending"
    }
  ],
  
  // Authentication Tokens
  "githubToken": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "copilotToken": "gho_xxxxxxxxxxxxxxxxxxxxxxxx",
  "copilotTokenExpiry": 1699999999999,
  "oauth_client_id": "Ov23lixxxxxxxxxxxxx",
  "oauth_client_secret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  
  // User Profile
  "githubAvatarUrl": "https://avatars.githubusercontent.com/u/12345",
  "githubUsername": "username",
  
  // AI Configuration
  "availableModels": [
    { name: "gpt-4o-mini", friendly_name: "GPT-4o mini", ... }
  ],
  "selectedModel": "gpt-4o-mini",
  
  // Chat History
  "chatHistory": [
    {
      id: "1699999999999",
      title: "Market analysis...",
      messages: [
        { role: "user", content: "...", timestamp: 1699999999999 },
        { role: "assistant", content: "...", timestamp: 1699999999999 }
      ]
    }
  ],
  
  // Usage Statistics
  "usageStats": {
    "messages": 42,
    "webSearches": 15,
    "tokensUsed": 12500
  }
}
```

**Storage Characteristics:**

| Aspect | Details |
|--------|---------|
| **Location** | Browser localStorage (client-side only) |
| **Capacity** | ~5-10 MB per domain (varies by browser) |
| **Persistence** | Until user clears browser data |
| **Cross-device** | ❌ No (each browser stores separately) |
| **Cross-browser** | ❌ No (each browser stores separately) |
| **Backup** | ❌ No automatic backup |
| **Export/Import** | ❌ No built-in feature |
| **Encryption** | Browser-level only (not encrypted by app) |
| **Synchronization** | ❌ No cloud sync |
| **Offline access** | ✅ Yes (all data available offline) |

**Data Persistence:**

✅ **Persists:**
- Until user clears site data
- Across browser restarts
- In same browser on same device

❌ **Does NOT Persist:**
- Across different browsers
- Across different devices
- In private/incognito mode (deleted after session)
- After localStorage.clear()

**Cross-Tab Communication:**
- Uses **BroadcastChannel API** for token updates only
- Changes in one tab don't automatically sync to other tabs
- Users must refresh other tabs to see new data

**Backup Strategy:**
- ⚠️ **NO automatic backup**
- ⚠️ **ALL data can be permanently lost** if localStorage is cleared
- Manual backup requires developer console:

```javascript
// Manual backup (developer only)
const backup = {
  grades: localStorage.getItem('prepareGrades'),
  chatHistory: localStorage.getItem('chatHistory'),
  tokens: {
    github: localStorage.getItem('githubToken'),
    copilot: localStorage.getItem('copilotToken')
  }
};
console.log(JSON.stringify(backup));
// Save output to file

// Manual restore
localStorage.setItem('prepareGrades', backup.grades);
location.reload();
```

**Why localStorage (not IndexedDB)?**
- Simpler API for key-value storage
- No schema/migration complexity
- Sufficient for typical usage (~1-3 MB)
- Synchronous access (easier debugging)
- No need for structured queries

**Limitations:**
- ⚠️ **5-10 MB limit** - can't store unlimited trades
- ⚠️ **No multi-device sync** - each device has separate data
- ⚠️ **No automatic backup** - data loss risk
- ⚠️ **No encryption** - tokens visible in devtools
- ⚠️ **No versioning** - can't undo changes

**Summary:**
- ✅ **Real storage** - uses actual browser localStorage API
- ❌ **NOT simulated** - not in-memory or temporary
- ❌ **NO backend** - 100% client-side
- ❌ **NO cloud** - no server-side persistence
- ⚠️ **Risk** - all data can be lost if localStorage is cleared

---

## Question 4: All Classes and Abilities

### Note all classes, abilities, and way of operation

**Answer:** This application uses **NO ES6 classes**. All code is functional/procedural with object literals.

**Major Components (Objects, not Classes):**

### 1. StaticBackend Object

**Location:** `system/js.on/auth.js` (lines 485-1159)

**Type:** Object literal (not a class)

**Purpose:** OAuth handler, token manager, API router

**Abilities:**
- `init()` - Initialize backend, load tokens, setup BroadcastChannel
- `getAvailableModels()` - Get list of Azure + Copilot models
- `validateGitHubToken(token)` - Validate GitHub PAT
- `chatCompletion(model, messages, options)` - Send AI request to correct endpoint
- `initiatePopupAuth()` - Start OAuth Web Flow in popup
- `initiateCopilotAuth()` - Start OAuth Device Flow
- `startDeviceFlowPolling(clientId, deviceCode)` - Poll for OAuth completion
- `setGitHubToken(token)` - Store GitHub PAT
- `setOAuthClientId(clientId)` - Store OAuth client ID
- `generateState()` - Generate CSRF protection token
- `handleMessage(data)` - Handle cross-tab messages
- `broadcastTokenUpdate(type, token)` - Broadcast token to other tabs

**Nested Objects:**
- `OAUTH_CONFIG` - OAuth app configuration
- `ENDPOINTS` - API endpoint URLs
- `ALL_MODELS` - Model catalog
- `tokens` - Token storage
- `CorsWidget` - CORS proxy manager (see below)

---

### 2. CorsWidget Object

**Location:** `system/js.on/auth.js` (lines 860-976)

**Type:** Nested object within StaticBackend (not a class)

**Purpose:** CORS proxy fallback manager

**Abilities:**
- `fetch(url, options)` - Make CORS-bypassed GET request
- `postForm(url, data)` - POST form data via proxy
- `postJson(url, data)` - POST JSON via proxy
- **Automatic fallback** - Tries proxies in order until one works

**Properties:**
- `PROXIES` - Array of proxy configurations
- `activeProxyIndex` - Current proxy index

---

### 3. Grading System

**Location:** `system/js.on/grading.js` (404 lines)

**Type:** Functional module (no class)

**Key Functions:**
- `saveGrade()` - Save P.R.E.P.A.R.E. scores to localStorage
- `loadHistory()` - Load all trades from localStorage
- `renderHistory(grades)` - Render trade cards to DOM
- `filterHistory()` - Apply search/grade/status filters
- `deleteGrade(id)` - Delete trade by ID
- `viewScreenshot(screenshot)` - Open screenshot in modal
- `showTradeDetailsModal(grade)` - Show detailed trade view
- `getGradeLetter(total)` - Convert score to letter grade (A/B/C/D)
- `resetHistoryFilters()` - Clear all filters

**State Variables:**
- `historyFilterTicker` - Current ticker filter
- `historyFilterGrade` - Current grade filter (A/B/C/D)
- `historyFilterStatus` - Current status filter (finalized/non-finalized)
- `historyFilterStrategy` - Current strategy filter

---

### 4. Sliders & Scoring

**Location:** `system/js.on/sliders.js` (303 lines)

**Type:** Functional module (no class)

**State Objects:**
- `state` - PREPARE scoring values
- `trackerState` - Trade plan data

**Key Functions:**
- `updateSlider(id, value, max)` - Update slider value and total
- `updateTotal()` - Calculate total P.R.E.P.A.R.E. score
- `continueToTracker()` - Move to trade plan view
- `initializeTracker()` - Initialize trade plan with scores
- `updateTrackerSlider(type, value)` - Update stop/target sliders
- `updateTrackerCalculations()` - Calculate R:R ratio
- `saveTradePlan()` - Save complete trade to localStorage
- `resetSliders()` - Reset all sliders to defaults

---

### 5. Chat Manager

**Location:** `system/js.on/chat.js` (1,421 lines)

**Type:** Functional module (no class)

**State Variables:**
- `chatHistory` - Array of chat sessions
- `usageStats` - Message/search/token counters
- `currentFileAttachment` - Current attached file

**Key Functions:**
- `showChatWindow()` / `hideChatWindow()` - Toggle chat UI
- `addChatMessage(role, content)` - Add message to history
- `renderChatMessages()` - Render all messages to DOM
- `formatMessageText(text)` - Parse markdown and code blocks
- `highlightCode(code, language)` - Syntax highlighting
- `handleChatFileUpload(input)` - Process file attachments
- `processImageFile(file)` - Convert image to base64
- `buildMessageWithAttachment(text, attachment)` - Multimodal messages
- `saveCurrentChat()` - Save chat to localStorage
- `loadChat(chatId)` - Load chat from history
- `startNewChat()` - Create new chat session
- `toggleFullscreenChat()` - Fullscreen mode
- `updateUsageStats()` - Track message/token counts
- `showChatStatus(type, message)` - Show status indicator

---

### 6. Web Search Tools

**Location:** `system/js.on/web-search.js` (490 lines)

**Type:** Functional module (no class)

**State Variables:**
- `webSearchEnabled` - Is web search active?
- `currentSearchAbortController` - Cancel ongoing search
- `webSearchTools` - Tool definitions for AI

**Key Functions:**
- `performWebSearch(query)` - Search DuckDuckGo
- `fetchUrlContent(url)` - Fetch URL via CORS proxy
- `extractMainContent(htmlText)` - Parse HTML and find main content
- `scrapeUrl(url, depth, maxPages, selectors, followLinks)` - Recursive crawler
- `executeToolCall(toolCall)` - Execute AI tool request
- `formatCitations(citations)` - Format source citations
- `addCitationsToMessage(message, citations)` - Add sources to chat
- `toggleWebSearch()` - Enable/disable web search

---

### 7. AI Request Handler

**Location:** `system/js.on/ai.js` (415 lines)

**Type:** Functional module (no class)

**Key Functions:**
- `askAI()` - Main AI request pipeline
  - Validates token
  - Handles file attachments
  - Builds message array
  - Includes tools if web search enabled
  - Executes tool calling loop (up to 5 iterations)
  - Formats response with citations
  - Updates usage stats
  - Auto-saves chat
- `analyzeGradeWithAI()` - Format trade grade for AI analysis
- `reviewGrades()` - Quick action: review recent trades
- `findPatterns()` - Quick action: find patterns in trades
- `getSentiment()` - Quick action: analyze market sentiment

**Tool Calling Loop:**
```javascript
// Simplified tool calling flow
async function askAI() {
    let messages = buildMessages();
    let iteration = 0;
    
    while (iteration < 5) {
        const response = await StaticBackend.chatCompletion(model, messages, {
            tools: webSearchEnabled ? webSearchTools : undefined
        });
        
        if (response.tool_calls) {
            // Execute tools
            for (const call of response.tool_calls) {
                const result = await executeToolCall(call);
                messages.push({ role: "tool", content: result });
            }
            iteration++;
        } else {
            // Final response
            addChatMessage("assistant", response.content);
            break;
        }
    }
}
```

---

### 8. Model Manager

**Location:** `system/js.on/models.js` (374 lines)

**Type:** Functional module (no class)

**Key Functions:**
- `fetchAvailableModels(token)` - Get models from StaticBackend
- `populateModelPicker(models)` - Build model dropdown UI
- `selectModel(modelId)` - Change selected model
- `getModelDisplayName(model)` - Format model name for display
- `getProviderIconSVG(provider)` - Get provider logo (OpenAI, Anthropic, Google)
- `getModelCapabilities(model)` - Check if model has chat/code/vision
- `toggleModelDropdown()` - Open/close model picker
- `clearModelPicker()` - Clear models on error

---

### 9. Authentication Manager

**Location:** `system/js.on/auth.js` (1,209 lines)

**Type:** Functional module (no class)

**Key Functions:**
- `showGithubTokenModal()` - Open GitHub token modal
- `saveGithubToken()` - Save GitHub PAT
- `saveOAuthCredentials()` - Save OAuth client ID/secret
- `startWebFlowAuth()` - Start OAuth redirect flow
- `startDeviceFlowAuth()` - Start OAuth device flow
- `cancelDeviceFlow()` - Cancel device flow
- `disconnectCopilot()` - Remove Copilot token
- `updateOAuthUI()` - Update OAuth status display
- `updateStaticBackendStatus()` - Update backend status
- `reloadModelsAfterAuth()` - Reload models after authentication
- `toggleQuickActionsPopup()` - Show quick actions menu

---

### 10. Modal Manager

**Location:** `system/js.on/modal.js` (549 lines)

**Type:** Functional module (no class)

**Key Functions:**
- `showTickerModal()` - Show ticker input modal
- `confirmTickerAnalysis()` - Confirm ticker and analyze
- `showTradeDetailsModal(grade)` - Show trade details
- `hideTradeDetailsModal()` - Close trade details
- `showFinalizeModal(index)` - Show finalize trade modal
- `hideFinalizeModal()` - Close finalize modal
- `rejectTrade()` - Reject and delete trade
- `showAcceptForm()` - Show trade acceptance form
- `selectOutcome(outcome)` - Choose stop/target outcome
- `acceptTrade()` - Finalize trade with outcome
- `loadFinalizeView()` - Load pending trades
- `showImageViewer(screenshot)` - Fullscreen image viewer
- `hideImageViewer()` - Close image viewer

---

### 11. Toast Notifications

**Location:** `system/js.on/toast.js` (78 lines)

**Type:** Functional module (no class)

**Key Functions:**
- `showToast(message, type, title, duration, clickAction)` - Show toast
  - Types: success, error, warning, info
  - Auto-dismiss after duration (default 5s)
  - Optional click action

---

### 12. Menu & Navigation

**Location:** `system/js.on/menu.js` (81 lines)

**Type:** Functional module (no class)

**Key Functions:**
- `toggleMenu()` - Open/close side menu
- `switchView(view)` - Switch between views (grade, tracker, finalize, history, ai)

---

### 13. Utilities

**Location:** `system/js.on/utils.js` (62 lines)

**Type:** Functional module (no class)

**Key Functions:**
- `escapeHtml(text)` - Prevent XSS attacks
- `formatDate(timestamp)` - Format timestamp to readable date
- `formatFileSize(bytes)` - Format bytes to KB/MB
- `generateId()` - Generate unique ID
- `isValidUrl(string)` - Validate URL format

---

### 14. Screenshot Handler

**Location:** `system/js.on/screenshot.js` (41 lines)

**Type:** Functional module (no class)

**State:**
- `currentScreenshot` - Base64 screenshot data

**Key Functions:**
- `handleScreenshot(event)` - Handle file upload
- `clearScreenshot()` - Clear screenshot

---

### 15. Service Worker

**Location:** `system/js.on/sw.js` (118 lines)

**Type:** Service worker (special context)

**Key Features:**
- Cache static assets
- Offline support
- Update notification

---

### 16. Initialization

**Location:** `system/js.on/init.js` (185 lines)

**Type:** Functional module (no class)

**Key Functions:**
- `refreshServiceWorker()` - Update app
- DOMContentLoaded event listener:
  - Setup sliders
  - Attach screenshot handlers
  - Initialize model picker
  - Register service worker
  - Setup keyboard handlers

---

## Way of Operation

### Application Flow

```
1. Page Load
   ↓
2. Load Scripts (config → utils → toast → menu → ... → init)
   ↓
3. init.js: DOMContentLoaded
   ↓
4. Initialize UI (sliders, buttons, event listeners)
   ↓
5. Load from localStorage (grades, chat history, tokens)
   ↓
6. StaticBackend.init() (load tokens, setup BroadcastChannel)
   ↓
7. User Interaction → Event Handler → Function Call
   ↓
8. Update State → Update localStorage → Update UI
```

### Example: Save Trade Flow

```
1. User adjusts sliders → updateSlider()
   ↓
2. Calculates total → updateTotal()
   ↓
3. User clicks "Continue" → continueToTracker()
   ↓
4. Switch to tracker view → initializeTracker()
   ↓
5. User sets entry/stop/target → updateTrackerCalculations()
   ↓
6. User clicks "Save" → saveTradePlan()
   ↓
7. Build trade object → localStorage.setItem('prepareGrades', ...)
   ↓
8. Show toast → switchView('history')
   ↓
9. Load history → loadHistory() → renderHistory()
```

### Example: AI Chat Flow

```
1. User types message → handleChatKeyPress()
   ↓
2. User clicks send → askAI()
   ↓
3. Validate token → StaticBackend.validateGitHubToken()
   ↓
4. Build message array → buildMessageWithAttachment()
   ↓
5. Check web search → if (webSearchEnabled) include tools
   ↓
6. Send request → StaticBackend.chatCompletion(model, messages, { tools })
   ↓
7. Receive response → check for tool_calls
   ↓
8. If tool_calls → executeToolCall() → performWebSearch()
   ↓
9. Add tool result → messages.push({ role: "tool", ... })
   ↓
10. Send again → StaticBackend.chatCompletion()
   ↓
11. Final response → addChatMessage() → renderChatMessages()
   ↓
12. Save chat → saveCurrentChat() → localStorage
   ↓
13. Update usage stats → updateUsageStats()
```

---

## Summary

### Classes
- **NONE** - Application uses functional/procedural programming

### Major Components
- **StaticBackend** - Object literal for OAuth and API routing
- **CorsWidget** - Object literal for CORS proxy management
- **Functional modules** - 16 separate JS files, each with related functions

### Architecture Pattern
- **No classes** - All code is functions and object literals
- **Global namespace** - All functions exposed on `window` object
- **Event-driven** - HTML onclick/oninput call global functions
- **State in closures** - Module-level variables for state
- **localStorage for persistence** - No backend database

### Key Operations
1. **Trade Grading** - P.R.E.P.A.R.E. scoring with sliders
2. **Trade Planning** - Entry/stop/target with R:R calculation
3. **Trade History** - Search, filter, view, delete trades
4. **AI Chat** - Multimodal chat with web search tools
5. **OAuth** - Device Flow and Web Flow for Copilot
6. **CORS Bypass** - Automatic proxy fallback
7. **Web Scraping** - Custom DOM parsing
8. **Data Storage** - localStorage only, no backend

---

**Last Updated:** January 2026  
**Version:** 2.0.0
