// Store pending requests with their video URLs
const pendingRequests = new Map();
// Store the current video URL for sidebar
let currentVideoUrl = null;

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
    if (tab.url && tab.url.includes('youtube.com/watch')) {
      // Show page action on YouTube video pages
      browser.pageAction.show(tabId);
    } else {
      // Hide page action on other pages
      browser.pageAction.hide(tabId);
    }
  }
});

// Listen for tab activation to show/hide page action
browser.tabs.onActivated.addListener((activeInfo) => {
  browser.tabs.get(activeInfo.tabId).then((tab) => {
    if (tab.url && tab.url.includes('youtube.com/watch')) {
      browser.pageAction.show(activeInfo.tabId);
    } else {
      browser.pageAction.hide(activeInfo.tabId);
    }
  });
});

// Listen for messages from sidebar
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSidebarUrl") {
    sendResponse({ videoUrl: currentVideoUrl });
  }
});

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
  try {
    browser.webRequest.onBeforeSendHeaders.removeListener(listener);
  } catch (e) {
    // Listener wasn't added yet, ignore
  }
  
  // Add the listener for Gemini requests
  browser.webRequest.onBeforeSendHeaders.addListener(
    listener,
    {urls: ["*://gemini.google.com/*"]},
    ["blocking", "requestHeaders"]
  );
  
  // Set a timeout to clean up the listener
  setTimeout(() => {
    try {
      browser.webRequest.onBeforeSendHeaders.removeListener(listener);
    } catch (e) {
      // Listener already removed, ignore
    }
  }, 30000); // 30 second timeout for sidebar usage
}

function openGeminiWithHeader(videoUrl) {
  // Create the prompt text
  const promptText = `Summarize this YouTube video: ${videoUrl}`;
  
  // Set up the webRequest listener before creating the tab
  const listener = function(details) {
    // Check if this is a request we're interested in
    if (pendingRequests.has(details.tabId)) {
      // Add our custom header
      details.requestHeaders.push({
        name: "X-Firefox-Gemini",
        value: pendingRequests.get(details.tabId)
      });
      
      // Clean up
      pendingRequests.delete(details.tabId);
      
      // Remove listener if no more pending requests
      if (pendingRequests.size === 0) {
        browser.webRequest.onBeforeSendHeaders.removeListener(listener);
      }
      
      return {requestHeaders: details.requestHeaders};
    }
  };
  
  // Add the listener if it's the first request
  if (pendingRequests.size === 0) {
    browser.webRequest.onBeforeSendHeaders.addListener(
      listener,
      {urls: ["*://gemini.google.com/*"]},
      ["blocking", "requestHeaders"]
    );
  }
  
  // Create the tab
  browser.tabs.create({
    url: 'https://gemini.google.com/app',
    active: true
  }).then(tab => {
    // Store the tab ID with its associated prompt
    pendingRequests.set(tab.id, promptText);
    
    // Set a timeout to clean up in case the request never happens
    setTimeout(() => {
      if (pendingRequests.has(tab.id)) {
        pendingRequests.delete(tab.id);
        if (pendingRequests.size === 0) {
          browser.webRequest.onBeforeSendHeaders.removeListener(listener);
        }
      }
    }, 10000); // 10 second timeout
  }).catch(error => {
    console.error('Failed to create tab:', error);
  });
}
