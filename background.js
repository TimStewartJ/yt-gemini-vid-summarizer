// Store pending requests with their video URLs
const pendingRequests = new Map();

// Listen for messages from content scripts
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openGemini") {
    openGeminiWithHeader(request.videoUrl);
  }
});

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
