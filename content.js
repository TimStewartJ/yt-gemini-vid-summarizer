/**
 * Content script for detecting right-clicks on YouTube video thumbnails
 * and extracting video URLs for the context menu functionality
 * 
 * This file serves as the main entry point and coordinates the various modules:
 * - URL utilities for video ID extraction and URL handling
 * - Automation configuration for element selectors and strategies
 * - Smart element waiting for robust DOM interaction
 * - Action sequencing for automation workflows
 * - Video automation for marking videos as watched
 */

// Track the last right-clicked video URL
let lastRightClickedVideoUrl = null;

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
        if (window.URLUtils.isVideoThumbnail(current)) {
            videoUrl = window.URLUtils.findVideoUrlFromElement(current);
            if (videoUrl) break;
        }
        current = current.parentElement;
    }
    
    // If no video found yet, try a broader search around the clicked area
    if (!videoUrl) {
        videoUrl = window.URLUtils.findVideoUrlFromElement(clickedElement);
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
            window.VideoAutomation.markVideoAsWatched(request.videoUrl);
            sendResponse({ success: true });
        }
    });
}

/**
 * Sets up page monitoring for single-page application behavior
 */
function setupPageMonitoring() {
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
}

/**
 * Main initialization function that waits for all modules to be loaded
 */
function initializeWhenReady() {
    // Check if all required modules are loaded
    const requiredModules = [
        'URLUtils',
        'AutomationConfig',
        'SmartElementWaiter',
        'ActionSequencer',
        'VideoAutomation'
    ];
    
    const checkModules = () => {
        const missingModules = requiredModules.filter(module => !window[module]);
        
        if (missingModules.length === 0) {
            // All modules loaded, initialize the content script
            console.log('All content script modules loaded successfully');
            initializeContentScript();
            setupPageMonitoring();
        } else {
            // Some modules still loading, check again in a short while
            setTimeout(checkModules, 100);
        }
    };
    
    checkModules();
}

// Initialize when the script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWhenReady);
} else {
    initializeWhenReady();
}
