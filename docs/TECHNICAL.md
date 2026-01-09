# Technical Documentation

## Architecture Overview

SFTi P.R.E.P is a single-page Progressive Web App (PWA) built with vanilla HTML, CSS, and JavaScript. No frameworks, build tools, or external dependencies required.

### Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Storage:** Browser LocalStorage API
- **Offline:** Service Workers for PWA functionality
- **AI Integration:** GitHub Models API (REST)
- **Architecture:** Client-side only, no backend server

---

## Project Structure

```
SFTi.Trade_Grade/
├── index.html              # Main application file (3700+ lines)
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

The entire application lives in `index.html`:

1. **Lines 1-1400:** CSS Styles
   - Base styles
   - Component styles
   - Chat window styles (model selector bar, messages, input)
   - Modal styles (token access cards)
   - Responsive design
   - Animations

2. **Lines 1400-1900:** HTML Structure
   - Header and navigation
   - View containers (Grade, Tracker, Finalize, History, AI)
   - Token access cards (GitHub and API modals)
   - Modals (ticker, trade details, finalize, image viewer, GitHub token, API token)
   - Chat window (model selector bar, messages, input)

3. **Lines 1900-3900:** JavaScript
   - Configuration
   - State management
   - View switching
   - Trade grading logic
   - Trade plan calculations
   - History management
   - AI assistant
   - Chat interface
   - Modal management (token access)
   - Model selector dynamic resizing
   - Utility functions

### Component Breakdown

**Core Components:**
- Grade View (PREPARE scoring)
- Trade Plan (entry/stop/target)
- Finalize Trades (outcome tracking)
- History (search/filter)
- AI Assistant (chat interface with floating model selector)

**Shared Components:**
- Header/Navigation
- Side Menu
- Toast Notifications
- Modals (ticker, trade details, finalize, image viewer, GitHub token, API token)
- Token Access Cards (GitHub and API)

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
  "availableModels": [...]
}
```

---

## Key Functions

### View Management

```javascript
// Switch between views
function switchView(view)
// Shows specified view, hides others
// Activates menu button
// Loads view-specific data

// Views: 'grade', 'tracker', 'finalize', 'history', 'ai'
```

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

## AI Integration

### GitHub Models API

**Endpoint:**
```
https://models.inference.ai.azure.com/chat/completions
```

**Authentication:**
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

**Request Format:**
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
  temperature: 0.7
}
```

**Response Format:**
```javascript
{
  choices: [
    {
      message: {
        role: "assistant",
        content: "AI response..."
      }
    }
  ]
}
```

### Model Selection

Supported models in dropdown:
- `gpt-4o-mini` (default, fastest)
- `gpt-4o` (balanced)
- `gpt-4` (most capable)
- `gpt-3.5-turbo` (basic)

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
- All data in browser LocalStorage
- No server-side storage
- No cookies
- Token encrypted by browser

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
**Version:** 1.0.0
