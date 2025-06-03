// Store the current video URL for sidebar
let currentVideoUrl = null;

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

// Listen for messages from sidebar
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSidebarUrl") {
    sendResponse({ videoUrl: currentVideoUrl });
  }
});

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
