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
        } else if (request.action === 'markVideoAsWatched') {
            markVideoAsWatched(request.videoUrl);
            sendResponse({ success: true });
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

/**
 * Marks a video as watched by automating the "Not interested" -> "Why" -> "Already watched" flow
 * @param {string} videoUrl - The YouTube video URL to mark as watched
 */
function markVideoAsWatched(videoUrl) {
    console.log('Attempting to mark video as watched:', videoUrl);
    
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
        console.log('Could not extract video ID from URL:', videoUrl);
        return;
    }
    
    // Try to find the video element on the page
    const videoElement = findVideoElementById(videoId);
    if (!videoElement) {
        console.log('Could not find video element for ID:', videoId);
        return;
    }
    
    // Try to find and click the three-dot menu
    const menuButton = findVideoMenuButton(videoElement);
    if (!menuButton) {
        console.log('Could not find menu button for video:', videoId);
        return;
    }
    
    // Start the automation sequence
    automateWatchedMarking(menuButton, videoId);
}

/**
 * Finds a video element on the page by video ID
 * @param {string} videoId - The YouTube video ID to find
 * @returns {Element|null} - The video element or null if not found
 */
function findVideoElementById(videoId) {
    // Try multiple selectors to find the video element
    const selectors = [
        `a[href*="watch?v=${videoId}"]`,
        `a[href*="watch/${videoId}"]`,
        `[data-video-id="${videoId}"]`,
        `ytd-video-renderer[data-video-id="${videoId}"]`,
        `ytd-compact-video-renderer[data-video-id="${videoId}"]`,
        `ytd-grid-video-renderer[data-video-id="${videoId}"]`
    ];
    
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            // Find the parent video container
            let container = element;
            while (container && !container.classList.contains('ytd-video-renderer') && 
                   !container.classList.contains('ytd-compact-video-renderer') &&
                   !container.classList.contains('ytd-grid-video-renderer') &&
                   !container.classList.contains('ytd-rich-item-renderer')) {
                container = container.parentElement;
                if (!container || container === document.body) break;
            }
            if (container && container !== document.body) {
                return container;
            }
        }
    }
    
    return null;
}

/**
 * Finds the three-dot menu button for a video element
 * @param {Element} videoElement - The video container element
 * @returns {Element|null} - The menu button or null if not found
 */
function findVideoMenuButton(videoElement) {
    // Common selectors for YouTube's three-dot menu
    const menuSelectors = [
        'button[aria-label*="More actions"]',
        'button[aria-label*="Action menu"]',
        'ytd-menu-renderer button',
        'yt-icon-button[aria-label*="More"]',
        '.ytd-menu-renderer button',
        '[aria-label*="More actions"] button',
        'button[aria-haspopup="true"]'
    ];
    
    for (const selector of menuSelectors) {
        const button = videoElement.querySelector(selector);
        if (button && button.offsetParent !== null) { // Check if visible
            return button;
        }
    }
    
    return null;
}

/**
 * Automates the clicking sequence to mark video as watched
 * @param {Element} menuButton - The three-dot menu button
 * @param {string} videoId - The video ID for logging purposes
 */
function automateWatchedMarking(menuButton, videoId) {
    console.log('Starting automation for video:', videoId);
    
    // Step 1: Click the menu button
    menuButton.click();
    
    // Wait for menu to appear, then click "Not interested"
    setTimeout(() => {
        const notInterestedButton = findNotInterestedButton();
        if (notInterestedButton) {
            console.log('Clicking "Not interested" for video:', videoId);
            notInterestedButton.click();
            
            // Step 2: Wait for submenu and click "Tell us why"
            setTimeout(() => {
                const tellUsWhyButton = findTellUsWhyButton();
                if (tellUsWhyButton) {
                    console.log('Clicking "Tell us why" for video:', videoId);
                    tellUsWhyButton.click();
                    
                    // Step 3: Wait for options and click "Already watched"
                    setTimeout(() => {
                        const alreadyWatchedButton = findAlreadyWatchedButton();
                        if (alreadyWatchedButton) {
                            console.log('Clicking "Already watched" for video:', videoId);
                            alreadyWatchedButton.click();
                            
                            // Step 4: Wait and click Submit button
                            setTimeout(() => {
                                const submitButton = findSubmitButton();
                                if (submitButton) {
                                    console.log('Clicking "Submit" for video:', videoId);
                                    submitButton.click();
                                    console.log('Successfully marked video as watched:', videoId);
                                } else {
                                    console.log('Could not find Submit button for video:', videoId);
                                }
                            }, 300); // Shorter delay for submit
                        } else {
                            console.log('Could not find "Already watched" checkbox for video:', videoId);
                        }
                    }, 500);
                } else {
                    console.log('Could not find "Tell us why" button for video:', videoId);
                }
            }, 500);
        } else {
            console.log('Could not find "Not interested" button for video:', videoId);
        }
    }, 500);
}

