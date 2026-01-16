// Configuration constants and global state
const CONFIG = {
    MAX_SCREENSHOT_SIZE: 2 * 1024 * 1024, // 2MB max for screenshots
    MAX_GRADES_FOR_REVIEW: 10,
    MAX_GRADES_FOR_PATTERNS: 20,
    CHAT_MESSAGE_PREVIEW_LENGTH: 200,
    AI_MAX_TOKENS: 1500,  // Increased for more detailed responses
    AI_TEMPERATURE: 0.7,
    // API Endpoints - Routed through StaticBackend
    API_ENDPOINT: 'https://models.inference.ai.azure.com/chat/completions',
    COPILOT_ENDPOINT: 'https://api.githubcopilot.com/chat/completions',
    // Web Search Configuration
    WEB_SEARCH_ENABLED: false,
    WEB_SEARCH_MAX_ITERATIONS: 5,  // Maximum tool calling iterations
    WEB_SEARCH_MAX_RESULTS: 5,     // Max search results to return
    CORS_PROXY: 'https://api.allorigins.win/raw?url=',  // CORS proxy for web fetching
    // File Upload Configuration
    MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10MB max file size
    MAX_TEXT_FILE_CONTENT: 10000,     // Max characters for text file content
    VISION_MODELS: ['gpt-4o', 'gpt-4-vision', 'gemini', 'claude']  // Models with vision support
};

// Web Search State
let webSearchEnabled = false;
let currentSearchAbortController = null;

// Grade state
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

// Global state variables
let currentScreenshot = null;
let chatHistory = [];
let historyFilterTicker = '';
let historyFilterGrade = '';
let historyFilterStatus = '';
let historyFilterStrategy = '';
let currentFinalizeTradeIndex = null;

/**
 * Reset all history filter state variables to their default (unfiltered) values.
 * Intended to be called whenever the user clears history filters in the UI.
 */
function resetHistoryFilters() {
    historyFilterTicker = '';
    historyFilterGrade = '';
    historyFilterStatus = '';
    historyFilterStrategy = '';
}

/**
 * Convenience helper: clear filters and, if available, trigger a history refresh.
 * This can be wired to a "Clear Filters" button or similar UI control.
 */
function clearHistoryFiltersAndRefreshHistory() {
    resetHistoryFilters();

    // If a global history-rendering function exists, call it to refresh the view.
    if (typeof renderHistory === 'function') {
        renderHistory();
    }
}

// Expose helpers globally so they can be used from inline handlers or other scripts.
window.resetHistoryFilters = resetHistoryFilters;
window.clearHistoryFiltersAndRefreshHistory = clearHistoryFiltersAndRefreshHistory;
