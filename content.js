/**
 * Content script for detecting right-clicks on YouTube video thumbnails
 * and extracting video URLs for the context menu functionality
 */

// Track the last right-clicked video URL
let lastRightClickedVideoUrl = null;

/**
 * Extracts YouTube video ID from various URL formats
 * @param {string} url - The URL to extract video ID from
 * @returns {string|null} - The video ID or null if not found
 */
function extractVideoId(url) {
    if (!url) return null;
    
    // Handle various YouTube URL formats
    const patterns = [
        /[?&]v=([^&#]*)/,           // ?v=VIDEO_ID or &v=VIDEO_ID
        /\/watch\?v=([^&#]*)/,     // /watch?v=VIDEO_ID
        /\/embed\/([^?&#]*)/,      // /embed/VIDEO_ID
        /\/v\/([^?&#]*)/,          // /v/VIDEO_ID
        /youtu\.be\/([^?&#]*)/     // youtu.be/VIDEO_ID
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}

/**
 * Constructs a full YouTube watch URL from a video ID
 * @param {string} videoId - The YouTube video ID
 * @returns {string} - The full YouTube watch URL
 */
function constructWatchUrl(videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Finds the video URL from a thumbnail element or its parents
 * @param {Element} element - The element that was right-clicked
 * @returns {string|null} - The video URL or null if not found
 */
function findVideoUrlFromElement(element) {
    // Look for video links in the element and its parents
    let current = element;
    
    // Go up the DOM tree to find a video link
    for (let i = 0; i < 10 && current; i++) {
        // Check for direct href attribute
        if (current.href) {
            const videoId = extractVideoId(current.href);
            if (videoId) {
                return constructWatchUrl(videoId);
            }
        }
        
        // Check for data attributes that might contain video info
        if (current.dataset) {
            // Check common data attributes used by YouTube
            const dataAttrs = ['videoId', 'video-id', 'href', 'url'];
            for (const attr of dataAttrs) {
                if (current.dataset[attr]) {
                    const videoId = extractVideoId(current.dataset[attr]);
                    if (videoId) {
                        return constructWatchUrl(videoId);
                    }
                }
            }
        }
        
        // Look for anchor tags within the current element
        const links = current.querySelectorAll('a[href*="watch"], a[href*="/v/"], a[href*="youtu.be"]');
        for (const link of links) {
            const videoId = extractVideoId(link.href);
            if (videoId) {
                return constructWatchUrl(videoId);
            }
        }
        
        // Move up to parent element
        current = current.parentElement;
    }
    
    return null;
}

/**
 * Checks if an element is likely a video thumbnail
 * @param {Element} element - The element to check
 * @returns {boolean} - True if it appears to be a video thumbnail
 */
function isVideoThumbnail(element) {
    // Check if it's an image element
    if (element.tagName === 'IMG') {
        // Check for common YouTube thumbnail patterns
        const src = element.src || '';
        const alt = element.alt || '';
        const className = element.className || '';
        
        return (
            src.includes('ytimg.com') ||
            src.includes('youtube.com') ||
            alt.toLowerCase().includes('thumbnail') ||
            className.includes('thumbnail') ||
            className.includes('ytd-thumbnail')
        );
    }
    
    // Check if it's a container that might hold a thumbnail
    const className = element.className || '';
    const tagName = element.tagName.toLowerCase();
    
    return (
        className.includes('ytd-thumbnail') ||
        className.includes('video-thumbnail') ||
        className.includes('ytd-compact-video') ||
        className.includes('ytd-video-preview') ||
        (tagName === 'div' && className.includes('thumbnail'))
    );
}

/**
 * Handles right-click events on the page
 * @param {MouseEvent} event - The contextmenu event
 */
function handleRightClick(event) {
    const clickedElement = event.target;
    
    // Check if the clicked element or its parents contain a video thumbnail
    let current = clickedElement;
    let videoUrl = null;
    
    // Search up the DOM tree for video information
    for (let i = 0; i < 15 && current && !videoUrl; i++) {
        if (isVideoThumbnail(current)) {
            videoUrl = findVideoUrlFromElement(current);
            if (videoUrl) break;
        }
        current = current.parentElement;
    }
    
    // If no video found yet, try a broader search around the clicked area
    if (!videoUrl) {
        videoUrl = findVideoUrlFromElement(clickedElement);
    }
    
    // Store the video URL for the context menu
    lastRightClickedVideoUrl = videoUrl;
    
    // Send the video URL to the background script
    if (videoUrl) {
        browser.runtime.sendMessage({
            action: 'setContextVideoUrl',
            videoUrl: videoUrl
        }).catch(error => {
            console.log('Error sending context video URL:', error);
        });
    }
}

/**
 * Initializes the content script
 */
function initializeContentScript() {
    // Add event listener for right-clicks
    document.addEventListener('contextmenu', handleRightClick, true);
    
    // Also listen for messages from background script
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getContextVideoUrl') {
            sendResponse({ videoUrl: lastRightClickedVideoUrl });
        }
    });
}

// Initialize when the script loads
initializeContentScript();

// Re-initialize if the page content changes (YouTube is a SPA)
const observer = new MutationObserver(() => {
    // Reset the stored URL when page content changes significantly
    if (window.location.href !== lastRightClickedVideoUrl) {
        lastRightClickedVideoUrl = null;
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
