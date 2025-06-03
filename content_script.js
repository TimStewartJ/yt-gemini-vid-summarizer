const videoTitleSelector = "h1.ytd-watch-metadata yt-formatted-string.ytd-watch-metadata";

function addSummarizeButton() {
  // Target the area where YouTube puts action buttons (like, dislike, share)
  // This selector might change if YouTube updates its layout.
  const actionsArea = document.querySelector("#actions #menu #top-level-buttons-computed");

  if (actionsArea && !actionsArea.querySelector(".summarize-gemini-button")) {
    const videoTitleElement = document.querySelector(videoTitleSelector);
    const videoUrl = window.location.href;

    if (!videoTitleElement) {
        console.log("YouTube Summarizer: Video title element not found.");
        return;
    }

    const button = document.createElement("button");
    button.innerText = "Summarize with Gemini";
    button.classList.add("summarize-gemini-button", "yt-spec-button-shape-next", "yt-spec-button-shape-next--tonal", "yt-spec-button-shape-next--size-m", "yt-spec-button-shape-next--icon-leading"); // Added YouTube-like classes
    button.style.marginLeft = "8px"; // Add some space

    button.addEventListener("click", () => {
      // Send message to background script
      browser.runtime.sendMessage({
        action: "openGemini",
        videoUrl: videoUrl
      });
    });

    actionsArea.appendChild(button);
    console.log("YouTube Summarizer: Button added.");
  }
}

// YouTube uses a dynamic page, so we need to observe changes to ensure the button is added
// when the video player part of the page loads or changes.
const observer = new MutationObserver(() => {
    // Check if the primary video info is available, which indicates the video player has loaded.
    if (document.querySelector(videoTitleSelector)) {
        addSummarizeButton();
    }
});

// Start observing the body for changes in the child list and subtree
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Also run on initial load, in case the page is already fully formed.
addSummarizeButton();
