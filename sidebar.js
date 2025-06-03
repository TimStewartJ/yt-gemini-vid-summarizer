/**
 * Displays a message in the loading container
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether this is an error message (default: false)
 */
function displayMessage(message, isError = false) {
    const color = isError ? '#ff6b6b' : '#999';
    document.getElementById('loading').innerHTML = `<div style="color: ${color};">${message}</div>`;
}

/**
 * Initializes the sidebar by requesting video URL and handling navigation
 */
function initializeSidebar() {
    browser.runtime.sendMessage({ action: "getSidebarUrl" })
        .then(response => {
            if (response && response.videoUrl) {
                // Redirect the sidebar to Gemini
                window.location.href = 'https://gemini.google.com/app';
            } else {
                // Show message if no video URL is available
                displayMessage('Click the extension icon while on a YouTube video to get started.');
            }
        })
        .catch(error => {
            console.error('Error getting video URL:', error);
            displayMessage('Error loading. Please try again.', true);
        });
}

// Initialize sidebar when DOM is ready
document.addEventListener('DOMContentLoaded', initializeSidebar);

// Also try immediately in case DOMContentLoaded already fired
if (document.readyState !== 'loading') {
    initializeSidebar();
}
