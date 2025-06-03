// Wait for the sidebar to load
document.addEventListener('DOMContentLoaded', function() {
    // Request the video URL from the background script
    browser.runtime.sendMessage({ action: "getSidebarUrl" })
        .then(response => {
            if (response && response.videoUrl) {
                // Redirect the sidebar to Gemini
                window.location.href = 'https://gemini.google.com/app';
            } else {
                // Show message if no video URL is available
                document.getElementById('loading').innerHTML = 
                    '<div style="color: #999;">Click the extension icon while on a YouTube video to get started.</div>';
            }
        })
        .catch(error => {
            console.error('Error getting video URL:', error);
            document.getElementById('loading').innerHTML = 
                '<div style="color: #ff6b6b;">Error loading. Please try again.</div>';
        });
});

// Also try immediately in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // DOMContentLoaded will handle it
} else {
    // DOM is already loaded
    browser.runtime.sendMessage({ action: "getSidebarUrl" })
        .then(response => {
            if (response && response.videoUrl) {
                window.location.href = 'https://gemini.google.com/app';
            } else {
                document.getElementById('loading').innerHTML = 
                    '<div style="color: #999;">Click the extension icon while on a YouTube video to get started.</div>';
            }
        })
        .catch(error => {
            console.error('Error getting video URL:', error);
            document.getElementById('loading').innerHTML = 
                '<div style="color: #ff6b6b;">Error loading. Please try again.</div>';
        });
}
