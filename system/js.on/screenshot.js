// screenshot.js - Screenshot handling
// Manages screenshot upload, preview, and clearing functionality for trade grading

// Screenshot state variable
let currentScreenshot = null;

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

// Expose functions and variable globally
window.currentScreenshot = currentScreenshot;
window.handleScreenshot = handleScreenshot;
window.clearScreenshot = clearScreenshot;
