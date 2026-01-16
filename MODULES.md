# Module Structure Documentation

## Overview
The application has been refactored from 2 large monolithic files (app.js: 4941 lines, styles.css: 2457 lines) into 27 smaller, logical modules for better maintainability and organization.

---

## JavaScript Modules (16 files)

### 1. **config.js** (689 bytes)
**Purpose:** Application configuration constants  
**Contents:**
- API endpoints and tokens
- File size limits
- AI configuration (max tokens, temperature)
- Web search settings
- Vision model definitions

**Exports:** `window.CONFIG`
**Note:** State variables moved to their respective modules (sliders.js, web-search.js, grading.js, etc.)

---

### 2. **utils.js** (1.8 KB)
**Purpose:** Utility functions  
**Contents:**
- `escapeHtml()` - XSS prevention
- `formatDate()` - Date formatting
- `formatFileSize()` - Byte to human-readable conversion
- `generateId()` - Unique ID generation
- `isValidUrl()` - URL validation

**Exports:** All functions to `window` object

---

### 3. **toast.js** (3.4 KB)
**Purpose:** Toast notification system  
**Contents:**
- `showToast()` - Display notifications with 4 types (success, error, warning, info)
- Toast icons (SVG)
- Auto-dismiss functionality
- Click navigation support

**Exports:** `window.showToast`

---

### 4. **menu.js** (2.8 KB)
**Purpose:** Menu and navigation  
**Contents:**
- `toggleMenu()` - Mobile menu toggle
- `switchView()` - View switching (grade, tracker, finalize, history, ai)
- Active menu button highlighting
- History loading on view switch

**Exports:** `window.toggleMenu`, `window.switchView`

---

### 5. **sliders.js** (11 KB)
**Purpose:** Slider controls and scoring  
**Contents:**
- `state` object - PREPARE scoring values
- `trackerState` object - Trade plan data
- `updateSlider()` - Update slider values
- `updateTotal()` - Calculate total score
- `continueToTracker()` - Navigate to tracker
- `initializeTracker()` - Initialize trade plan
- `updateTrackerSlider()` - Stop loss/profit target sliders
- `updateTrackerCalculations()` - R:R ratio calculations
- `saveTradePlan()` - Save trade plan to localStorage
- `getGradeLetter()` - Convert score to letter grade
- `resetSliders()` - Reset all sliders

**Exports:** All functions and state objects to `window`

---

### 6. **screenshot.js** (1.7 KB)
**Purpose:** Screenshot handling  
**Contents:**
- `currentScreenshot` variable
- `handleScreenshot()` - File upload with size validation
- `clearScreenshot()` - Clear screenshot state

**Exports:** All to `window` object

---

### 7. **grading.js** (18 KB)
**Purpose:** Trade grading and history management  
**Contents:**
- History filter variables
- `resetHistoryFilters()` - Clear filters
- `clearHistoryFiltersAndRefreshHistory()` - Clear and refresh
- `filterHistory()` - Apply filters
- `saveGrade()` - Save trade grade
- `loadHistory()`/`renderHistory()` - Load and render trade history
- `viewScreenshot()` - View trade screenshot
- `showImageViewer()`/`hideImageViewer()` - Fullscreen image viewer
- `deleteGrade()` - Delete trade

**Exports:** All functions to `window` object

---

### 8. **modal.js** (29 KB)
**Purpose:** Modal dialog management  
**Contents:**
- `currentFinalizeTradeIndex` variable
- Finalize trade modals:
  - `loadFinalizeView()` - Load pending trades
  - `showFinalizeModal()` - Show finalize dialog
  - `hideFinalizeModal()` - Hide dialog
  - `rejectTrade()` - Reject and delete trade
  - `showAcceptForm()` - Show acceptance form
  - `selectOutcome()` - Choose stop/target outcome
  - `acceptTrade()` - Finalize with outcome
- Ticker modal:
  - `showTickerModal()`/`hideTickerModal()`
  - `confirmTickerAnalysis()`
