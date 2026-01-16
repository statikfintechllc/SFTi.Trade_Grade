// grading.js - Trade grading and history management
// Handles saving grades, loading history, filtering, and viewing trade details

// ============================================================================
// History Filter Variables (Lines 50-55)
// ============================================================================

let historyFilterTicker = '';
let historyFilterGrade = '';
let historyFilterStatus = '';
let historyFilterStrategy = '';
let currentFinalizeTradeIndex = null;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get letter grade based on total score
 * @param {number} total - Total score (0-100)
 * @returns {string} Grade letter (A, B, C, or D)
 */
function getGradeLetter(total) {
    if (total >= 90) return 'A';
    if (total >= 75) return 'B';
    if (total >= 60) return 'C';
    return 'D';
}

// Note: escapeHtml() is available globally from utils.js
//       This module depends on utils.js being loaded first

// ============================================================================
// Filter Management (Lines 61-83)
// ============================================================================

/**
 * Reset all history filter variables
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

// ============================================================================
// Filter History (Lines 450-456)
// ============================================================================

/**
 * Apply filters to history based on UI input values
 */
function filterHistory() {
    historyFilterTicker = document.getElementById('historySearchInput').value.trim().toUpperCase();
    historyFilterGrade = document.getElementById('historyGradeFilter').value;
    historyFilterStatus = document.getElementById('historyStatusFilter').value;
    historyFilterStrategy = document.getElementById('historyStrategyFilter').value;
    loadHistory();
}

// ============================================================================
// Save Grade (Lines 491-517)
// ============================================================================

/**
 * Save the current trade grade to localStorage
 * Requires: currentScreenshot, state, showToast, clearScreenshot, resetSliders
 */
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

// ============================================================================
// Load and Render History (Lines 545-705)
// ============================================================================

/**
 * Load and render trade history with filtering
 * Handles both old format (scores at top level) and new format (grade.scores)
 */
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
    
    // Add event delegation for history buttons (Analyze and Delete)
    // This is done after innerHTML to attach listeners to dynamically created buttons
    const historyContainer = document.getElementById('historyContainer');
    if (historyContainer) {
        // Remove old listener if it exists to prevent duplicates
        historyContainer.removeEventListener('click', handleHistoryButtonClick);
        historyContainer.addEventListener('click', handleHistoryButtonClick);
    }
}

/**
 * Handle clicks on history buttons (Analyze and Delete) using event delegation
 * @param {Event} event - Click event
 */
function handleHistoryButtonClick(event) {
    const analyzeButton = event.target.closest('button.history-analyze-btn');
    const deleteButton = event.target.closest('button.history-delete-btn');
    const historyContainer = document.getElementById('historyContainer');

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
}

/**
 * Render history (alias for loadHistory)
 */
function renderHistory() {
    loadHistory();
}

// ============================================================================
// Screenshot and Image Viewer (Lines 729-755)
// ============================================================================

/**
 * View screenshot by grade ID or index
 * @param {string|number} gradeIdOrIndex - Grade ID or array index
 */
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

/**
 * Show image viewer modal with the provided image data
 * @param {string} imageData - Data URI of the image
 */
function showImageViewer(imageData) {
    const modal = document.getElementById('imageViewerModal');
    const img = document.getElementById('fullScreenImage');
    img.src = imageData;
    modal.classList.add('active');
}

/**
 * Hide image viewer modal
 */
function hideImageViewer() {
    const modal = document.getElementById('imageViewerModal');
    modal.classList.remove('active');
    document.getElementById('fullScreenImage').src = '';
}

// ============================================================================
// Delete Grade (Lines 1480-1487)
// ============================================================================

/**
 * Delete a grade from history
 * @param {number} index - Index of the grade to delete
 */
function deleteGrade(index) {
    if (!confirm('Delete this grade?')) return;
    
    let grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
    grades.splice(index, 1);
    localStorage.setItem('prepareGrades', JSON.stringify(grades));
    loadHistory();
}

// ============================================================================
// Global Exports
// ============================================================================

// Expose all grading functions globally so they can be called from inline handlers
// and other scripts

window.resetHistoryFilters = resetHistoryFilters;
window.clearHistoryFiltersAndRefreshHistory = clearHistoryFiltersAndRefreshHistory;
window.filterHistory = filterHistory;
window.saveGrade = saveGrade;
window.loadHistory = loadHistory;
window.renderHistory = renderHistory;
window.viewScreenshot = viewScreenshot;
window.showImageViewer = showImageViewer;
window.hideImageViewer = hideImageViewer;
window.deleteGrade = deleteGrade;

// Export helper functions
window.getGradeLetter = getGradeLetter;
// Note: escapeHtml is provided by utils.js
