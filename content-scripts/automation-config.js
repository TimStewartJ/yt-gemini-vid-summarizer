/**
 * Configuration for Smart Automation System
 * Contains all selectors, timeouts, strategies, and text patterns for video automation
 */

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
 * Container-specific menu selectors for different YouTube video container types
 */
const MENU_SELECTORS_BY_TYPE = {
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

/**
 * Universal fallback selectors that work across all container types
 */
const UNIVERSAL_MENU_SELECTORS = [
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

/**
 * YouTube video container types for element detection
 */
const CONTAINER_TYPES = [
    'ytd-compact-video-renderer',     // Sidebar recommendations
    'ytd-video-renderer',             // Main feed videos
    'ytd-grid-video-renderer',        // Grid layout videos
    'ytd-rich-item-renderer',         // Shorts and mixed content
    'ytd-playlist-video-renderer',    // Playlist videos
    'ytd-reel-item-renderer'          // Shorts reels
];

// Make configuration available globally for use by other content scripts
if (typeof window !== 'undefined') {
    window.AutomationConfig = {
        AUTOMATION_CONFIG,
        MENU_SELECTORS_BY_TYPE,
        UNIVERSAL_MENU_SELECTORS,
        CONTAINER_TYPES
    };
}
