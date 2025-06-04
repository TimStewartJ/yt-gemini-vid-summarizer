// Default prompt template
const DEFAULT_PROMPT = `Please provide a comprehensive analysis of this YouTube video: {videoUrl}
Create a detailed summary that allows someone to understand the video's content without watching it. Include:
1. **Overview**: A brief introduction explaining what the video is about and who created it.
2. **Detailed Summary**: Break down the video's content chronologically, covering all major points, arguments, demonstrations, or explanations presented. Be thorough enough that someone could understand the full narrative or educational content.
3. **Key Takeaways**: List the 5-10 most important points or lessons from the video in bullet format.
4. **Conclusion**: Specifically describe how the video ends, including:
   - Final thoughts or conclusions presented by the creator
   - Any calls to action
   - Summary statements made at the end
   - Future plans or next steps mentioned
5. **Notable Quotes or Moments**: Highlight any particularly impactful statements or demonstrations.
6. **Context and Background**: If relevant, provide context about the topic, the creator, or why this video might be important.
7. **Recommendations**: Based on the content, who would benefit most from this video and why.
Please ensure your summary is detailed enough to serve as a complete replacement for watching the video, while remaining well-organized and easy to read.`;

/**
 * Shows a status message to the user
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether this is an error message
 */
function showStatus(message, isError = false) {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = `status-message ${isError ? 'status-error' : 'status-success'}`;
    statusElement.style.display = 'block';
    
    // Hide the message after 3 seconds
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}

/**
 * Loads the saved prompt template from storage
 */
function loadSettings() {
    browser.storage.sync.get(['promptTemplate']).then(result => {
        const promptTemplate = result.promptTemplate || DEFAULT_PROMPT;
        document.getElementById('promptTemplate').value = promptTemplate;
    }).catch(error => {
        console.error('Error loading settings:', error);
        showStatus('Error loading settings. Using default values.', true);
        document.getElementById('promptTemplate').value = DEFAULT_PROMPT;
    });
}

/**
 * Saves the prompt template to storage
 */
function saveSettings() {
    const promptTemplate = document.getElementById('promptTemplate').value.trim();
    
    // If empty, use default
    const templateToSave = promptTemplate || DEFAULT_PROMPT;
    
    // Check if the template contains the {videoUrl} placeholder
    if (templateToSave !== DEFAULT_PROMPT && !templateToSave.includes('{videoUrl}')) {
        const continueWithoutPlaceholder = confirm(
            'Warning: Your custom prompt does not contain the {videoUrl} placeholder. ' +
            'This means the video URL may not be included in the prompt sent to Gemini.\n\n' +
            'Do you want to save this prompt anyway?'
        );
        
        if (!continueWithoutPlaceholder) {
            return; // User cancelled, don't save
        }
    }
    
    browser.storage.sync.set({
        promptTemplate: templateToSave
    }).then(() => {
        showStatus('Settings saved successfully!');
    }).catch(error => {
        console.error('Error saving settings:', error);
        showStatus('Error saving settings. Please try again.', true);
    });
}

/**
 * Resets settings to default values
 */
function resetSettings() {
    if (confirm('Are you sure you want to reset to default settings?')) {
        document.getElementById('promptTemplate').value = DEFAULT_PROMPT;
        browser.storage.sync.set({
            promptTemplate: DEFAULT_PROMPT
        }).then(() => {
            showStatus('Settings reset to default values!');
        }).catch(error => {
            console.error('Error resetting settings:', error);
            showStatus('Error resetting settings. Please try again.', true);
        });
    }
}

/**
 * Initializes the options page
 */
function initializeOptions() {
    // Load current settings
    loadSettings();
    
    // Set up event listeners
    document.getElementById('saveButton').addEventListener('click', saveSettings);
    document.getElementById('resetButton').addEventListener('click', resetSettings);
    
    // Save settings when user presses Ctrl+S
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            saveSettings();
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeOptions);

// Also try immediately in case DOMContentLoaded already fired
if (document.readyState !== 'loading') {
    initializeOptions();
}