# API Reference

## Overview

This document covers the external APIs used by SFTi P.R.E.P and internal JavaScript APIs available for customization. The application uses a "Static Backend Server" pattern to handle OAuth and CORS-restricted API calls.

---

## External APIs

### Azure Inference API

Primary API for AI chat completions using GitHub tokens.

#### Base URL
```
https://models.inference.ai.azure.com
```

#### Authentication

**Method:** Bearer Token (GitHub Personal Access Token)

```javascript
headers: {
  'Authorization': 'Bearer ghp_xxxxx...',
  'Content-Type': 'application/json'
}
```

**Getting a Token:**
1. Visit [github.com/settings/tokens](https://github.com/settings/tokens)
2. Generate new token (classic)
3. Required scopes: `read:packages` + model access
4. Copy token (starts with `ghp_`)

### GitHub Copilot API

Advanced API for Copilot models (Claude, Gemini, GPT-5) requiring OAuth.

#### Base URL
```
https://api.githubcopilot.com
```

#### Authentication

**Method:** Bearer Token (OAuth Token)

```javascript
headers: {
  'Authorization': 'Bearer ghu_xxxxx...',
  'Content-Type': 'application/json',
  'Copilot-Integration-Id': 'vscode-chat'
}
```

**Getting OAuth Token:**
1. Create GitHub OAuth App
2. Use Device Flow or Web Flow
3. Exchange code for token
4. Token starts with `ghu_`

### GitHub OAuth Endpoints

**Device Code Request:**
```
POST https://github.com/login/device/code
```

**Token Exchange:**
```
POST https://github.com/login/oauth/access_token
```

---

## CORS Widget API

The CORS Widget enables CORS-bypassed requests from static sites.

### CorsWidget Object

```javascript
const CorsWidget = {
    PROXIES: [
        { name: 'corsproxy.io', url: 'https://corsproxy.io/?', supportsPost: true },
        { name: 'cors.sh', url: 'https://cors.sh/', supportsPost: true },
        { name: 'crossorigin.me', url: 'https://crossorigin.me/', supportsPost: true }
    ],
    workingProxy: null
}
```

### Methods

#### fetch(url, options)

CORS-bypassed fetch request.

```javascript
const response = await CorsWidget.fetch('https://api.example.com/data', {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
});
```

#### postForm(url, data)

POST form-urlencoded data via CORS proxy.

```javascript
const response = await CorsWidget.postForm(
    'https://github.com/login/oauth/access_token',
    {
        client_id: 'xxx',
        client_secret: 'xxx',
        code: 'auth_code'
    }
);
```

#### postJson(url, data)

POST JSON data via CORS proxy.

```javascript
const response = await CorsWidget.postJson(
    'https://api.example.com/endpoint',
    { key: 'value' }
);
```

---

## Static Backend API

### StaticBackend Object

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
    }
}
```

### Methods

#### init()

Initialize the Static Backend, set up BroadcastChannel for cross-tab sync.

```javascript
StaticBackend.init();
```

#### validateToken(token)

Validate a GitHub token.

```javascript
const isValid = await StaticBackend.validateToken('ghp_xxx');
// Returns: { valid: true, scopes: [...] } or { valid: false, error: '...' }
```

#### routeRequest(model, messages)

Route API request to correct endpoint based on model.

```javascript
const response = await StaticBackend.routeRequest('gpt-4o', messages);
```

#### initiateDeviceFlow(clientId)

Start OAuth Device Flow.

```javascript
const deviceData = await StaticBackend.initiateDeviceFlow('Iv1.xxx');
// Returns: { device_code, user_code, verification_uri, expires_in }
```

#### pollDeviceFlow(clientId, deviceCode)

Poll for Device Flow completion.

```javascript
const token = await StaticBackend.pollDeviceFlow('Iv1.xxx', 'xxx');
// Returns: OAuth token or null (pending)
```

#### initiateWebFlow(clientId)

Open OAuth Web Flow in popup window.

```javascript
StaticBackend.initiateWebFlow('Iv1.xxx');
// Opens popup, callback handles token exchange
```

---

## Chat Completions API

### POST /chat/completions

Send a message to the AI model and receive a response.

#### Request

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are a trading assistant..."
    },
    {
      "role": "user",
      "content": "Analyze AAPL for trading"
    }
  ],
  "max_tokens": 1500,
  "temperature": 0.7
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| model | string | Yes | Model identifier (e.g., "gpt-4o-mini") |
| messages | array | Yes | Array of message objects |
| max_tokens | integer | No | Maximum tokens in response (default: 1500) |
| temperature | float | No | Randomness 0.0-1.0 (default: 0.7) |
| top_p | float | No | Nucleus sampling (default: 1.0) |
| frequency_penalty | float | No | Penalize repeated tokens (default: 0.0) |
| presence_penalty | float | No | Penalize new topics (default: 0.0) |

**Message Object:**
```json
{
  "role": "system" | "user" | "assistant",
  "content": "Message text"
}
```

#### Response

**Success (200):**
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-4o-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "AAPL shows a strong bullish setup..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 200,
    "total_tokens": 250
  }
}
```