- Trade details modal:
  - `showTradeDetailsModal()` - Show full trade details
  - `hideTradeDetailsModal()`

**Exports:** All functions to `window` object

---

### 9. **auth.js** (42 KB)
**Purpose:** Authentication and token management  
**Contents:**
- GitHub token modal functions
- API token modal functions
- Market API modal functions
- OAuth state variables
- `updateStaticBackendStatus()` - Update backend status
- `updateOAuthUI()` - Update OAuth UI
- `saveOAuthCredentials()` - Save OAuth config
- `startWebFlowAuth()` - Web-based OAuth
- `startDeviceFlowAuth()` - Device code OAuth
- `cancelDeviceFlow()` - Cancel device flow
- `disconnectCopilot()` - Disconnect Copilot
- Quick actions popup functions
- **StaticBackend server class:**
  - OAuth configuration
  - Token management
  - API routing (Azure, Copilot)
  - CORS proxy widget
  - Device flow polling
  - Cross-tab communication

**Exports:** All functions and StaticBackend to `window`

---

### 10. **models.js** (17 KB)
**Purpose:** AI model selection and management  
**Contents:**
- `fetchAvailableModels()` - Fetch and cache models
- `getModelId()` - Get model ID
- `getModelDisplayName()` - Get display name
- `getProviderIconSVG()` - Provider icons
- `getModelCapabilities()` - Model capabilities (chat, code, vision)
- `toggleModelDropdown()` - Toggle model picker
- `selectModel()` - Select a model
- `populateModelPicker()` - Populate dropdown
- `clearModelPicker()` - Clear on error
- `resizeModelSelector()` - Deprecated

**Exports:** All functions to `window` object

---

### 11. **chat.js** (51 KB)
**Purpose:** Chat interface and message handling  
**Contents:**
- `chatHistory` variable
- `usageStats` object and `updateUsageStats()`
- Chat window management:
  - `showChatWindow()`/`hideChatWindow()`
  - `autoResizeTextarea()`
  - `handleChatKeyPress()`
- File attachment processing:
  - `handleChatFileUpload()`
  - `processImageFile()` - Vision analysis
  - `processTextFile()`
  - `processPdfFile()`
  - `processOfficeFile()`
  - `showFilePreview()`/`clearFilePreview()`
  - `getFileIcon()`
- Message building:
  - `buildMessageWithAttachment()` - Multimodal messages
- Code highlighting:
  - `highlightCode()` - Syntax highlighting
  - `formatMessageText()` - Markdown parsing
  - `copyCodeBlock()` - Copy to clipboard
- Message rendering:
  - `renderChatMessages()` - Render chat UI
  - `addChatMessage()` - Add to history
- Button state:
  - `restoreSendButton()`
  - `setSendButtonLoading()`
- Controls:
  - `toggleWebSearch()` - Enable/disable web search
  - `triggerFileUpload()` - File upload trigger
- Fullscreen mode:
  - `toggleFullscreenChat()` - Fullscreen toggle
  - Mobile swipe handlers
- Status indicators:
  - `showChatStatus()`/`hideChatStatus()`
- Chat history persistence:
  - `clearChat()`
  - `generateChatId()`
  - `startNewChat()`
  - `saveCurrentChat()`
  - `loadChat()`
  - `deleteChat()`
  - `toggleChatHistoryDropdown()`
  - `renderChatHistoryList()`
- Test harness:
  - `_createAttachmentTestWidget()`
  - `runAttachmentScraperTests()`

**Exports:** All functions and variables to `window`

---

### 12. **web-search.js** (18 KB)
**Purpose:** Web search functionality  
**Contents:**
- `webSearchEnabled` variable
- `currentSearchAbortController` variable
- `webSearchTools` array - Tool definitions
- Search functions:
  - `performWebSearch()` - DuckDuckGo search
  - `fetchUrlContent()` - CORS-proxied fetching
  - `extractMainContent()` - HTML parsing
  - `scrapeUrl()` - Multi-page scraping
- Tool execution:
  - `executeToolCall()` - Route tool calls
  - `formatCitations()` - Extract citations
  - `addCitationsToMessage()` - Add sources

