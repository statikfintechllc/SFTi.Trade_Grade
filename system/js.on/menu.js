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

// Expose functions globally
window.toggleMenu = toggleMenu;
window.switchView = switchView;
