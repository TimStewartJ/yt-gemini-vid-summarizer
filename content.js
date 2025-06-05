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
 * Configuration for smart automation system
 */
const AUTOMATION_CONFIG = {
    timeouts: {
        elementWait: 5000,      // Max wait for element appearance
        actionDelay: 100,       // Min delay between actions
        menuLoad: 3000,         // Menu loading timeout
        maxRetries: 3           // Max retry attempts
    },
    
    selectors: {
        notInterested: [
            'ytd-menu-service-item-renderer',
            'tp-yt-paper-item',
            '[aria-label*="Not interested"]'
        ],
        tellUsWhy: [
            'ytd-button-renderer button',
            'button[aria-label*="Tell us why"]',
            'button'
        ],
        alreadyWatched: [
            'ytd-dismissal-reason-text-renderer tp-yt-paper-checkbox',
            'tp-yt-paper-checkbox',
            '[aria-label*="already watched"]'
        ],
        submit: [
            'ytd-button-renderer#submit button',
            'ytd-button-renderer button',
            'button[aria-label*="Submit"]'
        ]
    },
    
    // Text patterns for element validation
    textPatterns: {
        notInterested: ['Not interested', 'not interested'],
        tellUsWhy: ['Tell us why', 'tell us why'],
        alreadyWatched: ["I've already watched", 'already watched', 'Already watched'],
        submit: ['Submit', 'submit', 'Send']
    },
    
    strategies: {
        usePolling: true,
        useMutationObserver: true,
        validateVisibility: true,
        enableRetries: true
    }
};

/**
 * Smart Element Waiter - Combines MutationObserver and intelligent polling
 */
class SmartElementWaiter {
    /**
     * Waits for an element to appear in the DOM with multiple strategies
     * @param {string|Array} selectors - CSS selector(s) to wait for
     * @param {Object} options - Configuration options
     * @returns {Promise<Element>} - The found element
     */
    static async waitForElement(selectors, options = {}) {
        const config = {
            timeout: options.timeout || AUTOMATION_CONFIG.timeouts.elementWait,
            validateVisibility: options.validateVisibility !== false,
            validateInteractable: options.validateInteractable || false,
            retryCount: options.retryCount || 0,
            maxRetries: options.maxRetries || AUTOMATION_CONFIG.timeouts.maxRetries,
            textPattern: options.textPattern || null
        };
        
        const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
        
        return new Promise((resolve, reject) => {
            let resolved = false;
            
            // First, try to find the element immediately
            const immediateElement = this.findBestElement(selectorArray, config);
            if (immediateElement) {
                resolved = true;
                return resolve(immediateElement);
            }
            
            // Set up timeout
            const timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    observer?.disconnect();
                    
                    if (config.retryCount < config.maxRetries) {
                        // Retry with increased timeout and different strategy
                        const retryOptions = {
                            ...options,
                            retryCount: config.retryCount + 1,
                            timeout: Math.min(config.timeout * 1.5, 10000)
                        };
                        
                        console.log(`Retrying element search (attempt ${config.retryCount + 1}/${config.maxRetries})`);
                        this.waitForElement(selectors, retryOptions)
                            .then(resolve)
                            .catch(reject);
                    } else {
                        reject(new Error(`Element not found after ${config.maxRetries} attempts: ${selectorArray.join(', ')}`));
                    }
                }
            }, config.timeout);
            
            // Set up MutationObserver for dynamic content
            let observer = null;
            if (AUTOMATION_CONFIG.strategies.useMutationObserver) {
                observer = new MutationObserver(() => {
                    if (resolved) return;
                    
                    const element = this.findBestElement(selectorArray, config);
                    if (element) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        observer.disconnect();
                        resolve(element);
                    }
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['style', 'class', 'hidden']
                });
            }
            
            // Set up polling as backup
            if (AUTOMATION_CONFIG.strategies.usePolling) {
                const poll = () => {
                    if (resolved) return;
                    
                    const element = this.findBestElement(selectorArray, config);
                    if (element) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        observer?.disconnect();
                        resolve(element);
                    } else {
                        setTimeout(poll, 250);
                    }
                };
                
                setTimeout(poll, 100);
            }
        });
    }
    
    /**
     * Finds the best matching element from a list of selectors
     * @param {Array} selectors - Array of CSS selectors
     * @param {Object} config - Validation configuration
     * @returns {Element|null} - The best matching element or null
     */
    static findBestElement(selectors, config) {
        for (const selector of selectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (this.validateElement(element, config)) {
                        return element;
                    }
                }
            } catch (error) {
                console.warn(`Invalid selector: ${selector}`, error);
            }
        }
        return null;
    }
    
    /**
     * Validates if an element meets the required criteria
     * @param {Element} element - The element to validate
     * @param {Object} config - Validation configuration
     * @returns {boolean} - True if element is valid
     */
    static validateElement(element, config) {
        if (!element) return false;
        
        // Check if element is visible
        if (config.validateVisibility) {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            
            if (rect.width === 0 || rect.height === 0 ||
                style.display === 'none' ||
                style.visibility === 'hidden' ||
                style.opacity === '0') {
                return false;
            }
        }
        
        // Check if element is interactable
        if (config.validateInteractable) {
            if (element.disabled || element.getAttribute('aria-disabled') === 'true') {
                return false;
            }
        }
        
        // Check text content if pattern provided
        if (config.textPattern) {
            const elementText = element.textContent || element.innerText || '';
            const hasMatchingText = config.textPattern.some(pattern => 
                elementText.toLowerCase().includes(pattern.toLowerCase())
            );
            if (!hasMatchingText) {
                return false;
            }
        }
        
        return true;
    }
}

