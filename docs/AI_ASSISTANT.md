# AI Assistant Guide

## Overview

The AI Assistant in SFTi P.R.E.P integrates with GitHub Models API to provide intelligent trading insights, analysis, and decision support through a conversational chat interface. Features include web search capabilities, syntax-highlighted code blocks, and persistent chat history.

---

## Table of Contents

1. [Setup and Configuration](#setup-and-configuration)
2. [Chat Interface](#chat-interface)
3. [Web Search Tool](#web-search-tool)
4. [Quick Actions](#quick-actions)
5. [Best Practices](#best-practices)
6. [Model Selection](#model-selection)
7. [Sample Queries](#sample-queries)
8. [Chat History](#chat-history)
9. [Advanced Usage](#advanced-usage)
10. [Static Backend Server](#static-backend-server)
11. [Troubleshooting](#troubleshooting)

---

## Setup and Configuration

### Getting a GitHub Token

1. **Visit GitHub Models**
   - Go to [github.com/marketplace/models](https://github.com/marketplace/models)
   - Sign in to your GitHub account

2. **Generate Token**
   - Navigate to Settings → Developer settings → Personal access tokens
   - Click "Generate new token" (classic)
   - Select scopes: `read:packages` and model access
   - Generate and copy token (starts with `ghp_`)

3. **Save Token in App**
   - Navigate to AI Assistant tab
   - Click the GitHub logo card (left card at top)
   - Paste token in the modal input field
   - Click "Save Token"
   - Token is stored locally in browser

### OAuth Setup (For Copilot Models)

For access to advanced Copilot models (Claude, Gemini, GPT-5):

1. **Create GitHub OAuth App**
   - Go to GitHub Developer Settings → OAuth Apps
   - Click "New OAuth App"
   - Set Homepage URL: `https://yourdomain.github.io/yourrepo/`
   - Set Callback URL: `https://yourdomain.github.io/yourrepo/auth/callback`

2. **Configure in App**
   - Click GitHub card to open modal
   - Enter OAuth Client ID
   - Enter OAuth Client Secret (40-character hex)
   - Use Device Flow (recommended) or Web Flow (popup)

### Verify Setup

After saving token, you should see:
- "Token saved, fetching available models..." notification
- Models available count in toast notification
- Model dropdown populated with options

---

## Chat Interface

### Interface Components

The chat window is located at the bottom of the AI Assistant view and contains:

1. **Model Selector Bar** (top - floating)
   - Sticky positioned at top of chat window
   - Dynamically sized dropdown based on selected model
   - Chat History button (clock icon, top-left)
   - New Chat button (plus icon, top-right)
   - Always visible while chat messages scroll behind
   - Choose from available AI models

2. **Message Display Area**
   - Scrollable chat history below model selector
   - User messages on right (with GitHub avatar)
   - AI responses on left (with Copilot icon)
   - Syntax-highlighted code blocks with language labels
   - Copy button on code blocks
   - Professional message formatting

3. **Input Bar** (bottom)
   - Text input area with auto-resize
   - Web Search toggle (globe icon)
   - More Actions menu (three dots)
   - File attachment button (coming soon)
   - Send button

### Sending Messages

**Method 1: Click Send**
- Type message in text area
- Click red "Send" button

**Method 2: Keyboard Shortcut**
- Type message in text area
- Press `Enter` to send
- Press `Shift+Enter` for new line

### Message Formatting

AI responses support rich formatting:

**Text Formatting:**
- **Bold text**: Use `**bold**` in prompts
- *Italic text*: Recognized in responses
- `Code`: Inline code in backticks
- Lists: Bullet points and numbered lists

**Code Blocks:**
```python
# Python code is syntax highlighted with language header
def calculate_risk_reward(entry, stop, target):
    risk = entry - stop
    reward = target - entry
    return reward / risk
```

Code blocks feature:
- Language detection and header label
- Copy button for quick copying
- Syntax highlighting by language
- Dark theme styling

**Tables and Lists:**
- Markdown-style tables rendered
- Bullet points formatted cleanly
- Numbered lists preserved

---

## Web Search Tool

The AI Assistant includes a web search tool for real-time information retrieval.

### Enabling Web Search

1. **Toggle Web Search**
   - Click the globe icon in the input bar
   - Icon turns teal when active
   - AI can now search the web during responses

2. **How It Works**
   - User sends message with web search enabled
   - AI determines if web search is needed
   - Tool executes search via DuckDuckGo API (CORS-friendly)
   - Results returned to AI for synthesis
   - Final response includes citations

### Web Search Features

- **Search Query Execution**: AI formulates and executes search queries
- **URL Crawling**: Fetches and parses web page content
- **Content Extraction**: Extracts relevant text from HTML
- **Citation Support**: Sources cited in AI responses
- **Rate Limiting**: Built-in rate limiting for API calls
- **Caching**: Response caching to reduce redundant requests

### Tool Calling Loop

1. User → AI (with tool availability)
2. AI → Tool (search/crawl request)
3. Tool → AI (formatted results)
4. Loop 2-3 until sufficient (max 5 iterations)
5. AI → User (final response with citations)

---

## Quick Actions

Pre-configured prompts for common trading tasks. Each button automatically populates and sends a message.

### Review Grades

**What it does:**
- Analyzes your last 10 saved grades
- Identifies patterns in your trading
- Suggests improvements

**Sample prompt:**
```
Review my recent trades and provide insights:
AAPL: 88/100, TSLA: 92/100, MSFT: 75/100...

Analyze patterns, identify strengths/weaknesses, and suggest improvements.
```

**Best for:**
- Weekly trading review
- Identifying bias in grading
- Finding improvement areas

### Find Patterns

**What it does:**
- Compares high-scoring vs low-scoring trades
- Identifies successful patterns
- Highlights weaknesses to avoid

**Sample prompt:**
```
Find patterns in my trading grades:
[JSON data of last 20 trades]

Identify what makes my high-scoring trades different from low-scoring ones.
```

**Best for:**
- Monthly performance review
- Strategy refinement
- System improvement

### Market Sentiment

**What it does:**
- Provides current market overview
- Analyzes major indices
- Assesses risk environment

**Sample prompt:**
```
What is the current market sentiment? Consider:
- Major indices (SPY, QQQ, DIA)
- VIX levels
- Sector rotation
- Recent market news

Provide a brief actionable summary for day trading.
```

**Best for:**
- Daily market preparation
- Understanding current conditions
- Risk assessment

### Analyze Ticker

**What it does:**
- Opens modal to enter ticker symbol
- Provides detailed technical analysis
- Suggests PREPARE score estimate

**Sample prompt:**
```
Analyze AAPL for trading:
- Technical setup quality
- Key support/resistance levels
- Recent price action
- Volume analysis
- Risk/reward for entry today

Provide a PREPARE score estimate.
```

**Best for:**
- Pre-trade evaluation
- Technical analysis
- Setup confirmation

---

## Best Practices

### Writing Effective Prompts

**Be Specific:**
❌ "What do you think about TSLA?"
✅ "Analyze TSLA for a bullish breakout above $250. Current market is trending up. Should I take this C-grade (68/100) trade if R:R is 3:1?"

**Provide Context:**
- Include ticker symbol
- Mention your PREPARE score
- State market conditions
- Share your plan

**Ask for Action:**
❌ "Tell me about this trade"
✅ "Should I enter this trade? What's my risk? Where should I set my stop?"

### Getting Better Responses

1. **Include Your Score**
   - "This is an 85/100 B-grade setup"
   - Helps AI understand your evaluation

2. **Share Your Plan**
   - Entry, stop, target prices
   - Position size considerations
   - Time horizon

3. **Ask Both Sides**
   - Request bull and bear cases
   - Challenge your thesis
   - Identify risks

4. **Follow Up**
   - Build on previous responses
   - Ask clarifying questions
   - Dig deeper on key points

### Example Conversation

**You:**
```
I'm looking at NVDA breaking above $500 resistance. 
My PREPARE score is 87/100 (B grade).
Entry: $502, Stop: $490, Target: $540
That's a 3.2:1 R:R. Market is bullish, tech sector strong.
Should I take this trade?
```

**AI Response:**
```
Analysis of NVDA Breakout Setup:

BULLISH FACTORS:
• B-grade (87/100) indicates solid setup
• 3.2:1 R:R exceeds minimum 2:1 threshold
• Clear technical level at $500
• Favorable market environment

BEARISH RISKS:
• Round number resistance often sticky
• 2.4% stop distance may be tight
• Semiconductor sector overbought

RECOMMENDATION:
YES, this meets your criteria. Consider:
1. Entry: Wait for confirmation above $505
2. Stop: $490 is appropriate (2.4%)
3. Target: $540 reasonable (7.6%)
4. Position size: Standard (not reduced)
5. Monitor: Tech sector breadth

Risk management: Trail stop to breakeven at $515.
```

---

## Model Selection

### Available Models

The model picker allows selection between different AI models:

**Azure Inference Models (Working):**
- OpenAI GPT-4o
- OpenAI GPT-4o mini
- Mistral Nemo

**Copilot Models (Require OAuth):**
- Claude 3.5 Sonnet
- Claude Opus 4.5
- Google Gemini 2.5 Pro
- OpenAI GPT-5 series
- xAI Grok

### Model Comparison

| Model | Speed | Quality | Best For |
|-------|-------|---------|----------|
| GPT-4o mini | ⚡⚡⚡ | ⭐⭐⭐ | Quick queries, general chat |
| GPT-4o | ⚡⚡ | ⭐⭐⭐⭐ | Balanced performance |
| Mistral Nemo | ⚡⚡⚡ | ⭐⭐⭐ | Fast responses, efficient |

### When to Use Each Model

| Task | Recommended Model |
|------|------------------|
| Quick ticker check | GPT-4o Mini |
| Daily market sentiment | GPT-4o Mini |
| Trade plan review | GPT-4o |
| Pattern analysis | GPT-4o |
| Complex multi-factor analysis | GPT-4o |
| Code generation | GPT-4o |

### Changing Models

1. Click model dropdown at top of chat window
2. Select desired model from the list
3. Dropdown dynamically resizes to fit model name
4. Model applies to next message
5. Previous messages unaffected

---

## Sample Queries

### Trade Evaluation

```
Evaluate this trade setup:
- Ticker: AAPL
- Pattern: Bull flag on daily
- PREPARE Score: 82/100
- Entry: $175, Stop: $170, Target: $185
- R:R: 2:1
- Market: Bullish, tech rotating

Should I execute this B-grade trade?
```

### Risk Management

```
I have a position in MSFT at $350, currently at $360.
Original target was $375, original stop was $342.
Should I:
1. Take profit now?
2. Trail my stop?
3. Hold for original target?

Current market is showing some weakness.
```

### Pattern Recognition

```
I've noticed my A-grade trades on tech stocks 
have a 70% win rate, but my A-grade trades on 
small caps only win 40%. What might explain this 
difference and how should I adjust my strategy?
```

### Market Analysis

```
SPY is at all-time highs, VIX is at 12, 
and most sectors are green. However, 
breadth indicators show declining volume.
Is this a healthy market to trade or should 
I be cautious?
```

### Position Sizing

```
I have a $10,000 account and want to risk 
2% per trade. For a trade with:
- Entry: $50
- Stop: $47

How many shares should I buy and what's 
my dollar risk?
```

---

## Chat History

### Managing Conversations

**Chat History Button** (top-left clock icon):
- Opens dropdown with saved conversations
- Shows last 20 chats
- Click to load a previous chat
- Swipe left to delete a chat

**New Chat Button** (top-right plus icon):
- Starts a fresh conversation
- Current chat is auto-saved
- Clears message display
- Resets context

### Auto-Save Feature

- Chats auto-save after each AI response
- Last 20 conversations retained
- Stored in browser localStorage
- Survives page refresh

### Chat Management

1. **Load Previous Chat**
   - Click chat history button
   - Select chat from dropdown
   - Conversation loads with full history

2. **Delete Chat**
   - Click chat history button
   - Swipe left on chat item
   - Tap delete icon to confirm

3. **Start New Chat**
   - Click plus button (top-right)
   - Or use Quick Actions after loading history

---

## Advanced Usage

### Multi-Turn Conversations

Build context across messages:

**Turn 1:**
```
Analyze TSLA technical setup at current levels
```

**Turn 2:**
```
What if it breaks below the 50-day MA?
```

**Turn 3:**
```
Given that scenario, where should I set my stop?
```

### Analyzing Trade History

Export your trade data and paste:

```
Here are my last 10 trades:

1. AAPL - A grade (92) - WIN +5.2%
2. TSLA - B grade (83) - LOSS -3.1%
3. MSFT - A grade (95) - WIN +7.8%
...

What patterns do you see? Why are some 
A-grade trades losing?
```

### Using Web Search

Enable web search for real-time data:

```
[With web search enabled]
What is the current price of NVDA and recent news?
```

The AI will search the web and cite sources in its response.

### Strategy Development

```
I want to develop a strategy for trading 
52-week high breakouts. Based on PREPARE 
methodology, what key factors should I 
evaluate? What minimum scores should each 
component have?
```

### Post-Trade Review

```
I took this trade and got stopped out:
- Stock: XYZ
- PREPARE: 78/100
- Entry: $100, Stop: $95 (hit), Target: $110
- Market was choppy
- Pattern was bull flag but volume was weak

What did I miss? Should my minimum score 
be higher?
```

---

## Static Backend Server

### Overview

The Static Backend Server is a client-side "server" architecture built entirely in JavaScript. It enables features like OAuth authentication and intelligent API routing without requiring a traditional backend server.

### Architecture

```javascript
const StaticBackend = {
    ENDPOINTS: {
        AZURE_INFERENCE: 'https://models.inference.ai.azure.com',
        COPILOT_CHAT: 'https://api.githubcopilot.com/chat/completions'
    },
    // Intelligent routing, token management, cross-tab sync
}
```

### Features

**BroadcastChannel** - Cross-tab token synchronization
**Intelligent Router** - Routes requests to correct endpoint based on model
**Token Validator** - Validates GitHub tokens before API calls
**Model Registry** - Curated model list with endpoint mapping

### CORS Widget

The CORS Widget enables CORS-bypassed requests from static sites:

```javascript
CorsWidget: {
    PROXIES: [
        { name: 'corsproxy.io', supportsPost: true },
        { name: 'cors.sh', supportsPost: true },
        { name: 'crossorigin.me', supportsPost: true }
    ],
    async postForm(url, data) { /* CORS-bypassed POST */ },
    async fetch(url, options) { /* CORS-bypassed fetch */ }
}
```

**Used For:**
- OAuth token exchange (POST)
- Device Flow polling (POST)
- Web search/crawling (GET)
- Any external API needing CORS bypass

### OAuth Flows

**Device Flow (Recommended):**
1. Click "Device Flow" button
2. Get user code (e.g., `ABCD-1234`)
3. Go to github.com/login/device
4. Enter the code
5. App polls for completion
6. Token stored and synced

**Web Flow (Popup):**
1. Click "Web (Popup)" button
2. Popup opens with GitHub auth
3. User authorizes app
4. Callback exchanges code for token
5. Token sent to parent via postMessage
6. Popup closes automatically

---

## Troubleshooting

### AI Not Responding

**Check Token:**
- Verify token is saved
- Token must have model access
- Try regenerating token

**Check Model:**
- Try different model from dropdown
- Some models may have rate limits
- GPT-4o Mini usually most reliable

**Check Connection:**
- Requires internet access
- Check browser console for errors
- Verify GitHub API status

### Web Search Not Working

**Check Toggle:**
- Verify globe icon is active (teal color)
- Try toggling off and on

**Check CORS Proxies:**
- CORS Widget auto-switches proxies
- May need to wait for proxy fallback
- Check console for proxy errors

**Rate Limiting:**
- DuckDuckGo has rate limits
- Wait a moment between searches
- Reduce search frequency

### OAuth Errors

**Device Flow Issues:**
- Ensure Client ID is correct
- Check for typos in user code
- Code expires after 15 minutes
- Try generating new code

**Web Flow Issues:**
- Popup may be blocked - enable popups
- Verify callback URL matches OAuth App settings
- Check Client Secret format (40-char hex)
- Try Device Flow instead

### Poor Quality Responses

**Improve Prompts:**
- Add more context
- Be more specific
- Include relevant numbers

**Try Different Model:**
- GPT-4o for complex analysis
- Mistral Nemo for speed
- Avoid unsupported models

**Break Down Questions:**
- Ask one thing at a time
- Build context gradually
- Follow up for details

### Rate Limiting

**Symptoms:**
- Errors after several messages
- "Too many requests" message

**Solutions:**
- Wait a few minutes
- Switch to different model
- Reduce message frequency

### Chat History Issues

**Chats Not Saving:**
- Check browser localStorage is enabled
- Not in incognito/private mode
- Storage may be full

**Can't Delete Chat:**
- Swipe left on the chat item
- Tap the delete icon
- Try refreshing the page

### Formatting Issues

**Code Blocks:**
- AI uses triple backticks
- Should render with language header
- Copy button should appear
- Report if not displaying

**Lists:**
- Should show bullet points
- May need to scroll
- Check for rendering errors

---

## Privacy & Security

### Data Storage
- Token stored locally in browser
- Chat history persisted in localStorage
- OAuth tokens encrypted by browser
- No data sent to external servers (except APIs)

### Best Practices
- Don't share your API token
- Don't include personal financial details
- Use tickers, not account numbers
- Clear chat when using shared devices
- Rotate tokens periodically

### Token Security
- Rotate tokens periodically
- Revoke if compromised
- Use minimum required permissions
- Monitor API usage
- OAuth tokens auto-refresh

---

## Feature Roadmap

### Implemented ✅
- Web Search tool with citations
- Chat History with persistence
- New Chat button
- Syntax highlighting with copy
- Static Backend Server
- OAuth Device Flow
- OAuth Web Flow (popup)
- CORS Widget for API calls

### Coming Soon
- File attachment support
- Export conversations
- Custom system prompts
- Voice input (mobile)

### Under Consideration
- Trade alerts via AI
- Automated pattern detection
- Real-time market data integration
- Strategy backtesting suggestions

---

## Tips for Success

1. **Start Simple**
   - Use Quick Actions first
   - Learn from AI responses
   - Build up to complex queries

2. **Use Web Search**
   - Enable for real-time data
   - Get current prices and news
   - Verify information with sources

3. **Manage Chat History**
   - Start new chats for new topics
   - Keep related queries in same chat
   - Delete old chats to save space

4. **Be Patient**
   - Some models take time
   - Quality over speed
   - Let AI finish thinking

5. **Iterate**
   - Follow up on responses
   - Ask clarifying questions
   - Refine your prompts

6. **Stay Critical**
   - AI is a tool, not a guru
   - Verify important information
   - Make your own decisions

7. **Track Results**
   - Note which prompts work
   - Save effective queries
   - Build your prompt library

---

**Last Updated:** January 2026  
**Version:** 2.0.0