**Error (4xx/5xx):**
```json
{
  "error": {
    "message": "Invalid authentication credentials",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

#### Error Codes

| Code | Description |
|------|-------------|
| 401 | Invalid or missing authentication token |
| 429 | Rate limit exceeded |
| 500 | Server error |
| 503 | Service unavailable |

#### Rate Limits

- Varies by model and account tier
- Default: ~60 requests/minute
- Monitor `X-RateLimit-Remaining` header

#### Example Usage

```javascript
const token = localStorage.getItem('githubToken');
const model = 'gpt-4o-mini';

const response = await fetch(
  'https://models.inference.ai.azure.com/chat/completions',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a trading analyst.'
        },
        {
          role: 'user',
          content: 'Analyze TSLA for breakout trading'
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    })
  }
);

const data = await response.json();
const aiMessage = data.choices[0].message.content;
```

---

## Available Models

### Model Comparison

| Model | Endpoint | Speed | Quality | Best For |
|-------|----------|-------|---------|----------|
| gpt-4o-mini | Azure | ⚡⚡⚡ | ⭐⭐⭐ | Quick queries, general chat |
| gpt-4o | Azure | ⚡⚡ | ⭐⭐⭐⭐ | Balanced performance |
| Mistral-Nemo | Azure | ⚡⚡⚡ | ⭐⭐⭐ | Fast, efficient |
| claude-3.5-sonnet | Copilot | ⚡⚡ | ⭐⭐⭐⭐⭐ | Complex analysis |
| gemini-2.5-pro | Copilot | ⚡⚡ | ⭐⭐⭐⭐ | Multimodal tasks |
| gpt-5 | Copilot | ⚡ | ⭐⭐⭐⭐⭐ | Critical decisions |

### Azure Models (GitHub Token)

Available immediately with a GitHub token:
- `gpt-4o` - Balanced performance
- `gpt-4o-mini` - Fast and efficient
- `Mistral-Nemo-2407` - Alternative model

### Copilot Models (OAuth Required)

Require OAuth authentication:
- `claude-3.5-sonnet` - Anthropic Claude
- `claude-opus-4.5` - Advanced Claude
- `gemini-2.5-pro` - Google Gemini
- `gpt-5` - Latest OpenAI
- `grok-code-fast-1` - xAI Grok

---

## Web Tools API

### WebTools Object

```javascript
const WebTools = {
    // Rate limiting
    lastSearch: 0,
    MIN_INTERVAL: 2000,
    cache: new Map()
}
```

### Methods

#### search(query)

Execute web search via DuckDuckGo API.

```javascript
const results = await WebTools.search('AAPL stock news');
// Returns: Array of { title, url, snippet }
```

#### crawl(url)

Fetch and parse web page content.

```javascript
const content = await WebTools.crawl('https://example.com/article');
// Returns: { title, content, url }
```

#### isValidUrl(url)

Validate URL format.

```javascript
const valid = WebTools.isValidUrl('https://example.com');
// Returns: boolean
```

---

## Internal JavaScript API

### Configuration

#### CONFIG Object

Global configuration object for application settings.

```javascript
const CONFIG = {
  MAX_SCREENSHOT_SIZE: 2 * 1024 * 1024,  // 2MB
  MAX_GRADES_FOR_REVIEW: 10,
  MAX_GRADES_FOR_PATTERNS: 20,
  CHAT_MESSAGE_PREVIEW_LENGTH: 200,
  AI_MODEL: 'gpt-4o-mini',
  AI_MAX_TOKENS: 1500,
  AI_TEMPERATURE: 0.7,
  API_ENDPOINT: 'https://models.inference.ai.azure.com/chat/completions',
  MAX_TOOL_ITERATIONS: 5,
  WEB_SEARCH_RATE_LIMIT: 2000  // ms between searches
};
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| MAX_SCREENSHOT_SIZE | number | 2097152 | Max file size in bytes |
| MAX_GRADES_FOR_REVIEW | number | 10 | Trades in review query |
| MAX_GRADES_FOR_PATTERNS | number | 20 | Trades in pattern analysis |
| CHAT_MESSAGE_PREVIEW_LENGTH | number | 200 | Preview text length |
| AI_MODEL | string | 'gpt-4o-mini' | Default AI model |
| AI_MAX_TOKENS | number | 1500 | Max response length |
| AI_TEMPERATURE | number | 0.7 | AI creativity (0-1) |
| API_ENDPOINT | string | URL | GitHub Models endpoint |