/**
 * Action Sequencer - Manages sequential automation steps
 */
class ActionSequencer {
    /**
     * Executes a sequence of actions with proper waiting
     * @param {Array} steps - Array of step objects
     * @param {string} videoId - Video ID for logging
     * @returns {Promise<boolean>} - Success status
     */
    static async executeSequence(steps, videoId) {
        console.log(`Starting smart automation sequence for video: ${videoId}`);
        
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            try {
                console.log(`Step ${i + 1}/${steps.length}: ${step.name}`);
                
                // Wait for element
                const element = step.element || await SmartElementWaiter.waitForElement(
                    step.selectors,
                    step.options || {}
                );
                
                // Add small delay for UI stability
                await this.delay(AUTOMATION_CONFIG.timeouts.actionDelay);
                
                // Execute action
                if (step.action) {
                    await step.action(element, videoId);
                } else {
                    element.click();
                }
                
                console.log(`✓ Step ${i + 1} completed: ${step.name}`);
                
                // Wait a bit before next step
                if (i < steps.length - 1) {
                    await this.delay(step.delayAfter || 200);
                }
                
            } catch (error) {
                console.error(`✗ Step ${i + 1} failed: ${step.name}`, error);
                
                if (step.required !== false) {
                    throw new Error(`Required step failed: ${step.name} - ${error.message}`);
                } else {
                    console.log(`Skipping optional step: ${step.name}`);
                }
            }
        }
        
        console.log(`✓ Successfully completed automation sequence for video: ${videoId}`);
        return true;
    }
    
    /**
     * Creates a promise that resolves after a delay
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} - Promise that resolves after delay
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

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
    console.log(`Searching for video container with ID: ${videoId}`);
    
    // Define all YouTube video container types
    const containerTypes = [
        'ytd-compact-video-renderer',     // Sidebar recommendations
        'ytd-video-renderer',             // Main feed videos
        'ytd-grid-video-renderer',        // Grid layout videos
        'ytd-rich-item-renderer',         // Shorts and mixed content
        'ytd-playlist-video-renderer',    // Playlist videos
        'ytd-reel-item-renderer'          // Shorts reels
    ];
    
    // Try multiple strategies to find the video element
    const searchStrategies = [
        // Strategy 1: Direct data attribute match
        () => {
            for (const containerType of containerTypes) {
                const elements = document.querySelectorAll(`${containerType}[data-video-id="${videoId}"]`);
                for (const element of elements) {
                    if (validateVideoContainer(element, videoId)) {
                        console.log(`Found video container via data-video-id: ${containerType}`);
                        return element;
                    }
                }
            }
            return null;
        },
        
        // Strategy 2: Find by video link and traverse up to container
        () => {
            const linkSelectors = [
                `a[href*="watch?v=${videoId}"]`,
                `a[href*="watch/${videoId}"]`,
                `a[href*="/v/${videoId}"]`,
                `a[href*="youtu.be/${videoId}"]`
            ];
            
            for (const selector of linkSelectors) {
                const links = document.querySelectorAll(selector);
                for (const link of links) {
                    const container = findParentContainer(link, containerTypes);
                    if (container && validateVideoContainer(container, videoId)) {
                        console.log(`Found video container via link traversal: ${container.tagName.toLowerCase()}`);
                        return container;
                    }
                }
            }
            return null;
        },
        
        // Strategy 3: Search within known containers for video ID
        () => {
            for (const containerType of containerTypes) {
                const containers = document.querySelectorAll(containerType);
                for (const container of containers) {
                    if (containerContainsVideo(container, videoId)) {
                        console.log(`Found video container via content search: ${containerType}`);
                        return container;
                    }
                }
            }
            return null;
        }
    ];
    
    // Execute strategies in order
    for (let i = 0; i < searchStrategies.length; i++) {
        try {
            const result = searchStrategies[i]();
            if (result) {
                return result;
            }
        } catch (error) {
            console.warn(`Search strategy ${i + 1} failed:`, error);
        }
    }
    
    console.log(`Could not find video container for ID: ${videoId}`);
    return null;
}

/**
 * Finds the parent container of a given element that matches one of the container types
 * @param {Element} element - The starting element
 * @param {Array<string>} containerTypes - Array of container type selectors
 * @returns {Element|null} - The parent container or null if not found
 */
