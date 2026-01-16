// modal.js - Modal dialog management
// Handles various modals: finalize trade, ticker analysis, trade details, image viewer

// Global state for modal management
let currentFinalizeTradeIndex = null;

// ============================================================================
// FINALIZE TRADE MODAL FUNCTIONS
// ============================================================================

/**
 * Load non-finalized trades for finalization
 */
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

/**
 * Show finalize modal with reject/accept options
 */
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

/**
 * Hide finalize modal
 */
function hideFinalizeModal() {
    document.getElementById('finalizeTradeModal').classList.remove('active');
    currentFinalizeTradeIndex = null;
}

/**
 * Reject trade - delete it from the journal
 */
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

/**
 * Show form to accept trade and enter details
 */
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

/**
 * Select outcome (stop loss or profit target)
 */
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

/**
 * Accept trade and finalize with outcome
 */
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

// ============================================================================
// TICKER MODAL FUNCTIONS
// ============================================================================

/**
 * Show ticker modal
 */
function showTickerModal() {
    document.getElementById('tickerModal').classList.add('active');
    document.getElementById('tickerModalInput').value = '';
    document.getElementById('tickerModalInput').focus();
}

/**
 * Hide ticker modal
 */
function hideTickerModal() {
    document.getElementById('tickerModal').classList.remove('active');
}

// ============================================================================
// TICKER ANALYSIS CONFIRMATION
// ============================================================================

/**
 * Confirm ticker analysis and trigger AI prompt
 */
function confirmTickerAnalysis() {
    const ticker = document.getElementById('tickerModalInput').value.trim().toUpperCase();
    if (ticker) {
        document.getElementById('aiPrompt').value = `Analyze ${ticker} for trading:\n- Technical setup quality\n- Key support/resistance levels\n- Recent price action\n- Volume analysis\n- Risk/reward for entry today\n\nProvide a PREPARE score estimate.`;
        hideTickerModal();
        // Auto-trigger the send
        askAI();
    }
}

// ============================================================================
// TRADE DETAILS MODAL FUNCTIONS
// ============================================================================

/**
 * Show trade details modal
 */
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

/**
 * Hide trade details modal
 */
function hideTradeDetailsModal() {
    document.getElementById('tradeDetailsModal').classList.remove('active');
}

// ============================================================================
// EXPOSE ALL FUNCTIONS GLOBALLY
// ============================================================================

window.currentFinalizeTradeIndex = currentFinalizeTradeIndex;
window.loadFinalizeView = loadFinalizeView;
window.showFinalizeModal = showFinalizeModal;
window.hideFinalizeModal = hideFinalizeModal;
window.rejectTrade = rejectTrade;
window.showAcceptForm = showAcceptForm;
window.selectOutcome = selectOutcome;
window.acceptTrade = acceptTrade;
window.showTickerModal = showTickerModal;
window.hideTickerModal = hideTickerModal;
window.confirmTickerAnalysis = confirmTickerAnalysis;
window.showTradeDetailsModal = showTradeDetailsModal;
window.hideTradeDetailsModal = hideTradeDetailsModal;
