// Use the default prompt from constants.js

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
 * Loads the saved settings from storage
 */
function loadSettings() {
    browser.storage.sync.get(['promptTemplate', 'autoMarkWatched']).then(result => {
        const promptTemplate = result.promptTemplate || window.EXTENSION_CONSTANTS.DEFAULT_PROMPT;
        const autoMarkWatched = result.autoMarkWatched !== undefined ? result.autoMarkWatched : true; // Default to enabled
        
        document.getElementById('promptTemplate').value = promptTemplate;
        document.getElementById('autoMarkWatched').checked = autoMarkWatched;
    }).catch(error => {
        console.error('Error loading settings:', error);
        showStatus('Error loading settings. Using default values.', true);
        document.getElementById('promptTemplate').value = window.EXTENSION_CONSTANTS.DEFAULT_PROMPT;
        document.getElementById('autoMarkWatched').checked = true;
    });
}

/**
 * Saves the settings to storage
 */
function saveSettings() {
    const promptTemplate = document.getElementById('promptTemplate').value.trim();
    const autoMarkWatched = document.getElementById('autoMarkWatched').checked;
    
    // If empty, use default
    const templateToSave = promptTemplate || window.EXTENSION_CONSTANTS.DEFAULT_PROMPT;
    
    // Check if the template contains the {videoUrl} placeholder
    if (templateToSave !== window.EXTENSION_CONSTANTS.DEFAULT_PROMPT && !templateToSave.includes('{videoUrl}')) {
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
        promptTemplate: templateToSave,
        autoMarkWatched: autoMarkWatched
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
        document.getElementById('promptTemplate').value = window.EXTENSION_CONSTANTS.DEFAULT_PROMPT;
        document.getElementById('autoMarkWatched').checked = true; // Default to enabled
        
        browser.storage.sync.set({
            promptTemplate: window.EXTENSION_CONSTANTS.DEFAULT_PROMPT,
            autoMarkWatched: true
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
