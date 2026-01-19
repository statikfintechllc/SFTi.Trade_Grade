// menu.js - Menu and navigation functionality
// Handles mobile menu toggle and view switching between different app sections

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

    // Check if fullscreen chat is active (defined in chat.js)
    const isFullscreen = window.isFullscreenChat === true;

    // Hide all views and deactivate all buttons
    gradeView.style.display = 'none';
    trackerView.style.display = 'none';
    finalizeView.style.display = 'none';
    historyView.style.display = 'none';
    
    // Only hide aiView and chatWindow if NOT in fullscreen mode
    if (!isFullscreen) {
        aiView.style.display = 'none';
        if (chatWindow) chatWindow.style.display = 'none';
    }
    
    gradeBtn.classList.remove('active');
    trackerBtn.classList.remove('active');
    finalizeBtn.classList.remove('active');
    historyBtn.classList.remove('active');
    aiBtn.classList.remove('active');

    // Remove AI tab body class
    document.body.classList.remove('ai-tab-active');

    // Store whether menu is open before view-specific code runs
    const menu = document.getElementById('sideMenu');
    const shouldCloseMenu = menu && menu.classList.contains('active');

    try {
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
            // Add body class to hide Copilot button
            document.body.classList.add('ai-tab-active');
        }
    } catch (error) {
        console.error('Error in switchView:', error);
    }
    
    // Always close menu if it was open, even if there was an error
    if (shouldCloseMenu) {
        toggleMenu();
    }
}

// Expose functions globally
window.toggleMenu = toggleMenu;
window.switchView = switchView;
