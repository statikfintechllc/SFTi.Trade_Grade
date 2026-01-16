// toast.js - Toast notification system
// Displays temporary notification messages with different types (success, error, warning, info)

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (success, error, warning, info)
 * @param {string} title - Optional title (defaults to type)
 * @param {number} duration - Duration in ms (default 4000)
 * @param {string} navigationView - Optional view to navigate to on click
 * @returns {HTMLElement} Toast element
 */
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

// Expose globally
window.showToast = showToast;
