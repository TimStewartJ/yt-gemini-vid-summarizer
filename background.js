// Store the current video URL for sidebar
let currentVideoUrl = null;
// Store the video URL from context menu right-clicks
let contextVideoUrl = null;
const GEMINI_PROMPT_HEADER = "X-Firefox-Gemini";
const GEMINI_APP_URL_PATTERN = "*://gemini.google.com/app*";
const GEMINI_HEADER_TIMEOUT_MS = 30000;
let activeGeminiHeaderInjection = null;
let cachedPromptTemplate = window.EXTENSION_CONSTANTS.DEFAULT_PROMPT;

refreshCachedPromptTemplate();
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.promptTemplate) {
    cachedPromptTemplate = changes.promptTemplate.newValue || window.EXTENSION_CONSTANTS.DEFAULT_PROMPT;
  }
});

/**
 * Updates page action visibility based on whether the tab is on a YouTube video page
 * @param {object} tab - The browser tab object
 */
function updatePageActionVisibility(tab) {
  if (tab.url && tab.url.includes('youtube.com/watch')) {
    browser.pageAction.show(tab.id);
  } else {
    browser.pageAction.hide(tab.id);
  }
}

/**
 * Removes a webRequest listener only if it is currently registered
 * @param {function} listener - The listener function to remove
 */
function removeGeminiHeaderListener(listener) {
  if (browser.webRequest.onBeforeSendHeaders.hasListener(listener)) {
    browser.webRequest.onBeforeSendHeaders.removeListener(listener);
  }
}

/**
 * Clears the pending Gemini header injection listener and timeout
 */
function clearPendingGeminiHeaderInjection() {
  if (!activeGeminiHeaderInjection) {
    return;
  }

  clearTimeout(activeGeminiHeaderInjection.timeoutId);
  removeGeminiHeaderListener(activeGeminiHeaderInjection.listener);
  activeGeminiHeaderInjection = null;
}

/**
 * Loads the prompt template cache used during user-action handlers
 */
function refreshCachedPromptTemplate() {
  browser.storage.sync.get(['promptTemplate']).then(result => {
    cachedPromptTemplate = result.promptTemplate || window.EXTENSION_CONSTANTS.DEFAULT_PROMPT;
  }).catch(error => {
    console.error('Error loading prompt template:', error);
  });
}

// Listen for page action clicks (extension icon in address bar)
browser.pageAction.onClicked.addListener((tab) => {
  // Since page action only shows on YouTube videos, we can assume it's valid
  currentVideoUrl = tab.url;
  openGeminiSidebarWithHeader(currentVideoUrl);
});

// Listen for tab updates to show/hide page action
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process when the URL has changed or page is complete
  if (changeInfo.url || changeInfo.status === 'complete') {
    updatePageActionVisibility(tab);
  }
});

// Listen for tab activation to show/hide page action
browser.tabs.onActivated.addListener((activeInfo) => {
  browser.tabs.get(activeInfo.tabId).then((tab) => {
    updatePageActionVisibility(tab);
  });
});

// Listen for messages from sidebar and content script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSidebarUrl") {
    sendResponse({ videoUrl: currentVideoUrl });
  } else if (request.action === "setContextVideoUrl") {
    // Store the video URL from context menu right-click
    contextVideoUrl = request.videoUrl;
  }
});

// Create context menu when extension starts
browser.runtime.onStartup.addListener(createContextMenu);
browser.runtime.onInstalled.addListener(createContextMenu);

/**
 * Creates the context menu item for summarizing videos
 */
function createContextMenu() {
  browser.contextMenus.create({
    id: "summarize-video",
    title: "Summarize with Gemini",
    contexts: ["image", "link", "page"],
    documentUrlPatterns: ["*://*.youtube.com/*"]
  });
}