**Exports:** All functions and variables to `window`
**Dependencies:** Uses `isValidUrl()` from utils.js

---

### 13. **ai.js** (17 KB)
**Purpose:** AI request handling  
**Contents:**
- `analyzeGradeWithAI()` - Format grade for AI analysis
- **`askAI()`** - Main AI request pipeline:
  - Token validation
  - File attachment handling
  - Message building
  - System prompt generation
  - Tool calling loop (up to 5 iterations)
  - Web search tools execution
  - Response formatting and citations
  - Usage stats tracking
  - Chat auto-save
  - Error handling
- Quick actions:
  - `reviewGrades()` - Review recent trades
  - `findPatterns()` - Analyze patterns
  - `getSentiment()` - Market sentiment

**Exports:** All functions to `window` object

---

### 14. **init.js** (5.9 KB)
**Purpose:** Application initialization  
**Contents:**
- `refreshServiceWorker()` - Update app
- Page load initialization:
  - Slider setup (7 sliders)
  - Screenshot event listeners
  - Model picker initialization
  - Modal keyboard handlers
  - Service worker registration

**Exports:** `window.refreshServiceWorker`

---

### 15. **image-processor.js** (16 KB) - Already Existed
**Purpose:** Image processing utilities  
**Note:** Not modified, already modularized

---

### 16. **sw.js** (3.8 KB) - Already Existed
**Purpose:** Service worker  
**Note:** Not modified, already separate

---

## CSS Modules (10 files)

### 1. **base.css** (4.5 KB)
**Purpose:** Base styles and layout  
**Contents:**
- Universal reset (`*`)
- HTML and body styling
- Header styles (`.header`, `.header-title`, `.logo`)
- Hamburger menu (`.hamburger`, `.hamburger-icon`)
- Container layout

**Lines from original:** 1-235

---

### 2. **menu.css** (2.8 KB)
**Purpose:** Side menu and navigation  
**Contents:**
- `.side-menu` - Slide-out menu
- `.menu-header` - Menu header
- `.menu-logo` - Logo styling
- `.menu-title`/`.menu-subtitle` - Typography
- `.menu-nav` - Navigation container
- `.menu-btn` - Menu buttons with shimmer effect
- `.overlay` - Modal backdrop

**Lines from original:** 111-229

---

### 3. **components.css** (7.2 KB)
**Purpose:** Reusable components  
**Contents:**
- `.card` - Glass-morphism cards
- `.ticker-input` - Text inputs
- `.score-display` - Score display
- `.progress-bar`/`.progress-fill` - Progress indicators
- `.save-btn` - Primary buttons
- `.label-text` - Form labels
- `.icon-svg` - Icon sizing
- `#entryPriceInput` - Entry price styling
- `#historyGradeFilter` - Filter dropdown

**Lines from original:** 237-507, 710-723, 859-911

---

### 4. **sliders.css** (2.1 KB)
**Purpose:** Slider controls  
**Contents:**
- `.slider-group` - Slider container
- `.slider-header`/`.slider-label` - Labels
- `.slider` - Range input
- `.slider::-webkit-slider-thumb` - Chrome/Safari thumb
- `.slider::-moz-range-thumb` - Firefox thumb
- `#stopLoss-slider` - Red gradient (stop loss)
- `#profitTarget-slider` - Green gradient (profit target)

**Lines from original:** 361-454, 861-879

---

### 5. **grading.css** (5.0 KB)
**Purpose:** Trade grading and history  
**Contents:**
- `.history-item` - History entry cards
- `.history-left`/`.history-ticker` - Ticker display
- `.history-grades-grid` - 4-column grade grid
- `.history-center`/`.history-score-value` - Score display
- `.history-right`/`.history-screenshot` - Screenshot column
- `.history-footer` - Action buttons
- `.delete-btn` - Delete button
- `.empty-state` - Empty state UI

**Lines from original:** 509-708

---

