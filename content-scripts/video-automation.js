/**
 * Video Automation Module
 * Handles the automation of marking YouTube videos as watched
 * Contains video element detection, menu button finding, and automation sequencing
 */

/**
 * Marks a video as watched by automating the "Not interested" -> "Why" -> "Already watched" flow
 * @param {string} videoUrl - The YouTube video URL to mark as watched
 */
function markVideoAsWatched(videoUrl) {
    console.log('Attempting to mark video as watched:', videoUrl);
    
    const videoId = window.URLUtils.extractVideoId(videoUrl);
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
    
    // Get container types from config
    const containerTypes = window.AutomationConfig?.CONTAINER_TYPES || [
        'ytd-compact-video-renderer',
        'ytd-video-renderer',
        'ytd-grid-video-renderer',
        'ytd-rich-item-renderer',
        'ytd-playlist-video-renderer',
        'ytd-reel-item-renderer'
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
        if (window.URLUtils.extractVideoId(link.href) === videoId) {
            return true;
        }
    }
    
    // Check for video ID in data attributes
    const elementsWithData = container.querySelectorAll('[data-video-id], [data-href]');
    for (const element of elementsWithData) {
        const dataVideoId = element.getAttribute('data-video-id');
        const dataHref = element.getAttribute('data-href');
        if (dataVideoId === videoId || (dataHref && window.URLUtils.extractVideoId(dataHref) === videoId)) {
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
    
    // Get selectors from config
    const menuSelectorsByType = window.AutomationConfig?.MENU_SELECTORS_BY_TYPE || {};
    const universalSelectors = window.AutomationConfig?.UNIVERSAL_MENU_SELECTORS || [
        'button[aria-label*="More actions"]',
        'button[aria-label*="Action menu"]',
        'ytd-menu-renderer button',
        'yt-icon-button button'
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
    const config = window.AutomationConfig?.AUTOMATION_CONFIG;
    
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
            selectors: config?.selectors?.notInterested || ['ytd-menu-service-item-renderer'],
            options: { 
                textPattern: config?.textPatterns?.notInterested || ['Not interested']
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
            selectors: config?.selectors?.tellUsWhy || ['button'],
            options: { 
                textPattern: config?.textPatterns?.tellUsWhy || ['Tell us why']
            },
            delayAfter: 400
        },
        {
            name: 'Click "Already watched"',
            selectors: config?.selectors?.alreadyWatched || ['tp-yt-paper-checkbox'],
            options: { 
                textPattern: config?.textPatterns?.alreadyWatched || ['already watched']
            },
            delayAfter: 300
        },
        {
            name: 'Click "Submit"',
            selectors: config?.selectors?.submit || ['button'],
            options: { 
                textPattern: config?.textPatterns?.submit || ['Submit']
            },
            delayAfter: 200
        }
    ];
    
    // Execute the sequence
    await window.ActionSequencer.executeSequence(automationSteps, videoId);
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.VideoAutomation = {
        markVideoAsWatched,
        findVideoElementById,
        findVideoMenuButton,
        automateWatchedMarking
    };
}