---

### State Management

#### Grade State

Current PREPARE scores while grading.

```javascript
const state = {
  pattern: 10,        // 0-20
  risk: 10,           // 0-20
  entry: 5,           // 0-10
  performance: 5,     // 0-10
  time: 10,           // 0-20
  catalyst: 5,        // 0-10
  environment: 5      // 0-10
};
```

#### Trade Plan State

Current trade plan being created.

```javascript
const trackerState = {
  ticker: '',                  // Stock symbol
  scores: null,                // PREPARE scores object
  total: 0,                    // Total score
  screenshot: null,            // Base64 image data
  stopLossPercent: 7,          // Stop loss % (5-10)
  profitTargetPercent: 20,     // Profit target % (15-30)
  entryPrice: 0,               // Entry price
  thoughts: ''                 // Trade notes
};
```

#### Chat History

Array of chat messages.

```javascript
let chatHistory = [
  {
    role: 'user',
    content: 'Analyze AAPL'
  },
  {
    role: 'assistant',
    content: 'AAPL shows...'
  }
];
```

---

### Core Functions

#### View Management

##### switchView(view)

Switch between application views.

**Parameters:**
- `view` (string): View name - 'grade', 'tracker', 'finalize', 'history', 'ai'

**Returns:** void

**Example:**
```javascript
switchView('ai');  // Switch to AI Assistant view
```

#### Grade Functions

##### updateSlider(id, value, max)

Update slider value and recalculate total score.

**Parameters:**
- `id` (string): Slider ID (e.g., 'pattern', 'risk')
- `value` (number): New value
- `max` (number): Maximum value

**Returns:** void

**Example:**
```javascript
updateSlider('pattern', 18, 20);
```

##### getGradeLetter(total)

Convert numeric score to letter grade.

**Parameters:**
- `total` (number): Total score (0-100)

**Returns:** string ('A', 'B', 'C', or 'D')

**Example:**
```javascript
const grade = getGradeLetter(88);  // Returns 'B'
```

#### Trade Plan Functions

##### initializeTracker()

Initialize trade plan view with data from grade view.

**Returns:** void

##### saveTrackerData()

Save trade plan to localStorage and update history.

**Returns:** void

#### History Functions

##### loadHistory()

Load and render trade history with active filters.

**Returns:** void

##### filterHistory()

Apply filters and reload history.

**Returns:** void

**Example:**
```javascript
historyFilterTicker = 'AAPL';
filterHistory();
```

##### deleteGrade(index)

Delete a grade from history.

**Parameters:**
- `index` (number): Array index of grade to delete

**Returns:** void

#### AI Functions

##### async askAI()

Send message to AI and display response.

**Returns:** Promise<void>

**Throws:** Error if no token or API fails

**Example:**
```javascript
document.getElementById('aiPrompt').value = 'Analyze TSLA';
await askAI();
```

##### addChatMessage(role, content)

Add a message to the chat interface.

**Parameters:**
- `role` (string): 'user' or 'assistant'
- `content` (string): Message text

**Returns:** void

**Example:**
```javascript
addChatMessage('user', 'What is the market sentiment?');
addChatMessage('assistant', 'The market is bullish with...');
```

##### clearChat()

Clear chat history and reset UI.

**Returns:** void

##### formatMessageText(text)

Format text with markdown-like features.

**Parameters:**
- `text` (string): Raw text to format

**Returns:** string (HTML)

**Example:**
```javascript
const formatted = formatMessageText('**Bold** and `code`');
// Returns: '<strong>Bold</strong> and <code>code</code>'
```

#### Utility Functions

##### showToast(message, type, title, duration, returnView)

Display a toast notification.

**Parameters:**
- `message` (string): Toast message
- `type` (string): 'success', 'error', 'warning', 'info'
- `title` (string): Toast title (optional)
- `duration` (number): Display duration in ms (optional, default: 4000)
- `returnView` (string): View to switch to after clicking (optional)

**Returns:** void

**Example:**
```javascript
showToast('Trade saved successfully!', 'success', 'Success', 3000);
```

##### escapeHtml(text)

Escape HTML special characters to prevent XSS.

**Parameters:**
- `text` (string): Text to escape

**Returns:** string

**Example:**
```javascript
const safe = escapeHtml('<script>alert("xss")</script>');
// Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
```

---

## LocalStorage API

### Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| `prepareGrades` | JSON array | All saved trades |
| `githubToken` | string | GitHub API token (ghp_) |
| `oauthClientId` | string | OAuth App Client ID |
| `oauthClientSecret` | string | OAuth App Client Secret |
| `copilotToken` | string | Copilot OAuth token (ghu_) |
| `availableModels` | JSON array | Fetched model list |
| `chatHistory` | JSON array | Saved chat conversations |
| `usageStats` | JSON object | Usage statistics |

