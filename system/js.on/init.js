// init.js - Application initialization
// Page load initialization, event listeners, and service worker registration

/**
 * Refresh the service worker and clear cache
 */
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

// Expose refreshServiceWorker globally for external access
window.refreshServiceWorker = refreshServiceWorker;

/**
 * Initialize application on page load
 */
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

// =============================================
// INITIALIZE ON SCRIPT LOAD
// =============================================
// These must run immediately when script loads (not in window.onload)
// to initialize StaticBackend and load saved tokens

// Initialize Static Backend - loads tokens from localStorage
StaticBackend.init();

// Load GitHub PAT if available and fetch models
loadToken();
