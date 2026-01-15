    // Configuration constants
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

    // Toast Notification System
    function showToast(message, type = 'info', title = null, duration = 4000, navigationView = null) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        
        // Make toast clickable if navigation is provided
        if (navigationView) {
            toast.style.cursor = 'pointer';
            toast.addEventListener('click', function(e) {
                // Don't navigate if clicking the close button
                if (!e.target.closest('.toast-close')) {
                    switchView(navigationView);
                    closeToast();
                }
            });
        }
        
        const icons = {
            success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>',
            error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
            warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };
        
        const defaultTitles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };
        
        const displayTitle = title || defaultTitles[type] || 'Notification';
        
        // Helper to close toast with animation
        function closeToast() {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }
        
        toast.innerHTML = `
            <div class="toast-icon ${type}">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${escapeHtml(displayTitle)}</div>
                <div class="toast-message">${message}</div>
                ${navigationView ? '<div style="font-size: 10px; color: rgba(255,255,255,0.6); margin-top: 4px;">Click to view</div>' : ''}
            </div>
            <button class="toast-close" aria-label="Close notification">×</button>
        `;
        
        // Add click listener for close button
        toast.querySelector('.toast-close').addEventListener('click', closeToast);
        
        container.appendChild(toast);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                closeToast();
            }
        }, duration);
        
        return toast;
    }

    // Security: HTML escape function to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function toggleMenu() {
        const menu = document.getElementById('sideMenu');
        const overlay = document.getElementById('overlay');
        const hamburger = document.querySelector('.hamburger');
        
        menu.classList.toggle('active');
        overlay.classList.toggle('active');
        hamburger.classList.toggle('active');
    }

    function switchView(view) {
        const gradeView = document.getElementById('gradeView');
        const trackerView = document.getElementById('trackerView');
        const finalizeView = document.getElementById('finalizeView');
        const historyView = document.getElementById('historyView');
        const aiView = document.getElementById('aiView');
        const chatWindow = document.getElementById('chatWindow');
        const gradeBtn = document.getElementById('gradeBtn');
        const trackerBtn = document.getElementById('trackerBtn');
        const finalizeBtn = document.getElementById('finalizeBtn');
        const historyBtn = document.getElementById('historyBtn');
        const aiBtn = document.getElementById('aiBtn');

        // Hide all views and deactivate all buttons
        gradeView.style.display = 'none';
        trackerView.style.display = 'none';
        finalizeView.style.display = 'none';
        historyView.style.display = 'none';
        aiView.style.display = 'none';
        if (chatWindow) chatWindow.style.display = 'none';
        gradeBtn.classList.remove('active');
        trackerBtn.classList.remove('active');
        finalizeBtn.classList.remove('active');
        historyBtn.classList.remove('active');
        aiBtn.classList.remove('active');

        if (view === 'grade') {
            gradeView.style.display = 'block';
            gradeBtn.classList.add('active');
        } else if (view === 'tracker') {
            trackerView.style.display = 'block';
            trackerBtn.classList.add('active');
            initializeTracker();
        } else if (view === 'finalize') {
            finalizeView.style.display = 'block';
            finalizeBtn.classList.add('active');
            loadFinalizeView();
        } else if (view === 'history') {
            historyView.style.display = 'block';
            historyBtn.classList.add('active');
            loadHistory();
        } else if (view === 'ai') {
            aiView.style.display = 'block';
            aiBtn.classList.add('active');
            loadToken();
            // Show chat window when AI view is active
            if (chatWindow) {
                chatWindow.style.display = 'flex';
            }
        }
        
        // Only toggle menu if it's open (for menu button clicks)
        const menu = document.getElementById('sideMenu');
        if (menu.classList.contains('active')) {
            toggleMenu();
        }
    }

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

    // Trade Plan Functions
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

    function filterHistory() {
        historyFilterTicker = document.getElementById('historySearchInput').value.trim().toUpperCase();
        historyFilterGrade = document.getElementById('historyGradeFilter').value;
        historyFilterStatus = document.getElementById('historyStatusFilter').value;
        historyFilterStrategy = document.getElementById('historyStrategyFilter').value;
        loadHistory();
    }

    // Screenshot handling functions with size validation
    function handleScreenshot(input) {
        const file = input.files[0];
        if (file) {
            // Validate file size
            if (file.size > CONFIG.MAX_SCREENSHOT_SIZE) {
                showToast(`Maximum size is ${CONFIG.MAX_SCREENSHOT_SIZE / (1024 * 1024)}MB. Please choose a smaller image.`, 'error', 'Screenshot Too Large');
                input.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                currentScreenshot = e.target.result;
                document.getElementById('previewImg').src = currentScreenshot;
                document.getElementById('screenshotPreview').style.display = 'block';
                document.getElementById('screenshotBtnText').textContent = 'Change Screenshot';
            };
            reader.onerror = function() {
                showToast('Failed to read the selected file. Please try again with a different screenshot.', 'error', 'File Error');
                clearScreenshot();
            };
            reader.readAsDataURL(file);
        }
    }

    function clearScreenshot() {
        currentScreenshot = null;
        document.getElementById('screenshotPreview').style.display = 'none';
        document.getElementById('screenshotInput').value = '';
        document.getElementById('screenshotBtnText').textContent = 'Add Screenshot';
    }

    function saveGrade() {
        const ticker = document.getElementById('tickerInput').value.trim().toUpperCase();
        
        if (!ticker) {
            showToast('Please enter a ticker symbol', 'warning', 'Missing Ticker');
            return;
        }

        const grade = {
            id: Date.now().toString(),
            ticker: ticker,
            timestamp: new Date().toISOString(),
            scores: { ...state },
            total: Object.values(state).reduce((a, b) => a + b, 0),
            screenshot: currentScreenshot
        };

        let grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
        grades.unshift(grade);
        localStorage.setItem('prepareGrades', JSON.stringify(grades));

        showToast(`Score: ${grade.total}/100`, 'success', `${ticker} Saved`);
        
        document.getElementById('tickerInput').value = '';
        clearScreenshot();
        resetSliders();
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

    function loadHistory() {
        let grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
        const container = document.getElementById('historyContainer');

        // Populate strategy filter dropdown with unique strategies
        const strategySet = new Set();
        for (const g of grades) {
            if (g && g.outcome && g.outcome.strategy) {
                strategySet.add(g.outcome.strategy);
            }
        }
        const strategies = Array.from(strategySet);
        const strategyFilter = document.getElementById('historyStrategyFilter');
        if (strategyFilter) {
            const currentValue = strategyFilter.value;
            strategyFilter.innerHTML = '<option value="">All Strategies</option>' + 
                strategies.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
            strategyFilter.value = currentValue;
        }

        // Apply filters
        if (historyFilterTicker) {
            grades = grades.filter(g => g.ticker === historyFilterTicker);
        }
        if (historyFilterGrade) {
            grades = grades.filter(g => {
                const total = g.total || (g.grade ? g.grade.total : 0);
                const letter = getGradeLetter(total);
                return letter === historyFilterGrade;
            });
        }
        if (historyFilterStatus) {
            if (historyFilterStatus === 'finalized') {
                grades = grades.filter(g => g.finalized === true);
            } else if (historyFilterStatus === 'non-finalized') {
                grades = grades.filter(g => !g.finalized);
            }
        }
        if (historyFilterStrategy) {
            grades = grades.filter(g => g.outcome && g.outcome.strategy === historyFilterStrategy);
        }

        if (grades.length === 0) {
            const hasFilters = historyFilterTicker || historyFilterGrade || historyFilterStatus || historyFilterStrategy;
            container.innerHTML = `
                <div class="card empty-state" style="background: linear-gradient(135deg, rgba(40, 40, 40, 0.9) 0%, rgba(20, 20, 20, 0.95) 100%); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);">
                    <div class="empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                            <polyline points="17 6 23 6 23 12"/>
                        </svg>
                    </div>
                    <div class="empty-text">${hasFilters ? 'No trades match your filters' : 'No trades saved yet'}</div>
                    <div class="empty-subtext">${hasFilters ? 'Try adjusting your search criteria' : 'Start grading stocks to build your history'}</div>
                </div>
            `;
            return;
        }

        container.innerHTML = grades.map((grade, index) => {
            // Handle both old format (scores at top level) and new format (grade.scores)
            const scores = grade.scores || (grade.grade ? grade.grade.scores : {});
            const total = grade.total || (grade.grade ? grade.grade.total : 0);
            const hasPlan = grade.plan && grade.plan.entry;
            const isFinalized = grade.finalized === true;
            const gradeLetter = getGradeLetter(total);
            const gradeColor = gradeLetter === 'A' ? '#00ff00' : gradeLetter === 'B' ? '#00cc00' : gradeLetter === 'C' ? '#ffcc00' : '#ff4444';
            
            // Finalized status badge
            let statusBadge = '';
            let outcomeDisplay = '';
            if (isFinalized && grade.outcome) {
                const isWin = grade.outcome.result === 'target';
                const pnl = grade.outcome.pnlPercent;
                const pnlColor = isWin ? '#00ff00' : '#ff4444';
                const pnlIcon = isWin ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle;"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
                statusBadge = `<span style="color: ${pnlColor}; font-size: 16px; margin-left: 4px;">${pnlIcon}</span>`;
                outcomeDisplay = `<span style="color: ${pnlColor}; font-weight: 600; font-size: 12px;">${isWin ? '+' : ''}${pnl.toFixed(1)}%</span>`;
            } else if (hasPlan && !isFinalized) {
                statusBadge = '<span style="color: #888; font-size: 16px; margin-left: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>';
            }
            
            return `
            <div class="history-item" data-index="${index}" style="background: linear-gradient(135deg, rgba(40, 40, 40, 0.9) 0%, rgba(20, 20, 20, 0.95) 100%); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.1); cursor: pointer;" onclick="showTradeDetailsModal(${index})">
                <div class="history-left">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="history-ticker">${escapeHtml(grade.ticker)}</div>
                        <span style="background: ${gradeColor}22; color: ${gradeColor}; padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 700;">${gradeLetter}</span>
                        ${statusBadge}
                        ${outcomeDisplay}
                    </div>
                    ${hasPlan ? `
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 8px; font-size: 10px;">
                        <div style="text-align: center; padding: 4px; background: rgba(255, 204, 0, 0.15); border-radius: 4px;">
                            <div style="color: #ffcc00;">ENTRY</div>
                            <div style="color: white; font-weight: 600;">$${grade.plan.entry.toFixed(2)}</div>
                        </div>
                        <div style="text-align: center; padding: 4px; background: rgba(255, 68, 68, 0.15); border-radius: 4px; ${isFinalized && grade.outcome && grade.outcome.result === 'stop' ? 'border: 2px solid #ff4444;' : ''}">
                            <div style="color: #ff4444;">STOP</div>
                            <div style="color: white; font-weight: 600;">$${grade.plan.stopLoss.toFixed(2)}</div>
                        </div>
                        <div style="text-align: center; padding: 4px; background: rgba(0, 255, 0, 0.15); border-radius: 4px; ${isFinalized && grade.outcome && grade.outcome.result === 'target' ? 'border: 2px solid #00ff00;' : ''}">
                            <div style="color: #00ff00;">TARGET</div>
                            <div style="color: white; font-weight: 600;">$${grade.plan.target.toFixed(2)}</div>
                        </div>
                    </div>
                    <div style="margin-top: 6px; text-align: center; font-size: 11px; color: #888;">
                        R:R <span style="color: white; font-weight: 600;">${grade.plan.riskReward}:1</span>
                        ${grade.plan.thoughts ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6495ed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 8px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' : ''}
                    </div>
                    ${isFinalized && grade.outcome ? `
                        <div style="margin-top: 4px; text-align: center; font-size: 10px;">
                            ${grade.outcome.strategy ? `<span style="color: #6495ed;">Strategy: ${escapeHtml(grade.outcome.strategy)}</span>` : ''}
                            ${grade.outcome.positionSize ? `<span style="color: #888; margin-left: 8px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 2px;"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg><span role="img" aria-label="Position size">${grade.outcome.positionSize} ${grade.outcome.positionUnit ?? 'shares'}</span></span>` : ''}
                        </div>
                    ` : ''}
                    ` : `
                    <div class="history-grades-grid" style="margin-top: 8px;">
                        <div class="history-grade-item">
                            <span class="history-grade-letter">P</span>
                            <span class="history-grade-value">${scores.pattern || 0}</span>
                        </div>
                        <div class="history-grade-item">
                            <span class="history-grade-letter">R</span>
                            <span class="history-grade-value">${scores.risk || 0}</span>
                        </div>
                        <div class="history-grade-item">
                            <span class="history-grade-letter">E</span>
                            <span class="history-grade-value">${scores.entry || 0}</span>
                        </div>
                        <div class="history-grade-item">
                            <span class="history-grade-letter">P</span>
                            <span class="history-grade-value">${scores.performance || 0}</span>
                        </div>
                    </div>
                    `}
                </div>
                <div class="history-center">
                    <div class="history-score-value">${total}</div>
                </div>
                <div class="history-right">
                    ${grade.screenshot && grade.screenshot.startsWith('data:image/') ? `
                        <img src="${encodeURI(grade.screenshot)}" class="history-screenshot" onclick="event.stopPropagation(); showImageViewer('${encodeURI(grade.screenshot).replace(/'/g, "\\'")}');" alt="Trade screenshot for ${escapeHtml(grade.ticker)}">
                    ` : `
                        <div class="history-no-screenshot">No screenshot</div>
                    `}
                </div>
                <div class="history-footer">
                    <button class="delete-btn history-analyze-btn" style="flex: 1;" data-index="${index}">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><circle cx="7.5" cy="14.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="14.5" r="1.5" fill="currentColor"/></svg>
                        Analyze
                    </button>
                    <button class="delete-btn history-delete-btn" style="flex: 1;" data-index="${index}">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        Delete
                    </button>
                </div>
            </div>
        `;
        }).join('');
    }

    const historyContainer = document.getElementById('historyContainer');
    if (historyContainer) {
        historyContainer.addEventListener('click', function (event) {
            const analyzeButton = event.target.closest('button.history-analyze-btn');
            const deleteButton = event.target.closest('button.history-delete-btn');

            if (analyzeButton && historyContainer.contains(analyzeButton)) {
                event.stopPropagation();
                const index = parseInt(analyzeButton.getAttribute('data-index'), 10);
                if (!Number.isNaN(index)) {
                    analyzeGradeWithAI(index);
                }
            } else if (deleteButton && historyContainer.contains(deleteButton)) {
                event.stopPropagation();
                const index = parseInt(deleteButton.getAttribute('data-index'), 10);
                if (!Number.isNaN(index)) {
                    deleteGrade(index);
                }
            }
        });
    }
    
    function viewScreenshot(gradeIdOrIndex) {
        const grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
        // Try to find by ID first, then fall back to index for legacy grades
        let grade = grades.find(g => g.id === gradeIdOrIndex);
        if (!grade) {
            const index = parseInt(gradeIdOrIndex, 10);
            if (!isNaN(index) && index >= 0 && index < grades.length) {
                grade = grades[index];
            }
        }
        if (grade && grade.screenshot) {
            showImageViewer(grade.screenshot);
        }
    }

    function showImageViewer(imageData) {
        const modal = document.getElementById('imageViewerModal');
        const img = document.getElementById('fullScreenImage');
        img.src = imageData;
        modal.classList.add('active');
    }

    function hideImageViewer() {
        const modal = document.getElementById('imageViewerModal');
        modal.classList.remove('active');
        document.getElementById('fullScreenImage').src = '';
    }

    // GitHub Token Modal functions
    function showGithubTokenModal() {
        const modal = document.getElementById('githubTokenModal');
        const input = document.getElementById('githubTokenInput');
        // Load existing token if available
        const token = localStorage.getItem('githubToken');
        if (token) {
            input.value = token;
        }
        modal.classList.add('active');
        input.focus();
        // Load OAuth credentials
        updateOAuthUI();
        updateStaticBackendStatus();
    }

    function hideGithubTokenModal() {
        const modal = document.getElementById('githubTokenModal');
        modal.classList.remove('active');
        // Don't clear the input - preserve it in case user reopens
    }

    async function saveGithubToken() {
        const token = document.getElementById('githubTokenInput').value.trim();
        if (token) {
            localStorage.setItem('githubToken', token);
            document.getElementById('githubTokenInput').value = ''; // Clear for security after save
            hideGithubTokenModal();
            
            // Update status displays
            updateGithubTokenStatus(true, 'Token configured');
            updateModelStatus('loading', 'Loading models...', '#ff9800');
            
            showToast('Token saved, fetching available models...', 'success', 'Token Saved');
            
            // Fetch and cache user avatar
            await fetchAndCacheUserAvatar(token);
            
            await fetchAvailableModels(token);
        } else {
            showToast('Please enter a valid token', 'warning', 'Invalid Token');
        }
    }

    // Fetch and cache GitHub user avatar
    async function fetchAndCacheUserAvatar(token) {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                if (userData.avatar_url) {
                    // Cache the avatar URL and username
                    localStorage.setItem('githubAvatarUrl', userData.avatar_url);
                    localStorage.setItem('githubUsername', userData.login || 'User');
                    console.log('GitHub avatar cached:', userData.avatar_url);
                }
            } else {
                console.warn('Could not fetch GitHub user info:', response.status);
            }
        } catch (error) {
            console.error('Error fetching GitHub user avatar:', error);
        }
    }

    // Get cached user avatar URL
    function getUserAvatarUrl() {
        return localStorage.getItem('githubAvatarUrl');
    }

    // Get Copilot SVG for AI avatar
    function getCopilotSvg() {
        return `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>`;
    }

    // API Token Modal functions
    function showApiTokenModal() {
        const modal = document.getElementById('apiTokenModal');
        modal.classList.add('active');
    }

    function hideApiTokenModal() {
        const modal = document.getElementById('apiTokenModal');
        modal.classList.remove('active');
    }

    // Market API Modal functions
    function showMarketApiModal() {
        const modal = document.getElementById('marketApiModal');
        modal.classList.add('active');
        updateStaticBackendStatus();
        updateOAuthUI();
    }

    function hideMarketApiModal() {
        const modal = document.getElementById('marketApiModal');
        modal.classList.remove('active');
    }
    
    // Update Static Backend status display
    function updateStaticBackendStatus() {
        const statusEl = document.getElementById('staticBackendStatus');
        const copilotEl = document.getElementById('copilotModelStatus');
        
        if (statusEl) {
            const hasToken = !!localStorage.getItem('githubToken');
            statusEl.innerHTML = hasToken ? '● Active' : '○ No Token';
            statusEl.style.color = hasToken ? '#4caf50' : '#888';
        }
        
        if (copilotEl) {
            const hasCopilot = !!localStorage.getItem('copilotToken');
            copilotEl.textContent = hasCopilot ? '4 Available' : 'Auth Required';
            copilotEl.style.color = hasCopilot ? '#00bfa5' : '#888';
        }
    }
    
    // Update OAuth UI based on current state
    function updateOAuthUI() {
        const clientIdInput = document.getElementById('oauthClientIdInput');
        const clientSecretInput = document.getElementById('oauthClientSecretInput');
        const clientIdStatus = document.getElementById('oauthClientIdStatus');
        const webFlowBtn = document.getElementById('btnWebFlowAuth');
        const deviceFlowBtn = document.getElementById('btnDeviceFlowAuth');
        const connectedSection = document.getElementById('copilotConnectedSection');
        const deviceSection = document.getElementById('deviceFlowSection');
        
        // Load saved credentials
        const savedClientId = localStorage.getItem('oauth_client_id');
        const savedClientSecret = localStorage.getItem('oauth_client_secret');
        
        if (clientIdInput && savedClientId) {
            clientIdInput.value = savedClientId;
        }
        if (clientSecretInput && savedClientSecret) {
            clientSecretInput.value = savedClientSecret;
        }
        
        // Update status
        if (clientIdStatus) {
            if (savedClientId && savedClientSecret) {
                clientIdStatus.textContent = '✓ OAuth credentials configured';
                clientIdStatus.style.color = '#4caf50';
            } else if (savedClientId) {
                clientIdStatus.textContent = '⚠ Client Secret needed';
                clientIdStatus.style.color = '#ffa000';
            } else {
                clientIdStatus.textContent = 'Enter your OAuth App credentials from GitHub';
                clientIdStatus.style.color = '#666';
            }
        }
        
        // Enable/disable auth buttons based on complete credentials
        const hasCredentials = !!(savedClientId && savedClientSecret);
        if (webFlowBtn) {
            webFlowBtn.disabled = !hasCredentials;
            webFlowBtn.style.opacity = hasCredentials ? '1' : '0.5';
        }
        if (deviceFlowBtn) {
            // Device flow only needs Client ID
            const hasClientId = !!savedClientId;
            deviceFlowBtn.disabled = !hasClientId;
            deviceFlowBtn.style.opacity = hasClientId ? '1' : '0.5';
        }
        
        // Show connected status if Copilot token exists
        const hasCopilotToken = !!localStorage.getItem('copilotToken');
        if (connectedSection) {
            connectedSection.style.display = hasCopilotToken ? 'block' : 'none';
        }
        if (deviceSection && !deviceFlowPolling) {
            deviceSection.style.display = 'none';
        }
    }
    
    // Save OAuth Credentials (Client ID and Secret)
    function saveOAuthCredentials() {
        const clientIdInput = document.getElementById('oauthClientIdInput');
        const clientSecretInput = document.getElementById('oauthClientSecretInput');
        const clientId = clientIdInput.value.trim();
        const clientSecret = clientSecretInput.value.trim();
        
        if (!clientId) {
            showToast('Please enter a Client ID', 'warning', 'Missing Client ID');
            return;
        }
        
        if (!clientSecret) {
            showToast('Please enter a Client Secret', 'warning', 'Missing Client Secret');
            return;
        }
        
        // Validate Client ID format (should start with Ov23li or similar)
        // GitHub OAuth App Client IDs can have various formats
        if (clientId.length < 10) {
            showToast('Client ID seems too short', 'warning', 'Check Format');
            return;
        }
        
        // Validate Client Secret format (40-character hex string)
        const hexRegex = /^[a-f0-9]{40}$/i;
        if (!hexRegex.test(clientSecret)) {
            showToast('Client Secret should be a 40-character hex string', 'warning', 'Invalid Format');
            return;
        }
        
        localStorage.setItem('oauth_client_id', clientId);
        localStorage.setItem('oauth_client_secret', clientSecret);
        StaticBackend.setOAuthClientId(clientId);
        showToast('OAuth credentials saved!', 'success', 'Saved');
        updateOAuthUI();
    }
    
    // Legacy function for backwards compatibility
    function saveOAuthClientId() {
        saveOAuthCredentials();
    }
    
    // Start Web Flow OAuth (using popup mode)
    async function startWebFlowAuth() {
        try {
            const clientId = localStorage.getItem('oauth_client_id');
            if (!clientId) {
                showToast('Please configure OAuth Client ID first', 'warning', 'Missing Client ID');
                return;
            }
            
            showToast('Opening GitHub authorization...', 'info', 'OAuth');
            
            // Use popup mode instead of redirect
            const result = await StaticBackend.initiatePopupAuth();
            
            if (result.success) {
                showToast('GitHub Copilot connected!', 'success', 'Connected');
                updateOAuthUI();
                updateStaticBackendStatus();
                fetchModels();
            }
        } catch (error) {
            console.error('Web Flow auth error:', error);
            showToast(error.message, 'error', 'Auth Error');
        }
    }
    
    // Device Flow state
    let deviceFlowPolling = false;
    let deviceFlowAbort = null;
    
    // Start Device Flow OAuth
    async function startDeviceFlowAuth() {
        try {
            const clientId = localStorage.getItem('oauth_client_id');
            if (!clientId) {
                showToast('Please configure OAuth Client ID first', 'warning', 'Missing Client ID');
                return;
            }
            
            const deviceSection = document.getElementById('deviceFlowSection');
            const codeEl = document.getElementById('deviceFlowCode');
            const uriEl = document.getElementById('deviceFlowUri');
            const statusEl = document.getElementById('deviceFlowStatus');
            
            // Show device flow section
            deviceSection.style.display = 'block';
            statusEl.textContent = 'Requesting device code...';
            
            // Initiate device flow
            const authInfo = await StaticBackend.initiateCopilotAuth();
            
            // Display code
            codeEl.textContent = authInfo.user_code;
            uriEl.href = authInfo.verification_uri_complete || authInfo.verification_uri;
            uriEl.textContent = authInfo.verification_uri;
            statusEl.textContent = 'Enter the code above at the link, then wait...';
            
            // Start polling
            deviceFlowPolling = true;
            
            const result = await StaticBackend.startDeviceFlowPolling(
                authInfo.device_code,
                authInfo.interval,
                (progress) => {
                    statusEl.textContent = `Waiting for authorization... (${progress.attempts}/${progress.maxAttempts})`;
                }
            );
            
            deviceFlowPolling = false;
            
            if (result.success) {
                showToast('GitHub Copilot connected successfully!', 'success', 'Connected');
                deviceSection.style.display = 'none';
                updateOAuthUI();
                updateStaticBackendStatus();
                
                // Refresh models
                fetchModels();
            } else {
                showToast(result.error || 'Authentication failed', 'error', 'Auth Failed');
                statusEl.textContent = result.error || 'Authentication failed. Please try again.';
            }
        } catch (error) {
            deviceFlowPolling = false;
            console.error('Device Flow auth error:', error);
            showToast(error.message, 'error', 'Auth Error');
            
            const statusEl = document.getElementById('deviceFlowStatus');
            if (statusEl) {
                statusEl.textContent = error.message;
            }
        }
    }
    
    // Cancel device flow polling
    function cancelDeviceFlow() {
        deviceFlowPolling = false;
        localStorage.removeItem('device_code_data');
        
        const deviceSection = document.getElementById('deviceFlowSection');
        if (deviceSection) {
            deviceSection.style.display = 'none';
        }
        
        showToast('Device flow cancelled', 'info', 'Cancelled');
    }
    
    // Disconnect Copilot
    function disconnectCopilot() {
        localStorage.removeItem('copilotToken');
        localStorage.removeItem('copilotTokenExpiry');
        StaticBackend.tokens.copilot = null;
        StaticBackend.tokens.copilotExpiry = null;
        
        showToast('Copilot disconnected', 'info', 'Disconnected');
        updateOAuthUI();
        updateStaticBackendStatus();
        
        // Refresh models to show only Azure models
        fetchModels();
    }
    
    // Legacy function - now uses new OAuth system
    async function initiateCopilotAuth() {
        showMarketApiModal();
    }

    // Quick Actions Popup functions
    function toggleQuickActionsPopup(event) {
        event.stopPropagation();
        const popup = document.getElementById('quickActionsPopup');
        popup.classList.toggle('active');
        
        // Close popup when clicking outside
        if (popup.classList.contains('active')) {
            document.addEventListener('click', closeQuickActionsPopupOnOutsideClick);
        }
    }

    function hideQuickActionsPopup() {
        const popup = document.getElementById('quickActionsPopup');
        popup.classList.remove('active');
        document.removeEventListener('click', closeQuickActionsPopupOnOutsideClick);
    }

    function closeQuickActionsPopupOnOutsideClick(event) {
        const popup = document.getElementById('quickActionsPopup');
        const moreBtn = event.target.closest('.more-menu-btn');
        if (!popup.contains(event.target) && !moreBtn) {
            hideQuickActionsPopup();
        }
    }

    // Usage Stats tracking
    let usageStats = {
        messages: 0,
        searches: 0,
        tokensUsed: 0
    };

    function updateUsageStats(type, value) {
        if (type === 'message') {
            usageStats.messages++;
            document.getElementById('statMessages').textContent = usageStats.messages;
        } else if (type === 'search') {
            usageStats.searches++;
            document.getElementById('statSearches').textContent = usageStats.searches;
        } else if (type === 'tokens') {
            usageStats.tokensUsed += value;
            // Format large numbers: show "1.2k" for 1200+ tokens for compact display
            const formatted = usageStats.tokensUsed > 1000 
                ? (usageStats.tokensUsed / 1000).toFixed(1) + 'k' 
                : usageStats.tokensUsed.toString();
            document.getElementById('statTokensUsed').textContent = formatted;
        } else if (type === 'model') {
            // Shorten model name for display (max 8 chars to fit stat card width)
            const shortName = value.split('/').pop().split('-')[0].substring(0, 8);
            document.getElementById('statModel').textContent = shortName || '--';
        }
    }

    // Load non-finalized trades for finalization
    function loadFinalizeView() {
        const grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
        const container = document.getElementById('finalizeContainer');

        // Filter for non-finalized trades that have plans
        const nonFinalizedTrades = grades.filter(g => {
            const hasPlan = g.plan && g.plan.entry;
            const isFinalized = g.finalized === true;
            return hasPlan && !isFinalized;
        });

        if (nonFinalizedTrades.length === 0) {
            container.innerHTML = `
                <div class="card empty-state" style="background: linear-gradient(135deg, rgba(40, 40, 40, 0.9) 0%, rgba(20, 20, 20, 0.95) 100%); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);">
                    <div class="empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5">
                            <polyline points="9 11 12 14 22 4"></polyline>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                        </svg>
                    </div>
                    <div class="empty-text">No trades to finalize</div>
                    <div class="empty-subtext">Create and save trade plans to track their outcomes</div>
                </div>
            `;
            return;
        }

        container.innerHTML = nonFinalizedTrades.map(grade => {
            const scores = grade.scores || (grade.grade ? grade.grade.scores : {});
            const total = grade.total || (grade.grade ? grade.grade.total : 0);
            const gradeLetter = getGradeLetter(total);
            const gradeColor = gradeLetter === 'A' ? '#00ff00' : gradeLetter === 'B' ? '#00cc00' : gradeLetter === 'C' ? '#ffcc00' : '#ff4444';
            const originalIndex = grades.indexOf(grade);
            
            return `
            <div class="history-item" style="background: linear-gradient(135deg, rgba(40, 40, 40, 0.9) 0%, rgba(20, 20, 20, 0.95) 100%); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.1); cursor: pointer;" onclick="showFinalizeModal(${originalIndex})">
                <div class="history-left">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="history-ticker">${escapeHtml(grade.ticker)}</div>
                        <span style="background: ${gradeColor}22; color: ${gradeColor}; padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 700;">${gradeLetter}</span>
                        <span style="color: #ffcc00; font-size: 11px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 2px;">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span role="img" aria-label="Pending">Pending</span>
                        </span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 8px; font-size: 10px;">
                        <div style="text-align: center; padding: 4px; background: rgba(255, 204, 0, 0.15); border-radius: 4px;">
                            <div style="color: #ffcc00;">ENTRY</div>
                            <div style="color: white; font-weight: 600;">$${grade.plan.entry.toFixed(2)}</div>
                        </div>
                        <div style="text-align: center; padding: 4px; background: rgba(255, 68, 68, 0.15); border-radius: 4px;">
                            <div style="color: #ff4444;">STOP</div>
                            <div style="color: white; font-weight: 600;">$${grade.plan.stopLoss.toFixed(2)}</div>
                        </div>
                        <div style="text-align: center; padding: 4px; background: rgba(0, 255, 0, 0.15); border-radius: 4px;">
                            <div style="color: #00ff00;">TARGET</div>
                            <div style="color: white; font-weight: 600;">$${grade.plan.target.toFixed(2)}</div>
                        </div>
                    </div>
                    <div style="margin-top: 6px; text-align: center; font-size: 11px; color: #888;">
                        R:R <span style="color: white; font-weight: 600;">${grade.plan.riskReward}:1</span>
                    </div>
                </div>
                <div class="history-center">
                    <div class="history-score-value">${total}</div>
                </div>
                <div class="history-right">
                    ${grade.screenshot && grade.screenshot.startsWith('data:image/') ? `
                        <img src="${encodeURI(grade.screenshot)}" class="history-screenshot" onclick="event.stopPropagation(); showImageViewer('${encodeURI(grade.screenshot).replace(/'/g, "\\'")}');" alt="Trade screenshot for ${escapeHtml(grade.ticker)}">
                    ` : `
                        <div class="history-no-screenshot">No screenshot</div>
                    `}
                </div>
            </div>
        `;
        }).join('');
    }

    // Show finalize modal with reject/accept options
    function showFinalizeModal(index) {
        const grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
        const grade = grades[index];
        
        if (!grade) return;
        
        currentFinalizeTradeIndex = index;
        const modal = document.getElementById('finalizeTradeModal');
        document.getElementById('finalizeModalTicker').textContent = grade.ticker;
        
        // Show initial choice: Reject or Accept
        document.getElementById('finalizeModalContent').innerHTML = `
            <div style="text-align: center; padding: 16px 0;">
                <p style="margin-bottom: 16px; line-height: 1.5;">Did you execute this trade?</p>
                <div style="background: rgba(40, 40, 40, 0.5); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-size: 11px; color: #888; margin-bottom: 4px;">TRADE PLAN</div>
                    <div style="display: flex; justify-content: space-around; font-size: 12px;">
                        <div><span style="color: #ffcc00;">Entry:</span> $${grade.plan.entry.toFixed(2)}</div>
                        <div><span style="color: #ff4444;">Stop:</span> $${grade.plan.stopLoss.toFixed(2)}</div>
                        <div><span style="color: #00ff00;">Target:</span> $${grade.plan.target.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('finalizeModalButtons').innerHTML = `
            <button class="modal-btn" onclick="rejectTrade()" style="flex: 1; background: rgba(255, 68, 68, 0.2); color: #ff4444; border: 1px solid rgba(255, 68, 68, 0.3);">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                Rejected (Not Taken)
            </button>
            <button class="modal-btn modal-btn-confirm" onclick="showAcceptForm()" style="flex: 1;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Accepted (Executed)
            </button>
        `;
        
        modal.classList.add('active');
    }

    function hideFinalizeModal() {
        document.getElementById('finalizeTradeModal').classList.remove('active');
        currentFinalizeTradeIndex = null;
    }

    // Reject trade - delete it from the journal
    function rejectTrade() {
        if (currentFinalizeTradeIndex === null) return;
        
        if (!confirm('Are you sure you want to reject this trade? It will be deleted from your journal.')) {
            return;
        }
        
        let grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
        const grade = grades[currentFinalizeTradeIndex];
        
        grades.splice(currentFinalizeTradeIndex, 1);
        localStorage.setItem('prepareGrades', JSON.stringify(grades));
        
        showToast(`Trade plan deleted`, 'info', `${grade.ticker} Rejected`, 4000, 'history');
        hideFinalizeModal();
        loadFinalizeView();
    }

    // Show form to accept trade and enter details
    function showAcceptForm() {
        const grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
        const grade = grades[currentFinalizeTradeIndex];
        
        if (!grade) return;
        
        document.getElementById('finalizeModalContent').innerHTML = `
            <div style="margin-bottom: 12px;">
                <label class="label-text">Which target was satisfied?</label>
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                    <button id="stopLossBtn" class="modal-btn" onclick="selectOutcome('stop')" aria-label="Select Stop Loss" style="flex: 1; background: rgba(255, 68, 68, 0.2); color: #ff4444; border: 1px solid rgba(255, 68, 68, 0.3);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        Stop Loss<br>
                        <span style="font-size: 10px;">$${grade.plan.stopLoss.toFixed(2)} (-${grade.plan.stopPercent}%)</span>
                    </button>
                    <button id="targetBtn" class="modal-btn modal-btn-confirm" onclick="selectOutcome('target')" aria-label="Select Profit Target" style="flex: 1;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 8v8m-4-4h8"></path>
                        </svg>
                        Profit Target<br>
                        <span style="font-size: 10px;">$${grade.plan.target.toFixed(2)} (+${grade.plan.targetPercent}%)</span>
                    </button>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                <div>
                    <label class="label-text">Position Size</label>
                    <input type="number" id="positionSizeInput" class="ticker-input" placeholder="e.g., 100" min="1" style="text-transform: none; font-size: 12px; padding: 8px;">
                </div>
                <div>
                    <label class="label-text">Unit</label>
                    <select id="positionUnitSelect" class="ticker-input" style="text-transform: none; font-size: 12px; padding: 8px; cursor: pointer;">
                        <option value="shares">Shares</option>
                        <option value="contracts">Contracts</option>
                        <option value="lots">Lots</option>
                    </select>
                </div>
            </div>
            <div style="margin-bottom: 12px;">
                <label class="label-text">Strategy Used</label>
                <textarea id="strategyInput" class="ticker-input" placeholder="e.g., 52w High Breakout, Support Bounce, etc." style="text-transform: none; font-size: 12px; min-height: 60px; resize: vertical;"></textarea>
            </div>
            <input type="hidden" id="selectedOutcome" value="">
        `;
        
        document.getElementById('finalizeModalButtons').innerHTML = `
            <button class="modal-btn modal-btn-cancel" onclick="showFinalizeModal(${currentFinalizeTradeIndex})">
                Back
            </button>
            <button class="modal-btn modal-btn-confirm" onclick="acceptTrade()">
                Finalize Trade
            </button>
        `;
    }

    function selectOutcome(outcome) {
        document.getElementById('selectedOutcome').value = outcome;
        
        // Visual feedback
        const stopBtn = document.getElementById('stopLossBtn');
        const targetBtn = document.getElementById('targetBtn');
        
        if (outcome === 'stop') {
            stopBtn.style.border = '2px solid #ff4444';
            stopBtn.style.background = 'rgba(255, 68, 68, 0.3)';
            targetBtn.style.border = '1px solid rgba(0, 255, 0, 0.3)';
            targetBtn.style.background = 'rgba(0, 255, 0, 0.2)';
        } else {
            targetBtn.style.border = '2px solid #00ff00';
            targetBtn.style.background = 'rgba(0, 255, 0, 0.3)';
            stopBtn.style.border = '1px solid rgba(255, 68, 68, 0.3)';
            stopBtn.style.background = 'rgba(255, 68, 68, 0.2)';
        }
    }

    // Accept trade and finalize with outcome
    function acceptTrade() {
        if (currentFinalizeTradeIndex === null) return;
        
        const outcome = document.getElementById('selectedOutcome').value;
        const strategy = document.getElementById('strategyInput').value.trim();
        const positionSize = document.getElementById('positionSizeInput').value.trim();
        const positionUnit = document.getElementById('positionUnitSelect').value;
        
        if (!outcome) {
            showToast('Please select which target was satisfied', 'warning', 'Missing Information');
            return;
        }
        
        if (!strategy) {
            showToast('Please enter the strategy you used', 'warning', 'Missing Strategy');
            return;
        }
        
        const parsedPositionSize = parseFloat(positionSize);
        if (!positionSize || isNaN(parsedPositionSize) || parsedPositionSize <= 0) {
            showToast('Please enter a valid position size', 'warning', 'Missing Position Size');
            return;
        }
        
        let grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
        const grade = grades[currentFinalizeTradeIndex];
        
        // Calculate P&L
        const entryPrice = grade.plan.entry;
        const exitPrice = outcome === 'stop' ? grade.plan.stopLoss : grade.plan.target;
        const pnlPercent = outcome === 'stop' ? -grade.plan.stopPercent : grade.plan.targetPercent;
        
        // Update grade with finalization data
        grade.finalized = true;
        grade.finalizedAt = new Date().toISOString();
        grade.outcome = {
            result: outcome,
            exitPrice: exitPrice,
            pnlPercent: pnlPercent,
            strategy: strategy,
            positionSize: parsedPositionSize,
            positionUnit: positionUnit
        };
        
        grades[currentFinalizeTradeIndex] = grade;
        localStorage.setItem('prepareGrades', JSON.stringify(grades));
        
        const outcomeText = outcome === 'stop' ? `Loss: -${grade.plan.stopPercent}%` : `Win: +${grade.plan.targetPercent}%`;
        showToast(`Exit: $${exitPrice.toFixed(2)} | ${outcomeText}<br>Strategy: ${strategy}<br>Position: ${parsedPositionSize} ${positionUnit}`, 'success', `${grade.ticker} Trade Finalized`, 5000, 'history');
        
        hideFinalizeModal();
        loadFinalizeView();
        if (typeof loadHistory === 'function') {
            loadHistory();
        }
    }


    function analyzeGradeWithAI(index) {
        const grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
        const grade = grades[index];
        if (grade) {
            // Handle both old format (scores at top level) and new format (grade.scores)
            const scores = grade.scores || (grade.grade ? grade.grade.scores : {});
            const total = grade.total || (grade.grade ? grade.grade.total : 0);
            const hasPlan = grade.plan && grade.plan.entry;
            
            // Set the prompt value directly since DOM is already loaded
            const aiPrompt = document.getElementById('aiPrompt');
            if (aiPrompt) {
                let prompt = `Analyze this trade grade for ${grade.ticker}:\nTotal Score: ${total}/100\nPattern: ${scores.pattern || 0}/20\nRisk/Reward: ${scores.risk || 0}/20\nEntry/Exit: ${scores.entry || 0}/10\nPast Performance: ${scores.performance || 0}/10\nTiming: ${scores.time || 0}/20\nCatalyst: ${scores.catalyst || 0}/10\nEnvironment: ${scores.environment || 0}/10`;
                
                if (hasPlan) {
                    prompt += `\n\nTrade Plan:\nEntry: $${grade.plan.entry.toFixed(2)}\nStop Loss: $${grade.plan.stopLoss.toFixed(2)} (${grade.plan.stopPercent}%)\nTarget: $${grade.plan.target.toFixed(2)} (${grade.plan.targetPercent}%)\nRisk/Reward Ratio: ${grade.plan.riskReward}:1`;
                }
                
                prompt += '\n\nProvide insights and suggestions for improvement.';
                aiPrompt.value = prompt;
            }
            switchView('ai');
        }
    }

    function deleteGrade(index) {
        if (!confirm('Delete this grade?')) return;
        
        let grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
        grades.splice(index, 1);
        localStorage.setItem('prepareGrades', JSON.stringify(grades));
        loadHistory();
    }

    // Ticker Modal functions
    function showTickerModal() {
        document.getElementById('tickerModal').classList.add('active');
        document.getElementById('tickerModalInput').value = '';
        document.getElementById('tickerModalInput').focus();
    }

    function hideTickerModal() {
        document.getElementById('tickerModal').classList.remove('active');
    }

    function confirmTickerAnalysis() {
        const ticker = document.getElementById('tickerModalInput').value.trim().toUpperCase();
        if (ticker) {
            document.getElementById('aiPrompt').value = `Analyze ${ticker} for trading:\n- Technical setup quality\n- Key support/resistance levels\n- Recent price action\n- Volume analysis\n- Risk/reward for entry today\n\nProvide a PREPARE score estimate.`;
            hideTickerModal();
            // Auto-trigger the send
            askAI();
        }
    }

    // Trade Details Modal functions
    function showTradeDetailsModal(index) {
        const grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
        const grade = grades[index];
        
        if (!grade) return;
        
        const scores = grade.scores || (grade.grade ? grade.grade.scores : {});
        const total = grade.total || (grade.grade ? grade.grade.total : 0);
        const hasPlan = grade.plan && grade.plan.entry;
        const isFinalized = grade.finalized === true;
        const gradeLetter = getGradeLetter(total);
        const gradeColor = gradeLetter === 'A' ? '#00ff00' : gradeLetter === 'B' ? '#00cc00' : gradeLetter === 'C' ? '#ffcc00' : '#ff4444';
        
        // Build the modal content
        let content = `
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 12px;">
                    <span style="font-size: 24px; font-weight: 700; color: white;">${escapeHtml(grade.ticker)}</span>
                    <span style="background: ${gradeColor}22; color: ${gradeColor}; padding: 4px 12px; border-radius: 8px; font-size: 14px; font-weight: 700;">${gradeLetter} - ${total}/100</span>
                </div>
                <div style="font-size: 10px; color: #888; text-align: center;">
                    ${new Date(grade.timestamp).toLocaleString()}
                </div>
            </div>
        `;
        
        // Add finalized status if applicable
        if (isFinalized && grade.outcome) {
            const isWin = grade.outcome.result === 'target';
            const pnl = grade.outcome.pnlPercent;
            const pnlColor = isWin ? '#00ff00' : '#ff4444';
            const statusText = isWin ? 'WIN' : 'LOSS';
            
            content += `
                <div style="background: ${isWin ? 'rgba(0, 255, 0, 0.15)' : 'rgba(255, 68, 68, 0.15)'}; padding: 12px; border-radius: 8px; margin-bottom: 16px; border: 1px solid ${pnlColor};">
                    <div style="text-align: center;">
                        <div style="font-size: 14px; color: ${pnlColor}; font-weight: 700; margin-bottom: 4px;">${statusText}: ${isWin ? '+' : ''}${pnl.toFixed(1)}%</div>
                        <div style="font-size: 11px; color: #888;">Exit Price: $${grade.outcome.exitPrice.toFixed(2)}</div>
                        <div style="font-size: 11px; color: #888;">Finalized: ${new Date(grade.finalizedAt).toLocaleString()}</div>
                    </div>
                </div>
            `;
        } else if (hasPlan && !isFinalized) {
            content += `
                <div style="background: rgba(255, 204, 0, 0.15); padding: 12px; border-radius: 8px; margin-bottom: 16px; border: 1px solid rgba(255, 204, 0, 0.3);">
                    <div style="text-align: center;">
                        <div style="font-size: 14px; color: #ffcc00; font-weight: 700;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span role="img" aria-label="Pending">PENDING FINALIZATION</span>
                        </div>
                        <div style="font-size: 11px; color: #888; margin-top: 4px;">Visit "Finalize Trades" to record the outcome</div>
                    </div>
                </div>
            `;
        }
        
        // Add PREPARE scores
        content += `
            <div style="background: rgba(40, 40, 40, 0.5); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                <div style="font-weight: 600; margin-bottom: 8px; color: #cc0000;">PREPARE Scores</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
                    <div><span style="color: #cc0000; font-weight: 600;">P</span> Pattern: <span style="color: white;">${scores.pattern || 0}/20</span></div>
                    <div><span style="color: #cc0000; font-weight: 600;">R</span> Risk: <span style="color: white;">${scores.risk || 0}/20</span></div>
                    <div><span style="color: #cc0000; font-weight: 600;">E</span> Entry: <span style="color: white;">${scores.entry || 0}/10</span></div>
                    <div><span style="color: #cc0000; font-weight: 600;">P</span> Performance: <span style="color: white;">${scores.performance || 0}/10</span></div>
                    <div><span style="color: #cc0000; font-weight: 600;">A</span> Timing: <span style="color: white;">${scores.time || 0}/20</span></div>
                    <div><span style="color: #cc0000; font-weight: 600;">R</span> Catalyst: <span style="color: white;">${scores.catalyst || 0}/10</span></div>
                    <div style="grid-column: 1 / -1;"><span style="color: #cc0000; font-weight: 600;">E</span> Environment: <span style="color: white;">${scores.environment || 0}/10</span></div>
                </div>
            </div>
        `;
        
        // Add trade plan if available
        if (hasPlan) {
            content += `
                <div style="background: rgba(40, 40, 40, 0.5); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: #cc0000;">Trade Plan</div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
                        <div style="text-align: center; padding: 8px; background: rgba(255, 204, 0, 0.15); border-radius: 6px;">
                            <div style="color: #ffcc00; font-size: 10px;">ENTRY</div>
                            <div style="color: white; font-weight: 600; font-size: 14px;">$${grade.plan.entry.toFixed(2)}</div>
                        </div>
                        <div style="text-align: center; padding: 8px; background: rgba(255, 68, 68, 0.15); border-radius: 6px; ${isFinalized && grade.outcome && grade.outcome.result === 'stop' ? 'border: 2px solid #ff4444;' : ''}">
                            <div style="color: #ff4444; font-size: 10px;">STOP</div>
                            <div style="color: white; font-weight: 600; font-size: 14px;">$${grade.plan.stopLoss.toFixed(2)}</div>
                            <div style="color: #ff4444; font-size: 9px;">${grade.plan.stopPercent}%</div>
                        </div>
                        <div style="text-align: center; padding: 8px; background: rgba(0, 255, 0, 0.15); border-radius: 6px; ${isFinalized && grade.outcome && grade.outcome.result === 'target' ? 'border: 2px solid #00ff00;' : ''}">
                            <div style="color: #00ff00; font-size: 10px;">TARGET</div>
                            <div style="color: white; font-weight: 600; font-size: 14px;">$${grade.plan.target.toFixed(2)}</div>
                            <div style="color: #00ff00; font-size: 9px;">${grade.plan.targetPercent}%</div>
                        </div>
                    </div>
                    <div style="text-align: center; padding: 8px; background: rgba(100, 149, 237, 0.15); border-radius: 6px;">
                        <span style="color: #6495ed; font-size: 10px;">RISK/REWARD RATIO: </span>
                        <span style="color: white; font-weight: 600; font-size: 14px;">${grade.plan.riskReward}:1</span>
                    </div>
                </div>
            `;
            
            // Add strategy and position size if finalized
            if (isFinalized && grade.outcome) {
                if (grade.outcome.strategy || grade.outcome.positionSize) {
                    content += `
                        <div style="background: rgba(100, 149, 237, 0.15); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                            ${grade.outcome.strategy ? `
                                <div style="margin-bottom: ${grade.outcome.positionSize ? '8px' : '0'};">
                                    <div style="font-weight: 600; margin-bottom: 4px; color: #6495ed; font-size: 11px;">STRATEGY USED</div>
                                    <div style="font-size: 12px; line-height: 1.5; color: #e0e0e0;">${escapeHtml(grade.outcome.strategy)}</div>
                                </div>
                            ` : ''}
                            ${grade.outcome.positionSize ? `
                                <div>
                                    <div style="font-weight: 600; margin-bottom: 4px; color: #6495ed; font-size: 11px;">POSITION SIZE</div>
                                    <div style="font-size: 12px; line-height: 1.5; color: #e0e0e0;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;">
                                            <rect x="3" y="3" width="7" height="7"></rect>
                                            <rect x="14" y="3" width="7" height="7"></rect>
                                            <rect x="14" y="14" width="7" height="7"></rect>
                                            <rect x="3" y="14" width="7" height="7"></rect>
                                        </svg>
                                        <span role="img" aria-label="Position size">${grade.outcome.positionSize} ${grade.outcome.positionUnit ?? 'shares'}</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }
            }
            
            // Add trade thoughts if available
            if (grade.plan.thoughts) {
                content += `
                    <div style="background: rgba(100, 149, 237, 0.15); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                        <div style="font-weight: 600; margin-bottom: 8px; color: #6495ed; display: flex; align-items: center; gap: 6px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6495ed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <span>Trade Thoughts</span>
                        </div>
                        <div style="font-size: 11px; line-height: 1.5; color: #e0e0e0; white-space: pre-wrap;">${escapeHtml(grade.plan.thoughts)}</div>
                    </div>
                `;
            }
        }
        
        // Add screenshot if available
        if (grade.screenshot && grade.screenshot.startsWith('data:image/')) {
            content += `
                <div style="background: rgba(40, 40, 40, 0.5); padding: 12px; border-radius: 8px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: #cc0000;">Screenshot</div>
                    <img src="${encodeURI(grade.screenshot)}" style="width: 100%; border-radius: 6px; cursor: pointer;" onclick="showImageViewer('${encodeURI(grade.screenshot).replace(/'/g, "\\'")}');" alt="Trade screenshot for ${escapeHtml(grade.ticker)}">
                </div>
            `;
        }
        
        document.getElementById('tradeDetailsTitle').textContent = `${grade.ticker} - Trade Details`;
        document.getElementById('tradeDetailsContent').innerHTML = content;
        document.getElementById('tradeDetailsModal').classList.add('active');
    }

    function hideTradeDetailsModal() {
        document.getElementById('tradeDetailsModal').classList.remove('active');
    }

    // AI Assistant functions
    // Legacy function - kept for compatibility but now uses modal
    async function saveToken() {
        // This function is no longer directly called from UI
        // Token saving is handled by saveGithubToken in the modal
    }

    // Update model status display - now updates stats card
    function updateModelStatus(status, message, iconColor) {
        // The model status is now shown in the stats card
        // Keep function for backwards compatibility but update the active model display
        const statModel = document.getElementById('statModel');
        if (statModel) {
            if (status === 'ready') {
                // Will be updated when a model is selected/used
            } else if (status === 'loading') {
                statModel.textContent = '...';
            } else if (status === 'error') {
                statModel.textContent = '!';
            } else {
                statModel.textContent = '--';
            }
        }
    }

    // Update GitHub token status display
    function updateGithubTokenStatus(hasToken, message) {
        const statusText = document.getElementById('githubTokenStatusText');
        
        if (statusText) {
            statusText.textContent = message || (hasToken ? 'Token configured' : 'Click to configure');
            statusText.style.color = hasToken ? '#00bfa5' : '#666';
        }
    }

    function loadToken() {
        const token = localStorage.getItem('githubToken');
        if (token) {
            // Update token status
            updateGithubTokenStatus(true, 'Token configured');
            // Fetch avatar if not already cached
            if (!localStorage.getItem('githubAvatarUrl')) {
                fetchAndCacheUserAvatar(token);
            }
            // Fetch models on load if token exists
            fetchAvailableModels(token);
        } else {
            // No token available, clear model picker
            updateGithubTokenStatus(false);
            updateModelStatus('none', 'Configure token first', '#666');
            clearModelPicker();
        }
    }

    // =============================================
    // STATIC BACKEND SERVER
    // A client-side "server" that enables GitHub Copilot model access
    // Uses GitHub's API endpoints with proper authentication
    // =============================================
    
    const StaticBackend = {
        // =============================================
        // STATIC BACKEND SERVER - OAuth Configuration
        // =============================================
        // GitHub OAuth App ID: 2631011
        // Homepage: https://statikfintechllc.github.io/SFTi.Trade_Grade/
        // Callback: https://statikfintechllc.github.io/SFTi.Trade_Grade/auth/callback
        
        // OAuth Configuration
        OAUTH_CONFIG: {
            // GitHub OAuth App ID (hardcoded)
            APP_ID: '2631011',
            // Client ID - provided by user from their GitHub OAuth App settings
            CLIENT_ID: localStorage.getItem('oauth_client_id') || '',
            // Client Secret - provided by user (40-char hex string)
            CLIENT_SECRET: localStorage.getItem('oauth_client_secret') || '',
            // IMPORTANT: Callback URL must match EXACTLY what's registered in GitHub OAuth App
            // User registered: https://statikfintechllc.github.io/SFTi.Trade_Grade/auth/callback
            REDIRECT_URI: 'https://statikfintechllc.github.io/SFTi.Trade_Grade/auth/callback',
            SCOPES: ['read:user', 'user:email'],
            AUTH_URL: 'https://github.com/login/oauth/authorize',
            TOKEN_URL: 'https://github.com/login/oauth/access_token',
            DEVICE_CODE_URL: 'https://github.com/login/device/code'
        },
        
        // API Endpoints
        ENDPOINTS: {
            // GitHub Models API (via Azure inference)
            AZURE_INFERENCE: 'https://models.inference.ai.azure.com',
            // GitHub Copilot API (requires Copilot subscription)
            COPILOT_CHAT: 'https://api.githubcopilot.com/chat/completions',
            // GitHub REST API for models catalog
            GITHUB_MODELS: 'https://api.github.com/marketplace_listing/plans'
        },
        
        // All available models - curated list from GitHub Models
        ALL_MODELS: {
            // Azure Inference Models (work with GitHub PAT)
            azure: [
                { name: 'gpt-4o', friendly_name: 'OpenAI GPT-4o', provider: 'OpenAI', endpoint: 'azure' },
                { name: 'gpt-4o-mini', friendly_name: 'OpenAI GPT-4o mini', provider: 'OpenAI', endpoint: 'azure' },
                { name: 'Mistral-Nemo', friendly_name: 'Mistral Nemo', provider: 'Mistral AI', endpoint: 'azure' }
            ],
            // GitHub Copilot Models (require Copilot subscription + OAuth)
            copilot: [
                { name: 'gpt-4', friendly_name: 'OpenAI GPT-4 (Copilot)', provider: 'OpenAI', endpoint: 'copilot' },
                { name: 'gpt-4o', friendly_name: 'OpenAI GPT-4o (Copilot)', provider: 'OpenAI', endpoint: 'copilot' },
                { name: 'claude-3.5-sonnet', friendly_name: 'Claude 3.5 Sonnet', provider: 'Anthropic', endpoint: 'copilot' },
                { name: 'gemini-1.5-pro', friendly_name: 'Gemini 1.5 Pro', provider: 'Google', endpoint: 'copilot' }
            ]
        },
        
        // Token storage
        tokens: {
            github: null,      // GitHub PAT (Personal Access Token)
            copilot: null,     // Copilot OAuth token
            copilotExpiry: null
        },
        
        // Initialize the static backend
        async init() {
            console.log('[StaticBackend] Initializing...');
            
            // Load saved tokens
            this.tokens.github = localStorage.getItem('githubToken');
            this.tokens.copilot = localStorage.getItem('copilotToken');
            this.tokens.copilotExpiry = localStorage.getItem('copilotTokenExpiry');
            
            // Check if Copilot token is expired
            if (this.tokens.copilotExpiry && Date.now() > parseInt(this.tokens.copilotExpiry)) {
                console.log('[StaticBackend] Copilot token expired, clearing...');
                this.tokens.copilot = null;
                localStorage.removeItem('copilotToken');
                localStorage.removeItem('copilotTokenExpiry');
            }
            
            // Set up message channel for cross-tab communication
            if ('BroadcastChannel' in window) {
                this.channel = new BroadcastChannel('sfti-backend');
                this.channel.onmessage = (event) => this.handleMessage(event.data);
            }
            
            console.log('[StaticBackend] Initialized', {
                hasGitHubToken: !!this.tokens.github,
                hasCopilotToken: !!this.tokens.copilot
            });
            
            return this;
        },
        
        // Handle cross-tab messages
        handleMessage(data) {
            if (data.type === 'TOKEN_UPDATE') {
                this.tokens[data.tokenType] = data.token;
            }
        },
        
        // Broadcast token updates to other tabs
        broadcastTokenUpdate(tokenType, token) {
            if (this.channel) {
                this.channel.postMessage({ type: 'TOKEN_UPDATE', tokenType, token });
            }
        },
        
        // Get available models based on current authentication
        async getAvailableModels() {
            const models = [];
            
            // Always include Azure models if we have a GitHub token
            if (this.tokens.github) {
                models.push(...this.ALL_MODELS.azure);
            }
            
            // Include Copilot models if we have a Copilot token
            if (this.tokens.copilot) {
                models.push(...this.ALL_MODELS.copilot);
            }
            
            return models;
        },
        
        // Make a chat completion request
        async chatCompletion(model, messages, options = {}) {
            const modelConfig = this.findModel(model);
            
            if (!modelConfig) {
                throw new Error(`Unknown model: ${model}`);
            }
            
            // Route to appropriate endpoint
            if (modelConfig.endpoint === 'copilot' && this.tokens.copilot) {
                return this.copilotCompletion(model, messages, options);
            } else if (modelConfig.endpoint === 'azure' || this.tokens.github) {
                return this.azureCompletion(model, messages, options);
            } else {
                throw new Error('No valid authentication token available');
            }
        },
        
        // Find model configuration
        findModel(modelName) {
            for (const category of Object.values(this.ALL_MODELS)) {
                const found = category.find(m => m.name === modelName);
                if (found) return found;
            }
            return null;
        },
        
        // Azure Inference API completion
        async azureCompletion(model, messages, options = {}) {
            const response = await fetch(`${this.ENDPOINTS.AZURE_INFERENCE}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.tokens.github}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    max_tokens: options.max_tokens || 4096,
                    temperature: options.temperature || 0.7,
                    ...options
                })
            });
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Azure API Error: ${response.status} - ${error}`);
            }
            
            return response.json();
        },
        
        // GitHub Copilot API completion (requires OAuth token)
        async copilotCompletion(model, messages, options = {}) {
            if (!this.tokens.copilot) {
                throw new Error('Copilot authentication required. Please authenticate with GitHub Copilot.');
            }
            
            const response = await fetch(this.ENDPOINTS.COPILOT_CHAT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.tokens.copilot}`,
                    'Editor-Version': 'SFTi-PREP/1.0',
                    'Editor-Plugin-Version': '1.0.0',
                    'Openai-Organization': 'github-copilot',
                    'X-GitHub-Api-Version': '2024-12-01'
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    max_tokens: options.max_tokens || 4096,
                    temperature: options.temperature || 0.7,
                    ...options
                })
            });
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Copilot API Error: ${response.status} - ${error}`);
            }
            
            return response.json();
        },
        
        // Set GitHub PAT token
        setGitHubToken(token) {
            this.tokens.github = token;
            localStorage.setItem('githubToken', token);
            this.broadcastTokenUpdate('github', token);
        },
        
        // Validate GitHub token
        async validateGitHubToken(token) {
            try {
                const response = await fetch('https://api.github.com/user', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github+json'
                    }
                });
                
                if (response.ok) {
                    const user = await response.json();
                    return { valid: true, user };
                }
                return { valid: false, error: 'Invalid token' };
            } catch (error) {
                return { valid: false, error: error.message };
            }
        },
        
        // Set OAuth Client ID (from GitHub App settings)
        setOAuthClientId(clientId) {
            this.OAUTH_CONFIG.CLIENT_ID = clientId;
            localStorage.setItem('oauth_client_id', clientId);
            console.log('[StaticBackend] OAuth Client ID configured');
        },
        
        // Get OAuth Client ID
        getOAuthClientId() {
            return this.OAUTH_CONFIG.CLIENT_ID || localStorage.getItem('oauth_client_id');
        },
        
        // Generate random state for CSRF protection
        generateState() {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
        },
        
        // =============================================
        // OAuth Web Flow (Redirect-based)
        // =============================================
        initiateWebFlowAuth() {
            const clientId = this.getOAuthClientId();
            
            if (!clientId) {
                throw new Error('OAuth Client ID not configured. Please enter your GitHub OAuth App Client ID.');
            }
            
            // Generate and store state for CSRF protection
            const state = this.generateState();
            localStorage.setItem('oauth_state', state);
            
            // Build authorization URL
            const authUrl = new URL(this.OAUTH_CONFIG.AUTH_URL);
            authUrl.searchParams.set('client_id', clientId);
            authUrl.searchParams.set('redirect_uri', this.OAUTH_CONFIG.REDIRECT_URI);
            authUrl.searchParams.set('scope', this.OAUTH_CONFIG.SCOPES.join(' '));
            authUrl.searchParams.set('state', state);
            authUrl.searchParams.set('allow_signup', 'true');
            
            console.log('[StaticBackend] Initiating OAuth Web Flow:', authUrl.toString());
            
            // Redirect to GitHub authorization page
            window.location.href = authUrl.toString();
        },
        
        // Open OAuth in popup window (alternative to redirect)
        initiatePopupAuth() {
            const clientId = this.getOAuthClientId();
            
            if (!clientId) {
                throw new Error('OAuth Client ID not configured. Please enter your GitHub OAuth App Client ID.');
            }
            
            // Generate and store state for CSRF protection
            const state = this.generateState();
            localStorage.setItem('oauth_state', state);
            
            // Build authorization URL
            const authUrl = new URL(this.OAUTH_CONFIG.AUTH_URL);
            authUrl.searchParams.set('client_id', clientId);
            authUrl.searchParams.set('redirect_uri', this.OAUTH_CONFIG.REDIRECT_URI);
            authUrl.searchParams.set('scope', this.OAUTH_CONFIG.SCOPES.join(' '));
            authUrl.searchParams.set('state', state);
            
            // Open popup
            const width = 600;
            const height = 700;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;
            
            const popup = window.open(
                authUrl.toString(),
                'github-oauth',
                `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
            );
            
            if (!popup) {
                throw new Error('Popup blocked. Please allow popups or use redirect flow.');
            }
            
            // Listen for OAuth completion message from callback
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('OAuth timeout. Please try again.'));
                }, 300000); // 5 minute timeout
                
                const messageHandler = (event) => {
                    // Verify origin
                    if (!event.origin.includes('github.io') && !event.origin.includes('localhost')) {
                        return;
                    }
                    
                    if (event.data.type === 'OAUTH_SUCCESS') {
                        clearTimeout(timeout);
                        window.removeEventListener('message', messageHandler);
                        
                        // Store token
                        this.tokens.copilot = event.data.token;
                        localStorage.setItem('copilotToken', event.data.token);
                        this.broadcastTokenUpdate('copilot', event.data.token);
                        
                        resolve({ success: true, token: event.data.token });
                    }
                    
                    if (event.data.type === 'OAUTH_ERROR') {
                        clearTimeout(timeout);
                        window.removeEventListener('message', messageHandler);
                        reject(new Error(event.data.error));
                    }
                };
                
                window.addEventListener('message', messageHandler);
                
                // Check if popup was closed without completing
                const checkClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkClosed);
                        clearTimeout(timeout);
                        window.removeEventListener('message', messageHandler);
                        
                        // Check if token was stored (callback completed)
                        const token = localStorage.getItem('copilotToken');
                        if (token && token !== this.tokens.copilot) {
                            this.tokens.copilot = token;
                            resolve({ success: true, token });
                        } else {
                            reject(new Error('OAuth cancelled or failed.'));
                        }
                    }
                }, 1000);
            });
        },
        
        // =============================================
        // CORS BYPASS WIDGET - Unlocked GitHub Pages
        // =============================================
        // This widget enables CORS-bypassed POST requests from static sites
        // Uses multiple proxy strategies with automatic fallback
        // =============================================
        
        CorsWidget: {
            // Available CORS proxy services (tried in order)
            // These are PUBLIC CORS proxies - for production, consider your own proxy
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
            ],
            
            // Current active proxy index
            activeProxyIndex: 0,
            
            // Make a CORS-bypassed request
            async fetch(url, options = {}) {
                const method = options.method || 'GET';
                const headers = options.headers || {};
                const body = options.body;
                
                // For GET requests, try direct first
                if (method === 'GET') {
                    try {
                        const directResponse = await fetch(url, { ...options, mode: 'cors' });
                        if (directResponse.ok) return directResponse;
                    } catch (e) {
                        console.log('[CorsWidget] Direct GET failed, using proxy');
                    }
                }
                
                // Try proxies in order until one works
                let lastError = null;
                for (let i = 0; i < this.PROXIES.length; i++) {
                    const proxyIndex = (this.activeProxyIndex + i) % this.PROXIES.length;
                    const proxy = this.PROXIES[proxyIndex];
                    
                    try {
                        const proxyUrl = proxy.urlBuilder(url);
                        const proxyHeaders = { ...headers, ...proxy.headers };
                        
                        let response;
                        if (method === 'POST' && proxy.supportsPost) {
                            response = await fetch(proxyUrl, {
                                method: 'POST',
                                headers: proxyHeaders,
                                body: body
                            });
                        } else if (method === 'POST' && !proxy.supportsPost) {
                            // For proxies that don't support POST, we need to encode data in URL
                            // This is a limitation - use a POST-supporting proxy first
                            continue;
                        } else {
                            response = await fetch(proxyUrl, {
                                method: 'GET',
                                headers: proxyHeaders
                            });
                        }
                        
                        if (response.ok) {
                            // Remember this working proxy for next time
                            this.activeProxyIndex = proxyIndex;
                            console.log(`[CorsWidget] Success with ${proxy.name}`);
                            return response;
                        }
                    } catch (error) {
                        lastError = error;
                        console.log(`[CorsWidget] ${proxy.name} failed:`, error.message);
                    }
                }
                
                throw new Error(`All CORS proxies failed. Last error: ${lastError?.message}`);
            },
            
            // POST with JSON body
            async postJson(url, data) {
                const response = await this.fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                return response.json();
            },
            
            // POST with form-urlencoded body (for OAuth)
            async postForm(url, data) {
                const formData = new URLSearchParams();
                for (const [key, value] of Object.entries(data)) {
                    formData.append(key, value);
                }
                
                const response = await this.fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: formData.toString()
                });
                return response.json();
            }
        },
        
        // =============================================
        // GitHub OAuth Device Flow for Copilot
        // This allows authentication without a backend server!
        // Uses CorsWidget for CORS-bypassed requests
        // =============================================
        
        // Helper: Make CORS-proxied POST request to GitHub OAuth
        async corsProxiedOAuthRequest(endpoint, data) {
            console.log('[StaticBackend] OAuth request to:', endpoint);
            
            try {
                // Use CorsWidget for CORS-bypassed POST
                const result = await this.CorsWidget.postForm(endpoint, data);
                console.log('[StaticBackend] OAuth response:', result);
                return result;
            } catch (error) {
                console.error('[StaticBackend] OAuth request failed:', error);
                throw new Error(`OAuth request failed: ${error.message}`);
            }
        },
        
        async initiateCopilotAuth() {
            const clientId = this.getOAuthClientId();
            
            if (!clientId) {
                throw new Error('OAuth Client ID not configured. Please enter your GitHub OAuth App Client ID in the settings.');
            }
            
            try {
                console.log('[StaticBackend] Initiating Device Flow with Client ID:', clientId);
                
                // Step 1: Request device code from GitHub
                const codeData = await this.corsProxiedOAuthRequest(
                    this.OAUTH_CONFIG.DEVICE_CODE_URL,
                    {
                        client_id: clientId,
                        scope: this.OAUTH_CONFIG.SCOPES.join(' ')
                    }
                );
                
                console.log('[StaticBackend] Device code response:', codeData);
                
                if (codeData.error) {
                    throw new Error(codeData.error_description || codeData.error);
                }
                
                if (!codeData.device_code || !codeData.user_code) {
                    throw new Error('Invalid response from GitHub: missing device_code or user_code');
                }
                
                // Store device code data for callback handler
                localStorage.setItem('device_code_data', JSON.stringify({
                    device_code: codeData.device_code,
                    user_code: codeData.user_code,
                    expires_at: Date.now() + (codeData.expires_in * 1000)
                }));
                
                // Return device code info for user to complete auth
                return {
                    device_code: codeData.device_code,
                    user_code: codeData.user_code,
                    verification_uri: codeData.verification_uri || 'https://github.com/login/device',
                    verification_uri_complete: codeData.verification_uri_complete,
                    expires_in: codeData.expires_in,
                    interval: codeData.interval || 5
                };
            } catch (error) {
                console.error('[StaticBackend] OAuth Device Flow initiation failed:', error);
                throw new Error(`Device Flow failed: ${error.message}. Make sure your OAuth App has Device Flow enabled in GitHub Developer Settings.`);
            }
        },
        
        // Poll for OAuth Device Flow completion
        async pollCopilotAuth(deviceCode, interval = 5) {
            const clientId = this.getOAuthClientId();
            
            if (!clientId) {
                return { success: false, error: 'OAuth Client ID not configured' };
            }
            
            const poll = async () => {
                try {
                    // Use CORS-proxied request for token endpoint
                    const data = await this.corsProxiedOAuthRequest(
                        this.OAUTH_CONFIG.TOKEN_URL,
                        {
                            client_id: clientId,
                            device_code: deviceCode,
                            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                        }
                    );
                    
                    console.log('[StaticBackend] Poll response:', data);
                    
                    if (data.access_token) {
                        // Success! Store the token
                        this.tokens.copilot = data.access_token;
                        localStorage.setItem('copilotToken', data.access_token);
                        
                        // Clear device code data
                        localStorage.removeItem('device_code_data');
                        
                        if (data.expires_in) {
                            const expiry = Date.now() + (data.expires_in * 1000);
                            this.tokens.copilotExpiry = expiry;
                            localStorage.setItem('copilotTokenExpiry', expiry.toString());
                        }
                        
                        this.broadcastTokenUpdate('copilot', data.access_token);
                        return { success: true, token: data.access_token };
                    }
                    
                    if (data.error === 'authorization_pending') {
                        // User hasn't completed auth yet, keep polling
                        return { success: false, pending: true };
                    }
                    
                    if (data.error === 'slow_down') {
                        // Need to slow down polling
                        return { success: false, pending: true, slowDown: true, newInterval: interval + 5 };
                    }
                    
                    if (data.error === 'expired_token') {
                        localStorage.removeItem('device_code_data');
                        return { success: false, error: 'Device code expired. Please try again.' };
                    }
                    
                    if (data.error === 'access_denied') {
                        localStorage.removeItem('device_code_data');
                        return { success: false, error: 'Access denied by user.' };
                    }
                    
                    // Other errors
                    return { success: false, error: data.error_description || data.error };
                } catch (error) {
                    console.error('[StaticBackend] Poll error:', error);
                    return { success: false, error: error.message };
                }
            };
            
            return poll();
        },
        
        // Start continuous polling for device flow
        async startDeviceFlowPolling(deviceCode, interval = 5, onUpdate = null) {
            let currentInterval = interval;
            const maxAttempts = 60; // 5 minutes max
            let attempts = 0;
            
            const doPoll = async () => {
                attempts++;
                
                if (attempts > maxAttempts) {
                    return { success: false, error: 'Polling timeout. Please try again.' };
                }
                
                const result = await this.pollCopilotAuth(deviceCode, currentInterval);
                
                if (result.success) {
                    return result;
                }
                
                if (result.error && !result.pending) {
                    return result;
                }
                
                if (result.slowDown) {
                    currentInterval = result.newInterval || currentInterval + 5;
                }
                
                if (onUpdate) {
                    onUpdate({ attempts, maxAttempts, interval: currentInterval });
                }
                
                // Wait and poll again
                await new Promise(resolve => setTimeout(resolve, currentInterval * 1000));
                return doPoll();
            };
            
            return doPoll();
        }
    };
    
    // Initialize Static Backend on page load
    StaticBackend.init();
    
    // Listen for OAuth callback messages
    window.addEventListener('message', (event) => {
        // Verify origin
        if (!event.origin.includes('github.io') && !event.origin.includes('localhost')) {
            return;
        }
        
        if (event.data.type === 'TOKEN_UPDATE') {
            StaticBackend.tokens[event.data.tokenType] = event.data.token;
            console.log('[StaticBackend] Token updated via message:', event.data.tokenType);
            
            // Refresh models if copilot token received
            if (event.data.tokenType === 'copilot') {
                fetchModels();
            }
        }
    });
    
    // =============================================
    // Model Fetching with Static Backend Integration
    // =============================================

    async function fetchAvailableModels(token) {
        updateModelStatus('loading', 'Loading models...', '#ff9800');
        
        // Update Static Backend with the token
        StaticBackend.setGitHubToken(token);
        
        try {
            // Validate the token first
            const validation = await StaticBackend.validateGitHubToken(token);
            
            if (!validation.valid) {
                console.error('Token validation failed:', validation.error);
                showToast('Invalid GitHub token. Please check your token.', 'error', 'Auth Error');
                updateModelStatus('error', 'Invalid token', '#ff4444');
                clearModelPicker();
                return;
            }
            
            console.log('[Models] Token validated for user:', validation.user.login);
            
            // Get available models from Static Backend
            const models = await StaticBackend.getAvailableModels();
            
            if (models.length === 0) {
                showToast('No models available. Please configure your token.', 'warning', 'No Models');
                updateModelStatus('error', 'No models', '#ff4444');
                clearModelPicker();
                return;
            }
            
            // Show success message with model count
            const azureCount = models.filter(m => m.endpoint === 'azure').length;
            const copilotCount = models.filter(m => m.endpoint === 'copilot').length;
            
            let toastMsg = `${azureCount} Azure model${azureCount !== 1 ? 's' : ''}`;
            if (copilotCount > 0) {
                toastMsg += ` + ${copilotCount} Copilot model${copilotCount !== 1 ? 's' : ''}`;
            }
            
            showToast(toastMsg, 'success', `${models.length} Models Loaded`, 5000);
            updateModelStatus('ready', `${models.length} models ready`, '#00bfa5');
            
            localStorage.setItem('availableModels', JSON.stringify(models));
            populateModelPicker(models);
            
        } catch (error) {
            console.error('Error fetching models:', error);
            
            // Fallback to just Azure models
            const fallbackModels = StaticBackend.ALL_MODELS.azure;
            showToast('Loaded basic models. Some features may be limited.', 'warning', '3 Models Loaded', 5000);
            updateModelStatus('ready', '3 models ready', '#00bfa5');
            
            localStorage.setItem('availableModels', JSON.stringify(fallbackModels));
            populateModelPicker(fallbackModels);
        }
    }

    // Helper function to get model ID for API calls
    function getModelId(model) {
        return model.name || model.id;
    }

    // Helper function to get model display name for UI
    function getModelDisplayName(model) {
        return model.friendly_name || model.display_name || model.name || model.id;
    }

    // Get provider icon SVG based on provider name
    function getProviderIconSVG(provider) {
        const icons = {
            'OpenAI': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>',
            'Anthropic': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.304 3.541L12.032 21h-2.98l5.272-17.459h2.98zm-10.608 0L12.032 21h2.98L9.676 3.541H6.696z"/></svg>',
            'Google': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 11v2.4h3.97c-.16 1.03-1.2 3.02-3.97 3.02-2.39 0-4.34-1.98-4.34-4.42s1.95-4.42 4.34-4.42c1.36 0 2.27.58 2.79 1.08l1.9-1.83C15.47 5.69 13.89 5 12 5 8.13 5 5 8.13 5 12s3.13 7 7 7c4.04 0 6.72-2.84 6.72-6.84 0-.46-.05-.81-.11-1.16H12z"/></svg>',
            'Mistral AI': '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="4" height="4"/><rect x="9" y="3" width="4" height="4"/><rect x="15" y="3" width="4" height="4"/><rect x="3" y="9" width="4" height="4"/><rect x="9" y="9" width="4" height="4"/><rect x="15" y="9" width="4" height="4"/><rect x="3" y="15" width="4" height="4"/><rect x="9" y="15" width="4" height="4"/><rect x="15" y="15" width="4" height="4"/></svg>',
            'Meta': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/></svg>',
            'xAI': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932L18.901 1.153zm-1.29 19.476h2.039L6.486 3.255H4.298l13.313 17.374z"/></svg>'
        };
        return icons[provider] || '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>';
    }

    // Get capability icons based on model
    function getModelCapabilities(model) {
        const caps = [];
        // All models have chat
        caps.push({ type: 'chat', title: 'Chat', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>' });
        // GPT models have code capability
        if (model.name.includes('gpt') || model.name.includes('claude') || model.name.includes('codex')) {
            caps.push({ type: 'code', title: 'Code', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>' });
        }
        // GPT-4o and Gemini have vision
        if (model.name.includes('4o') || model.name.includes('gemini')) {
            caps.push({ type: 'vision', title: 'Vision', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>' });
        }
        return caps;
    }

    // Toggle model dropdown
    function toggleModelDropdown(event) {
        event.stopPropagation();
        const trigger = document.getElementById('modelDropdownTrigger');
        const menu = document.getElementById('modelDropdownMenu');
        
        if (trigger.disabled) return;
        
        const isActive = menu.classList.contains('active');
        
        // Close other dropdowns
        document.querySelectorAll('.model-dropdown-menu.active, .chat-history-dropdown.active, .quick-actions-popup.active').forEach(el => {
            el.classList.remove('active');
        });
        document.querySelectorAll('.model-dropdown-trigger.active').forEach(el => {
            el.classList.remove('active');
        });
        
        if (!isActive) {
            trigger.classList.add('active');
            menu.classList.add('active');
        }
        
        // Update fullscreen button visibility
        updateFullscreenBtnVisibility();
    }

    // Select a model from the dropdown
    function selectModel(modelId, modelName) {
        const trigger = document.getElementById('modelDropdownTrigger');
        const menu = document.getElementById('modelDropdownMenu');
        const hiddenSelect = document.getElementById('chatModelSelect');
        
        // Update trigger display
        trigger.querySelector('.model-name').textContent = modelName;
        
        // Update hidden select for form compatibility
        hiddenSelect.value = modelId;
        
        // Update selection state in menu
        menu.querySelectorAll('.model-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.modelId === modelId);
        });
        
        // Close dropdown
        trigger.classList.remove('active');
        menu.classList.remove('active');
        
        // Show fullscreen button again
        updateFullscreenBtnVisibility();
        
        // Save selection
        localStorage.setItem('selectedModel', modelId);
    }

    // Close model dropdown when clicking outside
    document.addEventListener('click', (event) => {
        const wrapper = document.getElementById('modelDropdownWrapper');
        if (wrapper && !wrapper.contains(event.target)) {
            document.getElementById('modelDropdownTrigger')?.classList.remove('active');
            document.getElementById('modelDropdownMenu')?.classList.remove('active');
            // Show fullscreen button when dropdown closes
            updateFullscreenBtnVisibility();
        }
    });

    // Populate model picker dropdown with available models
    function populateModelPicker(models) {
        const trigger = document.getElementById('modelDropdownTrigger');
        const menu = document.getElementById('modelDropdownMenu');
        const hiddenSelect = document.getElementById('chatModelSelect');
        
        if (!trigger || !menu || !hiddenSelect) return;

        // Save currently selected model
        const currentSelection = hiddenSelect.value || localStorage.getItem('selectedModel');
        
        // Clear menu
        menu.innerHTML = '';
        hiddenSelect.innerHTML = '';

        if (!models || models.length === 0) {
            trigger.querySelector('.model-name').textContent = 'No models available';
            trigger.disabled = true;
            return;
        }

        // Enable the dropdown
        trigger.disabled = false;

        // Group models by endpoint
        const azureModels = models.filter(m => m.endpoint === 'azure');
        const copilotModels = models.filter(m => m.endpoint === 'copilot');

        // Azure Models Section
        if (azureModels.length > 0) {
            const azureHeader = document.createElement('div');
            azureHeader.className = 'model-section-header azure';
            azureHeader.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.458 2.003L3.18 6.393v11.194l4.68 2.355V8.708l4.598-2.315v-4.39zm-.916 4.392l-4.6 2.315v9.231l4.6 2.315v-4.39l-2.3-1.157v-2.365l2.3-1.157v-4.39l.916.46v4.39l2.3 1.157v2.365l-2.3 1.157v4.39l4.598-2.315V6.393l-4.598-2.315-.916.317z"/>
                </svg>
                Azure Inference
            `;
            menu.appendChild(azureHeader);

            azureModels.forEach(model => {
                const modelId = getModelId(model);
                const modelName = getModelDisplayName(model);
                const providerClass = model.provider.toLowerCase().replace(/\s+/g, '');
                const caps = getModelCapabilities(model);
                
                const item = document.createElement('button');
                item.className = `model-item ${modelId === currentSelection ? 'selected' : ''}`;
                item.dataset.modelId = modelId;
                item.onclick = () => selectModel(modelId, modelName);
                
                item.innerHTML = `
                    <div class="model-item-icon ${providerClass}">${getProviderIconSVG(model.provider)}</div>
                    <div class="model-item-details">
                        <div class="model-item-name">${modelName}</div>
                        <div class="model-item-caps">
                            ${caps.map(c => `<div class="model-cap-icon ${c.type}" title="${c.title}">${c.svg}</div>`).join('')}
                        </div>
                    </div>
                `;
                menu.appendChild(item);

                // Add to hidden select
                const option = document.createElement('option');
                option.value = modelId;
                option.textContent = modelName;
                hiddenSelect.appendChild(option);
            });
        }

        // Copilot Models Section
        if (copilotModels.length > 0) {
            const copilotHeader = document.createElement('div');
            copilotHeader.className = 'model-section-header copilot';
            copilotHeader.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/>
                </svg>
                GitHub Copilot
            `;
            menu.appendChild(copilotHeader);

            copilotModels.forEach(model => {
                const modelId = getModelId(model);
                const modelName = getModelDisplayName(model);
                const providerClass = model.provider.toLowerCase().replace(/\s+/g, '');
                const caps = getModelCapabilities(model);
                
                const item = document.createElement('button');
                item.className = `model-item ${modelId === currentSelection ? 'selected' : ''}`;
                item.dataset.modelId = modelId;
                item.onclick = () => selectModel(modelId, modelName);
                
                item.innerHTML = `
                    <div class="model-item-icon ${providerClass}">${getProviderIconSVG(model.provider)}</div>
                    <div class="model-item-details">
                        <div class="model-item-name">${modelName}</div>
                        <div class="model-item-caps">
                            ${caps.map(c => `<div class="model-cap-icon ${c.type}" title="${c.title}">${c.svg}</div>`).join('')}
                        </div>
                    </div>
                `;
                menu.appendChild(item);

                // Add to hidden select
                const option = document.createElement('option');
                option.value = modelId;
                option.textContent = modelName;
                hiddenSelect.appendChild(option);
            });
        }

        // Restore previous selection or default to first
        let selectedModel = null;
        if (currentSelection) {
            selectedModel = models.find(m => getModelId(m) === currentSelection);
        }
        if (!selectedModel && models.length > 0) {
            selectedModel = models[0];
        }
        
        if (selectedModel) {
            selectModel(getModelId(selectedModel), getModelDisplayName(selectedModel));
        }
    }

    // Clear model picker when models cannot be fetched
    function clearModelPicker() {
        const trigger = document.getElementById('modelDropdownTrigger');
        const menu = document.getElementById('modelDropdownMenu');
        const hiddenSelect = document.getElementById('chatModelSelect');
        
        if (trigger) {
            trigger.querySelector('.model-name').textContent = 'Unable to load models';
            trigger.disabled = true;
        }
        if (menu) {
            menu.innerHTML = '';
        }
        if (hiddenSelect) {
            hiddenSelect.innerHTML = '';
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Unable to load models';
            option.disabled = true;
            hiddenSelect.appendChild(option);
        }
    }

    // Deprecated: resizeModelSelector no longer needed with custom dropdown
    function resizeModelSelector() {
        // No longer needed - custom dropdown auto-sizes
    }

    // Chat window functions
    function showChatWindow() {
        const chatWindow = document.getElementById('chatWindow');
        if (chatWindow) {
            chatWindow.style.display = 'flex';
        }
    }

    function hideChatWindow() {
        const chatWindow = document.getElementById('chatWindow');
        if (chatWindow) {
            chatWindow.style.display = 'none';
        }
    }

    // Auto-resize textarea as user types
    function autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    }

    // Handle Enter key to send message (Shift+Enter for new line)
    function handleChatKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            askAI();
        }
    }

    // Pending file attachment storage
    let pendingFileAttachment = null;

    // Handle file upload for chat - full implementation
    function handleChatFileUpload(input) {
        const file = input.files[0];
        if (!file) return;
        
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            showToast('File too large. Maximum size is 10MB.', 'error', 'File Error');
            input.value = '';
            return;
        }
        
        // Determine file type and process accordingly
        const fileType = file.type;
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        
        showToast(`Processing ${fileName}...`, 'info', 'File Upload');
        
        // Handle images - convert to base64 for vision models
        if (fileType.startsWith('image/')) {
            processImageFile(file);
        }
        // Handle text-based files
        else if (['txt', 'md', 'json', 'csv', 'js', 'css', 'html', 'py', 'rb', 'java', 'c', 'cpp', 'h', 'xml', 'yml', 'yaml'].includes(fileExtension)) {
            processTextFile(file);
        }
        // Handle PDF files
        else if (fileExtension === 'pdf') {
            processPdfFile(file);
        }
        // Handle Office documents
        else if (['doc', 'docx', 'xls', 'xlsx'].includes(fileExtension)) {
            processOfficeFile(file);
        }
        else {
            showToast(`Unsupported file type: ${fileExtension}`, 'error', 'File Error');
        }
        
        input.value = '';
    }

    // Process image files for vision-enabled models
    async function processImageFile(file) {
        try {
            // Lazy-load the custom image processor module
            const mod = await import('/system/js.on/image-processor.js');
            showToast('Analyzing image... this may take a moment', 'info', 'Analyzing');

            // Run analysis (thumbnail, colors, edges, text regions, numeric OCR)
            const analysis = await mod.analyzeImage(file, { numericOCR: true, detectCharts: true });

            pendingFileAttachment = {
                type: 'image',
                name: file.name,
                mimeType: file.type,
                size: file.size,
                thumbnail: analysis.thumbnail,
                analysis: analysis,
                // store only thumbnail by default to keep memory small; full data can be included on demand
                data: analysis.thumbnail
            };

            // Show enhanced preview with analysis
            showFilePreview(pendingFileAttachment);
            showToast(`Image analyzed and attached: ${file.name}`, 'success', 'File Attached');
        } catch (error) {
            console.warn('Image analysis failed, falling back to basic preview:', error);
            // Fallback to basic data URL preview
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Data = e.target.result;
                pendingFileAttachment = {
                    type: 'image',
                    name: file.name,
                    mimeType: file.type,
                    data: base64Data,
                    size: file.size
                };
                showFilePreview(pendingFileAttachment);
                showToast(`Image ready: ${file.name}. Type your message or click send.`, 'success', 'File Attached');
            };
            reader.onerror = function() {
                showToast('Failed to read image file', 'error', 'File Error');
            };
            reader.readAsDataURL(file);
        }
    }

    // Process text-based files
    function processTextFile(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const textContent = e.target.result;
            pendingFileAttachment = {
                type: 'text',
                name: file.name,
                mimeType: file.type || 'text/plain',
                content: textContent,
                size: file.size
            };
            
            showFilePreview(pendingFileAttachment);
            showToast(`File ready: ${file.name}. Type your message or click send.`, 'success', 'File Attached');
        };
        reader.onerror = function() {
            showToast('Failed to read text file', 'error', 'File Error');
        };
        reader.readAsText(file);
    }

    // Process PDF files - extract basic info
    function processPdfFile(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // For now, we'll send the PDF as base64 for models that support it
            // or inform user that PDF text extraction is limited
            const base64Data = e.target.result;
            pendingFileAttachment = {
                type: 'pdf',
                name: file.name,
                mimeType: 'application/pdf',
                data: base64Data,
                size: file.size
            };
            
            showFilePreview(pendingFileAttachment);
            showToast(`PDF ready: ${file.name}. Note: PDF support varies by model.`, 'success', 'File Attached');
        };
        reader.onerror = function() {
            showToast('Failed to read PDF file', 'error', 'File Error');
        };
        reader.readAsDataURL(file);
    }

    // Process Office documents - limited support
    function processOfficeFile(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Data = e.target.result;
            pendingFileAttachment = {
                type: 'document',
                name: file.name,
                mimeType: file.type,
                data: base64Data,
                size: file.size
            };
            
            showFilePreview(pendingFileAttachment);
            showToast(`Document ready: ${file.name}. Note: Full parsing coming soon.`, 'success', 'File Attached');
        };
        reader.onerror = function() {
            showToast('Failed to read document', 'error', 'File Error');
        };
        reader.readAsDataURL(file);
    }

    // Show file preview in the chat area (supports fullscreen input area too)
    function showFilePreview(attachment) {
        // Remove any existing preview
        clearFilePreview();

        const previewDiv = document.createElement('div');
        previewDiv.id = 'fileAttachmentPreview';
        previewDiv.className = 'file-attachment-preview';

        // Build basic preview HTML
        let previewInner = `
            <div class="file-preview-content">
                ${attachment.type === 'image' 
                    ? `<img src="${attachment.thumbnail || attachment.data}" alt="${attachment.name}" class="file-preview-image">`
                    : `<div class="file-preview-icon">${getFileIcon(attachment.type)}</div>`
                }
                <div class="file-preview-info">
                    <span class="file-preview-name">${attachment.name}</span>
                    <span class="file-preview-size">${formatFileSize(attachment.size)}</span>
                </div>
                <div style="flex:1 1 auto"></div>
                <button class="file-preview-remove" onclick="clearFilePreview()" title="Remove attachment">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;

        // Add analysis section if available
        if (attachment.analysis) {
            const a = attachment.analysis;
            const colorsHtml = (a.dominantColors || []).map(c => `<span class="color-swatch" style="background:${c}" title="${c}"></span>`).join('');
            previewInner += `
                <div class="file-analysis">
                    <div class="analysis-summary">${escapeHtml(a.analysisSummary || '')}</div>
                    <div class="analysis-meta">
                        <div class="analysis-colors">${colorsHtml}</div>
                        <div class="analysis-details">
                            <span>${a.chartDetected ? 'Chart-like features detected' : 'No chart-like features'}</span>
                            <span> · </span>
                            <span>${(a.textRegions || []).length} text regions</span>
                            ${a.numericOCR && a.numericOCR.length ? `<span> · Numeric samples: ${a.numericOCR.slice(0,3).join(', ')}</span>` : ''}
                        </div>
                    </div>
                    <div class="analysis-actions">
                        ${a.numericOCR && a.numericOCR.length ? `<button class="small-btn" onclick="insertOcrText()">Insert OCR text</button>` : ''}
                        <button class="small-btn" onclick="reAnalyzeImage()">Re-run analysis</button>
                        <button class="small-btn" onclick="viewFullAttachment()">View</button>
                    </div>
                </div>
            `;
        }

        previewDiv.innerHTML = previewInner;

        // Choose insertion point: fullscreen input area preferred if active
        const fullscreenModal = document.getElementById('fullscreenChatModal');
        let target = null;
        if (fullscreenModal && fullscreenModal.classList.contains('active')) {
            target = document.getElementById('fullscreenChatInputArea');
        }
        if (!target) target = document.querySelector('.chat-input-bar') || document.querySelector('.chat-input-wrapper') || document.body;

        if (target) {
            // insert at top
            target.insertBefore(previewDiv, target.firstChild);
        }

        // Small helper functions bound to global so buttons can call them
        window.insertOcrText = function() {
            const aiPrompt = document.getElementById('aiPrompt');
            if (!aiPrompt || !attachment.analysis || !attachment.analysis.numericOCR) return;
            const text = (attachment.analysis.numericOCR || []).slice(0,3).join(' ');
            aiPrompt.value = (aiPrompt.value ? aiPrompt.value + '\n' : '') + text;
            aiPrompt.focus();
            autoResizeTextarea(aiPrompt);
        };

        window.reAnalyzeImage = async function() {
            if (!attachment || !attachment.name) return;
            showToast('Re-analyzing image...', 'info', 'Analyzing');
            try {
                const mod = await import('/system/js.on/image-processor.js');
                const res = await mod.analyzeImage(attachment.data || attachment.thumbnail, { numericOCR: true, detectCharts: true });
                attachment.analysis = res;
                // Update preview
                showFilePreview(attachment);
                showToast('Re-analysis complete', 'success', 'Analyzed');
            } catch (e) {
                showToast('Re-analysis failed', 'error', 'Error');
            }
        };

        window.viewFullAttachment = function() {
            // open full size data in new tab if available
            const url = attachment.data || attachment.thumbnail;
            if (url) window.open(url, '_blank');
        };
    }

    // Clear file preview and pending attachment
    function clearFilePreview() {
        pendingFileAttachment = null;
        const preview = document.getElementById('fileAttachmentPreview');
        if (preview) {
            preview.remove();
        }
    }

    // Get file icon based on type
    function getFileIcon(type) {
        const icons = {
            'text': '📄',
            'pdf': '📑',
            'document': '📋',
            'image': '🖼️'
        };
        return icons[type] || '📎';
    }

    // Format file size for display
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // Build message content with attachment
    function buildMessageWithAttachment(userMessage) {
        if (!pendingFileAttachment) {
            return userMessage;
        }
        
        const attachment = pendingFileAttachment;
        let content = [];
        
        // For images, use multimodal format if model supports it
        if (attachment.type === 'image') {
            // Check if current model supports vision
            const currentModel = document.getElementById('chatModelSelect')?.value || '';
            const supportsVision = CONFIG.VISION_MODELS.some(v => currentModel.toLowerCase().includes(v));
            
            if (supportsVision) {
                // Build multimodal message including structured analysis when available
                const imageUrl = attachment.data || attachment.thumbnail || '';
                return {
                    multimodal: true,
                    content: [
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageUrl,
                                detail: 'auto'
                            }
                        },
                        {
                            type: 'attachment_analysis',
                            analysis: attachment.analysis || {}
                        },
                        {
                            type: 'text',
                            text: userMessage || `Please analyze this image: ${attachment.name}`
                        }
                    ]
                };
            } else {
                // For non-vision models, describe the attachment with analysis summary if present
                const analysisSummary = attachment.analysis ? `\nAnalysis: ${attachment.analysis.analysisSummary || ''}` : '';
                return `[Image attached: ${attachment.name} (${formatFileSize(attachment.size)})]${analysisSummary} - Note: Current model may not support image analysis.\n\n${userMessage}`;
            }
        }
        
        // For text files, include the content
        if (attachment.type === 'text') {
            const fileContent = attachment.content.length > CONFIG.MAX_TEXT_FILE_CONTENT 
                ? attachment.content.substring(0, CONFIG.MAX_TEXT_FILE_CONTENT) + '\n\n... [truncated, file too large]'
                : attachment.content;
            return `Here is the content of ${attachment.name}:\n\n\`\`\`\n${fileContent}\n\`\`\`\n\n${userMessage}`;
        }
        
        // For PDFs and other documents, note the attachment
        if (attachment.type === 'pdf' || attachment.type === 'document') {
            return `[${attachment.name} attached - ${formatFileSize(attachment.size)}]\n\nNote: This file has been attached. Full content extraction for ${attachment.type} files is limited in this version.\n\n${userMessage}`;
        }
        
        return userMessage;
    }

    // Simple syntax highlighter for code blocks
    function highlightCode(code, lang) {
        if (!lang) return code;
        
        const langLower = lang.toLowerCase();
        
        // Keywords by language
        const keywords = {
            javascript: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof|null|undefined|true|false)\b/g,
            js: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof|null|undefined|true|false)\b/g,
            python: /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|with|lambda|True|False|None|and|or|not|in|is|self)\b/g,
            py: /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|with|lambda|True|False|None|and|or|not|in|is|self)\b/g,
            html: /\b(html|head|body|div|span|p|a|img|script|style|link|meta|title|h[1-6]|ul|ol|li|table|tr|td|th|form|input|button|select|option)\b/g,
            css: /\b(color|background|margin|padding|border|font|width|height|display|position|flex|grid|transform|transition|animation)\b/g,
            ruby: /\b(def|class|module|if|elsif|else|unless|case|when|while|until|for|do|end|return|yield|begin|rescue|ensure|raise|nil|true|false|self|require|include)\b/g,
            sql: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT)\b/gi,
            json: /("[\w]+")(?=\s*:)/g,
            bash: /\b(if|then|else|fi|for|while|do|done|case|esac|function|return|echo|exit|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk)\b/g,
            sh: /\b(if|then|else|fi|for|while|do|done|case|esac|function|return|echo|exit|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk)\b/g
        };
        
        let highlighted = code;
        
        // Highlight strings (must do first to avoid conflicts)
        highlighted = highlighted.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="string">$&</span>');
        
        // Highlight comments
        highlighted = highlighted.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm, '<span class="comment">$&</span>');
        
        // Highlight numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
        
        // Highlight keywords based on language
        if (keywords[langLower]) {
            highlighted = highlighted.replace(keywords[langLower], '<span class="keyword">$&</span>');
        }
        
        // Highlight function calls
        highlighted = highlighted.replace(/\b([a-zA-Z_]\w*)\s*\(/g, '<span class="function">$1</span>(');
        
        return highlighted;
    }

    // Format text to HTML with markdown-like features
    function formatMessageText(text) {
        // Escape HTML first
        let formatted = text.replace(/&/g, '&amp;')
                           .replace(/</g, '&lt;')
                           .replace(/>/g, '&gt;');
        
        // Format code blocks (```...```) with syntax highlighting
        formatted = formatted.replace(/```([a-zA-Z0-9+-]*)\n?([\s\S]*?)```/g, function(match, lang, code) {
            const langLabel = lang || 'code';
            const highlightedCode = highlightCode(code.trim(), lang);
            const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
            return `<div class="code-block-wrapper">
                <div class="code-block-header">
                    <span class="code-lang-label">${langLabel}</span>
                    <button class="code-copy-btn" onclick="copyCodeBlock('${codeId}')">Copy</button>
                </div>
                <pre><code id="${codeId}" class="language-${lang}">${highlightedCode}</code></pre>
            </div>`;
        });
        
        // Format inline code (`...`)
        formatted = formatted.replace(/`([^`]*)`/g, '<code>$1</code>');
        
        // Format bold (**...** or __...__)
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/__([^_]+)__/g, '<strong>$1</strong>');
        
        // Format bullet points (- ... or * ...)
        const lines = formatted.split('\n');
        let inList = false;
        let listType = '';
        const processedLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.match(/^[\-\*]\s+/)) {
                if (!inList) {
                    processedLines.push('<ul>');
                    inList = true;
                    listType = 'ul';
                }
                processedLines.push('<li>' + line.replace(/^[\-\*]\s+/, '') + '</li>');
            } else if (line.match(/^\d+\.\s+/)) {
                if (!inList) {
                    processedLines.push('<ol>');
                    inList = true;
                    listType = 'ol';
                } else if (listType === 'ul') {
                    processedLines.push('</ul>');
                    processedLines.push('<ol>');
                    listType = 'ol';
                }
                processedLines.push('<li>' + line.replace(/^\d+\.\s+/, '') + '</li>');
            } else {
                if (inList) {
                    processedLines.push(listType === 'ol' ? '</ol>' : '</ul>');
                    inList = false;
                    listType = '';
                }
                if (line.trim()) {
                    processedLines.push('<p>' + line + '</p>');
                } else if (i > 0 && processedLines.length > 0 && processedLines[processedLines.length - 1] !== '<br>') {
                    processedLines.push('<br>');
                }
            }
        }
        
        if (inList) {
            processedLines.push(listType === 'ol' ? '</ol>' : '</ul>');
        }
        
        return processedLines.join('\n');
    }

    // Copy code block content to clipboard
    function copyCodeBlock(codeId) {
        const codeElement = document.getElementById(codeId);
        if (codeElement) {
            // Get text content (without HTML tags)
            const code = codeElement.textContent;
            navigator.clipboard.writeText(code).then(() => {
                showToast('Code copied to clipboard!', 'success', 'Copied');
            }).catch(err => {
                console.error('Failed to copy:', err);
                showToast('Failed to copy code', 'error', 'Error');
            });
        }
    }

    // Render messages into a given container from chatHistory
    function renderChatMessages(container, messages) {
        if (!container) return;
        container.innerHTML = '';
        if (!messages || messages.length === 0) {
            container.innerHTML = `
                <div class="chat-empty-state">
                    <div class="chat-empty-icon">💬</div>
                    <div class="chat-empty-text">Start a conversation</div>
                    <div class="chat-empty-subtext">Ask about trades, patterns, or market sentiment</div>
                </div>
            `;
            return;
        }

        messages.forEach(msg => {
            if (!msg || !msg.role) return;

            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${msg.role}`;

            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'chat-avatar';

            if (msg.role === 'user') {
                const avatarUrl = getUserAvatarUrl();
                if (avatarUrl) {
                    const img = document.createElement('img');
                    img.src = avatarUrl;
                    img.alt = 'User';
                    img.onerror = function() { this.parentElement.textContent = 'U'; };
                    avatarDiv.appendChild(img);
                } else {
                    avatarDiv.textContent = 'U';
                }
            } else {
                avatarDiv.innerHTML = getCopilotSvg();
            }

            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = 'chat-bubble';

            if (msg.role === 'user') {
                bubbleDiv.textContent = msg.content;
            } else {
                // Preserve citations HTML if present, otherwise format message text
                if (msg.citations && Array.isArray(msg.citations) && msg.citations.length > 0) {
                    const formatted = formatMessageText(msg.content || '');
                    bubbleDiv.innerHTML = addCitationsToMessage(formatted, msg.citations);
                } else if (msg.html === true) {
                    bubbleDiv.innerHTML = msg.content || '';
                } else {
                    bubbleDiv.innerHTML = formatMessageText(msg.content || '');
                }
            }

            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(bubbleDiv);

            // Render attachments if present
            if (msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0) {
                const attachmentsContainer = document.createElement('div');
                attachmentsContainer.className = 'message-attachments';

                msg.attachments.forEach(att => {
                    const card = document.createElement('div');
                    card.className = 'attachment-card';

                    if (att.type === 'image') {
                        const img = document.createElement('img');
                        img.className = 'attachment-thumbnail';
                        img.src = att.thumbnail || att.data || '';
                        img.alt = att.name;
                        card.appendChild(img);
                    } else {
                        const icon = document.createElement('div');
                        icon.className = 'attachment-icon';
                        icon.textContent = getFileIcon(att.type);
                        card.appendChild(icon);
                    }

                    const info = document.createElement('div');
                    info.className = 'attachment-info';
                    info.innerHTML = `<div class="attachment-name">${escapeHtml(att.name)}</div><div class="attachment-size">${formatFileSize(att.size)}</div>`;
                    card.appendChild(info);

                    if (att.analysis) {
                        const summary = document.createElement('div');
                        summary.className = 'attachment-analysis';
                        summary.textContent = att.analysis.analysisSummary || '';
                        card.appendChild(summary);
                    }

                    const actions = document.createElement('div');
                    actions.className = 'attachment-actions';

                    const viewBtn = document.createElement('button');
                    viewBtn.className = 'small-btn';
                    viewBtn.textContent = 'View';
                    viewBtn.onclick = () => { window.open(att.data || att.thumbnail || att.url, '_blank'); };
                    actions.appendChild(viewBtn);

                    const insertOCRBtn = document.createElement('button');
                    insertOCRBtn.className = 'small-btn';
                    insertOCRBtn.textContent = 'Insert OCR';
                    insertOCRBtn.onclick = () => {
                        if (att.analysis && att.analysis.numericOCR && att.analysis.numericOCR.length) {
                            const aiPrompt = document.getElementById('aiPrompt');
                            aiPrompt.value = (aiPrompt.value ? aiPrompt.value + '\n' : '') + att.analysis.numericOCR.join('\n');
                            aiPrompt.focus();
                            autoResizeTextarea(aiPrompt);
                        }
                    };
                    actions.appendChild(insertOCRBtn);

                    card.appendChild(actions);
                    attachmentsContainer.appendChild(card);
                });

                messageDiv.appendChild(attachmentsContainer);
            }

            container.appendChild(messageDiv);
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    // Add a message to the chat (stores to chatHistory and re-renders)
    function addChatMessage(role, content, options = {}) {
        const message = { role, content };
        if (options.citations) message.citations = options.citations;
        if (options.html) message.html = true;
        if (options.attachments) message.attachments = options.attachments;

        // Add to chat history and render
        chatHistory.push(message);
        const container = document.getElementById('chatMessagesContainer');
        renderChatMessages(container, chatHistory);
    }

    // Helper function to restore send button to normal state
    function restoreSendButton(sendBtn) {
        if (!sendBtn) return;
        sendBtn.disabled = false;
        sendBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
        `;
    }

    // Helper function to set send button to loading state
    function setSendButtonLoading(sendBtn) {
        if (!sendBtn) return;
        sendBtn.disabled = true;
        sendBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
            </svg>
        `;
    }

    // =============================================
    // Web Search Toggle and Status Functions
    // =============================================

    function toggleWebSearch(event) {
        // Prevent default behavior and stop propagation to avoid keyboard/focus glitches
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        webSearchEnabled = !webSearchEnabled;
        const toggle = document.getElementById('webSearchToggle');
        if (toggle) {
            if (webSearchEnabled) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
            // Immediately blur to remove focus state and prevent highlight sticking
            toggle.blur();
        }
        // Placeholder always stays the same - "Review the Markets..."
    }

    // Trigger file upload with proper focus handling
    function triggerFileUpload(event) {
        // Stop propagation - same pattern as toggleQuickActionsPopup (More button)
        if (event) {
            event.stopPropagation();
        }
        
        const fileInput = document.getElementById('chatFileInput');
        
        // Trigger the file input click
        fileInput.click();
    }

    // Fullscreen chat state
    let isFullscreenChat = false;
    let originalChatInputParent = null;
    let originalChatInputNextSibling = null;

    function handleFullscreenKeydown(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            if (isFullscreenChat) toggleFullscreenChat();
        }
    }

    function pullUpInputHandler() {
        const modal = document.getElementById('fullscreenChatModal');
        if (modal) modal.classList.add('input-pulled-up');
    }
    function pullDownInputHandler() {
        const modal = document.getElementById('fullscreenChatModal');
        if (modal) modal.classList.remove('input-pulled-up');
    }

    // Toggle fullscreen chat modal
    function toggleFullscreenChat() {
        const modal = document.getElementById('fullscreenChatModal');
        const fullscreenBtn = document.getElementById('fullscreenChatBtn');
        const messagesContainer = document.getElementById('chatMessagesContainer');
        const fullscreenBody = document.getElementById('fullscreenChatBody');
        const fullscreenInputArea = document.getElementById('fullscreenChatInputArea');
        const chatInputBar = document.querySelector('.chat-input-bar');

        if (!modal) return;

        isFullscreenChat = !isFullscreenChat;

        if (isFullscreenChat) {
            // Enter fullscreen
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';

            // Render messages into fullscreen modal using renderer
            if (fullscreenBody) {
                renderChatMessages(fullscreenBody, chatHistory);
            }

            // Move input controls into fullscreen input area (preserve event listeners)
            if (chatInputBar && fullscreenInputArea) {
                if (!originalChatInputParent) {
                    originalChatInputParent = chatInputBar.parentNode;
                    originalChatInputNextSibling = chatInputBar.nextSibling;
                }
                fullscreenInputArea.appendChild(chatInputBar);
            }

            // Focus the prompt
            const aiPrompt = document.getElementById('aiPrompt');
            setTimeout(() => { if (aiPrompt) aiPrompt.focus(); }, 50);

            // Adjust for virtual keyboard on mobile (visualViewport)
            if (window.visualViewport) {
                const onViewportChange = () => {
                    const kbHeight = Math.max(0, window.innerHeight - window.visualViewport.height);
                    const fullscreenBodyEl = document.getElementById('fullscreenChatBody');
                    const inputAreaEl = document.getElementById('fullscreenChatInputArea');
                    if (fullscreenBodyEl && inputAreaEl) {
                        fullscreenBodyEl.style.paddingBottom = (kbHeight + inputAreaEl.offsetHeight + 16) + 'px';
                    }
                };
                // store handler so we can remove it later
                window.visualViewport._fullscreenChatHandler = onViewportChange;
                window.visualViewport.addEventListener('resize', onViewportChange);
                window.visualViewport.addEventListener('scroll', onViewportChange);
                onViewportChange();
            }

            // Keyboard handler and focus behavior
            document.addEventListener('keydown', handleFullscreenKeydown);
            if (aiPrompt) {
                aiPrompt.addEventListener('focus', pullUpInputHandler);
                aiPrompt.addEventListener('blur', pullDownInputHandler);
            }
        } else {
            // Exit fullscreen
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';

            // Re-render messages in main chat container
            if (messagesContainer) {
                renderChatMessages(messagesContainer, chatHistory);
            }

            // Move input back to its original location
            const currentInputBar = document.querySelector('.chat-input-bar');
            if (currentInputBar && originalChatInputParent) {
                originalChatInputParent.insertBefore(currentInputBar, originalChatInputNextSibling);
            }
            originalChatInputParent = null;
            originalChatInputNextSibling = null;

            // Remove handlers and any pulled-up state
            document.removeEventListener('keydown', handleFullscreenKeydown);
            const aiPrompt = document.getElementById('aiPrompt');
            if (aiPrompt) {
                aiPrompt.removeEventListener('focus', pullUpInputHandler);
                aiPrompt.removeEventListener('blur', pullDownInputHandler);
            }

            // Remove visualViewport handlers if present
            if (window.visualViewport && window.visualViewport._fullscreenChatHandler) {
                window.visualViewport.removeEventListener('resize', window.visualViewport._fullscreenChatHandler);
                window.visualViewport.removeEventListener('scroll', window.visualViewport._fullscreenChatHandler);
                delete window.visualViewport._fullscreenChatHandler;
                const fullscreenBodyEl = document.getElementById('fullscreenChatBody');
                if (fullscreenBodyEl) fullscreenBodyEl.style.paddingBottom = '';
            }

            modal.classList.remove('input-pulled-up');
        }
    }

    // Hide fullscreen button when model dropdown is open
    function updateFullscreenBtnVisibility() {
        const fullscreenBtn = document.getElementById('fullscreenChatBtn');
        const modelDropdownMenu = document.getElementById('modelDropdownMenu');
        
        if (fullscreenBtn && modelDropdownMenu) {
            if (modelDropdownMenu.classList.contains('active')) {
                fullscreenBtn.classList.add('hidden');
            } else {
                fullscreenBtn.classList.remove('hidden');
            }
        }
    }

    // ===================== Attachment Test Harness =====================
    // Floating widget to run scraper-based image analysis tests
    function _createAttachmentTestWidget() {
        if (document.getElementById('attachmentTestWidget')) return;
        const widget = document.createElement('div');
        widget.id = 'attachmentTestWidget';
        widget.className = 'attachment-test-widget';
        widget.title = 'Run Attachment Scraper Tests';
        widget.innerHTML = `<button id="runAttachmentTestsBtn" class="small-btn">Run Attachment Tests</button>
            <div id="attachmentTestOutput" class="attachment-test-output" style="display:none;"></div>`;
        document.body.appendChild(widget);

        document.getElementById('runAttachmentTestsBtn').addEventListener('click', async () => {
            const out = document.getElementById('attachmentTestOutput');
            out.style.display = 'block';
            out.textContent = '';
            await runAttachmentScraperTests(out);
        });
        // Auto-run tests once (user asked to run tests immediately)
        setTimeout(() => {
            try { document.getElementById('runAttachmentTestsBtn').click(); } catch(e) { /* ignore */ }
        }, 800);
    }

    async function runAttachmentScraperTests(outputEl) {
        outputEl = outputEl || document.getElementById('attachmentTestOutput') || { textContent: '' };
        function log(msg) { console.log('[AttachmentTest]', msg); outputEl.textContent += msg + '\n'; outputEl.scrollTop = outputEl.scrollHeight; }

        const samplePages = [
            'https://en.wikipedia.org/wiki/Apple_Inc.',
            'https://en.wikipedia.org/wiki/Stock_market'
        ];

        let total = 0, analyzed = 0, charts = 0;

        for (const page of samplePages) {
            log(`Fetching page: ${page}`);
            try {
                const prox = CONFIG.CORS_PROXY + encodeURIComponent(page);
                const res = await fetch(prox);
                const html = await res.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const imgs = Array.from(doc.querySelectorAll('img'))
                    .map(img => img.getAttribute('src') || img.getAttribute('data-src'))
                    .filter(Boolean)
                    .map(src => {
                        try { return new URL(src, page).toString(); } catch(e) { return null; }
                    })
                    .filter(Boolean);

                log(`Found ${imgs.length} images on page.`);

                for (let i=0;i<Math.min(4, imgs.length); i++) {
                    const imgUrl = imgs[i];
                    total++;
                    log(`Fetching image ${i+1}: ${imgUrl}`);
                    try {
                        const proxImg = CONFIG.CORS_PROXY + encodeURIComponent(imgUrl);
                        const imRes = await fetch(proxImg);
                        const blob = await imRes.blob();
                        // analyze using our module
                        const mod = await import('/system/js.on/image-processor.js');
                        const analysis = await mod.analyzeImage(blob, { numericOCR: true, detectCharts: true });
                        analyzed++;
                        if (analysis.chartDetected) charts++;
                        log(`Analyzed: chartDetected=${analysis.chartDetected}, textRegions=${(analysis.textRegions||[]).length}, colors=${(analysis.dominantColors||[]).join(', ')}`);

                        // Add result to chat as an assistant message (non-API) for quick inspection
                        const contentHtml = `<div style="font-size:13px;">Analyzed <a href='${escapeHtml(imgUrl)}' target='_blank' rel='noopener noreferrer'>image</a>: <br/>Chart: ${analysis.chartDetected} · Text regions: ${(analysis.textRegions||[]).length} · Colors: ${(analysis.dominantColors||[]).slice(0,3).join(', ')}</div>`;
                        addChatMessage('assistant', contentHtml, { html: true });

                    } catch (e) {
                        log(`Image fetch/analysis failed: ${e.message}`);
                    }
                }

            } catch (e) {
                log(`Page fetch failed: ${e.message}`);
            }
        }

        log(`Tests complete. Pages: ${samplePages.length}, Images: ${total}, Analyzed: ${analyzed}, Charts found: ${charts}`);
    }

    // Create widget on load
    window.addEventListener('load', () => setTimeout(_createAttachmentTestWidget, 500));

    // Test widget styles
    const testWidgetStyle = document.createElement('style');
    testWidgetStyle.innerHTML = `
        .attachment-test-widget { position: fixed; right: 12px; bottom: 84px; z-index: 99999; display:flex; flex-direction:column; gap:6px; align-items:flex-end; }
        .attachment-test-widget .attachment-test-output { width: 420px; height: 300px; background: rgba(0,0,0,0.7); color: #fff; border: 1px solid rgba(255,255,255,0.06); padding: 8px; overflow:auto; border-radius: 8px; font-family: monospace; font-size: 12px; }
        #runAttachmentTestsBtn { padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); color: #fff; }
    `;
    document.head.appendChild(testWidgetStyle);


    function showChatStatus(statusType, message) {
        const statusIndicator = document.getElementById('chatStatusIndicator');
        if (!statusIndicator) return;
        
        // Remove all status classes
        statusIndicator.classList.remove('status-searching', 'status-crawling', 'status-processing', 'status-complete');
        
        // Add the appropriate status class
        statusIndicator.classList.add(`status-${statusType}`);
        
        // Update the status text
        const statusText = statusIndicator.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = message;
        }
        
        // Show the indicator
        statusIndicator.style.display = 'flex';
    }

    function hideChatStatus() {
        const statusIndicator = document.getElementById('chatStatusIndicator');
        if (statusIndicator) {
            statusIndicator.style.display = 'none';
        }
    }

    // =============================================
    // Web Search Tool Definitions
    // =============================================

    const webSearchTools = [
        {
            type: 'function',
            function: {
                name: 'web_search',
                description: 'Search the web for current information, news, stock prices, market data, or any other real-time information. Use this when the user asks about current events, recent news, live prices, or anything that requires up-to-date information.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The search query to find information on the web'
                        }
                    },
                    required: ['query']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'fetch_url',
                description: 'Fetch and read the content of a specific URL. Use this to get detailed information from a webpage when you have a specific URL to read.',
                parameters: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'The full URL to fetch content from (must start with http:// or https://)'
                        }
                    },
                    required: ['url']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'scrape_url',
                description: 'Crawl and extract content from a URL (or a set of URLs). Parameters: url (string), depth (integer, default 0), maxPages (integer, default 3), selectors (array of css selectors to narrow extraction), followLinks (boolean, default false).',
                parameters: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'The full URL to scrape (must start with http:// or https://)' },
                        depth: { type: 'integer', description: 'How deep to follow links (0 = just the URL)', default: 0 },
                        maxPages: { type: 'integer', description: 'Maximum number of pages to fetch when following links', default: 3 },
                        selectors: { type: 'array', description: 'A list of CSS selectors to extract specific parts of the page' },
                        followLinks: { type: 'boolean', description: 'Whether to follow links from the starting page' }
                    },
                    required: ['url']
                }
            }
        }
    ];

    // =============================================
    // Web Search Implementation Functions
    // =============================================

    /**
     * Validates if a string is a valid URL
     */
    function isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    /**
     * Performs a web search using DuckDuckGo's HTML interface (CORS-friendly)
     */
    async function performWebSearch(query) {
        showChatStatus('searching', `Searching: "${query}"`);
        
        try {
            // Use DuckDuckGo's instant answer API (JSON, more CORS-friendly)
            const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
            
            const response = await fetch(searchUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Build results from DuckDuckGo instant answers
            const results = [];
            
            // Add abstract if available
            if (data.Abstract) {
                results.push({
                    title: data.Heading || 'Summary',
                    snippet: data.Abstract,
                    url: data.AbstractURL || data.AbstractSource
                });
            }
            
            // Add related topics
            if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                for (const topic of data.RelatedTopics.slice(0, CONFIG.WEB_SEARCH_MAX_RESULTS - 1)) {
                    if (topic.Text && topic.FirstURL) {
                        results.push({
                            title: topic.Text.split(' - ')[0] || 'Related',
                            snippet: topic.Text,
                            url: topic.FirstURL
                        });
                    } else if (topic.Topics) {
                        // Handle nested topics
                        for (const subtopic of topic.Topics.slice(0, 2)) {
                            if (subtopic.Text && subtopic.FirstURL) {
                                results.push({
                                    title: subtopic.Text.split(' - ')[0] || 'Related',
                                    snippet: subtopic.Text,
                                    url: subtopic.FirstURL
                                });
                            }
                        }
                    }
                }
            }
            
            // If no results from instant answers, return a message indicating we need to try fetching directly
            if (results.length === 0) {
                return {
                    success: true,
                    query: query,
                    results: [],
                    message: `No instant results found for "${query}". The AI should provide information from its knowledge or suggest specific URLs to fetch.`
                };
            }
            
            return {
                success: true,
                query: query,
                results: results.slice(0, CONFIG.WEB_SEARCH_MAX_RESULTS),
                resultCount: results.length
            };
            
        } catch (error) {
            console.error('Web search error:', error);
            return {
                success: false,
                query: query,
                error: error.message || 'Search failed',
                message: 'Unable to perform web search. Please try again or ask a question that can be answered from AI knowledge.'
            };
        }
    }

    /**
     * Fetches and parses content from a URL
     */
    async function fetchUrlContent(url) {
        showChatStatus('crawling', `Fetching: ${new URL(url).hostname}`);
        
        if (!isValidUrl(url)) {
            return {
                success: false,
                url: url,
                error: 'Invalid URL format'
            };
        }
        
        try {
            // Use CORS proxy for fetching
            const proxyUrl = CONFIG.CORS_PROXY + encodeURIComponent(url);
            
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }
            
            const html = await response.text();
            
            // Parse and extract main content
            const content = extractMainContent(html, url);
            
            return {
                success: true,
                url: url,
                title: content.title,
                content: content.text,
                wordCount: content.wordCount
            };
            
        } catch (error) {
            console.error('URL fetch error:', error);
            return {
                success: false,
                url: url,
                error: error.message || 'Failed to fetch URL'
            };
        }
    }

    /**
     * Extracts main content from HTML
     */
    function extractMainContent(html, sourceUrl) {
        // Create a temporary DOM parser
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Get title
        const title = doc.querySelector('title')?.textContent || 
                     doc.querySelector('h1')?.textContent || 
                     'Untitled';
        
        // Remove script, style, nav, footer, header, aside elements
        const elementsToRemove = doc.querySelectorAll('script, style, nav, footer, header, aside, iframe, noscript, .ads, .advertisement, .sidebar, .menu, .navigation');
        elementsToRemove.forEach(el => el.remove());
        
        // Try to find main content areas with heuristics
        let mainContent = doc.querySelector('main, article, [role="main"], .content, .post, .article-content, #content, #main');

        if (!mainContent) {
            // Fallback: choose the node with the highest text density (text length weighted by inverse link density)
            const candidates = Array.from(doc.querySelectorAll('article, main, section, div'));
            let bestNode = null;
            let bestScore = 0;

            for (const node of candidates) {
                const t = (node.textContent || '').trim();
                const textLen = t.length;
                if (textLen < 200) continue; // skip very small nodes

                const linkTextLen = Array.from(node.querySelectorAll('a')).reduce((acc, a) => acc + ((a.textContent || '').length), 0);
                const linkDensity = linkTextLen / Math.max(1, textLen);
                const score = textLen * (1 - linkDensity);

                if (score > bestScore) {
                    bestScore = score;
                    bestNode = node;
                }
            }

            mainContent = bestNode || doc.body;
        }

        // Extract text content
        let text = mainContent?.textContent || '';

        // Try to extract a short readable snippet from first paragraphs
        let snippet = '';
        try {
            const paragraphs = Array.from(mainContent.querySelectorAll('p')).map(p => (p.textContent || '').trim()).filter(Boolean);
            if (paragraphs.length > 0) {
                snippet = paragraphs.slice(0, 3).join('\n\n');
            } else {
                snippet = text.substr(0, 500);
            }
        } catch (e) {
            snippet = text.substr(0, 500);
        }

        // Clean up the text
        text = text
            .replace(/\s+/g, ' ')           // Normalize whitespace
            .replace(/\n\s*\n/g, '\n\n')    // Normalize line breaks
            .trim();

        // Truncate if too long (keep first 4000 chars to stay within token limits)
        const maxLength = 4000;
        if (text.length > maxLength) {
            text = text.substring(0, maxLength) + '...[content truncated]';
        }

        // Meta description and JSON-LD
        const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        const jsonLd = Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).map(s => s.textContent).join('\n').trim();

        return {
            title: title.trim(),
            text: text,
            snippet: snippet.trim(),
            metaDescription,
            jsonLd,
            wordCount: text.split(/\s+/).length
        };
    }

    /**
     * Advanced scraping utility - fetches a URL, extracts main content, and optionally follows links up to a limited depth/maxPages.
     * options: { depth: 0, maxPages: 3, selectors: [], followLinks: false }
     */
    async function scrapeUrl(startUrl, options = {}) {
        const opts = Object.assign({ depth: 0, maxPages: 3, selectors: [], followLinks: false }, options || {});
        if (!isValidUrl(startUrl)) {
            return { success: false, url: startUrl, error: 'Invalid URL format' };
        }

        showChatStatus('crawling', `Scraping: ${new URL(startUrl).hostname}`);

        const visited = new Set();
        const pages = [];
        const queue = [{ url: startUrl, depth: 0 }];

        while (queue.length > 0 && pages.length < opts.maxPages) {
            const item = queue.shift();
            const url = item.url;
            if (!isValidUrl(url) || visited.has(url)) continue;
            visited.add(url);

            try {
                const proxyUrl = CONFIG.CORS_PROXY + encodeURIComponent(url);
                const response = await fetch(proxyUrl, { method: 'GET', headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' } });
                if (!response.ok) {
                    pages.push({ success: false, url, error: `HTTP ${response.status}` });
                    continue;
                }

                const html = await response.text();
                const content = extractMainContent(html, url);

                // Collect selector-specific extracts
                const selectorsExtract = [];
                if (opts.selectors && opts.selectors.length > 0) {
                    try {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        for (const sel of opts.selectors) {
                            const el = doc.querySelector(sel);
                            if (el) selectorsExtract.push({ selector: sel, html: el.innerHTML, text: (el.textContent || '').trim() });
                        }
                    } catch (e) {
                        // ignore selector failures
                    }
                }

                pages.push({ success: true, url, title: content.title, content: content.text, wordCount: content.wordCount, selectors: selectorsExtract });

                // Optionally follow links for further scraping
                if (opts.followLinks && item.depth < opts.depth) {
                    try {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        const anchors = Array.from(doc.querySelectorAll('a[href]'))
                            .map(a => a.href)
                            .filter(h => h && isValidUrl(h) && !visited.has(h));

                        // Enqueue up to remaining slots
                        for (const href of anchors) {
                            if (queue.length + pages.length >= opts.maxPages) break;
                            queue.push({ url: href, depth: item.depth + 1 });
                        }
                    } catch (e) {
                        // ignore link parsing errors
                    }
                }

            } catch (error) {
                pages.push({ success: false, url, error: error.message || 'Fetch error' });
            }
        }

        return { success: true, url: startUrl, pages, resultCount: pages.length };
    }

    /**
     * Executes a tool call and returns the result
     */
    async function executeToolCall(toolCall) {
        const functionName = toolCall.function.name;
        let args;
        
        try {
            args = JSON.parse(toolCall.function.arguments);
        } catch (e) {
            return {
                tool_call_id: toolCall.id,
                role: 'tool',
                name: functionName,
                content: JSON.stringify({ error: 'Invalid function arguments' })
            };
        }
        
        let result;
        
        switch (functionName) {
            case 'web_search':
                result = await performWebSearch(args.query);
                break;
            case 'fetch_url':
                result = await fetchUrlContent(args.url);
                break;
            case 'scrape_url':
                result = await scrapeUrl(args.url, args);
                break;
            default:
                result = { error: `Unknown function: ${functionName}` };
        }
        
        return {
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(result)
        };
    }

    /**
     * Formats citations from tool results
     */
    function formatCitations(toolResults) {
        const citations = [];
        
        for (const result of toolResults) {
            try {
                const data = JSON.parse(result.content);
                
                if (result.name === 'web_search' && data.results) {
                    for (const item of data.results) {
                        if (item.url && !citations.some(c => c.url === item.url)) {
                            citations.push({
                                title: item.title || new URL(item.url).hostname,
                                url: item.url
                            });
                        }
                    }
                } else if (result.name === 'fetch_url' && data.url) {
                    if (!citations.some(c => c.url === data.url)) {
                        citations.push({
                            title: data.title || new URL(data.url).hostname,
                            url: data.url
                        });
                    }
                } else if (result.name === 'scrape_url') {
                    // scrape_url returns pages[] - include each page as a citation
                    if (data.pages && Array.isArray(data.pages)) {
                        for (const p of data.pages) {
                            if (p && p.url && !citations.some(c => c.url === p.url)) {
                                citations.push({ title: p.title || new URL(p.url).hostname, url: p.url });
                            }
                        }
                    }
                }
            } catch (e) {
                // Skip invalid results
            }
        }
        
        return citations;
    }

    /**
     * Adds citations section to message content
     */
    function addCitationsToMessage(content, citations) {
        if (!citations || citations.length === 0) return content;
        
        let citationsHtml = '\n\n<div class="chat-citations-section">';
        citationsHtml += '<div class="chat-citations-label">Sources</div>';
        citationsHtml += '<div class="chat-citations-list">';
        
        for (const citation of citations) {
            const safeTitle = escapeHtml(citation.title);
            const safeUrl = encodeURI(citation.url);
            citationsHtml += `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="chat-citation">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                ${safeTitle}
            </a>`;
        }
        
        citationsHtml += '</div></div>';
        
        return content + citationsHtml;
    }

    // =============================================
    // Main AI Request Function with Tool Calling
    // =============================================

    async function askAI() {
        const token = localStorage.getItem('githubToken');
        const prompt = document.getElementById('aiPrompt').value.trim();
        
        if (!token) {
            showToast('Please enter and save your GitHub token first', 'warning', 'Token Required');
            return;
        }
        
        if (!prompt) {
            showToast('Please enter a question or prompt', 'warning', 'Missing Prompt');
            return;
        }

        // Show chat window if not visible
        showChatWindow();
        
        // Build message with file attachment if present
        let messageContent = prompt;
        let hasAttachment = false;
        let attachmentPreview = '';
        
        if (pendingFileAttachment) {
            const built = buildMessageWithAttachment(prompt);
            if (typeof built === 'object' && built.multimodal) {
                // For multimodal messages, we'll handle this specially in the API call
                messageContent = built;
                hasAttachment = true;
                attachmentPreview = `📎 ${pendingFileAttachment.name}\n\n${prompt}`;
            } else {
                messageContent = built;
                hasAttachment = true;
                attachmentPreview = `📎 ${pendingFileAttachment.name}\n\n${prompt}`;
            }
            // Capture and clear the attachment after use
            const attachedFile = pendingFileAttachment;
            clearFilePreview();

            // Add user message to chat with attachment card visible
            addChatMessage('user', hasAttachment ? attachmentPreview : prompt, { attachments: hasAttachment ? [attachedFile] : undefined });
        } else {
            // No attachment - just add the message
            addChatMessage('user', prompt);
        }
        
        // Clear input and reset height
        const textarea = document.getElementById('aiPrompt');
        textarea.value = '';
        textarea.style.height = 'auto';
        
        // Disable send button and show loading
        const sendBtn = document.getElementById('chatSendBtn');
        setSendButtonLoading(sendBtn);
        
        // Show initial status
        if (webSearchEnabled) {
            showChatStatus('processing', 'Analyzing your request...');
        }
        
        // Add loading indicator - ensure unique ID or remove existing
        const container = document.getElementById('chatMessagesContainer');
        let loadingDiv = document.getElementById('loading-message');
        if (loadingDiv) {
            loadingDiv.remove();
        }
        
        loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message assistant';
        loadingDiv.id = 'loading-message';
        loadingDiv.innerHTML = `
            <div class="chat-avatar">${getCopilotSvg()}</div>
            <div class="chat-bubble">
                <span style="opacity: 0.7;">${webSearchEnabled ? 'Searching...' : 'Thinking...'}</span>
            </div>
        `;
        container.appendChild(loadingDiv);
        container.scrollTop = container.scrollHeight;

        try {
            const modelSelectElement = document.getElementById('chatModelSelect');
            
            if (!modelSelectElement) {
                showToast('Model selector not found. Please refresh the page.', 'error', 'UI Error');
                if (loadingDiv && loadingDiv.parentNode) {
                    loadingDiv.remove();
                }
                restoreSendButton(sendBtn);
                hideChatStatus();
                return;
            }
            
            const selectedModel = modelSelectElement.value;
            
            if (!selectedModel) {
                showToast('No AI model selected. Please save your GitHub token first to load available models.', 'warning', 'No Model Available');
                if (loadingDiv && loadingDiv.parentNode) {
                    loadingDiv.remove();
                }
                restoreSendButton(sendBtn);
                hideChatStatus();
                return;
            }
            
            // Build system prompt
            const systemPrompt = webSearchEnabled 
                ? `You are an expert trading analyst with deep knowledge of technical analysis, fundamental analysis, and market dynamics. You have access to web search tools to find current information.

Your expertise includes:
- Technical patterns (breakouts, reversals, support/resistance)
- Risk management and position sizing
- Entry/exit timing and strategy development
- Market psychology and sentiment analysis
- Current market conditions and sector rotation
- Real-time news impact on stock movements

IMPORTANT: You have web search capabilities enabled. When the user asks about:
- Current stock prices or market data
- Recent news or events
- Live market conditions
- Any time-sensitive information

Use the web_search tool to find current information. Use fetch_url if you need to read a specific webpage in detail. When you need structured extraction or to fetch multiple related pages, use the new scrape_url tool and pass options (depth, maxPages, selectors, followLinks) so you can control how the scrape behaves and extract only the parts you need.

When analyzing trades:
1. Be specific and actionable - provide exact levels, percentages, and concrete steps
2. Consider current market environment and sentiment
3. Reference relevant technical indicators and patterns
4. Suggest specific risk management rules
5. Provide both bullish and bearish scenarios
6. Keep responses detailed but organized with clear sections

Format your responses with:
- Key findings at the top
- Detailed analysis in the middle
- Actionable recommendations at the bottom
- Use bullet points for clarity
- Include specific price levels and percentages

Be direct, professional, and avoid generic advice. Treat this as real money at stake. When using web search results, cite your sources.`
                : `You are an expert trading analyst with deep knowledge of technical analysis, fundamental analysis, and market dynamics. 

Your expertise includes:
- Technical patterns (breakouts, reversals, support/resistance)
- Risk management and position sizing
- Entry/exit timing and strategy development
- Market psychology and sentiment analysis
- Current market conditions and sector rotation
- Real-time news impact on stock movements

When analyzing trades:
1. Be specific and actionable - provide exact levels, percentages, and concrete steps
2. Consider current market environment and sentiment
3. Reference relevant technical indicators and patterns
4. Suggest specific risk management rules
5. Provide both bullish and bearish scenarios
6. Keep responses detailed but organized with clear sections

Format your responses with:
- Key findings at the top
- Detailed analysis in the middle
- Actionable recommendations at the bottom
- Use bullet points for clarity
- Include specific price levels and percentages

Be direct, professional, and avoid generic advice. Treat this as real money at stake.`;

            // Build initial messages - handle multimodal content for vision models
            let userMessageContent;
            if (typeof messageContent === 'object' && messageContent.multimodal) {
                // Multimodal message with image
                userMessageContent = messageContent.content;
            } else {
                // Regular text message
                userMessageContent = typeof messageContent === 'string' ? messageContent : prompt;
            }
            
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessageContent }
            ];
            
            // Tool calling loop
            let iteration = 0;
            let allToolResults = [];
            let finalResponse = null;
            
            while (iteration < CONFIG.WEB_SEARCH_MAX_ITERATIONS) {
                iteration++;
                
                // Build request body
                const requestBody = {
                    model: selectedModel,
                    messages: messages,
                    max_tokens: CONFIG.AI_MAX_TOKENS,
                    temperature: CONFIG.AI_TEMPERATURE
                };
                
                // Only include tools if web search is enabled
                if (webSearchEnabled) {
                    requestBody.tools = webSearchTools;
                    requestBody.tool_choice = 'auto';
                }
                
                // Make API call through StaticBackend
                // Automatically routes to correct endpoint based on model
                let data;
                try {
                    // Use StaticBackend for intelligent routing
                    data = await StaticBackend.chatCompletion(selectedModel, messages, {
                        max_tokens: CONFIG.AI_MAX_TOKENS,
                        temperature: CONFIG.AI_TEMPERATURE,
                        tools: webSearchEnabled ? webSearchTools : undefined,
                        tool_choice: webSearchEnabled ? 'auto' : undefined
                    });
                } catch (backendError) {
                    // Fallback to direct Azure call if StaticBackend fails
                    console.warn('[StaticBackend] Falling back to direct API:', backendError.message);
                    const response = await fetch(CONFIG.API_ENDPOINT, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (!response.ok) {
                        const errorData = await response.text();
                        throw new Error(`API Error: ${response.status} - ${errorData}`);
                    }

                    data = await response.json();
                }
                
                const responseMessage = data.choices[0].message;
                
                // Add response to messages for context
                messages.push(responseMessage);
                
                // Check if the model wants to call tools
                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    // Process each tool call
                    for (const toolCall of responseMessage.tool_calls) {
                        // Update loading indicator with current action
                        const funcName = toolCall.function.name;
                        if (loadingDiv) {
                            const bubble = loadingDiv.querySelector('.chat-bubble span');
                            if (bubble) {
                                bubble.textContent = funcName === 'web_search' ? 'Searching the web...' : 'Reading webpage...';
                            }
                        }
                        
                        // Execute the tool
                        const toolResult = await executeToolCall(toolCall);
                        allToolResults.push(toolResult);
                        
                        // Add tool result to messages
                        messages.push(toolResult);
                    }
                    
                    // Update status
                    showChatStatus('processing', 'Processing results...');
                    
                } else {
                    // No more tool calls, we have the final response
                    finalResponse = responseMessage.content;
                    break;
                }
            }
            
            // If we hit max iterations without a final response, use the last content
            if (!finalResponse && messages.length > 0) {
                const lastAssistantMsg = messages.filter(m => m.role === 'assistant' && m.content).pop();
                finalResponse = lastAssistantMsg?.content || 'I was unable to complete the request. Please try again.';
            }

            // Remove loading indicator
            if (loadingDiv && loadingDiv.parentNode) {
                loadingDiv.remove();
            }
            
            // Hide status indicator
            hideChatStatus();
            
            // Update usage stats
            updateUsageStats('message', 1);
            updateUsageStats('model', selectedModel);
            if (allToolResults.length > 0) {
                updateUsageStats('search', allToolResults.length);
            }
            // Estimate tokens used (~4 chars per token is a rough approximation for English text)
            const estimatedTokens = Math.round((prompt.length + (finalResponse?.length || 0)) / 4);
            updateUsageStats('tokens', estimatedTokens);
            
            // Format citations if we have tool results
            const citations = formatCitations(allToolResults);
            
            // Add AI response to chat (with citations if available)
            if (citations.length > 0) {
                addChatMessage('assistant', finalResponse, { citations });
            } else {
                addChatMessage('assistant', finalResponse);
            }
            
            // Auto-save chat after response
            if (!currentChatId) currentChatId = generateChatId();
            saveCurrentChat();
            
        } catch (error) {
            console.error('AI request failed:', error);
            
            // Remove loading indicator
            const loadingMsg = document.getElementById('loading-message');
            if (loadingMsg && loadingMsg.parentNode) {
                loadingMsg.remove();
            }
            
            // Hide status indicator
            hideChatStatus();
            
            // Sanitize error message
            const safeErrorMessage = String(error && error.message ? error.message : 'Unknown error')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            
            addChatMessage('assistant', 'An error occurred while contacting the AI service. Make sure your GitHub token has access to GitHub Models and try again.\n\nError: ' + safeErrorMessage);
        } finally {
            // Re-enable send button
            restoreSendButton(sendBtn);
            hideChatStatus();
        }
    }

    function clearChat() {
        const container = document.getElementById('chatMessagesContainer');
        if (container) {
            container.innerHTML = `
                <div class="chat-empty-state">
                    <div class="chat-empty-icon">💬</div>
                    <div class="chat-empty-text">Start a conversation</div>
                    <div class="chat-empty-subtext">Ask about trades, patterns, or market sentiment</div>
                </div>
            `;
        }
        chatHistory = [];
    }

    // Chat History Management
    let allChats = JSON.parse(localStorage.getItem('chatSessions') || '[]');
    let currentChatId = null;

    function generateChatId() {
        return 'chat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    function startNewChat() {
        // Save current chat first if it has messages
        if (chatHistory.length > 0 && currentChatId) {
            saveCurrentChat();
        }
        
        // Create new chat
        currentChatId = generateChatId();
        clearChat();
        
        // Reset stats for new conversation
        usageStats.messages = 0;
        document.getElementById('statMessages').textContent = '0';
        
        showToast('New conversation started', 'success', 'New Chat');
        hideChatHistoryDropdown();
    }

    function saveCurrentChat() {
        if (!currentChatId || chatHistory.length === 0) return;
        
        // Generate title from first user message
        const firstUserMsg = chatHistory.find(m => m.role === 'user');
        const title = firstUserMsg 
            ? firstUserMsg.content.substring(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '')
            : 'New Chat';
        
        const chatData = {
            id: currentChatId,
            title: title,
            messages: chatHistory,
            timestamp: Date.now()
        };
        
        // Update or add to allChats
        const existingIndex = allChats.findIndex(c => c.id === currentChatId);
        if (existingIndex >= 0) {
            allChats[existingIndex] = chatData;
        } else {
            allChats.unshift(chatData); // Add to beginning
        }
        
        // Keep only last 20 chats
        if (allChats.length > 20) {
            allChats = allChats.slice(0, 20);
        }
        
        localStorage.setItem('chatSessions', JSON.stringify(allChats));
    }

    function loadChat(chatId) {
        // Save current chat first
        if (chatHistory.length > 0 && currentChatId) {
            saveCurrentChat();
        }
        
        // Reload allChats from localStorage to ensure latest data
        allChats = JSON.parse(localStorage.getItem('chatSessions') || '[]');
        
        const chat = allChats.find(c => c.id === chatId);
        if (!chat) {
            showToast('Chat not found', 'error', 'Error');
            return;
        }
        
        currentChatId = chatId;
        chatHistory = [...(chat.messages || [])]; // Create a copy to avoid reference issues
        
        // Render the chat
        const container = document.getElementById('chatMessagesContainer');
        renderChatMessages(container, chatHistory);
        hideChatHistoryDropdown();
    }

    function deleteChat(chatId, event) {
        event.stopPropagation();
        
        allChats = allChats.filter(c => c.id !== chatId);
        localStorage.setItem('chatSessions', JSON.stringify(allChats));
        
        // If deleting current chat, start new one
        if (chatId === currentChatId) {
            startNewChat();
        }
        
        renderChatHistoryList();
        showToast('Chat deleted', 'info', 'Deleted');
    }

    function toggleChatHistoryDropdown(event) {
        event.stopPropagation();
        const dropdown = document.getElementById('chatHistoryDropdown');
        dropdown.classList.toggle('active');
        
        if (dropdown.classList.contains('active')) {
            renderChatHistoryList();
            document.addEventListener('click', closeChatHistoryOnOutsideClick);
        } else {
            document.removeEventListener('click', closeChatHistoryOnOutsideClick);
        }
    }

    function hideChatHistoryDropdown() {
        const dropdown = document.getElementById('chatHistoryDropdown');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
        document.removeEventListener('click', closeChatHistoryOnOutsideClick);
    }

    function closeChatHistoryOnOutsideClick(event) {
        const dropdown = document.getElementById('chatHistoryDropdown');
        const btn = event.target.closest('.chat-history-btn');
        if (!dropdown.contains(event.target) && !btn) {
            hideChatHistoryDropdown();
        }
    }

    function renderChatHistoryList() {
        const list = document.getElementById('chatHistoryList');
        if (!list) return;
        
        if (allChats.length === 0) {
            list.innerHTML = '<div class="chat-history-empty">No chat history yet</div>';
            return;
        }
        
        list.innerHTML = allChats.map(chat => {
            const date = new Date(chat.timestamp);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const isActive = chat.id === currentChatId ? 'background: rgba(204, 0, 0, 0.1);' : '';
            
            return `
                <div class="chat-history-item" style="${isActive}" onclick="loadChat('${chat.id}')">
                    <div class="chat-history-item-content">
                        <div class="chat-history-item-title">${escapeHtml(chat.title)}</div>
                        <div class="chat-history-item-date">${dateStr}</div>
                    </div>
                    <button class="chat-history-item-delete" onclick="deleteChat('${chat.id}', event)" title="Delete chat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');
    }

    // Auto-save chat when sending messages
    const originalAddChatMessage = addChatMessage;
    // We'll hook into the chat to auto-save periodically

    // Quick action functions - now populate chat instead of separate card
    function reviewGrades() {
        const grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
        if (grades.length === 0) {
            showToast('No grades to review. Save some grades first!', 'info', 'No Grades');
            return;
        }
        
        const summary = grades.slice(0, CONFIG.MAX_GRADES_FOR_REVIEW).map(g => `${g.ticker}: ${g.total}/100`).join(', ');
        document.getElementById('aiPrompt').value = `Review my recent trades and provide insights:\n${summary}\n\nAnalyze patterns, identify strengths/weaknesses, and suggest improvements.`;
        
        // Auto-trigger the send
        askAI();
    }

    function findPatterns() {
        const grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
        if (grades.length < 2) {
            showToast('Need at least 2 grades to find patterns. Keep grading!', 'info', 'More Data Needed');
            return;
        }
        
        const data = grades.slice(0, CONFIG.MAX_GRADES_FOR_PATTERNS).map(g => ({
            ticker: g.ticker,
            total: g.total,
            pattern: g.scores.pattern,
            risk: g.scores.risk,
            catalyst: g.scores.catalyst
        }));
        
        document.getElementById('aiPrompt').value = `Find patterns in my trading grades:\n${JSON.stringify(data, null, 2)}\n\nIdentify what makes my high-scoring trades different from low-scoring ones.`;
        
        // Auto-trigger the send
        askAI();
    }

    function getSentiment() {
        document.getElementById('aiPrompt').value = `What is the current market sentiment? Consider:\n- Major indices (SPY, QQQ, DIA)\n- VIX levels\n- Sector rotation\n- Recent market news\n\nProvide a brief actionable summary for day trading.`;
        
        // Auto-trigger the send
        askAI();
    }

    // Refresh service worker only (not local storage or settings)
    function refreshServiceWorker() {
        toggleMenu();
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(function(registration) {
                if (registration) {
                    registration.update().then(function() {
                        // Force the waiting service worker to become active
                        if (registration.waiting) {
                            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                        }
                        // Clear caches to get fresh frontend assets
                        caches.keys().then(function(cacheNames) {
                            return Promise.all(
                                cacheNames.map(function(cacheName) {
                                    return caches.delete(cacheName);
                                })
                            );
                        }).then(function() {
                            window.location.reload();
                        }).catch(function() {
                            window.location.reload();
                        });
                    });
                } else {
                    window.location.reload();
                }
            }).catch(function() {
                window.location.reload();
            });
        } else {
            window.location.reload();
        }
    }

    // Initialize on load - set up all event listeners and initialize UI
    window.onload = function() {
        // Initialize sliders
        updateSlider('pattern', 10, 20);
        updateSlider('risk', 10, 20);
        updateSlider('entry', 5, 10);
        updateSlider('performance', 5, 10);
        updateSlider('time', 10, 20);
        updateSlider('catalyst', 5, 10);
        updateSlider('environment', 5, 10);
        
        // Set up screenshot event listeners
        const screenshotInput = document.getElementById('screenshotInput');
        const addScreenshotBtn = document.getElementById('addScreenshotBtn');
        const clearScreenshotBtn = document.getElementById('clearScreenshotBtn');
        
        if (screenshotInput) {
            screenshotInput.addEventListener('change', function() {
                handleScreenshot(this);
            });
        }
        
        if (addScreenshotBtn) {
            addScreenshotBtn.addEventListener('click', function() {
                screenshotInput.click();
            });
        }
        
        if (clearScreenshotBtn) {
            clearScreenshotBtn.addEventListener('click', clearScreenshot);
        }
        
        // Initialize model picker state on page load
        // Will be populated when token is loaded and models are fetched
        clearModelPicker();
        
        // Set up ticker modal keyboard handling
        const tickerModalInput = document.getElementById('tickerModalInput');
        if (tickerModalInput) {
            tickerModalInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    confirmTickerAnalysis();
                }
            });
        }
        
        // Close modal on overlay click
        const tickerModal = document.getElementById('tickerModal');
        if (tickerModal) {
            tickerModal.addEventListener('click', function(e) {
                if (e.target === tickerModal) {
                    hideTickerModal();
                }
            });
        }
        
        // Close trade details modal on overlay click
        const tradeDetailsModal = document.getElementById('tradeDetailsModal');
        if (tradeDetailsModal) {
            tradeDetailsModal.addEventListener('click', function(e) {
                if (e.target === tradeDetailsModal) {
                    hideTradeDetailsModal();
                }
            });
        }
        
        // Close finalize modal on overlay click
        const finalizeTradeModal = document.getElementById('finalizeTradeModal');
        if (finalizeTradeModal) {
            finalizeTradeModal.addEventListener('click', function(e) {
                if (e.target === finalizeTradeModal) {
                    hideFinalizeModal();
                }
            });
        }
        
        // Close image viewer on overlay click
        const imageViewerModal = document.getElementById('imageViewerModal');
        if (imageViewerModal) {
            imageViewerModal.addEventListener('click', function(e) {
                if (e.target === imageViewerModal) {
                    hideImageViewer();
                }
            });
        }
        
        // Set up GitHub token modal keyboard handling
        const githubTokenInput = document.getElementById('githubTokenInput');
        if (githubTokenInput) {
            githubTokenInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    saveGithubToken();
                }
            });
        }
        
        // Close GitHub token modal on overlay click
        const githubTokenModal = document.getElementById('githubTokenModal');
        if (githubTokenModal) {
            githubTokenModal.addEventListener('click', function(e) {
                if (e.target === githubTokenModal) {
                    hideGithubTokenModal();
                }
            });
        }
        
        // Close API token modal on overlay click
        const apiTokenModal = document.getElementById('apiTokenModal');
        if (apiTokenModal) {
            apiTokenModal.addEventListener('click', function(e) {
                if (e.target === apiTokenModal) {
                    hideApiTokenModal();
                }
            });
        }
        
        // Register service worker for PWA functionality
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('system/js.on/sw.js')
                .then(function(registration) {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch(function(error) {
                    console.log('Service Worker registration failed:', error);
                    showToast('Some offline features may not be available. You can continue using the app online.', 'warning', 'Offline Mode Limited');
                });
        }
    };