// Handle context menu clicks
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarize-video") {
    // Use the stored context video URL if available, otherwise try to extract from the page
    let videoUrl = contextVideoUrl;
    
    // If no context URL stored, try to get it from the content script
    if (!videoUrl) {
      browser.tabs.sendMessage(tab.id, { action: 'getContextVideoUrl' })
        .then(response => {
          if (response && response.videoUrl) {
            handleVideoSummarization(response.videoUrl);
          } else {
            // Fallback: if we're on a watch page, use the current tab URL
            if (tab.url && tab.url.includes('youtube.com/watch')) {
              handleVideoSummarization(tab.url);
            } else {
              browser.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon-48.png',
                title: 'YouTube Summarizer',
                message: 'Could not detect video URL. Please try right-clicking directly on a video thumbnail.'
              });
            }
          }
        })
        .catch(() => {
          // Content script might not be ready, try current tab URL as fallback
          if (tab.url && tab.url.includes('youtube.com/watch')) {
            handleVideoSummarization(tab.url);
          }
        });
    } else {
      handleVideoSummarization(videoUrl);
    }
    
    // Clear the stored context URL after use
    contextVideoUrl = null;
  }
});

/**
 * Handles the video summarization process
 * @param {string} videoUrl - The YouTube video URL to summarize
 */
function handleVideoSummarization(videoUrl) {
  // Set the current video URL for the sidebar
  currentVideoUrl = videoUrl;

  openGeminiSidebarWithHeader(videoUrl);

  // Also trigger marking the video as watched (if enabled in settings)
  browser.storage.sync.get(['autoMarkWatched']).then(result => {
    const autoMarkWatched = result.autoMarkWatched !== undefined ? result.autoMarkWatched : true; // Default to enabled
    
    if (autoMarkWatched) {
      browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('youtube.com')) {
          browser.tabs.sendMessage(tabs[0].id, {
            action: 'markVideoAsWatched',
            videoUrl: videoUrl
          }).catch(error => {
            console.log('Could not send mark as watched message:', error);
          });
        }
      }).catch(error => {
        console.log('Error querying tabs for mark as watched:', error);
      });
    }
  }).catch(error => {
    console.log('Error checking autoMarkWatched setting:', error);
  });
  
  // Show a notification to confirm the action
  browser.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: 'YouTube Summarizer',
    message: 'Opening Gemini to summarize the video...'
  });
}

/**
 * Prepares Gemini prompt injection before opening the sidebar
 * @param {string} videoUrl - The YouTube video URL to summarize
 */
function openGeminiSidebarWithHeader(videoUrl) {
  prepareGeminiWithHeader(videoUrl);
  browser.sidebarAction.open().catch(error => {
    console.error('Error opening Gemini sidebar:', error);
  });
}

/**
 * Sets up the webRequest listener for Gemini requests with the given prompt
 * @param {string} promptText - The prompt text to include in the header
 */
function setupGeminiListener(promptText) {
  clearPendingGeminiHeaderInjection();

  // Encode the prompt as URI component to handle newlines and special characters
  const encodedPrompt = encodeURIComponent(promptText);

  const listener = function(details) {
    if (!isGeminiAppNavigation(details)) {
      return;
    }

    clearPendingGeminiHeaderInjection();

    const requestHeaders = (details.requestHeaders || [])
      .filter(header => header.name.toLowerCase() !== GEMINI_PROMPT_HEADER.toLowerCase());

    requestHeaders.push({
      name: GEMINI_PROMPT_HEADER,
      value: encodedPrompt
    });

    return {requestHeaders};
  };

  // Add the listener for Gemini requests
  browser.webRequest.onBeforeSendHeaders.addListener(
    listener,
    {
      urls: [GEMINI_APP_URL_PATTERN],
      types: ["main_frame"]
    },
    ["blocking", "requestHeaders"]
  );

  const injection = {
    listener,
    timeoutId: setTimeout(() => {
      if (activeGeminiHeaderInjection === injection) {
        clearPendingGeminiHeaderInjection();
      }
    }, GEMINI_HEADER_TIMEOUT_MS)
  };

  activeGeminiHeaderInjection = injection;
}

/**
 * Checks whether a request is the Gemini app navigation that should receive the prompt header
 * @param {object} details - webRequest request details
 * @returns {boolean}
 */
function isGeminiAppNavigation(details) {
  if (!details.url || (details.type && details.type !== "main_frame")) {
    return false;
  }

  const url = new URL(details.url);
  return url.hostname === "gemini.google.com" &&
    (url.pathname === "/app" || url.pathname.startsWith("/app/"));
}

/**
 * Sets up header injection for Gemini requests from the sidebar
 * @param {string} videoUrl - The YouTube video URL to include in the prompt
 */
function prepareGeminiWithHeader(videoUrl) {
  const promptText = cachedPromptTemplate.replace('{videoUrl}', videoUrl);
  setupGeminiListener(promptText);
}
