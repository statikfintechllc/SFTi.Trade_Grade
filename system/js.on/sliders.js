// sliders.js - Slider controls and scoring calculations
// Manages PREPARE scoring sliders and trade plan calculations (R:R ratios, stop loss, profit targets)

// =============================================
// State Management
// =============================================

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

// =============================================
// Slider Functions
// =============================================

function updateSlider(name, value, max) {
    state[name] = parseInt(value);
    document.getElementById(`${name}-value`).textContent = value;
    
    const slider = document.getElementById(`${name}-slider`);
    const percent = ((value - 1) / (max - 1)) * 100;
    slider.style.background = `linear-gradient(to right, #cc0000 0%, #cc0000 ${percent}%, #1a1a1a ${percent}%, #1a1a1a 100%)`;
    
    updateTotal();
}

function updateTotal() {
    const total = Object.values(state).reduce((a, b) => a + b, 0);
    document.getElementById('totalScore').textContent = total;
    document.getElementById('progressFill').style.width = `${(total / 100) * 100}%`;
}

// =============================================
// Trade Plan Functions
// =============================================

function continueToTracker() {
    const ticker = document.getElementById('tickerInput').value.trim().toUpperCase();
    
    if (!ticker) {
        showToast('Please enter a ticker symbol', 'warning', 'Missing Ticker');
        return;
    }

    // Store grade data in trade plan state
    trackerState.ticker = ticker;
    trackerState.scores = { ...state };
    trackerState.total = Object.values(state).reduce((a, b) => a + b, 0);
    trackerState.screenshot = currentScreenshot;
    
    // Navigate to trade plan view
    switchView('tracker');
}

function initializeTracker() {
    // Display ticker and score
    document.getElementById('trackerTickerLabel').textContent = trackerState.ticker || '---';
    document.getElementById('trackerScoreLabel').textContent = trackerState.total || '--';
    
    // Reset entry price input
    document.getElementById('entryPriceInput').value = '';
    
    // Reset thoughts input
    document.getElementById('tradeThoughtsInput').value = '';
    
    // Initialize slider values and display
    trackerState.stopLossPercent = 7;
    trackerState.profitTargetPercent = 20;
    trackerState.entryPrice = 0;
    trackerState.thoughts = '';
    
    document.getElementById('stopLoss-slider').value = 7;
    document.getElementById('profitTarget-slider').value = 20;
    
    updateTrackerSlider('stopLoss', 7);
    updateTrackerSlider('profitTarget', 20);
    updateTrackerCalculations();
    
    // Add entry price input listener (only once)
    const entryInput = document.getElementById('entryPriceInput');
    if (entryInput && !entryInput._hasTrackerListener) {
        entryInput.addEventListener('input', function() {
            trackerState.entryPrice = parseFloat(this.value) || 0;
            updateTrackerCalculations();
        });
        entryInput._hasTrackerListener = true;
    }
}

function updateTrackerSlider(name, value) {
    const floatValue = parseFloat(value);
    
    if (name === 'stopLoss') {
        trackerState.stopLossPercent = floatValue;
        document.getElementById('stopLoss-value').textContent = floatValue + '%';
        
        // Update slider background
        const percent = ((floatValue - 5) / (10 - 5)) * 100;
        document.getElementById('stopLoss-slider').style.background = 
            `linear-gradient(to right, #ff4444 0%, #ff4444 ${percent}%, #1a1a1a ${percent}%, #1a1a1a 100%)`;
    } else if (name === 'profitTarget') {
        trackerState.profitTargetPercent = floatValue;
        document.getElementById('profitTarget-value').textContent = floatValue + '%';
        
        // Update slider background
        const percent = ((floatValue - 15) / (30 - 15)) * 100;
        document.getElementById('profitTarget-slider').style.background = 
            `linear-gradient(to right, #00ff00 0%, #00ff00 ${percent}%, #1a1a1a ${percent}%, #1a1a1a 100%)`;
    }
    
    updateTrackerCalculations();
}

