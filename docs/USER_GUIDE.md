# User Guide - SFTi P.R.E.P Trading Journal

## Table of Contents

1. [Getting Started](#getting-started)
2. [Grade Stock](#grade-stock)
3. [Trade Plan](#trade-plan)
4. [Finalize Trades](#finalize-trades)
5. [History](#history)
6. [AI Assistant](#ai-assistant)

---

## Getting Started

### First Time Setup

1. **Open the Application**
   - Open `index.html` in your browser
   - Or visit the deployed web address

2. **Install as PWA (Optional)**
   - On mobile: Tap "Add to Home Screen"
   - On desktop: Look for install icon in address bar
   - Benefits: Offline access, app-like experience

3. **Configure AI Assistant (Optional)**
   - Navigate to AI Assistant tab
   - Enter your GitHub Models API token
   - Click "Save Token"

---

## Grade Stock

The **Grade Stock** view is where you evaluate potential trades using the PREPARE methodology.

### How to Grade a Stock

1. **Enter Ticker Symbol**
   - Type the stock ticker (e.g., "AAPL", "TSLA")
   - Ticker is saved with your grade

2. **Adjust PREPARE Sliders**
   - **P - Pattern/Price** (0-20 points)
     - Quality of technical setup
     - Chart pattern strength
   
   - **R - Risk/Reward** (0-20 points)
     - Risk-to-reward ratio
     - Position sizing potential
   
   - **E - Ease of Entry/Exit** (0-10 points)
     - Liquidity and volume
     - Spread and slippage concerns
   
   - **P - Past Performance** (0-10 points)
     - Historical behavior at similar levels
     - Previous breakout/breakdown success
   
   - **A - At What Time Is It?** (0-20 points)
     - Time of day considerations
     - Market timing and momentum
   
   - **R - Reason/Catalyst** (0-10 points)
     - News, earnings, or events
     - Fundamental catalysts
   
   - **E - Market Environment** (0-10 points)
     - Overall market conditions
     - Sector performance

3. **Add Screenshot (Optional)**
   - Click "Add Screenshot"
   - Select chart image from your device
   - Max file size: 2MB

4. **Review Your Score**
   - Total score displayed at top
   - A: 90-100, B: 75-89, C: 60-74, D: <60

5. **Continue to Trade Plan**
   - Click "Continue" to plan your trade
   - Or save grade without a plan

---

## Trade Plan

After grading, create a detailed trade plan with entry, stop loss, and profit target.

### Creating a Trade Plan

1. **Set Entry Price**
   - Enter your intended entry price
   - This is your actual buy/sell price

2. **Configure Stop Loss**
   - Drag slider to set stop loss percentage (5-10%)
   - Price calculated automatically
   - Red indicator shows risk level

3. **Set Profit Target**
   - Drag slider to set target percentage (15-30%)
   - Price calculated automatically
   - Green indicator shows potential gain

4. **Review Risk/Reward Ratio**
   - Automatically calculated
   - Aim for minimum 2:1 ratio

5. **Add Trade Thoughts (Optional)**
   - Document your reasoning
   - Note key levels or conditions
   - Reference market context

6. **Save Trade Plan**
   - Click "Save Trade Plan"
   - Trade added to history
   - Ready for execution

### Best Practices

- **Minimum R:R Ratio**: Target 2:1 or better
- **Stop Loss Range**: Keep between 5-10% for most trades
- **Profit Target**: Aim for 15-30% based on setup
- **Document Everything**: Add thoughts for future review

---

## Finalize Trades

Track the outcome of your executed trades in the **Finalize Trades** view.

### Finalizing a Trade

1. **Navigate to Finalize Tab**
   - Shows all non-finalized trade plans
   - Pending trades marked with clock icon

2. **Select Trade to Finalize**
   - Click on the trade card
   - Review original plan details

3. **Choose Outcome**
   - **Rejected (Not Taken)**: 
     - Trade was not executed
     - Removes from journal
   - **Accepted (Executed)**:
     - Trade was taken
     - Proceed to enter details

4. **Enter Trade Details**
   - **Result**: Select Stop Loss or Profit Target
   - **Position Size**: Number of shares/contracts
   - **Unit Type**: Shares, Contracts, or Lots
   - **Strategy Used**: Describe your approach

5. **Submit Finalization**
   - Click "Finalize Trade"
   - Trade marked as complete
   - Outcome tracked in history

### Trade Outcome Icons

- ✓ Green checkmark = Profit target hit
- ✗ Red X = Stop loss hit
- ⏱ Clock = Pending finalization

---

## History

View, search, and analyze all your trades in the **History** view.

### Viewing Trade History

1. **Browse All Trades**
   - Most recent trades shown first
   - Color-coded by grade (A=green, B=light green, C=yellow, D=red)
   - Click any trade to see full details

2. **Filter Trades**
   - **By Ticker**: Search specific symbol
   - **By Grade**: Filter A, B, C, or D trades
   - **By Status**: Finalized or pending
   - **By Strategy**: Filter by strategy name

3. **Trade Card Information**
   - Ticker and grade badge
   - Outcome indicator (if finalized)
   - PREPARE scores breakdown
   - Trade plan (if exists)
   - Screenshot thumbnail

4. **Trade Actions**
   - **Analyze**: Send to AI for analysis
   - **Delete**: Remove from history

### Trade Details Modal

Click any trade to see:
- Full PREPARE score breakdown
- Complete trade plan with all prices
- Entry, stop loss, and profit target
- Risk/reward ratio
- Strategy and position size (if finalized)
- Trade thoughts/notes
- Full-size screenshot

### Performance Tracking

Monitor your trading:
- Win rate by grade level
- Average R:R achieved
- Most profitable strategies
- Common patterns in winners vs losers

---

## AI Assistant

Get trading insights and analysis using AI in the **AI Assistant** view.

### Setup

1. **Get GitHub Token**
   - Visit [GitHub Models](https://github.com/marketplace/models)
   - Generate a personal access token with model access
   - Copy the token (starts with `ghp_`)

2. **Save Token**
   - Click the GitHub logo card (left card at top of view)
   - Paste token in the modal input field
   - Click "Save Token"
   - Token stored locally in browser

### Token Access Cards

Two side-by-side cards at the top:

- **GitHub Card** (left): Opens modal to configure GitHub Models token
- **API Card** (right): Placeholder for future API configuration

### Using Quick Actions

Pre-configured AI prompts for common tasks:

- **Review Grades**: Analyze recent trade grades
- **Find Patterns**: Identify trends in your trading
- **Market Sentiment**: Get current market overview
- **Analyze Ticker**: Deep dive on specific stock

### Chat Interface

1. **Select AI Model**
   - Use dropdown at top of chat window
   - Always visible, floats above scrolling messages
   - Dynamically sized based on model name
   - Choose from dropdown:
     - GPT-4o Mini (faster, cheaper)
     - GPT-4o (balanced)
     - GPT-4 (most capable)
     - GPT-3.5 Turbo (fast, basic)

2. **Start Conversation**
   - Type message in the chat bar at bottom
   - Press Enter to send (Shift+Enter for new line)

3. **Attach Files (Coming Soon)**
   - Upload chart screenshots
   - Share trade analysis

4. **View Responses**
   - User messages: Right side, red theme
   - AI responses: Left side, formatted
   - Code blocks and lists rendered properly

### Sample AI Queries

- "Analyze TSLA for a breakout trade"
- "What's a good stop loss for a 52-week high breakout?"
- "Review my last 5 trades and find patterns"
- "What's the current market sentiment for tech stocks?"
- "Should I take a C-grade trade with a 3:1 R:R?"

### Tips for Best Results

- **Be Specific**: Include ticker, timeframe, and context
- **Ask Follow-ups**: Build on previous responses
- **Share Scores**: Mention PREPARE grades for context
- **Request Analysis**: Ask for both bull and bear cases

---

## Keyboard Shortcuts

- **Enter**: Send message in chat (AI Assistant)
- **Shift+Enter**: New line in chat
- **Esc**: Close modals

---

## Tips & Best Practices

### Grading
- Grade BEFORE checking stock price
- Be honest with scores - they help you improve
- Save screenshots for future reference
- Grade consistently using the same criteria

### Trading
- Only trade A and B grades
- Respect your stop losses always
- Target minimum 2:1 R:R ratio
- Document your reasoning in thoughts

### Review
- Review finalized trades weekly
- Use AI to find patterns in your data
- Study your losing trades to improve
- Track which strategies work best

### Data Management
- Export important screenshots externally
- Browser storage is local only
- Refresh button updates app without losing data
- Backup data periodically (manual)

---

## Troubleshooting

### App Not Loading
- Clear browser cache
- Try different browser
- Check internet connection for AI features

### AI Not Responding
- Verify GitHub token is correct
- Check token has model access
- Try different model from dropdown
- Check browser console for errors

### Data Not Saving
- Ensure browser allows local storage
- Check available storage space
- Don't use incognito/private mode

### Screenshots Not Uploading
- File size must be under 2MB
- Only image files supported
- Try different image format
- Compress large images before upload

---

## Support

For issues or questions:
1. Check this user guide
2. Review technical documentation
3. Open an issue on GitHub
4. Contact support

---

**Last Updated:** January 2026  
**Version:** 1.0.0