/**
 * Finds the "Not interested" button in the menu
 * @returns {Element|null} - The button element or null if not found
 */
function findNotInterestedButton() {
    // First, try to find all menu service items
    const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer');
    
    for (const item of menuItems) {
        // Look for the yt-formatted-string within this item
        const textElement = item.querySelector('yt-formatted-string');
        if (textElement && textElement.textContent.trim() === 'Not interested') {
            // Return the clickable parent element (tp-yt-paper-item)
            const clickableElement = item.querySelector('tp-yt-paper-item');
            return clickableElement || item;
        }
    }
    
    // Fallback: search more broadly
    const allFormattedStrings = document.querySelectorAll('yt-formatted-string');
    for (const element of allFormattedStrings) {
        if (element.textContent.trim() === 'Not interested') {
            // Find the parent menu item renderer
            const menuItem = element.closest('ytd-menu-service-item-renderer');
            if (menuItem) {
                const clickableElement = menuItem.querySelector('tp-yt-paper-item');
                return clickableElement || menuItem;
            }
        }
    }
    
    return null;
}

/**
 * Finds the "Tell us why" button
 * @returns {Element|null} - The button element or null if not found
 */
function findTellUsWhyButton() {
    // Look for ytd-button-renderer with "Tell us why" text
    const buttonRenderers = document.querySelectorAll('ytd-button-renderer');
    for (const renderer of buttonRenderers) {
        const textElement = renderer.querySelector('span[role="text"]');
        if (textElement && textElement.textContent.trim() === 'Tell us why') {
            const button = renderer.querySelector('button');
            if (button && button.offsetParent !== null) {
                return button;
            }
        }
    }
    
    // Fallback: look for button with aria-label
    const buttons = document.querySelectorAll('button[aria-label*="Tell us why"]');
    for (const button of buttons) {
        if (button.offsetParent !== null) {
            return button;
        }
    }
    
    return null;
}

/**
 * Finds the "Already watched" or "I've already watched the video" checkbox
 * @returns {Element|null} - The checkbox element or null if not found
 */
function findAlreadyWatchedButton() {
    const dismissalReasons = document.querySelectorAll('ytd-dismissal-reason-text-renderer');
    for (const reason of dismissalReasons) {
        const textElement = reason.querySelector('yt-formatted-string');
        if (textElement && textElement.textContent.trim() === "I've already watched the video") {
            const checkbox = reason.querySelector('tp-yt-paper-checkbox');
            if (checkbox && checkbox.offsetParent !== null) {
                return checkbox;
            }
        }
    }
    return null;
}

/**
 * Finds the Submit button after selecting a dismissal reason
 * @returns {Element|null} - The submit button element or null if not found
 */
function findSubmitButton() {
    // Look for the submit button by ID first
    const submitById = document.querySelector('ytd-button-renderer#submit');
    if (submitById && submitById.offsetParent !== null) {
        const button = submitById.querySelector('button');
        return button || submitById;
    }
    
    // Fallback: look for button with "Submit" text
    const buttons = document.querySelectorAll('ytd-button-renderer button');
    for (const button of buttons) {
        const textElement = button.querySelector('span[role="text"]');
        if (textElement && textElement.textContent.trim() === 'Submit') {
            if (button.offsetParent !== null) {
                return button;
            }
        }
    }
    
    return null;
}