function findParentContainer(element, containerTypes) {
    let current = element;
    const maxDepth = 15; // Prevent infinite loops
    
    for (let i = 0; i < maxDepth && current && current !== document.body; i++) {
        for (const containerType of containerTypes) {
            if (current.tagName && current.tagName.toLowerCase() === containerType) {
                return current;
            }
        }
        current = current.parentElement;
    }
    
    return null;
}

/**
 * Validates that a container element actually contains the specified video
 * @param {Element} container - The container element to validate
 * @param {string} videoId - The video ID to validate against
 * @returns {boolean} - True if container contains the video
 */
function validateVideoContainer(container, videoId) {
    if (!container) return false;
    
    // Check data attributes
    const dataVideoId = container.getAttribute('data-video-id') || 
                       container.dataset?.videoId;
    if (dataVideoId === videoId) {
        return true;
    }
    
    // Check for video links within the container
    const videoLinks = container.querySelectorAll(`a[href*="${videoId}"]`);
    return videoLinks.length > 0;
}

/**
 * Checks if a container contains a video with the specified ID
 * @param {Element} container - The container to search within
 * @param {string} videoId - The video ID to search for
 * @returns {boolean} - True if the container contains the video
 */
function containerContainsVideo(container, videoId) {
    // Check for video ID in href attributes
    const links = container.querySelectorAll('a[href]');
    for (const link of links) {
        if (extractVideoId(link.href) === videoId) {
            return true;
        }
    }
    
    // Check for video ID in data attributes
    const elementsWithData = container.querySelectorAll('[data-video-id], [data-href]');
    for (const element of elementsWithData) {
        const dataVideoId = element.getAttribute('data-video-id');
        const dataHref = element.getAttribute('data-href');
        if (dataVideoId === videoId || (dataHref && extractVideoId(dataHref) === videoId)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Finds the three-dot menu button for a video element
 * @param {Element} videoElement - The video container element
 * @returns {Element|null} - The menu button or null if not found
 */
function findVideoMenuButton(videoElement) {
    console.log(`Searching for menu button in container: ${videoElement.tagName.toLowerCase()}`);
    
    // Get the container type to use appropriate selectors
    const containerType = videoElement.tagName.toLowerCase();
    
    // Container-specific menu selectors
    const menuSelectorsByType = {
        'ytd-compact-video-renderer': [
            '#menu yt-icon-button button',
            'ytd-menu-renderer yt-icon-button button',
            '.dropdown-trigger button',
            'yt-icon-button.dropdown-trigger button',
            '#menu button[aria-label*="Action menu"]',
            'button[aria-label*="Action menu"]'
        ],
        'ytd-video-renderer': [
            'button[aria-label*="More actions"]',
            'ytd-menu-renderer button',
            '#menu button',
            'yt-icon-button button[aria-label*="More"]',
            '.ytd-menu-renderer button'
        ],
        'ytd-grid-video-renderer': [
            'ytd-menu-renderer button',
            'button[aria-label*="More actions"]',
            '#menu button',
            'yt-icon-button button'
        ],
        'ytd-rich-item-renderer': [
            'ytd-menu-renderer button', 
            'button[aria-label*="More actions"]',
            'yt-icon-button button'
        ],
        'ytd-playlist-video-renderer': [
            'ytd-menu-renderer button',
            'button[aria-label*="More actions"]',
            '#menu button'
        ]
    };
    
    // Universal fallback selectors that work across all types
    const universalSelectors = [
        'button[aria-label*="More actions"]',
        'button[aria-label*="Action menu"]',
        'ytd-menu-renderer button',
        'yt-icon-button button',
        '#menu button',
        '.ytd-menu-renderer button',
        '[aria-label*="More actions"] button',
        'button[aria-haspopup="true"]',
        '[role="button"][aria-label*="More"]',
        '[role="button"][aria-label*="Action"]'
    ];
    
    // Try container-specific selectors first
    const containerSelectors = menuSelectorsByType[containerType] || [];
    const allSelectors = [...containerSelectors, ...universalSelectors];
    
    // Remove duplicates
    const uniqueSelectors = [...new Set(allSelectors)];
    
    console.log(`Trying ${uniqueSelectors.length} selectors for ${containerType}`);
    
    for (const selector of uniqueSelectors) {
        try {
            const buttons = videoElement.querySelectorAll(selector);
            for (const button of buttons) {
                if (isValidMenuButton(button)) {
                    console.log(`Found menu button using selector: ${selector}`);
                    return button;
                }
            }
        } catch (error) {
            console.warn(`Invalid selector: ${selector}`, error);
        }
    }
    
    // If no button found with standard selectors, try a broader search
    console.log('Standard selectors failed, trying broader search...');
    const broadButton = findMenuButtonBroadSearch(videoElement);
    if (broadButton) {
        console.log('Found menu button via broad search');
        return broadButton;
    }
    
    console.log(`Could not find menu button in ${containerType}`);
    return null;
}

/**
 * Validates if a button element is a valid menu button
 * @param {Element} button - The button element to validate
 * @returns {boolean} - True if it's a valid menu button
 */
function isValidMenuButton(button) {
    if (!button) return false;
    
    // Check if button is visible and interactable
    if (button.offsetParent === null) return false;
    if (button.disabled) return false;
    if (button.getAttribute('aria-disabled') === 'true') return false;
    
    // Check for menu-related attributes
    const ariaLabel = button.getAttribute('aria-label') || '';
    const ariaHaspopup = button.getAttribute('aria-haspopup');
    const className = button.className || '';
    
    // Validate it looks like a menu button
    const isMenuButton = 
        ariaLabel.toLowerCase().includes('more') ||
        ariaLabel.toLowerCase().includes('action') ||
        ariaLabel.toLowerCase().includes('menu') ||
        ariaHaspopup === 'true' ||
        className.includes('dropdown') ||
        className.includes('menu');
    
    // Additional check: look for three-dot icon (common pattern)
    const hasThreeDotIcon = button.querySelector('svg') && 
        (button.innerHTML.includes('M12 16.5') || // Common three-dot SVG path
         button.innerHTML.includes('more_vert') ||
         button.innerHTML.includes('more_horiz'));
    
    return isMenuButton || hasThreeDotIcon;
}

/**
 * Performs a broader search for menu buttons when standard selectors fail
 * @param {Element} container - The container to search within
 * @returns {Element|null} - Found menu button or null
 */
function findMenuButtonBroadSearch(container) {
    // Look for buttons with three-dot icons
    const allButtons = container.querySelectorAll('button, [role="button"]');
    
    for (const button of allButtons) {
        if (isValidMenuButton(button)) {
            return button;
        }
    }
    
    // Look for yt-icon-button elements (YouTube's custom button component)
    const iconButtons = container.querySelectorAll('yt-icon-button');
    for (const iconButton of iconButtons) {
        const innerButton = iconButton.querySelector('button');
        if (innerButton && isValidMenuButton(innerButton)) {
            return innerButton;
        }
    }
    
    return null;
}

/**
 * Automates the clicking sequence to mark video as watched using smart waiting
 * @param {Element} menuButton - The three-dot menu button
 * @param {string} videoId - The video ID for logging purposes
 */
async function automateWatchedMarking(menuButton, videoId) {
    // Define the automation sequence
    const automationSteps = [
        {
            name: 'Click menu button',
            action: async (element) => {
                element.click();
            },
            element: menuButton, // Use the actual button element
            options: { validateVisibility: false } // Already validated
        },
        {
            name: 'Click "Not interested"',
            selectors: AUTOMATION_CONFIG.selectors.notInterested,
            options: { 
                textPattern: AUTOMATION_CONFIG.textPatterns.notInterested 
            },
            action: async (element) => {
                // Find the actual clickable element within the menu item
                const clickableElement = element.querySelector('tp-yt-paper-item') || element;
                clickableElement.click();
            },
            delayAfter: 300
        },
        {
            name: 'Click "Tell us why"',
            selectors: AUTOMATION_CONFIG.selectors.tellUsWhy,
            options: { 
                textPattern: AUTOMATION_CONFIG.textPatterns.tellUsWhy 
            },
            delayAfter: 400
        },
        {
            name: 'Click "Already watched"',
            selectors: AUTOMATION_CONFIG.selectors.alreadyWatched,
            options: { 
                textPattern: AUTOMATION_CONFIG.textPatterns.alreadyWatched 
            },
            delayAfter: 300
        },
        {
            name: 'Click "Submit"',
            selectors: AUTOMATION_CONFIG.selectors.submit,
            options: { 
                textPattern: AUTOMATION_CONFIG.textPatterns.submit 
            },
            delayAfter: 200
        }
    ];
    
    // Execute the sequence
    await ActionSequencer.executeSequence(automationSteps, videoId);
}