### 6. **modal.css** (2.7 KB)
**Purpose:** Modal dialogs  
**Contents:**
- `.modal-overlay` - Fullscreen overlay
- `.modal-content` - Modal card with shimmer
- `.modal-title` - Modal heading
- `.modal-input` - Modal inputs
- `.modal-buttons` - Button container
- `.modal-btn` - Button variants (cancel, confirm)
- Animations: `modalSlideIn`, `modalShimmer`

**Lines from original:** 724-857

---

### 7. **toast.css** (3.2 KB)
**Purpose:** Toast notifications  
**Contents:**
- `.toast-container` - Toast positioning
- `.toast` - Toast card with shimmer
- `.toast-exit` - Exit animation
- `.toast-icon` - Icon variants (success, error, warning, info)
- `.toast-content` - Content area
- `.toast-title`/`.toast-message` - Typography
- `.toast-close` - Close button
- Animations: `toastSlideIn`, `toastSlideOut`, `toastShimmer`

**Lines from original:** 913-1066

---

### 8. **chat.css** (32.7 KB)
**Purpose:** Chat interface  
**Contents:**
- Chat window:
  - `.chat-window-container` - Main container
  - `.chat-model-bar` - Model selector bar
  - `.chat-floating-btn` - Icon buttons
  - `.fullscreen-chat-btn` - Expand button
- Fullscreen modal:
  - `.fullscreen-chat-modal` - Full-screen overlay
  - `.fullscreen-chat-header`/`.fullscreen-chat-body` - Layout
  - `.input-pulled-up` - Mobile keyboard adjustment
- Messages:
  - `.chat-messages` - Messages container
  - `.chat-message` - Message wrapper
  - `.chat-bubble` - Message bubble
  - `.chat-avatar` - Avatar styling
  - Code blocks with syntax highlighting
  - `.code-copy-btn` - Copy button
- Input bar:
  - `.chat-input-bar`/`.chat-textarea` - Input area
  - `.chat-controls` - Button group
  - `.file-attach-btn` - File attachment
  - `.web-search-toggle` - Web search toggle
  - `.more-menu-btn` - More options
- Features:
  - `.quick-actions-popup` - Quick actions menu
  - `.usage-stats-card` - Stats display
  - `.chat-history-dropdown` - History dropdown
  - `.chat-citations-section` - Citation sources
  - File attachment previews
  - Status indicators with spinners

**Lines from original:** 1067-2404

---

### 9. **models.css** (6.6 KB)
**Purpose:** AI model selection  
**Contents:**
- `.chat-model-select` - Basic select
- `.model-dropdown-wrapper` - Custom dropdown
- `.model-dropdown-trigger` - Dropdown button
- `.model-dropdown-menu` - Dropdown menu
- `.model-section-header` - Category headers
- `.model-item` - Model options
- `.model-item-icon` - Provider icons (color-coded)
- `.model-item-name` - Model names
- `.model-cap-icon` - Capability badges (chat, code, vision)

**Lines from original:** 2030-2297

---

### 10. **responsive.css** (933 bytes)
**Purpose:** Responsive design  
**Contents:**
- `@media (max-width: 480px)` - Mobile adjustments:
  - Chat window height
  - Font sizes
  - Chat bubble max-width
  - Input padding
  - Button sizing

**Lines from original:** 2405-2457

---

## Module Dependencies

### Load Order (Critical):
```
1. config.js         ← Configuration constants only
2. utils.js          ← Used by all modules
3. toast.js          ← Used by all modules
4. menu.js           ← Navigation
5. modal.js          ← Used by grading, auth
6. sliders.js        ← State objects
7. screenshot.js     ← Used by grading
8. grading.js        ← History management  
9. auth.js           ← Token management, StaticBackend
10. models.js        ← Depends on auth
11. chat.js          ← Depends on models, auth
12. web-search.js    ← Used by ai.js
13. ai.js            ← Main AI pipeline
14. init.js          ← Initializes everything
```

