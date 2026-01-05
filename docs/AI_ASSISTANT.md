# AI Assistant Guide

## Overview

The AI Assistant in SFTi P.R.E.P integrates with GitHub Models API to provide intelligent trading insights, analysis, and decision support through a conversational chat interface.

---

## Table of Contents

1. [Setup and Configuration](#setup-and-configuration)
2. [Chat Interface](#chat-interface)
3. [Quick Actions](#quick-actions)
4. [Best Practices](#best-practices)
5. [Model Selection](#model-selection)
6. [Sample Queries](#sample-queries)
7. [Advanced Usage](#advanced-usage)
8. [Troubleshooting](#troubleshooting)

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
   - Paste token in "GitHub Token" field
   - Click "Save Token"
   - Token is stored locally in browser

### Verify Setup

After saving token, you should see:
- "Token saved, fetching available models..." notification
- Models available count in toast notification
- Model dropdown populated with options

---

## Chat Interface

### Interface Components

The chat window is located at the bottom of the AI Assistant view and contains:

1. **Message Display Area**
   - Scrollable chat history
   - User messages on right (red theme)
   - AI responses on left (dark theme)
   - Professional message formatting

2. **Input Bar** (bottom)
   - Text input area with auto-resize
   - File attachment button (coming soon)
   - Model selector dropdown
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
# Python code is syntax highlighted
def calculate_risk_reward(entry, stop, target):
    risk = entry - stop
    reward = target - entry
    return reward / risk
```

**Tables and Lists:**
- Markdown-style tables rendered
- Bullet points formatted cleanly
- Numbered lists preserved

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

The model picker allows selection between different AI models with varying capabilities:

**GPT-4o Mini** (Default)
- Fastest response time
- Lower cost per request
- Good for quick questions
- Adequate for most trading queries

**GPT-4o**
- Balanced performance
- Better reasoning
- Good for complex analysis
- Recommended for detailed reviews

**GPT-4**
- Most capable model
- Best reasoning ability
- Slower responses
- Use for critical decisions

**GPT-3.5 Turbo**
- Very fast
- Basic capabilities
- Good for simple questions
- Lower quality analysis

### When to Use Each Model

| Task | Recommended Model |
|------|------------------|
| Quick ticker check | GPT-4o Mini |
| Daily market sentiment | GPT-4o Mini |
| Trade plan review | GPT-4o |
| Pattern analysis | GPT-4o |
| Monthly performance review | GPT-4 |
| Complex multi-factor analysis | GPT-4 |
| Simple definitions | GPT-3.5 Turbo |

### Changing Models

1. Click model dropdown in chat bar
2. Select desired model
3. Model applies to next message
4. Previous messages unaffected

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

### Poor Quality Responses

**Improve Prompts:**
- Add more context
- Be more specific
- Include relevant numbers

**Try Different Model:**
- GPT-4 for complex analysis
- GPT-4o for balanced results
- Avoid GPT-3.5 Turbo for trading

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

### Formatting Issues

**Code Blocks:**
- AI uses triple backticks
- Should render in gray box
- Report if not displaying

**Lists:**
- Should show bullet points
- May need to scroll
- Check for rendering errors

---

## Privacy & Security

### Data Storage
- Token stored locally in browser
- Chat history not persisted
- No data sent to servers (except GitHub API)

### Best Practices
- Don't share your API token
- Don't include personal financial details
- Use tickers, not account numbers
- Clear chat when using shared devices

### Token Security
- Rotate tokens periodically
- Revoke if compromised
- Use minimum required permissions
- Monitor API usage

---

## Feature Roadmap

### Coming Soon
- File attachment support
- Chat history persistence
- Export conversations
- Custom system prompts
- Multiple chat threads
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

2. **Be Patient**
   - Some models take time
   - Quality over speed
   - Let AI finish thinking

3. **Iterate**
   - Follow up on responses
   - Ask clarifying questions
   - Refine your prompts

4. **Stay Critical**
   - AI is a tool, not a guru
   - Verify important information
   - Make your own decisions

5. **Track Results**
   - Note which prompts work
   - Save effective queries
   - Build your prompt library

---

**Last Updated:** January 2026  
**Version:** 1.0.0
