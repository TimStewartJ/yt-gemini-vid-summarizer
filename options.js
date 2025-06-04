// Default prompt template
const DEFAULT_PROMPT = "Summarize this YouTube video: {videoUrl}";

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