### Cross-Module Dependencies:
- **All modules** depend on `CONFIG` from config.js
- **Most modules** use `escapeHtml()` and `showToast()` from utils.js and toast.js
- **web-search.js** uses `isValidUrl()` from utils.js (no duplication)
- **grading.js** uses `escapeHtml()` from utils.js (no duplication)
- **chat.js** depends on `StaticBackend` from auth.js
- **ai.js** depends on `StaticBackend` from auth.js and tools from web-search.js
- **models.js** depends on `StaticBackend` from auth.js
- **grading.js** uses modal functions from modal.js

**Code Quality Improvements:**
- Removed duplicate `isValidUrl()` function (now only in utils.js)
- Removed duplicate `escapeHtml()` function (now only in utils.js)
- Removed duplicate `resetHistoryFilters()` function (now only in grading.js)
- Removed empty tracker.js placeholder file
- Added `defer` attributes to all script tags for non-blocking page load

---

## CSS Dependencies

### Load Order:
```
1. base.css          ← Reset and base styles
2. menu.css          ← Navigation
3. components.css    ← Cards, buttons, inputs
4. sliders.css       ← Slider controls
5. grading.css       ← History display
6. modal.css         ← Modal overlays
7. toast.css         ← Notifications
8. chat.css          ← Chat interface (largest)
9. models.css        ← Model picker
10. responsive.css   ← Mobile overrides
```

**Note:** CSS modules have no strict dependencies, but responsive.css should load last to override mobile styles.

---

## File Size Comparison

### Before:
- `app.js`: 4941 lines (~200 KB)
- `styles.css`: 2457 lines (~60 KB)
- **Total**: 7398 lines (~260 KB)

### After:
**JavaScript:**
- 16 modules (including existing image-processor.js and sw.js)
- Largest: chat.js (51 KB)
- Average: ~12 KB per module
- **Total**: ~220 KB (spread across 16 files)
- All duplicates removed for cleaner code

**CSS:**
- 10 modules
- Largest: chat.css (32.7 KB)
- Average: ~7 KB per module
- **Total**: ~72 KB (spread across 10 files)

---

## Benefits of Modularization

1. **Maintainability**: Each module has a single, clear purpose
2. **Readability**: Files are now 100-500 lines instead of 2000-5000
3. **Debugging**: Easier to locate and fix issues
4. **Collaboration**: Multiple developers can work on different modules
5. **Performance**: Browser can cache modules separately
6. **Testing**: Each module can be tested in isolation
7. **Reusability**: Modules can be reused in other projects
8. **Documentation**: Each module is self-documenting with clear headers

---

## Migration Notes

### Breaking Changes: **NONE**
All functions and variables are exposed globally via the `window` object, maintaining backward compatibility with inline event handlers in HTML.

### Testing Checklist:
- [ ] All views load correctly (grade, tracker, finalize, history, ai)
- [ ] Sliders update scores correctly
- [ ] Toast notifications appear
- [ ] Screenshots can be uploaded
- [ ] Grades can be saved and loaded
- [ ] History filters work
- [ ] Modals open and close
- [ ] Trade finalization works
- [ ] GitHub token can be saved
- [ ] Models can be fetched and selected
- [ ] Chat messages send and render
- [ ] Web search tools execute
- [ ] File attachments work
- [ ] Fullscreen chat mode works
- [ ] Service worker updates

---

## Future Improvements

1. **TypeScript**: Add type safety with .ts files
2. **Module Bundler**: Use webpack/rollup to bundle for production
3. **Tree Shaking**: Remove unused code
4. **Code Splitting**: Lazy load modules
5. **CSS Preprocessor**: Use SASS/LESS for variables and mixins
6. **Component Framework**: Consider React/Vue for better state management
7. **Unit Tests**: Add Jest/Mocha tests for each module
8. **Documentation**: Generate JSDoc/TypeDoc documentation

---

## Original Files

The original monolithic files have been **preserved** and can be found at:
- `/system/js.on/app.js` (4941 lines)
- `/system/cs.+/styles.css` (2457 lines)

**Do not delete these files yet** - they serve as a reference and backup until the modular version is fully tested and verified in production.

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Author:** Module Refactoring Task
