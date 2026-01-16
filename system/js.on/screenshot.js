// screenshot.js - Screenshot handling
// Manages screenshot upload, preview, and clearing functionality for trade grading

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
            window.currentScreenshot = e.target.result;
            document.getElementById('previewImg').src = window.currentScreenshot;
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
    window.currentScreenshot = null;
    document.getElementById('screenshotPreview').style.display = 'none';
    document.getElementById('screenshotInput').value = '';
    document.getElementById('screenshotBtnText').textContent = 'Add Screenshot';
}

// Initialize and expose globally
window.currentScreenshot = null;
window.handleScreenshot = handleScreenshot;
window.clearScreenshot = clearScreenshot;