### Data Structures

#### Grade/Trade Object

```javascript
{
  id: "1234567890",               // Timestamp
  ticker: "AAPL",                 // Stock symbol
  timestamp: "2026-01-04T...",    // ISO-8601
  scores: {
    pattern: 18,
    risk: 17,
    entry: 10,
    performance: 8,
    time: 18,
    catalyst: 8,
    environment: 9
  },
  total: 88,                      // Sum of scores
  screenshot: "data:image/...",   // Base64 or null
  plan: {                         // Optional
    entry: 175.50,
    stopLoss: 170.00,
    target: 185.00,
    stopPercent: 3.14,
    targetPercent: 5.41,
    riskReward: "1.7",
    thoughts: "..."
  },
  finalized: false,               // Boolean
  finalizedAt: "2026-01-04T...",  // ISO-8601 (if finalized)
  outcome: {                      // Optional (if finalized)
    result: "target",             // "target" or "stop"
    exitPrice: 185.00,
    pnlPercent: 5.41,
    strategy: "52w High Breakout",
    positionSize: 100,
    positionUnit: "shares"
  }
}
```

### Storage Operations

#### Read All Grades

```javascript
const grades = JSON.parse(
  localStorage.getItem('prepareGrades') || '[]'
);
```

#### Save Grade

```javascript
let grades = JSON.parse(
  localStorage.getItem('prepareGrades') || '[]'
);
grades.unshift(newGrade);  // Add to beginning
localStorage.setItem('prepareGrades', JSON.stringify(grades));
```

#### Update Grade

```javascript
let grades = JSON.parse(
  localStorage.getItem('prepareGrades') || '[]'
);
grades[index] = updatedGrade;
localStorage.setItem('prepareGrades', JSON.stringify(grades));
```

#### Delete Grade

```javascript
let grades = JSON.parse(
  localStorage.getItem('prepareGrades') || '[]'
);
grades.splice(index, 1);
localStorage.setItem('prepareGrades', JSON.stringify(grades));
```

---

## Events

### Custom Events

The application doesn't currently emit custom events, but could be extended:

```javascript
// Example: Emit event when trade is saved
const event = new CustomEvent('tradeSaved', {
  detail: { ticker: 'AAPL', total: 88 }
});
window.dispatchEvent(event);

// Listen for event
window.addEventListener('tradeSaved', (e) => {
  console.log('Trade saved:', e.detail);
});
```

### Browser Events

Standard browser events used:
- `click` - Button and link clicks
- `input` - Text input changes
- `change` - File upload, select changes
- `keydown`/`keypress` - Keyboard shortcuts
- `submit` - Form submission (prevented)

---

## Extension Points

### Adding Custom Quick Actions

```javascript
function myCustomAction() {
  document.getElementById('aiPrompt').value = 'My custom prompt';
  askAI();
}

// Add button in HTML
<button onclick="myCustomAction()">Custom Action</button>
```

### Adding Custom Filters

```javascript
let customFilter = '';

function loadHistoryWithCustomFilter() {
  let grades = JSON.parse(
    localStorage.getItem('prepareGrades') || '[]'
  );
  
  if (customFilter) {
    grades = grades.filter(g => /* custom logic */);
  }
  
  // Render filtered grades
}
```

### Custom AI System Prompts

```javascript
// Modify askAI() function to use custom system prompt
const customSystemPrompt = `
You are a specialized trading analyst focusing on...
`;

// Use in API call
messages: [
  { role: 'system', content: customSystemPrompt },
  { role: 'user', content: userMessage }
]
```

---

## Webhooks & Integrations

Currently not supported, but could be added:

### Potential Integrations

1. **Trading Platforms**
   - TD Ameritrade API
   - Interactive Brokers API
   - Robinhood (unofficial)

2. **Market Data**
   - Alpha Vantage
   - Yahoo Finance
   - Finnhub

3. **Notifications**
   - Telegram Bot
   - Discord Webhook
   - Email (via service)

4. **Cloud Sync**
   - Firebase
   - Supabase
   - AWS S3

---

## Security Best Practices

### API Token Management

```javascript
// ✅ Good: Store encrypted
localStorage.setItem('githubToken', token);

// ❌ Bad: Expose in code
const token = 'ghp_xxxxx...';

// ✅ Good: Validate before use
const token = localStorage.getItem('githubToken');
if (!token) {
  showToast('Please configure token', 'warning');
  return;
}
```

### Input Sanitization

```javascript
// Always escape user input before display
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
```

---

**Last Updated:** January 2026  
**Version:** 2.0.0