function updateTrackerCalculations() {
    const entry = trackerState.entryPrice;
    const stopPercent = trackerState.stopLossPercent;
    const targetPercent = trackerState.profitTargetPercent;
    
    if (entry > 0) {
        const stopPrice = entry * (1 - stopPercent / 100);
        const targetPrice = entry * (1 + targetPercent / 100);
        const riskAmount = entry - stopPrice;
        const rewardAmount = targetPrice - entry;
        const rrRatio = riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(1) : 0;
        
        // Update displays
        document.getElementById('stopPriceDisplay').textContent = '$' + stopPrice.toFixed(2);
        document.getElementById('targetPriceDisplay').textContent = '$' + targetPrice.toFixed(2);
        document.getElementById('summaryEntry').textContent = '$' + entry.toFixed(2);
        document.getElementById('summaryStop').textContent = '$' + stopPrice.toFixed(2);
        document.getElementById('summaryTarget').textContent = '$' + targetPrice.toFixed(2);
        document.getElementById('rrRatioValue').textContent = rrRatio;
        
        // Update R:R quality indicator
        const rrQualityEl = document.getElementById('rrQuality');
        const rrNum = parseFloat(rrRatio);
        if (rrNum >= 3) {
            rrQualityEl.textContent = '🔥 Excellent';
            rrQualityEl.style.background = 'rgba(0, 255, 0, 0.3)';
            rrQualityEl.style.color = '#00ff00';
        } else if (rrNum >= 2) {
            rrQualityEl.textContent = '✅ Good';
            rrQualityEl.style.background = 'rgba(0, 200, 0, 0.3)';
            rrQualityEl.style.color = '#00cc00';
        } else if (rrNum >= 1.5) {
            rrQualityEl.textContent = '⚠️ Acceptable';
            rrQualityEl.style.background = 'rgba(255, 204, 0, 0.3)';
            rrQualityEl.style.color = '#ffcc00';
        } else {
            rrQualityEl.textContent = '❌ Poor';
            rrQualityEl.style.background = 'rgba(255, 68, 68, 0.3)';
            rrQualityEl.style.color = '#ff4444';
        }
    } else {
        // Reset displays when no entry price
        document.getElementById('stopPriceDisplay').textContent = '$0.00';
        document.getElementById('targetPriceDisplay').textContent = '$0.00';
        document.getElementById('summaryEntry').textContent = '$0.00';
        document.getElementById('summaryStop').textContent = '$0.00';
        document.getElementById('summaryTarget').textContent = '$0.00';
        document.getElementById('rrRatioValue').textContent = '0.0';
        
        const rrQualityEl = document.getElementById('rrQuality');
        rrQualityEl.textContent = 'Enter price';
        rrQualityEl.style.background = 'rgba(136, 136, 136, 0.3)';
        rrQualityEl.style.color = '#888';
    }
}

function saveTradePlan() {
    if (!trackerState.ticker) {
        showToast('No trade to save. Please grade a stock first.', 'warning', 'Missing Data');
        return;
    }
    
    const entry = trackerState.entryPrice;
    if (!entry || entry <= 0) {
        showToast('Please enter a valid entry price', 'warning', 'Invalid Price');
        return;
    }
    
    // Get the thoughts from the textarea
    const thoughts = document.getElementById('tradeThoughtsInput').value.trim();
    
    const stopPrice = entry * (1 - trackerState.stopLossPercent / 100);
    const targetPrice = entry * (1 + trackerState.profitTargetPercent / 100);
    const riskAmount = entry - stopPrice;
    const rewardAmount = targetPrice - entry;
    const rrRatio = riskAmount > 0 ? parseFloat((rewardAmount / riskAmount).toFixed(1)) : 0;
    
    const trade = {
        id: Date.now().toString(),
        ticker: trackerState.ticker,
        timestamp: new Date().toISOString(),
        grade: {
            scores: trackerState.scores,
            total: trackerState.total
        },
        screenshot: trackerState.screenshot,
        plan: {
            entry: entry,
            stopLoss: parseFloat(stopPrice.toFixed(2)),
            stopPercent: trackerState.stopLossPercent,
            target: parseFloat(targetPrice.toFixed(2)),
            targetPercent: trackerState.profitTargetPercent,
            riskReward: rrRatio,
            thoughts: thoughts
        },
        execution: {
            actualEntry: null,
            actualExit: null,
            outcome: null,
            pnl: null
        }
    };
    
    let grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
    grades.unshift(trade);
    localStorage.setItem('prepareGrades', JSON.stringify(grades));
    
    showToast(`Entry: $${entry.toFixed(2)} | Stop: $${stopPrice.toFixed(2)} | Target: $${targetPrice.toFixed(2)}<br>R:R Ratio: ${rrRatio}:1`, 'success', `${trade.ticker} Trade Plan Saved`, 5000, 'history');
    
    // Reset for next trade
    document.getElementById('tickerInput').value = '';
    clearScreenshot();
    resetSliders();
    trackerState.ticker = '';
    trackerState.scores = null;
    trackerState.total = 0;
    trackerState.screenshot = null;
    trackerState.thoughts = '';
    
    // Go back to grade view
    switchView('grade');
}

function getGradeLetter(total) {
    if (total >= 90) return 'A';
    if (total >= 75) return 'B';
    if (total >= 60) return 'C';
    return 'D';
}

function resetSliders() {
    state.pattern = 10;
    state.risk = 10;
    state.entry = 5;
    state.performance = 5;
    state.time = 10;
    state.catalyst = 5;
    state.environment = 5;

    document.getElementById('pattern-slider').value = 10;
    document.getElementById('risk-slider').value = 10;
    document.getElementById('entry-slider').value = 5;
    document.getElementById('performance-slider').value = 5;
    document.getElementById('time-slider').value = 10;
    document.getElementById('catalyst-slider').value = 5;
    document.getElementById('environment-slider').value = 5;

    updateSlider('pattern', 10, 20);
    updateSlider('risk', 10, 20);
    updateSlider('entry', 5, 10);
    updateSlider('performance', 5, 10);
    updateSlider('time', 10, 20);
    updateSlider('catalyst', 5, 10);
    updateSlider('environment', 5, 10);
}

// =============================================
// Global Exports
// =============================================

// Expose all functions globally for HTML event handlers and other scripts
window.state = state;
window.trackerState = trackerState;
window.updateSlider = updateSlider;
window.updateTotal = updateTotal;
window.continueToTracker = continueToTracker;
window.initializeTracker = initializeTracker;
window.updateTrackerSlider = updateTrackerSlider;
window.updateTrackerCalculations = updateTrackerCalculations;
window.saveTradePlan = saveTradePlan;
window.getGradeLetter = getGradeLetter;
window.resetSliders = resetSliders;
