// Store the current video URL for sidebar
let currentVideoUrl = null;
// Store the video URL from context menu right-clicks
let contextVideoUrl = null;

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
 * Safely removes a webRequest listener, ignoring errors if listener doesn't exist
 * @param {function} listener - The listener function to remove
 */
function safeRemoveListener(listener) {
  try {
    browser.webRequest.onBeforeSendHeaders.removeListener(listener);
  } catch (e) {
    // Listener wasn't added yet or already removed, ignore
  }
}

// Listen for page action clicks (extension icon in address bar)
browser.pageAction.onClicked.addListener((tab) => {
  // Since page action only shows on YouTube videos, we can assume it's valid
  currentVideoUrl = tab.url;
  // Open the sidebar
  browser.sidebarAction.open();
  // Set up header injection for when sidebar navigates to Gemini
  prepareGeminiWithHeader(currentVideoUrl);
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
  
  // Open the sidebar
  browser.sidebarAction.open();
  
  // Set up header injection for when sidebar navigates to Gemini
  prepareGeminiWithHeader(videoUrl);
  
  // Show a notification to confirm the action
  browser.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: 'YouTube Summarizer',
    message: 'Opening Gemini to summarize the video...'
  });
}

/**
 * Sets up header injection for Gemini requests from the sidebar
 * @param {string} videoUrl - The YouTube video URL to include in the prompt
 */
function prepareGeminiWithHeader(videoUrl) {
  // Create the prompt text
  const promptText = `Summarize this YouTube video: ${videoUrl}`;
  
  // Set up the webRequest listener for sidebar navigation
  const listener = function(details) {
    // Check if this request is from the sidebar and is going to Gemini
    if (details.url && details.url.includes('gemini.google.com')) {
      // Add our custom header
      details.requestHeaders.push({
        name: "X-Firefox-Gemini",
        value: promptText
      });
      
      return {requestHeaders: details.requestHeaders};
    }
  };
  
  // Remove any existing listener first
  safeRemoveListener(listener);
  
  // Add the listener for Gemini requests
  browser.webRequest.onBeforeSendHeaders.addListener(
    listener,
    {urls: ["*://gemini.google.com/*"]},
    ["blocking", "requestHeaders"]
  );
  
  // Set a timeout to clean up the listener
  setTimeout(() => {
    safeRemoveListener(listener);
  }, 30000); // 30 second timeout for sidebar usage
}
